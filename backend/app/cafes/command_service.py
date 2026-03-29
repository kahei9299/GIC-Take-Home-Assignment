"""Write-side orchestration for cafe mutations."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.cafes.repository import (
    delete_employees,
    fetch_active_employee_ids_by_cafe,
    fetch_cafe,
)
from app.cafes.schemas import CafeWriteRequest
from app.core.exceptions import NotFoundError
from app.models import Cafe
from app.shared.validators import normalize_location


def _serialize_cafe(cafe: Cafe) -> dict:
    """Return the write response payload for a persisted cafe."""

    return {
        "id": cafe.id,
        "name": cafe.name,
        "description": cafe.description,
        "logo_url": cafe.logo_url,
        "location": cafe.location,
    }


def create_cafe(session: Session, payload: CafeWriteRequest) -> dict:
    """Create one cafe and commit it to the database."""

    cafe = Cafe(
        name=payload.name,
        description=payload.description,
        logo_url=str(payload.logo_url) if payload.logo_url is not None else None,
        location=payload.location,
        # Recompute the stored normalized value so exact-match location filters stay index-friendly.
        location_normalized=normalize_location(payload.location),
    )
    session.add(cafe)

    try:
        session.commit()
    except Exception:
        session.rollback()
        raise

    session.refresh(cafe)
    return _serialize_cafe(cafe)


def update_cafe(session: Session, cafe_id: UUID, payload: CafeWriteRequest) -> dict:
    """Update one cafe and commit the new values to the database."""

    cafe = fetch_cafe(session, cafe_id)
    if cafe is None:
        raise NotFoundError("RESOURCE_NOT_FOUND", "Cafe not found.")

    cafe.name = payload.name
    cafe.description = payload.description
    cafe.logo_url = str(payload.logo_url) if payload.logo_url is not None else None
    cafe.location = payload.location
    cafe.location_normalized = normalize_location(payload.location)

    try:
        session.commit()
    except Exception:
        session.rollback()
        raise

    session.refresh(cafe)
    return _serialize_cafe(cafe)


def delete_cafe(session: Session, cafe_id: UUID) -> None:
    """Delete one cafe and any employees currently assigned to it in one transaction."""

    cafe = fetch_cafe(session, cafe_id)
    if cafe is None:
        raise NotFoundError("RESOURCE_NOT_FOUND", "Cafe not found.")

    # Only employees with an active assignment to this cafe are removed by the destructive delete rule.
    active_employee_ids = fetch_active_employee_ids_by_cafe(session, cafe_id)
    if active_employee_ids:
        delete_employees(session, active_employee_ids)

    session.delete(cafe)

    try:
        session.commit()
    except Exception:
        session.rollback()
        raise
