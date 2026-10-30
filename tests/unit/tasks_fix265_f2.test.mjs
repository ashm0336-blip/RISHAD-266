/* KIVO_265 · F-2/R-21 (تدقيقُ الصلاحيات RBAC_AUDIT_265 — متوسط): حمايةُ التكرار التي يذكرها R-21 («التكرارُ يتحقّق من صاحب السلسلة بسجل الخادم») كانت تُتجاوز:
   في القديم علامةُ الاستعادة يدّعيها العميلُ وتُقبل لمدير الإدارة (018 taskSrvExempt) فيزوّر العمودَ 23 (x.by = غيرُه)، وtkRecurAuthorOk (073) يقبل حدثَ
   «أُنشئت» لأيّ مهمةٍ للضحية بهوية كيان النموذج (tkEntId = العمودُ 22 كما كتبه العميل · 070) — فيكتب الخادمُ نُسخَ السلسلة المزوَّرة باسم الضحية يومياً.
     (أ) [القديم] علامةُ الاستعادة من مدير الإدارة لا تفتح العمودَ 23 ⇒ task-x (بديلُ R-21 الموصى به: لمدير النظام وحده)
     (ب) [بالوضعين] نموذجُ سلسلةٍ يحمل x.by = المشرف وطابعَ مهمةٍ حقيقيةٍ له (العمود 22) — يكتبه مديرُ النظام باستعادةٍ مخوَّلة — لا يولِّد شيئاً باسم المشرف
         (صاحبُ السلسلة = حدثُ «أُنشئت» للسلسلة بمعرّفها وحده)
     (ج) ولا تراجع: السلسلةُ الحقيقية (من /api/tasks/create) تولِّد كما كانت
   بياناتٌ اصطناعية وحدها (tasks_fx · TEST_ONLY). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, workerUnderTest, MATE, KT, D, TAG, stored, hij, HR } from './tasks_fx.mjs';

const WU = workerUnderTest();
const DM = ['0000000101', '70101'], SUP = ['0000000111', '70111'], SUP_UID = 'tst_sup1';
const post = (W, ck, p, body) => W.C.api(p, { method: 'POST', cookie: ck, body });
const getKT = async (W, ck) => (await W.C.api('/api/get?keys=' + encodeURIComponent(KT), { cookie: ck })).j.keys[KT];
const show = (r) => JSON.stringify({ st: r.status, revs: r.j && r.j.revs, denied: r.j && r.j.denied && Object.fromEntries(Object.entries(r.j.denied).map(([k, v]) => [k, v && v.why])), created: r.j && r.j.created });
const RST = (why) => ({ ops: { [KT]: { op: 'backup.restore', scope: 'dept', mode: 'replace', reason: why } }, aud: [{ cid: 'f2r' + Date.now().toString(36), k: KT, etype: 'dataset', act: 'restore', eid: 'bassam_tasks_v1', ename: 'bassam_tasks_v1' }], why: { [KT]: why } });
const genOf = (W, rec) => { let n = 0; const S = stored(W.env, KT); for (const d in S) for (const r of S[d] || []) if (Array.isArray(r) && r[23] && r[23].rec && r[23].rec.id === rec) n++; return n; };

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';

  if (mode === 'legacy') test(M + '(أ) علامةُ الاستعادة من مدير الإدارة لا تفتح العمودَ 23 في القديم ⇒ task-x', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM), s = Date.now() + 2 * HR;
    const c = await post(W, dm.ck, '/api/tasks/create', { k: hij(s), t: TAG + ' F-2', s, e: s + HR, asg: [], rv: 'none' }); assert.equal(c.status, 200, show(c));
    const k = c.j.rows[0].k, id = c.j.rows[0].id, g = await getKT(W, dm.ck), S = JSON.parse(g.v), i = S[k].findIndex((r) => r[13] === id);
    S[k][i] = S[k][i].slice(); S[k][i][23] = Object.assign({}, S[k][i][23], { by: { u: SUP_UID, e: '', n: TAG + ' مزوَّر' } });
    const r = await post(W, dm.ck, '/api/save', Object.assign({ set: { [KT]: JSON.stringify(S) }, del: [], base: { [KT]: g.rev } }, RST(TAG + ' استعادة')));
    assert.equal(r.j && r.j.denied && r.j.denied[KT] && r.j.denied[KT].why, 'task-x', show(r));
    assert.notEqual((stored(W.env, KT)[k].find((q) => q[13] === id)[23].by || {}).u, SUP_UID, 'x كما هي');
  });

  test(M + '(ب) نموذجُ سلسلةٍ يُنسب إلى المشرف بطابع مهمةٍ له (العمود 22) لا يولِّد شيئاً باسمه', async () => {
    const W = await world({ worker: WU.file, mode }); const sup = await W.login(...SUP), s = Date.now() + 2 * HR;
    const c = await post(W, sup.ck, '/api/tasks/create', { k: hij(s), t: TAG + ' مهمةُ المشرف', s, e: s + HR, asg: [], rv: 'none' }); assert.equal(c.status, 200, show(c));
    const stamp = stored(W.env, KT)[c.j.rows[0].k].find((q) => q[13] === c.j.rows[0].id)[22]; assert.ok(stamp, 'طابعُ مهمة المشرف');
    const g = await getKT(W, W.su.ck), S = JSON.parse(g.v), s2 = Date.now() + 3 * HR, k2 = hij(s2);
    const x = { v: 2, by: { u: SUP_UID, e: '', n: TAG + ' مزوَّر' }, pol: { m: 'none' }, rv: null, dec: 1, rec: { t: 'daily', id: 'rforgedf2', ver: 1, from: k2, to: hij(s2 + 20 * 864e5), paused: 0, asg: [MATE.eid] } };
    S[k2] = (S[k2] || []).concat([[TAG + ' سلسلةٌ مزوَّرة', '', 'normal', 'pending', 'normal', 'مضافة', null, ['T'], MATE.name, TAG, 60, null, null, 1790000000223, MATE.eid, s2, s2 + HR, null, null, null, null, null, stamp, x]]);
    const w = await post(W, W.su.ck, '/api/save', Object.assign({ set: { [KT]: JSON.stringify(S) }, del: [], base: { [KT]: g.rev } }, RST(TAG + ' استعادةُ نسخة')));
    assert.ok(w.j && w.j.revs && w.j.revs[KT], 'النموذجُ مكتوبٌ باستعادةٍ مخوَّلة: ' + show(w));
    const rr = await post(W, W.su.ck, '/api/tasks/recur/run?dept=' + D, {}); assert.equal(rr.status, 200, show(rr));
    assert.equal(genOf(W, 'rforgedf2'), 1, 'لا نُسخَ مولَّدة للسلسلة المزوَّرة (النموذجُ وحده): ' + show(rr));
    assert.equal(W.env.DB.q("SELECT COUNT(*) AS n FROM aud WHERE k = ? AND act = 'created' AND uid = ? AND ctx LIKE '%rforgedf2%'", KT, SUP_UID)[0].n, 0, 'ولا حدثَ «أُنشئت» باسم المشرف');
    assert.ok((rr.j.denied || []).some((q) => q.id === 'rforgedf2'), 'والتقريرُ يذكرها مرفوضة: ' + JSON.stringify(rr.j.denied));
  });

  test(M + '(ج) ولا تراجع: السلسلةُ الحقيقية (من /api/tasks/create) تولِّد كما كانت', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM), s = Date.now() + 30 * 60e3;
    const c = await post(W, dm.ck, '/api/tasks/create', { k: hij(s), t: TAG + ' سلسلةٌ حقيقية', s, e: s + HR, asg: [MATE.eid], rv: 'none', force: true, rec: { t: 'daily', to: hij(s + 6 * 864e5) } });
    assert.equal(c.status, 200, show(c));
    const n0 = stored(W.env, KT) && Object.values(stored(W.env, KT)).flat().filter((r) => Array.isArray(r) && String(r[0]).indexOf('سلسلةٌ حقيقية') !== -1).length;
    const rr = await post(W, dm.ck, '/api/tasks/recur/run', {}); assert.equal(rr.status, 200, show(rr));
    const n1 = Object.values(stored(W.env, KT)).flat().filter((r) => Array.isArray(r) && String(r[0]).indexOf('سلسلةٌ حقيقية') !== -1).length;
    assert.ok(n1 > n0, 'وُلِّدت نُسخ (' + n0 + ' ⇒ ' + n1 + '): ' + show(rr));
  });
}
