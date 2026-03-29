"""Shared PostgreSQL fixtures for backend integration tests."""

from __future__ import annotations

import os

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine

import app.core.cache as cache_module
import app.core.database as database_module
from app.core.config import get_settings
from app.main import app


def _database_url() -> str:
    """Return the PostgreSQL URL used for integration tests."""

    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("TEST_DATABASE_URL is required for PostgreSQL integration tests.")
    return url


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

    monkeypatch.setenv("DATABASE_URL", str(migrated_engine.url))
    get_settings.cache_clear()
    cache_module._cache_client = None
    database_module._engine = None

    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        cache_module._cache_client = None
        database_module._engine = None
