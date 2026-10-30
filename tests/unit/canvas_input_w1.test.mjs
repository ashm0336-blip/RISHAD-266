/* SOT-054 · SOT-056 · SOT-154: الجزء المثبت هنا هو توزيع لمس/قلم اصطناعي ورفض راحة الكف على طبقة الإدخال الحقيقية؛
   يظل اختبار الجوال والقلم الفعليين خارج هذه المحاكاة.
   W1 · الكانفس على اللوحي — طبقةُ إدخال الخريطة الحقيقية (src/components/560-canvas-input.js) داخل node:vm فوق محاكٍ صغيرٍ لتوزيع الأحداث
   كما في المتصفح: التقاطُ النافذة ثمّ الوثيقة · ثمّ معالجاتُ React على العناصر صعوداً (onPointerDown …) · stopPropagation يوقف ما بعده ·
   والإصبعُ مأسورٌ ضمناً بعنصر نزوله. منطقُ الصفحة بديلٌ صغيرٌ بقواعد الخطة نفسِها: ضغطةُ المصلّى تُوقف الحدثَ وتبدأ سحبه (zdrag) ·
   الضغطُ على الخريطة الفارغة سحبٌ للعرض · الرفعُ يعتمد السحبَ ويحفظ. بياناتٌ اصطناعية (TEST_ONLY) — لا شبكةَ ولا متصفح.
     CANVAS-1: إصبعان يبدآن على مصلّى ⇒ تكبيرٌ لا سحب (كان المصلّى يُسحب ويهتزّ بين الإصبعين كلَّ إطار ثمّ يُحفظ حيث وقف)
     CANVAS-3: النقرةُ المولَّدة من لمسةٍ بدأت على الخريطة لا تقع على نافذةٍ فُتحت تحت الإصبع (كان إغلاقُ المضلّع يُنشئ المصلّى ثمّ يحذفه)
   CANVAS_SRC=<مسار> يبدّل ملفَّ الطبقة (لإثبات أنّ الاختبارات تُخفق على الطبقة السابقة). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { SRC } from './harness.mjs';

const FILE = process.env.CANVAS_SRC || path.join(SRC, 'components', '560-canvas-input.js');
const PROP = { pointerdown: 'onPointerDown', pointermove: 'onPointerMove', pointerup: 'onPointerUp', pointercancel: 'onPointerCancel', click: 'onClick' };

/* ── المحاكي: عناصر · توزيعُ الأحداث · مؤقّتاتٌ وإطاراتٌ يدوية · ساعةٌ قابلةٌ للضبط ── */
function world() {
  const T = { now: 1000 }, timers = [], frames = [];
  const listeners = (o) => { o.__l = { capture: {}, bubble: {} }; o.addEventListener = (t, f, opt) => { const c = opt === true || !!(opt && opt.capture); (o.__l[c ? 'capture' : 'bubble'][t] = o.__l[c ? 'capture' : 'bubble'][t] || []).push(f); }; o.removeEventListener = () => {}; return o; };
  const win = listeners({}), doc = listeners({});
  class El {
    constructor(tag, parent, attrs = {}) { this.tagName = tag; this.attrs = Object.assign({}, attrs); this.style = {}; this.children = []; this.parentNode = null; if (parent) parent.append(this); }
    append(c) { c.parentNode = this; this.children.push(c); return c; }
    remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((x) => x !== this); this.parentNode = null; }
    get isConnected() { let n = this; while (n.parentNode) n = n.parentNode; return n === root; }
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; } setAttribute(k, v) { this.attrs[k] = String(v); } removeAttribute(k) { delete this.attrs[k]; } hasAttribute(k) { return k in this.attrs; }
    matches(sel) { return sel.split(',').some((s) => { const m = /^\s*([a-z]+)?(?:\[([\w-]+)\])?\s*$/i.exec(s); return !!m && (!m[1] || m[1].toLowerCase() === this.tagName.toLowerCase()) && (!m[2] || this.hasAttribute(m[2])); }); }
    closest(sel) { for (let n = this; n; n = n.parentNode) if (n.matches && n.matches(sel)) return n; return null; }
    querySelectorAll(sel) { const out = []; const walk = (n) => { for (const c of n.children) { if (c.matches(sel)) out.push(c); walk(c); } }; walk(this); return out; }
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 1000, height: 600, right: 1000, bottom: 600 }; }
    setPointerCapture() {} releasePointerCapture() {}
  }
  const root = new El('html'), body = new El('body', root);
  doc.documentElement = root; doc.body = body;
  doc.querySelector = (s) => root.querySelector(s); doc.querySelectorAll = (s) => root.querySelectorAll(s); doc.getElementById = () => null;
  const KIVO = {};
  const ctx = { KIVO, console, document: doc, performance: { now: () => T.now },
    setTimeout: (f) => { timers.push(f); return timers.length; }, clearTimeout: () => {},
    requestAnimationFrame: (f) => { frames.push(f); return frames.length; }, cancelAnimationFrame: () => {} };
  Object.assign(win, ctx); win.window = win; win.globalThis = win;
  vm.createContext(win);
  vm.runInContext(fs.readFileSync(FILE, 'utf8'), win, { filename: path.basename(FILE) });
  const P = KIVO.BassamPointer;
  /* التوزيع: التقاطُ النافذة ← الوثيقة · ثمّ معالجاتُ React من الهدف صعوداً · ثمّ فقاعةُ الوثيقة ← النافذة */
  function dispatch(target, type, o = {}) {
    let stop = false;
    const ev = Object.assign({ type, isTrusted: true, bubbles: true, cancelable: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, detail: type === 'click' ? 1 : 0,
      pointerId: 1, pointerType: 'touch', isPrimary: true, clientX: 0, clientY: 0, shiftKey: false, ctrlKey: false, metaKey: false, altKey: false }, o, { target });
    ev.stopPropagation = () => { stop = true; }; ev.preventDefault = () => { ev.defaultPrevented = true; };
    const run = (node, phase) => { for (const f of (node.__l[phase][type] || []).slice()) { ev.currentTarget = node; f.call(node, ev); if (stop) return true; } return false; };
    if (run(win, 'capture') || run(doc, 'capture')) return ev;
    for (let n = target; n; n = n.parentNode) { const pr = n.__reactProps$w1, h = pr && pr[PROP[type]]; if (h) { ev.currentTarget = n; h(ev); if (stop) return ev; } }
    if (run(doc, 'bubble')) return ev;
    run(win, 'bubble');
    return ev;
  }
  const flushFrames = () => { while (frames.length) frames.splice(0).forEach((f) => f()); };
  const flushTimers = () => { while (timers.length) timers.splice(0).forEach((f) => f()); };
  return { T, win, doc, body, El, KIVO, P, dispatch, flushFrames, flushTimers };
}

