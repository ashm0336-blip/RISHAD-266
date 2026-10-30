"""Preview-only Time Travel replacement for tools/d1/restore.sh.

No SQL replay, export, automatic retry, targeted account API, Pages mutation or R2 call.
Time Travel restores all D1 data, including accounts and permissions, to the point.
The caller must supply a reviewed bookmark record and an explicit --yes.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import http.client
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tomllib
import uuid

ACCOUNT = '74d8c1d049621ecdda47d3cd74306703'
DATABASE = '9b671cce-2bf3-46e9-84b5-23645227f0e0'
NAME = 'bassam-db-preview'
API_HOST = 'api.cloudflare.com'
RESTORE_PATH = f'/client/v4/accounts/{ACCOUNT}/d1/database/{DATABASE}/time_travel/restore?bookmark='
MAX_RESPONSE_BYTES = 65536
REVIEWED_WRANGLER_VERSION = '4.156.0'
BOOKMARK = re.compile(r'[a-f0-9]{8}-[a-f0-9]{8}-[a-f0-9]{8}-[a-f0-9]{32}')
NEW_TABLES = ['custody_items', 'custody_issues', 'custody_movements', 'custody_requests', 'custody_request_outputs',
              'restore_operations', 'restore_preimage', 'restore_snapshot_manifest',
              'irshad_reports', 'irshad_report_languages', 'irshad_catalog_entries', 'irshad_retro_windows', 'irshad_requests']
SCHEMA8_MIGRATIONS = ['0001_baseline', '0002_enforcement_tables', '0003_aud_legacy_import', '0004_daily_stats',
                      '0005_notifications', '0006_custody', '0007_atomic_restore', '0008_irshad']
STATE_SQL = (
    "SELECT v FROM meta WHERE k='schema_version';"
    'SELECT name FROM d1_migrations ORDER BY id;'
    "SELECT COUNT(*) n FROM meta WHERE k='schema_upgrade_permit_v1';"
    "SELECT name FROM sqlite_master WHERE type='table' AND name IN (" + ','.join("'" + n + "'" for n in NEW_TABLES) + ') ORDER BY name;'
    "SELECT v FROM meta WHERE k='authz_mode';"
)


class Refused(Exception):
    """A fixed, non-sensitive failure code; never print raw CLI output."""


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def stamp():
    return datetime.now(timezone.utc).isoformat()


def local_file(path):
    path = Path(path)
    if path.is_symlink() or not path.is_file() or path.stat().st_size > 65536:
        raise Refused('local-input-invalid')
    return path.read_bytes()


def target_config(path, environment):
    for key, expected in [('KIVO_D1_ID', DATABASE), ('CLOUDFLARE_ACCOUNT_ID', ACCOUNT)]:
        if environment.get(key) and environment[key] != expected:
            raise Refused('preview-environment-target-mismatch')
    raw = local_file(path)
    try:
        config = tomllib.loads(raw.decode('utf-8-sig'))
        if set(config) != {'name', 'account_id', 'compatibility_date', 'd1_databases'}:
            raise ValueError()
        if config['account_id'] != ACCOUNT or len(config['d1_databases']) != 1:
            raise ValueError()
        db = config['d1_databases'][0]
        if set(db) != {'binding', 'database_name', 'database_id', 'migrations_dir'}:
            raise ValueError()
        if (db['binding'], db['database_name'], db['database_id']) != ('DB', NAME, DATABASE):
            raise ValueError()
        if not isinstance(config['name'], str) or not re.fullmatch(r'[a-z0-9-]+', config['name']):
            raise ValueError()
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', config['compatibility_date']):
            raise ValueError()
        migrations = (Path(path).parent / db['migrations_dir']).resolve(strict=True)
        names = sorted(p.stem for p in migrations.glob('*.sql'))
        if len(names) < 7 or any(not re.fullmatch(f'{i:04d}_[a-z0-9_]+', name) for i, name in enumerate(names, 1)):
            raise ValueError()
    except Exception:
        raise Refused('preview-config-invalid') from None
    # A validated immutable snapshot, with no extra resource or environment.
    config['d1_databases'][0]['migrations_dir'] = str(migrations)
    lines = [key + ' = ' + json.dumps(config[key]) for key in ['name', 'account_id', 'compatibility_date']]
    lines.append('[[d1_databases]]')
    lines.extend(key + ' = ' + json.dumps(value) for key, value in config['d1_databases'][0].items())
    return ('\n'.join(lines) + '\n').encode(), names, sha(raw)


def reviewed_record(path, bookmark, names):
    raw = local_file(path)
    try:
        record = json.loads(raw)
        fields = {'version', 'reviewed', 'account_id', 'database_id', 'database_name', 'bookmark', 'bookmark_captured_at',
                  'source_schema', 'expected_schema', 'expected_migrations', 'expected_permit_absent', 'operation_id'}
        if not isinstance(record, dict) or set(record) != fields or type(record['version']) is not int or record['version'] != 1 or record['reviewed'] is not True:
            raise ValueError()
        if (record['account_id'], record['database_id'], record['database_name']) != (ACCOUNT, DATABASE, NAME):
            raise ValueError()
        if record['bookmark'] != bookmark or record['expected_permit_absent'] is not True:
            raise ValueError()
        if type(record['source_schema']) is not int or record['source_schema'] not in (5, 6, 7, 8):
            raise ValueError()
        if type(record['expected_schema']) is not int or record['expected_schema'] not in (5, 6, 7, 8):
            raise ValueError()
        if len(names) < max(record['source_schema'], record['expected_schema']):
            raise ValueError()
        if max(record['source_schema'], record['expected_schema']) == 8 and names[:8] != SCHEMA8_MIGRATIONS:
            raise ValueError()
        if record['expected_migrations'] != names[:record['expected_schema']]:
            raise ValueError()
        operation = uuid.UUID(record['operation_id'])
        if operation.version != 4 or str(operation) != record['operation_id']:
            raise ValueError()
        captured = datetime.fromisoformat(record['bookmark_captured_at'].replace('Z', '+00:00'))
        age = (datetime.now(timezone.utc) - captured).total_seconds()
        if captured.utcoffset() is None or not -60 <= age < 30 * 86400:
            raise ValueError()
    except Exception:
        raise Refused('reviewed-bookmark-record-invalid') from None
    return record, sha(raw)


def metadata(value, schema, names, require_no_permit):
    try:
        if schema not in (5, 6, 7, 8) or len(names) < schema or (schema == 8 and names[:8] != SCHEMA8_MIGRATIONS):
            raise ValueError()
        if not isinstance(value, list) or len(value) != 5 or any(v.get('success') is not True for v in value):
            raise ValueError()
        rows = [v['results'] for v in value]
        if len(rows[0]) != 1 or rows[0][0]['v'] != str(schema):
            raise ValueError()
        ledger = [v['name'] for v in rows[1]]
        if ledger != names[:schema] or any(not isinstance(n, str) for n in ledger):
            raise ValueError()
        if len(rows[2]) != 1 or type(rows[2][0]['n']) is not int or rows[2][0]['n'] not in (0, 1):
            raise ValueError()
        if require_no_permit and rows[2][0]['n'] != 0:
            raise ValueError()
        tables = [v['name'] for v in rows[3]]
        expected = sorted(NEW_TABLES[:5] if schema == 6 else NEW_TABLES[:8] if schema == 7 else NEW_TABLES if schema == 8 else [])
        if tables != expected:
            raise ValueError()
        if len(rows[4]) != 1 or rows[4][0]['v'] != 'enforce':
            raise ValueError()
        return {'schema': schema, 'migrations': ledger, 'permitRows': rows[2][0]['n'], 'upgradeTables': tables, 'authz_mode': 'enforce'}
    except Exception:
        raise Refused('database-metadata-does-not-match-review') from None


def save(path, data):
    temporary = path.with_suffix('.pending.json')
    temporary.write_text(json.dumps(data, indent=2), encoding='utf-8')
    temporary.replace(path)


def wrangler_runtime(environment):
    """Resolve an existing Node + reviewed Wrangler JS, never execute an npm shim."""
    try:
        node_hint = environment.get('KIVO_NODE') or 'node'
        node = shutil.which(node_hint, path=environment.get('PATH'))
        if not node:
            raise ValueError()
        node = Path(node).resolve(strict=True)
        if (not node.is_file() or node.name.lower() not in ('node', 'node.exe', 'nodejs') or
                (os.name == 'nt' and node.suffix.lower() != '.exe')):
            raise ValueError()
        explicit = environment.get('KIVO_WRANGLER_JS')
        candidates = [Path(explicit)] if explicit else [Path(__file__).resolve().parents[2] / 'node_modules/wrangler/bin/wrangler.js']
        if not explicit:
            shim = shutil.which('wrangler', path=environment.get('PATH'))
            if shim:
                shim = Path(shim)
                candidates.extend([shim.resolve(), shim.parent / 'node_modules/wrangler/bin/wrangler.js',
                                   shim.parent.parent / 'wrangler/bin/wrangler.js'])
        for candidate in candidates:
            if not candidate.is_file():
                continue
            entry = candidate.resolve(strict=True)
            if entry.name != 'wrangler.js' or entry.parent.name != 'bin':
                continue
            package = entry.parent.parent
            details = json.loads(local_file(package / 'package.json'))
            if (details.get('name') != 'wrangler' or details.get('version') != REVIEWED_WRANGLER_VERSION or
                    details.get('bin', {}).get('wrangler') != './bin/wrangler.js' or
                    not (package / 'wrangler-dist/cli.js').is_file()):
                continue
            return [str(node), str(entry)]
    except Exception:
        pass
    raise Refused('reviewed-local-node-and-wrangler-js-required-no-install-fallback') from None


def bearer_token(value):
    """Accept only the supported Wrangler JSON token forms, without retaining output."""
    if (not isinstance(value, dict) or set(value) != {'type', 'token'} or
            value['type'] not in ('oauth', 'api_token') or not isinstance(value['token'], str) or
            not 20 <= len(value['token']) <= 4096 or
            not re.fullmatch(r'[A-Za-z0-9._~+/-]+={0,}', value['token'])):
        raise Refused('supported-wrangler-bearer-token-required')
    return value['token']


def single_restore_post(bookmark, token, *, connection_factory=http.client.HTTPSConnection):
    """One stdlib HTTPS request; no redirect, proxy discovery, reconnect or retry loop."""
    if not isinstance(bookmark, str) or not BOOKMARK.fullmatch(bookmark):
        raise Refused('bookmark-format-invalid')
    # Revalidate at the transport boundary before a header can be constructed.
    bearer_token({'type': 'oauth', 'token': token})
    connection = None
    try:
        connection = connection_factory(API_HOST, port=443, timeout=90)
        connection.request('POST', RESTORE_PATH + bookmark, body=None,
                           headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
        response = connection.getresponse()
        if response.status != 200:
            raise Refused('restore-http-status-ambiguous-no-automatic-retry')
        raw = response.read(MAX_RESPONSE_BYTES + 1)
        if len(raw) > MAX_RESPONSE_BYTES:
            raise Refused('restore-response-ambiguous-no-automatic-retry')
        value = json.loads(raw)
        if (not isinstance(value, dict) or value.get('success') is not True or
                value.get('errors') != [] or not isinstance(value.get('result'), dict)):
            raise Refused('restore-response-ambiguous-no-automatic-retry')
        result = value['result']
        if any(not isinstance(result.get(k), str) or not BOOKMARK.fullmatch(result[k])
               for k in ['bookmark', 'previous_bookmark']):
            raise Refused('restore-response-ambiguous-no-automatic-retry')
        return {k: result[k] for k in ['bookmark', 'previous_bookmark']}
    except Refused:
        raise
    except Exception:
        # Never forward exception text, response data, URLs or authentication.
        raise Refused('restore-transport-ambiguous-no-automatic-retry') from None
    finally:
        if connection is not None:
            try:
                connection.close()
            except Exception:
                pass


def execute(argv=None, *, run=subprocess.run, post=single_restore_post, environment=None):
    parser = argparse.ArgumentParser(description='Preview Time Travel restore; a reviewed bookmark and --yes are mandatory.')
    parser.add_argument('database')
    parser.add_argument('--bookmark', required=True)
    parser.add_argument('--review', required=True)
    parser.add_argument('--evidence-dir', required=True)
    parser.add_argument('--config', default=str(Path(__file__).resolve().parents[2] / 'config/wrangler.preview.toml'))
    parser.add_argument('--yes', action='store_true')
    args = parser.parse_args(argv)
    environment = dict(os.environ if environment is None else environment)
    if args.database != NAME:
        raise Refused('only-fixed-preview-database-is-allowed')
    if not args.yes:
        raise Refused('explicit-yes-required')
    if not BOOKMARK.fullmatch(args.bookmark):
        raise Refused('bookmark-format-invalid')
    snapshot, names, config_sha = target_config(args.config, environment)
    review, review_sha = reviewed_record(args.review, args.bookmark, names)
    cli_prefix = wrangler_runtime(environment)
    evidence = Path(args.evidence_dir)
    try:
        evidence.mkdir(parents=True, exist_ok=False)
    except OSError:
        raise Refused('new-evidence-directory-claim-required-no-automatic-resume') from None
    evidence = evidence.resolve()
    config_path, journal_path = evidence / 'target.preview.toml', evidence / 'restore-journal.json'
    config_path.write_bytes(snapshot)
    journal = {'version': 1, 'started_at': stamp(), 'status': 'preflight', 'account_id': ACCOUNT, 'database_id': DATABASE,
               'database_name': NAME, 'review_sha256': review_sha, 'source_config_sha256': config_sha,
               'config_snapshot_sha256': sha(snapshot), 'operation_id': review['operation_id'], 'target_bookmark': args.bookmark,
               'destructive_attempts': 0, 'full_database_exported': False, 'r2_calls': 0}
    save(journal_path, journal)
    cli_env = {**environment, 'CLOUDFLARE_ACCOUNT_ID': ACCOUNT, 'KIVO_D1_ID': DATABASE,
               'WRANGLER_SEND_METRICS': 'false', 'CLOUDFLARE_SEND_METRICS': 'false',
               'WRANGLER_WRITE_LOGS': 'false', 'WRANGLER_LOG': 'error', 'WRANGLER_LOG_SANITIZE': 'true'}

    def wrangler(command):
        if sha(config_path.read_bytes()) != sha(snapshot):
            raise Refused('validated-config-snapshot-changed')
        result = run([*cli_prefix, *command, '--config', str(config_path), '--json'], shell=False,
                     stdin=subprocess.DEVNULL, capture_output=True, text=True, encoding='utf-8',
                     errors='replace', timeout=90, check=False, env=cli_env, cwd=str(evidence))
        if result.returncode != 0:
            raise Refused('wrangler-command-failed-inspect-journal')
        if len(result.stdout) > MAX_RESPONSE_BYTES:
            raise Refused('wrangler-result-invalid-inspect-journal')
        if command[:2] == ['auth', 'token'] and result.stderr:
            raise Refused('supported-wrangler-bearer-token-required')
        try:
            return json.loads(result.stdout)
        except Exception:
            raise Refused('wrangler-result-invalid-inspect-journal') from None

    try:
        info = wrangler(['d1', 'info', NAME])
        if not isinstance(info, dict) or (info.get('uuid'), info.get('name')) != (DATABASE, NAME):
            raise Refused('live-preview-identity-mismatch')
        current = wrangler(['d1', 'time-travel', 'info', NAME])
        if not isinstance(current, dict) or not isinstance(current.get('bookmark'), str) or not BOOKMARK.fullmatch(current['bookmark']):
            raise Refused('current-bookmark-unavailable')
        journal['current_bookmark_before_restore'] = current['bookmark']
        journal['before'] = metadata(wrangler(['d1', 'execute', NAME, '--remote', '--command', STATE_SQL]), review['source_schema'], names, False)
        # The supported command may refresh local OAuth state; capture credentials only in memory.
        token = bearer_token(wrangler(['auth', 'token']))
        # Persist intent BEFORE the single destructive HTTP dispatch. Never call CLI restore.
        journal['status'], journal['destructive_attempts'], journal['restore_dispatched_at'] = 'restore-requested', 1, stamp()
        save(journal_path, journal)
        try:
            result = post(args.bookmark, token)
        finally:
            token = None
        if not isinstance(result, dict) or any(not isinstance(result.get(k), str) or not BOOKMARK.fullmatch(result[k]) for k in ['bookmark', 'previous_bookmark']):
            raise Refused('restore-result-ambiguous-no-automatic-retry')
        journal['returned_bookmark'], journal['previous_bookmark'] = result['bookmark'], result['previous_bookmark']
        journal['status'] = 'restored-awaiting-verification'
        save(journal_path, journal)
        journal['after'] = metadata(wrangler(['d1', 'execute', NAME, '--remote', '--command', STATE_SQL]), review['expected_schema'], names, True)
        journal['status'], journal['completed_at'] = 'verified', stamp()
        save(journal_path, journal)
        return journal
    except Exception as error:
        journal['status'] = 'restore-ambiguous-no-automatic-retry' if journal['destructive_attempts'] else 'preflight-refused'
        if 'previous_bookmark' in journal:
            journal['status'] = 'restored-but-verification-failed-no-automatic-retry'
        journal['failure_code'] = str(error) if isinstance(error, Refused) else 'transport-or-local-failure-inspect-journal'
        journal['stopped_at'] = stamp()
        try:
            save(journal_path, journal)
        except Exception:
            # The disk may remain unavailable; do not expose raw exceptions or retry HTTP.
            raise Refused(journal['status'] + ': journal-unavailable-no-automatic-retry') from None
        raise Refused(journal['status'] + ': ' + journal['failure_code']) from None


if __name__ == '__main__':
    try:
        result = execute()
        print(json.dumps({'ok': True, 'status': result['status'], 'database': NAME, 'schema': result['after']['schema'], 'automatic_retry': False}))
    except Refused as error:
        print(json.dumps({'ok': False, 'error': str(error), 'automatic_retry': False}), file=sys.stderr)
        raise SystemExit(2)
