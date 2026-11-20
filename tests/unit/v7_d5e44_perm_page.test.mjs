/* V7 · د5-هـ (44) — تبويبُ «الصلاحيات» في صفحة العقدة (src/modules/admin/logic-perm44.js + view.html): قيمُ الصفحة الفعلية من renderVals
   في عالمٍ مصطنع (TEST_ONLY) على نمط admin_department_context — المحرّكُ KIVO.Perm44 هنا بديلٌ صغير في الاختبار وحده بعقد الوكلاء
   (levels · keysFor · compileRole · effective · diff · sysList · rolesOf · setRoles · setPerson)، لا في كود الإنتاج.
   · الأدوار: تغييرُ المستوى ⇒ مسودةٌ متّسخة، مراجعةٌ بالفرق ومن يتأثر، وحفظٌ واحد (operations.commit مرة) يكتب الأدوارَ وسجلَّ كلِّ متأثر؛
   · مديرُ الإدارة لا يرى نظاماً مطفأً في سقفه (المحرّر · القائمة · الأقسام) ولا دورَ مدير المنصة؛
   · بطاقةُ مدير المنصة «صلاحية كاملة بلا أي قيد» بلا محرّر؛
   · الأشخاص: دورٌ واحد لكل شخص، والاستثناءُ المؤقت بانتهائه (الماضي يُرفض · المنتهي لا يُعدّ)؛
   · السجل: حمولةُ التراجع معكوسة، وتُرفض على موضعٍ تغيّر بعدها؛
   · الأنظمة: الحفظُ بالمسار القائم (setDeptCap · mods.off)، والقفلُ من المنصة أو الأصل؛
   · العنوان #/sysadmin/org/<id>/perm/<قسم>؛ وزرُّ «سقف الصفحات» في قائمة التهيئة يفتح «الصلاحيات ← الأنظمة». */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { moduleLogic, SRC } from './harness.mjs';

const source = moduleLogic('admin');
const view = fs.readFileSync(SRC + '/modules/admin/view.html', 'utf8');
const J = (x) => JSON.parse(JSON.stringify(x));
const DID = 'TEST_ONLY_D', SEC = 'TEST_ONLY_D_S', NODE = 'TEST_ONLY_N';

/* بديلُ المحرّك (TEST_ONLY): مفاتيحُ كل نظام <sk>.view/create/edit/delete/approve(حسّاس) */
function engine(doc, calls) {
  const ORDER = ['view', 'create', 'edit', 'delete'];
  const all = (sk) => ORDER.map((a) => sk + '.' + a).concat([sk + '.approve']);
  const keysFor = (sk, lvl, custom) => {
    if (lvl === 'custom') return (custom || []).filter((k) => all(sk).includes(k));
    const n = { view: 1, input: 2, edit: 3, full: 4, sensitive: 5 }[lvl] || 0;
    return all(sk).slice(0, n);
  };
  const compileRole = (role, ceil) => Object.keys((role && role.sys) || {}).filter((sk) => ceil(sk)).flatMap((sk) => keysFor(sk, role.sys[sk].lvl, role.sys[sk].keys));
  return {
    levels: () => ['view', 'input', 'edit', 'full', 'sensitive', 'custom'],
    sysList: () => [{ k: 'staff', n: 'TEST_ONLY الجدول' }, { k: 'plan', n: 'TEST_ONLY التشغيل' }, { k: 'tasks', n: 'TEST_ONLY المهام' }, { k: 'seized', n: 'TEST_ONLY المضبوطات' }],
    keysFor, compileRole,
    effective: (rec, roles, ceil, now) => {
      const r = (roles || []).find((x) => x.id === (rec || {}).role);
      const ex = ((rec || {}).ex || []).filter((x) => !x.until || x.until > now).map((x) => x.key).filter((k) => ceil(k.split('.')[0]));
      return [...new Set(compileRole(r, ceil).concat(ex))];
    },
    roleNameOf: () => '',
    diff: (a, b) => {
      const out = [], ra = {}, rb = {};
      a.roles.forEach((r) => (ra[r.id] = r)); b.roles.forEach((r) => (rb[r.id] = r));
      Object.keys({ ...ra, ...rb }).forEach((id) => {
        if (!ra[id] || !rb[id]) return out.push({ what: 'role:' + id, from: ra[id] || null, to: rb[id] || null });
        Object.keys({ ...(ra[id].sys || {}), ...(rb[id].sys || {}) }).forEach((sk) => {
          const x = (ra[id].sys || {})[sk] || null, y = (rb[id].sys || {})[sk] || null;
          JSON.stringify(x) !== JSON.stringify(y) && out.push({ what: 'role:' + id + '/sys/' + sk, from: x, to: y });
        });
      });
      Object.keys({ ...a.people, ...b.people }).forEach((ek) => {
        const x = (a.people[ek] || {}).role || null, y = (b.people[ek] || {}).role || null;
        x !== y && out.push({ what: 'person:' + ek + '/role', from: x, to: y });
      });
      return out;
    },
    rolesOf: () => J(doc),
    setRoles: (draft, did, roles) => calls.push(['setRoles', did, J(roles)]),
    setPerson: (draft, did, ek, rec) => calls.push(['setPerson', did, ek, J(rec)]),
  };
}

