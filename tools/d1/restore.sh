#!/usr/bin/env bash
# Preview only. Never replays SQL dumps or exports a database.
# Usage: restore.sh bassam-db-preview --bookmark BOOKMARK --review review.json --evidence-dir DIR --yes
set -euo pipefail
PY=${KIVO_PYTHON:-python3}
exec "$PY" "$(dirname "$0")/restore_bookmark.py" "$@"
