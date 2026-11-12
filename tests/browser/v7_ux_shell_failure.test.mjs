/* V7 UX states · step 1 — the page-load failure card of the page runtime must really be seen (lab: TEST_ONLY data, no network).
   Defect on develop@5add483: when the operational read of a page fails (network abort or HTTP 500) the runtime inserted the
   failure card and removed it within the same frame, then re-read silently forever — the skeleton stayed (43 s observed) and the
   user never got the card or its retry button. Here, in a real browser over the built package:
   (1) read aborted  ⇒ the card appears, STAYS, the silent re-read loop stops; the retry button recovers the page;
   (2) read HTTP 500 ⇒ the same card; the browser `online` event recovers the page with no click. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const READ = /\/api\/operations\/read/;
const state = (page) => page.evaluate(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const main = document.querySelector('main.bs-main') || document.body;
  const cards = [...main.querySelectorAll('[role=alert]')].filter(vis).filter((e) => /تعذّر/.test(e.textContent));
  return { card: cards.length, text: cards.map((e) => e.textContent.replace(/\s+/g, ' ').trim()).join(' | '), buttons: cards.reduce((n, e) => n + [...e.querySelectorAll('button')].filter(vis).length, 0),
    page: !!main.querySelector('.sc-host[data-sc-name="Staffing"] > :not(.sc-placeholder):not([data-ps])') };
});
async function failThenSee(page, gate, how) {
  gate.mode = how; gate.reads = 0;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => [...document.querySelectorAll('main [role=alert]')].some((e) => /تعذّر/.test(e.textContent) && e.getBoundingClientRect().height > 0), null, { timeout: 20000 });
  /* the card stays: sampled every 400 ms for 8 s — and the read is not hammered behind it */
  const before = gate.reads; let seen = 0, samples = 0;
  for (let i = 0; i < 20; i++) { await page.waitForTimeout(400); const s = await state(page); samples++; if (s.card === 1 && s.buttons === 1 && !s.page) seen++; }
  assert.equal(seen, samples, how + ': the failure card with exactly one retry button stays visible (seen in ' + seen + '/' + samples + ' samples)');
  assert.ok(gate.reads - before <= 1, how + ': no silent re-read loop behind the card (reads in 8 s: ' + (gate.reads - before) + ')');
}

test('operations read fails ⇒ the failure card is visible and stays; the button and the online event recover the page', { timeout: 300000 }, async () => {
  const lab = await startLab(), b = await chromium.launch(); let s = null;
  try {
    s = await openAs(b, lab, LAB.mgrA, LAB.pw); const page = s.page; page.setDefaultTimeout(20000);
    const gate = { mode: '', reads: 0 };
    await page.route('**/api/operations/read**', (route) => {
      if (!READ.test(new URL(route.request().url()).pathname)) return route.continue();
      gate.reads++;
      if (gate.mode === 'abort') return route.abort('failed');
      if (gate.mode === 'http500') return route.fulfill({ status: 500, contentType: 'application/json', body: '{"ok":0,"err":"lab"}' });
      return route.continue();
    });
    await s.go('#/staffing', 2500);
    assert.equal((await state(page)).page, true, 'the page shows before the failure is injected');

    await failThenSee(page, gate, 'abort');
    gate.mode = '';
    await page.locator('main [role=alert] button').first().click();
    await page.waitForFunction(() => !!document.querySelector('main .sc-host[data-sc-name="Staffing"] > :not(.sc-placeholder):not([data-ps])'), null, { timeout: 15000 });
    await page.waitForTimeout(600);
    assert.equal((await state(page)).card, 0, 'abort: the card is gone once the retry succeeds');

    await failThenSee(page, gate, 'http500');
    gate.mode = '';
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await page.waitForFunction(() => !!document.querySelector('main .sc-host[data-sc-name="Staffing"] > :not(.sc-placeholder):not([data-ps])'), null, { timeout: 15000 });
    await page.waitForTimeout(600);
    assert.equal((await state(page)).card, 0, 'http500: the card is gone after the online event, with no click');
    assert.deepEqual(s.errs, [], 'no page errors');
  } finally { try { if (s) await s.ctx.close(); } catch (e) { /* closed */ } await b.close(); await lab.close(); }
});
