"""Schemas for cafe read and write endpoints."""

from __future__ import annotations

from uuid import UUID

from pydantic import AnyHttpUrl, BaseModel, field_validator


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
    logo_url: AnyHttpUrl | None = None
    location: str

    @field_validator("name", "description", "location")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        """Trim required text fields and reject blank values."""

        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Value must not be blank.")
        return trimmed


class CafeWriteResponse(BaseModel):
    """Represents the persisted cafe payload returned after writes."""

    id: UUID
    name: str
    description: str
    logo_url: str | None
    location: str
