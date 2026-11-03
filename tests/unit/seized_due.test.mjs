/* SQL replacement of the existing bx_old/bx_wk observer, real canonical SQLite. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {world,seizedDocs,D1,D2,IDS,clone,batchBounds} from './business_atomic_fx.mjs';
import {candidateWorker} from './irshad_domain_fx.mjs';
const DUE=Date.parse('2026-10-31T06:01:00Z'); // Saturday09:01 Riyadh.
async function clock(fn){const RealDate=globalThis.Date,box={now:DUE};globalThis.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[box.now]));}static now(){return box.now;}};try{await fn(v=>box.now=RealDate.parse(v));}finally{globalThis.Date=RealDate;}}
async function fixture({empty=false}={}){
 const B=await world({schema:10}),W=await candidateWorker(['nfSeizedDue','NF_REV','pfHijriAt','szKey','szRevs']);
 await B.DB.prepare("INSERT INTO notification_type_overrides(type_id,enabled)VALUES('bx_wk',1)").run();
 const docs=seizedDocs();docs.reports.reports[0].ts=DUE-40*86400000;docs.reports.reports[0].items[0].n=3;docs.reports.reports[0].items[0].val=1200;
 if(empty)docs.reports.reports=[];await B.install('seized',D1,docs);
 const other=seizedDocs('foreign');other.reports.reports[0].ts=1;other.reports.reports[0].items[0].n=99999;await B.install('seized',D2,other);
 const poll=async(who='super',dept=D1,A)=>W.nfSeizedDue(B.env,A||await W.actorOf(B.env,IDS[who]),new URL('http://x/api/notifications?dept='+dept));
 return {...B,W,poll,docs};
}
const messages=B=>clone(B.DB.q("SELECT * FROM notification_messages WHERE type IN('bx_old','bx_wk') ORDER BY type"));
const state=B=>Object.fromEntries(['meta','revs','aud','notification_messages','notification_targets','notification_dedup'].map(t=>[t,clone(B.DB.q('SELECT * FROM '+t))]));
function beforeCommit(B,change){const batch=B.DB.batch.bind(B.DB);let fired=false;B.DB.batch=async st=>{if(!fired&&st.some(s=>s.sql.includes('KIVO_SEIZED_DUE_SEEN'))){fired=true;change();}batchBounds(st);return batch(st);};return ()=>fired;}

test('Seized due keeps Riyadh windows and original unpadded daily/weekly once keys',async()=>clock(async set=>{
 const B=await fixture();set('2026-10-31T04:59:00Z');assert.equal((await B.poll()).emitted,0);
 set('2026-10-31T05:01:00Z');assert.equal((await B.poll()).emitted,1);assert.deepEqual(messages(B).map(r=>r.type),['bx_wk']);
 set('2026-10-31T06:01:00Z');assert.equal((await B.poll()).emitted,1);const day=B.W.pfHijriAt(DUE),keys=B.DB.q("SELECT once_key FROM notification_dedup WHERE once_key LIKE 'bx_%'").map(r=>r.once_key).sort();
 assert.deepEqual(keys,['bx_old:'+day.y+'-'+day.m+'-'+day.d,'bx_wk:'+day.y+'-'+day.m+'-'+day.d].sort());
}));
test('SQL storage facts preserve quantity/value notification semantics and active department',async()=>clock(async()=>{
 const B=await fixture(),revs=await B.W.szRevs(B.env,D1);assert.equal((await B.poll()).emitted,2);const rows=messages(B);assert.equal(rows.length,2);assert.ok(rows.every(r=>r.department===D1));assert.ok(rows.every(r=>!r.body.includes('99999')));assert.match(rows.find(r=>r.type==='bx_wk').body,/1,200/);assert.deepEqual(await B.W.szRevs(B.env,D1),revs);
}));
test('Repeated/concurrent due polls commit only one of each notification',async()=>clock(async()=>{
 const B=await fixture(),pair=await Promise.all([B.poll(),B.poll()]);assert.equal(pair.reduce((n,r)=>n+r.emitted,0),2);assert.equal(messages(B).length,2);const before=state(B);assert.equal((await B.poll()).emitted,0);assert.deepEqual(state(B),before);
}));
test('Empty, ordinary staff and foreign/unknown scope emit nothing',async()=>clock(async()=>{
 const empty=await fixture({empty:true}),before=state(empty);assert.equal((await empty.poll()).emitted,0);assert.deepEqual(state(empty),before);
 const B=await fixture();assert.equal((await B.poll('employee1')).emitted,0);assert.equal((await B.poll('manager2')).emitted,0);assert.equal((await B.poll('super','TEST_ONLY_unknown')).emitted,0);assert.equal(messages(B).length,0);
}));
test('Fresh role and resource ceiling supersede a previously captured manager',async()=>clock(async()=>{
 const B=await fixture(),old=await B.W.actorOf(B.env,IDS.manager1),users=clone(B.users);users.find(u=>u.id===IDS.manager1).mgr=0;await B.put('bassam_auth_users_v1',users);assert.equal((await B.poll('manager1',D1,old)).emitted,0);
 await B.put('bassam_auth_users_v1',B.users);const p=clone(B.keys.bassam_perms_v1);Object.keys(p.caps).forEach(d=>p.caps[d]=p.caps[d].filter(c=>c!=='seized'));await B.put('bassam_perms_v1',p);assert.equal((await B.poll('manager1')).emitted,0);assert.equal(messages(B).length,0);
}));
test('Authority, epoch, aggregate and notification config races leave only the competing change',async()=>clock(async()=>{
 for(const kind of ['authority','epoch','source','config']){
  const B=await fixture(),before=state(B),fired=beforeCommit(B,()=>{
   if(kind==='authority'){const p=clone(B.keys.bassam_perms_v1);p.TEST_ONLY_race=true;B.DB.db.prepare('UPDATE kv SET v=? WHERE k=? AND seq=0').run(JSON.stringify(p),'bassam_perms_v1');}
   if(kind==='epoch')B.DB.exec("UPDATE meta SET v='1' WHERE k='restore_epoch'");
   if(kind==='source')B.DB.exec('UPDATE seized_items SET quantity=99');
   if(kind==='config')B.DB.exec("INSERT INTO notification_type_overrides(type_id,enabled)VALUES('bx_old',0)");
  });
  await assert.rejects(B.poll(),e=>e.nf==='conflict'&&e.status===409);assert.equal(fired(),true);if(kind==='epoch')before.meta=before.meta.map(r=>r.k==='restore_epoch'?{...r,v:'1'}:r);assert.deepEqual(state(B),before,kind);assert.equal(messages(B).length,0);
 }
}));
test('Late SQL failure rolls back all emitted facts and revisions',async()=>clock(async()=>{
 const B=await fixture(),before=state(B);B.DB.failIf=sql=>sql.includes('INSERT INTO notification_messages(');await assert.rejects(B.poll(),/injected failure/);B.DB.failIf=null;assert.deepEqual(state(B),before);
}));
test('Retired Seized source fails closed rather than generating from legacy documents',async()=>clock(async()=>{
 const B=await fixture(),before=state(B);await B.DB.batch(B.W.kvPutStmts(B.env,'kv',B.W.szKey(D1),'{"reports":[]}'));await assert.rejects(B.poll(),e=>e.nf==='seized-legacy-source-present'&&e.status===503);assert.deepEqual(state(B),before);
}));

test('Weekly summary remains disabled by default without consuming its once key',async()=>clock(async()=>{const B=await fixture();B.DB.exec("DELETE FROM notification_type_overrides WHERE type_id='bx_wk'");assert.equal((await B.poll()).emitted,1);assert.deepEqual(messages(B).map(r=>r.type),['bx_old']);assert.equal(B.DB.q("SELECT * FROM notification_dedup WHERE once_key LIKE 'bx_wk:%'").length,0);}));
