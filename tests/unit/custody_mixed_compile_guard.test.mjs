/* Whole-batch safety survives retirement of the temporary custody barrier. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {world,createType,act,ok,D1,EKEYS,EMP,copy} from './custody_scenarios_fx.mjs';
import {inspectOperationalFixture} from './operational_legacy_seed_fx.mjs';
import {operationSaveBody} from './tasks_fx.mjs';

const OPTIONS='bsdept:'+D1+':bassam_options_v1';
const value=(A,key)=>A.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq',key).map(row=>row.v).join('');
const ledger=A=>copy(Object.fromEntries(['custody_items','custody_issues','custody_movements','custody_requests'].map(table=>[table,A.DB.q('SELECT * FROM '+table)])));
async function fixture(held){
  const A=await world();
  if(held){const itemId=await createType(A);ok(await act(A,'issue',{itemId,holderKey:EKEYS.employee1}));}
  return A;
}
/* Schema 10 (d5a08a6): employees and options are typed Operations resources. /api/save only accepts them
   inside the operations envelope (requestId+epoch) with the real revision bases, and they are read back typed. */
const typed=(A,key)=>inspectOperationalFixture(A.env,key);
const revisionOf=(A,key)=>A.DB.q('SELECT rev FROM revs WHERE k=?1',key)[0]?.rev||0;
async function operationSave(A,employeeValue){
  return A.api('super','/api/save',{method:'POST',body:operationSaveBody(A.env,'/api/save',{set:{[EMP]:employeeValue,[OPTIONS]:JSON.stringify({type:['TEST_ONLY mixed compile']})},del:[],base:{[EMP]:revisionOf(A,EMP),[OPTIONS]:revisionOf(A,OPTIONS)}})});
}
async function save(A,employeeValue){
  return A.api('super','/api/save',{method:'POST',body:{set:{[EMP]:employeeValue,[OPTIONS]:JSON.stringify({type:['TEST_ONLY mixed compile']})},del:[],base:{[EMP]:1,[OPTIONS]:0}}});
}

test('malformed employee JSON or legacy null with referenced custody rejects the complete mixed batch',async()=>{
  for(const invalid of ['TEST_ONLY invalid JSON','null']){
    /* Schema 10: the mixed batch goes through the operations envelope; the requirement is whole-batch refusal
       with the roster denied and nothing (typed roster/options, custody ledger, revisions, retired KV) written. */
    const A=await fixture(true),before={employees:typed(A,EMP),options:typed(A,OPTIONS),ledger:ledger(A),revisions:copy(A.DB.q('SELECT * FROM revs ORDER BY k'))};
    assert.ok(Array.isArray(before.employees)&&before.employees.some(row=>row.eid===EKEYS.employee1),'Typed roster holds the custody holder');
    assert.ok(before.ledger.custody_issues.length>0,'Precondition: custody is actually issued to the roster before the refused batch');
    const result=await operationSave(A,invalid);assert.equal(result.status,403,invalid);assert.equal(result.json.ok,0);assert.deepEqual(result.json.revs,{});assert.ok(result.json.denied[EMP],invalid);assert.ok(result.json.atomic);
    assert.equal(A.DB.q('SELECT COUNT(*) n FROM kv WHERE k IN (?1,?2)',EMP,OPTIONS)[0].n,0,'No retired KV copy is written');
    assert.deepEqual(typed(A,EMP),before.employees);assert.deepEqual(typed(A,OPTIONS),before.options);assert.deepEqual(ledger(A),before.ledger);assert.deepEqual(copy(A.DB.q('SELECT * FROM revs ORDER BY k')),before.revisions);
  }
});

test('a well-formed roster dropping the custody holder in a mixed operations batch reaches the custody barrier',async()=>{
  /* 019e-atomic-save.js runs cuPlanSaveTransition on operational saves: removing a current holder is a custody
     transition, so the complete batch (roster + options) is refused with a custody reason unless the custody base is supplied. */
  const A=await fixture(true),CUSTODY='bsdept:'+D1+':bassam_custody_v1';
  const before={employees:typed(A,EMP),options:typed(A,OPTIONS),ledger:ledger(A),revisions:copy(A.DB.q('SELECT * FROM revs ORDER BY k'))};
  assert.ok(before.ledger.custody_issues.length>0,'Employee 1 currently holds custody');
  const remaining=before.employees.filter(row=>row.eid!==EKEYS.employee1);assert.equal(remaining.length,before.employees.length-1,'Exactly the holder is dropped');
  const refused=await operationSave(A,JSON.stringify(remaining));
  assert.equal(refused.status,409);assert.equal(refused.json.ok,0);assert.equal(refused.json.err,'custody-base-required');assert.match(refused.json.err,/custody/);
  assert.equal(A.DB.q('SELECT COUNT(*) n FROM kv WHERE k IN (?1,?2)',EMP,OPTIONS)[0].n,0,'No retired KV copy is written');
  assert.deepEqual(typed(A,EMP),before.employees);assert.deepEqual(typed(A,OPTIONS),before.options);assert.deepEqual(ledger(A),before.ledger);assert.deepEqual(copy(A.DB.q('SELECT * FROM revs ORDER BY k')),before.revisions);
  /* Control: the same batch with the exact custody base passes the barrier and commits roster, options and custody together. */
  const body=operationSaveBody(A.env,'/api/save',{set:{[EMP]:JSON.stringify(remaining),[OPTIONS]:JSON.stringify({type:['TEST_ONLY mixed compile']})},del:[],
    base:{[EMP]:revisionOf(A,EMP),[OPTIONS]:revisionOf(A,OPTIONS),[CUSTODY]:await A.W.cuRev(A.env,D1)}});
  const accepted=await A.api('super','/api/save',{method:'POST',body});
  assert.equal(accepted.status,200,JSON.stringify(accepted.json));assert.equal(accepted.json.ok,1);assert.equal(accepted.json.counts.custody,1);
  assert.ok(accepted.json.revs[EMP]>0);assert.ok(accepted.json.revs[OPTIONS]>0);
  assert.deepEqual(typed(A,EMP),remaining);assert.deepEqual(typed(A,OPTIONS),{type:['TEST_ONLY mixed compile']});
});

test('malformed employee JSON without referenced custody retains ordinary partial-save behavior',async()=>{
  const A=await fixture(false),employees=value(A,EMP),before=ledger(A),result=await save(A,'TEST_ONLY invalid JSON');
  assert.equal(result.status,200);assert.ok(result.json.denied[EMP]);assert.equal(result.json.revs[EMP],undefined);assert.ok(result.json.revs[OPTIONS]>0);assert.equal(result.json.atomic,'');
  assert.equal(value(A,EMP),employees);assert.deepEqual(ledger(A),before);assert.deepEqual(JSON.parse(value(A,OPTIONS)),{type:['TEST_ONLY mixed compile']});
});

test('valid nonarray employee JSON is not reclassified as a custody deletion',async()=>{
  const A=await fixture(true),employees=value(A,EMP),before=ledger(A),result=await save(A,JSON.stringify({TEST_ONLY:'valid nonarray'}));
  assert.equal(result.status,200);assert.ok(result.json.denied[EMP]);assert.equal(result.json.revs[EMP],undefined);assert.ok(result.json.revs[OPTIONS]>0);assert.equal(result.json.atomic,'');
  assert.equal(value(A,EMP),employees);assert.deepEqual(ledger(A),before);assert.deepEqual(JSON.parse(value(A,OPTIONS)),{type:['TEST_ONLY mixed compile']});
});
