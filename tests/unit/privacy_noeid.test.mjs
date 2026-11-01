/* PRIVACY batch — (1b) a historical employee record WITHOUT eid.
   Reachable: the client gives every new record an eid, but an older record kept as it was has none — the typed codec stores eid as
   optional (019q ops_employee_record), the real cutover (019s opLegacyPrepare, run here by tasks_fx.world) copies the register verbatim
   and assigns no eid, and 019c keys such a record by name. This file builds one through that cutover (the legacy KV seed is shaped
   before it: tst_e_p0_3 loses its eid, carries a nid, his login's ekey is that nid, and his staffing / plan / task assignments
   reference him by nid) and proves it survives the cutover.
   Before (752790d): 019u privEmpHidden kept the nid of such a record for every reader («its identity») and old nid references stayed
   nids, so a reader of one operational page (schedule, plan, tasks …) received the colleague's national id — in the register, in the
   staffing bucket keys, plan lists, task rows, the tasks linkage view (/api/tasks/linkage) and a backup.create holder's export.
   Now: those readers get an opaque token 'nx:…' (019u privNx — derived from unit + name + ordinal, never from the nid) as the record's
   nid and as every reference to it; the token resolves to the person on every page (BassamEmp.entry tries nid); saving from that view
   writes the stored nid back (byte-identical); a forged/other token is refused (privacy-hidden); super, the unit manager and the
   employee himself still receive the nid. Both authorization modes. TEST_ONLY synthetic data. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, putKV, stored, rowsOf, KT } from './tasks_fx.mjs';
import { setSheet, login, suCk, readOp, save, rec, PII, KE, MODES } from './privacy_fx.mjs';

const NID3 = '1999999203', C3 = 'tst_e_p0_3', NAME3 = 'TEST_ONLY · موظف مهام 3';
const KS = 'bsdept:tst_d1:bassam_staffing_v3', KPL = 'bsdept:tst_d1:bassam_plan_v1';
const kv = (env, k) => JSON.parse(env.DB.q('SELECT v FROM kv WHERE k = ? ORDER BY seq', k).map(x => x.v).join(''));
const by3 = (L) => (L || []).find(e => e && e.name === NAME3);
const NX = /^nx:[0-9a-f]{20}$/;
let M0 = null, NT = 0;

/* the legacy KV seed, shaped before the real cutover */
async function seedNoEid(env) {
  const E = kv(env, KE), e3 = E.find(e => e.eid === C3);
  delete e3.eid; Object.assign(e3, PII(3));
  Object.assign(E.find(e => e.eid === 'tst_e_p0_1'), PII(1));
  putKV(env, KE, E);
  const U = kv(env, 'bassam_auth_users_v1'); U.find(u => u.id === 'tst_p0e3').ekey = NID3; putKV(env, 'bassam_auth_users_v1', U);
  const S = kv(env, KS); M0 = Object.keys(S).find(k => /^\d{4}-\d{1,2}$/.test(k));
  delete S[M0][C3]; S[M0][NID3] = { shift: 'TST-A', rest: [], leaves: {}, perm: {}, cs: 'TST-NOEID', muk: false }; putKV(env, KS, S);
  const P = kv(env, KPL); P.floors[0].zones[1].emp = [NID3]; putKV(env, KPL, P);
  const T = kv(env, KT); NT = 0; for (const d in T) for (const r of T[d]) if (Array.isArray(r) && r[14] === C3) { r[14] = NID3; NT++; }
  putKV(env, KT, T);
}
async function noEidWorld(mode) {
  const w = await world({ mode, beforeCutover: seedNoEid });
  const e3 = by3(stored(w.env, KE));
  assert.ok(e3 && e3.eid === undefined && e3.nid === NID3, 'the real cutover keeps the record without eid (no eid assigned): ' + JSON.stringify(e3));
  assert.equal(stored(w.env, KS)[M0][NID3].cs, 'TST-NOEID', 'the nid-keyed assignment survives the cutover');
  assert.ok(NT > 0 && rowsOf(stored(w.env, KT), NID3).length === NT, 'task rows referencing the nid survive the cutover');
  return w;
}
const noNid = (x, msg) => assert.ok(!JSON.stringify(x).includes(NID3), msg + ': the nid must not be sent');

