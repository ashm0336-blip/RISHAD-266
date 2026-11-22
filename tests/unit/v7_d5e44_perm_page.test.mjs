/* V7 · د5-هـ (44) — تبويبُ «الصلاحيات» في صفحة العقدة (src/modules/admin/logic-perm44.js + view.html): قيمُ الصفحة الفعلية من renderVals
   في عالمٍ مصطنع (TEST_ONLY) على نمط admin_department_context — والمحرّكُ هو KIVO.Perm44 الحقيقيُّ (340 + 345 المولَّد فوق مخزنٍ صغير —
   perm44_real.mjs؛ التوحيد: كان بديلَ اختبار): الأنظمةُ والمستوياتُ والمفاتيحُ والفرقُ والتراجعُ من المحرّك نفسِه الذي يحكم به الخادم.
   · الأدوار: تغييرُ المستوى ⇒ مسودةٌ متّسخة، مراجعةٌ بالفرق ومن يتأثر، وحفظٌ واحد: مسودةُ المحرّك الواحدة تحمل bassam_roles_v1 و
     bsdept:<d>:bassam_grants_v1 معاً (المنحُ المترجَم لكل متأثر) وتُكتب مرةً;
   · مديرُ الإدارة لا يرى نظاماً مطفأً في سقفه (المحرّر · القائمة · الأقسام) ولا دورَ مدير المنصة;
   · بطاقةُ مدير المنصة «صلاحية كاملة بلا أي قيد» بلا محرّر;
   · الأشخاص: دورٌ واحد لكل شخص، والاستثناءُ المؤقت بانتهائه (الماضي يُرفض · المنتهي لا يُعدّ);
   · السجل: صفوفُ /api/perm44/log ({rows}) بفرق المحرّك، و«تراجع» = undo المحرّك (يرفض موضعاً تغيّر بعدها) أو كاتبُ السقف;
   · الأنظمة: الحفظُ بالمسار القائم (setDeptCap · mods.off)، والقفلُ من المنصة أو الأصل;
   · العنوان #/sysadmin/org/<id>/perm/<قسم>؛ وخطوةُ «الصلاحيات» (كانت «سقف الصفحات») في قائمة التهيئة تفتح «الصلاحيات ← الأنظمة». */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { moduleLogic, SRC } from './harness.mjs';
import { perm44Real, rolesKey, grantsKey } from './perm44_real.mjs';

const source = moduleLogic('admin');
const view = fs.readFileSync(SRC + '/modules/admin/view.html', 'utf8');
const J = (x) => JSON.parse(JSON.stringify(x));
const DID = 'TEST_ONLY_D', SEC = 'TEST_ONLY_D_S', NODE = 'TEST_ONLY_N';

function world({ caps = { [DID]: ['staff', 'plan', 'tasks'] }, off = [], doc, sup = true } = {}) {
  const writes = [], toasts = [], capW = [], platW = [];
  const D0 = doc || {
    roles: [
      { id: 'r_obs', name: 'TEST_ONLY مراقب', desc: '', sys: { staff: { lvl: 'view' }, tasks: { lvl: 'input' } } },
      { id: 'r_sh', name: 'TEST_ONLY رئيس وردية', desc: '', sys: { staff: { lvl: 'edit' } } },
    ],
    people: { TEST_ONLY_e1: { role: 'r_obs', ex: [] }, TEST_ONLY_e2: { role: 'r_sh', ex: [] } },
  };
  const depts = [{ id: DID, name: 'TEST_ONLY إدارة' }, { id: SEC, name: 'TEST_ONLY قسم' }];
  const nodes = [{ id: NODE, name: 'TEST_ONLY قطاع', kind: 'قطاع' }];
  const nodeOf = (id) => depts.concat(nodes).find((x) => x.id === id);
  const anc = (id) => (id === DID ? [NODE] : id === SEC ? [NODE, DID] : []);
  const users = [
    { id: 'TEST_ONLY_u1', name: 'TEST_ONLY سعد', un: '1200000101', role: 'staff', deptId: DID, ekey: 'TEST_ONLY_e1' },
    { id: 'TEST_ONLY_u2', name: 'TEST_ONLY فهد', un: '1200000102', role: 'staff', deptId: DID, ekey: 'TEST_ONLY_e2' },
    { id: 'TEST_ONLY_u3', name: 'TEST_ONLY ريم', un: '1200000103', role: 'staff', deptId: DID, ekey: 'TEST_ONLY_e3' },
    { id: 'TEST_ONLY_m', name: 'TEST_ONLY المدير', un: '1100000101', role: 'staff', deptId: DID, ekey: 'mgr:' + DID, mgr: 1 },
  ];
  const plat = { mods: { off: off.slice() } };
  const caps0 = J(caps);
  const on = (k, u) => (anc(u).concat([u])).every((x) => !Array.isArray(caps0[x]) || caps0[x].includes(k));
  const count = Object.assign((n, w) => String(n) + ' ' + (Array.isArray(w) ? w[5] : String(w).split('|')[0]), { agr: (_n, a, b) => b || a, pair: (n, w) => String(n) + ' ' + w, word: (_n, w) => w });
  const KIVO = {
    __ADMIN_MODE: 'site',
    BassamPageKit: { base: () => class {} },
    BassamDepts: {
      active: () => DID, activeName: () => 'TEST_ONLY إدارة', list: () => depts, treeFlat: () => depts, nodes: () => nodes, groups: () => nodes, allNodes: () => nodes.concat(depts),
      nodeOf, ancestorsOf: anc, childrenOf: (id) => (id === DID ? [depts[1]] : []), parentIdOf: () => '', groupIdOf: (id) => (id === DID ? NODE : ''), groupName: () => '',
      pathOf: () => [], deptsUnder: () => [], needsStructure: () => false, nodeKinds: () => [], isSection: (id) => id === SEC,
      context: () => ({ state: 'ready', dept: DID, message: '' }), raw: { getItem: () => null },
    },
    BassamPerm: {
      PAGE_REG: [{ key: 'staff' }, { key: 'plan', subs: [{ key: 'x' }] }, { key: 'tasks' }, { key: 'seized' }], PAGE_KEYS: ['staff', 'plan', 'tasks', 'seized'],
      hasCap: (u) => Array.isArray(caps0[u]), rawCap: (u) => (caps0[u] || []).slice(), deptCap: (u) => (caps0[u] || ['staff', 'plan', 'tasks', 'seized']).slice(),
      on, subOn: () => true, capState: () => null, deptSubs: () => [], setDeptSubs: () => ({ ok: true }), setDeptTabs: () => ({ ok: true }),
      setDeptCap: (u, c) => (capW.push([u, c.slice()]), { ok: true }),
      nameOf: (k) => k,
      /* V7 · د5-ح: مصدرُ القائمة الجانبية الواحد (334 menuFor على صلاحيات مدير الوحدة mgrPerms) — هنا بديلُه من السقف المصطنع */
      mgrPerms: (u) => ({ TEST_ONLY_unit: u }),
      menuFor: (P, d) => ['emps', 'staff', 'plan', 'tasks', 'links', 'admin'].map((k) => ({ k, n: 'TEST_ONLY ' + k, on: k === 'emps' || k === 'admin' || (!plat.mods.off.includes(k) && on(k, P.TEST_ONLY_unit)), hid: k === 'links' })),
      /* سقفُ الوحدة لمحرّك الأدوار (= 331 p24Ceil · p24LeafOn): سجلُّها إن وُجد، والمطفأُ من المنصة خارجه */
      p24: { ceil: (u) => ({ page: (k) => !plat.mods.off.includes(k) && (!Array.isArray(caps0[u]) || caps0[u].includes(k)), sub: () => true, lens: () => true }), leafOn: (C0, leaf) => C0.page(String(leaf).split('/')[0]) },
    },
    BassamPlat: { get: () => J(plat), set: (n) => (platW.push(J(n)), { ok: true }) },
    KIVO_MANIFEST: { clone: () => [{ key: 'staff', activation: 'toggle', platSwitch: true }, { key: 'plan', activation: 'toggle', platSwitch: true }, { key: 'tasks', activation: 'toggle', platSwitch: true }, { key: 'seized', activation: 'toggle', platSwitch: true }] },
    BassamAuth: { isSuper: () => sup, user: () => ({ id: 'TEST_ONLY_OWNER', role: 'super' }), users: () => users, deptManager: () => null, groupManager: () => null, isMgrKey: () => false, deptManagers: () => [] },
    BassamFind: { filter: (_q, rows) => rows },
    BassamCount: count,
    __BS_SRV: { operations: {
      context: () => ({ uid: 'TEST_ONLY_OWNER', dept: DID, epoch: 2 }), reference: () => [], get: () => [], ready: () => false, read: async () => ({ ok: 1 }),
      explain: () => '',
    }, flushAsync: async () => true },
  };
  const C = { KIVO, DCLogic: class {}, __BS_BOOT: { cf: 1, srv: 1, uid: 'TEST_ONLY_OWNER' }, location: { hash: '#/sysadmin/org/' + DID }, history: { replaceState() {} }, setTimeout, clearTimeout, Date, console, document: { getElementById: () => null }, localStorage: { getItem: () => null, setItem() { throw Error('no write'); }, removeItem() { throw Error('no write'); } } };
  C.window = C;
  vm.createContext(C);
  /* المحرّكُ الحقيقي فوق سجلَّي الوحدة — وكلُّ كتابةٍ تُعدّ (المسودةُ الواحدة تكتب مفتاحَيها مرةً) */
  const R0 = J(D0), real = perm44Real(C, { [rolesKey(DID)]: { v: 1, roles: R0.roles, people: R0.people }, [grantsKey(DID)]: { v: 1, emp: {} } });
  const set0 = C.localStorage.setItem;
  C.localStorage.setItem = (k, v) => { writes.push(k); set0(k, v); };
  KIVO.KIVO_REGISTRY = C.KIVO_REGISTRY;
  vm.runInContext(source + '\nglobalThis.TEST_ONLY_Admin=Component;', C);
  const page = Object.create(C.TEST_ONLY_Admin.prototype);
  page.state = { admTab: 'depts', sysSel: DID, sysTab: 'perm', usrPage: 1, usrPerPage: 10 };
  page.setState = (patch) => { page.state = { ...page.state, ...(typeof patch === 'function' ? patch(page.state) : patch) }; };
  for (const n of ['_adPermVals', 'plVals', 'adVals', 'impVals', 'sfVals', 'tpVals', '_expInfo', '_gmRec', '_upDeptOf', 'up24Model', 'tp24Base']) page[n] = () => ({});
  page._admTabsNow = () => ({ l: 'depts', h: 'depts' });
  page._hashTab = () => {}; page._nodeRows = (_d, _s, r) => r; page._parentOpts = () => []; page._gmKind = () => 'TEST_ONLY';
  page.t24On = () => false; page._unSplit = () => ({}); page.bsOn = () => true; page.bsKeyCap = () => ''; page.bsAck = () => {};
  page.bsToast = (m, k) => toasts.push([m, k]);
  page.adWhen = () => 'TEST_ONLY اليوم'; page.adFull = () => 'TEST_ONLY وقت';
  page._acctMenu = () => []; page._rowMenu = () => ({ rmItems: [], rmHas: false, rmOpen: false, rmToggle() {} });
  const render = () => page.renderVals();
  const sub = (s, extra) => { page.setState({ p44: { ...(page.state.p44 || {}), sub: s, ...(extra || {}) } }); return render(); };
  return { page, render, sub, writes, store: real.store, toasts, capW, platW, KIVO, C, E: KIVO.Perm44 };
}
const names = (rows) => rows.map((r) => r.n);

