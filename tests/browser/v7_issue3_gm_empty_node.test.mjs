/* RISHAD V7 · issue #3 — a general manager of a node with NO data unit under it (isolated lab, TEST_ONLY data).
   The server accepts his sign-in (POST /api/login 200, role gm, deptId ""), but the page stayed on the sign-in form with no
   message: after the reload the identity gate found no active unit for him. Authorization is not the subject and is not changed:
   he still reads nothing of any unit. Expected (the smallest safe change): the sign-in screen tells him plainly that no unit is under his node yet. For comparison a general manager whose node has units signs in as before. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB, LAB_PW } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const KU = 'bassam_auth_users_v1', KG = 'bassam_gdepts_v1', E = 'TEST_ONLY_E', G = 'TEST_ONLY_G';
const readK = (lab, k) => JSON.parse(lab.env.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', k).map((r) => r.v).join('') || 'null');
async function putK(lab, k, v) { await lab.env.DB.batch([lab.env.DB.prepare('DELETE FROM kv WHERE k=?1').bind(k), ...lab.W.kvPutStmts(lab.env, 'kv', k, JSON.stringify(v)), lab.env.DB.prepare('UPDATE revs SET rev=rev+1 WHERE k=?1').bind(k)]); }
async function seed(lab) {
  const U = readK(lab, KU), ph = U.find((x) => x.id === 'TEST_ONLY_mgrA').ph;
  U.push({ id: 'TEST_ONLY_gmE', un: '1400000001', name: 'TEST_ONLY مدير عام بلا إدارات', role: 'gm', gid: E, ekey: 'gm:' + E, ph, mc: 0, dis: 0 },
         { id: 'TEST_ONLY_gmG', un: '1400000002', name: 'TEST_ONLY مدير عام', role: 'gm', gid: G, ekey: 'gm:' + G, ph, mc: 0, dis: 0 });
  await putK(lab, KU, U);
  await putK(lab, KG, readK(lab, KG).concat([{ id: E, name: 'TEST_ONLY إدارة عامة فارغة', kind: 'إدارة عامة' }]));
}
async function signIn(b, lab, un) {
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 200)));
  await p.goto(lab.base + '/', { waitUntil: 'domcontentloaded' }); await p.waitForSelector('input[type=password]', { timeout: 30000 });
  let login = null;
  for (let i = 0; i < 2 && !login; i++) { await p.fill('input:not([type=password]):not([type=hidden])', un); await p.fill('input[type=password]', LAB_PW);
    const res = p.waitForResponse((r) => /\/api\/login\b/.test(r.url()), { timeout: 8000 }).then((r) => r.json().then((j) => ({ status: r.status(), j })), () => null);
    await p.keyboard.press('Enter'); login = await res; }
  await p.waitForTimeout(6000);
  const seen = await p.evaluate(() => ({ form: !!document.querySelector('input[type=password]'), hash: location.hash, text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 600) }));
  return { ctx, p, errs, login, seen };
}

test('V7 #3 · a general manager of a node without units is told why he cannot enter (was a silent sign-in form)', { timeout: 300000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    await seed(lab);
    const e = await signIn(b, lab, '1400000001');
    assert.equal(e.login && e.login.status, 200, 'the server accepts the sign-in'); assert.equal(e.login.j.role, 'gm'); assert.equal(e.login.j.deptId || '', '');
    /* the smallest safe change: he stays on the sign-in screen (cur() still gives him no client session — nothing opens), and is told why */
    assert.match(e.seen.text, /لا توجد إدارة تابعة لعقدتك بعد — راجع مسؤول المنصة/, 'a plain message instead of a silent sign-in form: ' + e.seen.text);
    assert.equal(await e.p.evaluate(() => { const x = document.getElementById('bsGateErr'); return !!x && x.classList.contains('show') && x.getAttribute('role') === 'status' && getComputedStyle(x).opacity !== '0'; }), true, 'the message is visible and announced');
    /* authorization unchanged: nothing of any unit is readable */
    const r = await e.p.evaluate(async () => { const x = await fetch('/api/get?keys=' + encodeURIComponent('bsdept:TEST_ONLY_A:bassam_employees_v1')); const j = await x.json().catch(() => null); const k = j && j.keys && j.keys['bsdept:TEST_ONLY_A:bassam_employees_v1']; return { status: x.status, has: !!(k && k.v != null) }; });
    assert.equal(r.has, false, 'he reads no unit data: ' + JSON.stringify(r));
    assert.deepEqual(e.errs, []); await e.ctx.close();
    /* the comparison: a general manager whose node has units lands as before, with no such message */
    const g = await signIn(b, lab, '1400000002');
    assert.equal(g.seen.form, false, 'general manager with units: signed in'); assert.doesNotMatch(g.seen.text, /لا توجد إدارة تابعة لعقدتك بعد/);
    assert.deepEqual(g.errs, []); await g.ctx.close();
  } finally { await b.close(); await lab.close(); }
});
