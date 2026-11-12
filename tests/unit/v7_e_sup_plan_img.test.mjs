/* RISHAD V7-E — the supervisor and the image of the plan (real worker, TEST_ONLY fixture world tst_d1).
   Owner decision: «المشرف وخريطة الخطة في enforce: يُمنع كما في legacy.»
   Found by the V7-C/V7-D matrices (pinned in v7_d_observer_img as LEGACY_SUP against the enforce rows): in ENFORCE an account whose
   writes are only on the ROUNDS side — a stored supervisor sheet with a write on «الجولات», an explicit grant of a key of the rounds
   page (round.edit …) or of a lens key (lens.zones.data.edit …) — could PUT (replace) or DELETE an image bound to the unit's PLAN
   (the site map of the plan). LEGACY refuses it: an image follows the write of its record, and the plan record is written from the
   plan page only (023 RES_REG cap 'plan' → 054 imgWriteOk → authorize).
   Cause: the lens keys list BOTH records among their resources in the registry (guard.resources: bassam_plan_v1 + bassam_rounds_v1 —
   the lens elements live in the plan and are copied into the round), and a write on «الجولات» alone translates to them
   (asisMap daily/rounds:edit). 057 enfResWriter answered «writes the plan» for any of them.
   The rule (057 enfImgResWriter): a lens key hosted by the rounds page (one that a write on «الجولات» alone confers) is a rounds-side
   write of the lens ELEMENTS; the image of a record follows the pages that write that record (the same pages legacy asks:
   capForAct), so such a key counts only when the rounds page is one of them. The plan image therefore needs a key the rounds do not
   confer: a key of the plan page itself (site.edit · map.replace · … — what a plan sheet with a write translates to) or one of the
   two lens keys hosted by the plan alone (lens.gates.geometry.edit · lens.dens.threshold.configure — unchanged, as measured before).
   The rounds image is not changed for anyone.
   Every cell compares the stored image bytes before and after the attempt — not only the HTTP status. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { internals } from './internals.mjs';
import { TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
import { world, workerUnderTest, D, PNG, TAG, stored, addAccount, putKV, taskCommandBody, operationSaveBody } from './tasks_fx.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const WU = workerUnderTest();
const KP = 'bassam_perms_v1', KU = 'bassam_auth_users_v1', KD = 'bassam_depts_v1';
const KPLAN = 'bsdept:' + D + ':bassam_plan_v1', KR = 'bsdept:' + D + ':bassam_rounds_v1', KGR = 'bsdept:' + D + ':bassam_grants_v1';
const DM = ['0000000101', '70101'], ACC = ['0000000118', '70118'], ACC_E = 'tst_e_field';   /* the account under test: the fixture employee whose sheet/grant each case sets */
const DEPT = ['1099800001', '79801'], GM = ['1099800002', '79802'];
const isDay = (k) => /^\d+-\d+-\d+$/.test(k);
const put = (DB, k, v) => { DB.db.prepare('DELETE FROM kv WHERE k = ?').run(k); DB.db.prepare('INSERT INTO kv (k, seq, v) VALUES (?, 0, ?)').run(k, JSON.stringify(v)); DB.db.prepare('INSERT INTO revs (k, rev) VALUES (?, 1) ON CONFLICT(k) DO UPDATE SET rev = rev + 1').run(k); };
const read = (DB, k) => JSON.parse(DB.q('SELECT v FROM kv WHERE k = ? ORDER BY seq', k).map((r) => r.v).join('') || 'null');
const REG = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/permissions/registry/registry-v24.9.json'), 'utf8')).registry;
const DER = ['lens.zones.status.change', 'lens.gates.status.change', 'lens.marks.status.change'];
const VIEWS = (() => { const seen = {}, out = []; REG.forEach((e) => { if (e.status !== 'active' || e.grant !== 'assignable' || e.ownerKind === 'platform' || e.ownerKind === 'reference' || seen[e.owner]) return; if (e.type === 'access' || e.type === 'view') { seen[e.owner] = 1; out.push(e.key); } }); return out; })();
const isWrite = (e) => e.status === 'active' && e.grant === 'assignable' && e.type !== 'view' && e.type !== 'access' && e.type !== 'capability';
const boundTo = (e, rn) => ((e.guard || {}).resources || []).includes(rn);
/* from the registry itself, so a new key cannot slip past the table: */
const LENS_ALL = REG.filter((e) => isWrite(e) && e.ownerKind === 'lens' && boundTo(e, 'bassam_plan_v1'));                          /* every lens write key that lists the plan */
const viaRounds = (e) => (e.asisMap || []).some((s) => String(s).indexOf('daily/rounds:') === 0);
const LENS_W = LENS_ALL.filter(viaRounds).map((e) => e.key);                                                                      /* … that a write on the rounds confers */
const LENS_PLAN = LENS_ALL.filter((e) => !viaRounds(e)).map((e) => e.key);                                                         /* … hosted by the plan alone */
const ROUNDS_W = REG.filter((e) => isWrite(e) && e.owner === 'daily/rounds').map((e) => e.key);                                    /* every write key of the rounds page */
const PLAN_W = REG.filter((e) => isWrite(e) && e.ownerKind === 'page' && e.owner === 'plan' && boundTo(e, 'bassam_plan_v1')).map((e) => e.key);   /* every write key of the plan page */
const OTHER = 'data:image/png;base64,iVBORw0KGgo=';
let seq = 0;

