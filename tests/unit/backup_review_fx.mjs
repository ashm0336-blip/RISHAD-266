/* Browser host for actual backup entry points and the canonical atomic API.
   Synthetic fixtures only; this file supplies no restore/business policy. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {parse} from 'acorn';
import {world,ok,snap,seedMessage} from './atomic_restore_review_fx.mjs';
import {ROOT,D1,D2,IDS,copy} from './custody_review_fx.mjs';
export {world,ok,snap,seedMessage,ROOT,D1,D2,IDS,copy};
export const OPTIONS='bsdept:'+D1+':bassam_options_v1';
export const tick=()=>new Promise(resolve=>setImmediate(resolve));
export async function until(predicate){for(let n=0;n<300&&!predicate();n++)await tick();assert.ok(predicate(),'Expected asynchronous backup entry point to settle');}
const cache=new Map();
function part(file,type,name){
  if(!cache.has(file)){const source=fs.readFileSync(path.join(ROOT,file),'utf8');cache.set(file,{source,tree:parse(source,{ecmaVersion:'latest',sourceType:'script'})});}
  const {source,tree}=cache.get(file);let found;
  function walk(node){if(!node||typeof node!=='object'||found)return;if(node.type===type&&(node.key?.name||node.id?.name)===name){found=node;return;}Object.values(node).forEach(value=>Array.isArray(value)?value.forEach(walk):walk(value));}
  walk(tree);assert.ok(found,'Actual source entry point: '+file+':'+name);
  return {text:source.slice(found.start,found.end),value:found.value&&source.slice(found.value.start,found.value.end)};
}
export async function backupBrowser(B){
  const requests=[],writes=[],reads=[],toasts=[],states=[],blobs=[],downloads=[],data=ok(await B.api('super','/api/get?keys='+encodeURIComponent(Object.keys(B.keys).concat([OPTIONS]).join(',')))),storage=new Map(Object.entries(data.keys).filter(([,r])=>r.v!==null).map(([k,r])=>[k,r.v]));
  let dsRev=0,intercept;
  const KIVO={
    BassamAuth:{user:()=>B.users.find(user=>user.id===IDS.super),isSuper:()=>true},BassamPerm:{key:()=>true},BassamCount:value=>String(value),
    BassamDepts:{active:()=>D1,activeName:()=> 'TEST_ONLY department',list:()=>B.keys.bassam_depts_v1,allScopedKeys:()=>Array.from(storage.keys()).filter(k=>k.startsWith('bsdept:')),keysOf:d=>Array.from(storage.keys()).filter(k=>k.startsWith('bsdept:'+d+':')),raw:{getItem:k=>{reads.push(k);assert.ok(!/(?:^|:)bassam_(?:dstats|custody|notif(?:_cfg|_sys)?|bc)_v1$/.test(k),'Retired domain must come from the server');return storage.get(k)??null;},setItem(){writes.push('set');throw Error('No local business overlay');},removeItem(){writes.push('delete');throw Error('No local business overlay');}}},
    BassamCrypt:{ok:()=>true},BassamIDB:{allForBackup:async()=>({})},
    DailyStats:{refresh:async()=>{const j=ok(await B.api('super','/api/dstats?uid='+IDS.super));dsRev=j.rev;return j.data;},revision:()=>dsRev},
    BassamNotif:{exportDomain:async dept=>ok(await B.api('super','/api/notifications/export'+(dept?'?dept='+encodeURIComponent(dept):''))),refresh:async()=>({ok:1})},
    Custody:{exportDomain:async dept=>ok(await B.api('super','/api/custody/export'+(dept?'?dept='+encodeURIComponent(dept):'')))},
    __BS_SRV:{askReason:(k,keys,done)=>done('TEST_ONLY actual user reason'),resync:async()=>({ok:1}),dirty:()=>false,inflight:()=>false,sesChanged:()=>false,rev:key=>data.keys[key]?.rev||0},bsConfirm:async()=>true,
  };
  const page={state:{},setState(value){Object.assign(this.state,value);states.push(value);},bkToast:(...args)=>toasts.push(args),bkCapNote:()=>''};
  const fetch=async(url,options={})=>{
    const request={url:String(url),method:options.method||'GET',body:options.body};requests.push(request);
    const headers=new Headers(options.headers||{});headers.set('Cookie','bs_tok=TEST_ONLY_session_super');if(request.method!=='GET')headers.set('Origin','http://x');
    const response=await B.W.default.fetch(new Request('http://x'+url,{...options,headers}),B.env),dto=await response.clone().json();request.status=response.status;request.err=dto.err;
    return intercept?await intercept(request,response):response;
  };
  const context=vm.createContext({KIVO,window:{__BS_BOOT:{srv:1,cf:1,uid:IDS.super,v:data.v},crypto:webcrypto,confirm:()=>true},localStorage:{},fetch,AbortController,setTimeout,clearTimeout,Uint8Array,URLSearchParams,Blob,Date,URL:{createObjectURL(blob){blobs.push(blob);return 'blob:TEST_ONLY';},revokeObjectURL(){}},document:{getElementById:()=>null,body:{appendChild(){}},createElement:()=>({click(){downloads.push(this.download);},remove(){}})},FileReader:class{readAsText(file){this.result=JSON.stringify(file);this.onload();}}});
  vm.runInContext(fs.readFileSync(path.join(ROOT,'src/services/548-atomic-backup.js'),'utf8'),context);
  return {KIVO,context,page,requests,writes,reads,toasts,states,blobs,downloads,
    intercept(fn){intercept=fn;},
    method(file,name){return vm.runInContext('({'+part(file,'MethodDefinition',name).text+'}).'+name,context);},
    property(file,name){return vm.runInContext('(function(){const s=true;return '+part(file,'Property',name).value+';})',context).call(page);},
    func(file,name){return vm.runInContext('('+part(file,'FunctionDeclaration',name).text+')',context);},
  };
}
export async function exportFull(C){
  for(const name of ['_wpActor','_irBackupCapture','_irBackupFence'])C.page[name]=C.method('src/modules/admin/logic.js',name);
  C.property('src/modules/admin/logic.js','exportBackup')();await until(()=>!!C.page._encPend||C.states.some(s=>s.backupMsg));
  assert.ok(C.page._encPend,JSON.stringify(C.page.state));return JSON.parse(C.page._encPend.json);
}
export async function exportDepartment(C){
  let done=false;C.method('src/layouts/root-logic.js','bkExportRun').call(C.page,{preImport:true,cb(){done=true;}});await until(()=>done||C.toasts.length);
  assert.ok(done,JSON.stringify(C.toasts));return JSON.parse(await C.blobs.at(-1).text());
}
export async function seedTypedDomains(B,data){
  await seedMessage(B);
  ok(await B.api('super','/api/dstats',{uid:IDS.super,base:(await B.W.dsDomainRead(B.env)).rev,data,reason:'TEST_ONLY explicit fixture reason'}));
  ok(await B.api('super','/api/custody/act',{uid:IDS.super,dept:D1,base:await B.W.cuRev(B.env,D1),requestId:'TEST_ONLY_backup_catalog',op:'type-create',item:{name:'TEST_ONLY backup stock',qty:2,prefix:'BK',color:'#123456'}}));
}
