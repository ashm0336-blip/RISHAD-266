/* Independent boundary checks for the relational cutover. Fixtures only; no Cloudflare. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { D1Shim, ROOT } from './harness.mjs';

const KEY = 'bassam_dstats_v1';
const copy = x => JSON.parse(JSON.stringify(x));
const empty = () => ({ haram: {}, nabawi: {}, locks: {} });
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
let code;
async function source() {
  if (!code) code = JSON.parse(read('workers/parts.json')).parts.map(p => read('workers/parts/' + p.file)).join('');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r266-dstats-review-'));
    const target = path.join(tmp, 'worker.mjs');
    fs.writeFileSync(target, code + '\nexport { initDb, dsDomainRead, dsDomainCommit, dsDomainView, dsDomainStatements, dsDomainRoute, actorFromKeys, enfAttachGrantsKeys, hashPw, hashKey, kvPutStmts };\n');
    try { return await import(pathToFileURL(target).href); }
    finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
async function world() {
  const W = await source(), env = { DB: new D1Shim() };
  await W.initDb(env);
  if (!env.DB.q("SELECT name FROM sqlite_master WHERE name='daily_stats_days'").length) env.DB.exec(read('migrations/0004_daily_stats.sql'));
  env.DB.exec('PRAGMA foreign_keys = ON');
  return { W, env, DB: env.DB };
}
function actor(W, mode, operations) {
  const keys = {
    bassam_auth_users_v1: JSON.stringify([{ id: 'TEST_ONLY_staff', role: 'staff', deptId: 'd1', ekey: 'e1' }]),
    bassam_depts_v1: JSON.stringify([{ id: 'd1', gid: 'g1' }]),
    bassam_gdepts_v1: JSON.stringify([{ id: 'g1' }]),
    bassam_perms_v1: JSON.stringify({ emps: { d1: { e1: { 'dstats/haram': ['view', ...operations] } } } }),
    bassam_platform_v1: '{}'
  };
  const A = W.actorFromKeys(keys, 'TEST_ONLY_staff');
  if (mode === 'enforce') { A.enf = { mode: 'enforce', perm: { applied: false } }; W.enfAttachGrantsKeys(A, keys); }
  return A;
}

test('entry alone cannot close or reopen a day or month in either permission mode', async () => {
  for (const mode of ['legacy', 'enforce']) for (const lock of [true, { mo: 1 }, { dopen: { 1: 1 } }, { dshut: { 1: 1 } }]) {
    const { W, env } = await world(), data = empty(); data.locks['haram|9999-1'] = lock;
    const r = await W.dsDomainCommit(env, actor(W, mode, ['add', 'edit']), { base: 0, data });
    assert.equal(r.status, 403, mode + ': lock changes require the lock operation');
    assert.deepEqual((await W.dsDomainRead(env)).data, empty());
  }
});

test('approval alone cannot insert or edit numeric daily statistics', async () => {
  for (const mode of ['legacy', 'enforce']) {
    const { W, env } = await world(), before = empty(); before.haram['9999-01-01'] = { worshippers: 10 };
    await env.DB.batch(W.dsDomainStatements(env, empty(), before));
    for (const mutation of [d => d.haram['9999-01-01'].worshippers = 12, d => d.haram['9999-01-02'] = { worshippers: 12 }]) {
      const next = copy(before); mutation(next);
      const r = await W.dsDomainCommit(env, actor(W, mode, ['approve']), { base: 0, data: next });
      assert.equal(r.status, 403, mode + ': approval does not confer entry');
      assert.deepEqual((await W.dsDomainRead(env)).data, before);
    }
  }
});

test('a mosque-scoped projected save preserves omitted hidden rows and locks', async () => {
  const { W, env } = await world(), before = empty();
  before.haram['9999-01-01'] = { worshippers: 10, umrah: null };
  before.nabawi['9999-01-01'] = { worshippers: 33, salam_corridor: 7 };
  before.locks['nabawi|9999-1'] = true;
  await env.DB.batch(W.dsDomainStatements(env, empty(), before));
  const A = actor(W, 'enforce', ['add', 'edit']), projected = await W.dsDomainView(env, A, before, { recs: {} });
  assert.equal(projected.nabawi, undefined);
  projected.haram['9999-01-01'].worshippers = 11;
  const r = await W.dsDomainCommit(env, A, { base: 0, data: projected });
  assert.equal(r.status, 200);
  const actual = (await W.dsDomainRead(env)).data;
  assert.equal(actual.haram['9999-01-01'].worshippers, 11);
  assert.deepEqual(actual.nabawi, before.nabawi);
  assert.deepEqual(actual.locks, before.locks);
  assert.equal(r.body.data.nabawi, undefined, 'The acknowledgement must also remain projected');
});

test('unexpected fields cannot be written through the relational API even by an otherwise authorized writer', async () => {
  const { W, env, DB } = await world();
  for (const row of [{ worshippers: 10, TEST_ONLY_unknown: 3 }, { worshippers: 10, salam_corridor: 3 }, { worshippers: 10, __f: { carts: 'invalid attribution' } }]) {
    const data = empty(); data.haram['9999-01-01'] = row;
    const r = await W.dsDomainCommit(env, actor(W, 'enforce', ['add', 'edit', 'approve']), { base: 0, data });
    assert.equal(r.status, 400); assert.equal(r.body.err, 'dstats-shape');
  }
  assert.deepEqual((await W.dsDomainRead(env)).data, empty());
  assert.equal(DB.q('SELECT COUNT(*) n FROM kv WHERE k=?1', KEY)[0].n, 0);
});

test('platform reset includes the daily-statistics domain in the same transaction', async () => {
  const { W, env, DB } = await world();
  const fixturePin = String(500000 + 83927), fixtureKey = 'A'.repeat(20);
  await DB.batch([
    ...W.kvPutStmts(env, 'kv', 'bassam_auth_users_v1', JSON.stringify([{ id: 'su', un: '0501234567', role: 'super', ph: await W.hashPw(fixturePin) }])),
    DB.prepare("INSERT INTO meta(k,v) VALUES('rk',?1)").bind(await W.hashKey(fixtureKey))
  ]);
  const data = empty(); data.haram['9999-01-01'] = { worshippers: 9 }; data.locks['haram|9999-1'] = { ap: 1, dshut: { 1: 1 } };
  await DB.batch(W.dsDomainStatements(env, empty(), data));
  const api = async (route, body, cookie) => {
    const headers = { Origin: 'http://x', 'Content-Type': 'application/json' }; if (cookie) headers.Cookie = cookie;
    return await W.default.fetch(new Request('http://x' + route, { method: 'POST', headers, body: JSON.stringify(body) }), env);
  };
  const login = await api('/api/login', { u: '0501234567', p: fixturePin });
  assert.equal((await login.json()).ok, 1);
  const reset = await api('/api/reset', { pw: fixturePin, key: fixtureKey, confirm: 'تهيئة', admin: { un: '0501234568', pw: String(300000 + 94827), name: 'TEST_ONLY reset administrator' } }, login.headers.get('set-cookie').split(';')[0]);
  assert.equal(reset.status, 200); assert.equal((await reset.json()).ok, 1);
  assert.deepEqual((await W.dsDomainRead(env)).data, empty(), 'A new platform must not inherit the previous platform statistics or locks');
});
