/* SOT-176: the release-audit acceptance criterion is honest disclosure, while
 * R185 and the KIVO_201 negative controls remain unexecuted and need proof. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, PYTHON } from './harness.mjs';

const source=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/sot/KIVO_MASTER_REQUIREMENTS_v6.json'),'utf8'));
const original=source.DATA.find(item=>item.id==='SOT-176');
const report=fs.readFileSync(path.join(ROOT,'docs/RISHAD266_PLAYBOOK.md'),'utf8');
const tool=path.join(ROOT,'tools/trace.py');
const env={...process.env,PYTHONIOENCODING:'utf-8'};
function fixture(t){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rishad266-trace-'));
  t.after(()=>{assert.equal(path.dirname(fs.realpathSync(dir)),fs.realpathSync(os.tmpdir()));assert.ok(path.basename(dir).startsWith('rishad266-trace-'));fs.rmSync(dir,{recursive:true,force:true});});
  const git=spawnSync('git',['init','--quiet',dir],{encoding:'utf8',windowsHide:true});assert.equal(git.status,0,git.stderr || git.error?.message);
  for(const folder of ['tools','docs/sot','reports'])fs.mkdirSync(path.join(dir,folder),{recursive:true});
  fs.copyFileSync(tool,path.join(dir,'tools/trace.py'));
  fs.writeFileSync(path.join(dir,'tools/trace_nonengineering.json'),JSON.stringify({items:{}}));
  const requirements={META:source.META,DATA:[structuredClone(original)]};
  const save=()=>fs.writeFileSync(path.join(dir,'docs/sot/KIVO_MASTER_REQUIREMENTS_v6.json'),JSON.stringify(requirements));
  save();fs.writeFileSync(path.join(dir,'docs/RISHAD266_PLAYBOOK.md'),report);
  const run=(...args)=>spawnSync(PYTHON,[path.join(dir,'tools/trace.py'),...args],{cwd:dir,env,encoding:'utf8',windowsHide:true,timeout:30000});
  return {dir,requirements,save,run,write:text=>fs.writeFileSync(path.join(dir,'docs/RISHAD266_PLAYBOOK.md'),text)};
}

test('the release-audit trace accepts explicit limits while keeping its source status needs-proof',t=>{
  const F=fixture(t);assert.equal(original.kind,'تدقيق إصدار');assert.equal(original.status,'يحتاج إثبات');
  assert.equal(F.run().status,0);const check=F.run('--check');assert.equal(check.status,0,check.stdout+check.stderr);
  const row=JSON.parse(fs.readFileSync(path.join(F.dir,'reports/traceability.json'),'utf8')).rows[0];
  assert.equal(row.status,'يحتاج إثبات');assert.ok(row.code.includes('tools/trace.py'));
  F.requirements.DATA[0].status='مكتمل';F.save();assert.equal(F.run().status,0);
  const changed=F.run('--check');assert.equal(changed.status,1);assert.match(changed.stdout,/source disclosure criterion changed: status/);
});

test('the actual trace check rejects missing disclosure, omitted negative controls and reference-test PASS claims',t=>{
  const F=fixture(t);assert.equal(F.run().status,0);
  for(const bad of [
    report.replace(/<!-- SOT-176_RELEASE_DISCLOSURE_BEGIN -->[\s\S]*?<!-- SOT-176_RELEASE_DISCLOSURE_END -->/,''),
    report.replace(/^- alpha\/racebase:.*$/m,''),
    report.replace('هذه الاختبارات لا تُحتسب ضمن PASS الحالي.','هذه الاختبارات تُحتسب ضمن PASS الحالي.'),
    report+'\nR185 PASS\n',
  ]){
    F.write(bad);const check=F.run('--check');assert.equal(check.status,1,check.stdout+check.stderr);assert.match(check.stdout,/SOT-176 (?:release disclosure|required non-execution|unexecuted reference)/);
  }
});

test('a documentary criterion does not waive another open engineering requirement',t=>{
  const F=fixture(t);F.requirements.DATA.push({id:'SOT-999',title:'TEST_ONLY unimplemented engineering requirement',priority:'P1',status:'جزئي'});F.save();
  assert.equal(F.run().status,0);const check=F.run('--check');assert.equal(check.status,1);assert.match(check.stdout,/\["SOT-999"\]/);
});
