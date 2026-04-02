# Cafe Manager

Cafe Manager is a full-stack application for managing cafes and employees. It supports cafe and employee CRUD workflows, employee assignment and unassignment, operational health checks, seeded demo data, and both manual and Docker-based local evaluation.

This repository is organized to help an evaluator review three things quickly: what the application does, how it is built, and how to run and test it reliably.

## Application Overview

The application models two primary entities: cafes and employees. Cafes can be created, updated, listed, filtered by location, and deleted. Employees can be created, updated, listed, deleted, assigned to a cafe, reassigned, or explicitly unassigned.

The frontend is a React single-page application focused on CRUD workflows and operator feedback. The backend is a FastAPI service that owns persistence, validation, assignment semantics, and API behavior. PostgreSQL is the source of truth for relational data, while Redis is available as an optional cache for read optimization.

## Core Features

- Browse, create, edit, and delete cafes
- Browse, create, edit, and delete employees
- Assign, reassign, and unassign employees from cafes
- Filter cafes by location
- Deep-link from cafe employee counts to filtered employee views
- Show backend connectivity in the UI through a lightweight health check
- Run the stack manually for development or through Docker Compose for reproducible evaluation
- Deploy the frontend and backend separately using Vercel and Render

## Architecture At A Glance

The application uses a split frontend/backend architecture so the user interface can stay responsive and focused on workflow while the backend remains authoritative for business rules and data integrity.

- The frontend SPA handles routing, forms, grid views, optimistic user flow, and retryable read states.
- The backend API owns validation, write behavior, filtering semantics, error envelopes, and assignment rules.
- PostgreSQL is the system of record because cafes, employees, and assignments are relational data with integrity constraints.
- Redis is optional because cache-assisted reads improve responsiveness, but the application should remain usable if Redis is unavailable.
- Docker Compose provides a production-like local stack with the database, cache, API, and frontend wired together consistently for evaluation.

## Tech Stack And Rationale

### Frontend

- React 19: a mature SPA foundation for interaction-heavy CRUD flows
- TypeScript: keeps UI and API integration typed and easier to reason about
- Vite: fast local iteration and straightforward production builds
- React Router: explicit route contracts for cafes and employees
- TanStack Query: handles server-state fetching, retries for safe reads, and cache invalidation after writes
- Ant Design: provides stable form and layout primitives for business-style workflows
- AG Grid: fits the tabular list views used for cafes and employees

### Frontend Testing

- Vitest: fast test runner aligned with the Vite toolchain
- Testing Library: encourages UI behavior tests instead of implementation-coupled tests
- MSW: allows realistic API mocking for route and form flows without a live backend

### Backend

- Python 3.11: modern Python runtime with strong ecosystem support
- FastAPI: concise API development with typed request and response handling
- SQLAlchemy: explicit persistence modeling and database interaction
- Alembic: versioned schema migrations for repeatable database setup
- Psycopg: solid PostgreSQL driver support
- Uvicorn: lightweight ASGI server for local and containerized runtime

### Data And Services

- PostgreSQL: a strong fit for relational entities and integrity-sensitive assignment data
- Redis: optional cache layer for read performance, configured with fail-open behavior so cache issues do not become application outages

### Deployment And Containers

- Vercel: simple static hosting path for the built frontend
- Render: straightforward hosted path for the containerized backend and managed PostgreSQL
- Docker and Docker Compose: reproducible local environment for evaluators
- Nginx: stable static asset serving inside the frontend container

## Design Decisions And Rationale

- Backend-authoritative validation and writes: business rules should not depend on the client, so validation, filtering semantics, and delete behavior are enforced server-side.
- TanStack Query for read and write coordination: retryable reads and post-write invalidation keep the UI responsive without duplicating backend logic in the client.
- OpenAPI-generated frontend types: checked-in types reduce contract drift while keeping frontend request helpers readable and handwritten.
- Automatic migrations and seed data in container startup: this lowers evaluator setup friction and makes Docker the fastest path to a working demo environment.
- Separate `/health` and `/health/ready` endpoints: process liveness and dependency readiness are different concerns and are documented separately.
- Docker Compose includes PostgreSQL and Redis: the application can be evaluated with minimal machine-specific setup and behavior closer to hosted runtime expectations.

## Local Setup Prerequisites

Before running the application locally without Docker, make sure the following are installed:

- Python 3.11+
- Node.js 22+
- pnpm
- PostgreSQL
- Redis

For the Docker workflow, only Docker and Docker Compose are required.

## Run Locally Without Docker

From the repository root:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -e './backend[dev]'
cp backend/.env.example backend/.env
pnpm install --dir frontend
cp frontend/.env.example frontend/.env.local
```

Then start PostgreSQL and Redis separately for manual local development.

Suggested local defaults from the checked-in environment examples:

```bash
DATABASE_URL=postgresql+psycopg://your_postgres_user:your_postgres_password@localhost:55432/your_runtime_database
REDIS_URL=redis://localhost:6379/0
VITE_API_BASE_URL=http://localhost:8000
```

Run the backend:

```bash
cd backend
uvicorn app.main:app --reload
```

Run the frontend in a second terminal:

```bash
cd frontend
pnpm dev
```

Default local URLs:

- Frontend dev server: `http://localhost:5173`
- Backend API: `http://localhost:8000`

## Run Locally With Docker

