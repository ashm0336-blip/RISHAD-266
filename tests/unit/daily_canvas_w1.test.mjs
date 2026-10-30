/* SOT-052 · SOT-054 · SOT-056 · SOT-154: تغطية جزئية لإدخال mouse/touch/pen على منطق الصفحة الحقيقي بأحداث اصطناعية؛
   لا تثبت أجهزة فعلية أو تخطيط كل شاشة أو اعتماد مصفوفة الأجهزة النهائية.
   W1 · CANVAS-4 في خريطة «الجولات اليومية» — منطقُ المتابعة اليومية الحقيقي (src/modules/daily/logic.js) داخل node:vm مع الخدمات الحقيقية
   وطبقةِ الإدخال 560 (بدائلُ صغيرة للمصادقة والصلاحيات والبحث · بياناتٌ اصطناعية TEST_ONLY): ضغطةُ سحب العرض (dsDown) كانت ترسم الصفحةَ كلَّها
   في الحال فيتجمّد الإطارُ الأوّل على اللوحي ثمّ يقفز. الآن باللمس والقلم — ولا تحديدَ يُلغى — تُكتب مرساةُ السحب في الحالة بلا رسم، ورسمةٌ
   واحدةٌ عند الرفع (dsUp). الفأرةُ كما كانت (مؤشّرُ «grabbing»).  DAILY_LOGIC=<مسار> يبدّل ملفَّ المنطق (لإثبات الإخفاق على السابق). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { ROOT, moduleLogic } from './harness.mjs';

const LOGIC = process.env.DAILY_LOGIC ? fs.readFileSync(process.env.DAILY_LOGIC, 'utf8') : moduleLogic('daily');
const SERVICES = ['src/services/390-kpi-primitives.js', 'src/services/400-shift-need.js', 'src/services/440-count.js', 'src/services/410-gate-units.js', 'src/i18n/380-hijri-fallback.js',
  'src/services/420-round-factory.js', 'src/services/490-emp-key.js', 'src/services/290-activity-log.js', 'src/components/560-canvas-input.js', 'src/components/565-page-kit.js'];

function page() {
  const store = new Map(), KIVO = {};
  const ctx = { KIVO, console, setTimeout: () => 0, clearTimeout: () => 0, setInterval: () => 0, clearInterval: () => 0, requestAnimationFrame: () => 0, cancelAnimationFrame() {}, performance: { now: () => 1 },
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    document: { hidden: false, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, addEventListener() {}, removeEventListener() {} },
    navigator: { userAgent: 'node' }, addEventListener() {}, removeEventListener() {}, __BS_BOOT: { srv: 0 }, React: { createElement: (t, p, ...ch) => ({ t, p, ch }), Fragment: 'F' } };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  class DCLogic { constructor() { this.state = {}; } setState(p, cb) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); if (cb) cb(); } }
  ctx.DCLogic = DCLogic;
  for (const f of SERVICES) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  KIVO.BassamFind = { dig: (v) => String(v == null ? '' : v), norm: (v) => String(v == null ? '' : v), filter: (q, list) => list, match: () => true };
  KIVO.__bsMixOn = () => false;
  KIVO.BassamPerm = { can: () => true, on: () => true, lensOn: () => true };
  KIVO.BassamAuth = { user: () => ({ id: 'TEST_ONLY_dm', role: 'staff', mgr: true, deptId: 'tst_d1' }), isSuper: () => false, display: () => ({ name: 'TEST_ONLY' }), users: () => [] };
  KIVO.BassamDepts = { active: () => 'tst_d1', activeName: () => 'TEST_ONLY', list: () => [] };
  const B0 = KIVO.BassamPageKit.base; KIVO.BassamPageKit.base = (B, a) => class extends B0(B, a) { bsOn() { return true; } bsLensOn() { return true; } bsToast() {} };
  vm.runInContext(LOGIC + '\n;globalThis.__C = Component;', ctx, { filename: 'daily/logic.js' });
  return new ctx.__C();
}
/* ضغطةُ سحبٍ على موضعٍ فارغ من الخريطة ثمّ رفع: كم رسمةً عند الضغط وكم عند الرفع */
function press(type, st = {}) {
  const c = page();
  c.state = Object.assign({}, c.state, { tool: 'select', lens: 'status', dview: { x: 200, y: 120, w: 500, h: 300 }, dsSel: null }, st);
  const v = c.renderVals();
  let renders = 0; const set0 = c.setState; c.setState = function () { renders++; return set0.apply(this, arguments); };
  const svg = { tagName: 'svg', isConnected: true, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 600 }), setPointerCapture() {} };
  const ev = { pointerId: 1, pointerType: type, isPrimary: true, button: 0, buttons: 1, clientX: 500, clientY: 300, currentTarget: svg, target: svg, shiftKey: false, ctrlKey: false, metaKey: false, stopPropagation() {}, preventDefault() {} };
  v.dsDown(ev);
  const atPress = renders, pan = c.state.dsPan, sel = c.state.dsSel;
  v.dsUp(Object.assign({}, ev, { buttons: 0 }));
  return { atPress, pan, sel, afterUp: renders - atPress, panAfter: c.state.dsPan };
}

test('CANVAS-4 (الجولات اليومية): ضغطةُ سحبٍ باللمس أو القلم ⇒ لا رسمَ عند الضغط · المرساةُ في الحالة · رسمةٌ واحدةٌ عند الرفع تُزيلها', () => {
  for (const type of ['touch', 'pen']) {
    const r = press(type);
    assert.equal(r.atPress, 0, type + ': لا setState عند الضغط');
    assert.ok(r.pan && typeof r.pan.cx === 'number' && typeof r.pan.sc === 'number', type + ': مرساةُ السحب مكتوبة');
    assert.equal(r.afterUp, 1, type + ': رسمةٌ واحدة عند الرفع'); assert.equal(r.panAfter, null);
  }
});

test('CANVAS-4 (الجولات اليومية): بالفأرة يُرسم عند الضغط كما كان · وتحديدٌ قائمٌ في عدسةٍ لا تحرير فيها يبقى كما هو', () => {
  assert.ok(press('mouse').atPress >= 1, 'الفأرة: رسمٌ عند الضغط (المؤشّر)');
  const r = press('touch', { dsSel: { t: 'zone', i: 0 } });
  assert.deepEqual(r.sel, { t: 'zone', i: 0 }, 'التحديدُ باقٍ (العدسةُ ليست تحريرَ المصليات)');
  assert.equal(r.atPress, 0);
});
