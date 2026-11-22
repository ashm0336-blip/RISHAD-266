/* RISHAD V7 P3 — the unified permissions editor.
   V7 · د5-هـ (44): the account window, the unit's templates editor, the legacy page×action tree rules (togLeafIn · viewAllIn · sheetDiff · keyDiff)
   and the one template-grant processor (grantTpl · grantTplByName) were DELETED with the templates and the employee-permissions window —
   their cases are deleted with them. V7 · د5-هـ (44 · التوحيد): «سقف الصفحات» وشجرتُه (t24TogLeaf · t24ViewAll · t24Rows) حُذفت أيضاً —
   فحُذفت حالاتُها؛ ويبقى هنا قاعدةُ المحرّك p24.primView (مفتاحُ العرض الأول لكل ورقة) في 334. */
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
  /* V7 · د5-هـ (44): شجرةُ المحرّر (t24TogLeaf · t24ViewAll) حُذفت مع «سقف الصفحات» */
  assert.ok(!/\n  t24TogLeaf\(|\n  t24ViewAll\(|\n  t24Rows\(/.test(L), 'the legacy tree editor is gone from the admin page');
});

