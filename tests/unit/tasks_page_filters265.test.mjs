/* KIVO_265 · البند 14 — صفحةُ المهام (src/modules/tasks/logic.js في vm + KIVO.BassamPageKit الحقيقي) على العامل الحقيقي: الفلاتر الإضافية
   المكلَّف · الوردية (من الجدول الشهري كما يقرؤها المنتقي) · نوع العمل (العمود 19 أو نوعُ عمل المكلَّف) · المتكررة فقط · المراجِع · «بانتظاري أنا» · «بلا توثيق»
   — تتراكب مع البحث والحالة والأولوية، والمصدَّرُ = المرئي، والشريطُ مطويٌّ بعدّادٍ و«مسح»، والاختياراتُ تُحفظ للمسؤول (bassam_tasks_filters_v1:<uid>).
   بياناتٌ اصطناعية (tasks_fx). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { ROOT, moduleLogic } from './harness.mjs';
import { world, workerUnderTest, ME, MATE, KT, KE, D, DAY, stored, putKV, row } from './tasks_fx.mjs';

const WU = workerUnderTest();
const LOGIC = moduleLogic('tasks');
const KS = 'bsdept:' + D + ':bassam_staffing_v3';
/* الصفحةُ لمدير الإدارة (كما في tasks_page_review265) + مخازنُ الجدول الشهري والخيارات + التقاطُ التصدير */
function page(W, ck, storeJson, emps, extra) {
  const store = new Map([['bassam_tasks_v1', storeJson], ['bassam_employees_v1', JSON.stringify(emps)]].concat(Object.entries(extra || {})));
  const KIVO = {}, toasts = [], xlsx = [];
  const ctx = { KIVO, console, Intl, Date, Math, JSON, Promise, Object, Array, String, Number, RegExp, Set, Map, Error, isNaN, parseInt, setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => 0,
    localStorage: { getItem: (k) => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    document: { hidden: false, querySelector: () => null, addEventListener: () => {}, removeEventListener: () => {} }, navigator: { userAgent: 'node' }, addEventListener: () => {}, removeEventListener: () => {},
    __BS_BOOT: { srv: 1 },
    fetch: (u, o) => W.C.req(u, { method: (o && o.method) || 'GET', body: o && o.body, cookie: ck, headers: (o && o.headers) || {} }) };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ['src/services/490-emp-key.js', 'src/services/440-count.js', 'src/services/510-emp-monthly-source.js', 'src/services/546-task-model.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
  KIVO.BassamPerm = { can: () => true, on: () => true }; KIVO.bsPct = (a, b) => (b ? Math.round(100 * a / b) : 0) + '٪';
  KIVO.BassamXLSX = { download: (rows, name) => xlsx.push({ rows, name }) };
  /* محرّكُ البحث (332 يحتاج 330) — بديلٌ أدنى: كلُّ حقلٍ يحوي النصّ */
  KIVO.BassamFind = { dig: (v) => String(v == null ? '' : v), filter: (q, list, f) => list.filter((r) => f(r).some((x) => String(x == null ? '' : x).indexOf(q) >= 0)) };
  KIVO.BassamAuth = { user: () => ({ id: 'tst_dm1', role: 'staff', mgr: true, ekey: 'mgr:tst_d1', deptId: D, name: 'TEST_ONLY مدير' }), display: () => ({ name: 'TEST_ONLY مدير' }),
    users: () => [{ id: 'tst_dm1', role: 'staff', mgr: true, ekey: 'mgr:tst_d1', deptId: D, name: 'TEST_ONLY مدير' }, { id: 'tst_gm1', role: 'gm', name: 'TEST_ONLY مدير عام' }] };
  KIVO.BassamDepts = { active: () => D };
  KIVO.BassamSup = { isSup: () => false };
  class DCLogic { constructor() { this.state = {}; } setState(p, cb) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); cb && cb(); } }
  ctx.DCLogic = DCLogic;
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/components/565-page-kit.js'), 'utf8'), ctx);
  const B0 = KIVO.BassamPageKit.base; KIVO.BassamPageKit.base = (B, a) => class extends B0(B, a) { bsOn() { return true; } bsToast(m, k) { toasts.push([m, k]); } bsAck(m, k) { toasts.push([m, k || 'ok']); return Promise.resolve(true); } };
  vm.runInContext(LOGIC + '\n;globalThis.__C = Component;', ctx, { filename: 'tasks/logic.js' });
  const c = new ctx.__C(); c._tkDayDef = () => 0;   /* اختباراتُ الشهر كاملاً (KIVO_265 · كروتُ الأيام: الافتراضي يومُ اليوم) */ c.state = Object.assign({}, c.state || {}, { locked: {} });
  c.bsToast = (m, k) => toasts.push([m, k || 'err']);
  return { c, store, toasts, xlsx };
}
/* صفوفُ الجدول في القيم: كلُّ قائمةٍ تحمل tkcT (كما في tasks_page_p2) */
function allRows(V) { const out = []; const seen = new Set(); const walk = (o, d) => { if (!o || typeof o !== 'object' || d > 4 || seen.has(o)) return; seen.add(o); if (o.tkcT && Array.isArray(o.tkcT)) out.push(o); for (const k of Object.keys(o)) { const v = o[k]; if (Array.isArray(v)) v.forEach(x => walk(x, d + 1)); else if (v && typeof v === 'object' && k !== 'tkcT') walk(v, d + 1); } }; walk(V, 0); return out; }
const ids = (V) => new Set(allRows(V).map((t) => t.tkcT[13]));
const [Y, M] = DAY.split('-').map(Number), YM = Y + '-' + M;
const A = 1760000088001, B = 1760000088002, C = 1760000088003, Dd = 1760000088004, E1 = 1760000088005, E2 = 1760000088006;

