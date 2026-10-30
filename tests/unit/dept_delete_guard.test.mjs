/* KIVO_265 · حادثةُ Test (2026-10-19): حُذفت إدارةٌ فيها مديرٌ و103 موظفين بضغطتين على أيقونة الحذف (تسليحٌ أربعَ ثوانٍ وتنبيهٌ عابر)،
   فذهبت حساباتُها وبياناتُها. القاعدة: إدارةٌ فيها مديرٌ أو موظفون أو حساباتُ دخول لا تُحذف إلا بنافذة تأكيدٍ تعرض ما سيُمحى
   وتُلزم بكتابة اسم الإدارة حرفاً (typed)؛ الفارغةُ تبقى على التسليح بضغطتين. يُثبت هنا: deptDel يسلك النافذةَ للإدارة غير الفارغة
   ولا يحذف إلا بعد الموافقة · الفارغةُ تُسلَّح أولاً · النافذةُ المشتركة تدعم typed ولا تقبل إلا بالمطابقة. */
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {parse} from 'acorn';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const L = rd('src/modules/admin/logic.js');
const klass=parse(L,{ecmaVersion:'latest'}).body.find(node=>node.type==='ClassDeclaration'&&node.id.name==='Component');
const DEPT={id:'d1',name:'إدارة تخطيط خدمات الحشود'};
async function bounded(promise,label,timeout=5000){
  let timer;
  try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('TEST_ONLY timeout: '+label)),timeout);})]);}
  finally{clearTimeout(timer);}
}
function harness(opts={}){
  const calls={confirm:[],toast:[],post:[],get:[],ack:[],sync:[],state:[]},counts=opts.populated?{keys:7,accounts:104,custody:3,notifications:4,irshad:2}:{keys:0,accounts:0,custody:0,notifications:0,irshad:0};
  let settle,started;const postStarted=new Promise(resolve=>{started=resolve;});
  const uid='TEST_ONLY_guard_super',KIVO={BassamAuth:{user:()=>({id:uid,role:'super'}),isSuper:()=>true},
    __BS_SRV:{resync:value=>calls.sync.push(value)},bsConfirm:async options=>{calls.confirm.push(options);return !!opts.answer;}};
  const base={epoch:1,kv:{bassam_depts_v1:1,bassam_auth_users_v1:1,bassam_perms_v1:1},custody:1,notifications:{rev:1,configRev:1,broadcastRev:1},irshad:{reports:1,languages:1,locations:1,retro:1}};
  if(opts.missingIR){delete base.irshad;delete counts.irshad;}
  const context={KIVO,__BS_BOOT:{srv:1,cf:1,uid},crypto:crypto.webcrypto,AbortController,URLSearchParams,Uint8Array,Date,setTimeout:()=>0,clearTimeout(){},
    localStorage:{getItem(){throw Error('No browser inventory');},setItem(){throw Error('No browser deletion');}},
    fetch:async(url,options)=>{
      if(options.method==='GET'){calls.get.push(url);return new Response(JSON.stringify({ok:1,kind:'delete',dept:DEPT.id,department:DEPT,base,counts}));}
      const body=JSON.parse(options.body);calls.post.push(body);started();
      return new Promise(resolve=>{settle=()=>resolve(new Response(JSON.stringify({ok:1,mode:'dept-delete',dept:DEPT.id,requestId:body.requestId,rev:2,revs:{bassam_depts_v1:2},counts})));});
    }};
  context.window=context;vm.createContext(context);
  const self={state:{admArm:opts.arm||null,sysSel:DEPT.id},setState(value){calls.state.push(value);Object.assign(this.state,value);},bsToast:message=>calls.toast.push(message),bsAck:(...args)=>calls.ack.push(args)};
  for(const name of ['_wpActor','_wpCall','deptDel','_deptDelGo']){
    const node=klass.body.body.find(node=>node.type==='MethodDefinition'&&node.key.name===name);assert.ok(node,name+' موجودة');
    self[name]=vm.runInContext('({'+L.slice(node.start,node.end)+'}).'+name,context);
  }
  return{run:target=>self.deptDel(target),calls,self,postStarted,ack(){assert.ok(settle,'A real POST is awaiting its receipt');settle();}};
}