test('the node page shows «الصلاحيات» in place of «سقف الصفحات»; four sections and the view-as switch', () => {
  const W = world(), v = W.sub('systems');
  assert.equal(v.onTabPerm, true); assert.equal(v.tabCapShow, undefined, 'the old ceiling tab is deleted'); assert.equal(v.onTabCap, undefined);
  assert.deepEqual(J(v.p44Subs.map((x) => x.t)), ['الأنظمة', 'الأدوار', 'الأشخاص', 'السجل']);
  assert.deepEqual(J(v.p44Viewers.map((x) => x.t)), ['مدير المنصة', 'مدير الإدارة']);
  const tabs = view.slice(view.indexOf('aria-label="أقسام صفحة العقدة"'), view.indexOf('<!-- ═══ V7 P1 · نظرة عامة'));
  assert.doesNotMatch(view, /tabCapShow|goTabCap|onTabCap|حفظ السقف/, '«سقف الصفحات» (tab · panel · its save) is deleted');
  assert.match(tabs, /onClick="\{\{goTabPerm\}\}"[\s\S]*الصلاحيات/);
  assert.match(view, /إطفاء نظام لا يحذف بياناته: تبقى محفوظة وتعود كما هي عند التفعيل\./);
  assert.match(view, /<div class="p44-as" role="group" aria-label="شاهد الصفحة كـ">/);
  /* the overview checklist's ceiling step now opens «الصلاحيات ← الأنظمة» */
  W.page.state.sysTab = 'ov';
  const st = W.render().ovSteps.find((x) => x.t === 'الصلاحيات');   /* V7 · د5-هـ (44 · المدير): الخطوةُ باسم التبويب الذي تفتحه (كانت «سقف الصفحات») */
  assert.ok(!W.render().ovSteps.some((x) => x.t === 'سقف الصفحات'), 'the old label is gone');
  assert.equal(st.goLbl, 'فتح الصلاحيات'); st.go();
  assert.equal(W.page.state.sysTab, 'perm'); assert.equal(W.page.state.p44.sub, 'systems');
});

test('① systems: a unit row per system, locked by the platform or an ancestor; save goes through the existing ceiling writers', () => {
  const W = world({ caps: { [NODE]: ['staff', 'plan', 'tasks'], [DID]: ['staff', 'plan', 'tasks'] }, off: ['plan'] });
  let v = W.sub('systems');
  const row = (k) => v.p44SysRows.find((r) => r.k === k);
  assert.equal(row('plan').locked, true); assert.equal(row('plan').by, 'المنصة'); assert.equal(row('plan').on, 'false');
  assert.equal(row('seized').locked, true); assert.equal(row('seized').by, 'TEST_ONLY قطاع', 'off in the sector ⇒ locked here');
  assert.equal(row('staff').on, 'true'); assert.equal(row('staff').locked, false);
  /* V7 · د5-ح (قرار المالك): البطاقةُ = قائمتُه الجانبية الفعلية كاملةً (الدائمةُ معها) من مصدر القائمة نفسِه — لا قائمةَ محسوبةً على حدة */
  assert.deepEqual(J(v.p44SysNav), [{ k: 'profile', n: 'صفحتي' }, { k: 'emps', n: 'TEST_ONLY emps' }, { k: 'staff', n: 'TEST_ONLY staff' }, { k: 'tasks', n: 'TEST_ONLY tasks' }, { k: 'admin', n: 'TEST_ONLY admin' }], 'his real side menu: «صفحتي» + menuFor(mgrPerms(unit)) on and not hidden — the permanent pages included');
  assert.deepEqual(J(v.p44SysRows.map((r) => r.k)), J(W.E.sysList().filter((x) => x.toggle !== false).map((x) => x.key)), 'a row per toggleable system of the engine (the always-on ones have no switch)');
  assert.equal(v.p44SysOnN, '2'); assert.equal(v.p44SysPeople, '4');
  row('plan').flip(); v = W.render(); assert.equal(v.p44SysDirty, false, 'a locked system does not flip');
  row('tasks').flip(); v = W.render(); assert.equal(v.p44SysDirty, true); assert.equal(row('tasks').on, 'false');
  /* V7 · د5-ح: «مراجعة وحفظ» تفتح نافذةَ المراجعة (الملخّص · حفظ · رجوع) — لا كتابةَ قبل «حفظ» */
  v.p44SysReview(); v = W.render();
  assert.equal(v.p44RevOn, true); assert.deepEqual(J(v.p44RevRows), [{ what: 'TEST_ONLY إدارة · المهام', from: 'مفعّل', to: 'مطفأ' }], 'the change summary');
  assert.equal(v.p44RevAffTxt, 'يتأثر 4 شخص في هذه الوحدة وما تحتها'); assert.deepEqual(J(W.capW), [], 'nothing written before «حفظ»');
  v.p44RevSave();
  assert.deepEqual(J(W.capW), [[DID, ['staff', 'plan']]], 'tasks dropped from this unit\'s own ceiling record — data untouched');
  assert.equal(W.render().p44RevOn, false, 'the dialog closes after the save');
  /* the platform level: mods.off */
  v = W.render(); v.p44Units[0].pick(); v = W.render();
  assert.equal(v.p44Unit.n, 'المنصة كلها'); v.p44SysRows.find((r) => r.k === 'plan').flip(); W.render().p44SysReview(); W.render().p44RevSave();
  assert.deepEqual(J(W.platW.at(-1).mods.off), [], 'turning plan back on platform-wide');
});

