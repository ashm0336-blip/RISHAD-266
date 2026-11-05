/* RISHAD-266 · P14 — the one-time client migrations (seized/help caps · manager explicit perms · leaf perms · admin subs) are gone.
   A clean browser and a reused one open the platform as the platform administrator without any save, and a ceiling he set on purpose
   (irshad without seized, no help) stays exactly as stored. Before P14 a fresh device re-added both. Lab: TEST_ONLY data, no network. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

async function world() {
  const lab = await startLab();
  const { env, W } = lab, DB = env.DB;
  const kv = (k) => JSON.parse(DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', k).map((r) => r.v).join(''));
  const rev = (k) => (DB.q('SELECT rev FROM revs WHERE k=?1', k)[0] || {}).rev;
  const pm = kv('bassam_perms_v1');
  pm.caps.TEST_ONLY_A = pm.caps.TEST_ONLY_A.filter((x) => x !== 'help' && x !== 'seized').concat(['irshad']);
  pm.lensZ = 1;   /* as on Test: the lens upgrade mark is already set (that read-time upgrade in permStore is not one of the retired migrations) */
  await DB.batch([DB.prepare('DELETE FROM kv WHERE k=?1').bind('bassam_perms_v1'), ...W.kvPutStmts(env, 'kv', 'bassam_perms_v1', JSON.stringify(pm)), DB.prepare('UPDATE revs SET rev=rev+1 WHERE k=?1').bind('bassam_perms_v1')]);
  return { lab, kv, rev };
}
/* every /api/save that carries data (set or del) — an empty flush writes nothing */
const track = (page) => { const out = []; page.on('request', (r) => { if (!/\/api\/save\b/.test(r.url())) return; let j = {}; try { j = JSON.parse(r.postData() || '{}'); } catch (e) { j = { set: { unparsable: 1 } }; } const keys = Object.keys(j.set || {}).concat((j.del || []).map((k) => 'del:' + k)); if (keys.length) out.push(keys.join(',')); }); return out; };

test('clean and reused browsers: no migration write; the stored ceiling stays as set', { timeout: 300000 }, async () => {
  const { lab, kv, rev } = await world();
  const b = await chromium.launch();
  try {
    const r0 = rev('bassam_perms_v1'), cap0 = kv('bassam_perms_v1').caps.TEST_ONLY_A.slice().sort();
    let sv = []; const s = await openAs(b, lab, LAB.superUn, LAB.superPw, { onPage: (p) => { sv = track(p); } });
    await s.page.waitForTimeout(5000);
    assert.deepEqual(sv, [], 'clean browser: no data saved on open');
    for (let i = 0; i < 2; i++) { await s.page.reload({ waitUntil: 'domcontentloaded' }); await s.page.waitForTimeout(4000); }
    assert.deepEqual(sv, [], 'reused browser (same profile, reloads): no data saved');
    /* an older device that already carries the retired flags behaves the same */
    await s.page.evaluate(() => { for (const f of ['bassam_perm_seized_cap_v1', 'bassam_perm_help_v1', 'bassam_perm_mgr_explicit_v1', 'bassam_perm_leaf_v1', 'bassam_perm_admsubs_v2']) KIVO.BassamDepts.raw.setItem.call(localStorage, f, '1'); });   /* device-local, as the retired code wrote them */
    await s.page.reload({ waitUntil: 'domcontentloaded' }); await s.page.waitForTimeout(4000);
    assert.deepEqual(sv, [], 'device with old flags: no data saved');
    assert.equal(rev('bassam_perms_v1'), r0, 'permissions record not rewritten');
    assert.deepEqual(kv('bassam_perms_v1').caps.TEST_ONLY_A.slice().sort(), cap0, 'ceiling kept as set (no seized/help re-added)');
    assert.deepEqual(s.errs, []);
    /* manager and employee: no save either, and their pages render */
    for (const un of [LAB.mgrA, LAB.empA]) {
      let xs = []; const x = await openAs(b, lab, un, LAB.pw, { onPage: (p) => { xs = track(p); } }); await x.page.waitForTimeout(4000);
      assert.deepEqual(xs, [], un + ': no data saved on open');
      if (un === LAB.mgrA) assert.ok((await x.page.evaluate(() => KIVO.BassamPerm.visiblePages())).length > 0, un + ': manager pages visible');   /* the lab employee holds no grants (none before P14 either) */
      assert.deepEqual(x.errs, [], un + ': no page errors');
    }
  } finally { await b.close(); await lab.close(); }
});
