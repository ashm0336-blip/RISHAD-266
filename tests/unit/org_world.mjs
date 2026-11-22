/* V7 · د6 — عالمُ اختبارٍ مصطنع (TEST_ONLY) لصفحة «الإدارات والصلاحيات» (src/modules/org: logic.js + logic-perm44.js) داخل node:vm:
   · الهيكلُ بخدمته الحقيقية (services/320-dept-storage.js فوق مخزنٍ في الذاكرة) — قواعدُ الموضع والنقل والحذف هي قواعدُ المنصة نفسُها؛
   · العنوانُ بخدمته الحقيقية (services/325-org-route.js) — الوحدةُ والتبويبُ يُقرآن من location.hash وحده؛
   · محرّكُ الأدوار الحقيقي KIVO.Perm44 (340 + 345 — perm44_real.mjs) فوق مخزنٍ صغير؛
   · السقفُ (BassamPerm) والحساباتُ (BassamAuth) والمنصة (BassamPlat) بدائلُ صغيرة من بيانات الاختبار.
   لا شبكة ولا متصفح ولا بيانات حقيقية. الصفحةُ تُنشأ بمُنشئها (new Component) وخاصّيتُها host من الصفحة المضيفة كما تمرّرها صفحةُ الإعدادات. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { moduleLogic, SRC } from './harness.mjs';
import { perm44Real, rolesKey, grantsKey } from './perm44_real.mjs';

export const J = (x) => JSON.parse(JSON.stringify(x));
const rd = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');
export const ORG_SRC = moduleLogic('org');
export const ORG_VIEW = rd('modules/org/view.html');
export const ORG_CSS = rd('modules/org/helmet.css');

/* هيكلٌ افتراضي: قطاع ← إدارة عامة ← (إدارة أ ← قسم أ١ · إدارة ب) · وإدارةٌ بلا أب · وعقدةٌ فارغة */
export const ORG = {
  nodes: [
    { id: 'TEST_ONLY_SEC', name: 'TEST_ONLY قطاع', kind: 'قطاع' },
    { id: 'TEST_ONLY_G', name: 'TEST_ONLY إدارة عامة', kind: 'إدارة عامة', pid: 'TEST_ONLY_SEC' },
    { id: 'TEST_ONLY_E', name: 'TEST_ONLY إدارة عامة فارغة', kind: 'إدارة عامة', pid: 'TEST_ONLY_SEC' },
  ],
  depts: [
    { id: 'TEST_ONLY_A', name: 'TEST_ONLY إدارة أ', gid: 'TEST_ONLY_G' },
    { id: 'TEST_ONLY_B', name: 'TEST_ONLY إدارة ب', gid: 'TEST_ONLY_G' },
    { id: 'TEST_ONLY_A_S1', name: 'TEST_ONLY قسم أ١', gid: 'TEST_ONLY_A', kind: 'قسم' },
    { id: 'TEST_ONLY_Z', name: 'TEST_ONLY إدارة بلا أب' },
  ],
  users: [
    { id: 'TEST_ONLY_OWNER', name: 'TEST_ONLY المالك', un: '1000000001', role: 'super' },
    { id: 'TEST_ONLY_gm', name: 'TEST_ONLY مدير عام', un: '1000000002', role: 'gm', gid: 'TEST_ONLY_G' },
    { id: 'TEST_ONLY_mA', name: 'TEST_ONLY مدير أ', un: '1100000001', role: 'staff', deptId: 'TEST_ONLY_A', ekey: 'mgr:TEST_ONLY_A', mgr: 1 },
    { id: 'TEST_ONLY_a1', name: 'TEST_ONLY موظف أ١', un: '1200000001', role: 'staff', deptId: 'TEST_ONLY_A', ekey: 'TEST_ONLY_e1' },
    { id: 'TEST_ONLY_a2', name: 'TEST_ONLY موظف أ٢', un: '1200000002', role: 'staff', deptId: 'TEST_ONLY_A', ekey: 'TEST_ONLY_e2' },
    { id: 'TEST_ONLY_s1', name: 'TEST_ONLY موظف قسم', un: '1200000003', role: 'staff', deptId: 'TEST_ONLY_A_S1', ekey: 'TEST_ONLY_e3' },
    { id: 'TEST_ONLY_b1', name: 'TEST_ONLY موظف ب', un: '1200000004', role: 'staff', deptId: 'TEST_ONLY_B', ekey: 'TEST_ONLY_e4' },
  ],
};

class MemStorage {
  constructor() { this._m = new Map(); }
  getItem(k) { return this._m.has(k) ? this._m.get(k) : null; }
  setItem(k, v) { this._m.set(String(k), String(v)); }
  removeItem(k) { this._m.delete(k); }
  clear() { this._m.clear(); }
  key(i) { return [...this._m.keys()][i] ?? null; }
  get length() { return this._m.size; }
}

