/* Cloud storage owns business data; browser persistence stores device preferences only. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FakeStorage, loadClient, sleep } from './k264_vm.mjs';

const PLAN = 'bassam_plan_v1';
const A = 'bsdept:dA:' + PLAN;
const B = 'bsdept:dB:' + PLAN;
const DEPTS = JSON.stringify([{ id: 'dA', name: 'TEST_ONLY A' }, { id: 'dB', name: 'TEST_ONLY B' }]);
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const boot = () => ({ srv: 1, cf: 1, uid: 'test-owner', v: 1, keys: { bassam_depts_v1: DEPTS, [A]: '{"value":"cloud A"}', [B]: '{"value":"cloud B"}' }, revs: { [A]: 1, [B]: 1 } });
const noNetwork = { req: async () => { throw new Error('No request expected'); } };
const success = {
  req: async (path, options = {}) => {
    if (path === '/api/save') {
      const payload = JSON.parse(options.body);
      return json({ revs: Object.fromEntries([...Object.keys(payload.set || {}), ...(payload.del || [])].map(k => [k, 2])) });
    }
    return json({ v: 1, keys: [] });
  }
};

test('Relational domains cannot be recreated through the retired storage adapter', async () => {
  const keys = ['bassam_dstats_v1', 'bassam_notif_v1', 'bassam_notif_cfg_v1', 'bassam_notif_sys_v1', 'bassam_bc_v1',
    'bassam_seized_v1','bassam_seized_cat_v1','bassam_seized_acts_v1','bassam_seized_locs_v1','bassam_seized_jew_v1','bassam_seized_retro_v1','bassam_award_v1','bassam_award_docs_v1','bassam_award_docs_v2'];
  const native = new FakeStorage(), incoming = boot();
  for (const key of keys) for (const scoped of [key, 'bsdept:dA:' + key]) {
    native.setItem(scoped, 'TEST_ONLY quarantined legacy value');
    incoming.keys[scoped] = 'TEST_ONLY stale server bootstrap';
  }
  const before = Object.fromEntries(native._m);
  const T = loadClient({ C: noNetwork, boot: incoming, native, blocks: ['280-server-storage.js', '320-dept-storage.js'] });
  T.W.document.hidden = true;
  try {
    for (const resource of keys) for (const key of [resource,'bsdept:dA:'+resource]) {
      assert.equal(T.get(key), null, 'No legacy local or boot value is consumed');
      assert.throws(() => T.set(key, '{"TEST_ONLY":"must-not-store"}'), /relational-domain-api-required/);
      assert.throws(() => T.W.localStorage.removeItem(key), /relational-domain-api-required/);
    }
    assert.equal(T.W.KIVO.__BS_SRV.dirty(), false, 'No KV write is queued');
    assert.equal(await T.W.KIVO.__BS_SRV.flushAsync(1000), true);
    assert.deepEqual(T.nativeLS(), { ...before, bassam_active_dept_v1: 'dA' }, 'Only the normal device department preference is added; legacy bytes remain unchanged');
    assert.equal(T.urls.filter(u => String(u).includes('/api/save')).length, 0);
  } finally { T.dispose(); }
});

test('An absent or malformed department cannot fall through to a browser business database', () => {
  const T = loadClient({ C: noNetwork, boot: boot(), blocks: ['280-server-storage.js'] });
  T.W.document.hidden = true;
  try {
    for (const key of ['bsdept::bassam_employees_v1', 'bsdept:undefined:broken', 'bsdept:bad scope:bassam_tasks_v1']) {
      assert.equal(T.get(key), null);
      assert.throws(() => T.set(key, '["TEST_ONLY"]'), /department-scope-required/);
      assert.throws(() => T.W.localStorage.removeItem(key), /department-scope-required/);
    }
    assert.deepEqual(T.nativeLS(), {});
    assert.equal(T.W.KIVO.__BS_SRV.dirty(), false);
  } finally { T.dispose(); }
});

test('Cloud bootstrap is mandatory and a department adapter cannot fall back to native storage', () => {
  for (const incoming of [null, {}, { srv: 1 }, { srv: 1, cf: 0 }, { srv: true, cf: true }]) {
    const native = new FakeStorage();
    native.setItem(A, 'TEST_ONLY pre-existing browser value');
    const before = Object.fromEntries(native._m);
    const getBefore = FakeStorage.prototype.getItem;
    const setBefore = FakeStorage.prototype.setItem;
    const T = loadClient({ C: noNetwork, boot: incoming, native, blocks: ['280-server-storage.js', '320-dept-storage.js'] });
    try {
      assert.equal(T.W.KIVO.__BS_STORAGE_FAIL, 'cloud-boot-required');
      assert.equal(T.W.KIVO.__BS_SRV, undefined);
      assert.equal(T.W.KIVO.BassamDepts, undefined);
      assert.equal(FakeStorage.prototype.getItem, getBefore, 'No replacement read path without cloud storage');
      assert.equal(FakeStorage.prototype.setItem, setBefore, 'No replacement write path without cloud storage');
      assert.deepEqual(T.nativeLS(), before, 'Existing local data is neither consumed nor destroyed');
      assert.equal(T.urls.length, 0);
    } finally { T.dispose(); }
  }

  const T = loadClient({ C: noNetwork, boot: boot(), blocks: ['320-dept-storage.js'] });
  try {
    assert.equal(T.W.KIVO.__BS_STORAGE_FAIL, 'cloud-boot-required', 'A bootstrap object alone is not a storage adapter');
    assert.equal(T.W.KIVO.BassamDepts, undefined);
    assert.equal(T.W.KIVO.__BS_RAWLS, undefined);
    assert.deepEqual(T.nativeLS(), {});
  } finally { T.dispose(); }
});

test('Cloud business writes keep department boundaries and never persist on the device', async () => {
  const native = new FakeStorage();
  native.setItem(A, '{"value":"TEST_ONLY stale local data"}');
  const T = loadClient({ C: success, boot: boot(), native, blocks: ['280-server-storage.js', '320-dept-storage.js'] });
  T.W.document.hidden = true;
  try {
    const D = T.W.KIVO.BassamDepts;
    assert.equal(D.active(), 'dA');
    assert.equal(JSON.parse(T.get(PLAN)).value, 'cloud A', 'Server data wins over a stale browser database');
    T.set(PLAN, '{"value":"TEST_ONLY edit A"}');
    assert.equal(D.setActive('dB'), true);
    assert.equal(JSON.parse(T.get(PLAN)).value, 'cloud B');
    T.set(PLAN, '{"value":"TEST_ONLY edit B"}');
    assert.equal(D.setActive('unknown'), false);
    assert.equal(await T.W.KIVO.__BS_SRV.flushAsync(1000), true);
    const payload = JSON.parse(T.saves()[0].body);
    assert.equal(JSON.parse(payload.set[A]).value, 'TEST_ONLY edit A');
    assert.equal(JSON.parse(payload.set[B]).value, 'TEST_ONLY edit B');
    assert.equal(payload.uid, 'test-owner');
    assert.equal(payload.set.bassam_active_dept_v1, undefined, 'Active department is a device preference');
    assert.equal(T.nativeLS()[A], '{"value":"TEST_ONLY stale local data"}');
    assert.equal(T.nativeLS()[B], undefined);
    assert.equal(T.nativeLS().bassam_depts_v1, undefined, 'The department registry is not copied onto the device');
  } finally { T.dispose(); }
});

test('Failed cloud writes retain the latest edit for retry without writing a local database', async () => {
  let rejectFirst = true;
  const C = { req: async (path, options) => {
    if (path === '/api/save' && rejectFirst) { rejectFirst = false; throw new Error('TEST_ONLY transient network outage'); }
    return success.req(path, options);
  } };
  const T = loadClient({ C, boot: boot(), blocks: ['280-server-storage.js', '320-dept-storage.js'] });
  T.W.document.hidden = true;
  try {
    T.set(PLAN, '{"value":"TEST_ONLY first edit"}');
    assert.equal(await T.W.KIVO.__BS_SRV.flushAsync(1000), false);
    assert.equal(T.W.KIVO.__BS_SRV.dirty(), true);
    T.set(PLAN, '{"value":"TEST_ONLY newest edit"}');
    assert.equal(await T.W.KIVO.__BS_SRV.flushAsync(1000), true);
    assert.equal(T.saves().length, 2);
    assert.equal(JSON.parse(JSON.parse(T.saves()[1].body).set[A]).value, 'TEST_ONLY newest edit');
    assert.equal(T.W.KIVO.__BS_SRV.dirty(), false);
    assert.equal(T.nativeLS()[A], undefined);
  } finally { T.dispose(); }
});

test('A 401 freezes pending writes and pagehide beacons instead of retrying under a later identity', async () => {
  let answer;
  const C = { req: async path => path === '/api/save' ? await new Promise(resolve => { answer = resolve; }) : json({ v: 1, keys: [] }) };
  const T = loadClient({ C, boot: boot(), blocks: ['280-server-storage.js', '320-dept-storage.js'] });
  T.W.document.hidden = true;
  try {
    T.set(PLAN, '{"value":"TEST_ONLY in flight"}');
    const flushed = T.W.KIVO.__BS_SRV.flushAsync(1000);
    T.W.localStorage.removeItem(PLAN); // A newer deletion must win over the rejected in-flight value.
    answer(json({ ok: 0, err: 'session' }, 401));
    assert.equal(await flushed, false);
    assert.equal(T.W.KIVO.__BS_SRV.sesChanged(), true, 'No further transport after the page identity expires');
    assert.equal(T.get(PLAN), null);
    let orphaned = T.W.KIVO.__BS_SRV.orphaned();
    assert.ok(orphaned.del.includes(A));
    assert.ok(!orphaned.set.includes(A), 'The old snapshot does not overwrite the newer deletion');
    const another = 'bassam_rounds_v1';
    T.set(another, '{"TEST_ONLY":"unsent"}');
    assert.equal(await T.W.KIVO.__BS_SRV.flushAsync(100), false);
    orphaned = T.W.KIVO.__BS_SRV.orphaned();
    assert.ok(orphaned.set.includes('bsdept:dA:' + another));
    T.W.dispatchEvent(new T.W.Event('online'));
    T.W.dispatchEvent(new T.W.Event('pagehide'));
    await sleep(350);
    assert.equal(T.saves().length, 1, 'No retry, new save, or beacon after expiry');
    assert.equal(T.nativeLS()[A], undefined);
    assert.equal(T.nativeLS()['bsdept:dA:' + another], undefined);
    assert.ok(!T.log.includes('reload'), 'The unsaved in-memory state is not discarded by automatic navigation');
  } finally { T.dispose(); }
});

test('Incomplete or malformed 200 acknowledgements keep every unconfirmed write and retry the newest edit', async () => {
  const cases = [
    ['empty object', () => json({})],
    ['null JSON', () => json(null)],
    ['truncated JSON', () => new Response('{"revs":', { status: 200 })],
    ['empty maps', () => json({ revs: {}, denied: {}, conflicts: {} })],
    ['partial acknowledgement', () => json({ revs: { [A]: 2 } })],
    ['explicit failure', () => json({ ok: false, revs: { [A]: 2, [B]: 2 } })],
    ['array map', () => json({ revs: [] })],
    ['invalid revision', () => json({ revs: { [A]: '2', [B]: 2 } })],
    ['malformed denial', () => json({ denied: { [A]: null }, revs: { [B]: 2 } })],
    ['malformed conflict', () => json({ conflicts: { [A]: { rev: 2 } }, revs: { [B]: 2 } })],
    ['contradictory outcomes', () => json({ revs: { [A]: 2, [B]: 2 }, denied: { [A]: { why: 'view' } } })],
    ['unrequested key', () => json({ revs: { [A]: 2, [B]: 2, bassam_unknown_v1: 3 } })]
  ];
  for (const [name, invalid] of cases) {
    let first = true;
    const C = { req: async (path, options) => {
      if (path === '/api/save' && first) { first = false; return invalid(); }
      return success.req(path, options);
    } };
    const T = loadClient({ C, boot: boot() });
    T.W.document.hidden = true;
    try {
      T.set(A, '{"value":"TEST_ONLY first edit"}');
      T.set(B, '{"value":"TEST_ONLY second department"}');
      const pending = T.W.KIVO.__BS_SRV.flushAsync(1000);
      T.set(A, '{"value":"TEST_ONLY newest edit"}'); // A newer generation exists before the incomplete reply arrives.
      assert.equal(await pending, false, name + ': not a successful save');
      assert.equal(T.W.KIVO.__BS_SRV.dirty(), true, name + ': no dropped snapshot');
      assert.equal(T.W.KIVO.__BS_SRV.inflight(), false, name + ': retry is not blocked indefinitely');
      assert.equal(await T.W.KIVO.__BS_SRV.flushAsync(1000), true, name + ': a complete acknowledgement clears the queue');
      assert.equal(T.saves().length, 2, name);
      const retry = JSON.parse(T.saves()[1].body);
      assert.equal(JSON.parse(retry.set[A]).value, 'TEST_ONLY newest edit', name);
      assert.equal(JSON.parse(retry.set[B]).value, 'TEST_ONLY second department', name);
      assert.equal(T.nativeLS()[A], undefined);
      assert.equal(T.nativeLS()[B], undefined);
    } finally { T.dispose(); }
  }
});

test('A real no-op acknowledgement may use revision zero and still settles its explicit key', async () => {
  const initial = boot(); initial.revs[A] = 0;
  const T = loadClient({ C: { req: async () => json({ ok: 1, revs: { [A]: 0 }, denied: {}, conflicts: {} }) }, boot: initial });
  T.W.document.hidden = true;
  try {
    T.set(A, '{"value":"TEST_ONLY already stored by the server"}');
    assert.equal(await T.W.KIVO.__BS_SRV.flushAsync(1000), true);
    assert.equal(T.W.KIVO.__BS_SRV.dirty(), false);
    assert.equal(T.W.KIVO.__BS_SRV.rev(A), 0);
  } finally { T.dispose(); }
});

test('Atomic denial can omit unaffected keys; they remain queued instead of being reported as saved', async () => {
  let first = true;
  const C = { req: async (path, options) => {
    if (path === '/api/save' && first) {
      first = false;
      return json({ ok: 1, revs: {}, denied: { [A]: { why: 'view', cur: '{"value":"cloud A"}', rev: 1 } }, conflicts: {}, atomic: 'restore' });
    }
    return success.req(path, options);
  } };
  const T = loadClient({ C, boot: boot() });
  T.W.document.hidden = true;
  try {
    T.set(A, '{"value":"TEST_ONLY denied edit"}');
    T.set(B, '{"value":"TEST_ONLY eligible edit"}');
    assert.equal(await T.W.KIVO.__BS_SRV.flushAsync(1000), false);
    assert.equal(JSON.parse(T.get(A)).value, 'cloud A');
    assert.equal(T.W.KIVO.__BS_SRV.dirty(), true);
    assert.equal(await T.W.KIVO.__BS_SRV.flushAsync(1000), true);
    const retry = JSON.parse(T.saves()[1].body);
    assert.equal(retry.set[A], undefined, 'The denied edit is not resubmitted');
    assert.equal(JSON.parse(retry.set[B]).value, 'TEST_ONLY eligible edit');
  } finally { T.dispose(); }
});
