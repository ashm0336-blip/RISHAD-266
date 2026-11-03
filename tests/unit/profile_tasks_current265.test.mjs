import './clock.mjs'; // Initialize the fixture clock before every other import.
import { replaceOperationalFixture } from './operational_legacy_seed_fx.mjs';
import { taskText } from './tasks_vm_operations_fx.mjs';
import { taskCommandBody, operationSaveBody } from './tasks_fx.mjs';
/* KIVO_265 · «ملفي ← مهامك» — قرارُ المالك (2026-10-16): «مهامك الحالية» ما يحتاج متابعةَ الموظف وحده.
   العطلُ المرصود: مهمةٌ أُنجزت تبقى في «الحالية» — _tkVals كان يقبل صفوفَ «اليوم» بأيّ حالة، و_tkPick يرتدّ إلى «بانتظار المراجعة» ثم
   «آخرُ ما أنجزت اليوم»، وtkFocus (يُضبط بعد التسليم) يُبقي المنجزةَ والمسلَّمةَ «الأهم الآن». المطلوب:
     (1) الحالية = جديدة (ومنها المستلَمةُ ولم تبدأ) · قادمة · جارية · متعثّرة · مُعادة (والمُعادةُ أولاً) — لا غير
     (2) المنجزةُ نهائياً تخرج من الحالية وتبقى في «سجل مهامك» بإثباتها وسجلِّها (لا حذفَ لبيانٍ ولا إثبات)
     (3) لا حالية ⇒ «لا توجد لديك مهام حالية» حرفاً — وبعد أوّل قراءةٍ وحدها («جارٍ تحميل مهامك…» قبلها)
     (4) المسلَّمةُ للمراجِع (review) في قسمها «بانتظار اعتماد المسؤول (N)» بحالةٍ صريحة — ليست «الأهم الآن» ولا منجزة
     (5) تعدّدُ المهام والمكلَّفين (مهمةٌ جماعية): فعلُ أحدهم لا يمسّ سجلَّ غيره ولا ما يراه
     + سلسلةُ التكرار (rid من الخادم): أقربُ نسخةٍ قادمةٍ منها وحدها في الحالية.
   منطقُ الصفحة الحقيقي (src/modules/profile/logic.js — أو PROFILE_LOGIC=<مسار> لإثبات الإخفاق قبل الإصلاح) + 545 في vm، وfetch بجلسة الموظف إلى
   العامل الحقيقي (tests/unit/tasks_fx.mjs) — legacy وenforce؛ والمسارُ المحلي بلا خادم (لا __BS_BOOT.srv) بعُدّة profile_world. */
import './clock.mjs';   /* KIVO_265 · البند 19: ساعةٌ مثبَّتة (10:00 الرياض · 1448-5-9) — قبل tasks_fx/profile_world لأن ثوابتَهما تُحسب عند التحميل */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { ROOT } from './harness.mjs';
import { world, workerUnderTest, ME, MATE, KT, DAY, TAG, stored, rowsOf, putKV, hij, HR, PNG } from './tasks_fx.mjs';
import { world as pfWorld, riyadhDay } from './profile_world.mjs';

const WU = workerUnderTest();
const LOGIC = process.env.PROFILE_LOGIC || path.join(ROOT, 'src/modules/profile/logic.js');
const DM = ['0000000101', '70101'];
const EMPTY = 'لا توجد لديك مهام حالية', LOADING = 'جارٍ تحميل مهامك…';
function page(W, ck) {
  const KIVO = {};
  const ctx = { KIVO, console, Intl, Date, Math, JSON, Promise, Object, Array, String, Number, RegExp, Set, Map, Error, isNaN, parseInt, encodeURIComponent, decodeURIComponent,
    setTimeout: () => 0, clearTimeout: () => 0, setInterval: () => 0, clearInterval: () => 0,   /* لا قراءةَ تلقائية: القراءةُ صريحةٌ بـ MT.load */
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, document: { hidden: false, querySelector: () => null }, navigator: { userAgent: 'node' } };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.__BS_BOOT = { srv: 1, cf: 1 };
  ctx.CustomEvent = class { constructor(t, o) { this.type = t; this.detail = o && o.detail; } };
  ctx.addEventListener = () => {}; ctx.dispatchEvent = () => true;
  ctx.fetch = async (url, opt = {}) => { const r = await W.C.req(url, { method: opt.method || 'GET', cookie: ck, headers: opt.headers, body: opt.body }); return { ok: r.status < 300, status: r.status, text: () => r.text(), json: () => r.json() }; };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/services/545-task-self.js'), 'utf8'), ctx);
  KIVO.BassamCount = (n, w) => n + ' ' + w;
  class DCLogic { constructor() { this.state = {}; } setState(p) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); } }
  KIVO.BassamPageKit = { base: (Bc) => class extends Bc { bsOn() { return true; } bsToast() {} bsAck() { return Promise.resolve(true); } MONTHS() { return '١ ٢ ٣ ٤ ٥ ٦ ٧ ٨ ٩ ١٠ ١١ ١٢'.split(' '); } } };
  ctx.DCLogic = DCLogic;
  vm.runInContext(fs.readFileSync(LOGIC, 'utf8') + '\n;globalThis.__C = Component;', ctx, { filename: 'profile/logic.js' });
  const c = new ctx.__C(); c.state = Object.assign({ pfPanel: '' }, c.state || {}); c._pfAlive = true;
  return { c, MT: KIVO.BassamMyTasks };
}
const T = { y: +DAY.split('-')[0], m: +DAY.split('-')[1], d: +DAY.split('-')[2] };
const envOf = (eid) => ({ isStaff: true, T, myKey: eid, keyOfTok: (x) => x, myRec: { name: '' } });
const E = envOf(ME.eid);
const V = (P, e = E) => JSON.parse(JSON.stringify(P.c._tkVals({}, e, P.c.state), (k, v) => (typeof v === 'function' ? undefined : v)));
const Vf = (P, e = E) => P.c._tkVals({}, e, P.c.state);   /* بالدوالّ (للنقر) */
const post = (W, ck, p, body) => W.C.api(p, { method: 'POST', cookie: ck, body: operationSaveBody(W.env, p, taskCommandBody(W.env, p, body)) });
const refOf = (P, id, e = E) => P.c._tkMine(e).find((x) => x.r.__x && String(x.r.__x.id) === String(id));
const srvRow = (W, id, eid = ME.eid) => (rowsOf(stored(W.env, KT), eid).find((x) => x.r[13] === id) || {}).r || [];
async function until(f, ms = 5000) { const t0 = Date.now(); for (;;) { let v = false; try { v = f(); } catch (e) { v = false; } if (v || Date.now() - t0 > ms) return v; await new Promise((r) => setTimeout(r, 10)); } }
const mkTask = (W, ck, t, extra) => post(W, ck, '/api/tasks/create', Object.assign({ k: DAY, t: TAG + ' ' + t, s: Date.now() - 60e3, e: Date.now() + 2 * HR, asg: [ME.eid] }, extra || {}));
/* صفوفُ «الحالية» الظاهرة: «الأهم الآن» + «بقية مهامك» + «بانتظار اعتماد المسؤول» — عناوينُها */
const cur = (t) => [t.tkFocusOn ? t.tkFTitle : null].concat((t.tkRest || []).map((q) => q.title)).filter(Boolean);
const shown = (t) => cur(t).concat((t.tkRv || []).map((q) => q.title));
const logRows = (t) => (t.tkLogDays || []).flatMap((d) => d.rows);
/* عناوينُ «الحالية» كما يحسبها _tkCur (بلا سقف العرض) */
const curOf = (P, e = E) => P.c._tkCur(P.c._tkMine(e).map((t) => Object.assign({}, t, { st: P.c._tkState(t, Date.now()) }))).map((t) => t.r[0]);
const cmpT = (r) => (r.y - T.y) || (r.m - T.m) || (r.d - T.d);
/* لوحٌ نظيف: صفوفُ الموظف من المُثبِّت تُزال (لا تمسّ غيرَه) — فيُقرأ ما يُختبر وحده */
async function wipe(W, eid) { const S = stored(W.env, KT); for (const d in S) S[d] = S[d].filter((r) => !(Array.isArray(r) && r[14] === eid)); await replaceOperationalFixture(W.env, KT, S); }
async function startAndSubmit(P, W, id, x) {
  let R = refOf(P, id); P.c.tkAccept(R.day, R.i); await until(() => srvRow(W, id)[11]);
  R = refOf(P, id); P.c.tkFinishOpen(R.day, R.i); P.c.setState(Object.assign({ tkNote: TAG + ' تم' }, x || {}));
  Vf(P).tkFinGo(); await until(() => ((srvRow(W, id)[21] || {}).sub || srvRow(W, id)[3] === 'done') && !P.c.state.tkBusy);
  return R;
}

