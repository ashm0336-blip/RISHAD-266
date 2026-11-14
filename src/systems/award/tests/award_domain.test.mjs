/* Actual canonical Award worker + isolated SQLite. No staged runtime, cloud or R2. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {D1Shim} from '../../../../tests/unit/harness.mjs';
import {world as baseWorld, ROOT, D1, D2, IDS, EKEYS, identitySnapshot} from '../../../../tests/unit/custody_review_fx.mjs';
import {candidateWorker} from '../../../../tests/unit/irshad_domain_fx.mjs';
import {installOperationalFixture} from '../../../../tests/unit/operational_legacy_seed_fx.mjs';

const NAMED=['AW_RES','AW_NAMES','AW_FIELDS','AW_TABLES','awKey','awConvert','awInflate','awValidateDomain','awEmptyDomain',
  'awInstallStatements','awExportDomain','awDomainPlan','awLegacyPrepare','awPlanEmployeeCleanup','awRevs','awQueryContext',
  'hAwardGet','hAwardAct','awPermission','awPhysicalTables','awRecordKey','rsEpochGuard','canRead','KIVO_FIND','KIVO_GUARDS'];
const copy=value=>JSON.parse(JSON.stringify(value));
const sample=(id='TEST_ONLY_award',patch={})=>({id,ekey:EKEYS.employee1,cat:'emp',hij:'1448-1-2',score:85,cases:3,fileOk:null,ok:true,st:'قيد التحكيم',
  comp:'١٢٣',declName:'اسم تاريخي',by:'المرشح',byTitle:'مشرف',wdesc:'وصف',wevid:'دليل',pic:'data:image/png;base64,TEST_ONLY',sigEmp:'',sigBy:null,
  caseTxt:['أ',null,''],ans:[true,false,null],scores:[[1,2],[],[null]],...patch});
const references=mark=>Object.fromEntries(['A','B','C'].map(k=>[k,{title:k+mark,lead:'مقدمة',foot:'خاتمة',secs:[{title:'قسم',body:'<p dir="rtl">'+mark+'&amp; نص</p>'}]}]));
async function world({mode='enforce',docs={}}={}){
  const B=await baseWorld({mode}),W=await candidateWorker(NAMED);
  assert.equal(W.KIVO_SCHEMA_VERSION,10,'Generate and register the actual current schema before Award integration tests');await installOperationalFixture(B.env);
  const keys=copy(B.keys),p=keys.bassam_perms_v1;
  Object.keys(p.caps).forEach(d=>{p.caps[d]=[...new Set(p.caps[d].concat('award'))];});
  p.emps[D1][EKEYS.employee1]={'award/new':['view','add'],'award/res':['view','edit','approve','del'],'award/doc':['view','add','edit','del']};
  async function put(k,v,bump=true){await B.DB.batch(W.kvPutStmts(B.env,'kv',k,JSON.stringify(v)));if(bump)await B.DB.prepare('INSERT INTO revs(k,rev)VALUES(?1,1)ON CONFLICT(k)DO UPDATE SET rev=rev+1').bind(k).run();W.preOff(B.env);}
  await put('bassam_perms_v1',p);
  async function install(d,values){const domain=W.awConvert(d,values);await B.DB.batch(W.awInstallStatements(B.env,domain));return domain;}
  if(Object.keys(docs).length)await install(D1,docs);
  const actor=who=>({u:{id:IDS[who]}}),read=(who='super',q={})=>W.hAwardGet(B.env,actor(who),{dept:D1,...q});
  let request=0;
  const command=async(op,fields={},who='super',base)=>(await read(who,{view:'context'}),{uid:IDS[who],dept:D1,requestId:'TEST_ONLY_request_'+ ++request,base:base||(await read(who,{view:'context'})).base,op,...fields});
  const act=(body,who='super')=>W.hAwardAct(B.env,actor(who),body,{ip:'TEST_ONLY',dev:'TEST_ONLY',city:'TEST_ONLY'});
  return {...B,W,keys,put,install,actor,read,command,act};
}
function domainSnapshot(B){return Object.fromEntries(Object.values(B.W.awPhysicalTables()).map(([table])=>[table,copy(B.DB.q('SELECT * FROM '+table))]));}
function committedSnapshot(B){return {...domainSnapshot(B),revs:copy(B.DB.q('SELECT * FROM revs ORDER BY k')),meta:copy(B.DB.q('SELECT * FROM meta ORDER BY k')),aud:copy(B.DB.q('SELECT * FROM aud ORDER BY cid')),
  notification_messages:copy(B.DB.q('SELECT * FROM notification_messages ORDER BY id')),notification_dedup:copy(B.DB.q('SELECT * FROM notification_dedup ORDER BY scope,once_key'))};}
function installCanonicalAwardDDL(W,DB){const migration=W.KIVO_MIGRATIONS.find(m=>m.name==='0009_seized_awards');assert.ok(migration);const ddl=migration.sql.filter(sql=>/CREATE\s+(?:TABLE|INDEX)\s+IF NOT EXISTS\s+award_/i.test(sql));assert.equal(ddl.length,13,'11 canonical tables and two indexes');for(const sql of ddl)DB.exec(sql);}

test('Award codec preserves all known fields, null/absence, empty score rows, HTML and missing legacy business id',async()=>{
  const W=await candidateWorker(NAMED),full=sample();
  for(const [name,,type]of W.AW_FIELDS)if(!(name in full))full[name]=type==='text'?'TEST_ONLY_'+name:type==='number'?0:false;
  const input={records:{recs:[full,{ekey:'TEST_ONLY_old_employee',name:'اسم قديم',scores:[[]],caseTxt:null,ans:[]}]},docsV1:{A:{title:null,secs:[{h:'عنوان',items:[{k:'l',t:'أ & ب'},{}]}]}},docsV2:references('HTML')};
  const domain=W.awConvert(D1,input);assert.deepEqual(W.awInflate(W.awValidateDomain(domain,D1)),input);
  assert.equal('id'in W.awInflate(domain).records.recs[1],false);assert.equal(domain.rows.records[1].business_id,null);
  domain.rows.records[0].sequence=100;domain.rows.records[1].sequence=4;
  assert.equal(W.awValidateDomain(domain,D1),domain,'Sparse persisted sequence survives validation');
  const global=W.awConvert('',{docsV1:input.docsV1,docsV2:input.docsV2});assert.deepEqual(W.awInflate(W.awValidateDomain(global,'')),{docsV1:input.docsV1,docsV2:input.docsV2});
  assert.deepEqual(W.awInflate(W.awConvert(D1,{records:null,docsV1:{},docsV2:null})),{records:null,docsV1:{},docsV2:null});
});

test('Award codec rejects unknown ts, malformed ids, ambiguous identity and inconsistent relational masks',async()=>{
  const W=await candidateWorker(NAMED);
  for(const patch of [{ts:1},{id:null},{id:4},{id:''},{scores:[null]},{ans:['true']},{pic:{id:'TEST_ONLY'}}])assert.throws(()=>W.awConvert(D1,{records:{recs:[sample('id',patch)]}}),/award-/);
  assert.throws(()=>W.awConvert(D1,{records:{recs:[sample('same'),sample('same')]}}),/award-record-identity/);
  assert.throws(()=>W.awConvert(D1,{records:{recs:[{}]}}),/award-record-identity/);
  assert.throws(()=>W.awConvert('',{records:{recs:[]}}),/award-global-records/);
  const d=W.awConvert(D1,{records:{recs:[sample()]}});d.rows.records[0].presence_mask=null;assert.throws(()=>W.awValidateDomain(d,D1),/award-/);
  const bad=W.awConvert(D1,{records:{recs:[sample()]}});bad.rows.scores[0].column_number=99;assert.throws(()=>W.awValidateDomain(bad,D1),/award-/);
});

test('Award legacy planner validates unknown/ambiguous source before DDL and atomically preserves explicit global+dept scopes',async()=>{
  const W=await candidateWorker(NAMED),DB=new D1Shim(),env={DB};
  DB.exec('CREATE TABLE kv(k TEXT,seq INTEGER,v TEXT,PRIMARY KEY(k,seq));CREATE TABLE meta(k TEXT PRIMARY KEY,v TEXT);CREATE TABLE revs(k TEXT PRIMARY KEY,rev INTEGER);');
  async function put(k,v){await DB.batch(W.kvPutStmts(env,'kv',k,JSON.stringify(v)));}
  await put('bassam_depts_v1',[{id:D1}]);await put(W.awKey(D1),{recs:[sample('valid',{ts:1})]});
  await assert.rejects(()=>W.awLegacyPrepare(env),/award-shape/);assert.equal(DB.q("SELECT name FROM sqlite_master WHERE name LIKE 'award_%'").length,0);
  await put(W.awKey(D1),{recs:[sample()]});await put(W.awKey('',2),references('GLOBAL'));await put(W.awKey(D1,2),references('DEPT'));
  const plan=await W.awLegacyPrepare(env);assert.equal(plan.domains.length,2);assert.equal(DB.q("SELECT name FROM sqlite_master WHERE name LIKE 'award_%'").length,0);
  installCanonicalAwardDDL(W,DB);DB.exec('PRAGMA foreign_keys=ON');
  await DB.batch(plan.before.concat(plan.after));assert.equal(DB.q('SELECT * FROM kv WHERE k LIKE ?','%award%').length,0);
  assert.deepEqual(W.awInflate(await W.awExportDomain(env,'')),{docsV2:references('GLOBAL')});assert.deepEqual(W.awInflate(await W.awExportDomain(env,D1)),{records:{recs:[sample()]},docsV2:references('DEPT')});
  assert.equal(DB.q('PRAGMA foreign_key_check').length,0);
});

test('Award legacy cutover raw source and nonempty typed target races fail closed without deleting source',async()=>{
  const W=await candidateWorker(NAMED);
  for(const race of ['source','target']){const DB=new D1Shim(),env={DB};DB.exec('CREATE TABLE kv(k TEXT,seq INTEGER,v TEXT,PRIMARY KEY(k,seq));CREATE TABLE meta(k TEXT PRIMARY KEY,v TEXT);CREATE TABLE revs(k TEXT PRIMARY KEY,rev INTEGER);');
    await DB.batch(W.kvPutStmts(env,'kv','bassam_depts_v1',JSON.stringify([{id:D1}])));await DB.batch(W.kvPutStmts(env,'kv',W.awKey(D1),JSON.stringify({recs:[sample()]})));
    const p=await W.awLegacyPrepare(env);installCanonicalAwardDDL(W,DB);
    if(race==='source')DB.db.prepare('UPDATE kv SET v=? WHERE k=?').run(JSON.stringify({recs:[]}),W.awKey(D1));else DB.db.prepare('INSERT INTO award_resources VALUES(?,?,?,?)').run(D2,'records',2,2);
    const before=copy(DB.q('SELECT * FROM kv ORDER BY k,seq'));await assert.rejects(()=>DB.batch(p.before.concat(p.after)),/KIVO_/);assert.deepEqual(copy(DB.q('SELECT * FROM kv ORDER BY k,seq')),before);assert.equal(DB.q("SELECT * FROM meta WHERE k='aw_cutover_ready'").length,0);
  }
});

test('Award SQL records and summary preserve prepend/tie order and actual client Find ranking without loading images',async()=>{
  const rows=[sample('a',{declName:'أحمد عبدالله',score:80}),sample('b',{ekey:'TEST_ONLY_historical',declName:'عبد الله ۱۲۳',score:90}),sample('c',{score:90,ok:false}),sample('d',{cat:'team',score:100})],B=await world({docs:{records:{recs:rows}}});
  const first=await B.read('super',{view:'records',limit:2});assert.deepEqual(first.recs.map(r=>r.id),['a','b']);assert.equal(first.summary.total,4);assert.equal(first.summary.eligible,3);assert.equal(first.summary.employeeScoreAverage,260/3);assert.equal(first.summary.topScore,90);assert.equal(first.summary.topRecord.id,'b');
  assert.equal('pic'in first.recs[0],false);assert.equal('scores'in first.recs[0],false);assert.equal((await B.read('super',{view:'record',id:'a'})).record.pic,rows[0].pic);
  const next=await B.read('super',{view:'records',limit:2,cursor:first.next});assert.deepEqual(next.recs.map(r=>r.id),['c','d']);
  const last=await B.read('super',{view:'records',limit:2,page:999999});assert.equal(last.page,2);assert.deepEqual(last.recs.map(r=>r.id),['c','d']);
  const src=fs.readFileSync(path.join(ROOT,'src/services/332-find-day.js'),'utf8'),start=src.indexOf('var AR_D ='),end=src.indexOf('\n  })();',start),v={KIVO:{}};vm.runInNewContext('(function(){'+src.slice(start,end)+'})();',v);
  const emps=new Map(B.keys['bsdept:'+D1+':bassam_employees_v1'].map(e=>[e.eid,e]));
  for(const q of ['عبدالله','عبد الله','١٢٣','TEST_ONLY','احمد']){const expected=v.KIVO.BassamFind.filter(q,rows,r=>{const e=emps.get(r.ekey);return[e?.name||r.declName||'—',e?.empno||r.comp||'—',r.st,r.comp,r.declName];});const actual=await B.read('super',{view:'records',q,limit:200});assert.deepEqual(actual.recs.map(r=>r.id),expected.map(r=>r.id),q);assert.equal(actual.summary.total,4);}
  await assert.rejects(()=>B.read('manager1',{view:'records',limit:2,cursor:first.next}),/award-cursor-stale/);
});

test('Award references preserve versions and explicit global scope without cross-dept fallback or global write privilege',async()=>{
  const B=await world({docs:{docsV1:{A:{title:'V1',secs:[{h:'قديم',items:[{k:'l',t:'نص & <قيمة>'}]}]},B:{secs:[]},C:{secs:[]}}}});
  await B.install('',{docsV2:references('GLOBAL')});
  const dept=await B.read('super',{view:'references'}),global=await B.read('super',{view:'references',scope:'global'});
  assert.equal(dept.references.docsV1.present,true);assert.equal(dept.references.docsV2.present,false);assert.equal(dept.references.document.A.secs[0].body,'<ul><li>نص &amp; &lt;قيمة&gt;</li></ul>');assert.deepEqual(global.references.document,references('GLOBAL'));
  assert.equal((await B.read('super',{view:'references',dept:D2})).references.document,null);
  await B.install(D1,{records:{recs:[{ekey:'TEST_ONLY_missing_business_id',name:'TEST_ONLY legacy'}]}});
  const legacy=(await B.read('super',{view:'records'})).recs[0];assert.equal(legacy.id,legacy.recordKey);
  assert.equal('id'in(await B.read('super',{view:'record',id:legacy.recordKey})).record,false);
  assert.equal('id'in B.W.awInflate(await B.W.awExportDomain(B.env,D1)).records.recs[0],false,'Export never manufactures a business id');
  await assert.rejects(()=>B.read('employee1',{view:'references',scope:'global'}),/award-denied/);
  await assert.rejects(()=>B.act({uid:IDS.super,dept:'',requestId:'TEST_ONLY_global',base:global.base,op:'reference-replace',version:2,document:references('X')}),/readonly/);
  const same=await B.W.awDomainPlan(B.env,await B.W.awExportDomain(B.env,''),'');assert.equal(same.changed,false);assert.equal(same.statements.length,0);
  await assert.rejects(()=>B.W.awDomainPlan(B.env,B.W.awConvert('',{docsV2:references('CHANGED')}),''),/readonly/);
});

test('Award create/read/status/edit/delete use one atomic ACK, current authority and exact v2 reset classifier',async()=>{
  const B=await world({docs:{records:{recs:[sample('neighbour')]}}}),identity=identitySnapshot(B.DB);
  const body=await B.command('create',{data:{...sample('ignored'),id:undefined}});delete body.data.id;delete body.data.st;delete body.data.byUser;
  const first=await B.act(body);assert.equal(first.n,1);assert.equal(first.affected,'records');assert.equal(first.base.records,first.rev);assert.equal(first.base.docsV1,body.base.docsV1);assert.equal(first.base.epoch,body.base.epoch);assert.ok(first.id);
  const record=(await B.read('super',{view:'record',id:first.id})).record;assert.equal(record.st,'قيد التحكيم');assert.equal(record.byUser,B.users.find(u=>u.id===IDS.super).name);assert.deepEqual(record.scores,body.data.scores);
  const status=await B.act(await B.command('status',{id:first.id,status:'معتمد'}));assert.equal(status.id,first.id);assert.equal((await B.read('super',{view:'record',id:first.id})).record.st,'معتمد');
  await B.act(await B.command('edit',{id:first.id,data:{wdesc:'تم التعديل'}}));
  const deleted=await B.act(await B.command('delete',{id:first.id}));assert.equal(deleted.id,first.id);assert.equal((await B.read('super',{view:'records'})).total,1);
  const docs=await B.act(await B.command('reference-replace',{version:2,document:references('FIRST')}));assert.equal(docs.affected,'docsV2');assert.equal('id'in docs,false);
  assert.deepEqual(identitySnapshot(B.DB),identity,'Business commands preserve users and permission documents');
  const p=copy(B.keys.bassam_perms_v1);p.emps[D1][EKEYS.employee1]['award/doc']=['view','edit'];await B.put('bassam_perms_v1',p);
  const edit=references('FIRST');edit.A.lead='تعديل مقدمة';await B.act(await B.command('reference-replace',{version:2,document:edit},'employee1'),'employee1');
  const resetDocument=references('RESET');Object.values(resetDocument).forEach(g=>{g.lead='RESET lead';g.foot='RESET foot';});
  assert.ok(B.W.KIVO_GUARDS.classify('bassam_award_docs_v2',edit,resetDocument,{}).keys().includes('award.doc.reset'),'Real canonical reset shape, not an ordinary edit');
  const reset=await B.command('reference-replace',{version:2,document:resetDocument},'employee1');
  await assert.rejects(()=>B.act(reset,'employee1'),/award-denied/);
});

test('Award lost ACK replay is idempotent, fingerprint-bound and rechecks current permissions and complete proof',async()=>{
  const B=await world({docs:{records:{recs:[sample('neighbour')]}}}),data=sample();delete data.id;delete data.st;delete data.byUser;
  const body=await B.command('create',{data},'employee1'),ack=await B.act(body,'employee1'),before=committedSnapshot(B);
  assert.deepEqual(await B.act(body,'employee1'),ack);assert.deepEqual(committedSnapshot(B),before);
  await assert.rejects(()=>B.act({...body,data:{...data,score:17}},'employee1'),/award-request-reused/);
  const proof=B.DB.q('SELECT * FROM award_request_checks WHERE request_id=?',body.requestId);assert.ok(proof.length>0,'Successful write stores actual classified permission keys');
  B.DB.db.prepare('DELETE FROM award_request_checks WHERE request_id=?').run(body.requestId);
  await assert.rejects(()=>B.act(body,'employee1'),/award-receipt-permission-proof-invalid/);
  for(const row of proof)B.DB.db.prepare('INSERT INTO award_request_checks(department_id,account_uid,request_id,position,check_kind,permission_key)VALUES(?,?,?,?,?,?)').run(...['department_id','account_uid','request_id','position','check_kind','permission_key'].map(k=>row[k]));
  const p=copy(B.keys.bassam_perms_v1);p.emps[D1][EKEYS.employee1]['award/new']=['view'];await B.put('bassam_perms_v1',p,false);
  await assert.rejects(()=>B.act(body,'employee1'),/award-denied/);assert.equal((await B.read('super',{view:'records'})).total,2);
});

test('Award stale base/epoch, UID flip, foreign scope and raw authority race reject without a write',async()=>{
  const B=await world({docs:{records:{recs:[sample('n')]}}}),body=await B.command('status',{id:'n',status:'معتمد'}),snapshot=domainSnapshot(B);
  await assert.rejects(()=>B.act({...body,uid:IDS.employee1}),/award-session-changed/);assert.deepEqual(domainSnapshot(B),snapshot);
  await assert.rejects(()=>B.act({...body,uid:IDS.employee1,dept:D2},'employee1'),/award-denied/);
  await B.DB.prepare('INSERT INTO revs(k,rev)VALUES(?1,1)ON CONFLICT(k)DO UPDATE SET rev=rev+1').bind(B.W.awKey(D1)).run();
  await assert.rejects(()=>B.act(body),/award-conflict/);
  const fresh=await B.command('status',{id:'n',status:'معتمد'});B.DB.exec("INSERT INTO meta(k,v)VALUES('restore_epoch','1')ON CONFLICT(k)DO UPDATE SET v='1'");
  await assert.rejects(()=>B.act(fresh),/award-restore-epoch-changed/);
  const ctx=await B.W.awQueryContext(B.env,B.actor('super'),D1,{write:true});await B.put('bassam_perms_v1',{caps:{}},false);
  await assert.rejects(()=>B.DB.batch(ctx.guards.concat([B.DB.prepare("INSERT INTO meta(k,v)VALUES('TEST_ONLY_forbidden','1')")])),/KIVO_RESTORE_TARGET/);
  assert.equal(B.DB.q("SELECT * FROM meta WHERE k='TEST_ONLY_forbidden'").length,0);assert.deepEqual(domainSnapshot(B),snapshot);
});

// RISHAD-266 r3 (owner: an approved delete must be possible): deleting the LAST record is one record delete judged by
// ceiling + award delete permission (award.res.delete), never the unmapped collection wipe; a non-holder is still refused.
test('Award bounded deletion judges the last record as a record delete and keeps the reserved status',async()=>{
  const B=await world({docs:{records:{recs:[sample('one'),sample('two')]}}});
  const checks=body=>B.DB.q('SELECT check_kind,permission_key FROM award_request_checks WHERE request_id=?1 ORDER BY position',body.requestId).map(r=>r.check_kind+':'+r.permission_key);
  const first=await B.command('delete',{id:'one'},'employee1');await B.act(first,'employee1');assert.equal((await B.read('super',{view:'records'})).total,1);
  assert.deepEqual(checks(first),['enforce:award.res.delete']);
  const denied=await B.command('delete',{id:'two'},'leader'),held=domainSnapshot(B);await assert.rejects(()=>B.act(denied,'leader'),/award-denied/);
  assert.deepEqual(domainSnapshot(B),held,'A refused last-record delete writes nothing');assert.equal((await B.read('super',{view:'records'})).total,1);
  const back=await B.command('status',{id:'two',status:'قيد التحكيم'});await B.act(back);
  const approve=await B.command('status',{id:'two',status:'معتمد'});await B.act(approve);
  const reopen=await B.command('status',{id:'two',status:'قيد التحكيم'});await assert.rejects(()=>B.act(reopen),/award-denied/);
  assert.equal((await B.read('super',{view:'record',id:'two'})).record.st,'معتمد');
  const last=await B.command('delete',{id:'two'},'employee1'),ack=await B.act(last,'employee1');assert.equal(ack.n,1);assert.equal(ack.id,'two');
  assert.deepEqual(checks(last),['enforce:award.res.delete']);assert.equal((await B.read('super',{view:'records'})).total,0);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM award_records').at(0).n,0);assert.ok(!JSON.stringify(domainSnapshot(B)).includes('kivo:award-delete-anchor'));
  const S=await world({docs:{records:{recs:[sample('only')]}}}),lastSuper=await S.command('delete',{id:'only'}),superAck=await S.act(lastSuper);
  assert.equal(superAck.n,1);assert.equal((await S.read('super',{view:'records'})).total,0);
  assert.deepEqual(S.DB.q('SELECT check_kind,permission_key FROM award_request_checks WHERE request_id=?1',lastSuper.requestId).map(r=>r.check_kind+':'+r.permission_key),['enforce:award.res.delete']);
});

test('Award per-statement fault sweep rolls back records, arrays, receipts, revisions, notification and audit together',async t=>{
  const B=await world(),data=sample();delete data.id;delete data.st;delete data.byUser;
  const body=await B.command('create',{data}),baseline=committedSnapshot(B),original=B.DB.batch.bind(B.DB);let target=1,count=0,armed=false;
  B.DB.batch=async statements=>{const write=statements.some(s=>s.sql.startsWith('INSERT INTO award_requests('));if(!write)return original(statements);count=statements.length;let n=0;B.DB.failIf=()=>armed&&++n===target;armed=true;try{return await original(statements);}finally{armed=false;B.DB.failIf=null;}};
  try{for(target=1;target<=(count||1);target++){await assert.rejects(()=>B.act(body),/injected failure/);assert.deepEqual(committedSnapshot(B),baseline,'Atomic rollback at batch statement '+target+'/'+count);}}
  finally{B.DB.batch=original;B.DB.failIf=null;}
  assert.ok(count>=20);t.diagnostic('Actual atomic Award batch fault positions: '+count);
  const ack=await B.act(body);assert.equal(ack.n,1);assert.deepEqual((await B.read('super',{view:'record',id:ack.id})).record.scores,data.scores);assert.equal(B.DB.q('PRAGMA foreign_key_check').length,0);
});

test('Award employee cleanup preserves prior orphan and all reference bytes; unchanged empty plan emits no DELETE',async()=>{
  const rows=[sample('gone'),sample('orphan',{ekey:'TEST_ONLY_prior_orphan',name:'TEST_ONLY employee1'}),{ekey:'',name:'TEST_ONLY removed_name'}],B=await world({docs:{records:{recs:rows},docsV2:references('KEEP')}});
  const old=B.keys['bsdept:'+D1+':bassam_employees_v1'].concat({eid:'TEST_ONLY_name_only',name:'TEST_ONLY removed_name'}),next=old.filter(e=>e.eid!==EKEYS.employee1&&e.eid!=='TEST_ONLY_name_only'),before=domainSnapshot(B),base=await B.W.awRevs(B.env,D1);
  const plan=await B.W.awPlanEmployeeCleanup(B.env,(await B.W.awQueryContext(B.env,B.actor('super'),D1,{write:true})).A,D1,{oldEmployees:old,newEmployees:next,base,reason:'TEST_ONLY employee deletion'});
  assert.equal(plan.count,2);assert.deepEqual(plan.revisionKeys,[B.W.awKey(D1)]);assert.ok(plan.statements.every(s=>!/^DELETE FROM award_doc/.test(s.sql)));
  await B.DB.batch(plan.guards.concat(plan.statements));const after=domainSnapshot(B);
  for(const table of ['award_documents','award_doc_sections','award_doc_items'])assert.deepEqual(after[table],before[table],table);
  const domain=await B.W.awExportDomain(B.env,D1);assert.deepEqual(B.W.awInflate(domain).records.recs,[rows[1]]);
  const empty=await B.W.awDomainPlan(B.env,B.W.awEmptyDomain(D2),D2);assert.equal(empty.statements.length,0);assert.equal(empty.guards.length,1);assert.equal(empty.changed,false);await B.DB.batch(empty.guards);
  B.DB.db.prepare('INSERT INTO award_resources VALUES(?,?,?,?)').run(D2,'records',2,2);
  await assert.rejects(()=>B.DB.batch(empty.guards.concat([B.DB.prepare("INSERT INTO meta(k,v)VALUES('TEST_ONLY_empty_race','1')")])),/KIVO_AWARD_TARGET_CHANGED/);assert.equal(B.DB.q("SELECT * FROM meta WHERE k='TEST_ONLY_empty_race'").length,0);
});

test('Award retired source suffix and raw record races cannot be accepted by a prepared typed command',async()=>{
  const B=await world({docs:{records:{recs:[sample('one'),sample('two')]}}}),body=await B.command('status',{id:'one',status:'معتمد'});
  await B.put(B.W.awKey(D2,1)+':TEST_ONLY_foreign','retired',false);await assert.rejects(()=>B.act(body),/award-legacy-source-present/);
  await B.DB.prepare('DELETE FROM kv WHERE k=?1').bind(B.W.awKey(D2,1)+':TEST_ONLY_foreign').run();
  const original=B.DB.batch.bind(B.DB);let raced=false;
  B.DB.batch=async statements=>{if(!raced&&statements.some(s=>s.sql.startsWith('INSERT INTO award_requests('))){raced=true;B.DB.db.prepare('UPDATE award_records SET work_description=? WHERE business_id=?').run('TEST_ONLY_concurrent','one');}return original(statements);};
  try{await assert.rejects(()=>B.act(body),/award-conflict/);}finally{B.DB.batch=original;}
  assert.equal(B.DB.q('SELECT status,work_description FROM award_records WHERE business_id=?','one')[0].status,'قيد التحكيم');assert.equal(B.DB.q('SELECT * FROM award_requests').length,0);
});

test('Award write-only permission remains valid for typed create without granting a read',async()=>{
  const B=await world(),p=copy(B.keys.bassam_perms_v1);p.emps[D1][EKEYS.employee1]={'award/new':['add']};await B.put('bassam_perms_v1',p);
  await assert.rejects(()=>B.read('employee1',{view:'records'}),/award-denied/);
  const ctx=await B.W.awQueryContext(B.env,B.actor('employee1'),D1,{write:true}),data=sample();delete data.id;delete data.st;delete data.byUser;
  const body={uid:IDS.employee1,dept:D1,requestId:'TEST_ONLY_write_only',base:ctx.base,op:'create',data},ack=await B.act(body,'employee1');assert.equal(ack.n,1);assert.deepEqual(await B.act(body,'employee1'),ack);
  await assert.rejects(()=>B.read('employee1',{view:'records'}),/award-denied/);assert.equal((await B.read('super',{view:'records'})).total,1);
});

test('Award public route retains session UID, method and closed-body checks around the typed handler',async()=>{
  const B=await world(),get=await B.api('super','/api/award?dept='+D1+'&view=records&uid='+IDS.super);assert.equal(get.status,200);assert.equal(get.json.total,0);
  const data=sample();delete data.id;delete data.st;delete data.byUser;
  const body=await B.command('create',{data}),created=await B.api('super','/api/award/act',{method:'POST',body});assert.equal(created.status,200);assert.equal(created.json.n,1);
  const mismatch=await B.api('employee1','/api/award/act',{method:'POST',body});assert.equal(mismatch.status,409);assert.equal(mismatch.json.err,'session-changed');
  const malformed=await B.api('super','/api/award/act',{method:'POST',body:{...body,requestId:'TEST_ONLY_unknown_body',unrecognized:'no'}});assert.equal(malformed.status,400);
  const guest=await B.api(null,'/api/award?dept='+D1+'&view=records');assert.equal(guest.status,401);
  const method=await B.api('super','/api/award/act');assert.equal(method.status,405);
});
