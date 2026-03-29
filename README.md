# GIC-Take-Home-Assignment

Current iteration: Increment 8, employee write slice with assignment history transitions.

## What Exists

- `backend/` Python project scaffold
- FastAPI app entrypoint
- typed config loading
- SQLAlchemy engine/session scaffolding
- SQLAlchemy persistence models for cafes, employees, and employee assignments
- Alembic migration setup with the initial schema migration
- Seed script for demo and test-supporting data
- Cafe read-side API modules for list and detail queries
- Employee read-side API modules for list and detail queries
- Cafe command-side API module for create, update, and delete flows
- Employee command-side API module for create, update, and delete flows
- Centralized JSON logging with request IDs
- shared exception and error-handler setup
- shared enums, validators, and utility helpers
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

## What Does Not Exist Yet

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
  alembic.ini
  tests/
    integration/
      test_cafe_writes.py
      test_cafes.py
      test_employees.py
      test_employee_writes.py
      test_health.py
      test_logging.py
      test_seed.py
      test_schema.py
    unit/
      test_employee_command_service.py
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

Increment 8 uses PostgreSQL for migrations, schema tests, the demo seed script, and the cafe and employee integration tests. Runtime settings are loaded from `backend/.env`.

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
- `TEST_DATABASE_URL` from your shell when running PostgreSQL-backed integration tests

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
- request bodies, secrets, DB URLs, and auth headers are not logged

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

Run the full backend suite:

```bash
. .venv/bin/activate
cd backend
pytest
```

## Current Increment

Increment 8 adds employee write behavior on top of the existing read APIs:

- `POST /employees` with server-side employee ID generation and required initial `cafe_id`
- `PUT /employees/{id}` with same-cafe update, reassignment, and unassignment transitions
- `DELETE /employees/{id}` to remove one employee and their assignment history
- shared employee write schemas and command service orchestration
- PostgreSQL-backed integration tests and service-level unit tests for assignment transitions and ID generation

## Changes Since Previous Increment

- added employee write schemas and command service in `backend/app/employees/`
- wired create, update, and delete endpoints into the existing employee router
- added integration coverage for employee creation, reassignment, unassignment, delete behavior, and conflict handling
- added unit coverage for employee ID collision retry and assignment transition helpers
- updated the README with the new employee write endpoints and test commands

## Notes

- PostgreSQL is required for migrations, schema-sensitive integration tests, the seed script, and the cafe and employee integration tests.
- Cafe deletion is intentionally destructive: it removes the cafe and employees currently assigned to it.
- Employee creation now requires an initial cafe assignment, while updates may still unassign or reassign.
- The shared error envelope remains intact, with request IDs now returned in response headers.
- Future work will continue backend-first before any frontend implementation begins.
