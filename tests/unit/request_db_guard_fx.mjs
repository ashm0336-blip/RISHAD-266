/* Test-only exports from the actual canonical Worker; no staged composers. */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './harness.mjs';
const migrationSource=fs.readFileSync(path.join(ROOT,'workers/parts/051a-schema-migrations.js'),'utf8');
const version=/KIVO_SCHEMA_VERSION\s*=\s*(\d+)/.exec(migrationSource);
if(!version)throw Error('Canonical schema declaration missing');
export const SUPPORTED_SCHEMA=Number(version[1]);
export const guardPart=()=>fs.readFileSync(path.join(ROOT,'workers/parts/052-aud-events.js'),'utf8');
let instance=0;
export async function guardWorker(){
  const parts=JSON.parse(fs.readFileSync(path.join(ROOT,'workers/parts.json'),'utf8')).parts;
  const source=parts.map(p=>fs.readFileSync(path.join(ROOT,'workers/parts',p.file),'utf8')).join('');
  return import('data:text/javascript;base64,'+Buffer.from(source+'\nexport{preload,preAttach,dbGuard,dbGuardCapture,dbGuardFailure,initDb,migrateDb,kvPutStmts,KIVO_SCHEMA_VERSION,KIVO_MIGRATIONS,hashPw,verifyPw,preOff};\n//# sourceURL=request-db-guard-canonical.mjs\n//'+ ++instance).toString('base64'));
}
