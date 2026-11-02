/* الموجة 2 — «الجدول الشهري» و«موظفو الإدارة»:
   · ES-5: صفُّ يوم الراحة/الإجازة يُلوَّن على <tr> والخلايا المثبّتة (تحديد · م · الاسم) معتمةٌ بلون السطح فيبقى ثلثُ الصفّ أبيض (أو داكناً)؛
     واللونُ نفسُه صارخ (bg-a2552512350p4 ⇐ rgba(187,90,28,.4)). الآن الصفُّ يمرّر لونَه في --bs-row-tint فتُرسم طبقتُه فوق سطح الخلية المثبّتة،
     واللونان دلاليّان هادئان (--warning-soft للراحة · --info-soft للإجازة) — والتقرير اليومي بالنمط نفسه.
   · ES-11: في الداكن «لكل صفحة» (‎--text-faint) فوق شريط الترقيم (أبيضُ 20٪ فوق السطح ⇐ رماديٌّ متوسط) 2.86:1 · وشاراتُ أيام الراحة 2.88:1
     — الآن الشريطُ بلون السطح (لا تغييرَ في الفاتح: الأبيضُ 20٪ فوق الأبيض أبيض) والتلوينُ الهادئ يرفع الشارات.
   · ES-7: ترويسةُ «سند تسليم عهدة جديد» صفٌّ لا يلتفّ فينضغط العنوانُ كلمةً في كل سطر على الجوال — الآن تلتفّ والخطواتُ في سطرها.
   فحصُ المصدر والرموز (التباينُ محسوبٌ من tokens.json) — القياسُ الحيّ بالبكسل في تقرير الموجة. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SRC } from './harness.mjs';

const rd = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');
/* قيمةُ رمزٍ محلولة (فاتح/داكن) من tokens.json */
const T = JSON.parse(rd('styles/tokens/tokens.json'));
const P = Object.fromEntries(T.primitives.map((x) => [x.name, x.value])), L = Object.fromEntries(T.semantic.concat(T.literal).map((x) => [x.name, x.value])), DK = Object.fromEntries(T.dark.map((x) => [x.name, x.value]));
function tok(n, dark) { const v = (dark && DK[n]) || L[n]; const m = /^var\(--([a-z0-9-]+)\)$/.exec(v || ''); if (!m) return v; return P[m[1]] || tok(m[1], dark); }
const rgba = (v) => { if (v[0] === '#') { const h = v.slice(1); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(1); } const a = v.match(/[\d.]+/g).map(Number); return [a[0], a[1], a[2], a.length > 3 ? a[3] : 1]; };
const over = (top, base) => { const [r, g, b, a] = rgba(top), B = rgba(base); return [r * a + B[0] * (1 - a), g * a + B[1] * (1 - a), b * a + B[2] * (1 - a), 1]; };
const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

test('ES-5 · الجدول الشهري والتقرير اليومي: لونُ صفّ الراحة/الإجازة يُمرَّر في --bs-row-tint (رمزان دلاليّان هادئان) لا لونٌ صارخ على <tr> وحده', () => {
  for (const [f, v] of [['modules/staff/logic.js', 'b'], ['modules/dreport/logic.js', 'O']]) {
    const s = rd(f);
    assert.ok(s.includes('rowBg:\n            (' + v + ' ? "--bs-row-tint:var(--info-soft);background:var(--info-soft)" : e.onRest ? "--bs-row-tint:var(--warning-soft);background:var(--warning-soft)" : "") +'), f);
    assert.doesNotMatch(s, /background:var\(--bg-a2552512350p4\)"|background:var\(--bg-a2362542550p5\)"/, f + ': لا اللونان الصارخان في الصفّ');
  }
  for (const v of ['modules/staff/view.html', 'modules/dreport/view.html']) assert.match(rd(v), /<tr style="[^"]*;\{\{e\.rowBg\}\}"/);
  /* وقتُ التشغيل يمرّر الخصائصَ المخصّصة (--x) كما هي إلى كائن النمط */
  assert.match(rd('core/050-dc-runtime.js'), /if \(prop\.startsWith\("--"\)\) \{ o\[prop\] = decl\.slice\(i \+ 1\)\.trim\(\); continue; \}/);
});

test('ES-5 · الخليةُ المثبّتة ترسم طبقةَ لون الصفّ فوق سطحها المعتم (بلا لونٍ للصفّ: شفافٌ فوق السطح كما كان)', () => {
  const css = rd('styles/170-freeze.css');
  assert.match(css, /\.bs-rtable\.bs-fitcols td\.bs-fz\{position:sticky;z-index:3;background:linear-gradient\(var\(--bs-row-tint,transparent\),var\(--bs-row-tint,transparent\)\),var\(--bs-surface,var\(--bg-surface\)\)\}/);
});

