/* V7 · 53 تقويم (REVIEW 45) — شريطُ كروت الشهر المشترك (KIVO.BassamCalCard.month داخل .bs-calstrip/.bs-calcell من 385) مرسوماً في متصفحٍ حقيقي
   بالرموز الحقيقية (070/080) وبالكرت الحقيقي: عرضٌ واحدٌ ثابت لكل الكروت (ولو عبر المدى سنتين هجريتين كيونيو) · فجوةٌ 3px ثابتة · لا تداخلَ
   بين صناديق الكروت (والمحدَّدُ لا يغطي جاره) · لا نصَّ يفيض عن كرته · القفلُ في موضعه المعتمد (top:-4px · left:-3px · 11px) — فاتحاً وداكناً.
   كان الكرتُ يتمدّد بقدر المدى الهجري والخلايا تنكمش فتتداخل الكروت (لقطة REVIEW 44). TEST_ONLY. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '../browser/lab_browser.mjs';   /* Playwright المثبَّت للمختبر */
import vm from 'node:vm';
import { ROOT } from './harness.mjs';

const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const html = (theme) => `<!doctype html><html dir="rtl" lang="ar" data-theme="${theme}"><head><meta charset="utf-8"><style>${read('src/styles/070-theme-tokens.css')}\n${read('src/styles/080-theme-dark.css')}
body{margin:0;background:var(--bg-page,#fff);font-family:Cairo,sans-serif}</style></head><body><div id="r" style="width:700px"></div>
<script>window.KIVO={};</script><script>${read('src/core/010-react.js')}</script><script>${read('src/core/020-react-dom.js')}</script>
<script>${read('src/i18n/380-hijri-fallback.js')}</script><script>${read('src/i18n/385-calendar.js')}</script></body></html>`;

