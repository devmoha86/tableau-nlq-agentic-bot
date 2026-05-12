#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
source "$ROOT_DIR/superset-local/.env"

export SUPERSET_SECRET_KEY
export SUPERSET_CONFIG_PATH="$ROOT_DIR/superset-local/superset_config.py"
export PYTHONPATH="$ROOT_DIR/superset-local${PYTHONPATH:+:$PYTHONPATH}"

superset run -h 0.0.0.0 -p "$SUPERSET_PORT" --with-threads
