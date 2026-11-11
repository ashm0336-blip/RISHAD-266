import './clock.mjs';   /* V7 P3: ساعةُ الاختبار المثبَّتة (1448-5-9) — كان يُخفق في أول الشهر الهجري وبعد تبدّل الشهر (يُستورد أولاً) */
import { attachTaskOperations, taskText } from './tasks_vm_operations_fx.mjs';
import { replaceOperationalFixture } from './operational_legacy_seed_fx.mjs';
import { taskCommandBody } from './tasks_fx.mjs';
/* KIVO_264 · KIVO-Tasks (المرحلة الثانية) — صفحةُ المهام الحقيقية (src/modules/tasks/logic.js في vm + KIVO.BassamPageKit الحقيقي) على العامل الحقيقي:
   الإنشاءُ من الخادم بالإعدادات المتقدمة (ق2 سياسةُ الإثبات · ق3 المراجِع · الاعتذار) و«نوع المهمة» الظاهر (ق5 التكرار — KIVO_265) · الأهليةُ «غير متاح» تُكشف قبل الإسناد ·
   مراجعةُ التسليم من الصفّ (اعتماد/إعادة بسبب) · حالاتُ سير العمل في الجدول واللوحة والفلتر · التعديلُ يحفظ 22 و23 · تغييرُ المكلَّف بعد نشاطه يُمنع (RC-13)
   · «غير مرتبطة» شارةٌ وربطٌ يدوي (ق4). بياناتٌ اصطناعية (tasks_fx). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { ROOT, moduleLogic } from './harness.mjs';
import { world, workerUnderTest, ME, MATE, KT, KE, D, DAY, stored, rowsOf, row, putKV, PNG, hij } from './tasks_fx.mjs';

const WU = workerUnderTest();
const LOGIC = moduleLogic('tasks');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 4000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(20); } return false; }
/* الصفحةُ لمدير الإدارة: تخزينُها المحلي = قيمُ الخادم · fetch يمرّ إلى العامل بجلسة المدير (كما في المتصفح) · __BS_BOOT.srv = 1 */
async function page(W, ck, storeJson, emps) {
  const store = new Map([['bassam_tasks_v1', storeJson], ['bassam_employees_v1', JSON.stringify(emps)]]);
  const KIVO = {}, toasts = [];
  const ctx = { KIVO, console, Intl, Date, Math, JSON, Promise, Object, Array, String, Number, RegExp, Set, Map, Error, isNaN, parseInt, setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => 0,
    localStorage: { getItem: (k) => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    document: { hidden: false, querySelector: () => null, addEventListener: () => {}, removeEventListener: () => {} }, navigator: { userAgent: 'node' }, addEventListener: () => {}, removeEventListener: () => {},
    __BS_BOOT: { srv: 1 },
    fetch: (u, o) => W.C.req(u, { method: (o && o.method) || 'GET', body: o && o.body, cookie: ck, headers: (o && o.headers) || {} }) };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ['src/services/490-emp-key.js', 'src/services/440-count.js', 'src/services/546-task-model.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
  KIVO.BassamPerm = { can: () => true, on: () => true }; KIVO.bsPct = (a, b) => (b ? Math.round(100 * a / b) : 0) + '٪';
  KIVO.BassamAuth = { user: () => ({ id: 'tst_dm1', role: 'staff', mgr: true, ekey: 'mgr:tst_d1', deptId: D, name: 'TEST_ONLY مدير' }), display: () => ({ name: 'TEST_ONLY مدير' }),
    users: () => [{ id: 'tst_dm1', role: 'staff', mgr: true, ekey: 'mgr:tst_d1', deptId: D, name: 'TEST_ONLY مدير' }, { id: 'tst_gm1', role: 'gm', name: 'TEST_ONLY مدير عام' }] };
  KIVO.BassamDepts = { active: () => D };
  KIVO.BassamSup = { isSup: () => false };
  class DCLogic { constructor() { this.state = {}; } setState(p, cb) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); cb && cb(); } }
  ctx.DCLogic = DCLogic;
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/components/565-page-kit.js'), 'utf8'), ctx);
  const B0 = KIVO.BassamPageKit.base; KIVO.BassamPageKit.base = (B, a) => class extends B0(B, a) { bsOn() { return true; } bsToast(m, k) { toasts.push([m, k]); } bsAck(m, k) { toasts.push([m, k || 'ok']); return Promise.resolve(true); } };
  vm.runInContext(LOGIC + '\n;globalThis.__C = Component;', ctx, { filename: 'tasks/logic.js' });
  const opsFixture = await attachTaskOperations(ctx, { store, W, ck });
  const c = new ctx.__C(); c._tkDayDef = () => 0;   /* اختباراتُ الشهر كاملاً (KIVO_265 · كروتُ الأيام: الافتراضي يومُ اليوم) */ c.state = Object.assign({}, c.state || {}, { locked: {} });
  c.bsToast = (m, k) => toasts.push([m, k || 'err']);                 /* الصفحةُ تعرّف bsToast بنفسها (DOM) — يُلتقط هنا */
  return { c, opsFixture, store, toasts, sync: async () => { await opsFixture.sync(); c._tkLSBust(); c.setState({ tasksAll: opsFixture.operations.get("bassam_tasks_v1") || {} }); } };
}
const flatRows = (V) => (V.tlist || V.rows || []).concat(...((V.tlist || V.rows || []).map(t => t.kids || [])));
function findRow(V, id) { for (const t of [].concat(V.rows || [], V.trows || [], V.tasks || [])) if (t && t.tkcT && t.tkcT[13] === id) return t; return null; }
/* صفوفُ الجدول في القيم: نبحث في كل قائمةٍ تحمل tkcT */
function allRows(V) { const out = []; const seen = new Set(); const walk = (o, d) => { if (!o || typeof o !== 'object' || d > 4 || seen.has(o)) return; seen.add(o); if (o.tkcT && Array.isArray(o.tkcT)) out.push(o); for (const k of Object.keys(o)) { const v = o[k]; if (Array.isArray(v)) v.forEach(x => walk(x, d + 1)); else if (v && typeof v === 'object' && k !== 'tkcT') walk(v, d + 1); } }; walk(V, 0); return out; }

