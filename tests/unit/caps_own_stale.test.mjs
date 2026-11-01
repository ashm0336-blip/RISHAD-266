/* caps-own · stale clients — a page built before read-time narrowing (3773e3c client logic) narrows a ceiling and, in the same save, deletes
   what fell outside it (sheets · lens lists · explicit grants). The worker refuses the whole request; D1 stays byte-identical. The current
   client's narrowing and deliberate removals are accepted. Real worker over the D1 stand-in (tasks_fx), both authorization modes. TEST_ONLY. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { world, stored, putKV } from './tasks_fx.mjs';
import { loadClient, until, sleep } from './k264_vm.mjs';
import { ROOT, blockFile } from './harness.mjs';
import { internals } from './internals.mjs';

const D = 'tst_d1', KP = 'bassam_perms_v1', GK = 'bsdept:' + D + ':bassam_grants_v1', EK = 'tst_e_emp1';
const PG = ['dstats', 'emps', 'planning', 'staff', 'plan', 'daily', 'dreport', 'tasks', 'irshad', 'seized', 'award', 'links', 'help', 'admin'];
const LENSES = ['zones', 'paths', 'gates', 'marks', 'dist', 'dens'];
const BLOCKS = ['255-page-manifest.js', '260-bassam-plat.js', '280-server-storage.js', '310-image-refs.js', '320-dept-storage.js', '330-auth.js', '331-perm-model.js', '332-find-day.js', '333-platform-map.js', '334-perm-tree-tpl.js', '340-registry-v24-9.js', '440-count.js'];
const OLD_REV = process.env.KIVO_STALE_REV || '3773e3c';   /* the last client that trimmed on narrowing */
const cp = (o) => JSON.parse(JSON.stringify(o));

