import { attachTaskOperations } from './tasks_vm_operations_fx.mjs';
/* KIVO_265 · البند 13 — أداءُ منتقي الإسناد مع 1000+ موظف (src/modules/tasks/logic.js في vm + KIVO.BassamPageKit الحقيقي · بلا خادم: المنتقي محلّي):
   إدارةٌ اصطناعية فيها 1200 موظف بجدولٍ شهري وتقرير يوم — القياسُ قبل/بعد (Date.now داخل الاختبار: الرسمُ الأول البارد · المتوسطُ الدافئ · أثناءُ الكتابة في البحث)
   · النموذجُ مخزَّنٌ لليوم ويُبطَل بتغيّر المخزن · عرضٌ نافذي (أوّل 60 ثم «عرض المزيد») · البحثُ يرشّح النموذجَ المخزَّن.
   لقياس «قبل»: KIVO_TASKS_LOGIC=<نسخةٌ قديمة من logic.js> KIVO_PERF_ONLY=1 (تُعطَّل تأكيداتُ النافذة لأن القديم يرسم الكلّ). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { ROOT, moduleLogic } from './harness.mjs';

const LOGIC = process.env.KIVO_TASKS_LOGIC ? fs.readFileSync(path.resolve(process.env.KIVO_TASKS_LOGIC), 'utf8') : moduleLogic('tasks');   /* KIVO_265 · البند 19: logic.js + أجزاؤه */
const PERF_ONLY = !!process.env.KIVO_PERF_ONLY;
const N = 1200, D = 'tst_d1', TAG = 'TEST_ONLY';
const SHIFTS = ['الوردية الأولى', 'الوردية الثانية', 'الوردية الثالثة', 'الوردية الرابعة'];
const FAM = ['العتيبي', 'الحربي', 'القحطاني', 'الشمري', 'الزهراني', 'الغامدي', 'المطيري'];
const hij = (ms) => { const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' }); const o = {}; f.formatToParts(new Date(ms)).forEach(p => { o[p.type] = +p.value; }); return o; };
const T = hij(Date.now()), YM = T.year + '-' + T.month, DAYK = YM + '-' + T.day;

function dept() {
  const emps = [], st = {}, roster = { shifts: {} }, users = [];
  for (let i = 0; i < N; i++) {
    const eid = 'tst_pf_' + i, name = TAG + ' موظف ' + i + ' ' + FAM[i % FAM.length];
    emps.push({ eid, name, nid: String(1100000000 + i), empno: String(5000 + i), type: TAG + ' رسمي', work: i % 2 ? 'ميداني' : 'إداري' });
    st[eid] = { shift: SHIFTS[i % 4], rest: i % 9 === 0 ? ['الجمعة'] : [], leaves: {}, perm: {}, cs: '', muk: false };
    const sh = SHIFTS[i % 4]; (roster.shifts[sh] = roster.shifts[sh] || { roster: [] }).roster.push({ ekey: eid, st: i % 25 === 0 ? 'ab' : i % 40 === 0 ? 'lv' : 'pr', shift: sh });
    users.push({ id: 'tst_pfu_' + i, role: 'staff', deptId: D, ekey: eid, name, dis: 0 });
  }
  return { emps, staffing: { [YM]: st }, dreport: { [DAYK]: roster }, users };
}
/* الصفحةُ لمدير الإدارة بلا خادم (fetch يعيد 0) — المنتقي كلُّه محلّي */
async function page(DP) {
  const store = new Map([['bassam_tasks_v1', '{}'], ['bassam_employees_v1', JSON.stringify(DP.emps)], ['bassam_staffing_v3', JSON.stringify(DP.staffing)], ['bassam_dreport_v1', JSON.stringify(DP.dreport)],
    ['bassam_options_v1', JSON.stringify({ work: ['ميداني', 'إداري'] })]]);
  const KIVO = {}, toasts = [];
  const ctx = { KIVO, console, Intl, Date, Math, JSON, Promise, Object, Array, String, Number, RegExp, Set, Map, Error, isNaN, parseInt, setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => 0,
    localStorage: { getItem: (k) => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    document: { hidden: false, querySelector: () => null, addEventListener: () => {}, removeEventListener: () => {} }, navigator: { userAgent: 'node' }, addEventListener: () => {}, removeEventListener: () => {},
    __BS_BOOT: { srv: 1 }, fetch: async () => ({ status: 0, text: async () => '' }) };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ['src/services/490-emp-key.js', 'src/services/440-count.js', 'src/services/510-emp-monthly-source.js', 'src/services/546-task-model.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
  KIVO.BassamPerm = { can: () => true, on: () => true, tplOfEmp: () => '' }; KIVO.bsPct = (a, b) => (b ? Math.round(100 * a / b) : 0) + '٪';
  KIVO.BassamFind = { dig: (v) => String(v == null ? '' : v), filter: (q, list) => list.slice() };
  const me = { id: 'tst_dm1', role: 'staff', mgr: true, ekey: 'mgr:tst_d1', deptId: D, name: TAG + ' مدير' };
  let ver = 1; const U = [me].concat(DP.users);
  KIVO.BassamAuth = { user: () => me, display: () => ({ name: me.name }), users: () => U, usersVer: () => ver, bump: () => { ver++; } };
  KIVO.BassamDepts = { active: () => D }; KIVO.BassamSup = { isSup: () => false };
  class DCLogic { constructor() { this.state = {}; } setState(p, cb) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); cb && cb(); } }
  ctx.DCLogic = DCLogic;
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/components/565-page-kit.js'), 'utf8'), ctx);
  const B0 = KIVO.BassamPageKit.base; KIVO.BassamPageKit.base = (B, a) => class extends B0(B, a) { bsOn() { return true; } bsToast(m, k) { toasts.push([m, k]); } bsAck(m, k) { toasts.push([m, k || 'ok']); return Promise.resolve(true); } };
  vm.runInContext(LOGIC + '\n;globalThis.__C = Component;', ctx, { filename: 'tasks/logic.js' });
  const opsFixture = await attachTaskOperations(ctx, { store });
  const c = new ctx.__C(); c._tkDayDef = () => 0;   /* اختباراتُ الشهر كاملاً (KIVO_265 · كروتُ الأيام: الافتراضي يومُ اليوم) */ c.state = Object.assign({}, c.state || {}, { locked: {} });
  c.bsToast = (m, k) => toasts.push([m, k || 'err']);
  return { c, opsFixture, store, toasts, KIVO };
}
const shownEmps = (V) => V.pickGroups.reduce((a, g) => a + (g.emps || []).length, 0);
const ms = (fn, n = 1) => { const t0 = Date.now(); for (let i = 0; i < n; i++) fn(); return (Date.now() - t0) / n; };

test('البند 13 · منتقي الإسناد مع 1200 موظف: قياسُ الرسم البارد/الدافئ/أثناء الكتابة · النافذةُ 60 ثم «عرض المزيد» · البحثُ على النموذج المخزَّن · الإبطالُ بتغيّر المخزن', async (t) => {
  const DP = dept(), P = await page(DP);
  const open = {}; SHIFTS.forEach((s) => { open[s] = true; });
  P.c.setState({ year: T.year, month: T.month, newTaskOpen: true, editRef: null, newAsg: 'direct', newPick: {}, pickQ: '', pickOpen: open, pickWt: '', newDay: T.day, newEDay: T.day });
  const cold = ms(() => P.c.renderVals());
  const warm = ms(() => P.c.renderVals(), 10);
  const asg = ms(() => P.c.tkAsgVals(T.day), 10), model = ms(() => P.c.tkPickModel(T.day), 10);
  const typing = ms(() => { P.c.setState({ pickQ: 'موظف 1', pickLim: 60 }); P.c.renderVals(); P.c.setState({ pickQ: 'موظف 11', pickLim: 60 }); P.c.renderVals(); }, 5) / 2;
  P.c.setState({ pickQ: '', pickLim: 60 });
  let V = P.c.renderVals();
  const total = V.pickGroups.reduce((a, g) => a + g.emps.length + (g.moreN || 0), 0);
  t.diagnostic('PERF ' + (process.env.KIVO_TASKS_LOGIC ? 'قبل' : 'بعد') + ' · 1200 موظف: الرسمُ الأول ' + cold.toFixed(1) + ' ms · المتوسطُ الدافئ (10) ' + warm.toFixed(1) + ' ms · أثناء الكتابة ' + typing.toFixed(1) + ' ms/رسمة · (منها: نموذجُ المنتقي ' + model.toFixed(2) + ' ms · قيمُ المنتقي ' + asg.toFixed(1) + ' ms) · صفوفٌ مرسومة ' + shownEmps(V) + (PERF_ONLY ? '' : ' من ' + total));
  assert.equal(V.pickGroups.length, 4, 'أربعُ ورديات'); assert.ok(V.pickGroups.every((g) => /من 300|300/.test(g.cnt) || g.cnt.indexOf('300') >= 0), 'كلُّ وردية 300 موظف: ' + V.pickGroups.map((g) => g.cnt).join(' | '));
  assert.ok(warm <= cold + 1, 'الرسمُ الدافئ لا يزيد عن البارد');
  if (PERF_ONLY) return;
  /* النافذة: 60 أولاً ثم +60 — والعدّادُ «يُعرض 60 من 1200» */
  assert.equal(shownEmps(V), 60, 'أوّلُ 60 موظفاً'); assert.equal(V.pickMoreOn, true); assert.match(V.pickShownTxt, /يُعرض 60 من 1200/); assert.match(V.pickMoreLbl, /عرض المزيد/);
  assert.equal(V.pickGroups[0].emps.length, 60); assert.equal(V.pickGroups[0].moreN, 240); assert.equal(V.pickGroups[1].emps.length, 0); assert.equal(V.pickGroups[1].moreN, 300);
  V.pickMore(); V = P.c.renderVals(); assert.equal(shownEmps(V), 120); assert.equal(V.pickGroups[0].emps.length, 120);
  for (let i = 0; i < 25; i++) P.c.renderVals().pickMore();
  V = P.c.renderVals(); assert.equal(shownEmps(V), 1200, 'بعد كفاية الدفعات: الكلّ'); assert.equal(V.pickMoreOn, false);
  /* الورديةُ المطويّة لا تُرسم أفرادُها (ولا تُحسب في النافذة) */
  P.c.setState({ pickOpen: { [SHIFTS[1]]: true }, pickLim: 60 }); V = P.c.renderVals();
  assert.equal(V.pickGroups[0].emps.length, 0); assert.equal(V.pickGroups[0].moreN, 0); assert.equal(V.pickGroups[1].emps.length, 60);
  /* البحثُ يرشّح النموذجَ المخزَّن (النموذجُ نفسُه بالهوية) ويعيد النافذة إلى أولها */
  const M0 = P.c.tkPickModel(T.day); assert.equal(P.c.tkPickModel(T.day), M0, 'النموذجُ مخزَّنٌ لليوم');
  P.c.renderVals().onPickQ({ target: { value: 'موظف 1199' } }); V = P.c.renderVals();
  assert.equal(shownEmps(V), 1, 'نتيجةٌ واحدة'); assert.equal(V.pickGroups.find((g) => g.emps.length).emps[0].name, TAG + ' موظف 1199 ' + FAM[1199 % FAM.length]); assert.equal(P.c.state.pickLim, 60);
  assert.equal(P.c.tkPickModel(T.day), M0, 'البحثُ لم يُعد بناءَ النموذج');
  P.c.renderVals().onPickQ({ target: { value: 'موظف 1' } }); V = P.c.renderVals(); assert.equal(shownEmps(V), 60); assert.equal(V.pickMoreOn, true);
  /* الحالاتُ من التقرير والجدول كما كانت: غائب · إجازة · راحة (الجمعة إن كان يومُ المهمة جمعة) */
  P.c.setState({ pickQ: 'موظف 25 ', pickLim: 60 }); V = P.c.renderVals();
  const e25 = V.pickGroups.map((g) => g.emps.find((e) => e.name.indexOf(' 25 ') >= 0)).find(Boolean); assert.ok(e25 && e25.isOff && e25.offLbl === 'غائب', 'مؤشَّرٌ غائباً من تقرير اليوم: ' + JSON.stringify(e25 && [e25.name, e25.offLbl]));
  /* الإبطال: يومٌ آخر ⇒ نموذجٌ جديد · تغيّرُ قائمة الموظفين ⇒ نموذجٌ جديد يحمل الزيادة · حدثُ المخزن (_tkLSBust) ⇒ إعادةُ القراءة */
  assert.notEqual(P.c.tkPickModel(T.day === 1 ? 2 : T.day - 1), M0, 'يومٌ آخر ⇒ نموذجٌ آخر'); const M1 = P.c.tkPickModel(T.day); assert.notEqual(M1, M0, 'العودةُ لليوم بعد يومٍ آخر: يُبنى من جديد (ذاكرةٌ ليومٍ واحد)');
  const E2 = DP.emps.concat([{ eid: 'tst_pf_new', name: TAG + ' موظف جديد', work: 'ميداني' }]);
  await P.opsFixture.replace('bassam_employees_v1', E2);
  const M2 = P.c.tkPickModel(T.day); assert.notEqual(M2, M1); assert.equal(M2.groups.reduce((a, g) => a + g.emps.length, 0), 1201, 'الزيادةُ ظاهرة');
  assert.equal(P.c.tkPickModel(T.day), M2); P.c._tkLSBust(); const M3 = P.c.tkPickModel(T.day); assert.notEqual(M3, M2, 'حدثُ المخزن يُبطل'); assert.equal(M3.groups.reduce((a, g) => a + g.emps.length, 0), 1201);
  /* تغيّرُ نسخة الحسابات ⇒ إعادةُ حكم «لا حساب نشطاً» */
  P.KIVO.BassamAuth.bump(); assert.notEqual(P.c.tkPickModel(T.day), M3, 'نسخةُ الحسابات تُبطل');
  const warm2 = ms(() => P.c.renderVals(), 10);
  t.diagnostic('PERF بعد · البحثُ النشط («موظف 25 ») المتوسطُ الدافئ (10) ' + warm2.toFixed(1) + ' ms');
});