test('إدارة فيها مدير و103 موظفين: تأكيد باسم الإدارة وجردها الخادمي — لا حذف قبل الموافقة',async()=>{
  // The closed route now inventories 104 department/staff accounts together;
  // neither manager counts nor employee lists are trusted from browser storage.
  const h=harness({populated:true,answer:false});await h.run({...DEPT,name:'TEST_ONLY stale cached name'});
  assert.equal(h.calls.confirm.length,1,'نافذة واحدة');const options=h.calls.confirm[0];
  assert.equal(options.typed,DEPT.name,'يُلزم باسم الإدارة الموثوق من الخادم');assert.equal(options.danger,true);
  assert.match(options.msg,/104 حساب إدارة\/موظف/,'حسابات هذه الإدارة: المدير و103 موظفين');
  assert.match(options.msg,/7 مورد بيانات/);assert.match(options.msg,/3 سجل عهدة/);assert.match(options.msg,/4 تنبيه/);assert.match(options.msg,/2 سجل استرشاد/);
  assert.match(options.msg,/نهائياً/);assert.match(options.msg,/حسابات مدير المنصة والإدارات العامة والإدارات الأخرى محفوظة/);
  assert.deepEqual(h.calls.post,[],'رفض النافذة لا يحذف');assert.deepEqual(h.calls.ack,[],'ولا يعرض نجاحاً');
  assert.equal(h.self.state.admArm,null,'ولا يُسلّح');assert.ok(h.calls.state.every(value=>!value.admArm));
});

test('الموافقة تنتظر ACK الحذف · والإدارة الفارغة تبقى على التسليح بضغطتين',async()=>{
  const h=harness({populated:true,answer:true}),pending=h.run(DEPT);await bounded(h.postStarted,'populated department POST');
  assert.equal(h.calls.post.length,1,'الموافقة ترسل طلباً واحداً');assert.equal(h.calls.ack.length,0,'لا نجاح قبل إقرار الخادم');assert.equal(h.self.state.sysSel,DEPT.id);
  await h.run(DEPT);assert.equal(h.calls.post.length,1,'ضغطتان أثناء الانتظار لا تكرران الحذف');h.ack();await bounded(pending,'populated department ACK');
  assert.equal(h.calls.ack.length,1);assert.equal(h.self.state.sysSel,'');assert.deepEqual(h.calls.sync,[false]);
  const e=harness();await e.run(DEPT);
  assert.equal(e.calls.confirm.length,0,'الفارغة بلا نافذة');assert.equal(e.self.state.admArm?.id,DEPT.id,'الضغطة الأولى تسلّح');
  assert.match(e.calls.toast[0],/اضغط.*مرة أخرى/);assert.deepEqual(e.calls.post,[],'لا حذف من الضغطة الأولى');
  const second=e.run(DEPT);await bounded(e.postStarted,'empty department second-click POST');assert.equal(e.calls.post.length,1);assert.equal(e.calls.ack.length,0,'الضغطة الثانية لا تُعد نجاحاً قبل ACK');e.ack();await bounded(second,'empty department ACK');
  assert.equal(e.calls.ack.length,1);assert.equal(e.self.state.admArm,null);
  const e2=harness({arm:{t:'dept',id:DEPT.id,ts:1}}),armed=e2.run(DEPT);await bounded(e2.postStarted,'already armed department POST');
  assert.equal(e2.calls.confirm.length,0);assert.equal(e2.calls.post.length,1,'الضغطة الثانية تستعمل التسليح الموجود');assert.equal(e2.calls.ack.length,0);e2.ack();await bounded(armed,'already armed department ACK');assert.equal(e2.calls.ack.length,1);
});

test('النافذةُ المشتركة: typed يعطّل التأكيد حتى تطابق الكتابة الاسمَ حرفاً', () => {
  const r = rd('src/layouts/root-logic.js');
  assert.match(r, /typed: o\.typed \? String\(o\.typed\) : "", val: ""/, 'cfmAsk يحفظ النصَّ المطلوب');
  assert.match(r, /const match = !c\.typed \|\| String\(c\.val \|\| ""\)\.trim\(\) === c\.typed/, 'المطابقةُ حرفاً');
  assert.match(r, /cfmYes: \(\) => \{ match && this\.cfmClose\(true\); \}/, 'التأكيدُ لا يمرّ بلا مطابقة');
  const t = rd('src/layouts/index.template.html');
  assert.match(t, /\{\{cfmTypedOn\}\}[\s\S]*id="bsCfmTyped"[\s\S]*\{\{cfmTypedInput\}\}/, 'حقلُ الكتابة في القالب');
});


test('جرد ناقص لمجال الاسترشاد يرفض التأكيد وPOST؛ انتظار إشارة غير مرسلة يفشل بمهلة محدودة',async()=>{
  const h=harness({populated:true,answer:true,missingIR:true});
  await bounded(h.run(DEPT),'invalid inventory completion');
  assert.deepEqual(h.calls.confirm,[]);assert.deepEqual(h.calls.post,[]);assert.deepEqual(h.calls.ack,[]);
  await assert.rejects(bounded(h.postStarted,'missing IR inventory never starts POST',20),/TEST_ONLY timeout: missing IR inventory never starts POST/);
});
