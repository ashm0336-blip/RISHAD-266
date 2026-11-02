/* Independent unit ceilings (caps-own) — the real worker over the D1 stand-in (tasks_fx), both authorization modes (legacy · enforce). TEST_ONLY.
   Server rules of this batch (each case failed on 3773e3c):
     (a) F05 latent leaves: a unit manager saves a sheet that still holds out-of-ceiling leaves (kept from before the narrowing) — accepted;
         a NEW out-of-ceiling leaf, or a switched-off lens added to an explicit list that lacked it, is refused «cap»
     (b) grantor rule: a latent leaf of the grantor's own sheet is not held — he cannot grant it
     (c) a narrowed grant gives no access on the server (writePages · audCanDept · myPermsOf read the sheet cut to the ceiling) and is back on widening
     (d) independence: a unit switched to its own ceiling (capOwn[d] — a system-administrator save) reads its own record, not the parent's
         intersection; its manager grants inside it and nothing beyond it
     (e) the mode is the system administrator's: managers cannot set it; a stale client that drops it, or a value other than true / 'own', is refused */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, stored, putKV } from './tasks_fx.mjs';
import { internals } from './internals.mjs';

const D = 'tst_d1', KP = 'bassam_perms_v1', EK = 'tst_e_emp1';
const PG = ['dstats', 'emps', 'planning', 'staff', 'plan', 'daily', 'dreport', 'tasks', 'irshad', 'seized', 'award', 'links', 'help', 'admin'];
const ALL = ['view', 'add', 'edit', 'del', 'approve', 'export'];
const ACC = { dm1: ['0000000101', '70101'], gm1: ['0000000103', '70103'] };
const cp = (o) => JSON.parse(JSON.stringify(o));
async function scene(mode) {
  const W = await world({ mode });
  const P = stored(W.env, KP);
  P.subs = { [D]: { admin: ['backup', 'oplog', 'shifts', 'ptpls', 'import'], 'daily:tabs': ['kpiDaily', 'kpiOcc', 'kpiZones', 'rounds', 'field'] } };
  P.emps[D][EK] = Object.assign(cp(P.emps[D][EK]), { 'award/res': ['view'], 'daily/kpiDaily': ['view'] });
  putKV(W.env, KP, P);
  const ck = { su: W.su.ck };
  for (const a of Object.keys(ACC)) ck[a] = (await W.login(ACC[a][0], ACC[a][1])).ck;
  return Object.assign(W, { ck });
}
async function put(W, who, obj) {
  const g = await W.C.api('/api/get?keys=' + KP, { cookie: W.ck[who] });
  const body = { set: { [KP]: JSON.stringify(obj) }, del: [], base: { [KP]: (g.j.keys[KP] || {}).rev || 0 } };
  if (g.j.pscope !== undefined) body.pscope = g.j.pscope;
  const s = await W.C.api('/api/save', { method: 'POST', cookie: W.ck[who], body });
  const d = (s.j.denied || {})[KP] || (s.j.conflicts || {})[KP] || null;
  return { ok: !!(s.j.revs && s.j.revs[KP]), why: d ? d.why || 'conflict' : '', show: JSON.stringify(d || s.j).slice(0, 240) };
}
/* what the actor himself receives (non-super: the privacy projection) — edits are built on it, as the client does */
const view = async (W, who) => JSON.parse((await W.C.api('/api/get?keys=' + KP, { cookie: W.ck[who] })).j.keys[KP].v);
const ok = (r, m) => assert.ok(r.ok, m + ' — ' + r.show);
const no = (r, why, m) => { assert.ok(!r.ok, m + ' — accepted'); assert.equal(r.why, why, m + ' — ' + r.show); };
const narrow = async (W, f) => { const P = cp(stored(W.env, KP)); f(P); ok(await put(W, 'su', P), 'the system administrator writes the ceiling'); };

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';

  test(M + '(a) F05 · F06: a manager saves a sheet still holding latent leaves and lenses; a new out-of-ceiling leaf or lens is refused «cap»', async () => {
    const W = await scene(mode);
    await narrow(W, (P) => { P.caps[D] = PG.filter((k) => k !== 'award' && k !== 'seized'); P.lenses[D] = ['zones', 'paths']; });
    let p = await view(W, 'dm1');
    assert.deepEqual(p.emps[D][EK]['award/res'], ['view'], 'the latent leaf is still stored');
    p.emps[D][EK].tasks = ['view', 'add'];
    ok(await put(W, 'dm1', p), 'sheet edit keeping the latent leaf');
    assert.deepEqual(stored(W.env, KP).emps[D][EK]['award/res'], ['view']);
    p = await view(W, 'dm1'); p.emps[D][EK]['award/res'] = ['view', 'edit'];
    no(await put(W, 'dm1', p), 'cap', 'widening a latent leaf');
    p = await view(W, 'dm1'); p.emps[D][EK]['seized/records'] = ['view'];
    no(await put(W, 'dm1', p), 'cap', 'planting a new out-of-ceiling leaf');
    p = await view(W, 'dm1'); p.empLens[D].tst_e_lens_off = ['paths', 'gates', 'marks', 'dist', 'dens', 'zones'];
    ok(await put(W, 'dm1', p), 'a lens list keeping its switched-off lenses (+ an enabled one)');
    p = await view(W, 'dm1'); p.empLens[D].tst_e_lens_off = ['gates', 'marks', 'dist', 'dens'];
    ok(await put(W, 'dm1', p), 'narrowing a lens list inside the unit lenses (its switched-off lenses kept)');
    p = await view(W, 'dm1'); p.empLens[D].tst_e_lens_off = ['gates', 'marks', 'dist'];
    no(await put(W, 'dm1', p), 'perms', 'dropping a switched-off lens from a list that stays (latent loss — 60142a9+ rule)');
    p = await view(W, 'dm1'); p.empLens[D].tst_e_lens_off = ['gates', 'marks', 'dist', 'dens', 'paths'];
    ok(await put(W, 'dm1', p), 'adding an enabled lens');
    p = await view(W, 'dm1'); p.empLens[D].tst_e_emp1 = ['zones'];
    ok(await put(W, 'dm1', p), 'an explicit list for an employee who had none');
    p = await view(W, 'dm1'); p.empLens[D].tst_e_emp1 = ['zones', 'dens'];
    no(await put(W, 'dm1', p), 'cap', 'adding a switched-off lens to an explicit list that lacked it');
  });

  test(M + '(b) grantor rule: a latent leaf of the grantor\'s own sheet is not held', async () => {
    const W = await scene(mode);
    await narrow(W, (P) => { P.emps[D]['mgr:tst_d1'] = { 'daily/kpiDaily': ALL.slice(), 'daily/rounds': ALL.slice(), tasks: ALL.slice(), help: ['view'] }; P.subs[D]['daily:tabs'] = ['rounds', 'field']; });
    let p = await view(W, 'dm1'); p.emps[D].tst_e_snop = { 'daily/rounds': ['view'], tasks: ['view', 'add'] };
    ok(await put(W, 'dm1', p), 'what he holds');
    p = await view(W, 'dm1'); p.emps[D].tst_e_snop = Object.assign(p.emps[D].tst_e_snop, { 'daily/kpiDaily': ['view'] });
    no(await put(W, 'dm1', p), 'grant', 'his switched-off tab is not his to grant');
  });

  test(M + '(d) independent ceiling: the parent no longer narrows a switched unit; its manager grants inside its own ceiling and nothing beyond (e) the mode is the system administrator\'s', async () => {
    const W = await scene(mode);
    await narrow(W, (P) => { P.caps.tst_g1 = PG.filter((k) => k !== 'award'); P.caps[D] = PG.filter((k) => k !== 'seized'); });
    let p = await view(W, 'dm1'); p.emps[D].tst_e_snop = { 'award/res': ['view'] };
    no(await put(W, 'dm1', p), 'cap', 'dependent: the parent\'s ceiling cuts award');
    p = await view(W, 'dm1'); p.capOwn = { [D]: true };
    no(await put(W, 'dm1', p), 'super', 'a unit manager cannot switch the mode');
    p = await view(W, 'gm1'); p.capOwn = { [D]: true };
    no(await put(W, 'gm1', p), 'super', 'nor the parent unit\'s manager');
    p = await view(W, 'dm1'); p.caps[D] = PG.slice();
    no(await put(W, 'dm1', p), 'super', 'nor widen his own ceiling');
    await narrow(W, (P) => { P.capOwn = { [D]: true }; });
    p = await view(W, 'dm1'); p.emps[D].tst_e_snop = { 'award/res': ['view'] };
    ok(await put(W, 'dm1', p), 'independent: award is inside his own unit ceiling');
    p = await view(W, 'dm1'); p.emps[D].tst_e_snop = { 'award/res': ['view'], 'seized/records': ['view'] };
    no(await put(W, 'dm1', p), 'cap', 'and nothing beyond his own unit ceiling (seized is in the parent\'s)');
    const IN = await internals(['deptCapOf']), A = { u: { id: 'su', role: 'super' }, users: [], perms: stored(W.env, KP), depts: stored(W.env, 'bassam_depts_v1'), nodes: stored(W.env, 'bassam_gdepts_v1'), off: [] };
    assert.ok(IN.deptCapOf(A, D).includes('award') && !IN.deptCapOf(A, 'tst_d2').includes('award'), 'own record alone; the dependent sibling still intersects');
    /* (e) a stale client that drops the mode, a value other than true, a capMode other than 'own' */
    const P0 = cp(stored(W.env, KP)), j0 = JSON.stringify(P0);
    const st = cp(P0); delete st.capOwn; st.caps.tst_d3 = ['help'];
    no(await put(W, 'su', st), 'capmode', 'the system administrator\'s stale client dropping the mode');
    p = await view(W, 'dm1'); delete p.capOwn; p.emps[D].tst_e_snop = { help: ['view'] };
    assert.ok(!(await put(W, 'dm1', p)).ok, 'a manager\'s stale client dropping the mode');
    no(await put(W, 'su', Object.assign(cp(P0), { capOwn: { [D]: 'yes' } })), 'capmode', 'a value other than true');
    no(await put(W, 'su', Object.assign(cp(P0), { capMode: 'legacy' })), 'capmode', 'a capMode other than own');
    assert.equal(JSON.stringify(stored(W.env, KP)), j0, 'nothing changed');
    ok(await put(W, 'su', Object.assign(cp(P0), { capOwn: {} })), 'the explicit switch back by the system administrator');
  });
}

