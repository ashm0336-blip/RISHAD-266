/* V7 · 53 تقويم — كرتُ اليوم/الشهر/السنة المشترك (KIVO.BassamCalCard، src/i18n/385-calendar.js) في متصفحٍ حقيقي — iPhone 13 وسطح المكتب، فاتحاً وداكناً.
   المعيار: docs/handoff/day_card_design.md (قرارُ المالك · REVIEW 21) — كلُّ قاعدةٍ فيه مختبَرة هنا. TEST_ONLY.
   الصفحةُ تُبنى من ملفات المصدر نفسِها (الرموز 070/080 · React 010/020 · KIVO 005 · التقويم 380/385)، فلا خادمَ ولا بيانات. اليومُ المرجعي 2026-11-24.
   ① المقاس: ارتفاع 36 · عرضٌ أدنى 28 · زوايا 5 — والمرورُ يرفع الكرت 2px ويكبّره 6% (المرجعُ المرئي) بلا تغيير مقاسه في الشريط.
   ② الأسطر: حرفُ اليوم 7.5px/800 خافت (الجمعة والسبت بالذهبي) · الميلادي 12.5px/900 · الهجري 7.5px/600 خافت · 2px بين الأسطر · بهذا الترتيب من الأعلى.
   ③ الحالات: مغلق = --cal-lockb ورقمٌ بـ--cal-lock وقفلٌ في دائرة 11px بالزاوية العليا · مفتوح = إطارٌ ذهبيٌّ متقطّع 1.5px بلا قفل · اليوم = حلقةٌ ذهبية 2px ·
      المحدَّد = تدرّجٌ ذهبيٌّ ونصٌّ أبيض · القادم = شفافية 0.55 · لونان فقط للحالتين.
   ④ التلميح: «الأحد 1 نوفمبر 2026 م» · «21 جمادى الأولى 1448 هـ» · الحالة بسببها الإداري — والسببُ ليس في نصّ الكرت.
   ⑤ الشهر والسنة بالآلية نفسها · ⑥ الداكن بالرموز الدلالية (القيمُ تتبدّل بالسمة). */
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
const HTML = (theme) => `<!doctype html><html dir="rtl" lang="ar"${theme === 'dark' ? ' data-theme="dark"' : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>${src('src/styles/070-theme-tokens.css')}${src('src/styles/080-theme-dark.css')} body{margin:0;padding:12px;font-family:sans-serif;background:var(--bg-app)} .strip{display:flex;gap:3px;overflow-x:auto;padding:8px 2px}</style>
<script>${src('src/core/010-react.js')}</script><script>${src('src/core/020-react-dom.js')}</script><script>${src('src/core/005-kivo-ns.js')}</script>
<script>${src('src/i18n/380-hijri-fallback.js')}</script><script>${src('src/i18n/385-calendar.js')}</script></head>
<body><div id="day" class="strip"></div><div id="mon" class="strip"></div><div id="yr" class="strip"></div>
<script>
  var C = KIVO.BassamCal, Card = KIVO.BassamCalCard, T = '2026-11-24', h = React.createElement;
  var isClosed = function (k) { var d = +k.slice(8); return (d <= 23 && d !== 17) || d === 30; };
  var why = function (k) { var d = +k.slice(8); return d <= 10 ? 'ap' : d === 20 ? 'gone' : d === 30 ? 'shut' : 'past'; };
  ReactDOM.createRoot(document.getElementById('day')).render(h(React.Fragment, null, C.gDays('2026-11').map(function (k) {
    return Card.day({ key: k, k: k, T: T, closed: isClosed(k), why: why(k), until: k.slice(8) === '17' ? '30 نوفمبر' : undefined, sel: k === '2026-11-26' });
  })));
  ReactDOM.createRoot(document.getElementById('mon')).render(h(React.Fragment, null, C.gYears(1, 12).map(function (m) {
    var ym = C.gYm(2026, m); return Card.month({ key: ym, ym: ym, T: T, closed: m < 10, why: m < 9 ? 'ap' : 'past', sel: m === 12 });
  })));
  ReactDOM.createRoot(document.getElementById('yr')).render(h(React.Fragment, null, [2025, 2026, 2027].map(function (y) { return Card.year({ key: y, y: y, T: T, closed: y < 2026, why: 'ap' }); })));
</script></body></html>`;

