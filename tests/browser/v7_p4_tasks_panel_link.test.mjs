/* RISHAD V7 P4 · G6 — the «مؤشرات المهام» panel of «مؤشرات الإدارة» is drawn for whoever holds tasks:view (kpis/logic.js), but the
   sidebar link and the route to «مؤشرات الإدارة» were computed from the container's refs alone (navLeaves('kpis')), which did not list
   that panel. An employee whose only grant is «المهام — عرض» therefore had a panel on a page he could not reach.
   Isolated lab, TEST_ONLY data. After the fix the panel is one of the container's refs (no new key): the link shows, the page opens
   on the tasks panel, and an employee with no grant still gets neither. */
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
  return { tasksView: !!KIVO.BassamPerm.can('tasks', 'view'), link: !!(a && a.getClientRects().length && getComputedStyle(a).display !== 'none'), hash: location.hash,
    panel: /مؤشرات المهام/.test((document.querySelector('main') || document.body).innerText), none: /لا مؤشرات ممنوحة لك/.test(document.body.innerText) };
});

for (const mode of ['legacy', 'enforce']) {
  test('G6 · ' + mode + ': tasks:view alone reaches «مؤشرات الإدارة» and its tasks panel; no grant ⇒ no link', { timeout: 600000 }, async () => {
    const lab = await startLab({ mode }); const b = await chromium.launch();
    try {
      await setPerms(lab, (P) => { P.emps = P.emps || {}; P.emps[A] = { TEST_ONLY_eA1: { tasks: ['view'] } }; });
      let s = await openAs(b, lab, LAB.empA, LAB.pw);
      let v = await see(s.page);
      assert.equal(v.tasksView, true, 'the employee holds tasks:view');
      assert.equal(v.link, true, 'the «مؤشرات الإدارة» link is shown to a holder of tasks:view alone');
      await s.go('#/kpis', 4500); v = await see(s.page);
      assert.equal(v.hash, '#/kpis', 'the route is open'); assert.equal(v.panel, true, 'the tasks panel is drawn'); assert.equal(v.none, false);
      assert.deepEqual(s.errs, []); await s.ctx.close();
      /* no grant at all: neither link nor page */
      await setPerms(lab, (P) => { P.emps[A] = { TEST_ONLY_eA1: {} }; });
      s = await openAs(b, lab, LAB.empA, LAB.pw); v = await see(s.page);
      assert.equal(v.tasksView, false); assert.equal(v.link, false, 'no grant ⇒ no link');
      await s.go('#/kpis', 3500); v = await see(s.page);
      assert.equal(v.panel, false, 'no grant ⇒ no tasks panel');
      await s.ctx.close();
    } finally { await b.close(); await lab.close(); }
  });
}
