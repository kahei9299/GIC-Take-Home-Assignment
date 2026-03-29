"""Cafe persistence model."""

from __future__ import annotations

import uuid

from sqlalchemy import Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Cafe(Base):
    """Represents a cafe that employees can be assigned to."""

    __tablename__ = "cafes"
    __table_args__ = (
        Index("ix_cafes_name", "name"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    # Keep the normalized value separate so later filtering can stay exact and indexable.
    location_normalized: Mapped[str] = mapped_column(String(255), nullable=False, index=True)

    assignments: Mapped[list["EmployeeAssignment"]] = relationship(
        back_populates="cafe",
        cascade="all, delete-orphan",
    )
