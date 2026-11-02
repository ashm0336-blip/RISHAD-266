/* RISHAD-266 · live check of the "+ قسم" button beside the unit switcher (TEST deployment only).
   Env (never the chat): KIVO_TEST_SUPER_UN/PW, KIVO_TEST_MGR_UN/PW, KIVO_TEST_EMP_UN/PW, KIVO_TEST_DEPT (the manager's department).
   The manager signs in through the form, expands the sidebar, adds a TEST_ONLY section from the dialog, and the section must exist on the
   server under his department. The employee must not see the button. Leaves behind the TEST_ONLY section (no deletion is performed). */
const { chromium } = require('playwright');
const BASE = (process.env.KIVO_TEST_BASE || 'https://test.kivo-d81.pages.dev').replace(/\/$/, ''), E = process.env;
if (!/^(test|[0-9a-f]{8})\.kivo-d81\.pages\.dev$/.test(new URL(BASE).hostname)) { console.error('Test only'); process.exit(2); }
const _x = 0, out = (id, pass, d) => console.log(JSON.stringify({ id, pass: !!pass, d }));
async function login(b, un, pw, mobile) {
  const ctx = await b.newContext(mobile ? { viewport: { width: 390, height: 844 } } : { viewport: { width: 1366, height: 900 } }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2000);
  await p.fill('input:not([type=password])', un); await p.fill('input[type=password]', pw);
  await Promise.all([p.waitForTimeout(8000), p.click('button:has-text("تسجيل الدخول")')]);
  if (!mobile) { const tog = await p.$('.s-tog2'); const cx = await p.evaluate(() => { const a = document.querySelector('.bsb'); return !!(a && a.classList.contains('cx')); }); if (tog && cx) { await tog.click(); await p.waitForTimeout(800); } }
  return { p, errs };
}
(async () => {
  const b = await chromium.launch();
  const m = await login(b, E.KIVO_TEST_MGR_UN, E.KIVO_TEST_MGR_PW);
  const btn = await m.p.$('button.s-secadd'); out('MGR:secadd-visible', !!btn && await btn.isVisible(), null);
  const name = 'TEST_ONLY قسم من الزر ' + Date.now().toString(36);
  if (btn) {
    await btn.click(); await m.p.waitForTimeout(800);
    const inp = await m.p.$('#bsCfmTyped'); out('MGR:secadd-dialog-input', !!inp, null);
    if (inp) { await inp.fill(name); await Promise.all([m.p.waitForTimeout(12000), m.p.click('#bsCfmOk')]); }
    const reg = await m.p.evaluate(async () => { const r = await fetch('/api/get?keys=bassam_depts_v1'); const j = await r.json(); return JSON.parse(j.keys.bassam_depts_v1.v || '[]'); });
    const sec = reg.find((x) => x.name === name);
    out('MGR:secadd-saved-on-server', !!sec && sec.kind === 'قسم' && sec.gid === E.KIVO_TEST_DEPT, sec || null);
  }
  out('MGR:no-page-errors', m.errs.length === 0, m.errs.slice(0, 3));
  const e = await login(b, E.KIVO_TEST_EMP_UN, E.KIVO_TEST_EMP_PW);
  out('EMP:secadd-hidden', !(await e.p.$('button.s-secadd')), null);
  const s = await login(b, E.KIVO_TEST_SUPER_UN, E.KIVO_TEST_SUPER_PW);
  const sb = await s.p.$('button.s-secadd'); out('SUPER:secadd-state', true, { visible: !!sb, note: 'visible only when the active unit is a department' });
  await b.close();
})();
