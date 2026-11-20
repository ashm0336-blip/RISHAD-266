/* RISHAD V7 P4 — «خريطة الأنظمة والصلاحيات»: one structure builder (admin t24Struct → t24Rows{map}) derived at run time from the
   generated manifest (255 ← pages.json + lens plug-ins) and the registry (340 ← registry-v24.9.json). V7 · د5-هـ (44 · التوحيد): t24Rows —
   صفوفُ الخريطة والمحرّرات (A1 · A3 · صفوفُ A5 · «editors are untouched») — حُذفت مع «سقف الصفحات» وشجرتِه، فحُذفت حالاتُها؛ ويبقى t24Struct. The real admin logic runs in a vm
   over the real generated blocks; the p24 engine is a stand-in that says «inside the ceiling» (the engine itself is proven against the
   server elsewhere — A8, the browser test v7_p4_map, was deleted in V7 · د5-هـ 44 with the map tab). Acceptance criteria of the approved inventory:
     A1 every active key (255) appears exactly once in the full map; every reserved key (14) is shown marked; nothing outside the registry
     A2 every owner (44) is one row; t24Struct = perm-tree24.json for leaves and keys
     A3 every row carries one derived class of {نظام، حاوية، صفحة، تبويب، لوحة مؤشرات، عدسة، منصة، مرجع}
     A4 lens hosts come from the lens manifests; no literal host list in admin/logic.js or 331; lens indicators = pages.json requires (Q5)
     A5 the panels of the map = containers.kpis.refs = the panels of kpis/logic.js; the shown conditions = the rules of kpiPanelOk
     A6 (deleted in V7 · د5-هـ 44 with the «الوحدات» page)
     A7 siteMap has no literal centre-tab names; its centre rows = the admin page's one list (CON_TABS)
     A10 the new display code opens no storage key and no API route */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { SRC } from './harness.mjs';
import { needs as needsSys } from './harness.mjs';

const rd = (...p) => fs.readFileSync(path.join(SRC, ...p), 'utf8');
const REG = JSON.parse(rd('permissions', 'registry', 'registry-v24.9.json'));
const TREE = JSON.parse(rd('manifests', 'perm-tree24.json'));
const PAGES = JSON.parse(rd('manifests', 'pages.json'));
const LENSES = fs.readdirSync(path.join(SRC, 'plugins', 'lenses')).filter((d) => fs.existsSync(path.join(SRC, 'plugins', 'lenses', d, 'manifest.json')))
  .map((d) => JSON.parse(rd('plugins', 'lenses', d, 'manifest.json'))).sort((a, b) => a.order - b.order);
const KPI = PAGES.containers.find((c) => c.key === 'kpis');
const ADMIN = rd('modules', 'admin', 'logic.js'), P331 = rd('permissions', '331-perm-model.js'), P333 = rd('manifests', '333-platform-map.js'), P334 = rd('permissions', '334-perm-tree-tpl.js');
const J = (x) => JSON.parse(JSON.stringify(x));

function load() {
  const KIVO = {};
  const ctx = { KIVO, console, JSON, Object, Array, String, Number, RegExp, Set, Map, Error, Math, Date };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(rd('manifests', '255-page-manifest.js'), ctx, { filename: '255-page-manifest.js' });
  vm.runInContext(rd('permissions', '340-registry-v24-9.js') + '\n;globalThis.__R = KIVO_REGISTRY;', ctx, { filename: '340-registry-v24-9.js' });
  KIVO.KIVO_MANIFEST = ctx.KIVO_MANIFEST; KIVO.KIVO_REGISTRY = ctx.__R;
  KIVO.BassamCount = Object.assign((n, w) => n + ' ' + (Array.isArray(w) ? w[5] : w), { agr: (n, a) => a });
  KIVO.BassamPerm = { deptCap: (d) => (d === 'u1' ? ['emps', 'planning', 'staff', 'daily'] : ['tasks']),
    p24: { ix: () => ({ needMgr: {}, atomless: {}, superOnly: {} }), keyOn: () => true, leafOn: () => true, lensHosted: () => true, lensOf: () => null, DERIVE: {}, grantable: () => true } };
  KIVO.BassamDepts = { list: () => [{ id: 'u1', name: 'TEST_ONLY وحدة ١' }, { id: 'u2', name: 'TEST_ONLY وحدة ٢' }] };
  KIVO.BassamPageKit = { base: (B) => class extends B {} };
  ctx.DCLogic = class { constructor() { this.state = {}; } setState() {} };
  vm.runInContext(ADMIN + '\n;globalThis.__C = Component;', ctx, { filename: 'admin/logic.js' });
  return { C: ctx.__C, KIVO, ctx };
}
const { C, KIVO, ctx } = load();
const page = () => Object.create(C.prototype);
const STRUCT = page().t24Struct();

