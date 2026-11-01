/* PRIVACY batch — owner decisions after 6641fbf. Both authorization modes. TEST_ONLY synthetic data.
   A  Custody month paging: the cursor encoded the last holder key — for old data a colleague's nid, readable by anyone (base64 JSON).
      Now month pages are positional (the cursor is bound to rev/uid/filters; stale ⇒ 409) and carry no holder key.
   B  Old custody rows stored under a holder's nid now resolve through the existing alias (019a cuResolvedCte: holder key = a register
      nid) to the person's key (eid · name): a filter by the eid/token the viewer sees finds them; an authorised viewer's filter by the
      nid finds the rows stored under the eid (019u privCustodyHolder). Read, search, paging and filter together.
   C  ekey = the login/permission key. Never changed in storage. An old account keyed by a nid is sent to a reader who does not receive
      that colleague's nid with the token of (4) (its eid) — accounts list (boot · /api/get), staffAccountKeys of the delete context,
      task group members — and a save of the accounts list maps it back by account id. Managers/super keep raw keys; login and authz of
      that account are unchanged; the permissions registry never shows another person's entry to such a reader. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { privWorld, setSheet, login, suCk, readOp, getKV, save, stored, put, rec, KE, KP, MODES } from './privacy_fx.mjs';
import { putKV, KT } from './tasks_fx.mjs';

const NID3 = '1999999203', C3 = 'tst_e_p0_3', KU = 'bassam_auth_users_v1';
const has = (x, s) => JSON.stringify(x).includes(s);
const dec = (c) => Buffer.from(String(c).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');

/* the account of tst_e_p0_3 is an old one keyed by his nid (permissions too) */
async function ekeyWorld(mode) {
  const w = await privWorld(mode);
  const U = stored(w.env, KU); U.find(u => u.id === 'tst_p0e3').ekey = NID3; putKV(w.env, KU, U);
  setSheet(w, NID3, { tasks: ['view'] });
  return w;
}

