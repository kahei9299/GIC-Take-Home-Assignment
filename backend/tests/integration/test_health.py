from app.core.exceptions import DependencyUnavailableError
from app.core.cache import get_cache_client
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.main import app


client = TestClient(app)


def test_healthcheck() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert "X-Request-ID" in response.headers


def test_readiness_reports_healthy_dependencies(monkeypatch) -> None:
    import app.core.readiness as readiness_module

    class HealthyCache:
        enabled = True

        def check_health(self) -> dict[str, str]:
            return {"status": "ok"}

    monkeypatch.setattr(readiness_module, "check_database_readiness", lambda: None)
    monkeypatch.setattr(readiness_module, "get_cache_client", lambda: HealthyCache())

    response = client.get("/health/ready")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ready",
        "dependencies": {
            "postgres": {"status": "ok"},
            "redis": {"status": "ok"},
        },
    }


def test_readiness_reports_degraded_redis(monkeypatch) -> None:
    import app.core.readiness as readiness_module

    class DegradedCache:
        enabled = True

        def check_health(self) -> dict[str, str]:
            return {"status": "degraded"}

    monkeypatch.setattr(readiness_module, "check_database_readiness", lambda: None)
    monkeypatch.setattr(readiness_module, "get_cache_client", lambda: DegradedCache())

    response = client.get("/health/ready")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ready",
        "dependencies": {
            "postgres": {"status": "ok"},
            "redis": {"status": "degraded"},
        },
    }


def test_readiness_reports_unhealthy_postgres(monkeypatch) -> None:
    import app.core.readiness as readiness_module

    monkeypatch.setattr(
        readiness_module,
        "check_database_readiness",
        lambda: (_ for _ in ()).throw(DependencyUnavailableError("Database dependency is unavailable.")),
    )

    response = client.get("/health/ready")

    assert response.status_code == 503
    assert response.json() == {
        "status": "not_ready",
        "dependencies": {
            "postgres": {"status": "unavailable"},
            "redis": {"status": "disabled"},
        },
    }


def test_known_database_dependency_failure_returns_503(monkeypatch) -> None:
    import app.cafes.query_service as cafes_query_service

    monkeypatch.setattr(
        cafes_query_service,
        "fetch_cafe_list",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(OperationalError("SELECT 1", {}, Exception("connection refused"))),
    )
    app.dependency_overrides[get_cache_client] = lambda: type("DisabledCache", (), {"enabled": False})()

    try:
        response = client.get("/cafes")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 503
    assert response.json() == {
        "code": "DEPENDENCY_UNAVAILABLE",
        "message": "Database dependency is unavailable.",
        "details": None,
    }
