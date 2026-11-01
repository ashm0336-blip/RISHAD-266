/* PRIVACY batch — SV01: the whole permissions registry bassam_perms_v1 (every unit's ceiling, every employee's sheet in every department)
   was delivered to every signed-in user by the boot page and /api/get.
   Rule (workers/parts/019u-privacy-projection.js privPermsOut/privPermsIn): a non-super actor receives caps/subs/lenses of the units in his
   scope (and their ancestor nodes); emps/tplOf/empLens of a unit he manages for himself and for every employee he may administer
   (permTargetOk · 018); of another unit in scope his own entries only. Super unchanged. A manager saving the registry he received keeps
   every hidden part (other units, other managers' sheets). Both authorization modes. TEST_ONLY synthetic data. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { privWorld, login, suCk, getKV, save, stored, KP, MODES } from './privacy_fx.mjs';

const permsOf = async (w, ck) => {
  const g = await getKV(w, ck, [KP]), b = await w.C.boot(ck);
  const v = g.keys[KP] && g.keys[KP].v != null ? JSON.parse(g.keys[KP].v) : null;
  const bv = b.boot && b.boot.keys && b.boot.keys[KP] ? JSON.parse(b.boot.keys[KP]) : null;
  return { v, bv, rev: g.keys[KP] ? g.keys[KP].rev : 0 };
};
const units = (o, k) => Object.keys((o && o[k]) || {}).sort();

for (const mode of MODES) {
  test('PRIVACY SV01 [' + mode + ']: a plain employee receives his unit and his own sheet only (boot and /api/get)', async () => {
    const w = await privWorld(mode);
    const full = stored(w.env, KP);
    assert.ok(full.emps.tst_d2 && full.caps.tst_d3, 'fixture: other units exist');
    for (const [who, d, ek] of [['emp1', 'tst_d1', 'tst_e_emp1'], ['emp2', 'tst_d2', 'tst_e_emp2'], ['p0e1', 'tst_d1', 'tst_e_p0_1']]) {
      const ck = await login(w, who), P = await permsOf(w, ck);
      for (const v of [P.v, P.bv]) {
        assert.ok(v, who + ': the registry is still delivered (the client reads its own sheet from it)');
        assert.deepEqual(units(v, 'caps'), [d], who + ': ceilings of his unit only');
        assert.deepEqual(units(v, 'emps'), (full.emps[d] ? [d] : []), who + ': sheets of his unit only');
        assert.deepEqual(Object.keys((v.emps || {})[d] || {}), full.emps[d] && full.emps[d][ek] ? [ek] : [], who + ': his own sheet only');
        if (full.emps[d] && full.emps[d][ek]) assert.deepEqual(v.emps[d][ek], full.emps[d][ek], who + ': his own sheet unchanged');
        assert.deepEqual(v.caps[d], full.caps[d], who + ': his unit ceiling unchanged');
      }
    }
  });

  test('PRIVACY SV01 [' + mode + ']: managers get their units (administrable sheets), gm his branch, super everything', async () => {
    const w = await privWorld(mode);
    const full = stored(w.env, KP);
    const dm = await permsOf(w, await login(w, 'dm1'));
    assert.deepEqual(units(dm.v, 'caps'), ['tst_d1']);
    assert.deepEqual(dm.v.emps.tst_d1, full.emps.tst_d1, 'dept manager: every staff sheet of his unit');
    assert.ok(!dm.v.emps.tst_d2, 'dept manager: not another unit');
    const gm = await permsOf(w, await login(w, 'gm1'));
    assert.deepEqual(units(gm.v, 'caps'), ['tst_d1', 'tst_d2'], 'gm: the units of his branch');
    assert.deepEqual(gm.v.emps.tst_d2, full.emps.tst_d2, 'gm: sheets of his branch units');
    assert.ok(!(gm.v.caps || {}).tst_d3, 'gm: not a unit outside his branch');
    const su = await permsOf(w, await suCk(w));
    assert.deepEqual(su.v, full, 'super: unchanged');
  });

  test('PRIVACY SV01 lossless [' + mode + ']: a manager saving the projected registry keeps other units and hidden sheets', async () => {
    const w = await privWorld(mode);
    /* a hidden sheet in his own unit: another manager-badge holder (not administrable by a dept manager) */
    const p0 = JSON.parse(JSON.stringify(stored(w.env, KP))); p0.emps.tst_d1['mgr:tst_d1x'] = { plan: ['view'] };
    const { putKV } = await import('./tasks_fx.mjs'); putKV(w.env, KP, p0);
    const ck = await login(w, 'dm1'), P = await permsOf(w, ck);
    assert.ok(!P.v.emps.tst_d1['mgr:tst_d1x'], 'another manager sheet is not delivered to the dept manager');
    const n = JSON.parse(JSON.stringify(P.v)); n.emps.tst_d1.tst_e_emp1 = { plan: ['view'] };
    const s = await save(w, ck, { [KP]: JSON.stringify(n) }, { [KP]: P.rev });
    assert.equal(s.status, 200, JSON.stringify(s.j).slice(0, 400));
    assert.ok(s.j && s.j.ok === 1 && !Object.keys(s.j.denied || {}).length, JSON.stringify(s.j).slice(0, 400));
    const after = stored(w.env, KP);
    assert.deepEqual(after.emps.tst_d1.tst_e_emp1, { plan: ['view'] }, 'the visible change is written');
    assert.deepEqual(after.emps.tst_d2, p0.emps.tst_d2, 'other unit sheets kept');
    assert.deepEqual(after.caps, p0.caps, 'every ceiling kept');
    assert.deepEqual(after.emps.tst_d1['mgr:tst_d1x'], { plan: ['view'] }, 'hidden manager sheet kept');
    assert.deepEqual(after.empLens, p0.empLens, 'lenses kept');
  });
}
