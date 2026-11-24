/* V7 · د6 — مجموعة م6 «الناس»: تبويباتُ «المسؤولون» (ب6) · «الأدوار» (ب7) · «الأشخاص» و«السجل» و«البيانات» (ب8) · العقدةُ وما تحتها وحدها (ب9)
   · عرضُ المدير (ب12) · ومصدرُ التعديلات غير المحفوظة للحارس (ب11 — p44DirtySource). عالمٌ مصطنع (TEST_ONLY) بالخدمات الحقيقية (org_world.mjs)،
   وجدولُ حسابات «المسؤولون» من صفحة الإعدادات الفعلية (src/modules/admin/logic.js) فوق بدائل صغيرة. لا شبكة ولا بيانات حقيقية. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { orgWorld, ORG, ORG_VIEW, J, rowIds } from './org_world.mjs';

const deq = (a, b, m) => assert.deepEqual(J(a), J(b), m);
const A = 'TEST_ONLY_A', B = 'TEST_ONLY_B', S1 = 'TEST_ONLY_A_S1', G = 'TEST_ONLY_G', SEC = 'TEST_ONLY_SEC', Z = 'TEST_ONLY_Z';
const ROLE = { id: 'TEST_ONLY_r1', name: 'TEST_ONLY مدخل', sys: { tasks: { lvl: 'view' } } };
const ROLE2 = { id: 'TEST_ONLY_r2', name: 'TEST_ONLY مراجع', sys: {} };
const ROLE_B = { id: 'TEST_ONLY_rB', name: 'TEST_ONLY دور ب', sys: {} };
const DOCS = {
  [A]: { roles: [ROLE, ROLE2], people: { TEST_ONLY_e1: { role: ROLE.id, ex: [] }, TEST_ONLY_e2: { role: ROLE.id, ex: [] } } },
  [B]: { roles: [ROLE_B], people: { TEST_ONLY_e4: { role: ROLE_B.id, ex: [] } } },
};
/* مديرُ قسمٍ ومديرُ الإدارة ب — لاختبار الحدود بين الفروع وعرضِ مدير القسم */
const USERS = ORG.users.concat([
  { id: 'TEST_ONLY_mS', name: 'TEST_ONLY مدير قسم', un: '1100000003', role: 'staff', deptId: S1, ekey: 'mgr:' + S1, mgr: 1 },
  { id: 'TEST_ONLY_mB', name: 'TEST_ONLY مدير ب', un: '1100000002', role: 'staff', deptId: B, ekey: 'mgr:' + B, mgr: 1 },
]);
const NAMES_B = ['TEST_ONLY موظف ب', 'TEST_ONLY مدير ب', ROLE_B.name, 'TEST_ONLY إدارة ب'];
/* seenBy: المصدرُ الواحد (334) — بديلٌ يسجّل الحاملَ الذي سُئل عنه */
function world(o = {}) {
  const W = orgWorld(Object.assign({ users: USERS, docs: DOCS }, o)), seen = [];
  W.KIVO.BassamPerm.seenBy = (h) => (seen.push(J(h)), [{ k: 'profile', n: 'صفحتي' }, { k: 'tasks', n: 'TEST_ONLY المهام' }]);
  const fetched = [];
  W.C.fetch = async (u) => (fetched.push(String(u)), { ok: true, json: async () => ({ ok: 1, rows: [] }) });
  return Object.assign(W, { seen, fetched });
}
const txt = (x) => JSON.stringify(x);
const later = () => new Promise((r) => setTimeout(r, 10));   /* the log read is scheduled with setTimeout(…, 0) */

