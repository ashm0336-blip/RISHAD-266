/* V7 · د5-هـ (t4) — الجولاتُ تُطابَق بمعرّف الموقع sid لا بترتيبه، بترحيلٍ مختبَر على بيانات TEST_ONLY (قبل/بعد، صفاً صفاً).
   ① الترحيل = مجموعةُ كتابة sid من محرّك ترحيل الهوية (KIVO_IDENTITY_MIGRATION.sidMigration ← rehearse · tier A): طوابقُ الخطة بلا sid (IP‑01) ·
      لقطةُ الشهر الجاري (IP‑02) · طوابقُ الجولات exact/high. medium معلَّق · ambiguous/unlinked لا تُمسّ — وكلُّها مُبلَّغٌ عنها صفاً صفاً.
   ② الإعادةُ على الناتج لا تغيّر شيئاً (متساوي الأثر) — ببذرةٍ أخرى أيضاً.
   ③ بعد إعادة ترتيب مواقع الخطة: المطابقةُ (KIVO.BassamRound.siteAt) تتبع sid — والمطابقةُ الموضعية القديمة تخطئ (تُعرض).
   ④ الرجوعُ (sidRollback) يعيد القيمةَ السابقة حرفاً، ويرفض إن تغيّر sid مكتوب (drift).
   ⑤ أوامرُ الجولات (حذفُ موقع · إكمالُ المواقع) وإنشاءُ يومٍ من لقطةٍ بلا sid: بالمعرّف لا بالموضع. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const copy = (v) => JSON.parse(JSON.stringify(v));
const J = (v) => JSON.stringify(v);

/* ── المحرّك كما يُبنى في العامل (الجزء 014 المولَّد: البياناتُ + المحرّك) ── */
function engine() {
  const ctx = vm.createContext({ KIVO_SCOPE: {}, KIVO_REGISTRY: {} });
  vm.runInContext(rd('workers/parts/014-identity-migration-2.js'), ctx);
  return ctx.KIVO_IDENTITY_MIGRATION;
}
/* ── مصنعُ الجولات وروابطُه (عميل) ── */
function client(store = {}) {
  const KIVO = { __BS_SRV: { operations: { get: (k) => (k in store ? copy(store[k]) : null) } }, BassamPerm: { lensOn: () => true } };
  const ctx = vm.createContext({ KIVO, console, Intl, Date, Math, JSON, Object, Array, Error, String });
  vm.runInContext(rd('src/i18n/385-calendar.js'), ctx);
  vm.runInContext(rd('src/core/060-bus.js'), ctx);
  vm.runInContext(rd('src/systems/daily/client/420-round-factory.js'), ctx);
  vm.runInContext(rd('src/systems/daily/client/421-round-links.js'), ctx);
  vm.runInContext(rd('src/systems/plan/client/404-plan-p4.js'), ctx);
  return { KIVO, bus: KIVO.bus, R: KIVO.BassamRound };
}

