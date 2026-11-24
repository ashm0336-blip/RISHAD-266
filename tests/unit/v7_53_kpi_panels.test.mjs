/* V7 · 53 (ملحق مؤشرات الكانفس: ك9–ك16 · ك27) — لوحاتُ الكثافة والمصليات والتوزيع في «الجولات اليومية» على منطق الصفحة الحقيقي
   (src/systems/daily/client/logic.js داخل node:vm · tests/unit/v7_53_kpi_world.mjs) بعوالمَ اصطناعية (TEST_ONLY).
   DAILY_LOGIC=<مسار> يبدّل ملفَّ المنطق (لإثبات الإخفاق على السابق). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { ROOT } from './harness.mjs';
import { covWorld, texts, SH } from './v7_53_kpi_world.mjs';

const id = (x) => 'TEST_ONLY_' + x;
const P = (x, sh = SH[1]) => ({ id: id(x), shift: sh });
const render = (o) => covWorld(o).c.renderVals();
const T = (n) => texts(n).join(' ¦ ');

test('ك9: المصلّى بلا قراءة تحت «بلا قراءة» — لا يُحسب 0٪ «منخفضة»', () => {
  const zones = [{}, {}, { count: 20 }, { off: true }];
  const v = render({ zones, st: { lens: 'density', densDim: 'summary' } });
  const t = T(v.lensSumNode);
  assert.match(t, /الامتلاء ¦ .*بلا قراءة — مصلَّيان/, 'الامتلاء: «بلا قراءة» مصلَّيان');
  assert.match(t, /منخفضة — مصلى واحد/, '«منخفضة» للمقروء 20٪ وحده (كان 3)');
  const list = JSON.stringify(v.registryRows || []);
  assert.ok(!/منخفضة · بلا قراءة/.test(list), 'قائمةُ المصليات: «بلا قراءة» لا «منخفضة · بلا قراءة»');
});

test('ك10: «بلا قراءة» للمفعّل غير المقروء وحده · المعطّلُ في سطره · أساسٌ واحد في اللوحة', () => {
  const zones = [{}, { count: 50 }, { off: true }, { off: true, ztype: 'TEST_ONLY_T' }];
  const t = T(render({ zones, st: { lens: 'density', densDim: 'summary' } }).lensSumNode);
  assert.match(t, /^4 ¦ إجمالي مصليات الدور ¦ مقروءة ¦ 1 ¦ 50٪ ¦ بلا قراءة ¦ 1 ¦ 50٪/, 'الرأس 4 · «بلا قراءة» 1 (كان 3 بخلط المعطّل)');
  assert.match(t, /القياس ¦ .*معطّلة — مصلَّيان/, 'القياس: سطرُ «معطّلة» مستقلّ');
  /* كل تفصيلٍ يُجمع إلى 4 (أساسُ الرأس) — كان «النوع» وغيرُه على المفعّلة وحدها (2) */
  assert.match(t, /النوع والفئة ¦ .*معطّلة — مصلَّيان/, 'النوع والفئة: المعطّل في سطره (أساسٌ واحد)');
});

test('ك11: شريطُ الحقل فوق الخريطة بعنوانٍ يذكر نطاقه «كل الأدوار» · وكلمةٌ واحدة «معطّلة» للمصلّى', () => {
  const extra = (W) => vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/systems/daily/client/520-field-monitor.js'), 'utf8'), W.win, { filename: '520' });
  const v = render({ zones: [{ off: true, fAt: 1000, code: 'TEST_ONLY_Z' }, {}], extra });
  assert.equal(v.fdBarOn, true);
  assert.equal(v.fdBarSumLbl, 'كل الأدوار');
  assert.match(v.fdBarSumTip, /^كل الأدوار/);
  const it = v.fdBarItems.find((x) => /TEST_ONLY_Z|Z0/.test(x.name + x.tip));
  assert.ok(it, 'المصلّى المعطّل في الشريط');
  assert.match(it.sub, /^معطّلة/, 'كان «مغلق»');
  const view = fs.readFileSync(path.join(ROOT, 'src/systems/daily/client/view.html'), 'utf8');
  assert.ok(view.includes('<div class="fd-sum" title="{{fdBarSumTip}}">') && view.includes('<span>{{fdBarSumLbl}}</span>'), 'العنوانُ في الشريط نفسِه');
});

test('ك12: تقريبٌ واحد في المنصة — 1 من 28 معطّلة «3.6٪» في الرأس كما في الجدول (كان 4٪)', () => {
  const zones = Array.from({ length: 28 }, (_, i) => (i ? {} : { off: true }));
  const t = T(render({ zones, st: { brkDim: 'region' } }).sumNode);
  assert.match(t, /^28 ¦ إجمالي مصليات الدور ¦ مفعّلة ¦ 27 ¦ 96٪ ¦ معطّلة ¦ 1 ¦ 3\.6٪/);
});