const VIEWS = [['iPhone 13', devices['iPhone 13']], ['desktop', { viewport: { width: 1366, height: 900 } }]];
const DARK = { 'cal-lockb': 'rgb(52, 58, 66)', 'cal-card': 'rgb(45, 48, 52)', 'cal-lock': 'rgb(148, 163, 184)', 'cal-gold': 'rgb(217, 190, 134)', 'cal-mut': 'rgb(169, 173, 179)' };
const LIGHT = { 'cal-lockb': 'rgb(238, 241, 245)', 'cal-card': 'rgb(255, 255, 255)', 'cal-lock': 'rgb(100, 116, 139)', 'cal-gold': 'rgb(185, 151, 81)', 'cal-mut': 'rgb(83, 86, 90)' };

async function grab(page) {
  return page.evaluate(() => {
    const rect = (e) => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }; };
    const tok = (n) => { const d = document.createElement('div'); d.style.color = 'var(--' + n + ')'; document.body.appendChild(d); const v = getComputedStyle(d).color; d.remove(); return v; };
    const card = (e) => {
      const cs = getComputedStyle(e), lk = e.querySelector('[data-cal-lock]');
      return { key: e.dataset.calKey, kind: e.dataset.calKind, state: e.dataset.calState, when: e.dataset.calWhen, sel: e.dataset.calSel === '1', rect: rect(e), title: e.getAttribute('title'),
        text: e.innerText.replace(/\s+/g, ' ').trim(), radius: cs.borderTopLeftRadius, minW: cs.minWidth, bg: cs.backgroundColor, bgImg: cs.backgroundImage, opacity: cs.opacity,
        bStyle: cs.borderTopStyle, bWidth: (e.style.border.match(/^([0-9.]+px)/) || [])[1] || '', bWidthPx: parseFloat(cs.borderTopWidth), bColor: cs.borderTopColor, shadow: cs.boxShadow, gap: cs.rowGap,
        lock: lk ? { rect: rect(lk), radius: getComputedStyle(lk).borderTopLeftRadius } : null,
        lines: [...e.querySelectorAll('[data-cal-line]')].map((l) => { const s = getComputedStyle(l); const g = document.createRange(); g.selectNodeContents(l); return { t: l.textContent, r: rect(l), w: g.getBoundingClientRect().width, fs: s.fontSize, fw: s.fontWeight, color: s.color }; }) };
    };
    const T = {}; for (const n of ['cal-lockb', 'cal-card', 'cal-lock', 'cal-gold', 'cal-gold-text', 'cal-mut', 'cal-on-sel', 'cal-sel-a', 'cal-sel-b']) T[n] = tok(n);
    return { tok: T, day: [...document.querySelectorAll('#day [data-cal-kind]')].map(card), mon: [...document.querySelectorAll('#mon [data-cal-kind]')].map(card), yr: [...document.querySelectorAll('#yr [data-cal-kind]')].map(card),
      docW: document.documentElement.scrollWidth, vw: innerWidth };
  });
}

