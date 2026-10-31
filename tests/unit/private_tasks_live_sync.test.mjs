/* Actual canonical schema10 HTTP plus explicit emitted 280/545/Profile. No cloud or image requests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { world, D1, D2, IDS, EKEYS, copy, identitySnapshot } from './custody_review_fx.mjs';
import { installOperationalFixture, replaceOperationalFixture } from './operational_legacy_seed_fx.mjs';
import { candidateWorker } from './irshad_domain_fx.mjs';
import { ROOT } from './harness.mjs';
import { loadClient } from './k264_vm.mjs';
const TASKS='bassam_tasks_v1', scoped=(dept=D1)=>'bsdept:'+dept+':'+TASKS;
const ok=r=>{assert.equal(r.status,200,JSON.stringify(r.json));assert.equal(r.json.ok,1);return r.json;};
const cursor=B=>+B.DB.q("SELECT v FROM meta WHERE k='rev'")[0].v;
let serial=0;
async function setup() {
 const B=await world(); await installOperationalFixture(B.env,B.W);
 const perms=copy(B.keys.bassam_perms_v1);perms.emps[D1][EKEYS.employee1]={};
 await B.DB.batch(B.W.kvPutStmts(B.env,'kv','bassam_perms_v1',JSON.stringify(perms)));
 const now=Date.now(), h=new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn',{timeZone:'Asia/Riyadh',year:'numeric',month:'numeric',day:'numeric'}), parts={};
 h.formatToParts(new Date(now)).forEach(x=>parts[x.type]=+x.value); const day=[parts.year,parts.month,parts.day].join('-');
 const row=['TEST_ONLY public task','', 'normal','pending','normal','مضافة',null,[],'','TEST_ONLY owner',60,null,null,now-10000,null,now-60000,now+3600000,null,null,'TEST_ONLY work',null,null];
 await replaceOperationalFixture(B.env,scoped(),{[day]:[row]});
 await replaceOperationalFixture(B.env,scoped(D2),{[day]:[row.map((x,i)=>i===13?now-20000:x)]});
 const initial=ok(await B.api('employee1','/api/me/tasks?uid='+IDS.employee1));assert.equal(initial.me.linked,true);assert.deepEqual(initial.rows,[]);
 return {...B,day,row,protectedBefore:identitySnapshot(B.DB)};
}
async function assign(B,dept=D1,title='TEST_ONLY directed EDITED') {
 const read=ok(await B.api('super','/api/operations/read?'+new URLSearchParams({uid:IDS.super,keys:scoped(dept)}))),row=read.resources[scoped(dept)][B.day][0];
 const requestId='TEST_ONLY_private_tasks_'+ ++serial;
 const j=ok(await B.api('super','/api/tasks/settings',{method:'POST',body:{uid:IDS.super,dept,requestId,epoch:read.epoch,base:read.base[scoped(dept)],k:B.day,id:row[13],ekey:row[14],edit:{t:title,desc:'',prio:'normal',k:B.day,s:row[15],e:row[16],ekey:dept===D1?EKEYS.employee1:EKEYS.employee2,wt:''}}}));
 assert.equal(j.atomic,1);assert.equal(j.requestId,requestId);return j;
}
const changes=(B,since)=>B.api('employee1','/api/changes?'+new URLSearchParams({uid:IDS.employee1,since:String(since)}));
test('canonical zero-grant task settings assignment produces a private tasks hint without operational access or ME today invalidation',async()=>{
 const B=await setup(),since=cursor(B);await assign(B);
 const j=(await changes(B,since)).json;assert.deepEqual(j.keys,[]);assert.equal(j.tasksChanged,1);assert.equal(j.meChanged,undefined);
 assert.ok(Object.keys(j).every(k=>['v','keys','am','az','more','tasksChanged'].includes(k)));assert.equal(JSON.stringify(j).includes(EKEYS.employee1),false);assert.equal(JSON.stringify(j).includes(TASKS),false);
 const own=ok(await B.api('employee1','/api/me/tasks?uid='+IDS.employee1));assert.equal(own.rows.length,1);assert.equal(own.rows[0].t,'TEST_ONLY directed EDITED');
 const denied=ok(await B.api('employee1','/api/operations/read?'+new URLSearchParams({uid:IDS.employee1,keys:scoped()})));assert.deepEqual(denied.denied,[scoped()]);assert.deepEqual(denied.resources,{});assert.deepEqual(denied.base,{});
 assert.deepEqual(identitySnapshot(B.DB),B.protectedBefore);
});
const drain = async () => { for (let i = 0; i < 4; i++) await new Promise(resolve => setImmediate(resolve)); };
function clock(W) {
  let now = Date.now(), serial = 0;
  const tasks = new Map(), errors = [];
  W.Date = class extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
  const add = (fn, ms, interval, args) => { const id = ++serial; tasks.set(id, { id, at: now + Math.max(0, ms || 0), fn, interval, args }); return id; };
  W.setTimeout = (fn, ms, ...args) => add(fn, ms, 0, args);
  W.setInterval = (fn, ms, ...args) => add(fn, ms, ms, args);
  W.clearTimeout = W.clearInterval = id => tasks.delete(id);
  return {
    errors,
    clear: () => tasks.clear(),
    async advance(ms) {
      const end = now + ms;
      for (let steps = 0; ; steps++) {
        assert.ok(steps < 10000, 'Bounded existing timer execution');
        const task = [...tasks.values()].filter(task => task.at <= end).sort((a, b) => a.at - b.at || a.id - b.id)[0];
        if (!task) break;
        now = task.at; tasks.delete(task.id);
        if (task.interval) tasks.set(task.id, { ...task, at: now + task.interval });
        try { task.fn(...task.args); } catch (error) { errors.push(error); }
        await drain();
      }
      now = end; await drain(); assert.deepEqual(errors, []);
    },
  };
}
function emitted() {
  assert.ok(process.env.KIVO_DIST, 'Select the actual current build with KIVO_DIST');
  const dist = path.resolve(ROOT, process.env.KIVO_DIST), manifest = JSON.parse(fs.readFileSync(dist + '.build.json', 'utf8'));
  const retained = new Set(manifest.retainedFiles || []), used = {};
  function read(pattern) {
    const names = Object.keys(manifest.files).filter(name => pattern.test(name) && !retained.has(name));
    assert.equal(names.length, 1, String(pattern));
    const bytes = fs.readFileSync(path.join(dist, names[0])), entry = manifest.files[names[0]];
    assert.equal(bytes.length, entry.bytes); assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256);
    used[names[0]] = entry.sha256; return bytes.toString('utf8');
  }
  return { used, asset: name => read(new RegExp('^assets/js/' + name + '\\.[a-f0-9]{10}\\.js$')),
    profile: () => read(/^assets\/pages\/Profile\.logic\.[a-f0-9]{10}\.js$/) };
}

async function host(t,{holdFirst=false}={}){
 const B=await setup(),bundle=emitted(),requests=[],hints=[],control={user:{...B.users.find(u=>u.id===IDS.employee1)}},jar={cookie:'bs_tok=TEST_ONLY_session_employee1'};let release,held=false;
 const initial=ok(await B.api('employee1','/api/get?keys=bassam_auth_users_v1,bassam_depts_v1,bassam_perms_v1,bassam_gdepts_v1,bassam_platform_v1'));
 const T=loadClient({blocks:[],jar,boot:{srv:1,cf:1,uid:IDS.employee1,v:initial.v,keys:Object.fromEntries(Object.entries(initial.keys).filter(([,v])=>v.v!=null).map(([k,v])=>[k,v.v])),revs:Object.fromEntries(Object.entries(initial.keys).map(([k,v])=>[k,v.rev]))},C:{req:async(route,o={})=>{
  const url=new URL(route,'http://x');assert.equal(url.origin,'http://x');assert.doesNotMatch(url.pathname,/\/api\/img|r2/i);
  const response=await B.W.default.fetch(new Request(url,{method:o.method||'GET',headers:{Cookie:o.cookie}}),B.env);requests.push({path:url.pathname,status:response.status});
  if(url.pathname==='/api/me/tasks'&&holdFirst&&!held){held=true;await new Promise(r=>release=r);}return response;
 }}});
 const W=T.W,K=W.KIVO,time=clock(W);W.document.hidden=false;W.URLSearchParams=URLSearchParams;W.AbortController=AbortController;
 K.BassamAuth={user:()=>control.user,isSuper:()=>false,isMgrKey:k=>String(k||'').startsWith('mgr:')};
 K.BassamDepts={active:()=>control.user.deptId,list:()=>B.keys.bassam_depts_v1,ancestorsOf:()=>[]};K.BassamPerm={on:()=>true,can:()=>false};
 W.DCLogic=class{setState(p){this.state={...this.state,...(typeof p==='function'?p(this.state):p)};}};
 for(const name of ['280-server-storage','545-task-self','565-page-kit'])vm.runInContext(bundle.asset(name),T.ctx,{filename:'emitted-'+name});
 vm.runInContext(bundle.profile(),T.ctx,{filename:'emitted-Profile.logic'});const factory=K.__dcLogicDefs?.Profile||W.__dcLogicDefs?.Profile,Component=factory(W.DCLogic,W.DCLogic,{}),page=new Component();
 W.addEventListener('bassam:tasks',e=>hints.push(copy(e.detail)));
 const service=K.BassamMyTasks;const load=service.load();await drain();if(!holdFirst)await load;
 t.after(()=>{release?.();time.clear();T.dispose();});
 const titles=()=>Object.values(page._tkAll()).flatMap(rows=>rows.filter(Boolean).map(row=>row[0]));
 return {B,T,W,K,time,control,service,page,requests,hints,titles,release:()=>release?.(),taskGets:()=>requests.filter(r=>r.path==='/api/me/tasks'),used:bundle.used};
}
test('actual emitted 280 545 and Profile refresh an assignment before fallback without notification or ME today refetch',async t=>{
 const f=await host(t);assert.deepEqual(copy(f.titles()),[]);await assign(f.B);await f.time.advance(2000);
 assert.deepEqual(copy(f.titles()),['TEST_ONLY directed EDITED']);assert.equal(f.taskGets().length,2);assert.equal(f.hints.length,1);
 assert.equal(f.requests.some(r=>r.path==='/api/me/today'||r.path==='/api/notifications'),false);assert.deepEqual(f.T.nativeLS(),{});
 await f.time.advance(15000);assert.equal(f.taskGets().length,2);
});

test('canonical foreign task settings do not emit a private own-department hint or expose keys',async()=>{
 const B=await setup(),since=cursor(B);await assign(B,D2);const j=(await changes(B,since)).json;
 assert.deepEqual(j.keys,[]);assert.equal(j.tasksChanged,undefined);assert.equal(j.meChanged,undefined);
 assert.equal(JSON.stringify(j).includes(D2),false);assert.deepEqual(ok(await B.api('employee1','/api/me/tasks?uid='+IDS.employee1)).rows,[]);assert.deepEqual(identitySnapshot(B.DB),B.protectedBefore);
});
test('canonical private task hint is candidate-only with exact role key ceiling namespace and cursor fences',async()=>{
 const W=await candidateWorker(['meTasksChanged','meTkCandidate','actorOf','K_USERS']);const B=await setup();
 const A=await W.actorOf(B.env,IDS.employee1),row={k:scoped(),rev:12};assert.equal(W.meTasksChanged(A,[row],12),true);
 for(const k of [scoped(D2),scoped()+':child','bassam_tasks_v1','bassam_notifications_domain_v1','bsdept:'+D1+':bassam_staffing_v3'])assert.equal(W.meTasksChanged(A,[{k,rev:12}],12),false,k);
 assert.equal(W.meTasksChanged(A,[row],11),false);
 assert.equal(W.meTkCandidate({...A.u,mgr:1}),true);
 for(const u of [{...A.u,role:'super'},{...A.u,role:'gm'},{...A.u,ekey:'mgr:'+D1},{...A.u,ekey:'gm:'+D1},{...A.u,ekey:''},{...A.u,deptId:''}])assert.equal(W.meTkCandidate(u),false);
 const users=copy(B.users);users.find(u=>u.id===IDS.employee1).ekey='TEST_ONLY_no_employee_mapping';
 await B.DB.batch(B.W.kvPutStmts(B.env,'kv','bassam_auth_users_v1',JSON.stringify(users)));
 const unmapped=await W.actorOf(B.env,IDS.employee1);assert.equal(W.meTasksChanged(unmapped,[row],12),true,'Coarse hint does not pretend to validate identity mapping');
 const privateRows=ok(await B.api('employee1','/api/me/tasks?uid='+IDS.employee1));assert.equal(privateRows.me.linked,false);assert.deepEqual(privateRows.rows,[]);
 const disabled=copy(B.keys.bassam_perms_v1);for(const k of Object.keys(disabled.caps))disabled.caps[k]=disabled.caps[k].filter(name=>name!=='tasks');
 await B.DB.batch(B.W.kvPutStmts(B.env,'kv','bassam_perms_v1',JSON.stringify(disabled)));
 assert.equal(W.meTasksChanged(await W.actorOf(B.env,IDS.employee1),[row],12),false,'Off module does not reveal task activity');
});
test('actual emitted private task loader coalesces dirty in-flight hints and discards an obsolete first response',async t=>{
 const f=await host(t,{holdFirst:true});await assign(f.B);await f.time.advance(1800);assert.equal(f.taskGets().length,1);assert.equal(f.service.state().rows,null);
 f.release();await drain();assert.equal(f.service.state().rows,null,'Pre-hint snapshot is not promoted');await f.time.advance(1100);
 assert.deepEqual(copy(f.titles()),['TEST_ONLY directed EDITED']);assert.equal(f.taskGets().length,2);
 const detail={uid:IDS.employee1,dept:D1,ekey:EKEYS.employee1,v:cursor(f.B)};
 for(let i=0;i<6;i++)f.W.dispatchEvent(new f.W.CustomEvent('bassam:tasks',{detail}));await f.time.advance(1100);assert.equal(f.taskGets().length,3,'Burst uses one trailing GET');
 await f.time.advance(15000);assert.equal(f.taskGets().length,3);
});
test('actual emitted private task loader fences local identity changes reset generations and unrelated hints',async t=>{
 for(const field of ['id','deptId','ekey','role']){
  const f=await host(t,{holdFirst:true});f.control.user={...f.control.user,[field]:field==='deptId'?D2:field==='role'?'gm':'TEST_ONLY other'};f.release();await drain();assert.equal(f.service.state().rows,null,field);
 }
 const f=await host(t,{holdFirst:true});f.service.reset();await assign(f.B);await f.service.load();assert.deepEqual(copy(f.titles()),['TEST_ONLY directed EDITED']);f.release();await drain();assert.deepEqual(copy(f.titles()),['TEST_ONLY directed EDITED'],'Reset prevents old response from replacing new state');
 await f.time.advance(2500); // Drain the legitimate assignment poll before counting unrelated synthetic hints.
 const before=f.taskGets().length,detail={uid:IDS.employee1,dept:D1,ekey:EKEYS.employee1,v:cursor(f.B)};
 for(const key of ['uid','dept','ekey'])f.W.dispatchEvent(new f.W.CustomEvent('bassam:tasks',{detail:{...detail,[key]:'TEST_ONLY foreign'}}));
 f.W.dispatchEvent(new f.W.CustomEvent('bassam:me',{detail}));await f.time.advance(12000);assert.equal(f.taskGets().length,before);
 f.service.reset();f.W.dispatchEvent(new f.W.CustomEvent('bassam:tasks',{detail}));await f.time.advance(1500);assert.equal(f.taskGets().length,before,'A hint alone does not open a never-loaded private view');
});
test('actual emitted private task uid query rejects a switched cookie before applying rows and same responses',async t=>{
 const f=await host(t);f.T.jar.cookie='bs_tok=TEST_ONLY_session_employee2';await f.service.load();
 assert.equal(f.taskGets().at(-1).status,409);assert.equal(f.service.state().err,'session');assert.equal(f.service.state().rows,null);
 const before=f.taskGets().length;await f.service.load();assert.equal(f.taskGets().length,before,'Known session mismatch blocks further private reads');
 await f.time.advance(2000);assert.equal(f.K.__BS_SRV.sesChanged(),true);assert.equal(f.service.state().rows,null);
});
