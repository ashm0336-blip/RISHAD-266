/* KIVO_265 · البند 17 من قائمة صفحة المهام — ربطُ الأداء بمؤشرات الأداء: لوحةُ «مؤشرات المهام» في «مؤشرات الإدارة» (src/modules/kpis):
     (1) الحسابُ النقيّ _tkKpi من مخزن المهام {"Y-M-D": [صفوف]} للشهر الهجري وحده: الإنجازُ في الوقت (العمود 6 = on_time/early من المنجزة) ·
         التأخرُ (late من المنجزة) · الالتزامُ بالتوثيق (منجزةٌ بصورةٍ أو ملاحظة من المنجزة) · متوسطُ زمن القبول (11 − 15 للمقبولة)
     (2) القيمُ التي تراها الشاشة (renderVals): التبويبُ لمن يرى صفحةَ المهام (tasks · view) وحده · البطاقاتُ بألوانٍ دلالية · الشهرُ الحالي
         افتراضاً مع تنقّلٍ سابق/تالٍ (ولفُّ السنة) · «لا مهام في هذا الشهر» · القراءةُ من localStorage «bassam_tasks_v1» (320 يحوّله للإدارة النشطة)
     (3) القالب: التبويبُ والقسمُ ورموزُه الدلالية وحدها
   منطقُ الصفحة الحقيقي في vm بلا متصفح (كما tests/unit/custody_store.test.mjs وprofile_world.mjs). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { ROOT } from './harness.mjs';

const LOGIC = path.join(ROOT, 'src/modules/kpis/logic.js'), VIEW = path.join(ROOT, 'src/modules/kpis/view.html');
const MIN = 60e3;
/* صفٌّ بالأعمدة المعنية وحدها: 3 الحالة · 6 الأداء · 11 القبول · 15 البداية · 21 الإثبات */
function row(o) { const r = ['TEST_ONLY ' + (o.t || 'مهمة'), '', 'normal', o.st || 'pending', 'normal', 'مضافة', o.perf || null, [], '', '', 60, o.acc || null, o.fin || null, o.id || 1, 'tst_e', o.s || null, o.e || null, null, null, null, null, o.r21 || null]; return r; }
const S0 = 1760000000000;
function store() {
  return {
    '1448-4-1': [
      row({ t: 'في الوقت بصورة', st: 'done', perf: ['on_time', 'في الوقت'], s: S0, acc: S0 + 10 * MIN, fin: S0 + 60 * MIN, r21: { imgs: ['img_tskx_1'], note: '' } }),
      row({ t: 'مبكرة بملاحظة', st: 'done', perf: ['early', 'مبكر'], s: S0, acc: S0 + 20 * MIN, fin: S0 + 30 * MIN, r21: { imgs: [], note: 'تم' } }),
      row({ t: 'متأخرة بلا إثبات', st: 'done', perf: ['late', 'متأخر 5 د'], s: S0, acc: S0 - 30 * MIN, fin: S0 + 120 * MIN, r21: null }),
      'ليس صفاً',
    ],
    '1448-4-9': [
      row({ t: 'جارية', st: 'in_progress', s: S0, acc: S0 + 40 * MIN }),
      row({ t: 'لم تُقبل', st: 'pending', s: S0 }),
      row({ t: 'اعتذار', st: 'declined', s: S0 }),
    ],
    '1448-3-30': [row({ t: 'الشهر الماضي متأخرة', st: 'done', perf: ['late', 'متأخر'], s: S0, acc: S0 + 5 * MIN, fin: S0 + MIN, r21: { imgs: ['img_tskx_2'] } })],
    '1448-4': 'مفتاحٌ ناقص',
    'x-y-z': [row({ st: 'done', perf: ['on_time', ''] })],
  };
}
function page(o = {}) {
  const KIVO = {}, LS = new Map();
  if (o.tasks !== null) LS.set('bassam_tasks_v1', typeof o.tasks === 'string' ? o.tasks : JSON.stringify(o.tasks || store()));
  const ctx = { KIVO, console, Intl, Date, Math, JSON, Object, Array, String, Number, RegExp, Error,
    localStorage: { getItem: (k) => (LS.has(k) ? LS.get(k) : null), setItem: (k, v) => LS.set(k, String(v)), removeItem: (k) => LS.delete(k) } };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  const can = o.can || (() => true);
  KIVO.BassamPerm = { can: (k, a) => can(k, a), kpiPanelOk: (pk, sk) => !!(o.others && o.others(pk, sk)), canSub: () => true, on: () => true };
  KIVO.BassamHijri = { now: () => ({ y: 1448, m: 4, d: 27 }) };
  /* schema 10: tasks come from the confirmed Operations projection, and operational pages require a ready registered department context */
  KIVO.BassamDepts = { context: () => (o.scope || { state: 'ready' }) };
  KIVO.__BS_SRV = { operations: { get: (k) => { if (k !== 'bassam_tasks_v1' || !LS.has(k)) return null; try { return JSON.parse(LS.get(k)); } catch (e) { return null; } } } };
  ctx.DCLogic = class { constructor() { this.state = {}; } setState(p) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); } };
  vm.runInContext(fs.readFileSync(LOGIC, 'utf8') + '\n;globalThis.__C = Component;', ctx, { filename: 'kpis/logic.js' });
  const c = new ctx.__C();
  return { c, V: () => c.renderVals(), LS };
}

