/* RISHAD-266 · scoped reference snapshot: a resource first read lazily after the snapshot must be fenced at the snapshot's revision.
   A concurrent change in that window is a 409 conflict with nothing committed — never a 500 (found by the adversarial review). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, WCUR, D, DAY, KT, KE, stored } from './tasks_fx.mjs';
const bump = (db, k) => db.prepare("INSERT INTO revs(k,rev) VALUES(?,1000) ON CONFLICT(k) DO UPDATE SET rev=rev+1").run(k);
let serial = 0;
async function setup() {
  const B = await world({ worker: WCUR, mode: 'enforce' });
  const login = await B.login('0000000101', '70101');
  const api = (path, body, ck = login.ck) => B.C.api(path, { cookie: ck, ...(body === undefined ? {} : { method: 'POST', body }) });
  return { ...B, api };
}
async function race(B, when, change, run) {
  const DB = B.env.DB, batch = DB.batch.bind(DB); let ran = false, n = 0; const log = [];
  DB.batch = async statements => {
    n++; log.push(statements.map(s => s.sql.slice(0, 80)).join(' | ').slice(0, 300));
    if (!ran && change && when(statements, n)) { ran = true; log.push('>>> CHANGE before batch '+n); change(B.env.DB.db); }
    return batch(statements);
  };
  try { return { result: await run(), ran, log }; } finally { DB.batch = batch; }
}
let snapSeen = false;
const lazyLoadOf = key => statements => (statements.some(s => /substr\(k,1,7\)<>'bsdept:'|SELECT k,seq,v FROM kv ORDER BY k,seq/.test(s.sql)) ? (snapSeen = true, false) : snapSeen) && statements.some(s => /FROM revs WHERE k IN\(SELECT value FROM json_each/.test(s.sql) && (s.args || []).some(a => typeof a === 'string' && a.includes(JSON.stringify(key))));
const afterSnap = () => { let seen = 0; return statements => { if (statements.some(s => /substr\(k,1,7\)<>'bsdept:'|SELECT k,seq,v FROM kv ORDER BY k,seq/.test(s.sql))) { seen = 1; return false; } return seen === 1 && (seen = 2); }; };
for (const [name, key] of [['task resource', KT], ['department employees', KE]]) for (const mode of [false, true]) {
  test('race on ' + (mode ? 'any batch after the snapshot' : 'the lazy first read') + ' of ' + name + ' in a task command ⇒ 409, nothing committed', async () => {
    const B = await setup(); snapSeen = false;
    try {
      const r = await B.api('/api/operations/read?keys=' + encodeURIComponent(KT));
      const row = stored(B.env, KT)[DAY].find(x => x[13] === 1760000000101);
      const body = { dept: D, requestId: 'TEST_ONLY_rvs_' + ++serial, epoch: r.j.epoch, base: r.j.base[KT], k: DAY, id: row[13], ekey: row[14],
        edit: { k: DAY, t: 'TEST_ONLY rvs ' + serial, desc: row[1] || '', prio: row[2], s: row[15], e: row[16], ekey: String(row[14]), wt: row[19] || null } };
      const before = B.env.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n;
      const out = await race(B, mode ? afterSnap() : lazyLoadOf(key), db => bump(db, key), () => B.api('/api/tasks/settings', body));
            assert.equal(out.ran, true);
      assert.equal(B.env.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n, before, 'nothing committed');
      assert.equal(out.result.status, 409, 'expected 409 conflict, got ' + out.result.status + ' ' + JSON.stringify(out.result.j));
    } finally { B.env.DB.db.close(); }
  });
}