for (const [name, dev] of VIEWS) for (const theme of ['light', 'dark']) {
  test('card · ' + name + ' · ' + theme + ': every rule of day_card_design.md', async () => {
    const browser = await chromium.launch();
    try {
      const ctx = await browser.newContext(dev), page = await ctx.newPage(), errs = [];
      page.on('pageerror', (e) => errs.push(e.message));
      await page.setContent(HTML(theme), { waitUntil: 'load' });
      await page.waitForFunction(() => document.querySelectorAll('#day [data-cal-kind=day]').length === 30 && document.querySelectorAll('#yr [data-cal-kind=year]').length === 3);
      const R = await grab(page), K = R.tok, by = (k) => R.day.find((c) => c.key === k), all = [...R.day, ...R.mon, ...R.yr];
      assert.deepEqual(errs, []);
      /* ⑥ الداكن: الرموزُ الدلالية تتبدّل بالسمة */
      for (const [n, v] of Object.entries(theme === 'dark' ? DARK : LIGHT)) assert.equal(K[n], v, theme + ' --' + n);
      /* ① المقاس */
      assert.equal(R.day.length, 30);
      for (const c of all) {
        assert.equal(Math.round(c.rect.height * 10) / 10, 36, c.key + ' height'); assert.equal(c.radius, '5px', c.key + ' radius');
        assert.ok(c.rect.width >= 28 - 0.01, c.key + ' width ' + c.rect.width);
      }
      for (const c of R.day) assert.equal(c.minW, '28px');
      for (const c of all) for (const l of c.lines) assert.ok(l.w <= c.rect.width + 0.5, c.key + ' «' + l.t + '» fits the card width (' + l.w + ' > ' + c.rect.width + ')');
      /* ② الأسطر */
      for (const c of R.day) {
        const [w, g, hj] = c.lines; assert.equal(c.lines.length, 3);
        assert.deepEqual([w.fs, w.fw, g.fs, g.fw, hj.fs, hj.fw], ['7.5px', '800', '12.5px', '900', '7.5px', '600'], c.key);
        assert.ok(w.r.bottom <= g.r.top + 0.01 && g.r.bottom <= hj.r.top + 0.01, 'order');
        assert.ok(Math.abs(g.r.top - w.r.bottom - 2) < 0.6 && Math.abs(hj.r.top - g.r.bottom - 2) < 0.6, c.key + ' 2px gaps: ' + (g.r.top - w.r.bottom) + ' / ' + (hj.r.top - g.r.bottom));
        assert.equal(c.gap, '2px');
        for (const l of c.lines) assert.ok(l.r.top >= c.rect.top && l.r.bottom <= c.rect.bottom, c.key + ' line inside');
        const wd = new Date(c.key + 'T12:00:00Z').getUTCDay();
        if (!c.sel) { assert.equal(w.color, wd >= 5 ? K['cal-gold'] : K['cal-mut'], c.key + ' weekday letter colour'); assert.equal(hj.color, K['cal-mut'], c.key + ' Hijri colour'); }
      }
      assert.deepEqual(by('2026-11-24').lines.map((l) => l.t), ['ث', '24', '14']);
      assert.deepEqual(by('2026-11-01').lines.map((l) => l.t), ['ح', '1', '21']);
      assert.equal(by('2026-11-27').lines[0].t, 'ج'); assert.equal(by('2026-11-28').lines[0].t, 'س');
      /* ③ الحالات */
      for (const c of all) {
        assert.ok(c.state === 'closed' || c.state === 'open');
        if (c.state === 'closed') {
          assert.ok(c.lock, c.key + ' lock'); assert.equal(Math.round(c.lock.rect.width), 11); assert.equal(Math.round(c.lock.rect.height), 11); assert.equal(c.lock.radius, '50%');
          assert.ok(c.lock.rect.top < c.rect.top && c.lock.rect.left < c.rect.left, c.key + ' lock at the top corner');
          if (!c.sel) { assert.equal(c.bg, K['cal-lockb'], c.key + ' closed background'); assert.equal(c.lines[c.kind === 'day' ? 1 : 0].color, K['cal-lock'], c.key + ' closed number'); }
        } else {
          assert.equal(c.lock, null, c.key + ' no lock when open');
          if (c.when === 'past' && !c.sel) { assert.equal(c.bStyle, 'dashed'); assert.equal(c.bWidth, '1.5px'); assert.ok(c.bWidthPx >= 1, 'drawn (the browser snaps 1.5px to device pixels)'); assert.equal(c.bColor, K['cal-gold'], c.key + ' dashed gold'); assert.equal(c.bg, K['cal-card']); }
        }
        assert.equal(c.opacity, c.when === 'future' ? '0.55' : '1', c.key + ' opacity');
        if (c.when === 'now' && !c.sel) assert.ok(c.shadow.startsWith(K['cal-gold'] + ' 0px 0px 0px 2px'), c.key + ' today ring: ' + c.shadow);
        if (c.sel) {
          assert.ok(c.bgImg.includes('linear-gradient') && c.bgImg.includes(K['cal-sel-a']) && c.bgImg.includes(K['cal-sel-b']), c.key + ' gradient ' + c.bgImg);
          for (const l of c.lines) assert.equal(l.color, K['cal-on-sel'], c.key + ' white text');
        }
      }
      assert.equal(K['cal-on-sel'], 'rgb(255, 255, 255)'); assert.equal(K['cal-sel-a'], 'rgb(212, 180, 110)'); assert.equal(K['cal-sel-b'], 'rgb(168, 132, 61)');
      assert.equal(by('2026-11-17').state, 'open'); assert.equal(by('2026-11-05').state, 'closed'); assert.equal(by('2026-11-30').state, 'closed');
      assert.equal(by('2026-11-26').sel, true); assert.equal(by('2026-11-24').when, 'now');
      assert.equal(new Set(R.day.filter((c) => !c.sel && c.when !== 'future').map((c) => c.bg)).size, 2, 'two state colours');
      /* ④ التلميح */
      assert.equal(by('2026-11-01').title, 'الأحد 1 نوفمبر 2026 م\n21 جمادى الأولى 1448 هـ\nمغلق — اعتُمد');
      assert.equal(by('2026-11-15').title, 'الأحد 15 نوفمبر 2026 م\n5 جمادى الآخرة 1448 هـ\nمغلق — أُغلق تلقائياً بلا اعتماد');
      assert.match(by('2026-11-20').title, /\nمغلق — مضى$/); assert.match(by('2026-11-30').title, /\nمغلق — أُغلق يدوياً$/);
      assert.match(by('2026-11-17').title, /\nمفتوح — للاستدراك حتى 30 نوفمبر$/); assert.match(by('2026-11-25').title, /\nمفتوح — قادم$/);
      for (const c of all) assert.ok(!/اعتُمد|تلقائياً|مضى|يدوياً|مغلق|مفتوح/.test(c.text), c.key + ' reason not in the card: ' + c.text);
      /* ⑤ الشهر والسنة */
      assert.deepEqual(R.mon[10].lines.map((l) => l.t), ['نوفمبر', '21 جمادى الأولى – 20 جمادى الآخرة']);
      assert.deepEqual(R.yr[1].lines.map((l) => l.t), ['2026', '1447 – 1448 هـ']);
      assert.equal(R.mon[10].title, 'نوفمبر 2026 م\n21 جمادى الأولى – 20 جمادى الآخرة 1448 هـ\nمفتوح');
      assert.equal(R.mon[0].state, 'closed'); assert.match(R.mon[0].title, /\nمغلق — اعتُمد$/); assert.match(R.mon[9].title, /\nمفتوح — للاستدراك$/);
      assert.equal(R.mon[9].bStyle, 'dashed'); assert.equal(R.mon[11].when, 'future'); assert.equal(R.yr[0].state, 'closed'); assert.equal(R.yr[2].opacity, '0.55');
      /* المرورُ لا يغيّر المقاس */
      const before = by('2026-11-24').rect;
      await page.hover('#day [data-cal-key="2026-11-24"]'); await page.waitForTimeout(300);   /* انتقالٌ 0.15 ث */
      /* تفاعلُ المرور المعتمد: يرتفع 2px ويكبر 6% (تحويل) ومقاسُه في الشريط هو هو، ويعود عند الخروج */
      const after = await page.evaluate(() => { const e = document.querySelector('#day [data-cal-key="2026-11-24"]'); return { width: e.offsetWidth, height: e.offsetHeight, tf: getComputedStyle(e).transform, z: getComputedStyle(e).zIndex }; });
      assert.equal(after.height, Math.round(before.height)); assert.equal(after.width, Math.round(before.width));
      assert.equal(after.tf, 'matrix(1.06, 0, 0, 1.06, 0, -2)'); assert.equal(after.z, '5');
      await page.mouse.move(1, 1); await page.waitForTimeout(300);
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#day [data-cal-key="2026-11-24"]')).transform), 'none');
      assert.ok(R.docW <= R.vw + 1, 'no horizontal page scroll (the strip scrolls inside itself)');
      await ctx.close();
    } finally { await browser.close(); }
  });
}
