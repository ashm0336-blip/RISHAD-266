/* PRIVACY batch — SV09 · IP07 · IP10: the employee register and the daily-report roster carry personal fields (national id, phone, e-mail,
   empno = initial password, gender) only to whom they belong by purpose — in BOTH authorization modes, on the typed operations read path.
   Before (b78b505): any reader of one operational page (daily report, tasks, irshad, rounds, plan, employees-data view …) received every
   colleague's nid/phone/email/empno, and the report's roster rows their empno.
   Rule (workers/parts/019u-privacy-projection.js): super · the employee himself · managers of the unit · employees-data writers (add|edit)
   see them; readers of the monthly schedule / daily report also keep gender (distribution of the shift); everyone else gets the working
   fields (eid, name, type, work …). Saving a list received projected keeps the hidden fields (lossless). The custody read (/api/custody)
   carries the holder's nid/empno snapshot under the same rule. TEST_ONLY synthetic data. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { privWorld, setSheet, login, suCk, readOp, save, rec, drRow, stored, put, PII, KE, KDR, PERSONAL, MODES } from './privacy_fx.mjs';

const C3 = 'tst_e_p0_3';
const hasNone = (e, fs, msg) => fs.forEach(f => assert.equal(Object.prototype.hasOwnProperty.call(e, f), false, msg + ': ' + f + ' must not be sent'));
const hasAll = (e, fs, msg) => fs.forEach(f => assert.ok(e[f] != null && e[f] !== '', msg + ': ' + f + ' must be sent'));

for (const mode of MODES) {
  test('PRIVACY SV09/IP10 [' + mode + ']: a reader of one operational page gets colleagues without personal fields (and roster rows without empno)', async () => {
    const w = await privWorld(mode);
    for (const [sheet, gender] of [[{ dreport: ['view'] }, true], [{ tasks: ['view'] }, false], [{ 'irshad/records': ['view'] }, false], [{ 'daily/rounds': ['view'] }, false], [{ staff: ['view'] }, true]]) {
      setSheet(w, 'tst_e_emp1', sheet);
      const ck = await login(w, 'emp1');
      const r = await readOp(w, ck, [KE]);
      assert.equal(r.status, 200);
      const e = rec(r.res[KE], C3), tag = JSON.stringify(sheet);
      assert.ok(e, tag + ': the colleague is still listed (operational need)');
      assert.equal(e.name, stored(w.env, KE).find(x => x.eid === C3).name, tag + ': name kept');
      assert.ok(e.type && e.work, tag + ': type/work kept');
      hasNone(e, PERSONAL, tag);
      assert.equal(Object.prototype.hasOwnProperty.call(e, 'gender'), gender, tag + ': gender only for the schedule/report readers');
      if (sheet.dreport) {
        const d = await readOp(w, ck, [KDR]);
        const row = drRow(d.res[KDR], w);
        assert.ok(row && row.ekey, 'IP10: the roster row is still delivered');
        assert.equal(Object.prototype.hasOwnProperty.call(row, 'empno'), false, 'IP10: roster empno (initial password) is not sent to a viewer');
      }
    }
  });

  test('PRIVACY IP07 [' + mode + ']: employees-data view alone does not show nid/phone/email/empno; add|edit does', async () => {
    const w = await privWorld(mode);
    setSheet(w, 'tst_e_emp1', { 'emps/data': ['view'] });
    let r = await readOp(w, await login(w, 'emp1'), [KE]);
    hasNone(rec(r.res[KE], C3), PERSONAL, 'emps/data view');
    setSheet(w, 'tst_e_emp1', { 'emps/data': ['view', 'edit'] });
    r = await readOp(w, await login(w, 'emp1'), [KE]);
    hasAll(rec(r.res[KE], C3), PERSONAL.concat(['gender']), 'emps/data edit');
    setSheet(w, 'tst_e_emp1', { 'emps/data': ['view', 'add'] });
    r = await readOp(w, await login(w, 'emp1'), [KE]);
    hasAll(rec(r.res[KE], C3), PERSONAL, 'emps/data add');
  });

  test('PRIVACY [' + mode + ']: super, the unit manager, the branch gm and the employee himself still receive the fields', async () => {
    const w = await privWorld(mode);
    for (const who of ['su', 'dm1', 'gm1']) {
      const ck = who === 'su' ? await suCk(w) : await login(w, who);
      const r = await readOp(w, ck, [KE, KDR]);
      assert.equal(r.status, 200, who);
      hasAll(rec(r.res[KE], C3), PERSONAL.concat(['gender']), who);
      assert.equal(drRow(r.res[KDR], w).empno, '70999', who + ': roster empno');
    }
    /* the employee himself (a plain account) with a tasks sheet: his own record whole, a colleague's without personal fields */
    setSheet(w, C3, { tasks: ['view'] });
    const r = await readOp(w, await login(w, 'p0e3'), [KE]);
    hasAll(rec(r.res[KE], C3), PERSONAL.concat(['gender']), 'self');
    hasNone(rec(r.res[KE], 'tst_e_p0_1'), PERSONAL, 'colleague of self');
  });

  test('PRIVACY lossless [' + mode + ']: saving the projected register / report keeps the hidden fields; a hidden field sent is judged, not applied', async () => {
    const w = await privWorld(mode);
    const ck = await login(w, 'sup1');   /* schedule editor (work/type via EMP_FIELDS) and report editor — not an employees-data writer */
    const before = stored(w.env, KE).find(x => x.eid === C3);
    let r = await readOp(w, ck, [KE]);
    const E = r.res[KE]; hasNone(rec(E, C3), PERSONAL, 'sup1 view');
    rec(E, C3).work = 'TEST_ONLY عمل معدّل';
    let s = await save(w, ck, { [KE]: JSON.stringify(E) }, { [KE]: r.base[KE] });
    assert.equal(s.status, 200, JSON.stringify(s.j).slice(0, 300));
    const after = stored(w.env, KE).find(x => x.eid === C3);
    assert.equal(after.work, 'TEST_ONLY عمل معدّل', 'the visible change is written');
    for (const f of PERSONAL.concat(['gender'])) assert.equal(after[f], before[f], 'hidden ' + f + ' kept');
    assert.equal(stored(w.env, KE).length, 17, 'no record lost');
    /* tamper: a hidden field sent with another value is not silently written */
    r = await readOp(w, ck, [KE]);
    const T = r.res[KE]; rec(T, C3).nid = '1888888888';
    s = await save(w, ck, { [KE]: JSON.stringify(T) }, { [KE]: r.base[KE] });
    assert.notEqual(s.j && s.j.ok, 1, 'changing a hidden personal field is denied');
    assert.equal(stored(w.env, KE).find(x => x.eid === C3).nid, before.nid);
    /* daily report: change attendance of the colleague's roster row — its empno copy survives */
    r = await readOp(w, ck, [KDR]);
    const doc = r.res[KDR]; assert.equal(Object.prototype.hasOwnProperty.call(drRow(doc, w), 'empno'), false);
    drRow(doc, w).st = 'ab';
    s = await save(w, ck, { [KDR]: JSON.stringify(doc) }, { [KDR]: r.base[KDR] });
    assert.equal(s.status, 200, JSON.stringify(s.j).slice(0, 300));
    const row = drRow(stored(w.env, KDR), w);
    assert.equal(row.st, 'ab'); assert.equal(row.empno, '70999', 'roster empno kept');
  });
}

