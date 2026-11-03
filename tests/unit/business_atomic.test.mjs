import {test} from 'node:test';
import assert from 'node:assert/strict';
import {world,clone,awardDocs,seizedDocs,snapshot,fileFrom,legacyFileFrom,seedReceipts,preimageRows,batchBounds,D1,D2,G1,IDS,EKEYS,identitySnapshot} from './business_atomic_fx.mjs';

test('manifest3 full/dept conversion is lossless for both relational domains and explicit readonly global references',async()=>{
 const B=await world({seed:true}),identity=identitySnapshot(B.DB);
 for(const scope of [{kind:'full'},{kind:'dept',departmentId:D1}]){
  const body=await B.body({scope}),file=legacyFileFrom(body,3),converted=await B.W.rsConvertBackup(B.env,await B.A(),file,{scope,mode:'replace',reference:{inputKeys:B.rawKeys()}});
  assert.equal(converted.manifest.version,4);assert.equal(converted.manifest.domains.operations,1);   /* schema 10: a manifest3 file converts to the current v4 contract */assert.deepEqual(clone(converted.domains.seized),clone(body.domains.seized));assert.deepEqual(clone(converted.domains.awards),clone(body.domains.awards));
  assert.equal(converted.domains.awards.some(d=>d.scope.kind==='global'),scope.kind==='full');assert.ok(Object.keys(converted.keys).every(k=>!B.W.bdDefinitions().some(def=>def.resources.includes(k.split(':').at(-1)))));
 }
 assert.deepEqual(identitySnapshot(B.DB),identity);
 const body=await B.body(),bad=clone(body);bad.domains.awards.find(d=>d.scope.kind==='global').rows.documents[0].title='TEST_ONLY changed global';
 await assert.rejects(B.prepare(bad),/award-global-references-readonly/);
});

test('manifest1/2 converters preserve both legacy domains, global docs and department remap without a runtime KV write',async()=>{
 const B=await world({seed:true}),before=snapshot(B);
 for(const version of [1,2])for(const full of [true,false]){
  const scope=full?{kind:'full'}:{kind:'dept',departmentId:D1},body=await B.body({scope}),file=legacyFileFrom(body,version);
  for(const def of B.W.bdDefinitions()){delete file.domains[def.name];delete file.manifest.domains[def.name];const ds=def.name==='awards'?body.domains.awards:body.domains.seized;for(const domain of ds){const d=domain.scope.kind==='global'?'':domain.scope.departmentId,docs=def.inflate(domain);for(let i=0;i<def.names.length;i++)if(Object.hasOwn(docs,def.names[i]))file.data[def.key(d,i)]=JSON.stringify(docs[def.names[i]]);}}
  if(version===1){delete file.domains.irshad;delete file.manifest.domains.irshad;}
  file.manifest.keys=Object.keys(file.data).map(k=>full?k:k.replace('bsdept:'+D1+':',''));
  const target=full?scope:{kind:'dept',departmentId:D2},converted=await B.W.rsConvertBackup(B.env,await B.A(),file,{scope:target,mode:'replace',reference:{inputKeys:B.rawKeys()}});
  assert.equal(converted.manifest.version,4);assert.equal(converted.manifest.domains.operations,1);assert.deepEqual(B.W.szInflate(converted.domains.seized.find(d=>d.scope.departmentId===(full?D1:D2))),seizedDocs());
  assert.deepEqual(B.W.awInflate(converted.domains.awards.find(d=>d.scope.departmentId===(full?D1:D2))),awardDocs('old'));
  if(full)assert.deepEqual(B.W.awInflate(converted.domains.awards.find(d=>d.scope.kind==='global')),{docsV2:awardDocs('global').docsV2});
 }
 assert.deepEqual(snapshot(B),before);
});

