/* Explicit TEST-ONLY schema9/10 SQL fixture cutover. Reuse the canonical
   source/empty-target witnesses; never clear a populated target or replay KV. */
import assert from 'node:assert/strict';
import { D1Shim } from './harness.mjs';
import { candidateWorker } from './irshad_domain_fx.mjs';
let worker;
export async function installBusinessFixture(env) {
  assert.ok(env.DB instanceof D1Shim, 'Only isolated fixture SQLite');
  const W = await (worker ||= candidateWorker(['SZ_RES','AW_RES','szPredicate','awLegacyPredicate','szLegacyPrepare','awLegacyPrepare','bdGuardRetired'])), DB = env.DB;
  const version = DB.q("SELECT v FROM meta WHERE k='schema_version'")[0]?.v;
  assert.ok(['9','10'].includes(version), 'Actual initialized seized/award tables are required');
  const protectedRows = () => JSON.parse(JSON.stringify({
    keys: DB.q("SELECT k,seq,v FROM kv WHERE k IN('bassam_auth_users_v1','bassam_perms_v1') ORDER BY k,seq"),
    sessions: DB.q('SELECT * FROM sess ORDER BY tok'),
    epoch: DB.q("SELECT k,v FROM meta WHERE k IN('schema_version','restore_epoch','authz_mode') ORDER BY k"),
    ownership: DB.q('SELECT * FROM imgown ORDER BY img'),
  })), before = protectedRows(), plans = [];
  const seized = DB.q('SELECT 1 FROM kv WHERE ' + W.szPredicate() + ' LIMIT 1', JSON.stringify(W.SZ_RES));
  const awards = DB.q('SELECT 1 FROM kv WHERE ' + W.awLegacyPredicate() + ' LIMIT 1', JSON.stringify(W.AW_RES));
  if (seized.length) plans.push(await W.szLegacyPrepare(env));
  if (awards.length) plans.push(await W.awLegacyPrepare(env));
  if (plans.length) await DB.batch(plans.flatMap(plan => plan.before).concat(plans.flatMap(plan => plan.after), [
    // Same marker consumption as migration0009, without replaying its DDL/schema version.
    DB.prepare("DELETE FROM meta WHERE k='seized_cutover_ready'"),
  ]));
  await W.bdGuardRetired(env);
  assert.deepEqual(protectedRows(), before);
  assert.deepEqual(DB.q('PRAGMA foreign_key_check'), []);
  return { plans: plans.length };
}
