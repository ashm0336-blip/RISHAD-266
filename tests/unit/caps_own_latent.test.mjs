/* caps-own · latent items are never lost by accident (021 latentLossWhy) — real worker over the D1 stand-in (tasks_fx), both authorization modes.
   (a) round trip with the real clients: narrow → the manager re-saves a sheet and lens list, the system administrator re-saves a leaf-key template
       and an old-format container-key template (and an explicit grant in enforce) → widen ⇒ everything as it was (container template: kept as a
       container key; in enforce it is rewritten as its v24.9 cover — every item kept)
   (b) split requests: the narrowing accepted first, then a second request that drops latent items (sheet leaf · lens · grant key · template
       leaf/lens/key · container template rewritten without its switched-off tab) ⇒ refused, D1 byte-identical
   (c) a filtered (privacy-projected) view of a manager keeps latent items when it saves; the same view without them is refused
   (d) explicit deletions stay allowed: a whole sheet, lens list, grant entry, template; a manager's in-ceiling leaf; the system administrator's
       clearLatent request. TEST_ONLY. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { world, stored, putKV } from './tasks_fx.mjs';
import { loadClient, until, sleep } from './k264_vm.mjs';
import { moduleLogic } from './harness.mjs';
import { internals } from './internals.mjs';

const D = 'tst_d1', KP = 'bassam_perms_v1', GK = 'bsdept:' + D + ':bassam_grants_v1', TPK = 'bsdept:' + D + ':bassam_perm_tpls_v1', EK = 'tst_e_emp1';
const PG = ['dstats', 'emps', 'planning', 'staff', 'plan', 'daily', 'dreport', 'tasks', 'irshad', 'seized', 'award', 'links', 'help', 'admin'];
const LENSES = ['zones', 'paths', 'gates', 'marks', 'dist', 'dens'];
const BLOCKS = ['255-page-manifest.js', '260-bassam-plat.js', '280-server-storage.js', '310-image-refs.js', '320-dept-storage.js', '330-auth.js', '331-perm-model.js', '332-find-day.js', '333-platform-map.js', '334-perm-tree-tpl.js', '340-registry-v24-9.js', '440-count.js'];
const cp = (o) => JSON.parse(JSON.stringify(o));
const NARROW = (P) => { P.caps[D] = PG.filter((k) => k !== 'award'); P.subs[D].emps = ['data']; P.lenses[D] = ['zones']; };
const WIDEN = (P) => { P.caps[D] = PG.slice(); P.subs[D].emps = ['data', 'custody']; P.lenses[D] = LENSES.slice(); };

async function clientOf(W, who) {
  const boot = (await W.C.boot(W.ck[who])).boot;
  const T = loadClient({ C: W.C, boot, jar: { cookie: W.ck[who] }, blocks: [] });
  T.W.atob = globalThis.atob; T.W.btoa = globalThis.btoa;
  T.W.localStorage._m.set('bassam_session_v1', JSON.stringify({ uid: boot.uid, ts: Date.now(), la: Date.now() }));
  T.W.localStorage._m.set('bassam_active_dept_v1', D);
  T.W.document.hidden = true;
  T.run(BLOCKS);
  if (!T.W.KIVO.KIVO_REGISTRY && T.W.KIVO_REGISTRY) T.W.KIVO.KIVO_REGISTRY = T.W.KIVO_REGISTRY;
  const K = T.W.KIVO, SV = K.__BS_SRV, I = K.__BS_I.auth;
  assert.ok(I && !I.dead && SV, 'client loaded');
  const settle = async () => { await sleep(30); assert.ok(await until(() => !SV.dirty() && !SV.inflight(), 8000), 'settled'); await sleep(30); };
  return { T, K, I, P: K.BassamPerm, SV, settle, dispose: () => T.dispose() };
}
async function save(W, who, vals, extra) {
  const ks = Object.keys(vals), g = await W.C.api('/api/get?keys=' + encodeURIComponent(ks.join(',')), { cookie: W.ck[who] });
  const body = Object.assign({ set: {}, del: [], base: {} }, extra || {});
  for (const k of ks) { body.set[k] = JSON.stringify(vals[k]); body.base[k] = ((g.j.keys || {})[k] || {}).rev || 0; }
  if (g.j.pscope !== undefined) body.pscope = g.j.pscope;
  const r = await W.C.api('/api/save', { method: 'POST', cookie: W.ck[who], body });
  const dn = r.j.denied || {};
  return { ok: ks.every((k) => r.j.revs && r.j.revs[k]), why: (dn[ks[0]] || {}).why || '', detail: String((dn[ks[0]] || {}).detail || ''), show: JSON.stringify(r.j).slice(0, 300) };
}
const got = async (W, who, k) => JSON.parse((await W.C.api('/api/get?keys=' + encodeURIComponent(k), { cookie: W.ck[who] })).j.keys[k].v);
const all = (W) => JSON.stringify([stored(W.env, KP), stored(W.env, GK), stored(W.env, TPK)]);

async function scene(mode) {
  const W = await world({ mode });
  W.ck = { su: W.su.ck, dm1: (await W.login('0000000101', '70101')).ck };
  const P = stored(W.env, KP);
  P.subs = { [D]: { emps: ['data', 'custody'] } };
  P.lenses[D] = LENSES.slice();
  P.emps[D][EK] = Object.assign(cp(P.emps[D][EK]), { 'award/res': ['view'], 'emps/custody': ['view', 'edit'] });
  P.empLens[D][EK] = ['zones', 'dens'];
  putKV(W.env, KP, P);
  const IN = await internals(['KIVO_REGISTRY']), R = IN.KIVO_REGISTRY;
  const aw = R.keys.filter((k) => R.byKey[k].status === 'active' && R.byKey[k].grant === 'assignable' && String(R.byKey[k].owner || '').split('/')[0] === 'award').slice(0, 2);
  putKV(W.env, GK, { v: 1, emp: { [EK]: { plus: aw.slice(), minus: [], at: 1, by: 'su' } } });
  /* the existing one-time upgrades of the system administrator's first page load, settled first; the leaf template = its own v24.9 cover */
  const c = await clientOf(W, 'su');
  let T1;
  try {
    await c.settle();
    const k24 = ['task.view', aw[0]].sort(), E = {}; k24.forEach((k) => { E[k] = true; });
    T1 = { id: 'tTSTL', name: 'TEST_ONLY · قالب أوراق', perms: cp(c.P.p24.cover(E)), lens: ['zones', 'dens'] };
    if (mode === 'enforce') T1.keys24 = k24;
    assert.ok(T1.perms['award/new'] || Object.keys(T1.perms).some((k) => k.indexOf('award/') === 0), 'the leaf template holds an award leaf');
  } finally { c.dispose(); }
  const T2 = { id: 'tTSTC', name: 'TEST_ONLY · قالب حاوية', perms: { emps: ['view'], tasks: ['view'] }, lens: ['zones', 'dens'] };
  putKV(W.env, TPK, [T1, T2]);
  return Object.assign(W, { aw });
}
async function tpSaveAll(W) {
  const c = await clientOf(W, 'su');
  try {
    c.T.W.DCLogic = class { constructor() { this.state = {}; } setState(p) { Object.assign(this.state, typeof p === 'function' ? p(this.state) : p); } };
    c.K.BassamPageKit = c.K.BassamPageKit || { base: (B) => class extends B {} };
    vm.runInContext(moduleLogic('admin') + '\n;globalThis.__C = Component;', c.T.ctx, { filename: 'admin/logic.js' });
    const a = Object.create(c.T.W.__C.prototype), msg = [];
    a.state = {}; a.setState = function (p) { Object.assign(this.state, typeof p === 'function' ? p(this.state) : p); };
    a.bsToast = (x) => msg.push('toast ' + x); a.bsAck = (x) => msg.push('ack ' + x); a.PC = () => true;
    for (const id of ['tTSTL', 'tTSTC']) { a.tpOpen(id); a.tpSave(); }
    assert.equal(msg.filter((x) => /^ack حُفظ القالب/.test(x)).length, 2, msg.join(' | '));
    if (W.mode === 'enforce') assert.equal(c.I.p24SetGrant(EK, D, { plus: [], minus: [] }).ok, true);
    await c.settle();
    assert.equal(c.SV.denied(), 0, 'accepted');
  } finally { c.dispose(); }
}

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';

  test(M + '(a) narrow → re-save sheet, lens list, templates (leaf-key and container-key) and grants → widen: everything as it was', async () => {
    const W = await scene(mode);
    const P0 = stored(W.env, KP), sh0 = cp(P0.emps[D][EK]), el0 = cp(P0.empLens[D][EK]), g0 = JSON.stringify(stored(W.env, GK)), stored0 = stored(W.env, TPK), t0 = [];
    let P = cp(P0); NARROW(P); assert.ok((await save(W, 'su', { [KP]: P })).ok, 'narrowed');
    const m = await clientOf(W, 'dm1');
    try {
      assert.equal(m.I.setEmpPerms(EK, cp(m.P.empPerms(EK, D)), D).ok, true);
      assert.equal(m.I.setEmpLens(EK, cp(m.P.empLens(EK, D)), D).ok, true);
      await m.settle(); assert.equal(m.SV.denied(), 0, 'the manager\'s re-save is accepted');
    } finally { m.dispose(); }
    await tpSaveAll(W);
    P = cp(stored(W.env, KP)); WIDEN(P); assert.ok((await save(W, 'su', { [KP]: P })).ok, 'widened');
    const P1 = stored(W.env, KP), t1 = stored(W.env, TPK);
    assert.deepEqual(P1.emps[D][EK], sh0, 'the sheet as it was'); assert.deepEqual(P1.empLens[D][EK], el0, 'the lens list as it was');
    assert.equal(JSON.stringify(stored(W.env, GK)), g0, 'explicit grants byte-identical');
    const by = (L, id) => L.find((t) => t.id === id);
    t0.length = 0; t0.push(by(stored0, 'tTSTL'), by(stored0, 'tTSTC')); const t1b = [by(t1, 'tTSTL'), by(t1, 'tTSTC')]; t1.length = 0; t1.push(...t1b);
    assert.equal(JSON.stringify(t1[0]), JSON.stringify(t0[0]), 'the leaf-key template byte-identical');
    if (mode === 'legacy') assert.equal(JSON.stringify(t1[1]), JSON.stringify(t0[1]), 'the container-key template byte-identical (no implicit expansion)');
    else {
      assert.deepEqual(t1[1].lens, t0[1].lens, 'its switched-off lens kept');
      for (const l of ['emps/data', 'emps/custody', 'tasks']) assert.ok((t1[1].perms[l] || t1[1].perms[l.split('/')[0]] || []).includes('view'), 'container template keeps ' + l);
      assert.deepEqual(Object.keys(t1[1].perms).filter((k) => !['emps', 'emps/data', 'emps/custody', 'tasks'].includes(k)), [], 'nothing wider than it had');
    }
  });

  test(M + '(b) split requests: the narrowing first, then a request dropping latent items ⇒ refused, D1 byte-identical', async () => {
    const W = await scene(mode);
    let P = cp(stored(W.env, KP)); NARROW(P); assert.ok((await save(W, 'su', { [KP]: P })).ok, 'the narrowing alone is accepted');
    const s0 = all(W);
    const tries = {
      'a sheet leaf (page outside)': () => { const Q = cp(stored(W.env, KP)); delete Q.emps[D][EK]['award/res']; return { [KP]: Q }; },
      'a sheet leaf (tab switched off)': () => { const Q = cp(stored(W.env, KP)); delete Q.emps[D][EK]['emps/custody']; return { [KP]: Q }; },
      'an action of a latent leaf': () => { const Q = cp(stored(W.env, KP)); Q.emps[D][EK]['emps/custody'] = ['view']; return { [KP]: Q }; },
      'a switched-off lens of a list': () => { const Q = cp(stored(W.env, KP)); Q.empLens[D][EK] = ['zones']; return { [KP]: Q }; },
      'a template leaf outside the ceiling': () => { const T = cp(stored(W.env, TPK)); for (const k of Object.keys(T[0].perms)) if (k.indexOf('award') === 0) delete T[0].perms[k]; return { [TPK]: T }; },
      'a template switched-off lens': () => { const T = cp(stored(W.env, TPK)); T[0].lens = ['zones']; return { [TPK]: T }; },
      'a container template rewritten without its switched-off tab': () => { const T = cp(stored(W.env, TPK)); T[1].perms = { 'emps/data': ['view'], tasks: ['view'] }; return { [TPK]: T }; }
    };
    if (mode === 'enforce') tries['a grant key outside the ceiling'] = () => { const G = cp(stored(W.env, GK)); G.emp[EK].plus = G.emp[EK].plus.slice(1); return { [GK]: G }; };
    if (mode === 'enforce') tries['a template key outside the ceiling'] = () => { const T = cp(stored(W.env, TPK)); T[0].keys24 = ['task.view']; return { [TPK]: T }; };
    for (const [n, f] of Object.entries(tries)) {
      const r = await save(W, 'su', f());
      assert.ok(!r.ok, n + ' — accepted: ' + r.show);
      assert.equal(r.why, 'perms', n); assert.match(r.detail, /^latent: .* \| لم يُحفظ شيء/, n);
    }
    assert.equal(all(W), s0, 'nothing written');
  });

  test(M + '(c) a filtered (projected) manager view keeps latent items when saving; the same view without them is refused', async () => {
    const W = await scene(mode);
    let P = cp(stored(W.env, KP)); NARROW(P); assert.ok((await save(W, 'su', { [KP]: P })).ok);
    let v = await got(W, 'dm1', KP);
    assert.ok(v.emps[D][EK]['award/res'], 'the projection carries the latent leaf');
    v.emps[D][EK].tasks = ['view', 'add'];
    let r = await save(W, 'dm1', { [KP]: v }); assert.ok(r.ok, r.show);
    assert.deepEqual(stored(W.env, KP).emps[D][EK]['award/res'], ['view']);
    const s0 = all(W);
    v = await got(W, 'dm1', KP); delete v.emps[D][EK]['award/res']; v.emps[D][EK].tasks = ['view'];
    r = await save(W, 'dm1', { [KP]: v }); assert.ok(!r.ok, 'a view without the latent leaf'); assert.equal(r.why, 'perms');
    assert.equal(all(W), s0);
  });

  test(M + '(d) explicit deletions stay allowed: whole sheet, lens list, grant entry, template; in-ceiling leaf; the system administrator\'s clearLatent', async () => {
    const W = await scene(mode);
    let P = cp(stored(W.env, KP)); NARROW(P); assert.ok((await save(W, 'su', { [KP]: P })).ok);
    let v = await got(W, 'dm1', KP); delete v.emps[D][EK].tasks;
    assert.ok((await save(W, 'dm1', { [KP]: v })).ok, 'a manager removes an in-ceiling leaf');
    P = cp(stored(W.env, KP)); delete P.emps[D][EK]['award/res'];
    let r = await save(W, 'su', { [KP]: P }, { clearLatent: true }); assert.ok(r.ok, 'the system administrator clears a latent leaf explicitly — ' + r.show);
    v = await got(W, 'dm1', KP); delete v.emps[D].tst_e_lens_off; delete v.empLens[D][EK];
    assert.ok((await save(W, 'dm1', { [KP]: v })).ok, 'a whole sheet and a whole lens list');
    v = await got(W, 'dm1', KP); delete v.emps[D][EK];
    assert.ok((await save(W, 'su', { [KP]: Object.assign(cp(stored(W.env, KP)), { emps: Object.assign(cp(stored(W.env, KP).emps), { [D]: v.emps[D] }) }) })).ok, 'a sheet holding latent leaves, whole');
    if (mode === 'enforce') { const G = cp(stored(W.env, GK)); delete G.emp[EK]; const rg = await save(W, 'su', { [GK]: G }); assert.ok(rg.ok, 'a whole grant entry — ' + rg.show); }   /* explicit grants: enforce only */
    const T = cp(stored(W.env, TPK)).slice(1);
    assert.ok((await save(W, 'su', { [TPK]: T })).ok, 'a whole template');
    v = await got(W, 'dm1', KP); delete v.emps[D].tst_e_sup1['irshad/records']; v.emps[D].tst_e_imp = Object.assign({}, v.emps[D].tst_e_imp);
    P = cp(stored(W.env, KP)); P.emps[D].tst_e_sup1['award/res'] = ['view']; assert.ok((await save(W, 'su', { [KP]: P }, { clearLatent: true })).ok, 'setup: a latent leaf');
    v = await got(W, 'dm1', KP); delete v.emps[D].tst_e_sup1['award/res'];
    const r2 = await save(W, 'dm1', { [KP]: v }, { clearLatent: true });
    assert.ok(!r2.ok && r2.why === 'perms', 'the marker is the system administrator\'s alone — ' + r2.show);
  });

  test(M + '(e) editing an old-format container-key template under switched-off tabs keeps them with the container\'s actions — nothing wider', async () => {
    const W = await scene(mode);
    let P = cp(stored(W.env, KP)); NARROW(P); assert.ok((await save(W, 'su', { [KP]: P })).ok);
    const c = await clientOf(W, 'su');
    try {
      c.T.W.DCLogic = class { constructor() { this.state = {}; } setState(p) { Object.assign(this.state, typeof p === 'function' ? p(this.state) : p); } };
      c.K.BassamPageKit = c.K.BassamPageKit || { base: (B) => class extends B {} };
      vm.runInContext(moduleLogic('admin') + '\n;globalThis.__C = Component;', c.T.ctx, { filename: 'admin/logic.js' });
      const a = Object.create(c.T.W.__C.prototype), msg = [];
      a.state = {}; a.setState = function (p) { Object.assign(this.state, typeof p === 'function' ? p(this.state) : p); };
      a.bsToast = (x) => msg.push('toast ' + x); a.bsAck = (x) => msg.push('ack ' + x); a.PC = () => true;
      a.tpOpen('tTSTC');
      if (mode === 'enforce') { const C = c.P.p24.ceil(D); a.setState({ tp24Draft: Object.assign({}, a.tp24Base(a.tpRead().find((t) => t.id === 'tTSTC'), D, C), { 'emp.view': true }) }); }
      else a.setState({ tpDraft: Object.assign({}, a.state.tpDraft, { 'emps/data': ['view', 'edit'] }) });
      a.tpSave(); await c.settle(); assert.equal(c.SV.denied(), 0, msg.join(' | '));
    } finally { c.dispose(); }
    const t = stored(W.env, TPK).find((x) => x.id === 'tTSTC');
    if (t.perms.emps) assert.deepEqual(t.perms.emps, ['view'], 'unchanged container: the container key kept as it was');
    else {
      assert.deepEqual(t.perms['emps/custody'], ['view'], 'the switched-off tab kept with the container\'s action, no wider: ' + JSON.stringify(t));
      if (mode === 'legacy') assert.deepEqual(t.perms['emps/data'], ['view', 'edit'], 'the edit');
    }
    assert.ok(mode === 'enforce' || !t.perms.emps, 'legacy: the edited container is written as leaves');
    assert.deepEqual(Object.keys(t.perms).filter((k) => !['emps', 'emps/data', 'emps/custody', 'tasks'].includes(k)), [], 'nothing wider than it had');
    assert.ok(t.lens.includes('dens'));
  });
}