for (const mode of MODES) {
  test('PRIVACY SV09 custody [' + mode + ']: a custody viewer gets holders without nid/empno; the manager and the holder himself keep them', async () => {
    const w = await privWorld(mode);
    const E = stored(w.env, KE); Object.assign(E.find(e => e.eid === 'tst_e_emp1'), PII(9), { empno: '70113' }); await put(w, KE, E);
    const month = async (ck) => { const r = await w.C.api('/api/custody?dept=tst_d1&view=month', { cookie: ck }); assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 200)); return r.j.rows.find(x => x.holderKey === 'tst_e_emp1'); };
    /* a hand-over after the PII exists: the movement keeps the holder's snapshot (nid/empno) */
    const dm = await login(w, 'dm1'), cur = await w.C.api('/api/custody?dept=tst_d1&view=month', { cookie: dm });
    const iss = await w.C.api('/api/custody/act', { method: 'POST', cookie: dm, body: { dept: 'tst_d1', base: cur.j.rev, requestId: 'TEST_ONLY_privacy_issue_' + mode, op: 'issue', itemId: 'tst_fixture_item', holderKey: 'tst_e_emp1' } });
    assert.equal(iss.status, 200, JSON.stringify(iss.j).slice(0, 300));
    setSheet(w, 'tst_e_p0_1', { 'emps/custody': ['view'] });
    const v = await month(await login(w, 'p0e1'));
    assert.ok(v && v.snapshot.name, 'the holder row and name are delivered');
    assert.equal(v.snapshot.nid, '', 'no holder nid for a custody viewer'); assert.equal(v.snapshot.empno, '', 'no holder empno for a custody viewer');
    const m = await month(await login(w, 'dm1'));
    assert.equal(m.snapshot.nid, '1999999209'); assert.equal(m.snapshot.empno, '70113');
    setSheet(w, 'tst_e_emp1', { 'emps/custody': ['view'] });
    const self = await month(await login(w, 'emp1'));
    assert.equal(self.snapshot.nid, '1999999209', 'the holder himself');
  });
}
