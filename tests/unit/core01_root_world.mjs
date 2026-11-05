/* CORE-01 · عُدّةٌ مشتركة: إطارُ التطبيق الحقيقيّ (src/layouts/root-logic.js) داخل vm ببياناتٍ اصطناعية (TEST_ONLY).
   الوحدات والحسابات والصلاحيات بدائلُ صغيرة؛ ما يُختبر هو منطقُ الإطار نفسُه (renderVals · _switchUnit · _unsavedGuard). */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { SRC } from './harness.mjs';

export const rd = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');
class FakeStorage { constructor() { this.m = new Map(); } getItem(k) { return this.m.has(k) ? this.m.get(k) : null; } setItem(k, v) { this.m.set(k, String(v)); } removeItem(k) { this.m.delete(k); } }

export const UNITS = [{ id: 'TEST_ONLY_a', name: 'TEST_ONLY إدارة أ' }, { id: 'TEST_ONLY_b', name: 'TEST_ONLY إدارة ب' }];

/* user: الحسابُ (أو null بلا جلسة) · display: ما تُرجعه BassamAuth.display() · srv: بديلُ __BS_SRV · confirm: جوابُ KIVO.bsConfirm */
export function world(o = {}) {
  const KIVO = {}, timers = [], reloads = [], confirms = [];
  const user = o.user === undefined ? { id: 'TEST_ONLY_su', role: 'super' } : o.user;
  let act = o.active || UNITS[0].id;
  const ctx = {
    KIVO, console, JSON, Object, Array, String, Number, Math, Date, RegExp, Set, Map, Error, Promise, URL,
    localStorage: new FakeStorage(), sessionStorage: new FakeStorage(),
    location: { hash: o.hash || '#/kpis', pathname: '/', search: '', reload: () => reloads.push(act) },
    history: { replaceState() {}, pushState() {} },
    document: { documentElement: { scrollHeight: 2000, getAttribute: () => null }, activeElement: null, querySelectorAll: () => [], getElementById: () => null, addEventListener() {}, removeEventListener() {}, contains: () => true, hidden: false },
    setTimeout: (f, ms) => { timers.push({ f, ms: ms || 0 }); return timers.length; }, clearTimeout() {},
    requestAnimationFrame: () => 0, addEventListener() {}, removeEventListener() {}, scrollTo() {},
    innerWidth: 1366, innerHeight: 800, scrollY: 0, matchMedia: () => ({ matches: false, addEventListener() {} }),
    MutationObserver: class { observe() {} disconnect() {} },
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  const isSuper = () => !!(user && user.role === 'super');
  KIVO.KIVO_MANIFEST = { clone: (k) => (k === 'routeNames' ? { kpis: 'TEST_ONLY مؤشرات', sysadmin: 'مدير النظام', tasks: 'TEST_ONLY المهام' } : {}) };
  KIVO.BassamAuth = { user: () => user, isSuper, isStaff: () => !!(user && user.role === 'staff'), display: () => (o.display ? o.display(user, act) : null), logout() {} };
  KIVO.BassamPerm = { NAV2PERM: { kpis: 'kpis', tasks: 'tasks' }, can: () => true, deptCap: () => ['kpis', 'tasks'], navLeaves: () => [], kpiPanelOk: () => true, PAGE_REG: [] };
  KIVO.BassamDepts = {
    active: () => act, activeName: () => (UNITS.find((u) => u.id === act) || {}).name || '', unitLabel: (id) => (UNITS.find((u) => u.id === id) || {}).name || '',
    unitAl: () => 'الإدارة', context: () => ({ state: 'ok' }), ancestorsOf: () => [], nodeOf: () => null, activeGroupName: () => '', railTree: () => [], switchUnits: () => [],
    setActive: (id) => { if (!UNITS.some((u) => u.id === id)) return false; act = id; return true; },
  };
  KIVO.__BS_SRV = o.srv || null;
  const toasts = []; KIVO.bsToast = (m, opt) => { toasts.push({ m, opt }); };   /* the one platform toast (280) */
  KIVO.bsConfirm = (q) => { confirms.push(q); return Promise.resolve(o.confirm === undefined ? true : !!o.confirm); };
  class DCLogic { constructor(props) { this.props = props || {}; this.state = {}; } setState(p, cb) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); if (cb) cb(); } }
  ctx.DCLogic = DCLogic;
  vm.runInContext(rd('layouts/root-logic.js') + '\n;globalThis.__C = Component;', ctx, { filename: 'root-logic.js' });
  const c = new ctx.__C();
  return { c, KIVO, ctx, timers, reloads, confirms, toasts, lastToast: () => (toasts.length ? toasts[toasts.length - 1].m : ''), active: () => act, vals: () => c.renderVals() };
}
