/* KIVO_265 · صفحةُ المهام بتصميمها المعتمد للإنتاج (طلبُ المالك 2026-10-20) — logic.js وأجزاؤه في vm بلا خادم وبساعةٍ ثابتة:
     · شريطُ الأيام (tkDays · _tkDayStrip) واليومُ الافتراضي = اليومُ الجاري في الشهر الجاري (_tkDayDef) · رأسُ كرت اليوم (tkDayTitle/Sub/Count)
       · اختيارُ يومٍ آخر و«الشهر كاملاً» / «عرض اليوم» (tkDaySel {k:"y-m", d})
     · الأحدثُ إدخالاً أولاً داخل اليوم (العمود 13) · وفي الشهر كاملاً أقسامُ الأيام (_tkDayHeads) وطيُّها (tkDayClosed)
     · «أوسمة اليوم» الخمسة (_tkDayKpis) وهندسةُ العلامات (_tkTicks) وحلقةُ الزمن (أسرع/أبطأ/بلا مخطط) · وتصفيةُ الجدول بالمؤشر (tkKf لليوم نفسِه)
     · قفلُ اليوم في bassam_tasks_locks_v1 بمفاتيح «y-m-d» ({mo:1} مفتوحٌ بأثر رجعي · true مُغلقٌ بيده) — والمنقضي مقفلٌ تلقائياً · اعتمادُ الشهر يقفل الكل
       · delMonthDo يحذف مفاتيحَ أيام الشهر · وعمودُ «الوردية» من الجدول الشهري (_tkShiftCell).
   الساعةُ ثابتةٌ (ظهرُ 2026-10-20 بتوقيت الجهاز = الثلاثاء 9 جمادى الأولى 1448 هـ) فالأيامُ والقيمُ حتميةٌ مهما كان يومُ التشغيل. بياناتٌ اصطناعية (TEST_ONLY). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { ROOT, moduleLogic } from './harness.mjs';
import { row, ME, MATE } from './tasks_fx.mjs';

const LOGIC = moduleLogic('tasks');
const NOW = new Date(2026, 9, 20, 12, 0, 0).getTime(), MIN = 6e4, H = 36e5;
const Y = 1448, M = 5, TD = 9, SK = Y + '-' + M, K = (d, m = M) => Y + '-' + m + '-' + d;
const MN = 'جمادى الأولى';
const P1 = '0.62 0.38', rep = (k, p = P1) => Array(k).fill(p).join(' ');
const LOCKS = 'bassam_tasks_locks_v1';
const EMPS = [{ eid: ME.eid, name: ME.name, work: 'TEST_ONLY مراقب' }, { eid: MATE.eid, name: MATE.name, work: 'TEST_ONLY مراقب' }];

/* صفحةُ المهام لمدير الإدارة بكل الصلاحيات — والساعةُ داخل vm ثابتة (Date.now و new Date() = NOW) */
function page(store) {
  const KIVO = {}, toasts = [];
  class FDate extends Date { constructor(...a) { if (a.length) super(...a); else super(NOW); } static now() { return NOW; } }
  const ctx = { KIVO, console, Intl, Date: FDate, Math, JSON, Promise, Object, Array, String, Number, RegExp, Set, Map, Error, isNaN, parseInt, setTimeout: () => 0, clearTimeout: () => 0, setInterval: () => 0, clearInterval: () => 0,
    localStorage: { getItem: (k) => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    document: { hidden: false, querySelector: () => null, addEventListener: () => {}, removeEventListener: () => {} }, navigator: { userAgent: 'node' }, addEventListener: () => {}, removeEventListener: () => {},
    __BS_BOOT: { srv: 0 }, fetch: () => Promise.reject(new Error('offline')) };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ['src/services/490-emp-key.js', 'src/services/440-count.js', 'src/services/060-percent-format.js', 'src/services/546-task-model.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
  KIVO.BassamPerm = { can: () => true, on: () => true };
  KIVO.BassamAuth = { user: () => ({ id: 'tst_dm1', role: 'staff', mgr: true, ekey: 'mgr:tst_d1', deptId: 'tst_d1', name: 'TEST_ONLY مدير' }), display: () => ({ name: 'TEST_ONLY مدير' }), users: () => [] };
  KIVO.BassamDepts = { active: () => 'tst_d1' }; KIVO.BassamSup = { isSup: () => false };
  KIVO.BassamFind = { dig: (v) => String(v == null ? '' : v), filter: (q, list, f) => list.filter((r) => f(r).some((x) => String(x == null ? '' : x).indexOf(q) >= 0)) };
  class DCLogic { constructor() { this.state = {}; } setState(p, cb) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); cb && cb(); } }
  ctx.DCLogic = DCLogic;
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/components/565-page-kit.js'), 'utf8'), ctx);
  const B0 = KIVO.BassamPageKit.base; KIVO.BassamPageKit.base = (B, a) => class extends B0(B, a) { bsOn() { return true; } bsToast(m, k) { toasts.push([m, k || 'err']); } };
  vm.runInContext(LOGIC + '\n;globalThis.__C = Component;', ctx, { filename: 'tasks/logic.js' });
  const c = new ctx.__C();
  c.bsToast = (m, k) => toasts.push([m, k || 'err']);
  c.setState({ perPage: 0 });
  return { c, toasts, store, KIVO, V: () => c.renderVals() };
}
const rv = { v: 1, rv: { u: 'tst_dm1', e: 'mgr:tst_d1', n: 'TEST_ONLY مدير' } };
const withX = (r, x) => { r[22] = null; r[23] = x; return r; };
/* اليومُ الجاري (9): ثماني مهام بحالاتٍ معروفة — ترتيبُ المخزن غيرُ ترتيب الإدخال (العمود 13 = وقتُ الإدخال)
   A منجزةٌ في الوقت (فعلي 60 / مخطط 90) · B منجزةٌ مبكرة (30/60) · C منجزةٌ متأخرة (120/30) · D متأخرةٌ عن المهلة · E انقضت بلا قبول (عامة)
   F و G بانتظار الاعتماد (سُلّمتا قبل 150 و30 دقيقة) · H قادمةٌ عامة */
const ID = { A: NOW - 8 * H, B: NOW - 1 * H, C: NOW - 6 * H, D: NOW - 2 * H, E: NOW - 7 * H, F: NOW - 3 * H, G: NOW - 30 * MIN, H: NOW - 4 * H,
  Y1: NOW - 30 * H, Y2: NOW - 28 * H, Z1: NOW - 52 * H, P: NOW - 20 * 24 * H };
