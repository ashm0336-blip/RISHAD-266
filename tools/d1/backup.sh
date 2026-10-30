#!/usr/bin/env bash
# Usage: bash tools/d1/backup.sh bassam-db-preview [private-output-directory]
# Preview only. No environment flag permits access to Production.
set -euo pipefail
require_preview_name() {
  if [ "$1" != "bassam-db-preview" ]; then
    echo "Production/unknown database is forbidden; only bassam-db-preview is allowed." >&2; return 2
  fi
  if [ -n "${KIVO_D1_ID:-}" ] && [ "$KIVO_D1_ID" != "9b671cce-2bf3-46e9-84b5-23645227f0e0" ]; then
    echo "KIVO_D1_ID does not match the verified Preview database." >&2; return 2
  fi
  if [ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ] && [ "$CLOUDFLARE_ACCOUNT_ID" != "74d8c1d049621ecdda47d3cd74306703" ]; then
    echo "CLOUDFLARE_ACCOUNT_ID does not match the verified Preview account." >&2; return 2
  fi
}
# Snapshot the validated config so a concurrent source edit cannot retarget an operation.
preview_config() {
  local root py
  root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
  py=${KIVO_PYTHON:-python3}
  "$py" - "$root/config/wrangler.preview.toml" "${1:-}" <<'PY'
import json, pathlib, sys, tempfile, tomllib
try:
    source = pathlib.Path(sys.argv[1])
    if source.is_symlink(): raise ValueError('Preview config must not be a symlink')
    config = tomllib.loads(source.read_text(encoding='utf-8'))
    if set(config) != {'name', 'account_id', 'compatibility_date', 'd1_databases'}:
        raise ValueError('Unexpected resource or environment in Preview config')
    if config['account_id'] != '74d8c1d049621ecdda47d3cd74306703': raise ValueError('Preview account mismatch')
    if len(config['d1_databases']) != 1: raise ValueError('Exactly one Preview database is required')
    db = config['d1_databases'][0]
    if set(db) != {'binding', 'database_name', 'database_id', 'migrations_dir'}: raise ValueError('Unexpected database options')
    if (db['binding'], db['database_name'], db['database_id']) != ('DB', 'bassam-db-preview', '9b671cce-2bf3-46e9-84b5-23645227f0e0'):
        raise ValueError('Preview database identity mismatch')
    migrations = (source.parent / db['migrations_dir']).resolve()
    if sys.argv[2] and pathlib.Path(sys.argv[2]).resolve() != migrations: raise ValueError('Migration directory mismatch')
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', newline='\n', suffix='.toml', prefix='rishad_preview_', delete=False) as out:
        for key in ('name', 'account_id', 'compatibility_date'): out.write(key + ' = ' + json.dumps(config[key]) + '\n')
        out.write('[[d1_databases]]\n')
        for key in ('binding', 'database_name', 'database_id'): out.write(key + ' = ' + json.dumps(db[key]) + '\n')
        out.write('migrations_dir = ' + json.dumps(str(migrations)) + '\n')
        result = out.name
    print(result)
except Exception as error:
    print('Invalid Preview target configuration: ' + str(error), file=sys.stderr)
    sys.exit(2)
PY
}
# Share guards with migrate, without executing a backup when sourced.
if [ "${BASH_SOURCE[0]}" != "$0" ]; then return 0; fi
DB=${1:?database name}; OUT=${2:-backups}
require_preview_name "$DB"
command -v wrangler >/dev/null || { echo "wrangler is not installed" >&2; exit 3; }
CFG=$(preview_config); trap 'rm -f "$CFG"' EXIT
PY=${KIVO_PYTHON:-python3}; TS=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p "$OUT"; F="$OUT/${DB}_${TS}.sql"
wrangler d1 export "$DB" --remote --config "$CFG" --output "$F"
sha256sum "$F" > "$F.sha256"
"$PY" "$(dirname "$0")/verify.py" "$F" --manifest "$F.manifest.json"
echo "Preview backup: $F ($(wc -c < "$F") bytes)"
