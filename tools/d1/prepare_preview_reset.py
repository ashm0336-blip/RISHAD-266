#!/usr/bin/env python3
"""Usage: python tools/d1/prepare_preview_reset.py INVENTORY.json OUTPUT.sql --disposable-preview

Prepare, but NEVER execute, a reset for the explicitly disposable Preview database.
The inventory must come from a fresh read of sqlite_master in the verified Preview UI.
No credentials, account data, R2 operations, remote calls, or production targets.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import tomllib

ROOT = Path(__file__).resolve().parents[2]
PREVIEW = '9b671cce-2bf3-46e9-84b5-23645227f0e0'
ACCOUNT = '74d8c1d049621ecdda47d3cd74306703'


def prepare(inventory, config, migration_dir):
    bindings = config.get('d1_databases', [])
    if config.get('account_id') != ACCOUNT or len(bindings) != 1:
        raise ValueError('Expected the verified Preview account and one database')
    binding = bindings[0]
    if binding.get('database_name') != 'bassam-db-preview' or binding.get('database_id') != PREVIEW:
        raise ValueError('Only the verified disposable Preview database is permitted')
    if set(config) - {'name', 'account_id', 'compatibility_date', 'd1_databases'}:
        raise ValueError('Additional resources or environments are not allowed')
    if inventory.get('database_id') != PREVIEW or inventory.get('database_name') != 'bassam-db-preview':
        raise ValueError('Inventory does not identify the verified Preview database')
    tables = inventory.get('tables')
    if not isinstance(tables, list) or not tables or len(tables) != len(set(tables)):
        raise ValueError('A nonempty, unique table inventory is required')
    if any(not re.fullmatch(r'[A-Za-z][A-Za-z0-9_]*', t) or t.startswith(('sqlite_', '_cf_')) for t in tables):
        raise ValueError('Unsafe or provider-managed table in inventory')
    migrations = sorted(Path(migration_dir).glob('*.sql'))
    if not migrations:
        raise ValueError('No source migrations found')
    for i, migration in enumerate(migrations, 1):
        if not re.fullmatch(rf'{i:04d}_[a-z0-9_]+\.sql', migration.name):
            raise ValueError('Source migrations must form a contiguous sequence')
    user_tables = "type='table' AND name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*'"
    expected = ','.join("'" + table + "'" for table in sorted(tables))
    lines = [
        '-- DISPOSABLE PREVIEW RESET: bassam-db-preview',
        '-- Database UUID: ' + PREVIEW,
        '-- Execute ONLY in that verified database. This file does not select a remote target.',
        '-- All current Preview tables/data are removed; no R2 operations are included.',
        '-- Refuse a stale inventory before any table is changed.',
        'SELECT CASE WHEN (SELECT COUNT(*) FROM sqlite_master WHERE ' + user_tables + ') <> ' + str(len(tables)) +
        ' OR EXISTS (SELECT 1 FROM sqlite_master WHERE ' + user_tables + ' AND name NOT IN (' + expected + ")) THEN json_extract('{}', 'KIVO_PREVIEW_INVENTORY_CHANGED') END;",
        'PRAGMA defer_foreign_keys = ON;',
    ]
    lines.extend('DROP TABLE IF EXISTS "' + table + '";' for table in sorted(tables, reverse=True))
    lines.append('CREATE TABLE d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP);')
    for migration in migrations:
        lines.extend([migration.read_text(encoding='utf-8'),
                      "INSERT INTO d1_migrations(name) VALUES ('" + migration.stem + "');"])
    lines.extend([
        "INSERT INTO meta(k,v) VALUES ('authz_mode','enforce') ON CONFLICT(k) DO UPDATE SET v=excluded.v;",
        'PRAGMA defer_foreign_keys = OFF;',
        'PRAGMA foreign_key_check;',
        'SELECT name FROM d1_migrations ORDER BY id;',
        "SELECT k,v FROM meta WHERE k IN ('schema_version','authz_mode') ORDER BY k;",
    ])
    return '\n'.join(lines) + '\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('inventory', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--disposable-preview', action='store_true')
    args = parser.parse_args()
    if not args.disposable_preview:
        parser.error('Explicit --disposable-preview authorization is required')
    config = tomllib.loads((ROOT / 'config/wrangler.preview.toml').read_text(encoding='utf-8'))
    inventory = json.loads(args.inventory.read_text(encoding='utf-8'))
    sql = prepare(inventory, config, ROOT / 'migrations')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(sql, encoding='utf-8', newline='\n')
    print(json.dumps({'target': 'bassam-db-preview', 'database_id': PREVIEW,
                      'tables_to_reset': len(inventory['tables']), 'sql_sha256': hashlib.sha256(sql.encode()).hexdigest(),
                      'output': str(args.output), 'executed': False}))


if __name__ == '__main__':
    main()
