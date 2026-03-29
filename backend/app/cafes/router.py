"""FastAPI router for cafe read endpoints."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.cafes.command_service import create_cafe, delete_cafe, update_cafe
from app.cafes.query_service import get_cafe_detail, list_cafes
from app.cafes.schemas import CafeDetail, CafeListItem, CafeWriteRequest, CafeWriteResponse
from app.core.cache import CacheClient, get_cache_client
from app.core.database import get_db_session

router = APIRouter(prefix="/cafes", tags=["cafes"])


@router.get("", response_model=list[CafeListItem])
def list_cafes_endpoint(
    location: str | None = None,
    session: Session = Depends(get_db_session),
    cache: CacheClient = Depends(get_cache_client),
) -> list[CafeListItem]:
    """Return cafes with optional normalized location filtering."""

    return [CafeListItem.model_validate(cafe) for cafe in list_cafes(session, location, cache)]


@router.get("/{cafe_id}", response_model=CafeDetail)
def get_cafe_detail_endpoint(
    cafe_id: UUID,
    session: Session = Depends(get_db_session),
    cache: CacheClient = Depends(get_cache_client),
) -> CafeDetail:
    """Return editable detail fields for one cafe."""

    return CafeDetail.model_validate(get_cafe_detail(session, cafe_id, cache))


@router.post("", response_model=CafeWriteResponse, status_code=status.HTTP_201_CREATED)
def create_cafe_endpoint(
    payload: CafeWriteRequest,
    session: Session = Depends(get_db_session),
    cache: CacheClient = Depends(get_cache_client),
) -> CafeWriteResponse:
    """Create one cafe."""

    return CafeWriteResponse.model_validate(create_cafe(session, payload, cache))


@router.put("/{cafe_id}", response_model=CafeWriteResponse)
def update_cafe_endpoint(
    cafe_id: UUID,
    payload: CafeWriteRequest,
    session: Session = Depends(get_db_session),
    cache: CacheClient = Depends(get_cache_client),
) -> CafeWriteResponse:
    """Replace the editable fields for one cafe."""

    return CafeWriteResponse.model_validate(update_cafe(session, cafe_id, payload, cache))


@router.delete("/{cafe_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cafe_endpoint(
    cafe_id: UUID,
    session: Session = Depends(get_db_session),
    cache: CacheClient = Depends(get_cache_client),
) -> Response:
    """Delete one cafe and its currently assigned employees."""

    delete_cafe(session, cafe_id, cache)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
