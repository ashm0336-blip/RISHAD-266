/* RISHAD V7 P3 — what the unified editor writes is authorized by the server exactly as chosen (real worker, legacy and enforce,
   TEST_ONLY data; the server is not changed in P3). One employee in one unit, one resource of the «قوالب الصلاحيات» leaf (admin/ptpls):
     · a NEW grant = «عرض» alone: the platform administrator's save is accepted; the employee reads, and a write is refused;
     · «عرض» + «إضافة» + «تعديل» chosen explicitly: the employee writes (adding an item);
     · enforce: the editor writes an explicit grant (bsdept:<d>:bassam_grants_v1) — tpl.view alone reads and does not write;
     · a stored grant saved again unchanged stays byte-identical (the editor never re-interprets it). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeTestEnv, client, TEST_SUPER_PIN, TEST_SUPER_USERNAME } from './harness.mjs';

const KG = 'bassam_gdepts_v1', KD = 'bassam_depts_v1', KU = 'bassam_auth_users_v1', KP = 'bassam_perms_v1', D = 'TEST_ONLY_U', EK = 'TEST_ONLY_e1';
const RES = 'bsdept:' + D + ':bassam_perm_tpls_named_v1', KGR = 'bsdept:' + D + ':bassam_grants_v1';
const put = (DB, k, v) => { DB.db.prepare('DELETE FROM kv WHERE k = ?').run(k); DB.db.prepare('INSERT INTO kv (k, seq, v) VALUES (?, 0, ?)').run(k, JSON.stringify(v)); DB.db.prepare('INSERT INTO revs (k, rev) VALUES (?, 1) ON CONFLICT(k) DO UPDATE SET rev = rev + 1').run(k); };
const read = (DB, k) => JSON.parse(DB.q('SELECT v FROM kv WHERE k = ? ORDER BY seq', k).map((r) => r.v).join('') || 'null');

async function world(mode) {
  const env = makeTestEnv(mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce' } : {}), DB = env.DB;
  if (mode === 'enforce') DB.exec("INSERT INTO meta(k,v) VALUES('authz_mode','enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  put(DB, KG, [{ id: 'TEST_ONLY_G', name: 'G', kind: 'إدارة عامة' }]);
  put(DB, KD, [{ id: D, name: 'U', gid: 'TEST_ONLY_G' }]);
  const P = read(DB, KP) || {}; P.caps = { [D]: ['admin', 'tasks'] }; P.emps = {}; put(DB, KP, P);
  const U = read(DB, KU), ph = U.find((x) => x.role === 'super').ph;
  U.push({ id: 'TEST_ONLY_s1', un: '1099700001', name: 'e1', role: 'staff', deptId: D, ekey: EK, ph, mc: 0, dis: 0 });
  put(DB, KU, U); put(DB, 'bsdept:' + D + ':bassam_employees_v1', [{ eid: EK, name: 'e1' }]); put(DB, RES, []);
  const C = client(env), S = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(S.ok, 'administrator signs in');
  const asSuper = async (key, f) => { const g = await C.api('/api/get?keys=' + encodeURIComponent(key), { cookie: S.ck }); const cur = JSON.parse((g.j.keys[key] || {}).v || 'null'); const w = await C.save(S.ck, { [key]: JSON.stringify(f(cur)) }); return w; };
  const emp = async () => { const L = await C.login('1099700001', TEST_SUPER_PIN); assert.ok(L.ok, 'employee signs in');
    const g = await C.api('/api/get?keys=' + encodeURIComponent(RES), { cookie: L.ck }), e = g.j && g.j.keys && g.j.keys[RES];
    const w = await C.save(L.ck, { [RES]: '[1]' }), dn = w.j && w.j.denied && w.j.denied[RES];
    return { read: g.status === 200 && !!e && e.v != null, write: w.status === 200 && !dn }; };
  return { env, DB, C, asSuper, emp };
}
const sheet = (P, s) => { P.emps = P.emps || {}; P.emps[D] = { [EK]: s }; return P; };

for (const mode of ['legacy', 'enforce']) {
  test('V7 P3 · ' + mode + ': the editor\'s view-alone grant reads and does not write; explicit acts write; an unchanged save is byte-identical', async () => {
    const w = await world(mode);
    let r = await w.asSuper(KP, (P) => sheet(P, { 'admin/ptpls': ['view'] }));
    assert.equal(r.status, 200); assert.ok(!(r.j.denied || {})[KP], 'the administrator\'s save of a view-alone sheet is accepted');
    assert.deepEqual(read(w.DB, KP).emps[D][EK], { 'admin/ptpls': ['view'] }, 'stored exactly as chosen');
    assert.deepEqual(await w.emp(), { read: true, write: false }, 'view alone: reads, cannot write');
    r = await w.asSuper(KP, (P) => sheet(P, { 'admin/ptpls': ['view', 'add', 'edit'] }));   /* adding an item needs «إضافة» (legacy) */
    assert.ok(!(r.j.denied || {})[KP]);
    assert.deepEqual(await w.emp(), { read: true, write: true }, '«إضافة» + «تعديل» chosen explicitly: writes');
    const before = JSON.stringify(read(w.DB, KP));
    r = await w.asSuper(KP, (P) => P); assert.equal(r.status, 200);
    assert.equal(JSON.stringify(read(w.DB, KP)), before, 'saving the stored grant unchanged keeps it byte-identical');
    if (mode === 'enforce') {
      /* the key-level editor: no sheet, an explicit grant of the leaf's view key alone */
      await w.asSuper(KP, (P) => { P.emps[D] = {}; return P; });
      assert.deepEqual(await w.emp(), { read: false, write: false }, 'no sheet, no grant: nothing');
      r = await w.asSuper(KGR, () => ({ v: 1, emp: { [EK]: { plus: ['tpl.view'], minus: [], at: 1, by: 'super' } } }));
      assert.equal(r.status, 200); assert.ok(!(r.j.denied || {})[KGR], 'the explicit grant is accepted: ' + JSON.stringify(r.j.denied || {}));
      assert.deepEqual(await w.emp(), { read: true, write: false }, 'tpl.view alone: reads, cannot write');
    }
  });
}
