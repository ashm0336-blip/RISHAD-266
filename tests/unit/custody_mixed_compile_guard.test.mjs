/* Whole-batch safety survives retirement of the temporary custody barrier. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {world,createType,act,ok,D1,EKEYS,EMP,copy} from './custody_scenarios_fx.mjs';

const OPTIONS='bsdept:'+D1+':bassam_options_v1';
const value=(A,key)=>A.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq',key).map(row=>row.v).join('');
const ledger=A=>copy(Object.fromEntries(['custody_items','custody_issues','custody_movements','custody_requests'].map(table=>[table,A.DB.q('SELECT * FROM '+table)])));
async function fixture(held){
  const A=await world();
  if(held){const itemId=await createType(A);ok(await act(A,'issue',{itemId,holderKey:EKEYS.employee1}));}
  return A;
}
async function save(A,employeeValue){
  return A.api('super','/api/save',{method:'POST',body:{set:{[EMP]:employeeValue,[OPTIONS]:JSON.stringify({type:['TEST_ONLY mixed compile']})},del:[],base:{[EMP]:1,[OPTIONS]:0}}});
}

test('malformed employee JSON or legacy null with referenced custody rejects the complete mixed batch',async()=>{
  for(const invalid of ['TEST_ONLY invalid JSON','null']){
    const A=await fixture(true),before={employees:value(A,EMP),options:value(A,OPTIONS),ledger:ledger(A),revisions:copy(A.DB.q('SELECT * FROM revs ORDER BY k'))};
    const result=await save(A,invalid);assert.equal(result.status,200);assert.deepEqual(result.json.revs,{});assert.ok(result.json.denied[EMP]);assert.ok(result.json.atomic);
    assert.equal(value(A,EMP),before.employees);assert.equal(value(A,OPTIONS),before.options);assert.deepEqual(ledger(A),before.ledger);assert.deepEqual(copy(A.DB.q('SELECT * FROM revs ORDER BY k')),before.revisions);
  }
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
