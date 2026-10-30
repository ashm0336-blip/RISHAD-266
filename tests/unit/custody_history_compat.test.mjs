/* Independent history-compatibility regression. No canonical edits or Cloudflare. */
import {test} from 'node:test';
import {createHash} from 'node:crypto';
import {cuInflate,CU_LEGACY_ORACLE_SOURCE_SHA256} from './custody_legacy_oracle.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {world as fixture,legacyWorld,canonicalWorker,D1,IDS} from './custody_review_fx.mjs';
const legacyDocument=()=>({items:[{name:'TEST_ONLY radio',qty:3,prefix:'TEST',color:'#b99751'}],moves:[{t:'out',eid:'TEST_ONLY_old_employee',item:'TEST_ONLY radio',ser:'TEST-001',y:1448,m:5,d:1,name:'x'.repeat(5000),nid:'TEST_ONLY_legacy',empno:''}]});

test('canonical typed conversion preserves the tolerated 5000-character snapshot under the test-only inverse projection',async()=>{
  assert.equal(createHash('sha256').update(cuInflate.toString()).digest('hex'),CU_LEGACY_ORACLE_SOURCE_SHA256,'The inverse oracle is the exact frozen historical function');
  const reference=fs.readFileSync(new URL('./custody_identity_api.test.mjs',import.meta.url),'utf8');
  assert.match(reference,/unchanged historical snapshot/);assert.match(reference,/name: 'x'\.repeat\(5000\)/,'The original accepted-history fixture remains explicit');
  const W=await canonicalWorker(),legacy=legacyDocument();
  const rows=W.cuConvert(D1,legacy),restored=cuInflate(rows);
  assert.ok(isDeepStrictEqual(restored,legacy),'The representable old snapshot and its optional-field presence changed');
  assert.equal(rows.moves[0].holder_name_snapshot.length,5000);
});

test('actual startup custody migration and typed export preserve long UTF-8 historical text without a retired KV copy',async()=>{
  const A=await legacyWorld(),W=A.W,legacy=legacyDocument();legacy.moves[0].name='ن'.repeat(5000);
  const key='bsdept:'+D1+':bassam_custody_v1';await A.DB.batch(W.kvPutStmts(A.env,'kv',key,JSON.stringify(legacy)));await W.initDb(A.env);
  const response=await W.default.fetch(new Request('http://x/api/custody/export?dept='+D1,{headers:{Cookie:'bs_tok=TEST_ONLY_session_super'}}),A.env),body=await response.json();
  assert.equal(response.status,200);assert.equal(body.ok,1);assert.ok(isDeepStrictEqual(cuInflate(body.domains[0].rows),legacy),'Migration/export changed historical UTF-8 text');
  assert.equal(A.DB.q('SELECT COUNT(*) n FROM kv WHERE k=?1',key)[0].n,0);assert.equal(A.DB.q('SELECT holder_name_snapshot FROM custody_movements')[0].holder_name_snapshot.length,5000);
});

test('legacy backup conversion, normalized restore validation and caller-owned SQL restore preserve the long snapshot exactly',async()=>{
  const A=await fixture(),W=A.W;
  const mode=await W.enfModeOf(A.env),actor=await W.actorOf({...A.env,__enf:mode},IDS.super),legacy=legacyDocument(),reference={inputKeys:Object.fromEntries(Object.entries(A.keys).map(([key,value])=>[key,JSON.stringify(value)])),inputRevs:{}};
  const converted=await W.rsConvertBackup(A.env,actor,{app:'bassam-crowd',version:3,kind:'full',data:{bassam_depts_v1:JSON.stringify(A.keys.bassam_depts_v1),['bsdept:'+D1+':bassam_custody_v1']:JSON.stringify(legacy)}},{scope:{kind:'full'},mode:'replace',legacyConsent:true,reference});
  const domain=converted.domains.custody.find(value=>value.scope.departmentId===D1),plan=await W.cuPlanRestore(A.env,actor,domain,{dept:D1,base:await W.cuRev(A.env,D1),scope:'full',mode:'replace',reason:'TEST_ONLY historical backup compatibility',finalKeys:new Set(Object.keys(converted.keys))});
  await A.DB.batch(plan.guards.concat(plan.statements));const rows=await W.cuSnapshotRows(A.env,D1);assert.ok(isDeepStrictEqual(cuInflate(rows),legacy),'Legacy backup/normalized restore rewrote historical text');
});

test('preserving an old long snapshot does not relax the current type-create text limit or return a save ACK',async()=>{
  const A=await fixture(),W=A.W;
  const before=A.DB.q('SELECT rev FROM revs WHERE k=?1','bsdept:'+D1+':bassam_custody_v1')[0]?.rev||0;
  const response=await W.default.fetch(new Request('http://x/api/custody/act',{method:'POST',headers:{Cookie:'bs_tok=TEST_ONLY_session_super',Origin:'http://x','Content-Type':'application/json'},body:JSON.stringify({uid:IDS.super,dept:D1,base:before,requestId:'TEST_ONLY_history_limit',op:'type-create',item:{name:'x'.repeat(5000),qty:1}})}),A.env),body=await response.json();
  assert.equal(response.status,400);assert.equal(body.ok,0);assert.equal(body.err,'custody-text');assert.equal(body.rev,undefined);
  for(const table of ['custody_items','custody_issues','custody_movements','custody_requests'])assert.equal(A.DB.q('SELECT COUNT(*) n FROM '+table)[0].n,0,table+' received a write');
  assert.equal(A.DB.q('SELECT rev FROM revs WHERE k=?1','bsdept:'+D1+':bassam_custody_v1')[0]?.rev||0,before);
});
