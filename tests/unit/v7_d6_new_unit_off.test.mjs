/* V7 · د6 (ب4 — قرار المالك): الوحدةُ الجديدة تبدأ وأنظمتُها مطفأة. الواجهةُ الحقيقية (320 · 331 · 334 · 345 في node:vm) تحفظ عبر العامل الحقيقي فوق
   D1 البديل، ثم تُقلع واجهاتُ حساباتِ الوحدة الجديدة من جديد (إعادةُ تحميل) — فالمشاهَدُ مفاتيحُ الخادم لا الواجهةُ وحدها. TEST_ONLY (v7_d6_holders_fx).
     · الاختيارُ الصريح seed: 'off' (الافتراضي) | 'parent' — من كل مدخل: BassamDepts.unitAdd · deptAdd · nodeAdd · sectionAdd · BassamPerm.seedCapFrom
     · الأبُ المفتوح بلا سجلّ (أو الجذر) مع 'parent' ⇒ كلُّ المفعّل على المنصة
     · القسمُ الجديد بالاختيار نفسِه
     · الوحداتُ القائمة لا تتغيّر (سجلُّ كلِّ وحدةٍ أخرى كما هو بايتاً · وحدةٌ بلا سجلٍّ تبقى «مفتوحة» كما كانت)
     · الصفحاتُ الدائمة (صفحتي · موظفو الإدارة · الإعدادات وفروعُها) سليمةٌ والكلُّ مطفأ
     · تعذّرُ ضبط الأنظمة يسحب الوحدة (لا تُترك مفتوحة) · زرعُ الهيكل الافتراضي يبقى مفعّلاً باختيارٍ صريح
   الاستيرادُ والاستعادة: tests/unit/v7_d6_new_unit_restore.test.mjs. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { needs } from './harness.mjs';
import { stored } from './world_fx.mjs';
import { holdersWorld, clientOf, applyState, addHolder, offRecord, KP, T, S, G, A, B, A_S1, NO, OP, OFF_PLAT } from './v7_d6_holders_fx.mjs';

const SYS = ['tasks', 'staff', 'irshad', 'daily', 'award', 'custody', 'dstats'];
const OFF = offRecord(), PERMANENT = ['profile', 'emps', 'admin'];
const FULL = ['profile', 'kpis', 'dstats', 'emps', 'planning', 'daily', 'irshad', 'seized', 'award', 'links', 'help', 'admin'];
const J = (x) => JSON.parse(JSON.stringify(x));
const others = (pm, ids) => { const o = J(pm); for (const m of ['caps', 'subs', 'lenses', 'capOwn', 'emps', 'empLens', 'tplOf']) for (const id of ids) if (o[m]) delete o[m][id]; for (const m of ['subs', 'lenses', 'capOwn']) if (o[m] && !Object.keys(o[m]).length) delete o[m]; return o; };
/* ينشئ من واجهة مدير المنصة الحقيقية ثم يحفظ عبر العامل؛ يعيد جوابَ الإنشاء */
async function create(W, fn) {
  const c = await clientOf(W, 'su', B);
  try { const r = J(fn(c)); await c.settle(); assert.equal(c.denied(), 0, 'the worker accepted the save'); return r; } finally { c.dispose(); }
}
const seenBy = async (W, who, did) => { const c = await clientOf(W, who, did); try { return c.seen(); } finally { c.dispose(); } };
/* مفاتيحُ الخادم لحسابٍ في وحدته: أيُّ نظامٍ يُطفأ يحمل منه مفتاحاً؟ (azKey = بتّاتُ /api/authz المحمولة في الإقلاع) */
async function heldSystems(W, who, did) {
  const c = await clientOf(W, who, did);
  try { return c.ev('KIVO.Perm44.sysList().filter(function (s) { return s.toggle !== false && s.key !== "admin" && KIVO.Perm44.sysKeys(s.key).some(function (k) { return KIVO.__BS_I.auth.azKey(k, ' + JSON.stringify(did) + ') === true; }); }).map(function (s) { return s.key; })'); } finally { c.dispose(); }
}
const srvOn = async (W, did) => (await W.C.api('/api/perm44/check?d=' + did + '&role=x&key=task.view', { cookie: W.ck.su })).j.on;

