"""Integration tests for Increment 10 Redis cache behavior."""

from __future__ import annotations

from collections import defaultdict

from sqlalchemy import text

from app.core.cache import RedisCacheClient, get_cache_client
from app.main import app
from scripts.seed import main as seed_main


class MemoryCacheClient:
    """In-memory cache client used to verify cache-aside behavior in integration tests."""

    enabled = True

    def __init__(self) -> None:
        self.store: dict[str, object] = {}
        self.list_versions: defaultdict[str, int] = defaultdict(lambda: 1)
        self.detail_versions: defaultdict[tuple[str, str], int] = defaultdict(lambda: 1)

    def get_json(self, key: str):
        return self.store.get(key)

    def set_json(self, key: str, payload) -> None:
        self.store[key] = payload

    def get_list_version(self, namespace: str) -> int:
        return self.list_versions[namespace]

    def bump_list_version(self, namespace: str) -> int:
        self.list_versions[namespace] += 1
        return self.list_versions[namespace]

    def get_detail_version(self, namespace: str, identifier: str) -> int:
        return self.detail_versions[(namespace, identifier)]

    def bump_detail_version(self, namespace: str, identifier: str) -> int:
        key = (namespace, identifier)
        self.detail_versions[key] += 1
        return self.detail_versions[key]


class FailingRedis:
    """Redis stub that raises for every operation to exercise fail-open paths."""

    def get(self, key: str):
        raise RuntimeError("redis unavailable")

    def set(self, key: str, value: str, nx: bool = False):
        raise RuntimeError("redis unavailable")

    def setex(self, key: str, ttl: int, value: str):
        raise RuntimeError("redis unavailable")

    def incr(self, key: str):
        raise RuntimeError("redis unavailable")


def _seed_test_database(monkeypatch, migrated_engine) -> None:
    """Load the demo dataset into the migrated PostgreSQL integration database."""

    monkeypatch.setenv("DATABASE_URL", str(migrated_engine.url))
    seed_main()


def test_get_cafes_uses_cached_payload_on_repeat_read(api_client, migrated_engine, monkeypatch) -> None:
    """Verify repeat cafe reads are served from the cache after the first miss."""

    _seed_test_database(monkeypatch, migrated_engine)
    cache = MemoryCacheClient()
    app.dependency_overrides[get_cache_client] = lambda: cache

    first_response = api_client.get("/cafes")
    assert first_response.status_code == 200
    assert "cafes:list:v1:location:all" in cache.store

    import app.cafes.query_service as cafes_query_service

    monkeypatch.setattr(cafes_query_service, "fetch_cafe_list", lambda *_args, **_kwargs: (_ for _ in ()).throw(
        AssertionError("should not hit the database on cache hit")
    ))

    second_response = api_client.get("/cafes")

    assert second_response.status_code == 200
    assert second_response.json() == first_response.json()


def test_get_employee_detail_uses_cached_payload_on_repeat_read(api_client, migrated_engine, monkeypatch) -> None:
    """Verify repeat employee detail reads are served from the cache after the first miss."""

    _seed_test_database(monkeypatch, migrated_engine)
    cache = MemoryCacheClient()
    app.dependency_overrides[get_cache_client] = lambda: cache

    with migrated_engine.begin() as connection:
        employee_id = connection.execute(
            text("SELECT id FROM employees WHERE email_address = 'alicia.tan@example.com'")
        ).scalar_one()

    first_response = api_client.get(f"/employees/{employee_id}")
    assert first_response.status_code == 200
    assert f"employees:detail:{employee_id}:v1" in cache.store

    import app.employees.query_service as employees_query_service

    monkeypatch.setattr(
        employees_query_service,
        "fetch_employee_detail",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(AssertionError("should not hit the database on cache hit")),
    )

    second_response = api_client.get(f"/employees/{employee_id}")

    assert second_response.status_code == 200
    assert second_response.json() == first_response.json()


