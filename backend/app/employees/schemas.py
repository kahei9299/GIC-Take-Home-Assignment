"""Response schemas for employee read endpoints."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel

from app.shared.enums import Gender


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
