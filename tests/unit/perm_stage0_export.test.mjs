/* «فحص الصلاحيات العميق (2026-10-21)» · M3 — التصدير والطباعة في وضع الإنفاذ (RISHAD-266 · F04: نقلٌ من 2dc347f)
   ذرّاتُ التصدير (converted_to_feature) تُترجَم إلى أعلام ميزات ff.* لا مفاتيحَ لها في السجل — فلا تحملها بتّاتُ الخادم،
   وكان فلترُ الواجهة (331 · myPerms فوق azHeld) يُسقطها فيختفي كلُّ زرّ PC('export') (Excel/طباعة) عن كلّ مستخدمٍ غيرِ مدير النظام.
   الآن: من في ورقته التصدير يصدّر في الإنفاذ ما بقي للورقة فعلٌ محمول؛ ومن لا تصديرَ في ورقته لا يكسبه؛ وإسقاطُ العرض يُسقط التصدير.
   الكتلةُ الحقيقية من 331 (azZ · azHeld · myPerms) تُشغَّل في node:vm فوق السجلّ الحقيقي (340) — والبتّاتُ تُبنى من مفاتيح السجلّ نفسِه. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { SRC } from './harness.mjs';

const rd = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');
const REG = (() => { const ctx = { KIVO: {} }; vm.createContext(ctx); vm.runInContext(rd('permissions/340-registry-v24-9.js') + '\n;globalThis.__R = KIVO_REGISTRY;', ctx); return ctx.__R; })();
/* الكتلةُ من azZ إلى نهاية myPerms المغلَّف — بلا تعديل */
const BLOCK = (() => {
  const s = rd('permissions/331-perm-model.js'), i = s.indexOf('  function azZ(){'), j = s.indexOf('    _azMemo = { a: all, h: H, v: v };\n    return v;\n  };\n', i);
  assert.ok(i > 0 && j > i, 'كتلةُ الإنفاذ في 331');
  return s.slice(i, j + '    _azMemo = { a: all, h: H, v: v };\n    return v;\n  };\n'.length);
})();
/* البتّاتُ كما يشحنها الخادم (h بترتيب R.keys) لمجموعة مفاتيح */
function bits(held) {
  const order = REG.keys, b = new Uint8Array(Math.ceil(order.length / 8));
  order.forEach((k, i) => { if (held.has(k)) b[i >> 3] |= 1 << (i & 7); });
  return Buffer.from(b).toString('base64');
}
/* المفاتيحُ التي تحملها ورقةٌ (ترجمةُ كل «ورقة:فعل» إلى أهدافه المسجّلة) — ناقصاً ما يُسقط صراحةً */
function heldOf(sheet, minus = []) {
  const H = new Set();
  for (const [leaf, acts] of Object.entries(sheet)) for (const a of acts) { const at = REG.atoms[leaf + ':' + a]; (at && at.targets || []).forEach((t) => REG.byKey[t] && H.add(t)); }
  minus.forEach((k) => H.delete(k));
  return H;
}
function can(sheet, opts = {}) {
  const ctx = { KIVO: { KIVO_REGISTRY: REG, __BS_AUTHZ: opts.legacy ? undefined : { mode: 'enforce', n: REG.keys.length, depts: { d3: { h: bits(heldOf(sheet, opts.minus)), p: [] } } } }, atob: (x) => Buffer.from(x, 'base64').toString('latin1') };
  vm.createContext(ctx);
  vm.runInContext('var myPerms = function(){ return SHEET; }; var SHEET = ' + JSON.stringify(sheet) + ';\n' +
    'function isSuper(){ return false; } function curDept(){ return "d3"; } function isContainer(k){ return k.indexOf("/") < 0 && k === "emps"; } function derivePages(l){ return l; }\n' +
    BLOCK + '\n;globalThis.__can = function(p, a){ var x = myPerms()[p]; return !!(x && x.indexOf(a) !== -1); };', ctx);
  return ctx.__can;
}
const EXP = { 'emps/data': ['view', 'export'], tasks: ['view', 'add', 'export'], staff: ['view', 'export'], dreport: ['view', 'export'] };
const NOEXP = { 'emps/data': ['view'], tasks: ['view', 'add'], staff: ['view'], dreport: ['view'] };

test('M3 · السجلّ يعرّف byKey وذرّاتُ التصدير أعلامُ ميزات (converted_to_feature) لا مفاتيحَ مسجّلة — شرطُ تطبيق الفلتر', () => {
  assert.ok(REG.byKey && Object.keys(REG.byKey).length === REG.keys.length, 'R.byKey');
  for (const leaf of Object.keys(EXP)) {
    const at = REG.atoms[leaf + ':export'];
    assert.ok(at, leaf + ':export');
    assert.equal(at.disposition, 'converted_to_feature', leaf);
    assert.ok(at.targets.every((t) => !REG.byKey[t]), leaf + ': أهدافٌ خارج السجل');
  }
});

test('enforce · M3 · من في ورقته التصدير يصدّر (Excel/طباعة) — والعرضُ والإضافة كما هما', () => {
  const c = can(EXP);
  for (const pk of Object.keys(EXP)) assert.equal(c(pk, 'export'), true, pk + ':export');
  assert.equal(c('emps/data', 'view'), true); assert.equal(c('tasks', 'add'), true);
});

test('enforce · M3 · لا تصديرَ لمن لا تصديرَ في ورقته (لا يكسب أحدٌ ما لم يكن له)', () => {
  const c = can(NOEXP);
  for (const pk of Object.keys(NOEXP)) assert.equal(c(pk, 'export'), false, pk + ':export');
  assert.equal(c('tasks', 'add'), true);
});

test('enforce · M3 · الإسقاطُ الصريح يبقى نافذاً: ورقةٌ سقط عرضُها (لا فعلَ محمولاً) لا يبقى تصديرُها', () => {
  const minus = REG.atoms['emps/data:view'].targets;
  const c = can(EXP, { minus });
  assert.equal(c('emps/data', 'view'), false, 'سقط العرض');
  assert.equal(c('emps/data', 'export'), false, 'فلا تصدير');
  assert.equal(c('tasks', 'export'), true, 'وبقيةُ الأوراق كما هي');
});

test('legacy · M3 · بلا __BS_AUTHZ لا يتغيّر شيء', () => {
  const c = can(EXP, { legacy: true });
  for (const pk of Object.keys(EXP)) assert.equal(c(pk, 'export'), true, pk);
  assert.equal(can(NOEXP, { legacy: true })('tasks', 'export'), false);
});