/* ── بياناتُ TEST_ONLY: مواقعُ بهندسةٍ متمايزة (مصلّى + 10 أبواب لكل موقع) ── */
const DEPT = 'TEST_ONLY_D5E_T4';
const SEED = 'ab'.repeat(32), SEED2 = 'cd'.repeat(32), TODAY = { y: 1448, m: 2, d: 10 };
function site(tag, k, { sid, move = 0, name } = {}) {
  const gates = [];
  for (let j = 0; j < 10; j++) gates.push({ num: tag + j, x: 100 * k + 7 * j + (j < move ? 500 : 0), y: 50 + 3 * j });
  const f = { name: name || 'TEST_ONLY ' + tag, num: k, zones: [{ code: 'TEST_ONLY_Z' + tag, d: 'M' + 100 * k + ' 0 L' + (100 * k + 50) + ' 0 L' + (100 * k + 50) + ' 40 Z' }], gates, marks: [], paths: [] };
  if (sid) f.sid = sid;
  return f;
}
const day = (floors) => ({ t: 1, ap: 0, d: floors.map((f) => { const o = copy(f); delete o.name; delete o.num; return o; }) });
/* الخطة الآن: أُعيد ترتيبُ مواقعها (B قبل A) · E أُضيف بلا sid · X (s_TEST_ONLY_X) حُذف */
function fixture() {
  const A = (o) => site('A', 1, { sid: 's_TEST_ONLY_A', ...o }), B = (o) => site('B', 2, { sid: 's_TEST_ONLY_B', ...o }), C = (o) => site('C', 3, { sid: 's_TEST_ONLY_C', ...o });
  const E = (o) => site('E', 4, o), X = (o) => site('X', 5, { sid: 's_TEST_ONLY_X', ...o });
  const bare = (f) => { const o = copy(f); delete o.sid; return o; };
  const plan = { floors: [B(), A(), C(), E()], months: { '1448-2': { c: 1, d: [bare(B()), bare(A()), bare(C()), bare(E())] } } };
  const rounds = {
    'm:1448-2': { ap: 0 },
    /* أُنشئ قبل إعادة الترتيب بمعرّفاته (IP‑03): A,B,C */
    '1448-2-1': day([A(), B(), C()]),
    /* قديمٌ بلا معرّفات قبل إعادة الترتيب: A,B,C — A وB في غير موضعهما الآن ⇒ ambiguous · C exact */
    '1448-2-2': day([bare(A()), bare(B()), bare(C())]),
    /* قديمٌ بلا معرّفات بترتيب الخطة الحالي B,A,C,E — كلُّه exact (E يأخذ sid الخطة المولَّد IP‑01) */
    '1448-2-3': day([bare(B()), bare(A()), bare(C()), bare(E())]),
    /* موقعٌ محذوف بمعرّفه (X) + طابقٌ زائدٌ بلا sid بعد آخر موقع ⇒ unlinked · B بمعرّفه exact */
    '1448-2-4': day([B(), X(), bare(C()), bare(E()), bare(site('Q', 6))]),
    /* B بعد تحريك باب (high) · A بعد تحريك 3 أبواب (medium ⇒ معلَّق) · C بعد تحريك 4 (unlinked) · E فارغ (medium) */
    '1448-2-5': day([bare(B({ move: 1 })), bare(A({ move: 3 })), bare(C({ move: 4 })), { zones: [], gates: [], marks: [], paths: [] }]),
  };
  return { plan, rounds };
}
const input = (plan, rounds) => ({ depts: [{ id: DEPT, name: 'TEST_ONLY dept' }], users: [], byDept: { [DEPT]: { plan, rounds, employees: [] } } });
const hooks = (seed) => ({ seed, today: TODAY, now: 0 });
const keyOf = (r) => 'bsdept:' + DEPT + ':' + r;

