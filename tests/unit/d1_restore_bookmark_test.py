"""Mocked Wrangler and HTTPS only. No real credentials, cloud calls or restores."""
import copy
from datetime import datetime, timedelta, timezone
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import threading
from types import SimpleNamespace
import unittest
import uuid
from unittest.mock import patch
from contextlib import redirect_stdout, redirect_stderr

HERE = Path(__file__).resolve().parent
ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('restore_bookmark_under_test', ROOT / 'tools/d1/restore_bookmark.py')
r = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r)

TARGET = '00000001-00000002-00000003-' + 'a' * 32
CURRENT = '00000005-00000006-00000007-' + 'b' * 32
RESTORED = '00000009-0000000a-0000000b-' + 'c' * 32
NAMES = ['0001_baseline', '0002_enforcement_tables', '0003_aud_legacy_import', '0004_daily_stats',
         '0005_notifications', '0006_custody', '0007_atomic_restore', '0008_irshad']
CU_TABLES = ['custody_items', 'custody_issues', 'custody_movements', 'custody_requests', 'custody_request_outputs']
RESTORE_TABLES = ['restore_operations', 'restore_preimage', 'restore_snapshot_manifest']
IR_TABLES = ['irshad_reports', 'irshad_report_languages', 'irshad_catalog_entries', 'irshad_retro_windows', 'irshad_requests']
SCHEMA_TABLES = {5: [], 6: CU_TABLES, 7: CU_TABLES + RESTORE_TABLES, 8: CU_TABLES + RESTORE_TABLES + IR_TABLES}
TOKEN = 'TEST_ONLY_mock_bearer_token_never_real'


def state(n, permit=0):
    tables = SCHEMA_TABLES[n]
    return [{'success': True, 'results': [{'v': str(n)}]},
            {'success': True, 'results': [{'name': v} for v in NAMES[:n]]},
            {'success': True, 'results': [{'n': permit}]},
            {'success': True, 'results': [{'name': v} for v in sorted(tables)]},
            {'success': True, 'results': [{'v': 'enforce'}]}]


