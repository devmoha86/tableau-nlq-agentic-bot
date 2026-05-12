#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
source "$ROOT_DIR/superset-local/.env"

export SUPERSET_SECRET_KEY
export SUPERSET_CONFIG_PATH="$ROOT_DIR/superset-local/superset_config.py"
export PYTHONPATH="$ROOT_DIR/superset-local${PYTHONPATH:+:$PYTHONPATH}"

superset db upgrade
superset fab create-admin \
  --username "$SUPERSET_ADMIN_USERNAME" \
  --firstname "$SUPERSET_ADMIN_FIRST_NAME" \
  --lastname "$SUPERSET_ADMIN_LAST_NAME" \
  --email "$SUPERSET_ADMIN_EMAIL" \
  --password "$SUPERSET_ADMIN_PASSWORD" || true
superset init

echo "Superset initialized" 
