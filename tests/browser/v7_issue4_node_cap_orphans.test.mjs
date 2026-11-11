/* RISHAD V7 · issue #4 — deleting a node through the console leaves no ceiling record of it (isolated lab, TEST_ONLY data).
   A node is created under the capped general node (its ceiling is seeded: caps · tabs · lenses), made independent (capOwn), then
   deleted from its page. Before the fix its caps/subs/lenses entries and its capOwn flag stayed in bassam_perms_v1; if the id came
   back, seedCapFrom kept the old record. After: nothing of the node is left, every other unit's records are byte-identical, and a
   node that returns with the same id is seeded afresh from its parent. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

const KP = 'bassam_perms_v1', KGD = 'bassam_gdepts_v1', G = 'TEST_ONLY_G';
const readK = (lab, k) => JSON.parse(lab.env.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', k).map((r) => r.v).join('') || 'null');
const others = (P, id) => JSON.stringify(['caps', 'subs', 'lenses', 'capOwn', 'emps', 'tplOf', 'empLens'].map((k) => { const o = Object.assign({}, P[k] || {}); delete o[id]; return o; }));

test('V7 #4 · a deleted node leaves no ceiling record; other units untouched; a returning id is seeded afresh', { timeout: 600000 }, async () => {
  const lab = await startLab(); const b = await chromium.launch();
  try {
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw); const p = s.page; p.setDefaultTimeout(15000);
    await s.go('#/sysadmin/org', 3000);
    const id = await p.evaluate((G) => { const D = KIVO.BassamDepts, P = KIVO.BassamPerm; const r = D.nodeAdd({ name: 'TEST_ONLY عقدة #4', kind: 'إدارة عليا', pid: G }); if (!r.ok) return 'ERR ' + r.err;
      P.setDeptSubs(r.id, 'emps', ['data']); P.setDeptLenses(r.id, ['zones']); P.setCapOwn(r.id, true); return r.id; }, G);
    assert.doesNotMatch(String(id), /^ERR/, id); await p.waitForTimeout(2500); await lab.idle();
    let P = readK(lab, KP);
    assert.ok(Array.isArray(P.caps[id]) && P.subs[id] && P.lenses[id] && P.capOwn[id] === true, 'setup: the node has caps, tabs, lenses and capOwn: ' + JSON.stringify({ c: P.caps[id], s: P.subs[id], l: P.lenses[id], o: P.capOwn }));
    const before = others(P, id);
    /* delete it from its page, as the administrator does */
    await s.go('#/sysadmin/org/' + id, 3500);
    await p.locator('main section[aria-label="حذف العقدة"] button.dz').click(); await p.waitForTimeout(1200);
    if (await p.locator('#bsCfmOk').isVisible().catch(() => false)) await p.locator('#bsCfmOk').click();
    await p.waitForTimeout(3500); await lab.idle();
    assert.ok(!readK(lab, KGD).some((n) => n.id === id), 'the node is gone from the structure');
    P = readK(lab, KP);
    for (const k of ['caps', 'subs', 'lenses', 'capOwn']) assert.ok(!(P[k] && Object.prototype.hasOwnProperty.call(P[k], id)), 'no ' + k + ' record of the deleted node');
    assert.equal(others(P, id), before, 'every other unit\'s records are unchanged');
    /* the id returns (import / restore): seeded afresh from its parent, not «kept» */
    const seed = await p.evaluate(([id, G]) => { const r = KIVO.BassamPerm.seedCapFrom(id, G); return { kept: !!r.kept, n: r.n, cap: KIVO.BassamPerm.rawCap(id), parent: KIVO.BassamPerm.deptCap(G) }; }, [id, G]);
    assert.equal(seed.kept, false, 'no stale record to keep'); assert.deepEqual(seed.cap.slice().sort(), seed.parent.slice().sort(), 'a fresh snapshot of the parent');
    assert.deepEqual(s.errs, []);
  } finally { await b.close(); await lab.close(); }
});
