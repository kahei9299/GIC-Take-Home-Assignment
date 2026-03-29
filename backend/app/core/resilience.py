"""Shared resilience helpers for retries and dependency-failure classification."""

from __future__ import annotations

import logging
import random
import time
from collections.abc import Callable
from typing import ParamSpec, TypeVar

from sqlalchemy.exc import DBAPIError, DisconnectionError, OperationalError, TimeoutError as SATimeoutError

from app.core.exceptions import DependencyUnavailableError
from app.core.request_context import get_request_id

P = ParamSpec("P")
R = TypeVar("R")

_DATABASE_DEPENDENCY_MARKERS = (
    "admin shutdown",
    "connection refused",
    "connection reset by peer",
    "connection not open",
    "connection timed out",
    "consuming input failed",
    "could not connect",
    "could not receive data from server",
    "could not send data to server",
    "could not translate host name",
    "eof detected",
    "terminating connection due to administrator command",
    "server closed the connection unexpectedly",
    "statement timeout",
    "temporary failure in name resolution",
    "timed out",
    "timeout expired",
)


def classify_database_dependency_error(exc: Exception) -> DependencyUnavailableError | None:
    """Map clearly identified database availability failures to the shared `503` error."""

    if isinstance(exc, SATimeoutError):
        return DependencyUnavailableError("Database dependency is unavailable.")

    if isinstance(exc, DisconnectionError):
        return DependencyUnavailableError("Database dependency is unavailable.")

    if not isinstance(exc, (OperationalError, DBAPIError)):
        return None

    if getattr(exc, "connection_invalidated", False):
        return DependencyUnavailableError("Database dependency is unavailable.")

    orig = getattr(exc, "orig", None)
    sqlstate = getattr(orig, "sqlstate", None)
    if sqlstate == "57014":
        return DependencyUnavailableError("Database dependency timed out.")

    message = str(orig or exc).lower()
    if any(marker in message for marker in _DATABASE_DEPENDENCY_MARKERS):
        return DependencyUnavailableError("Database dependency is unavailable.")

    return None


def calculate_backoff_delay_ms(attempt: int, base_delay_ms: int, max_delay_ms: int) -> int:
    """Return an exponentially increasing jittered delay capped at `max_delay_ms`."""

    capped_delay = min(base_delay_ms * (2 ** max(attempt - 1, 0)), max_delay_ms)
    return max(0, int(capped_delay * random.uniform(0.5, 1.0)))


def retry_with_backoff(
    operation: Callable[P, R],
    *args: P.args,
    dependency: str,
    operation_name: str,
    max_attempts: int,
    base_delay_ms: int,
    max_delay_ms: int,
    logger: logging.Logger,
    should_retry: Callable[[Exception], bool],
    **kwargs: P.kwargs,
) -> R:
    """Retry one safe dependency operation with bounded exponential backoff and jitter."""

    last_error: Exception | None = None

    for attempt in range(1, max_attempts + 1):
        try:
            return operation(*args, **kwargs)
        except Exception as exc:
            last_error = exc
            if attempt >= max_attempts or not should_retry(exc):
                raise

            backoff_ms = calculate_backoff_delay_ms(attempt, base_delay_ms, max_delay_ms)
            logger.warning(
                "Dependency operation failed; retrying.",
                extra={
                    "event": "dependency_retry",
                    "request_id": get_request_id(),
                    "dependency": dependency,
                    "operation": operation_name,
                    "retry_attempt": attempt,
                    "max_attempts": max_attempts,
                    "backoff_ms": backoff_ms,
                },
            )
            time.sleep(backoff_ms / 1000)

    assert last_error is not None
    raise last_error
