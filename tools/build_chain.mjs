#!/usr/bin/env node
/* Usage: node tools/build_chain.mjs 265 [--current|--check-current|--legacy]
 * Runtime bootstrap for the existing build_chain.sh workflow, not another build
 * pipeline. Finds local Python/Bash, reports missing tools, and never installs
 * dependencies, authenticates an account, or makes a network request.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const environment={...process.env};
const windows=process.platform==='win32';
// Windows exposes this key as either Path or PATH. Child processes must receive
// exactly one spelling, or Node can retain a different value than the one set.
const inheritedPathKey=Object.keys(environment).find(key=>key.toLowerCase()==='path');
const inheritedPath=inheritedPathKey ? environment[inheritedPathKey] : '';
if(windows)for(const key of Object.keys(environment))if(key.toLowerCase()==='path')delete environment[key];
environment.PATH=inheritedPath;
const dependencyRoots=[
  path.resolve(path.dirname(process.execPath),'..','..'),
  path.join(os.homedir(),'.cache','codex-runtimes','codex-primary-runtime','dependencies'),
];
const local = values => values.filter(value=>value && fs.existsSync(value));
function probe(command,args,match){
  const result=spawnSync(command,args,{encoding:'utf8',windowsHide:true,timeout:8000});
  return result.status===0 && match(String(result.stdout || '')+String(result.stderr || ''));
}
function findBash(){
  const explicit=environment.KIVO_BASH;
  if(explicit){if(probe(explicit,['--version'],text=>/GNU bash/.test(text)))return explicit;throw new Error('KIVO_BASH does not identify a working Bash runtime.');}
  const standard=windows ? local([
    path.join(environment.ProgramFiles || 'C:/Program Files','Git','bin','bash.exe'),
    path.join(environment.ProgramFiles || 'C:/Program Files','Git','usr','bin','bash.exe'),
    path.join(environment.LOCALAPPDATA || '', 'Programs','Git','bin','bash.exe'),
  ]) : [];
  const bundled=windows ? local(dependencyRoots.map(root=>path.join(root,'native','git','usr','bin','sh.exe'))) : [];
  for(const candidate of ['bash',...standard,...bundled])if(probe(candidate,['--version'],text=>/GNU bash/.test(text)))return candidate;
  throw new Error('Bash was not found. Install Git Bash or set KIVO_BASH to its executable.');
}
function findPython(){
  const explicit=environment.KIVO_PYTHON;
  const inspect=['-c','import sys; assert sys.version_info >= (3,11); print(sys.executable)'];
  const candidates=explicit ? [explicit] : [
    ...local(dependencyRoots.map(root=>path.join(root,'python',windows ? 'python.exe' : 'bin/python3'))),
    ...(windows ? ['python','python3'] : ['python3','python']),
  ];
  for(const candidate of candidates){
    const result=spawnSync(candidate,inspect,{encoding:'utf8',windowsHide:true,timeout:8000});
    if(result.status===0 && result.stdout.trim())return result.stdout.trim();
  }
  throw new Error('Python 3.11+ was not found. Set KIVO_PYTHON to its executable; jsonschema must be installed locally.');
}
try{
  environment.KIVO_BASH=findBash();
  environment.KIVO_PYTHON=findPython();
  environment.KIVO_NODE=process.execPath;
  environment.PYTHONIOENCODING ||= 'utf-8';
  const dependencies=path.join(ROOT,'.cache','python-deps');
  if(fs.existsSync(dependencies))environment.PYTHONPATH=[environment.PYTHONPATH,dependencies].filter(Boolean).join(path.delimiter);
  const bashDirectory=path.dirname(environment.KIVO_BASH);
  // Git Bash's usr/bin holds the shell, while native Git normally lives in
  // cmd (or bin). Keep inherited search paths and expose that sibling only
  // when it contains a real Git executable; missing Git still fails checks.
  const gitDirectories=windows ? [
    path.resolve(bashDirectory,'..','..','cmd'),path.resolve(bashDirectory,'..','cmd'),
    path.resolve(bashDirectory,'..','..','bin'),path.resolve(bashDirectory,'..','bin'),
  ].filter(directory=>fs.existsSync(path.join(directory,'git.exe'))) : [];
  environment.PATH=[path.dirname(process.execPath),bashDirectory,...gitDirectories,inheritedPath].filter(Boolean).join(path.delimiter);
  const result=spawnSync(environment.KIVO_BASH,[path.join(ROOT,'tools','build_chain.sh'),...process.argv.slice(2)],{cwd:ROOT,env:environment,stdio:'inherit',windowsHide:true});
  if(result.error)throw new Error('Could not start the local build workflow: '+result.error.code);
  process.exitCode=result.status ?? 1;
}catch(error){process.stderr.write('Build setup error: '+error.message+'\n');process.exitCode=1;}
