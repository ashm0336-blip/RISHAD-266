/* RISHAD V7 P0 — the org graph is judged on what a save leaves behind, on the real worker (legacy and enforce), TEST_ONLY data only.
   Before P0 the server judged only added or changed node rows: a direct save could remove a node that still had child nodes, data units
   or a general-manager account (orphans), and could remove a node together with its children in one save. The client guard (nodeDel)
   was the only protection. Now:
     · removing a node that a node or a data unit still points at        ⇒ «node-has-children», nothing written;
     · removing a node together with a child node in the same save       ⇒ «node-cascade», nothing written;
     · removing a node a general-manager account is still bound to      ⇒ «node-has-manager», nothing written;
     · removing an empty node, or a node whose children were moved away in the same save ⇒ accepted;
     · a non-super account cannot write the node registry at all (unchanged). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeTestEnv, client, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';

const KG = 'bassam_gdepts_v1', KD = 'bassam_depts_v1', KU = 'bassam_auth_users_v1';
const NODES = [
  { id: 'TEST_ONLY_G1', name: 'TEST_ONLY عقدة 1', kind: 'قطاع' },
  { id: 'TEST_ONLY_G2', name: 'TEST_ONLY عقدة 2', kind: 'إدارة عامة', pid: 'TEST_ONLY_G1' },
  { id: 'TEST_ONLY_G3', name: 'TEST_ONLY عقدة فارغة', kind: 'إدارة عامة' },
  { id: 'TEST_ONLY_G4', name: 'TEST_ONLY عقدة لها إدارة', kind: 'إدارة عامة' },
  { id: 'TEST_ONLY_G5', name: 'TEST_ONLY عقدة لها مدير عام', kind: 'إدارة عامة' },
];
const DEPTS = [{ id: 'TEST_ONLY_D4', name: 'TEST_ONLY إدارة 4', gid: 'TEST_ONLY_G4' }];

function put(DB, k, v) {
  DB.db.prepare('DELETE FROM kv WHERE k = ?').run(k);
  DB.db.prepare('INSERT INTO kv (k, seq, v) VALUES (?, 0, ?)').run(k, JSON.stringify(v));
  DB.db.prepare('INSERT INTO revs (k, rev) VALUES (?, 1) ON CONFLICT(k) DO UPDATE SET rev = rev + 1').run(k);
}
const read = (DB, k) => JSON.parse(DB.q('SELECT v FROM kv WHERE k = ? ORDER BY seq', k).map((r) => r.v).join('') || 'null');

async function world(mode) {
  const env = makeTestEnv(mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce' } : {}), DB = env.DB;
  if (mode === 'enforce') DB.exec("INSERT INTO meta(k,v) VALUES('authz_mode','enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  put(DB, KG, NODES); put(DB, KD, DEPTS);
  const users = read(DB, KU); const sup = users.find((u) => u.role === 'super');
  users.push({ id: 'TEST_ONLY_gm5', un: '1099999905', name: 'TEST_ONLY مدير عام', role: 'gm', gid: 'TEST_ONLY_G5', ekey: 'gm:TEST_ONLY_G5', ph: sup.ph, mc: 0, dis: 0 });
  put(DB, KU, users);
  const C = client(env); const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok, 'TEST super signs in');
  return { env, DB, C, ck: su.ck };
}
const without = (...ids) => NODES.filter((n) => !ids.includes(n.id));
const why = (r) => (r.j && r.j.denied && r.j.denied[KG] && r.j.denied[KG].why) || '';

for (const mode of ['legacy', 'enforce']) {
  test('[' + mode + '] removing a node that still has children, units or a general manager is refused; nothing is written', async () => {
    const { DB, C, ck } = await world(mode);
    const cases = [
      ['a node with a child node', without('TEST_ONLY_G1'), 'node-has-children'],
      ['a node with a data unit', without('TEST_ONLY_G4'), 'node-has-children'],
      ['a node and its child in one save (chained delete)', without('TEST_ONLY_G1', 'TEST_ONLY_G2'), 'node-cascade'],
      ['a node with a general-manager account', without('TEST_ONLY_G5'), 'node-has-manager'],
    ];
    for (const [label, next, expect] of cases) {
      const r = await C.save(ck, { [KG]: JSON.stringify(next) });
      assert.equal(why(r), expect, label + ': ' + JSON.stringify(r.j).slice(0, 220));
      assert.deepEqual(read(DB, KG), NODES, label + ': the stored graph is unchanged');
    }
  });

  test('[' + mode + '] an empty node is removed; a node whose child is moved away in the same save is removed', async () => {
    const { DB, C, ck } = await world(mode);
    const r1 = await C.save(ck, { [KG]: JSON.stringify(without('TEST_ONLY_G3')) });
    assert.equal(why(r1), '', 'empty node: ' + JSON.stringify(r1.j).slice(0, 200));
    assert.deepEqual(read(DB, KG).map((n) => n.id), ['TEST_ONLY_G1', 'TEST_ONLY_G2', 'TEST_ONLY_G4', 'TEST_ONLY_G5']);
    const moved = read(DB, KG).filter((n) => n.id !== 'TEST_ONLY_G1').map((n) => (n.id === 'TEST_ONLY_G2' ? Object.assign({}, n, { pid: '' }) : n));
    const r2 = await C.save(ck, { [KG]: JSON.stringify(moved) });
    assert.equal(why(r2), '', 'child moved to the root, parent removed: ' + JSON.stringify(r2.j).slice(0, 200));
    assert.deepEqual(read(DB, KG).map((n) => [n.id, n.pid || '']), [['TEST_ONLY_G2', ''], ['TEST_ONLY_G4', ''], ['TEST_ONLY_G5', '']]);
  });

  test('[' + mode + '] after the general manager is removed, its node can be removed (two saves, in that order)', async () => {
    const { DB, C, ck } = await world(mode);
    const users = read(DB, KU).filter((u) => u.id !== 'TEST_ONLY_gm5');
    put(DB, KU, users);   /* the account removal itself is the existing, separately tested path (removeGroupManager) */
    const r = await C.save(ck, { [KG]: JSON.stringify(without('TEST_ONLY_G5')) });
    assert.equal(why(r), '', JSON.stringify(r.j).slice(0, 200));
    assert.ok(!read(DB, KG).some((n) => n.id === 'TEST_ONLY_G5'));
  });
}

test('[enforce] a non-super account still cannot write the node registry', async () => {
  const { DB, C } = await world('enforce');
  const users = read(DB, KU), sup = users.find((u) => u.role === 'super');
  users.push({ id: 'TEST_ONLY_mgr4', un: '1099999904', name: 'TEST_ONLY مدير إدارة', role: 'staff', deptId: 'TEST_ONLY_D4', ekey: 'mgr:TEST_ONLY_D4', mgr: true, ph: sup.ph, mc: 0, dis: 0 });
  put(DB, KU, users);
  const m = await C.login('1099999904', TEST_SUPER_PIN); assert.ok(m.ok, 'TEST manager signs in');
  const r = await C.save(m.ck, { [KG]: JSON.stringify(without('TEST_ONLY_G3')) });
  assert.ok(why(r) && why(r) !== '', 'refused: ' + JSON.stringify(r.j).slice(0, 160));
  assert.deepEqual(read(DB, KG), NODES);
});
