import { attachTaskOperations, taskText } from './tasks_vm_operations_fx.mjs';
import { replaceOperationalFixture } from './operational_legacy_seed_fx.mjs';
import { taskCommandBody } from './tasks_fx.mjs';
/* KIVO_265 · البند 11 — صفحةُ المهام (src/modules/tasks/logic.js في vm + KIVO.BassamPageKit الحقيقي) على العامل الحقيقي: الإجراءاتُ الجماعية
   خانةُ اختيارٍ لكل صفّ · «تحديد الكل في الصفحة» · شريطٌ عند التحديد: اعتماد · تمديد (قيمةٌ واحدة) · إلغاء بسببٍ واحد · إعادةُ إسناد إلى موظفٍ واحد —
   بالمسارات القائمة صفّاً صفّاً (review · extend · cancel · reassign) مع مؤشّر تقدّم وملخّص (نجح · فشل بسببه · تُخطّي غيرُ المؤهّل بسببه). بياناتٌ اصطناعية (tasks_fx). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { ROOT, moduleLogic } from './harness.mjs';
import { world, workerUnderTest, ME, MATE, KT, KE, D, DAY, stored, putKV, row } from './tasks_fx.mjs';

const WU = workerUnderTest();
const LOGIC = moduleLogic('tasks');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 6000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await sleep(25); } return false; }
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
  return { c, opsFixture, store, toasts, sync: async () => { await opsFixture.sync(); c._tkLSBust(); c.setState({ tasksAll: opsFixture.operations.get("bassam_tasks_v1") || {} }); } };
}
function allRows(V) { const out = []; const seen = new Set(); const walk = (o, d) => { if (!o || typeof o !== 'object' || d > 4 || seen.has(o)) return; seen.add(o); if (o.tkcT && Array.isArray(o.tkcT)) out.push(o); for (const k of Object.keys(o)) { const v = o[k]; if (Array.isArray(v)) v.forEach(x => walk(x, d + 1)); else if (v && typeof v === 'object' && k !== 'tkcT') walk(v, d + 1); } }; walk(V, 0); return out; }
const rowOf = (V, id) => allRows(V).find((t) => t.tkcT[13] === id);
const srv = (W, id) => (stored(W.env, KT)[DAY] || []).find((r) => Array.isArray(r) && r[13] === id);
const [Y, M] = DAY.split('-').map(Number);
const S1 = 1760000077101, S2 = 1760000077102, P1 = 1760000077103, P2 = 1760000077104, P3 = 1760000077105, D1 = 1760000077106, G1 = 1760000077107, F1 = 1760000077108;
const RV = { u: 'tst_dm1', e: 'mgr:tst_d1', n: 'TEST_ONLY مدير' };

async function setup() {
  const W = await world({ worker: WU.file }); const dm = await W.login('0000000101', '70101');
  const now = Date.now(), S = stored(W.env, KT);
  S[DAY].push(
    Object.assign(row({ id: S1, title: 'جماعي · سُلّمت ١', eid: ME.eid, st: 'in_progress', acc: now - 30e5, s: now - 36e5, e: now + 36e5, r21: { imgs: [], note: 'TEST_ONLY تم ١', sub: 1, at: now - 6e5 } }), { 23: { v: 1, rv: RV } }),
    Object.assign(row({ id: S2, title: 'جماعي · سُلّمت ٢', eid: MATE.eid, st: 'in_progress', acc: now - 30e5, s: now - 36e5, e: now + 36e5, r21: { imgs: [], note: 'TEST_ONLY تم ٢', sub: 1, at: now - 6e5 } }), { 23: { v: 1, rv: RV } }),
    row({ id: P1, title: 'جماعي · معلّقة ١', eid: ME.eid, s: now - 36e5, e: now + 36e5 }),
    row({ id: P2, title: 'جماعي · معلّقة ٢', eid: MATE.eid, s: now - 36e5, e: now + 36e5 }),
    row({ id: P3, title: 'جماعي · معلّقة ٣', eid: MATE.eid, s: now - 36e5, e: now + 36e5 }),
    row({ id: D1, title: 'جماعي · منجزة', eid: ME.eid, st: 'done', acc: now - 72e5, fin: now - 60e5, perf: ['on_time', 'في الوقت'], s: now - 80e5, e: now - 40e5 }),
    row({ id: G1, title: 'جماعي · عامة', s: now - 36e5, e: now + 36e5 }),
    row({ id: F1, title: 'جماعي · ستُحذف من الخادم', eid: ME.eid, s: now - 36e5, e: now + 36e5 }),
  );
  await replaceOperationalFixture(W.env, KT, S);
  const g = await W.C.api("/api/operations/read?keys=" + encodeURIComponent(KT + ',' + KE), { cookie: dm.ck });
  const P = await page(W, dm.ck, taskText(g.j, KT), JSON.parse(taskText(g.j, KE)));
  P.c.setState({ year: Y, month: M, perPage: 0 });
  return { W, dm, P };
}
const sel = (P, ids) => { P.c.setState({ tkSel: {} }); const V = P.c.renderVals(); ids.forEach((id) => { const t = rowOf(V, id); assert.ok(t && t.selCan, 'صفٌّ قابلٌ للتحديد ' + id); t.selToggle({ stopPropagation() {} }); }); return P.c.renderVals(); };
const run = async (P) => { P.c.renderVals().tkBulkDo(); assert.ok(await until(() => !!P.c.state.tkBulkRes), 'اكتمل: ' + JSON.stringify([P.c.state.tkBulkErr, P.c.state.tkBulkProg])); return P.c.state.tkBulkRes; };

test('البند 11 · التحديد: خانةٌ لكل صفٍّ مفرد · «تحديد الكل في الصفحة» · الشريطُ يظهر عند التحديد ويختفي بقفل الشهر', async () => {
  const { P } = await setup();
  let V = P.c.renderVals();
  assert.equal(V.tkBulkOn, false, 'لا شريطَ بلا تحديد'); assert.equal(V.selAllOn, false); assert.equal(V.selAllCan, true);
  const t = rowOf(V, P1); assert.equal(t.selCan, true); assert.equal(t.selOn, false); assert.equal(t.selKey, DAY + '#' + P1 + '#' + ME.eid);
  t.selToggle({ stopPropagation() {} }); V = P.c.renderVals();
  assert.equal(rowOf(V, P1).selOn, true); assert.equal(V.tkBulkOn, true); assert.match(V.tkBulkN, /مهمة/); assert.equal(V.tkBulkActs.map((b) => b.label).join('|'), '✓ اعتماد الإنجاز|تمديد المهلة|إعادة إسناد|إلغاء');
  V.selAllToggle(); V = P.c.renderVals();
  const pg = V.allFiltered.filter((q) => q.selCan); assert.ok(pg.length >= 8); assert.ok(pg.every((q) => q.selOn), 'كلُّ صفوف الصفحة محدَّدة'); assert.equal(V.selAllOn, true);
  V.selAllToggle(); V = P.c.renderVals(); assert.ok(V.allFiltered.every((q) => !q.selOn)); assert.equal(V.tkBulkOn, false);
  /* رأسُ المجموعة بلا خانة */
  const grp = V.allFiltered.find((q) => q.isGroup); assert.ok(grp, 'في المخزن مهمةٌ جماعية'); assert.equal(grp.selCan, false);
  /* شهرٌ مقفل ⇒ لا تحديد ولا شريط */
  sel(P, [P1]); P.c.setState({ locked: { [Y + '-' + M]: true } }); V = P.c.renderVals(); assert.equal(V.tkBulkOn, false); assert.equal(rowOf(V, P1).selCan, false); P.c.setState({ locked: {} });
});

