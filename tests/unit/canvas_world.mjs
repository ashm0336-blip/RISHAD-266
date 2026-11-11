/* عالمُ الكانفس للاختبار: طبقةُ إدخال الخريطة الحقيقية (src/components/560-canvas-input.js) داخل node:vm فوق محاكٍ صغيرٍ لتوزيع الأحداث كما في المتصفح —
   التقاطُ النافذة ثمّ الوثيقة · ثمّ معالجاتُ React على العناصر صعوداً (__reactProps$w1: onPointerDown …) · stopPropagation يوقف ما بعده ·
   مؤقّتاتٌ وإطاراتٌ يدوية · ساعةٌ قابلةٌ للضبط. اختيارياً: منطقُ صفحةٍ حقيقيّ (المتابعة اليومية · التشغيل الميداني) بخدماته في السياق نفسِه
   (بدائلُ صغيرة للمصادقة والصلاحيات والبحث). بياناتٌ اصطناعية (TEST_ONLY) — لا شبكةَ ولا متصفح.
   CANVAS_SRC=<مسار> يبدّل ملفَّ الطبقة · DAILY_LOGIC / PLAN_LOGIC=<مسار> يبدّلان ملفَّ المنطق (لإثبات الإخفاق على السابق). */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { ROOT, SRC, moduleLogic } from './harness.mjs';

export const CANVAS = process.env.CANVAS_SRC || path.join(SRC, 'components', '560-canvas-input.js');
const PROP = { pointerdown: 'onPointerDown', pointermove: 'onPointerMove', pointerup: 'onPointerUp', pointercancel: 'onPointerCancel', click: 'onClick', dblclick: 'onDoubleClick' };
const SERVICES = ['src/services/060-percent-format.js', 'src/services/390-kpi-primitives.js', 'src/services/400-shift-need.js', 'src/services/440-count.js', 'src/services/410-gate-units.js', 'src/i18n/380-hijri-fallback.js',
  'src/services/420-round-factory.js', 'src/services/490-emp-key.js', 'src/services/290-activity-log.js', 'src/components/565-page-kit.js'];

