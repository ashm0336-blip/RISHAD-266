/* KIVO_265 · F-1/R-24 (تدقيقُ الصلاحيات RBAC_AUDIT_265 — متوسط · بالوضعين): لا فحصَ في الخادم لتفرّد مفتاح الموظف (ekey) بين الحسابات النشطة — فمديرُ الإدارة
   ينشئ حساباً نشطاً ثانياً بمعرّف موظفٍ قائم (أو يربط به حساباً آخر) فيصير «هو» الموظف في «ملفي ← مهامي» (062c meTkIdent): يقرأ مهامَه وصورَ إثباته
   ويفعل باسمه. الآن 054 usersDupEkey (بجانب usersDupNew) — لكل الأدوار وبالوضعين:
     (أ) إنشاءُ حسابٍ نشطٍ ثانٍ بمعرّف موظفٍ له حسابٌ نشط ⇒ رفض users · ولا دخولَ به
     (ب) ربطُ حسابٍ نشطٍ قائم بمعرّف موظفٍ له حسابٌ نشط (مديرُ النظام) ⇒ رفض users
     (ج) ولا تراجع: تكرارٌ قائمٌ قبل الحفظة لا يمنع حفظاً لا يمسّه
     (د) ولا رفضَ كاذب: حسابٌ جديدٌ بمعرّف موظفٍ بلا حساب ⇒ يُكتب
   بياناتٌ اصطناعية وحدها (tasks_fx · TEST_ONLY). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { world, workerUnderTest, ME, MATE, P0, KE, D, TAG, stored, putKV, addAccount } from './tasks_fx.mjs';

const WU = workerUnderTest();
const KU = 'bassam_auth_users_v1', DM = ['0000000101', '70101'];
const ph = (pw, uid) => { const salt = crypto.createHash('sha256').update('kivo-264-tasks-fixture|' + uid).digest().subarray(0, 16); return 'p2$100000$' + salt.toString('hex') + '$' + crypto.pbkdf2Sync(pw, salt, 100000, 32, 'sha256').toString('hex'); };
const show = (r) => JSON.stringify({ st: r.status, revs: r.j && r.j.revs, denied: r.j && r.j.denied && Object.fromEntries(Object.entries(r.j.denied).map(([k, v]) => [k, v && v.why])) });

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';
  const saveU = async (W, ck, fn) => {
    const g = (await W.C.api('/api/get?keys=' + KU, { cookie: ck })).j.keys[KU], L = JSON.parse(g.v); fn(L);
    return W.C.api('/api/save', { method: 'POST', cookie: ck, body: Object.assign({ set: { [KU]: JSON.stringify(L) }, del: [], base: { [KU]: g.rev } }, mode === 'enforce' ? { why: { [KU]: TAG + ' F-1' } } : {}) });
  };
  const acct = (id, un, ekey) => ({ id, un, ph: ph('70' + un.slice(-3), id), name: TAG + ' · ' + id, role: 'staff', deptId: D, ekey, dis: 0 });

  test(M + '(أ) إنشاءُ حسابٍ نشطٍ ثانٍ بمعرّف موظفٍ له حسابٌ نشط ⇒ رفض users ولا دخولَ به', async () => {
    const W = await world({ worker: WU.file, mode }); const dm = await W.login(...DM);
    const r = await saveU(W, dm.ck, (L) => L.push(acct('dupacct' + mode, '2000000299', ME.eid)));
    assert.equal(r.j && r.j.denied && r.j.denied[KU] && r.j.denied[KU].why, 'users', show(r));
    assert.ok(!stored(W.env, KU).some((u) => u.id === 'dupacct' + mode), 'لم يُكتب الحساب');
    assert.equal((await W.C.login('2000000299', '70299')).ok, false, 'ولا دخولَ به');
  });

  test(M + '(ب) ربطُ حسابٍ نشطٍ قائم بمعرّف موظفٍ له حسابٌ نشط (مديرُ النظام) ⇒ رفض users', async () => {
    const W = await world({ worker: WU.file, mode });
    const r = await saveU(W, W.su.ck, (L) => { L.find((u) => u.id === P0[2].uid).ekey = ME.eid; });
    assert.equal(r.j && r.j.denied && r.j.denied[KU] && r.j.denied[KU].why, 'users', show(r));
    assert.equal(stored(W.env, KU).find((u) => u.id === P0[2].uid).ekey, P0[2].eid, 'المفتاحُ كما كان');
  });

  test(M + '(ج) ولا تراجع: تكرارٌ قائمٌ قبل الحفظة لا يمنع حفظاً لا يمسّه', async () => {
    const W = await world({ worker: WU.file, mode });
    addAccount(W.env, { uid: 'tst_f1old', un: '2000000398', pw: '70398', ekey: ME.eid });           /* بياناتٌ قديمة (R-24) */
    const r = await saveU(W, W.su.ck, (L) => { L.find((u) => u.id === MATE.uid).name = TAG + ' · اسمٌ معدَّل'; });
    assert.ok(r.j && r.j.revs && r.j.revs[KU], show(r));
  });

  test(M + '(د) ولا رفضَ كاذب: حسابٌ جديدٌ بمعرّف موظفٍ بلا حساب ⇒ يُكتب', async () => {
    const W = await world({ worker: WU.file, mode });
    const E = stored(W.env, KE), base = E.find((e) => e.eid === ME.eid); E.push(Object.assign({}, base, { eid: 'tst_e_f1new', name: TAG + ' · بلا حساب', empno: '' })); putKV(W.env, KE, E);
    const dm = await W.login(...DM);
    const r = await saveU(W, dm.ck, (L) => L.push(acct('newacct' + mode, '2000000297', 'tst_e_f1new')));
    assert.ok(r.j && r.j.revs && r.j.revs[KU] && stored(W.env, KU).some((u) => u.id === 'newacct' + mode), show(r));
  });
}
