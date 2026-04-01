# GIC-Take-Home-Assignment

Current iteration: Increment 17, completed cafe frontend slice hardening pass.

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
- bounded PostgreSQL connection, pool, and statement timeout settings
- bounded Redis socket timeout settings and safe retry/backoff for cache/probe operations
- cache-aside reads for cafe and employee list/detail endpoints
- version-based cache invalidation after successful cafe and employee writes
- readiness probe timeout isolation that does not leak into normal pooled request traffic
- FastAPI lifespan-managed startup/shutdown logging and backend resource cleanup
- exact-origin CORS allowlisting via `CORS_ALLOWED_ORIGINS` with temporary `FRONTEND_URL` fallback
- `GET /health`
- `GET /health/ready`
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
- readiness and resilience unit/integration tests for retry, degraded Redis, and narrow dependency `503` behavior
- hosted-runtime unit/integration tests for CORS config, startup/shutdown lifecycle, cache shutdown, and readiness timeout scoping
- unit tests for shared error envelope handling
- unit tests for cache disabled/fail-open behavior
- `frontend/` React + Vite + TypeScript app scaffold
- React Router app shell with a completed cafe slice plus placeholder employee routes
- TanStack Query provider with safe-read retry defaults for backend reads
- Ant Design theme baseline with an AG Grid-backed cafe list page, direct list delete action, and shared cafe form wiring across create/edit routes
- handwritten frontend API client layered on checked-in OpenAPI-generated types
- frontend env examples for local, preview, and production backend targeting
- frontend Vitest + Testing Library + MSW coverage for the completed cafe slice, hosted-style API base URLs, retry states, not-found handling, and dirty-form prompt wiring

## What Does Not Exist Yet

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
      readiness.py
      resilience.py
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
      test_runtime_hardening.py
      test_seed.py
      test_schema.py
    unit/
      test_cache.py
      test_config.py
      test_database.py
      test_employee_command_service.py
      test_error_handlers.py
      test_metadata.py
      test_resilience.py
      test_utils.py
      test_validators.py
  pyproject.toml
```

## Frontend Structure

```text
frontend/
  scripts/
    generate-openapi-types.mjs
  src/
    api/
      client.ts
      contracts.ts
      generated/
        openapi.ts
      http.ts
    app/
      App.tsx
      AppProviders.tsx
      env.ts
      queryClient.ts
      router.tsx
    components/
      feedback/
        QueryState.tsx
      grid/
        defaultGridOptions.ts
        GridFoundationPreview.tsx
        registerGridModules.ts
      layout/
        AppShell.tsx
        PageFrame.tsx
    routes/
      cafes/
        cafeForm.tsx
      employees/
      shared/
    test/
      app.test.tsx
      renderApp.tsx
      server.ts
      setup.ts
  .env.example
  .env.preview.example
  .env.production.example
  index.html
  package.json
  tsconfig.json
  vite.config.ts
```

## Setup

From the repository root:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -e './backend[dev]'
cp backend/.env.example backend/.env
cd frontend
pnpm install
```

## Database Prerequisites

Increment 12 uses PostgreSQL for migrations, schema tests, the demo seed script, read/write integration tests, cache integration tests, readiness checks, and concurrent-write verification. Runtime settings are loaded from `backend/.env`.

- local backend DB: set in `backend/.env` as `DATABASE_URL`
- schema test DB: set `TEST_DATABASE_URL` to a separate PostgreSQL database you can safely migrate and downgrade during tests

Primary Docker-first example:

```bash
cp backend/.env.example backend/.env
docker rm -f gic-postgres-test gic-redis-test 2>/dev/null
docker run -d --name gic-postgres-test \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=cafe_manager \
  -p 55432:5432 \
  postgres:16-alpine
docker run -d --name gic-redis-test -p 6379:6379 redis:7
docker exec -it gic-postgres-test psql -U postgres -d postgres -c "CREATE DATABASE gic_take_home_test;"
```

After copying `backend/.env.example` to `backend/.env`, verify or override these local Docker defaults:

- `DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:55432/cafe_manager`
- `REDIS_URL=redis://localhost:6379/0`

Set the test database URL in your shell before running PostgreSQL-backed integration tests:

```bash
export TEST_DATABASE_URL='postgresql+psycopg://postgres:postgres@localhost:55432/gic_take_home_test'
```