/* ══ ب6 · «المسؤولون» ══ */
test('ب6 · «المسؤولون»: مسؤولو العقدة وعددُهم في العنوان · الجدولُ القائم وزرُّ الإضافة لمدير المنصة وحده · حالةٌ فارغة واضحة · صفُّ المنصة بطاقةُ «مدير المنصة»', () => {
  const W = world();
  let v = W.open('#/sysadmin/org/' + A + '/admins');
  assert.equal(v.ogOnAdmins, true); assert.equal(v.p44Show, true); assert.equal(v.p44IsMgr, true);
  assert.equal(v.p44Head, 'المسؤولون'); assert.equal(v.ogU.name, 'TEST_ONLY إدارة أ', 'the heading carries the unit name (h3 {{p44Head}} · {{ogU.name}})');
  assert.equal(v.ogHeadN, '1 مدير', 'and the count of its admins');
  assert.match(v.p44Lead, /مسؤولو «TEST_ONLY إدارة أ»: 1 مدير/);
  assert.equal(v.p44MgrFull, true, 'the platform admin in the centre: the existing accounts card (the host slot)'); assert.equal(v.ogSlotAdmins.TEST_ONLY, 'admins');
  assert.equal(v.p44MgrAddOn, true, '«+ إضافة مدير» for the platform admin');
  assert.match(ORG_VIEW, /<h3>\{\{p44Head\}\} · \{\{ogU\.name\}\}<sc-if value="\{\{ogHeadN\}\}"[^>]*> <span class="p44-mute" data-og="head-n">· \{\{ogHeadN\}\}<\/span><\/sc-if><\/h3>/);
  /* several managers: the count follows (deptManagers — the source the host table is drawn from) */
  const W2 = world({ users: USERS.concat([{ id: 'TEST_ONLY_mA2', name: 'TEST_ONLY مدير أ ثانٍ', un: '1100000009', role: 'staff', deptId: A, ekey: 'mgr:' + A + ':2', mgr: 1 }]) });
  assert.equal(W2.open('#/sysadmin/org/' + A + '/admins').ogHeadN, '2 مدير');
  /* no manager: one clear empty state */
  const W3 = world({ users: ORG.users });
  v = W3.open('#/sysadmin/org/' + B + '/admins');
  assert.equal(v.ogHeadN, 'لا مدير بعد'); assert.equal(v.p44MgrNone, true); assert.match(v.p44Lead, /لا مدير بعد/);
  /* a supervisory node: its own general managers */
  v = W.open('#/sysadmin/org/' + G + '/admins');
  assert.equal(v.ogHeadN, '1 مدير'); assert.equal(v.ogU.name, 'TEST_ONLY إدارة عامة');
  /* root row: the «مدير المنصة» card (owner reply · 3) */
  v = W.open('#/sysadmin/org/platform/admins');
  assert.equal(v.p44IsSup, true); assert.equal(v.p44IsMgr, false); assert.equal(v.p44Role.n, 'مدير المنصة'); assert.equal(v.ogHeadN, '1 مدير');
  assert.ok(!('ogSlotAdmins' in v) || v.p44MgrFull === undefined, 'no unit accounts card on the root row');
});

test('ب6 · ب12 · المديرُ يرى «المسؤولون» قراءةً: حاملوه بأسمائهم بلا جدولٍ ولا أفعال ولا إضافة', () => {
  const W = world({ me: 'TEST_ONLY_mA', mode: 'dept', active: A });
  const v = W.open('#/admin/perm/' + A + '/admins');
  assert.equal(v.ogOnAdmins, true); assert.equal(v.p44MgrRO, true); assert.equal(v.p44MgrFull, false, 'the accounts card (row menu · +) is not drawn');
  assert.equal(v.p44MgrAddOn, false);
  deq(v.p44MgrHold.map((m) => m.n), ['TEST_ONLY مدير أ'], 'his unit\'s holders, read-only');
  assert.match(ORG_VIEW, /<sc-if value="\{\{p44MgrFull\}\}"[^>]*>\{\{ogSlotAdmins\}\}<\/sc-if>/, 'the slot is drawn only in the full view');
});