/* خريطةٌ بمصلّى واحد ومنطقُ صفحةٍ بقواعد الخطة: مصلّى (100..400 × 100..300) بإزاحة ox/oy · العرضُ مكبَّرٌ قليلاً كي يُرى السحب */
function plan(o = {}) {
  const W = world(), { El, P, body } = W;
  const box = (ox, oy) => 'M' + (100 + ox) + ' ' + (100 + oy) + ' L' + (400 + ox) + ' ' + (100 + oy) + ' L' + (400 + ox) + ' ' + (300 + oy) + ' L' + (100 + ox) + ' ' + (300 + oy) + ' Z';
  const C = { zone: 0, down: 0, move: [], up: 0, saves: 0, views: [], clicks: 0, closes: 0, cancels: 0 };
  const L = { state: { tool: o.tool || 'select', lens: 'plan', view: { x: 200, y: 100, w: 500, h: 300 }, sel: null, zdrag: null, pan: null, polyPts: [], polyCursor: null,
    zones: [{ uid: 'TEST_ONLY_z1', ox: 0, oy: 0, d: box(0, 0) }], gates: [], marks: [], paths: [], floors: [{}], floor: 0 } };
  L.setState = function (u, cb) { const p = typeof u === 'function' ? u(L.state) : u; L.state = Object.assign({}, L.state, p); if (cb) cb(); };
  const app = new El('div', body), svg = new El('svg', app, { 'data-map-zoom': '1' }), g = new El('g', svg), zp = new El('path', g);
  Object.defineProperty(zp.attrs, 'd', { get: () => L.state.zones[0].d, set: () => {}, enumerable: true, configurable: true });
  let back = null;
  const A = P.api(() => L.state.view, (v) => { C.views.push(v); L.setState({ view: v }); }, () => { C.cancels++; }, L, 'plan');
  const mapDown = (e) => {
    C.down++;
    if (L.state.tool === 'poly') {   /* إغلاقُ المضلّع: المصلّى يُنشأ ومحرّرُه (نافذةٌ بخلفيةٍ تغطي الشاشة) يُفتح في الضغطة نفسِها */
      L.setState({ zones: L.state.zones.concat([{ uid: 'TEST_ONLY_new', ox: 0, oy: 0, d: 'M0 0 L1 0 L1 1 Z', isNew: 1 }]), zEdit: 1, tool: 'select' });
      back = new El('div', body, { 'data-bd': '1' });
      back.__reactProps$w1 = { onClick: (ev) => { if (ev.target === back) { C.closes++; L.setState({ zones: L.state.zones.filter((z) => !z.isNew), zEdit: null }); back.remove(); } } };
      return;
    }
    L.state = Object.assign({}, L.state, { pan: { cx: e.clientX, cy: e.clientY, vx: L.state.view.x, vy: L.state.view.y } });
  };
  const mapMove = (e) => {
    C.move.push(e.pointerId);
    const s = L.state;
    if (s.zdrag) { const ox = s.zdrag.ox0 + (e.clientX - s.zdrag.sx) / 2, oy = s.zdrag.oy0 + (e.clientY - s.zdrag.sy) / 2; L.setState({ zones: [Object.assign({}, s.zones[0], { ox, oy, d: box(ox, oy) })].concat(s.zones.slice(1)) }); return; }
    if (s.pan) P.panTo(A, Object.assign({}, s.view, { x: s.pan.vx - (e.clientX - s.pan.cx) / 2, y: s.pan.vy - (e.clientY - s.pan.cy) / 2 }));
  };
  const mapUp = () => { C.up++; const s = L.state; if (s.zdrag) return void L.setState({ zdrag: null }, () => { C.saves++; }); if (s.pan) L.setState({ pan: null }); };
  svg.__reactProps$w1 = { onPointerDown: P.w('down', mapDown, A), onPointerMove: P.w('move', mapMove, A), onPointerUp: P.w('up', mapUp, A), onPointerCancel: P.w('up', mapUp, A), onClick: () => { C.clicks++; } };
  /* ضغطةُ المصلّى كما في الخطة: تُوقف الحدث (فلا تبلغ الخريطة) وتحدّده وتبدأ سحبه من موضع هذا الإصبع */
  g.__reactProps$w1 = { onPointerDown: (e) => { C.zone++; e.stopPropagation(); const z = L.state.zones[0]; L.setState({ sel: { t: 'zone', i: 0 }, zdrag: { sx: e.clientX, sy: e.clientY, ox0: z.ox, oy0: z.oy } }); } };
  const Z = () => ({ ox: L.state.zones[0].ox, oy: L.state.zones[0].oy });
  const vb = () => svg.getAttribute('viewBox');
  return Object.assign(W, { L, A, C, svg, zp, Z, vb, back: () => back, box });
}
const tp = (x, y, id, o = {}) => Object.assign({ clientX: x, clientY: y, pointerId: id, pointerType: 'touch', isPrimary: id === 1 }, o);

