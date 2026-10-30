/* Execute actual prepared source guards with D1's measured compound-SELECT cap.
   Python's standard-library SQLite provides setlimit; Node's native SQLite does not.
   The minimal tables deliberately isolate existence/scope guards from business codecs. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {D1Shim, PYTHON, ROOT} from './harness.mjs';
import {candidateWorker} from './irshad_domain_fx.mjs';
import {world, D1, seedReceipts} from './business_atomic_fx.mjs';

const REPLAY=String.raw`
import json,sqlite3,sys
p=json.load(sys.stdin)
db=sqlite3.connect(':memory:',isolation_level=None)
db.setlimit(sqlite3.SQLITE_LIMIT_COMPOUND_SELECT,5)
db.setlimit(sqlite3.SQLITE_LIMIT_EXPR_DEPTH,100)
assert db.getlimit(sqlite3.SQLITE_LIMIT_COMPOUND_SELECT)==5
assert db.getlimit(sqlite3.SQLITE_LIMIT_EXPR_DEPTH)==100
db.execute(' UNION ALL '.join(['SELECT 1']*5)).fetchall()
try:
    db.execute(' UNION ALL '.join(['SELECT 1']*6)).fetchall()
    raise AssertionError('negative control unexpectedly accepted six terms')
except sqlite3.OperationalError as e:
    assert 'too many terms in compound SELECT' in str(e),str(e)
try:
    db.execute('SELECT '+' AND '.join(['1']*101)).fetchall()
    raise AssertionError('negative control unexpectedly accepted excessive expression depth')
except sqlite3.OperationalError as e:
    assert 'Expression tree is too large' in str(e),str(e)
if p.get('control'):
    print(json.dumps({'compoundSelectLimit':5,'expressionDepthLimit':100,'fiveAccepted':True,'sixRejected':True,'deepAndRejected':True}));sys.exit(0)
tables=p['tables'];sql=p['sql'];args=p['args'];error=p['error']
assert len(tables)>=9 and len(tables)==len(set(tables))
for table in tables:
    assert table.replace('_','').isalnum()
    cols=p['specs'][table] if p['kind']=='award-state' else ['department_id']
    assert all(c.replace('_','').isalnum() for c in cols)
    db.execute('CREATE TABLE '+table+'('+','.join('"'+c+'"' for c in cols)+')')
db.execute('CREATE TABLE guard_probe(value TEXT)')
def execute(reject=False):
    db.execute('BEGIN')
    try:
        db.execute("INSERT INTO guard_probe VALUES('before-guard')")
        db.execute(sql,args).fetchall()
        db.execute('COMMIT')
        assert not reject,'writer was not rejected'
    except sqlite3.Error as e:
        db.execute('ROLLBACK')
        assert reject and error in str(e),str(e)
    count=db.execute('SELECT count(*) FROM guard_probe').fetchone()[0]
    assert count==(0 if reject else 1),('atomic guard marker',count,reject)
    db.execute('DELETE FROM guard_probe')
checks=0
if p['kind']!='award-state':execute();checks=1
if p['kind']=='award-state':
    db.execute('CREATE TABLE kv(k TEXT,seq INTEGER,v TEXT)')
    db.execute('CREATE TABLE revs(k TEXT,rev INTEGER)')
    def restore(table):
        db.execute('DELETE FROM '+table)
        cols=p['specs'][table]
        for row in p['rows'][table]:
            db.execute('INSERT INTO '+table+' VALUES('+','.join('?' for _ in cols)+')',[row.get(c) for c in cols])
    for table in tables:restore(table)
    execute();checks+=1;field_changes=0;record_field_changes=0
    for table in tables:
        cols=p['specs'][table];original=p['rows'][table]
        foreign=original[0].copy() if original else {'department_id':args[0]}
        foreign['department_id']='TEST_ONLY_foreign'
        db.execute('INSERT INTO '+table+' VALUES('+','.join('?' for _ in cols)+')',[foreign.get(c) for c in cols])
        execute();checks+=1;restore(table)
        own=original[0].copy() if original else {'department_id':args[0]}
        db.execute('INSERT INTO '+table+' VALUES('+','.join('?' for _ in cols)+')',[own.get(c) for c in cols])
        execute(True);checks+=1;restore(table)
        if original:
            db.execute('DELETE FROM '+table+' WHERE rowid=1');execute(True);checks+=1;restore(table)
            for col in cols:
                changed=None if original[0].get(col) is not None else 'TEST_ONLY_changed'
                db.execute('UPDATE '+table+' SET "'+col+'"=? WHERE rowid=1',(changed,))
                execute(True);checks+=1;field_changes+=1
                if table=='award_records':record_field_changes+=1
                db.execute('UPDATE '+table+' SET "'+col+'"=? WHERE rowid=1',(original[0].get(col),))
    for item in json.loads(args[-2]):
        db.execute('INSERT INTO revs VALUES(?,?)',(item['k'],item['rev']+1));execute(True);checks+=1;db.execute('DELETE FROM revs')
    for key in json.loads(args[-1]):
        for variant in [key,key+':TEST_ONLY_child','bsdept:TEST_ONLY_other:'+key]:
            db.execute('INSERT INTO kv VALUES(?,0,?)',(variant,'{}'));execute(True);checks+=1;db.execute('DELETE FROM kv')
    print(json.dumps({'compoundSelectLimit':5,'expressionDepthLimit':100,'tables':len(tables),'checks':checks,'fieldChanges':field_changes,'recordFieldChanges':record_field_changes,'atomicMarkerRollback':True}));sys.exit(0)
for table in tables:
    if p['kind']=='legacy':
        db.execute('INSERT INTO '+table+' VALUES(?)',('TEST_ONLY_foreign',));execute(True);checks+=1
    elif p['kind']=='empty-scope':
        db.execute('INSERT INTO '+table+' VALUES(?)',('TEST_ONLY_foreign',));execute();checks+=1
        db.execute('DELETE FROM '+table)
        db.execute('INSERT INTO '+table+' VALUES(?)',(args[0],));execute(True);checks+=1
    else:
        allowed=json.loads(args[0])
        for value in allowed:
            db.execute('INSERT INTO '+table+' VALUES(?)',(value,));execute();checks+=1
            db.execute('DELETE FROM '+table)
        for value in [None,'TEST_ONLY_orphan']+([] if '' in allowed else ['']):
            db.execute('INSERT INTO '+table+' VALUES(?)',(value,));execute(True);checks+=1
            db.execute('DELETE FROM '+table)
    db.execute('DELETE FROM '+table)
print(json.dumps({'compoundSelectLimit':5,'tables':len(tables),'checks':checks,'atomicMarkerRollback':True}))
`;
function replay(input){
  const out=spawnSync(PYTHON,['-c',REPLAY],{cwd:ROOT,input:JSON.stringify(input),encoding:'utf8',windowsHide:true,timeout:10000,env:{...process.env,PYTHONIOENCODING:'utf-8'}});
  assert.equal(out.status,0,out.stderr||out.stdout||out.error?.message);
  return JSON.parse(out.stdout);
}
function raw(statement){while(statement?.__st)statement=statement.__st;assert.equal(typeof statement?.sql,'string');assert.ok(Array.isArray(statement.args));return statement;}
function exactlyGuard(statements,tables,error){
  const found=statements.map(raw).filter(s=>s.sql.includes(error)&&tables.every(table=>new RegExp('\\b'+table+'\\b').test(s.sql)));
  assert.equal(found.length,1,'One actual statement guards every table');
  assert.equal(/\bUNION\b/i.test(found[0].sql),false,'Existence checks do not consume the compound-select budget');
  return {sql:found[0].sql,args:found[0].args,tables,error};
}
function legacyEnv(){const DB=new D1Shim();DB.exec('CREATE TABLE kv(k TEXT,seq INTEGER,v TEXT,PRIMARY KEY(k,seq));CREATE TABLE meta(k TEXT PRIMARY KEY,v TEXT);CREATE TABLE revs(k TEXT PRIMARY KEY,rev INTEGER);');return{DB};}
const NAMED=['awLegacyPrepare','awPhysicalTables','szLegacyPrepare','SZ_TABLES'];

test('Provider compound SELECT control accepts five terms and rejects six under the measured D1 cap',()=>{
  assert.deepEqual(replay({control:true}),{compoundSelectLimit:5,expressionDepthLimit:100,fiveAccepted:true,sixRejected:true,deepAndRejected:true});
});
test('Actual Award cutover guard rejects a writer in each of eleven target tables atomically at compound cap five',async()=>{
  const W=await candidateWorker(NAMED),env=legacyEnv(),plan=await W.awLegacyPrepare(env),tables=Object.values(W.awPhysicalTables()).map(spec=>spec[0]);
  assert.equal(tables.length,11);
  const result=replay({...exactlyGuard(plan.after,tables,'KIVO_AWARD_TARGET_CHANGED'),kind:'legacy'});
  assert.equal(result.checks,12);assert.equal(result.atomicMarkerRollback,true);
});
test('Actual Seized cutover guard rejects a writer in each of eleven target tables atomically at compound cap five',async()=>{
  const W=await candidateWorker(NAMED),env=legacyEnv(),plan=await W.szLegacyPrepare(env),tables=Object.values(W.SZ_TABLES).map(spec=>spec[0]).concat('seized_requests');
  assert.equal(tables.length,11);
  const result=replay({...exactlyGuard(plan.after,tables,'KIVO_SEIZED_TARGET_CHANGED'),kind:'legacy'});
  assert.equal(result.checks,12);assert.equal(result.atomicMarkerRollback,true);
});
test('Actual Seized empty-restore guard preserves foreign departments and rejects each selected-scope writer at compound cap five',async()=>{
  const B=await world(),tables=Object.values(B.W.SZ_TABLES).map(spec=>spec[0]).concat('seized_requests'),plan=await B.W.szDomainPlan(B.env,B.W.szEmptyDomain(D1),D1,{base:await B.W.szRevs(B.env,D1)});
  assert.equal(plan.changed,false);assert.equal(plan.statements.length,0);assert.equal(tables.length,11);
  const result=replay({...exactlyGuard(plan.guards,tables,'KIVO_RESTORE_TARGET'),kind:'empty-scope'});
  assert.equal(result.checks,23);
});
for(const name of ['seized','awards'])test('Actual '+name+' export orphan guard preserves allowed scopes and rejects null/orphan scopes in every table at compound cap five',async()=>{
  const B=await world(),seen=[],batch=B.DB.batch.bind(B.DB);
  B.DB.batch=async statements=>{seen.push(...statements);return batch(statements);};
  await B.W.bdExport(B.env,await B.A(),new URL('http://synthetic.test/export'),name);
  const tables=Object.values(name==='seized'?B.W.SZ_TABLES:B.W.AW_TABLES).map(spec=>spec[0]);
  assert.equal(tables.length,name==='seized'?10:9);
  const guard=exactlyGuard(seen,tables,'KIVO_BUSINESS_ORPHAN_SCOPE'),allowed=JSON.parse(guard.args[0]);
  assert.equal(allowed.includes(''),name==='awards','Only Award permits its explicit read-only global scope');
  const result=replay({...guard,kind:'orphan'});
  assert.ok(result.checks>tables.length*3);assert.equal(result.atomicMarkerRollback,true);
});
test('Actual nonempty Award restore witness fits expression depth100 and rejects all39 record fields, raw row membership, revisions and retired keys atomically',async()=>{
  const B=await world({seed:true});seedReceipts(B);
  const domain=await B.W.awExportDomain(B.env,D1),plan=await B.W.awDomainPlan(B.env,domain,D1),specs=B.W.awPhysicalTables(),tables=Object.values(specs).map(spec=>spec[0]);
  const guard=exactlyGuard(plan.guards,tables,'KIVO_AWARD_TARGET_CHANGED');
  const result=replay({...guard,kind:'award-state',specs:Object.fromEntries(Object.values(specs).map(spec=>[spec[0],spec[1]])),rows:Object.fromEntries(Object.entries(specs).map(([kind,[table]])=>[table,plan.snapshotRows[kind]]))});
  assert.equal(result.expressionDepthLimit,100);assert.equal(result.recordFieldChanges,39);assert.ok(result.fieldChanges>=39);assert.equal(result.atomicMarkerRollback,true);
});