/* ══ ب6 (الصفحةُ المضيفة): جدولُ الحسابات = مسؤولو العقدة نفسِها ══ */
function adminHost({ users, depts, nodes, selected, tab = 'admins' }) {
  const source = fs.readFileSync('src/modules/admin/logic.js', 'utf8'), routeSrc = fs.readFileSync('src/services/325-org-route.js', 'utf8');
  const mgrsOf = (id) => users.filter((u) => u.role === 'staff' && u.deptId === id && /^mgr:/.test(String(u.ekey || '')));
  const gmsOf = (id) => users.filter((u) => u.role === 'gm' && u.gid === id);
  const desc = (id) => { const out = []; const walk = (p) => depts.concat(nodes).filter((x) => (x.gid || x.pid) === p).forEach((x) => { out.push(x.id); walk(x.id); }); walk(id); return out; };
  const KIVO = {
    __ADMIN_MODE: 'site', BassamPageKit: { base: () => class {} },
    BassamDepts: { active: () => depts[0].id, activeName: () => depts[0].name, list: () => depts, treeFlat: () => depts, nodes: () => nodes, nodeOf: (id) => nodes.concat(depts).find((x) => x.id === id), descendantsOf: desc, deptsUnder: (id) => desc(id).filter((x) => depts.some((d) => d.id === x)), isSection: (id) => (depts.find((d) => d.id === id) || {}).kind === 'قسم', ancestorsOf: () => [], pathOf: () => [], context: () => ({ state: 'ready' }), raw: { getItem: () => null } },
    BassamPerm: { PAGE_REG: [], hasCap: () => false, rawCap: () => [], deptCap: () => [], on: () => true },
    BassamAuth: { isSuper: () => true, user: () => ({ id: 'TEST_ONLY_OWNER', role: 'super' }), users: () => users, deptManagers: mgrsOf, groupManagers: gmsOf, deptManager: (id) => mgrsOf(id)[0] || null, groupManager: (id) => gmsOf(id)[0] || null, isMgrKey: (k) => /^mgr:/.test(String(k || '')) },
    BassamFind: { dig: (s) => String(s || '') }, BassamCount: Object.assign((n, w) => n + ' ' + String(w).split('|')[0], { agr: (_n, a, b) => b || a }),
    __BS_SRV: { operations: { reference: () => [], get: () => [], context: () => null } },
  };
  const C = { KIVO, DCLogic: class {}, __BS_BOOT: { cf: 1, srv: 1, uid: 'TEST_ONLY_OWNER' }, location: { hash: '' }, setTimeout, clearTimeout, Date, console, document: { getElementById: () => null }, localStorage: { getItem: () => null } };
  C.window = C; vm.createContext(C); vm.runInContext(routeSrc, C);
  KIVO.BassamOrgRoute.screen = { route: () => ({ mode: 'site', unit: selected, tab }) };
  vm.runInContext(source + '\nglobalThis.TEST_ONLY_Admin=Component;', C);
  const page = Object.create(C.TEST_ONLY_Admin.prototype);
  page.state = { admTab: 'depts', usrPage: 1, usrPerPage: 10 }; page.setState = (p) => { page.state = { ...page.state, ...(typeof p === 'function' ? p(page.state) : p) }; };
  for (const n of ['_adPermVals', 'plVals', 'adVals', 'impVals', 'sfVals', 'tpVals', '_expInfo', '_gmRec', '_upDeptOf', 'up24Model', 'tp24Base']) page[n] = () => ({});
  Object.assign(page, { _admTabsNow: () => ({ l: 'depts', h: 'depts' }), _hashTab: () => {}, _gmKind: () => 'TEST_ONLY عقدة', _gmFor: () => 'TEST_ONLY للعقدة', t24On: () => false, _unSplit: () => ({}), bsOn: () => true, bsKeyCap: () => '', bsAck: () => {}, bsToast: () => {}, _acctCtx: () => ({ l: {}, now: 0 }), _acctRow: (a) => ({ name: a.name }), adUnit: () => '', adRole: () => '' });
  return { page, render: () => page.renderVals() };
}
test('ب6 · ب9 (الصفحةُ المضيفة): جدولُ «المسؤولون» = مسؤولو العقدة المختارة نفسِها (المصدرُ الذي يُعدّ منه العنوان) — لا موظفو الوحدة ولا مسؤولو ما تحتها ولا حسابٌ قديم ولا فرعٌ آخر', () => {
  const nodes = [{ id: G, name: 'TEST_ONLY إدارة عامة', kind: 'إدارة عامة' }];
  const depts = [{ id: A, name: 'TEST_ONLY إدارة أ', gid: G }, { id: B, name: 'TEST_ONLY إدارة ب', gid: G }, { id: S1, name: 'TEST_ONLY قسم أ١', gid: A, kind: 'قسم' }];
  const users = [
    { id: 'TEST_ONLY_OWNER', name: 'TEST_ONLY المالك', role: 'super' },
    { id: 'TEST_ONLY_gm', name: 'TEST_ONLY مدير عام', role: 'gm', gid: G },
    { id: 'TEST_ONLY_mA', name: 'TEST_ONLY مدير أ', role: 'staff', deptId: A, ekey: 'mgr:' + A, mgr: 1 },
    { id: 'TEST_ONLY_mA2', name: 'TEST_ONLY مدير أ ثانٍ', role: 'staff', deptId: A, ekey: 'mgr:' + A + ':2', mgr: 1 },
    { id: 'TEST_ONLY_dm', name: 'TEST_ONLY حساب إدارة قديم', role: 'dept', deptId: A, ekey: 'mgr:' + A },
    { id: 'TEST_ONLY_e1', name: 'TEST_ONLY موظف أ', role: 'staff', deptId: A, ekey: 'TEST_ONLY_e1' },
    { id: 'TEST_ONLY_mS', name: 'TEST_ONLY مدير قسم', role: 'staff', deptId: S1, ekey: 'mgr:' + S1, mgr: 1 },
    { id: 'TEST_ONLY_mB', name: 'TEST_ONLY مدير ب', role: 'staff', deptId: B, ekey: 'mgr:' + B, mgr: 1 },
  ];
  const names = (sel) => adminHost({ users, depts, nodes, selected: sel }).render().ndRows.map((r) => r.name).sort();
  deq(names(A), ['TEST_ONLY مدير أ', 'TEST_ONLY مدير أ ثانٍ'], 'unit A: its own managers (several allowed)');
  deq(names(S1), ['TEST_ONLY مدير قسم'], 'section: its own manager');
  deq(names(G), ['TEST_ONLY مدير عام'], 'a general department: the node\'s own general manager only (not its branch\'s accounts)');
  const v = adminHost({ users, depts, nodes, selected: A }).render();
  assert.equal(v.mgAddOn, true); assert.equal(typeof v.mgAdd, 'function'); assert.match(v.ndFoot, /لمسؤولي هذه الوحدة/);
  /* the one reversible place: _orgAdmIds → null brings the whole scope back */
  const H = adminHost({ users, depts, nodes, selected: A }); H.page._orgAdmIds = () => null;
  assert.equal(H.render().ndRows.length, 5, 'reversed: the unit and its sections\' accounts as before');
});

