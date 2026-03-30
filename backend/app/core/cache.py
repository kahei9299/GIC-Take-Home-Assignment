"""Cache infrastructure for optional Redis-backed read-through behavior."""

from __future__ import annotations

import json
import logging
from typing import Any, Protocol

from fastapi.encoders import jsonable_encoder

from app.core.config import get_settings
from app.core.request_context import get_request_id
from app.core.resilience import retry_with_backoff

try:
    from redis import Redis
    from redis.exceptions import ConnectionError as RedisConnectionError
    from redis.exceptions import TimeoutError as RedisTimeoutError
except ImportError:  # pragma: no cover - exercised only when the dependency is absent.
    Redis = None  # type: ignore[assignment]
    RedisConnectionError = TimeoutError  # type: ignore[assignment]
    RedisTimeoutError = TimeoutError  # type: ignore[assignment]


class CacheClient(Protocol):
    """Minimal cache interface used by read and write services."""

    enabled: bool

    def get_json(self, key: str) -> Any | None:
        """Return a decoded JSON payload or `None` when the key is absent or unavailable."""

    def set_json(self, key: str, payload: Any) -> None:
        """Persist a JSON-serializable payload with the configured TTL."""

    def get_list_version(self, namespace: str) -> int:
        """Return the version token for one list namespace."""

    def bump_list_version(self, namespace: str) -> int:
        """Advance the version token for one list namespace."""

    def get_detail_version(self, namespace: str, identifier: str) -> int:
        """Return the version token for one detail cache entry."""

    def bump_detail_version(self, namespace: str, identifier: str) -> int:
        """Advance the version token for one detail cache entry."""

    def check_health(self) -> dict[str, str]:
        """Return the cache dependency health summary used by readiness checks."""

    def close(self) -> None:
        """Release cache resources during application shutdown."""


def list_version_key(namespace: str) -> str:
    """Return the Redis key storing the current list version token."""

    return f"cache:version:{namespace}:list"


def detail_version_key(namespace: str, identifier: str) -> str:
    """Return the Redis key storing the current detail version token."""

    return f"cache:version:{namespace}:detail:{identifier}"


class NoOpCacheClient:
    """Disabled cache client used when Redis is not configured."""

    enabled = False

    def get_json(self, key: str) -> Any | None:
        return None

    def set_json(self, key: str, payload: Any) -> None:
        return None

    def get_list_version(self, namespace: str) -> int:
        return 1

    def bump_list_version(self, namespace: str) -> int:
        return 1

    def get_detail_version(self, namespace: str, identifier: str) -> int:
        return 1

    def bump_detail_version(self, namespace: str, identifier: str) -> int:
        return 1

    def check_health(self) -> dict[str, str]:
        return {"status": "disabled"}

    def close(self) -> None:
        return None


