/* F01 · الأقسام (خطة التوحيد) — نموذجُ الواجهة: 320 محمّلاً في vm بتخزينٍ وهمي (ومخزنُ السحابة مُثبَّتٌ كما يشترطه الإقلاع)،
   ودوالُّ السقف الحقيقية من 331، وgmDepts من 330 — كما هي في المصدر (KIVO_SRC أو src).
     (1) القراءة: nodeOf · railTree · isSection · unitKind · parentDeptOf · sectionsOf · tree() · groupIdOf · deptDelWhy
     (2) قاعدةُ الموضع الواحدة (مرآةُ الخادم 018): القسم تحت إدارةٍ وحدها · لا شيءَ تحت قسم · لا عقدةَ «قسم» · لا عقدةَ تحت وحدة · تصادمُ المعرّفات
     (3) sectionAdd: مديرُ النظام ومديرُ الإدارة الأم (بسقفٍ صريحٍ من سقف الإدارة) — لا مديرُ إدارةٍ أخرى ولا موظف
     (4) 330 gmDepts: عقدةٌ فوقيةٌ قائمة وحدها (gm تالفٌ معرّفُه إدارةٌ لا يرث شيئاً) */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const SRC = process.env.KIVO_SRC ? path.resolve(process.env.KIVO_SRC) : path.join(ROOT, 'src');
const rd = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');
const J = (x) => JSON.parse(JSON.stringify(x));
function fnSrc(M, name, opt) {
  const i = M.indexOf('\n  function ' + name + '('); if (opt && i < 0) return ''; assert.ok(i > 0, name + ' موجودة');
  let j = M.indexOf('{', i), d = 0;
  for (let k = j; k < M.length; k++) { if (M[k] === '{') d++; else if (M[k] === '}' && --d === 0) { j = k + 1; break; } }
  return M.slice(i + 3, j);
}
const PAGE_KEYS = ['emps', 'tasks', 'plan', 'daily', 'admin', 'help'];
function world(user) {
  class Storage {
    constructor() { this._m = new Map(); }
    getItem(k) { return this._m.has(k) ? this._m.get(k) : null; }
    setItem(k, v) { this._m.set(String(k), String(v)); }
    removeItem(k) { this._m.delete(k); }
    clear() { this._m.clear(); }
    key(i) { return [...this._m.keys()][i] ?? null; }
    get length() { return this._m.size; }
  }
  const localStorage = new Storage(), sessionStorage = new Storage();
  const doc = { addEventListener() {}, body: { appendChild() {}, classList: { add() {}, remove() {} } }, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }), getElementById: () => null };
  const ctx = { Storage, localStorage, sessionStorage, KIVO: { __BS_SRV: { flushAsync() { return Promise.resolve(); } } }, document: doc, console, JSON, Date, Math, Object, Array, String, Number, Promise, setTimeout, clearTimeout };
  ctx.window = { localStorage, sessionStorage, addEventListener() {}, document: doc, __BS_BOOT: { srv: 1, cf: 1 } };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(rd('services/320-dept-storage.js'), ctx);
  const D = ctx.KIVO.BassamDepts; assert.ok(D && D.moveNode, 'BassamDepts موجودة');
  const M = rd('permissions/331-perm-model.js');
  const store = { caps: { a: ['emps', 'tasks', 'help'], d: ['emps'] }, emps: {} };
  Object.assign(ctx, { PAGE_KEYS, permStore: () => store, permSave: () => {}, isSuper: () => !!(user && user.role === 'super'), curDept: () => D.active(),
    patternSeed: (id) => { store.caps[id] = ['emps']; return { ok: true, n: 1 }; } });
  for (const f of ['splitLeaf', 'rawCap', 'hasCap', 'effCap', 'capSetAnywhere', 'deptCap', 'seedCapFrom']) { const t = fnSrc(M, f, true); if (t) vm.runInContext(t, ctx); }
  ctx.KIVO.BassamPerm = { seedCapFrom: ctx.seedCapFrom, hasCap: ctx.hasCap, deptCap: ctx.deptCap, effCap: ctx.effCap };
  ctx.KIVO.BassamAuth = { user: () => user, isSuper: () => !!(user && user.role === 'super') };
  Object.assign(ctx, { D });
  vm.runInContext(fnSrc(rd('auth/330-auth.js'), 'gmDepts'), ctx);
  D.saveNodes([{ id: 'top', name: 'الإدارة العليا', kind: 'إدارة عليا' }, { id: 'g1', name: 'الإدارة العامة 1', kind: 'إدارة عامة', pid: 'top' },
    { id: 'g2', name: 'الإدارة العامة 2', kind: 'إدارة عامة', pid: 'top' }]);
  D.save([{ id: 'a', name: 'إدارة أ', gid: 'g1' }, { id: 'b', name: 'إدارة ب', gid: 'g1' }, { id: 'd', name: 'إدارة د', gid: 'g2' },
    { id: 's1', name: 'قسم أ-1', gid: 'a', kind: 'قسم' }, { id: 's2', name: 'قسم د-1', gid: 'd', kind: 'قسم' }]);
  return { D, ctx, store };
}
const SUPER = { id: 'su', role: 'super' }, MGR_A = { id: 'ma', role: 'staff', mgr: true, deptId: 'a', ekey: 'mgr:a' };