const TODAY = [
  row({ id: ID.A, title: 'A منجزة في الوقت', eid: ME.eid, st: 'done', perf: ['on_time', 'في الوقت'], acc: NOW - 3 * H, fin: NOW - 2 * H, dur: 90, s: NOW - 3 * H, e: NOW - 1.5 * H }),
  row({ id: ID.B, title: 'B منجزة مبكرة', eid: MATE.eid, st: 'done', perf: ['early', 'مبكر بـ 30 د'], acc: NOW - 5 * H, fin: NOW - 4.5 * H, dur: 60, s: NOW - 5 * H, e: NOW - 4 * H }),
  row({ id: ID.C, title: 'C منجزة متأخرة', eid: ME.eid, st: 'done', perf: ['late', 'متأخر 1 س 30 د'], acc: NOW - 6 * H, fin: NOW - 4 * H, dur: 30, s: NOW - 6 * H, e: NOW - 5.5 * H }),
  row({ id: ID.D, title: 'D متأخرة عن المهلة', eid: ME.eid, st: 'in_progress', acc: NOW - 3 * H, dur: 60, s: NOW - 3 * H, e: NOW - 2 * H }),
  row({ id: ID.E, title: 'E انقضت بلا قبول', wt: 'TEST_ONLY مراقب', s: NOW - 8 * H, e: NOW - 6 * H }),
  withX(row({ id: ID.F, title: 'F بانتظار الاعتماد (الأقدم)', eid: MATE.eid, st: 'in_progress', acc: NOW - 4 * H, dur: 600, s: NOW - 4 * H, e: NOW + 6 * H, r21: { imgs: [], note: 'TEST_ONLY تم', sub: NOW - 150 * MIN, at: NOW - 150 * MIN } }), rv),
  withX(row({ id: ID.G, title: 'G بانتظار الاعتماد', eid: ME.eid, st: 'in_progress', acc: NOW - 2 * H, dur: 600, s: NOW - 2 * H, e: NOW + 8 * H, r21: { imgs: [], note: 'TEST_ONLY تم', sub: NOW - 30 * MIN, at: NOW - 30 * MIN } }), rv),
  row({ id: ID.H, title: 'H قادمة عامة', s: NOW + 1 * H, e: NOW + 3 * H }),
];
/* أمس (8): Y1 بانتظار القبول · Y2 منجزةٌ أسرع من المخطط (60 / 120 — فوق 96 دقيقة فتُقاس الحلقة) */
const YDAY = [
  row({ id: ID.Y1, title: 'Y1 أمس بانتظار القبول', eid: ME.eid, s: NOW - 20 * H, e: NOW + 30 * H }),
  row({ id: ID.Y2, title: 'Y2 أمس منجزة أسرع', eid: MATE.eid, st: 'done', perf: ['on_time', 'في الوقت'], acc: NOW - 26 * H, fin: NOW - 25 * H, dur: 120, s: NOW - 26 * H, e: NOW - 24 * H }),
];
/* اليوم 7: Z1 منجزةٌ بلا مدةٍ مخططة (فعلي 30) · Z0 صفٌّ قديم الشكل (15 عموداً) بلا وقت إدخال */
const Z0 = ['TEST_ONLY Z0 قديمة بلا وقت إدخال', '', 'normal', 'pending', 'normal', 'مضافة', null, [], '', 'TEST_ONLY مدير', 30, null, null, null, null];
const DAY7 = [Z0, row({ id: ID.Z1, title: 'Z1 منجزة بلا مخطط', eid: ME.eid, st: 'done', perf: ['on_time', 'في الوقت'], acc: NOW - 50 * H, fin: NOW - 49.5 * H, dur: 0, s: NOW - 50 * H, e: NOW - 48 * H })];
function seed(extra) {
  const S = { [K(7)]: DAY7, [K(TD)]: TODAY, [K(8)]: YDAY, [K(20, 4)]: [row({ id: ID.P, title: 'P الشهر الماضي', eid: ME.eid })] };
  const store = new Map([['bassam_tasks_v1', JSON.stringify(S)], ['bassam_employees_v1', JSON.stringify(EMPS)]].concat(Object.entries(extra || {})));
  return page(store);
}
const nm = (t) => String(t.title).replace(/^TEST_ONLY /, '').split(' ')[0];
const names = (V) => Array.from(V.allFiltered.map(nm));
const locks = (P) => JSON.parse(P.store.get(LOCKS) || '{}');
const rowOf = (V, id) => V.allFiltered.find((t) => t.tkcT[13] === id);
const lastToast = (P) => P.toasts.at(-1) || [];
const J = (o) => JSON.parse(JSON.stringify(o));   /* قيمُ vm بنماذجِ عالمها — تُقارن بعد نسخها */

test('الساعةُ الثابتة: اليومُ التشغيليّ للصفحة 9 جمادى الأولى 1448 هـ (أساسُ القيم كلها)', () => {
  const { c } = seed();
  assert.deepEqual({ ...c.hToday() }, { y: Y, m: M, d: TD });
  assert.equal(c._tkTodayN(), Y * 1e4 + M * 100 + TD);
  assert.equal(c.MONTHS[M - 1], MN);
});

test('اليومُ الافتراضي = اليومُ الجاري: رأسُ كرت اليوم (العنوان · الموافق · العدد) وشريطُ الأيام بخانة اليوم المختارة', () => {
  const P = seed(), V = P.V();
  assert.equal(P.c._tkDayDef(P.c.state, P.c.hToday()), TD, 'الافتراضي في الشهر الجاري اليومُ الجاري');
  assert.equal(P.c._tkDayDef(Object.assign({}, P.c.state, { month: 4 }), P.c.hToday()), 0, 'وفي غيره الشهرُ كاملاً');
  assert.equal(V.tkDayStripOn, true);
  assert.equal(V.tkDayTitle, 'مهام اليوم — الثلاثاء 9 ' + MN + ' 1448 هـ');
  assert.equal(V.tkDaySub, 'الموافق 20 أكتوبر 2026 م');
  assert.equal(V.tkDayCount, '8 مهام');
  assert.equal(V.tkDayAllOn, true); assert.equal(V.tkDayAllTxt, 'الشهر كاملاً');
  assert.equal(V.tkDays.length, P.c.mDays(Y, M - 1), 'خانةٌ لكل يومٍ في الشهر');
  const d9 = V.tkDays[TD - 1], d8 = V.tkDays[7], d12 = V.tkDays[11];
  assert.equal(d9.num, '9'); assert.equal(d9.gnum, '20'); assert.equal(d9.isToday, true); assert.match(d9.style, /border:2px solid var\(--bd-xb99751\)$/, 'حدُّ المختار ذهبيّ');
  assert.match(d9.tip, /^الثلاثاء 9 جمادى الأولى — 8 مهام · 3 منجزة · نقرة مزدوجة لإغلاق اليوم$/);
  assert.equal(d8.isToday, false); assert.match(d8.tip, /^الاثنين 8 جمادى الأولى — مهمتان · 1 منجزة · انقضى — مقفل/);
  assert.match(d12.tip, /^الجمعة 12 جمادى الأولى — لا مهام · نقرة مزدوجة لإغلاق اليوم$/); assert.equal(V.tkDaysN, '3', 'ثلاثةُ أيامٍ فيها مهام');
  assert.deepEqual(names(V), ['G', 'B', 'D', 'F', 'H', 'C', 'E', 'A'], 'مهامُ اليوم وحدَه');
  assert.equal(V.allFiltered.some((t) => t.dayHeadOn), false, 'عرضُ اليوم بلا رؤوس أقسام');
  assert.equal(V.tkK1L, 'مهام اليوم'); assert.equal(V.tkK1Cap, 'إجمالي اليوم'); assert.equal(V.tkKCapT, 'مؤشرات اليوم');
});

