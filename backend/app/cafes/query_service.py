"""Read-side orchestration for cafe queries."""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.cafes.repository import fetch_cafe_detail, fetch_cafe_list
from app.core.cache import CacheClient
from app.core.exceptions import NotFoundError
from app.shared.validators import normalize_location

logger = logging.getLogger("app.cache")


def _cafe_list_cache_key(version: int, normalized_location: str | None) -> str:
    """Return the versioned cache key for the cafe list endpoint."""

    return f"cafes:list:v{version}:location:{normalized_location or 'all'}"


def _cafe_detail_cache_key(cafe_id: UUID, version: int) -> str:
    """Return the versioned cache key for one cafe detail payload."""

    return f"cafes:detail:{cafe_id}:v{version}"


def list_cafes(session: Session, location: str | None = None, cache: CacheClient | None = None) -> list[dict]:
    """Return cafes filtered by normalized location when provided."""

    normalized_location = normalize_location(location) if location is not None else None
    if cache is None or not cache.enabled:
        logger.info(
            "Cache bypassed because Redis is disabled.",
            extra={
                "event": "cache_bypass",
                "cache_status": "disabled",
                "resource_type": "cafes",
                "cache_key": "cafes:list",
            },
        )
        return jsonable_encoder(fetch_cafe_list(session, normalized_location))

    version = cache.get_list_version("cafes")
    cache_key = _cafe_list_cache_key(version, normalized_location)
    cached_payload = cache.get_json(cache_key)
    if cached_payload is not None:
        return cached_payload

    payload = jsonable_encoder(fetch_cafe_list(session, normalized_location))
    cache.set_json(cache_key, payload)
    return payload


def get_cafe_detail(session: Session, cafe_id: UUID, cache: CacheClient | None = None) -> dict:
    """Return one cafe for edit-prefill purposes or raise when it is missing."""

    if cache is not None and cache.enabled:
        version = cache.get_detail_version("cafes", str(cafe_id))
        cache_key = _cafe_detail_cache_key(cafe_id, version)
        cached_payload = cache.get_json(cache_key)
        if cached_payload is not None:
            return cached_payload
    else:
        logger.info(
            "Cache bypassed because Redis is disabled.",
            extra={
                "event": "cache_bypass",
                "cache_status": "disabled",
                "resource_type": "cafes",
                "cache_key": f"cafes:detail:{cafe_id}",
            },
        )

    cafe = fetch_cafe_detail(session, cafe_id)
    if cafe is None:
        raise NotFoundError("RESOURCE_NOT_FOUND", "Cafe not found.")

    payload = jsonable_encoder(cafe)
    if cache is not None and cache.enabled:
        cache.set_json(cache_key, payload)

    return payload
