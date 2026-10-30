/* KIVO_265 · F-1/R-24 — ثغرةُ رقم الهوية (المراجعةُ المستقلة بعد 7a8af5c): usersDupEkey كان يقارن deptId|ekey حرفاً، فحسابٌ نشطٌ ثانٍ مفتاحُه رقمُ هوية
   الموظف (nid) يمرّ، ثم يحلّه 062c meTkIdent (tkTokRec: eid ∪ nid) و062b «ملفي» (pfLink/pfTokens) إلى سجلّ الموظف نفسِه — فيقرأ مهامَه وصورَ إثباته وجدولَه.
   وتصل إليه كذلك بتعديل سجلّ الموظفين لاحقاً. الإصلاحُ دفاعٌ بطبقتين وبالوضعين:
     (أ) الكتابة (054 usersDupEkey): الحسابُ يُحلّ إلى سجلّ الموظف (tkTokRec ثم pfLink · سجلُّ موظفي الإدارة من الدفعة إن حملته وإلا المخزَّن) ويُمنع
         حاملٌ جديد (إنشاءٌ · ربطٌ · إعادةُ تفعيل · نقل) لسجلٍّ يحلّ إليه حسابٌ نشطٌ آخر — والمفتاحُ الحرفيّ حين لا يحلّ إلى أحد
     (ب) القراءة (062c meTkIdent · 062b meIdent — fail-closed): السجلُّ «له» إن كان الحسابَ النشطَ الوحيد في إدارته الذي يحلّ إليه — وإلا غيرُ مرتبطٍ لكليهما
   الحالات: (1) إنشاءٌ · (2) ربطٌ · (3) إعادةُ تفعيل — بمفتاح رقم الهوية ⇒ users · (4) تكرارٌ نشأ بتعديل سجلّ الموظفين ⇒ لا يرى أيٌّ منهما المهامَ ولا الصورةَ ولا الجدول ·
   ولا تراجع: (5) الحسابُ الوحيد بالمعرّف الثابت يرى كلَّ ذلك · (6) الحسابُ الوحيد برقم الهوية يُربط كما كان (R-20: acct_nid) · (7) تكرارٌ قديم لا يمنع حفظاً آخر.
   بياناتٌ اصطناعية وحدها (tasks_fx · TEST_ONLY). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { world, workerUnderTest, ME, MATE, P0, KE, D, TAG, HR, IMG_ME, stored, putKV, addAccount } from './tasks_fx.mjs';

const WU = workerUnderTest();
const KU = 'bassam_auth_users_v1', DM = ['0000000101', '70101'], NID_ME = '1999000555', NID_LATE = '1999000666';
const ph = (pw, uid) => { const salt = crypto.createHash('sha256').update('kivo-264-tasks-fixture|' + uid).digest().subarray(0, 16); return 'p2$100000$' + salt.toString('hex') + '$' + crypto.pbkdf2Sync(pw, salt, 100000, 32, 'sha256').toString('hex'); };
const show = (r) => JSON.stringify({ st: r.status, revs: r.j && r.j.revs, denied: r.j && r.j.denied && Object.fromEntries(Object.entries(r.j.denied).map(([k, v]) => [k, v && v.why])) });
const setNid = (W, eid, nid) => { const E = stored(W.env, KE); E.find((e) => e.eid === eid).nid = nid; putKV(W.env, KE, E); };
const setDis = (W, uid, dis) => { const U = stored(W.env, KU); U.find((u) => u.id === uid).dis = dis; putKV(W.env, KU, U); };
const get = (W, ck, p) => W.C.api(p, { cookie: ck });
/* ما يراه الحسابُ من سجلّ ME: مهامُه («مهامي») · صورةُ إثباته · جدولُه («ملفي» اليوم) */
async function sees(W, ck) {
  const t = await get(W, ck, '/api/me/tasks'), img = await get(W, ck, '/api/me/tasks/img?id=' + IMG_ME), d = await get(W, ck, '/api/me/today');
  return { linked: !!(t.j.me && t.j.me.linked), rows: (t.j.rows || []).length, img: img.status, pfLinked: !!(d.j.identity && d.j.identity.linked), facts: !!d.j.facts };
}

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';
  const saveU = async (W, ck, fn) => {
    const g = (await get(W, ck, '/api/get?keys=' + KU)).j.keys[KU], L = JSON.parse(g.v); fn(L);
    return W.C.api('/api/save', { method: 'POST', cookie: ck, body: Object.assign({ set: { [KU]: JSON.stringify(L) }, del: [], base: { [KU]: g.rev } }, mode === 'enforce' ? { why: { [KU]: TAG + ' F-1 nid' } } : {}) });
  };
  const denied = (r) => r.j && r.j.denied && r.j.denied[KU] && r.j.denied[KU].why;

  test(M + '(1·2·3) حسابٌ نشطٌ ثانٍ بمفتاح رقم هوية الموظف ⇒ users عند الإنشاء والربط وإعادة التفعيل', async () => {
    const W = await world({ worker: WU.file, mode }); setNid(W, ME.eid, NID_ME); const dm = await W.login(...DM);
    const a = await saveU(W, dm.ck, (L) => L.push({ id: 'nidacct' + mode, un: '2000000289', ph: ph('70289', 'nidacct' + mode), name: TAG + ' ثانٍ', role: 'staff', deptId: D, ekey: NID_ME, dis: 0 }));
    assert.equal(denied(a), 'users', '(1) الإنشاء: ' + show(a)); assert.ok(!stored(W.env, KU).some((u) => u.id === 'nidacct' + mode));
    const b = await saveU(W, W.su.ck, (L) => { L.find((u) => u.id === P0[2].uid).ekey = NID_ME; });
    assert.equal(denied(b), 'users', '(2) الربط: ' + show(b)); assert.equal(stored(W.env, KU).find((u) => u.id === P0[2].uid).ekey, P0[2].eid);
    addAccount(W.env, { uid: 'tst_nidoff', un: '2000000387', pw: '70387', ekey: NID_ME }); setDis(W, 'tst_nidoff', 1);
    const c = await saveU(W, W.su.ck, (L) => { L.find((u) => u.id === 'tst_nidoff').dis = 0; });
    assert.equal(denied(c), 'users', '(3) إعادةُ التفعيل: ' + show(c)); assert.ok(stored(W.env, KU).find((u) => u.id === 'tst_nidoff').dis);
  });

  test(M + '(4) تكرارٌ نشأ بتعديل سجلّ الموظفين ⇒ لا يرى أيٌّ من الحسابين مهامَ الموظف ولا صورتَه ولا جدولَه', async () => {
    const W = await world({ worker: WU.file, mode });
    addAccount(W.env, { uid: 'tst_nidlate', un: '2000000386', pw: '70386', ekey: NID_LATE });          /* مفتاحٌ لا يحلّ إلى أحد حين أُنشئ */
    setNid(W, ME.eid, NID_LATE);                                                                      /* ثم صار رقمَ هوية ME في سجلّ الموظفين */
    for (const [lbl, un, pw] of [['حسابُ ME', ME.un, ME.pw], ['الحسابُ الثاني', '2000000386', '70386']]) {
      const s = await sees(W, (await W.login(un, pw)).ck);
      assert.deepEqual(s, { linked: false, rows: 0, img: 403, pfLinked: false, facts: false }, lbl + ': ' + JSON.stringify(s));
    }
  });

  test(M + '(5·6·7) ولا تراجع: الحسابُ الوحيد بالمعرّف الثابت يرى · الوحيدُ برقم الهوية يُربط (R-20: acct_nid) · تكرارٌ قديم لا يمنع حفظاً آخر', async () => {
    const W = await world({ worker: WU.file, mode });
    const s = await sees(W, (await W.login(ME.un, ME.pw)).ck);
    assert.ok(s.linked && s.rows > 0 && s.img === 200 && s.pfLinked && s.facts, '(5) ' + JSON.stringify(s));
    const E = stored(W.env, KE), base = E.find((e) => e.eid === ME.eid); E.push(Object.assign({}, base, { eid: 'tst_e_f1nid', name: TAG + ' · حسابُه برقم الهوية', empno: '', nid: '1999000777' })); putKV(W.env, KE, E);
    addAccount(W.env, { uid: 'tst_f1nid', un: '2000000377', pw: '70377', ekey: '1999000777' });
    const n = await get(W, (await W.login('2000000377', '70377')).ck, '/api/me/tasks');
    assert.ok(n.j.me && n.j.me.linked && n.j.me.by === 'nid', '(6) مرتبطٌ برقم الهوية: ' + JSON.stringify(n.j.me));
    const dm = await W.login(...DM), s0 = Date.now() + 2 * HR;
    const el = await get(W, dm.ck, '/api/tasks/eligibility?ekeys=tst_e_f1nid&s=' + s0 + '&e=' + (s0 + HR));
    assert.equal(el.j.items && el.j.items[0] && el.j.items[0].code, 'acct_nid', '(6) لا إسنادَ جديد (R-20): ' + JSON.stringify(el.j).slice(0, 200));
    setNid(W, ME.eid, NID_ME); addAccount(W.env, { uid: 'tst_olddup', un: '2000000385', pw: '70385', ekey: NID_ME });   /* تكرارٌ قائمٌ قبل الحفظة */
    const r = await saveU(W, W.su.ck, (L) => { L.find((u) => u.id === MATE.uid).name = TAG + ' · اسمٌ معدَّل'; });
    assert.ok(r.j && r.j.revs && r.j.revs[KU], '(7) ' + show(r));
  });
}
