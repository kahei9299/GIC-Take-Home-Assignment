"""Unit tests that verify ORM metadata registration for Increment 3."""

from app.core.database import Base
from app.models import Cafe, Employee, EmployeeAssignment


def test_persistence_models_are_registered_on_shared_metadata() -> None:
    """Verify the Increment 3 models register the expected tables on Base.metadata."""

    assert Cafe.__tablename__ == "cafes"
    assert Employee.__tablename__ == "employees"
    assert EmployeeAssignment.__tablename__ == "employee_assignments"
    assert {"cafes", "employees", "employee_assignments"}.issubset(Base.metadata.tables)


def test_increment_9_indexes_are_registered_on_metadata() -> None:
    """Verify the ORM metadata exposes the Increment 9 read-path indexes."""

    cafe_index_names = {index.name for index in Cafe.__table__.indexes}
    employee_index_names = {index.name for index in Employee.__table__.indexes}
    assignment_index_names = {index.name for index in EmployeeAssignment.__table__.indexes}

    assert "ix_cafes_name" in cafe_index_names
    assert "ix_cafes_location_normalized" in cafe_index_names
    assert "ix_employees_name" in employee_index_names
    assert "ix_employee_assignments_active_cafe_id" in assignment_index_names
    assert "uq_employee_assignments_one_active_per_employee" in assignment_index_names
