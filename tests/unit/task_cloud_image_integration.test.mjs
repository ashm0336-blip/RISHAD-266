/* Real 360 + 545 transports against the canonical Worker and SQLite D1 shim.
   Synthetic fixtures only; no browser persistence or external network. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT } from './harness.mjs';
import { world, workerUnderTest, ME, KT, DAY, TAG, stored, rowsOf, HR, PNG, taskCommandBody } from './tasks_fx.mjs';

test('cloud task proof survives a lost commit response through explicit same-idem retry without duplicate images, audit or reconnect writes', async t => {
  const canonical = workerUnderTest();
  assert.equal(canonical.patched, false, 'Exercise the canonical generated Worker without a test patch');
  const W = await world({ worker: canonical.file, mode: 'enforce' });
  t.after(() => W.env.DB.db.close());
  const objectWrites = [], putObject = W.env.IMG_R2.put.bind(W.env.IMG_R2);
  W.env.IMG_R2.put = async (...args) => { objectWrites.push(args[0]); return putObject(...args); };
  const me = await W.login(ME.un, ME.pw), manager = await W.login('0000000101', '70101');
  const title = TAG + ' cloud image transport integration';
  const created = await W.C.api('/api/tasks/create', { method: 'POST', cookie: manager.ck,
    body: taskCommandBody(W.env, '/api/tasks/create', { k: DAY, t: title, s: Date.now() - 60e3, e: Date.now() + 2 * HR, asg: [ME.eid], rv: 'none' }) });
  assert.equal(created.status, 200, JSON.stringify(created.j));
  const id = created.j.rows[0].id, events = {}, calls = [], storage = [], KIVO = {};
  let loseSubmitResponse = false;
  const browser = { KIVO, __BS_BOOT: { srv: 1, cf: 1, uid: ME.uid }, navigator: { onLine: true }, console, Blob,
    setTimeout, clearTimeout,
    indexedDB: { open(...args) { storage.push(['indexedDB', ...args]); throw new Error('A device database must never open'); } },
    CustomEvent: class { constructor(type, data) { this.type = type; this.detail = data?.detail; } },
    addEventListener(type, fn) { (events[type] ||= []).push(fn); },
    dispatchEvent(event) { for (const fn of events[event.type] || []) fn(event); },
    fetch: async (url, options = {}) => {
      const body = options.body && String(url).endsWith('/act') ? JSON.parse(options.body) : null;
      calls.push({ url: String(url), method: options.method || 'GET', body: options.body });
      const response = await W.C.req(String(url), { method: options.method || 'GET', cookie: me.ck, headers: options.headers, body: options.body });
      if (loseSubmitResponse && body?.act === 'submit') { loseSubmitResponse = false; assert.equal(response.status, 200); throw new TypeError('TEST_ONLY response lost after commit'); }
      return response;
    } };
  Object.defineProperty(browser, 'localStorage', { get() { storage.push(['localStorage']); throw new Error('No browser business store is permitted'); } });
  browser.window = browser; vm.createContext(browser);
  for (const file of ['360-bassam-idb.js', '545-task-self.js'])
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/services', file), 'utf8'), browser, { filename: file });
  const tasks = KIVO.BassamMyTasks;
  assert.equal(KIVO.BassamLocalKV, undefined);
  await tasks.load(true);
  let task = tasks.state().rows.find(row => String(row.id) === String(id)); assert.ok(task);
  assert.equal((await tasks.act(task, 'start')).ok, true);
  task = tasks.state().rows.find(row => String(row.id) === String(id));
  const note = { note: TAG + ' confirmed proof' }, meta = [{ at: Date.now(), lat: 24.7, lng: 46.6, acc: 8 }];
  loseSubmitResponse = true;
  const lost = await tasks.submitProof(task, 'submit', note, [PNG], meta);
  assert.equal(lost.ok, false); assert.equal(lost.err, 'offline'); assert.notEqual(lost.queued, true);
  const acts = () => calls.filter(call => call.url.endsWith('/act'));
  const puts = () => calls.filter(call => call.method === 'PUT' && call.url.startsWith('/api/img/'));
  assert.equal(acts().length, 2); assert.equal(puts().length, 1);
  const firstBody = acts()[1].body, submitted = JSON.parse(firstBody), imageId = submitted.imgs[0];
  assert.equal(KIVO.BassamImgCache.has(imageId), true, '360 cached only the real confirmed image ACK');
  const saved = () => rowsOf(stored(W.env, KT), ME.eid).find(row => String(row.r[13]) === String(id)).r;
  const before = saved(); assert.equal(before[3], 'done'); assert.deepEqual(before[21].imgs, [imageId]);
  const finishAt = before[12];
  const audit = () => W.env.DB.q("SELECT * FROM aud WHERE k = ? AND etype = 'task' AND ename = ? ORDER BY id", KT, title);
  const auditBefore = audit(); assert.equal(auditBefore.filter(row => row.act === 'finished').length, 1);
  const refsBefore = W.env.DB.q('SELECT * FROM imgref WHERE img = ?', imageId);
  assert.equal(refsBefore.length, 1); assert.equal(W.env.DB.q('SELECT st FROM imgown WHERE img = ?', imageId)[0].st, 'bound');
  const imageRowsBefore = W.env.DB.q('SELECT * FROM imgs WHERE k = ? ORDER BY seq', imageId);
  assert.equal(imageRowsBefore.length, 1); assert.equal(objectWrites.length, 1, 'One image object in the in-memory R2 fixture');
  browser.dispatchEvent({ type: 'online' }); await tasks.load(true); await tasks.queue.flush();
  assert.equal(acts().length, 2, 'Reconnect, reads and the retired queue facade never submit an action');
  assert.equal(puts().length, 1);
  const retried = await tasks.submitProof(task, 'submit', note, [PNG], meta);
  assert.equal(retried.ok, true); assert.equal(retried.noop, true);
  assert.equal(acts().length, 3); assert.equal(acts()[2].body, firstBody, 'Identical request and idem after an ambiguous response');
  assert.equal(puts().length, 1, 'An acknowledged image is not uploaded again');
  assert.equal(saved()[12], finishAt); assert.deepEqual(saved()[21].imgs, [imageId]);
  assert.equal(saved()[20].q.filter(value => value === submitted.idem).length, 1);
  assert.deepEqual(audit(), auditBefore, 'No duplicate audit entry for the committed proof');
  assert.deepEqual(W.env.DB.q('SELECT * FROM imgref WHERE img = ?', imageId), refsBefore);
  assert.deepEqual(W.env.DB.q('SELECT * FROM imgs WHERE k = ? ORDER BY seq', imageId), imageRowsBefore);
  assert.equal(objectWrites.length, 1, 'No duplicate image object write after the explicit retry');
  const readImage = await W.C.req('/api/me/tasks/img?id=' + encodeURIComponent(imageId), { cookie: me.ck });
  assert.equal(readImage.status, 200); assert.equal(await readImage.text(), PNG);
  assert.deepEqual(storage, [], 'Neither service accesses a native browser business store');
});
