/* RM-5 · AUD-025 — محرّكاتُ الواجهة النقيّة داخل Node (بلا متصفح): كلُّ كتلةٍ تُشغَّل في سياق vm مع window بديل —
   التاريخُ الهجري الاحتياطي (أم القرى عبر Intl ثم الجدولي) · صيغةُ النِسَب · الاحتياجُ لكل وردية · هويةُ العنصر (uid) · الأبوابُ الأم والفتحات */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { blockFile } from './harness.mjs';
function block(name, extra = {}) {
  const w = Object.assign({ crypto: globalThis.crypto, addEventListener() {}, setTimeout, clearTimeout, console }, extra);
  const ctx = vm.createContext(Object.assign({ window: w, crypto: globalThis.crypto, console, setTimeout, clearTimeout, Intl: extra.Intl || Intl, document: extra.document || { body: null, addEventListener() {}, documentElement: {} } }, extra.globals || {}));
  /* KIVO_258 · AUD-016 (إفصاح — عُدّة): الكتلُ تكتب KIVO.X — فالطبقةُ 005-kivo-ns تُحمَّل أوّلاً كما في الصفحة (أوّلُ كتلة)، وKIVO اسمٌ عامٌّ في السياق
     كما هو في المتصفح (window ≡ globalThis هناك؛ وهنا window كائنٌ بديل). ما يقرؤه الاختبارُ من window.X هو KIVO.X عبر موصِّل الطبقة — بلا تغييرٍ في التأكيدات.
     مصدرٌ أقدم بلا الطبقة (قبل 258) يُشغَّل كما كان. */
  let ns = null; try { ns = blockFile('005-kivo-ns.js'); } catch (e) { ns = null; }
  if (ns) { vm.runInContext(fs.readFileSync(ns, 'utf8'), ctx, { filename: '005-kivo-ns.js' }); ctx.KIVO = w.KIVO; }
  vm.runInContext(fs.readFileSync(blockFile(name), 'utf8'), ctx, { filename: name });
  return w;
}
const same = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m);   /* القيمُ من سياق vm لها نماذجُ أولية مختلفة؛ المقارنةُ بالبنية */
const umalqura = (d) => { const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {}; f.formatToParts(d).forEach(p => { o[p.type] = +p.value; }); return { y: o.year, m: o.month, d: o.day }; };

