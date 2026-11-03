/* Fixtures for the pre-cutover custody scenarios, exercised through current APIs. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {parse} from 'acorn';
import {ROOT,world,legacyWorld,D1,D2,IDS,EKEYS,copy,identitySnapshot} from './custody_review_fx.mjs';
import {adoptOperationalFixture,replaceOperationalFixture} from './operational_legacy_seed_fx.mjs';
export {ROOT,world,D1,D2,IDS,EKEYS,copy,identitySnapshot};
export const EMP='bsdept:'+D1+':bassam_employees_v1';
const CU='bsdept:'+D1+':bassam_custody_v1';
let sequence=0;
let registry=null;
function operationResources(){
  if(registry)return registry;
  const tree=parse(fs.readFileSync(path.join(ROOT,'src/api/280-server-storage.js'),'utf8'),{ecmaVersion:'latest'});
  (function visit(node){if(!node||typeof node!=='object'||registry)return;if(node.type==='VariableDeclarator'&&node.id?.name==='operationResources9'){registry=Object.freeze(node.init.arguments[0].elements.map(item=>item.value));return;}Object.values(node).forEach(value=>Array.isArray(value)?value.forEach(visit):visit(value));})(tree);
  assert.ok(registry&&registry.includes('bassam_employees_v1'),'Actual Operations resource registry');
  return registry;
}
export function ok(response){
  assert.equal(response.status,200,JSON.stringify({status:response.status,err:response.json?.err}));
  assert.equal(response.json?.ok,1);return response.json;
}
export async function act(A,op,data={},who='super'){
  return A.api(who,'/api/custody/act',{method:'POST',body:{...(who?{uid:IDS[who]}:{}),dept:D1,
    base:await A.W.cuRev(A.env,D1),requestId:'TEST_ONLY_scenario_'+(++sequence),op,...data}});
}
export async function createType(A,item={}){
  return ok(await act(A,'type-create',{item:{name:'TEST_ONLY radio',qty:3,prefix:'TEST',color:'#b99751',...item}})).itemId;
}
export async function read(A,query={},who='super'){
  return ok(await A.api(who,'/api/custody?'+new URLSearchParams({dept:D1,...query})));
}
/* Schema 10 (d5a08a6): the roster is a typed Operations resource. Seed it through the canonical typed
   writer (opChangeStatements) on a registered fixture DB, never as retired KV, and read it back typed. */
