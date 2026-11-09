/* KIVO_265 · ملاحظةُ المالك (2026-10-19): الإدارةُ الجديدة كانت تبدأ بسقفٍ فارغ إذا كان أبوها مضبوطاً على لا شيء، فيبدو للمدير
   أن المنصة خالية بلا سبب ظاهر. القاعدة: الفراغُ لا يُورَّث — العقدةُ الجديدة تبدأ بالنمط «أساسي»؛ والسقفُ الفارغ يُعلَن صراحةً
   في تبويب «سقف الصفحات» وفي لوحة الإدارة. */
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const M = rd('src/permissions/331-perm-model.js');
function fnSrc(name) {
  const i = M.indexOf('\n  function ' + name + '('); assert.ok(i > 0, name + ' موجودة');
  let j = M.indexOf('{', i), d = 0;
  for (let k = j; k < M.length; k++) { if (M[k] === '{') d++; else if (M[k] === '}' && --d === 0) { j = k + 1; break; } }
  return M.slice(i + 3, j);
}
function run(store, parentEff) {
  const calls = { seeded: [], saved: 0 };
  const ctx = { permStore: () => store, hasCap: (d) => Array.isArray(store.caps[d]), effCap: () => parentEff, permSave: () => { calls.saved++; }, patternSeed: (id) => { calls.seeded.push(id); return { ok: true, n: 7 }; }, Array };
  const fn = vm.runInNewContext('(' + fnSrc('seedCapFrom').replace(/^function seedCapFrom/, 'function') + ')', ctx);
  return { r: fn('new', 'parent'), calls, store };
}

test('seedCapFrom: أبٌ سقفُه فارغ ⇒ العقدةُ الجديدة تبدأ بالنمط الأساسي لا بالفراغ', () => {
  const { r, calls, store } = run({ caps: { parent: [] } }, []);
  assert.equal(r.ok, true); assert.equal(r.seeded, 'basic');
  assert.deepEqual(calls.seeded, ['new'], 'patternSeed استُدعيت للعقدة الجديدة');
  assert.equal(store.caps.new, undefined, 'لم يُكتب سقفٌ فارغ');
});

test('seedCapFrom: أبٌ سقفُه مضبوط ⇒ لقطةٌ منه كما كان · لا أب أو بلا سقف ⇒ مفتوح · سقفٌ مسبق لا يُلمس', () => {
  let x = run({ caps: { parent: ['emps', 'tasks'] } }, ['emps', 'tasks']);
  assert.deepEqual(x.store.caps.new, ['emps', 'tasks']); assert.equal(x.calls.seeded.length, 0); assert.equal(x.calls.saved, 1);
  x = run({ caps: {} }, []); assert.equal(x.r.open, true); assert.equal(x.calls.seeded.length, 0);
  x = run({ caps: { parent: [], new: ['help'] } }, []); assert.equal(x.r.kept, true); assert.deepEqual(x.store.caps.new, ['help']);
});

function eff(caps, anc, id) {
  const PAGE_KEYS = ['emps', 'tasks', 'plan', 'admin', 'help'];
  const ctx = { permStore: () => ({ caps }), hasCap: (d) => Array.isArray(caps[d]), rawCap: (d) => (Array.isArray(caps[d]) ? caps[d].slice() : []), curDept: () => id, PAGE_KEYS, KIVO: { BassamDepts: { ancestorsOf: () => anc } }, Array };
  return vm.runInNewContext('(' + fnSrc('effCap').replace(/^function effCap/, 'function') + ')', ctx)(id);
}
test('effCap: إدارةٌ بلا سقفٍ خاص تحت سلفٍ مضبوط ترث سقفَه لا الفراغ — فحصُ Test (9 إدارات بلا تبويبات)', () => {
  assert.deepEqual(eff({ sector: ['emps', 'tasks'] }, ['gen', 'sector'], 'leaf'), ['emps', 'tasks'], 'ترث سقف القطاع');
  assert.deepEqual(eff({ sector: ['emps', 'tasks'], leaf: ['emps', 'help'] }, ['sector'], 'leaf'), ['emps'], 'سقفُها الخاص يتقاطع مع الأصل');
  assert.deepEqual(eff({ sector: [] }, ['sector'], 'leaf'), [], 'سلفٌ مضبوطٌ فارغاً يقفل فرعه — قرارٌ صريح');
  assert.deepEqual(eff({}, ['sector'], 'leaf'), ['emps', 'tasks', 'plan', 'admin', 'help'], 'لا سقفَ في السلسلة = مفتوح');
  assert.deepEqual(eff({ leaf: [] }, ['sector'], 'leaf'), [], 'سقفُها الخاص فارغ = فارغ');
});

test('الواجهة: تنبيهُ السقف الفارغ في تبويب سقف الصفحات ولوحة الإدارة', () => {
  const l = rd('src/modules/admin/logic.js');
  assert.match(l, /capEmptyOn: !!\(r && r\.deptCap && 0 === r\.deptCap\(o\)\.length\)/, 'الشرط: السقفُ الفعليُّ صفر — بسقفها أو بسقف أصلٍ فوقها (deptCap يعيد كل الصفحات حين لا سقفَ في السلسلة)');
  assert.match(l, /سقف أصلٍ فوقها \(الإدارة العامة أو القطاع\) فارغ/, 'نصُّ حالة الأصل الفارغ');
  assert.match(l, /سقف الصفحات فارغ — لا صفحة مفعّلة لهذه الإدارة/, 'نصُّ التنبيه');
  /* V7 P3-0: حالةُ السقف من مصدرٍ واحد (_capStateTxt ← BassamPerm.capState) — الفارغ · المفتوح · الموروث · الخاص (كانت dhCapLbl قيمةً غيرَ معروضة بمنطقٍ ثانٍ) */
  assert.match(l, /"السقف الفعلي فارغ بحكم سقوف الأصول — لا صفحة مفعّلة"/, 'بلا سقفٍ خاص وسقوفُ الأصول تفرغه');
  assert.match(l, /"سقفٌ خاصّ فارغ — لا صفحة مفعّلة لهذه الوحدة"/, 'سقفٌ خاصّ فارغ');
  assert.match(l, /short: "السقف مفتوح — لم يُضبط"/, 'المفتوح غيرُ المضبوط');
  assert.match(l, /"موروثٌ من الأصل: لا سقفَ خاصّاً لها، ويحدّها سقفُ أصلٍ فوقها — "/, 'الموروث');
  assert.doesNotMatch(l, /dhCapLbl|dhCapEmpty/, 'لا حسابَ ثانٍ لحالة السقف');
  const v = rd('src/modules/admin/view.html');
  assert.match(v, /\{\{capEmptyOn\}\}[\s\S]{0,700}\{\{capEmptyTxt\}\}[\s\S]{0,200}\{\{capLimOn\}\}/, 'التنبيهُ قبل تنبيه سقف الأصول');
});
