/* PRIVACY batch — IP39: «backup.view» (status of the copies) alone exposed every collection of the department (employees with PII, tasks,
   custody, irshad, seized, awards, notifications) through the domain export routes, /api/operations/read and /api/get.
   Rule (workers/parts/019u-privacy-projection.js bkExportOk/bkReadAnyOk): exporting — and the backup page's read of every collection —
   needs super, or the backup page together with being a manager of the unit or holding backup.create (admin/backup add|edit) /
   backup.restore. backup.view alone keeps its own stamp (bassam_last_export_v1). Personal fields inside an export follow the read rule.
   Both authorization modes. TEST_ONLY synthetic data. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { privWorld, setSheet, login, suCk, readOp, getKV, KE, MODES, stored } from './privacy_fx.mjs';
import { putKV } from './tasks_fx.mjs';

const ROUTES = ['/api/operations/export', '/api/custody/export', '/api/irshad/export', '/api/seized/export', '/api/award/export', '/api/notifications/export'];
const exp = async (w, ck, r) => w.C.api(r + '?dept=tst_d1', { cookie: ck });
const KSTAMP = 'bsdept:tst_d1:bassam_last_export_v1', KTPL = 'bsdept:tst_d1:bassam_perm_tpls_v1';

for (const mode of MODES) {
  test('PRIVACY IP39 [' + mode + ']: backup.view alone exports nothing and reads no department collection', async () => {
    const w = await privWorld(mode);
    setSheet(w, 'tst_e_emp1', { 'admin/backup': ['view'] });
    const ck = await login(w, 'emp1');
    for (const r of ROUTES) {
      const x = await exp(w, ck, r);
      assert.equal(x.status, 403, r + ' refused');
      assert.match(String(x.j && x.j.err), /export-permission/, r + ' says why');
      assert.ok(!JSON.stringify(x.j).includes('70203'), r + ': no colleague empno');
    }
    const o = await readOp(w, ck, [KE]);
    assert.ok(!o.res[KE], 'operations/read: the employee register is not delivered');
    assert.ok(o.denied.includes(KE), 'operations/read: denied');
    const g = await getKV(w, ck, [KTPL, KSTAMP]);
    assert.equal((g.keys[KTPL] || {}).v == null, true, '/api/get: no department collection value');
    const b = await w.C.boot(ck);
    assert.ok(!(b.boot && b.boot.keys && b.boot.keys[KTPL]), 'boot: no department collection value');
  });

  test('PRIVACY IP39 [' + mode + ']: backup create holders and the unit manager still export; personal fields follow the read rule', async () => {
    const w = await privWorld(mode);
    setSheet(w, 'tst_e_emp1', { 'admin/backup': ['view', 'add', 'edit'] });
    const ck = await login(w, 'emp1');
    for (const r of ROUTES) assert.equal((await exp(w, ck, r)).status, 200, 'backup.create: ' + r);
    const mine = JSON.stringify((await exp(w, ck, '/api/operations/export')).j);
    assert.ok(mine.includes('TEST_ONLY · موظف مهام 3'), 'the register is exported (names)');
    assert.ok(!mine.includes('1999999203') && !mine.includes('0599999203'), 'not an employees-data writer: no colleague nid/phone in his export');
    const dm = await login(w, 'dm1');
    for (const r of ROUTES) assert.equal((await exp(w, dm, r)).status, 200, 'manager: ' + r);
    const full = JSON.stringify((await exp(w, dm, '/api/operations/export')).j);
    assert.ok(full.includes('1999999203') && full.includes('70203'), 'the unit manager exports the register whole');
    const su = await suCk(w);
    assert.ok(JSON.stringify((await exp(w, su, '/api/operations/export')).j).includes('1999999203'), 'super exports whole');
    const o = await readOp(w, ck, [KE]);
    assert.ok(o.res[KE], 'backup.create holder reads the register for the copy');
  });
}

/* RISHAD-266 · owner decision (f) 2026-11-03: no remaining backup/export allowance for the retired department account (role 'dept').
   Such a row can only survive as stored by an older release (018 usersA1Why refuses creating/changing one); it inherited isMgrOf and the
   full ceiling sheet (022 myPermsOf: admin/backup add|edit|view), so bkExportOk exported every collection (200 on all six routes at fa74283,
   both modes). Now: refused on every export route (019u bkExportOk); the restore inventory was already refused (no backup.restore key —
   019d) and is pinned here so it stays refused. The normal department manager (staff + mgr) and super keep exactly their access. */
