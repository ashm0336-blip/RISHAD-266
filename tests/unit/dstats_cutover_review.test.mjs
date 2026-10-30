/* Independent cutover adversarial checks against canonical source, never Cloudflare. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { D1Shim, ROOT, allowTestSchemaUpgrade } from './harness.mjs';

const KEY = 'bassam_dstats_v1', copy = value => JSON.parse(JSON.stringify(value));
const metrics = { haram: ['worshippers', 'umrah', 'hijr_ismail', 'carts'], nabawi: ['worshippers', 'salam_corridor', 'rawdah_men_published', 'rawdah_men_reserved', 'rawdah_men_actual', 'rawdah_women_published', 'rawdah_women_reserved', 'rawdah_women_actual'] };
async function fixture() {
  const parts = JSON.parse(fs.readFileSync(path.join(ROOT, 'workers/parts.json'), 'utf8')).parts;
  const source = parts.map(({ file }) => fs.readFileSync(path.join(ROOT, 'workers/parts', file), 'utf8')).join('');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r266-ds-independent-')), file = path.join(dir, 'worker.mjs');
  fs.writeFileSync(file, source + '\nexport {initDb,dsDomainRead,KIVO_MIGRATIONS};\n');
  let W; try { W = await import(pathToFileURL(file).href); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  const DB = new D1Shim(), env = { DB };
  DB.exec('CREATE TABLE d1_migrations(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE,applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)');
  for (const name of fs.readdirSync(path.join(ROOT, 'migrations')).filter(name => /^000[1-3]_.*\.sql$/.test(name)).sort()) {
    DB.exec(fs.readFileSync(path.join(ROOT, 'migrations', name), 'utf8')); await DB.prepare('INSERT INTO d1_migrations(name) VALUES(?1)').bind(name.slice(0, -4)).run();
  }
  const data = { haram: {}, nabawi: {}, locks: { 'haram|1500-01': { ap: true, mo: true, dopen: { '01': true, '30': 1 }, dshut: { '01': 1 } }, 'nabawi|1500-2': true, 'haram|1500-3': {} } };
  for (const [site, fields] of Object.entries(metrics)) {
    data[site]['1500-01-01'] = Object.fromEntries(fields.map(field => [field, 0]));
    data[site]['1500-01-02'] = Object.fromEntries(fields.map(field => [field, null]));
    data[site]['1500-01-03'] = { __m: { n: 'TEST_ONLY بيانات '.repeat(700), t: 7 }, __f: { worshippers: 0 } };
  }
  const raw = JSON.stringify(data), chunks = [];
  for (let offset = 0; offset < raw.length; offset += 4000) chunks.push(raw.slice(offset, offset + 4000));
  assert.ok(chunks.length > 3);
  const other = { bassam_auth_users_v1: [{ id: 'TEST_ONLY_owner', role: 'super', ph: 'p2$TEST_ONLY_only' }], bassam_perms_v1: { emps: { TEST_ONLY: {} } }, bassam_platform_v1: { policy: { pwMin: 6, staffPin: 6 } } };
  for (const [key, value] of Object.entries(other)) await DB.prepare('INSERT INTO kv(k,seq,v) VALUES(?1,0,?2)').bind(key, JSON.stringify(value)).run();
  for (let i = 0; i < chunks.length; i++) await DB.prepare('INSERT INTO kv(k,seq,v) VALUES(?1,?2,?3)').bind(KEY, i, chunks[i]).run();
  DB.exec("INSERT INTO meta(k,v) VALUES('rev','8'),('policy','{\"pwMin\":6,\"lockN\":7}'); INSERT INTO revs(k,rev) VALUES('bassam_auth_users_v1',600),('bassam_dstats_v1',9)");
  allowTestSchemaUpgrade(DB);
  return { W, DB, env, data, chunks };
}
const identity = DB => copy(DB.q("SELECT k,seq,v FROM kv WHERE k != 'bassam_dstats_v1' ORDER BY k,seq"));
const state = DB => ({ schema: copy(DB.q("SELECT type,name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name")), kv: copy(DB.q('SELECT * FROM kv ORDER BY k,seq')), revs: copy(DB.q('SELECT * FROM revs ORDER BY k')), meta: copy(DB.q('SELECT * FROM meta ORDER BY k')) });

test('multi-chunk cutover preserves every metric presence bit, null, zero, attribution and overlapping lock flags', async () => {
  const { W, DB, env, data } = await fixture(), identities = identity(DB), policy = DB.q("SELECT v FROM meta WHERE k='policy'")[0].v;
  await W.initDb(env); const current = await W.dsDomainRead(env), expected = copy(data);
  expected.locks['haram|1500-1'] = { ap: 1, mo: 1, dopen: { 1: 1, 30: 1 }, dshut: { 1: 1 } }; delete expected.locks['haram|1500-01'];
  assert.deepEqual(current.data, expected); assert.ok(current.rev > 600); assert.deepEqual(identity(DB), identities); assert.equal(DB.q("SELECT v FROM meta WHERE k='policy'")[0].v, policy);
  for (const [site, fields] of Object.entries(metrics)) for (const field of fields) {
    assert.equal(current.data[site]['1500-01-01'][field], 0); assert.equal(current.data[site]['1500-01-02'][field], null); assert.equal(Object.hasOwn(current.data[site]['1500-01-03'], field), false);
  }
  assert.equal(DB.q('SELECT COUNT(*) n FROM kv WHERE k=?1', KEY)[0].n, 0); assert.equal(DB.q("SELECT COUNT(*) n FROM meta WHERE k='ds_cutover_ready'")[0].n, 0);
  assert.equal(DB.q("SELECT rev FROM revs WHERE k='bassam_auth_users_v1'")[0].rev, 600);
  assert.deepEqual(DB.q('PRAGMA foreign_key_check'), []);
});

test('an appended or removed source chunk after preflight aborts before DDL and never discards the changed source', async () => {
  for (const change of ['append', 'remove']) {
    const { W, DB, env, chunks } = await fixture(), batch = DB.batch.bind(DB), before = state(DB); let changed = false, concurrent;
    DB.batch = async statements => {
      if (!changed && statements.some(statement => statement.sql.includes('KIVO_DSTATS_CUTOVER_SOURCE_CHANGED'))) {
        changed = true;
        if (change === 'append') DB.db.prepare('INSERT INTO kv(k,seq,v) VALUES(?,?,?)').run(KEY, chunks.length, 'TEST_ONLY_late_chunk');
        else DB.db.prepare('DELETE FROM kv WHERE k=? AND seq=?').run(KEY, chunks.length - 1);
        concurrent = copy(DB.q('SELECT * FROM kv ORDER BY k,seq'));
      }
      return await batch(statements);
    };
    await assert.rejects(W.initDb(env), /KIVO_DSTATS_CUTOVER_SOURCE_CHANGED/); assert.equal(changed, true);
    const after = state(DB); assert.deepEqual(after.kv, concurrent); assert.deepEqual(after.schema, before.schema); assert.deepEqual(after.revs, before.revs); assert.deepEqual(after.meta, before.meta);
  }
});

test('a concurrent month-lock-only target is guarded inside the batch and cannot be overwritten by cutover', async () => {
  const { W, DB, env } = await fixture(), migration = W.KIVO_MIGRATIONS.find(m => m.name === '0004_daily_stats');
  for (const sql of migration.sql.filter(sql => /^CREATE /.test(sql))) DB.exec(sql);
  const batch = DB.batch.bind(DB), before = state(DB); let inserted = false;
  DB.batch = async statements => {
    if (!inserted && statements.some(statement => statement.sql.includes('KIVO_DSTATS_CUTOVER_TARGET_CHANGED'))) {
      inserted = true; DB.exec("INSERT INTO daily_stats_month_locks(site,hijri_year,hijri_month,approved,reopened,legacy_boolean) VALUES('nabawi',1501,3,1,0,0)");
    }
    return await batch(statements);
  };
  await assert.rejects(W.initDb(env), /KIVO_DSTATS_CUTOVER_TARGET_CHANGED/); assert.equal(inserted, true);
  assert.equal(DB.q('SELECT COUNT(*) n FROM daily_stats_days')[0].n, 0); assert.deepEqual(copy(DB.q('SELECT * FROM daily_stats_month_locks')), [{ site: 'nabawi', hijri_year: 1501, hijri_month: 3, approved: 1, reopened: 0, legacy_boolean: 0 }]);
  const after = state(DB); assert.deepEqual(after.kv, before.kv); assert.deepEqual(after.schema, before.schema); assert.deepEqual(after.revs, before.revs); assert.deepEqual(after.meta, before.meta);
});
