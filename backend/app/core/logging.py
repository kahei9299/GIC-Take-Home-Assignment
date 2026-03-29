"""Centralized application logging configuration and request middleware."""

from __future__ import annotations

import json
import logging
from logging.config import dictConfig
from time import perf_counter
from uuid import uuid4

from fastapi import FastAPI, Request, Response

from app.core.config import Settings
from app.core.request_context import reset_request_id, set_request_id


class JsonLogFormatter(logging.Formatter):
    """Serialize log records into one-line JSON objects for production use."""

    def format(self, record: logging.LogRecord) -> str:
        """Render a log record as JSON while keeping the field set intentionally small."""

        payload = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        for field_name in (
            "event",
            "app_name",
            "app_env",
            "log_level",
            "log_format",
            "error_code",
            "cache_status",
            "resource_type",
            "cache_key",
            "request_id",
            "method",
            "path",
            "status_code",
            "duration_ms",
            "client_ip",
        ):
            field_value = getattr(record, field_name, None)
            if field_value is not None:
                payload[field_name] = field_value

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(payload, default=str)


def configure_logging(settings: Settings) -> None:
    """Configure process-wide logging for the backend application."""

    log_level = settings.log_level.upper()
    log_format = settings.log_format.lower()
    formatter_name = "json" if log_format == "json" else "plain"

    dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "json": {
                    "()": "app.core.logging.JsonLogFormatter",
                    "datefmt": "%Y-%m-%dT%H:%M:%S%z",
                },
                "plain": {
                    "format": "%(asctime)s %(levelname)s %(name)s %(message)s",
                    "datefmt": "%Y-%m-%dT%H:%M:%S%z",
                },
            },
            "handlers": {
                "default": {
                    "class": "logging.StreamHandler",
                    "formatter": formatter_name,
                    "level": log_level,
                }
            },
            "root": {
                "handlers": ["default"],
                "level": log_level,
            },
        }
    )


def _request_id_from_headers(request: Request) -> str:
    """Return an incoming request ID or generate a new one when absent."""

    return request.headers.get("X-Request-ID") or str(uuid4())


def add_request_logging_middleware(app: FastAPI) -> None:
    """Attach request logging and correlation ID middleware to the FastAPI app."""

    logger = logging.getLogger("app.request")

    @app.middleware("http")
    async def request_logging_middleware(request: Request, call_next) -> Response:
        """Log one summary record per request and echo the request ID in the response."""

        request_id = _request_id_from_headers(request)
        request.state.request_id = request_id
        request_context_token = set_request_id(request_id)
        start_time = perf_counter()
        try:
            response = await call_next(request)

            duration_ms = round((perf_counter() - start_time) * 1000, 2)
            response.headers["X-Request-ID"] = request_id

            logger.info(
                "Request completed.",
                extra={
                    "event": "request_completed",
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration_ms": duration_ms,
                    # Keep client metadata to a minimal safe subset for debugging request flow.
                    "client_ip": request.client.host if request.client is not None else None,
                },
            )
            return response
        finally:
            reset_request_id(request_context_token)
