import './clock.mjs'; // Initialize the fixture clock before every other import.
import { attachTaskOperations, taskText } from './tasks_vm_operations_fx.mjs';
import { replaceOperationalFixture } from './operational_legacy_seed_fx.mjs';
import { taskCommandBody } from './tasks_fx.mjs';
/* KIVO_265 · قرارُ المالك (2026-10-16) — تكرارُ المهام ظاهرٌ في نموذج الإنشاء والتعديل: صفحةُ المهام الحقيقية (src/modules/tasks/logic.js في vm
   + KIVO.BassamPageKit الحقيقي) على العامل الحقيقي — بطبقة التخزين (flushAsync يحفظ مخزنَ الصفحة بحفظٍ خامّ كما في tasks_page_review265):
     «نوع المهمة: لمرة واحدة | متكررة» ظاهرٌ افتراضياً في الإنشاء والتعديل (لا في «إعدادات متقدمة») · قواعدُ الإنشاء (يومي · أسبوعي بأيامٍ عدّة ·
     شهري بيوم الشهر · نهايةٌ بتاريخ · حتى الإيقاف) · العامةُ بلا مكلَّف تعطّل «متكررة» · صلاحيةُ المفتاح (task.create · task.assign · task.edit) تعكس
     الخادم في النموذج وقائمة الصف · تعديلُ سلسلةٍ يُملأ بقاعدتها من نموذجها ويرسل op 'edit' بعد وصول التعديل · التحويلُ إلى متكررة op 'start' ·
     «لمرة واحدة» لسلسلةٍ = تأكيدٌ ثم op 'stop' · المنتهيةُ للقراءة · شارةُ الصف · سجلُّ المهمة · رموزُ أخطاء الخادم.
   ما يحتاج عمليات الخادم الجديدة (edit · start · stop:1) مُعلَّمٌ في وصف الاختبار «⧗ خادم» — يُخفق حتى يصل فرعُ الخادم (لا تخطّي). بياناتٌ اصطناعية (tasks_fx). */
import './clock.mjs';   /* KIVO_265 · البند 19: ساعةٌ مثبَّتة (10:00 الرياض · 1448-5-9) — قبل tasks_fx/profile_world لأن ثوابتَهما تُحسب عند التحميل */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { ROOT, moduleLogic } from './harness.mjs';
import { world, workerUnderTest, ME, MATE, KT, KE, D, DAY, TAG, stored, putKV, hij, MID, HR } from './tasks_fx.mjs';

const WU = workerUnderTest();
const LOGIC = moduleLogic('tasks');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 5000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await sleep(25); } return false; }
const ASG_HINT = 'المهمة المتكررة تحتاج مكلَّفاً واحداً على الأقل';
/* الصفحةُ لمدير الإدارة — perm قابلٌ للتبديل أثناء الاختبار: deny (أفعالُ الصفحة المرفوضة) · keys (مفاتيحُ الإنفاذ: true/false · غيابُها = null قديم) ·
   log: تسلسلُ الإفراغ (flush) وطلباتِ /api/tasks/* — منه يُثبت أن فعلَ التكرار يُرسل بعد وصول التعديل */
