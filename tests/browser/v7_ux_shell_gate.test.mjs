/* V7 UX states · step 3 — the shell gate draws through the one page-states component (lab: TEST_ONLY data, no network).
   Before this step the runtime placeholder was a shimmer block with a spinner shown at once, and the failure was a red bar above it.
   Now, in a real browser over the built package:
   (1) first load, read delayed ⇒ nothing for 300 ms, then the ONE skeleton (KPI cards + a content card with a toolbar and rows — the
       three per-page templates are gone by owner decision), drawn by the shell in its own state area, no text and no button, no old
       spinner; the content then enters calmly;
   (2) read aborted ⇒ the unified card «تعذّر تحميل الجدول الشهري» in the content centre with exactly one «أعد المحاولة»; no old bar;
   (3) the page file itself cannot be fetched ⇒ the same unified card; the button recovers the page;
   (4) session ended ⇒ stays outside the component: the old sign-in card, no unified card. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const PAGE_OK = 'main .sc-host[data-sc-name="Staffing"] > :not(.sc-placeholder):not([data-ps])';
const WATCH = () => {
  window.__ps = { box: 0, skel: 0, shape: '', text: '', buttons: 0, enter: 0, spinner: '', oldBar: 0 };
  const scan = () => {
    const P = window.__ps, box = document.querySelector('main > .ps-shell > .ps[data-ps="loading"]'), place = document.querySelector('main .sc-placeholder');
    if (box && !P.box) P.box = performance.now();
    const sk = box && box.querySelector('.ps-skel');
    if (sk && !P.skel) {
      P.skel = performance.now(); P.shape = [...sk.children].map((c) => c.className + ':' + [...c.children].map((x) => x.className.split(' ')[0]).join(',')).join(' '); P.text = box.textContent.trim(); P.buttons = box.querySelectorAll('button').length;
      P.card = getComputedStyle(sk.querySelector('.ps-panel')).backgroundColor + '|' + getComputedStyle(document.body).backgroundColor;
      P.spinner = place ? getComputedStyle(place, '::after').content + '|' + getComputedStyle(place, '::before').content : 'no place';
    }
    if (document.querySelector('main .bs-retry')) P.oldBar++;
    if (document.querySelector('main .sc-host.ps-enter') && !P.enter) P.enter = performance.now();
  };
  setInterval(scan, 15);                                   /* sampled every 15 ms (the init script runs before the document exists) */
};
const card = (page) => page.evaluate(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const main = document.querySelector('main.bs-main'), c = [...main.querySelectorAll('.ps-card.ps-fail')].filter(vis), m = main.getBoundingClientRect();
  const r = c[0] && c[0].getBoundingClientRect();
  return { n: c.length, title: c[0] ? c[0].querySelector('.ps-title').textContent : '', line: c[0] ? c[0].querySelector('.ps-text').textContent : '', role: c[0] ? c[0].getAttribute('role') : '',
    buttons: c[0] ? [...c[0].querySelectorAll('button')].filter(vis).map((b) => b.textContent) : [], btnH: c[0] && c[0].querySelector('button') ? c[0].querySelector('button').getBoundingClientRect().height : 0,
    off: r ? Math.abs((r.left + r.right) / 2 - (m.left + m.right) / 2) : -1, oldBar: [...main.querySelectorAll('.bs-retry')].filter(vis).length,
    oldText: [...main.querySelectorAll('.sc-placeholder-error')].filter(vis).length, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
});

