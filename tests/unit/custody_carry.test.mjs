/* Owner regression: recreated employees and pre-existing orphans must keep a
   visible, returnable balance in the next month. Legacy rows are inserted only
   before actual migration0006; normal paths use the canonical typed API/UI. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {legacyWorld,D1,IDS} from './custody_review_fx.mjs';
import {pageFor} from './custody_scenarios_fx.mjs';
import {adoptOperationalFixture,replaceOperationalFixture} from './operational_legacy_seed_fx.mjs';
const copy=value=>JSON.parse(JSON.stringify(value));

const EMPS=[{eid:'eNEW',nid:'1234567890',empno:'7001',name:'سعد'},{eid:'eB',nid:'2222222222',empno:'7002',name:'بدر'}];
let request=0;
async function fixture(moves=[],employees=EMPS){
  const f=await legacyWorld(),key='bsdept:'+D1+':bassam_employees_v1',custodyKey='bsdept:'+D1+':bassam_custody_v1',W=f.W;
  const items=[{name:'لاسلكي',qty:10,prefix:'RD',color:'#123456'},{name:'كشاف',qty:10,prefix:'KS',color:'#654321'}];
  await f.DB.batch([...W.kvPutStmts(f.env,'kv',key,JSON.stringify(employees)),...W.kvPutStmts(f.env,'kv',custodyKey,JSON.stringify({items,moves}))]);
  await W.initDb(f.env);
  /* initDb ran the real schema-10 cutover of the pre-0006 roster: register it (no re-cut) for typed seeding. */
  await adoptOperationalFixture(f.env,W);
  assert.equal(f.DB.q('SELECT COUNT(*) AS n FROM kv WHERE k=?',key)[0].n,0,'Roster is typed after the cutover, not retired KV');
  const api=async(route,body)=>{
    const response=await W.default.fetch(new Request('http://x'+route,{method:body===undefined?'GET':'POST',headers:{Cookie:'bs_tok=TEST_ONLY_session_super',...(body===undefined?{}:{Origin:'http://x','Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})}),f.env);
    const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));assert.equal(data.ok,1);return data;
  };
  const read=(q={})=>api('/api/custody?'+new URLSearchParams({dept:D1,uid:IDS.super,...q}));
  const act=async body=>api('/api/custody/act',{uid:IDS.super,dept:D1,base:await W.cuRev(f.env,D1),requestId:'TEST_ONLY_carry_'+ ++request,...body});
  /* Schema 10 (d5a08a6): roster changes go through the canonical typed writer, never retired KV. */
  const setEmployees=async rows=>assert.deepEqual(await replaceOperationalFixture(f.env,key,rows),copy(rows),'Typed roster round-trips exactly');
  assert.equal(f.DB.q('SELECT COUNT(*) AS n FROM kv WHERE k=?',custodyKey)[0].n,0);
  return {...f,W,read,act,setEmployees};
}
async function holder(f,key,q={}){return f.read({view:'holder',holderKey:key,...q});}
function out(eid,serial,extra={}){return {t:'out',eid,item:'لاسلكي',ser:serial,y:1447,m:11,d:3,...extra};}

test('حل الحامل: المعرّف أولًا ثم هوية أو رقم وظيفي فريدان وإلا يبقى المعرّف التاريخي معلقًا',async()=>{
  const f=await fixture([
    out('eB','RD-001',{nid:'1234567890',name:'لقطة متعارضة مع المعرف'}),
    out('eOLD','RD-002',{nid:'1234567890',name:'سعد'}),
    out('eOLDER','RD-003',{empno:'7002',name:'بدر'}),
    out('eGONE','RD-004'),
  ]);
  const first=await holder(f,'eB'),bySerial=Object.fromEntries(first.rows.map(row=>[row.ser,row]));
  assert.equal(bySerial['RD-001'].eid,'eB','Exact eid wins over another person snapshot identity');
  assert.equal(bySerial['RD-003'].eid,'eB','Unique employee number relinks the old holder');
  const linked=(await holder(f,'eNEW')).rows[0];assert.equal(linked.ser,'RD-002');assert.equal(linked.eid,'eNEW');assert.equal(linked.hid,'eOLD');
  const orphan=(await holder(f,'eGONE')).rows[0];assert.equal(orphan.eid,'eGONE');assert.equal(orphan.hid,'eGONE');assert.equal(orphan.orphan,true);
  assert.deepEqual(f.DB.q('SELECT holder_key FROM custody_movements ORDER BY sequence').map(row=>row.holder_key),['eB','eOLD','eOLDER','eGONE'],'Read-time resolution does not rewrite stored history');
  await f.setEmployees([...EMPS,{eid:'eDUP',nid:'1234567890',name:'TEST_ONLY duplicate'}]);
  const ambiguous=(await holder(f,'eOLD')).rows[0];assert.equal(ambiguous.eid,'eOLD');assert.equal(ambiguous.orphan,true);assert.equal(ambiguous.ambiguous,true);
});

test('رصيد الشهر يحمل عهدة السجل المعاد إنشاؤه ويعرض المعلقة باسمها الخام مع البحث وفتح البطاقة والإرجاع',async()=>{
  const f=await fixture([
    out('eOLD','RD-001',{nid:'1234567890',name:'سعد'}),
    out('eGONE','RD-002',{name:'موظف سابق',m:12,d:9}),
    {t:'out',eid:'eB',item:'كشاف',ser:'KS-001',y:1448,m:1,d:1},
    {t:'in',eid:'eB',item:'كشاف',ser:'KS-001',y:1448,m:2,d:5},
  ]);
  const historical=await f.read({year:1448,month:5}),linked=await holder(f,'eNEW',{year:1448,month:5}),orphan=await holder(f,'eGONE',{year:1448,month:5});
  assert.equal(historical.summary.held,2);assert.equal(historical.summary.openingHeld,2);
  assert.equal(linked.rows[0].eid,'eNEW');assert.equal(linked.rows[0].hid,'eOLD');
  assert.equal(orphan.rows[0].eid,'eGONE');assert.equal(orphan.rows[0].snapshot.name,'موظف سابق');
  assert.equal(historical.rows.some(row=>row.holderKey==='eB'),false,'Returned item is not active custody');
  assert.equal((await f.read({q:'سابق'})).total,1);assert.equal((await f.read({q:'لا شيء'})).total,0);
  const current=await f.read();assert.equal(current.summary.held,2);assert.equal(current.summary.openingHeld,2,'Outstanding history carries into the actual server month');
  const ui=await pageFor(f,{employees:EMPS});ui.page.state.empTab='custody';await ui.page._cuRefresh();
  const data=ui.page.state.cuData,table=ui.page._custodyTableVals(data.year,data.month,data.clock),row=table.cuRows.find(row=>row.name==='موظف سابق');
  assert.ok(row,'The actual current-month UI includes the orphan row');assert.equal(ui.page.cuHolderLabel('eGONE'),'موظف سابق');assert.equal(ui.page.cuHolderLabel('eNEW'),'سعد');assert.equal(ui.page.cuHolderLabel('eX'),'موظف غير موجود في القائمة');
  row.openCard();await ui.page._cuLoadHolder('eGONE');const card=ui.page._custodyCardVals(data.year,data.month,data.clock);
  assert.equal(card.ecName,'موظف سابق');assert.equal(card.ecCanIssue,false);assert.equal(card.ecItems.length,1);
  await card.ecItems[0].ret();assert.equal(ui.acks.length,1);assert.equal((await holder(f,'eGONE')).total,0);assert.equal((await f.read()).summary.held,1);
  assert.equal(f.DB.q("SELECT holder_key FROM custody_movements WHERE kind='in' AND holder_key='eGONE'")[0].holder_key,'eGONE','Return retains the historic raw identity');
});

test('التسليم الجديد يحفظ لقطة الخادم ولا يعيد استخدام رابط حامل قديم بعد تغير سجل الموظفين',async()=>{
  const f=await fixture(),initial=await f.read(),radio=initial.items.find(item=>item.name==='لاسلكي');
  const result=await f.act({op:'issue',itemId:radio.id,holderKey:'eNEW',condition:'جديد'});assert.ok(result.outputs[0].issueId);
  const saved=f.DB.q("SELECT holder_key,holder_nid_snapshot,holder_empno_snapshot,holder_name_snapshot FROM custody_movements WHERE kind='out'")[0];
  assert.deepEqual(copy(saved),{holder_key:'eNEW',holder_nid_snapshot:'1234567890',holder_empno_snapshot:'7001',holder_name_snapshot:'سعد'});
  const first=(await holder(f,'eNEW')).rows[0];assert.deepEqual(first.snapshot,{nid:'1234567890',empno:'7001',name:'سعد'});
  const recreated=[{...EMPS[0],eid:'eRECREATED',name:'سعد الحالي'},EMPS[1]];await f.setEmployees(recreated);
  const after=(await holder(f,'eRECREATED')).rows[0];assert.equal(after.issueId,first.issueId);assert.equal(after.eid,'eRECREATED');assert.equal(after.hid,'eNEW');assert.deepEqual(after.snapshot,first.snapshot,'Historic snapshot is preserved while current roster link changes');assert.equal((await holder(f,'eNEW')).total,0,'No stale resolver result is cached across roster changes');
  const ui=await pageFor(f,{employees:recreated});ui.page.state.empTab='custody';await ui.page._cuRefresh();
  const data=ui.page.state.cuData;assert.equal(ui.page.cuHolderLabel('eRECREATED'),'سعد الحالي');assert.ok(ui.page._custodyTableVals(data.year,data.month,data.clock).cuRows.some(row=>row.name==='سعد الحالي'));
  await f.setEmployees([EMPS[1]]);const gone=await f.read();assert.equal(gone.rows[0].holderKey,'eNEW');assert.equal(gone.rows[0].snapshot.name,'سعد');assert.equal(gone.rows[0].orphan,true,'Last saved snapshot supplies a visible row after roster entry disappears');
  assert.equal(f.DB.q('SELECT COUNT(*) n FROM kv WHERE k=?','bsdept:'+D1+':bassam_custody_v1')[0].n,0);
});
