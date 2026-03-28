"""Integration tests that verify the Increment 4 seed dataset."""

from __future__ import annotations

from datetime import date
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

import app.core.database as database_module
from app.core.config import get_settings
from app.models import Cafe, Employee, EmployeeAssignment
from app.shared.validators import normalize_location
from scripts.seed import main as seed_main


def _count_rows(session: Session, model: type[Any]) -> int:
    """Return the total row count for a mapped model."""

    return session.scalar(select(func.count()).select_from(model)) or 0


def _configure_seed_runtime(database_url: str) -> None:
    """Point the seed script at the integration test database for the current test."""

    get_settings.cache_clear()
    database_module._engine = None


def _seed_test_database(database_url: str, monkeypatch) -> None:
    """Run the seed script against the migrated integration test database."""

    monkeypatch.setenv("DATABASE_URL", database_url)
    _configure_seed_runtime(database_url)
    seed_main()


def test_seed_populates_expected_row_counts_and_is_idempotent(migrated_engine, monkeypatch, capsys) -> None:
    """Verify the seed script inserts the demo dataset once and updates it on reruns."""

    database_url = str(migrated_engine.url)
    _seed_test_database(database_url, monkeypatch)
    first_run_output = capsys.readouterr().out

    with Session(migrated_engine) as session:
        assert _count_rows(session, Cafe) == 24
        assert _count_rows(session, Employee) == 24
        assert _count_rows(session, EmployeeAssignment) == 26

    assert "cafes: inserted=24 updated=0" in first_run_output
    assert "employees: inserted=24 updated=0" in first_run_output
    assert "employee_assignments: inserted=26 updated=0" in first_run_output

    _seed_test_database(database_url, monkeypatch)
    second_run_output = capsys.readouterr().out

    with Session(migrated_engine) as session:
        assert _count_rows(session, Cafe) == 24
        assert _count_rows(session, Employee) == 24
        assert _count_rows(session, EmployeeAssignment) == 26

    assert "cafes: inserted=0 updated=24" in second_run_output
    assert "employees: inserted=0 updated=24" in second_run_output
    assert "employee_assignments: inserted=0 updated=26" in second_run_output


def test_seed_creates_repeated_locations_unassigned_employees_and_history(migrated_engine, monkeypatch) -> None:
    """Verify the seeded data shape supports later feature checks and manual review."""

    _seed_test_database(str(migrated_engine.url), monkeypatch)

    with Session(migrated_engine) as session:
        bugis_count = session.scalar(
            select(func.count()).select_from(Cafe).where(Cafe.location_normalized == normalize_location("Bugis"))
        )
        active_assignment_count = session.scalar(
            select(func.count())
            .select_from(EmployeeAssignment)
            .where(EmployeeAssignment.end_date.is_(None))
        )
        closed_assignment_count = session.scalar(
            select(func.count())
            .select_from(EmployeeAssignment)
            .where(EmployeeAssignment.end_date.is_not(None))
        )
        unassigned_employee_count = session.scalar(
            select(func.count())
            .select_from(Employee)
            .where(
                ~Employee.assignments.any(EmployeeAssignment.end_date.is_(None))
            )
        )
        uma_history = session.scalars(
            select(EmployeeAssignment)
            .join(EmployeeAssignment.employee)
            .where(Employee.email_address == "uma.raman@example.com")
            .order_by(EmployeeAssignment.start_date.asc())
        ).all()

    assert bugis_count == 4
    assert active_assignment_count == 20
    assert closed_assignment_count == 6
    assert unassigned_employee_count == 4
    assert len(uma_history) == 2
    assert uma_history[0].end_date == date(2025, 12, 31)
    assert uma_history[1].end_date == date(2026, 2, 20)


def test_seed_preserves_one_active_assignment_per_employee(migrated_engine, monkeypatch) -> None:
    """Verify the seed script never creates multiple active assignments for one employee."""

    _seed_test_database(str(migrated_engine.url), monkeypatch)

    with Session(migrated_engine) as session:
        active_rows = session.execute(
            select(EmployeeAssignment.employee_id, func.count(EmployeeAssignment.id))
            .where(EmployeeAssignment.end_date.is_(None))
            .group_by(EmployeeAssignment.employee_id)
        ).all()

    assert active_rows
    assert all(active_count == 1 for _, active_count in active_rows)
