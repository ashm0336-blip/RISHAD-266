/* PRIVACY batch — (10) a custody holder no longer in the employee register. Old data may hold a hand-out under the nid of a person
   since deleted: no register record ⇒ no alias, no (4) token, so the raw key (the nid) reached every custody reader as holderKey/eid/hid/
   topHolders (before: 60142a9). Now, for a reader not allowed personal data, a holder key that names no register record is sent as
   'nx:'+SHA-256(unit | earliest move id under that key) — never derived from the key — stable across reads; the holder filter maps it
   back (all its rows), paging and search are unchanged, an unknown 'nx:' is refused (privacy-hidden), a hand-out found that way is
   closed on its stored key; issuing to a token is refused; managers keep the raw key. Both modes. TEST_ONLY synthetic data. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { privWorld, setSheet, login, MODES } from './privacy_fx.mjs';

const GONE = '1999999299', NAME = 'TEST_ONLY · موظف محذوف';
const has = (x, s) => JSON.stringify(x).includes(s);
const dec = (c) => Buffer.from(String(c).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');

async function orphanWorld(mode) {
  const w = await privWorld(mode), dm = await login(w, 'dm1');
  for (const [i, h] of [[1, 'tst_e_p0_3'], [2, 'tst_e_p0_3'], [3, 'tst_e_p0_1']]) {
    const cur = await w.C.api('/api/custody?dept=tst_d1&view=month', { cookie: dm });
    const iss = await w.C.api('/api/custody/act', { method: 'POST', cookie: dm, body: { dept: 'tst_d1', base: cur.j.rev, requestId: 'TEST_ONLY_orph_' + i + mode, op: 'issue', itemId: 'tst_fixture_item', holderKey: h } });
    assert.equal(iss.status, 200, JSON.stringify(iss.j).slice(0, 300));
  }
  /* old data: tst_e_p0_3's two hand-outs belong to a person since deleted, keyed by his nid */
  w.env.DB.exec("UPDATE custody_movements SET holder_key='" + GONE + "',holder_nid_snapshot='" + GONE + "',holder_empno_snapshot='',holder_name_snapshot='" + NAME + "' WHERE holder_key='tst_e_p0_3'");
  w.dm = dm;
  return w;
}
const get = async (w, ck, qs, st = 200) => { const r = await w.C.api('/api/custody?dept=tst_d1&' + qs, { cookie: ck }); assert.equal(r.status, st, qs + ' ' + JSON.stringify(r.j).slice(0, 200)); return r.j; };

for (const mode of MODES) {
  test('PRIVACY 10 [' + mode + ']: a holder outside the register reaches a custody reader as a stable token; filter, paging and search work; managers unchanged', async () => {
    const w = await orphanWorld(mode);
    setSheet(w, 'tst_e_p0_1', { 'emps/custody': ['view'] });
    const v = await login(w, 'p0e1');
    const m = await get(w, v, 'view=month&limit=100');
    assert.ok(!has(m, GONE), 'month view and summary: no nid anywhere');
    const row = m.rows.find(r => r.snapshot && r.snapshot.name === NAME);
    assert.ok(row, 'the hand-out is still listed with its name');
    assert.match(row.holderKey, /^nx:[0-9a-f]{20}$/, 'holderKey: a token');
    assert.equal(row.snapshot.eid, row.holderKey);
    const tok = row.holderKey;
    assert.equal((await get(w, v, 'view=month&limit=100')).rows.find(r => r.snapshot.name === NAME).holderKey, tok, 'stable across reads');
    const mv = await get(w, v, 'view=moves&limit=100');
    assert.ok(!has(mv, GONE), 'moves view: no nid (eid · hid)');
    assert.equal(mv.rows.filter(r => r.eid === tok && r.hid === tok).length, 2, 'both movements carry the token');
    const f = await get(w, v, 'view=holder&holderKey=' + encodeURIComponent(tok));
    assert.equal(f.rows.length, 2, 'filter by the token: all its rows'); assert.ok(!has(f, GONE));
    const s = await get(w, v, 'view=moves&q=' + encodeURIComponent('محذوف'));
    assert.equal(s.rows.length, 2, 'search by the name snapshot'); assert.ok(!has(s, GONE));
    assert.equal((await get(w, v, 'view=moves&q=' + GONE)).rows.length, 0, 'no search by the nid');
    let seen = [], cur = '', n = 0;
    do { const j = await get(w, v, 'view=month&limit=1' + (cur ? '&cursor=' + encodeURIComponent(cur) : '')); assert.ok(!has(j, GONE)); seen.push(...j.rows.map(r => r.holderKey)); cur = j.next; if (cur) assert.ok(!dec(cur).includes(GONE)); } while (cur && ++n < 20);
    assert.deepEqual(seen.slice().sort(), m.rows.map(r => r.holderKey).sort(), 'paging: every holder once');
    const bad = await w.C.api('/api/custody?dept=tst_d1&view=holder&holderKey=nx:0123456789abcdef0123', { cookie: v });
    assert.equal(bad.status, 409); assert.equal(bad.j.err, 'privacy-hidden', 'unknown token refused');
    /* the manager: raw key, filter by it */
    const dm = await get(w, w.dm, 'view=month&limit=100');
    assert.ok(dm.rows.some(r => r.holderKey === GONE) && !has(dm, '"nx:'), 'manager: the stored key');
    assert.equal((await get(w, w.dm, 'view=holder&holderKey=' + GONE)).rows.length, 2);
  });

  test('PRIVACY 10 [' + mode + ']: a custody editor closes a hand-out found through the token — on the stored key; issuing to a token is refused', async () => {
    const w = await orphanWorld(mode);
    setSheet(w, 'tst_e_p0_1', { 'emps/custody': ['view', 'add', 'edit'] });
    const v = await login(w, 'p0e1');
    const tok = (await get(w, v, 'view=month&limit=100')).rows.find(r => r.snapshot.name === NAME).holderKey;
    const f = await get(w, v, 'view=holder&holderKey=' + encodeURIComponent(tok));
    const iss = await w.C.api('/api/custody/act', { method: 'POST', cookie: v, body: { dept: 'tst_d1', base: f.rev, requestId: 'TEST_ONLY_orph_tok_' + mode, op: 'issue', itemId: 'tst_fixture_item', holderKey: tok } });
    assert.equal(iss.status, 409, JSON.stringify(iss.j).slice(0, 200)); assert.equal(iss.j.err, 'privacy-hidden');
    const cl = await w.C.api('/api/custody/act', { method: 'POST', cookie: v, body: { dept: 'tst_d1', base: f.rev, requestId: 'TEST_ONLY_orph_close_' + mode, op: 'close', issueId: f.rows[0].issueId, kind: 'in' } });
    assert.equal(cl.status, 200, JSON.stringify(cl.j).slice(0, 300));
    const last = w.env.DB.q("SELECT holder_key FROM custody_movements WHERE department_id='tst_d1' AND issue_id=? ORDER BY sequence DESC LIMIT 1", f.rows[0].issueId)[0];
    assert.equal(last.holder_key, GONE, 'the return is recorded on the stored key');
    assert.equal((await get(w, v, 'view=holder&holderKey=' + encodeURIComponent(tok))).rows.length, 1, 'one hand-out left under the same token');
  });
}
