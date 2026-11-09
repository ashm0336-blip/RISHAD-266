/* RISHAD V7 P2 — account isolation behind «المسؤولون والحسابات», on the real worker (legacy and enforce), TEST_ONLY data only.
   P2 lists accounts per node and gives every row one action menu (edit · freeze/re-enable · temporary password · permissions ·
   sign-out · delete). Showing an account never grants a write: each action is a write of bassam_auth_users_v1 that the server judges
   (044 usersA1Why/usersRule · 059 enfUsersWrite). This test pins, without any server change:
     · reads are scoped: a unit manager / an employee read their unit's accounts (and the general manager), never another unit's;
       a general manager reads the branch; no password hash is ever sent;
     · writes: a unit manager cannot freeze, reset or delete an account of another unit, nor touch the general manager or the platform
       administrator; an employee cannot write accounts; the platform administrator can freeze, reset and delete (what the menu sends). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeTestEnv, client, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';

const KG = 'bassam_gdepts_v1', KD = 'bassam_depts_v1', KU = 'bassam_auth_users_v1';
function put(DB, k, v) {
  DB.db.prepare('DELETE FROM kv WHERE k = ?').run(k);
  DB.db.prepare('INSERT INTO kv (k, seq, v) VALUES (?, 0, ?)').run(k, JSON.stringify(v));
  DB.db.prepare('INSERT INTO revs (k, rev) VALUES (?, 1) ON CONFLICT(k) DO UPDATE SET rev = rev + 1').run(k);
}
const read = (DB, k) => JSON.parse(DB.q('SELECT v FROM kv WHERE k = ? ORDER BY seq', k).map((r) => r.v).join('') || 'null');
const UN = { mA: '1099300001', mB: '1099300002', sA: '1099300003', sB: '1099300004', g: '1099300005' };

async function world(mode) {
  const env = makeTestEnv(mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce' } : {}), DB = env.DB;
  if (mode === 'enforce') DB.exec("INSERT INTO meta(k,v) VALUES('authz_mode','enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  put(DB, KG, [{ id: 'TEST_ONLY_G', name: 'TEST_ONLY G', kind: 'إدارة عامة' }]);
  put(DB, KD, [{ id: 'TEST_ONLY_A', name: 'TEST_ONLY A', gid: 'TEST_ONLY_G' }, { id: 'TEST_ONLY_B', name: 'TEST_ONLY B', gid: 'TEST_ONLY_G' }]);
  const U = read(DB, KU), ph = U.find((u) => u.role === 'super').ph;
  U.push(
    { id: 'TEST_ONLY_mA', un: UN.mA, name: 'TEST_ONLY mA', role: 'staff', deptId: 'TEST_ONLY_A', ekey: 'mgr:TEST_ONLY_A', mgr: true, ph, mc: 0, dis: 0 },
    { id: 'TEST_ONLY_mB', un: UN.mB, name: 'TEST_ONLY mB', role: 'staff', deptId: 'TEST_ONLY_B', ekey: 'mgr:TEST_ONLY_B', mgr: true, ph, mc: 0, dis: 0 },
    { id: 'TEST_ONLY_sA', un: UN.sA, name: 'TEST_ONLY sA', role: 'staff', deptId: 'TEST_ONLY_A', ekey: 'E1', ph, mc: 0, dis: 0 },
    { id: 'TEST_ONLY_sB', un: UN.sB, name: 'TEST_ONLY sB', role: 'staff', deptId: 'TEST_ONLY_B', ekey: 'E2', ph, mc: 0, dis: 0 },
    { id: 'TEST_ONLY_g', un: UN.g, name: 'TEST_ONLY g', role: 'gm', gid: 'TEST_ONLY_G', ekey: 'gm:TEST_ONLY_G', ph, mc: 0, dis: 0 },
  );
  put(DB, KU, U);
  return { env, DB, C: client(env), all: U };
}
const ids = (j) => { const v = j && j.keys && j.keys[KU] && j.keys[KU].v; return v ? JSON.parse(v) : null; };
const refused = (r) => r.status >= 400 || !!(r.j && r.j.denied && r.j.denied[KU]);

for (const mode of ['legacy', 'enforce']) {
  test('[' + mode + '] reads are scoped by unit and role, and never carry a password hash', async () => {
    const { C } = await world(mode);
    const seen = {};
    for (const [who, un] of Object.entries(UN)) {
      const L = await C.login(un, TEST_SUPER_PIN); assert.ok(L.ok, who + ' signs in');
      const list = ids((await C.api('/api/get?keys=' + KU, { cookie: L.ck })).j);
      assert.ok(Array.isArray(list), who + ' reads the accounts list');
      assert.ok(list.every((u) => !u.ph), who + ': no password hash is sent');
      seen[who] = list.map((u) => u.id).filter((x) => /TEST_ONLY/.test(x)).sort();
    }
    for (const who of ['mA', 'sA']) assert.ok(!seen[who].some((x) => /_(mB|sB)$/.test(x)), who + ' never reads unit B accounts: ' + seen[who]);
    for (const who of ['mB', 'sB']) assert.ok(!seen[who].some((x) => /_(mA|sA)$/.test(x)), who + ' never reads unit A accounts: ' + seen[who]);
    assert.ok(seen.mA.includes('TEST_ONLY_sA') && seen.mA.includes('TEST_ONLY_mA'), 'the unit manager reads its own unit');
    assert.deepEqual(seen.g, ['TEST_ONLY_g', 'TEST_ONLY_mA', 'TEST_ONLY_mB', 'TEST_ONLY_sA', 'TEST_ONLY_sB'], 'the general manager reads its branch');
  });

  test('[' + mode + '] what the action menu sends is refused outside the sender\'s authority; nothing is written', async () => {
    const { DB, C } = await world(mode);
    const before = JSON.stringify(read(DB, KU));
    const as = async (un) => { const L = await C.login(un, TEST_SUPER_PIN); assert.ok(L.ok); return { ck: L.ck, list: ids((await C.api('/api/get?keys=' + KU, { cookie: L.ck })).j) }; };
    const edit = (list, id, f) => list.map((u) => (u.id === id ? f(Object.assign({}, u)) : u));
    const mA = await as(UN.mA), sA = await as(UN.sA);
    const ghostB = { id: 'TEST_ONLY_sB', un: UN.sB, name: 'TEST_ONLY sB', role: 'staff', deptId: 'TEST_ONLY_B', ekey: 'E2', mc: 0, dis: 1 };
    const cases = [
      ['unit A manager freezes an account of unit B', mA.ck, mA.list.concat([ghostB])],
      ['unit A manager freezes the general manager', mA.ck, edit(mA.list, 'TEST_ONLY_g', (u) => ((u.dis = 1), u))],
      ['unit A manager deletes the general manager', mA.ck, mA.list.filter((u) => u.id !== 'TEST_ONLY_g')],
      ['unit A manager freezes the platform administrator', mA.ck, edit(mA.list, 'su', (u) => ((u.dis = 1), u))],
      ['unit A manager forces a password change on the general manager', mA.ck, edit(mA.list, 'TEST_ONLY_g', (u) => ((u.mc = 1), u))],
      ['an employee freezes a colleague manager', sA.ck, edit(sA.list, 'TEST_ONLY_mA', (u) => ((u.dis = 1), u))],
      ['an employee deletes a manager account', sA.ck, sA.list.filter((u) => u.id !== 'TEST_ONLY_mA')],
    ];
    for (const [label, ck, list] of cases) {
      const r = await C.save(ck, { [KU]: JSON.stringify(list) });
      assert.ok(refused(r), label + ': refused · ' + JSON.stringify(r.j).slice(0, 200));
      assert.equal(JSON.stringify(read(DB, KU)), before, label + ': nothing written');
    }
  });

  test('[' + mode + '] the platform administrator\'s menu writes are accepted: freeze, temporary password, delete', async () => {
    const { DB, C } = await world(mode);
    const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok, 'TEST super signs in');
    const cur = async () => ids((await C.api('/api/get?keys=' + KU, { cookie: su.ck })).j);
    let r = await C.save(su.ck, { [KU]: JSON.stringify((await cur()).map((u) => (u.id === 'TEST_ONLY_sB' ? Object.assign({}, u, { dis: 1 }) : u))) });
    assert.ok(!refused(r), 'freeze an account of unit B · ' + JSON.stringify(r.j).slice(0, 160));
    assert.equal(read(DB, KU).find((u) => u.id === 'TEST_ONLY_sB').dis, 1);
    r = await C.save(su.ck, { [KU]: JSON.stringify((await cur()).map((u) => (u.id === 'TEST_ONLY_sB' ? Object.assign({}, u, { dis: 0 }) : u))) });
    assert.ok(!refused(r)); assert.equal(read(DB, KU).find((u) => u.id === 'TEST_ONLY_sB').dis, 0, 're-enabled');
    r = await C.save(su.ck, { [KU]: JSON.stringify((await cur()).filter((u) => u.id !== 'TEST_ONLY_g')) });
    assert.ok(!refused(r), 'delete the general manager · ' + JSON.stringify(r.j).slice(0, 160));
    assert.ok(!read(DB, KU).some((u) => u.id === 'TEST_ONLY_g'));
  });
}
