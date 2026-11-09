/* RISHAD CORE-02 step 5 — dead code and real duplication removed from the admin center (src/modules/admin), nothing useful lost.
     (1) the removed symbols are gone from the module source, its template and the generated page (src/pages/Admin.dc.html);
     (2) the kept entry points still exist — including the functions that show the same data in different useful places
         (presence: overview «المتصلون الآن» + security sessions; frozen accounts: overview card + the accounts filter);
     (3) «+ إدارة عامة جديدة…» goes through BassamDepts.nodeAdd + setDeptParent (no direct saveGroups) — run on the real 320 service;
     (4) the unit branch of ndGo obeys placeWhy and takes its id from freshId — valid input behaves as before, a unit under a unit is refused.
   The handlers are taken verbatim from logic.js and run against BassamDepts loaded in vm (in-memory storage). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const SRC = process.env.KIVO_SRC ? path.resolve(process.env.KIVO_SRC) : path.join(ROOT, 'src');
const rd = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');
const L = rd('modules/admin/logic.js'), V = rd('modules/admin/view.html'), PG = rd('pages/Admin.dc.html'), CSS = rd('modules/admin/helmet.css');
const J = (x) => JSON.parse(JSON.stringify(x));
const word = (s, w) => new RegExp('(^|[^A-Za-z0-9_$])' + w.replace(/\$/g, '\\$') + '(?![A-Za-z0-9_$])').test(s);

test('(1) removed symbols are gone from the admin module, its template and the generated page', () => {
  const GONE = [
    '_grpRows',                                                      /* fallback for a BassamDepts without railTree — it always has one */
    'grpDel', 'grpDelTip', 'grpDelStyle', 'grpArm', 'grpGmDel', 'grpGmArm', 'grpGmDelTip', 'grpGmDelStyle', 'grpDisGo', 'grpDisTip', 'grpDisStyle',
    'grpPermOpen', 'grpPermTip', 'grpSaveName', 'grpStartEdit', 'grpEdit', 'grpNotEdit', 'grpDraft', 'grpStop', 'grpOnName', 'grpEditStyle',
    'grpAddGo', 'grpAddTip', 'grpAddStyle', 'grpMgrOpen', 'grpMgrBtnStyle', 'grpMgrLbl', 'grpMgrLblStyle', 'grpCapLbl', 'grpCapTip', 'grpCapStyle',
    'grpStyle', 'grpCntStyle', 'grpKindStyle', 'grpCanEdit', 'grpNid', 'admGrpEdit', 'admGrpName', 'admGrpArm', 'admGrpArmTs', 'admGmArm', '_gmArmT',
    'deptAddOpen', 'deptAddSave', 'deptAddOn', 'deptAddClose', 'newDeptName', 'newDeptPid', 'onNewDeptPid', 'newDeptPidOpts', 'newDeptPathTxt', 'onNewDept', 'addDept',
    'dhNever', 'dhRename', 'dhCap', 'dhDisOn', 'dhDis', 'dhDisLbl', 'dhMgr',
    'deptIntro', 'fbkCur', 'fbkOver', 'fbkFresh', 'ovGo', 'trIsSector', 'trIsRow', 'depOn', 'depStyle', 'kidOpen',
  ];
  for (const [n, s] of [['logic.js', L], ['view.html', V], ['Admin.dc.html', PG]]) assert.deepEqual(GONE.filter((w) => word(s, w)), [], n + ': no removed symbol is left');
  assert.ok(!/saveGroups/.test(L), 'the admin module never writes the groups record directly');
  assert.ok(!/adm-ov-go|اختصارات/.test(V) && !/adm-ov-go/.test(CSS), 'the overview quick-links strip (a copy of the tab bar) is gone, with its style');
  assert.ok(!/class="tr-sec/.test(V) && !/\.tr-sec/.test(CSS), 'the never-shown sector bar is gone, with its style');
  assert.ok(!/S\.key\.uid,/.test(L), 'the dead comma expression in plRkNote is gone');
  for (const t of ['إدارات حالية', 'موجودة في الاثنين', 'إدارات جديدة']) assert.ok(!V.includes('>' + t + '<'), 'full-restore dialog: the always-«—» box «' + t + '» is gone');
});

