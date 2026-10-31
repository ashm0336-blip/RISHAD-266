/* Actual emitted lazy-module factories and 548; no remote browser/cloud calls.
   Copy unchanged to tests/unit/business_browser_wiring.test.mjs after build freeze. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {parse} from 'acorn';
import {ROOT} from './harness.mjs';
import {world, D1, D2, IDS, identitySnapshot} from './business_atomic_fx.mjs';

assert.ok(process.env.KIVO_DIST,'Set KIVO_DIST to the current tested build; do not inspect an older default bundle');
const DIST=path.resolve(ROOT,process.env.KIVO_DIST),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function visit(node,fn){if(!node||typeof node!=='object')return;fn(node);for(const value of Object.values(node))if(Array.isArray(value))value.forEach(child=>visit(child,fn));else if(value&&typeof value==='object')visit(value,fn);}
function built(){
 const manifest=JSON.parse(fs.readFileSync(DIST+'.build.json','utf8')),retained=new Set(manifest.retainedFiles||[]);
 function file(relative){assert.ok(manifest.files[relative],relative+' is registered by the actual build');const bytes=fs.readFileSync(path.join(DIST,relative));assert.equal(bytes.length,manifest.files[relative].bytes);assert.equal(sha(bytes),manifest.files[relative].sha256);return{path:'/'+relative,source:bytes.toString('utf8')};}
 function asset(stem){const matches=Object.keys(manifest.files).filter(file=>new RegExp('^assets/js/'+stem+'\\.[a-f0-9]{10}\\.js$').test(file)&&!retained.has(file));assert.equal(matches.length,1,stem+' has one current emitted asset');return file(matches[0]);}
 const index=file('index.html'),scripts=[...index.source.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g)].map(match=>match[1]),loader=asset('030-pages-loader'),maps={};
 visit(parse(loader.source,{ecmaVersion:'latest'}),node=>{if(node.type==='AssignmentExpression'&&node.left.type==='MemberExpression'&&['__resources','__dcLogic'].includes(node.left.property.name)&&node.right.type==='ObjectExpression'){assert.equal(maps[node.left.property.name],undefined);maps[node.left.property.name]=JSON.parse(loader.source.slice(node.right.start,node.right.end));}});
 function page(name){const relative=maps.__dcLogic[name].slice(1),html=maps.__resources['./'+name+'.dc.html'];assert.ok(html);file(html.slice(1));return file(relative);}
 return{asset,page,scripts,maps};
}
function environment(){
 const forbidden=[],no=operation=>{forbidden.push(operation);throw Error('Forbidden device/network operation: '+operation);},C={console,Intl,Date,URLSearchParams,AbortController,Uint8Array,
  fetch:()=>no('fetch'),setTimeout:()=>no('timer'),clearTimeout(){},document:{addEventListener(){},removeEventListener(){},getElementById(){return null;}},
  localStorage:new Proxy({},{get:()=>no('localStorage')}),sessionStorage:new Proxy({},{get:()=>no('sessionStorage')}),indexedDB:new Proxy({},{get:()=>no('indexedDB')})};
 C.window=C;vm.createContext(C);return{C,forbidden};
}

test('actual lazy registry reaches both business bundles exactly once, with one module-scoped transport each and no shell business service',()=>{
 const B=built(),loader=B.asset('030-pages-loader'),backup=B.asset('548-atomic-backup');
 for(const asset of [loader,backup])assert.equal(B.scripts.filter(file=>file===asset.path).length,1);
 assert.equal(B.scripts.some(file=>/business-cloud|Seized\.logic|Award\.logic/.test(file)),false,'Business transport remains inside lazy module bundles');
 for(const name of ['Seized','Award']){
  const asset=B.page(name),tree=parse(asset.source,{ecmaVersion:'latest'});let helpers=0,sessions=0,factories=0;
  visit(tree,node=>{
   if(node.type==='CallExpression'&&node.callee.type==='MemberExpression'&&node.callee.object.name==='Object'&&node.callee.property.name==='assign'&&node.arguments.some(arg=>arg.type==='ObjectExpression'&&arg.properties.some(property=>property.key?.name==='_bcMutate')))helpers++;
   if(node.type==='AssignmentExpression'&&node.left.type==='MemberExpression'&&node.left.object.name==='Component'&&node.left.property.name==='_businessSessions')sessions++;
   if(node.type==='AssignmentExpression'&&node.left.type==='MemberExpression'&&node.left.computed&&node.left.property.value===name&&node.right.type==='FunctionExpression')factories++;
  });
  assert.equal(helpers,1,name+': the declared logicPart is present once');assert.equal(sessions,1,name+': one memory-only session container');assert.equal(factories,1,name+': one registered lazy factory');
 }
});

for(const name of ['Seized','Award'])test('actual emitted '+name+' factory includes callable typed transport and fails anonymous requests before storage/network',async()=>{
 const B=built(),{C,forbidden}=environment();
 for(const stem of ['005-kivo-ns','565-page-kit','548-atomic-backup']){const asset=B.asset(stem);vm.runInContext(asset.source,C,{filename:asset.path});}
 const Count=(n,label)=>n+' '+label;Count.pair=(key,n)=>({[key]:n});Count.agr=()=>'';
 C.KIVO.BassamCount=Count;C.KIVO.BassamAuth={user:()=>null};C.KIVO.BassamDepts={active:()=>null};
 class Base{hToday(){return{y:1448,m:5,d:19};}_hfmt(){return new Intl.DateTimeFormat('en-u-ca-islamic-umalqura',{year:'numeric',month:'numeric',day:'numeric'});}setState(value){Object.assign(this.state,typeof value==='function'?value(this.state):value);}bsOn(){return false;}}
 const asset=B.page(name);vm.runInContext(asset.source,C,{filename:asset.path});
 const Component=C.__dcLogicDefs[name](Base,Base,{}),page=new Component();
 for(const method of ['_bcRead','_bcCollect','_bcMutate','_bcMount','_bcDispose','_businessSpec','_businessAckValid','_businessReadValid'])assert.equal(typeof page[method],'function',name+'.'+method);
 assert.equal(page._businessSpec().path,name==='Seized'?'/api/seized':'/api/award');assert.equal(page._bcContext(),null);
 assert.equal((await page._bcRead('records')).status,401);assert.equal((await page._bcMutate('create',{data:{}})).status,401);
 assert.equal(Object.isFrozen(C.KIVO.BackupRestore),true);assert.equal(typeof C.KIVO.BackupRestore.exportDomains,'function');assert.equal(C.KIVO.BackupRestore.context(),null);
 assert.deepEqual(forbidden,[]);assert.equal(C.KIVO.BusinessCloud,undefined);
});

test('actual emitted 548 exports all four canonical HTTP business domains with every declared department and one explicit read-only global Award scope',async t=>{
 const B=await world({schema:10});t.after(()=>B.DB.db.close());
 const perms=JSON.parse(JSON.stringify(B.keys.bassam_perms_v1));Object.values(perms.caps).forEach(caps=>caps.push('irshad','seized','award'));await B.put('bassam_perms_v1',perms,true);
 const revision=(await B.api('super','/api/get?keys=&uid='+IDS.super)).json.v,protectedBefore=identitySnapshot(B.DB),calls=[],assets=built(),{C,forbidden}=environment();
 for(const stem of ['005-kivo-ns','548-atomic-backup']){const asset=assets.asset(stem);vm.runInContext(asset.source,C,{filename:asset.path});}
 C.__BS_BOOT={srv:1,cf:1,uid:IDS.super,v:revision};C.KIVO.BassamAuth={user:()=>B.users.find(user=>user.id===IDS.super)};
 const resources=B.canonicalW.opDefinitions().map(definition=>definition.resource);
 C.KIVO.__BS_SRV={dirty:()=>false,inflight:()=>false,sesChanged:()=>false,operations:{resources}};
 let objects=0;B.env.IMG_R2=new Proxy({},{get(){objects++;throw Error('Empty typed export cannot call R2');}});
 C.setTimeout=()=>1;
 C.fetch=async(url,options)=>{const headers=new Headers(options.headers);headers.set('Cookie','bs_tok=TEST_ONLY_session_super');const response=await B.W.default.fetch(new Request('http://x'+url,{...options,headers}),B.env);calls.push({url:new URL('http://x'+url),status:response.status});return response;};
 const result=await C.KIVO.BackupRestore.exportDomains({departments:[D1,D2],full:true,v:revision,images:{}});
 assert.deepEqual(Array.from(Object.keys(result.domains)).sort(),['awards','irshad','operations','seized']);assert.deepEqual(Array.from(Object.keys(result.images)),[]);
 assert.deepEqual(calls.map(call=>call.url.pathname),['/api/irshad/export','/api/seized/export','/api/award/export','/api/operations/export']);
 assert.ok(calls.every(call=>call.status===200&&call.url.searchParams.get('uid')===IDS.super));
 for(const name of ['irshad','seized'])assert.deepEqual(Array.from(result.domains[name],domain=>domain.scope.departmentId),[D1,D2]);
 assert.deepEqual(Array.from(result.domains.awards,domain=>domain.scope.kind==='global'?'':domain.scope.departmentId),[D1,D2,'']);
 assert.deepEqual(Array.from(result.domains.operations,domain=>domain.scope.departmentId+'\0'+domain.resource).sort(),[D1,D2].flatMap(dept=>resources.map(resource=>dept+'\0'+resource)).sort());
 assert.deepEqual(identitySnapshot(B.DB),protectedBefore);assert.equal(objects,0);assert.deepEqual(forbidden,[]);assert.deepEqual(B.DB.q('PRAGMA foreign_key_check'),[]);
});
