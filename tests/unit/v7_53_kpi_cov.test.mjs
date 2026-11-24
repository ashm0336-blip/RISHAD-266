/* V7 · 53 (ملحق مؤشرات الكانفس: ك2–ك8 · ك17 · وبند الفحص الحي 15) — «حالة التغطية» في «الجولات اليومية» على منطق الصفحة الحقيقي
   (src/systems/daily/client/logic.js داخل node:vm · tests/unit/v7_53_kpi_world.mjs) بعوالمَ اصطناعية (TEST_ONLY).
   DAILY_LOGIC=<مسار> يبدّل ملفَّ المنطق (لإثبات الإخفاق على السابق). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { covWorld, cov, tile, texts, SH } from './v7_53_kpi_world.mjs';

const id = (x) => 'TEST_ONLY_' + x;
const P = (x, sh = SH[1]) => ({ id: id(x), shift: sh });
/* اقتراحاتُ صفوف العجز بترتيبها: [{ row, who|null, none }] */
function suggestions(text) {
  const part = text.split('¦ عجز  ¦')[1] || '';
  const def = part.split('¦ فائض — مصدر التغطية')[0];
  return def.split(' ¦ اقتراح: ¦ ').slice(1).map((s) => (s.match(/TEST_ONLY (TEST_ONLY_\w+)/) || [])[1] || null);
}

test('ك2: زرُّ «توسيع مؤشرات التوزيع لكل الورديات» لا يمسّ «حالة التغطية» — ويغيّر مؤشرات التوزيع وحدها', () => {
  const people = [P('a'), P('b'), P('c', SH[0]), P('d', SH[0])];
  const zones = [{ emp: [id('a'), id('c')], needN: 2 }, { emp: [id('d')], needN: 2 }, { emp: [], needN: 1 }];
  const run = (all) => {
    const { c } = covWorld({ people, zones, st: { dsShiftAll: all } });
    const r = cov(c);
    c.state = Object.assign({}, c.state, { brkDim: 'dsum' });
    return { cov: r.text, dist: texts(c.renderVals().lensSumNode).join(' ¦ ') };
  };
  const off = run(false), on = run(true);
  assert.match(off.cov, /20% ¦ 1 من 5/, 'التغطية على «الوردية الثانية» وحدها: 1 من 5');
  assert.equal(on.cov, off.cov, '«حالة التغطية» نفسُها بالزرّ وبدونه (كان المسكَّنون من كل الورديات يُحسبون على احتياج الوردية)');
  assert.notEqual(on.dist, off.dist, 'مؤشرات التوزيع تتبع الزرّ');
  assert.match(on.dist, /الحضور الفعلي — كل الورديات/);
  assert.match(off.dist, /الحضور الفعلي — الثانية/);
});

test('ك3: كلُّ شخصٍ يُقترح لصفٍّ واحد — وما بعده يأخذ التالي · وإن نفد المصدر «لا فائض ولا احتياط متاح»', () => {
  const people = [P('a'), P('b'), P('r'), P('x'), P('y'), P('z')];
  const zones = [{ emp: [id('a'), id('b')], needN: 1 }, { emp: [], needN: 1, pri: 'أ' }, { emp: [], needN: 1, pri: 'ب' }, { emp: [], needN: 1, pri: 'ج' },
    { emp: [id('x'), id('y'), id('z')], needN: 3 }];
  const { c } = covWorld({ people, zones });
  const t = cov(c).text, s = suggestions(t);
  assert.equal(s.length, 2, 'اقتراحان فقط: فائضُ Z0 (1) والاحتياط (1)');
  assert.notEqual(s[0], s[1], 'شخصان مختلفان');
  assert.ok(s.includes(id('r')), 'الاحتياط مقترحٌ لصفّ');
  assert.equal((t.match(/لا فائض ولا احتياط متاح/g) || []).length, 1, 'الصفّ الثالث: نفد المصدر');
});

