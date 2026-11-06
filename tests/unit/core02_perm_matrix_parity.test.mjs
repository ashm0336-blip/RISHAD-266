/* RISHAD CORE-02 step 4 (a)(b)(c) — «مصفوفة الصلاحيات» and «سقوف الإدارات» in «مركز إدارة رشاد» show what the permission engine decides.
   TEST_ONLY synthetic lab data (tests/fixtures/gen_fixture.py), real worker over the D1 stand-in, the real client permission model
   (280 · 320 · 330 · 331 · 333 · 334 · 340) booted per account, and the real Admin component (src/modules/admin/logic.js).
   For every matrix row the reference is the engine itself, run AS THAT ACCOUNT: KIVO.BassamPerm.myPerms() in a client signed in as it,
   in its own unit (a general manager: in each unit of its branch — the cell is what it holds in any of them). Every page column is compared:
   the displayed letters (ع ت ا ص) and the tooltip that lists every action (incl. إضافة/حذف).
   Before CORE-02 the module's own branches showed «—» for a manager or general manager without an own sheet (the engine gives them
   the unit ceiling) and every action on every page for the platform administrator; the ceiling list kept pages switched off at
   platform level; the templates were read from raw localStorage. No engine or server code is changed by this step. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { world, stored, putKV } from './tasks_fx.mjs';
import { loadClient, until, sleep } from './k264_vm.mjs';
import { ROOT } from './harness.mjs';

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
const ACT_AR = { view: 'عرض', add: 'إضافة', edit: 'تعديل', del: 'حذف', approve: 'اعتماد', export: 'تصدير' };
const LETTER = { view: 'ع', edit: 'ت', approve: 'ا', export: 'ص' };
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
/* the real Admin component inside the platform administrator's client: its perms-tab values */
function adminPage(c) {
  const ctx = c.T.ctx, K = c.K;
  if (!K.BassamPageKit) K.BassamPageKit = { base: (B) => class extends B {} };
  if (!c.T.W.DCLogic) c.T.W.DCLogic = class { setState(v) { Object.assign(this.state, v); } };
  if (!K.BassamFind) K.BassamFind = { dig: (s) => String(s) };
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/modules/admin/logic.js'), 'utf8') + '\nglobalThis.TEST_ONLY_Admin = Component;', ctx);
  const page = Object.create(c.T.W.TEST_ONLY_Admin.prototype);
  page.state = { admTab: 'perms', pmQ: '' };
  page.sysPick = () => {}; page.adGo = () => {};
  if (!page._rowMenu) page._rowMenu = (id, items) => ({ rmItems: items });   /* the row menu comes from the page kit (not under test here) */
  return page;
}
const pagesOf = (m, reg) => { const o = {}; reg.forEach((p) => { const a = (m[p.key] || []).slice().sort(); if (a.length) o[p.key] = a; }); return o; };
const union = (ms) => { const o = {}; ms.forEach((m) => Object.keys(m).forEach((k) => { o[k] = Array.from(new Set((o[k] || []).concat(m[k]))); })); return o; };

let W, SU, PAGE, VALS, REG, REF = {};
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
  PAGE = adminPage(SU);
  VALS = PAGE._adUsersVals0();
});
test.after(() => { SU && SU.dispose(); });

const UID = { su: 'su', dm1: 'tst_dm1', dm2: 'tst_dm2', dm3: 'tst_dm3', gm1: 'tst_gm1', sup1: 'tst_sup1', emp1: 'tst_emp1', emp2: 'tst_emp2' };
function rowOf(a) {
  const users = SU.K.BassamAuth.users().filter((u) => !u.dis && u.role !== 'dept');
  const i = users.findIndex((u) => u.id === UID[a]);
  assert.ok(i >= 0 && i < VALS.pmRows.length, a + ' has a matrix row');
  return VALS.pmRows[i];
}

for (const a of Object.keys(UID)) {
  test('matrix row = engine (myPerms as that account) · ' + a, () => {
    const row = rowOf(a), want = REF[a];
    assert.equal(row.cells.length, REG.length, 'one cell per page column');
    REG.forEach((p, j) => {
      const acts = want[p.key] || [], cell = row.cells[j];
      const letters = acts.length ? ['view', 'edit', 'approve', 'export'].filter((x) => acts.includes(x)).map((x) => LETTER[x]).join(' ') : '—';
      assert.equal(cell.t, letters, a + ' · ' + p.key + ': letters');
      const tipActs = cell.tip.includes(': لا شيء') ? [] : cell.tip.split(': ')[1].split('، ');
      assert.deepEqual(tipActs.slice().sort(), acts.map((x) => ACT_AR[x]).sort(), a + ' · ' + p.key + ': every action (tooltip)');
    });
  });
}

