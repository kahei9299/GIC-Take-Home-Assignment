"""Create persistence core tables."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260327_000001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create the cafes, employees, and employee_assignments tables."""

    gender_enum = postgresql.ENUM("Male", "Female", name="gender_enum")
    gender_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "cafes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("logo_url", sa.Text(), nullable=True),
        sa.Column("location", sa.String(length=255), nullable=False),
        # Store the normalized value explicitly so the later filter can use an index-friendly exact match.
        sa.Column("location_normalized", sa.String(length=255), nullable=False),
    )
    op.create_index("ix_cafes_location_normalized", "cafes", ["location_normalized"], unique=False)

    op.create_table(
        "employees",
        sa.Column("id", sa.String(length=9), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email_address", sa.String(length=320), nullable=False),
        sa.Column("phone_number", sa.String(length=8), nullable=False),
        sa.Column("gender", postgresql.ENUM("Male", "Female", name="gender_enum", create_type=False), nullable=False),
        sa.UniqueConstraint("email_address", name="uq_employees_email_address"),
        sa.UniqueConstraint("phone_number", name="uq_employees_phone_number"),
    )

    op.create_table(
        "employee_assignments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("employee_id", sa.String(length=9), nullable=False),
        sa.Column("cafe_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.CheckConstraint(
            "end_date IS NULL OR end_date >= start_date",
            name="ck_employee_assignments_end_date_after_start_date",
        ),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["cafe_id"], ["cafes.id"], ondelete="CASCADE"),
    )
    # A partial unique index keeps history rows while allowing at most one active assignment per employee.
    op.create_index(
        "uq_employee_assignments_one_active_per_employee",
        "employee_assignments",
        ["employee_id"],
        unique=True,
        postgresql_where=sa.text("end_date IS NULL"),
    )


def downgrade() -> None:
    """Drop the persistence core tables and related enum."""

    op.drop_index(
        "uq_employee_assignments_one_active_per_employee",
        table_name="employee_assignments",
        postgresql_where=sa.text("end_date IS NULL"),
    )
    op.drop_table("employee_assignments")
    op.drop_constraint("uq_employees_phone_number", "employees", type_="unique")
    op.drop_constraint("uq_employees_email_address", "employees", type_="unique")
    op.drop_table("employees")
    op.drop_index("ix_cafes_location_normalized", table_name="cafes")
    op.drop_table("cafes")

    postgresql.ENUM("Male", "Female", name="gender_enum").drop(op.get_bind(), checkfirst=True)