test('F01 client (1) القراءة: القسمُ وحدةُ بيانات بنوع «قسم» تحت إدارته', () => {
  const { D } = world(SUPER);
  assert.deepEqual(J(D.nodeOf('s1')), { id: 's1', name: 'قسم أ-1', pid: 'a', kind: 'قسم', dept: true, sec: true });
  assert.deepEqual(J(D.nodeOf('a')), { id: 'a', name: 'إدارة أ', pid: 'g1', kind: 'إدارة', dept: true });
  const R = J(D.railTree()), ra = R.find((r) => r.id === 'a'), rs = R.find((r) => r.id === 's1');
  assert.equal(rs.kind, 'قسم'); assert.equal(rs.sec, true); assert.equal(rs.depth, ra.depth + 1);
  assert.equal(D.isSection('s1'), true); assert.equal(D.isSection('a'), false);
  assert.equal(D.unitKind('s1'), 'قسم'); assert.equal(D.unitKind('a'), 'إدارة'); assert.equal(D.unitKind('g1'), '');
  assert.equal(D.parentDeptOf('s1'), 'a'); assert.equal(D.parentDeptOf('a'), '');
  assert.deepEqual(J(D.sectionsOf('a').map((x) => x.id)), ['s1']); assert.deepEqual(J(D.sectionsOf('s1')), []);
  assert.equal(D.groupIdOf('s1'), 'g1', 'عقدةُ القسم عقدةُ إدارته');
  const g1 = J(D.tree()).find((g) => g.gid === 'g1');
  assert.deepEqual(g1.depts.map((x) => x.id), ['a', 's1', 'b'], 'القسمُ بعد إدارته مباشرةً');
  assert.match(D.deptDelWhy('a'), /أقسام/); assert.equal(D.deptDelWhy('b'), '');
});

test('F01 client (2) قاعدةُ الموضع وتصادمُ المعرّفات (مرآةُ الخادم)', () => {
  const { D } = world(SUPER);
  assert.equal(D.placeWhy({ id: '', dept: true, sec: true }, 'a'), '', 'قسمٌ تحت إدارة');
  for (const p of [null, 'g1', 's1']) assert.notEqual(D.placeWhy({ id: '', dept: true, sec: true }, p), '', 'قسمٌ تحت ' + p);
  assert.notEqual(D.placeWhy({ id: '', dept: false }, 's1'), '', 'عقدةٌ تحت قسم');
  assert.notEqual(D.placeWhy({ id: '', dept: false }, 'a'), '', 'عقدةٌ تحت إدارة');
  assert.equal(D.canParent('s1', 'g2'), false, 'القسم لا ينتقل تحت عقدة');
  assert.equal(D.canParent('s1', 'b'), true, 'القسم ينتقل إلى إدارةٍ أخرى');
  assert.equal(D.nodeAdd({ name: 'عقدة قسم', kind: 'قسم', pid: 'a' }).ok, false, 'لا عقدةَ من نوع «قسم»');
  assert.equal(D.nodeAdd({ name: 'تحت قسم', kind: 'وحدة', pid: 's1' }).ok, false, 'لا عقدةَ تحت قسم');
  assert.equal(D.setDeptParent('s1', 'g1').ok, false, 'setDeptParent يحكم بالقاعدة نفسِها');
  assert.equal(D.moveNode('a', 's2', 'inside').ok, false, 'لا إدارةَ تحت قسم');
  /* تصادمُ المعرّفات: معرّفٌ جديدٌ لا يصادم عقدةً ولا وحدة · وعنصرٌ متصادمٌ قائمٌ يُرفض تغييرُه */
  const f = D.freshId('s'); assert.ok(!D.nodeOf(f));
  D.saveNodes(D.nodes().concat([{ id: 'b', name: 'عقدة بمعرّف إدارة', kind: 'وحدة', pid: 'top' }]));
  assert.equal(D.idClash('b'), true);
  assert.equal(D.nodeSave('b', { name: 'اسم آخر' }).ok, false, 'عقدةٌ متصادمةٌ لا تُعدَّل');
});

test('F01 client (3) sectionAdd: مديرُ النظام ومديرُ الإدارة الأم وحدهما — وسقفُ القسم صريحٌ من سقف الإدارة', () => {
  let W = world(SUPER);
  let r = W.D.sectionAdd({ name: 'قسم ب-1', deptId: 'b' });
  assert.equal(r.ok, true, JSON.stringify(r)); assert.equal(W.D.parentDeptOf(r.id), 'b');
  assert.equal(W.D.sectionAdd({ name: 'قسم بلا أب', deptId: 'g1' }).ok, false, 'لا قسمَ تحت عقدة');
  assert.equal(W.D.sectionAdd({ name: 'قسم أ-1', deptId: 'a' }).ok, false, 'الاسمُ فريد');
  W = world(MGR_A);
  r = W.D.sectionAdd({ name: 'قسم أ-2', deptId: 'a' });
  assert.equal(r.ok, true, 'مديرُ الإدارة الأم: ' + JSON.stringify(r));
  assert.deepEqual(J(W.store.caps[r.id]), ['emps', 'tasks', 'help'], 'سقفُ القسم لقطةٌ من سقف إدارته');
  assert.equal(W.D.sectionAdd({ name: 'قسم د-2', deptId: 'd' }).ok, false, 'لا في إدارةٍ لا يديرها');
  W = world({ id: 'e1', role: 'staff', deptId: 'a', ekey: 'e1' });
  assert.equal(W.D.sectionAdd({ name: 'قسم موظف', deptId: 'a' }).ok, false, 'الموظفُ لا يُنشئ قسماً');
});

test('F01 client (4) 330 gmDepts: عقدةٌ فوقيةٌ قائمة وحدها — gm معرّفُه إدارةٌ لا يرث شيئاً', () => {
  const { ctx } = world(SUPER);
  assert.deepEqual(J(ctx.gmDepts('g1').map((d) => d.id)).sort(), ['a', 'b', 's1'], 'مديرُ العقدة: إداراتُ فرعه وأقسامُها');
  assert.deepEqual(J(ctx.gmDepts('a')), [], 'gm تالف (معرّفُه إدارة)');
});