class FakeWrangler:
    def __init__(self, owner, failure=None):
        self.owner, self.failure, self.calls, self.restores = owner, failure, [], 0
        self.http_calls, self.connections, self.closed, self.post_calls = [], 0, 0, 0

    def __call__(self, args, **options):
        self.owner.assertEqual(args[:2], [self.owner.node, str(self.owner.entry)])
        args = ['wrangler', *args[2:]]
        self.calls.append(args)
        if args[:3] == ['wrangler', 'd1', 'info']:
            value = {'uuid': r.DATABASE, 'name': r.NAME}
            if self.failure == 'identity': value['uuid'] = 'TEST_ONLY_wrong_database'
            if self.failure == 'snapshot':
                Path(args[args.index('--config') + 1]).write_text('TEST_ONLY_mutated', encoding='utf-8')
            if self.failure == 'source-config': self.owner.config.write_text('TEST_ONLY_changed_source', encoding='utf-8')
        elif args[:4] == ['wrangler', 'd1', 'time-travel', 'info']:
            value = {'bookmark': CURRENT}
        elif args[:3] == ['wrangler', 'd1', 'execute']:
            self.owner.assertEqual(args[args.index('--command') + 1], r.STATE_SQL)
            value = state(self.owner.record['source_schema'] if not self.restores else self.owner.record['expected_schema'])
            if not self.restores and self.failure == 'null-ledger': value[1]['results'][3]['name'] = None
            if self.restores and self.failure == 'post-permit': value[2]['results'][0]['n'] = 1
            if self.restores and self.failure == 'post-tables': value[3]['results'] = [{'name': 'custody_items'}]
            if not self.restores and self.failure == 'pre-legacy-authz': value[4]['results'][0]['v'] = 'legacy'
            if self.restores and self.failure == 'post-legacy-authz': value[4]['results'][0]['v'] = 'legacy'
            if self.restores and self.failure == 'post-ir-table': value[3]['results'] = sorted(value[3]['results'] + [{'name': IR_TABLES[0]}], key=lambda row: row['name'])
            if not self.restores and self.failure == 'pre-ir-table-missing': value[3]['results'] = [row for row in value[3]['results'] if row['name'] != IR_TABLES[-1]]
            if not self.restores and self.failure == 'pre-ledger-null': value[1]['results'][-1]['name'] = None
            if not self.restores and self.failure == 'pre-ledger-short': value[1]['results'].pop()
            if not self.restores and self.failure == 'pre-ledger-wrong': value[1]['results'][-1]['name'] = '0008_TEST_ONLY_wrong'
            if not self.restores and self.failure == 'pre-ledger-extra': value[1]['results'].append({'name': '0009_TEST_ONLY_extra'})
            if not self.restores and self.failure == 'pre-ledger-order': value[1]['results'].reverse()
        elif args[:3] == ['wrangler', 'auth', 'token']:
            value = {'type': 'oauth', 'token': TOKEN}
            if self.failure == 'auth-api-token': value['type'] = 'api_token'
            if self.failure == 'auth-api-key': value = {'type': 'api_key', 'key': TOKEN, 'email': 'TEST_ONLY@example.invalid'}
            if self.failure == 'auth-unknown': value['type'] = 'unknown'
            if self.failure == 'auth-extra': value['extra'] = TOKEN
            if self.failure == 'auth-newline': value['token'] += '\r\n'
            if self.failure == 'auth-short': value['token'] = 'short'
            if self.failure == 'auth-long': value['token'] = 'a' * 4097
            if self.failure == 'auth-stdout': return SimpleNamespace(returncode=0, stdout=TOKEN, stderr='')
            if self.failure == 'auth-error': return SimpleNamespace(returncode=1, stdout=TOKEN, stderr=TOKEN)
            if self.failure == 'auth-stderr': return SimpleNamespace(returncode=0, stdout=json.dumps(value), stderr=TOKEN)
            if self.failure == 'auth-timeout': raise subprocess.TimeoutExpired(args, 90, output=TOKEN, stderr=TOKEN)
        else:
            raise AssertionError('Unexpected command: ' + repr(args))
        self.owner.assertEqual(options['stdin'], subprocess.DEVNULL)
        self.owner.assertIs(options['shell'], False)
        self.owner.assertEqual(options['env']['CLOUDFLARE_ACCOUNT_ID'], r.ACCOUNT)
        self.owner.assertEqual(options['env']['WRANGLER_WRITE_LOGS'], 'false')
        self.owner.assertEqual(options['env']['WRANGLER_LOG_SANITIZE'], 'true')
        self.owner.assertEqual(options['env']['WRANGLER_LOG'], 'error')
        self.owner.assertTrue(options['capture_output'])
        return SimpleNamespace(returncode=0, stdout=json.dumps(value), stderr='')

    def post(self, bookmark, token):
        self.post_calls += 1
        return r.single_restore_post(bookmark, token, connection_factory=self.connection)

    def connection(self, host, **options):
        self.connections += 1
        self.owner.assertEqual(host, r.API_HOST)
        self.owner.assertEqual(options, {'port': 443, 'timeout': 90})
        return self

    def request(self, method, path, body=None, headers=None):
        self.http_calls.append((method, path, body, headers))
        self.restores += 1
        self.owner.assertEqual((method, path, body), ('POST', r.RESTORE_PATH + TARGET, None))
        self.owner.assertEqual(headers, {'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json'})
        journal = json.loads((self.owner.evidence / 'restore-journal.json').read_text('utf-8'))
        self.owner.assertEqual(journal['destructive_attempts'], 1, 'Attempt is persisted before HTTP dispatch')
        if self.failure == 'timeout': raise TimeoutError(TOKEN)

    def getresponse(self):
        status = int(self.failure.split('-')[1]) if self.failure and self.failure.startswith('http-') else 200
        if self.failure == 'nonzero': status = 503
        return SimpleNamespace(status=status, read=self.read)

    def read(self, limit):
        self.owner.assertEqual(limit, r.MAX_RESPONSE_BYTES + 1)
        if self.failure == 'read-timeout': raise TimeoutError(TOKEN)
        if self.failure == 'malformed': return TOKEN.encode()
        if self.failure == 'oversize': return TOKEN.encode() + b'a' * r.MAX_RESPONSE_BYTES
        result = {'bookmark': RESTORED, 'previous_bookmark': CURRENT}
        if self.failure == 'missing-previous': del result['previous_bookmark']
        value = {'success': True, 'errors': [], 'result': result}
        if self.failure == 'api-failed': value.update(success=False, errors=[{'message': TOKEN}])
        if self.failure == 'api-errors': value['errors'] = [{'message': TOKEN}]
        return json.dumps(value).encode()

    def close(self): self.closed += 1