async function setup() {
  const W = await world({ worker: WU.file }); const dm = await W.login('0000000101', '70101');
  const now = Date.now();
  /* الموظفُ الثاني بنوع عملٍ مختلف · الجدولُ الشهري: موظفُنا TST-A وزميلُه TST-B */
  const E = stored(W.env, KE); E.find((e) => e.eid === MATE.eid).work = 'TEST_ONLY إداري'; putKV(W.env, KE, E);
  const Sf = stored(W.env, KS) || {}; Sf[YM] = Object.assign({}, Sf[YM] || {}, { [ME.eid]: { shift: 'TST-A', rest: [] }, [MATE.eid]: { shift: 'TST-B', rest: [] } }); putKV(W.env, KS, Sf);
  const S = stored(W.env, KT);
  S[DAY].push(
    row({ id: A, title: 'فلتر · لي بلا توثيق', eid: ME.eid, s: now - 36e5, e: now + 36e5 }),
    Object.assign(row({ id: B, title: 'فلتر · متكررة للزميل', eid: MATE.eid, s: now - 36e5, e: now + 36e5 }), { 23: { v: 1, rec: { id: 'rTST1', t: 'daily' } } }),
    Object.assign(row({ id: C, title: 'فلتر · سُلّمت لمراجعتي', eid: ME.eid, st: 'in_progress', acc: now - 30e5, s: now - 36e5, e: now + 36e5, r21: { imgs: [], note: 'TEST_ONLY تم', sub: 1, at: now - 6e5 } }), { 23: { v: 1, rv: { u: 'tst_dm1', e: 'mgr:tst_d1', n: 'TEST_ONLY مدير' } } }),
    Object.assign(row({ id: Dd, title: 'فلتر · مراجعُها المدير العام', eid: 'tst_e_emp1', s: now - 36e5, e: now + 36e5 }), { 23: { v: 1, rv: { u: 'tst_gm1', e: '', n: 'TEST_ONLY مدير عام' } } }),
    row({ id: E1, title: 'فلتر · عامة مراقب', wt: 'TEST_ONLY مراقب', s: now - 36e5, e: now + 36e5 }),
    row({ id: E2, title: 'فلتر · عامة إداري', wt: 'TEST_ONLY إداري', s: now - 36e5, e: now + 36e5 }),
  );
  putKV(W.env, KT, S);
  const g = await W.C.api('/api/get?keys=' + encodeURIComponent(KT + ',' + KE + ',' + KS), { cookie: dm.ck });
  const extra = { bassam_staffing_v3: g.j.keys[KS].v, bassam_options_v1: JSON.stringify({ work: ['TEST_ONLY مراقب', 'TEST_ONLY إداري'] }) };
  const P = page(W, dm.ck, g.j.keys[KT].v, JSON.parse(g.j.keys[KE].v), extra);
  P.c.setState({ year: Y, month: M, perPage: 0 });
  return { W, dm, P, extra, g };
}

