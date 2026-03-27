from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic import ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables and `.env`."""

    app_env: str = "development"
    database_url: str = Field(validation_alias="DATABASE_URL")
    frontend_url: str = Field(validation_alias="FRONTEND_URL")

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )


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
