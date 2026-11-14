/* Shared fixture SQL must seed the current typed domain without recreating retired KV. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { D1Shim, PYTHON, ROOT, applySql } from '../../../../tests/unit/harness.mjs';

function generated(mode) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r266-fixture-stats-'));
  try {
    const args = [path.join(ROOT, 'tests/fixtures/gen_fixture.py'), '--today', '1448-5-12', '--out', dir];
    if (mode) args.push('--daily-stats-storage', mode);
    execFileSync(PYTHON, args, { stdio: 'pipe', windowsHide: true });
    return {
      seed: fs.readFileSync(path.join(dir, 'test_seed.sql'), 'utf8'),
      reset: fs.readFileSync(path.join(dir, 'reset_test_fixture.sql'), 'utf8'),
      fx: JSON.parse(fs.readFileSync(path.join(dir, 'fixture.json'), 'utf8'))
    };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
const current = generated();
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
function database() {
  const db = new D1Shim();
  db.exec(read('migrations/0001_baseline.sql'));
  db.exec("INSERT INTO meta(k,v) VALUES('schema_version','5'),('authz_mode','enforce') ON CONFLICT(k) DO UPDATE SET v=excluded.v;");
  return db;
}
function typedSchema(db) {
  const ddl = read('migrations/0004_daily_stats.sql').match(/CREATE TABLE IF NOT EXISTS daily_stats_\w+\s*\([\s\S]*?\) WITHOUT ROWID;/g);
  assert.equal(ddl.length, 3);
  ddl.forEach(sql => db.exec(sql));
}
const typed = db => ({
  days: db.q('SELECT * FROM daily_stats_days ORDER BY site,hijri_date'),
  months: db.q('SELECT * FROM daily_stats_month_locks ORDER BY site,hijri_year,hijri_month'),
  locks: db.q('SELECT * FROM daily_stats_day_locks ORDER BY site,hijri_year,hijri_month,hijri_day')
});
function realData(db) {
  typedSchema(db);
  db.exec("INSERT INTO daily_stats_days(site,hijri_date,field_mask,worshippers,meta_json) VALUES('haram','1500-01-01',1,55,'{\"t\":\"original\"}'),('nabawi','9999-02-01',1,77,NULL);");
  db.exec("INSERT INTO daily_stats_month_locks VALUES('haram',1500,1,1,0,0); INSERT INTO daily_stats_day_locks VALUES('haram',1500,1,1,0,1);");
  db.db.prepare('INSERT INTO kv(k,seq,v) VALUES(?,0,?)').run('bassam_auth_users_v1', '[{"id":"original","role":"super","ph":"TEST_ONLY-preserve-verbatim"}]');
}

test('default fixture uses canonical typed tables, stays deterministic and never stamps migrations', async () => {
  const db = database();
  assert.equal(current.seed, generated().seed);
  assert.equal(current.fx.dailyStatsStorage, 'relational');
  assert.equal(/(?:INSERT|UPDATE|DELETE)[^\n]*\bkv\b[^\n]*bassam_dstats_v1/.test(current.seed + current.reset), false);
  await applySql(db, current.seed);
  assert.equal(db.q("SELECT COUNT(*) n FROM kv WHERE k='bassam_dstats_v1'")[0].n, 0);
  assert.equal(typed(db).days.length, 3); assert.equal(typed(db).months.length, 2); assert.equal(typed(db).locks.length, 2);
  assert.equal(db.q("SELECT field_mask FROM daily_stats_days WHERE site='haram' AND hijri_date='9999-01-01'")[0].field_mask, 3);
  assert.deepEqual(db.q("SELECT k,v FROM meta WHERE k IN ('schema_version','authz_mode') ORDER BY k").map(r => [r.k,r.v]), [['authz_mode','enforce'],['schema_version','5']]);
  assert.equal(db.q("SELECT COUNT(*) n FROM sqlite_master WHERE name='d1_migrations'")[0].n, 0);
});

test('fixture seed is idempotent and repeated reset preserves original typed rows and account bytes', async () => {
  const db = database(); realData(db);
  const before = typed(db), user = JSON.parse(db.q("SELECT v FROM kv WHERE k='bassam_auth_users_v1'")[0].v)[0];
  await applySql(db, current.seed); const first = typed(db);
  await applySql(db, current.seed); assert.deepEqual(typed(db), first);
  await applySql(db, current.reset); assert.deepEqual(typed(db), before);
  await applySql(db, current.reset); assert.deepEqual(typed(db), before);
  assert.deepEqual(JSON.parse(db.q("SELECT v FROM kv WHERE k='bassam_auth_users_v1'")[0].v), [user]);
  assert.equal(db.q("SELECT COUNT(*) n FROM meta WHERE k='tst_fixture_daily_stats_v1'")[0].n, 0);
});

test('reserved-date collisions reject seed before account or data mutations', async () => {
  for (const collision of [
    "INSERT INTO daily_stats_days(site,hijri_date,field_mask,worshippers) VALUES('haram','9999-01-01',1,93)",
    "INSERT INTO daily_stats_month_locks VALUES('haram',9999,1,1,0,0)",
    "INSERT INTO meta(k,v) VALUES('tst_fixture_daily_stats_v1','1'); INSERT INTO daily_stats_month_locks VALUES('haram',9999,1,1,0,0); INSERT INTO daily_stats_day_locks VALUES('haram',9999,1,2,0,1)"
  ]) {
    const db = database(); realData(db); db.exec(collision);
    const before = typed(db), users = db.q("SELECT * FROM kv WHERE k='bassam_auth_users_v1'");
    await assert.rejects(applySql(db, current.seed), /KIVO_FIXTURE_DSTATS_TARGET_COLLISION/);
    assert.deepEqual(typed(db), before); assert.deepEqual(db.q("SELECT * FROM kv WHERE k='bassam_auth_users_v1'"), users);
  }
});

test('reset removes only tagged fixture days and owned locks while preserving later foreign data', async () => {
  const db = database(); await applySql(db, current.seed);
  db.exec("INSERT INTO daily_stats_days(site,hijri_date,field_mask,worshippers) VALUES('haram','9999-01-03',1,93); INSERT INTO daily_stats_day_locks VALUES('haram',9999,1,3,0,1);");
  await applySql(db, current.reset);
  assert.deepEqual(typed(db).days.map(r => [r.site,r.hijri_date,r.worshippers]), [['haram','9999-01-03',93]]);
  assert.deepEqual(typed(db).months.map(r => r.site), ['haram']);
  assert.deepEqual(typed(db).locks.map(r => r.hijri_day), [3]);
  await applySql(db, current.reset); assert.equal(typed(db).days.length, 1); assert.equal(typed(db).locks.length, 1);
});

test('historical KV mode is explicit and never writes both daily-statistics stores', async () => {
  const legacy = generated('legacy-kv'), db = database();
  assert.equal(legacy.fx.dailyStatsStorage, 'legacy-kv');
  assert.match(legacy.seed, /UPDATE kv SET v = json_patch\(v, .*bassam_dstats_v1/);
  assert.equal(legacy.seed.includes('CREATE TABLE IF NOT EXISTS daily_stats_'), false);
  await applySql(db, legacy.seed);
  assert.equal(db.q("SELECT COUNT(*) n FROM kv WHERE k='bassam_dstats_v1'")[0].n, 1);
  assert.equal(db.q("SELECT COUNT(*) n FROM sqlite_master WHERE name='daily_stats_days'")[0].n, 0);
});
