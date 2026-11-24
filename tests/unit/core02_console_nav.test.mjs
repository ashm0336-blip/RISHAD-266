/* RISHAD CORE-02 S7 — «مركز إدارة رشاد» as its own space in the app shell (client only; permissions, routes and server unchanged).
     (1) the one map (_sysNav in root-logic.js): the eight admin tabs once each, the seven platform sections once each, in the approved
         five groups; «التهيئة والاستعادة» lives under البيانات والاستمرارية; the labels are the page titles the admin page shows;
     (2) the template: the operational sidebar (unit picker — «+ قسم» deleted in V7 · د5-هـ 44 —, the eight page links, «مواقع ذات صلة», «الإعدادات») sits unchanged
         inside sc-if sbOps; the console block holds none of them;
     (3) console mode is for the platform administrator on #/sysadmin only; every operational page — super included — keeps the class,
         the header offset and the collapse state it had (conCx never touches sidebarOpen);
     (4) the admin page publishes what it shows (conSync) once per change and after the render (no setState inside another render);
         _admTabsNow routes the request through _admGo / _plGo (so the recovery-key read, the log and the notifications load run on
         every path), and the platform section is in the state before the first render;
     (5) the removed in-page strip and its symbols are gone; 260-bassam-plat drops its help group in the console; tokens --con-*.
     (7) the collapsible accordion: each group header is a real <button> (aria-expanded · aria-controls → its list, which is hidden when
         collapsed); one group open at a time, following the address (cold load, Back, in-page link); a header toggles without
         navigating and writes nothing to storage; a collapsed group holding the current page is marked; the rail closes every list;
         every one of the 15 destinations is reachable (V7 · د5-هـ 44: perms · plat/mods deleted) (its group opens on its address, or the group header opens it).
     (8) consistency pass (owner request): the accounts tiles use the tone rule of Home's «الحسابات» card (ordinary count neutral,
         a warning only when non-zero, the same warning for the same metric); «التنبيهات والتعاميم» counts are the shared count tile
         (.adm-ov-kpi, no fixed hex colour, a tone only when non-zero); the three readiness states share .adm-pl-stl; a list with no rows
         shows no column header (templates, security log); the activity-log filters in the console are four labelled groups on the
         shared .adm-chip (aria-pressed, role=group named by its label) while #/admin keeps its own; the phone rules exist.
   The real root-logic.js runs in vm over core01_root_world (TEST_ONLY data). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { world, rd } from './core01_root_world.mjs';
import { needs, shellNavKeys } from './harness.mjs';

const T = rd('layouts/index.template.html'), R = rd('layouts/root-logic.js'), P = rd('layouts/260-bassam-plat.js');
const L = rd('modules/admin/logic.js'), V = rd('modules/admin/view.html'), C = rd('modules/admin/helmet.css'), PG = rd('pages/Admin.dc.html');
/* values built inside the vm are of another realm: compare as data */
const J = (x) => JSON.parse(JSON.stringify(x)), deq = (a, b, m) => assert.deepEqual(J(a), J(b), m);
/* V7 · د5-هـ (44): «خريطة الصلاحيات» (perms) و«الوحدات» (plat/mods) حُذفتا — ثمانيةُ تبويبات وثمانيةُ أقسام */
const SYS_TABS = ['overview', 'depts', 'users', 'plat', 'sec', 'oplog', 'backup', 'histimp'];
/* V7 · د5-ح (قرار المالك 13 نوفمبر): «الطباعة والتقارير — الترويسة والتذييل» (plat/print) حُذف — سبعةُ أقسام */
const PL = ['id', 'notif', 'login', 'side', 'app', 'about', 'setup'];
const ALL = ['overview', 'sec', 'users', 'plat', 'depts', 'oplog', 'backup', 'histimp'];

