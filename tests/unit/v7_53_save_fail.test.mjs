/* V7 · 53 — فشلُ الحفظ (الفحص الحي البند 2 · S8 · ملحق 4 البند 4) في خدمة الإيداع العامة (280)، بلا متصفح. بيانات TEST_ONLY.
     ① 500 `save-failed` مرةً ثم نجاح ⇒ يُعاد الطلبُ نفسُه (المعرّف والجسم) تلقائياً فينجح — كان «غير مؤكَّد» بلا رسالة.
     ② 500 دائماً ⇒ ثلاثُ إعاداتٍ بالطلب نفسِه، ثم قراءةُ تحقق: النسخةُ لم تتغيّر ⇒ فشلٌ مؤكَّد (لا «غير مؤكَّد»)، والمعروضُ هو المحفوظ،
        ورسالةٌ صريحة في التوست، والإجراءُ التالي يُرسل طلباً جديداً (لا «review-required» عالق).
     ③ الخادم كتب ثم ردّ 500 (الردُّ ضاع بعد الكتابة) ⇒ الإعادةُ بالمعرّف نفسِه تُحسم «مكرَّراً» من إيصاله — الفعلُ لا يتكرّر.
     ④ S8: حفظٌ يطول أكثر من مهلة الإفراغ (8 ث) ⇒ لا «pending/فشل» والطلبُ في الطريق: يُنتظر إيصالُه فيُعلن نجاحاً.
     ⑤ S8: الخادم كتب وإيصالُه ما زال في الطريق بعد الانتظار كلِّه ⇒ قراءةُ المورد تثبت الحفظ قبل أيّ إعلان فشل.
     ⑥ 503 `db-busy` (مجموعة «periods») ⇒ إعادةٌ آمنة بالطلب نفسِه. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadClient, pageText } from './k264_vm.mjs';

const E = 'bsdept:dA:bassam_employees_v1';
const UID = 'TEST_ONLY owner';
const SCALE = 40;   /* المؤقّتاتُ أسرع ٤٠ مرة (مهلةُ الإفراغ 8 ث ⇒ 200 م.ث) — الترتيبُ الزمنيُّ نفسُه */
const copy = (value) => JSON.parse(JSON.stringify(value));
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function world(save) {
  const server = { documents: { [E]: [{ eid: 'TEST_ONLY e1', name: 'TEST_ONLY employee' }] }, revs: { [E]: 4 }, receipts: new Map(), seen: [], down: false };
  const C = { req: async (route, options = {}) => {
    if (route.startsWith('/api/operations/read?')) {
      const keys = new URL(route, 'http://x').searchParams.get('keys').split(',');
      const value = { ok: 1, uid: UID, epoch: 3, v: 7, resources: {}, absent: [], denied: [], base: {} };
      for (const key of keys) { value.resources[key] = copy(server.documents[key]); value.base[key] = server.revs[key]; }
      return json(value);
    }
    if (route === '/api/save') { server.seen.push(options.body); return save(options.body, server); }
    return json({ v: 1, keys: [] });
  } };
  const T = loadClient({ C, boot: { srv: 1, cf: 1, uid: UID, v: 1, keys: {}, revs: {} } });
  const st = T.W.setTimeout; T.W.setTimeout = (f, ms, ...a) => st(f, Math.max(0, Math.round((ms || 0) / SCALE)), ...a);
  T.W.document.hidden = true;
  T.W.KIVO.BassamAuth = { user: () => ({ id: UID, role: 'dept', deptId: 'dA' }) };
  T.W.KIVO.BassamDepts = { active: () => 'dA' };
  return { T, operations: T.W.KIVO.__BS_SRV.operations, server };
}
/* خادمٌ يخزّن فعلاً ويحسم المكرَّر من إيصاله (كما restore_operations في 019e) */
function commit(body, server) {
  const request = JSON.parse(body);
  if (server.receipts.has(request.requestId)) return Object.assign({}, server.receipts.get(request.requestId), { duplicate: 1 });
  const revs = {};
  for (const key of Object.keys(request.set)) { if (request.base[key] !== server.revs[key]) return { conflict: 1 }; server.documents[key] = JSON.parse(request.set[key]); revs[key] = ++server.revs[key]; }
  const receipt = { ok: 1, requestId: request.requestId, epoch: request.epoch, atomic: 1, revs, denied: {}, conflicts: {}, v: 8 };
  server.receipts.set(request.requestId, receipt); return receipt;
}
const fail500 = () => json({ ok: 0, err: 'save-failed', rid: 'TEST_ONLY_rid' }, 500);
const edit = (eid) => (draft) => draft.set('bassam_employees_v1', [...draft.get('bassam_employees_v1'), { eid }]);
const eids = (f) => f.server.documents[E].map((x) => x.eid);

