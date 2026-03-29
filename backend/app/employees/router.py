"""FastAPI router for employee read endpoints."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.cache import CacheClient, get_cache_client
from app.core.database import get_db_session
from app.employees.command_service import create_employee, delete_employee, update_employee
from app.employees.query_service import get_employee_detail, list_employees
from app.employees.schemas import (
    EmployeeCreateRequest,
    EmployeeDetail,
    EmployeeListItem,
    EmployeeWriteRequest,
    EmployeeWriteResponse,
)

router = APIRouter(prefix="/employees", tags=["employees"])


@router.get("", response_model=list[EmployeeListItem])
def list_employees_endpoint(
    cafe_id: UUID | None = None,
    session: Session = Depends(get_db_session),
    cache: CacheClient = Depends(get_cache_client),
) -> list[EmployeeListItem]:
    """Return employees with an optional filter for their current cafe."""

    return [EmployeeListItem.model_validate(employee) for employee in list_employees(session, cafe_id, cache)]


@router.get("/{employee_id}", response_model=EmployeeDetail)
def get_employee_detail_endpoint(
    employee_id: str,
    session: Session = Depends(get_db_session),
    cache: CacheClient = Depends(get_cache_client),
) -> EmployeeDetail:
    """Return editable detail fields for one employee."""

    return EmployeeDetail.model_validate(get_employee_detail(session, employee_id, cache))


@router.post("", response_model=EmployeeWriteResponse, status_code=status.HTTP_201_CREATED)
def create_employee_endpoint(
    payload: EmployeeCreateRequest,
    session: Session = Depends(get_db_session),
    cache: CacheClient = Depends(get_cache_client),
) -> EmployeeWriteResponse:
    """Create one employee with an initial cafe assignment."""

    return EmployeeWriteResponse.model_validate(create_employee(session, payload, cache))


@router.put("/{employee_id}", response_model=EmployeeWriteResponse)
def update_employee_endpoint(
    employee_id: str,
    payload: EmployeeWriteRequest,
    session: Session = Depends(get_db_session),
    cache: CacheClient = Depends(get_cache_client),
) -> EmployeeWriteResponse:
    """Replace the editable fields for one employee and apply assignment changes."""

    return EmployeeWriteResponse.model_validate(update_employee(session, employee_id, payload, cache))


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee_endpoint(
    employee_id: str,
    session: Session = Depends(get_db_session),
    cache: CacheClient = Depends(get_cache_client),
) -> Response:
    """Delete one employee and all assignment rows tied to them."""

    delete_employee(session, employee_id, cache)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
