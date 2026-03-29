"""Unit tests for retry/backoff helpers and database dependency classification."""

from __future__ import annotations

import logging
from types import SimpleNamespace

from sqlalchemy.exc import DisconnectionError, OperationalError, TimeoutError as SATimeoutError

from app.core.exceptions import DependencyUnavailableError
from app.core.resilience import (
    calculate_backoff_delay_ms,
    classify_database_dependency_error,
    retry_with_backoff,
)


def test_calculate_backoff_delay_grows_and_caps(monkeypatch) -> None:
    monkeypatch.setattr("app.core.resilience.random.uniform", lambda _start, _end: 1.0)

    assert calculate_backoff_delay_ms(1, 50, 500) == 50
    assert calculate_backoff_delay_ms(2, 50, 500) == 100
    assert calculate_backoff_delay_ms(5, 50, 500) == 500


def test_calculate_backoff_delay_applies_bounded_jitter(monkeypatch) -> None:
    monkeypatch.setattr("app.core.resilience.random.uniform", lambda _start, _end: 0.5)

    assert calculate_backoff_delay_ms(3, 100, 1000) == 200


def test_retry_with_backoff_stops_after_success(monkeypatch) -> None:
    captured: list[dict] = []
    attempts = {"count": 0}
    sleeps: list[float] = []

    monkeypatch.setattr("app.core.resilience.random.uniform", lambda _start, _end: 1.0)
    monkeypatch.setattr("app.core.resilience.time.sleep", lambda delay: sleeps.append(delay))

    class CapturingLogger:
        def warning(self, message: str, *, extra: dict | None = None) -> None:
            captured.append({"message": message, "extra": extra or {}})

    logger = CapturingLogger()

    def flaky_operation() -> str:
        attempts["count"] += 1
        if attempts["count"] < 3:
            raise TimeoutError("transient redis timeout")
        return "ok"

    result = retry_with_backoff(
        flaky_operation,
        dependency="redis",
        operation_name="get",
        max_attempts=3,
        base_delay_ms=50,
        max_delay_ms=500,
        logger=logger,
        should_retry=lambda exc: isinstance(exc, TimeoutError),
    )

    assert result == "ok"
    assert attempts["count"] == 3
    assert sleeps == [0.05, 0.1]
    assert captured[0]["extra"]["dependency"] == "redis"
    assert captured[0]["extra"]["retry_attempt"] == 1
    assert captured[0]["extra"]["max_attempts"] == 3
    assert captured[0]["extra"]["backoff_ms"] == 50


def test_retry_with_backoff_does_not_retry_non_retryable_errors(monkeypatch) -> None:
    logger = logging.getLogger("test.retry")
    monkeypatch.setattr("app.core.resilience.time.sleep", lambda _delay: (_ for _ in ()).throw(AssertionError("no sleep")))

    def fail() -> None:
        raise ValueError("bad input")

    try:
        retry_with_backoff(
            fail,
            dependency="redis",
            operation_name="get",
            max_attempts=3,
            base_delay_ms=50,
            max_delay_ms=500,
            logger=logger,
            should_retry=lambda exc: isinstance(exc, TimeoutError),
        )
    except ValueError as exc:
        assert str(exc) == "bad input"
    else:
        raise AssertionError("expected ValueError")


def test_classify_database_dependency_error_identifies_known_outages() -> None:
    operational_error = OperationalError(
        "SELECT 1",
        {},
        Exception("connection refused by server"),
    )

    dependency_error = classify_database_dependency_error(operational_error)

    assert isinstance(dependency_error, DependencyUnavailableError)


def test_classify_database_dependency_error_identifies_statement_timeout() -> None:
    original = SimpleNamespace(sqlstate="57014")
    operational_error = OperationalError("SELECT 1", {}, original)

    dependency_error = classify_database_dependency_error(operational_error)

    assert isinstance(dependency_error, DependencyUnavailableError)


def test_classify_database_dependency_error_identifies_pool_timeout() -> None:
    dependency_error = classify_database_dependency_error(SATimeoutError("pool timeout"))

    assert isinstance(dependency_error, DependencyUnavailableError)


def test_classify_database_dependency_error_leaves_ambiguous_errors_alone() -> None:
    operational_error = OperationalError("SELECT 1", {}, Exception("syntax error at or near select"))

    assert classify_database_dependency_error(operational_error) is None


def test_classify_database_dependency_error_leaves_auth_failures_alone() -> None:
    operational_error = OperationalError(
        "SELECT 1",
        {},
        Exception('connection failed: FATAL: password authentication failed for user "postgres"'),
    )

    assert classify_database_dependency_error(operational_error) is None


def test_classify_database_dependency_error_leaves_missing_role_alone() -> None:
    operational_error = OperationalError(
        "SELECT 1",
        {},
        Exception('connection failed: FATAL: role "postgres" does not exist'),
    )

    assert classify_database_dependency_error(operational_error) is None


def test_classify_database_dependency_error_identifies_disconnects() -> None:
    dependency_error = classify_database_dependency_error(DisconnectionError())

    assert isinstance(dependency_error, DependencyUnavailableError)


def test_classify_database_dependency_error_identifies_admin_shutdown() -> None:
    operational_error = OperationalError(
        "SELECT 1",
        {},
        Exception("terminating connection due to administrator command"),
    )

    dependency_error = classify_database_dependency_error(operational_error)

    assert isinstance(dependency_error, DependencyUnavailableError)
