/* الموجة 1 · IRSZ-4 — تلميحاتُ الشهر/اليوم المقفل بحسب الصلاحية: كانت الصفحاتُ تقول لمن لا يملك «الاعتماد» «انقر نقرة مزدوجة لفتحه»
   والنقرةُ لا تفعل شيئاً بصمت (الاسترشاد · المضبوطات) أو تفتح نافذةً يُرفض زرُّها (التقرير اليومي). الآن: الإرشادُ لمن يملك الاعتماد وحده،
   وغيرُه يُخبَر بالسبب نصّاً (التلميح · الشرح · بطاقة الشهر · خانة اليوم) وعند النقر (رسالة) — ومن يملكه يفتح كما كان.
   + ES-8 — شارةُ الجدول الشهري: شهرٌ منقضٍ بلا جدول كان «معتمد ومقفل» (الخضراء) فوق «لا يوجد جدول».
   منطقُ الصفحات الحقيقي في vm بساعةٍ ثابتة (w1_pages.mjs: 9 جمادى الأولى 1448 هـ ⇒ ربيع الآخر منقضٍ مقفل) — بياناتٌ اصطناعية (TEST_ONLY). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SRC } from './harness.mjs';
import { page, EV, NOW } from './w1_pages.mjs';
import { attachTaskOperations } from './tasks_vm_operations_fx.mjs';
/* Schema 10: dreport/tasks/staff read their business resources through the real Operations service (src/api/280),
   preloaded from an explicit in-memory transport (tasks_vm_operations_fx) — never from browser storage. */
async function opsPage(slug, o = {}) {
  const store = new Map(Object.entries(o.store || {}).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]));
  const host = { KIVO: { BassamAuth: { user: () => ({ id: 'tst_dm1', role: 'staff', mgr: true, deptId: 'tst_d1' }) }, BassamDepts: { active: () => 'tst_d1' } },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} } };
  const ops = await attachTaskOperations(host, { store, uid: 'tst_dm1', dept: 'tst_d1' });
  return page(slug, { ...o, store: {}, srv: ops.service });
}

const NOAP = (p, a) => a !== 'approve';   /* مديرُ إدارةٍ بلا «الاعتماد» (كحساب التدقيق dm) */
const ALL = () => true;
const DBL = /نقرة مزدوجة|نقرةً مزدوجة|بنقرة مزدوجة/;
const NEED = /يحتاج صلاحية الاعتماد|تحتاج صلاحية الاعتماد/;
const J = (o) => JSON.parse(JSON.stringify(o));

/* These cases exercise hint wording and the real retro toggle, not identity or
   HTTP authorization (covered by irshad_cloud_http and the role matrix). Keep
   their transport fixture explicit: POST ACK cannot unlock a card; only the
   subsequent confirmed GET windows DTO may do so. No retired JSON/flags. */
function irHintPage(can, {reason='TEST_ONLY hint reason',denied=false}={}) {
  const P=page('irshad',{can}),context={uid:'tst_dm1',dept:'tst_d1',key:'tst_dm1\0tst_d1'},windows=[];
  P.requests=[];P.reasons=[];P.c._irContext=()=>context;
  P.KIVO.__BS_SRV={askReason:(key,keys,done)=>{P.reasons.push({key,keys});done(reason);}};
  const dto=()=>({ok:1,res:'irshad',dept:context.dept,today:P.c.hToday(),now:NOW,maxHours:24,defHours:1,may:true,windows:J(windows)});
  P.c.state.irRetro=dto();
  P.c._irRequest=async(route,options)=>{
    P.requests.push({route,options});
    if(options.method==='GET')return{ok:1,data:dto()};
    const body=JSON.parse(options.body);
    if(denied)return{ok:0,status:403,message:'TEST_ONLY server refusal'};
    const window={id:'TEST_ONLY_window_'+windows.length,scope:body.scope,by:{id:context.uid},at:NOW,until:NOW+3600000,hours:1,reason:body.reason};
    windows.push(window);return{ok:1,data:{ok:1,window:J(window),today:P.c.hToday(),now:NOW}};
  };
  P.V=()=>P.c._recordsCalVals();
  P.pull=async()=>{const result=await P.c._irRequest('/api/retro?uid='+context.uid+'&dept='+context.dept+'&res=irshad',{method:'GET'});P.c.setState({irRetro:result.data});};
  P.settle=()=>new Promise(resolve=>setImmediate(resolve));
  return P;
}

/* Same pure-hint contract as Irshad, using Seized's actual typed retro handler.
   Catalogs/context are explicit confirmed DTOs; they are not legacy KV adapters. */
