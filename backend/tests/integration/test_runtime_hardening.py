"""Integration tests for Increment 12 hosted-runtime hardening behavior."""

from __future__ import annotations

from fastapi.testclient import TestClient

import app.core.cache as cache_module
import app.core.database as database_module
from app.main import create_app


class CapturingEngine:
    def __init__(self) -> None:
        self.disposed = False

    def dispose(self) -> None:
        self.disposed = True


class CapturingCacheClient:
    enabled = True

    def __init__(self) -> None:
        self.closed = False

    def get_json(self, key: str):
        return None

    def set_json(self, key: str, payload) -> None:
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
        return {"status": "ok"}

    def close(self) -> None:
        self.closed = True


def test_lifespan_shutdown_disposes_engine_and_closes_cache() -> None:
    engine = CapturingEngine()
    cache_client = CapturingCacheClient()
    database_module._engine = engine
    cache_module._cache_client = cache_client

    try:
        with TestClient(create_app()) as client:
            response = client.get("/health")
            assert response.status_code == 200
    finally:
        database_module._engine = None
        cache_module._cache_client = None

    assert engine.disposed is True
    assert cache_client.closed is True


def test_cors_allows_exact_origins_from_allowlist(monkeypatch) -> None:
    monkeypatch.setenv(
        "CORS_ALLOWED_ORIGINS",
        "https://preview.example.com, https://app.example.com",
    )
    monkeypatch.delenv("FRONTEND_URL", raising=False)

    from app.core.config import get_settings

    get_settings.cache_clear()
    app = create_app()

    try:
        with TestClient(app) as client:
            response = client.options(
                "/health",
                headers={
                    "Origin": "https://preview.example.com",
                    "Access-Control-Request-Method": "GET",
                },
            )
    finally:
        get_settings.cache_clear()

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://preview.example.com"


def test_cors_falls_back_to_frontend_url(monkeypatch) -> None:
    monkeypatch.delenv("CORS_ALLOWED_ORIGINS", raising=False)
    monkeypatch.setenv("FRONTEND_URL", "http://localhost:5173")

    from app.core.config import get_settings

    get_settings.cache_clear()
    app = create_app()

    try:
        with TestClient(app) as client:
            response = client.options(
                "/health",
                headers={
                    "Origin": "http://localhost:5173",
                    "Access-Control-Request-Method": "GET",
                },
            )
    finally:
        get_settings.cache_clear()

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
