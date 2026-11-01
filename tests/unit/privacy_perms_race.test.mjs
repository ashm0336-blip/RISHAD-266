/* PRIVACY batch closure (A) — the manager-unit race on the projected permissions registry bassam_perms_v1.
   A non-super manager receives the registry filtered by his units/targets (019u privPermsOut) and privIn restores, on save, the entries he did
   not receive. Before: the projection was not tied to the rights it was made with — when his units/targets changed while his tab was open,
   an entry that became visible after his read (never received) was taken as deleted, and the deletion was accepted.
   Now (019u privPermsFp/privPermsStale · 054 · 063): /api/get and boot carry the projection's fingerprint (pscope), the client echoes it;
   a save built on another projection is a conflict (why perms-scope-changed) with the current projection and its pscope — nothing written;
   a save without pscope that omits a hidden entry and a visible one is refused (perms-stale-client). Legitimate deletions of entries he
   received and administers still work. Both authorization modes. TEST_ONLY synthetic data. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { privWorld, login, stored, KP, MODES } from './privacy_fx.mjs';
import { putKV, operationSaveBody } from './tasks_fx.mjs';

const KU = 'bassam_auth_users_v1', SUP = 'tst_e_sup1';
/* tst_sup1 carries the manager badge (or not): his sheet is then not administrable by the dept manager (permTargetOk · 018) */
const badge = (w, on) => { const U = stored(w.env, KU); const u = U.find(x => x.id === 'tst_sup1'); if (on) u.mgr = true; else delete u.mgr; putKV(w.env, KU, U); };
const read = async (w, ck) => { const g = await w.C.api('/api/get?keys=' + KP, { cookie: ck }); return { v: JSON.parse(g.j.keys[KP].v), rev: g.j.keys[KP].rev, ps: g.j.pscope }; };
const save = async (w, ck, v, rev, ps) => {
  const body = operationSaveBody(w.env, '/api/save', { set: { [KP]: JSON.stringify(v) }, del: [], base: { [KP]: rev } });
  if (ps !== undefined) body.pscope = ps;
  const r = await w.C.api('/api/save', { method: 'POST', cookie: ck, body });
  return r.j || {};
};
/* /api/save answers ok:1 with per-key denied/conflicts (nothing written for those keys) */
const ok = (s) => s.ok === 1 && !Object.keys(s.denied || {}).length && !Object.keys(s.conflicts || {}).length;

