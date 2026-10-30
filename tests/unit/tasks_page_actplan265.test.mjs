import { attachTaskOperations, taskText } from './tasks_vm_operations_fx.mjs';
import { replaceOperationalFixture } from './operational_legacy_seed_fx.mjs';
import { taskCommandBody } from './tasks_fx.mjs';
/* KIVO_265 · البند 7 — صفحةُ المهام (src/modules/tasks/logic.js في vm + KIVO.BassamPageKit الحقيقي) على العامل الحقيقي: الوقتُ الفعلي مقابل المخطط
   لكل صفٍّ منجز: الفعلي = العمود 12 − العمود 11 (دقائق) · المخطط = العمود 10 — شارةُ «45/60 د» في الجدول واللوحة والتصدير، تحذيريةٌ إن جاوز 120% من المخطط،
   ولا تمسّ العمودَ 6 (الأداءُ من المهلة). بياناتٌ اصطناعية (tasks_fx). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { ROOT, moduleLogic } from './harness.mjs';
import { world, workerUnderTest, ME, MATE, KT, KE, D, DAY, stored, putKV, row } from './tasks_fx.mjs';

const WU = workerUnderTest();
const LOGIC = moduleLogic('tasks');
async function page(W, ck, storeJson, emps) {
  const store = new Map([['bassam_tasks_v1', storeJson], ['bassam_employees_v1', JSON.stringify(emps)]]);
  const KIVO = {}, toasts = [], xlsx = [];
  const ctx = { KIVO, console, Intl, Date, Math, JSON, Promise, Object, Array, String, Number, RegExp, Set, Map, Error, isNaN, parseInt, setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => 0,
    localStorage: { getItem: (k) => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    document: { hidden: false, querySelector: () => null, addEventListener: () => {}, removeEventListener: () => {} }, navigator: { userAgent: 'node' }, addEventListener: () => {}, removeEventListener: () => {},
    __BS_BOOT: { srv: 1 },
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
  return { c, opsFixture, store, toasts, xlsx };
}
function allRows(V) { const out = []; const seen = new Set(); const walk = (o, d) => { if (!o || typeof o !== 'object' || d > 4 || seen.has(o)) return; seen.add(o); if (o.tkcT && Array.isArray(o.tkcT)) out.push(o); for (const k of Object.keys(o)) { const v = o[k]; if (Array.isArray(v)) v.forEach(x => walk(x, d + 1)); else if (v && typeof v === 'object' && k !== 'tkcT') walk(v, d + 1); } }; walk(V, 0); return out; }
const [Y, M] = DAY.split('-').map(Number);
const OK = 1760000066001, WARN = 1760000066002, NOPLAN = 1760000066003, RUN = 1760000066004, EDGE = 1760000066005;

test('البند 7 · الفعلي/المخطط: شارةٌ للمنجزة وحدها (12 − 11 مقابل 10) · تحذيرٌ فوق 120% · بلا مخطط «—» · في الجدول واللوحة والتصدير · العمودُ 6 كما هو', async () => {
  const W = await world({ worker: WU.file }); const dm = await W.login('0000000101', '70101');
  const now = Date.now(), S = stored(W.env, KT), MIN = 6e4;
  S[DAY].push(
    row({ id: OK, title: 'فعلي · في الحدود', eid: ME.eid, st: 'done', dur: 60, acc: now - 100 * MIN, fin: now - 55 * MIN, perf: ['early', 'مبكر بـ 10 د'], s: now - 120 * MIN, e: now - 45 * MIN }),
    row({ id: WARN, title: 'فعلي · تجاوز', eid: MATE.eid, st: 'done', dur: 60, acc: now - 100 * MIN, fin: now - 20 * MIN, perf: ['late', 'متأخر 5 د'], s: now - 120 * MIN, e: now - 25 * MIN }),
    row({ id: NOPLAN, title: 'فعلي · بلا مخطط', eid: ME.eid, st: 'done', dur: 0, acc: now - 50 * MIN, fin: now - 5 * MIN, s: now - 60 * MIN, e: now }),
    row({ id: RUN, title: 'فعلي · جارية', eid: ME.eid, st: 'in_progress', dur: 60, acc: now - 30 * MIN, s: now - 40 * MIN, e: now + 30 * MIN }),
    row({ id: EDGE, title: 'فعلي · 120% بالضبط', eid: ME.eid, st: 'done', dur: 50, acc: now - 100 * MIN, fin: now - 40 * MIN, s: now - 120 * MIN, e: now - 30 * MIN }),
  );
  await replaceOperationalFixture(W.env, KT, S);
  const g = await W.C.api("/api/operations/read?keys=" + encodeURIComponent(KT + ',' + KE), { cookie: dm.ck });
  const P = await page(W, dm.ck, taskText(g.j, KT), JSON.parse(taskText(g.j, KE)));
  P.c.setState({ year: Y, month: M, perPage: 0 });
  const V = P.c.renderVals(), R = allRows(V), by = (id) => R.find((t) => t.tkcT[13] === id);
  const ok = by(OK); assert.equal(ok.apOn, true); assert.equal(ok.apTxt, '45/60 د'); assert.equal(ok.apWarn, false); assert.equal(ok.apAct, 45); assert.equal(ok.apPlan, 60); assert.match(ok.apStyle, /success/); assert.match(ok.apTip, /75%/);
  assert.equal(ok.showPerf, true); assert.equal(ok.perfLabel, 'مبكر بـ 10 د', 'العمودُ 6 كما هو');
  const w = by(WARN); assert.equal(w.apTxt, '80/60 د'); assert.equal(w.apWarn, true); assert.match(w.apStyle, /warning/); assert.match(w.apTip, /133%/); assert.match(w.apTip, /تجاوز 120%/); assert.equal(w.perfLabel, 'متأخر 5 د');
  const np = by(NOPLAN); assert.equal(np.apOn, true); assert.equal(np.apTxt, '45/— د'); assert.equal(np.apWarn, false); assert.match(np.apTip, /بلا مدةٍ مخططة/); assert.doesNotMatch(np.apStyle, /warning|success/);
  const ed = by(EDGE); assert.equal(ed.apTxt, '60/50 د'); assert.equal(ed.apWarn, false, '120% بالضبط ليس تجاوزاً');
  const rn = by(RUN); assert.equal(rn.apOn, false); assert.equal(rn.apTxt, '');
  /* اللوحة: البطاقةُ المنجزة تحمل الشارة */
  const kd = V.kanbanCols.find((c) => c.key === 'done').tasks.find((t) => t.tkcT[13] === WARN); assert.ok(kd && kd.apOn && kd.apTxt === '80/60 د' && kd.apWarn, 'شارةُ اللوحة');
  /* رأسُ المجموعة بلا شارة */
  const grp = V.allFiltered.find((q) => q.isGroup); assert.ok(grp); assert.equal(grp.apOn, false);
  /* التصدير: عمودٌ جديد بعد «مدة الإنجاز» وقيمتُه للمنجزة وحدها */
  V.exportCsv(); const X = P.xlsx[0].rows; assert.equal(X[0][7], 'الفعلي/المخطط (د)'); assert.equal(X[0][6], 'مدة الإنجاز'); assert.equal(X[0][8], 'الحالة');
  const xr = (id) => X.find((r) => r[1] === by(id).title); assert.equal(xr(WARN)[7], '80/60 د'); assert.equal(xr(RUN)[7], ''); assert.equal(xr(NOPLAN)[7], '45/— د');
});
