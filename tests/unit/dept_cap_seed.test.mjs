/* KIVO_265 · ملاحظةُ المالك (2026-10-19): الإدارةُ الجديدة كانت تبدأ بسقفٍ فارغ إذا كان أبوها مضبوطاً على لا شيء، فيبدو للمدير
   أن المنصة خالية بلا سبب ظاهر. والسقفُ الفارغ يُعلَن صراحةً في لوحة الإدارة.
   V7 · د6 (ب4 — قرار المالك): بذرُ العقدة الجديدة صار اختياراً صريحاً ('off' الافتراضي · 'parent') — حالتا البذر القديم (النمطُ «أساسي» · لقطةُ الوراثة ·
   «بلا سجلّ = مفتوح») استُبدلتا هنا بحالتَي القاعدة الجديدة؛ والصفحاتُ الدائمة في السجلّ دائماً فلا تبدو المنصةُ خاليةً للمدير. */
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
/* V7 · د6 (ب4 — قرار المالك): حلّ محلَّ البذر السابق (لقطةُ الوراثة · النمطُ «أساسي» · «لا سجلَّ = مفتوح») اختيارٌ صريح: 'off' (الافتراضي) | 'parent'.
   دوالُّ 331 نفسُها (seedCapFrom · seedUnit · seedSystems · seedOnAt · seedMode) فوق مخزنٍ صغير وأنظمةٍ مصطنعة (TEST_ONLY). */
const SYS = [{ key: 'emps', toggle: false, leaves: ['emps', 'emps/data'] }, { key: 'custody', toggle: true, leaves: ['emps/custody'] }, { key: 'tasks', toggle: true, leaves: ['tasks'] }, { key: 'help', toggle: true, leaves: ['help'] }];
function run(store, opt, { anc = {}, sys = SYS } = {}) {
  const calls = { saved: 0 }, PAGE_KEYS = ['emps', 'tasks', 'help', 'admin'], SUBS = { emps: ['data', 'custody'] };
  const capOf = (d) => { let c = Array.isArray(store.caps[d]) ? store.caps[d] : PAGE_KEYS; for (const a of anc[d] || []) if (Array.isArray(store.caps[a])) c = c.filter((k) => store.caps[a].includes(k)); return c; };
  const ctx = { permStore: () => store, permSave: () => { calls.saved++; }, PAGE_KEYS, PAGE_OF: { emps: { key: 'emps' } }, Array, String, Object,
    subKeysOf: (pk) => SUBS[pk] || [], splitLeaf: (k) => { const i = k.indexOf('/'); return i === -1 ? { page: k, sub: '' } : { page: k.slice(0, i), sub: k.slice(i + 1) }; },
    onCap: (key, d) => { const [pk, sk] = key.split('/'); if (!capOf(d).includes(pk)) return false; const L = ((store.subs || {})[d] || {})[pk]; return !sk || !Array.isArray(L) || L.includes(sk); },
    KIVO: { Perm44: sys ? { sysList: () => JSON.parse(JSON.stringify(sys)) } : null, BassamDepts: { ancestorsOf: (d) => anc[d] || [] } } };
  vm.createContext(ctx);
  for (const f of ['seedSystems', 'seedOnAt', 'seedMode', 'seedUnit', 'seedCapFrom']) vm.runInContext(fnSrc(f), ctx);
  const r = JSON.parse(JSON.stringify(opt === undefined ? ctx.seedCapFrom('new', 'parent') : ctx.seedCapFrom('new', 'parent', opt)));
  return { r, calls, store: JSON.parse(JSON.stringify(store)) };   /* نسخةٌ من عالَم الاختبار (كائناتُ vm من عالَمٍ آخر) */
}

test('seedCapFrom (V7 · د6 · ب4): الافتراضي «مطفأة كلها» — الصفحاتُ الدائمة وحدها، مهما كان سقفُ الأب (مضبوطاً · فارغاً · بلا سجلّ)', () => {
  for (const caps of [{ parent: ['emps', 'tasks', 'help', 'admin'] }, { parent: [] }, {}]) {
    const { r, calls, store } = run({ caps: JSON.parse(JSON.stringify(caps)) });
    assert.deepEqual(r, { ok: true, seed: 'off', n: 2, on: [] });
    assert.deepEqual(store.caps.new, ['emps', 'admin'], 'ما ليس نظاماً يُطفأ يبقى (موظفو الإدارة · الإعدادات)');
    assert.deepEqual(store.subs.new, { emps: ['data'] }, 'نظامٌ ورقتُه قسمٌ من صفحةٍ دائمة (العهد) يُطفأ في مخزن الأقسام');
    assert.equal(calls.saved, 1); assert.deepEqual(store.caps.parent, caps.parent, 'سجلُّ الأب لا يُمسّ');
  }
  assert.equal(run({ caps: {} }, { seed: 'TEST_ONLY_other' }).r.seed, 'off', 'قيمةٌ غيرُ معروفة = الافتراضي');
  assert.equal(run({ caps: {} }, 'off').r.seed, 'off');
});