Docker Compose is the easiest evaluation path because it starts the full stack with the expected service wiring.

From the repository root:

```bash
docker compose up --build
```

This starts:

- PostgreSQL on `localhost:55432`
- Redis on `localhost:6379`
- Backend API on `http://localhost:8000`
- Frontend app on `http://localhost:4173`

Startup behavior:

- waits for PostgreSQL and Redis to become healthy
- applies `alembic upgrade head`
- runs `python scripts/seed.py`
- starts the backend with Uvicorn
- serves the built frontend through Nginx

Useful Docker commands:

```bash
docker compose logs -f backend
docker compose down
docker compose down -v
```

Use `docker compose down -v` when you want to reset the persisted PostgreSQL and Redis volumes.

## Testing Setup And Commands

The repository includes both backend and frontend tests.

### Backend Tests

Install backend development dependencies first:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -e './backend[dev]'
```

Backend unit and integration tests are run with:

```bash
cd backend
pytest
```

Backend integration coverage includes:

- schema and migration behavior
- seed flow
- cafe and employee API behavior
- write-path constraints and concurrency behavior
- cache and resilience behavior
- readiness and runtime hardening behavior

Backend integration tests require a separate PostgreSQL test database exposed through `TEST_DATABASE_URL`.

Example Docker-backed local test database setup:

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
export TEST_DATABASE_URL='postgresql+psycopg://postgres:postgres@localhost:55432/gic_take_home_test'
```

If you are not using Docker for the test database, point both `DATABASE_URL` and `TEST_DATABASE_URL` at the correct local PostgreSQL instances and database names for your machine.

### Frontend Tests

Install frontend dependencies and run:

```bash
cd frontend
pnpm install
pnpm test
```

Frontend test coverage includes:

- route rendering
- grid and list behavior
- create and edit form flows
- delete flows
- retry and error states
- API interaction behavior through mocked backend responses

## Hosted Deployment Overview

The current hosted deployment path uses:

- Vercel for the frontend from `frontend/`
- Render for the backend from `backend/`
- Render PostgreSQL as the managed runtime database

This split keeps the frontend deployment simple and static while letting the backend run as a containerized service with managed PostgreSQL.

### Frontend Deployment On Vercel

Deploy the `frontend/` directory as the Vercel project root.

Checked-in frontend deployment configuration:

- `frontend/vercel.json`
- `frontend/.env.preview.example`
- `frontend/.env.production.example`

Expected Vercel settings:

- Framework preset: Vite
- Root directory: `frontend`
- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm build`
- Output directory: `dist`

Required Vercel environment variable:

```bash
VITE_API_BASE_URL=https://your-backend-service.onrender.com
```

### Backend Deployment On Render

The backend deployment is defined in `render.yaml` and builds from `backend/Dockerfile`.

Hosted backend behavior:

- applies Alembic migrations
- seeds demo data
- starts Uvicorn

Render provisions:

- one web service for the backend
- one managed PostgreSQL database

Required backend configuration flow:

- let Render provide `DATABASE_URL` from the managed PostgreSQL instance
- set `CORS_ALLOWED_ORIGINS` to the exact Vercel frontend origin
- set `VITE_API_BASE_URL` in Vercel to the public Render backend URL

Redis is optional and is not required for the hosted deployment path.

Because the checked-in Render Blueprint uses the free plan, the hosted backend may spin down after inactivity. The first request after an idle period can take longer while the service cold-starts, so evaluators should expect an initial delay before the hosted frontend becomes responsive.

## Environment Variables And API Notes

Primary environment variables:

- `DATABASE_URL`: backend runtime PostgreSQL connection string
- `TEST_DATABASE_URL`: PostgreSQL connection string used for integration tests
- `REDIS_URL`: optional Redis connection string for cache-backed reads
- `CORS_ALLOWED_ORIGINS`: backend allowlist for frontend origins
- `VITE_API_BASE_URL`: frontend base URL for backend API requests

Primary frontend routes:

- `/cafes`
- `/cafes/new`
- `/cafes/:id/edit`
- `/employees`
- `/employees/new`
- `/employees/:id/edit`

Primary backend health endpoints:

- `GET /health`
- `GET /health/ready`

The frontend consumes checked-in OpenAPI-generated TypeScript types from the backend contract, while keeping its request layer handwritten.

## Repository Structure

```text
backend/
  app/
  alembic/
  scripts/
  tests/
  Dockerfile
  docker-entrypoint.sh
  pyproject.toml

frontend/
  src/
    test/
  scripts/
  Dockerfile
  nginx.conf
  package.json
  vite.config.ts
  vercel.json

docker-compose.yml
render.yaml
README.md
```

## Troubleshooting And Evaluator Notes

- If manual local startup fails, the most common issue is an incorrect `DATABASE_URL`, missing PostgreSQL database, or unavailable Redis instance.
- If frontend requests fail in hosted mode, verify `VITE_API_BASE_URL` in Vercel and `CORS_ALLOWED_ORIGINS` in Render first.
- If the hosted site feels slow on the first load, the Render backend may be waking from free-tier spin-down; give it extra time and retry once the API has cold-started.
- Docker Compose is the fastest way to evaluate the full application because it includes database setup, cache setup, migrations, seed data, backend startup, and frontend serving in one command.
- The frontend Docker container serves the production build through Nginx, while the manual local flow uses the Vite development server at `http://localhost:5173`.
