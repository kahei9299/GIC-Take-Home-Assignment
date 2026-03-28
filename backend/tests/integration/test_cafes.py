"""Integration tests for the Increment 5 cafe read endpoints."""

from __future__ import annotations

from uuid import uuid4

from sqlalchemy import text

from scripts.seed import main as seed_main


def _seed_test_database(monkeypatch, migrated_engine) -> None:
    """Load the demo dataset into the migrated PostgreSQL integration database."""

    monkeypatch.setenv("DATABASE_URL", str(migrated_engine.url))
    seed_main()


def test_get_cafes_returns_sorted_rows_with_employee_counts(api_client, migrated_engine, monkeypatch) -> None:
    """Verify the list endpoint sorts by active employee count then cafe name."""

    _seed_test_database(monkeypatch, migrated_engine)

    response = api_client.get("/cafes")

    assert response.status_code == 200
    rows = response.json()
    assert rows
    assert rows[0]["employees"] >= rows[1]["employees"]
    assert rows[0]["name"] == "Bugis Brew House"
    assert rows[-1]["employees"] == 0
    assert rows[-1]["name"] == "Tampines Park Coffee"


def test_get_cafes_filters_by_normalized_location(api_client, migrated_engine, monkeypatch) -> None:
    """Verify location filters normalize case and surrounding whitespace."""

    _seed_test_database(monkeypatch, migrated_engine)

    plain_response = api_client.get("/cafes", params={"location": "Bugis"})
    normalized_response = api_client.get("/cafes", params={"location": "  bugis  "})

    assert plain_response.status_code == 200
    assert normalized_response.status_code == 200
    assert plain_response.json() == normalized_response.json()
    assert len(plain_response.json()) == 4
    assert {row["location"] for row in plain_response.json()} == {"Bugis"}


def test_get_cafes_returns_empty_list_for_unknown_location(api_client, migrated_engine, monkeypatch) -> None:
    """Verify an unmatched location filter returns an empty list."""

    _seed_test_database(monkeypatch, migrated_engine)

    response = api_client.get("/cafes", params={"location": "Changi"})

    assert response.status_code == 200
    assert response.json() == []


def test_get_cafes_includes_cafes_with_zero_active_employees(api_client, migrated_engine, monkeypatch) -> None:
    """Verify list rows include cafes whose assignments are only historical or missing."""

    _seed_test_database(monkeypatch, migrated_engine)

    response = api_client.get("/cafes")

    assert response.status_code == 200
    zero_employee_rows = [row for row in response.json() if row["employees"] == 0]
    assert zero_employee_rows
    assert {row["name"] for row in zero_employee_rows} >= {
        "Bugis Lantern Coffee",
        "Raffles Station Espresso",
        "Tampines Park Coffee",
    }


def test_get_cafe_detail_returns_editable_fields_only(api_client, migrated_engine, monkeypatch) -> None:
    """Verify the detail endpoint returns only edit-prefill fields."""

    _seed_test_database(monkeypatch, migrated_engine)
    cafes_response = api_client.get("/cafes", params={"location": "Bugis"})
    cafe_id = cafes_response.json()[0]["id"]

    response = api_client.get(f"/cafes/{cafe_id}")

    assert response.status_code == 200
    assert response.json() == {
        "name": "Bugis Brew House",
        "description": "Compact commuter stop with brisk takeaway service.",
        "logo_url": None,
        "location": "Bugis",
    }


def test_get_cafe_detail_returns_not_found_for_unknown_uuid(api_client) -> None:
    """Verify a missing cafe ID returns the shared not-found envelope."""

    response = api_client.get(f"/cafes/{uuid4()}")

    assert response.status_code == 404
    assert response.json() == {
        "code": "RESOURCE_NOT_FOUND",
        "message": "Cafe not found.",
        "details": None,
    }


def test_get_cafe_detail_does_not_include_list_only_fields(api_client, migrated_engine, monkeypatch) -> None:
    """Verify the detail payload excludes id and employees even when active assignments exist."""

    _seed_test_database(monkeypatch, migrated_engine)
    with migrated_engine.begin() as connection:
        cafe_id = connection.execute(
            text("SELECT id FROM cafes WHERE name = 'Bugis Brew House'")
        ).scalar_one()

    response = api_client.get(f"/cafes/{cafe_id}")

    assert response.status_code == 200
    assert "id" not in response.json()
    assert "employees" not in response.json()
