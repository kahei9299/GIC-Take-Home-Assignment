from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic import computed_field
from pydantic import field_validator
from pydantic import ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables and `.env`."""

    app_name: str = Field(default="gic-take-home-backend", validation_alias="APP_NAME")
    app_env: str = "development"
    database_url: str = Field(validation_alias="DATABASE_URL")
    frontend_url: str | None = Field(default=None, validation_alias="FRONTEND_URL")
    cors_allowed_origins: str | None = Field(default=None, validation_alias="CORS_ALLOWED_ORIGINS")
    database_connect_timeout_seconds: int = Field(default=5, validation_alias="DATABASE_CONNECT_TIMEOUT_SECONDS")
    database_pool_timeout_seconds: int = Field(default=5, validation_alias="DATABASE_POOL_TIMEOUT_SECONDS")
    database_pool_recycle_seconds: int = Field(default=1800, validation_alias="DATABASE_POOL_RECYCLE_SECONDS")
    database_pool_size: int = Field(default=5, validation_alias="DATABASE_POOL_SIZE")
    database_max_overflow: int = Field(default=10, validation_alias="DATABASE_MAX_OVERFLOW")
    database_statement_timeout_ms: int = Field(default=5000, validation_alias="DATABASE_STATEMENT_TIMEOUT_MS")
    redis_url: str | None = Field(default=None, validation_alias="REDIS_URL")
    cache_ttl_seconds: int = Field(default=60, validation_alias="CACHE_TTL_SECONDS")
    redis_socket_connect_timeout_seconds: float = Field(
        default=0.5,
        validation_alias="REDIS_SOCKET_CONNECT_TIMEOUT_SECONDS",
    )
    redis_socket_timeout_seconds: float = Field(default=0.5, validation_alias="REDIS_SOCKET_TIMEOUT_SECONDS")
    redis_retry_max_attempts: int = Field(default=3, validation_alias="REDIS_RETRY_MAX_ATTEMPTS")
    redis_retry_base_delay_ms: int = Field(default=50, validation_alias="REDIS_RETRY_BASE_DELAY_MS")
    redis_retry_max_delay_ms: int = Field(default=500, validation_alias="REDIS_RETRY_MAX_DELAY_MS")
    readiness_check_timeout_seconds: float = Field(default=1.0, validation_alias="READINESS_CHECK_TIMEOUT_SECONDS")
    log_level: str = Field(default="INFO", validation_alias="LOG_LEVEL")
    log_format: str = Field(default="json", validation_alias="LOG_FORMAT")

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        """Normalize hosted Postgres URLs to the SQLAlchemy psycopg dialect."""

        if not isinstance(value, str):
            return value

        normalized = value.strip()

        if normalized.startswith("postgres://"):
            return normalized.replace("postgres://", "postgresql+psycopg://", 1)

        if normalized.startswith("postgresql://"):
            return normalized.replace("postgresql://", "postgresql+psycopg://", 1)

        return normalized

    @computed_field
    @property
    def allowed_cors_origins(self) -> list[str]:
        """Return the exact frontend origins allowed to call the backend."""

        raw_origins = self.cors_allowed_origins or self.frontend_url or ""
        return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return a cached settings object for the current process."""

    try:
        return Settings()
    except ValidationError as exc:
        missing_fields = sorted(
            error["loc"][0]
            for error in exc.errors()
            if error.get("type") == "missing" and error.get("loc")
        )
        missing_list = ", ".join(missing_fields) if missing_fields else "required settings"
        raise RuntimeError(
            f"Application settings are incomplete. Missing: {missing_list}. "
            f"Copy {ENV_FILE.name}.example to {ENV_FILE.name} and fill in the required values."
        ) from exc