test('(c) a narrowed grant gives no access on the server: writePages · audCanDept · myPermsOf read the sheet cut to the ceiling, and it is back on widening', async () => {
  const W = await world({ mode: 'legacy' });
  const IN = await internals(['writePages', 'audCanDept', 'myPermsOf']);
  const P = stored(W.env, KP);
  P.subs = { [D]: { admin: ['backup', 'oplog', 'shifts', 'ptpls', 'import'] } };
  P.emps[D].tst_e_imp = { 'admin/import': ['view', 'add'], 'admin/oplog': ['view'], tasks: ['view'] };
  const A = (perms) => ({ u: { id: 'tst_imp', role: 'staff', deptId: D, ekey: 'tst_e_imp' }, users: stored(W.env, 'bassam_auth_users_v1'), perms, depts: stored(W.env, 'bassam_depts_v1'), nodes: stored(W.env, 'bassam_gdepts_v1'), off: [] });
  const wide = A(P);
  assert.deepEqual(cp(IN.writePages(wide, D)), ['admin']); assert.equal(IN.audCanDept(wide, D), true);
  const N = cp(P); N.subs[D].admin = ['backup', 'shifts'];
  const nar = A(N);
  assert.deepEqual(cp(IN.writePages(nar, D)), [], 'no write through a switched-off tab');
  assert.equal(IN.audCanDept(nar, D), false, 'no activity log through a switched-off tab');
  const mp = IN.myPermsOf(nar, D);
  assert.ok(!mp['admin/import'] && !mp['admin/oplog'] && mp.tasks, 'myPermsOf: cut to the ceiling');
  assert.deepEqual(N.emps[D].tst_e_imp['admin/import'], ['view', 'add'], 'and nothing deleted');
  assert.deepEqual(cp(IN.writePages(A(P), D)), ['admin'], 'widened: back');
});
