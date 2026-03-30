"""Unit tests for cache infrastructure and fail-open Redis behavior."""

from __future__ import annotations

from types import SimpleNamespace

import app.core.cache as cache_module
from app.core.cache import NoOpCacheClient, RedisCacheClient, get_cache_client


class FailingRedis:
    """Minimal Redis stub that raises for every operation."""

    def __init__(self) -> None:
        self.closed = False
        self.pool_disconnected = False
        self.connection_pool = self

    def get(self, key: str) -> str | None:
        raise RuntimeError("redis unavailable")

    def set(self, key: str, value: str, nx: bool = False) -> bool:
        raise RuntimeError("redis unavailable")

    def setex(self, key: str, ttl: int, value: str) -> bool:
        raise RuntimeError("redis unavailable")

    def incr(self, key: str) -> int:
        raise RuntimeError("redis unavailable")

    def ping(self) -> bool:
        raise RuntimeError("redis unavailable")

    def close(self) -> None:
        self.closed = True

    def disconnect(self) -> None:
        self.pool_disconnected = True


def test_get_cache_client_returns_noop_when_redis_url_is_missing(monkeypatch) -> None:
    monkeypatch.setattr(
        cache_module,
        "get_settings",
        lambda: SimpleNamespace(redis_url=None, cache_ttl_seconds=60),
    )
    cache_module._cache_client = None

    try:
        client = get_cache_client()
    finally:
        cache_module._cache_client = None

    assert isinstance(client, NoOpCacheClient)


def test_redis_cache_client_get_json_fails_open() -> None:
    client = RedisCacheClient(FailingRedis(), ttl_seconds=60)

    assert client.get_json("cafes:list:v1:location:all") is None


def test_redis_cache_client_set_json_fails_open() -> None:
    client = RedisCacheClient(FailingRedis(), ttl_seconds=60)

    client.set_json("cafes:list:v1:location:all", [{"id": "1"}])


def test_redis_cache_client_version_lookups_fail_open() -> None:
    client = RedisCacheClient(FailingRedis(), ttl_seconds=60)

    assert client.get_list_version("cafes") == 1
    assert client.bump_list_version("cafes") == 1
    assert client.get_detail_version("employees", "UIABC1234") == 1
    assert client.bump_detail_version("employees", "UIABC1234") == 1


def test_redis_cache_client_healthcheck_reports_degraded() -> None:
    client = RedisCacheClient(FailingRedis(), ttl_seconds=60)

    assert client.check_health() == {"status": "degraded"}


def test_redis_cache_client_close_releases_redis_resources() -> None:
    redis_client = FailingRedis()
    client = RedisCacheClient(redis_client, ttl_seconds=60)

    client.close()

    assert redis_client.closed is True
    assert redis_client.pool_disconnected is True


def test_close_cache_client_resets_shared_singleton(monkeypatch) -> None:
    redis_client = FailingRedis()
    cache_module._cache_client = RedisCacheClient(redis_client, ttl_seconds=60)

    try:
        cache_module.close_cache_client()
    finally:
        cache_module._cache_client = None

    assert redis_client.closed is True
    assert redis_client.pool_disconnected is True
    assert cache_module._cache_client is None
