/* Executes canonical employees callbacks + actual canonical Worker + SQLite. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {ROOT,world as canonicalWorld,D1,IDS,EKEYS} from './custody_review_fx.mjs';
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const copy=value=>JSON.parse(JSON.stringify(value));
async function world(){
  const base=await canonicalWorld(),worker=base.W;
  const calls=[],acks=[],errors=[],timers=[];let fail='';
  const KIVO={BassamAuth:{user:()=>({id:IDS.super,role:'super',name:'TEST_ONLY super'}),isSuper:()=>true,users:()=>base.keys.bassam_auth_users_v1},BassamDepts:{active:()=>D1},BassamPerm:{can:()=>true,on:()=>true,key:()=>true},BassamFind:{filter:(q,list)=>list},BassamRing:{one:()=>'',segs:()=>'',pct:(a,b)=>b?Math.round(a/b*100)+'%':'0%'}};
  const storage=new Map([['bassam_employees_v1',JSON.stringify(base.keys['bsdept:'+D1+':bassam_employees_v1']||[])],['bassam_options_v1','{}']]);
  class Base{setState(p,cb){this.state={...this.state,...(typeof p==='function'?p(this.state):p)};cb?.();}PC(){return true;}bsOn(){return true;}permDeny(){errors.push('denied');}}
  KIVO.BassamPageKit={base:()=>Base};KIVO.bsConfirm=async()=>true;
  const W={KIVO,DCLogic:Base,console,Intl,Date,Math,JSON,crypto:crypto.webcrypto,URLSearchParams,AbortController,Uint8Array,
    __BS_BOOT:{srv:1,cf:1,uid:IDS.super},setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){},setInterval:()=>0,clearInterval(){},
    document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]},navigator:{userAgent:'TEST_ONLY'},
    localStorage:{getItem:key=>{assert.ok(!key.includes('custody'),'No retired business reads');return storage.get(key)||null;},setItem:(key,value)=>{assert.ok(!key.includes('custody'),'No retired business writes');storage.set(key,value);}},
    fetch:async(url,options)=>{
      calls.push({url,body:options.body});if(fail==='before')throw Error('TEST_ONLY offline');
      const headers={...options.headers,Cookie:'bs_tok=TEST_ONLY_session_super'};if(options.method==='POST')headers.Origin='http://x';
      const response=await worker.default.fetch(new Request('http://x'+url,{method:options.method,headers,...(options.body?{body:options.body}:{})}),base.env);
      if(fail==='after'&&options.method==='POST')throw Error('TEST_ONLY lost receipt');return response;
    }};
  W.window=W;W.globalThis=W;vm.createContext(W);
  vm.runInContext(read('src/services/440-count.js'),W);
  vm.runInContext(read('src/services/547-custody-api.js'),W);
  vm.runInContext(read('src/modules/employees/logic.js')+'\nglobalThis.TEST_ONLY_Page=Component;',W);
  const page=new W.TEST_ONLY_Page();page.bsToast=(message,kind)=>errors.push({message,kind});page.bsAck=(message,kind)=>{acks.push({message,kind});return Promise.resolve(true);};
  page.state.empTab='store';await page._cuRefresh();
  const addDraft=(name,qty='2')=>{page._storeVals().stAddOpen();page._storeVals().stFSetName({target:{value:name}});page._storeVals().stFSetQty({target:{value:qty}});return page.state.cuNewF;};
  return {...base,worker,W,page,calls,acks,errors,addDraft,setFailure:value=>{fail=value;}};
}

test('actual catalog callback waits for Worker ACK and commits typed rows without KV storage',async()=>{
  const B=await world();B.addDraft('TEST_ONLY radio');await B.page._storeVals().stFSave();
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM custody_items')[0].n,1);assert.equal(B.acks.length,1);assert.equal(B.page.state.cuStoreF,null);
  assert.equal(B.DB.q("SELECT COUNT(*) n FROM kv WHERE k GLOB '*bassam_custody_v1'")[0].n,0);
});
test('network failure preserves the exact form and ticket; lost ACK retries idempotently',async()=>{
  for(const failure of ['before','after']){
    const B=await world(),draft=B.addDraft('TEST_ONLY retry');B.setFailure(failure);
    await B.page._storeVals().stFSave();assert.equal(B.page.state.cuNewF,draft);assert.ok(B.page.state.cuStoreF);assert.equal(B.acks.length,0);
    const first=B.calls.find(call=>call.body).body;B.setFailure('');await B.page._storeVals().stFSave();
    const bodies=B.calls.filter(call=>call.body).map(call=>call.body);assert.equal(bodies[1],first);assert.equal(B.DB.q('SELECT COUNT(*) n FROM custody_items')[0].n,1);assert.equal(B.acks.length,1);
  }
});
test('CAS conflict keeps the original draft revision until explicit refresh-and-review',async()=>{
  const B=await world(),draft=B.addDraft('TEST_ONLY old form');const ticket=B.W.KIVO.Custody.prepare('type-create',{item:{name:'TEST_ONLY concurrent',qty:1,prefix:'RD',color:'#123456'}},B.page.state.cuData.rev);
  assert.equal((await B.W.KIVO.Custody.send(ticket)).ok,1);await B.page._cuRefresh();
  assert.equal(B.page.state.cuNewF,draft);await B.page._storeVals().stFSave();assert.equal(B.acks.length,0);assert.equal(B.page.state.cuNewF,draft);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM custody_items')[0].n,1);
  await B.page._cuReviewDrafts();assert.notEqual(B.page.state.cuNewF,draft);await B.page._storeVals().stFSave();assert.equal(B.acks.length,1);assert.equal(B.DB.q('SELECT COUNT(*) n FROM custody_items')[0].n,2);
});
test('a newer edit made while an actual server mutation is in flight survives its ACK',async()=>{
  const B=await world();B.addDraft('TEST_ONLY submitted');let resolve,started;
  const begun=new Promise(done=>{started=done;}),original=B.W.fetch;
  B.W.fetch=async(url,options)=>{if(options.method==='POST'){started();await new Promise(done=>{resolve=done;});}return original(url,options);};
  const saving=B.page._storeVals().stFSave();await begun;B.page._storeVals().stFSetName({target:{value:'TEST_ONLY later edit'}});const newer=B.page.state.cuNewF;resolve();await saving;
  assert.equal(B.page.state.cuNewF,newer);assert.ok(B.page.state.cuStoreF);assert.equal(B.acks.length,1);
});

test('the month UI uses global server aggregates while materializing one holder page',async()=>{
  const B=await world();B.addDraft('TEST_ONLY stock','8');await B.page._storeVals().stFSave();const item=B.page.cuCatalog()[0];
  const ticket=B.W.KIVO.Custody.prepare('issue-batch',{lines:[EKEYS.employee1,EKEYS.leader,EKEYS.noView].map(holderKey=>({itemId:item.id,holderKey,condition:'جديد'}))},B.page.state.cuData.rev);
  assert.equal((await B.W.KIVO.Custody.send(ticket)).ok,1);B.page.state.empTab='custody';B.page.state.cuPerPage=1;await B.page._cuRefresh();
  const data=B.page.state.cuData;assert.equal(data.rows.length,1);assert.equal(data.total,3);assert.equal(data.summary.held,3);
  const model=B.page._custodyTableVals(data.year,data.month,data.clock);assert.equal(model.cuRows.length,1);assert.equal(model.ckK1Big,'3');assert.equal(model.ckTotal,'8');
  await B.page._cuPage(2);assert.equal(B.page.state.cuPage,2);assert.equal(B.page.state.cuData.rows.length,1);
});
test('the actual multi-item wizard preserves its draft and creates no partial handover on quota failure',async()=>{
  const B=await world();B.addDraft('TEST_ONLY available','2');await B.page._storeVals().stFSave();B.addDraft('TEST_ONLY unavailable','0');await B.page._storeVals().stFSave();
  const draft=B.page._cuDraft({step:3,eid:EKEYS.employee1,name:'TEST_ONLY recipient',picks:{'TEST_ONLY available':{on:true,cond:'جديد'},'TEST_ONLY unavailable':{on:true,cond:'جديد'}},q:''});B.page.state.cuWiz=draft;const before=B.acks.length;
  await B.page._custodyWizVals().wzNext();assert.equal(B.page.state.cuWiz,draft);assert.equal(B.acks.length,before);assert.equal(B.DB.q('SELECT COUNT(*) n FROM custody_issues')[0].n,0);
});
test('a pre-existing orphan remains visible and returnable without permitting a new issue to it',async()=>{
  const B=await world();B.addDraft('TEST_ONLY orphan stock','2');await B.page._storeVals().stFSave();
  const item=B.page.cuCatalog()[0],ticket=B.W.KIVO.Custody.prepare('issue',{itemId:item.id,holderKey:EKEYS.employee1,condition:'جيد'},B.page.state.cuData.rev);
  assert.equal((await B.W.KIVO.Custody.send(ticket)).ok,1);
  // Fixture-only simulation of an orphan that already exists after a prior
  // external change. This does not bypass or replace the cleanup policy in UI.
  const employees=B.keys['bsdept:'+D1+':bassam_employees_v1'].filter(row=>row.eid!==EKEYS.employee1);
  await B.DB.batch(B.worker.kvPutStmts(B.env,'kv','bsdept:'+D1+':bassam_employees_v1',JSON.stringify(employees)));
  B.page.state.employees=copy(employees);B.page.state.empTab='custody';await B.page._cuRefresh();const data=B.page.state.cuData;
  assert.equal(data.rows[0].orphan,true);const table=B.page._custodyTableVals(data.year,data.month,data.clock);assert.match(table.cuRows[0].name,/TEST_ONLY/);
  table.cuRows[0].openCard();await B.page._cuLoadHolder(EKEYS.employee1);const card=B.page._custodyCardVals(data.year,data.month,data.clock);
  assert.equal(card.ecCanIssue,false);assert.equal(card.ecItems.length,1);const before=B.acks.length;await card.ecItems[0].ret();assert.equal(B.acks.length,before+1);
  assert.equal(B.DB.q("SELECT COUNT(*) n FROM custody_movements WHERE kind='in'")[0].n,1);
});

test('deferred print collection cancels after a selected-month, snapshot, or principal change before creating an iframe',async()=>{
  const B=await world();B.W.KIVO.BassamCssText={fontReady:()=>true};let created=0,printed=0;
  B.W.document.createElement=()=>{created++;return{contentWindow:{print:()=>printed++}};};
  for(const changed of ['month','snapshot','principal']){
    B.W.__BS_BOOT.uid=IDS.super;const original=B.W.KIVO.Custody;let settle,started;
    const begin=new Promise(resolve=>{started=resolve;});
    B.W.KIVO.Custody={...original,collectHolder:async()=>{started();return await new Promise(resolve=>{settle=()=>resolve({ok:1,rows:[{issueId:'TEST_ONLY_print',eid:EKEYS.employee1,item:'TEST_ONLY stock'}]});});}};
    const printing=B.page.cuPrintDoc(EKEYS.employee1);await begin;
    if(changed==='month')B.page.setState({cuMonth:(B.page.state.cuData.month%12)+1});
    if(changed==='snapshot')B.page.setState({cuData:{...B.page.state.cuData}});
    if(changed==='principal')B.W.__BS_BOOT.uid='TEST_ONLY_other';
    settle();await printing;assert.equal(created,0,changed);assert.equal(printed,0,changed);assert.match(B.errors.at(-1).message,/أُلغيت الطباعة/,changed);B.W.KIVO.Custody=original;
  }
});

for(const count of [201,500])test('holder card waits for an acknowledged read and shows server total '+count+' while loading only one 200-row page',async()=>{
  const B=await world();B.addDraft('TEST_ONLY bounded holder stock',String(count));await B.page._storeVals().stFSave();
  const item=B.page.cuCatalog()[0],clock=B.page.state.cuData.clock;
  await B.DB.batch([
    B.DB.prepare("WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM n WHERE i<?3) INSERT INTO custody_issues(department_id,issue_id,item_id,serial,serial_number) SELECT ?1,'TEST_ONLY_page_issue_'||i,?2,'RD-'||i,i FROM n").bind(D1,item.id,count),
    B.DB.prepare("WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM n WHERE i<?4) INSERT INTO custody_movements(department_id,move_id,issue_id,item_id,sequence,kind,holder_key,hijri_year,hijri_month,hijri_day,condition,holder_name_snapshot,presence_mask,created_at) SELECT ?1,'TEST_ONLY_page_move_'||i,'TEST_ONLY_page_issue_'||i,?2,i,'out',?3,?5,?6,1,'جديد','TEST_ONLY holder',65535,1 FROM n").bind(D1,item.id,EKEYS.employee1,count,clock.y,clock.m)
  ]);
  B.page.state.empTab='custody';await B.page._cuRefresh();const data=B.page.state.cuData;assert.equal(data.summary.held,count);B.page._cuOpenHolder(EKEYS.employee1,true);
  let settle,started;const begin=new Promise(resolve=>{started=resolve;}),original=B.W.fetch,readsBefore=B.calls.length;
  B.W.fetch=async(url,options)=>{if(new URL(url,'http://x').searchParams.get('view')==='holder'){started();await new Promise(resolve=>{settle=resolve;});}return original(url,options);};
  const loading=B.page._cuLoadHolder(EKEYS.employee1);await begin;const pending=B.page._custodyCardVals(data.year,data.month,data.clock);assert.equal(pending.ecNoItems,false);assert.equal(pending.ecCount,'—');assert.match(pending.ecBadgeLbl,/جارٍ/);assert.equal(pending.ecStats.length,0);
  settle();await loading;const card=B.page._custodyCardVals(data.year,data.month,data.clock);assert.equal(card.ecCount,String(count));assert.match(card.ecBadgeLbl,new RegExp(String(count)));assert.equal(card.ecNoItems,false);assert.equal(card.ecItems.length,200);assert.equal(card.ecStats.reduce((sum,row)=>sum+Number(row.n),0),200);assert.match(card.ecStatsScope,new RegExp('200 من '+count));assert.equal(card.ecMore,true);
  const fetched=B.calls.slice(readsBefore).map(call=>new URL(call.url,'http://x'));assert.equal(fetched.filter(url=>url.searchParams.get('view')==='holder').length,1);assert.equal(fetched.filter(url=>url.searchParams.get('view')==='moves').length,0,'card counts do not fetch full history');assert.equal(B.page.state.cuHolder.rows.length,200);
});
test('a late movement read for the previous holder cannot be displayed under the newly selected holder',async()=>{
  const B=await world();B.addDraft('TEST_ONLY history stock','2');await B.page._storeVals().stFSave();const item=B.page.cuCatalog()[0],ticket=B.W.KIVO.Custody.prepare('issue-batch',{lines:[EKEYS.employee1,EKEYS.leader].map(holderKey=>({itemId:item.id,holderKey,condition:'جديد'}))},B.page.state.cuData.rev);assert.equal((await B.W.KIVO.Custody.send(ticket)).ok,1);B.page.state.empTab='custody';await B.page._cuRefresh();const data=B.page.state.cuData,original=B.W.fetch;let settle,started;const begin=new Promise(resolve=>{started=resolve;});
  B.W.fetch=async(url,options)=>{const query=new URL(url,'http://x').searchParams;if(query.get('view')==='moves'&&query.get('holderKey')===EKEYS.employee1){started();await new Promise(resolve=>{settle=resolve;});}return original(url,options);};
  B.page.state.cuLogKind="lost";B.page._cuOpenHolder(EKEYS.employee1,true);const initial=B.page._custodyCardVals(data.year,data.month,data.clock);assert.equal(initial.ecNoMoves,false);assert.equal(initial.ecMoves.length,0);const old=B.page._cuLoadMoves(false,EKEYS.employee1);await begin;
  B.page._cuOpenHolder(EKEYS.leader,true);const pending=B.page._custodyCardVals(data.year,data.month,data.clock);assert.equal(pending.ecNoMoves,false);assert.equal(pending.ecMoves.length,0);await B.page._cuLoadMoves(false,EKEYS.leader);settle();await old;
  const final=B.page._custodyCardVals(data.year,data.month,data.clock);assert.equal(B.page.state.cuMoves.key,EKEYS.leader);assert.ok(B.page.state.cuMoves.rows.every(row=>row.eid===EKEYS.leader));assert.equal(final.ecMoves.length,1);assert.equal(final.ecNoMoves,false);assert.match(final.ecMovesProgress,/1 من 1/);
});
