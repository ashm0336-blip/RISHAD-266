/* Published browser wiring, not a hand-loaded source transport fixture.
   Actual emitted assets only; no HTTP, browser storage, or Cloudflare. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { ROOT } from './harness.mjs';

const DIST = path.join(ROOT, 'pk265');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function builtShell() {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'pk265.build.json'), 'utf8'));
  const retained = new Set(manifest.retainedFiles || []), html = fs.readFileSync(path.join(DIST, 'index.html'));
  assert.equal(sha(html), manifest.files['index.html'].sha256, 'Read the actual build index, not a different shell fixture');
  const scripts = [...html.toString('utf8').matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g)].map(match => match[1]);
  function asset(stem) {
    const pattern = new RegExp('^assets/js/' + stem + '\\.[a-f0-9]{10}\\.js$');
    const files = Object.keys(manifest.files).filter(file => pattern.test(file) && !retained.has(file));
    assert.equal(files.length, 1, 'Actual public build must contain ' + stem);
    const file = files[0], bytes = fs.readFileSync(path.join(DIST, file)), expected = manifest.files[file];
    assert.equal(bytes.length, expected.bytes, file + ': emitted bytes agree with the actual build manifest');
    assert.equal(sha(bytes), expected.sha256, file + ': emitted hash agrees with the actual build manifest');
    return { path: '/' + file, source: bytes.toString('utf8') };
  }
  return { scripts, asset };
}

test('actual public shell reaches custody and atomic backup services once, after task model and before busy UI', () => {
  const B = builtShell();
  const namespace = B.asset('005-kivo-ns'), model = B.asset('546-task-model'), custody = B.asset('547-custody-api'), backup = B.asset('548-atomic-backup'), busy = B.asset('550-bassam-busy');
  for (const asset of [namespace, model, custody, backup, busy]) assert.equal(B.scripts.filter(file => file === asset.path).length, 1, asset.path + ': exactly one script reference');
  const order = [namespace, model, custody, backup, busy].map(asset => B.scripts.indexOf(asset.path));
  assert.ok(order.every((at, i) => i === 0 || order[i - 1] < at), 'Namespace → task model → custody → atomic backup → busy load in dependency order');
});

test('actual emitted namespace and service scripts load frozen callable APIs with no storage, network, timers or default identity', async () => {
  const B = builtShell(), forbidden = [];
  const no = operation => { forbidden.push(operation); throw new Error('Forbidden on service load: ' + operation); };
  const C = { console, URLSearchParams, AbortController, Uint8Array,
    fetch: () => no('fetch'), setTimeout: () => no('timer'), clearTimeout() {},
    localStorage: new Proxy({}, { get: () => no('localStorage') }),
    sessionStorage: new Proxy({}, { get: () => no('sessionStorage') }),
    indexedDB: new Proxy({}, { get: () => no('indexedDB') }) };
  C.window = C; vm.createContext(C);
  for (const stem of ['005-kivo-ns', '547-custody-api', '548-atomic-backup']) {
    const asset = B.asset(stem); vm.runInContext(asset.source, C, { filename: asset.path });
  }
  assert.deepEqual(forbidden, [], 'Loading the actual public scripts performs no device or network operation');
  for (const [name, methods] of [['Custody', ['read', 'prepare', 'send', 'collectHolder', 'exportDomain', 'context']],
    ['BackupRestore', ['context', 'prepare', 'approve', 'send', 'confirm', 'refresh']]]) {
    const service = C.KIVO[name]; assert.ok(service, name + ' exists in the public namespace'); assert.equal(Object.isFrozen(service), true);
    for (const method of methods) assert.equal(typeof service[method], 'function', name + '.' + method + ' is callable');
    assert.equal(service.context(), null, name + ' has no default identity');
  }
  assert.equal((await C.KIVO.Custody.read({ view: 'catalog' })).status, 401);
  assert.equal(C.KIVO.Custody.prepare('type-create', {}, 0).status, 401);
  assert.equal((await C.KIVO.Custody.send({})).status, 401);
  assert.equal((await C.KIVO.BackupRestore.prepare({}, { mode: 'replace' })).status, 401);
  assert.equal((await C.KIVO.BackupRestore.send({})).status, 401);
  assert.deepEqual(forbidden, [], 'Anonymous calls fail closed before any device or network operation');
});
