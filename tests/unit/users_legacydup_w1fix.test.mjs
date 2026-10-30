/* مراجعةُ التكامل (الجولة الثانية) — التكرارُ القديم لمعرّف الحساب في المخزَّن (054 usersDupIdIn · 018 usersDupCopyWhy · mergeUsers/usersNoIn/usersScopeIn):
   R2-LEGACYLOCK (منخفض — أدخلته الجولةُ الأولى): نسختان متطابقتان حرفاً لحسابٍ في المخزَّن ⇒ كان كلُّ تعديلٍ له من غير مدير النظام يُرفض dup-id: صاحبُه
     لا يغيّر كلمةَ مروره (ولو في الدخول الأوّل الإجباري) ومديرُه لا يجمّده. الآن تُقبل نسخٌ واردةٌ متطابقةٌ حرفاً (ومنه ph وno) لا تزيد على المخزَّنة —
     فالأولى (الدخول · actorOf) هي المحكومُ عليها (الأخيرة) — وتُكتب متطابقة.
   R2-SUBSET (منخفض — قائمٌ قبل الموجة · السببُ نفسُه): نسخٌ مخزَّنةٌ مختلفة (الأولى staff والتالية mgr) ⇒ كان غيرُ مدير النظام يرسل التاليةَ وحدها
     («لم تتغيّر» بآخر نسخة) فتصير الحيّةَ ويدخل بها مديراً. الآن نسخُه الواردة هي المخزَّنة التي يراها بعددها وترتيبها وإلا رُفض (dup-id) — ولا ينظّفها
     إلا مديرُ النظام؛ والنسخةُ المحجوبة عن الفاعل تبقى في موضعها.
   على العامل الحقيقي بالوضعين (tasks_fx · TEST_ONLY):
     (أ) تكرارٌ متطابق: كلمةُ مرور صاحبه تُقبل · تجميدُ مديره ثم فكُّه يُقبلان · والنسختان تُكتبان متطابقتين · ويدخل بكلمته الجديدة
     (ب) ولا يُستغلّ: نسخةٌ أولى معدَّلة · نسختان متطابقتان بدورٍ أعلى · نسخةٌ ثالثةٌ زائدة — كلُّها رفضٌ والمخزَّنُ كما هو
     (ج) تكرارٌ مختلف: التاليةُ وحدها · عكسُ الترتيب · حذفُ النسختين — رفضٌ dup-id بلا ترقية · والنسختان كما وصلتاه تمضيان بلا تغيير
     (د) تكرارٌ مختلفٌ نسختُه الأولى محجوبةٌ عن المدير: حفظُه لقائمته (فيها الثانيةُ وحدها) لا يحذف المحجوبة ولا يجعل الثانيةَ حيّة
     (هـ) الدفاعُ في العمق: usersRule/enfUsersWrite يرفضان قائمةً تُسقط نسخةً من تكرارٍ مختلف ويقبلان النسختين المتطابقتين المعدَّلتين
     (و) mergeUsers/usersNoIn: النسخةُ n ترث من المخزَّنة n — نسخةٌ أولى (بصفة مدير) بلا بصمة لا تكسب بصمةَ التالية بحفظٍ عاديٍّ للمدير (فلا يدخل بها صاحبُ التالية مديراً) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { world, workerUnderTest, ME, MATE, stored, putKV } from './tasks_fx.mjs';
import { internals } from './internals.mjs';

const WU = workerUnderTest();
const K = 'bassam_auth_users_v1';
const PH = (pw, tag) => { const salt = crypto.createHash('sha256').update('w1r2-legacy|' + tag).digest().subarray(0, 16); return 'p2$100000$' + salt.toString('hex') + '$' + crypto.pbkdf2Sync(pw, salt, 100000, 32, 'sha256').toString('hex'); };
const DM = { un: '0000000101', pw: '70101' };
const getList = async (W, ck) => { const g = await W.C.api('/api/get?keys=' + K, { cookie: ck }); return { L: JSON.parse(g.j.keys[K].v), rev: g.j.keys[K].rev, us: g.j.uscope }; };
const save = (W, ck, L, rev, us) => W.C.api('/api/save', { method: 'POST', cookie: ck, body: { set: { [K]: JSON.stringify(L) }, del: [], base: { [K]: rev }, uscope: us } });
const ok = (s) => !!(s.j && s.j.revs && s.j.revs[K]);
const show = (s) => JSON.stringify(s.j).slice(0, 260);
const copies = (W, id) => stored(W.env, K).filter((u) => u.id === id);
/* المخزَّن: نسخةٌ ثانيةٌ (patch ⇒ مختلفة) بعد نسخة الحساب id مباشرةً — أو في آخر القائمة (atEnd) */
function plant(W, id, patch, atEnd) {
  const U = stored(W.env, K), me = U.find((u) => u.id === id), o = [];
  const twin = Object.assign({}, me, patch || {});
  for (const u of U) { o.push(u); if (u.id === id && !atEnd) o.push(twin); }
  if (atEnd) o.push(twin);
  putKV(W.env, K, o); return o;
}
const mapId = (L, id, f) => L.map((u) => u.id === id ? f(u) : u);

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';

  test(M + '(أ) R2-LEGACYLOCK: تكرارٌ متطابق — كلمةُ مرور صاحبه وتجميدُ مديره وفكُّه تُقبل · والنسختان تُكتبان متطابقتين', async () => {
    const W = await world({ worker: WU.file, mode });
    plant(W, ME.uid);
    const me = await W.login(ME.un, ME.pw), g = await getList(W, me.ck);
    assert.equal(g.L.filter((u) => u.id === ME.uid).length, 2, 'تصله النسختان');
    const ph = PH('Nw#77123', 'a');
    const s = await save(W, me.ck, mapId(g.L, ME.uid, (u) => Object.assign({}, u, { ph })), g.rev, g.us);
    assert.ok(ok(s), 'كلمةُ مروره تُقبل: ' + show(s));
    let C = copies(W, ME.uid); assert.equal(C.length, 2); assert.deepEqual(C[0], C[1], 'النسختان متطابقتان'); assert.equal(C[0].ph, ph, 'بالبصمة الجديدة');
    assert.ok((await W.C.login(ME.un, 'Nw#77123')).ok, 'ويدخل بكلمته الجديدة');
    /* مديرُه يجمّده ثم يفكّه */
    const dm = await W.login(DM.un, DM.pw);
    for (const dis of [1, 0]) {
      const gd = await getList(W, dm.ck);
      const sd = await save(W, dm.ck, mapId(gd.L, ME.uid, (u) => Object.assign({}, u, { dis })), gd.rev, gd.us);
      assert.ok(ok(sd), 'المدير dis=' + dis + ': ' + show(sd));
      C = copies(W, ME.uid); assert.equal(C.length, 2); assert.deepEqual(C[0], C[1], 'متطابقتان بعد dis=' + dis); assert.equal(C[0].dis, dis); assert.equal(C[0].ph, ph, 'والبصمةُ باقية');
    }
  });

  test(M + '(ب) R2-LEGACYLOCK لا يُستغلّ: نسخةٌ أولى معدَّلة · نسختان بدورٍ أعلى · نسخةٌ ثالثةٌ زائدة — رفضٌ والمخزَّنُ كما هو', async () => {
    const W = await world({ worker: WU.file, mode });
    plant(W, ME.uid);
    const me = await W.login(ME.un, ME.pw), g = await getList(W, me.ck), S0 = stored(W.env, K);
    const tryIt = async (what, L, why) => {
      const s = await save(W, me.ck, L, g.rev, g.us);
      assert.ok(!ok(s) && s.j.denied && s.j.denied[K], what + ': رُفض: ' + show(s));
      if (why) assert.equal(s.j.denied[K].detail, why, what);
      assert.deepEqual(stored(W.env, K), S0, what + ': المخزَّنُ كما هو');
    };
    let seen = 0;
    await tryIt('نسخةٌ أولى بدور super', g.L.map((u) => u.id === ME.uid && !seen++ ? Object.assign({}, u, { role: 'super' }) : u), 'dup-id');
    await tryIt('نسخةٌ أولى بصفة مدير', (seen = 0, g.L.map((u) => u.id === ME.uid && !seen++ ? Object.assign({}, u, { mgr: true }) : u)), 'dup-id');
    await tryIt('النسختان بدور super', mapId(g.L, ME.uid, (u) => Object.assign({}, u, { role: 'super' })));
    await tryIt('نسخةٌ ثالثة', g.L.concat([g.L.find((u) => u.id === ME.uid)]), 'dup-id');
    const me2 = await W.login(ME.un, ME.pw), b = (await W.C.boot(me2.ck)).boot;
    assert.ok(JSON.parse(b.keys[K]).filter((u) => u.id === ME.uid).every((u) => u.role === 'staff' && !u.mgr), 'الجلسةُ التالية: موظف');
  });

  test(M + '(ج) R2-SUBSET: تكرارٌ مختلف — التاليةُ وحدها · عكسُ الترتيب · حذفُهما رفضٌ بلا ترقية · والنسختان كما وصلتاه تمضيان', async () => {
    const W = await world({ worker: WU.file, mode });
    plant(W, ME.uid, { mgr: true, ekey: 'mgr:tst_d1' });
    const me = await W.login(ME.un, ME.pw), g = await getList(W, me.ck), S0 = stored(W.env, K);
    const mine = g.L.filter((u) => u.id === ME.uid);
    assert.equal(mine.length, 2, 'تصله النسختان');
    const rest = g.L.filter((u) => u.id !== ME.uid), at = g.L.findIndex((u) => u.id === ME.uid);
    const withMine = (arr) => rest.slice(0, at).concat(arr, rest.slice(at));
    for (const [what, L] of [['التاليةُ وحدها', withMine([mine[1]])], ['الأولى وحدها', withMine([mine[0]])], ['عكسُ الترتيب', withMine([mine[1], mine[0]])], ['حذفُهما', rest]]) {
      const s = await save(W, me.ck, L, g.rev, g.us);
      assert.ok(!ok(s) && s.j.denied && s.j.denied[K] && s.j.denied[K].detail === 'dup-id', what + ': رُفض dup-id: ' + show(s));
      assert.deepEqual(stored(W.env, K), S0, what + ': المخزَّنُ كما هو');
    }
    const me2 = await W.login(ME.un, ME.pw), b = (await W.C.boot(me2.ck)).boot;
    assert.ok(!JSON.parse(b.keys[K]).find((u) => u.id === ME.uid).mgr, 'لا ترقية: الجلسةُ التالية بلا صفة مدير');
    /* النسختان كما وصلتاه: بلا تغيير (noop) · وحفظُ صفٍّ آخر معها يمضي والنسختان كما هما */
    const s1 = await save(W, me.ck, g.L, g.rev, g.us); assert.ok(ok(s1), 'كما وصلتاه: ' + show(s1)); assert.deepEqual(stored(W.env, K), S0, 'بلا تغيير');
    const dm = await W.login(DM.un, DM.pw), gd = await getList(W, dm.ck);
    const s2 = await save(W, dm.ck, mapId(gd.L, MATE.uid, (u) => Object.assign({}, u, { dis: 1 })), gd.rev, gd.us);
    assert.ok(ok(s2), 'المديرُ يجمّد زميلاً والتكرارُ في قائمته كما وصله: ' + show(s2));
    assert.deepEqual(copies(W, ME.uid), S0.filter((u) => u.id === ME.uid), 'النسختان كما هما بترتيبهما');
    assert.equal(copies(W, MATE.uid)[0].dis, 1, 'والتجميدُ مطبَّق');
  });

  test(M + '(و) نسخةٌ أولى بلا بصمة (بصفة مدير) قبل نسخة الموظف — حفظُ المدير العاديّ لا يورثها بصمةَ التالية فلا يدخل الموظفُ بها مديراً', async () => {
    const W = await world({ worker: WU.file, mode });
    const U = stored(W.env, K), me = U.find((u) => u.id === ME.uid), first = Object.assign({}, me, { mgr: true, ekey: 'mgr:tst_d1' }); delete first.ph;
    const o = []; for (const u of U) { if (u.id === ME.uid) o.push(first); o.push(u); } putKV(W.env, K, o);
    const dm = await W.login(DM.un, DM.pw), gd = await getList(W, dm.ck);
    const s = await save(W, dm.ck, mapId(gd.L, MATE.uid, (u) => Object.assign({}, u, { dis: 1 })), gd.rev, gd.us);
    assert.ok(ok(s), 'حفظُ المدير العاديّ يمضي: ' + show(s));
    const C = copies(W, ME.uid);
    assert.equal(C.length, 2); assert.ok(!('ph' in C[0]), 'النسخةُ الأولى ما زالت بلا بصمة'); assert.equal(C[1].ph, me.ph, 'والثانيةُ ببصمتها');
    const l = await W.C.login(ME.un, ME.pw);
    if (l.ok) { const b = (await W.C.boot(l.ck)).boot; assert.ok(!JSON.parse(b.keys[K]).find((u) => u.id === ME.uid).mgr, 'لا جلسةَ بصفة مدير'); }
  });

  test(M + '(د) R2-SUBSET: نسخةٌ أولى محجوبةٌ عن المدير — حفظُه لا يحذفها ولا يجعل الثانيةَ حيّة', async () => {
    const W = await world({ worker: WU.file, mode });
    /* tst_emp2 (إدارة tst_d2 — محجوبٌ عن dm1) ونسخةٌ ثانيةٌ في آخر القائمة نُقلت إلى tst_d1 (يديرها dm1) */
    const S0 = plant(W, 'tst_emp2', { deptId: 'tst_d1', name: 'TEST_ONLY · نسخة ثانية' }, true);
    const dm = await W.login(DM.un, DM.pw), g = await getList(W, dm.ck);
    assert.equal(g.L.filter((u) => u.id === 'tst_emp2').length, 1, 'يرى الثانيةَ وحدها');
    const s = await save(W, dm.ck, mapId(g.L, MATE.uid, (u) => Object.assign({}, u, { dis: 1 })), g.rev, g.us);
    assert.ok(ok(s), 'حفظُه يمضي: ' + show(s));
    assert.deepEqual(copies(W, 'tst_emp2'), S0.filter((u) => u.id === 'tst_emp2'), 'النسختان كما هما: المحجوبةُ لم تُحذف');
    assert.equal(copies(W, MATE.uid)[0].dis, 1, 'والتجميدُ مطبَّق');
    /* وتعديلُ الثانية (المرئية) لا يُقبل من غير مدير النظام */
    const g2 = await getList(W, dm.ck);
    const s2 = await save(W, dm.ck, mapId(g2.L, 'tst_emp2', (u) => Object.assign({}, u, { name: 'TEST_ONLY · عُدّل' })), g2.rev, g2.us);
    assert.ok(!ok(s2) && s2.j.denied[K].detail === 'dup-id', 'تعديلُ نسخةٍ من تكرارٍ مختلف رفض: ' + show(s2));
  });
}

