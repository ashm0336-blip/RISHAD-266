/* Startup cutover proofs use synthetic legacy data, preserving account/policy bytes. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { D1Shim, ROOT, allowTestSchemaUpgrade } from './harness.mjs';
import { world, canonicalWorker, D1, D2, IDS, EKEYS, identitySnapshot, copy } from './notifications_review_fx.mjs';

async function legacyWorld({ ambiguous = false } = {}) {
  const fixture = await world(), W = await canonicalWorker(), DB = new D1Shim(), env = { DB };
  DB.exec('PRAGMA foreign_keys = ON');
  DB.exec('CREATE TABLE d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE,applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)');
  const files = fs.readdirSync(path.join(ROOT, 'migrations')).filter(file => /^000[1-4]_.+\.sql$/.test(file)).sort();
  for (const file of files) { DB.exec(fs.readFileSync(path.join(ROOT, 'migrations', file), 'utf8')); await DB.prepare('INSERT INTO d1_migrations(name) VALUES(?1)').bind(file.slice(0, -4)).run(); }
  const now = Date.now() - 1000, first = ambiguous ? 'TEST_ONLY_same_id' : 'TEST_ONLY_old_one', second = ambiguous ? first : 'TEST_ONLY_old_two';
  const message = (id, dept, own, author) => ({ id, type: 'task_new', k: 'task', lvl: 'urg', chan: 'toast', t: 'TEST_ONLY legacy title', b: 'TEST_ONLY legacy body', at: now, by: author, byName: 'TEST_ONLY author', to: { e: [own], r: [] }, go: 'افتح المهمة', dept, link: 'TEST_ONLY link', exp: now + 86400000, ack: true, pin: true, srv: 1 });
  const old = {
    ['bsdept:' + D1 + ':bassam_notif_v1']: { v: 1, items: [message(first, D1, EKEYS.employee1, EKEYS.manager1)], read: { [EKEYS.employee1]: { [first]: now, 'bc:TEST_ONLY_bc': now } }, ack: { [EKEYS.employee1]: { 'bc:TEST_ONLY_bc': now } }, del: {}, seen: { TEST_ONLY_once: now } },
    ['bsdept:' + D2 + ':bassam_notif_v1']: { v: 1, items: [message(second, D2, EKEYS.employee2, EKEYS.manager2)], read: { [EKEYS.employee2]: { [second]: now } }, ack: {}, del: {}, seen: { TEST_ONLY_once: now } },
    bassam_notif_sys_v1: { v: 1, items: [], read: { [IDS.super]: { [first]: now, [second]: now } }, ack: {}, del: {}, seen: { __sec: now } },
    bassam_notif_cfg_v1: { v: 1, t: { task_new: { on: false, to: ['own'], lvl: 'urg', chan: 'bell', txt: 'TEST_ONLY override' } } },
    bassam_bc_v1: { v: 1, items: [{ id: 'TEST_ONLY_bc', title: 'TEST_ONLY broadcast', body: 'TEST_ONLY broadcast body', lvl: 'act', link: 'TEST_ONLY', ack: true, pin: true, rem: true, at: now, exp: now + 86400000, target: { mode: 'dept', sel: [D1] }, by: 'TEST_ONLY super', n: 9, sched: false }] }
  };
  const keys = { ...fixture.keys, ...old }, statements = [];
  for (const [key, value] of Object.entries(keys)) { statements.push(...W.kvPutStmts(env, 'kv', key, JSON.stringify(value))); statements.push(DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,1)').bind(key)); }
  statements.push(DB.prepare("INSERT INTO meta(k,v) VALUES('rev','1'),('policy',?1)").bind('{"pwMin":6,"lockN":7,"sessH":10}'));
  await DB.batch(statements);
  allowTestSchemaUpgrade(DB);
  return { W, DB, env, old, now, first, second };
}
const schema = DB => copy(DB.q("SELECT type,name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name"));
const kv = DB => copy(DB.q('SELECT k,seq,v FROM kv ORDER BY k,seq'));
const migrations = DB => copy(DB.q('SELECT name FROM d1_migrations ORDER BY id'));

test('startup migration cuts legacy notifications over atomically while preserving identities, permissions and password policy', async () => {
  const { W, DB, env, old, now, first, second } = await legacyWorld();
  const identities = identitySnapshot(DB), policy = DB.q("SELECT v FROM meta WHERE k='policy'")[0].v;
  await W.initDb(env);
  assert.deepEqual(identitySnapshot(DB), identities); assert.equal(DB.q("SELECT v FROM meta WHERE k='policy'")[0].v, policy);
  assert.equal(DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v, String(W.KIVO_SCHEMA_VERSION));
  assert.deepEqual(migrations(DB).map(r=>r.name),W.KIVO_MIGRATIONS.map(m=>m.name),'All canonical migrations complete after notification cutover');
  assert.equal(DB.q("SELECT v FROM meta WHERE k='restore_epoch'")[0].v,'0','Schema7 initializes the reset/restore fence');
  assert.equal(DB.q("SELECT COUNT(*) n FROM meta WHERE k='nf_cutover_ready'")[0].n, 0);
  for (const key of Object.keys(old)) assert.equal(DB.q('SELECT COUNT(*) n FROM kv WHERE k=?1', key)[0].n, 0, key + ': the retired document disappears only after validated insertion');
  const messages = DB.q('SELECT * FROM notification_messages ORDER BY scope,id'); assert.equal(messages.length, 3);
  const one = messages.find(row => row.scope === 'd:' + D1 && row.id === first);
  assert.equal(one.title, 'TEST_ONLY legacy title'); assert.equal(one.body, 'TEST_ONLY legacy body'); assert.equal(one.author_key, EKEYS.manager1);
  assert.equal(one.created_at, now); assert.equal(one.requires_ack, 1); assert.equal(one.pinned, 1); assert.equal(one.server_origin, 1); assert.equal(one.expires_at, now + 86400000);
  assert.equal(DB.q('SELECT COUNT(*) n FROM notification_dedup WHERE once_key=?1', 'TEST_ONLY_once')[0].n, 2, 'The same once key in separate departments remains separate');
  const states = DB.q('SELECT * FROM notification_user_state');
  assert.ok(states.some(row => row.account_uid === IDS.super && row.message_scope === 'd:' + D1 && row.message_id === first && row.read_at === now));
  assert.ok(states.some(row => row.account_uid === IDS.super && row.message_scope === 'd:' + D2 && row.message_id === second && row.read_at === now), 'SYS user state keeps its references to department messages');
  const bc = states.find(row => row.account_uid === IDS.employee1 && row.message_scope === 'bc'); assert.equal(bc.read_at, now); assert.equal(bc.acknowledged_at, now);
  const cfg = DB.q('SELECT * FROM notification_type_overrides WHERE type_id=?1', 'task_new')[0]; assert.equal(cfg.enabled, 0); assert.equal(cfg.priority, 'urg'); assert.equal(cfg.target_own, 1);
});

test('ambiguous legacy SYS message ids fail before DDL, deletion or an identity rewrite', async () => {
  const { W, DB, env } = await legacyWorld({ ambiguous: true });
  const before = { schema: schema(DB), keys: kv(DB), migrations: migrations(DB), identities: identitySnapshot(DB) };
  await assert.rejects(W.initDb(env), /notification-cutover-message-ambiguous/);
  assert.deepEqual(schema(DB), before.schema); assert.deepEqual(kv(DB), before.keys); assert.deepEqual(migrations(DB), before.migrations); assert.deepEqual(identitySnapshot(DB), before.identities);
  assert.equal(DB.q("SELECT COUNT(*) n FROM meta WHERE k='nf_cutover_ready'")[0].n, 0);
});

test('a late startup backfill failure rolls back DDL, rows, source deletion and the migration marker together', async () => {
  const { W, DB, env } = await legacyWorld(); const before = { schema: schema(DB), keys: kv(DB), migrations: migrations(DB), identities: identitySnapshot(DB) };
  DB.failIf = sql => /^INSERT(?: OR (?:IGNORE|REPLACE))? INTO notification_targets\b/.test(sql);
  await assert.rejects(W.initDb(env), /injected failure/); DB.failIf = null;
  assert.deepEqual(schema(DB), before.schema); assert.deepEqual(kv(DB), before.keys); assert.deepEqual(migrations(DB), before.migrations); assert.deepEqual(identitySnapshot(DB), before.identities);
  assert.equal(DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v, '4');
  assert.equal(DB.q("SELECT COUNT(*) n FROM meta WHERE k='nf_cutover_ready'")[0].n, 0);
  await W.initDb(env); assert.equal(DB.q('SELECT COUNT(*) n FROM notification_messages')[0].n, 3);
});

test('a legacy notification document with no department scope fails before migration DDL or source deletion', async () => {
  const { W, DB, env } = await legacyWorld();
  await DB.batch(W.kvPutStmts(env, 'kv', 'bassam_notif_v1', JSON.stringify({ v: 1, items: [] })));
  const before = { schema: schema(DB), keys: kv(DB), migrations: migrations(DB), identities: identitySnapshot(DB) };
  await assert.rejects(W.initDb(env), /notification-cutover-scope-unknown/);
  assert.deepEqual(schema(DB), before.schema); assert.deepEqual(kv(DB), before.keys); assert.deepEqual(migrations(DB), before.migrations); assert.deepEqual(identitySnapshot(DB), before.identities);
});

test('a missing legacy chunk cannot be silently joined into a different valid document', async () => {
  const { W, DB, env } = await legacyWorld();
  await DB.prepare('UPDATE kv SET seq=2 WHERE k=?1 AND seq=0').bind('bassam_bc_v1').run();
  const before = { schema: schema(DB), keys: kv(DB), migrations: migrations(DB) };
  await assert.rejects(W.initDb(env), /notification-cutover-chunks/);
  assert.deepEqual(schema(DB), before.schema); assert.deepEqual(kv(DB), before.keys); assert.deepEqual(migrations(DB), before.migrations);
});

test('startup cutover refuses an existing relational target inside the atomic batch', async () => {
  const { W, DB, env } = await legacyWorld();
  for (const statement of W.KIVO_MIGRATIONS[4].sql.filter(sql => /^CREATE/i.test(sql))) DB.exec(statement);
  await DB.prepare("INSERT INTO notification_messages(scope,id,kind,type,category,priority,channel,title,body,created_at) VALUES('sys','TEST_ONLY_existing','event','sc_deny','sec','info','bell','TEST_ONLY existing','TEST_ONLY',1)").run();
  const before = { schema: schema(DB), keys: kv(DB), migrations: migrations(DB), rows: copy(DB.q('SELECT * FROM notification_messages')) };
  await assert.rejects(W.initDb(env), /KIVO_NOTIFICATION_CUTOVER_TARGET_NOT_EMPTY/);
  assert.deepEqual(schema(DB), before.schema); assert.deepEqual(kv(DB), before.keys); assert.deepEqual(migrations(DB), before.migrations);
  assert.deepEqual(copy(DB.q('SELECT * FROM notification_messages')), before.rows);
  assert.equal(DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v, '4');
});