test('الصفحة · الإنشاءُ من الخادم بالإعدادات المتقدمة → التسليمُ للمراجعة يظهر في الصف واللوحة والفلتر → الإعادةُ بسببٍ من الصف · التعديلُ يحفظ 22/23 · لا تغييرَ للمكلَّف بعد نشاطه', async () => {
  const W = await world({ worker: WU.file }); const dm = await W.login('0000000101', '70101'), me = await W.login(ME.un, ME.pw);
  const g = await W.C.api("/api/operations/read?keys=" + encodeURIComponent(KT + ',' + KE), { cookie: dm.ck });
  const P = await page(W, dm.ck, taskText(g.j, KT), JSON.parse(taskText(g.j, KE)));
  /* يومُ النموذج = اليومُ الهجريّ المدنيّ لبدايتها (لا «اليوم التشغيلي» بمهلته — بين 00:00 و03:00 يختلفان) · والساعةُ بعد ساعتين بتوقيت هذا الجهاز */
  const h = new Date(Date.now() + 2 * 3600e3), [y, m, d] = hij(h.getTime()).split('-').map(Number), H12 = (h.getHours() % 12) || 12, AP = h.getHours() >= 12 ? 'م' : 'ص';
  /* (1) الإنشاء: صورتان + خطوتان · المراجِعُ أنا · لا اعتذار · يومياً لأسبوع — والمعاينةُ تلخّص الإعدادات قبل الاعتماد */
  P.c.setState({ year: y, month: m, newTaskOpen: true, editRef: null, newTitle: 'TEST_ONLY من صفحة المهام', newDesc: 'تفاصيل', newPrio: 'high', newAsg: 'direct', newPick: { [ME.eid]: ME.name }, pickWt: '',
    newDay: d, newEDay: d, newSh: H12, newSm: 0, newSap: AP, newEh: H12, newEm: 45, newEap: AP, newPol: 'img', newPolN: 2, newSteps: 'TEST_ONLY الخطوة أ\nTEST_ONLY الخطوة ب', newRv: 'creator', newDecOk: false, newRec: 'daily', newRecEnd: 'date', newRecTo: 'w1', newAdvOpen: true });
  let V = P.c.renderVals();
  assert.equal(V.advOn, true); assert.match(V.advSum, /2 صور/); assert.match(V.advSum, /خطوات/); assert.match(V.advSum, /لا اعتذار/);
  /* KIVO_265 · قرارُ المالك (تغييرٌ مقصود في هذا التأكيد): التكرارُ خرج من «إعدادات متقدمة» إلى «نوع المهمة» الظاهر في النموذج — ملخّصُه هناك
     لا في advSum (كان: advSum يطابق «يومياً»)، والنهايةُ «في تاريخ» صراحةً (newRecEnd) بعد أن صار الافتراضيُّ «حتى الإيقاف» */
  assert.doesNotMatch(V.advSum, /يومياً|تتكرر/); assert.equal(V.tkRecOn, true); assert.equal(V.tkRecTypes[1].aria, 'true'); assert.match(V.tkRecSum, /^تتكرر يومياً · من \d+-\d+-\d+ حتى \d+-\d+-\d+$/);
  assert.ok(V.advRvOpts.some(o => o.v === 'tst_gm1'), 'مراجِعٌ آخر قابلٌ للاختيار');
  await V.submitTask();
  assert.ok(await until(() => !P.c.state.newTaskOpen), 'أُغلق النموذج بعد ردّ الخادم: ' + JSON.stringify(P.toasts));
  const mine = rowsOf(stored(W.env, KT), ME.eid).filter(q => q.r[0] === 'TEST_ONLY من صفحة المهام');
  assert.ok(mine.length >= 1, 'أُنشئت في الخادم'); const r0 = mine.find(q => q.day === y + '-' + m + '-' + d) || mine[0], x = r0.r[23];
  assert.deepEqual(x.pol, { m: 'img', n: 2, steps: ['TEST_ONLY الخطوة أ', 'TEST_ONLY الخطوة ب'] }); assert.equal(x.rv.u, 'tst_dm1'); assert.equal(x.dec, 0); assert.equal(x.rec.t, 'daily'); assert.ok(x.rec.to);
  assert.equal(typeof r0.r[22], 'string', 'طابعُ هوية الكيان'); assert.ok(P.toasts.some(([t, k]) => k === 'ok' && /أُسندت/.test(t)));
  /* (2) الموظفُ يبدأ ويسلّم بصورتين وخطوتيه ⇒ بانتظار المراجعة */
  const k = r0.day, id = r0.r[13];
  { const S9 = stored(W.env, KT); const q9 = S9[k].find((r) => r[13] === id); q9[15] = Date.now() - 3600e3; q9[16] = Date.now() + 3600e3; await replaceOperationalFixture(W.env, KT, S9); }   /* KIVO_265 · نافذةُ التنفيذ: لا بدءَ قبل الموعد — وساعةُ النموذج بتوقيت الجهاز قد تقع بعد يوم؛ يُقدَّم موعدُ الصفّ إلى الآن */
  const up = async (i) => { const iid = 'img_tskpg' + i + '_x' + i; await W.C.api('/api/img/' + iid, { method: 'PUT', cookie: me.ck, body: PNG, headers: { 'Content-Type': 'text/plain' } }); return iid; };
  assert.equal((await W.C.api('/api/me/tasks/act', { method: 'POST', cookie: me.ck, body: { k, id, act: 'decline', why: 'x' } })).j.err, 'policy', 'لا اعتذار بسياسة المهمة');
  await W.C.api('/api/me/tasks/act', { method: 'POST', cookie: me.ck, body: { k, id, act: 'start' } });
  const sb = await W.C.api('/api/me/tasks/act', { method: 'POST', cookie: me.ck, body: { k, id, act: 'submit', imgs: [await up(1), await up(2)], steps: { 'TEST_ONLY الخطوة أ': true, 'TEST_ONLY الخطوة ب': true } } });
  assert.equal(sb.status, 200, JSON.stringify(sb.j)); assert.equal(sb.j.row.review, 'pending');
  await P.sync(); V = P.c.renderVals();
  const R = allRows(V).find(t => t.tkcT[13] === id); assert.ok(R, 'الصفُّ في الجدول');
  assert.equal(R.status, 'review'); assert.equal(R.stLabel, 'بانتظار المراجعة'); assert.equal(R.p2Review, true); assert.equal(R.p2RevBtns, true); assert.match(R.p2ReviewTxt, /المراجِع/);
  assert.ok(R.rmItems.some(q => q.name === 'اعتماد الإنجاز') && R.rmItems.some(q => q.name === 'سجل المهمة'), 'قائمةُ الصف: اعتماد · سجل');
  assert.ok(V.kanbanCols.find(c => c.key === 'in_progress').tasks.some(t => t.tkcT[13] === id), 'اللوحة: «بانتظار المراجعة» في عمود «جارية» (لا يسقط)');
  P.c.setState({ fStatus: 'review' }); assert.ok(allRows(P.c.renderVals()).every(t => t.status === 'review'), 'الفلتر بحالة المراجعة'); P.c.setState({ fStatus: 'all' });
  /* (3) الإعادةُ بسببٍ من الصفّ: بلا سبب ⇒ رسالة · بسبب ⇒ الخادم يكتب x.rev returned */
  R.p2Return({ stopPropagation() {} }); V = P.c.renderVals(); assert.equal(V.tkActOn, true); assert.equal(V.tkActHead, 'إعادة لاستكمال الإثبات');
  V.tkActDo(); assert.match(P.c.state.tkActErr, /ينقص/);
  P.c.renderVals().onTkActWhy({ target: { value: 'TEST_ONLY الصورة الثانية غير واضحة' } }); P.c.renderVals().tkActDo();
  assert.ok(await until(() => !P.c.state.tkAct), 'أُغلقت النافذة بعد ردّ الخادم: ' + P.c.state.tkActErr);
  const r1 = stored(W.env, KT)[k].find(q => q[13] === id); assert.equal(r1[23].rev.st, 'returned'); assert.equal(r1[23].rev.why, 'TEST_ONLY الصورة الثانية غير واضحة');
  await P.sync(); assert.equal(allRows(P.c.renderVals()).find(t => t.tkcT[13] === id).status, 'returned');
  /* (4) التعديلُ من الصفحة يحفظ 22 و23 (والإثبات) — وتغييرُ المكلَّف بعد نشاطه يُمنع ويُوجَّه إلى «إعادة إسناد» */
  const day = +k.split('-')[2], i = stored(W.env, KT)[k].findIndex(q => q[13] === id);
  const editBase = { year: +k.split('-')[0], month: +k.split('-')[1], newTaskOpen: true, newDesc: 'تفاصيل', newPrio: 'high', newDay: day, newEDay: day, newSh: H12, newSm: 0, newSap: AP, newEh: H12, newEm: 45, newEap: AP,
    newAsg: 'direct', pickWt: '', newDur: '45', editRef: { d: day, i, grp: null, grpLabel: '' }, newAdvTouched: false };
  P.c._tkOpen(Object.assign({}, editBase, { newTitle: 'TEST_ONLY عنوانٌ معدَّل', newPick: { [MATE.eid]: MATE.name } }));
  { const pi = JSON.parse(P.store.get('bassam_tasks_v1'))[k][i]; assert.ok(pi && pi[13] === id && pi[14] === ME.eid && pi[11], 'صفُّ الصفحة نفسُه: ' + JSON.stringify(pi && [pi[13], pi[14], pi[11], k, i, P.c.state.year, P.c.state.month, P.c.state.editRef])); }
  const before = P.store.get('bassam_tasks_v1'); await P.c.renderVals().submitTask();
  assert.equal(P.store.get('bassam_tasks_v1'), before, 'لم يُكتب شيء'); assert.ok(P.toasts.some(([t]) => /إعادة إسناد/.test(t)), 'رسالةٌ توجّه إلى إعادة الإسناد: ' + JSON.stringify(P.toasts.slice(-3)));
  P.c.setState(Object.assign({}, editBase, { newTitle: 'TEST_ONLY عنوانٌ معدَّل', newPick: { [ME.eid]: ME.name } }));
  await P.c.renderVals().submitTask();
  const r2 = stored(W.env, KT)[k].find(q => q[13] === id);
  assert.equal(r2[0], 'TEST_ONLY عنوانٌ معدَّل'); assert.equal(r2[22], r1[22], 'الطابع (22) باقٍ'); assert.deepEqual(r2[23], r1[23], 'حقولُ الإدارة (23) باقية'); assert.deepEqual(r2[21], r1[21], 'والإثبات');
  /* (5) ق5 · سلسلةُ التكرار من قائمة الصفّ: إيقافٌ مؤقت (كلُّ نسخها) ثم استئناف — بلا سبب مطلوب · والخادمُ يحكم (task.edit) */
  await P.sync(); V = P.c.renderVals();
  const RR = allRows(V).find(t => t.tkcT[13] === id), recId = r2[23].rec.id;
  const pz = RR.rmItems.find(q => q.name === 'إيقاف التكرار مؤقتاً'); assert.ok(pz && RR.rmItems.some(q => q.name === 'إنهاء سلسلة التكرار'), 'قائمةُ الصف: إيقافُ التكرار وإنهاؤه');
  pz.run(); V = P.c.renderVals(); assert.equal(V.tkActHead, 'إيقاف التكرار مؤقتاً'); assert.equal(V.tkActWhyOn, false, 'لا سببَ مطلوب'); V.tkActDo();
  assert.ok(await until(() => !P.c.state.tkAct), 'أُغلقت النافذة: ' + P.c.state.tkActErr);
  const ser = () => { const S = stored(W.env, KT), o = []; for (const dk in S) for (const q of S[dk] || []) if (Array.isArray(q) && q[23] && q[23].rec && q[23].rec.id === recId) o.push(q); return o; };
  assert.ok(ser().length >= 1 && ser().every(q => q[23].rec.paused === 1), 'أُوقفت السلسلةُ كلُّها: ' + ser().length);
  await P.sync(); const RS = allRows(P.c.renderVals()).find(t => t.tkcT[13] === id);
  RS.rmItems.find(q => q.name === 'استئناف التكرار').run(); P.c.renderVals().tkActDo();
  assert.ok(await until(() => !P.c.state.tkAct), 'أُغلقت النافذة'); assert.ok(ser().every(q => q[23].rec.paused === 0), 'استُؤنفت');
  assert.ok(P.toasts.some(([t]) => /استُؤنف التكرار/.test(t)));
});

