/* KIVO_262 · هويّاتُ النطاق في الواجهة (تبويب «سقف النطاق» — admin/logic.js scIdOf) = هويّاتُ المحرّك في الخادم (KIVO_SCOPE · ID · R5)
   — لو افترقتا لحفظت الواجهةُ قائمةً لا يطابقها الخادمُ فيُرفض ما اختاره المدير. يُستخرج النصّان من المصدر ويُقارنان على حالاتٍ شاملة. */
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const W = fs.readFileSync(path.join(ROOT, 'workers', 'parts', '010-kivo-scope-2.js'), 'utf8');
const A = fs.readFileSync(path.join(ROOT, 'src', 'modules', 'admin', 'logic.js'), 'utf8').replace(/\r\n/g, '\n');
const wsrc = /function uidOf\(e\) \{[^\n]*\}\n\s*var ID = \{[\s\S]*?\n\s*\};/.exec(W);
assert.ok(wsrc, 'لم يُعثر على ID في 010');
const ctxW = vm.createContext({});
vm.runInContext('function isObj(x){ return x !== null && typeof x === "object" && !Array.isArray(x); }\n' + wsrc[0] + '\nthis.ID = ID;', ctxW);
const csrc = /  scIdOf\(kind, e\) \{[\s\S]*?\n  \}\n/.exec(A);
assert.ok(csrc, 'لم يُعثر على scIdOf في admin/logic.js');
const ctxC = vm.createContext({});
vm.runInContext('this.C = { ' + csrc[0].trim() + ' };', ctxC);
const SITE = (f) => (f && (f.sid || f.id) ? 'f:' + (f.sid || f.id) : null);   /* المحرّك: floors → f:<sid|id> — والواجهةُ تختار ما له sid وحده (الثابت) */
const cases = {
  zones: [{ uid: 'u1', code: 'Z' }, { code: 'Z1' }, { ser: 'S' }, { name: 'N' }, { id: 7 }, { eid: 'e' }, {}, { code: '' , name: 'N2' }],
  gates: [{ uid: 'u2', id: 3 }, { id: 3 }, { gid: 'G', leafNo: 2 }, { gid: 'G' }, { num: 5 }, { num: '' , label: 'L' }, { label: 'L' }, {}],
  marks: [{ uid: 'u3' }, { id: 'm1' }, { label: 'ML' }, {}],
  paths: [{ uid: 'u4' }, { id: 'p1' }, { code: 'pc' }, { name: 'pn' }, {}],
};
test('عناصرُ الخطة: هويةُ الواجهة = هويةُ المحرّك لكل نوعٍ وحالة', () => {
  for (const k in cases) for (const e of cases[k]) {
    const w = vm.runInContext('ID.' + k + '(' + JSON.stringify(e) + ')', ctxW);
    const c = vm.runInContext('C.scIdOf(' + JSON.stringify(k) + ',' + JSON.stringify(e) + ')', ctxC);
    assert.equal(c, w, k + ' ' + JSON.stringify(e));
  }
});
test('المواقع: f:<sid|id> كالمحرّك؛ والطابقُ بلا هويةٍ ثابتة لا يُختار (المحرّكُ يعطيه #i موضعياً)', () => {
  for (const f of [{ sid: 's1' }, { id: 'i1' }, { sid: 's2', id: 'i2' }]) assert.equal(vm.runInContext('C.scIdOf("floor", ' + JSON.stringify(f) + ')', ctxC), SITE(f));
  assert.equal(vm.runInContext('C.scIdOf("floor", {"name":"x"})', ctxC), null);
});
