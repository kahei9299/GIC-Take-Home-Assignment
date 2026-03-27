# GIC-Take-Home-Assignment

Current iteration: Increment 2, shared backend primitives.

## What Exists

- `backend/` Python project scaffold
- FastAPI app entrypoint
- typed config loading
- SQLAlchemy engine/session scaffolding
- shared exception and error-handler setup
- shared enums, validators, and utility helpers
- `GET /health`
- backend integration and unit tests for shared primitives

## What Does Not Exist Yet

- cafe and employee modules
- database models
- Alembic migrations
- seed data
- cafe and employee feature modules
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
    shared/
      enums.py
      utils.py
      validators.py
    main.py
  tests/
    integration/
      test_health.py
    unit/
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
```

## Run The Backend

```bash
cd backend
uvicorn app.main:app --reload
```

App endpoint:

- Health: `http://127.0.0.1:8000/health`

Expected response:

```json
{"status":"ok"}
```

## Run Tests

```bash
. .venv/bin/activate
cd backend
pytest tests/integration/test_health.py
pytest tests/unit
```

## Current Increment

Increment 2 adds shared backend primitives only:

- `Gender` enum
- reusable employee ID, phone, email, and location helpers
- employee ID generator
- `days_worked` calculation utility
- unit tests covering those shared rules

## Changes Since Previous Increment

- added `backend/app/shared/` package
- added validator and utility unit tests
- kept the Increment 1 backend foundation unchanged
- did not add any feature modules, models, or migrations yet

## Notes

- The database layer is scaffolded but unused in this increment.
- No live database is required yet.
- The shared error envelope and shared helper layer are now established for later increments.
- Future work will continue backend-first before any frontend implementation begins.