Local PostgreSQL is still supported, but it is no longer the primary documented path. If you use a local server instead of Docker, make sure both `DATABASE_URL` and `TEST_DATABASE_URL` match the actual local role, password, and database names on that machine.

## Run The Backend

```bash
cd backend
uvicorn app.main:app --reload
```

## Run The Frontend

From the repository root:

```bash
cd frontend
cp .env.example .env.local
pnpm dev
```

The frontend expects `VITE_API_BASE_URL` and defaults to these env-file conventions:

- local development: `frontend/.env.local`
- Vercel preview: `frontend/.env.preview.example` -> `VITE_API_BASE_URL=<staging backend URL>`
- Vercel production: `frontend/.env.production.example` -> `VITE_API_BASE_URL=<production backend URL>`

Default local value:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

Increment 17 finalizes the cafe frontend slice while keeping the backend authoritative for cafe filtering, cafe write validation, and delete semantics:

- the cafe list page lives at `/cafes`
- the cafe create page lives at `/cafes/new`
- the cafe edit page lives at `/cafes/:id/edit`
- the location filter is local UI state and is committed explicitly with `Apply`
- the frontend does not apply business filtering locally after the backend responds
- the cafe list page supports direct delete from the actions column without navigating through the edit page
- the create form only performs basic required-field checks before submitting to `POST /cafes`
- the edit form loads cafe detail directly from `GET /cafes/{id}` for prefill and retryable direct navigation
- create and edit share the same frontend cafe field rendering and payload-normalization rules
- create and update submissions trim obvious whitespace, preserve entered values on failure, and return to `/cafes` on success
- successful create, update, and delete flows invalidate the cafe list query so the list refetches with fresh backend data
- the cafe detail query uses `["cafes", "detail", id]` and is invalidated after successful update or delete
- delete confirmation on both the list page and edit page explicitly warns that deleting a cafe also removes employees currently assigned to it
- direct edit loads show a dedicated not-found state when the backend returns `404`
- list-page delete failures render inline above the grid without leaving `/cafes`
- staging and production backend URLs continue to flow through `VITE_API_BASE_URL` without source changes
- dirty-form protection uses browser prompts only for unload and route-leave confirmation
- positive employee counts deep-link to `/employees?cafe_id=<uuid>`

The backend reads:

- `APP_NAME` from `backend/.env`
- `DATABASE_URL` from `backend/.env`
- `CORS_ALLOWED_ORIGINS` from `backend/.env`
- `DATABASE_CONNECT_TIMEOUT_SECONDS` from `backend/.env`
- `DATABASE_POOL_TIMEOUT_SECONDS` from `backend/.env`
- `DATABASE_POOL_RECYCLE_SECONDS` from `backend/.env`
- `DATABASE_POOL_SIZE` from `backend/.env`
- `DATABASE_MAX_OVERFLOW` from `backend/.env`
- `DATABASE_STATEMENT_TIMEOUT_MS` from `backend/.env`
- `FRONTEND_URL` from `backend/.env` as a temporary fallback when `CORS_ALLOWED_ORIGINS` is unset
- `REDIS_URL` from `backend/.env` when cache is enabled
- `CACHE_TTL_SECONDS` from `backend/.env` when cache is enabled
- `REDIS_SOCKET_CONNECT_TIMEOUT_SECONDS` from `backend/.env` when cache is enabled
- `REDIS_SOCKET_TIMEOUT_SECONDS` from `backend/.env` when cache is enabled
- `REDIS_RETRY_MAX_ATTEMPTS` from `backend/.env` when cache is enabled
- `REDIS_RETRY_BASE_DELAY_MS` from `backend/.env` when cache is enabled
- `REDIS_RETRY_MAX_DELAY_MS` from `backend/.env` when cache is enabled
- `READINESS_CHECK_TIMEOUT_SECONDS` from `backend/.env`
- `LOG_LEVEL` from `backend/.env`
- `LOG_FORMAT` from `backend/.env`
- `TEST_DATABASE_URL` from your shell when running PostgreSQL-backed integration tests

## Backend Contract

The API routes and success payloads remain the source of truth in Increment 17. The frontend consumes checked-in TypeScript types generated from `backend/openapi.json`, while keeping request helpers handwritten. Error responses use a stable JSON envelope:

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
- `503` -> `DEPENDENCY_UNAVAILABLE` for positively identified PostgreSQL connectivity, disconnect, pool-timeout, and statement-timeout failures

Credential or database-name mistakes are not treated as dependency-unavailable outages and continue to surface as internal server errors until the configuration is corrected.