test('(هـ) الدفاعُ في العمق: usersRule (القديم) وenfUsersWrite (الإنفاذ) — إسقاطُ نسخةٍ من تكرارٍ مختلف رفض · ونسختان متطابقتان معدَّلتان تُقبلان', async () => {
  const I = await internals(['actorFromKeys', 'usersRule', 'enfUsersWrite']);
  const P2 = (c) => 'p2$100000$' + c.repeat(32) + '$' + c.repeat(64);
  const su = { id: 'su', un: '1000000001', ph: P2('a'), name: 'TEST_ONLY su', role: 'super' };
  const dm = { id: 'dm', un: '1000000002', ph: P2('b'), name: 'TEST_ONLY dm', role: 'staff', deptId: 'd1', ekey: 'mgr:d1', mgr: true };
  const st = { id: 'st1', un: '1000000004', ph: P2('d'), name: 'TEST_ONLY st', role: 'staff', deptId: 'd1', ekey: 'e1', dis: 0 };
  const keysOf = (L) => ({ [K]: JSON.stringify(L), bassam_depts_v1: JSON.stringify([{ id: 'd1', name: 'd1' }]), bassam_gdepts_v1: '[]', bassam_perms_v1: JSON.stringify({ caps: { d1: ['emps'] } }), bassam_platform_v1: '{}' });
  const both = (A, inc, cur, why) => {
    const r1 = I.usersRule(A, JSON.stringify(inc), JSON.stringify(cur), {}), r2 = I.enfUsersWrite(A, K, JSON.stringify(inc), JSON.stringify(cur), {}, {});
    if (why) { assert.equal(r1.ok, false, why + ' usersRule: ' + JSON.stringify(r1)); assert.equal(r1.why, 'users', why); assert.equal(r2.ok, false, why + ' enfUsersWrite: ' + JSON.stringify(r2)); }
    else { assert.equal(r1.ok, true, 'usersRule: ' + JSON.stringify(r1)); assert.equal(r2.ok, true, 'enfUsersWrite: ' + JSON.stringify(r2)); }
  };
  /* R2-SUBSET: المخزَّن st (موظف) ثم st بصفة مدير */
  const stM = Object.assign({}, st, { mgr: true, ekey: 'mgr:d1' }), curD = [su, dm, st, stM], A1 = I.actorFromKeys(keysOf(curD), 'st1');
  both(A1, [su, dm, stM], curD, 'التاليةُ وحدها');
  both(A1, [su, dm, stM, st], curD, 'عكسُ الترتيب');
  both(A1, curD, curD, '');
  /* R2-LEGACYLOCK: المخزَّن st مرتين متطابقتين */
  const curS = [su, dm, st, st], A2 = I.actorFromKeys(keysOf(curS), 'st1'), stP = Object.assign({}, st, { ph: P2('e') });
  both(A2, [su, dm, stP, stP], curS, '');
  both(A2, [su, dm, stP, st], curS, 'الأولى وحدها معدَّلة');
  both(A2, [su, dm, stP, stP, stP], curS, 'ثلاثٌ على اثنتين');
});
