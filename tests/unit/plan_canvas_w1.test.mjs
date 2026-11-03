/* W1 · منطقُ «التشغيل الميداني» الحقيقي (src/modules/plan/logic.js) داخل node:vm مع الخدمات الحقيقية (390 · 400 · 410 · 420 · 440 · 490 · 290 ·
   طبقةُ الإدخال 560) وبدائلَ صغيرة للمصادقة والصلاحيات والبحث. بياناتٌ اصطناعية (TEST_ONLY) — لا شبكةَ ولا متصفح.
     PLAN-01: تصفّحُ الأشهر قراءةٌ لا كتابة — كان كلُّ اختيارِ شهرٍ (البطاقة · السنة · «الحالية» كلُّها عبر goTo) يكتب الخطةَ كاملةً
              (مراجعةٌ جديدة للمفتاح المشترك على الخادم)، ويُظهر للعارض بلا تحرير «صلاحيتك على الخطة التشغيلية لا تشمل هذا الإجراء».
     CANVAS-4: ضغطةُ السحب على خطةٍ كبيرة كانت ترسم الصفحةَ كلَّها في الحال (~150ms على اللوحي) فيتجمّد الإطارُ الأوّل ثمّ يقفز —
              باللمس والقلم ولا تحديدَ يُلغى: مرساةُ السحب في الحالة بلا رسم، ورسمةٌ واحدةٌ عند الرفع.
   PLAN_LOGIC=<مسار> يبدّل ملفَّ المنطق (لإثبات أنّ الاختبارات تُخفق على المنطق السابق). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { ROOT, moduleLogic } from './harness.mjs';
import { operations } from './operational_ui_fx.mjs';

const LOGIC = process.env.PLAN_LOGIC ? fs.readFileSync(process.env.PLAN_LOGIC, 'utf8') : moduleLogic('plan');
const SERVICES = ['src/services/390-kpi-primitives.js', 'src/services/400-shift-need.js', 'src/services/440-count.js', 'src/services/410-gate-units.js', 'src/i18n/380-hijri-fallback.js',
  'src/services/420-round-factory.js', 'src/services/490-emp-key.js', 'src/services/290-activity-log.js', 'src/components/560-canvas-input.js', 'src/components/565-page-kit.js'];
const KP = 'bassam_plan_v1';

function page(o = {}) {
  const store = new Map(), KIVO = {}, toasts = [];
  const can = o.can || (() => true);
  const ctx = { KIVO, console, setTimeout: () => 0, clearTimeout: () => 0, setInterval: () => 0, clearInterval: () => 0, requestAnimationFrame: () => 0, cancelAnimationFrame() {}, performance: { now: () => 1 },
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    document: { hidden: false, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, addEventListener() {}, removeEventListener() {} },
    navigator: { userAgent: 'node' }, addEventListener() {}, removeEventListener() {}, __BS_BOOT: { srv: 0 },
    React: { createElement: (t, p, ...ch) => ({ t, p, ch }), Fragment: 'F' } };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  class DCLogic { constructor() { this.state = {}; } setState(p, cb) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); if (cb) cb(); } }
  ctx.DCLogic = DCLogic;
  for (const f of SERVICES) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  KIVO.BassamFind = { dig: (v) => String(v == null ? '' : v), norm: (v) => String(v == null ? '' : v), filter: (q, list) => list, match: () => true };
  KIVO.__bsMixOn = () => false;
  KIVO.BassamPerm = { can: (k, a) => can(k, a), on: () => true, lensOn: () => true };
  KIVO.BassamAuth = { user: () => ({ id: 'TEST_ONLY_dm', role: 'staff', mgr: true, deptId: 'tst_d1' }), isSuper: () => false, display: () => ({ name: 'TEST_ONLY' }), users: () => [] };
  KIVO.BassamDepts = { active: () => 'tst_d1', activeName: () => 'TEST_ONLY', list: () => [] };
  const B0 = KIVO.BassamPageKit.base; KIVO.BassamPageKit.base = (B, a) => class extends B0(B, a) { bsOn() { return true; } bsLensOn() { return true; } bsToast(m) { toasts.push(m); } };
  vm.runInContext(LOGIC + '\n;globalThis.__C = Component;', ctx, { filename: 'plan/logic.js' });
  const c = new ctx.__C();
  c.bsToast = (m) => toasts.push(m);
  return { c, store, toasts, KIVO, ctx };
}
/* موقعان · مصلّى في الموقع الأول — خطتان لشهرين (1448-5 · 1448-6) محفوظتان كما يحفظهما savePlan (المصلّى بسعته المشتقّة cap) */
const zone = (d, cap) => Object.assign({ uid: 'TEST_ONLY_z1', code: '01', ser: '01', cat: 'men', d: d || 'M100 100 L400 100 L400 300 L100 300 Z', cx: 250, cy: 200, rawA: 60000, emp: [], count: null }, cap == null ? {} : { cap });
const site = (n, zs) => ({ sid: 's_TEST_ONLY_' + n, name: 'TEST_ONLY الموقع ' + n, num: n, zones: zs || [], gates: [], marks: [], paths: [], sectors: [], hideSectors: false, approved: false, iid: null });
function seeded(o = {}) {
  const P = page(o), { c, store } = P;
  const m5 = [site(1, [zone(null)]), site(2)], m6 = [site(1, []), site(2)];
  const withCap = (F) => F.map((f) => Object.assign({}, f, { zones: f.zones.map((z) => Object.assign({}, z, { cap: 1234 })) }));
  const op = operations({ [KP]: { pMig: 3, zones: m5[0].zones, gates: [], marks: [], paths: [], floors: m5, months: { '1448-5': { c: 1, d: withCap(m5) }, '1448-6': { c: 1, d: withCap(m6) } }, cfg: {}, delMonths: {} } });
  P.KIVO.__BS_SRV = { operations: op.service };
  c.state = Object.assign({}, c.state, { year: 1448, month: 5, floor: 0, floors: m5.map((f) => Object.assign({}, f)), zones: m5[0].zones.slice(), gates: [], marks: [], paths: [],
    planMonths: { '1448-5': { c: 1, d: m5 }, '1448-6': { c: 1, d: m6 } }, sel: null, selMulti: [], tool: 'select', lens: 'plan', view: { x: 0, y: 0, w: 1000, h: 600 } });
  const S = { saves: 0, denies: 0, images: 0 };
  const save0 = c.savePlan; c.savePlan = function () { S.saves++; return save0.apply(this, arguments); };
  const deny0 = c.permDeny; c.permDeny = function () { S.denies++; return deny0 ? deny0.apply(this, arguments) : undefined; };
  c._loadFloorImages = () => { S.images++; };
  return Object.assign(P, { S, op });
}