test('التاريخُ الهجري: BassamHijri.now = أم القرى (Intl) لعيّنة أيامٍ موزّعة · الجدوليّ الاحتياطي ضمن يومين عند فشل Intl · لا تاريخَ مجمَّداً', () => {
  const H = block('380-hijri-fallback.js');
  const days = [new Date(2026, 9, 9), new Date(2026, 0, 1), new Date(2027, 5, 30), new Date(2025, 2, 1), new Date(2030, 11, 31)];
  for (const d of days) same(H.BassamHijri.now(d), umalqura(d), 'Intl ' + d.toDateString());
  const BrokenIntl = { DateTimeFormat: function () { throw new Error('no umalqura'); } };
  const F = block('380-hijri-fallback.js', { Intl: BrokenIntl });
  let maxDiff = 0;
  for (let i = 0; i < 400; i += 7) { const d = new Date(2024, 0, 1 + i); const a = F.BassamHijri.now(d), b = umalqura(d); const da = a.y * 360 + a.m * 30 + a.d, db = b.y * 360 + b.m * 30 + b.d; maxDiff = Math.max(maxDiff, Math.abs(da - db)); assert.ok(a.y >= 1445 && a.y <= 1447 && a.m >= 1 && a.m <= 12, JSON.stringify(a)); }
  assert.ok(maxDiff <= 2, 'الجدوليّ يفرق عن أم القرى يومين على الأكثر (أقصى فرق ' + maxDiff + ')');
  assert.notEqual(JSON.stringify(F.BassamHijri.now(new Date(2026, 9, 9))), JSON.stringify(F.BassamHijri.now(new Date(2026, 9, 12))), 'يتحرّك مع الأيام (ليس ثابتاً)');
});
test('bsPct: أقلّ من 10٪ بمنزلة عشرية · ≥10 صحيح · <0.05 يُعرض «<0.1» · غيرُ الرقم 0', () => {
  const W = block('060-percent-format.js');
  for (const [v, want] of [[0, '0'], [0.04, '<0.1'], [-0.04, '-<0.1'], [0.05, '0.1'], [0.3, '0.3'], [2, '2'], [9.96, '10'], [9.94, '9.9'], [10, '10'], [10.4, '10'], [10.5, '11'], [99.5, '100'], [NaN, '0'], ['abc', '0'], [Infinity, '0'], ['7.25', '7.3'], [-12.6, '-13']])
    assert.equal(W.bsPct(v), want, 'bsPct(' + JSON.stringify(v) + ')');
});
test('BassamNeed: needN افتراضيٌّ لكل وردية · needS استثناءٌ لوردية · tot/has/custom/clean', () => {
  const W = block('400-shift-need.js'); const N = W.BassamNeed; const sh = [{ name: 'صباح' }, { name: 'مساء' }, 'ليل'];
  const el = { needN: '3', needS: { 'مساء': '5', 'ليل': 0 } };
  assert.equal(N.of(el, 'صباح'), 3); assert.equal(N.of(el, 'مساء'), 5); assert.equal(N.of(el, 'ليل'), 0, 'صفرٌ صريح يُحترم'); assert.equal(N.of(el, 'x'), 3); assert.equal(N.of(null, 'x'), 0);
  assert.equal(N.tot(el, sh), 8); assert.equal(N.tot({ needN: 4 }, []), 4, 'بلا ورديات: needN'); assert.equal(N.tot({ needN: -2 }, []), 0);
  assert.equal(N.has(el, sh), true); assert.equal(N.has({ needN: 0, needS: { 'صباح': 0 } }, sh), false);
  assert.equal(N.custom(el, sh), true); assert.equal(N.custom({ needN: 3, needS: { 'صباح': '3' } }, sh), false, 'مطابقٌ للموحّد: ليس استثناءً');
  same(N.clean({ 'صباح': '3', 'مساء': '5', 'ليل': '', 'غريب': 9 }, 3, sh), { 'مساء': 5 }, 'تُحذف المطابقة والفارغة والغريبة');
  assert.equal(N.clean({ 'صباح': 3 }, 3, sh), null);
});
test('BassamIdent: uid عشوائيٌّ آمن (25 خانة base36) · فريدٌ · ensure لا يستبدل الموجود · withUid لا يغيّر الأصل', () => {
  const W = block('500-element-uid.js'); const I = W.BassamIdent;
  const ids = new Set(); for (let i = 0; i < 2000; i++) ids.add(I.newUid());
  assert.equal(ids.size, 2000, 'لا تصادم في 2000 معرّف'); assert.ok([...ids].every(u => /^u[0-9a-z]{25}$/.test(u)), 'u + base36 ×25'); assert.equal(I.secure, true, 'crypto متاح');
  const el = { uid: 'keep', name: 'x' }; assert.equal(I.has(el), true); assert.equal(I.ensure(el).uid, 'keep');
  const e2 = { name: 'y' }; const w2 = I.withUid(e2); assert.equal(e2.uid, undefined, 'الأصل لم يُمسّ'); assert.ok(w2.uid && w2.name === 'y');
  assert.equal(I.has(null), false); assert.equal(I.has([]), false); assert.equal(I.has({ uid: '' }), false); assert.equal(I.ensure('s'), 's');
  same(I.KINDS, ['zones', 'gates', 'marks', 'paths']);
});
test('BassamLeaf: الأبوابُ الأم والفتحات — isParent/isLeaf/leavesOf/parentOf · elements (الأم بلا فتحاتها) · units (الفتحات بلا الأم)', () => {
  const W = block('410-gate-units.js', { globals: {} }); const L = W.BassamLeaf;
  const P = { gid: 'g1', leafN: '3', label: 'باب الملك فهد', num: '1' }, k1 = { pOf: 'g1', leafNo: 2 }, k2 = { pOf: 'g1', leafNo: 1 }, k3 = { pOf: 'g1', leafNo: 3 }, solo = { label: 'باب 7' }, one = { gid: 'g2', leafN: '1' };
  const gates = [P, k1, solo, k2, k3, one];
  assert.equal(L.isParent(P), true); assert.equal(L.isParent(one), false, 'leafN=1 ليست أمّاً'); assert.equal(L.isLeaf(k1), true); assert.equal(L.isLeaf(solo), false);
  same(L.leavesOf(gates, P).map(x => x.leafNo), [1, 2, 3], 'مرتّبةٌ برقم الفتحة'); same(L.leavesOf(gates, solo), []);
  assert.equal(L.parentOf(gates, k1), P); assert.equal(L.parentOf(gates, solo), null);
  assert.ok(L.elements(gates).length === 3 && [P, solo, one].every((g, i) => L.elements(gates)[i] === g), 'العناصر: بلا الفتحات'); assert.ok(L.units(gates).length === 5 && [k1, solo, k2, k3, one].every((g, i) => L.units(gates)[i] === g), 'الوحدات: بلا الأم');
  assert.equal(L.leafTotal ? L.leafTotal(gates) : 5, 5, 'مجموعُ الأبواب: 3 + 1 + 1');
});
/* KIVO_258 · AUD-025: محرّكُ الأبواب كاملاً — المزامنة (توليدُ الناقص · حذفُ الزائد · التوريث · إعادةُ التسمية والتوزيع) · المجاميع · الإغلاق · الحذف */
function blocksIn(names, extra = {}) {   /* كتلٌ في سياقٍ واحد بترتيب الصفحة (الطبقةُ أوّلاً) — لما يتبادل KIVO.X بين الكتل */
  const w = Object.assign({ crypto: globalThis.crypto, addEventListener() {}, setTimeout, clearTimeout, console }, extra);
  const ctx = vm.createContext(Object.assign({ window: w, crypto: globalThis.crypto, console, setTimeout, clearTimeout, Intl, document: { body: null, addEventListener() {}, documentElement: {} } }, extra.globals || {}));
  let ns = null; try { ns = blockFile('005-kivo-ns.js'); } catch (e) { ns = null; }
  if (ns) { vm.runInContext(fs.readFileSync(ns, 'utf8'), ctx, { filename: '005-kivo-ns.js' }); ctx.KIVO = w.KIVO; } else ctx.KIVO = w;
  for (const n of names) vm.runInContext(fs.readFileSync(blockFile(n), 'utf8'), ctx, { filename: n });
  return w;
}
test('BassamLeaf.sync: الأمُّ بـN أبواب ⇒ N فتحة (توريثُ الوصف · الاسمُ من الرقم · القوسُ تحت الأم) · الإنقاصُ يحذف الزائد · الأمُّ بلا احتياجٍ ولا تسكين', () => {
  const W = blocksIn(['400-shift-need.js', '500-element-uid.js', '410-gate-units.js']); const L = W.BassamLeaf;
  const P = { label: 'باب الملك فهد', num: '1', leafN: '3', x: 100, y: 200, loc: 'الشمالية', gtype: 'رئيسي', cats: ['رجال'], pri: 'عالية', closed: false, needN: 4, emp: ['e1'] };
  let r = L.sync([P, { label: 'باب 7' }], 0, { uniNeed: 2 });
  const p = r.gates[0], kids = L.leavesOf(r.gates, p);
  assert.ok(p.gid && /^g/.test(p.gid), 'الأمُّ تأخذ gid'); assert.equal(kids.length, 3); same(kids.map(k => k.label), ['1 - 1', '1 - 2', '1 - 3']);
  assert.ok(kids.every(k => k.loc === 'الشمالية' && k.gtype === 'رئيسي' && k.needN === 2 && k.uid && Array.isArray(k.emp) && k.emp.length === 0), 'توريثٌ · احتياجٌ موحّد · uid لكل فتحة');
  same([p.needN, p.needS, p.emp], [null, null, []], 'الأمُّ لا تحمل احتياجاً ولا تسكيناً');
  const pos = kids.map(k => [k.x, k.y]); same(pos[1], [100, 226], 'الفتحةُ الوسطى تحت الأم مباشرةً (r=26)');
  r = L.sync(r.gates.map((g, i) => i === 0 ? Object.assign({}, g, { leafN: '2', loc: 'الجنوبية', num: '9' }) : g), 0);
  const k2 = L.leavesOf(r.gates, r.gates[0]); assert.equal(k2.length, 2); assert.equal(r.removed.length, 1, 'الثالثةُ حُذفت');
  assert.ok(k2.every(k => k.loc === 'الجنوبية' && k.num === '9'), 'التوريثُ يتبع الأم'); same(k2.map(k => k.label), ['9 - 1', '9 - 2']);
  r = L.sync(r.gates.map((g, i) => i === 0 ? Object.assign({}, g, { leafN: '1' }) : g), 0);
  assert.equal(L.leavesOf(r.gates, r.gates[0]).length, 0, 'عددٌ واحد: لا فتحات'); assert.equal(r.removed.length, 2);
  const keep = L.sync([{ label: 'ب', leafN: '1' }], 0); assert.equal(keep.gates[0].gid, undefined, 'بلا أمومة ولا gid: كما هي');
  same(L.sync([], 5), { gates: [], removed: [] });
  const noRel = L.sync([Object.assign({}, P, { leafN: '2' })], 0, { relabel: false, relayout: false }); assert.equal(L.leavesOf(noRel.gates, noRel.gates[0]).length, 2);
  assert.equal(L.leafLabel({ label: 'باب السلام' }, 2), 'باب السلام - 2', 'بلا رقم: من الاسم'); assert.equal(L.leafLabel(null, 1), 'باب - 1');
  same(L.arcPos({ x: 0, y: 0 }, 1, 1), { x: 0, y: 26 }, 'فتحةٌ واحدة: تحت الأم'); assert.notEqual(L.newId(), L.newId());
  assert.equal(L.leafCount({ gid: 'g', leafN: '4' }), 4); assert.equal(L.leafCount({ label: 'x' }), 1);
});
test('BassamLeaf: الإغلاقُ محسوب (كلُّ الفتحات) · المجاميع (المفتوح · الاحتياج · المسكَّنون بمرشّح) · الاحتياجُ الموحّد · الظهور · الحذف', () => {
  const W = blocksIn(['400-shift-need.js', '410-gate-units.js']); const L = W.BassamLeaf;
  const P = { gid: 'g1', leafN: '2' }, a = { pOf: 'g1', leafNo: 1, closed: true, needN: 2, emp: ['e1', 'e2'] }, b = { pOf: 'g1', leafNo: 2, closed: false, needN: 2, emp: ['e3'] }, solo = { label: 's', closed: true, needN: 1, emp: [] };
  const G = [P, a, b, solo];
  assert.equal(L.closedOf(G, P), false, 'فتحةٌ مفتوحة ⇒ الأمُّ مفتوحة'); assert.equal(L.closedOf([P, a], P), true); assert.equal(L.closedOf([{ gid: 'g9', leafN: '2', closed: true }], { gid: 'g9', leafN: '2', closed: true }), true, 'أمٌّ بلا فتحات: علمُها'); assert.equal(L.closedOf(G, solo), true);
  const N = W.BassamNeed, ag = L.agg(G, P, null, (e) => e !== 'e2'); assert.equal(ag.n, 2); assert.equal(ag.open, 1); assert.equal(ag.plc, 2, 'المرشّحُ يُسقط e2');
  assert.equal(ag.need, N.tot(a, null) + N.tot(b, null), 'الاحتياجُ = مجموعُ احتياج الفتحات (BassamNeed.tot)'); assert.ok(ag.need > 0);
  same(L.agg(G, solo), { n: 1, open: 0, need: N.tot(solo, null), plc: 0 }); assert.equal(L.agg(G, P).plc, 3, 'بلا مرشّح: الكلّ');
  assert.equal(L.uniNeedOf(G, P), '2'); assert.equal(L.uniNeedOf([P, a, Object.assign({}, b, { needN: 3 })], P), '', 'احتياجٌ مختلف'); assert.equal(L.uniNeedOf([P], P), '');
  assert.equal(L.shown(a, { g1: 1 }), true); assert.equal(L.shown(a, {}), false); assert.equal(L.shown(solo), true); assert.equal(L.shown(null), true);
  assert.equal(L.removeIdx(G, 0).length, 1, 'الأمُّ تُحذف مع فتحاتها'); assert.equal(L.removeIdx(G, 3).length, 3); assert.equal(L.removeIdx(G, 9), G);
});
