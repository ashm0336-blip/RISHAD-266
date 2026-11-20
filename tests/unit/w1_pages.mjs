/* الموجة 1 (منطق/قفزات) — عُدّةُ صفحةٍ في vm بلا خادم وبساعةٍ ثابتة: منطقُ الوحدة الحقيقي (logic.js وأجزاؤه بترتيب meta.json) فوق
   KIVO.BassamPageKit الحقيقي وخدماتِ العدّ والنِّسَب ونموذجِ المهام — والصلاحياتُ تُحقن (can(page, act)) لاختبار ما يراه من لا يملك «الاعتماد».
   الساعة: ظهرُ الثلاثاء 2026-10-20 بتوقيت الجهاز (9 جمادى الأولى 1448 هـ) — فالشهرُ السابق (ربيع الآخر) منقضٍ مقفلٌ تلقائياً. بياناتٌ اصطناعية (TEST_ONLY). */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { ROOT, moduleLogic } from './harness.mjs';

export const NOW = new Date(2026, 9, 20, 12, 0, 0).getTime();
const SERVICES = ['src/services/490-emp-key.js', 'src/services/440-count.js', 'src/services/060-percent-format.js', 'src/systems/tasks/client/546-task-model.js'];

export function page(slug, o = {}) {
  const store = o.store instanceof Map ? o.store : new Map(Object.entries(o.store || {}).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]));
  const KIVO = {}, toasts = [];
  class FDate extends Date { constructor(...a) { if (a.length) super(...a); else super(NOW); } static now() { return NOW; } }
  const ctx = { KIVO, console, Intl, Date: FDate, Math, JSON, Promise, Object, Array, String, Number, RegExp, Set, Map, Error, isNaN, parseInt, parseFloat,
    setTimeout: () => 0, clearTimeout: () => 0, setInterval: () => 0, clearInterval: () => 0, requestAnimationFrame: () => 0,
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    document: { hidden: false, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, addEventListener: () => {}, removeEventListener: () => {}, documentElement: { classList: { contains: () => false } } },
    navigator: { userAgent: 'node', onLine: true }, location: { hash: '', pathname: '/', search: '' }, history: { replaceState: () => {} },
    addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => true,
    __BS_BOOT: { srv: 0 }, fetch: () => Promise.reject(new Error('offline')) };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of SERVICES) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
  const can = o.can || (() => true);
  KIVO.BassamPerm = { can: (p, a) => !!can(p, a || 'view'), on: () => true, subOn: () => true, key: () => true, canSub: () => true, lensOn: () => true };
  KIVO.BassamAuth = { user: () => ({ id: 'tst_dm1', role: 'staff', mgr: true, ekey: 'mgr:tst_d1', deptId: 'tst_d1', name: 'TEST_ONLY مدير' }), display: () => ({ name: 'TEST_ONLY مدير', role: 'مدير الإدارة' }), users: () => [], isSuper: () => false };
  KIVO.BassamDepts = { active: () => 'tst_d1', list: () => [], nameOf: () => 'TEST_ONLY إدارة' }; KIVO.BassamSup = { isSup: () => false };
  KIVO.BassamPick = new Proxy({}, { get: () => () => '' });   /* أنماطُ منتقي رمز النداء (334) — شكلٌ لا منطق */
  KIVO.BassamFind = { dig: (v) => String(v == null ? '' : v), filter: (q, list, f) => list.filter((r) => f(r).some((x) => String(x == null ? '' : x).indexOf(q) >= 0)) };
  class DCLogic { constructor() { this.state = {}; this.props = {}; } setState(p, cb) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); cb && cb(); } }
  ctx.DCLogic = DCLogic;
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/i18n/385-calendar.js'), 'utf8'), ctx);   /* V7 · د5-د: التقويم الموحّد — تعتمد عليه عُدّة الصفحات */
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/core/060-bus.js'), 'utf8'), ctx);   /* V7 · د5-د: الناقل (قلب المنصة) وروابطُ الجدول الشهري عليه — الصفحاتُ تسأل بالاسم */
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/systems/staff/client/531-staff-links.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/systems/staff/client/533-staff-g3.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/systems/plan/client/403-plan-p3.js'), 'utf8'), ctx);   /* V7 · د5-هـ: قراءاتُ التشغيل الميداني المعلنة */
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/systems/staff/client/534-staff-g4.js'), 'utf8'), ctx);
  for (const f of ['src/services/421-round-links.js', 'src/systems/plan/client/404-plan-p4.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);   /* V7 · د5-هـ: روابطُ الخطة والجولات على الناقل */
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/components/565-page-kit.js'), 'utf8'), ctx);
  const B0 = KIVO.BassamPageKit.base;
  KIVO.BassamPageKit.base = (B, a) => class extends B0(B, a) { bsOn() { return true; } bsLensOn() { return true; } bsToast(m, k) { toasts.push([m, k || 'err']); } bsAck(m, k) { toasts.push([m, k || 'ok']); return Promise.resolve(true); } };
  if (o.srv) KIVO.__BS_SRV = o.srv;   /* RISHAD-266: خدمةُ العمليات (اختيارية) — الصفحاتُ التي تقرأ مواردها عبرها */
  vm.runInContext(moduleLogic(slug) + '\n;globalThis.__C = Component;', ctx, { filename: slug + '/logic.js' });
  const c = new ctx.__C();
  c.bsToast = (m, k) => toasts.push([m, k || 'err']);
  return { c, toasts, store, KIVO, V: () => c.renderVals() };
}
/* حدثٌ بلا انتشار للنقرة المزدوجة */
export const EV = { stopPropagation() {}, preventDefault() {} };
