"""Integration tests for the Increment 7 cafe write endpoints."""

from __future__ import annotations

from uuid import uuid4

from sqlalchemy import text

from scripts.seed import main as seed_main


def _seed_test_database(monkeypatch, migrated_engine) -> None:
    """Load the demo dataset into the migrated PostgreSQL integration database."""

    monkeypatch.setenv("DATABASE_URL", migrated_engine.url.render_as_string(hide_password=False))
    seed_main()


def test_post_cafes_creates_cafe_and_returns_saved_resource(api_client, migrated_engine) -> None:
    """Verify create returns 201 and persists the normalized location."""

    payload = {
        "name": "TiongCafe",
        "description": "Neighbourhood spot for manual brew service.",
        "logo_url": "https://example.com/logos/tiong-bahru-test.png",
        "location": "  Tiong Bahru  ",
    }

    response = api_client.post("/cafes", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "TiongCafe"
    assert body["description"] == "Neighbourhood spot for manual brew service."
    assert body["logo_url"] == "https://example.com/logos/tiong-bahru-test.png"
    assert body["location"] == "Tiong Bahru"

    with migrated_engine.begin() as connection:
        stored = connection.execute(
            text(
                """
                SELECT name, description, logo_url, location, location_normalized
                FROM cafes
                WHERE id = :id
                """
            ),
            {"id": body["id"]},
        ).mappings().one()

    assert dict(stored) == {
        "name": "TiongCafe",
        "description": "Neighbourhood spot for manual brew service.",
        "logo_url": "https://example.com/logos/tiong-bahru-test.png",
        "location": "Tiong Bahru",
        "location_normalized": "tiong bahru",
    }


def test_post_cafes_rejects_blank_required_fields(api_client) -> None:
    """Verify blank trimmed values fail request validation."""

    response = api_client.post(
        "/cafes",
        json={
            "name": "   ",
            "description": "Valid description",
            "logo_url": None,
            "location": "Bugis",
        },
    )

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


def test_post_cafes_accepts_image_data_url(api_client) -> None:
    """Verify create accepts a persisted image data URL."""

    response = api_client.post(
        "/cafes",
        json={
            "name": "LogoCafe",
            "description": "Compact logo test cafe.",
            "logo_url": "data:image/png;base64,ZmFrZQ==",
            "location": "Bugis",
        },
    )

    assert response.status_code == 201
    assert response.json()["logo_url"] == "data:image/png;base64,ZmFrZQ=="


def test_post_cafes_rejects_invalid_lengths_and_logo_value(api_client) -> None:
    """Verify create enforces the assignment's name/description rules and logo format."""

    response = api_client.post(
        "/cafes",
        json={
            "name": "Short",
            "description": "x" * 257,
            "logo_url": "ftp://example.com/logo.png",
            "location": "Bugis",
        },
    )

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


def test_put_cafes_updates_fields_and_returns_saved_resource(api_client, migrated_engine, monkeypatch) -> None:
    """Verify updates replace all editable fields and recompute normalized location."""

    _seed_test_database(monkeypatch, migrated_engine)
    with migrated_engine.begin() as connection:
        cafe_id = connection.execute(
            text("SELECT id FROM cafes WHERE name = 'Bugis Brew House'")
        ).scalar_one()

    response = api_client.put(
        f"/cafes/{cafe_id}",
        json={
            "name": "BugisUp",
            "description": "Refreshed concept with extended seating.",
            "logo_url": "https://example.com/logos/bugis-revamp.png",
            "location": "  Marina Bay  ",
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": str(cafe_id),
        "name": "BugisUp",
        "description": "Refreshed concept with extended seating.",
        "logo_url": "https://example.com/logos/bugis-revamp.png",
        "location": "Marina Bay",
    }

    with migrated_engine.begin() as connection:
        stored = connection.execute(
            text("SELECT name, description, logo_url, location, location_normalized FROM cafes WHERE id = :id"),
            {"id": cafe_id},
        ).mappings().one()

    assert dict(stored) == {
        "name": "BugisUp",
        "description": "Refreshed concept with extended seating.",
        "logo_url": "https://example.com/logos/bugis-revamp.png",
        "location": "Marina Bay",
        "location_normalized": "marina bay",
    }


def test_put_cafes_returns_not_found_for_unknown_uuid(api_client) -> None:
    """Verify updating a missing cafe returns the shared not-found envelope."""

    response = api_client.put(
        f"/cafes/{uuid4()}",
        json={
            "name": "Missing1",
            "description": "Should not exist.",
            "logo_url": None,
            "location": "Bugis",
        },
    )

    assert response.status_code == 404
    assert response.json() == {
        "code": "RESOURCE_NOT_FOUND",
        "message": "Cafe not found.",
        "details": None,
    }


def test_delete_cafes_returns_no_content_and_removes_cafe(api_client, migrated_engine, monkeypatch) -> None:
    """Verify delete removes the cafe row itself."""

    _seed_test_database(monkeypatch, migrated_engine)
    with migrated_engine.begin() as connection:
        cafe_id = connection.execute(
            text("SELECT id FROM cafes WHERE name = 'Bugis Brew House'")
        ).scalar_one()

    response = api_client.delete(f"/cafes/{cafe_id}")

    assert response.status_code == 204
    assert response.content == b""

    with migrated_engine.begin() as connection:
        remaining = connection.execute(
            text("SELECT COUNT(*) FROM cafes WHERE id = :id"),
            {"id": cafe_id},
        ).scalar_one()

    assert remaining == 0


def test_delete_cafes_removes_currently_assigned_employees_and_assignments(api_client, migrated_engine, monkeypatch) -> None:
    """Verify destructive delete removes active employees and assignment rows tied to the cafe."""

    _seed_test_database(monkeypatch, migrated_engine)
    with migrated_engine.begin() as connection:
        cafe_id = connection.execute(
            text("SELECT id FROM cafes WHERE name = 'Bugis Brew House'")
        ).scalar_one()
        employee_id = connection.execute(
            text(
                """
                SELECT employee_id
                FROM employee_assignments
                WHERE cafe_id = :cafe_id AND end_date IS NULL
                """
            ),
            {"cafe_id": cafe_id},
        ).scalar_one()

    response = api_client.delete(f"/cafes/{cafe_id}")

    assert response.status_code == 204

    with migrated_engine.begin() as connection:
        employee_count = connection.execute(
            text("SELECT COUNT(*) FROM employees WHERE id = :employee_id"),
            {"employee_id": employee_id},
        ).scalar_one()
        assignment_count = connection.execute(
            text("SELECT COUNT(*) FROM employee_assignments WHERE cafe_id = :cafe_id"),
            {"cafe_id": cafe_id},
        ).scalar_one()

    assert employee_count == 0
    assert assignment_count == 0


def test_delete_cafes_preserves_unrelated_employees_and_cafes(api_client, migrated_engine, monkeypatch) -> None:
    """Verify destructive delete does not remove unrelated resources."""

    _seed_test_database(monkeypatch, migrated_engine)
    with migrated_engine.begin() as connection:
        cafe_id = connection.execute(
            text("SELECT id FROM cafes WHERE name = 'Bugis Brew House'")
        ).scalar_one()
        unrelated_cafe_id = connection.execute(
            text("SELECT id FROM cafes WHERE name = 'Orchard Glasshouse'")
        ).scalar_one()
        unrelated_employee_id = connection.execute(
            text("SELECT id FROM employees WHERE email_address = 'cheryl.ng@example.com'")
        ).scalar_one()

    response = api_client.delete(f"/cafes/{cafe_id}")

    assert response.status_code == 204

    with migrated_engine.begin() as connection:
        remaining_cafe = connection.execute(
            text("SELECT COUNT(*) FROM cafes WHERE id = :id"),
            {"id": unrelated_cafe_id},
        ).scalar_one()
        remaining_employee = connection.execute(
            text("SELECT COUNT(*) FROM employees WHERE id = :id"),
            {"id": unrelated_employee_id},
        ).scalar_one()

    assert remaining_cafe == 1
    assert remaining_employee == 1


def test_delete_cafes_returns_not_found_for_unknown_uuid(api_client) -> None:
    """Verify deleting a missing cafe returns the shared not-found envelope."""

    response = api_client.delete(f"/cafes/{uuid4()}")

    assert response.status_code == 404
    assert response.json() == {
        "code": "RESOURCE_NOT_FOUND",
        "message": "Cafe not found.",
        "details": None,
    }