test('typed export requires actual read permission for every resource it returns and preserves principal/dept scope',async()=>{
 const B=await world({seed:true}),p=clone(B.keys.bassam_perms_v1);Object.values(p.caps).forEach(c=>c.push('award','seized'));
 p.emps[D1][EKEYS.employee1]={'award/res':['view'],'admin/backup':['view']};p.subs={...(p.subs||{}),[D1]:{...((p.subs||{})[D1]||{}),award:['new','res'],'award:tabs':['new','res']}};await B.put('bassam_perms_v1',p,true);
 const ctx=await B.W.awQueryContext(B.env,B.actor('employee1'),D1,{write:true});assert.equal(B.W.canRead(ctx.A,B.W.awKey(D1)),true);assert.equal(B.W.enfHeld(ctx.A,D1,'backup.view'),true,'Actual backup grant removes an alternate reason for denial');assert.equal(B.W.canRead(ctx.A,B.W.awKey(D1,2)),false);
 await assert.rejects(B.W.bdExport(B.env,await B.A('employee1'),new URL('http://x/export?dept='+D1),'awards'),/domain-export-permission/);
 await assert.rejects(B.W.bdExport(B.env,await B.A('employee1'),new URL('http://x/export?dept='+D2),'awards'),e=>(e.rs==='domain-export-scope'||e.awCode==='award-denied')&&(e.status||e.awStatus)===403);
 await assert.rejects(B.W.bdExport(B.env,await B.A('employee1'),new URL('http://x/export'),'awards'),/domain-export-permission/);
 const full=await B.W.bdExport(B.env,await B.A(),new URL('http://x/export'),'awards');assert.equal(full.epoch,await B.W.rsEpoch(B.env));assert.equal(full.globalRev,await B.W.curRev(B.env));assert.ok(full.domains.some(d=>d.scope.kind==='global'));
});

test('full merge keeps existing domains/global docs and installs nonempty domains for an actually empty new department',async()=>{
 const B=await world({seed:true}),newDept='TEST_ONLY_business_new_department',depts=JSON.parse(B.rawKeys().bassam_depts_v1).concat({id:newDept,name:'TEST_ONLY new',gid:G1}),oldAw=await B.W.awExportDomain(B.env,D1),oldSz=await B.W.szExportDomain(B.env,D1),oldGlobal=await B.W.awExportDomain(B.env,'');
 const body=await B.body({mode:'merge',keys:{bassam_depts_v1:JSON.stringify(depts)}});
 body.domains.awards=body.domains.awards.map(d=>d.scope.departmentId===newDept?B.W.awConvert(newDept,awardDocs('new')):d);
 body.domains.seized=body.domains.seized.map(d=>d.scope.departmentId===newDept?B.W.szConvert(newDept,seizedDocs('new')):d);
 assert.deepEqual(await B.W.awExportDomain(B.env,newDept),B.W.awEmptyDomain(newDept));assert.deepEqual(await B.W.szExportDomain(B.env,newDept),B.W.szEmptyDomain(newDept));
 const ack=await B.commit(await B.prepare(body));assert.equal(ack.ok,1);assert.deepEqual(await B.W.awExportDomain(B.env,D1),oldAw);assert.deepEqual(await B.W.szExportDomain(B.env,D1),oldSz);assert.deepEqual(await B.W.awExportDomain(B.env,''),oldGlobal);
 assert.deepEqual(B.W.awInflate(await B.W.awExportDomain(B.env,newDept)),awardDocs('new'));assert.deepEqual(B.W.szInflate(await B.W.szExportDomain(B.env,newDept)),seizedDocs('new'));
});