for (const mode of ['legacy', 'enforce']) {
  test('[' + mode + '] (1·2·3) التسليمُ بلا مراجِع ⇒ منجزةٌ تخرج من «الحالية» (بـ tkFocus وبدونه) · «لا توجد لديك مهام حالية» بعد التحميل وحده · والسجلُّ بإثباتها وسجلِّها', async () => {
    const W = await world({ worker: WU.file, mode });
    const me = await W.login(ME.un, ME.pw), dm = await W.login(...DM);
    await wipe(W, ME.eid);
    const P = page(W, me.ck);
    let t = V(P);
    assert.equal(t.tkOn, true); assert.equal(t.tkEmpty, true); assert.equal(t.tkLoad, true, 'قبل أوّل قراءة');
    assert.equal(t.tkEmptyT, LOADING, 'قبل أوّل قراءة: «جارٍ تحميل مهامك…» لا «لا مهام» كاذبة'); assert.equal(t.tkEmptyS, '');
    await P.MT.load(true); t = V(P);
    assert.equal(t.tkLoad, false); assert.equal(t.tkEmptyT, EMPTY, 'بعد التحميل: النصُّ حرفاً'); assert.equal(t.tkHas, false);
    const c = await mkTask(W, dm.ck, 'منجزةٌ بلا مراجِع', { rv: 'none' }); assert.equal(c.status, 200, JSON.stringify(c.j));
    const id = c.j.rows[0].id, TT = TAG + ' منجزةٌ بلا مراجِع';
    await P.MT.load(true); t = V(P);
    assert.equal(t.tkHas, true); assert.equal(t.tkFTitle, TT); assert.equal(t.tkSub, '1 مهمة — الأهم أولاً');
    const R = await startAndSubmit(P, W, id, { tkImgs: [PNG] });
    assert.equal(srvRow(W, id)[3], 'done', 'بلا مراجِع ⇒ التسليمُ إنجاز');
    assert.equal(P.c.state.tkFocus, null, 'P1: التسليمُ يمسح tkFocus (كان يبقى على المنجزة فيُثبِّت مفتاحُ الفهرس صفّاً آخر حين تنزاح الفهارس)');
    for (const f of ['tkFocus', 'none']) {
      /* tkFocus على المنجزة (نقرةٌ سابقة أو مفتاحٌ قديم) لا يُبقيها «الأهم الآن» — _tkCur */
      P.c.setState({ tkFocus: f === 'tkFocus' ? R.day + '#' + R.i : null });
      t = V(P);
      assert.equal(t.tkFocusOn, false, f + ': لا «الأهم الآن»'); assert.notEqual(t.tkFState, 'done'); assert.ok(!/آخر ما أنجزت/.test(t.tkFLbl || ''));
      assert.equal(t.tkHas, false, f); assert.equal(t.tkEmpty, true, f); assert.equal(t.tkEmptyT, EMPTY, f + ': «لا توجد لديك مهام حالية»');
      assert.deepEqual(shown(t), [], f + ': لا صفَّ في «الحالية»'); assert.equal(t.tkRvOn, false);
      assert.equal(t.tkDoneN, '1', 'العدُّ «منجزة اليوم» باقٍ عدّاً'); assert.ok(!/أنجزت مهام اليوم/.test(t.tkSub), t.tkSub);
    }
    P.c.setState({ pfPanel: 'tklog', tkLogY: T.y, tkLogM: T.m, tkLogF: 'all' }); t = V(P);
    const lr = logRows(t).find((q) => q.title === TT);
    assert.ok(lr, 'في «سجل مهامك»'); assert.equal(t.tkLogDone, '1');
    assert.equal(lr.thumbOn, true, 'بصورة إثباتها مصغّرة'); assert.match(lr.thumb, /^data:image\/png/); assert.match(lr.meta, /صورة/); assert.match(lr.meta, /ملاحظة/);
    logRows(Vf(P)).find((q) => q.title === TT).open(); await until(() => P.c.state.tkTl && P.c.state.tkTl.st !== 'loading');
    t = V(P); assert.equal(t.pfPanelTkTl, true);
    const tl = t.tkTlRows.map((q) => q.txt).join(' | ');
    for (const w of ['أُنشئت', 'قُبلت', 'أُنجزت']) assert.ok(tl.includes(w), 'سجلُّ المهمة يحوي «' + w + '»: ' + tl);
    const r = srvRow(W, id); assert.equal(r[21].imgs.length, 1, 'الإثباتُ باقٍ'); assert.equal(r[21].note, TAG + ' تم');
  });

  test('[' + mode + '] (4) المسلَّمةُ للمراجِع في «بانتظار اعتماد المسؤول (N)» — لا «الأهم الآن» ولا منجزة · وهي في السجل · المُعادةُ تعود «الأهم الآن» · والمعتمَدةُ تخرج إلى السجل بقرارها وإثباتها', async () => {
    const W = await world({ worker: WU.file, mode });
    const me = await W.login(ME.un, ME.pw), dm = await W.login(...DM);
    await wipe(W, ME.eid);
    const P = page(W, me.ck); await P.MT.load(true);
    const c = await mkTask(W, dm.ck, 'تُراجَع'); assert.equal(c.status, 200, JSON.stringify(c.j));
    const id = c.j.rows[0].id, TT = TAG + ' تُراجَع';
    await P.MT.load(true);
    await startAndSubmit(P, W, id, { tkImgs: [PNG] });
    assert.equal(srvRow(W, id)[3], 'in_progress', 'بانتظار المراجعة لا منجزة');
    /* وحدها: «لا توجد لديك مهام حالية» والقسمُ ظاهرٌ تحته */
    let t = V(P);
    assert.equal(t.tkEmpty, true); assert.equal(t.tkEmptyT, EMPTY, 'لا حاليةَ ⇒ النصُّ حرفاً ولو وُجدت مسلَّمة'); assert.equal(t.tkFocusOn, false);
    assert.equal(t.tkRvOn, true, 'والقسمُ ظاهر'); assert.equal(t.tkRvHead, 'بانتظار اعتماد المسؤول (1)'); assert.equal(t.tkSub, 'سلّمت ما عليك — بانتظار المراجعة');
    assert.deepEqual(t.tkRv.map((q) => q.title), [TT]); assert.match(t.tkRv[0].meta, /^سُلّمت — بانتظار مراجعة \S/); assert.equal(t.tkRv[0].pill, 'للمراجعة'); assert.equal(t.tkRv[0].ico, '◔');
    assert.equal(t.tkDoneN, '0', 'ليست منجزة'); assert.equal(t.tkMonDone, '0'); assert.equal(t.tkRevN, '1');
    /* مع مهمةٍ حالية: هي «الأهم الآن» والمسلَّمةُ في قسمها لا في «بقية مهامك» */
    const c2 = await mkTask(W, dm.ck, 'حاليةٌ جديدة', { rv: 'none' }); await P.MT.load(true); t = V(P);
    assert.equal(t.tkFTitle, TAG + ' حاليةٌ جديدة'); assert.equal(t.tkFState, 'new'); assert.deepEqual(t.tkRest.map((q) => q.title), []);
    assert.deepEqual(t.tkRv.map((q) => q.title), [TT]); assert.equal(t.tkSub, '1 مهمة — الأهم أولاً', 'العدُّ للحالية وحدها');
    const tlOpen = Vf(P).tkRv[0].open; tlOpen(); assert.equal(P.c.state.pfPanel, 'tktl', 'صفُّها يفتح سجلَّ المهمة لا «الأهم الآن»'); P.c.setState({ pfPanel: '', tkTl: null });
    P.c.setState({ pfPanel: 'tklog', tkLogY: T.y, tkLogM: T.m, tkLogF: 'all' }); t = V(P);
    const lq = logRows(t).find((q) => q.title === TT);
    assert.ok(lq, 'في «سجل مهامك»'); assert.equal(lq.pill, 'للمراجعة'); assert.match(lq.meta, /بانتظار مراجعة/); assert.equal(t.tkLogDone, '0', 'لا تُعدّ منجزة');
    P.c.setState({ pfPanel: '' });
    /* المراجِعُ يعيدها ⇒ «الأهم الآن» (أولاً ولو وُجدت جديدة) */
    const rt = await post(W, dm.ck, '/api/tasks/review', { k: DAY, id, ekey: ME.eid, decision: 'return', why: TAG + ' أكمل الصورة' }); assert.equal(rt.status, 200, JSON.stringify(rt.j));
    await P.MT.load(true); t = V(P);
    assert.equal(t.tkFTitle, TT); assert.equal(t.tkFState, 'returned'); assert.match(t.tkFLbl, /أُعيدت إليك/); assert.match(t.tkFFinTxt, /استكمال الإثبات/); assert.match(t.tkFNote, /أكمل الصورة/);
    assert.equal(t.tkRvOn, false); assert.deepEqual(t.tkRest.map((q) => q.title), [TAG + ' حاليةٌ جديدة']);
    await (async () => { const R = refOf(P, id); P.c.tkFinishOpen(R.day, R.i); P.c.setState({ tkImgs: [PNG] }); Vf(P).tkFinGo(); await until(() => ((srvRow(W, id)[21] || {}).h || []).length === 2 && !P.c.state.tkBusy); })();
    t = V(P); assert.notEqual(t.tkFTitle, TT, 'بعد التسليم الثاني: ليست «الأهم الآن» (ولو بقي tkFocus)'); assert.deepEqual(t.tkRv.map((q) => q.title), [TT]);
    /* الاعتماد ⇒ تخرج من «الحالية» كلِّها وتبقى في السجل بقرارها وإثباتها */
    const ap = await post(W, dm.ck, '/api/tasks/review', { k: DAY, id, ekey: ME.eid, decision: 'approve' }); assert.equal(ap.status, 200, JSON.stringify(ap.j));
    await P.MT.load(true); t = V(P);
    assert.ok(!shown(t).includes(TT), 'المعتمَدةُ ليست في «الحالية»: ' + shown(t).join(' | ')); assert.equal(t.tkRvOn, false); assert.equal(t.tkFTitle, TAG + ' حاليةٌ جديدة');
    assert.equal(t.tkDoneN, '1');
    P.c.setState({ pfPanel: 'tklog', tkLogY: T.y, tkLogM: T.m, tkLogF: 'done' }); t = V(P);
    const la = logRows(t).find((q) => q.title === TT);
    assert.ok(la, 'في «سجل مهامك» (منجزة)'); assert.match(la.meta, /اعتمدها/); assert.equal(la.thumbOn, true, 'وصورةُ إثباتها'); assert.equal(srvRow(W, id)[21].imgs.length, 2, 'الإثباتُ كلُّه باقٍ');
  });

  test('[' + mode + '] (1) تعدّدُ المهام: «الحالية» بترتيبها (المُعادة ⇒ الجديدة الأقربُ مهلةً ⇒ الجارية ⇒ القادمة) — والمنقضيةُ والمنجزةُ والمعتذَرُ عنها في السجل وحده', async () => {
    const W = await world({ worker: WU.file, mode });
    const me = await W.login(ME.un, ME.pw), dm = await W.login(...DM);
    const P = page(W, me.ck); await P.MT.load(true);
    /* المُثبِّت: 101 جديدة (مهلةُ +3س) · 110 جماعيةٌ جديدة (+5س) · 103 جارية · 102 قادمةٌ اليوم · 104 غداً · 105 منقضيةٌ أمس · 106 منجزةٌ أمس · 107/109 منجزة · 108 معتذَرٌ عنها */
    let t = V(P);
    const F = (s) => TAG + ' ' + s;
    assert.equal(t.tkFTitle, F('مهمتي اليوم — تنتظر القبول'), 'الجديدةُ الأقربُ مهلةً أولاً');
    assert.deepEqual(t.tkRest.map((q) => q.title), [F('مهمة جماعية'), F('مهمتي اليوم — جارية'), F('مهمتي اليوم — قادمة')]);
    assert.deepEqual(t.tkRest.map((q) => q.pill), ['جديدة', 'جارية', 'قادمة']); assert.equal(t.tkMoreTxt, '+1 أخرى');
    assert.equal(t.tkSub, '5 مهمة — الأهم أولاً'); assert.equal(t.tkNewNz, '2'); assert.equal(t.tkRunNz, '1'); assert.equal(t.tkUpN, '2');
    for (const x of ['انقضت مهلتها', 'منجزة بصورة', 'الشهر الماضي', 'القديمة']) assert.ok(!shown(t).some((s) => s.includes(x)), '«' + x + '» ليست حالية');
    /* المستلَمةُ ولم تبدأ حاليةٌ «جديدة» */
    let R = refOf(P, 1760000000101); P.c.tkAck(R.day, R.i); await until(() => (srvRow(W, 1760000000101)[20] || {}).ack);
    t = V(P); assert.equal(t.tkFTitle, F('مهمتي اليوم — تنتظر القبول')); assert.equal(t.tkFState, 'new'); assert.match(t.tkFLbl, /استلمتَها ولم تبدأ/);
    /* منجزةٌ اليوم + مُعادة: المُعادةُ «الأهم الآن» والمنجزةُ عدٌّ وحده */
    const d = await mkTask(W, dm.ck, 'تُنجز اليوم', { rv: 'none' }), rv = await mkTask(W, dm.ck, 'تُعاد');
    await P.MT.load(true);
    await startAndSubmit(P, W, d.j.rows[0].id); await startAndSubmit(P, W, rv.j.rows[0].id);
    assert.equal((await post(W, dm.ck, '/api/tasks/review', { k: DAY, id: rv.j.rows[0].id, ekey: ME.eid, decision: 'return', why: TAG + ' ناقصة' })).status, 200);
    await P.MT.load(true); P.c.setState({ tkFocus: null }); t = V(P);
    assert.equal(t.tkFTitle, F('تُعاد'), 'المُعادةُ أولاً'); assert.equal(t.tkFState, 'returned');
    assert.deepEqual(t.tkRest.map((q) => q.title), [F('مهمتي اليوم — تنتظر القبول'), F('مهمة جماعية'), F('مهمتي اليوم — جارية')]);
    assert.ok(!shown(t).includes(F('تُنجز اليوم')), 'المنجزةُ اليوم ليست حالية'); assert.equal(t.tkDoneN, '1'); assert.equal(t.tkMoreTxt, '+2 أخرى · 1 منجزة اليوم');
    assert.equal(t.tkSub, '6 مهمة — الأهم أولاً');
  });

  test('[' + mode + '] (5) مهمةٌ جماعية: تسليمُ أحد المكلَّفَين لا يمسّ صفَّ زميله ولا ما يراه — وهي في سجلّ صاحبها وحده', async () => {
    const W = await world({ worker: WU.file, mode });
    const me = await W.login(ME.un, ME.pw), mate = await W.login(MATE.un, MATE.pw), dm = await W.login(...DM);
    const c = await mkTask(W, dm.ck, 'جماعيةٌ للاثنين', { asg: [ME.eid, MATE.eid], rv: 'none' }); assert.equal(c.status, 200, JSON.stringify(c.j));
    const TT = TAG + ' جماعيةٌ للاثنين', idA = c.j.rows.find((r) => (r.ekey || r.e) === ME.eid).id, idB = c.j.rows.find((r) => (r.ekey || r.e) === MATE.eid).id;
    const EB = envOf(MATE.eid);
    const A = page(W, me.ck), B = page(W, mate.ck); await A.MT.load(true); await B.MT.load(true);
    const vB0 = V(B, EB), rB0 = JSON.stringify(srvRow(W, idB, MATE.eid));
    /* P6: الشرطُ المسبق عن TT نفسِها — كان «|| tkNewNz ≥ 1» صادقاً دائماً بصفوف المُثبِّت للزميل فلا يُثبت شيئاً */
    assert.ok(curOf(B, EB).includes(TT), 'عند الزميل حالية (_tkCur)'); assert.ok(shown(vB0).includes(TT), 'وظاهرةٌ له في البطاقة');
    await startAndSubmit(A, W, idA);
    assert.equal(srvRow(W, idA)[3], 'done');
    assert.equal(JSON.stringify(srvRow(W, idB, MATE.eid)), rB0, 'صفُّ الزميل كما هو حرفاً');
    let t = V(A); assert.ok(!shown(t).includes(TT), 'خرجت من حاليةِ صاحبها');
    A.c.setState({ pfPanel: 'tklog', tkLogY: T.y, tkLogM: T.m, tkLogF: 'all' }); t = V(A);
    assert.ok(logRows(t).some((q) => q.title === TT && q.icoOn === true), 'وفي سجلّه');
    await B.MT.load(true); const vB1 = V(B, EB);
    for (const k of ['tkFTitle', 'tkFState', 'tkSub', 'tkNewNz', 'tkRunNz', 'tkUpN', 'tkDoneN', 'tkRvOn', 'tkEmpty', 'tkMoreTxt']) assert.deepEqual(vB1[k], vB0[k], 'الزميل: ' + k);
    assert.deepEqual(vB1.tkRest.map((q) => q.title + '|' + q.pill), vB0.tkRest.map((q) => q.title + '|' + q.pill), 'الزميل: «بقية مهامك» كما هي');
    const mine = B.MT.state().rows.find((r) => String(r.id) === String(idB)); assert.ok(mine && mine.ph !== 'done' && !mine.proof, 'صفُّ الزميل في «مهامي» بلا إنجازٍ ولا إثبات');
    assert.ok(!B.MT.state().rows.some((r) => String(r.id) === String(idA)), 'ولا يصله صفُّ صاحبها');
  });

  test('[' + mode + '] سلسلةُ التكرار: أقربُ نسخةٍ قادمةٍ وحدها في «الحالية» (rid في /api/me/tasks) — والبقيةُ في السجل · والقادمةُ غيرُ المتكررة كما هي', async () => {
    const W = await world({ worker: WU.file, mode });
    const me = await W.login(ME.un, ME.pw), dm = await W.login(...DM);
    await wipe(W, ME.eid);
    const s = Date.now() + 30 * 60e3;
    const c = await post(W, dm.ck, '/api/tasks/create', { k: hij(s), t: TAG + ' سلسلةٌ يومية', s, e: s + HR, asg: [ME.eid], rv: 'none', force: true, rec: { t: 'daily' } });
    assert.equal(c.status, 200, JSON.stringify(c.j));
    const P = page(W, me.ck); await P.MT.load(true);
    const rows = P.MT.state().rows, ser = rows.filter((r) => r.rec);
    assert.ok(ser.length >= 3, 'نُسخُ السلسلة في «مهامي»: ' + ser.length);
    const rid = ser[0].rid; assert.equal(typeof rid, 'string'); assert.ok(rid.length > 0 && ser.every((r) => r.rid === rid), 'rid معرّفُ السلسلة نفسُه لكل نسخة');
    assert.equal(JSON.stringify(rows).includes(MATE.eid), false, 'لا مفاتيحَ لغيري');
    let t = V(P);
    assert.equal(t.tkFTitle, TAG + ' سلسلةٌ يومية'); assert.equal(t.tkFState, 'upcoming');
    const near = ser.slice().sort((a, b) => a.s - b.s)[0], R = P.c._tkMine(E).find((x) => x.r.__x && x.r.__x.id === near.id);
    assert.equal(P.c._tkPlan.focus.day + '#' + P.c._tkPlan.focus.i, R.day + '#' + R.i, 'الأقربُ موعداً');
    assert.deepEqual(t.tkRest, [], 'لا نسخةَ أخرى منها'); assert.equal(t.tkUpN, '1'); assert.equal(t.tkMoreTxt, '');
    P.c.setState({ pfPanel: 'tklog', tkLogY: T.y, tkLogM: T.m, tkLogF: 'all' });
    /* P4: النُّسخُ القادمةُ بعد اليوم ولم تبدأ ليست «سجلاً» (لم يرها الموظف) — كان: نُسخُ الشهر كلُّها في السجل */
    const inMonth = ser.filter((r) => r.y === T.y && r.m === T.m && cmpT(r) <= 0).length;
    assert.equal(logRows(V(P)).filter((q) => q.title === TAG + ' سلسلةٌ يومية').length, inMonth, 'نُسخُ الشهر حتى اليوم وحدها في السجل');
    P.c.setState({ pfPanel: '' });
    const s2 = Date.now() + 26 * HR;
    await post(W, dm.ck, '/api/tasks/create', { k: hij(s2), t: TAG + ' قادمةٌ مفردة', s: s2, e: s2 + HR, asg: [ME.eid], rv: 'none', force: true });
    await P.MT.load(true); t = V(P);
    assert.equal(t.tkUpN, '2'); assert.deepEqual(t.tkRest.map((q) => q.title), [TAG + ' قادمةٌ مفردة'], 'غيرُ المتكررة لا تُطوى');
  });

  /* P1 · tkFocus مفتاحُه «يوم#فهرس»: كان يبقى بعد التسليم — فإذا حُذف صفٌّ قبله في اليوم نفسِه (لغيري) انزاحت الفهارس وثبّت المفتاحُ القديم
     صفّاً آخر «الأهم الآن» (قادمةً قبل جديدةٍ تنتظر الاستلام). الإصلاح: يُمسح بعد التسليم والإنهاء — ويبقى بعد البدء والاستلام والتوثيق والتعثّر والاستئناف */
  test('[' + mode + '] P1 · tkFocus يُمسح بعد التسليم (منجزةً أو للمراجعة) فلا يُثبِّت انزياحُ الفهارس صفّاً آخر — ويبقى بعد البدء والمسودّة والتعثّر والاستئناف والاستلام', async () => {
    const W = await world({ worker: WU.file, mode });
    const me = await W.login(ME.un, ME.pw), dm = await W.login(...DM);
    await wipe(W, ME.eid);
    const mk = async (t, x) => { const c = await mkTask(W, dm.ck, t, x); assert.equal(c.status, 200, JSON.stringify(c.j)); return c.j.rows[0].id; };
    const R1 = await mk('الأقربُ مهلةً', { rv: 'none', e: Date.now() + HR });
    const Dn = await mk('تُنجز', { rv: 'none', e: Date.now() + 3 * HR });
    const U = await mk('قادمة', { rv: 'none', s: Date.now() + 2 * HR, e: Date.now() + 4 * HR });
    const Cr = await mk('للمراجعة', { e: Date.now() + 5 * HR });
    const P = page(W, me.ck); await P.MT.load(true);
    const key = (id) => { const R = refOf(P, id); return R.day + '#' + R.i; };
    assert.equal(V(P).tkFTitle, TAG + ' الأقربُ مهلةً');
    let R = refOf(P, Dn); P.c.tkAccept(R.day, R.i); await until(() => srvRow(W, Dn)[11] && P.c.state.tkFocus);
    assert.equal(P.c.state.tkFocus, key(Dn), 'البدءُ يثبّتها'); assert.equal(V(P).tkFTitle, TAG + ' تُنجز');
    P.c.tkFinishOpen(R.day, R.i); P.c.setState({ tkNote: 'مسودّة' }); P.c.tkFinish('doc'); await until(() => (srvRow(W, Dn)[21] || {}).draft && !P.c.state.tkBusy);
    assert.equal(P.c.state.tkFocus, key(Dn), 'المسودّةُ تُبقيها');
    P.c.tkDeclineOpen(R.day, R.i, 'stall'); P.c.setState({ tkWhy: 'ظرف طارئ' }); P.c.tkDecline(); await until(() => (srvRow(W, Dn)[20] || {}).stall && !P.c.state.pfPanel);
    assert.equal(P.c.state.tkFocus, key(Dn), 'التعثّرُ يُبقيها'); assert.equal(V(P).tkFState, 'stalled');
    P.c.setState({ tkFocus: null }); P.c.tkResume(R.day, R.i); await until(() => !(srvRow(W, Dn)[20] || {}).stall && P.c.state.tkFocus);
    assert.equal(P.c.state.tkFocus, key(Dn), 'الاستئنافُ يثبّتها'); assert.equal(V(P).tkFTitle, TAG + ' تُنجز');
    P.c.tkFinishOpen(R.day, R.i); P.c.setState({ tkNote: 'تم' }); Vf(P).tkFinGo(); await until(() => srvRow(W, Dn)[3] === 'done' && !P.c.state.tkBusy);
    assert.equal(P.c.state.tkFocus, null, 'التسليمُ (منجزة) يمسحه'); assert.equal(V(P).tkFTitle, TAG + ' الأقربُ مهلةً', 'أولويةُ _tkPick');
    /* المدير يحذف صفّاً لغيري قبل صفوفي في اليوم نفسِه ⇒ تنزاح فهارسُ صفوفي (كان المفتاحُ القديم يصير مفتاحَ «قادمة») */
    const S = stored(W.env, KT), j = S[DAY].findIndex((r) => Array.isArray(r) && r[14] !== ME.eid), iD = S[DAY].findIndex((r) => Array.isArray(r) && r[13] === Dn);
    assert.ok(j >= 0 && j < iD, 'صفٌّ لغيري قبل صفوفي: ' + j + ' < ' + iD);
    const old = DAY + '#' + iD; S[DAY].splice(j, 1); await replaceOperationalFixture(W.env, KT, S);
    await P.MT.load(true);
    assert.equal(key(U), old, 'المفتاحُ القديم صار مفتاحَ «قادمة»');
    let t = V(P); assert.equal(t.tkFTitle, TAG + ' الأقربُ مهلةً', 'لا تُثبَّت «قادمة» قبل جديدةٍ تنتظر الاستلام'); assert.equal(t.tkFState, 'new');
    /* التسليمُ للمراجِع: يخرج من «الحالية» ويُمسح tkFocus */
    R = refOf(P, Cr); P.c.tkAccept(R.day, R.i); await until(() => srvRow(W, Cr)[11] && P.c.state.tkFocus === key(Cr));
    P.c.tkFinishOpen(R.day, R.i); P.c.setState({ tkNote: 'سُلّمت' }); Vf(P).tkFinGo(); await until(() => (srvRow(W, Cr)[21] || {}).sub && !P.c.state.tkBusy);
    assert.equal(P.c.state.tkFocus, null, 'التسليمُ (للمراجعة) يمسحه'); t = V(P); assert.equal(t.tkFTitle, TAG + ' الأقربُ مهلةً'); assert.deepEqual(t.tkRv.map((q) => q.title), [TAG + ' للمراجعة']);
    /* الاستلامُ يثبّت (ولو كانت قادمة) */
    R = refOf(P, U); P.c.tkAck(R.day, R.i); await until(() => (srvRow(W, U)[20] || {}).ack && P.c.state.tkFocus);
    assert.equal(P.c.state.tkFocus, key(U)); t = V(P); assert.equal(t.tkFTitle, TAG + ' قادمة'); assert.equal(t.tkFState, 'upcoming');
    void R1;
  });

  /* P4 · «سجل مهامك» ما جرى للموظف: نُسخُ السلسلة القادمةُ بعد اليوم ولم تبدأ ولم يستلمها، وما ألغاه «إنهاءُ التكرار»/«تعديلُه» ولم يُستلم — لم يرها فليست سجلاً.
     والمنجزةُ والمعتذَرُ عنها والمُلغاةُ يدوياً (ولو قادمة) والمستلَمةُ (ثم أُلغيت بالإنهاء) باقية */
  test('[' + mode + '] P4 · «سجل مهامك» بلا نُسخ تكرارٍ لم يرها الموظف — والمنجزةُ والمعتذَرُ عنها والمُلغاةُ يدوياً والمستلَمةُ باقية', async () => {
    const W = await world({ worker: WU.file, mode });
    const me = await W.login(ME.un, ME.pw), dm = await W.login(...DM);
    await wipe(W, ME.eid);
    const s = Date.now() - 30 * 60e3, NM = TAG + ' سلسلةُ السجل';
    const c = await post(W, dm.ck, '/api/tasks/create', { k: hij(s), t: NM, s, e: s + 3 * HR, asg: [ME.eid], rv: 'none', force: true, rec: { t: 'daily', open: 1 } });
    assert.equal(c.status, 200, JSON.stringify(c.j));
    const P = page(W, me.ck); await P.MT.load(true);
    const ser = () => P.MT.state().rows.filter((r) => r.t === NM).sort((a, b) => a.s - b.s);
    const S0 = ser(), fut = S0.filter((r) => cmpT(r) > 0), now0 = S0.filter((r) => cmpT(r) <= 0);
    assert.ok(fut.length >= 4 && now0.length === 1, 'نسخةُ اليوم + القادمة: ' + S0.map((r) => r.k + ':' + r.ph).join(' '));
    /* كلُّ أشهر السلسلة (قد تعبر نهايةَ الشهر) — وسوم صفوفها في السجل */
    const logOf = () => {
      const ms = [...new Set(S0.map((r) => r.y + '-' + r.m))].map((k) => k.split('-').map(Number));
      const out = ms.flatMap(([y, m]) => { P.c.setState({ pfPanel: 'tklog', tkLogY: y, tkLogM: m, tkLogF: 'all' }); return logRows(V(P)).filter((q) => q.title === NM).map((q) => q.pill); });
      P.c.setState({ pfPanel: '' }); return out.sort();
    };
    assert.deepEqual(logOf(), ['تنتظر'], 'قبل أيّ فعل: نسخةُ اليوم وحدها (لا الست القادمة)');
    const act = async (r, a, x) => { const q = await P.MT.act(r, a, x); assert.equal(q.ok, true, a + ' ' + JSON.stringify(q)); };
    await act(fut[0], 'ack');                                                       /* رآها واستلمها */
    await act(fut[1], 'decline', { why: 'ظرف طارئ' });                               /* اعتذر عنها */
    const cn = await post(W, dm.ck, '/api/tasks/cancel', { k: fut[2].k, id: fut[2].id, ekey: ME.eid, why: TAG + ' إلغاءٌ يدوي' }); assert.equal(cn.status, 200, JSON.stringify(cn.j));
    await P.MT.load(true);
    /* نسخةُ اليوم تُنجز */
    let R = refOf(P, now0[0].id); P.c.tkAccept(R.day, R.i); await until(() => srvRow(W, now0[0].id)[11]);
    R = refOf(P, now0[0].id); P.c.tkFinishOpen(R.day, R.i); P.c.setState({ tkNote: 'تم' }); Vf(P).tkFinGo(); await until(() => srvRow(W, now0[0].id)[3] === 'done' && !P.c.state.tkBusy);
    const DONE = logOf().filter((p) => !['تنتظر', 'اعتذار', 'ملغاة'].includes(p));
    assert.equal(DONE.length, 1, 'المنجزةُ في السجل');
    assert.deepEqual(logOf(), DONE.concat(['اعتذار', 'تنتظر', 'ملغاة']).sort(), 'المنجزة · المعتذَرُ عنها · المُلغاةُ يدوياً · المستلَمة — ولا البقيةُ القادمة');
    /* إنهاءُ التكرار ⇒ تُلغى القادمةُ التي لم تبدأ (الخادم: «أُنهي التكرار») — ما لم يُستلم منها ليس سجلاً · والمستلَمةُ باقيةٌ «ملغاة» */
    const st = await post(W, dm.ck, '/api/tasks/recur', { id: S0[0].rid, op: 'stop' }); assert.equal(st.status, 200, JSON.stringify(st.j));
    assert.ok(st.j.cancelled >= 3, 'أُلغيت القادمة: ' + st.j.cancelled);
    await P.MT.load(true);
    const ph = ser().map((r) => r.ph);
    assert.ok(ph.filter((p) => p === 'cancelled').length >= 4, 'في «مهامي» ملغاةٌ كلُّها: ' + ph.join(','));
    assert.deepEqual(logOf(), DONE.concat(['اعتذار', 'ملغاة', 'ملغاة']).sort(), 'بعد الإنهاء: المنجزة · المعتذَرُ عنها · المُلغاةُ يدوياً · المستلَمةُ (ملغاة) — لا نُسخُ «أُنهي التكرار» التي لم يرها');
  });
}

