# GIC-Take-Home-Assignment

Current iteration: Increment 5, cafe read slice with production-standard logging.

## What Exists

- `backend/` Python project scaffold
- FastAPI app entrypoint
- typed config loading
- SQLAlchemy engine/session scaffolding
- SQLAlchemy persistence models for cafes, employees, and employee assignments
- Alembic migration setup with the initial schema migration
- Seed script for demo and test-supporting data
- Cafe read-side API modules for list and detail queries
- Centralized JSON logging with request IDs
- shared exception and error-handler setup
- shared enums, validators, and utility helpers
- `GET /health`
- `GET /cafes`
- `GET /cafes/{id}`
- backend integration and unit tests for shared primitives
- PostgreSQL-backed schema verification tests for the persistence layer
- PostgreSQL-backed seed integration tests
- PostgreSQL-backed cafe read integration tests

## What Does Not Exist Yet

- cafe write APIs
- employee API modules
- repository and service layers for employee features
- frontend app
- Docker setup
- deployment config

## Backend Structure

```text
backend/
  app/
    core/
      config.py
      database.py
      exceptions.py
      error_handlers.py
      logging.py
    cafes/
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
  alembic.ini
  tests/
    integration/
      test_cafes.py
      test_health.py
      test_logging.py
      test_seed.py
      test_schema.py
    unit/
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

Increment 5 uses PostgreSQL for migrations, schema tests, the demo seed script, and cafe read integration tests. Runtime settings are loaded from `backend/.env`.

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
- `LOG_LEVEL` from `backend/.env`
- `LOG_FORMAT` from `backend/.env`
- `TEST_DATABASE_URL` from your shell when running PostgreSQL schema tests

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

Increment 5 adds centralized application logging with safe defaults.

- default format: JSON
- default level: `INFO`
- each HTTP response includes `X-Request-ID`
- request logs include method, path, status code, duration, and request ID
- request bodies, secrets, DB URLs, and auth headers are not logged

App endpoint:

- Health: `http://127.0.0.1:8000/health`
- Cafes list: `http://127.0.0.1:8000/cafes`
- Cafe detail: `http://127.0.0.1:8000/cafes/<uuid>`

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

Logging and request ID integration tests:

```bash
. .venv/bin/activate
cd backend
pytest tests/integration/test_logging.py
```

Run the full backend suite:

```bash
. .venv/bin/activate
cd backend
pytest
```

## Current Increment

Increment 5 adds the cafe read API slice and production-standard request logging:

- `GET /cafes` with optional normalized location filtering
- `GET /cafes/{id}` for edit-page prefill
- read-side cafe package with repository, query service, router, and schemas
- JSON request logs with `X-Request-ID` propagation
- PostgreSQL-backed cafe integration tests and logging integration tests

## Changes Since Previous Increment

- added `backend/app/cafes/` for read-side cafe queries and response schemas
- wired the cafe router into the FastAPI app
- added centralized logging setup and request logging middleware
- added integration coverage for cafe list sorting, filtering, and detail responses
- added integration coverage for request ID propagation and structured request logging
- updated the README with the new endpoints and test commands

## Notes

- PostgreSQL is required for migrations, schema-sensitive integration tests, the seed script, and cafe read integration tests.
- Employee and write-side APIs still do not exist yet.
- The shared error envelope remains intact, with request IDs now returned in response headers.
- Future work will continue backend-first before any frontend implementation begins.