test('the manifest ships the system contract and the lens hosts to the client (the source of the map)', needsSys('award', 'dstats', 'seized', 'tasks'), () => {
  const M = KIVO.KIVO_MANIFEST.clone('pages');
  for (const p of PAGES.pages) { const q = M.find((x) => x.key === p.key); assert.equal(q.module, p.module, p.key + '.module'); assert.equal(q.activation, p.activation, p.key + '.activation'); assert.deepEqual(J(q.requires || []), p.requires || [], p.key + '.requires'); }
  assert.equal(M.filter((p) => p.module).length, 12, 'twelve systems (module)');
  assert.deepEqual(J(KIVO.KIVO_MANIFEST.clone('lenses')).map((l) => [l.key, l.hosts, l.indicators]), LENSES.map((m) => [m.key, m.hosts, (m.resources || {}).indicators || []]));
});

test('A2 every owner is one row · t24Struct = perm-tree24.json (containers · leaves · keys · reserved)', needsSys('award', 'custody', 'dstats', 'seized', 'tasks'), () => {
  assert.equal(REG.owners.length, 44);
  assert.deepEqual(J(STRUCT).map((c) => c.id), TREE.containers.map((c) => c.id), 'the same containers in the same order');
  /* leaves and keys: the keys of a leaf in the registry order; the reserved ones as a set; the leaves of a page container in the
     manifest order (the platform owners are listed in the registry order by the builder and in the document order by the tree file) */
  const shape = (cs, kindOf) => cs.map((c) => { const L = c.leaves.map((l) => ({ owner: l.owner, kind: kindOf(l).replace('page_under', 'page'), keys: l.keys, reserved: l.reserved.slice().sort() }));
    return { id: c.id, kind: c.kind, page: c.page, nav: c.nav, leaves: c.kind === 'page' ? L : L.sort((a, b) => (a.owner < b.owner ? -1 : 1)) }; });
  assert.deepEqual(shape(J(STRUCT), (l) => l.type), shape(TREE.containers, (l) => l.kind));
  assert.equal(TREE.counts.leaves, 44); assert.equal(TREE.counts.keys, 255);
  assert.deepEqual(J(STRUCT).flatMap((c) => c.leaves.map((l) => l.owner)).sort(), REG.owners.map((o) => o.id).sort(), 'the 44 owners, one leaf each');
});