test('V7 · د6 · ب4 — a new department starts with every switchable system OFF (the default), really OFF for its manager and staff by the server keys after save and reload; the permanent pages stay; existing units are untouched', Object.assign({ timeout: 600000 }, needs(...SYS)), async () => {
  const W = await holdersWorld();
  await applyState(W, 'allOn');
  const before = stored(W.env, KP), openBefore = await seenBy(W, 'open', OP);
  assert.equal(Object.prototype.hasOwnProperty.call(before.caps, OP), false); assert.equal(Object.prototype.hasOwnProperty.call(before.caps, NO), false);
  /* الافتراضي من المدخل الواحد للنافذة */
  const r = await create(W, (c) => c.K.BassamDepts.unitAdd({ name: T + 'إدارة جديدة', kind: 'إدارة', pid: G }));
  assert.equal(r.ok, true); assert.equal(r.seed, 'off', 'the default choice is «مطفأة كلها»');
  const pm = stored(W.env, KP);
  assert.deepEqual(pm.caps[r.id], OFF.caps, 'D1: the new unit\'s ceiling record = the permanent pages alone');
  assert.deepEqual(pm.subs[r.id], OFF.subs, 'D1: a system that is a section of a permanent page («العهد») is OFF too');
  assert.deepEqual(others(pm, [r.id]), others(before, []), 'no other unit\'s record changed (byte-equal JSON)');
  assert.equal(stored(W.env, 'bassam_depts_v1').find((d) => d.id === r.id).gid, G);
  /* reload: the unit's manager and an employee, by the server's keys */
  await addHolder(W, 'nm', r.id, true); await addHolder(W, 'ns', r.id, false);
  assert.deepEqual(await seenBy(W, 'nm', r.id), PERMANENT, 'its manager sees «صفحتي · موظفو الإدارة · الإعدادات» alone');
  assert.deepEqual(await seenBy(W, 'ns', r.id), ['profile'], 'an employee sees «صفحتي» alone');
  assert.deepEqual(await heldSystems(W, 'nm', r.id), [], 'the server carries no key of any switchable system for its manager');
  assert.deepEqual(await heldSystems(W, 'ns', r.id), [], '… nor for its staff');
  assert.deepEqual((await srvOn(W, r.id)).filter((k) => OFF.systems.includes(k)), [], 'server: no switchable system is ON in the new unit\'s ceiling');
  assert.deepEqual(await seenBy(W, 'su', r.id), PERMANENT, 'OFF is shown to nobody: the platform admin inside it sees the permanent pages alone');
  /* الصفحاتُ الدائمة سليمة والكلُّ مطفأ */
  const m = await clientOf(W, 'nm', r.id);
  try {
    assert.deepEqual(m.ev('["shifts", "backup", "import", "oplog"].map(function (s) { return KIVO.BassamPerm.subOn("admin", s); })'), [true, true, true, true], '«الإعدادات» and its branches (shifts · backup · import · log) are open to the manager');
    assert.equal(m.ev('KIVO.Perm44.unitMgr()'), true, '«الإعدادات ← الصلاحيات» stays his (unit manager)');
    assert.equal(m.ev('KIVO.BassamPerm.subOn("emps", "data")'), true, '«موظفو الإدارة ← بيانات الموظفين» is open');
    assert.equal(m.ev('KIVO.BassamPerm.subOn("emps", "custody")'), false, '«العهد» (a switchable system) is OFF');
    assert.deepEqual(m.ev('["emps", "admin"].map(function (k) { return KIVO.BassamPerm.can(k, "edit"); })'), [true, true], 'he works in the permanent pages');
    assert.equal(m.ev('KIVO.Perm44.keysFor("emps", "view").some(function (k) { return KIVO.__BS_I.auth.azKey(k, ' + JSON.stringify(r.id) + ') === true; })'), true, 'server: the permanent system\'s keys are held');
    assert.deepEqual(m.ev('KIVO.BassamPerm.capState(' + JSON.stringify(r.id) + ')'), { kind: 'own', independent: false, n: OFF.caps.length, all: OFF.all.length, empty: false });
  } finally { m.dispose(); }
  /* وحدةٌ قائمة بلا سجلّ: كما كانت */
  assert.deepEqual(await seenBy(W, 'open', OP), openBefore, 'an existing unit with no record keeps behaving as before');
  assert.deepEqual(openBefore, FULL);
  const su = await clientOf(W, 'su', OP);
  try { assert.equal(su.ev('KIVO.BassamPerm.capState(' + JSON.stringify(OP) + ').kind'), 'open', 'still «open» (no record written for it)'); assert.equal(su.ev('KIVO.BassamPerm.capState(' + JSON.stringify(A) + ').kind'), 'own'); } finally { su.dispose(); }
  /* المدخلُ القديم لصفحة الإدارة (حفظُ سجلّ الوحدات ثم seedCapFrom(id, pid) بلا اختيار) ⇒ الافتراضيُّ الجديد · وقيمةٌ مجهولة ⇒ 'off' */
  const r2 = await create(W, (c) => { const D = c.K.BassamDepts, id = D.freshId('d'); D.save(D.list().concat([{ id, name: T + 'إدارة بالمدخل القديم', gid: G }])); return Object.assign({ id }, c.P.seedCapFrom(id, G)); });
  assert.equal(r2.seed, 'off'); assert.deepEqual(stored(W.env, KP).caps[r2.id], OFF.caps);
  const r3 = await create(W, (c) => c.K.BassamDepts.deptAdd({ name: T + 'إدارة بقيمة مجهولة', pid: G, seed: 'TEST_ONLY_unknown' }));
  assert.equal(r3.seed, 'off', 'an unknown choice is the most restrictive one'); assert.deepEqual(stored(W.env, KP).caps[r3.id], OFF.caps);
  /* القواعدُ القائمة للإنشاء باقية */
  const bad = await create(W, (c) => [c.K.BassamDepts.deptAdd({ name: '', pid: G }), c.K.BassamDepts.deptAdd({ name: T + 'إدارة جديدة', pid: G }), c.K.BassamDepts.deptAdd({ name: T + 'x', pid: A }), c.K.BassamDepts.deptAdd({ name: T + 'y', pid: T + 'nowhere' })]);
  assert.deepEqual(bad.map((x) => x.ok), [false, false, false, false], 'name required · unique name · a department is not placed under a department · the parent exists');
});

