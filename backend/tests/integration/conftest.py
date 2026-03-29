"""Shared PostgreSQL fixtures for backend integration tests."""

from __future__ import annotations

import os
from urllib.parse import urlparse, urlunparse

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine

import app.core.cache as cache_module
import app.core.database as database_module
from app.core.config import get_settings
from app.main import app


def _render_engine_url(engine) -> str:
    """Return the engine URL string without SQLAlchemy masking the password."""

    return engine.url.render_as_string(hide_password=False)


def _database_url() -> str:
    """Return the PostgreSQL URL used for integration tests."""

    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("TEST_DATABASE_URL is required for PostgreSQL integration tests.")
    return url


def _test_redis_url() -> str | None:
    """Return an isolated Redis DB URL for integration tests when Redis is configured."""

    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        return None

    parsed = urlparse(redis_url)
    return urlunparse(parsed._replace(path="/15"))


def _alembic_config(database_url: str) -> Config:
    """Build an Alembic config pointed at the integration test database."""

    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", database_url)
    return config


@pytest.fixture
def migrated_engine():
    """Upgrade a fresh PostgreSQL database to head and tear it down after each test."""

    database_url = _database_url()
    config = _alembic_config(database_url)
    command.upgrade(config, "head")
    engine = create_engine(database_url, future=True)

    try:
        yield engine
    finally:
        engine.dispose()
        command.downgrade(config, "base")


@pytest.fixture
def api_client(migrated_engine, monkeypatch):
    """Return a FastAPI test client bound to the migrated PostgreSQL test database."""

    monkeypatch.setenv("DATABASE_URL", _render_engine_url(migrated_engine))
    test_redis_url = _test_redis_url()
    if test_redis_url is not None:
        monkeypatch.setenv("REDIS_URL", test_redis_url)
    get_settings.cache_clear()
    cache_module._cache_client = None
    database_module._engine = None

    cache_client = cache_module.get_cache_client()
    if isinstance(cache_client, cache_module.RedisCacheClient):
        cache_client._redis.flushdb()

    try:
        yield TestClient(app)
    finally:
        if isinstance(cache_client, cache_module.RedisCacheClient):
            cache_client._redis.flushdb()
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        cache_module._cache_client = None
        database_module._engine = None