test('(1) the one map: eight tabs and seven platform sections once each, five groups in order, setup under data', needs('dstats'), () => {
  const W = world({ hash: '#/sysadmin/overview' });
  const N = W.c._sysNav();
  deq(Object.keys(N), ['home', 'org', 'plat', 'sec', 'data']);
  const all = Object.values(N).flat();
  const keys = all.map((x) => x[0] + '/' + (x[1] || ''));
  assert.equal(new Set(keys).size, keys.length, 'no destination twice');
  assert.equal(all.length, 14, '14 destinations');
  deq([...new Set(all.map((x) => x[0]))].sort(), [...SYS_TABS].sort(), 'every admin tab, once');
  deq(all.filter((x) => x[0] === 'plat').map((x) => x[1]).sort(), [...PL].sort(), 'every platform section, once');
  deq(N.data.map((x) => x[1] || x[0]), ['backup', 'setup', 'histimp'], '«التهيئة والاستعادة» in البيانات والاستمرارية');
  deq(N.plat.slice(0, 2).map((x) => x[2]), ['هوية المنصة', 'التنبيهات والتعاميم'], 'the most-used settings first');
  /* the labels are the titles the admin page gives itself (_conHead · plVals) */
  for (const [g, items] of Object.entries(N)) for (const x of items) {
    const re = x[0] === 'plat' ? new RegExp('"' + x[1] + '",\\s*"' + x[2] + '"') : new RegExp('\\["' + x[0] + '", (""|"' + g + '"), "' + x[2] + '", [01]\\]');   /* V7 P4: the titles live in the one tab list CON_TABS() [key · group · title · server-only] that _conHead reads */
    assert.match(L, re, g + ': ' + x[0] + (x[1] ? '/' + x[1] : '') + ' is titled «' + x[2] + '» on its own page');
  }
  /* review of S10: PL_KEYS is derived from the one section list (PL_SECS), which also titles each section's page */
  assert.match(L, /PL_KEYS\(\) \{\s*return this\.PL_SECS\(\)\.map\(\(x\) => x\[0\]\);/, 'PL_KEYS derived from PL_SECS');
  const secs = L.slice(L.indexOf('  PL_SECS() {'), L.indexOf('  PL_KEYS() {'));
  deq([...secs.matchAll(/\[\s*"([a-z]+)",\s*"/g)].map((m) => m[1]).sort(), [...PL].sort(), 'the admin page knows the same seven sections');
  assert.match(L, /p = this\.PL_SECS\(\),/, 'plVals reads the same list');
});

test('(2) template: the operational sidebar is unchanged inside sc-if sbOps; the console block holds only the console', needs('award', 'dstats', 'seized'), () => {
  const ops0 = T.indexOf('<sc-if value="{{sbOps}}" hint-placeholder-val="{{ true }}">'), con0 = T.indexOf('<sc-if value="{{sbConsole}}" hint-placeholder-val="{{ false }}">');
  assert.ok(ops0 > 0 && con0 > ops0, 'both blocks in the one aside');
  const ops = T.slice(ops0, con0), con = T.slice(con0, T.indexOf('</nav>'));
  for (const s of ['class="s-dept"', 'class="s-ghead"', 'مواقع ذات صلة', '{{goAdmin}}']) assert.ok(ops.includes(s), 'operational block keeps ' + s);
  assert.ok(!ops.includes('s-secadd'), 'V7 · د5-هـ (44): «+ قسم» is deleted from the side menu (sections are added from «الإدارات» only)');
  /* V7 · د6 (gatefix): روابطُ الصفحات بترتيبها مشتقّةً من القالب وإعلانات الأنظمة (shellNavKeys) — «رصد الحالات» (rasd) أضاف رابطه */
  deq([...ops.matchAll(/data-key="([a-z]+)"/g)].map((m) => m[1]), shellNavKeys(), 'the page links, in order');
  for (const k of ['kpis', 'dstats', 'emps', 'planning', 'daily', 'irshad', 'seized', 'award']) assert.ok(ops.includes('data-key="' + k + '"'), 'the page link ' + k + ' stays');
  for (const s of ['data-key', 's-dept', 's-secadd', 'مواقع ذات صلة', 'goAdmin']) assert.ok(!con.includes(s), 'console block has no ' + s);
  for (const g of ['org', 'plat', 'sec', 'data']) assert.ok(con.includes('aria-labelledby="con-gh-' + g + '"') && con.includes('id="con-gh-' + g + '"'), 'group ' + g + ' labelled by its heading');
  assert.match(con, /<span class="nlbl">مركز إدارة رشاد<\/span>/, 'the space is named');
  assert.match(T, /<nav class="s-nav" aria-label="\{\{sbNavLbl\}\}">/);
  assert.match(T, /<header class="\{\{topClass\}\}"/);
  assert.match(T, /<a class="n s-exit"[^>]*sc-camel-on-click="\{\{goOps\}\}"[^>]*>.*مساحة العمل التشغيلية/, 'the exit to the operational workspace');
  assert.match(T, /<a class="\{\{nSysAdmin\}\}" role="link" tabindex="0" sc-camel-on-click="\{\{goSysAdmin\}\}" title="مركز إدارة رشاد — لمسؤول المنصة وحده">/, 'the return link is the same link');
});

test('(3) console mode only for the platform administrator on #/sysadmin; operational pages keep class, offset and collapse state', () => {
  const ops = world({ hash: '#/kpis' });
  ops.c.state.active = 'kpis';
  const v0 = ops.vals();
  assert.equal(v0.sbClass, 'bsb cx'); assert.equal(v0.topClass, 'bs-topbar'); assert.equal(v0.sbOps, true); assert.equal(v0.sbConsole, false);
  assert.equal(v0.headerStyle, 'right:var(--bs-side-cx)'); assert.equal(v0.con, null); assert.equal(v0.sbNavLbl, undefined);
  ops.c.state.sidebarOpen = true; assert.equal(ops.vals().sbClass, 'bsb');
  /* super on the console: expanded by default, its own collapse key */
  const W = world({ hash: '#/sysadmin/users' });
  W.c.state.active = 'sysadmin'; W.c.state.sidebarOpen = false;
  let v = W.vals();
  assert.equal(v.sbClass, 'bsb bsb--console'); assert.equal(v.topClass, 'bs-topbar is-console'); assert.equal(v.sbNavLbl, 'مركز إدارة رشاد');
  assert.equal(v.headerStyle, 'right:var(--bs-side)');
  v.toggleSidebar();
  assert.equal(W.c.state.conCx, true); assert.equal(W.c.state.sidebarOpen, false, 'the console collapse never touches sidebarOpen');
  assert.equal(W.ctx.localStorage.getItem('bassam_con_cx_v1'), '1');
  v = W.vals(); assert.equal(v.sbClass, 'bsb cx bsb--console bsb--rail'); assert.equal(v.conRail, true);
  W.c.state.active = 'kpis'; assert.equal(W.vals().sbClass, 'bsb cx', 'back on an operational page: its own state');
  /* a non-administrator never gets console mode, even on the sysadmin key */
  const M = world({ hash: '#/sysadmin', user: { id: 'TEST_ONLY_m', role: 'dept' } });
  assert.equal(M.c._pageAllowed('sysadmin'), '', 'the page itself is refused (unchanged)');
  M.c.state.active = 'sysadmin'; assert.equal(M.vals().sbConsole, false);
  /* on the drawer width the burger keeps sidebarOpen */
  const N = world({ hash: '#/sysadmin/users' }); N.ctx.innerWidth = 800; N.c.state.active = 'sysadmin';
  N.vals().toggleSidebar(); assert.equal(N.c.state.sidebarOpen, true); assert.equal(N.c.state.conCx, false);
  assert.match(R, /CH = \{[^}]*conTick: 1, conCx: 1 \}/, 'conTick and conCx are cosmetic (no page re-render)');
});

test('(3b) the console items: availability from the admin page, selection from the address, the group remembers its last item', needs('dstats'), async () => {
  const W = world({ hash: '#/sysadmin/plat/notif' });
  W.c.state.active = 'sysadmin';
  let v = W.vals();
  assert.equal(v.con.loading, true, 'before the admin page publishes: a skeleton, no guessed items');
  W.c._conSync({ avail: ALL, tab: 'plat', sub: 'notif', secBadge: 3, dirty: ['id'], dirtyN: 2 });
  await Promise.resolve();
  v = W.vals();
  const items = ['org', 'plat', 'sec', 'data'].flatMap((g) => v.con[g].items);
  assert.equal(items.length + (v.con.home.show ? 1 : 0), 14);   /* V7 · د5-هـ (44): perms · plat/mods حُذفتا · V7 · د5-ح: plat/print */
  const cur = items.filter((i) => i.cur === 'page');
  deq(cur.map((i) => i.t), ['التنبيهات والتعاميم'], 'exactly one current item');
  assert.equal(cur[0].href, '#/sysadmin/plat/notif');
  assert.ok(items.every((i) => i.cur === undefined || i.cur === 'page'));
  const sec = v.con.sec.items.find((i) => i.tab === 'sec');
  assert.equal(sec.bdgOn, true); assert.equal(sec.lbl, 'الأمن، أحداث أمنية اليوم: 3');
  assert.equal(v.con.plat.items.find((i) => i.sub === 'id').dirty, true, 'the unsaved section is marked');
  deq(v.con.plat.items.filter((i) => i.div).map((i) => i.sub), ['login', 'about']);
  /* without the cloud server (Admin p): no Home, no security group */
  W.c._conSync({ avail: ['plat', 'depts', 'backup', 'histimp'], tab: 'depts', sub: 'id', secBadge: 0, dirty: [], dirtyN: 0 });
  W.ctx.location.hash = '#/sysadmin/depts';
  v = W.vals();
  assert.equal(v.con.home.show, false); assert.equal(v.con.sec.show, false);
  deq(v.con.org.items.map((i) => i.tab), ['depts']);
  deq(v.con.data.items.map((i) => i.sub || i.tab), ['backup', 'setup', 'histimp']);
  /* the collapsed rail: a group opens on its last item */
  W.c._conSync({ avail: ALL, tab: 'users', sub: 'id', secBadge: 0, dirty: [], dirtyN: 0 });
  W.ctx.location.hash = '#/sysadmin/users'; W.vals();
  W.ctx.location.hash = '#/sysadmin/backup'; v = W.vals();
  v.con.org.railGo({ preventDefault() {} });
  assert.equal(W.ctx.location.hash, '#/sysadmin/users', 'the group reopens on its last item');
});

test('(4) conSync: deduplicated by signature and deferred (no setState during the admin render)', async () => {
  const W = world({ hash: '#/sysadmin/users' }); W.c.state.active = 'sysadmin';
  let calls = 0; const set0 = W.c.setState.bind(W.c); W.c.setState = (u, cb) => { calls++; return set0(u, cb); };
  const s = { avail: ALL, tab: 'users', sub: 'id', secBadge: 0, dirty: [], dirtyN: 0 };
  W.c._conSync(s); assert.equal(calls, 0, 'not synchronous');
  await Promise.resolve(); await Promise.resolve(); assert.equal(calls, 1);
  W.c._conSync({ ...s }); await Promise.resolve(); await Promise.resolve(); assert.equal(calls, 1, 'same signature: nothing');
  deq(W.c.__lastCon, ['users', null]);
});

test('(4b) leaving and returning: draft confirmation, last operational page, last console page', async () => {
  const W = world({ hash: '#/sysadmin/plat/id', confirm: false }); W.c.state.active = 'kpis';
  W.c.setState({ active: 'sysadmin' }); assert.equal(W.c.__lastOps, 'kpis', 'the operational page left is remembered');
  W.c.state.active = 'sysadmin'; W.vals();
  let gone = ''; W.KIVO.BassamNav.go = (k) => { gone = k; };
  W.c._conSync({ avail: ALL, tab: 'plat', sub: 'id', secBadge: 0, dirty: ['id'], dirtyN: 1 });
  assert.equal(await W.c._goOps(), false, 'cancel keeps the console and the draft');
  assert.equal(W.confirms.length, 1); assert.equal(W.confirms[0].cancel, 'البقاء'); assert.equal(gone, '');
  const Y = world({ hash: '#/sysadmin/users', confirm: true }); Y.c.state.active = 'tasks'; Y.c.setState({ active: 'sysadmin' }); Y.vals();
  Y.c._conSync({ avail: ALL, tab: 'users', sub: 'id', secBadge: 0, dirty: [], dirtyN: 0 });
  let to = ''; Y.KIVO.BassamNav.go = (k) => { to = k; };
  assert.equal(await Y.c._goOps(), true); assert.equal(Y.confirms.length, 0, 'no draft: no question'); assert.equal(to, 'tasks');
  /* return: the last console page is requested from the admin page */
  Y.c.state.active = 'tasks'; Y.c._goSys();
  assert.equal(Y.KIVO.__ADMIN_OPEN_TAB, 'users'); assert.equal(Y.c.state.active, 'sysadmin');
  /* a non-administrator cannot enter */
  const M = world({ hash: '#/kpis', user: { id: 'TEST_ONLY_m', role: 'dept' } }); M.c.state.active = 'kpis'; M.c._goSys();
  assert.equal(M.c.state.active, 'kpis');
});

test('(4c) the admin page: request routed through _admGo / _plGo, section in the state before the render, canonical address', () => {
  const head = L.indexOf('\n  _admTabsNow(i, n, p, g) {'), body = L.slice(head, L.indexOf('\n  renderVals() {', head));
  assert.match(body, /this\._plGo\(ps\)/); assert.match(body, /this\._admGo\(q\)/); assert.doesNotMatch(body, /this\.adGo\(/, 'no direct adGo');
  assert.match(body, /KIVO\.__ADMIN_OPEN_PSUB = null/);
  const rv = L.slice(L.indexOf('\n  renderVals() {'));
  /* V7 P0: «الإدارات» تكتب #/sysadmin/org[/<id>] (_orgSeg) — V7 · د6: عنوانُ شاشة «الإدارات والصلاحيات» (الوحدة · التبويب) تكتبه الشاشةُ نفسُها
     (src/modules/org · KIVO.BassamOrgRoute)؛ صفحةُ الإعدادات تكتب المدخلَ #/sysadmin/org وحده حين ليس العنوانُ عنوانَ الشاشة بعد */
  assert.match(rv, /n && \(\("depts" === d && this\._orgHashIs\("site"\)\) \|\| this\._hashTab\("sysadmin", ps \? "plat\/" \+ ps : "depts" === d \? "org" : d\)\)/, 'canonical #/sysadmin/plat/<sub>; #/sysadmin/org/<unit>/<tab> is left to the screen');
  assert.ok(rv.indexOf('KIVO.BassamNav.conSync({') > rv.indexOf('this._hashTab("sysadmin"'), 'published after the address is written');
  assert.match(R, /if \(key === "sysadmin"\) \{ KIVO\.__ADMIN_OPEN_TAB = this\._sysTabOf\(t\); KIVO\.__ADMIN_OPEN_PSUB = t === "plat" \? this\._hashSub\(\) \|\| null : null; \}/);
  assert.doesNotMatch(R + L, /__ADMIN_OPEN_ORG|_hashOrgId/, 'V7 · د6: the unit id is no longer handed over by the shell — the screen reads the address itself');
});

test('(5) removed: the in-page strip, the platform tab row and their symbols; P and tokens', () => {
  deq([...V.matchAll(/class="adm-tabbar[^"]*"/g)].map((m) => m[0]), ['class="adm-tabbar adm-tabbar--d"'], 'only the unit settings strip remains');
  for (const s of ['adm-subtabs', 'adm-l2', 'admNav', 'admSub', 'plTabs', 'admTabBarShow', 'adm-tab--sm']) {
    assert.ok(!V.includes(s) && !PG.includes(s) && !C.includes(s), s + ' gone from view, page and style');
  }
  for (const s of ['_admNav', 'admSub', 'plTabs', '__admGrpLast', 'admTabBarShow']) assert.ok(!L.includes(s), s + ' gone from logic');
  assert.equal((L.match(/admGoBackup:/g) || []).length, 1, 'one admGoBackup');
  assert.match(V, /<h2 tabindex="-1">\{\{conTitle\}\}<\/h2>/, 'the page title is a focusable h2');
  assert.match(P, /aside\.classList\.contains\("bsb--console"\)/, 'no help group in the console');
  assert.match(P, /مركز إدارة رشاد ← البيانات والاستمرارية ← التهيئة والاستعادة/);
  const TK = JSON.parse(rd('styles/tokens/tokens.json'));
  for (const n of ['con-bg', 'con-fg', 'con-fg-muted', 'con-accent', 'con-hover', 'con-on', 'con-line']) {
    assert.ok(TK.semantic.some((x) => x.name === n && /^var\(--p-/.test(x.value)), n + ' (palette reference)');
    assert.ok(rd('styles/070-theme-tokens.css').includes('--' + n + ':'), n + ' emitted');
  }
  for (const n of ['con-bg', 'con-line']) assert.ok(TK.dark.some((x) => x.name === n) && rd('styles/080-theme-dark.css').includes('--' + n + ':'), n + ' dark');
});

test('(6) review of S10: sidebar fits, gold edge faces the page, one history path, drafts asked on every exit, Arabic labels, eol', async () => {
  const G = rd('layouts/helmet-global.css');
  /* the console sidebar is compact enough for 1366×900 (the browser test measures it): no separate collapse row, no subtitle */
  assert.match(G, /\.bsb--console:not\(\.cx\) \.s-togbar\{position:absolute;/, 'the collapse button sits in the brand row');
  const con = T.slice(T.indexOf('<sc-if value="{{sbConsole}}"'), T.indexOf('</nav>'));
  assert.ok(!/<small/.test(con.slice(con.indexOf('class="s-space"'), con.indexOf('</div>', con.indexOf('class="s-space"')))), 'no «مسؤول المنصة» line in the space row');
  assert.match(G, /\.bsb--console \.s-ci\{min-height:29px;/);
  /* RTL: the aside sits on the right, its page-facing edge is the left one — a positive inset x-offset paints there */
  const cs = /\.bsb--console\{[^}]*box-shadow:([^;}]+)/.exec(G);
  assert.ok(cs && /inset 2px 0 0 var\(--con-accent\)/.test(cs[1]), 'gold edge on the page-facing edge');
  assert.doesNotMatch(cs[1], /inset -\d/, 'no negative physical inset x-offset');
  /* every in-console link goes through _ovGo (BassamNav.conGo → a history entry): no direct adGo / _admGo("backup") left */
  assert.equal((L.match(/this\.adGo\("/g) || []).length, 0, 'no direct adGo("…") navigation');
  assert.match(L, /admGoBackup: \(\) => this\._ovGo\("backup"\)/);
  assert.match(L, /go: go\("backup"\)/); assert.match(L, /go: go\("sec", \{ adSecKind: "denied" \}\)/);
  /* V7 P1: both «تعديل» links open the unit's own page (#/sysadmin/org/<id> — a history entry) on the tab they edit */
  /* V7 · د5-هـ (44): the permission map is deleted (its «تعديل» link with it); «تعديل الصلاحيات» opens v2's people section */
  /* V7 · د6: the address is #/sysadmin/org/<unit>/people now, reached through the screen's one navigation point (_orgGoto → KIVO.BassamOrgRoute) */
  assert.match(L, /if \("perm" === what\) return void \(u \? this\._orgGoto\(u, "people"\) : this\._ovGo\("depts"\)\);/, '«تعديل الصلاحيات» → the unit\'s «الأشخاص» tab');
  assert.match(L, /location\.hash = KIVO\.BassamOrgRoute\.href\("site", unit, tab\);/, 'by the address when the screen is not mounted');
  /* V7 P2: the account menu is one (_acctMenu); from «مراقبة الحسابات» edit opens the account's node page — V7 · د5-ح: on «الصلاحيات ← الأدوار ← مدير الوحدة» (the node tab was deleted) */
  assert.match(L, /p\.push\(\{ t: "تعديل الصلاحيات", go: \(\) => this\._acctOpen\(a, "perm", here\) \}\)/, '«تعديل الصلاحيات» → _acctOpen');
  assert.match(L, /if \(!here\) return void \(u \? this\._orgGoto\(u, "admins"\) : this\._ovGo\("depts"\)\);/, 'outside the unit: the account\'s unit, its «المسؤولون» tab (V7 · د6 — was «الصلاحيات ← الأدوار ← مدير الوحدة»)');
  /* the group names: Admin keeps its own copy (V5), equal to the shell's */
  const gt = /GT = (\{[^}]+\})/.exec(R), g = /const G = (\{[^}]+\})/.exec(L);
  deq(JSON.parse(g[1].replace(/(\w+):/g, '"$1":')), JSON.parse(gt[1].replace(/(\w+):/g, '"$1":')), 'same four group names');
  /* Home: a list's column header only with rows */
  for (const [c, f] of [['c-fail', 'ovFailsHas'], ['c-add', 'ovAddedHas'], ['c-pres', 'ovPresHas'], ['c-frz', 'ovFrozenHas']]) {
    assert.match(V, new RegExp('<sc-if value="\\{\\{' + f + '\\}\\}"[^>]*><div class="adm-ov-row adm-ov-th ' + c + '"'), c + ' header gated on ' + f);
  }
  /* unsaved platform drafts: every operational destination asks first (the sidebar user card, the bell, BassamNav.go), once */
  const W = world({ hash: '#/sysadmin/plat/id', confirm: false }); W.c.state.active = 'sysadmin'; W.vals();
  W.c._conSync({ avail: ALL, tab: 'plat', sub: 'id', secBadge: 0, dirty: ['id'], dirtyN: 1 });
  W.KIVO.BassamNav.go('tasks'); await new Promise((r) => setImmediate(r));
  assert.equal(W.confirms.length, 1, 'asked'); assert.equal(W.c.state.active, 'sysadmin', 'cancel: stays in the console');
  const Y = world({ hash: '#/sysadmin/plat/id', confirm: true }); Y.c.state.active = 'sysadmin'; Y.vals();
  Y.c._conSync({ avail: ALL, tab: 'plat', sub: 'id', secBadge: 0, dirty: ['id'], dirtyN: 1 });
  assert.equal(await Y.c._goOps(), true); await new Promise((r) => setImmediate(r));
  assert.equal(Y.confirms.length, 1, 'the exit link asks once (no second question from BassamNav.go)'); assert.notEqual(Y.c.state.active, 'sysadmin');
  /* V7 · د6: مسوّداتُ إعدادات المنصة صار اسمُ شرطها _platDirty — و_conDirty يجمعها مع تغييرات شاشة «الإدارات والصلاحيات» غير المحفوظة (_orgDirty) */
  assert.match(R, /if \(ok !== "sysadmin" && !this\.__conAsked && this\._platDirty\(\)\)/, 'Back / a typed address asks too');
  assert.match(R, /_conDirty\(\) \{\s*return this\._platDirty\(\) \|\| this\._orgDirty\(\);\s*\}/, 'every exit that asked for platform drafts now also asks the screen');
  assert.match(R, /if \(!this\.__conAsked && this\._orgDirty\(\)\) \{\s*const O = KIVO\.BassamOrgRoute\.screen, keep = O\.href \? O\.href\(\) : "";/, 'V7 · د6: Back / a typed address with unsaved changes in the screen restores its address and asks its guard first');
  /* Arabic labels for server codes and storage keys in the activity log */
  const ctx = { KIVO: {}, console }; vm.createContext(ctx);
  ctx.KIVO.BassamKeyLabels = { all: { bassam_perms_v1: 1, bassam_notifications_domain_v1: 1 }, label: (k) => ({ bassam_perms_v1: 'الصلاحيات', bassam_notifications_domain_v1: 'التنبيهات والتعاميم' })[String(k).replace(/^bsdept:[^:]+:/, '')] || 'بيانات المنصة' };
  vm.runInContext(rd('services/290-activity-log.js'), ctx);
  const d = ctx.KIVO.BassamAudit.describe;
  assert.equal(d({ etype: 'dataset', act: 'changed', ename: 'bassam_perms_v1', k: 'bassam_perms_v1' }), 'عُدِّل — الصلاحيات');
  assert.equal(d({ etype: 'dataset', act: 'emitted', ename: '', eid: 'notifications', k: 'bassam_notifications_domain_v1' }), 'أُرسل تنبيه — التنبيهات والتعاميم');
  assert.equal(d({ etype: 'dataset', act: 'weird_code', ename: 'custody', k: 'bsdept:d1:bassam_x_v1' }), 'تعديل — بيانات المنصة', 'no raw code or key');
  assert.equal(d({ etype: 'dataset', act: 'import', ename: 'الإحصائيات اليومية' }), 'استُورد — الإحصائيات اليومية');
  assert.match(rd('api/280-server-storage.js'), /bassam_notifications_domain_v1:\["التنبيهات والتعاميم"\]/);
  assert.doesNotMatch(L, /s\.replace\(\/\^bassam_\/, ""\)\.replace\(\/_v\\d\+\$\/, ""\)/, 'adKeyLbl no longer prints the raw key');
  /* «اليوم» on Home and in the log it opens */
  assert.ok(L.includes('«اليوم» هنا يبدأ من الثالثة فجراً بتوقيت الرياض، وفي سجل الأمن من منتصف الليل'));
  /* 260-bassam-plat.js stays LF-only (S7 added two CRLF lines) */
  assert.equal((P.match(/\r\n/g) || []).length, 0, '260-bassam-plat.js: LF only');
});

test('(7) accordion: real buttons controlling hidden lists, one open group that follows the address, toggles without navigating', async () => {
  const con = T.slice(T.indexOf('<sc-if value="{{sbConsole}}" hint-placeholder-val="{{ false }}">'), T.indexOf('</nav>'));
  for (const g of ['org', 'plat', 'sec', 'data']) {
    const h = new RegExp('<button type="button" class="\\{\\{con\\.' + g + '\\.hCls\\}\\}" id="con-gh-' + g + '" aria-expanded="\\{\\{con\\.' + g + '\\.exp\\}\\}" aria-controls="con-gl-' + g + '" aria-describedby="\\{\\{con\\.' + g + '\\.desc\\}\\}" sc-camel-on-click="\\{\\{con\\.' + g + '\\.toggle\\}\\}">');
    assert.match(con, h, g + ': the header is a button with aria-expanded and aria-controls');
    assert.ok(con.includes('<div class="s-cl" id="con-gl-' + g + '" role="group" aria-labelledby="con-gh-' + g + '" hidden="{{con.' + g + '.shut}}">'), g + ': the controlled list is labelled by its header and hidden when collapsed');
    const L0 = con.indexOf('id="con-gl-' + g + '"'), L1 = con.indexOf('</div>', L0);
    assert.ok(con.slice(L0, L1).includes('<sc-for list="{{con.' + g + '.items}}"'), g + ': its items live inside the list');
  }
  assert.ok(!/<p class="s-cgh"/.test(con), 'no static group heading left');
  assert.match(con, /<div class="s-cacc" sc-camel-on-key-down="\{\{con\.key\}\}">/, 'arrow keys on the one console block');
  assert.match(con, /<span id="con-gh-cur" hidden="hidden">الصفحة الحالية ضمن هذه المجموعة<\/span>/);
  assert.equal((T.match(/<nav class="s-nav"/g) || []).length, 1, 'still one navigation');
  const G = rd('layouts/helmet-global.css');
  assert.match(G, /\.bsb--console \.s-cl\[hidden\]\{display:none\}/, 'a collapsed list is not displayed (no hidden-but-focusable link)');
  assert.match(G, /\.bsb--rail \.s-cgh,/, 'the rail hides the headers');
  assert.match(rd('components/600-tooltip-portal.js'), /addEventListener\('focusin'[\s\S]{0,200}\.bsb--rail/, 'the rail names show on keyboard focus too');

  const W = world({ hash: '#/sysadmin/plat/notif' }); W.c.state.active = 'sysadmin';
  W.c._conSync({ avail: ALL, tab: 'plat', sub: 'notif', secBadge: 0, dirty: [], dirtyN: 0 }); await Promise.resolve();
  const ls0 = JSON.stringify([...W.ctx.localStorage.m]);
  const hd = (v) => Object.fromEntries(['org', 'plat', 'sec', 'data'].map((g) => [g, v.con[g].exp + (v.con[g].shut ? '/shut' : '/open') + (v.con[g].hCls.includes('is-cur') ? '*' : '') + (v.con[g].desc ? 'D' : '')]));
  let v = W.vals();
  deq(hd(v), { org: 'false/shut', plat: 'true/open*', sec: 'false/shut', data: 'false/shut' }, 'deep link: the group of the current page is open, the others collapsed');
  /* a header toggles without navigating; single-open: opening another group collapses the current one, which stays marked */
  v.con.org.toggle(); v = W.vals();
  assert.equal(W.ctx.location.hash, '#/sysadmin/plat/notif', 'toggling does not navigate');
  deq(hd(v), { org: 'true/open', plat: 'false/shut*D', sec: 'false/shut', data: 'false/shut' }, 'one open group; the collapsed current group is marked and described');
  v.con.org.toggle(); v = W.vals();
  deq(hd(v), { org: 'false/shut', plat: 'false/shut*D', sec: 'false/shut', data: 'false/shut' }, 'the open group closes again');
  /* the address decides again on the next move (Back / an in-page link / a typed address) */
  W.ctx.location.hash = '#/sysadmin/backup'; v = W.vals();
  deq(hd(v), { org: 'false/shut', plat: 'false/shut', sec: 'false/shut', data: 'true/open*' }, 'moving to another page opens its group');
  W.ctx.location.hash = '#/sysadmin/overview'; v = W.vals();
  assert.equal(v.con.data.exp, 'true', '«الرئيسية» (no group) keeps the open group');
  assert.equal(v.con.home.cur, 'page');
  assert.equal(JSON.stringify([...W.ctx.localStorage.m]), ls0, 'the open group is not stored (the address decides it on every load)');
  /* every destination is reachable: on its own address its group is open and its item is in an open list */
  const N = W.c._sysNav();
  for (const [g, items] of Object.entries(N)) for (const x of items) {
    W.ctx.location.hash = '#/sysadmin/' + x[0] + (x[1] ? '/' + x[1] : ''); v = W.vals();
    const it = g === 'home' ? v.con.home : v.con[g].items.find((i) => i.tab === x[0] && (i.sub || null) === (x[1] || null));
    assert.ok(it && it.cur === 'page', x[2] + ': current on its address');
    if (g !== 'home') { assert.equal(v.con[g].exp, 'true', x[2] + ': its group opens'); for (const o of ['org', 'plat', 'sec', 'data']) if (o !== g) assert.equal(v.con[o].shut, true, x[2] + ': ' + o + ' collapsed'); }
  }
  /* from any page, any group opens by its header (no navigation) and lists all its items */
  for (const g of ['org', 'plat', 'sec', 'data']) {
    W.ctx.location.hash = '#/sysadmin/overview'; v = W.vals(); if (v.con[g].exp !== 'true') { v.con[g].toggle(); v = W.vals(); }
    assert.equal(v.con[g].exp, 'true'); assert.equal(v.con[g].items.length, N[g].length, g + ': every item listed');
    assert.equal(W.ctx.location.hash, '#/sysadmin/overview');
  }
  /* the collapsed rail: no list open, no header offered; each group keeps its icon and its last item */
  W.c.state.conCx = true; v = W.vals();
  assert.equal(v.conRail, true);
  for (const g of ['org', 'plat', 'sec', 'data']) { assert.equal(v.con[g].shut, true, g + ': rail: list closed'); assert.equal(typeof v.con[g].railGo, 'function'); }
  /* the toggle is cosmetic (conTick): no page re-render */
  const w0 = W.KIVO.__dcWorld; W.c.state.conCx = false; v = W.vals(); v.con.sec.toggle(); assert.equal(W.KIVO.__dcWorld, w0, 'toggling does not re-render the page');
});

test('(8) consistency: one tone rule for counts, one count tile, one status line, no header over an empty list, labelled log filters', () => {
  /* accounts tiles = Home «الحسابات» card */
  assert.match(L, /S\(o\.filter\(\(t\) => !t\.dis\)\.length, "نشط", "", "all"\)/, '«نشط» neutral as on Home');
  assert.match(L, /S\(w\(m\[1\]\), "مجمّد", w\(m\[1\]\) \? "warn" : "", "frozen"\)/, '«مجمّد» warns only when non-zero (Home: tone m ? "warn")');
  assert.match(L, /row\("مجمّدة", m, \{ tone: m \? "warn" : "" \}\)/, 'Home keeps the same rule');
  assert.match(L, /"بصيغة كلمة مرور قديمة", w\(m\[7\]\) \? "warn" : ""/, 'old password format: the same warning as Home');
  assert.match(L, /row\("بصيغة كلمة مرور قديمة", oh, \{ tone: "warn"/);
  /* notification counts on the shared tile */
  const nf = V.slice(V.indexOf('data-bs="notif-adm"'), V.indexOf('data-bs="notif-adm"') + 1200);
  assert.equal((nf.match(/class="adm-pl-box adm-pl-box--sm adm-ov-kpi"/g) || []).length, 4, 'four shared count tiles');
  assert.doesNotMatch(nf.slice(0, nf.indexOf('{{nfKBc}}')), /font-size:22px|--fg-x(059669|dc2626|1d6fd6|141414)/, 'no fixed size or hex colour');
  assert.match(L, /nfKOnTone: "", nfKUrgTone: "",/, '«مفعّل» and «عاجل» are configuration counts: neutral tone (no green/red)');
  /* readiness: one status line */
  const rd3 = V.slice(V.indexOf('١ · مسؤول منصة احتياطي'), V.indexOf('٣ · نسخة ما قبل الكارثة') + 200);
  assert.equal((rd3.match(/class="adm-pl-stl"/g) || []).length, 4, 'backup admin (on/off), recovery key and backup share .adm-pl-stl');
  assert.doesNotMatch(rd3, /color:var\(--fg-x92400e\)"><span[^>]*><\/span>غير موجود/);
  /* empty lists: no header */
  assert.match(V, /<sc-if value="\{\{secHas\}\}"[^>]*><div class="adm-tr adm-th g-sec"/);
  assert.match(L, /secEmpty: !B\.length, secHas: !!B\.length/);   /* V7 · د5-هـ (44): the templates list (pmTplHas) is deleted with the permission map */
  /* activity-log filters */
  assert.match(L, /sc\.site\r?\n\s+\? h\("button", \{ key: key, type: "button", className: "adm-chip", "aria-pressed": on \? "true" : "false", onClick: go \}, txt\)/);
  for (const g of ['"e", "الكيان", "adm-chips adm-flt-c", fEt', '"a", "الفعل", "adm-chips adm-flt-c", fAct', '"q", "البحث", "adm-flt-f", [fDept, fUid, fQ, fSite]'])
    assert.ok(L.includes('fGrp(' + g), 'group ' + g);
  assert.match(L, /fGrp\("d", "الفترة", "adm-flt-f", \[fPlan, fDay, h\("span", \{ key: "rng", className: "adm-flt-rng" \}, fFromL, fFrom, fToL, fTo\), fClr\]\)/, '«من … إلى» kept together');
  assert.match(L, /role: "group", "aria-labelledby": "aud-fl-" \+ k/);
  assert.match(L, /: h\(\r?\n\s+"div",[\s\S]{0,1200}fDept, fUid, fQ, fSite, fPlan, fDay, fFromL, fFrom, fToL, fTo, fClr\]\),/, '#/admin keeps its own row of filters');
  assert.match(C, /\.adm-flt-r\{display:grid;grid-template-columns:56px minmax\(0,1fr\)/);
  const ph = C.slice(C.lastIndexOf('@media (max-width:640px){'));
  assert.match(ph, /\.adm-flt-r\{grid-template-columns:minmax\(0,1fr\)/, 'phone: label above its group');
  assert.ok(C.indexOf('.adm-flt-c,.adm-flt-f{') < C.indexOf('@media (max-width:640px){.adm-chips{'), 'the phone chip row (scrolls sideways) comes after the wrapping rule');
  assert.ok(PG.includes('adm-flt') && PG.includes('secHas'), 'the generated page is current');
});