test('ك4: اقتراحُ الاحتياط يفحص «مكلَّف» كاقتراح الفائض', () => {
  const people = [P('a'), P('m')];
  const zones = [{ emp: [id('a')], needN: 1 }, { emp: [], needN: 1 }];
  const { c } = covWorld({ people, zones, muk: [id('m')] });
  const t = cov(c).text;
  assert.deepEqual(suggestions(t), [], 'المكلَّف من الاحتياط لا يُقترح');
  assert.match(t, /لا فائض ولا احتياط متاح/);
});

test('ك5: من على موقعٍ احتياجُه 0 مصدرٌ قابلٌ للنقل ويُعدّ في «متاح للتغطية»', () => {
  const people = [P('a'), P('b')];
  const zones = [{ emp: [id('a')], needN: 0 }, { emp: [id('b')] }, { emp: [], needN: 1 }];
  const { c } = covWorld({ people, zones });
  const r = cov(c);
  assert.equal(tile(r.node, 'متاح للتغطية').n, '2', 'متاح للتغطية = 2 (موقع احتياجه 0 + موقع بلا احتياج)');
  assert.ok([id('a'), id('b')].includes(suggestions(r.text)[0]), 'يُقترح منه لصفّ العجز');
});

test('ك6: «نفس الموقع» فقط إن كان للموقعين موقعٌ جغرافيٌّ وهو نفسُه', () => {
  const people = [P('a'), P('b')];
  const none = cov(covWorld({ people, zones: [{ emp: [id('a'), id('b')], needN: 1 }, { emp: [], needN: 1 }] }).c).text;
  assert.doesNotMatch(none, /نفس الموقع/, 'بلا موقعٍ جغرافيّ للموقعين: لا «نفس الموقع»');
  const same = cov(covWorld({ people, zones: [{ emp: [id('a'), id('b')], needN: 1, region: 'TEST_ONLY_R1' }, { emp: [], needN: 1, region: 'TEST_ONLY_R1' }] }).c).text;
  assert.match(same, /نفس الموقع/);
  const other = cov(covWorld({ people, zones: [{ emp: [id('a'), id('b')], needN: 1, region: 'TEST_ONLY_R1' }, { emp: [], needN: 1 }] }).c).text;
  assert.doesNotMatch(other, /نفس الموقع/, 'موقعٌ جغرافيٌّ لأحدهما فقط');
});

test('ك7: بلا احتياجٍ محدَّد الحلقةُ «—» بلونٍ محايد ونصُّها والقائمةُ «لا احتياج محدد»', () => {
  const { c } = covWorld({ people: [P('a')], zones: [{ emp: [id('a')] }, { emp: [] }] });
  const r = cov(c);
  assert.match(r.text, /¦ — ¦ لا احتياج محدد ¦/, 'الحلقة «—» وتحتها «لا احتياج محدد»');
  assert.doesNotMatch(r.text, /0%/);
  assert.doesNotMatch(r.text, /التغطية مكتملة/, 'لا «لا عجز — التغطية مكتملة ✓»');
  const ring = JSON.stringify(r.node).match(/"stroke":"(#[0-9a-f]+)","strokeWidth":8,"strokeLinecap"/);
  assert.equal(ring && ring[1], '#94a3b8', 'لونٌ محايد لا أحمر');
});

test('ك8: يومٌ أُقفل تلقائياً ولم يُعتمد ⇒ «مقفلة — مضى اليوم» · والمعتمد ⇒ «معتمدة»', () => {
  const zones = [{ emp: [], needN: 1 }];
  const past = cov(covWorld({ people: [P('a')], zones, past: true }).c).text;
  assert.match(past, /الجولة مقفلة — مضى اليوم/);
  assert.doesNotMatch(past, /معتمدة/);
  const ap = cov(covWorld({ people: [P('a')], zones, rec: { ap: true } }).c).text;
  assert.match(ap, /الجولة معتمدة — عرض فقط/);
});

