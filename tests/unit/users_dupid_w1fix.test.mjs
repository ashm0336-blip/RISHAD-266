/* مراجعةُ التكامل W1-CRIT (حرج — تصعيدُ صلاحية · قائمٌ قبل الموجة 1 وفي Production): معرّفٌ مكرَّرٌ في قائمة الحسابات الواردة bassam_auth_users_v1.
   usersRule/enfUsersWrite يحكمان على آخر نسخةٍ من المعرّف (byB) والفاعلُ والدخولُ (actorOf · /api/login) يأخذان أوّلَها — فنسخةٌ معدَّلةٌ أوّلاً ثم الأصلُ
   كما هو ⇒ «لم يتغيّر» فتُكتب الأولى وتصير حيّة. الإصلاح (054 applySave · usersDupIdIn — قبل usersNoIn/usersScopeIn/canWrite وبالوضعين لغير مدير النظام):
   المعرّفُ المكرَّر رفضٌ ('users' · السجلُّ الأمنيّ dup-id) إلا تكراراً قديماً في المخزَّن لم يُمسّ؛ ودفاعٌ في العمق (018 usersDupCopyWhy في usersRule
   و059 enfUsersWrite). على العامل الحقيقي بالوضعين (tasks_fx · TEST_ONLY):
     (أ) حسابُه هو بدور مدير النظام · (ب) حسابُ موظفٍ يديره المديرُ بدور مدير النظام · (ج) صفُّ دليل مدير النظام باسم دخولٍ وبصمةٍ من اختياره ·
     (د) البصمةُ وحدها (الاستيلاءُ على admin) — كلُّها رفضٌ لا يمسّ المخزَّن ولا يمنح دخولاً · والحفظُ العاديُّ يمضي
     (هـ) تكرارٌ قديمٌ في المخزَّن (صفُّ دليلٍ وصفٌّ كامل) لا يمنع حفظاً لا يمسّه — ولا يُستغلّ: نسخةٌ معدَّلةٌ منه رفضٌ · ومديرُ النظام كما كان
     (و) الدفاعُ في العمق: usersRule (القديم) وenfUsersWrite (الإنفاذ) يرفضان القائمةَ المكرَّرة المعدَّلة ولو وصلتهما بلا البوابة */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { world, workerUnderTest, ME, MATE, stored, putKV } from './tasks_fx.mjs';
import { internals } from './internals.mjs';