test('اختيارُ يومٍ آخر من الشريط · «الشهر كاملاً» يعرض الشهرَ بأقسامه · «عرض اليوم» يعود إلى اليوم الجاري · والبحثُ في الشهر كله', () => {
  const P = seed();
  P.V().tkDays[7].click();
  assert.deepEqual({ ...P.c.state.tkDaySel }, { k: SK, d: 8 });
  let V = P.V();
  assert.equal(V.tkDayTitle, 'مهام يوم الاثنين 8 ' + MN + ' 1448 هـ'); assert.equal(V.tkDaySub, 'الموافق 19 أكتوبر 2026 م');
  assert.equal(V.tkDayCount, 'مهمتان'); assert.deepEqual(names(V), ['Y2', 'Y1']);
  assert.equal(V.tkK1L, 'مهام هذا اليوم'); assert.match(V.tkDays[7].style, /border:2px solid var\(--bd-xb99751\)$/); assert.doesNotMatch(V.tkDays[TD - 1].style, /bd-xb99751\)$/);
  assert.equal(V.tkDayAllOn, true); assert.equal(V.tkDayAllTxt, 'الشهر كاملاً');
  V.tkDayAll();
  assert.deepEqual({ ...P.c.state.tkDaySel }, { k: SK, d: 0 });
  V = P.V();
  assert.equal(V.tkDayTitle, 'مهام شهر ' + MN + ' 1448 هـ — كل الأيام'); assert.equal(V.tkDaySub, '');
  assert.equal(V.tkDayCount, '12 مهمة'); assert.equal(V.tkK1L, 'مهام الشهر'); assert.equal(V.tkK1Cap, 'إجمالي الشهر'); assert.equal(V.tkKCapT, 'مؤشرات الشهر'); assert.equal(V.tkK1N, '12');
  assert.equal(V.tkDayLockOn, false, 'لا شارةَ قفلٍ في الشهر كاملاً');
  assert.equal(V.tkDayAllOn, true); assert.equal(V.tkDayAllTxt, 'عرض اليوم');
  V.tkDayAll();
  assert.deepEqual({ ...P.c.state.tkDaySel }, { k: SK, d: TD });
  assert.equal(P.V().tkDayTitle, 'مهام اليوم — الثلاثاء 9 ' + MN + ' 1448 هـ');
  P.c.setState({ search: 'Y1' });
  V = P.V();
  assert.equal(V.tkDayTitle, 'نتائج البحث في مهام شهر ' + MN + ' 1448 هـ'); assert.deepEqual(names(V), ['Y1'], 'البحثُ يتجاوز اليومَ المختار'); assert.equal(V.allFiltered[0].dayHeadOn, true);
  P.c.setState({ search: '', month: 4 });
  V = P.V();
  assert.equal(V.tkDayTitle, 'مهام شهر ربيع الآخر 1448 هـ — كل الأيام', 'شهرٌ آخر: الشهرُ كاملاً افتراضياً'); assert.equal(V.tkDayAllOn, false); assert.deepEqual(names(V), ['P']);
});

test('الأحدثُ إدخالاً أولاً داخل اليوم · وفي الشهر كاملاً أقسامُ الأيام من الأحدث برؤوسها (اليوم/أمس · العدد · المنجزة والمتأخرة) وطيُّها', () => {
  const P = seed();
  let V = P.V();
  assert.deepEqual(Array.from(V.allFiltered.map((t) => t.entAt)), [ID.G, ID.B, ID.D, ID.F, ID.H, ID.C, ID.E, ID.A]);
  assert.deepEqual(Array.from(V.allFiltered.map((t) => t.seq)), [1, 2, 3, 4, 5, 6, 7, 8], 'الترقيمُ يتبع الترتيب');
  P.c.setState({ tkDaySel: { k: SK, d: 0 } });
  V = P.V();
  assert.deepEqual(names(V), ['G', 'B', 'D', 'F', 'H', 'C', 'E', 'A', 'Y2', 'Y1', 'Z1', 'Z0'], 'الأيامُ من الأحدث · والصفُّ بلا وقت إدخالٍ آخرَ يومه');
  const heads = Array.from(V.allFiltered.filter((t) => t.dayHeadOn), (t) => [nm(t), t.dayTitle, t.dayTag, t.dayN, t.daySub]);
  assert.deepEqual(heads, [
    ['G', 'الثلاثاء 9 ' + MN + ' 1448 هـ', 'اليوم', '8 مهام', '3 منجزة · 2 متأخرة'],
    ['Y2', 'الاثنين 8 ' + MN + ' 1448 هـ', 'أمس', 'مهمتان', '1 منجزة'],
    ['Z1', 'الأحد 7 ' + MN + ' 1448 هـ', '', 'مهمتان', '1 منجزة'],
  ]);
  assert.equal(V.allFiltered[1].dayHeadOn, undefined, 'الصفُّ الثاني من اليوم بلا رأس');
  assert.equal(V.allFiltered[0].dayOpenA, 'true'); assert.match(V.allFiltered[0].dayDot, /brand-fg/); assert.match(V.allFiltered[8].dayDot, /text-faint/);
  V.allFiltered[8].dayToggle();
  assert.deepEqual({ ...P.c.state.tkDayClosed }, { [K(8)]: true });
  V = P.V();
  const y = V.allFiltered.filter((t) => t.secK === K(8));
  assert.equal(y.length, 1, 'اليومُ المطويّ مرساةٌ واحدة'); assert.equal(y[0].dayHidden, true); assert.match(y[0].trStyle, /display:none$/);
  assert.equal(y[0].dayOpenA, 'false'); assert.match(y[0].dayTip, /^فرد /); assert.equal(V.tkDayCount, '12 مهمة', 'الطيُّ لا يمسّ العدّ');
  y[0].dayToggle();
  assert.equal(P.V().allFiltered.length, 12);
});