/* المتوقَّع صفاً صفاً: [الحاوية, المفتاح, الموضع, sid قبل, التصنيف, الإجراء] — sid بعد = قبل أو sid موقع الخطة المذكور */
const EXPECT = [
  ['snapshot', '1448-2', 0, null, 'exact', 'assigned', 'B'],
  ['snapshot', '1448-2', 1, null, 'exact', 'assigned', 'A'],
  ['snapshot', '1448-2', 2, null, 'exact', 'assigned', 'C'],
  ['snapshot', '1448-2', 3, null, 'exact', 'assigned', 'E'],
  ['rounds', '1448-2-1', 0, 's_TEST_ONLY_A', 'exact', 'kept', 'A'],
  ['rounds', '1448-2-1', 1, 's_TEST_ONLY_B', 'exact', 'kept', 'B'],
  ['rounds', '1448-2-1', 2, 's_TEST_ONLY_C', 'exact', 'kept', 'C'],
  ['rounds', '1448-2-2', 0, null, 'ambiguous', 'left', null],
  ['rounds', '1448-2-2', 1, null, 'ambiguous', 'left', null],
  ['rounds', '1448-2-2', 2, null, 'exact', 'assigned', 'C'],
  ['rounds', '1448-2-3', 0, null, 'exact', 'assigned', 'B'],
  ['rounds', '1448-2-3', 1, null, 'exact', 'assigned', 'A'],
  ['rounds', '1448-2-3', 2, null, 'exact', 'assigned', 'C'],
  ['rounds', '1448-2-3', 3, null, 'exact', 'assigned', 'E'],
  ['rounds', '1448-2-4', 0, 's_TEST_ONLY_B', 'exact', 'kept', 'B'],
  ['rounds', '1448-2-4', 1, 's_TEST_ONLY_X', 'unlinked', 'kept', 'X'],
  ['rounds', '1448-2-4', 2, null, 'exact', 'assigned', 'C'],
  ['rounds', '1448-2-4', 3, null, 'exact', 'assigned', 'E'],
  ['rounds', '1448-2-4', 4, null, 'unlinked', 'left', null],
  ['rounds', '1448-2-5', 0, null, 'high', 'assigned', 'B'],
  ['rounds', '1448-2-5', 1, null, 'medium', 'pending', null],
  ['rounds', '1448-2-5', 2, null, 'unlinked', 'left', null],
  ['rounds', '1448-2-5', 3, null, 'medium', 'pending', null],
];
const containerOf = (c, key) => (c === 'snapshot' ? (v) => v.plan.months[key].d : (v) => v.rounds[key].d);

test('① الترحيل: مجموعةُ كتابة sid من tier A — صفاً صفاً (قبل/بعد مع التصنيف)', () => {
  const E = engine(), { plan, rounds } = fixture(), before = { plan: copy(plan), rounds: copy(rounds) };
  const M = E.sidMigration(input(plan, rounds), hooks(SEED));
  assert.equal(J(plan), J(before.plan), 'المدخلُ لا يُعدَّل'); assert.equal(J(rounds), J(before.rounds));
  const K = Object.fromEntries(M.keys.map((k) => [k.key, k]));
  const after = { plan: K[keyOf('bassam_plan_v1')].after, rounds: K[keyOf('bassam_rounds_v1')].after };
  /* sid موقع الخطة بعد الترحيل بالاسم: E يُمنح sid حتمياً (IP‑01) */
  const planSid = Object.fromEntries(after.plan.floors.map((f) => [f.name.replace('TEST_ONLY ', ''), f.sid]));
  planSid.X = 's_TEST_ONLY_X';
  assert.match(planSid.E, /^s_[0-9a-z]{14}$/, 'IP‑01: sid للموقع E'); assert.equal(before.plan.floors[3].sid, undefined);
  assert.equal(J(K[keyOf('bassam_plan_v1')].ops.map((o) => o.p)), J(['floors[3].sid', 'months.1448-2.d[0].sid', 'months.1448-2.d[1].sid', 'months.1448-2.d[2].sid', 'months.1448-2.d[3].sid']));
  assert.ok(M.keys.every((k) => k.ops.every((o) => o.op === 'set' && /\.sid$/.test(o.p))), 'عملياتُ sid وحدها (لا uid · لا emp)');
  /* الجدول */
  const lines = ['dept | container | key | idx | sid before | class | action | sid after | basis'];
  const rows = M.rows.filter((r) => r.dept === DEPT);
  assert.equal(rows.length, EXPECT.length, 'كلُّ طابقٍ في اللقطات والجولات له صف');
  EXPECT.forEach(([c, key, idx, sb, cls, action, target], n) => {
    const r = rows[n], get = containerOf(c, key);
    assert.equal(J([r.container, r.key, r.idx]), J([c, key, idx]), 'ترتيبُ الصفوف #' + n);
    const fb = get(before)[idx], fa = get(after)[idx], sa = fa.sid == null ? null : fa.sid;
    assert.equal(fb.sid == null ? null : fb.sid, sb, 'sid قبل ' + key + '[' + idx + ']');
    assert.equal(r.cls, cls, 'التصنيف ' + key + '[' + idx + ']'); assert.equal(r.action, action, 'الإجراء ' + key + '[' + idx + ']');
    assert.equal(sa, target ? planSid[target] : null, 'sid بعد ' + key + '[' + idx + ']');
    if (action === 'assigned') assert.equal(r.sid, sa); else assert.equal(J(fa), J(fb), 'طابقٌ لم يُكتب لا يتغيّر فيه شيء');
    const { sid: _a, ...ra } = fa, { sid: _b, ...rb } = fb; assert.equal(J(ra), J(rb), 'لا يتغيّر إلا sid');
    lines.push([DEPT, c, key, idx, sb || '—', cls, action, sa || '—', r.basis].join(' | '));
  });
  console.log('\n' + lines.join('\n') + '\n');
  /* المعلَّقُ (medium) مُبلَّغٌ ولا يُكتب */
  assert.equal(J(M.pending.map((x) => x.p).sort()), J(['1448-2-5.d[1].sid', '1448-2-5.d[3].sid']));
  assert.equal(M.rollbackVerified, true); assert.equal(M.gates.duplicateSid, 0); assert.equal(M.gates.ambiguousAutoMaps, 0);
  assert.equal(M.ops, 5 + 8, 'الخطة 5 (IP‑01 واحدة + اللقطة 4) · الجولات 8');
});

