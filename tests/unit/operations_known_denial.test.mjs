/* Canonical known denial, actual 280 transport and actual Daily _opCommit.
   Both source and explicit emitted bundles are exercised; no grants or cloud.
   RISHAD-266: the known denial was the retired scope ceiling ("unmigrated-department-ceiling"); it is now the unit ceiling:
   V7 · د1-ج (قرار صاحب المنصة): مدير المنصة بلا قيد صلاحية فلا يُرفض — فالرفضُ المعروف هنا لمدير الإدارة (manager1) بورقته الصريحة:
   عرضُ الجولات وحده، فيقرأ ولا يكتب. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { parse } from 'acorn';
import { createHash } from 'node:crypto';
import { world, D1, IDS, EKEYS, copy, identitySnapshot } from './custody_review_fx.mjs';
import { installOperationalFixture, inspectOperationalFixture, replaceOperationalFixture } from './operational_legacy_seed_fx.mjs';
import { ROOT } from './harness.mjs';
import { loadClient, until } from './k264_vm.mjs';
const NAME='bassam_rounds_v1',KEY='bsdept:'+D1+':'+NAME,REASON='صلاحيتك لا تشمل هذا الإجراء';
function bytes(name){
 assert.ok(process.env.KIVO_DIST,'Select the actual build with KIVO_DIST; emitted tests never fall back to source');
 const dist=path.resolve(ROOT,process.env.KIVO_DIST),manifest=JSON.parse(fs.readFileSync(dist+'.build.json','utf8'));
 const pattern=name.startsWith('src/api/')?/^assets\/js\/280-server-storage\.[a-f0-9]{10}\.js$/:/^assets\/pages\/Daily-Sessions\.logic\.[a-f0-9]{10}\.js$/;
 const files=Object.keys(manifest.files).filter(x=>pattern.test(x));assert.equal(files.length,1);const b=fs.readFileSync(path.join(dist,files[0]));assert.equal(createHash('sha256').update(b).digest('hex'),manifest.files[files[0]].sha256);return b.toString('utf8');
}
function member(source,name){const tree=parse(source,{ecmaVersion:'latest',sourceType:'script'}),found=[];function visit(x){if(!x||typeof x!=='object')return;if(x.type==='MethodDefinition'&&x.key?.name===name)found.push(x);Object.values(x).forEach(v=>Array.isArray(v)?v.forEach(visit):visit(v));}visit(tree);assert.equal(found.length,1);return source.slice(found[0].start,found[0].end);}
async function setup(t,emitted){
 const B=await world();await installOperationalFixture(B.env,B.W);const date=await B.api('employee1','/api/me/today'),{ym,dk}=date.json.day;
 const floor={sid:'TEST_ONLY_SCOPE_SITE',name:'TEST_ONLY site',num:0,approved:false,zones:[],gates:[],marks:[],paths:[],sectors:[]};
 await replaceOperationalFixture(B.env,'bsdept:'+D1+':bassam_plan_v1',{pMig:3,floors:[floor],months:{[ym]:{c:1,d:[copy(floor)]}},cfg:{},delMonths:{}});
 const before={[dk]:{t:1,ap:0,auto:1,d:[{sid:floor.sid,zones:[],gates:[],marks:[],paths:[]}]}};await replaceOperationalFixture(B.env,KEY,before);
 const perms=copy(B.keys.bassam_perms_v1);perms.emps=perms.emps||{};perms.emps[D1]=Object.assign({},perms.emps[D1],{[EKEYS.manager1]:{daily:['view'],'daily/rounds':['view']}});   /* V7 · د1-ج: the known denial is the manager's own view-only sheet on the rounds (the platform administrator is never denied) */
 await B.DB.batch([...B.W.kvPutStmts(B.env,'kv','bassam_perms_v1',JSON.stringify(perms)),B.DB.prepare("UPDATE revs SET rev=rev+1 WHERE k='bassam_perms_v1'"),B.DB.prepare("UPDATE meta SET v=CAST(CAST(v AS INTEGER)+1 AS TEXT) WHERE k='rev'")]);
 const initial=(await B.api('manager1','/api/get?keys=bassam_auth_users_v1,bassam_depts_v1,bassam_perms_v1,bassam_gdepts_v1,bassam_platform_v1')).json;
 const authz=await B.api('manager1','/api/authz');assert.equal(authz.status,200);assert.ok(authz.json.me);
 const control={mode:'normal',posts:[],hold:null,release:null,raced:false},protectedBefore=identitySnapshot(B.DB),toasts=[];
 const T=loadClient({blocks:[],jar:{cookie:'bs_tok=TEST_ONLY_session_manager1'},boot:{srv:1,cf:1,uid:IDS.manager1,authz:authz.json.me,v:initial.v,keys:Object.fromEntries(Object.entries(initial.keys).filter(([,x])=>x.v!=null).map(([k,x])=>[k,x.v])),revs:Object.fromEntries(Object.entries(initial.keys).map(([k,x])=>[k,x.rev]))},C:{req:async(route,o={})=>{
  const url=new URL(route,'http://x');assert.equal(url.origin,'http://x');assert.doesNotMatch(url.pathname,/\/api\/img|r2/i);const headers=new Headers({Cookie:o.cookie});if(o.method==='POST'){headers.set('Origin','http://x');headers.set('Content-Type','application/json');}
  if(url.pathname==='/api/save'){
   control.posts.push(o.body);
   if(control.mode==='race'&&!control.raced){control.raced=true;const race=copy(before);race[dk].t=2;await replaceOperationalFixture(B.env,KEY,race);}
  }
  const response=await B.W.default.fetch(new Request(url,{method:o.method||'GET',headers,...(o.body?{body:o.body}:{})}),B.env);
  if(url.pathname==='/api/save'&&control.mode==='held-loss'){await new Promise(r=>control.release=r);control.mode='normal';throw new TypeError('TEST_ONLY lost response');}
  if(url.pathname==='/api/save'&&control.mode==='malformed'){const body=JSON.parse(o.body);return new Response(JSON.stringify({ok:0,atomic:1,requestId:body.requestId,epoch:body.epoch,denied:[]}),{status:403,headers:{'Content-Type':'application/json'}});}
  return response;
 }}});
 const W=T.W,K=W.KIVO;W.document.hidden=true;W.URLSearchParams=URLSearchParams;W.AbortController=AbortController;
 K.__BS_AUTHZ=true;K.BassamAuth={user:()=>B.users.find(u=>u.id===IDS.manager1)};K.BassamDepts={active:()=>D1};K.BassamCount=n=>String(n);
 const source=emitted?bytes('src/api/280-server-storage.js'):fs.readFileSync(path.join(ROOT,'src/api/280-server-storage.js'),'utf8');vm.runInContext(source,T.ctx,{filename:emitted?'emitted280':'source280'});
 const service=K.__BS_SRV.operations;assert.equal((await service.read([KEY])).ok,1);
 const daily=emitted?bytes('src/modules/daily/logic.js'):fs.readFileSync(path.join(ROOT,'src/modules/daily/logic.js'),'utf8');
 const page={_opService:()=>service,_opDrafts:{[NAME]:service.draft()},bsToast:(message)=>toasts.push(message)};page._opCommit=vm.runInContext('({'+member(daily,'_opCommit')+'})._opCommit',T.ctx);
 const desired=copy(before);desired[dk].d[0].zones.push({uid:'TEST_ONLY_SCOPE_ZONE',d:'M1 1 L11 1 L11 11 L1 11 Z',code:'01',ser:'01',cat:'men',rawA:100,cx:6,cy:6,count:null,pc:{},emp:[],kind:null,hideLabel:true});
 t.after(()=>T.dispose());return{B,T,K,service,page,toasts,control,before,desired,protectedBefore,dk};
}
for(const emitted of [false,true])test((emitted?'emitted':'source')+' explicit scope denial remains known after an edited intent and explains missing department configuration',async t=>{
 const f=await setup(t,emitted),first=await f.page._opCommit({[NAME]:f.desired});assert.equal(first.err,'denied');assert.equal(first.status,403);assert.equal(first.uncertain,false);assert.equal(first.details.denied[KEY].why,'perm',JSON.stringify(first.details.denied[KEY]).slice(0,300));assert.equal(f.service.status(first.ticket).state,'denied');
 const changed=copy(f.desired);changed[f.dk].d[0].zones[0].code='99';const second=await f.page._opCommit({[NAME]:changed});
 assert.deepEqual({err:second.err,uncertain:second.uncertain,reason:f.toasts[0]},{err:'denied',uncertain:false,reason:REASON});
 assert.equal(second.ticket,first.ticket);assert.equal(f.control.posts.length,1);assert.deepEqual(inspectOperationalFixture(f.B.env,KEY),f.before);assert.deepEqual(identitySnapshot(f.B.DB),f.protectedBefore);assert.ok(f.page._opDrafts[NAME]);assert.deepEqual(copy(changed[f.dk].d[0].zones[0].code),'99');
});

