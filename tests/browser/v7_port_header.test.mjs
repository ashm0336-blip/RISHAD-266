/* RISHAD V7 port · batch 3 — the map header (isolated lab, TEST_ONLY data; owner decision 2026-11-11).
   On the operational plan map («التشغيل الميداني») and the daily rounds map, at phone (390×844) and tablet (820×1180) touch viewports,
   signed in as the platform administrator, the test measures in a real browser:
     · the header is ONE row: its visible children share one vertical centre and no child sits below another;
     · the header scrolls horizontally AS A WHOLE: it overflows (scrollWidth > clientWidth), scrolling it moves the site picker and the
       tools bar by the same distance, nothing in it is position:sticky/fixed, and the inner tools bar has no scroll of its own;
     · the last control of the bar is reachable by scrolling;
     · the page itself has no horizontal scroll;
     · on touch (pointer: coarse) every button of the header is at least 44px tall and 44px wide;
     · the site menu opens inside the viewport and follows its button when the header scrolls (it is placed by 650-dropdown-unify);
     · at ≤ 980px the workspace row carries --bs-canvas-panel-top = the header's bottom edge.
   The lab has no plan and no rounds, so the header would not render: the minimum is seeded through the lab's typed operational fixture
   (two empty sites in this month's plan, and today's round over the same two sites). Nothing is written through the UI. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';
import { replaceOperationalFixture } from '../unit/operational_legacy_seed_fx.mjs';

const A = 'TEST_ONLY_A';
const VIEWPORTS = [['phone', { width: 390, height: 844 }], ['tablet', { width: 820, height: 1180 }]];
/* the lab server keeps the Makkah calendar day; the browser must agree on «today» (the container clock is UTC) */
const TZ = { timezoneId: 'Asia/Riyadh' };
const site = (i) => ({ sid: 'TEST_ONLY_SITE_' + i, name: 'TEST_ONLY موقع ' + (i + 1), num: i, approved: false, zones: [], gates: [], marks: [], paths: [], sectors: [] });

async function seed(lab, b) {
  const s = await openAs(b, lab, LAB.superUn, LAB.superPw, { context: TZ });
  const day = (await s.api('/api/me/today')).j.day; await s.ctx.close();
  assert.ok(day && day.ym && day.dk, 'the lab calendar day');
  const floors = [site(0), site(1)];
  await replaceOperationalFixture(lab.env, 'bsdept:' + A + ':bassam_plan_v1', { pMig: 3, floors, months: { [day.ym]: { c: 1, d: JSON.parse(JSON.stringify(floors)) } }, cfg: {}, delMonths: {} });
  await replaceOperationalFixture(lab.env, 'bsdept:' + A + ':bassam_rounds_v1', { [day.dk]: { t: 1, ap: 0, auto: 1, d: floors.map((f) => ({ sid: f.sid, zones: [], gates: [], marks: [], paths: [] })) } });
}