async function page(W, ck, storeJson, emps, perm, ext) {
  const store = new Map([['bassam_tasks_v1', storeJson], ['bassam_employees_v1', JSON.stringify(emps)]]);
  const KIVO = {}, toasts = [], log = [], calls = [];
  const ctx = { KIVO, console, Intl, Date, Math, JSON, Promise, Object, Array, String, Number, RegExp, Set, Map, Error, isNaN, parseInt, setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => 0,
    localStorage: { getItem: (k) => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    document: { hidden: false, querySelector: () => null, addEventListener: () => {}, removeEventListener: () => {} }, navigator: { userAgent: 'node' }, addEventListener: () => {}, removeEventListener: () => {},
    __BS_BOOT: { srv: 1 },
    fetch: (u, o) => { if (/^\/api\/tasks\//.test(u)) { const b = o && o.body ? JSON.parse(o.body) : null; calls.push({ u, b }); log.push('api:' + u + (b && b.op ? ':' + b.op : '')); } return W.C.req(u, { method: (o && o.method) || 'GET', body: o && o.body, cookie: ck, headers: (o && o.headers) || {} }); } };
  Object.assign(ctx, ext || {});   /* مراجعة U6: ساعةٌ ومنطقةٌ زمنية للجهاز يختارها الاختبار */
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  /* 535 خدمةُ الغلاف (KIVO.BassamProfileFacts) — منها اليومُ التشغيلي (hijriAt) كما في الإنتاج */
  for (const f of ['src/services/490-emp-key.js', 'src/services/440-count.js', 'src/services/535-profile-facts.js', 'src/services/546-task-model.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
  KIVO.BassamPerm = { can: (p, a) => !(perm.deny || []).includes(a), on: () => true, key: (k) => (perm.keys && Object.prototype.hasOwnProperty.call(perm.keys, k) ? perm.keys[k] : null) };
  KIVO.bsPct = (a, b) => (b ? Math.round(100 * a / b) : 0) + '٪';
  KIVO.BassamAuth = { user: () => ({ id: 'tst_dm1', role: 'staff', mgr: true, ekey: 'mgr:tst_d1', deptId: D, name: 'TEST_ONLY مدير' }), display: () => ({ name: 'TEST_ONLY مدير' }),
    users: () => [{ id: 'tst_dm1', role: 'staff', mgr: true, ekey: 'mgr:tst_d1', deptId: D, name: 'TEST_ONLY مدير' }] };
  KIVO.BassamDepts = { active: () => D };
  KIVO.BassamSup = { isSup: () => false };
  class DCLogic { constructor() { this.state = {}; } setState(p, cb) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); cb && cb(); } }
  ctx.DCLogic = DCLogic;
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/components/565-page-kit.js'), 'utf8'), ctx);
  const B0 = KIVO.BassamPageKit.base; KIVO.BassamPageKit.base = (B, a) => class extends B0(B, a) { bsOn() { return true; } bsToast(m, k) { toasts.push([m, k]); } bsAck(m, k) { toasts.push([m, k || 'ok']); return Promise.resolve(true); } };
  vm.runInContext(LOGIC + '\n;globalThis.__C = Component;', ctx, { filename: 'tasks/logic.js' });
  const opsFixture = await attachTaskOperations(ctx, { store, W, ck });
  const c = new ctx.__C(); c._tkDayDef = () => 0;   /* اختباراتُ الشهر كاملاً (KIVO_265 · كروتُ الأيام: الافتراضي يومُ اليوم) */ c.state = Object.assign({}, c.state || {}, { locked: {} });
  c.bsToast = (m, k) => toasts.push([m, k || 'err']);
  return { c, opsFixture, store, toasts, log, calls, KIVO, flush: () => KIVO.__BS_SRV.flushAsync(), sync: async () => { await opsFixture.sync(); c._tkLSBust(); c.setState({ tasksAll: opsFixture.operations.get("bassam_tasks_v1") || {} }); } };
}
async function pageFor(W, ck, perm = {}, ext) { const g = await W.C.api("/api/operations/read?keys=" + encodeURIComponent(KT + ',' + KE), { cookie: ck }); return await page(W, ck, taskText(g.j, KT), JSON.parse(taskText(g.j, KE)), perm, ext); }
function allRows(V) { const out = []; const seen = new Set(); const walk = (o, d) => { if (!o || typeof o !== 'object' || d > 4 || seen.has(o)) return; seen.add(o); if (o.tkcT && Array.isArray(o.tkcT)) out.push(o); for (const k of Object.keys(o)) { const v = o[k]; if (Array.isArray(v)) v.forEach(x => walk(x, d + 1)); else if (v && typeof v === 'object' && k !== 'tkcT') walk(v, d + 1); } }; walk(V, 0); return out; }
/* صفُّ مخزن الصفحة (المحلي) — التعديلُ بلا فعلٍ لاحق يُكتب محلياً وتحمله طبقةُ التخزين وحدها (هنا: P.flush) */
const locRow = (P, k, id) => (JSON.parse(P.store.get('bassam_tasks_v1'))[k] || []).find((r) => Array.isArray(r) && r[13] === id);
const srvRow = (W, k, id) => (stored(W.env, KT)[k] || []).find((r) => Array.isArray(r) && r[13] === id);
const serRows = (W, rid) => { const S = stored(W.env, KT), o = []; for (const dk in S) for (const q of S[dk] || []) if (Array.isArray(q) && q[23] && q[23].rec && String(q[23].rec.id) === String(rid)) o.push({ k: dk, r: q }); return o; };
const on = (o) => /font-weight:700/.test(o.style);
const J = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));   /* قيمُ الـvm من عالمٍ آخر (نماذجُ Array/Object) — تُقارن بنسخةٍ محلية */
const WD = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
/* مهمةٌ من الخادم غداً 10:00 بتوقيت الرياض (بلا عبورِ منتصف الليل ولا ساعةٍ بين 00 و03 — اليومُ التشغيلي) — rec اختياري */
async function mk(W, ck, title, rec, asg = [ME.eid]) {
  const s = MID(Date.now()) + 864e5 + 10 * HR, k = hij(s);
  const c = await W.C.api('/api/tasks/create', { method: 'POST', cookie: ck, body: taskCommandBody(W.env, "/api/tasks/create", Object.assign({ k, t: TAG + ' ' + title, s, e: s + 45 * 60e3, asg, rv: 'none', force: true }, rec ? { rec } : {})) });
  assert.equal(c.status, 200, JSON.stringify(c.j));
  return { k, id: c.j.rows[0].id, s };
}
const addDays = (P, k, n) => { const a = k.split('-').map(Number), g = P.c.hGreg(a[0], a[1], a[2]), h = P.c.tkHParts(g.getTime() + n * 864e5); return h.y + '-' + h.m + '-' + h.d; };
/* يفتح صفَّ اليوم k بهويته في الجدول (شهرُه في الصفحة) */
function rowOf(P, k, id) { const [y, m] = k.split('-').map(Number); P.c.setState({ year: y, month: m, search: '', fStatus: 'all', fPrio: 'all', perPage: 0 }); return allRows(P.c.renderVals()).find((t) => t.tkcT[13] === id); }

test('النموذج · «نوع المهمة» ظاهرٌ افتراضياً (لا في الإعدادات المتقدمة) · العامةُ تعطّل «متكررة» · قواعدُ الإنشاء: يومي · أسبوعي بأيامٍ عدّة · شهري · نهايةٌ بتاريخ · حتى الإيقاف', async () => {
  const W = await world({ worker: WU.file }); const dm = await W.login('0000000101', '70101');
  const P = await pageFor(W, dm.ck), bodies = [];
  P.c._tkCreateSrv = (b) => bodies.push(b);   /* جسمُ الإنشاء كما يُرسل (الإنشاءُ الحقيقيّ من الخادم في tasks_page_p2) */
  const [y, m] = DAY.split('-').map(Number); P.c.setState({ year: y, month: m });
  P.c.renderVals().openNewTask();
  let V = P.c.renderVals();
  assert.equal(V.newTaskOpen, true); assert.equal(V.advOpen, false, '«إعدادات متقدمة» مطويّة');
  assert.equal(V.tkRecOn, true, '«نوع المهمة» ظاهرٌ دون فتح الإعدادات المتقدمة');
  assert.deepEqual(J(V.tkRecTypes.map((o) => o.label)), ['لمرة واحدة', 'متكررة']);
  assert.equal(V.tkRecTypes[0].aria, 'true', 'الافتراضيُّ «لمرة واحدة»'); assert.equal(V.tkRecBodyOn, false);
  assert.equal(V.advRecOpts, undefined, 'لا تكرارَ في الإعدادات المتقدمة'); assert.doesNotMatch(V.advSum, /تكرار|يومياً|تتكرر/);
  /* العامةُ (الافتراضيُّ عند الإنشاء) بلا مكلَّف ⇒ «متكررة» معطّلة بسببها */
  assert.equal(V.tkRecTypes[1].ariaDis, 'true'); assert.equal(V.tkRecHint, ASG_HINT); assert.equal(V.tkRecTypes[1].tip, ASG_HINT);
  V.tkRecTypes[1].click(); assert.equal(P.c.state.newRec, 'once'); assert.ok(P.toasts.some(([t, k]) => t === ASG_HINT && k === 'warn'), 'تنبيهٌ بالسبب');
  /* موجّهةٌ لموظف ⇒ «متكررة» متاحة · يومي حتى الإيقاف (الافتراضي) */
  P.c.setState({ newTitle: TAG + ' متكررة من النموذج', newAsg: 'direct', newPick: { [ME.eid]: ME.name } });
  V = P.c.renderVals(); assert.equal(V.tkRecTypes[1].ariaDis, 'false'); assert.equal(V.tkRecHint, '');
  V.tkRecTypes[1].click(); V = P.c.renderVals();
  const k0 = P.c._tkFormK();
  assert.equal(P.c.state.newRec, 'daily'); assert.equal(V.tkRecBodyOn, true); assert.equal(V.tkRecTypes[1].aria, 'true');
  assert.deepEqual(J(V.tkRecFreqs.map((o) => o.label)), ['يومي', 'أسبوعي', 'شهري', 'كل عدة أيام'], 'بلا «أيام محددة» — الأسبوعيُّ بأيامٍ عدّة · وكل N يوم (KIVO_265 · البند 16)');
  assert.deepEqual(J(V.tkRecEnds.map((o) => o.label)), ['حتى الإيقاف', 'في تاريخ']); assert.ok(on(V.tkRecEnds[0]), 'الافتراضيُّ «حتى الإيقاف»');
  assert.equal(V.tkRecFrom, 'يبدأ من ' + k0); assert.equal(V.tkRecSum, 'تتكرر يومياً · من ' + k0 + ' حتى الإيقاف');
  await V.submitTask(); assert.deepEqual(J(bodies.pop().rec), { t: 'daily', open: 1 });
  /* أسبوعي: الافتراضيُّ يومُ أسبوع البداية · ويومٌ ثانٍ ⇒ يومان */
  P.c.renderVals().tkRecFreqs[1].click(); V = P.c.renderVals();
  const w0 = P.c._tkWdOf(k0), w1 = (w0 + 2) % 7;
  assert.equal(V.tkRecWdOn, true); assert.deepEqual(J(V.tkRecWds.map((o, i) => on(o) ? i : -1).filter((i) => i >= 0)), [w0], 'الافتراضيُّ يومُ البداية');
  V.tkRecWds[w1].click(); V = P.c.renderVals();
  const two = [w0, w1].sort((a, b) => a - b);
  assert.equal(V.tkRecSum, 'تتكرر أسبوعياً: ' + two.map((i) => WD[i]).join(' و') + ' · من ' + k0 + ' حتى الإيقاف');
  await V.submitTask(); assert.deepEqual(J(bodies.pop().rec), { t: 'weekly', wd: two, open: 1 });
  /* بلا يوم ⇒ لا إرسال ورسالةٌ صريحة */
  P.c.renderVals().tkRecWds[w0].click(); P.c.renderVals().tkRecWds[w1].click(); V = P.c.renderVals();
  assert.equal(V.tkRecSum, 'اختر يوماً واحداً على الأقل'); const n0 = bodies.length; await V.submitTask();
  assert.equal(bodies.length, n0, 'لم يُرسل شيء'); assert.ok(P.toasts.some(([t]) => t === 'اختر يوماً واحداً على الأقل'));
  /* شهري: يومُ الشهر الهجري (الافتراضيُّ يومُ البداية) */
  P.c.renderVals().tkRecFreqs[2].click(); V = P.c.renderVals();
  assert.equal(V.tkRecMdOn, true); assert.equal(V.tkRecMds.length, 31, '30 يوماً و«آخر يوم في الشهر» (البند 16)'); assert.equal(V.tkRecMds.find((o) => o.sel).v, String(+k0.split('-')[2]));
  V.onTkRecMd({ target: { value: '15' } }); V = P.c.renderVals();
  assert.equal(V.tkRecSum, 'تتكرر شهرياً: يوم 15 · من ' + k0 + ' حتى الإيقاف');
  await V.submitTask(); assert.deepEqual(J(bodies.pop().rec), { t: 'monthly', md: 15, open: 1 });
  /* «في تاريخ»: الافتراضيُّ شهرٌ من البداية · قوائمُ اليوم والشهر والسنة · واختصارُ «أسبوع» */
  P.c.renderVals().tkRecEnds[1].click(); V = P.c.renderVals();
  const t1 = addDays(P, k0, 30), [ty, tm, td] = t1.split('-').map(Number);
  assert.equal(V.tkRecToOn, true); assert.equal(V.tkRecQuickOn, true); assert.ok(on(V.tkRecQuick[2]), '«شهر» مختار');
  assert.equal(V.tkRecToYs.find((o) => o.sel).v, String(ty)); assert.equal(V.tkRecToMs.find((o) => o.sel).v, String(tm)); assert.equal(V.tkRecToDs.find((o) => o.sel).v, String(td));
  assert.equal(V.tkRecToYs.length, 4, 'السنةُ: البدايةُ وثلاثٌ بعدها');
  assert.equal(V.tkRecSum, 'تتكرر شهرياً: يوم 15 · من ' + k0 + ' حتى ' + t1);
  await V.submitTask(); assert.deepEqual(J(bodies.pop().rec), { t: 'monthly', md: 15, to: t1 });
  V.onTkRecToD({ target: { value: '1' } }); V = P.c.renderVals();
  assert.equal(P.c.state.newRecTo, ty + '-' + tm + '-1'); assert.ok(!V.tkRecQuick.some(on), 'تاريخٌ صريح — لا اختصار');
  await V.submitTask(); assert.deepEqual(J(bodies.pop().rec), { t: 'monthly', md: 15, to: ty + '-' + tm + '-1' });
  P.c.renderVals().tkRecQuick[0].click(); await P.c.renderVals().submitTask(); assert.deepEqual(J(bodies.pop().rec), { t: 'monthly', md: 15, to: addDays(P, k0, 7) });
  /* نهايةٌ قبل البداية ⇒ لا إرسال */
  if (k0 !== y + '-1-1') {
    V = P.c.renderVals(); V.onTkRecToM({ target: { value: '1' } }); V = P.c.renderVals(); V.onTkRecToY({ target: { value: String(y) } }); V = P.c.renderVals();
    assert.equal(V.tkRecSum, 'تاريخ النهاية قبل تاريخ البدء'); const n1 = bodies.length; await V.submitTask(); assert.equal(bodies.length, n1);
  }
  /* «لمرة واحدة» ⇒ لا rec */
  P.c.renderVals().tkRecTypes[0].click(); await P.c.renderVals().submitTask(); assert.equal(bodies.pop().rec, undefined);
  /* والعودةُ إلى «متكررة» تستعيد آخرَ تكرارٍ اختير (شهري) */
  P.c.renderVals().tkRecTypes[1].click(); assert.equal(P.c.state.newRec, 'monthly');
  /* التعديل: «نوع المهمة» ظاهرٌ لصفٍّ لمرةٍ واحدة («لمرة واحدة» مختارة · «متكررة» متاحةٌ لمسنَدة) — وللعامة معطّلةٌ بسببها */
  const one = await mk(W, dm.ck, 'لمرة واحدة للتعديل');
  await P.sync(); await P.c.renderVals().closeNewTask();
  const R = rowOf(P, one.k, one.id); assert.ok(R, 'الصفّ'); R.edit(); V = P.c.renderVals();
  assert.equal(V.newTaskOpen, true); assert.equal(V.tkRecOn, true); assert.equal(V.tkRecTypes[0].aria, 'true'); assert.equal(V.tkRecTypes[1].ariaDis, 'false');
  P.c.setState({ newAsg: 'general', newPick: {} }); V = P.c.renderVals(); assert.equal(V.tkRecTypes[1].ariaDis, 'true'); assert.equal(V.tkRecHint, ASG_HINT);
});

test('الصلاحيات · المفتاحُ يعكس الخادم: بلا task.edit لا إيقافَ ولا إنهاءَ في قائمة الصف والنموذجُ للقراءة · بلا task.create لا «متكررة» · التحويلُ يحتاج الإنشاء والتعديل والإسناد', async () => {
  const W = await world({ worker: WU.file }); const dm = await W.login('0000000101', '70101');
  const perm = { keys: {} }, P = await pageFor(W, dm.ck, perm);
  const s1 = await mk(W, dm.ck, 'سلسلة للصلاحيات', { t: 'weekly', wd: [1, 3] });
  const one = await mk(W, dm.ck, 'لمرة واحدة للصلاحيات');
  await P.sync();
  let R = rowOf(P, s1.k, s1.id);
  const recItems = (R) => R.rmItems.map((q) => q.name).filter((n) => /التكرار/.test(n));
  assert.deepEqual(J(recItems(R)), ['إيقاف التكرار مؤقتاً', 'إنهاء سلسلة التكرار'], 'الوضعُ القديم (null): القائمةُ كاملة');
  /* حاملُ الإسناد والإنهاء بلا task.edit: لا عناصرَ تكرار (كانت تظهر فيرفضها الخادم 403) */
  perm.keys = { 'task.edit': false, 'task.assign': true, 'task.finish': true };
  R = rowOf(P, s1.k, s1.id); assert.deepEqual(J(recItems(R)), [], 'بلا task.edit: لا إيقافَ ولا إنهاء');
  R.edit(); let V = P.c.renderVals();
  assert.equal(V.tkRecOn, true); assert.equal(V.tkRecRoOn, true, 'قاعدةُ السلسلة نصٌّ للقراءة'); assert.equal(V.tkRecBodyOn, false); assert.equal(V.tkRecActOn, false, 'لا إيقافَ ولا إنهاءَ في النموذج');
  assert.ok(V.tkRecTypes.every((o) => o.ariaDis === 'true'), 'الاختيارُ معطّل'); assert.match(V.tkRecRoTxt, /^تتكرر أسبوعياً: الاثنين والأربعاء · من .* — تعديلُ التكرار يحتاج صلاحيةَ تعديل المهام$/);
  V.tkRecTypes[0].click(); assert.equal(P.c.state.newRec, 'weekly', 'لا يُغيَّر');
  P.c.setState({ newTitle: TAG + ' عنوانٌ معدَّل بلا تكرار' }); await P.c.renderVals().submitTask();
  assert.equal(locRow(P, s1.k, s1.id)[0], TAG + ' عنوانٌ معدَّل بلا تكرار', 'حُفظ التعديل: ' + JSON.stringify(P.toasts.slice(-3)));
  await sleep(150); assert.ok(!P.calls.some((c) => c.u === '/api/tasks/recur'), 'ولا فعلَ تكرار منفصل'); assert.deepEqual(J(P.log), ['api:/api/tasks/settings'], 'طلب تحرير ذري واحد بلا إفراغ لاحق');
  /* بلا task.create: «متكررة» معطّلةٌ عند الإنشاء ولو بمكلَّف */
  perm.keys = { 'task.create': false, 'task.assign': true, 'task.edit': true };
  const [y, m] = DAY.split('-').map(Number); P.c.setState({ year: y, month: m }); P.c.renderVals().openNewTask();
  P.c.setState({ newAsg: 'direct', newPick: { [ME.eid]: ME.name } }); V = P.c.renderVals();
  assert.equal(V.tkRecTypes[1].ariaDis, 'true'); assert.equal(V.tkRecHint, 'صلاحيتك لا تشمل إنشاءَ مهامٍ متكررة');
  perm.keys = { 'task.create': true, 'task.assign': false }; assert.equal(P.c.renderVals().tkRecTypes[1].ariaDis, 'true', 'وبمكلَّفين بلا task.assign');
  perm.keys = { 'task.create': true, 'task.assign': true }; assert.equal(P.c.renderVals().tkRecTypes[1].ariaDis, 'false');
  /* التحويلُ إلى متكررة: الإنشاءُ والتعديلُ والإسناد معاً */
  await P.c.renderVals().closeNewTask();
  for (const [keys, deny] of [[{ 'task.assign': false }, []], [{ 'task.create': false }, []], [{}, ['add']]]) {
    perm.keys = keys; perm.deny = deny;
    const R1 = rowOf(P, one.k, one.id); R1.edit(); V = P.c.renderVals();
    assert.equal(V.tkRecTypes[1].ariaDis, 'true', JSON.stringify(keys) + ' ' + deny); assert.equal(V.tkRecHint, 'تحويلُ المهمة إلى متكررة يحتاج صلاحياتِ الإنشاء والتعديل والإسناد');
    await P.c.renderVals().closeNewTask();
  }
  perm.keys = {}; perm.deny = [];
  const R2 = rowOf(P, one.k, one.id); R2.edit(); assert.equal(P.c.renderVals().tkRecTypes[1].ariaDis, 'false', 'بالمفاتيح كلِّها: متاح');
});

test('⧗ خادم · تعديلُ صفٍّ من سلسلة: يُملأ بقاعدتها من نموذجها وحالتِها · تغييرُ القاعدة يرسل op «edit» بعد وصول التعديل · بلا تغيير لا فعل · الإيقافُ من النموذج', async () => {
  const W = await world({ worker: WU.file }); const dm = await W.login('0000000101', '70101');
  const P = await pageFor(W, dm.ck);
  const s0 = MID(Date.now()) + 864e5 + 10 * HR, kk = hij(s0), toK = addDays(P, kk, 20), wA = P.c._tkWdOf(kk);
  const s1 = await mk(W, dm.ck, 'سلسلة للتعديل', { t: 'weekly', wd: [wA], to: toK });
  const recId = srvRow(W, s1.k, s1.id)[23].rec.id;
  await P.sync();
  let R = rowOf(P, s1.k, s1.id); assert.match(R.p2Chips, /متكررة · أسبوعياً/);
  /* بلا تغييرٍ في القاعدة: حفظٌ بلا فعل تكرار */
  R.edit(); let V = P.c.renderVals();
  assert.equal(P.c.state.newRec, 'weekly'); assert.deepEqual(J(P.c._tkRecWd(s1.k)), [wA]); assert.equal(P.c.state.newRecEnd, 'date'); assert.equal(P.c.state.newRecTo, toK);
  assert.equal(V.tkRecSt, 'نشطة'); assert.equal(V.tkRecActOn, true); assert.equal(V.tkRecPauseLbl, 'إيقاف مؤقت'); assert.equal(V.tkRecTypes[1].aria, 'true');
  assert.equal(V.tkRecSum, 'تتكرر أسبوعياً: ' + WD[wA] + ' · من ' + s1.k + ' حتى ' + toK); assert.equal(V.tkRecWarn, ''); assert.equal(V.tkRecQuickOn, false, 'لا اختصاراتٍ لسلسلةٍ قائمة');
  P.c.setState({ newTitle: TAG + ' عنوانٌ أول' }); await P.c.renderVals().submitTask();
  assert.equal(locRow(P, s1.k, s1.id)[0], TAG + ' عنوانٌ أول', JSON.stringify(P.toasts.slice(-3))); await sleep(150);
  assert.ok(!P.calls.some((c) => c.u === '/api/tasks/recur'), 'القاعدةُ كما هي ⇒ لا «edit»');
  assert.ok(await P.flush(), 'طبقةُ التخزين تحمل التعديل'); assert.equal(srvRow(W, s1.k, s1.id)[0], TAG + ' عنوانٌ أول');
  /* الإيقافُ المؤقت من النموذج (نافذةُ الفعل نفسُها) */
  await P.sync(); R = rowOf(P, s1.k, s1.id); R.edit(); P.c.renderVals().tkRecPause(); V = P.c.renderVals();
  assert.equal(V.tkActHead, 'إيقاف التكرار مؤقتاً'); V.tkActDo();
  assert.ok(await until(() => !P.c.state.tkAct), 'نُفّذ: ' + P.c.state.tkActErr); assert.ok(serRows(W, recId).every((q) => q.r[23].rec.paused === 1));
  await P.sync(); V = P.c.renderVals(); assert.equal(V.tkRecSt, 'موقوفة مؤقتاً'); assert.equal(V.tkRecPauseLbl, 'استئناف');
  assert.match(rowOf(P, s1.k, s1.id).p2Chips, /متكررة · أسبوعياً · موقوفة مؤقتاً/);
  P.c.renderVals().tkRecPause(); assert.equal(P.c.renderVals().tkActHead, 'استئناف التكرار'); P.c.renderVals().tkActDo();
  assert.ok(await until(() => !P.c.state.tkAct)); await P.sync();
  /* تغييرُ القاعدة: يومٌ ثانٍ ⇒ بعد الحفظ op «edit» بالقاعدة الجديدة */
  R = rowOf(P, s1.k, s1.id); R.edit();
  const wB = (wA + 3) % 7; P.c.renderVals().tkRecWds[wB].click(); V = P.c.renderVals();
  assert.match(V.tkRecWarn, /يُعدَّل التكرار عند الحفظ/);
  P.c.setState({ newTitle: TAG + ' عنوانٌ ثانٍ' }); P.log.length = 0; await P.c.renderVals().submitTask();
  assert.deepEqual(J(P.log), ['api:/api/tasks/settings'], 'التعديل والتكرار edit في طلب واحد');
  const eb = P.calls.filter((c) => c.u === '/api/tasks/settings').pop().b.recur;
  assert.equal(eb.id, String(recId)); assert.equal(eb.op, 'edit'); assert.deepEqual(J(eb.rec), { t: 'weekly', wd: [wA, wB].sort((a, b) => a - b), to: toK });
  assert.equal(srvRow(W, s1.k, s1.id)[0], TAG + ' عنوانٌ ثانٍ', 'التعديلُ نفسُه وصل');
  /* ⧗ الخادم (op edit): القاعدةُ الجديدة في نموذج السلسلة بإصدارٍ أعلى — والرسالة */
  assert.ok(await until(() => P.toasts.some(([t, k]) => /^عُدّل التكرار/.test(t) && k === 'ok')), 'رسالةُ «عُدّل التكرار»: ' + JSON.stringify(P.toasts.slice(-3)));
  const pr = serRows(W, recId).map((q) => q.r[23].rec).sort((a, b) => (b.ver || 0) - (a.ver || 0))[0];
  assert.deepEqual(J(pr.wd), [wA, wB].sort((a, b) => a - b)); assert.ok(pr.ver > 1, 'إصدارٌ أعلى');
});

test('⧗ خادم · تحويلُ مهمةٍ لمرةٍ واحدة (مسنَدة) إلى متكررة: op «start» بعد وصول التعديل · والعامةُ لا تُحوَّل (rec-asg)', async () => {
  const W = await world({ worker: WU.file }); const dm = await W.login('0000000101', '70101');
  const P = await pageFor(W, dm.ck);
  const one = await mk(W, dm.ck, 'لمرة واحدة تُحوَّل');
  await P.sync();
  const R = rowOf(P, one.k, one.id); R.edit(); let V = P.c.renderVals();
  assert.equal(V.tkRecTypes[0].aria, 'true'); V.tkRecTypes[1].click(); V = P.c.renderVals();
  assert.equal(V.tkRecBodyOn, true); assert.match(V.tkRecWarn, /تتحوّل المهمة إلى متكررة عند الحفظ/);
  V.tkRecFreqs[1].click(); V = P.c.renderVals(); assert.equal(V.tkRecFrom, 'يبدأ من ' + one.k);
  P.log.length = 0; await V.submitTask();
  assert.deepEqual(J(P.log), ['api:/api/tasks/settings'], 'start والتعديل في المعاملة نفسها');
  const startBody = P.calls.filter((c) => c.u === '/api/tasks/settings').pop().b, sb = startBody.recur;
  assert.equal(sb.op, 'start'); assert.equal(startBody.k, one.k); assert.equal(startBody.id, one.id); assert.equal(startBody.grp, undefined);
  assert.deepEqual(J(sb.rec), { t: 'weekly', wd: [P.c._tkWdOf(one.k)], open: 1 });
  assert.equal(P.c._tkErr({ status: 400, j: { ok: 0, err: 'rec-asg', msg: 'x' } }), ASG_HINT, 'rec-asg ⇒ النصُّ نفسُه');
  /* مجموعةٌ لمرةٍ واحدة (مكلَّفان): «تعديل المهمة لكل الأفراد» ⇒ «متكررة» ⇒ op «start» بالمجموعة (grp) لا بصفّ */
  const g = await mk(W, dm.ck, 'مجموعة تُحوَّل', null, [ME.eid, MATE.eid]), grp = srvRow(W, g.k, g.id)[17];
  assert.ok(grp, 'مجموعة'); await P.sync(); P.c.renderVals();
  rowOf(P, g.k, g.id); const GR = allRows(P.c.renderVals()).find((t) => t.isGroup && t.grp === grp); assert.ok(GR, 'صفُّ المجموعة');
  GR.rmItems.find((q) => q.name === 'تعديل المهمة لكل الأفراد').run(); V = P.c.renderVals();
  assert.equal(V.tkRecOn, true); assert.equal(V.tkRecTypes[1].ariaDis, 'false', 'المجموعةُ مسنَدة'); V.tkRecTypes[1].click();
  P.log.length = 0; await P.c.renderVals().submitTask();
  assert.deepEqual(J(P.log), ['api:/api/tasks/settings']);
  const groupBody = P.calls.filter((c) => c.u === '/api/tasks/settings').pop().b, gb = groupBody.recur;
  assert.equal(groupBody.grp, grp); assert.equal(groupBody.id, undefined); assert.equal(groupBody.k, g.k); assert.deepEqual(J(gb.rec), { t: 'daily', open: 1 });
  /* ⧗ الخادم (op start): صارت سلسلةً بمعرّف — والرسالة */
  assert.ok(await until(() => P.toasts.some(([t, k]) => t === 'حُوّلت المهمة إلى متكررة — تُولَّد مواعيدها تلقائياً' && k === 'ok')), JSON.stringify(P.toasts.slice(-3)));
  const x = srvRow(W, one.k, one.id)[23]; assert.ok(x.rec && x.rec.id && x.rec.t === 'weekly', JSON.stringify(x.rec));
  await P.sync(); assert.match(rowOf(P, one.k, one.id).p2Chips, /متكررة · أسبوعياً/);
  assert.ok(await until(() => (stored(W.env, KT)[g.k] || []).filter((r) => r && r[17] === grp).every((r) => r[23] && r[23].rec && r[23].rec.id)), 'وأفرادُ المجموعة كلُّهم في سلسلةٍ واحدة');
});

test('⧗ خادم · «لمرة واحدة» لصفٍّ من سلسلة: تأكيدٌ بنافذة «إنهاء سلسلة التكرار» ثم op «stop» بعد وصول التعديل — تبقى هذه المهمة (row) وتُلغى التاليةُ التي لم تبدأ', async () => {
  const W = await world({ worker: WU.file }); const dm = await W.login('0000000101', '70101');
  const P = await pageFor(W, dm.ck);
  const s1 = await mk(W, dm.ck, 'سلسلة تُنهى', { t: 'daily' });
  const recId = srvRow(W, s1.k, s1.id)[23].rec.id;
  /* موعدٌ تالٍ من السلسلة نفسِها بعد يومٍ (لم يبدأ) — يُلغى بالإنهاء، والمعدَّلُ يبقى (مراجعة U1: كان الإنهاءُ يلغي المهمةَ المعدَّلة نفسَها) */
  const S0 = stored(W.env, KT), r0 = S0[s1.k].find((q) => q[13] === s1.id), k2 = addDays(P, s1.k, 1), id2 = s1.id + 7;
  const r2 = r0.slice(); r2[13] = id2; r2[15] = r0[15] + 864e5; r2[16] = r0[16] + 864e5; r2[22] = null; r2[23] = Object.assign({}, r0[23]); delete r2[23].idem;
  (S0[k2] = S0[k2] || []).push(r2); await replaceOperationalFixture(W.env, KT, S0);
  await P.sync();
  let R = rowOf(P, s1.k, s1.id); R.edit(); let V = P.c.renderVals();
  V.tkRecTypes[0].click(); V = P.c.renderVals();
  assert.equal(V.tkRecTypes[0].aria, 'true'); assert.equal(V.tkRecBodyOn, false); assert.match(V.tkRecWarn, /سيُنهى التكرار عند الحفظ — تبقى هذه المهمة، وتتوقف المواعيدُ التالية/);
  P.c.setState({ newTitle: TAG + ' بعد الإنهاء' }); P.log.length = 0; await P.c.renderVals().submitTask(); V = P.c.renderVals();
  /* مراجعة U1 (تغييرٌ مقصود لنصّ التأكيد — كان «ثم تُحفظ تعديلاتُك» وحده): المهمةُ المعدَّلة تبقى */
  assert.equal(V.tkActOn, true); assert.equal(V.tkActHead, 'إنهاء سلسلة التكرار'); assert.match(V.tkActSub, /تبقى هذه المهمة، وتتوقف المواعيدُ التالية/); assert.match(V.tkActSub, /تعديلاتُك/); assert.equal(V.tkActBtn, 'إنهاء السلسلة');
  assert.deepEqual(J(P.log), [], 'لا حفظَ ولا طلبَ قبل التأكيد'); assert.equal(V.newTaskOpen, true);
  V.tkActCancel(); V = P.c.renderVals(); assert.equal(V.tkActOn, false); assert.equal(V.newTaskOpen, true, 'الرجوعُ يُبقي النموذج');
  await V.submitTask(); P.c.renderVals().tkActDo();
  assert.ok(await until(() => P.log.includes('api:/api/tasks/settings')), 'stop والتعديل في الطلب نفسه');
  assert.ok(await until(() => !P.c.state.newTaskOpen), 'وصل ACK قبل تقييم الصف المحفوظ');
  assert.deepEqual(J(P.log), ['api:/api/tasks/settings']);
  const sb = J(P.calls.filter((c) => c.u === '/api/tasks/settings').pop().b.recur);
  assert.deepEqual(sb, { id: String(recId), op: 'stop', row: String(s1.id) }, 'مرساة الصف المعدل في أمر التكرار');
  assert.equal(P.calls.filter(c => c.u === '/api/tasks/settings').pop().b.k, s1.k, 'يوم الصف في غلاف طلب الإعدادات');
  assert.equal(srvRow(W, s1.k, s1.id)[0], TAG + ' بعد الإنهاء', 'التعديلُ وصل');
  assert.ok(await until(() => P.toasts.some(([t, k]) => /^أُنهي التكرار — تبقى هذه المهمة/.test(t) && k === 'ok')), JSON.stringify(P.toasts.slice(-3)));
  assert.equal(P.c.state.tkRecOk, false, 'التأكيدُ لا يبقى لحفظٍ قادم');
  /* ⧗ الخادم (row): المهمةُ المعدَّلة نفسُها لا تُلغى — والتاليةُ التي لم تبدأ تُلغى */
  const x1 = srvRow(W, s1.k, s1.id)[23];
  assert.notEqual(x1.asg, 'cancelled', 'المهمةُ المعدَّلة باقية: ' + JSON.stringify(x1.can || null)); assert.equal(x1.can, undefined);
  assert.equal(srvRow(W, k2, id2)[23].asg, 'cancelled', 'الموعدُ التالي أُلغي');
  /* ⧗ الخادم: stop:1 في السلسلة ⇒ «منتهية» للقراءة */
  assert.ok(serRows(W, recId).every((q) => q.r[23].rec.stop === 1), JSON.stringify(serRows(W, recId).map((q) => q.r[23].rec)));
  await P.sync(); R = rowOf(P, s1.k, s1.id); assert.match(R.p2Chips, /متكررة · يومياً · منتهية/);
});

test('السلسلةُ المنتهية للقراءة · الموقوفة · حالةُ السلسلة من نموذجها (أعلى إصدارٍ غيرِ منفصل) · «أيام محددة» القديمة = أسبوعي · شارةُ الصف وقائمتُه', async () => {
  const W = await world({ worker: WU.file }); const dm = await W.login('0000000101', '70101');
  const P = await pageFor(W, dm.ck);
  const s1 = await mk(W, dm.ck, 'سلسلة حالات', { t: 'weekly', wd: [0, 4] });
  const S = stored(W.env, KT), r0 = S[s1.k].find((q) => q[13] === s1.id), rid = r0[23].rec.id;
  /* نسختان أخريان في الأيام التالية: إصدارٌ أعلى (شهري) غيرُ منفصل = النموذج · وإصدارٌ أعلى منه منفصل (det) لا يُحتسب */
  const k2 = addDays(P, s1.k, 1), k3 = addDays(P, s1.k, 2);
  const cp = (k, id, rec, det) => { const r = r0.slice(); r[13] = id; r[15] = r0[15] + (k === k2 ? 1 : 2) * 864e5; r[16] = r0[16] + (k === k2 ? 1 : 2) * 864e5; r[22] = null; r[23] = Object.assign({}, r0[23], { rec: Object.assign({}, r0[23].rec, rec) }, det ? { det: 1 } : {}); delete r[23].idem; (S[k] = S[k] || []).push(r); };
  cp(k2, s1.id + 7, { ver: 2, t: 'monthly', md: 9 }); cp(k3, s1.id + 9, { ver: 5, t: 'daily' }, true);
  await replaceOperationalFixture(W.env, KT, S); await P.sync();
  let R = rowOf(P, s1.k, s1.id);
  assert.match(R.p2Chips, /متكررة · شهرياً/, 'حالةُ السلسلة من نموذجها لا من الصفّ المنقور');
  assert.equal(P.c._tkRecSer(rid).rec.ver, 2);
  /* «أيام محددة» القديمة تُعرض أسبوعي */
  const set = async (rec) => { const S2 = stored(W.env, KT); for (const dk in S2) for (const q of S2[dk]) if (q && q[23] && q[23].rec && q[23].rec.id === rid) Object.assign(q[23].rec, rec); await replaceOperationalFixture(W.env, KT, S2); };
  await set({ t: 'days', wd: [1, 2], md: undefined }); await P.sync();
  R = rowOf(P, s1.k, s1.id); assert.match(R.p2Chips, /متكررة · أسبوعياً/);
  R.edit(); let V = P.c.renderVals(); assert.equal(P.c.state.newRec, 'weekly'); assert.match(V.tkRecSum, /^تتكرر أسبوعياً: الاثنين والثلاثاء/);
  await P.c.renderVals().closeNewTask();
  /* موقوفة: الشارة · القائمة «استئناف» */
  await set({ paused: 1 }); await P.sync(); R = rowOf(P, s1.k, s1.id);
  assert.match(R.p2Chips, /متكررة · أسبوعياً · موقوفة مؤقتاً/); assert.ok(R.rmItems.some((q) => q.name === 'استئناف التكرار') && !R.rmItems.some((q) => q.name === 'إيقاف التكرار مؤقتاً'));
  /* منتهية (stop:1 · أو نهايةٌ مضت): للقراءة — لا إيقافَ ولا استئنافَ ولا إنهاءَ ولا تغييرَ نوع */
  for (const fin of [{ stop: 1 }, { stop: 0, to: addDays(P, DAY, -1) }]) {
    await set(Object.assign({ paused: 0 }, fin)); await P.sync(); R = rowOf(P, s1.k, s1.id);
    assert.match(R.p2Chips, /متكررة · أسبوعياً · منتهية/, JSON.stringify(fin)); assert.ok(!R.rmItems.some((q) => /التكرار/.test(q.name)), 'لا عناصرَ تكرار لمنتهية');
    R.edit(); V = P.c.renderVals();
    assert.equal(V.tkRecSt, 'منتهية'); assert.equal(V.tkRecRoOn, true); assert.match(V.tkRecRoTxt, /— انتهى التكرار$/); assert.equal(V.tkRecActOn, false); assert.equal(V.tkRecBodyOn, false);
    assert.ok(V.tkRecTypes.every((o) => o.ariaDis === 'true')); V.tkRecTypes[0].click(); assert.equal(P.c.state.newRec, 'weekly', 'لا يُغيَّر');
    P.c.setState({ newTitle: TAG + ' منتهية ' + (fin.stop ? 'stop' : 'to') }); P.calls.length = 0; P.log.length = 0; await P.c.renderVals().submitTask();
    assert.equal(locRow(P, s1.k, s1.id)[0], TAG + ' منتهية ' + (fin.stop ? 'stop' : 'to'), JSON.stringify(P.toasts.slice(-3))); await sleep(120);
    assert.ok(await P.flush());
    assert.ok(!P.calls.some((c) => c.u === '/api/tasks/recur'), 'لا فعلَ تكرار لمنتهية'); assert.equal(P.c.renderVals().tkActOn, false, 'ولا نافذةَ تأكيد');
    await P.sync();
  }
});

test('سجلُّ المهمة: أحداثُ التكرار بنصوصها · رموزُ أخطاء الخادم الجديدة بنصٍّ عربيٍّ واضح', async () => {
  const W = await world({ worker: WU.file }); const dm = await W.login('0000000101', '70101');
  const P = await pageFor(W, dm.ck);
  const ts = Date.now();
  P.c.setState({ tkAct: { kind: 'log', k: DAY, id: 1, ekey: null, title: 'مهمة', name: '', s: 0, e: 0, eid: 'x', rec: '' },
    tkActLog: ['rec_pause', 'rec_resume', 'rec_stop', 'rec_edit', 'rec_start'].map((act) => ({ act, name: 'TEST_ONLY مدير', ts })) });
  assert.deepEqual(J(P.c.renderVals().tkActLogList.map((q) => q.txt)), ['أُوقف التكرار مؤقتاً', 'استُؤنف التكرار', 'أُنهي التكرار', 'عُدّل التكرار', 'بدأ التكرار']);
  const E = (j) => P.c._tkErr({ status: 400, j: Object.assign({ ok: 0 }, j) });
  assert.equal(E({ err: 'rec-ended', msg: 'server text' }), 'انتهت سلسلة التكرار — لا يمكن تعديلها أو استئنافها');
  assert.equal(E({ err: 'month-locked' }), 'شهرُ المهمة معتمدٌ ومقفل', 'نصُّ «locked» القائم نفسُه');
  /* عقدُ الخادم: month-locked يحمل سببَه (كلُّ مواعيد السلسلة في شهرٍ مقفل) ⇒ يُعرض نصُّه */
  assert.equal(E({ err: 'month-locked', msg: 'كلُّ مواعيد هذه السلسلة في شهرٍ معتمد مقفل — افتح الشهرَ أولاً' }), 'كلُّ مواعيد هذه السلسلة في شهرٍ معتمد مقفل — افتح الشهرَ أولاً');
  assert.equal(E({ err: 'rec.to' }), 'تاريخ النهاية أبعد من المسموح (3 سنوات)');
  assert.equal(E({ err: 'bad-body', at: 'rec.to', msg: 'التكرارُ سنةٌ على الأقل' }), 'تاريخ النهاية أبعد من المسموح (3 سنوات)', 'وبرمز at كذلك');
  assert.equal(E({ err: 'bad-body', at: 'rec.wd', msg: 'اختر أيام الأسبوع' }), 'اختر يوماً واحداً على الأقل');
  assert.equal(E({ err: 'rec.md' }), 'اختر يوم الشهر');
  assert.equal(E({ err: 'rec-asg' }), ASG_HINT);
  assert.equal(E({ err: 'denied', msg: 'نصُّ الخادم' }), 'نصُّ الخادم', 'غيرُها كما كان (msg أولاً)');
});

/* ═══ KIVO_265 · إصلاحُ مراجعة واجهة التكرار (rev_review_tasksui · rev_review_perm) — U1…U7 ═══ */
const recCalls = (P) => P.calls.filter((c) => c.u === '/api/tasks/recur' || c.u === '/api/tasks/settings' && c.b.recur);
test('U1 · U7 · إنهاء السلسلة من المحرر يحفظ العنوان ومرساة الصف ذريًا؛ رسائل العدد من helper العرض الفعلي', async () => {
  const W = await world({ worker: WU.file }),
    dm = await W.login('0000000101', '70101'),
    P = await pageFor(W, dm.ck);
  const s = await mk(W, dm.ck, 'سلسلة تبقى', { t: 'daily', open: 1 }),
    rid = srvRow(W, s.k, s.id)[23].rec.id;
  await P.sync();
  rowOf(P, s.k, s.id).edit();
  P.c.renderVals().tkRecTypes[0].click();
  P.c.setState({ newTitle: TAG + ' تبقى' });
  await P.c.renderVals().submitTask();
  let V = P.c.renderVals();
  assert.equal(V.tkActHead, 'إنهاء سلسلة التكرار');
  assert.match(V.tkActSub, /تبقى هذه المهمة، وتتوقف المواعيدُ التالية/);
  assert.equal(P.calls.filter((c) => c.u === '/api/tasks/settings').length, 0, 'التأكيد يسبق أي حفظ');
  V.tkActDo();
  assert.ok(await until(() => !P.c.state.newTaskOpen));
  const commands = P.calls.filter((c) => c.u === '/api/tasks/settings');
  assert.equal(commands.length, 1);
  assert.deepEqual(J(commands[0].b.recur), { id: String(rid), op: 'stop', row: String(s.id) });
  assert.equal(commands[0].b.k, s.k);
  assert.equal(commands[0].b.edit.t, TAG + ' تبقى');
  assert.equal(P.calls.filter((c) => c.u === '/api/tasks/recur').length, 0);
  assert.equal(srvRow(W, s.k, s.id)[0], TAG + ' تبقى');
  assert.notEqual(srvRow(W, s.k, s.id)[23].asg, 'cancelled');
  assert.ok(serRows(W, rid).every((q) => q.r[23].rec.stop === 1));
  P.c._tkRecAck('stop', { kept: true, cancelled: 2 });
  assert.equal(
    P.toasts.at(-1)[0],
    'أُنهي التكرار — تبقى هذه المهمة، وأُلغيت مهمتان من المواعيد القادمة التي لم تبدأ · تبقى المواعيدُ السابقة بسجلّها وإثباتها',
  );
  P.c._tkRecAck('stop', { cancelled: 3 });
  assert.equal(
    P.toasts.at(-1)[0],
    'أُنهي التكرار — تبقى هذه المهمة، وأُلغيت 3 مهام من المواعيد القادمة التي لم تبدأ · تبقى المواعيدُ السابقة بسجلّها وإثباتها',
  );
  P.c._tkRecAck('edit', { cancelled: 1 });
  assert.equal(P.toasts.at(-1)[0], 'عُدّل التكرار — أُلغيت مهمة واحدة من المواعيد القادمة التي لم تعد ضمنه');
  P.c._tkRecAck('stop', { kept: true, cancelled: 0 });
  assert.equal(P.toasts.at(-1)[0], 'أُنهي التكرار — تبقى هذه المهمة · تبقى المواعيدُ السابقة بسجلّها وإثباتها');
  const g = await mk(W, dm.ck, 'مجموعة تبقى', { t: 'daily', open: 1 }, [ME.eid, MATE.eid]),
    gr = srvRow(W, g.k, g.id),
    grp = gr[17];
  await P.sync();
  rowOf(P, g.k, g.id);
  allRows(P.c.renderVals())
    .find((t) => t.isGroup && t.grp === grp)
    .rmItems.find((q) => q.name === 'تعديل المهمة لكل الأفراد')
    .run();
  const anchor = P.c.state.newRecFor;
  assert.ok(anchor);
  P.c.renderVals().tkRecTypes[0].click();
  await P.c.renderVals().submitTask();
  P.c.renderVals().tkActDo();
  assert.ok(await until(() => !P.c.state.newTaskOpen));
  const last = P.calls.filter((c) => c.u === '/api/tasks/settings').at(-1).b;
  assert.equal(last.grp, grp);
  assert.equal(last.recur.row, String(anchor));
  assert.equal(last.recur.op, 'stop');
});

test('U2 · رفض الصلاحية وتعارض CAS يرفضان التعديل والإعدادات والتكرار جميعًا ويبقيان المحرر للمراجعة', async () => {
  const W = await world({ worker: WU.file, mode: 'enforce' }),
    dm = await W.login('0000000101', '70101'),
    P = await pageFor(W, dm.ck);
  const one = await mk(W, dm.ck, 'رفض ذري');
  await P.sync();
  rowOf(P, one.k, one.id).edit();
  P.c.renderVals().tkRecTypes[1].click();
  P.c.setState({ newTitle: TAG + ' مرفوض', newDecOk: false, newAdvTouched: true });
  const perms = stored(W.env, 'bassam_perms_v1'),
    original = J(perms);
  perms.caps[D] = [];
  putKV(W.env, 'bassam_perms_v1', perms);
  const before = J(stored(W.env, KT));
  await P.c.renderVals().submitTask();
  assert.deepEqual(stored(W.env, KT), before);
  assert.equal(P.c.state.newTaskOpen, true);
  assert.ok(P.toasts.some(([, kind]) => kind === 'warn'));
  assert.equal(P.calls.filter((c) => c.u === '/api/tasks/recur').length, 0);
  putKV(W.env, 'bassam_perms_v1', original);
  await P.c.renderVals().closeNewTask();
  const two = await mk(W, dm.ck, 'تعارض ذري');
  await P.sync();
  rowOf(P, two.k, two.id).edit();
  P.c.renderVals().tkRecTypes[1].click();
  P.c.setState({ newTitle: TAG + ' بعد المراجعة', newDecOk: false, newAdvTouched: true });
  const changed = stored(W.env, KT);
  changed[two.k].find((r) => r[13] === two.id)[1] = TAG + ' تعديل مسؤول آخر';
  await replaceOperationalFixture(W.env, KT, changed);
  await P.c.renderVals().submitTask();
  assert.equal(P.c.state.newTaskOpen, true);
  assert.equal(srvRow(W, two.k, two.id)[0], TAG + ' تعارض ذري');
  assert.equal(srvRow(W, two.k, two.id)[23].rec, undefined);
  assert.equal(P.calls.filter((c) => c.u === '/api/tasks/recur').length, 0);
  await P.c.renderVals().closeNewTask();
  await P.sync();
  rowOf(P, two.k, two.id).edit();
  P.c.renderVals().tkRecTypes[1].click();
  P.c.setState({ newTitle: TAG + ' بعد المراجعة', newDecOk: false, newAdvTouched: true });
  await P.c.renderVals().submitTask();
  assert.equal(P.c.state.newTaskOpen, false);
  const row = srvRow(W, two.k, two.id);
  assert.equal(row[0], TAG + ' بعد المراجعة');
  assert.equal(row[1], TAG + ' تعديل مسؤول آخر');
  assert.ok(row[23].rec.id);
  assert.equal(row[23].dec, 0);
});

test('U3 · فقد ACK بعد commit يبقي المسودة ولا يعيد الكتابة تلقائيًا؛ المحاولة الصريحة تستخدم نفس التذكرة والجسم', async () => {
  const W = await world({ worker: WU.file }),
    dm = await W.login('0000000101', '70101'),
    P = await pageFor(W, dm.ck),
    one = await mk(W, dm.ck, 'فقد إقرار ذري');
  await P.sync();
  rowOf(P, one.k, one.id).edit();
  P.c.renderVals().tkRecTypes[1].click();
  P.c.setState({ newTitle: TAG + ' إقرار مفقود', newDecOk: false, newAdvTouched: true });
  const api = P.c._tkApi.bind(P.c);
  let lost = false;
  P.c._tkApi = async (u, b) => {
    const answer = await api(u, b);
    if (u === '/api/tasks/settings' && !lost) {
      lost = true;
      assert.equal(answer.j.ok, 1);
      return { status: 0, j: null };
    }
    return answer;
  };
  await P.c.renderVals().submitTask();
  assert.equal(P.c.state.newTaskOpen, true);
  assert.equal(srvRow(W, one.k, one.id)[0], TAG + ' إقرار مفقود');
  assert.ok(srvRow(W, one.k, one.id)[23].rec.id);
  /* RISHAD266: قراءةُ الصفحة لمخزن المهام تولّد نسخَ السلسلة في الخادم (063 ← tkRecurLazy) — فالمعيارُ: لا صفَّ قائمٌ تغيّر، وكلُّ مضافٍ نسخةٌ من هذه السلسلة */
  const before = JSON.stringify(stored(W.env, KT)), seriesId = srvRow(W, one.k, one.id)[23].rec.id,
    first = J(P.calls.find((c) => c.u === '/api/tasks/settings').b);
  P.c.renderVals();
  await sleep(100);
  assert.equal(P.calls.filter((c) => c.u === '/api/tasks/settings').length, 1);
  P.c.setState({ newTitle: TAG + ' تعديل آخر' });
  await P.c.renderVals().submitTask();
  assert.equal(P.calls.filter((c) => c.u === '/api/tasks/settings').length, 1, 'لا يغير جسم طلب غير محسوم');
  P.c.setState({ newTitle: TAG + ' إقرار مفقود' });
  await P.c.renderVals().submitTask();
  assert.equal(P.c.state.newTaskOpen, false);
  const attempts = P.calls.filter((c) => c.u === '/api/tasks/settings');
  assert.equal(attempts.length, 2);
  assert.deepEqual(J(attempts[1].b), first);
  { const A0 = JSON.parse(before), A1 = stored(W.env, KT), rows = (S) => Object.keys(S).flatMap((dk) => (S[dk] || []).filter(Array.isArray).map((r) => JSON.stringify([dk, r])));
    const r0 = rows(A0), r1 = rows(A1);
    assert.deepEqual(r0.filter((x) => !r1.includes(x)), [], 'لم يتغيّر صفٌّ قائم ولم يُحذف');
    const added = r1.filter((x) => !r0.includes(x)).map((x) => JSON.parse(x)[1]);
    assert.ok(added.every((r) => r[23] && r[23].rec && r[23].rec.id === seriesId && r[13] !== one.id), 'المضافُ نسخُ السلسلة وحدها'); }
  assert.equal(P.calls.filter((c) => c.u === '/api/tasks/recur').length, 0);
});

test('U4 · مجموعةٌ فردُها الأول ملغى: النموذجُ يُملأ لأول فردٍ قائم فيُحوَّل الباقون (كالخادم) · وكلُّهم ملغون ⇒ معطّلة بسببها', async () => {
  const W = await world({ worker: WU.file }); const dm = await W.login('0000000101', '70101');
  const P = await pageFor(W, dm.ck);
  const openGrp = (g, grp) => { rowOf(P, g.k, g.id); allRows(P.c.renderVals()).find((t) => t.isGroup && t.grp === grp).rmItems.find((q) => q.name === 'تعديل المهمة لكل الأفراد').run(); return P.c.renderVals(); };
  const cancel = async (k, r) => { const c = await W.C.api('/api/tasks/cancel', { method: 'POST', cookie: dm.ck, body: { k, id: r[13], ekey: String(r[14]), why: TAG + ' سبب' } }); assert.equal(c.status, 200, JSON.stringify(c.j)); };
  const g = await mk(W, dm.ck, 'مجموعة بفردٍ ملغى', null, [ME.eid, MATE.eid]), grp = srvRow(W, g.k, g.id)[17];
  await P.sync(); openGrp(g, grp);
  const first = P.c.state.newRecFor, L = (stored(W.env, KT)[g.k] || []).filter((r) => r && r[17] === grp), r1 = L.find((r) => String(r[13]) === first), r2 = L.find((r) => String(r[13]) !== first);
  await P.c.renderVals().closeNewTask(); await cancel(g.k, r1); await P.sync();
  let V = openGrp(g, grp);
  assert.equal(P.c.state.newRecFor, String(r2[13]), 'الفردُ القائم'); assert.equal(V.tkRecTypes[1].ariaDis, 'false', V.tkRecHint); assert.equal(V.tkRecHint, '');
  V.tkRecTypes[1].click(); P.log.length = 0; await P.c.renderVals().submitTask();
  assert.ok(await until(() => P.toasts.some(([t]) => t === 'حُوّلت المهمة إلى متكررة — تُولَّد مواعيدها تلقائياً')), JSON.stringify(P.log) + JSON.stringify(P.toasts.slice(-2)));
  assert.deepEqual(recCalls(P).pop().b.grp, grp);
  const S = stored(W.env, KT)[g.k];
  assert.ok(S.find((r) => r[13] === r2[13])[23].rec, 'الباقي صار متكرراً'); assert.equal(S.find((r) => r[13] === r1[13])[23].rec, undefined, 'والملغى كما هو');
  /* كلُّ الأفراد ملغون ⇒ لا تحويل */
  const h = await mk(W, dm.ck, 'مجموعة ملغاة كلها', null, [ME.eid, MATE.eid]), hg = srvRow(W, h.k, h.id)[17];
  for (const r of (stored(W.env, KT)[h.k] || []).filter((q) => q && q[17] === hg)) await cancel(h.k, r);
  await P.sync(); V = openGrp(h, hg);
  assert.equal(V.tkRecTypes[1].ariaDis, 'true'); assert.equal(V.tkRecHint, 'مهمةٌ ملغاةٌ أو أُعيد إسنادُها — لا تُحوَّل إلى متكررة');
});

test('U5 · نهايةٌ قبل اليوم: في التحويل «اختر تاريخاً من اليوم فصاعداً» (لا «إنهاء التكرار» غيرِ الموجود) · وفي السلسلة القائمة كما هي', async () => {
  const W = await world({ worker: WU.file }); const dm = await W.login('0000000101', '70101');
  const P = await pageFor(W, dm.ck);
  const ONE = 'تاريخ النهاية قبل اليوم — اختر تاريخاً من اليوم فصاعداً', SER = 'تاريخ النهاية قبل اليوم — لإنهاء التكرار الآن استعمل «إنهاء التكرار»';
  const o = { t: 'daily', to: addDays(P, DAY, -1) }, from = addDays(P, DAY, -3);
  assert.equal(P.c._tkRecChk(o, from, 'one'), ONE); assert.equal(P.c._tkRecChk(o, from, 'ser'), SER); assert.equal(P.c._tkRecChk(o, from, false), '', 'الإنشاءُ لا يقيّد باليوم');
  /* النموذج: مهمةٌ لمرةٍ واحدة قبل يومين تُحوَّل بنهايةٍ أمس (يومُها في الشهر الجاري) */
  if (+DAY.split('-')[2] >= 3) {
    const s = MID(Date.now()) - 2 * 864e5 + 10 * HR, k = hij(s);
    const c = await W.C.api('/api/tasks/create', { method: 'POST', cookie: dm.ck, body: taskCommandBody(W.env, "/api/tasks/create", { k, t: TAG + ' ماضية', s, e: s + 45 * 60e3, asg: [ME.eid], rv: 'none', force: true }) });
    assert.equal(c.status, 200, JSON.stringify(c.j));
    /* KIVO_265 · قفلُ اليوم: اليومُ المنقضي مقفلٌ تلقائياً — يُفتح بأثر رجعي ({mo:1}) قبل تعديل مهمته */
    await P.sync(); P.c.setState({ locked: Object.assign({}, P.c.state.locked, { [k]: { mo: 1 } }) }); rowOf(P, k, c.j.rows[0].id).edit();
    const [ky, km, kd] = k.split('-').map(Number);
    P.c.renderVals().tkRecTypes[1].click(); P.c.renderVals().tkRecEnds[1].click();
    P.c.renderVals().onTkRecToY({ target: { value: String(ky) } }); P.c.renderVals().onTkRecToM({ target: { value: String(km) } }); P.c.renderVals().onTkRecToD({ target: { value: String(kd + 1) } });
    assert.equal(P.c.state.newRecTo, ky + '-' + km + '-' + (kd + 1), 'نهايةٌ أمس');
    const V = P.c.renderVals(); assert.equal(V.tkRecSum, ONE); assert.match(V.tkRecWarn, /تتحوّل المهمة إلى متكررة/);
    const n0 = P.toasts.length; await V.submitTask(); assert.deepEqual(P.toasts[n0], [ONE, 'warn'], 'لا حفظ'); assert.equal(recCalls(P).length, 0);
  }
});

test('U6 · «اليوم» للتكرار هو اليومُ التشغيلي كالخادم (هجريُّ الرياض قبل ثلاث ساعات) — لا يومَ الجهاز بين 00:00 و03:00', async () => {
  const W = await world({ worker: WU.file }); const dm = await W.login('0000000101', '70101');
  /* جهازٌ بتوقيت الرياض الساعةَ 01:30: يومُه المدنيّ D والخادمُ ما زال في D−1 (070 tkToday) */
  const T0 = MID(Date.now()) + 1.5 * HR, RD = class extends Date { constructor(...a) { if (a.length) super(...a); else super(T0); } static now() { return T0; } };
  const IR = Object.create(Intl); IR.DateTimeFormat = function (l, o) { return new Intl.DateTimeFormat(l, Object.assign({ timeZone: 'Asia/Riyadh' }, o || {})); };
  const P = await pageFor(W, dm.ck, {}, { Date: RD, Intl: IR });
  const dev = P.c.hToday(), devK = dev.y + '-' + dev.m + '-' + dev.d, op = hij(T0 - 3 * HR);
  assert.equal(devK, hij(T0), 'يومُ الجهاز (الرياض) مدنيٌّ'); assert.notEqual(devK, op);
  assert.equal(P.c._tkTodayK(), op, 'اليومُ التشغيلي'); assert.equal(P.c._tkTodayN(), P.c._tkDayN(op));
  /* سلسلةٌ نهايتُها اليومُ التشغيلي ليست «قبل اليوم» (الخادمُ يقبلها ويولّدها) */
  assert.equal(P.c._tkRecChk({ t: 'daily', to: op }, addDays(P, op, -2), 'ser'), '');
});
