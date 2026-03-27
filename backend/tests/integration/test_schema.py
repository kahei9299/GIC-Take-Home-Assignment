"""Integration tests that verify the Increment 3 persistence schema."""

from __future__ import annotations

import os
import uuid
from datetime import date

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import IntegrityError


def _database_url() -> str:
    """Return the PostgreSQL URL used for schema integration tests."""

    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("TEST_DATABASE_URL is required for PostgreSQL schema integration tests.")
    return url


def _alembic_config(database_url: str) -> Config:
    """Build an Alembic config pointed at the temporary test database."""

    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", database_url)
    return config


@pytest.fixture
def migrated_engine():
    """Upgrade a fresh PostgreSQL database to head and tear it down after the test."""

    database_url = _database_url()
    config = _alembic_config(database_url)
    command.upgrade(config, "head")
    engine = create_engine(database_url, future=True)

    try:
        yield engine
    finally:
        engine.dispose()
        command.downgrade(config, "base")


def test_initial_migration_creates_expected_tables(migrated_engine) -> None:
    """Verify the initial migration creates all Increment 3 tables."""

    inspector = inspect(migrated_engine)

    assert {"cafes", "employees", "employee_assignments"}.issubset(inspector.get_table_names())


def test_employee_table_enforces_unique_email_and_phone(migrated_engine) -> None:
    """Verify employee uniqueness constraints are enforced by PostgreSQL."""

    cafe_id = uuid.uuid4()

    with migrated_engine.begin() as connection:
        connection.execute(
            text(
                """
                INSERT INTO cafes (id, name, description, logo_url, location, location_normalized)
                VALUES (:id, :name, :description, :logo_url, :location, :location_normalized)
                """
            ),
            {
                "id": cafe_id,
                "name": "Downtown Cafe",
                "description": "Main branch",
                "logo_url": None,
                "location": "Bugis",
                "location_normalized": "bugis",
            },
        )
        connection.execute(
            text(
                """
                INSERT INTO employees (id, name, email_address, phone_number, gender)
                VALUES (:id, :name, :email_address, :phone_number, :gender)
                """
            ),
            {
                "id": "UIABC1234",
                "name": "Alice",
                "email_address": "alice@example.com",
                "phone_number": "81234567",
                "gender": "Female",
            },
        )

    with pytest.raises(IntegrityError):
        with migrated_engine.begin() as connection:
            connection.execute(
                text(
                    """
                    INSERT INTO employees (id, name, email_address, phone_number, gender)
                    VALUES (:id, :name, :email_address, :phone_number, :gender)
                    """
                ),
                {
                    "id": "UIABC1235",
                    "name": "Bob",
                    "email_address": "alice@example.com",
                    "phone_number": "91234567",
                    "gender": "Male",
                },
            )

    with pytest.raises(IntegrityError):
        with migrated_engine.begin() as connection:
            connection.execute(
                text(
                    """
                    INSERT INTO employees (id, name, email_address, phone_number, gender)
                    VALUES (:id, :name, :email_address, :phone_number, :gender)
                    """
                ),
                {
                    "id": "UIABC1236",
                    "name": "Charlie",
                    "email_address": "charlie@example.com",
                    "phone_number": "81234567",
                    "gender": "Male",
                },
            )


def test_employee_assignments_allow_history_but_only_one_active_row(migrated_engine) -> None:
    """Verify assignment history works while active-row uniqueness is enforced."""

    cafe_a = uuid.uuid4()
    cafe_b = uuid.uuid4()

    with migrated_engine.begin() as connection:
        connection.execute(
            text(
                """
                INSERT INTO cafes (id, name, description, logo_url, location, location_normalized)
                VALUES
                  (:cafe_a, 'Bugis Cafe', 'A', NULL, 'Bugis', 'bugis'),
                  (:cafe_b, 'Orchard Cafe', 'B', NULL, 'Orchard', 'orchard')
                """
            ),
            {"cafe_a": cafe_a, "cafe_b": cafe_b},
        )
        connection.execute(
            text(
                """
                INSERT INTO employees (id, name, email_address, phone_number, gender)
                VALUES ('UIABC9999', 'Dana', 'dana@example.com', '81239999', 'Female')
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO employee_assignments (id, employee_id, cafe_id, start_date, end_date)
                VALUES (:id, 'UIABC9999', :cafe_a, :start_date, NULL)
                """
            ),
            {"id": uuid.uuid4(), "cafe_a": cafe_a, "start_date": date(2026, 3, 20)},
        )

    with pytest.raises(IntegrityError):
        with migrated_engine.begin() as connection:
            connection.execute(
                text(
                    """
                    INSERT INTO employee_assignments (id, employee_id, cafe_id, start_date, end_date)
                    VALUES (:id, 'UIABC9999', :cafe_b, :start_date, NULL)
                    """
                ),
                {"id": uuid.uuid4(), "cafe_b": cafe_b, "start_date": date(2026, 3, 21)},
            )

    with migrated_engine.begin() as connection:
        connection.execute(
            text(
                """
                UPDATE employee_assignments
                SET end_date = :end_date
                WHERE employee_id = 'UIABC9999' AND end_date IS NULL
                """
            ),
            {"end_date": date(2026, 3, 21)},
        )
        connection.execute(
            text(
                """
                INSERT INTO employee_assignments (id, employee_id, cafe_id, start_date, end_date)
                VALUES (:id, 'UIABC9999', :cafe_b, :start_date, NULL)
                """
            ),
            {"id": uuid.uuid4(), "cafe_b": cafe_b, "start_date": date(2026, 3, 22)},
        )


def test_employee_assignments_reject_invalid_date_ranges(migrated_engine) -> None:
    """Verify assignments cannot end before they start."""

    cafe_id = uuid.uuid4()

    with migrated_engine.begin() as connection:
        connection.execute(
            text(
                """
                INSERT INTO cafes (id, name, description, logo_url, location, location_normalized)
                VALUES (:id, 'Raffles Cafe', 'Flagship', NULL, 'Raffles Place', 'raffles place')
                """
            ),
            {"id": cafe_id},
        )
        connection.execute(
            text(
                """
                INSERT INTO employees (id, name, email_address, phone_number, gender)
                VALUES ('UIZZZ9999', 'Eve', 'eve@example.com', '81238888', 'Female')
                """
            )
        )

    with pytest.raises(IntegrityError):
        with migrated_engine.begin() as connection:
            connection.execute(
                text(
                    """
                    INSERT INTO employee_assignments (id, employee_id, cafe_id, start_date, end_date)
                    VALUES (:id, 'UIZZZ9999', :cafe_id, :start_date, :end_date)
                    """
                ),
                {
                    "id": uuid.uuid4(),
                    "cafe_id": cafe_id,
                    "start_date": date(2026, 3, 27),
                    "end_date": date(2026, 3, 20),
                },
            )
