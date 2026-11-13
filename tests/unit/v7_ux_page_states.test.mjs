/* V7 UX states · step 2 — the one page-states component (src/components/555-page-states.js), alone in a vm over a small DOM double.
   Four states, ONE skeleton for every page (the three templates and the pages.json `skeleton` field are gone — owner decision);
   nothing before 300 ms; the add button only when the passed permission check is true; one retry on
   `online`; reduced motion; aria roles; one strings table; no device storage; names and the header tabs from the pages manifest. The shell rule itself (header + skeleton, or the
   session's content + line and badge) is judged in a real browser: tests/browser/v7_ux_route_matrix.test.mjs. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const SRC = read('src/components/555-page-states.js'), CSS = read('src/styles/555-page-states.css');

function el(tag) {
  const L = {}, A = {};
  const n = { tagName: tag.toUpperCase(), childNodes: [], parentNode: null, className: '', hidden: false, _text: '', isConnected: true,
    get firstChild() { return this.childNodes[0] || null; },
    get textContent() { return this._text + this.childNodes.map((c) => c.textContent).join(''); },
    set textContent(v) { this.childNodes = []; this._text = String(v); },
    appendChild(c) { c.parentNode = this; this.childNodes.push(c); return c; },
    removeChild(c) { this.childNodes = this.childNodes.filter((x) => x !== c); c.parentNode = null; return c; },
    setAttribute(k, v) { A[k] = String(v); }, getAttribute(k) { return k in A ? A[k] : null; }, removeAttribute(k) { delete A[k]; }, hasAttribute(k) { return k in A; },
    addEventListener(k, f) { (L[k] ||= []).push(f); }, click() { (L.click || []).forEach((f) => f({ type: 'click' })); },
    classList: { add(c) { if (!n.className.split(' ').includes(c)) n.className = (n.className + ' ' + c).trim(); }, remove(c) { n.className = n.className.split(' ').filter((x) => x !== c).join(' '); }, contains(c) { return n.className.split(' ').includes(c); } },
    closest() { return n.parentNode; },
    all(pred, out = []) { for (const c of this.childNodes) { if (pred(c)) out.push(c); c.all(pred, out); } return out; },
    cls(c) { return this.all((x) => x.className.split(' ').includes(c)); },
  };
  return n;
}
const PAGES = [
  { key: 'staff', nav: 'staffing', module: 'staff', name: 'الجدول الشهري', under: 'planning' },
  { key: 'plan', nav: 'plan', module: 'plan', name: 'التشغيل الميداني' },
  { key: 'planning', nav: 'planning', module: 'planning', name: 'الخطة التشغيلية' },
  { key: 'emps', nav: 'employees', module: 'employees', name: 'موظفو الإدارة', shellTabs: [{ name: 'مستودع العهد', as: 'custody' }], subs: [{ key: 'data', name: 'بيانات الموظفين' }, { key: 'custody', name: 'عهد الموظفين' }] },
  { key: 'seized', nav: 'seized', module: 'seized', name: 'نظام المضبوطات', subs: [{ key: 'dash', name: 'لوحة المؤشرات', offPage: true }, { key: 'records', name: 'السجلات' }] },
  { key: 'award', nav: 'award', module: 'award', name: 'جائزة التميز', subs: [{ key: 'new', name: 'ترشيح جديد' }, { key: 'res', name: 'لوحة النتائج' }, { key: 'doc', name: 'المراجع المعتمدة' }] },
  { key: 'admin', nav: 'admin', module: 'admin', name: 'الإعدادات', subs: [{ key: 'oplog', name: 'سجل الحركة' }] },
];
const MANIFEST = { pages: PAGES, containers: [{ key: 'kpis', nav: 'kpis', name: 'مؤشرات الإدارة', refs: ['seized/dash', 'staff'], names: { 'seized/dash': 'لوحة مؤشرات المضبوطات', staff: 'مؤشرات الجدول' } }],
  routeNames: { kpis: 'مؤشرات الإدارة', staffing: 'الجدول الشهري', plan: 'التشغيل الميداني', planning: 'الخطة التشغيلية', employees: 'موظفو الإدارة', seized: 'نظام المضبوطات', award: 'جائزة التميز', admin: 'الإعدادات', sysadmin: 'مركز إدارة رشاد', profile: 'صفحتي' },
  pageTabs: { employees: [['بيانات الموظفين', 'i-1'], ['عهد الموظفين', 'i-2'], ['مستودع العهد', 'i-3']], award: [['لوحة النتائج', 'i-5'], ['ترشيح جديد', 'i-4']], kpis: [['*', 'i-9']] },
  tabIcons: { 'i-1': '<path d="M1"></path>', 'i-2': '<path d="M2"></path>', 'i-3': '<path d="M3"></path>', 'i-4': '<path d="M4"></path>', 'i-5': '<path d="M5"></path>', 'i-9': '<path d="M9"></path>' },
  pageComponents: { Staffing: 'staff', 'Operational Plan': 'plan', Planning: 'planning', Employees: 'employees', Seized: 'seized', Award: 'award', Admin: 'admin', KPIs: 'kpis', Profile: 'profile' } };

function world({ reduce = false, hash = '#/staffing' } = {}) {
  const timers = []; let now = 0; const L = {};
  const window = { location: { hash }, addEventListener(k, f) { (L[k] ||= []).push(f); }, matchMedia: (q) => ({ matches: reduce && /reduce/.test(q) }),
    fire(k) { (L[k] || []).forEach((f) => f({ type: k })); } };
  const KIVO = { KIVO_MANIFEST: { keys: Object.keys(MANIFEST), clone: (k) => JSON.parse(JSON.stringify(MANIFEST[k])) } };
  const ctx = { window, KIVO, document: { createElement: el, addEventListener() {}, querySelector: () => null, readyState: 'complete' }, JSON, Date,
    setTimeout: (f, ms) => { timers.push({ f, at: now + (ms || 0) }); return timers.length; }, clearTimeout: (id) => { if (timers[id - 1]) timers[id - 1].f = null; } };
  vm.runInNewContext(SRC, ctx);
  const tick = (ms) => { now += ms; for (const t of timers) if (t.f && t.at <= now) { const f = t.f; t.f = null; f(); } };
  return { window, KIVO, P: KIVO.PageStates, tick };
}

test('loading: nothing before 300 ms, then the ONE skeleton — KPI cards + a content card with a toolbar and rows; no text, no button; status + aria-busy', () => {
  const { P, tick } = world(), host = el('div');
  P.host(host, { state: 'loading', name: 'الجدول الشهري' });
  assert.equal(host.childNodes.length, 0, 'empty at 0 ms');
  tick(299); assert.equal(host.childNodes.length, 0, 'still empty at 299 ms');
  assert.equal(host.getAttribute('role'), 'status'); assert.equal(host.getAttribute('aria-busy'), 'true'); assert.equal(host.getAttribute('data-ps'), 'loading');
  tick(1); assert.equal(host.cls('ps-skel').length, 1, 'skeleton at 300 ms');
  const sk = host.cls('ps-skel')[0];
  assert.deepEqual(sk.childNodes.map((c) => c.className), ['ps-kpis', 'ps-panel'], 'a row of KPI cards, then the content card');
  assert.equal(host.cls('ps-kpi').length, 4); assert.deepEqual(host.cls('ps-panel')[0].childNodes.map((c) => c.className), ['ps-tools', 'ps-rows'], 'toolbar and rows inside the card');
  assert.equal(host.cls('ps-tool').length, 3); assert.equal(host.cls('ps-row').length, 6); assert.ok(host.cls('ps-bone').length >= 17, 'moving lines');
  assert.equal(host.textContent, '', 'no text'); assert.equal(host.all((x) => x.tagName === 'BUTTON').length, 0, 'no button');
  assert.equal(sk.getAttribute('aria-hidden'), 'true');
  /* one shape whatever is asked: the old shape option and manifest field are ignored, and no shape attribute is written */
  const shapeOf = (h) => JSON.stringify(h.cls('ps-skel')[0].all(() => true).map((c) => c.className));
  for (const shape of ['table', 'map', 'cards', 'nope']) { const u = el('div'); P.host(u, { shape, state: 'loading' }); tick(300); assert.equal(shapeOf(u), shapeOf(host), shape); assert.equal(u.getAttribute('data-ps-shape'), null); }
  assert.equal(P.SHAPES, undefined, 'no shapes table');
  /* the card look and the contrast are in the stylesheet: white card on the page background, bones darker than the card */
  assert.match(CSS, /\.ps-kpi,\.ps-panel\{[^}]*background:var\(--bg-card\)[^}]*border:1px solid var\(--border-subtle\)[^}]*box-shadow:var\(--shadow-card\)[^}]*border-radius:var\(--r-lg\)/);
  assert.match(CSS, /\.ps-bone\{[^}]*var\(--border-strong\)/);
  for (const gone of ['ps-mapwrap', 'ps-canvas', 'ps-cardbone', 'ps-skel-']) assert.equal(SRC.includes(gone) || CSS.includes(gone), false, gone + ' is gone');
});

