/* KIVO_264 · KIVO-Tasks — الرقعة 06 (reports/k264/tasks/patches/06-selfwrite-route-only.patch · يملك الملفاتِ وكيلُ الأمن/الخادم ·
   تُقرأ هنا من نسختها بايتاً tests/fixtures/tasks_patches/06-selfwrite-route-only.patch — KIVO_265 · AUD-029: reports/ لا يُصدَّر):
   كتابةُ الموظف على صفّه في مخزن المهام من المسار الذاتي وحده (POST /api/me/tasks/act — 062c يسِم الفاعلَ في الخادم A.__tkSelf).
   الثغرة (قائمةٌ على 263 وعلى الفرع قبل الرقعة): موظفٌ يقرأ المخزن (task.view — tst_emp1) يحفظ المخزنَ خاماً (/api/save) فيجعل مهمته «منجزة»
   بأداءٍ وطوابعَ يختارها — بلا سياسة الإثبات (ق2) ولا المراجِع المسمّى (ق3): selfTaskOnly (legacy) وself.task.respond (enforce) يقبلانه.
   بعد الرقعة يُرفض الحفظُ الخامّ نفسُه، ويبقى المسارُ الذاتيّ وحفظُ المسؤول (بمفاتيحه) كما هما. بياناتٌ اصطناعية وحدها. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, workerUnderTest, withPatch, KT, HR, hij, stored, taskCommandBody, operationSaveBody } from './tasks_fx.mjs';

const WU = workerUnderTest(), WP = withPatch(WU.file, '06-selfwrite-route-only.patch');
/* بعد دمج الرقعة (العاملُ يحملها) لا عاملَ «قبلها» يُختبر هنا — التوصيفُ يبقى صحيحاً على 263 ويُتخطّى */
const MERGED = !WP.patched;
const DM = ['0000000101', '70101'], EMP1 = ['0000000113', '70113'], EK = 'tst_e_emp1';
const post = (W, ck, p, body) => W.C.api(p, { method: 'POST', cookie: ck, body:operationSaveBody(W.env,p,taskCommandBody(W.env, p, body)) });
const rowOf = (W, k, id) => (stored(W.env, KT)[k] || []).find((r) => Array.isArray(r) && r[13] === id);

async function scenario(file, mode) {
  const W = await world({ worker: file, mode });
  const dm = await W.login(...DM), e1 = await W.login(...EMP1);
  const s = Date.now() - 60e3, k = hij(s);   /* force: الوردية الاصطناعية لـtst_emp1 نهاريةٌ — الأهليةُ ليست موضوعَ هذا الاختبار (AT-05) */
  const c = await post(W, dm.ck, '/api/tasks/create', { k, t: 'TEST_ONLY مهمةٌ بمراجِع', s, e: s + 2 * HR, asg: [EK], force: true });
  assert.equal(c.status, 200, JSON.stringify(c.j));
  const id = c.j.rows[0].id;
  const st = await post(W, e1.ck, '/api/me/tasks/act', { k, id, act: 'start' });
  assert.equal(st.status, 200, 'البدءُ من المسار الذاتي: ' + JSON.stringify(st.j));
  /* الهجوم: قراءةُ المخزن كاملاً (task.view) ثم حفظُه خاماً بصفّي «منجزاً» بأداءٍ مختار وتسليمٍ مزعوم */
  const g = await W.C.api("/api/operations/read?keys=" + encodeURIComponent(KT), { cookie: e1.ck });
  assert.equal(g.status, 200); const S = g.j.resources[KT], base = g.j.base[KT];
  const L = S[k], i = L.findIndex((r) => Array.isArray(r) && r[13] === id), now = Date.now();
  L[i] = L[i].slice(); L[i][3] = 'done'; L[i][12] = now; L[i][6] = ['early', 'مبكر بـ 2 س'];
  L[i][21] = { imgs: [], note: 'TEST_ONLY إنجازٌ مزعوم', at: now, sub: now };
  const raw = await W.C.api('/api/save',{method:'POST',cookie:e1.ck,body:operationSaveBody(W.env,'/api/save',Object.assign({set:{ [KT]: JSON.stringify(S) },del:[],base:{ [KT]: base }},{}))});
  return { W, dm, e1, k, id, raw };
}

