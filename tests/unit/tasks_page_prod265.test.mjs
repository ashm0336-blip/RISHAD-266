import { attachTaskOperations, taskText } from './tasks_vm_operations_fx.mjs';
import { replaceOperationalFixture } from './operational_legacy_seed_fx.mjs';
import { taskCommandBody } from './tasks_fx.mjs';
/* KIVO_265 · البند 8 — صفحةُ المهام (src/modules/tasks/logic.js في vm + KIVO.BassamPageKit الحقيقي) على العامل الحقيقي: تقريرُ إنتاجية المهام للشهر المختار
   لكل موظف (وورديتُه من الجدول الشهري كما يراها المنتقي) ولكل وردية: المسندة · المنجزة · في الوقت/متأخرة · متوسطُ الفعلي/المخطط · معدّلُ التوثيق بالصور —
   من المخزن الشهري المحلي، قابلٌ للتصدير Excel/الطباعة بالآلية القائمة. بياناتٌ اصطناعية (tasks_fx). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { ROOT, moduleLogic } from './harness.mjs';
import { world, workerUnderTest, ME, MATE, KT, KE, D, stored, putKV, row, hij } from './tasks_fx.mjs';

const WU = workerUnderTest();
const LOGIC = moduleLogic('tasks');
const KS = 'bsdept:' + D + ':bassam_staffing_v3';
async function page(W, ck, storeJson, emps, extra) {
  const store = new Map([['bassam_tasks_v1', storeJson], ['bassam_employees_v1', JSON.stringify(emps)]].concat(Object.entries(extra || {})));
  const KIVO = {}, toasts = [], xlsx = [], prints = [];
  const ctx = { KIVO, console, Intl, Date, Math, JSON, Promise, Object, Array, String, Number, RegExp, Set, Map, Error, isNaN, parseInt, setTimeout: (f) => { f(); return 0; }, clearTimeout, setInterval: () => 0, clearInterval: () => 0,
    localStorage: { getItem: (k) => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    document: { hidden: false, querySelector: () => null, addEventListener: () => {}, removeEventListener: () => {} }, navigator: { userAgent: 'node' }, addEventListener: () => {}, removeEventListener: () => {},
    __BS_BOOT: { srv: 1 }, print: () => prints.push(1),
    fetch: (u, o) => W.C.req(u, { method: (o && o.method) || 'GET', body: o && o.body, cookie: ck, headers: (o && o.headers) || {} }) };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ['src/services/490-emp-key.js', 'src/services/440-count.js', 'src/services/546-task-model.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
  KIVO.BassamPerm = { can: () => true, on: () => true }; KIVO.bsPct = (a, b) => (b ? Math.round(100 * a / b) : 0) + '٪';
  KIVO.BassamXLSX = { download: (rows, name) => xlsx.push({ rows, name }) };
  KIVO.BassamAuth = { user: () => ({ id: 'tst_dm1', role: 'staff', mgr: true, ekey: 'mgr:tst_d1', deptId: D, name: 'TEST_ONLY مدير' }), display: () => ({ name: 'TEST_ONLY مدير' }), users: () => [] };
  KIVO.BassamDepts = { active: () => D }; KIVO.BassamSup = { isSup: () => false };
  class DCLogic { constructor() { this.state = {}; } setState(p, cb) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); cb && cb(); } }
  ctx.DCLogic = DCLogic;
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/components/565-page-kit.js'), 'utf8'), ctx);
  const B0 = KIVO.BassamPageKit.base; KIVO.BassamPageKit.base = (B, a) => class extends B0(B, a) { bsOn() { return true; } bsToast(m, k) { toasts.push([m, k]); } bsAck(m, k) { toasts.push([m, k || 'ok']); return Promise.resolve(true); } };
  vm.runInContext(LOGIC + '\n;globalThis.__C = Component;', ctx, { filename: 'tasks/logic.js' });
  const opsFixture = await attachTaskOperations(ctx, { store, W, ck });
  const c = new ctx.__C(); c._tkDayDef = () => 0;   /* اختباراتُ الشهر كاملاً (KIVO_265 · كروتُ الأيام: الافتراضي يومُ اليوم) */ c.state = Object.assign({}, c.state || {}, { locked: {} });
  c.bsToast = (m, k) => toasts.push([m, k || 'err']);
  return { c, opsFixture, store, toasts, xlsx, prints };
}
/* شهرٌ خالٍ من بذور tasks_fx: بعد شهرين من اليوم */
const FUT = Date.now() + 62 * 864e5, [Y, M] = hij(FUT).split('-').map(Number), YM = Y + '-' + M, K1 = YM + '-5', K2 = YM + '-6';

