/* PRIVACY batch — (7) a copy whose redaction marker was removed by hand cannot blank stored personal data.
   privacy_redacted_restore covers the marker (domain.redacted · manifest.redacted). The marker is plain JSON: deleting it made the
   copy of a backup.create holder (no personal fields) restorable again on 752790d, overwriting the stored nid/phone/e-mail/empno/contact,
   the report roster empno, the custody holder snapshots and the award contact fields with blanks.
   Rule (019u privRestoreBlanks · 019d rsPrepare, also reached by the 019f conversion path): before any plan or write, a record present
   both in the copy and in the store whose stored personal field is non-empty and is empty/missing (or an 'nx:' token) in the copy ⇒
   restore-personal-blank (409) for every actor, super included (no override). Limits (documented in 019u): a different non-empty value
   restores normally; a record absent from the copy is not judged; a copy older than the entry of a personal field cannot be restored
   through this path (owner decision: no manual blanking, no override — a full copy exported after the data was entered is the remedy;
   legacy-copy transfer is a separate review). Both authorization modes. TEST_ONLY synthetic data. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { privWorld, setSheet, login, suCk, stored, put, KE, KDR, D, MODES, drRow } from './privacy_fx.mjs';

const NID3 = '1999999203', C3 = 'tst_e_p0_3';
const AWC = { phone: '0599999277', email: 'tst_aw_2@example.test', comp: '70277' };
const get = async (w, ck, route) => { const r = await w.C.api(route + (route.includes('?') ? '&' : '?') + 'dept=' + D, { cookie: ck }); assert.equal(r.status, 200, route + ' ' + JSON.stringify(r.j).slice(0, 200)); return r.j; };
async function deptCopy(w, ck) {
  const ops = await get(w, ck, '/api/operations/export'), cu = await get(w, ck, '/api/custody/export'), nf = await get(w, ck, '/api/notifications/export');
  const ir = await get(w, ck, '/api/irshad/export'), sz = await get(w, ck, '/api/seized/export'), aw = await get(w, ck, '/api/award/export');
  return { app: 'bassam-crowd', version: 4, kind: 'dept', data: {}, manifest: { version: 4, scope: 'dept', domains: { kv: 1, notifications: 1, custody: 1, irshad: 1, seized: 1, awards: 1, operations: 1 }, departments: [D], keys: [] },
    domains: { notifications: nf.domain, custody: cu.domains, irshad: ir.domains, seized: sz.domains, awards: aw.domains, operations: ops.domains } };
}
/* the marker removed by hand, everywhere */
const strip = (f) => { const c = JSON.parse(JSON.stringify(f)); delete c.manifest.redacted; for (const k of Object.keys(c.domains)) [].concat(c.domains[k]).forEach(x => { if (x && typeof x === 'object') delete x.redacted; }); return c; };
let seq = 0;
async function restore(w, ck, file, phase) {
  const inv = await w.C.api('/api/backup/restore?kind=dept&dept=' + D + '&departments=' + encodeURIComponent(JSON.stringify([D])), { cookie: ck });
  assert.equal(inv.status, 200, JSON.stringify(inv.j).slice(0, 300));
  const body = { version: 1, requestId: 'TEST_ONLY_privacy_blank_' + (++seq), scope: { kind: 'dept', departmentId: D }, mode: 'replace', reason: 'TEST_ONLY restore', base: inv.j.base, backup: file, legacyConsent: false, phase };
  let r = await w.C.api('/api/backup/restore', { method: 'POST', cookie: ck, body: { ...body, phase: 'inspect' } });
  if (phase === 'commit' && r.status === 200) r = await w.C.api('/api/backup/restore', { method: 'POST', cookie: ck, body: { ...body, base: r.j.inspection.base } });
  else if (phase === 'commit-direct') r = await w.C.api('/api/backup/restore', { method: 'POST', cookie: ck, body: { ...body, phase: 'commit' } });
  return r;
}
/* every table except the session store (logins happen before the snapshot) */
function dump(env) {
  const out = {};
  for (const { name } of env.DB.q("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name<>'sess' ORDER BY name"))
    out[name] = env.DB.q('SELECT * FROM "' + name + '"').map(r => JSON.stringify(r)).sort();
  return out;
}
const diffTables = (a, b) => Object.keys({ ...a, ...b }).filter(t => JSON.stringify(a[t]) !== JSON.stringify(b[t]));
/* personal data in every judged place: register (PII on two records, privWorld), roster empno (privWorld), custody snapshot, award contact */
async function blankWorld(mode) {
  const w = await privWorld(mode), su = await suCk(w);
  const E = stored(w.env, KE); Object.assign(E.find(e => e.eid === C3), { contact: 'TEST_ONLY جهة تواصل' }); await put(w, KE, E);
  const g = await w.C.api('/api/award?dept=tst_d1&view=records', { cookie: su });
  const a = await w.C.api('/api/award/act', { method: 'POST', cookie: su, body: { dept: 'tst_d1', requestId: 'TEST_ONLY_blank_aw_' + mode, base: g.j.base, op: 'edit', id: 'tstaw2', data: AWC } });
  assert.equal(a.status, 200, JSON.stringify(a.j).slice(0, 300));
  const dm = await login(w, 'dm1'), cur = await w.C.api('/api/custody?dept=tst_d1&view=month', { cookie: dm });
  const iss = await w.C.api('/api/custody/act', { method: 'POST', cookie: dm, body: { dept: 'tst_d1', base: cur.j.rev, requestId: 'TEST_ONLY_blank_cu_' + mode, op: 'issue', itemId: 'tst_fixture_item', holderKey: C3 } });
  assert.equal(iss.status, 200, JSON.stringify(iss.j).slice(0, 300));
  setSheet(w, 'tst_e_emp1', { 'admin/backup': ['view', 'add', 'edit'] });
  w.redactedCopy = strip(await deptCopy(w, await login(w, 'emp1')));
  w.fullCopy = await deptCopy(w, dm);
  assert.ok(!JSON.stringify(w.redactedCopy).includes('"redacted"'), 'marker removed');
  assert.ok(!JSON.stringify(w.redactedCopy).includes(NID3) && !JSON.stringify(w.redactedCopy).includes(AWC.phone), 'the stripped copy lacks the personal data');
  return w;
}
const restorers = (mode) => mode === 'enforce' ? ['su', 'dm1'] : ['su'];
const ckOf = async (w, who) => who === 'su' ? suCk(w) : login(w, who);