test('one atomic restore replaces both typed domains, clears receipts, records full preimage and replays its ACK without a second write',async t=>{
 const B=await world({seed:true});seedReceipts(B);const identity=identitySnapshot(B.DB),global=await B.W.awExportDomain(B.env,''),body=await B.body(),originalRows={};
 for(const def of B.W.bdDefinitions()){const specs={...def.tables,requests:[def.name==='awards'?'award_requests':'seized_requests']};if(def.name==='awards')specs.requestChecks=['award_request_checks'];originalRows[def.name]=Object.fromEntries(Object.entries(specs).map(([kind,[table]])=>[kind,clone(B.DB.q('SELECT * FROM '+table+' WHERE department_id=?',D1))]));}
 body.domains.awards=body.domains.awards.map(d=>d.scope.departmentId===D1?B.W.awConvert(D1,awardDocs('restored')):d);body.domains.seized=body.domains.seized.map(d=>d.scope.departmentId===D1?B.W.szConvert(D1,seizedDocs('restored')):d);
 const plan=await B.prepare(body),original=B.DB.batch.bind(B.DB);let mutations=0,statements=0,bounds;B.DB.batch=async st=>{if(st.some(s=>s.sql.includes('INSERT INTO restore_operations'))){mutations++;statements=st.length;bounds=batchBounds(st);}return original(st);};
 const ack=await B.commit(plan);assert.equal(ack.ok,1);assert.equal(mutations,1);assert.deepEqual(identitySnapshot(B.DB),identity);assert.deepEqual(await B.W.awExportDomain(B.env,''),global);
 assert.deepEqual(B.W.awInflate(await B.W.awExportDomain(B.env,D1)),awardDocs('restored'));assert.deepEqual(B.W.szInflate(await B.W.szExportDomain(B.env,D1)),seizedDocs('restored'));
 assert.equal(B.DB.q('SELECT * FROM seized_requests').length,0);assert.equal(B.DB.q('SELECT * FROM award_requests').length,0);assert.equal(B.DB.q('SELECT * FROM award_request_checks').length,0);
 const pre=B.DB.q('SELECT domain,table_key FROM restore_snapshot_manifest');for(const name of ['awards','seized'])assert.ok(pre.some(r=>r.domain===name&&r.table_key===D1+':requests'));assert.ok(pre.some(r=>r.domain==='awards'&&r.table_key===D1+':requestChecks'));
 const sorted=rows=>rows.slice().sort((a,b)=>JSON.stringify(a,Object.keys(a).sort()).localeCompare(JSON.stringify(b,Object.keys(b).sort())));
 for(const [domain,kinds]of Object.entries(originalRows))for(const[kind,rows]of Object.entries(kinds)){const stored=preimageRows(B,ack.snapshot,domain,D1+':'+kind);assert.deepEqual(sorted(stored),sorted(rows),domain+':'+kind+' private preimage preserves every scalar/byte');assert.equal(B.DB.q('SELECT row_count FROM restore_snapshot_manifest WHERE snapshot_id=? AND domain=? AND table_key=?',ack.snapshot,domain,D1+':'+kind)[0].row_count,rows.length);}
 assert.equal(B.DB.q('PRAGMA foreign_key_check').length,0);const duplicate=await B.commit(await B.prepare(body));assert.equal(duplicate.duplicate,1);assert.equal(duplicate.rev,ack.rev);assert.equal(mutations,1);t.diagnostic('Actual nonempty schema9 restore '+JSON.stringify(bounds));
});

test('every SQL position in the common restore batch rolls back both domains, receipt proofs, preimages, revisions and epoch',async t=>{
 const B=await world({seed:true});seedReceipts(B);const body=await B.body();body.domains.awards=body.domains.awards.map(d=>d.scope.departmentId===D1?B.W.awEmptyDomain(D1):d);body.domains.seized=body.domains.seized.map(d=>d.scope.departmentId===D1?B.W.szEmptyDomain(D1):d);
 const plan=await B.prepare(body),before=snapshot(B),original=B.DB.batch.bind(B.DB);let target=1,count=0;
 B.DB.batch=async st=>{if(!st.some(s=>s.sql.includes('INSERT INTO restore_operations')))return original(st);count=st.length;batchBounds(st);let n=0;B.DB.failIf=()=>++n===target;try{return await original(st);}finally{B.DB.failIf=null;}};
 try{for(target=1;target<=(count||1);target++){await assert.rejects(B.commit(plan),/injected failure/);assert.deepEqual(snapshot(B),before,'No application residue at SQL '+target+'/'+count);}}
 finally{B.DB.batch=original;B.DB.failIf=null;}
 assert.ok(count>20);t.diagnostic('Actual schema9 restore fault positions='+count);assert.equal((await B.commit(plan)).ok,1);
});