test('(2) kept entry points still exist (same data shown in different useful places is not duplication)', () => {
  const METHODS = ['_nodeRows', '_nodeHead', '_parentOpts', 'nodePick', '_trDragProps', '_trMove', '_trFilter', '_trSetAll', '_grpFlip', 'deptDel', '_deptDelGo',
    'fbkCommit', 'gmOpen', 'mgrOpen', 'wpOpen', 'sysPick', '_admGo', '_plGo', 'plRkLoad', 'audLoad'];
  for (const m of METHODS) assert.match(L, new RegExp('\\n  (async )?' + m.replace(/\$/g, '\\$') + '\\('), 'method ' + m);
  const KEYS = ['dhAdd', 'dhSecAdd', 'dhSecAddOn', 'dhSwitch', 'dhExp', 'dhImpPick', 'dhImpStop', 'dhWipe', 'dhDel', 'dhDelOn', 'dhDelLbl', 'goTabData', 'goTabOv', 'orgBack', 'dhIsNode', 'dhNotActive',
    'selSetGid', 'selRenameSave', 'gdeptOpts', 'ndGo', 'ndPidOpts', 'ndKinds', 'deptRows', 'fbkFile', 'fbkMerge', 'fbkAskReplace', 'fbkDoReplace', 'fbkCancel',
    'ovPres', 'ovPresEmpty', 'secSess', 'secSessN', 'ovFrozen', 'ovFrozenN', 'usFilters', 'usCards', 'admGoBackup'];   /* CORE-02 S7: admSubLnkGo left with the in-page strip — «التهيئة والاستعادة» is one sidebar item */
  for (const k of KEYS) {
    assert.ok(word(L, k), 'logic.js still provides ' + k);
    assert.ok(V.includes('{{' + k + '}}') || V.includes('{{' + k + '.'), 'view.html still renders ' + k);
  }
  /* the security-log row icon draws its per-kind path through the icon catalog body (<path d="{{r.icoPath}}">): icoPath is live, kept */
  assert.ok(word(L, 'icoPath') && PG.includes('{{r.icoPath}}'), 'security-log icons keep their per-kind path');
  /* the tree row props that view.html reads are still produced by _nodeHead */
  const head = L.slice(L.indexOf('\n  _nodeHead('), L.indexOf('\n  _parentOpts('));
  for (const p of ['grpDepth', 'trDepCls', 'trSelCls', 'grpName', 'grpCount', 'grpCountW', 'grpKindOn', 'grpKindLbl', 'grpChevOn', 'grpChev', 'grpToggle', 'grpCapGo', 'grpMgrHas', 'grpMgrNone', 'grpMgrTip', 'grpMgrName']) {
    assert.ok(head.includes('o.' + p + ' ='), '_nodeHead sets ' + p);
    assert.ok(V.includes('{{d.' + p + '}}') || p === 'grpDepth', 'view.html reads d.' + p);
  }
  assert.ok(head.includes('_trDragProps(s.id, e)'), 'node rows stay draggable');
});

/* ── the real BassamDepts in vm ── */
function world() {
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
  const seeded = [];
  const ctx = { Storage, localStorage, sessionStorage, KIVO: { __BS_SRV: { flushAsync() { return Promise.resolve(); } } }, document: doc, console, JSON, Date, Math, Object, Array, String, Number, Promise, setTimeout, clearTimeout };
  ctx.window = { localStorage, sessionStorage, addEventListener() {}, document: doc, __BS_BOOT: { srv: 1, cf: 1 } };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(rd('services/320-dept-storage.js'), ctx);
  const D = ctx.KIVO.BassamDepts;
  ctx.KIVO.BassamPerm = { seedCapFrom: (id, pid) => { seeded.push([id, pid || null]); return { ok: true }; } };
  D.saveNodes([{ id: 'top', name: 'الإدارة العليا', kind: 'إدارة عليا' }, { id: 'g1', name: 'الإدارة العامة 1', kind: 'إدارة عامة', pid: 'top' }]);
  D.save([{ id: 'a', name: 'إدارة أ', gid: 'g1' }, { id: 'b', name: 'إدارة ب' }, { id: 's1', name: 'قسم أ-1', gid: 'a', kind: 'قسم' }]);
  return { D, ctx, seeded };
}
/* a handler taken verbatim from logic.js («key: (args) => { … }»), brace-matched */
function handler(key) {
  const i = L.indexOf(key + ': ('); assert.ok(i > 0 && L.indexOf(key + ': (', i + 1) < 0, key + ' appears once');
  const a = L.indexOf('=> {', i); let d = 0, j = a + 3;
  for (; j < L.length; j++) { if (L[j] === '{') d++; else if (L[j] === '}' && --d === 0) break; }
  return L.slice(i + key.length + 2, j + 1);
}
function page(ctx, state) {
  const out = { states: [], toasts: [] };
  const self = { state: { ...state }, setState(s) { out.states.push(s); Object.assign(this.state, s); }, bsToast(m) { out.toasts.push(m); } };
  return { self, out };
}