for (const mode of MODES) {
  test('PRIVACY C [' + mode + ']: an account keyed by a nid reaches a register reader as the eid token; managers/super keep the raw key; login and authz unchanged', async () => {
    const w = await ekeyWorld(mode);
    setSheet(w, 'tst_e_emp1', { tasks: ['view'] });
    const ck = await login(w, 'emp1');
    const b = await w.C.boot(ck), keys = (b.boot && b.boot.keys) || {};
    const bu = JSON.parse(keys[KU] || '[]').find(u => u.id === 'tst_p0e3');
    assert.ok(bu, 'boot: the account is listed (directory)');
    assert.equal(bu.ekey, C3, 'boot: its ekey is sent as the person\'s eid (resolves to the register record)');
    assert.ok(!has(b.boot, NID3), 'boot: the nid appears nowhere (accounts, permissions registry, other keys)');
    const g = await getKV(w, ck, [KU, KP, 'bsdept:tst_d1:bassam_grants_v1', 'bsdept:tst_d1:bassam_perm_tpls_v1']);
    assert.ok(!has(g.keys, NID3), '/api/get: no nid in accounts, permissions registry, grants, templates');
    assert.equal(JSON.parse(g.keys[KU].v).find(u => u.id === 'tst_p0e3').ekey, C3);
    const r = await readOp(w, ck, [KE]);
    assert.ok(rec(r.res[KE], C3), 'assignment resolution: the token is the register record\'s eid');
    /* save of the accounts list as received: nothing changes in storage, no token is stored */
    const U0 = JSON.stringify(stored(w.env, KU));
    await w.C.api('/api/save', { method: 'POST', cookie: ck, body: { set: { [KU]: g.keys[KU].v }, del: [], base: { [KU]: g.keys[KU].rev }, uscope: g.j.uscope } });
    assert.equal(JSON.stringify(stored(w.env, KU)), U0, 'accounts byte-identical after the reader\'s save');
    /* managers and super: raw keys */
    for (const who of ['su', 'dm1']) {
      const c2 = who === 'su' ? await suCk(w) : await login(w, who);
      const x = await getKV(w, c2, [KU, KP]);
      assert.equal(JSON.parse(x.keys[KU].v).find(u => u.id === 'tst_p0e3').ekey, NID3, who + ': raw ekey');
      assert.ok(JSON.parse(x.keys[KP].v).emps.tst_d1[NID3], who + ': the permission entry under the raw key');
    }
    /* permission edit by the manager on the raw key, then login + authz of that account */
    const dm = await login(w, 'dm1'), pg = await getKV(w, dm, [KP]), P = JSON.parse(pg.keys[KP].v);
    P.emps.tst_d1[NID3] = { tasks: ['view'], staff: ['view'] };
    const sv = await w.C.api('/api/save', { method: 'POST', cookie: dm, body: { set: { [KP]: JSON.stringify(P) }, del: [], base: { [KP]: pg.keys[KP].rev }, pscope: pg.j.pscope } });
    assert.equal(sv.status, 200, JSON.stringify(sv.j).slice(0, 300));
    assert.deepEqual(stored(w.env, KP).emps.tst_d1[NID3], { tasks: ['view'], staff: ['view'] }, 'stored under the raw key');
    const me = await readOp(w, await login(w, 'p0e3'), [KE, KT]);
    assert.equal(me.status, 200);
    assert.ok(me.res[KT], 'authz: the nid-keyed account reads the tasks it is granted');
    assert.equal(rec(me.res[KE], C3).nid, NID3, 'himself: his own record whole');
  });

  test('PRIVACY C [' + mode + ']: staffAccountKeys of the delete context and task group members carry the token, not the nid', async () => {
    const w = await ekeyWorld(mode);
    const S = stored(w.env, KT); let g = null;
    for (const d in S) for (const r of S[d]) if (Array.isArray(r) && r[17] === 'gTST1' && r[14] === 'tst_e_p0_2') { r[14] = NID3; g = d; }
    await put(w, KT, S); assert.ok(g, 'fixture: a group row');
    setSheet(w, 'tst_e_emp1', { 'emps/data': ['view', 'del'], tasks: ['view'] });
    const ck = await login(w, 'emp1');
    const c = await w.C.api('/api/employees/transition?dept=tst_d1&intent=delete', { cookie: ck });
    assert.equal(c.status, 200); assert.ok(!has(c.j, NID3), 'delete context: no nid');
    assert.ok(c.j.staffAccountKeys.includes(C3), 'staffAccountKeys: the account as the eid');
    const gr = await w.C.api('/api/tasks/group?dept=tst_d1&id=gTST1', { cookie: ck });
    assert.equal(gr.status, 200, JSON.stringify(gr.j).slice(0, 200));
    assert.ok(!has(gr.j, NID3) && has(gr.j, C3), 'group members: the token');
    const dm = await w.C.api('/api/employees/transition?dept=tst_d1&intent=delete', { cookie: await suCk(w) });
    assert.ok(dm.j.staffAccountKeys.includes(NID3), 'super: raw key');
    /* an award record of old data keyed by the nid: a plain results reader gets the token */
    w.env.DB.exec("UPDATE award_records SET employee_key='" + NID3 + "' WHERE department_id='tst_d1' AND record_id='id:tstaw2'");
    setSheet(w, 'tst_e_emp1', { 'award/res': ['view'] });
    const aw = await w.C.api('/api/award?dept=tst_d1&view=records', { cookie: await login(w, 'emp1') });
    assert.equal(aw.status, 200); assert.ok(!has(aw.j, NID3), 'award records: no nid');
    assert.equal(aw.j.recs.find(x => x.id === 'tstaw2').ekey, C3, 'award record ekey: the token');
    const as = await w.C.api('/api/award?dept=tst_d1&view=records', { cookie: await suCk(w) });
    assert.equal(as.j.recs.find(x => x.id === 'tstaw2').ekey, NID3, 'super: raw');
  });

  test('PRIVACY A/B [' + mode + ']: custody rows stored under a nid resolve to the person; month cursors carry no holder key; paging returns every holder once; filter and search', async () => {
    const w = await privWorld(mode);
    const dm = await login(w, 'dm1');
    for (const h of [C3, 'tst_e_p0_1', 'tst_e_p0_2']) {
      const cur = await w.C.api('/api/custody?dept=tst_d1&view=month', { cookie: dm });
      const iss = await w.C.api('/api/custody/act', { method: 'POST', cookie: dm, body: { dept: 'tst_d1', base: cur.j.rev, requestId: 'TEST_ONLY_ab_' + h + mode, op: 'issue', itemId: 'tst_fixture_item', holderKey: h } });
      assert.equal(iss.status, 200, JSON.stringify(iss.j).slice(0, 300));
    }
    /* old data: his movements are stored under his nid with empty snapshots */
    w.env.DB.exec("UPDATE custody_movements SET holder_key='" + NID3 + "',holder_nid_snapshot='',holder_empno_snapshot='' WHERE holder_key='" + C3 + "'");
    const get = async (ck, qs) => { const r = await w.C.api('/api/custody?dept=tst_d1&' + qs, { cookie: ck }); assert.equal(r.status, 200, qs + ' ' + JSON.stringify(r.j).slice(0, 200)); return r.j; };
    setSheet(w, 'tst_e_p0_1', { 'emps/custody': ['view'] });
    const v = await login(w, 'p0e1');
    const all = (await get(v, 'view=month&limit=100')).rows.map(r => r.holderKey).sort();
    assert.ok(all.includes(C3) && !all.includes(NID3), 'read: the nid-stored rows are the person (eid): ' + all);
    for (const ck of [v, dm]) {
      let seen = [], cur = '', n = 0;
      do {
        const j = await get(ck, 'view=month&limit=1' + (cur ? '&cursor=' + encodeURIComponent(cur) : ''));
        seen.push(...j.rows.map(r => r.holderKey)); cur = j.next;
        if (cur) assert.ok(!dec(cur).includes(NID3) && !dec(cur).includes(C3), 'cursor carries no holder key: ' + dec(cur));
      } while (cur && ++n < 20);
      assert.deepEqual(seen.slice().sort(), all, 'paging: every holder exactly once');
    }
    const f = await get(v, 'view=holder&holderKey=' + C3);
    assert.ok(f.rows.length > 0 && !has(f.rows, NID3), 'filter by the eid the viewer sees finds the nid-stored rows');
    const s = await get(v, 'view=moves&q=' + encodeURIComponent('موظف مهام 3'));
    assert.ok(s.rows.some(r => r.eid === C3) && !has(s, NID3), 'search by name');
    assert.equal((await get(v, 'view=moves&q=' + NID3)).rows.length, 0, 'no search by nid for the viewer');
    assert.equal((await get(v, 'view=holder&holderKey=' + NID3)).rows.length, 0, 'no filter by nid for the viewer (oracle)');
    assert.ok((await get(dm, 'view=holder&holderKey=' + NID3)).rows.length > 0, 'manager: filter by the nid finds them');
    assert.ok((await get(dm, 'view=holder&holderKey=' + C3)).rows.length > 0, 'manager: filter by the eid finds them');
  });
}
