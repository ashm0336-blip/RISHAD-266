/* RISHAD V7 · issue #4 — deleting a NODE deletes its ceiling records (caps · subs · lenses · its capOwn flag).
   They used to stay in bassam_perms_v1 after the node was gone (the server cleans a deleted UNIT, not a node). If the node id came
   back by an import or a restore, seedCapFrom kept the old record («it already has a ceiling — untouched») and the node carried a
   stale ceiling silently. dropNodeCap is the counterpart of seedCapFrom, called by BassamDepts.nodeDel; platform administrator only;
   nothing of any other unit is touched; the capOwn map itself stays (the server refuses dropping it — 021 capOwnWhy). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const M = rd('src/permissions/331-perm-model.js'), T = rd('src/permissions/334-perm-tree-tpl.js'), S = rd('src/services/320-dept-storage.js');
function fnSrc(src, name) { const i = src.indexOf('\n  function ' + name + '('); assert.ok(i >= 0, name); let j = src.indexOf('{', i), d = 0; for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && --d === 0) { j = k + 1; break; } } return src.slice(i + 1, j); }
function world(store, sup = true) { const saved = []; const ctx = { isSuper: () => sup, permStore: () => store, permSave: (o) => saved.push(JSON.parse(JSON.stringify(o))), Object, JSON }; vm.createContext(ctx); vm.runInContext(fnSrc(M, 'dropNodeCap'), ctx); return { ctx, saved }; }
const J = (x) => JSON.parse(JSON.stringify(x));

test('dropNodeCap removes the node\'s own records and nothing else', () => {
  const store = { caps: { N: ['emps'], U: ['tasks'] }, subs: { N: { emps: ['data'] }, U: { emps: [] } }, lenses: { N: ['zones'], U: [] }, capOwn: { N: true, U: true }, emps: { U: { e: { tasks: ['view'] } } }, tplOf: {}, empLens: {} };
  const w = world(store), r = J(w.ctx.dropNodeCap('N'));
  assert.deepEqual(r, { ok: true, removed: ['caps', 'subs', 'lenses', 'capOwn'] });
  assert.equal(w.saved.length, 1, 'one ordinary save');
  assert.deepEqual(w.saved[0], { caps: { U: ['tasks'] }, subs: { U: { emps: [] } }, lenses: { U: [] }, capOwn: { U: true }, emps: { U: { e: { tasks: ['view'] } } }, tplOf: {}, empLens: {} }, 'the other unit is untouched');
});
test('the last capOwn flag leaves an empty map (the server refuses dropping the map); no record ⇒ no save', () => {
  let w = world({ caps: { N: [] }, capOwn: { N: true } }); w.ctx.dropNodeCap('N');
  assert.deepEqual(w.saved[0], { caps: {}, capOwn: {} });
  w = world({ caps: { U: ['tasks'] }, subs: {}, lenses: {} }); const r = J(w.ctx.dropNodeCap('N'));
  assert.deepEqual(r, { ok: true, removed: [] }); assert.equal(w.saved.length, 0, 'a node without records writes nothing');
});
test('platform administrator only; an id is required', () => {
  const w = world({ caps: { N: ['emps'] } }, false); assert.equal(w.ctx.dropNodeCap('N').ok, false); assert.equal(w.saved.length, 0);
  assert.equal(world({ caps: {} }).ctx.dropNodeCap('').ok, false);
});
test('nodeDel calls it after removing the node; exported on KIVO.BassamPerm', () => {
  const i = S.indexOf('nodeDel: function(id) {'), body = S.slice(i, S.indexOf('setDeptParent: function', i));
  assert.ok(body.indexOf('this.saveNodes(') < body.indexOf('P.dropNodeCap(id)'), 'after the node is removed');
  assert.match(body, /if \(kd\.length\) return \{ ok: false/, 'a node with children is still refused first — nothing is dropped');
  assert.match(T, /dropNodeCap: I\.dropNodeCap,/); assert.match(M, /I\.dropNodeCap = dropNodeCap;/);
});
test('nodeAdd (a node made by hand) drops a leftover of its id before seeding — it never carries a stored leftover along', () => {
  const i = S.indexOf('nodeAdd: function(o) {'), body = S.slice(i, S.indexOf('nodeSave: function', i));
  const d = body.indexOf('P.dropNodeCap(id)'), sd = body.indexOf('P.seedCapFrom(id, pid)');
  assert.ok(d > 0 && sd > d, 'dropNodeCap, then seedCapFrom');
  assert.ok(body.indexOf('this.saveNodes(') < d, 'after the node is written');
  /* behaviour: a leftover is removed, then the parent\'s ceiling is seeded (seedCapFrom no longer answers «kept») */
  const store = { caps: { P: ['emps', 'tasks'], N: ['emps'] }, subs: { N: { emps: ['data'] } }, lenses: {}, capOwn: { N: true } }, saved = [];
  const ctx = { isSuper: () => true, permStore: () => store, permSave: (o) => saved.push(J(o)), hasCap: (id) => Array.isArray(store.caps[id]), effCap: (id) => store.caps[id].slice(), patternSeed: () => assert.fail('not an empty parent'), Object, JSON, Array };
  vm.createContext(ctx); vm.runInContext(fnSrc(M, 'dropNodeCap') + '\n' + fnSrc(M, 'seedCapFrom'), ctx);
  ctx.dropNodeCap('N'); const r = J(ctx.seedCapFrom('N', 'P'));
  assert.deepEqual(r, { ok: true, n: 2 }, 'seeded from the parent — not «kept»');
  assert.deepEqual(saved[saved.length - 1], { caps: { P: ['emps', 'tasks'], N: ['emps', 'tasks'] }, subs: {}, lenses: {}, capOwn: {} });
});