test('(3) «+ إدارة عامة جديدة…» uses nodeAdd + setDeptParent: a real node with kind, placement rule, fresh id and seeded ceiling', () => {
  const { D, ctx, seeded } = world();
  const mk = vm.runInContext('(function (t, n, o) { return (' + handler('selSetGid') + '); })', ctx);
  const nodes0 = D.nodes().length, { self, out } = page(ctx, {});
  mk.call(self, D, false, 'b')({ target: { value: '__new' } });
  const fresh = D.nodes().filter((x) => x.name === 'إدارة عامة جديدة');
  assert.equal(D.nodes().length, nodes0 + 1, 'one node was created');
  assert.equal(fresh.length, 1);
  assert.deepEqual(J({ kind: fresh[0].kind, pid: fresh[0].pid || null }), { kind: 'إدارة عامة', pid: null }, 'a general department in the root, as before — now with its kind');
  assert.match(fresh[0].id, /^n[0-9a-z]+$/, 'id from freshId (the node prefix), not "g"+time');
  assert.equal(D.nodeOf('b').pid, fresh[0].id, 'the unit is assigned under it (setDeptParent)');
  assert.deepEqual(seeded, [[fresh[0].id, null]], 'its page ceiling is opened at creation (seedCapFrom), as for every node');
  assert.match(out.states.at(-1).deptMsg, /^✓ أُنشئت «إدارة عامة جديدة» وأُسندت إليها هذه الإدارة/);
  /* a second one gets the next free name */
  mk.call(self, D, false, 'a')({ target: { value: '__new' } });
  assert.ok(D.nodes().some((x) => x.name === 'إدارة عامة جديدة 2') && D.nodeOf('a').pid !== 'g1', 'next name; unit a moved under it');
  /* a section cannot sit under a general department: refused before anything is written */
  const before = D.nodes().length, s0 = D.nodeOf('s1').pid;
  mk.call(self, D, false, 's1')({ target: { value: '__new' } });
  assert.equal(D.nodes().length, before, 'nothing created for a section'); assert.equal(D.nodeOf('s1').pid, s0, 'the section stays under its unit');
  assert.match(out.toasts.at(-1), /القسم يكون تحت إدارةٍ مباشرةً/);
  /* the ordinary re-parent path is unchanged */
  mk.call(self, D, false, 'b')({ target: { value: 'g1' } });
  assert.equal(D.nodeOf('b').pid, 'g1', 'choosing an existing parent still re-parents through setDeptParent');
});

test('(4) ndGo unit branch: placeWhy + freshId — valid input as before, a unit under a unit refused', () => {
  const { D, ctx, seeded } = world();
  const mk = vm.runInContext('(function (t) { return (' + handler('ndGo') + '); })', ctx);
  /* valid: a unit under a general department */
  let p = page(ctx, { ndName: 'إدارة ج', ndKind: 'إدارة', ndPid: 'g1', admGrpFlip: { g1: 1 } });
  mk.call(p.self, D)();
  const c = D.list().find((x) => x.name === 'إدارة ج');
  assert.ok(c, 'the unit was created'); assert.equal(c.gid, 'g1', 'under its parent');
  assert.match(c.id, /^d[0-9a-z]+$/, 'id format unchanged ("d" + base36), now from freshId (no clash with a node or unit id)');
  assert.deepEqual(seeded, [[c.id, 'g1']], 'its ceiling is seeded from the parent, as before');
  assert.equal(p.out.states.at(-1).ndMsg, '✓ أُنشئت إدارة «إدارة ج» — أكمل حساب دخولها من صفّها', 'same message as before');
  assert.deepEqual(J(p.out.states.at(-1).admGrpFlip), {}, 'the parent is unfolded, as before');
  /* valid: a unit in the root */
  p = page(ctx, { ndName: 'إدارة د', ndKind: 'إدارة', ndPid: '' });
  mk.call(p.self, D)();
  assert.ok(D.list().some((x) => x.name === 'إدارة د' && !x.gid), 'a root unit is still allowed');
  /* invalid: a unit under a unit, or under a section — refused by the shared placement rule, nothing written */
  for (const pid of ['a', 's1']) {
    const n0 = D.list().length;
    p = page(ctx, { ndName: 'إدارة تحت ' + pid, ndKind: 'إدارة', ndPid: pid });
    mk.call(p.self, D)();
    assert.equal(D.list().length, n0, 'nothing created under ' + pid);
    assert.equal(p.out.states.at(-1).ndMsg, D.placeWhy({ id: '', dept: true }, pid), 'the placeWhy reason is shown');
  }
  /* missing parent: the existing message */
  p = page(ctx, { ndName: 'إدارة هـ', ndKind: 'إدارة', ndPid: 'nope' });
  mk.call(p.self, D)();
  assert.equal(p.out.states.at(-1).ndMsg, 'الأب غير موجود');
});
