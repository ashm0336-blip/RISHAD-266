/* RISHAD-266 · نقلُ إصلاحاتِ واجهةٍ صغيرة من الخطّ السابق (بالمعنى) — ما لا يغطّيه ملفُّ موجةٍ منقول:
   · F22 (12b58a2): في «الجدول الشهري» على الجوال عمودُ الاسم المثبّت لا يتجاوز 45vw فتبقى خليّتا «الصلاحيات» والورديّة قابلتين للّمس،
     وتمريرُ قائمة المنتقي نفسِها (قوالب/ورديّات طويلة) لا يغلقها — وتمريرُ الصفحة يغلقها كما كان.
   · F20 (97a8f96 · 47425c8 — L-06/L-07): لا مراقبَ يعيد رسمَ أشرطة التبويبات بعد أول رسم (190-tabstrip-unify)، ولا تبويبَ «مهام الموظفين»
     المعطَّل دائماً في «موظفو الإدارة» (ولا استيرادَ صفحة المهام كاملةً فيه). سجلُّ النشاط (L-08) لا يُعاد بناؤه هنا.
   · F04 (ab2b0e5 — جزءُ الواجهة): شارةُ «مدير الإدارة» لا تعِد بأن حاملها «يرث كل الصفحات» — الصياغةُ الصادقة.
   منطقُ الوحدة الحقيقي في vm (w1_pages.mjs) وبنيةُ المصدر. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { page } from './w1_pages.mjs';
import { SRC } from './harness.mjs';

const rd = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');
const OPS = { resources: [], status: () => ({ state: 'idle', epoch: 0 }), begin: () => ({ ok: true }), get: () => null, context: () => null, state: () => 'ready' };

test('F22 · 170-freeze: تحت 640px عمودُ الهوية المثبّت يضيق إلى محتواه (width:1px) بسقف 45vw ومحتواه بسقف calc(45vw - 24px)', () => {
  const css = rd('styles/170-freeze.css');
  const i = css.indexOf('@media (max-width:640px){'), m = css.slice(i, css.indexOf('\n}', i));
  assert.ok(i > 0, 'كتلةُ الجوال');
  assert.match(m, /\.bs-rtable\.bs-fitcols \.bs-fz\{right:auto !important\}/, 'ما قبل الهوية يُطلق كما كان');
  assert.match(m, /\.bs-rtable\.bs-fitcols \.bs-fzkeep\{right:0 !important;width:1px;max-width:45vw;box-sizing:border-box\}/);
  assert.match(m, /\.bs-rtable\.bs-fitcols \.bs-fzkeep>\*\{max-width:calc\(45vw - 24px\)\}/);
  /* «الجدول الشهري» يحمل الصنفين على عمود الاسم والجدولُ fit-cols — فالقاعدةُ تصيبه */
  const v = rd('modules/staff/view.html');
  assert.match(v, /<table class="bs-rtable bs-fitcols"[^>]*min-width:1300px/);
  assert.match(v, /<td data-label="اسم الموظف" class="bs-fz bs-fz3 bs-fzkeep"/);
});

