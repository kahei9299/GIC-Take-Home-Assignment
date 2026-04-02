# GIC-Take-Home-Assignment

Current iteration: Increment 23, Dockerization and local container workflow.

## What Exists

- `backend/` Python project scaffold
- FastAPI app entrypoint
- typed config loading
- SQLAlchemy engine/session scaffolding
- SQLAlchemy persistence models for cafes, employees, and employee assignments
- Alembic migration setup with the initial schema migration and Increment 9 read-path index migration
- Seed script for demo and test-supporting data
- backend Dockerfile and startup entrypoint for containerized local evaluation
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
- React Router app shell with completed cafe and employee routes for list, create, edit, and delete workflows, now presented under the simplified `Cafe Manager` title without an increment badge in the UI
- TanStack Query provider with safe-read retry defaults for backend reads
- centralized frontend theme tokens and global warm-editorial styling for shared layout chrome, cards, toolbars, and light AG Grid wrapper polish
- Ant Design theme baseline with AG Grid-backed cafe and employee list pages, cafe-style list toolbars, direct cafe and employee list delete actions, shared cafe form wiring across create/edit routes, and shared employee form wiring across create/edit with explicit unassign support
- small shared employee-route utilities for write-query invalidation and dirty-form leave guards
- handwritten frontend API client layered on checked-in OpenAPI-generated types, including employee update and delete support
- frontend env examples for local, preview, and production backend targeting
- frontend Dockerfile and nginx SPA config for static container serving
- root Docker Compose stack for backend, frontend, PostgreSQL, and Redis
- frontend Vitest + Testing Library + MSW coverage for the completed cafe slice plus employee list deep links, employee create/edit/delete flows, retry states, not-found handling, and dirty-form prompt wiring

## Hosted Deployment

Increment 23 now includes deployment configuration for:

- Vercel frontend deployment from `frontend/`
- Render backend deployment from `backend/`
- Render PostgreSQL for the runtime database

Hosted service split:

- Vercel serves the React + Vite frontend
- Render runs the FastAPI backend from the checked-in Docker image
- Render PostgreSQL is the persistent demo database
- Redis remains optional and is not required for the hosted deployment path

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
    docker-entrypoint.sh
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
  Dockerfile
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
      theme.ts
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
        CafeCreateRoute.tsx
        CafeEditRoute.tsx
        CafeListGrid.tsx
        CafeListRoute.tsx
        CafeListToolbar.tsx
      employees/
        employeeForm.tsx
        EmployeeCreateRoute.tsx
        EmployeeEditRoute.tsx
        EmployeeListGrid.tsx
        EmployeeListRoute.tsx
        EmployeeListToolbar.tsx
        employeeRouteUtils.ts
      shared/
    test/
      app.test.tsx
      renderApp.tsx
      server.ts
      setup.ts
    styles.css
  .env.example
  .env.preview.example
  .env.production.example
  .dockerignore
  Dockerfile
  index.html
  nginx.conf
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

Increment 23 uses PostgreSQL for migrations, schema tests, the demo seed script, read/write integration tests, cache integration tests, readiness checks, and concurrent-write verification. Runtime settings are loaded from `backend/.env`.

- local backend DB: set in `backend/.env` as `DATABASE_URL`
- schema test DB: set `TEST_DATABASE_URL` to a separate PostgreSQL database you can safely migrate and downgrade during tests

Primary local test-database example:

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

## Docker Workflow

Increment 23 adds a full local container workflow for evaluation.

From the repository root:

```bash
docker compose up --build
```

This starts:

- PostgreSQL on `localhost:55432`
- Redis on `localhost:6379`
- backend API on `http://localhost:8000`
- frontend app on `http://localhost:4173`

Compose startup behavior:

- waits for PostgreSQL and Redis to report healthy
- applies `alembic upgrade head` automatically before the backend starts serving traffic
- runs `python scripts/seed.py` automatically before the backend starts serving traffic
- serves the frontend as a compiled static bundle, not a Vite dev server