function world({ caps = { [DID]: ['staff', 'plan', 'tasks'] }, off = [], doc, sup = true } = {}) {
  const calls = [], toasts = [], commits = [], capW = [], platW = [];
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
    Perm44: engine(D0, calls),
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
    },
    BassamPlat: { get: () => J(plat), set: (n) => (platW.push(J(n)), { ok: true }) },
    KIVO_MANIFEST: { clone: () => [{ key: 'staff', activation: 'toggle', platSwitch: true }, { key: 'plan', activation: 'toggle', platSwitch: true }, { key: 'tasks', activation: 'toggle', platSwitch: true }, { key: 'seized', activation: 'toggle', platSwitch: true }] },
    KIVO_REGISTRY: { byKey: { 'tasks.approve': { label: 'TEST_ONLY اعتماد مهمة', sensitive: true } } },
    BassamAuth: { isSuper: () => sup, user: () => ({ id: 'TEST_ONLY_OWNER', role: 'super' }), users: () => users, deptManager: () => null, groupManager: () => null, isMgrKey: () => false, deptManagers: () => [] },
    BassamFind: { filter: (_q, rows) => rows },
    BassamCount: count,
    __BS_SRV: { operations: {
      context: () => ({ uid: 'TEST_ONLY_OWNER', dept: DID, epoch: 2 }), reference: () => [], get: () => [], ready: () => false, read: async () => ({ ok: 1 }),
      commit: async (owner, action, intent, edit) => { commits.push([action, J(intent)]); edit({ TEST_ONLY_draft: 1 }); return { ok: 1 }; },
      explain: () => '',
    } },
  };
  const C = { KIVO, DCLogic: class {}, __BS_BOOT: { cf: 1, srv: 1, uid: 'TEST_ONLY_OWNER' }, location: { hash: '#/sysadmin/org/' + DID }, history: { replaceState() {} }, setTimeout, clearTimeout, Date, console, document: { getElementById: () => null }, localStorage: { getItem: () => null, setItem() { throw Error('no write'); }, removeItem() { throw Error('no write'); } } };
  C.window = C;
  vm.createContext(C);
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
  return { page, render, sub, calls, toasts, commits, capW, platW, KIVO, C };
}
const names = (rows) => rows.map((r) => r.n);