test('البند 14 · الفلاتر الإضافية: المكلَّف · الوردية · نوع العمل · المتكررة · المراجِع · بانتظاري أنا · بلا توثيق — تتراكب، والعدّادُ و«مسح»، والمصدَّرُ = المرئي', async () => {
  const { P, extra } = await setup();
  let V = P.c.renderVals();
  assert.equal(V.tfxOpen, false, 'الشريطُ مطويٌّ افتراضياً'); assert.equal(V.tfxHas, false); assert.equal(V.tfxCount, '0');
  const I0 = ids(V); for (const id of [A, B, C, Dd, E1, E2]) assert.ok(I0.has(id), 'بلا فلاتر: ' + id);
  V.tfxToggle(); assert.equal(P.c.renderVals().tfxOpen, true);
  /* المكلَّف */
  P.c._tkFltSet({ fAsg: ME.eid }); V = P.c.renderVals();
  assert.ok(allRows(V).length >= 2 && allRows(V).every((t) => t.tkcT[14] === ME.eid), 'المكلَّفُ وحده'); assert.ok(ids(V).has(A) && ids(V).has(C) && !ids(V).has(B));
  assert.equal(V.tfxCount, '1'); assert.equal(V.tfxHas, true); assert.match(V.tfaLabel, /موظف مهام 1/);
  assert.ok(V.tfaOpts.some((o) => o.name === 'بدون إسناد'), 'خيارُ «بدون إسناد»');
  P.c._tkFltSet({ fAsg: 'none' }); V = P.c.renderVals(); assert.ok(allRows(V).every((t) => !t.tkcT[14]) && ids(V).has(E1) && ids(V).has(E2), 'بدون إسناد');
  /* الوردية من الجدول الشهري */
  P.c._tkFltSet({ fAsg: 'all', fShift: 'TST-B' }); V = P.c.renderVals();
  assert.ok(ids(V).has(B) && !ids(V).has(A) && !ids(V).has(E1), 'ورديةُ الزميل TST-B');
  { const SM = JSON.parse(extra.bassam_staffing_v3)[YM]; assert.ok(allRows(V).every((t) => (SM[t.tkcT[14]] || {}).shift === 'TST-B'), 'كلُّ صفٍّ مكلَّفُه في TST-B بالجدول'); }
  assert.ok(V.tfhOpts.some((o) => o.name === 'TST-A') && V.tfhOpts.some((o) => o.name === 'TST-B'), 'ورديّاتُ الجدول في القائمة');
  P.c._tkFltSet({ fShift: 'none' }); V = P.c.renderVals(); assert.ok(ids(V).has(E1) && !ids(V).has(A), 'بلا وردية: العامة');
  /* نوعُ العمل: العمودُ 19 أو نوعُ عمل المكلَّف */
  P.c._tkFltSet({ fShift: 'all', fWt: 'TEST_ONLY إداري' }); V = P.c.renderVals();
  assert.ok(ids(V).has(B) && ids(V).has(E2) && !ids(V).has(A) && !ids(V).has(E1), 'نوعُ العمل إداري: الزميلُ والعامةُ الإدارية');
  /* المتكررة فقط */
  P.c._tkFltSet({ fWt: 'all', fRec: true }); V = P.c.renderVals();
  assert.ok(ids(V).has(B) && allRows(V).every((t) => t.tkcT[23] && t.tkcT[23].rec && t.tkcT[23].rec.id), 'المتكررة وحدها');
  assert.ok(V.tfxChips.find((h) => h.label === 'المتكررة فقط').on);
  /* المراجِع */
  P.c._tkFltSet({ fRec: false, fRv: 'me' }); V = P.c.renderVals(); assert.ok(ids(V).has(C) && !ids(V).has(Dd) && !ids(V).has(A), 'أنا المراجِع');
  assert.ok(V.tfrOpts.some((o) => /مدير عام/.test(o.name)), 'المراجِعون من صفوف الشهر');
  P.c._tkFltSet({ fRv: 'tst_gm1' }); V = P.c.renderVals(); assert.deepEqual([...ids(V)], [Dd], 'مراجِعٌ بعينه');
  P.c._tkFltSet({ fRv: 'none' }); V = P.c.renderVals(); assert.ok(ids(V).has(A) && !ids(V).has(C) && !ids(V).has(Dd), 'بلا مراجِع');
  /* بانتظاري أنا: مراجعةٌ معلّقة وأنا مراجعُها */
  P.c._tkFltSet({ fRv: 'all', fMine: true }); V = P.c.renderVals(); assert.deepEqual([...ids(V)], [C], 'بانتظاري أنا'); assert.equal(allRows(V)[0].status, 'review');
  /* بلا توثيق */
  P.c._tkFltSet({ fMine: false, fNoProof: true }); V = P.c.renderVals();
  assert.ok(ids(V).has(A) && !ids(V).has(C), 'بلا توثيق'); assert.ok(allRows(V).every((t) => !(t.tkcT[21] && ((t.tkcT[21].imgs || []).length || t.tkcT[21].note))));
  /* التراكب: المكلَّف + بلا توثيق + البحث · والعدّاد · والتصدير = المرئي */
  P.c._tkFltSet({ fAsg: ME.eid }); P.c.setState({ search: 'فلتر' }); V = P.c.renderVals();
  assert.deepEqual([...ids(V)], [A], 'تراكبُ البحث والمكلَّف وبلا توثيق'); assert.equal(V.tfxCount, '2');
  V.exportCsv(); assert.equal(P.xlsx.length, 1); assert.equal(P.xlsx[0].rows.length, 2, 'المصدَّر = المرئي (عنوان + صف)'); assert.equal(P.xlsx[0].rows[1][1], 'TEST_ONLY فلتر · لي بلا توثيق');
  /* الفلترُ القديم (الحالة) يُحفظ كذلك عبر القائمة */
  V.tfsOpts.find((o) => o.name === 'منجزة').pick(); assert.equal(P.c.state.fStatus, 'done'); assert.equal(P.c.renderVals().tfxCount, '3');
  /* مسح */
  P.c.renderVals().tfxClear(); V = P.c.renderVals();
  assert.equal(V.tfxCount, '0'); assert.equal(P.c.state.fStatus, 'all'); assert.equal(P.c.state.fAsg, 'all'); assert.equal(P.c.state.fNoProof, false);
  P.c.setState({ search: '' }); const I9 = ids(P.c.renderVals()); for (const id of [A, B, C, Dd, E1, E2]) assert.ok(I9.has(id), 'بعد المسح: ' + id);
});

