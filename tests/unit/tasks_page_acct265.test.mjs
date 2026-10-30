/* KIVO_265 · قرارُ المالك (2026-10-14 15:13 · البند 4) في الواجهة: «مع بيان السبب في الواجهة» — صفحةُ المهام الحقيقية (src/modules/tasks/logic.js في vm
   + KIVO.BassamPageKit الحقيقي + 546 الحقيقي) على العامل الحقيقي (tasks_fx · بياناتٌ اصطناعية وحدها):
     (أ) منتقي المكلَّفين: مَن لا حسابَ له أو حسابُه معطَّل معلَّمٌ بسببه (لا يُختار — ونصُّ التنبيه يذكر السبب) · وصاحبُ الحساب النشط غيرُ معلَّم
         · وبلا قائمة حسابات (لا قراءةَ لها) لا تعليمَ في الواجهة: الخادمُ يحكم ويبيّن
     (ب) الإنشاء: ردُّ الخادم 409 acct ⇒ نافذةُ الأهلية بالسبب وبلا «إسنادٌ رغم ذلك» (لا يُرسل شيء) · وصاحبُ الحساب النشط يُنشأ له
     (ج) إعادةُ الإسناد: الأهليةُ القاطعة (hard) ⇒ رسالةٌ بالسبب ولا إرسال — وقائمةُ الموظفين تذكر «بلا حسابِ مستخدم» بجانب الاسم */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { ROOT, moduleLogic } from './harness.mjs';
import { world, workerUnderTest, ME, MATE, KT, KE, D, TAG, stored, putKV, hij, HR } from './tasks_fx.mjs';

