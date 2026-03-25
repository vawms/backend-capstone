#!/bin/sh
set -e

DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-postgres}"

echo "Waiting for database at ${DB_HOST}:${DB_PORT}..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" 2>/dev/null; do
  echo "  Database not ready, retrying in 2s..."
  sleep 2
done
echo "Database is ready."

echo "Running migrations..."
npx typeorm-ts-node-commonjs migration:run -d src/ormconfig.ts
echo "Migrations complete."

if [ "$RUN_SEED" = "true" ]; then
  echo "Seeding database..."
  npx ts-node src/seeds/seed.ts
  echo "Seeding complete."
fi

echo "Starting application..."
exec node dist/main