class RedisCacheClient:
    """Redis-backed cache client that fails open when Redis operations fail."""

    enabled = True

    def __init__(self, redis_client: Redis, ttl_seconds: int) -> None:
        self._redis = redis_client
        self._ttl_seconds = ttl_seconds
        self._logger = logging.getLogger("app.cache")

    def _log(
        self,
        level: int,
        message: str,
        *,
        event: str,
        cache_status: str,
        namespace: str,
        key: str,
        fallback_mode: str | None = None,
    ) -> None:
        self._logger.log(
            level,
            message,
            extra={
                "event": event,
                "request_id": get_request_id(),
                "cache_status": cache_status,
                "resource_type": namespace,
                "cache_key": key,
                "fallback_mode": fallback_mode,
            },
        )

    @staticmethod
    def _should_retry(exc: Exception) -> bool:
        return isinstance(exc, (RedisConnectionError, RedisTimeoutError, TimeoutError))

    def _retry(self, operation, *args, operation_name: str, namespace: str, key: str, **kwargs):
        settings = get_settings()
        return retry_with_backoff(
            operation,
            *args,
            dependency="redis",
            operation_name=operation_name,
            max_attempts=settings.redis_retry_max_attempts,
            base_delay_ms=settings.redis_retry_base_delay_ms,
            max_delay_ms=settings.redis_retry_max_delay_ms,
            logger=self._logger,
            should_retry=self._should_retry,
            **kwargs,
        )

    def _get_or_init_version(self, key: str, namespace: str) -> int:
        try:
            raw_value = self._retry(self._redis.get, key, operation_name="get_version", namespace=namespace, key=key)
            if raw_value is None:
                self._retry(self._redis.set, key, "1", nx=True, operation_name="init_version", namespace=namespace, key=key)
                raw_value = self._retry(
                    self._redis.get,
                    key,
                    operation_name="reload_version",
                    namespace=namespace,
                    key=key,
                )
            return int(raw_value or "1")
        except Exception:
            self._log(
                logging.WARNING,
                "Cache version lookup failed; bypassing Redis versioning.",
                event="cache_failure",
                cache_status="version_lookup_failed",
                namespace=namespace,
                key=key,
            )
            return 1

    def get_json(self, key: str) -> Any | None:
        namespace = key.split(":", 1)[0]
        try:
            raw_value = self._retry(self._redis.get, key, operation_name="get", namespace=namespace, key=key)
        except Exception:
            self._log(
                logging.WARNING,
                "Cache get failed; bypassing Redis.",
                event="cache_failure",
                cache_status="get_failed",
                namespace=namespace,
                key=key,
                fallback_mode="postgres",
            )
            return None

        if raw_value is None:
            self._log(
                logging.INFO,
                "Cache miss.",
                event="cache_miss",
                cache_status="miss",
                namespace=namespace,
                key=key,
            )
            return None

        self._log(
            logging.INFO,
            "Cache hit.",
            event="cache_hit",
            cache_status="hit",
            namespace=namespace,
            key=key,
        )
        return json.loads(raw_value)

    def set_json(self, key: str, payload: Any) -> None:
        namespace = key.split(":", 1)[0]
        try:
            encoded_payload = json.dumps(jsonable_encoder(payload), default=str)
            self._retry(
                self._redis.setex,
                key,
                self._ttl_seconds,
                encoded_payload,
                operation_name="set",
                namespace=namespace,
                key=key,
            )
            self._log(
                logging.INFO,
                "Cache set.",
                event="cache_set",
                cache_status="set",
                namespace=namespace,
                key=key,
            )
        except Exception:
            self._log(
                logging.WARNING,
                "Cache set failed; continuing without Redis.",
                event="cache_failure",
                cache_status="set_failed",
                namespace=namespace,
                key=key,
                fallback_mode="postgres",
            )

    def get_list_version(self, namespace: str) -> int:
        return self._get_or_init_version(list_version_key(namespace), namespace)

    def bump_list_version(self, namespace: str) -> int:
        key = list_version_key(namespace)
        try:
            version = int(self._retry(self._redis.incr, key, operation_name="bump_list_version", namespace=namespace, key=key))
            self._log(
                logging.INFO,
                "Cache list version bumped.",
                event="cache_version_bump",
                cache_status="version_bumped",
                namespace=namespace,
                key=key,
            )
            return version
        except Exception:
            self._log(
                logging.WARNING,
                "Cache list version bump failed; continuing without Redis invalidation.",
                event="cache_failure",
                cache_status="version_bump_failed",
                namespace=namespace,
                key=key,
                fallback_mode="stale_cache_possible",
            )
            return 1

    def get_detail_version(self, namespace: str, identifier: str) -> int:
        return self._get_or_init_version(detail_version_key(namespace, identifier), namespace)

    def bump_detail_version(self, namespace: str, identifier: str) -> int:
        key = detail_version_key(namespace, identifier)
        try:
            version = int(
                self._retry(self._redis.incr, key, operation_name="bump_detail_version", namespace=namespace, key=key)
            )
            self._log(
                logging.INFO,
                "Cache detail version bumped.",
                event="cache_version_bump",
                cache_status="version_bumped",
                namespace=namespace,
                key=key,
            )
            return version
        except Exception:
            self._log(
                logging.WARNING,
                "Cache detail version bump failed; continuing without Redis invalidation.",
                event="cache_failure",
                cache_status="version_bump_failed",
                namespace=namespace,
                key=key,
                fallback_mode="stale_cache_possible",
            )
            return 1

    def check_health(self) -> dict[str, str]:
        """Probe Redis with bounded retries without making readiness depend on it."""

        try:
            self._retry(self._redis.ping, operation_name="ping", namespace="redis", key="redis:ping")
        except Exception:
            self._logger.warning(
                "Redis readiness probe failed; continuing in degraded mode.",
                extra={
                    "event": "dependency_fallback",
                    "request_id": get_request_id(),
                    "dependency": "redis",
                    "fallback_mode": "postgres",
                    "readiness_status": "degraded",
                    "dependency_status": "degraded",
                },
            )
            return {"status": "degraded"}

        return {"status": "ok"}

    def close(self) -> None:
        """Close Redis client resources during managed-runtime shutdown."""

        self._redis.close()
        self._redis.connection_pool.disconnect()


_cache_client: CacheClient | None = None


def get_cache_client() -> CacheClient:
    """Return a process-wide cache client using Redis when configured."""

    global _cache_client

    if _cache_client is None:
        settings = get_settings()
        if not settings.redis_url:
            _cache_client = NoOpCacheClient()
            return _cache_client

        if Redis is None:
            raise RuntimeError("Redis support is configured but the 'redis' package is not installed.")

        redis_client = Redis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_connect_timeout=settings.redis_socket_connect_timeout_seconds,
            socket_timeout=settings.redis_socket_timeout_seconds,
        )
        _cache_client = RedisCacheClient(redis_client=redis_client, ttl_seconds=settings.cache_ttl_seconds)

    return _cache_client


def close_cache_client() -> None:
    """Close and clear the shared cache client during application shutdown."""

    global _cache_client

    if _cache_client is not None:
        _cache_client.close()
        _cache_client = None
