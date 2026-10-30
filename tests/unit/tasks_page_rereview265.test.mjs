/* KIVO_265 — إعادةُ المراجعة المستقلة (reports/k265/reviews/rereview_265_unified.md) في الواجهة: صفحةُ «المهام» الحقيقية (src/modules/tasks/logic.js
   في vm + KIVO.BassamPageKit الحقيقي + 490 · 546 الحقيقيان) — بياناتٌ اصطناعية وحدها (TEST_ONLY):
     (N-2 متوسط) تعليمُ الحسابات (منتقي الإسناد · قائمةُ «قبول نيابةً» · إعادةُ الإسناد) بفهرسٍ واحد — كان تكعيبياً: إدارةٌ من 300 موظفٍ ≈ 8.5 ث لكل رسم
     (N-8 أ) القائمةُ تُعلَّم بالرمز الذي يُسند به (BassamEmp.key) — موظفٌ بلا معرّفٍ ثابت ولا حساب يُعلَّم بسببه (كان بلا تعليم)
     (N-8 ب) RC-13 في الواجهة كالخادم: مهمةٌ أغلقها الخادم (أُلغيت · أُعيد إسنادُها) لا يُغيَّر مكلَّفُها بالتعديل */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { ROOT, moduleLogic } from './harness.mjs';

