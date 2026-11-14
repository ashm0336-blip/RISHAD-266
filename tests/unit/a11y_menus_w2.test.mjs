/* الموجة 2 · قوائمُ «ملفات» بلا بنود (ES-6 · DG-02 · IRSZ-8) — منطقُ الوحدات الحقيقي داخل node:vm (صلاحياتٌ اصطناعية TEST_ONLY) وبنيةُ القوالب:
   · ES-6 «بيانات الموظفين»: الزرُّ يظهر لمن يملك الإضافة وحدها (empPmFiles = export || add) فيُفتح شريطاً فارغاً 10px — وكتلةُ الإضافة فارغة.
   · DG-02 «المهام»: الزرُّ بلا شرط، والبندان مشروطان بالتصدير، و</sc-if> في غير موضعه (داخل div البند) — فيُفتح فارغاً لمدير الإدارة.
   · IRSZ-8 «الاسترشاد» و«المضبوطات»: لمن لا يملك التصدير قائمةٌ بأيقونة تنزيل فيها فاصلٌ تائهٌ و«حذف الكل» وحده.
   الآن: «ملفات» لمن يملك التصدير وحده؛ والفاصلُ حين يجتمع التصديرُ والحذف؛ ومن يملك الحذفَ وحده يرى زرَّ «حذف الكل» صريحاً — والتأكيدُ نفسُه. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { ROOT, SRC, moduleLogic, moduleFile } from './harness.mjs';

const rd = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');
const SERVICES = ['src/services/060-percent-format.js', 'src/services/390-kpi-primitives.js', 'src/services/400-shift-need.js', 'src/services/440-count.js', 'src/services/410-gate-units.js',
  'src/i18n/380-hijri-fallback.js', 'src/services/420-round-factory.js', 'src/services/490-emp-key.js', 'src/services/290-activity-log.js', 'src/components/560-canvas-input.js', 'src/components/565-page-kit.js'];
function render(slug, perm) {
  const store = new Map(), KIVO = {};
  const ctx = { KIVO, console, setTimeout: () => 0, clearTimeout: () => 0, setInterval: () => 0, clearInterval: () => 0, requestAnimationFrame: () => 0, cancelAnimationFrame() {}, performance: { now: () => 1 },
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    document: { hidden: false, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, addEventListener() {}, removeEventListener() {} },
    navigator: { userAgent: 'node' }, addEventListener() {}, removeEventListener() {}, __BS_BOOT: { srv: 0 }, matchMedia: () => ({ matches: false }),
    React: { createElement: (t, p, ...ch) => ({ t, p, ch }), Fragment: 'F' } };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  class DCLogic { constructor() { this.state = {}; } setState(p, cb) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); if (cb) cb(); } }
  ctx.DCLogic = DCLogic;
  for (const f of SERVICES) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  KIVO.BassamFind = { dig: (v) => String(v == null ? '' : v), norm: (v) => String(v == null ? '' : v), filter: (q, list) => list, match: () => true };
  KIVO.__bsMixOn = () => false;
  KIVO.BassamPerm = { can: (k, a) => !!perm[a], on: () => true, lensOn: () => true };
  KIVO.BassamAuth = { user: () => ({ id: 'TEST_ONLY_dm', role: 'staff', mgr: true, deptId: 'tst_d1' }), isSuper: () => false, display: () => ({ name: 'TEST_ONLY' }), users: () => [] };
  KIVO.BassamDepts = { active: () => 'tst_d1', activeName: () => 'TEST_ONLY', list: () => [] };
  KIVO.BassamPick = { txt: () => '', plus: () => '' };
  /* RISHAD-266: خدمةُ العمليات بلا موارد — المخزنُ المحلّيّ الاصطناعيّ يُقرأ كما هو */
  KIVO.__BS_SRV = { operations: { resources: [], status: () => ({ state: 'idle', epoch: 0 }), context: () => null, state: () => 'ready', begin: () => ({ ok: true }), draft: () => null, get: () => null }, rev: () => 0 };
  const B0 = KIVO.BassamPageKit.base; KIVO.BassamPageKit.base = (B, a) => class extends B0(B, a) { bsOn() { return true; } bsLensOn() { return true; } bsToast() {} };
  vm.runInContext(moduleLogic(slug) + '\n;globalThis.__C = Component;', ctx, { filename: slug + '/logic.js' });
  return new ctx.__C().renderVals();
}
/* مدير الإدارة في TEST (export=false · add/edit/del=true) · ومن يملك التصدير · ومن يملك التصديرَ بلا حذف */
const DM = { view: true, add: true, edit: true, del: true, export: false }, EX = Object.assign({}, DM, { export: true }), EXONLY = { view: true, export: true };