test('F22 · منتقي الجدول الشهري: تمريرُ القائمة نفسِها لا يغلقها · وتمريرُ الصفحة يغلقها · والقائمةُ تعيد white-space (سطرُ الحالة الفارغة لا يُقصّ)', () => {
  const P = page('staff', { srv: { operations: OPS, rev: () => 0 } }), c = P.c;
  c._pkScrollClose();
  assert.equal(typeof c._sdSc, 'function');
  for (const [open, sel] of [['pmOpen', '[data-pm="list"]'], ['sdOpen', '[data-sd="list"]']]) {
    c.setState({ [open]: 'TEST_ONLY_e1', pmPos: { top: 1 }, sdPos: { top: 1 } });
    const inList = { closest: (q) => (q.split(',').includes(sel) ? {} : null) };
    c._sdSc({ target: inList });
    assert.equal(c.state[open], 'TEST_ONLY_e1', open + ': تمريرٌ داخل القائمة لا يغلقها');
    c._sdSc({ target: { closest: () => null } });
    assert.equal(c.state[open], null, open + ': تمريرُ الصفحة يغلقها');
    c.setState({ [open]: 'TEST_ONLY_e1' }); c._sdSc(); assert.equal(c.state[open], null, open + ': حدثُ resize بلا هدف يغلقها');
  }
  assert.match(c._pkListStyle(null), /text-align:right;white-space:normal$/);
  assert.match(c._pkListStyle({ left: 1, top: 2, w: 3 }), /^position:fixed;left:1px;top:2px;width:3px;.*white-space:normal$/);
  const v = rd('modules/staff/view.html');
  assert.ok(v.includes('<div data-pm="list" style="{{e.pmListStyle}}">') && v.includes('<div data-sd="list" style="{{e.sdListStyle}}">'), 'القائمتان تحملان الوسم الذي يُفحص');
});

test('F20 · L-06: لا مراقبَ أشرطة التبويبات بعد أول رسم — الملفُّ ومدخلُه في blocks.json وسطرُه في القالب محذوفة', () => {
  assert.equal(fs.existsSync(path.join(SRC, 'components/190-tabstrip-unify.js')), false);
  assert.doesNotMatch(rd('blocks.json'), /190-tabstrip-unify/);
  assert.doesNotMatch(rd('layouts/index.template.html'), /190-tabstrip-unify/);
});

test('F20 · L-07: «موظفو الإدارة» بلا تبويب «مهام الموظفين» المعطَّل دائماً ولا استيرادِ صفحة المهام — والتبويباتُ الباقية كما هي', () => {
  const v = rd('modules/employees/view.html'), l = rd('modules/employees/logic.js');
  assert.doesNotMatch(v, /empTasksAllowed|empOnTasks|empGoTasks|<dc-import name="Tasks"/);
  assert.doesNotMatch(l, /empTasksAllowed|empOnTasks|empGoTasks|empTasksTab/);
  for (const k of ['empDataAllowed', 'empCustodyAllowed', 'empOnData', 'empOnCustody']) assert.ok(v.includes('{{' + k + '}}'), k);
  assert.doesNotMatch(rd('pages/Employees.dc.html'), /<dc-import name="Tasks"/, 'الصفحةُ المولَّدة');
});

test('F04 · شارةُ «مدير الإدارة»: لا وعدَ بـ«يرث كل صفحات إدارته» — يدير الحسابات والصلاحيات ويمنح مما يملك وصفحاتُه ورقتُه', () => {
  for (const f of ['modules/employees/logic.js', 'modules/employees/view.html', 'auth/330-auth.js', 'pages/Employees.dc.html']) assert.doesNotMatch(rd(f), /يرث كل صفحات|يرث سقف إدارته ═══|رجعت صلاحياته الفردية/, f);
  const l = rd('modules/employees/logic.js'), v = rd('modules/employees/view.html');
  assert.ok(l.includes('"مدير الإدارة — يدير حسابات موظفيها وصلاحياتهم ويمنحهم مما يملكه؛ وصفحاتُه كما في ورقته ما لم يوسّعها مدير النظام"'));
  assert.ok(l.includes('" مديراً للإدارة — يدير حسابات موظفيها وصلاحياتهم ويمنحهم مما يملكه، وتبقى صفحاتُه كما في ورقته الحالية ما لم يوسّعها مدير النظام"'));
  assert.ok(l.includes('" مديراً — لم يعد يدير الحسابات والصلاحيات، وبقيت صفحاتُه كما في ورقته"'));
  assert.ok(v.includes('title="حاملُ الشارة يدير حسابات موظفي إدارته وصلاحياتهم ويمنحهم مما يملكه — وتبقى صفحاتُه كما في ورقته الحالية ما لم يوسّعها مدير النظام"'));
});
