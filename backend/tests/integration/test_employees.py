"""Integration tests for the Increment 6 employee read endpoints."""

from __future__ import annotations

from uuid import uuid4

from sqlalchemy import text

from scripts.seed import main as seed_main


def _seed_test_database(monkeypatch, migrated_engine) -> None:
    """Load the demo dataset into the migrated PostgreSQL integration database."""

    monkeypatch.setenv("DATABASE_URL", migrated_engine.url.render_as_string(hide_password=False))
    seed_main()


def test_get_employees_returns_sorted_rows_with_days_worked(api_client, migrated_engine, monkeypatch) -> None:
    """Verify the list endpoint sorts by current days worked then name."""

    _seed_test_database(monkeypatch, migrated_engine)

    response = api_client.get("/employees")

    assert response.status_code == 200
    rows = response.json()
    assert rows
    assert rows[0]["days_worked"] >= rows[1]["days_worked"]
    assert rows[0]["name"] == "Melissa Ho"
    assert rows[-1]["days_worked"] == 0
    assert rows[-1]["name"] == "Xavier Tay"


def test_get_employees_includes_assigned_and_unassigned_rows(api_client, migrated_engine, monkeypatch) -> None:
    """Verify assigned and unassigned employees both appear in the list response."""

    _seed_test_database(monkeypatch, migrated_engine)

    response = api_client.get("/employees")

    assert response.status_code == 200
    rows = response.json()
    assert any(row["cafe"] is not None for row in rows)
    assert any(row["cafe"] is None for row in rows)


def test_get_employees_filters_by_cafe_id(api_client, migrated_engine, monkeypatch) -> None:
    """Verify cafe filters return only employees with an active assignment at that cafe."""

    _seed_test_database(monkeypatch, migrated_engine)
    cafes_response = api_client.get("/cafes", params={"location": "Bugis"})
    cafe_id = cafes_response.json()[0]["id"]

    response = api_client.get("/employees", params={"cafe_id": cafe_id})

    assert response.status_code == 200
    rows = response.json()
    assert len(rows) == 1
    assert rows[0]["name"] == "Alicia Tan"
    assert rows[0]["cafe"] == "Bugis Brew House"
    assert rows[0]["cafe_id"] == cafe_id


def test_get_employees_returns_empty_list_for_unknown_cafe_id(api_client) -> None:
    """Verify an unmatched cafe filter returns an empty list."""

    response = api_client.get("/employees", params={"cafe_id": str(uuid4())})

    assert response.status_code == 200
    assert response.json() == []


def test_get_employees_surfaces_unassigned_employees_with_zero_days_worked(api_client, migrated_engine, monkeypatch) -> None:
    """Verify employees without an active assignment expose null cafe fields and zero days."""

    _seed_test_database(monkeypatch, migrated_engine)

    response = api_client.get("/employees")

    assert response.status_code == 200
    unassigned_rows = [row for row in response.json() if row["cafe"] is None]
    assert len(unassigned_rows) == 4
    assert all(row["days_worked"] == 0 for row in unassigned_rows)
    assert all(row["cafe_id"] is None for row in unassigned_rows)


def test_get_employee_detail_returns_editable_fields_plus_current_cafe(api_client, migrated_engine, monkeypatch) -> None:
    """Verify the detail endpoint returns employee edit fields and current cafe assignment."""

    _seed_test_database(monkeypatch, migrated_engine)
    with migrated_engine.begin() as connection:
        employee_id = connection.execute(
            text("SELECT id FROM employees WHERE email_address = 'alicia.tan@example.com'")
        ).scalar_one()
        cafe_id = connection.execute(
            text("SELECT id FROM cafes WHERE name = 'Bugis Brew House'")
        ).scalar_one()

    response = api_client.get(f"/employees/{employee_id}")

    assert response.status_code == 200
    assert response.json() == {
        "name": "Alicia Tan",
        "email_address": "alicia.tan@example.com",
        "phone_number": "81230001",
        "gender": "Female",
        "cafe": "Bugis Brew House",
        "cafe_id": str(cafe_id),
    }


def test_get_employee_detail_returns_null_cafe_for_unassigned_employee(api_client, migrated_engine, monkeypatch) -> None:
    """Verify employees with only historical assignments surface null current cafe fields."""

    _seed_test_database(monkeypatch, migrated_engine)
    with migrated_engine.begin() as connection:
        employee_id = connection.execute(
            text("SELECT id FROM employees WHERE email_address = 'uma.raman@example.com'")
        ).scalar_one()

    response = api_client.get(f"/employees/{employee_id}")

    assert response.status_code == 200
    assert response.json() == {
        "name": "Uma Raman",
        "email_address": "uma.raman@example.com",
        "phone_number": "91230021",
        "gender": "Female",
        "cafe": None,
        "cafe_id": None,
    }


def test_get_employee_detail_returns_not_found_for_unknown_employee_id(api_client) -> None:
    """Verify a missing employee ID returns the shared not-found envelope."""

    response = api_client.get("/employees/UIZZZ9999")

    assert response.status_code == 404
    assert response.json() == {
        "code": "RESOURCE_NOT_FOUND",
        "message": "Employee not found.",
        "details": None,
    }
