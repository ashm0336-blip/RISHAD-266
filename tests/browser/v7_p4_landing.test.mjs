/* RISHAD V7 P4 — the landing page is pinned for the accounts around the «مؤشرات المهام» ref.
   Owner decision: a holder of «المهام» alone keeps the landing he had before P4, and the «مؤشرات الإدارة» link stays visible to him.
   The values below were MEASURED on e34fa23 (the commit before P4) with this very flow, in both modes, and are asserted as is:
     · after sign-in every non-platform account opens «صفحتي» (#/profile) — the first-sign-in rule in _loadPage;
     · a session opened with no address and no saved page opens the first visible page: for «المهام» alone that is its container
       «المتابعة اليومية» (#/daily — «المهام» lives under it), never «مؤشرات الإدارة»;
     · the platform admin signs in to «مركز إدارة رشاد» and its exit link opens «مؤشرات الإدارة».
   The link column is as before P4 except for the tasks holders, who gained it in P4 (that is the feature kept).
   Isolated lab, TEST_ONLY data. The code-level guard (_goOps prefers the container only for one of its leaves) is in
   tests/unit/v7_p4_landing.test.mjs. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const A = 'TEST_ONLY_A', KP = 'bassam_perms_v1';
const readK = (lab, k) => JSON.parse(lab.env.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', k).map((r) => r.v).join('') || 'null');
async function setPerms(lab, f) {
  const P = readK(lab, KP); f(P);
  await lab.env.DB.batch([lab.env.DB.prepare('DELETE FROM kv WHERE k=?1').bind(KP), ...lab.W.kvPutStmts(lab.env, 'kv', KP, JSON.stringify(P)), lab.env.DB.prepare('UPDATE revs SET rev=rev+1 WHERE k=?1').bind(KP)]);
}
const see = (page) => page.evaluate(() => {
  const a = document.querySelector('aside.bsb .s-nav a[data-key="kpis"]');
  return { hash: location.hash, link: !!(a && a.getClientRects().length && getComputedStyle(a).display !== 'none'),
    panel: /مؤشرات المهام/.test((document.querySelector('main') || document.body).innerText), none: /لا مؤشرات ممنوحة لك/.test(document.body.innerText) };
});
/* a session with no address and no saved page: the default landing (_loadPage → first visible page) */
async function reopen(s, lab) {
  await s.page.evaluate(() => { Object.keys(localStorage).filter((k) => /^bassam_page_v1/.test(k)).forEach((k) => localStorage.removeItem(k)); });
  await s.page.goto(lab.base + '/', { waitUntil: 'domcontentloaded' }); await s.page.waitForTimeout(100);
  await s.page.reload(); await s.page.waitForTimeout(4000);
}

/* name · account · sheet (null = the account as seeded) · [after sign-in, reopened] as measured on e34fa23 · link */
const PROFILES = [
  ['«المهام» alone', LAB.empA, { tasks: ['view'] }, ['#/profile', '#/daily'], true],
  ['«المهام» + «الموظفون»', LAB.empA, { tasks: ['view'], emps: ['view'] }, ['#/profile', '#/employees'], true],
  ['a leaf of the container alone (dstats/anHaram)', LAB.empA, { 'dstats/anHaram': ['view'] }, ['#/profile', '#/profile'], true],
  ['a leaf with its page (daily/kpiDaily + dreport)', LAB.empA, { 'daily/kpiDaily': ['view'], dreport: ['view'] }, ['#/profile', '#/daily'], true],
  ['the unit manager', LAB.mgrA, null, ['#/profile', '#/dstats'], true],
  ['no grant', LAB.empA, {}, ['#/profile', '#/profile'], false],
];

for (const mode of ['legacy', 'enforce']) {
  test('landing · ' + mode + ': as before P4 for every profile; the «مؤشرات الإدارة» link stays for a holder of «المهام» alone', { timeout: 900000 }, async () => {
    const lab = await startLab({ mode }); const b = await chromium.launch();
    try {
      for (const [name, un, sheet, land, link] of PROFILES) {
        if (sheet) await setPerms(lab, (P) => { P.emps = P.emps || {}; P.emps[A] = { TEST_ONLY_eA1: sheet }; });
        const s = await openAs(b, lab, un, LAB.pw);
        let v = await see(s.page);
        assert.equal(v.hash, land[0], name + ': after sign-in'); assert.equal(v.link, link, name + ': link after sign-in');
        await reopen(s, lab); v = await see(s.page);
        assert.equal(v.hash, land[1], name + ': a session with no address and no saved page'); assert.equal(v.link, link, name + ': link');
        if (name === '«المهام» alone') {
          /* the feature kept: the link is there and the route opens on the tasks panel */
          await s.go('#/kpis', 4500); v = await see(s.page);
          assert.equal(v.hash, '#/kpis', 'the route is open'); assert.equal(v.panel, true, 'the tasks panel is drawn'); assert.equal(v.none, false);
          /* …and having visited it does not make it the default: the saved page is what he opened, nothing more */
          await s.go('#/tasks', 3500); v = await see(s.page); assert.equal(v.hash, '#/tasks', 'the tasks page opens');
        }
        assert.deepEqual(s.errs, [], name); await s.ctx.close();
      }
      /* the platform admin: «مركز إدارة رشاد» after sign-in, and its exit link opens «مؤشرات الإدارة» — as before P4 */
      const s = await openAs(b, lab, LAB.superUn, LAB.superPw);
      assert.equal((await see(s.page)).hash, '#/sysadmin/overview');
      await s.page.click('.s-exit'); await s.page.waitForTimeout(3500);
      assert.equal((await see(s.page)).hash, '#/kpis', 'the workspace default of the platform admin');
      assert.deepEqual(s.errs, []); await s.ctx.close();
    } finally { await b.close(); await lab.close(); }
  });
}
