/* RISHAD V7 P4 — «خريطة الأنظمة والصلاحيات»: one structure builder (admin t24Struct → t24Rows{map}) derived at run time from the
   generated manifest (255 ← pages.json + lens plug-ins) and the registry (340 ← registry-v24.9.json). The real admin logic runs in a vm
   over the real generated blocks; the p24 engine is a stand-in that says «inside the ceiling» (the engine itself is proven against the
   server elsewhere — A8 is the browser test v7_p4_map). Acceptance criteria of the approved inventory:
     A1 every active key (255) appears exactly once in the full map; every reserved key (14) is shown marked; nothing outside the registry
     A2 every owner (44) is one row; t24Struct = perm-tree24.json for leaves and keys
     A3 every row carries one derived class of {نظام، حاوية، صفحة، تبويب، لوحة مؤشرات، عدسة، منصة، مرجع}
     A4 lens hosts come from the lens manifests; no literal host list in admin/logic.js or 331; lens indicators = pages.json requires (Q5)
     A5 the panels of the map = containers.kpis.refs = the panels of kpis/logic.js; the shown conditions = the rules of kpiPanelOk
     A6 «الوحدات» = the pages of pages.json that carry `activation` (no hand list); `always` is locked; only platSwitch pages have a switch
     A7 siteMap has no literal centre-tab names; its centre rows = the admin page's one list (CON_TABS)
     A10 the new display code opens no storage key and no API route */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { SRC } from './harness.mjs';

const rd = (...p) => fs.readFileSync(path.join(SRC, ...p), 'utf8');
const REG = JSON.parse(rd('permissions', 'registry', 'registry-v24.9.json'));
const TREE = JSON.parse(rd('manifests', 'perm-tree24.json'));
const PAGES = JSON.parse(rd('manifests', 'pages.json'));
const LENSES = fs.readdirSync(path.join(SRC, 'plugins', 'lenses')).filter((d) => fs.existsSync(path.join(SRC, 'plugins', 'lenses', d, 'manifest.json')))
  .map((d) => JSON.parse(rd('plugins', 'lenses', d, 'manifest.json'))).sort((a, b) => a.order - b.order);
const KPI = PAGES.containers.find((c) => c.key === 'kpis');
const ADMIN = rd('modules', 'admin', 'logic.js'), P331 = rd('permissions', '331-perm-model.js'), P333 = rd('manifests', '333-platform-map.js'), P334 = rd('permissions', '334-perm-tree-tpl.js');
const ACTIVE = REG.registry.filter((e) => e.status === 'active').map((e) => e.key), RESERVED = REG.registry.filter((e) => e.status !== 'active').map((e) => e.key);
const J = (x) => JSON.parse(JSON.stringify(x));
const CLS = { system: 'نظام', container: 'حاوية', page: 'صفحة', tab: 'تبويب', panel: 'لوحة مؤشرات', lens: 'عدسة', platform: 'منصة', reference: 'مرجع' };

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
/* the full map: every container and every leaf opened */
function mapRows(mode) {
  const c = page(), S = c.t24Struct(), exp = {}, lx = {};
  S.forEach((x) => { exp[x.id] = 1; x.leaves.forEach((l) => { lx[l.owner] = 1; }); });
  const md = c.t24Rows({ map: true, mode, ceil: { lens: () => true }, on: {}, lens: [], exp, leafExp: lx, canEdit: false, target: { role: 'staff', mgr: false } });
  assert.equal(md.ok, true);
  return Array.from(md.rows);   /* a test-realm array (the vm has its own Array) */
}
const entity = (r) => !r.isKeys && !r.isGroup;

test('the manifest ships the system contract and the lens hosts to the client (the source of the map)', () => {
  const M = KIVO.KIVO_MANIFEST.clone('pages');
  for (const p of PAGES.pages) { const q = M.find((x) => x.key === p.key); assert.equal(q.module, p.module, p.key + '.module'); assert.equal(q.activation, p.activation, p.key + '.activation'); assert.deepEqual(J(q.requires || []), p.requires || [], p.key + '.requires'); }
  assert.equal(M.filter((p) => p.module).length, 12, 'twelve systems (module)');
  assert.deepEqual(J(KIVO.KIVO_MANIFEST.clone('lenses')).map((l) => [l.key, l.hosts, l.indicators]), LENSES.map((m) => [m.key, m.hosts, (m.resources || {}).indicators || []]));
});

