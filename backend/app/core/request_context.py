"""Request-scoped helpers for structured logging and dependency integrations."""

from __future__ import annotations

from contextvars import ContextVar, Token


_request_id_var: ContextVar[str | None] = ContextVar("request_id", default=None)


def set_request_id(request_id: str | None) -> Token[str | None]:
    """Bind the current request ID into a context variable for downstream helpers."""

    return _request_id_var.set(request_id)


def reset_request_id(token: Token[str | None]) -> None:
    """Restore the previous request ID context after the request completes."""

    _request_id_var.reset(token)


def get_request_id() -> str | None:
    """Return the current request ID when one is available."""

    return _request_id_var.get()
