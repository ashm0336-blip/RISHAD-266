/* F01 · الأقسام — واجهةُ الأقسام (الدفعة الثانية): المبدّل · الألفاظ · أفعالُ الشجرة · بذرُ السقف من سقف الإدارة الفعليّ · التنبيهاتُ والعدّ.
   النموذجُ 320 و331 (seedSectionCap · deptCap) و440 (BassamCount) محمّلةٌ في vm كما هي في المصدر؛ وربطُ الصفحات (الترويسة · المبدّل ·
   الإدارة · الموظفون · الملف) يُثبَّت على مصدرها. سابقاً — نموذجُ الواجهة: 320 محمّلاً في vm بتخزينٍ وهمي (ومخزنُ السحابة مُثبَّتٌ كما يشترطه الإقلاع)،
   ودوالُّ السقف الحقيقية من 331، وgmDepts من 330 — كما هي في المصدر (KIVO_SRC أو src).
     (1) القراءة: nodeOf · railTree · isSection · unitKind · parentDeptOf · sectionsOf · tree() · groupIdOf · deptDelWhy
     (2) قاعدةُ الموضع الواحدة (مرآةُ الخادم 018): القسم تحت إدارةٍ وحدها · لا شيءَ تحت قسم · لا عقدةَ «قسم» · لا عقدةَ تحت وحدة · تصادمُ المعرّفات
     (3) sectionAdd: مديرُ النظام ومديرُ الإدارة الأم (بسقفٍ صريحٍ من سقف الإدارة) — لا مديرُ إدارةٍ أخرى ولا موظف
     (4) 330 gmDepts: عقدةٌ فوقيةٌ قائمة وحدها (gm تالفٌ معرّفُه إدارةٌ لا يرث شيئاً) */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const SRC = process.env.KIVO_SRC ? path.resolve(process.env.KIVO_SRC) : path.join(ROOT, 'src');
const rd = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');
const J = (x) => JSON.parse(JSON.stringify(x));
function fnSrc(M, name, opt) {
  const i = M.indexOf('\n  function ' + name + '('); if (opt && i < 0) return ''; assert.ok(i > 0, name + ' موجودة');
  let j = M.indexOf('{', i), d = 0;
  for (let k = j; k < M.length; k++) { if (M[k] === '{') d++; else if (M[k] === '}' && --d === 0) { j = k + 1; break; } }
  return M.slice(i + 3, j);
}
const PAGE_KEYS = ['emps', 'tasks', 'plan', 'daily', 'admin', 'help'];
function world(user) {
  class Storage {
    constructor() { this._m = new Map(); }
    getItem(k) { return this._m.has(k) ? this._m.get(k) : null; }
    setItem(k, v) { this._m.set(String(k), String(v)); }
    removeItem(k) { this._m.delete(k); }
    clear() { this._m.clear(); }
    key(i) { return [...this._m.keys()][i] ?? null; }
    get length() { return this._m.size; }
  }
  const localStorage = new Storage(), sessionStorage = new Storage();
  const doc = { addEventListener() {}, body: { appendChild() {}, classList: { add() {}, remove() {} } }, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }), getElementById: () => null };
  const ctx = { Storage, localStorage, sessionStorage, KIVO: { __BS_SRV: { flushAsync() { return Promise.resolve(); } } }, document: doc, console, JSON, Date, Math, Object, Array, String, Number, Promise, setTimeout, clearTimeout };
  ctx.window = { localStorage, sessionStorage, addEventListener() {}, document: doc, __BS_BOOT: { srv: 1, cf: 1 } };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(rd('services/320-dept-storage.js'), ctx);
  const D = ctx.KIVO.BassamDepts; assert.ok(D && D.moveNode, 'BassamDepts موجودة');
  const M = rd('permissions/331-perm-model.js');
  const store = { caps: { a: ['emps', 'tasks', 'help'], d: ['emps'] }, emps: {} };
  Object.assign(ctx, { PAGE_KEYS, permStore: () => store, permSave: () => {}, isSuper: () => !!(user && user.role === 'super'), curDept: () => D.active() });
  /* V7 · د6 (ب4): البذرُ الجديد يقرأ الأنظمةَ التي تُطفأ من المحرّك (هنا بديلٌ مصطنع: tasks · plan · daily · help — وemps وadmin دائمتان) */
  ctx.KIVO.Perm44 = { sysList: () => ['tasks', 'plan', 'daily', 'help'].map((k) => ({ key: k, toggle: true, leaves: [k] })) };
  Object.assign(ctx, { PAGE_OF: {}, subKeysOf: () => [], onCap: (k, d) => ctx.deptCap(d).indexOf(k) !== -1 });
  /* V7 · د6 (optIn): deptCap يقرأ السقفَ المفتوح من pageOpen (كلُّ الصفحات إلا أنظمةَ optIn من Perm44.sysList) — فتُحمَّل معه */
  for (const f of ['splitLeaf', 'rawCap', 'hasCap', 'effCap', 'capSetAnywhere', 'pageOpen', 'deptCap', 'seedSystems', 'seedOnAt', 'seedMode', 'seedUnit', 'seedCapFrom']) { const t = fnSrc(M, f, true); if (t) vm.runInContext(t, ctx); }
  vm.runInContext(fnSrc(M, 'seedSectionCap'), ctx);
  vm.runInContext(rd('services/440-count.js'), ctx);
  ctx.KIVO.BassamPerm = { seedCapFrom: ctx.seedCapFrom, seedSectionCap: ctx.seedSectionCap, hasCap: ctx.hasCap, deptCap: ctx.deptCap, effCap: ctx.effCap };
  ctx.KIVO.BassamAuth = { user: () => user, isSuper: () => !!(user && user.role === 'super') };
  Object.assign(ctx, { D });
  vm.runInContext(fnSrc(rd('auth/330-auth.js'), 'gmDepts'), ctx);
  D.saveNodes([{ id: 'top', name: 'الإدارة العليا', kind: 'إدارة عليا' }, { id: 'g1', name: 'الإدارة العامة 1', kind: 'إدارة عامة', pid: 'top' },
    { id: 'g2', name: 'الإدارة العامة 2', kind: 'إدارة عامة', pid: 'top' }]);
  D.save([{ id: 'a', name: 'إدارة أ', gid: 'g1' }, { id: 'b', name: 'إدارة ب', gid: 'g1' }, { id: 'd', name: 'إدارة د', gid: 'g2' },
    { id: 's1', name: 'قسم أ-1', gid: 'a', kind: 'قسم' }, { id: 's2', name: 'قسم د-1', gid: 'd', kind: 'قسم' }]);
  return { D, ctx, store };
}
const SUPER = { id: 'su', role: 'super' }, MGR_A = { id: 'ma', role: 'staff', mgr: true, deptId: 'a', ekey: 'mgr:a' };

