/* RISHAD266 · item 3 (owner approval 2026-11-02): one reading of a unit's page ceiling on the server (021 deptCapOf/effCapOf) and in the UI (331 deptCap/effCap).
   Explicitly: ABSENT record vs EXPLICIT EMPTY [] · OWN (independent, capOwn/capMode) vs FOLLOWING · and no unintended widening:
   a unit without its own record never exceeds any ancestor record; only an own-mode unit WITH its own record ignores its ancestors. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { internals } from './internals.mjs';
import { SRC } from './harness.mjs';

const { deptCapOf, PG_KEYS } = await internals(['deptCapOf', 'PG_KEYS']);
const [a, b, c] = PG_KEYS;
const M = fs.readFileSync(path.join(SRC, 'permissions/331-perm-model.js'), 'utf8');
const fnSrc = (name) => { const i = M.indexOf('\n  function ' + name + '('); assert.ok(i > 0, name); let j = M.indexOf('{', i), d = 0; for (let k = j; k < M.length; k++) { if (M[k] === '{') d++; else if (M[k] === '}' && --d === 0) { j = k + 1; break; } } return M.slice(i + 3, j); };
/* tree: g1 (node) ⊃ d1 (department) ⊃ s1 (section) · d2 (department directly under g1) */
const nodes = [{ id: 'g1', pid: '' }], depts = [{ id: 'd1', gid: 'g1' }, { id: 'd2', gid: 'g1' }, { id: 's1', gid: 'd1', kind: 'قسم' }];
const PARENT = { g1: '', d1: 'g1', d2: 'g1', s1: 'd1' };
const anc = (id) => { const o = []; let p = PARENT[id]; while (p) { o.push(p); p = PARENT[p]; } return o; };
const server = (perms, id) => deptCapOf({ perms, nodes, depts, off: [] }, id);
function client(perms, id, throwAnc) {
  const ctx = { permStore: () => perms, PAGE_KEYS: PG_KEYS.slice(), curDept: () => id, Array,
    KIVO: { BassamDepts: { ancestorsOf: (d) => { if (throwAnc) throw new Error('TEST_ONLY'); return anc(d); } } } };
  vm.createContext(ctx);
  for (const f of ['rawCap', 'hasCap', 'effCap', 'capSetAnywhere', 'deptCap']) vm.runInContext(fnSrc(f), ctx);
  return vm.runInContext('deptCap(' + JSON.stringify(id) + ')', ctx).filter((k) => PG_KEYS.includes(k));
}
const S = (x) => JSON.parse(JSON.stringify(x)).sort();   /* vm arrays come from another realm */
const CASES = [
  ['no record anywhere ⇒ open (all pages)', { caps: {} }, 'd1', PG_KEYS],
  ['ABSENT record under a capped ancestor ⇒ inherits the ancestor (the fixed case)', { caps: { g1: [a, b] } }, 'd1', [a, b]],
  ['EXPLICIT EMPTY [] under a capped ancestor ⇒ nothing', { caps: { g1: [a, b], d1: [] } }, 'd1', []],
  ['ancestor explicit [] locks a unit without record', { caps: { g1: [] } }, 'd1', []],
  ['FOLLOWING unit with a record ⇒ intersection with ancestors', { caps: { g1: [a, b], d1: [a, c] } }, 'd1', [a]],
  ['OWN unit WITH its record ⇒ its record alone', { caps: { g1: [a], d1: [a, b, c] }, capOwn: { d1: true } }, 'd1', [a, b, c]],
  ['OWN flag WITHOUT a record ⇒ still cut by ancestors (never all pages)', { caps: { g1: [a] }, capOwn: { d1: true } }, 'd1', [a]],
  ['capMode own for all, unit without record ⇒ cut by ancestors', { caps: { g1: [a, b] }, capMode: 'own' }, 'd1', [a, b]],
  ['section without record under a department record and a node record ⇒ intersection', { caps: { g1: [a], d1: [a, b] } }, 's1', [a]],
  ['record of unknown keys only ⇒ nothing usable', { caps: { g1: [a, b], d1: ['zz_unknown'] } }, 'd1', []],
  ['sibling department with its own record is unaffected', { caps: { g1: [a, b], d2: [b] } }, 'd2', [b]],
];
for (const [name, perms, id, want] of CASES) {
  test('ceiling parity · ' + name, () => {
    const s = server(JSON.parse(JSON.stringify(perms)), id), cl = client(JSON.parse(JSON.stringify(perms)), id);
    assert.deepEqual(S(s), S(want), 'server'); assert.deepEqual(S(cl), S(want), 'UI = server');
  });
}
test('no unintended widening: without its own record a unit never exceeds any ancestor record', () => {
  const pools = [[], [a], [a, b], [a, b, c], PG_KEYS.slice(0, 5)];
  for (const g of pools) for (const dRec of [undefined, [], [a], [b, c]]) for (const own of [false, true]) {
    const perms = { caps: { g1: g }, capOwn: own ? { d1: true } : {} }; if (dRec) perms.caps.d1 = dRec;
    const s = server(perms, 'd1');
    if (!(own && dRec)) assert.ok(s.every((k) => g.includes(k)), JSON.stringify({ g, dRec, own, s }));
    if (dRec) assert.ok(s.every((k) => dRec.includes(k)), 'never wider than its own record');
  }
});
test('UI fails closed: when ancestors cannot be read, a unit without its own record shows no pages (the server never opens it)', () => {
  assert.deepEqual(S(client({ caps: { g1: [a] } }, 'd1', true)), []);
  assert.deepEqual(S(client({ caps: { d1: [a, b] } }, 'd1', true)), S([a, b]), 'its own record still shows');
});
test('admin editor: an own-flag unit without a record is still limited by its ancestors (no LIM bypass) · draft starts from the effective ceiling', () => {
  const L = fs.readFileSync(path.join(SRC, 'modules/admin/logic.js'), 'utf8');
  assert.ok(L.includes('t.capOwnOf(e.sysSel) && t.hasCap(e.sysSel))) return 0;') && L.includes('r.capOwnOf(o) && r.hasCap(o))) return null;'));
  assert.ok(L.includes('e.rawCap && e.hasCap && e.hasCap(t) ? e.rawCap(t) : e.deptCap(t)'));
});

