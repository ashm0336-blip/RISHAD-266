/* RISHAD V7 P3 — the unified permissions editor.
   V7 · د5-هـ (44): the account window, the unit's templates editor, the legacy page×action tree rules (togLeafIn · viewAllIn · sheetDiff · keyDiff)
   and the one template-grant processor (grantTpl · grantTplByName) were DELETED with the templates and the employee-permissions window —
   their cases are deleted with them. What stays is the enforce tree of the kept ceiling editor: a new leaf grant is its first view key alone
   (t24TogLeaf ⇒ p24.primView), a partial leaf is withdrawn by its checkbox, «تحديد الكل» grants by the tree's own rule (t24ViewAll). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { needs } from './harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const T = rd('src/permissions/334-perm-tree-tpl.js'), L = rd('src/modules/admin/logic.js');
const REG = JSON.parse(rd('src/permissions/registry/registry-v24.9.json'));
function fnSrc(src, name, lead = '\n  function ') {
  const i = src.indexOf(lead + name + '('); assert.ok(i >= 0, name + ' exists');
  let j = src.indexOf('{', i), d = 0;
  for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && --d === 0) { j = k + 1; break; } }
  return src.slice(i + 1, j);
}
const ALL = ['view', 'add', 'edit', 'del', 'approve', 'export'];
const ctx0 = () => ({ ALL_ACTS: ALL, ACT_NAMES: { view: 'عرض', add: 'إضافة', edit: 'تعديل', del: 'حذف', approve: 'اعتماد', export: 'تصدير' }, JSON, nameOf: (k) => 'ن:' + k });
const load = (names, ctx) => { vm.createContext(ctx); vm.runInContext(names.map((n) => fnSrc(T, n)).join('\n'), ctx); return ctx; };

test('enforce: a new leaf grant is its first view key alone (p24.primView) — every assignable page and lens has one', needs('custody', 'irshad', 'tasks'), () => {
  const byKey = {}, byOwner = {}; REG.registry.forEach((e) => { byKey[e.key] = e; (byOwner[e.owner] = byOwner[e.owner] || []).push(e.key); });
  const c = load(['p24PrimView'], Object.assign(ctx0(), { p24R: () => ({ byKey, byOwner }) }));
  assert.equal(c.p24PrimView('tasks'), 'task.view'); assert.equal(c.p24PrimView('staff'), 'staff.view'); assert.equal(c.p24PrimView('irshad/records'), 'ir.rec.view');
  assert.equal(c.p24PrimView('emps/custody'), 'cust.view', 'the owner\'s own view key, not a managed reference');
  assert.equal(c.p24PrimView('lens.zones'), 'lens.zones.view');
  const owners = [...new Set(REG.registry.filter((e) => e.status === 'active' && e.grant === 'assignable' && e.ownerKind !== 'platform').map((e) => e.owner))];
  for (const o of owners) assert.ok(c.p24PrimView(o), 'a view key for ' + o);
  const tl = fnSrc(L, 't24TogLeaf', '\n  ');
  assert.match(tl, /P24\.primView\(l\.owner, l\.keys\)/); assert.match(tl, /this\.t24Add\(d, L, pv\)/); assert.doesNotMatch(tl, /ks\.forEach\(\(k\) => this\.t24Add/, 'no longer every key of the leaf');
  assert.match(L, /o\.cb\.togLeaf\(l, !lOnState\)/, 'a partial leaf is withdrawn by its checkbox, never silently widened (was !all)');
  const va = fnSrc(L, 't24ViewAll', '\n  ');
  assert.match(va, /"plugin" === l\.type \? -1 !== \(lens \|\| \[\]\)\.indexOf\(l\.lens\) : ks\.some\(\(k\) => on\[k\] && !dv\[k\]\)/, 'granted = the tree\'s rule: a lens by its gate, a leaf by a non-derived key (independent review: derived keys made the result depend on leaf order)');
});

