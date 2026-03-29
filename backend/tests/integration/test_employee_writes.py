"""Integration tests for the Increment 8 employee write endpoints."""

from __future__ import annotations

from datetime import date

from sqlalchemy import text

from scripts.seed import main as seed_main


def _seed_test_database(monkeypatch, migrated_engine) -> None:
    """Load the demo dataset into the migrated PostgreSQL integration database."""

    monkeypatch.setenv("DATABASE_URL", str(migrated_engine.url))
    seed_main()


def test_post_employees_creates_assigned_employee_with_generated_id(api_client, migrated_engine, monkeypatch) -> None:
    """Verify create returns 201, generates an ID, and persists the initial active assignment."""

    _seed_test_database(monkeypatch, migrated_engine)
    with migrated_engine.begin() as connection:
        cafe_id = connection.execute(text("SELECT id FROM cafes WHERE name = 'Bugis Brew House'")).scalar_one()

    response = api_client.post(
        "/employees",
        json={
            "name": "Yvonne Tan",
            "email_address": "yvonne.tan@example.com",
            "phone_number": "81239999",
            "gender": "Female",
            "cafe_id": str(cafe_id),
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["id"].startswith("UI")
    assert body["name"] == "Yvonne Tan"
    assert body["cafe"] == "Bugis Brew House"
    assert body["cafe_id"] == str(cafe_id)
    assert body["days_worked"] == 0

    with migrated_engine.begin() as connection:
        employee = connection.execute(
            text("SELECT id, email_address, phone_number FROM employees WHERE id = :id"),
            {"id": body["id"]},
        ).mappings().one()
        assignment = connection.execute(
            text(
                """
                SELECT cafe_id, start_date, end_date
                FROM employee_assignments
                WHERE employee_id = :employee_id
                """
            ),
            {"employee_id": body["id"]},
        ).mappings().one()

    assert dict(employee) == {
        "id": body["id"],
        "email_address": "yvonne.tan@example.com",
        "phone_number": "81239999",
    }
    assert assignment["cafe_id"] == cafe_id
    assert assignment["start_date"] == date.today()
    assert assignment["end_date"] is None


def test_post_employees_rejects_missing_cafe_id(api_client) -> None:
    """Verify create requires an initial cafe assignment."""

    response = api_client.post(
        "/employees",
        json={
            "name": "Yvonne Tan",
            "email_address": "yvonne.tan@example.com",
            "phone_number": "81239999",
            "gender": "Female",
            "cafe_id": None,
        },
    )

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


def test_post_employees_rejects_invalid_email_and_phone(api_client, migrated_engine, monkeypatch) -> None:
    """Verify create enforces pragmatic email and phone validation."""

    _seed_test_database(monkeypatch, migrated_engine)
    with migrated_engine.begin() as connection:
        cafe_id = connection.execute(text("SELECT id FROM cafes LIMIT 1")).scalar_one()

    response = api_client.post(
        "/employees",
        json={
            "name": "Yvonne Tan",
            "email_address": "not-an-email",
            "phone_number": "71234567",
            "gender": "Female",
            "cafe_id": str(cafe_id),
        },
    )

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


def test_post_employees_rejects_unknown_cafe_id(api_client) -> None:
    """Verify create returns not found when the requested cafe does not exist."""

    response = api_client.post(
        "/employees",
        json={
            "name": "Yvonne Tan",
            "email_address": "yvonne.tan@example.com",
            "phone_number": "81239999",
            "gender": "Female",
            "cafe_id": "11111111-1111-1111-1111-111111111111",
        },
    )

    assert response.status_code == 404
    assert response.json() == {
        "code": "RESOURCE_NOT_FOUND",
        "message": "Cafe not found.",
        "details": None,
    }


def test_post_employees_rejects_email_and_phone_conflicts(api_client, migrated_engine, monkeypatch) -> None:
    """Verify create maps uniqueness conflicts to the shared conflict envelope."""

    _seed_test_database(monkeypatch, migrated_engine)
    with migrated_engine.begin() as connection:
        cafe_id = connection.execute(text("SELECT id FROM cafes LIMIT 1")).scalar_one()

    response = api_client.post(
        "/employees",
        json={
            "name": "Duplicate Alicia",
            "email_address": "alicia.tan@example.com",
            "phone_number": "81230001",
            "gender": "Female",
            "cafe_id": str(cafe_id),
        },
    )

    assert response.status_code == 409
    assert response.json() == {
        "code": "CONFLICT",
        "message": "Employee email address or phone number already exists.",
        "details": None,
    }


def test_put_employees_same_cafe_preserves_assignment_continuity(api_client, migrated_engine, monkeypatch) -> None:
    """Verify same-cafe updates modify employee fields without replacing the active assignment row."""

    _seed_test_database(monkeypatch, migrated_engine)
    with migrated_engine.begin() as connection:
        employee_id = connection.execute(
            text("SELECT id FROM employees WHERE email_address = 'alicia.tan@example.com'")
        ).scalar_one()
        original_assignment = connection.execute(
            text(
                """
                SELECT id, cafe_id, start_date, end_date
                FROM employee_assignments
                WHERE employee_id = :employee_id AND end_date IS NULL
                """
            ),
            {"employee_id": employee_id},
        ).mappings().one()

    response = api_client.put(
        f"/employees/{employee_id}",
        json={
            "name": "Alicia Tan Updated",
            "email_address": "alicia.tan.updated@example.com",
            "phone_number": "81238888",
            "gender": "Female",
            "cafe_id": str(original_assignment["cafe_id"]),
        },
    )

    assert response.status_code == 200
    assert response.json()["days_worked"] > 0
    assert response.json()["cafe_id"] == str(original_assignment["cafe_id"])

    with migrated_engine.begin() as connection:
        assignments = connection.execute(
            text(
                """
                SELECT id, cafe_id, start_date, end_date
                FROM employee_assignments
                WHERE employee_id = :employee_id
                """
            ),
            {"employee_id": employee_id},
        ).mappings().all()

    assert assignments == [original_assignment]


def test_put_employees_reassignment_closes_old_row_and_creates_new_active_row(api_client, migrated_engine, monkeypatch) -> None:
    """Verify reassignment preserves history and starts a new active row."""

    _seed_test_database(monkeypatch, migrated_engine)
    with migrated_engine.begin() as connection:
        employee_id = connection.execute(
            text("SELECT id FROM employees WHERE email_address = 'alicia.tan@example.com'")
        ).scalar_one()
        new_cafe_id = connection.execute(
            text("SELECT id FROM cafes WHERE name = 'Orchard Glasshouse'")
        ).scalar_one()

    response = api_client.put(
        f"/employees/{employee_id}",
        json={
            "name": "Alicia Tan",
            "email_address": "alicia.tan@example.com",
            "phone_number": "81230001",
            "gender": "Female",
            "cafe_id": str(new_cafe_id),
        },
    )

    assert response.status_code == 200
    assert response.json()["cafe"] == "Orchard Glasshouse"
    assert response.json()["cafe_id"] == str(new_cafe_id)
    assert response.json()["days_worked"] == 0

    with migrated_engine.begin() as connection:
        assignments = connection.execute(
            text(
                """
                SELECT cafe_id, start_date, end_date
                FROM employee_assignments
                WHERE employee_id = :employee_id
                ORDER BY start_date ASC
                """
            ),
            {"employee_id": employee_id},
        ).mappings().all()

    assert assignments[-2]["end_date"] == date.today()
    assert assignments[-1]["cafe_id"] == new_cafe_id
    assert assignments[-1]["start_date"] == date.today()
    assert assignments[-1]["end_date"] is None


def test_put_employees_unassign_closes_active_row_and_returns_unassigned_state(api_client, migrated_engine, monkeypatch) -> None:
    """Verify unassignment closes the active row and returns null cafe fields."""

    _seed_test_database(monkeypatch, migrated_engine)
    with migrated_engine.begin() as connection:
        employee_id = connection.execute(
            text("SELECT id FROM employees WHERE email_address = 'alicia.tan@example.com'")
        ).scalar_one()

    response = api_client.put(
        f"/employees/{employee_id}",
        json={
            "name": "Alicia Tan",
            "email_address": "alicia.tan@example.com",
            "phone_number": "81230001",
            "gender": "Female",
            "cafe_id": None,
        },
    )

    assert response.status_code == 200
    assert response.json()["cafe"] is None
    assert response.json()["cafe_id"] is None
    assert response.json()["days_worked"] == 0

    with migrated_engine.begin() as connection:
        active_count = connection.execute(
            text(
                """
                SELECT COUNT(*)
                FROM employee_assignments
                WHERE employee_id = :employee_id AND end_date IS NULL
                """
            ),
            {"employee_id": employee_id},
        ).scalar_one()
        last_closed_end_date = connection.execute(
            text(
                """
                SELECT end_date
                FROM employee_assignments
                WHERE employee_id = :employee_id
                ORDER BY start_date DESC
                LIMIT 1
                """
            ),
            {"employee_id": employee_id},
        ).scalar_one()

    assert active_count == 0
    assert last_closed_end_date == date.today()


def test_put_employees_unassigned_to_assigned_creates_new_active_row(api_client, migrated_engine, monkeypatch) -> None:
    """Verify assigning an unassigned employee creates a new active history row."""

    _seed_test_database(monkeypatch, migrated_engine)
    with migrated_engine.begin() as connection:
        employee_id = connection.execute(
            text("SELECT id FROM employees WHERE email_address = 'uma.raman@example.com'")
        ).scalar_one()
        cafe_id = connection.execute(
            text("SELECT id FROM cafes WHERE name = 'Bugis Brew House'")
        ).scalar_one()

    response = api_client.put(
        f"/employees/{employee_id}",
        json={
            "name": "Uma Raman",
            "email_address": "uma.raman@example.com",
            "phone_number": "91230021",
            "gender": "Female",
            "cafe_id": str(cafe_id),
        },
    )

    assert response.status_code == 200
    assert response.json()["cafe"] == "Bugis Brew House"
    assert response.json()["days_worked"] == 0

    with migrated_engine.begin() as connection:
        active_assignment = connection.execute(
            text(
                """
                SELECT cafe_id, start_date, end_date
                FROM employee_assignments
                WHERE employee_id = :employee_id AND end_date IS NULL
                """
            ),
            {"employee_id": employee_id},
        ).mappings().one()

    assert active_assignment["cafe_id"] == cafe_id
    assert active_assignment["start_date"] == date.today()
    assert active_assignment["end_date"] is None


def test_put_employees_returns_not_found_for_missing_employee(api_client) -> None:
    """Verify update returns the shared not-found envelope for unknown employees."""

    response = api_client.put(
        "/employees/UIZZZ9999",
        json={
            "name": "Missing Employee",
            "email_address": "missing@example.com",
            "phone_number": "81239999",
            "gender": "Male",
            "cafe_id": None,
        },
    )

    assert response.status_code == 404
    assert response.json() == {
        "code": "RESOURCE_NOT_FOUND",
        "message": "Employee not found.",
        "details": None,
    }


def test_delete_employees_returns_no_content_and_removes_employee_and_assignments(api_client, migrated_engine, monkeypatch) -> None:
    """Verify delete removes the employee row and all related assignment history."""

    _seed_test_database(monkeypatch, migrated_engine)
    with migrated_engine.begin() as connection:
        employee_id = connection.execute(
            text("SELECT id FROM employees WHERE email_address = 'alicia.tan@example.com'")
        ).scalar_one()

    response = api_client.delete(f"/employees/{employee_id}")

    assert response.status_code == 204
    assert response.content == b""

    with migrated_engine.begin() as connection:
        employee_count = connection.execute(
            text("SELECT COUNT(*) FROM employees WHERE id = :employee_id"),
            {"employee_id": employee_id},
        ).scalar_one()
        assignment_count = connection.execute(
            text("SELECT COUNT(*) FROM employee_assignments WHERE employee_id = :employee_id"),
            {"employee_id": employee_id},
        ).scalar_one()

    assert employee_count == 0
    assert assignment_count == 0


def test_delete_employees_returns_not_found_for_missing_employee(api_client) -> None:
    """Verify delete returns the shared not-found envelope for unknown employees."""

    response = api_client.delete("/employees/UIZZZ9999")

    assert response.status_code == 404
    assert response.json() == {
        "code": "RESOURCE_NOT_FOUND",
        "message": "Employee not found.",
        "details": None,
    }