test('② roles: a level change is a dirty draft; review names the diff and the affected; ONE save writes roles + each holder', async () => {
  const W = world();
  let v = W.sub('roles', { viewer: 'plat', sel: 'r_obs' });
  assert.equal(v.p44NotSup, true); assert.equal(v.p44Dirty, false);
  const staff = () => W.render().p44SysEd.find((s) => s.k === 'staff');
  assert.equal(staff().lv, 'view');
  staff().setLv({ target: { value: 'edit' } });
  v = W.render();
  assert.equal(v.p44Dirty, true); assert.equal(staff().lv, 'edit'); assert.match(staff().sub, /تعديل/);
  assert.deepEqual(J(v.p44Nav), [{ n: 'صفحتي', l: '' }, { n: 'الجدول الشهري', l: 'تعديل' }, { n: 'المهام', l: 'إدخال' }], 'the holder\'s menu, live');
  assert.match(v.p44AffTxt, /^يتأثر بها 1 /, 'one holder affected');
  v.p44Review(); v = W.render();
  assert.equal(v.p44RevOn, true);
  assert.deepEqual(J(v.p44RevRows), [{ what: 'TEST_ONLY مراقب · الجدول الشهري', from: 'مشاهدة فقط', to: 'تعديل' }], 'the engine\'s diff, named');
  assert.deepEqual(J(v.p44RevAff), ['TEST_ONLY سعد']);
  await v.p44RevSave();
  /* ONE engine draft, committed once: the roles record AND the compiled grants of the affected holder, together */
  const KR = rolesKey(DID), KG = grantsKey(DID), dr = W.page.__p44LastDraft;
  assert.deepEqual(Object.keys(dr.set).sort(), [KG, KR].sort(), 'one draft holds bassam_roles_v1 and bsdept:<d>:bassam_grants_v1');
  assert.deepEqual(W.writes.slice().sort(), [KG, KR].sort(), 'written once each — one save');
  const RR = JSON.parse(W.store.get(KR)), GG = JSON.parse(W.store.get(KG));
  assert.equal(RR.roles.find((r) => r.id === 'r_obs').sys.staff.lvl, 'edit');
  const want = W.E.compileRole(RR.roles.find((r) => r.id === 'r_obs'), W.E.ceiling(DID).key);
  assert.deepEqual(J(GG.emp.TEST_ONLY_e1.plus), J(want), 'the holder\'s grant = the role compiled by the engine inside the ceiling');
  assert.equal(GG.emp.TEST_ONLY_e1.src, 'role:r_obs'); assert.equal(GG.emp.TEST_ONLY_e2, undefined, 'a holder of an unchanged role is not touched');
  assert.ok(W.toasts.some((t) => /حُفظت الصلاحيات/.test(t[0])));
  v = W.render(); assert.equal(v.p44Dirty, false, 'saved = the new base'); assert.equal(v.p44RevOn, false);
  /* undo of unsaved work, copy, new, compare */
  staff().flip(); v = W.render(); assert.equal(v.p44Dirty, true); v.p44Undo(); assert.equal(W.render().p44Dirty, false);
  W.render().p44RoleCopy(); v = W.render();
  assert.match(v.p44RoleName, /^نسخة من TEST_ONLY مراقب$/); assert.equal(v.p44RoleList.length, 5, 'super + the unit manager (V7 · د5-ح) + 2 + the copy');
  v.p44CmpSet({ target: { value: 'r_sh' } }); v = W.render();
  assert.equal(v.p44CmpOn, true); assert.deepEqual(J(v.p44CmpRows.filter((r) => r.diff === 'true').map((r) => r.n)), ['المهام']);
  /* custom = an explicit key list, starting from the previous level's keys */
  W.render().p44SysEd.find((s) => s.k === 'tasks').setLv({ target: { value: 'custom' } });
  const t = W.render().p44SysEd.find((s) => s.k === 'tasks');
  const lab = (k) => W.KIVO.KIVO_REGISTRY.byKey[k].label;
  assert.equal(t.custom, true); assert.deepEqual(J(t.keys.filter((k) => k.on === 'true').map((k) => k.n)), J(W.E.keysFor('tasks', 'input').map(lab)), 'custom starts from «إدخال»');
  assert.deepEqual(J(t.keys.map((k) => k.n)), J(W.E.sysKeys('tasks').map(lab)), 'every key of the system to choose from');
  const sens = W.E.sysKeys('tasks').filter((k) => W.KIVO.KIVO_REGISTRY.byKey[k].sensitive);
  assert.ok(sens.length && sens.every((k) => t.keys.find((x) => x.n === lab(k)).sens === true), 'a sensitive key is marked');
});

test('a department manager never sees a system that is OFF in his ceiling — not in the editor, the menu or the sections; no platform-admin role', () => {
  const W = world({ caps: { [DID]: ['staff', 'tasks'] } });   /* plan + seized OFF for this unit */
  const v = W.sub('roles', { viewer: 'mgr', sel: 'r_obs' });
  assert.equal(v.p44MgrV, true);
  assert.deepEqual(J(v.p44Subs.map((x) => x.t)), ['الأنظمة', 'الأدوار', 'الأشخاص', 'السجل'], 'V7 · د5-ح: «الأنظمة» for the manager too (read-only)');
  assert.deepEqual(J(names(v.p44SysEd)), ['الجدول الشهري', 'المهام']);
  const offKeys = W.E.sysKeys('plan').concat(W.E.sysKeys('seized'));
  assert.ok(!JSON.stringify(v.p44Nav).includes('التشغيل') && !v.p44ChkKeys.some((x) => offKeys.includes(x.v)), 'nor in the menu or the access test');
  assert.ok(!v.p44RoleList.some((r) => r.n === 'مدير المنصة'));
  /* a role that still holds an OFF system: compiled within the ceiling only */
  W.page.state.p44.d.roles[0].sys.plan = { lvl: 'full' };
  assert.ok(!JSON.stringify(W.render().p44Nav).includes('التشغيل'));
  /* a real (non-super) viewer is the manager view, whatever was chosen */
  const M = world({ caps: { [DID]: ['staff'] }, sup: false });
  const mv = M.sub('systems', { viewer: 'plat' });
  assert.equal(mv.p44MgrV, true); assert.equal(mv.p44OnSys, true); assert.equal(mv.p44SysRO, true, 'V7 · د5-ح: read-only'); assert.equal(mv.p44ViewOn, false);
  assert.deepEqual(J(mv.p44SysRows.map((r) => [r.n, r.sw])), [['الجدول الشهري', false]], 'only what is ON in his ceiling, no switch');
});

test('the platform-admin card: «صلاحية كاملة بلا أي قيد», no editor, nothing granted', () => {
  const W = world(), v = W.sub('roles', { viewer: 'plat', sel: '__super' });
  assert.equal(v.p44IsSup, true); assert.equal(v.p44NotSup, false); assert.equal(v.p44SysEd, undefined, 'no level editor');
  assert.equal(v.p44RoleList[0].n, 'مدير المنصة'); assert.equal(v.p44RoleList[0].lock, true); assert.equal(v.p44RoleList[0].on, 'true');
  assert.match(view, /<b>صلاحية كاملة بلا أي قيد<\/b>/);
  assert.deepEqual(W.writes, [], 'nothing written');
});