test('the node page shows «الصلاحيات» in place of «سقف الصفحات»; four sections and the view-as switch', () => {
  const W = world(), v = W.sub('systems');
  assert.equal(v.onTabPerm, true); assert.equal(v.tabCapShow, false, 'the old ceiling tab is hidden from the bar');
  assert.deepEqual(J(v.p44Subs.map((x) => x.t)), ['الأنظمة', 'الأدوار', 'الأشخاص', 'السجل']);
  assert.deepEqual(J(v.p44Viewers.map((x) => x.t)), ['مدير المنصة', 'مدير الإدارة']);
  const tabs = view.slice(view.indexOf('aria-label="أقسام صفحة العقدة"'), view.indexOf('<!-- ═══ V7 P1 · نظرة عامة'));
  assert.match(tabs, /<sc-if value="\{\{tabCapShow\}\}"[^>]*>\s*<button[^>]*goTabCap[\s\S]*?<\/sc-if>/, 'the ceiling tab sits behind tabCapShow');
  assert.match(tabs, /onClick="\{\{goTabPerm\}\}"[\s\S]*الصلاحيات/);
  assert.match(view, /إطفاء نظام لا يحذف بياناته: تبقى محفوظة وتعود كما هي عند التفعيل\./);
  assert.match(view, /<div class="p44-as" role="group" aria-label="شاهد الصفحة كـ">/);
  /* the overview checklist's ceiling step now opens «الصلاحيات ← الأنظمة» */
  W.page.state.sysTab = 'ov';
  const st = W.render().ovSteps.find((x) => x.t === 'سقف الصفحات');
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
  assert.deepEqual(J(v.p44SysNav), ['صفحتي', 'TEST_ONLY الجدول', 'TEST_ONLY المهام'], 'what this unit\'s manager sees');
  assert.equal(v.p44SysOnN, '2'); assert.equal(v.p44SysPeople, '4');
  row('plan').flip(); v = W.render(); assert.equal(v.p44SysDirty, false, 'a locked system does not flip');
  row('tasks').flip(); v = W.render(); assert.equal(v.p44SysDirty, true); assert.equal(row('tasks').on, 'false');
  v.p44SysSave();
  assert.deepEqual(J(W.capW), [[DID, ['staff', 'plan']]], 'tasks dropped from this unit\'s own ceiling record — data untouched');
  /* the platform level: mods.off */
  v = W.render(); v.p44Units[0].pick(); v = W.render();
  assert.equal(v.p44Unit.n, 'المنصة كلها'); v.p44SysRows.find((r) => r.k === 'plan').flip(); W.render().p44SysSave();
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
  assert.deepEqual(J(v.p44Nav), [{ n: 'صفحتي', l: '' }, { n: 'TEST_ONLY الجدول', l: 'تعديل' }, { n: 'TEST_ONLY المهام', l: 'إدخال' }], 'the holder\'s menu, live');
  assert.match(v.p44AffTxt, /^1 /, 'one holder affected');
  v.p44Review(); v = W.render();
  assert.equal(v.p44RevOn, true);
  assert.deepEqual(J(v.p44RevRows), [{ what: 'TEST_ONLY مراقب · TEST_ONLY الجدول', from: 'مشاهدة فقط', to: 'تعديل' }]);
  assert.deepEqual(J(v.p44RevAff), ['TEST_ONLY سعد']);
  await v.p44RevSave();
  assert.equal(W.commits.length, 1, 'one save'); assert.equal(W.commits[0][0], 'admin-perm44');
  assert.deepEqual(W.calls.map((c) => (c[0] === 'setPerson' ? c[0] + ':' + c[2] : c[0])), ['setRoles', 'setPerson:TEST_ONLY_e1'], 'roles, then the affected holder — in the same draft');
  assert.equal(W.calls[0][2].find((r) => r.id === 'r_obs').sys.staff.lvl, 'edit');
  v = W.render(); assert.equal(v.p44Dirty, false, 'saved = the new base'); assert.equal(v.p44RevOn, false);
  /* undo of unsaved work, copy, new, compare */
  staff().flip(); v = W.render(); assert.equal(v.p44Dirty, true); v.p44Undo(); assert.equal(W.render().p44Dirty, false);
  W.render().p44RoleCopy(); v = W.render();
  assert.match(v.p44RoleName, /^نسخة من TEST_ONLY مراقب$/); assert.equal(v.p44RoleList.length, 4, 'super + 2 + the copy');
  v.p44CmpSet({ target: { value: 'r_sh' } }); v = W.render();
  assert.equal(v.p44CmpOn, true); assert.deepEqual(J(v.p44CmpRows.filter((r) => r.diff === 'true').map((r) => r.n)), ['TEST_ONLY المهام']);
  /* custom = an explicit key list, starting from the previous level's keys */
  W.render().p44SysEd.find((s) => s.k === 'tasks').setLv({ target: { value: 'custom' } });
  const t = W.render().p44SysEd.find((s) => s.k === 'tasks');
  assert.equal(t.custom, true); assert.deepEqual(J(t.keys.filter((k) => k.on === 'true').map((k) => k.n)), ['tasks.view', 'tasks.create']);
  assert.equal(t.keys.find((k) => k.n === 'TEST_ONLY اعتماد مهمة').sens, true, 'a sensitive key is marked');
});