test('A4 lens hosts come from the lens manifests — no literal host list', () => {
  const lens = STRUCT.find((c) => c.id === 'lenses').leaves;
  assert.deepEqual(J(lens).map((l) => [l.lens, l.hosts]), LENSES.map((m) => [m.key, m.hosts]));
  for (const l of lens) assert.equal(l.route, l.hosts.map((h) => '#/' + (h === 'plan' ? 'plan' : h)).join(' · '), 'the route is derived from the hosts: ' + l.owner);
  for (const [name, src] of [['admin/logic.js', ADMIN], ['331-perm-model.js', P331]]) {
    assert.doesNotMatch(src, /['"]plan['"]\s*,\s*['"]daily\/rounds['"]/, name + ': no literal host pair');
    assert.doesNotMatch(src, /#\/plan · #\/daily\/rounds/, name + ': no literal host routes');
    assert.doesNotMatch(src, /«التشغيل الميداني» (?:أو|و)\s*«الجولات اليومية»/, name + ': no literal host names');
  }
  /* 331: the fallback for a lens key without a leaf in its asisMap is the manifest's host list (same values as before) */
  assert.match(P331, /function lensHosts\(L\)\{ var x = LENS_REG\.filter/);
});

test('Q5 parity: a lens manifest declares exactly the panels pages.json makes conditional on it', () => {
  const req = PAGES.pages.flatMap((p) => p.requires || []);
  for (const m of LENSES) assert.deepEqual(((m.resources || {}).indicators || []).slice().sort(), req.filter((r) => r.on === 'lens:' + m.key).map((r) => r.for).sort(), 'lens ' + m.key);
  assert.deepEqual(J(STRUCT.find((c) => c.id === 'lenses').leaves).map((l) => [l.lens, l.ind]), LENSES.map((m) => [m.key, (m.resources || {}).indicators || []]));
});

test('A5 refs = the panels of kpis/logic.js · the conditions = kpiPanelOk (V7 · د5-هـ 44: the map rows were deleted with t24Rows)', needsSys('award', 'custody', 'dstats', 'seized', 'tasks'), () => {
  /* (1) one row per ref, and the KPIs page draws exactly those */
  const KL = rd('modules', 'kpis', 'logic.js');
  const drawn = [...KL.matchAll(/\{ k: "\w+", pk: "(\w+)", sk: "(\w*)" \}/g)].map((m) => m[1] + (m[2] ? '/' + m[2] : ''));
  assert.equal(drawn.length, 11);
  assert.deepEqual(drawn, KPI.refs, 'kpis/logic.js draws the refs of the container, in order');
  assert.doesNotMatch(KL, /"tkKpi"/, 'the tasks panel has no rule of its own left in the KPIs page');
  /* (2) the conditions: the literal rules of kpiPanelOk (the extraction of tools/validate_schemas.py ⑤) */
  const body = /function kpiPanelOk\(pk, sk\)\{([\s\S]*?)\n  \}/.exec(P334)[1], rules = {};
  for (const m of body.matchAll(/if \(sk === '(\w+)'\) return ([^;]+);/g))
    rules[m[1]] = [...m[2].matchAll(/onCap\('(\w+)'\)/g)].map((x) => 'lens:lens:' + x[1]).concat([...m[2].matchAll(/\bcan\('(\w+)', 'view'\)/g)].map((x) => 'perm:' + x[1])).sort();
  assert.deepEqual(Object.keys(rules).sort(), ['kpiDaily', 'kpiOcc', 'kpiZones']);
  /* (4) kpiPanelOk serves the page-level ref through the page's own view right — no new leaf, no new key */
  assert.match(body, /if \(!sk\) return can\(pk, 'view'\);/);
  assert.equal(REG.registry.length, 269); assert.equal(PAGES.pages.find((p) => p.key === 'tasks').tabs, undefined);
});

/* A6 «الوحدات» (the platform-units page _plMods) was DELETED in V7 · د5-هـ (44) — toggling systems moves to the «الصلاحيات» tab; its case is deleted with it. */

/* 333 in a vm over the real manifest: its inputs from the permission model are stand-ins that say «inside the ceiling» */
function siteMapOf(pg, centerIn) {
  const M = KIVO.KIVO_MANIFEST, PAGE_REG = M.clone('pages'), PAGE_OF = {}; PAGE_REG.forEach((p) => { PAGE_OF[p.key] = p; });
  const K = { KIVO_MANIFEST: M, KIVO_REGISTRY: KIVO.KIVO_REGISTRY, BassamCount: KIVO.BassamCount, BassamDepts: { list: () => [{ id: 'u1', name: 'TEST_ONLY وحدة ١' }] },
    __BS_I: { auth: { NAV_REG: M.clone('containers'), PAGE_OF, PAGE_REG, curDept: () => 'u1', onAny: () => true, onCap: (k) => k !== 'seized',
      isContainer: (k) => !!(PAGE_OF[k] && ((PAGE_OF[k].subs || []).length || (PAGE_OF[k].tabs || []).length || PAGE_REG.some((q) => q.under === k))),
      splitLeaf: (k) => { const i = String(k).indexOf('/'); return i === -1 ? { page: k, sub: '' } : { page: k.slice(0, i), sub: k.slice(i + 1) }; } } } };
  const c2 = vm.createContext({ KIVO: K, JSON, Object, Array, String });
  vm.runInContext(P333, c2, { filename: '333-platform-map.js' });
  const center = centerIn || pg.CON_TABS().map((t) => ({ name: t[2] || 'إعدادات المنصة', addr: '#/sysadmin/' + (t[0] === 'depts' ? 'org' : t[0]), hint: '' }));
  return { rows: J(K.__BS_I.auth.siteMap({ center, struct: pg.t24Struct() })), order: J(K.__BS_I.auth.navOrder()) };
}

test('A7 siteMap: the centre tabs come from the admin page\'s one list; lenses · platform · references from the tree builder', needsSys('dstats', 'seized', 'tasks'), () => {
  const pg = page(), tabs = J(pg.CON_TABS()), { rows, order } = siteMapOf(pg);
  assert.deepEqual(J(tabs).map((t) => t[0]), ['overview', 'sec', 'users', 'plat', 'depts', 'oplog', 'backup', 'histimp']);   /* V7 · د5-هـ (44): «perms» حُذف */
  for (const t of tabs) if (t[2]) assert.ok(!P333.includes(t[2]), '333 does not spell «' + t[2] + '»');
  /* («خادم فقط» is a badge label of the kind table and the profile windows are a commented literal — see the review test below) */
  for (const lit of ['نظرة عامة', 'هوية المنصة', "'links','help'", "['admin']"]) assert.ok(!P333.includes(lit), '333 no longer holds «' + lit + '»');
  const i0 = rows.findIndex((r) => r.name === 'مركز إدارة رشاد'), centre = rows.slice(i0 + 1);
  assert.deepEqual(centre.map((r) => r.name), tabs.map((t) => t[2] || 'إعدادات المنصة'), 'the centre rows are the list, in order (incl. «سجل الأنشطة والتغييرات»)');
  assert.deepEqual(centre.map((r) => r.addr), tabs.map((t) => '#/sysadmin/' + (t[0] === 'depts' ? 'org' : t[0])));
  /* the admin page itself reads the same list for its titles and its tab order */
  assert.match(ADMIN, /T = this\.CON_TABS\(\)\.reduce\(/); assert.match(ADMIN, /\? this\.CON_TABS\(\)\.map\(\(t\) => t\[0\]\)/);
  assert.equal(pg._conHead('oplog').conTitle, 'سجل الأنشطة والتغييرات'); assert.equal(pg._conHead('overview').conTitle, 'الرئيسية'); assert.equal(pg._conHead('users').conEyebrow, 'الإدارة المؤسسية');
  /* lenses, platform owners, the independent reference and the tasks panel are rows now (G10) */
  const named = (kind) => rows.filter((r) => r.kind === kind).map((r) => r.name);
  const lbl = (id) => pg.t24Struct().flatMap((c) => c.leaves).find((l) => l.owner === id).label;
  assert.deepEqual(named('lens'), REG.owners.filter((o) => o.kind === 'lens').map((o) => lbl(o.id)));
  assert.ok(rows.filter((r) => r.kind === 'lens').every((r) => r.hint === 'على «التشغيل الميداني» و«الجولات اليومية»' && r.addr === '#/plan · #/daily/rounds'));
  assert.deepEqual(named('plat'), REG.owners.filter((o) => o.kind === 'platform').map((o) => lbl(o.id)));
  assert.deepEqual(named('rdat'), REG.owners.filter((o) => o.kind === 'reference').map((o) => lbl(o.id)));
  assert.ok(rows.some((r) => r.kind === 'ref' && r.name === 'مؤشرات المهام' && /لوحةُ صفحة «المهام»/.test(r.hint)), 'the tasks panel is listed in «مؤشرات الإدارة»');
  /* G12: the ceiling badge names the unit it was computed for */
  const sz = rows.find((r) => r.name === 'نظام المضبوطات');
  assert.equal(sz.capOffTxt, 'خارج سقف «TEST_ONLY وحدة ١»'); assert.equal(rows.find((r) => r.name === 'نظام الاسترشاد').capOffTxt, '');
  /* G11: the groups are derived — general pages (no module) and always-on pages */
  assert.deepEqual(order.groups.map((g) => [g.key, g.keys]), [['work', PAGES.navOrder], ['refs', ['links', 'help']], ['mgmt', ['admin']]]);
});

/* Independent review of P4 (low follow-up 2): two details of the map of e34fa23 were lost in the derivation — the «خادم فقط» badge of
   the centre tabs that work with the server only (CON_TABS' fourth field), and the sub-rows of the profile page. */
test('review: siteMap keeps the «خادم فقط» badge (from CON_TABS[3]) and the profile sub-rows', () => {
  const pg = page(), tabs = J(pg.CON_TABS());
  /* the admin page hands the fourth field over: its real _siteMap, with the model's siteMap captured */
  let got = null; const P = KIVO.BassamPerm; P.siteMap = (o) => ((got = o), []);
  try { pg._siteMap(); } finally { delete P.siteMap; }
  assert.deepEqual(J(got.center).map((t) => !!t.srv), tabs.map((t) => !!t[3]), '_siteMap passes «works with the server only» for every centre tab');
  assert.ok(tabs.some((t) => t[3]) && tabs.some((t) => !t[3]), 'the list has both kinds');
  const { rows } = siteMapOf(pg, J(got.center));
  const i0 = rows.findIndex((r) => r.name === 'مركز إدارة رشاد'), centre = rows.slice(i0 + 1);
  assert.equal(centre.length, tabs.length);
  centre.forEach((r, i) => {
    assert.equal(r.kind, tabs[i][3] ? 'srv' : 'tab', '«' + r.name + '»: kind'); assert.equal(r.badge, tabs[i][3] ? 'خادم فقط' : 'تبويب', '«' + r.name + '»: badge');
    assert.doesNotMatch(r.badgeStyle, /display:none/, 'the badge is shown');
  });
  /* the profile row (the platform owner «profile», from the tree builder) is followed by its sub-rows, as on e34fa23 */
  const ip = rows.findIndex((r) => r.addr === '#/profile'); assert.ok(ip > 0, 'the profile row');
  assert.equal(rows[ip].name, pg.t24Struct().flatMap((c) => c.leaves).find((l) => l.owner === 'profile').label);
  const subs = rows.slice(ip + 1, ip + 5);
  assert.deepEqual(subs.map((r) => [r.name, r.kind, r.badge]), [['الإدارة — البيانات الوظيفية', 'win', 'نافذة'], ['بياناتي', 'win', 'نافذة'], ['الأمان — بيانات الدخول والجلسات', 'win', 'نافذة'],
    ['يومك / أسبوعك · رصد الميدان', 'tab', 'تبويب']]);
  assert.ok(subs.every((r) => /padding-right:34px/.test(r.rowStyle)), 'they are indented under the profile row');
  assert.equal(subs[3].hint, 'لوحة الرصد تمنحها ورقة «رصد الميدان» في المتابعة اليومية');
  /* no manifest declares the profile windows — the literal says so; the windows themselves are in the profile template */
  assert.match(P333, /لا مصدرَ يعلنها/);
  const PV = rd('modules', 'profile', 'view.html');
  for (const w of ['الإدارة', 'بياناتي', 'الأمان', 'يومك', 'أسبوعك', 'رصد الميدان']) assert.ok(PV.includes('<b>' + w + '</b>'), 'the profile template still has «' + w + '»');
  const dl = PAGES.pages.find((p) => p.key === 'daily');
  assert.ok((dl.subs || []).concat(dl.tabs || []).some((x) => /^رصد الميدان/.test(x.name)), '«رصد الميدان» is a leaf of daily');
});

test('A10 the new display code opens no storage key and no API route', () => {
  const body = (name) => { const i = ADMIN.indexOf('\n  ' + name + '('); assert.ok(i > 0, name); const j = ADMIN.indexOf('\n  }\r\n  ', i); return ADMIN.slice(i, j); };
  for (const fn of ['_siteMap', 'CON_TABS', 't24Struct'])   /* V7 · د5-هـ (44): _pmMap · _plMods · _p24Of · _upInh حُذفت مع صفحاتها */
    assert.doesNotMatch(body(fn), /localStorage|sessionStorage|fetch\(|\/api\/|bassam_[a-z0-9_]+_v\d|__BS_SRV/, fn + ' reads the manifest, the registry and the permission model only');
  assert.doesNotMatch(P333.slice(P333.indexOf('function siteMap')), /localStorage|fetch\(|\/api\/|bassam_[a-z0-9_]+_v\d/);
  void ctx;
});