The automatic seed step is safe on restarts because the seed script is idempotent.

The checked-in Docker build defaults use the standard public package registries so the workflow stays region-neutral for evaluators.

If you are building from a network that struggles to reach Docker Hub, PyPI, or npm reliably, override the Docker build args locally with region-appropriate mirrors instead of changing the default submission path.

Example restricted-network build override:

```bash
docker compose build \
  --build-arg PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple \
  --build-arg PIP_TRUSTED_HOST=pypi.tuna.tsinghua.edu.cn \
  --build-arg NPM_REGISTRY=https://registry.npmmirror.com \
  --build-arg PNPM_REGISTRY=https://registry.npmmirror.com
docker compose up
```

Useful Docker commands:

```bash
docker compose up --build
docker compose logs -f backend
docker compose down
docker compose down -v
```

Use `docker compose down -v` when you want to remove the persisted PostgreSQL and Redis volumes and rebuild the demo dataset from a clean state on the next startup.

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

## Deploy The Frontend To Vercel

Deploy the `frontend/` directory as the Vercel project root.

Checked-in frontend deployment config:

- `frontend/vercel.json`
- `frontend/.env.preview.example`
- `frontend/.env.production.example`

Recommended Vercel project settings:

- framework preset: Vite
- root directory: `frontend`
- install command: `pnpm install --frozen-lockfile`
- build command: `pnpm build`
- output directory: `dist`

Required Vercel environment variable:

```bash
VITE_API_BASE_URL=https://your-backend-service.onrender.com
```

After Vercel assigns the public frontend domain, add that exact origin to the Render backend `CORS_ALLOWED_ORIGINS` value.

## Deploy The Backend To Render

Deploy the repository to Render using the Blueprint at the repo root.

Checked-in backend deployment config:

- `render.yaml`
- `backend/.env.render.example`
- `backend/Dockerfile`
- `backend/docker-entrypoint.sh`

Render should provision and connect:

- one PostgreSQL service
- one backend web service built from the backend Dockerfile

The backend service keeps the current startup behavior:

- runs `alembic upgrade head`
- runs `python scripts/seed.py`
- starts `uvicorn app.main:app --host 0.0.0.0 --port 8000`

Required Render backend environment variables:

```bash
APP_NAME=gic-take-home-backend
APP_ENV=production
DATABASE_URL=<Render PostgreSQL connection URL>
CORS_ALLOWED_ORIGINS=https://your-frontend-project.vercel.app
DATABASE_CONNECT_TIMEOUT_SECONDS=5
DATABASE_POOL_TIMEOUT_SECONDS=5
DATABASE_POOL_RECYCLE_SECONDS=1800
DATABASE_POOL_SIZE=5
DATABASE_MAX_OVERFLOW=10
DATABASE_STATEMENT_TIMEOUT_MS=5000
CACHE_TTL_SECONDS=60
REDIS_SOCKET_CONNECT_TIMEOUT_SECONDS=0.5
REDIS_SOCKET_TIMEOUT_SECONDS=0.5
REDIS_RETRY_MAX_ATTEMPTS=3
REDIS_RETRY_BASE_DELAY_MS=50
REDIS_RETRY_MAX_DELAY_MS=500
READINESS_CHECK_TIMEOUT_SECONDS=1.0
LOG_LEVEL=INFO
LOG_FORMAT=json
```

Render's Blueprint already wires the database connection and `/health/ready` healthcheck. The app also normalizes Render-style `postgresql://...` database URLs to the SQLAlchemy `postgresql+psycopg://...` format automatically, so you do not need to rewrite the connection string manually.

Suggested deployment order:

1. Create a new Render Blueprint from this repository.
2. Let Render create the PostgreSQL database and backend web service from `render.yaml`.
3. Enter the Vercel frontend URL for `CORS_ALLOWED_ORIGINS` when Render prompts for it, or update it after the first deploy.
4. Copy the backend public URL into Vercel as `VITE_API_BASE_URL`.
5. Redeploy the backend if you update `CORS_ALLOWED_ORIGINS` after Vercel goes live.

