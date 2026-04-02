"""Alembic environment configuration for backend migrations."""

from __future__ import annotations

from logging.config import fileConfig
import os
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.database import Base
from app.models import Cafe, Employee, EmployeeAssignment

config = getattr(context, "config", None)

if config is not None and config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Importing the models registers all tables on Base.metadata for autogenerate support.
target_metadata = Base.metadata

ENV_FILE = Path(__file__).resolve().parents[1] / ".env"


def normalize_database_url(database_url: str) -> str:
    """Normalize hosted Postgres URLs to the SQLAlchemy psycopg dialect."""

    normalized = database_url.strip()

    if normalized.startswith("postgres://"):
        return normalized.replace("postgres://", "postgresql+psycopg://", 1)

    if normalized.startswith("postgresql://"):
        return normalized.replace("postgresql://", "postgresql+psycopg://", 1)

    return normalized


def _database_url_from_dotenv() -> str | None:
    """Read `DATABASE_URL` from the backend `.env` file without validating unrelated settings."""

    if not ENV_FILE.exists():
        return None

    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue

        key, value = stripped.split("=", 1)
        if key.strip() == "DATABASE_URL":
            return value.strip().strip("'\"")

    return None


def get_database_url() -> str:
    """Return the Alembic database URL, preferring explicit Alembic overrides first."""

    if config is None:
        raise RuntimeError("Alembic config is required to resolve the database URL.")

    configured_url = config.get_main_option("sqlalchemy.url")
    if configured_url:
        return normalize_database_url(configured_url)

    environment_url = os.getenv("DATABASE_URL")
    if environment_url:
        return normalize_database_url(environment_url)

    dotenv_url = _database_url_from_dotenv()
    if dotenv_url:
        return normalize_database_url(dotenv_url)

    raise RuntimeError("DATABASE_URL is required for Alembic migrations.")


def run_migrations_offline() -> None:
    """Run migrations without creating a live SQLAlchemy engine."""

    context.configure(
        url=get_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against a live database connection."""

    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = get_database_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)

        with context.begin_transaction():
            context.run_migrations()


if config is not None:
    if context.is_offline_mode():
        run_migrations_offline()
    else:
        run_migrations_online()