test('(1) الحسابُ النقيّ للشهر: المنجزةُ ونسبُها (في الوقت · متأخرة · موثّقة) ومتوسطُ زمن القبول — صفوفُ الشهر وحدها، وما ليس صفاً أو مفتاحاً يُهمل', () => {
  const P = page(), k = P.c._tkKpi(store(), 1448, 4);
  assert.equal(k.n, 6, 'ستُّ مهام في ربيع الآخر (لا الشهرَ الماضي ولا المفاتيحَ الفاسدة)');
  assert.equal(k.done, 3); assert.equal(k.open, 2); assert.equal(k.dec, 1);
  assert.equal(k.on, 2); assert.equal(k.onPct, 67, 'في الوقت أو مبكرة من المنجزة = 2/3');
  assert.equal(k.late, 1); assert.equal(k.latePct, 33);
  assert.equal(k.doc, 2); assert.equal(k.docImg, 1); assert.equal(k.docPct, 67, 'بصورةٍ أو ملاحظة من المنجزة = 2/3');
  assert.equal(k.acc, 4, 'المقبولة: ثلاثُ منجزاتٍ + الجارية'); assert.equal(k.accAvg, 10, 'متوسط (11 − 15): (10 + 20 − 30 + 40) / 4 = 10 د');
  const k3 = P.c._tkKpi(store(), 1448, 3);
  assert.equal(k3.n, 1); assert.equal(k3.latePct, 100); assert.equal(k3.onPct, 0); assert.equal(k3.docPct, 100); assert.equal(k3.accAvg, 5);
  const k0 = P.c._tkKpi(store(), 1448, 5);
  assert.equal(k0.n, 0); assert.equal(k0.onPct, null, 'بلا منجزة ⇒ لا نسبة (null لا 0)'); assert.equal(k0.accAvg, null);
  assert.deepEqual(P.c._tkKpi(null, 1448, 4).n, 0, 'مخزنٌ غائب');
  assert.equal(P.c._tkKpi({ '1448-4-1': [row({ st: 'in_progress', s: S0, acc: S0 - 90 * MIN })] }, 1448, 4).accAvg, -90, 'بدءٌ قبل الموعد ⇒ سالب');
});

