"""Unit tests for shared API error envelope handling."""

from __future__ import annotations

from fastapi import FastAPI, Query
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.core.error_handlers import register_exception_handlers
from app.core.exceptions import ConflictError, DomainValidationError, NotFoundError


def _build_test_app() -> FastAPI:
    """Create a small app that exercises the shared exception handlers directly."""

    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/domain-error")
    def domain_error() -> None:
        raise DomainValidationError("Operation is not allowed in the current state.")

    @app.get("/not-found")
    def not_found() -> None:
        raise NotFoundError("RESOURCE_NOT_FOUND", "Cafe not found.")

    @app.get("/conflict")
    def conflict() -> None:
        raise ConflictError("CONFLICT", "Employee write conflicted with existing data.")

    @app.get("/schema-error")
    def schema_error(required_value: int = Query(...)) -> dict[str, int]:
        return {"required_value": required_value}

    @app.get("/unexpected")
    def unexpected() -> None:
        raise RuntimeError("boom")

    @app.get("/dependency-unavailable")
    def dependency_unavailable() -> None:
        raise OperationalError("SELECT 1", {}, Exception("connection refused"))

    @app.get("/db-auth-failure")
    def db_auth_failure() -> None:
        raise OperationalError("SELECT 1", {}, Exception('password authentication failed for user "postgres"'))

    return app


def test_domain_validation_error_returns_400_invalid_operation() -> None:
    with TestClient(_build_test_app()) as client:
        response = client.get("/domain-error")

    assert response.status_code == 400
    assert response.json() == {
        "code": "INVALID_OPERATION",
        "message": "Operation is not allowed in the current state.",
        "details": None,
    }


def test_not_found_error_returns_404_resource_not_found() -> None:
    with TestClient(_build_test_app()) as client:
        response = client.get("/not-found")

    assert response.status_code == 404
    assert response.json() == {
        "code": "RESOURCE_NOT_FOUND",
        "message": "Cafe not found.",
        "details": None,
    }


def test_conflict_error_returns_409_conflict() -> None:
    with TestClient(_build_test_app()) as client:
        response = client.get("/conflict")

    assert response.status_code == 409
    assert response.json() == {
        "code": "CONFLICT",
        "message": "Employee write conflicted with existing data.",
        "details": None,
    }


def test_request_validation_error_returns_422_validation_error() -> None:
    with TestClient(_build_test_app()) as client:
        response = client.get("/schema-error")

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"
    assert response.json()["message"] == "Request validation failed."


def test_unexpected_error_returns_500_internal_server_error() -> None:
    with TestClient(_build_test_app(), raise_server_exceptions=False) as client:
        response = client.get("/unexpected")

    assert response.status_code == 500
    assert response.json() == {
        "code": "INTERNAL_SERVER_ERROR",
        "message": "An unexpected error occurred.",
        "details": None,
    }


def test_dependency_unavailable_returns_503() -> None:
    with TestClient(_build_test_app(), raise_server_exceptions=False) as client:
        response = client.get("/dependency-unavailable")

    assert response.status_code == 503
    assert response.json() == {
        "code": "DEPENDENCY_UNAVAILABLE",
        "message": "Database dependency is unavailable.",
        "details": None,
    }


def test_database_auth_failure_returns_500() -> None:
    with TestClient(_build_test_app(), raise_server_exceptions=False) as client:
        response = client.get("/db-auth-failure")

    assert response.status_code == 500
    assert response.json() == {
        "code": "INTERNAL_SERVER_ERROR",
        "message": "An unexpected error occurred.",
        "details": None,
    }
