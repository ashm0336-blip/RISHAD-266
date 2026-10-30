/* The current build transforms only a derived Worker, with a token proof and
 * surviving production-strip boundaries. Exercise the transformed code itself. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { minProved, sig } from '../../tools/jsmin_tokens.mjs';
import { ROOT, PYTHON, makeTestEnv, client, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';

test('Worker token minification preserves ASI-sensitive line breaks and both tool boundaries',()=>{
  const source=`/* source commentary */
function sample(){return\n{value:'TEST_ONLY'}}
/* @@KIVO_TEST_TOOL_BEGIN TEST_ONLY boundary */
async function enfTestApi(){return {test:true};}
/* @@KIVO_TEST_TOOL_END */
export default sample;
`;
  const output=minProved(source,{preserveTestToolMarkers:true});
  assert.deepEqual(sig(output),sig(source));
  assert.equal(output.includes('source commentary'),false);
  assert.equal((output.match(/@@KIVO_TEST_TOOL_BEGIN/g)||[]).length,1);
  assert.equal((output.match(/@@KIVO_TEST_TOOL_END/g)||[]).length,1);
  assert.match(output,/return\n\{/);
  assert.equal(minProved(source).includes('@@KIVO_TEST_TOOL'),false,'Existing frontend minification remains unchanged');
});

test('the actual token-minified Worker authenticates its explicit test fixture and remains production-strippable',async()=>{
  const source=fs.readFileSync(path.join(ROOT,'workers/_worker.js'),'utf8'),output=minProved(source,{preserveTestToolMarkers:true});
  assert.deepEqual(sig(output),sig(source));
  assert.ok(Buffer.byteLength(output)<Buffer.byteLength(source),'The deploy derivative removes comments and indentation');
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rishad266-worker-build-'));
  const candidate=path.join(temp,'candidate');fs.mkdirSync(candidate);
  const modulePath=path.join(temp,'candidate-worker.mjs');
  fs.writeFileSync(modulePath,output);fs.writeFileSync(path.join(candidate,'_worker.js'),output);
  fs.writeFileSync(path.join(candidate,'index.html'),'<!doctype html><!--BS_BOOT-->');
  let env;
  try{
    env=makeTestEnv({KIVO_AUTHZ_MODE:'enforce'});
    env.DB.db.prepare("INSERT INTO meta(k,v) VALUES('authz_mode','enforce') ON CONFLICT(k) DO UPDATE SET v=excluded.v").run();
    env.__worker=(await import(pathToFileURL(modulePath).href)).default;
    const C=client(env),login=await C.login(TEST_SUPER_USERNAME,TEST_SUPER_PIN);assert.equal(login.ok,true);
    const stats=await C.api('/api/dstats',{cookie:login.ck});assert.equal(stats.status,200);assert.equal(stats.j.ok,1);
    const notices=await C.api('/api/notifications',{cookie:login.ck});assert.equal(notices.status,200);assert.equal(notices.j.ok,1);
    assert.ok(Array.isArray(notices.j.items));
    const result=spawnSync(PYTHON,[path.join(ROOT,'tools/prod_strip.py'),candidate],{encoding:'utf8',env:{...process.env,PYTHONIOENCODING:'utf-8'}});
    assert.equal(result.status,0,result.stderr || result.stdout);
    const stripped=fs.readFileSync(path.join(candidate+'.prod','_worker.js'),'utf8');
    assert.equal(stripped.includes('@@KIVO_TEST_TOOL'),false);
    assert.match(stripped,/async function enfTestApi\(\) \{ return json\(\{ ok: 0, err: 'not-found' \}, 404\); \}/);
    assert.equal(fs.readFileSync(path.join(candidate+'.prod','index.html'),'utf8'),'<!doctype html><!--BS_BOOT-->');
  }finally{
    env?.DB.db.close();
    // This exact directory was created above under the OS test-temp root.
    const resolved=fs.realpathSync(temp),parent=fs.realpathSync(os.tmpdir());
    assert.equal(path.dirname(resolved),parent);assert.ok(path.basename(resolved).startsWith('rishad266-worker-build-'));
    fs.rmSync(resolved,{recursive:true,force:true});
  }
});
