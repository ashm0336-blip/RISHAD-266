/* V7 · د6 (م1 «الإطار») — شاشة «الإدارات والصلاحيات» صفحةً مستقلة (src/modules/org): ب1 · ب2 · ب3 · ب10 وهيكلُ ب13.
   قيمُ الصفحة الفعلية من renderVals في عالمٍ مصطنع (org_world.mjs — TEST_ONLY): الهيكلُ بخدمته الحقيقية (320) والعنوانُ بخدمته (325) ومحرّكُ الأدوار الحقيقي.
   ب1 · العنوان مصدرُ الوحدة والتبويب (رابطٌ عميق بعد «إعادة التحميل» = عالمٌ جديد بالعنوان نفسه) · العناوينُ القديمة تُحوَّل · تبديلُ الوحدة يُبقي التبويب ·
        سبعةُ تبويباتٍ بترتيبها · صف «المنصة كلها» بأربعة · نقطةُ التنقّل الواحدة go وحارسُها canLeave · نقطةُ تركيبٍ لكل تبويب؛
   ب2 · أعمدةُ الشجرة لهيكلٍ مبذور (النوع · تحتها · المدير · الأشخاص · الأنظمة) · البحث · الفلاتر · فرد/طيّ الكل · التحديد المتعدد وخطّافُه · السحب والإفلات؛
   ب3 · نافذةُ الإضافة من الموضعين (الأبُ معبّأ) واختيارُ «أنظمة الوحدة الجديدة» وسيطاً · إعادة التسمية · «نقل إلى…» (الوحدة وما تحتها لا يظهران · «الموضع بعد النقل») ·
        الحذفُ يرفض غيرَ الفارغة بسببه · لا ⋯ على الصفوف ولا تعديلَ اسمٍ في الرأس؛
   ب10 · ملخّصُ الوحدة (كلُّ خانةٍ تفتح تبويبَها) · «ما تحتها» · قائمةُ التهيئة خمسُ خطواتٍ بحالتها من البيانات؛
   ب12 (المدخل) · شجرةُ المدير وحدتُه وما تحتها وحدها، بلا أفعال هيكل ولا تبويب «البيانات»؛ ب13 · قواعدُ العرض الضيّق في الأنماط. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { SRC, moduleLogic } from './harness.mjs';
import { orgWorld, rowOf, rowIds, J, ORG, ORG_VIEW, ORG_CSS, ORG_SRC } from './org_world.mjs';

const rd = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');
const SEC = 'TEST_ONLY_SEC', G = 'TEST_ONLY_G', E = 'TEST_ONLY_E', A = 'TEST_ONLY_A', B = 'TEST_ONLY_B', S1 = 'TEST_ONLY_A_S1', Z = 'TEST_ONLY_Z', ROOT = '__plat';
const TABS7 = ['overview', 'systems', 'admins', 'roles', 'people', 'log', 'data'];
/* القيمُ تأتي من سياق vm آخر (نماذجُ مصفوفاتٍ مختلفة) — تُقارن بنيتُها */
const N = (x) => (x === undefined ? undefined : J(x)), deq = (a, b, m) => assert.deepEqual(N(a), N(b), m);

/* ══ ب1 · العنوان ══ */
test('ب1 · the address service: one canonical form per place; every old address parses to its new one', () => {
  const C = { KIVO: {} }; vm.createContext(C); vm.runInContext(rd('services/325-org-route.js'), C);
  const R = C.KIVO.BassamOrgRoute, canon = (h) => { const p = R.parse(h); return p ? R.href(p.mode, p.unit || (p.mode === 'dept' ? 'TEST_ONLY_A' : R.ROOT), p.tab) : null; };
  deq(J(R.TABS), TABS7, 'the seven tabs in the order of ب1');
  assert.equal(R.href('site', R.ROOT, 'systems'), '#/sysadmin/org/platform/systems');
  assert.equal(R.href('site', 'TEST_ONLY_A', 'people'), '#/sysadmin/org/TEST_ONLY_A/people');
  assert.equal(R.href('dept', 'TEST_ONLY_A', 'roles'), '#/admin/perm/TEST_ONLY_A/roles');
  assert.equal(R.href('site', 'TEST_ONLY_A', 'nope'), '#/sysadmin/org/TEST_ONLY_A/overview', 'an unknown tab is the overview');
  const OLD = {
    '#/sysadmin/org': '#/sysadmin/org/platform/overview',                           /* صفحةُ «الهيكل» */
    '#/sysadmin/depts': '#/sysadmin/org/platform/overview',                         /* الأقدم منها */
    '#/sysadmin/org/TEST_ONLY_A': '#/sysadmin/org/TEST_ONLY_A/overview',            /* صفحةُ الوحدة */
    '#/sysadmin/org/TEST_ONLY_A/perm/systems': '#/sysadmin/org/TEST_ONLY_A/systems',
    '#/sysadmin/org/TEST_ONLY_A/perm/roles': '#/sysadmin/org/TEST_ONLY_A/roles',
    '#/sysadmin/org/TEST_ONLY_A/perm/people': '#/sysadmin/org/TEST_ONLY_A/people',
    '#/sysadmin/org/TEST_ONLY_A/perm/log': '#/sysadmin/org/TEST_ONLY_A/log',
    '#/admin/perm': '#/admin/perm/TEST_ONLY_A/overview',                            /* مدخلُ المدير */
    '#/admin/perm/roles': '#/admin/perm/TEST_ONLY_A/roles',
    '#/admin/perm/people': '#/admin/perm/TEST_ONLY_A/people',
    '#/admin/perm/log': '#/admin/perm/TEST_ONLY_A/log',
    '#/admin/perm/systems': '#/admin/perm/TEST_ONLY_A/systems',
  };
  for (const [o, n] of Object.entries(OLD)) { assert.equal(canon(o), n, o + ' → ' + n); assert.equal(R.parse(o).legacy, true, o + ' is marked legacy'); }
  for (const h of ['#/sysadmin/org/TEST_ONLY_A/roles', '#/admin/perm/TEST_ONLY_A/log', '#/sysadmin/org/platform/log']) assert.equal(R.parse(h).legacy, false, h + ' is canonical');
  for (const h of ['#/sysadmin/users', '#/admin/backup', '#/admin', '#/tasks', '']) assert.equal(R.parse(h), null, JSON.stringify(h) + ' is not this screen');
  assert.equal(R.parse('#/sysadmin/org/%3Cb%3E/roles').unit, '', 'an id with markup characters is dropped (the page then opens the default)');
  assert.equal(R.parse('#/sysadmin/org/' + encodeURIComponent('TEST_ONLY وحدة') + '/data').unit, 'TEST_ONLY وحدة', 'ids are decoded');
});

test('ب1 · deep link: unit and tab come from the address alone — a fresh page on the same address shows the same unit and tab', () => {
  for (const [unit, tab] of [[A, 'people'], [S1, 'roles'], [G, 'admins'], [A, 'data'], [B, 'log'], [ROOT, 'systems']]) {
    const hash = '#/sysadmin/org/' + (unit === ROOT ? 'platform' : unit) + '/' + tab;
    const v = orgWorld({ hash }).render();   /* «إعادة تحميل»: عالمٌ جديد لا يحمل إلا العنوان */
    assert.equal(v.ogUnitSeg, unit === ROOT ? 'platform' : unit, hash); assert.equal(v.ogTab, tab, hash);
    deq(v.ogTabs.filter((t) => t.on === 'true').map((t) => t.k), [tab], 'the selected tab is the address tab');
    assert.equal(rowOf(v, unit).sel, 'true', 'the tree row of the address unit is the selected one');
  }
  /* لا نسخةَ للوحدة ولا للتبويب في الحالة */
  const W = orgWorld({ hash: '#/sysadmin/org/' + A + '/roles' }); W.render();
  assert.ok(!('unit' in W.page.state) && !('tab' in W.page.state) && !('sysSel' in W.page.state) && !('sysTab' in W.page.state), 'no unit/tab copy in the state');
  assert.ok(!('sub' in (W.page.state.p44 || {})), 'the old «section» state is gone');
});

test('ب1 · old addresses are redirected (replaceState to the canonical one) and open what they opened', () => {
  const cases = [
    ['#/sysadmin/org', '#/sysadmin/org/platform/overview'],
    ['#/sysadmin/depts', '#/sysadmin/org/platform/overview'],
    ['#/sysadmin/org/' + A, '#/sysadmin/org/' + A + '/overview'],
    ['#/sysadmin/org/' + A + '/perm/people', '#/sysadmin/org/' + A + '/people'],
    ['#/sysadmin/org/' + G + '/perm/roles', '#/sysadmin/org/' + G + '/roles'],
    ['#/sysadmin/org/' + S1 + '/perm/log', '#/sysadmin/org/' + S1 + '/log'],
  ];
  for (const [o, n] of cases) {
    const W = orgWorld({ hash: o }); W.render();
    assert.equal(W.location.hash, n, o + ' → ' + n); deq(W.hist.at(-1), ['replace', n], 'by replaceState (no extra history entry)');
  }
  /* عنوانُ صفحةٍ أخرى لا يُكتب فوقه (الصفحةُ في طريقها للإزالة) */
  const X = orgWorld({ hash: '#/sysadmin/users' }); X.render();
  assert.equal(X.location.hash, '#/sysadmin/users'); deq(X.hist, []);
  /* وحدةٌ غيرُ موجودة: الافتراضية «المنصة كلها» ويُقال ذلك مرةً */
  const Y = orgWorld({ hash: '#/sysadmin/org/TEST_ONLY_NOPE/roles' }); const v = Y.render();
  assert.equal(v.ogUnitSeg, 'platform'); assert.equal(v.ogTab, 'overview', 'roles is not a tab of the root row');
});

