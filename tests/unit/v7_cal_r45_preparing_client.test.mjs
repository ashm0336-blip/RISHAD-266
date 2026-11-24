/* V7 · 53 تقويم (REVIEW 45) — إدارةٌ معلَّقة (cal_pend) والخادمُ يحوّل بمهلة الطلب ⇒ 503 calendar-preparing بتقدّمه، في خدمة الإيداع العامة (280). TEST_ONLY.
   ① الحفظ: 503 ×2 ثم 200 ⇒ التعديلُ يُحفظ مرةً واحدة بالطلب نفسِه، والمستخدمُ يرى «تُجهَّز البيانات … (n من m)» لا رسالةَ فشل، ولا «تم» قبل الإيصال.
   ② القراءة: 503 ×2 ثم 200 ⇒ القراءةُ تُعاد تلقائياً وتعيد البيانات، والتقدّمُ معروض. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadClient, pageText } from './k264_vm.mjs';

const E = 'bsdept:dA:bassam_employees_v1', UID = 'TEST_ONLY owner', SCALE = 40;
const copy = (v) => JSON.parse(JSON.stringify(v));
const json = (v, status = 200) => new Response(JSON.stringify(v), { status, headers: { 'Content-Type': 'application/json' } });
const prep = (n, m) => json({ ok: 0, err: 'calendar-preparing', msg: 'تُجهَّز البيانات للتقويم الميلادي (' + n + ' من ' + m + '). تُعرض بعد لحظات.', details: { done: n, total: m } }, 503);
function world({ save, readFail = 0 }) {
  const server = { documents: { [E]: [{ eid: 'TEST_ONLY e1' }] }, revs: { [E]: 4 }, receipts: new Map(), seen: [], reads: 0 };
  const C = { req: async (route, options = {}) => {
    if (route.startsWith('/api/operations/read?')) {
      server.reads++; if (server.reads <= readFail) return prep(server.reads * 3, 9);
      const keys = new URL(route, 'http://x').searchParams.get('keys').split(','), v = { ok: 1, uid: UID, epoch: 3, v: 7, resources: {}, absent: [], denied: [], base: {} };
      for (const k of keys) { v.resources[k] = copy(server.documents[k]); v.base[k] = server.revs[k]; }
      return json(v);
    }
    if (route === '/api/save') { server.seen.push(options.body); return save(options.body, server); }
    return json({ v: 1, keys: [] });
  } };
  const T = loadClient({ C, boot: { srv: 1, cf: 1, uid: UID, v: 1, keys: {}, revs: {} } });
  const st = T.W.setTimeout; T.W.setTimeout = (f, ms, ...a) => st(f, Math.max(0, Math.round((ms || 0) / SCALE)), ...a);
  T.W.document.hidden = true;
  T.W.KIVO.BassamAuth = { user: () => ({ id: UID, role: 'dept', deptId: 'dA' }) };
  T.W.KIVO.BassamDepts = { active: () => 'dA' };
  const shown = []; T.W.KIVO.__bsPrep = (t) => shown.push(t);
  return { T, operations: T.W.KIVO.__BS_SRV.operations, server, shown };
}
function commit(body, server) {
  const r = JSON.parse(body);
  if (server.receipts.has(r.requestId)) return Object.assign({}, server.receipts.get(r.requestId), { duplicate: 1 });
  const revs = {};
  for (const k of Object.keys(r.set)) { if (r.base[k] !== server.revs[k]) return { conflict: 1 }; server.documents[k] = JSON.parse(r.set[k]); revs[k] = ++server.revs[k]; }
  const receipt = { ok: 1, requestId: r.requestId, epoch: r.epoch, atomic: 1, revs, denied: {}, conflicts: {}, v: 8 };
  server.receipts.set(r.requestId, receipt); return receipt;
}
const edit = (eid) => (d) => d.set('bassam_employees_v1', [...d.get('bassam_employees_v1'), { eid }]);

test('R45 ① save: 503 calendar-preparing twice, then 200 — the edit is saved once by the same request, the progress is shown and no failure is said', async () => {
  const f = world({ save: (body, s) => (s.seen.length <= 2 ? prep(s.seen.length * 4, 12) : json(commit(body, s))) });
  try {
    await f.operations.read([E]);
    const result = await f.operations.commit({}, 'editor', { add: 'TEST_ONLY e2' }, edit('TEST_ONLY e2'));
    assert.equal(result.ok, 1, JSON.stringify(result));
    assert.equal(f.server.seen.length, 3, 'two refusals and one accepted send');
    assert.ok(f.server.seen.every((b) => b === f.server.seen[0]), 'the very same request each time');
    assert.deepEqual(f.server.documents[E].map((x) => x.eid), ['TEST_ONLY e1', 'TEST_ONLY e2'], 'saved once, nothing lost');
    assert.deepEqual(f.shown, ['تُجهَّز البيانات للتقويم الميلادي (4 من 12) — سيُحفظ تعديلك تلقائياً', 'تُجهَّز البيانات للتقويم الميلادي (8 من 12) — سيُحفظ تعديلك تلقائياً']);
    assert.match(pageText(f.T.W), /تُجهَّز البيانات للتقويم الميلادي \(8 من 12\) — سيُحفظ تعديلك تلقائياً/, 'the real reason is on the page');
    await new Promise((r) => setTimeout(r, 80));
    const text = pageText(f.T.W);
    assert.doesNotMatch(text, /تعذّر الحفظ|المنصة مشغولة|لم يُحفظ تعديلك|راجع التغييرات والصلاحيات/, 'no failure message: ' + text);
  } finally { f.T.dispose(); }
});

test('R45 ③ explain: a save refused by calendar-preparing says the real reason (never «راجع التغييرات والصلاحيات»), and another error keeps its own message', async () => {
  const f = world({ save: (b, s) => json(commit(b, s)) });
  try {
    const ex = f.operations.explain;
    assert.equal(ex({ ok: 0, err: 'calendar-preparing', status: 503, details: { done: 3, total: 9 } }), 'تُجهَّز البيانات للتقويم الميلادي (3 من 9) — سيُحفظ تعديلك تلقائياً');
    assert.equal(ex({ ok: 0, err: 'calendar-preparing', status: 503 }), 'تُجهَّز البيانات للتقويم الميلادي — سيُحفظ تعديلك تلقائياً');
    assert.match(ex({ ok: 0, err: 'db-busy', status: 503 }), /المنصة مشغولة الآن/);
    assert.equal(ex({ ok: 0, err: 'x', status: 400, msg: 'TEST_ONLY سببٌ من الخادم' }), 'TEST_ONLY سببٌ من الخادم');
  } finally { f.T.dispose(); }
});

test('R45 ② read: 503 calendar-preparing twice, then 200 — retried automatically, the data returned and the progress shown', async () => {
  const f = world({ save: (b, s) => json(commit(b, s)), readFail: 2 });
  try {
    const r = await f.operations.read([E]);
    assert.equal(r.ok, 1, JSON.stringify(r));
    assert.equal(f.server.reads, 3);
    assert.equal(JSON.stringify(r.resources ? r.resources[E] : f.operations.get('bassam_employees_v1')), JSON.stringify([{ eid: 'TEST_ONLY e1' }]));
    assert.deepEqual([...f.shown], ['تُجهَّز البيانات للتقويم الميلادي (3 من 9). تُعرض بعد لحظات.', 'تُجهَّز البيانات للتقويم الميلادي (6 من 9). تُعرض بعد لحظات.']);
    assert.match(pageText(f.T.W), /تُجهَّز البيانات للتقويم الميلادي \(6 من 9\)/, 'the progress is on the page');
  } finally { f.T.dispose(); }
});
