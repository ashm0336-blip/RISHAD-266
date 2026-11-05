/* RISHAD-266 · browser helpers for the isolated lab (tests/browser/local_server.mjs). Uses the pre-installed Playwright
   (global install; KIVO_PLAYWRIGHT overrides the module path). Every action goes through the real UI. */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
const pwRoot = process.env.KIVO_PLAYWRIGHT || (execSync('npm root -g').toString().trim() + '/');
export const { chromium } = createRequire(pwRoot)('playwright');
export async function openAs(browser, lab, un, pw, opts = {}) {
  const ctx = await browser.newContext(Object.assign({ viewport: opts.viewport || { width: 1366, height: 900 } }, opts.context || {}));   /* opts.context: e.g. timezoneId */
  const page = await ctx.newPage(), errs = [], writes = [];
  page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 300)));
  page.on('request', (r) => { if (!['GET', 'HEAD'].includes(r.method())) writes.push(r.method() + ' ' + new URL(r.url()).pathname); });
  if (typeof opts.onPage === 'function') await opts.onPage(page);   /* lets a test attach its own listeners (or set page.clock) before sign-in */
  await page.goto(lab.base + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type=password]', { timeout: 30000 });
  /* submit, and make sure the sign-in request was really sent: right after load (or a sign-out) the form can still be wiring up,
     and an Enter pressed then is dropped. If no /api/login goes out within 8 s, fill and submit once more. The server's answer is not
     retried — a refused sign-in still fails below. */
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.fill('input:not([type=password]):not([type=hidden])', un);
    await page.fill('input[type=password]', pw);
    const sent = page.waitForRequest((r) => /\/api\/login\b/.test(r.url()) && r.method() === 'POST', { timeout: 8000 }).then(() => true, () => false);
    await page.keyboard.press('Enter');
    if (await sent) break;
  }
  try { await page.waitForFunction(() => !document.querySelector('input[type=password]'), null, { timeout: 30000 }); }
  catch (e) { let seen = ''; try { seen = (await page.evaluate(() => location.href + ' :: ' + document.body.innerText)).replace(/\s+/g, ' ').slice(0, 400); } catch (x) { seen = String(x && x.message || x).slice(0, 200); } throw new Error('sign-in did not complete in 30 s for ' + un + ' — page shows: ' + seen); }   /* say what the page shows */
  await page.waitForTimeout(2500);
  const api = (u, init) => page.evaluate(async ([u, init]) => { const r = await fetch(u, Object.assign({ headers: { 'Content-Type': 'application/json' } }, init || {})); let j = null; try { j = await r.json(); } catch (e) {} return { status: r.status, j }; }, [u, init || null]);
  const go = async (hash, ms) => { await page.evaluate((h) => { location.hash = h; }, hash); await page.waitForTimeout(ms || 3500); };
  return { ctx, page, errs, writes, api, go };
}
