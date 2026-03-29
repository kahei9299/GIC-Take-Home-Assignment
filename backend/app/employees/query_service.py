"""Read-side orchestration for employee queries."""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.core.cache import CacheClient
from app.core.exceptions import NotFoundError
from app.employees.repository import fetch_employee_detail, fetch_employee_list
from app.shared.utils import calculate_days_worked

logger = logging.getLogger("app.cache")


def _employee_list_cache_key(version: int, cafe_id: UUID | None) -> str:
    """Return the versioned cache key for the employee list endpoint."""

    return f"employees:list:v{version}:cafe:{cafe_id or 'all'}"


def _employee_detail_cache_key(employee_id: str, version: int) -> str:
    """Return the versioned cache key for one employee detail payload."""

    return f"employees:detail:{employee_id}:v{version}"


def list_employees(session: Session, cafe_id: UUID | None = None, cache: CacheClient | None = None) -> list[dict]:
    """Return employees sorted by current days worked, then name."""

    if cache is not None and cache.enabled:
        version = cache.get_list_version("employees")
        cache_key = _employee_list_cache_key(version, cafe_id)
        cached_payload = cache.get_json(cache_key)
        if cached_payload is not None:
            return cached_payload
    else:
        logger.info(
            "Cache bypassed because Redis is disabled.",
            extra={
                "event": "cache_bypass",
                "cache_status": "disabled",
                "resource_type": "employees",
                "cache_key": "employees:list",
            },
        )

    rows = fetch_employee_list(session, cafe_id)
    serialized_rows: list[dict] = []

    for row in rows:
        active_start_date = row.pop("start_date")
        # Only the active assignment contributes to the current days-worked display value.
        row["days_worked"] = calculate_days_worked(active_start_date)
        serialized_rows.append(row)

    payload = jsonable_encoder(sorted(serialized_rows, key=lambda row: (-row["days_worked"], row["name"])))
    if cache is not None and cache.enabled:
        cache.set_json(cache_key, payload)

    return payload


def get_employee_detail(session: Session, employee_id: str, cache: CacheClient | None = None) -> dict:
    """Return one employee for edit-prefill purposes or raise when it is missing."""

    if cache is not None and cache.enabled:
        version = cache.get_detail_version("employees", employee_id)
        cache_key = _employee_detail_cache_key(employee_id, version)
        cached_payload = cache.get_json(cache_key)
        if cached_payload is not None:
            return cached_payload
    else:
        logger.info(
            "Cache bypassed because Redis is disabled.",
            extra={
                "event": "cache_bypass",
                "cache_status": "disabled",
                "resource_type": "employees",
                "cache_key": f"employees:detail:{employee_id}",
            },
        )

    employee = fetch_employee_detail(session, employee_id)
    if employee is None:
        raise NotFoundError("RESOURCE_NOT_FOUND", "Employee not found.")

    payload = jsonable_encoder(employee)
    if cache is not None and cache.enabled:
        cache.set_json(cache_key, payload)

    return payload