for (const mode of ['legacy', 'enforce']) {
  test('[' + mode + '] الثغرةُ قبل الرقعة 06 (توصيف): حاملُ task.view يجعل مهمته «منجزة» بحفظٍ خامّ متجاوزاً المراجِعَ وسياسةَ الإثبات', { skip: MERGED ? 'الرقعة 06 مدمجةٌ في العامل' : false }, async () => {
    const { W, k, id, raw } = await scenario(WU.file, mode);
    assert.equal(raw.status, 200, JSON.stringify(raw.j));
    assert.ok(raw.j.revs && raw.j.revs[KT], 'الحفظُ الخامّ قُبل: ' + JSON.stringify(raw.j));
    const r = rowOf(W, k, id); assert.equal(r[3], 'done', 'صارت «منجزة» بلا مراجعة'); assert.equal(r[6][0], 'early', 'وبأداءٍ اختاره الموظف');
  });

  test('[' + mode + '] بعد الرقعة 06: الحفظُ الخامّ نفسُه يُرفض · المسارُ الذاتيّ يعمل · والمراجِعُ يعتمد · وحفظُ المسؤول بمفاتيحه لا يتأثر', async () => {
    const { W, dm, e1, k, id, raw } = await scenario(WP.file, mode);
    assert.ok(!(raw.j.revs && raw.j.revs[KT]), 'لا مراجعةَ لمخزن المهام: ' + JSON.stringify(raw.j));
    assert.ok(raw.j.denied && raw.j.denied[KT], 'رفضٌ صريح للمفتاح: ' + JSON.stringify(raw.j));
    let r = rowOf(W, k, id); assert.equal(r[3], 'in_progress', 'الصفُّ كما كان'); assert.ok(!(r[21] && r[21].sub), 'لا تسليمَ مزعوم');
    /* المسارُ الذاتيّ: تسليمٌ بسياسة «صورة أو ملاحظة» ⇒ بانتظار المراجِع (منشئِها) ⇒ يعتمدها */
    const sb = await post(W, e1.ck, '/api/me/tasks/act', { k, id, act: 'submit', note: 'TEST_ONLY أُنجزت فعلاً' });
    assert.equal(sb.status, 200, JSON.stringify(sb.j)); assert.equal(sb.j.row.ph, 'review');
    const ap = await post(W, dm.ck, '/api/tasks/review', { k, id, ekey: EK, decision: 'approve' });
    assert.equal(ap.status, 200, JSON.stringify(ap.j)); r = rowOf(W, k, id); assert.equal(r[3], 'done'); assert.equal(r[23].rev.st, 'approved');
    /* المسؤولُ بمفاتيحه (task.edit/finish): حفظُه الخامّ على صفّ موظفٍ ما زال يُقبل — الرقعةُ تقصر «الذات» لا صلاحياتِ الإدارة */
    const g = await W.C.api("/api/operations/read?keys=" + encodeURIComponent(KT), { cookie: dm.ck }); const S = g.j.resources[KT];
    const i = S[k].findIndex((q) => Array.isArray(q) && q[13] === id); S[k][i] = S[k][i].slice(); S[k][i][1] = 'TEST_ONLY وصفٌ عدّله المسؤول';
    const ms = await W.C.api('/api/save',{method:'POST',cookie:dm.ck,body:operationSaveBody(W.env,'/api/save',Object.assign({set:{ [KT]: JSON.stringify(S) },del:[],base:{ [KT]: g.j.base[KT] }},{}))});
    assert.ok(ms.j.revs && ms.j.revs[KT], 'حفظُ المسؤول: ' + JSON.stringify(ms.j));
  });
}