test('PLAN-01: تصفّحُ الأشهر بلا تعديل (البطاقات · السنة · «الحالية» — كلُّها goTo) لا يحفظ الخطةَ ولا يمسّ المخزَّن', () => {
  const W = seeded(), { c, S, op } = W;
  const before = JSON.stringify(op.data[KP]);
  for (const [y, m] of [[1448, 6], [1448, 5], [1448, 7], [1447, 5], [1448, 5]]) c.goTo(y, m);
  assert.equal(S.saves, 0, 'savePlan لم يُستدعَ (كان يُستدعى في كل انتقال)');
  assert.equal(JSON.stringify(op.data[KP]), before, 'الخطةُ المخزَّنة لم تتغيّر حرفاً'); assert.equal(op.control.stages.length, 0);
  assert.equal(S.images, 5, 'صورُ المواقع تُحمَّل في كل انتقال كما كانت');
  assert.deepEqual([c.state.year, c.state.month], [1448, 5]);
  assert.equal(c.state.zones.length, 1, 'الشهرُ المعروض بمصلّاه');
  assert.equal(c._lastSnap && c._lastSnap.month, 5, 'خطُّ التراجع يبدأ من الشهر المعروض (كما كان يبدأ بعد الحفظ)');
});

test('PLAN-01: العارضُ بلا صلاحية تحرير يتصفّح الأشهر بلا رسالة «صلاحيتك لا تشمل هذا الإجراء» وبلا كتابة', () => {
  const W = seeded({ can: (k, a) => !(k === 'plan' && (a === 'edit' || a === 'approve' || a === 'add' || a === 'del')) }), { c, S, toasts, op } = W;
  const before = JSON.stringify(op.data[KP]);
  c.state = Object.assign({}, c.state, { zones: [zone('M120 100 L420 100 L420 300 L120 300 Z')] });   /* ولو اختلف المعروضُ عن المخزَّن */
  c.goTo(1448, 6); c.goTo(1448, 5);
  assert.equal(S.denies, 0, 'لا رسالةَ صلاحية: ' + JSON.stringify(toasts));
  assert.equal(S.saves, 0); assert.equal(JSON.stringify(op.data[KP]), before); assert.equal(op.control.stages.length, 0);
});

