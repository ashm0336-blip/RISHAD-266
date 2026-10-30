/* Source duplication is physical implementation duplication, not module imports. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ROOT} from './harness.mjs';
test('duplicate audit counts one imported physical source once and still catches independent copies',t=>{
 const cache=path.join(ROOT,'.cache');fs.mkdirSync(cache,{recursive:true});const dir=fs.mkdtempSync(path.join(cache,'duplicate-sites-'));
 t.after(()=>{const actual=fs.realpathSync(dir),base=fs.realpathSync(cache);assert.ok(actual.startsWith(base+path.sep)&&path.basename(actual).startsWith('duplicate-sites-'));fs.rmSync(actual,{recursive:true});});
 const body=Array.from({length:20},(_,i)=>'var value'+i+'=input+'+i+';').join('');
 fs.writeFileSync(path.join(dir,'shared.js'),'function importedOnce(input){'+body+'return value19;}');
 for(const name of ['first','second']){const module=path.join(dir,name);fs.mkdirSync(module);fs.writeFileSync(path.join(module,'logic.js'),'const moduleName='+JSON.stringify(name)+';');fs.writeFileSync(path.join(module,'meta.json'),JSON.stringify({logicParts:['../shared.js']}));}
 const run=()=>{const out=path.join(dir,'result.json'),r=spawnSync(process.execPath,['tools/dup_nested.mjs','--modules',dir,'--json',out],{cwd:ROOT,encoding:'utf8',windowsHide:true,timeout:10000});assert.equal(r.status,0,r.stderr);return JSON.parse(fs.readFileSync(out,'utf8'));};
 const shared=run();assert.equal(shared.groups,0);assert.equal(shared.sharedSourceOccurrencesSkipped,1);
 for(const name of ['first','second'])fs.appendFileSync(path.join(dir,name,'logic.js'),'\nfunction independentCopy(input){'+body+'return value19;}');
 const copied=run();assert.equal(copied.groups,1);assert.equal(copied.list[0].name,'independentCopy');assert.equal(copied.list[0].where.length,2);assert.equal(copied.sharedSourceOccurrencesSkipped,1);
});

test('a physical copy of a shared function remains visible in either importing module',t=>{
 const cache=path.join(ROOT,'.cache');fs.mkdirSync(cache,{recursive:true});const temp=fs.mkdtempSync(path.join(cache,'duplicate-edge-'));
 t.after(()=>{const actual=fs.realpathSync(temp),base=fs.realpathSync(cache);assert.ok(actual.startsWith(base+path.sep)&&path.basename(actual).startsWith('duplicate-edge-'));fs.rmSync(actual,{recursive:true});});
 const body=Array.from({length:20},(_,i)=>'var value'+i+'=input+'+i+';').join(''),physical='function sharedAndCopied(input){'+body+'return value19;}';
 for(const copyIn of ['first','second']){
  const dir=path.join(temp,copyIn);fs.mkdirSync(dir);fs.writeFileSync(path.join(dir,'shared.js'),physical);
  for(const name of ['first','second']){const module=path.join(dir,name);fs.mkdirSync(module);fs.writeFileSync(path.join(module,'logic.js'),'const label='+JSON.stringify(name)+';'+(name===copyIn?physical:''));fs.writeFileSync(path.join(module,'meta.json'),JSON.stringify({logicParts:['../shared.js']}));}
  const output=path.join(dir,'result.json'),r=spawnSync(process.execPath,['tools/dup_nested.mjs','--modules',dir,'--json',output],{cwd:ROOT,encoding:'utf8',windowsHide:true,timeout:10000});
  assert.equal(r.status,0,r.stderr);const result=JSON.parse(fs.readFileSync(output,'utf8'));
  assert.equal(result.groups,1,'A real second implementation cannot disappear when copied into '+copyIn);
  assert.equal(result.list[0].name,'sharedAndCopied');assert.equal(result.list[0].where.length,2,'Only two physical implementations, despite three imports/definitions');
  assert.deepEqual(result.list[0].modules,['first','second']);assert.equal(result.list[0].origins.length,2);assert.equal(result.sharedSourceOccurrencesSkipped,1);
 }
});
