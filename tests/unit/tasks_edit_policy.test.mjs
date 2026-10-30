/* Current canonical raw-save policy is the control for the atomic editor.
   Synthetic SQLite only; the control is a dry plan and never a policy clone. */
import test from'node:test';import assert from'node:assert/strict';
import{world,WCUR,ME,MATE,KT,DAY,stored,row,replaceOperationalFixture,putKV,IMG_ME}from'./tasks_fx.mjs';
import{candidateWorker}from'./irshad_domain_fx.mjs';
const copy=x=>JSON.parse(JSON.stringify(x));
const snapshot=B=>JSON.stringify(Object.fromEntries(B.env.DB.q("SELECT name FROM sqlite_master WHERE type='table'AND name NOT LIKE 'sqlite_%'ORDER BY name").map(({name})=>[name,B.env.DB.q('SELECT * FROM "'+name+'"').map(JSON.stringify).sort()])));
const variants=[
 {name:'unassigned pending orphan ACK',allow:true,ekey:null,state:'pending',ack:true},
 {name:'unassigned started orphan without proof',allow:true,ekey:null,state:'in_progress',ack:true,started:true},
 {name:'assigned active employee remains protected',allow:false,ekey:ME.eid,state:'in_progress',ack:true,started:true,why:'task-asg'},
 {name:'unassigned historical proof never transfers',allow:false,ekey:null,state:'in_progress',ack:true,started:true,proof:true,why:'task-asg'},
 {name:'a newly assigned employee must still have an active account',allow:false,ekey:null,state:'pending',inactive:true,why:'task-acct'}
];
for(const mode of ['legacy','enforce'])for(const[vi,variant]of variants.entries())test('['+mode+'] Atomic task edit matches canonical raw policy: '+variant.name,async()=>{
 const B=await world({worker:WCUR,mode}),W=await candidateWorker(['applySave','RESTORE_INTERNAL_TOKEN','rsReferenceSnapshot']);
 try{
  const dm=await B.login('0000000101','70101'),now=Date.now(),id=1760000885000+vi,original=row({id,title:'TEST_ONLY edit control',eid:variant.ekey,name:variant.ekey?ME.name:'',s:now-60000,e:now+3600000,st:variant.state,
    acc:variant.started?now-30000:null,r20:variant.ack?{ack:now-30000}:null,r21:variant.proof?{imgs:[IMG_ME],note:'TEST_ONLY historical proof',at:now-20000}:null});
  const value=stored(B.env,KT);value[DAY].push(original);await replaceOperationalFixture(B.env,KT,value);
  if(variant.inactive){const users=stored(B.env,'bassam_auth_users_v1');users.find(u=>u.id===MATE.uid).dis=1;putKV(B.env,'bassam_auth_users_v1',users);}
  const current=(await B.C.api('/api/operations/read?keys='+encodeURIComponent(KT),{cookie:dm.ck})).j,
    next=copy(current.resources[KT]),wanted=next[DAY].find(r=>r[13]===id);
  wanted[0]='TEST_ONLY edited';wanted[14]=MATE.eid;wanted[7]=[MATE.name[0]];wanted[8]=MATE.name;wanted[17]=null;wanted[18]=null;wanted[19]=null;
  // The old editor's orphan reset: never remove historical proof or history.
  if(!variant.ekey){wanted[3]='pending';wanted[6]=null;wanted[11]=null;wanted[12]=null;wanted[20]=null;}
  const ref=await W.rsReferenceSnapshot(B.env,'tst_dm1'),rawActor={...ref.A};delete rawActor.__tkSrv;delete rawActor.__tkSelf;
  const before=snapshot(B),plan=await W.applySave(ref.env,{set:{[KT]:JSON.stringify(next)},base:{[KT]:current.base[KT]},why:{[KT]:'TEST_ONLY canonical editor control'}},rawActor,{}, {quiet:true,__restorePlan:W.RESTORE_INTERNAL_TOKEN});
  assert.equal(snapshot(B),before,'Raw policy control is a non-writing canonical plan');
  const denied=(plan.denied||plan.out?.denied)?.[KT]?.why;
  assert.equal(!!plan.ok,variant.allow,'Actual raw policy control: '+JSON.stringify({ok:plan.ok,denied}));if(variant.why)assert.equal(denied,variant.why);
  const body={uid:'tst_dm1',dept:'tst_d1',requestId:'TEST_ONLY_editor_policy_'+mode+'_'+vi,epoch:current.epoch,base:current.base[KT],k:DAY,id,ekey:variant.ekey,
    edit:{k:DAY,t:wanted[0],desc:original[1]||'',prio:original[2],s:original[15],e:original[16],ekey:MATE.eid,wt:null}},result=await B.C.api('/api/tasks/settings',{method:'POST',cookie:dm.ck,body});
  if(variant.allow){assert.equal(result.status,200,JSON.stringify(result.j));const actual=stored(B.env,KT)[DAY].find(r=>r[13]===id);assert.equal(actual[14],MATE.eid);assert.equal(actual[3],'pending');for(const index of[6,11,12,20])assert.equal(actual[index],null);assert.deepEqual(actual[21],original[21]);}
  else{assert.ok(result.status===403||result.status===409,'Canonical denial must reach the command: '+JSON.stringify(result.j));assert.deepEqual(stored(B.env,KT),current.resources[KT]);}
 }finally{B.env.DB.db.close();}
});