test('a department manager never sees a system that is OFF in his ceiling — not in the editor, the menu or the sections; no platform-admin role', () => {
  const W = world({ caps: { [DID]: ['staff', 'tasks'] } });   /* plan + seized OFF for this unit */
  const v = W.sub('roles', { viewer: 'mgr', sel: 'r_obs' });
  assert.equal(v.p44MgrV, true);
  assert.deepEqual(J(v.p44Subs.map((x) => x.t)), ['الأدوار', 'الأشخاص', 'السجل'], 'no «الأنظمة» for the manager');
  assert.deepEqual(J(names(v.p44SysEd)), ['TEST_ONLY الجدول', 'TEST_ONLY المهام']);
  assert.ok(!JSON.stringify(v.p44Nav).includes('التشغيل') && !JSON.stringify(v.p44ChkKeys).includes('plan.') && !JSON.stringify(v.p44ChkKeys).includes('seized.'), 'nor in the menu or the access test');
  assert.ok(!v.p44RoleList.some((r) => r.n === 'مدير المنصة'));
  /* a role that still holds an OFF system: compiled within the ceiling only */
  W.page.state.p44.d.roles[0].sys.plan = { lvl: 'full' };
  assert.ok(!JSON.stringify(W.render().p44Nav).includes('التشغيل'));
  /* a real (non-super) viewer is the manager view, whatever was chosen */
  const M = world({ caps: { [DID]: ['staff'] }, sup: false });
  const mv = M.sub('systems', { viewer: 'plat' });
  assert.equal(mv.p44MgrV, true); assert.equal(mv.p44OnSys, false); assert.equal(mv.p44OnRoles, true); assert.equal(mv.p44ViewOn, false);
});

test('the platform-admin card: «صلاحية كاملة بلا أي قيد», no editor, nothing granted', () => {
  const W = world(), v = W.sub('roles', { viewer: 'plat', sel: '__super' });
  assert.equal(v.p44IsSup, true); assert.equal(v.p44NotSup, false); assert.equal(v.p44SysEd, undefined, 'no level editor');
  assert.equal(v.p44RoleList[0].n, 'مدير المنصة'); assert.equal(v.p44RoleList[0].lock, true); assert.equal(v.p44RoleList[0].on, 'true');
  assert.match(view, /<b>صلاحية كاملة بلا أي قيد<\/b>/);
  assert.equal(W.commits.length, 0);
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
  const now = new Date(2026, 10, 20, 10, 0, 0).getTime();
  assert.equal(W.page.p44ExRec({ key: 'tasks.approve', until: '2026-11-19' }, 'TEST_ONLY_OWNER', now).ok, false);
  assert.equal(W.page.p44ExRec({ key: '', until: '' }, 'x', now).ok, false);
  const ok = W.page.p44ExRec({ key: 'tasks.approve', until: '2026-11-30', note: 'TEST_ONLY' }, 'TEST_ONLY_OWNER', now);
  assert.deepEqual(J(ok.rec), { key: 'tasks.approve', until: new Date(2026, 10, 30, 23, 59, 59).getTime(), by: 'TEST_ONLY_OWNER', at: now, note: 'TEST_ONLY' });
  /* add through the form, then an expired one is shown ended and not counted */
  v.p44ExAdd(); v = W.render(); assert.equal(v.p44ExFormOn, true);
  assert.ok(v.p44ExKeys.some((k) => k.v === 'tasks.approve') && !v.p44ExKeys.some((k) => k.v === 'staff.view'), 'only what the role does not already give, inside the ceiling');
  v.p44ExKeySet({ target: { value: 'tasks.approve' } }); W.render().p44ExOk();
  v = W.render();
  assert.equal(v.p44PEx.length, 1); assert.equal(v.p44PEx[0].live, 'true'); assert.match(v.p44PEx[0].meta, /بلا تاريخ انتهاء/);
  assert.ok(v.p44PNav.some((m) => m.n === 'TEST_ONLY المهام' && m.l === 'استثناء'), 'what he sees now includes the exception');
  W.page.state.p44.d.people.TEST_ONLY_e3.ex[0].until = Date.now() - 1000;
  v = W.render();
  assert.equal(v.p44PEx[0].live, 'false'); assert.match(v.p44PEx[0].meta, /انتهى/);
  assert.equal(v.p44PRows.find((r) => r.n === 'TEST_ONLY ريم').hasEx, false, 'an expired exception is not counted');
  assert.ok(!v.p44PNav.some((m) => m.n === 'TEST_ONLY المهام'), 'nor seen');
  assert.equal(v.p44PFilters.find((f) => f.t === 'باستثناءات').n, '0');
  /* the manager row: no role to assign */
  v = W.sub('people', { pSel: 'mgr:' + DID }); assert.equal(v.p44PMgr, true); assert.equal(v.p44PEdit, false);
});

