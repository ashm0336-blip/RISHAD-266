/* Regression proofs for cloud-only employee task mutations. Synthetic data only. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT } from './harness.mjs';

const source = fs.readFileSync(path.join(ROOT, 'src/services/545-task-self.js'), 'utf8');
const row = { k: '1448-5-19', id: 'TEST_ONLY_task', i: 0, w: true, st: 'in_progress', acc: 1 };
const image = 'data:image/png;base64,TEST_ONLY';
const json = (value, status = 200) => ({ status, ok: status >= 200 && status < 300, text: async () => JSON.stringify(value) });
const ack = (body, overrides) => json(Object.assign({ ok: 1, rev: 5, row: { ...row, st: 'done', proof: { imgs: body.imgs || [], note: body.note || '' } } }, overrides));

function browser(handler) {
  const calls = [], storage = [], events = {};
  const stored = [{ id: 'TEST_ONLY_stale_idem', body: { k: row.k, id: row.id, act: 'start', idem: 'TEST_ONLY_stale_idem' }, imgs: [] }];
  const local = { get: async key => { storage.push(['get', key]); return stored; }, set: async (...args) => { storage.push(['set', ...args]); return true; }, del: async key => { storage.push(['del', key]); return true; } };
  class Storage { getItem(key) { storage.push(['native-get', key]); return JSON.stringify(stored); } setItem(...args) { storage.push(['native-set', ...args]); } removeItem(key) { storage.push(['native-del', key]); } }
  const KIVO = { BassamLocalKV: local };
  const W = { KIVO, __BS_BOOT: { srv: 1, cf: 1, uid: 'TEST_ONLY_staff' }, navigator: { onLine: true }, console,
    Storage, localStorage: new Storage(), CustomEvent: class { constructor(type, data) { this.type = type; this.detail = data?.detail; } },
    addEventListener(type, fn) { (events[type] ||= []).push(fn); }, dispatchEvent(event) { for (const fn of events[event.type] || []) fn(event); },
    fetch: async (url, options = {}) => { calls.push({ url: String(url), options }); return handler(String(url), options); } };
  W.window = W; vm.createContext(W); vm.runInContext(source, W);
  return { W, api: KIVO.BassamMyTasks, calls, storage };
}

test('stale device task actions are neither read nor replayed on startup, online or task reads', async () => {
  const B = browser(async url => url.endsWith('/act') ? json({ ok: 0, err: 'state' }, 409) : json({ ok: 1, rev: 1, me: { linked: true }, rows: [row] }));
  await Promise.resolve(); await Promise.resolve();
  B.W.dispatchEvent({ type: 'online' }); await B.api.load(true); await Promise.resolve();
  assert.deepEqual(B.storage, [], 'Legacy actions remain quarantined on the device');
  assert.equal(B.calls.filter(call => call.url.endsWith('/act')).length, 0);
  assert.equal(B.api.queue.state().n, 0);
});

test('offline proof remains an unsaved page draft and explicit retry uses its identical body and image IDs', async () => {
  const B = browser(async (url, options) => url.includes('/api/img/') ? json({ ok: 1, n: options.body.length }) : ack(JSON.parse(options.body)));
  B.W.navigator.onLine = false;
  const extra = { note: 'TEST_ONLY proof' }, result = await B.api.submitProof(row, 'submit', extra, [image], []);
  assert.equal(result.ok, false); assert.notEqual(result.queued, true, 'Profile must keep its modal and fields open');
  assert.equal(B.calls.length, 0); assert.deepEqual(B.storage, []);
  B.W.navigator.onLine = true; B.W.dispatchEvent({ type: 'online' }); await Promise.resolve();
  assert.equal(B.calls.length, 0, 'Reconnection must not submit business actions');
  const saved = await B.api.submitProof(row, 'submit', extra, [image], []);
  assert.equal(saved.ok, true); assert.equal(saved.imgs.length, 1);
  assert.deepEqual(B.storage, []);
});

test('lost action acknowledgement retries explicitly with the same idem and without reuploading proof', async () => {
  let first = true;
  const B = browser(async (url, options) => { if (url.includes('/api/img/')) return json({ ok: 1, n: options.body.length }); if (first) { first = false; throw new TypeError('Failed to fetch'); } return ack(JSON.parse(options.body)); });
  const extra = { note: 'TEST_ONLY retained proof' };
  const failed = await B.api.submitProof(row, 'submit', extra, [image], []);
  assert.equal(failed.ok, false); assert.notEqual(failed.queued, true);
  const original = B.calls.find(call => call.url.endsWith('/act')).options.body;
  B.W.dispatchEvent({ type: 'online' }); await B.api.load(true); // A read cannot replay a mutation.
  assert.equal(B.calls.filter(call => call.url.endsWith('/act')).length, 1);
  const saved = await B.api.submitProof(row, 'submit', extra, [image], []);
  assert.equal(saved.ok, true);
  assert.deepEqual(B.calls.filter(call => call.url.endsWith('/act')).map(call => call.options.body), [original, original]);
  assert.equal(B.calls.filter(call => call.url.includes('/api/img/')).length, 1);
  assert.deepEqual(B.storage, []);
});

test('malformed or mismatched task ACKs do not patch task rows or announce success', async () => {
  for (const invalid of [
    { ok: 1 }, { ok: 1, rev: 5, row: { ...row, id: 'TEST_ONLY_other' } },
    { ok: 1, rev: '5', row }, { ok: 1, rev: 5, row: { ...row, k: '1448-5-20' } },
  ]) {
    const B = browser(async () => json(invalid));
    const result = await B.api.act(row, 'ack');
    assert.equal(result.ok, false); assert.notEqual(result.queued, true);
    assert.equal(B.api.state().rev, 0); assert.equal(B.api.state().rows, null);
    assert.deepEqual(B.storage, []);
  }
});

test('ambiguous task result blocks a changed intent until the original request is resolved', async () => {
  const B = browser(async () => { throw new TypeError('Failed to fetch'); });
  assert.equal((await B.api.act(row, 'ack')).ok, false);
  const changed = await B.api.act(row, 'start');
  assert.equal(changed.ok, false); assert.equal(changed.err, 'uncertain');
  assert.equal(B.calls.length, 1); assert.deepEqual(B.storage, []);
});

test('missing, rejected or incomplete image ACKs cannot submit the proof action', async () => {
  for (const body of [{}, { ok: 0, n: image.length }, { ok: 1 }, { ok: 1, n: image.length - 1 }]) {
    const B = browser(async () => json(body));
    const result = await B.api.submitProof(row, 'submit', { note: 'TEST_ONLY' }, [image], []);
    assert.equal(result.ok, false); assert.equal(result.err, 'img'); assert.notEqual(result.queued, true);
    assert.equal(B.calls.filter(call => call.url.endsWith('/act')).length, 0);
    assert.deepEqual(B.storage, []);
  }
});

test('a pending explicit retry cannot cross an expired page identity', async () => {
  const B = browser(async () => json({ ok: 0, err: 'session-changed' }, 409));
  assert.equal((await B.api.act(row, 'ack')).ok, false);
  assert.equal((await B.api.act(row, 'ack')).ok, false);
  assert.equal(B.calls.length, 1); assert.deepEqual(B.storage, []);
});