test('③ people: exactly one role per person; a temporary exception with its expiry; what he sees now', async () => {
  const W = world();
  let v = W.sub('people', { pSel: 'TEST_ONLY_e3' });
  assert.deepEqual(J(v.p44PRows.map((r) => [r.n, r.role])), [['TEST_ONLY سعد', 'TEST_ONLY مراقب'], ['TEST_ONLY فهد', 'TEST_ONLY رئيس وردية'], ['TEST_ONLY ريم', 'بلا صلاحيات'], ['TEST_ONLY المدير', 'مدير الإدارة']]);
  assert.equal(v.p44PSel.n, 'TEST_ONLY ريم');
  v.p44PRoles.find((c) => c.t === 'TEST_ONLY مراقب').pick();
  v = W.render(); v.p44PRoles.find((c) => c.t === 'TEST_ONLY رئيس وردية').pick();
  v = W.render();
  assert.deepEqual(J(v.p44PRoles.filter((c) => c.on === 'true').map((c) => c.t)), ['TEST_ONLY رئيس وردية'], 'one role — the last pick replaces the first');
  assert.equal(W.page.state.p44.d.people.TEST_ONLY_e3.role, 'r_sh');
  /* the exception record: the past is refused; a day is read to its end */
  const now = new Date(2026, 10, 20, 10, 0, 0).getTime(), XK = W.E.sysKeys('tasks').filter((k) => W.KIVO.KIVO_REGISTRY.byKey[k].sensitive)[0] || W.E.sysKeys('tasks')[0], SV = W.E.keysFor('staff', 'view')[0];
  assert.equal(W.page.p44ExRec({ key: XK, until: '2026-11-19' }, 'TEST_ONLY_OWNER', now).ok, false);
  assert.equal(W.page.p44ExRec({ key: '', until: '' }, 'x', now).ok, false);
  const ok = W.page.p44ExRec({ key: XK, until: '2026-11-30', note: 'TEST_ONLY' }, 'TEST_ONLY_OWNER', now);
  assert.deepEqual(J(ok.rec), { key: XK, until: new Date(2026, 10, 30, 23, 59, 59).getTime(), by: 'TEST_ONLY_OWNER', at: now, note: 'TEST_ONLY' });
  /* add through the form, then an expired one is shown ended and not counted */
  v.p44ExAdd(); v = W.render(); assert.equal(v.p44ExFormOn, true);
  assert.ok(v.p44ExKeys.some((k) => k.v === XK) && !v.p44ExKeys.some((k) => k.v === SV), 'only what the role does not already give, inside the ceiling');
  v.p44ExKeySet({ target: { value: XK } }); W.render().p44ExOk();
  v = W.render();
  assert.equal(v.p44PEx.length, 1); assert.equal(v.p44PEx[0].live, 'true'); assert.match(v.p44PEx[0].meta, /بلا تاريخ انتهاء/);
  assert.ok(v.p44PNav.some((m) => m.n === 'المهام' && m.l === 'استثناء'), 'what he sees now includes the exception');
  W.page.state.p44.d.people.TEST_ONLY_e3.ex[0].until = Date.now() - 1000;
  v = W.render();
  assert.equal(v.p44PEx[0].live, 'false'); assert.match(v.p44PEx[0].meta, /انتهى/);
  assert.equal(v.p44PRows.find((r) => r.n === 'TEST_ONLY ريم').hasEx, false, 'an expired exception is not counted');
  assert.ok(!v.p44PNav.some((m) => m.n === 'المهام'), 'nor seen');
  assert.equal(v.p44PFilters.find((f) => f.t === 'باستثناءات').n, '0');
  /* the manager row: no role to assign */
  v = W.sub('people', { pSel: 'mgr:' + DID }); assert.equal(v.p44PMgr, true); assert.equal(v.p44PEdit, false);
});

test('④ log: the server rows (/api/perm44/log → {rows}) in the engine\'s diff; undo = the engine\'s undo through the same review, refused on drift', async () => {
  const W = world();
  W.sub('roles', { sel: 'r_obs' });   /* the roles draft is loaded */
  /* a row as 057b perm44Route returns it: who {uid, name} · changes = perm44E().diff(before, after) */
  const ev = { id: 'TEST_ONLY_ev', at: 1, who: { uid: 'TEST_ONLY_OWNER', name: 'TEST_ONLY المالك' }, unit: DID, affected: ['TEST_ONLY_e1', 'TEST_ONLY_e2'],
    changes: [{ what: 'sys', role: 'r_obs', sys: 'staff', from: { lvl: 'input' }, to: { lvl: 'view' } }, { what: 'person', person: 'TEST_ONLY_e2', from: 'r_obs', to: 'r_sh' }] };
  const B = W.page.state.p44.d.base, before = J(B);
  before.roles[0].sys.staff = { lvl: 'input' }; before.people.TEST_ONLY_e2.role = 'r_obs';
  assert.deepEqual(J(W.E.diff(before, B).changes), J(ev.changes), 'the row is the engine\'s own diff shape');
  /* the loader reads {ok, rows} */
  W.C.fetch = async () => ({ ok: true, json: async () => ({ ok: 1, rows: [ev] }) });
  await W.page._p44LogLoad(DID);
  let v = W.sub('log');
  assert.equal(v.p44LogItems.length, 1); assert.equal(v.p44LogItems[0].who, 'TEST_ONLY المالك'); assert.equal(v.p44LogItems[0].kind, 'role');
  assert.deepEqual(J(v.p44LogItems[0].ch.map((c) => [c.sys, c.from, c.to])), [['TEST_ONLY مراقب · الجدول الشهري', 'إدخال', 'مشاهدة فقط'], ['TEST_ONLY فهد · الدور', 'TEST_ONLY مراقب', 'TEST_ONLY رئيس وردية']]);
  v.p44LogItems[0].undo(); v = W.render();
  assert.equal(v.p44OnRoles, true); assert.equal(v.p44RevOn, true); assert.equal(v.p44Dirty, true);
  assert.equal(W.page.state.p44.d.roles.find((r) => r.id === 'r_obs').sys.staff.lvl, 'input'); assert.equal(W.page.state.p44.d.people.TEST_ONLY_e2.role, 'r_obs');
  assert.equal(v.p44RevRows.length, 2);
  /* drift: the place is not what that change left ⇒ refused, nothing changes */
  const Dr = world(); Dr.sub('roles', { sel: 'r_obs' });
  Dr.page._p44Undo(DID, { changes: [{ what: 'sys', role: 'r_obs', sys: 'staff', from: { lvl: 'view' }, to: { lvl: 'full' } }] });
  assert.match(Dr.toasts.at(-1)[0], /تغيّر هذا الموضع/); assert.equal(Dr.render().p44Dirty, false);
  /* a ceiling change (perm44CeilDiff: ceil.caps of a unit) is undone through the ceiling writer — and refused on drift */
  const C = world();
  C.page._p44Undo(DID, { changes: [{ what: 'ceil.caps', unit: DID, from: ['staff', 'plan'], to: ['staff', 'plan', 'tasks'] }] });
  assert.deepEqual(J(C.capW), [[DID, ['staff', 'plan']]], 'tasks turned back off for this unit');
  C.page._p44Undo(DID, { changes: [{ what: 'ceil.caps', unit: DID, from: ['staff', 'plan', 'tasks'], to: ['staff'] }] });
  assert.equal(C.capW.length, 1, 'the unit is not as that change left it ⇒ refused'); assert.match(C.toasts.at(-1)[0], /تغيّر هذا الموضع/);
  /* a log that cannot load says so, with a retry */
  W.page.state.p44.log = { did: DID, st: 'error', items: [] }; v = W.sub('log');
  assert.equal(v.p44LogErr, true); assert.equal(typeof v.p44LogRetry, 'function');
});

test('loading and error states for the roles; the access test asks the server and shows its answer', async () => {
  const W = world();
  W.KIVO.Perm44 = Object.assign({}, W.E, { rolesOf: () => { throw Error('TEST_ONLY unreadable'); } });   /* the real engine is frozen: a wrapper that cannot read */
  let v = W.sub('roles');
  assert.equal(v.p44Loading, true);
  await new Promise((r) => setTimeout(r, 5));
  v = W.render(); assert.equal(v.p44Err, true); assert.equal(v.p44Loading, false);
  /* the check: GET /api/perm44/check — the server's answer is shown */
  const X = world(), seen = [];
  X.page.state.p44 = { sub: 'roles', sel: 'r_obs' };
  X.C.fetch = async (u) => { seen.push(u); return { ok: true, json: async () => ({ ok: 1, allow: false, why: 'TEST_ONLY خارج الدور' }) }; };
  {
    const K = X.E.keysFor('tasks', 'sensitive').slice(-1)[0];
    v = X.render(); v.p44ChkSet({ target: { value: K } }); await X.render().p44ChkRun();
    v = X.render();
    assert.equal(seen[0], '/api/perm44/check?d=TEST_ONLY_D&role=r_obs&key=' + encodeURIComponent(K));
    assert.equal(v.p44ChkHas, true); assert.equal(v.p44ChkRes.ok, false); assert.equal(v.p44ChkRes.why, 'TEST_ONLY خارج الدور');
  }
});