for (const theme of ['light', 'dark']) {
  test('شريطُ الشهر (' + theme + '): عرضٌ واحد · فجوة 3px · لا تداخل · لا قصّ · القفلُ في موضعه · المحدَّدُ يتوسّط', async () => {
    const b = await chromium.launch();
    try {
      const p = await (await b.newContext({ viewport: { width: 700, height: 200 }, deviceScaleFactor: 2 })).newPage();
      await p.setContent(html(theme));
      const R = await p.evaluate(() => {
        const C = KIVO.BassamCal, h = React.createElement, T = '2026-11-20';
        const cards = []; for (let m = 1; m <= 12; m++) { const ym = '2026-' + (m < 10 ? '0' : '') + m;
          cards.push(h('div', { className: 'bs-calcell', key: ym }, KIVO.BassamCalCard.month({ ym, T, closed: m < 11, why: m < 10 ? 'past' : 'ap', sel: m === 11 }))); }
        ReactDOM.render(h('div', { className: 'bs-calstrip', tabIndex: 0 }, cards), document.getElementById('r'));
        const strip = document.querySelector('.bs-calstrip'), cs = getComputedStyle(strip);
        const box = [...document.querySelectorAll('[data-cal-kind="month"]')].map((c) => { const r = c.getBoundingClientRect(), lk = c.querySelector('[data-cal-lock]');
          return { k: c.getAttribute('data-cal-key'), l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height, sel: c.getAttribute('data-cal-sel') === '1', z: getComputedStyle(c).zIndex,
            lines: [...c.querySelectorAll('[data-cal-line]')].map((x) => { const q = x.getBoundingClientRect(); return { t: x.textContent, l: q.left, r: q.right, t0: q.top, b: q.bottom, over: x.scrollWidth > x.clientWidth + 0.5 }; }),
            lock: lk ? { top: lk.style.top, left: lk.style.left, w: lk.getBoundingClientRect().width, h: lk.getBoundingClientRect().height } : null }; });
        const s = strip.getBoundingClientRect(), sel = box.find((x) => x.sel);
        return { box, gap: cs.columnGap, snap: cs.scrollSnapType, ox: cs.overflowX, scroll: strip.scrollWidth > strip.clientWidth,
          selOff: sel ? Math.abs((sel.l + sel.r) / 2 - (s.left + s.width / 2)) : null, maxScroll: strip.scrollWidth - strip.clientWidth, sl: strip.scrollLeft };
      });
      const B = R.box;
      assert.equal(B.length, 12);
      assert.equal(new Set(B.map((x) => x.w.toFixed(2))).size, 1, 'عرضٌ واحد: ' + B.map((x) => x.k + ':' + x.w.toFixed(1)).join(' '));
      assert.equal(new Set(B.map((x) => x.h.toFixed(2))).size, 1); assert.equal(Math.round(B[0].h), 36, 'ارتفاعُ كرت اليوم 36');
      assert.equal(R.gap, '3px'); assert.match(R.snap, /^x/); assert.equal(R.ox, 'auto');
      const S = B.slice().sort((a, b) => a.l - b.l);
      for (let i = 1; i < S.length; i++) {
        assert.ok(S[i].l >= S[i - 1].r - 0.01, 'لا تداخل: ' + S[i - 1].k + ' / ' + S[i].k);
        assert.ok(Math.abs(S[i].l - S[i - 1].r - 3) < 0.05, 'فجوة 3px بين ' + S[i - 1].k + ' و' + S[i].k + ': ' + (S[i].l - S[i - 1].r));
      }
      for (const x of B) for (const L of x.lines) assert.ok(!L.over && L.l >= x.l && L.r <= x.r && L.t0 >= x.t && L.b <= x.b, 'لا قصّ: ' + x.k + ' «' + L.t + '»');
      const jun = B.find((x) => x.k === '2026-06');
      assert.equal(jun.lines.length, 3, 'يونيو يعبر سنةً هجرية: السطرُ الثالث'); assert.equal(jun.lines[1].t, 'ذو الحجة – محرم'); assert.match(jun.lines[2].t.replace(/[^\d–٠-٩ ]/g, ''), /–/);
      assert.equal(B.find((x) => x.k === '2026-11').lines.map((l) => l.t).join('|'), 'نوفمبر|جمادى الأولى – الآخرة', 'الكلمةُ المكرّرة تُحذف');
      assert.equal(B.find((x) => x.k === '2026-11').lines.length, 2, 'بلا عبورٍ لسنة: سطران');
      for (const x of B.filter((y) => y.lock)) { assert.equal(x.lock.top, '-4px'); assert.equal(x.lock.left, '-3px'); assert.equal(Math.round(x.lock.w), 11); assert.equal(Math.round(x.lock.h), 11); }
      assert.equal(B.filter((x) => x.lock).length, 10, 'القفلُ للمغلق وحده');
      const sel = B.find((x) => x.sel); assert.equal(sel.z, '4', 'zIndex المحدَّد كالمرجع');
      assert.ok(R.scroll, 'الشريطُ يتمرّر أفقياً في 700px');
      assert.ok(R.selOff < 1 || Math.abs(R.sl) >= R.maxScroll - 1, 'المحدَّدُ يتوسّط (أو الشريطُ عند حدّه): ' + JSON.stringify([R.selOff, R.sl, R.maxScroll]));
    } finally { await b.close(); }
  });
}

