/* CORE-01 · step 3 — the platform administrator's identity in the App Shell is fixed, not borrowed from the active unit.
   The real root-logic runs in vm (core01_root_world.mjs); display() for super is the real function from 334-perm-tree-tpl.js.
   ① the role label and the platform badge stay the same across setActive; ② on a platform page (sysadmin) the top-bar title is
   «المنصة / ‹page›» and carries no unit name, elsewhere «‹unit› / ‹page›»; ③ with no session the switcher is not a super switcher
   (isSuper0 = !!user() && isSuper()); ④ with BassamAuth.display missing the user card is neutral (no «مدير النظام» default);
   ⑤ the template no longer gates the title on installed-app mode, and nav links carry data-key (260 orders by key, 240 navigates by
   BassamNav, not by label text). */
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { world, rd, UNITS } from './core01_root_world.mjs';

/* display() as shipped: the object-literal method of BassamAuth in 334, run with cur() returning the session */
function realDisplay() {
  const M = rd('permissions/334-perm-tree-tpl.js');
  const i = M.indexOf('display: function(){'); assert.ok(i > 0, 'display() in 334');
  let j = M.indexOf('{', i), d = 0;
  for (let k = j; k < M.length; k++) { if (M[k] === '{') d++; else if (M[k] === '}' && --d === 0) { j = k + 1; break; } }
  const body = M.slice(M.indexOf('function', i), j);
  return (user) => { const ctx = { cur: () => user, D: { list: () => [] }, roleTitle: () => '', gmRoleLabel: () => '' }; vm.createContext(ctx); return vm.runInContext('(' + body + ')()', ctx); };
}
const DISPLAY = realDisplay();

test('super: role label and platform badge are constant across setActive', () => {
  const W = world({ user: { id: 'TEST_ONLY_su', role: 'super', name: 'TEST_ONLY مشرف' }, display: (u) => DISPLAY(u) });
  const before = W.vals();
  assert.equal(before.profRole, 'مدير النظام');
  assert.equal(before.profBadgeOn, true, 'fixed platform badge for super');
  assert.equal(before.profBadge, 'المنصة');
  assert.equal(before.crumbUnit, UNITS[0].name, 'a unit page shows the active unit');
  assert.ok(W.KIVO.BassamDepts.setActive(UNITS[1].id));
  const after = W.vals();
  assert.equal(after.crumbUnit, UNITS[1].name);
  for (const k of ['profName', 'profRole', 'profBadgeOn', 'profBadge', 'profInitial']) assert.equal(after[k], before[k], k + ' does not follow the active unit');
});

test('sysadmin title is «المنصة / ‹page›» without the unit name', () => {
  for (const id of UNITS.map((u) => u.id)) {
    const W = world({ hash: '#/sysadmin', active: id, display: (u) => DISPLAY(u) });
    W.c.setState({ active: 'sysadmin' });
    const v = W.vals();
    assert.equal(v.crumbUnit, 'المنصة');
    assert.equal(v.pageName, 'مدير النظام');
    for (const u of UNITS) assert.ok(!(v.crumbUnit + ' / ' + v.pageName).includes(u.name), 'no unit name on a platform page');
  }
});

test('other roles get no platform badge', () => {
  for (const user of [{ id: 'TEST_ONLY_m', role: 'staff', mgr: true, deptId: UNITS[0].id }, { id: 'TEST_ONLY_d', role: 'dept', deptId: UNITS[0].id }, { id: 'TEST_ONLY_g', role: 'gm', gid: 'TEST_ONLY_g1' }]) {
    const v = world({ user, display: (u) => DISPLAY(u) }).vals();
    assert.equal(v.profBadgeOn, false, user.role);
    assert.notEqual(v.profRole, 'مدير النظام', user.role);
  }
});

test('isSuper0 is false without a session: the switcher stays inert', () => {
  const W = world({ user: null });
  const v = W.vals();
  assert.equal(v.sbDeptBtnStyle, 'pointer-events:none', 'no session = not a super switcher');
  assert.match(v.deptChev, /^display:none;/);
  v.sbDeptClick(); assert.ok(!W.c.state.deptOpen, 'click does nothing');
  const S = world().vals();   /* a real super session still switches */
  assert.equal(S.sbDeptBtnStyle, '');
  assert.match(rd('layouts/root-logic.js'), /const isSuper0 = !!\(KIVO\.BassamAuth && KIVO\.BassamAuth\.user\(\)\) && KIVO\.BassamAuth\.isSuper\(\);/);
});

test('no BassamAuth.display: neutral user card, no «مدير النظام» default', () => {
  const W = world();
  delete W.KIVO.BassamAuth.display;
  const v = W.vals();
  assert.equal(v.profName, ''); assert.equal(v.profRole, ''); assert.equal(v.profBadgeOn, false); assert.equal(v.profInitial, '؟');
  assert.doesNotMatch(rd('layouts/root-logic.js'), /pr = \{ name: "مدير النظام"/);
});

test('collapsed rail: the unit picker opens without expanding the sidebar; no native title over the list', () => {
  const W = world();
  W.c.setState({ sidebarOpen: false });
  W.vals().sbDeptClick();
  assert.equal(W.c.state.deptOpen, true); assert.equal(!!W.c.state.sidebarOpen, false);
  const T = rd('layouts/index.template.html');
  assert.match(T, /<button class="s-dept" sc-camel-on-click="\{\{sbDeptClick\}\}" aria-label="\{\{sbDeptTitle\}\}"/);
  assert.doesNotMatch(T, /class="s-dept"[^>]*\btitle=/);
  assert.match(rd('layouts/helmet-global.css'), /\.bsb\.cx \.s-deptdd\{position:fixed;/);
});

test('shell markup: title in installed-app mode, data-key nav, key-based ordering and navigation', () => {
  const T = rd('layouts/index.template.html'), R = rd('layouts/root-logic.js');
  assert.doesNotMatch(T + R, /notAppMode/, 'the title is not gated on display-mode');
  assert.match(T, /<div class="bs-crumb">\{\{crumbUnit\}\} \/ <span>\{\{pageName\}\}<\/span><\/div>/);
  const keys = [...T.matchAll(/<a class="\{\{n\w+\}\}" data-key="(\w+)"/g)].map((m) => m[1]);
  assert.deepEqual(keys, ['kpis', 'dstats', 'emps', 'planning', 'daily', 'irshad', 'seized', 'award']);
  const P = rd('layouts/260-bassam-plat.js');
  assert.match(P, /a\[data-key="' \+ k \+ '"\]\{order:/); assert.doesNotMatch(P, /nth-of-type/);
  const L = rd('components/240-bassam-link.js');
  assert.match(L, /KIVO\.BassamNav\.go\("sysadmin"\)/); assert.doesNotMatch(L, /مدير النظام"/);
  const W = world(); W.vals();
  W.KIVO.BassamNav.go('sysadmin');
  assert.equal(W.c.state.active, 'sysadmin'); assert.equal(W.KIVO.__ADMIN_MODE, 'site');
  const N = world({ user: { id: 'TEST_ONLY_m', role: 'staff', deptId: UNITS[0].id } }); N.vals();
  N.KIVO.BassamNav.go('sysadmin'); assert.notEqual(N.c.state.active, 'sysadmin', 'only super reaches sysadmin');
});