const SRC_RD = rd;

test('F01 ui (1) المبدّل: مديرُ الإدارة يُعرض له إدارتُه وأقسامُها — وغيرُه نطاقُه وحده', () => {
  const { D } = world(SUPER);
  assert.deepEqual(J(D.switchUnits(MGR_A)), ['a', 's1'], 'حاملُ الشارة في الإدارة أ');
  assert.deepEqual(J(D.switchUnits({ id: 'da', role: 'dept', deptId: 'd' })), ['d', 's2'], 'حسابُ الإدارة د');
  assert.deepEqual(J(D.switchUnits({ id: 'e', role: 'staff', deptId: 'a', ekey: 'e' })), ['a'], 'الموظفُ العاديّ: إدارتُه وحدها');
  assert.deepEqual(J(D.switchUnits({ id: 'sm', role: 'staff', mgr: true, deptId: 's1', ekey: 'mgr:s1' })), ['s1'], 'مديرُ القسم: قسمُه وحده');
  assert.deepEqual(J(D.switchUnits({ id: 'g', role: 'gm', gid: 'g1' })).sort(), ['a', 'b', 's1'], 'مديرُ العقدة: إداراتُ فرعه وأقسامُها');
  assert.deepEqual(J(D.switchUnits({ id: 'gx', role: 'gm', gid: 'a' })), [], 'gm تالف (معرّفُه إدارة)');
  assert.equal(D.switchUnits(SUPER).length, 5);
  /* الترويسةُ والمبدّل في الغلاف يقرآن النموذجَ نفسَه */
  const RL = SRC_RD('layouts/root-logic.js'), T = SRC_RD('layouts/index.template.html');
  assert.match(RL, /D\.switchUnits\(meU\)/, 'المبدّل يعرض switchUnits لمدير الإدارة');
  assert.match(RL, /D\.unitLabel \? D\.unitLabel\(act\)/, 'اسمُ الوحدة النشطة أولاً');
  assert.match(RL, /d\.sec \? "↳ " \+ d\.name \+ " · قسم"/, 'القسمُ في المبدّل بعد إدارته بنوعه');
  assert.match(T, /\{\{lKpis\}\}/); assert.match(T, /\{\{lEmployees\}\}/); assert.match(T, /\{\{deptDdHead\}\}/);
});

