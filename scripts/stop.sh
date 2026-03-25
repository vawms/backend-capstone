#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT/infra"

CLEAN=false
for arg in "$@"; do
  case $arg in
    --clean|-v) CLEAN=true ;;
  esac
done

if [ "$CLEAN" = true ]; then
  echo "Stopping all services and removing volumes..."
  docker compose --profile dev --profile qa down -v
else
  echo "Stopping all services..."
  docker compose --profile dev --profile qa down
fi

echo "Done."
