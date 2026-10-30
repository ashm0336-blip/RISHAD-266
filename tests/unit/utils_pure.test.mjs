/* KIVO_263 · SOT-104 — الأدواتُ المنصّية الصغيرة نقيّةٌ وقابلةٌ للاختبار بلا متصفح ولا وحدة أعمال (قاعدةُ R4 في tools/deps_check.py):
   صيغةُ العدد والمعدود (440 BassamCount) · مفتاحُ الموظف الموحّد (490 BassamEmp) · بدائياتُ عرض المؤشرات (390 BassamMix) · محرّكُ البحث الموحّد (332 BassamFind) —
   كلٌّ في سياق vm معزول؛ والنقاءُ: الاستدعاءُ مرّتين بالمدخل نفسِه = المخرجُ نفسُه، ولا يمسّ المدخل. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { blockFile } from './harness.mjs';
function block(names, pre) {
  const w = { addEventListener() {}, setTimeout, clearTimeout, console };
  const ctx = vm.createContext({ window: w, console, setTimeout, clearTimeout, Intl, document: { body: null, addEventListener() {}, documentElement: {} } });
  let ns = null; try { ns = blockFile('005-kivo-ns.js'); } catch (e) { ns = null; }
  if (ns) { vm.runInContext(fs.readFileSync(ns, 'utf8'), ctx, { filename: '005-kivo-ns.js' }); ctx.KIVO = w.KIVO; } else ctx.KIVO = w;
  if (pre) pre(ctx.KIVO);
  for (const n of [].concat(names)) vm.runInContext(fs.readFileSync(blockFile(n), 'utf8'), ctx, { filename: n });
  return ctx.KIVO;
}
const same = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m);
test('BassamCount — قاعدةُ العدد والمعدود (الحكمُ لآخر رقمين) · الأرقامُ العربية · النقاء', () => {
  const C = block('440-count.js').BassamCount;
  const F = ['موظف واحد', 'موظفان', 'موظفَين', 'موظفين', 'موظفاً', 'موظف'];
  assert.equal(C(1, F), 'موظف واحد'); assert.equal(C(2, F), 'موظفان'); assert.equal(C(2, F, 'g'), 'موظفَين');
  assert.equal(C(3, F), '3 موظفين'); assert.equal(C(10, F), '10 موظفين'); assert.equal(C(11, F), '11 موظفاً'); assert.equal(C(99, F), '99 موظفاً');
  assert.equal(C(100, F), '100 موظف'); assert.equal(C(103, F), '103 موظفين'); assert.equal(C(111, F), '111 موظفاً'); assert.equal(C(0, F), '0 موظف');
  assert.equal(C('١٢', F), '١٢ موظفاً', 'الأرقامُ العربية تُقرأ والعددُ يُكتب كما هو');
  assert.equal(C(2.5, F), '2.5 موظف', 'الكسرُ ⇒ صيغةُ المفرد');
  assert.equal(C(5, F), C(5, F), 'نقيّة');
});
test('BassamEmp — المفتاحُ الرسمي eid ثم nid ثم الاسم · القراءةُ المتسامحة · لا يمسّ المدخل', () => {
  const E = block('490-emp-key.js').BassamEmp;
  const e = { eid: 'E1', nid: '1234567890', name: 'أحمد' }; const e0 = JSON.stringify(e);
  assert.equal(E.key(e), 'E1'); assert.equal(E.key({ nid: 'N', name: 'x' }), 'N'); assert.equal(E.key({ name: 'x' }), 'x'); assert.equal(E.key(null), '');
  same(E.tokens(e), ['E1', '1234567890', 'أحمد']);
  assert.equal(E.entry({ '1234567890': 7 }, e), 7, 'تسكينٌ قديمٌ بالهوية يُقرأ'); assert.equal(E.entryKey({ 'أحمد': 1 }, e), 'أحمد'); assert.equal(E.entry({}, e), null);
  assert.equal(JSON.stringify(e), e0, 'المدخلُ لم يتغيّر');
});
test('BassamMix.rowStyles — نقيّةٌ وحتمية (لا DOM) · الافتراضاتُ معلنة', () => {
  const M = block('390-kpi-primitives.js').BassamMix;
  const a = M.rowStyles({ pc: 40, lead: true }), b = M.rowStyles({ pc: 40, lead: true });
  same(a, b, 'حتمية'); assert.ok(a && typeof a === 'object' && Object.keys(a).length > 0);
  assert.notEqual(JSON.stringify(M.rowStyles({ pc: 10 })), JSON.stringify(M.rowStyles({ pc: 90 })), 'النسبةُ تؤثّر');
  const o = { pc: 50, color: '#123456' }; const o0 = JSON.stringify(o); M.rowStyles(o); assert.equal(JSON.stringify(o), o0, 'المدخلُ لم يتغيّر');
});
test('BassamFind — توحيدُ الكتابة (الهمزات · الأرقام العربية) · الدقيقةُ ثم الواسعة (بأي ترتيب)', () => {
  const K = block('332-find-day.js', (KIVO) => { KIVO.__BS_I = { auth: { cur: () => null, isMgrKey: () => false } }; });
  const F = K.BassamFind; assert.ok(F, 'المحرّك محمَّل');
  assert.ok(F.match('احمد', ['أحمد علي']), '«احمد» يجد «أحمد»'); assert.ok(F.hitLoose(F.tok('علي احمد'), ['أحمد علي']), 'الطبقةُ الواسعة: بأي ترتيب');
  assert.ok(F.match('٠٥٠١', ['0501234567']), 'الأرقامُ العربية'); assert.ok(!F.match('خالد', ['أحمد علي']), 'وما ليس فيه لا يُطابق');
  assert.equal(F.dig('١٢٣'), '123');
  const L = [{ n: 'أحمد علي' }, { n: 'خالد' }]; same(F.filter('احمد', L, (x) => [x.n]).map(x => x.n), ['أحمد علي']); same(F.filter('علي احمد', L, (x) => [x.n]).map(x => x.n), ['أحمد علي'], 'المصفاةُ تنزل إلى الواسعة حين تخلو الدقيقة');
});