test('prepared restore rejects raw typed rows, receipt proofs and retired KV races inside its single batch',async()=>{
 for(const kind of ['award-row','seized-row','award-proof','retired-child']){
  const B=await world({seed:true});seedReceipts(B);const body=await B.body();body.domains.awards=body.domains.awards.map(d=>d.scope.departmentId===D1?B.W.awEmptyDomain(D1):d);body.domains.seized=body.domains.seized.map(d=>d.scope.departmentId===D1?B.W.szEmptyDomain(D1):d);const plan=await B.prepare(body);
  if(kind==='award-row')B.DB.db.prepare('UPDATE award_records SET work_description=? WHERE department_id=?').run('TEST_ONLY concurrent',D1);
  if(kind==='seized-row')B.DB.db.prepare('UPDATE seized_reports SET note=? WHERE department_id=?').run('TEST_ONLY concurrent',D1);
  if(kind==='award-proof')B.DB.db.prepare('DELETE FROM award_request_checks WHERE department_id=?').run(D1);
  if(kind==='retired-child')await B.put(B.W.awKey(D1,1)+':TEST_ONLY_child',{},false);
  const before=snapshot(B);await assert.rejects(B.commit(plan),/KIVO_|legacy-source-present/);assert.deepEqual(snapshot(B),before,kind);
 }
});

test('department wipe and delete include both typed domains and receipts while preserving global references and other departments',async()=>{
 for(const kind of ['wipe','delete']){
  const B=await world({seed:true});await B.install('seized',D2,seizedDocs('other'));await B.install('awards',D2,awardDocs('other'));seedReceipts(B);
  const global=await B.W.awExportDomain(B.env,''),otherSz=await B.W.szExportDomain(B.env,D2),otherAw=await B.W.awExportDomain(B.env,D2),identity=identitySnapshot(B.DB),inventory=(await B.W.rsWipeInventory(B.env,await B.A(),D1,kind)).public;
  assert.ok(inventory.counts.awards>0);assert.ok(inventory.counts.seized>0);
  const r=await B.api('super','/api/admin/dept-'+kind,{method:'POST',body:{uid:IDS.super,dept:D1,requestId:'TEST_ONLY_business_'+kind,reason:'TEST_ONLY atomic '+kind,base:inventory.base}});assert.equal(r.status,200,JSON.stringify(r.json));assert.equal(r.json.ok,1);
  assert.deepEqual(await B.W.awExportDomain(B.env,''),global);assert.deepEqual(await B.W.awExportDomain(B.env,D2),otherAw);assert.deepEqual(await B.W.szExportDomain(B.env,D2),otherSz);assert.deepEqual(await B.W.awExportDomain(B.env,D1),B.W.awEmptyDomain(D1));assert.deepEqual(await B.W.szExportDomain(B.env,D1),B.W.szEmptyDomain(D1));
  assert.equal(B.DB.q('SELECT * FROM award_requests WHERE department_id=?',D1).length,0);assert.equal(B.DB.q('SELECT * FROM seized_requests WHERE department_id=?',D1).length,0);assert.equal(B.DB.q('PRAGMA foreign_key_check').length,0);
  if(kind==='wipe')assert.deepEqual(identitySnapshot(B.DB),identity);else{assert.equal(JSON.parse(B.rawKeys().bassam_depts_v1).some(d=>d.id===D1),false);assert.equal(JSON.parse(B.rawKeys().bassam_auth_users_v1).some(u=>u.deptId===D1),false);}
 }
});

test('employee transition atomically cleans only removed Award nominations and leaves historical orphan, docs and Seized intact',async()=>{
 const B=await world(),target=B.keys['bsdept:'+D1+':bassam_employees_v1'][0],docs=awardDocs('employee');docs.records.recs=[{ekey:target.eid,name:target.name},{ekey:'TEST_ONLY_prior_orphan',name:target.name}];await B.install('awards',D1,docs);await B.install('seized',D1,seizedDocs());
 const refs=clone((await B.W.awExportDomain(B.env,D1)).rows),sz=await B.W.szExportDomain(B.env,D1),context=await B.api('super','/api/employees/transition?dept='+D1+'&intent=delete');assert.equal(context.status,200,JSON.stringify(context.json));const c=context.json;
 const result=await B.api('super','/api/employees/transition',{method:'POST',body:{uid:IDS.super,dept:D1,intent:'delete',deleteMode:'selected',requestId:'TEST_ONLY_business_employee',base:c.base,finalRows:c.employees.filter(e=>e.eid!==target.eid),reason:'TEST_ONLY employee cleanup'}});assert.equal(result.status,200,JSON.stringify(result.json));
 const domain=await B.W.awExportDomain(B.env,D1);assert.deepEqual(B.W.awInflate(domain).records.recs,[{ekey:'TEST_ONLY_prior_orphan',name:target.name}]);for(const k of ['documents','sections','items'])assert.deepEqual(clone(domain.rows[k]),refs[k]);assert.deepEqual(await B.W.szExportDomain(B.env,D1),sz);assert.equal(B.DB.q('SELECT * FROM restore_operations').length,1);
});

