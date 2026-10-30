import {test} from 'node:test';
import assert from 'node:assert/strict';
import {world,seed,receipt,tableSnapshot,D1,D2,IDS,identitySnapshot} from './irshad_domain_fx.mjs';

const clone=x=>JSON.parse(JSON.stringify(x));
const docs=(id='TEST_ONLY_record')=>({reports:{reports:[{id,y:1448,m:1,d:2,ts:12,shift:'TEST_ONLY_shift',eid:'TEST_ONLY_old_employee',name:'TEST_ONLY historical name',langs:[{lang:'TEST_ONLY',count:0}],bro:0}]},
  languages:['TEST_ONLY','TEST_ONLY'],locations:[],retro:{v:1,windows:[]}});
let request=0;
async function restoreBody(B,{scope={kind:'full'},domains:extra={},keys:extraKeys={}}={}) {
  const A=await B.W.actorOf(B.env,IDS.super), nf=await B.canonicalW.nfRead(B.env), ds=await B.canonicalW.dsDomainRead(B.env),
    url=new URL('http://x/export'+(scope.kind==='dept'?'?dept='+scope.departmentId:'')),
    cu=await B.canonicalW.cuExport(B.env,A,url), ir=await B.W.irExport(B.env,A,url),
    keys=scope.kind==='full'?Object.fromEntries(Object.entries(B.keys).map(([k,v])=>[k,JSON.stringify(v)])):{};
  Object.assign(keys,extraKeys);
  const depts=scope.kind==='full'?JSON.parse(keys.bassam_depts_v1).map(d=>d.id):[scope.departmentId],
    notifications=scope.kind==='full'?nf:Object.fromEntries(Object.entries(nf).map(([name,rows])=>[name,Array.isArray(rows)?
      (['overrides','checkpoints'].includes(name)?[]:rows.filter(row=>(name==='states'?row.message_scope:row.scope)==='d:'+scope.departmentId)):rows])),
    business=Object.fromEntries(await Promise.all(B.W.bdDefinitions().map(async def=>[def.name,await Promise.all(depts.concat(def.name==='awards'&&scope.kind==='full'?['']:[]).map(d=>def.exportDomain(B.env,d)))]))),
    domains={...(scope.kind==='full'?{dailyStats:{version:1,data:ds.data}}:{}),notifications,custody:cu.domains,irshad:ir.domains,...business,...extra},
    base=(await B.W.rsRestoreInventory(B.env,A,scope,depts)).base;
  return {version:1,requestId:'TEST_ONLY_ir_restore_'+ ++request,scope,mode:'replace',reason:'TEST_ONLY reviewed recovery',base,keys,delete:[],domains,
    manifest:{version:3,scope:scope.kind,domains:{kv:1,...(scope.kind==='full'?{dailyStats:1}:{}),notifications:1,custody:1,irshad:1,seized:1,awards:1},departments:depts,
      keys:Object.keys(keys).filter(k=>scope.kind==='full'||k!=='bassam_perms_v1').map(k=>scope.kind==='dept'?k.replace('bsdept:'+scope.departmentId+':',''):k)}};
}
async function prepare(B,body){return B.W.rsPrepare(B.env,await B.W.actorOf(B.env,IDS.super),body,{});}
async function commit(B,plan){return B.W.rsCommit(B.env,await B.W.actorOf(B.env,IDS.super),plan,{});}

test('typed Irshad restore uses one common batch, clears receipts and captures complete internal preimage',async()=>{
  const B=await world(); await seed(B,docs()); receipt(B);
  const identity=identitySnapshot(B.DB), next=docs('TEST_ONLY_restored'), body=await restoreBody(B);
  body.domains.irshad[0]=B.W.irConvert(D1,next);
  const plan=await prepare(B,body), batch=B.DB.batch.bind(B.DB); let writes=0;
  B.DB.batch=async statements=>{if(statements.some(s=>s.sql.includes('INSERT INTO restore_operations')))writes++;return batch(statements);};
  const ack=await commit(B,plan);
  assert.equal(ack.ok,1);assert.equal(writes,1);assert.deepEqual(identitySnapshot(B.DB),identity);
  assert.deepEqual(B.W.irInflate(await B.W.irSnapshot(B.env,D1)),next);
  assert.equal(B.DB.q('SELECT * FROM irshad_requests').length,0);
  assert.ok(B.DB.q("SELECT table_key FROM restore_snapshot_manifest WHERE domain='irshad'").some(row=>row.table_key===D1+':requests'));
  assert.deepEqual(Object.values(await B.W.irRevs(B.env,D1)),[ack.rev,ack.rev,ack.rev,ack.rev]);
  const replay=await commit(B,await prepare(B,body));assert.equal(replay.duplicate,1);assert.equal(writes,1);
});