Increment 23 keeps the backend authoritative for cafe filtering, cafe and employee write validation, assignment semantics, and delete behavior while adding a reproducible local container workflow:

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
- the visible app title is `Cafe Manager`
- the visible app UI no longer shows an increment badge
- positive employee counts deep-link to `/employees?cafe_id=<uuid>`
- the employee list page lives at `/employees`
- `/employees?cafe_id=<uuid>` remains the deep-link contract from cafe employee counts
- the employee list fetches cafe detail separately to show a cafe name for the active filter label
- if the cafe-name lookup fails, the employee list still loads with a generic filtered label
- the employee list also supports a local cafe-name filter over the currently loaded employee rows
- the employee grid shows full employee IDs, plain `days_worked`, explicit `Unassigned` state, and `Edit` plus `Delete` actions per row
- the employee list page supports direct employee delete from the actions column without navigating through the edit page
- the employee create page lives at `/employees/new`
- the employee edit page lives at `/employees/:id/edit`
- employee create requires an initial cafe assignment, while employee edit supports reassignment and explicit unassignment
- employee create and edit share the same frontend employee field rendering and payload-normalization rules
- employee update and delete submissions preserve entered values on failure, invalidate employee/cafe queries on success, and return to `/employees`
- employee edit loads employee detail directly from `GET /employees/{id}` for prefill and retryable direct navigation
- employee delete confirmation on both the list page and edit page explicitly warns that deleting an employee also removes their assignment history
- direct employee edit loads show a dedicated not-found state when the backend returns `404`
- employee list-page delete failures render inline above the grid without leaving `/employees`

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

The API routes and success payloads remain the source of truth in Increment 22. The frontend consumes checked-in TypeScript types generated from `backend/openapi.json`, while keeping request helpers handwritten. Error responses use a stable JSON envelope:

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

For Render deployments, use `GET /health/ready` as the service healthcheck endpoint rather than `GET /health`.

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

## Deployment Verification

After both services are live, verify:

- Vercel frontend loads from the public URL
- Render backend returns `200` from `/health/ready`
- seeded cafes and employees appear in the UI
- create, update, and delete flows work from the hosted frontend
- backend responses include the expected CORS headers for the Vercel origin

## How To Test Increment 23

From the repository root after activating your virtual environment:

```bash
cd backend
pytest tests/unit/test_config.py tests/unit/test_database.py tests/unit/test_cache.py tests/integration/test_logging.py tests/integration/test_runtime_hardening.py tests/integration/test_health.py
cd ../frontend
pnpm test
pnpm build
```

Deployment-specific verification:

```bash
docker build -t gic-backend ./backend
cd frontend
VITE_API_BASE_URL=https://example-backend.onrender.com pnpm build
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
- add/edit cafe route navigation from the cafe list page
- employee list render against backend-backed MSW responses
- employee list deep-link filtering through `?cafe_id=<uuid>`
- active employee filter label using cafe detail lookup
- local employee cafe-name filtering and clear/reset behavior
- employee list delete success and failure flows from the actions column
- employee create success, validation, retry, failure, and unsaved-change prompt coverage
- direct employee edit-route detail loading and form prefill
- successful employee update with trimmed payload submission, list/detail invalidation, and return to `/employees`
- employee unassign support through the shared edit form
- clean employee edit cancel navigation back to `/employees`
- employee edit-page retryable read failure, not-found rendering, and slow-read stability
- employee update failure rendering without clearing form values
- employee delete success and failure flows from the edit page
- dirty-form browser prompt wiring for employee edit unload and route transitions
- clear deep-link navigation back to `/employees`
- local employee filtering by cafe name with the same card-based toolbar pattern used on the cafe page
- degraded employee filter-label fallback when the cafe-name lookup fails
- explicit `Unassigned` employee display
- employee list retryable failure and recovery
- employee list empty states for unfiltered, deep-link-filtered, and local cafe-name-filtered reads
- employee `Edit` links and `Add Employee` CTA rendering
- centralized theme-module usage through the app provider and test renderer
- updated shared page chrome, toolbar, and header styling under the `Cafe Manager` app title

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

1. Start the full Dockerized stack:

```bash
docker compose up --build
```

2. Wait for backend readiness and confirm the health endpoints:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/health/ready
```

