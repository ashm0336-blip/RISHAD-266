/* No Wrangler, credentials or network: prove the script stops before them. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ROOT,BASH} from './harness.mjs';

test('schema9 CLI apply is refused before Wrangler, automatic DB export or a cloud mutation',t=>{
  const cachePath=path.join(ROOT,'.cache/next-domains');fs.mkdirSync(cachePath,{recursive:true});
  const cache=fs.realpathSync(cachePath);
  const directory=fs.mkdtempSync(path.join(cache,'cli-policy-'));
  t.after(()=>{const actual=fs.realpathSync(directory);assert.ok(actual.startsWith(cache+path.sep)&&path.basename(actual).startsWith('cli-policy-'));fs.rmSync(actual,{recursive:true});});
  fs.writeFileSync(path.join(directory,'0009_seized_awards.sql'),'-- TEST_ONLY; never executed');
  const environment={...process.env};Object.keys(environment).filter(k=>k.toLowerCase()==='path').forEach(k=>delete environment[k]);environment.PATH=path.dirname(BASH)+path.delimiter+(process.env.PATH||'');
  const relative=path.relative(ROOT,directory).split(path.sep).join('/');
  const result=spawnSync(BASH,['tools/d1/migrate.sh','bassam-db-preview',relative,'--no-backup'],{cwd:ROOT,env:environment,encoding:'utf8',windowsHide:true,timeout:10000});
  assert.equal(result.status,6,result.stderr);
  assert.match(result.stderr,/canonical|initializer/);
  assert.match(result.stderr,/before backup or network/);
  assert.deepEqual(fs.readdirSync(directory),['0009_seized_awards.sql']);
  const production=spawnSync(BASH,['tools/d1/migrate.sh','bassam-db',relative,'--no-backup'],{cwd:ROOT,env:environment,encoding:'utf8',windowsHide:true,timeout:10000});
  assert.equal(production.status,2,production.stderr);
  assert.match(production.stderr,/Production is forbidden/);
});