test('shell gate: skeleton after 300 ms, unified failure card for a failed read and a failed page file, session end stays outside', { timeout: 420000 }, async () => {
  const lab = await startLab(), b = await chromium.launch(); let s = null;
  try {
    s = await openAs(b, lab, LAB.mgrA, LAB.pw, { onPage: (p) => p.addInitScript(WATCH) }); const page = s.page; page.setDefaultTimeout(20000);
    const gate = { read: '', file: '' };
    await page.route('**/api/operations/read**', async (route) => {
      if (gate.read === 'abort') return route.abort('failed');
      if (gate.read === 'slow') await new Promise((r) => setTimeout(r, 2500));
      return route.continue();
    });
    await page.route('**/assets/pages/Staffing*', (route) => gate.file === 'abort' ? route.abort('failed') : route.continue());
    await s.go('#/staffing', 2500);
    assert.ok(await page.$(PAGE_OK), 'the page shows');

    /* (1) first load with a slow read */
    gate.read = 'slow';
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__ps && window.__ps.skel > 0, null, { timeout: 20000 });
    await page.waitForSelector(PAGE_OK, { timeout: 20000 });
    await page.waitForTimeout(300);
    const w = await page.evaluate(() => window.__ps);
    assert.ok(w.skel - w.box >= 250, 'nothing is drawn for the first 300 ms (skeleton came ' + Math.round(w.skel - w.box) + ' ms after the place)');
    assert.equal(w.shape, 'ps-kpis:ps-kpi,ps-kpi,ps-kpi,ps-kpi ps-panel:ps-tools,ps-rows', 'the one skeleton: a row of KPI cards, then the content card with its toolbar and rows');
    assert.notEqual(w.card.split('|')[0], w.card.split('|')[1], 'the content card stands out from the page background');
    assert.equal(w.text, '', 'no text in the skeleton'); assert.equal(w.buttons, 0, 'no button in the skeleton');
    assert.equal(w.spinner, 'none|none', 'the old spinner and shimmer block are gone');
    assert.equal(w.oldBar, 0, 'no old retry bar during loading');
    assert.ok(w.enter > 0, 'the content enters calmly after a shown skeleton');
    await page.waitForTimeout(1200);
    assert.equal(await page.$('main .sc-host.ps-enter'), null, 'the entrance class is removed afterwards');

    /* (2) the read fails */
    gate.read = 'abort';
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('main .ps-card.ps-fail', { timeout: 25000 });
    let c = await card(page);
    assert.equal(c.n, 1); assert.equal(c.title, 'تعذّر تحميل الجدول الشهري'); assert.equal(c.role, 'alert');
    assert.equal(c.line, 'لم يصل رد من الخادم. بياناتك المحفوظة لم تتأثر، وتُعاد المحاولة تلقائياً عند عودة الاتصال.');
    assert.deepEqual(c.buttons, ['أعد المحاولة'], 'exactly one retry button'); assert.ok(c.btnH >= 44, 'a 44 px touch target');
    assert.ok(c.off < 2, 'the card is centred in the content area (off by ' + c.off + ' px)');
    assert.equal(c.oldBar, 0, 'the old red bar is not drawn'); assert.equal(c.oldText, 0, 'nor the old placeholder text'); assert.ok(c.overflow <= 0, 'no horizontal overflow');
    gate.read = '';
    await page.locator('main .ps-card.ps-fail button').click();
    await page.waitForSelector(PAGE_OK, { timeout: 15000 });
    assert.equal((await card(page)).n, 0, 'the card leaves once the retry succeeds');

    /* (3) the page file cannot be fetched (three quiet retries: 1 + 2 + 4 s) */
    gate.file = 'abort';
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('main .ps-card.ps-fail', { timeout: 40000 });
    c = await card(page);
    assert.equal(c.n, 1); assert.equal(c.title, 'تعذّر تحميل الجدول الشهري'); assert.deepEqual(c.buttons, ['أعد المحاولة']); assert.equal(c.oldBar, 0);
    gate.file = '';
    await page.locator('main .ps-card.ps-fail button').click();
    await page.waitForSelector(PAGE_OK, { timeout: 20000 });
    assert.equal((await card(page)).n, 0);

    /* (4) session ended: outside the component, as before */
    gate.read = 'abort';
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('main .ps-card.ps-fail', { timeout: 25000 });
    await page.evaluate(() => { window.KIVO.__BS_SRV.sesChanged = () => true; window.dispatchEvent(new CustomEvent('bs:session-gone')); });
    await page.waitForSelector('main .bs-retry-page', { timeout: 10000 });
    const g = await page.evaluate(() => ({ bar: document.querySelector('main .bs-retry-page').textContent, fail: document.querySelectorAll('main .ps-card.ps-fail').length }));
    assert.match(g.bar, /انتهت الجلسة — سجّل الدخول/); assert.match(g.bar, /تسجيل الدخول/);
    assert.equal(g.fail, 0, 'no unified failure card for an ended session');
    assert.deepEqual(s.errs, [], 'no page errors');
  } finally { try { if (s) await s.ctx.close(); } catch (e) { /* closed */ } await b.close(); await lab.close(); }
});
