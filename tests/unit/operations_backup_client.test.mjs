/* Actual client export service, deterministic HTTP/image DTOs only. Backend
   decoding, policies and restore are tested separately against Worker/SQLite. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { parse } from 'acorn';
const source=fs.readFileSync('src/services/548-atomic-backup.js','utf8');
const transport=fs.readFileSync('src/api/280-server-storage.js','utf8');
let resources;
function visit(node){if(!node||typeof node!=='object')return;if(node.type==='VariableDeclarator'&&node.id.name==='operationResources9'){assert.equal(node.init.type,'CallExpression');resources=node.init.arguments[0].elements.map(item=>item.value);}for(const v of Object.values(node))if(Array.isArray(v))v.forEach(visit);else if(v&&typeof v==='object')visit(v);}
visit(parse(transport,{ecmaVersion:'latest'}));assert.equal(resources.length,21);
const clone=value=>JSON.parse(JSON.stringify(value)),DEPT='TEST_ONLY_backup',UID='TEST_ONLY_backup_manager';
const codec=vm.createContext({});
vm.runInContext(['019o-operational-codec.js','019p-operations-scheduling.js','019q-operations-people-tasks.js'].map(file=>fs.readFileSync('workers/parts/'+file,'utf8')).join('\n')+'\nvar TEST_ONLY_PREPARED=ocPrepare(OC_SCHEDULING_RESOURCES.concat(OC_PEOPLE_TASK_RESOURCES));function TEST_ONLY_rows(resource,value){var p=ocForResource(TEST_ONLY_PREPARED,resource);return ocPhysicalRows(p,ocConvert(p,"'+DEPT+'",resource,value,true));}',codec);
function page(mutate){
  const calls=[],imageReads=[],boot={srv:1,cf:1,uid:UID,v:7},scope={uid:UID};
  const ops=resources.map(resource=>({version:1,scope:{departmentId:DEPT},resource,rows:{ops_nodes:[]}}));
  const rowNames={irshad:['reports','languages','catalogs','windows'],seized:['resources','reports','items','photos','history','categories','catalogItems','actions','lists','windows'],award:['resources','records','caseTexts','answers','scoreRows','scores','documents','sections','items']};
  const flags={irshad:['reports','languages','locations','retro'],seized:['reports','catalog','actions','locations','jew','retro'],award:['records','docsV1','docsV2']};
  const KIVO={BassamAuth:{user:()=>({id:scope.uid})},__BS_SRV:{dirty:()=>false,inflight:()=>false,sesChanged:()=>false,operations:{resources}},BassamIDB:{get:async id=>{imageReads.push(id);return 'data:image/png;base64,TEST_ONLY';}}};
  const context=vm.createContext({KIVO,window:{__BS_BOOT:boot,crypto:webcrypto},AbortController,setTimeout,clearTimeout,Uint8Array,URLSearchParams,
    fetch:async route=>{
      calls.push(String(route));const kind=/\/api\/(\w+)\/export/.exec(route)[1];let body;
      if(kind==='operations')body={ok:1,version:1,epoch:2,globalRev:7,domains:clone(ops)};
      else body={ok:1,globalRev:7,domains:[{version:1,scope:{departmentId:DEPT},resources:Object.fromEntries(flags[kind].map(k=>[k,false])),rows:Object.fromEntries(rowNames[kind].map(k=>[k,[]]))}]};
      await mutate?.({kind,body,boot,scope,calls});
      return new Response(JSON.stringify(body),{headers:{'Content-Type':'application/json'}});
    }});
  vm.runInContext(source,context);
  return{KIVO,calls,imageReads,boot,scope,export:()=>KIVO.BackupRestore.exportDomains({departments:[DEPT],full:false,v:7,images:{}})};
}
test('The actual backup service requires all21 typed resources and keeps operational image references in the same export',async()=>{
  const f=page(({kind,body})=>{if(kind==='operations')body.domains.find(d=>d.resource==='bassam_plan_v1').rows=clone(codec.TEST_ONLY_rows('bassam_plan_v1',{floors:[{sid:'TEST_ONLY_floor',img:'img_test_only'}]}));});
  const result=await f.export();assert.equal(result.domains.operations.length,21);assert.equal(f.calls.length,4);
  assert.deepEqual(f.imageReads,['img_test_only']);assert.equal(result.images.img_test_only,'data:image/png;base64,TEST_ONLY');
  assert.ok(f.calls.every(route=>route.includes('uid='+encodeURIComponent(UID))&&route.includes('dept='+DEPT)));
});
test('A missing or duplicate operational export resource is rejected without a partial archive',async()=>{
  for(const duplicate of[false,true]){const f=page(({kind,body})=>{if(kind==='operations'){body.domains.pop();if(duplicate)body.domains.push(clone(body.domains[0]));}});await assert.rejects(f.export(),/البيانات التشغيلية/);assert.deepEqual(f.imageReads,[]);}
});
test('A typed row from another department or another resource is rejected before image reads',async()=>{
  for(const field of['department_id','resource']){const f=page(({kind,body})=>{if(kind==='operations')body.domains[0].rows.ops_nodes.push({department_id:DEPT,resource:resources[0],[field]:'TEST_ONLY_foreign'});});await assert.rejects(f.export(),/البيانات التشغيلية/);assert.deepEqual(f.imageReads,[]);}
});
test('A global revision change during export rejects the entire composed backup',async()=>{
  const f=page(({kind,boot})=>{if(kind==='operations')boot.v=8;});await assert.rejects(f.export(),/البيانات التشغيلية/);assert.deepEqual(f.imageReads,[]);
});
test('An account switch while exporting never returns the previous account archive',async()=>{
  const f=page(({kind,scope})=>{if(kind==='operations')scope.uid='TEST_ONLY_other_user';});await assert.rejects(f.export(),/البيانات التشغيلية/);assert.deepEqual(f.imageReads,[]);
});
