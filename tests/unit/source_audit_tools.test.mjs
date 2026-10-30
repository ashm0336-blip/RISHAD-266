/* Source audit regression fixtures run inside the normal unit discovery. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {PYTHON,ROOT} from './harness.mjs';
test('source-only manifests preserve test ownership and UX inventory follows declared async logic',()=>{
 const r=spawnSync(PYTHON,['tests/unit/source_audit_tools_test.py'],{cwd:ROOT,encoding:'utf8',windowsHide:true,timeout:10000,env:{...process.env,PYTHONIOENCODING:'utf-8'}});
 assert.equal(r.error,undefined,r.error?.message);assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stderr,/Ran 2 tests/);assert.match(r.stderr,/\bOK\b/);
});