export function world() {
  const T = { now: 1000 }, timers = [], frames = [], store = new Map();
  const listeners = (o) => { o.__l = { capture: {}, bubble: {} }; o.addEventListener = (t, f, opt) => { const c = opt === true || !!(opt && opt.capture); (o.__l[c ? 'capture' : 'bubble'][t] = o.__l[c ? 'capture' : 'bubble'][t] || []).push(f); }; o.removeEventListener = () => {}; return o; };
  const win = listeners({}), doc = listeners({});
  class El {
    constructor(tag, parent, attrs = {}) { this.tagName = tag; this.attrs = Object.assign({}, attrs); this.style = {}; this.children = []; this.parentNode = null; this.rect = null; if (parent) parent.append(this); }
    append(c) { c.parentNode = this; this.children.push(c); return c; }
    remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((x) => x !== this); this.parentNode = null; }
    get isConnected() { let n = this; while (n.parentNode) n = n.parentNode; return n === root; }
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; } setAttribute(k, v) { this.attrs[k] = String(v); } removeAttribute(k) { delete this.attrs[k]; } hasAttribute(k) { return k in this.attrs; }
    matches(sel) { return sel.split(',').some((s) => { const m = /^\s*([a-z]+)?(?:\[([\w-]+)\])?\s*$/i.exec(s); return !!m && (!m[1] || m[1].toLowerCase() === this.tagName.toLowerCase()) && (!m[2] || this.hasAttribute(m[2])); }); }
    closest(sel) { for (let n = this; n; n = n.parentNode) if (n.matches && n.matches(sel)) return n; return null; }
    querySelectorAll(sel) { const out = []; const walk = (n) => { for (const c of n.children) { if (c.matches(sel)) out.push(c); walk(c); } }; walk(this); return out; }
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
    getBoundingClientRect() { return this.rect || { left: 0, top: 0, width: 1000, height: 600, right: 1000, bottom: 600 }; }
    setPointerCapture() {} releasePointerCapture() {}
    cloneNode() { return new El(this.tagName, null, this.attrs); }
    insertBefore(c) { return this.append(c); }
  }
  const root = new El('html'), body = new El('body', root);
  doc.documentElement = root; doc.body = body; doc.hidden = false;
  doc.querySelector = (s) => root.querySelector(s); doc.querySelectorAll = (s) => root.querySelectorAll(s); doc.getElementById = () => null;
  const KIVO = {};
  const ctx = { KIVO, console, document: doc, performance: { now: () => T.now }, Map, Date,   /* V7 P3: ساعةُ الاختبار (المثبَّتة إن استورد الملفُّ clock.mjs) تصل الصفحةَ داخل vm — كان لها تاريخُها الحقيقي فيخالف شهرَ بيانات الاختبار */
    setTimeout: (f) => { timers.push(f); return timers.length; }, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    requestAnimationFrame: (f) => { frames.push(f); return frames.length; }, cancelAnimationFrame: () => {},
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    navigator: { userAgent: 'node' }, fetch: () => new Promise(() => {}), __BS_BOOT: { srv: 0 }, React: { createElement: (t, p, ...ch) => ({ t, p, ch }), Fragment: 'F' } };
  Object.assign(win, ctx); win.window = win; win.globalThis = win;
  vm.createContext(win);
  vm.runInContext(fs.readFileSync(CANVAS, 'utf8'), win, { filename: path.basename(CANVAS) });
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
  /* منطقُ صفحةٍ حقيقيّ في السياق نفسِه (slug: daily · plan) — يُعيد مثيلاً جديداً من Component */
  function logic(slug, src) {
    class DCLogic { constructor() { this.state = {}; } setState(p, cb) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); if (cb) cb(); } }
    win.DCLogic = DCLogic;
    for (const f of SERVICES) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), win, { filename: f });
    KIVO.BassamFind = { dig: (v) => String(v == null ? '' : v), norm: (v) => String(v == null ? '' : v), filter: (q, list) => list, match: () => true };
    KIVO.__bsMixOn = () => false;
    KIVO.__bsCssObj = KIVO.__bsCssObj || (() => ({}));                         /* من 050-dc-runtime (نصُّ CSS ← كائن) — لا يلزم الرسمَ هنا */
    KIVO.BassamPerm = { can: () => true, on: () => true, lensOn: () => true };
    KIVO.BassamAuth = { user: () => ({ id: 'TEST_ONLY_dm', role: 'staff', mgr: true, deptId: 'tst_d1' }), isSuper: () => false, display: () => ({ name: 'TEST_ONLY' }), users: () => [] };
    KIVO.BassamDepts = { active: () => 'tst_d1', activeName: () => 'TEST_ONLY', list: () => [] };
    /* RISHAD-266 · schema 10: operational resources (bassam_plan_v1 · bassam_rounds_v1 · …) are read/written through KIVO.__BS_SRV.operations,
       not localStorage. Synthetic service over the same local store (as in a11y_touch_w2): commit applies the draft and acknowledges ok:1. */
    const draftOf = () => { const w = new Map(); return { get: (k) => (w.has(k) ? w.get(k) : (store.has(k) ? JSON.parse(store.get(k)) : null)), set: (k, v) => w.set(k, v), w }; };
    KIVO.__BS_SRV = Object.assign(KIVO.__BS_SRV || {}, { rev: () => 0, operations: { resources: [], status: () => ({ state: 'idle', epoch: 0 }), begin: () => ({ ok: 1 }), context: () => null, state: () => 'ready', draft: draftOf,
      get: (k) => (store.has(k) ? JSON.parse(store.get(k)) : null),
      commit: async (c, slot, intent, edit) => { const d = draftOf(); edit(d); for (const [k, v] of d.w) store.set(k, JSON.stringify(v)); return { ok: 1 }; } } });
    const B0 = KIVO.BassamPageKit.base; KIVO.BassamPageKit.base = (B, a) => class extends B0(B, a) { bsOn() { return true; } bsLensOn() { return true; } bsToast() {} };
    vm.runInContext((src || moduleLogic(slug)) + '\n;globalThis.__C = Component;', win, { filename: slug + '/logic.js' });
    return new win.__C();
  }
  return { T, win, doc, body, El, KIVO, P, dispatch, flushFrames, flushTimers, store, logic };
}
/* عنصرٌ يحمل مفتاحَ React (كما تضعه الصفحة) ومعالجاتِه */
export function node(W, tag, parent, key, props, attrs) {
  const el = new W.El(tag, parent, attrs || {});
  if (key != null) el['__reactFiber$w1'] = { key };
  if (props) el.__reactProps$w1 = props;
  return el;
}
export const tp = (x, y, id, o = {}) => Object.assign({ clientX: x, clientY: y, pointerId: id, pointerType: 'touch', isPrimary: id === 1 }, o);