/* RISHAD266 (قرار المالك على aae024c): الكتابة — سقفٌ فعليٌّ واحد ولا كتابةَ ضمنيةً لغياب السجل (018 writePages على دالة الخادم الحقيقية) */
const { writePages } = await internals(['writePages']);
const WA = (u, perms) => ({ u, perms, nodes, depts, off: [] });
test('writePages: صاحبُ الورقة يكتب بأفعالها داخل السقف الفعلي (ولو بلا سجلٍّ للوحدة) · لا كتابةَ ضمنية لحساب الإدارة أو المدير بلا ورقة في وحدةٍ بلا سجل', () => {
  const sheet = { [a]: ['view', 'edit'], [b]: ['view'], [c]: ['edit'] };
  const staff = { role: 'staff', deptId: 'd1', ekey: 'tst_e1' }, mgr = { role: 'staff', deptId: 'd1', ekey: 'mgr:d1', mgr: true }, dept = { role: 'dept', deptId: 'd1', ekey: 'x' };
  /* وحدةٌ بلا سجل تحت سلفٍ مسقوف [a,b]: الفعلي [a,b] */
  const P0 = { caps: { g1: [a, b] }, emps: { d1: { tst_e1: sheet } } };
  assert.deepEqual(S(writePages(WA(staff, P0), 'd1')), [a], 'الورقة: a (تعديل · داخل السقف) — لا b (عرضٌ فقط) ولا c (خارج السقف)');
  assert.deepEqual(S(writePages(WA(mgr, P0), 'd1')), [], 'المديرُ بلا ورقة: لا كتابةَ ضمنية لغياب السجل');
  assert.deepEqual(S(writePages(WA(dept, P0), 'd1')), [], 'حسابُ الإدارة: لا كتابةَ ضمنية لغياب السجل');
  /* وحدةٌ بسجلٍّ صريح [a,c] تحت [a,b]: الفعلي [a] — الضمنيةُ من السجل ∩ الفعلي */
  const P1 = { caps: { g1: [a, b], d1: [a, c] }, emps: { d1: { tst_e1: sheet } } };
  assert.deepEqual(S(writePages(WA(mgr, P1), 'd1')), [a]); assert.deepEqual(S(writePages(WA(dept, P1), 'd1')), [a]);
  assert.deepEqual(S(writePages(WA(staff, P1), 'd1')), [a], 'والورقةُ لا تتجاوز الفعلي (c خارجه)');
  /* سلفٌ فارغ صراحةً يقفل كلَّ كتابة */
  const P2 = { caps: { g1: [] }, emps: { d1: { tst_e1: sheet } } };
  assert.deepEqual(S(writePages(WA(staff, P2), 'd1')), []);
  /* المديرُ بورقةٍ صريحة يُحكم بورقته كغيره */
  assert.deepEqual(S(writePages(WA(mgr, { caps: { g1: [a, b] }, emps: { d1: { 'mgr:d1': { [b]: ['add'] } } } }), 'd1')), [b]);
});