test('البند 11 · اعتمادٌ جماعي: المسلَّمةُ بانتظار المراجعة تُعتمد صفّاً صفّاً، وغيرُها يُتخطّى بسببه — والمنفَّذُ يخرج من التحديد', async () => {
  const { W, P } = await setup();
  let V = sel(P, [S1, S2, P1]);
  V.tkBulkActs[0].click(); V = P.c.renderVals();
  assert.equal(V.tkBulkOpen, true); assert.equal(V.tkBulkHead, 'اعتماد الإنجاز لكل المحدَّد'); assert.match(V.tkBulkSub, /3 مهام محدَّدة — 2 مؤهّلة · 1 ستُتخطّى/); assert.equal(V.tkBulkBtn, 'اعتماد (2)');
  const R = await run(P);
  assert.equal(R.ok, 2); assert.equal(R.fail.length, 0); assert.equal(R.skip.length, 1); assert.match(R.skip[0].why, /ليست بانتظار المراجعة/); assert.equal(R.skip[0].title, 'TEST_ONLY جماعي · معلّقة ١');
  assert.equal(srv(W, S1)[3], 'done'); assert.equal(srv(W, S1)[23].rev.st, 'approved'); assert.equal(srv(W, S2)[3], 'done');
  V = P.c.renderVals(); assert.equal(V.tkBulkResOn, true); assert.match(V.tkBulkResOk, /نجح مهمتان|نجح 2/); assert.equal(V.tkBulkProgPct, '100%'); assert.equal(V.tkBulkCloseLbl, 'إغلاق'); assert.match(V.tkBulkSub, /اكتمل التنفيذ — نجح 2 · فشل 0 · تُخطّي 1/);
  assert.deepEqual(Object.keys(P.c.state.tkSel), [DAY + '#' + P1 + '#' + ME.eid], 'المنفَّذةُ خرجت من التحديد والمتخطّاةُ باقية');
  assert.equal(W.env.DB.q("SELECT COUNT(*) AS n FROM aud WHERE k = ? AND act = 'approved'", KT)[0].n, 2, 'حدثا تدقيقٍ من الخادم');
  V.tkBulkCancel(); assert.equal(P.c.state.tkBulk, null);
});