function szHintPage(can, {reason='TEST_ONLY hint reason',denied=false}={}) {
  const P=page('seized',{can}),context={uid:'tst_dm1',dept:'tst_d1',key:'tst_dm1\0tst_d1'},windows=[];
  const base={epoch:0,reports:0,catalog:0,actions:0,locations:0,jew:0,retro:0};
  P.requests=[];P.reasons=[];P.c._bcContext=()=>context;P.c._bcEnsure=()=>{};
  P.KIVO.__BS_SRV={askReason:(key,keys,done)=>{P.reasons.push({key,keys});done(reason);}};
  const defaults=JSON.parse(fs.readFileSync(path.join(SRC,'modules/seized/defaults.json'),'utf8'));
  P.c.state.szCatalogs={_contextKey:context.key,base,catalogs:{catalog:{present:false,value:{ver:P.c.SZ_VER,cats:defaults.cats}},actions:{present:false,value:defaults.actions},jew:{present:false,value:defaults.kinds},locations:{present:false,value:[]}}};
  const dto=()=>({ok:1,res:'seized',dept:context.dept,today:P.c.hToday(),now:NOW,maxHours:24,defHours:1,may:true,windows:J(windows),_contextKey:context.key,_received:NOW});
  P.c.state.szRetro=dto();
  P.c._bcRequest=async(route,options)=>{
    P.requests.push({route,options});if(options.method==='GET')return{ok:1,data:dto()};
    const body=JSON.parse(options.body);if(denied)return{ok:0,status:403,message:'TEST_ONLY server refusal'};
    const window={id:'TEST_ONLY_window_'+windows.length,scope:{...body.scope,d:body.scope.d??null},by:{id:context.uid},at:NOW,until:NOW+3600000,hours:1,reason:body.reason};
    windows.push(window);return{ok:1,data:{ok:1,window:J(window),today:P.c.hToday(),now:NOW}};
  };
  P.pull=async()=>{const result=await P.c._bcRequest('/api/retro?uid='+context.uid+'&dept='+context.dept+'&res=seized',{method:'GET'});P.c.setState({szRetro:result.data});};
  P.settle=()=>new Promise(resolve=>setImmediate(resolve));return P;
}

