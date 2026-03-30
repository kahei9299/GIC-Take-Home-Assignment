"""Unit tests for hosted-runtime configuration helpers."""

from app.core.config import Settings


def test_allowed_cors_origins_prefers_explicit_allowlist() -> None:
    settings = Settings(
        DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/app",
        CORS_ALLOWED_ORIGINS="http://localhost:5173, https://preview.example.com , https://app.example.com",
        FRONTEND_URL="https://legacy.example.com",
    )

    assert settings.allowed_cors_origins == [
        "http://localhost:5173",
        "https://preview.example.com",
        "https://app.example.com",
    ]


def test_allowed_cors_origins_falls_back_to_frontend_url() -> None:
    settings = Settings(
        DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/app",
        FRONTEND_URL="http://localhost:5173",
    )

    assert settings.allowed_cors_origins == ["http://localhost:5173"]
