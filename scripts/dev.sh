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

# ── Start PostgreSQL ─────────────────────────────────────────
echo ""
echo "Starting PostgreSQL (dev profile)..."
cd "$PROJECT_ROOT/infra"
docker compose --profile dev up -d

echo ""
echo "============================================"
echo "  PostgreSQL is running on localhost:5432"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Open this project in VS Code"
echo "  2. Reopen in Dev Container  (Ctrl+Shift+P → 'Dev Containers: Reopen in Container')"
echo "  3. Inside the Dev Container terminal:"
echo "       cd backend"
echo "       npm run migration:run"
echo "       npm run seed            # optional — loads sample data"
echo "       npm run start:dev"
echo ""
echo "Health check:  curl http://localhost:3000/health"
echo "Stop:          ./scripts/stop.sh"
echo ""