test('ES-5 · ES-11 · التباين (من الرموز): نصُّ الشارة على صفّ الراحة ≥ 4.5:1 فاتحاً وداكناً — كان اللونُ الصارخ يُنزلها إلى ≈3:1', () => {
  for (const dark of [false, true]) {
    const surf = tok('bg-surface', dark), row = over(tok('warning-soft', dark), surf), old = over(tok('tone-orange-40-a40', dark), surf);
    const fg = rgba(tok('warning-text', dark));
    assert.ok(cr(fg, row) >= 4.5, (dark ? 'داكن' : 'فاتح') + ' ' + cr(fg, row).toFixed(2));
    assert.ok(cr(fg, old) < 4.5, 'المرجع: اللونُ القديم كان دون 4.5 (' + cr(fg, old).toFixed(2) + ')');
  }
});

/* الموجة 2 (دمج): شريطُ ترقيم «التميّز» يحمل bs-wrap أيضاً (AUX-04 — يلتفّ ولا تخرج «التالي» و«الأخيرة» عن الشاشة) */
test('ES-11 · شريطُ الترقيم بلون السطح في كل الوحدات: «لكل صفحة» ≥ 4.5:1 داكناً (كان 2.86) ولا تغييرَ في الفاتح', () => {
  /* RISHAD-266: «الإحصائيات اليومية» (dstats) خارج هذا النقل — عملُ المالك المحلّي عليها */
  const mods = ['award', 'dreport', 'employees', 'irshad', 'plan', 'seized', 'staff', 'tasks'];
  let n = 0;
  for (const m of mods) {
    const v = rd('modules/' + m + '/view.html');
    assert.doesNotMatch(v, /background:var\(--bg-a2452452450p2\)/, m);
    for (const x of v.matchAll(/<div class="bs-hbar(?: bs-wrap)?" style="([^"]*)">\s*<span[^>]*>عرض /g)) { assert.match(x[1], /;background:var\(--bg-surface\);font-size:12px$/, m); n++; }
  }
  assert.equal(n, 12, 'اثنا عشرَ شريطَ ترقيم');
  const faint = (d) => rgba(tok('text-faint', d));
  assert.ok(cr(faint(true), rgba(tok('bg-surface', true))) >= 4.5, 'داكن');
  assert.ok(cr(faint(true), over(tok('tone-neutral-100-a20', true), tok('bg-surface', true))) < 3, 'المرجع: الأبيضُ 20٪ في الداكن');
  assert.deepEqual(over(tok('tone-neutral-100-a20', false), tok('bg-surface', false)).map(Math.round), rgba(tok('bg-surface', false)).map(Math.round), 'فاتحاً: الشريطُ أبيضُ كما كان');
});

test('ES-7 · ترويسةُ معالج «سند تسليم عهدة جديد» تلتفّ: العنوانُ بأساس 150px والخطواتُ لا تنكسر وتنزل إلى سطرها في الوسط تحت 520px (قاعدةُ رأس الصفحة)', () => {
  const v = rd('modules/employees/view.html');
  const i = v.indexOf('>سند تسليم عهدة جديد</div>'), hd = v.slice(v.lastIndexOf('<div class="es-wzhd"', i), v.indexOf('</sc-for>', i));
  assert.match(hd, /^<div class="es-wzhd" style="display:flex;align-items:center;flex-wrap:wrap;gap:10px 11px;/);
  assert.match(hd, /<div style="flex:1 1 150px;min-width:0">\s*<div style="font-size:15px;font-weight:600;color:var\(--fg-x141414\)">سند تسليم عهدة جديد<\/div>/);
  assert.match(hd, /<div class="es-wzst" style="display:flex;align-items:center;gap:7px">/);
  assert.match(hd, /font-size:10\.5px;font-weight:600;white-space:nowrap;color:\{\{st\.col\}\}/);
  /* القاعدةُ في رأس الصفحة (helmet) — لا في <style> «الجاهزية» داخل sc-if الذي لا يكون في الصفحة والمعالجُ مفتوح (جولةُ الإصلاح) */
  const h = rd('modules/employees/helmet.css'), RX = /@media \(max-width:520px\)\{\.es-wzhd \.es-wzst\{flex-basis:100%;justify-content:center\}\}/;
  assert.match(h, RX);
  assert.doesNotMatch(v, /\.es-wzst\{/, 'لا نسخةَ في القالب');
  assert.ok(h.indexOf('</style>') > h.search(RX), 'داخل <style> الرأس');
});
