/* KIVO_265 · KIVO-Tasks — صفحةُ المهام الحقيقية (src/modules/tasks/logic.js في vm + KIVO.BassamPageKit الحقيقي) على العامل الحقيقي بعد المراجعة المستقلة لدمج 265:
   H-1  العمودُ 23 يكتبه الخادمُ وحده — فالصفحةُ (بخادم) لا تكتبه بحفظٍ خام: الإعداداتُ المتقدمة عند التعديل تُرسل إلى /api/tasks/settings بعد وصول التعديل
        نفسِه (طبقةُ التخزين: flushAsync — تحاكيها هنا حفظةُ /api/save من مخزن الصفحة)، وإعادةُ الفتح من /api/tasks/reopen
   L-2  نافذةُ «ربط بموظف» لا تختار أحداً بالاسم — مرشَّحُ الاسم الفريد اقتراحٌ يُعرض والاختيارُ صريح
   بياناتٌ اصطناعية (tasks_fx). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { ROOT, moduleLogic } from './harness.mjs';
import { world, workerUnderTest, ME, MATE, KT, KE, D, DAY, TAG, stored, putKV, row, hij, MID, HR } from './tasks_fx.mjs';

const WU = workerUnderTest();
const LOGIC = moduleLogic('tasks');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 5000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await sleep(25); } return false; }
/* الصفحةُ لمدير الإدارة (كما في tasks_page_p2) — ومعها طبقةُ التخزين: flushAsync يحفظ مخزنَ الصفحة في الخادم بحفظٍ خامّ ويعيد نجاحه */
function page(W, ck, storeJson, emps) {
  const store = new Map([['bassam_tasks_v1', storeJson], ['bassam_employees_v1', JSON.stringify(emps)]]);
  const KIVO = {}, toasts = [], saves = [];
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
  KIVO.__BS_SRV = { flushAsync: async () => { const sv = await W.C.save(ck, { [KT]: store.get('bassam_tasks_v1') }); saves.push(sv.j); return !!(sv.j && sv.j.revs && sv.j.revs[KT]); } };
  class DCLogic { constructor() { this.state = {}; } setState(p, cb) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); cb && cb(); } }
  ctx.DCLogic = DCLogic;
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/components/565-page-kit.js'), 'utf8'), ctx);
  const B0 = KIVO.BassamPageKit.base; KIVO.BassamPageKit.base = (B, a) => class extends B0(B, a) { bsOn() { return true; } bsToast(m, k) { toasts.push([m, k]); } bsAck(m, k) { toasts.push([m, k || 'ok']); return Promise.resolve(true); } };
  vm.runInContext(LOGIC + '\n;globalThis.__C = Component;', ctx, { filename: 'tasks/logic.js' });
  const c = new ctx.__C(); c._tkDayDef = () => 0;   /* اختباراتُ الشهر كاملاً (KIVO_265 · كروتُ الأيام: الافتراضي يومُ اليوم) */ c.state = Object.assign({}, c.state || {}, { locked: {} });
  c.bsToast = (m, k) => toasts.push([m, k || 'err']);
  return { c, store, toasts, saves, sync: async () => { const g = await W.C.api('/api/get?keys=' + encodeURIComponent(KT), { cookie: ck }); store.set('bassam_tasks_v1', g.j.keys[KT].v); c.setState({ tasksAll: JSON.parse(g.j.keys[KT].v) }); } };
}
async function pageFor(W, ck) { const g = await W.C.api('/api/get?keys=' + encodeURIComponent(KT + ',' + KE), { cookie: ck }); return page(W, ck, g.j.keys[KT].v, JSON.parse(g.j.keys[KE].v)); }
const srvRow = (W, k, id) => stored(W.env, KT)[k].find((r) => Array.isArray(r) && r[13] === id);

