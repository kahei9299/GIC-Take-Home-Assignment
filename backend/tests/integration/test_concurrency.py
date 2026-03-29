"""Integration tests for Increment 9 conflict and concurrent-write behavior."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import date
import uuid

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError


def _insert_cafe(connection, cafe_id: uuid.UUID, name: str, location: str) -> None:
    """Insert a cafe row used by the concurrent-write tests."""

    connection.execute(
        text(
            """
            INSERT INTO cafes (id, name, description, logo_url, location, location_normalized)
            VALUES (:id, :name, :description, :logo_url, :location, :location_normalized)
            """
        ),
        {
            "id": cafe_id,
            "name": name,
            "description": f"{name} branch",
            "logo_url": None,
            "location": location,
            "location_normalized": location.lower(),
        },
    )


def test_concurrent_employee_email_inserts_preserve_uniqueness(migrated_engine) -> None:
    """Verify concurrent inserts cannot commit duplicate employee emails."""

    def insert_employee(employee_id: str, phone_number: str) -> None:
        with migrated_engine.begin() as connection:
            connection.execute(
                text(
                    """
                    INSERT INTO employees (id, name, email_address, phone_number, gender)
                    VALUES (:id, :name, :email_address, :phone_number, :gender)
                    """
                ),
                {
                    "id": employee_id,
                    "name": f"Employee {employee_id}",
                    "email_address": "shared@example.com",
                    "phone_number": phone_number,
                    "gender": "Female",
                },
            )

    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = [
            executor.submit(insert_employee, "UIEML1001", "81231001"),
            executor.submit(insert_employee, "UIEML1002", "81231002"),
        ]

    errors = [future.exception() for future in futures if future.exception() is not None]
    assert len(errors) == 1
    assert isinstance(errors[0], IntegrityError)

    with migrated_engine.begin() as connection:
        count = connection.execute(
            text("SELECT COUNT(*) FROM employees WHERE email_address = 'shared@example.com'")
        ).scalar_one()

    assert count == 1


def test_concurrent_employee_phone_inserts_preserve_uniqueness(migrated_engine) -> None:
    """Verify concurrent inserts cannot commit duplicate employee phone numbers."""

    def insert_employee(employee_id: str, email_address: str) -> None:
        with migrated_engine.begin() as connection:
            connection.execute(
                text(
                    """
                    INSERT INTO employees (id, name, email_address, phone_number, gender)
                    VALUES (:id, :name, :email_address, :phone_number, :gender)
                    """
                ),
                {
                    "id": employee_id,
                    "name": f"Employee {employee_id}",
                    "email_address": email_address,
                    "phone_number": "81239991",
                    "gender": "Male",
                },
            )

    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = [
            executor.submit(insert_employee, "UIPHN1001", "first@example.com"),
            executor.submit(insert_employee, "UIPHN1002", "second@example.com"),
        ]

    errors = [future.exception() for future in futures if future.exception() is not None]
    assert len(errors) == 1
    assert isinstance(errors[0], IntegrityError)

    with migrated_engine.begin() as connection:
        count = connection.execute(
            text("SELECT COUNT(*) FROM employees WHERE phone_number = '81239991'")
        ).scalar_one()

    assert count == 1


def test_concurrent_active_assignment_inserts_preserve_one_open_row(migrated_engine) -> None:
    """Verify concurrent writes cannot create two active assignments for one employee."""

    cafe_a = uuid.uuid4()
    cafe_b = uuid.uuid4()

    with migrated_engine.begin() as connection:
        _insert_cafe(connection, cafe_a, "Bugis Parallel", "Bugis")
        _insert_cafe(connection, cafe_b, "Orchard Parallel", "Orchard")
        connection.execute(
            text(
                """
                INSERT INTO employees (id, name, email_address, phone_number, gender)
                VALUES ('UIACT9999', 'Parallel Worker', 'parallel@example.com', '81238881', 'Female')
                """
            )
        )

    def insert_assignment(cafe_id: uuid.UUID) -> None:
        with migrated_engine.begin() as connection:
            connection.execute(
                text(
                    """
                    INSERT INTO employee_assignments (id, employee_id, cafe_id, start_date, end_date)
                    VALUES (:id, 'UIACT9999', :cafe_id, :start_date, NULL)
                    """
                ),
                {"id": uuid.uuid4(), "cafe_id": cafe_id, "start_date": date(2026, 3, 29)},
            )

    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = [
            executor.submit(insert_assignment, cafe_a),
            executor.submit(insert_assignment, cafe_b),
        ]

    errors = [future.exception() for future in futures if future.exception() is not None]
    assert len(errors) == 1
    assert isinstance(errors[0], IntegrityError)

    with migrated_engine.begin() as connection:
        active_count = connection.execute(
            text(
                """
                SELECT COUNT(*)
                FROM employee_assignments
                WHERE employee_id = 'UIACT9999' AND end_date IS NULL
                """
            )
        ).scalar_one()

    assert active_count == 1
