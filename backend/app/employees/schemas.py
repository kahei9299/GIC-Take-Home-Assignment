"""Schemas for employee read and write endpoints."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, field_validator, model_validator

from app.shared.enums import Gender
from app.shared.validators import is_valid_email, is_valid_phone_number


class EmployeeListItem(BaseModel):
    """Represents one employee row returned by the list endpoint."""

    id: str
    name: str
    email_address: str
    phone_number: str
    gender: Gender
    days_worked: int
    cafe: str | None
    cafe_id: UUID | None


class EmployeeDetail(BaseModel):
    """Represents the editable employee fields returned by the detail endpoint."""

    name: str
    email_address: str
    phone_number: str
    gender: Gender
    cafe: str | None
    cafe_id: UUID | None


class EmployeeWriteRequest(BaseModel):
    """Represents the request payload shared by employee create and update operations."""

    name: str
    email_address: str
    phone_number: str
    gender: Gender
    cafe_id: UUID | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        """Trim the name and reject blank values."""

        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Value must not be blank.")
        return trimmed

    @field_validator("email_address")
    @classmethod
    def validate_email(cls, value: str) -> str:
        """Validate the pragmatic email format used across the backend."""

        normalized = value.strip()
        if not is_valid_email(normalized):
            raise ValueError("Value must be a valid email address.")
        return normalized

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, value: str) -> str:
        """Validate the Singapore phone number format used across the backend."""

        normalized = value.strip()
        if not is_valid_phone_number(normalized):
            raise ValueError("Value must be a valid phone number.")
        return normalized


class EmployeeCreateRequest(EmployeeWriteRequest):
    """Represents the create payload for employee writes."""

    @model_validator(mode="after")
    def validate_assigned_create(self) -> "EmployeeCreateRequest":
        """Require employee creation to include a target cafe."""

        if self.cafe_id is None:
            raise ValueError("cafe_id is required when creating an employee.")
        return self


class EmployeeWriteResponse(BaseModel):
    """Represents the saved employee payload returned after writes."""

    id: str
    name: str
    email_address: str
    phone_number: str
    gender: Gender
    days_worked: int
    cafe: str | None
    cafe_id: UUID | None
