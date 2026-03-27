# GIC-Take-Home-Assignment

Current iteration: Increment 3, persistence core.

## What Exists

- `backend/` Python project scaffold
- FastAPI app entrypoint
- typed config loading
- SQLAlchemy engine/session scaffolding
- SQLAlchemy persistence models for cafes, employees, and employee assignments
- Alembic migration setup with the initial schema migration
- shared exception and error-handler setup
- shared enums, validators, and utility helpers
- `GET /health`
- backend integration and unit tests for shared primitives
- PostgreSQL-backed schema verification tests for the persistence layer

## What Does Not Exist Yet

- seed data
- cafe and employee API modules
- repository and service layers for cafe and employee features
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
    models/
      cafe.py
      employee.py
      employee_assignment.py
    shared/
      enums.py
      utils.py
      validators.py
    main.py
  alembic/
    env.py
    versions/
      20260327_000001_create_cafes_employees_and_assignments.py
  alembic.ini
  tests/
    integration/
      test_health.py
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

Increment 3 introduces PostgreSQL-backed migrations and schema tests. Runtime settings are loaded from `backend/.env`.

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

- `DATABASE_URL` from `backend/.env`
- `FRONTEND_URL` from `backend/.env`
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

App endpoint:

- Health: `http://127.0.0.1:8000/health`

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

Run the full backend suite:

```bash
. .venv/bin/activate
cd backend
pytest
```

## Current Increment

Increment 3 adds the persistence core:

- SQLAlchemy models for `cafes`, `employees`, and `employee_assignments`
- Alembic configuration and the initial migration
- DB-level uniqueness, foreign-key, date-validity, and one-active-assignment constraints
- metadata alignment and PostgreSQL schema verification tests

## Changes Since Previous Increment

- added `backend/app/models/` for persistence models
- added `backend/alembic/` and `backend/alembic.ini` for migration management
- added the initial migration that creates the persistence schema
- added schema-focused tests alongside the existing shared primitive tests
- kept the project backend-only with no feature routers, seed data, or frontend work

## Notes

- PostgreSQL is now required for migrations and schema-sensitive integration tests.
- The app bootstrap remains minimal; no cafe or employee API endpoints exist yet.
- The shared error envelope and helper layer from earlier increments remain unchanged.
- Future work will continue backend-first before any frontend implementation begins.
