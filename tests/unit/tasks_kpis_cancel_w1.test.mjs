/* الموجة 1 · DG-01 — مؤشراتُ صفحة المهام والإنتاجية ولوحةُ «مؤشرات المهام» كانت تعدّ الملغاةَ عملاً متبقياً:
     شهرٌ فيه منجزتان و12 ملغاة («أُنهي التكرار») كان يُظهر «نسبة الإنجاز 14٪ · أقل من النصف — كثّف المتابعة · متبقية 12» والحيُّ منجزٌ كله،
     وأجزاءُ «توزيع حالات المهام» الستة لا تجتمع إلى الإجمالي، والإنتاجيةُ «المسندة 14 · المنجزة 2 · 14٪».
   القاعدة: الملغاةُ ونسخةُ «أُعيد إسنادها» خارج المقام (الإجمالي · المنجزة/المتبقية · الأوسمة · الإنتاجية) وتُذكر الملغاةُ عدداً «خارج الحساب» ·
   والمراجعةُ/الإعادةُ/التعثّرُ في «جارية» كأعمدة اللوحة فتجتمع الأجزاءُ إلى الإجمالي · وشهرٌ بلا ملغاة أرقامُه كما كانت.
   منطقُ الصفحة الحقيقي في vm بساعةٍ ثابتة (w1_pages.mjs: الثلاثاء 9 جمادى الأولى 1448 هـ) — بياناتٌ اصطناعية (TEST_ONLY). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { page, NOW } from './w1_pages.mjs';
import { row, ME, MATE } from './tasks_fx.mjs';

const H = 36e5, Y = 1448, M = 5, K = (d, m = M) => Y + '-' + m + '-' + d;
const EMPS = [{ eid: ME.eid, name: ME.name, work: 'TEST_ONLY مراقب' }, { eid: MATE.eid, name: MATE.name, work: 'TEST_ONLY مراقب' }];
const withX = (r, x) => { r[22] = null; r[23] = x; return r; };
const CAN = { v: 1, asg: 'cancelled', can: { why: 'TEST_ONLY أُنهي التكرار' } };
const REA = { v: 1, asg: 'reassigned', re: { to: { e: ME.eid, n: ME.name } } };
const RV = { v: 1, rv: { u: 'tst_dm1', e: 'mgr:tst_d1', n: 'TEST_ONLY مدير' } };
let SEQ = 0;
const id = () => NOW - 40 * 24 * H + (++SEQ) * 6e4;
const done = (eid, d, perf) => row({ id: id(), title: 'منجزة ' + d, eid, st: 'done', perf: perf || ['on_time', 'في الوقت'], acc: NOW - (60 - d) * H, fin: NOW - (59 - d) * H, dur: 60, s: NOW - (60 - d) * H, e: NOW - (58 - d) * H });
const cancelled = (eid, d) => withX(row({ id: id(), title: 'ملغاة ' + d, eid, s: NOW - (50 - d) * H, e: NOW - (49 - d) * H }), CAN);
/* سيناريو التدقيق: جمادى الأولى 1448 — منجزتان (يوم 3) و12 ملغاة موزّعة على الأيام 3–8 (اثنتان كلَّ يوم) */
function auditMonth() {
  const S = {};
  S[K(3)] = [done(ME.eid, 3), done(MATE.eid, 3, ['early', 'مبكر بـ 10 د'])];
  for (let d = 3; d <= 8; d++) (S[K(d)] = S[K(d)] || []).push(cancelled(ME.eid, d), cancelled(ME.eid, d));
  return S;
}
function tasksPage(S, can) {
  const P = page('tasks', { store: { bassam_tasks_v1: S, bassam_employees_v1: EMPS }, can });
  P.c.setState({ perPage: 0, tkDaySel: { k: Y + '-' + M, d: 0 } });   /* الشهر كاملاً */
  return P;
}
const sum = (L) => L.reduce((a, x) => a + (+x.count || +x.n || 0), 0);