for (const slug of ['irshad', 'seized']) {
  const noun = slug === 'irshad' ? 'تقريرك' : 'محضرك';
  test('IRSZ-4 · ' + slug + ': بلا «الاعتماد» لا دعوةَ إلى نقرةٍ مزدوجة — التلميحُ والشرحُ وبطاقةُ الشهر وخانةُ اليوم تذكر السبب، والنقرةُ المزدوجة تشرحه ولا تفتح', () => {
    const P = slug==='irshad'?irHintPage(NOAP):szHintPage(NOAP);
    P.c.setState({ irMonth: 4, irDay: 3 });
    let V = P.V();
    assert.equal(V.irPmApprove, false);
    assert.equal(V.irMonthAutoHint, true, 'ربيعُ الآخر منقضٍ مقفل');
    assert.doesNotMatch(V.irMonthAutoTxt, DBL); assert.match(V.irMonthAutoTxt, NEED);
    assert.equal(V.irLegendLockTxt, 'انقضى — مقفل');
    assert.doesNotMatch(V.irMonths[3].tip, DBL); assert.match(V.irMonths[3].tip, /^الشهر انقضى — مقفل · فتحه للاستدراك يحتاج صلاحية الاعتماد$/);
    assert.doesNotMatch(V.irDays[2].tip, DBL); assert.match(V.irDays[2].tip, /انقضى، مقفل · فتحه يحتاج صلاحية الاعتماد$/);
    V.irMonths[3].dbl(EV);
    assert.equal(P.toasts.length, 1, 'النقرةُ المزدوجة لم تعد صامتة'); assert.match(P.toasts[0][0], NEED);
    assert.deepEqual(J(P.c.state.irOpenMonths || {}), {}, 'ولا يُفتح الشهر');
    /* يومٌ منقضٍ في الشهر الجاري */
    P.c.setState({ irMonth: 5, irDay: 3 });
    V = P.V();
    assert.equal(V.irDayLockedHint, true);
    assert.doesNotMatch(V.irDayLockedTxt, DBL); assert.match(V.irDayLockedTxt, NEED);
    V.irDays[2].dbl(EV);
    assert.equal(P.toasts.length, 2); assert.deepEqual(J(P.c.state.irOpenDays || {}), {});
    /* الشهرُ الجاري غيرُ المقفل: لا شيء يُفتح ⇒ لا رسالة */
    V.irMonths[4].dbl(EV); assert.equal(P.toasts.length, 2);
  });
  test('IRSZ-4 · ' + slug + ': من يملك «الاعتماد» يرى الإرشادَ كما كان وتفتح نقرتُه المزدوجة الشهرَ واليومَ بلا رسالة', async () => {
    const P = slug==='irshad'?irHintPage(ALL):szHintPage(ALL);
    P.c.setState({ irMonth: 4, irDay: 3 });
    let V = P.V();
    assert.equal(V.irMonthAutoTxt, 'الشهر انقضى — مقفل · انقر بطاقة الشهر نقرة مزدوجة لفتحه ثم أضف ' + noun + (slug === 'irshad' ? ' اليومي' : ''));
    assert.equal(V.irLegendLockTxt, 'انقضى — مقفل · نقرة مزدوجة لفتحه');
    assert.equal(V.irMonths[3].tip, 'الشهر انقضى — مقفل · نقرة مزدوجة لفتحه للاستدراك');
    V.irMonths[3].dbl(EV);
    if(slug==='irshad'){
      await P.settle();assert.equal(P.c.state.irRetro,null,'ACK alone is not an active-window read');assert.equal(P.V().irMonthAutoHint,true);
      assert.equal(P.reasons.length,1);assert.equal(JSON.parse(P.requests[0].options.body).reason,'TEST_ONLY hint reason');
      await P.pull();assert.equal(P.V().irMonthAutoHint,false);assert.deepEqual(J(P.c.state.irRetro.windows[0].scope),{y:1448,m:4,d:null});
    }else{
      await P.settle();assert.equal(P.c.state.szRetro,null,'ACK alone is not an active-window read');assert.equal(P.V().irMonthAutoHint,true);
      assert.equal(P.reasons.length,1);assert.equal(JSON.parse(P.requests[0].options.body).reason,'TEST_ONLY hint reason');
      await P.pull();assert.equal(P.V().irMonthAutoHint,false);assert.deepEqual(J(P.c.state.szRetro.windows[0].scope),{y:1448,m:4,d:null});
    }
    assert.equal(P.toasts.length, 0);
    P.c.setState({ irMonth: 5, irDay: 3, irOpenMonths: {} });
    V = P.V();
    assert.equal(V.irDayLockedTxt, 'اليوم انقضى — مقفل · انقر بطاقة اليوم نقرة مزدوجة لفتحه ثم سجّل ' + noun);
    V.irDays[2].dbl(EV);
    if(slug==='irshad'){
      await P.settle();assert.equal(P.V().irDayLockedHint,true);await P.pull();assert.equal(P.V().irDayLockedHint,false);
      assert.deepEqual(J(P.c.state.irRetro.windows[1].scope),{y:1448,m:5,d:3});
    }else{
      await P.settle();assert.equal(P.V().irDayLockedHint,true);await P.pull();assert.equal(P.V().irDayLockedHint,false);
      assert.deepEqual(J(P.c.state.szRetro.windows[1].scope),{y:1448,m:5,d:3});
    }
  });
}

test('IRSZ-4 · الاسترشاد: إلغاء السبب أو رفض الخادم لا يفتح نافذة ولا يعرض اعتمادًا محليًا',async()=>{
  for(const options of [{reason:''},{denied:true}]){
    const P=irHintPage(ALL,options);P.c.setState({irMonth:4,irDay:3});P.V().irMonths[3].dbl(EV);await P.settle();
    assert.equal(P.reasons.length,1);assert.equal(P.requests.filter(r=>r.options.method==='POST').length,options.denied?1:0);
    await P.pull();assert.deepEqual(J(P.c.state.irRetro.windows),[]);assert.equal(P.V().irMonthAutoHint,true);
    assert.deepEqual(J(P.c.state.irOpenMonths||{}),{});if(options.denied)assert.match(P.toasts.at(-1)[0],/server refusal/);
  }
});

test('IRSZ-4 · المضبوطات: إلغاء السبب أو رفض الخادم لا يفتح نافذة ولا يعرض اعتمادًا محليًا',async()=>{
  for(const options of [{reason:''},{denied:true}]){
    const P=szHintPage(ALL,options);P.c.setState({irMonth:4,irDay:3});P.V().irMonths[3].dbl(EV);await P.settle();
    assert.equal(P.reasons.length,1);assert.equal(P.requests.filter(r=>r.options.method==='POST').length,options.denied?1:0);
    await P.pull();assert.deepEqual(J(P.c.state.szRetro.windows),[]);assert.equal(P.V().irMonthAutoHint,true);
    assert.deepEqual(J(P.c._szRetroFlags().months),{});if(options.denied)assert.match(P.toasts.at(-1)[0],/server refusal/);
  }
});

