"""Shared PostgreSQL fixtures for backend integration tests."""

from __future__ import annotations

import os

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine


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