for (const mode of ['view', 'cap']) {
  test('A1 [' + mode + '] every active key exactly once · every reserved key marked · nothing outside the registry', () => {
    const chips = mapRows(mode).filter((r) => r.isKeys).flatMap((r) => r.keys);
    const act = chips.filter((k) => k.kind !== 'resv').map((k) => k.k), res = chips.filter((k) => k.kind === 'resv').map((k) => k.k);
    assert.equal(ACTIVE.length, 255); assert.equal(RESERVED.length, 14);
    assert.deepEqual(act.slice().sort(), ACTIVE.slice().sort(), 'the active chips are the 255 active keys, each once');
    assert.equal(new Set(act).size, act.length, 'no active key twice');
    assert.deepEqual(res.slice().sort(), RESERVED.slice().sort(), 'the 14 reserved keys are shown, marked reserved');
    assert.ok(chips.every((k) => REG.registry.some((e) => e.key === k.k)), 'no key outside the registry');
    assert.ok(chips.filter((k) => k.kind === 'resv').every((k) => k.on === false && k.dis === true && /^محجوز/.test(k.tip)), 'a reserved chip says so and is never on');
  });
}

test('A2 every owner is one row · t24Struct = perm-tree24.json (containers · leaves · keys · reserved)', () => {
  assert.equal(REG.owners.length, 44);
  assert.deepEqual(J(STRUCT).map((c) => c.id), TREE.containers.map((c) => c.id), 'the same containers in the same order');
  /* leaves and keys: the keys of a leaf in the registry order; the reserved ones as a set; the leaves of a page container in the
     manifest order (the platform owners are listed in the registry order by the builder and in the document order by the tree file) */
  const shape = (cs, kindOf) => cs.map((c) => { const L = c.leaves.map((l) => ({ owner: l.owner, kind: kindOf(l).replace('page_under', 'page'), keys: l.keys, reserved: l.reserved.slice().sort() }));
    return { id: c.id, kind: c.kind, page: c.page, nav: c.nav, leaves: c.kind === 'page' ? L : L.sort((a, b) => (a.owner < b.owner ? -1 : 1)) }; });
  assert.deepEqual(shape(J(STRUCT), (l) => l.type), shape(TREE.containers, (l) => l.kind));
  assert.equal(TREE.counts.leaves, 44); assert.equal(TREE.counts.keys, 255);
  const owners = mapRows('view').filter((r) => r.isLeaf).map((r) => r.key);
  assert.deepEqual(owners.slice().sort(), REG.owners.map((o) => o.id).sort(), 'the 44 owners, one leaf row each');
  assert.equal(new Set(owners).size, 44);
});

test('A3 every row has exactly one derived class of the eight', () => {
  const rows = mapRows('view').filter(entity);
  for (const r of rows) { assert.ok(CLS[r.cls], 'class of «' + r.name + '»: ' + r.cls); assert.equal(r.badge, CLS[r.cls], 'the badge is the class name: ' + r.name); }
  const by = (cls) => rows.filter((r) => r.cls === cls).map((r) => r.key).sort();
  const leafOf = (id) => { const [p, s] = id.split('/'); const pg = PAGES.pages.find((x) => x.key === p); return (pg.subs || []).concat(pg.tabs || []).find((x) => x.key === s); };
  const owners = (kind) => REG.owners.filter((o) => o.kind === kind).map((o) => o.id).sort();
  /* expected classes computed here from the sources (pages.json · registry), independently of the builder */
  assert.deepEqual(by('system'), PAGES.pages.filter((p) => p.module).map((p) => 'sys:' + p.module).sort(), 'a system row per module (12)');
  assert.deepEqual(by('container'), TREE.containers.map((c) => c.id).concat(PAGES.containers.map((c) => c.key)).sort(), 'the 13 containers + the display container');
  assert.deepEqual(by('lens'), owners('lens')); assert.deepEqual(by('platform'), owners('platform')); assert.deepEqual(by('reference'), owners('reference'));
  const pageOwners = owners('page');
  assert.deepEqual(by('page'), pageOwners.filter((o) => !o.includes('/')), 'page = an owner that is a whole page');
  assert.deepEqual(by('tab'), pageOwners.filter((o) => o.includes('/') && !KPI.refs.includes(o)), 'tab = a sub/tab owner that is not a KPI panel');
  assert.deepEqual(by('panel'), KPI.refs.map((r) => (r.includes('/') ? r : r + '#panel')).sort(), 'panel = a ref of «مؤشرات الإدارة»');
  assert.ok(pageOwners.filter((o) => o.includes('/')).every((o) => leafOf(o)), 'every sub/tab owner is a leaf of pages.json');
  /* the class is derived, not written: the builder holds no page or owner name next to a class */
  assert.equal(rows.filter((r) => r.cls === 'system').every((r) => PAGES.pages.some((p) => p.module && p.name === r.name)), true, 'a system is named by its page');
});