const post = (W, ck, p, body) => W.C.api(p, { method: 'POST', cookie: ck, body: operationSaveBody(W.env, p, taskCommandBody(W.env, p, body)) });
const img = (W, ck, id, method, body) => W.C.api('/api/img/' + id, Object.assign({ method, cookie: ck }, method === 'PUT' ? { body: body || PNG, headers: { 'Content-Type': 'text/plain' } } : {}));
const bytes = async (W, id) => {
  const row = W.env.DB.q('SELECT v FROM imgs WHERE k = ? ORDER BY seq', id).map((r) => r.v).join(''), o = await W.env.IMG_R2.get('img/' + id);
  return row === '~r2~' ? (o ? await o.text() : '~r2~ without an object') : row;
};
const own = (W, id) => W.env.DB.q('SELECT st, k FROM imgown WHERE img = ?', id)[0] || null;

/* a world where the unit manager has uploaded two site maps and bound one to the plan and one to today's round — by saving them */
async function scene(mode, setup) {
  const W = await world({ worker: WU.file, mode }), DB = W.env.DB, x = mode.slice(0, 1) + (++seq).toString(36);
  const P = read(DB, KP); P.emps = P.emps || {}; P.emps[D] = P.emps[D] || {};
  setup({ sheet: (s) => { if (s === null) delete P.emps[D][ACC_E]; else P.emps[D][ACC_E] = s; }, grant: (plus) => put(DB, KGR, { v: 1, emp: { [ACC_E]: { plus, minus: [], at: 1, by: 'TEST_ONLY' } } }) });
  put(DB, KP, P);
  /* the unit account and the general manager of the unit's group (no sheet) */
  const gid = (stored(W.env, KD) || []).find((d) => d.id === D).gid; assert.ok(gid, 'the fixture unit hangs under a group');
  addAccount(W.env, { uid: 'TEST_ONLY_v7e_dept', un: DEPT[0], pw: DEPT[1], role: 'dept' });
  addAccount(W.env, { uid: 'TEST_ONLY_v7e_gm', un: GM[0], pw: GM[1], role: 'gm', ekey: 'gm:' + gid });
  const U = stored(W.env, KU), g = U.find((u) => u.id === 'TEST_ONLY_v7e_gm'); delete g.deptId; g.gid = gid; putKV(W.env, KU, U);
  const dm = await W.login(...DM), ids = { plan: 'img_v7e' + x + '_planmap', rounds: 'img_v7e' + x + '_roundmap' };
  for (const [res, k, edit] of [['plan', KPLAN, (v) => { v.floors[0].iid = ids.plan; }], ['rounds', KR, (v) => { const day = Object.keys(v).filter(isDay).sort().pop(); v[day].d[0].iid = ids.rounds; }]]) {
    assert.equal((await img(W, dm.ck, ids[res], 'PUT')).status, 200, 'the manager uploads the ' + res + ' map');
    const r = await W.C.api('/api/operations/read?keys=' + encodeURIComponent(k), { cookie: dm.ck }), v = r.j.resources[k];
    edit(v);
    const sv = await post(W, dm.ck, '/api/save', { set: { [k]: JSON.stringify(v) }, del: [], base: { [k]: r.j.base[k] }, why: { [k]: TAG + ' site map' } });
    assert.ok(sv.status === 200 && !(sv.j.denied || {})[k], 'the manager saves the ' + res + ': ' + JSON.stringify(sv.j).slice(0, 300));
    assert.deepEqual([own(W, ids[res]).st, own(W, ids[res]).k], ['bound', k], 'the image is bound to the ' + res);
    assert.equal(await bytes(W, ids[res]), PNG);
  }
  const who = { acc: () => W.login(...ACC), dm: async () => dm, dept: () => W.login(...DEPT), gm: () => W.login(...GM), su: () => W.C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN) };
  return { W, ids, x, who };
}
/* replace then delete each bound map; each answer is checked against what is stored. One letter per cell, in the order
   put@plan · del@plan · put@rounds · del@rounds: Y allowed · b refused «bound» (not a writer of the record the image belongs to) */
