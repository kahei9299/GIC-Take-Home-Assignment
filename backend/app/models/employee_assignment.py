"""Employee assignment persistence model."""

from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import CheckConstraint, Date, ForeignKey, Index, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class EmployeeAssignment(Base):
    """Represents an employee's assignment history to a cafe."""

    __tablename__ = "employee_assignments"
    __table_args__ = (
        # Active assignment is encoded as end_date NULL, so this index enforces one open row per employee.
        Index(
            "uq_employee_assignments_one_active_per_employee",
            "employee_id",
            unique=True,
            postgresql_where=text("end_date IS NULL"),
        ),
        # Closed assignments must not end before they start.
        CheckConstraint(
            "end_date IS NULL OR end_date >= start_date",
            name="ck_employee_assignments_end_date_after_start_date",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id: Mapped[str] = mapped_column(
        String(9),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
    )
    cafe_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cafes.id", ondelete="CASCADE"),
        nullable=False,
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    employee: Mapped["Employee"] = relationship(back_populates="assignments")
    cafe: Mapped["Cafe"] = relationship(back_populates="assignments")