/* everything is measured inside the page, on the one visible map header */
const measure = () => {
  const vis = (e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
  const hs = [...document.querySelectorAll('main .bs-canvas-header')].filter(vis);
  if (hs.length !== 1) return { headers: hs.length };
  const h = hs[0], hr = h.getBoundingClientRect(), R = (e) => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, mid: (r.top + r.bottom) / 2 }; };
  const kids = [...h.children].filter(vis), group = kids.find((k) => k.querySelector('#bsFldBox')), tools = kids.find((k) => k.classList.contains('bs-hbar'));
  const picker = h.querySelector('#bsFldBox > button');
  const pinned = [...h.querySelectorAll('*')].filter((e) => /sticky|fixed/.test(getComputedStyle(e).position)).map((e) => e.tagName + '.' + e.className);
  h.scrollLeft = 0;
  const before = { picker: R(picker).left, tools: R(tools).left };
  const max = h.scrollWidth - h.clientWidth;
  h.scrollLeft = -max;   /* RTL: the scroll offset runs to negative values */
  const moved = Math.abs(h.scrollLeft), after = { picker: R(picker).left, tools: R(tools).left };
  const btns = [...h.querySelectorAll('button')].filter(vis), last = btns[btns.length - 1], lr = R(last);
  const out = {
    headers: 1, coarse: matchMedia('(pointer: coarse)').matches,
    clientWidth: h.clientWidth, scrollWidth: h.scrollWidth, overflowX: getComputedStyle(h).overflowX, flexWrap: getComputedStyle(h).flexWrap,
    kids: kids.map((k) => { const r = R(k); return { cls: k.className, top: Math.round(r.top), bottom: Math.round(r.bottom), mid: r.mid }; }),
    headerHeight: hr.height, hasGroup: !!group, hasTools: !!tools,
    toolsOwnScroll: tools ? tools.scrollWidth - tools.clientWidth : -1, toolsOverflowX: tools ? getComputedStyle(tools).overflowX : '',
    pinned, moved, max, pickerShift: after.picker - before.picker, toolsShift: after.tools - before.tools,
    lastReach: lr.left >= hr.left - 1 && lr.right <= hr.right + 1, lastTitle: last.getAttribute('title') || last.innerText.trim(),
    buttons: btns.map((e) => { const r = e.getBoundingClientRect(); return { t: (e.getAttribute('title') || e.innerText || '').trim().slice(0, 40), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 }; }),
    others: [...h.querySelectorAll('a[href],select,input,[role=button]')].filter(vis).map((e) => ({ t: e.tagName, h: e.getBoundingClientRect().height })),
    pageScroll: { doc: document.documentElement.scrollWidth, win: window.innerWidth, body: document.body.scrollWidth },
    print: (() => { const p = h.querySelector('button[title^="طباعة الخريطة"]'), fs = p && p.parentElement.querySelector('button[title*="ملء الشاشة"],button[title*="الشاشة"]'); return p ? { inTools: tools.contains(p), boxKids: p.parentElement.children.length, besideFs: !!fs } : null; })(),
    panelTop: (() => { const ws = h.closest('.bs-ws-row'); return ws ? { v: ws.style.getPropertyValue('--bs-canvas-panel-top'), want: Math.ceil(hr.bottom - ws.getBoundingClientRect().top) } : null; })(),
  };
  h.scrollLeft = 0;
  return out;
};

