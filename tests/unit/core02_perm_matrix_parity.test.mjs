/* RISHAD CORE-02 step 4 — the permission engine as each account (KIVO.BassamPerm.myPerms() in a client signed in as it, in its own unit).
   TEST_ONLY synthetic lab data (tests/fixtures/gen_fixture.py), real worker over the D1 stand-in, the real client permission model.
   V7 · د5-هـ (44): the console tab «خريطة الصلاحيات» (the matrix «مصفوفة الصلاحيات», «سقوف الإدارات», the templates list) was DELETED —
   the cases that pinned its rows, its 200-row cap, its ceiling list, its template list and its tab-only computation are deleted with it.
   What stays is what the engine itself answers (the cases the old module branches got wrong). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, stored, putKV } from './world_fx.mjs';
import { loadClient, until, sleep } from './k264_vm.mjs';
import { needs } from './harness.mjs';

const KP = 'bassam_perms_v1', D1 = 'tst_d1', D2 = 'tst_d2', D3 = 'tst_d3';
const BLOCKS = ['255-page-manifest.js', '260-bassam-plat.js', '280-server-storage.js', '310-image-refs.js', '320-dept-storage.js', '330-auth.js', '331-perm-model.js', '332-find-day.js', '333-platform-map.js', '334-perm-tree-tpl.js', '340-registry-v24-9.js', '440-count.js'];
/* accounts of the synthetic fixture: [username, pin, own unit] (gm: no unit — its branch tst_g1 = tst_d1 + tst_d2) */
const ACC = {
  dm1: ['0000000101', '70101', D1],     // department manager, no own sheet → inherits the unit ceiling
  dm2: ['0000000102', '70102', D2],     // department manager WITH an explicit own sheet (narrowed) — set below
  dm3: ['0000000104', '70104', D3],
  gm1: ['0000000103', '70103', null],   // general manager of tst_g1: own sheet in tst_d2 only — set below
  sup1: ['0000000111', '70111', D1], emp1: ['0000000113', '70113', D1], emp2: ['0000000121', '70121', D2],
};
const OFF = ['links'];   // a page switched off at platform level (mods.off) — the engine drops it for everyone
const cp = (o) => JSON.parse(JSON.stringify(o));

async function clientOf(W, ck, unit) {
  const boot = (await W.C.boot(ck)).boot;
  assert.ok(boot && boot.uid, 'boot');
  const T = loadClient({ C: W.C, boot, jar: { cookie: ck }, blocks: [] });
  T.W.atob = globalThis.atob; T.W.btoa = globalThis.btoa;
  T.W.localStorage._m.set('bassam_session_v1', JSON.stringify({ uid: boot.uid, ts: Date.now(), la: Date.now() }));
  if (unit) T.W.localStorage._m.set('bassam_active_dept_v1', unit);
  T.W.document.hidden = true;
  T.run(BLOCKS);
  if (!T.W.KIVO.KIVO_REGISTRY && T.W.KIVO_REGISTRY) T.W.KIVO.KIVO_REGISTRY = T.W.KIVO_REGISTRY;
  const K = T.W.KIVO, SV = K.__BS_SRV;
  assert.ok(K.BassamPerm && K.BassamPerm.myPerms && SV, 'client loaded');
  const settle = async () => { await sleep(30); assert.ok(await until(() => !SV.dirty() && !SV.inflight(), 8000), 'settled'); await sleep(30); };
  return { T, K, P: K.BassamPerm, settle, dispose: () => T.dispose() };
}
/* the engine's answer for the signed-in account in unit d (pages only — the matrix columns are pages) */
function engine(c, d) {
  if (d) { c.T.W.localStorage._m.set('bassam_active_dept_v1', d); c.K.BassamPerm._bust && c.K.BassamPerm._bust(); }
  return cp(c.P.myPerms());
}
const pagesOf = (m, reg) => { const o = {}; reg.forEach((p) => { const a = (m[p.key] || []).slice().sort(); if (a.length) o[p.key] = a; }); return o; };
const union = (ms) => { const o = {}; ms.forEach((m) => Object.keys(m).forEach((k) => { o[k] = Array.from(new Set((o[k] || []).concat(m[k]))); })); return o; };

let W, SU, REG, REF = {};
test.before(async () => {
  W = await world({ mode: 'legacy' });
  const P = stored(W.env, KP);
  /* dm2: an explicit own sheet (narrower than its unit) — the engine applies the sheet, not the ceiling */
  P.emps[D2] = Object.assign(P.emps[D2] || {}, { 'mgr:tst_d2': { tasks: ['view', 'add'], 'irshad/records': ['view'] } });
  /* gm1: an own sheet in tst_d2 only; in tst_d1 it inherits the unit ceiling */
  P.emps[D2]['gm:tst_g1'] = { plan: ['view'], tasks: ['view', 'edit', 'approve'] };
  P.lensZ = 1;
  P.tplOf = { [D1]: { tst_e_emp1: 'tTSTC02' } };   /* emp1 holds a template by explicit assignment */
  putKV(W.env, KP, P);
  putKV(W.env, 'bassam_platform_v1', { mods: { off: OFF.slice() } });
  putKV(W.env, 'bsdept:' + D1 + ':bassam_perm_tpls_v1', [{ id: 'tTSTC02', name: 'TEST_ONLY · قالب المصفوفة', perms: { tasks: ['view'], 'irshad/records': ['view', 'add'] } }]);
  const ck = { su: W.su.ck };
  for (const a of Object.keys(ACC)) ck[a] = (await W.login(ACC[a][0], ACC[a][1])).ck;
  /* references: each account's own client, in its own unit (the gm in each unit of its branch) */
  for (const a of Object.keys(ACC)) {
    const c = await clientOf(W, ck[a], ACC[a][2]);
    try {
      REG = REG || cp(c.P.PAGE_REG);
      if (a === 'gm1') REF[a] = pagesOf(union([engine(c, D1), engine(c, D2)]), REG);
      else REF[a] = pagesOf(engine(c, ACC[a][2]), REG);
    } finally { c.dispose(); }
  }
  SU = await clientOf(W, ck.su, D1);
  await SU.settle();
  REF.su = pagesOf(engine(SU, D1), REG);
});
test.after(() => { SU && SU.dispose(); });

test('the cases the old module branches got wrong are now the engine answer', needs('irshad', 'tasks'), () => {
  assert.ok(Object.keys(REF.dm1).length > 3, 'a manager without an own sheet holds the unit ceiling (the old matrix showed «—» everywhere)');
  assert.ok(Object.keys(REF.gm1).length > 3, 'a general manager inherits the ceiling where it has no own sheet');
  assert.deepEqual([REF.dm2.tasks, REF.dm2.irshad], [['add', 'view'], ['view']], 'an explicit own sheet is applied (its pages, with their containers)');
  assert.ok(Object.keys(REF.dm2).length < Object.keys(REF.dm1).length && !REF.dm2.emps, 'and it is narrower than the unit ceiling');
  assert.ok(!REF.dm1.links, 'a page switched off at platform level shows nothing for a manager');
  assert.ok(REF.su.links && REF.su.links.length, 'V7 · د1-ج (قرار صاحب المنصة): the platform administrator is not limited by a page switched off (was: nothing for anyone)');
  assert.deepEqual(REF.su, pagesOf(cp(SU.P.myPerms()), REG), 'the platform administrator row is myPerms itself (active unit · platform settings)');
});