test('the address: #/sysadmin/org/<id>/perm/<section> is read by the shell and written by the page', () => {
  const root = fs.readFileSync(SRC + '/layouts/root-logic.js', 'utf8');
  const fn = (name) => { const i = root.indexOf('\n  ' + name + '() {'); assert.ok(i >= 0, name); let d = 0, j = root.indexOf('{', i); for (let k = j; k < root.length; k++) { if (root[k] === '{') d++; else if (root[k] === '}' && --d === 0) return root.slice(i, k + 1); } };
  const C = { location: { hash: '' } }; vm.createContext(C);
  vm.runInContext('globalThis.o = {' + fn('_hashOrgId') + '};', C);
  for (const [h, id] of [['#/sysadmin/org/TEST_ONLY_D', 'TEST_ONLY_D'], ['#/sysadmin/org/TEST_ONLY_D/perm/roles', 'TEST_ONLY_D'], ['#/sysadmin/org/TEST_ONLY_D/perm/x', '']]) {
    C.location.hash = h; assert.equal(C.o._hashOrgId(), id, h);
  }
  /* the page opens the section named by the address (_admTabsNow), and writes it back (_orgSeg) */
  const W = world();
  W.C.location.hash = '#/sysadmin/org/' + DID + '/perm/log';
  W.page._admTabsNow = W.C.TEST_ONLY_Admin.prototype._admTabsNow;
  W.page._orgOpen = () => {}; W.page._admGo = () => {};
  W.KIVO.__ADMIN_OPEN_TAB = 'depts'; W.KIVO.__ADMIN_OPEN_ORG = DID;
  W.page._admTabsNow('site', true, ['depts'], []);
  assert.equal(W.page.__orgTab, 'perm'); assert.equal(W.page.state.p44.sub, 'log');
  W.sub('people');
  assert.equal(W.page._orgSeg(), 'org/TEST_ONLY_D/perm/people');
  W.page.state.sysTab = 'ov'; assert.equal(W.page._orgSeg(), 'org/TEST_ONLY_D');
});

/* ── V7 · د5-هـ (44 · المدير): المستوى الثاني — مديرُ الإدارة يمنح موظفيه داخل السقف من «الإعدادات ← الصلاحيات» (#/admin/perm/<قسم>) ── */
function deptWorld(user, opts) {
  const W = world(Object.assign({ caps: { [DID]: ['staff', 'tasks'] }, sup: user.role === 'super' }, opts || {}));   /* plan + seized OFF for this unit */
  W.KIVO.__ADMIN_MODE = 'dept';
  W.KIVO.__BS_AUTHZ = { mode: (opts && opts.mode) || 'enforce' };
  W.KIVO.BassamAuth.user = () => user;
  W.KIVO.BassamDepts.parentDeptOf = (id) => (id === SEC ? DID : '');
  W.C.__BS_BOOT.cf = 1;
  const hashes = [];
  W.page._hashTab = (pg, t) => hashes.push(pg + '/' + t);
  W.page._admTabsNow = W.C.TEST_ONLY_Admin.prototype._admTabsNow;
  W.page.state = { ...W.page.state, admTab: undefined, sysTab: 'ov', deptTab: 'backup' };
  return Object.assign(W, { hashes });
}
const MGR = { id: 'TEST_ONLY_m', role: 'staff', deptId: DID, ekey: 'mgr:' + DID, mgr: 1 };

test('gating: who sees «الصلاحيات» in a unit\'s settings — the server\'s isMgrOf, never a plain employee', () => {
  const W = world(), g = (u, d) => W.page.p44MgrOf(u, d, W.KIVO.BassamDepts);
  W.KIVO.BassamDepts.parentDeptOf = (id) => (id === SEC ? DID : '');
  assert.equal(g({ role: 'super' }, DID), true, 'the platform admin');
  assert.equal(g(MGR, DID), true, 'the manager of the department');
  assert.equal(g(MGR, SEC), true, 'and of a section of his department');
  assert.equal(g(MGR, 'TEST_ONLY_OTHER'), false, 'not another department');
  assert.equal(g({ role: 'staff', deptId: DID, ekey: 'TEST_ONLY_e1' }, DID), false, 'never a plain employee');
  assert.equal(g({ role: 'staff', deptId: DID, ekey: 'TEST_ONLY_e1', mgr: 0 }, SEC), false);
  assert.equal(g({ role: 'dept', deptId: DID }, DID), true, 'the department account');
  assert.equal(g({ role: 'dept', deptId: 'TEST_ONLY_OTHER' }, DID), false);
  assert.equal(g({ role: 'staff', deptId: SEC, mgr: 1 }, SEC), true, 'a section manager sees his section');
  assert.equal(g({ role: 'staff', deptId: SEC, mgr: 1 }, DID), false, '…not the department above it');
  assert.equal(g({ role: 'gm', gid: NODE }, DID), true, 'a general manager: a unit under his node');
  assert.equal(g({ role: 'gm', gid: 'TEST_ONLY_X' }, DID), false);
  assert.equal(g(null, DID), false); assert.equal(g(MGR, ''), false);
});

test('the manager\'s tab: offered in his settings, the same page in the manager view (roles · people · log), only his ceiling, the address #/admin/perm/<section>', () => {
  const W = deptWorld(MGR);
  let v = W.render();
  assert.equal(v.dTabPmOn, true, 'the tab is offered'); assert.equal(v.showDeptPerm, false); assert.equal(v.p44Show, false, 'not shown until opened');
  assert.equal(v.dTabBarShow, true);
  v.dTabGoPerm(); v = W.render();
  assert.equal(v.showDeptPerm, true); assert.equal(v.p44Show, true);
  assert.equal(v.p44MgrV, true); assert.equal(v.p44ViewOn, false, 'no view-as');
  assert.deepEqual(J(v.p44Subs.map((x) => x.t)), ['الأنظمة', 'الأدوار', 'الأشخاص', 'السجل'], 'V7 · د5-ح: «الأنظمة» read-only too');
  assert.equal(W.hashes.at(-1), 'admin/perm/roles', 'the address names the section (his default: «الأدوار»)');
  v = W.sub('roles', { sel: 'r_obs', viewer: 'plat' });
  assert.equal(v.p44MgrV, true, 'the manager view whatever was chosen');
  assert.deepEqual(J(v.p44SysEd.map((r) => r.n)), ['الجدول الشهري', 'المهام'], 'the role editor: only the systems ON in his ceiling');
  assert.ok(!v.p44RoleList.some((r) => r.n === 'مدير المنصة'));
  W.sub('people'); assert.equal(W.hashes.at(-1), 'admin/perm/people');
  /* the address opens the section (root → __ADMIN_OPEN_DTAB = "perm") */
  const X = deptWorld(MGR);
  X.C.location.hash = '#/admin/perm/log'; X.KIVO.__ADMIN_OPEN_DTAB = 'perm';
  v = X.render();
  assert.equal(v.showDeptPerm, true); assert.equal(X.page.state.p44.sub, 'log'); assert.equal(v.p44OnLog, true);
  /* the console node page keeps its own placement: no dept tab there, and its p44Show is the node tab */
  const S = world(), sv = S.sub('roles');
  assert.ok(!sv.dTabPmOn, 'no dept tab in the console'); assert.equal(sv.p44Show, true); assert.equal(sv.p44ViewOn, true);
});

test('the manager\'s tab: never for a plain employee (nor by the address); the platform admin viewing a department gets the manager view', () => {
  const E = deptWorld({ id: 'TEST_ONLY_u1', role: 'staff', deptId: DID, ekey: 'TEST_ONLY_e1' });
  E.C.location.hash = '#/admin/perm/roles'; E.KIVO.__ADMIN_OPEN_DTAB = 'perm';
  let v = E.render();
  assert.equal(v.dTabPmOn, false); assert.equal(v.showDeptPerm, false); assert.equal(v.p44Show, false);
  assert.equal(v.p44Subs, undefined, 'no permissions values at all');
  E.page.state.deptTab = 'perm'; v = E.render();
  assert.equal(v.p44Show, false, 'a stale tab state opens nothing');
  const S = deptWorld({ id: 'TEST_ONLY_OWNER', role: 'super' });
  S.page.state.deptTab = 'perm'; v = S.render();
  assert.equal(v.p44Show, true); assert.equal(v.p44MgrV, true); assert.equal(v.p44ViewOn, false);
  assert.deepEqual(J(v.p44Subs.map((x) => x.t)), ['الأنظمة', 'الأدوار', 'الأشخاص', 'السجل']);
  /* V7 · د5-ح (القفل · البند 9): لا وضعَ قديماً — التبويبُ يُفتح للمدير بقاعدة isMgrOf وحدها، أيّاً كان وصفُ الوضع في الواجهة (كان مخفيّاً له في الوضع القديم) */
  const L = deptWorld(MGR, { mode: 'legacy' });
  assert.equal(L.render().dTabPmOn, true, 'the manager has the tab: no legacy mode any more');
  const LS = deptWorld({ id: 'TEST_ONLY_OWNER', role: 'super' }, { mode: 'legacy' });
  assert.equal(LS.render().dTabPmOn, true);
});

