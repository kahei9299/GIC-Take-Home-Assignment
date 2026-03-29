"""Write-side orchestration for employee mutations."""

from __future__ import annotations

from datetime import date

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.employees.repository import (
    create_assignment,
    fetch_active_assignment,
    fetch_cafe_name,
    fetch_employee,
    fetch_employee_with_current_cafe,
    update_assignment,
)
from app.employees.schemas import EmployeeCreateRequest, EmployeeWriteRequest
from app.models import Employee
from app.shared.utils import calculate_days_worked
from app.shared.validators import generate_employee_id


def _serialize_employee_from_session(session: Session, employee_id: str) -> dict:
    """Load the current employee state and map it to the write response contract."""

    row = fetch_employee_with_current_cafe(session, employee_id)
    if row is None:
        raise NotFoundError("RESOURCE_NOT_FOUND", "Employee not found.")

    return {
        "id": row["id"],
        "name": row["name"],
        "email_address": row["email_address"],
        "phone_number": row["phone_number"],
        "gender": row["gender"],
        "days_worked": calculate_days_worked(row["start_date"]),
        "cafe": row["cafe"],
        "cafe_id": row["cafe_id"],
    }


def create_unique_employee_id(session: Session) -> str:
    """Generate a unique employee business ID, retrying on collisions."""

    for _ in range(20):
        candidate = generate_employee_id()
        if fetch_employee(session, candidate) is None:
            return candidate

    raise RuntimeError("Unable to generate a unique employee ID.")


def _require_cafe(session: Session, cafe_id) -> None:
    """Raise when the target cafe does not exist."""

    if cafe_id is None:
        return
    if fetch_cafe_name(session, cafe_id) is None:
        raise NotFoundError("RESOURCE_NOT_FOUND", "Cafe not found.")


def _apply_employee_fields(employee: Employee, payload: EmployeeWriteRequest) -> None:
    """Copy writable employee fields from the request payload."""

    employee.name = payload.name
    employee.email_address = payload.email_address
    employee.phone_number = payload.phone_number
    employee.gender = payload.gender


def _apply_assignment_transition(session: Session, employee_id: str, new_cafe_id) -> None:
    """Apply assignment history rules for the employee's current and next cafe."""

    current_assignment = fetch_active_assignment(session, employee_id)
    current_cafe_id = current_assignment.cafe_id if current_assignment is not None else None
    transition_date = date.today()

    # Same-cafe updates preserve the active assignment row so current days-worked continuity is maintained.
    if current_cafe_id == new_cafe_id:
        return

    if current_assignment is not None:
        current_assignment.end_date = transition_date
        update_assignment(session, current_assignment)

    if new_cafe_id is not None:
        create_assignment(session, employee_id=employee_id, cafe_id=new_cafe_id, start_date=transition_date)


def _commit_or_raise_conflict(session: Session) -> None:
    """Commit the current transaction and map uniqueness violations to the shared conflict error."""

    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise ConflictError("CONFLICT", "Employee email address or phone number already exists.") from exc
    except Exception:
        session.rollback()
        raise


def create_employee(session: Session, payload: EmployeeCreateRequest) -> dict:
    """Create an employee with an initial active assignment."""

    _require_cafe(session, payload.cafe_id)

    employee = Employee(id=create_unique_employee_id(session))
    _apply_employee_fields(employee, payload)
    session.add(employee)
    try:
        session.flush()
        # Employee creation requires an assigned cafe, so the first history row always starts immediately.
        create_assignment(session, employee_id=employee.id, cafe_id=payload.cafe_id, start_date=date.today())
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise ConflictError("CONFLICT", "Employee email address or phone number already exists.") from exc
    except Exception:
        session.rollback()
        raise

    return _serialize_employee_from_session(session, employee.id)


def update_employee(session: Session, employee_id: str, payload: EmployeeWriteRequest) -> dict:
    """Update one employee and apply any required assignment transition."""

    employee = fetch_employee(session, employee_id)
    if employee is None:
        raise NotFoundError("RESOURCE_NOT_FOUND", "Employee not found.")

    _require_cafe(session, payload.cafe_id)
    _apply_employee_fields(employee, payload)
    _apply_assignment_transition(session, employee_id, payload.cafe_id)
    _commit_or_raise_conflict(session)

    return _serialize_employee_from_session(session, employee_id)


def delete_employee(session: Session, employee_id: str) -> None:
    """Delete one employee and rely on foreign-key cascades to remove assignment history."""

    employee = fetch_employee(session, employee_id)
    if employee is None:
        raise NotFoundError("RESOURCE_NOT_FOUND", "Employee not found.")

    session.delete(employee)
    _commit_or_raise_conflict(session)