test('V7 · د6 · ب4 — «نفس أنظمة العقدة الأب»: the parent\'s systems as they are (a snapshot); an open parent with no record (or the root) ⇒ everything that is ON on the platform', Object.assign({ timeout: 600000 }, needs(...SYS)), async () => {
  const W = await holdersWorld();
  await applyState(W, 'allOn');
  /* الأبُ G: «الإحصائيات اليومية» مطفأة و«العهد» مطفأ */
  let c = await clientOf(W, 'su', B);
  try { assert.equal(c.I.setDeptCap(G, OFF.all.filter((k) => k !== 'dstats')).ok, true); assert.equal(c.I.setDeptSubs(G, 'emps', ['data']).ok, true); await c.settle(); assert.equal(c.denied(), 0); } finally { c.dispose(); }
  const r = await create(W, (c) => c.K.BassamDepts.unitAdd({ name: T + 'إدارة كأبيها', kind: 'إدارة', pid: G, seed: 'parent' }));
  assert.equal(r.seed, 'parent');
  let pm = stored(W.env, KP);
  assert.deepEqual(pm.caps[r.id], OFF.all.filter((k) => k !== 'dstats'), 'the parent\'s pages'); assert.deepEqual(pm.subs[r.id], { emps: ['data'] }, '… and its OFF section-system');
  await addHolder(W, 'pm', r.id, true);
  assert.deepEqual(await seenBy(W, 'pm', r.id), FULL.filter((k) => k !== 'dstats'), 'its manager sees what a manager of the parent\'s systems sees');
  assert.deepEqual((await srvOn(W, r.id)).slice().sort(), (await srvOn(W, G)).slice().sort(), 'server: the same systems ON as in the parent');
  assert.deepEqual((await heldSystems(W, 'pm', r.id)).slice().sort(), OFF.systems.filter((k) => k !== 'dstats' && k !== 'custody').sort(), 'server keys: every system but the two OFF in the parent');
  /* لقطة: توسيعُ الأب لاحقاً لا يوسّع الابن من تلقاء نفسه */
  c = await clientOf(W, 'su', B);
  try { assert.equal(c.I.setDeptCap(G, OFF.all).ok, true); await c.settle(); assert.equal(c.denied(), 0); } finally { c.dispose(); }
  assert.ok(!(await seenBy(W, 'pm', r.id)).includes('dstats'), 'widening the parent later does not widen the child by itself');
  /* الأبُ المفتوح بلا سجلّ ⇒ كلُّ المفعّل على المنصة — وإطفاءُ المنصة يسري عليه */
  const o = await create(W, (c) => c.K.BassamDepts.unitAdd({ name: T + 'إدارة تحت مفتوح', kind: 'إدارة', pid: NO, seed: 'parent' }));
  pm = stored(W.env, KP);
  assert.deepEqual(pm.caps[o.id], OFF.all, 'open parent: a record with every page'); assert.equal(pm.subs && pm.subs[o.id], undefined, 'nothing OFF ⇒ no sections record');
  assert.equal(Object.prototype.hasOwnProperty.call(pm.caps, NO), false, 'the open parent itself gets no record'); assert.equal(Object.prototype.hasOwnProperty.call(pm.caps, OP), false);
  await addHolder(W, 'om', o.id, true);
  assert.deepEqual(await seenBy(W, 'om', o.id), FULL, 'everything that is ON on the platform');
  await applyState(W, 'platOff');
  assert.deepEqual(await seenBy(W, 'om', o.id), FULL.filter((k) => k !== OFF_PLAT), 'a system OFF on the platform is OFF there too');
  await applyState(W, 'allOn');
  /* عقدةٌ في الجذر بالاختيارين */
  const n1 = await create(W, (c) => c.K.BassamDepts.unitAdd({ name: T + 'قطاع كالمنصة', kind: 'قطاع', pid: null, seed: 'parent' }));
  const n2 = await create(W, (c) => c.K.BassamDepts.nodeAdd({ name: T + 'قطاع مطفأ', kind: 'قطاع', pid: null }));
  pm = stored(W.env, KP);
  assert.deepEqual([n1.seed, n2.seed], ['parent', 'off']);
  assert.deepEqual(pm.caps[n1.id], OFF.all, 'root + «parent» ⇒ every page'); assert.deepEqual(pm.caps[n2.id], OFF.caps, 'a new upper node defaults to OFF as well'); assert.deepEqual(pm.subs[n2.id], OFF.subs);
  /* تحت عقدةٍ مطفأة: «نفس أنظمة الأب» = مطفأة */
  const d2 = await create(W, (c) => c.K.BassamDepts.unitAdd({ name: T + 'إدارة تحت مطفأ', kind: 'إدارة', pid: n2.id, seed: 'parent' }));
  assert.deepEqual(stored(W.env, KP).caps[d2.id], OFF.caps, 'the parent\'s systems are OFF ⇒ the child\'s are');
  await addHolder(W, 'dm2', d2.id, true);
  assert.deepEqual(await seenBy(W, 'dm2', d2.id), PERMANENT);
});