test('DG-01 · حلقاتُ الشهر: منجزتان و12 ملغاة ⇒ الإجمالي 2 · منجزة 2 (100٪) · متبقية 0 · «أداء ممتاز» لا «كثّف المتابعة» · والملغاةُ تُذكر خارج الحساب', () => {
  const V = tasksPage(auditMonth()).V();
  assert.equal(V.totalCount, '14', 'الجدولُ ما زال يعرض الصفوفَ الأربعة عشر كلَّها');
  assert.equal(V.tiTotal, '2', 'الإجمالي من القائمة وحدها');
  assert.equal(V.tiDone, '2'); assert.equal(V.tiRemain, '0', 'لا «متبقية 12»');
  assert.equal(V.tiDonePct, '100'); assert.equal(V.tiK2Pill, '100٪');
  assert.equal(V.tiDoneMsg, 'أداء ممتاز — الشهر شبه مكتمل ✓'); assert.equal(V.tiK2Sub, 'أداء ممتاز — الشهر شبه مكتمل ✓');
  assert.doesNotMatch(V.tiK2Sub + V.tiDoneMsg, /كثّف المتابعة/);
  const R2 = V.tiK2Rows.map((r) => [r.label, r.n, r.pct]);
  assert.deepEqual(JSON.parse(JSON.stringify(R2)), [['منجزة', '2', V.tiK2Rows[0].pct], ['متبقية', '0', V.tiK2Rows[1].pct]]);
  /* الأجزاءُ الستة تجتمع إلى الإجمالي */
  assert.equal(sum(V.tiLegend), 2, 'مجموعُ «توزيع حالات المهام» = الإجمالي');
  assert.equal(sum(V.tiK1Rows), 2);
  assert.equal(V.tiLegend.find((x) => x.name === 'منجزة').pct, 100);
  assert.match(V.tiK1Sub, /^الحالة الأعلى: «منجزة» — 2 من مهمتين · 12 ملغاة خارج الحساب$/);
  assert.match(V.tiStateMsg, / · 12 ملغاة خارج الحساب$/);
});

test('DG-01 · أوسمةُ الشهر واليوم من المهام القائمة: الإجمالي 2 · مكتملة في الوقت 2 (100٪) — والملغاةُ في السطر خارج الحساب', () => {
  const P = tasksPage(auditMonth());
  let V = P.V();
  assert.equal(V.tkK1N, '2'); assert.equal(V.tkK2N, '2'); assert.equal(V.tkK2Chip, '100٪'); assert.equal(V.tkK2Bar, 'width:100%');
  assert.equal(V.tkK1Cx, '12'); assert.match(V.tkK1Sub, /· 12 ملغاة خارج الحساب$/); assert.match(V.tkK1Aria, /و12 ملغاة خارج الحساب/);
  /* يومُ 3: منجزتان وملغاتان ⇒ أخضر (أُنجز القائمُ كله) — والتلميحُ صادقٌ في العدد: «منجزتان · ملغاتان» لا «أُنجزت كلها» (تحقّقُ الموجة 1) */
  const d3 = V.tkDays[2];
  assert.match(d3.tip, /4 مهام · 2 منجزة · 2 ملغاة أو أُعيد إسنادها/); assert.doesNotMatch(d3.tip, /أُنجزت كلها/); assert.match(d3.style, /background:var\(--bg-x047857\)/);
  /* يومُ 5: ملغاتان فقط ⇒ لا «أُنجزت كلها» */
  assert.doesNotMatch(V.tkDays[4].tip, /أُنجزت كلها/);
  d3.click(); V = P.V();
  assert.equal(V.tkK1N, '2', 'أوسمةُ اليوم 3: مهمتان قائمتان'); assert.equal(V.tkK2Chip, '100٪'); assert.equal(V.tkK1Cx, '2');
});

test('DG-01 · الإنتاجية: الملغاةُ ليست مسندة — المسندة 2 · المنجزة 2 · 100٪ (كانت 14 · 2 · 14٪) وتُذكر في السطر خارج الحساب', () => {
  const P = tasksPage(auditMonth());
  P.V().subProd();
  const V = P.V();
  assert.equal(V.showProd, true);
  const me = V.prodEmpRows.find((q) => q.name === ME.name), mate = V.prodEmpRows.find((q) => q.name === MATE.name);
  assert.equal(me.asg, 1); assert.equal(me.done, 1); assert.equal(me.donePct, '100٪'); assert.equal(me.can, 12, 'الملغاةُ تُعدّ في can وحدها');
  assert.equal(mate.asg, 1); assert.equal(mate.donePct, '100٪');
  assert.equal(V.prodTot.asg, 2); assert.equal(V.prodTot.done, 2); assert.equal(V.prodTot.donePct, '100٪');
  assert.match(V.prodSub, / · 12 ملغاة \(خارج الحساب\)/);
  const X = V.prodAoa(); assert.ok(X.some((r) => r[0] === 'الإجمالي' && r[2] === 2 && r[3] === 2 && r[4] === '100٪'), 'التصديرُ بالأرقام نفسِها');
});

