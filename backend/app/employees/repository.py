"""Database query helpers for employee read operations."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Cafe, Employee, EmployeeAssignment


def _active_assignment_join_condition():
    """Return the join predicate for the one current assignment, if any."""

    # An open assignment is encoded as end_date NULL, so left joins preserve unassigned employees.
    return (EmployeeAssignment.employee_id == Employee.id) & (EmployeeAssignment.end_date.is_(None))


def fetch_employee_list(session: Session, cafe_id: UUID | None = None) -> list[dict]:
    """Return employees with their current cafe assignment, if one exists."""

    statement = (
        select(
            Employee.id,
            Employee.name,
            Employee.email_address,
            Employee.phone_number,
            Employee.gender,
            EmployeeAssignment.start_date,
            Cafe.name.label("cafe"),
            Cafe.id.label("cafe_id"),
        )
        .select_from(Employee)
        .outerjoin(EmployeeAssignment, _active_assignment_join_condition())
        .outerjoin(Cafe, Cafe.id == EmployeeAssignment.cafe_id)
    )

    if cafe_id is not None:
        statement = statement.where(EmployeeAssignment.cafe_id == cafe_id)

    rows = session.execute(statement).mappings().all()
    return [dict(row) for row in rows]


def fetch_employee_detail(session: Session, employee_id: str) -> dict | None:
    """Return the editable employee fields and current cafe assignment, if any."""

    statement = (
        select(
            Employee.name,
            Employee.email_address,
            Employee.phone_number,
            Employee.gender,
            Cafe.name.label("cafe"),
            Cafe.id.label("cafe_id"),
        )
        .select_from(Employee)
        .outerjoin(EmployeeAssignment, _active_assignment_join_condition())
        .outerjoin(Cafe, Cafe.id == EmployeeAssignment.cafe_id)
        .where(Employee.id == employee_id)
    )

    row = session.execute(statement).mappings().first()
    return dict(row) if row is not None else None