## Frontend Contract Consumption

- `backend/openapi.json` is the checked-in backend contract snapshot for the frontend
- `frontend/src/api/generated/openapi.ts` is generated from that snapshot
- regenerate frontend contract types after backend schema changes with:

```bash
cd frontend
pnpm generate:api
```

- the frontend only retries safe `GET` reads by default
- frontend mutations do not auto-retry
- preview deployments should point to the staging backend through `VITE_API_BASE_URL`, not by editing source code

## Redis Cache And Resilience

Increment 12 keeps Redis as a read-performance layer only.

- PostgreSQL remains the source of truth for all writes and constraints
- the backend still works when `REDIS_URL` is unset
- if Redis operations fail or time out, read requests bypass cache and load from PostgreSQL
- write requests still commit even if cache version bumps fail
- safe Redis operations use bounded exponential backoff with jitter
- backend write requests are never automatically retried
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
REDIS_SOCKET_CONNECT_TIMEOUT_SECONDS=0.5
REDIS_SOCKET_TIMEOUT_SECONDS=0.5
REDIS_RETRY_MAX_ATTEMPTS=3
REDIS_RETRY_BASE_DELAY_MS=50
REDIS_RETRY_MAX_DELAY_MS=500
```

## Health And Readiness

- `GET /health` is the lightweight liveness endpoint and always returns `{"status":"ok"}`
- `GET /health/ready` is the readiness endpoint
- readiness requires PostgreSQL availability
- Redis does not make the app unready because the service can fall back to PostgreSQL reads
- when Redis is unavailable, readiness stays `200` and the payload marks Redis as degraded
- startup follows a managed-runtime-friendly `start, stay unready` model:
  - the process can boot even when PostgreSQL is temporarily unavailable
  - `/health` still reports the process as live
  - `/health/ready` stays `503` until PostgreSQL becomes reachable
- the readiness probe scopes its timeout to the probe transaction only, so request traffic keeps the configured normal statement timeout
- app startup and shutdown are logged through FastAPI lifespan hooks
- backend shutdown explicitly disposes the shared SQLAlchemy engine and closes the shared Redis client when one was created

For Railway deployments, use `GET /health/ready` as the service healthcheck endpoint rather than `GET /health`.

## CORS Configuration

Increment 12 replaces the single-origin local-only assumption with an exact-origin allowlist.

- prefer `CORS_ALLOWED_ORIGINS` as a comma-separated list of explicit frontend origins
- `FRONTEND_URL` still works as a temporary fallback for older local setups
- if both are set, `CORS_ALLOWED_ORIGINS` takes precedence
- preview domains should be added explicitly rather than allowed with a broad regex

Example:

```bash
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://staging-frontend.example.com,https://app.example.com
```

## What Still Does Not Exist

- Docker setup
- deployment config

## How To Test Increment 17

From the repository root after activating your virtual environment:

```bash
cd backend
pytest tests/unit/test_config.py tests/unit/test_database.py tests/unit/test_cache.py tests/integration/test_logging.py tests/integration/test_runtime_hardening.py tests/integration/test_health.py
cd ../frontend
pnpm test
pnpm build
```

Frontend coverage in this increment includes:

- cafe list render against backend-backed MSW responses
- explicit location filtering through the backend
- clear/reset local filter behavior
- retryable safe-read failure and recovery
- create form render and required-field validation
- successful cafe create with trimmed payload submission, list invalidation, and return to `/cafes`
- optional `logo_url` omission on create
- create failure rendering without clearing form values
- cancel navigation from the create page
- direct edit-route detail loading and form prefill
- direct cafe delete from the list page with destructive confirmation and list refetch
- list-page delete failure rendering without leaving `/cafes`
- successful cafe update with trimmed payload submission, list/detail invalidation, and return to `/cafes`
- edit-page retryable read failure and recovery
- slow list/detail read handling that keeps route state stable while backend responses are pending
- edit-page not-found rendering on backend `404`
- update failure rendering without clearing form values
- destructive delete confirmation, delete success, and return to `/cafes`
- delete failure rendering while staying on the edit page
- dirty-form browser prompt wiring for create/edit unload and route transitions
- staging-style absolute backend URL handling through `VITE_API_BASE_URL`
- employee-count deep-link rendering
- add/edit route navigation from the list page

To run the full backend test suite:

```bash
cd backend
pytest
```

Example readiness payload with healthy PostgreSQL and degraded Redis:

```json
{
  "status": "ready",
  "dependencies": {
    "postgres": {"status": "ok"},
    "redis": {"status": "degraded"}
  }
}
```

## Run Migrations

From the repository root:

```bash
. .venv/bin/activate
cd backend
alembic upgrade head
```

Alembic resolves the migration target database in this order:

- `DATABASE_URL` from your current shell
- `DATABASE_URL` in `backend/.env`
- the fallback value in `backend/alembic.ini`

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
- cache and resilience logs include hit, miss, set, bypass, failure, version bump, retry, fallback, and readiness events
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
- Readiness: `http://127.0.0.1:8000/health/ready`
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