test('a load that ends before 300 ms never shows a skeleton and gets no entrance; a shown one enters calmly', () => {
  const { P, tick } = world(), host = el('div'), content = el('div');
  P.host(host, { state: 'loading', content });
  tick(200); P.host(host, { state: 'ready', content });
  tick(500); assert.equal(host.childNodes.length, 0); assert.equal(host.hidden, true); assert.equal(content.classList.contains('ps-enter'), false, 'fast load: no entrance');
  P.host(host, { state: 'loading', content }); tick(300); assert.equal(host.cls('ps-skel').length, 1);
  P.host(host, { state: 'ready', content });
  assert.equal(host.childNodes.length, 0); assert.equal(host.getAttribute('aria-busy'), null); assert.equal(host.getAttribute('role'), null);
  assert.equal(content.classList.contains('ps-enter'), true, 'entrance class');
  tick(1000); assert.equal(content.classList.contains('ps-enter'), false, 'and it is removed afterwards (no lasting transform)');
});

test('refreshing: a moving line and the badge; the content is the page\'s own and only marked busy', () => {
  const { P } = world(), host = el('div'), content = el('div');
  P.host(host, { state: 'refreshing', content });
  assert.equal(host.cls('ps-line').length, 1); assert.equal(host.cls('ps-badge')[0].textContent, 'يُحدَّث من الخادم');
  assert.equal(host.getAttribute('role'), 'status'); assert.equal(content.getAttribute('aria-busy'), 'true');
  assert.equal(host.all((x) => x.tagName === 'BUTTON').length, 0, 'no button while refreshing');
  assert.equal(content.hidden, false); assert.equal(content.hasAttribute('disabled'), false); assert.equal(content.hasAttribute('inert'), false);
  P.host(host, { state: 'ready', content }); assert.equal(content.getAttribute('aria-busy'), null); assert.equal(host.hidden, true);
});

