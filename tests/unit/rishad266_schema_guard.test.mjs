/* An older Worker must never adopt or downgrade a database with an unknown schema. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {canonicalWorker} from './custody_review_fx.mjs';
import { D1Shim, ROOT, allowTestSchemaUpgrade } from './harness.mjs';

/* Migration orchestration now has DS/NF/CU dependencies. Load the complete
   canonical declaration set, without initializing the Worker or stubbing them. */
async function migrationCode(){return await canonicalWorker();}

const writes = DB => DB.log.filter(sql => /^\s*(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|REPLACE)\b/i.test(sql));
const version = DB => DB.q("SELECT v FROM meta WHERE k='schema_version'")[0]?.v;
const snapshot = DB => DB.q("SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name").map(table => ({
  ...table, rows: DB.q('SELECT * FROM "' + table.name.replaceAll('"', '""') + '" ORDER BY ' + (/WITHOUT ROWID/i.test(table.sql) ? DB.q('PRAGMA table_info("' + table.name + '")').filter(c => c.pk).sort((a,b) => a.pk-b.pk).map(c => '"' + c.name + '"').join(',') : 'rowid'))
}));

function baseline(W) {
  const DB = new D1Shim();
  DB.exec(W.MIG_TABLE);
  for (const migration of W.KIVO_MIGRATIONS) {
    for (const sql of migration.sql) DB.exec(sql);
    DB.db.prepare('INSERT INTO d1_migrations(name) VALUES (?)').run(migration.name);
  }
  DB.exec("CREATE TABLE kr268_test_only(id TEXT PRIMARY KEY, value TEXT); INSERT INTO kr268_test_only VALUES ('test-row','TEST_ONLY preserve newer table');");
  DB.db.prepare('INSERT INTO kv(k,seq,v) VALUES (?,0,?)').run('bassam_auth_users_v1', '[{"id":"TEST_ONLY employee","ph":"TEST_ONLY opaque existing hash","role":"staff"}]');
  return DB;
}

test('Schema 4 with an unknown retirement migration is rejected before any writes and stays schema 4', async () => {
  const W = await migrationCode();
  assert.equal(W.KIVO_SCHEMA_VERSION, fs.readdirSync(path.join(ROOT, 'migrations')).filter(f => f.endsWith('.sql')).length);
  const DB = baseline(W);
  DB.exec("INSERT INTO d1_migrations(name) VALUES ('0004_retire_data_scope'); UPDATE meta SET v='4' WHERE k='schema_version';");
  const before = snapshot(DB);
  DB.log.length = 0;
  await assert.rejects(W.migrateDb({ DB }), /db-schema-unsupported: unknown migration/);
  assert.deepEqual(writes(DB), []);
  assert.equal(version(DB), '4');
  assert.deepEqual(snapshot(DB), before, 'Accounts, newer tables, migration history, and metadata are unchanged');
});

test('A newer schema stamp is rejected even if its migration row is missing', async () => {
  const W = await migrationCode(), DB = baseline(W);
  DB.exec("UPDATE meta SET v='" + (W.KIVO_SCHEMA_VERSION + 1) + "' WHERE k='schema_version'");
  const before = snapshot(DB);
  DB.log.length = 0;
  await assert.rejects(W.migrateDb({ DB }), /db-schema-unsupported/);
  assert.deepEqual(writes(DB), []);
  assert.deepEqual(snapshot(DB), before);
});

test('A newer database without d1_migrations is not mistaken for an adoptable legacy database', async () => {
  const W = await migrationCode(), DB = new D1Shim();
  DB.exec("CREATE TABLE meta(k TEXT PRIMARY KEY,v TEXT NOT NULL); INSERT INTO meta VALUES ('schema_version','" + (W.KIVO_SCHEMA_VERSION + 1) + "');");
  const before = snapshot(DB);
  DB.log.length = 0;
  await assert.rejects(W.migrateDb({ DB }), /db-schema-unsupported/);
  assert.deepEqual(writes(DB), [], 'No migration table or legacy adoption DDL is allowed');
  assert.deepEqual(snapshot(DB), before);
});

test('The known current baseline remains usable without writes or removing additional tables', async () => {
  const W = await migrationCode(), DB = baseline(W), before = snapshot(DB);
  DB.log.length = 0;
  const result = await W.migrateDb({ DB });
  assert.equal(result.ran, 0);
  assert.equal(result.applied, W.KIVO_SCHEMA_VERSION);
  assert.deepEqual(writes(DB), []);
  assert.deepEqual(snapshot(DB), before);
});

test('A fresh database and an older pre-KIVO248 database still migrate to the known baseline', async () => {
  for (const legacy of [false, true]) {
    const W = await migrationCode(), DB = new D1Shim();
    const accounts = '[{"id":"TEST_ONLY existing manager","un":"TEST_ONLY existing username","ph":"TEST_ONLY existing opaque hash","role":"dept","deptId":"dX"}]';
    if (legacy) {
      DB.exec('CREATE TABLE kv(k TEXT NOT NULL,seq INTEGER NOT NULL,v TEXT NOT NULL,PRIMARY KEY(k,seq));'
        + 'CREATE TABLE meta(k TEXT PRIMARY KEY,v TEXT NOT NULL);'
        + 'CREATE TABLE sess(tok TEXT PRIMARY KEY,uid TEXT NOT NULL,ts INTEGER NOT NULL,la INTEGER NOT NULL);'
        + 'CREATE TABLE audit(id INTEGER PRIMARY KEY AUTOINCREMENT,ts INTEGER NOT NULL,uid TEXT NOT NULL,un TEXT,k TEXT NOT NULL,act TEXT NOT NULL,rev INTEGER NOT NULL,diff TEXT,ip TEXT);');
      DB.db.prepare('INSERT INTO kv(k,seq,v) VALUES (?,0,?)').run('bassam_auth_users_v1', accounts);
      DB.exec("INSERT INTO meta VALUES ('rev','7'); INSERT INTO sess VALUES ('TEST_ONLY session','TEST_ONLY existing manager',1,1);");
      allowTestSchemaUpgrade(DB);
    }
    const result = await W.migrateDb({ DB });
    assert.equal(result.ran, W.KIVO_SCHEMA_VERSION);
    assert.equal(version(DB), String(W.KIVO_SCHEMA_VERSION));
    assert.equal(DB.q('SELECT name FROM d1_migrations').length, W.KIVO_SCHEMA_VERSION);
    if (legacy) {
      assert.equal(DB.q("SELECT v FROM kv WHERE k='bassam_auth_users_v1'")[0].v, accounts, 'Existing account fields and hashes stay byte-for-byte identical');
      assert.equal(DB.q("SELECT v FROM meta WHERE k='rev'")[0].v, '7');
      assert.equal(DB.q('SELECT uid FROM sess')[0].uid, 'TEST_ONLY existing manager');
      assert.ok(DB.q('PRAGMA table_info(sess)').some(column => column.name === 'dev'));
      assert.ok(DB.q('PRAGMA table_info(audit)').some(column => column.name === 'city'));
    }
  }
});

test('A failed schema read fails closed instead of starting migrations', async () => {
  const W = await migrationCode(), DB = baseline(W), before = snapshot(DB);
  DB.failIf = sql => /SELECT v FROM meta WHERE k = 'schema_version'/.test(sql);
  DB.log.length = 0;
  await assert.rejects(W.migrateDb({ DB }), /injected failure/);
  assert.deepEqual(writes(DB), []);
  DB.failIf = null;
  assert.deepEqual(snapshot(DB), before);
});
