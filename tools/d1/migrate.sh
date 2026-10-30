#!/usr/bin/env bash
# Usage: bash tools/d1/migrate.sh bassam-db-preview migrations [--list|--no-backup]
# Preview only. Production cannot be enabled with an environment override.
set -euo pipefail
source "$(dirname "$0")/backup.sh"
DB=${1:?database name}; DIR=${2:?migrations dir}; MODE=${3:-apply}
[ "$DB" = "bassam-db" ] && { echo "Production is forbidden without exception." >&2; exit 2; }
require_preview_name "$DB"
[ -d "$DIR" ] || { echo "Migration directory does not exist: $DIR" >&2; exit 5; }
case "$MODE" in apply|--list|--no-backup) ;; *) echo "Unknown migration mode" >&2; exit 4 ;; esac
command -v wrangler >/dev/null || { echo "wrangler is not installed" >&2; exit 3; }
CFG=$(preview_config "$DIR"); trap 'rm -f "$CFG"' EXIT
PY=${KIVO_PYTHON:-python3}
if [ "$MODE" = "--list" ]; then wrangler d1 migrations list "$DB" --remote --config "$CFG"; exit 0; fi
[ "$MODE" = "--no-backup" ] || "${KIVO_BASH:-bash}" "$(dirname "$0")/backup.sh" "$DB" "backups/pre-migrate"
wrangler d1 migrations apply "$DB" --remote --config "$CFG"
wrangler d1 execute "$DB" --remote --config "$CFG" --json --command "SELECT name FROM d1_migrations ORDER BY id;" | "$PY" -c "import json,sys; r=json.load(sys.stdin)[0]['results']; print('Applied:', ', '.join(x['name'] for x in r))"
wrangler d1 execute "$DB" --remote --config "$CFG" --json --command "SELECT v FROM meta WHERE k='schema_version';" | "$PY" -c "import json,sys; r=json.load(sys.stdin)[0]['results']; print('schema_version =', r[0]['v'] if r else 'unknown')"
