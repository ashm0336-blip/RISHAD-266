/* مراجعةُ التكامل W1-R4 — «زرعُ حالة العرض يستهلكه رسمٌ مُسقَط»:
   كان _viewSeed (root-logic) يستهلك مفتاحَ المكوّن (_seedUsed[ck] = 1) لحظةَ إنشاء منطقه — أي في طور الرسم. التنقّلُ يركّب الصفحة داخل
   React.startTransition، فلمسةٌ أثناءه (النقرُ على عنصر التنقّل نفسِه، الجرس، الشريط) تُسقط الشجرةَ قيد الرسم وتُنشئ المكوّنَ من جديد:
   النسخةُ المُسقَطة تأخذ الزرعَ (وتكتب تبويبَه في العنوان) والمُركَّبةُ فعلاً تبدأ بالافتراضيّ.
   يُثبت هنا على الشيفرة الحقيقية داخل vm (TEST_ONLY · بياناتٌ اصطناعية): منطقُ الإطار src/layouts/root-logic.js والمضيفُ الحقيقيّ
   StreamableComponent من src/core/050-dc-runtime.js (المُنشئ · __makeLogic · __reconcileLogic · componentDidMount · componentDidUpdate):
     · إنشاءٌ مُسقَطٌ ثم إنشاءٌ يُودَع: المُودَعُ مزروع · وإعادةُ تركيبٍ حقيقيةٌ بعده في الزيارة نفسِها تبدأ بالافتراضيّ · وزيارةٌ جديدة تزرع
       · والإيداعُ يستهلك الزيارةَ ولو لم يوجد سجلٌّ يُزرع (كما كان الإنشاءُ يفعل).
     · الوضعُ الكسول (المنطقُ يُبدَّل في رسمٍ لاحق): الاستهلاكُ عند componentDidUpdate.
     · النسخُ solo بمفتاحها (اسمٌ#ورقة) تُستهلك وحدها · وإيداعٌ متأخّرٌ من زيارةٍ سابقة لا يمسّ الزيارةَ الجديدة. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { SRC } from './harness.mjs';

const rd = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');
class FakeStorage { constructor() { this.m = new Map(); } getItem(k) { return this.m.has(k) ? this.m.get(k) : null; } setItem(k, v) { this.m.set(k, String(v)); } removeItem(k) { this.m.delete(k); } }
/* نصُّ صنفٍ أو دالةٍ بمطابقة الأقواس من سطرٍ يبدأ بـhead */
function block(src, head) {
  const i = src.indexOf(head); assert.ok(i > 0, head + ' موجود');
  let j = src.indexOf('{', i + head.length - 1), d = 0;
  for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && --d === 0) { j = k + 1; break; } }
  return src.slice(i, j);
}

/* عالمٌ واحد: الإطارُ الحقيقيّ (root-logic) + المضيفُ الحقيقيّ (StreamableComponent) فوق React بديلٍ يحاكي طوري الرسم والإيداع يدوياً:
   new Host(props) = الإنشاءُ في طور الرسم · host.componentDidMount() = الإيداع · ما لا يُودَع هو ما أسقطته React */
