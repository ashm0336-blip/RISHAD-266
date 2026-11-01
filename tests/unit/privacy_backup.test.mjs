/* PRIVACY batch — IP39: «backup.view» (status of the copies) alone exposed every collection of the department (employees with PII, tasks,
   custody, irshad, seized, awards, notifications) through the domain export routes, /api/operations/read and /api/get.
   Rule (workers/parts/019u-privacy-projection.js bkExportOk/bkReadAnyOk): exporting — and the backup page's read of every collection —
   needs super, or the backup page together with being a manager of the unit or holding backup.create (admin/backup add|edit) /
   backup.restore. backup.view alone keeps its own stamp (bassam_last_export_v1). Personal fields inside an export follow the read rule.
   Both authorization modes. TEST_ONLY synthetic data. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { privWorld, setSheet, login, suCk, readOp, getKV, KE, MODES } from './privacy_fx.mjs';

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
