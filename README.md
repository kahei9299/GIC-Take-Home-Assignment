# GIC-Take-Home-Assignment

Current iteration: Increment 10, Redis read cache with fail-open fallback.

## What Exists

- `backend/` Python project scaffold
- FastAPI app entrypoint
- typed config loading
- SQLAlchemy engine/session scaffolding
- SQLAlchemy persistence models for cafes, employees, and employee assignments
- Alembic migration setup with the initial schema migration and Increment 9 read-path index migration
- Seed script for demo and test-supporting data
- Cafe read-side API modules for list and detail queries
- Employee read-side API modules for list and detail queries
- Cafe command-side API module for create, update, and delete flows
- Employee command-side API module for create, update, and delete flows
- Centralized JSON logging with request IDs
- shared exception and error-handler setup with stable `400`/`404`/`409`/`422`/`500` envelope semantics
- shared enums, validators, and utility helpers
- targeted database indexes for `cafes(name)`, `employees(name)`, active `employee_assignments(cafe_id)`, and normalized cafe location filtering
- optional Redis-backed cache client with fail-open behavior
- cache-aside reads for cafe and employee list/detail endpoints
- version-based cache invalidation after successful cafe and employee writes
- `GET /health`
- `GET /cafes`
- `GET /cafes/{id}`
- `GET /employees`
- `GET /employees/{id}`
- `POST /cafes`
- `PUT /cafes/{id}`
- `DELETE /cafes/{id}`
- `POST /employees`
- `PUT /employees/{id}`
- `DELETE /employees/{id}`
- backend integration and unit tests for shared primitives
- PostgreSQL-backed schema verification tests for the persistence layer
- PostgreSQL-backed seed integration tests
- PostgreSQL-backed cafe read integration tests
- PostgreSQL-backed cafe write integration tests
- PostgreSQL-backed employee read integration tests
- PostgreSQL-backed employee write integration tests
- PostgreSQL-backed concurrent-write verification for uniqueness and one-active-assignment constraints
- PostgreSQL-backed cache integration tests for cache hits, invalidation, and fail-open Redis fallback
- unit tests for shared error envelope handling
- unit tests for cache disabled/fail-open behavior

## What Does Not Exist Yet

- frontend app
- resilience/readiness/liveness behavior
- Docker setup
- deployment config

## Backend Structure

```text
backend/
  app/
    core/
      cache.py
      config.py
      database.py
      exceptions.py
      error_handlers.py
      logging.py
      request_context.py
    cafes/
      command_service.py
      query_service.py
      repository.py
      router.py
      schemas.py
    employees/
      command_service.py
      query_service.py
      repository.py
      router.py
      schemas.py
    models/
      cafe.py
      employee.py
      employee_assignment.py
    shared/
      enums.py
      utils.py
      validators.py
    main.py
  scripts/
    seed.py
  alembic/
    env.py
    versions/
      20260327_000001_create_cafes_employees_and_assignments.py
      20260329_000002_add_increment_9_indexes.py
  alembic.ini
  tests/
    integration/
      test_cache.py
      test_concurrency.py
      test_cafe_writes.py
      test_cafes.py
      test_employees.py
      test_employee_writes.py
      test_health.py
      test_logging.py
      test_seed.py
      test_schema.py
    unit/
      test_cache.py
      test_employee_command_service.py
      test_error_handlers.py
      test_metadata.py
      test_utils.py
      test_validators.py
  pyproject.toml
```

## Setup