function world(o = {}) {
  const KIVO = {};
  const ctx = {
    KIVO, console, JSON, Object, Array, String, Number, Math, Date, RegExp, Set, Map, Error, Promise, Symbol,
    localStorage: new FakeStorage(), sessionStorage: o.ss || new FakeStorage(),
    location: { hash: o.hash || '#/employees', pathname: '/', search: '' }, history: { replaceState() {}, pushState() {} },
    document: { documentElement: { scrollHeight: 5000 }, querySelectorAll: () => [], getElementById: () => null, addEventListener() {}, removeEventListener() {}, hidden: false },
    setTimeout: () => 0, clearTimeout() {}, requestAnimationFrame: () => 0, addEventListener() {}, removeEventListener() {}, scrollTo() {}, scrollY: 0, innerHeight: 800,
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  KIVO.BassamDepts = { active: () => 'tst_d1' };
  KIVO.BassamAuth = { isSuper: () => false };
  KIVO.BassamPerm = { NAV2PERM: { staffing: 'staff', employees: 'emps', planning: 'planning' }, can: () => true };
  const rt = rd('core/050-dc-runtime.js');
  /* المنطقُ الأساسيّ والمضيفُ كما في وقت التشغيل — نصّاً */
  vm.runInContext([
    'var __defProp = Object.defineProperty;',
    'var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;',
    'var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);',
    block(rt, 'var StreamableLogic = class {') + ';',
    'globalThis.StreamableLogic = StreamableLogic; globalThis.DCLogic = StreamableLogic;',
  ].join('\n'), ctx, { filename: '050-dc-runtime.js#logic' });
  vm.runInContext(rd('layouts/root-logic.js') + '\n;globalThis.__Root = Component;', ctx, { filename: 'root-logic.js' });
  const reg = new Map();
  ctx.registry = { get: (n) => reg.get(n) };
  ctx.ensureFetched = () => {};
  ctx.shallowEqual = (a, b) => { const ka = Object.keys(a || {}), kb = Object.keys(b || {}); return ka.length === kb.length && ka.every((k) => a[k] === b[k]); };
  ctx.React = { Component: class { constructor(p) { this.props = p; } setState(u, cb) { const p = typeof u === 'function' ? u(this.state) : u; this.state = Object.assign({}, this.state, p); if (cb) cb(); } forceUpdate() {} } };
  vm.runInContext(block(rt, 'class StreamableComponent extends React.Component {') + '\n;globalThis.__Host = StreamableComponent;', ctx, { filename: '050-dc-runtime.js#host' });
  const R = new ctx.__Root();
  const mounted = [];
  /* صفحةٌ اصطناعية: «موظفو الإدارة» بتبويبها وترقيمها (TEST_ONLY) */
  const Page = vm.runInContext('(class Page extends StreamableLogic { constructor(p) { super(p); this.state = { empTab: "data", page: 1, draft: null }; } })', ctx);
  Page.prototype.componentDidMount = function () { mounted.push(this.state.empTab); };
  const entry = (Logic) => ({ Logic, html: '<div data-screen-label="بيانات الموظفين">TEST_ONLY</div>', ver: 1, subs: new Set(), tpl: () => null });
  reg.set('Employees', entry(o.lazy ? undefined : Page));
  const host = (props) => new ctx.__Host(Object.assign({ __name: 'Employees' }, props || {}));
  /* تبدّلُ الصفحة كما يراه الإطار: سطرُ renderVals الذي يصفّر سجلَّ الزرع (A ← B ← A زيارةٌ جديدة) — نصّاً من المصدر */
  const visit = vm.runInContext('(function () {' + /\n    (if \(this\._viewLastActive !== this\.state\.active\) \{[^\n]*)\n/.exec(rd('layouts/root-logic.js'))[1] + '})', ctx);
  const go = (pg) => { R.state = Object.assign({}, R.state, { active: pg }); visit.call(R); };
  visit.call(R);   /* أوّلُ renderVals للإطار — قبل إنشاء مكوّنات الصفحة */
  return { R, KIVO, ctx, Page, reg, entry, host, go, mounted, StreamableLogic: ctx.StreamableLogic };
}
const saved = (ss, rec) => ss.setItem('bsview:tst_d1', JSON.stringify(rec));
const emps = (comps) => { const ss = new FakeStorage(); saved(ss, { employees: { v: 2, y: 0, at: 1, comps } }); return ss; };

test('W1-R4: إنشاءٌ يُسقطه React قبل الإيداع لا يستهلك الزرع — المضيفُ المُودَع مزروع · وإعادةُ التركيب بعده بالافتراضيّ', () => {
  const W = world({ ss: emps({ Employees: { empTab: 'custody', page: 3 } }) });
  assert.equal(W.R.state.active, 'employees');
  const h1 = W.host();                       /* رسمُ التنقّل (startTransition) — ثم لمسةٌ تُسقطه: لا componentDidMount */
  assert.equal(h1.logic.state.empTab, 'custody', 'الإنشاءُ الأولُ مزروعٌ قبل أوّل رسم');
  const h2 = W.host();                       /* React تُعيد الرسمَ من الجذر فتُنشئ المضيفَ من جديد — وهو الذي يُودَع */
  assert.equal(h2.logic.state.empTab, 'custody', 'المضيفُ الذي يُركَّب فعلاً مزروع (كان يبدأ بـ«بيانات الموظفين» والعنوانُ يقول custody)');
  assert.equal(h2.logic.state.page, 3);
  assert.deepEqual(JSON.parse(JSON.stringify(h2.logic.__bsSeeded)), { empTab: 'custody', page: 3 }, 'فيكتب تبويبَه في العنوان من أوّل رسمٍ له (_bsHR)');
  h2.componentDidMount();                    /* الإيداع */
  assert.deepEqual(W.mounted, ['custody'], 'componentDidMount الصفحة يرى الحالةَ المزروعة');
  const h3 = W.host();                       /* إعادةُ تركيبٍ حقيقيةٌ في الزيارة نفسِها */
  assert.equal(h3.logic.state.empTab, 'data', 'مرةً لكل مكوّنٍ في كل زيارة: ما يُركَّب بعد الإيداع يبدأ بافتراضه');
  h3.componentDidMount();
  W.go('staffing'); W.go('employees');
  const h4 = W.host();
  assert.equal(h4.logic.state.empTab, 'custody', 'زيارةٌ جديدة (A ← B ← A) تزرع من جديد');
});

test('W1-R4: الإسقاطُ المتكرّر (لمستان أثناء رسم التنقّل) · وإيداعٌ متأخّرٌ من زيارةٍ سابقة لا يستهلك زرعَ الزيارة الجديدة · وبلا سجلٍّ يُستهلك عند الإيداع', () => {
  const W = world({ ss: emps({ Employees: { empTab: 'store' } }) });
  W.host(); W.host();
  const h = W.host(); assert.equal(h.logic.state.empTab, 'store', 'الثالثُ — المُودَع — مزروعٌ أيضاً');
  const stale = W.host();                    /* أُنشئ في الزيارة الأولى ولم يُودَع قبل تبدّلها */
  W.go('staffing'); W.go('employees');
  stale.componentDidMount();                 /* إيداعٌ متأخّر: يُعلِّم سجلَّ زيارته هو لا الجديدة */
  const fresh = W.host();
  assert.equal(fresh.logic.state.empTab, 'store', 'الزيارةُ الجديدة لم يستهلكها إيداعُ الزيارة السابقة');
  fresh.componentDidMount();
  assert.equal(W.host().logic.state.empTab, 'data');
  /* بلا سجلٍّ محفوظ يُستهلك المفتاحُ عند الإيداع أيضاً — فسجلٌّ يُكتب أثناء الزيارة (التقاطٌ عند pagehide…) لا يُزرع في إعادة تركيبٍ لاحقة (كما كان) */
  const ss = new FakeStorage(), V = world({ ss });
  V.host();                                  /* مُسقَط */
  const h0 = V.host(); assert.equal(h0.logic.state.empTab, 'data'); h0.componentDidMount();
  saved(ss, { employees: { v: 2, y: 0, at: 2, comps: { Employees: { empTab: 'custody' } } } });
  assert.equal(V.host().logic.state.empTab, 'data', 'الزيارةُ استُهلكت بإيداع المكوّن الأول ولو لم يوجد ما يُزرع');
});

test('W1-R4: الوضعُ الكسول — المنطقُ الحقيقيّ يُبنى في رسمٍ لاحق (__reconcileLogic) فيُستهلك الزرعُ عند componentDidUpdate', () => {
  const W = world({ ss: emps({ Employees: { empTab: 'custody' } }), lazy: true });
  const h = W.host();
  assert.equal(h.logic.constructor, W.StreamableLogic, 'الصفحةُ لم تُحمَّل بعد: الأساسُ الفارغ');
  h.componentDidMount();                     /* إيداعُ الأساس الفارغ لا يستهلك شيئاً */
  W.reg.set('Employees', Object.assign(W.entry(W.Page), { ver: 2 }));
  h.__reconcileLogic();                      /* رسمٌ يبدّل المنطق — ثم يُسقَط: المنطقُ المزروع باقٍ على المضيف نفسِه */
  assert.equal(h.logic.state.empTab, 'custody', 'المنطقُ الحقيقيّ مزروعٌ قبل أوّل رسمٍ له');
  const other = W.host();                    /* مضيفٌ آخر يُنشأ قبل إيداع الأول (رسمٌ مُسقَط): لم يُستهلك بعد */
  assert.equal(other.logic.state.empTab, 'custody');
  h.__reconcileLogic();                      /* إعادةُ الرسم: لا تبديلَ ثانٍ ولا زرعٌ ثانٍ */
  h.componentDidUpdate({});                  /* الإيداع */
  assert.deepEqual(W.mounted, ['custody'], 'componentDidMount المنطق المبدَّل يُنادى بعد الإيداع بحالته المزروعة');
  assert.equal(W.host().logic.state.empTab, 'data', 'بعد الإيداع: إعادةُ التركيب بالافتراضيّ');
});

test('W1-R4: النسخُ solo بمفتاحها — إسقاطُ النسخة المضمَّنة وإيداعُها لا يمسّان زرعَ الصفحة نفسِها', () => {
  const W = world({ ss: emps({ Employees: { empTab: 'custody' }, 'Employees#readiness': { empTab: 'store', page: 2 } }) });
  W.host({ solo: 'readiness' });                                   /* مُسقَطة */
  const s = W.host({ solo: 'readiness' }); assert.deepEqual([s.logic.state.empTab, s.logic.state.page], ['store', 2]);
  s.componentDidMount();
  assert.equal(W.host({ solo: 'readiness' }).logic.state.empTab, 'data', 'النسخةُ المضمَّنة استُهلكت وحدها');
  const m = W.host(); assert.equal(m.logic.state.empTab, 'custody', 'والصفحةُ نفسُها ما زالت تُزرع');
});

test('W1-R4: الشيفرة — الزارعُ لا يستهلك عند الإنشاء ويعيد استهلاكاً · والمضيفُ يناديه في componentDidMount وcomponentDidUpdate', () => {
  const root = rd('layouts/root-logic.js'), rt = rd('core/050-dc-runtime.js');
  const seed = block(root, '  _viewSeed(name, logic, props, labelOf) {');
  assert.doesNotMatch(seed, /this\._seedUsed\[ck\]\s*=\s*1/, 'لا استهلاكَ في طور الرسم');
  assert.match(seed, /const commit = \(\) => \{ used\[ck\] = 1; \};/);
  const host = block(rt, 'class StreamableComponent extends React.Component {');
  assert.match(block(host, '      componentDidMount() {'), /^      componentDidMount\(\) \{\s*this\.__bsSeedCommit\(\);/);
  assert.match(block(host, '      componentDidUpdate(prevProps) {'), /^      componentDidUpdate\(prevProps\) \{\s*this\.__bsSeedCommit\(\);/);
  assert.match(block(host, '      __makeLogic(Logic, prevState) {'), /this\.__bsSeedPend = typeof done === "function" \? done : null;/);
});
