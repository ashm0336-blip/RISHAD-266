/* The daily-statistics slice owns typed D1 rows and an explicit acknowledged API.
   These tests use SQLite transactions and the canonical source parts, never Preview. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { parse } from 'acorn';
import { D1Shim, ROOT } from './harness.mjs';
import {world as backupWorld,backupBrowser,exportFull,seedTypedDomains,snap as backupSnapshot,until as backupUntil,copy as backupCopy} from './backup_review_fx.mjs';

const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const cp = x => JSON.parse(JSON.stringify(x));
const KEY = 'bassam_dstats_v1';
async function sourceWorker() {
  const parts = JSON.parse(read('workers/parts.json')).parts;
  const source = parts.map(({ file }) => read('workers/parts/' + file)).join('');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r266-dstats-test-'));
  const target = path.join(dir, 'worker.mjs');
  const exports = ['dsDomainShape', 'dsDomainRows', 'dsDomainInflate', 'dsDomainRead', 'dsDomainStatements', 'dsDomainCommit', 'dsDomainView', 'dsDomainRoute', 'applySave', 'actorFromKeys', 'enfAttachGrantsKeys', 'enfSources', 'initDb'];
  fs.writeFileSync(target, source + '\nexport { ' + exports.join(', ') + ' };\n');
  let loaded;
  try { loaded = await import(pathToFileURL(target).href); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
  return loaded;
}
async function world() {
  const W = await sourceWorker(), env = { DB: new D1Shim() };
  await W.initDb(env);
  if (!env.DB.q("SELECT name FROM sqlite_master WHERE name='daily_stats_days'").length)
    env.DB.exec(read('migrations/0004_daily_stats.sql'));
  env.DB.exec('PRAGMA foreign_keys = ON');
  return { W, env, DB: env.DB };
}
const empty = () => ({ haram: {}, nabawi: {}, locks: {} });
const populated = () => ({
  haram: {
    '9999-01-01': { worshippers: 0, umrah: null, carts: 8, __m: { u: 'TEST_ONLY-u', n: 'اختبار', t: 42 }, __f: { carts: 0 } },
    '9999-01-02': { worshippers: 20, hijr_ismail: 3 }
  },
  nabawi: { '9999-01-01': { worshippers: 40, salam_corridor: 12, rawdah_men_actual: 2, rawdah_women_actual: 1 } },
  locks: { 'haram|9999-1': { mo: 1, dopen: { 1: 1 }, dshut: { 2: 1 } }, 'nabawi|9999-2': true }
});
function actor(W, uid = 'super', { enf = false, allowed = true } = {}) {
  const keys = {
    bassam_auth_users_v1: JSON.stringify([{ id: 'super', role: 'super', ekey: 'mgr:root' }, { id: 'staff', role: 'staff', deptId: 'd1', ekey: 'e1' }]),
    bassam_depts_v1: JSON.stringify([{ id: 'd1', gid: 'g1' }]),
    bassam_gdepts_v1: JSON.stringify([{ id: 'g1' }]),
    bassam_perms_v1: JSON.stringify({ emps: { d1: { e1: allowed ? { 'dstats/haram': ['view', 'add', 'edit', 'approve'] } : {} } } }),
    bassam_platform_v1: '{}'
  };
  const A = W.actorFromKeys(keys, uid);
  if (enf) { A.enf = { mode: 'enforce', perm: { applied: false } }; W.enfAttachGrantsKeys(A, {}); }
  return A;
}
async function seed(W, env, data) { const st = W.dsDomainStatements(env, empty(), data); if (st.length) await env.DB.batch(st); }
const domainRows = DB => ({ days: cp(DB.q('SELECT * FROM daily_stats_days ORDER BY site,hijri_date')), months: cp(DB.q('SELECT * FROM daily_stats_month_locks ORDER BY site,hijri_year,hijri_month')), locks: cp(DB.q('SELECT * FROM daily_stats_day_locks ORDER BY site,hijri_year,hijri_month,hijri_day')) });

test('migration replay and a pre-existing empty domain table are safe without changing existing relational records', async () => {
  const DB = new D1Shim();
  DB.exec('CREATE TABLE kv(k TEXT,seq INTEGER,v TEXT); CREATE TABLE meta(k TEXT PRIMARY KEY,v TEXT);');
  const sql = read('migrations/0004_daily_stats.sql');
  const firstTable = sql.slice(sql.indexOf('CREATE TABLE'), sql.indexOf('CREATE TABLE IF NOT EXISTS daily_stats_month_locks'));
  DB.exec(firstTable);
  DB.exec(sql);
  DB.exec("INSERT INTO daily_stats_days(site,hijri_date,field_mask,worshippers) VALUES('haram','9999-01-01',1,44)");
  const before = domainRows(DB);
  DB.exec(sql);
  assert.deepEqual(domainRows(DB), before);
  assert.equal(DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v, '4');
  assert.deepEqual(DB.q('PRAGMA foreign_key_check'), []);
});

test('legacy business documents block schema cutover before DDL or writes; 13006 synthetic accounts and policies stay byte-identical', async () => {
  const DB = new D1Shim();
  DB.exec('CREATE TABLE kv(k TEXT NOT NULL,seq INTEGER NOT NULL,v TEXT NOT NULL,PRIMARY KEY(k,seq)); CREATE TABLE meta(k TEXT PRIMARY KEY,v TEXT); INSERT INTO meta VALUES(\'schema_version\',\'3\');');
  const users = Array.from({ length: 13006 }, (_, i) => ({ id: 'TEST_ONLY-u' + i, un: 'TEST_ONLY-' + i, role: ['super', 'dept', 'staff', 'gm'][i % 4], ph: 'p2$TEST_ONLY$synthetic-' + i, deptId: 'TEST_ONLY-d' + (i % 12), mc: i % 2 }));
  const values = {
    bassam_auth_users_v1: JSON.stringify(users),
    bassam_perms_v1: JSON.stringify({ ceilings: { 'TEST_ONLY-d1': { 'dstats/haram': ['view', 'add', 'edit', 'approve'] } }, TEST_ONLY: 'unchanged' }),
    bassam_platform_v1: JSON.stringify({ policy: { pwMin: 6, staffPin: 6 }, TEST_ONLY: true }),
    [KEY]: JSON.stringify(populated())
  };
  const put = DB.db.prepare('INSERT INTO kv(k,seq,v) VALUES(?,?,?)');
  for (const [key, value] of Object.entries(values)) for (let start = 0, seq = 0; start < value.length; start += 500000, seq++) put.run(key, seq, value.slice(start, start + 500000));
  const digest = () => createHash('sha256').update(JSON.stringify(DB.q('SELECT k,seq,v FROM kv ORDER BY k,seq'))).digest('hex');
  const before = digest();
  assert.throws(() => DB.exec(read('migrations/0004_daily_stats.sql')), /KIVO_DSTATS_OFFLINE_CUTOVER_REQUIRED/);
  assert.equal(digest(), before);
  assert.equal(DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v, '3');
  assert.equal(DB.q("SELECT COUNT(*) AS n FROM sqlite_master WHERE name LIKE 'daily_stats_%'")[0].n, 0);
  const restored = JSON.parse(DB.q('SELECT v FROM kv WHERE k=? ORDER BY seq', 'bassam_auth_users_v1').map(r => r.v).join(''));
  assert.equal(restored.length, 13006); assert.equal(restored.every((u, i) => u.ph === users[i].ph && u.role === users[i].role), true);
  /* Only an explicit operator cutover/removal of the retired business document unlocks
     this clean schema. It never changes identity, permissions, or password policy data. */
  DB.db.prepare('DELETE FROM kv WHERE k=?').run(KEY);
  const remaining = digest(); DB.exec(read('migrations/0004_daily_stats.sql'));
  assert.equal(digest(), remaining);
});