/* ══ ب7 · «الأدوار» ══ */
test('ب7 · «الأدوار»: الأدوارُ المخصّصة وحدها بعدد حامليها · «+ دور جديد» · المحرّرُ كاملاً · حاملو الدور بأسمائهم · «ماذا يرى حامل الدور» من seenBy', async () => {
  const W = world();
  let v = W.open('#/sysadmin/org/' + A + '/roles');
  deq(v.p44RoleList.map((r) => [r.n, r.sub]), [[ROLE.name, '2 شخص'], [ROLE2.name, 'بلا حاملين']], 'custom staff roles only, each with its holders');
  for (const fixed of ['مدير المنصة', 'مدير الوحدة']) assert.ok(!txt(v.p44RoleList).includes(fixed), fixed + ' is not in the roles tab');
  assert.equal(v.p44RoleNewOn, true);
  for (const k of ['p44RoleNameSet', 'p44RoleDescSet', 'p44RoleSupFlip', 'p44RoleCopy', 'p44RoleDel', 'p44AllOn', 'p44AllOff', 'p44CmpSet', 'p44ChkRun']) assert.equal(typeof v[k], 'function', k);
  assert.ok(Array.isArray(v.p44SysEd) && Array.isArray(v.p44CmpOpts) && Array.isArray(v.p44ChkKeys));
  deq(v.p44RoleHold.map((h) => h.n), ['TEST_ONLY موظف أ١', 'TEST_ONLY موظف أ٢'], 'holders by name, from the same draft');
  assert.equal(v.p44RoleHoldNone, false);
  /* «ماذا يرى حامل الدور» = seenBy({kind:'role', did, keys}) */
  const h = W.seen.find((x) => x.kind === 'role'); assert.ok(h && h.did === A && Array.isArray(h.keys), txt(W.seen));
  deq(v.p44Nav.map((x) => x.n), ['صفحتي', 'TEST_ONLY المهام']);
  /* a holder opens in «الأشخاص», chosen */
  v.p44RoleHold[1].go(); await W.tick(); assert.equal(W.location.hash, '#/sysadmin/org/' + A + '/people');
  v = W.render(); assert.equal(v.p44PSel.n, 'TEST_ONLY موظف أ٢');
  /* the other role: no holders */
  W.open('#/sysadmin/org/' + A + '/roles'); W.page._p44Set({ sel: ROLE2.id }); v = W.render();
  assert.equal(v.p44RoleHoldNone, true); deq(v.p44RoleHold, []);
  assert.match(ORG_VIEW, /data-og="role-holders"/);
  /* «+ دور جديد» joins the list (draft) */
  v.p44RoleNew(); v = W.render(); assert.equal(v.p44RoleList.length, 3); assert.equal(v.p44Dirty, true);
});