test('error: one card, role=alert, the content name, the fixed line and exactly one retry button', () => {
  const { P } = world(), host = el('div'); let n = 0;
  P.host(host, { state: 'error', name: 'الترشيحات', retry: () => { n++; } });
  const card = host.cls('ps-card'); assert.equal(card.length, 1); assert.equal(card[0].getAttribute('role'), 'alert');
  assert.equal(host.cls('ps-title')[0].textContent, 'تعذّر تحميل الترشيحات');
  assert.equal(host.cls('ps-text')[0].textContent, 'لم يصل رد من الخادم. بياناتك المحفوظة لم تتأثر، وتُعاد المحاولة تلقائياً عند عودة الاتصال.');
  const b = host.all((x) => x.tagName === 'BUTTON'); assert.equal(b.length, 1); assert.equal(b[0].textContent, 'أعد المحاولة'); assert.equal(b[0].type, 'button');
  b[0].click(); assert.equal(n, 1);
  assert.equal(host.getAttribute('aria-busy'), null);
  const bare = el('div'); P.host(bare, { state: 'error' }); assert.equal(bare.cls('ps-title')[0].textContent, 'تعذّر تحميل المحتوى', 'no name ⇒ the generic noun');
  assert.equal(bare.all((x) => x.tagName === 'BUTTON').length, 0, 'no retry function ⇒ no dead button');
});

test('online: every host in the error state is retried once; not after it left the error state, not with auto:false, not when detached', () => {
  const { P, window } = world(), a = el('div'), b = el('div'), c = el('div'), d = el('div'); const hits = { a: 0, b: 0, c: 0, d: 0 };
  P.host(a, { state: 'error', retry: () => { hits.a++; } });
  P.host(b, { state: 'error', retry: () => { hits.b++; }, auto: false });
  P.host(c, { state: 'error', retry: () => { hits.c++; } });
  P.host(d, { state: 'error', retry: () => { hits.d++; } });
  P.host(c, { state: 'ready', retry: () => { hits.c++; } }); d.isConnected = false;
  window.fire('online'); assert.deepEqual(hits, { a: 1, b: 0, c: 0, d: 0 });
  P.host(a, { state: 'error', retry: () => { hits.a += 10; } });          // the page re-renders with a fresh closure: the latest one is used, once
  window.fire('online'); assert.equal(hits.a, 11);
});

test('empty: calm card; an action only when the passed permission check is true; two-button and note slots', () => {
  const { P } = world(); let added = 0;
  const spec = (can) => ({ state: 'empty', empty: { title: 'لا يوجد جدول لهذا الشهر', line: 'كل شهر له جدول مستقل.', actions: [{ label: 'إنشاء جدول', on: () => { added++; }, can }] } });
  for (const can of [false, undefined, null, 0, 1, 'yes', () => false, () => { throw Error('x'); }]) {
    const h = el('div'); P.host(h, spec(can)); assert.equal(h.all((x) => x.tagName === 'BUTTON').length, 0, 'no button for ' + String(can));
    assert.equal(h.cls('ps-title')[0].textContent, 'لا يوجد جدول لهذا الشهر'); assert.equal(h.cls('ps-text')[0].textContent, 'كل شهر له جدول مستقل.');
  }
  for (const can of [true, () => true]) { const h = el('div'); P.host(h, spec(can)); const b = h.all((x) => x.tagName === 'BUTTON'); assert.equal(b.length, 1); b[0].click(); }
  assert.equal(added, 2);
  const h = el('div');
  P.host(h, { state: 'empty', empty: { title: 'لا توجد جولة', notes: [{ tone: 'warn', text: 'الشهر مقفل' }, { text: 'لا يوجد موظفون' }],
    actions: [{ label: 'سحب التشغيل', on() {}, can: true }, { label: 'متابعة جولة', on() {}, can: true }, { label: 'ثالث', on() {}, can: true }] } });
  assert.deepEqual(h.all((x) => x.tagName === 'BUTTON').map((x) => x.textContent), ['سحب التشغيل', 'متابعة جولة'], 'at most two buttons');
  assert.equal(h.cls('ps-note-warn')[0].textContent, 'الشهر مقفل'); assert.equal(h.cls('ps-note-info')[0].textContent, 'لا يوجد موظفون');
  assert.equal(h.cls('ps-empty').length, 1); assert.equal(h.getAttribute('role'), null, 'empty is not a live region');
  /* the permission is re-read on every call: a card drawn without the button gains it when the same check turns true */
  const g = el('div'); let ok = false; const s = () => spec(() => ok);
  P.host(g, s()); assert.equal(g.all((x) => x.tagName === 'BUTTON').length, 0); ok = true; P.host(g, s()); assert.equal(g.all((x) => x.tagName === 'BUTTON').length, 1);
});