test('«أوسمة اليوم» لليوم الجاري: القيمُ · نسبُ الشرائح · العلامات المضيئة · وحلقةُ الزمن «أبطأ من المخطط»', () => {
  const V = seed().V();
  /* 1 · مهامُ اليوم: 8 (6 موجّهة · 2 عامة) */
  assert.deepEqual([V.tkK1N, V.tkK1Dir, V.tkK1Gen, V.tkK1Chip, V.tkK1Sub], ['8', '6', '2', '75٪ موجّهة', '6 موجّهة · 2 عامة']);
  assert.deepEqual([V.tkK1T, V.tkK1Lit], ['8', rep(6, '0.7 0.3') + ' 0 8']);
  assert.equal(V.tkK1Aria, 'مهام اليوم: 8 مهام، منها 6 موجّهة و2 عامة');
  /* 2 · مكتملةٌ في الوقت: A (في الوقت) و B (مبكرة) — لا C المتأخرة */
  assert.deepEqual([V.tkK2N, V.tkK2U, V.tkK2Chip, V.tkK2T, V.tkK2Lit, V.tkK2Bar], ['2', 'مهمة', '25٪', '8', rep(2) + ' 0 8', 'width:25%']);
  assert.equal(V.tkK2Sub, 'من أصل 8 مهام لليوم');
  assert.equal(V.tkK2Aria, 'مكتملة في الوقت: مهمتان، 25٪ من مهام اليوم. اضغط لتصفية الجدول');
  /* 3 · متأخرةٌ عن المهلة: D — والمنقضيةُ بلا قبول (E) في سطره */
  assert.deepEqual([V.tkK3N, V.tkK3U, V.tkK3Chip, V.tkK3T, V.tkK3Lit], ['1', 'مهمة', '13٪', '8', P1 + ' 0 8']);
  assert.equal(V.tkK3Sub, 'يُنبَّه المكلَّف ومسؤولُه تلقائياً · 1 انقضت بلا قبول');
  /* 4 · بانتظار الاعتماد: F و G — وأقدمُها منذ سُلّمت F (r21.sub قبل 150 دقيقة) */
  assert.deepEqual([V.tkK4N, V.tkK4Chip, V.tkK4Lit], ['2', '25٪', rep(2) + ' 0 8']);
  assert.equal(V.tkK4Sub, 'أقدمها منذ 2 س 30 د');
  assert.equal(V.tkK4Aria, 'بانتظار الاعتماد: مهمتان، أقدمها منذ 2 س 30 د. اضغط لتصفية الجدول');
  /* 5 · متوسطُ الزمن الفعلي (A 60 · B 30 · C 120 ⇒ 70 د) مقابل المخطط (90 · 60 · 30 ⇒ 60 د): أبطأ بـ10 د */
  assert.deepEqual([V.tkK5N, V.tkK5U, V.tkK5Chip, V.tkK5Sub], ['1 س 10 د', '', 'من 60 د', 'أبطأ من المخطط بـ 10 د']);
  assert.deepEqual([V.tkK5T, V.tkK5Lit, V.tkK5Xtra, V.tkK5XtraStyle], ['70', rep(60) + ' 0 70', '0 60 ' + rep(10) + ' 0 70', 'stroke:var(--arc-warning);opacity:1']);
  assert.match(V.tkK5SubStyle, /warning-text/);
  assert.match(V.tkK5Aria, /^متوسط زمن الإنجاز: 1 س 10 د، أبطأ من المخطط \(1 س\) بـ 10 د\. اضغط لعرض المنجزة$/);
  for (const k of ['tkK2On', 'tkK3On', 'tkK4On', 'tkK5On', 'tkKfOn']) assert.equal(V[k], false, k);
});

test('حلقةُ الزمن: «أسرع من المخطط» بقياسٍ فوق 96 دقيقة (أمس) · «بلا مدةٍ مخططة» (اليوم 7) · وبلا منجزةٍ «—»', () => {
  const P = seed();
  P.V().tkDays[7].click();
  let V = P.V();
  assert.deepEqual([V.tkK5N, V.tkK5U, V.tkK5Chip, V.tkK5Sub], ['1 س', '', 'من 120 د', 'أسرع من المخطط بـ 1 س']);
  assert.deepEqual([V.tkK5T, V.tkK5Lit, V.tkK5Xtra, V.tkK5XtraStyle], ['96', rep(48) + ' 0 96', '0 48 ' + rep(48) + ' 0 96', ''], 'المقامُ 120 د ⇒ 96 علامة: الفعليُّ 48 والموفَّرُ 48');
  assert.match(V.tkK5SubStyle, /success-text/);
  assert.deepEqual([V.tkK1N, V.tkK2N, V.tkK2Chip, V.tkK2Lit], ['2', '1', '50٪', P1 + ' 0 2']);
  P.V().tkDays[6].click();
  V = P.V();
  assert.deepEqual([V.tkK5N, V.tkK5U, V.tkK5Chip, V.tkK5Sub, V.tkK5SubStyle], ['30', 'د', 'بلا مخطط', 'بلا مدةٍ مخططة', '']);
  assert.deepEqual([V.tkK5T, V.tkK5Lit, V.tkK5Xtra, V.tkK5XtraStyle], ['30', P1, '0 30', '']);
  P.V().tkDays[TD].click();   /* اليوم 10: بلا مهام */
  V = P.V();
  assert.deepEqual([V.tkK5N, V.tkK5U, V.tkK5Chip, V.tkK5Sub, V.tkK5T, V.tkK5Lit, V.tkK5Xtra], ['—', '', '—', 'لا مهام منجزة بعد', '45', '0 45', '0 45']);
});

test('هندسةُ العلامات: يومٌ بلا مهام 48 علامةً مطفأة · حتى 96 علامةٌ لكل مهمة · وفوقها تُقاس بالنسبة (والحصّةُ الصغيرة علامةٌ واحدة على الأقل)', () => {
  const P = seed();
  P.V().tkDays[11].click();
  const V = P.V();
  assert.equal(V.tkDayCount, '0 مهمة');
  assert.deepEqual([V.tkK1N, V.tkK1T, V.tkK1Lit, V.tkK1Chip, V.tkK2Chip, V.tkK2T, V.tkK2Lit], ['0', '48', '0 48', 'لا مهام', '0٪', '48', '0 48']);
  assert.deepEqual([V.tkK3Sub, V.tkK4Sub, V.tkK2Bar], ['لا مهام متأخرة', 'لا شيء بانتظار الاعتماد', 'width:0%']);
  const t = (n, k, p) => ({ ...P.c._tkTicks(n, k, p) });
  assert.deepEqual(t(0, 0), { T: '48', lit: '0 48' });
  assert.deepEqual(t(5, 0), { T: '5', lit: '0 5' });
  assert.deepEqual(t(5, 2), { T: '5', lit: rep(2) + ' 0 5' });
  assert.deepEqual(t(5, 5), { T: '5', lit: P1 }, 'الكلُّ مضيء ⇒ النمطُ وحده يتكرّر');
  assert.deepEqual(t(5, 9), { T: '5', lit: P1 }, 'لا تتجاوز الحصّةُ المقام');
  assert.deepEqual(t(4, 1, '0.7 0.3'), { T: '4', lit: '0.7 0.3 0 4' });
  assert.deepEqual(t(96, 96), { T: '96', lit: P1 });
  assert.deepEqual(t(200, 50), { T: '96', lit: rep(24) + ' 0 96' }, '50 من 200 ⇒ 24 من 96');
  assert.deepEqual(t(200, 1), { T: '96', lit: P1 + ' 0 96' }, 'حصّةٌ دون نصف علامة ⇒ علامةٌ واحدة');
  assert.deepEqual(t(200, 0), { T: '96', lit: '0 96' });
  assert.deepEqual(t(200, 200), { T: '96', lit: P1 });
  /* عبر المؤشرات نفسِها: 120 مهمة منها 30 مكتملةٌ في الوقت */
  const L = Array.from({ length: 120 }, (_, i) => ({ status: i < 30 ? 'done' : 'pending', tkcT: i < 30 ? [, , , , , , ['on_time', '']] : [], empId: i % 2 ? 'e' : '' }));
  const Kp = P.c._tkDayKpis(L, 'مهام اليوم', { SK, eff: TD, shown: 120 });
  assert.deepEqual([Kp.tkK1N, Kp.tkK1T, Kp.tkK1Lit], ['120', '96', rep(48, '0.7 0.3') + ' 0 96']);
  assert.deepEqual([Kp.tkK2N, Kp.tkK2U, Kp.tkK2Chip, Kp.tkK2T, Kp.tkK2Lit], ['30', 'مهمة', '25٪', '96', rep(24) + ' 0 96']);
});