test('CANVAS-1: إصبعان يبدآن على مصلّى ⇒ تكبيرٌ لا سحب — المصلّى ثابتٌ في كل إطار ولا يُحفظ (الإصبعُ الأوّل ساكنٌ في الإطارات الفردية كقرصةٍ حقيقية)', () => {
  const W = plan(), { dispatch: D, zp, C } = W;
  D(zp, 'pointerdown', tp(420, 300, 1));
  D(zp, 'pointerdown', tp(580, 300, 2));
  assert.equal(C.zone, 1, 'الإصبعُ الثاني لا يبلغ المصلّى تحته (كان يأخذ السحبَ من الأوّل)');
  const ox = new Set(), vbs = new Set();
  let x1 = 420, x2 = 580;
  for (let k = 1; k <= 40; k++) {
    x2 += 3; D(zp, 'pointermove', tp(x2, 300 + k, 2));
    if (k % 2 === 0) { x1 -= 3; D(zp, 'pointermove', tp(x1, 300 - k, 1)); }
    W.flushFrames();
    ox.add(JSON.stringify(W.Z())); vbs.add(W.vb());
  }
  assert.deepEqual([...ox], [JSON.stringify({ ox: 0, oy: 0 })], 'موضعُ المصلّى ثابتٌ في كل إطار: ' + [...ox].slice(0, 4).join(' | '));
  assert.ok(vbs.size >= 30, 'العرضُ يتكبّر إطاراً بإطار (viewBox متغيّرٌ: ' + vbs.size + ')');
  D(zp, 'pointerup', tp(x2, 340, 2)); D(zp, 'pointerup', tp(x1, 260, 1)); W.flushTimers();
  assert.equal(C.saves, 0, 'لا حفظَ لمصلّى لم يُحرَّك');
  assert.equal(W.L.state.zdrag, null, 'السحبُ الذي بدأته ضغطةُ الإصبع الأوّل أُلغي');
  const v = W.L.state.view; assert.ok(v.w < 500, 'اعتُمد العرضُ المكبَّر في الحالة عند الرفع: ' + JSON.stringify(v));
});

