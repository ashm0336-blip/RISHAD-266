/* RISHAD-266 · browser acceptance — the platform administrator (super) and the selected department/section.
   Required: selecting a unit changes only the data shown; super's identity and page access do not change, while the server keeps
   every data-integrity control — including the approved ceiling on writes (decision هـ: «السقفُ يحكم الجميع»).
   Root cause fixed (client, 331 myPerms): super's page set was the selected unit's ceiling, exactly as for that unit's own account,
   so in a unit with a narrow ceiling super lost even the view of its pages (the server already reads everything for super).
   Lab: TEST_ONLY_B ceiling = ['tasks'], section TEST_ONLY_A_S1 ceiling = [] (own). TEST_ONLY data, no network. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

async function narrowWorld() {
  const lab = await startLab();
  const { env, W } = lab, DB = env.DB;
  const kv = (k) => JSON.parse(DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', k).map((r) => r.v).join(''));
  const pm = kv('bassam_perms_v1');
  pm.caps.TEST_ONLY_B = ['tasks']; pm.caps.TEST_ONLY_A_S1 = []; pm.capOwn = Object.assign({}, pm.capOwn || {}, { TEST_ONLY_A_S1: true });
  await DB.batch([DB.prepare('DELETE FROM kv WHERE k=?1').bind('bassam_perms_v1'), ...W.kvPutStmts(env, 'kv', 'bassam_perms_v1', JSON.stringify(pm)), DB.prepare('UPDATE revs SET rev=rev+1 WHERE k=?1').bind('bassam_perms_v1')]);
  return { lab, kv };
}
const state = (page) => page.evaluate(() => {
  const P = KIVO.BassamPerm, u = KIVO.BassamAuth.user();
  const nav = [...document.querySelectorAll('.bsb .n')].filter((e) => e.getBoundingClientRect().height).map((e) => ({ t: e.textContent.trim().replace(/\s+/g, ' '), out: /\bout\b/.test(e.className), gone: /\bgone\b/.test(e.className) }));
  return { active: KIVO.BassamDepts.active(), role: u && u.role, uid: u && u.id, vis: P.visiblePages(), empsAdd: !!(P.can('emps', 'add') || P.can('emps/data', 'add')), nav };
});
const held = (page) => page.evaluate(async () => { const r0 = await (await fetch('/api/authz')).json(); const R = KIVO.KIVO_REGISTRY, o = {}; for (const [d, x] of Object.entries((r0.me || {}).depts || {})) { const bin = atob(x.h || ''); let n = 0; R.keys.forEach((k, i) => { if (bin.charCodeAt(i >> 3) & (1 << (i & 7))) n++; }); o[d] = n; } return o; });
async function switchTo(s, d) { const ok = await s.page.evaluate((d) => KIVO.BassamDepts.setActive(d), d); await s.page.reload({ waitUntil: 'domcontentloaded' }); await s.page.waitForTimeout(3000); return ok; }

test('super: switching unit changes the data shown, not identity or page access; writes stay under the ceiling', { timeout: 300000 }, async () => {
  const { lab } = await narrowWorld();
  const b = await chromium.launch();
  try {
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw);
    const who0 = (await s.api('/api/whoami')).j;
    const per = {};
    for (const d of ['TEST_ONLY_A', 'TEST_ONLY_A_S1', 'TEST_ONLY_B']) {
      assert.equal(await switchTo(s, d), true, 'super can select ' + d);
      const st = await state(s.page);
      assert.equal(st.active, d); assert.equal(st.role, 'super'); assert.equal(st.uid, who0.uid, 'identity unchanged in ' + d);
      assert.deepEqual((await s.api('/api/whoami')).j.uid, who0.uid);
      per[d] = st;
    }
    /* the same pages are reachable in every unit (only + section differs, by design) */
    const visA = per.TEST_ONLY_A.vis.slice().sort();
    for (const d of ['TEST_ONLY_A_S1', 'TEST_ONLY_B']) {
      assert.deepEqual(per[d].vis.slice().sort(), visA, 'visible pages for super in ' + d + ' equal those in A');
      assert.equal(per[d].nav.filter((n) => n.gone).length, 0, 'no page is hidden from super in ' + d);
      assert.ok(per[d].nav.filter((n) => n.out).length >= 3, 'pages outside ' + d + "'s ceiling are shown dimmed (out), still openable");
      assert.equal(per[d].empsAdd, false, 'no employee write offered outside the ceiling of ' + d);
    }
    assert.equal(per.TEST_ONLY_A.empsAdd, true, 'inside the ceiling super keeps full actions');
    assert.ok(visA.includes('emps') && visA.includes('admin'));
    /* B: the employees page opens through the nav and lists B's employee (view), with no add control */
    await switchTo(s, 'TEST_ONLY_B');
    await s.page.locator('.bsb .n', { hasText: /موظفو/ }).first().click(); await s.page.waitForTimeout(3000);
    const ev = await s.page.evaluate(() => { const m = document.querySelector('main') || document.body; return { hash: location.hash, text: m.innerText, add: [...m.querySelectorAll('button')].filter((x) => x.getBoundingClientRect().height && /إضافة موظف/.test(x.textContent)).length }; });
    assert.match(ev.text, /TEST_ONLY موظف ب/, 'B employees visible to super');
    assert.equal(ev.add, 0, 'no add-employee control outside the ceiling');
    /* server integrity: held action keys still follow each unit's ceiling (decision هـ) */
    const h = await held(s.page);
    assert.ok(h.TEST_ONLY_A > h.TEST_ONLY_B && h.TEST_ONLY_A > h.TEST_ONLY_A_S1, 'server write keys narrowed by ceiling: ' + JSON.stringify(h));
    assert.deepEqual(s.errs, []);
  } finally { await b.close(); await lab.close(); }
});

test('department manager and employee: scope selection still limited (no widening)', { timeout: 300000 }, async () => {
  const { lab } = await narrowWorld();
  const b = await chromium.launch();
  try {
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw);
    assert.equal(await m.page.evaluate(() => KIVO.BassamDepts.setActive('TEST_ONLY_B')), false, 'manager of A cannot select B');
    const hm = await held(m.page);
    assert.equal(hm.TEST_ONLY_B, undefined, 'no server keys for B: ' + JSON.stringify(hm));
    const sm = await state(m.page);
    assert.equal(sm.role, 'staff'); assert.equal(sm.active, 'TEST_ONLY_A');
    assert.ok(sm.empsAdd, 'manager keeps his own department powers');
    const e = await openAs(b, lab, LAB.empA, LAB.pw);
    assert.equal(await e.page.evaluate(() => KIVO.BassamDepts.setActive('TEST_ONLY_B')), false, 'employee cannot select B');
    const se = await state(e.page);
    assert.equal(se.empsAdd, false, 'employee gains no write');
    assert.ok(!se.vis.includes('admin'), 'employee gains no admin page');
    assert.deepEqual(m.errs.concat(e.errs), []);
  } finally { await b.close(); await lab.close(); }
});