test('تصفيةُ الجدول بالمؤشر: «متأخرة عن المهلة» تُبقي متأخرةَ اليوم وحدها بشريحتها وعدّادها · الضغطُ ثانيةً أو «مسح» يعيده · ولا تسري على يومٍ آخر', () => {
  const P = seed();
  P.V().tkK3Go();
  assert.deepEqual({ ...P.c.state.tkKf }, { k: SK, d: TD, f: 'late' });
  let V = P.V();
  assert.deepEqual(names(V), ['D']);
  assert.equal(V.tkKfOn, true); assert.equal(V.tkKfTxt, 'متأخرة عن المهلة'); assert.equal(V.tkKfCnt, '1 من 8 مهام'); assert.equal(V.tkKfAria, 'إلغاء تصفية: متأخرة عن المهلة');
  assert.equal(V.tkK3On, true); assert.match(V.tkK3Aria, /\. التصفية مفعّلة — اضغط لإلغائها$/); assert.equal(V.tkK1Aria, 'مهام اليوم: 8 مهام، منها 6 موجّهة و2 عامة. اضغط لعرضها كلها');
  assert.equal(V.tkDayCount, 'مهمة واحدة'); assert.equal(V.tkK1N, '8', 'المؤشراتُ من مهام اليوم كلها لا من المصفّاة');
  V.tkK3Go();
  V = P.V(); assert.equal(V.tkKfOn, false); assert.equal(V.allFiltered.length, 8, 'الضغطُ ثانيةً يلغيها');
  V.tkK3Go(); assert.equal(P.V().allFiltered.length, 1);
  P.V().tkKfClear();
  assert.equal(P.c.state.tkKf, null); V = P.V(); assert.equal(V.allFiltered.length, 8); assert.equal(V.tkKfCnt, '');
  /* بقيةُ المؤشرات: كلٌّ يصفّي بحكمه — والضغطُ على «مهام اليوم» يلغي */
  P.V().tkK2Go(); V = P.V(); assert.deepEqual(names(V), ['B', 'A']); assert.equal(V.tkK2On, true); assert.equal(V.tkKfTxt, 'مكتملة في الوقت'); assert.equal(V.tkKfCnt, '2 من 8 مهام');
  V.tkK4Go(); V = P.V(); assert.deepEqual(names(V), ['G', 'F']); assert.equal(V.tkK4On, true); assert.equal(V.tkK2On, false); assert.equal(V.tkKfTxt, 'بانتظار الاعتماد');
  V.tkK5Go(); V = P.V(); assert.deepEqual(names(V), ['B', 'C', 'A']); assert.equal(V.tkKfTxt, 'المنجزة بزمنٍ فعلي'); assert.equal(V.tkKfCnt, '3 من 8 مهام');
  V.tkK1Go(); V = P.V(); assert.equal(V.tkKfOn, false); assert.equal(V.allFiltered.length, 8);
  /* التصفيةُ لليوم نفسِه: يومٌ آخر أو الشهرُ كاملاً بلا تصفية */
  P.V().tkK3Go();
  P.V().tkDays[7].click();
  V = P.V(); assert.deepEqual(names(V), ['Y2', 'Y1']); assert.equal(V.tkKfOn, false); assert.equal(V.tkK3On, false); assert.equal(V.tkKfCnt, '');
  V.tkDayAll();
  V = P.V(); assert.equal(V.allFiltered.length, 12); assert.equal(V.tkKfOn, false);
});

test('قفلُ اليوم: أمسُ مقفلٌ تلقائياً — شارتُه وخانتُه · التعديلُ والقبولُ والإنهاءُ مرفوضةٌ بتنبيه · واليومُ الجاري والقادمُ مفتوحان', () => {
  const P = seed();
  assert.deepEqual({ ...P.c._tkDayLockOf(Y, M, 8) }, { past: true, opened: false, shut: false, viaMonth: false, approved: false, locked: true });
  assert.equal(P.c.tkLockedAt(Y, M, 8), true); assert.equal(P.c.tkLockedAt(Y, M, 1), true);
  assert.equal(P.c.tkLockedAt(Y, M, TD), false); assert.equal(P.c.tkLockedAt(Y, M, 12), false);
  let V = P.V();
  assert.equal(V.tkDays[7].lockClosed, true); assert.equal(V.tkDays[7].lockOpen, false); assert.match(V.tkDays[7].style, /background:var\(--bg-x64748b\)/, 'مقفلٌ فيه مهام: رماديٌّ داكن');
  assert.equal(V.tkDays[TD - 1].lockClosed, false); assert.equal(V.tkDays[11].lockClosed, false);
  assert.equal(V.tkDayLockOn, false, 'اليومُ الجاري بلا شارة'); assert.equal(V.tasksCanAdd, true);
  V.tkDays[7].click();
  V = P.V();
  assert.equal(V.tkDayLockOn, true); assert.equal(V.tkDayLockShut, true); assert.equal(V.tkDayLockOpenI, false);
  assert.equal(V.tkDayLockTxt, 'اليوم انقضى — المهام مقفلة تلقائياً · افتحه بأثر رجعي بنقرة مزدوجة على خانته');
  assert.equal(V.tasksCanAdd, false, 'لا إضافةَ في يومٍ مقفل');
  const MSG = 'اليوم مقفل — افتحه بنقرة مزدوجة على خانته في شريط الأيام.';
  const y1 = rowOf(V, ID.Y1);
  y1.edit(); assert.deepEqual(lastToast(P), [MSG, 'err']); assert.equal(P.c.state.newTaskOpen, false); assert.equal(P.c.state.editRef, null);
  P.toasts.length = 0;
  y1.accept(); assert.deepEqual(lastToast(P), [MSG, 'err']); assert.equal(P.c.state.acceptRef, null);
  y1.finish(); assert.deepEqual(lastToast(P), [MSG, 'err']); assert.equal(P.c.state.confirmFinish, null);
  y1.del(); assert.deepEqual(lastToast(P), [MSG, 'err']); assert.equal(P.c.state.confirmDel, null); assert.equal(P.toasts.length, 3);
  /* اليومُ الجاري مفتوح: التعديلُ يفتح النموذج */
  P.V().tkDays[TD - 1].click();
  rowOf(P.V(), ID.D).edit();
  assert.equal(P.c.state.newTaskOpen, true); assert.equal(P.c.state.editRef.d, TD); assert.equal(P.toasts.length, 3);
});