/* ══ ب8 · «الأشخاص» · «السجل» · «البيانات» ══ */
test('ب8 · «الأشخاص»: الدور · الاستثناءات · «ما يراه الآن» من seenBy — ومديرُ الوحدة سطرٌ واحد فوق قائمته الحقيقية', () => {
  const W = world();
  W.open('#/sysadmin/org/' + A + '/people');
  W.page._p44Set({ pSel: 'mgr:' + A }); let v = W.render();
  assert.equal(v.p44PSel.n, 'TEST_ONLY مدير أ'); assert.equal(v.p44PMgr, true);
  assert.equal(v.p44PMgrLine, 'مدير الوحدة · يعمل بسقف وحدته كله', 'owner reply 2 · 3: one line above the real menu (V7 · 53 · REVIEW بند 4: «كامل» لم يعد اسمَ مستوى — صيغ السطرُ بلا الكلمة، معناه كما هو)');
  assert.equal(v.p44PEdit, false, 'no role is assigned to the unit manager');
  const ph = W.seen.filter((x) => x.kind === 'person').pop(); deq([ph.did, ph.ekey, ph.mgr], [A, 'mgr:' + A, true], 'his real menu: seenBy for the person');
  deq(v.p44PNav.map((x) => x.n), ['صفحتي', 'TEST_ONLY المهام'], 'the line describes, the list stays');
  assert.match(ORG_VIEW, /<div class="p44-cap">ما يراه الآن<\/div><sc-if value="\{\{p44PMgrLine\}\}"[^>]*><p class="p44-note" data-og="mgr-line">\{\{p44PMgrLine\}\}<\/p><\/sc-if><ul class="p44-menu">/, 'a <p> above the <ul> (the list items stay the menu itself)');
  W.page._p44Set({ pSel: 'TEST_ONLY_e1' }); v = W.render();
  assert.equal(v.p44PMgrLine, ''); assert.equal(v.p44PEdit, true); deq(v.p44PRoles.map((r) => r.t), ['بلا دور', ROLE.name, ROLE2.name]);
  assert.equal(typeof v.p44ExAdd, 'function', 'temporary exceptions');
});