export async function setEmployees(A,employees){
  const stored=await replaceOperationalFixture(A.env,EMP,employees);
  assert.deepEqual(stored,JSON.parse(JSON.stringify(employees)),'Typed roster round-trips exactly');
  A.keys[EMP]=copy(employees);
}
export async function historyWorld(document,{mode='enforce'}={}){
  const A=await legacyWorld({mode});
  // This is an actual pre-0006 source. Never inject retired JSON after schema7.
  await A.DB.batch(A.W.kvPutStmts(A.env,'kv',CU,JSON.stringify(document)));
  await A.W.initDb(A.env);
  assert.equal(A.DB.q('SELECT COUNT(*) n FROM kv WHERE k=?1',CU)[0].n,0);
  /* initDb already ran the schema-10 operational cutover: register (never re-cut) so typed seeding works. */
  await adoptOperationalFixture(A.env,A.W);
  assert.equal(A.DB.q('SELECT COUNT(*) n FROM kv WHERE k=?1',EMP)[0].n,0,'No retired KV roster after the cutover');
  return A;
}
export async function pageFor(A,{who='super',employees=A.keys[EMP],absent=[]}={}){
  let can=true;const calls=[],acks=[],errors=[],timers=[];
  const actor=A.users.find(user=>user.id===IDS[who]);assert.ok(actor,'Explicit synthetic UI actor');
  const KIVO={BassamAuth:{user:()=>actor,isSuper:()=>actor.role==='super',users:()=>A.keys.bassam_auth_users_v1},
    BassamDepts:{active:()=>D1},BassamPerm:{can:()=>can,on:()=>true,key:()=>true},
    BassamFind:{filter:(query,rows)=>rows},BassamRing:{one:()=>'',segs:()=>'',pct:(n,total)=>total?Math.round(n/total*100)+'%':'0%'}};
  class Base{
    setState(p,cb){this.state={...this.state,...(typeof p==='function'?p(this.state):p)};cb?.();}
    PC(){return can;}bsOn(){return true;}permDeny(){errors.push({kind:'denied'});}
  }
  KIVO.BassamPageKit={base:()=>Base};KIVO.bsConfirm=async()=>true;
  const storage=new Map([['bassam_employees_v1',JSON.stringify(employees||[])],['bassam_options_v1','{}']]);
  /* Schema 10: the page reads its business data through KIVO.__BS_SRV.operations (employees/logic.js).
     Read-only shim over the same storage map with the real get/text/state contract (src/api/280-server-storage.js
     operationReference9 / operations.state): an unregistered name throws operations-scope-required; a registered
     resource that was read is 'ready' (storage) or known-'absent' (explicit `absent` list) and returns its value or
     null; a registered resource that was never read throws operations-read-required (state 'unloaded').
     Any write path (begin/commit/stage/flush) throws so nothing is written client-side. */
  const resources=operationResources(),knownAbsent=new Set(absent);
  knownAbsent.forEach(name=>assert.ok(resources.includes(name)&&!storage.has(name),'Known-absent fixture resource is registered and not ready'));
  const opState=name=>{if(!resources.includes(name))throw Error('operations-scope-required');return storage.has(name)?'ready':knownAbsent.has(name)?'absent':'unloaded';};
  const opValue=name=>{const state=opState(name);if(state==='ready')return JSON.parse(storage.get(name));if(state==='absent')return null;throw Error('operations-read-required');};
  const refuse=name=>()=>{throw Error('TEST_ONLY read-only operations shim: '+name);};
  KIVO.__BS_SRV={operations:Object.freeze({resources,get:opValue,text:name=>{const value=opValue(name);return value===null?null:JSON.stringify(value);},
    state:opState,
    begin:refuse('begin'),commit:refuse('commit'),stage:refuse('stage'),flush:refuse('flush'),retry:refuse('retry'),draft:refuse('draft')})};
  const W={KIVO,DCLogic:Base,console,Intl,Date,Math,JSON,crypto:crypto.webcrypto,URLSearchParams,AbortController,Uint8Array,
    __BS_BOOT:{srv:1,cf:1,uid:actor.id},setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){},setInterval:()=>0,clearInterval(){},
    document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]},navigator:{userAgent:'TEST_ONLY'},
    localStorage:{getItem:key=>{assert.ok(!key.includes('custody'),'No retired custody document read');return storage.get(key)||null;},
      setItem(key,value){assert.ok(!key.includes('custody'),'No retired custody document write');storage.set(key,value);}},
    fetch:async(url,options={})=>{
      calls.push({url,body:options.body});
      const headers={...options.headers,Cookie:'bs_tok=TEST_ONLY_session_'+who};
      if(options.method==='POST')headers.Origin='http://x';
      return A.W.default.fetch(new Request('http://x'+url,{method:options.method||'GET',headers,...(options.body?{body:options.body}:{})}),A.env);
    }};
  W.window=W;W.globalThis=W;vm.createContext(W);
  const source=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
  vm.runInContext(source('src/services/440-count.js'),W);
  vm.runInContext(source('src/services/547-custody-api.js'),W);
  vm.runInContext(source('src/modules/employees/logic.js')+'\nglobalThis.TEST_ONLY_Page=Component;',W);
  const page=new W.TEST_ONLY_Page();
  page.permDeny=()=>errors.push({kind:'denied'});
  page.bsToast=(message,kind)=>errors.push({message,kind});
  page.bsAck=(message,kind)=>{acks.push({message,kind});return Promise.resolve(true);};
  page.state.empTab='store';await page._cuRefresh();
  return{page,W,calls,acks,errors,setCan(value){can=value;}};
}
