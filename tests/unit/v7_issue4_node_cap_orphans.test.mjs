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