test('the manager\'s own row: shown as his, not editable (the server refuses «self»); the manager row stays «مدير الإدارة» with its full ceiling', () => {
  const W = deptWorld(MGR);
  W.page.state.deptTab = 'perm';
  let v = W.sub('people', { pSel: 'mgr:' + DID });
  assert.equal(v.p44PSelf, true); assert.equal(v.p44PEdit, false); assert.equal(v.p44PMgr, true);
  assert.deepEqual(J(v.p44PNav), [{ n: 'كل الأنظمة المفعّلة لإدارته', l: 'كامل داخل السقف' }]);
  const row = v.p44PRows.find((r) => r.n === 'TEST_ONLY المدير');
  assert.equal(row.me, true); assert.equal(row.role, 'مدير الإدارة');
  assert.ok(v.p44PRows.filter((r) => r.n !== 'TEST_ONLY المدير').every((r) => r.me === false));
  v = W.sub('people', { pSel: 'TEST_ONLY_e1' });
  assert.equal(v.p44PSelf, false); assert.equal(v.p44PEdit, true, 'his employees are editable');
  assert.match(view, /<sc-if value="\{\{p44PSelf\}\}"[^>]*><p class="p44-note p44-self" role="note">هذا سجلّك أنت/);
});

test('the manager\'s log: no ceiling change (the platform admin\'s) and no change in a system OFF in his ceiling', async () => {
  const W = deptWorld(MGR);
  W.page.state.deptTab = 'perm';
  const rows = [
    { id: 'TEST_ONLY_a', at: 3, who: { uid: 'TEST_ONLY_m', name: 'TEST_ONLY المدير' }, unit: DID, affected: [], changes: [{ what: 'sys', role: 'r_obs', sys: 'plan', from: null, to: { lvl: 'view' } }, { what: 'sys', role: 'r_obs', sys: 'tasks', from: { lvl: 'input' }, to: { lvl: 'edit' } }] },
    { id: 'TEST_ONLY_b', at: 2, who: { uid: 'TEST_ONLY_OWNER', name: 'TEST_ONLY المالك' }, unit: DID, affected: [], changes: [{ what: 'ceil.caps', unit: DID, from: ['staff', 'plan', 'tasks'], to: ['staff', 'tasks'] }] },
    { id: 'TEST_ONLY_c', at: 1, who: { uid: 'TEST_ONLY_m', name: 'TEST_ONLY المدير' }, unit: DID, affected: [], changes: [{ what: 'sys', role: 'r_obs', sys: 'plan', from: { lvl: 'view' }, to: null }] },
  ];
  W.sub('roles', { sel: 'r_obs' });   /* the roles draft is loaded (role names) */
  W.C.fetch = async () => ({ ok: true, json: async () => ({ ok: 1, rows }) });
  await W.page._p44LogLoad(DID);
  const v = W.sub('log');
  assert.deepEqual(J(v.p44LogFilters.map((f) => f.t)), ['الكل', 'الأدوار', 'الأشخاص'], 'no «سقوف الإدارات» filter');
  assert.equal(v.p44LogItems.length, 1, 'only the event with a visible change');
  assert.deepEqual(J(v.p44LogItems[0].ch.map((c) => c.sys)), ['TEST_ONLY مراقب · المهام']);
  assert.ok(!JSON.stringify(J(v.p44LogItems)).includes('التشغيل'), 'the OFF system is not named');
});

/* ── V7 · د5-ح: ملاحظاتُ تجربة المالك على Preview (البنود ١–٦ من «أ») ── */
const logic = fs.readFileSync(SRC + '/slots/modules/admin/logic.js.tpl', 'utf8');
function nodeWorld(opts) {
  const W = world(opts);
  W.KIVO.BassamDepts.deptsUnder = (id) => (id === NODE ? [DID, SEC] : id === DID ? [SEC] : []);
  W.KIVO.BassamDepts.descendantsOf = (id) => (id === NODE ? [DID, SEC] : id === DID ? [SEC] : []);
  W.KIVO.BassamDepts.parentDeptOf = (id) => (id === SEC ? DID : '');
  W.KIVO.BassamAuth.groupManagers = (id) => (id === NODE ? [{ id: 'TEST_ONLY_gm', name: 'TEST_ONLY المدير العام', role: 'gm', gid: NODE }] : []);
  W.page.state.sysSel = NODE;
  return W;
}

test('V7 · د5-ح ① every unit kind (sector node · department · section) carries «الصلاحيات» with its four sections, scoped to it', async () => {
  for (const [id, label] of [[NODE, 'قطاع'], [DID, 'إدارة'], [SEC, 'قسم']]) {
    const W = nodeWorld(); W.page.state.sysSel = id;
    const seen = []; W.C.fetch = async (u) => { seen.push(u); return { ok: true, json: async () => ({ ok: 1, rows: [] }) }; };
    for (const [sub, on] of [['systems', 'p44OnSys'], ['roles', 'p44OnRoles'], ['people', 'p44OnPeople'], ['log', 'p44OnLog']]) {
      const v = W.sub(sub, { viewer: 'plat' });
      assert.equal(v.p44Show, true, label + ' ' + sub + ': the tab is shown');
      assert.deepEqual(J(v.p44Subs.map((x) => x.t)), ['الأنظمة', 'الأدوار', 'الأشخاص', 'السجل'], label + ': four sections');
      assert.equal(v[on], true, label + ' ' + sub);
      assert.equal(v.p44NodeOnly, undefined, label + ': no «open a unit below» placeholder');
    }
    await new Promise((r) => setTimeout(r, 5));
    assert.ok(seen.some((u) => u === '/api/perm44/log?d=' + encodeURIComponent(id) + '&limit=50'), label + ': its own log');
  }
  assert.doesNotMatch(view, /p44NodeOnly/, 'the node placeholder is deleted');
  /* the sector: its roles are the two fixed cards (custom roles live in each unit below — linked), its people are its branch's accounts */
  const N = nodeWorld();
  let v = N.sub('roles', { viewer: 'plat' });
  assert.deepEqual(J(v.p44RoleList.map((r) => r.n)), ['مدير المنصة', 'مدير الوحدة']); assert.equal(v.p44IsMgr, true, 'opens on «مدير الوحدة»');
  assert.equal(v.p44RoleNewOn, false, 'no «+ دور جديد» on a supervisory node'); assert.equal(v.p44NodeRoles, true);
  assert.deepEqual(J(v.p44NodeUnits.map((u) => [u.n, u.href])), [['TEST_ONLY إدارة', '#/sysadmin/org/TEST_ONLY_D/perm/roles'], ['TEST_ONLY قسم', '#/sysadmin/org/TEST_ONLY_D_S/perm/roles']]);
  assert.deepEqual(J(v.p44MgrHold), [{ n: 'TEST_ONLY المدير العام', st: 'نشط' }], 'its general manager holds the card');
  v = N.sub('people');
  assert.equal(v.p44NodePeople, true);
  assert.deepEqual(J(v.p44NPRows.map((r) => [r.n, r.role])), [['TEST_ONLY سعد', 'موظف'], ['TEST_ONLY فهد', 'موظف'], ['TEST_ONLY ريم', 'موظف'], ['TEST_ONLY المدير', 'مدير الوحدة']]);
  N.C.location.hash = '#/sysadmin/org/' + NODE + '/perm/people';
  v.p44NPRows[0].go();
  assert.equal(N.C.location.hash, '#/sysadmin/org/TEST_ONLY_D/perm/people', 'a person opens in «الأشخاص» of his unit');
  assert.equal(N.page.state.p44.pSel, 'TEST_ONLY_e1');
});

