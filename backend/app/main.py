from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.cafes.router import router as cafe_router
from app.core.config import get_settings
from app.core.error_handlers import register_exception_handlers
from app.core.logging import add_request_logging_middleware, configure_logging
from app.employees.router import router as employee_router

import logging


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings)
    logger = logging.getLogger("app.lifecycle")

    app = FastAPI(title="GIC Take-Home Backend", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_url],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    add_request_logging_middleware(app)
    register_exception_handlers(app)
    app.include_router(cafe_router)
    app.include_router(employee_router)
    logger.info(
        "Application startup complete.",
        extra={
            "event": "app_startup",
            "app_name": settings.app_name,
            "app_env": settings.app_env,
            "log_level": settings.log_level.upper(),
            "log_format": settings.log_format.lower(),
        },
    )

    @app.get("/health", tags=["health"])
    def healthcheck() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
