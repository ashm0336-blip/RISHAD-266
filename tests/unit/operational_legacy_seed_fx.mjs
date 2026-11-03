/* Explicit synthetic SQL seed installation. The production cutover planner
   supplies every target/source guard; no runtime compatibility reader exists. */
import assert from 'node:assert/strict';
import { D1Shim } from './harness.mjs';
import { canonicalWorker } from './custody_review_fx.mjs';
const installed = new WeakMap();
const clone = value => JSON.parse(JSON.stringify(value));
export async function installOperationalFixture(env, worker) {
  assert.ok(env.DB instanceof D1Shim, 'Isolated in-memory fixture SQLite only');
  /* Idempotent per isolated env: a shared world (custody_review_fx) may already have run the canonical cutover. */
  if (installed.has(env)) return { documents: 0, already: true };
  const DB = env.DB, W = worker || await canonicalWorker();
  assert.equal(DB.q("SELECT v FROM meta WHERE k='schema_version'")[0]?.v, '10');
  const protectedState = () => ({
    keys: clone(DB.q("SELECT k,seq,v FROM kv WHERE k IN('bassam_auth_users_v1','bassam_perms_v1') ORDER BY k,seq")),
    sessions: clone(DB.q('SELECT * FROM sess ORDER BY tok')),
    meta: clone(DB.q("SELECT k,v FROM meta WHERE k IN('schema_version','restore_epoch','authz_mode') ORDER BY k")),
    ownership: clone(DB.q('SELECT * FROM imgown ORDER BY img')),
  });
  const before = protectedState(), plan = await W.opLegacyPrepare(env);
  await DB.batch(plan.before.concat(plan.after));
  await W.opGuardRetired(env);
  assert.deepEqual(protectedState(), before, 'Fixture cutover preserves accounts/password bytes, permissions, sessions, epoch and image ownership');
  assert.equal(DB.q("SELECT COUNT(*)n FROM meta WHERE k='operations_cutover_ready'")[0].n, 0);
  assert.deepEqual(DB.q('PRAGMA foreign_key_check'), []);
  installed.set(env, W);
  return { documents: plan.n };
}
/* A database already converted by the real initDb (schema 10 migration + cutover) only needs registering:
   assert the schema and the retired-legacy guard, never re-run a cutover. */
export async function adoptOperationalFixture(env, worker) {
  assert.ok(env.DB instanceof D1Shim, 'Isolated in-memory fixture SQLite only');
  if (installed.has(env)) return { already: true };
  const W = worker || await canonicalWorker();
  assert.equal(env.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0]?.v, '10');
  await W.opGuardRetired(env);
  installed.set(env, W);
  return { adopted: true };
}
export function isOperationalFixtureKey(env, key) {
  const W = installed.get(env);
  return !!(W && W.opInfo(key));
}
export function inspectOperationalFixture(env, key) {
  const W = installed.get(env);
  assert.ok(W, 'Use installOperationalFixture before typed inspection');
  const info = W.opInfo(key);
  assert.ok(info, 'Typed resource only');
  const prepared = W.opPrepared(info.resource), tables = W.ocPhysicalTables(prepared);
  const physical = Object.fromEntries(Object.keys(tables).map(table => [table,
    env.DB.q('SELECT * FROM ' + table + ' WHERE department_id=? AND resource=?', info.dept, info.resource)]));
  const domain = W.ocFromPhysical(prepared, info.dept, info.resource, physical), decoded = W.ocInflate(prepared, domain);
  return decoded.present ? clone(decoded.value) : null;
}
export async function replaceOperationalFixture(env, key, value, { present = true } = {}) {
  const W = installed.get(env);
  assert.ok(W && env.DB instanceof D1Shim, 'Explicit installed SQLite fixture only');
  const revision = env.DB.q('SELECT rev FROM revs WHERE k=?', key)[0]?.rev || 0;
  const plan = await W.opChangeStatements(env, key, present ? JSON.stringify(value) : null, { base: revision });
  await env.DB.batch(plan.guards.concat(plan.statements, [
    env.DB.prepare("INSERT INTO meta(k,v)VALUES('rev',CAST((SELECT MAX(n)+1 FROM(SELECT COALESCE(MAX(rev),0)n FROM revs UNION ALL SELECT COALESCE(CAST(v AS INTEGER),0)FROM meta WHERE k='rev'))AS TEXT))ON CONFLICT(k)DO UPDATE SET v=excluded.v"),
    env.DB.prepare("INSERT INTO revs(k,rev)VALUES(?1,(SELECT CAST(v AS INTEGER)FROM meta WHERE k='rev'))ON CONFLICT(k)DO UPDATE SET rev=excluded.rev").bind(key),
  ]));
  return inspectOperationalFixture(env, key);
}
