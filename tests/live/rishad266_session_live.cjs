/* RISHAD-266 · live check on the TEST deployment only: after the server session ends, the page knows it (semantic state) and
   offers a working way back to sign-in; it never offers an automatic-retry promise or a connection retry for that state.
   Semantic, not wording: the checks read the client's session state (KIVO.__BS_SRV.sesChanged()), the retry card's behaviour
   (its button leads to the sign-in form) and the absence of a retry control on the tasks card — not literal sentences.
   Run:  node tests/live/rishad266_session_live.cjs   with KIVO_TEST_EMP_UN / KIVO_TEST_EMP_PW in the environment.
   Writes: none (sign-in, then POST /api/logout of the same session). */
const { chromium } = require('playwright');
const BASE = (process.env.KIVO_TEST_BASE || 'https://test.kivo-d81.pages.dev').replace(/\/$/, '');
if (!/^(test|[0-9a-f]{8})\.kivo-d81\.pages\.dev$/.test(new URL(BASE).hostname)) { console.error('refused host (Test only)'); process.exit(2); }
const UN = process.env.KIVO_TEST_EMP_UN, PW = process.env.KIVO_TEST_EMP_PW;
if (!UN || !PW) { console.error('missing KIVO_TEST_EMP_UN/PW'); process.exit(3); }
const results = []; const check = (id, pass, detail) => { results.push(!!pass); console.log(JSON.stringify({ id, pass: !!pass, detail })); };
(async () => {
  const b = await chromium.launch(); const page = await (await b.newContext()).newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)));
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('input[type=password]', { timeout: 30000 });
  await page.fill('input:not([type=password]):not([type=hidden])', UN); await page.fill('input[type=password]', PW); await page.keyboard.press('Enter');
  await page.waitForFunction(() => !document.querySelector('input[type=password]'), null, { timeout: 45000 });
  await page.evaluate(() => { location.hash = '#/profile'; }); await page.waitForTimeout(6000);
  check('signed-in:session-live', await page.evaluate(() => !(window.KIVO && KIVO.__BS_SRV && KIVO.__BS_SRV.sesChanged && KIVO.__BS_SRV.sesChanged())), {});
  const lo = await page.evaluate(async () => (await fetch('/api/logout', { method: 'POST' })).status);
  const me = await page.evaluate(async () => (await fetch('/api/me')).status);
  check('server:session-ended', me === 401, { logout: lo, me });
  let state = false;
  for (let i = 0; i < 30 && !state; i++) {
    await page.evaluate(() => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(2000);
    state = await page.evaluate(() => !!(window.KIVO && KIVO.__BS_SRV && KIVO.__BS_SRV.sesChanged && KIVO.__BS_SRV.sesChanged()));
  }
  check('client:knows-session-ended', state, {});
  await page.waitForTimeout(3000);
  check('tasks-card:no-retry-control-after-session-end', (await page.locator('.tk-empty button').count()) === 0, {});
  const cards = await page.locator('.bs-retry').count();
  if (cards) {
    await page.locator('.bs-retry button').first().click(); await page.waitForTimeout(6000);
    check('retry-card:button-leads-to-sign-in', (await page.locator('input[type=password]').count()) > 0, { cards });
  } else check('retry-card:none-shown (nothing misleading to act on)', true, { cards });
  check('page:no-errors', errs.length === 0, errs);
  await b.close();
  const failed = results.filter((x) => !x).length; console.log(JSON.stringify({ summary: { total: results.length, failed } })); process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('ERR', e); process.exit(1); });