test('V7 · د5-ح ② «مدير الوحدة»: a fixed card with its holders; the old node tab moved into it as is; only the platform admin adds', () => {
  const W = world();
  W.KIVO.BassamAuth.deptManagers = () => [{ id: 'TEST_ONLY_m', name: 'TEST_ONLY المدير', role: 'staff', mgr: 1, deptId: DID }];
  let v = W.sub('roles', { viewer: 'plat', sel: '__mgr' });
  assert.deepEqual(J(v.p44RoleList.slice(0, 2).map((r) => [r.n, r.lock])), [['مدير المنصة', true], ['مدير الوحدة', true]], 'beside «مدير المنصة»');
  assert.match(v.p44RoleList[1].sub, /^1 شخص · كامل داخل السقف$/);
  assert.equal(v.p44IsMgr, true); assert.equal(v.p44NotSup, false); assert.equal(v.p44NoRole, false); assert.equal(v.p44SysEd, undefined, 'no level editor');
  assert.equal(v.p44MgrFull, true, 'the accounts table (the old tab\'s content)'); assert.equal(v.p44MgrAddOn, true, 'the platform admin adds');
  assert.equal(v.mgTitle, 'مديرو الإدارة'); assert.equal(typeof v.mgAdd, 'function'); assert.ok(Array.isArray(v.ndRows), 'the same rows (_acctRow)');
  assert.equal(v.mgCount, undefined, 'the tab badge is gone');
  /* the manager view: holders read-only, no add, no accounts table */
  v = W.sub('roles', { viewer: 'mgr', sel: '__mgr' });
  assert.equal(v.p44IsMgr, true); assert.equal(v.p44MgrFull, false); assert.equal(v.p44MgrRO, true); assert.equal(v.p44MgrAddOn, false);
  assert.deepEqual(J(v.p44MgrHold), [{ n: 'TEST_ONLY المدير', st: 'نشط' }]);
  /* the view: the card holds the old block (accounts table · row menu · + gated to the platform admin); the node tab is gone without residue */
  const card = view.slice(view.indexOf('<sc-if value="{{p44IsMgr}}"'), view.indexOf('<sc-if value="{{p44NodeRoles}}"'));
  assert.match(card, /<div class="mk ac7">[\s\S]*<sc-if value="\{\{p44MgrAddOn\}\}"[^>]*><button class="add" onClick="\{\{mgAdd\}\}"[\s\S]*\{\{ndRows\}\}[\s\S]*\{\{u\.rmItems\}\}[\s\S]*\{\{ndFoot\}\}[\s\S]*\{\{mgStaffTxt\}\}/, 'the whole block, as is');
  for (const b of ['{{ndFoot}}', '{{mgStaffTxt}}', '{{ndRows}}', 'class="mk ac7"']) assert.equal(view.split(b).length, 2, b + ': once, inside the card');
  const tags = (x, t) => (x.match(new RegExp('<' + t + '[\\s>]', 'g')) || []).length - (x.match(new RegExp('</' + t + '>', 'g')) || []).length;
  for (const t of ['sc-if', 'sc-for', 'div', 'section']) assert.equal(tags(card, t), 0, 'the card is balanced: ' + t);
  for (const re of [/المسؤولون والحسابات/, /TabEmps|tabEmps|onTabEmps|mgCount/]) { assert.doesNotMatch(view, re); assert.doesNotMatch(logic, re); }
  assert.doesNotMatch(logic, /"emps" === l|sysTab: "emps"|_orgNav\(u, "emps"\)/, 'no route or state for the old tab');
  /* the overview checklist and «مراقبة الحسابات» open the card */
  W.page.state.sysTab = 'ov';
  const st = W.render().ovSteps.find((x) => x.t === 'المسؤول');
  assert.equal(st.goLbl, 'فتح «مدير الوحدة»'); st.go();
  assert.equal(W.page.state.sysTab, 'perm'); assert.equal(W.page.state.p44.sub, 'roles'); assert.equal(W.page.state.p44.sel, '__mgr');
  W.C.location.hash = '#/sysadmin/users';
  W.page._acctOpen({ id: 'TEST_ONLY_m', role: 'staff', deptId: DID }, 'edit', false);
  assert.equal(W.C.location.hash, '#/sysadmin/org/TEST_ONLY_D/perm/roles'); assert.equal(W.page.state.p44.sel, '__mgr');
});