/* o: { nodes, depts, users, caps: {وحدة: [أنظمة]}, off: [مطفأ على المنصة], docs: {وحدة: {roles, people}}, me: معرّفُ صاحب الجلسة, mode: 'site'|'dept',
        active: الوحدة النشطة, hash, host: إضافاتٌ على الصفحة المضيفة, slots: true ⇒ الموضعان القائمان يُمرَّران كما تفعل صفحةُ الإعدادات } */
export function orgWorld(o = {}) {
  const nodes = J(o.nodes || ORG.nodes), depts = J(o.depts || ORG.depts), users = J(o.users || ORG.users);
  const caps0 = J(o.caps || {}), plat = { mods: { off: (o.off || []).slice() } };
  const toasts = [], acks = [], confirms = [], capW = [], platW = [], seeded = [], hostCalls = [], events = [];
  const localStorage = new MemStorage(), sessionStorage = new MemStorage();
  const doc = { addEventListener() {}, removeEventListener() {}, body: { appendChild() {}, classList: { add() {}, remove() {} } }, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }), getElementById: () => null };
  const hist = [];
  const location = { hash: o.hash || '', pathname: '/', search: '' };
  const C = {
    Storage: MemStorage, localStorage, sessionStorage, document: doc, console, JSON, Date, Math, Object, Array, String, Number, Promise, setTimeout, clearTimeout,
    location, history: { replaceState: (_s, _t, url) => { const h = String(url).slice(String(url).indexOf('#')); hist.push(['replace', h]); location.hash = h; } },
    CustomEvent: class { constructor(t, i) { this.type = t; this.detail = i && i.detail; } },
    DCLogic: class {}, __BS_BOOT: { cf: 1, srv: 1, uid: o.me || 'TEST_ONLY_OWNER' },
    KIVO: { __BS_SRV: { flushAsync: async () => true } },
  };
  C.window = C; C.globalThis = C;
  C.addEventListener = () => {}; C.removeEventListener = () => {}; C.dispatchEvent = (e) => { events.push(e); return true; };
  vm.createContext(C);
  const KIVO = C.KIVO;
  vm.runInContext(rd('services/320-dept-storage.js'), C, { filename: '320-dept-storage.js' });
  vm.runInContext(rd('services/325-org-route.js'), C, { filename: '325-org-route.js' });
  const D = KIVO.BassamDepts;
  D.saveNodes(nodes); D.save(depts);
  const active = o.active || (depts[0] || {}).id || '';
  D.active = () => active; D.setActive = (id) => hostCalls.push(['setActive', id]);
  const me = users.find((u) => u.id === (o.me || 'TEST_ONLY_OWNER')) || users[0];
  const on = (k, u) => (D.ancestorsOf(u) || []).concat([u]).every((x) => !Array.isArray(caps0[x]) || caps0[x].includes(k));
  const count = Object.assign((n, w) => String(n) + ' ' + (Array.isArray(w) ? w[5] : String(w).split('|')[0]), { agr: (_n, a, b) => b || a, pair: (n, w) => String(n) + ' ' + w, word: (_n, w) => w });
  const mgrsOf = (id) => users.filter((u) => u.role === 'staff' && u.deptId === id && (u.mgr || /^mgr:/.test(String(u.ekey || ''))));
  const gmsOf = (id) => users.filter((u) => u.role === 'gm' && u.gid === id);
  Object.assign(KIVO, {
    BassamPageKit: { base: () => class {} },
    BassamPerm: {
      PAGE_REG: [], PAGE_KEYS: [],
      hasCap: (u) => Array.isArray(caps0[u]), rawCap: (u) => (caps0[u] || []).slice(), deptCap: (u) => (caps0[u] || []).slice(),
      on, subOn: () => true, deptSubs: () => [], setDeptSubs: () => ({ ok: true }), setDeptTabs: () => ({ ok: true }),
      setDeptCap: (u, c) => (capW.push([u, c.slice()]), (caps0[u] = c.slice()), { ok: true }),
      capState: (u) => {
        const own = Array.isArray(caps0[u]), anc = (D.ancestorsOf(u) || []).some((x) => Array.isArray(caps0[x]));
        return { kind: own ? 'own' : anc ? 'inherit' : 'open', independent: false, n: own ? caps0[u].length : 13, all: 13, empty: own && !caps0[u].length };
      },
      nameOf: (k) => k, mgrPerms: (u) => ({ TEST_ONLY_unit: u }), menuFor: () => [],
      seedCapFrom: (id, pid, opt) => { seeded.push(['seedCapFrom', id, pid || null, opt || null]); return { ok: true, seed: opt && opt.seed === 'parent' ? 'parent' : 'off' }; },
      seedSectionCap: (id, did, opt) => { seeded.push(['seedSectionCap', id, did || null, opt || null]); return { ok: true, seed: opt && opt.seed === 'parent' ? 'parent' : 'off' }; },
      dropNodeCap: () => {},
      p24: { ceil: (u) => ({ page: (k) => !plat.mods.off.includes(k) && on(k, u), sub: () => true, lens: () => true }), leafOn: (C0, leaf) => C0.page(String(leaf).split('/')[0]) },
    },
    BassamPlat: { get: () => J(plat), set: (n) => (platW.push(J(n)), (plat.mods = J(n.mods)), { ok: true }) },
    KIVO_MANIFEST: { clone: () => ['staff', 'plan', 'tasks', 'seized', 'irshad', 'award', 'daily', 'dreport', 'dstats'].map((k) => ({ key: k, activation: 'toggle', platSwitch: true })) },
    BassamAuth: {
      isSuper: () => me.role === 'super', user: () => me, users: () => users,
      deptManager: (id) => mgrsOf(id)[0] || null, deptManagers: mgrsOf, groupManager: (id) => gmsOf(id)[0] || null, groupManagers: gmsOf, isMgrKey: (k) => /^mgr:/.test(String(k || '')),
    },
    BassamFind: { dig: (s) => String(s || '').toLowerCase(), filter: (_q, rows) => rows },
    BassamCount: count,
    BassamNav: { conGo: (...a) => hostCalls.push(['conGo', ...a]) },
    bsConfirm: async (q) => { confirms.push(q); return typeof o.confirm === 'function' ? o.confirm(q) : o.confirm !== false; },
  });
  /* المحرّكُ الحقيقي يقرأ سجلَّي الوحدة من المخزن نفسِه الذي تقرأ منه خدمةُ الهيكل (مخزنٌ واحد في الذاكرة) */
  perm44Real(C, {}); C.localStorage = localStorage;
  Object.entries(o.docs || {}).forEach(([did, d]) => { localStorage.setItem(rolesKey(did), JSON.stringify({ v: 1, roles: J(d.roles || []), people: J(d.people || {}) })); localStorage.setItem(grantsKey(did), JSON.stringify({ v: 1, emp: {} })); });
  KIVO.KIVO_REGISTRY = C.KIVO_REGISTRY;
  vm.runInContext(ORG_SRC + '\nglobalThis.TEST_ONLY_Org=Component;', C, { filename: 'org/logic.js' });
  const mode = o.mode === 'dept' ? 'dept' : 'site';
  const host = Object.assign({
    mode,
    deptDel: (t) => hostCalls.push(['deptDel', t && t.id]),
    switchDept: (id) => hostCalls.push(['switchDept', id]),
    exportAll: () => hostCalls.push(['exportAll']),
    acctCtx: () => ({ l: {}, now: Date.now() }), adRole: (u) => (u.mgr ? 'مدير الإدارة' : 'TEST_ONLY دور'), adUnit: (u) => (D.nodeOf(u.role === 'gm' ? u.gid : u.deptId) || {}).name || '',
    adWhen: () => 'TEST_ONLY اليوم', adFull: () => 'TEST_ONLY وقت', ready: () => hostCalls.push(['ready']),
  }, o.host || {});
  const page = new C.TEST_ONLY_Org();
  page.state = Object.assign({}, page.state, o.state || {});
  page.props = { host, children: o.slots === false ? [] : [{ props: { 'data-org-slot': 'admins' }, TEST_ONLY: 'admins' }, { props: { 'data-org-slot': 'data' }, TEST_ONLY: 'data' }] };
  page.setState = (patch, cb) => { page.state = { ...page.state, ...(typeof patch === 'function' ? patch(page.state) : patch) }; cb && cb(); };
  page.bsToast = (m, k) => toasts.push([m, k]);
  page.bsAck = (m, k) => { acks.push([m, k]); return Promise.resolve(true); };
  const render = () => page.renderVals();
  /* تنقّلٌ بالعنوان كما يفعل المتصفح (location.hash ثم رسم) */
  const open = (hash) => { location.hash = hash; return render(); };
  const tick = () => new Promise((r) => setImmediate(r));
  return { page, render, open, tick, C, KIVO, D, R: KIVO.BassamOrgRoute, E: KIVO.Perm44, location, hist, toasts, acks, confirms, capW, platW, seeded, hostCalls, events, store: localStorage, users, caps: caps0, plat };
}
export const rowOf = (v, id) => v.ogRows.find((r) => r.id === id);
export const rowIds = (v) => v.ogRows.map((r) => r.id);