test('late receipt insertion failure rolls back typed replacement, receipts, preimage and all revisions',async()=>{
  const B=await world();await seed(B,docs());receipt(B);
  const body=await restoreBody(B);body.domains.irshad[0]=B.W.irConvert(D1,docs('TEST_ONLY_replacement'));
  const plan=await prepare(B,body), before=tableSnapshot(B);
  B.DB.failIf=sql=>sql.includes('INSERT INTO restore_operations');
  await assert.rejects(commit(B,plan),/injected failure/);B.DB.failIf=null;
  assert.deepEqual(tableSnapshot(B),before);
});

test('typed row or receipt writer after planning survives failed restore without partial application',async()=>{
  for(const mutate of [B=>B.DB.db.prepare('UPDATE irshad_reports SET employee_name=? WHERE department_id=?').run('TEST_ONLY concurrent',D1),B=>receipt(B)]){
    const B=await world();await seed(B,docs());const body=await restoreBody(B);body.domains.irshad[0]=B.W.irEmptyDomain(D1);
    const plan=await prepare(B,body);mutate(B);const before=tableSnapshot(B);
    await assert.rejects(commit(B,plan),/KIVO_RESTORE_TARGET/);assert.deepEqual(tableSnapshot(B),before);
  }
});

test('retired KV reintroduced after the precheck is rejected inside the same restore transaction',async()=>{
  const B=await world();await seed(B,docs());const body=await restoreBody(B);body.domains.irshad[0]=B.W.irEmptyDomain(D1);
  const plan=await prepare(B,body), batch=B.DB.batch.bind(B.DB);let before,changed=false;
  B.DB.batch=async statements=>{
    if(!changed&&statements.some(s=>s.sql.includes('INSERT INTO restore_operations'))){changed=true;B.DB.db.prepare('INSERT INTO kv(k,seq,v)VALUES(?,?,?)').run(B.W.irKey(D1),0,'{"reports":[]}');before=tableSnapshot(B);}
    return batch(statements);
  };
  await assert.rejects(commit(B,plan),/KIVO_IRSHAD_LEGACY_SOURCE/);assert.equal(changed,true);assert.deepEqual(tableSnapshot(B),before);
});

test('v3 rejects missing explicit Irshad domains and stale independent resource bases without writes',async()=>{
  for(const mutate of [body=>delete body.domains.irshad,body=>delete body.manifest.domains.irshad,body=>body.base.irshad[D1].languages++]){
    const B=await world();const body=await restoreBody(B),before=tableSnapshot(B);mutate(body);
    await assert.rejects(prepare(B,body));assert.deepEqual(tableSnapshot(B),before);
  }
});

test('baseline manifest v1 Irshad JSON converts losslessly to explicit v3 typed domains and scoped remap',async()=>{
  const B=await world(), A=await B.W.actorOf(B.env,IDS.super), original=docs(), body=await restoreBody(B,{scope:{kind:'dept',departmentId:D1}}),
    file={app:'bassam-crowd',version:3,kind:'dept',data:{},domains:clone(body.domains),manifest:clone(body.manifest)};
  delete file.domains.irshad;file.manifest.version=1;delete file.manifest.domains.irshad;
  for(const name of ['seized','awards']){delete file.domains[name];delete file.manifest.domains[name];}
  B.W.IR_RES_NAMES.forEach((name,i)=>file.data[B.W.irKey(D1,i)]=JSON.stringify(original[name]));
  file.manifest.keys=B.W.IR_RES.slice();
  const converted=await B.W.rsConvertBackup(B.env,A,file,{scope:{kind:'dept',departmentId:D2},mode:'replace',reference:{inputKeys:Object.fromEntries(Object.entries(B.keys).map(([k,v])=>[k,JSON.stringify(v)]))}});
  assert.equal(converted.manifest.version,3);assert.equal(converted.manifest.domains.irshad,1);
  assert.deepEqual(converted.manifest.keys,[]);assert.deepEqual(Object.keys(converted.keys),[]);
  assert.equal(converted.domains.irshad[0].scope.departmentId,D2);
  assert.deepEqual(B.W.irInflate(converted.domains.irshad[0]),original);
  assert.equal(Object.prototype.hasOwnProperty.call(converted.domains.irshad[0].rows,'requests'),false);
});

