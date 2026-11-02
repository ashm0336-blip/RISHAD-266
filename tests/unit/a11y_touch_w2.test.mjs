/* الموجة 2 · أهدافُ اللمس والضغطاتُ الهدّامة (KD-11 · ES-9 · PLAN-06 · DG-10 · AUX-13) — منطقُ الوحدات الحقيقي داخل node:vm (بياناتٌ اصطناعية TEST_ONLY)
   وطبقةُ CSS المشتركة:
   · على الإصبع (pointer:coarse) كانت أزرارُ السنة والصفحات ومبدّلُ العرض 28px، وخاناتُ الأيام 28px بأرقام 8px، ومنتقياتُ صفوف الجدول الشهري
     ورقائقُ الراحة 19–23px، ومربّعاتُ التحديد 16px، وأيقوناتُ صفّ الموقع في التشغيل الميداني 22px، ورقائقُ سجلّ العمليات 26px. الحاسوبُ كما هو.
   · ضغطةٌ على رقاقة الراحة تحذف اليومَ فوراً — الآن على اللمس تفتح محرِّرَ الراحات (والفأرةُ كما كانت).
   · قفلُ الموقع واعتمادُه بضغطةٍ واحدة على أيقونة 22px بجوار «تعديل» — الآن بتأكيدٍ في نافذة المنصة الموحّدة. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { ROOT, SRC, moduleLogic } from './harness.mjs';

const rd = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');
/* كتلةُ @media التي تلي تعليقاً بعينه (بموازنة الأقواس) */
function mediaAfter(css, mark) {
  const i = css.indexOf(mark); assert.ok(i >= 0, mark);
  const s = css.indexOf('@media', i), o = css.indexOf('{', s); let d = 0, j = o;
  for (; j < css.length; j++) { if (css[j] === '{') d++; else if (css[j] === '}' && --d === 0) break; }
  return { head: css.slice(s, o).trim(), body: css.slice(o + 1, j) };
}
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
/* قيمٌ من سياق vm (مصفوفاتُه من عالمٍ آخر) ⇐ نسخةٌ من هذا العالم للمقارنة العميقة */
const J = (x) => JSON.parse(JSON.stringify(x));

/* RISHAD-266: طبقةُ اللمس المشتركة في helmet-global.css (KD-11 · الغلاف) ومعها أغلفةُ <label class="bs-ckhit"> لمربّعات التحديد أُسقطت —
   الغلافُ (shell:index.html) يتجاوز سقفه بها (perf_budget) ولم يُرفع السقف. قواعدُ اللمس في رؤوس الوحدات باقية ومختبَرة أدناه. */