test('region mode and idempotent re-render', () => {
  const { P, tick } = world(), host = el('div');
  P.host(host, { state: 'error', name: 'مهامك', region: true, retry() {} });
  assert.ok(host.className.split(' ').includes('ps-region'));
  const card = host.cls('ps-card')[0];
  P.host(host, { state: 'error', name: 'مهامك', region: true, retry() {} });
  assert.equal(host.cls('ps-card')[0], card, 'same description ⇒ the DOM is not rebuilt');
  P.host(host, { state: 'loading', region: true }); tick(300); assert.equal(host.cls('ps-skel').length, 1);
});

test('reduced motion: no entrance class from script, and the stylesheet stops every animation', () => {
  const { P, tick } = world({ reduce: true }), host = el('div'), content = el('div');
  P.host(host, { state: 'loading', content }); tick(300); P.host(host, { state: 'ready', content });
  assert.equal(content.classList.contains('ps-enter'), false);
  assert.equal(P.enter(content), false);
  const rm = /@media \(prefers-reduced-motion:reduce\)\{([\s\S]*?)\n\}/.exec(CSS);
  assert.ok(rm, 'reduced-motion block'); for (const s of ['.ps-skel', '.ps-bone', '.ps-line::after', '.ps-enter']) assert.ok(rm[1].includes(s), s);
  assert.match(rm[1], /animation:none !important/);
});