test('15: «متاح للتغطية» = الاحتياط + الفائض لمن يمكن نقلُه فعلاً — سطرُ التفصيل والتلميحات · ولا سطرَ «الاحتياط غير المسكَّن» · ويتبع مخطط/فعلي', () => {
  /* Z0: احتياج 1 وعليه a + b(راحة) + m(مكلَّف) + s(إشرافي) · Z1: احتياج 0 وعليه c · احتياط: r1 · r2(مكلَّف) · r3(راحة) · s2(إشرافي) */
  const people = ['a', 'b', 'm', 's', 'c', 'r1', 'r2', 'r3', 's2', 'q'].map((x) => P(x));
  const zones = [{ emp: [id('a'), id('b'), id('m'), id('s')], needN: 1 }, { emp: [id('c')], needN: 0 }, { emp: [id('q')], needN: 3 }];
  const mk = (mode) => covWorld({ people, zones, muk: [id('m'), id('r2')], rest: [id('b'), id('r3')], sup: [id('s'), id('s2')], st: { covMode: mode } }).c;
  const plan = cov(mk('plan')), act = cov(mk('act'));
  const tp = tile(plan.node, 'متاح للتغطية');
  assert.ok(tp, 'الكرت الموجود: التبليطة «متاح للتغطية»');
  /* مخطط: فائض Z0 = (a,b,m)−1 = 2 لكن القابلُ للنقل a وحده ⇒ 1 · Z1: c ⇒ 1 · الاحتياط القابل للنقل r1 ⇒ 1 */
  assert.equal(tp.n, '3', 'مخطط: 1 احتياط + 2 فائض (الغائب والمكلَّف والإشرافي لا يُعدّون)');
  assert.match(tp.all, /احتياط 1 \| +· +\| فائض 2/, 'سطرُ التفصيل «احتياط 1 · فائض 2»');
  const json = JSON.stringify(tp.node);
  assert.ok(json.includes('حاضر لم يُسكَّن في أي موقع') && json.includes('مسكَّن فوق احتياج موقعه، قابل للنقل'), 'التلميحات');
  /* فعلي: Z0 الحاضرون a,m ⇒ فائض 1 والقابلُ للنقل a ⇒ 1 · Z1: 1 · الاحتياط 1 */
  assert.equal(tile(act.node, 'متاح للتغطية').n, '3');
  assert.doesNotMatch(plan.text, /الاحتياط غير المسكَّن/, 'سطرُ «الاحتياط غير المسكَّن» المنفصل حُذف');
  assert.doesNotMatch(plan.text, /فائض قابل للنقل/);
  assert.match(plan.text, /¦ فائض — مصدر التغطية/, 'مفهومُ الفائض باقٍ (قائمة المصدر)');
  /* الفائض يتبع الوضع: موقعٌ مخطَّطٌ فوق احتياجه بحاضرين */
  const z2 = [{ emp: [id('a'), id('c'), id('b')], needN: 2 }, { emp: [], needN: 1 }];
  const p2 = tile(cov(covWorld({ people, zones: z2, rest: [id('b')], st: { covMode: 'plan' } }).c).node, 'متاح للتغطية').all;
  const a2 = tile(cov(covWorld({ people, zones: z2, rest: [id('b')], st: { covMode: 'act' } }).c).node, 'متاح للتغطية').all;
  assert.match(p2, /فائض 1/, 'مخطط: a,c,b على احتياج 2 ⇒ فائض 1 (حاضر)');
  assert.match(a2, /فائض 0/, 'فعلي: الحاضرون a,c على احتياج 2 ⇒ لا فائض');
});

test('ك17: «الحاضرون الآن» بقاعدةٍ واحدة (الإشرافيُّ منهم) مع «منهم إشرافي N»', () => {
  const people = [P('a'), P('b'), P('s'), P('t')];
  const { c } = covWorld({ people, zones: [{ emp: [id('a')], needN: 1 }], sup: [id('s'), id('t')] });
  const t = cov(c).text;
  assert.match(t, /الحاضرون الآن 4 من 4 · منهم إشرافي 2/, 'كان «2 من 2»');
});