const WU = workerUnderTest();
const K = 'bassam_auth_users_v1';
const PH = (pw, tag) => { const salt = crypto.createHash('sha256').update('w1fix-dup|' + tag).digest().subarray(0, 16); return 'p2$100000$' + salt.toString('hex') + '$' + crypto.pbkdf2Sync(pw, salt, 100000, 32, 'sha256').toString('hex'); };
const DM = { un: '0000000101', pw: '70101' };
const getList = async (W, ck) => { const g = await W.C.api('/api/get?keys=' + K, { cookie: ck }); return { L: JSON.parse(g.j.keys[K].v), rev: g.j.keys[K].rev }; };
const save = (W, ck, L, rev) => W.C.api('/api/save', { method: 'POST', cookie: ck, body: { set: { [K]: JSON.stringify(L) }, del: [], base: { [K]: rev } } });
const ok = (s) => !!(s.j && s.j.revs && s.j.revs[K]);
const show = (s) => JSON.stringify(s.j).slice(0, 260);
/* القائمةُ كما وصلت الفاعلَ ونسخةٌ معدَّلةٌ من صفّ id قبل نسخته الأصلية */
const dupFirst = (L, id, patch) => { const o = []; for (const u of L) { if (u.id === id) o.push(Object.assign({}, u, patch)); o.push(u); } return o; };
const secDup = (W) => W.env.DB.q("SELECT detail FROM sec WHERE act = 'denied' AND target = ?", K).filter((r) => /dup-id/.test(r.detail)).length;

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';

  test(M + '(أ–د) المعرّفُ المكرَّر: نسخةٌ معدَّلةٌ قبل الأصل تُرفض (dup-id) ولا تمسّ المخزَّن ولا تمنح دخولاً — والحفظُ العاديُّ يمضي', async () => {
    const W = await world({ worker: WU.file, mode });
    const me = await W.login(ME.un, ME.pw), dm = await W.login(DM.un, DM.pw);
    const S0 = stored(W.env, K), SU = S0.find((u) => u.id === 'su');
    const denied = async (who, ck, L, rev, what) => {
      const s = await save(W, ck, L, rev);
      assert.ok(!ok(s) && s.j.denied && s.j.denied[K], who + ' ' + what + ': رُفض: ' + show(s));
      assert.equal(s.j.denied[K].why, 'users', what);
      assert.equal(s.j.denied[K].detail, 'dup-id', what + ': السببُ معلَن');
      assert.deepEqual(stored(W.env, K), S0, what + ': المخزَّنُ كما هو');
    };
    let g = await getList(W, me.ck);
    /* (أ) حسابُه هو بدور مدير النظام */
    await denied('الموظف', me.ck, dupFirst(g.L, ME.uid, { role: 'super' }), g.rev, '(أ) حسابُه بدور super');
    /* (ج) صفُّ دليل مدير النظام باسم دخولٍ وبصمةٍ من اختياره */
    await denied('الموظف', me.ck, dupFirst(g.L, 'su', { un: '1999999991', ph: PH('Atk#9911', 'c') }), g.rev, '(ج) استيلاءٌ على صفّ مدير النظام');
    /* (د) البصمةُ وحدها: صفُّ دليل مدير النظام بكلمة مرورٍ من اختياره */
    await denied('الموظف', me.ck, dupFirst(g.L, 'su', { ph: PH('Atk#9912', 'd') }), g.rev, '(د) بصمةُ admin');
    /* (ب) المديرُ على حساب موظفٍ يديره: دورُ مدير النظام */
    const gd = await getList(W, dm.ck);
    await denied('المدير', dm.ck, dupFirst(gd.L, MATE.uid, { role: 'super' }), gd.rev, '(ب) موظفُه بدور super');
    await denied('المدير', dm.ck, dupFirst(gd.L, MATE.uid, { mgr: true }), gd.rev, '(ب) موظفُه بصفة مدير (لا يمنحها إلا مديرُ النظام)');
    assert.ok(secDup(W) >= 5, 'السجلُّ الأمنيّ: dup-id لكلّ محاولة');
    /* لا دخولَ بما اختاره · ولا جلسةَ بدور مدير النظام */
    assert.ok(!(await W.C.login('1999999991', 'Atk#9911')).ok, 'اسمُ الدخول المزروع لا يدخل');
    assert.ok(!(await W.C.login('admin', 'Atk#9912')).ok, 'كلمةُ المرور المزروعة لا تدخل admin');
    const me2 = await W.login(ME.un, ME.pw), b2 = (await W.C.boot(me2.ck)).boot, L2 = JSON.parse(b2.keys[K]);
    assert.equal(L2.find((u) => u.id === ME.uid).role, 'staff', 'الجلسةُ التالية: موظف');
    assert.ok(L2.length < S0.length, 'وقائمتُه ما زالت مُسقَطة (ليس مدير نظام)');
    assert.equal(stored(W.env, K).find((u) => u.id === MATE.uid).role, 'staff'); assert.ok(!stored(W.env, K).find((u) => u.id === MATE.uid).mgr);
    assert.equal(stored(W.env, K).find((u) => u.id === 'su').ph, SU.ph);
    /* الحفظُ العاديُّ يمضي: كلمةُ مرور الموظف · وتجميدُ المدير لموظفه */
    g = await getList(W, me2.ck);
    let s = await save(W, me2.ck, g.L.map((u) => u.id === ME.uid ? Object.assign({}, u, { ph: PH('New#7001', 'me') }) : u), g.rev); assert.ok(ok(s), 'كلمةُ المرور: ' + show(s));
    const g3 = await getList(W, dm.ck);
    s = await save(W, dm.ck, g3.L.map((u) => u.id === 'tst_snop' ? Object.assign({}, u, { dis: 1 }) : u), g3.rev); assert.ok(ok(s), 'التجميد: ' + show(s));
    assert.equal(stored(W.env, K).find((u) => u.id === 'tst_snop').dis, 1);
  });

  test(M + '(هـ) التكرارُ القديمُ في المخزَّن لا يمنع حفظاً لا يمسّه (صفُّ دليلٍ للموظف · صفٌّ كاملٌ للمدير) — ونسخةٌ معدَّلةٌ منه رفض · ومديرُ النظام كما كان', async () => {
    const W = await world({ worker: WU.file, mode });
    /* مخزَّنٌ قديمٌ مكرَّر: مديرُ الإدارة (صفُّ دليلٍ عند الموظف) وزميلٌ (صفٌّ كاملٌ عند المدير) — كلٌّ مرتين متتاليتين */
    const U = []; for (const u of stored(W.env, K)) { U.push(u); if (u.id === 'tst_dm1' || u.id === MATE.uid) U.push(Object.assign({}, u)); }
    putKV(W.env, K, U);
    const me = await W.login(ME.un, ME.pw), dm = await W.login(DM.un, DM.pw);
    let g = await getList(W, me.ck);
    assert.equal(g.L.filter((u) => u.id === 'tst_dm1').length, 2, 'الموظفُ يرى النسختين صفَّي دليل');
    /* نسخةٌ معدَّلةٌ من التكرار القديم (الأولى) ⇒ رفض */
    const atk = []; let first = true; for (const u of g.L) atk.push(u.id === 'tst_dm1' && first ? (first = false, Object.assign({}, u, { role: 'super' })) : u);
    let s = await save(W, me.ck, atk, g.rev);
    assert.ok(!ok(s) && s.j.denied && s.j.denied[K] && s.j.denied[K].detail === 'dup-id', 'نسخةٌ معدَّلةٌ من التكرار القديم: ' + show(s));
    assert.deepEqual(stored(W.env, K), U, 'المخزَّنُ كما هو');
    /* الموظفُ يغيّر كلمةَ مروره والتكرارُ كما وصله ⇒ يُقبل والتكرارُ باقٍ حرفاً */
    s = await save(W, me.ck, g.L.map((u) => u.id === ME.uid ? Object.assign({}, u, { ph: PH('New#7002', 'me2') }) : u), g.rev); assert.ok(ok(s), 'الموظف: ' + show(s));
    const S1 = stored(W.env, K), exp = U.map((u) => u.id === ME.uid ? Object.assign({}, u, { ph: PH('New#7002', 'me2') }) : u);
    assert.deepEqual(S1, exp, 'لا شيءَ غيرُ بصمته · والتكرارُ القديمُ حرفاً');
    /* المديرُ يجمّد موظفاً والزميلُ المكرَّرُ كما وصله ⇒ يُقبل */
    const gd = await getList(W, dm.ck);
    assert.equal(gd.L.filter((u) => u.id === MATE.uid).length, 2, 'المديرُ يرى النسختين');
    s = await save(W, dm.ck, gd.L.map((u) => u.id === 'tst_snop' ? Object.assign({}, u, { dis: 1 }) : u), gd.rev); assert.ok(ok(s), 'المدير: ' + show(s));
    assert.deepEqual(stored(W.env, K), S1.map((u) => u.id === 'tst_snop' ? Object.assign({}, u, { dis: 1 }) : u), 'لا شيءَ غيرُ التجميد');
    /* مديرُ النظام بلا تغيير: قائمتُه بمكرَّرٍ جديدٍ تُقبل كما كانت (لا بوابةَ عليه) */
    const gs = await getList(W, W.su.ck);
    s = await save(W, W.su.ck, gs.L.concat([Object.assign({}, gs.L.find((u) => u.id === 'tst_emp2'))]), gs.rev); assert.ok(ok(s), 'مديرُ النظام: ' + show(s));
  });
}