test('البند 11 · تمديدٌ جماعي بقيمةٍ واحدة: بلا مهلةٍ رسالة · المنجزةُ تُتخطّى · والفاشلُ في الخادم يُسجَّل بسببه ويبقى محدَّداً', async () => {
  const { W, P } = await setup();
  /* F1 تُحذف من الخادم بعد تحميل الصفحة ⇒ 404 not-found عند التنفيذ */
  { const S = stored(W.env, KT); S[DAY] = S[DAY].filter((r) => r[13] !== F1); await replaceOperationalFixture(W.env, KT, S); }
  let V = sel(P, [P1, D1, F1]);
  V.tkBulkActs[1].click(); V = P.c.renderVals(); assert.equal(V.tkBulkExtOn, true); assert.equal(V.tkBulkExts.length, 4);
  V.tkBulkDo(); assert.match(P.c.state.tkBulkErr, /اختر المهلةَ الجديدة/);
  P.c.renderVals().tkBulkExts[2].click(); const e9 = +P.c.state.tkBulkExt; assert.ok(e9 > Date.now() + 23 * 36e5); assert.match(P.c.renderVals().tkBulkExtTxt, /المهلةُ الجديدة/);
  const R = await run(P);
  assert.equal(R.ok, 1); assert.equal(R.skip.length, 1); assert.match(R.skip[0].why, /مغلقة — منجزة/);
  assert.equal(R.fail.length, 1); assert.equal(R.fail[0].title, 'TEST_ONLY جماعي · ستُحذف من الخادم'); assert.match(R.fail[0].why, /لم تعد المهمة كما كانت/);
  assert.equal(srv(W, P1)[16], e9, 'مُدّدت في الخادم'); assert.ok(srv(W, P1)[23].ext && srv(W, P1)[23].ext.length);
  assert.deepEqual(Object.keys(P.c.state.tkSel).sort(), [DAY + '#' + D1 + '#' + ME.eid, DAY + '#' + F1 + '#' + ME.eid].sort(), 'الفاشلةُ والمتخطّاةُ تبقيان محدَّدتين');
});

test('البند 11 · إلغاءٌ جماعي بسببٍ واحد (العامةُ أيضاً) · وإعادةُ إسنادٍ جماعية إلى موظفٍ واحد — المسندةُ إليه أصلاً والعامةُ تُتخطّيان', async () => {
  const { W, P } = await setup();
  let V = sel(P, [P2, G1, D1]);
  V.tkBulkActs[3].click(); V = P.c.renderVals(); assert.equal(V.tkBulkHead, 'إلغاء المهام المحدَّدة');
  V.tkBulkDo(); assert.match(P.c.state.tkBulkErr, /اذكر سبب الإلغاء/);
  P.c.renderVals().onTkBulkWhy({ target: { value: 'TEST_ONLY أُلغيت جماعياً' } });
  let R = await run(P);
  assert.equal(R.ok, 2); assert.equal(R.skip.length, 1); assert.match(R.skip[0].why, /منجزة/);
  assert.equal(srv(W, P2)[23].asg, 'cancelled'); assert.equal(srv(W, P2)[23].can.why, 'TEST_ONLY أُلغيت جماعياً'); assert.equal(srv(W, G1)[23].asg, 'cancelled');
  P.c.renderVals().tkBulkCancel(); await P.sync(); P.c.setState({ year: Y, month: M, perPage: 0 });
  /* إعادةُ الإسناد: P1 (موظفُنا) ⇒ الزميل · P3 مسندةٌ للزميل أصلاً · G1 عامةٌ (وملغاة) */
  V = sel(P, [P1, P3, G1]);
  V.tkBulkActs[2].click(); V = P.c.renderVals(); assert.equal(V.tkBulkEmpOn, true); assert.ok(V.tkBulkEmps.some((o) => o.v === MATE.eid));
  V.tkBulkDo(); assert.match(P.c.state.tkBulkErr, /اختر الموظفَ الجديد/);
  P.c.renderVals().onTkBulkTo({ target: { value: MATE.eid } }); V = P.c.renderVals(); assert.match(V.tkBulkSub, /1 مؤهّلة · 2 ستُتخطّى/);
  R = await run(P);
  assert.equal(R.skip.length, 2); assert.ok(R.skip.some((q) => /الموظف نفسِه/.test(q.why)) && R.skip.some((q) => /عامةٌ بلا مكلَّف/.test(q.why)), JSON.stringify(R.skip));
  if (R.ok === 1) {
    assert.equal(srv(W, P1)[23].asg, 'reassigned');
    const nw = (stored(W.env, KT)[DAY] || []).find((r) => r[0] === 'TEST_ONLY جماعي · معلّقة ١' && r[14] === MATE.eid && r[13] !== P1); assert.ok(nw, 'نسخةٌ جديدة للمكلَّف الجديد');
  } else {
    /* «غير متاح» (409 elig) لا يُفرض جماعياً — يُسجَّل بسببه */
    assert.equal(R.fail.length, 1); assert.match(R.fail[0].why, /غيرُ متاحٍ في موعدها/); assert.notEqual(srv(W, P1)[23].asg, 'reassigned');
  }
});