test('ب1 · tabs: seven in order for a unit, four for «المنصة كلها»; switching the unit keeps the tab; one navigation point (go) with canLeave', async () => {
  const W = orgWorld({ hash: '#/sysadmin/org/' + A + '/people' });
  let v = W.render();
  deq(v.ogTabs.map((t) => t.k), TABS7);
  deq(v.ogTabs.map((t) => t.t), ['نظرة عامة', 'الأنظمة', 'المسؤولون', 'الأدوار', 'الأشخاص', 'السجل', 'البيانات']);
  deq(v.ogTabs.map((t) => t.href), TABS7.map((k) => '#/sysadmin/org/' + A + '/' + k), 'each tab is a real link');
  /* اختيارُ وحدةٍ أخرى من الشجرة يُبقي التبويب */
  rowOf(v, B).pick(); await W.tick(); v = W.render();
  assert.equal(W.location.hash, '#/sysadmin/org/' + B + '/people', 'another unit, the same tab');
  rowOf(v, G).pick(); await W.tick(); v = W.render();
  assert.equal(W.location.hash, '#/sysadmin/org/' + G + '/people', 'a supervisory node carries the tab too');
  /* تبويبٌ لا يحمله الهدف ⇒ «نظرة عامة» */
  rowOf(v, ROOT).pick(); await W.tick(); v = W.render();
  assert.equal(W.location.hash, '#/sysadmin/org/platform/overview');
  deq(v.ogTabs.map((t) => t.t), ['نظرة عامة', 'الأنظمة', 'المسؤولون', 'السجل'], 'the root row: four tabs (owner reply 2)');
  v.ogTabs[1].go(); await W.tick(); v = W.render();
  assert.equal(W.location.hash, '#/sysadmin/org/platform/systems'); assert.equal(v.p44OnSys, true);
  /* الحارس: كلُّ تغيير وحدةٍ أو تبويب يمرّ بـ canLeave — الرفضُ يُبقي العنوانَ كما هو */
  const asked = []; let allow = false;
  W.page.orgGuard = (next) => { asked.push(J(next)); return allow; };
  assert.equal(await W.page.go(A, 'roles'), false); assert.equal(W.location.hash, '#/sysadmin/org/platform/systems', 'refused: stays');
  rowOf(W.render(), B).pick(); await W.tick(); assert.equal(W.location.hash, '#/sysadmin/org/platform/systems', 'a tree click is guarded too');
  W.render().ogTabs[0].go(); await W.tick(); assert.equal(W.location.hash, '#/sysadmin/org/platform/systems', 'and a tab click');
  deq(asked, [{ unit: A, tab: 'roles' }, { unit: B, tab: 'systems' }, { unit: ROOT, tab: 'overview' }], 'the guard is told where the user is going');
  allow = true; assert.equal(await W.page.go(A, 'roles'), true); assert.equal(W.location.hash, '#/sysadmin/org/' + A + '/roles');
  assert.equal(await W.page.go(A, 'log', { force: true }), true, 'force skips the question (used after the page itself resolved it)');
  /* dirty(): تزامني للإطار · الافتراضي لا شيء */
  delete W.page.orgGuard; assert.equal(W.page.dirty(), false); W.page.orgDirty = () => true; assert.equal(W.page.dirty(), true);
  assert.equal(await W.page.canLeave({ leave: true }), true, 'no guard: leaving is allowed');
});

test('ب1 · the mounted screen registers its API for the shell and the settings page, and clears it on unmount', () => {
  const W = orgWorld({ hash: '#/sysadmin/org/' + A + '/roles' }); W.render();
  assert.equal(W.R.screen, null);
  W.page.componentDidMount();
  deq(Object.keys(W.R.screen).sort(), ['canLeave', 'dirty', 'go', 'href', 'route']);
  deq(J(W.R.screen.route()), { mode: 'site', unit: A, tab: 'roles' }); assert.equal(W.R.screen.href(), '#/sysadmin/org/' + A + '/roles');
  deq(W.hostCalls, [['ready'], ['fit', true]], 'the host is told the screen is mounted, and the shell is asked for the width (it then renders its two slots)');
  W.page.componentWillUnmount(); assert.equal(W.R.screen, null);
});

test('ب1 · one mount function and one view section per tab (the seams for the tab owners)', () => {
  const L = moduleLogic('org');
  for (const [k, fn] of [['overview', 'ogTabOverview'], ['systems', 'ogTabSystems'], ['admins', 'ogTabAdmins'], ['roles', 'ogTabRoles'], ['people', 'ogTabPeople'], ['log', 'ogTabLog'], ['data', 'ogTabData']]) {
    assert.match(L, new RegExp('\\n  ' + fn + '\\(c\\) \\{'), 'logic.js: ' + fn + '(c)');
    assert.equal(ORG_VIEW.split('data-org-tab="' + k + '"').length, 2, 'view.html: exactly one section data-org-tab="' + k + '"');
  }
  assert.match(L, /const mount = \{ overview: "ogTabOverview", systems: "ogTabSystems", admins: "ogTabAdmins", roles: "ogTabRoles", people: "ogTabPeople", log: "ogTabLog", data: "ogTabData" \}\[rt\.tab\];/);
  /* كلُّ تبويبٍ يُملأ من دالته وحدها */
  const W = orgWorld({ hash: '#/sysadmin/org/' + A + '/overview' });
  const seen = []; for (const k of TABS7) { const fn = 'ogTab' + k[0].toUpperCase() + k.slice(1), real = W.page[fn]; W.page[fn] = function (c) { seen.push([k, c.unit, c.tab]); return real.call(this, c); }; }
  for (const k of TABS7) W.open('#/sysadmin/org/' + A + '/' + k);
  deq(seen, TABS7.map((k) => [k, A, k]));
  /* الموضعان القائمان من الصفحة المضيفة: «المسؤولون» و«البيانات» */
  assert.equal(W.open('#/sysadmin/org/' + A + '/admins').ogSlotAdmins.TEST_ONLY, 'admins'); assert.equal(W.open('#/sysadmin/org/' + A + '/data').ogSlotData.TEST_ONLY, 'data');
  assert.match(ORG_VIEW, /<sc-if value="\{\{p44MgrFull\}\}"[^>]*>\{\{ogSlotAdmins\}\}<\/sc-if>/); assert.match(ORG_VIEW, /<sc-if value="\{\{ogDataUnit\}\}"[^>]*>\{\{ogSlotData\}\}<\/sc-if>/);
});

