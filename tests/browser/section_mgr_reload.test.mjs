/* RISHAD-266 · Q12 — a department manager who selects one of his own sections stays in it after a page reload.
   Root cause fixed (335:21): the identity gate reset every dept/staff account to its home department on each load, overriding the
   scope guard (320 active() → 335 setScopeGuard), which already allows a manager — the department account or the manager badge — his
   sections exactly as the server does (018 deptInScope · secMgrOf). The guard stays the only rule: an employee, or a manager pointed at a
   unit outside his department (tampered storage), still lands on the home department. Lab: TEST_ONLY data, no network. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const A = 'TEST_ONLY_A', B = 'TEST_ONLY_B', S1 = 'TEST_ONLY_A_S1';
const active = (page) => page.evaluate(() => KIVO.BassamDepts.active());
const reload = async (page) => { await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(3000); };
const serverUnits = (s) => s.api('/api/authz').then((r) => Object.keys(((r.j || {}).me || {}).depts || {}).sort());
const visible = (page) => page.evaluate(() => KIVO.BassamPerm.visiblePages().slice().sort());
const tamper = (page, id) => page.evaluate((id) => { for (const st of [localStorage, sessionStorage]) for (let i = st.length - 1; i >= 0; i--) { const k = st.key(i); if (/active_dept/.test(k)) st.setItem(k, id); } localStorage.setItem('bassam_active_dept_v1', id); }, id);

test('department manager (badge and department account): the selected section survives reload; logout/login lands home', { timeout: 300000 }, async () => {
  const lab = await startLab();
  const b = await chromium.launch();
  try {
    for (const un of [LAB.mgrA, LAB.dmA]) {
      const m = await openAs(b, lab, un, LAB.pw);
      assert.equal(await active(m.page), A, un + ' starts in his department');
      const units = await serverUnits(m);
      assert.ok(units.includes(A) && units.includes(S1) && !units.includes(B), un + ': server scope = A + its section: ' + units);
      const visA = await visible(m.page);
      assert.equal(await m.page.evaluate((d) => KIVO.BassamDepts.setActive(d), S1), true, un + ' may select his section');
      await reload(m.page);
      assert.equal(await active(m.page), S1, un + ': the section stays active after reload');
      await reload(m.page);
      assert.equal(await active(m.page), S1, un + ': and after a second reload');
      assert.deepEqual(await serverUnits(m), units, un + ': the server scope is unchanged');
      assert.ok((await visible(m.page)).length > 0, un + ': pages are visible in the section');
      const navTxt = await m.page.evaluate(() => document.body.innerText);
      assert.match(navTxt, /TEST_ONLY قسم أ١/, un + ': the shell names the section');
      /* back to the department, still by the same guarded switch */
      assert.equal(await m.page.evaluate((d) => KIVO.BassamDepts.setActive(d), A), true);
      await reload(m.page);
      assert.equal(await active(m.page), A, un + ': back in the department after reload');
      assert.deepEqual(await visible(m.page), visA, un + ': department pages unchanged');
      assert.deepEqual(m.errs, [], un + ': no page errors');
      await m.ctx.close();
      /* a fresh sign-in starts at home even if the device last showed the section */
      const m2 = await openAs(b, lab, un, LAB.pw);
      assert.equal(await active(m2.page), A, un + ': fresh sign-in starts at home');
      await m2.ctx.close();
    }
  } finally { await b.close(); await lab.close(); }
});

test('no widening: employee and manager pointed at units outside their scope land home on reload', { timeout: 300000 }, async () => {
  const lab = await startLab();
  const b = await chromium.launch();
  try {
    const e = await openAs(b, lab, LAB.empA, LAB.pw);
    const visE = await visible(e.page);
    assert.equal(await e.page.evaluate((d) => KIVO.BassamDepts.setActive(d), S1), false, 'employee cannot select the section');
    for (const bad of [S1, B]) {
      await tamper(e.page, bad); await reload(e.page);
      assert.equal(await active(e.page), A, 'employee with storage pointed at ' + bad + ' lands on A');
    }
    assert.deepEqual(await visible(e.page), visE, 'employee pages unchanged');
    assert.deepEqual(await serverUnits(e), [A], 'employee server scope = A only');
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw);
    assert.equal(await m.page.evaluate((d) => KIVO.BassamDepts.setActive(d), B), false, 'manager of A cannot select B');
    await tamper(m.page, B); await reload(m.page);
    assert.equal(await active(m.page), A, 'manager with storage pointed at B lands on A');
    assert.deepEqual(e.errs.concat(m.errs), []);
  } finally { await b.close(); await lab.close(); }
});

test('tab addresses (pages.json tabAddr): direct links open their tab and keep the address; the site map shows them', { timeout: 300000 }, async () => {
  const lab = await startLab();
  const b = await chromium.launch();
  try {
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw);
    for (const h of ['#/irshad/records', '#/seized/records', '#/dstats/haram', '#/dstats/nabawi', '#/daily/rounds', '#/daily/dreport', '#/daily/tasks', '#/employees/custody', '#/employees/store', '#/award/res', '#/admin/oplog']) {
      await s.page.goto(lab.base + '/' + h, { waitUntil: 'domcontentloaded' }); await s.page.waitForTimeout(4000);
      const st = await s.page.evaluate(() => ({ hash: location.hash, len: ((document.querySelector('main') || document.body).innerText || '').length }));
      assert.equal(st.hash, h, h + ' is kept (the page opened that tab)');
      assert.ok(st.len > 80, h + ' renders content');
    }
    const rows = await s.page.evaluate(() => KIVO.BassamPerm.siteMap().map((r) => r.addr).filter(Boolean));
    for (const a of ['#/irshad/records', '#/seized/records', '#/dstats/haram', '#/dstats/nabawi', '#/daily/rounds'])
      assert.ok(rows.includes(a), 'site map lists ' + a);
    for (const a of ['#/irshad/dash', '#/seized/dash', '#/dstats/anHaram', '#/dstats/anTime']) assert.ok(!rows.includes(a), 'no address for a tab shown only in «مؤشرات الإدارة»: ' + a);
    /* a solo-only dashboard link falls back to the page's records tab, as before */
    await s.page.goto(lab.base + '/#/irshad/dash', { waitUntil: 'domcontentloaded' }); await s.page.waitForTimeout(4000);
    assert.equal(await s.page.evaluate(() => location.hash), '#/irshad/records');
    assert.deepEqual(s.errs, []);
  } finally { await b.close(); await lab.close(); }
});