test('(2) الشاشة: التبويبُ لمن يرى المهام · البطاقاتُ الأربع بقيمها وألوانها الدلالية · الشهرُ الحالي ثم السابق/التالي بلفّ السنة · الفارغ · المخزنُ الفاسد', () => {
  const P = page();
  let t = P.V();
  assert.equal(t.ok_tk, true); assert.equal(t.on_tk, true, 'اللوحةُ الوحيدةُ المتاحة تُفتح تلقائياً'); assert.equal(t.stripOn, false); assert.equal(t.noneOn, false);
  assert.equal(t.tkKpiTitle, 'ربيع الآخر 1448 — الشهر الحالي');
  assert.equal(t.tkKpiSub, '6 مهمة · 3 منجزة · 2 مفتوحة · 1 معتذَر عنها');
  assert.equal(t.tkKpiEmpty, false); assert.equal(t.tkKpiNoDone, false);
  const C = t.tkKpiCards; assert.equal(C.length, 4);
  assert.equal(C.map((c) => c.t).join(' · '), 'الإنجاز في الوقت · التأخر · الالتزام بالتوثيق · متوسط زمن القبول');
  assert.equal(C[0].v, '67٪'); assert.equal(C[0].c, 'var(--warning-text)', '60–80 تحذير'); assert.match(C[0].sub, /2 من 3/);
  assert.equal(C[1].v, '33٪'); assert.equal(C[1].c, 'var(--danger-text)', 'تأخرٌ > 25٪ خطر'); assert.match(C[1].sub, /1 من 3/);
  assert.equal(C[2].v, '67٪'); assert.equal(C[2].c, 'var(--danger-text)', 'توثيقٌ < 70٪ خطر'); assert.match(C[2].sub, /2 من 3 .* 1 بصورة/);
  assert.equal(C[3].v, '10 د'); assert.equal(C[3].c, 'var(--success-text)', '≤ 30 د نجاح'); assert.match(C[3].sub, /4 مهمة مقبولة/);
  for (const c of C) assert.match(c.c, /^var\(--(success|warning|danger)-text\)$/, 'رموزٌ دلاليةٌ وحدها: ' + c.c);
  /* الشهرُ السابق */
  t.tkKpiPrev(); t = P.V();
  assert.equal(t.tkKpiTitle, 'ربيع الأول 1448'); assert.equal(t.tkKpiCards[1].v, '100٪'); assert.equal(t.tkKpiCards[1].c, 'var(--danger-text)');
  assert.equal(t.tkKpiCards[0].v, '0٪'); assert.equal(t.tkKpiCards[0].c, 'var(--danger-text)'); assert.equal(t.tkKpiCards[2].c, 'var(--success-text)');
  /* التالي ⇒ الحالي · ثم التالي ⇒ فارغ */
  t.tkKpiNext(); t = P.V(); assert.equal(t.tkKpiTitle, 'ربيع الآخر 1448 — الشهر الحالي');
  t.tkKpiNext(); t = P.V();
  assert.equal(t.tkKpiTitle, 'جمادى الأولى 1448'); assert.equal(t.tkKpiEmpty, true); assert.equal(t.tkKpiSub, '');
  assert.equal(t.tkKpiCards.map((c) => c.v).join(''), '————'); assert.ok(t.tkKpiCards.every((c) => c.c === 'var(--text-muted)'), 'بلا لون');
  /* لفُّ السنة */
  P.c.setState({ tkY: 1448, tkM: 1 }); t = P.V(); t.tkKpiPrev(); t = P.V(); assert.equal(t.tkKpiTitle, 'ذو الحجة 1447');
  t.tkKpiNext(); t = P.V(); assert.equal(t.tkKpiTitle, 'محرم 1448');
  /* شهرٌ فيه مهامٌ بلا منجزة */
  const P2 = page({ tasks: { '1448-4-3': [row({ st: 'pending' })] } }); t = P2.V();
  assert.equal(t.tkKpiNoDone, true); assert.equal(t.tkKpiEmpty, false); assert.equal(t.tkKpiCards[0].v, '—');
  /* مخزنٌ فاسد أو غائب ⇒ فارغٌ بلا انهيار */
  assert.equal(page({ tasks: '{bad json' }).V().tkKpiEmpty, true);
  assert.equal(page({ tasks: null }).V().tkKpiEmpty, true);
  assert.equal(page({ tasks: '[1,2]' }).V().tkKpiEmpty, true);
  /* الصلاحية: بلا tasks·view لا تبويبَ ولا لوحة */
  const P3 = page({ can: (k) => k !== 'tasks' }); t = P3.V();
  assert.equal(t.ok_tk, false); assert.equal(t.on_tk, false); assert.equal(t.noneOn, true); assert.equal(t.tkKpiCards, undefined, 'لا حسابَ لما لا يُعرض');
  /* مع لوحاتٍ أخرى: الشريطُ ظاهرٌ والأولى تُفتح ثم النقرُ على «مؤشرات المهام» */
  const P4 = page({ others: (pk, sk) => sk === 'readiness' }); t = P4.V();
  assert.equal(t.stripOn, true); assert.equal(t.on_read, true); assert.equal(t.on_tk, false); assert.equal(t.ok_tk, true);
  t.go_tk(); t = P4.V(); assert.equal(t.on_tk, true); assert.equal(t.on_read, false); assert.equal(t.tkKpiCards.length, 4);
});

test('(3) القالب: تبويبُ «مؤشرات المهام» في الشريط وقسمُه بالبطاقات والتنقّل والفراغ — بالرموز الدلالية وحدها داخل القسم', () => {
  const v = fs.readFileSync(VIEW, 'utf8');
  assert.match(v, /\{\{ok_tk\}\}[\s\S]*?\{\{go_tk\}\}[\s\S]*?\{\{lb_tk\}\}">مؤشرات المهام</, 'التبويب');
  const i = v.indexOf('<sc-if value="{{on_tk}}" hint-placeholder-val="{{ false }}">\n  <div'); assert.ok(i > 0, 'قسمُ اللوحة');
  const s = v.slice(i, v.indexOf('</sc-if>', v.indexOf('{{tkKpiCards}}')));
  for (const b of ['{{tkKpiTitle}}', '{{tkKpiSub}}', '{{tkKpiPrev}}', '{{tkKpiNext}}', '{{tkKpiEmpty}}', '{{tkKpiNoDone}}', '{{tkKpiCards}}', '{{c.t}}', '{{c.v}}', '{{c.sub}}', 'color:{{c.c}}']) assert.ok(s.indexOf(b) > 0, 'ربطُ ' + b);
  assert.ok(s.indexOf('لا مهام في هذا الشهر') > 0);
  assert.doesNotMatch(s, /--(fg|bg|bd)-[xa]/, 'لا رموزَ حرفيةً قديمة داخل القسم — الدلاليةُ وحدها');
  assert.doesNotMatch(s, /#[0-9a-fA-F]{3,6}\b/, 'لا hex');
  assert.match(s, /var\(--bg-surface\)[\s\S]*var\(--text-primary\)[\s\S]*var\(--border-subtle\)/, "الرموزُ الدلالية: السطح ثم النص ثم الحدّ");
});
