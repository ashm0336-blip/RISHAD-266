/* Operator-only schema upgrade authorization; real canonical parts and SQLite. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { D1Shim, ROOT } from './harness.mjs';

const KEY = 'schema_upgrade_permit_v1';
let isolate = 0;
async function worker() {
  const parts = JSON.parse(fs.readFileSync(path.join(ROOT, 'workers/parts.json'), 'utf8')).parts;
  const source = parts.map(p => fs.readFileSync(path.join(ROOT, 'workers/parts', p.file), 'utf8')).join('');
  return import('data:text/javascript;base64,' + Buffer.from(source + '\nexport { migrateDb, initDb, KIVO_MIGRATIONS };\n// permit test isolate ' + ++isolate).toString('base64'));
}
async function fixture(n = 5) {
  const W = await worker(), DB = new D1Shim();
  DB.exec('CREATE TABLE d1_migrations(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE,applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)');
  for (const migration of W.KIVO_MIGRATIONS.slice(0, n)) {
    for (const sql of migration.sql) DB.exec(sql);
    DB.db.prepare('INSERT INTO d1_migrations(name) VALUES(?)').run(migration.name);
  }
  DB.db.prepare('INSERT INTO kv(k,seq,v) VALUES(?,0,?)').run('bassam_auth_users_v1', '[{"id":"TEST_ONLY_owner","role":"super","ph":"TEST_ONLY_existing_hash"}]');
  DB.exec("INSERT INTO meta(k,v) VALUES('policy','TEST_ONLY_existing_policy')");
  return { W, DB, env: { DB } };
}
function permit(B, changes = {}) {
  const value = { version: 1, from: 5, to: B.W.KIVO_MIGRATIONS.length, migrations: B.W.KIVO_MIGRATIONS.slice(5).map(m => m.name), operationId: randomUUID(), expiresAt: Date.now() + 60000, ...changes };
  const raw = JSON.stringify(value);
  B.DB.db.prepare('INSERT INTO meta(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v').run(KEY, raw);
  return raw;
}
const state = DB => DB.q("SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").map(t => ({ ...t, rows: DB.q('SELECT * FROM "' + t.name.replaceAll('"', '""') + '"').map(r => ({ ...r })) }));
const stamp = DB => DB.q("SELECT v FROM meta WHERE k='schema_version'")[0]?.v;
const readPermit = DB => DB.q('SELECT v FROM meta WHERE k=?', KEY)[0]?.v;

test('cold current worker refuses a restored schema5 database without an operator permit before any writes', async () => {
  const B = await fixture(), before = state(B.DB);
  await assert.rejects(B.W.initDb(B.env), /migration-permit/);
  assert.deepEqual(state(B.DB), before);
});

test('invalid, unknown-field, wrong-source, wrong-target, wrong-migration and expired permits fail without writes', async () => {
  const variants = [{ version: 2 }, { extra: true }, { from: 6 }, { to: 9 }, { migrations: ['0007_atomic_restore'] }, { operationId: 'not-an-operation-id' }, { expiresAt: Date.now() - 1 }];
  for (const change of variants) {
    const B = await fixture(); permit(B, change); const before = state(B.DB);
    await assert.rejects(B.W.migrateDb(B.env), /migration-permit/);
    assert.deepEqual(state(B.DB), before);
  }
});

test('changed permit bytes are rejected inside the migration transaction', async () => {
  const B = await fixture(); const raw = permit(B), batch = B.DB.batch.bind(B.DB); let changed = false, concurrent;
  B.DB.batch = async statements => {
    if (!changed && statements.some(s => /^CREATE TABLE IF NOT EXISTS custody_items/.test(s.sql))) {
      changed = true;
      B.DB.db.prepare('UPDATE meta SET v=? WHERE k=?').run(raw + ' ', KEY);
      concurrent = state(B.DB);
    }
    return batch(statements);
  };
  await assert.rejects(B.W.migrateDb(B.env), /MIGRATION_PERMIT/);
  assert.equal(changed, true); assert.deepEqual(state(B.DB), concurrent);
});

test('permit expiry is rechecked at actual SQL execution time', async () => {
  const B = await fixture(); permit(B, { expiresAt: Date.now() + 400 }); const before = state(B.DB), batch = B.DB.batch.bind(B.DB); let delayed = false;
  B.DB.batch = async statements => {
    if (!delayed && statements.some(s => /^CREATE TABLE IF NOT EXISTS custody_items/.test(s.sql))) {
      delayed = true; await new Promise(resolve => setTimeout(resolve, 500));
    }
    return batch(statements);
  };
  await assert.rejects(B.W.migrateDb(B.env), /MIGRATION_PERMIT/);
  assert.equal(delayed, true); assert.deepEqual(state(B.DB), before);
});

test('migration6 commits once, failed7 retains the permit and retry consumes it only with the final migration', async () => {
  const B = await fixture(), raw = permit(B);
  B.DB.failIf = sql => /^CREATE TABLE IF NOT EXISTS restore_operations/.test(sql);
  await assert.rejects(B.W.migrateDb(B.env), /injected failure/); B.DB.failIf = null;
  assert.equal(stamp(B.DB), '6'); assert.equal(readPermit(B.DB), raw);
  const revs = B.DB.q('SELECT * FROM revs');
  await B.W.migrateDb(B.env);
  assert.equal(stamp(B.DB), String(B.W.KIVO_MIGRATIONS.length)); assert.equal(readPermit(B.DB), undefined);
  assert.deepEqual(B.DB.q('SELECT * FROM revs'), revs);
});

test('a failure after permit deletion rolls back the deletion and every statement of the final migration', async () => {
  const B = await fixture(), raw = permit(B), N = B.W.KIVO_MIGRATIONS.length, last = B.W.KIVO_MIGRATIONS[N - 1].name;
  B.DB.failIf = sql => /^INSERT OR IGNORE INTO d1_migrations/.test(sql) && stamp(B.DB) === String(N);
  await assert.rejects(B.W.migrateDb(B.env), /injected failure/); B.DB.failIf = null;
  assert.equal(stamp(B.DB), String(N - 1)); assert.equal(readPermit(B.DB), raw);
  assert.equal(B.DB.q("SELECT COUNT(*) n FROM sqlite_master WHERE name='ops_nodes'")[0].n, 0, 'final (0010) migration tables rolled back');
  assert.equal(B.DB.q("SELECT COUNT(*) n FROM d1_migrations WHERE name=?", last)[0].n, 0);
  await B.W.migrateDb(B.env); assert.equal(stamp(B.DB), String(B.W.KIVO_MIGRATIONS.length)); assert.equal(readPermit(B.DB), undefined);
});

test('a ledger membership change with unchanged row count is fenced inside the batch', async () => {
  const B = await fixture(); permit(B); const batch = B.DB.batch.bind(B.DB); let changed = false, concurrent;
  B.DB.batch = async statements => {
    if (!changed && statements.some(s => /^CREATE TABLE IF NOT EXISTS custody_items/.test(s.sql))) {
      changed = true;
      B.DB.exec("UPDATE d1_migrations SET name='TEST_ONLY_replaced_migration' WHERE name='0004_daily_stats'");
      concurrent = state(B.DB);
    }
    return batch(statements);
  };
  await assert.rejects(B.W.migrateDb(B.env), /KIVO_DB_SCHEMA/);
  assert.equal(changed, true); assert.deepEqual(state(B.DB), concurrent);
});

test('a NULL ledger entry introduced after planning cannot authorize migration6 or consume the permit', async () => {
  const B = await fixture(); const raw = permit(B), batch = B.DB.batch.bind(B.DB); let changed = false, concurrent;
  B.DB.batch = async statements => {
    if (!changed && statements.some(s => /^CREATE TABLE IF NOT EXISTS custody_items/.test(s.sql))) {
      changed = true;
      B.DB.exec("UPDATE d1_migrations SET name=NULL WHERE name='0004_daily_stats'");
      concurrent = state(B.DB);
    }
    return batch(statements);
  };
  await assert.rejects(B.W.migrateDb(B.env), /KIVO_DB_SCHEMA/);
  assert.equal(changed, true); assert.equal(readPermit(B.DB), raw);
  assert.deepEqual(state(B.DB), concurrent);
});

test('a batch planned at6 cannot execute after rollback to5 and removal of the permit', async () => {
  const B = await fixture(6); permit(B); const batch = B.DB.batch.bind(B.DB); let changed = false, restored;
  B.DB.batch = async statements => {
    if (!changed && statements.some(s => /^CREATE TABLE IF NOT EXISTS restore_operations/.test(s.sql))) {
      changed = true; B.DB.exec("UPDATE meta SET v='5' WHERE k='schema_version'; DELETE FROM d1_migrations WHERE name='0006_custody'");
      B.DB.db.prepare('DELETE FROM meta WHERE k=?').run(KEY); restored = state(B.DB);
    }
    return batch(statements);
  };
  await assert.rejects(B.W.migrateDb(B.env), /KIVO_DB_SCHEMA|MIGRATION_PERMIT/);
  assert.equal(changed, true); assert.deepEqual(state(B.DB), restored);
});

test('two concurrent migration attempts cannot consume one permit or apply a migration twice', async () => {
  const B = await fixture(); permit(B);
  const outcomes = await Promise.allSettled([B.W.migrateDb(B.env), B.W.migrateDb(B.env)]);
  assert.ok(outcomes.some(r => r.status === 'fulfilled'));
  assert.equal(stamp(B.DB), String(B.W.KIVO_MIGRATIONS.length)); assert.equal(readPermit(B.DB), undefined);
  assert.equal(B.DB.q("SELECT COUNT(*) n FROM d1_migrations WHERE name IN ('0006_custody','0007_atomic_restore','0008_irshad','0009_seized_awards','0010_operational_domains')")[0].n, 5);
});

test('missing migration ledger does not make an existing application database empty', async () => {
  const B = await fixture(); B.DB.exec('DROP TABLE d1_migrations'); const before = state(B.DB);
  await assert.rejects(B.W.migrateDb(B.env), /migration-permit|db-schema-unsupported/);
  assert.deepEqual(state(B.DB), before);
});

test('genuinely empty initialization remains supported and a stale empty plan cannot modify a restored database', async () => {
  const W = await worker(), DB = new D1Shim();
  await W.migrateDb({ DB }); assert.equal(stamp(DB), String(W.KIVO_MIGRATIONS.length)); assert.equal(readPermit(DB), undefined);
  const W2 = await worker(), empty = new D1Shim(), batch = empty.batch.bind(empty); let restored = false, before;
  empty.batch = async statements => {
    if (!restored && statements.some(s => /^CREATE TABLE IF NOT EXISTS kv /.test(s.sql))) {
      restored = true;
      for (const m of W2.KIVO_MIGRATIONS.slice(0, 5)) for (const sql of m.sql) empty.exec(sql);
      empty.db.prepare('INSERT INTO kv(k,seq,v) VALUES(?,0,?)').run('bassam_auth_users_v1', 'TEST_ONLY_restored_owner');
      before = state(empty);
    }
    return batch(statements);
  };
  await assert.rejects(W2.migrateDb({ DB: empty }), /KIVO_DB_SCHEMA|MIGRATION_PERMIT/);
  assert.equal(restored, true); assert.deepEqual(state(empty), before);
});