test('④ log: undo = the inverse change, re-applied through the same review; refused when the place changed since', async () => {
  const W = world();
  W.sub('roles', { sel: 'r_obs' });   /* the roles draft is loaded */
  const ev = { id: 'TEST_ONLY_ev', who: 'TEST_ONLY_OWNER', unit: DID, at: 1, affected: ['TEST_ONLY_e1'], changes: [{ what: 'role:r_obs/sys/staff', from: { lvl: 'input' }, to: { lvl: 'view' } }, { what: 'person:TEST_ONLY_e2/role', from: 'r_obs', to: 'r_sh' }] };
  assert.deepEqual(J(W.page.p44UndoOf(ev)), [{ what: 'role:r_obs/sys/staff', from: { lvl: 'view' }, to: { lvl: 'input' } }, { what: 'person:TEST_ONLY_e2/role', from: 'r_sh', to: 'r_obs' }]);
  const base = W.page.state.p44.d.base;
  const r = W.page.p44Apply(base, W.page.p44UndoOf(ev));
  assert.equal(r.ok, true); assert.deepEqual(J(r.doc.roles[0].sys.staff), { lvl: 'input' }); assert.equal(r.doc.people.TEST_ONLY_e2.role, 'r_obs');
  assert.equal(W.page.p44Apply(base, [{ what: 'role:r_obs/sys/staff', from: { lvl: 'full' }, to: null }]).ok, false, 'drift ⇒ refused');
  assert.equal(W.page.p44Apply(base, [{ what: 'unknown:x', from: 1, to: 2 }]).ok, false);
  /* through the page: the log row's button opens the review with the inverse */
  W.page.state.p44.log = { did: DID, st: 'ready', items: [ev] };
  let v = W.sub('log');
  assert.equal(v.p44LogItems.length, 1); assert.deepEqual(J(v.p44LogItems[0].ch.map((c) => [c.from, c.to])), [['إدخال', 'مشاهدة فقط'], ['TEST_ONLY مراقب', 'TEST_ONLY رئيس وردية']]);
  v.p44LogItems[0].undo(); v = W.render();
  assert.equal(v.p44OnRoles, true); assert.equal(v.p44RevOn, true); assert.equal(v.p44Dirty, true);
  assert.equal(v.p44RevRows.length, 2);
  /* a ceiling change is undone through the ceiling writer — and refused on drift */
  const C = world();
  C.page._p44Undo(DID, { changes: [{ what: 'ceil:' + DID + '/tasks', from: false, to: true }] });
  assert.deepEqual(J(C.capW), [[DID, ['staff', 'plan']]], 'tasks turned back off for this unit');
  C.page._p44Undo(DID, { changes: [{ what: 'ceil:' + DID + '/staff', from: true, to: false }] });
  assert.equal(C.capW.length, 1, 'staff is on now, not off as that change left it ⇒ refused'); assert.match(C.toasts.at(-1)[0], /تغيّر هذا الموضع/);
  /* a log that cannot load says so, with a retry */
  W.page.state.p44.log = { did: DID, st: 'error', items: [] }; v = W.sub('log');
  assert.equal(v.p44LogErr, true); assert.equal(typeof v.p44LogRetry, 'function');
});

test('loading and error states for the roles; the access test asks the server and shows its answer', async () => {
  const W = world();
  W.KIVO.Perm44.rolesOf = () => { throw Error('operations-read-required'); };
  let v = W.sub('roles');
  assert.equal(v.p44Loading, true);
  W.KIVO.__BS_SRV.operations.read = async () => ({ ok: 0 });
  await new Promise((r) => setTimeout(r, 5));
  v = W.render(); assert.equal(v.p44Err, true); assert.equal(v.p44Loading, false);
  /* the check: GET /api/perm44/check — the server's answer is shown */
  const X = world(), seen = [];
  X.page.state.p44 = { sub: 'roles', sel: 'r_obs' };
  X.C.fetch = async (u) => { seen.push(u); return { ok: true, json: async () => ({ allow: false, why: 'TEST_ONLY خارج الدور' }) }; };
  {
    v = X.render(); v.p44ChkSet({ target: { value: 'tasks.approve' } }); await X.render().p44ChkRun();
    v = X.render();
    assert.match(seen[0], /^\/api\/perm44\/check\?d=TEST_ONLY_D&role=r_obs&key=tasks\.approve$/);
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
