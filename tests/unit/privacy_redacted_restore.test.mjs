/* PRIVACY batch — a copy exported without personal data cannot be restored.
   An exporter who may export the unit (backup create/restore) but not see its personal data receives the exports with those fields removed
   or blanked (019u · 019t · 019n · 019b). Before: nothing marked such a copy, and restoring it later overwrote the stored nid/phone/e-mail/
   empno with the blanks. Now: every domain so changed carries redacted:true and the export answer lists them (redacted[]); the restore
   (019f rsConvertBackup · 019d rsPrepare) refuses a marked copy before any plan or write (restore-redacted, 409; the client says why in
   Arabic: 548). A full export by the unit manager is unmarked and restores as before. Both authorization modes. TEST_ONLY synthetic data. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { privWorld, setSheet, login, suCk, stored, KE, D, MODES } from './privacy_fx.mjs';

const get = async (w, ck, route) => { const r = await w.C.api(route + (route.includes('?') ? '&' : '?') + 'dept=' + D, { cookie: ck }); assert.equal(r.status, 200, route + ' ' + JSON.stringify(r.j).slice(0, 200)); return r.j; };
/* the department copy as the client assembles it (root-logic bkExport: manifest v4, typed domains, no kv key) */
async function deptCopy(w, ck) {
  const ops = await get(w, ck, '/api/operations/export'), cu = await get(w, ck, '/api/custody/export'), nf = await get(w, ck, '/api/notifications/export');
  const ir = await get(w, ck, '/api/irshad/export'), sz = await get(w, ck, '/api/seized/export'), aw = await get(w, ck, '/api/award/export');
  const redacted = [].concat(ops.redacted || [], cu.redacted || [], aw.redacted || [], ir.redacted || [], sz.redacted || []);
  const file = { app: 'bassam-crowd', version: 4, kind: 'dept', data: {}, manifest: { version: 4, scope: 'dept', domains: { kv: 1, notifications: 1, custody: 1, irshad: 1, seized: 1, awards: 1, operations: 1 }, departments: [D], keys: [] },
    domains: { notifications: nf.domain, custody: cu.domains, irshad: ir.domains, seized: sz.domains, awards: aw.domains, operations: ops.domains } };
  return { file, redacted };
}
async function restore(w, ck, file, phase) {
  const inv = await w.C.api('/api/backup/restore?kind=dept&dept=' + D + '&departments=' + encodeURIComponent(JSON.stringify([D])), { cookie: ck });
  assert.equal(inv.status, 200, JSON.stringify(inv.j).slice(0, 300));
  const body = { version: 1, requestId: 'TEST_ONLY_privacy_rs_' + Math.random().toString(36).slice(2), scope: { kind: 'dept', departmentId: D }, mode: 'replace', reason: 'TEST_ONLY restore', base: inv.j.base, backup: file, legacyConsent: false, phase: 'inspect' };
  let r = await w.C.api('/api/backup/restore', { method: 'POST', cookie: ck, body });
  if (phase === 'commit' && r.status === 200) r = await w.C.api('/api/backup/restore', { method: 'POST', cookie: ck, body: { ...body, base: r.j.inspection.base, phase: 'commit' } });
  return r;
}
const revOf = (w, k) => (w.env.DB.q('SELECT rev FROM revs WHERE k = ' + "'" + k + "'")[0] || {}).rev || 0;

for (const mode of MODES) {
  test('PRIVACY redacted copy [' + mode + ']: an export without personal data is marked and no restore accepts it; nothing is written', async () => {
    const w = await privWorld(mode);
    setSheet(w, 'tst_e_emp1', { 'admin/backup': ['view', 'add', 'edit'] });
    const { file, redacted } = await deptCopy(w, await login(w, 'emp1'));
    assert.ok(redacted.includes(D + ':bassam_employees_v1'), 'the export answer lists the redacted register: ' + JSON.stringify(redacted));
    const reg = file.domains.operations.find(d => d.resource === 'bassam_employees_v1');
    assert.equal(reg.redacted, true, 'the copy itself carries the marker');
    assert.ok(!JSON.stringify(reg).includes('1999999203'), 'and holds no colleague nid');
    const before = JSON.stringify(stored(w.env, KE)), rev0 = revOf(w, KE), v0 = w.env.DB.q("SELECT v FROM meta WHERE k='rev'")[0].v;
    for (const who of mode === 'enforce' ? ['su', 'dm1'] : ['su']) {   /* a unit manager restores with backup.restore (enforcement) */
      const ck = who === 'su' ? await suCk(w) : await login(w, who);
      const r = await restore(w, ck, file, 'commit');
      assert.equal(r.status, 409, who + ': ' + JSON.stringify(r.j).slice(0, 300));
      assert.equal(r.j.err, 'restore-redacted', who + ': says why');
    }
    /* the marker on any one domain is enough (a hand-assembled copy mixing domains) */
    const mixed = JSON.parse(JSON.stringify(file)); mixed.domains.operations.forEach(d => { delete d.redacted; }); mixed.domains.awards[0].redacted = true;
    assert.equal((await restore(w, await suCk(w), mixed, 'commit')).j.err, 'restore-redacted');
    assert.equal(JSON.stringify(stored(w.env, KE)), before, 'stored personal fields intact');
    assert.equal(revOf(w, KE), rev0, 'revision unchanged');
    assert.equal(w.env.DB.q("SELECT v FROM meta WHERE k='rev'")[0].v, v0, 'no write at all');
  });

  test('PRIVACY redacted copy [' + mode + ']: the unit manager\'s full export is unmarked and restores normally', async () => {
    const w = await privWorld(mode);
    const { file, redacted } = await deptCopy(w, await login(w, 'dm1'));
    assert.deepEqual(redacted, [], 'no redaction');
    assert.ok(!JSON.stringify(file.domains).includes('"redacted"'), 'no marker');
    assert.ok(JSON.stringify(file.domains.operations).includes('1999999203'), 'the register is whole');
    const E1 = stored(w.env, KE); E1.find(e => e.eid === 'tst_e_p0_3').work = 'TEST_ONLY بعد النسخة';
    const { put } = await import('./privacy_fx.mjs'); await put(w, KE, E1);
    const r = await restore(w, await suCk(w), file, 'commit');
    assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 400));
    const after = stored(w.env, KE).find(e => e.eid === 'tst_e_p0_3');
    assert.notEqual(after.work, 'TEST_ONLY بعد النسخة', 'restored to the copy');
    assert.equal(after.nid, '1999999203'); assert.equal(after.phone, '0599999203');
  });
}