test('H-1 · الصفحة: تعديلُ مهمةٍ بإعداداتٍ متقدمة لا يكتب العمودَ 23 بحفظٍ خامّ — التعديلُ يصل ثم الإعداداتُ من /api/tasks/settings · وإعادةُ الفتح من /api/tasks/reopen', async () => {
  const W = await world({ worker: WU.file }); const dm = await W.login('0000000101', '70101'), me = await W.login(ME.un, ME.pw);
  /* غداً 10:00 بتوقيت الرياض — بلا عبورِ منتصف الليل ولا ساعةٍ بين 00 و03 (اليومُ التشغيلي) */
  const s = MID(Date.now()) + 864e5 + 10 * HR, h = new Date(s), he = new Date(s + 45 * 60e3), H12 = (h.getHours() % 12) || 12, AP = h.getHours() >= 12 ? 'م' : 'ص';
  const c = await W.C.api('/api/tasks/create', { method: 'POST', cookie: dm.ck, body: { k: hij(s), t: TAG + ' للتعديل', s, e: s + 45 * 60e3, asg: [ME.eid], rv: 'creator', force: true } });
  assert.equal(c.status, 200, JSON.stringify(c.j)); const k = c.j.rows[0].k, id = c.j.rows[0].id, [y, m, d] = k.split('-').map(Number);
  const P = await pageFor(W, dm.ck), i = JSON.parse(P.store.get('bassam_tasks_v1'))[k].findIndex((r) => r[13] === id);
  P.c.setState({ year: y, month: m, newTaskOpen: true, newTitle: TAG + ' عنوانٌ معدَّل', newDesc: 'تفاصيل', newPrio: 'normal', newDay: d, newEDay: d, newSh: H12, newSm: h.getMinutes(), newSap: AP,
    newEh: (he.getHours() % 12) || 12, newEm: he.getMinutes(), newEap: he.getHours() >= 12 ? 'م' : 'ص', newAsg: 'direct', newPick: { [ME.eid]: ME.name }, pickWt: '', newDur: '45', editRef: { d, i, grp: null, grpLabel: '' },
    newAdvTouched: true, newPol: 'note', newRv: 'none', newDecOk: false });
  const x0 = srvRow(W, k, id)[23];
  P.c.renderVals().submitTask();
  assert.ok(await until(() => { const r = srvRow(W, k, id); return r && r[23] && r[23].pol && r[23].pol.m === 'note'; }), 'وصلت الإعداداتُ من الخادم: ' + JSON.stringify({ saves: P.saves, toasts: P.toasts.slice(-3) }).slice(0, 400));
  const r1 = srvRow(W, k, id);
  assert.equal(r1[0], TAG + ' عنوانٌ معدَّل', 'والتعديلُ نفسُه وصل (حفظٌ خامّ بx كما هي)');
  assert.ok(P.saves.length && P.saves.every((j) => !(j.denied && j.denied[KT])), 'لم يُرفض حفظُ الصفحة: ' + JSON.stringify(P.saves).slice(0, 300));
  assert.equal(r1[23].rv, null); assert.equal(r1[23].dec, 0); assert.deepEqual(r1[23].by, x0.by, 'المنشئ كما هو');
  /* إعادةُ الفتح: التسليمُ ⇐ (بلا مراجِع الآن) منجزة ⇐ «إعادة المهمة للموظف» من الصفحة */
  { const S9 = stored(W.env, KT); const q9 = S9[k].find((r) => r[13] === id); q9[15] = Date.now() - HR; q9[16] = Date.now() + HR; putKV(W.env, KT, S9); }   /* KIVO_265 · نافذةُ التنفيذ: موعدُها الآن (كانت غداً 10:00 ولا بدءَ قبل الموعد) */
  assert.equal((await W.C.api('/api/me/tasks/act', { method: 'POST', cookie: me.ck, body: { k, id, act: 'start' } })).status, 200);
  assert.equal((await W.C.api('/api/me/tasks/act', { method: 'POST', cookie: me.ck, body: { k, id, act: 'submit', note: TAG + ' أُنجز' } })).status, 200);
  assert.equal(srvRow(W, k, id)[3], 'done');
  await P.sync(); const i2 = JSON.parse(P.store.get('bassam_tasks_v1'))[k].findIndex((r) => r[13] === id);
  P.c._doReopen(d, i2);
  assert.ok(await until(() => srvRow(W, k, id)[3] === 'in_progress'), 'أُعيد فتحُها من الخادم: ' + JSON.stringify(P.toasts.slice(-3)));
  assert.equal(W.env.DB.q("SELECT COUNT(*) AS n FROM aud WHERE k = ? AND act = 'reopened'", KT)[0].n, 1, 'بحدثِ تدقيقٍ من الخادم');
});

test('L-2 · الصفحة: «ربط بموظف» لا يختار أحداً بالاسم — مرشَّحُ الاسم الفريد اقتراحٌ يُعرض، والاسمُ المكرَّر بلا اقتراح', async () => {
  const W = await world({ worker: WU.file }); const dm = await W.login('0000000101', '70101');
  const E = stored(W.env, KE); E.push({ eid: 'tst_twin_b', name: ME.name, nid: '1088880002' }); putKV(W.env, KE, E);
  const S = stored(W.env, KT); S[DAY].push(row({ id: 1760000099801, title: 'باسمٍ فريد', eid: MATE.name }), row({ id: 1760000099802, title: 'باسمٍ مكرَّر', eid: ME.name })); putKV(W.env, KT, S);
  const P = await pageFor(W, dm.ck), L = JSON.parse(P.store.get('bassam_tasks_v1'))[DAY];
  P.c._tkActOpen('relink', L.find((r) => r[13] === 1760000099801), DAY);
  let V = P.c._tkActVals();
  assert.equal(P.c.state.tkActTo, '', 'لا اختيارَ تلقائيّ'); assert.match(V.tkActSub, /اقتراحٌ بالاسم: «/, 'والمرشَّحُ اقتراحٌ يُعرض');
  assert.ok(V.tkActEmps.every((o) => !o.sel), 'لا خيارَ محدَّدٌ في القائمة');
  V.tkActDo(); assert.match(P.c.state.tkActErr, /اختر الموظفَ صاحبَ المهمة/, 'الربطُ يحتاج اختياراً صريحاً');
  P.c._tkActOpen('relink', L.find((r) => r[13] === 1760000099802), DAY);
  V = P.c._tkActVals(); assert.equal(P.c.state.tkActTo, ''); assert.doesNotMatch(V.tkActSub, /اقتراحٌ بالاسم/, 'الاسمُ المكرَّر بلا اقتراح');
});