test('البند 8 · الإنتاجية للشهر المختار: لكل موظف (بورديته من الجدول) ولكل وردية — المسندة · المنجزة · في الوقت/متأخرة · متوسط الفعلي/المخطط · التوثيق بالصور · تصدير وطباعة', async () => {
  const W = await world({ worker: WU.file }); const dm = await W.login('0000000101', '70101');
  const MIN = 6e4, S = stored(W.env, KT), t0 = FUT;
  const Sf = stored(W.env, KS) || {}; Sf[YM] = { [ME.eid]: { shift: 'TST-A', rest: [] }, [MATE.eid]: { shift: 'TST-B', rest: [] }, tst_e_emp1: { shift: 'TST-A', rest: [] } }; await replaceOperationalFixture(W.env, KS, Sf);
  S[K1] = [
    /* موظفُنا (TST-A): 4 مسندة — منجزتان (واحدةٌ في الوقت بصورة 45/60 · واحدةٌ متأخرة بلا صورة 90/60) · معلّقة · ملغاة */
    row({ id: 1760000055001, title: 'إنتاجية · أ١', eid: ME.eid, st: 'done', dur: 60, acc: t0, fin: t0 + 45 * MIN, perf: ['on_time', 'في الوقت'], s: t0, e: t0 + 60 * MIN, r21: { imgs: ['img_tskprod_a1'], note: '', sub: 1, at: t0 + 45 * MIN } }),
    row({ id: 1760000055002, title: 'إنتاجية · أ٢', eid: ME.eid, st: 'done', dur: 60, acc: t0, fin: t0 + 90 * MIN, perf: ['late', 'متأخر 30 د'], s: t0, e: t0 + 60 * MIN, r21: { imgs: [], note: 'TEST_ONLY بلا صورة', sub: 1, at: t0 + 90 * MIN } }),
    row({ id: 1760000055003, title: 'إنتاجية · أ٣', eid: ME.eid, s: t0 + 3 * 36e5, e: t0 + 4 * 36e5 }),
    Object.assign(row({ id: 1760000055004, title: 'إنتاجية · أ٤ ملغاة', eid: ME.eid, s: t0 + 3 * 36e5, e: t0 + 4 * 36e5 }), { 23: { v: 1, asg: 'cancelled', can: { why: 'x' } } }),
    /* الزميل (TST-B): منجزةٌ مبكرة بصورتين بلا مدةٍ مخططة · نسخةُ «أُعيد إسنادها» لا تُعدّ */
    row({ id: 1760000055005, title: 'إنتاجية · ب١', eid: MATE.eid, st: 'done', dur: 0, acc: t0, fin: t0 + 20 * MIN, perf: ['early', 'مبكر بـ 10 د'], s: t0, e: t0 + 30 * MIN, r21: { imgs: ['img_tskprod_b1', 'img_tskprod_b2'], note: '', sub: 1, at: t0 + 20 * MIN } }),
    Object.assign(row({ id: 1760000055006, title: 'إنتاجية · ب٢ أُعيد إسنادها', eid: MATE.eid, s: t0, e: t0 + 30 * MIN }), { 23: { v: 1, asg: 'reassigned', re: { to: { e: ME.eid, n: ME.name } } } }),
    /* عامةٌ بلا مكلَّف: خارج الحساب */
    row({ id: 1760000055007, title: 'إنتاجية · عامة', s: t0, e: t0 + 30 * MIN }),
  ];
  /* tst_e_emp1 (TST-A أيضاً) في يومٍ آخر: منجزةٌ 130/60 (تحذيرية) بلا صورة */
  S[K2] = [row({ id: 1760000055008, title: 'إنتاجية · ج١', eid: 'tst_e_emp1', st: 'done', dur: 60, acc: t0 + 864e5, fin: t0 + 864e5 + 130 * MIN, perf: ['late', 'متأخر 70 د'], s: t0 + 864e5, e: t0 + 864e5 + 60 * MIN })];
  await replaceOperationalFixture(W.env, KT, S);
  const g = await W.C.api("/api/operations/read?keys=" + encodeURIComponent(KT + ',' + KE + ',' + KS), { cookie: dm.ck });
  const P = await page(W, dm.ck, taskText(g.j, KT), JSON.parse(taskText(g.j, KE)), { bassam_staffing_v3: taskText(g.j, KS) });
  P.c.setState({ year: Y, month: M, perPage: 0 });
  let V = P.c.renderVals();
  assert.equal(V.showProd, false); assert.equal(V.showList, true);
  V.subProd(); V = P.c.renderVals();
  assert.equal(V.showProd, true); assert.equal(V.showList, false); assert.equal(V.showKanban, false); assert.equal(V.isEmptyDay, false); assert.equal(V.prodHas, true);
  assert.match(V.prodTitle, /إنتاجية مهام/); assert.match(V.prodSub, /مسندة إلى 3 موظفين/); assert.match(V.prodSub, / · 1 ملغاة \(خارج الحساب\)/); assert.match(V.prodSub, /مهمة واحدة عامة بلا مكلَّف|1 عامة|عامة بلا مكلَّف/);
  /* لكل موظف — مرتَّبون بالمنجز ثم المسند */
  const E = V.prodEmpRows; assert.equal(E.length, 3);
  const me = E.find((q) => q.name === ME.name), mate = E.find((q) => q.name === MATE.name), e1 = E.find((q) => /tst_e_emp1|موظف|TEST_ONLY/.test(q.name) && q !== me && q !== mate);
  assert.equal(E[0], me, 'الأكثرُ إنجازاً أولاً');
  assert.equal(me.shift, 'TST-A'); assert.equal(me.asg, 3, 'الملغاةُ ليست مسندةً قائمة (الموجة 1 · DG-01)'); assert.equal(me.done, 2); assert.equal(me.onTime, 1); assert.equal(me.late, 1); assert.equal(me.can, 1);
  assert.equal(me.apAvg, '113٪', 'متوسط (45/60 + 90/60) ÷ 2 = 112.5٪'); assert.equal(me.apWarn, false); assert.equal(me.docPct, '50٪'); assert.equal(me.donePct, '67٪', 'منجزتان من ثلاثٍ قائمة (الملغاةُ خارج المقام)'); assert.equal(me.onTimePct, '50٪'); assert.equal(me.onTimeTxt, '1 / 1');
  assert.equal(mate.shift, 'TST-B'); assert.equal(mate.asg, 1, 'نسخةُ «أُعيد إسنادها» لا تُعدّ'); assert.equal(mate.done, 1); assert.equal(mate.onTime, 1); assert.equal(mate.apAvg, '—', 'بلا مدةٍ مخططة'); assert.match(mate.apTip, /لا منجزةَ بمدةٍ مخططة/); assert.equal(mate.docPct, '100٪');
  assert.ok(e1, 'الموظفُ الثالث'); assert.equal(e1.shift, 'TST-A'); assert.equal(e1.apAvg, '217٪'); assert.equal(e1.apWarn, true); assert.match(e1.apStyle, /warning/); assert.equal(e1.docPct, '0٪'); assert.equal(e1.late, 1);
  /* لكل وردية: TST-A تجمع موظفَين */
  const H = V.prodShiftRows; assert.equal(H.length, 2);
  const ha = H.find((q) => q.name === 'TST-A'), hb = H.find((q) => q.name === 'TST-B');
  assert.equal(ha.asg, 4); assert.equal(ha.done, 3); assert.equal(ha.onTime, 1); assert.equal(ha.late, 2); assert.equal(ha.apAvg, '147٪', '(0.75 + 1.5 + 2.167) ÷ 3'); assert.equal(ha.apWarn, true); assert.equal(ha.docPct, '33٪');
  assert.equal(hb.asg, 1); assert.equal(hb.done, 1); assert.equal(hb.docPct, '100٪'); assert.equal(hb.apAvg, '—');
  /* الإجمالي */
  assert.equal(V.prodTot.asg, 5); assert.equal(V.prodTot.done, 4); assert.equal(V.prodTot.onTime, 2); assert.equal(V.prodTot.late, 2); assert.equal(V.prodTot.docPct, '50٪'); assert.equal(V.prodTot.apAvg, '147٪');
  /* التصدير (Excel بالآلية القائمة) والطباعة */
  V.prodExport(); assert.equal(P.xlsx.length, 1); assert.match(P.xlsx[0].name, /^tasks-prod-.*\.xlsx$/);
  const X = P.xlsx[0].rows; assert.equal(X[0][0], 'الموظف'); assert.equal(X[0][7], 'متوسط الفعلي/المخطط');
  const xm = X.find((r) => r[0] === ME.name); assert.equal(xm[1], 'TST-A'); assert.equal(xm[2], 3); assert.equal(xm[3], 2); assert.equal(xm[5], 1); assert.equal(xm[6], 1); assert.equal(xm[7], '113٪'); assert.equal(xm[8], '50٪');
  assert.ok(X.some((r) => r[0] === 'الإجمالي' && r[2] === 5), 'صفُّ الإجمالي'); assert.ok(X.some((r) => r[0] === 'الوردية'), 'جدولُ الورديات بعده'); assert.ok(X.some((r) => r[0] === 'TST-A' && r[2] === 4));
  V.prodPrint(); assert.equal(P.prints.length, 1, 'نافذةُ الطباعة');
  /* شهرٌ بلا مسندة ⇒ فراغُ القسم · والعودةُ إلى الجدول */
  P.c.setState({ month: M === 12 ? 11 : M + 1 }); V = P.c.renderVals(); assert.equal(V.showProd, true);
  if (!V.prodHas) { assert.equal(V.prodEmpty, true); }
  P.c.setState({ month: M }); V.subList(); V = P.c.renderVals(); assert.equal(V.showProd, false); assert.equal(V.showList, true);
});