test('A3 the leaves are grouped under their system; the container stays a display level', () => {
  const rows = mapRows('view').filter(entity);
  const at = (key) => rows.findIndex((r) => r.key === key), sysBefore = (key) => { for (let i = at(key); i >= 0; i--) { if (rows[i].isSys) return rows[i].key; if (rows[i].isCont) return ''; } return ''; };
  for (const p of PAGES.pages) {
    const leaves = p.subs || p.tabs ? (p.subs || []).concat(p.tabs || []).map((x) => p.key + '/' + x.key).filter((id) => REG.owners.some((o) => o.id === id) || KPI.refs.includes(id)) : [p.key];
    for (const id of leaves) assert.equal(sysBefore(id), p.module ? 'sys:' + p.module : '', id + ' sits under its system');
  }
  assert.equal(sysBefore('tasks#panel'), 'sys:tasks', 'the tasks panel sits under the tasks system');
  const dailyC = at('daily'), next = rows.findIndex((r, i) => i > dailyC && r.isCont);
  assert.deepEqual(rows.slice(dailyC + 1, next).filter((r) => r.isSys).map((r) => r.key), ['sys:daily', 'sys:dreport', 'sys:tasks'], '«المتابعة اليومية» shows its three systems');
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

test('A5 the panels of the map = refs = the panels of kpis/logic.js · the shown conditions = kpiPanelOk', () => {
  const rows = mapRows('view').filter((r) => r.cls === 'panel');
  /* (1) one row per ref, and the KPIs page draws exactly those */
  const KL = rd('modules', 'kpis', 'logic.js');
  const drawn = [...KL.matchAll(/\{ k: "\w+", pk: "(\w+)", sk: "(\w*)" \}/g)].map((m) => m[1] + (m[2] ? '/' + m[2] : ''));
  assert.equal(drawn.length, 11);
  assert.deepEqual(drawn, KPI.refs, 'kpis/logic.js draws the refs of the container, in order');
  assert.equal(rows.length, KPI.refs.length, 'as many panel rows as panels');
  assert.doesNotMatch(KL, /"tkKpi"/, 'the tasks panel has no rule of its own left in the KPIs page');
  /* (2) the conditions: the literal rules of kpiPanelOk (the extraction of tools/validate_schemas.py ⑤) */
  const body = /function kpiPanelOk\(pk, sk\)\{([\s\S]*?)\n  \}/.exec(P334)[1], rules = {};
  for (const m of body.matchAll(/if \(sk === '(\w+)'\) return ([^;]+);/g))
    rules[m[1]] = [...m[2].matchAll(/onCap\('(\w+)'\)/g)].map((x) => 'lens:lens:' + x[1]).concat([...m[2].matchAll(/\bcan\('(\w+)', 'view'\)/g)].map((x) => 'perm:' + x[1])).sort();
  assert.deepEqual(Object.keys(rules).sort(), ['kpiDaily', 'kpiOcc', 'kpiZones']);
  for (const r of rows) {
    const sk = r.key.includes('/') ? r.key.split('/')[1] : '';
    assert.deepEqual(J(r.req).filter((x) => x.kind !== 'code').map((x) => x.kind + ':' + x.on).sort(), rules[sk] || [], 'conditions of ' + r.key);
    if (rules[sk]) { assert.equal(r.reqOn, true); for (const x of r.req) assert.ok(r.reqTxt.includes(x.kind === 'lens' ? 'عدسة' : 'عرض «'), r.key + ' names its condition: ' + r.reqTxt); }
  }
  assert.match(rows.find((r) => r.key === 'daily/kpiOcc').reqTxt, /عدسة المصليات في سقف الوحدة وعدسة الكثافة في سقف الوحدة/, 'kpiOcc needs both lenses');
  assert.match(rows.find((r) => r.key === 'daily/kpiDaily').reqTxt, /تظهر بشرط: عرض «التقرير اليومي»/);
  /* (3) a panel without an owner names the key that grants it (and repeats no chip): the targets of its «view» atom */
  for (const id of ['daily/kpiDaily', 'daily/kpiOcc', 'daily/kpiZones', 'tasks#panel']) {
    const r = rows.find((x) => x.key === id), leaf = id.replace('#panel', '');
    const want = [...new Set(Object.values(REG.atoms).filter((a) => a.leaf === leaf && a.act === 'view').flatMap((a) => a.targets))];
    assert.ok(r.isPanel && want.length, id); assert.deepEqual(J(r.via), want, 'granting key of ' + id);
    for (const k of want) assert.ok(r.reqTxt.includes(REG.registry.find((e) => e.key === k).label), id + ' names «' + k + '»');
  }
  /* (4) kpiPanelOk serves the page-level ref through the page's own view right — no new leaf, no new key */
  assert.match(body, /if \(!sk\) return can\(pk, 'view'\);/);
  assert.equal(REG.registry.length, 269); assert.equal(PAGES.pages.find((p) => p.key === 'tasks').tabs, undefined);
});

test('A6 «الوحدات» = the pages that carry activation; always is locked; the switch is where it was', () => {
  const rows = Array.from(page()._plMods(["seized"], (on) => "TG:" + on));
  const want = PAGES.pages.filter((p) => p.activation);
  assert.equal(want.length, 14);
  assert.deepEqual(rows.map((r) => [r.k, r.name, r.activation]), want.map((p) => [p.key, p.name, p.activation]), 'one row per page with activation, in the manifest order');
  for (const r of rows) {
    const p = want.find((x) => x.key === r.k);
    assert.equal(r.sw, p.platSwitch === true && p.activation === 'toggle', r.k + ': switch');
    if (p.activation === 'always') { assert.equal(r.sw, false); assert.match(r.why, /^دائمة — لا تُطفأ/); assert.match(r.tg, /cursor:not-allowed/); }
    if (!r.sw) assert.ok(r.whyOn && r.why, r.k + ': a row without a switch says why'); else assert.equal(r.why, '');
  }
  assert.deepEqual(rows.filter((r) => r.sw).map((r) => r.k), ['planning', 'daily', 'irshad', 'seized', 'award'], 'the switchable units are the ones that were switchable');
  const emps = rows.find((r) => r.k === 'emps');
  assert.equal(emps.sw, false); assert.ok(emps.why.includes(PAGES.pages.find((p) => p.key === 'emps').platLock), 'emps is locked with its declared reason');
  assert.equal(rows.find((r) => r.k === 'seized').note, 'مطفأة'); assert.equal(rows.find((r) => r.k === 'seized').tg.startsWith('TG:false'), true);
  /* the description and the usage count come from the structure: «المهام» is counted under «المتابعة اليومية», not under «موظفو الإدارة» */
  assert.equal(rows.find((r) => r.k === 'daily').sub, 'مؤشرات المتابعة — التشغيل اليومي · مؤشرات المتابعة — الإشغال · مؤشرات المتابعة — المصليات · الجولات اليومية · رصد الميدان — حالة الموقع واتجاه الحركة من صفحة الموظف · التقرير اليومي · المهام');
  assert.match(rows.find((r) => r.k === 'tasks').sub, /^تحت «المتابعة اليومية»/);
  assert.match(rows.find((r) => r.k === 'daily').note, /^2 /, 'daily: used by both units (u1 holds daily · u2 holds tasks under it)');
  assert.match(rows.find((r) => r.k === 'emps').note, /^1 /, 'emps: u1 alone (tasks no longer counts for it)');
  /* no hand list left */
  assert.doesNotMatch(ADMIN, /\["planning", "الخطة التشغيلية"/); assert.doesNotMatch(ADMIN, /"بيانات الموظفين · المهام · العهد"/); assert.doesNotMatch(ADMIN, /if \("emps" === e\) return;/);
  assert.match(ADMIN, /plMods: this\._plMods\(b, c\),/);
});

/* 333 in a vm over the real manifest: its inputs from the permission model are stand-ins that say «inside the ceiling» */
function siteMapOf(pg) {
  const M = KIVO.KIVO_MANIFEST, PAGE_REG = M.clone('pages'), PAGE_OF = {}; PAGE_REG.forEach((p) => { PAGE_OF[p.key] = p; });
  const K = { KIVO_MANIFEST: M, KIVO_REGISTRY: KIVO.KIVO_REGISTRY, BassamCount: KIVO.BassamCount, BassamDepts: { list: () => [{ id: 'u1', name: 'TEST_ONLY وحدة ١' }] },
    __BS_I: { auth: { NAV_REG: M.clone('containers'), PAGE_OF, PAGE_REG, curDept: () => 'u1', onAny: () => true, onCap: (k) => k !== 'seized',
      isContainer: (k) => !!(PAGE_OF[k] && ((PAGE_OF[k].subs || []).length || (PAGE_OF[k].tabs || []).length || PAGE_REG.some((q) => q.under === k))),
      splitLeaf: (k) => { const i = String(k).indexOf('/'); return i === -1 ? { page: k, sub: '' } : { page: k.slice(0, i), sub: k.slice(i + 1) }; } } } };
  const c2 = vm.createContext({ KIVO: K, JSON, Object, Array, String });
  vm.runInContext(P333, c2, { filename: '333-platform-map.js' });
  const center = pg.CON_TABS().map((t) => ({ name: t[2] || 'إعدادات المنصة', addr: '#/sysadmin/' + (t[0] === 'depts' ? 'org' : t[0]), hint: '' }));
  return { rows: J(K.__BS_I.auth.siteMap({ center, struct: pg.t24Struct() })), order: J(K.__BS_I.auth.navOrder()) };
}

test('A7 siteMap: the centre tabs come from the admin page\'s one list; lenses · platform · references from the tree builder', () => {
  const pg = page(), tabs = J(pg.CON_TABS()), { rows, order } = siteMapOf(pg);
  assert.deepEqual(J(tabs).map((t) => t[0]), ['overview', 'sec', 'users', 'perms', 'plat', 'depts', 'oplog', 'backup', 'histimp']);
  for (const t of tabs) if (t[2]) assert.ok(!P333.includes(t[2]), '333 does not spell «' + t[2] + '»');
  for (const lit of ['نظرة عامة', 'خادم فقط', 'هوية المنصة', 'بياناتي', "'links','help'", "['admin']"]) assert.ok(!P333.includes(lit), '333 no longer holds «' + lit + '»');
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

test('editors are untouched by the map: without o.map the rows are the tree rows as before (no system/panel rows, editor badges)', () => {
  const c = page(), S = c.t24Struct(), exp = {}, lx = {};
  S.forEach((x) => { exp[x.id] = 1; x.leaves.forEach((l) => { lx[l.owner] = 1; }); });
  for (const mode of ['cap', 'emp', 'tpl', 'view']) {
    const rows = Array.from(c.t24Rows({ mode, ceil: { lens: () => true }, on: {}, lens: [], exp, leafExp: lx, canEdit: true, target: { role: "staff", mgr: false } }).rows);
    assert.equal(rows.filter((r) => r.isSys || r.isPanel || r.isShow).length, 0, mode + ': no map-only rows');
    assert.deepEqual(rows.filter((r) => r.isLeaf).map((r) => r.key), J(S).flatMap((x) => x.leaves.map((l) => l.owner)), mode + ': leaves in the manifest order');
    assert.deepEqual([...new Set(rows.filter((r) => r.isLeaf).map((r) => r.badge))].sort(), ['المنصة', 'تبويب', 'خارج الصفحة', 'صفحة', 'عدسة', 'مرجع'].sort(), mode + ': editor badges unchanged');
    assert.ok(rows.filter((r) => r.isLeaf).every((r) => r.reqOn === false && r.reqTxt === ''), mode + ': no condition text in an editor');
  }
});

test('A10 the new display code opens no storage key and no API route', () => {
  const body = (name) => { const i = ADMIN.indexOf('\n  ' + name + '('); assert.ok(i > 0, name); const j = ADMIN.indexOf('\n  }\r\n  ', i); return ADMIN.slice(i, j); };
  for (const fn of ['_pmMap', '_plMods', '_siteMap', 'CON_TABS', '_p24Of', '_upInh', 't24Struct'])
    assert.doesNotMatch(body(fn), /localStorage|sessionStorage|fetch\(|\/api\/|bassam_[a-z0-9_]+_v\d|__BS_SRV/, fn + ' reads the manifest, the registry and the permission model only');
  assert.doesNotMatch(P333.slice(P333.indexOf('function siteMap')), /localStorage|fetch\(|\/api\/|bassam_[a-z0-9_]+_v\d/);
  void ctx;
});
