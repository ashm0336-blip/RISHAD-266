/* V7 · د5-ب — ناقلُ الأحداث في القاعدة (src/core/060-bus.js)، محمَّلاً مع خدمة العمليات الحقيقية (280):
     ① الأشكال الأربعة: قراءة · أمر · حدث · مشارك — والغيابُ ليس خطأً (undefined · {ok:0,absent:1} · 0).
     ② المشاركُ داخل المسودة نفسها: الناشرُ يحفظ مفتاحَه، والمشاركُ يضيف مفتاحَه هو إلى المسودة نفسِها ⇒ طلبُ حفظٍ واحد يحمل المفتاحين.
     ③ الذرّية: مشاركٌ يرمي ⇒ لا يُرسل شيء (لا مفتاحُ الناشر ولا مفتاحُ غيره) · والخادمُ يرفض ⇒ لا يتغيّر أيٌّ من المفتاحين.
     ④ القاعدةُ بلا اسم أي برنامج: ملفُ الناقل لا يذكر مفتاحَ بياناتٍ ولا اسمَ نظام. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadClient } from './k264_vm.mjs';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const A = 'bsdept:dA:bassam_employees_v1', B = 'bsdept:dA:bassam_callsigns_v1'   /* V7 · 53: a resource stored whole (staffing_v3 is stored by period: tests/unit/v7_d53_periods_client.test.mjs) */, UID = 'TEST_ONLY owner';
const copy = (v) => JSON.parse(JSON.stringify(v));
const json = (v, status = 200) => new Response(JSON.stringify(v), { status, headers: { 'Content-Type': 'application/json' } });
function world(save) {
  const documents = { [A]: [{ eid: 'TEST_ONLY e1' }], [B]: { 'TEST_ONLY': 1 } }, revs = { [A]: 4, [B]: 4 }, seen = [];
  const C = { req: async (route, options = {}) => {
    if (route.startsWith('/api/operations/read?')) {
      const keys = new URL(route, 'http://x').searchParams.get('keys').split(',');
      const value = { ok: 1, uid: UID, epoch: 3, v: 7, resources: {}, absent: [], denied: [], base: {} };
      for (const key of keys) { value.resources[key] = copy(documents[key]); value.base[key] = revs[key]; }
      return json(value);
    }
    if (route === '/api/save') {
      seen.push(options.body); const request = JSON.parse(options.body);
      if (save) { const out = save(request); if (out) return out; }
      for (const key of Object.keys(request.set)) { documents[key] = JSON.parse(request.set[key]); revs[key]++; }
      return json({ ok: 1, requestId: request.requestId, epoch: request.epoch, atomic: 1, revs: Object.fromEntries(Object.keys(request.set).map((k) => [k, revs[k]])) });
    }
    return json({ v: 1, keys: [] });
  } };
  const T = loadClient({ C, blocks: ['280-server-storage.js', '060-bus.js'], boot: { srv: 1, cf: 1, uid: UID, v: 1, keys: {}, revs: {} } });
  T.W.document.hidden = true;
  T.W.KIVO.BassamAuth = { user: () => ({ id: UID, role: 'dept', deptId: 'dA' }) };
  T.W.KIVO.BassamDepts = { active: () => 'dA' };
  return { T, bus: T.W.KIVO.bus, operations: T.W.KIVO.__BS_SRV.operations, documents, seen };
}

test('① read · command · event · participant, and an absent party is not an error', () => {
  const f = world();
  try {
    const bus = f.bus;
    assert.equal(bus.read('thing.value@1', 1), undefined); assert.deepEqual(copy(bus.call('thing.do@1', {})), { ok: 0, absent: 1 });
    assert.equal(bus.publish('thing.changed@1', {}), 0); assert.equal(bus.has('thing.value@1'), false);
    const off = bus.provide('thing.value@1', (n) => n * 2); assert.equal(bus.read('thing.value@1', 21), 42); assert.equal(bus.has('thing.value@1'), true);
    assert.throws(() => bus.provide('thing.value@1', () => 0), /bus-read-taken/, 'one provider per name');
    off(); assert.equal(bus.read('thing.value@1', 21), undefined);
    bus.command('thing.do@1', (p) => ({ ok: 1, got: p.x })); assert.deepEqual(copy(bus.call('thing.do@1', { x: 7 })), { ok: 1, got: 7 });
    const got = []; bus.subscribe('thing.changed@1', () => { throw Error('TEST_ONLY listener failure'); }); const stop = bus.subscribe('thing.changed@1', (p) => got.push(p.n));
    assert.equal(bus.publish('thing.changed@1', { n: 1 }), 1, 'a failing listener does not stop the others nor the publisher'); assert.deepEqual(got, [1]);
    stop(); bus.publish('thing.changed@1', { n: 2 }); assert.deepEqual(got, [1]);
    for (const bad of ['thing', 'Thing.x@1', 'thing.x', 'thing.x@0', 'thing x@1', '', null]) assert.throws(() => bus.publish(bad, {}), /bus-name/, String(bad));
    assert.throws(() => bus.participate('thing.saved@1', {}, null), /bus-draft-required/);
    assert.ok(Object.isFrozen(bus));
  } finally { f.T.dispose(); }
});