test('v2 backup cannot gain legacy empty fallback or duplicate typed/JSON Irshad sources',async()=>{
  for(const change of [file=>delete file.domains.irshad,file=>{file.data['bsdept:'+D1+':bassam_irshad_v1']='{"reports":[]}';file.manifest.keys.push('bassam_irshad_v1');}]){
    const B=await world(),body=await restoreBody(B,{scope:{kind:'dept',departmentId:D1}}),
      file={app:'bassam-crowd',version:3,kind:'dept',data:{},domains:body.domains,manifest:body.manifest}, before=tableSnapshot(B);
    file.manifest.version=2;for(const name of ['seized','awards']){delete file.domains[name];delete file.manifest.domains[name];}
    change(file);await assert.rejects(B.W.rsConvertBackup(B.env,await B.W.actorOf(B.env,IDS.super),file,{scope:body.scope,mode:'replace',reference:{inputKeys:{}}}));
    assert.deepEqual(tableSnapshot(B),before);
  }
});

test('department wipe includes typed Irshad and leaves accounts and other departments intact',async()=>{
  const B=await world();await seed(B,docs());await seed(B,docs('TEST_ONLY_other'),D2);receipt(B);
  const ident=identitySnapshot(B.DB),other=B.W.irInflate(await B.W.irSnapshot(B.env,D2)),A=await B.W.actorOf(B.env,IDS.super),
    inventory=(await B.W.rsWipeInventory(B.env,A,D1,'wipe')).public;
  assert.ok(inventory.counts.irshad>0);
  const response=await B.api('super','/api/admin/dept-wipe',{method:'POST',body:{uid:IDS.super,dept:D1,requestId:'TEST_ONLY_ir_dept_wipe',reason:'TEST_ONLY wipe',base:inventory.base}});
  assert.equal(response.status,200,JSON.stringify(response.json));assert.equal(response.json.ok,1);
  assert.deepEqual(identitySnapshot(B.DB),ident);assert.deepEqual(B.W.irInflate(await B.W.irSnapshot(B.env,D2)),other);
  assert.equal(B.DB.q('SELECT * FROM irshad_requests WHERE department_id=?',D1).length,0);
  assert.deepEqual(B.W.irInflate(await B.W.irSnapshot(B.env,D1)),{});
});

test('independent resource presence bits survive catalog and reports writes in either order',async()=>{
  const B=await world();
  await B.DB.batch(B.W.irMarkResourceStatements(B.env,D1,'languages'));
  await B.DB.batch(B.W.irMarkResourceStatements(B.env,D1,'reports'));
  const domain=await B.W.irSnapshot(B.env,D1);
  assert.equal(domain.resources.languages,true);assert.equal(domain.resources.reports,true);assert.equal(domain.resources.locations,false);
  assert.deepEqual(B.W.irInflate(domain),{reports:{reports:[]},languages:[]});
});

test('routine retro presence initialization preserves an existing version or its deliberate absence',async()=>{
  for(const retro of [{windows:[]},{v:null,windows:[]},{v:2,windows:[]}]){
    const B=await world();await seed(B,{retro});
    await B.DB.batch(B.W.irMarkResourceStatements(B.env,D1,'retro'));
    assert.deepEqual(B.W.irInflate(await B.W.irSnapshot(B.env,D1)),{retro});
  }
  const B=await world();await B.DB.batch(B.W.irMarkResourceStatements(B.env,D1,'retro'));
  assert.deepEqual(B.W.irInflate(await B.W.irSnapshot(B.env,D1)),{retro:{v:1,windows:[]}});
});

test('full typed export refuses orphan scope instead of silently omitting stored rows',async()=>{
  const B=await world();await seed(B,docs(),'TEST_ONLY_orphan_department');
  const before=tableSnapshot(B);
  await assert.rejects(B.W.irExport(B.env,await B.W.actorOf(B.env,IDS.super),new URL('http://x/export')),/KIVO_IRSHAD_ORPHAN_SCOPE/);
  assert.deepEqual(tableSnapshot(B),before);
});

test('direct v3 restore and baseline conversion refuse operational or ambiguous Irshad JSON paths',async()=>{
  const B=await world(), body=await restoreBody(B), key=B.W.irKey(D1);
  body.keys[key]='{"reports":[]}';body.base.kv[key]=0;body.manifest.keys.push(key);
  const before=tableSnapshot(B);
  await assert.rejects(prepare(B,body),error=>error.rs==='domain-moved');
  const file={app:'bassam-crowd',version:3,kind:'dept',data:{[key+':extra']:'{"reports":[]}'},domains:{},
    manifest:{version:1,scope:'dept',domains:{kv:1,notifications:1,custody:1},departments:[D1],keys:['bassam_irshad_v1:extra']}};
  await assert.rejects(B.W.rsConvertBackup(B.env,await B.W.actorOf(B.env,IDS.super),file,{scope:{kind:'dept',departmentId:D1},mode:'replace',reference:{inputKeys:{}}}),error=>error.rs==='backup-irshad-namespace');
  assert.deepEqual(tableSnapshot(B),before);
});