/* READ-ONLY check of existing leftovers (331 capOrphans): ceiling entries whose id is neither a current node nor a current unit/section. */
function orphanWorld(store, nodes, units) {
  const saved = [], D = nodes === null ? null : { nodes: () => nodes, list: () => units };
  const ctx = { KIVO: { BassamDepts: D }, permStore: () => store, permSave: (o) => saved.push(o), Object, String };
  vm.createContext(ctx); vm.runInContext(fnSrc(M, 'capOrphans'), ctx); return { ctx, saved };
}
test('capOrphans counts the leftovers and names the maps holding them — nodes, units and sections are not leftovers', () => {
  const store = { caps: { N: ['emps'], U: ['tasks'], S: [], GONE: ['emps'], OLD: [] }, subs: { GONE: { emps: ['data'] }, U: {} }, lenses: { GONE: ['zones'], N: [] }, capOwn: { OLD: true, U: true },
    emps: { ELSE: { e: {} } }, tplOf: { ELSE: {} }, empLens: { ELSE: {} } };
  const before = JSON.stringify(store), w = orphanWorld(store, [{ id: 'N' }], [{ id: 'U' }, { id: 'S', kind: 'قسم', gid: 'U' }]);
  assert.deepEqual(J(w.ctx.capOrphans()), { ok: true, n: 2, ids: ['GONE', 'OLD'], maps: { GONE: ['caps', 'subs', 'lenses'], OLD: ['caps', 'capOwn'] } });
  assert.equal(JSON.stringify(store), before, 'read-only: the registry is untouched'); assert.equal(w.saved.length, 0, 'nothing is saved');
  assert.deepEqual(J(orphanWorld({ caps: { N: [] }, subs: {}, lenses: {} }, [{ id: 'N' }], []).ctx.capOrphans()), { ok: true, n: 0, ids: [], maps: {} });
});
test('capOrphans: an unreadable structure is an error, never «everything is a leftover»; no deletion in its source; exported', () => {
  assert.equal(orphanWorld({ caps: { N: [] } }, null).ctx.capOrphans().ok, false);
  const src = fnSrc(M, 'capOrphans'); assert.doesNotMatch(src, /permSave|delete |setItem/);
  assert.match(T, /capOrphans: I\.capOrphans,/); assert.match(M, /I\.capOrphans = capOrphans;/);
});