async function cells(S, ck) {
  const { W, ids } = S; let out = '';
  for (const res of ['plan', 'rounds']) {
    const before = await bytes(W, ids[res]);
    const p = await img(W, ck, ids[res], 'PUT', OTHER), afterPut = await bytes(W, ids[res]);
    out += p.status === 200 ? 'Y' : p.status === 403 && p.j && p.j.why === 'bound' ? 'b' : '?(' + p.status + ':' + ((p.j && p.j.why) || '') + ')';
    assert.equal(afterPut !== before, p.status === 200, 'put@' + res + ': the answer matches the stored bytes');
    if (p.status === 200) assert.equal(afterPut, OTHER, 'put@' + res + ' accepted: the new bytes are stored'); else assert.equal(afterPut, PNG, 'put@' + res + ' refused: the stored map is byte-identical');
    const d = await img(W, ck, ids[res], 'DELETE'), afterDel = await bytes(W, ids[res]);
    out += d.status === 200 ? 'Y' : d.status === 403 && d.j && d.j.why === 'bound' ? 'b' : '?(' + d.status + ':' + ((d.j && d.j.why) || '') + ')';
    assert.equal(afterDel === '', d.status === 200, 'del@' + res + ': the answer matches the store');
    if (d.status !== 200) { assert.equal(afterDel, afterPut, 'del@' + res + ' refused: the stored map is untouched'); assert.equal(own(W, ids[res]).st, 'bound'); }
  }
  return out;
}
const run = async (mode, setup, who) => { const S = await scene(mode, setup); const o = await cells(S, (await S.who[who || 'acc']()).ck); if (process.env.V7E_PRINT) console.log(mode + ' ' + o); return o; };
const sheet = (s) => (x) => x.sheet(s);
const grant = (keys) => (x) => { x.sheet(null); x.grant(keys); };

/* [actor, how it is set up, who signs in, legacy cells, enforce cells] — put@plan · del@plan · put@rounds · del@rounds.
   An explicit grant does not exist in legacy (no sheet ⇒ no write at all), so those rows are enforce-only. */
