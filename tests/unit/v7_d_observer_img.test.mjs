/* RISHAD V7-D — the field observer and the images of the plan and the rounds (real worker, TEST_ONLY fixture world tst_d1).
   Owner decision: «الراصد في enforce لا يستبدل ولا يحذف صور الخطة والجولات، كما في legacy.»
   Found by the V7-C matrix (pinned there as a labelled finding): in ENFORCE a holder of field.view whose only write keys are the
   status keys derived from it (lens.zones/gates/marks.status.change — by a stored sheet «رصد الميدان: عرض», by an explicit grant, or
   by a view-only page-level sheet of «المتابعة اليومية») could PUT (replace) or DELETE any image bound to the unit's plan or rounds
   (the site map), wrote the technical flags and uploaded new unbound images. LEGACY refuses all of it.
   The rule (057 enfDerivedBare — the confinement rule itself, enfFieldOnly + enfFieldLift, not a parallel one): the derived status keys
   are a write of the STATUS of assigned elements only; they count as «a write of the record» (image owner · any-writer) only for
   an account whose confinement is lifted — an explicit, non-derived write on the rounds or a lens, as a supervisor today.
   Every cell compares the stored image bytes before and after the attempt — not only the HTTP status. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { internals } from './internals.mjs';
import { world, workerUnderTest, D, PNG, TAG, stored, taskCommandBody, operationSaveBody } from './tasks_fx.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const WU = workerUnderTest();
const KP = 'bassam_perms_v1', KPLAN = 'bsdept:' + D + ':bassam_plan_v1', KR = 'bsdept:' + D + ':bassam_rounds_v1', KGR = 'bsdept:' + D + ':bassam_grants_v1', KPROF = 'bsdept:' + D + ':bassam_profile_v1';
const DM = ['0000000101', '70101'], OBS = ['0000000118', '70118'], OBS_E = 'tst_e_field';
const isDay = (k) => /^\d+-\d+-\d+$/.test(k);
const put = (DB, k, v) => { DB.db.prepare('DELETE FROM kv WHERE k = ?').run(k); DB.db.prepare('INSERT INTO kv (k, seq, v) VALUES (?, 0, ?)').run(k, JSON.stringify(v)); DB.db.prepare('INSERT INTO revs (k, rev) VALUES (?, 1) ON CONFLICT(k) DO UPDATE SET rev = rev + 1').run(k); };
const read = (DB, k) => JSON.parse(DB.q('SELECT v FROM kv WHERE k = ? ORDER BY seq', k).map((r) => r.v).join('') || 'null');
const REG = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/permissions/registry/registry-v24.9.json'), 'utf8')).registry;
const DER = ['lens.zones.status.change', 'lens.gates.status.change', 'lens.marks.status.change'];
/* what «تحديد الكل: عرض فقط» of the editor grants (as in v7_p3_sec_field_assigned): the first view key of every page and lens */
const VIEWS = (() => { const seen = {}, out = []; REG.forEach((e) => { if (e.status !== 'active' || e.grant !== 'assignable' || e.ownerKind === 'platform' || e.ownerKind === 'reference' || seen[e.owner]) return; if (e.type === 'access' || e.type === 'view') { seen[e.owner] = 1; out.push(e.key); } }); return out; })();
const OTHER = 'data:image/png;base64,iVBORw0KGgo=';   /* what the observer tries to put in place of the map */
let seq = 0;

const post = (W, ck, p, body) => W.C.api(p, { method: 'POST', cookie: ck, body: operationSaveBody(W.env, p, taskCommandBody(W.env, p, body)) });
const img = (W, ck, id, method, body) => W.C.api('/api/img/' + id, Object.assign({ method, cookie: ck }, method === 'PUT' ? { body: body || PNG, headers: { 'Content-Type': 'text/plain' } } : {}));
/* the stored image: the row of the image table and, when it points at the object store (the '~r2~' marker), the object itself */
const bytes = async (W, id) => {
  const row = W.env.DB.q('SELECT v FROM imgs WHERE k = ? ORDER BY seq', id).map((r) => r.v).join(''), o = await W.env.IMG_R2.get('img/' + id);
  return row === '~r2~' ? (o ? await o.text() : '~r2~ without an object') : row;
};
const own = (W, id) => W.env.DB.q('SELECT st, k FROM imgown WHERE img = ?', id)[0] || null;