def test_filtered_cafe_lists_use_distinct_cache_keys(api_client, migrated_engine, monkeypatch) -> None:
    """Verify normalized cafe list filters generate separate cache entries."""

    _seed_test_database(monkeypatch, migrated_engine)
    cache = MemoryCacheClient()
    app.dependency_overrides[get_cache_client] = lambda: cache

    bugis_response = api_client.get("/cafes", params={"location": "  bugis  "})
    orchard_response = api_client.get("/cafes", params={"location": "Orchard"})

    assert bugis_response.status_code == 200
    assert orchard_response.status_code == 200
    assert "cafes:list:v1:location:bugis" in cache.store
    assert "cafes:list:v1:location:orchard" in cache.store


def test_cafe_update_bumps_cafe_and_employee_cache_versions(api_client, migrated_engine, monkeypatch) -> None:
    """Verify cafe updates invalidate related cafe detail and employee-facing cache views."""

    _seed_test_database(monkeypatch, migrated_engine)
    cache = MemoryCacheClient()
    app.dependency_overrides[get_cache_client] = lambda: cache

    with migrated_engine.begin() as connection:
        cafe_id = connection.execute(text("SELECT id FROM cafes WHERE name = 'Bugis Brew House'")).scalar_one()
        employee_id = connection.execute(
            text("SELECT id FROM employees WHERE email_address = 'alicia.tan@example.com'")
        ).scalar_one()

    api_client.get(f"/cafes/{cafe_id}")
    api_client.get("/employees")
    api_client.get(f"/employees/{employee_id}")

    response = api_client.put(
        f"/cafes/{cafe_id}",
        json={
            "name": "Bugis Brew House Renamed",
            "description": "Compact commuter stop with brisk takeaway service.",
            "logo_url": None,
            "location": "Bugis",
        },
    )

    assert response.status_code == 200
    assert cache.list_versions["cafes"] == 2
    assert cache.detail_versions[("cafes", str(cafe_id))] == 2
    assert cache.list_versions["employees"] == 2
    assert cache.detail_versions[("employees", employee_id)] == 2

    employees_response = api_client.get(f"/employees/{employee_id}")
    assert employees_response.status_code == 200
    assert employees_response.json()["cafe"] == "Bugis Brew House Renamed"


def test_employee_reassignment_bumps_employee_and_cafe_list_versions(api_client, migrated_engine, monkeypatch) -> None:
    """Verify assignment changes invalidate employee and cafe read caches."""

    _seed_test_database(monkeypatch, migrated_engine)
    cache = MemoryCacheClient()
    app.dependency_overrides[get_cache_client] = lambda: cache

    with migrated_engine.begin() as connection:
        employee_id = connection.execute(
            text("SELECT id FROM employees WHERE email_address = 'alicia.tan@example.com'")
        ).scalar_one()
        new_cafe_id = connection.execute(
            text("SELECT id FROM cafes WHERE name = 'Orchard Glasshouse'")
        ).scalar_one()

    api_client.get("/cafes")
    api_client.get("/employees")
    api_client.get(f"/employees/{employee_id}")

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
    assert cache.list_versions["cafes"] == 2
    assert cache.list_versions["employees"] == 2
    assert cache.detail_versions[("employees", employee_id)] == 2

    detail_response = api_client.get(f"/employees/{employee_id}")
    assert detail_response.status_code == 200
    assert detail_response.json()["cafe_id"] == str(new_cafe_id)


def test_reads_and_writes_fail_open_when_redis_operations_fail(api_client, migrated_engine, monkeypatch) -> None:
    """Verify Redis failures do not block reads or writes."""

    _seed_test_database(monkeypatch, migrated_engine)
    failing_cache = RedisCacheClient(FailingRedis(), ttl_seconds=60)
    app.dependency_overrides[get_cache_client] = lambda: failing_cache

    with migrated_engine.begin() as connection:
        cafe_id = connection.execute(text("SELECT id FROM cafes WHERE name = 'Bugis Brew House'")).scalar_one()

    read_response = api_client.get("/cafes")
    write_response = api_client.post(
        "/employees",
        json={
            "name": "Cache Failure Tester",
            "email_address": "cache.failure@example.com",
            "phone_number": "81237777",
            "gender": "Female",
            "cafe_id": str(cafe_id),
        },
    )

    assert read_response.status_code == 200
    assert write_response.status_code == 201
