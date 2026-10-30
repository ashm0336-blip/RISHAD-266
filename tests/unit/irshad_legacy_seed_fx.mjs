/* Explicit TEST-ONLY installation for older SQL identity/security fixtures.
   Reuse the actual cutover plan on isolated SQLite; no runtime KV adapter. */
import assert from 'node:assert/strict';
import {D1Shim} from './harness.mjs';
import {candidateWorker} from './irshad_domain_fx.mjs';
let codec;
export async function installIrshadFixture(env) {
  assert.ok(env.DB instanceof D1Shim, 'Only isolated in-memory fixture SQLite may use this helper');
  const DB=env.DB,W=await(codec ||= candidateWorker()),
    version=DB.q("SELECT v FROM meta WHERE k='schema_version'")[0]?.v,
    protectedRows=()=>JSON.parse(JSON.stringify(DB.q("SELECT k,seq,v FROM kv WHERE k IN('bassam_auth_users_v1','bassam_perms_v1') ORDER BY k,seq"))),
    before=protectedRows();
  assert.ok(['8','9','10'].includes(version),'Only initialized schemas with the actual Irshad tables may install this explicit legacy fixture');
  const plan=await W.irLegacyPrepare(env);
  await DB.batch(plan.before.concat(plan.after,[DB.prepare("DELETE FROM meta WHERE k='ir_cutover_ready'")]));
  assert.equal(await W.irLegacyPresent(env),false);
  assert.deepEqual(protectedRows(),before);
  assert.equal(DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v,version);
}