test('PLAN-01: تعديلٌ لم يُحفظ في الشهر المغادَر يُحفظ مرةً واحدة عند الانتقال — ثمّ لا حفظَ في التصفّح بعده', async () => {
  const W = seeded(), { c, S, op } = W;
  c.state = Object.assign({}, c.state, { zones: [zone('M150 100 L450 100 L450 300 L150 300 Z')] });   /* مسارٌ يكتب الحالةَ ويعتمد على goTo للحفظ */
  c.goTo(1448, 6);
  assert.equal(S.saves, 1, 'حُفظ ما لم يُحفظ');
  for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r));
  assert.equal(op.control.stages.length, 1, 'دفعةُ عملياتٍ واحدة');
  const st = op.data[KP];
  assert.equal(st.months['1448-5'].d[0].zones[0].d, 'M150 100 L450 100 L450 300 L150 300 Z', 'المخزَّنُ يحمل التعديل في شهره');
  c.goTo(1448, 5); c.goTo(1448, 6); c.goTo(1448, 7);
  assert.equal(S.saves, 1, 'ولا حفظَ بعد ذلك ما دام لا تعديل');
});

test('PLAN-01: السعةُ المشتقّة (cap) ليست تعديلاً · وشهرٌ بلا خطة لا يُحفظ · وتعذُّرُ المقارنة (لا مخزَّنَ للشهر) يحفظ كما كان', () => {
  let W = seeded(); W.c.goTo(1448, 6); assert.equal(W.S.saves, 0, 'المخزَّن بسعةٍ والمعروضُ بلا سعة: لا حفظ');
  W = seeded(); W.c.state = Object.assign({}, W.c.state, { month: 9, planMonths: { '1448-5': W.c.state.planMonths['1448-5'] } }); W.c.goTo(1448, 5);
  assert.equal(W.S.saves, 0, 'مغادرةُ شهرٍ بلا خطة لا تكتب شيئاً');
  W = seeded(); W.op.data[KP] = { pMig: 3, months: {} }; W.c.goTo(1448, 6);
  assert.equal(W.S.saves, 1, 'لا نسخةَ مخزَّنة للشهر المغادَر ⇒ يُحفظ (الاحتياطُ كما كان)');
});

/* ── CANVAS-4: ضغطةُ السحب على الخريطة ── */
/* الصفحةُ بحالتها الافتراضية (موقعٌ بلا عناصر — رسمُ الصفحة لا يلزمه شيءٌ هنا) · أداةُ التحديد · عدسةُ الخطة · عرضٌ مكبَّر */
function mapPress(W, type, sel) {
  const { c } = W;
  c.state = Object.assign({}, c.state, { tool: 'select', lens: 'plan', view: { x: 200, y: 120, w: 500, h: 300 }, sel: sel ? { t: 'zone', i: 0 } : null, selMulti: [] });
  const v = c.renderVals();
  let renders = 0; const set0 = c.setState; c.setState = function () { renders++; return set0.apply(this, arguments); };
  const svg = { tagName: 'svg', isConnected: true, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 600 }), setPointerCapture() {} };
  const ev = { pointerId: 1, pointerType: type, isPrimary: true, button: 0, buttons: 1, clientX: 500, clientY: 300, currentTarget: svg, target: svg, shiftKey: false, ctrlKey: false, metaKey: false, stopPropagation() {}, preventDefault() {} };
  v.mapDown(ev);
  const atPress = renders, pan = c.state.pan;
  v.mapUp(Object.assign({}, ev, { buttons: 0 }));
  return { atPress, pan, afterUp: renders - atPress, sel: c.state.sel };
}

test('CANVAS-4: ضغطةُ سحبٍ باللمس أو القلم ولا تحديدَ يُلغى ⇒ لا رسمَ للصفحة عند الضغط · مرساةُ السحب في الحالة · رسمةٌ واحدةٌ عند الرفع', () => {
  for (const type of ['touch', 'pen']) {
    const r = mapPress(page(), type);
    assert.equal(r.atPress, 0, type + ': لا setState عند الضغط (كان يرسم الصفحة كلَّها مرتين)');
    assert.ok(r.pan && typeof r.pan.cx === 'number' && typeof r.pan.sc === 'number', type + ': المرساةُ مكتوبةٌ في الحالة لسحب العرض');
    assert.equal(r.afterUp, 1, type + ': رسمةٌ واحدة عند الرفع');
  }
});

test('CANVAS-4: بالفأرة يبقى الرسمُ عند الضغط (مؤشّرُ «grabbing») · وتحديدٌ قائمٌ يُلغى ويُرسم كما كان', () => {
  const m = mapPress(page(), 'mouse');
  assert.ok(m.atPress >= 1, 'الفأرة: رسمٌ عند الضغط كما كان');
  const s = mapPress(page(), 'touch', true);
  assert.ok(s.atPress >= 1, 'نقرةٌ على الفارغ تُلغي التحديدَ القائم وتُرسم');
  assert.equal(s.sel, null, 'التحديدُ أُلغي');
});
