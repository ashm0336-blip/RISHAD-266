/* الفحص العميق 2026-10-21 · الموجة 1 «وميض التحديث» — تبويبُ العنوان يُطبَّق متزامناً في أوّل رسم (R1 · ES-1 · DG-09 · AUX-06)،
   وروابطُ التبويبات المباشرة تفتح ما طُلب وتُبقي العنوان (R7 · DG-04 · KD-03 · PLAN-11)، وما تحفظه حالةُ العرض للمهام (DG-14).
   كانت _bsHR تستهلك KIVO.__BS_OPEN_TAB ثم تؤجّل التبويبَ بـ setTimeout(setState) فيُرسم التبويبُ الافتراضيّ أولاً (جدولُ «بيانات الموظفين»
   ثم يختفي)، والإعداداتُ تكتب #/admin/backup في العنوان قبل أن تُبدَّل. الدوالُّ الحقيقية من src/modules/‹الوحدة›/logic.js تُشغَّل في vm على
   كائنٍ بديل (بياناتٌ اصطناعية TEST_ONLY): يُتحقَّق أن الحالة تتغيّر قبل عودة الدالة، وأن لا مؤقّتَ لتبديل التبويب، وما يُكتب في العنوان. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { SRC, ROOT, moduleLogic } from './harness.mjs';

const rd = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');
const J = (o) => JSON.parse(JSON.stringify(o));
function method(src, head, ind = '  ') {
  const i = src.indexOf('\n' + ind + head); assert.ok(i > 0, head + ' موجودة');
  let j = src.indexOf('{', i + ind.length + head.length - 1), d = 0;
  for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && --d === 0) { j = k + 1; break; } }
  const body = src.slice(i + 1 + ind.length, j);
  return (/^async\s+/.test(body) ? 'async function ' : 'function ') + body.replace(/^(?:async\s+)?[A-Za-z_$][\w$]*\s*\(/, '(');
}
/* صفحةٌ بديلة: دوالُّ الوحدة الحقيقية المذكورة + حالةٌ وخصائص · العنوانُ والمؤقّتاتُ مرصودة */
function page(mod, names, o = {}) {
  const src = rd('modules/' + mod + '/logic.js'), timers = [], replaced = [], listeners = new Map();
  const loc = { hash: o.hash || '#/' + mod, pathname: '/', search: '' };
  const KIVO = Object.assign({ BassamPerm: o.perm || {} }, o.kivo || {});
  const ctx = { KIVO, console, JSON, Object, Array, String, Number, Math, RegExp, CustomEvent: class { constructor(t, i) { this.type = t; this.detail = i && i.detail; } },
    location: loc, history: { replaceState: (a, b, u) => { replaced.push(u); loc.hash = String(u).slice(String(u).indexOf('#')); } },
    setTimeout: (f, ms) => { timers.push(f); return timers.length; }, dispatchEvent: () => true,
    addEventListener: (event, fn) => listeners.set(event, fn), removeEventListener: (event, fn) => { if (listeners.get(event) === fn) listeners.delete(event); },
    window: null, document: { getElementById: () => null, addEventListener() {}, removeEventListener() {} } };
  ctx.window = ctx; vm.createContext(ctx);
  const c = Object.assign({ props: o.props || {}, state: Object.assign({}, o.state || {}) }, o.self || {});
  for (const n of names) c[n.replace(/^async\s+/, '').replace(/\(.*$/, '')] = vm.runInContext('(' + method(src, n) + ')', ctx);
  return { c, KIVO, loc, replaced, timers, src, listeners };
}
const firstInRender = (src, call) => { const i = src.indexOf('\n  renderVals() {'), j = src.indexOf(call, i); assert.ok(i > 0 && j > i, call + ' في renderVals'); return src.slice(i + 1, j).split('\n').length; };

test('موظفو الإدارة (R1 · ES-1): #/employees/custody — «عهد الموظفين» في الحالة قبل حساب القيم · بلا مؤقّت · والعنوانُ باقٍ', () => {
  const P = page('employees', ['_bsHR() {'], { hash: '#/employees/custody', state: { empTab: 'data' }, perm: { subOn: () => true }, kivo: { __BS_OPEN_TAB: { page: 'employees', tab: 'custody' } } });
  /* _bsHT الحقيقية (replaceState على #/employees/<tab>) — بديلٌ مكافئ يرصد العنوان */
  P.c._bsHT = (t) => { const p = '#/employees', w = t ? p + '/' + t : p; if (P.loc.hash.indexOf(p) === 0 && P.loc.hash !== w) { P.replaced.push(w); P.loc.hash = w; } };
  P.c._bsHR();
  assert.equal(P.c.state.empTab, 'custody', 'التبويبُ في الحالة قبل عودة الدالة (أوّلُ رسمٍ هو عهدُ الموظفين)');
  assert.equal(P.timers.length, 0, 'لا setTimeout لتبديل التبويب');
  assert.equal(P.KIVO.__BS_OPEN_TAB, null, 'الطلبُ يُستهلك مرةً');
  assert.equal(P.loc.hash, '#/employees/custody');
  assert.equal(firstInRender(P.src, 'this._bsHR();'), 2, '_bsHR أولُ ما في renderVals');
  /* مستودعُ العهد بورقة «عهد الموظفين» · والتبويبُ بلا صلاحية يُرفض والعنوانُ يحمل المعروضَ فعلاً */
  const Q = page('employees', ['_bsHR() {'], { hash: '#/employees/store', state: { empTab: 'custody' }, perm: { subOn: (p, k) => k !== 'custody' }, kivo: { __BS_OPEN_TAB: { page: 'employees', tab: 'store' } } });
  Q.c._bsHT = (t) => { Q.replaced.push(t); };
  Q.c._bsHR();
  assert.equal(Q.c.state.empTab, 'custody', 'لا تبديلَ بلا ورقة custody');
  assert.deepEqual(Q.replaced, [''], 'العنوانُ: لا تبويبَ مسموحاً معروضاً');
  /* التبويبُ المزروع من حالة العرض (بلا تبويبٍ في العنوان) يُكتب في العنوان مرةً */
  const S = page('employees', ['_bsHR() {'], { hash: '#/employees', state: { empTab: 'store' }, perm: { subOn: () => true } });
  S.c.__bsSeeded = { empTab: 'store' }; S.c._bsHT = (t) => { S.replaced.push(t); };
  S.c._bsHR(); S.c._bsHR();
  assert.deepEqual(S.replaced, ['store'], 'مرةً واحدة'); assert.equal(S.c.__bsSeeded, null);
  assert.doesNotMatch(method(P.src, '_bsHR() {'), /setTimeout/);
});

test('التميز (R1 · AUX-06): #/award/res و#/award/doc في أوّل رسم · بلا مؤقّت', () => {
  for (const tab of ['res', 'doc']) {
    const P = page('award', ['_bsHR() {'], { state: { awTab: 'new' }, perm: { subOn: () => true }, kivo: { __BS_OPEN_TAB: { page: 'award', tab } } });
    P.c._bsHT = (t) => P.replaced.push(t);
    P.c._bsHR();
    assert.equal(P.c.state.awTab, tab); assert.equal(P.timers.length, 0); assert.deepEqual(P.replaced, [tab]);
  }
  const src = rd('modules/award/logic.js');
  assert.equal(firstInRender(src, 'this._bsHR();'), 2);
  assert.doesNotMatch(method(src, '_bsHR() {'), /setTimeout/);
});

test('المتابعة اليومية (DG-04 · R7 · DG-09): #/daily/rounds يُقبل بقاعدة التبويب نفسِها (tabOn + عدسة) لا subOn · والرفضُ يكتب التبويبَ المعروض لا #/daily', () => {
  const self = { _dsTabOn: (t) => t === 'rounds', bsLensOn: (k) => k === 'gates' };
  const P = page('daily', ['_bsHR() {'], { state: { dsTab: 'kpi' }, self, perm: { subOn: () => false, can: () => true }, kivo: { __BS_OPEN_TAB: { page: 'daily', tab: 'rounds' } } });
  P.c._bsHT = (t) => P.replaced.push(t);
  P.c._bsHR();
  assert.equal(P.c.state.dsTab, 'rounds', 'subOn("daily","rounds") خاطئٌ دائماً لغير مدير النظام — والتبويبُ ظاهرٌ بقاعدته');
  assert.equal(P.timers.length, 0); assert.deepEqual(P.replaced, ['rounds']);
  /* «ملفي ← موقعي اليوم» (spotDaily) يضع الطلبَ نفسَه ثم ينتقل: يصل إلى الجولات */
  assert.match(rd('modules/profile/logic.js'), /KIVO\.__BS_OPEN_TAB = \{ page: "daily", tab: "rounds" \};/);
  /* بلا عدسةٍ للجولات: يُرفض، والعنوانُ يحمل التبويبَ المعروض (المهام) لا #/daily */
  const Q = page('daily', ['_bsHR() {'], { state: { dsTab: 'tasks' }, self: { _dsTabOn: () => true, bsLensOn: () => false }, perm: { can: () => true }, kivo: { __BS_OPEN_TAB: { page: 'daily', tab: 'rounds' } } });
  Q.c._bsHT = (t) => Q.replaced.push(t);
  Q.c._bsHR();
  assert.equal(Q.c.state.dsTab, 'tasks'); assert.deepEqual(Q.replaced, ['tasks']);
  /* #/daily/tasks: «المهام» في أوّل رسم (كان «التقرير اليومي» يومض أولاً) */
  const T = page('daily', ['_bsHR() {'], { state: { dsTab: 'kpi' }, self, perm: { can: (k) => k === 'tasks' }, kivo: { __BS_OPEN_TAB: { page: 'daily', tab: 'tasks' } } });
  T.c._bsHT = () => {}; T.c._bsHR();
  assert.equal(T.c.state.dsTab, 'tasks'); assert.equal(T.timers.length, 0);
  const src = rd('modules/daily/logic.js');
  assert.equal(firstInRender(src, 'this._bsHR();'), 2);
  assert.doesNotMatch(method(src, '_bsHR() {'), /setTimeout|subOn/);
  assert.match(src, /Vn =\n\s+this\._dsTabOn\("rounds"\) && \(this\.bsLensOn\("zones"\) \|\| this\.bsLensOn\("gates"\) \|\| this\.bsLensOn\("marks"\) \|\| this\.bsLensOn\("paths"\)\),/, 'القاعدةُ نفسُها التي تُظهر التبويب');
});

test('الإعدادات (R1 · AUX-06): #/admin/import|ptpls|shifts|oplog — التبويبُ في أوّل رسم ولا يُكتب #/admin/backup · سجلُّ الحركة يُحمَّل مرة', () => {
  const g = ['backup', 'oplog', 'shifts', 'ptpls', 'import'];
  for (const tab of ['import', 'ptpls', 'shifts']) {
    const P = page('admin', ['_admTabsNow(i, n, p, g) {'], { state: { admTab: 'depts', deptTab: 'backup' }, kivo: { __ADMIN_OPEN_DTAB: tab } });
    const r = P.c._admTabsNow('dept', false, ['backup'], g);
    assert.equal(r.h, tab, 'التبويبُ المعروض في الرسم الأول'); assert.equal(P.c.state.deptTab, tab); assert.equal(P.KIVO.__ADMIN_OPEN_DTAB, null);
    assert.equal(P.timers.length, 0, 'لا مؤقّت');
  }
  let A = 0;
  const P = page('admin', ['_admTabsNow(i, n, p, g) {'], { state: { admTab: 'depts', deptTab: 'backup', aud: null }, self: { audLoad: () => { A++; } }, kivo: { __ADMIN_OPEN_DTAB: 'oplog' } });
  assert.equal(P.c._admTabsNow('dept', false, ['backup'], g).h, 'oplog');
  assert.equal(P.timers.length, 1); P.timers.splice(0).forEach((f) => f()); assert.equal(A, 1, 'سجلُّ الحركة يُحمَّل بعد الرسم');
  assert.equal(P.c._admTabsNow('dept', false, ['backup'], g).h, 'oplog'); assert.equal(P.timers.length, 0, 'لا تحميلَ في كل رسم');
  /* تبويبٌ مزروعٌ من حالة العرض (oplog) بلا طلب: يُحمَّل مرةً في أوّل رسم */
  const S = page('admin', ['_admTabsNow(i, n, p, g) {'], { state: { admTab: 'depts', deptTab: 'oplog', aud: { loaded: false } } });
  assert.equal(S.c._admTabsNow('dept', false, ['backup'], g).h, 'oplog'); assert.equal(S.timers.length, 1);
  /* تبويبٌ غيرُ متاح: الافتراضيّ ولا تغييرَ في الحالة */
  const X = page('admin', ['_admTabsNow(i, n, p, g) {'], { state: { admTab: 'depts', deptTab: 'backup' }, kivo: { __ADMIN_OPEN_DTAB: 'oplog' } });
  assert.equal(X.c._admTabsNow('dept', false, ['backup'], ['backup', 'import']).h, 'backup'); assert.equal(X.c.state.deptTab, 'backup');
  /* مدير النظام: الطلبُ (الجرس/الرابط) في الحالة قبل الرسم · والتحميلُ وحده بعده — CORE-02 S7 (تغييرٌ مقصود): بالمسار الواحد _admGo لا adGo مباشرة */
  let go = '';
  const Y = page('admin', ['_admTabsNow(i, n, p, g) {', 'PL_KEYS() {'], { state: { admTab: 'depts', deptTab: 'backup' }, self: { _admGo: (t) => { go = t; } }, kivo: { __ADMIN_OPEN_TAB: 'sec' } });
  const ry = Y.c._admTabsNow('site', true, ['overview', 'sec', 'depts'], g);
  assert.equal(ry.l, 'sec'); assert.equal(Y.c.state.admTab, 'sec'); Y.timers.splice(0).forEach((f) => f()); assert.equal(go, 'sec');
  const src = rd('modules/admin/logic.js'), rv = src.slice(src.indexOf('\n  renderVals() {'));
  const iT = rv.indexOf('this._admTabsNow(i, n, p, g)'), iH = rv.indexOf('this._hashTab("admin", h)');
  assert.ok(iT > 0 && iH > iT, 'العنوانُ يُكتب بعد حلّ التبويب المطلوب (لا #/admin/backup)');
  assert.doesNotMatch(src, /setTimeout\(\s*\(\) =>\s*this\.setState\(\{ deptTab: q \}/);
});

test('الإحصائيات اليومية (KD-03 · R7): #/dstats/nabawi يفتح المسجدَ النبوي متزامناً · والمسجدُ يُكتب في العنوان عند التبديل · والمحفوظُ يبقى بعد التركيب والقراءة السحابية', async () => {
  const self = { SOLO: () => '', SITES: () => ['haram', 'nabawi'], SITE() { return this.state.site; } };
  const P = page('dstats', ['_bsHR(){'], { state: { site: 'haram', draft: { a: 1 } }, self, kivo: { __BS_OPEN_TAB: { page: 'dstats', tab: 'nabawi' } } });
  P.c._bsHT = (t) => P.replaced.push(t);
  P.c._bsHR();
  assert.equal(P.c.state.site, 'nabawi'); assert.equal(P.c.state.draft, null, 'المسودةُ للمسجد الآخر لا تُحمل'); assert.deepEqual(P.replaced, ['nabawi']);
  const Q = page('dstats', ['_bsHR(){'], { state: { site: 'haram' }, self: Object.assign({}, self, { SITES: () => ['haram'] }), kivo: { __BS_OPEN_TAB: { page: 'dstats', tab: 'nabawi' } } });
  Q.c._bsHT = (t) => Q.replaced.push(t); Q.c._bsHR();
  assert.equal(Q.c.state.site, 'haram', 'بلا ورقة المسجد النبوي: لا'); assert.deepEqual(Q.replaced, ['']);
  const src = rd('modules/dstats/logic.js');
  assert.match(src, /click:\(\)=>\{ self\.setState\(\{site:k,draft:null\}\); self\._bsHT\(k==="haram"\?"":k\); \}/, 'التبديلُ يكتب العنوان');
  assert.match(src, /renderVals\(\)\{\n    this\._bsHR\(\);/);
  /* Real asynchronous refreshStats runs against a deferred cloud adapter. Neither
     starting nor completing that read may overwrite the restored calendar state. */
  let resolveRead, reads = 0;
  const lifecycle = ['componentDidMount(){', 'async refreshStats(){', 'componentWillUnmount(){'];
  const own = { hToday: () => ({ y: 1448, m: 5, d: 10 }), _bsOutsideMenus() {}, bsToast() { assert.fail('لا يُتوقع فشل القراءة الاصطناعية'); } };
  const D = page('dstats', lifecycle, { state: { site: 'nabawi', year: 1447, month: 9, day: 3 }, self: own, kivo: { DailyStats: { refresh() { reads++; return new Promise(resolve => { resolveRead = resolve; }); } } } });
  const setState = target => update => { const patch = typeof update === 'function' ? update(target.state) : update; target.state = { ...target.state, ...patch }; };
  D.c.setState = setState(D.c);
  D.c.componentDidMount();
  const date = c => ({ y: c.state.year, m: c.state.month, d: c.state.day });
  assert.equal(reads, 1); assert.equal(D.c.state.tick, undefined, 'القراءة معلقة ولم يُعلن تحديث الرسم');
  assert.deepEqual(date(D.c), { y: 1447, m: 9, d: 3 }, 'اليومُ المحفوظ يبقى أثناء القراءة');
  resolveRead(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(D.c.state.tick, 1, 'الدالة الفعلية تؤكد اكتمال القراءة بإعادة الرسم');
  assert.deepEqual(date(D.c), { y: 1447, m: 9, d: 3 }, 'ولا تستبدله القراءة المكتملة');
  assert.ok(D.listeners.has('daily-stats-refresh')); D.c.componentWillUnmount();
  assert.equal(D.listeners.has('daily-stats-refresh'), false, 'يُزال اشتراك تحديث المجال عند مغادرة الصفحة');
  const E = page('dstats', lifecycle, { state: { site: 'haram', year: 0, month: 0, day: 0 }, self: own, kivo: { DailyStats: { refresh: async () => { reads++; } } } });
  E.c.setState = setState(E.c); E.c.componentDidMount();
  assert.deepEqual(date(E.c), { y: 1448, m: 5, d: 10 }, 'وبلا محفوظ: اليومُ الجاري');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(reads, 2); assert.equal(E.c.state.tick, 1); assert.deepEqual(date(E.c), { y: 1448, m: 5, d: 10 }); E.c.componentWillUnmount();
  assert.match(src, /if\(!s\.year\|\|!s\.anY\) return Object\.assign\(this\.EMPTY\(\), this\.EMPTY_AN\(\)\);/, 'الرسمُ قبل التركيب فارغٌ لا يُعرض');
});

test('الاسترشاد والمضبوطات (R7): #/irshad/records و#/seized/records تُطبَّق متزامناً · والرابطُ غيرُ الصالح يعود إلى الصفحة · والنسخُ solo لا تشارك', () => {
  for (const mod of ['irshad', 'seized']) {
    const P = page(mod, ['_bsHR() {'], { state: { irTab: 'dash' }, kivo: { __BS_OPEN_TAB: { page: mod, tab: 'records' } } });
    P.c._bsHT = (t) => P.replaced.push(t);
    assert.equal(P.c._bsHR(), 'records'); assert.equal(P.c.state.irTab, 'records'); assert.equal(P.timers.length, 0);
    const Q = page(mod, ['_bsHR() {'], { state: { irTab: 'dash' }, kivo: { __BS_OPEN_TAB: { page: mod, tab: 'TEST_ONLY' } } });
    Q.c._bsHT = (t) => Q.replaced.push(t);
    assert.equal(Q.c._bsHR(), ''); assert.deepEqual(Q.replaced, [''], 'العنوانُ #/' + mod);
    const S = page(mod, ['_bsHR() {'], { state: { irTab: 'dash' }, props: { solo: 'dash' }, kivo: { __BS_OPEN_TAB: { page: mod, tab: 'records' } } });
    assert.equal(S.c._bsHR(), ''); assert.equal(S.c.state.irTab, 'dash'); assert.ok(S.KIVO.__BS_OPEN_TAB, 'الطلبُ يبقى للصفحة');
    const src = rd('modules/' + mod + '/logic.js');
    assert.match(src, /renderVals\(\) \{\n    const q = this\._bsHR\(\),/, 'قبل حساب القيم');
    assert.match(src, /q && q !== h && this\._bsHT\(h\);/, 'والعنوانُ يحمل التبويبَ المعروض فعلاً');
  }
});

test('الخطة التشغيلية (PLAN-11): التبويبُ المزروع من حالة العرض (ptab) يُرسم في أوّل رسم ويُركِّب «التشغيل الميداني» — بحارس الصلاحية', () => {
  /* كان سجلُّ الحالة بمفتاح data-screen-label فتتصادم الحاويةُ و«التشغيل الميداني» (التسميةُ نفسُها) ويضيع ptab؛ الآن بمفتاح اسم المكوّن
     (اختبارُ الزرع في refresh_seed_w1). هنا: renderVals الحقيقية على حالةٍ مزروعة */
  const P = page('planning', ['renderVals() {'], { state: { ptab: 'plan', planSeen: false }, self: { _ptOk: () => true, _bsGo() {} } });
  const V = P.c.renderVals();
  assert.equal(V.ptab, 'plan'); assert.equal(V.onPlan, true); assert.equal(V.planSeen, true, '«التشغيل الميداني» يُركَّب بلا planSeen');
  const Q = page('planning', ['renderVals() {'], { state: { ptab: 'plan', planSeen: false }, self: { _ptOk: (k) => k !== 'plan', _bsGo() {} } });
  const W = Q.c.renderVals();
  assert.equal(W.ptab, 'sched', 'بلا صلاحية الخطة: الجدولُ الشهري'); assert.equal(W.planSeen, false);
  assert.match(rd('modules/planning/logic.js'), /state = \{ ptab: null, planSeen: !1 \};/, 'ptab في الحالة الأولى (null يقبل الزرع)');
});

/* DG-14: صفحةُ المهام في vm بساعةٍ ثابتة (ظهرُ 2026-10-20 = 9 جمادى الأولى 1448) وبلا مهام */
const NOW = new Date(2026, 9, 20, 12, 0, 0).getTime();
function tasksPage() {
  const KIVO = {}, store = new Map();
  class FDate extends Date { constructor(...a) { if (a.length) super(...a); else super(NOW); } static now() { return NOW; } }
  const ctx = { KIVO, console, Intl, Date: FDate, Math, JSON, Promise, Object, Array, String, Number, RegExp, Set, Map, Error, isNaN, parseInt, setTimeout: () => 0, clearTimeout: () => 0, setInterval: () => 0, clearInterval: () => 0,
    localStorage: { getItem: (k) => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    document: { hidden: false, querySelector: () => null, addEventListener: () => {}, removeEventListener: () => {} }, navigator: { userAgent: 'node' }, addEventListener: () => {}, removeEventListener: () => {},
    __BS_BOOT: { srv: 0 }, fetch: () => Promise.reject(new Error('offline')) };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ['src/services/490-emp-key.js', 'src/services/440-count.js', 'src/services/060-percent-format.js', 'src/services/546-task-model.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
  KIVO.BassamPerm = { can: () => true, on: () => true };
  KIVO.BassamAuth = { user: () => ({ id: 'tst_dm1', role: 'staff', mgr: true, ekey: 'mgr:tst_d1', deptId: 'tst_d1', name: 'TEST_ONLY مدير' }), display: () => ({ name: 'TEST_ONLY مدير' }), users: () => [] };
  KIVO.BassamDepts = { active: () => 'tst_d1' }; KIVO.BassamSup = { isSup: () => false };
  KIVO.BassamFind = { dig: (v) => String(v == null ? '' : v), filter: (q, list, f) => list.filter((r) => f(r).some((x) => String(x == null ? '' : x).indexOf(q) >= 0)) };
  class DCLogic { constructor() { this.state = {}; } setState(p, cb) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); cb && cb(); } }
  ctx.DCLogic = DCLogic;
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/components/565-page-kit.js'), 'utf8'), ctx);
  const B0 = KIVO.BassamPageKit.base; KIVO.BassamPageKit.base = (B, a) => class extends B0(B, a) { bsOn() { return true; } bsToast() {} };
  KIVO.__BS_SRV = { operations: { resources: [], status: () => ({ state: 'idle', epoch: 0 }), context: () => null, state: () => 'ready', begin: () => ({ ok: true }), draft: () => null }, rev: () => 0 };
  vm.runInContext(moduleLogic('tasks') + '\n;globalThis.__C = Component;', ctx, { filename: 'tasks/logic.js' });
  const c = new ctx.__C(); c.bsToast = () => {}; c.setState({ perPage: 0 });
  return { c, V: () => c.renderVals() };
}

test('المهام (DG-14): «الشهر كاملاً» واليومُ المختار يُحملان بمفتاحين بدائيين تحفظهما حالةُ العرض (tkDayK · tkDayD) — وعرضُ kanban (sub)', () => {
  const P = tasksPage(), SK = '1448-5';
  assert.ok('tkDayK' in P.c.state && 'tkDayD' in P.c.state && 'sub' in P.c.state, 'في الحالة الأولى (فيُزرع المحفوظُ قبل أوّل رسم)');
  let V = P.V();
  assert.equal(V.tkDayTitle.indexOf('مهام اليوم'), 0, 'الافتراضيّ: اليومُ الجاري');
  V.tkDayAll();
  assert.deepEqual({ k: P.c.state.tkDayK, d: P.c.state.tkDayD }, { k: SK, d: 0 });
  /* بعد التحديث: tkDaySel (كائن) لا يُحفظ — المزروعُ هو المفتاحان وحدهما */
  const R = tasksPage();
  R.c.state = Object.assign({}, R.c.state, { tkDaySel: null, tkDayK: SK, tkDayD: 0, sub: 'kanban' });
  V = R.V();
  assert.equal(V.tkDayTitle, 'مهام شهر جمادى الأولى 1448 هـ — كل الأيام', '«الشهر كاملاً» يعود بعد التحديث والرجوع');
  R.c.state = Object.assign({}, R.c.state, { tkDayK: SK, tkDayD: 7 });
  assert.match(R.V().tkDayTitle, /^مهام يوم .* 7 جمادى الأولى 1448 هـ$/, 'واليومُ المختار');
  R.c.state = Object.assign({}, R.c.state, { month: 4 });
  assert.equal(R.V().tkDayTitle, 'مهام شهر ربيع الآخر 1448 هـ — كل الأيام', 'المفتاحُ لشهرٍ آخر لا يُطبَّق');
  R.V().goToday();
  assert.deepEqual({ k: R.c.state.tkDayK, d: R.c.state.tkDayD, s: R.c.state.tkDaySel }, { k: '', d: 0, s: null }, '«اليوم» يمحوه');
  R.V().tkDays[2].click();
  assert.deepEqual({ k: R.c.state.tkDayK, d: R.c.state.tkDayD }, { k: SK, d: 3 });
});
test('الاسترشاد والمضبوطات (R7 · تحقّقُ الموجة 1): التبديلُ داخل الصفحة يكتب التبويبَ في العنوان — فلا يعيد التحديثُ أو الرجوعُ تبويباً تركه المستخدم', () => {
  for (const mod of ['irshad', 'seized']) {
    const P = page(mod, ['_bsHT(t) {'], { hash: '#/' + mod + '/records' });
    P.c._bsHT('dash'); assert.equal(P.loc.hash, '#/' + mod + '/dash');
    P.c._bsHT('records'); assert.equal(P.loc.hash, '#/' + mod + '/records');
    const S = page(mod, ['_bsHT(t) {'], { hash: '#/kpis', props: { solo: 'dash' } });
    S.c._bsHT('records'); assert.equal(S.loc.hash, '#/kpis', 'نسخةُ solo داخل المؤشرات لا تكتب');
    const src = rd('modules/' + mod + '/logic.js');
    assert.match(src, /irGoDash: \(\) => \(this\._bsHT\("dash"\), this\.setState\(\{ irTab: "dash" \}\)\)/);
    assert.match(src, /irGoRecords: \(\) => \(this\._bsHT\("records"\), this\.setState\(\{ irTab: "records" \}\)\)/);
  }
});
