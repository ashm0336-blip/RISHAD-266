/* Canonical custody transport QA. Synthetic data; no external network or Cloudflare calls. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {ROOT} from './custody_review_fx.mjs';
import vm from 'node:vm';
import crypto from 'node:crypto';

const code=fs.readFileSync(path.join(ROOT,'src/services/547-custody-api.js'),'utf8');
const copy=value=>JSON.parse(JSON.stringify(value));
const response=(body,status=200)=>({ok:status>=200&&status<300,status,json:async()=>copy(body)});
const dto=overrides=>Object.assign({ok:1,rev:3,clock:{y:1448,m:5,d:19},rows:[],total:0,next:null},overrides);
function browser(fetch){
  let actor={id:'TEST_ONLY_manager'},dept='TEST_ONLY_department';const calls=[];
  const KIVO={BassamAuth:{user:()=>actor},BassamDepts:{active:()=>dept}};
  const W={KIVO,__BS_BOOT:{srv:1,cf:1,uid:actor.id},crypto:crypto.webcrypto,URLSearchParams,AbortController,Uint8Array,setTimeout,clearTimeout,
    localStorage:{getItem(){throw Error('No business storage read permitted');},setItem(){throw Error('No business storage write permitted');}},
    fetch:async(url,options)=>{calls.push({url,options});return fetch(url,options);}};
  W.window=W;vm.createContext(W);vm.runInContext(code,W,{filename:path.join(ROOT,'src/services/547-custody-api.js')});
  return {api:W.KIVO.Custody,calls,switchActor(){actor={id:'TEST_ONLY_other'};W.__BS_BOOT.uid=actor.id;},switchDept(){dept='TEST_ONLY_other_department';}};
}
test('bounded relative API reads use the current actor, never storage, and detach returned DTOs',async()=>{
  const original=dto({rows:[{holderKey:'TEST_ONLY_holder'}],total:1});const B=browser(async()=>response(original));
  const read=await B.api.read({view:'month',year:1448,month:5,limit:25});assert.equal(read.ok,1);
  const url=new URL(B.calls[0].url,'http://localhost');assert.equal(url.pathname,'/api/custody');assert.equal(url.searchParams.get('uid'),'TEST_ONLY_manager');assert.equal(url.searchParams.get('limit'),'25');
  read.data.rows[0].holderKey='changed';assert.equal(original.rows[0].holderKey,'TEST_ONLY_holder');
  assert.equal((await B.api.read({limit:201})).ok,0);assert.equal(B.calls.length,1);
});
test('mutation waits for a complete ACK and reuses the identical idempotent body on retry',async()=>{
  let settle,network=true;const B=browser(async(url,options)=>{if(network)throw Error('TEST_ONLY offline');return await new Promise(resolve=>{settle=()=>{const b=JSON.parse(options.body);resolve(response({ok:1,rev:4,requestId:b.requestId,op:b.op,n:1,outputs:[{issueId:'TEST_ONLY_issue',moveId:'TEST_ONLY_move',serial:'RD-001'}]}));};});});
  const data={itemId:'TEST_ONLY_item',holderKey:'TEST_ONLY_holder'},ticket=B.api.prepare('issue',data,3);data.itemId='changed';
  assert.equal((await B.api.send(ticket)).ok,0);const first=B.calls[0].options.body;network=false;
  let finished=false;const pending=B.api.send(ticket).then(value=>{finished=true;return value;});await Promise.resolve();assert.equal(finished,false);assert.equal(B.calls[1].options.body,first);assert.equal(JSON.parse(first).itemId,'TEST_ONLY_item');
  settle();const result=await pending;assert.equal(result.ok,1);assert.equal(result.receipt.outputs[0].serial,'RD-001');
});
test('a conflict or malformed receipt cannot become an acknowledged success',async()=>{
  for(const bad of [response({ok:0,err:'conflict'},409),response({ok:1,rev:4,n:1,outputs:[]}),response({ok:1,rev:'4',requestId:'forged',op:'issue',n:1,outputs:[]})]){
    const B=browser(async()=>bad),ticket=B.api.prepare('issue',{itemId:'TEST_ONLY_item',holderKey:'TEST_ONLY_holder'},3);assert.equal((await B.api.send(ticket)).ok,0);
  }
});
test('old-principal and old-department responses are rejected after the network resolves',async()=>{
  for(const change of ['switchActor','switchDept']){
    let settle;const B=browser(async()=>await new Promise(resolve=>{settle=()=>resolve(response(dto()));}));
    const pending=B.api.read({view:'month'});B[change]();settle();const result=await pending;assert.equal(result.ok,0);assert.equal(result.err,'session');
  }
});
test('explicit holder collection rejects revision drift, incomplete pages and identity changes',async()=>{
  for(const kind of ['revision','incomplete','identity']){
    let reads=0,B;B=browser(async()=>{reads++;if(reads===1)return response(dto({rows:[{issueId:'TEST_ONLY_1'}],total:2,next:'TEST_ONLY_cursor'}));if(kind==='identity')B.switchActor();return response(dto({rev:kind==='revision'?4:3,rows:kind==='incomplete'?[]:[{issueId:'TEST_ONLY_2'}],total:2}));});
    const result=await B.api.collectHolder({holderKey:'TEST_ONLY_holder'});assert.equal(result.ok,0,kind);assert.equal(result.rows,undefined,kind+' must not expose a partial printable result');
  }
});
test('holder collection reads one bounded page at a time only on the explicit action',async()=>{
  let reads=0;const B=browser(async()=>response(dto(++reads===1?{rows:[{issueId:'TEST_ONLY_1'}],total:2,next:'TEST_ONLY_cursor'}:{rows:[{issueId:'TEST_ONLY_2'}],total:2})));
  assert.equal(reads,0);const result=await B.api.collectHolder({holderKey:'TEST_ONLY_holder'});assert.equal(result.ok,1);assert.equal(result.rows.length,2);assert.equal(reads,2);
});
test('typed scoped export detaches rows and rejects a different department or duplicate domain',async()=>{
  const domain={version:1,scope:{departmentId:'TEST_ONLY_department'},rows:{items:[{item_id:'TEST_ONLY_item'}],issues:[],moves:[]}};
  const B=browser(async()=>response({ok:1,domains:[domain]}));const exported=await B.api.exportDomain('TEST_ONLY_department');assert.equal(exported.ok,1);exported.domains[0].rows.items[0].item_id='changed';assert.equal(domain.rows.items[0].item_id,'TEST_ONLY_item');
  assert.equal((await B.api.exportDomain('TEST_ONLY_other_department')).ok,0);
  const duplicate=browser(async()=>response({ok:1,domains:[domain,domain]}));assert.equal((await duplicate.api.exportDomain()).ok,0);
});
test('an unavailable export endpoint rejects before a complete backup can be produced',async()=>{
  const B=browser(async()=>response({ok:0,err:'not-found'},404));const result=await B.api.exportDomain();assert.equal(result.ok,0);assert.equal(result.domains,undefined);
});
