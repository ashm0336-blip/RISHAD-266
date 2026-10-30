/* KIVO_264 · «ملفي» — عُدّةُ اختبار منطق الصفحة الحقيقي (src/modules/profile/logic.js) داخل Node بلا متصفح:
   تُحمَّل الخدماتُ النقيّة الحقيقية (490 · 510 · 530 · 440 · 400 · 410 · 535) في سياق vm مع بدائلَ صغيرة للمصادقة والإدارات والصلاحيات والتنقّل،
   ثم يُستدعى renderVals() فتُختبر القيمُ التي تراها الشاشة. منقولةٌ من مِسبار التدقيق (scratchpad/k264/pfprobe/probe.mjs) — لا كتابةَ في المستودع.
   PROFILE_LOGIC=<مسار> يبدّل ملفَّ المنطق (لإثبات أن الاختبارات تُخفق على منطق KIVO_263). */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { SRC, blockFile } from './harness.mjs';
const rd = (p) => fs.readFileSync(p, 'utf8');
export const LOGIC = process.env.PROFILE_LOGIC || path.join(SRC, 'modules', 'profile', 'logic.js');
const SERVICES = ['490-emp-key.js', '510-emp-monthly-source.js', '530-emp-day-facts.js', '440-count.js', '400-shift-need.js', '410-gate-units.js', '535-profile-facts.js'];
/* اليومُ كما تحسبه القواعد (أم القرى · الرياض) — منه تُبنى مفاتيحُ البيانات في كل عالَم */
export function riyadhDay(ts = Date.now()) {
  const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' });
  const o = {}; f.formatToParts(new Date(ts)).forEach((p) => { o[p.type] = +p.value; });
  const WD = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  return { y: o.year, m: o.month, d: o.day, YM: o.year + '-' + o.month, DK: o.year + '-' + o.month + '-' + o.day, WD: WD[new Date(ts + 3 * 3600000).getUTCDay()] };
}
export function world(o) {
  const store = new Map();
  const put = (k, v) => { if (v !== undefined) store.set(k, typeof v === 'string' ? v : JSON.stringify(v)); };
  const unreadable = new Set(o.unreadable || []);
  put('bassam_employees_v1', o.emps || []); put('bassam_staffing_v3', o.staffing || {}); put('bassam_dreport_v1', o.dreport || {});
  put('bassam_rounds_v1', o.rounds || {}); put('bassam_plan_v1', o.plan || {}); put('bassam_shift_options_v1', o.shiftOpts || []);
  put('bassam_staffing_locks_v1', o.locks || {}); if (o.tasks) put('bassam_tasks_v1', o.tasks);
  for (const k of unreadable) store.delete(k);
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const nav = [], replaced = [], fetches = [];
  const loc = { hash: o.hash || '#/profile', pathname: '/', search: '' };
  const KIVO = {};
  const timers = [];
  const ctx = {
    KIVO, localStorage, console, Intl, Date, Math, JSON, Promise, Object, Array, String, Number, RegExp, Set, Map, Error, isNaN, parseInt, Symbol,
    setTimeout: (fn) => { timers.push(fn); return timers.length; }, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    document: { hidden: false, querySelector: () => null, addEventListener() {}, removeEventListener() {} },
    navigator: { userAgent: 'node' }, location: loc,
    history: { replaceState: (a, b, u) => { replaced.push(u); const i = String(u).indexOf('#'); loc.hash = i >= 0 ? String(u).slice(i) : ''; } },
    addEventListener() {}, removeEventListener() {},
    fetch: (u) => { fetches.push(String(u)); const r = o.fetch ? o.fetch(String(u)) : null; return Promise.resolve(r ? { ok: r.status === undefined || r.status < 400, status: r.status || 200, json: () => Promise.resolve(r.body) } : { ok: false, status: 404, json: () => Promise.resolve(null) }); },
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  ctx.__BS_BOOT = o.cf ? { cf: 1 } : null;
  KIVO.BassamHijri = { now: (dt) => { const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(dt || new Date()); const g = (t) => +f.find((x) => x.type === t).value; return { y: g('year'), m: g('month'), d: g('day') }; } };
  for (const f of SERVICES) vm.runInContext(rd(blockFile(f)), ctx, { filename: f });
  const user = o.user, users = o.users || (user ? [user] : []);
  const depts = o.depts || [{ id: 'd1', name: 'إدارة الأبواب' }];
  const isMgrKey = (k) => String(k || '').slice(0, 4) === 'mgr:';
  KIVO.BassamAuth = {
    user: () => user, users: () => users, isSuper: () => !!(user && user.role === 'super'), isMgrKey,
    display: () => ({ name: (user && user.name) || '—', role: user && user.role === 'super' ? 'مدير النظام' : 'موظف' }),
    deptManager: () => users.filter((u) => u.role === 'staff' && isMgrKey(u.ekey))[0] || null, deptManagers: () => users.filter((u) => u.role === 'staff' && isMgrKey(u.ekey)),
    groupManagers: (g) => (o.groupMgrs || {})[g] || [], groupDepts: () => depts, myTitle: () => '', permLabel: () => 'قالب', gmRoleLabel: () => 'مدير إدارة عامة',
    pwRuleText: () => '5 أو 6 أرقام', pwCheck: () => ({ ok: true }), changeOwnAccount: (x) => { (ctx.__acct = ctx.__acct || []).push(x); return Promise.resolve({ ok: true }); },
  };
  KIVO.BassamDepts = { active: () => o.active || 'd1', activeName: () => (depts.find((d) => d.id === (o.active || 'd1')) || {}).name || '', list: () => depts,
    ancestorsOf: (id) => (o.ancestors || {})[id] || [], nodeOf: (id) => (o.nodes || {})[id] || null, groupName: (g) => ((o.nodes || {})[g] || {}).name || '' };
  const can = o.can || (() => true);
  KIVO.BassamPerm = { on: () => true, lensOn: () => true, can: (k, a) => can(k, a), deptCap: () => [], deptTabs: () => [] };
  KIVO.BassamSup = { supName: () => false, tpls: () => [], isSupTpl: () => false, tplOf: () => null };
  KIVO.BassamDayShift = { get: () => '' };
  KIVO.BassamNav = { go: (k) => nav.push(k) };
  if (o.open) KIVO.__BS_OPEN_TAB = o.open;
  class DCLogic { constructor() { this.state = {}; } setState(p) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); } }
  KIVO.BassamPageKit = { base: (B) => class extends B { bsOn() { return true; } bsLensOn(k) { return o.lens ? o.lens(k) : true; } bsToast() {} bsAck() { return Promise.resolve(true); } } };
  ctx.DCLogic = DCLogic;
  vm.runInContext(rd(LOGIC) + '\n;globalThis.__C = Component;', ctx, { filename: 'profile/logic.js' });
  const c = new ctx.__C();
  c.state = Object.assign({ pfPanel: '', pfTick: 0, pfSrv: null, pfImgs: {}, pfNow: Date.now() }, c.state || {}, o.state || {});
  c._pfAlive = true;
  const run = () => { const t = timers.splice(0); t.forEach((f) => { try { f(); } catch (e) { /* مؤقّتٌ أخفق — يظهر أثره في التأكيدات */ } }); };
  const flush = async () => { for (let i = 0; i < 6; i++) { await new Promise((r) => setImmediate(r)); run(); } };
  return { c, KIVO, ctx, nav, replaced, fetches, loc, run, flush, v: () => c.renderVals() };
}
/* نصُّ القيم كلِّها (لفحص «لا يظهر في أيّ مكان») */
export const allText = (v) => JSON.stringify(v, (k, x) => (typeof x === 'function' ? undefined : x));
