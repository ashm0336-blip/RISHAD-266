/* PRIVACY batch closure — (B) award records and exports · (C) old references by nid · (D) operations read/save contract.
   B: award records carried the nominee's phone, e-mail and employee number (comp) to every reader of the results page, the list search
      matched the register's empno (initial password), and the award/custody exports carried them to a backup.create holder.
      Rule (019u privAwardOk/privAwardRec · 019m · 019n · 019b): super · the person himself · managers of the unit / employees-data writers ·
      award-results managers (award/res edit|approve|del · award.res.*) receive them; a plain reader does not.
   C: some stored data references a person by nid (staffing month buckets, plan/rounds emp lists …). A reader who no longer receives the
      colleague's nid gets those references as the record's eid; saving from that view keeps the stored nid reference; a nid-keyed entry
      hidden behind an eid entry of the same person is kept; a hidden nid sent with another value is refused (privacy-hidden).
   D: the projected operations read keeps the revision contract (base = stored revision, same for every reader); a conflict on a projected
      resource carries no value (read-reference-changed), and the re-read + retry loses no personal field.
   Both authorization modes. TEST_ONLY synthetic data. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { privWorld, setSheet, login, suCk, readOp, save, rec, stored, put, KE, MODES } from './privacy_fx.mjs';

const NID3 = '1999999203', C3 = 'tst_e_p0_3';
const KS = 'bsdept:tst_d1:bassam_staffing_v3', KPL = 'bsdept:tst_d1:bassam_plan_v1';
const aw = (w, ck, q = '') => w.C.api('/api/award?dept=tst_d1&view=records' + q, { cookie: ck });
let seq = 0;
async function awEdit(w, ck, id, data) {
  const g = await aw(w, ck);
  const r = await w.C.api('/api/award/act', { method: 'POST', cookie: ck, body: { dept: 'tst_d1', requestId: 'TEST_ONLY_privacy_aw_' + (++seq), base: g.j.base, op: 'edit', id, data } });
  assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 300));
}
const AWC = { phone: '0599999277', email: 'tst_aw_2@example.test', comp: '70277' };

for (const mode of MODES) {
  test('PRIVACY B award [' + mode + ']: results readers do not get contact fields or the number search; award managers and super do', async () => {
    const w = await privWorld(mode);
    const su = await suCk(w);
    await awEdit(w, su, 'tstaw2', AWC);
    const r2 = (j) => (j.recs || []).find(x => x.id === 'tstaw2');
    const s = await aw(w, su); assert.equal(r2(s.j).phone, AWC.phone, 'super');
    setSheet(w, 'tst_e_emp1', { 'award/res': ['view'] });
    let ck = await login(w, 'emp1'), r = await aw(w, ck);
    assert.equal(r.status, 200);
    const plain = r2(r.j);
    assert.ok(plain && plain.name, 'the nomination is still listed');
    for (const f of ['phone', 'email', 'comp']) assert.equal(Object.prototype.hasOwnProperty.call(plain, f), false, 'plain reader: no ' + f);
    assert.equal((await aw(w, ck, '&q=' + AWC.comp)).j.filteredTotal, 0, 'plain reader: no search by employee number');
    const one = await w.C.api('/api/award?dept=tst_d1&view=record&id=tstaw2', { cookie: ck });
    assert.equal(one.status, 200); assert.equal(one.j.record.phone, undefined, 'single record view: no phone');
    assert.ok(!JSON.stringify(r.j).includes(AWC.phone) && !JSON.stringify(one.j).includes(AWC.email));
    setSheet(w, 'tst_e_emp1', { 'award/res': ['view', 'edit'] });
    ck = await login(w, 'emp1'); r = await aw(w, ck);
    for (const f of ['phone', 'email', 'comp']) assert.equal(r2(r.j)[f], AWC[f], 'award manager: ' + f);
    assert.equal((await aw(w, ck, '&q=' + AWC.comp)).j.filteredTotal, 1, 'award manager: search by number');
    const dm = await aw(w, await login(w, 'dm1'));
    assert.equal(r2(dm.j).phone, AWC.phone, 'unit manager');
  });

  test('PRIVACY B exports [' + mode + ']: award and custody exports of a backup.create holder carry no personal fields; the manager exports them', async () => {
    const w = await privWorld(mode);
    const su = await suCk(w);
    await awEdit(w, su, 'tstaw2', AWC);
    const dm = await login(w, 'dm1'), cur = await w.C.api('/api/custody?dept=tst_d1&view=month', { cookie: dm });
    const iss = await w.C.api('/api/custody/act', { method: 'POST', cookie: dm, body: { dept: 'tst_d1', base: cur.j.rev, requestId: 'TEST_ONLY_privacy_x_' + mode, op: 'issue', itemId: 'tst_fixture_item', holderKey: C3 } });
    assert.equal(iss.status, 200, JSON.stringify(iss.j).slice(0, 300));
    setSheet(w, 'tst_e_emp1', { 'admin/backup': ['view', 'add', 'edit'] });
    const ck = await login(w, 'emp1');
    const a = await w.C.api('/api/award/export?dept=tst_d1', { cookie: ck }), c = await w.C.api('/api/custody/export?dept=tst_d1', { cookie: ck });
    assert.equal(a.status, 200); assert.equal(c.status, 200);
    const aj = JSON.stringify(a.j), cj = JSON.stringify(c.j);
    assert.ok(aj.includes('tstaw2'), 'the nomination is exported');
    assert.ok(!aj.includes(AWC.phone) && !aj.includes(AWC.email) && !aj.includes(AWC.comp), 'award export: no contact fields');
    assert.ok(cj.includes(C3), 'the custody movement is exported');
    assert.ok(!cj.includes(NID3) && !cj.includes('70203'), 'custody export: no holder nid/empno');
    const am = JSON.stringify((await w.C.api('/api/award/export?dept=tst_d1', { cookie: dm })).j), cm = JSON.stringify((await w.C.api('/api/custody/export?dept=tst_d1', { cookie: dm })).j);
    assert.ok(am.includes(AWC.phone) && cm.includes(NID3), 'the unit manager exports them');
  });

  test('PRIVACY C nid references [' + mode + ']: resolved to the eid for a reader without nid; saving keeps the stored nid reference; a hidden one is not changed', async () => {
    const w = await privWorld(mode);
    const S0 = stored(w.env, KS), m0 = Object.keys(S0).find(k => /^\d{4}-\d{1,2}$/.test(k));
    assert.ok(m0, 'fixture: a staffing month');
    delete S0[m0][C3];
    S0[m0][NID3] = { shift: 'TST-A', rest: [], leaves: {}, perm: {}, cs: 'TST-NID', muk: false };
    const m1 = '1440-1'; S0[m1] = JSON.parse(JSON.stringify(S0[m0]));
    S0[m1][C3] = Object.assign({}, S0[m0][NID3], { cs: 'TST-E' }); S0[m1][NID3] = Object.assign({}, S0[m0][NID3], { cs: 'TST-N' });   /* duplicate: eid and nid entries */
    await put(w, KS, S0);
    const P0 = stored(w.env, KPL); P0.floors[0].zones[1].emp = [NID3]; await put(w, KPL, P0);
    const before = stored(w.env, KS);
    const ck = await login(w, 'sup1');   /* schedule editor, plan viewer — not an employees-data writer */
    let r = await readOp(w, ck, [KS, KPL, KE]);
    assert.equal(r.status, 200);
    assert.ok(!JSON.stringify(r.res).includes(NID3), 'the nid is sent nowhere');
    assert.equal(r.res[KS][m0][C3].cs, 'TST-NID', 'the nid-keyed assignment is resolved to the person (eid)');
    assert.equal(r.res[KS][m1][C3].cs, 'TST-E', 'duplicate: the eid entry is the one sent (as the client resolves)');
    assert.deepEqual(r.res[KPL].floors[0].zones[1].emp, [C3], 'plan: emp list resolved');
    assert.ok(rec(r.res[KE], C3), 'the person is in the register sent');
    const dm = await readOp(w, await login(w, 'dm1'), [KS]);
    assert.equal(dm.res[KS][m0][NID3].cs, 'TST-NID', 'the unit manager receives the stored value unchanged');
    assert.equal(dm.base[KS], r.base[KS], 'D: same revision for a projected and an unprojected read');
    /* save from the projected view: a visible change elsewhere — every stored nid reference kept */
    const V = r.res[KS]; V[m0].tst_e_emp1.cs = 'TST-CS1';
    let s = await save(w, ck, { [KS]: JSON.stringify(V) }, { [KS]: r.base[KS] });
    assert.equal(s.status, 200, JSON.stringify(s.j).slice(0, 300));
    let after = stored(w.env, KS);
    assert.equal(after[m0].tst_e_emp1.cs, 'TST-CS1', 'the visible change is written');
    assert.deepEqual(after[m0][NID3], before[m0][NID3], 'stored nid reference kept');
    assert.equal(after[m0][C3], undefined, 'no eid copy created');
    assert.deepEqual(after[m1], before[m1], 'duplicate month kept (hidden nid entry not erased)');
    /* an edit of the resolved assignment is written to the stored nid reference */
    r = await readOp(w, ck, [KS]);
    const V2 = r.res[KS]; V2[m0][C3].cs = 'TST-NID2';
    s = await save(w, ck, { [KS]: JSON.stringify(V2) }, { [KS]: r.base[KS] });
    assert.equal(s.status, 200, JSON.stringify(s.j).slice(0, 300));
    after = stored(w.env, KS);
    assert.equal(after[m0][NID3].cs, 'TST-NID2', 'the change lands on the stored reference');
    assert.equal(after[m0][C3], undefined);
    /* tamper: the hidden nid entry sent with another value is refused */
    r = await readOp(w, ck, [KS]);
    const T = r.res[KS]; T[m1][NID3] = Object.assign({}, before[m1][NID3], { cs: 'TST-HACK' });
    s = await save(w, ck, { [KS]: JSON.stringify(T) }, { [KS]: r.base[KS] });
    assert.notEqual(s.status, 200, 'refused');
    assert.equal(((s.j.denied || {})[KS] || {}).why, 'privacy-hidden', JSON.stringify(s.j).slice(0, 300));
    assert.equal(stored(w.env, KS)[m1][NID3].cs, 'TST-N', 'hidden entry unchanged');
  });

  test('PRIVACY D operations [' + mode + ']: a conflict on the projected register leaks no personal field; the re-read and retry keep every one', async () => {
    const w = await privWorld(mode);
    const ck = await login(w, 'sup1');
    const r = await readOp(w, ck, [KE]);
    const E1 = stored(w.env, KE); E1.find(e => e.eid === 'tst_e_p0_1').work = 'TEST_ONLY عمل آخر'; await put(w, KE, E1);   /* a newer revision */
    const full = stored(w.env, KE);
    const E = r.res[KE]; rec(E, C3).work = 'TEST_ONLY عمل معدّل';
    let s = await save(w, ck, { [KE]: JSON.stringify(E) }, { [KE]: r.base[KE] });
    assert.notEqual(s.status, 200, 'stale base: conflict');
    assert.ok((s.j.conflicts || {})[KE], JSON.stringify(s.j).slice(0, 300));
    assert.ok(!JSON.stringify(s.j).includes(NID3) && !JSON.stringify(s.j).includes('70203'), 'the conflict answer carries no personal field');
    assert.deepEqual(stored(w.env, KE), full, 'nothing written');
    /* the client re-reads (projected) and retries on the current revision */
    const r2 = await readOp(w, ck, [KE]);
    assert.ok(!JSON.stringify(r2.res).includes(NID3));
    const M = r2.res[KE]; rec(M, C3).work = 'TEST_ONLY عمل معدّل';
    s = await save(w, ck, { [KE]: JSON.stringify(M) }, { [KE]: r2.base[KE] });
    assert.equal(s.status, 200, JSON.stringify(s.j).slice(0, 300));
    const after = stored(w.env, KE).find(e => e.eid === C3), was = full.find(e => e.eid === C3);
    assert.equal(after.work, 'TEST_ONLY عمل معدّل');
    for (const f of ['nid', 'phone', 'email', 'empno', 'gender']) assert.equal(after[f], was[f], 'personal field kept: ' + f);
    assert.equal(stored(w.env, KE).find(e => e.eid === 'tst_e_p0_1').work, 'TEST_ONLY عمل آخر', 'the newer change kept');
  });
}
