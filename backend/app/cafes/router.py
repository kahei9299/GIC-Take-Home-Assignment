"""FastAPI router for cafe read endpoints."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.cafes.query_service import get_cafe_detail, list_cafes
from app.cafes.schemas import CafeDetail, CafeListItem
from app.core.database import get_db_session

router = APIRouter(prefix="/cafes", tags=["cafes"])


@router.get("", response_model=list[CafeListItem])
def list_cafes_endpoint(
    location: str | None = None,
    session: Session = Depends(get_db_session),
) -> list[CafeListItem]:
    """Return cafes with optional normalized location filtering."""

    return [CafeListItem.model_validate(cafe) for cafe in list_cafes(session, location)]


@router.get("/{cafe_id}", response_model=CafeDetail)
def get_cafe_detail_endpoint(
    cafe_id: UUID,
    session: Session = Depends(get_db_session),
) -> CafeDetail:
    """Return editable detail fields for one cafe."""

    return CafeDetail.model_validate(get_cafe_detail(session, cafe_id))