test('relational schema round-trips absent/null/zero metrics, attribution and both kinds of locks', async () => {
  const { W, env, DB } = await world(), data = populated();
  assert.equal(W.dsDomainShape(data), true);
  await seed(W, env, data);
  assert.deepEqual((await W.dsDomainRead(env)).data, data);
  const day = DB.q("SELECT * FROM daily_stats_days WHERE site='haram' AND hijri_date='9999-01-01'")[0];
  assert.equal(day.worshippers, 0); assert.equal(day.umrah, null);
  assert.equal(Object.hasOwn((await W.dsDomainRead(env)).data.haram['9999-01-01'], 'hijr_ismail'), false, 'An omitted metric stays omitted rather than becoming a stored null');
  assert.equal(DB.q('SELECT COUNT(*) AS n FROM daily_stats_days')[0].n, 3);
  assert.equal(DB.q('SELECT COUNT(*) AS n FROM daily_stats_month_locks')[0].n, 2);
  assert.equal(DB.q('SELECT COUNT(*) AS n FROM daily_stats_day_locks')[0].n, 2);
  assert.equal(DB.q('SELECT COUNT(*) AS n FROM kv WHERE k=?1', KEY)[0].n, 0, 'No duplicate business document in KV');
  assert.deepEqual(W.dsDomainStatements(env, data, data), [], 'A no-op produces no data statement');
  const next = cp(data); delete next.haram['9999-01-02']; delete next.locks['haram|9999-1']; next.nabawi['9999-01-01'].worshippers = 90;
  await DB.batch(W.dsDomainStatements(env, data, next));
  assert.deepEqual((await W.dsDomainRead(env)).data, next);
  assert.equal(DB.q("SELECT COUNT(*) AS n FROM daily_stats_day_locks WHERE site='haram'")[0].n, 0, 'Removed month leaves no orphan day locks');
});

test('domain shape rejects unexpected fields, invalid dates, foreign-site metrics and malformed lock days', async () => {
  const { W } = await world();
  const invalid = [null, [], { other: {} }, { haram: [] }, { haram: { '9999-00-01': { worshippers: 1 } } }, { haram: { '9999-01-31': { worshippers: 1 } } }, { haram: { '9999-01-01': { password: 1 } } }, { haram: { '9999-01-01': { salam_corridor: 1 } } }, { nabawi: { '9999-01-01': { worshippers: Infinity } } }, { locks: { 'haram|9999-13': { ap: 1 } } }, { locks: { 'haram|9999-1': { dopen: { 0: 1 } } } }, { haram: { '9999-01-01': { __f: { password: 0 } } } }];
  for (const value of invalid) assert.equal(W.dsDomainShape(value), false, JSON.stringify(value));
});