3. Manually verify the current frontend increment in the browser:

- open `http://localhost:4173/cafes`
- confirm the cafe list loads from the backend
- type a location and click `Apply`
- confirm the backend-filtered list updates
- click `Clear` and confirm the full list returns
- click an employee count link and confirm it targets `/employees?cafe_id=<uuid>`
- open `http://localhost:4173/employees`
- confirm the employee list loads from the backend
- confirm `Add Cafe` and row `Edit` links are visible

4. Run the automated verification suites:

```bash
. .venv/bin/activate
cd backend
pytest
cd ../frontend
pnpm test
pnpm build
```

This end-to-end path verifies:

- Docker image build and startup flow
- backend boot, automatic migrations, and automatic seed flow
- backend read/write API behavior and runtime hardening
- frontend cafe list behavior for the current increment
- frontend employee list behavior for the current increment
- frontend production build output

5. Shut the stack down when finished:

```bash
docker compose down
```

Use `docker compose down -v` if you want to remove the Docker volumes and fully recreate the seeded dataset on the next run.

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

Increment 23 adds Dockerized local evaluation on top of the Increment 22 UI refresh:

- backend container startup with automatic migrations and demo seeding
- frontend static bundle container served through nginx with SPA route fallback
- root `docker-compose.yml` for backend, frontend, PostgreSQL, and Redis
- container health checks aligned with `GET /health/ready`
- README instructions for Docker startup, reset, smoke testing, and troubleshooting
- existing cafe and employee workflows unchanged at the API and route-contract level
- a live employee create route at `/employees/new`
- a live employee edit route at `/employees/:id/edit`
- direct employee delete from both the list route and the edit route
- required initial cafe assignment on create plus explicit reassignment and unassignment on edit
- centralized frontend theme tokens and a shared global stylesheet for layout chrome
- a warm-editorial visual refresh for the app shell, page frames, directory toolbars, and grid wrappers
- simplified visible branding from `GIC Cafe Manager` to `Cafe Manager`
- removed the visible increment badge from the UI
- README and frontend test updates for the current slice

## Changes Since Previous Increment

- added backend and frontend Dockerfiles plus container-specific ignore files
- added a compose-based local stack with PostgreSQL, Redis, backend, and frontend services
- moved local evaluation to a Docker-first full-stack path while keeping the existing non-Docker developer workflow available
- updated README instructions for Increment 23, including automatic migration/seed startup behavior
- introduced a shared theme module and one global stylesheet instead of continuing inline style duplication
- refreshed the app shell, page hero cards, directory toolbars, and AG Grid containers with a warmer editorial direction
- renamed the visible app title to `Cafe Manager` and removed the increment badge from the UI
- kept route behavior, deep links, backend contracts, and employee/cafe workflows unchanged while updating the presentation layer
- updated README instructions for Increment 22 and the current frontend visual state

## Notes

- PostgreSQL is required for migrations, schema-sensitive integration tests, the seed script, and the cafe and employee integration tests.
- `TEST_DATABASE_URL` must point to a disposable PostgreSQL database for integration and concurrency tests; those suites skip when it is not set.
- Cafe deletion is intentionally destructive: it removes the cafe and employees currently assigned to it.
- Employee creation now requires an initial cafe assignment, while updates may still unassign or reassign.
- The shared error envelope shape remains intact, while domain `400` responses are now reserved for `INVALID_OPERATION` rather than overloading `VALIDATION_ERROR`.
- Redis is a performance layer only; it is not part of the domain model or write correctness path.
- Backend write operations are not automatically retried in this increment.
- Deployment configuration is now checked in for Vercel frontend hosting and Render backend hosting with Render PostgreSQL.