const NOTHING = 'bbbb', ROUNDS_ONLY = 'bbYY', PLAN_ONLY = 'YYbb', BOTH = 'YYYY';
const ACTORS = [
  /* the rounds side — the decision: the plan map is refused, the round map stays */
  ['a stored supervisor sheet (write on «الجولات»)', sheet({ 'daily/field': ['view'], 'daily/rounds': ['view', 'edit'] }), 'acc', ROUNDS_ONLY, ROUNDS_ONLY],
  ['a stored sheet with every act on «الجولات» and a view of the plan', sheet({ 'daily/rounds': ['view', 'add', 'edit', 'del', 'approve'], plan: ['view'] }), 'acc', ROUNDS_ONLY, ROUNDS_ONLY],
  ['a page-level sheet of «المتابعة اليومية» with a write', sheet({ daily: ['view', 'edit'] }), 'acc', ROUNDS_ONLY, ROUNDS_ONLY],
  ['explicit grant: round.edit', grant(['field.view', 'round.view', 'round.edit'].concat(DER)), 'acc', null, ROUNDS_ONLY],
  ['explicit grant: every write key of the rounds page', grant(['round.view', 'plan.view'].concat(ROUNDS_W)), 'acc', null, ROUNDS_ONLY],
  ['explicit grant: every view key + one lens data edit (lens.zones.data.edit)', grant(VIEWS.concat(DER, ['lens.zones.data.edit'])), 'acc', null, ROUNDS_ONLY],
  ['explicit grant: every lens write key at once', grant(VIEWS.concat(LENS_W)), 'acc', null, ROUNDS_ONLY],
  /* a real write on the plan — must stay allowed */
  ['a stored sheet with a write on the plan', sheet({ plan: ['view', 'edit'] }), 'acc', PLAN_ONLY, null /* measured below: the symmetric case */],
  ['a stored sheet with a write on the plan and on «الجولات»', sheet({ plan: ['view', 'edit'], 'daily/rounds': ['view', 'edit'] }), 'acc', BOTH, BOTH],
  ['explicit grant: site.edit', grant(['plan.view', 'site.edit']), 'acc', null, PLAN_ONLY],
  ['explicit grant: map.replace', grant(['plan.view', 'map.replace']), 'acc', null, PLAN_ONLY],
  ['the unit manager', () => {}, 'dm', BOTH, BOTH],
  ['the unit account', () => {}, 'dept', BOTH, BOTH],
  ['the general manager of the group', () => {}, 'gm', BOTH, BOTH],
  ['the platform admin', () => {}, 'su', BOTH, BOTH],
  /* no write at all */
  ['a bare observer («رصد الميدان: عرض»)', sheet({ 'daily/field': ['view'] }), 'acc', NOTHING, NOTHING],
  ['a view-only sheet of the plan and the rounds', sheet({ plan: ['view'], 'daily/rounds': ['view'], 'daily/field': ['view'] }), 'acc', NOTHING, NOTHING],
  ['explicit grant: every view key', grant(VIEWS.concat(DER)), 'acc', null, NOTHING],
];
for (const [label, setup, who, legacy, enforce] of ACTORS) for (const [mode, want] of [['legacy', legacy], ['enforce', enforce]]) {
  if (want) test('[' + mode + '] ' + label + ': plan map and round map — put · del', { timeout: 300000 }, async () => {
    assert.equal(await run(mode, setup, who), want);
  });
}
/* every rounds-hosted lens write key that lists the plan among its resources, one at a time: none of them is a write of the plan's image */
test('[enforce] each rounds-hosted lens write key alone (' + LENS_W.length + ' keys): never the plan map', { timeout: 600000 }, async () => {
  assert.ok(LENS_W.length >= 18 && LENS_W.includes('lens.zones.data.edit') && LENS_W.includes('lens.paths.edit') && LENS_W.includes('lens.gates.edit') && LENS_W.includes('lens.marks.edit') && LENS_W.includes('lens.dist.assign.edit'), 'the list is read from the registry');
  const got = {}, want = {};
  for (const k of LENS_W) { got[k] = (await run('enforce', grant(VIEWS.concat([k])))).slice(0, 2); want[k] = 'bb'; }
  assert.deepEqual(got, want);
});
/* the two lens keys hosted by the plan alone (asisMap plan:edit, resources: the plan only) are a plan-side write: exactly as measured on 5add483 */
test('[enforce] the lens keys hosted by the plan alone are unchanged: the plan map, not the round map', { timeout: 300000 }, async () => {
  assert.deepEqual(LENS_PLAN.slice().sort(), ['lens.dens.threshold.configure', 'lens.gates.geometry.edit']);
  for (const k of LENS_PLAN) assert.equal(await run('enforce', grant(VIEWS.concat([k]))), PLAN_ONLY, k);
});
test('[enforce] each write key of the plan page alone (' + PLAN_W.length + ' keys) still replaces and deletes the plan map', { timeout: 600000 }, async () => {
  assert.ok(PLAN_W.includes('site.edit') && PLAN_W.includes('map.replace'), 'the list is read from the registry');
  const got = {}, want = {};
  for (const k of PLAN_W) { got[k] = (await run('enforce', grant(['plan.view', k]))).slice(0, 2); want[k] = 'YY'; }
  assert.deepEqual(got, want);
});