test('② a participant adds its own change to the publisher\'s draft: one save request carries both keys', async () => {
  const f = world();
  try {
    await f.operations.read([A, B]);
    /* the participant owns bassam_staffing_v3 and reacts to the publisher's event inside the same draft */
    f.bus.participant('thing.saved@1', (payload, draft) => { draft.set('bassam_callsigns_v1', { ...draft.get('bassam_callsigns_v1'), from: payload.eid }); });
    const result = await f.operations.commit({}, 'editor', { add: 'TEST_ONLY e2' }, (draft) => {
      draft.set('bassam_employees_v1', [...draft.get('bassam_employees_v1'), { eid: 'TEST_ONLY e2' }]);
      assert.equal(f.bus.participate('thing.saved@1', { eid: 'TEST_ONLY e2' }, draft), 1);
    });
    assert.equal(result.ok, 1, JSON.stringify(result));
    assert.equal(f.seen.length, 1, 'exactly one save request');
    assert.deepEqual(Object.keys(JSON.parse(f.seen[0]).set).sort(), [A, B].sort(), 'both keys travel in the same request');
    assert.deepEqual(f.documents[A].map((x) => x.eid), ['TEST_ONLY e1', 'TEST_ONLY e2']); assert.equal(f.documents[B].from, 'TEST_ONLY e2');
  } finally { f.T.dispose(); }
});

test('③ atomic: a throwing participant sends nothing; a refusing server changes neither key', async () => {
  let f = world();
  try {
    await f.operations.read([A, B]);
    f.bus.participant('thing.saved@1', () => { throw Error('TEST_ONLY participant refuses'); });
    const result = await f.operations.commit({}, 'editor', { add: 'x' }, (draft) => { draft.set('bassam_employees_v1', []); f.bus.participate('thing.saved@1', {}, draft); });
    assert.equal(result.ok, 0); assert.equal(f.seen.length, 0, 'nothing was sent — not even the publisher\'s own key');
    assert.deepEqual(f.documents[A].map((x) => x.eid), ['TEST_ONLY e1']);
  } finally { f.T.dispose(); }
  f = world((request) => json({ ok: 0, requestId: request.requestId, epoch: request.epoch, atomic: 1, revs: {}, denied: { [B]: { why: 'perm' } }, conflicts: {} }, 403));
  try {
    await f.operations.read([A, B]);
    f.bus.participant('thing.saved@1', (payload, draft) => { draft.set('bassam_callsigns_v1', { changed: 1 }); });
    const result = await f.operations.commit({}, 'editor', { add: 'x' }, (draft) => { draft.set('bassam_employees_v1', []); f.bus.participate('thing.saved@1', {}, draft); });
    assert.equal(result.ok, 0); assert.equal(result.err, 'denied'); assert.equal(f.seen.length, 1);
    assert.deepEqual(f.documents[A].map((x) => x.eid), ['TEST_ONLY e1'], 'the publisher\'s key did not change either'); assert.deepEqual(f.documents[B], { 'TEST_ONLY': 1 });
  } finally { f.T.dispose(); }
});

test('④ the bus names no program and no data key', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/core/060-bus.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(src, /bassam_[a-z0-9_]+_v\d/);
  const names = fs.readdirSync(path.join(ROOT, 'src/systems')).filter((n) => !n.startsWith('_')).concat(['staff', 'plan', 'rounds', 'daily', 'dreport', 'planning']);
  for (const n of names) assert.doesNotMatch(src, new RegExp('\\b' + n + '\\b'), n);
});