test('① 500 save-failed once, then the same request (same requestId and body) succeeds — no silent uncertain', async () => {
  const f = world((body, server) => (server.seen.length === 1 ? fail500() : json(commit(body, server))));
  try {
    await f.operations.read([E]);
    const result = await f.operations.commit({}, 'editor', { add: 'TEST_ONLY e2' }, edit('TEST_ONLY e2'));
    assert.equal(result.ok, 1, JSON.stringify(result));
    assert.equal(f.server.seen.length, 2); assert.equal(f.server.seen[0], f.server.seen[1], 'the retry is the very same request');
    assert.deepEqual(eids(f), ['TEST_ONLY e1', 'TEST_ONLY e2']);
  } finally { f.T.dispose(); }
});

test('② 500 every time: three automatic retries, then a verifying read proves nothing was written ⇒ a definite failure, the stored state shown, a clear message, and the next action is a fresh request', async () => {
  let fail = true;
  const f = world((body, server) => (fail ? fail500() : json(commit(body, server))));
  try {
    await f.operations.read([E]);
    const owner = {};
    const result = await f.operations.commit(owner, 'editor', { add: 'TEST_ONLY e2' }, edit('TEST_ONLY e2'));
    assert.deepEqual([result.ok, result.err, result.uncertain, result.failed], [0, 'save-failed', false, 1], JSON.stringify(result));
    assert.equal(f.server.seen.length, 4, 'one request and three retries');
    assert.ok(f.server.seen.every((b) => b === f.server.seen[0]), 'every retry is the same request — the action is never repeated');
    assert.equal(JSON.stringify(f.operations.get('bassam_employees_v1').map((x) => x.eid)), JSON.stringify(['TEST_ONLY e1']), 'the page reads what is actually stored');
    await sleep(80);
    assert.match(pageText(f.T.W), /تعذّر الحفظ \(رمز 500\)/, 'the failure is said, not silent');
    fail = false;
    const next = await f.operations.commit(owner, 'editor', { add: 'TEST_ONLY e3' }, edit('TEST_ONLY e3'));
    assert.equal(next.ok, 1, JSON.stringify(next));
    assert.notEqual(JSON.parse(f.server.seen[4]).requestId, JSON.parse(f.server.seen[0]).requestId, 'a new action is a new request');
    assert.deepEqual(eids(f), ['TEST_ONLY e1', 'TEST_ONLY e3']);
  } finally { f.T.dispose(); }
});

test('③ the server wrote and then answered 500: the retry with the same requestId is settled as a duplicate from its receipt — written once', async () => {
  const f = world((body, server) => { const r = commit(body, server); return server.seen.length === 1 ? fail500() : json(r); });
  try {
    await f.operations.read([E]);
    const result = await f.operations.commit({}, 'editor', { add: 'TEST_ONLY e2' }, edit('TEST_ONLY e2'));
    assert.equal(result.ok, 1, JSON.stringify(result));
    assert.deepEqual(eids(f), ['TEST_ONLY e1', 'TEST_ONLY e2'], 'written exactly once');
    assert.equal(f.server.revs[E], 5);
  } finally { f.T.dispose(); }
});

test('④ S8: a save slower than the flush wait is not declared failed while its request is in flight — its receipt is awaited', async () => {
  const f = world(async (body, server) => { await sleep(700); return json(commit(body, server)); });   /* 700 م.ث = 28 ث بالمقياس */
  try {
    await f.operations.read([E]);
    const result = await f.operations.commit({}, 'editor', { add: 'TEST_ONLY e2' }, edit('TEST_ONLY e2'));
    assert.equal(result.ok, 1, JSON.stringify(result));
    assert.equal(f.server.seen.length, 1);
    await sleep(60);
    assert.doesNotMatch(pageText(f.T.W), /لم يصل تأكيد|تعذّر/, 'no failure message for a save that succeeded');
  } finally { f.T.dispose(); }
});

test('⑤ S8: the server saved but its answer is still on the way after the whole wait — the resource read proves the save before any failure is declared', async () => {
  const f = world(async (body, server) => { const r = commit(body, server); await sleep(4000); return json(r); });   /* الإيصالُ بعد 160 ث بالمقياس */
  try {
    await f.operations.read([E]);
    const result = await f.operations.commit({}, 'editor', { add: 'TEST_ONLY e2' }, edit('TEST_ONLY e2'));
    assert.equal(result.ok, 1, JSON.stringify(result)); assert.equal(result.verified, 1);
    assert.deepEqual(eids(f), ['TEST_ONLY e1', 'TEST_ONLY e2'], 'written exactly once');
    assert.equal(f.server.seen.length, 1, 'nothing re-sent');
  } finally { f.T.dispose(); }
});

test('⑥ 503 db-busy (server mapping of unknown D1 errors) is retried safely with the same request', async () => {
  const f = world((body, server) => (server.seen.length < 3 ? json({ ok: 0, err: 'db-busy' }, 503) : json(commit(body, server))));
  try {
    await f.operations.read([E]);
    const result = await f.operations.commit({}, 'editor', { add: 'TEST_ONLY e2' }, edit('TEST_ONLY e2'));
    assert.equal(result.ok, 1, JSON.stringify(result)); assert.equal(f.server.seen.length, 3);
  } finally { f.T.dispose(); }
});