/* a world where the unit manager has uploaded two site maps and bound one to the plan and one to today's round — by saving them */
async function scene(mode, setup) {
  const W = await world({ worker: WU.file, mode }), DB = W.env.DB, x = mode.slice(0, 1) + (++seq).toString(36);
  const P = read(DB, KP); P.emps = P.emps || {}; P.emps[D] = P.emps[D] || {};
  setup({ sheet: (s) => { if (s === null) delete P.emps[D][OBS_E]; else P.emps[D][OBS_E] = s; }, grant: (plus) => put(DB, KGR, { v: 1, emp: { [OBS_E]: { plus, minus: [], at: 1, by: 'TEST_ONLY' } } }) });
  put(DB, KP, P);
  const dm = await W.login(...DM), ids = { plan: 'img_v7d' + x + '_planmap', rounds: 'img_v7d' + x + '_roundmap' };
  for (const [res, k, edit] of [['plan', KPLAN, (v) => { v.floors[0].iid = ids.plan; }], ['rounds', KR, (v) => { const day = Object.keys(v).filter(isDay).sort().pop(); v[day].d[0].iid = ids.rounds; }]]) {
    assert.equal((await img(W, dm.ck, ids[res], 'PUT')).status, 200, 'the manager uploads the ' + res + ' map');
    const g = await W.C.api('/api/operations/read?keys=' + encodeURIComponent(k), { cookie: dm.ck }), v = g.j.resources[k];
    edit(v);
    const sv = await post(W, dm.ck, '/api/save', { set: { [k]: JSON.stringify(v) }, del: [], base: { [k]: g.j.base[k] }, why: { [k]: TAG + ' site map' } });
    assert.ok(sv.status === 200 && !(sv.j.denied || {})[k], 'the manager saves the ' + res + ': ' + JSON.stringify(sv.j).slice(0, 300));
    assert.deepEqual([own(W, ids[res]).st, own(W, ids[res]).k], ['bound', k], 'the image is bound to the ' + res);
    assert.equal(await bytes(W, ids[res]), PNG);
  }
  return { W, ids, x, ob: await W.login(...OBS), dm };
}
/* the attempts of one account: replace then delete each bound map; an ordinary new image; a technical flag; a task-proof upload.
   Each answer is checked against what is stored. */
async function attempts(S, ck) {
  const { W, ids, x } = S, out = {};
  for (const res of ['plan', 'rounds']) {
    const before = await bytes(W, ids[res]);
    const p = await img(W, ck, ids[res], 'PUT', OTHER), afterPut = await bytes(W, ids[res]);
    out['put@' + res] = p.status === 200 ? 'Y' : p.status + ':' + ((p.j && p.j.why) || '');
    assert.equal(afterPut !== before, p.status === 200, 'put@' + res + ': the answer matches the stored bytes');
    if (p.status !== 200) assert.equal(afterPut, PNG, 'put@' + res + ' refused: the stored map is byte-identical');
    const d = await img(W, ck, ids[res], 'DELETE'), afterDel = await bytes(W, ids[res]);
    out['del@' + res] = d.status === 200 ? 'Y' : d.status + ':' + ((d.j && d.j.why) || '');
    assert.equal(afterDel === '', d.status === 200, 'del@' + res + ': the answer matches the store');
    if (d.status !== 200) { assert.equal(afterDel, afterPut, 'del@' + res + ' refused: the stored map is untouched'); assert.equal(own(W, ids[res]).st, 'bound'); }
  }
  const n = await img(W, ck, 'img_v7d' + x + '_new', 'PUT'); out['new img'] = n.status === 200 ? 'Y' : n.status + ':' + ((n.j && n.j.why) || '');
  assert.equal(await bytes(W, 'img_v7d' + x + '_new') !== '', n.status === 200, 'new img: the answer matches the store');
  const pb = JSON.stringify(read(W.env.DB, KPROF)), t = await W.C.save(ck, { [KPROF]: JSON.stringify({ t: 'TEST_ONLY ' + x }) }), dn = t.j && t.j.denied && t.j.denied[KPROF];
  out.tech = t.status !== 200 ? 'HTTP ' + t.status : dn ? 'no:' + dn.why : 'Y';
  assert.equal(JSON.stringify(read(W.env.DB, KPROF)) !== pb, out.tech === 'Y', 'tech flag: the answer matches what is stored');
  const pr = await img(W, ck, 'img_tskv7d' + x + '_proof', 'PUT'); out.proof = pr.status === 200 ? 'Y' : String(pr.status);
  return out;
}
const run = async (mode, setup, who) => { const S = await scene(mode, setup); const o = await attempts(S, S[who || 'ob'].ck); if (process.env.V7D_PRINT) console.log(mode + ' ' + JSON.stringify(o)); return o; };

