/* Actual canonical wipe methods: no storage/R2 side effects before server ACK. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {parse} from 'acorn';
import {ROOT,world as canonicalWorld,D1,IDS,EKEYS} from './custody_review_fx.mjs';
const source=fs.readFileSync(path.join(ROOT,'src/modules/admin/logic.js'),'utf8');
const klass=parse(source,{ecmaVersion:'latest'}).body.find(node=>node.type==='ClassDeclaration'&&node.id.name==='Component');
const DEPT=D1;
const copy=value=>JSON.parse(JSON.stringify(value));
const inventory=(revision=4)=>({ok:1,dept:DEPT,base:{epoch:1,kv:{['bsdept:'+DEPT+':bassam_employees_v1']:revision},custody:revision,notifications:{rev:revision,configRev:1,broadcastRev:1},irshad:{reports:revision,languages:1,locations:1,retro:1},seized:{reports:revision,catalog:1,actions:1,locations:1,jew:1,retro:1},awards:{records:revision,docsV1:1,docsV2:1}},counts:{keys:1,custody:2,notifications:3,irshad:4,seized:5,awards:6}});
const response=(body,status=200)=>({ok:status>=200&&status<300,status,json:async()=>copy(body)});
function world(fetch){
  let uid='TEST_ONLY_super';const calls=[],acks=[],reloads=[],timers=[],prompts=[],syncs=[];let reasonText='';
  const context={KIVO:{BassamAuth:{user:()=>({id:uid,role:'super'}),isSuper:()=>true},BassamDepts:{active:()=>DEPT},__BS_SRV:{resync:value=>syncs.push(value),askReason:(key,keys,done)=>{prompts.push({key,keys});done(reasonText);}}},__BS_BOOT:{srv:1,cf:1,uid},crypto:crypto.webcrypto,AbortController,URLSearchParams,Uint8Array,setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){},location:{reload:()=>reloads.push(true)},fetch:async(url,options)=>{calls.push({url,options});return fetch(url,options);},localStorage:{getItem(){throw Error('No local inventory');},setItem(){throw Error('No local wipe');}}};context.window=context;vm.createContext(context);
  const page={state:{wpDid:'',wpTxt:'',tick:0},setState(p){this.state={...this.state,...p};},bsAck:(...args)=>acks.push(args)};
  for(const name of ['_wpActor','_wpCall','_businessBaseValid','wpOpen','wpReview','wpGo','wpClose']){const node=klass.body.body.find(node=>node.type==='MethodDefinition'&&node.key.name===name);assert.ok(node,name);page[name]=vm.runInContext('({'+source.slice(node.start,node.end)+'}).'+name,context);}
  return {page,calls,acks,reloads,timers,prompts,syncs,setReason(value){reasonText=value;},switchActor(){uid='TEST_ONLY_other_super';context.__BS_BOOT.uid=uid;}};
}
function receipt(options,revision=5){const body=JSON.parse(options.body);return {ok:1,dept:body.dept,requestId:body.requestId,rev:revision,counts:{keys:1,custody:2,notifications:3,irshad:4,seized:5,awards:6}};}

test('wipe reads the server inventory and waits for a matching complete receipt before success/reload',async()=>{
  let settle;const B=world(async(url,options)=>options.method==='GET'?response(inventory()):await new Promise(resolve=>{settle=()=>resolve(response(receipt(options)));}));
  await B.page.wpOpen(DEPT);B.page.setState({wpTxt:'TEST_ONLY confirmation'});const pending=B.page.wpGo(DEPT);await Promise.resolve();assert.equal(B.acks.length,0);assert.equal(B.reloads.length,0);assert.equal(B.page.state.wpDid,DEPT);
  await B.page.wpGo(DEPT);assert.equal(B.calls.filter(call=>call.options.method==='POST').length,1,'duplicate click while pending');
  settle();await pending;assert.equal(B.acks.length,1);assert.equal(B.page.state.wpDid,'');assert.equal(B.reloads.length,0,'reload is scheduled only after ACK');
});
test('uncertain wipe network result retains confirmation and retries the identical body',async()=>{
  let offline=true;const B=world(async(url,options)=>{if(options.method==='GET')return response(inventory());if(offline)throw Error('TEST_ONLY network');return response(receipt(options));});
  await B.page.wpOpen(DEPT);B.page.setState({wpTxt:'TEST_ONLY retained'});await B.page.wpGo(DEPT);assert.equal(B.acks.length,0);assert.equal(B.page.state.wpTxt,'TEST_ONLY retained');assert.equal(B.page.state.wpDid,DEPT);
  const first=B.calls.at(-1).options.body;offline=false;await B.page.wpGo(DEPT);assert.equal(B.calls.at(-1).options.body,first);assert.equal(B.acks.length,1);
});
test('409 keeps the captured base and confirmation until explicit server inventory review',async()=>{
  let version=4,conflict=true;const B=world(async(url,options)=>options.method==='GET'?response(inventory(version)):conflict?response({ok:0,err:'conflict'},409):response(receipt(options)));
  await B.page.wpOpen(DEPT);const base=B.page.state.wpBase;B.page.setState({wpTxt:'TEST_ONLY retained'});await B.page.wpGo(DEPT);assert.equal(B.page.state.wpBase,base);assert.equal(B.page.state.wpTxt,'TEST_ONLY retained');assert.equal(B.page.state.wpNeedsReview,true);
  const n=B.calls.length;await B.page.wpGo(DEPT);assert.equal(B.calls.length,n,'no hidden rebase or POST while review required');version=9;await B.page.wpReview(DEPT);assert.equal(B.page.state.wpTxt,'TEST_ONLY retained');assert.equal(B.page.state.wpBase.custody,9);conflict=false;await B.page.wpGo(DEPT);assert.equal(B.acks.length,1);
});
test('malformed or stale-principal wipe receipts cannot close the confirmation or show success',async()=>{
  for(const kind of ['bad-receipt','principal']){
    let B;B=world(async(url,options)=>{if(options.method==='GET')return response(inventory());if(kind==='principal')B.switchActor();return response({...receipt(options),...(kind==='bad-receipt'?{requestId:'forged'}:{})});});
    await B.page.wpOpen(DEPT);B.page.setState({wpTxt:'TEST_ONLY retained'});await B.page.wpGo(DEPT);assert.equal(B.acks.length,0,kind);assert.equal(B.page.state.wpDid,DEPT);assert.equal(B.page.state.wpTxt,'TEST_ONLY retained');assert.equal(B.reloads.length,0);
  }
});
test('wipe asks the original reason dialog only after explicit denial and retains the new body on uncertain retry',async()=>{
  let posts=0;const B=world(async(url,options)=>{if(options.method==='GET')return response(inventory());posts++;if(posts===1)return response({ok:0,denied:{['bsdept:'+DEPT+':bassam_employees_v1']:{why:'reason',reasonKeys:['emp.record.bulk.delete']}}},403);if(posts===2)throw Error('TEST_ONLY uncertain reason receipt');return response(receipt(options));});B.setReason('TEST_ONLY approved by operator');await B.page.wpOpen(DEPT);B.page.setState({wpTxt:'TEST_ONLY retain'});await B.page.wpGo(DEPT);assert.equal(B.prompts.length,1);assert.equal(B.page.state.wpDid,DEPT);const calls=B.calls.filter(call=>call.options.method==='POST'),first=JSON.parse(calls[0].options.body),next=JSON.parse(calls[1].options.body);assert.notEqual(first.requestId,next.requestId);assert.equal(next.reason,'TEST_ONLY approved by operator');B.page.wpClose();await B.page.wpReview(DEPT);assert.equal(B.page.state.wpDid,DEPT);assert.equal(B.calls.at(-1).options.body,calls[1].options.body,'no hidden GET/rebase while receipt uncertain');await B.page.wpGo(DEPT);assert.equal(B.prompts.length,1);assert.equal(B.calls.at(-1).options.body,calls[1].options.body);assert.equal(B.acks.length,1);assert.deepEqual(B.syncs,[false]);assert.equal(B.reloads.length,0);
});
test('wipe reason cancellation preserves confirmation and does not invent a server reason',async()=>{
  const B=world(async(url,options)=>options.method==='GET'?response(inventory()):response({ok:0,why:'reason',reasonKeys:['emp.record.bulk.delete']},403));await B.page.wpOpen(DEPT);B.page.setState({wpTxt:'TEST_ONLY retain'});await B.page.wpGo(DEPT);assert.equal(B.prompts.length,1);assert.equal(B.calls.filter(call=>call.options.method==='POST').length,1);assert.equal(B.page.state.wpTxt,'TEST_ONLY retain');assert.equal(B.acks.length,0);
});

test('wipe rejects an inventory or receipt that omits the migrated Irshad domain',async()=>{
  const missing=inventory();delete missing.base.irshad;
  const A=world(async()=>response(missing));await A.page.wpOpen(DEPT);assert.equal(A.page.state.wpBase,null);assert.equal(A.calls.filter(call=>call.options.method==='POST').length,0);
  const B=world(async(url,options)=>{if(options.method==='GET')return response(inventory());const ack=receipt(options);delete ack.counts.irshad;return response(ack);});
  await B.page.wpOpen(DEPT);B.page.setState({wpTxt:'TEST_ONLY preserved'});await B.page.wpGo(DEPT);
  assert.equal(B.acks.length,0);assert.equal(B.page.state.wpDid,DEPT);assert.equal(B.page.state.wpTxt,'TEST_ONLY preserved');assert.equal(B.page._wpUncertain,true);
});

test('wipe rejects an inventory or receipt that omits the seized or awards business domain',async()=>{
  for(const domain of ['seized','awards']){
    for(const part of ['base','count']){const missing=inventory();if(part==='base')delete missing.base[domain];else delete missing.counts[domain];
      const A=world(async()=>response(missing));await A.page.wpOpen(DEPT);assert.equal(A.page.state.wpBase,null,domain+' '+part);assert.equal(A.page.state.wpNeedsReview,true);assert.equal(A.calls.filter(call=>call.options.method==='POST').length,0);}
    const B=world(async(url,options)=>{if(options.method==='GET')return response(inventory());const ack=receipt(options);delete ack.counts[domain];return response(ack);});
    await B.page.wpOpen(DEPT);B.page.setState({wpTxt:'TEST_ONLY preserved'});await B.page.wpGo(DEPT);
    assert.equal(B.acks.length,0,domain);assert.equal(B.page.state.wpDid,DEPT);assert.equal(B.page.state.wpTxt,'TEST_ONLY preserved');assert.equal(B.page._wpUncertain,true);
  }
});

test('actual canonical wipe HTTP removes KV/CU/NF in one acknowledged operation and preserves accounts and department definition',async()=>{
  const base=await canonicalWorld(),W=base.W;
  const api=async(url,options={})=>W.default.fetch(new Request('http://x'+url,{method:options.method||'GET',headers:{Cookie:'bs_tok=TEST_ONLY_session_super',...(options.method==='POST'?{Origin:'http://x','Content-Type':'application/json'}:{})},...(options.body?{body:options.body}:{})}),base.env);
  const owners=base.DB.q("SELECT v FROM kv WHERE k='bassam_auth_users_v1' ORDER BY seq").map(row=>row.v).join(''),depts=base.DB.q("SELECT v FROM kv WHERE k='bassam_depts_v1' ORDER BY seq").map(row=>row.v).join('');
  const item=await api('/api/custody/act',{method:'POST',body:JSON.stringify({uid:IDS.super,dept:D1,base:0,requestId:'TEST_ONLY_wipe_item',op:'type-create',item:{name:'TEST_ONLY wipe stock',qty:1,prefix:'RD',color:'#123456'}})});assert.equal(item.status,200);
  base.DB.exec("INSERT INTO notification_messages(scope,id,kind,department,type,category,priority,channel,title,body,created_at) VALUES('d:"+D1+"','TEST_ONLY_wipe_nf','event','"+D1+"','task_new','task','info','bell','TEST_ONLY','',1)");
  const B=world(api);B.setReason("TEST_ONLY actual wipe confirmation reason");await B.page.wpOpen(D1);assert.ok(B.page.state.wpCounts.notifications>0);await B.page.wpGo(D1);assert.equal(B.acks.length,1);
  assert.equal(base.DB.q('SELECT COUNT(*) n FROM custody_items WHERE department_id=?1',D1)[0].n,0);assert.equal(base.DB.q('SELECT COUNT(*) n FROM notification_messages WHERE department=?1',D1)[0].n,0);
  assert.ok(base.DB.q("SELECT v FROM kv WHERE k='bassam_auth_users_v1' ORDER BY seq").map(row=>row.v).join('')===owners,'account values changed');assert.ok(base.DB.q("SELECT v FROM kv WHERE k='bassam_depts_v1' ORDER BY seq").map(row=>row.v).join('')===depts,'department definition changed');
});