test('DG-01 · موظفٌ كلُّ مهامه ملغاة لا صفَّ له في الإنتاجية · وكلُّ الشهر ملغى ⇒ «لا مهام قائمة» لا «كثّف المتابعة»', () => {
  const S = { [K(4)]: [cancelled(ME.eid, 4), cancelled(MATE.eid, 4)] };
  const P = tasksPage(S);
  let V = P.V();
  assert.equal(V.tiTotal, '0'); assert.equal(V.tiRemain, '0');
  assert.equal(V.tiDoneMsg, 'لا مهام قائمة — 2 ملغاة'); assert.equal(V.tiK2Sub, 'لا مهام قائمة — 2 ملغاة');
  assert.equal(V.tkK1N, '0'); assert.equal(V.tkK1Chip, 'لا مهام');
  V.subProd(); V = P.V();
  assert.equal(V.prodEmpRows.length, 0, 'لا «المسندة 0»'); assert.equal(V.prodEmpty, true);
});

test('DG-01 · نسخةُ «أُعيد إسنادها» خارج المقام · والمراجعةُ في «جارية» فتجتمع الأجزاء · وشهرٌ بلا ملغاة أرقامُه كما كانت', () => {
  const S = { [K(6)]: [
    done(ME.eid, 6),
    row({ id: id(), title: 'جارية', eid: ME.eid, st: 'in_progress', acc: NOW - 2 * H, dur: 600, s: NOW - 3 * H, e: NOW + 20 * H }),
    withX(row({ id: id(), title: 'بانتظار الاعتماد', eid: MATE.eid, st: 'in_progress', acc: NOW - 4 * H, dur: 600, s: NOW - 4 * H, e: NOW + 6 * H, r21: { imgs: [], note: 'TEST_ONLY تم', sub: NOW - H, at: NOW - H } }), RV),
    row({ id: id(), title: 'معتذر عنها', eid: MATE.eid, st: 'declined', s: NOW - 3 * H, e: NOW + 3 * H }),
    withX(row({ id: id(), title: 'نسخة أُعيد إسنادها', eid: MATE.eid, s: NOW + H, e: NOW + 3 * H }), REA),
  ] };
  const V = tasksPage(S).V();
  assert.equal(V.tiTotal, '4', 'خمسةُ صفوف منها نسخةٌ أُعيد إسنادها');
  assert.equal(sum(V.tiLegend), 4, 'المراجعةُ لم تعد تسقط من الأجزاء');
  assert.equal(V.tiLegend.find((x) => x.name === 'جارية').count, 2, 'الجارية + بانتظار الاعتماد');
  assert.equal(V.tiDone, '1'); assert.equal(V.tiRemain, '3'); assert.equal(V.tiDonePct, '25');
  assert.equal(V.tiK1Sub.indexOf('ملغاة'), -1, 'لا ملغاة ⇒ لا ذكرَ لها');
  /* بلا ملغاة ولا نسخ: الإجماليُّ عددُ الصفوف والنسبةُ كما كانت (منجزة ÷ الصفوف) */
  const V2 = tasksPage({ [K(6)]: S[K(6)].slice(0, 4) }).V();
  assert.equal(V2.tiTotal, '4'); assert.equal(V2.tiDone, '1'); assert.equal(V2.tiRemain, '3'); assert.equal(V2.tkK1N, '4');
});

test('DG-01 · لوحةُ «مؤشرات المهام» في مؤشرات الإدارة: الملغاةُ ليست «مفتوحة» — العدُّ من القائمة وتُذكر خارج الحساب', () => {
  const P = page('kpis', { store: {} });
  const S = auditMonth();
  S[K(9)] = [row({ id: id(), title: 'مفتوحة', eid: ME.eid, s: NOW, e: NOW + H }), withX(row({ id: id(), title: 'نسخة', eid: MATE.eid }), REA)];
  const k = P.c._tkKpi(S, Y, M);
  assert.equal(k.n, 3, 'منجزتان ومفتوحة — لا الملغاة ولا النسخة'); assert.equal(k.done, 2); assert.equal(k.open, 1); assert.equal(k.can, 12);
  assert.equal(k.onPct, 100);
  const e = {}; P.c.setState({ tkY: Y, tkM: M }); P.c._tkStore = () => S; P.c._tkKpiVals(e);
  assert.equal(e.tkKpiSub, '3 مهمة · 2 منجزة · 1 مفتوحة · 0 معتذَر عنها · 12 ملغاة (خارج الحساب)');
});
