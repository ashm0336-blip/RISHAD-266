/* No live Wrangler: verify the target guard before any remote command is possible. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { BASH, PYTHON, ROOT } from './harness.mjs';

const PREVIEW_ID = '9b671cce-2bf3-46e9-84b5-23645227f0e0';
const ACCOUNT_ID = '74d8c1d049621ecdda47d3cd74306703';
const slash = value => process.platform === 'win32' ? value.replace(/\\/g, '/') : value;

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rishad-preview-guard-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const sub of ['tools/d1', 'config', 'migrations', 'bin']) fs.mkdirSync(path.join(dir, sub), { recursive: true });
  for (const script of ['backup.sh', 'migrate.sh', 'restore.sh', 'restore_bookmark.py']) fs.copyFileSync(path.join(ROOT, 'tools/d1', script), path.join(dir, 'tools/d1', script));
  for (const name of fs.readdirSync(path.join(ROOT, 'migrations')).filter(name => name.endsWith('.sql'))) fs.copyFileSync(path.join(ROOT, 'migrations', name), path.join(dir, 'migrations', name));
  const config = path.join(dir, 'config/wrangler.preview.toml');
  fs.copyFileSync(path.join(ROOT, 'config/wrangler.preview.toml'), config);
  const log = path.join(dir, 'calls.txt'), capture = path.join(dir, 'captured.toml');
  fs.writeFileSync(path.join(dir, 'bin/wrangler'), '#!/bin/sh\n' +
    'printf "%s\\n" "$@" >> "$FAKE_WRANGLER_LOG"\n' +
    '[ "$1 $2 $3" = "d1 migrations list" ] || exit 97\n' +
    'while [ "$#" -gt 0 ]; do if [ "$1" = "--config" ]; then shift; cp "$1" "$FAKE_WRANGLER_CONFIG"; break; fi; shift; done\n' +
    'printf "[]\\n"\n', { mode: 0o755 });
  const run = (script, args, extra = {}) => spawnSync(BASH, ['--noprofile', '--norc', slash(path.join(dir, 'tools/d1', script)), ...args.map(slash)], {
    cwd: dir, encoding: 'utf8', windowsHide: true,
    env: { ...process.env, KIVO_PYTHON: slash(PYTHON), KIVO_BASH: slash(BASH),
      PATH: [slash(path.join(dir, 'bin')), process.platform === 'win32' ? slash(path.dirname(BASH)) : '/usr/bin:/bin'].join(path.delimiter),
      KIVO_D1_ID: '', CLOUDFLARE_ACCOUNT_ID: '',
      FAKE_WRANGLER_LOG: slash(log), FAKE_WRANGLER_CONFIG: slash(capture), PYTHONIOENCODING: 'utf-8', ...extra }
  });
  return { dir, config, log, capture, run };
}

const restoreArgs = name => [name, '--bookmark', '00000001-00000002-00000003-' + 'a'.repeat(32), '--review', 'unused-review.json', '--evidence-dir', 'unused-evidence', '--yes'];

test('Production and unknown names are blocked even with the old allow flags', t => {
  const f = fixture(t);
  for (const name of ['bassam-db', 'other-db', PREVIEW_ID, 'BASSAM-DB-PREVIEW']) {
    for (const script of ['backup.sh', 'migrate.sh', 'restore.sh']) {
      const args = script === 'migrate.sh' ? [name, path.join(f.dir, 'migrations'), '--list'] : script === 'restore.sh' ? restoreArgs(name) : [name, 'unused.sql', '--yes'];
      const r = f.run(script, args, { KIVO_ALLOW_PROD_EXPORT: '1', KIVO_ALLOW_PROD_MIGRATE: '1' });
      assert.equal(r.status, 2, script + ': ' + r.stderr);
    }
  }
  assert.equal(fs.existsSync(f.log), false, 'No external CLI is reached');
});

test('A Preview name cannot hide an overridden database ID or account', t => {
  const f = fixture(t);
  for (const extra of [{ KIVO_D1_ID: '00000000-0000-0000-0000-000000000001' }, { CLOUDFLARE_ACCOUNT_ID: 'different-account' }]) {
    for (const script of ['backup.sh', 'migrate.sh', 'restore.sh']) {
      const args = script === 'migrate.sh' ? ['bassam-db-preview', path.join(f.dir, 'migrations'), '--list'] : script === 'restore.sh' ? restoreArgs('bassam-db-preview') : ['bassam-db-preview', 'unused.sql', '--yes'];
      const result = f.run(script, args, extra);
      assert.equal(result.status, 2);
      if (script === 'restore.sh') assert.match(result.stderr, /preview-environment-target-mismatch/, 'The valid bookmark interface reaches the actual target guard');
    }
  }
  assert.equal(fs.existsSync(f.log), false);
});

test('Only the verified config reaches the fake CLI and it is passed explicitly', t => {
  const f = fixture(t);
  const r = f.run('migrate.sh', ['bassam-db-preview', path.join(f.dir, 'migrations'), '--list'], { KIVO_D1_ID: PREVIEW_ID, CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID });
  assert.equal(r.status, 0, r.stderr);
  const args = fs.readFileSync(f.log, 'utf8').trim().split(/\r?\n/);
  assert.deepEqual(args.slice(0, 5), ['d1', 'migrations', 'list', 'bassam-db-preview', '--remote']);
  assert.equal(args[5], '--config');
  const config = fs.readFileSync(f.capture, 'utf8');
  assert.ok(config.includes(PREVIEW_ID) && config.includes(ACCOUNT_ID));
  assert.doesNotMatch(config, /database_name\s*=\s*"bassam-db"|r2_buckets|\[env\./);
  assert.equal(fs.existsSync(args[6]), false, 'The private config snapshot is removed after use');
});

test('Changing the checked-in target or adding any extra resource fails before Wrangler', t => {
  for (const transform of [
    text => text.replace(PREVIEW_ID, '00000000-0000-0000-0000-000000000001'),
    text => text.replace(ACCOUNT_ID, 'different-account'),
    text => text + '\n[[r2_buckets]]\nbinding = "IMG_R2"\nbucket_name = "unverified"\n'
  ]) {
    const f = fixture(t);
    fs.writeFileSync(f.config, transform(fs.readFileSync(f.config, 'utf8')));
    for (const [script, args] of [
      ['migrate.sh', ['bassam-db-preview', path.join(f.dir, 'migrations'), '--list']],
      ['restore.sh', restoreArgs('bassam-db-preview')]
    ]) {
      const r = f.run(script, args);
      assert.equal(r.status, 2, r.stderr);
      if (script === 'restore.sh') assert.match(r.stderr, /preview-config-invalid/);
    }
    assert.equal(fs.existsSync(f.log), false);
  }
});
