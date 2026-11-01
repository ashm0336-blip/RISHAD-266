/* RISHAD-266 · unify (batch 2 closing): the dept-role ban and the stage-0 grantor/target rules close only the abolished
   «حساب الإدارة» (role 'dept') and real escalation paths. This proves, in both authz modes, through the real worker over
   the D1 shim, that legitimate account and permission administration keeps working:
     super  : creates a staff account and a manager account (badge + mgr: key), renames a manager, freezes and unfreezes a
              manager, resets a manager's password (the manager logs in with it), deletes a staff account, writes a
              manager's sheet; and its own super row is never treated as a dept account.
     manager: creates a staff account in his unit (it logs in), freezes/unfreezes it, resets its password, deletes it,
              and grants that employee a page he holds.
     gm     : narrows a department manager under his branch. */
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const { world, stored } = await import('./tasks_fx.mjs');

const KU = 'bassam_auth_users_v1', KP = 'bassam_perms_v1';
const PH = (pw, tag) => { const salt = crypto.createHash('sha256').update('legit|' + tag).digest().subarray(0, 16); return 'p2$100000$' + salt.toString('hex') + '$' + crypto.pbkdf2Sync(pw, salt, 100000, 32, 'sha256').toString('hex'); };
const cp = (o) => JSON.parse(JSON.stringify(o));
async function put(w, ck, k, v) {
  const g = await w.C.api('/api/get?keys=' + encodeURIComponent(k), { cookie: ck });
  const body = { set: { [k]: JSON.stringify(v) }, del: [], base: { [k]: ((g.j.keys || {})[k] || {}).rev || 0 } };
  if (k === KU && g.j.uscope !== undefined) body.uscope = g.j.uscope;
  const r = await w.C.api('/api/save', { method: 'POST', cookie: ck, body });
  const d = (r.j.denied || {})[k] || (r.j.conflicts || {})[k] || null;
  return { ok: !!(r.j.revs && r.j.revs[k]), why: d ? (d.why || 'conflict') : '', show: d ? JSON.stringify(Object.assign({}, d, { cur: undefined })).slice(0, 240) : JSON.stringify(r.j).slice(0, 240) };
}
const list = async (w, ck) => JSON.parse((await w.C.api('/api/get?keys=' + KU, { cookie: ck })).j.keys[KU].v);
const edit = async (w, ck, id, patch) => (await list(w, ck)).map((u) => (u.id === id ? Object.assign({}, u, patch) : u));
const ok = (r, m) => assert.ok(r.ok, m + ' — ' + r.show);
const staff = (id, un, dept, ekey, pw) => ({ id, un, ph: PH(pw, id), name: 'TEST_ONLY · ' + id, role: 'staff', deptId: dept, ekey, dis: 0, test: 'TEST_ONLY' });

for (const mode of ['legacy', 'enforce']) {
  test('[' + mode + '] legitimate account and permission administration still works (super · manager · gm)', async () => {
    const w = await world({ mode }), su = w.su.ck;
    const dm1 = (await w.login('0000000101', '70101')).ck;
    /* ── super ── */
    ok(await put(w, su, KU, (await list(w, su)).concat([staff('lg_s1', '1777777701', 'tst_d2', 'tst_e_lg_s1', '481516')])), 'super creates a staff account');
    assert.ok((await w.C.login('1777777701', '481516')).ok, 'the new staff account logs in');
    ok(await put(w, su, KU, (await list(w, su)).concat([Object.assign(staff('lg_m1', '1777777702', 'tst_d1', 'mgr:tst_d1:7', '481517'), { mgr: true })])), 'super creates a manager account (badge + mgr: key)');
    assert.ok((await w.C.login('1777777702', '481517')).ok, 'the new manager account logs in');
    ok(await put(w, su, KU, await edit(w, su, 'tst_dm2', { name: 'TEST_ONLY · مدير ٢ (اسم جديد)' })), 'super renames a manager');
    ok(await put(w, su, KU, await edit(w, su, 'tst_dm2', { dis: 1 })), 'super freezes a manager');
    assert.ok(!(await w.C.login('0000000102', '70102')).ok, 'the frozen manager cannot log in');
    ok(await put(w, su, KU, await edit(w, su, 'tst_dm2', { dis: 0 })), 'super unfreezes the manager');
    ok(await put(w, su, KU, await edit(w, su, 'tst_dm2', { ph: PH('593017', 'dm2') })), 'super resets a manager password');
    assert.ok((await w.C.login('0000000102', '593017')).ok, 'the manager logs in with the new password');
    ok(await put(w, su, KU, (await list(w, su)).filter((u) => u.id !== 'lg_s1')), 'super deletes a staff account');
    let p = cp(stored(w.env, KP)); p.emps.tst_d1['mgr:tst_d1'] = { 'emps/data': ['view', 'add', 'edit', 'del', 'approve', 'export'], plan: ['view', 'edit'], help: ['view'] };
    ok(await put(w, su, KP, p), 'super writes a manager sheet');
    assert.equal((await list(w, su)).find((u) => u.id === 'su').role, 'super', 'the super row is untouched and still super');
    /* ── department manager ── */
    const dm = (await w.login('0000000101', '70101')).ck;
    ok(await put(w, dm, KU, (await list(w, dm)).concat([staff('lg_e1', '1777777703', 'tst_d1', 'tst_e_lg_e1', '481518')])), 'manager creates a staff account in his unit');
    assert.ok((await w.C.login('1777777703', '481518')).ok, 'the employee logs in');
    ok(await put(w, dm, KU, await edit(w, dm, 'lg_e1', { dis: 1 })), 'manager freezes his employee');
    ok(await put(w, dm, KU, await edit(w, dm, 'lg_e1', { dis: 0 })), 'manager unfreezes his employee');
    ok(await put(w, dm, KU, await edit(w, dm, 'lg_e1', { ph: PH('606162', 'lg_e1') })), 'manager resets his employee password');
    assert.ok((await w.C.login('1777777703', '606162')).ok, 'the employee logs in with the new password');
    p = cp(stored(w.env, KP)); p.emps.tst_d1.tst_e_lg_e1 = { plan: ['view'] };
    ok(await put(w, dm, KP, p), 'manager grants his employee a page he holds');
    ok(await put(w, dm, KU, (await list(w, dm)).filter((u) => u.id !== 'lg_e1')), 'manager deletes his employee account');
    /* ── branch manager (gm) ── */
    const gm = (await w.login('0000000103', '70103')).ck;
    p = cp(stored(w.env, KP)); p.emps.tst_d1['mgr:tst_d1'] = { 'emps/data': ['view', 'edit'], help: ['view'] };
    ok(await put(w, gm, KP, p), 'gm narrows a department manager under his branch');
    void dm1;
  });
}