test('F01 ui (2) الألفاظ: اسمُ الوحدة وكلمتُها · «N إدارة · M قسم» · صيغُ «قسم»', () => {
  const { D, ctx } = world(SUPER);
  assert.equal(D.unitLabel('s1'), 'قسم أ-1 · إدارة أ', 'اسمُ القسم أولاً ثم إدارتُه');
  assert.equal(D.unitLabel('a'), 'إدارة أ');
  assert.equal(D.unitWord('s1'), 'قسم'); assert.equal(D.unitAl('a'), 'الإدارة'); assert.equal(D.unitAl('s2'), 'القسم');
  assert.equal(D.unitCountTxt(['a', 'b', 's1', 's2']), 'إدارتان · قسمان');
  assert.equal(D.unitCountTxt(['a']), 'إدارة واحدة', 'بلا أقسام: لا ذكرَ لها');
  assert.equal(D.unitCountTxt([{ id: 'x', kind: 'قسم' }, { id: 'y' }, { id: 'z' }, { id: 'w' }]), '3 إدارات · قسم واحد', 'وسجلّاتٌ بنوعها');
  assert.equal(ctx.KIVO.BassamCount(11, 'قسم'), '11 قسماً');
  /* الصفحات: الموظفون والملفّ والإدارة بنوع الوحدة */
  const EL = SRC_RD('modules/employees/logic.js'), EV = SRC_RD('modules/employees/view.html');
  assert.match(EL, /"لا يوجد موظفون في " \+ al \+ " بعد"/); assert.match(EV, /\{\{empNoneTitle\}\}/);
  const PL = SRC_RD('modules/profile/logic.js');
  assert.match(PL, /sec0 \? "مدير القسم المعيَّن" : "مدير الإدارة المعيَّن"/); assert.match(PL, /"قسمك وما فوقه"/);
  assert.match(SRC_RD('services/441-notif-core.js'), /mgr:'مدير الإدارة أو القسم'/);
  assert.match(SRC_RD('auth/330-auth.js'), /function unitWord\(did\)/);
});

test('F01 ui (3) أفعالُ الشجرة: «إضافة قسم» للإدارة لا للقسم · حذفُ إدارةٍ لها أقسام مرفوضٌ بنصّه · والتنبيهاتُ بنوع الوحدة', () => {
  const { D } = world(SUPER);
  /* V7 · د6: أفعالُ الهيكل صارت في صفحة «الإدارات والصلاحيات» (src/modules/org) — «إضافة قسم» هي «+ إضافة تحتها» على إدارة (النافذةُ الواحدة بنوع «قسم» وأبٍ هو الإدارة)،
     والحذفُ من بطاقة «الموضع وأفعال الوحدة» وحدها: المرفوضُ يُعرض سببُه في نافذته قبل أي جرد */
  const AL = SRC_RD('modules/org/logic.js'), AV = SRC_RD('modules/org/view.html');
  assert.match(AL, /ogActAddOn: c\.struct && !inf\.isSec,/, 'الإضافةُ تحت الإدارة لا تحت القسم');
  assert.match(AL, /kind: p && p\.dept \? D\.NODE_KIND_SEC \|\| "قسم" : ""/, 'النافذةُ بنوع «قسم» وأبٍ هو الإدارة');
  assert.match(AV, /data-og-act="add-under" onClick="\{\{ogAddUnder\}\}" title="\{\{ogAddUnderTip\}\}">\+ إضافة تحتها<\/button>/);
  assert.match(AL, /const sw = this\._ogTry\(\(\) => D\.deptDelWhy\(inf\.id\), ""\);\r?\n\s*if \(sw\) return sw;/, 'الحذفُ يُرفض قبل الجرد بنصّ السبب');
  assert.match(AL, /if \(why\) return void this\.setState\(\{ ogDlg: \{ k: "del", id: inf\.id, msg: why \} \}\);/, 'والسببُ يُعرض في نافذة الحذف — لا جردَ ولا سؤال');
  assert.match(AL, /inf\.isNode \? "حذف العقدة" : inf\.isSec \? "حذف القسم" : "حذف الإدارة"/);
  assert.match(D.deptDelWhy('a'), /أقسام/);
  /* التنبيهات (442 ← 320 unitEvents) */
  const L0 = D.list(), L1 = L0.concat([{ id: 's9', name: 'قسم أ-9', gid: 'a', kind: 'قسم' }]);
  assert.deepEqual(J(D.unitEvents(L0, L1, 'مدير')), [{ t: 'sy_dept', vars: { 'الفعل': 'أُنشئ قسم', 'الإدارة': 'قسم أ-9', 'التفصيل': 'تحت «إدارة أ»' } }]);
  assert.deepEqual(J(D.unitEvents(L1, L0, 'مدير')), [{ t: 'sy_ddel', vars: { 'النوع': 'قسم', 'الإدارة': 'قسم أ-9', 'المُعدّل': 'مدير' } }]);
  assert.equal(J(D.unitEvents(L0, L0.concat([{ id: 'x', name: 'إدارة س' }])))[0].vars['الفعل'], 'أُنشئت إدارة');
  assert.match(SRC_RD('services/442-notif-observer.js'), /D\.unitEvents\(o, n, who\(\)\)/);
});