test('one relational commit acknowledges a real transaction and records revision and audit without KV writes', async () => {
  const { W, env, DB } = await world(), data = populated();
  const result = await W.dsDomainCommit(env, actor(W), { base: 0, data });
  assert.equal(result.status, 200); assert.equal(result.body.ok, 1); assert.ok(result.body.rev > 0);
  assert.deepEqual((await W.dsDomainRead(env)), { data, rev: result.body.rev });
  assert.equal(DB.q('SELECT COUNT(*) AS n FROM aud WHERE k=?1', KEY)[0].n, 1);
  assert.equal(DB.q('SELECT COUNT(*) AS n FROM kv WHERE k=?1', KEY)[0].n, 0);
  const old = await W.dsDomainCommit(env, actor(W), { base: 0, data: { ...data, nabawi: {} } });
  assert.equal(old.status, 409); assert.equal(old.body.err, 'conflict'); assert.deepEqual(old.body.data, data);
  assert.deepEqual((await W.dsDomainRead(env)).data, data, 'A stale snapshot never overwrites newer rows');
});

test('a failure late in the normalized write rolls back days, month locks, day locks, revision and audit together', async () => {
  const { W, env, DB } = await world();
  const before = domainRows(DB);
  DB.failIf = sql => /^INSERT INTO daily_stats_day_locks/.test(sql);
  await assert.rejects(W.dsDomainCommit(env, actor(W), { base: 0, data: populated() }), /injected failure/);
  DB.failIf = null;
  assert.deepEqual(domainRows(DB), before);
  assert.equal((await W.dsDomainRead(env)).rev, 0);
  assert.equal(DB.q('SELECT COUNT(*) AS n FROM aud WHERE k=?1', KEY)[0].n, 0);
});