test('seedCapFrom (V7 · د6 · ب4): «نفس أنظمة العقدة الأب» — أنظمةُ الأب وأصولِه · الأبُ المفتوح ⇒ الكل · سقفٌ مسبق لا يُلمس · بلا قائمة الأنظمة لا يُكتب شيء', () => {
  let x = run({ caps: { parent: ['emps', 'tasks', 'admin'] } }, { seed: 'parent' });
  assert.deepEqual(x.store.caps.new, ['emps', 'tasks', 'admin'], 'ما أُطفئ في الأب (المساعدة) مطفأ'); assert.deepEqual(x.r.on, ['custody', 'tasks']); assert.equal(x.store.subs, undefined, 'لا قسمَ مطفأ ⇒ لا سجلَّ أقسام');
  x = run({ caps: { parent: ['emps', 'tasks', 'help', 'admin'] }, subs: { parent: { emps: ['data'] } } }, { seed: 'parent' });
  assert.deepEqual(x.store.caps.new, ['emps', 'tasks', 'help', 'admin']); assert.deepEqual(x.store.subs.new, { emps: ['data'] }, 'العهدُ المطفأ في الأب مطفأٌ في الابن');
  x = run({ caps: { top: ['emps', 'help', 'admin'] } }, { seed: 'parent' }, { anc: { parent: ['top'] } });
  assert.deepEqual(x.store.caps.new, ['emps', 'help', 'admin'], 'أبٌ بلا سجلٍّ يحدّه أصلٌ: ما يسمح به الأصل');
  x = run({ caps: {} }, { seed: 'parent' });
  assert.deepEqual(x.store.caps.new, ['emps', 'tasks', 'help', 'admin'], 'الأبُ المفتوح بلا سجلّ ⇒ كلُّ الأنظمة — سجلٌّ صريح'); assert.equal(x.r.seed, 'parent');
  x = run({ caps: { parent: [] } }, { seed: 'parent' });
  assert.deepEqual(x.store.caps.new, ['emps', 'admin'], 'أبٌ سقفُه فارغ ⇒ أنظمتُه مطفأة — والصفحاتُ الدائمة في السجل (لا نمطَ «أساسي»)');
  x = run({ caps: { parent: [], new: ['help'] } }, { seed: 'parent' }); assert.deepEqual(x.r, { ok: true, kept: true }); assert.deepEqual(x.store.caps.new, ['help']); assert.equal(x.calls.saved, 0);
  x = run({ caps: {} }, { seed: 'parent' }, { sys: null }); assert.equal(x.r.ok, false); assert.equal(x.store.caps.new, undefined, 'بلا المحرّك: لا سجلَّ ولا حفظ — والمنادي يسحب الوحدة'); assert.equal(x.calls.saved, 0);
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

test('الواجهة: حالةُ السقف الفارغ في لوحة الإدارة (V7 · د5-هـ 44: تنبيهُ تبويب «سقف الصفحات» حُذف معه)', () => {
  /* V7 · د6: _capStateTxt نُقل كما هو مع الشجرة وقائمة التهيئة إلى صفحة «الإدارات والصلاحيات» (src/modules/org) — ولا نسخةَ له في صفحة الإعدادات */
  const l = rd('src/modules/org/logic.js');
  assert.doesNotMatch(rd('src/modules/admin/logic.js'), /_capStateTxt|السقف مفتوح — لم يُضبط/, 'مصدرٌ واحد: لا نسخةَ في صفحة الإعدادات');
  /* V7 P3-0: حالةُ السقف من مصدرٍ واحد (_capStateTxt ← BassamPerm.capState) — الفارغ · المفتوح · الموروث · الخاص (كانت dhCapLbl قيمةً غيرَ معروضة بمنطقٍ ثانٍ) */
  assert.match(l, /"السقف الفعلي فارغ بحكم سقوف الأصول — لا صفحة مفعّلة"/, 'بلا سقفٍ خاص وسقوفُ الأصول تفرغه');
  assert.match(l, /"سقفٌ خاصّ" \+ \(s\.independent \? " مستقلّ" : ""\) \+ " فارغ — لا صفحة مفعّلة لهذه الوحدة"/, 'سقفٌ خاصّ فارغ (ومستقلّ)');
  assert.match(l, /short: "السقف مفتوح — لم يُضبط"/, 'المفتوح غيرُ المضبوط');
  assert.match(l, /"موروثٌ من الأصل: لا سقفَ خاصّاً لها، ويحدّها سقفُ أصلٍ فوقها — "/, 'الموروث');
  assert.doesNotMatch(l, /dhCapLbl|dhCapEmpty/, 'لا حسابَ ثانٍ لحالة السقف');
  assert.doesNotMatch(l, /capEmptyOn:|capLimOn:/, 'V7 · د5-هـ (44): تنبيها محرّر السقف المحذوف لا أثرَ لهما');
});
