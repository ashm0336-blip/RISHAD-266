/* V7 · 53 (mgrimp5 · ملحق 5): مديرُ الإدارة يستورد نسخةَ إدارته من Production «استبدالاً كاملاً» — كانت تُرفض كلُّها لأن أوراقَ موظفيها
   (perms.emps) تحمل ما لا يملكه هو («رفض الخادم ١ مجموعة بيانات: bassam_perms_v1 (grant)»). الآن تُضيَّق كلُّ ورقةٍ إلى ما يستطيع منحه
   (018c permsImportNarrow ← المحرّكُ المشترك perm44 narrowSheets)، والمُسقَطُ يُذكر في «لن يُنقل» قبل التأكيد ولا يُكتب منه شيء، والخادمُ يتحقّق
   بالقاعدة نفسِها بلا تغيير. ومديرُ المنصة يستورد النسخةَ نفسَها كما هي. النسخةُ بشكل Production مجهولةُ الهوية (v7_53_mgrimp5_fx · TEST_ONLY) —
   ≈31MB · 29 مجموعة بيانات · 10 صور · 12 ورقة موظف — تحت سقف D1 الحقيقي (32MiB للاستدعاء: DB.limits) · وكلُّ موردٍ يُقرأ بعد الاعتماد (readBack). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasSystem } from './harness.mjs';
import { target, protocol, staged, readBack, sizeOf, LAB } from './v7_d6_import_fx.mjs';
import { prodFile, expectFor, empIds, MGR_MINUS, NOT_HELD } from './v7_53_mgrimp5_fx.mjs';

const B = 'TEST_ONLY_B', SCOPE = { kind: 'dept', departmentId: B };
const need = hasSystem('plan', 'daily', 'tasks', 'staff', 'dreport', 'custody') ? {} : { skip: 'يحتاج أنظمة بيانات العرض المصدر' };
const quiet = console.log; console.log = (...a) => { if (!/^\{"v":1/.test(String(a[0]))) quiet(...a); };
const permsOf = (T) => JSON.parse(T.DB.q("SELECT group_concat(v,'') v FROM (SELECT v FROM kv WHERE k='bassam_perms_v1' ORDER BY seq)")[0].v);
const put = async (T, k, v) => T.DB.batch([...T.lab.W.kvPutStmts(T.lab.env, 'kv', k, JSON.stringify(v)), T.DB.prepare('UPDATE revs SET rev=rev+1 WHERE k=?1').bind(k)]);
const atoms = (s) => Object.entries(s || {}).flatMap(([p, acts]) => acts.map((a) => p + ':' + a));
let FILE = null;
const file = async () => FILE || (FILE = await prodFile());

test('(١) مديرُ الإدارة: «استبدال كامل» لنسخة Production ينجح — ما لا يملكه يُسقط ويُذكر في «لن يُنقل» ولا يُكتب · كلُّ موردٍ يُقرأ', { timeout: 900000, ...need }, async () => {
  const F = await file(), T = await target();
  try {
    const sz = sizeOf(F);
    assert.ok(sz.total > 30e6 && Object.keys(F.data).length === 29 && Object.keys(F.idbImages).length === 10 && empIds(F).length === 12, 'شكلُ Production: ' + JSON.stringify({ total: sz.total, keys: Object.keys(F.data).length }));
    for (const x of NOT_HELD.concat('emps/data:export')) assert.ok(empIds(F).some((ek) => atoms(F.perms.emps[ek]).includes(x)), 'النسخةُ تحمل ' + x);
    /* الهدفُ كما في Production: سقفُ الإدارة أضيقُ من سقف النسخة (بلا rasd) ومديرُ الإدارة يرثه وقد ضيّق عليه مديرُ المنصة بالمنح الصريح */
    const p0 = permsOf(T); p0.caps[B] = p0.caps[B].filter((x) => x !== 'rasd'); p0.emps = { ...(p0.emps || {}), [B]: {} }; await put(T, 'bassam_perms_v1', p0);
    await put(T, 'bsdept:' + B + ':bassam_grants_v1', { v: 1, emp: { ['mgr:' + B]: { plus: [], minus: MGR_MINUS } } });
    T.DB.limits = true;   /* سقوفُ D1 الحقيقية (32MiB للاستدعاء — ملحق 4) */
    const mgr = await T.login(LAB.mgrB, LAB.pw), run = await protocol(T, mgr, F, { scope: SCOPE }).run();
    assert.equal(run.inspect && run.inspect.status, 200, 'الفحصُ يمرّ (كان 403 restore-key-denied · bassam_perms_v1 grant): ' + JSON.stringify((run.inspect || run.slice || run.part || run.begin).j).slice(0, 600));
    assert.equal(run.commit && run.commit.status, 200, JSON.stringify((run.commit || {}).j).slice(0, 400));
    assert.equal(staged(T.DB), 0);
    const want = expectFor(F), got = run.inspect.j.inspection.summary.notTransferred.filter((x) => x.why === 'perm-grant').map((x) => x.e + '|' + x.p + '|' + x.a).sort();
    assert.deepEqual(got, want.drops, 'كلُّ ما لا يملكه المديرُ مذكورٌ في «لن يُنقل» بنداً بنداً (الموظفُ · الصفحةُ · الإجراء) — ولا غيرُه');
    assert.ok(want.drops.length >= 40, 'المُسقَط: ' + want.drops.length);
    const now = permsOf(T), st = now.emps[B];
    assert.equal(st['mgr:' + B], undefined, 'لا ورقةَ للمدير (يرث سقفَ إدارته) — صحيفةُ مدير المصدر لا تنتقل');
    for (const ek of empIds(F)) {
      assert.deepEqual(st[ek], want.kept[ek], ek + ': الورقةُ المكتوبة = ما يملكه المدير منها وحده');
      for (const a of atoms(st[ek])) assert.ok(!NOT_HELD.includes(a), ek + ': لا يُمنح ما لا يملكه المستورِد — ' + a);
    }
    assert.deepEqual(now.lenses[B], F.perms.lenses, 'العدساتُ = الهدف ∩ النسخة (ك1)');
    await readBack(T, B);
  } finally { await T.close(); }
});

test('(٢) مديرُ المنصة: النسخةُ نفسُها تُنقل كلُّها بلا تضييق — ولا يُمنح أحدٌ ما لا يملكه المستورِد', { timeout: 900000, ...need }, async () => {
  const F = await file(), T = await target();
  try {
    T.DB.limits = true;
    const run = await protocol(T, T.su, F, { scope: SCOPE }).run();
    assert.equal(run.commit && run.commit.status, 200, JSON.stringify((run.commit || run.inspect || run.begin).j).slice(0, 400));
    assert.deepEqual(run.inspect.j.inspection.summary.notTransferred.filter((x) => x.why === 'perm-grant'), [], 'لا تضييقَ لمدير المنصة');
    const st = permsOf(T).emps[B];
    for (const ek of empIds(F)) assert.deepEqual(st[ek], F.perms.emps[ek], ek + ': الورقةُ كما في النسخة (مديرُ المنصة يملك كلَّ شيء)');
    await readBack(T, B);
  } finally { await T.close(); }
});