test('simultaneous writers using one domain revision have one winner and one explicit conflict', async () => {
  const { W, env } = await world();
  const first = { ...empty(), haram: { '9999-01-01': { worshippers: 11 } } };
  const second = { ...empty(), haram: { '9999-01-01': { worshippers: 22 } } };
  const results = await Promise.all([W.dsDomainCommit(env, actor(W), { base: 0, data: first }), W.dsDomainCommit(env, actor(W), { base: 0, data: second })]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  const winner = results.find(r => r.status === 200);
  assert.deepEqual((await W.dsDomainRead(env)).data, winner.body.data);
});

test('retired KV writes fail before any item in a mixed save or restore can be written', async () => {
  const { W, env, DB } = await world();
  const before = cp(DB.q('SELECT k,seq,v FROM kv ORDER BY k,seq'));
  const r = await W.applySave(env, { set: { [KEY]: JSON.stringify(populated()), bassam_platform_v1: '{"TEST_ONLY":"must-not-write"}' }, del: [], base: {} }, actor(W));
  assert.equal(r.atomic, 'domain-moved'); assert.equal(r.denied[KEY].why, 'domain-moved');
  assert.deepEqual(cp(DB.q('SELECT k,seq,v FROM kv ORDER BY k,seq')), before);
  assert.deepEqual((await W.dsDomainRead(env)).data, empty());
  const d = await W.applySave(env, { set: {}, del: [KEY], base: {} }, actor(W));
  assert.equal(d.atomic, 'domain-moved'); assert.deepEqual((await W.dsDomainRead(env)).data, empty());
});

test('unchanged account permissions deny an ungranted actor before any relational mutation', async () => {
  const { W, env, DB } = await world();
  const r = await W.dsDomainCommit(env, actor(W, 'staff', { allowed: false }), { base: 0, data: populated() });
  assert.equal(r.status, 403); assert.equal(r.body.why, 'view');
  assert.deepEqual(domainRows(DB), { days: [], months: [], locks: [] });
  assert.equal(DB.q("SELECT COUNT(*) AS n FROM sec WHERE target=?1 AND act='denied'", KEY)[0].n, 1);
});

test('enforced Source scope hides another mosque and rejects forged hidden data without deleting it', async () => {
  const { W, env, DB } = await world(), data = populated(); await seed(W, env, data);
  const A = actor(W, 'staff', { enf: true });
  assert.deepEqual(W.enfSources(A, 'read'), { haram: true, nabawi: false });
  const view = await W.dsDomainView(env, A, data, { recs: {} });
  assert.equal(view.nabawi, undefined); assert.equal(view.locks['nabawi|9999-2'], undefined);
  const forged = cp(view); forged.nabawi = { '9999-01-01': { worshippers: 0 } };
  const r = await W.dsDomainCommit(env, actor(W, 'staff', { enf: true }), { base: 0, data: forged });
  assert.equal(r.status, 403); assert.equal(r.body.why, 'scope');
  assert.deepEqual((await W.dsDomainRead(env)).data, data);
  assert.equal(DB.q('SELECT COUNT(*) AS n FROM aud WHERE k=?1', KEY)[0].n, 0);
  assert.equal(DB.q("SELECT COUNT(*) AS n FROM authz WHERE k=?1 AND decision='deny' AND path='/api/dstats'", KEY)[0].n, 1, 'Permission denials keep the existing enforcement audit contract');
  assert.equal(DB.q("SELECT COUNT(*) AS n FROM sec WHERE target=?1 AND act='denied'", KEY)[0].n, 1);
});

test('historical import remains a super-only operation with an explicit reason', async () => {
  const { W, env } = await world();
  const missing = await W.dsDomainCommit(env, actor(W), { base: 0, data: populated(), operation: 'historical-import', reason: '' });
  assert.equal(missing.status, 403); assert.equal(missing.body.why, 'reason');
  const denied = await W.dsDomainCommit(env, actor(W, 'staff'), { base: 0, data: populated(), operation: 'historical-import', reason: 'TEST_ONLY import' });
  assert.equal(denied.status, 403); assert.equal(denied.body.why, 'super');
  const ok = await W.dsDomainCommit(env, actor(W), { base: 0, data: populated(), operation: 'historical-import', reason: 'TEST_ONLY migration validation' });
  assert.equal(ok.status, 200); assert.equal(ok.body.ok, 1);
});

test('the original enforced DateRange and day-lock guards apply to the new tables', async () => {
  const { W, env } = await world();
  const past = { ...empty(), haram: { '1440-01-01': { worshippers: 5 } } };
  for (const uid of ['super', 'staff']) {
    const r = await W.dsDomainCommit(env, actor(W, uid, { enf: true }), { base: 0, data: past });
    assert.equal(r.status, 403, uid + ' must still respect the closed period');
    assert.deepEqual((await W.dsDomainRead(env)).data, empty());
  }
  const locked = { ...empty(), haram: { '1500-01-01': { worshippers: 5 } }, locks: { 'haram|1500-1': { dshut: { 1: 1 } } } };
  await seed(W, env, locked);
  const next = cp(locked); next.haram['1500-01-01'].worshippers = 6;
  const r = await W.dsDomainCommit(env, actor(W, 'staff'), { base: 0, data: next });
  assert.equal(r.status, 403); assert.equal(r.body.why, 'dslock');
  assert.deepEqual((await W.dsDomainRead(env)).data, locked);
});

test('HTTP domain access keeps session/CSRF guards while retired KV reads and bootstrap cannot leak stale copies', async () => {
  const { W, env, DB } = await world(), now = Date.now();
  env.ASSETS = { fetch: async () => new Response('<html><head><!--BS_BOOT--></head><body>TEST_ONLY</body></html>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } }) };
  const users = JSON.stringify([{ id: 'super', role: 'super', ekey: 'mgr:root' }, { id: 'staff', role: 'staff', deptId: 'd1', ekey: 'e1' }]);
  DB.db.prepare('INSERT INTO kv(k,seq,v) VALUES (?,0,?)').run('bassam_auth_users_v1', users);
  DB.db.prepare('INSERT INTO sess(tok,uid,ts,la,dev) VALUES (?,?,?,?,?)').run('TEST_ONLY-super-token', 'super', now, now, '');
  DB.db.prepare('INSERT INTO sess(tok,uid,ts,la,dev) VALUES (?,?,?,?,?)').run('TEST_ONLY-staff-token', 'staff', now, now, '');
  await seed(W, env, populated());
  const req = async (url, { token = 'TEST_ONLY-super-token', method = 'GET', body, cross = false } = {}) => W.default.fetch(new Request('http://test.invalid' + url, { method, headers: { cookie: 'bs_tok=' + token, ...(method !== 'GET' ? { Origin: cross ? 'http://foreign.invalid' : 'http://test.invalid', 'Content-Type': 'application/json' } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), env);
  const initial = await req('/api/dstats?uid=super'); assert.equal(initial.status, 200); assert.deepEqual((await initial.json()).data, populated());
  DB.db.prepare('INSERT INTO kv(k,seq,v) VALUES (?,0,?)').run(KEY, '{"TEST_ONLY-stale-copy":"must-not-leak"}');
  const blocked = await req('/api/dstats?uid=super'); assert.equal(blocked.status,503); assert.equal((await blocked.json()).err,'dstats-legacy-source-present');
  assert.deepEqual((await W.dsDomainRead(env)).data, populated(), 'A reappeared legacy source cannot silently replace typed rows');
  const retired = await req('/api/get?keys=' + KEY); assert.equal(retired.status, 200);
  assert.deepEqual((await retired.json()).keys[KEY], { v: null, rev: 0, moved: '/api/dstats' });
  const bootRes = await req('/'), html = await bootRes.text();
  const match = /window\.__BS_BOOT=(\{[\s\S]*?\});<\/script>/.exec(html); assert.ok(match, html.slice(0, 200));
  assert.equal(JSON.parse(match[1]).keys[KEY], undefined); assert.ok(!html.includes('must-not-leak'));
  DB.db.prepare('DELETE FROM kv WHERE k=?').run(KEY); // Explicit fixture repair, never a production fallback.
  const ok = await req('/api/dstats?uid=super'); assert.equal(ok.status, 200); assert.deepEqual((await ok.json()).data, populated());
  assert.equal((await req('/api/dstats', { token: 'TEST_ONLY-staff-token' })).status, 403);
  assert.equal((await req('/api/dstats', { token: '' })).status, 401);
  assert.equal((await req('/api/dstats?uid=another')).status, 409);
  assert.equal((await req('/api/dstats', { method: 'PUT', body: {} })).status, 405);
  assert.equal((await req('/api/dstats', { method: 'POST', body: { uid: 'another', base: 0, data: empty() } })).status, 409);
  const nullBody = await req('/api/dstats', { method: 'POST', body: null });
  assert.equal(nullBody.status, 400); assert.equal((await nullBody.json()).err, 'bad-body');
  assert.equal((await req('/api/dstats', { method: 'POST', body: { uid: 'super', base: 0, data: empty() }, cross: true })).status, 403);
  assert.deepEqual((await W.dsDomainRead(env)).data, populated(), 'Rejected HTTP calls never modify typed rows');
});

const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
function browser(transport, incoming = { srv: 1, cf: 1, uid: 'TEST_ONLY-owner' }) {
  const calls = [], persistence = [];
  const W = { KIVO: {}, __BS_BOOT: incoming && cp(incoming), console, Response, Request, URL, TextEncoder, TextDecoder };
  W.window = W;
  W.localStorage = { getItem(k) { persistence.push(['get', k]); throw new Error('No business browser storage'); }, setItem(k) { persistence.push(['set', k]); throw new Error('No business browser storage'); } };
  W.fetch = async (url, options = {}) => { calls.push({ url, ...options }); return transport(url, options); };
  const context = vm.createContext(W);
  vm.runInContext(read('src/services/580-historical-import.js'), context);
  return { W, context, D: W.KIVO.DailyStats, calls, persistence };
}

test('client reads a cloned in-memory snapshot and waits for a complete server acknowledgement', async () => {
  let settle;
  const { W, D, calls, persistence } = browser(async (url, options) => options.method === 'POST' ? await new Promise(resolve => { settle = resolve; }) : response({ ok: 1, rev: 4, data: empty() }));
  assert.equal(D.ready(), false);
  assert.equal(await D.save(populated()), false); assert.equal(D.error(), 'not-ready'); assert.equal(calls.length, 0);
  await D.refresh(); assert.equal(D.ready(), true); assert.equal(D.revision(), 4);
  const copy = D.read(); assert.equal(copy.__dsbase, 4); copy.haram['9999-01-01'] = { worshippers: 80 };
  assert.deepEqual(cp(D.read()), empty(), 'Editing a render snapshot never mutates the acknowledged cache');
  W.__BS_BOOT.uid = 'TEST_ONLY-another-tab-account';
  const pending = D.save(copy);
  assert.deepEqual(cp(D.read()), empty(), 'No optimistic success before the transaction acknowledgement');
  const sent = JSON.parse(calls.at(-1).body);
  assert.equal(sent.uid, 'TEST_ONLY-owner', 'The page owner is captured once'); assert.equal(sent.base, 4);
  assert.equal(Object.hasOwn(sent.data, '__dsbase'), false, 'The concurrency tag is transport metadata, not a business field');
  settle(response({ ok: 1, rev: 5, data: cp(copy) }));
  assert.equal(await pending, true); assert.equal(D.revision(), 5); assert.deepEqual(cp(D.read()), cp(copy));
  assert.deepEqual(persistence, [], 'Neither reading nor writing consults persistent browser business JSON');
});

test('network failure, denial and malformed success leave the cache and caller draft unacknowledged', async () => {
  const invalid = [
    ['network', () => { throw new TypeError('TEST_ONLY disconnected'); }],
    ['denied', () => response({ ok: 0, err: 'denied' }, 403)],
    ['empty ack', () => response({})],
    ['non-numeric revision', () => response({ ok: 1, rev: '8', data: populated() })],
    ['truthy ok', () => response({ ok: true, rev: 8, data: populated() })],
    ['array data', () => response({ ok: 1, rev: 8, data: [] })],
    ['truncated JSON', () => new Response('{"ok":1,"rev":8,')]
  ];
  for (const [name, bad] of invalid) {
    const { D, persistence } = browser(async (url, options) => options.method === 'POST' ? bad() : response({ ok: 1, rev: 7, data: empty() }));
    await D.refresh(); const draft = D.read(); draft.haram['9999-01-01'] = { worshippers: 30 };
    assert.equal(await D.save(draft), false, name);
    assert.deepEqual(cp(D.read()), empty(), name + ': cache remains acknowledged state');
    assert.equal(D.revision(), 7, name); assert.equal(draft.haram['9999-01-01'].worshippers, 30, name + ': draft retained');
    assert.deepEqual(persistence, [], name + ': no local persistence');
  }
});

test('client conflict preserves the draft and cache until an explicit refresh invalidates the old base', async () => {
  let reads = 0;
  const latest = populated();
  const { D, calls } = browser(async (url, options) => options.method === 'POST' ? response({ ok: 0, err: 'conflict', rev: 10, data: latest }, 409) : response({ ok: 1, rev: ++reads === 1 ? 9 : 10, data: reads === 1 ? empty() : latest }));
  await D.refresh(); const draft = D.read(); draft.haram['9999-01-01'] = { worshippers: 100 };
  assert.equal(await D.save(draft), false); assert.equal(D.error(), 'conflict'); assert.equal(D.revision(), 9);
  assert.deepEqual(cp(D.read()), empty(), 'The rejected snapshot is not silently rebased');
  await D.refresh(); assert.equal(D.revision(), 10); assert.deepEqual(cp(D.read()), latest);
  const before = calls.length;
  assert.equal(await D.save(draft), false); assert.equal(D.error(), 'stale'); assert.equal(calls.length, before, 'An old draft cannot overwrite a refreshed snapshot');
});

test('a success-shaped response with an older revision cannot acknowledge or discard a new draft', async () => {
  const { D, persistence } = browser(async (url, options) => options.method === 'POST' ? response({ ok: 1, rev: 6, data: populated() }) : response({ ok: 1, rev: 7, data: empty() }));
  await D.refresh(); const draft = D.read(); draft.haram['9999-01-01'] = { worshippers: 75 };
  assert.equal(await D.save(draft), false, 'A server revision preceding the request base is not a valid acknowledgement');
  assert.equal(D.revision(), 7); assert.deepEqual(cp(D.read()), empty()); assert.equal(draft.haram['9999-01-01'].worshippers, 75); assert.deepEqual(persistence, []);
});

test('client rejects concurrent saves and ignores refreshes older than the acknowledged mutation', async () => {
  let write, delayedRead, reads = 0;
  const { D } = browser(async (url, options) => {
    if (options.method === 'POST') return await new Promise(resolve => { write = resolve; });
    if (++reads === 1) return response({ ok: 1, rev: 1, data: empty() });
    return await new Promise(resolve => { delayedRead = resolve; });
  });
  await D.refresh(); const draft = D.read(); draft.haram['9999-01-01'] = { worshippers: 15 };
  const saving = D.save(draft); const refreshing = D.refresh();
  assert.equal(await D.save(draft), false); assert.equal(D.error(), 'busy');
  write(response({ ok: 1, rev: 2, data: cp(draft) })); assert.equal(await saving, true);
  delayedRead(response({ ok: 1, rev: 1, data: empty() })); await refreshing;
  assert.equal(D.revision(), 2); assert.deepEqual(cp(D.read()), cp(draft), 'A late old GET cannot erase an acknowledged mutation');
});

test('session failures keep the captured identity and unconfirmed draft out of browser persistence', async () => {
  for (const status of [401, 409]) {
    const { D, calls, persistence } = browser(async (url, options) => options.method === 'POST' ? response({ ok: 0, err: status === 401 ? 'session' : 'session-changed' }, status) : response({ ok: 1, rev: 2, data: empty() }));
    await D.refresh(); const draft = D.read(); draft.haram['9999-01-01'] = { worshippers: 5 };
    assert.equal(await D.save(draft), false); assert.equal(D.error(), status === 401 ? 'session' : 'session-changed');
    assert.equal(JSON.parse(calls.at(-1).body).uid, 'TEST_ONLY-owner'); assert.deepEqual(cp(D.read()), empty()); assert.deepEqual(persistence, []);
  }
  const noBoot = browser(async () => { throw new Error('No request expected'); }, null);
  assert.equal(await noBoot.D.save(populated()), false); await assert.rejects(noBoot.D.refresh()); assert.equal(noBoot.calls.length, 0);
});

function dailyPage(B) {
  B.W.KIVO.BassamPageKit = { base: () => class {} }; B.W.DCLogic = class {};
  const C = vm.runInContext(read('src/modules/dstats/logic.js') + '\nComponent;', B.context);
  const page = new C(), toasts = [];
  page.state = { ...page.state, site: 'haram', year: 9999, month: 1, day: 1, draft: { worshippers: '99' } };
  page.MONTHS = ['اختبار']; page.PC = () => true; page._dayLockMsg = () => '';
  page.setState = next => { page.state = { ...page.state, ...(typeof next === 'function' ? next(page.state) : next) }; };
  page.bsToast = (message, kind) => toasts.push({ message, kind });
  return { page, toasts };
}

test('daily entry retains its visible draft and never reports success before or after a rejected save', async () => {
  let settle;
  const B = browser(async (url, options) => options.method === 'POST' ? await new Promise(resolve => { settle = resolve; }) : response({ ok: 1, rev: 3, data: empty() }));
  await B.D.refresh(); const { page, toasts } = dailyPage(B), original = page.state.draft;
  const saving = page.saveDay();
  assert.equal(page.state.draft, original); assert.equal(toasts.filter(t => t.kind === 'ok').length, 0);
  settle(response({ ok: 0, err: 'denied' }, 403)); await saving;
  assert.equal(page.state.draft, original); assert.equal(toasts.filter(t => t.kind === 'ok').length, 0); assert.ok(toasts.some(t => t.kind === 'err'));
});

test('daily entry clears its exact submitted draft only after a confirmed server transaction', async () => {
  let settle, sent;
  const B = browser(async (url, options) => { if (options.method === 'POST') { sent = JSON.parse(options.body); return await new Promise(resolve => { settle = resolve; }); } return response({ ok: 1, rev: 3, data: empty() }); });
  await B.D.refresh(); const { page, toasts } = dailyPage(B);
  const saving = page.saveDay(); assert.ok(page.state.draft);
  settle(response({ ok: 1, rev: 4, data: sent.data })); await saving;
  assert.equal(page.state.draft, null); assert.equal(toasts.filter(t => t.kind === 'ok').length, 1); assert.equal(B.D.read().haram['9999-01-01'].worshippers, 99);
});

const parsed = new Map();
function astPart(file, predicate) {
  let cached = parsed.get(file);
  if (!cached) { const text = read(file); cached = { text, ast: parse(text, { ecmaVersion: 'latest', sourceType: 'script' }) }; parsed.set(file, cached); }
  let found;
  const walk = node => {
    if (!node || typeof node !== 'object' || found) return;
    if (predicate(node)) { found = node; return; }
    for (const value of Object.values(node)) { if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value === 'object') walk(value); }
  };
  walk(cached.ast); assert.ok(found, 'Requested source function exists in ' + file);
  return { text: cached.text.slice(found.start, found.end), node: found, source: cached.text };
}
function adminMethod(B, name) {
  const part = astPart('src/modules/admin/logic.js', n => n.type === 'MethodDefinition' && n.key.name === name);
  return vm.runInContext('({' + part.text + '}).' + name, B.context);
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test('historical workbook parsing uses a fresh API snapshot and its revision without browser business data', async () => {
  const old = { ...empty(), haram: { '1448-01-01': { worshippers: 1, umrah: 9 } } };
  const B = browser(async () => response({ ok: 1, rev: 7, data: old }));
  B.W.KIVO.BassamXLSX = { parseBook: async () => ({ sheets: ['TEST_ONLY'], active: 'TEST_ONLY', rows: [['التاريخ', 'الحرم - المصلين', 'النبوي - المصلين'], ['1448-01-01', { k: 'i', n: 50, s: '50' }, { k: 'i', n: 60, s: '60' }]] }) };
  const meta = { filename: 'TEST_ONLY.xlsx', size_bytes: 0, content_type: 'test' };
  const preview = await B.W.KIVO.BassamHistImport.preview(new ArrayBuffer(0), meta);
  assert.equal(preview.total_rows, 1); assert.equal(preview.existing_records, 1); assert.equal(preview.new_records, 1);
  const result = await B.W.KIVO.BassamHistImport.execute(new ArrayBuffer(0), 'update', 'ignore', meta);
  assert.equal(result.store.__dsbase, 7); assert.equal(result.store.haram['1448-01-01'].worshippers, 50); assert.equal(result.store.haram['1448-01-01'].umrah, 9); assert.equal(result.store.nabawi['1448-01-01'].worshippers, 60);
  assert.equal(B.calls.length, 2); assert.ok(B.calls.every(c => !c.method), 'Preview and execution each refresh before computing their import');
  assert.deepEqual(B.persistence, []); assert.deepEqual(cp(B.D.read()), old, 'Parsing alone does not acknowledge business writes');
});

test('admin historical import retains its result until the relational server confirms it', async () => {
  for (const approved of [false, true]) {
    let settle, sent;
    const B = browser(async (url, options) => { if (options.method === 'POST') { sent = JSON.parse(options.body); return await new Promise(resolve => { settle = resolve; }); } return response({ ok: 1, rev: 7, data: empty() }); });
    B.W.KIVO.__BS_SRV = { askReason: (key, keys, done) => done('TEST_ONLY historical import') };
    B.W.KIVO.BassamXLSX = { parseBook: async () => ({ sheets: ['TEST_ONLY'], active: 'TEST_ONLY', rows: [['التاريخ', 'الحرم - المصلين'], ['1448-01-01', { k: 'i', n: 50, s: '50' }]] }) };
    const H = { preview: { total_rows: 1 }, file: { arrayBuffer: async () => new ArrayBuffer(0) }, mode: 'add', blank: 'ignore' }, toasts = [];
    const page = { hiS: () => H, hiSet: x => Object.assign(H, x), hiMeta: () => ({ filename: 'TEST_ONLY.xlsx', size_bytes: 0, content_type: 'test' }), bsToast: (message, kind) => toasts.push({ message, kind }) };
    const running = adminMethod(B, 'hiDoImport').call(page); await tick();
    assert.equal(H.importing, true); assert.equal(H.result, undefined); assert.equal(toasts.filter(t => t.kind === 'ok').length, 0);
    assert.equal(sent.operation, 'historical-import'); assert.equal(sent.reason, 'TEST_ONLY historical import'); assert.equal(sent.base, 7);
    settle(approved ? response({ ok: 1, rev: 8, data: sent.data }) : response({ ok: 0, err: 'denied' }, 403)); await running;
    assert.equal(H.importing, false); assert.equal(!!H.result, approved); assert.equal(toasts.filter(t => t.kind === 'ok').length, approved ? 1 : 0);
    assert.deepEqual(B.persistence, []);
  }
});

test('full restore entry points use the shared atomic API for relational daily stats and reject retired-key mixtures without partial writes', async () => {
  for (const entry of ['admin', 'gate']) {
    const B = await backupWorld(); await seedTypedDomains(B, populated());
    const C = await backupBrowser(B), file = await exportFull(C), messages = [];
    const run = async payload => {
      if (entry === 'admin') { C.page._fbkPend = { file: payload, ticket: null }; await C.method('src/modules/admin/logic.js', 'fbkCommit').call(C.page, 'replace'); }
      else await C.func('src/auth/335-identity-gate.js', 'doRestore')(payload, message => messages.push(message), { setAttribute() {} });
    };
    await run(backupCopy(file));
    assert.equal(B.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n, 1);
    assert.deepEqual((await B.W.dsDomainRead(B.env)).data, populated());
    assert.equal(C.requests.filter(r => r.method === 'POST' && JSON.parse(r.body).phase === 'commit').length, 1);
    const invalid = backupCopy(file); invalid.data[KEY] = '{}'; invalid.manifest.keys.push(KEY);
    invalid.data.bassam_platform_v1 = '{"TEST_ONLY":"must not partially commit"}';
    const before = backupSnapshot(B.DB), requests = C.requests.length;
    await run(invalid);
    assert.deepEqual(backupSnapshot(B.DB), before); assert.deepEqual(C.writes, []);
    assert.equal(C.requests.slice(requests).some(r => r.method === 'POST' && JSON.parse(r.body).phase === 'commit'), false, 'Invalid mixed file is refused during inspection');
  }
  // SQL failure, rather than a mocked success/error response, proves the shared
  // writer rolls back daily rows, NF, custody, revisions and the whole backup.
  const B = await backupWorld(); await seedTypedDomains(B, populated());
  const C = await backupBrowser(B), file = await exportFull(C), before = backupSnapshot(B.DB);
  file.domains.dailyStats.data.haram['9999-01-01'].worshippers = 55;
  file.domains.notifications.messages[0].title = 'TEST_ONLY SQL rollback target';
  C.page._fbkPend = { file, ticket: null }; B.DB.failIf = sql => /INSERT .*INTO notification_messages/.test(sql);
  await C.method('src/modules/admin/logic.js', 'fbkCommit').call(C.page, 'replace'); B.DB.failIf = null;
  assert.deepEqual(backupSnapshot(B.DB), before); assert.ok(C.page._fbkPend); assert.equal(B.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n, 0); assert.deepEqual(C.writes, []);
});

test('full backup waits for actual relational reads, includes every typed domain and fails on network loss', async () => {
  for (const connected of [true, false]) {
    const B = await backupWorld(); await seedTypedDomains(B, populated());
    const C = await backupBrowser(B), actualRead = C.KIVO.DailyStats.refresh; let settle;
    C.KIVO.DailyStats.refresh = async () => await new Promise((resolve, reject) => { settle = async () => { if (!connected) reject(new TypeError('TEST_ONLY network outage')); else resolve(await actualRead()); }; });
    C.property('src/modules/admin/logic.js', 'exportBackup')(); await backupUntil(() => !!settle);
    assert.equal(C.page._encPend, null); assert.equal(C.states.some(state => state.pwDlg), false);
    await settle(); await backupUntil(() => !!C.page._encPend || C.states.some(state => state.backupMsg));
    if (connected) {
      const file = JSON.parse(C.page._encPend.json);
      assert.equal(file.data[KEY], undefined); assert.equal(file.domains.dailyStats.version, 1);
      assert.equal(file.domains.dailyStats.rev, (await B.W.dsDomainRead(B.env)).rev); assert.deepEqual(file.domains.dailyStats.data, populated());
      assert.deepEqual(file.manifest.domains, { kv: 1, dailyStats: 1, notifications: 1, custody: 1 });
      assert.ok(file.domains.notifications.messages.length); assert.equal(file.domains.custody.find(d => d.scope.departmentId === file.manifest.departments[0]).rows.items.length, 1);
      assert.ok(C.states.some(state => state.pwDlg?.mode === 'exp'));
    } else { assert.equal(C.page._encPend, null); assert.ok(C.states.at(-1).backupMsg); assert.equal(C.states.some(state => state.pwDlg), false); }
    assert.ok(!C.reads.includes(KEY)); assert.deepEqual(C.writes, []);
  }
});

test('a new failed full-backup attempt invalidates an earlier encryption payload before reading the server', async () => {
  const B = await backupWorld(), C = await backupBrowser(B); let rejectRead;
  C.KIVO.DailyStats.refresh = async () => await new Promise((resolve, reject) => { rejectRead = reject; });
  C.page._encPend = { json: '{"TEST_ONLY":"obsolete backup"}' };
  C.property('src/modules/admin/logic.js', 'exportBackup')();
  assert.equal(C.page._encPend, null, 'A new attempt discards the old encryption payload synchronously');
  await backupUntil(() => !!rejectRead); rejectRead(new TypeError('TEST_ONLY network outage')); await backupUntil(() => C.states.some(state => state.backupMsg));
  assert.equal(C.page._encPend, null); assert.ok(C.states.at(-1).backupMsg);
  assert.equal(C.states.some(state => state.pwDlg), false); assert.deepEqual(C.writes, []);
});