test('the cases the old module branches got wrong are now the engine answer', () => {
  assert.ok(Object.keys(REF.dm1).length > 3, 'a manager without an own sheet holds the unit ceiling (the old matrix showed «—» everywhere)');
  assert.ok(Object.keys(REF.gm1).length > 3, 'a general manager inherits the ceiling where it has no own sheet');
  assert.deepEqual([REF.dm2.tasks, REF.dm2.irshad], [['add', 'view'], ['view']], 'an explicit own sheet is applied (its pages, with their containers)');
  assert.ok(Object.keys(REF.dm2).length < Object.keys(REF.dm1).length && !REF.dm2.emps, 'and it is narrower than the unit ceiling');
  assert.ok(!REF.su.links && !REF.dm1.links, 'a page switched off at platform level shows nothing for anyone');
  assert.deepEqual(REF.su, pagesOf(cp(SU.P.myPerms()), REG), 'the platform administrator row is myPerms itself (active unit · platform settings)');
});

test('the 200-row cap is kept and said in the UI; legacy unit accounts are named, not shown as rows', () => {
  assert.equal(VALS.pmCutOn, false, 'the lab has fewer than 200 accounts');
  const src = fs.readFileSync(path.join(ROOT, 'src/modules/admin/logic.js'), 'utf8');
  assert.match(src, /N = M\.slice\(0, 200\)/, 'the cap stays 200');
  assert.match(src, /pmCut: "تُعرض أول " \+ N\.length \+ " حساب من " \+ M\.length/, 'a truncated matrix says so');
  const view = fs.readFileSync(path.join(ROOT, 'src/modules/admin/view.html'), 'utf8');
  assert.match(view, /<sc-if value="\{\{pmCutOn\}\}"[^>]*><div role="status"[^>]*>\{\{pmCut\}\}<\/div><\/sc-if>/);
  assert.ok(!/"dept" === t\.role\) \{/.test(src) && !/\["view", "add", "edit", "del", "approve", "export"\];\s*\}\),\s*t\s*\);/.test(src), 'the module\'s own role branches are gone');
});

test('ceilings: the effective ceiling (platform-off pages excluded, like the server) and the off pages named «معطّلة على مستوى المنصة»', () => {
  const names = Object.fromEntries(REG.map((p) => [p.key, p.name]));
  for (const d of [D1, D2, D3]) {
    const row = VALS.pmCaps.find((r) => r.name === SU.K.BassamDepts.list().find((x) => x.id === d).name);
    assert.ok(row, d + ' has a ceiling row');
    const cap = cp(SU.P.deptCap(d)), on = cap.filter((k) => !OFF.includes(k));
    assert.equal(row.pages, on.map((k) => names[k] || k).join(' · '), d + ': pages = engine ceiling without platform-off pages');
    assert.equal(row.offOn, cap.some((k) => OFF.includes(k)), d + ': off marker');
    if (row.offOn) assert.equal(row.offTxt, 'معطّلة على مستوى المنصة: ' + names.links);
    const C = SU.P.p24.ceil(d); cap.forEach((k) => assert.equal(C.page(k), !OFF.includes(k), 'engine p24.ceil agrees · ' + k));
  }
});

test('templates are read through BassamPerm (tplsList · tplHolders), never from raw storage', async () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/modules/admin/logic.js'), 'utf8');
  const start = src.indexOf('  _pmTplRows(D, P, reg) {'), body = src.slice(start, src.indexOf('\n  }\r\n', start));
  assert.ok(start > 0 && /P\.tplsList\(d\.id\)/.test(body) && /P\.tplHolders\(e\.id, d\.id\)/.test(body));
  assert.ok(!/localStorage|getItem/.test(body), 'no storage read');
  assert.ok(!src.includes('":bassam_perm_tpls_v1") || "[]"'), 'the old raw read is gone');
  const row0 = VALS.pmTpls.find((r) => r.name === 'TEST_ONLY · قالب المصفوفة');
  assert.ok(row0, 'the template is listed');
  assert.match(row0.grant, /\(ع\)/);
  assert.equal(row0.n, '—', 'holders unknown until the unit employees are read in this session — no misleading 0');
  /* once the unit employees are read (as the monthly table does), the count is the engine's tplHolders */
  const r = await SU.K.__BS_SRV.operations.read(['bsdept:' + D1 + ':bassam_employees_v1']);
  assert.ok(r && r.ok !== false, 'employees read');
  const v = Object.create(PAGE); v.state = { admTab: 'perms', pmQ: '' };
  const row = v._adUsersVals0().pmTpls.find((x) => x.name === 'TEST_ONLY · قالب المصفوفة');
  assert.equal(row.n, String(SU.P.tplHolders('tTSTC02', D1).length));
  assert.ok(Number(row.n) >= 1, 'its holder is counted');
});

test('the perms-tab values are computed only on that tab', () => {
  const page = Object.create(PAGE); page.state = { admTab: 'users', pmQ: '' };
  const v = page._adUsersVals0();
  assert.deepEqual([v.pmRows.length, v.pmCaps.length, v.pmTpls.length], [0, 0, 0]);
  assert.ok(v.usRows.length > 0, 'the accounts tab still renders its rows');
});