Expected liveness response:

```json
{"status":"ok"}
```

## End-To-End Local Verification

Use this flow when you want to verify the current delivered system end to end instead of only running isolated test suites.

1. Start local PostgreSQL and Redis:

```bash
docker rm -f gic-postgres-test gic-redis-test 2>/dev/null
docker run -d --name gic-postgres-test \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=cafe_manager \
  -p 55432:5432 \
  postgres:16-alpine
docker run -d --name gic-redis-test -p 6379:6379 redis:7
docker exec -it gic-postgres-test psql -U postgres -d postgres -c "CREATE DATABASE gic_take_home_test;"
```

2. Activate the virtual environment and export the integration-test database:

```bash
. .venv/bin/activate
export TEST_DATABASE_URL='postgresql+psycopg://postgres:postgres@localhost:55432/gic_take_home_test'
```

3. Apply migrations and seed demo data:

```bash
cd backend
alembic upgrade head
python scripts/seed.py
cd ..
```

4. Start the backend:

```bash
cd backend
uvicorn app.main:app --reload
```

5. Start the frontend in another terminal:

```bash
cd frontend
cp .env.example .env.local
pnpm dev
```

6. Manually verify the current frontend increment in the browser:

- open `http://localhost:5173/cafes`
- confirm the cafe list loads from the backend
- type a location and click `Apply`
- confirm the backend-filtered list updates
- click `Clear` and confirm the full list returns
- click an employee count link and confirm it targets `/employees?cafe_id=<uuid>`
- confirm `Add Cafe` and row `Edit` links are visible

7. Run the automated verification suites:

```bash
cd backend
pytest
cd ../frontend
pnpm test
pnpm build
```

This end-to-end path verifies:

- backend boot, migrations, and seed flow
- backend read/write API behavior and runtime hardening
- frontend cafe list behavior for the current increment
- frontend production build output

## Run Tests

Frontend foundation tests:

```bash
cd frontend
pnpm test
```

Frontend production build check:

```bash
cd frontend
pnpm build
```

Unit tests and health/readiness integration tests:

```bash
. .venv/bin/activate
cd backend
pytest tests/integration/test_health.py
pytest tests/unit
```

Resilience-focused unit tests:

```bash
. .venv/bin/activate
cd backend
pytest tests/unit/test_resilience.py
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

Increment 14 adds the first real frontend business page on top of the completed backend:

- a live cafe list route at `/cafes`
- backend-driven location filtering triggered explicitly from the UI
- AG Grid-based cafe table using straightforward columns and actions
- loading, empty, and retryable read-failure handling
- employee-count deep links into `/employees?cafe_id=<uuid>`
- README and frontend test updates for the current slice

## Changes Since Previous Increment

- replaced the cafe list placeholder with a real backend-backed page
- simplified the frontend approach to keep filter state local and business logic in the backend
- kept AG Grid usage minimal and explanation-friendly
- reduced frontend tests to core flows and meaningful failure handling
- updated README instructions for Increment 14 and end-to-end local verification

## Notes

- PostgreSQL is required for migrations, schema-sensitive integration tests, the seed script, and the cafe and employee integration tests.
- `TEST_DATABASE_URL` must point to a disposable PostgreSQL database for integration and concurrency tests; those suites skip when it is not set.
- Cafe deletion is intentionally destructive: it removes the cafe and employees currently assigned to it.
- Employee creation now requires an initial cafe assignment, while updates may still unassign or reassign.
- The shared error envelope shape remains intact, while domain `400` responses are now reserved for `INVALID_OPERATION` rather than overloading `VALIDATION_ERROR`.
- Redis is a performance layer only; it is not part of the domain model or write correctness path.
- Backend write operations are not automatically retried in this increment.
- Docker and deployment configuration are not implemented yet.
