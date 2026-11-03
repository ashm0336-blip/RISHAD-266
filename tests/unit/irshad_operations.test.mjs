/* Actual typed command, authorization, notification and SQLite transaction paths.
   Synthetic identities only. No external requests or patched business rules. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {world,seed,D1,D2,IDS,identitySnapshot} from './irshad_domain_fx.mjs';
import {EKEYS} from './custody_review_fx.mjs';
import {replaceOperationalFixture} from './operational_legacy_seed_fx.mjs';
const copy=x=>JSON.parse(JSON.stringify(x));
const EXTRA=['irAct','irQueryContext','irRead','cuClock','NF_REV','canRead','retroApi'];
const SHIFT='TEST_ONLY_shift_A', OTHER_SHIFT='TEST_ONLY_shift_B';
let serial=0;
function snapshot(B){
  const tables=['kv','meta','revs','aud','authz','sec','irshad_reports','irshad_report_languages','irshad_catalog_entries','irshad_retro_windows','irshad_requests']
    .concat(B.DB.q("SELECT name FROM sqlite_master WHERE type='table' AND name GLOB 'notification_*' ORDER BY name").map(row=>row.name));
  return Object.fromEntries(tables.map(table=>[table,copy(B.DB.q('SELECT * FROM '+table))]));
}
async function put(B,key,value,{bump=true}={}){
  const statements=B.W.kvPutStmts(B.env,'kv',key,JSON.stringify(value));
  if(bump)statements.push(B.DB.prepare('INSERT INTO revs(k,rev)VALUES(?1,1)ON CONFLICT(k)DO UPDATE SET rev=rev+1').bind(key));
  await B.DB.batch(statements);
}
function rawPut(B,key,value){
  B.DB.db.prepare('DELETE FROM kv WHERE k=?').run(key);
  B.DB.db.prepare('INSERT INTO kv(k,seq,v)VALUES(?,0,?)').run(key,JSON.stringify(value));
}
async function fixture({notify=false}={}){
  const B=await world({extraExports:EXTRA}),permissions=copy(B.keys.bassam_perms_v1);
  for(const id of Object.keys(permissions.caps))permissions.caps[id]=[...new Set(permissions.caps[id].concat('irshad'))];
  await put(B,'bassam_perms_v1',permissions);
  await put(B,'bsdept:'+D1+':bassam_scope_v1',{ceiling:{Site:{mode:'ALL'},'Zone/Element':{mode:'ALL'}},emp:{
    [EKEYS.employee1]:{Shift:{mode:'list',list:[SHIFT]}},[EKEYS.noView]:{Shift:{mode:'list',list:[SHIFT]}}}});
  if(notify)B.DB.db.prepare('INSERT INTO notification_type_overrides(type_id,enabled)VALUES(?,1)').run('ir_new');
  const actor=who=>B.W.actorOf(B.env,IDS[who]);
  const base=async(who='super')=>copy((await B.W.irQueryContext(B.env,await actor(who),D1,{write:true})).base);
  const body=async(op,extra={},who='super')=>({uid:IDS[who],dept:D1,requestId:'TEST_ONLY_ir_operation_'+ ++serial,base:await base(who),op,reason:'TEST_ONLY reviewed operation',...extra});
  const act=async(b,who='super')=>B.W.irAct(B.env,await actor(who),b,{ip:'TEST_ONLY',dev:'TEST_ONLY'});
  const read=async(who='super',q={})=>B.W.irRead(B.env,await actor(who),{dept:D1,view:'records',year:B.W.cuClock().y,month:B.W.cuClock().m,limit:200,...q});
  return Object.assign(B,{permissions,actor,base,body,act,read,today:B.W.cuClock()});
}
function data(B,patch={}){return {...B.today,shift:SHIFT,eid:EKEYS.employee1,loc:'TEST_ONLY location',langs:[{lang:'TEST_ONLY language',count:3}],bro:2,pros:1,pol:0,...patch};}
function patchData(row,patch={}){return Object.fromEntries(['shift','eid','loc','langs','bro','pros','pol'].map(name=>[name,copy(row[name])]).concat(Object.entries(patch)));}
async function grant(B,keys){await put(B,'bsdept:'+D1+':bassam_grants_v1',{v:1,emp:{[EKEYS.employee1]:{plus:keys,minus:[]}}});}
function stored(B,id,patch={}){return {id,...B.today,ts:10,shift:SHIFT,eid:EKEYS.employee1,name:'TEST_ONLY historical snapshot',loc:'TEST_ONLY location',langs:[{lang:'TEST_ONLY',count:1}],bro:1,pros:0,pol:0,...patch};}
function past(B){return B.today.m>1?{y:B.today.y,m:B.today.m-1}:{y:B.today.y-1,m:12};}
async function retro(B,scope,{act='open',id,who='super'}={}){
  return B.api(who,'/api/retro',{method:'POST',body:act==='close'?{res:'irshad',dept:D1,act,id}:{res:'irshad',dept:D1,act,scope,hours:1,reason:'TEST_ONLY authorized recovery'}});
}
async function restoreExport(B,domain){
  const A=await B.actor('super'),scope={kind:'dept',departmentId:D1},nf=await B.canonicalW.nfRead(B.env),notifications={version:1};
  for(const name of ['messages','targets','states','dedup','overrides','checkpoints'])notifications[name]=['overrides','checkpoints'].includes(name)?[]:
    nf[name].filter(row=>(name==='states'?row.message_scope:row.scope)==='d:'+D1);
  const custody=(await B.canonicalW.cuExport(B.env,A,new URL('http://x/export?dept='+D1))).domains,
    body={version:1,requestId:'TEST_ONLY_sparse_restore_'+ ++serial,scope,mode:'replace',reason:'TEST_ONLY sparse restore',
      base:(await B.W.rsRestoreInventory(B.env,A,scope)).base,keys:{},delete:[],domains:{notifications,custody,irshad:[domain],...Object.fromEntries(await Promise.all(B.W.bdDefinitions().map(async def=>[def.name,[await def.exportDomain(B.env,D1)]])))},
      manifest:{version:4,scope:'dept',domains:{kv:1,notifications:1,custody:1,irshad:1,seized:1,awards:1,operations:1},departments:[D1],keys:[]}};
  const exported=await B.api('super','/api/operations/export?uid='+IDS.super+'&dept='+encodeURIComponent(D1));assert.equal(exported.status,200,JSON.stringify(exported.json));body.domains.operations=exported.json.domains;
  return B.W.rsCommit(B.env,A,await B.W.rsPrepare(B.env,A,body,{}),{});
}

test('real create/read/edit/delete preserve server identity and sparse survivor export/restore',async()=>{
  const B=await fixture(),identity=identitySnapshot(B.DB),first=await B.act(await B.body('create',{data:data(B)})),second=await B.act(await B.body('create',{data:data(B,{bro:4})}));
  assert.notEqual(first.id,second.id);assert.match(first.id,/^ir-/);
  let page=await B.read();const original=page.rows.find(row=>row.id===first.id);
  assert.equal(original.name,B.users.find(u=>u.id===IDS.employee1).name);assert.equal(original.actor,B.users.find(u=>u.id===IDS.super).name);
  assert.ok(original.ts>0);
  await B.act(await B.body('edit',{id:first.id,data:patchData(original,{bro:7})}));
  page=await B.read();const edited=page.rows.find(row=>row.id===first.id);
  assert.equal(edited.bro,7);assert.equal(edited.ts,original.ts);assert.equal(edited.id,original.id);assert.ok(edited.editedTs>=original.ts);
  await B.act(await B.body('delete',{id:first.id}));
  const exported=await B.W.irExport(B.env,await B.actor('super'),new URL('http://x/export?dept='+D1));
  assert.equal(exported.domains[0].rows.reports.length,1);assert.equal(exported.domains[0].rows.reports[0].sequence,1);
  await restoreExport(B,exported.domains[0]);
  const after=await B.W.irSnapshot(B.env,D1);assert.equal(after.rows.reports[0].sequence,1);assert.equal(after.rows.reports[0].report_id,second.id);
  assert.deepEqual(identitySnapshot(B.DB),identity);
});

test('typed validator preserves valid sparse report/window positions and rejects invalid or duplicate sequences',async()=>{
  const B=await fixture(),domain=B.W.irConvert(D1,{reports:{reports:[stored(B,'TEST_ONLY_A'),stored(B,'TEST_ONLY_B')]},retro:{v:1,windows:[
    {id:'TEST_ONLY_W1',scope:{y:B.today.y,m:B.today.m,d:1}},{id:'TEST_ONLY_W2',scope:{y:B.today.y,m:B.today.m,d:2}}]}});
  domain.rows.reports[0].sequence=7;domain.rows.reports[1].sequence=100;
  domain.rows.windows[0].sequence=9;domain.rows.windows[1].sequence=77;
  const validated=B.W.irValidateDomain(domain,D1);
  assert.deepEqual(validated.rows.reports.map(row=>row.sequence),[7,100]);assert.deepEqual(validated.rows.windows.map(row=>row.sequence),[9,77]);
  for(const kind of ['reports','windows'])for(const bad of [-1,0.5,Infinity,NaN,Number.MAX_SAFE_INTEGER+1,'7',null]){
    const altered=copy(domain);altered.rows[kind][0].sequence=bad;
    assert.throws(()=>B.W.irValidateDomain(altered,D1),e=>e.irCode==='irshad-domain-sequence');
  }
  for(const kind of ['reports','windows']){const altered=copy(domain);altered.rows[kind][1].sequence=altered.rows[kind][0].sequence;assert.throws(()=>B.W.irValidateDomain(altered,D1),e=>e.irCode==='irshad-domain-sequence');}
});

test('catalog replacement creates, edits and empties ordered choices without changing report snapshots',async()=>{
  const B=await fixture();await seed(B,{reports:{reports:[stored(B,'TEST_ONLY_historic')]}});
  for(const kind of ['languages','locations'])for(const values of [['TEST_ONLY A'],['TEST_ONLY B','TEST_ONLY C'],[]]){
    const ack=await B.act(await B.body('catalog-replace',{kind,values}));assert.equal(ack.n,values.length);
    const read=await B.read('super',{view:'catalogs'});assert.deepEqual(read.catalogs[kind].values,values);assert.equal(read.catalogs[kind].present,true);
  }
  for(const kind of ['languages','locations']){
    const before=snapshot(B);
    await assert.rejects(B.act(await B.body('catalog-replace',{kind,values:['TEST_ONLY duplicate','TEST_ONLY duplicate','']})),e=>e.irDecision?.why==='dup');
    assert.deepEqual(snapshot(B),before);
  }
  const historic=B.W.irInflate(await B.W.irSnapshot(B.env,D1)).reports.reports[0];
  assert.equal(historic.name,'TEST_ONLY historical snapshot');assert.deepEqual(historic.langs,[{lang:'TEST_ONLY',count:1}]);
});

test('same employee identity retains its historic name after employee removal',async()=>{
  const B=await fixture(),created=await B.act(await B.body('create',{data:data(B)})),original=(await B.read()).rows[0];
  await replaceOperationalFixture(B.env,'bsdept:'+D1+':bassam_employees_v1',B.keys['bsdept:'+D1+':bassam_employees_v1'].filter(row=>row.eid!==EKEYS.employee1));
  await B.act(await B.body('edit',{id:created.id,data:patchData(original,{bro:9})}));
  assert.equal((await B.read()).rows[0].name,original.name);
});

test('forged UID and snapshot fields are refused without business writes',async()=>{
  const B=await fixture(),before=snapshot(B),forged=await B.body('create',{data:data(B)});forged.uid=IDS.employee1;
  await assert.rejects(B.act(forged),e=>e.irStatus===409&&e.irCode==='session-changed');
  await assert.rejects(B.act(await B.body('create',{data:{...data(B),name:'TEST_ONLY forged name'}})),e=>e.irStatus===400);
  assert.deepEqual(snapshot(B),before);
});

test('staff without Irshad operations and a different department cannot write or read reports',async()=>{
  const B=await fixture(),before=snapshot(B);
  await assert.rejects(B.act(await B.body('create',{data:data(B)},'employee1'),'employee1'),e=>e.irStatus===403);
  await assert.rejects(B.read('noView'),e=>e.irStatus===403);
  const foreign=await B.body('create',{uid:IDS.manager2,data:data(B)});
  await assert.rejects(B.act(foreign,'manager2'),e=>e.irStatus===403);
  assert.deepEqual(snapshot(B),before);
});

test('CAS and stale restore epoch refuse a new request without overwriting successful work',async()=>{
  const B=await fixture(),old=await B.body('create',{data:data(B)});await B.act(copy(old));
  const before=snapshot(B),stale={...copy(old),requestId:'TEST_ONLY_new_stale_request'};
  await assert.rejects(B.act(stale),e=>e.irStatus===409&&e.irCode==='irshad-conflict');assert.deepEqual(snapshot(B),before);
  const epoch=await B.body('create',{data:data(B)});B.DB.exec("INSERT INTO meta(k,v)VALUES('restore_epoch','1')ON CONFLICT(k)DO UPDATE SET v='1'");const changed=snapshot(B);
  await assert.rejects(B.act(epoch),e=>e.irStatus===409&&e.irCode==='restore-epoch-changed');assert.deepEqual(snapshot(B),changed);
});

test('default ir_new stays off; explicitly enabled event, receipt and audit share one write batch',async()=>{
  const off=await fixture(),offBefore=copy(off.DB.q('SELECT * FROM revs WHERE k=?',off.W.NF_REV));await off.act(await off.body('create',{data:data(off)}));
  assert.equal(off.DB.q("SELECT * FROM notification_messages WHERE type='ir_new'").length,0);
  assert.deepEqual(off.DB.q('SELECT * FROM revs WHERE k=?',off.W.NF_REV).map(copy),offBefore);
  const B=await fixture({notify:true}),batch=B.DB.batch.bind(B.DB),writes=[];
  B.DB.batch=async statements=>{if(statements.some(s=>/^\s*(INSERT|UPDATE|DELETE|REPLACE)\b/.test(s.sql)))writes.push(statements.map(s=>s.sql));return batch(statements);};
  const ack=await B.act(await B.body('create',{data:data(B)}));assert.equal(writes.length,1);
  for(const table of ['irshad_reports','irshad_report_languages','notification_messages','notification_targets','notification_dedup','irshad_requests','aud']){
    assert.ok(writes[0].some(sql=>new RegExp('INSERT[^]*INTO '+table+'\\b').test(sql)),table+' must join the same batch');
    assert.equal(B.DB.q('SELECT COUNT(*) n FROM '+table)[0].n,1,table);
  }
  assert.equal(B.DB.q('SELECT rev FROM revs WHERE k=?',B.W.NF_REV)[0].rev,ack.rev);
});

test('lost database acknowledgement and an unchanged retry return one committed result without duplicate events',async()=>{
  const B=await fixture({notify:true}),body=await B.body('create',{data:data(B)}),batch=B.DB.batch.bind(B.DB);let lost=false,writes=0;
  B.DB.batch=async statements=>{const business=statements.some(s=>s.sql.startsWith('INSERT INTO irshad_requests'));if(business)writes++;const result=await batch(statements);if(business&&!lost){lost=true;throw Error('TEST_ONLY lost D1 acknowledgement');}return result;};
  const first=await B.act(copy(body)),after=snapshot(B),retry=await B.act(copy(body));
  assert.equal(lost,true);assert.deepEqual(retry,first);assert.deepEqual(snapshot(B),after);assert.equal(writes,1);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM irshad_requests')[0].n,1);assert.equal(B.DB.q('SELECT COUNT(*) n FROM notification_messages')[0].n,1);
  const altered=copy(body);altered.data.bro++;
  await assert.rejects(B.act(altered),e=>e.irCode==='irshad-request-reused'&&e.irStatus===409);assert.deepEqual(snapshot(B),after);
});

test('late audit SQL failure rolls back business, revisions, notifications and receipt together',async()=>{
  const B=await fixture({notify:true}),body=await B.body('create',{data:data(B)}),before=snapshot(B);
  B.DB.failIf=sql=>sql.startsWith('INSERT INTO aud(');
  await assert.rejects(B.act(body),/injected failure/);B.DB.failIf=null;assert.deepEqual(snapshot(B),before);
});

test('raw authority or notification override races reject the whole commit despite unchanged revision',async()=>{
  for(const change of [B=>{const perms=copy(B.permissions);for(const d of Object.keys(perms.caps))perms.caps[d]=perms.caps[d].filter(cap=>cap!=='irshad');rawPut(B,'bassam_perms_v1',perms);},
    B=>B.DB.db.prepare('UPDATE notification_type_overrides SET enabled=0 WHERE type_id=?').run('ir_new')]){
    const B=await fixture({notify:true}),body=await B.body('create',{data:data(B)},'manager1'),batch=B.DB.batch.bind(B.DB);let changed=false,before;
    B.DB.batch=async statements=>{if(!changed&&statements.some(s=>s.sql.startsWith('INSERT INTO irshad_requests'))){changed=true;change(B);before=snapshot(B);}return batch(statements);};
    await assert.rejects(B.act(body,'manager1'),e=>e.irStatus===409&&e.irCode==='irshad-conflict');assert.equal(changed,true);assert.deepEqual(snapshot(B),before);
  }
});

test('legacy Irshad KV introduced after planning is fenced before any business statement',async()=>{
  const B=await fixture({notify:true}),body=await B.body('create',{data:data(B)}),batch=B.DB.batch.bind(B.DB);let before,changed=false;
  B.DB.batch=async statements=>{if(!changed&&statements.some(s=>s.sql.startsWith('INSERT INTO irshad_requests'))){changed=true;rawPut(B,B.W.irKey(D1),{reports:[]});before=snapshot(B);}return batch(statements);};
  await assert.rejects(B.act(body),/KIVO_IRSHAD_LEGACY_SOURCE/);assert.equal(changed,true);assert.deepEqual(snapshot(B),before);
});

test('delete-month removes only visible rows and authorizes every affected day before writing',async()=>{
  const B=await fixture();await grant(B,['ir.rec.view','ir.rec.delete']);const month=past(B);
  /* RISHAD-266 (commit 74554f6; workers/parts/061-enf-read.js:3; docs/architecture.md:114): the legacy scope ceiling (bassam_scope_v1 Shift) is retired,
     so the other-shift row is now visible to employee1 and is deleted with the month. The visibility half stays: a same-month row in another
     department (outside employee1's department ceiling) and a D1 row of another month must survive, and the D1 survivor keeps its stable sequence on export.
     No same-department hidden witness is possible: delete-month (019i-irshad-operations.js:176-181) selects rows with irQueryScope
     (019h-irshad-query.js:35-43, department_id=?1 only) plus hijri_year/hijri_month, after a canRead gate on the department key. The surviving
     061-enf-read.js:1-2 record projection (source, assignee P4.2-05, disabled lens) applies to projected KV reads and is not part of the
     Irshad SQL delete predicate, so the department boundary and the month are the only visibility limits this command honours. */
  const other=month.m>1?{y:month.y,m:month.m-1}:{y:month.y-1,m:12};
  await seed(B,{reports:{reports:[stored(B,'TEST_ONLY_day1',{...month,d:1}),stored(B,'TEST_ONLY_other_shift',{...month,d:1,shift:OTHER_SHIFT}),stored(B,'TEST_ONLY_other_month',{...other,d:1}),stored(B,'TEST_ONLY_day2',{...month,d:2})]}});
  await seed(B,{reports:{reports:[stored(B,'TEST_ONLY_hidden_d2',{...month,d:1})]}},D2);
  const first=await retro(B,{...month,d:1});assert.equal(first.status,200,JSON.stringify(first.json));
  const body=await B.body('delete-month',{year:month.y,month:month.m},'employee1'),before=snapshot(B);
  await assert.rejects(B.act(body,'employee1'),e=>e.irStatus===403&&e.irDecision?.missing?.includes('ir.rec.bulk.delete'));assert.deepEqual(snapshot(B),before);
  await grant(B,['ir.rec.view','ir.rec.delete','ir.rec.bulk.delete']);const guarded=snapshot(B);
  await assert.rejects(B.act(await B.body('delete-month',{year:month.y,month:month.m},'employee1'),'employee1'),e=>e.irStatus===403&&e.irDecision?.why==='scope');assert.deepEqual(snapshot(B),guarded);
  const full=await retro(B,{...month,d:null});assert.equal(full.status,200,JSON.stringify(full.json));
  const ack=await B.act(await B.body('delete-month',{year:month.y,month:month.m},'employee1'),'employee1');assert.equal(ack.n,3);
  assert.deepEqual(B.DB.q('SELECT department_id,report_id FROM irshad_reports ORDER BY department_id,sequence').map(row=>[row.department_id,row.report_id]).sort(),[[D1,'TEST_ONLY_other_month'],[D2,'TEST_ONLY_hidden_d2']].sort());
  const exported=await B.W.irExport(B.env,await B.actor('super'),new URL('http://x/export?dept='+D1));
  assert.deepEqual(exported.domains[0].rows.reports.map(row=>[row.report_id,row.sequence]),[['TEST_ONLY_other_month',2]]);
  const exportedD2=await B.W.irExport(B.env,await B.actor('super'),new URL('http://x/export?dept='+D2));
  assert.deepEqual(exportedD2.domains[0].rows.reports.map(row=>[row.report_id,row.sequence]),[['TEST_ONLY_hidden_d2',0]]);
});