for(const emitted of [false,true])test((emitted?'emitted':'source')+' pending lost and malformed acknowledgements preserve stable ticket and exact explicit retry',async t=>{
 for(const mode of ['held-loss','malformed']){
  const f=await setup(t,emitted);f.control.mode=mode;const firstPromise=f.page._opCommit({[NAME]:f.desired});
  if(mode==='held-loss'){
   assert.equal(await until(()=>!!f.control.release,2000,5),true);const changed=copy(f.desired);changed[f.dk].d[0].zones[0].code='99';
   const pending=await f.page._opCommit({[NAME]:changed});assert.equal(pending.err,'review-required');assert.equal(pending.uncertain,true);assert.equal(f.control.posts.length,1);f.control.release();
  }
  const first=await firstPromise;assert.equal(first.uncertain,true);assert.equal(f.service.status(first.ticket).state,'uncertain');
  const changed=copy(f.desired);changed[f.dk].d[0].zones[0].code='99';const refused=await f.page._opCommit({[NAME]:changed});assert.equal(refused.err,'review-required');assert.equal(refused.uncertain,true);assert.equal(refused.ticket,first.ticket);assert.equal(f.control.posts.length,1);
  f.control.mode='normal';const retry=await f.page._opCommit({[NAME]:f.desired});assert.equal(retry.err,'denied');assert.equal(retry.uncertain,false);assert.equal(retry.ticket,first.ticket);assert.equal(f.control.posts.length,2);assert.equal(f.control.posts[1],f.control.posts[0]);
  assert.deepEqual(inspectOperationalFixture(f.B.env,KEY),f.before);assert.deepEqual(identitySnapshot(f.B.DB),f.protectedBefore);
 }
});
for(const emitted of [false,true])test((emitted?'emitted':'source')+' known conflict preserves review and concurrent data without rebase or a changed-intent POST',async t=>{
 const f=await setup(t,emitted);f.control.mode='race';const first=await f.page._opCommit({[NAME]:f.desired});assert.equal(first.err,'conflict');assert.equal(first.status,409);assert.equal(first.uncertain,false);assert.equal(f.service.status(first.ticket).state,'conflict');
 const changed=copy(f.desired);changed[f.dk].d[0].zones[0].code='99';const second=await f.page._opCommit({[NAME]:changed});assert.equal(second.err,'conflict');assert.equal(second.uncertain,false);assert.equal(second.ticket,first.ticket);assert.equal(f.control.posts.length,1);
 const kept=inspectOperationalFixture(f.B.env,KEY);assert.equal(kept[f.dk].t,2);assert.deepEqual(kept[f.dk].d[0].zones,[]);assert.deepEqual(identitySnapshot(f.B.DB),f.protectedBefore);
 assert.equal(f.service.explain({details:{denied:{[KEY]:{why:'scope-unknown',detail:'x=unmigrated-department-ceiling'}}}}),f.service.explain({details:{denied:{[KEY]:{why:'scope-unknown'}}}}),'RISHAD-266: no unmigrated-* special case remains');
});