test('الصفحة · «غير مرتبطة» شارةٌ وربطٌ يدويّ من قائمة الصف (ق4) · التمديدُ من القائمة · الأهليةُ «غير متاح» تُكشف عند الإنشاء ولا يُنشأ إلا بالتأكيد', async () => {
  const W = await world({ worker: WU.file }); const dm = await W.login('0000000101', '70101');
  const S = stored(W.env, KT); S[DAY].push(row({ id: 1760000077001, title: 'مسندةٌ بالاسم', eid: ME.name })); await replaceOperationalFixture(W.env, KT, S);
  const g = await W.C.api("/api/operations/read?keys=" + encodeURIComponent(KT + ',' + KE), { cookie: dm.ck });
  const P = await page(W, dm.ck, taskText(g.j, KT), JSON.parse(taskText(g.j, KE)));
  const [y, m] = DAY.split('-').map(Number); P.c.setState({ year: y, month: m });
  let R = allRows(P.c.renderVals()).find(t => t.tkcT[13] === 1760000077001);
  assert.equal(R.p2Unl, true); assert.equal(R.p2UnlTxt, 'غير مرتبطة');
  const it = R.rmItems.find(q => /ربط بموظف/.test(q.name)); assert.ok(it, 'قائمةُ الصف: ربط');
  it.run({ stopPropagation() {} }); let V = P.c.renderVals();
  assert.equal(V.tkActHead, 'ربط المهمة بسجلّ موظف');
  /* KIVO_265 · L-2: المرشَّحُ بالاسم اقتراحٌ يُعرض لا اختيار — والربطُ باختيارٍ صريحٍ من القائمة (كان يُختار تلقائياً) */
  assert.equal(P.c.state.tkActTo, '', 'لا اختيارَ تلقائيّ بالاسم'); assert.match(V.tkActSub, /اقتراحٌ بالاسم: «/, 'المرشَّحُ مقترحٌ للتأكيد');
  V.onTkActTo({ target: { value: ME.eid } }); V = P.c.renderVals();
  V.tkActDo(); assert.ok(await until(() => !P.c.state.tkAct), P.c.state.tkActErr);
  assert.equal(stored(W.env, KT)[DAY].find(q => q[13] === 1760000077001)[14], ME.eid);
  /* التمديد: صفُّ «أمس» المنقضي ⇒ +3 ساعات */
  await P.sync();
  const yd = Object.keys(stored(W.env, KT)).find(k2 => (stored(W.env, KT)[k2] || []).some(q => q[13] === 1760000000105));
  P.c.setState({ year: +yd.split('-')[0], month: +yd.split('-')[1] });
  R = allRows(P.c.renderVals()).find(t => t.tkcT[13] === 1760000000105);
  R.rmItems.find(q => q.name === 'تمديد المهلة').run({ stopPropagation() {} }); V = P.c.renderVals();
  assert.equal(V.tkActExtOn, true); V.tkActExts[1].click(); P.c.renderVals().tkActDo();
  assert.ok(await until(() => !P.c.state.tkAct), P.c.state.tkActErr);
  assert.ok(stored(W.env, KT)[yd].find(q => q[13] === 1760000000105)[16] > Date.now(), 'مُدّدت');
  /* الأهليةُ عند الإنشاء: tst_e_emp1 (وردية TST-A 06–14) في 03:00 الغد ⇒ «غير متاح» ⇒ نافذةُ تأكيد — ثم «إسنادٌ رغم ذلك» */
  const T0 = Math.floor((Date.now() + 3 * 3600e3) / 864e5) * 864e5 - 3 * 3600e3 + 864e5;
  const Sf = stored(W.env, 'bsdept:' + D + ':bassam_staffing_v3') || {}; const hk = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date(T0 + 12 * 3600e3)).reduce((o, p) => (o[p.type] = +p.value, o), {});
  const ym = hk.year + '-' + hk.month; Sf[ym] = Sf[ym] || {}; Sf[ym].tst_e_emp1 = { shift: 'TST-A', rest: [] }; await replaceOperationalFixture(W.env, 'bsdept:' + D + ':bassam_staffing_v3', Sf);
  const sMs = T0 + 3 * 3600e3, eMs = sMs + 3600e3;
  P.c._tkCreateSrv({ k: hk.year + '-' + hk.month + '-' + hk.day, t: 'TEST_ONLY خارج الوردية', s: sMs, e: eMs, asg: ['tst_e_emp1'], pol: { m: 'any' }, rv: 'creator', dec: 1 });
  assert.ok(await until(() => !!P.c.state.tkElig), 'نافذةُ الأهلية: ' + JSON.stringify(P.toasts));
  V = P.c.renderVals(); assert.equal(V.tkEligOn, true); assert.equal(V.tkEligItems[0].res, 'غير متاح'); assert.match(V.tkEligItems[0].why, /خارج وقت ورديته/);
  V.tkEligForce(); assert.ok(await until(() => !P.c.state.tkElig && !P.c.state.tkBusy), 'أُنشئت بالتأكيد');
  assert.ok(Object.values(stored(W.env, KT)).flat().some(q => q[0] === 'TEST_ONLY خارج الوردية' && q[23].elig.res === 'غير متاح'), 'وحُفظ الحكمُ في x.elig');
});
