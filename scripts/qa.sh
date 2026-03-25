#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# ── Prerequisites ────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || { echo "Error: docker is not installed."; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "Error: docker compose v2 is not available."; exit 1; }

# ── Environment files ────────────────────────────────────────
if [ ! -f "$PROJECT_ROOT/.env" ]; then
  echo "No .env found at project root. Copying from .env.example..."
  cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
fi

if [ ! -f "$PROJECT_ROOT/backend/.env" ]; then
  echo "No .env found in backend/. Copying from root .env..."
  cp "$PROJECT_ROOT/.env" "$PROJECT_ROOT/backend/.env"
fi

# ── Defaults ─────────────────────────────────────────────────
export RUN_SEED="${RUN_SEED:-true}"

# ── Start full stack ─────────────────────────────────────────
echo ""
echo "Starting full stack (qa profile) with RUN_SEED=$RUN_SEED..."
cd "$PROJECT_ROOT/infra"
docker compose --profile qa up --build -d

echo ""
echo "============================================"
echo "  QA environment starting up..."
echo "============================================"
echo ""
echo "Services:"
echo "  - PostgreSQL : localhost:5432"
echo "  - Backend API: localhost:3000"
echo ""
echo "The backend container will automatically:"
echo "  1. Wait for PostgreSQL to be healthy"
echo "  2. Run database migrations"
if [ "$RUN_SEED" = "true" ]; then
echo "  3. Seed sample data"
fi
echo ""
echo "Health check:  curl http://localhost:3000/health"
echo "View logs:     cd infra && docker compose --profile qa logs -f backend"
echo "Stop:          ./scripts/stop.sh"
echo "Stop + reset:  ./scripts/stop.sh --clean"
echo ""