test('Seized photo references participate in image metadata restore without any R2 operation',async()=>{
 const B=await world(),id='szp_testonly_business',key=B.W.szKey(D1),calls=[];B.env.IMG_R2=Object.fromEntries(['get','put','delete','head','list'].map(op=>[op,async()=>{calls.push(op);throw Error('TEST_ONLY forbidden R2 '+op);} ]));
 await B.install('seized',D1,seizedDocs('old',[id,id]));await B.DB.batch([...B.W.kvPutStmts(B.env,'imgs',id,'data:image/png;base64,VEVTVF9PTkxZ'),B.DB.prepare('INSERT INTO imgown(img,st,k,uid,dept,ts)VALUES(?1,?2,?3,?4,?5,1)').bind(id,'bound',key,IDS.super,D1),B.DB.prepare('INSERT INTO imgref(img,k)VALUES(?1,?2)').bind(id,key)]);
 const body=await B.body(),images=clone(B.DB.q('SELECT * FROM imgs'));body.domains.seized=body.domains.seized.map(d=>d.scope.departmentId===D1?B.W.szConvert(D1,seizedDocs('new',[id,id])):d);const plan=await B.prepare(body);assert.ok(Object.hasOwn(plan.relationalImageBefore||{},key),'Actual relational image projection participated before metadata planning consumed imgTouch');assert.ok(plan.guards.some(s=>s.sql.includes('FROM imgs')),'Actual image-body witness exists');assert.equal((await B.commit(plan)).ok,1);assert.deepEqual(calls,[]);assert.deepEqual(clone(B.DB.q('SELECT * FROM imgs')),images);assert.deepEqual(clone(B.DB.q('SELECT img,k FROM imgref')),[{img:id,k:key}]);
 const bad=await B.body();bad.domains.seized=bad.domains.seized.map(d=>d.scope.departmentId===D1?B.W.szConvert(D1,seizedDocs('bad',['szp_testonly_unknown'])):d);const before=snapshot(B);await assert.rejects(B.prepare(bad),/image/);assert.deepEqual(snapshot(B),before);assert.deepEqual(calls,[]);
});

test('13,006 inherited accounts with unchanged empty Seized/Award stay inside the existing100-statement budget',async t=>{
 const B=await world(),users=clone(B.users);for(let i=users.length;i<13006;i++)users.push({id:'TEST_ONLY_bulk_'+i,un:String(2000000000+i),name:'TEST_ONLY synthetic '+i,role:'staff',deptId:D1,ekey:'TEST_ONLY_bulk_key_'+i,ph:B.users[0].ph,mc:0,dis:0});
 await B.put('bassam_auth_users_v1',users);const exported=users.map(({ph,...u})=>u);exported.at(-1).name='TEST_ONLY renamed final row';const body=await B.body({keys:{bassam_auth_users_v1:JSON.stringify(exported)}}),sessions=clone(B.DB.q('SELECT * FROM sess')),original=B.DB.batch.bind(B.DB);let count=0,batches=0;
 B.DB.batch=async st=>{if(st.some(s=>s.sql.includes('INSERT INTO restore_operations'))){count=st.length;batches++;batchBounds(st);}return original(st);};
 const ack=await B.commit(await B.prepare(body));assert.equal(ack.ok,1);assert.equal(batches,1);t.diagnostic('Actual schema9 empty-business account_count=13006 batch_statements='+count);
 const stored=JSON.parse(B.rawKeys().bassam_auth_users_v1);assert.equal(stored.length,13006);assert.ok(stored.every((u,i)=>u.ph===users[i].ph));assert.deepEqual(clone(B.DB.q('SELECT * FROM sess')),sessions);assert.equal(preimageRows(B,ack.snapshot,'kv','bassam_auth_users_v1').sort((a,b)=>a.seq-b.seq).map(r=>r.v).join(''),JSON.stringify(users),'Large credential preimage retains exact original chunk bytes');assert.ok(count<=100,'Project reference efficiency budget100 statements; actual='+count);
});

