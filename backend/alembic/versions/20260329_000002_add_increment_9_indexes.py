"""Add Increment 9 read-path indexes."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260329_000002"
down_revision = "20260327_000001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create the targeted indexes used by the hardened read paths."""

    op.create_index("ix_cafes_name", "cafes", ["name"], unique=False)
    op.create_index("ix_employees_name", "employees", ["name"], unique=False)
    op.create_index(
        "ix_employee_assignments_active_cafe_id",
        "employee_assignments",
        ["cafe_id"],
        unique=False,
        postgresql_where=sa.text("end_date IS NULL"),
    )


def downgrade() -> None:
    """Drop the Increment 9 read-path indexes."""

    op.drop_index("ix_employee_assignments_active_cafe_id", table_name="employee_assignments")
    op.drop_index("ix_employees_name", table_name="employees")
    op.drop_index("ix_cafes_name", table_name="cafes")
