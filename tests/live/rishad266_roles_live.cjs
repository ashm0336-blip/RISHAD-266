/* RISHAD-266 · live role checks on the TEST deployment only (owner rule: browser tests of roles, saves and privacy on Test).
   Run:  node tests/live/rishad266_roles_live.cjs   (needs the Playwright that ships with the environment)
   Reads synthetic TEST_ONLY credentials from the environment ONLY (never from the chat, never the owner's account):
     KIVO_TEST_BASE (default https://test.kivo-d81.pages.dev)
     KIVO_TEST_SUPER_UN/PW · KIVO_TEST_MGR_UN/PW · KIVO_TEST_EMP_UN/PW   (MGR and EMP in the same department)
   Guards: refuses any host other than test.kivo-d81.pages.dev or <hash>.kivo-d81.pages.dev; refuses the production apex.
   Writes it may do, all reverted before it ends:  the employee's own password (changed to a temporary one, then back);
   the employee account's display name by the manager (changed, then restored). Refused attempts write nothing.
   Output: one JSON line per check + a summary; exit 1 if any check fails. */
const { chromium } = require('playwright');
const crypto = require('node:crypto');
const BASE = (process.env.KIVO_TEST_BASE || 'https://test.kivo-d81.pages.dev').replace(/\/$/, '');
const host = new URL(BASE).hostname;
if (!/^(test|[0-9a-f]{8})\.kivo-d81\.pages\.dev$/.test(host)) { console.error('refused host ' + host + ' (Test only)'); process.exit(2); }
const need = ['SUPER', 'MGR', 'EMP'].map((r) => [r, process.env['KIVO_TEST_' + r + '_UN'], process.env['KIVO_TEST_' + r + '_PW']]);
if (need.some(([, u, p]) => !u || !p)) { console.error('missing KIVO_TEST_{SUPER,MGR,EMP}_{UN,PW} in the environment'); process.exit(3); }
const CRED = Object.fromEntries(need.map(([r, u, p]) => [r, { un: u, pw: p }]));
const results = []; const check = (id, pass, detail) => { results.push({ id, pass: !!pass, detail }); console.log(JSON.stringify({ id, pass: !!pass, detail })); };
const ph = (pw) => { const s = crypto.randomBytes(16); return 'p2$100000$' + s.toString('hex') + '$' + crypto.pbkdf2Sync(pw, s, 100000, 32, 'sha256').toString('hex'); };
const KU = 'bassam_auth_users_v1', KP = 'bassam_perms_v1';

async function session(browser, role) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } }), page = await ctx.newPage();
  const errs = [], writes = [];
  page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 200)));
  page.on('request', (r) => { if (!['GET', 'HEAD'].includes(r.method())) writes.push(r.method() + ' ' + new URL(r.url()).pathname); });
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  const api = (p, o) => page.evaluate(async ([p, o]) => { const r = await fetch(p, Object.assign({ credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } }, o || {})); let j = null; try { j = await r.json(); } catch (e) {} return { status: r.status, j }; }, [p, o || null]);
  const login = (un, pw) => api('/api/login', { method: 'POST', body: JSON.stringify({ u: un, p: pw }) });
  const l = await login(CRED[role].un, CRED[role].pw);
  return { ctx, page, api, login, errs, writes, ok: l.j && l.j.ok === 1, me: l.j };
}
async function getKey(s, k) { const g = await s.api('/api/get?keys=' + encodeURIComponent(k)); return { g, it: ((g.j || {}).keys || {})[k] || null }; }
async function save(s, k, v, extra) {
  const { g, it } = await getKey(s, k); const body = Object.assign({ set: { [k]: JSON.stringify(v) }, del: [], base: { [k]: (it && it.rev) || 0 } }, extra || {});
  if (k === KU && g.j && g.j.uscope !== undefined) body.uscope = g.j.uscope; if (k === KP && g.j && g.j.pscope !== undefined) body.pscope = g.j.pscope;
  const r = await s.api('/api/save', { method: 'POST', body: JSON.stringify(body) }); const d = ((r.j || {}).denied || {})[k] || ((r.j || {}).conflicts || {})[k] || null;
  return { status: r.status, ok: !!(r.j && r.j.revs && r.j.revs[k]), why: d ? (d.why || 'conflict') : '', raw: JSON.stringify(r.j || {}).slice(0, 200) };
}
async function uiOpen(s, role) {
  s.writes.length = 0; s.errs.length = 0;
  await s.page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 90000 }); await s.page.waitForTimeout(4000);
  await s.page.screenshot({ path: 'live_' + role + '.png' });
  check(role + ':ui-open-no-error', s.errs.length === 0, s.errs.slice(0, 3));
  check(role + ':ui-open-no-write', s.writes.filter((w) => !/\/api\/(login|changes|ping)/.test(w)).length === 0, s.writes.slice(0, 5));
}

