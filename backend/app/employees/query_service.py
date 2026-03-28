"""Read-side orchestration for employee queries."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.employees.repository import fetch_employee_detail, fetch_employee_list
from app.shared.utils import calculate_days_worked


def list_employees(session: Session, cafe_id: UUID | None = None) -> list[dict]:
    """Return employees sorted by current days worked, then name."""

    rows = fetch_employee_list(session, cafe_id)
    serialized_rows: list[dict] = []

    for row in rows:
        active_start_date = row.pop("start_date")
        # Only the active assignment contributes to the current days-worked display value.
        row["days_worked"] = calculate_days_worked(active_start_date)
        serialized_rows.append(row)

    return sorted(serialized_rows, key=lambda row: (-row["days_worked"], row["name"]))


def get_employee_detail(session: Session, employee_id: str) -> dict:
    """Return one employee for edit-prefill purposes or raise when it is missing."""

    employee = fetch_employee_detail(session, employee_id)
    if employee is None:
        raise NotFoundError("RESOURCE_NOT_FOUND", "Employee not found.")

    return employee
