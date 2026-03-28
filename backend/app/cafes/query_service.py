"""Read-side orchestration for cafe queries."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.cafes.repository import fetch_cafe_detail, fetch_cafe_list
from app.core.exceptions import NotFoundError
from app.shared.validators import normalize_location


def list_cafes(session: Session, location: str | None = None) -> list[dict]:
    """Return cafes filtered by normalized location when provided."""

    normalized_location = normalize_location(location) if location is not None else None
    return fetch_cafe_list(session, normalized_location)


def get_cafe_detail(session: Session, cafe_id: UUID) -> dict:
    """Return one cafe for edit-prefill purposes or raise when it is missing."""

    cafe = fetch_cafe_detail(session, cafe_id)
    if cafe is None:
        raise NotFoundError("RESOURCE_NOT_FOUND", "Cafe not found.")

    return cafe