async function check(p, tag, vp) {
  try { await p.waitForSelector('main .bs-canvas-header', { timeout: 20000 }); }
  catch (e) { throw new Error(tag + ': the map header did not render — page shows: ' + (await p.evaluate(() => document.querySelector('main').innerText)).replace(/\s+/g, ' ').slice(0, 300)); }
  await p.waitForTimeout(800);
  const m = await p.evaluate(measure);
  assert.equal(m.headers, 1, tag + ': exactly one visible map header');
  assert.equal(m.coarse, true, tag + ': the viewport is a touch viewport (pointer: coarse)');
  assert.ok(m.hasGroup && m.hasTools, tag + ': the site group and the tools bar are children of the header');
  /* one row */
  assert.equal(m.flexWrap, 'nowrap', tag + ': the header does not wrap');
  assert.ok(m.kids.length >= 2, tag + ': children ' + JSON.stringify(m.kids));
  for (const k of m.kids) assert.ok(Math.abs(k.mid - m.kids[0].mid) <= 1.5, tag + ': children share one row (vertical centres) ' + JSON.stringify(m.kids));
  const tallest = Math.max(...m.kids.map((k) => k.bottom - k.top));
  assert.ok(m.headerHeight <= tallest + 24, tag + ': header height ' + m.headerHeight + ' is one row of ' + tallest + 'px + padding');
  /* scrolls as a whole */
  assert.ok(m.scrollWidth > m.clientWidth, tag + ': the header overflows at ' + vp.width + 'px (' + m.scrollWidth + ' > ' + m.clientWidth + ')');
  assert.equal(m.overflowX, 'auto', tag);
  assert.ok(m.moved > 20 && Math.abs(m.moved - m.max) <= 1, tag + ': the header scrolled to its end (' + m.moved + ' of ' + m.max + ')');
  assert.ok(Math.abs(m.pickerShift - m.moved) <= 1, tag + ': the site picker moves with the bar (' + m.pickerShift + ' vs ' + m.moved + ')');
  assert.ok(Math.abs(m.toolsShift - m.moved) <= 1, tag + ': the tools bar moves with the bar (' + m.toolsShift + ' vs ' + m.moved + ')');
  assert.deepEqual(m.pinned, [], tag + ': nothing sticky/fixed inside the header');
  assert.ok(m.toolsOwnScroll <= 1 && m.toolsOverflowX === 'visible', tag + ': the tools bar has no scroll of its own (' + m.toolsOwnScroll + ', ' + m.toolsOverflowX + ')');
  assert.equal(m.lastReach, true, tag + ': the last control («' + m.lastTitle + '») is reachable by scrolling');
  /* the page itself does not scroll sideways */
  assert.ok(m.pageScroll.doc <= m.pageScroll.win && m.pageScroll.body <= m.pageScroll.win, tag + ': no horizontal page scroll ' + JSON.stringify(m.pageScroll));
  /* touch targets */
  assert.ok(m.buttons.length >= 5, tag + ': header buttons ' + m.buttons.length);
  for (const x of m.buttons) assert.ok(x.h >= 44 && x.w >= 44, tag + ': «' + x.t + '» is ' + x.w + '×' + x.h + ' (needs 44×44)');
  for (const x of m.others) assert.ok(x.h >= 44, tag + ': ' + x.t + ' is ' + x.h + 'px tall');
  /* the print control stays where it was: inside the zoom box of the tools bar, beside full screen */
  assert.ok(m.print && m.print.inTools && m.print.besideFs, tag + ': print stays in the zoom box ' + JSON.stringify(m.print));
  /* the floating side panel (≤ 980px) starts under the header */
  assert.ok(m.panelTop && m.panelTop.v === m.panelTop.want + 'px', tag + ': --bs-canvas-panel-top ' + JSON.stringify(m.panelTop));

  /* the site menu: inside the viewport, under (or above) its button, and it follows the button when the header scrolls */
  const trig = p.locator('main .bs-canvas-header #bsFldBox > button');
  await trig.click(); await p.waitForTimeout(500);
  const menu = p.locator('main .bs-canvas-header [data-bs-site-menu]');
  assert.equal(await menu.count(), 1, tag + ': the site menu opened');
  const box = () => p.evaluate(() => { const m = document.querySelector('main .bs-canvas-header [data-bs-site-menu]'), t = document.querySelector('main .bs-canvas-header #bsFldBox'), a = m.getBoundingClientRect(), b = t.getBoundingClientRect(), cs = getComputedStyle(m);
    return { l: a.left, r: a.right, t: a.top, b: a.bottom, tr: b.right, tb: b.bottom, tt: b.top, vis: cs.visibility, pos: cs.position, vw: innerWidth, vh: innerHeight, opts: [...m.querySelectorAll('.bs-canvas-site-option')].map((o) => o.getBoundingClientRect().height), btn: [...m.querySelectorAll('button')].map((o) => o.getBoundingClientRect().height) }; });
  const m1 = await box();
  assert.equal(m1.vis, 'visible', tag); assert.equal(m1.pos, 'fixed', tag);
  assert.ok(m1.l >= 0 && m1.r <= m1.vw && m1.t >= 0 && m1.b <= m1.vh, tag + ': the site menu is inside the viewport ' + JSON.stringify(m1));
  assert.ok(Math.abs(m1.t - (m1.tb + 5)) <= 1 || m1.b <= m1.tt, tag + ': the menu hangs from its button');
  assert.equal(m1.opts.length, 2, tag + ': both sites listed');
  for (const hgt of m1.opts.concat(m1.btn)) assert.ok(hgt >= 44, tag + ': site menu rows and buttons are 44px (' + hgt + ')');
  const shift = await p.evaluate(() => { const h = document.querySelector('main .bs-canvas-header'), t = document.querySelector('main .bs-canvas-header #bsFldBox'), b = t.getBoundingClientRect().right; h.scrollLeft = -Math.min(60, h.scrollWidth - h.clientWidth); return t.getBoundingClientRect().right - b; });
  await p.waitForTimeout(400);
  const m2 = await box();
  assert.ok(shift > 20, tag + ': the header scrolled under the open menu (' + shift + ')');
  if (m1.r <= m1.vw - 8 - shift - 1 && m1.l >= 8) assert.ok(Math.abs((m2.r - m1.r) - shift) <= 1.5, tag + ': the menu follows its button (' + (m2.r - m1.r) + ' vs ' + shift + ')');
  else assert.ok(m2.r <= m2.vw && m2.l >= 0, tag + ': the menu stays inside the viewport');
  await p.evaluate(() => { document.querySelector('main .bs-canvas-header').scrollLeft = 0; });
  await trig.click(); await p.waitForTimeout(300);
  assert.equal(await menu.count(), 0, tag + ': the site menu closed');
  return m;
}