/* REVIEW 47: الشهرُ الجاري بحالة td المعتمدة (حلقةٌ ذهبية 2px كيوم «اليوم») حين لا يكون محدَّداً — بعرض 84 ولا تداخل؛ والمحدَّدُ يغلبها */
for (const theme of ['light', 'dark']) {
  test('الشهرُ الجاري (' + theme + '): td بالحلقة الذهبية 2px وهو غيرُ محدَّد · عرضُه 84 · لا تداخل · والمحدَّدُ يغلب الحلقة', async () => {
    const b = await chromium.launch();
    try {
      const p = await (await b.newContext({ viewport: { width: 1200, height: 200 }, deviceScaleFactor: 2 })).newPage();
      await p.setContent(html(theme));
      const R = await p.evaluate(() => {
        const h = React.createElement, T = '2026-11-20', run = (selM) => { const cards = []; for (let m = 1; m <= 12; m++) { const ym = '2026-' + (m < 10 ? '0' : '') + m;
          cards.push(h('div', { className: 'bs-calcell', key: ym }, KIVO.BassamCalCard.month({ ym, T, closed: m < 10, why: 'past', sel: m === selM }))); }
          const host = document.createElement('div'); host.style.width = '1200px'; document.body.appendChild(host);   /* حاويةٌ جديدة لكل رسم — لا انتقالَ (transition) من رسمٍ سابق */
          ReactDOM.render(h('div', { className: 'bs-calstrip' }, cards), host);
          const gold = getComputedStyle(document.documentElement).getPropertyValue('--cal-gold').trim();
          const B = [...host.querySelectorAll('[data-cal-kind="month"]')].map((c) => { const r = c.getBoundingClientRect(); return { k: c.getAttribute('data-cal-key'), td: c.getAttribute('data-cal-td'), sh: getComputedStyle(c).boxShadow, l: r.left, r: r.right, w: r.width }; });
          return { B, gold }; };
        const probe = document.createElement('i'); document.body.appendChild(probe);
        const a = run(10); document.body.lastChild.remove(); const b = run(11); probe.style.color = 'var(--cal-gold)'; const goldRgb = getComputedStyle(probe).color;
        return { a, b, goldRgb };
      });
      const nov = R.a.B.find((x) => x.k === '2026-11');
      assert.equal(nov.td, '1', 'الشهرُ الجاري td'); assert.equal(R.a.B.filter((x) => x.td === '1').length, 1, 'شهرٌ واحدٌ جارٍ');
      assert.ok(nov.sh.indexOf(R.goldRgb + ' 0px 0px 0px 2px') === 0, 'الحلقةُ الذهبية 2px أولاً كـ td: ' + nov.sh + ' / ' + R.goldRgb);
      assert.equal(Math.round(nov.w), 84);
      const S = R.a.B.slice().sort((x, y) => x.l - y.l); for (let i = 1; i < S.length; i++) assert.ok(S[i].l - S[i - 1].r > 2.9, 'لا تداخل: ' + S[i - 1].k + '/' + S[i].k);
      const nov2 = R.b.B.find((x) => x.k === '2026-11');
      assert.equal(nov2.td, '1'); assert.ok(nov2.sh.indexOf('0px 0px 0px 2px') === -1 && /0px 4px 12px/.test(nov2.sh), 'المحدَّدُ يغلب الحلقة: ' + nov2.sh);
    } finally { await b.close(); }
  });
}

/* REVIEW 47 (2): عددُ الأيام المسجّلة في كرت شهر الإحصائيات سطرٌ في التلميح عبر hint — «N/M يوماً مسجّلاً» */
test('الإحصائيات: «N/M يوماً مسجّلاً» سطرٌ في تلميح كرت الشهر عبر hint', () => {
  const src = read('src/systems/dstats/client/logic.js');
  assert.match(src, /cnt: has \? has\+"\/"\+mnd\+" يوماً مسجّلاً" : ""/);
  assert.match(src, /hint: x\.cnt \? x\.tip\+"\\n"\+x\.cnt : x\.tip/);
  const ctx = vm.createContext({ KIVO: {}, Intl, Date, Math, JSON, Object, Array, String, Number, RegExp, Map, Set, Error }); ctx.window = ctx;
  for (const f of ['src/i18n/380-hijri-fallback.js', 'src/i18n/385-calendar.js']) vm.runInContext(read(f), ctx);
  const M = ctx.KIVO.BassamCalCard.model('month', { ym: '2026-11', T: '2026-11-20', hint: 'لا أرقام لهذا الشهر بعد\n1/30 يوماً مسجّلاً' });
  assert.equal(M.title.split('\n').slice(-2).join('|'), 'لا أرقام لهذا الشهر بعد|1/30 يوماً مسجّلاً', 'السطرُ في التلميح بعد حالة الكرت');
});