/* THE SYMMETRIC CASE — measured, reported, deliberately NOT changed by V7-E (the owner decision is about the plan map, and «do not
   change who writes the rounds images»): a sheet with a write on the plan only translates to the lens keys as well, they list the
   rounds record, so in enforce it replaces/deletes the ROUND map; legacy refuses it. Pinned so that changing it is a decision. */
test('[symmetric, not changed] a plan-only sheet and the round map: legacy refuses, enforce allows (as measured on 5add483)', { timeout: 300000 }, async () => {
  assert.equal(await run('legacy', sheet({ plan: ['view', 'edit'] })), PLAN_ONLY, 'legacy');
  assert.equal(await run('enforce', sheet({ plan: ['view', 'edit'] })), BOTH, 'enforce — the open finding');
});

/* the RECORD path was never loose: the same accounts cannot put another image on the plan's site by saving the plan */
for (const [label, setup] of [['a stored supervisor sheet', sheet({ 'daily/field': ['view'], 'daily/rounds': ['view', 'edit'] })], ['explicit grant: round.edit', grant(['field.view', 'round.view', 'plan.view', 'round.edit'].concat(DER))], ['explicit grant: lens.zones.data.edit', grant(VIEWS.concat(DER, ['lens.zones.data.edit']))]]) {
  test('[enforce] ' + label + ': saving the plan with another site map is refused (the record path, unchanged)', { timeout: 300000 }, async () => {
    const S = await scene('enforce', setup), { W, ids, x } = S, ck = (await S.who.acc()).ck;
    const mine = 'img_v7e' + x + '_mine';
    await img(W, ck, mine, 'PUT');   /* accepted for a writer of the unit (an unbound upload of his own) */
    const before = JSON.stringify(stored(W.env, KPLAN)), rev = W.env.DB.q('SELECT rev FROM revs WHERE k = ?', KPLAN)[0].rev, forged = JSON.parse(before); forged.floors[0].iid = mine;
    const sv = await post(W, ck, '/api/save', { set: { [KPLAN]: JSON.stringify(forged) }, del: [], base: { [KPLAN]: rev }, why: { [KPLAN]: TAG + ' forged' } });
    assert.ok(sv.status !== 200 || (sv.j.denied || {})[KPLAN], 'refused: ' + JSON.stringify(sv.j).slice(0, 200));
    assert.equal(JSON.stringify(stored(W.env, KPLAN)), before, 'the stored plan is unchanged');
    assert.deepEqual([own(W, ids.plan).st, own(W, ids.plan).k], ['bound', KPLAN]);
  });
}

/* the rule itself, called directly */
test('enforce: the image rule — a rounds-hosted lens key counts only for a record the rounds page writes; unreadable grants fail closed', async () => {
  const { enfImgResWriter, enfImgWriteOk } = await internals(['enfImgResWriter', 'enfImgWriteOk']);
  const actor = (o = {}) => Object.assign({ u: { role: 'staff', ekey: 'TEST_ONLY_e', deptId: 'TEST_ONLY_d' }, perms: { caps: {}, emps: {} }, depts: [{ id: 'TEST_ONLY_d', name: 'TEST_ONLY' }], enf: { mode: 'enforce' } }, o);
  const withGrant = (plus) => actor({ __grants: { TEST_ONLY_d: { v: 1, emp: { TEST_ONLY_e: { plus, minus: [] } } } } });
  const cellsOf = (A) => [enfImgResWriter(A, 'TEST_ONLY_d', 'bassam_plan_v1'), enfImgResWriter(A, 'TEST_ONLY_d', 'bassam_rounds_v1')];
  assert.deepEqual(cellsOf(withGrant(['lens.zones.data.edit'])), [false, true], 'a lens key: the rounds, not the plan');
  assert.deepEqual(cellsOf(withGrant(['round.edit'])), [false, true], 'a key of the rounds page');
  assert.deepEqual(cellsOf(withGrant(['site.edit'])), [true, false], 'a key of the plan page');
  assert.deepEqual(cellsOf(withGrant(['lens.gates.geometry.edit'])), [true, false], 'a lens key hosted by the plan alone');
  assert.deepEqual(cellsOf(withGrant([])), [false, false], 'nothing');
  const broken = actor(); Object.defineProperty(broken, '__grants', { get() { throw new Error('TEST_ONLY read error'); } });
  for (const A of [broken, actor()]) {
    assert.deepEqual(cellsOf(A), [false, false], 'unreadable or unattached grants: no write of either record');
    for (const rn of ['bassam_plan_v1', 'bassam_rounds_v1']) assert.equal(enfImgWriteOk(A, 'bsdept:TEST_ONLY_d:' + rn), false);
  }
});