test('V7 · د6 · ب4 — a new section: the same choice and the same default (all OFF); «parent» = its department\'s systems', Object.assign({ timeout: 600000 }, needs(...SYS)), async () => {
  const W = await holdersWorld();
  await applyState(W, 'oneOff');   /* الإدارة أ: «الإحصائيات اليومية» مطفأة */
  const before = stored(W.env, KP);
  const s1 = await create(W, (c) => c.K.BassamDepts.sectionAdd({ name: T + 'قسم جديد', deptId: A }));
  const s2 = await create(W, (c) => c.K.BassamDepts.unitAdd({ name: T + 'قسم كإدارته', kind: 'قسم', pid: A, seed: 'parent' }));
  assert.deepEqual([s1.ok, s1.cap, s1.seed, s2.ok, s2.cap], [true, 'off', 'off', true, 'parent']);
  const pm = stored(W.env, KP);
  assert.deepEqual(pm.caps[s1.id], OFF.caps); assert.deepEqual(pm.subs[s1.id], OFF.subs);
  assert.deepEqual(pm.caps[s2.id], OFF.all.filter((k) => k !== 'dstats'), 'the department\'s systems — never beyond its ceiling');
  assert.deepEqual(others(pm, [s1.id, s2.id]), others(before, []), 'the department, its existing section and every other unit: unchanged');
  await addHolder(W, 'sm1', s1.id, true); await addHolder(W, 'sm2', s2.id, true);
  assert.deepEqual(await seenBy(W, 'sm1', s1.id), PERMANENT, 'the new section\'s manager: the permanent pages alone');
  assert.deepEqual(await heldSystems(W, 'sm1', s1.id), [], 'server keys: nothing of a switchable system');
  assert.deepEqual(await seenBy(W, 'sm2', s2.id), FULL.filter((k) => k !== 'dstats'));
  assert.deepEqual(await seenBy(W, 'sec', A_S1), FULL.filter((k) => k !== 'dstats'), 'the existing section is as it was');
  /* قواعدُ القسم القائمة */
  const bad = await create(W, (c) => [c.K.BassamDepts.sectionAdd({ name: T + 'قسم في الجذر', deptId: '' }), c.K.BassamDepts.sectionAdd({ name: T + 'قسم تحت قسم', deptId: A_S1 }), c.K.BassamDepts.sectionAdd({ name: T + 'قسم جديد', deptId: A })]);
  assert.deepEqual(bad.map((x) => x.ok), [false, false, false]);
  void S;
});

