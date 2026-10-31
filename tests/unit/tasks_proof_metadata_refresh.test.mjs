/* Read-only presentation parity: a retained old proof history must not select
   old tooltip text after the current submitted proof changes. No API writes. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {ROOT,moduleLogic} from './harness.mjs';
import {attachTaskOperations} from './tasks_vm_operations_fx.mjs';
const ME={eid:'TEST_ONLY_EMP',name:'TEST_ONLY employee'},D='tst_d1',DAY='1448-5-20';
function asset(kind,name){assert.ok(process.env.KIVO_DIST,'Explicit actual build required');const dist=path.resolve(ROOT,process.env.KIVO_DIST),m=JSON.parse(fs.readFileSync(dist+'.build.json','utf8')),r=new RegExp('^assets/'+kind+'/'+name.replaceAll('.','\\.')+'\\.[a-f0-9]{10}\\.js$'),a=Object.keys(m.files).filter(n=>r.test(n));assert.equal(a.length,1);const b=fs.readFileSync(path.join(dist,a[0]));assert.equal(createHash('sha256').update(b).digest('hex'),m.files[a[0]].sha256);return b.toString('utf8');}
async function page(storeJson, emitted) {
  const store = new Map([['bassam_tasks_v1', storeJson], ['bassam_employees_v1', JSON.stringify([{ eid: ME.eid, name: ME.name }])]]);
  const KIVO = {}, toasts = [];
  const ctx = { KIVO, console, Intl, Date, Math, JSON, Promise, Object, Array, String, Number, RegExp, Set, Map, Error, isNaN, parseInt, isFinite, setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => 0,
    localStorage: { getItem: (k) => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    document: { hidden: false, querySelector: () => null, addEventListener: () => {}, removeEventListener: () => {} }, navigator: { userAgent: 'node' }, addEventListener: () => {}, removeEventListener: () => {},
    __BS_BOOT: { srv: 1 }, fetch: async () => ({ status: 0, text: async () => '' }) };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ['490-emp-key', '440-count', '546-task-model']) vm.runInContext(emitted ? asset('js',f) : fs.readFileSync(path.join(ROOT,'src/services',f+'.js'),'utf8'), ctx);
  KIVO.BassamPerm = { can: () => true, on: () => true }; KIVO.bsPct = (a, b) => (b ? Math.round(100 * a / b) : 0) + '٪';
  KIVO.BassamAuth = { user: () => ({ id: 'tst_dm1', role: 'staff', mgr: true, ekey: 'mgr:tst_d1', deptId: D, name: 'TEST_ONLY مدير' }), display: () => ({ name: 'TEST_ONLY مدير' }), users: () => [] };
  KIVO.BassamDepts = { active: () => D }; KIVO.BassamSup = { isSup: () => false };
  /* مخزنُ الصور (360): الصورتان الأولى والثالثة موجودتان · الثانية 404 */
  KIVO.BassamIDB = { getInfo: () => { throw Error('No image or R2 request is allowed'); } };
  class DCLogic { constructor() { this.state = {}; } setState(p, cb) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); cb && cb(); } }
  ctx.DCLogic = DCLogic;
  vm.runInContext(emitted ? asset('js','565-page-kit') : fs.readFileSync(path.join(ROOT, 'src/components/565-page-kit.js'), 'utf8'), ctx);
  const B0 = KIVO.BassamPageKit.base; KIVO.BassamPageKit.base = (B, a) => class extends B0(B, a) { bsOn() { return true; } bsToast(m, k) { toasts.push([m, k]); } };
  if(emitted) vm.runInContext(asset('pages','Tasks.logic'),ctx,{filename:'actual-emitted-Tasks.logic'});
  else vm.runInContext(moduleLogic('tasks') + '\n;globalThis.__C = Component;', ctx, { filename: 'actual-source-tasks(+parts).js' });
  const opsFixture = await attachTaskOperations(ctx, { store });
  const factory=KIVO.__dcLogicDefs?.Tasks||ctx.__dcLogicDefs?.Tasks,C=emitted?factory(DCLogic,DCLogic,{}):ctx.__C;const c = new C(); c._tkDayDef = () => 0;   /* اختباراتُ الشهر كاملاً (KIVO_265 · كروتُ الأيام: الافتراضي يومُ اليوم) */ c.state = Object.assign({}, c.state || {}, { locked: {} });
  return { c, opsFixture, toasts };
}
function allRows(V) { const out = [], seen = new Set(); const walk = (o, d) => { if (!o || typeof o !== 'object' || d > 4 || seen.has(o)) return; seen.add(o); if (o.tkcT && Array.isArray(o.tkcT)) out.push(o); for (const k of Object.keys(o)) { const v = o[k]; if (Array.isArray(v)) v.forEach((x) => walk(x, d + 1)); else if (v && typeof v === 'object' && k !== 'tkcT') walk(v, d + 1); } }; walk(V, 0); return out; }

for(const emitted of [false,true])test((emitted?'emitted':'source')+' task proof tooltip and viewer follow the current submitted note after an old draft',async()=>{
 const now=Date.now(),old=["TEST_ONLY task","","normal","in_progress","normal","مضافة",null,[],ME.name,'TEST_ONLY owner',60,now-60000,null,1790000000000,ME.eid,now-120000,now+3600000,null,null,null,null,{imgs:[],note:'TEST_ONLY ORIGINAL_DRAFT',draft:1,at:now-30000},null,{v:2,rv:{u:'TEST_ONLY reviewer',n:'TEST_ONLY reviewer'}}];
 const P=await page(JSON.stringify({[DAY]:[old]}),emitted);P.c.setState({year:1448,month:5,perPage:0});
 let V=P.c.renderVals(),row=allRows(V).find(r=>r.tkcT[13]===old[13]);assert.ok(row);assert.match(row.proofTip,/ORIGINAL_DRAFT/);assert.match(row.proofCnt,/مسودّة/);
 const current=JSON.parse(JSON.stringify(old));current[12]=now;current[21]={imgs:[],note:'TEST_ONLY FINAL_SUBMISSION',sub:now,at:now,h:[{at:now-20000,imgs:[],note:'TEST_ONLY ORIGINAL_DRAFT'},{at:now,imgs:[],note:'TEST_ONLY FINAL_SUBMISSION'}]};
 await P.opsFixture.replace('bassam_tasks_v1',{[DAY]:[current]});P.c.setState({tasksAll:JSON.parse(P.opsFixture.text('bassam_tasks_v1'))});
 V=P.c.renderVals();row=allRows(V).find(r=>r.tkcT[13]===old[13]);assert.ok(row);assert.match(row.proofTip,/FINAL_SUBMISSION/);assert.doesNotMatch(row.proofTip,/ORIGINAL_DRAFT|مسودّة/);assert.doesNotMatch(row.proofCnt,/مسودّة/);
 row.proofOpen();V=P.c.renderVals();assert.match(V.tkProofNote,/FINAL_SUBMISSION/);assert.doesNotMatch(V.tkProofNote,/ORIGINAL_DRAFT/);assert.equal(V.tkProofDraft,false);assert.equal(P.opsFixture.calls.length,0,'Presentation makes no save request');
});