/* Confirmed projection presentation without a cloud command transport. */
test('العرض من projection مؤكدة: المنجزة والمعتذَر عنها خارج الحالية؛ وغياب الخادم يمنع الحفظ المحلي ويبقي طلب البدء غير المحسوم', async () => {
  const D = riyadhDay(), now = Date.now();
  const row = (t, st, o) => Object.assign(['مهمة ' + t, '', 'normal', st, 'normal', 'مضافة', null, ['أ'], 'أنا', 'المدير', 60, null, null, now - 3 * HR, 'e_me', now - HR, now + 3 * HR, null, null, null, null, null], o || {});
  const done = row('منجزة', 'done', { 11: now - 2 * HR, 12: now - HR, 6: ['on_time', 'في الوقت'], 21: { imgs: [], note: 'تم', at: now - HR } }), dec = row('معتذرٌ عنها', 'declined', { 20: { at: now - HR, why: 'ظرف طارئ' } });
  const staff = { id: 's1', role: 'staff', ekey: 'e_me', un: '1000000001', deptId: 'd1', name: 'أنا' };
  const W1 = pfWorld({ user: staff, emps: [{ eid: 'e_me', name: 'أنا' }], tasks: { [D.DK]: [done, dec] }, state: { tkFocus: D.DK + '#0' } });
  let v = W1.v();
  assert.equal(v.tkOn, true); assert.equal(v.tkFocusOn, false, 'tkFocus على منجزة ⇒ لا «الأهم الآن»'); assert.equal(v.tkHas, false); assert.equal(v.tkEmpty, true);
  assert.equal(v.tkEmptyT, EMPTY); assert.equal(v.tkDoneN, '1'); assert.equal(v.tkRest.length, 0);
  W1.c.setState({ tkFocus: null }); v = W1.v(); assert.equal(v.tkFocusOn, false); assert.equal(v.tkEmptyT, EMPTY);
  const W2 = pfWorld({ user: staff, emps: [{ eid: 'e_me', name: 'أنا' }], tasks: { [D.DK]: [done, row('جديدة', 'pending'), dec] }, state: { tkFocus: D.DK + '#0' } });
  v = W2.v();
  assert.equal(v.tkHas, true); assert.equal(v.tkFTitle, 'مهمة جديدة'); assert.equal(v.tkFState, 'new'); assert.equal(v.tkRest.length, 0);
  /* Cloud commands have no local writer; the confirmed row remains pending. */
  const before = JSON.stringify(W2.confirmed('bassam_tasks_v1'));
  await W2.c.tkAccept(D.DK, 1);
  assert.equal(W2.c._pfCanLeaveDraft(), false, 'لا تُسقط مسودة طلب بدء لم يُحسم');
  assert.equal(JSON.stringify(W2.confirmed('bassam_tasks_v1')), before, 'لا نجاح أو كتابة أعمال محلية عند غياب الخادم');
  v = W2.v(); assert.equal(v.tkFTitle, 'مهمة جديدة'); assert.equal(v.tkDoneN, '1');
  assert.throws(() => W2.ctx.localStorage.getItem('bassam_tasks_v1'), /retired business Storage/);
});