/* the target for an observer — in both modes: nothing but his own task-proof upload (selfProof) */
const REFUSED = { 'put@plan': '403:bound', 'del@plan': '403:bound', 'put@rounds': '403:bound', 'del@rounds': '403:bound', 'new img': '403:' /* V7-F (owner decision 4): the unified refusal carries no reason (was 403:none) */, tech: 'no:view', proof: 'Y' };
const ALL = { 'put@plan': 'Y', 'del@plan': 'Y', 'put@rounds': 'Y', 'del@rounds': 'Y', 'new img': 'Y', tech: 'Y', proof: 'Y' };

const OBSERVERS = [
  ['a stored sheet — «رصد الميدان: عرض»', (x) => x.sheet({ 'daily/field': ['view'] })],
  ['a view-only page-level sheet of «المتابعة اليومية»', (x) => x.sheet({ daily: ['view'] })],
  ['explicit grant: field.view + the derived status keys', (x) => { x.sheet(null); x.grant(['field.view'].concat(DER)); }],
  ['explicit grant: field.view + view of the plan and the rounds', (x) => { x.sheet(null); x.grant(['field.view', 'round.view', 'plan.view'].concat(DER)); }],
  ['«تحديد الكل: عرض فقط» of the editor — every view key', (x) => { x.sheet(null); x.grant(VIEWS.concat(DER)); }],
];
for (const [label, setup] of OBSERVERS) test('[enforce] the observer (' + label + ') does not replace or delete the plan map or the round map — bytes unchanged', { timeout: 300000 }, async () => {
  assert.deepEqual(await run('enforce', setup), REFUSED);
});

/* an explicit, non-derived write lifts it — exactly as measured before V7-D (09a5fe8): nothing changes for these accounts */
const LIFTED = [
  ['explicit grant with round.edit', (x) => { x.sheet(null); x.grant(['field.view', 'round.view', 'round.edit'].concat(DER)); }, ALL],
  ['every view key + one lens data edit', (x) => { x.sheet(null); x.grant(VIEWS.concat(DER, ['lens.zones.data.edit'])); }, ALL],
  ['a stored supervisor sheet (write on «الجولات»)', (x) => x.sheet({ 'daily/field': ['view'], 'daily/rounds': ['view', 'edit'] }), ALL],
];
for (const [label, setup, want] of LIFTED) test('[enforce] a real write is unchanged — ' + label, { timeout: 300000 }, async () => {
  assert.deepEqual(await run('enforce', setup), want);
});
test('[enforce] the unit manager is unchanged', { timeout: 300000 }, async () => {
  assert.deepEqual(await run('enforce', () => {}, 'dm'), ALL);
});

test('[legacy] unchanged: the observer is refused, the stored sheet decides', { timeout: 300000 }, async () => {
  assert.deepEqual(await run('legacy', (x) => x.sheet({ 'daily/field': ['view'] })), REFUSED, 'observer');
  assert.deepEqual(await run('legacy', (x) => x.sheet({ daily: ['view'] })), REFUSED, 'view-only page-level sheet');
  assert.deepEqual(await run('legacy', (x) => x.sheet({ 'daily/field': ['view'], 'daily/rounds': ['view', 'edit'] })), LEGACY_SUP, 'supervisor sheet (pinned as measured on 09a5fe8)');
  assert.deepEqual(await run('legacy', () => {}, 'dm'), ALL, 'unit manager');
});
const LEGACY_SUP = { 'put@plan': '403:bound', 'del@plan': '403:bound', 'put@rounds': 'Y', 'del@rounds': 'Y', 'new img': 'Y', tech: 'Y', proof: 'Y' };

/* the rule itself, called directly: fail-closed when the grants record cannot be read (as v7_sec_field_failclosed for enfFieldOnly) */
test('enforce: an unreadable grants record never turns the derived keys into a write of the record', async () => {
  const { enfDerivedBare } = await internals(['enfDerivedBare']);
  const actor = (o = {}) => Object.assign({ u: { role: 'staff', ekey: 'TEST_ONLY_e', deptId: 'TEST_ONLY_d' }, perms: { caps: {}, emps: {} }, enf: { mode: 'enforce' } }, o);
  const A = actor(); Object.defineProperty(A, '__grants', { get() { throw new Error('TEST_ONLY read error'); } });
  for (const B of [A, actor()]) { const dv = enfDerivedBare(B, 'TEST_ONLY_d'); assert.ok(dv, 'not counted'); for (const k of DER) assert.equal(dv[k], 1, k); }
  for (const role of ['super', 'dept']) assert.equal(enfDerivedBare(actor({ u: { role, ekey: 'x' } }), 'TEST_ONLY_d'), null, role + ' is never an observer');
});
