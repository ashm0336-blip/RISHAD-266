/* Real startup migration and D1 transactions, using synthetic data only. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { D1Shim, ROOT, allowTestSchemaUpgrade } from '../../../../tests/unit/harness.mjs';

const KEY = 'bassam_dstats_v1';
const copy = value => JSON.parse(JSON.stringify(value));
async function sourceWorker() {
  const parts = JSON.parse(fs.readFileSync(path.join(ROOT,'workers/parts.json'),'utf8')).parts;
  const source = parts.map(p => fs.readFileSync(path.join(ROOT,'workers/parts',p.file),'utf8')).join('');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'r266-dstats-cutover-')), file = path.join(dir,'worker.mjs');
  fs.writeFileSync(file,source+'\nexport { initDb, dsLegacyPrepare, dsDomainRead, dsDomainCommit, actorFromKeys, KIVO_MIGRATIONS };\n');
  try { return await import(pathToFileURL(file).href); }
  finally { fs.rmSync(dir,{recursive:true,force:true}); }
}
const rawData = () => ({
  haram:{'1500-01-01':{worshippers:0,umrah:null,carts:3,__m:{u:'TEST_ONLY_actor',t:42},__f:{carts:0}}},
  nabawi:{'1500-01-02':{worshippers:null,salam_corridor:0,rawdah_men_actual:9}},
  locks:{'haram|1500-01':{ap:true,dopen:{'01':true},dshut:{'30':1}},'nabawi|1500-2':true}
});
const expectedData = () => ({...rawData(),locks:{'haram|1500-1':{ap:1,dopen:{'1':1},dshut:{'30':1}},'nabawi|1500-2':true}});
async function legacy({ data=rawData(), count=4, sourceKey=KEY }={}) {
  const W=await sourceWorker(), DB=new D1Shim(), env={DB};
  DB.exec('CREATE TABLE d1_migrations(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE,applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)');
  for(const name of fs.readdirSync(path.join(ROOT,'migrations')).filter(n=>/^000[1-3]_.*\.sql$/.test(n)).sort()){
    DB.exec(fs.readFileSync(path.join(ROOT,'migrations',name),'utf8'));
    await DB.prepare('INSERT INTO d1_migrations(name) VALUES(?1)').bind(name.slice(0,-4)).run();
  }
  const users=Array.from({length:count},(_,i)=>({id:'TEST_ONLY_u'+i,un:'TEST_ONLY_'+i,role:i?['staff','dept','gm'][(i-1)%3]:'super',ph:'p2$TEST_ONLY$'+i,deptId:'TEST_ONLY_d1'}));
  const keys={bassam_auth_users_v1:users,bassam_perms_v1:{caps:{TEST_ONLY_d1:['dstats']}},bassam_platform_v1:{policy:{pwMin:6,TEST_ONLY:true}},bassam_depts_v1:[{id:'TEST_ONLY_d1'}],bassam_gdepts_v1:[],[sourceKey]:data};
  const put=DB.db.prepare('INSERT INTO kv(k,seq,v) VALUES(?,?,?)');
  for(const [key,value] of Object.entries(keys)){const text=JSON.stringify(value);for(let offset=0,seq=0;offset<text.length;offset+=500000,seq++)put.run(key,seq,text.slice(offset,offset+500000));}
  DB.exec("INSERT INTO meta(k,v) VALUES('rev','9'),('policy','{\"pwMin\":6,\"lockN\":7}'); INSERT INTO revs(k,rev) VALUES('bassam_auth_users_v1',7),('bassam_dstats_v1',9)");
  allowTestSchemaUpgrade(DB);
  return {W,DB,env,keys};
}
const identities = DB => createHash('sha256').update(JSON.stringify(DB.q("SELECT k,seq,v FROM kv WHERE k IN ('bassam_auth_users_v1','bassam_perms_v1','bassam_platform_v1','bassam_depts_v1','bassam_gdepts_v1') ORDER BY k,seq"))).digest('hex');
const schema = DB => copy(DB.q("SELECT type,name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name"));
const old = DB => copy(DB.q('SELECT k,seq,v FROM kv ORDER BY k,seq'));

test('startup cutover retains null, absent metrics, zero, attribution and all lock flags without rewriting 13006 accounts',async()=>{
  const {W,DB,env,keys}=await legacy({count:13006}),before=identities(DB);
  await W.initDb(env);
  const current=await W.dsDomainRead(env);
  assert.deepEqual(current.data,expectedData());
  assert.equal(Object.hasOwn(current.data.haram['1500-01-01'],'hijr_ismail'),false);
  assert.equal(DB.q('SELECT COUNT(*) n FROM kv WHERE k=?1',KEY)[0].n,0);
  assert.equal(DB.q("SELECT COUNT(*) n FROM meta WHERE k='ds_cutover_ready'")[0].n,0);
  assert.equal(DB.q("SELECT COUNT(*) n FROM d1_migrations WHERE name='0004_daily_stats'")[0].n,1);
  assert.equal(identities(DB),before);
  assert.equal(JSON.parse(DB.q("SELECT v FROM kv WHERE k='bassam_auth_users_v1' ORDER BY seq").map(r=>r.v).join('')).length,13006);
  const A=W.actorFromKeys(Object.fromEntries(Object.entries(keys).map(([k,v])=>[k,JSON.stringify(v)])),'TEST_ONLY_u0');
  const changed=copy(current.data);changed.haram['1500-01-01'].carts=4;
  assert.equal((await W.dsDomainCommit(env,A,{base:current.rev,data:changed})).status,200);
  assert.equal((await W.dsDomainCommit(env,A,{base:current.rev,data:current.data})).status,409);
  assert.equal(identities(DB),before);
});

test('malformed, ambiguous and unscoped legacy records fail before DDL or source/identity changes',async()=>{
  const cases=[{data:{unknown:{}}},{data:{haram:{'1500-01-01':{worshippers:'0'}}}},{data:{locks:{'haram|1500-1':true,'haram|1500-01':{ap:1}}}},{data:{locks:{'haram|1500-1':{dopen:{'1':1,'01':1}}}}},{sourceKey:'bsdept:TEST_ONLY_d1:bassam_dstats_v1'}];
  for(const input of cases){const {W,DB,env}=await legacy(input),before={schema:schema(DB),old:old(DB),identities:identities(DB)};
    await assert.rejects(W.initDb(env),/dstats-cutover-/);
    assert.deepEqual(schema(DB),before.schema);assert.deepEqual(old(DB),before.old);assert.equal(identities(DB),before.identities);
    assert.equal(DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v,'3');
  }
});

test('source CAS rejects a changed legacy document without deleting that newer version',async()=>{
  const {W,DB,env}=await legacy(),beforeSchema=schema(DB),beforeIdentity=identities(DB),batch=DB.batch.bind(DB);let changed=false;
  const newer=JSON.stringify({...rawData(),haram:{'1500-01-01':{worshippers:100}}});
  DB.batch=async statements=>{if(!changed&&statements.some(s=>s.sql.includes('KIVO_DSTATS_CUTOVER_SOURCE_CHANGED'))){changed=true;DB.db.prepare('UPDATE kv SET v=? WHERE k=? AND seq=0').run(newer,KEY);}return batch(statements);};
  await assert.rejects(W.initDb(env),/KIVO_DSTATS_CUTOVER_SOURCE_CHANGED/);
  assert.equal(changed,true);assert.deepEqual(schema(DB),beforeSchema);assert.equal(identities(DB),beforeIdentity);
  assert.equal(DB.q('SELECT v FROM kv WHERE k=?1',KEY)[0].v,newer);
});

test('late typed-write failure rolls back DDL, migration stamp, source retirement and domain revision together',async()=>{
  const {W,DB,env}=await legacy(),before={schema:schema(DB),old:old(DB),identities:identities(DB),revs:copy(DB.q('SELECT * FROM revs ORDER BY k'))};
  DB.failIf=sql=>/^INSERT INTO daily_stats_day_locks/.test(sql);
  await assert.rejects(W.initDb(env),/injected failure/);DB.failIf=null;
  assert.deepEqual(schema(DB),before.schema);assert.deepEqual(old(DB),before.old);assert.equal(identities(DB),before.identities);assert.deepEqual(copy(DB.q('SELECT * FROM revs ORDER BY k')),before.revs);
  assert.equal(DB.q("SELECT COUNT(*) n FROM meta WHERE k='ds_cutover_ready'")[0].n,0);
  await W.initDb(env);assert.deepEqual((await W.dsDomainRead(env)).data,expectedData());
});

test('cutover refuses to overwrite a pre-existing relational day with an older KV document',async()=>{
  const {W,DB,env}=await legacy(),migration=W.KIVO_MIGRATIONS.find(m=>m.name==='0004_daily_stats');
  for(const sql of migration.sql.filter(sql=>/^CREATE /.test(sql)))DB.exec(sql);
  DB.exec("INSERT INTO daily_stats_days(site,hijri_date,field_mask,worshippers) VALUES('haram','1500-01-01',1,999)");
  const before={schema:schema(DB),old:old(DB),row:copy(DB.q('SELECT * FROM daily_stats_days')),identities:identities(DB)};
  await assert.rejects(W.initDb(env),/dstats-cutover-target-not-empty/);
  assert.deepEqual(schema(DB),before.schema);assert.deepEqual(old(DB),before.old);assert.deepEqual(copy(DB.q('SELECT * FROM daily_stats_days')),before.row);assert.equal(identities(DB),before.identities);
});

test('a target writer between preflight and commit is detected inside the migration transaction',async()=>{
  const {W,DB,env}=await legacy(),migration=W.KIVO_MIGRATIONS.find(m=>m.name==='0004_daily_stats');
  for(const sql of migration.sql.filter(sql=>/^CREATE /.test(sql)))DB.exec(sql);
  const batch=DB.batch.bind(DB),beforeIdentity=identities(DB),beforeSource=old(DB);let inserted=false;
  DB.batch=async statements=>{if(!inserted&&statements.some(s=>s.sql.includes('KIVO_DSTATS_CUTOVER_TARGET_CHANGED'))){inserted=true;DB.exec("INSERT INTO daily_stats_days(site,hijri_date,field_mask,worshippers) VALUES('haram','1500-01-01',1,777)");}return batch(statements);};
  await assert.rejects(W.initDb(env),/KIVO_DSTATS_CUTOVER_TARGET_CHANGED/);
  assert.equal(inserted,true);assert.equal(DB.q('SELECT worshippers FROM daily_stats_days')[0].worshippers,777);
  assert.deepEqual(old(DB),beforeSource);assert.equal(identities(DB),beforeIdentity);assert.equal(DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v,'3');
});

test('missing or duplicated legacy chunk numbers are rejected before a document can be concatenated',async()=>{
  for(const duplicate of [false,true]){
    const {W,DB,env}=await legacy(),beforeIdentity=identities(DB);
    if(!duplicate)DB.db.prepare('UPDATE kv SET seq=2 WHERE k=?').run(KEY);
    else {DB.exec('ALTER TABLE kv RENAME TO TEST_ONLY_original_kv; CREATE TABLE kv(k TEXT NOT NULL,seq INTEGER NOT NULL,v TEXT NOT NULL); INSERT INTO kv SELECT * FROM TEST_ONLY_original_kv;');DB.db.prepare('INSERT INTO kv SELECT * FROM kv WHERE k=?').run(KEY);}
    const beforeSchema=schema(DB),beforeSource=old(DB);
    await assert.rejects(W.initDb(env),/dstats-cutover-chunks-unknown/);
    assert.deepEqual(schema(DB),beforeSchema);assert.deepEqual(old(DB),beforeSource);assert.equal(identities(DB),beforeIdentity);
  }
});

test('cutover allocates above every existing resource revision without rewriting unrelated revision rows',async()=>{
  const {W,DB,env}=await legacy();DB.exec("UPDATE revs SET rev=500 WHERE k='bassam_auth_users_v1'; UPDATE revs SET rev=200 WHERE k='bassam_dstats_v1'");
  const beforeIdentity=identities(DB);await W.initDb(env);
  assert.ok((await W.dsDomainRead(env)).rev>500);assert.ok(+DB.q("SELECT v FROM meta WHERE k='rev'")[0].v>500);
  assert.equal(DB.q("SELECT rev FROM revs WHERE k='bassam_auth_users_v1'")[0].rev,500);assert.equal(identities(DB),beforeIdentity);
});