test('ب8 · «السجل» بوحدته و«تراجع عن هذا التغيير» · «البيانات» لمدير المنصة وحده (لا تبويبَ عند المدير)', async () => {
  const W = world();
  W.open('#/sysadmin/org/' + A + '/log'); await later();
  assert.ok(W.fetched.some((u) => u === '/api/perm44/log?d=' + A + '&limit=50'), 'the unit\'s own log: ' + txt(W.fetched));
  W.page._p44Set({ log: { did: A, st: 'ready', items: [{ id: 'x', at: 1, who: { name: 'TEST_ONLY المالك' }, changes: [{ what: 'person', person: 'TEST_ONLY_e1', from: { role: null }, to: { role: ROLE.id } }], affected: ['TEST_ONLY_e1'] }] } });
  let v = W.render(); assert.equal(v.p44LogItems.length, 1); assert.equal(v.p44LogItems[0].undoOn, true); assert.equal(typeof v.p44LogItems[0].undo, 'function');
  v = W.open('#/sysadmin/org/' + A + '/data'); assert.equal(v.ogOnData, true); assert.equal(v.ogSlotData.TEST_ONLY, 'data');
  assert.match(ORG_VIEW, /data-og="data-name">البيانات · \{\{ogU\.name\}\}/, 'the unit name in the data tab title');
  const M = world({ me: 'TEST_ONLY_mA', mode: 'dept', active: A });
  v = M.open('#/admin/perm/' + A + '/data');
  assert.ok(!v.ogTabs.some((t) => t.k === 'data'), 'no «البيانات» for the manager'); assert.equal(v.ogTab, 'overview'); assert.ok(!v.ogOnData);
});

/* ══ ب9 · العقدةُ وما تحتها وحدها ══ */
test('ب9 · الإدارةُ والقسم: مسؤولوها وأدوارُها وأشخاصُها وسجلُّها وحدها — لا سطرَ من فرعٍ آخر، واسمُها في عنوان كل تبويب', async () => {
  const W = world();
  for (const [u, nm] of [[A, 'TEST_ONLY إدارة أ'], [S1, 'TEST_ONLY قسم أ١']]) {
    const out = {};
    for (const t of ['admins', 'roles', 'people', 'log', 'data']) { const v = W.open('#/sysadmin/org/' + u + '/' + t); out[t] = v; assert.equal(v.ogU.name, nm, u + ' · ' + t + ': the unit name in the tab title'); }
    const blob = txt([out.admins.p44MgrHold, out.admins.p44Lead, out.roles.p44RoleList, out.people.p44PRows, out.people.p44PSel]);
    for (const n of NAMES_B) assert.ok(!blob.includes(n), u + ': nothing of the other branch (' + n + ')');
  }
  deq(W.open('#/sysadmin/org/' + A + '/people').p44PRows.map((r) => r.n), ['TEST_ONLY مدير أ', 'TEST_ONLY موظف أ١', 'TEST_ONLY موظف أ٢'], 'A: its own people (not its section\'s)');
  deq(W.open('#/sysadmin/org/' + S1 + '/people').p44PRows.map((r) => r.n), ['TEST_ONLY موظف قسم', 'TEST_ONLY مدير قسم'], 'S1: its own');
  deq(W.open('#/sysadmin/org/' + S1 + '/roles').p44RoleList, [], 'S1: its own roles (none)');
  W.open('#/sysadmin/org/' + S1 + '/log'); await later();
  assert.ok(W.fetched.every((u) => !u.includes('d=' + B)), 'no log read of another branch');
});