test('V7 · د5-ح ③ the department manager sees «الأنظمة» read-only: only what is ON in his ceiling, no switches, never an OFF one', () => {
  for (const mk of [() => world({ caps: { [DID]: ['staff', 'tasks'] } }), () => deptWorld(MGR)]) {
    const W = mk();
    if (W.hashes) W.page.state.deptTab = 'perm';
    const v = W.sub('systems', { viewer: 'mgr' });
    assert.equal(v.p44OnSys, true); assert.equal(v.p44SysRO, true); assert.equal(v.p44SysCtl, false);
    assert.deepEqual(J(v.p44SysRows.map((r) => [r.n, r.on, r.sw, r.locked])), [['الجدول الشهري', 'true', false, false], ['المهام', 'true', false, false]]);
    assert.deepEqual(J(v.p44Units), [], 'no unit chain to switch'); assert.equal(v.p44SysDirty, false); assert.equal(v.p44SysReview, undefined, 'nothing to save');
    const txt = JSON.stringify(J(v));
    for (const off of ['التشغيل الميداني', 'المضبوطات', 'مطفأ']) assert.ok(!txt.includes(off), 'never shown: ' + off);
  }
  assert.match(view, /<sc-if value="\{\{s\.sw\}\}"[^>]*><button type="button" class="p44-sw" role="switch"/, 'the switch exists only where it can flip');
  assert.match(logic, /\/\^#\\\/admin\\\/perm\\\/\(systems\|roles\|people\|log\)\$\//, 'the manager\'s own tab opens «الأنظمة» by its address');
});

test('V7 · د5-ح ④ «مراجعة قبل الحفظ» is a centered dialog (summary · حفظ · رجوع) in systems, roles and people — closes after the save', async () => {
  const dlg = view.slice(view.indexOf('<sc-if value="{{p44RevOn}}"'), view.indexOf('<!-- ④ السجل -->'));
  assert.match(dlg, /<div class="bs-dlg bs-dlg--modal" onClick="\{\{p44RevOut\}\}">\s*<div dir="rtl" role="dialog" aria-modal="true" aria-labelledby="p44RevT" class="bs-dlg-box[^"]*p44-rev" onClick="\{\{p44Keep\}\}">/, 'the platform dialog (focus inside · Tab trapped · Escape = a click on the layer)');
  assert.match(dlg, /id="p44RevT">مراجعة قبل الحفظ<[\s\S]*\{\{p44RevRows\}\}[\s\S]*onClick="\{\{p44RevSave\}\}"[^>]*>حفظ<[\s\S]*onClick="\{\{p44RevClose\}\}">رجوع</);
  assert.doesNotMatch(view, /class="p44-rev" role="region"/, 'no box at the bottom of the page');
  assert.equal((view.match(/\{\{p44RevOn\}\}/g) || []).length, 1, 'one dialog for the three sections');
  /* roles: open · Escape (the layer) = back · open · save ⇒ closed */
  const W = world();
  W.sub('roles', { viewer: 'plat', sel: 'r_obs' }).p44SysEd.find((s) => s.k === 'staff').setLv({ target: { value: 'edit' } });
  let v = W.render(); v.p44Review(); v = W.render(); assert.equal(v.p44RevOn, true);
  v.p44RevOut(); v = W.render(); assert.equal(v.p44RevOn, false, 'Escape / the layer = «رجوع»'); assert.equal(v.p44Dirty, true, 'the draft stays');
  v.p44Review(); v = W.render();
  W.page.state.p44.rev.busy = 1; W.render().p44RevOut(); assert.equal(W.render().p44RevOn, true, 'not closed while saving'); W.page.state.p44.rev.busy = 0;
  await W.render().p44RevSave(); v = W.render(); assert.equal(v.p44RevOn, false, 'closed after the save'); assert.equal(v.p44Dirty, false);
  /* people: the same dialog */
  const P = world();
  P.sub('people', { pSel: 'TEST_ONLY_e3' }).p44PRoles.find((c) => c.t === 'TEST_ONLY مراقب').pick();
  v = P.render(); v.p44Review(); v = P.render();
  assert.equal(v.p44RevOn, true); assert.deepEqual(J(v.p44RevRows), [{ what: 'TEST_ONLY ريم · الدور', from: '—', to: 'TEST_ONLY مراقب' }]);
  await v.p44RevSave(); assert.equal(P.render().p44RevOn, false);
  /* systems: a refusal stays in the dialog with its reason; nothing toasted */
  const S = world();
  S.KIVO.BassamPerm.setDeptCap = () => ({ ok: false, err: 'TEST_ONLY مرفوض' });
  S.sub('systems').p44SysRows.find((r) => r.k === 'tasks').flip();
  S.render().p44SysReview(); S.render().p44RevSave(); v = S.render();
  assert.equal(v.p44RevOn, true); assert.equal(v.p44RevErr, 'TEST_ONLY مرفوض'); assert.equal(v.p44SysDirty, true, 'the draft stays');
});

test('V7 · د5-ح ⑤ the affected count: «لا يتأثر أحد الآن» when nobody holds the role, else the real count', async () => {
  const W = world();
  W.sub('roles', { viewer: 'plat', sel: 'r_obs' }).p44RoleNew();
  let v = W.render();
  assert.equal(v.p44AffTxt, 'لا يتأثر أحد الآن'); assert.equal(v.p44Role.members, 'لا يحمل هذا الدور أحد بعد');
  v.p44Review(); v = W.render(); assert.equal(v.p44RevAffTxt, 'لا يتأثر أحد الآن'); assert.deepEqual(J(v.p44RevAff), []);
  assert.equal(W.page.p44AffLine(0), 'لا يتأثر أحد الآن'); assert.equal(W.page.p44AffLine(3), 'يتأثر 3 شخص'); assert.equal(W.page.p44AffLine(2, 'يتأثر بها'), 'يتأثر بها 2 شخص');
  await v.p44RevSave(); assert.ok(W.toasts.some((t) => t[0] === 'حُفظت الصلاحيات — لا يتأثر أحد الآن'));
  const X = world(); X.sub('roles', { sel: 'r_obs' });
  X.C.fetch = async () => ({ ok: true, json: async () => ({ ok: 1, rows: [{ id: 'TEST_ONLY_z', at: 1, who: { uid: 'x', name: 'TEST_ONLY' }, unit: DID, affected: [], changes: [{ what: 'name', role: 'r_obs', from: 'أ', to: 'ب' }] }] }) });
  await X.page._p44LogLoad(DID);
  assert.equal(X.sub('log').p44LogItems[0].aff, 'لم يتأثر أحد');
  assert.doesNotMatch(view, /يتأثر بها \{\{p44AffTxt\}\}|يتأثر \{\{p44RevAffN\}\}|يتأثر \{\{e\.aff\}\}/, 'no «يتأثر» glued before a count that may be empty');
});

test('V7 · د5-ح ⑥ creating a role is logged with its systems and their levels (the engine\'s diff carries the role)', async () => {
  const W = world();
  const before = { v: 1, roles: [], people: {} }, role = { id: 'TEST_ONLY_rn', name: 'TEST_ONLY جديد', sys: { tasks: { lvl: 'input' }, staff: { lvl: 'view' } }, sup: true };
  const ch = W.E.diff(before, { v: 1, roles: [role], people: {} }).changes;
  assert.deepEqual(J(ch.map((c) => c.what)), ['role'], 'one engine change for the new role — it carries the role with its systems');
  W.C.fetch = async () => ({ ok: true, json: async () => ({ ok: 1, rows: [{ id: 'TEST_ONLY_ev', at: 1, who: { uid: 'x', name: 'TEST_ONLY' }, unit: DID, affected: [], changes: ch }] }) });
  await W.page._p44LogLoad(DID);
  const v = W.sub('log');
  assert.deepEqual(J(v.p44LogItems[0].ch.map((c) => [c.sys, c.from, c.to])), [
    ['دور جديد · TEST_ONLY جديد', '—', 'TEST_ONLY جديد'],
    ['TEST_ONLY جديد · المهام', '—', 'إدخال'],
    ['TEST_ONLY جديد · الجدول الشهري', '—', 'مشاهدة فقط'],
    ['TEST_ONLY جديد · إشرافي', '—', 'نعم'],
  ]);
  assert.equal(v.p44LogItems[0].undoOn, true, 'undo still uses the change itself');
  /* a deleted role: its systems back to «—»; a new role without systems says so */
  assert.deepEqual(J(W.page.p44Rows([{ what: 'role', role: 'TEST_ONLY_rn', from: { id: 'TEST_ONLY_rn', name: 'TEST_ONLY جديد', sys: { tasks: { lvl: 'full' } } }, to: null }]).map((r) => [r.what, r.from, r.to])),
    [['حذف دور · TEST_ONLY جديد', 'TEST_ONLY جديد', '—'], ['TEST_ONLY جديد · المهام', 'كامل', '—']]);
  assert.deepEqual(J(W.page.p44Rows([{ what: 'role', role: 'q', from: null, to: { id: 'q', name: 'TEST_ONLY فارغ', sys: {} } }]).map((r) => r.to)), ['TEST_ONLY فارغ', 'بلا أنظمة']);
  /* the review before saving a new role names them too */
  const R = world();
  R.sub('roles', { viewer: 'plat' }).p44RoleNew();
  R.render().p44SysEd.find((s) => s.k === 'tasks').flip();
  const rv = R.render(); rv.p44Review();
  assert.deepEqual(J(R.render().p44RevRows.map((r) => [r.what, r.to])), [['دور جديد · دور جديد', 'دور جديد'], ['دور جديد · المهام', 'مشاهدة فقط']]);
});

/* ── V7 · د5-ح (off2 · البند ٦): «الإعدادات» لا ترسم تبويباً قبل حسم الصلاحية · المطلوبُ غيرُ المسموح ⇒ أولُ مسموح · لا مسموحَ ⇒ رسالة ── */
test('V7 · د5-ح (off2) ⑥ the settings tabs: nothing drawn before the permission is decided; a disallowed tab ⇒ the first allowed one; none ⇒ a message', () => {
  const W = deptWorld(MGR);
  let ready = false;
  W.KIVO.BassamPerm.ready = () => ready;
  W.KIVO.BassamPerm.subOn = (pk, sk) => pk === 'admin' && ['backup', 'oplog'].includes(sk);
  W.KIVO.__ADMIN_OPEN_DTAB = 'shifts'; W.C.location.hash = '#/admin/shifts';
  let v = W.render();
  assert.equal(v.dLoadOn, true, 'a loading state'); assert.equal(typeof v.dStates, 'function', 'through the page-states component');
  for (const k of ['showDeptBk', 'showDeptSf', 'showDeptAud', 'showDeptPerm', 'dTabBarShow']) assert.equal(v[k], false, 'no tab before the decision: ' + k);
  assert.equal(W.KIVO.__ADMIN_OPEN_DTAB, 'shifts', 'the requested tab is kept until then');
  assert.deepEqual(W.hashes, [], 'the address is not rewritten before the decision');
  ready = true; v = W.render();
  assert.equal(v.dLoadOn, false); assert.equal(v.showDeptSf, false, 'the disallowed «الورديات» is never drawn');
  assert.equal(v.showDeptBk, true, 'the first allowed tab'); assert.equal(W.page.state.deptTab, 'backup');
  assert.equal(W.hashes.at(-1), 'admin/backup', 'the address is corrected');
  /* no allowed tab at all (a plain account with «الإعدادات» but no tab of it) ⇒ a clear message, not a blank page */
  const E = deptWorld({ id: 'TEST_ONLY_u1', role: 'staff', deptId: DID, ekey: 'TEST_ONLY_e1' });
  E.KIVO.BassamPerm.ready = () => true; E.KIVO.BassamPerm.subOn = () => false;
  v = E.render();
  assert.equal(v.dNoneOn, true); for (const k of ['showDeptBk', 'showDeptSf', 'showDeptAud', 'showDeptPerm']) assert.equal(v[k], false, k);
  assert.match(view, /<sc-if value="\{\{dNoneOn\}\}"[^>]*><div class="bs-card adm-none" role="status" data-d-state="none">لا إعدادات متاحة لك/);
  assert.match(view, /<sc-if value="\{\{dLoadOn\}\}"[^>]*><div ref="\{\{dStates\}\}"/);
});
