/* V7 · 53 تقويم — كرتُ اليوم/الشهر/السنة المشترك (KIVO.BassamCalCard، src/i18n/385-calendar.js) في متصفحٍ حقيقي — iPhone 13 وسطح المكتب. TEST_ONLY.
   الصفحةُ تُبنى من ملفات المصدر نفسِها (رموزُ الألوان 070 · React 010/020 · KIVO 005 · التقويم 380/385)، فلا خادمَ ولا بيانات.
   ① المقاسُ لا يتغيّر: كلُّ كرت يومٍ جديد بمقاس كرت شريط المتابعة اليومية الحالي (نصُّ نمطه منسوخٌ من الصفحة) في الشريط نفسِه، والأسطرُ الثلاثة
      (الحرف · الميلادي · الهجري) داخل الكرت وبهذا الترتيب من الأعلى · كرتا الشهر والسنة بمقاسهما ونصّاهما داخلهما.
   ② حالتان فقط: «مغلق» بلونٍ واحد (--bg-x64748b) وقفل، و«مفتوح» بلون الكرت بلا قفل — ولا لونَ ثالث لخلفيات الكروت.
   ③ التلميح: السببُ الإداري (اعتُمد · أُغلق تلقائياً · مضى) في title وaria-label وحدهما، لا في نصّ الكرت، ومعه التاريخان كاملين؛ والمرورُ لا يغيّر المقاس. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { chromium } from './lab_browser.mjs';

const pwRoot = process.env.KIVO_PLAYWRIGHT || (execSync('npm root -g').toString().trim() + '/');
const { devices } = createRequire(pwRoot)('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/<\/script/gi, '<\\/script');
/* نمطُ كرت اليوم في شريط المتابعة اليومية اليوم (daily/client/logic.js.tpl · days[].style) — المرجعُ الذي يجب ألا يكبر عنه الكرت الجديد */
const OLD_DAY = 'position:relative;height:24px;flex:1 1 auto;min-width:28px;padding:0 3px;border-radius:4px;font-size:8px;font-weight:700;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;user-select:none;background:var(--bg-xffffff);color:var(--fg-x53565a);border:2px solid var(--bd-xe1e1e1)';
const HTML = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>${src('src/styles/070-theme-tokens.css')} body{margin:0;padding:12px;font-family:sans-serif;background:var(--bg-xffffff)} .strip{display:flex;align-items:center;gap:3px;flex-wrap:nowrap;padding:4px 0 6px}</style>
<script>${src('src/core/010-react.js')}</script><script>${src('src/core/020-react-dom.js')}</script><script>${src('src/core/005-kivo-ns.js')}</script>
<script>${src('src/i18n/380-hijri-fallback.js')}</script><script>${src('src/i18n/385-calendar.js')}</script></head>
<body><div id="old" class="strip"></div><div id="new" class="strip"></div><div id="mon" class="strip"></div><div id="yr" class="strip"></div>
<script>
  var C = KIVO.BassamCal, Card = KIVO.BassamCalCard, days = C.gDays('2026-11'), T = '2026-11-24', h = React.createElement;
  document.getElementById('old').innerHTML = days.map(function (k) { return '<div class="oc" style="${OLD_DAY}"><span style="line-height:1;display:block">' + (C.hOf(k) || {}).d + '</span><span style="display:block;width:9px;height:1px;margin:1px 0"></span><span style="line-height:1;display:block;font-weight:400">' + C.gParse(k).d + '</span></div>'; }).join('');
  var why = function (k) { return C.gCmp(k, '2026-11-10') <= 0 ? 'ap' : C.gCmp(k, T) < 0 ? (k === '2026-11-20' ? 'gone' : 'past') : ''; };
  ReactDOM.createRoot(document.getElementById('new')).render(h(React.Fragment, null, days.map(function (k) {
    return Card.day({ key: k, k: k, closed: C.gCmp(k, T) < 0 || k === '2026-11-30', why: k === '2026-11-30' ? 'shut' : why(k), today: k === T, sel: k === '2026-11-26' });
  })));
  ReactDOM.createRoot(document.getElementById('mon')).render(h(React.Fragment, null, C.gYears(1, 12).map(function (m) {
    var ym = C.gYm(2026, m); return Card.month({ key: ym, ym: ym, closed: m < 11, why: m < 10 ? 'ap' : 'past', cur: m === 11 });
  })));
  ReactDOM.createRoot(document.getElementById('yr')).render(h(React.Fragment, null, [2025, 2026, 2027].map(function (y) { return Card.year({ key: y, y: y, closed: y < 2026, why: 'ap', cur: y === 2026 }); })));