test('CANVAS-1: الإصبعُ الأوّل سحب المصلّى لحظةً (≤ 350ms) ثمّ نزل الثاني ⇒ يعود المصلّى إلى موضعه والإيماءةُ تكبيرٌ من أوّلها', () => {
  const W = plan(), { dispatch: D, zp, C } = W;
  D(zp, 'pointerdown', tp(420, 300, 1));
  for (let k = 1; k <= 6; k++) { W.T.now += 16; D(zp, 'pointermove', tp(420 + 5 * k, 300, 1)); W.flushFrames(); }
  assert.ok(W.Z().ox > 0, 'المصلّى تحرّك مع الإصبع الأوّل وحدَه');
  W.T.now += 40; D(zp, 'pointerdown', tp(600, 300, 2));
  assert.deepEqual(W.Z(), { ox: 0, oy: 0 }, 'عاد إلى موضعه لحظةَ نزول الإصبع الثاني');
  for (let k = 1; k <= 10; k++) { D(zp, 'pointermove', tp(600 + 4 * k, 300, 2)); D(zp, 'pointermove', tp(450 - 4 * k, 300, 1)); W.flushFrames(); }
  assert.deepEqual(W.Z(), { ox: 0, oy: 0 });
  D(zp, 'pointerup', tp(640, 300, 2)); D(zp, 'pointerup', tp(410, 300, 1)); W.flushTimers();
  assert.equal(C.saves, 0, 'لا حفظ');
});

