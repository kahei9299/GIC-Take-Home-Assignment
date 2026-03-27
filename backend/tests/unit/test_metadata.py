"""Unit tests that verify ORM metadata registration for Increment 3."""

from app.core.database import Base
from app.models import Cafe, Employee, EmployeeAssignment


def test_persistence_models_are_registered_on_shared_metadata() -> None:
    """Verify the Increment 3 models register the expected tables on Base.metadata."""

    assert Cafe.__tablename__ == "cafes"
    assert Employee.__tablename__ == "employees"
    assert EmployeeAssignment.__tablename__ == "employee_assignments"
    assert {"cafes", "employees", "employee_assignments"}.issubset(Base.metadata.tables)
