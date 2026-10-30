/* KIVO_265 · G-1 (تحقّقُ الخلفية BACKEND_VERIFY_265 — متوسط · بالوضعين): حمايةُ أفعال الموظف في الحفظ الخامّ (tkKeepSelf · F-10 · N-5) كانت تُرفع
   بأيّ حدثِ تدقيقٍ يدّعيه العميل {etype:'dataset', act:'import'|'restore'} — على أيّ مفتاحٍ وبلا فحصِ صلاحية (054 applySave). فكان حاملُ task.edit
   (المشرفُ tst_e_sup1: tasks view/add/edit — لا مديرَ ولا task.delete ولا استيراد ولا backup.restore) يمحو توثيقَ موظفٍ منجز (العمود 21) وتُكنس صورةُ
   إثباته، ويعيد كتابةَ ملاحظة إنجازه. الآن تُرفع للاستعادة أو الاستيراد المخوَّلين على المفتاح نفسِه وحدهما (054 tkKeepOff):
     (أ) علامةُ import مزوَّرة ⇒ التوثيقُ والصورةُ باقيان
     (ب) علامةُ import مزوَّرة ⇒ ملاحظةُ الموظف كما كتبها
     (ج) علامةُ restore مزوَّرة ⇒ التوثيقُ والصورةُ باقيان (الإنفاذ: ترفضها سياسةُ الاستعادة أصلاً)
     (د) ولا تراجع: الاستعادةُ المخوَّلة (مدير النظام — كما يرسلها bkCommit: علامةُ backup.restore + حدثُ import) تعيد النسخةَ كما هي ولو محت توثيقاً لاحقاً
   بياناتٌ اصطناعية وحدها (tasks_fx · TEST_ONLY). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, workerUnderTest, ME, KT, TAG, stored, IMG_ME, taskCommandBody, operationSaveBody } from './tasks_fx.mjs';

const WU = workerUnderTest();
const SUP = ['0000000111', '70111'];
const ID = 1760000000106;                                                     /* مهمةُ ME أمس — منجزةٌ بصورة IMG_ME */
const post = (W, ck, p, body) => W.C.api(p, { method: 'POST', cookie: ck, body:operationSaveBody(W.env,p,taskCommandBody(W.env, p, body)) });
const getKT = async (W, ck) => (await W.C.api('/api/operations/read?keys=' + encodeURIComponent(KT), { cookie: ck })).j;
const find = (S, id, eid) => { for (const d in S) for (const r of (S[d] || [])) if (Array.isArray(r) && r[13] === id && r[14] === eid) return r; return null; };
const imgN = (W, id) => W.env.DB.q('SELECT COUNT(*) AS n FROM imgs WHERE k = ?', id)[0].n;
const mark = (act) => [{ cid: 'g1' + act + Date.now().toString(36), k: KT, etype: 'dataset', act, eid: 'bassam_tasks_v1', ename: 'bassam_tasks_v1' }];
const show = (r) => JSON.stringify({ st: r.status, revs: r.j && r.j.revs, denied: r.j && r.j.denied && Object.fromEntries(Object.entries(r.j.denied).map(([k, v]) => [k, v && v.why])) });

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';
  const why = mode === 'enforce' ? { why: { [KT]: TAG + ' G-1' } } : {};
  /* حفظةُ المشرف على النسخة الحالية بعد تعديل صفّ الموظف المنجز fn(r) — بعلامةٍ مزوَّرة act */
  const forged = async (W, act, fn) => {
    const sup = await W.login(...SUP), g = await getKT(W, sup.ck); assert.ok(g && JSON.stringify(g.resources[KT]), 'المشرفُ يقرأ المخزن');
    const S = g.resources[KT], r = find(S, ID, ME.eid); assert.ok(r && r[3] === 'done' && r[21] && r[21].imgs.includes(IMG_ME), 'الصفُّ منجزٌ بصورته');
    fn(r);
    return post(W, sup.ck, '/api/save', Object.assign({ set: { [KT]: JSON.stringify(S) }, del: [], base: { [KT]: g.base[KT] }, aud: mark(act) }, why));
  };

  test(M + '(أ) علامةُ import مزوَّرة من حامل task.edit لا ترفع حمايةَ التوثيق — العمودُ 21 وصورةُ الإثبات باقيان', async () => {
    const W = await world({ worker: WU.file, mode });
    const r = await forged(W, 'import', (q) => { q[21] = null; });
    const x = find(stored(W.env, KT), ID, ME.eid);
    assert.ok(x && x[21] && x[21].imgs.includes(IMG_ME), 'التوثيقُ باقٍ: ' + show(r));
    assert.equal(x[3], 'done', 'والإنجاز');
    assert.equal(imgN(W, IMG_ME), 1, 'وصورةُ الإثبات لم تُكنس');
  });

  test(M + '(ب) علامةُ import مزوَّرة لا تعيد كتابةَ ملاحظة إنجاز الموظف', async () => {
    const W = await world({ worker: WU.file, mode });
    const r = await forged(W, 'import', (q) => { q[21] = Object.assign({}, q[21], { note: TAG + ' ملاحظةٌ مزوَّرة' }); });
    assert.equal(find(stored(W.env, KT), ID, ME.eid)[21].note, TAG + ' تم', 'ملاحظةُ الموظف كما كتبها: ' + show(r));
  });

  test(M + '(ج) علامةُ restore مزوَّرة من غير المخوَّل بالاستعادة لا ترفع حمايةَ التوثيق', async () => {
    const W = await world({ worker: WU.file, mode });
    const r = await forged(W, 'restore', (q) => { q[21] = null; });
    const x = find(stored(W.env, KT), ID, ME.eid);
    assert.ok(x && x[21] && x[21].imgs.includes(IMG_ME), 'التوثيقُ باقٍ: ' + show(r));
    assert.equal(imgN(W, IMG_ME), 1, 'وصورةُ الإثبات لم تُكنس');
  });

  test(M + '(د) ولا تراجع: الاستعادةُ المخوَّلة (مدير النظام · backup.restore + import) تعيد النسخةَ كما هي — ولو محت توثيقاً لاحقاً', async () => {
    const W = await world({ worker: WU.file, mode });
    const g0 = await getKT(W, W.su.ck), S = g0.resources[KT];
    find(S, ID, ME.eid)[21] = null;                                             /* «النسخة»: الصفُّ بلا توثيق */
    const g = await getKT(W, W.su.ck);
    const r = await post(W, W.su.ck, '/api/save', { set: { [KT]: JSON.stringify(S) }, del: [], base: { [KT]: g.base[KT] }, aud: mark('import'),
      ops: { [KT]: { op: 'backup.restore', scope: 'dept', mode: 'replace', reason: TAG + ' استعادةُ نسخة' } }, why: { [KT]: TAG + ' استعادةُ نسخة' } });
    assert.ok(r.j && r.j.revs && r.j.revs[KT], 'الاستعادةُ تُكتب: ' + show(r));
    assert.equal(find(stored(W.env, KT), ID, ME.eid)[21], null, 'كما في النسخة (لا حمايةَ للاستعادة المخوَّلة)');
  });
}
