/* Synthetic fixtures for the actual canonical Irshad domain; never a stage composer. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {world as currentWorld, legacyWorld, ROOT, D1, D2, IDS, identitySnapshot} from './custody_review_fx.mjs';
import {allowTestSchemaUpgrade} from './harness.mjs';
import {installOperationalFixture} from './operational_legacy_seed_fx.mjs';
export {ROOT,D1,D2,IDS,identitySnapshot};
const NAMED = ['IR_RES','IR_RES_NAMES','IR_FIELDS','IR_TABLES','IR_REQUEST_COLS','irKey','irMetaKey','irConvert','irInflate',
  'irValidateDomain','irEmptyDomain','irSnapshot','irLegacyPrepare','irLegacyPresent','irInstallStatements','irRevs',
  'irRevisionGuards','irRetiredGuard','irGuardRetired','irMarkResourceStatements','irPlanRestore','irPlanWipe','irExport',
  'initDb','migrateDb','kvPutStmts','KIVO_MIGRATIONS','KIVO_SCHEMA_VERSION','actorOf','revGuard','rsPrepare','rsCommit',
  'rsConvertBackup','rsRestoreInventory','rsWipeInventory','rsEpoch','rsSaveCommit','curRev','preOff','empTransitionContext','empPrepareTransition','bdDefinitions'];
let instance=0;
export async function candidateWorker(extraExports=[]) {
  const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'workers/parts.json'),'utf8')),
    source=fs.readFileSync(path.join(ROOT,'workers/_worker.js'),'utf8');
  assert.equal(createHash('sha256').update(source).digest('hex'),manifest.sha256,'Test actual generated canonical Worker');
  const names=[...new Set(NAMED.concat(extraExports))];
  assert.ok(names.every(name=>/^[A-Za-z_$][\w$]*$/.test(name)));
  return import('data:text/javascript;base64,'+Buffer.from(source+'\nexport {'+names.join(',')+'};\n//# sourceURL=canonical-irshad-domain-worker.mjs\n// Irshad fixture isolate '+ ++instance).toString('base64'));
}
export function authorizeCandidateUpgrade(DB,W) {
  assert.equal(DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v,'7');
  assert.equal(W.KIVO_MIGRATIONS.length,10);
  assert.equal(W.KIVO_MIGRATIONS[7].name,'0008_irshad','Keep testing the actual migration8 cutover before the later schema9 domains');
  assert.equal(DB.q("SELECT k FROM meta WHERE k='schema_upgrade_permit_v1'").length,0);
  allowTestSchemaUpgrade(DB);
  return JSON.parse(DB.q("SELECT v FROM meta WHERE k='schema_upgrade_permit_v1'")[0].v);
}
export async function world({legacy=false,authorize=true,mode='enforce',extraExports=[]}={}) {
  const base=legacy?await legacyWorld({mode,through:'0007_atomic_restore'}):await currentWorld({mode}),
    W=await candidateWorker(extraExports);
  if(!legacy)await installOperationalFixture(base.env);
  if(legacy&&!authorize)base.DB.exec("DELETE FROM meta WHERE k='schema_upgrade_permit_v1'");
  assert.equal(W.KIVO_SCHEMA_VERSION,10,'Actual canonical schema10 includes the unchanged Irshad migration8 and the later business/operations cutovers');
  return {...base,canonicalW:base.W,W};
}
export async function seed(B,docs,dept=D1) {
  const domain=B.W.irConvert(dept,docs);
  await B.DB.batch(B.W.irInstallStatements(B.env,domain));
  return domain;
}
export function receipt(B,dept=D1) {
  B.DB.db.prepare('INSERT INTO irshad_requests(department_id,account_uid,request_id,fingerprint,resource_key,resource_rev,operation,result_n,result_id,created_at)VALUES(?,?,?,?,?,?,?,?,?,?)')
    .run(dept,IDS.super,'TEST_ONLY_old_receipt','TEST_ONLY_fingerprint',B.W.irKey(dept),0,'create',1,'TEST_ONLY_old',1);
}
export const tableSnapshot=B=>Object.fromEntries(['kv','meta','revs','d1_migrations','aud','restore_operations','restore_preimage','restore_snapshot_manifest',
  'irshad_reports','irshad_report_languages','irshad_catalog_entries','irshad_retro_windows','irshad_requests'].map(name=>[name,JSON.parse(JSON.stringify(B.DB.q('SELECT * FROM '+name)))]));
