import {cuInflate} from './custody_legacy_oracle.mjs';
/* Pre-cutover identity scenarios preserved against the current typed API.
   Snapshots are now captured by the server, never supplied by a browser ledger. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {world,D1,IDS,EKEYS,EMP,copy,identitySnapshot,ok,act,createType,read,setEmployees,historyWorld,pageFor} from './custody_scenarios_fx.mjs';

const initial=()=>({items:[{name:'TEST_ONLY radio',qty:3,prefix:'TEST',color:'#b99751'}],moves:[]});
const typed=A=>copy(Object.fromEntries(['custody_items','custody_issues','custody_movements','custody_requests'].map(table=>[table,A.DB.q('SELECT * FROM '+table)])));
async function custodyWorld(mode='enforce'){
  const A=await world({mode}),permissions=copy(A.keys.bassam_perms_v1),employees=copy(A.keys[EMP]);
  permissions.emps[D1][EKEYS.employee1]['emps/custody']=['view','add'];
  permissions.emps[D1][EKEYS.leader]['emps/custody']=['view','edit'];
  employees.find(row=>row.eid===EKEYS.employee1).empno='TEST_ONLY_employee_number';
  await A.DB.batch(A.W.kvPutStmts(A.env,'kv','bassam_perms_v1',JSON.stringify(permissions)));
  await setEmployees(A,employees);return A;
}
const firstOut=A=>copy(A.DB.q("SELECT * FROM custody_movements WHERE kind='out' ORDER BY sequence")[0]);

test('the real hand-out writer snapshot is accepted by the actual API without stripping identity fields',async()=>{
  const A=await custodyWorld();await createType(A);const B=await pageFor(A,{who:'manager1'}),identities=identitySnapshot(A.DB);
  const result=await B.page.cuHandOut(EKEYS.employee1,'TEST_ONLY radio','#b99751','جديد',B.page._cuDraft({}));
  assert.equal(result.ok,1);assert.equal(result.receipt.outputs[0].serial,'TEST-001');
  const pending=firstOut(A),employee=A.keys[EMP].find(row=>row.eid===EKEYS.employee1);
  assert.equal(pending.holder_nid_snapshot,A.users.find(user=>user.ekey===EKEYS.employee1).un);
  assert.equal(pending.holder_empno_snapshot,'TEST_ONLY_employee_number');assert.equal(pending.holder_name_snapshot,employee.name);
  assert.equal(pending.actor_uid,IDS.manager1);assert.equal(A.DB.q("SELECT COUNT(*) n FROM kv WHERE k GLOB '*bassam_custody_v1'")[0].n,0);
  assert.deepEqual(identitySnapshot(A.DB),identities,'A handover cannot change accounts or permissions');
});

test('snapshot fields require bounded text and do not open the closed custody contract to unrelated fields',async()=>{
  const A=await custodyWorld(),itemId=await createType(A),before=typed(A),revision=await A.W.cuRev(A.env,D1);
  // Identity snapshots are not writable input any more: invalid AND otherwise
  // valid client overrides must be rejected, rather than trusted or stripped.
  for(const field of ['nid','empno','name'])for(const invalid of [3,false,null,[],{},'x'.repeat(4097),'x'.repeat(4096)]){
    const response=await act(A,'issue',{itemId,holderKey:EKEYS.employee1,[field]:invalid},'manager1');
    assert.equal(response.status,400,field+': client snapshot override');assert.equal(response.json.ok,0);assert.equal(response.json.rev,undefined);
    assert.deepEqual(typed(A),before);assert.equal(await A.W.cuRev(A.env,D1),revision);
  }
  const unknown=await act(A,'issue',{itemId,holderKey:EKEYS.employee1,TEST_ONLY_unrecognized:'TEST_ONLY'},'manager1');
  assert.equal(unknown.status,400);assert.deepEqual(typed(A),before);
  const tooLong=await act(A,'issue',{itemId,holderKey:EKEYS.employee1,condition:'x'.repeat(4097)},'manager1');
  assert.equal(tooLong.status,400);assert.equal(tooLong.json.rev,undefined);assert.deepEqual(typed(A),before);
  const employees=copy(A.keys[EMP]),employee=employees.find(row=>row.eid===EKEYS.employee1);
  for(const field of ['nid','empno','name'])employee[field]='x'.repeat(4096);await setEmployees(A,employees);
  ok(await act(A,'issue',{itemId,holderKey:EKEYS.employee1,condition:'x'.repeat(4096)},'manager1'));
  const saved=firstOut(A);for(const field of ['nid','empno','name'])assert.equal(saved['holder_'+field+'_snapshot'],'x'.repeat(4096),'Trusted source boundary preserved: '+field);
  assert.equal(saved.condition.length,4096);
});

test('the optional snapshot has no new identity format or uniqueness policy',async()=>{
  const A=await custodyWorld(),itemId=await createType(A),employees=copy(A.keys[EMP]),employee=employees.find(row=>row.eid===EKEYS.employee1);
  employee.nid='TEST_ONLY_legacy_identity';employee.empno='';employee.name='';await setEmployees(A,employees);
  for(let n=0;n<2;n++)ok(await act(A,'issue',{itemId,holderKey:EKEYS.employee1},'manager1'));
  const rows=A.DB.q("SELECT * FROM custody_movements WHERE kind='out' ORDER BY sequence");assert.equal(rows.length,2);
  for(const row of rows){assert.equal(row.holder_nid_snapshot,'TEST_ONLY_legacy_identity');assert.equal(row.holder_empno_snapshot,'');assert.equal(row.holder_name_snapshot,'');}
  assert.deepEqual(A.DB.q('SELECT serial FROM custody_issues ORDER BY serial').map(row=>row.serial),['TEST-001','TEST-002'],'Repeated/empty historical identifiers are not rejected by a new identity policy');
});

test('saved custody snapshots still relink a recreated employee and expose an orphan that can be returned',async()=>{
  const A=await custodyWorld(),itemId=await createType(A);ok(await act(A,'issue',{itemId,holderKey:EKEYS.employee1},'manager1'));
  const snapshot=copy(firstOut(A));assert.ok(snapshot.holder_nid_snapshot&&snapshot.holder_empno_snapshot&&snapshot.holder_name_snapshot);
  for(const identity of [{nid:snapshot.holder_nid_snapshot},{empno:snapshot.holder_empno_snapshot}]){
    await setEmployees(A,[{eid:'TEST_ONLY_recreated_employee',name:'TEST_ONLY recreated',...identity}]);
    const held=await read(A,{view:'holder',holderKey:'TEST_ONLY_recreated_employee'});assert.equal(held.total,1);
    assert.equal(held.rows[0].eid,'TEST_ONLY_recreated_employee');assert.equal(held.rows[0].hid,EKEYS.employee1);
  }
  await setEmployees(A,[]);const month=await read(A,{view:'month'});assert.equal(month.rows.length,1);assert.equal(month.rows[0].orphan,true);assert.equal(month.rows[0].snapshot.name,snapshot.holder_name_snapshot);
  const B=await pageFor(A,{who:'manager1',employees:[]});B.page.state.empTab='custody';await B.page._cuRefresh();B.page._cuOpenHolder(EKEYS.employee1,true);await B.page._cuLoadHolder(EKEYS.employee1);
  const held=B.page.state.cuHolder;assert.equal(held.total,1);assert.equal(held.rows[0].orphan,true);
  const result=await B.page.cuCloseItem(EKEYS.employee1,'TEST_ONLY radio','TEST-001','in');assert.equal(result.ok,1);assert.equal(B.acks.length,1);
  assert.equal((await read(A,{view:'holder',holderKey:EKEYS.employee1})).total,0);
  assert.deepEqual(firstOut(A),snapshot,'Closing the orphan does not rewrite historical identity');
});

test('accepting the snapshot does not broaden add, edit, department or session permissions in either mode',async()=>{
  for(const mode of ['legacy','enforce']){
    const A=await custodyWorld(mode),itemId=await createType(A),before=typed(A);
    for(const who of ['noView','manager2','employee2']){
      const result=await act(A,'issue',{itemId,holderKey:EKEYS.employee1},who);assert.equal(result.status,403,mode+': '+who);assert.equal(result.json.ok,0);assert.equal(result.json.rev,undefined);assert.deepEqual(typed(A),before);
    }
    for(const who of ['frozen',null]){const result=await act(A,'issue',{itemId,holderKey:EKEYS.employee1},who);assert.equal(result.status,401);assert.equal(result.json.rev,undefined);assert.deepEqual(typed(A),before);}
    const issued=ok(await act(A,'issue',{itemId,holderKey:EKEYS.employee1},'employee1')),afterIssue=typed(A),issueId=issued.outputs[0].issueId;
    const addOnly=await act(A,'close',{issueId,kind:'in'},'employee1');assert.equal(addOnly.status,403,mode+': add cannot return custody');assert.equal(addOnly.json.rev,undefined);assert.deepEqual(typed(A),afterIssue);
    ok(await act(A,'close',{issueId,kind:'in'},'leader'));assert.equal(A.DB.q("SELECT COUNT(*) n FROM custody_movements WHERE kind='in'")[0].n,1,mode+': edit can return custody');
  }
});

test('an unchanged historical snapshot is not retroactively rejected when appending a legitimate movement',async()=>{
  const previous=initial(),out={t:'out',eid:EKEYS.employee1,item:'TEST_ONLY radio',ser:'TEST-001',y:1448,m:5,d:1,name: 'x'.repeat(5000),nid:'TEST_ONLY_legacy',empno:''};
  previous.moves.push(out);const A=await historyWorld(previous),historical=copy(firstOut(A));
  assert.equal(historical.holder_name_snapshot.length,5000);const issueId=A.DB.q('SELECT issue_id FROM custody_issues')[0].issue_id;
  ok(await act(A,'close',{issueId,kind:'in'},'manager1'));assert.deepEqual(firstOut(A),historical);
  const rows=await A.W.cuSnapshotRows(A.env,D1);const next=cuInflate(rows);assert.deepEqual(next.moves[0],out);assert.equal(next.moves.length,2);assert.equal(next.moves[1].t,'in');
});

test('a database failure returns no save ACK and leaves the previous typed custody ledger intact',async()=>{
  const A=await custodyWorld(),itemId=await createType(A),before=typed(A),base=await A.W.cuRev(A.env,D1);
  const body={uid:IDS.manager1,dept:D1,base,requestId:'TEST_ONLY_database_failure_retry',op:'issue',itemId,holderKey:EKEYS.employee1};
  A.DB.failIf=sql=>/^INSERT\s+INTO custody_(?:issues|movements)\b/.test(sql);
  const failed=await A.api('manager1','/api/custody/act',{method:'POST',body});A.DB.failIf=null;
  assert.ok(failed.status>=500);assert.equal(failed.json?.rev,undefined);assert.deepEqual(typed(A),before);assert.equal(await A.W.cuRev(A.env,D1),base);
  const receipt=ok(await A.api('manager1','/api/custody/act',{method:'POST',body}));assert.equal(receipt.requestId,body.requestId);assert.equal(receipt.outputs[0].serial,'TEST-001');assert.equal(A.DB.q('SELECT COUNT(*) n FROM custody_movements')[0].n,1);
});