test('typed export reports live globalRev rather than the real request preload cache and rejects epoch/actor drift',async()=>{
 for(const race of ['global-revision','epoch','actor']){
  const B=await world({seed:true}),A=await B.A(),request=new Request('http://x/api/award/export',{headers:{Cookie:'bs_tok=TEST_ONLY_session_super'}}),wrapped=await B.W.preAttach(B.env,request);
  assert.equal(wrapped.__pre.live,true,'Use actual request preload, not a replacement cache implementation');
  if(race==='global-revision'){
   const previous=Number(wrapped.__pre.meta.rev);B.DB.db.prepare("UPDATE meta SET v=? WHERE k='rev'").run(String(previous+1));
   const exported=await B.W.bdExport(wrapped,A,new URL('http://x/export'),'awards');assert.equal(exported.globalRev,previous+1,'Metadata must fence the actual provider revision');
  }else if(race==='epoch'){
   B.DB.exec("INSERT INTO meta(k,v)VALUES('restore_epoch','1')ON CONFLICT(k)DO UPDATE SET v='1'");await assert.rejects(B.W.bdExport(wrapped,A,new URL('http://x/export'),'awards'),/epoch|KIVO_RESTORE/);
  }else{
   const users=clone(B.users);users.find(u=>u.id===IDS.super).dis=1;await B.put('bassam_auth_users_v1',users);await assert.rejects(B.W.bdExport(wrapped,A,new URL('http://x/export'),'awards'),/permission|denied/);
  }
 }
});

test('full merge initializes empty new domains but rejects a preexisting unregistered typed target and unknown scoped payload',async()=>{
 for(const collision of [false,true]){
  const B=await world(),newDept='TEST_ONLY_empty_new_department',depts=JSON.parse(B.rawKeys().bassam_depts_v1).concat({id:newDept,name:'TEST_ONLY new',gid:G1}),body=await B.body({mode:'merge',keys:{bassam_depts_v1:JSON.stringify(depts)}});
  if(collision){await B.install('awards',newDept,awardDocs('collision'));const before=snapshot(B);await assert.rejects(B.prepare(body),/merge-target-not-empty/);assert.deepEqual(snapshot(B),before);}
  else{assert.equal((await B.commit(await B.prepare(body))).ok,1);assert.deepEqual(await B.W.awExportDomain(B.env,newDept),B.W.awEmptyDomain(newDept));assert.deepEqual(await B.W.szExportDomain(B.env,newDept),B.W.szEmptyDomain(newDept));}
 }
 const B=await world(),bad=await B.body();bad.domains.awards[0]=B.W.awEmptyDomain('TEST_ONLY_unknown_department');const before=snapshot(B);await assert.rejects(B.prepare(bad),/incomplete-awards|scope/);assert.deepEqual(snapshot(B),before);
});

test('legacy business suffix aliases reject with a structured namespace error before any typed write',async()=>{
 const B=await world(),scope={kind:'dept',departmentId:D1},body=await B.body({scope}),file=fileFrom(body);file.manifest.version=2;delete file.domains.seized;delete file.domains.awards;delete file.manifest.domains.seized;delete file.manifest.domains.awards;
 file.data[B.W.awKey(D1)+':TEST_ONLY_alias']='{"recs":[]}';file.manifest.keys=['bassam_award_v1:TEST_ONLY_alias'];const before=snapshot(B);
 await assert.rejects(B.W.rsConvertBackup(B.env,await B.A(),file,{scope,mode:'replace',reference:{inputKeys:B.rawKeys()}}),error=>error.rs==='backup-business-namespace');assert.deepEqual(snapshot(B),before);
});

