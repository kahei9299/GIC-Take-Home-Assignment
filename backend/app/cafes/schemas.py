"""Response schemas for cafe read endpoints."""

from uuid import UUID

from pydantic import BaseModel


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