test('CANVAS-1: سحبٌ مقصودٌ بإصبعٍ واحد ثمّ إصبعٌ ثانٍ بعد المهلة ⇒ يُعتمد السحبُ مرةً واحدة ثمّ يبدأ التكبير ولا يتحرّك المصلّى بعدها', () => {
  const W = plan(), { dispatch: D, zp, C } = W;
  D(zp, 'pointerdown', tp(420, 300, 1));
  for (let k = 1; k <= 6; k++) { W.T.now += 100; D(zp, 'pointermove', tp(420 + 5 * k, 300, 1)); W.flushFrames(); }
  const moved = W.Z(); assert.ok(moved.ox > 0);
  D(zp, 'pointerdown', tp(600, 300, 2));
  assert.equal(C.saves, 1, 'السحبُ اعتُمد وحُفظ عند نزول الثاني');
  for (let k = 1; k <= 10; k++) { D(zp, 'pointermove', tp(600 + 4 * k, 300, 2)); D(zp, 'pointermove', tp(450 - 4 * k, 300, 1)); W.flushFrames(); }
  assert.deepEqual(W.Z(), moved, 'المصلّى حيث تركه السحب — لا يتبع أيَّ إصبع أثناء التكبير');
  D(zp, 'pointerup', tp(640, 300, 2)); D(zp, 'pointerup', tp(410, 300, 1)); W.flushTimers();
  assert.equal(C.saves, 1, 'لا حفظَ ثانياً');
});

test('CANVAS-1: الإصبعُ الأوّل على الخريطة الفارغة والثاني على مصلّى ⇒ تكبير · والمصلّى لا يُمسّ', () => {
  const W = plan(), { dispatch: D, svg, zp, C } = W;
  D(svg, 'pointerdown', tp(150, 500, 1));
  D(zp, 'pointerdown', tp(600, 300, 2));
  assert.equal(C.zone, 0, 'المصلّى تحت الإصبع الثاني لم يُضغط');
  const vbs = new Set();
  for (let k = 1; k <= 12; k++) { D(zp, 'pointermove', tp(600 + 5 * k, 300 + k, 2)); D(svg, 'pointermove', tp(150 - 3 * k, 500 - k, 1)); W.flushFrames(); vbs.add(W.vb()); }
  assert.ok(vbs.size >= 10, 'تكبير'); assert.deepEqual(W.Z(), { ox: 0, oy: 0 });
});

test('CANVAS-1: حركةُ مؤشّرٍ ثانٍ بلا إيماءةٍ معروفة (isPrimary=false) لا تقود سحباً أبداً', () => {
  const W = plan(), { dispatch: D, zp, C } = W;
  W.L.setState({ zdrag: { sx: 0, sy: 0, ox0: 0, oy0: 0 }, sel: { t: 'zone', i: 0 } });
  D(zp, 'pointermove', tp(300, 300, 7, { isPrimary: false, pointerType: 'mouse' })); W.flushFrames();
  assert.equal(C.move.length, 0, 'لم يبلغ منطقَ الصفحة'); assert.deepEqual(W.Z(), { ox: 0, oy: 0 });
});

test('CANVAS-1: إصبعٌ رُفع خارج الخريطة لا يترك إيماءةً معلّقة — اللمسةُ التالية سحبٌ للعرض لا تكبير، وسحبُه المعلّق يُعتمد', () => {
  const W = plan(), { dispatch: D, svg, body, C } = W;
  D(svg, 'pointerdown', tp(300, 300, 1));
  D(svg, 'pointermove', tp(320, 300, 1)); W.flushFrames();
  D(body, 'pointerup', tp(320, 300, 1)); W.flushTimers();                     /* الرفعُ وقع خارج الخريطة: لم يبلغ معالجَها */
  assert.equal(C.up, 1, 'رفعُ السحب اعتُمد كما لو بلغ المعالج');
  assert.equal(W.L.state.pan, null);
  const v0 = W.L.state.view;
  D(svg, 'pointerdown', tp(300, 300, 2));
  for (let k = 1; k <= 8; k++) { D(svg, 'pointermove', tp(300 + 10 * k, 300, 2)); W.flushFrames(); }
  D(svg, 'pointerup', tp(380, 300, 2)); W.flushTimers();
  const v1 = W.L.state.view;
  assert.equal(v1.w, v0.w, 'لمسةٌ واحدة لا تكبّر (كانت الإيماءةُ المعلّقة تجعلها «إصبعاً ثانياً»)');
  assert.ok(v1.x < v0.x, 'بل تسحب العرض: ' + JSON.stringify([v0, v1]));
});