const LOGIC = moduleLogic('tasks');
const D = 'tst_d1', TAG = 'TEST_ONLY';
const offline = { C: { req: async () => { throw new Error('offline'); } } };
function page(storeJson, emps, users) {
  const store = new Map([['bassam_tasks_v1', storeJson], ['bassam_employees_v1', JSON.stringify(emps)]]);
  const KIVO = {}, toasts = [];
  const ctx = { KIVO, console, Intl, Date, Math, JSON, Promise, Object, Array, String, Number, RegExp, Set, Map, Error, isNaN, parseInt, setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => 0,
    localStorage: { getItem: (k) => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    document: { hidden: false, querySelector: () => null, addEventListener: () => {}, removeEventListener: () => {} }, navigator: { userAgent: 'node' }, addEventListener: () => {}, removeEventListener: () => {},
    __BS_BOOT: { srv: 1 }, fetch: (u, o) => offline.C.req(u, o) };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  /* اليوم التشغيلي من خدمة الغلاف الحقيقية؛ hToday وحده يتقدم يومًا بين 00:00 و03:00 الرياض. */
  for (const f of ['src/services/490-emp-key.js', 'src/services/440-count.js', 'src/services/535-profile-facts.js', 'src/services/546-task-model.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
  KIVO.BassamPerm = { can: () => true, on: () => true }; KIVO.bsPct = (a, b) => (b ? Math.round(100 * a / b) : 0) + '٪';
  KIVO.BassamAuth = { user: () => ({ id: 'tst_dm1', role: 'staff', mgr: true, ekey: 'mgr:tst_d1', deptId: D, name: 'TEST_ONLY مدير' }), display: () => ({ name: 'TEST_ONLY مدير' }), users: () => users };
  KIVO.BassamDepts = { active: () => D };
  KIVO.BassamSup = { isSup: () => false };
  KIVO.__BS_SRV = { flushAsync: async () => true };
  class DCLogic { constructor() { this.state = {}; } setState(p, cb) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); cb && cb(); } }
  ctx.DCLogic = DCLogic;
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/components/565-page-kit.js'), 'utf8'), ctx);
  const B0 = KIVO.BassamPageKit.base; KIVO.BassamPageKit.base = (B, a) => class extends B0(B, a) { bsOn(k) { return k !== 'staff'; } bsToast(m, k) { toasts.push([m, k]); } bsAck(m, k) { toasts.push([m, k || 'ok']); return Promise.resolve(true); } };
  vm.runInContext(LOGIC + '\n;globalThis.__C = Component;', ctx, { filename: 'tasks/logic.js' });
  const c = new ctx.__C(); c._tkDayDef = () => 0;   /* اختباراتُ الشهر كاملاً (KIVO_265 · كروتُ الأيام: الافتراضي يومُ اليوم) */ c.state = Object.assign({}, c.state || {}, { locked: {} });
  c.bsToast = (m, k) => toasts.push([m, k || 'err']);
  return { c, store, toasts };
}
const HIJ = (() => { const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {}; f.formatToParts(new Date(Date.now() - 3 * 3600e3)).forEach((p) => { o[p.type] = +p.value; }); return o; })();
const DAY = HIJ.year + '-' + HIJ.month + '-' + HIJ.day;
const emp = (i, o) => Object.assign({ eid: 'tst_e_big_' + i, nid: String(1990000000 + i), name: TAG + ' · موظف ' + i, empno: String(70000 + i), work: TAG + ' مراقب' }, o || {});
const acc = (i, o) => Object.assign({ id: 'tst_big_' + i, role: 'staff', deptId: D, ekey: 'tst_e_big_' + i, dis: 0 }, o || {});
const tRow = (o) => { const r = new Array(24).fill(null); Object.assign(r, { 0: TAG + ' ' + (o.t || 'مهمة'), 1: '', 2: 'normal', 3: o.st || 'pending', 4: 'normal', 5: 'مضافة', 7: o.eid ? ['م'] : [], 8: o.name || '', 9: TAG, 10: 60, 13: o.id, 14: o.eid || null, 15: o.s, 16: o.e, 23: o.x || null }); return r; };

test('(N-2) تعليمُ الحسابات لإدارةٍ من 300 موظفٍ وحساب: الخريطةُ والمنتقي في زمنٍ يسير (فهرسٌ واحد)', () => {
  const N = 300, emps = Array.from({ length: N }, (_, i) => emp(i)), users = Array.from({ length: N }, (_, i) => acc(i, { dis: i % 7 === 0 ? 1 : 0 }));
  users.push(acc(N, { id: 'tst_big_nid', ekey: String(1990000000 + 5) }));          /* حسابٌ ثانٍ لسجلّ 5 برقم هويته (لا يغيّر حكمَه النشط) */
  const P = page('{}', emps, users);
  let t0 = Date.now(); const AC = P.c._tkAcctMap(emps); const msMap = Date.now() - t0;
  assert.ok(msMap < 400, '_tkAcctMap ' + msMap + ' ms (كان ≈ 8.5 ث لـ300 على c2df109)');
  assert.equal(Object.keys(AC).length, Math.ceil(N / 7), 'المعطَّلون وحدهم معلَّمون: ' + Object.keys(AC).length);
  assert.ok(Object.values(AC).every((s) => s === 'disabled'));
  P.c.setState({ year: HIJ.year, month: HIJ.month });
  t0 = Date.now(); P.c.tkPickModel(HIJ.day); const msPick = Date.now() - t0;
  assert.ok(msPick < 600, 'tkPickModel ' + msPick + ' ms');
  /* مرآةُ 546 بفهرسٍ = الحكمُ الفرديّ لكل موظف */
  const M = P.c._tkM();
  for (const e of emps.slice(0, 40)) assert.equal(AC[e.eid] || 'active', M.acct(users, emps, D, e), e.eid);
});

test('(N-8 أ) قائمةُ «قبول نيابةً» تُعلَّم بالرمز الذي يُسند به: بلا معرّفٍ ثابت ولا حساب ⇒ «بلا حسابِ مستخدم» · وحسابُه برقم هويته ⇒ يُختار', () => {
  const emps = [emp(1), { nid: '1999000901', name: TAG + ' · بلا معرّفٍ ولا حساب', empno: '1', work: TAG + ' مراقب' }, { nid: '1999000902', name: TAG + ' · بلا معرّفٍ بحسابٍ برقمه', empno: '2', work: TAG + ' مراقب' }];
  const users = [acc(1), { id: 'tst_nidonly', role: 'staff', deptId: D, ekey: '1999000902', dis: 0 }];
  const s = Date.now() + 3600e3, S = { [DAY]: [tRow({ id: 1760000900001, t: 'عامة', s, e: s + 3600e3 })] };
  const P = page(JSON.stringify(S), emps, users);
  P.c.setState({ year: HIJ.year, month: HIJ.month, acceptRef: { d: HIJ.day, i: 0, title: 'عامة', wt: '' } });
  const by = Object.fromEntries(P.c._tkDutyVals().dutyList.map((x) => [x.name, x]));
  assert.equal(by[TAG + ' · بلا معرّفٍ ولا حساب'].acct, 'none', JSON.stringify(by[TAG + ' · بلا معرّفٍ ولا حساب']));
  assert.ok(!by[TAG + ' · بلا معرّفٍ بحسابٍ برقمه'].acct, 'حسابُه بالرمز الذي يُسند به ⇒ نشط');
  assert.ok(!by[emp(1).name].acct);
  P.toasts.length = 0; by[TAG + ' · بلا معرّفٍ ولا حساب'].click();
  assert.ok(P.toasts.some((t) => /بلا حسابِ مستخدم/.test(t[0])), JSON.stringify(P.toasts));
  assert.equal(JSON.parse(P.store.get('bassam_tasks_v1'))[DAY][0][14], null, 'لا إسناد');
});

test('(N-8 ب) مهمةٌ أغلقها الخادم (أُلغيت · أُعيد إسنادُها) لا يُغيَّر مكلَّفُها بالتعديل في الواجهة — كالخادم (task-asg)', () => {
  const emps = [emp(1), emp(2)], users = [acc(1), acc(2)];
  const s = Date.now() + 3600e3;
  for (const asg of ['cancelled', 'reassigned']) {
    const r0 = tRow({ id: 1760000900002, t: 'أُغلقت', eid: 'tst_e_big_1', name: emp(1).name, s, e: s + 3600e3, x: { v: 2, asg, can: { at: 1 }, re: { at: 1 } } });
    const P = page(JSON.stringify({ [DAY]: [r0] }), emps, users);
    assert.equal(P.c._tkHasActivity(r0), true, asg + ': نشاطٌ/إغلاقٌ في الصفّ');
    P.c.setState(Object.assign({ year: HIJ.year, month: HIJ.month, newTaskOpen: true, editRef: { d: HIJ.day, i: 0, grp: null, grpLabel: '' }, newTitle: r0[0], newDesc: '', newPrio: 'normal',
      newAsg: 'direct', newPick: { tst_e_big_2: emp(2).name }, pickQ: '', pickOpen: {}, pickWt: '', newDur: '60', newDay: HIJ.day, newCreatedAt: r0[13] }, P.c._tkPickers(r0[15], r0[16], HIJ.day), P.c._tkAdvFrom(r0)));
    const before = P.store.get('bassam_tasks_v1');
    P.c.renderVals().submitTask();
    assert.equal(P.store.get('bassam_tasks_v1'), before, asg + ': لا تغيير');
    assert.ok(P.toasts.some((t) => /لا يُغيَّر المكلَّفُ هنا/.test(t[0])), asg + ': ' + JSON.stringify(P.toasts));
  }
});
