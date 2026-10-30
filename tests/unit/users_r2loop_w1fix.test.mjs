/* مراجعةُ التكامل R2-LOOP (متوسط — أدخلته الجولةُ الأولى: حلقةُ /api/save لا تنتهي): تبويبٌ أساسُ قائمة حساباته قديم ما زال يحمل صفاً نقل الخادمُ اسمَ
   دخوله بعدها إلى حسابٍ لا يراه المدير (حذف مديرُ النظام حسابَه ثم فعّل مديرٌ آخر الشخصَ نفسَه في إدارته). كان applySave يفحص تصادمَ اسم الدخول
   (usersDupNew) قبل فحص النسخة فيرفض بالصفّ (denied.dup)؛ ويعيد العميلُ (usersDupFix9) الصفَّ إلى نسخة أساسه وهي ما أرسله حرفاً، فيرسل الجسمَ نفسَه
   بالأساس نفسِه — بلا نهاية (سطرٌ «denied» في السجلّ الأمنيّ ورسالةٌ كلَّ دورة · ولا يجدّد السحبُ المفتاحَ لأنه مشغول). الإصلاح من الجهتين:
     · الخادم (054): لغير مدير النظام تصادمٌ على أساسٍ قديم (عبارةُ فحص النسخة نفسُها) ⇒ تعارضٌ بالإسقاط الحالي (ومعه uscope) لا رفض — فيُدمج التعديلُ على
       القيمة الحديثة (ليس فيها الصفُّ المحذوف) ويُعاد بنسختها.
     · العميل (280 usersDupFix9): لا إعادةَ محاولةٍ بلا تقدّم (صفٌّ أُسقط أو عاد إلى غير ما أُرسل · وناتجٌ غيرُ ما رُفض في اللقطة) وإلا الإعادةُ الكاملة
       برسالتها كما قبل · وسقفٌ أخير (DUPMAX9 = 3) لدورات الإسقاط المتتالية على المفتاح.
   على العامل الحقيقي بالوضعين (tasks_fx · TEST_ONLY) وواجهة 280 الحقيقية في node:vm:
     (أ) الخادم: الأساسُ القديم ⇒ تعارضٌ (بلا سطرٍ أمنيّ) ثم المعادُ على قيمته يُقبل · والتصادمُ على أساسٍ حديث ما زال رفضاً يسمّي الصفّ
     (ب) التدفّقُ الحقيقيّ: حفظتان فقط · التجميدُ مطبَّق · الصفُّ المحذوف لا يعود · لا «denied» ولا رسالةَ تصادم
     (ج) العميلُ أمام خادم الجولة الأولى (يُحوَّل تعارضُه إلى ذلك الرفض): حفظةٌ واحدة ثم الإعادةُ الكاملة برسالتها — لا حلقة
     (د) السقف: خادمٌ يرفض كلَّ دورةٍ صفاً جديداً آخر ⇒ ثلاثُ دوراتٍ ثم الإعادةُ الكاملة (أربعُ حفظاتٍ لا ستّ) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, workerUnderTest, stored, TAG, D } from './tasks_fx.mjs';
import { loadClient, until, sleep, pageText } from './k264_vm.mjs';

const WU = workerUnderTest();
const K = 'bassam_auth_users_v1';
const P2 = (c) => 'p2$100000$' + c.repeat(32) + '$' + 'e'.repeat(64);
const DM1 = ['0000000101', '70101'], DM2 = ['0000000102', '70102'];
const MSG_DUP = 'مستخدمٌ في حسابٍ آخر', MSG_FULL = 'لم يُحفظ تعديلك على';
const show = (s) => JSON.stringify(s.j).slice(0, 300);
const getList = async (W, ck) => { const g = await W.C.api('/api/get?keys=' + K, { cookie: ck }); return { L: JSON.parse(g.j.keys[K].v), rev: g.j.keys[K].rev, us: g.j.uscope }; };
const save = (W, ck, L, rev, uscope) => W.C.api('/api/save', { method: 'POST', cookie: ck, body: { set: { [K]: JSON.stringify(L) }, del: [], base: { [K]: rev }, uscope } });
const secDenied = (W) => W.env.DB.q("SELECT COUNT(*) n FROM sec WHERE act = 'denied'")[0].n;
const freeze = (id) => (L) => L.map((u) => u.id === id ? Object.assign({}, u, { dis: 1 }) : u);
/* بعد أن جلب dm1 قائمتَه: مديرُ النظام يحذف tst_snop · ومديرُ tst_d2 يفعّل الشخصَ نفسَه في إدارته باسم الدخول نفسِه (محجوبٌ عن dm1) */
async function moveSnop(W) {
  const snop = stored(W.env, K).find((u) => u.id === 'tst_snop');
  const a = await getList(W, W.su.ck), s1 = await save(W, W.su.ck, a.L.filter((u) => u.id !== 'tst_snop'), a.rev);
  assert.ok(s1.j.revs && s1.j.revs[K], 'مديرُ النظام يحذف tst_snop: ' + show(s1));
  const dm2 = await W.login(DM2[0], DM2[1]), b = await getList(W, dm2.ck);
  const s2 = await save(W, dm2.ck, b.L.concat([{ id: 'w1r2_moved', un: snop.un, ph: P2('a'), name: TAG + ' · نُقل', role: 'staff', deptId: 'tst_d2', ekey: 'tst_e_moved', dis: 0 }]), b.rev, b.us);
  assert.ok(s2.j.revs && s2.j.revs[K], 'مديرُ tst_d2 يفعّله باسم الدخول نفسِه: ' + show(s2));
  return snop;
}
/* واجهةُ 280 الحقيقية لـ dm1 (قائمتُها من الإقلاع) — خادمٌ آخر أمام /api/save: pre(body) جوابٌ بلا إرسالٍ إلى العامل · post(j) تحويلُ جوابه */
const asRes = (j) => new Response(JSON.stringify(j), { status: 200, headers: { 'Content-Type': 'application/json' } });
async function tab(W, ck, { pre, post } = {}) {
  const resp = [], C2 = { req: async (p, o) => {
    if (!/^\/api\/save/.test(p)) return W.C.req(p, o);
    const j0 = pre ? pre(JSON.parse(o.body)) : null; if (j0) { resp.push(j0); return asRes(j0); }
    const r = await W.C.req(p, o); let j = null; try { j = JSON.parse(await r.clone().text()); } catch (e) { j = null; }
    const j2 = j && post ? post(j) : j; resp.push(j2);
    return j2 === j ? r : asRes(j2);
  } };
  const boot = (await W.C.boot(ck)).boot, T = loadClient({ C: C2, boot, jar: { cookie: ck }, blocks: ['280-server-storage.js', '440-count.js'] });
  T.W.document.hidden = true;                                                     /* تبويبٌ في الخلفية: قائمتُه تبقى على أساسها القديم */
  return { T, S: T.W.KIVO.__BS_SRV, resp, boot };
}
/* خادمُ الجولة الأولى: تصادمٌ على أساسٍ قديم يُرفض بالصفّ (dup) — يُحوَّل تعارضُ الخادم الحاليّ إليه بقيمته ورقمه وبصمته */
const round1 = (ids) => (j) => {
  const cf = j.conflicts && j.conflicts[K]; if (!cf) return j;
  const o = JSON.parse(JSON.stringify(j)); delete o.conflicts[K];
  o.denied = Object.assign({}, o.denied, { [K]: { why: 'users', cur: cf.cur, rev: cf.rev, uscope: cf.uscope, dup: ids } }); return o;
};

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';

  test(M + '(أ) الخادم: تصادمٌ على أساسٍ قديم ⇒ تعارضٌ بالإسقاط الحالي لا رفض · والمعادُ يُقبل · وعلى أساسٍ حديث ما زال رفضاً بالصفّ', async () => {
    const W = await world({ worker: WU.file, mode });
    const dm = await W.login(DM1[0], DM1[1]), g = await getList(W, dm.ck);
    assert.ok(g.L.some((u) => u.id === 'tst_snop'), 'القائمةُ القديمة تحمل tst_snop');
    const snop = await moveSnop(W), sec0 = secDenied(W);
    const s = await save(W, dm.ck, freeze('tst_fld')(g.L), g.rev, g.us), cf = (s.j.conflicts || {})[K];
    assert.ok(cf && !(s.j.denied || {})[K] && !(s.j.revs || {})[K], 'تعارضٌ لا رفض: ' + show(s));
    assert.equal(cf.uscope, g.us, 'ومعه بصمةُ العدسة');
    assert.ok(!JSON.parse(cf.cur).some((u) => u.id === 'tst_snop'), 'القيمةُ الحديثة بلا الصفّ المحذوف');
    assert.equal(secDenied(W), sec0, 'ولا سطرَ «denied» في السجلّ الأمنيّ');
    const s2 = await save(W, dm.ck, freeze('tst_fld')(JSON.parse(cf.cur)), cf.rev, cf.uscope);
    assert.ok(s2.j.revs && s2.j.revs[K], 'المعادُ على القيمة الحديثة يُقبل: ' + show(s2));
    assert.equal(stored(W.env, K).find((u) => u.id === 'tst_fld').dis, 1, 'التجميدُ مطبَّق');
    assert.ok(!stored(W.env, K).some((u) => u.id === 'tst_snop'), 'والمحذوفُ لا يعود');
    /* الرفضُ بالصفّ باقٍ على أساسٍ حديث: صفٌّ جديدٌ باسم دخول الحساب المحجوب */
    const g3 = await getList(W, dm.ck);
    const s3 = await save(W, dm.ck, g3.L.concat([{ id: 'w1r2_again', un: snop.un, ph: P2('b'), name: TAG + ' · مصادم', role: 'staff', deptId: D, ekey: 'tst_e_again', dis: 0 }]), g3.rev, g3.us);
    assert.ok(s3.j.denied && s3.j.denied[K] && s3.j.denied[K].why === 'users', 'رفض: ' + show(s3));
    assert.deepEqual(s3.j.denied[K].dup, ['w1r2_again'], 'يسمّي الصفَّ المصادم');
  });

  test(M + '(ب) التدفّقُ الحقيقيّ في واجهة 280: حفظتان فقط · التجميدُ مطبَّق · لا رفضَ ولا رسالةَ تصادم ولا حلقة', async () => {
    const W = await world({ worker: WU.file, mode });
    const dm = await W.login(DM1[0], DM1[1]), X = await tab(W, dm.ck);
    try {
      await moveSnop(W); const sec0 = secDenied(W);
      X.T.W.document.hidden = false;
      X.T.set(K, JSON.stringify(freeze('tst_fld')(JSON.parse(X.T.get(K)))));
      assert.ok(await until(() => X.T.saves().length >= 1 && !X.S.dirty() && !X.S.inflight(), 8000), 'حُفظ: ' + JSON.stringify(X.resp).slice(0, 400));
      await sleep(1500);
      assert.equal(X.T.saves().length, 2, 'حفظتان: تعارضٌ ثم قبول — ' + JSON.stringify(X.resp).slice(0, 400));
      assert.ok(X.resp[0].conflicts && X.resp[0].conflicts[K], 'الأولى تعارض');
      assert.ok(X.resp[1].revs && X.resp[1].revs[K], 'الثانية قُبلت');
      assert.equal(stored(W.env, K).find((u) => u.id === 'tst_fld').dis, 1, 'التجميدُ مطبَّق');
      assert.ok(!stored(W.env, K).some((u) => u.id === 'tst_snop') && !JSON.parse(X.T.get(K)).some((u) => u.id === 'tst_snop'), 'المحذوفُ لا يعود');
      assert.equal(secDenied(W), sec0, 'لا «denied» في السجلّ الأمنيّ');
      assert.ok(!pageText(X.T.W).includes(MSG_DUP), 'ولا رسالةَ تصادم');
    } finally { X.T.dispose(); }
  });

  test(M + '(ج) العميلُ أمام خادم الجولة الأولى: لا إعادةَ بلا تقدّم — حفظةٌ واحدة ثم الإعادةُ الكاملة برسالتها', async () => {
    const W = await world({ worker: WU.file, mode });
    const dm = await W.login(DM1[0], DM1[1]), X = await tab(W, dm.ck, { post: round1(['tst_snop']) });
    try {
      await moveSnop(W);
      X.T.W.document.hidden = false;
      X.T.set(K, JSON.stringify(freeze('tst_fld')(JSON.parse(X.T.get(K)))));
      assert.ok(await until(() => X.T.saves().length >= 1 && !X.S.dirty() && !X.S.inflight(), 8000), 'حُسم');
      await sleep(2000);
      assert.equal(X.T.saves().length, 1, 'حفظةٌ واحدة لا حلقة: ' + X.T.saves().length);
      assert.ok(X.resp[0].denied && X.resp[0].denied[K] && X.resp[0].denied[K].dup, 'رُفضت بالصفّ (خادمُ الجولة الأولى)');
      assert.equal(X.T.get(K), X.resp[0].denied[K].cur, 'الإعادةُ الكاملة: التبويبُ على قيمة الخادم');
      const t = pageText(X.T.W);
      assert.ok(t.includes(MSG_FULL) && !t.includes(MSG_DUP), 'برسالة الإعادة الكاملة');
    } finally { X.T.dispose(); }
  });

  test(M + '(د) السقف: خادمٌ يرفض كلَّ دورةٍ صفاً جديداً آخر ⇒ ثلاثُ دوراتٍ ثم الإعادةُ الكاملة', async () => {
    const W = await world({ worker: WU.file, mode });
    const dm = await W.login(DM1[0], DM1[1]);
    /* كلُّ دورةٍ تُرفض بأوّل صفٍّ جديدٍ (ليس في المخزَّن) ما بقي منها — وما لا جديدَ فيه يمضي إلى الخادم الحقيقي */
    const had = new Set(stored(W.env, K).map((u) => u.id)), g0 = await getList(W, dm.ck);
    const X = await tab(W, dm.ck, { pre: (body) => {
      const L = body.set && body.set[K] ? JSON.parse(body.set[K]) : null, nu = L ? L.find((u) => !had.has(u.id)) : null;
      return nu ? { revs: {}, conflicts: {}, denied: { [K]: { why: 'users', cur: JSON.stringify(g0.L), rev: g0.rev, uscope: g0.us, dup: [nu.id] } } } : null;
    } });
    try {
      X.T.W.document.hidden = false;
      const add = [1, 2, 3, 4, 5].map((n) => ({ id: 'w1r2_cap' + n, un: '00000009' + (40 + n), ph: P2('c'), name: TAG + ' · سقف ' + n, role: 'staff', deptId: D, ekey: 'tst_e_cap' + n, dis: 0 }));
      X.T.set(K, JSON.stringify(JSON.parse(X.T.get(K)).concat(add)));
      assert.ok(await until(() => X.T.saves().length >= 1 && !X.S.dirty() && !X.S.inflight(), 10000), 'حُسم');
      await sleep(1500);
      assert.equal(X.T.saves().length, 4, 'ثلاثُ دوراتِ إسقاطٍ ثم الإعادة الكاملة: ' + X.T.saves().length);
      assert.ok(!JSON.parse(X.T.get(K)).some((u) => /^w1r2_cap/.test(u.id)), 'الإعادةُ الكاملة: لا صفَّ جديدٌ في التبويب');
      assert.ok(pageText(X.T.W).includes(MSG_FULL), 'برسالة الإعادة الكاملة');
      assert.ok(!stored(W.env, K).some((u) => /^w1r2_cap/.test(u.id)), 'ولا شيءَ في الخادم');
    } finally { X.T.dispose(); }
  });
}
