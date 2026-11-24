/* V7 · 53 · REVIEW item 10 (group «porttouch»): Production wave 2 mobile and touch fixes that RISHAD-266 did not have, ported as behaviour.
   Measured in a real browser on the isolated lab with the TEST_ONLY demo data (/api/demo-data), as the demo unit manager, on the
   Playwright «iPhone 13» and «iPad Pro 11» descriptors (touch, pointer: coarse), with a desktop control where the rule is touch-only:
     · AUX-13 «صفحتي»: header and dialog buttons ≥ 36px tall on touch, and the touch area (with the .bs-tap pad of 660) ≥ 44px;
       the desktop keeps its 30px buttons;
     · KD-09 «تحليل المسجد الحرام»: every solid coverage chip reads ≥ 4.5:1 in light and dark, and its colours are token variables
       (amber chips take --warning-on-strong; white on dark amber was 1.8:1);
     · KD-04 «مؤشرات المصليات»: the two lead blocks of the hero fit inside their card on a phone (they forced 440px/400px);
     · KD-08 «المقارنة الزمنية»: the «النطاق | المؤشر» pill and the lead rows fit inside their card;
     · KD-06 every chart label stays inside its chart;
     · DG-05 / PLAN-05: the tasks tool bar and filter row and the plan lens hint wrap instead of hiding tools off screen;
     · PLAN-05 on a tablet in landscape the map side panel does not open by itself, and with 3+ badges their names drop «مؤشرات»;
     · on every page above the page itself never scrolls sideways.
   Nothing is written through the UI. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const { devices } = createRequire(process.env.KIVO_PLAYWRIGHT || (execSync('npm root -g').toString().trim() + '/'))('playwright');
const PHONE = devices['iPhone 13'], TABLET = devices['iPad Pro 11'], TABLET_L = devices['iPad Pro 11 landscape'];
const DEVS = [['iPhone 13', PHONE], ['iPad Pro 11', TABLET]];
let lab, b, m1;

before(async () => {
  lab = await startLab(); b = await chromium.launch();
  lab.env.KIVO_TEST_FIXTURE = 'allow'; lab.env.KIVO_TEST_HOST = 'lab.local';
  const su = await openAs(b, lab, LAB.superUn, LAB.superPw);
  const seed = await su.api('/api/demo-data', { method: 'POST', body: JSON.stringify({ act: 'seed', reveal: true }) });
  assert.equal(seed.status, 200, JSON.stringify(seed.j && seed.j.err));
  m1 = seed.j.secrets.find((x) => x.id === 'tst_demo_u_m1');
  await su.ctx.close();
});
after(async () => { if (b) await b.close(); if (lab) await lab.close(); });

const open = (dev) => openAs(b, lab, m1.un, m1.pw, dev ? { viewport: dev.viewport, context: dev } : { viewport: { width: 1440, height: 900 } });
const noSideScroll = async (p, tag) => {
  const r = await p.evaluate(() => ({ doc: document.documentElement.scrollWidth, body: document.body.scrollWidth, w: innerWidth }));
  assert.ok(r.doc <= r.w && r.body <= r.w, tag + ': the page does not scroll sideways ' + JSON.stringify(r));
};
const kpiTab = async (s, name) => {
  await s.go('#/kpis', 4500);
  await s.page.locator('main :text-is("' + name + '")').first().click(); await s.page.waitForTimeout(4000);
};

test('AUX-13 · «صفحتي» on touch: buttons ≥ 36px, touch area ≥ 44px with the .bs-tap pad — desktop unchanged', { timeout: 300000 }, async () => {
  const measure = (p) => p.evaluate(() => {
    const vis = (e) => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
    const px = (v) => parseFloat(v) || 0;
    const row = (e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e), tap = e.classList.contains('bs-tap');
      return { t: (e.textContent || '').trim().slice(0, 20), cls: String(e.className), h: Math.round(r.height * 10) / 10, eff: Math.round((r.height + (tap ? -px(cs.getPropertyValue('--bs-tt')) - px(cs.getPropertyValue('--bs-tb')) : 0)) * 10) / 10 }; };
    return { coarse: matchMedia('(pointer: coarse)').matches,
      btn: [...document.querySelectorAll('main .pf-btn')].filter(vis).map(row),
      link: [...document.querySelectorAll('main .pf-linkbtn, main .tk-foot>span[style*="cursor: pointer"], main .pf-stats>span[style*="cursor: pointer"], main .fd-chip, main .pf-whychip')].filter(vis).map(row) };
  });
  for (const [tag, dev] of DEVS) {
    const s = await open(dev); await s.go('#/profile', 4000);
    const m = await measure(s.page);
    assert.equal(m.coarse, true, tag + ': touch viewport');
    assert.ok(m.btn.length >= 4, tag + ': the header buttons are shown ' + JSON.stringify(m.btn));
    for (const x of m.btn) { assert.ok(x.h >= 36, tag + ': «' + x.t + '» is ' + x.h + 'px (needs 36)'); assert.ok(x.eff >= 44, tag + ': «' + x.t + '» touch area ' + x.eff + 'px (needs 44)'); }
    for (const x of m.link) assert.ok(x.h >= 32, tag + ': «' + x.t + '» is ' + x.h + 'px (needs 32)');
    await noSideScroll(s.page, tag + ' · profile');
    assert.deepEqual(s.errs, [], tag + ': no page errors'); await s.ctx.close();
  }
  const d = await open(null); await d.go('#/profile', 4000);
  const m = await measure(d.page);
  assert.equal(m.coarse, false);
  assert.ok(m.btn.length >= 4 && m.btn.every((x) => x.h < 36), 'desktop: the header buttons keep their size ' + JSON.stringify(m.btn));
  await d.ctx.close();
});

/* the solid coverage «٪» chips (the 42px column of the coverage tables — ZH/h fills), their colours and whether the inline colours are token variables */
const chips = (p) => p.evaluate(() => {
  const rgb = (c) => (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const cr = (a, b) => { const x = lum(rgb(a)), y = lum(rgb(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  return [...document.querySelectorAll('main span, main b, main div')].filter((e) => e.getClientRects().length && /9999px/.test(e.getAttribute('style') || '') && /flex: 0 0 42px/.test(e.getAttribute('style') || '')
    && /^[\d٠-٩.,٫]+[٪%]$/.test(e.textContent.replace(/[⁦-⁩‪-‮\s]/g, '')) && !/rgba|transparent/.test(getComputedStyle(e).backgroundColor))
    .map((e) => { const cs = getComputedStyle(e), st = e.getAttribute('style'), fg = (/(?:^|;)\s*color:\s*([^;]+)/.exec(st) || [])[1] || '', bg = (/background:\s*([^;]+)/.exec(st) || [])[1] || '';
      return { t: e.textContent.trim(), fg: cs.color, bg: cs.backgroundColor, cr: Math.round(cr(cs.color, cs.backgroundColor) * 100) / 100, tokFg: /^var\(--/.test(fg.trim()), tokBg: /^var\(--/.test(bg.trim()) }; });
});

test('KD-09 · coverage chips in «تحليل المسجد الحرام»: ≥ 4.5:1 in light and dark, colours from tokens — iPhone 13 and iPad Pro 11', { timeout: 300000 }, async () => {
  for (const [tag, dev] of DEVS) {
    const s = await open(dev); const p = s.page;
    await kpiTab(s, 'تحليل المسجد الحرام');
    for (const theme of ['light', 'dark']) {
      await p.evaluate((t) => KIVO.__bsThemeSet(t), theme); await p.waitForTimeout(900);
      const c = await chips(p);
      assert.ok(c.length >= 4, tag + ' · ' + theme + ': the coverage chips are shown ' + JSON.stringify(c));
      /* the demo month has 3 of 14 days recorded: amber chips (< 80٪) are among them */
      const val = (t) => parseFloat(t.replace(/[⁦-⁩‪-‮٪%]/g, '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace('٫', '.'));
      assert.ok(c.some((x) => val(x.t) < 80), tag + ': a chip under 80٪ (amber) is measured ' + JSON.stringify(c.map((x) => x.t)));
      for (const x of c) {
        assert.ok(x.cr >= 4.5, tag + ' · ' + theme + ': «' + x.t + '» ' + x.fg + ' on ' + x.bg + ' is ' + x.cr + ':1 (needs 4.5)');
        assert.ok(x.tokFg, tag + ': «' + x.t + '» text colour is a token variable');
      }
    }
    await p.evaluate(() => KIVO.__bsThemeSet('light'));
    await noSideScroll(p, tag + ' · dstats analysis');
    assert.deepEqual(s.errs, [], tag + ': no page errors'); await s.ctx.close();
  }
});

/* text that the clipping card cuts: every element with its own text, outside the card's padding box (where overflow:hidden clips) */
const clipped = (p, sel) => p.evaluate((sel) => {
  const out = [];
  for (const host of [...document.querySelectorAll(sel)].filter((e) => e.getClientRects().length)) {
    const r = host.getBoundingClientRect(), cs = getComputedStyle(host), l = r.left + parseFloat(cs.borderLeftWidth) - 1, rt = r.right - parseFloat(cs.borderRightWidth) + 1;
    for (const k of [...host.querySelectorAll('*')]) {
      if (!k.getClientRects().length || ![...k.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      if (/absolute|fixed/.test(getComputedStyle(k).position) || k.closest('[style*="position: absolute"]') !== null && host.contains(k.closest('[style*="position: absolute"]'))) continue;
      let a = k.parentElement, hid = false; while (a && a !== host) { if (getComputedStyle(a).overflowX !== 'visible') { hid = true; break; } a = a.parentElement; }
      if (hid) continue;
      const q = k.getBoundingClientRect(); if (q.width && (q.left < l || q.right > rt)) out.push(k.tagName + ' «' + (k.textContent || '').trim().slice(0, 24) + '» ' + Math.round(q.left) + '..' + Math.round(q.right) + ' in ' + Math.round(l) + '..' + Math.round(rt));
    }
  }
  return out.slice(0, 8);
}, sel);
/* labels anchored at one edge (text-anchor start/end — KD-06) that run outside their chart; centred axis ticks are not this item */
const svgOut = (p) => p.evaluate(() => [...document.querySelectorAll('main svg')].filter((s) => s.getClientRects().length).flatMap((s) => { const r = s.getBoundingClientRect();
  return [...s.querySelectorAll('text[text-anchor="start"], text[text-anchor="end"]')].filter((x) => { const q = x.getBoundingClientRect(); return q.width && (q.right > r.right + 1 || q.left < r.left - 1); }).map((x) => '«' + x.textContent + '» ' + Math.round(x.getBoundingClientRect().left - r.left) + '..' + Math.round(x.getBoundingClientRect().right - r.left) + ' of ' + Math.round(r.width)); }).slice(0, 8));

test('KD-04 · KD-06 · KD-08 · KPI content fits its cards on a phone and a tablet: «مؤشرات المصليات» hero blocks, chart labels, the dstats lead row and pill', { timeout: 400000 }, async () => {
  for (const [tag, dev] of DEVS) {
    const s = await open(dev); const p = s.page;
    await kpiTab(s, 'مؤشرات المصليات');
    /* the hero card: the first clipping card that holds the «مؤشرات المصليات» lead text */
    const hero = await p.evaluate(() => { const h = [...document.querySelectorAll('main div[style*="border-radius: 24px"][style*="overflow: hidden"]')].filter((e) => e.getClientRects().length); h.forEach((e, i) => e.setAttribute('data-t-hero', i)); return h.length; });
    assert.ok(hero >= 1, tag + ': the zones hero is shown');
    /* every sub-item is collected first, so one run shows each of KD-04 · KD-06 · KD-08 on its own */
    const bad = {};
    const hc = await clipped(p, 'main [data-t-hero]'); if (hc.length) bad['KD-04 hero blocks cut'] = hc;
    const zs = await svgOut(p); if (zs.length) bad['KD-06 zones chart labels outside'] = zs;
    await noSideScroll(p, tag + ' · zones KPI');
    await kpiTab(s, 'مؤشرات الإشغال');
    const svgs = await p.evaluate(() => [...document.querySelectorAll('main svg text[text-anchor="start"], main svg text[text-anchor="end"]')].filter((e) => e.getClientRects().length).length);
    assert.ok(svgs >= 5, tag + ': occupancy charts are drawn (' + svgs + ' labels)');
    const os = await svgOut(p); if (os.length) bad['KD-06 occupancy chart labels outside'] = os;
    await kpiTab(s, 'المقارنة الزمنية');
    const pill = await p.evaluate(() => { const sp = [...document.querySelectorAll('main span')].find((e) => e.getClientRects().length && e.textContent.trim() === 'النطاق'); if (!sp) return null;
      const pl = sp.parentElement, card = pl.parentElement, a = pl.getBoundingClientRect(), c = card.getBoundingClientRect(), cs = getComputedStyle(card);
      return { pl: [Math.round(a.left), Math.round(a.right)], card: [Math.round(c.left + parseFloat(cs.borderLeftWidth)), Math.round(c.right - parseFloat(cs.borderRightWidth))], cardSW: card.scrollWidth, cardCW: card.clientWidth }; });
    assert.ok(pill, tag + ': the «النطاق | المؤشر» pill is shown');
    if (!(pill.pl[0] >= pill.card[0] - 1 && pill.pl[1] <= pill.card[1] + 1 && pill.cardSW <= pill.cardCW + 1)) bad['KD-08 pill outside its card'] = pill;
    const lc = await clipped(p, 'main .rz-lead'); if (lc.length) bad['KD-08 lead rows cut'] = lc;
    assert.deepEqual(bad, {}, tag + ': KPI content fits its cards');
    await noSideScroll(p, tag + ' · time comparison');
    assert.deepEqual(s.errs, [], tag + ': no page errors'); await s.ctx.close();
  }
});

/* a bar that hides part of its content: it scrolls sideways (scrollWidth > clientWidth), or a control lies outside the viewport */
const hidden = (p, needle) => p.evaluate((needle) => [...document.querySelectorAll('main .bs-hbar')].filter((e) => e.getClientRects().length && e.innerText.includes(needle))
  .map((e) => ({ sw: e.scrollWidth, cw: e.clientWidth, out: [...e.querySelectorAll('button, select, span')].filter((x) => x.getClientRects().length).filter((x) => { const q = x.getBoundingClientRect(); return q.width && (q.right > innerWidth + 1 || q.left < -1); }).map((x) => (x.getAttribute('title') || x.textContent).trim().slice(0, 30)).slice(0, 6) })), needle);

test('DG-05 · PLAN-05 · bars on a phone wrap instead of hiding tools: tasks tool bar and filter row, plan lens hint', { timeout: 400000 }, async () => {
  for (const [tag, dev] of DEVS) {
    const s = await open(dev); const p = s.page;
    await s.go('#/tasks', 5000);
    const tb = await hidden(p, 'الإنتاجية');
    assert.ok(tb.length >= 1, tag + ': the tasks tool bar is shown');
    for (const x of tb) assert.ok(x.sw <= x.cw + 1 && !x.out.length, tag + ': the tasks tool bar hides nothing ' + JSON.stringify(x));
    await p.locator('main button', { hasText: /^\s*فلاتر/ }).first().click(); await p.waitForTimeout(1200);
    const fr = await hidden(p, 'فلترة:');
    assert.ok(fr.length >= 1, tag + ': the filter row opened');
    for (const x of fr) assert.ok(x.sw <= x.cw + 1 && !x.out.length, tag + ': the filter row hides nothing ' + JSON.stringify(x));
    await noSideScroll(p, tag + ' · tasks');
    await s.go('#/plan', 6000);
    const lh = await hidden(p, 'عدسة');
    assert.ok(lh.length >= 1, tag + ': the plan lens hint is shown');
    for (const x of lh) assert.ok(x.sw <= x.cw + 1 && !x.out.length, tag + ': the lens hint hides nothing ' + JSON.stringify(x));
    await noSideScroll(p, tag + ' · plan');
    assert.deepEqual(s.errs, [], tag + ': no page errors'); await s.ctx.close();
  }
});

test('PLAN-05 · iPad Pro 11 landscape: the map side panel does not open by itself; with 3+ badges their names drop «مؤشرات» and are not cut', { timeout: 300000 }, async () => {
  const s = await open(TABLET_L); const p = s.page;
  await s.go('#/plan', 6000);
  const st = await p.evaluate(() => { const sh = document.querySelector('main .bs-panel-shell'); return { w: innerWidth, open: !!sh && getComputedStyle(sh).pointerEvents !== 'none', card: Math.round(document.querySelector('main .bs-mapcard').getBoundingClientRect().width) }; });
  assert.equal(st.w, 1194);
  assert.equal(st.open, false, 'the side panel is closed at 1194px ' + JSON.stringify(st));
  await p.locator('main button[title="فتح لوحة المؤشرات"]').first().click(); await p.waitForTimeout(1500);
  const L = await p.evaluate(() => [...document.querySelectorAll('main .bs-panel-shell *')].filter((e) => e.getClientRects().length && e.children.length === 0 && /^(مؤشرات )?(المصليات|المسارات|التوزيع|الكثافة)$/.test(e.textContent.trim()))
    .map((e) => ({ t: e.textContent.trim(), cut: e.scrollWidth > e.clientWidth + 1 })));
  assert.ok(L.length >= 3, 'three badges or more ' + JSON.stringify(L));
  for (const x of L) { assert.ok(!/^مؤشرات /.test(x.t), '«' + x.t + '» drops «مؤشرات»'); assert.equal(x.cut, false, '«' + x.t + '» is not cut'); }
  await noSideScroll(p, 'iPad landscape · plan');
  assert.deepEqual(s.errs, [], 'no page errors'); await s.ctx.close();
});
