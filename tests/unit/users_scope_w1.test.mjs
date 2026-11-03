import { TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
/* الفحصُ العميق 2026-10-21 · الموجة 1 · R4 · IRSZ-3 · DG-07 · AUX-14 (أمنٌ وسرعة) — قائمةُ الحسابات bassam_auth_users_v1 بأقلّ امتياز، على العامل الحقيقي بالوضعين:
   كانت تُحقن في كلّ إقلاعٍ وتعود من /api/get كاملةً (بلا البصمة والرقم الوظيفي وحدهما) — فيستلم الموظفُ بلا صلاحياتٍ اسمَ الدخول (رقمَ الهوية) والجوالَ
   والاسمَ والدورَ والإدارةَ لكلّ حسابات المنصة (Test: 13,005 حساباً · 2.45 MB). الآن (054 usersScopeOut · usersScopeIn):
     (أ) لكلّ دور (مدير النظام · مدير الفرع · حساب الإدارة · مدير الإدارة المعيَّن · مشرفٌ بصفحات · موظفٌ بلا صلاحيات · موظفُ إدارةٍ أخرى) ما يصله بالضبط —
         بمرجعٍ مستقلٍّ في الاختبار نفسِه (لا بدوالّ العامل): الإقلاعُ و/api/get سواء، ولا هويةَ ولا جوالَ لغير من يديره
     (ب) الحجم: 13,000 حسابٍ اصطناعيّ في 13 إدارة — الموظفُ يستلم حسابَه ومديريه وحدهم
     (ج) الكتابةُ من قائمةٍ مُسقَطة: المخزَّنُ كما هو عدا التعديل المقصود (الترتيبُ والهوياتُ والجوالاتُ والأرقامُ الوظيفية والبصمات) — وحفظةٌ بلا تغيير لا أثرَ لها
     (د) المزوَّرُ على المحجوب يُرفض ولا يمسّ شيئاً · والنسخةُ الكاملةُ القديمة (عميلٌ قبل الإصلاح) لا تُحسب تعديلاً · وقيمةُ الرفض والتعارض مُسقَطة
     (هـ) قواعدُ التفرّد في الخادم كما هي: اسمُ دخولٍ أو هويةٌ لحسابٍ لا يراه المديرُ يُرفضان
   البياناتُ اصطناعيةٌ كلُّها (tasks_fx · TEST_ONLY). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, workerUnderTest, ME, MATE, D, KE, TAG, stored, putKV, addAccount, operationSaveBody } from './tasks_fx.mjs';

const WU = workerUnderTest();
const K = 'bassam_auth_users_v1';
const PII = ['un', 'alt', 'no', 'email', 'phone'];
const DIR = ['id', 'name', 'role', 'deptId', 'gid', 'ekey', 'dis', 'mgr', 'title', 'bk', 'test'];
const P2 = (c) => 'p2$100000$' + c.repeat(32) + '$' + 'e'.repeat(64);
const syn = (ek) => /^(mgr:|gm:)/.test(String(ek || ''));
const mgrish = (u) => u.role !== 'staff' || !!u.mgr || syn(u.ekey);
const omit = (u, ks) => { const c = {}; for (const k in u) if (!ks.includes(k)) c[k] = u[k]; return c; };
const pick = (u, ek) => { const c = {}; for (const f of DIR) if ((f !== 'ekey' || ek || syn(u.ekey)) && Object.prototype.hasOwnProperty.call(u, f)) c[f] = u[f]; return c; };
const byId = (L) => [...L].sort((a, b) => String(a.id).localeCompare(String(b.id)));
/* الأدوار: [اسمُ الدخول · كلمةُ المرور · الإداراتُ التي يديرها · الإداراتُ التي في نطاقه] — من المُثبِّت القياسي (tst_g1 = tst_d1 + tst_d2) */
const ROLES = {
  super: [TEST_SUPER_USERNAME, TEST_SUPER_PIN, null, null],
  gm:    ['0000000103', '70103', ['tst_d1', 'tst_d2'], ['tst_d1', 'tst_d2']],
  dept:  ['0000000131', '761310', ['tst_d2'], ['tst_d2']],
  dm:    ['0000000101', '70101', ['tst_d1'], ['tst_d1']],
  sup:   ['0000000111', '70111', [], ['tst_d1']],
  plain: [ME.un, ME.pw, [], ['tst_d1']],
  emp2:  ['0000000121', '70121', [], ['tst_d2']]
};
async function setup(mode) {
  const W = await world({ worker: WU.file, mode });
  addAccount(W.env, { uid: 'tst_w1dept', un: '0000000131', pw: '761310', name: TAG + ' · حساب إدارة tst_d2', dept: 'tst_d2', role: 'dept' });
  const S = {};
  for (const [r, [u, p]] of Object.entries(ROLES)) { const l = await W.login(u, p); S[r] = { ck: l.ck, uid: l.j.uid }; }
  return { W, S };
}
/* المرجعُ المستقلّ: ما يجب أن يصل الفاعلَ من القائمة المخزَّنة — reads(d): أيقرأ سجلَّ موظفي d؟ (من إقلاعه هو: المفتاحُ محقونٌ أم لا) */
function expected(all, role, uid, reads) {
  const [, , mgr, scope] = ROLES[role];
  if (!mgr) return all.map((u) => omit(u, ['ph']));
  const out = [];
  for (const u of all) {
    if (u.id === uid) { out.push(omit(u, ['ph'])); continue; }
    const d = String(u.deptId || '');
    if (d && mgr.includes(d)) { out.push(omit(u, ['ph', 'no'])); continue; }
    if (d && scope.includes(d)) { if (reads(d)) out.push(pick(u, true)); else if (mgrish(u)) out.push(pick(u, false)); continue; }
    if (u.role === 'super' || u.role === 'gm') out.push(pick(u, false));
  }
  return out;
}
const getList = async (W, ck) => { const g = await W.C.api('/api/get?keys=' + K, { cookie: ck }); return { L: JSON.parse(g.j.keys[K].v), rev: g.j.keys[K].rev, us: g.j.uscope }; };
/* uscope: بصمةُ العدسة كما يرسلها العميلُ الحاليّ (280) — مراجعةُ التكامل R2-OLDTAB: حذفٌ بالإغفال من قائمةٍ مُسقَطةٍ بلا بصمة رفضٌ (تبويبٌ قديم) */
const save = (W, ck, L, rev, uscope) => W.C.api('/api/save', { method: 'POST', cookie: ck, body: Object.assign({ set: { [K]: JSON.stringify(L) }, del: [], base: { [K]: rev } }, uscope ? { uscope } : {}) });
const ok = (s) => !!(s.j && s.j.revs && s.j.revs[K]);
const show = (s) => JSON.stringify(s.j).slice(0, 300);
/* المخزَّنُ = السابقُ بعد تعديلٍ واحد بعينه (fn على نسخةٍ منه) — الترتيبُ وكلُّ الحقول */
const sameExcept = (before, after, fn, msg) => { const exp = JSON.parse(JSON.stringify(before)); fn(exp); assert.deepEqual(after, exp, msg); };

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';

  test(M + '(أ) الإسقاطُ لكلّ دور في الإقلاع و/api/get: مديرُ النظام كاملاً · مديرُ الفرع وحسابُ الإدارة ومديرُ الإدارة نطاقُهم · المشرفُ زملاؤه بلا أرقام · الموظفُ نفسُه ومديروه', async () => {
    const { W, S } = await setup(mode);
    const all = stored(W.env, K);
    assert.ok(all.length >= 25 && all.some((u) => u.no), 'المُثبِّت: حساباتٌ بأرقامٍ وظيفية');
    for (const role of Object.keys(ROLES)) {
      const { ck, uid } = S[role], b = (await W.C.boot(ck)).boot;
      assert.ok(b && b.keys && b.keys[K], role + ': الإقلاعُ يحمل الحسابات');
      /* schema 10: the employee register is typed — whether the actor reads it is the Operations read verdict (not a boot KV key) */
      const rd = {}; for (const d of ['tst_d1', 'tst_d2', 'tst_d3']) { const key = 'bsdept:' + d + ':bassam_employees_v1', r = await W.C.api('/api/operations/read?' + new URLSearchParams({ uid, keys: key }), { cookie: ck }); rd[d] = r.status === 200 && r.j.ok === 1 && !(r.j.denied || []).includes(key); }
      const reads = (d) => !!rd[d];
      const lb = JSON.parse(b.keys[K]), lg = (await getList(W, ck)).L, exp = expected(all, role, uid, reads);
      assert.deepEqual(byId(lb), byId(exp), role + ': الإقلاع = المرجع');
      assert.deepEqual(byId(lg), byId(lb), role + ': /api/get = الإقلاع');
      assert.ok(lb.every((u) => !u.ph), role + ': لا بصمة');
      if (role === 'super') { assert.equal(lb.length, all.length); continue; }
      const mgr = ROLES[role][2];
      const leak = lb.filter((u) => u.id !== uid && !mgr.includes(String(u.deptId || '')) && PII.some((f) => u[f] != null && u[f] !== ''));
      assert.deepEqual(leak.map((u) => u.id), [], role + ': لا هويةَ ولا جوالَ ولا رقمَ ولا بريدَ لحسابٍ لا يديره');
      assert.ok(lb.find((u) => u.id === uid).un, role + ': حسابُه كاملاً');
    }
    /* شواهدُ بأسمائها: الموظفُ بلا صلاحيات — نفسُه ومديرُ إدارته ومديرُ فرعه ومديرو النظام، ولا زميلَ ولا موظفَ إدارةٍ أخرى */
    const lp = JSON.parse((await W.C.boot(S.plain.ck)).boot.keys[K]);
    assert.deepEqual(lp.map((u) => u.id).sort(), [ME.uid, 'su', 'tst_dm1', 'tst_gm1', 'tst_sa'].sort(), 'الموظفُ: ' + JSON.stringify(lp.map((u) => u.id)));
    assert.ok(!lp.some((u) => u.id === MATE.uid || u.id === 'tst_emp2' || u.id === 'tst_dm2'), 'لا زميلَ ولا إدارةً أخرى');
    const dm1 = lp.find((u) => u.id === 'tst_dm1'); assert.ok(dm1.name && dm1.mgr && dm1.ekey === 'mgr:tst_d1' && !dm1.un && !dm1.alt, '«ملفي»: اسمُ مدير إدارته بلا أرقامه: ' + JSON.stringify(dm1));
    /* المشرفُ (يقرأ سجلَّ موظفي إدارته): زملاؤه صفوفُ دليلٍ بمفاتيحهم (خرائطُ الحسابات) بلا أرقام · ولا موظفَ لإدارةٍ أخرى */
    const ls = JSON.parse((await W.C.boot(S.sup.ck)).boot.keys[K]), mate = ls.find((u) => u.id === MATE.uid);
    assert.ok(mate && mate.ekey === MATE.eid && !mate.un && !mate.alt, 'المشرف: زميلُه بمفتاحه بلا أرقام: ' + JSON.stringify(mate));
    assert.ok(!ls.some((u) => u.id === 'tst_emp2'), 'المشرف: لا موظفَ لإدارةٍ أخرى');
    /* مديرُ الإدارة: موظفو إدارته بأسماء دخولهم (تفعيلُ الحسابات) · ومديرُ الإدارة الأخرى لا يصله */
    const ld = JSON.parse((await W.C.boot(S.dm.ck)).boot.keys[K]);
    assert.ok(ld.find((u) => u.id === MATE.uid).un, 'المدير: موظفُه باسم دخوله'); assert.ok(!ld.some((u) => u.id === 'tst_dm2' || u.id === 'tst_emp2'), 'المدير: لا حسابَ لإدارةٍ أخرى');
    /* مديرُ الفرع: إدارتا فرعه كاملتين · ومديرُ الإدارة خارج فرعه (tst_d3) لا يصله */
    const lgm = JSON.parse((await W.C.boot(S.gm.ck)).boot.keys[K]);
    assert.ok(lgm.find((u) => u.id === 'tst_emp2').un && lgm.find((u) => u.id === MATE.uid).un, 'الفرع: إدارتاه'); assert.ok(!lgm.some((u) => u.id === 'tst_dm3'), 'الفرع: لا tst_d3');
  });

  test(M + '(ب) الحجم: 13,000 حسابٍ اصطناعيّ في 13 إدارة — الموظفُ يستلم حسابَه ومديريه وحدهم · ومديرُ الإدارة إدارتَه', async () => {
    const { W, S } = await setup(mode);
    const U = stored(W.env, K);
    for (let d = 0; d < 13; d++) for (let i = 0; i < 1000; i++) U.push({ id: 'tst_w1b' + d + '_' + i, un: String(2100000000 + d * 1000 + i), alt: '05' + String(10000000 + d * 1000 + i), role: 'staff', deptId: 'tst_w1bd' + d, ekey: 'tst_w1be' + d + '_' + i, name: TAG + ' · حمل ' + d + '/' + i, dis: 0, test: TAG });
    putKV(W.env, K, U);
    const full = JSON.stringify(U.map((u) => omit(u, ['ph']))).length;
    const bp = (await W.C.boot(S.plain.ck)).boot.keys[K], bd = (await W.C.boot(S.dm.ck)).boot.keys[K], bs = (await W.C.boot(S.super.ck)).boot.keys[K];
    assert.equal(JSON.parse(bs).length, U.length, 'مديرُ النظام: كلُّها');
    assert.equal(JSON.parse(bp).length, 5, 'الموظف: خمسةُ صفوف');
    assert.ok(bp.length < 1500 && bp.length * 1000 < full, 'الموظف: ' + bp.length + ' حرفاً بدل ' + full);
    const ldm = JSON.parse(bd); assert.ok(ldm.every((u) => !/^tst_w1bd/.test(String(u.deptId || ''))), 'المدير: لا حسابَ من إدارات الحمل');
    assert.ok(bd.length * 50 < full, 'المدير: ' + bd.length + ' حرفاً بدل ' + full);
  });

  test(M + '(ج) الكتابةُ من قائمةٍ مُسقَطة: المخزَّنُ كما هو عدا التعديل المقصود — كلمةُ مرور الموظف · تجميدُ المدير لموظفه · مديرُ الفرع · حسابُ الإدارة · إضافةُ حسابٍ وحذفُه · والحفظةُ بلا تغيير', async () => {
    const { W, S } = await setup(mode);
    const S0 = stored(W.env, K);
    /* الموظفُ بلا صلاحيات: كلمةُ مروره في قائمةٍ من خمسة صفوف ⇒ تُقبل والحساباتُ الأخرى (هوياتُها وجوالاتُها وأرقامُها وبصماتُها وترتيبُها) كما هي */
    let g = await getList(W, S.plain.ck);
    let s = await save(W, S.plain.ck, g.L.map((u) => u.id === ME.uid ? Object.assign({}, u, { ph: P2('a') }) : u), g.rev); assert.ok(ok(s), 'كلمةُ المرور: ' + show(s));
    const S1 = stored(W.env, K); sameExcept(S0, S1, (L) => { L.find((u) => u.id === ME.uid).ph = P2('a'); }, 'الموظف: لا شيءَ غيرُ بصمته');
    /* مديرُ الإدارة: تجميدُ موظفه */
    g = await getList(W, S.dm.ck);
    s = await save(W, S.dm.ck, g.L.map((u) => u.id === 'tst_snop' ? Object.assign({}, u, { dis: 1 }) : u), g.rev); assert.ok(ok(s), 'التجميد: ' + show(s));
    const S2 = stored(W.env, K); sameExcept(S1, S2, (L) => { L.find((u) => u.id === 'tst_snop').dis = 1; }, 'المدير: لا شيءَ غيرُ التجميد');
    /* مديرُ الإدارة: إضافةُ حسابٍ في الذيل ثم حذفُه */
    const NEW = { id: 'w1new' + mode, un: '0000000777', alt: '0500000777', ph: P2('b'), role: 'staff', deptId: D, ekey: 'tst_e_w1new', name: TAG + ' · جديد', dis: 0 };
    g = await getList(W, S.dm.ck);
    s = await save(W, S.dm.ck, g.L.concat([NEW]), g.rev); assert.ok(ok(s), 'الإضافة: ' + show(s));
    const S3 = stored(W.env, K); assert.deepEqual(S3, S2.concat([NEW]), 'المضافُ في الذيل وحده');
    g = await getList(W, S.dm.ck);
    s = await save(W, S.dm.ck, g.L.filter((u) => u.id !== NEW.id), g.rev, g.us); assert.ok(ok(s), 'الحذف: ' + show(s));
    assert.deepEqual(stored(W.env, K), S2, 'الحذفُ يعيد القائمةَ كما كانت');
    /* مديرُ الفرع: موظفُ الإدارة الثانية في فرعه · وحسابُ الإدارة: يعيد تفعيله */
    g = await getList(W, S.gm.ck);
    s = await save(W, S.gm.ck, g.L.map((u) => u.id === 'tst_emp2' ? Object.assign({}, u, { dis: 1 }) : u), g.rev); assert.ok(ok(s), 'الفرع: ' + show(s));
    const S5 = stored(W.env, K); sameExcept(S2, S5, (L) => { L.find((u) => u.id === 'tst_emp2').dis = 1; }, 'الفرع: لا شيءَ غيرُه');
    g = await getList(W, S.dept.ck); assert.ok(!g.L.some((u) => u.id === MATE.uid), 'حسابُ الإدارة لا يرى tst_d1');
    s = await save(W, S.dept.ck, g.L.map((u) => u.id === 'tst_emp2' ? Object.assign({}, u, { dis: 0 }) : u), g.rev); assert.ok(ok(s), 'حسابُ الإدارة: ' + show(s));
    const S6 = stored(W.env, K); sameExcept(S5, S6, (L) => { L.find((u) => u.id === 'tst_emp2').dis = 0; }, 'حسابُ الإدارة: لا شيءَ غيرُه');
    /* حفظةٌ بلا تغيير (القائمةُ المُسقَطة كما وصلت) ⇒ لا مراجعةَ جديدة ولا تدقيقَ ولا كتابة */
    for (const role of ['plain', 'sup', 'dm', 'gm', 'dept']) {
      g = await getList(W, S[role].ck);
      const raw0 = W.env.DB.q('SELECT v FROM kv WHERE k = ? ORDER BY seq', K).map((x) => x.v).join(''), aud0 = W.env.DB.q('SELECT COUNT(*) AS n FROM aud WHERE k = ?', K)[0].n;
      s = await save(W, S[role].ck, g.L, g.rev);
      assert.equal(s.j.revs && s.j.revs[K], g.rev, role + ': بلا مراجعةٍ جديدة: ' + show(s));
      assert.equal(W.env.DB.q('SELECT v FROM kv WHERE k = ? ORDER BY seq', K).map((x) => x.v).join(''), raw0, role + ': المخزَّنُ حرفاً');
      assert.equal(W.env.DB.q('SELECT COUNT(*) AS n FROM aud WHERE k = ?', K)[0].n, aud0, role + ': بلا تدقيق');
    }
  });

  test(M + '(د) المزوَّرُ على المحجوب يُرفض ولا يمسّ شيئاً · والنسخةُ الكاملةُ القديمة لا تُحسب تعديلاً · وقيمةُ الرفض والتعارض مُسقَطة', async () => {
    const { W, S } = await setup(mode);
    const S0 = stored(W.env, K);
    const forge = async (role, fn, what) => {
      const g = await getList(W, S[role].ck), s = await save(W, S[role].ck, fn(g.L), g.rev);
      assert.ok(!ok(s) && s.j.denied && s.j.denied[K], role + ' ' + what + ': رُفض: ' + show(s));
      assert.deepEqual(stored(W.env, K), S0, role + ' ' + what + ': المخزَّنُ كما هو');
      const cur = s.j.denied[K].cur, mgr = ROLES[role][2];
      if (cur) assert.ok(!JSON.parse(cur).some((u) => u.id === 'tst_emp2' || (u.id !== S[role].uid && !mgr.includes(String(u.deptId || '')) && PII.some((f) => u[f]))), role + ' ' + what + ': قيمةُ الرفض مُسقَطة');
    };
    await forge('plain', (L) => L.concat([{ id: 'tst_emp2', role: 'staff', deptId: 'tst_d2', name: 'x' }]), 'حسابٌ محجوبٌ بمعرّفه');
    await forge('plain', (L) => L.map((u) => u.id === 'tst_dm1' ? Object.assign({}, u, { name: 'x' }) : u), 'صفُّ دليلٍ معدَّل');
    await forge('plain', (L) => L.map((u) => u.id === 'tst_dm1' ? Object.assign({}, u, { un: '0000000999' }) : u), 'اسمُ دخولٍ يُكتب في صفّ دليل');
    await forge('plain', (L) => L.filter((u) => u.id !== 'tst_dm1'), 'صفُّ دليلٍ محذوف');
    await forge('sup', (L) => L.map((u) => u.id === MATE.uid ? Object.assign({}, u, { dis: 1 }) : u), 'تجميدُ زميلٍ بلا إدارة');
    await forge('dm', (L) => L.concat([{ id: 'tst_emp2', role: 'staff', deptId: 'tst_d1', name: 'x', ekey: 'x' }]), 'نقلُ حسابٍ محجوبٍ إلى إدارته');
    /* عميلٌ قبل الإصلاح (نسخةٌ كاملةٌ قديمة بلا بصمات) يغيّر كلمةَ مروره ⇒ يُقبل ولا يُحسب ما فيه لغيره تعديلاً */
    const full = (await getList(W, S.super.ck)).L, rev = (await getList(W, S.plain.ck)).rev;
    /* …وكما وصلته بلا تغيير ⇒ لا أثرَ (المحجوبُ المرسَل كما هو يعود المخزَّنَ حرفاً) */
    const raw0 = W.env.DB.q('SELECT v FROM kv WHERE k = ? ORDER BY seq', K).map((x) => x.v).join(''), s0 = await save(W, S.plain.ck, full, rev);
    assert.equal(s0.j.revs && s0.j.revs[K], rev, 'النسخةُ الكاملة بلا تغيير: بلا مراجعة: ' + show(s0));
    assert.equal(W.env.DB.q('SELECT v FROM kv WHERE k = ? ORDER BY seq', K).map((x) => x.v).join(''), raw0, 'والمخزَّنُ حرفاً');
    const s = await save(W, S.plain.ck, full.map((u) => u.id === ME.uid ? Object.assign({}, u, { ph: P2('c') }) : u), rev); assert.ok(ok(s), 'النسخةُ الكاملة: ' + show(s));
    sameExcept(S0, stored(W.env, K), (L) => { L.find((u) => u.id === ME.uid).ph = P2('c'); }, 'النسخةُ الكاملة: لا شيءَ غيرُ بصمته');
    /* التعارض: نسخةٌ متجاوَزة ⇒ قيمةُ الخادم المرفقة مُسقَطة */
    const c = await save(W, S.plain.ck, full.map((u) => u.id === ME.uid ? Object.assign({}, u, { ph: P2('d') }) : u), rev);
    const cf = (c.j.conflicts || {})[K]; assert.ok(cf && cf.cur, 'تعارض: ' + show(c));
    assert.deepEqual(JSON.parse(cf.cur).map((u) => u.id).sort(), [ME.uid, 'su', 'tst_dm1', 'tst_gm1', 'tst_sa'].sort(), 'قيمةُ التعارض مُسقَطة');
  });

  test(M + '(هـ) قواعدُ التفرّد في الخادم كما هي: اسمُ دخولٍ أو هويةٌ لحسابٍ لا يراه مديرُ الإدارة تُرفض في الحسابات وفي سجلّ الموظفين', async () => {
    const { W, S } = await setup(mode);
    const S0 = stored(W.env, K), far = S0.find((u) => u.id === 'tst_emp2');
    let g = await getList(W, S.dm.ck); assert.ok(!g.L.some((u) => u.id === 'tst_emp2'), 'لا يراه');
    let s = await save(W, S.dm.ck, g.L.concat([{ id: 'w1dup' + mode, un: far.un, ph: P2('f'), role: 'staff', deptId: D, ekey: 'tst_e_w1dup', name: TAG + ' · تكرار', dis: 0 }]), g.rev);
    assert.ok(!ok(s) && s.j.denied && s.j.denied[K], 'اسمُ دخول حسابٍ محجوب: ' + show(s)); assert.deepEqual(stored(W.env, K), S0);
    s = await save(W, S.dm.ck, g.L.concat([{ id: 'w1dupb' + mode, un: '0000000778', alt: far.un, ph: P2('f'), role: 'staff', deptId: D, ekey: 'tst_e_w1dupb', name: TAG + ' · تكرار', dis: 0 }]), g.rev);
    assert.ok(!ok(s), 'اسمُه البديل كذلك: ' + show(s));
    const E = stored(W.env, KE), ge = await W.C.api('/api/get?keys=' + encodeURIComponent(KE), { cookie: S.dm.ck });
    const se = await W.C.api('/api/save', { method: 'POST', cookie: S.dm.ck, body: operationSaveBody(W.env, '/api/save', { uid: S.dm.uid, set: { [KE]: JSON.stringify(E.concat([{ eid: 'tst_e_w1dupe', name: TAG + ' · تكرار', nid: far.un }])) }, del: [], base: { [KE]: ge.j.keys[KE].rev } }) });
    assert.equal(((se.j.denied || {})[KE] || {}).why, 'emp-dup', 'هويةُ حسابٍ محجوبٍ في سجلّ الموظفين: ' + JSON.stringify(se.j).slice(0, 300));
  });
}