test('IRSZ-4 · التقرير اليومي: بلا «الاعتماد» خانةُ اليوم المنقضي وبطاقةُ الشهر بلا «نقرة مزدوجة» · والنقرةُ تشرح ولا تفتح نافذةً يُرفض زرُّها', async () => {
  const P = await opsPage('dreport', { can: NOAP });
  P.c.setState({ rpM: 5, rpD: 9 });
  let V = P.V();
  assert.equal(V.days[2].tip.split(' م — ')[1], 'فارغ — انقضى ومقفل · فتحه يحتاج صلاحية الاعتماد');
  assert.doesNotMatch(V.months[3].tip, DBL); assert.match(V.months[3].tip, NEED);
  assert.doesNotMatch(V.days[8].tip, DBL, 'اليومُ الجاري أيضاً: لا «نقرة مزدوجة لإغلاقه»');
  V.days[2].dbl(EV);
  assert.equal(P.c.state.drRt, null, 'لا نافذةَ فتحٍ تنتهي برفض'); assert.equal(P.c.state.rpD, 3, 'واليومُ يُختار');
  assert.match(P.toasts.at(-1)[0], /يحتاج صلاحية الاعتماد/);
  const Q = await opsPage('dreport', { can: ALL });
  Q.c.setState({ rpM: 5, rpD: 9 });
  V = Q.V();
  assert.equal(V.days[2].tip.split(' م — ')[1], 'فارغ — انقضى ومقفل · نقرة مزدوجة لفتحه وإنشاء تقريره بأثر رجعي');
  V.days[2].dbl(EV);
  assert.deepEqual(J(Q.c.state.drRt), { d: 3, open: true }, 'من يملك الاعتماد: نافذةُ الفتح كما كانت'); assert.equal(Q.toasts.length, 0);
});

test('IRSZ-4 · المهام: شارةُ اليوم وتلميحُ الشهر ومفتاحُ الألوان وبطاقةُ الشهر بحسب الصلاحية · ونقرةُ الشهر المقفل تشرح', async () => {
  const P = await opsPage('tasks', { can: NOAP });
  P.c.setState({ perPage: 0, tkDaySel: { k: '1448-5', d: 3 } });
  let V = P.V();
  assert.equal(V.tkDayLockTxt, 'اليوم انقضى — المهام مقفلة تلقائياً · فتحه بأثر رجعي يحتاج صلاحية الاعتماد');
  assert.equal(V.tkLegendLockTxt, 'انقضى — مقفل');
  assert.doesNotMatch(V.tkDays[2].tip, DBL);
  assert.equal(V.mcards[3].tip, 'الشهر انقضى — مقفل · فتحه يحتاج صلاحية الاعتماد');
  V.mcards[3].dbl(EV);
  assert.match(P.toasts.at(-1)[0], /يحتاج صلاحية الاعتماد/); assert.ok(!P.c.state.retroAsk && !P.c.state.lockConfirm, 'ولا تُفتح نافذة');
  const n = P.toasts.length; V.mcards[6].dbl(EV); assert.equal(P.toasts.length, n, 'شهرٌ قادمٌ بلا مهام: لا شيء يُشرح');
  assert.match(P.c._tkLockTxt(1448, 5, 3), /^اليوم مقفل — فتحُه يحتاج صلاحية الاعتماد/);
  P.c.setState({ month: 4 }); V = P.V();
  assert.equal(V.tasksAutoHint, true); assert.doesNotMatch(V.tasksAutoTxt, DBL); assert.match(V.tasksAutoTxt, NEED);
  const Q = await opsPage('tasks', { can: ALL });
  Q.c.setState({ perPage: 0, tkDaySel: { k: '1448-5', d: 3 } });
  V = Q.V();
  assert.equal(V.tkDayLockTxt, 'اليوم انقضى — المهام مقفلة تلقائياً · افتحه بأثر رجعي بنقرة مزدوجة على خانته', 'من يملك الاعتماد: النصُّ كما كان');
  assert.equal(V.tkLegendLockTxt, 'انقضى — مقفل · نقرة مزدوجة لفتحه');
  assert.equal(V.mcards[3].tip, 'الشهر انقضى — مقفل · نقرة مزدوجة لفتحه للاستدراك');
  V.mcards[3].dbl(EV); assert.deepEqual(J(Q.c.state.retroAsk), { m: 4, open: true }); assert.equal(Q.toasts.length, 0);
});

