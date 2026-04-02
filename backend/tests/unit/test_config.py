"""Unit tests for hosted-runtime configuration helpers."""

from app.core.config import Settings


def test_allowed_cors_origins_prefers_explicit_allowlist(monkeypatch) -> None:
    monkeypatch.delenv("CORS_ALLOWED_ORIGINS", raising=False)
    monkeypatch.delenv("FRONTEND_URL", raising=False)

    settings = Settings(
        _env_file=None,
        DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/app",
        CORS_ALLOWED_ORIGINS="http://localhost:5173, https://preview.example.com , https://app.example.com",
        FRONTEND_URL="https://legacy.example.com",
    )

    assert settings.allowed_cors_origins == [
        "http://localhost:5173",
        "https://preview.example.com",
        "https://app.example.com",
    ]


def test_allowed_cors_origins_falls_back_to_frontend_url(monkeypatch) -> None:
    monkeypatch.delenv("CORS_ALLOWED_ORIGINS", raising=False)
    monkeypatch.delenv("FRONTEND_URL", raising=False)

    settings = Settings(
        _env_file=None,
        DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/app",
        FRONTEND_URL="http://localhost:5173",
    )

    assert settings.allowed_cors_origins == ["http://localhost:5173"]


def test_database_url_normalizes_render_postgres_urls(monkeypatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)

    settings = Settings(
        _env_file=None,
        DATABASE_URL="postgresql://postgres:postgres@render.internal:5432/app",
    )

    assert settings.database_url == "postgresql+psycopg://postgres:postgres@render.internal:5432/app"


def test_database_url_normalizes_legacy_postgres_scheme(monkeypatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)

    settings = Settings(
        _env_file=None,
        DATABASE_URL="postgres://postgres:postgres@render.internal:5432/app",
    )

    assert settings.database_url == "postgresql+psycopg://postgres:postgres@render.internal:5432/app"