/* ═══ ADDED AFTER THE INDEPENDENT REVIEW OF 1cf4838 (accepted with changes) — pins only, no behaviour change ═══
   The rule is wider than «the plan map»: it applies to every record that has rounds-hosted lens keys but is not written by the
   rounds page — the plan AND the three option records (bassam_zone_opts_v1 · bassam_gate_opts_v1 · bassam_mark_kinds_v1, cap 'plan'),
   and through 054 imgForeignIn to a ROUNDS RECORD save that newly references a plan-owned image. */
const KOPT = (rn) => 'bsdept:' + D + ':' + rn;
const OPTS = ['bassam_zone_opts_v1', 'bassam_gate_opts_v1', 'bassam_mark_kinds_v1'];
const SUP = sheet({ 'daily/field': ['view'], 'daily/rounds': ['view', 'edit'] });
const G_ROUND = grant(['field.view', 'round.view', 'plan.view', 'round.edit'].concat(DER));
const G_LENS = grant(VIEWS.concat(DER, ['lens.zones.data.edit']));
/* the manager uploads an image and it is bound to an option record. The binding is written straight into the ownership tables
   (imgown · imgref), as the reviewer's probe did: the option records carry no image field of their own in the fixture */
async function bindOpt(S, rn) {
  const { W, x } = S, id = 'img_v7e' + x + '_' + rn.replace(/[^a-z]/g, '').slice(6, 14), dm = await S.who.dm();
  assert.equal((await img(W, dm.ck, id, 'PUT')).status, 200, 'the manager uploads an image for ' + rn);
  W.env.DB.db.prepare("UPDATE imgown SET st='bound', k=?, uid='' WHERE img=?").run(KOPT(rn), id);
  W.env.DB.db.prepare('INSERT OR IGNORE INTO imgref (img,k) VALUES (?,?)').run(id, KOPT(rn));
  assert.deepEqual([own(W, id).st, own(W, id).k], ['bound', KOPT(rn)]); assert.equal(await bytes(W, id), PNG);
  return id;
}
/* PUT then DELETE one image; two letters (Y allowed · b «bound» · u «inuse»), every answer checked against the stored bytes */
async function attempt(W, ck, id) {
  const letter = (r) => r.status === 200 ? 'Y' : r.status === 403 && r.j && r.j.why === 'bound' ? 'b' : r.status === 403 && r.j && r.j.why === 'inuse' ? 'u' : '?(' + r.status + ':' + ((r.j && r.j.why) || '') + ')';
  const before = await bytes(W, id), p = await img(W, ck, id, 'PUT', OTHER), afterPut = await bytes(W, id);
  assert.equal(afterPut, p.status === 200 ? OTHER : before, 'put: the answer matches the stored bytes');
  const d = await img(W, ck, id, 'DELETE'), afterDel = await bytes(W, id);
  assert.equal(afterDel, d.status === 200 ? '' : afterPut, 'del: the answer matches the store');
  return letter(p) + letter(d);
}
const optCells = async (mode, setup, who) => { const S = await scene(mode, setup), ck = (await S.who[who || 'acc']()).ck, o = {}; for (const rn of OPTS) o[rn.slice(7, -3)] = await attempt(S.W, ck, await bindOpt(S, rn)); if (process.env.V7E_PRINT) console.log(mode + ' opts ' + JSON.stringify(o)); return o; };
const O = (zone, gate, mark) => ({ zone_opts: zone, gate_opts: gate, mark_kinds: mark });
/* a save of one record by the signed-in account; returns 'OK' or the denial reason */
async function saveKey(W, ck, k, edit) {
  const r = await W.C.api('/api/operations/read?keys=' + encodeURIComponent(k), { cookie: ck });
  let v = r.j && r.j.resources ? r.j.resources[k] : undefined, base = r.j && r.j.base ? r.j.base[k] : undefined;
  if (v === undefined) { v = stored(W.env, k); base = (W.env.DB.q('SELECT rev FROM revs WHERE k = ?', k)[0] || {}).rev; }
  v = JSON.parse(JSON.stringify(v)); edit(v);
  const sv = await post(W, ck, '/api/save', { set: { [k]: JSON.stringify(v) }, del: [], base: { [k]: base }, why: { [k]: TAG + ' v7e' } });
  const den = (sv.j && sv.j.denied || {})[k];
  return sv.status === 200 && !den ? 'OK' : String((den && den.why) || (sv.j && (sv.j.why || sv.j.err)) || sv.status);
}
const today = (v) => Object.keys(v).filter(isDay).sort().pop();