test('(و) الدفاعُ في العمق: usersRule (القديم) وenfUsersWrite (الإنفاذ) يرفضان قائمةً مكرَّرةً معدَّلةً ولو وصلتهما بلا بوابة 054', async () => {
  const I = await internals(['actorFromKeys', 'usersRule', 'enfUsersWrite']);
  const P2 = (c) => 'p2$100000$' + c.repeat(32) + '$' + c.repeat(64);
  const L = [
    { id: 'su', un: '1000000001', ph: P2('a'), name: 'TEST_ONLY su', role: 'super' },
    { id: 'dm', un: '1000000002', ph: P2('b'), name: 'TEST_ONLY dm', role: 'staff', deptId: 'd1', ekey: 'mgr:d1', mgr: true },
    { id: 'st1', un: '1000000004', ph: P2('d'), name: 'TEST_ONLY st', role: 'staff', deptId: 'd1', ekey: 'e1', dis: 0 }
  ];
  const keys = { [K]: JSON.stringify(L), bassam_depts_v1: JSON.stringify([{ id: 'd1', name: 'd1' }]), bassam_gdepts_v1: '[]', bassam_perms_v1: JSON.stringify({ caps: { d1: ['emps'] } }), bassam_platform_v1: '{}' };
  const A = I.actorFromKeys(keys, 'st1'), cur = JSON.stringify(L);
  const atk = JSON.stringify([L[0], L[1], Object.assign({}, L[2], { role: 'super' }), L[2]]);
  const r1 = I.usersRule(A, atk, cur, {}); assert.equal(r1.ok, false, 'usersRule: ' + JSON.stringify(r1)); assert.equal(r1.why, 'users');
  const r2 = I.enfUsersWrite(A, K, atk, cur, {}, {}); assert.equal(r2.ok, false, 'enfUsersWrite: ' + JSON.stringify(r2));
  /* التكرارُ القديمُ كما هو (كلُّ نسخةٍ مخزَّنة) لا يُرفض بهذا الحكم */
  const legacy = L.concat([L[1]]), same = JSON.stringify(legacy.map((u) => u.id === 'st1' ? Object.assign({}, u, { ph: P2('e') }) : u));
  assert.equal(I.usersRule(A, same, JSON.stringify(legacy), {}).ok, true, 'التكرارُ القديمُ وكلمةُ المرور');
});