/* ── القالب: قسمُ «بانتظار اعتماد المسؤول» في الحالتين (فارغةٍ وممتلئة) ورابطُ «سجل مهامك ←» فيهما ── */
test('القالب: قسمُ «بانتظار اعتماد المسؤول» تحت نصِّ الفراغ وقبل تذييل البطاقة الممتلئة · و«سجل مهامك ←» في الحالتين', () => {
  const v = fs.readFileSync(path.join(ROOT, 'src/modules/profile/view.html'), 'utf8');
  const c0 = v.indexOf('data-pf-tasks="1"'), card = v.slice(c0, v.indexOf('\n</div>\n</sc-if>', c0));
  const em = card.slice(card.indexOf('<sc-if value="{{tkEmpty}}"'), card.indexOf('<sc-if value="{{tkHas}}"')), has = card.slice(card.indexOf('<sc-if value="{{tkHas}}"'));
  for (const [n, s] of [['الفارغة', em], ['الممتلئة', has]]) {
    assert.ok(s.includes('<sc-if value="{{tkRvOn}}"') && s.includes('{{tkRvHead}}') && s.includes('list="{{tkRv}}"'), n + ': قسمُ المراجعة');
    assert.ok(s.includes('onClick="{{tkLogOpen}}"') && s.includes('سجل مهامك ←'), n + ': رابطُ السجل');
  }
  assert.ok(em.indexOf('{{tkEmptyT}}') < em.indexOf('{{tkRvHead}}') && em.indexOf('{{tkRvHead}}') < em.indexOf('سجل مهامك ←'));
  assert.ok(has.indexOf('list="{{tkRest}}"') < has.indexOf('{{tkRvHead}}') && has.indexOf('{{tkRvHead}}') < has.indexOf('class="tk-foot"'));
});