const EMPS = [{ eid: 'tst_e_a', name: 'TEST_ONLY أ' }];
const SCHED = { tst_e_a: { shift: 'TST-A', rest: [] } };
async function staffPage(can) {
  /* صفر 1448: منقضٍ بجدولٍ غيرِ معتمد · ربيع الأول: منقضٍ بجدولٍ معتمد · ربيع الآخر: منقضٍ بلا جدول · جمادى الأولى (الجاري): مسودة · جمادى الآخرة: لا جدول */
  return opsPage('staff', { can, store: { bassam_employees_v1: EMPS, bassam_staffing_v3: { '1448-2': SCHED, '1448-3': SCHED, '1448-5': SCHED }, bassam_staffing_locks_v1: { '1448-3': true } } });
}
test('ES-8 · شارةُ الجدول الشهري: وجودُ الجدول أولاً — المنقضي بلا جدول «لا يوجد جدول · الشهر مقفل» رمادية (كان «معتمد ومقفل» خضراء)', async () => {
  const P = await staffPage(ALL), at = (m) => { P.c.setState({ month: m }); return P.V(); };
  let V = at(4);
  assert.equal(V.badgeKind, 'none'); assert.equal(V.badgeLabel, 'جدول ربيع الآخر 1448 هـ — لا يوجد جدول · الشهر مقفل');
  assert.match(V.badgeStyle, /var\(--fg-x64748b\)/); assert.doesNotMatch(V.badgeStyle, /fg-x008450/);
  assert.equal(V.noSchedule, true, 'والجسمُ «لا يوجد جدول» — الشارةُ لا تناقضه');
  V = at(3); assert.equal(V.badgeKind, 'ok'); assert.equal(V.badgeLabel, 'جدول ربيع الأول 1448 هـ — معتمد ومقفل'); assert.match(V.badgeStyle, /var\(--fg-x008450\)/);
  V = at(2); assert.equal(V.badgeKind, 'past', 'منقضٍ بجدولٍ لم يُعتمد: لا يُدّعى اعتمادُه'); assert.equal(V.badgeLabel, 'جدول صفر 1448 هـ — انقضى — مقفل'); assert.match(V.badgeStyle, /var\(--fg-x475569\)/);
  V = at(5); assert.equal(V.badgeKind, 'draft'); assert.equal(V.badgeLabel, 'جدول جمادى الأولى 1448 هـ — مسودة مفتوحة');
  V = at(6); assert.equal(V.badgeKind, 'none'); assert.equal(V.badgeLabel, 'جدول جمادى الآخرة 1448 هـ — لا يوجد جدول', 'شهرٌ قادمٌ غيرُ مقفل: بلا «الشهر مقفل»');
});

test('IRSZ-4 · الجدول الشهري: بلا «الاعتماد» بطاقاتُ الشهر وشرحُ القفل بلا «نقرة مزدوجة» والنقرةُ تشرح · ومن يملكه كما كان', async () => {
  const P = await staffPage(NOAP);
  P.c.setState({ month: 4 });
  let V = P.V();
  assert.equal(V.months[3].tip, 'الشهر انقضى — مقفل · فتحه للاستدراك يحتاج صلاحية الاعتماد');
  assert.equal(V.months[2].tip, 'الجدول معتمد ومقفل · فكُّ اعتماده يحتاج صلاحية الاعتماد');
  assert.equal(V.months[4].tip, 'مسودة · اعتمادُ الجدول يحتاج صلاحية الاعتماد');
  assert.doesNotMatch(V.schedLockedMsg + V.schedApprovedMsg, DBL);
  V.months[3].dbl(EV);
  assert.equal(P.toasts.length, 1); assert.match(P.toasts[0][0], /لا تشمل هذا الإجراء/); assert.ok(!P.c.state.retroAsk && !P.c.state.lockConfirm);
  V.months[5].dbl(EV); assert.equal(P.toasts.length, 1, 'شهرٌ قادمٌ بلا جدول: لا شيء يُشرح');
  const Q = await staffPage(ALL);
  Q.c.setState({ month: 4 }); V = Q.V();
  assert.equal(V.months[3].tip, 'الشهر انقضى — مقفل · نقرة مزدوجة لفتحه ثم أضف الجدول');
  assert.equal(V.schedLockedMsg, 'الشهر انقضى — مقفل · انقر بطاقة الشهر نقرة مزدوجة لفتحه ثم أضف الجدول');
  V.months[3].dbl(EV); assert.deepEqual(J(Q.c.state.retroAsk), { m: 4, open: true }); assert.equal(Q.toasts.length, 0);
});
