# GIC-Take-Home-Assignment

Current iteration: Increment 1, backend foundation only.

## What Exists

- `backend/` Python project scaffold
- FastAPI app entrypoint
- typed config loading
- SQLAlchemy engine/session scaffolding
- shared exception and error-handler setup
- `GET /health`
- one passing backend integration test

## What Does Not Exist Yet

- cafe and employee modules
- database models
- Alembic migrations
- seed data
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
    main.py
  tests/
    integration/
      test_health.py
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
```

## Notes

- The database layer is scaffolded but unused in this increment.
- No live database is required yet.
- The shared error envelope has been established for later increments.
- Future work will continue backend-first before any frontend implementation begins.