test('ب9 · القطاعُ والإدارةُ العامة: مسؤولو العقدة نفسِها · روابطُ «افتح أدوارها» لوحداتها · «أشخاص الفرع» للقراءة بعمود «الوحدة» · سجلُّ العقدة', async () => {
  const W = world();
  let v = W.open('#/sysadmin/org/' + G + '/admins');
  assert.equal(v.ogHeadN, '1 مدير'); assert.ok(!txt(v).includes('TEST_ONLY مدير أ'), 'not the managers of the units under it');
  v = W.open('#/sysadmin/org/' + G + '/roles');
  assert.equal(v.p44NodeRoles, true); assert.equal(v.p44RoleNewOn, false, 'no role is built on a node');
  deq(v.p44NodeUnits.map((u) => [u.n, u.href]), [[ 'TEST_ONLY إدارة أ', '#/sysadmin/org/' + A + '/roles'], ['TEST_ONLY قسم أ١', '#/sysadmin/org/' + S1 + '/roles'], ['TEST_ONLY إدارة ب', '#/sysadmin/org/' + B + '/roles']]);
  assert.match(ORG_VIEW, /<a href="\{\{u\.href\}\}" onClick="\{\{u\.go\}\}" aria-label="افتح أدوار \{\{u\.n\}\}">افتح أدوارها<\/a>/);
  v.p44NodeUnits[2].go({ preventDefault() {} }); await W.tick(); assert.equal(W.location.hash, '#/sysadmin/org/' + B + '/roles', '«افتح أدوارها» → that unit');
  v = W.open('#/sysadmin/org/' + G + '/people');
  assert.equal(v.p44NodePeople, true); assert.ok(!v.p44PFilters, 'read-only table: no role editor');
  const rows = v.p44NPRows.map((r) => [r.n, r.unit]);
  assert.ok(rows.length >= 6 && rows.every((r) => r[1] && r[1] !== '—'), 'the «الوحدة» column: ' + txt(rows));
  assert.ok(!rows.some((r) => /بلا أب/.test(r[1])), 'nothing outside the branch');
  /* a parentless unit and an empty node: no line of the general department */
  v = W.open('#/sysadmin/org/' + Z + '/people'); deq(v.p44PRows, []);
  W.open('#/sysadmin/org/' + G + '/log'); await later();
  assert.ok(W.fetched.includes('/api/perm44/log?d=' + G + '&limit=50'), 'the node log');
});

/* ══ ب12 · عرضُ المدير ══ */
test('ب12 · مديرُ الإدارة: الشاشةُ نفسُها — وحدتُه وما تحتها · بلا أفعال هيكل · «الأنظمة» قراءةً (المفعّل وحده) · «المسؤولون» قراءةً · الأدوار والأشخاص كاملان · لا يغيّر سجلَّه · بلا «البيانات»', () => {
  const W = world({ me: 'TEST_ONLY_mA', mode: 'dept', active: A, caps: { [A]: ['tasks', 'staff'] } });
  let v = W.open('#/admin/perm/' + A + '/systems');
  deq(rowIds(v), [A, S1], 'his unit and below only'); assert.equal(v.ogStructOn, false); assert.equal(v.ogBulkOn, false);
  deq(v.ogTabs.map((t) => t.k), ['overview', 'systems', 'admins', 'roles', 'people', 'log']);
  assert.equal(v.p44MgrV, true, 'the read-only flag (c.mgrV · _p44Viewer "mgr") reaches the systems tab content');
  assert.equal(v.p44SysRO, true); assert.equal(v.p44SysCtl, false); assert.equal(v.p44SysDirty, false);
  assert.ok(v.p44SysRows.length && v.p44SysRows.every((r) => r.on === 'true' && r.sw === false), 'ON only, no switch: ' + txt(v.p44SysRows.map((r) => r.k)));
  assert.ok(!v.p44SysRows.some((r) => r.k === 'plan'), 'an OFF system is never shown');
  v = W.open('#/admin/perm/' + A + '/overview'); assert.equal(v.ogActsOn, false);
  v = W.open('#/admin/perm/' + A + '/roles'); assert.equal(v.p44RoleNewOn, true); assert.equal(typeof v.p44RoleCopy, 'function');
  v = W.open('#/admin/perm/' + A + '/people');
  W.page._p44Set({ pSel: 'mgr:' + A }); v = W.render();
  assert.equal(v.p44PSelf, true, 'his own record'); assert.equal(v.p44PEdit, false, 'he cannot change it');
  v = W.open('#/admin/perm/' + B + '/people'); assert.equal(v.ogU.name, 'TEST_ONLY إدارة أ', 'another branch in the address falls back to his unit');
});

