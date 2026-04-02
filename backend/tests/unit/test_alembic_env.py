"""Unit tests for Alembic database URL normalization."""

from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

from alembic.config import Config


def _load_alembic_env_module():
    env_path = Path(__file__).resolve().parents[2] / "alembic" / "env.py"
    spec = spec_from_file_location("backend_alembic_env", env_path)
    assert spec is not None and spec.loader is not None
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


alembic_env_module = _load_alembic_env_module()
get_database_url = alembic_env_module.get_database_url
normalize_database_url = alembic_env_module.normalize_database_url


def test_normalize_database_url_leaves_psycopg_url_unchanged() -> None:
    assert (
        normalize_database_url("postgresql+psycopg://postgres:postgres@localhost:5432/app")
        == "postgresql+psycopg://postgres:postgres@localhost:5432/app"
    )


def test_normalize_database_url_converts_postgresql_scheme() -> None:
    assert (
        normalize_database_url("postgresql://postgres:postgres@render.internal:5432/app")
        == "postgresql+psycopg://postgres:postgres@render.internal:5432/app"
    )


def test_normalize_database_url_converts_legacy_postgres_scheme() -> None:
    assert (
        normalize_database_url("postgres://postgres:postgres@render.internal:5432/app")
        == "postgresql+psycopg://postgres:postgres@render.internal:5432/app"
    )


def test_get_database_url_normalizes_from_alembic_config(monkeypatch) -> None:
    monkeypatch.setattr(alembic_env_module, "config", Config())
    alembic_env_module.config.set_main_option(
        "sqlalchemy.url",
        "postgresql://postgres:postgres@render.internal:5432/app\n",
    )
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setattr(alembic_env_module, "_database_url_from_dotenv", lambda: None)

    assert get_database_url() == "postgresql+psycopg://postgres:postgres@render.internal:5432/app"


def test_get_database_url_normalizes_from_environment(monkeypatch) -> None:
    monkeypatch.setattr(alembic_env_module, "config", Config())
    monkeypatch.setenv("DATABASE_URL", "postgres://postgres:postgres@render.internal:5432/app")
    monkeypatch.setattr(alembic_env_module, "_database_url_from_dotenv", lambda: None)

    assert get_database_url() == "postgresql+psycopg://postgres:postgres@render.internal:5432/app"