test('V7 port · map header: one row that scrolls as a whole, 44px touch targets — plan map and daily rounds, phone and tablet (and desktop unchanged)', { timeout: 600000 }, async () => {
  const lab = await startLab({}); const b = await chromium.launch();
  try {
    await seed(lab, b);
    for (const [name, vp] of VIEWPORTS) {
      const s = await openAs(b, lab, LAB.superUn, LAB.superPw, { viewport: vp, context: { hasTouch: true, isMobile: true, ...TZ } }); s.page.setDefaultTimeout(20000);
      const p = s.page;
      await s.go('#/plan', 4000);
      const plan = await check(p, name + ' · plan', vp);
      await s.go('#/daily', 3500);
      await p.locator('main span', { hasText: /^الجولات اليومية$/ }).first().click(); await p.waitForTimeout(3500);
      const daily = await check(p, name + ' · daily rounds', vp);
      if (process.env.KIVO_SHOTS) { await p.locator('main .bs-canvas-header #bsFldBox > button').click(); await p.waitForTimeout(500); await p.screenshot({ path: process.env.KIVO_SHOTS + '/v7_port_header_' + name + '_daily.png' }); await p.locator('main .bs-canvas-header #bsFldBox > button').click(); }
      console.log(JSON.stringify({ viewport: name, plan: { clientWidth: plan.clientWidth, scrollWidth: plan.scrollWidth, height: plan.headerHeight, buttons: plan.buttons.length, minBtn: Math.min(...plan.buttons.map((x) => x.h)) }, daily: { clientWidth: daily.clientWidth, scrollWidth: daily.scrollWidth, height: daily.headerHeight, buttons: daily.buttons.length, minBtn: Math.min(...daily.buttons.map((x) => x.h)) } }));
      assert.deepEqual(s.errs, [], name + ': no page errors');
      await s.ctx.close();
    }
    /* desktop (1366×900, mouse): the touch rules do not apply, the header is one row and the site menu still opens in the viewport */
    const d = await openAs(b, lab, LAB.superUn, LAB.superPw, { context: TZ }); d.page.setDefaultTimeout(20000);
    for (const which of ['plan', 'daily rounds']) {
      if (which === 'plan') await d.go('#/plan', 4000);
      else { await d.go('#/daily', 3500); await d.page.locator('main span', { hasText: /^الجولات اليومية$/ }).first().click(); await d.page.waitForTimeout(3500); }
      await d.page.waitForSelector('main .bs-canvas-header', { timeout: 20000 });
      const m = await d.page.evaluate(measure);
      assert.equal(m.coarse, false, 'desktop · ' + which);
      for (const k of m.kids) assert.ok(Math.abs(k.mid - m.kids[0].mid) <= 1.5, 'desktop · ' + which + ': one row ' + JSON.stringify(m.kids));
      assert.ok(m.pageScroll.doc <= m.pageScroll.win, 'desktop · ' + which + ': no horizontal page scroll');
      assert.ok(m.buttons.some((x) => x.h < 44), 'desktop · ' + which + ': the 44px rule is touch-only');
      assert.deepEqual(m.pinned, [], 'desktop · ' + which);
      await d.page.locator('main .bs-canvas-header #bsFldBox > button').click(); await d.page.waitForTimeout(500);
      const r = await d.page.evaluate(() => { const e = document.querySelector('main .bs-canvas-header [data-bs-site-menu]'), a = e.getBoundingClientRect(); return { l: a.left, r: a.right, t: a.top, b: a.bottom, vis: getComputedStyle(e).visibility, vw: innerWidth, vh: innerHeight, n: e.querySelectorAll('.bs-canvas-site-option').length }; });
      assert.ok(r.vis === 'visible' && r.n === 2 && r.l >= 0 && r.r <= r.vw && r.t >= 0 && r.b <= r.vh, 'desktop · ' + which + ': site menu ' + JSON.stringify(r));
      await d.page.locator('main .bs-canvas-header #bsFldBox > button').click(); await d.page.waitForTimeout(300);
    }
    assert.deepEqual(d.errs, [], 'desktop: no page errors');
    await d.ctx.close();
  } finally { await b.close(); await lab.close(); }
});