test('ب12 · مديرُ القسم على قسمه · والمديرُ العام على فرعه بقاعدة ب9', () => {
  const S = world({ me: 'TEST_ONLY_mS', mode: 'dept', active: S1 });
  let v = S.open('#/admin/perm/' + S1 + '/admins');
  deq(rowIds(v), [S1]); assert.equal(v.p44MgrRO, true); assert.equal(v.p44MgrAddOn, false);
  v = S.open('#/admin/perm/' + A + '/people'); assert.equal(v.ogU.name, 'TEST_ONLY قسم أ١', 'not his parent department');
  const Gm = world({ me: 'TEST_ONLY_gm', mode: 'dept', active: A });
  v = Gm.open('#/admin/perm/' + G + '/admins');
  deq(rowIds(v), [G, A, S1, B]); assert.equal(v.p44MgrRO, true); assert.equal(v.p44MgrAddOn, false);
  v = Gm.open('#/admin/perm/' + G + '/people'); assert.equal(v.p44NodePeople, true);
  v = Gm.open('#/admin/perm/' + G + '/roles'); assert.equal(v.p44RoleNewOn, false); assert.equal(v.p44NodeUnits.length, 3);
  assert.ok(!Gm.open('#/admin/perm/' + SEC + '/overview').ogTabs.some((t) => t.k === 'data'));
});

/* ══ ب11 · مسودةُ الأدوار والأشخاص في سجلّ حارس م5 (orgDirtySources) — وحفظُها يبلغه النجاحَ والرفض (_p44Save ⇒ true/false · _ogPendEnd) ══ */
test('ب11 · the roles/people draft is a source of the guard registry; its save reports success and refusal', async () => {
  const W = world();
  W.open('#/sysadmin/org/' + A + '/roles');
  const src = () => W.page.orgDirtySources().find((x) => x.k === 'perm');
  assert.ok(src(), 'registered (by م5)'); assert.equal(src().dirty(), false);
  W.render().p44RoleNew(); assert.equal(src().dirty(), true); assert.equal(src().unit, A); assert.equal(W.page.orgDirty(), true);
  W.open('#/sysadmin/org/' + A + '/people'); assert.equal(src().dirty(), true, 'one draft for both tabs'); assert.equal(src().tab, 'people');
  const E0 = W.E, eng = (commit) => { W.page._p44E = () => Object.assign({}, E0, { commit }); };
  let ended = []; const end0 = W.page._ogPendEnd.bind(W.page); W.page._ogPendEnd = (ok) => (ended.push(ok), end0(ok));
  eng(async () => ({ ok: false, err: 'denied' }));
  assert.equal(await W.page._p44Save(), false); assert.equal(src().dirty(), true, 'refused: the draft stays'); deq(ended, [], 'a refusal ends nothing (the guard keeps waiting)');
  assert.match(W.render().p44RevErr, /رفض الخادم/);
  W.page._p44Set({ rev: null }); eng(async () => ({ ok: true }));
  assert.equal(await W.page._p44Save(), true); assert.equal(src().dirty(), false); deq(ended, [true], 'success reported to the guard');
});