</script></body></html>`;

const VIEWS = [['iPhone 13', devices['iPhone 13']], ['desktop', { viewport: { width: 1366, height: 900 } }]];
const box = (r) => ({ w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 });

for (const [name, dev] of VIEWS) {
  test('card · ' + name + ': same size · two states · reason in the tooltip only', async () => {
    const browser = await chromium.launch();
    try {
      const ctx = await browser.newContext(dev), page = await ctx.newPage(), errs = [];
      page.on('pageerror', (e) => errs.push(e.message));
      await page.setContent(HTML, { waitUntil: 'load' });
      await page.waitForFunction(() => document.querySelectorAll('#new [data-cal-kind=day]').length === 30 && document.querySelectorAll('#yr [data-cal-kind=year]').length === 3);
      const R = await page.evaluate(() => {
        const rect = (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, bottom: r.bottom, left: r.left, right: r.right }; };
        const card = (e) => ({ rect: rect(e), kind: e.dataset.calKind, key: e.dataset.calKey, state: e.dataset.calState, title: e.getAttribute('title'), aria: e.getAttribute('aria-label'),
          text: e.innerText.replace(/\s+/g, ' ').trim(), bg: getComputedStyle(e).backgroundColor, lock: !!e.querySelector('[data-cal-lock]'),
          lines: [...e.querySelectorAll('[data-cal-line]')].map((l) => { const g = document.createRange(); g.selectNodeContents(l); return { t: l.textContent, r: rect(g), fs: parseFloat(getComputedStyle(l).fontSize) }; }) });
        const css = getComputedStyle(document.documentElement), tok = (n) => { const d = document.createElement('div'); d.style.background = 'var(' + n + ')'; document.body.appendChild(d); const v = getComputedStyle(d).backgroundColor; d.remove(); return v; };
        return { old: [...document.querySelectorAll('#old .oc')].map((e) => rect(e)), day: [...document.querySelectorAll('#new [data-cal-kind]')].map(card),
          mon: [...document.querySelectorAll('#mon [data-cal-kind]')].map(card), yr: [...document.querySelectorAll('#yr [data-cal-kind]')].map(card),
          closedBg: tok('--bg-x64748b'), openBg: tok('--bg-xffffff'), docW: document.documentElement.scrollWidth, vw: innerWidth, tz: css.direction };
      });
      assert.deepEqual(errs, []);
      /* ① المقاس */
      assert.equal(R.day.length, 30);
      const oMin = Math.min(...R.old.map((r) => r.width)), oMax = Math.max(...R.old.map((r) => r.width));
      R.day.forEach((c, i) => {
        /* الارتفاعُ هو هو حرفاً؛ والعرضُ عنصرٌ مرنٌ (flex: 1 1 auto) يوزّع الشريطُ عليه الفراغ بحسب محتواه، فيُقبل فرقُ ما دون 1.5px ومجموعُ الشريط واحد: كلُّ كرتٍ جديد (ونصُّه مقيسٌ بمداه الفعلي)  في مدى عروض الكروت الحالية (±1px) */
        assert.equal(box(c.rect).h, box(R.old[i]).h, name + ' day ' + c.key + ' height');
        assert.ok(c.rect.width >= oMin - 1 && c.rect.width <= oMax + 1, name + ' day ' + c.key + ' width ' + c.rect.width + ' outside the old cards [' + oMin + ', ' + oMax + ']');
        assert.equal(c.lines.length, 3);
        const [a, b, d] = c.lines;
        assert.ok(a.r.top < b.r.top && b.r.top < d.r.top, 'letter above Gregorian above Hijri');
        for (const l of c.lines) assert.ok(l.r.top >= c.rect.top - 0.5 && l.r.bottom <= c.rect.bottom + 0.5 && l.r.left >= c.rect.left - 0.5 && l.r.right <= c.rect.right + 0.5, c.key + ' line «' + l.t + '» inside the card');
        assert.ok(d.fs < b.fs, 'Hijri line smaller');
      });
      const span = (L) => L[0].right - L[L.length - 1].left;
      assert.ok(Math.abs(span(R.day.map((c) => c.rect)) - span(R.old)) < 1, 'same strip width');
      const k24 = R.day.find((c) => c.key === '2026-11-24');
      assert.deepEqual(k24.lines.map((l) => l.t), ['ث', '24', '14/6']);
      for (const c of [...R.mon, ...R.yr]) for (const l of c.lines) assert.ok(l.r.top >= c.rect.top - 0.5 && l.r.bottom <= c.rect.bottom + 0.5, c.key + ' «' + l.t + '» inside');
      R.mon.forEach((c) => assert.equal(Math.round(c.rect.height), 40)); R.yr.forEach((c) => assert.equal(Math.round(c.rect.height), 40));
      assert.deepEqual(R.mon[10].lines.map((l) => l.t), ['نوفمبر', '21 جمادى الأولى – 20 جمادى الآخرة']);
      assert.deepEqual(R.yr[1].lines.map((l) => l.t), ['2026', '1447 – 1448 هـ']);
      /* ② حالتان فقط */
      const all = [...R.day, ...R.mon, ...R.yr];
      for (const c of all) {
        assert.ok(c.state === 'closed' || c.state === 'open');
        assert.equal(c.bg, c.state === 'closed' ? R.closedBg : R.openBg, c.key + ' background');
        assert.equal(c.lock, c.state === 'closed', c.key + ' lock');
      }
      assert.equal(new Set(all.map((c) => c.bg)).size, 2, 'exactly two card colours');
      assert.notEqual(R.closedBg, R.openBg);
      /* ③ التلميح */
      const tip = (k) => R.day.find((c) => c.key === k).title;
      assert.equal(tip('2026-11-05'), 'الخميس 5 نوفمبر 2026 · 25 جمادى الأولى 1448 — مغلق: اعتُمد');
      assert.match(tip('2026-11-15'), /— مغلق: أُغلق تلقائياً$/);
      assert.match(tip('2026-11-20'), /— مغلق: مضى$/);
      assert.match(tip('2026-11-30'), /— مغلق: أُغلق يدوياً$/);
      assert.match(tip('2026-11-24'), /^الثلاثاء 24 نوفمبر 2026 · 14 جمادى الآخرة 1448 — مفتوح$/);
      assert.match(R.mon[0].title, /^يناير 2026 · .+ — مغلق: اعتُمد$/);
      for (const c of all) { assert.equal(c.aria, c.title); assert.ok(!/اعتُمد|تلقائياً|مضى|يدوياً|مغلق|مفتوح/.test(c.text), c.key + ' reason not in the card text: ' + c.text); }
      /* المرورُ لا يغيّر المقاس */
      const before = box(R.day[23].rect);
      await page.hover('#new [data-cal-key="2026-11-24"]');
      const after = await page.evaluate(() => { const r = document.querySelector('#new [data-cal-key="2026-11-24"]').getBoundingClientRect(); return { width: r.width, height: r.height }; });
      assert.deepEqual(box(after), before);
      if (name === 'desktop') assert.ok(R.docW <= R.vw + 1, 'no horizontal page scroll');
      await ctx.close();
    } finally { await browser.close(); }
  });
}