test('② متساوي الأثر: الإعادةُ على الناتج (بالبذرة نفسِها وبغيرها) لا تجد عملية · والتصنيفُ نفسُه', () => {
  const E = engine(), { plan, rounds } = fixture();
  const M1 = E.sidMigration(input(plan, rounds), hooks(SEED)), K = Object.fromEntries(M1.keys.map((k) => [k.key, k]));
  const p1 = K[keyOf('bassam_plan_v1')].after, r1 = K[keyOf('bassam_rounds_v1')].after;
  assert.equal(J(E.sidMigration(input(plan, rounds), hooks(SEED)).keys), J(M1.keys), 'حتمي بالبذرة');
  for (const seed of [SEED, SEED2]) {
    const M2 = E.sidMigration(input(copy(p1), copy(r1)), hooks(seed));
    assert.equal(M2.ops, 0, 'لا عمليةَ في الإعادة'); assert.equal(M2.keys.length, 0);
    assert.equal(M2.rows.length, M1.rows.length);
    M1.rows.forEach((a, n) => {
      const b = M2.rows[n], want = a.action === 'assigned' ? ['exact', 'kept'] : [a.cls, a.action];
      assert.equal(J([b.key, b.idx, b.cls, b.action]), J([a.key, a.idx].concat(want)), 'الإعادة ' + a.key + '[' + a.idx + ']');
    });
  }
});