test('actual retro API opens reads and closes typed windows while enforcing closed dates even for super',async()=>{
  const B=await fixture(),month=past(B),oldData=data(B,{...month,d:1}),before=snapshot(B);
  await assert.rejects(B.act(await B.body('create',{data:oldData})),e=>e.irStatus===403);assert.deepEqual(snapshot(B),before);
  const opened=await retro(B,{...month,d:1});assert.equal(opened.status,200,JSON.stringify(opened.json));assert.equal(opened.json.ok,1);
  const state=await B.api('super','/api/retro?res=irshad&dept='+D1);assert.equal(state.status,200);assert.ok(state.json.windows.some(w=>w.id===opened.json.window.id));
  const created=await B.act(await B.body('create',{data:oldData}));assert.ok(created.id);
  const closed=await retro(B,null,{act:'close',id:opened.json.window.id});assert.equal(closed.status,200,JSON.stringify(closed.json));assert.ok(closed.json.window.closedAt);
  const after=snapshot(B);await assert.rejects(B.act(await B.body('create',{data:oldData})),e=>e.irStatus===403);assert.deepEqual(snapshot(B),after);
  assert.equal(await B.W.irLegacyPresent(B.env),false);
});

test('retro opener permission, late SQL rollback and raw window witness stay fail closed',async()=>{
  const B=await fixture(),month=past(B),denied=await retro(B,{...month,d:1},{who:'employee1'});assert.equal(denied.status,403);
  const before=snapshot(B);B.DB.failIf=sql=>sql.startsWith('INSERT INTO aud(');
  const failed=await retro(B,{...month,d:1});B.DB.failIf=null;assert.ok(failed.status>=400);assert.deepEqual(snapshot(B),before);
  const opened=await retro(B,{...month,d:1});assert.equal(opened.status,200,JSON.stringify(opened.json));
  const body=await B.body('create',{data:data(B,{...month,d:1})}),batch=B.DB.batch.bind(B.DB);let changed=false,after;
  B.DB.batch=async statements=>{if(!changed&&statements.some(s=>s.sql.startsWith('INSERT INTO irshad_requests'))){changed=true;B.DB.db.prepare('UPDATE irshad_retro_windows SET until_at=1 WHERE department_id=?').run(D1);after=snapshot(B);}return batch(statements);};
  await assert.rejects(B.act(body),e=>e.irStatus===409);assert.equal(changed,true);assert.deepEqual(snapshot(B),after);
});