test('CANVAS-1: راحةُ الكفّ على مصلّى أثناء سحبة القلم عليه تُهمَل — لا تبلغ المصلّى ولا تأخذ السحب', () => {
  const W = plan(), { dispatch: D, zp, C } = W;
  const pen = (x, y) => ({ clientX: x, clientY: y, pointerId: 9, pointerType: 'pen', isPrimary: true });
  D(zp, 'pointerdown', pen(300, 300));
  D(zp, 'pointerdown', tp(500, 400, 3, { isPrimary: false }));
  assert.equal(C.zone, 1, 'الكفُّ لم يضغط المصلّى');
  for (let k = 1; k <= 8; k++) { D(zp, 'pointermove', pen(300 + 10 * k, 300)); D(zp, 'pointermove', tp(500 + 3 * k, 400 + 2 * k, 3, { isPrimary: false })); W.flushFrames(); }
  D(zp, 'pointerup', pen(380, 300)); D(zp, 'pointerup', tp(524, 416, 3, { isPrimary: false })); W.flushTimers();
  assert.deepEqual(W.Z(), { ox: 40, oy: 0 }, 'المصلّى تبع القلمَ وحدَه'); assert.equal(C.saves, 1);
});

test('CANVAS-3: إغلاقُ المضلّع بلمسة ⇒ النقرةُ المولَّدة من اللمسة نفسِها لا تقع على خلفية المحرّر الذي فُتح تحت الإصبع — المصلّى الجديد باقٍ', () => {
  const W = plan({ tool: 'poly' }), { dispatch: D, svg, C } = W;
  D(svg, 'pointerdown', tp(140, 270, 1));
  assert.equal(W.L.state.zones.length, 2, 'أُنشئ المصلّى وفُتح محرّرُه في الضغطة');
  D(svg, 'pointerup', tp(140, 270, 1)); W.flushTimers();
  D(W.back(), 'click', tp(140, 270, 1));                                      /* المتصفّح يُطلق النقرةَ حيث الإصبع: على الخلفية الجديدة */
  assert.equal(C.closes, 0, 'المحرّرُ لم يُغلق'); assert.equal(W.L.state.zones.length, 2, 'المصلّى الجديد لم يُحذف'); assert.equal(W.L.state.zEdit, 1);
  /* ضغطةٌ مقصودةٌ على الخلفية نفسِها ما زالت تُغلقه */
  D(W.back(), 'pointerdown', tp(5, 5, 4)); D(W.back(), 'pointerup', tp(5, 5, 4)); W.flushTimers(); D(W.back(), 'click', tp(5, 5, 4));
  assert.equal(C.closes, 1, 'النقرُ على الخلفية بضغطةٍ بدأت عليها يُغلق المحرّر كما كان');
});

test('CANVAS-3: النقرةُ التي بدأت وانتهت على الخريطة نفسِها تعمل كما كانت · ونقرةُ لوحة المفاتيح (detail=0) لا تُمسّ', () => {
  const W = plan(), { dispatch: D, svg, body, C } = W;
  D(svg, 'pointerdown', tp(150, 500, 1)); D(svg, 'pointerup', tp(150, 500, 1)); W.flushTimers(); D(svg, 'click', tp(150, 500, 1));
  assert.equal(C.clicks, 1, 'نقرةُ الخريطة بلغت معالجَها');
  const btn = new W.El('button', body); let n = 0; btn.__reactProps$w1 = { onClick: () => { n++; } };
  D(svg, 'pointerdown', tp(150, 500, 2)); D(svg, 'pointerup', tp(150, 500, 2)); W.flushTimers();
  D(btn, 'click', { detail: 0, pointerType: '' });
  assert.equal(n, 1, 'تفعيلُ زرٍّ بلوحة المفاتيح بعد ضغطةٍ على الخريطة يعمل');
});
