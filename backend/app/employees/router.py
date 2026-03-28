"""FastAPI router for employee read endpoints."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db_session
from app.employees.query_service import get_employee_detail, list_employees
from app.employees.schemas import EmployeeDetail, EmployeeListItem

router = APIRouter(prefix="/employees", tags=["employees"])


@router.get("", response_model=list[EmployeeListItem])
def list_employees_endpoint(
    cafe_id: UUID | None = None,
    session: Session = Depends(get_db_session),
) -> list[EmployeeListItem]:
    """Return employees with an optional filter for their current cafe."""

    return [EmployeeListItem.model_validate(employee) for employee in list_employees(session, cafe_id)]


@router.get("/{employee_id}", response_model=EmployeeDetail)
def get_employee_detail_endpoint(
    employee_id: str,
    session: Session = Depends(get_db_session),
) -> EmployeeDetail:
    """Return editable detail fields for one employee."""

    return EmployeeDetail.model_validate(get_employee_detail(session, employee_id))