test('V7 · د6 · ب4 — fail-closed: if the systems cannot be set the unit is withdrawn (never left open); the default-structure tool keeps its units ON by an explicit choice', Object.assign({ timeout: 600000 }, needs(...SYS)), async () => {
  const W = await holdersWorld();
  await applyState(W, 'allOn');
  const c = await clientOf(W, 'su', B);
  try {
    const D = c.K.BassamDepts, n0 = D.list().length, g0 = D.nodes().length, real = c.P.seedCapFrom, realS = c.P.seedSectionCap;
    c.P.seedCapFrom = () => ({ ok: false, err: 'TEST_ONLY تعذّر' }); c.P.seedSectionCap = () => ({ ok: false, err: 'TEST_ONLY تعذّر' });
    for (const r of [D.unitAdd({ name: T + 'f1', kind: 'إدارة', pid: G }), D.unitAdd({ name: T + 'f2', kind: 'قطاع', pid: null }), D.unitAdd({ name: T + 'f3', kind: 'قسم', pid: A })]) { assert.equal(r.ok, false); assert.match(r.err, /TEST_ONLY تعذّر/); }
    assert.equal(D.list().length, n0, 'no department or section left behind'); assert.equal(D.nodes().length, g0, 'no node left behind');
    c.P.seedCapFrom = real; c.P.seedSectionCap = realS;
    await c.settle(); assert.equal(c.denied(), 0);
    /* بلا محرّك الأنظمة: البذرُ يرفض ولا يكتب */
    const pm0 = JSON.stringify(c.I.permStore());
    const r = c.ev('(function () { var E = KIVO.Perm44; try { Object.defineProperty(KIVO, "Perm44", { value: null, configurable: true, writable: true }); return KIVO.BassamPerm.seedCapFrom("TEST_ONLY_d6_ghost", null, { seed: "parent" }); } finally { Object.defineProperty(KIVO, "Perm44", { value: E, configurable: true, writable: true }); } })()');
    assert.equal(r.ok, false); assert.equal(JSON.stringify(c.I.permStore()), pm0, 'nothing written without the systems list');
    /* سجلٌّ مسبق لا يُلمس */
    assert.deepEqual(J(c.P.seedCapFrom(A, G, { seed: 'off' })), { ok: true, kept: true }, 'an existing unit\'s record is never rewritten by the seed');
    assert.deepEqual(J(c.P.seedSectionCap(A_S1, A)), { ok: true, kept: true });
    assert.equal(c.P.seedSectionCap(A_S1, B).ok, false, 'not a section of that department');
    /* زرعُ الهيكل الافتراضي: مفعَّلٌ كما كان — بسجلٍّ صريح */
    const s = J(D.seedStructure()); assert.equal(s.ok, true); assert.ok(s.nodes >= 6 && s.depts >= 10, 'the default structure was planted');
    await c.settle(); assert.equal(c.denied(), 0, 'the worker accepted the planted structure');
    const pm = stored(W.env, KP), made = D.nodes().concat(D.list()).filter((x) => !String(x.id).startsWith(T) && !String(x.id).startsWith('tst_') && !Object.prototype.hasOwnProperty.call(JSON.parse(pm0).caps, x.id));
    assert.ok(made.length >= 16);
    for (const x of made) assert.deepEqual(pm.caps[x.id], OFF.all, 'planted «' + x.name + '»: every page ON (explicit record)');
  } finally { c.dispose(); }
});
