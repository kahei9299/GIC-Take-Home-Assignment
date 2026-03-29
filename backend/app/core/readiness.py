"""Dependency readiness helpers for the liveness/readiness endpoints."""

from __future__ import annotations

import logging

from app.core.cache import CacheClient, get_cache_client
from app.core.database import check_database_readiness
from app.core.exceptions import DependencyUnavailableError
from app.core.request_context import get_request_id

logger = logging.getLogger("app.readiness")


def build_readiness_payload(cache: CacheClient | None = None) -> tuple[dict, int]:
    """Return the readiness payload and status code for the current process."""

    postgres_status = "ok"
    redis_status = "disabled"
    readiness_status = "ready"
    status_code = 200

    try:
        check_database_readiness()
    except DependencyUnavailableError:
        postgres_status = "unavailable"
        readiness_status = "not_ready"
        status_code = 503
        logger.warning(
            "Readiness failed because PostgreSQL is unavailable.",
            extra={
                "event": "readiness_failed",
                "request_id": get_request_id(),
                "dependency": "postgres",
                "readiness_status": readiness_status,
                "dependency_status": postgres_status,
            },
        )
    else:
        cache_client = cache or get_cache_client()
        redis_status = cache_client.check_health()["status"]
        if redis_status == "degraded":
            logger.warning(
                "Readiness is degraded because Redis is unavailable.",
                extra={
                    "event": "dependency_fallback",
                    "request_id": get_request_id(),
                    "dependency": "redis",
                    "fallback_mode": "postgres",
                    "readiness_status": "degraded",
                    "dependency_status": redis_status,
                },
            )

    payload = {
        "status": readiness_status,
        "dependencies": {
            "postgres": {"status": postgres_status},
            "redis": {"status": redis_status},
        },
    }
    return payload, status_code
