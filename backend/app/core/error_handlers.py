"""Centralized API error handling for domain, validation, and unexpected failures."""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.exceptions import ApplicationError


def _sanitize_validation_errors(errors: list[dict]) -> list[dict]:
    sanitized: list[dict] = []
    for error in errors:
        item = dict(error)
        if "ctx" in item and item["ctx"]:
            item["ctx"] = {key: str(value) for key, value in item["ctx"].items()}
        sanitized.append(item)
    return sanitized


def register_exception_handlers(app: FastAPI) -> None:
    """Register shared exception-to-response mappings for the FastAPI app."""

    logger = logging.getLogger("app.error")

    @app.exception_handler(ApplicationError)
    async def handle_application_error(request: Request, exc: ApplicationError) -> JSONResponse:
        """Map known application errors to the stable JSON error envelope."""

        if exc.status_code >= 400:
            logger.warning(
                "Handled application error.",
                extra={
                    "event": "handled_application_error",
                    "request_id": getattr(request.state, "request_id", None),
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": exc.status_code,
                    "error_code": exc.code,
                },
            )

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "code": exc.code,
                "message": exc.message,
                "details": exc.details or None,
            },
        )

    @app.exception_handler(RequestValidationError)
    async def handle_request_validation_error(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        logger.warning(
            "Request validation failed.",
            extra={
                "event": "request_validation_failed",
                "request_id": getattr(request.state, "request_id", None),
                "method": request.method,
                "path": request.url.path,
                "status_code": 422,
            },
        )
        return JSONResponse(
            status_code=422,
            content={
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed.",
                "details": {"errors": _sanitize_validation_errors(exc.errors())},
            },
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_exception(request: Request, exc: Exception) -> JSONResponse:
        """Log unexpected errors and return a safe error payload."""

        logger.exception(
            "Unhandled exception.",
            extra={
                "event": "unhandled_exception",
                "request_id": getattr(request.state, "request_id", None),
                "method": request.method,
                "path": request.url.path,
            },
        )
        return JSONResponse(
            status_code=500,
            content={
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred.",
                "details": None,
            },
        )