test('فتحُ أمسِ بأثر رجعي بالنقر المزدوج على خانته: النافذة · الإلغاء · {mo:1} على مفتاح «y-m-d» يفتحه · وإعادةُ القفل تحذف المفتاح', () => {
  const P = seed();
  P.V().tkDays[7].click();
  P.V().tkDays[7].dbl({ stopPropagation() {} });
  assert.deepEqual({ ...P.c.state.retroAsk }, { m: M, day: 8, op: 'open' });
  let V = P.V();
  assert.equal(V.retroOn, true); assert.equal(V.retroTitle, 'فتح يوم الاثنين 8 ' + MN + ' 1448 هـ بأثر رجعي'); assert.equal(V.retroBtn, 'فتح بأثر رجعي'); assert.match(V.retroBtnStyle, /bg-xb45309/);
  V.retroCancel();
  assert.equal(P.c.state.retroAsk, null); assert.equal(P.store.has(LOCKS), false, 'الإلغاءُ لا يكتب شيئاً'); assert.equal(P.V().retroOn, false);
  P.V().tkDays[7].dbl();
  P.V().retroDo();
  assert.deepEqual(locks(P), { [K(8)]: { mo: 1 } }); assert.deepEqual(J(P.c.state.locked), { [K(8)]: { mo: 1 } });
  assert.equal(P.c.state.retroAsk, null); assert.deepEqual(lastToast(P), ['فُتح اليوم — يمكنك الآن إضافة مهامه وتعديلها', 'ok']);
  assert.equal(P.c.tkLockedAt(Y, M, 8), false); assert.equal(P.c.tkLockedAt(Y, M, 7), true, 'الأيامُ المنقضيةُ الأخرى باقيةٌ على قفلها');
  V = P.V();
  assert.equal(V.tkDayLockOn, true); assert.equal(V.tkDayLockShut, false); assert.equal(V.tkDayLockOpenI, true);
  assert.equal(V.tkDayLockTxt, 'يوم منقضٍ مفتوح بأثر رجعي — يُعاد قفله بنقرة مزدوجة على خانته');
  assert.equal(V.tkDays[7].lockOpen, true); assert.equal(V.tkDays[7].lockClosed, false); assert.match(V.tkDays[7].tip, / · مفتوح بأثر رجعي — نقرة مزدوجة لإغلاقه$/);
  assert.equal(V.tasksCanAdd, true);
  rowOf(V, ID.Y1).edit();
  assert.equal(P.c.state.newTaskOpen, true); assert.equal(P.c.state.editRef.d, 8, 'اليومُ المفتوح يُعدَّل');
  P.c.setState({ newTaskOpen: false, editRef: null });
  P.V().tkDays[7].dbl();
  assert.equal(P.c.state.retroAsk.op, 'relock');
  V = P.V(); assert.equal(V.retroTitle, 'إعادة قفل يوم الاثنين 8 ' + MN + ' 1448 هـ'); assert.equal(V.retroBtn, 'إعادة القفل');
  V.retroDo();
  assert.deepEqual(locks(P), {}, 'إعادةُ القفل تحذف المفتاح'); assert.equal(P.c.tkLockedAt(Y, M, 8), true);
  assert.deepEqual(lastToast(P), ['أُعيد قفلُ اليوم — صار عرضاً فقط', 'ok']);
});

test('_setDayLockT: open ⇒ {mo:1} · close على اليوم الجاري ⇒ true ويُقفل (والحفظُ مرفوض) · clear يحذف المفتاح · ومفاتيحُ الأيام لا تمسّ مفتاح الشهر', () => {
  const P = seed();
  P.c._setDayLockT(Y, M, 8, 'open');
  assert.deepEqual(locks(P), { [K(8)]: { mo: 1 } }); assert.equal(P.c.tkLockedAt(Y, M, 8), false);
  /* نموذجُ تعديل D (اليوم 9) مفتوحٌ ثم يُغلق يومُه: نقلُها إلى يومٍ مفتوح (10) يُرفض بحارس اليوم في submitTask — من يومٍ مقفلٍ لا يُنقل شيء */
  rowOf(P.V(), ID.D).edit();
  assert.equal(P.c.state.newTaskOpen, true);
  P.c._setDayLockT(Y, M, TD, 'close');
  assert.deepEqual(locks(P), { [K(8)]: { mo: 1 }, [K(TD)]: true });
  assert.deepEqual({ ...P.c._tkDayLockOf(Y, M, TD) }, { past: false, opened: false, shut: true, viaMonth: false, approved: false, locked: true });
  assert.equal(P.c.monthLockedT(Y, M), false, 'الشهرُ نفسُه غيرُ مقفل');
  const before = P.store.get('bassam_tasks_v1');
  P.c.setState({ newTitle: 'TEST_ONLY D معدَّلة', newDay: 10, newEDay: 10 });
  P.V().submitTask();
  assert.deepEqual(lastToast(P), ['اليوم 9 ' + MN + ' مقفل — افتحه أولاً بنقرة مزدوجة على خانته في شريط الأيام.', 'err']);
  assert.equal(P.store.get('bassam_tasks_v1'), before, 'لا كتابة'); assert.equal(P.c.state.newTaskOpen, true);
  P.c.setState({ newTaskOpen: false, editRef: null });
  let V = P.V();
  assert.equal(V.tkDayLockOn, true); assert.equal(V.tkDayLockShut, true);
  assert.equal(V.tkDayLockTxt, 'اليوم مُغلق — المهام للعرض فقط · افتحه بنقرة مزدوجة على خانته');
  assert.equal(V.tasksCanAdd, false); assert.equal(V.tkDays[TD - 1].lockClosed, true);
  P.toasts.length = 0;
  rowOf(V, ID.D).edit(); assert.deepEqual(lastToast(P), ['اليوم مقفل — افتحه بنقرة مزدوجة على خانته في شريط الأيام.', 'err']); assert.equal(P.c.state.newTaskOpen, false);
  V.tkDays[TD - 1].dbl();
  assert.equal(P.c.state.retroAsk.op, 'unshut'); assert.equal(P.V().retroTitle, 'فتح يوم الثلاثاء 9 ' + MN + ' 1448 هـ');
  P.c.setState({ retroAsk: null });
  P.c._setDayLockT(Y, M, TD, 'clear');
  assert.deepEqual(locks(P), { [K(8)]: { mo: 1 } }); assert.equal(P.c.tkLockedAt(Y, M, TD), false); assert.equal(P.V().tasksCanAdd, true);
  P.c._setDayLockT(Y, M, 8, 'clear');
  assert.deepEqual(locks(P), {}); assert.equal(P.c.tkLockedAt(Y, M, 8), true, 'بلا مفتاح يعود المنقضي مقفلاً تلقائياً');
  P.c._setDayLockT(Y, M, 12, 'close');
  assert.equal(P.c.tkLockedAt(Y, M, 12), true, 'ويُغلق يومٌ قادمٌ بيده'); assert.equal(P.c.tkLockedAt(Y, M, 11), false);
});

test('حارسُ الحفظ بحسب اليوم: مهمةٌ جديدةٌ في أمسِ المقفل مرفوضة · وبعد فتحه بأثر رجعي تُحفظ في يومه', () => {
  const P = seed();
  const form = { newTaskOpen: true, editRef: null, newTitle: 'TEST_ONLY جديدة لأمس', newDesc: '', newPrio: 'normal', newDay: 8, newEDay: 8, newSh: 8, newSm: 0, newSap: 'ص', newEh: 10, newEm: 0, newEap: 'ص',
    newAsg: 'general', newPick: {}, pickWt: 'TEST_ONLY مراقب', newDur: '120' };
  P.c.setState(form);
  const before = P.store.get('bassam_tasks_v1');
  P.V().submitTask();
  assert.deepEqual(lastToast(P), ['اليوم 8 ' + MN + ' مقفل — افتحه أولاً بنقرة مزدوجة على خانته في شريط الأيام.', 'err']);
  assert.equal(P.store.get('bassam_tasks_v1'), before);
  P.c._setDayLockT(Y, M, 8, 'open');
  P.c.setState(form);
  P.V().submitTask();
  const S = JSON.parse(P.store.get('bassam_tasks_v1'));
  assert.equal(S[K(8)].length, 3, 'أُضيفت في يومها'); assert.ok(S[K(8)].some((r) => r[0] === 'TEST_ONLY جديدة لأمس'));
  assert.equal(P.c.state.newTaskOpen, false);
});