test('ك13: «إجمالي المصليات» يذكر أنه للدور الحالي', () => {
  const t = T(render({ zones: [{}, {}], st: { brkDim: 'region' } }).sumNode);
  assert.match(t, /إجمالي مصليات الدور/);
});

test('ك14: «متاح للتسكين» يستبعد الطاقم الإشرافي (قاعدة «حالة التغطية» نفسُها) ويُذكر «منهم إشرافي»', () => {
  const people = [P('a'), P('b'), P('s'), P('t')];
  const t = T(render({ people, zones: [{ emp: [id('a')], needN: 2 }], sup: [id('s'), id('t')], st: { brkDim: 'dsum' } }).lensSumNode);
  assert.match(t, /^4 ¦ الحضور الفعلي — الثانية · منهم إشرافي 2 ¦ مسكّنون ¦ 1 ¦ 25٪ ¦ متاح للتسكين ¦ 1 ¦ 25٪/, 'متاح 1 (كان 3 بعدّ الإشرافيَّين)');
});

test('ك15: العجزُ = مجموع عجز كل موقع والزائدُ = مجموع زائد كل موقع (لا صافي) · المعطّلُ خارج الاحتياج', () => {
  const people = ['a', 'b', 'c', 'd'].map((x) => P(x));
  const zones = [{ emp: [], needN: 2, region: 'TEST_ONLY_R' }, { emp: [id('a'), id('b'), id('c')], needN: 1, region: 'TEST_ONLY_R' }, { emp: [id('d')], needN: 5, off: true, region: 'TEST_ONLY_R' }];
  const v = render({ people, zones, st: { brkDim: 'dsum' } }), j = JSON.stringify(v.lensSumNode);
  const row = (j.match(/"title":"TEST_ONLY_R — [^"]*"/) || [''])[0];
  assert.match(row, /الاحتياج 3 /, 'الاحتياج 3 — المعطّل (5) خارجه');
  assert.match(row, /المتبقي 2 · فائض 2/, 'عجز موقعٍ (2) لا يُخفيه فائضُ آخر (2)');
  const tot = (j.match(/"title":"الإجمالي — [^"]*"/) || [''])[0];
  assert.match(tot, /المتبقي 2 · فائض 2/);
});

test('ك16: بلا احتياجٍ لكل القيم «لا احتياج محدد» لا «كل القيم متساوية الاحتياج 0»', () => {
  const t = T(render({ people: [P('a')], zones: [{ emp: [id('a')], region: 'TEST_ONLY_R1' }, { region: 'TEST_ONLY_R2' }], st: { brkDim: 'dsum' } }).lensSumNode);
  assert.match(t, /لا احتياج محدد/);
  assert.doesNotMatch(t, /كل القيم متساوية الاحتياج ¦ 0/);
});

test('ك27: الكودُ الميّت الذي يحسب مؤشراتٍ قديمة لا تُعرض حُذف — والصفحة ترسم كما هي', () => {
  const src = process.env.DAILY_LOGIC ? fs.readFileSync(process.env.DAILY_LOGIC, 'utf8') : fs.readFileSync(path.join(ROOT, 'src/systems/daily/client/logic.js.tpl'), 'utf8');
  assert.ok(!src.includes('Be.filter((t) => t && t.code && !je.has(t.code)).length'), 'مقارنةُ الدور بالخطة (نتيجةٌ تُرمى)');
  assert.ok(!src.includes('pe.length && Math.round((Ie / pe.length) * 100)'), 'نسبةُ الأبواب المفتوحة (نتيجةٌ تُرمى)');
  assert.ok(render({ zones: [{}] }).covNode !== undefined);
});

test('ك24 (تحقّق — أصلحته 52): لا «قالب صلاحيات موسوم» في الموضعين — تلميحُ «الطاقم الإشرافي» في «حالة التغطية» ومجموعةُ «طاقم إشرافي» في قائمة التسكين', () => {
  const src = process.env.DAILY_LOGIC ? fs.readFileSync(process.env.DAILY_LOGIC, 'utf8') : fs.readFileSync(path.join(ROOT, 'src/systems/daily/client/logic.js.tpl'), 'utf8');
  assert.ok(!src.includes('قالب صلاحيات موسوم'), 'النصُّ القديم غائب');
  assert.ok(src.includes('"حاملو دورٍ إشرافي من أدوار الإدارة ورئيس ونائب الوردية من تقرير اليوم — لا يُسكَّنون ولا يُحسبون في التغطية"'), 'الموضع الأول (تلميح الكرت)');
  assert.ok(src.includes('["sup", "طاقم إشرافي", !1, "دورٌ إشرافي من أدوار الإدارة أو رئيس/نائب الوردية من تقرير اليوم — خارج التسكين"]'), 'الموضع الثاني (قائمة التسكين)');
});