/* F1 — images bound to the option records. On base 5add483 ENFORCE ALLOWED the rounds-only writer here (measured by the reviewer:
   sheet / round.edit / lens.zones.data.edit ⇒ Y/Y on all three records); legacy always refused. Now refused as in legacy. */
for (const [label, setup, modes] of [['a stored supervisor sheet', SUP, ['legacy', 'enforce']], ['explicit grant: round.edit', G_ROUND, ['legacy', 'enforce']], ['explicit grant: lens.zones.data.edit', G_LENS, ['legacy', 'enforce']]]) for (const mode of modes) {
  test('[F1 · ' + mode + '] ' + label + ': an image of the zone/gate/mark option records is refused — put · del', { timeout: 300000 }, async () => {
    assert.deepEqual(await optCells(mode, setup), O('bb', 'bb', 'bb'));
  });
}
test('[F1 · enforce] the holder of the matching reference key still writes the option image — and only that one', { timeout: 300000 }, async () => {
  const REFK = { zone: 'ref.zone.type.edit', gate: 'ref.gate.type.edit', mark: 'ref.mark.kind.edit' };
  for (const k of Object.values(REFK)) assert.ok(REG.some((e) => e.key === k && isWrite(e)), k + ' is a write key of the registry');
  assert.deepEqual(await optCells('enforce', grant(VIEWS.concat([REFK.zone]))), O('YY', 'bb', 'bb'));
  assert.deepEqual(await optCells('enforce', grant(VIEWS.concat([REFK.gate]))), O('bb', 'YY', 'bb'));
  assert.deepEqual(await optCells('enforce', grant(VIEWS.concat([REFK.mark]))), O('bb', 'bb', 'YY'));
});
for (const mode of ['legacy', 'enforce']) test('[F1 · ' + mode + '] the unit manager and a plan sheet with a write still write the option images', { timeout: 300000 }, async () => {
  assert.deepEqual(await optCells(mode, () => {}, 'dm'), O('YY', 'YY', 'YY'));
  assert.deepEqual(await optCells(mode, sheet({ plan: ['view', 'edit'] })), O('YY', 'YY', 'YY'));
});

/* F2 — through 054 imgForeignIn: a rounds-only writer saving HIS OWN record (the round) with a new reference to an image owned by
   the plan is refused «imgown», in enforce as in legacy (on base 5add483 enforce accepted it). His plain round save still passes. */
for (const [label, setup, modes] of [['a stored supervisor sheet', SUP, ['legacy', 'enforce']], ['explicit grant: round.edit', G_ROUND, ['enforce']]]) for (const mode of modes) {
  test('[F2 · ' + mode + '] ' + label + ': a round save that newly references the plan-owned image is denied imgown; the manager\'s is accepted', { timeout: 300000 }, async () => {
    const S = await scene(mode, setup), { W, ids } = S, ck = (await S.who.acc()).ck, before = JSON.stringify(stored(W.env, KR));
    assert.equal(await saveKey(W, ck, KR, (v) => { v[today(v)].d[0].iid = ids.plan; }), 'imgown');
    assert.equal(JSON.stringify(stored(W.env, KR)), before, 'the stored round is unchanged');
    assert.deepEqual([own(W, ids.plan).st, own(W, ids.plan).k, await bytes(W, ids.plan)], ['bound', KPLAN, PNG]);
    assert.equal(await saveKey(W, ck, KR, (v) => { v[today(v)].d[0].name = (v[today(v)].d[0].name || '') + ' x'; }), 'OK', 'his round save without the foreign image passes');
    assert.equal(await saveKey(W, (await S.who.dm()).ck, KR, (v) => { v[today(v)].d[0].iid = ids.plan; }), 'OK', 'the unit manager');
    assert.equal(stored(W.env, KR)[today(stored(W.env, KR))].d[0].iid, ids.plan);
  });
}

