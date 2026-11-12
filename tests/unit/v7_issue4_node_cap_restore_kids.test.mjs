/* RISHAD V7 issue #4 — a removal that the node rules did not check must not open a unit (second independent review of 31f3e5e).
   A save flagged as a restore skips nodeRemoveWhy (018 nodeShapeWhy), so it can remove a node that still has a unit under it. The
   sweep then dropped the node's ceiling record, and the unit — which has no record of its own and still points at the node —
   became open (021 effCapOf: absence = open). On e34fa23 the record stayed and the unit stayed restricted.
   Rule: the record of a removed node is dropped only when nothing in the graph this save leaves still points at it.
   Real worker, legacy and enforce; the outcome is a real authorization decision for the unit's manager, and the stored bytes. */
import { test } from 'node:test'; import assert from 'node:assert/strict';
import { world, stored, putKV, D as U2 } from './tasks_fx.mjs';
const KG='bassam_gdepts_v1',KD='bassam_depts_v1',KP='bassam_perms_v1',X='TEST_ONLY_X',EK='tst_e_emp1';
const NARROW=['emps','help'],DM=['0000000101','70101'];
const J=(x)=>JSON.parse(JSON.stringify(x));
const raw=(env,k)=>env.DB.q('SELECT v FROM kv WHERE k = ? ORDER BY seq',k).map(r=>r.v).join('');
const rev=(env,k)=>(env.DB.q('SELECT rev FROM revs WHERE k = ?',k)[0]||{}).rev||0;
const nodeX={id:X,name:'TEST_ONLY X',kind:'إدارة عامة'};
async function scene(mode,leftover=true){const W=await world({mode}),P=stored(W.env,KP);delete P.caps[U2];delete P.lenses[U2];
 if(leftover){P.caps[X]=NARROW.slice();P.subs={[X]:{emps:['data']}};P.lenses[X]=['zones'];P.capOwn={[X]:true};}
 putKV(W.env,KP,P);return Object.assign(W,{P0:J(P),dm:await W.login(DM[0],DM[1])});}
const gX=(W)=>JSON.stringify(stored(W.env,KG).concat([nodeX]));
const dX=(W)=>JSON.stringify(stored(W.env,KD).map(d=>d.id===U2?{...d,gid:X}:d));
async function save(W,ck,set,act){const ks=Object.keys(set);const body={set,del:[],base:Object.fromEntries(ks.map(k=>[k,rev(W.env,k)])),why:Object.fromEntries(ks.map(k=>[k,'TEST_ONLY r']))};
 if(act)body.aud=ks.filter(k=>k!==KP||act==='restore').map((k,i)=>({cid:'cTESTONLYp'+i+Math.random().toString(36).slice(2,8),k,etype:'dataset',eid:k,ename:k,act,ctx:'',bef:'',aft:''}));
 const r=await W.C.api('/api/save',{method:'POST',cookie:ck,body});return r;}
async function grant(W,leaf){const g=await W.C.api('/api/get?keys='+KP,{cookie:W.dm.ck}),p=JSON.parse(g.j.keys[KP].v);p.emps[U2][EK][leaf]=['view'];
 const body={set:{[KP]:JSON.stringify(p)},del:[],base:{[KP]:g.j.keys[KP].rev||0}};if(g.j.pscope!==undefined)body.pscope=g.j.pscope;
 const s=await W.C.api('/api/save',{method:'POST',cookie:W.dm.ck,body});return (s.j.revs&&s.j.revs[KP])?'OPEN(accepted)':'restricted('+(((s.j.denied||{})[KP]||{}).why||JSON.stringify(s.j).slice(0,120))+')';}
const has=(W)=>['caps','subs','lenses','capOwn'].filter(f=>{const P=stored(W.env,KP);return P[f]&&Object.prototype.hasOwnProperty.call(P[f],X);}).join(',')||'-';
const den=(r)=>r.status+' denied='+JSON.stringify(r.j.denied||{}).slice(0,160)+' conf='+Object.keys(r.j.conflicts||{});
for (const mode of ['legacy', 'enforce']) {
  test('V7 #4 · ' + mode + ': a restore-flagged save that removes a node with a unit still under it keeps the node\'s ceiling — the unit stays restricted', async () => {
    const W = await scene(mode);
    let r = await save(W, W.su.ck, { [KG]: gX(W), [KD]: dX(W), [KP]: raw(W.env, KP) }, 'import');
    assert.equal(stored(W.env, KD).find((d) => d.id === U2).gid, X, 'setup: the unit sits under X');
    assert.match(await grant(W, 'seized/records'), /^restricted/, 'setup: restricted by X\'s ceiling');
    const g = JSON.stringify(stored(W.env, KG).filter((n) => n.id !== X));
    r = await save(W, W.su.ck, { [KG]: g }, 'restore');
    assert.equal(stored(W.env, KD).find((d) => d.id === U2).gid, X, 'the unit still points at the removed node');
    assert.equal(has(W), 'caps,subs,lenses,capOwn', 'the ceiling record of the removed node is kept: ' + den(r));
    assert.match(await grant(W, 'seized/records'), /^restricted/, 'the unit is NOT open');
  });
  test('V7 #4 · ' + mode + ': the same with the registry carried in the save — stored as sent, not stripped', async () => {
    const W = await scene(mode);
    await save(W, W.su.ck, { [KG]: gX(W), [KD]: dX(W), [KP]: raw(W.env, KP) }, 'import');
    const g = JSON.stringify(stored(W.env, KG).filter((n) => n.id !== X)), sent = raw(W.env, KP);
    await save(W, W.su.ck, { [KG]: g, [KP]: sent }, 'restore');
    assert.equal(has(W), 'caps,subs,lenses,capOwn'); assert.equal(raw(W.env, KP), sent, 'verbatim');
    assert.match(await grant(W, 'seized/records'), /^restricted/);
  });
}
