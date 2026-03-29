"""Shared application-level exception types for stable API error mapping."""

from __future__ import annotations


class ApplicationError(Exception):
    """Base application error carrying the API envelope code and HTTP status."""

    default_code = "BAD_REQUEST"
    status_code = 400

    def __init__(self, code: str | None, message: str, details: dict | None = None) -> None:
        super().__init__(message)
        self.code = code or self.default_code
        self.message = message
        self.details = details or {}


class DomainValidationError(ApplicationError):
    """Business-semantic failure that should surface as a `400` response."""

    default_code = "INVALID_OPERATION"
    status_code = 400

    def __init__(self, message: str, details: dict | None = None, code: str | None = None) -> None:
        super().__init__(code=code, message=message, details=details)


class NotFoundError(ApplicationError):
    """Missing resource error for `404` responses."""

    default_code = "RESOURCE_NOT_FOUND"
    status_code = 404

    def __init__(self, code: str | None, message: str, details: dict | None = None) -> None:
        super().__init__(code=code, message=message, details=details)


class ConflictError(ApplicationError):
    """Conflict error for uniqueness and write-race failures."""

    default_code = "CONFLICT"
    status_code = 409

    def __init__(self, code: str | None, message: str, details: dict | None = None) -> None:
        super().__init__(code=code, message=message, details=details)


class DependencyUnavailableError(ApplicationError):
    """Reserved dependency failure type for future `503` responses."""

    default_code = "DEPENDENCY_UNAVAILABLE"
    status_code = 503

    def __init__(self, message: str, details: dict | None = None, code: str | None = None) -> None:
        super().__init__(code=code, message=message, details=details)