/* SHARED ID · A — bound first to the plan, then also referenced by today's round: the plan owns it; the supervisor cannot replace
   or delete it, can take the reference out of his round, and the image stays the plan's with the same bytes. */
for (const mode of ['legacy', 'enforce']) test('[shared id A · ' + mode + '] plan-owned image also referenced by the round: the supervisor is refused «bound», may drop his reference', { timeout: 300000 }, async () => {
  const S = await scene(mode, SUP), { W, ids } = S, ck = (await S.who.acc()).ck;
  assert.equal(await saveKey(W, (await S.who.dm()).ck, KR, (v) => { v[today(v)].d[0].iid = ids.plan; }), 'OK');
  assert.deepEqual(W.env.DB.q('SELECT k FROM imgref WHERE img = ? ORDER BY k', ids.plan).map((r) => r.k), [KPLAN, KR]);
  assert.equal(await attempt(W, ck, ids.plan), 'bb'); assert.equal(await bytes(W, ids.plan), PNG);
  assert.equal(await saveKey(W, ck, KR, (v) => { v[today(v)].d[0].iid = null; }), 'OK', 'he removes the reference from his round');
  assert.deepEqual([own(W, ids.plan).st, own(W, ids.plan).k, await bytes(W, ids.plan)], ['bound', KPLAN, PNG]);
  assert.equal(stored(W.env, KPLAN).floors[0].iid, ids.plan);
});
/* SHARED ID · B — KNOWN FINDING, pre-existing, BOTH modes, not fixed here: ownership stays with the FIRST record that bound the
   image. Bound first to the round and later referenced by the plan, the supervisor's PUT succeeds and replaces the bytes the plan
   shows; only DELETE is stopped («inuse»). Pinned so that changing it is a decision. */
for (const mode of ['legacy', 'enforce']) test('[shared id B · KNOWN FINDING · ' + mode + '] round-owned image later referenced by the plan: the supervisor\'s PUT replaces what the plan shows; DELETE is «inuse»', { timeout: 300000 }, async () => {
  const S = await scene(mode, SUP), { W, ids } = S, ck = (await S.who.acc()).ck;
  assert.equal(await saveKey(W, (await S.who.dm()).ck, KPLAN, (v) => { v.floors[0].iid = ids.rounds; }), 'OK');
  assert.deepEqual([own(W, ids.rounds).st, own(W, ids.rounds).k], ['bound', KR], 'ownership did not move to the plan');
  assert.equal(await attempt(W, ck, ids.rounds), 'Yu');
  assert.equal(stored(W.env, KPLAN).floors[0].iid, ids.rounds); assert.equal(await bytes(W, ids.rounds), OTHER, 'the plan now shows the replaced bytes');
});

/* OPEN FINDING (awaiting an owner decision, not fixed): a plan sheet holding ONLY «approve» — legacy refuses every image write
   (approve is not a write of the record), enforce allows the plan image and the option images (plan.approve / site.approve list
   those records). Same on base 5add483. The other open finding — the symmetric case — is pinned above. */
test('[OPEN FINDING] a plan sheet with only «approve»: legacy refuses the plan/option images, enforce allows them', { timeout: 300000 }, async () => {
  const APPR = sheet({ plan: ['view', 'approve'] });
  assert.equal(await run('legacy', APPR), NOTHING, 'legacy: plan map and round map');
  assert.deepEqual(await optCells('legacy', APPR), O('bb', 'bb', 'bb'), 'legacy: option images');
  assert.equal(await run('enforce', APPR), PLAN_ONLY, 'enforce — the open finding: the plan map');
  assert.deepEqual(await optCells('enforce', APPR), O('YY', 'YY', 'YY'), 'enforce — the open finding: option images');
});