test('اعتمادُ الشهر («y-m»: true) يقفل كلَّ أيامه ولو فُتح يومٌ بأثر رجعي · وعلَمُ فتح الشهر {mo:1} يفتح أيامه المنقضية', () => {
  let P = seed({ [LOCKS]: JSON.stringify({ [SK]: true, [K(8)]: { mo: 1 } }) });
  for (const d of [1, 8, TD, 12]) assert.equal(P.c.tkLockedAt(Y, M, d), true, 'اليوم ' + d);
  assert.equal(P.c._tkLockTxt(Y, M, TD), 'الشهر معتمد ومقفل.');
  let V = P.V();
  assert.equal(V.tkDayLockOn, true); assert.equal(V.tkDayLockTxt, 'الشهر معتمد ومقفل — المهام للعرض فقط'); assert.equal(V.tasksCanAdd, false);
  assert.match(V.tkDays[TD - 1].tip, / · الشهر معتمد ومقفل$/);
  rowOf(V, ID.D).edit(); assert.deepEqual(lastToast(P), ['الشهر معتمد ومقفل.', 'err']); assert.equal(P.c.state.newTaskOpen, false);
  V.tkDays[TD - 1].dbl();
  assert.deepEqual(lastToast(P), ['الشهر معتمد ومقفل — افتحه أولاً بنقرة مزدوجة على كرت الشهر.', 'err']); assert.ok(!P.c.state.retroAsk, 'لا نافذةَ لفتح يومٍ في شهرٍ معتمد');
  P.c.setState({ newTaskOpen: true, editRef: null, newTitle: 'TEST_ONLY في شهرٍ معتمد', newDesc: '', newPrio: 'normal', newDay: TD, newEDay: TD, newSh: 8, newSm: 0, newSap: 'ص', newEh: 10, newEm: 0, newEap: 'ص', newAsg: 'general', newPick: {}, pickWt: '', newDur: '' });
  P.V().submitTask();
  assert.match(lastToast(P)[0], /^شهر جمادى الأولى 1448 هـ معتمد ومقفل — لا يمكن حفظ المهمة فيه\./);
  P = seed({ [LOCKS]: JSON.stringify({ [SK]: { mo: 1 } }) });
  assert.equal(P.c.tkLockedAt(Y, M, 8), false, 'علَمُ فتح الشهر يفتح المنقضي'); assert.equal(P.c._tkDayLockOf(Y, M, 8).viaMonth, true);
  P.V().tkDays[7].click();
  V = P.V(); assert.equal(V.tkDayLockOn, true); assert.equal(V.tkDayLockShut, false); assert.equal(V.tkDayLockTxt, 'يوم منقضٍ مفتوح بأثر رجعي — يُعاد قفله بنقرة مزدوجة على خانته');
});

test('delMonthDo: حذفُ الشهر يحذف مهامَه ومفتاحَ قفله ومفاتيحَ أيامه كلها — ويُبقي الشهرَ الآخر ومفاتيحَه', () => {
  const L0 = { [SK]: { mo: 1 }, [K(8)]: { mo: 1 }, [K(TD)]: true, [K(12)]: true, [Y + '-4']: true, [K(20, 4)]: { mo: 1 } };
  const P = seed({ [LOCKS]: JSON.stringify(L0) });
  P.c.setState({ delMonth: { n: M } });
  const V = P.V();
  assert.equal(V.delMonthOn, true); assert.match(V.delMonthMsg, /^سيتم حذف جميع مهام شهر جمادى الأولى 1448 هـ نهائياً/);
  V.delMonthDo();
  assert.deepEqual(Object.keys(JSON.parse(P.store.get('bassam_tasks_v1'))), [K(20, 4)], 'مهامُ الشهر الآخر باقية');
  assert.deepEqual(locks(P), { [Y + '-4']: true, [K(20, 4)]: { mo: 1 } });
  assert.deepEqual(J(P.c.state.locked), locks(P)); assert.equal(P.c.state.delMonth, null);
  assert.equal(P.c.tkLockedAt(Y, M, 8), true, 'أمسُ يعود مقفلاً تلقائياً'); assert.equal(P.c.tkLockedAt(Y, M, TD), false);
  assert.equal(P.V().tkDayCount, '0 مهمة');
});

