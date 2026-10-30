import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync('workers/parts/019o-operational-codec.js', 'utf8'), ctx);
const plain = v => JSON.parse(JSON.stringify(v));
const s = (type = 'scalar') => ctx.ocScalar(type);
function shapes() {
  return ctx.ocPrepare([{resource:'bassam_example_v1',schema:ctx.ocMap('example_months',ctx.ocMap('example_assignments',ctx.ocObject('example_employees',{
    shift:s('text'), rest:ctx.ocArray('example_rest',s('number')), extra:s(),
    flags:ctx.ocMap('example_flags',s('boolean'))
  })),{fixed:{__shifts:ctx.ocArray('example_shifts',ctx.ocObject('example_shift',{name:s('text'),start:s('text')}))}})}]);
}
const resource = 'bassam_example_v1';
const round = (prepared, value, present = true) => ctx.ocInflate(prepared, ctx.ocConvert(prepared,'dept',resource,value,present));
test('fixed columns preserve missing/null/empty, scalar kinds and nested source order', () => {
  const prepared = shapes();
  for (const value of [null,{}, {__shifts:[]}, {'1448-1':{}}, {'1448-1':{employee:{flags:{a:true,b:false,c:null},extra:0,rest:[0,2],shift:null}},__shifts:[{start:'01:30',name:'A'}]}]) {
    assert.equal(JSON.stringify(round(prepared,value).value),JSON.stringify(value));
  }
  assert.deepEqual(plain(round(prepared,undefined,false)),{present:false});
  assert.notEqual(JSON.stringify(ctx.ocConvert(prepared,'dept',resource,{},true)),JSON.stringify(ctx.ocConvert(prepared,'dept',resource,null,true)));
});
test('tuple length and explicit union branches preserve legacy string employees and task slots', () => {
  const prepared=ctx.ocPrepare([{resource,schema:ctx.ocArray('example_tasks',ctx.ocTuple('example_task',[
    s(),ctx.ocUnion('example_holder',[s('text'),ctx.ocObject('example_holder_record',{eid:s('text'),name:s('text')})]),
    ctx.ocArray('example_proofs',ctx.ocObject('example_proof',{iid:s('text'),at:s('number')}))
  ]))}]);
  for(const value of [[],[[]],[[1,'old name',[]],['1',{name:'N',eid:'e'},[{at:0,iid:'IMG_a'}]]],[[null,null,null]]]) {
    assert.equal(JSON.stringify(round(prepared,value).value),JSON.stringify(value));
  }
  assert.throws(()=>ctx.ocConvert(prepared,'dept',resource,[[1,'name',[],true]]),/tuple-length/);
  assert.throws(()=>ctx.ocConvert(prepared,'dept',resource,[[undefined]]),/scalar-type/);
});
test('map patterns and reserved metadata stay separate from monthly business rows', () => {
  const prepared=ctx.ocPrepare([{resource,schema:ctx.ocMap('example_days',null,{patterns:[{pattern:'^\\d+-\\d+-\\d+$',schema:ctx.ocObject('example_day',{ap:s('boolean')})}],fixed:{__meta:ctx.ocObject('example_meta',{by:s('text')})}})}]);
  const value={'1448-1-2':{ap:false},__meta:{by:'actor'}};
  assert.equal(JSON.stringify(round(prepared,value).value),JSON.stringify(value));
  assert.throws(()=>ctx.ocConvert(prepared,'dept',resource,{unknown:{}}),/unknown-map-key/);
});
test('unknown properties, non-finite numbers, holes and ambiguous variants fail closed', () => {
  const prepared=shapes();
  assert.throws(()=>ctx.ocConvert(prepared,'dept',resource,{'1448-1':{e:{unrecognized:1}}}),/unknown-field/);
  assert.throws(()=>ctx.ocConvert(prepared,'dept',resource,{'1448-1':{e:{extra:Infinity}}}),/scalar-type/);
  const hole=[]; hole.length=1;
  assert.throws(()=>ctx.ocConvert(prepared,'dept',resource,{__shifts:hole}),/array-hole/);
  const union=ctx.ocPrepare([{resource,schema:ctx.ocUnion('ambiguous',[ctx.ocArray('a',s()),ctx.ocTuple('b',[s()])])}]);
  assert.throws(()=>ctx.ocConvert(union,'dept',resource,[]),/ambiguous-union/);
});
test('row witnesses reject orphan, scope, type, missing field, sequence and presence corruption', () => {
  const prepared=shapes(), domain=ctx.ocConvert(prepared,'dept',resource,{'1448-1':{e:{shift:'A',rest:[1],extra:true}}});
  const corruptions=[
    d=>d.rows.example_employees[0].department_id='other',
    d=>d.rows.example_employees[0].f_extra_number=2,
    d=>delete d.rows.example_employees[0].f_extra_kind,
    d=>d.rows.example_rest_values[0].position=4,
    d=>d.rows.example_employees[0].f_shift_kind=0,
    d=>d.rows.example_assignments.splice(0,1),
    d=>d.rows.example_rest_values.push({...d.rows.example_rest_values[0],row_key:'orphan',parent_key:'missing'})
  ];
  for(const damage of corruptions) { const changed=plain(domain); damage(changed); assert.throws(()=>ctx.ocInflate(prepared,changed)); }
});
test('wide records have fixed one-to-one detail columns under the D1 limit and actual FK isolation', () => {
  const fields={}; for(let i=0;i<62;i++) fields['value'+i]=s();
  const prepared=ctx.ocPrepare([{resource,schema:ctx.ocArray('wide_records',ctx.ocObject('wide_employee',fields))}]);
  const value={}; for(let i=61;i>=0;i--) value['value'+i]=i%2?String(i):i;
  const domain=ctx.ocConvert(prepared,'dept',resource,[value]);
  assert.equal(JSON.stringify(ctx.ocInflate(prepared,domain).value),JSON.stringify([value]));
  assert.ok(prepared.order.length>2); assert.ok(prepared.order.every(spec=>spec.columns.length<=100));
  const db=new DatabaseSync(':memory:'); db.exec('PRAGMA foreign_keys=ON');
  for(const ddl of ctx.ocCreateStatements(prepared)) db.exec(ddl);
  const physical=ctx.ocPhysicalRows(prepared,domain),tables=ctx.ocPhysicalTables(prepared);
  for(const [table,columns] of Object.entries(tables)) {
    assert.equal(db.prepare('PRAGMA table_info('+table+')').all().length,columns.length);
    assert.ok(columns.length<=100);
    for(const row of physical[table]) db.prepare('INSERT INTO '+table+'('+columns.join(',')+')VALUES('+columns.map(()=>'?').join(',')+')').run(...columns.map(c=>row[c]));
  }
  assert.equal(JSON.stringify(ctx.ocInflate(prepared,ctx.ocFromPhysical(prepared,'dept',resource,physical)).value),JSON.stringify([value]));
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
  const detail=prepared.order.find(spec=>spec.node.kind==='fields');
  assert.throws(()=>db.prepare('UPDATE '+detail.entityTable+" SET department_id='other'").run(),/FOREIGN KEY/);
  db.exec('BEGIN'); db.prepare("DELETE FROM ops_nodes WHERE department_id='dept' AND row_key='$'").run();
  assert.equal(db.prepare('SELECT COUNT(*) n FROM wide_employee').get().n,0); db.exec('ROLLBACK');
  assert.equal(db.prepare('SELECT COUNT(*) n FROM '+detail.entityTable).get().n,1); db.close();
});
test('shared entity tables isolate resources with identical paths and enforce typed anchor FKs', () => {
  const definition=(resource,prefix)=>({resource,schema:ctx.ocArray(prefix,ctx.ocObject(prefix+'_employee',{name:s('text'),eid:s('text')}))});
  const aggregate=ctx.ocPrepare([definition(resource,'roster_a'),definition('bassam_second_v1','roster_b')]);
  assert.equal(Object.keys(aggregate.entities).length,1);
  const pa=ctx.ocForResource(aggregate,resource),pb=ctx.ocForResource(aggregate,'bassam_second_v1');
  const a=ctx.ocConvert(pa,'dept',resource,[{eid:'same',name:'A'}]);
  const b=ctx.ocConvert(pb,'dept','bassam_second_v1',[{eid:'same',name:'B'},{name:'C'}]);
  const db=new DatabaseSync(':memory:'); db.exec('PRAGMA foreign_keys=ON'); for(const ddl of ctx.ocCreateStatements(aggregate))db.exec(ddl);
  for(const [prepared,domain] of [[pa,a],[pb,b]]) {
    const physical=ctx.ocPhysicalRows(prepared,domain);
    for(const [table,columns] of Object.entries(ctx.ocPhysicalTables(prepared)))for(const row of physical[table])db.prepare('INSERT INTO '+table+'('+columns.join(',')+')VALUES('+columns.map(()=>'?').join(',')+')').run(...columns.map(c=>row[c]));
  }
  assert.throws(()=>db.prepare("UPDATE ops_nodes SET parent_key='$/i:1' WHERE resource=? AND row_key='$/i:0'").run(resource),/FOREIGN KEY/);
  const table=Object.keys(aggregate.entities)[0];
  assert.throws(()=>db.prepare('UPDATE '+table+" SET entity_kind='unknown'").run(),/CHECK|FOREIGN KEY/);
  db.prepare('DELETE FROM ops_nodes WHERE resource=?').run(resource);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM '+table+" WHERE resource='bassam_second_v1'").get().n,2);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]); db.close();
});
test('physical decode rejects hidden entities and wrong descriptor context before restore', () => {
  const prepared=shapes(),domain=ctx.ocConvert(prepared,'dept',resource,{'1448-1':{e:{shift:'A'}}});
  const physical=plain(ctx.ocPhysicalRows(prepared,domain));
  const bad=plain(physical);bad.ops_nodes[0].schema_id='unknown';assert.throws(()=>ctx.ocFromPhysical(prepared,'dept',resource,bad),/node-schema/);
  const table=Object.keys(physical).find(k=>k!=='ops_nodes'&&physical[k].length);
  const hidden=plain(physical); hidden[table].push({...hidden[table][0],row_key:'hidden'});
  assert.throws(()=>ctx.ocFromPhysical(prepared,'dept',resource,hidden),/orphan-entity/);
});
test('prototype-like map keys remain data and never alter prototypes', () => {
  const prepared=ctx.ocPrepare([{resource,schema:ctx.ocMap('safe_map',s())}]);
  const input=JSON.parse('{"__proto__":"value","constructor":false,"normal":0}');
  assert.equal(JSON.stringify(round(prepared,input).value),JSON.stringify(input));
  assert.equal({}.polluted,undefined);
});
test('schema rejects shared/duplicate tables and dynamic identifiers before SQL', () => {
  assert.throws(()=>ctx.ocPrepare([{resource,schema:ctx.ocArray('bad;DROP',s())}]),/identifier/);
  assert.throws(()=>ctx.ocPrepare([{resource,schema:ctx.ocObject('duplicate',{a:ctx.ocObject('duplicate',{})})}]),/duplicate-table/);
});
test('SQLite columns distinguish legacy fields that differ only by case or escape spelling', () => {
  const prepared=ctx.ocPrepare([{resource,schema:ctx.ocObject('case_record',{cAt:s(),cat:s(),c_u41_t:s()})}]);
  const value={cAt:'time',cat:'category',c_u41_t:'literal'},domain=ctx.ocConvert(prepared,'dept',resource,value);
  const db=new DatabaseSync(':memory:');for(const ddl of ctx.ocCreateStatements(prepared))db.exec(ddl);
  assert.equal(JSON.stringify(ctx.ocInflate(prepared,domain).value),JSON.stringify(value));
  const columns=Object.values(prepared.entities)[0].columns.map(c=>c.toLowerCase());assert.equal(new Set(columns).size,columns.length);db.close();
});