/* ══ ب2 · الشجرة ══ */
test('ب2 · tree columns for a seeded org: kind badge · under · manager · people · systems — one row per unit, the root first', () => {
  const caps = { [G]: ['staff', 'plan', 'tasks'], [A]: ['staff', 'plan'], [B]: [] };
  const W = orgWorld({ hash: '#/sysadmin/org', caps, off: ['seized'] }), v = W.render();
  deq(rowIds(v), [ROOT, SEC, G, A, S1, B, E, Z], 'depth-first in the structure order; parentless units sit under the root');
  const all = W.page.p44SysCount(ROOT).all; assert.ok(all >= 9, 'the switchable systems of the engine: ' + all);
  const col = (id) => { const r = rowOf(v, id); return [r.kind, r.kindKey, r.kids, r.mgr, r.people, r.sys, r.level]; };
  deq(col(ROOT), ['المنصة', 'root', '2', 'له مدير', '6', (all - 1) + '/' + all, '1'], 'root: what is under it · every non-super account · ON on the platform');
  deq(col(SEC).slice(0, 5), ['قطاع', 'sector', '2', 'بلا مدير', '6'], 'a sector: its whole branch\'s people');
  deq(col(G).slice(0, 5), ['إدارة عامة', 'gen', '2', 'له مدير', '6'], 'a general department: its branch (its own manager counted)');
  deq(col(A).slice(0, 5), ['إدارة', 'dept', '1', 'له مدير', '3'], 'a department: ITS people only (not its section\'s)');
  deq(col(S1).slice(0, 5), ['قسم', 'sec', '0', 'بلا مدير', '1'], 'a section: its own');
  deq(col(B).slice(0, 5), ['إدارة', 'dept', '0', 'بلا مدير', '1']);
  deq(col(E).slice(0, 5), ['إدارة عامة', 'gen', '0', 'بلا مدير', '0']);
  deq([G, A, S1, B, E, Z].map((id) => rowOf(v, id).level), ['3', '4', '5', '4', '3', '2'], 'depth = aria-level');
  /* «الأنظمة»: المفعّلُ فعلياً بعد الوراثة من أصل ما يُطفأ */
  assert.equal(rowOf(v, G).sys, '3/' + all, 'own ceiling'); assert.equal(rowOf(v, A).sys, '2/' + all, 'its ceiling ∩ its ancestor\'s');
  assert.equal(rowOf(v, S1).sys, '2/' + all, 'a section inherits its department'); assert.equal(rowOf(v, B).sys, '0/' + all, 'an empty ceiling');
  assert.equal(rowOf(v, Z).sys, (all - 1) + '/' + all, 'an open unit: everything ON on the platform');
  /* العمودُ = عددُ صفوف التبويب (مصدرٌ واحد): «الأشخاص» للإدارة و«أشخاص الفرع» للعقدة */
  assert.equal(W.open('#/sysadmin/org/' + A + '/people').p44PRows.length, +rowOf(v, A).people);
  assert.equal(W.open('#/sysadmin/org/' + G + '/people').p44NPRows.length, +rowOf(v, G).people);
  assert.equal(W.open('#/sysadmin/org/' + A + '/systems').p44SysRows.filter((r) => r.isOn).length, 2, 'and the systems column = the ON switches of the tab');
  /* القالب: الأعمدةُ الستة والإطارُ والمختارةُ والجذر */
  const head = /<div class="og-th"[^>]*>(.*?)<\/div>/.exec(ORG_VIEW)[1].replace(/<[^>]+>/g, '·').split('·').filter(Boolean);
  deq(head, ['الوحدة', 'النوع', 'تحتها', 'المدير', 'الأشخاص', 'الأنظمة']);
  for (const c of ['kids', 'mgr', 'people', 'systems']) assert.match(ORG_VIEW, new RegExp('data-og-col="' + c + '"'));
  assert.match(ORG_CSS, /\.og-rw\{[^}]*border:1px solid var\(--border-default\)/, 'every unit in its own frame');
  assert.match(ORG_CSS, /\.og-rw\.sel\{[^}]*border-color:var\(--brand-primary\)/, 'the selected one in a gold frame');
  assert.match(ORG_CSS, /\.og-ln\{/, 'connector lines'); for (const k of ['root', 'top', 'sector', 'gen', 'dept', 'sec']) assert.match(ORG_CSS, new RegExp('\\.og-kd\\[data-k="' + k + '"\\]\\{'), 'a colour per kind: ' + k);
  assert.equal(rowOf(v, ROOT).cls.includes('root'), true); assert.equal(rowOf(v, ROOT).chkOn, false, 'no checkbox on the root'); assert.equal(rowOf(v, ROOT).drag, 'false');
});

test('ب2 · search, filters (لها مدير · بلا مدير · فارغة), expand all / collapse all, a branch toggle', () => {
  const W = orgWorld({ hash: '#/sysadmin/org' }); let v = W.render();
  deq(J(v.ogFilters.map((f) => [f.t, f.n])), [['لها مدير', '2'], ['بلا مدير', '5'], ['فارغة', '2']]);
  /* بحث: المطابقُ وأصولُه */
  v.ogOnQ({ target: { value: 'قسم أ١' } }); v = W.render();
  deq(rowIds(v), [ROOT, SEC, G, A, S1], 'the match with its ancestors');
  v.ogOnQ({ target: { value: 'TEST_ONLY_NOTHING' } }); v = W.render();
  deq(rowIds(v), [ROOT]); assert.equal(v.ogRowsNone, true); assert.equal(v.ogRowsNoneTxt, 'لا وحدة تطابق البحث أو الفلتر');
  v.ogOnQ({ target: { value: '' } }); v = W.render(); assert.equal(rowIds(v).length, 8);
  /* الفلاتر */
  const flt = (k) => { W.render().ogFilters.find((f) => f.k === k).pick(); return W.render(); };
  v = flt('mgr'); deq(rowIds(v), [ROOT, SEC, G, A], 'units with a manager (and their ancestors)');
  assert.equal(v.ogFilters[0].on, 'true');
  v = flt('nomgr'); deq(rowIds(v), [ROOT, SEC, G, A, S1, B, E, Z].filter((id) => ![].includes(id)), 'without a manager: SEC · S1 · B · E · Z — G and A stay as ancestors');
  deq(v.ogRows.filter((r) => r.mgrHas === 'false' && r.id !== ROOT).map((r) => r.id), [SEC, S1, B, E, Z]);
  v = flt('empty'); deq(rowIds(v), [ROOT, SEC, E, Z], 'empty: nothing under them and nobody in them');
  v = flt('empty'); assert.equal(rowIds(v).length, 8, 'pressing the filter again clears it'); assert.ok(v.ogFilters.every((f) => f.on === 'false'));
  /* طيّ الكل · فرد الكل · طيّ فرع */
  v.ogCollapseAll(); v = W.render(); deq(rowIds(v), [ROOT, SEC, Z], 'collapsed: the first level under the root');
  assert.equal(rowOf(v, SEC).exp, 'false');
  v.ogExpandAll(); v = W.render(); assert.equal(rowIds(v).length, 8); assert.equal(rowOf(v, SEC).exp, 'true');
  rowOf(v, G).toggle({ stopPropagation() {} }); v = W.render(); deq(rowIds(v), [ROOT, SEC, G, E, Z], 'one branch folded');
  assert.equal(rowOf(v, G).kidsOn, true); assert.equal(rowOf(v, E).kidsOn, false); assert.equal(rowOf(v, E).leaf, true);
  /* القالب */
  for (const s of ['data-og-act="add"', 'placeholder="ابحث في الهيكل…"', 'data-og-act="expand"', 'data-og-act="collapse"', 'data-og-flt="{{f.k}}"', 'data-og-act="export-all"', 'تصدير النسخة الشاملة — كل الإدارات']) assert.ok(ORG_VIEW.includes(s), s);
  assert.ok(ORG_VIEW.indexOf('data-og-act="export-all"') > ORG_VIEW.indexOf('class="og-rows"'), 'the export-all button is under the tree');
  W.render().ogExportAll(); deq(W.hostCalls.at(-1), ['exportAll'], 'it calls the host\'s existing full export');
});

test('ب2 · multi-select: a checkbox per row (not the root), the bar with its three buttons, «إلغاء التحديد», and the hook for the apply', () => {
  const W = orgWorld({ hash: '#/sysadmin/org' }); let v = W.render();
  assert.equal(v.ogBulkOn, false, 'no bar without a selection');
  deq(v.ogRows.filter((r) => r.chkOn).map((r) => r.id), [SEC, G, A, S1, B, E, Z]);
  rowOf(v, A).chkFlip({ stopPropagation() {} }); rowOf(W.render(), B).chkFlip({ stopPropagation() {} }); v = W.render();
  assert.equal(v.ogBulkOn, true); assert.equal(v.ogBulkTxt, 'المحدد: 2 وحدة'); assert.equal(rowOf(v, A).chk, 'true'); assert.equal(rowOf(v, G).chk, 'false');
  assert.equal(W.location.hash, '#/sysadmin/org/platform/overview', 'ticking a box does not select the unit');
  /* V7 · د6 (م5): الخطّافُ صار معرَّفاً (logic-perm44.js orgBulkApply) — يفتح نافذةَ التطبيق ولا يُقال «غير متاح»؛ والحدث يحمل النمط والوحدات.
     (كان: بلا خطّاف يُقال «غير متاح الآن» — الرسالةُ باقيةٌ في _ogBulk لخطّافٍ لا يتولّى) */
  const t0 = W.toasts.length; v.ogBulkEnable(); assert.equal(W.toasts.length, t0, 'the hook took it: no «غير متاح» notice'); assert.equal(W.render().p44BulkOn, true, 'the apply dialog opens');
  assert.equal(W.events.at(-1).type, 'bs:org-bulk'); deq(J(W.events.at(-1).detail), { mode: 'on', units: [A, B] });
  W.render().p44BulkClose(); assert.equal(W.render().p44BulkOn, false);
  W.page.orgBulkApply = () => false; W.render().ogBulkEnable(); assert.match(W.toasts.at(-1)[0], /غير متاح الآن/, 'a hook that does not take it: said plainly');
  const got = []; W.page.orgBulkApply = (mode, units) => { got.push([mode, units.slice()]); return true; };
  const n0 = W.toasts.length; W.render().ogBulkDisable(); deq(got, [['off', [A, B]]]); assert.equal(W.toasts.length, n0, 'the hook took it: no notice');
  W.render().ogBulkEnable(); deq(got.at(-1), ['on', [A, B]]);
  W.render().ogBulkClear(); v = W.render(); assert.equal(v.ogBulkOn, false); assert.ok(v.ogRows.every((r) => r.chk === 'false'), '«إلغاء التحديد» clears every box');
  for (const s of ['data-og-bulk="on"', 'تفعيل أنظمة للمحدد', 'data-og-bulk="off"', 'إطفاء أنظمة للمحدد', 'data-og-bulk="clear"', 'إلغاء التحديد', 'role="checkbox" aria-checked="{{r.chk}}"']) assert.ok(ORG_VIEW.includes(s), s);
});

test('ب2 · drag and drop is kept (the same three zones) but no longer moves directly: the drop opens «نقل إلى…» prefilled, and nothing is saved until confirm', () => {
  const W = orgWorld({ hash: '#/sysadmin/org' }); let v = W.render();
  assert.equal(rowOf(v, B).drag, 'true'); assert.equal(v.ogDndOn, true);
  const ev = (y) => ({ preventDefault() {}, stopPropagation() {}, dataTransfer: { setData() {} }, clientY: y, currentTarget: { getBoundingClientRect: () => ({ top: 0, height: 40 }), contains: () => true } });
  rowOf(v, B).trDragStart(ev(0)); v = W.render(); assert.match(rowOf(v, B).cls, /dragging/);
  rowOf(v, E).trDragOver(ev(20)); v = W.render(); assert.match(rowOf(v, E).cls, /dz-inside/, 'the middle of a node = under it');
  const reg0 = JSON.stringify([W.D.nodes(), W.D.list()]);
  rowOf(v, E).trDrop(ev(20)); v = W.render();
  /* قرارُ المالك: الإفلاتُ يفتح النافذةَ نفسَها معبّأةً — ولا يُحفظ شيء */
  assert.equal(JSON.stringify([W.D.nodes(), W.D.list()]), reg0, 'the drop saved nothing'); assert.equal(W.D.nodeOf(B).pid, G);
  assert.equal(v.ogMoveOn, true, 'the move dialog is open'); assert.equal(v.ogDlgName, 'TEST_ONLY إدارة ب', 'for the dragged unit (not the selected one)'); assert.equal(v.ogMove.pid, E, 'the drop target is prefilled');
  assert.equal(v.ogMovePath, 'TEST_ONLY قطاع ← TEST_ONLY إدارة عامة فارغة ← TEST_ONLY إدارة ب'); assert.equal(v.ogEffNone, true); assert.equal(v.ogMoveOkLbl, 'انقل');
  v.ogDlgClose(); v = W.render(); assert.equal(v.ogMoveOn, false); assert.equal(JSON.stringify([W.D.nodes(), W.D.list()]), reg0, 'cancel: still nothing saved');
  rowOf(v, B).trDragStart(ev(0)); rowOf(W.render(), E).trDragOver(ev(20)); rowOf(W.render(), E).trDrop(ev(20)); W.render().ogMoveGo(); v = W.render();
  assert.equal(W.D.nodeOf(B).pid, E, 'confirm: moved under the node'); assert.match(W.acks.at(-1)[0], /نُقلت «TEST_ONLY إدارة ب» تحت «TEST_ONLY إدارة عامة فارغة»/); assert.equal(v.ogMoveOn, false);
  /* إفلاتٌ على طرف صف = ترتيب: النافذةُ تذكره، والتأكيدُ ينقل بالموضع نفسِه (moveNode) */
  rowOf(v, E).trDragStart(ev(0)); rowOf(W.render(), G).trDragOver(ev(2)); rowOf(W.render(), G).trDrop(ev(2)); v = W.render();
  assert.equal(v.ogMoveOn, true); assert.equal(v.ogMoveOrderOn, true); assert.equal(v.ogMoveOrder, 'قبل «TEST_ONLY إدارة عامة»');
  const order0 = W.D.nodes().map((x) => x.id).join(); v.ogMoveGo(); const order1 = W.D.nodes().map((x) => x.id);
  assert.notEqual(order1.join(), order0); assert.ok(order1.indexOf(E) < order1.indexOf(G), 'placed before the drop row');
  /* ما ترفضه قاعدةُ الموضع يُقال فوراً بلا نافذة */
  v = W.render(); rowOf(v, G).trDragStart(ev(0)); rowOf(W.render(), A).trDragOver(ev(20)); rowOf(W.render(), A).trDrop(ev(20)); v = W.render();
  assert.equal(v.ogMoveOn, false);
  rowOf(v, A).trDragStart(ev(0)); rowOf(W.render(), B).trDragOver(ev(20)); v = W.render();
  assert.doesNotMatch(rowOf(v, B).cls, /dz-inside/, 'a department is a leaf: no «under»'); assert.match(rowOf(v, B).cls, /dz-(before|after)/);
  for (const a of ['draggable="{{r.drag}}"', 'onDragStart="{{r.trDragStart}}"', 'onDragOver="{{r.trDragOver}}"', 'onDrop="{{r.trDrop}}"', 'onDragEnd="{{r.trDragEnd}}"']) assert.ok(ORG_VIEW.includes(a), a);
});

/* ══ ب3 · أفعال الهيكل ══ */
test('ب3 · the add dialog from both entry points: «+ إضافة» (no parent) and «+ إضافة تحتها» (parent prefilled); the new-unit systems choice is passed on', () => {
  const W = orgWorld({ hash: '#/sysadmin/org/' + G + '/overview' }); let v = W.render();
  /* فوق الشجرة: بلا أب */
  v.ogAddOpen(); v = W.render();
  assert.equal(v.ogAddOn, true); assert.equal(v.ogAdd.pid, ''); assert.equal(v.ogAddPath, 'في الجذر — بلا أب');
  deq(J(v.ogAddSys.map((c) => [c.t, c.on])), [['مطفأة كلها', 'true'], ['نفس أنظمة العقدة الأب', 'false']], 'default: all OFF');
  assert.ok(v.ogAddKinds.some((k) => k.id === 'إدارة') && v.ogAddKinds.some((k) => k.id === 'قسم') && v.ogAddKinds.some((k) => k.id === 'قطاع'));
  v.ogDlgClose(); v = W.render(); assert.equal(v.ogAddOn, false);
  /* من «نظرة عامة»: الأبُ الوحدةُ المختارة */
  v.ogAddUnder(); v = W.render();
  assert.equal(v.ogAdd.pid, G, 'the parent is the selected unit'); assert.equal(v.ogAddPath, 'TEST_ONLY قطاع ← TEST_ONLY إدارة عامة');
  v.ogAddGo(); assert.equal(W.render().ogAdd.msg, 'اكتب الاسم');
  v.ogAddOnName({ target: { value: 'TEST_ONLY إدارة ج' } }); W.render().ogAddGo(); assert.equal(W.render().ogAdd.msg, 'اختر النوع');
  /* ب4 (بعد دمج القواعد): المدخلُ الواحد KIVO.BassamDepts.unitAdd({ name, kind, pid, seed }) — النافذةُ لا تنادي غيرَه */
  const ua = []; const ua0 = W.D.unitAdd; W.D.unitAdd = function (o) { ua.push(J(o)); return ua0.call(this, o); };
  W.render().ogAddOnKind({ target: { value: 'إدارة' } }); W.render().ogAddSys[1].pick(); v = W.render(); assert.equal(v.ogAddSys[1].on, 'true');
  v.ogAddGo(); v = W.render();
  const c = W.D.list().find((x) => x.name === 'TEST_ONLY إدارة ج');
  assert.ok(c && c.gid === G, 'the department is created under the prefilled parent'); assert.match(c.id, /^d[0-9a-z]+$/);
  deq(ua, [{ name: 'TEST_ONLY إدارة ج', kind: 'إدارة', pid: G, seed: 'parent' }], 'ب4: the dialog choice goes to the one entry as seed');
  deq(J(W.seeded.at(-1)), ['seedCapFrom', c.id, G, { seed: 'parent' }], 'and the model seeds the new unit with it');
  assert.match(W.acks.at(-1)[0], /أنظمتها كأنظمة العقدة الأب/);
  assert.equal(v.ogAddOn, false, 'the dialog closes'); assert.equal(W.location.hash, '#/sysadmin/org/' + c.id + '/overview', 'and the new unit is opened');
  assert.match(W.acks.at(-1)[0], /أُنشئت «TEST_ONLY إدارة ج»/);
  /* تحت إدارة: النوع «قسم» معبّأ — ومسارُه sectionAdd بالاختيار الافتراضي */
  v = W.open('#/sysadmin/org/' + B + '/overview'); v.ogAddUnder(); v = W.render();
  assert.equal(v.ogAdd.kind, 'قسم'); assert.equal(v.ogAdd.pid, B);
  ua.length = 0;
  v.ogAddOnName({ target: { value: 'TEST_ONLY قسم ب١' } }); W.render().ogAddGo();
  deq(ua, [{ name: 'TEST_ONLY قسم ب١', kind: 'قسم', pid: B, seed: 'off' }], 'ب4: default «مطفأة كلها» for a section, through the same entry');
  assert.match(W.acks.at(-1)[0], /أنظمتها مطفأة: فعّلها من «الأنظمة»/);
  assert.ok(W.D.list().some((x) => x.name === 'TEST_ONLY قسم ب١' && x.gid === B && x.kind === 'قسم'));
  /* عقدةٌ بنوعٍ جديد: nodeAdd بالاختيار */
  v = W.open('#/sysadmin/org/platform/overview'); v.ogAddUnder(); v = W.render(); assert.equal(v.ogAdd.pid, '', 'under the root row = no parent');
  ua.length = 0;
  v.ogAddOnName({ target: { value: 'TEST_ONLY شعبة' } }); W.render().ogAddOnKind({ target: { value: '__new' } }); v = W.render(); assert.equal(v.ogAddNewOn, true);
  v.ogAddOnNewKind({ target: { value: 'شعبة' } }); W.render().ogAddGo();
  deq(ua, [{ name: 'TEST_ONLY شعبة', kind: 'شعبة', pid: null, seed: 'off' }]);
  assert.doesNotMatch(ORG_SRC.slice(ORG_SRC.indexOf('  _ogAddGo()'), ORG_SRC.indexOf('  _ogRenGo(')), /sectionAdd|nodeAdd|seedCapFrom|D\.save\(/, 'no direct creation call left in the dialog');
  /* القواعدُ القائمة: الاسمُ فريد · إدارةٌ تحت إدارة مرفوضة بنصّ قاعدة الموضع */
  v = W.open('#/sysadmin/org/' + G + '/overview'); v.ogAddUnder(); W.render().ogAddOnName({ target: { value: 'TEST_ONLY إدارة أ' } }); W.render().ogAddOnKind({ target: { value: 'إدارة' } }); W.render().ogAddGo();
  assert.equal(W.render().ogAdd.msg, 'يوجد في الهيكل ما يحمل هذا الاسم');
  W.render().ogAddOnName({ target: { value: 'TEST_ONLY إدارة تحت إدارة' } }); W.render().ogAddOnPid({ target: { value: A } }); W.render().ogAddGo();
  assert.equal(W.render().ogAdd.msg, W.D.placeWhy({ id: '', dept: true }, A), 'the placement rule\'s own reason');
  /* القالب: نافذةٌ واحدة بحقولها */
  const dlg = ORG_VIEW.slice(ORG_VIEW.indexOf('data-og-dlg="add"'), ORG_VIEW.indexOf('data-og-dlg="rename"'));
  for (const s of ['إضافة إلى الهيكل', '<span>الاسم</span>', '<span>نوع العقدة</span>', '+ نوع جديد…', '<span>العقدة الأب</span>', 'الموضع: <b', 'أنظمة الوحدة الجديدة', 'أضف العقدة', 'إلغاء',
    'تنسخ الوحدة سجلَّ أبيها كما هو الآن، ومفتاح المنصة فوق الجميع — ما يُعاد تشغيله على المنصة يصلها كما يصل أباها']) assert.ok(dlg.includes(s), 'add dialog: ' + s);
  assert.equal(ORG_VIEW.split('data-og-dlg="add"').length, 2, 'one add dialog');
});

test('ب3 · rename and «نقل إلى…» live in «الموضع وأفعال الوحدة»; the move list excludes the unit and its subtree and shows «الموضع بعد النقل»', () => {
  const W = orgWorld({ hash: '#/sysadmin/org/' + G + '/overview' }); let v = W.render();
  assert.equal(v.ogActsOn, true); assert.equal(v.ogActEditOn, true); assert.equal(v.ogDelLbl, 'حذف العقدة');
  /* إعادة التسمية */
  v.ogRenameOpen(); v = W.render(); assert.equal(v.ogRenOn, true); assert.equal(v.ogRen.name, 'TEST_ONLY إدارة عامة');
  v.ogRenOnName({ target: { value: 'TEST_ONLY قطاع' } }); W.render().ogRenGo(); assert.equal(W.render().ogRen.msg, 'الاسم مستخدم لعقدة أخرى');
  W.render().ogRenOnName({ target: { value: 'TEST_ONLY إدارة عامة ١' } }); W.render().ogRenGo(); v = W.render();
  assert.equal(W.D.nodeOf(G).name, 'TEST_ONLY إدارة عامة ١'); assert.equal(v.ogRenOn, false); assert.equal(v.ogU.name, 'TEST_ONLY إدارة عامة ١');
  /* نقل عقدة: هي وذرّيتُها وما ترفضه قاعدةُ الموضع (تحت إدارة) لا تظهر */
  v.ogMoveOpen(); v = W.render(); assert.equal(v.ogMoveOn, true);
  deq(v.ogMoveParents.map((o) => o.id), [SEC, E], 'not itself, not its subtree (A · S1 · B), not a department (Z)');
  assert.equal(v.ogMove.pid, SEC, 'the current parent is selected'); assert.equal(v.ogMoveRootOn, true); assert.equal(v.ogMoveNewOn, false);
  assert.equal(v.ogMovePath, 'TEST_ONLY قطاع ← TEST_ONLY إدارة عامة ١');
  v.ogMoveOnPid({ target: { value: E } }); v = W.render(); assert.equal(v.ogMovePath, 'TEST_ONLY قطاع ← TEST_ONLY إدارة عامة فارغة ← TEST_ONLY إدارة عامة ١', '«الموضع بعد النقل»');
  v.ogMoveOnPid({ target: { value: '' } }); v = W.render(); assert.equal(v.ogMovePath, 'في الجذر — بلا أب ← TEST_ONLY إدارة عامة ١');
  v.ogMoveGo(); v = W.render(); assert.equal(W.D.nodeOf(G).pid, null, 'moved to the root (works without dragging)'); assert.equal(v.ogMoveOn, false); assert.match(W.acks.at(-1)[0], /صارت في الجذر/);
  /* نقل إدارة: «+ إدارة عامة جديدة…» باقية · وقسم: تحت إدارةٍ وحدها */
  v = W.open('#/sysadmin/org/' + B + '/overview'); v.ogMoveOpen(); v = W.render();
  deq(v.ogMoveParents.map((o) => o.id), [SEC, E, G], 'a department: under nodes only'); assert.equal(v.ogMoveNewOn, true);
  v.ogMoveOnPid({ target: { value: '__new' } }); W.render().ogMoveGo();
  const fresh = W.D.nodes().find((x) => x.name === 'إدارة عامة جديدة'); assert.ok(fresh && W.D.nodeOf(B).pid === fresh.id, 'a new general department is created and the unit assigned to it');
  v = W.open('#/sysadmin/org/' + S1 + '/overview'); v.ogMoveOpen(); v = W.render();
  deq(v.ogMoveParents.map((o) => o.id).sort(), [A, B, Z].sort(), 'a section: under a department only'); assert.equal(v.ogMoveRootOn, false); assert.equal(v.ogMoveNewOn, false);
  v.ogMoveOnPid({ target: { value: Z } }); W.render().ogMoveGo(); assert.equal(W.D.nodeOf(S1).pid, Z);
  /* لا تعديلَ اسمٍ في الرأس · لا ⋯ على صفوف الشجرة · الأفعالُ في بطاقتها وحدها */
  const hd = ORG_VIEW.slice(ORG_VIEW.indexOf('<header class="og-hd">'), ORG_VIEW.indexOf('</header>'));
  assert.doesNotMatch(hd, /<input|onChange|onBlur|rename/i, 'the header has no name field'); assert.match(hd, /<h3 data-og="name">\{\{ogU\.name\}\}<\/h3>/);
  for (const s of ['data-og="path"', 'data-og="kind"', 'data-og="mgr"', 'data-og-act="switch"', 'التبديل إليها']) assert.ok(hd.includes(s), 'header: ' + s);
  const rows = ORG_VIEW.slice(ORG_VIEW.indexOf('<div class="og-rows"'), ORG_VIEW.indexOf('data-og-act="export-all"'));
  assert.doesNotMatch(rows, /⋯|aria-haspopup="menu"|rmToggle|rename|delete|data-og-act/, 'no actions button and no structure action on a tree row');
  const card = ORG_VIEW.slice(ORG_VIEW.indexOf('aria-label="الموضع وأفعال الوحدة"'), ORG_VIEW.indexOf('aria-label="ما تحتها"'));
  deq([...card.matchAll(/data-og-act="([a-z-]+)"/g)].map((m) => m[1]), ['add-under', 'rename', 'move', 'delete']);
  for (const a of ['rename', 'move', 'delete']) assert.equal(ORG_VIEW.split('data-og-act="' + a + '"').length, 2, a + ' is offered in one place only');
  assert.equal(orgWorld({ hash: '#/sysadmin/org/platform/overview' }).render().ogActEditOn, false, 'the root row: add only');
  assert.equal(orgWorld({ hash: '#/sysadmin/org/' + S1 + '/overview' }).render().ogActAddOn, false, 'nothing is added under a section');
});

test('«نقل إلى…» · «أثر النقل على الأنظمة»: what will be switched OFF and what will open by inheritance — by name, for the unit and everything under it; the confirm button says it; from the one inheritance source', () => {
  /* G يفتح staff · plan · tasks — E يفتح staff · daily: نقلُ إدارة أ (وقسمُها) من G إلى E يُطفئ اثنين ويفتح واحداً */
  const W = orgWorld({ hash: '#/sysadmin/org/' + A + '/overview', caps: { [G]: ['staff', 'plan', 'tasks'], [E]: ['staff', 'daily'] } }); let v = W.render();
  const reg0 = JSON.stringify([W.D.nodes(), W.D.list()]);
  v.ogMoveOpen(); v = W.render();
  assert.equal(v.ogEffNone, true, 'the current parent: nothing changes'); assert.equal(v.ogMoveOkLbl, 'انقل'); assert.match(v.ogMoveOkCls, /bs-btn--primary/); deq(J([v.ogEffOff, v.ogEffOn]), [[], []]);
  v.ogMoveOnPid({ target: { value: E } }); v = W.render();
  deq(J(v.ogEffOff), [{ id: A, name: 'TEST_ONLY إدارة أ', txt: 'التشغيل الميداني · المهام' }, { id: S1, name: 'TEST_ONLY قسم أ١', txt: 'التشغيل الميداني · المهام' }], 'OFF: the unit and what is under it, by name');
  deq(J(v.ogEffOn), [{ id: A, name: 'TEST_ONLY إدارة أ', txt: 'المتابعة اليومية' }, { id: S1, name: 'TEST_ONLY قسم أ١', txt: 'المتابعة اليومية' }], 'opened by inheritance, by name');
  assert.equal(v.ogEffNone, false); assert.equal(v.ogMoveOkLbl, 'انقل وأطفئ ما ذُكر (4)', 'the confirm button says what it switches off'); assert.match(v.ogMoveOkCls, /bs-btn--danger/);
  /* إلى الجذر: لا أبَ يقيّد ⇒ يُفتح ما كان G يطفئه، ولا يُطفأ شيء */
  v.ogMoveOnPid({ target: { value: '' } }); v = W.render();
  deq(J(v.ogEffOff), []); assert.equal(v.ogEffOnOn, true); assert.match(v.ogEffOn[0].txt, /المتابعة اليومية/); assert.equal(v.ogMoveOkLbl, 'انقل');
  /* الحسابُ قراءةٌ افتراضية: لم يُحفظ شيء ولم يتغيّر الهيكل، والمصدرُ دالةُ الوراثة القائمة (asIfUnder) */
  assert.equal(JSON.stringify([W.D.nodes(), W.D.list()]), reg0); assert.equal(W.D.nodeOf(A).pid, G); deq(J(W.D.ancestorsOf(A)), [G, SEC]);
  const f = ORG_SRC.slice(ORG_SRC.indexOf('  _ogMoveEffect('), ORG_SRC.indexOf('  _ogSetAll('));
  assert.match(f, /D\.asIfUnder\(id, pid \|\| null, read\)/);
  /* V7 · د6 (م5 · ب5): «المفعّل فعلياً» دالةٌ واحدة (p44SysOnEff = غيرُ مقفلٍ من فوق ∧ مفعّل) يقرؤها التبويبُ والشجرةُ وبطاقةُ النقل — لا تعبيرٌ منسوخ هنا */
  assert.match(f, /this\.p44SysOnEff\(u, x, off\)/, 'effective = what the «الأنظمة» tab shows (the one function)');
  const fe = ORG_SRC.slice(ORG_SRC.indexOf('  p44SysOnEff('), ORG_SRC.indexOf('  _p44PlatSw('));
  assert.match(fe, /_p44LockSrc\(u, x, off\)/); assert.match(fe, /&& this\._p44On\(u, x, off\)/, 'not locked from above ∧ on'); assert.doesNotMatch(f, /ancestorsOf|rawCap|hasCap|deptCap/, 'no second copy of the inheritance rule');
  /* وحدةٌ مستقلةُ السجلّ تحت أبٍ أضيق: ما يطفئه الأبُ الجديد يُذكر باسمها وحدها */
  const W2 = orgWorld({ hash: '#/sysadmin/org/' + Z + '/overview', caps: { [G]: ['staff'] } }); let y = W2.render(); y.ogMoveOpen(); y = W2.render();
  y.ogMoveOnPid({ target: { value: G } }); y = W2.render();
  assert.equal(y.ogEffOff.length, 1); assert.equal(y.ogEffOff[0].id, Z); assert.equal(y.ogEffOnOn, false); assert.match(y.ogMoveOkLbl, /^انقل وأطفئ ما ذُكر \(\d+\)$/);
  /* القالب: البطاقةُ تحت «الموضع بعد النقل» */
  const dlg = ORG_VIEW.slice(ORG_VIEW.indexOf('data-og-dlg="move"'), ORG_VIEW.indexOf('data-og-dlg="delete"'));
  assert.ok(dlg.indexOf('الموضع بعد النقل') < dlg.indexOf('aria-label="أثر النقل على الأنظمة"')); for (const t of ['سيُطفأ بحكم الأب الجديد', 'سيُفتح بالوراثة', 'لا يتغيّر شيء في الأنظمة', '{{ogMoveOkLbl}}']) assert.ok(dlg.includes(t), t);
});

test('ب3 · delete: a non-empty node is refused with the reason (nothing asked, nothing deleted); an empty one asks once; a department goes to the server inventory', async () => {
  /* عقدةٌ تحتها توابع */
  let W = orgWorld({ hash: '#/sysadmin/org/' + G + '/overview' }), v = W.render();
  v.ogDelOpen(); await W.tick(); v = W.render();
  assert.equal(v.ogDelOn, true); assert.equal(v.ogDelTitle, 'حذف العقدة «TEST_ONLY إدارة عامة»');
  assert.match(v.ogDelWhy, /تحت «TEST_ONLY إدارة عامة» 2 تابع — انقلها أو احذفها أولاً ثم احذف العقدة/, 'the reason and what to do');
  deq(W.confirms, [], 'no confirmation is asked'); assert.ok(W.D.nodeOf(G), 'nothing deleted');
  /* عقدةٌ فارغة لها حسابُ مدير */
  W = orgWorld({ hash: '#/sysadmin/org/' + E + '/overview', users: ORG.users.concat([{ id: 'TEST_ONLY_gmE', name: 'TEST_ONLY مدير الفارغة', un: '1000000009', role: 'gm', gid: E }]) });
  W.render().ogDelOpen(); await W.tick(); v = W.render();
  assert.match(v.ogDelWhy, /لـ«TEST_ONLY إدارة عامة فارغة» 1 حساب مدير — احذفه أولاً من تبويب «المسؤولون» ثم احذف العقدة/); deq(W.confirms, []); assert.ok(W.D.nodeOf(E));
  /* عقدةٌ فارغة: سؤالٌ واحد بالحوار الواحد — الإلغاءُ لا يغيّر شيئاً، والتأكيدُ يحذف ويعود إلى أبيها */
  W = orgWorld({ hash: '#/sysadmin/org/' + E + '/overview', confirm: false });
  W.render().ogDelOpen(); await W.tick(); await W.tick();
  assert.equal(W.confirms.length, 1); deq(J(W.confirms[0]), { title: 'حذف «TEST_ONLY إدارة عامة فارغة»', msg: 'تُحذف «TEST_ONLY إدارة عامة فارغة» من الهيكل. لا تُمسّ بيانات أي إدارة.', ok: 'حذف', danger: true });
  assert.ok(W.D.nodeOf(E), 'cancel: nothing deleted'); assert.equal(W.render().ogDelOn, false, 'no refusal dialog either');
  W = orgWorld({ hash: '#/sysadmin/org/' + E + '/overview' });
  W.render().ogDelOpen(); await W.tick(); await W.tick();
  assert.equal(W.confirms.length, 1); assert.equal(W.D.nodeOf(E), null, 'confirmed: deleted'); assert.equal(W.location.hash, '#/sysadmin/org/' + SEC + '/overview', 'back to its parent');
  /* إدارةٌ لها أقسام: مرفوضةٌ بنصّها · وإدارةٌ بلا مانع: جردُ الخادم وتأكيدُه عند الصفحة المضيفة (لا تأكيدَ هنا) */
  W = orgWorld({ hash: '#/sysadmin/org/' + A + '/overview' }); assert.equal(W.render().ogDelLbl, 'حذف الإدارة');
  W.render().ogDelOpen(); await W.tick(); v = W.render();
  assert.equal(v.ogDelWhy, W.D.deptDelWhy(A)); assert.match(v.ogDelWhy, /لها أقسام \(1\) — احذفها أولاً/); deq(W.hostCalls, []);
  W = orgWorld({ hash: '#/sysadmin/org/' + B + '/overview' });
  W.render().ogDelOpen(); await W.tick();
  deq(W.hostCalls, [['deptDel', B]], 'the host\'s existing delete (server inventory + its own confirmation)'); deq(W.confirms, []); assert.equal(W.render().ogDelOn, false);
  W = orgWorld({ hash: '#/sysadmin/org/' + S1 + '/overview' }); assert.equal(W.render().ogDelLbl, 'حذف القسم');
  /* القالب: نافذةُ السبب تذكر القاعدة */
  const dlg = ORG_VIEW.slice(ORG_VIEW.indexOf('data-og-dlg="delete"'));
  assert.match(dlg, /تُحذف العقدة الفارغة وحدها: انقل ما تحتها واحذف حساب مديرها أولاً\. لا تُمسّ بيانات أي إدارة\./); assert.match(dlg, /data-og="del-why">\{\{ogDelWhy\}\}/);
});

/* ══ ب10 · نظرة عامة ══ */
test('ب10 · overview: the summary cells open their tabs; «ما تحتها»; the setup checklist is four real steps derived from data (no stored state)', async () => {
  const docs = { [A]: { roles: [{ id: 'r1', name: 'TEST_ONLY دور', desc: '', sys: {} }], people: { TEST_ONLY_e1: { role: 'r1', ex: [] }, TEST_ONLY_e2: { role: 'r1', ex: [] } } } };
  const W = orgWorld({ hash: '#/sysadmin/org/' + A + '/overview', caps: { [A]: ['staff', 'plan'] }, docs }); let v = W.render();
  assert.equal(v.ogOnOverview, true); assert.equal(v.p44Show, false);
  deq(J(v.ogSum.map((c) => [c.k, c.t, c.v])), [['admins', 'المسؤول', 'TEST_ONLY مدير أ'], ['people', 'الأشخاص', '3'], ['systems', 'الأنظمة المفعّلة', '2 من ' + W.page.p44SysCount(A).all]]);
  for (const k of ['admins', 'people', 'systems']) { W.open('#/sysadmin/org/' + A + '/overview').ogSum.find((c) => c.k === k).go(); await W.tick(); assert.equal(W.location.hash, '#/sysadmin/org/' + A + '/' + k, 'the cell opens its tab: ' + k); }
  v = W.open('#/sysadmin/org/' + A + '/overview');
  assert.equal(v.ogPosTxt, 'TEST_ONLY قطاع ← TEST_ONLY إدارة عامة ← TEST_ONLY إدارة أ');
  deq(J(v.ogKids.map((k) => [k.name, k.kind, k.href])), [['TEST_ONLY قسم أ١', 'قسم', '#/sysadmin/org/' + S1 + '/overview']]); assert.equal(v.ogKidsN, '1 تابع');
  /* الخطوات (قرارُ المالك): العقدة · الأنظمة · المسؤول · الصلاحيات — كلٌّ بحالته من البيانات، والضغطُ يفتح تبويبه. «المراجعة» حُذفت: لم يكن لها معنى مستقل */
  deq(J(v.ogSteps.map((s) => [s.k, s.t, s.ok, s.sr])), [['node', 'العقدة', 'true', 'منجز'], ['systems', 'الأنظمة', 'true', 'منجز'], ['admins', 'المسؤول', 'true', 'منجز'], ['roles', 'الصلاحيات', 'true', 'منجز']]);
  assert.equal(v.ogSteps[3].st, 'لكل شخص نشط دور', 'the manager counts by his badge; both employees hold an existing role');
  const dest = { node: 'overview', systems: 'systems', admins: 'admins', roles: 'people' };
  for (const k of Object.keys(dest)) { W.open('#/sysadmin/org/' + A + '/overview').ogSteps.find((s) => s.k === k).go(); await W.tick(); assert.equal(W.location.hash, '#/sysadmin/org/' + A + '/' + dest[k], 'step ' + k + ' opens ' + dest[k]); }
  /* وحدةٌ ناقصة: بلا مدير · سقفٌ مفتوح لم يُضبط · بلا أدوار ⇒ ناقص، والمراجعةُ تتبعها */
  const Y = orgWorld({ hash: '#/sysadmin/org/' + Z + '/overview' }), y = Y.render();
  deq(J(y.ogSteps.map((s) => [s.k, s.ok])), [['node', 'true'], ['systems', 'false'], ['admins', 'false'], ['roles', 'false']]);
  assert.match(y.ogSteps[1].st, /^مفتوح — لم يُضبط: لا سقفَ لها ولا لأصولها/, 'the cap state from its one source (capState), in full when the step is not done'); assert.match(y.ogSteps[1].tip, /^مفتوح — لم يُضبط[\s\S]* — ناقص — افتح «الأنظمة»$/); assert.equal(y.ogSteps[2].st, 'لم يُعيَّن بعد'); assert.equal(y.ogSteps[3].st, 'لا أشخاص فيها بعد', 'a unit with no people is incomplete');
  /* «الصلاحيات»: شخصٌ نشط بلا دور ⇒ ناقصة بعدده · دورٌ محذوف لا يُحسب · الموقوفُ لا يُحسب */
  const one = (people, users) => orgWorld({ hash: '#/sysadmin/org/' + A + '/overview', docs: { [A]: { roles: docs[A].roles, people } }, ...(users ? { users } : {}) }).render().ogSteps[3];
  let st = one({ TEST_ONLY_e1: { role: 'r1', ex: [] } }); assert.equal(st.ok, 'false'); assert.equal(st.st, '1 شخص بلا دور');
  st = one({ TEST_ONLY_e1: { role: 'r1', ex: [] }, TEST_ONLY_e2: { role: 'TEST_ONLY_gone', ex: [] } }); assert.equal(st.ok, 'false', 'a role that no longer exists is not a role');
  st = one({ TEST_ONLY_e1: { role: 'r1', ex: [] } }, ORG.users.map((u) => (u.id === 'TEST_ONLY_a2' ? { ...u, dis: 1 } : u))); assert.equal(st.ok, 'true', 'a frozen account is not an active person');
  assert.doesNotMatch(ORG_SRC.slice(ORG_SRC.indexOf('    /* قائمةُ التهيئة:'), ORG_SRC.indexOf('  ogTabSystems(')), /localStorage|setState|\.save\(|setDept|setCap/, 'the checklist stores nothing: every step is derived');
  assert.equal(y.ogSum[0].v, 'بلا مدير');
  /* عقدةٌ إشرافية: «الصلاحيات» من وحداتها */
  const g = W.open('#/sysadmin/org/' + G + '/overview'); assert.equal(g.ogSteps[3].ok, 'false'); assert.match(g.ogSteps[3].st, /^\d+ شخص بلا دور$/, 'a node: the people of its units (S1 and B have people without roles)');
  /* صف «المنصة كلها»: ملخّصٌ وما تحتها وإضافة — بلا قائمة تهيئة */
  const r = W.open('#/sysadmin/org/platform/overview'); assert.equal(r.ogStepsOn, false); assert.equal(r.ogSum[0].v, 'TEST_ONLY المالك'); deq(r.ogKids.map((k) => k.name), ['TEST_ONLY قطاع', 'TEST_ONLY إدارة بلا أب']);
  /* القالب: الخطواتُ في صفٍّ واحد */
  assert.match(ORG_CSS, /\.og-steps\{[^}]*grid-template-columns:repeat\(4,/); assert.match(ORG_VIEW, /<ol class="og-steps">/);
  for (const s of ['aria-label="ملخّص الوحدة"', 'aria-label="الموضع وأفعال الوحدة"', 'aria-label="ما تحتها"', 'aria-label="قائمة التهيئة"']) assert.ok(ORG_VIEW.includes(s), s);
});

test('ب1 · the unit header: path · name · kind · manager state · «التبديل إليها» (only for a unit that is not the active one)', async () => {
  const W = orgWorld({ hash: '#/sysadmin/org/' + B + '/overview', active: A }); let v = W.render();
  deq(J([v.ogU.pathTxt, v.ogU.name, v.ogU.kind, v.ogU.mgrTxt, v.ogU.switchOn, v.ogU.cur]), ['TEST_ONLY قطاع ← TEST_ONLY إدارة عامة', 'TEST_ONLY إدارة ب', 'إدارة', 'بلا مدير', true, false]);
  v.ogSwitch(); await W.tick(); deq(W.hostCalls.at(-1), ['switchDept', B], 'the host\'s existing switch');
  v = W.open('#/sysadmin/org/' + A + '/overview'); assert.equal(v.ogU.switchOn, false); assert.equal(v.ogU.cur, true); assert.equal(v.ogU.mgrTxt, 'له مدير');
  v = W.open('#/sysadmin/org/' + G + '/overview'); assert.equal(v.ogU.switchOn, false, 'a supervisory node holds no data to switch to'); assert.equal(v.ogU.kind, 'إدارة عامة');
  v = W.open('#/sysadmin/org/platform/overview'); deq([v.ogU.name, v.ogU.kind, v.ogU.switchOn], ['المنصة كلها', 'المنصة', false]);
});

/* ══ صف «المنصة كلها» والتبويبات القائمة ══ */
test('the root row: «الأنظمة» = the platform switches; «المسؤولون» = the «مدير المنصة» card; «السجل» opens the activity log filtered to platform-level changes; no unit picker inside «الأنظمة»', async () => {
  const W = orgWorld({ hash: '#/sysadmin/org/platform/systems', off: ['seized'] }); let v = W.render();
  assert.equal(v.p44Show, true); assert.equal(v.p44OnSys, true); assert.equal(v.p44Unit.n, 'المنصة كلها'); assert.equal(v.p44SysNavOn, false, 'no manager menu for the platform row');
  assert.equal(v.p44SysRows.find((r) => r.k === 'seized').isOn, false); assert.equal('p44Units' in v, false, 'the «الوحدة» picker is gone');
  assert.doesNotMatch(ORG_VIEW, /p44Units|p44-units|p44-unit"/); assert.doesNotMatch(ORG_CSS, /p44-unit/);
  v.p44SysRows.find((r) => r.k === 'seized').flip(); v = W.render(); assert.equal(v.p44SysDirty, true); v.p44SysReview(); v = W.render(); v.p44RevSave();
  deq(J(W.platW.at(-1).mods.off), [], 'saved through the existing platform writer (mods.off)');
  v = W.open('#/sysadmin/org/platform/admins'); assert.equal(v.ogOnAdmins, true); assert.equal(v.p44IsSup, true); assert.equal(v.p44IsMgr, false); assert.equal(v.p44Role.n, 'مدير المنصة'); assert.equal(v.p44Head, 'المسؤولون');
  v = W.open('#/sysadmin/org/platform/log'); assert.equal(v.ogLogRoot, true); assert.equal(v.p44OnLog, false);
  /* قرارُ المالك: يفتح سجلَّ الأنشطة مفلتراً على تغييرات مستوى المنصة (مفاتيح الأنظمة · مسؤولو المنصة) — لا السجلَّ كلَّه */
  deq(J(v.ogLogRootLinks.map((l) => [l.k, l.t])), [['switches', 'تغييرات مفاتيح الأنظمة وإعدادات المنصة'], ['accounts', 'تغييرات حسابات الدخول ومسؤولي المنصة']]);
  v.ogLogRootLinks[0].go({ preventDefault() {} }); await W.tick(); deq(W.hostCalls.at(-1), ['openPlatLog', 'switches']);
  v.ogLogRootLinks[1].go({ preventDefault() {} }); await W.tick(); deq(W.hostCalls.at(-1), ['openPlatLog', 'accounts']);
  assert.ok(!W.hostCalls.some((c) => c[0] === 'conGo'), 'never the unfiltered log');
  /* وحدة: «المسؤولون» بطاقةُ «مدير الوحدة» القائمة — و«الأدوار» أدوارُ الموظفين وحدها */
  v = W.open('#/sysadmin/org/' + A + '/admins'); assert.equal(v.p44IsMgr, true); assert.equal(v.p44MgrFull, true); assert.equal(v.p44MgrAddOn, true); assert.match(v.p44Lead, /مسؤولو «TEST_ONLY إدارة أ»: 1 مدير/);
  v = W.open('#/sysadmin/org/' + A + '/roles'); deq(J(v.p44RoleList), [], 'no fixed cards in the roles list'); assert.equal(v.p44NoRole, true); assert.equal('p44IsMgr' in v, false);
  v = W.open('#/sysadmin/org/' + G + '/roles'); assert.equal(v.p44NodeRoles, true); deq(v.p44NodeUnits.map((u) => u.href), [A, S1, B].map((id) => '#/sysadmin/org/' + id + '/roles'));
  v = W.open('#/sysadmin/org/' + G + '/data'); assert.equal(v.ogDataNode, true); deq(v.ogDataUnits.map((u) => u.href), [A, S1, B].map((id) => '#/sysadmin/org/' + id + '/data'));
  v = W.open('#/sysadmin/org/' + A + '/data'); assert.equal(v.ogDataUnit, true); assert.equal(v.ogDataNode, false);
});

/* ══ ب12 (المدخل) · عرض المدير ══ */
test('ب12 entry · the manager\'s «الإعدادات ← الصلاحيات»: the same page, his unit and what is under it only, no structure actions, no «البيانات»', async () => {
  const W = orgWorld({ mode: 'dept', me: 'TEST_ONLY_mA', active: A, hash: '#/admin/perm' }); let v = W.render();
  assert.equal(v.ogMode, 'dept'); assert.equal(W.location.hash, '#/admin/perm/' + A + '/overview', 'his old entry address is redirected');
  deq(rowIds(v), [A, S1], 'the tree: his department and its section — no root row, nothing of another branch');
  deq(v.ogTabs.map((t) => t.k), ['overview', 'systems', 'admins', 'roles', 'people', 'log'], 'six tabs: no «البيانات»');
  deq([v.ogStructOn, v.ogDndOn, v.ogBulkOn, v.ogExportOn, v.sdShow, v.ogActsOn, v.ogU.switchOn], [false, false, false, false, false, false, false], 'no structure action of any kind');
  assert.ok(v.ogRows.every((r) => !r.chkOn && r.drag === 'false'), 'no checkbox, no drag'); assert.match(v.ogActsNote, /لمدير المنصة/);
  assert.equal(rowOf(v, A).sys, String(W.page.p44SysCount(A).on), 'he sees the ON count only (never how many are OFF)');
  for (const old of ['roles', 'people', 'log', 'systems']) { const X = orgWorld({ mode: 'dept', me: 'TEST_ONLY_mA', active: A, hash: '#/admin/perm/' + old }); X.render(); assert.equal(X.location.hash, '#/admin/perm/' + A + '/' + old, '#/admin/perm/' + old + ' keeps working'); }
  /* وحدةٌ خارج نطاقه أو تبويبُ «البيانات» بالعنوان: لا يُفتحان */
  v = W.open('#/admin/perm/' + B + '/roles'); assert.equal(v.ogUnitSeg, A, 'another branch\'s unit is not opened'); assert.equal(W.location.hash, '#/admin/perm/' + A + '/roles');
  v = W.open('#/admin/perm/' + A + '/data'); assert.equal(v.ogTab, 'overview'); assert.equal(v.ogOnData, false);
  rowOf(v, S1).pick(); await W.tick(); v = W.render(); assert.equal(W.location.hash, '#/admin/perm/' + S1 + '/overview', 'his section is his');
  v = W.open('#/admin/perm/' + A + '/admins'); assert.equal(v.p44MgrRO, true); assert.equal(v.p44MgrFull, false); assert.equal(v.p44MgrAddOn, false);
  assert.equal(await W.page.go(B, 'roles'), false, 'go() refuses a unit outside the scope');
  /* المدير العام: عقدتُه وفرعُها · موظفٌ عادي: لا شيء */
  const Gm = orgWorld({ mode: 'dept', me: 'TEST_ONLY_gm', active: A, hash: '#/admin/perm' }), g = Gm.render();
  deq(rowIds(g), [G, A, S1, B]); assert.equal(g.ogUnitSeg, A, 'opens on the active unit of his branch');
  const Em = orgWorld({ mode: 'dept', me: 'TEST_ONLY_a1', active: A, hash: '#/admin/perm' }), e = Em.render();
  assert.equal(e.ogOn, false); assert.equal(e.ogNoneOn, true); assert.match(e.ogNoneTxt, /لمدير الوحدة ومدير المنصة/);
  /* مديرُ المنصة في إعدادات إدارة: الإدارةُ النشطة وما تحتها بعرض المدير */
  const Su = orgWorld({ mode: 'dept', active: B, hash: '#/admin/perm' }), s = Su.render(); deq(rowIds(s), [B]); assert.equal(s.ogStructOn, false);
});

/* ══ ب13 · هيكلُ العرض الضيّق ══ */
test('ب13 skeleton · narrow width: one column, the unit button opens the tree as a bottom sheet, a scrollable tab strip, 44px targets, dialogs fill the width', () => {
  /* قرارُ المالك: العمودان من 1024 فما فوق — ما دون 1024 عمودٌ واحد؛ من 1024 إلى 1280 الشجرةُ أضيق؛ وأهدافُ اللمس 44px في العمود الواحد وعلى كل شاشة لمس */
  assert.doesNotMatch(ORG_CSS, /@media \(max-width:1280px\)\{/, 'the old 1280 single-column breakpoint is gone');
  const narrow = ORG_CSS.slice(ORG_CSS.indexOf('@media (max-width:1023px){'));
  assert.ok(narrow.length > 200, 'the narrow rules exist');
  const mid = ORG_CSS.slice(ORG_CSS.indexOf('@media (min-width:1024px) and (max-width:1280px){')); assert.ok(mid.length > 50);
  assert.match(mid, /^[^}]*\{\s*\.og-grid\{grid-template-columns:minmax\(0,40fr\) minmax\(0,60fr\)/, 'two columns, a narrower tree'); assert.match(mid, /\[data-og-col="kids"\],\.og-rw \[data-og-col="people"\]\{display:none\}/);
  assert.match(ORG_CSS, /@media \(max-width:1023px\),\(pointer:coarse\)\{/, '44px targets on any touch or pen screen');
  assert.match(ORG_SRC, /KIVO\.BassamNav\.fit\(!0\)/); assert.match(ORG_SRC, /KIVO\.BassamNav\.fit\(!1\)/);
  assert.match(narrow, /\.og-grid\{grid-template-columns:minmax\(0,1fr\)\}/, 'one column');
  assert.match(ORG_CSS, /\.og-sheet-hd,\.og-ub\{display:none\}/, 'the unit button is for the narrow layout only'); assert.match(narrow, /\.og-ub\{display:flex;[^}]*min-height:52px/);
  assert.match(narrow, /\.og-treewrap\{display:none\}/); assert.match(narrow, /\.og\[data-og-sheet="true"\] \.og-treewrap\{display:flex;position:fixed;inset:0;[^}]*align-items:flex-end/, 'the tree is a sheet from the bottom');
  assert.match(ORG_CSS, /\.og-tabs\{[^}]*overflow-x:auto/, 'the tab strip scrolls sideways'); assert.match(ORG_CSS, /\.og-tab\{flex:none;/);
  /* .og.og.og: فوق قاعدتَي اللمس العامتين (pointer:coarse ⇒ 32px) — المتصفحُ يقيس الارتفاعَ الفعلي بمحاكاة اللمس (tests/browser/v7_d6_frame) */
  assert.match(narrow, /\.og\.og\.og \.og-b,\.og\.og\.og \.og-l,\.og\.og\.og \.og-q,\.og\.og\.og \.og-flt button,\.og-tab,\.og\.og\.og \.og-radio button,\.og\.og\.og \.og-dlg \.fl input,\.og\.og\.og \.og-dlg \.fl select,\.og\.og\.og \.og-dlg \.ft button\{min-height:44px\}/, '44px touch targets');
  assert.match(narrow, /\.og-rw\{min-height:48px\}/); assert.match(narrow, /\.og-cv\{position:relative;width:28px;height:44px/); assert.match(narrow, /\.og-cv::before\{content:"";position:absolute;inset:0 -8px\}/, 'the fold arrow: 44px high, 28px + 2×8px = 44px wide hit area'); assert.match(narrow, /\.og-ck::before\{content:"";position:absolute;inset:-10px\}/, 'the checkbox: 24px + 2×10px = 44px hit area'); assert.match(narrow, /\.og-dlg\{width:100%\}/, 'dialogs fill the width');
  /* الزرّ يحمل اسمَ الوحدة ومسارَها ويفتح اللوحة؛ اختيارُ وحدةٍ يغلقها */
  assert.match(ORG_VIEW, /<button type="button" class="og-ub" aria-haspopup="dialog" aria-expanded="\{\{ogSheetAttr\}\}" onClick="\{\{ogSheetOpen\}\}"[^>]*>\s*<span class="og-ub-t"><b>\{\{ogU\.name\}\}<\/b><small>\{\{ogU\.pathTxt\}\}<\/small><\/span>/);
  const W = orgWorld({ hash: '#/sysadmin/org/' + A + '/roles' }); let v = W.render(); assert.equal(v.ogSheetAttr, 'false');
  v.ogSheetOpen(); v = W.render(); assert.equal(v.ogSheetAttr, 'true');
  return (async () => { rowOf(v, B).pick(); await W.tick(); v = W.render(); assert.equal(v.ogSheetAttr, 'false', 'picking a unit closes the sheet'); assert.equal(W.location.hash, '#/sysadmin/org/' + B + '/roles');
    W.render().ogSheetOpen(); W.page.componentDidMount(); W.page.__ogKey({ key: 'Escape' }); assert.equal(W.render().ogSheetAttr, 'false', 'Escape closes it'); })();
});