/* the old client's blocks, byte for byte from git (read-only) */
let OLD = null;
function oldBlocks() {
  if (OLD) return OLD;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kivo_stale_'));
  OLD = {};
  for (const b of BLOCKS) {
    const rel = path.relative(ROOT, blockFile(b)).split(path.sep).join('/');
    OLD[b] = execFileSync('git', ['-C', ROOT, 'show', OLD_REV + ':' + rel], { encoding: 'utf8', maxBuffer: 64 << 20 });
  }
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* temp */ }
  return OLD;
}
async function scene(mode) {
  const W = await world({ mode });
  const P = stored(W.env, KP);
  P.subs = { [D]: { emps: ['data', 'custody'], 'daily:tabs': ['kpiDaily', 'kpiOcc', 'kpiZones', 'rounds', 'field'] } };
  P.lenses[D] = LENSES.slice();
  P.emps[D][EK] = Object.assign(cp(P.emps[D][EK]), { 'award/res': ['view'], 'emps/custody': ['view', 'edit'], help: ['view'] });
  P.empLens[D][EK] = ['zones', 'dens'];
  putKV(W.env, KP, P);
  const IN = await internals(['KIVO_REGISTRY']), R = IN.KIVO_REGISTRY;
  const plus = R.keys.filter((k) => R.byKey[k].status === 'active' && R.byKey[k].grant === 'assignable' && String(R.byKey[k].owner || '').split('/')[0] === 'award').slice(0, 2);
  assert.equal(plus.length, 2);
  putKV(W.env, GK, { v: 1, emp: { [EK]: { plus, minus: [], at: 1, by: 'su' } } });
  W.ck = { su: W.su.ck, dm1: (await W.login('0000000101', '70101')).ck };
  /* the existing one-time upgrades of a system administrator's first page load — settled with the current client first */
  const c = await clientOf(W, 'su', false); try { await c.settle(); } finally { c.dispose(); }
  return W;
}
async function clientOf(W, who, old) {
  const boot = (await W.C.boot(W.ck[who])).boot;
  const T = loadClient({ C: W.C, boot, jar: { cookie: W.ck[who] }, blocks: [] });
  T.W.atob = globalThis.atob; T.W.btoa = globalThis.btoa;
  T.W.localStorage._m.set('bassam_session_v1', JSON.stringify({ uid: boot.uid, ts: Date.now(), la: Date.now() }));
  T.W.localStorage._m.set('bassam_active_dept_v1', D);
  T.W.document.hidden = true;
  if (old) { const O = oldBlocks(); for (const b of BLOCKS) vm.runInContext(O[b], T.ctx, { filename: 'old/' + b }); } else T.run(BLOCKS);
  if (!T.W.KIVO.KIVO_REGISTRY && T.W.KIVO_REGISTRY) T.W.KIVO.KIVO_REGISTRY = T.W.KIVO_REGISTRY;
  const K = T.W.KIVO, SV = K.__BS_SRV, I = K.__BS_I.auth;
  assert.ok(I && !I.dead, 'client loaded');
  const settle = async () => { await sleep(30); assert.ok(await until(() => !SV.dirty() && !SV.inflight(), 8000), 'settled'); await sleep(30); };
  return { T, I, SV, settle, dispose: () => T.dispose() };
}
const snap = (W) => JSON.stringify([stored(W.env, KP), stored(W.env, GK)]);
async function narrowWith(c) {
  c.I.setDeptCap(D, PG.filter((k) => k !== 'award'));
  c.I.setDeptSubs(D, 'emps', ['data']);
  c.I.setDeptLenses(D, ['zones']);
  await c.settle();
}
async function save(W, who, vals) {
  const ks = Object.keys(vals), g = await W.C.api('/api/get?keys=' + encodeURIComponent(ks.join(',')), { cookie: W.ck[who] });
  const body = { set: {}, del: [], base: {} };
  for (const k of ks) { body.set[k] = JSON.stringify(vals[k]); body.base[k] = ((g.j.keys || {})[k] || {}).rev || 0; }
  const r = await W.C.api('/api/save', { method: 'POST', cookie: W.ck[who], body });
  return { ok: ks.every((k) => r.j.revs && r.j.revs[k]), denied: r.j.denied || {}, show: JSON.stringify(r.j).slice(0, 300) };
}

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';

  test(M + 'the ' + OLD_REV + ' client narrows a ceiling (pages · tabs · lenses): the trimming request is refused whole, D1 byte-identical, the page is told', async () => {
    const W = await scene(mode), s0 = snap(W);
    const c = await clientOf(W, 'su', true);
    try {
      await narrowWith(c);
      assert.ok(c.SV.denied() >= 1, 'the old page received a refusal');
    } finally { c.dispose(); }
    assert.equal(snap(W), s0, 'nothing written: ceiling, sheets, lens lists and explicit grants as they were');
  });

  test(M + 'the exact combined payload of an old page (narrowed ceiling + trimmed sheet, lens list and grants) is refused with nothing written', async () => {
    const W = await scene(mode), s0 = snap(W);
    const P = cp(stored(W.env, KP)), G = cp(stored(W.env, GK));
    P.caps[D] = PG.filter((k) => k !== 'award'); delete P.emps[D][EK]['award/res'];
    G.emp[EK].plus = [];
    const r = await save(W, 'su', { [KP]: P, [GK]: G });
    assert.ok(!r.ok, 'refused: ' + r.show);
    assert.equal(r.denied[KP].why, 'perms'); assert.match(String(r.denied[KP].detail || ''), /stale-client: .*لم يُحفظ شيء.*أعد تحميل الصفحة/);
    assert.ok(r.denied[GK], 'the grants record is refused with it');
    assert.equal(snap(W), s0);
    const L = cp(stored(W.env, KP)); L.lenses[D] = ['zones']; L.empLens[D][EK] = ['zones'];
    assert.ok(!(await save(W, 'su', { [KP]: L })).ok, 'a lens switch-off that drops the lens from a list');
    const G2 = cp(stored(W.env, GK)); G2.emp = {};
    const P2 = cp(stored(W.env, KP)); P2.caps[D] = PG.filter((k) => k !== 'award');
    assert.ok(!(await save(W, 'su', { [KP]: P2, [GK]: G2 })).ok, 'a grants entry emptied by the narrowing');
    assert.equal(snap(W), s0);
  });

  test(M + 'the current client narrows (accepted, nothing deleted); deliberate removals in and with the same request are accepted', async () => {
    const W = await scene(mode), sh0 = cp(stored(W.env, KP).emps[D][EK]), g0 = JSON.stringify(stored(W.env, GK));
    const c = await clientOf(W, 'su', false);
    try { await narrowWith(c); assert.equal(c.SV.denied(), 0, 'accepted'); } finally { c.dispose(); }
    assert.deepEqual(stored(W.env, KP).caps[D], PG.filter((k) => k !== 'award'));
    assert.deepEqual(stored(W.env, KP).emps[D][EK], sh0, 'nothing deleted'); assert.equal(JSON.stringify(stored(W.env, GK)), g0);
    /* a manager removes an in-ceiling leaf */
    const m = await clientOf(W, 'dm1', false);
    try {
      const e = cp(m.T.W.KIVO.BassamPerm.empPerms(EK, D)); delete e.tasks;
      assert.equal(m.I.setEmpPerms(EK, e, D).ok, true); await m.settle(); assert.equal(m.SV.denied(), 0);
    } finally { m.dispose(); }
    assert.equal(stored(W.env, KP).emps[D][EK].tasks, undefined, 'removed'); assert.deepEqual(stored(W.env, KP).emps[D][EK]['award/res'], ['view'], 'latent kept');
    /* the system administrator narrows further and deletes a whole sheet and an in-ceiling leaf of another in the same request */
    const P = cp(stored(W.env, KP)); P.caps[D] = P.caps[D].filter((k) => k !== 'seized'); delete P.emps[D].tst_e_snop;
    P.emps[D].tst_e_sup1 = Object.assign({}, P.emps[D].tst_e_sup1); delete P.emps[D].tst_e_sup1.staff;
    const r = await save(W, 'su', { [KP]: P });
    assert.ok(r.ok, r.show);
    assert.equal(stored(W.env, KP).emps[D].tst_e_snop, undefined);
  });
}
