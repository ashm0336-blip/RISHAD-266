/* الموجة 2 — لوحتا «الاسترشاد» و«المضبوطات» داخل «مؤشرات الإدارة» وسجلّاهما:
   · IRSZ-11: اللوحةُ الفارغة كانت تقول «ابدأ بالتسجيل من تبويب «السجلات»» ولا تبويبَ بهذا الاسم في #/kpis (اللوحةُ مضمَّنةٌ solo="dash")
     — الآن تدلّ على صفحة «نظام الاسترشاد» / «نظام المضبوطات» نفسِها، رابطاً (#/irshad · #/seized) لمن يفتحها ونصّاً لمن لا يفتحها.
   · IRSZ-2: بطاقاتُ مؤشرات المضبوطات الثلاث كانت شبكةً repeat(3,1fr) بحدٍّ أدنى 280px داخل بطاقةٍ قاصّة (overflow:hidden)
     فتُقصّ «محفوظ بالمستودع» على اللوحي العمودي والجوال (58٪ ثم 13٪ مرئياً مع 400 محضر) — الآن تلتفّ (auto-fit · minmax(min(100%,130px),1fr)).
   · IRSZ-7: صندوقُ «نطاق مخصص» لا يلتفّ (flex-shrink:0) فيفيض عن بطاقته على الجوال — الآن يلتفّ والتلميحُ ينكسر.
   · IRSZ-10: سطرُ «اليوم المحدد» ومفتاحُ الألوان يلتفّ كلمةً كلمة على الجوال — الآن يلتفّ السطرُ والعناصرُ لا تنكسر.
   منطقُ الصفحتين الحقيقي في vm (w1_pages.mjs) — بياناتٌ اصطناعية (TEST_ONLY) — وفحصُ القالب للتخطيط (القياسُ الحيّ في تقرير الموجة). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { page } from './w1_pages.mjs';
import { SRC } from './harness.mjs';

/* RISHAD-266 (دفعة الواجهات): «المضبوطات» تحمل IRSZ-2/7/10/11 من جديد — رُفع سقفُ صفحتها بقرارٍ موثّق في perf_budget.json (unifyBatch3Decision) */
const PAGES = { irshad: ['تقارير الاسترشاد', 'نظام الاسترشاد'], seized: ['محاضر المضبوطات', 'نظام المضبوطات'] };
const view = (slug) => fs.readFileSync(path.join(SRC, 'modules', slug, 'view.html'), 'utf8');
/* RISHAD-266: الصفحتان سحابيّتان — اللوحةُ تنتظر قراءةَ الخادم (irOnDash = d && !pending) والـvm بلا خادم؛ يكفي هنا منطقُ الرابط
   (يُحسب قبل القراءة) · وسجلُّ «المتاح» فارغٌ للمضبوطات (_szAvailable) كما يكون قبل أول قراءة */
const dash = (slug, can) => { const P = page(slug, { can }); P.c.props = { solo: 'dash' }; if (slug === 'seized') P.c._szAvailable = { context: undefined, value: { years: [], months: [], total: 0 } }; return P; };

for (const [slug, [what, name]] of Object.entries(PAGES)) {
  test('IRSZ-11 · ' + slug + ': اللوحةُ الفارغة في «مؤشرات الإدارة» رابطُها صفحةُ «' + name + '» لمن يفتحها — لا تبويب «السجلات» غيرِ الموجود', () => {
    const V = dash(slug, () => true).V();
    assert.equal(V.irDashTabOk, true); assert.equal(V.irTabBarShow, false, 'لا شريطَ تبويبات داخل المؤشرات');
    assert.equal(V.irRecLinkOn, true); assert.equal(V.irRecLinkOff, false);
    const v = view(slug);
    assert.doesNotMatch(v, /من تبويب «السجلات»/);
    assert.ok(v.includes('ابدأ بتسجيل ' + what + ' من صفحة <sc-if value="{{irRecLinkOn}}" hint-placeholder-val="{{ true }}"><a href="#/' + slug + '" '), 'رابطٌ إلى الصفحة');
    assert.ok(v.includes('>«' + name + '»</a></sc-if><sc-if value="{{irRecLinkOff}}" hint-placeholder-val="{{ false }}">«' + name + '»</sc-if> لتظهر المؤشرات هنا.</span>'));
  });
  test('IRSZ-11 · ' + slug + ': من لا يفتح الصفحة (بلا «عرض» أو بلا تبويب السجلات) يرى اسمَها نصّاً بلا رابط', () => {
    let V = dash(slug, (p, a) => !(p === slug && a === 'view')).V();
    assert.equal(V.irRecLinkOn, false); assert.equal(V.irRecLinkOff, true);
    const P = dash(slug, () => true); P.KIVO.BassamPerm.subOn = (pg, sub) => !(pg === slug && sub === 'records');
    V = P.V(); assert.equal(V.irRecLinkOn, false); assert.equal(V.irRecLinkOff, true);
  });
  test('IRSZ-7 · IRSZ-10 · ' + slug + ': صندوقُ «نطاق مخصص» يلتفّ ولا يتجاوز بطاقته · وسطرُ «اليوم المحدد» ومفتاحُه يلتفّان بلا انكسار العناصر', () => {
    const v = view(slug);
    assert.ok(v.includes('<div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px 6px;border:1px solid var(--bd-a185151810p4);background:var(--bg-a185151810p07);border-radius:12px;padding:4px 9px;flex-shrink:1;min-width:0;max-width:100%;box-sizing:border-box">'));
    assert.ok(v.includes('white-space:normal;min-width:0">{{irDashRangeHint}}</span>'), 'التلميحُ ينكسر');
    assert.doesNotMatch(v, /padding:4px 9px;flex-shrink:0">\s*<span[^>]*>من<\/span>/);
    const i = v.indexOf('اليوم المحدد:'), row = v.slice(v.lastIndexOf('<div style="display:flex;align-items:center;justify-content:space-between', i), v.indexOf('<div class="bs-daystrip"', i));
    assert.match(row, /^<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px 10px">/);
    assert.match(row, /<div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px 10px">/);
    const labels = [...row.matchAll(/<span style="([^"]*)">([^<]+)<\/span>/g)].filter((m) => m[2].trim());
    assert.ok(labels.length >= 5);
    for (const [, st, t] of labels) assert.match(st, /white-space:nowrap/, '«' + t + '» لا ينكسر');
  });
}

test('IRSZ-2 · المضبوطات: شبكةُ بطاقات اللوحة تلتفّ (auto-fit) ولا تُقصّ — والبطاقةُ ورقمُها ينكمشان (min-width:0)', () => {
  const v = view('seized');
  assert.ok(v.includes('<div style="flex:1 1 300px;min-width:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,130px),1fr));gap:10px;position:relative;z-index:1">'));
  assert.doesNotMatch(v, /flex:1;min-width:280px;display:grid;grid-template-columns:repeat\(3,1fr\)/);
  const i = v.indexOf('repeat(auto-fit,minmax(min(100%,130px),1fr))'), tile = v.slice(i, v.indexOf('</sc-for>', i));
  assert.match(tile, /border-radius:15px;padding:11px 12px;display:flex;flex-direction:column;gap:8px;min-width:0">/);
  assert.match(tile, /text-overflow:ellipsis;min-width:0">\{\{m\.num\}\}/);
});