/* مكدّسُ الوسوم (div · sc-if · sc-for · button · span): أيُّ إغلاقٍ لا يطابق آخرَ مفتوح = تداخلٌ مكسور */
function nest(src) {
  const re = /<(\/?)(div|sc-if|sc-for|button|span)\b[^>]*?(\/?)>/g, st = [], bad = []; let m;
  while ((m = re.exec(src))) { if (m[3]) continue; if (!m[1]) st.push(m[2]); else { const top = st.pop(); if (top !== m[2]) { bad.push(m[2] + '≠' + top); if (top) st.push(top); } } }
  return { bad, open: st.length };
}
/* كتلةٌ من القالب: من أول سطرٍ يطابق `from` إلى السطر الذي يطابق `to` بعده (شاملة) */
const block = (v, from, to) => { const i = v.indexOf(from), j = v.indexOf(to, i); assert.ok(i >= 0 && j > i, from); return v.slice(v.lastIndexOf('\n', i) + 1, j + to.length); };

test('ES-6 · «بيانات الموظفين»: «ملفات» لمن يملك التصدير وحده — مديرُ الإدارة بالإضافة بلا تصدير لا يرى زرّاً يفتح قائمةً فارغة', () => {
  assert.equal(render('employees', DM).empPmFiles, false);
  assert.equal(render('employees', EX).empPmFiles, true);
  const v = rd('modules/employees/view.html'), b = block(v, '<sc-if value="{{empPmFiles}}"', '<!-- ═══ الإجراءات الجماعية');
  assert.deepEqual(nest(b), { bad: [], open: 0 }, 'تداخلٌ سليم');
  assert.doesNotMatch(b, /<sc-if value="\{\{empPmAdd\}\}"[^>]*>\s*<\/sc-if>/, 'لا كتلةَ إضافةٍ فارغة');
  assert.doesNotMatch(b, /نافذة الطباعة مباشرة<\/div><\/div>\s*<\/div>\s*<div style="height:1px/, 'لا فاصلَ بعد آخر بند');
  assert.match(b, /onClick="\{\{exportCsv\}\}"[\s\S]*onClick="\{\{printTable\}\}"/);
});

test('DG-02 · «المهام»: الكتلةُ كلُّها تحت tkPmExport (كما في التقرير اليومي) والبندان مكتملان داخل شرطيهما — والتداخلُ سليم', () => {
  assert.equal(render('tasks', DM).tkPmExport, false);
  assert.equal(render('tasks', EX).tkPmExport, true);
  const v = rd('modules/tasks/view.html'), b = block(v, '<sc-if value="{{tkPmExport}}" hint-placeholder-val="{{ true }}">\n    <div style="position:relative">', '<!-- KIVO_265 · البند 14');
  assert.deepEqual(nest(b.slice(0, b.lastIndexOf('<!--'))), { bad: [], open: 0 }, 'كان </sc-if> داخل div البند');
  assert.match(b, /^<sc-if value="\{\{tkPmExport\}\}"[^>]*>\n\s*<div style="position:relative">\n\s*<button onClick="\{\{filesToggle\}\}"/);
  assert.match(b, /<sc-if value="\{\{permCanExport\}\}"[^>]*><div onClick="\{\{exportCsv\}\}"[\s\S]*?حسب الفلاتر الحالية<\/div><\/div>\n\s*<\/div><\/sc-if>/);
});

/* RISHAD-266 (دفعة الواجهات): IRSZ-8 كاملاً في الصفحتين — رُفع السقفان بقرارٍ موثّق (perf_budget.json · unifyBatch3Decision) */
const VIEWONLY = { view: true };
test('IRSZ-8 · «الاسترشاد» و«المضبوطات»: بلا تصدير ⇒ لا «ملفات» ولا فاصل، و«حذف الكل» زرٌّ صريح · بالتصدير والحذف ⇒ القائمةُ كما كانت بفاصلها', () => {
  for (const slug of ['irshad', 'seized']) {
    const vo = render(slug, VIEWONLY), dm = render(slug, DM), ex = render(slug, EX), exo = render(slug, EXONLY);
    assert.deepEqual([vo.irPmExport, vo.irLgSepOn, vo.irLgDelOnly], [false, false, false], slug + ': عرضٌ فقط — لا قائمة ولا زرّ');
    assert.deepEqual([dm.irPmExport, dm.irLgSepOn, dm.irLgDelOnly], [false, false, true], slug + ': مدير الإدارة');
    assert.deepEqual([ex.irPmExport, ex.irLgSepOn, ex.irLgDelOnly], [true, true, false], slug + ': تصديرٌ وحذف');
    assert.deepEqual([exo.irPmExport, exo.irLgSepOn, exo.irLgDelOnly], [true, false, false], slug + ': تصديرٌ بلا حذف — لا فاصلَ تائه');
    /* الزرُّ الصريح أحمرُ بالرموز الدلالية ومعطَّلُ المظهر حين لا سجلات (والطلبُ نفسُه يُردّ بسببه في irLgClearAllAsk) */
    assert.match(dm.irLgDelBtnStyle, /border:1px solid var\(--danger-border\);[^"]*background:var\(--danger-bg\);color:var\(--danger-text\);cursor:not-allowed;opacity:\.55$/);
    const v = rd(path.relative(SRC, moduleFile(slug, 'view.html'))), b = block(v, '<sc-if value="{{irLgDelOnly}}"', '<div style="height:20px;width:1px;background:var(--bg-xe2e8f0)"></div>');
    assert.deepEqual(nest(b.replace(/<!--[\s\S]*?-->/g, '')), { bad: [], open: 0 }, slug);
    assert.match(b, /<sc-if value="\{\{irLgDelOnly\}\}"[^>]*>\n\s*<button onClick="\{\{irLgClearAllAsk\}\}" title="حذف جميع [^"]*يُطلب التأكيد قبل الحذف" style="\{\{irLgDelBtnStyle\}\}">/, slug + ': الزرُّ يمرّ بالتأكيد');
    assert.match(b, /<sc-if value="\{\{irPmExport\}\}" hint-placeholder-val="\{\{ true \}\}">\n\s*<div style="position:relative">\n\s*<button onClick="\{\{irLgFilesToggle\}\}"/, slug + ': «ملفات» للتصدير');
    assert.match(b, /<sc-if value="\{\{irLgSepOn\}\}"[^>]*>\n\s*<div style="height:1px;background:var\(--bg-xf1f5f9\);margin:4px 2px"><\/div>\n<\/sc-if>/, slug + ': الفاصلُ مشروط');
    assert.doesNotMatch(v, /irLgFilesOn/, slug + ': لا صيغةَ مخفَّفة باقية');
  }
});

test('IRSZ-8 · «حذف الكل» بلا سجلاتٍ في الشهر لا يصمت: يقول السببَ وما يُفعل · وبلا صلاحية الحذف يمرّ برسالة الصلاحية', () => {
  for (const [slug, word] of [['irshad', 'تقارير'], ['seized', 'محاضر']]) {
    const src = moduleLogic(slug);
    assert.match(src, new RegExp('this\\.bsToast\\("لا ' + word + ' في " \\+ [A-Za-z]+ \\+ " " \\+ [A-Za-z]+ \\+ " هـ لحذفها — اختر شهراً فيه ' + word + '\\."\\)'), slug);
    const i = src.indexOf('irLgClearAllAsk: () => {'), body = src.slice(i, src.indexOf('},', i));
    assert.match(body, /this\.PC\("del"\)/); assert.match(body, /this\.permDeny\(\)/); assert.match(body, /irLgClearAllConfirm: !0/);
  }
});