for (const mode of MODES) {
  test('PRIVACY race A(2) [' + mode + ']: an entry that became visible after the read is not deleted by a save of the old projection', async () => {
    const w = await privWorld(mode);
    const full0 = stored(w.env, KP);
    assert.ok(full0.emps.tst_d1[SUP], 'fixture: sup1 has a sheet');
    badge(w, true);
    const ck = await login(w, 'dm1'), R = await read(w, ck);
    assert.ok(!R.v.emps.tst_d1[SUP], 'a manager-badge sheet is not delivered to the dept manager');
    assert.equal(typeof R.ps, 'string', '/api/get carries the projection fingerprint (pscope)');
    assert.ok(R.ps.length > 0);
    const b = await w.C.boot(ck);
    assert.equal(b.boot.pscope, R.ps, 'boot carries the same fingerprint');
    badge(w, false);   /* while his tab is open, sup1 becomes administrable — and so visible */
    const n = JSON.parse(JSON.stringify(R.v)); n.emps.tst_d1.tst_e_emp1 = { plan: ['view'] };
    const s = await save(w, ck, n, R.rev, R.ps);
    const cf = (s.conflicts || {})[KP];
    assert.ok(cf, 'a conflict, not a deletion: ' + JSON.stringify(s).slice(0, 300));
    assert.equal(cf.why, 'perms-scope-changed', 'truthful reason');
    assert.ok(cf.pscope && cf.pscope !== R.ps, 'with the fingerprint of the current projection');
    assert.ok(JSON.parse(cf.cur).emps.tst_d1[SUP], 'with the current projection (now holding the newly visible sheet)');
    assert.deepEqual(stored(w.env, KP), full0, 'nothing written: the newly visible sheet is kept');
    /* the client merges onto the current projection and retries with its fingerprint: the change is written, nothing lost */
    const m = JSON.parse(cf.cur); m.emps.tst_d1.tst_e_emp1 = { plan: ['view'] };
    const s2 = await save(w, ck, m, cf.rev, cf.pscope);
    assert.ok(ok(s2), JSON.stringify(s2).slice(0, 300));
    const after = stored(w.env, KP);
    assert.deepEqual(after.emps.tst_d1.tst_e_emp1, { plan: ['view'] });
    assert.deepEqual(after.emps.tst_d1[SUP], full0.emps.tst_d1[SUP], 'sup1 sheet kept');
    assert.deepEqual(after.emps.tst_d2, full0.emps.tst_d2, 'other unit kept');
  });

  test('PRIVACY race A(2) old client [' + mode + ']: a projection saved without pscope that omits a newly visible entry is refused, not applied', async () => {
    const w = await privWorld(mode);
    const full0 = stored(w.env, KP);
    badge(w, true);
    const ck = await login(w, 'dm1'), R = await read(w, ck);
    badge(w, false);
    const n = JSON.parse(JSON.stringify(R.v)); n.emps.tst_d1.tst_e_emp1 = { plan: ['view'] };
    const s = await save(w, ck, n, R.rev);
    assert.equal(((s.denied || {})[KP] || {}).why, 'perms-stale-client', 'says why: refresh and retry — ' + JSON.stringify(s).slice(0, 300));
    assert.deepEqual(stored(w.env, KP), full0, 'nothing written: sup1 sheet kept');
  });

  test('PRIVACY race A(1) [' + mode + ']: an entry that left his scope after the read cannot be deleted by him', async () => {
    const w = await privWorld(mode);
    const full0 = stored(w.env, KP);
    const ck = await login(w, 'dm1'), R = await read(w, ck);
    assert.ok(R.v.emps.tst_d1[SUP], 'sup1 sheet received (administrable)');
    badge(w, true);   /* sup1 gets the manager badge: outside the dept manager's administrable scope */
    const n = JSON.parse(JSON.stringify(R.v)); delete n.emps.tst_d1[SUP];
    const s = await save(w, ck, n, R.rev, R.ps);
    assert.equal(((s.conflicts || {})[KP] || {}).why, 'perms-scope-changed');
    assert.ok(!JSON.parse(s.conflicts[KP].cur).emps.tst_d1[SUP], 'the current projection no longer holds it');
    assert.deepEqual(stored(w.env, KP), full0, 'sheet kept');
  });

  test('PRIVACY race A legit [' + mode + ']: deleting a sheet he received and administers still works (dept manager · branch gm)', async () => {
    const w = await privWorld(mode);
    const ck = await login(w, 'dm1');
    let R = await read(w, ck);
    let n = JSON.parse(JSON.stringify(R.v)); delete n.emps.tst_d1.tst_e_emp1;
    let s = await save(w, ck, n, R.rev, R.ps);
    assert.ok(ok(s), JSON.stringify(s).slice(0, 300));
    assert.ok(!stored(w.env, KP).emps.tst_d1.tst_e_emp1, 'deleted');
    assert.ok(stored(w.env, KP).emps.tst_d2, 'other unit kept');
    /* a gm who sees his whole branch: deletion in a unit of the branch */
    const gk = await login(w, 'gm1');
    R = await read(w, gk);
    n = JSON.parse(JSON.stringify(R.v)); delete n.emps.tst_d1.tst_e_supB;
    s = await save(w, gk, n, R.rev, R.ps);
    assert.ok(ok(s), JSON.stringify(s).slice(0, 300));
    assert.ok(!stored(w.env, KP).emps.tst_d1.tst_e_supB);
  });
}