for (const mode of MODES) {
  test('PRIVACY 7 [' + mode + ']: a redacted copy with its marker removed is refused before any write (inspect and commit, super included)', async () => {
    const w = await blankWorld(mode);
    const cks = {}; for (const who of restorers(mode)) cks[who] = await ckOf(w, who);
    const before = dump(w.env);
    for (const who of restorers(mode)) for (const phase of ['inspect', 'commit-direct']) {
      const r = await restore(w, cks[who], w.redactedCopy, phase);
      assert.equal(r.status, 409, who + ' ' + phase + ': ' + JSON.stringify(r.j).slice(0, 300));
      assert.equal(r.j.err, 'restore-personal-blank', who + ' ' + phase);
      const at = r.j.details.at.join(' ');
      assert.ok(r.j.details.n >= 4 && at.includes(':nid') && !at.includes(NID3), 'details name places, never values: ' + at);
    }
    assert.deepEqual(diffTables(before, dump(w.env)), [], 'no table changed: business tables, kv, revs, meta (rev · restore_epoch), receipts, audit');
    assert.equal(stored(w.env, KE).find(e => e.eid === C3).nid, NID3);
  });

  test('PRIVACY 7 [' + mode + ']: each judged place alone refuses — register, report roster empno, custody snapshot, award contact', async () => {
    const w = await blankWorld(mode), su = await suCk(w), before = dump(w.env);
    const R = w.redactedCopy, F = w.fullCopy, mix = (f) => { const c = JSON.parse(JSON.stringify(F)); f(c); return c; };
    const ops = (res) => (c) => { const i = c.domains.operations.findIndex(d => d.resource === res); c.domains.operations[i] = R.domains.operations.find(d => d.resource === res); };
    const cases = {
      register: ops('bassam_employees_v1'),
      roster: ops('bassam_dreport_v1'),
      custody: (c) => { c.domains.custody = R.domains.custody; },
      awards: (c) => { c.domains.awards = R.domains.awards; },
    };
    for (const [name, f] of Object.entries(cases)) {
      const r = await restore(w, su, mix(f), 'commit');
      assert.equal(r.status, 409, name + ': ' + JSON.stringify(r.j).slice(0, 300));
      assert.equal(r.j.err, 'restore-personal-blank', name);
      const at = r.j.details.at.join(' ');
      assert.ok({ register: /employees_v1:.*:(nid|phone|email|empno|contact)/, roster: /dreport_v1:.*:empno/, custody: /custody:tst_d1:.*holder_(nid|empno)_snapshot/, awards: /awards:tst_d1:\S*tstaw2:(phone|email|employee_number)/ }[name].test(at), name + ': ' + at);
    }
    assert.deepEqual(diffTables(before, dump(w.env)), [], 'nothing written');
    assert.equal(drRow(stored(w.env, KDR), w).empno, '70999');
  });

  test('PRIVACY 7 [' + mode + ']: a genuine full copy of the unit manager restores; a different non-empty value restores to the copy', async () => {
    const w = await blankWorld(mode);
    for (const who of restorers(mode)) {
      const E1 = stored(w.env, KE); Object.assign(E1.find(e => e.eid === C3), { work: 'TEST_ONLY بعد النسخة', phone: '0599999288' }); await put(w, KE, E1);
      const r = await restore(w, await ckOf(w, who), w.fullCopy, 'commit');
      assert.equal(r.status, 200, who + ': ' + JSON.stringify(r.j).slice(0, 400));
      const after = stored(w.env, KE).find(e => e.eid === C3);
      assert.notEqual(after.work, 'TEST_ONLY بعد النسخة', who + ': restored to the copy');
      assert.equal(after.phone, '0599999203', who + ': a changed (non-empty) value is restored to the copy');
      assert.equal(after.nid, NID3);
    }
  });

  test('PRIVACY 7 [' + mode + ']: explicit limit — a full copy older than the entry of a personal field is refused (super and manager), nothing written', async () => {
    const w = await blankWorld(mode);
    const E2 = stored(w.env, KE); E2.find(e => e.eid === 'tst_e_p0_2').phone = '0599999202'; await put(w, KE, E2);
    const cks = {}; for (const who of restorers(mode)) cks[who] = await ckOf(w, who);
    const before = dump(w.env);
    for (const who of restorers(mode)) for (const phase of ['inspect', 'commit-direct']) {
      const r = await restore(w, cks[who], w.fullCopy, phase);
      assert.equal(r.status, 409, who + ' ' + phase); assert.equal(r.j.err, 'restore-personal-blank');
      assert.ok(r.j.details.at.some(x => /:tst_e_p0_2:phone$/.test(x)), JSON.stringify(r.j.details));
    }
    assert.deepEqual(diffTables(before, dump(w.env)), [], 'nothing written');
    assert.equal(stored(w.env, KE).find(e => e.eid === 'tst_e_p0_2').phone, '0599999202');
  });

  test('PRIVACY 7 [' + mode + ']: the refusal message says nothing was written and asks for a full copy exported after the data was entered — never to clear fields', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(new URL('../../src/services/548-atomic-backup.js', import.meta.url), 'utf8');
    const m = /'restore-personal-blank':\s*'([^']*)'/.exec(src);
    assert.ok(m, 'client message present');
    for (const p of ['لم يُكتب شيء', 'فلا يمكن التحقق', 'نسخةً كاملة صدّرها مدير الوحدة أو مدير النظام بعد إدخال']) assert.ok(m[1].includes(p), p);
    for (const p of ['عدّل', 'يدوي', 'إفراغ', 'امسح']) assert.ok(!m[1].includes(p), 'no clearing advice: ' + p);
  });
}
