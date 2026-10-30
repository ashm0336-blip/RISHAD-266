/* الفحص العميق 2026-10-21 · الموجة 1 «وميض التحديث» (R2 · ES-2 · R5 · R3 · KD-03 · IRSZ-6 · DG-14 · PLAN-11) — بلاغُ المالك:
   «عند تحديث الصفحة في التابلت والجوال … تظهر بيانات في لحظة وبعدين تختفي».
   يُثبت هنا على المنطق الحقيقيّ (src/layouts/root-logic.js و src/core/050-dc-runtime.js) داخل vm وببياناتٍ اصطناعية (TEST_ONLY):
     · الحالةُ المحفوظة (sessionStorage bsview:<dept>) تُزرع في منطق المكوّن لحظةَ إنشائه (__makeLogic ← KIVO.__bsViewSeed) فأوّلُ رسمٍ
       هو الشهرُ/التبويبُ/اليومُ المحفوظ نفسُه — لا setState بعد التركيب. المفتاحُ اسمُ المكوّن في السجل (لا data-screen-label).
     · الزرعُ يقبل القائمةَ البيضاء وحدها، والمفتاحَ الموجودَ في الحالة الأولى ومن نوعها، مرةً لكل مكوّنٍ في كل زيارة، والنسخُ solo بمفتاحها.
     · التمريرُ يُستعاد مرةً ولا يُفرض بعد لمسة المستخدم أو تمريره (R5).
     · خلفيةُ التطبيق بسمتها من أوّل بايت وهيكلُ الإقلاع (R3). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { SRC } from './harness.mjs';

const rd = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');
const J = (o) => JSON.parse(JSON.stringify(o));
/* نصُّ دالةٍ من الصنف بمطابقة الأقواس (المسافةُ البادئة تُعطى) — يُشغَّل على كائنٍ بديل */
function method(src, head, ind = '  ') {
  const i = src.indexOf('\n' + ind + head); assert.ok(i > 0, head + ' موجودة');
  let j = src.indexOf('{', i + ind.length + head.length - 1), d = 0;
  for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && --d === 0) { j = k + 1; break; } }
  return 'function ' + src.slice(i + 1 + ind.length, j).replace(/^[A-Za-z_$][\w$]*\s*\(/, '(');
}
class FakeStorage { constructor() { this.m = new Map(); } getItem(k) { return this.m.has(k) ? this.m.get(k) : null; } setItem(k, v) { this.m.set(k, String(v)); } removeItem(k) { this.m.delete(k); } }

