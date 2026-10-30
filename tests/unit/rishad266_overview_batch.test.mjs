/* Actual canonical Worker, synthetic SQLite data. No Cloudflare or R2 operations. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, IDS } from './notifications_review_fx.mjs';

async function fixture() {
  const w = await world();
  const now = Date.now(), day = new Date(now); day.setHours(0, 0, 0, 0);
  const stamp = Math.max(day.getTime() + 1, now - 1000);
  const security = w.DB.db.prepare('INSERT INTO sec(ts,uid,un,act,target,detail,ip,city,dev) VALUES(?,?,?,?,?,?,?,?,?)');
  for (const act of ['login_fail', 'login_fail', 'denied', 'login_ok', 'acct_add', 'acct_freeze']) {
    security.run(stamp, IDS.super, w.users[0].un, act, JSON.stringify({ id: IDS.employee1 }), 'TEST_ONLY', '192.0.2.1', 'TEST_ONLY city', 'TEST_ONLY device');
  }
  security.run(day.getTime() - 1, IDS.super, w.users[0].un, 'login_fail', '', '', '', '', '');
  const guard = w.DB.db.prepare('INSERT INTO guard(gk,n,until) VALUES(?,?,?)');
  guard.run('p:' + w.users[0].un + '|192.0.2.1', 2, now + 60000);
  guard.run('ip:192.0.2.1', 2, now + 60000);
  guard.run('rl:TEST_ONLY', 2, now + 60000);
  guard.run('expired', 2, now - 1000);
  const owner = w.DB.db.prepare('INSERT INTO imgown(img,st,k,uid,dept,ts) VALUES(?,?,?,?,?,?)');
  for (const state of ['bound', 'claim', 'orphan', 'amb']) owner.run('img_TEST_ONLY_' + state, state, '', IDS.super, '', stamp);
  w.DB.db.prepare('INSERT INTO imgs(k,seq,v) VALUES(?,?,?)').run('img_TEST_ONLY_claim', 0, 'TEST_ONLY');
  return w;
}

test('overview preserves dashboard aggregates and security locks in two read batches', async () => {
  const w = await fixture(), batches = [], original = w.DB.batch.bind(w.DB);
  w.DB.batch = statements => { batches.push(statements.map(s => s.sql)); return original(statements); };
  const r = await w.api('super', '/api/overview');
  assert.equal(r.status, 200);
  const j = r.json;
  assert.equal(j.failsToday, 2); assert.equal(j.deniedToday, 1); assert.equal(j.lockedNow, 2);
  assert.equal(j.activeNow, w.users.length); assert.equal(j.sessions, w.users.length);
  assert.ok(j.lastLogin[IDS.super] > 0);
  assert.equal(j.fails.length, 1); assert.equal(j.fails[0].n, 2);
  assert.deepEqual(j.fails[0].gks.sort(), ['ip:192.0.2.1', 'p:' + w.users[0].un + '|192.0.2.1'].sort());
  assert.equal(j.added[0].tg.id, IDS.employee1); assert.equal(j.frozen[0].tg.id, IDS.employee1);
  assert.equal(j.deniedBy[0].uid, IDS.super);
  assert.deepEqual(j.imgs.counts, { bound: 1, claim: 1, orphan: 1, amb: 1 });
  assert.equal(j.imgs.stored, 1); assert.equal(j.imgs.staged, 0); assert.equal(j.imgs.r2, false);
  assert.equal(j.imgs.claims[0].uid, IDS.super); assert.equal(j.imgs.orphans.length, 1);
  const overview = batches.filter(sql => (sql.length === 12 || sql.length === 6) && /KIVO_DB_SCHEMA/.test(sql[0]));
  assert.equal(overview.length, 2);
  assert.equal(overview.reduce((n, sql) => n + sql.length - 1, 0), 16, 'sixteen aggregates plus one in-transaction schema guard per batch; still only two trips');
  assert.ok(overview.flat().every(sql => /^SELECT/i.test(sql)), 'dashboard batching must remain read-only');
});

test('overview image-diagnostic failure remains optional', async () => {
  const w = await fixture(); w.DB.failIf = sql => /^SELECT st, COUNT\(\*\) AS n FROM imgown/.test(sql);
  const r = await w.api('super', '/api/overview');
  assert.equal(r.status, 200); assert.equal(r.json.failsToday, 2); assert.ok(r.json.imgs.err);
});

test('overview required aggregate failure cannot masquerade as successful zero counts', async () => {
  const w = await fixture(); w.DB.failIf = sql => /^SELECT COUNT\(\*\) AS n FROM sec WHERE act/.test(sql);
  const r = await w.api('super', '/api/overview');
  assert.equal(r.status, 500); assert.notEqual(r.json?.ok, 1);
});

test('overview remains restricted to the platform administrator', async () => {
  const w = await fixture();
  for (const who of ['gm', 'manager1', 'employee1', 'noView']) {
    assert.equal((await w.api(who, '/api/overview')).status, 403, who);
  }
  assert.equal((await w.api(null, '/api/overview')).status, 401);
});
