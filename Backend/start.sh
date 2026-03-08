#!/bin/sh
set -e

echo "Starting FinTrack Backend..."

# Migrations can fail in Railway if the DB isn't reachable (security group, IP allowlist, etc.).
# Don't block the web server from starting unless explicitly requested.
if [ "${RUN_MIGRATIONS:-true}" = "true" ] && [ -n "${DATABASE_URL:-}" ]; then
  echo "Running database migrations..."
  if alembic upgrade head; then
    echo "Migrations completed successfully!"
  else
    echo "Migrations failed; continuing startup."
  fi
else
  echo "Skipping migrations (set RUN_MIGRATIONS=true to enable)."
fi

echo "Starting uvicorn server..."
PORT="${PORT:-8000}"
echo "Server will listen on port $PORT"
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
