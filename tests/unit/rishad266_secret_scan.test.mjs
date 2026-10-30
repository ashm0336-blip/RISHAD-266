/* SOT-125: verifies the shared scanner rejects untracked credentials and an empty
 * scan while redacting findings; this is partial security-tool coverage.
 * Scan pending uploads before the first commit, without echoing credential values. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, PYTHON } from './harness.mjs';

function repository(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rishad-secret-scan-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const git = spawnSync('git', ['init', '--quiet', dir], { encoding: 'utf8' });
  assert.equal(git.status, 0, git.stderr);
  fs.mkdirSync(path.join(dir, 'tools', 'sec'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'tools/sec/secrets_scan.py'), path.join(dir, 'tools/sec/secrets_scan.py'));
  // Do not count the copied scanner as a candidate when testing an empty repository.
  fs.appendFileSync(path.join(dir, '.git', 'info', 'exclude'), '\ntools/\n');
  return dir;
}
function scan(dir, ...args) {
  return spawnSync(PYTHON, [path.join(dir, 'tools/sec/secrets_scan.py'), ...args], {
    encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
  });
}

test('The secret scanner includes untracked candidates and redacts all finding values', t => {
  const dir = repository(t);
  fs.mkdirSync(path.join(dir, 'src'));
  const marker = '-----BEGIN ' + 'PRIVATE KEY-----'; // Synthetic marker, not a real private key.
  fs.writeFileSync(path.join(dir, 'src/credential.js'), JSON.stringify(marker));
  const report = path.join(os.tmpdir(), path.basename(dir) + '.json');
  t.after(() => fs.rmSync(report, { force: true }));
  const result = scan(dir, '--json', report);
  assert.equal(result.status, 1, 'An untracked credential-shaped file must fail');
  const findings = JSON.parse(fs.readFileSync(report, 'utf8'));
  assert.equal(findings.files, 1);
  assert.ok(findings.findings.length > 0);
  assert.ok(findings.findings.every(f => f.match === '<redacted>'));
  assert.ok(!result.stdout.includes(marker));
  assert.ok(!JSON.stringify(findings).includes(marker));
});

test('An empty source scan fails instead of reporting a misleading success', t => {
  const result = scan(repository(t));
  assert.equal(result.status, 2);
});
