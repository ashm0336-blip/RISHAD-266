/* SOT-009 Default Deny · SOT-134 Data Integrity · SOT-008 reliability.
   Actual HTTP Worker + SQLite fault sweep for typed Irshad.
   Every distinct SQL statement of each representative request is faulted in
   isolation, in both legacy and enforce modes. No alternate runtime/fixture
   codec is used: the existing SQL fixture is installed on isolated SQLite8
   through the canonical cutover plan, with users/permissions unchanged.
   Invariants: actor-visible reads are whole; forbidden reads/writes never
   disclose/change another department or permissions; committed ACKs imply
   complete typed row + language children + receipt and matching revision;
   a failed ACK leaves the exact old state or the complete committed state. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {PYTHON,makeTestEnv,client,applySql,ROOT,TEST_SUPER_USERNAME,TEST_SUPER_PIN} from './harness.mjs';
import {installIrshadFixture} from './irshad_legacy_seed_fx.mjs';
const TODAY=(()=>{const f=new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn',{timeZone:'Asia/Riyadh',year:'numeric',month:'numeric',day:'numeric'}),o={};f.formatToParts(new Date()).forEach(p=>{o[p.type]=+p.value;});return {y:o.year,m:o.month,d:o.day};})();
function seedSql(){
  const out=fs.mkdtempSync(path.join(os.tmpdir(),'kivo_fx_flt_'));
  execFileSync(PYTHON,[ROOT+'/tests/fixtures/gen_fixture.py','--today',TODAY.y+'-'+TODAY.m+'-'+TODAY.d,'--out',out],{stdio:'pipe'});
  return fs.readFileSync(path.join(out,'test_seed.sql'),'utf8');
}
const D1='tst_d1',D2='tst_d2',K1='bsdept:'+D1+':bassam_irshad_v1',K2='bsdept:'+D2+':bassam_irshad_v1',KP='bassam_perms_v1';
const UID='tst_emp1',EID='tst_e_emp1';
const copy=v=>JSON.parse(JSON.stringify(v));
for(const mode of ['legacy','enforce']){
  const EX=mode==='enforce'?{KIVO_AUTHZ_MODE:'enforce',KIVO_TEST_FIXTURE:'allow'}:{};
  test('['+mode+'] مسحُ أعطال D1 عبارةً عبارة: لا قراءةَ خارج النطاق · لا كتابةَ ممنوعة · لا كتابةَ جزئية · لا نجاحَ بلا أثر',async()=>{
    const env=makeTestEnv(EX),C=client(env);
    const su=await C.login(TEST_SUPER_USERNAME,TEST_SUPER_PIN);assert.ok(su.ok,'synthetic super login');
    const initial=await C.save(su.ck,{bassam_depts_v1:JSON.stringify([{id:'dR',name:'إدارة',gid:''}])});assert.equal(initial.status,200);
    await applySql(env.DB,seedSql());
    const sourceRows=env.DB.q('SELECT k,seq,v FROM kv WHERE k IN(?1,?2)ORDER BY k,seq',K1,K2);
    assert.equal(sourceRows.length,2,'Both legacy fixture sources exist before explicit installation');
    // Reuse the actual atomic cutover plan in this isolated test DB only.
    // Do not reintroduce a runtime KV adapter or change other fixture domains.
    await installIrshadFixture(env);
    assert.equal(env.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0].v,'8');
    assert.equal(env.DB.q("SELECT name FROM d1_migrations WHERE name='0008_irshad'").length,1);
    assert.equal(env.DB.q("SELECT k FROM meta WHERE k='schema_upgrade_permit_v1'").length,0);
    assert.equal(env.DB.q("SELECT k FROM kv WHERE k GLOB '*bassam_irshad*'").length,0,'No retired IR KV is re-created');
    if(mode==='enforce')env.DB.exec("INSERT INTO meta(k,v)VALUES('authz_mode','enforce')ON CONFLICT(k)DO UPDATE SET v='enforce'");
    const emp=await C.login('0000000113','70113');assert.ok(emp.ok,'tst_emp1 fixture: irshad/records view/add/edit');
    const truth=k=>{const rows=env.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq',k);return rows.length?rows.map(r=>r.v).join(''):null;};
    const revOf=k=>env.DB.q('SELECT rev FROM revs WHERE k=?1',k)[0]?.rev||0;
    const raw=d=>copy({reports:env.DB.q('SELECT * FROM irshad_reports WHERE department_id=?1 ORDER BY sequence',d),languages:env.DB.q('SELECT * FROM irshad_report_languages WHERE department_id=?1 ORDER BY report_id,position',d)});
    const receipts=()=>copy(env.DB.q('SELECT * FROM irshad_requests WHERE department_id=?1 ORDER BY account_uid,request_id',D1));
    const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
    const foreignState=()=>copy({data:raw(D2),catalogs:env.DB.q('SELECT * FROM irshad_catalog_entries WHERE department_id=?1 ORDER BY kind,position',D2),windows:env.DB.q('SELECT * FROM irshad_retro_windows WHERE department_id=?1 ORDER BY sequence',D2),requests:env.DB.q('SELECT * FROM irshad_requests WHERE department_id=?1 ORDER BY account_uid,request_id',D2),revs:env.DB.q("SELECT * FROM revs WHERE k GLOB 'bsdept:tst_d2:bassam_irshad*' ORDER BY k")});
    const foreign0=foreignState(),perms0=truth(KP),permsRev0=revOf(KP);
    assert.ok(foreign0.data.reports.some(r=>r.report_id==='tstir21'),'Other-department marker survived actual cutover');
    const employee=JSON.parse(truth('bsdept:'+D1+':bassam_employees_v1')).find(e=>e.eid===EID);
    const actor=JSON.parse(truth('bassam_auth_users_v1')).find(u=>u.id===UID);
    assert.ok(employee&&actor);
    const read=(dept=D1,cookie=emp.ck,extra={})=>C.api('/api/irshad?'+new URLSearchParams({dept,view:'records',year:TODAY.y,month:TODAY.m,limit:200,...extra}),{cookie});
    let seq=0,firstLocation;
    const REQ={
      read:{
        prep:async()=>{const r=await read();assert.equal(r.status,200);assert.equal(r.j.ok,1);assert.equal(r.j.rows.length,r.j.total,'Bounded fixture fits one200-row page');return {expected:copy(r.j.rows)};},
        run:async()=>read(),
        check:async(r,x)=>{assert.ok(!JSON.stringify(r.j||{}).includes('tstir21'),'No foreign report marker in response');if(r.j?.rows!==undefined)assert.deepEqual(r.j.rows,x.expected,'Any returned actor-visible row set is whole and unchanged');return {ok:r.status===200&&r.j?.ok===1&&Array.isArray(r.j.rows)};},
      },
      readForeign:{
        prep:async()=>({}),run:async()=>read(D2),
        check:async r=>{assert.ok(!(r.status===200&&r.j?.ok===1),'Other-department typed read never succeeds');assert.ok(!r.j?.rows?.length&&!JSON.stringify(r.j||{}).includes('tstir21'),'No foreign records leak under a read fault');return {ok:true};},
      },
      write:{
        prep:async()=>{
          const view=await read();assert.equal(view.status,200);assert.equal(view.j.ok,1);
          const id='TEST_ONLY_fault_'+mode+'_'+ ++seq,loc='TEST_ONLY fault probe '+mode+' '+seq;
          if(!firstLocation)firstLocation=loc;
          const data={...TODAY,shift:'TST-A',eid:EID,loc,langs:[{lang:'TEST_ONLY language A',count:seq+1},{lang:'TEST_ONLY language B',count:seq+2}],bro:seq+3,pros:2,pol:1};
          return {data,body:{uid:UID,dept:D1,requestId:id,base:copy(view.j.base),op:'create',reason:'TEST_ONLY fault sweep',data},old:raw(D1),oldReceipts:receipts(),rev0:revOf(K1)};
        },
        run:async x=>C.api('/api/irshad/act',{cookie:emp.ck,method:'POST',body:x.body}),
        check:async(r,x)=>{
          const now=raw(D1),rv=revOf(K1),nowReceipts=receipts(),oldIds=new Set(x.old.reports.map(row=>row.report_id)),added=now.reports.filter(row=>!oldIds.has(row.report_id));
          const okAll=r.status===200&&r.j?.ok===1;
          const isOld=same(now,x.old)&&rv===x.rev0&&same(nowReceipts,x.oldReceipts);
          let isNew=false;
          if(added.length===1){
            const row=added[0],others={reports:now.reports.filter(r=>r.report_id!==row.report_id),languages:now.languages.filter(r=>r.report_id!==row.report_id)},children=now.languages.filter(r=>r.report_id===row.report_id),mine=nowReceipts.filter(v=>v.request_id===x.body.requestId&&v.account_uid===UID);
            isNew=same(others,x.old)&&rv>x.rev0&&now.reports.length===x.old.reports.length+1&&children.length===x.data.langs.length&&mine.length===1&&nowReceipts.length===x.oldReceipts.length+1&&same(nowReceipts.filter(v=>v!==mine[0]),x.oldReceipts);
            if(isNew){
              assert.equal(row.sequence,Math.max(-1,...x.old.reports.map(v=>v.sequence))+1);
              assert.ok(row.created_at>0);assert.match(row.report_id,/^ir-/);
              assert.deepEqual(children.map(v=>({lang:v.language,count:v.count})),x.data.langs);
              assert.deepEqual(children.map(v=>v.position),[0,1]);
              assert.equal(mine[0].operation,'create');assert.equal(mine[0].result_n,1);assert.equal(mine[0].result_id,row.report_id);assert.equal(mine[0].resource_key,K1);assert.equal(mine[0].resource_rev,rv);
              // A second actual HTTP read after clearing failIf proves the full
              // DTO presence mask, children, immutable identity and server stamps.
              const back=await read(D1,su.ck,{loc:x.data.loc});assert.equal(back.status,200);assert.equal(back.j.ok,1);assert.equal(back.j.total,1);
              assert.deepEqual(back.j.rows,[{...x.data,id:row.report_id,ts:row.created_at,actor:actor.name||actor.un||actor.id,name:employee.name||'بدون اسم'}]);
              if(okAll){assert.equal(r.j.id,row.report_id);assert.equal(r.j.requestId,x.body.requestId);assert.equal(r.j.rev,rv);assert.deepEqual(r.j.base,{...x.body.base,reports:rv});}
            }
          }
          if(okAll)assert.ok(isNew,'ok:1 implies full typed report, language children, receipt, readback and matching revision');
          else assert.ok(isOld||isNew,'Failed ACK leaves exactly old state or complete committed state, never partial rows/children/revision');
          return {ok:okAll,persisted:isNew};
        },
      },
      denyDepartment:{
        prep:async()=>{const v=await read(D2,su.ck);assert.equal(v.status,200);assert.equal(v.j.ok,1);return {body:{uid:UID,dept:D2,requestId:'TEST_ONLY_forbidden_'+mode+'_'+ ++seq,base:v.j.base,op:'create',data:{...TODAY,shift:'TST-A',eid:'tst_e_emp2',loc:'TEST_ONLY forbidden',langs:[],bro:0,pros:0,pol:0}}};},
        run:async x=>C.api('/api/irshad/act',{cookie:emp.ck,method:'POST',body:x.body}),
        check:async r=>{assert.ok(!(r.status===200&&r.j?.ok===1),'Other-department create never ACKs');assert.deepEqual(foreignState(),foreign0,'Other-department typed rows, children, receipts and resource revisions never change');return {ok:true};},
      },
      denyPermissions:{
        prep:async()=>({base:revOf(KP)}),run:async x=>C.save(emp.ck,{[KP]:JSON.stringify({caps:{},emps:{}})},[],{[KP]:x.base}),
        check:async()=>{assert.equal(truth(KP),perms0,'Global permission bytes never change');assert.equal(revOf(KP),permsRev0,'Forbidden save does not advance the permission revision');return {ok:true};},
      },
      boot:{
        prep:async()=>({}),run:async()=>{const b=await C.boot(emp.ck);return {status:b.status,b};},
        check:async r=>{const keys=r.b?.boot?.keys||{};assert.ok(!(K2 in keys)&&!(r.b?.html||'').includes('tstir21'),'Boot does not inject another department');return {ok:true};},
      },
    };
    const stats={cases:0,byReq:{},statuses:{},falseFail:0,okUnderFault:0};
    for(const [name,R]of Object.entries(REQ)){
      env.DB.failIf=null;const x0=await R.prep();env.DB.log=[];
      const r0=await R.run(x0),sqls=[...new Set(env.DB.log)];
      // Capture only the request SQL before check() performs any readback SQL.
      const c0=await R.check(r0,x0);
      if(name==='write')assert.ok(c0.ok&&c0.persisted,'Normal typed create is allowed before faulting');
      if(name==='read')assert.ok(c0.ok,'Normal scoped typed read succeeds');
      assert.ok(sqls.length>=2,name+': actual SQL statement coverage '+sqls.length);stats.byReq[name]=sqls.length;
      for(const q of sqls){
        env.DB.failIf=null;const x=await R.prep();env.DB.failIf=sq=>sq===q;
        let r;try{r=await R.run(x);}catch{r={status:'throw',j:{}};}finally{env.DB.failIf=null;}
        const checked=await R.check(r,x)||{};
        if(name==='write'&&!checked.ok&&checked.persisted)stats.falseFail++;
        if(checked.ok&&(name==='read'||name==='write'))stats.okUnderFault++;
        stats.cases++;const status=String(r.status);stats.statuses[status]=(stats.statuses[status]||0)+1;
      }
    }
    const final=await read(D1,su.ck,{loc:firstLocation});assert.equal(final.status,200);assert.equal(final.j.ok,1);assert.equal(final.j.total,1,'Initial committed typed report remains readable after every fault');
    assert.deepEqual(foreignState(),foreign0);assert.equal(truth(KP),perms0);assert.equal(revOf(KP),permsRev0);
    assert.equal(env.DB.q("SELECT k FROM kv WHERE k GLOB '*bassam_irshad*'").length,0);
    assert.deepEqual(env.DB.q('PRAGMA foreign_key_check'),[]);
    console.log('['+mode+'] typed fault cases '+stats.cases+'; SQL/request '+JSON.stringify(stats.byReq)+'; statuses '+JSON.stringify(stats.statuses)+'; committed but failed ACK '+stats.falseFail);
    assert.ok(stats.cases>=20,'Per-statement fault sweep remains material: '+stats.cases);
  });
}