test('PLAN-06 · DG-10 · ES-9 · AUX-13: قواعدُ الوحدات (لا في الغلاف) — التشغيلُ الميداني ٣٦ وشارةُ حذف الشهر ٢٤ · «الشهر كاملاً» ٣٦ · إدارةُ الموقع ٣٢ — كلُّها على الإصبع وحده', () => {
  const M = (f, mark) => { const m = mediaAfter(rd(f), mark); assert.equal(m.head, '@media (pointer: coarse)', f); return strip(m.body).replace(/\s+/g, ' '); };
  const plan = M('modules/plan/helmet.css', 'الموجة 2 · PLAN-06');
  assert.ok(plan.includes('.bs-mapcard button:not([style*="position: absolute"]), .bs-panel-shell button:not([style*="position: absolute"]){ min-width:36px; min-height:36px; }'));
  assert.ok(plan.includes('[title^="سيتم حذف"][style*="position: absolute"]{ min-width:24px; min-height:24px; }'));
  const tasks = M('modules/tasks/helmet.css', 'الموجة 2 · DG-10');
  assert.ok(tasks.includes('.tk-dayall{min-height:36px}') && tasks.includes('[title^="سيتم حذف"][style*="position: absolute"]{min-width:24px;min-height:24px}'));
  const st = M('modules/staff/helmet.css', 'الموجة 2 · ES-9');
  assert.ok(st.includes('[title^="سيتم حذف"][style*="position: absolute"]{min-width:24px;min-height:24px}') && st.includes('.st-restdd button{min-height:36px}'));
  assert.ok(M('modules/dreport/helmet.css', 'الموجة 2 · DG-10').includes('.dr-trbox button{min-height:36px}'));
  assert.equal((rd('modules/dreport/view.html').match(/<div class="dr-trbox" style="margin-top:6px;/g) || []).length, 2, 'منتقيا التحويل (الجدول والبطاقات)');
  const adm = M('modules/admin/helmet.css', 'الموجة 2 · AUX-13');
  assert.ok(adm.includes('[data-screen-label="إدارة الموقع"] button:not([style*="position: absolute"]){min-width:32px;min-height:32px}'));
  assert.ok(adm.includes('[data-screen-label="إدارة الموقع"] [data-sf=name][style*="cursor: pointer"]{min-height:32px;display:inline-flex;align-items:center}'));
  /* الشارةُ في القوالب فعلاً بهذا العنوان وموضعٍ مطلق */
  assert.match(rd('modules/staff/view.html'), /title="سيتم حذف جميع بيانات الشهر" style="position:absolute;/);
});

test('PLAN-06 · الجوال (≤ 640px) واللمس: رأسُ الخريطة يلتفّ سطرين حين لا يتّسع فيأخذ شريطُ «حالة الموقع» والعدساتِ والتكبير سطراً كاملاً — كان يُعصَر إلى 0–47px على الجوال', () => {
  const css = rd('modules/plan/helmet.css'), m = mediaAfter(css, 'على الجوال واللمس يلتفّ رأسُ الخريطة سطرين');
  assert.equal(m.head, '@media screen and (max-width: 640px), screen and (pointer: coarse)', 'الشاشةُ وحدها — لا الطباعة، ولا الحاسوبُ بمؤشّرٍ دقيق');
  const b = m.body.replace(/\s+/g, ' ');
  assert.ok(b.includes('.bs-mapcard > .bs-hbar{ flex-wrap:wrap !important; row-gap:8px; }'));
  /* أساسُه عرضُ محتواه (auto) — فلا يلتفّ ما دام يتّسع بجوار منتقي الموقع، ويملأ السطرَ حين يلتفّ */
  assert.ok(b.includes('.bs-mapcard > .bs-hbar > .bs-hbar{ flex:1 1 auto; }'));
  /* القالب: الرأسُ شريطٌ أفقيّ داخل البطاقة، والشريطُ الداخليّ (الشارةُ أولُه) ابنٌ مباشر له */
  const v = rd('modules/plan/view.html'), i = v.indexOf('<div class="bs-mapcard"'), j = v.indexOf('<div class="bs-mapbody"', i), h = v.slice(i, j);
  /* الموجة 2 (دمج): رأسُ الخريطة يحمل bs-wrap أيضاً (PLAN-02 — لا تختفي أدواتُ الخريطة على الجوال) والقاعدةُ هنا تبقى عليه */
  assert.match(h, /^<div class="bs-mapcard"[^>]*>\n\s*<div class="bs-hbar(?: bs-wrap)?" style="display:flex;align-items:center;justify-content:space-between;/);
  assert.match(h, /\n {4}<div class="bs-hbar(?: bs-wrap)?" style="display:flex;align-items:center;gap:8px;min-width:0[^"]*">\n\s*<sc-if value="\{\{hasSites\}\}"[^>]*>\n\s*<!--[^\n]*-->\n\s*<span title="\{\{approveBadgeTip\}\}"/);
  /* والقاعدةُ العامة التي تمنع الالتفاف (!important) أضعفُ تحديداً من قاعدة البطاقة */
  assert.match(rd('layouts/helmet-global.css'), /\.bs-hbar\{flex-wrap:nowrap!important;/);
});

test('ES-9 · محرِّرُ الراحات لا يتجاوز الشاشة: عرضُه max-content بحدٍّ أقصى calc(100vw - 16px) وأيامُه تلتفّ — كان 452px فيخرج «سبت» عن جوال 390px (ولا طريقَ آخر للحذف باللمس)', () => {
  const v = rd('modules/staff/view.html');
  const eds = v.match(/<div data-bs-dd="1" class="st-restdd" style="[^"]*">/g) || [];
  assert.equal(eds.length, 2, 'الجدولُ والبطاقات');
  for (const e of eds) {
    assert.match(e, /display:flex;gap:4px;white-space:nowrap;flex-wrap:wrap;justify-content:center;width:max-content;max-width:calc\(100vw - 16px\);box-sizing:border-box"/);
    assert.doesNotMatch(e, /min-width:/);
  }
  /* مُصلِحُ القوائم (630) يقيس offsetWidth ثم يحصر اليسارَ في [8، العرض − w − 8] — فالمحرِّرُ بعرضٍ ≤ العرض − 16 يقع كلُّه داخل الشاشة */
  const pp = fs.readFileSync(path.join(SRC, 'components/630-popover-place.js'), 'utf8');
  assert.match(pp, /var w = el\.offsetWidth/);
  assert.match(pp, /var pad = 8;/);
  assert.match(pp, /left = Math\.max\(pad, Math\.min\(window\.innerWidth - w - pad, left\)\);/);
});


/* RISHAD-266: AUX-13 «صفحتي» (profile/helmet.css) لا يُنقل هنا — profile خارج هذا النقل (عملُ المالك المحلّي على خريطتها) */

/* ── منطقُ الوحدات في vm ── */
const SERVICES = ['src/services/060-percent-format.js', 'src/services/390-kpi-primitives.js', 'src/services/400-shift-need.js', 'src/services/440-count.js', 'src/services/410-gate-units.js',
  'src/i18n/380-hijri-fallback.js', 'src/services/420-round-factory.js', 'src/services/490-emp-key.js', 'src/services/290-activity-log.js', 'src/components/560-canvas-input.js', 'src/components/565-page-kit.js'];
function page(slug, o = {}) {
  const store = new Map(), KIVO = {}, toasts = [];
  const ctx = { KIVO, console, setTimeout: () => 0, clearTimeout: () => 0, setInterval: () => 0, clearInterval: () => 0, requestAnimationFrame: () => 0, cancelAnimationFrame() {}, performance: { now: () => 1 },
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    document: { hidden: false, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, addEventListener() {}, removeEventListener() {} },
    navigator: { userAgent: 'node' }, addEventListener() {}, removeEventListener() {}, __BS_BOOT: { srv: 0 }, fetch: () => new Promise(() => {}),
    matchMedia: (q) => ({ matches: !!o.coarse && /pointer:\s*coarse/.test(q) }),
    React: { createElement: (t, p, ...ch) => ({ t, p, ch }), Fragment: 'F' } };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  class DCLogic { constructor() { this.state = {}; } setState(p, cb) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); if (cb) cb(); } }
  ctx.DCLogic = DCLogic;
  for (const f of SERVICES) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  KIVO.BassamFind = { dig: (v) => String(v == null ? '' : v), norm: (v) => String(v == null ? '' : v), filter: (q, list) => list, match: () => true };
  KIVO.__bsMixOn = () => false;
  const can = o.can || (() => true);
  KIVO.BassamPerm = { can: (k, a) => can(k, a), on: () => true, lensOn: () => true, tplsList: () => (JSON.parse(store.get('bassam_perm_tpls_v1') || '[]') || []).filter((t) => t && t.id) };
  KIVO.BassamAuth = { user: () => ({ id: 'TEST_ONLY_dm', role: 'staff', mgr: true, deptId: 'tst_d1' }), isSuper: () => false, display: () => ({ name: 'TEST_ONLY' }), users: () => [] };
  KIVO.BassamDepts = { active: () => 'tst_d1', activeName: () => 'TEST_ONLY', list: () => [] };
  KIVO.BassamPick = { txt: () => '', plus: () => '' };
  /* RISHAD-266: خدمةُ العمليات اصطناعيّة فوق المخزن المحلّي — commit يطبّق المسودة ويقرّ بها (ok:1) أو يرفضها (o.refuse()) فلا يتغيّر شيء */
  const ops = { commits: 0, refuse: false };
  const draftOf = () => { const w = new Map(); return { get: (k) => (w.has(k) ? w.get(k) : (store.has(k) ? JSON.parse(store.get(k)) : null)), set: (k, v) => w.set(k, v), w }; };
  KIVO.__BS_SRV = { rev: () => 0, ops, operations: { resources: [], status: () => ({ state: 'idle', epoch: 0 }), begin: () => ({ ok: true }), context: () => null, state: () => 'ready',
    get: (k) => (store.has(k) ? JSON.parse(store.get(k)) : null),
    commit: async (c, slot, intent, edit) => { ops.commits++; const d = draftOf(); edit(d); if (ops.refuse) return { ok: 0, err: 'TEST_ONLY refused' }; for (const [k, v] of d.w) store.set(k, JSON.stringify(v)); return { ok: 1 }; } } };
  const B0 = KIVO.BassamPageKit.base; KIVO.BassamPageKit.base = (B, a) => class extends B0(B, a) { bsOn() { return true; } bsLensOn() { return true; } bsToast(m) { toasts.push(m); } };
  vm.runInContext(moduleLogic(slug) + '\n;globalThis.__C = Component;', ctx, { filename: slug + '/logic.js' });
  return { ctx, store, KIVO, toasts, C: ctx.__C };
}
/* الجدول الشهري بموظفَين اصطناعيَّين: الأول براحتين (اكتمل النصاب) والثاني براحةٍ واحدة */
function staffing(coarse) {
  const P = page('staff', { coarse });
  P.store.set('bassam_employees_v1', JSON.stringify([{ eid: 'TEST_ONLY_e1', name: 'TEST_ONLY موظف ١', nid: '1000000001' }, { eid: 'TEST_ONLY_e2', name: 'TEST_ONLY موظف ٢', nid: '1000000002' }]));
  const mk = new P.C().monthKey();
  P.store.set('bassam_staffing_v3', JSON.stringify({ [mk]: { TEST_ONLY_e1: { shift: 'الوردية الأولى', rest: ['الجمعة', 'السبت'] }, TEST_ONLY_e2: { shift: 'الوردية الأولى', rest: ['الأحد'] } } }));
  const c = new P.C(); c.setState({ staffing: c.loadStaffing() });
  const row = (eid) => c.renderVals().rows.find((r) => r.eid === eid), O = P.KIVO.__BS_SRV.ops;
  return { c, mk, row, writes: () => O.commits, refuse: (v) => { O.refuse = v; }, toasts: P.toasts };
}

test('ES-9 · اللمس: ضغطةٌ على رقاقة الراحة لا تحذف — تفتح محرِّرَ الراحات (ولو اكتمل النصاب) · ومنه يُزال اليومُ بضغطةٍ مقصودة · والإضافةُ التي تكمل النصاب تغلقه', async () => {
  const S = staffing(true);
  let r = S.row('TEST_ONLY_e1');
  assert.deepEqual(J(r.restChips.map((x) => x.tip)), ['اضغط لتعديل أيام الراحة', 'اضغط لتعديل أيام الراحة']);
  assert.equal(r.restCanEdit, false, 'يومان: لا زرَّ إضافة');
  r.restChips[0].remove();
  assert.equal(S.writes(), 0, 'لا كتابة');
  assert.deepEqual(J(S.c.state.staffing[S.mk].TEST_ONLY_e1.rest), ['الجمعة', 'السبت'], 'الراحتان باقيتان');
  r = S.row('TEST_ONLY_e1');
  assert.equal(r.restOpen, true, 'المحرِّرُ مفتوح');
  await r.weekDays.find((w) => w.name.indexOf('جمعة') >= 0).toggle();
  assert.equal(S.writes(), 1);
  assert.deepEqual(J(S.c.state.staffing[S.mk].TEST_ONLY_e1.rest), ['السبت'], 'أُزيل اليومُ من المحرِّر');
  assert.equal(S.c.state.restOpen, 'TEST_ONLY_e1', 'يبقى مفتوحاً بعد الإزالة');
  await S.row('TEST_ONLY_e1').weekDays.find((w) => w.name.indexOf('خميس') >= 0).toggle();
  assert.deepEqual(J(S.c.state.staffing[S.mk].TEST_ONLY_e1.rest), ['السبت', 'الخميس']);
  assert.equal(S.c.state.restOpen, null, 'اكتمل النصاب ⇒ يُغلق');
  /* الضغطةُ الثانية على الرقاقة تغلق المحرِّرَ المفتوح */
  S.row('TEST_ONLY_e2').restChips[0].remove(); assert.equal(S.c.state.restOpen, 'TEST_ONLY_e2');
  S.row('TEST_ONLY_e2').restChips[0].remove(); assert.equal(S.c.state.restOpen, null);
  assert.equal(S.writes(), 2);
});

test('ES-9 · الفأرة كما كانت: نقرةٌ على رقاقة الراحة تحذف اليوم (تلميحٌ أحمر عند المرور) · والشهرُ المقفل لا يُكتب فيه شيء', async () => {
  const S = staffing(false);
  const r = S.row('TEST_ONLY_e1');
  assert.equal(r.restChips[0].tip, 'اضغط للحذف');
  await r.restChips[0].remove();
  assert.equal(S.writes(), 1);
  assert.deepEqual(J(S.c.state.staffing[S.mk].TEST_ONLY_e1.rest), ['السبت']);
  assert.equal(S.c.state.restOpen, null);
  /* الشهرُ المقفل: الرقاقةُ للعرض وحده — لا حذفَ ولا محرِّر */
  const L = staffing(false); L.c.state = Object.assign({}, L.c.state, { locked: { [L.mk]: true } });
  const rl = L.row('TEST_ONLY_e1'); assert.equal(rl.restChips[0].tip, 'الشهر مقفل'); rl.restChips[0].remove();
  assert.equal(L.writes(), 0); assert.equal(L.c.state.restOpen || null, null);
  /* القالب: المحرِّرُ خارج شرط زرّ الإضافة (يُفتح من الرقاقة ولو اكتمل النصاب) — في الجدول وفي البطاقات */
  const v = rd('modules/staff/view.html');
  assert.equal((v.match(/<sc-if value="\{\{e\.restCanEdit\}\}" hint-placeholder-val="\{\{ true \}\}">\n\s*<button onClick="\{\{e\.restToggle\}\}" title="تعديل أيام الراحة" style="\{\{e\.restBtnStyle\}\}">\+<\/button>\n\s*<\/sc-if>/g) || []).length, 2);
});

test('ES-9 · RISHAD-266: إضافةٌ تكمل النصاب يرفضها الخادم ⇒ المحرِّرُ يبقى مفتوحاً والراحاتُ كما كانت (الإغلاقُ بعد قبول الحفظ وحده)', async () => {
  const S = staffing(true);
  S.row('TEST_ONLY_e2').restChips[0].remove();
  assert.equal(S.c.state.restOpen, 'TEST_ONLY_e2', 'المحرِّرُ مفتوح');
  S.refuse(true);
  await S.row('TEST_ONLY_e2').weekDays.find((w) => w.name.indexOf('خميس') >= 0).toggle();
  assert.equal(S.writes(), 1, 'محاولةٌ واحدة');
  assert.deepEqual(J(S.c.state.staffing[S.mk].TEST_ONLY_e2.rest), ['الأحد'], 'لا تغيير');
  assert.equal(S.c.state.restOpen, 'TEST_ONLY_e2', 'رُفض ⇒ يبقى مفتوحاً لإعادة المحاولة');
  S.refuse(false);
  await S.row('TEST_ONLY_e2').weekDays.find((w) => w.name.indexOf('خميس') >= 0).toggle();
  assert.deepEqual(J(S.c.state.staffing[S.mk].TEST_ONLY_e2.rest), ['الأحد', 'الخميس']);
  assert.equal(S.c.state.restOpen, null, 'قُبل ⇒ اكتمل النصاب فيُغلق');
});

/* التشغيلُ الميداني: موقعان (TEST_ONLY) — كما في plan_canvas_w1 */
const site = (n) => ({ sid: 's_TEST_ONLY_' + n, name: 'TEST_ONLY الموقع ' + n, num: n, zones: [], gates: [], marks: [], paths: [], sectors: [], hideSectors: false, approved: false, iid: null });
function plan(o = {}) {
  const P = page('plan', o), c = new P.C(), asks = [];
  const F = [site(1), site(2)];
  P.store.set('bassam_plan_v1', JSON.stringify({ pMig: 3, zones: [], gates: [], marks: [], paths: [], floors: F, months: { '1448-5': { c: 1, d: F } }, cfg: {}, delMonths: {} }));
  c.state = Object.assign({}, c.state, { year: 1448, month: 5, floor: 0, floors: F.map((f) => Object.assign({}, f)), zones: [], gates: [], marks: [], paths: [], planMonths: { '1448-5': { c: 1, d: F } }, sel: null, selMulti: [], tool: 'select', lens: 'plan', view: { x: 0, y: 0, w: 1000, h: 600 } });
  const S = { saves: 0, denies: 0 };
  S.ack = { ok: 1 };
  c.savePlan = () => { S.saves++; return Promise.resolve(S.ack); }; c.permDeny = () => { S.denies++; }; c._loadFloorImages = () => {};
  let answer = true;
  P.KIVO.bsConfirm = (q) => { asks.push(q); return Promise.resolve(answer); };
  return { c, S, asks, answer: (v) => { answer = v; } };
}
const ev = () => ({ stopPropagation() {} });

test('PLAN-06 · قفلُ الموقع واعتمادُه يمرّ بتأكيد المنصة: الإلغاءُ لا يكتب شيئاً · التأكيدُ يقفل الموقعَ وحده ويحفظ مرّةً · وفتحُه بتأكيدٍ كذلك', async () => {
  const P = plan();
  P.answer(false);
  P.c.renderVals().fldOpts[1].approveToggle(ev());
  await new Promise((r) => setImmediate(r));
  assert.equal(P.asks.length, 1);
  assert.equal(P.asks[0].title, 'قفل الموقع واعتماده');
  /* زرُّ «إلغاء» ظاهر: لا info (النافذةُ الإعلامية تُخفيه — cfmNoOn = !info في root-logic) */
  assert.equal(P.asks[0].cancel, 'إلغاء');
  assert.ok(!P.asks[0].info, 'لا نافذةَ إعلامية');
  assert.match(fs.readFileSync(path.join(SRC, 'layouts/root-logic.js'), 'utf8'), /cfmNoOn: !c\.info,/);
  assert.match(P.asks[0].msg, /سيُقفل «TEST_ONLY الموقع 2» ويُعتمد/);
  assert.equal(P.S.saves, 0, 'ألغي ⇒ لا حفظ');
  assert.equal(P.c.state.floors[1].approved, false);
  P.answer(true);
  P.c.renderVals().fldOpts[1].approveToggle(ev());
  await new Promise((r) => setImmediate(r));
  assert.equal(P.S.saves, 1);
  assert.deepEqual(J(P.c.state.floors.map((f) => !!f.approved)), [false, true], 'الموقعُ الثاني وحده');
  P.c.renderVals().fldOpts[1].approveToggle(ev());
  await new Promise((r) => setImmediate(r));
  assert.equal(P.asks[2].title, 'فتح الموقع للتعديل');
  assert.equal(P.asks[2].ok, 'افتح الموقع');
  assert.equal(P.c.state.floors[1].approved, false);
  assert.equal(P.S.saves, 2);
});

test('PLAN-06 · RISHAD-266: قفلٌ مؤكَّدٌ يرفضه الخادم (ack.ok !== 1) ⇒ يعود الموقعُ كما كان', async () => {
  const P = plan();
  P.S.ack = { ok: 0, err: 'TEST_ONLY refused' };
  const done = await P.c.renderVals().fldOpts[1].approveToggle(ev());
  assert.equal(done, false);
  assert.equal(P.S.saves, 1, 'حاول الحفظ مرّةً');
  assert.deepEqual(J(P.c.state.floors.map((f) => !!f.approved)), [false, false], 'رُدَّ القفل');
});

test('PLAN-06 · بلا صلاحية الاعتماد: لا تأكيدَ ولا كتابة — رسالةُ الصلاحية كما كانت', async () => {
  const P = plan({ can: (k, a) => a !== 'approve' });
  P.c.renderVals().fldOpts[0].approveToggle(ev());
  await new Promise((r) => setImmediate(r));
  assert.equal(P.asks.length, 0); assert.equal(P.S.saves, 0); assert.equal(P.S.denies, 1);
});