const KU = 'bassam_auth_users_v1';
const PH = (pw, tag) => { const salt = crypto.createHash('sha256').update('r266f|' + tag).digest().subarray(0, 16); return 'p2$100000$' + salt.toString('hex') + '$' + crypto.pbkdf2Sync(pw, salt, 100000, 32, 'sha256').toString('hex'); };
for (const mode of MODES) {
  test('RISHAD-266 (f) [' + mode + ']: the retired dept role is refused every backup export and the restore inventory; the department manager and super are unchanged', async () => {
    const w = await privWorld(mode);
    /* a legacy row as an older release stored it (seeded directly: the server refuses creating it) */
    putKV(w.env, KU, (stored(w.env, KU) || []).concat([{ id: 'tst_x_deptrole', un: '1888888895', ph: PH('583915', 'tst_x_deptrole'), name: 'TEST_ONLY · retired dept account', role: 'dept', deptId: 'tst_d1', dis: 0, test: 'TEST_ONLY' }]));
    const lg = await w.C.login('1888888895', '583915'); assert.ok(lg.ok, 'the stored dept row still signs in: ' + JSON.stringify(lg).slice(0, 160));
    const dep = lg.ck;
    for (const r of ROUTES) {
      const x = await exp(w, dep, r);
      assert.equal(x.status, 403, mode + ' dept role: ' + r + ' ' + JSON.stringify(x.j).slice(0, 160));
      assert.match(String(x.j && x.j.err), /export-permission/, r + ' says why');
      assert.ok(!JSON.stringify(x.j).includes('1999999203') && !JSON.stringify(x.j).includes('70203'), r + ': no personal data in the refusal');
    }
    const inv = '/api/backup/restore?kind=dept&dept=tst_d1&departments=' + encodeURIComponent(JSON.stringify(['tst_d1']));
    const ri = await w.C.api(inv, { cookie: dep });
    assert.equal(ri.status, 403, mode + ' dept role restore inventory ' + JSON.stringify(ri.j).slice(0, 160));
    assert.match(String(ri.j && ri.j.err), /restore-policy/);
    /* the normal department manager (staff with mgr) and super: exactly as before */
    const dm = await login(w, 'dm1');
    for (const r of ROUTES) assert.equal((await exp(w, dm, r)).status, 200, 'manager: ' + r);
    assert.ok(JSON.stringify((await exp(w, dm, '/api/operations/export')).j).includes('1999999203'), 'the unit manager exports the register whole');
    /* restore needs role:mgr ∧ the backup.restore key (019d rsRestoreInventory · F-13): the fixture manager holds it in enforce; in legacy he
       does not (unchanged since fa74283 — restore_full_super covers 'mgr-no-key'), so only the enforce outcome is a manager control here */
    const mi = await w.C.api(inv, { cookie: dm });
    if (mode === 'enforce') assert.equal(mi.status, 200, 'manager: restore inventory ' + JSON.stringify(mi.j).slice(0, 160));
    else { assert.equal(mi.status, 403, 'legacy manager: restore inventory as before'); assert.match(String(mi.j && mi.j.err), /restore-policy/); }
    const su = await suCk(w);
    for (const r of ROUTES) assert.equal((await exp(w, su, r)).status, 200, 'super: ' + r);
  });
}