test('③ بعد إعادة ترتيب الخطة: المطابقةُ تتبع sid — والموضعيةُ القديمة تخطئ', () => {
  const E = engine(), { plan, rounds } = fixture(), { R } = client();
  const K = Object.fromEntries(E.sidMigration(input(plan, rounds), hooks(SEED)).keys.map((k) => [k.key, k]));
  const P = K[keyOf('bassam_plan_v1')].after, D = K[keyOf('bassam_rounds_v1')].after;
  const zone = (f) => (f ? f.zones[0].code : null), oldAt = (list, f) => list[f];   /* القديم: طابقُ اليوم بموضع الموقع في قائمة الخطة */
  const lines = ['plan idx | plan site | day | sid match → day idx | content by sid | content by position (old)'];
  for (const key of ['1448-2-1', '1448-2-2', '1448-2-3', '1448-2-4']) {
    P.floors.forEach((pf, f) => {
      const i = R.siteAt(D[key].d, P.floors, f), bySid = i >= 0 ? D[key].d[i] : null, byPos = oldAt(D[key].d, f);
      if (bySid) { assert.equal(bySid.sid, pf.sid); assert.equal(zone(bySid), zone(pf), key + ': المحتوى المطابَق بالمعرّف هو الموقعُ نفسُه'); }
      lines.push([f, pf.name, key, i, zone(bySid) || 'غير مربوط', zone(byPos) || '—'].join(' | '));
    });
  }
  console.log('\n' + lines.join('\n') + '\n');
  /* الجولة 1448-2-1 (A,B,C بمعرّفاتها) بعد أن صار B أولاً: القديم يعرض A مكان B */
  assert.equal(R.siteAt(D['1448-2-1'].d, P.floors, 0), 1); assert.equal(zone(oldAt(D['1448-2-1'].d, 0)), 'TEST_ONLY_ZA');
  assert.notEqual(zone(oldAt(D['1448-2-1'].d, 0)), zone(P.floors[0]), 'الموضعيةُ القديمة تخطئ بعد إعادة الترتيب');
  /* الجولة القديمة الملتبسة (A,B بلا معرّف): لا تُطابَق بالموضع — غير مربوطة صراحةً */
  assert.equal(R.siteAt(D['1448-2-2'].d, P.floors, 0), -1); assert.equal(R.siteAt(D['1448-2-2'].d, P.floors, 1), -1);
  assert.equal(J(R.unlinked(D['1448-2-2'].d)), J([0, 1])); assert.equal(R.siteAt(D['1448-2-2'].d, P.floors, 2), 2);
  /* بيانات بمعرّفاتٍ في كل مكانٍ وبالترتيب نفسِه: النتيجةُ نفسُها كالموضع (لا تغيّر سلوك) */
  P.floors.forEach((pf, f) => assert.equal(R.siteAt(D['1448-2-3'].d, P.floors, f), f));
  /* بلا مواقع خطة (غيابُها): الطابقُ f من اليوم نفسِه */
  assert.equal(R.siteAt(D['1448-2-1'].d, null, 2), 2); assert.equal(R.siteAt(D['1448-2-1'].d, [], 5), -1);
});

test('④ الرجوع يعيد القيمةَ السابقة حرفاً — ويرفض إن تغيّر sid مكتوب (drift)', () => {
  const E = engine(), { plan, rounds } = fixture(), before = { [keyOf('bassam_plan_v1')]: copy(plan), [keyOf('bassam_rounds_v1')]: copy(rounds) };
  const M = E.sidMigration(input(plan, rounds), hooks(SEED));
  for (const k of M.keys) {
    assert.equal(k.beforeSha256, E.sha256Hex(J(before[k.key])));
    const back = E.sidRollback(k.after, k);
    assert.equal(J(back), J(before[k.key]), 'الرجوعُ = القيمةُ السابقة حرفاً: ' + k.key);
    assert.equal(E.sha256Hex(J(back)), k.beforeSha256);
    assert.equal(k.roundTrip, true);
    const drifted = copy(k.after), o = k.ops[k.ops.length - 1];
    let cur = drifted; for (const s of o.path.slice(0, -1)) cur = cur[s]; cur.sid = 's_TEST_ONLY_CHANGED';
    assert.throws(() => E.sidRollback(drifted, k), /drift/, 'لا رجوعَ فوق تغيّرٍ لاحق');
  }
});