From the repository root:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -e './backend[dev]'
cp backend/.env.example backend/.env
```

## Database Prerequisites

Increment 10 uses PostgreSQL for migrations, schema tests, the demo seed script, read/write integration tests, cache integration tests, and concurrent-write verification. Runtime settings are loaded from `backend/.env`.

- local backend DB: set in `backend/.env` as `DATABASE_URL`
- schema test DB: set `TEST_DATABASE_URL` to a separate PostgreSQL database you can safely migrate and downgrade during tests

Example:

```bash
cp backend/.env.example backend/.env
createdb -h localhost -p 5432 -U postgres gic_take_home
createdb -h localhost -p 5432 -U postgres gic_take_home_test
export TEST_DATABASE_URL='postgresql+psycopg://postgres:postgres@localhost:5432/gic_take_home_test'
```

## Run The Backend

```bash
cd backend
uvicorn app.main:app --reload
```

The backend reads:

- `APP_NAME` from `backend/.env`
- `DATABASE_URL` from `backend/.env`
- `FRONTEND_URL` from `backend/.env`
- `REDIS_URL` from `backend/.env` when cache is enabled
- `CACHE_TTL_SECONDS` from `backend/.env` when cache is enabled
- `LOG_LEVEL` from `backend/.env`
- `LOG_FORMAT` from `backend/.env`
- `TEST_DATABASE_URL` from your shell when running PostgreSQL-backed integration tests

## Backend Contract

The API routes and success payloads are unchanged in Increment 10. Error responses use a stable JSON envelope:

```json
{
  "code": "CONFLICT",
  "message": "Employee email address or phone number already exists.",
  "details": null
}
```

Current status and code mapping:

- `400` -> `INVALID_OPERATION` for handled domain-semantic failures
- `404` -> `RESOURCE_NOT_FOUND`
- `409` -> `CONFLICT`
- `422` -> `VALIDATION_ERROR`
- `500` -> `INTERNAL_SERVER_ERROR`
- `503` -> reserved for later dependency-unavailable handling; not used yet in the delivered backend

## Redis Cache

Increment 10 adds Redis only as a read-performance layer.

- PostgreSQL remains the source of truth for all writes and constraints
- the backend still works when `REDIS_URL` is unset
- if Redis operations fail, read requests bypass cache and load from PostgreSQL
- write requests still commit even if cache version bumps fail
- cache only stores API-ready JSON payloads for:
  - `GET /cafes`
  - `GET /cafes/{id}`
  - `GET /employees`
  - `GET /employees/{id}`
- `404` responses are not cached
- default cache TTL is controlled by `CACHE_TTL_SECONDS`

Example local Redis settings:

```bash
REDIS_URL=redis://localhost:6379/0
CACHE_TTL_SECONDS=60
```

## Run Migrations

From the repository root:

```bash
. .venv/bin/activate
cd backend
alembic upgrade head
```

To reset the schema back to an empty state:

```bash
alembic downgrade base
```

## Seed Demo Data

From the repository root:

```bash
. .venv/bin/activate
cd backend
python scripts/seed.py
```

The seed script:

- inserts 24 cafes, 24 employees, and 26 assignment rows on a fresh database
- is idempotent and safe to rerun
- preserves generated cafe, employee, and assignment identifiers for existing seeded rows

## Logging

The backend includes centralized application logging with safe defaults.

- default format: JSON
- default level: `INFO`
- each HTTP response includes `X-Request-ID`
- request logs include method, path, status code, duration, and request ID
- handled application errors and schema-validation failures log structured metadata without request bodies
- cache logs include hit, miss, set, bypass, failure, and version bump events
- request bodies, secrets, DB URLs, and auth headers are not logged

## Persistence Notes

PostgreSQL remains the source of truth for all business rules, constraints, and concurrent write correctness.

Current read-path indexes:

- `ix_cafes_location_normalized` for exact normalized location filtering
- `ix_cafes_name` for alphabetical cafe ordering support
- `ix_employees_name` for alphabetical employee ordering support
- `ix_employee_assignments_active_cafe_id` for active employee-by-cafe reads and destructive cafe delete lookups
- `uq_employee_assignments_one_active_per_employee` partial unique index to enforce the one-active-assignment rule

Current cache versioning:

- cafes list keys vary by normalized `location`
- employees list keys vary by `cafe_id`
- cafe detail keys are versioned per cafe ID
- employee detail keys are versioned per employee ID

App endpoint:

- Health: `http://127.0.0.1:8000/health`
- Cafes list: `http://127.0.0.1:8000/cafes`
- Cafe detail: `http://127.0.0.1:8000/cafes/<uuid>`
- Create cafe: `POST http://127.0.0.1:8000/cafes`
- Update cafe: `PUT http://127.0.0.1:8000/cafes/<uuid>`
- Delete cafe: `DELETE http://127.0.0.1:8000/cafes/<uuid>`
- Employees list: `http://127.0.0.1:8000/employees`
- Employees by cafe: `http://127.0.0.1:8000/employees?cafe_id=<uuid>`
- Employee detail: `http://127.0.0.1:8000/employees/<employee-id>`
- Create employee: `POST http://127.0.0.1:8000/employees`
- Update employee: `PUT http://127.0.0.1:8000/employees/<employee-id>`
- Delete employee: `DELETE http://127.0.0.1:8000/employees/<employee-id>`

