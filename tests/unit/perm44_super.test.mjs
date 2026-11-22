/* V7 · د5-هـ (44) · قرار المالك: مديرُ المنصة (role super) بلا أي قيد — كلُّ مفتاحٍ نشطٍ في السجلّ محمولٌ له في كل وحدة، مهما كان سقفُها (فارغاً)
   والوحداتُ المطفأة من المنصة (كلُّها) وأوراقُه (لا شيء) — ولا يُطلب منه سبب (reasonExempt · وبوابةُ 056 ترفع «reason» عنه)، ويُجاب «اختبار الوصول» عنه
   بـ allow/super. العاملُ الحقيقي (workers/_worker.js) دوالَّ مصدَّرة على فاعلٍ اصطناعي (TEST_ONLY). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { WORKER, ROOT } from './harness.mjs';

async function workerFns() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p44s-')), f = path.join(dir, 'w.mjs');
  fs.writeFileSync(f, fs.readFileSync(WORKER, 'utf8') + '\nexport { enfHeld, enfIx, reasonExempt, enfSuperGate, enfNo, perm44Decide, perm44RolesWhy, KIVO_REGISTRY };\n');
  try { return await import(pathToFileURL(f).href); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
const D = 'TEST_ONLY_d1';
const actor = (role) => ({
  u: role === 'super' ? { id: 'TEST_ONLY_su', role: 'super' } : { id: 'TEST_ONLY_m', role: 'staff', deptId: D, ekey: 'mgr:' + D, mgr: true },
  users: [], depts: [{ id: D, name: 'TEST_ONLY' }], nodes: [], perms: { caps: { [D]: [] }, emps: {} },
  off: ['dstats', 'emps', 'planning', 'daily', 'irshad', 'seized', 'award', 'links', 'help'], enf: { mode: 'enforce' }, __grants: {} });

test('perm44 · super: every active registry key is held, in an empty-ceiling unit with every system switched off', async () => {
  const M = await workerFns(), R = M.KIVO_REGISTRY, A = actor('super');
  const active = R.keys.filter((k) => R.byKey[k].status === 'active'), missing = active.filter((k) => !M.enfHeld(A, D, k));
  assert.ok(active.length > 200, 'registry: ' + active.length + ' active keys');
  assert.deepEqual(missing, [], 'held by the platform admin: every active key');
  /* the reserved keys stay default-deny for everyone (unknown/reserved is not a permission) */
  for (const k of R.keys.filter((x) => R.byKey[x].status !== 'active')) assert.equal(M.enfHeld(A, D, k), false, k + ' reserved');
  /* the same unit for a manager: the empty ceiling denies */
  const mg = actor('mgr'); assert.equal(M.enfHeld(mg, D, 'plan.view'), false, 'manager: empty ceiling denies');
});

test('perm44 · super: no reason is ever asked — reasonExempt and the 056 gate lift «reason»; keys that need a reason are still held', async () => {
  const M = await workerFns(), A = actor('super'), ix = M.enfIx();
  const reasonKeys = Object.keys(ix.reason);
  assert.ok(reasonKeys.length > 0, 'registry has keys that need a reason');
  assert.equal(M.reasonExempt(A), true);
  assert.equal(M.reasonExempt(actor('mgr')), false);
  const lifted = M.enfSuperGate(A, M.enfNo('reason', { keys: [reasonKeys[0]] }));
  assert.deepEqual([lifted.ok, lifted.path, lifted.lifted], [true, 'super', 'reason']);
  assert.equal(M.enfSuperGate(actor('mgr'), M.enfNo('reason')).ok, false, 'others still asked');
  for (const k of reasonKeys) assert.equal(M.enfHeld(A, D, k), true, k);
});

test('perm44 · super: the access test answers allow/super for a platform admin target, and the roles write rule never restricts him', async () => {
  const M = await workerFns(), A = actor('super');
  for (const k of ['plan.view', 'perm.assign', 'backup.restore']) {
    const v = M.perm44Decide(A, D, { rolesRec: null, ekey: 'x', key: k, target: { role: 'super' } });
    assert.deepEqual([v.allow, v.why], [true, 'super'], k);
  }
  const rec = JSON.stringify({ v: 1, roles: [{ id: 'r', name: 'TEST_ONLY', sys: { award: { lvl: 'sensitive' } } }], people: {} });
  assert.equal(M.perm44RolesWhy(A, 'bsdept:' + D + ':bassam_roles_v1', rec, null), '', 'super: a role on a switched-off system is accepted');
  assert.equal(M.perm44RolesWhy(actor('mgr'), 'bsdept:' + D + ':bassam_roles_v1', rec, null), 'cap', 'manager: refused (outside his unit ceiling)');
  const names = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/permissions/registry/perm44-levels.json'), 'utf8')).names;
  assert.equal(names.super, 'صلاحية كاملة بلا أي قيد');
});