/* إطارُ التطبيق الحقيقيّ (root-logic) في vm: إدارةٌ اصطناعية tst_d1 · مؤقّتاتٌ وإطاراتٌ يدوية · نافذةٌ بتمريرٍ قابلٍ للضبط */
function root(o = {}) {
  const KIVO = {}, timers = [], frames = [], listeners = {}, scrolls = [];
  const win = { scrollY: 0, innerHeight: 800 };
  const ctx = {
    KIVO, console, JSON, Object, Array, String, Number, Math, Date, RegExp, Set, Map, Error, Promise,
    localStorage: new FakeStorage(), sessionStorage: o.ss || new FakeStorage(),
    location: { hash: o.hash || '#/staffing', pathname: '/', search: '' }, history: { replaceState() {}, pushState() {} },
    document: { documentElement: { scrollHeight: o.height || 5000 }, querySelectorAll: () => [], getElementById: () => null, addEventListener() {}, removeEventListener() {}, hidden: false },
    setTimeout: (f, ms) => { timers.push({ f, ms: ms || 0 }); return timers.length; }, clearTimeout() {},
    requestAnimationFrame: (f) => { frames.push(f); return frames.length; },
    addEventListener: (n, f) => { (listeners[n] = listeners[n] || []).push(f); }, removeEventListener: (n, f) => { listeners[n] = (listeners[n] || []).filter((x) => x !== f); },
    scrollTo: (x, y) => { scrolls.push(y); win.scrollY = y; },
  };
  Object.defineProperty(ctx, 'scrollY', { get: () => win.scrollY });
  Object.defineProperty(ctx, 'innerHeight', { get: () => win.innerHeight });
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  KIVO.BassamDepts = { active: () => 'tst_d1' };
  KIVO.BassamAuth = { isSuper: () => false };
  KIVO.BassamPerm = { NAV2PERM: { staffing: 'staff', employees: 'emps', tasks: 'tasks', dstats: 'dstats', irshad: 'irshad', planning: 'planning', daily: 'daily' }, can: () => true };
  class DCLogic { constructor(props) { this.props = props || {}; this.state = {}; } setState(p) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); } }
  ctx.DCLogic = DCLogic;
  vm.runInContext(rd('layouts/root-logic.js') + '\n;globalThis.__C = Component;', ctx, { filename: 'root-logic.js' });
  const c = new ctx.__C();
  const step = () => { const f = frames.splice(0); f.forEach((x) => x()); };
  const tick = (ms) => { const due = timers.filter((t) => t.ms <= ms); for (const t of due) { timers.splice(timers.indexOf(t), 1); t.f(); } };
  const fire = (n) => (listeners[n] || []).slice().forEach((f) => f({ type: n }));
  return { c, KIVO, ctx, win, scrolls, step, tick, fire, timers, frames, listeners };
}
const saved = (ss, rec) => ss.setItem('bsview:tst_d1', JSON.stringify(rec));
/* منطقُ صفحةٍ اصطناعيّ بحالةٍ أولى كما يبنيها المنشئ */
const pageLogic = (state, props) => ({ props: props || {}, state: Object.assign({}, state), setState() { throw new Error('لا setState في الزرع'); } });

test('الزرع: الشهرُ المحفوظ يُكتب في منطق «الجدول الشهري» لحظةَ إنشائه (قبل أوّل رسم) — بمفتاح اسم المكوّن لا التسمية', () => {
  const ss = new FakeStorage();
  saved(ss, { staffing: { v: 2, y: 0, at: 1, comps: { Staffing: { year: 1448, month: 4, sub: 'list' } } } });
  const R = root({ ss, hash: '#/staffing' });
  assert.equal(R.c.state.active, 'staffing');
  assert.equal(typeof R.KIVO.__bsViewSeed, 'function', 'الإطارُ يسجّل الزارع عند إنشائه');
  const L = pageLogic({ year: 1448, month: 5, sub: 'list', page: 1 });
  R.KIVO.__bsViewSeed('Staffing', L, {});
  assert.deepEqual(J(L.state), { year: 1448, month: 4, sub: 'list', page: 1 }, 'الشهرُ المحفوظ في الحالة الأولى نفسِها');
  assert.deepEqual(J(L.__bsSeeded), { month: 4 }, 'ما تغيّر فقط (تقرؤه الصفحة لتكتب تبويبَها في العنوان)');
});

test('الزرع: القائمةُ البيضاء وحدها · المفتاحُ موجودٌ في الحالة الأولى ومن نوعها · لا كائنات ولا نصوصٌ طويلة', () => {
  const ss = new FakeStorage();
  saved(ss, { dstats: { v: 2, comps: { 'Daily Stats': { site: 'nabawi', year: 1448, month: 3, day: 'x', draft: 'TEST_ONLY', lgOpen: true, extra: 1, page: 2 } } } });
  const R = root({ ss, hash: '#/dstats' });
  const L = pageLogic({ site: 'haram', year: 0, month: 0, day: 0, draft: null, lgOpen: false, page: 1 });
  R.KIVO.__bsViewSeed('Daily Stats', L, {});
  assert.deepEqual(J(L.state), { site: 'nabawi', year: 1448, month: 3, day: 0, draft: null, lgOpen: false, page: 2 },
    'المسجدُ (KD-03) والسنةُ والشهرُ والصفحة تُزرع · اليومُ بنوعٍ مختلف لا · draft/lgOpen خارج القائمة · extra ليس في الحالة');
  const K = (k, v) => R.c._viewKeep(k, v);
  for (const k of ['site', 'sub', 'tkDayK', 'tkDayD', 'irYear', 'irMonth', 'irDay', 'irLedgerOpen', 'irLedgerPage', 'irLedgerPerPage', 'irDashYear', 'irDashMonth', 'irDashMode', 'ptab', 'empTab', 'rpD'])
    assert.equal(K(k, k === 'irLedgerOpen' ? true : 1), true, k + ' في القائمة البيضاء');
  assert.equal(K('tkDaySel', { k: '1448-5', d: 0 }), false, 'الكائنُ لا يُحفظ');
  assert.equal(K('month', null), false);
  assert.equal(K('sub', 'x'.repeat(61)), false, 'نصٌّ أطولُ من 60 لا يُحفظ');
  assert.equal(K('irDraft', 'TEST_ONLY'), false);
});

