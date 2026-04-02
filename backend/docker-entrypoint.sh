#!/bin/sh
set -eu

echo "Applying database migrations..."
until alembic upgrade head; do
  echo "Migrations failed. Retrying in 2 seconds..."
  sleep 2
done

echo "Seeding demo data..."
PYTHONPATH=/app python scripts/seed.py

echo "Starting backend server..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
