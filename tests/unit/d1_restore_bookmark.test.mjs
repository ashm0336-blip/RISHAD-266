/* The existing D1 restore tool is tested with mocked CLI/auth/HTTP transports.
 * No Wrangler process, credentials, Cloudflare request or real restore is used.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { PYTHON, ROOT } from './harness.mjs';

test('Preview bookmark restore guards, concurrency and single-attempt HTTP transport', () => {
  const result = spawnSync(PYTHON, ['-m', 'unittest', 'discover', '-s', 'tests/unit', '-p', 'd1_restore_bookmark_test.py', '-v'], {
    cwd: ROOT, encoding: 'utf8', windowsHide: true, timeout: 30000,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
  });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stderr, /Ran [1-9]\d* tests/);
  assert.match(result.stderr, /\bOK\b/);
  assert.doesNotMatch(result.stderr, /skipped=/);
});
