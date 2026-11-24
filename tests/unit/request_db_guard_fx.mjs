/* Test-only exports from the actual canonical Worker; no staged composers. */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, CURRENT_SCHEMA } from './harness.mjs';
export const SUPPORTED_SCHEMA=CURRENT_SCHEMA;   /* V7 · د6 (pins): المصدرُ الواحد في harness */
export const guardPart=()=>fs.readFileSync(path.join(ROOT,'workers/parts/052-aud-events.js'),'utf8');
let instance=0;
export async function guardWorker(){
  const parts=JSON.parse(fs.readFileSync(path.join(ROOT,'workers/parts.json'),'utf8')).parts;
  const source=parts.map(p=>fs.readFileSync(path.join(ROOT,'workers/parts',p.file),'utf8')).join('');
  return import('data:text/javascript;base64,'+Buffer.from(source+'\nexport{preload,preAttach,dbGuard,dbGuardCapture,dbGuardFailure,initDb,migrateDb,kvPutStmts,KIVO_SCHEMA_VERSION,KIVO_MIGRATIONS,hashPw,verifyPw,preOff};\n//# sourceURL=request-db-guard-canonical.mjs\n//'+ ++instance).toString('base64'));
}
