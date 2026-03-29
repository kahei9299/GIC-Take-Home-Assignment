"""Database query helpers for cafe read and write operations."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import Select, delete, func, select
from sqlalchemy.orm import Session

from app.models import Cafe, Employee, EmployeeAssignment


def _active_assignment_count() -> Select:
    """Return a reusable count expression for active employee assignments."""

    # Only active assignments should contribute to cafe employee totals on the read endpoints.
    return func.count(EmployeeAssignment.id)


def fetch_cafe_list(session: Session, normalized_location: str | None = None) -> list[dict]:
    """Return cafes with active employee counts for the list endpoint."""

    statement = (
        select(
            Cafe.id,
            Cafe.name,
            Cafe.description,
            Cafe.logo_url,
            Cafe.location,
            _active_assignment_count().label("employees"),
        )
        .outerjoin(
            EmployeeAssignment,
            (EmployeeAssignment.cafe_id == Cafe.id) & (EmployeeAssignment.end_date.is_(None)),
        )
        # The aggregate count requires grouping by the non-aggregated cafe columns.
        .group_by(Cafe.id, Cafe.name, Cafe.description, Cafe.logo_url, Cafe.location)
        .order_by(_active_assignment_count().desc(), Cafe.name.asc())
    )

    if normalized_location is not None:
        statement = statement.where(Cafe.location_normalized == normalized_location)

    rows = session.execute(statement).mappings().all()
    return [dict(row) for row in rows]


def fetch_cafe_detail(session: Session, cafe_id: UUID) -> dict | None:
    """Return the editable cafe fields for a single cafe."""

    statement = select(
        Cafe.name,
        Cafe.description,
        Cafe.logo_url,
        Cafe.location,
    ).where(Cafe.id == cafe_id)

    row = session.execute(statement).mappings().first()
    return dict(row) if row is not None else None


def fetch_cafe(session: Session, cafe_id: UUID) -> Cafe | None:
    """Return one cafe ORM instance by its identifier."""

    return session.get(Cafe, cafe_id)


def fetch_active_employee_ids_by_cafe(session: Session, cafe_id: UUID) -> list[str]:
    """Return employee IDs that are currently assigned to the target cafe."""

    statement = select(EmployeeAssignment.employee_id).where(
        EmployeeAssignment.cafe_id == cafe_id,
        EmployeeAssignment.end_date.is_(None),
    )
    return list(session.scalars(statement))


def delete_employees(session: Session, employee_ids: list[str]) -> None:
    """Delete a batch of employees by business identifier."""

    if not employee_ids:
        return

    session.execute(delete(Employee).where(Employee.id.in_(employee_ids)))
