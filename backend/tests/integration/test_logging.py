"""Integration tests for Increment 5 request logging and request IDs."""

from __future__ import annotations

import json
import logging

from fastapi.testclient import TestClient

from app.main import app, create_app


def test_health_response_includes_generated_request_id() -> None:
    """Verify requests receive a generated correlation ID when one is not supplied."""

    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.headers["X-Request-ID"]


def test_health_response_preserves_incoming_request_id() -> None:
    """Verify incoming correlation IDs are echoed back in the response."""

    with TestClient(app) as client:
        response = client.get("/health", headers={"X-Request-ID": "req-123"})

    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == "req-123"


def test_request_logging_emits_structured_completion_record(monkeypatch) -> None:
    """Verify request logging captures safe request metadata in JSON form."""

    request_logger = logging.getLogger("app.request")
    captured: list[dict] = []

    def fake_info(message: str, *, extra: dict | None = None) -> None:
        captured.append({"message": message, "extra": extra or {}})

    monkeypatch.setattr(request_logger, "info", fake_info)

    with TestClient(app) as client:
        response = client.get("/health", headers={"X-Request-ID": "req-health"})

    assert response.status_code == 200
    request_record = next(record for record in captured if record["extra"].get("event") == "request_completed")

    assert request_record["message"] == "Request completed."
    assert request_record["extra"]["request_id"] == "req-health"
    assert request_record["extra"]["method"] == "GET"
    assert request_record["extra"]["path"] == "/health"
    assert request_record["extra"]["status_code"] == 200
    assert isinstance(request_record["extra"]["duration_ms"], float | int)


def test_missing_route_still_returns_request_id_header_and_logs_request(monkeypatch) -> None:
    """Verify middleware behavior is preserved for framework-generated 404 responses."""

    request_logger = logging.getLogger("app.request")
    captured: list[dict] = []

    def fake_info(message: str, *, extra: dict | None = None) -> None:
        captured.append({"message": message, "extra": extra or {}})

    monkeypatch.setattr(request_logger, "info", fake_info)

    with TestClient(app) as client:
        response = client.get("/missing", headers={"X-Request-ID": "req-missing"})

    assert response.status_code == 404
    assert response.headers["X-Request-ID"] == "req-missing"

    request_record = next(record for record in captured if record["extra"].get("request_id") == "req-missing")

    assert request_record["message"] == "Request completed."
    assert request_record["extra"]["status_code"] == 404
    assert request_record["extra"]["path"] == "/missing"


def test_create_app_emits_startup_log(capsys) -> None:
    """Verify app startup emits the structured startup log record."""

    with TestClient(create_app()):
        pass

    captured = capsys.readouterr()
    log_lines = [line for line in (captured.out + captured.err).splitlines() if line.startswith("{")]
    startup_entry = next(json.loads(line) for line in log_lines if '"event": "app_startup"' in line)

    assert startup_entry["app_name"] == "gic-take-home-backend"
    assert startup_entry["log_format"] == "json"
    assert startup_entry["log_level"] == "INFO"


def test_create_app_emits_shutdown_log(capsys) -> None:
    """Verify app shutdown emits the structured shutdown log record."""

    with TestClient(create_app()):
        pass

    captured = capsys.readouterr()
    log_lines = [line for line in (captured.out + captured.err).splitlines() if line.startswith("{")]
    shutdown_entry = next(json.loads(line) for line in log_lines if '"event": "app_shutdown"' in line)

    assert shutdown_entry["app_name"] == "gic-take-home-backend"
    assert shutdown_entry["app_env"] == "development"
