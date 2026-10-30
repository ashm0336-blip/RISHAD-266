/* Current launcher regression: preserve inherited Windows Path, expose native
 * Git beside Git Bash, and reach the existing guard without writing artifacts. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','..');

test('launcher preserves inherited Path and provides usable Git to native Python checks', () => {
  const environment={...process.env};
  const inherited=Object.keys(environment).find(key=>key.toLowerCase()==='path');
  const previous=inherited ? environment[inherited] : '';
  for(const key of Object.keys(environment))if(key.toLowerCase()==='path')delete environment[key];
  const sentinel=path.join(ROOT,'.cache','TEST_ONLY_inherited_path');
  environment[process.platform==='win32' ? 'Path' : 'PATH']=[previous,sentinel].filter(Boolean).join(path.delimiter);
  delete environment.KIVO_BASH;
  delete environment.KIVO_PYTHON;
  delete environment.KIVO_NODE;
  delete environment.PYTHONPATH;
  environment.TEST_ONLY_PATH_SENTINEL=sentinel;
  // Inspect the real production launch call, then let it reach the unsupported
  // release guard. All discovery probes and the native Python/Git probe execute.
  const inspect=`
    import child from 'node:child_process';
    import {syncBuiltinESMExports} from 'node:module';
    const original=child.spawnSync;
    child.spawnSync=function(command,args,options){
      if(args?.[0]?.endsWith('build_chain.sh')){
        const keys=Object.keys(options.env).filter(key=>key.toLowerCase()==='path');
        if(keys.length!==1 || keys[0]!=='PATH' || !options.env.PATH.includes(process.env.TEST_ONLY_PATH_SENTINEL))throw new Error('Inherited Path was lost or duplicated');
        const result=original(options.env.KIVO_PYTHON,['-c','import subprocess; subprocess.run(["git","--version"],check=True,capture_output=True)'],{env:options.env,encoding:'utf8',windowsHide:true,timeout:15000});
        if(result.status!==0)throw new Error('Native Python cannot execute Git: '+(result.error?.code || result.stderr));
        process.stdout.write('TEST_ONLY_PATH_AND_GIT_OK\\n');
      }
      return original.call(this,command,args,options);
    };
    syncBuiltinESMExports();
  `;
  const result=spawnSync(process.execPath,['--import','data:text/javascript,'+encodeURIComponent(inspect),path.join(ROOT,'tools/build_chain.mjs'),'266','--current'],{cwd:ROOT,env:environment,encoding:'utf8',windowsHide:true,timeout:60000});
  assert.equal(result.status,2,result.error?.message || result.stderr || result.stdout);
  assert.match(result.stdout,/TEST_ONLY_PATH_AND_GIT_OK/);
  assert.match(result.stderr,/No current contract is configured for this release/);
  assert.doesNotMatch(result.stderr,/Build setup error|ENOENT/);
});
