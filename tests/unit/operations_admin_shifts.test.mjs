import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { loadClient, until } from './k264_vm.mjs';

const UID='TEST_ONLY shift manager', DEPT='TEST_ONLY_shifts';
const key=name=>'bsdept:'+DEPT+':'+name;
const clone=value=>JSON.parse(JSON.stringify(value));
const response=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
async function page(save, read) {
  const docs={bassam_shift_options_v1:[{name:'TEST_ONLY old',color:'#abcdef',tStart:'08:00',tEnd:'16:00'}],bassam_staffing_locks_v1:{},bassam_staffing_v3:{'1448-5':{e1:{shift:'TEST_ONLY old',cs:'TEST_ONLY cs'}},'1448-6':{e2:{shift:'TEST_ONLY old'}}}},requests=[],messages=[],scope={uid:UID,dept:DEPT};
  let rev=1;
  const T=loadClient({C:{req:async(route,options={})=>{
    if(route.startsWith('/api/operations/read?')) {
      const keys=new URL(route,'http://x').searchParams.get('keys').split(','),resources={},absent=[],base={};
      const custom=read&&await read(keys);if(custom)return custom;
      for(const k of keys){const name=k.split(':').at(-1);base[k]=rev;if(Object.hasOwn(docs,name))resources[k]=clone(docs[name]);else absent.push(k);}
      return response({ok:1,uid:UID,epoch:2,v:rev,resources,absent,denied:[],base});
    }
    if(route==='/api/save') {
      const body=JSON.parse(options.body);requests.push(options.body);
      for(const[k,value]of Object.entries(body.set))docs[k.split(':').at(-1)]=JSON.parse(value);
      const ack={ok:1,atomic:1,requestId:body.requestId,epoch:body.epoch,revs:Object.fromEntries([...Object.keys(body.set),...body.del].map(k=>[k,++rev]))};
      return save?save({body,ack,requests,docs}):response(ack);
    }
    return response({v:rev,keys:[]});
  }},boot:{srv:1,cf:1,uid:UID,v:1,keys:{},revs:{}}});
  T.W.document.hidden=true;const K=T.W.KIVO;
  K.BassamAuth={user:()=>({id:scope.uid,role:'dept',deptId:scope.dept})};
  K.__BS_I={auth:{cur:()=>K.BassamAuth.user()}};K.BassamDepts={active:()=>scope.dept};K.BassamCount=String;
  K.BassamPerm={on:()=>true};
  K.BassamPageKit={base:()=>class{setState(patch,done){this.state={...this.state,...(typeof patch==='function'?patch(this.state,{}):patch)};done?.();}}};T.W.DCLogic=class{};
  vm.runInContext(fs.readFileSync(new URL('../../src/modules/admin/logic.js',import.meta.url),'utf8')+'\nglobalThis.TEST_ONLY_Page=Component;',T.ctx);
  const instance=Object.create(T.W.TEST_ONLY_Page.prototype);instance.state={};instance.PC=()=>true;instance.bsOn=()=>true;
  instance.bsToast=(text,type)=>messages.push({text,type});instance.bsAck=(text,type)=>messages.push({text,type});
  const ops=K.__BS_SRV.operations;assert.equal((await ops.read(ops.resources.map(key))).ok,1);
  return{T,K,ops,instance,docs,requests,messages,scope,bump:()=>rev++};
}
test('Admin shift rename waits for one ACK for catalog and open staffing, retaining locked history',async()=>{
  let release;const gate=new Promise(resolve=>release=resolve);
  const f=await page(async({ack})=>{await gate;return response(ack);});
  try{
    f.docs.bassam_staffing_locks_v1={'1448-6':1};f.bump();await f.ops.read([key('bassam_staffing_locks_v1')]);
    f.instance.sfVals().sfRows[0].renOpen();f.instance.setState({shRen:{of:'TEST_ONLY old',v:'TEST_ONLY new'}});
    const pending=f.instance.sfRename('TEST_ONLY old','TEST_ONLY new');
    await until(()=>f.requests.length===1,250);
    assert.ok(f.instance.state.shRen);assert.equal(f.messages.length,0);
    assert.equal(f.ops.get('bassam_shift_options_v1')[0].name,'TEST_ONLY old');
    release();assert.equal(await pending,true);assert.equal(f.instance.state.shRen,null);
    const body=JSON.parse(f.requests[0]);assert.deepEqual(Object.keys(body.set).sort(),['bassam_shift_options_v1','bassam_staffing_v3'].map(key).sort());
    assert.ok(Object.hasOwn(body.base,key('bassam_staffing_locks_v1')));
    assert.equal(f.ops.get('bassam_staffing_v3')['1448-5'].e1.shift,'TEST_ONLY new');
    assert.equal(f.ops.get('bassam_staffing_v3')['1448-6'].e2.shift,'TEST_ONLY old');
    assert.deepEqual(f.T.nativeLS(),{});
  }finally{release();f.T.dispose();}
});
test('Admin lost rename ACK retains the draft and retries the identical body after the server already renamed it',async()=>{
  const f=await page(({ack,requests})=>{if(requests.length===1)throw Error('TEST_ONLY lost ACK');return response(ack);});
  try{
    f.instance.sfVals().sfRows[0].renOpen();f.instance.setState({shRen:{of:'TEST_ONLY old',v:'TEST_ONLY new'}});
    assert.equal(await f.instance.sfRename('TEST_ONLY old','TEST_ONLY new'),false);assert.ok(f.instance.state.shRen);
    assert.equal(await f.instance.sfRename('TEST_ONLY old','TEST_ONLY new'),true);
    assert.equal(f.requests.length,2);assert.equal(f.requests[0],f.requests[1]);assert.equal(f.instance.state.shRen,null);
  }finally{f.T.dispose();}
});
test('An open Admin shift editor refuses a newer catalog revision or another active department',async()=>{
  const f=await page();
  try{
    f.instance.sfVals().sfRows[0].renOpen();f.instance.setState({shRen:{of:'TEST_ONLY old',v:'TEST_ONLY new'}});
    f.docs.bassam_shift_options_v1[0].color='#112233';f.bump();await f.ops.read([key('bassam_shift_options_v1')]);
    assert.equal(await f.instance.sfRename('TEST_ONLY old','TEST_ONLY new'),false);assert.equal(f.requests.length,0);assert.ok(f.instance.state.shRen);
    f.scope.dept='TEST_ONLY other';assert.equal(await f.instance.sfRename('TEST_ONLY old','TEST_ONLY new'),false);assert.equal(f.requests.length,0);
  }finally{f.T.dispose();}
});
test('Admin deletion carries the lock read revision and refuses a month locked after confirmation opened',async()=>{
  const f=await page();
  try{
    f.instance.sfAskDel('TEST_ONLY old');assert.ok(f.instance.state.shDel);
    f.docs.bassam_staffing_locks_v1={'1448-5':1};f.bump();await f.ops.read([key('bassam_staffing_locks_v1')]);
    assert.equal(await f.instance.sfDelDo(),false);assert.equal(f.requests.length,0);assert.ok(f.instance.state.shDel);
    assert.equal(f.ops.get('bassam_shift_options_v1')[0].name,'TEST_ONLY old');
  }finally{f.T.dispose();}
});
test('Admin add and inline edits retain their exact intent after a lost ACK and do not close or overwrite another intent',async()=>{
  const f=await page(({ack,requests})=>{if(requests.length===1)throw Error('TEST_ONLY lost ACK');return response(ack);});
  try{
    f.instance.sfVals().onSfName({target:{value:'TEST_ONLY new'}});
    assert.equal(await f.instance.sfAdd(),false);assert.equal(f.instance.state.shNew.name,'TEST_ONLY new');
    const first=f.requests[0];assert.equal(await f.instance.sfSet('TEST_ONLY old',{color:'#112233'}),false);assert.equal(f.requests.length,1);
    assert.equal(f.instance.state.shPatch??null,null,'A rejected different intent must not paint a new unconfirmed inline value over the original draft');
    assert.equal(await f.instance.sfAdd(),true);assert.equal(f.requests[1],first);assert.equal(f.instance.state.shNew.name,'');
    assert.equal(f.ops.get('bassam_shift_options_v1').length,2);
  }finally{f.T.dispose();}
});
test('An old inline control cannot overwrite a newer server value in the same shift',async()=>{
  const f=await page();
  try{
    const control=f.instance.sfVals().sfRows[0].onColor;
    f.docs.bassam_shift_options_v1[0].tStart='07:00';f.bump();await f.ops.read([key('bassam_shift_options_v1')]);
    assert.equal(await control({target:{value:'#112233'}}),false);assert.equal(f.requests.length,0);
    assert.equal(f.ops.get('bassam_shift_options_v1')[0].tStart,'07:00');assert.equal(f.instance.state.shPatch.value.color,'#112233');
  }finally{f.T.dispose();}
});
test('Foreign department scope data is explicitly loaded before a verified empty plan is available',async()=>{
  const f=await page();
  try{
    const foreign='TEST_ONLY_foreign';f.instance.t24On=()=>true;f.K.BassamAuth.isSuper=()=>true;
    const before=f.instance.scopeVals(foreign,false,'scope');
    assert.equal(before.scReadPending,true);assert.equal(before.scNoPlan,false);assert.equal(before.scDirty,false);
    assert.throws(()=>f.instance.scPlan(foreign),/operations-read-required/);
    assert.equal(await f.instance.scLoadReferences(foreign,true),true);
    assert.deepEqual(clone(f.instance.scPlan(foreign)),[]);
    f.scope.uid='TEST_ONLY_other';assert.equal(await f.instance.scLoadReferences(foreign,true),false);
  }finally{f.T.dispose();}
});
test('A rejected foreign department read stays unavailable and never presents an empty or editable scope',async()=>{
  const f=await page(null,keys=>keys.some(k=>k.includes(':TEST_ONLY_forbidden:'))?new Response(JSON.stringify({ok:0,err:'forbidden'}),{status:403,headers:{'Content-Type':'application/json'}}):null);
  try{
    f.instance.t24On=()=>true;f.K.BassamAuth.isSuper=()=>true;
    assert.equal(await f.instance.scLoadReferences('TEST_ONLY_forbidden',true),false);
    const view=f.instance.scopeVals('TEST_ONLY_forbidden',false,'scope');
    assert.equal(view.scReadPending,true);assert.equal(view.scNoPlan,false);assert.equal(view.scDirty,false);assert.match(view.scDirtyTxt,/تعذّر/);
    assert.throws(()=>f.instance.scPlan('TEST_ONLY_forbidden'),/operations-read-required/);assert.equal(f.requests.length,0);
  }finally{f.T.dispose();}
});
