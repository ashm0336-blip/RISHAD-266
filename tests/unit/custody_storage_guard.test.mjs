/* CU is an acknowledged relational domain, never a device/KV document. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FakeStorage,loadClient,until} from './k264_vm.mjs';

const CU='bassam_custody_v1';
const keys=[CU,'bsdept:dA:'+CU,'bsdept:dB:'+CU,'bsdept:undefined:'+CU,
  'bsdept::'+CU,'bsdept:bad scope:'+CU,'bsdept:dA:extra:'+CU];
const json=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
const bootstrap=(withRegistry=true)=>({srv:1,cf:1,uid:'TEST_ONLY_owner',v:1,
  keys:{...(withRegistry?{bassam_depts_v1:JSON.stringify([{id:'dA',name:'TEST_ONLY A'},{id:'dB',name:'TEST_ONLY B'}])}:{}),
    ...Object.fromEntries(keys.map(key=>[key,'TEST_ONLY stale custody bootstrap']))},
  revs:Object.fromEntries(keys.map(key=>[key,77]))});
const noNetwork={req:async()=>{throw Error('No network expected for retired storage');}};
const visibleKeys=T=>Array.from({length:T.W.localStorage.length},(_,i)=>T.W.localStorage.key(i));

for(const blocks of [['280-server-storage.js'],['280-server-storage.js','310-image-refs.js','320-dept-storage.js']]){
  test('retired CU rejects scoped/unscoped/malformed access before memory, native storage or queue: '+blocks.length+' blocks',async()=>{
    const native=new FakeStorage();for(const key of keys)native.setItem(key,'TEST_ONLY quarantined custody bytes');
    const original=Object.fromEntries(native._m),T=loadClient({C:noNetwork,boot:bootstrap(),native,blocks});
    T.W.document.hidden=true;
    try{
      for(const key of keys){
        assert.equal(T.get(key),null,'Old boot/device custody is unreadable: '+key);
        assert.throws(()=>T.set(key,'TEST_ONLY forbidden write'),/^(?:Error: )?(?:relational-domain-api-required|department-scope-required)$/);
        assert.throws(()=>T.W.localStorage.removeItem(key),/^(?:Error: )?(?:relational-domain-api-required|department-scope-required)$/);
        assert.equal(T.W.KIVO.__BS_SRV.rev(key),0,'No stale bootstrap revision survives: '+key);
        if(T.W.KIVO.__BS_RAWLS){
          assert.equal(T.W.KIVO.__BS_RAWLS.getItem.call(T.W.localStorage,key),null,'Raw departmental adapter cannot revive CU');
          assert.throws(()=>T.W.KIVO.__BS_RAWLS.setItem.call(T.W.localStorage,key,'TEST_ONLY forbidden raw write'),/relational-domain-api-required|department-scope-required/);
        }
      }
      assert.ok(visibleKeys(T).every(key=>!String(key).includes(CU)),'Retired or malformed CU is not enumerated as a KV resource');
      assert.equal(T.W.KIVO.__BS_SRV.dirty(),false);assert.equal(await T.W.KIVO.__BS_SRV.flushAsync(1000),true);
      assert.equal(T.saves().length,0,'No /api/save is emitted');
      assert.deepEqual(T.nativeLS(),{...original,...(blocks.length>1?{bassam_active_dept_v1:'dA'}:{})},'Quarantined bytes are preserved and never consumed or replaced');
      if(T.W.KIVO.__BS_RES_EMPTY){
        assert.equal(Object.hasOwn(T.W.KIVO.__BS_RES_EMPTY,CU),false,'Generic wipe cannot recreate a legacy CU JSON document');
        assert.equal(T.W.KIVO.__BS_RES_EMPTY.bassam_employees_v1,'[]','Other resource policy remains intact');
      }
    }finally{T.dispose();}
  });
}

test('clearing a bootstrap containing only retired/malformed CU cannot enqueue a legacy deletion',async()=>{
  const T=loadClient({C:noNetwork,boot:bootstrap(false)});T.W.document.hidden=true;
  try{
    T.W.localStorage.clear();assert.equal(T.W.KIVO.__BS_SRV.dirty(),false);
    assert.equal(await T.W.KIVO.__BS_SRV.flushAsync(1000),true);assert.equal(T.saves().length,0);
  }finally{T.dispose();}
});

test('polling stale CU keys advances the change cursor without fetching or installing their JSON/revisions',async()=>{
  const C={req:async route=>{
    if(route.startsWith('/api/changes'))return json({v:2,keys});
    if(route.startsWith('/api/get'))return json({keys:Object.fromEntries(keys.map(key=>[key,{v:'TEST_ONLY stale remote CU',rev:88}]))});
    throw Error('Unexpected request: '+route);
  }};
  const incoming=bootstrap(false);incoming.keys={};incoming.revs={};
  const T=loadClient({C,boot:incoming});
  try{
    assert.equal(await until(()=>T.W.__BS_BOOT.v===2,4500),true,'One real poll completes');T.W.document.hidden=true;
    assert.equal(T.urls.filter(row=>row.url.startsWith('/api/get')).length,0,'Retired/malformed domains are filtered before legacy GET');
    for(const key of keys){assert.equal(T.get(key),null);assert.equal(T.W.KIVO.__BS_SRV.rev(key),0);}
    assert.deepEqual(visibleKeys(T),[]);assert.deepEqual(T.nativeLS(),{});assert.equal(T.W.KIVO.__BS_SRV.dirty(),false);
  }finally{T.dispose();}
});