Expected response:

```json
{"status":"ok"}
```

## Run Tests

Unit tests and health integration test:

```bash
. .venv/bin/activate
cd backend
pytest tests/integration/test_health.py
pytest tests/unit
```

Schema verification tests against PostgreSQL:

```bash
. .venv/bin/activate
cd backend
pytest tests/integration/test_schema.py
```

Concurrent-write verification against PostgreSQL:

```bash
. .venv/bin/activate
cd backend
pytest tests/integration/test_concurrency.py
```

Cache integration tests against PostgreSQL:

```bash
. .venv/bin/activate
cd backend
pytest tests/integration/test_cache.py
```

Seed verification tests against PostgreSQL:

```bash
. .venv/bin/activate
cd backend
pytest tests/integration/test_seed.py
```

Cafe read integration tests against PostgreSQL:

```bash
. .venv/bin/activate
cd backend
pytest tests/integration/test_cafes.py
```

Cafe write integration tests against PostgreSQL:

```bash
. .venv/bin/activate
cd backend
pytest tests/integration/test_cafe_writes.py
```

Employee read integration tests against PostgreSQL:

```bash
. .venv/bin/activate
cd backend
pytest tests/integration/test_employees.py
```

Employee write integration tests against PostgreSQL:

```bash
. .venv/bin/activate
cd backend
pytest tests/integration/test_employee_writes.py
```

Logging and request ID integration tests:

```bash
. .venv/bin/activate
cd backend
pytest tests/integration/test_logging.py
```

Employee command service unit tests:

```bash
. .venv/bin/activate
cd backend
pytest tests/unit/test_employee_command_service.py
```

Shared error-handler unit tests:

```bash
. .venv/bin/activate
cd backend
pytest tests/unit/test_error_handlers.py
```

Cache unit tests:

```bash
. .venv/bin/activate
cd backend
pytest tests/unit/test_cache.py
```

Run the full backend suite:

```bash
. .venv/bin/activate
cd backend
pytest
```

## Current Increment

Increment 10 adds Redis read caching on top of the hardened backend:

- cache-aside behavior for cafe and employee list/detail endpoints
- Redis configuration with optional fail-open behavior
- version-based post-commit invalidation tied to cafe and employee write semantics
- cache tests for read hits, filtered keys, invalidation, and Redis failure fallback
- README and config updates for local Redis usage

## Changes Since Previous Increment

- added a cache infrastructure layer and request context propagation for structured cache logs
- wired cache-aside reads into the cafe and employee query services without changing API routes or payloads
- added post-commit cache invalidation to cafe and employee write paths
- added cache-focused integration and unit tests
- updated environment examples, package dependencies, and the README for Redis support

## Notes

- PostgreSQL is required for migrations, schema-sensitive integration tests, the seed script, and the cafe and employee integration tests.
- `TEST_DATABASE_URL` must point to a disposable PostgreSQL database for integration and concurrency tests; those suites skip when it is not set.
- Cafe deletion is intentionally destructive: it removes the cafe and employees currently assigned to it.
- Employee creation now requires an initial cafe assignment, while updates may still unassign or reassign.
- The shared error envelope shape remains intact, while domain `400` responses are now reserved for `INVALID_OPERATION` rather than overloading `VALIDATION_ERROR`.
- Redis is a performance layer only; it is not part of the domain model or write correctness path.
- readiness/liveness behavior, frontend work, Docker, and deployment configuration are not implemented yet.