test('one strings table; no device storage; theme variables only; 44 px targets; hidden in print', () => {
  const { P } = world();
  assert.deepEqual(Object.keys(P.STR).sort(), ['emptyTitle', 'failLine', 'failName', 'failTitle', 'loading', 'refreshing', 'retry', 'stale']);
  assert.equal(P.STR.failTitle, 'تعذّر تحميل {name}'); assert.equal(P.STR.retry, 'أعد المحاولة'); assert.equal(P.STR.refreshing, 'يُحدَّث من الخادم');
  assert.equal(P.DELAY, 300);
  /* every Arabic literal of the component outside comments lives in STR or in the name overrides */
  const code = SRC.replace(/\/\*[\s\S]*?\*\//g, ''), table = code.slice(code.indexOf('var STR = {'), code.indexOf('var live'));
  assert.doesNotMatch(code.replace(table, ''), /[؀-ۿ]/, 'Arabic text outside the tables');
  assert.doesNotMatch(code, /localStorage|sessionStorage|indexedDB|IndexedDB|innerHTML|document\.cookie/);
  assert.doesNotMatch(CSS.replace(/\/\*[\s\S]*?\*\//g, ''), /#[0-9a-fA-F]{3,8}\b|rgba?\(/, 'colours come from theme variables only');
  assert.match(CSS, /\.ps-btn\{min-height:44px;min-width:44px/); assert.match(CSS, /\.ps-bar > button\{[^}]*min-height:44px/);
  assert.match(CSS, /@media print\{\.ps,\.ps-bar,\.ps-shell\{display:none !important\}\}/);
  assert.match(CSS, /\.ps-empty\{background:var\(--brand-pattern\)/, 'the eight-pointed star behind the empty card');
  assert.match(CSS, /\.ps-line\{[^}]*height:3px/); assert.match(CSS, /\.ps-line::after\{[^}]*background:var\(--brand-primary\)/);
  assert.match(CSS, /\.ps-enter\{animation:ps-in \.4s/); assert.match(CSS, /translateY\(8px\)/);
  assert.match(CSS, /tr:nth-child\(-n\+10\)/); assert.match(CSS, /tr:nth-child\(2\)\{animation-delay:50ms\}/); assert.doesNotMatch(CSS, /tr:nth-child\(11\)/);
});

test('names come from the pages manifest: the open tab, else the page; written overrides; nested screens keep their own name', () => {
  const { P } = world(), d = (c, h) => { const x = P.describe(c, h); assert.deepEqual(Object.keys(x), ['name'], 'a description is a name — no shape'); return x.name; };
  assert.equal(d('Staffing', '#/staffing'), 'الجدول الشهري');
  assert.equal(d('Operational Plan', '#/plan'), 'التشغيل الميداني');
  assert.equal(d('Employees', '#/employees/custody'), 'عهد الموظفين');
  assert.equal(d('Employees', '#/employees'), 'بيانات الموظفين', 'owner-approved override (was «موظفو الإدارة»)');
  assert.equal(d('Planning', '#/planning'), 'الخطة التشغيلية');
  assert.equal(d('Staffing', '#/planning'), 'الجدول الشهري', 'a page embedded in a container is named by itself');
  assert.equal(d('Seized', '#/kpis/dash'), 'لوحة مؤشرات المضبوطات', 'a KPI panel takes its container name');
  assert.equal(d('Seized', '#/seized/records'), 'سجلات المضبوطات', 'override');
  assert.equal(d('Award', '#/award/new'), 'الترشيحات', 'override: the loaded thing is the nominations');
  assert.equal(d('Award', '#/award/res'), 'نتائج الترشيحات');
  assert.equal(d('Award', '#/award/doc'), 'المراجع المعتمدة', 'no override ⇒ the tab name');
  assert.equal(d('Admin', '#/admin/oplog'), 'سجل الحركة');
  assert.equal(d('Admin', '#/sysadmin/depts'), 'مركز إدارة رشاد', 'a route with no page of its own ⇒ the route name');
  assert.equal(d('Profile', '#/profile'), 'صفحتك', 'owner-approved override (was «صفحتي»)');
  assert.equal(d('KPIs', '#/kpis'), 'مؤشرات الإدارة');
  assert.equal(d('Unknown', '#/nowhere'), '');
});

test('owner-approved names (12 Nov): irshad, employees, import, profile, the two mosques; custody stays «عهد الموظفين»', () => {
  const { P } = world(), n = (c, h) => P.describe(c, h).name;
  assert.equal(n('Irshad', '#/irshad'), 'سجلات الاسترشاد');
  assert.equal(n('Irshad', '#/irshad/records'), 'سجلات الاسترشاد');
  assert.equal(n('Employees', '#/employees'), 'بيانات الموظفين');
  assert.equal(n('Employees', '#/employees/custody'), 'عهد الموظفين', 'not shortened to «العهد»');
  assert.equal(n('Admin', '#/admin/import'), 'صفحة الاستيراد');
  assert.equal(n('Profile', '#/profile'), 'صفحتك');
  assert.equal(n('Daily Stats', '#/dstats/haram'), 'إحصائيات المسجد الحرام');
  assert.equal(n('Daily Stats', '#/dstats/nabawi'), 'إحصائيات المسجد النبوي');
});

test('shell gate hook: skeleton after 300 ms in the screen place, the failure card with the core retry, calm entrance when the place leaves', () => {
  const { KIVO, tick } = world({ hash: '#/staffing' }), G = KIVO.__dcStates, hostEl = el('div'), ph = el('div'), box = el('div');
  hostEl.appendChild(ph); ph.appendChild(box); box.closest = () => hostEl; let n = 0;
  G.draw(box, { name: 'Staffing', retry: () => { n++; } });
  assert.equal(box.getAttribute('data-ps'), 'loading'); tick(300); assert.equal(box.cls('ps-skel').length, 1); assert.equal(box.cls('ps-row').length, 6);
  G.draw(null, { name: 'Staffing' }); tick(0); assert.equal(hostEl.classList.contains('ps-enter'), false, 'a re-render (ref detach + attach) is not a departure');
  G.draw(box, { name: 'Staffing', failed: true, retry: () => { n++; } });
  assert.equal(box.cls('ps-title')[0].textContent, 'تعذّر تحميل الجدول الشهري');
  box.all((x) => x.tagName === 'BUTTON')[0].click(); assert.equal(n, 1);
  G.draw(box, { name: 'Staffing', retry() {} }); tick(300);
  box.isConnected = false; G.draw(null, { name: 'Staffing' }); tick(0);
  assert.equal(hostEl.classList.contains('ps-enter'), true, 'the content enters calmly after a shown skeleton');
  /* session end and scope messages stay outside: idle ⇒ the component draws nothing */
  const b2 = el('div'); b2.closest = () => hostEl; G.draw(b2, { name: 'Staffing', idle: true }); tick(400); assert.equal(b2.childNodes.length, 0); assert.equal(b2.hidden, true);
});

/* ── step 3 · the core side of the gate: the lazy guard declares the failure in the registry and keeps only the session card ── */
const GUARD = read('src/core/030-pages-loader.lazy-guard.js'), RUNTIME = read('src/core/050-dc-runtime.js');
function guardWorld({ hook = true } = {}) {
  const L = {}, inserted = [], state = { gone: false, bumps: 0, reloaded: 0 };
  const card = () => { const k = { m: { textContent: '' }, b: { textContent: '', addEventListener() {} } }; return { setAttribute() {}, remove() { this.removed = true; },
    set innerHTML(html) { k.m.textContent = (/class="m">([^<]*)/.exec(html) || [])[1] || ''; }, querySelector: (s) => s === '.m' ? k.m : k.b }; };
  const reg = { Staffing: { html: '<x/>', Logic: null, dataError: 'x', fetched: true, subs: new Set([() => { state.bumps++; }]), ver: 0 } };
  const win = { __resources: {}, fetch: async () => ({ ok: true }), __dcRegistry: reg, KIVO: { __BS_SRV: { sesChanged: () => state.gone } },
    addEventListener(t, f) { (L[t] ||= []).push(f); }, fire(t, detail) { (L[t] || []).forEach((f) => f({ detail })); } };
  if (hook) win.KIVO.__dcStates = { draw() {} };
  vm.runInNewContext(GUARD, { window: win, document: { createElement: card, querySelector: (s) => /sc-host/.test(s) ? { parentNode: { insertBefore(c) { inserted.push(c); } } } : null },
    location: { reload() { state.reloaded++; } }, setTimeout: () => 0, setInterval: () => 0, clearInterval() {}, Object, JSON, Math });
  return { win, reg: reg.Staffing, inserted, state };
}
test('lazy guard: with the component registered a load failure is declared in the registry (no old bar); retry and success clear it; a session end takes the old card', () => {
  const W = guardWorld();
  W.win.fire('dc:page-load-failed', { name: 'Staffing' });
  assert.equal(W.inserted.length, 0, 'no old red bar'); assert.equal(W.reg.loadFailed, true); assert.equal(W.state.bumps, 1, 'the screen is redrawn once');
  W.win.fire('dc:page-load-failed', { name: 'Staffing' }); assert.equal(W.state.bumps, 1, 'declaring it again does not redraw');
  assert.equal(typeof W.win.KIVO.__dcRetry, 'function');
  W.win.KIVO.__dcRetry('Staffing');
  assert.equal(W.reg.loadFailed, false); assert.equal(W.reg.dataError, null, 'the retry is the old button: it wakes the read'); assert.equal(W.reg.fetched, false);
  W.reg.dataError = 'x'; W.win.fire('dc:page-load-failed', { name: 'Staffing' }); assert.equal(W.reg.loadFailed, true);
  W.win.fire('dc:page-load-ready', { name: 'Staffing' }); assert.equal(W.reg.loadFailed, false, 'a successful load clears it');
  /* session ended while the unified card is shown ⇒ it steps aside for the sign-in card (outside the component) */
  W.reg.dataError = 'x'; W.win.fire('dc:page-load-failed', { name: 'Staffing' }); W.state.gone = true; W.win.fire('bs:session-gone');
  assert.equal(W.reg.loadFailed, false); assert.equal(W.inserted.length, 1); assert.equal(W.inserted[0].querySelector('.m').textContent, 'انتهت الجلسة — سجّل الدخول');
  W.win.KIVO.__dcRetry('Staffing'); assert.equal(W.state.reloaded, 1, 'after a session end the retry signs in again');
  /* without the component everything is as before */
  const O = guardWorld({ hook: false }); O.win.fire('dc:page-load-failed', { name: 'Staffing' });
  assert.equal(O.inserted.length, 1); assert.equal(O.inserted[0].querySelector('.m').textContent, 'تعذّر عرض هذه الشاشة الآن — سنحاول مجددًا تلقائيًا'); assert.ok(!O.reg.loadFailed);
});
test('runtime placeholder: core owns the hook, draws the place through it, and keeps its own text for everything that is not a load failure', () => {
  assert.match(RUNTIME, /KIVO\.__dcStates = KIVO\.__dcStates \|\| null;/, 'the hook is defined by core (deps R1)');
  const body = RUNTIME.slice(RUNTIME.indexOf('function Placeholder({'), RUNTIME.indexOf('function hintToMin'));
  const run = (hook, props) => { const calls = []; const h = (type, p, ...kids) => ({ type, props: p || {}, kids: kids.filter(Boolean) });
    const P = vm.runInNewContext('(' + body.trim() + ')', { h, KIVO: hook ? { __dcStates: { draw: (el, info) => calls.push([el, info]) } } : {} });
    const tree = P(props); tree.kids.forEach((k) => { if (k.props.ref) k.props.ref('EL'); }); return { tree, calls }; };
  let r = run(true, { name: 'Staffing', hintSize: '100%,1300px' });
  assert.equal(r.tree.kids.length, 1); assert.equal(r.tree.kids[0].props.className, 'sc-ps'); assert.equal(r.calls[0][0], 'EL');
  assert.equal(r.calls[0][1].name, 'Staffing'); assert.equal(r.calls[0][1].failed, false); assert.equal(r.calls[0][1].idle, false);
  r = run(true, { name: 'Staffing', error: 'تعذّر عرض هذه الشاشة الآن', failed: true });
  assert.deepEqual(r.tree.kids.map((k) => k.props.className), ['sc-ps'], 'a load failure: the component card alone, no placeholder text'); assert.equal(r.calls[0][1].failed, true);
  r = run(true, { name: 'Staffing', error: 'انتهت الجلسة — سجّل الدخول', failed: false });
  assert.deepEqual(r.tree.kids.map((k) => k.props.className), ['sc-placeholder-error', 'sc-ps'], 'session end: the text stays'); assert.equal(r.calls[0][1].idle, true, 'and the component draws nothing');
  r = run(true, { name: '', error: 'اختر إدارة متاحة لحسابك' });
  assert.deepEqual(r.tree.kids.map((k) => k.props.className), ['sc-placeholder-error'], 'department-context messages stay outside the component');
  r = run(false, { name: 'Staffing', error: 'تعذّر عرض هذه الشاشة الآن', failed: true });
  assert.deepEqual(r.tree.kids.map((k) => k.props.className), ['sc-placeholder-error'], 'no component registered ⇒ exactly the old placeholder');
});

test('page option: a page names itself and the component takes its name and «what follows the host» as content from the manifest', () => {
  const { P, tick } = world({ hash: '#/award/res' }), parent = el('div'), host = el('div'), a = el('div'), b = el('div');
  [host, a, b].forEach((x) => parent.appendChild(x));
  Object.defineProperty(host, 'nextElementSibling', { get: () => a }); Object.defineProperty(a, 'nextElementSibling', { get: () => b }); b.nextElementSibling = null;
  P.host(host, { page: 'Award', state: 'loading' }); tick(300);
  assert.equal(host.cls('ps-skel').length, 1); assert.equal(host.cls('ps-row').length, 6);
  P.host(host, { page: 'Award', state: 'ready' });
  assert.equal(a.classList.contains('ps-enter'), true); assert.equal(b.classList.contains('ps-enter'), true, 'everything after the host enters calmly');
  P.host(host, { page: 'Award', state: 'error', retry() {} }); assert.equal(host.cls('ps-title')[0].textContent, 'تعذّر تحميل نتائج الترشيحات');
  P.host(host, { page: undefined, state: 'error', name: 'س' }); assert.equal(host.cls('ps-title')[0].textContent, 'تعذّر تحميل س', 'an explicit name wins');
  const keep = el('div'); keep.className = 'page-own'; P.host(keep, { state: 'refreshing' }); assert.ok(keep.className.split(' ').includes('page-own'), 'the host keeps its own classes');
});

test('header tabs of a route come from the pages manifest: the leaves that open in the page, in order; the open one marked; fewer than two = no strip', () => {
  const { P, KIVO } = world(), names = (h) => Array.from(P.tabs(h), (t) => (t.on ? '*' : '') + t.name);
  assert.deepEqual(names('#/award/res'), ['*لوحة النتائج', 'ترشيح جديد', 'المراجع المعتمدة'], 'the order is the page strip\'s own (pageTabs); a tab the strip does not list keeps its place after them');
  assert.deepEqual(names('#/award'), ['*لوحة النتائج', 'ترشيح جديد', 'المراجع المعتمدة'], 'no tab in the address ⇒ the first drawn');
  assert.deepEqual(names('#/employees/custody'), ['بيانات الموظفين', '*عهد الموظفين', 'مستودع العهد'], 'the display-only tab (shellTabs) shows with its leaf');
  assert.deepEqual(names('#/seized/records'), [], 'the dashboard leaf lives outside the page ⇒ one tab ⇒ no strip');
  assert.deepEqual(names('#/staffing'), []); assert.deepEqual(names('#/nowhere'), []);
  assert.deepEqual(names('#/kpis'), ['*لوحة مؤشرات المضبوطات', 'مؤشرات الجدول'], 'a container shows its references');
  /* only what the viewer may open: the existing permission checks are asked, nothing new is decided here */
  KIVO.BassamPerm = { can: () => true, canSub: (page, leaf) => !(page === 'award' && leaf === 'doc'), kpiPanelOk: (page) => page === 'seized' };
  assert.deepEqual(names('#/award/new'), ['لوحة النتائج', '*ترشيح جديد']);
  /* the store tab follows the custody leaf through the check the page itself uses (BassamPerm.subOn) — no permission of its own */
  KIVO.BassamPerm = { can: () => true, subOn: (page, leaf) => !(page === 'emps' && leaf === 'custody') };
  assert.deepEqual(names('#/employees'), [], 'custody off ⇒ neither custody nor the store ⇒ one tab ⇒ no strip');
  KIVO.BassamPerm = { can: () => true, subOn: () => true, kpiPanelOk: (page) => page === 'seized' };
  assert.deepEqual(names('#/employees/data'), ['*بيانات الموظفين', 'عهد الموظفين', 'مستودع العهد']);
  assert.deepEqual(names('#/kpis'), [], 'one permitted panel ⇒ no strip');
});

test('the shell rule keeps to memory and counts reads only: no storage API, timer requests left out, the fetch promise returned as it is', () => {
  const code = SRC.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const api of ['localStorage', 'sessionStorage', 'indexedDB', 'caches.', 'document.cookie']) assert.equal(code.includes(api), false, api);
  assert.match(code, /var TIMER = \/\^\\\/api\\\/\(\?:changes\|presence\|notifications\|get\)/);
  assert.match(code, /var p = plain\.apply\(this, arguments\);[\s\S]*?return p;/, 'the same promise goes back to the caller');
  assert.equal(/plain\.(?:call|apply)\(/g.exec(code) && code.match(/plain\.(?:call|apply)\(/g).length, 1, 'one pass-through call, no second request');
  const { P } = world(); assert.equal(P.QUIET, 100);
});

test('header tab icons are the page\'s own: the icon body of each tab from the build-time strip of the page view; a looped strip gives one icon to all', () => {
  const { P } = world(), icons = (h) => Array.from(P.tabs(h), (t) => t.icon);
  assert.deepEqual(icons('#/employees'), ['<path d="M1"></path>', '<path d="M2"></path>', '<path d="M3"></path>']);
  assert.deepEqual(icons('#/award'), ['<path d="M5"></path>', '<path d="M4"></path>', ''], 'a tab the page strip does not list has no icon (the generator test keeps the real manifest complete)');
  assert.deepEqual(icons('#/kpis'), ['<path d="M9"></path>', '<path d="M9"></path>']);
});

test('the real manifest: every tab of every route has the icon of the page strip it was read from; the store tab is display-only', () => {
  const block = read('src/manifests/255-page-manifest.js'), M = JSON.parse(block.slice(block.lastIndexOf('})(') + 3, block.lastIndexOf(');')));
  const KIVO = {}, window = { location: { hash: '' }, addEventListener() {}, matchMedia: () => ({ matches: false }) };
  KIVO.KIVO_MANIFEST = { keys: Object.keys(M), clone: (k) => JSON.parse(JSON.stringify(M[k])) };
  vm.runInNewContext(SRC, { window, KIVO, document: { createElement: el, addEventListener() {}, querySelector: () => null, readyState: 'complete' }, JSON, Date, setTimeout: () => 0, clearTimeout() {} });
  const catalog = JSON.parse(read('src/assets/icons/catalog.json')).icons; let strips = 0;
  for (const nav of Object.keys(M.routeNames)) {
    const page = M.pages.find((p) => p.nav === nav), slug = (page && page.module) || nav, view = fs.existsSync(new URL('../../src/modules/' + slug + '/view.html', import.meta.url)) ? read('src/modules/' + slug + '/view.html') : '';
    const tabs = Array.from(KIVO.PageStates.tabs('#/' + nav)); if (!tabs.length) continue; strips++;
    for (const t of tabs) {
      /* the page view: the label inside its tab strip, and the icon reference right before it */
      const looped = /bs-tabstrip[\s\S]{0,400}<sc-for/.test(view), m = looped ? /bs-tabstrip[\s\S]*?data-i="(i-[0-9a-f]{8})"/.exec(view) : new RegExp('data-i="(i-[0-9a-f]{8})"></svg>\\s*</div>\\s*<span[^>]*>' + t.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '</span>').exec(view);
      assert.ok(m, nav + ': «' + t.name + '» is a tab the page view draws');
      assert.equal(t.icon, catalog[m[1]].body, nav + ': «' + t.name + '» carries the page\'s icon ' + m[1]);
    }
  }
  assert.ok(strips >= 7, 'routes with a strip: ' + strips);
  assert.deepEqual(Array.from(KIVO.PageStates.tabs('#/employees'), (t) => t.name), ['بيانات الموظفين', 'عهد الموظفين', 'مستودع العهد']);
  const emps = M.pages.find((p) => p.key === 'emps');
  assert.deepEqual(emps.shellTabs, [{ name: 'مستودع العهد', as: 'custody' }]); assert.deepEqual(emps.subs.map((x) => x.key), ['data', 'custody'], 'not a leaf: the page\'s subs are as they were');
});

test('stale: the content is not touched; a strip with the fixed sentence and one retry; retried once on `online`', () => {
  const { P, window } = world(), host = el('div'), content = el('div'); let n = 0;
  P.host(host, { state: 'stale', retry: () => { n++; }, content });
  assert.equal(host.hidden, false); assert.equal(host.getAttribute('data-ps'), 'stale');
  const bar = host.cls('ps-stale')[0]; assert.ok(bar, 'the strip'); assert.equal(bar.getAttribute('role'), 'alert');
  assert.equal(bar.childNodes[0].textContent, 'تعذّر التحديث — المعروض قد لا يكون الأحدث'); assert.equal(P.STR.stale, 'تعذّر التحديث — المعروض قد لا يكون الأحدث');
  const buttons = host.all((x) => x.tagName === 'BUTTON'); assert.equal(buttons.length, 1); assert.equal(buttons[0].textContent, 'أعد المحاولة');
  assert.equal(host.cls('ps-card').length, 0, 'no failure card'); assert.equal(host.cls('ps-skel').length, 0);
  assert.equal(content.getAttribute('aria-busy'), null); assert.equal(content.hidden, false);
  buttons[0].click(); assert.equal(n, 1); window.fire('online'); assert.equal(n, 2, 'auto-recover on online, as the card');
  P.host(host, { state: 'ready', retry: () => { n++; } }); window.fire('online'); assert.equal(n, 2, 'not after it left the state');
});

test('session memory is capped: the most recently left routes keep their content, older ones fall back to the skeleton rule', () => {
  const { P } = world(), map = {}; for (let i = 1; i <= 25; i++) map['#/r' + i] = { snap: { id: i }, at: i };
  map['#/alias'] = map['#/r25'];
  assert.equal(P.trim(map, 20), 25, 'distinct kept contents before the cut (an alias is the same record)');
  const kept = Object.keys(map).filter((k) => map[k].snap).sort();
  assert.equal(kept.length, 21); assert.equal(map['#/r5'].snap, null, 'the oldest five are dropped'); assert.ok(map['#/r6'].snap); assert.ok(map['#/alias'].snap);
  assert.match(SRC, /KEEP = 20/);
});
