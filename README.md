# GIC-Take-Home-Assignment

Current iteration: Increment 4, seed data.

## What Exists

- `backend/` Python project scaffold
- FastAPI app entrypoint
- typed config loading
- SQLAlchemy engine/session scaffolding
- SQLAlchemy persistence models for cafes, employees, and employee assignments
- Alembic migration setup with the initial schema migration
- Seed script for demo and test-supporting data
- shared exception and error-handler setup
- shared enums, validators, and utility helpers
- `GET /health`
- backend integration and unit tests for shared primitives
- PostgreSQL-backed schema verification tests for the persistence layer
- PostgreSQL-backed seed integration tests

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
  scripts/
    seed.py
  alembic/
    env.py
    versions/
      20260327_000001_create_cafes_employees_and_assignments.py
  alembic.ini
  tests/
    integration/
      test_health.py
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

Increment 4 uses PostgreSQL for migrations, schema tests, and the demo seed script. Runtime settings are loaded from `backend/.env`.

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

Seed verification tests against PostgreSQL:

```bash
. .venv/bin/activate
cd backend
pytest tests/integration/test_seed.py
```

Run the full backend suite:

```bash
. .venv/bin/activate
cd backend
pytest
```

## Current Increment

Increment 4 adds deterministic demo seed data:

- `backend/scripts/seed.py` for idempotent data loading
- 24 cafes, 24 employees, and 26 assignment history rows
- generated IDs on insert-only paths with stable rerun matching
- PostgreSQL-backed seed integration tests

## Changes Since Previous Increment

- added `backend/scripts/seed.py` for demo dataset loading
- added seed integration coverage for row counts, idempotency, and history shape
- updated the README with migration plus seed commands
- kept the project backend-only with no feature routers or frontend work

## Notes

- PostgreSQL is required for migrations, schema-sensitive integration tests, and the seed script.
- The app bootstrap remains minimal; no cafe or employee API endpoints exist yet.
- The shared error envelope and helper layer from earlier increments remain unchanged.
- Future work will continue backend-first before any frontend implementation begins.