/* ── P2 (قائمٌ قبل 265 — ليس من تغيير «الحالية»): فشلُ قراءة «مهامي» (لا اتصال · 5xx · 401 · 429) كان يُعاد فوراً مع كل رسم — الفشلُ يُطلق
   emit ⇒ setState ⇒ رسمٌ يرى rows=null (أو MS.at قديماً: لا يتقدّم إلا بالنجاح) ⇒ قراءةٌ أخرى: ~750 طلباً/ث. هنا ساعةٌ ومؤقّتاتٌ مزيّفة
   (كلُّ setState ⇒ رسمٌ مؤجَّلٌ واحد كإطار العمل · ورسمٌ كلَّ ثانية كساعات الصفحة) فتُعدّ الطلباتُ في عشر دقائق محاكاة ── */
function clockPage() {
  let now = Date.now(), seq = 0, pend = 0;
  const Q = [], L = {}, hits = [], KIVO = {}, RD = Date;
  class FD extends RD { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return now; } }
  const fx = { impl: null };
  const ctx = { KIVO, console, Intl, Date: FD, Math, JSON, Promise, Object, Array, String, Number, RegExp, Set, Map, Error, isNaN, parseInt, encodeURIComponent, decodeURIComponent,
    setTimeout: (f, ms) => (Q.push({ id: ++seq, at: now + (+ms || 0), f }), seq), clearTimeout: (id) => { const k = Q.findIndex((q) => q.id === id); if (k >= 0) Q.splice(k, 1); },
    setInterval: () => 0, clearInterval: () => 0,
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, document: { hidden: false, querySelector: () => null }, navigator: { userAgent: 'node' } };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.__BS_BOOT = { srv: 1, cf: 1 };
  ctx.CustomEvent = class { constructor(t, o) { this.type = t; this.detail = o && o.detail; } };
  ctx.addEventListener = (t, f) => { (L[t] = L[t] || []).push(f); }; ctx.removeEventListener = (t, f) => { L[t] = (L[t] || []).filter((x) => x !== f); }; ctx.dispatchEvent = () => true;
  ctx.fetch = (url, o) => { if (/\/api\/me\/tasks/.test(String(url))) hits.push(now); return fx.impl(String(url), o); };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/services/545-task-self.js'), 'utf8'), ctx);
  KIVO.BassamCount = (n, w) => n + ' ' + w;
  let render = () => {};
  class DCLogic { constructor() { this.state = {}; } setState(p) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); if (!pend) { pend = 1; ctx.setTimeout(() => { pend = 0; render(); }, 0); } } }
  KIVO.BassamPageKit = { base: (Bc) => class extends Bc { bsOn() { return true; } bsToast() {} bsAck() { return Promise.resolve(true); } MONTHS() { return '١ ٢ ٣ ٤ ٥ ٦ ٧ ٨ ٩ ١٠ ١١ ١٢'.split(' '); } } };
  ctx.DCLogic = DCLogic;
  vm.runInContext(fs.readFileSync(LOGIC, 'utf8') + '\n;globalThis.__C = Component;', ctx, { filename: 'profile/logic.js' });
  const c = new ctx.__C(); c.state = Object.assign({ pfPanel: '' }, c.state || {}); c._pfAlive = true;
  const P = { c, MT: KIVO.BassamMyTasks, hits, L, fx, steps: 0 };
  render = () => c._tkVals({}, E, c.state);
  const tick = () => { render(); ctx.setTimeout(tick, 1e3); };
  /* يُشغّل المؤقّتات حتى now+ms (مع تفريغ الوعود بعد كلٍّ منها) — وسقفٌ للحلقة المحمومة */
  P.run = async (ms) => {
    const end = now + ms;
    for (;;) {
      await new Promise((r) => setImmediate(r));
      Q.sort((a, b) => a.at - b.at || a.id - b.id);
      if (!Q.length || Q[0].at > end || P.steps > 2e4) break;
      const q = Q.shift(); now = Math.max(now, q.at); P.steps++; q.f();
    }
    now = Math.max(now, end); await new Promise((r) => setImmediate(r));
  };
  P.start = () => tick();
  return P;
}
const FAILS = {
  offline: () => Promise.reject(new TypeError('Failed to fetch')),
  http500: async () => ({ ok: false, status: 500, text: async () => '<html>err</html>' }),
  session401: async () => ({ ok: false, status: 401, text: async () => '{"ok":0,"err":"session"}' }),
  rate429: async () => ({ ok: false, status: 429, text: async () => '{"ok":0,"err":"rate"}' }),
};
const OKR = async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ ok: 1, me: { linked: true, by: 'eid', dept: 'd1' }, rev: 7, rows: [] }) });
test('P2 · session401 بعد 2f7d091: انتهاءُ الجلسة نهائيّ — طلبٌ واحد ثم لا قراءةَ خاصةً أخرى (لا مهلة ولا إعادة) ورسالةُ الجلسة', async () => {
  const P = clockPage(); P.fx.impl = FAILS.session401;
  P.start(); await P.run(10 * 60e3);
  assert.ok(P.steps <= 2e4, 'لا حلقةَ محمومة');
  assert.equal(P.hits.length, 1, 'طلبٌ واحد ثم توقّف: ' + P.hits.length);
  const t = V(P);
  assert.equal(t.tkEmptyT, 'تعذّر تحميل مهامك'); assert.equal(t.tkLoad, false);
  assert.equal(t.tkEmptyS, 'انتهت الجلسة — سجّل الدخول مجدداً لعرض مهامك', 'نصُّ انتهاء الجلسة لا وعدُ إعادةٍ تلقائية');
  assert.equal(t.tkRetryOn, false, 'لا زرَّ «أعد المحاولة» بعد 401 — الخدمة لا تعيد');
  (P.L.online || []).forEach((f) => f()); await P.run(61e3);
  assert.equal(P.hits.length, 1, 'ولا عودةُ الاتصال تقرأ بجلسةٍ منتهية');
});
for (const kind of Object.keys(FAILS).filter((k) => k !== 'session401')) {
  test('P2 · فشلُ قراءة «مهامي» (' + kind + ') لا يُعاد مع كل رسم: مهلةٌ متضاعفة 5ث ⇒ 60ث · «أعد المحاولة» وعودةُ الاتصال فوراً · وبعد النجاح دورةُ الدقيقة', async () => {
    const P = clockPage(); P.fx.impl = FAILS[kind];
    P.start(); await P.run(10 * 60e3);
    const g = P.hits.slice(1).map((h, i) => h - P.hits[i]);
    assert.ok(P.steps <= 2e4, 'لا حلقةَ محمومة (خطوات المؤقّتات: ' + P.steps + ' · طلبات: ' + P.hits.length + ')');
    assert.ok(P.hits.length >= 8 && P.hits.length <= 16, kind + ': طلباتٌ محدودة في عشر دقائق (كانت آلافاً): ' + P.hits.length);
    assert.ok(g.every((d) => d >= 5e3 && d <= 62e3), 'الفواصل بين 5ث و60ث: ' + g.join(','));
    assert.ok(g.slice(-3).every((d) => d >= 6e4), 'السقفُ دقيقة: ' + g.join(','));
    let t = V(P);
    assert.equal(t.tkLoad, false); assert.equal(t.tkEmptyT, 'تعذّر تحميل مهامك'); assert.match(t.tkEmptyS, /تُعاد المحاولة تلقائياً/);
    assert.equal(t.tkRetryOn, true, 'زرُّ «أعد المحاولة»');
    /* المحاولةُ اليدوية فوراً */
    let n = P.hits.length; Vf(P).tkRetry(); await P.run(50);
    assert.equal(P.hits.length, n + 1, 'اليدويةُ تقرأ فوراً'); await P.run(3e3); assert.equal(P.hits.length, n + 1, 'ثم المهلةُ من جديد (لا فورية)');
    /* عودةُ الاتصال */
    n = P.hits.length; assert.ok((P.L.online || []).length >= 1, 'مستمعُ online'); P.L.online.forEach((f) => f()); await P.run(50);
    assert.equal(P.hits.length, n + 1, 'online يقرأ فوراً');
    /* النجاح ⇒ «لا توجد لديك مهام حالية» ثم دورةُ الدقيقة (لا أسرع) */
    P.fx.impl = OKR; await P.run(61e3);
    t = V(P); assert.equal(t.tkEmptyT, EMPTY); assert.equal(t.tkRetryOn, false);
    n = P.hits.length; await P.run(5 * 60e3);
    assert.ok(P.hits.length - n >= 4 && P.hits.length - n <= 6, 'بعد النجاح كلَّ دقيقة: ' + (P.hits.length - n));
  });
}