for (const mode of MODES) {
  test('PRIVACY 1b [' + mode + ']: an eid-less record reaches operational readers with an opaque token, never its nid; assignments still resolve', async () => {
    const w = await noEidWorld(mode);
    /* schedule editor / plan reader (sup1) */
    const ck = await login(w, 'sup1');
    const r = await readOp(w, ck, [KE, KS, KPL]);
    assert.equal(r.status, 200);
    noNid(r.res, 'register · staffing · plan');
    const e3 = by3(r.res[KE]), tok = e3 && e3.nid;
    assert.match(String(tok), NX, 'the record keeps an identity: a token');
    for (const f of ['phone', 'email', 'empno']) assert.equal(Object.prototype.hasOwnProperty.call(e3, f), false, f + ' stripped');
    assert.equal(r.res[KS][M0][tok].cs, 'TST-NOEID', 'staffing: the nid-keyed assignment is sent under the same token');
    assert.deepEqual(r.res[KPL].floors[0].zones[1].emp, [tok], 'plan: the nid reference is sent as the token');
    assert.equal(by3((await readOp(w, ck, [KE])).res[KE]).nid, tok, 'stable across reads');
    /* tasks reader (another account, another sheet) */
    setSheet(w, 'tst_e_emp1', { tasks: ['view'] });
    const ce = await login(w, 'emp1');
    const t = await readOp(w, ce, [KE, KT]);
    assert.equal(t.status, 200); noNid(t.res, 'register · tasks');
    assert.equal(by3(t.res[KE]).nid, tok, 'the same token for every reader of the unit');
    assert.equal(rowsOf(t.res[KT], tok).length, NT, 'every task row of the person resolves to the token');
    const lk = await w.C.api('/api/tasks/linkage?dept=tst_d1', { cookie: ce });
    assert.equal(lk.status, 200, JSON.stringify(lk.j).slice(0, 200)); noNid(lk.j, 'tasks linkage');
    assert.ok(lk.j.rows.some(x => x.tok === tok), 'linkage: the nid-linked rows carry the token');
    /* export of a backup.create holder (not an employees-data writer): token, marked redacted */
    setSheet(w, 'tst_e_emp1', { 'admin/backup': ['view', 'add', 'edit'] });
    const x = await w.C.api('/api/operations/export?dept=tst_d1', { cookie: await login(w, 'emp1') });
    assert.equal(x.status, 200); noNid(x.j, 'operations export');
    assert.ok(JSON.stringify(x.j).includes(tok) && (x.j.redacted || []).includes('tst_d1:bassam_employees_v1'));
  });

  test('PRIVACY 1b [' + mode + ']: super, the unit manager and the employee himself still receive the nid and the stored references', async () => {
    const w = await noEidWorld(mode);
    for (const who of ['su', 'dm1']) {
      const r = await readOp(w, who === 'su' ? await suCk(w) : await login(w, who), [KE, KS, KPL, KT]);
      assert.equal(by3(r.res[KE]).nid, NID3, who);
      assert.equal(r.res[KS][M0][NID3].cs, 'TST-NOEID', who);
      assert.deepEqual(r.res[KPL].floors[0].zones[1].emp, [NID3], who);
      assert.equal(rowsOf(r.res[KT], NID3).length, NT, who);
      assert.ok(!JSON.stringify(r.res).includes('"nx:'), who + ': no token');
    }
    setSheet(w, NID3, { tasks: ['view'] });
    const me = await readOp(w, await login(w, 'p0e3'), [KE]);
    assert.equal(me.status, 200);
    assert.equal(by3(me.res[KE]).nid, NID3, 'himself (account keyed by that nid)');
  });

  test('PRIVACY 1b [' + mode + ']: saving from the token view keeps the stored nid and references byte-identical; a changed token is refused', async () => {
    const w = await noEidWorld(mode);
    const ck = await login(w, 'sup1');
    const E0 = stored(w.env, KE), S0 = stored(w.env, KS);
    let r = await readOp(w, ck, [KE, KS]);
    const tok = by3(r.res[KE]).nid;
    /* a visible edit of colleagues only: the eid-less record and its references stay byte-identical
       (an unchanged save is not used: enforcement answers a no-op register save with «perm», on 752790d too) */
    rec(r.res[KE], 'tst_e_emp1').work = 'TEST_ONLY عمل آخر'; r.res[KS][M0].tst_e_emp1.cs = 'TST-CS1';
    let s = await save(w, ck, { [KE]: JSON.stringify(r.res[KE]), [KS]: JSON.stringify(r.res[KS]) }, { [KE]: r.base[KE], [KS]: r.base[KS] });
    assert.equal(s.status, 200, JSON.stringify(s.j).slice(0, 300));
    let E1 = stored(w.env, KE), S1 = stored(w.env, KS);
    assert.equal(rec(E1, 'tst_e_emp1').work, 'TEST_ONLY عمل آخر', 'the visible change is written');
    assert.equal(JSON.stringify(by3(E1)), JSON.stringify(by3(E0)), 'the eid-less record byte-identical (nid, contact fields, field order)');
    assert.equal(JSON.stringify(E1.filter(e => e.eid !== 'tst_e_emp1')), JSON.stringify(E0.filter(e => e.eid !== 'tst_e_emp1')), 'every other record byte-identical');
    assert.equal(JSON.stringify(S1[M0][NID3]), JSON.stringify(S0[M0][NID3]), 'the nid-keyed assignment byte-identical');
    assert.deepEqual(Object.keys(S1[M0]), Object.keys(S0[M0]), 'no token key stored, key order kept');
    /* visible edits of the person: the record's work and his assignment */
    r = await readOp(w, ck, [KE, KS]);
    by3(r.res[KE]).work = 'TEST_ONLY عمل معدّل';
    r.res[KS][M0][tok].cs = 'TST-NOEID2';
    s = await save(w, ck, { [KE]: JSON.stringify(r.res[KE]), [KS]: JSON.stringify(r.res[KS]) }, { [KE]: r.base[KE], [KS]: r.base[KS] });
    assert.equal(s.status, 200, JSON.stringify(s.j).slice(0, 300));
    const e3 = by3(stored(w.env, KE)), was = by3(E0);
    assert.equal(e3.work, 'TEST_ONLY عمل معدّل', 'the visible change is written');
    assert.deepEqual(Object.assign({}, e3, { work: was.work }), was, 'nid, phone, email, empno, gender kept');
    S1 = stored(w.env, KS);
    assert.equal(S1[M0][NID3].cs, 'TST-NOEID2', 'the edit lands on the stored nid-keyed assignment');
    assert.equal(S1[M0].tst_e_emp1.cs, 'TST-CS1');
    assert.deepEqual(Object.keys(S1[M0]), Object.keys(S0[M0]), 'no token key stored, key order kept');
    assert.ok(!JSON.stringify(stored(w.env, KE)).includes('nx:') && !JSON.stringify(S1).includes('nx:'), 'a token is never stored');
    /* tamper: another token as the record's nid · as the assignment key — refused, nothing written */
    const E2 = stored(w.env, KE), S2 = stored(w.env, KS);
    r = await readOp(w, ck, [KE, KS]);
    by3(r.res[KE]).nid = 'nx:0123456789abcdef0123';
    s = await save(w, ck, { [KE]: JSON.stringify(r.res[KE]) }, { [KE]: r.base[KE] });
    assert.equal(((s.j.denied || {})[KE] || {}).why, 'privacy-hidden', JSON.stringify(s.j).slice(0, 300));
    const V = r.res[KS]; V[M0]['nx:0123456789abcdef0123'] = V[M0][tok]; delete V[M0][tok];
    s = await save(w, ck, { [KS]: JSON.stringify(V) }, { [KS]: r.base[KS] });
    assert.equal(((s.j.denied || {})[KS] || {}).why, 'privacy-hidden', JSON.stringify(s.j).slice(0, 300));
    /* the hidden nid replaced by a raw value: not written */
    r = await readOp(w, ck, [KE]);
    by3(r.res[KE]).nid = '1888888888';
    s = await save(w, ck, { [KE]: JSON.stringify(r.res[KE]) }, { [KE]: r.base[KE] });
    assert.notEqual(s.j && s.j.ok, 1, 'changing the hidden nid is denied');
    assert.equal(JSON.stringify(stored(w.env, KE)), JSON.stringify(E2), 'register unchanged');
    assert.equal(JSON.stringify(stored(w.env, KS)), JSON.stringify(S2), 'staffing unchanged');
    assert.equal(by3(stored(w.env, KE)).nid, NID3);
  });
}
