/* Independent unit ceilings (caps-own) — the real client permission model (280 · 320 · 330 · 331 · 333 · 334 · 340 in vm, booted from the real
   worker) saving to the real worker over the D1 stand-in (tasks_fx), in both authorization modes (legacy · enforce). TEST_ONLY synthetic data.
   Owner decision: narrowing a unit's page ceiling HIDES what lies outside it at read time and never deletes it; widening restores it exactly;
   each unit's ceiling can be made independent of its parent's by an explicit system-administrator switch (nothing is written on page open).
   Every case failed on 3773e3c: setDeptCap · setDeptSubs · setDeptTabs · setDeptLenses trimmed stored sheets, lens lists and explicit grants;
   setEmpPerms · setEmpLens dropped what lay outside the ceiling (and the server refused a sheet that kept it); tpSave cut the template; no per-unit mode. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { world, stored, putKV } from './tasks_fx.mjs';
import { loadClient, until, sleep } from './k264_vm.mjs';
import { moduleLogic } from './harness.mjs';

const D = 'tst_d1', KP = 'bassam_perms_v1', GK = 'bsdept:' + D + ':bassam_grants_v1', TPK = 'bsdept:' + D + ':bassam_perm_tpls_v1', EK = 'tst_e_emp1', TID = 'tTSTCAP';
const PG = ['dstats', 'emps', 'planning', 'staff', 'plan', 'daily', 'dreport', 'tasks', 'irshad', 'seized', 'award', 'links', 'help', 'admin'];
const LENSES = ['zones', 'paths', 'gates', 'marks', 'dist', 'dens'];
const WIDE = { cap: PG.slice(), emps: ['data', 'custody'], admin: ['backup', 'oplog', 'shifts', 'ptpls', 'import'], daily: ['kpiDaily', 'kpiOcc', 'kpiZones', 'rounds', 'field'], lenses: LENSES.slice() };
const NARROW = { cap: PG.filter((k) => !['award', 'seized', 'links', 'dstats'].includes(k)), emps: ['data'], admin: ['backup', 'ptpls'], daily: ['rounds'], lenses: ['zones'] };
const SHEET = { 'emps/custody': ['view', 'edit'], 'emps/data': ['view'], 'daily/rounds': ['view', 'edit'], 'daily/kpiDaily': ['view'], 'admin/oplog': ['view'],
  'award/res': ['view'], 'award/new': ['view', 'add'], links: ['view'], tasks: ['view'], 'irshad/records': ['view', 'add'] };
const LATENT = ['emps/custody', 'daily/kpiDaily', 'admin/oplog', 'award/res', 'award/new', 'links'];
const ACC = { dm1: ['0000000101', '70101'], emp1: ['0000000113', '70113'] };
const BLOCKS = ['255-page-manifest.js', '260-bassam-plat.js', '280-server-storage.js', '310-image-refs.js', '320-dept-storage.js', '330-auth.js', '331-perm-model.js', '332-find-day.js', '333-platform-map.js', '334-perm-tree-tpl.js', '340-registry-v24-9.js', '440-count.js'];
const cp = (o) => JSON.parse(JSON.stringify(o));

async function scene(mode) {
  const W = await world({ mode });
  const P = stored(W.env, KP);
  P.caps[D] = WIDE.cap.slice();
  P.subs = { [D]: { emps: WIDE.emps.slice(), admin: WIDE.admin.slice(), 'daily:tabs': WIDE.daily.slice() } };
  P.lenses[D] = LENSES.slice();
  P.emps[D][EK] = cp(SHEET);
  P.empLens[D][EK] = ['zones', 'dens'];
  P.tplOf = { [D]: { [EK]: TID } };
  putKV(W.env, KP, P);
  const R = (await import('./internals.mjs')).internals;
  const IN = await R(['KIVO_REGISTRY']);
  const own = (k) => String((IN.KIVO_REGISTRY.byKey[k] || {}).owner || '').split('/')[0];
  const plus = IN.KIVO_REGISTRY.keys.filter((k) => IN.KIVO_REGISTRY.byKey[k].status === 'active' && IN.KIVO_REGISTRY.byKey[k].grant === 'assignable' && own(k) === 'award').slice(0, 2);
  assert.ok(plus.length === 2, 'two assignable award keys');
  putKV(W.env, GK, { v: 1, emp: { [EK]: { plus, minus: [], at: 1, by: 'su' } } });
  putKV(W.env, TPK, [{ id: TID, name: 'TEST_ONLY · قالب', perms: { 'irshad/records': ['view'], tasks: ['view'], 'award/res': ['view'] }, lens: ['zones', 'dens'],
    keys24: ['ir.rec.view', 'task.view'].concat(plus.slice(0, 1)) }]);
  const ck = { su: W.su.ck };
  for (const a of Object.keys(ACC)) ck[a] = (await W.login(ACC[a][0], ACC[a][1])).ck;
  Object.assign(W, { ck, plus });
  /* the system administrator's first page load runs the existing one-time registry upgrades (help leaf · explicit manager sheets) — settled first */
  const c = await clientOf(W, 'su'); try { await c.settle(); } finally { c.dispose(); }
  W.SH = cp(stored(W.env, KP).emps[D][EK]);
  return W;
}
/* the real client of one account: boot from the worker, device session set before the blocks run (as in the browser) */
async function clientOf(W, who) {
  const boot = (await W.C.boot(W.ck[who])).boot;
  assert.ok(boot && boot.uid, 'boot ' + who);
  const T = loadClient({ C: W.C, boot, jar: { cookie: W.ck[who] }, blocks: [] });
  T.W.atob = globalThis.atob; T.W.btoa = globalThis.btoa;
  T.W.localStorage._m.set('bassam_session_v1', JSON.stringify({ uid: boot.uid, ts: Date.now(), la: Date.now() }));
  T.W.localStorage._m.set('bassam_active_dept_v1', D);
  T.W.document.hidden = true;
  T.run(BLOCKS);
  if (!T.W.KIVO.KIVO_REGISTRY && T.W.KIVO_REGISTRY) T.W.KIVO.KIVO_REGISTRY = T.W.KIVO_REGISTRY;
  const K = T.W.KIVO, SV = K.__BS_SRV, I = K.__BS_I.auth;
  assert.ok(I && !I.dead && SV, 'client loaded');
  const settle = async () => { await sleep(30); assert.ok(await until(() => !SV.dirty() && !SV.inflight(), 8000), 'saved'); await sleep(30); };
  return { T, K, I, P: K.BassamPerm, SV, settle, denied: () => SV.denied(), dispose: () => T.dispose() };
}
const keep = (W) => JSON.stringify([stored(W.env, KP).emps[D], stored(W.env, KP).empLens[D], stored(W.env, KP).tplOf, stored(W.env, GK)]);
async function ceiling(c, x) {
  for (const r of [c.I.setDeptCap(D, x.cap), c.I.setDeptSubs(D, 'emps', x.emps), c.I.setDeptSubs(D, 'admin', x.admin), c.I.setDeptTabs(D, 'daily', x.daily), c.I.setDeptLenses(D, x.lenses)])
    assert.equal(r && r.ok, true, 'the system administrator writes the ceiling');
  await c.settle();
  assert.equal(c.denied(), 0, 'the worker accepted every save');
}

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';

  test(M + 'narrow then widen (pages · tabs · lenses) from the real client: stored sheets, lens lists, template ids and explicit grants stay byte-identical in D1', async () => {
    const W = await scene(mode), k0 = keep(W);
    const c = await clientOf(W, 'su');
    try {
      await ceiling(c, NARROW);
      assert.deepEqual(stored(W.env, KP).caps[D], NARROW.cap, 'the ceiling is narrowed in D1');
      assert.equal(keep(W), k0, 'after narrowing: nothing stored is deleted');
      await ceiling(c, WIDE);
      assert.equal(keep(W), k0, 'after widening: byte-identical');
    } finally { c.dispose(); }
  });

  test(M + 'a narrowed grant gives no access in the employee client (myPerms · editors) and comes back exactly when widened', async () => {
    const W = await scene(mode);
    const s = await clientOf(W, 'su'); try { await ceiling(s, NARROW); } finally { s.dispose(); }
    let e = await clientOf(W, 'emp1');
    try {
      const mp = e.I.myPerms();
      for (const k of LATENT) assert.ok(!(mp[k] || []).length, 'hidden: ' + k);
      assert.ok((mp.tasks || []).length && (mp['daily/rounds'] || []).length, 'inside the ceiling stays');
      assert.deepEqual(Object.keys(e.P.empPerms(EK, D)).sort(), Object.keys(W.SH).filter((k) => !LATENT.includes(k)).sort(), 'the editors read the narrowed sheet');
    } finally { e.dispose(); }
    const s2 = await clientOf(W, 'su'); try { await ceiling(s2, WIDE); } finally { s2.dispose(); }
    e = await clientOf(W, 'emp1');
    try { const mp = e.I.myPerms(); for (const k of LATENT) assert.deepEqual(cp(mp[k] || null), W.SH[k], 'restored: ' + k); } finally { e.dispose(); }
  });

  test(M + 'the unit manager edits a sheet holding latent leaves and lenses: the worker accepts it and the latent items stay (F05 · F06)', async () => {
    const W = await scene(mode);
    const s = await clientOf(W, 'su'); try { await ceiling(s, NARROW); } finally { s.dispose(); }
    const m = await clientOf(W, 'dm1');
    try {
      assert.equal(m.I.setEmpPerms(EK, { tasks: ['view', 'add'], 'emps/data': ['view'], 'irshad/records': ['view', 'add'] }, D).ok, true);
      assert.equal(m.I.setEmpLens(EK, ['zones'], D).ok, true);
      await m.settle();
      assert.equal(m.denied(), 0, 'no refusal for the latent leaves');
    } finally { m.dispose(); }
    const P = stored(W.env, KP), sh = P.emps[D][EK];
    assert.deepEqual(sh.tasks, ['view', 'add'], 'the edit is stored');
    assert.equal(sh['daily/rounds'], undefined, 'the in-ceiling leaf he removed is removed');
    for (const k of LATENT) assert.deepEqual(sh[k], SHEET[k], 'latent kept: ' + k);
    assert.deepEqual(P.empLens[D][EK].slice().sort(), ['dens', 'zones'], 'the switched-off lens stays');
    const s2 = await clientOf(W, 'su'); try { await ceiling(s2, WIDE); } finally { s2.dispose(); }
    const e = await clientOf(W, 'emp1');
    try { assert.deepEqual(cp(e.I.empLens(EK, D)).sort(), ['dens', 'zones'], 'the lens comes back on re-enable'); } finally { e.dispose(); }
  });

  test(M + 'saving a permission template under a narrowed ceiling keeps its out-of-ceiling items (F07)', async () => {
    const W = await scene(mode);
    const s = await clientOf(W, 'su'); try { await ceiling(s, NARROW); } finally { s.dispose(); }
    const c = await clientOf(W, 'su');
    try {
      c.T.W.DCLogic = class { constructor() { this.state = {}; } setState(p) { Object.assign(this.state, typeof p === 'function' ? p(this.state) : p); } };
      c.K.BassamPageKit = c.K.BassamPageKit || { base: (B) => class extends B {} };
      vm.runInContext(moduleLogic('admin') + '\n;globalThis.__C = Component;', c.T.ctx, { filename: 'admin/logic.js' });
      const a = Object.create(c.T.W.__C.prototype), msg = [];
      a.state = {}; a.setState = function (p) { Object.assign(this.state, typeof p === 'function' ? p(this.state) : p); };
      a.bsToast = (x) => msg.push('toast ' + x); a.bsAck = (x) => msg.push('ack ' + x);
      a.PC = () => true;
      assert.equal(!!a.t24On(), mode === 'enforce');
      a.tpOpen(TID);
      a.setState({ tpName: 'TEST_ONLY · قالب معدَّل' });
      a.tpSave();
      assert.ok(msg.some((x) => /^ack حُفظ القالب/.test(x)), msg.join(' | '));
      await c.settle();
      assert.equal(c.denied(), 0);
    } finally { c.dispose(); }
    const t = stored(W.env, TPK).find((x) => x.id === TID);
    assert.equal(t.name, 'TEST_ONLY · قالب معدَّل', 'saved');
    assert.ok(t.lens.includes('dens'), 'the switched-off lens stays in the template');
    if (mode === 'enforce') assert.ok(t.keys24.includes(W.plus[0]), 'the out-of-ceiling key stays in the template');
    assert.ok((t.perms['award/res'] || []).includes('view'), 'the out-of-ceiling leaf stays in the template');
  });

  test(M + 'independent ceiling: the explicit per-unit switch is a super save the worker accepts; the parent no longer narrows the unit; a manager cannot switch', async () => {
    const W = await scene(mode);
    const m = await clientOf(W, 'dm1');
    try { assert.equal(typeof m.I.setCapOwn, 'function'); assert.equal(m.I.setCapOwn(D, true).ok, false, 'a manager cannot switch'); } finally { m.dispose(); }
    const c = await clientOf(W, 'su');
    try {
      await sleep(100); assert.equal(c.T.saves().length, 0, 'opening the page writes nothing');
      assert.equal(c.I.setDeptCap('tst_g1', PG.filter((k) => k !== 'award')).ok, true);
      assert.ok(!c.I.deptCap(D).includes('award'), 'dependent by default: intersection with the parent');
      assert.equal(c.I.setCapOwn(D, true).ok, true);
      assert.ok(!c.I.deptCap(D).includes('award'), 'switching on keeps the current effective ceiling');
      assert.equal(c.I.setDeptCap(D, PG.slice()).ok, true);
      assert.equal(c.I.setDeptCap('tst_g1', ['help']).ok, true);
      await c.settle(); assert.equal(c.denied(), 0, 'all accepted');
      assert.ok(c.I.deptCap(D).includes('award') && c.I.deptCap(D).includes('emps'), 'own record alone, wider than the parent');
      assert.deepEqual(cp(c.I.deptCap('tst_d2')), ['help'], 'the dependent sibling intersects');
    } finally { c.dispose(); }
    const P = stored(W.env, KP);
    assert.deepEqual(P.capOwn, { [D]: true }, 'the mode is stored in D1');
    assert.deepEqual(P.emps[D][EK], W.SH, 'no sheet touched');
  });
}