test('identical business domain with prior receipts clears only receipt metadata and preserves all business rows and guards',async()=>{
 const B=await world({seed:true});seedReceipts(B);
 for(const def of B.W.bdDefinitions()){
  const current=await def.exportDomain(B.env,D1),base=await def.revs(B.env,D1),before=clone(current),plan=await def.plan(B.env,current,D1,{base,reason:'TEST_ONLY identical restore'}),businessTables=Object.values(def.tables).map(([table])=>table);
  assert.equal(plan.changed,true,'Receipt invalidation remains a real restore change');assert.ok(plan.guards.length>0);assert.equal(plan.statements.length,1,'Cascade removes dependent permission proof without rewriting business tables');assert.match(plan.statements[0].sql,new RegExp('^DELETE FROM '+(def.name==='awards'?'award_requests':'seized_requests')));
  assert.equal(plan.statements.some(s=>businessTables.some(table=>new RegExp('^(?:DELETE FROM|INSERT INTO) '+table+'\\b').test(s.sql))),false);
  if(def.name==='awards'){assert.deepEqual(plan.revisionKeys,def.resources.map((_,i)=>def.key(D1,i)));assert.equal(plan.snapshotRows.requestChecks.length,1);}
  await B.DB.batch(plan.guards.concat(plan.statements));assert.deepEqual(clone(await def.exportDomain(B.env,D1)),before);assert.equal(B.DB.q('SELECT * FROM '+(def.name==='awards'?'award_requests':'seized_requests')+' WHERE department_id=?',D1).length,0);
 }
 assert.equal(B.DB.q('SELECT * FROM award_request_checks WHERE department_id=?',D1).length,0);
});

test('modern image archive reuses an unchanged typed Seized reference with and without prior receipts and no R2 operation',async()=>{
 for(const receipts of [false,true]){
  const B=await world(),id='szp_testonly_unchanged',key=B.W.szKey(D1),data='data:image/png;base64,VEVTVF9PTkxZ',calls=[];B.env.IMG_R2=Object.fromEntries(['get','put','delete','head','list'].map(op=>[op,async()=>{calls.push(op);throw Error('TEST_ONLY forbidden R2 '+op);} ]));
  await B.install('seized',D1,seizedDocs('same',[id,id]));await B.DB.batch([...B.W.kvPutStmts(B.env,'imgs',id,data),B.DB.prepare('INSERT INTO imgown(img,st,k,uid,dept,ts)VALUES(?1,?2,?3,?4,?5,1)').bind(id,'bound',key,IDS.super,D1),B.DB.prepare('INSERT INTO imgref(img,k)VALUES(?1,?2)').bind(id,key)]);if(receipts)seedReceipts(B);
  const body=await B.body(),file=fileFrom(body),old=await B.W.szExportDomain(B.env,D1),images=clone(B.DB.q('SELECT * FROM imgs'));file.idbImages={[id]:data};
  const response=await B.api('super','/api/backup/restore',{method:'POST',body:{version:1,uid:IDS.super,requestId:'TEST_ONLY_same_image_'+receipts,scope:body.scope,mode:'replace',reason:'TEST_ONLY same image reuse',base:body.base,backup:file,phase:'commit',legacyConsent:false}});
  assert.equal(response.status,200,JSON.stringify(response.json));assert.equal(response.json.imagesReused,1);assert.deepEqual(await B.W.szExportDomain(B.env,D1),old);assert.deepEqual(clone(B.DB.q('SELECT * FROM imgs')),images);assert.deepEqual(calls,[]);
 }
});

test('department restore cannot grant a manager an Award doc write outside the existing resource ceiling',async()=>{
 const B=await world({seed:true}),p=clone(B.keys.bassam_perms_v1);Object.values(p.caps).forEach(c=>c.push('award'));p.subs={...(p.subs||{}),[D1]:{award:['new','res'],'award:tabs':['new','res']}};await B.put('bassam_perms_v1',p,true);await B.put('bsdept:'+D1+':bassam_grants_v1',{v:1,emp:{[EKEYS.manager1]:{plus:['backup.restore'],minus:[]}}},true);
 const ctx=await B.W.awQueryContext(B.env,B.actor('manager1'),D1,{write:true});assert.equal(B.W.enfHeld(ctx.A,D1,'backup.restore'),true);assert.equal(B.W.canRead(ctx.A,B.W.awKey(D1,2)),false);
 const original=B.W.awInflate(await B.W.awExportDomain(B.env,D1)),next=clone(original);next.docsV2.A.lead='TEST_ONLY blocked doc edit';
 await assert.rejects(B.W.awPermission(ctx,2,original.docsV2,next.docsV2,'TEST_ONLY scoped restore'),e=>e.awCode==='award-denied'&&e.awStatus===403);
 const body=await B.body({scope:{kind:'dept',departmentId:D1}});body.domains.awards=[B.W.awConvert(D1,next)];const before=snapshot(B);
 await assert.rejects(B.prepare(body,'manager1'),e=>(e.awStatus||e.status)===403);assert.deepEqual(snapshot(B),before);
});

