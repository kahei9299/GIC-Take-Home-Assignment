"""Persistence models registered on the shared SQLAlchemy metadata."""

from app.models.cafe import Cafe
from app.models.employee import Employee
from app.models.employee_assignment import EmployeeAssignment

__all__ = ["Cafe", "Employee", "EmployeeAssignment"]
