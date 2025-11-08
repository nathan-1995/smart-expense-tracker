#!/bin/bash
set -e

echo "Starting FinTrack Backend..."

# Run database migrations if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
    echo "Running database migrations..."
    alembic upgrade head
    echo "Migrations completed successfully!"
else
    echo "No DATABASE_URL set, skipping migrations"
fi

# Start the application
echo "Starting uvicorn server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