/* ── P4 (القاعدةُ وحدها): «عُدّل التكرار» كـ«أُنهي التكرار» · والإلغاءُ اليدوي والمستلَمةُ ونسخةُ اليوم وغيرُ المتكررة باقية ── */
test('P4 · _tkUnseen: ما لا يراه الموظف من نُسخ السلسلة وحده', () => {
  const { c } = page(null, null), T0 = { y: 1448, m: 5, d: 10 };
  const q = (st, d, x, r11, rid = 'R1') => { const r = []; r[11] = r11 || null; r.__x = Object.assign({ rid }, x || {}); return { y: 1448, m: 5, d, st, r }; };
  const can = (why, o) => Object.assign({ can: { at: 1, why } }, o || {});
  const cases = [
    [q('upcoming', 11), true, 'قادمةٌ بعد اليوم لم تبدأ'], [q('new', 12), true, 'جديدةٌ بعد اليوم'],
    [q('cancelled', 12, can('عُدّل التكرار')), true, 'ألغاها تعديلُ التكرار'], [q('cancelled', 9, can('أُنهي التكرار')), true, 'ألغاها إنهاءُ التكرار'],
    [q('upcoming', 10), false, 'نسخةُ اليوم'], [q('upcoming', 11, { ack: 5 }), false, 'استلمها'], [q('upcoming', 11, null, null, ''), false, 'غيرُ متكررة'],
    [q('cancelled', 12, can('سببٌ يدوي')), false, 'إلغاءٌ يدوي'], [q('cancelled', 12, can('أُنهي التكرار', { ack: 5 })), false, 'استلمها ثم أُنهي التكرار'],
    [q('cancelled', 12, can('أُنهي التكرار'), 7), false, 'بدأها'], [q('done', 12, null, 7), false, 'منجزة'], [q('declined', 12), false, 'اعتذر'], [q('expired', 9), false, 'منقضية'],
  ];
  for (const [t, want, n] of cases) assert.equal(c._tkUnseen(t, T0), want, n);
});

/* ── P5: فروعُ «الأهم الآن» للمنجزة والمسلَّمة لم تعد تُبلغ (البطاقةُ من _tkCur وحده) — حُذفت مع _tkLive غيرِ المقروء ── */
test('P5 · لا فروعَ ميتةً في بطاقة «الأهم الآن»: لا «آخر ما أنجزت اليوم» ولا شريطَ «يراجعها … تصلك النتيجة» ولا _tkLive', () => {
  const src = fs.readFileSync(LOGIC, 'utf8');
  assert.ok(!/_tkLive\b/.test(src), '_tkLive');
  assert.ok(!src.includes('آخر ما أنجزت اليوم'), 'وسمُ المنجزة في «الأهم الآن»');
  assert.ok(!src.includes('— تصلك النتيجة في الجرس"'), 'شريطُ المراجعة في «الأهم الآن» (قسمُ «بانتظار اعتماد المسؤول» يعرضها)');
});