class Safety(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='rishad-d1-restore-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.node = shutil.which('node')
        self.assertIsNotNone(self.node, 'Local Node executable is a required tool runtime; never install it automatically')
        self.node = str(Path(self.node).resolve())
        package = self.root / 'node_modules/wrangler'
        (package / 'bin').mkdir(parents=True)
        (package / 'wrangler-dist').mkdir()
        self.entry = package / 'bin/wrangler.js'
        self.entry.write_text('// TEST_ONLY local transport fixture', encoding='utf-8')
        (package / 'wrangler-dist/cli.js').write_text('// TEST_ONLY', encoding='utf-8')
        (package / 'package.json').write_text(json.dumps({'name': 'wrangler', 'version': r.REVIEWED_WRANGLER_VERSION,
                                                      'bin': {'wrangler': './bin/wrangler.js'}}), encoding='utf-8')
        # Windows Node's crypto initialization needs SYSTEMROOT even for an offline script.
        self.environment = {key: os.environ[key] for key in ['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP'] if key in os.environ}
        self.environment.update(KIVO_NODE=self.node, KIVO_WRANGLER_JS=str(self.entry))
        migrations = self.root / 'migrations'; migrations.mkdir()
        for name in NAMES: (migrations / (name + '.sql')).write_text('-- TEST_ONLY metadata, never executed', encoding='utf-8')
        self.config = self.root / 'preview.toml'
        self.config_text = '\n'.join([
            'name="rishad-266-preview-tools"', 'account_id=' + json.dumps(r.ACCOUNT), 'compatibility_date="2024-11-01"',
            '[[d1_databases]]', 'binding="DB"', 'database_name=' + json.dumps(r.NAME),
            'database_id=' + json.dumps(r.DATABASE), 'migrations_dir="migrations"', ''])
        self.config.write_text(self.config_text, encoding='utf-8')
        self.record = {'version': 1, 'reviewed': True, 'account_id': r.ACCOUNT, 'database_id': r.DATABASE, 'database_name': r.NAME,
                       'bookmark': TARGET, 'bookmark_captured_at': datetime.now(timezone.utc).isoformat(),
                       'source_schema': 7, 'expected_schema': 5, 'expected_migrations': NAMES[:5],
                       'expected_permit_absent': True, 'operation_id': str(uuid.uuid4())}
        self.review = self.root / 'review.json'; self.write_review()
        self.evidence = self.root / 'evidence'

    def write_review(self): self.review.write_text(json.dumps(self.record), encoding='utf-8')
    def args(self): return [r.NAME, '--bookmark', TARGET, '--review', str(self.review), '--config', str(self.config), '--evidence-dir', str(self.evidence), '--yes']
    def run_tool(self, args=None, failure=None, environment=None):
        fake = FakeWrangler(self, failure)
        self.last = fake
        return r.execute(args or self.args(), run=fake, post=fake.post, environment={**self.environment, **(environment or {})})

    def test_success_saves_current_previous_and_final_schema_without_export(self):
        journal = self.run_tool()
        self.assertEqual(journal['status'], 'verified'); self.assertEqual(self.last.restores, 1)
        self.assertEqual(journal['current_bookmark_before_restore'], CURRENT)
        self.assertEqual(journal['previous_bookmark'], CURRENT); self.assertEqual(journal['returned_bookmark'], RESTORED)
        self.assertEqual(journal['after']['schema'], 5); self.assertEqual(journal['after']['migrations'], NAMES[:5])
        self.assertFalse(journal['full_database_exported']); self.assertEqual(journal['r2_calls'], 0)
        flat = [arg for call in self.last.calls for arg in call]
        self.assertNotIn('export', flat); self.assertNotIn('--file', flat); self.assertNotIn('DROP', flat)
        self.assertNotIn('restore', flat, 'Destructive Wrangler command must never be used')
        self.assertEqual((self.last.post_calls, self.last.connections, self.last.closed), (1, 1, 1))

    def test_production_and_unknown_targets_fail_before_any_transport(self):
        for name in ['bassam-db', 'other', r.DATABASE, 'BASSAM-DB-PREVIEW']:
            with self.subTest(name=name), self.assertRaises(r.Refused):
                args = self.args(); args[0] = name; self.run_tool(args, environment={'KIVO_ALLOW_PROD_MIGRATE': '1'})
            self.assertEqual(self.last.calls, [])

    def test_explicit_yes_is_mandatory_before_any_transport(self):
        with self.assertRaisesRegex(r.Refused, 'explicit-yes'): self.run_tool(self.args()[:-1])
        self.assertEqual(self.last.calls, [])

    def test_invalid_or_sql_file_bookmarks_fail_before_any_transport(self):
        for value in ['backup.sql', '', TARGET + '?force=true', 'TEST_ONLY', '../../other']:
            with self.subTest(value=value), self.assertRaises(r.Refused):
                args = self.args(); args[2] = value; self.run_tool(args)
            self.assertEqual(self.last.calls, [])

    def test_extra_resources_wrong_database_and_environment_overrides_fail_before_transport(self):
        for text in [self.config_text.replace(r.DATABASE, 'TEST_ONLY'), self.config_text.replace(r.ACCOUNT, 'TEST_ONLY'),
                     self.config_text + '\n[[r2_buckets]]\nbinding="IMG_R2"\nbucket_name="TEST_ONLY"\n',
                     self.config_text + '\n[env.production]\nname="TEST_ONLY"\n']:
            self.config.write_text(text, encoding='utf-8')
            with self.assertRaises(r.Refused): self.run_tool()
            self.assertEqual(self.last.calls, [])
        self.config.write_text(self.config_text, encoding='utf-8')
        with self.assertRaises(r.Refused): self.run_tool(environment={'CLOUDFLARE_ACCOUNT_ID': 'TEST_ONLY_other'})
        self.assertEqual(self.last.calls, [])

    def test_reviewed_record_must_match_target_schema_ledger_bookmark_and_recent_capture(self):
        original = copy.deepcopy(self.record)
        for update in [{'reviewed': False}, {'bookmark': CURRENT}, {'expected_schema': 5, 'expected_migrations': NAMES[:4]},
                       {'database_id': 'TEST_ONLY_other'}, {'expected_permit_absent': False}, {'extra': True},
                       {'bookmark_captured_at': (datetime.now(timezone.utc) - timedelta(days=31)).isoformat()}]:
            self.record = {**original, **update}; self.write_review()
            with self.assertRaises(r.Refused): self.run_tool()
            self.assertEqual(self.last.calls, [])

    def test_wrong_live_identity_and_null_ledger_fail_before_restore(self):
        for failure in ['identity', 'null-ledger']:
            with self.subTest(failure=failure), self.assertRaises(r.Refused): self.run_tool(failure=failure)
            self.assertEqual(self.last.restores, 0)
            self.evidence = self.root / ('next-' + failure)

    def test_validated_config_snapshot_cannot_be_retargeted_before_restore(self):
        with self.assertRaises(r.Refused): self.run_tool(failure='snapshot')
        self.assertEqual(self.last.restores, 0)

    def test_checked_in_config_changes_do_not_retarget_the_immutable_snapshot(self):
        self.assertEqual(self.run_tool(failure='source-config')['status'], 'verified')
        snapshot = (self.evidence / 'target.preview.toml').read_text('utf-8')
        self.assertIn(r.DATABASE, snapshot); self.assertIn(r.ACCOUNT, snapshot)

    def test_uncertain_restore_failures_are_never_retried_or_automatically_resumed(self):
        for failure in ['timeout', 'read-timeout', 'nonzero', 'malformed', 'missing-previous', 'oversize', 'api-failed', 'api-errors']:
            self.evidence = self.root / failure
            with self.subTest(failure=failure), self.assertRaisesRegex(r.Refused, 'no-automatic-retry'): self.run_tool(failure=failure)
            calls, restores = len(self.last.calls), self.last.restores
            self.assertEqual(restores, 1)
            journal = json.loads((self.evidence / 'restore-journal.json').read_text('utf-8'))
            self.assertEqual(journal['current_bookmark_before_restore'], CURRENT)
            with self.assertRaisesRegex(r.Refused, 'no-automatic-resume'):
                r.execute(self.args(), run=self.last, post=self.last.post, environment=self.environment)
            self.assertEqual(len(self.last.calls), calls); self.assertEqual(self.last.restores, restores)
            self.assertEqual((self.last.post_calls, self.last.connections, self.last.closed), (1, 1, 1))

    def test_421_and_all_redirect_statuses_dispatch_once_without_follow_or_cli_fallback(self):
        for status in [421, 301, 302, 303, 307, 308]:
            self.evidence = self.root / ('http-' + str(status))
            with self.subTest(status=status), self.assertRaisesRegex(r.Refused, 'no-automatic-retry'):
                self.run_tool(failure='http-' + str(status))
            self.assertEqual((self.last.post_calls, self.last.restores, self.last.connections, self.last.closed), (1, 1, 1, 1))
            self.assertEqual(len(self.last.http_calls), 1)
            self.assertNotIn('restore', [arg for call in self.last.calls for arg in call])

    def test_auth_unsupported_malformed_or_failed_output_refuses_before_destructive_intent_without_token_leak(self):
        for failure in ['auth-api-key', 'auth-unknown', 'auth-extra', 'auth-newline', 'auth-short', 'auth-long',
                        'auth-stdout', 'auth-error', 'auth-stderr', 'auth-timeout']:
            self.evidence = self.root / failure
            out, err = io.StringIO(), io.StringIO()
            with self.subTest(failure=failure), redirect_stdout(out), redirect_stderr(err):
                with self.assertRaises(r.Refused) as caught: self.run_tool(failure=failure)
            self.assertEqual((self.last.post_calls, self.last.restores, self.last.connections), (0, 0, 0))
            journal = json.loads((self.evidence / 'restore-journal.json').read_text('utf-8'))
            self.assertEqual(journal['destructive_attempts'], 0)
            self.assertEqual(journal['status'], 'preflight-refused')
            self.assertNotIn(TOKEN, str(caught.exception) + out.getvalue() + err.getvalue())
            self.assertEqual(out.getvalue() + err.getvalue(), '')
            for path in self.evidence.iterdir(): self.assertNotIn(TOKEN, path.read_text('utf-8'))

    def test_supported_api_token_succeeds_with_secret_only_in_memory(self):
        out, err = io.StringIO(), io.StringIO()
        with redirect_stdout(out), redirect_stderr(err):
            self.assertEqual(self.run_tool(failure='auth-api-token')['status'], 'verified')
        self.assertEqual(out.getvalue() + err.getvalue(), '')
        for path in self.evidence.iterdir(): self.assertNotIn(TOKEN, path.read_text('utf-8'))

    def test_transport_exception_and_provider_body_never_leak_auth_or_body(self):
        for failure in ['timeout', 'read-timeout', 'malformed', 'api-failed', 'api-errors']:
            self.evidence = self.root / failure
            out, err = io.StringIO(), io.StringIO()
            with redirect_stdout(out), redirect_stderr(err):
                with self.assertRaises(r.Refused) as caught: self.run_tool(failure=failure)
            self.assertNotIn(TOKEN, str(caught.exception) + out.getvalue() + err.getvalue())
            for path in self.evidence.iterdir(): self.assertNotIn(TOKEN, path.read_text('utf-8'))

    def test_post_restore_permit_or_leftover_tables_are_failure_not_false_success(self):
        for failure in ['post-permit', 'post-tables']:
            self.evidence = self.root / failure
            with self.subTest(failure=failure), self.assertRaisesRegex(r.Refused, 'verification-failed-no-automatic-retry'): self.run_tool(failure=failure)
            self.assertEqual(self.last.restores, 1)
            journal = json.loads((self.evidence / 'restore-journal.json').read_text('utf-8'))
            self.assertEqual(journal['previous_bookmark'], CURRENT)

    def test_pre_restore_legacy_authz_is_rejected_without_destructive_http(self):
        with self.assertRaisesRegex(r.Refused, 'preflight-refused'):
            self.run_tool(failure='pre-legacy-authz')
        self.assertEqual((self.last.post_calls, self.last.restores, self.last.connections), (0, 0, 0))
        self.assertNotIn('token', [arg for call in self.last.calls for arg in call])

    def test_post_restore_legacy_authz_is_unverified_with_one_attempt(self):
        with self.assertRaisesRegex(r.Refused, 'verification-failed-no-automatic-retry'):
            self.run_tool(failure='post-legacy-authz')
        self.assertEqual((self.last.post_calls, self.last.restores, self.last.connections, self.last.closed), (1, 1, 1, 1))
        journal = json.loads((self.evidence / 'restore-journal.json').read_text('utf-8'))
        self.assertEqual(journal['status'], 'restored-but-verification-failed-no-automatic-retry')

    def test_one_local_journal_failure_preserves_previous_bookmark_without_retrying_post(self):
        original, failures = r.save, []
        def unavailable_once(path, journal):
            if journal['status'] == 'restored-awaiting-verification' and not failures:
                failures.append(True)
                raise OSError(TOKEN)
            return original(path, journal)
        with patch.object(r, 'save', unavailable_once), self.assertRaises(r.Refused) as caught:
            self.run_tool()
        self.assertEqual((self.last.post_calls, self.last.restores), (1, 1))
        journal = json.loads((self.evidence / 'restore-journal.json').read_text('utf-8'))
        self.assertEqual(journal['previous_bookmark'], CURRENT)
        self.assertEqual(journal['status'], 'restored-but-verification-failed-no-automatic-retry')
        self.assertNotIn(TOKEN, str(caught.exception) + json.dumps(journal))

    def test_permanently_unavailable_journal_refuses_without_exception_or_token_leak_or_post_retry(self):
        original = r.save
        def unavailable(path, journal):
            if 'previous_bookmark' in journal: raise OSError(TOKEN)
            return original(path, journal)
        with patch.object(r, 'save', unavailable), self.assertRaises(r.Refused) as caught:
            self.run_tool()
        self.assertIn('journal-unavailable', str(caught.exception))
        self.assertNotIn(TOKEN, str(caught.exception))
        self.assertEqual((self.last.post_calls, self.last.restores), (1, 1))
        persisted = json.loads((self.evidence / 'restore-journal.json').read_text('utf-8'))
        self.assertEqual(persisted['status'], 'restore-requested')

    def test_missing_unreviewed_or_shim_runtime_is_refused_before_any_command(self):
        (self.root / 'wrangler.cmd').write_text('@echo TEST_ONLY must never execute', encoding='utf-8')
        (self.root / 'wrong-runtime.exe').write_text('TEST_ONLY not Node', encoding='utf-8')
        for update in [{'KIVO_NODE': str(self.root / 'missing-node')},
                       {'KIVO_NODE': str(self.root / 'wrong-runtime.exe')},
                       {'KIVO_WRANGLER_JS': str(self.root / 'missing.js')},
                       {'KIVO_WRANGLER_JS': str(self.root / 'wrangler.cmd')}]:
            with self.subTest(update=update), self.assertRaisesRegex(r.Refused, 'reviewed-local-node'):
                self.run_tool(environment=update)
            self.assertEqual(self.last.calls, []); self.assertEqual(self.last.restores, 0)
        details = self.entry.parent.parent / 'package.json'
        value = json.loads(details.read_text('utf-8')); value['version'] = '0.0.0-TEST_ONLY'
        details.write_text(json.dumps(value), encoding='utf-8')
        with self.assertRaisesRegex(r.Refused, 'reviewed-local-node'): self.run_tool()
        self.assertEqual(self.last.calls, []); self.assertEqual(self.last.restores, 0)

    def test_real_local_node_launches_fake_wrangler_js_without_shell_or_cloud(self):
        # Exercises CreateProcess/argv on Windows rather than mocking subprocess.run.
        self.entry.write_text("const fs=require('node:fs');fs.writeFileSync('TEST_ONLY-argv.json',JSON.stringify(process.argv.slice(2)));"
                              "console.log(JSON.stringify({uuid:'TEST_ONLY_wrong_database',name:'bassam-db-preview'}));", encoding='utf-8')
        destructive = []
        def forbidden(*args):
            destructive.append(True)
            raise AssertionError('Destructive transport must remain untouched')
        with self.assertRaisesRegex(r.Refused, 'live-preview-identity-mismatch'):
            r.execute(self.args(), post=forbidden, environment=self.environment)
        self.assertEqual(destructive, [])
        actual = json.loads((self.evidence / 'TEST_ONLY-argv.json').read_text('utf-8'))
        self.assertEqual(actual, ['d1', 'info', r.NAME, '--config', str(self.evidence / 'target.preview.toml'), '--json'])
        journal = json.loads((self.evidence / 'restore-journal.json').read_text('utf-8'))
        self.assertEqual((journal['status'], journal['destructive_attempts']), ('preflight-refused', 0))

    def test_schema8_to7_verifies_all_old_tables_and_absence_of_every_irshad_table(self):
        self.record.update(source_schema=8, expected_schema=7, expected_migrations=NAMES[:7]); self.write_review()
        journal = self.run_tool()
        self.assertEqual(journal['status'], 'verified')
        self.assertEqual(journal['before']['upgradeTables'], sorted(CU_TABLES + RESTORE_TABLES + IR_TABLES))
        self.assertEqual(journal['before']['migrations'], NAMES)
        self.assertEqual(journal['after']['upgradeTables'], sorted(CU_TABLES + RESTORE_TABLES))
        self.assertTrue(set(IR_TABLES).isdisjoint(journal['after']['upgradeTables']))
        self.assertEqual((self.last.restores, self.last.connections, self.last.closed), (1, 1, 1))

    def test_schema7_to8_requires_thirteen_upgrade_tables_and_eight_migrations(self):
        self.record.update(source_schema=7, expected_schema=8, expected_migrations=NAMES); self.write_review()
        journal = self.run_tool()
        self.assertEqual(journal['before']['upgradeTables'], sorted(CU_TABLES + RESTORE_TABLES))
        self.assertEqual(journal['after']['upgradeTables'], sorted(CU_TABLES + RESTORE_TABLES + IR_TABLES))
        self.assertEqual(len(journal['after']['upgradeTables']), 13)
        self.assertEqual(journal['after']['migrations'], NAMES)
        self.assertEqual(self.last.restores, 1)
        for table in IR_TABLES: self.assertIn("'" + table + "'", r.STATE_SQL)

    def test_schema8_rollback_leftover_irshad_or_legacy_authz_remains_unverified_without_retry(self):
        self.record.update(source_schema=8, expected_schema=7, expected_migrations=NAMES[:7]); self.write_review()
        for failure in ['post-ir-table', 'post-legacy-authz']:
            self.evidence = self.root / failure
            with self.subTest(failure=failure), self.assertRaisesRegex(r.Refused, 'verification-failed-no-automatic-retry'):
                self.run_tool(failure=failure)
            self.assertEqual((self.last.post_calls, self.last.restores, self.last.connections, self.last.closed), (1, 1, 1, 1))
            journal = json.loads((self.evidence / 'restore-journal.json').read_text('utf-8'))
            self.assertEqual(journal['previous_bookmark'], CURRENT)
            self.assertEqual(journal['status'], 'restored-but-verification-failed-no-automatic-retry')

    def test_schema8_invalid_ledger_or_partial_tables_refuse_before_destructive_transport(self):
        self.record.update(source_schema=8, expected_schema=7, expected_migrations=NAMES[:7]); self.write_review()
        for failure in ['pre-ledger-null', 'pre-ledger-short', 'pre-ledger-wrong', 'pre-ledger-extra', 'pre-ledger-order', 'pre-ir-table-missing']:
            self.evidence = self.root / failure
            with self.subTest(failure=failure), self.assertRaisesRegex(r.Refused, 'preflight-refused'):
                self.run_tool(failure=failure)
            self.assertEqual((self.last.post_calls, self.last.restores, self.last.connections), (0, 0, 0))
            self.assertNotIn('token', [arg for call in self.last.calls for arg in call])

    def test_schema8_review_requires_the_complete_canonical_eight_migration_prefix_before_any_transport(self):
        self.record.update(source_schema=8, expected_schema=7, expected_migrations=NAMES[:7]); self.write_review()
        migration = self.root / 'migrations/0008_irshad.sql'; migration.unlink()
        with self.assertRaisesRegex(r.Refused, 'reviewed-bookmark-record-invalid'): self.run_tool()
        self.assertEqual(self.last.calls, []); self.assertEqual(self.last.restores, 0)
        (migration.parent / '0008_wrong.sql').write_text('-- TEST_ONLY wrong canonical prefix', encoding='utf-8')
        with self.assertRaisesRegex(r.Refused, 'reviewed-bookmark-record-invalid'): self.run_tool()
        self.assertEqual(self.last.calls, []); self.assertEqual(self.last.restores, 0)

    def test_old_schema_table_sets_stay_exact_and_do_not_accept_new_irshad_tables(self):
        for schema, expected in [(5, []), (6, CU_TABLES), (7, CU_TABLES + RESTORE_TABLES), (8, CU_TABLES + RESTORE_TABLES + IR_TABLES)]:
            with self.subTest(schema=schema):
                self.assertEqual(r.metadata(state(schema), schema, NAMES, True)['upgradeTables'], sorted(expected))
                if schema < 8:
                    extra = state(schema); extra[3]['results'] = sorted(extra[3]['results'] + [{'name': IR_TABLES[0]}], key=lambda row: row['name'])
                    with self.assertRaises(r.Refused): r.metadata(extra, schema, NAMES, True)

    def test_atomic_evidence_claim_allows_only_one_invocation_and_second_has_zero_transport_calls(self):
        barrier, claimed, second_done = threading.Barrier(2), threading.Event(), threading.Event()
        mkdir = r.Path.mkdir
        destination = self.evidence.resolve()
        transports = {name: FakeWrangler(self) for name in ['first', 'second']}
        outcomes = {}

        def claim(path, *args, **kwargs):
            if path.resolve() != destination:
                return mkdir(path, *args, **kwargs)
            barrier.wait(timeout=5)  # Both callers reach the same claim before either can create it.
            if threading.current_thread().name == 'claim-second':
                self.assertTrue(claimed.wait(timeout=5))
                return mkdir(path, *args, **kwargs)
            result = mkdir(path, *args, **kwargs)
            claimed.set()
            self.assertTrue(second_done.wait(timeout=5))  # Hold the winner before writing any files.
            return result

        def invoke(name):
            try:
                outcomes[name] = r.execute(self.args(), run=transports[name], post=transports[name].post, environment=self.environment)
            except BaseException as error:
                outcomes[name] = error
            finally:
                if name == 'second': second_done.set()

        with patch.object(r.Path, 'mkdir', claim):
            threads = [threading.Thread(target=invoke, args=(name,), name='claim-' + name) for name in ['first', 'second']]
            for thread in threads: thread.start()
            for thread in threads: thread.join(timeout=10)
            self.assertTrue(all(not thread.is_alive() for thread in threads))
        self.assertIsInstance(outcomes['second'], r.Refused)
        self.assertEqual(transports['second'].calls, [])
        self.assertEqual(transports['second'].restores, 0)
        self.assertEqual(transports['second'].post_calls, 0)
        self.assertEqual(outcomes['first']['status'], 'verified')
        self.assertEqual(transports['first'].restores, 1)


if __name__ == '__main__': unittest.main()
