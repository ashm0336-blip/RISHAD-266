/* V7 · 53 تقويم (calops · ق١ · الخطر ٤) — مفاتيحُ الأنظمة المرتبطة ميلاديةٌ ISO وحدها في الخادم (TEST_ONLY · المصدرُ الحالي في vm).
   ① المخطّطات (019p0 · 019p1 · 019p2 · 019p3 · 019q): قيمةٌ بمفاتيح ISO (يوم YYYY-MM-DD · شهر YYYY-MM · علامةُ الشهر m:YYYY-MM) تُرمَّز وتُفكّ حرفاً؛
      ومفتاحٌ هجريٌّ من عميلٍ قديمٍ مخبوء (1448-6-14 · 1448-06-14 · m:1448-6 · 1448-6) يُرفض بخطأ المخطّط unknown-map-key — للجولات وأرشيفها
      والتقرير والمهام وأقفالها والجدول الشهري وأقفاله ونسخ أشهر الخطة. وقبل التحويل كانت الأنماط \d{4}-\d{1,2} تقبله (أو المدخلُ العام بلا نمط).
   ② المصنِّفات (006): مفتاحُ يومٍ أو علامةِ شهرٍ هجري في الجولات · شهرٌ هجري في months/delMonths للخطة ⇒ بقيةٌ (residual) تُرفض — والمفتاحُ ISO يُصنَّف فعلاً.
   ③ قاعدةُ الفترة (010): parseDay/parseMonth تفهم ISO وحده، وclosedPeriod بيوم calToday.
   ④ التحقّق المتقاطع (طلب المنسّق): الجولاتُ والمهام (calToday · 016) والأنظمةُ العلائقية (pfDayAt − 3 ساعات · 062b/535) يرون اليومَ التشغيليَّ نفسَه
      لكل لحظة (حول منتصف الليل والثالثة فجراً وحدود الأشهر والسنة)، وقاعدةُ الفترة الواحدة (010 closedPeriod) تعطي للجولات والمهام والعلائقية الجوابَ نفسَه:
      الشهرُ الماضي مقفل · الجاري مفتوح · اليومُ قبل اليوم مقفل — مطابقةً لحكم المهام في الخادم (070b tkPeriodWhy: 12y+m) ولأرشيف الجولات (019p3 dailyArcClosed). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const parts = JSON.parse(read('workers/parts.json')).parts.map((p) => p.file);
const P = (re) => parts.filter((f) => re.test(path.basename(f))).map((f) => 'workers/parts/' + f);

/* ── ① المخطّطات ── */
const O = vm.createContext({});
for (const f of P(/^019[opq]/)) vm.runInContext(read(f), O, { filename: f });
vm.runInContext('var __DEFS = OC_SCHEDULING_RESOURCES.concat(OC_PEOPLE_TASK_RESOURCES);', O);
const PREP = O.ocPrepare(O.__DEFS);
const enc = (res, v) => { const p = O.ocForResource(PREP, res); return JSON.stringify(O.ocInflate(p, O.ocConvert(p, 'TEST_ONLY_D', res, v, true)).value); };
const refuses = (res, v) => { try { enc(res, v); return ''; } catch (e) { return String(e && (e.code || e.message || e)); } };
const DAY = { t: 1, d: [] }, MREC = { ap: 1, dopen: { 24: 1 } }, ROW = ['TEST_ONLY مهمة', '', 'normal', 'pending', 'normal', 'مضافة', null, [], '', 'TEST_ONLY', 60, null, null, 1, null, null, null, null, null, null, null, null];
const BUCKET = { TEST_ONLY_e1: { shift: 'TEST_ONLY_S' } };
const CASES = [
  ['bassam_rounds_v1', { '2026-11-24': DAY, '2026-11-24-r2': DAY, 'm:2026-11': MREC }, [{ '1448-6-14': DAY }, { '1448-06-14': DAY }, { 'm:1448-6': MREC }, { '1448-6-14-r2': DAY }, { '2026-11-4': DAY }]],
  ['bassam_rounds_arc_v1', { '2026-10-01': DAY, 'm:2026-10': MREC }, [{ '1448-4-20': DAY }, { 'm:1448-4': MREC }]],
  ['bassam_dreport_v1', { '2026-11-24': { created: 1 }, 'm:2026-11': { ap: 1 } }, [{ '1448-6-14': { created: 1 } }, { 'm:1448-6': { ap: 1 } }]],
  ['bassam_tasks_v1', { '2026-11-24': [ROW] }, [{ '1448-6-14': [ROW] }, { '1448-06-14': [ROW] }]],
  ['bassam_tasks_locks_v1', { '2026-11': true, '2026-10': { mo: 1 }, '2026-11-24': true }, [{ '1448-6': true }, { '1448-6-14': true }]],
  ['bassam_staffing_v3', { '2026-11': BUCKET }, [{ '1448-6': BUCKET }, { '1448-06': BUCKET }]],
  ['bassam_staffing_locks_v1', { '2026-11': true, '2026-10': { mo: 1 } }, [{ '1448-6': true }]],
  ['bassam_plan_v1', { months: { '2026-11': { c: 1, d: [] } } }, [{ months: { '1448-6': { c: 1, d: [] } } }]],
];
for (const [res, ok, bad] of CASES) {
  test('① ' + res + ': مفاتيح ISO تُقبل حرفاً — والمفتاحُ الهجري من عميلٍ قديم يُرفض في المخطّط', () => {
    assert.equal(enc(res, ok), JSON.stringify(ok), 'ISO round-trip');
    for (const v of bad) assert.match(refuses(res, v), /unknown-map-key|map-key/, res + ' must refuse ' + JSON.stringify(Object.keys(v.months || v)));
  });
}
test('① الجدول الشهري: تقريرُ التعارضات ق٤ (__calq4) عضوٌ ثابت في الشهر الميلادي بجداولَ قائمة', () => {
  const v = { '2026-11': { __shifts: ['TEST_ONLY_S'], __calq4: [JSON.stringify({ e: 'TEST_ONLY_e1', f: 'shift', a: 'أ', b: 'ب', ha: '1448-5', hb: '1448-6', pick: 'b', tie: 0 })], TEST_ONLY_e1: { shift: 'ب' } } };
  assert.equal(enc('bassam_staffing_v3', v), JSON.stringify(v));
});

