from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.cafes.router import router as cafe_router
from app.core.cache import close_cache_client
from app.core.config import get_settings
from app.core.database import dispose_engine
from app.core.error_handlers import register_exception_handlers
from app.core.logging import add_request_logging_middleware, configure_logging
from app.core.readiness import build_readiness_payload
from app.employees.router import router as employee_router


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings)
    logger = logging.getLogger("app.lifecycle")

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
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
        try:
            yield
        finally:
            close_cache_client()
            dispose_engine()
            logger.info(
                "Application shutdown complete.",
                extra={
                    "event": "app_shutdown",
                    "app_name": settings.app_name,
                    "app_env": settings.app_env,
                },
            )

    app = FastAPI(title="GIC Take-Home Backend", version="0.1.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    add_request_logging_middleware(app)
    register_exception_handlers(app)
    app.include_router(cafe_router)
    app.include_router(employee_router)

    @app.get("/health", tags=["health"])
    def healthcheck() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/health/ready", tags=["health"])
    def readiness_check() -> JSONResponse:
        payload, status_code = build_readiness_payload()
        return JSONResponse(status_code=status_code, content=payload)

    return app


app = create_app()