test('عمودُ «الوردية»: ورديةُ المكلَّف من الجدول الشهري بلونها ووقتها · «بلا وردية» لمن لا وردية له · «—» للعامة ولمن لا يُربط بسجلّ', () => {
  const P = seed({
    bassam_staffing_v3: JSON.stringify({ [SK]: { [ME.eid]: { shift: 'TST-A', rest: [] } }, [Y + '-4']: { [MATE.eid]: { shift: 'TST-B', rest: [] } } }),
    bassam_shift_options_v1: JSON.stringify([{ name: 'TST-A', color: '#0f766e', tStart: '07:00', tEnd: '15:00' }, { name: 'TST-B', color: '#2f5f8a' }]),
  });
  const S = JSON.parse(P.store.get('bassam_tasks_v1'));
  S[K(TD)].push(row({ id: NOW - 5 * H, title: 'U مكلَّفٌ بلا سجلّ', eid: 'tst_e_nobody', s: NOW + 1 * H, e: NOW + 2 * H }));
  P.store.set('bassam_tasks_v1', JSON.stringify(S));
  const V = P.V(), cell = (id) => { const t = rowOf(V, id); return [t.shTxt, t.shOn, t.shNone, t.shTip, t.shTime]; };
  assert.deepEqual(cell(ID.A), ['TST-A', true, false, 'TST-A — من الجدول الشهري', '07:00–15:00']);
  assert.equal(rowOf(V, ID.A).shName, 'TST-A'); assert.match(rowOf(V, ID.A).shDot, /background:#0f766e$/);
  assert.deepEqual(cell(ID.D), cell(ID.A), 'كلُّ مهام الموظف بورديته');
  assert.deepEqual(cell(ID.B), ['بلا وردية', false, true, 'لا وردية له في الجدول الشهري لهذا الشهر', ''], 'ورديتُه في شهرٍ آخر لا تُحسب');
  assert.deepEqual(cell(ID.E), ['—', false, true, 'مهمة عامة — بلا مكلَّف · TEST_ONLY مراقب', '']);
  assert.deepEqual(cell(NOW - 5 * H), ['—', false, true, 'تعذّر ربط المكلَّف بسجلّ موظف', '']);
  assert.deepEqual({ ...P.c._tkShiftCell(S[K(TD)][0], P.c._tkShiftMap(Y, M), P.c._tkEmpIx(), { 'TST-A': { name: 'TST-A' } }) }, { shName: 'TST-A', shTxt: 'TST-A', shTip: 'TST-A — من الجدول الشهري', shOn: true, shNone: false, shDot: 'width:8px;height:8px;border-radius:50%;flex-shrink:0;background:var(--text-faint)', shTime: '' }, 'ورديةٌ بلا لونٍ ولا وقت');
});

test('القالب: خانةُ اليوم بنقرٍ ونقرٍ مزدوج · «الشهر كاملاً» · أزرارُ المؤشرات وشريحةُ التصفية · وعمودُ «الوردية»', () => {
  const V = fs.readFileSync(path.join(ROOT, 'src/modules/tasks/view.html'), 'utf8');
  assert.match(V, /<div onClick="\{\{d\.click\}\}" onDoubleClick="\{\{d\.dbl\}\}" title="\{\{d\.tip\}\}" style="\{\{d\.style\}\}"/);
  assert.match(V, /<sc-if value="\{\{tkDayAllOn\}\}"[^>]*><button type="button" onClick="\{\{tkDayAll\}\}" class="tk-dayall">\{\{tkDayAllTxt\}\}<\/button>/);
  for (const n of [2, 3, 4, 5]) assert.match(V, new RegExp('aria-pressed="\\{\\{tkK' + n + 'On\\}\\}" aria-label="\\{\\{tkK' + n + 'Aria\\}\\}" onClick="\\{\\{tkK' + n + 'Go\\}\\}"'), 'المؤشر ' + n);
  assert.match(V, /onClick="\{\{tkKfClear\}\}" aria-label="\{\{tkKfAria\}\}">\{\{tkKfTxt\}\}/);
  for (const k of ['tkDayTitle', 'tkDaySub', 'tkDayCount', 'tkDayLockTxt', 'tkKfCnt', 'tkK1Go']) assert.ok(V.includes('{{' + k + '}}'), k);
  assert.match(V, /<td data-label="الوردية"[^>]*>\s*<sc-if value="\{\{t\.shOn\}\}"/);
});

/* ── مراجعةُ ما قبل النشر (KIVO_265 · task-days): ما أكّدته المراجعةُ المستقلة وأُصلح ── */
test('مراجعة: «فتح» يومٍ أُغلق بيده ثم انقضى يفتحه بأثر رجعي ({mo:1}) — لا يمحو الإغلاقَ فيعود مقفلاً بانقضائه', () => {
  const P = seed({ [LOCKS]: JSON.stringify({ [K(8)]: true }) });
  P.c.setState({ locked: JSON.parse(P.store.get(LOCKS)) });
  P.V().tkDays[7].click();
  assert.equal(P.c.tkLockedAt(Y, M, 8), true, 'مُغلقٌ بيده');
  P.V().tkDays[7].dbl({ stopPropagation() {} });
  assert.equal(P.c.state.retroAsk.op, 'unshut');
  P.V().retroDo();
  assert.deepEqual(JSON.parse(P.store.get(LOCKS))[K(8)], { mo: 1 }, 'فتحٌ بأثر رجعي لا حذفٌ للمفتاح');
  assert.equal(P.c.tkLockedAt(Y, M, 8), false, 'اليومُ مفتوحٌ فعلاً كما تقول الرسالة');
  /* واليومُ الجاري المُغلق بيده يُفتح بحذف الإغلاق كما كان */
  P.c._setDayLockT(Y, M, TD, 'close');
  P.V().tkDays[TD - 1].click(); P.V().tkDays[TD - 1].dbl({ stopPropagation() {} });
  assert.equal(P.c.state.retroAsk.op, 'unshut'); P.V().retroDo();
  assert.equal(K(TD) in JSON.parse(P.store.get(LOCKS)), false); assert.equal(P.c.tkLockedAt(Y, M, TD), false);
});
test('مراجعة: الاختيارُ الجماعي يتبع قفلَ الشهر لا قفلَ اليوم — صفوفُ الأمس المقفلة تُختار للاعتماد الجماعي', () => {
  const P = seed();
  P.c._tkSrv = () => true;
  P.V().tkDays[7].click();
  const y1 = P.V().allFiltered.find((t) => /Y1/.test(t.title));
  assert.equal(P.c.tkLockedAt(Y, M, 8), true, 'الأمسُ مقفلٌ بانقضائه'); assert.equal(y1.selCan, true, 'ومع ذلك يُختار');
  P.c.setState({ locked: { [SK]: true } });
  assert.equal(P.V().allFiltered.find((t) => /Y1/.test(t.title)).selCan, false, 'الشهرُ المعتمد يمنع الاختيار');
});
test('مراجعة: تغييرُ اليوم يُلغي تصفيةَ المؤشر (ولا تعود بالرجوع) ويُنهي البحث · «الحالية» تعيد كرتَ اليوم الجاري', () => {
  const P = seed();
  P.V().tkK3Go(); assert.equal(P.V().tkKfOn, true);
  P.V().tkDays[7].click(); assert.equal(P.c.state.tkKf, null);
  P.V().tkDays[TD - 1].click(); assert.equal(P.V().tkKfOn, false, 'لا تعود التصفيةُ بالرجوع إلى اليوم');
  P.c.setState({ search: 'A' }); P.V().tkDays[7].click();
  assert.equal(P.c.state.search, ''); assert.match(P.V().tkDayTitle, /^مهام يوم /);
  P.V().goToday();
  assert.equal(P.c.state.tkDaySel, null); assert.match(P.V().tkDayTitle, /^مهام اليوم — الثلاثاء 9 /);
  P.V().tkK2Go(); P.V().tkDayAll(); assert.equal(P.c.state.tkKf, null, '«الشهر كاملاً» يُلغيها كذلك');
});
test('مراجعة: تصديرُ يومٍ مختار يُسمّى باليوم (الملفُّ والوصف) — والشهرُ كاملاً باسم الشهر', () => {
  const P = seed(); let name = null, rows = 0;
  P.KIVO.BassamXLSX = { download: (aoa, n) => { name = n; rows = aoa.length; } };
  let V = P.V(); assert.equal(V.tkExpLbl, 'مهام يوم 9 ' + MN);
  V.exportCsv(); assert.equal(name, 'tasks-9-' + MN + '-' + Y + '.xlsx'); assert.ok(rows > 1);
  P.V().tkDayAll(); V = P.V(); assert.match(V.tkExpLbl, new RegExp('^مهام ' + MN));
  V.exportCsv(); assert.equal(name, 'tasks-' + MN + '-' + Y + '.xlsx');
});
test('مراجعة: القالبُ بلا وسومِ إغلاقٍ يتيمة — بطاقةُ المهام وكلُّ النوافذ داخل جذر الصفحة كما في main', () => {
  const v = fs.readFileSync(path.join(ROOT, 'src/modules/tasks/view.html'), 'utf8');
  const n = (re) => (v.match(re) || []).length;
  assert.equal(n(/<div[\s>]/g) - n(/<\/div>/g), 0, 'div'); assert.equal(n(/<sc-for[\s>]/g) - n(/<\/sc-for>/g), 0, 'sc-for'); assert.equal(n(/<button[\s>]/g) - n(/<\/button>/g), 0, 'button');
  assert.doesNotMatch(v, /<\/sc-if>\n    <\/button>\n    <\/sc-for>\n  <\/div>\n<\/div>\n<\/sc-if>\n<div style="border-radius:16px/);
});