/* ── ②③④ المصنِّفاتُ وقاعدةُ الفترة والتحقّق المتقاطع ── */
const S = vm.createContext({ console });
for (const f of ['workers/parts/016-base-shared.js', ...P(/^00[46]-|^010-/)]) vm.runInContext(read(f), S, { filename: f });
const pf = vm.createContext({ Intl, Date, Math, JSON, Object, String, Number, Array });
{ const src = read('src/services/535-profile-facts.js'), i = src.indexOf('/* ══ PF-CORE:BEGIN'), j = src.indexOf('/* ══ PF-CORE:END ══ */');
  vm.runInContext(src.slice(i, j), pf, { filename: '535 PF-CORE' }); }   /* النصُّ المشترك نفسُه مع الخادم (062b) */
const resid = (res, a, b) => { const r = S.KIVO_GUARDS.classify(res, a, b, { dept: 'TEST_ONLY_D', actor: { id: 'u', ekey: 'e', role: 'staff' } }); return JSON.parse(JSON.stringify(r.residual.map((x) => x.note))); };

test('② المصنِّف: مفتاحٌ هجري في الجولات وفي أشهر الخطة بقيةٌ تُرفض — وISO يُصنَّف فعلاً', () => {
  assert.deepEqual(resid('bassam_rounds_v1', {}, { '2026-11-24': DAY }), [], 'ISO day classified');
  assert.deepEqual(resid('bassam_rounds_v1', {}, { 'm:2026-11': { ap: 1 } }), [], 'ISO month mark classified');
  assert.deepEqual(resid('bassam_rounds_v1', {}, { '1448-6-14': DAY }), ['unknown-root-key']);
  assert.deepEqual(resid('bassam_rounds_v1', {}, { 'm:1448-6': { ap: 1 } }), ['unknown-root-key']);
  assert.deepEqual(resid('bassam_plan_v1', {}, { months: { '2026-11': { c: 1, d: [] } } }), []);
  assert.deepEqual(resid('bassam_plan_v1', {}, { months: { '1448-6': { c: 1, d: [] } } }), ['bad-month-key']);
  assert.deepEqual(resid('bassam_plan_v1', {}, { delMonths: { '1448-6': 1 } }), ['bad-month-key']);
  assert.deepEqual(resid('bassam_plan_v1', {}, { delMonths: { '2026-11': 1 } }), []);
});