test('typed export respects inactive module ceilings despite backup.view and refreshes stale super authority',async()=>{
  const B=await fixture();await seed(B,{reports:{reports:[stored(B,'TEST_ONLY_private')]}});
  const stale=await B.actor('super'),permissions=copy(B.permissions);for(const d of Object.keys(permissions.caps))permissions.caps[d]=permissions.caps[d].filter(cap=>cap!=='irshad');
  await put(B,'bassam_perms_v1',permissions);const manager=(await B.W.irQueryContext(B.env,await B.actor('manager1'),D1,{write:true})).A;
  assert.equal(B.W.canRead(manager,B.W.irKey(D1)),false);
  await assert.rejects(B.W.irExport(B.env,manager,new URL('http://x/export?dept='+D1)),e=>e.irStatus===403);
  assert.equal((await B.W.irExport(B.env,stale,new URL('http://x/export'))).domains[0].rows.reports.length,1,'Full super backup remains readable');
  const users=copy(B.users);Object.assign(users.find(u=>u.id===IDS.super),{role:'staff',deptId:D1,ekey:'TEST_ONLY_revoked',mgr:0});rawPut(B,'bassam_auth_users_v1',users);
  await assert.rejects(B.W.irExport(B.env,stale,new URL('http://x/export')),e=>e.irStatus===403);
});