(async () => {
  const browser = await chromium.launch();
  try {
    /* ── system administrator ── */
    const su = await session(browser, 'SUPER'); check('SUPER:login', su.ok, su.me && su.me.role);
    check('SUPER:role', su.me && su.me.role === 'super', su.me && su.me.role);
    await uiOpen(su, 'SUPER');
    const U0 = JSON.parse((await getKey(su, KU)).it.v), mgrRow = U0.find((u) => u.un === CRED.MGR.un), empRow = U0.find((u) => u.un === CRED.EMP.un);
    check('SUPER:sees-test-accounts', !!(mgrRow && empRow), { mgr: !!mgrRow, emp: !!empRow });
    const dept = (mgrRow || {}).deptId;
    const r1 = await save(su, KU, U0.concat([{ id: 'TEST_ONLY_dept_' + Date.now(), un: '1999999901', ph: ph('TEST_ONLY_x'), name: 'TEST_ONLY dept', role: 'dept', deptId: dept, dis: 0, test: 'TEST_ONLY' }]));
    check('SUPER:dept-account-refused', !r1.ok && r1.why === 'dept-role', r1);
    const U1 = JSON.parse((await getKey(su, KU)).it.v); check('SUPER:dept-refusal-wrote-nothing', JSON.stringify(U1) === JSON.stringify(U0), U1.length);
    /* ── department manager ── */
    const mg = await session(browser, 'MGR'); check('MGR:login', mg.ok, mg.me && mg.me.role);
    await uiOpen(mg, 'MGR');
    const P = await getKey(mg, KP), pv = JSON.parse(P.it.v);
    const sheetUnits = Object.keys(pv.emps || {}).filter((d) => Object.keys(pv.emps[d] || {}).length);
    check('MGR:perms-filtered', P.g.j.pscope !== undefined && sheetUnits.every((d) => d === dept), { sheetUnits, pscope: P.g.j.pscope !== undefined });
    const own = JSON.parse(JSON.stringify(pv)); own.emps = own.emps || {}; own.emps[dept] = own.emps[dept] || {}; own.emps[dept][mgrRow.ekey] = { help: ['view'] };
    const r2 = await save(mg, KP, own); check('MGR:cannot-write-own-sheet', !r2.ok && ['self', 'target', 'grant'].includes(r2.why), r2);
    const UM = JSON.parse((await getKey(mg, KU)).it.v), nm0 = (UM.find((u) => u.un === CRED.EMP.un) || {}).name;
    const r3 = await save(mg, KU, UM.map((u) => (u.un === CRED.EMP.un ? Object.assign({}, u, { name: nm0 + ' ·' }) : u)));
    check('MGR:legit-save-employee-name', r3.ok, r3);
    const UM2 = JSON.parse((await getKey(mg, KU)).it.v); const r4 = await save(mg, KU, UM2.map((u) => (u.un === CRED.EMP.un ? Object.assign({}, u, { name: nm0 }) : u)));
    check('MGR:legit-save-reverted', r4.ok, r4);
    /* ── employee ── */
    const em = await session(browser, 'EMP'); check('EMP:login', em.ok, em.me && em.me.role);
    await uiOpen(em, 'EMP');
    const boot = await em.page.evaluate(() => JSON.stringify(window.__BS_BOOT || {}));
    const opr = await em.api('/api/operations/read?keys=' + encodeURIComponent('bsdept:' + dept + ':bassam_employees_v1'));
    const blob = boot + JSON.stringify(opr.j || {}) + JSON.stringify((await getKey(em, KU)).g.j || {});
    check('EMP:no-colleague-identity-leak', !blob.includes(CRED.MGR.un), { opStatus: opr.status });
    const pe = await getKey(em, KP); const pev = pe.it ? JSON.parse(pe.it.v) : {};
    check('EMP:perms-registry-not-full', !pe.it || Object.keys((pev.emps || {})[dept] || {}).length <= 1, Object.keys((pev.emps || {})[dept] || {}).length);
    const ex = await em.api('/api/operations/export?dept=' + encodeURIComponent(dept)); check('EMP:export-refused', ex.status === 403 || (ex.j && ex.j.ok === 0), ex.status);
    /* own password: temporary, session kept, then restored */
    const tmp = 'T' + crypto.randomBytes(6).toString('hex');
    const UE = JSON.parse((await getKey(em, KU)).it.v);
    const r5 = await save(em, KU, UE.map((u) => (u.un === CRED.EMP.un ? Object.assign({}, u, { ph: ph(tmp) }) : u)));
    check('EMP:self-password-change', r5.ok, r5);
    const me1 = await em.api('/api/me'); check('EMP:session-kept-after-change', me1.status === 200, me1.status);
    const viaTmp = await em.page.evaluate(async ([u, p]) => { const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ u, p }) }); return (await r.json()).ok; }, [CRED.EMP.un, tmp]);
    check('EMP:login-with-temporary-password', viaTmp === 1, viaTmp);
    const UE2 = JSON.parse((await getKey(em, KU)).it.v);
    const r6 = await save(em, KU, UE2.map((u) => (u.un === CRED.EMP.un ? Object.assign({}, u, { ph: ph(CRED.EMP.pw) }) : u)));
    check('EMP:password-restored', r6.ok, r6);
    const back = await em.login(CRED.EMP.un, CRED.EMP.pw); check('EMP:login-with-original-after-restore', back.j && back.j.ok === 1, back.status);
  } catch (e) { check('run', false, String(e && e.stack || e).slice(0, 400)); }
  finally { await browser.close(); }
  const bad = results.filter((r) => !r.pass); console.log(JSON.stringify({ summary: { total: results.length, failed: bad.length } }));
  process.exit(bad.length ? 1 : 0);
})();