/* V7 · د6 (ب4 — قرار المالك): القسمُ الجديد بالاختيار نفسِه والافتراضيِّ نفسِه — كانت الحالةُ تثبّت «لقطةً من سقف الإدارة الأم ('snap')، وبلا سقفٍ في السلسلة
   لا سجلّ ('open')»؛ صارت: 'off' (الافتراضي) الصفحاتُ الدائمة وحدها · 'parent' أنظمةُ إدارته الفعلية (سقفُها ∩ أسلافُها) · سجلٌّ صريح دائماً · مرةً واحدة. */
test('F01 ui (4) بذرُ سقف القسم (V7 · د6 · ب4): مطفأٌ افتراضاً · «نفس أنظمة الأب» = أنظمةُ إدارته الفعلية ولو بلا سجلٍّ خاصّ لها · مرةً · قسمُ تلك الإدارة وحده', () => {
  /* الإدارة ب بلا سجلّ سقف · وعقدتُها g1 مضبوطة */
  let W = world(SUPER); W.store.caps.g1 = ['emps', 'help'];
  let r = W.D.sectionAdd({ name: 'قسم ب-1', deptId: 'b' });
  assert.equal(r.ok, true); assert.equal(r.cap, 'off');
  assert.deepEqual(J(W.store.caps[r.id]), ['emps', 'admin'], 'الافتراضي: الصفحاتُ الدائمة وحدها');
  assert.deepEqual(J(W.ctx.seedSectionCap(r.id, 'b', { seed: 'parent' })), { ok: true, kept: true }, 'مرةً واحدة');
  r = W.D.sectionAdd({ name: 'قسم ب-1ب', deptId: 'b', seed: 'parent' });
  assert.equal(r.cap, 'parent'); assert.deepEqual(J(W.store.caps[r.id]), ['emps', 'admin', 'help'], 'أنظمةُ الإدارة الفعلية (الموروثة من عقدتها)');
  /* إدارةٌ لها سجلّ: أنظمتُها الفعلية (تقاطعُها مع أسلافها) */
  W = world(MGR_A); W.store.caps.g1 = ['emps', 'help', 'plan'];
  r = W.D.sectionAdd({ name: 'قسم أ-2', deptId: 'a', seed: 'parent' });
  assert.deepEqual(J(W.store.caps[r.id]), ['emps', 'admin', 'help'], 'تقاطعُ أنظمة الإدارة أ مع عقدتها');
  /* لا سقفَ في السلسلة كلِّها مع 'parent': كلُّ الأنظمة — بسجلٍّ صريح (كان: لا سجلّ) · ولا بذرَ لغير قسمِ تلك الإدارة */
  W = world(SUPER);
  r = W.D.sectionAdd({ name: 'قسم ب-2', deptId: 'b', seed: 'parent' });
  assert.equal(r.cap, 'parent'); assert.deepEqual(J(W.store.caps[r.id]), PAGE_KEYS);
  assert.equal(W.ctx.seedSectionCap('s2', 'a').ok, false, 'ليس قسماً لهذه الإدارة');
});

/* V7 · د5-هـ (44) (قرار المالك): زرُّ «+ قسم» في القائمة الجانبية حُذف — الأقسامُ يضيفها مدير المنصة من «الإدارات» وحدها.
   الحالةُ التي كانت تثبّته (موضعُه · شرطُه · حوارُه) حُذفت معه، ومكانَها: لا أثرَ له في القالب ولا في المنطق. */
test('V7 · د5-هـ (44): زرُّ «+ قسم» محذوفٌ من القائمة الجانبية (القالب والمنطق والأنماط)', () => {
  const tpl = fs.readFileSync(path.join(SRC, 'layouts/index.template.html'), 'utf8'), rl = fs.readFileSync(path.join(SRC, 'layouts/root-logic.js'), 'utf8'), css = fs.readFileSync(path.join(SRC, 'layouts/helmet-global.css'), 'utf8');
  for (const [n, t] of [['القالب', tpl], ['المنطق', rl], ['الأنماط', css]]) assert.ok(!/secAddOn|secAdd\b|s-secadd/.test(t), n + ': لا «+ قسم»');
});