test('البند 14 · الاختياراتُ تُحفظ للمسؤول (bassam_tasks_filters_v1:<uid>) وتُستعاد عند فتح الصفحة — ونصٌّ تالف لا يُسقطها', async () => {
  const { W, dm, P, extra, g } = await setup();
  const K = 'bassam_tasks_filters_v1:tst_dm1';
  assert.equal(P.store.get(K), undefined, 'لا شيءَ محفوظاً قبل الاختيار');
  P.c._tkFltSet({ fAsg: ME.eid, fRec: true }); P.c._tkFltSet({ fShift: 'TST-A' });
  const saved = JSON.parse(P.store.get(K)); assert.equal(saved.fAsg, ME.eid); assert.equal(saved.fRec, true); assert.equal(saved.fShift, 'TST-A'); assert.equal(saved.fStatus, 'all');
  /* صفحةٌ جديدة بالمخزن نفسِه ⇒ الفلاترُ كما تُركت — والصفوفُ مرشَّحة */
  const P2 = page(W, dm.ck, g.j.keys[KT].v, JSON.parse(g.j.keys[KE].v), Object.assign({ [K]: P.store.get(K) }, extra));
  P2.c.setState({ year: Y, month: M, perPage: 0 });
  assert.equal(P2.c.state.fAsg, ME.eid); assert.equal(P2.c.state.fRec, true); assert.equal(P2.c.state.fShift, 'TST-A');
  const V2 = P2.c.renderVals(); assert.equal(V2.tfxCount, '3'); assert.equal(V2.tfxHas, true); assert.equal(allRows(V2).length, 0, 'لي + متكررة + TST-A ⇒ لا صف');
  P2.c.renderVals().tfxClear(); assert.equal(JSON.parse(P2.store.get(K)).fAsg, 'all'); assert.ok(ids(P2.c.renderVals()).has(A));
  /* نصٌّ تالف أو أنواعٌ خاطئة ⇒ الافتراضيات */
  const P3 = page(W, dm.ck, g.j.keys[KT].v, JSON.parse(g.j.keys[KE].v), Object.assign({ [K]: '{bad' }, extra));
  assert.equal(P3.c.state.fAsg, 'all'); assert.equal(P3.c.state.fRec, false);
  const P4 = page(W, dm.ck, g.j.keys[KT].v, JSON.parse(g.j.keys[KE].v), Object.assign({ [K]: JSON.stringify({ fAsg: 7, fRec: 'yes', fWt: 'TEST_ONLY إداري' }) }, extra));
  assert.equal(P4.c.state.fAsg, 'all'); assert.equal(P4.c.state.fRec, false); assert.equal(P4.c.state.fWt, 'TEST_ONLY إداري');
});
