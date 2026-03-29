"""Employee persistence model."""

from __future__ import annotations

from sqlalchemy import Enum, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.shared.enums import Gender


class Employee(Base):
    """Represents an employee identified by the business employee ID."""

    __tablename__ = "employees"
    __table_args__ = (
        Index("ix_employees_name", "name"),
        UniqueConstraint("email_address", name="uq_employees_email_address"),
        UniqueConstraint("phone_number", name="uq_employees_phone_number"),
    )

    id: Mapped[str] = mapped_column(String(9), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email_address: Mapped[str] = mapped_column(String(320), nullable=False)
    phone_number: Mapped[str] = mapped_column(String(8), nullable=False)
    gender: Mapped[Gender] = mapped_column(
        Enum(
            Gender,
            name="gender_enum",
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        nullable=False,
    )

    assignments: Mapped[list["EmployeeAssignment"]] = relationship(
        back_populates="employee",
        cascade="all, delete-orphan",
    )
