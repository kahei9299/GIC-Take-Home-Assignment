"""Schemas for cafe read and write endpoints."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, field_validator

from app.shared.validators import MAX_CAFE_DESCRIPTION_LENGTH, MAX_NAME_LENGTH, MIN_NAME_LENGTH, is_valid_logo_value


class CafeListItem(BaseModel):
    """Represents one cafe row returned by the list endpoint."""

    id: UUID
    name: str
    description: str
    logo_url: str | None
    location: str
    employees: int


class CafeDetail(BaseModel):
    """Represents the editable cafe fields used by the detail endpoint."""

    name: str
    description: str
    logo_url: str | None
    location: str


class CafeWriteRequest(BaseModel):
    """Represents the request payload shared by cafe create and update operations."""

    name: str
    description: str
    logo_url: str | None = None
    location: str

    @field_validator("name", "location")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        """Trim required text fields and reject blank values."""

        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Value must not be blank.")
        return trimmed

    @field_validator("name")
    @classmethod
    def validate_name_length(cls, value: str) -> str:
        """Enforce the assignment's cafe name length constraints."""

        if not MIN_NAME_LENGTH <= len(value) <= MAX_NAME_LENGTH:
            raise ValueError(f"Value must be between {MIN_NAME_LENGTH} and {MAX_NAME_LENGTH} characters.")
        return value

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: str) -> str:
        """Trim the description and enforce the assignment's max length."""

        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Value must not be blank.")
        if len(trimmed) > MAX_CAFE_DESCRIPTION_LENGTH:
            raise ValueError(f"Value must be at most {MAX_CAFE_DESCRIPTION_LENGTH} characters.")
        return trimmed

    @field_validator("logo_url")
    @classmethod
    def validate_logo_url(cls, value: str | None) -> str | None:
        """Accept either hosted logo URLs or image data URLs."""

        if value is None:
            return None

        trimmed = value.strip()
        if not trimmed:
            return None
        if not is_valid_logo_value(trimmed):
            raise ValueError("Value must be an HTTP(S) URL or an image data URL.")
        return trimmed


class CafeWriteResponse(BaseModel):
    """Represents the persisted cafe payload returned after writes."""

    id: UUID
    name: str
    description: str
    logo_url: str | None
    location: str