test('الزرع: مرةً لكل مكوّنٍ في كل زيارة — ما يُركَّب من جديدٍ أثناءها يبدأ بافتراضه · وزيارةٌ جديدة تزرع من جديد', () => {
  const ss = new FakeStorage();
  saved(ss, { staffing: { v: 2, comps: { Staffing: { month: 4 } } }, tasks: { v: 2, comps: { Tasks: { month: 3, sub: 'kanban' } } } });
  const R = root({ ss, hash: '#/staffing' });
  /* مراجعةُ التكامل W1-R4: الزرعُ يُستهلك عند إيداع المضيف (الاستهلاكُ الذي يعيده الزارع) لا عند الإنشاء — tests/unit/refresh_seed_commit_w1fix */
  const a = pageLogic({ month: 5 }), ca = R.KIVO.__bsViewSeed('Staffing', a, {}); assert.equal(a.state.month, 4);
  assert.equal(typeof ca, 'function', 'الزارعُ يعيد استهلاكاً يناديه المضيفُ عند إيداعه'); ca();
  const b = pageLogic({ month: 5 }); R.KIVO.__bsViewSeed('Staffing', b, {}); assert.equal(b.state.month, 5, 'إعادةُ تركيبٍ في الزيارة نفسِها: بلا زرع');
  R.c.state = Object.assign({}, R.c.state, { active: 'tasks' });
  const t = pageLogic({ month: 5, sub: 'list' }); R.KIVO.__bsViewSeed('Tasks', t, {});
  assert.deepEqual(J(t.state), { month: 3, sub: 'kanban' }, 'عرضُ المهام (kanban) يعود (DG-14)');
  R.c.state = Object.assign({}, R.c.state, { active: 'staffing' });
  const d = pageLogic({ month: 5 }); R.KIVO.__bsViewSeed('Staffing', d, {}); assert.equal(d.state.month, 4, 'العودةُ إلى الصفحة زيارةٌ جديدة');
  assert.match(rd('layouts/root-logic.js'), /if \(this\._viewLastActive !== this\.state\.active\) \{ const pg = this\.state\.active; this\._viewLastActive = pg; this\._seedUsed = null;/,
    'الإطارُ يصفّر سجلَّ الزرع في renderVals عند تبدّل الصفحة (قبل إنشاء مكوّناتها)');
});

test('الزرع: النسخةُ solo بمفتاحها (اسمٌ#ورقة) فلا تأخذ حالةَ الصفحة ولا العكس · وإطارُ التطبيق نفسُه لا يُزرع', () => {
  const ss = new FakeStorage();
  saved(ss, { planning: { v: 2, comps: { Employees: { empTab: 'custody' }, 'Employees#readiness': { empTab: 'data', page: 3 }, Planning: { ptab: 'plan' } } } });
  const R = root({ ss, hash: '#/planning' });
  const solo = pageLogic({ empTab: 'data', page: 1 }, { solo: 'readiness' }); R.KIVO.__bsViewSeed('Employees', solo, { solo: 'readiness' });
  assert.deepEqual(J(solo.state), { empTab: 'data', page: 3 }, 'النسخةُ المضمَّنة بسجلّها هي');
  const main = pageLogic({ empTab: 'data', page: 1 }); R.KIVO.__bsViewSeed('Employees', main, {});
  assert.equal(main.state.empTab, 'custody');
  const pl = pageLogic({ ptab: null, planSeen: false }); R.KIVO.__bsViewSeed('Planning', pl, {});
  assert.deepEqual(J(pl.state), { ptab: 'plan', planSeen: false }, 'تبويبُ «الخطة التشغيلية» (PLAN-11): كان يتصادم مع «التشغيل الميداني» بالتسمية نفسِها');
  const before = J(R.c.state); R.KIVO.__bsViewSeed('Root', R.c, {}); assert.deepEqual(J(R.c.state), before, 'الإطارُ لا يزرع نفسَه');
});

test('الزرع: سجلٌّ قديم (قبل v2) بمفتاح التسمية يُقرأ لإصدارٍ واحد عبر labelOf — ولا يُقرأ للنسخ solo', () => {
  const ss = new FakeStorage();
  saved(ss, { staffing: { y: 0, at: 1, comps: { 'الجدول الشهري': { month: 2 } } } });
  const R = root({ ss, hash: '#/staffing' });
  const L = pageLogic({ month: 5 }); R.KIVO.__bsViewSeed('Staffing', L, {}, () => 'الجدول الشهري');
  assert.equal(L.state.month, 2);
  const S = pageLogic({ month: 5 }); R.KIVO.__bsViewSeed('Staffing', S, { solo: 'x' }, () => 'الجدول الشهري');
  assert.equal(S.state.month, 5);
});

test('الالتقاط: السجلُّ v2 بمفاتيح أسماء المكوّنات (والنسخُ solo باسمها#ورقتها) وموضعُ التمرير', () => {
  const ss = new FakeStorage();
  const R = root({ ss, hash: '#/kpis' });
  R.c.state = Object.assign({}, R.c.state, { active: 'kpis' });
  R.win.scrollY = 420;
  R.c._liveComps = () => [
    { label: 'مؤشرات الإدارة', name: 'KPIs', solo: '', logic: { state: { ktab: 'tasks', tkY: 0, open: { a: 1 } } } },
    { label: 'المتابعة اليومية', name: 'Daily Sessions', solo: 'kpiOcc', logic: { state: { dsTab: 'kpi', year: 1448, draft: 'TEST_ONLY' } } },
    { label: 'بلا اسم', name: '', solo: '', logic: { state: { month: 1 } } },
  ];
  R.c._viewCapture();
  const all = JSON.parse(ss.getItem('bsview:tst_d1'));
  assert.equal(all.kpis.v, 2); assert.equal(all.kpis.y, 420);
  assert.deepEqual(all.kpis.comps, { KPIs: { ktab: 'tasks' }, 'Daily Sessions#kpiOcc': { dsTab: 'kpi', year: 1448 } });
});

test('الاستعادةُ بعد التركيب: التمريرُ وحده — لا setState على مكوّنات الصفحة (كان يرسم الافتراضيَّ ثم يستبدله)', () => {
  const ss = new FakeStorage();
  saved(ss, { staffing: { v: 2, y: 600, at: 7, comps: { Staffing: { month: 4 } } } });
  const R = root({ ss, hash: '#/staffing' });
  let calls = 0;
  R.c._liveComps = () => [{ label: 'الجدول الشهري', name: 'Staffing', solo: '', logic: { state: { month: 5 }, setState: () => { calls++; } } }];
  R.c._viewRestore('staffing', 0);
  R.step(); R.step();
  assert.equal(calls, 0, 'لا setState بعد التركيب');
  assert.deepEqual(R.scrolls, [600], 'الموضعُ يُستعاد');
  const src = rd('layouts/root-logic.js'), body = method(src, '_viewRestore(page, tries) {');
  assert.doesNotMatch(body, /setState/);
  assert.doesNotMatch(src, /_navHash0|_openTabOf/, 'حارسُ «تبويبُ العنوان يغلب» بعد الرسم لم يعد لازماً: _bsHR يطبّقه في أول رسم');
});

test('التمرير (R5): يُطبَّق مرةً ثم يتوقّف · ولا يُفرض بعد لمسة المستخدم أو تمريره · ويُكمل إن لم يكتمل طولُ الصفحة بعد', () => {
  /* 1) بلا تدخّل: يبلغ الموضعَ في الإطار الثاني ولا يعيد فرضه عند 450 و1300 */
  let R = root({ hash: '#/staffing' });
  R.c._viewScrollTo('staffing', 420);
  R.step(); R.step();
  assert.deepEqual(R.scrolls, [420]);
  R.win.scrollY = 0; R.tick(450); R.tick(1300); R.tick(1400);
  assert.deepEqual(R.scrolls, [420], 'بلغ الموضعَ فلا فرضَ بعده (كان يُسحب المستخدمُ إلى 420 مرتين)');
  /* 2) لمسةٌ بعد الاستعادة الأولى لصفحةٍ لم يكتمل طولُها: لا فرضَ بعدها */
  R = root({ hash: '#/staffing', height: 900 });
  R.c._viewScrollTo('staffing', 1200);
  R.step(); R.step();
  assert.deepEqual(R.scrolls, [100], 'الصفحةُ قصيرةٌ بعد: أقصى ما يمكن');
  R.fire('touchstart'); R.ctx.document.documentElement.scrollHeight = 5000;
  R.tick(450); R.tick(1300);
  assert.deepEqual(R.scrolls, [100], 'لمسةُ المستخدم توقف الاستعادة');
  assert.equal((R.listeners.touchstart || []).length, 0, 'المستمعون يُزالون');
  /* 3) تمريرٌ بلا حدثٍ مرصود (انجراف عن آخر موضعٍ ضُبط): يتوقّف */
  R = root({ hash: '#/staffing', height: 900 });
  R.c._viewScrollTo('staffing', 1200);
  R.step(); R.step();
  R.win.scrollY = 0; R.ctx.document.documentElement.scrollHeight = 5000; R.tick(450);
  assert.deepEqual(R.scrolls, [100], 'الموضعُ تغيّر بيد المستخدم: لا فرض');
  /* 4) بلا تدخّل وصفحةٌ يكتمل طولُها لاحقاً: يبلغ الموضعَ عند 450 */
  R = root({ hash: '#/staffing', height: 900 });
  R.c._viewScrollTo('staffing', 1200);
  R.step(); R.step(); R.ctx.document.documentElement.scrollHeight = 5000; R.tick(450); R.tick(1300);
  assert.deepEqual(R.scrolls, [100, 1200]);
});

test('المحرّك: __makeLogic يزرع الحالةَ المحفوظة بعد ربط المضيف وقبل دمج prevState · مرةً للمنطق الحقيقيّ (لا الأساس الفارغ في الوضع الكسول)', () => {
  const src = rd('core/050-dc-runtime.js');
  const body = method(src, '__makeLogic(Logic, prevState) {', '      ');
  const iHost = body.indexOf('this.logic.__host = this;'), iSeed = body.indexOf('KIVO.__bsViewSeed('), iPrev = body.indexOf('if (prevState)');
  assert.ok(iHost > 0 && iSeed > iHost && iPrev > iSeed, 'الترتيب: المضيف ← الزرع ← prevState');
  const calls = [];
  class StreamableLogic { constructor(p) { this.props = p; this.state = {}; } }
  class Page extends StreamableLogic { constructor(p) { super(p); this.state = { month: 5, empTab: 'data' }; } }
  const ctx = { StreamableLogic, console, String, KIVO: { __bsViewSeed: (n, l, p, lb) => { calls.push([n, J(p), lb()]); l.state = Object.assign({}, l.state, { month: 4 }); } },
    registry: { get: () => ({ html: '<div data-screen-label="الجدول الشهري">TEST_ONLY</div>', ver: 1 }) } };
  vm.createContext(ctx);
  const mk = vm.runInContext('(' + body + ')', ctx);
  const host = { __name: 'Staffing', __userProps: () => ({ solo: '' }) };
  mk.call(host, null, null);
  assert.equal(calls.length, 0, 'الأساسُ الفارغ (الصفحةُ لم تُحمَّل بعد) لا يُزرع');
  mk.call(host, Page, host.logic.state);
  assert.equal(calls.length, 1); assert.deepEqual(calls[0], ['Staffing', { solo: '' }, 'الجدول الشهري']);
  assert.equal(host.logic.state.month, 4, 'أوّلُ renderVals يرى الشهرَ المحفوظ');
  host.logic.state.month = 7; mk.call(host, Page, host.logic.state);
  assert.equal(calls.length, 1, 'التبديلُ الحيّ لا يُعيد الزرع'); assert.equal(host.logic.state.month, 7, 'prevState يبقى فوق الزرع');
});

test('R3: خلفيةُ التطبيق بسمتها (فاتح/داكن) في رأس القالب قبل أيّ سكربتٍ في الجسم · وهيكلُ الإقلاع أولُ عناصر الجسم ويزيله الإطار', () => {
  const t = rd('layouts/index.template.html');
  const head = t.slice(0, t.indexOf('</head>')), body = t.slice(t.indexOf('<body>'));
  const m = /<style id="bs-critical">([\s\S]*?)<\/style>/.exec(head);
  assert.ok(m, 'نمطٌ حرجٌ مضمَّن في الرأس');
  assert.match(m[1], /@media screen\{html,body\{background:var\(--bg-app\)\}\}/, 'للشاشة وحدها (W1-R3: الطباعة — tests/unit/print_canvas_w1fix)');
  assert.ok(head.indexOf('@@KIVO_BLOCK:styles/070-theme-tokens.css@@') < m.index && head.indexOf('@@KIVO_BLOCK:styles/080-theme-dark.css@@') < m.index, 'بعد رموز الفاتح والداكن');
  assert.ok(m.index < head.indexOf('@@KIVO_BLOCK:core/110-theme-prepaint.js@@'), 'ومعه ضبطُ السمة قبل الجسم');
  assert.doesNotMatch(m[1], /</, 'لا وسومَ نصّيةً في النمط: parseDcText يأخذ أول وسم x-dc نصّاً');
  assert.equal(t.search(/<x-dc[\s>]/), t.indexOf('<x-dc'), 'أولُ x-dc في القالب هو العنصرُ نفسُه');
  assert.match(body, /^<body>\n<div id="bs-boot" aria-hidden="true"><div class="bs-boot-bar"><\/div><div class="bs-boot-msg">جارٍ التحميل…<\/div><\/div>\n/);
  assert.match(m[1], /#bs-boot\{position:fixed;inset:0;[^}]*background:var\(--bg-app\)[^}]*pointer-events:none\}/);
  assert.match(m[1], /#bs-boot \.bs-boot-bar\{height:81px;background:var\(--bg-header\);border-bottom:1px solid var\(--border-subtle\)\}/, 'بارتفاع الشريط العلوي نفسِه');
  assert.match(m[1], /@media \(max-width:640px\)\{#bs-boot \.bs-boot-bar\{height:64px\}\}/);
  assert.match(rd('styles/070-theme-tokens.css'), /--bg-app:var\(--p-f2f0eb\)/, 'بيجُ الفاتح');
  assert.match(rd('styles/080-theme-dark.css'), /html\[data-theme="dark"\]\{[^}]*--bg-app:var\(--p-292c30\)/, 'وخلفيةُ الداكن');
  const R = root({ hash: '#/staffing' });
  let removed = 0; R.ctx.document.getElementById = (id) => (id === 'bs-boot' ? { remove: () => { removed++; } } : null);
  try { R.c.componentDidMount(); } catch (e) { /* بقيةُ التركيب تحتاج DOM حقيقياً — المهمُّ إزالةُ الهيكل أولاً */ }
  assert.equal(removed, 1, 'الإطارُ يزيل هيكلَ الإقلاع عند أول تركيب');
  const lock = fs.readFileSync(path.join(SRC, 'auth', '335-identity-gate.js'), 'utf8');
  assert.match(lock, /html\.bs-locked body > \*:not\(#bsLoginGate\)/, 'شاشةُ الدخول تُخفي الهيكلَ كسائر عناصر الجسم');
});