test('export raw authority change between captured authorization and data batch returns no rows',async()=>{
  const B=await fixture();await seed(B,{reports:{reports:[stored(B,'TEST_ONLY_private')]}});
  const batch=B.DB.batch.bind(B.DB);let changed=false;
  B.DB.batch=async statements=>{if(!changed&&statements.some(s=>s.sql.includes('KIVO_IRSHAD_ORPHAN_SCOPE'))){changed=true;const users=copy(B.users);Object.assign(users.find(u=>u.id===IDS.super),{role:'staff',deptId:D1,ekey:'TEST_ONLY_revoked',mgr:0});rawPut(B,'bassam_auth_users_v1',users);}return batch(statements);};
  await assert.rejects(B.W.irExport(B.env,await B.actor('super'),new URL('http://x/export')),e=>e.irCode==='irshad-export-race'&&e.irStatus===409);assert.equal(changed,true);
});

test('one revision-vector SQL guard treats absent keys as zero and rejects a stale single resource',async()=>{
  const B=await fixture(),base={reports:0,languages:0,locations:0,retro:0},guards=B.W.irRevisionGuards(B.env,D1,base);
  assert.equal(guards.length,1,'Four independent keys share one bound SQL fence, preserving the existing100-statement batch budget');
  await B.DB.batch(guards);
  B.DB.db.prepare('INSERT INTO revs(k,rev)VALUES(?,7)').run(B.W.irKey(D1,2));
  await assert.rejects(B.DB.batch(guards.concat([B.DB.prepare("INSERT INTO meta(k,v)VALUES('TEST_ONLY_forbidden_vector_write','1')")])),/KIVO_REV_CONFLICT/);
  assert.equal(B.DB.q("SELECT k FROM meta WHERE k='TEST_ONLY_forbidden_vector_write'").length,0);
  await B.DB.batch(B.W.irRevisionGuards(B.env,D1,{...base,locations:7}));
  for(const bad of [{...base,reports:-1},{...base,languages:null},{...base,retro:0.5}])assert.throws(()=>B.W.irRevisionGuards(B.env,D1,bad),e=>e.irCode==='irshad-base');
});