const WU = workerUnderTest();
const LOGIC = moduleLogic('tasks');
const DM = ['0000000101', '70101'], NOACCT = 'tst_e_noacct';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 5000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await sleep(25); } return false; }
function seed(W) {
  const E = stored(W.env, KE), base = E.find((e) => e.eid === ME.eid);
  E.push(Object.assign({}, base, { eid: NOACCT, name: TAG + ' · بلا حساب', empno: '' })); putKV(W.env, KE, E);
  const U = stored(W.env, 'bassam_auth_users_v1'); U.find((u) => u.id === MATE.uid).dis = 1; putKV(W.env, 'bassam_auth_users_v1', U);
}
/* الصفحةُ لمدير الإدارة (كما في tasks_page_review265) — users: ما تعطيه طبقةُ الحسابات للمدير (قائمةُ حسابات إدارته) */
function page(W, ck, storeJson, emps, users) {
  const store = new Map([['bassam_tasks_v1', storeJson], ['bassam_employees_v1', JSON.stringify(emps)]]);
  const KIVO = {}, toasts = [], calls = [];
  const ctx = { KIVO, console, Intl, Date, Math, JSON, Promise, Object, Array, String, Number, RegExp, Set, Map, Error, isNaN, parseInt, setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => 0,
    localStorage: { getItem: (k) => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    document: { hidden: false, querySelector: () => null, addEventListener: () => {}, removeEventListener: () => {} }, navigator: { userAgent: 'node' }, addEventListener: () => {}, removeEventListener: () => {},
    __BS_BOOT: { srv: 1 },
    fetch: (u, o) => { calls.push(String(u)); return W.C.req(u, { method: (o && o.method) || 'GET', body: o && o.body, cookie: ck, headers: (o && o.headers) || {} }); } };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ['src/services/490-emp-key.js', 'src/services/440-count.js', 'src/services/546-task-model.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
  KIVO.BassamPerm = { can: () => true, on: () => true }; KIVO.bsPct = (a, b) => (b ? Math.round(100 * a / b) : 0) + '٪';
  KIVO.BassamAuth = { user: () => ({ id: 'tst_dm1', role: 'staff', mgr: true, ekey: 'mgr:tst_d1', deptId: D, name: 'TEST_ONLY مدير' }), display: () => ({ name: 'TEST_ONLY مدير' }), users: () => users };
  KIVO.BassamDepts = { active: () => D };
  KIVO.BassamSup = { isSup: () => false };
  KIVO.__BS_SRV = { flushAsync: async () => true };
  class DCLogic { constructor() { this.state = {}; } setState(p, cb) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); cb && cb(); } }
  ctx.DCLogic = DCLogic;
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/components/565-page-kit.js'), 'utf8'), ctx);
  const B0 = KIVO.BassamPageKit.base; KIVO.BassamPageKit.base = (B, a) => class extends B0(B, a) { bsOn() { return true; } bsToast(m, k) { toasts.push([m, k]); } bsAck(m, k) { toasts.push([m, k || 'ok']); return Promise.resolve(true); } };
  vm.runInContext(LOGIC + '\n;globalThis.__C = Component;', ctx, { filename: 'tasks/logic.js' });
  const c = new ctx.__C(); c._tkDayDef = () => 0;   /* اختباراتُ الشهر كاملاً (KIVO_265 · كروتُ الأيام: الافتراضي يومُ اليوم) */ c.state = Object.assign({}, c.state || {}, { locked: {} });
  c.bsToast = (m, k) => toasts.push([m, k || 'err']);
  return { c, store, toasts, calls };
}
async function pageFor(W, ck, users) {
  const g = await W.C.api('/api/get?keys=' + encodeURIComponent(KT + ',' + KE), { cookie: ck });
  return page(W, ck, g.j.keys[KT].v, JSON.parse(g.j.keys[KE].v), users);
}
const usersOf = (W) => stored(W.env, 'bassam_auth_users_v1').filter((u) => u.deptId === D).map((u) => ({ id: u.id, role: u.role, deptId: u.deptId, ekey: u.ekey, dis: u.dis, mgr: u.mgr }));
const pickOf = (c, day) => { const M = c.tkPickModel(day); const all = {}; (M.groups || []).forEach((g) => g.emps.forEach((e) => { all[e.id] = e; })); return all; };

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';

  test(M + '(أ) منتقي المكلَّفين: بلا حساب ومعطَّل معلَّمان بالسبب ولا يُختاران · النشطُ غيرُ معلَّم · بلا قائمة حسابات لا تعليمَ في الواجهة', async () => {
    const W = await world({ worker: WU.file, mode }); seed(W); const dm = await W.login(...DM);
    const s = Date.now() + 2 * HR, H = hij(s).split('-').map(Number);
    const P = await pageFor(W, dm.ck, usersOf(W)); P.c.setState({ year: H[0], month: H[1] });
    const all = pickOf(P.c, H[2]);
    assert.equal(all[NOACCT] && all[NOACCT].acct, 'none', 'بلا حساب: ' + JSON.stringify(all[NOACCT])); assert.equal(all[NOACCT].off, 'بلا حسابِ مستخدم');
    assert.equal(all[MATE.eid] && all[MATE.eid].acct, 'disabled'); assert.equal(all[MATE.eid].off, 'حسابُه معطَّل');
    assert.ok(all[ME.eid] && !all[ME.eid].acct, 'النشطُ غيرُ معلَّمٍ بالحساب: ' + JSON.stringify(all[ME.eid]));
    /* النقرُ على المعلَّم: تنبيهٌ بالسبب ولا اختيار */
    /* KIVO_265 · البند 13 (أداءُ المنتقي): أفرادُ الورديات المفتوحة وحدهم يُرسمون — تُفتح كلُّها هنا */
    P.c.setState({ newAsg: 'direct', newPick: {}, pickOpen: Object.fromEntries(P.c.tkPickModel(H[2]).groups.map((g) => [g.name, true])) });
    const V = P.c.tkAsgVals(H[2], {}), item = V.pickGroups.flatMap((g) => g.emps || []).find((e) => e.name === TAG + ' · بلا حساب');
    assert.ok(item && item.isOff === true && item.offLbl === 'بلا حسابِ مستخدم', 'بندُ المنتقي معلَّمٌ بسببه: ' + JSON.stringify(item && { isOff: item.isOff, offLbl: item.offLbl }));
    item.click();
    assert.ok(!P.c.state.newPick || !P.c.state.newPick[NOACCT], 'لا يُختار');
    assert.ok(P.toasts.some((t) => /لا تُسند مهمةٌ إلكترونية/.test(t[0]) && /بلا حسابِ مستخدم/.test(t[0])), 'التنبيهُ بالسبب: ' + JSON.stringify(P.toasts));
    const P0u = await pageFor(W, dm.ck, []); P0u.c.setState({ year: H[0], month: H[1] });
    const all0 = pickOf(P0u.c, H[2]);
    assert.ok(all0[NOACCT] && !all0[NOACCT].acct, 'بلا قائمة حسابات: لا تعليمَ في الواجهة (الخادمُ يحكم)');
  });

  test(M + '(ب) الإنشاء: 409 acct ⇒ نافذةُ الأهلية بالسبب وبلا «إسنادٌ رغم ذلك» ولا إرسال · وصاحبُ الحساب النشط يُنشأ له', async () => {
    const W = await world({ worker: WU.file, mode }); seed(W); const dm = await W.login(...DM);
    const P = await pageFor(W, dm.ck, usersOf(W)), s = Date.now() + 2 * HR;
    const b = { k: hij(s), t: TAG + ' من الواجهة', s, e: s + HR, asg: [NOACCT], rv: 'none' };
    const n0 = Object.values(stored(W.env, KT)).flat().length;
    P.c._tkCreateSrv(b);
    assert.ok(await until(() => !!P.c.state.tkElig), 'ظهرت نافذةُ الأهلية');
    const V = P.c._tkEligVals();
    assert.equal(V.tkEligForceOn, false, 'لا «إسنادٌ رغم ذلك»'); assert.ok(/حسابَ مستخدمٍ نشطاً/.test(V.tkEligSub) && V.tkEligSub.indexOf('بلا حساب') !== -1, 'السببُ والاسم: ' + V.tkEligSub);
    assert.ok(V.tkEligItems.some((q) => /لا يملك حسابَ مستخدم/.test(q.why)), 'سببُ البند: ' + JSON.stringify(V.tkEligItems));
    const nCalls = P.calls.length; V.tkEligForce(); await sleep(150);
    assert.equal(P.calls.length, nCalls, 'التأكيدُ لا يرسل شيئاً'); assert.equal(Object.values(stored(W.env, KT)).flat().length, n0, 'ولا صفّ');
    P.c.setState({ tkElig: null, tkBusy: false });
    P.c._tkCreateSrv(Object.assign({}, b, { asg: [ME.eid] }));
    assert.ok(await until(() => Object.values(stored(W.env, KT)).flat().length > n0), 'صاحبُ الحساب النشط يُنشأ له');
  });

  test(M + '(ج) إعادةُ الإسناد: القاطعُ بالسبب ولا إرسال — والقائمةُ تذكر «بلا حسابِ مستخدم» بجانب الاسم', async () => {
    const W = await world({ worker: WU.file, mode }); seed(W); const dm = await W.login(...DM);
    const s = Date.now() + 2 * HR, c = await W.C.api('/api/tasks/create', { method: 'POST', cookie: dm.ck, body: { k: hij(s), t: TAG + ' للإعادة', s, e: s + HR, asg: [ME.eid], rv: 'none' } });
    assert.equal(c.status, 200, JSON.stringify(c.j).slice(0, 200)); const k = c.j.rows[0].k, id = c.j.rows[0].id;
    const P = await pageFor(W, dm.ck, usersOf(W)), r = stored(W.env, KT)[k].find((q) => q[13] === id);
    P.c._tkActOpen('reassign', r, k);
    const L = P.c._tkActVals().tkActEmps;
    assert.ok(L.some((o) => o.v === NOACCT && /بلا حسابِ مستخدم/.test(o.name)) && L.some((o) => o.v === MATE.eid && /حسابُه معطَّل/.test(o.name)), 'القائمة: ' + JSON.stringify(L.filter((o) => o.v === NOACCT || o.v === MATE.eid)));
    P.c.setState({ tkActTo: NOACCT }); P.c._tkEligOne(NOACCT);
    assert.ok(await until(() => !!P.c.state.tkActElig), 'الأهليةُ من الخادم');
    assert.equal(P.c.state.tkActElig.hard, 1);
    const nCalls = P.calls.length; P.c._tkActRun(); await sleep(150);
    assert.ok(/لا يملك حسابَ مستخدم/.test(P.c.state.tkActErr) && /لا تُسند إليه مهمةٌ إلكترونية/.test(P.c.state.tkActErr), 'الرسالة: ' + P.c.state.tkActErr);
    assert.equal(P.calls.filter((u) => /reassign/.test(u)).length, 0, 'لا إرسال'); assert.equal(P.calls.length, nCalls);
  });
}
