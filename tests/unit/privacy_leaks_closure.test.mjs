/* PRIVACY batch — closure of the leaks found after 2cf985f. Both authorization modes. TEST_ONLY synthetic data.
   (1) GET /api/employees/transition?intent=delete (019c empTransitionContextOf via 019e) gave the whole register — colleagues' nid, phone,
       e-mail, empno (initial password) — to a holder of the delete right alone (emp.record.delete · legacy emps/data del), whom every other
       read route denies them. Now the context is projected (019u privEmpOut) and the commit restores hidden fields from storage before any
       rule (privEmpIn strict): a delete built from the projected context removes exactly the chosen record and keeps the others byte-identical;
       a hidden value sent changed is refused (privacy-hidden). Super / the unit manager / record editors unchanged.
   (2) The custody search (019a) matched the holder nid/empno snapshots for every custody viewer — an oracle on values blanked in the rows.
       Now those columns are searched only for a reader who receives them.
   (3) Task commands (review/extend/cancel/… via tkPick/tkFind) matched the assignee key exactly; a viewer who got a nid-assigned row with the
       token (eid · nx:) received not-found. Now the token is resolved to the stored assignee key of that row (071 tkTokBack); an 'nx:'
       token of no stored record is refused (privacy-hidden).
   (4) Custody rows (holderKey · eid · hid) and summary.topHolders carried a raw holder key = nid (old data); now the token of (1b)/(4). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { privWorld, setSheet, login, suCk, readOp, stored, put, KE, MODES } from './privacy_fx.mjs';
import { rowsOf, KT, DAY, TOMORROW } from './tasks_fx.mjs';

const NID3 = '1999999203', C3 = 'tst_e_p0_3', EMPNO3 = '70203';
const has = (x, s) => JSON.stringify(x).includes(s);

async function ctx(w, ck) { const r = await w.C.api('/api/employees/transition?dept=tst_d1&intent=delete', { cookie: ck }); assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 300)); return r.j; }
let rq = 0;
const del = (w, ck, c, rows) => w.C.api('/api/employees/transition', { method: 'POST', cookie: ck, body: { dept: 'tst_d1', intent: 'delete', deleteMode: 'selected', requestId: 'TEST_ONLY_priv_del_' + (++rq), base: c.base, finalRows: rows, reason: 'TEST_ONLY delete' } });

for (const mode of MODES) {
  test('PRIVACY closure 1 [' + mode + ']: the delete context of a delete-only holder carries no personal field; the delete loses nothing; a changed hidden value is refused', async () => {
    const w = await privWorld(mode);
    setSheet(w, 'tst_e_emp1', { 'emps/data': ['view', 'del'], tasks: ['view'], staff: ['view'] });   /* the delete rewrites tasks and the schedule: it must read them (019e read-reference) */
    const ck = await login(w, 'emp1');
    let c = await ctx(w, ck);
    assert.ok(c.employees.some(e => e.eid === C3), 'the colleague is listed (to choose whom to delete)');
    assert.ok(!has(c.employees, NID3) && !has(c.employees, EMPNO3) && !has(c.employees, '0599999203'), 'no colleague nid/empno/phone');
    /* tamper first: a hidden field sent with another value */
    const T = JSON.parse(JSON.stringify(c.employees)); T.find(e => e.eid === C3).nid = '1888888888';
    const E0 = JSON.stringify(stored(w.env, KE));
    let r = await del(w, ck, c, T.filter(e => e.eid !== 'tst_e_p0_5'));
    assert.equal(r.status, 409, JSON.stringify(r.j).slice(0, 300)); assert.equal(r.j.err, 'privacy-hidden');
    assert.equal(JSON.stringify(stored(w.env, KE)), E0, 'nothing written');
    /* the delete from the projected context */
    c = await ctx(w, ck);
    r = await del(w, ck, c, c.employees.filter(e => e.eid !== 'tst_e_p0_5'));
    assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 300));
    const after = stored(w.env, KE), before = JSON.parse(E0);
    assert.equal(JSON.stringify(after), JSON.stringify(before.filter(e => e.eid !== 'tst_e_p0_5')), 'exactly the chosen record removed; the others byte-identical (PII kept)');
  });

  test('PRIVACY closure 1 [' + mode + ']: super, the unit manager and a record editor still receive the whole context', async () => {
    const w = await privWorld(mode);
    for (const who of ['su', 'dm1']) assert.ok(has((await ctx(w, who === 'su' ? await suCk(w) : await login(w, who))).employees, NID3), who);
    setSheet(w, 'tst_e_emp1', { 'emps/data': ['view', 'edit', 'del'] });
    assert.ok(has((await ctx(w, await login(w, 'emp1'))).employees, NID3), 'record editor');
  });

  test('PRIVACY closure 2/4 [' + mode + ']: the custody search does not match hidden nid/empno snapshots; a holder key that is a nid is sent as the token', async () => {
    const w = await privWorld(mode);
    const E = stored(w.env, KE); Object.assign(E.find(e => e.eid === C3), { empno: EMPNO3 }); await put(w, KE, E);
    const dm = await login(w, 'dm1'), cur = await w.C.api('/api/custody?dept=tst_d1&view=month', { cookie: dm });
    const iss = await w.C.api('/api/custody/act', { method: 'POST', cookie: dm, body: { dept: 'tst_d1', base: cur.j.rev, requestId: 'TEST_ONLY_priv_cu_' + mode, op: 'issue', itemId: 'tst_fixture_item', holderKey: C3 } });
    assert.equal(iss.status, 200, JSON.stringify(iss.j).slice(0, 300));
    const q = async (ck, s, view = 'moves') => { const r = await w.C.api('/api/custody?dept=tst_d1&view=' + view + (s ? '&q=' + encodeURIComponent(s) : ''), { cookie: ck }); assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 200)); return r.j; };
    setSheet(w, 'tst_e_p0_1', { 'emps/custody': ['view'] });
    const v = await login(w, 'p0e1');
    for (const s of [NID3, NID3.slice(0, 9), EMPNO3]) assert.equal((await q(v, s)).rows.length, 0, 'viewer: no match on ' + s);
    assert.ok((await q(v, 'موظف مهام 3')).rows.length > 0, 'viewer: the name search still works');
    for (const s of [NID3, EMPNO3]) assert.ok((await q(dm, s)).rows.length > 0, 'manager: full search on ' + s);
    /* (4) old data: the movement's holder key is the nid and its snapshots are empty (no alias) */
    w.env.DB.exec("UPDATE custody_movements SET holder_key='" + NID3 + "',holder_nid_snapshot='',holder_empno_snapshot='' WHERE holder_key='" + C3 + "'");
    for (const view of ['moves', 'month']) {
      const j = await q(v, '', view);
      assert.ok(!has(j.rows, NID3) && !has(j.summary, NID3), view + ': no nid as holder key');
      assert.ok(has(j.rows, C3), view + ': the holder is sent as his eid');
    }
    assert.ok(has((await q(dm, '', 'moves')).rows, NID3), 'manager: the stored key');
  });

  test('PRIVACY closure 3 [' + mode + ']: a task command on a row assigned by nid works with the token the viewer sees; an unknown nx: token is refused', async () => {
    const w = await privWorld(mode);
    const S = stored(w.env, KT); let n = 0;
    for (const d in S) for (const r of S[d]) if (Array.isArray(r) && r[14] === C3) { r[14] = NID3; n++; }
    await put(w, KT, S);
    const pick = rowsOf(stored(w.env, KT), NID3).find(x => (x.day === DAY || x.day === TOMORROW) && x.r[3] === 'pending');
    assert.ok(n && pick, 'fixture: a pending row of the person assigned by nid');
    setSheet(w, 'tst_e_emp1', { tasks: ['view', 'edit'] });
    const ck = await login(w, 'emp1');
    const v = await readOp(w, ck, [KT]);
    assert.ok(!has(v.res[KT], NID3) && rowsOf(v.res[KT], C3).length === n, 'the viewer sees the rows with the eid');
    const ext = (ekey, e) => w.C.api('/api/tasks/extend', { method: 'POST', cookie: ck, body: { dept: 'tst_d1', k: pick.day, id: pick.r[13], ekey, e, why: 'TEST_ONLY' } });
    const e1 = Math.max(Date.now(), pick.r[15] || 0) + 2 * 864e5;
    const bad = await ext('nx:0123456789abcdef0123', e1);
    assert.notEqual(bad.status, 200, 'unknown token refused');
    let row = rowsOf(stored(w.env, KT), NID3).find(x => x.r[13] === pick.r[13] && x.day === pick.day);
    assert.equal(row.r[16], pick.r[16], 'nothing written');
    const r = await ext(C3, e1);
    assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 300));
    row = rowsOf(stored(w.env, KT), NID3).find(x => x.r[13] === pick.r[13] && x.day === pick.day);
    assert.ok(row, 'the stored assignee key is still the nid'); assert.equal(row.r[16], e1, 'the command applied to that row');
    assert.equal(bad.j.err, 'privacy-hidden', JSON.stringify(bad.j));
  });
}
