/* KIVO_265 · G-2 (تحقّقُ الخلفية BACKEND_VERIFY_265 — منخفض · بالوضعين): قاعدةُ الحساب النشط (قرارُ المالك 15:13 · البند 4) على الحفظ الخامّ كانت تُقاس
   على حسابات ما قبل الدفعة وحدها (054 · A.users) — فحفظةٌ واحدة تعطّل حسابَ موظفٍ وتُسند إليه مهمةً جديدة تمضي: مهمةٌ إلكترونية لحسابٍ معطَّل.
   الآن حين تحمل الحفظةُ سجلَّ الحسابات يُشترط النشاطُ في القائمتين — قبل الدفعة وبعدها (018 taskAcctWhy · users2):
     (أ) تعطيلٌ + إسنادٌ في حفظةٍ واحدة ⇒ task-acct ولا صفّ (والحسابُ يُعطَّل كما طُلب)
     (ب) ولا تراجع: تفعيلٌ + إسنادٌ في حفظةٍ واحدة ⇒ task-acct كما كان (fail-closed على ما قبل الدفعة)
     (ج) ولا رفضَ كاذب: تعديلٌ آخر في الحسابات + إسنادٌ لصاحب حسابٍ نشطٍ في القائمتين ⇒ يُكتب
   بياناتٌ اصطناعية وحدها (tasks_fx · TEST_ONLY). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, workerUnderTest, MATE, KT, DAY, TAG, stored, putKV, row, HR, operationSaveBody } from './tasks_fx.mjs';

const WU = workerUnderTest();
const KU = 'bassam_auth_users_v1';
const setDis = (W, uid, dis) => { const U = stored(W.env, KU); U.find((u) => u.id === uid).dis = dis; putKV(W.env, KU, U); };
const find = (S, id, eid) => { for (const d in S) for (const r of (S[d] || [])) if (Array.isArray(r) && r[13] === id && r[14] === eid) return r; return null; };
const show = (r) => JSON.stringify({ st: r.status, revs: r.j && r.j.revs, denied: r.j && r.j.denied && Object.fromEntries(Object.entries(r.j.denied).map(([k, v]) => [k, v && v.why])) });

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';
  /* حفظةُ مدير النظام: سجلُّ الحسابات (fu) + صفٌّ جديدٌ لـMATE في مخزن المهام — في دفعةٍ واحدة */
  const batch = async (W, id, fu) => {
    const g = (await W.C.api('/api/get?keys=' + encodeURIComponent(KU), { cookie: W.su.ck })).j.keys;
    const tasks = (await W.C.api('/api/operations/read?keys=' + encodeURIComponent(KT), { cookie: W.su.ck })).j;
    const U = JSON.parse(g[KU].v), S = tasks.resources[KT], s = Date.now() + 2 * HR;
    fu(U.find((u) => u.id === MATE.uid));
    S[DAY].push(row({ id, title: 'G-2 إسنادٌ في دفعة الحسابات', eid: MATE.eid, s, e: s + HR }));
    const body = { set: { [KU]: JSON.stringify(U), [KT]: JSON.stringify(S) }, del: [], base: { [KU]: g[KU].rev, [KT]: tasks.base[KT] } };
    if (mode === 'enforce') body.why = { [KU]: TAG + ' G-2', [KT]: TAG + ' G-2' };
    return W.C.api('/api/save', { method: 'POST', cookie: W.su.ck, body:operationSaveBody(W.env,'/api/save',body) });
  };

  test(M + '(أ) تعطيلُ الحساب وإسنادُ مهمةٍ إليه في حفظةٍ واحدة ⇒ task-acct ولا صفّ', async () => {
    const W = await world({ worker: WU.file, mode });
    const r = await batch(W, 1760000077101, (u) => { u.dis = 1; });
    assert.equal(r.j && r.j.denied && r.j.denied[KT] && r.j.denied[KT].why, 'task-acct', show(r));
    assert.equal(find(stored(W.env, KT), 1760000077101, MATE.eid), null, 'لم يُكتب صفّ');
    assert.equal(stored(W.env, KU).find((u) => u.id === MATE.uid).dis,0,'الحفظ الذري يرفض الدفعة كلها؛ لا تعطيل جزئي للحساب');
  });

  test(M + '(ب) ولا تراجع: تفعيلُ حسابٍ معطَّل وإسنادُه في حفظةٍ واحدة ⇒ task-acct كما كان', async () => {
    const W = await world({ worker: WU.file, mode }); setDis(W, MATE.uid, 1);
    const r = await batch(W, 1760000077102, (u) => { u.dis = 0; });
    assert.equal(r.j && r.j.denied && r.j.denied[KT] && r.j.denied[KT].why, 'task-acct', show(r));
    assert.equal(find(stored(W.env, KT), 1760000077102, MATE.eid), null, 'لم يُكتب صفّ');
  });

  test(M + '(ج) ولا رفضَ كاذب: تعديلٌ آخر في الحسابات + إسنادٌ لصاحب حسابٍ نشطٍ في القائمتين ⇒ يُكتب', async () => {
    const W = await world({ worker: WU.file, mode });
    const r = await batch(W, 1760000077103, (u) => { u.name = TAG + ' · اسمٌ معدَّل'; });
    assert.ok(r.j && r.j.revs && r.j.revs[KT] && r.j.revs[KU], show(r));
    assert.ok(find(stored(W.env, KT), 1760000077103, MATE.eid), 'الصفُّ مكتوب');
  });
}