test('③ قاعدةُ الفترة: ISO وحده يُفهم يوماً وشهراً', () => {
  const H = S.KIVO_SCOPE._h;
  assert.deepEqual(JSON.parse(JSON.stringify(H.parseDay('2026-11-24'))), { y: 2026, m: 11, d: 24 });
  assert.deepEqual(JSON.parse(JSON.stringify(H.parseMonth('m:2026-11'))), { y: 2026, m: 11, d: null });
  for (const k of ['1448-6-14', '1448-06-14', '2026-11-4', '2026-13-01']) assert.equal(H.parseDay(k), null, k);
  for (const k of ['m:1448-6', '1448-6', '2026-1']) assert.equal(H.parseMonth(k), null, k);
});

test('④ التحقّق المتقاطع: اليومُ التشغيلي وحكمُ الفترة واحدٌ للجولات والمهام والأنظمة العلائقية', () => {
  const H = S.KIVO_SCOPE._h, hr = 36e5, at = [];
  /* حدودٌ حرجة (توقيت الرياض): قبل منتصف الليل وبعده، قبل الثالثة وبعدها، أولُ الشهر وآخرُه، ورأسُ السنة */
  for (const iso of ['2026-11-24', '2026-11-30', '2026-12-01', '2026-12-31', '2027-01-01', '2028-02-29', '2028-03-01'])
    for (const h of [-1, 0, 1, 2.99, 3, 3.01, 12, 23.99]) at.push(Date.parse(iso + 'T00:00:00+03:00') + h * hr);
  for (const now of at) {
    const T = S.calToday(now), R = pf.pfDayAt(now - 3 * hr);
    assert.deepEqual([T.y, T.m, T.d], [R.y, R.m, R.d], 'same operational day at ' + new Date(now).toISOString());
    const prev = S.calGAddMonths(T.ym, -1).split('-').map(Number), next = S.calGAddMonths(T.ym, 1).split('-').map(Number);
    const tkPast = (y, m) => 12 * y + m < 12 * T.y + T.m;                                          /* 070b tkPeriodWhy */
    const arcClosed = (y, m) => (y * 12 + m) <= (T.y * 12 + T.m) - 2;                               /* 019p3 dailyArcClosed (هامشُ شهر) */
    assert.equal(H.closedPeriod(T, prev[0], prev[1], null), true, 'previous month closed');
    assert.equal(tkPast(prev[0], prev[1]), true);
    assert.equal(H.closedPeriod(T, T.y, T.m, null), false, 'current month open');
    assert.equal(tkPast(T.y, T.m), false);
    assert.equal(H.closedPeriod(T, next[0], next[1], null), false, 'next month open');
    assert.equal(arcClosed(prev[0], prev[1]), false, 'the previous month stays live (not archived)');
    if (T.d > 1) assert.equal(H.closedPeriod(T, T.y, T.m, T.d - 1), true, 'yesterday closed');
    assert.equal(H.closedPeriod(T, T.y, T.m, T.d), false, 'today open');
  }
});
