/* Direct help links must reuse the existing platform dialog over a permitted page. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { parse } from 'acorn';
import { ROOT } from './harness.mjs';

const rootSource = fs.readFileSync(path.join(ROOT,'src/layouts/root-logic.js'),'utf8');
const platformSource = fs.readFileSync(path.join(ROOT,'src/layouts/260-bassam-plat.js'),'utf8');
const platformBody = parse(platformSource,{ecmaVersion:'latest'}).body.find(n=>n.type==='ExpressionStatement').expression.callee.body.body;
const about = platformBody.find(n=>n.type==='FunctionDeclaration' && n.id.name==='openAbout');
const aboutSource = platformSource.slice(about.start,about.end);

function world({hash='#/help',saved='tasks',help=true,signedIn=true,onlyHelp=false,superUser=false}={}) {
  const nodes=new Map(), listeners=new Map(), timers=[], frames=[];
  class Storage {
    constructor(){this.values=new Map();}
    getItem(k){return this.values.get(k) ?? null;}
    setItem(k,v){this.values.set(k,String(v));}
    removeItem(k){this.values.delete(k);}
  }
  const localStorage=new Storage(),sessionStorage=new Storage();
  if(saved)localStorage.setItem('bassam_page_v1:TEST_ONLY_department',saved);
  const location={hash,pathname:'/',search:''};
  const document={documentElement:{scrollHeight:800},activeElement:null,hidden:false,
    getElementById:id=>nodes.get(id) || null,querySelectorAll:()=>[],
    addEventListener(){},removeEventListener(){},contains:()=>true,
    body:{appendChild(el){nodes.set(el.id,el);},classList:{add(){},remove(){}}},
    createElement(){return {style:{},handlers:{},setAttribute(){},addEventListener(n,f){this.handlers[n]=f;},remove(){nodes.delete(this.id);}}},
  };
  const KIVO={
    BassamAuth:{user:()=>signedIn ? {id:'TEST_ONLY_user',role:superUser ? 'super' : 'staff'} : null,isSuper:()=>superUser},
    BassamDepts:{active:()=> 'TEST_ONLY_department'},
    BassamPerm:{NAV2PERM:{tasks:'tasks',employees:'emps',help:'help'},PERM2NAV:{tasks:'tasks',help:'help'},
      can:key=>key==='help' ? help : key==='tasks' && !onlyHelp,visiblePages:()=>onlyHelp ? ['help'] : ['tasks','help']},
  };
  const ctx={KIVO,document,location,localStorage,sessionStorage,console,URL,innerWidth:1200,innerHeight:800,scrollY:0,
    history:{replaceState(_s,_t,u){location.hash=new URL(u,'http://localhost').hash;},pushState(_s,_t,u){location.hash=new URL(u,'http://localhost').hash;}},
    addEventListener(n,f){listeners.set(n,f);},removeEventListener(n){listeners.delete(n);},
    setTimeout(fn,ms){timers.push({fn,ms});return timers.length;},clearTimeout(){},requestAnimationFrame(fn){frames.push(fn);},
    MutationObserver:class{observe(){}disconnect(){}},getComputedStyle:()=>({}),
    get:()=>({name:'TEST_ONLY platform',about:{guides:[]}}),esc:String,ver:()=> 'TEST_ONLY',
    DCLogic:class{constructor(){this.state={};}setState(p,cb){this.state={...this.state,...(typeof p==='function' ? p(this.state) : p)};cb?.();}},
  };
  ctx.window=ctx;
  vm.createContext(ctx);
  KIVO.BassamPlat={openAbout:vm.runInContext('('+aboutSource+')',ctx)};
  vm.runInContext(rootSource+'\n;globalThis.Root=Component;',ctx);
  const root=new ctx.Root();
  function settle(){for(let i=0;i<8;i++){const t=timers.splice(0).filter(x=>x.ms===0);const f=frames.splice(0);if(!t.length&&!f.length)break;t.forEach(x=>x.fn());f.forEach(x=>x());}}
  function mount(){root.componentDidMount();settle();}
  function navigate(hash){location.hash=hash;listeners.get('hashchange')?.();settle();}
  function close(){const ov=nodes.get('bs-plat-about');assert.ok(ov);ov.handlers.click({target:{id:'bsAboutX'}});}
  return {root,location,localStorage,nodes,mount,navigate,close};
}

test('direct help opens the actual platform dialog over the saved permitted page and closes cleanly',()=>{
  const W=world();assert.equal(W.root.state.active,'tasks');W.mount();
  assert.ok(W.nodes.has('bs-plat-about'));assert.equal(W.root.state.active,'tasks');assert.equal(W.location.hash,'#/tasks');
  W.close();assert.equal(W.nodes.has('bs-plat-about'),false);assert.equal(W.root.state.active,'tasks');
  const reload=world({hash:W.location.hash});reload.mount();assert.equal(reload.nodes.has('bs-plat-about'),false);
});

test('hash help navigation reopens the dialog without installing an unavailable page or bypassing page guards',()=>{
  const W=world({hash:'#/tasks'});W.mount();W.navigate('#/help');
  assert.ok(W.nodes.has('bs-plat-about'));assert.equal(W.root.state.active,'tasks');W.close();
  W.navigate('#/employees');assert.equal(W.root.state.active,'tasks');assert.equal(W.location.hash,'#/tasks');
  W.navigate('#/help');assert.ok(W.nodes.has('bs-plat-about'));assert.equal(W.root.state.active,'tasks');
});

test('denied help and an unauthenticated actor cannot open the dialog through the direct route',()=>{
  for(const options of [{help:false},{signedIn:false}]){
    const W=world(options);W.mount();W.navigate('#/help');
    assert.equal(W.nodes.has('bs-plat-about'),false);assert.notEqual(W.root.state.active,'help');assert.equal(W.location.hash,'#/tasks');
  }
});

test('a legacy saved help page is consumed once and an empty page ceiling falls back to profile',()=>{
  const legacy=world({hash:'#/unknown',saved:'help'});legacy.mount();
  assert.equal(legacy.root.state.active,'tasks');assert.ok(legacy.nodes.has('bs-plat-about'));
  assert.equal(legacy.localStorage.getItem('bassam_page_v1:TEST_ONLY_department'),null);
  const W=world({saved:'employees',onlyHelp:true});W.mount();
  assert.equal(W.root.state.active,'profile');assert.equal(W.location.hash,'#/profile');assert.ok(W.nodes.has('bs-plat-about'));
});

test('the platform administrator keeps the same help access as the existing sidebar dialog',()=>{
  const W=world({superUser:true,help:false});W.mount();
  assert.ok(W.nodes.has('bs-plat-about'));assert.equal(W.root.state.active,'tasks');assert.equal(W.location.hash,'#/tasks');
});