test('⑤ أوامرُ الجولات وإنشاءُ اليوم: بالمعرّف لا بالموضع', () => {
  const { bus, R, KIVO } = client(), now = KIVO.BassamCal.gAt(new Date()), next = KIVO.BassamCal.gKey(now.y + 1, 1, 1), past = KIVO.BassamCal.gKey(now.y - 1, 1, 1);   /* V7 · 53 تقويم: يومُ الرياض الميلادي ومفاتيح ISO */
  const s = (id) => ({ sid: id, zones: [{ code: 'TEST_ONLY_' + id }], gates: [], marks: [], paths: [] });
  const store = { bassam_rounds_v1: { [next]: { d: [s('A'), s('B'), { zones: [], gates: [], marks: [], paths: [] }] }, [past]: { d: [s('B'), s('A')] } } };
  /* حذفُ الموقع B (موضعُه في الخطة 0 بعد إعادة الترتيب) — بمعرّفه من كل يوم؛ الطابقُ بلا sid لا يُمسّ ويُعدّ */
  const got = {}, r = bus.call('daily.site.remove@1', { index: 0, sid: 'B' }, { get: (k) => copy(store[k]), set: (k, v) => (got[k] = v) });
  assert.equal(r.ok, 1); assert.equal(r.unlinked, 1);
  assert.deepEqual(got.bassam_rounds_v1[next].d.map((f) => f.sid || null), ['A', null]);
  /* V7 · د7 (planprove · رد المالك 52 §2): اليومُ الماضي لا يُمسّ (قاعدةُ sites.patch/pad) — كان يُحذف منه B فيرفض الخادمُ الحفظَ بـlocked-period */
  assert.deepEqual(got.bassam_rounds_v1[past].d.map((f) => f.sid), ['B', 'A'], 'الماضي لا يُمسّ');
  /* إكمالُ المواقع: يُلحق ما لا يحمل اليومُ معرّفَه (C) — لا بالعدد (كان يُلحق sites[2] = A مكرَّراً) */
  const got2 = {}, r2 = bus.call('daily.sites.pad@1', { sites: [{ sid: 'B' }, { sid: 'A' }, { sid: 'C' }] }, { get: (k) => copy(store[k]), set: (k, v) => (got2[k] = v) });
  assert.equal(r2.changed, true); assert.deepEqual(got2.bassam_rounds_v1[next].d.map((f) => f.sid || null), ['A', 'B', null, 'C']);
  assert.deepEqual(got2.bassam_rounds_v1[past].d.map((f) => f.sid), ['B', 'A'], 'الماضي لا يُمسّ');
  /* بيانات بمعرّفاتٍ متّسقة: الإكمالُ كما كان حرفاً */
  const aligned = { bassam_rounds_v1: { [next]: { d: [s('A'), s('B')] } } }, got3 = {};
  bus.call('daily.sites.pad@1', { sites: [{ sid: 'A' }, { sid: 'B' }, { sid: 'N' }] }, { get: (k) => copy(aligned[k]), set: (k, v) => (got3[k] = v) });
  assert.equal(J(got3.bassam_rounds_v1[next].d[2]), J({ zones: [], gates: [], marks: [], paths: [], sid: 'N' }));
  /* إنشاءُ يومٍ من لقطة شهرٍ طابقُها الثاني بلا sid: لا يُحلّ موضعياً من plan.floors[1] — يبقى غيرَ مربوط */
  const c2 = client({ bassam_plan_v1: { floors: [{ sid: 'P0' }, { sid: 'P1' }], months: { '2026-11': { d: [{ sid: 'P0', zones: [], gates: [] }, { zones: [], gates: [] }] } } }, bassam_rounds_v1: {} });
  const draft = { v: {}, get: (k) => (k in draft.v ? draft.v[k] : c2.KIVO.__BS_SRV.operations.get(k)), set: (k, v) => (draft.v[k] = v) };
  const made = c2.R.prepareEnsure(draft, 2026, 11, 1);   /* V7 · 53 تقويم: شهرٌ ميلادي ومفتاحٌ ISO */
  assert.equal(made.status, 'created');
  assert.deepEqual(draft.v.bassam_rounds_v1['2026-11-01'].d.map((f) => f.sid === undefined ? null : f.sid), ['P0', null]);
});
