/* Current private DTO may report an assignment while full map resources are
   denied. The UI must distinguish unavailable geometry from confirmed absence. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {world as backend,D1,IDS,EKEYS,copy} from './custody_review_fx.mjs';
import {installOperationalFixture,replaceOperationalFixture} from './operational_legacy_seed_fx.mjs';
import {world as presentation} from './profile_world.mjs';
import {ROOT} from './harness.mjs';
const N='bassam_rounds_v1',P='bassam_plan_v1';
function emittedLogic(){assert.ok(process.env.KIVO_DIST,'Actual emitted build must be selected');const dist=path.resolve(ROOT,process.env.KIVO_DIST),m=JSON.parse(fs.readFileSync(dist+'.build.json','utf8')),names=Object.keys(m.files).filter(n=>/^assets\/pages\/Profile\.logic\.[a-f0-9]{10}\.js$/.test(n));assert.equal(names.length,1);const b=fs.readFileSync(path.join(dist,names[0]));assert.equal(createHash('sha256').update(b).digest('hex'),m.files[names[0]].sha256);return b.toString('utf8');}
async function dto(t){const B=await backend();await installOperationalFixture(B.env,B.W);t.after(()=>B.DB.db.close());const perms=copy(B.keys.bassam_perms_v1);perms.emps[D1][EKEYS.employee1]={};await B.DB.batch(B.W.kvPutStmts(B.env,'kv','bassam_perms_v1',JSON.stringify(perms)));const initial=await B.api('employee1','/api/me/today');assert.equal(initial.status,200);const {dk,ym}=initial.json.day;
 const floor={sid:'TEST_ONLY_SITE_A',name:'TEST_ONLY site A',num:0,approved:false,zones:[],gates:[],paths:[],marks:[],sectors:[]};
 await replaceOperationalFixture(B.env,'bsdept:'+D1+':'+P,{pMig:3,floors:[floor],months:{[ym]:{c:1,d:[copy(floor)]}},cfg:{},delMonths:{}});
 await replaceOperationalFixture(B.env,'bsdept:'+D1+':'+N,{[dk]:{t:1,ap:0,d:[{sid:floor.sid,zones:[{uid:'TEST_ONLY_ZONE99',ser:'99',code:'99',cat:'men',d:'M1 1 L11 1 L11 11 L1 11 Z',emp:[EKEYS.employee1]}],gates:[],paths:[],marks:[]}]}});
 const result=await B.api('employee1','/api/me/today');assert.equal(result.status,200);assert.equal(result.json.site.round,true);assert.match(result.json.site.today.label,/99/);assert.equal(result.json.site.els,undefined);
 const keys=[N,P].map(n=>'bsdept:'+D1+':'+n),restricted=await B.api('employee1','/api/operations/read?'+new URLSearchParams({uid:IDS.employee1,keys:keys.join(',')}));assert.equal(restricted.status,200);assert.deepEqual(restricted.json.denied,keys);assert.deepEqual(restricted.json.resources,{});
 return{user:B.users.find(u=>u.id===IDS.employee1),private:result.json,initial:initial.json,depts:B.keys.bassam_depts_v1,day:{dk,ym},floor};}
function page(f,emitted,{unreadable=[N,P],plan={},rounds={},privateDTO=f.private}={}){
 const host=presentation({cf:true,user:f.user,depts:f.depts,can:()=>false,unreadable,plan,rounds});let c=host.c;
 if(emitted){vm.runInContext(emittedLogic(),host.ctx,{filename:'actual-emitted-Profile.logic'});const factory=host.KIVO.__dcLogicDefs?.Profile||host.ctx.__dcLogicDefs?.Profile,C=factory(host.ctx.DCLogic,host.ctx.DCLogic,{});c=new C();}
 c._pfAlive=true;c._pfMeScope=c.pfMeContext();c.state={...c.state,pfMe:copy(privateDTO),pfMeAt:Date.now()};return{...host,c,v:()=>c.renderVals()};
}
for(const emitted of [false,true])test((emitted?'emitted':'source')+' private assignment with denied full map resources is unavailable rather than falsely absent',async t=>{
 const f=await dto(t),denied=page(f,emitted),v=denied.v();assert.equal(denied.KIVO.__BS_SRV.operations.state(N),'denied');assert.throws(()=>denied.KIVO.__BS_SRV.operations.get(N),/operations-read-denied/);
 assert.ok(v.pfFacts.some(x=>x.k==='spot'&&/99/.test(x.v)),'The authorized private assignment remains visible');assert.equal(v.mapUnavailable,true);assert.equal(v.mapNoRound,false);assert.equal(v.mapEmpty,false);assert.equal(v.mapHas,false);
 const empty=page(f,emitted,{unreadable:[],privateDTO:f.initial}),e=empty.v();assert.equal(e.mapUnavailable,false);assert.equal(e.mapNoRound,true,'Confirmed readable empty rounds retain the existing no-round state');
 const floor={...copy(f.floor),gates:[{uid:'TEST_ONLY_GATE',num:'01',x:100,y:100,emp:[]}]},fallback=page(f,emitted,{unreadable:[N],plan:{floors:[floor],months:{[f.day.ym]:{d:[floor]}}}}),p=fallback.v();
 assert.equal(p.mapUnavailable,false);assert.equal(p.mapFromPlan,true,'A permitted existing plan fallback remains available');assert.equal(p.mapNoRound,false);assert.equal(p.mapHas,true);assert.deepEqual(denied.fetches,[],'No private map expansion or additional fetch');
 const unready=page(f,emitted,{unreadable:[]}),service=unready.KIVO.__BS_SRV,ops=service.operations;
 unready.KIVO.__BS_SRV={...service,operations:{...ops,state:name=>name===N?'unloaded':ops.state(name),get:name=>{if(name===N)throw Error('operations-read-required');return ops.get(name);}}};
 assert.throws(()=>unready.v(),/operations-read-required/,'An unconfirmed or failed read is not recast as a confirmed denial or empty map');
});
