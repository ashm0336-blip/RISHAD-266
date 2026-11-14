/* الموجة 2 · التباين (AA) — من الرموز نفسِها (tokens.json) ومن منطق الوحدات الحقيقي داخل node:vm (بياناتٌ اصطناعية TEST_ONLY):
   · ES-4: الرمزُ الحرفيّ للنيليّ fg-x4f46e5 كان اسماً لـ--info-text-inv (نصٌّ لسطحٍ داكن #8FC5EA) فيُقرأ رقمُ «حالة الحسابات» على الأبيض
     بتباين 1.6–1.85:1؛ وملؤه bg-x4f46e5 كان --info نفسَه الذي يلوّن الوردية الثانية (bg-x0891b2) فتتطابق نقطتا الدليل ولا تطابق
     الثالثةُ حلقتَها (#4f46e5). الآن رمزان دلاليّان للنيلي (--indigo · --indigo-text) وحلقةُ «توزيع الورديات» تمرّ بالرمز نفسِه.
   · KD-09 · IRSZ-5: الأبيضُ على --warning-strong يصير 1.8:1 في الداكن (العنبرُ فاتحٌ هناك) — رقاقاتُ «التغطية» في المؤشرات
     و«أُتلف / صودر» في المضبوطات. الآن --warning-on-strong (أبيض في الفاتح · داكن في الداكن) والألوانُ الأخرى بالأبيض كما كانت. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { ROOT, SRC, moduleLogic, moduleFile } from './harness.mjs';

const rd = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');
const T = JSON.parse(rd('styles/tokens/tokens.json'));
const P = Object.fromEntries(T.primitives.map((x) => [x.name, x.value])), L = Object.fromEntries(T.semantic.concat(T.literal).map((x) => [x.name, x.value])), DK = Object.fromEntries(T.dark.map((x) => [x.name, x.value]));
/* قيمةُ رمزٍ محلولة: الداكنُ يعيد تعريفَ الدلالية وحدها، والحرفيةُ أسماءٌ مستعارة عليها */
function tok(n, dark) { const v = (dark && DK[n]) || L[n]; const m = /^var\(--([a-z0-9-]+)\)$/.exec(v || ''); if (!m) return v; return P[m[1]] || tok(m[1], dark); }
const rgb = (v) => { const h = v.slice(1); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const cr = (a, b) => { const x = lum(rgb(a)), y = lum(rgb(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

test('ES-4 · نصُّ النيلي (fg-x4f46e5) ≥ 4.5:1 على الأبيض والكريمي في الفاتح (كان 1.85:1) و≥ 7:1 على البطاقة في الداكن', () => {
  assert.equal(L['fg-x4f46e5'], 'var(--indigo-text)');
  assert.ok(cr(tok('fg-x4f46e5', false), tok('bg-surface', false)) >= 4.5, 'فاتح/أبيض ' + cr(tok('fg-x4f46e5', false), tok('bg-surface', false)).toFixed(2));
  assert.ok(cr(tok('fg-x4f46e5', false), tok('bg-app', false)) >= 4.5, 'فاتح/كريمي');
  assert.ok(cr(tok('fg-x4f46e5', true), tok('bg-card', true)) >= 7, 'داكن ' + cr(tok('fg-x4f46e5', true), tok('bg-card', true)).toFixed(2));
  /* المرجع: القيمةُ القديمة (--info-text-inv) كانت دون الحدّ في الفاتح */
  assert.ok(cr(tok('info-text-inv', false), tok('bg-surface', false)) < 2, 'المرجع: info-text-inv على الأبيض');
});

test('ES-4 · ملءُ النيلي (bg-x4f46e5) رمزٌ بنفسه: يختلف عن ملء الوردية الثانية (bg-x0891b2) في السمتين، ويساوي حلقتَه #4F46E5 في الفاتح', () => {
  assert.equal(L['bg-x4f46e5'], 'var(--indigo)');
  for (const d of [false, true]) assert.notEqual(tok('bg-x4f46e5', d).toLowerCase(), tok('bg-x0891b2', d).toLowerCase(), d ? 'داكن' : 'فاتح');
  assert.equal(tok('bg-x4f46e5', false).toLowerCase(), '#4f46e5');
  /* الأبيضُ على ملء النيلي (زرُّ «نعم، حوّل» في التقرير اليومي) لا يسوء: 6.29 فاتحاً (كان 2.41) وأعلى من القديم داكناً */
  assert.ok(cr('#FFFFFF', tok('bg-x4f46e5', false)) >= 4.5);
  assert.ok(cr('#FFFFFF', tok('bg-x4f46e5', true)) > cr('#FFFFFF', tok('info', true)));
  /* والنقطةُ مرئيةٌ على البطاقة الداكنة (رسمٌ لا نص: ≥ 3:1) */
  assert.ok(cr(tok('bg-x4f46e5', true), tok('bg-card', true)) >= 3);
});

test('ES-4 (بقيّة) · زرّا التحويل في التقرير اليومي («نعم، حوّل» و«موافق»): ملءُ النيلي ونصُّه --indigo-on ≥ 4.5:1 في السمتين — كان تدرّجاً ينتهي بالسماويّ (bg-x6366f1 = --info) فالأبيضُ 2.41:1', () => {
  for (const d of [false, true]) assert.ok(cr(tok('indigo-on', d), tok('bg-x4f46e5', d)) >= 4.5, (d ? 'داكن ' : 'فاتح ') + cr(tok('indigo-on', d), tok('bg-x4f46e5', d)).toFixed(2));
  assert.equal(tok('indigo-on', false).toUpperCase(), '#FFFFFF', 'الفاتحُ كما كان: أبيض');
  /* المرجع: طرفُ التدرّج القديم وحده دون الحدّ في السمتين، والأبيضُ على النيلي الداكن كذلك */
  assert.ok(cr('#FFFFFF', tok('bg-x6366f1', false)) < 3 && cr('#FFFFFF', tok('bg-x6366f1', true)) < 3 && cr('#FFFFFF', tok('bg-x4f46e5', true)) < 3.5);
  const v = rd('modules/dreport/view.html'), s = moduleLogic('dreport');
  assert.match(v, /font-weight:600;background:var\(--bg-x4f46e5\);color:var\(--indigo-on\);border:0;cursor:pointer;font-family:'Cairo',sans-serif">نعم، حوّل<\/button>/);
  assert.match(s, /"cursor:pointer;background:var\(--bg-x4f46e5\);color:var\(--indigo-on\)"\n\s+: "cursor:default;background:var\(--bg-xcbd5e1\)"/);
  assert.doesNotMatch(v + s, /linear-gradient\(135deg,var\(--bg-x4f46e5\),var\(--bg-x6366f1\)\)/);
});

test('ES-4 · ملفّا السمة المولَّدان يحملان الرموز الجديدة (070 فاتح · 080 داكن) والقيمُ المحسوبة في الملفّ السابق (resolved.json) يحرسها npm run check (tokens-verify)', () => {
  const l = rd('styles/070-theme-tokens.css'), d = rd('styles/080-theme-dark.css');
  for (const s of ['--indigo:var(--p-4f46e5);', '--indigo-text:var(--p-4338ca);', '--warning-on-strong:var(--p-ffffff);', '--fg-x4f46e5:var(--indigo-text);', '--bg-x4f46e5:var(--indigo);']) assert.ok(l.includes(s), s);
  for (const s of ['--indigo:var(--p-818cf8);', '--indigo-text:var(--p-c7d2fe);', '--warning-on-strong:var(--p-1b1710);', '--indigo-on:var(--p-1b1710);']) assert.ok(d.includes(s), s);
  assert.ok(l.includes('--indigo-on:var(--p-ffffff);'));
  /* RISHAD-266: لا resolved.json هنا — القيمُ المحسوبة من tokens.json نفسِه، وتطابقُ 070/080 مع التوليد يحرسه tools/tokens.py check في البناء */
  assert.deepEqual([tok('fg-x4f46e5', false), tok('bg-x4f46e5', false), tok('fg-x4f46e5', true), tok('bg-x4f46e5', true)].map((x) => String(x).toLowerCase()), ['#4338ca', '#4f46e5', '#c7d2fe', '#818cf8']);
  for (const k of ['indigo', 'indigo-on', 'indigo-text', 'warning-on-strong']) assert.ok(tok(k, false) && tok(k, true), k);
});

test('ES-4 · حلقةُ «توزيع الورديات» تمرّ بمحوِّل الرموز (دورُ الخلفية) فتطابق نقطةَ الدليل في السمتين — سمةُ stroke لا يحوّلها المحوِّل', () => {
  const s = moduleLogic('staff');
  assert.match(s, /color: KIVO\.__bsTokVal \? KIVO\.__bsTokVal\("background", t\.color\) : t\.color,\n\s+dash: Math\.round/);
  /* نقطةُ الدليل نفسُها background:{{r.color}} — فالرمزُ واحد */
  assert.match(rd('modules/staff/view.html'), /<i style="width:8px;height:8px;border-radius:2px;flex-shrink:0;background:\{\{r\.color\}\};/);
});

test('KD-09 · IRSZ-5 · --warning-on-strong على --warning-strong ≥ 4.5:1 في السمتين (الأبيضُ كان 1.8:1 داكناً) والفاتحُ كما كان (أبيض 6.99:1)', () => {
  assert.equal(tok('warning-on-strong', false).toUpperCase(), '#FFFFFF');
  for (const d of [false, true]) assert.ok(cr(tok('warning-on-strong', d), tok('warning-strong', d)) >= 4.5, (d ? 'داكن ' : 'فاتح ') + cr(tok('warning-on-strong', d), tok('warning-strong', d)).toFixed(2));
  assert.ok(cr('#FFFFFF', tok('warning-strong', true)) < 2, 'المرجع: الأبيضُ على العنبر الداكن');
});

/* ── منطقُ الوحدات في vm ── */
const SERVICES = ['src/services/390-kpi-primitives.js', 'src/services/400-shift-need.js', 'src/services/440-count.js', 'src/services/410-gate-units.js', 'src/i18n/380-hijri-fallback.js',
  'src/services/420-round-factory.js', 'src/services/490-emp-key.js', 'src/services/290-activity-log.js', 'src/components/560-canvas-input.js', 'src/components/565-page-kit.js'];
/* خريطةُ وقت التشغيل الحقيقية (110 · __BS_TOK) ومحوِّلٌ بقدرها: لونُ الخاصيّة ← var(--<حرفي>) كما يفعل __bsTokVal */
const TOK = (() => { const s = fs.readFileSync(path.join(SRC, 'core/110-theme-prepaint.js'), 'utf8'); return JSON.parse(/KIVO\.__BS_TOK = (\{.*?\});\n/s.exec(s)[1]); })();
function page(slug) {
  const store = new Map(), KIVO = {};
  const ctx = { KIVO, console, setTimeout: () => 0, clearTimeout: () => 0, setInterval: () => 0, clearInterval: () => 0, requestAnimationFrame: () => 0, cancelAnimationFrame() {}, performance: { now: () => 1 },
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    document: { hidden: false, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, addEventListener() {}, removeEventListener() {} },
    navigator: { userAgent: 'node' }, addEventListener() {}, removeEventListener() {}, __BS_BOOT: { srv: 0 }, React: { createElement: (t, p, ...ch) => ({ t, p, ch }), Fragment: 'F' } };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  class DCLogic { constructor() { this.state = {}; } setState(p, cb) { this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p); if (cb) cb(); } }
  ctx.DCLogic = DCLogic;
  for (const f of SERVICES) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  KIVO.__bsTokVal = (prop, v) => { const id = (TOK.bg || {})[String(v).toLowerCase()]; return id ? 'var(--' + id + ')' : v; };
  KIVO.BassamFind = { dig: (v) => String(v == null ? '' : v), norm: (v) => String(v == null ? '' : v), filter: (q, list) => list, match: () => true };
  KIVO.__bsMixOn = () => false;
  KIVO.BassamPerm = { can: () => true, on: () => true, lensOn: () => true };
  KIVO.BassamAuth = { user: () => ({ id: 'TEST_ONLY_dm', role: 'staff', mgr: true, deptId: 'tst_d1' }), isSuper: () => false, display: () => ({ name: 'TEST_ONLY' }), users: () => [] };
  KIVO.BassamDepts = { active: () => 'tst_d1', activeName: () => 'TEST_ONLY', list: () => [] };
  const B0 = KIVO.BassamPageKit.base; KIVO.BassamPageKit.base = (B, a) => class extends B0(B, a) { bsOn() { return true; } bsLensOn() { return true; } bsToast() {} };
  vm.runInContext(moduleLogic(slug) + '\n;globalThis.__C = Component;', ctx, { filename: slug + '/logic.js' });
  return new ctx.__C();
}
/* الرمزُ الدلاليّ الذي ينتهي إليه var(--bg-x…) — للتحقق من أن العنبرَ وحده يأخذ النصَّ المتبدّل */
const sem = (v) => { let m = /^var\(--([a-z0-9-]+)\)$/.exec(v || ''), n = m && m[1]; while (n && L[n] && /^var\(--/.test(L[n]) && !(n in DK) && !T.semantic.some((x) => x.name === n)) n = /^var\(--([a-z0-9-]+)\)$/.exec(L[n])[1]; return n; };

/* RISHAD-266: KD-09 («الإحصائيات اليومية» و«مؤشرات المصليات» في منطق المتابعة اليومية) لا يُنقل هنا — dstats/daily خارج هذا النقل (عملُ المالك المحلّي) */

/* RISHAD-266 (دفعة الواجهات): IRSZ-5 مُعاد — رُفع سقفُ «المضبوطات» بقرارٍ موثّق (perf_budget.json · unifyBatch3Decision) */
test('IRSZ-5 · «المضبوطات»: نصُّ رقاقة الإجراء — «أُتلف / صودر» (عنبر) بـ--warning-on-strong · «أُحيل للجهة الأمنية» و«محفوظ بالمستودع» بالأبيض', () => {
  const c = page('seized');
  /* RISHAD-266: فهرسُ الإجراءات من قراءة الخادم — هنا الإجراءاتُ الافتراضية نفسُها (019k-seized-defaults) */
  c.loadActs = () => [{ k: 'des', name: 'أُتلف / صودر', color: '#b45309' }, { k: 'sec', name: 'أُحيل للجهة الأمنية', color: '#dc2626' }, { k: 'sto', name: 'محفوظ بالمستودع', color: '#475569' }];
  assert.equal(c.actFg('des'), 'var(--warning-on-strong)');
  assert.equal(c.actFg('sec'), 'var(--fg-xffffff)');
  assert.equal(c.actFg('sto'), 'var(--fg-xffffff)');
  assert.equal(c.actFg('TEST_ONLY_unknown'), 'var(--fg-xffffff)', 'إجراءٌ مجهول (رماديّ محايد) بالأبيض');
  const src = moduleLogic('seized');
  assert.match(src, /actFg\(t\) \{\n\s+const v = KIVO\.__bsTokVal \? KIVO\.__bsTokVal\("background", this\.actColor\(t\)\) : "";\n\s+return \/\^var\\\(--bg-x\(a67c1e\|b45309\|c9702a\|d97706\|f59e0b\|fbbf24\)\\\)\$\/\.test\(v\) \? "var\(--warning-on-strong\)" : "var\(--fg-xffffff\)";/);
  /* كلُّ لونٍ حرفيٍّ تختاره الدالة للعنبر اسمٌ لـ--warning-strong فعلاً (لا قائمةً تنحرف عن الرموز) */
  for (const h of ['a67c1e', 'b45309', 'c9702a', 'd97706', 'f59e0b', 'fbbf24']) assert.equal(sem('var(--bg-x' + h + ')'), 'warning-strong', h);
  assert.match(rd('systems/seized/client/view.html'), /background:\{\{lg\.actColor\}\};color:\{\{lg\.actFg\}\}/);
  assert.match(src, /actColor: this\.actColor\(t\.act\),\n\s+actFg: this\.actFg\(t\.act\),/);
});

test('AUX-13 · عدّادُ النتائج «/ المجموع» بلون --text-muted بلا شفافية (كان 60٪ من لونٍ رماديّ ⇐ 2.47:1)', () => {
  let n = 0;
  for (const m of ['award', 'dreport', 'employees', 'irshad', 'seized', 'staff', 'tasks']) {
    const v = rd(path.relative(SRC, moduleFile(m, 'view.html')));
    assert.doesNotMatch(v, /<span style="opacity:\.6"> \//, m);
    n += (v.match(/<span style="color:var\(--text-muted\)"> \//g) || []).length;
  }
  assert.equal(n, 10);
  assert.ok(cr(tok('text-muted', false), tok('bg-surface', false)) >= 4.5 && cr(tok('text-muted', true), tok('bg-surface', true)) >= 4.5);
});