test('actual reset keeps password/recovery/confirm guards and atomically clears all22 new domain tables at every SQL fault',async t=>{
 const B=await world({seed:true});seedReceipts(B);const r2Calls=[];B.env.IMG_R2=Object.fromEntries(['get','put','delete','head','list'].map(op=>[op,async()=>{r2Calls.push(op);throw Error('TEST_ONLY forbidden reset R2 '+op);} ]));const pin='583927',recovery='TESTONLYRECOVERY123456789',users=clone(B.users);users.find(u=>u.id===IDS.super).ph=await B.canonicalW.hashPw(pin);await B.put('bassam_auth_users_v1',users);await B.DB.prepare("INSERT INTO meta(k,v)VALUES('rk',?1)").bind(await B.canonicalW.hashPw('rk:'+recovery)).run();
 const reset={pw:pin,key:recovery,confirm:'تهيئة',keepBrand:true,admin:{un:'0500000199',name:'TEST_ONLY reset owner',pw:'583928'}},tables=B.W.bdDefinitions().flatMap(def=>Object.values(def.tables).map(([table])=>table)).concat(['seized_requests','award_requests','award_request_checks']);assert.equal(new Set(tables).size,22);
 const before=snapshot(B),invalid=await B.api('super','/api/reset',{method:'POST',body:{...reset,confirm:'TEST_ONLY wrong confirmation'}});assert.equal(invalid.json.ok,0);assert.equal(invalid.json.err,'اكتب كلمة «تهيئة» للتأكيد');const afterInvalid=snapshot(B);assert.equal(afterInvalid.guard[0].n,1,'Existing guardLeft reserves an attempt even when confirmation is incomplete');assert.deepEqual({...afterInvalid,guard:before.guard},before,'Confirmation leaves all application state intact except its documented attempt counter');
 const original=B.DB.batch.bind(B.DB);let target=1,count=0;B.DB.batch=async st=>{if(!st.some(s=>/^DELETE FROM award_resources/.test(s.sql)))return original(st);count=st.length;batchBounds(st);let n=0;B.DB.failIf=()=>++n===target;try{return await original(st);}finally{B.DB.failIf=null;}};
 try{for(target=1;target<=(count||1);target++){const failed=await B.api('super','/api/reset',{method:'POST',body:reset});assert.equal(failed.status,500,'Injected reset SQL '+target+'/'+count);assert.deepEqual(snapshot(B),before,'No reset residue at SQL '+target+'/'+count);}}
 finally{B.DB.batch=original;B.DB.failIf=null;}
 assert.ok(count>=22);t.diagnostic('Actual schema9 reset fault positions='+count);const epoch=await B.W.rsEpoch(B.env),done=await B.api('super','/api/reset',{method:'POST',body:reset});assert.equal(done.status,200,JSON.stringify(done.json));assert.equal(done.json.ok,1);assert.equal(await B.W.rsEpoch(B.env),epoch+1);for(const table of tables)assert.equal(B.DB.q('SELECT COUNT(*)n FROM '+table)[0].n,0,table);
 assert.equal(B.DB.q('PRAGMA foreign_key_check').length,0);const remaining=JSON.parse(B.rawKeys().bassam_auth_users_v1);assert.equal(remaining.length,1);assert.equal(remaining[0].un,reset.admin.un);assert.equal(remaining[0].role,'super');assert.equal(remaining[0].id,'su');assert.equal(B.DB.q('SELECT * FROM sess').length,0);assert.deepEqual(r2Calls,[]);
});
