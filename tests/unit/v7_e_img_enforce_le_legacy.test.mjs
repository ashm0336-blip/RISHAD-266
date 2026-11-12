/* RISHAD V7-E — the general rule for images (owner): «في الصور، enforce لا يسمح بما يرفضه legacy.»
   An exhaustive DIFFERENTIAL over the real worker: the same actor, the same record, the same operation, in legacy and in enforce;
   every cell where enforce ALLOWS and legacy REFUSES is a violation. Nothing here is a hand-written expectation of a cell: the
   legacy column is measured, and the enforce column is compared with it.

   RECORDS — every resource the server knows (023 RES_REG, read from the worker itself, so a new resource is covered the day it is
   registered): the 41 unit records (plan · rounds · the three option records · tasks · seized · the daily report/dayshift ·
   employees · the technical flags/profile · …), the platform records, the device keys, plus a record of ANOTHER unit and an
   unregistered name. An image is bound to each of them in the ownership tables (imgown · imgref) exactly as 054 imgSync leaves it.
   OPERATIONS on a bound image — PUT (replace) · chunked PUT (?p=0&n=1) · DELETE; on no image yet — a new unbound upload
   (img_ · img_tsk · szp_, plain and chunked); on the other ownership states — another account's pending upload (claim) ·
   an unresolved old image (amb) · an orphan in its grace period. Every answer is checked against the STORED bytes.
   The bind through a record save (054 imgForeignIn) is measured in the fixture world below, through POST /api/save.
   ACTORS — sheets (both modes): every page and every leaf of the product (017 PG_KEYS · pgLeaves) × every single act
   (view · add · edit · del · approve · export), the standard sheets (none · every view · supervisor · bare observer · a full sheet),
   the unit manager, the unit account, the general manager, the platform admin — in a unit whose ceiling holds every page; and the
   managers and the standard sheets again in a unit with NO ceiling record.
   Grants (enforce only — an explicit grant does not exist in legacy): EVERY assignable key of registry v24.9, one at a time, on top
   of every view key. Its legacy counterpart is the union of the legacy outcomes of the sheets its registry atoms name (asisMap
   «leaf:act» → the sheet {leaf: [view, act]}) and of the every-view sheet; a key with no atom has no legacy counterpart at all
   (legacy refuses everything). So for a grant: enforce allowed ⇒ some sheet that the registry maps to that key is allowed in legacy.

   OPEN lists the cells deliberately left open (enforce allows, legacy refuses) with the reason; anything else fails the test.

   Measured on 2c28c95 (before the V7-E rules of 057 enfImgKeyOn / enfAnyWriterDept(img)) this file failed with: PUT/DELETE sweep —
   84 cell kinds, 316 actor-cells (a plan sheet → the round's image · every «approve» sheet and approval/lock/retro key → the images
   of its page's records · a monthly-table write / ref.work_type.* → bassam_options_v1 · admin/import:del / import.replace → the
   daily report and the award · backup.restore → bassam_last_export_v1, the «rule» records and a new upload · the general manager);
   bind sweep — 26 cell kinds, 117 actor-cells of the same families. All closed except OPEN.
   Not covered here: reading and listing images (GET /api/img · /api/imgs — not writes); the task-proof bind through
   /api/me/tasks/act (v7_c_enf_writer_matrix · v7_d_observer_img) and the seized-photo bind through the seized operations route
   (same 054 imgForeignIn); restricted unit ceilings other than «every page» and «no record» (v7_c_enf_writer_matrix: BASIC).
   Runtime: about five and a half minutes (≈165 000 image requests, ≈1 600 record saves). */
import './clock.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeTestEnv, client, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
import { internals } from './internals.mjs';
import { world, workerUnderTest, D as FXD, PNG as FXPNG, TAG, stored, taskCommandBody, operationSaveBody } from './tasks_fx.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { PG_KEYS, RES_REG, pgLeaves, ACTS_ALL, WRITE_ACTS } = await internals(['PG_KEYS', 'RES_REG', 'pgLeaves', 'ACTS_ALL', 'WRITE_ACTS']);
const REGJ = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/permissions/registry/registry-v24.9.json'), 'utf8')), REG = REGJ.registry;
const KG = 'bassam_gdepts_v1', KD = 'bassam_depts_v1', KU = 'bassam_auth_users_v1', KP = 'bassam_perms_v1';
const put = (DB, k, v) => { DB.db.prepare('DELETE FROM kv WHERE k = ?').run(k); DB.db.prepare('INSERT INTO kv (k, seq, v) VALUES (?, 0, ?)').run(k, JSON.stringify(v)); DB.db.prepare('INSERT INTO revs (k, rev) VALUES (?, 1) ON CONFLICT(k) DO UPDATE SET rev = rev + 1').run(k); };
const read = (DB, k) => JSON.parse(DB.q('SELECT v FROM kv WHERE k = ? ORDER BY seq', k).map((r) => r.v).join('') || 'null');
const PNG0 = 'data:image/png;base64,iVBORw0KGgo=', PNG1 = 'data:image/png;base64,iVBORw0KGgoA', PNG2 = 'data:image/png;base64,iVBORw0KGgoB';

/* ── the actors, derived ── */
const LEAVES = []; for (const p of PG_KEYS) { LEAVES.push(p); for (const l of pgLeaves(p)) if (LEAVES.indexOf(l) === -1) LEAVES.push(l); }
const ACTS = ACTS_ALL.slice();
const LEAF_RE = /^([A-Za-z]+(?:\/[A-Za-z]+)?):(view|add|edit|del|approve|export)$/;
const atomsOf = (e) => (e.asisMap || []).map((s) => LEAF_RE.exec(String(s))).filter(Boolean).map((m) => [m[1], m[2]]);
const ASSIGN = REG.filter((e) => e.status === 'active' && e.grant === 'assignable');
const isView = (e) => e.type === 'view' || e.type === 'access';
const VIEWS = ASSIGN.filter(isView).map((e) => e.key);
const DER = ['lens.zones.status.change', 'lens.gates.status.change', 'lens.marks.status.change'];
const sheetId = (leaf, act) => 's ' + leaf + ':' + act;
const UNIT = 'TEST_ONLY_A', OTHER_UNIT = 'TEST_ONLY_B', OPEN_UNIT = 'TEST_ONLY_O', ACC_E = 'TEST_ONLY_e_acc', ACCO_E = 'TEST_ONLY_e_accO';
const ALLVIEW = Object.fromEntries(LEAVES.map((l) => [l, ['view']])), FULL = Object.fromEntries(LEAVES.map((l) => [l, ACTS.slice()]));
/* [id, account, stored sheet or null, explicit grant or null, modes] */
const ACTORS = [];
for (const leaf of LEAVES) for (const act of ACTS) ACTORS.push([sheetId(leaf, act), 'acc', { [leaf]: act === 'view' ? ['view'] : ['view', act] }, null, 'LE']);
ACTORS.push(['no sheet', 'acc', null, null, 'LE'], ['every view', 'acc', ALLVIEW, null, 'LE'], ['full sheet', 'acc', FULL, null, 'LE'],
  ['supervisor', 'acc', { 'daily/field': ['view'], 'daily/rounds': ['view', 'edit'] }, null, 'LE'], ['bare observer', 'acc', { 'daily/field': ['view'] }, null, 'LE'],
  ['plan + rounds writer', 'acc', { plan: ['view', 'edit'], 'daily/rounds': ['view', 'edit'] }, null, 'LE'],
  ['unit manager', 'mgr', null, null, 'LE'], ['unit account', 'dept', null, null, 'LE'], ['general manager', 'gm', null, null, 'LE'], ['platform admin', 'su', null, null, 'LE'],
  /* a unit with NO ceiling record (perms.caps has no entry for it) — the legacy gap of v7_p3_0_open_cap_matrix lives there */
  ['open unit · unit manager', 'mgrO', null, null, 'LE'], ['open unit · unit account', 'deptO', null, null, 'LE'], ['open unit · no sheet', 'accO', null, null, 'LE'], ['open unit · every view', 'accO', ALLVIEW, null, 'LE'],
  ['open unit · full sheet', 'accO', FULL, null, 'LE'], ['open unit · supervisor', 'accO', { 'daily/field': ['view'], 'daily/rounds': ['view', 'edit'] }, null, 'LE'], ['open unit · plan writer', 'accO', { plan: ['view', 'edit'] }, null, 'LE'], ['open unit · plan approver', 'accO', { plan: ['view', 'approve'] }, null, 'LE']);
for (const e of ASSIGN) ACTORS.push(['g ' + e.key, 'acc', null, isView(e) ? [e.key] : VIEWS.concat([e.key]), 'E']);
ACTORS.push(['g every view + derived', 'acc', null, VIEWS.concat(DER), 'E'], ['g observer (field.view + derived)', 'acc', null, ['field.view'].concat(DER), 'E']);
const GRANT_REF = Object.fromEntries(ASSIGN.map((e) => ['g ' + e.key, atomsOf(e).map(([l, a]) => sheetId(l, a)).concat(['every view'])]));
GRANT_REF['g every view + derived'] = ['every view', 'bare observer']; GRANT_REF['g observer (field.view + derived)'] = ['bare observer'];

/* ── the records ── */
const RECORDS = Object.keys(RES_REG).map((name) => ({ id: name, k: RES_REG[name].scope === 'dept' ? 'bsdept:' + UNIT + ':' + name : name }))
  .concat([{ id: 'other unit: bassam_plan_v1', k: 'bsdept:' + OTHER_UNIT + ':bassam_plan_v1' }, { id: 'unregistered name', k: 'bsdept:' + UNIT + ':bassam_testonly_unknown_v1' }])
  .concat(Object.keys(RES_REG).filter((n) => RES_REG[n].scope === 'dept').map((name) => ({ id: 'open unit: ' + name, k: 'bsdept:' + OPEN_UNIT + ':' + name, open: true })));
/* which images an account is measured on: its own unit's (and everything for the general manager and the platform admin) */
const SEES = { acc: (r) => !r.open, mgr: (r) => !r.open, dept: (r) => !r.open, accO: (r) => !!r.open, mgrO: (r) => !!r.open, deptO: (r) => !!r.open, gm: () => true, su: () => true };
const WHY = { bound: 'b', none: 'n', claim: 'c', amb: 'a', orphan: 'o', inuse: 'u' };

/* the worker logs one line per request; a sweep makes ~10^5 of them */
const quiet = async (fn) => { const L = console.log, W = console.warn, f = (o) => (...a) => { if (!(typeof a[0] === 'string' && a[0].indexOf('{"v":') === 0)) o(...a); }; console.log = f(L); console.warn = f(W); try { return await fn(); } finally { console.log = L; console.warn = W; } };
let inst = 0;
async function sweep(mode, t) {
  const env = makeTestEnv(mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce' } : {}), DB = env.DB, tag = mode.slice(0, 1) + (++inst);
  if (mode === 'enforce') DB.exec("INSERT INTO meta(k,v) VALUES('authz_mode','enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  put(DB, KG, [{ id: 'TEST_ONLY_GA', name: 'GA', kind: 'إدارة عامة' }, { id: 'TEST_ONLY_GB', name: 'GB', kind: 'إدارة عامة' }]);
  put(DB, KD, [{ id: UNIT, name: 'A', gid: 'TEST_ONLY_GA' }, { id: OTHER_UNIT, name: 'B', gid: 'TEST_ONLY_GB' }, { id: OPEN_UNIT, name: 'O', gid: 'TEST_ONLY_GA' }]);
  const P = read(DB, KP) || {}; P.caps = { [UNIT]: PG_KEYS.slice(), [OTHER_UNIT]: PG_KEYS.slice() }; P.emps = { [UNIT]: {}, [OPEN_UNIT]: {} };
  const U = read(DB, KU), ph = U.find((x) => x.role === 'super').ph;
  const ACC = { acc: { role: 'staff', deptId: UNIT, ekey: ACC_E }, mgr: { role: 'staff', deptId: UNIT, ekey: 'mgr:' + UNIT, mgr: true }, dept: { role: 'dept', deptId: UNIT }, gm: { role: 'gm', gid: 'TEST_ONLY_GA', ekey: 'gm:TEST_ONLY_GA' }, mate: { role: 'staff', deptId: UNIT, ekey: 'TEST_ONLY_e_mate' },
    accO: { role: 'staff', deptId: OPEN_UNIT, ekey: ACCO_E }, mgrO: { role: 'staff', deptId: OPEN_UNIT, ekey: 'mgr:' + OPEN_UNIT, mgr: true }, deptO: { role: 'dept', deptId: OPEN_UNIT } };
  Object.keys(ACC).forEach((a, i) => U.push(Object.assign({ id: 'TEST_ONLY_' + a, un: '109960' + i + '000', name: a, ph, mc: 0, dis: 0 }, ACC[a])));
  put(DB, KP, P); put(DB, KU, U); put(DB, 'bsdept:' + UNIT + ':bassam_grants_v1', { v: 1, emp: {} }); put(DB, 'bsdept:' + OPEN_UNIT + ':bassam_grants_v1', { v: 1, emp: {} });
  const C = client(env), ck = {};
  ck.su = (await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN)).ck;
  for (const [i, a] of Object.keys(ACC).entries()) { const L = await C.login('109960' + i + '000', TEST_SUPER_PIN); assert.ok(L.ok, a + ' signs in'); ck[a] = L.ck; }
  /* the store, written and read directly */
  const seed = (id, st, k, uid) => {
    DB.db.prepare('DELETE FROM imgs WHERE k = ? OR k LIKE ?').run(id, '~stg~' + id + '~%'); DB.db.prepare('DELETE FROM imgown WHERE img = ?').run(id); DB.db.prepare('DELETE FROM imgref WHERE img = ?').run(id);
    DB.db.prepare('INSERT INTO imgs (k, seq, v) VALUES (?, 0, ?)').run(id, PNG0);
    if (st) DB.db.prepare('INSERT INTO imgown (img, st, k, uid, dept, ts) VALUES (?, ?, ?, ?, ?, ?)').run(id, st, k || '', uid || '', k && k.indexOf('bsdept:') === 0 ? k.split(':')[1] : '', 1760000000000);
    if (st === 'bound') DB.db.prepare('INSERT OR IGNORE INTO imgref (img, k) VALUES (?, ?)').run(id, k);
  };
  const wipe = (id) => { DB.db.prepare('DELETE FROM imgs WHERE k = ? OR k LIKE ?').run(id, '~stg~' + id + '~%'); DB.db.prepare('DELETE FROM imgown WHERE img = ?').run(id); DB.db.prepare('DELETE FROM imgref WHERE img = ?').run(id); };
  const bytes = async (id) => { const row = DB.q('SELECT v FROM imgs WHERE k = ? ORDER BY seq', id).map((r) => r.v).join(''), o = row === '~r2~' ? await env.IMG_R2.get('img/' + id) : null; return row === '~r2~' ? (o ? await o.text() : '~r2~ without an object') : row; };
  const call = async (c, id, method, body, q) => {
    DB.db.prepare("DELETE FROM guard WHERE gk LIKE 'rl:%'").run();   /* the per-minute upload limit and the daily quota are not what is measured */
    const r = await C.api('/api/img/' + encodeURIComponent(id) + (q || ''), Object.assign({ cookie: c, method }, method === 'PUT' ? { body, headers: { 'Content-Type': 'text/plain' } } : {}));
    return r.status === 200 ? 'Y' : r.status === 403 && r.j && WHY[r.j.why] ? WHY[r.j.why] : '?(' + r.status + ':' + JSON.stringify(r.j).slice(0, 80) + ')';
  };
  /* PUT · chunked PUT · DELETE on one stored image; three letters, each checked against the stored bytes */
  const three = async (c, id, st, k, uid, who) => {
    let out = '';
    for (const [method, body, q] of [['PUT', PNG1], ['PUT', PNG2, '?p=0&n=1'], ['DELETE']]) {
      const a = await call(c, id, method, body, q), now = await bytes(id);
      assert.ok(a.length === 1, who + ' ' + method + (q || '') + ' on ' + id + ': ' + a);
      assert.equal(now, a === 'Y' ? (method === 'DELETE' ? '' : body) : PNG0, who + ' ' + method + (q || '') + ' on ' + id + ': the answer (' + a + ') matches the stored bytes');
      if (a === 'Y') seed(id, st, k, uid);
      out += a;
    }
    return out;
  };
  RECORDS.forEach((r, i) => { r['img' + mode] = 'img_swp' + tag + '_r' + i.toString(36); seed(r['img' + mode], 'bound', r.k); });
  const STATES = [['claim of another account', 'claim', '', 'TEST_ONLY_mate'], ['unresolved (amb)', null], ['orphan', 'orphan', 'bsdept:' + UNIT + ':bassam_plan_v1', '']];
  STATES.forEach((s, i) => { s[4] = 'img_swp' + tag + '_s' + i; seed(s[4], s[1], s[2], s[3]); });
  const table = {}; let n = 0, cells = 0;
  for (const [id, acc, sheet, grant, modes] of ACTORS) {
    if (modes.indexOf(mode === 'legacy' ? 'L' : 'E') === -1) continue;
    P.emps[UNIT] = sheet && acc === 'acc' ? { [ACC_E]: sheet } : {}; P.emps[OPEN_UNIT] = sheet && acc === 'accO' ? { [ACCO_E]: sheet } : {}; put(DB, KP, P);
    put(DB, 'bsdept:' + UNIT + ':bassam_grants_v1', { v: 1, emp: grant ? { [ACC_E]: { plus: grant, minus: [], at: 1, by: 'TEST_ONLY' } } : {} });
    const row = {}, c = ck[acc];
    for (const r of RECORDS) if (SEES[acc](r)) row[r.id] = await three(c, r['img' + mode], 'bound', r.k, '', id);
    for (const s of STATES) row[s[0]] = await three(c, s[4], s[1], s[2], s[3], id);
    for (const pfx of ['img_', 'img_tsk', 'szp_']) {
      let o = '';
      for (const [body, q] of [[PNG1], [PNG2, '?p=0&n=1']]) {
        const nid = pfx + 'swp' + tag + '_n' + (++n).toString(36), a = await call(c, nid, 'PUT', body, q), now = await bytes(nid);
        assert.equal(now, a === 'Y' ? body : '', id + ' new ' + pfx + (q || '') + ': the answer (' + a + ') matches the store'); wipe(nid); o += a;
      }
      row['new upload ' + pfx] = o;
    }
    table[id] = row; cells += Object.values(row).join('').length;
  }
  if (t) t.diagnostic(mode + ': ' + Object.keys(table).length + ' actors · ' + cells + ' cells');
  return { table, cells };
}
const OPS3 = ['PUT', 'chunked PUT', 'DELETE'], OPS2 = ['PUT', 'chunked PUT'];
const opName = (cell, i) => (cell.indexOf('new upload') === 0 ? OPS2 : OPS3)[i];

/* enforce allowed ⇒ legacy allowed. Returns { 'record · operation': [actors…] } for the cells that break it. */
function violations(L, E) {
  const out = {}; let compared = 0;
  for (const id of Object.keys(E)) {
    const refs = L[id] ? [id] : GRANT_REF[id]; assert.ok(refs && refs.every((r) => L[r]), id + ': a legacy counterpart exists (' + refs + ')');
    for (const cell of Object.keys(E[id])) for (let i = 0; i < E[id][cell].length; i++) {
      compared++;
      if (E[id][cell][i] === 'Y' && !refs.some((r) => L[r][cell][i] === 'Y')) (out[cell + ' · ' + opName(cell, i)] = out[cell + ' · ' + opName(cell, i)] || []).push(id);
    }
  }
  return { out, compared };
}

/* Cells left OPEN on purpose: { 'record · operation': [actors] } — all of them «a writer of the unit» (a new unbound upload · an
   image bound to a «rule» record: the technical flags, the profile, the notification records), all of them MANAGERS, all of them
   holes of LEGACY rather than looseness of enforce, and all measured the same on 2c28c95:
   1. THE GENERAL MANAGER WITHOUT A SHEET, in every unit. Legacy 018 writePages has no branch for role gm: without a stored sheet it
      answers «no write page», although the same manager writes every record of his units (022 myPermsOf gives him the unit
      ceiling — he replaces and deletes the bound images of the plan, the rounds, the tasks … in both modes).
   2. THE UNIT MANAGER AND THE UNIT ACCOUNT OF A UNIT WITH NO CEILING RECORD (the known LEGACY_GAP of v7_p3_0_open_cap_matrix,
      pinned in v7_c_enf_writer_matrix): legacy gives them no implicit write there (the unit account still uploads: role dept).
   Enforce counts the keys they inherit. Closing these would stop a manager from uploading any new image in enforce (the site
   map he is allowed to save) — a legitimate manager flow — and the same question decides the technical-flag saves, which are not
   image decisions. So they are NOT forced; they need an owner decision (or a fix of legacy, out of scope: «legacy must not change»). */
const RULE_RECORDS = Object.keys(RES_REG).filter((n) => RES_REG[n].scope === 'dept' && RES_REG[n].rule);
const OPEN = {};
for (const rn of RULE_RECORDS) for (const op of OPS3) { OPEN[rn + ' · ' + op] = ['general manager']; OPEN['open unit: ' + rn + ' · ' + op] = ['general manager', 'open unit · unit manager', 'open unit · unit account']; }
for (const pfx of ['img_', 'szp_']) for (const op of OPS2) OPEN['new upload ' + pfx + ' · ' + op] = ['general manager', 'open unit · unit manager'];

/* Owner decision (2026-11-12, option 1): the exception stays — the general manager and the manager/account of a unit with no
   ceiling record — because the legacy refusal there is a missing gm branch, not a decision to refuse. Condition: the exception
   cells are pinned LITERALLY so they cannot widen silently (a new «rule» record, a new actor or a new operation fails here).
   Recorded in STATE.md, gate-D items, as a known legacy/enforce difference. */
test('the OPEN exception is pinned literally (owner decision 2026-11-12, option 1): 34 cell kinds, 68 actor-cells', () => {
  assert.deepEqual(RULE_RECORDS, ['bassam_notif_v1', 'bassam_notif_dev_v1', 'bassam_first_boot_v1', 'bassam_demo_purged_v1', 'bassam_profile_v1']);
  assert.deepEqual(OPS3, ['PUT', 'chunked PUT', 'DELETE']); assert.deepEqual(OPS2, ['PUT', 'chunked PUT']);
  const actors = new Set(Object.values(OPEN).flat());
  assert.deepEqual([...actors].sort(), ['general manager', 'open unit · unit account', 'open unit · unit manager']);
  assert.equal(Object.keys(OPEN).length, 34);
  assert.equal(Object.values(OPEN).reduce((n, a) => n + a.length, 0), 68);
  for (const k of Object.keys(OPEN)) assert.ok(/^(open unit: )?bassam_(notif|notif_dev|first_boot|demo_purged|profile)_v1 · |^new upload (img|szp)_ · /.test(k), k);
});

let SW = null;
const sweeps = (t) => SW || (SW = quiet(async () => ({ L: await sweep('legacy', t), E: await sweep('enforce', t) })));

test('the sweep is not vacuous: the lists are derived and both modes allow real writers', { timeout: 1800000 }, async (t) => {
  const { L, E } = await sweeps(t);
  assert.ok(LEAVES.length >= 40 && ASSIGN.length >= 231 && RECORDS.length >= 68 + 41, 'pages/leaves, assignable keys and records are read from the server and the registry');
  for (const rn of ['bassam_plan_v1', 'bassam_rounds_v1', 'bassam_zone_opts_v1', 'bassam_gate_opts_v1', 'bassam_mark_kinds_v1', 'bassam_tasks_v1', 'bassam_seized_v1', 'bassam_dreport_v1', 'bassam_dayshift_v1', 'bassam_employees_v1', 'bassam_profile_v1']) assert.ok(RECORDS.some((r) => r.id === rn), rn);
  for (const T of [L.table, E.table]) {
    assert.equal(T['s plan:edit'].bassam_plan_v1, 'YYY'); assert.equal(T['s daily/rounds:edit'].bassam_rounds_v1, 'YYY'); assert.equal(T['s tasks:edit'].bassam_tasks_v1, 'YYY');
    assert.equal(T['s seized/records:add'].bassam_seized_v1, 'YYY'); assert.equal(T['s dreport:edit'].bassam_dayshift_v1, 'YYY'); assert.equal(T['s emps/data:del'].bassam_employees_v1, 'YYY');
    assert.equal(T['every view'].bassam_plan_v1, 'bbb'); assert.equal(T['no sheet']['new upload img_'], 'nn'); assert.equal(T['no sheet']['new upload img_tsk'], 'YY', 'selfProof: the assignee uploads a task proof');
    for (const a of ['unit manager', 'unit account', 'general manager', 'platform admin', 'full sheet']) for (const rn of ['bassam_plan_v1', 'bassam_rounds_v1', 'bassam_tasks_v1', 'bassam_profile_v1']) if (a !== 'general manager' || rn !== 'bassam_profile_v1') assert.equal(T[a][rn], 'YYY', a + ' ' + rn);
    for (const a of Object.keys(T)) if (a !== 'platform admin') { if (a.indexOf('open unit') !== 0) { assert.equal(T[a]['other unit: bassam_plan_v1'], 'bbb', a); assert.equal(T[a].bassam_depts_v1, 'bbb', a); } assert.equal(T[a]['claim of another account'], 'ccc', a); assert.equal(T[a]['unresolved (amb)'], 'aaa', a); assert.equal(T[a].orphan, 'ooo', a); }
    for (const a of ['open unit · unit manager', 'open unit · unit account', 'open unit · full sheet', 'general manager']) for (const rn of ['bassam_plan_v1', 'bassam_rounds_v1', 'bassam_tasks_v1']) assert.equal(T[a]['open unit: ' + rn], 'YYY', a + ' ' + rn);
    assert.equal(T['open unit · supervisor']['open unit: bassam_plan_v1'], 'bbb'); assert.equal(T['open unit · plan writer']['open unit: bassam_rounds_v1'], 'bbb'); assert.equal(T['open unit · plan approver']['open unit: bassam_plan_v1'], 'bbb');
  }
  assert.equal(E.table['g site.edit'].bassam_plan_v1, 'YYY'); assert.equal(E.table['g round.edit'].bassam_rounds_v1, 'YYY'); assert.equal(E.table['g task.edit'].bassam_tasks_v1, 'YYY');
});

test('IMAGES: enforce allows nothing that legacy refuses — every actor × record × operation', { timeout: 1800000 }, async (t) => {
  const { L, E } = await sweeps(t), V = violations(L.table, E.table);
  t.diagnostic('compared ' + V.compared + ' enforce cells against legacy (' + Object.keys(E.table).length + ' enforce actors, ' + Object.keys(L.table).length + ' legacy actors, ' + (RECORDS.length + 3) + ' stored images, 3 operations; 3 new-upload kinds, 2 operations)');
  if (process.env.V7E_PRINT) console.log(JSON.stringify(V.out, null, 1));
  assert.deepEqual(V.out, OPEN, Object.keys(V.out).length + ' cell kinds where enforce allows and legacy refuses');
});

/* ═══ THE BIND THROUGH A RECORD SAVE (054 imgForeignIn) — fixture world tst_d1, POST /api/save ═══
   The account saves a record it writes (the «home»: the plan, then today's round) with a NEW reference to an image owned by another
   record. Accepted ⇒ the account would show that record's image inside its own record; legacy refuses «imgown» unless the account
   also writes the owner. The decision is the same predicate as PUT/DELETE above (054 imgForeignIn → imgWriteOk), so this part proves
   the WIRING on real saves and is sized to stay within minutes (a save costs ~0.1 s):
   Actors: a home writer alone and with every leaf × write act on top (017 WRITE_ACTS: add · edit · del · approve — sheets, both
   modes); a home writer by explicit grant with every assignable write key on top (enforce; counterpart: the sheets its atoms
   name, as above); the unit manager.
   Owners: for a pair actor the records that leaf or its keys touch (023 cap/capAdd · registry guard.resources — a leaf that touches
   none is skipped: parent pages and dashboards), for the others every unit record. The round is the vehicle; the plan is used as
   well whenever an owner is a record the rounds page writes (the home sheet itself would otherwise mask the answer).
   The plan-owned and the round-owned images are bound by real saves; the rest in the ownership tables. The stored home record is
   compared after every attempt. */
const WU = workerUnderTest();
const FKP = 'bassam_perms_v1', DM = ['0000000101', '70101'], FACC = ['0000000118', '70118'], FACC_E = 'tst_e_field';
const DEPT_RECORDS = Object.keys(RES_REG).filter((n) => RES_REG[n].scope === 'dept');
const capsOf = (R) => [].concat(R.cap || [], R.capAdd || []);
const relevant = (leaf) => DEPT_RECORDS.filter((n) => capsOf(RES_REG[n]).includes(leaf) || REG.some((e) => e.status === 'active' && atomsOf(e).some(([l]) => l === leaf) && ((e.guard || {}).resources || []).includes(n)));
const ROUNDS_WRITES = DEPT_RECORDS.filter((n) => capsOf(RES_REG[n]).includes('daily/rounds'));
const vehicle = (H, owners) => H.id === 'rounds' || owners.some((n) => ROUNDS_WRITES.includes(n));
const isDay = (k) => /^\d+-\d+-\d+$/.test(k);
const HOMES = [
  { id: 'plan', leaf: 'plan', k: 'bsdept:' + FXD + ':bassam_plan_v1', rn: 'bassam_plan_v1', floor: (v, i) => v.floors[i], grant: ['site.edit', 'map.replace'] },
  { id: 'rounds', leaf: 'daily/rounds', k: 'bsdept:' + FXD + ':bassam_rounds_v1', rn: 'bassam_rounds_v1', floor: (v, i) => v[Object.keys(v).filter(isDay).sort().pop()].d[i], grant: ['round.edit'] },
];
const WRITE_KEYS = ASSIGN.filter((e) => !isView(e) && e.type !== 'capability'), BIND_ACTS = ACTS.filter((a) => WRITE_ACTS[a]);
async function binds(mode, t) {
  const W = await world({ worker: WU.file, mode }), env = W.env, DB = env.DB, x = mode.slice(0, 1) + 'b';
  const post = (ck, body) => { DB.db.prepare("DELETE FROM guard WHERE gk LIKE 'rl:%'").run(); return W.C.api('/api/save', { method: 'POST', cookie: ck, body: operationSaveBody(env, '/api/save', taskCommandBody(env, '/api/save', body)) }); };
  const save = async (ck, H, edit) => {
    const v = JSON.parse(JSON.stringify(stored(env, H.k))); edit(v);
    const sv = await post(ck, { set: { [H.k]: JSON.stringify(v) }, del: [], base: { [H.k]: DB.q('SELECT rev FROM revs WHERE k = ?', H.k)[0].rev }, why: { [H.k]: TAG + ' bind' } });
    const den = ((sv.j && sv.j.denied) || {})[H.k];
    return sv.status === 200 && !den ? 'OK' : String((den && den.why) || (sv.j && (sv.j.why || sv.j.err)) || sv.status);
  };
  const up = (ck, id) => { DB.db.prepare("DELETE FROM guard WHERE gk LIKE 'rl:%'").run(); return W.C.api('/api/img/' + id, { method: 'PUT', cookie: ck, body: FXPNG, headers: { 'Content-Type': 'text/plain' } }); };
  const dm = await W.login(...DM), acc = await W.login(...FACC), IMG = {};
  /* the two homes own a real image each (slot 0); the bind attempts use slot 1 */
  for (const H of HOMES) {
    IMG[H.rn] = 'img_bnd' + x + '_' + H.id;
    assert.equal((await up(dm.ck, IMG[H.rn])).status, 200); assert.equal(await save(dm.ck, H, (v) => { H.floor(v, 0).iid = IMG[H.rn]; }), 'OK', 'the manager binds the ' + H.id + ' image');
    assert.deepEqual({ ...DB.q('SELECT st, k FROM imgown WHERE img = ?', IMG[H.rn])[0] }, { st: 'bound', k: H.k });
  }
  DEPT_RECORDS.forEach((n, i) => {
    if (IMG[n]) return; const id = IMG[n] = 'img_bnd' + x + '_r' + i.toString(36), k = 'bsdept:' + FXD + ':' + n;
    DB.db.prepare('INSERT INTO imgs (k, seq, v) VALUES (?, 0, ?)').run(id, PNG0);
    DB.db.prepare('INSERT INTO imgown (img, st, k, uid, dept, ts) VALUES (?, ?, ?, ?, ?, ?)').run(id, 'bound', k, '', FXD, 1760000000000);
    DB.db.prepare('INSERT OR IGNORE INTO imgref (img, k) VALUES (?, ?)').run(id, k);
  });
  const P = JSON.parse(DB.q('SELECT v FROM kv WHERE k = ? ORDER BY seq', FKP).map((r) => r.v).join('')), KGR = 'bsdept:' + FXD + ':bassam_grants_v1';
  const setup = (sheet, grant) => { P.emps = P.emps || {}; P.emps[FXD] = P.emps[FXD] || {}; if (sheet) P.emps[FXD][FACC_E] = sheet; else delete P.emps[FXD][FACC_E]; put(DB, FKP, P); put(DB, KGR, { v: 1, emp: grant ? { [FACC_E]: { plus: grant, minus: [], at: 1, by: 'TEST_ONLY' } } : {} }); };
  const out = {}; let n = 0, saves = 0;
  /* one actor on one home: a letter per owner — Y bound · i «imgown» · anything else is the save's own refusal */
  const attempt = async (id, ck, H, owners, control) => {
    const row = {}; let dirty = false;
    if (control) {   /* a home writer binds his own fresh upload: the save itself is his */
      const mine = 'img_bnd' + x + '_c' + (++n).toString(36); const u = await up(ck, mine), r = u.status === 200 ? await save(ck, H, (v) => { H.floor(v, 1).iid = mine; }) : 'upload ' + u.status;
      saves++; row['(his own upload)'] = r === 'OK' ? 'Y' : r; dirty = dirty || r === 'OK';
    }
    for (const rn of owners) {
      if (rn === H.rn) continue;
      const r = await save(ck, H, (v) => { H.floor(v, 1).iid = IMG[rn]; }), slot = H.floor(stored(env, H.k), 1).iid; saves++;
      assert.equal(slot === IMG[rn], r === 'OK', id + ' @' + H.id + ' ← ' + rn + ': the answer (' + r + ') matches the stored record');
      assert.equal(DB.q('SELECT k FROM imgown WHERE img = ?', IMG[rn])[0].k, 'bsdept:' + FXD + ':' + rn, 'ownership never moves');
      row[rn] = r === 'OK' ? 'Y' : r === 'imgown' ? 'i' : r; dirty = dirty || r === 'OK';
    }
    if (dirty) assert.equal(await save(dm.ck, H, (v) => { H.floor(v, 1).iid = null; }), 'OK', 'the manager clears the slot');
    (out[id] = out[id] || {})[H.id] = row;
  };
  const L = mode === 'legacy';
  for (const H of HOMES) {
    const home = { [H.leaf]: ['view', 'edit'] };
    setup(home, null); await attempt('home sheet', acc.ck, H, DEPT_RECORDS, true);
    setup(null, null); await attempt('unit manager', dm.ck, H, DEPT_RECORDS, true);
    for (const leaf of LEAVES) { const rel = relevant(leaf); if (rel.length && vehicle(H, rel)) for (const act of BIND_ACTS) {
      const sh = Object.assign({}, home); sh[leaf] = Array.from(new Set((sh[leaf] || ['view']).concat([act])));
      setup(sh, null); await attempt('home + ' + sheetId(leaf, act), acc.ck, H, rel, false);
    } }
    if (!L) {
      setup(null, VIEWS.concat(H.grant)); await attempt('g home', acc.ck, H, DEPT_RECORDS, true);
      for (const e of WRITE_KEYS) { const rs = ((e.guard || {}).resources || []).filter((r) => DEPT_RECORDS.includes(r)); if (rs.length && vehicle(H, rs)) { setup(null, VIEWS.concat(H.grant, [e.key])); await attempt('g home + ' + e.key, acc.ck, H, rs, false); } }
    }
  }
  if (t) t.diagnostic(mode + ' binds: ' + Object.keys(out).length + ' actors · ' + saves + ' saves');
  return { out, saves };
}
let BN = null;
const bindSweeps = (t) => BN || (BN = quiet(async () => ({ L: await binds('legacy', t), E: await binds('enforce', t) })));

test('IMAGES · bind by a record save: enforce accepts no foreign image that legacy refuses «imgown»', { timeout: 1800000 }, async (t) => {
  const { L, E } = await bindSweeps(t), viol = {}, other = {}; let compared = 0;
  const KEY = Object.fromEntries(WRITE_KEYS.map((e) => ['g home + ' + e.key, e]));
  for (const id of Object.keys(E.out)) for (const h of Object.keys(E.out[id])) {
    const refs = L.out[id] ? [id] : id === 'g home' ? ['home sheet'] : atomsOf(KEY[id]).filter(([, a]) => WRITE_ACTS[a]).map(([l, a]) => 'home + ' + sheetId(l, a)).concat(['home sheet']);
    for (const rn of Object.keys(E.out[id][h])) {
      compared++;
      const leg = refs.map((r) => ((L.out[r] || {})[h] || {})[rn]).filter((v) => v !== undefined);
      assert.ok(leg.length, id + ' @' + h + ' ← ' + rn + ': a legacy counterpart was measured (' + refs + ')');
      if (E.out[id][h][rn] !== 'Y' || leg.includes('Y')) continue;
      (leg.every((v) => v === 'i') ? viol : other)[h + ' ← ' + rn] = ((leg.every((v) => v === 'i') ? viol : other)[h + ' ← ' + rn] || []).concat([id]);
    }
  }
  t.diagnostic('compared ' + compared + ' enforce bind cells against legacy (' + E.saves + ' enforce saves, ' + L.saves + ' legacy saves)');
  if (process.env.V7E_PRINT) console.log(JSON.stringify({ viol, other }, null, 1));
  /* not vacuous: the home writers do save their home, and the pinned decisions are visible on this path too */
  for (const M of [L.out, E.out]) {
    for (const a of ['home sheet', 'unit manager']) for (const h of ['plan', 'rounds']) assert.equal(M[a][h]['(his own upload)'], 'Y', a + ' @' + h);
    assert.equal(M['home sheet'].plan.bassam_rounds_v1, 'i', 'a plan-only writer cannot bind the round-owned image into the plan');
    assert.equal(M['home sheet'].rounds.bassam_plan_v1, 'i', 'a rounds-only writer cannot bind the plan-owned image into the round');
    assert.equal(M['home + s daily/rounds:edit'].plan.bassam_rounds_v1, 'Y'); assert.equal(M['home + s plan:edit'].rounds.bassam_plan_v1, 'Y');
    assert.equal(M['home + s plan:approve'].rounds.bassam_plan_v1, 'i', 'an approve on the plan is not a write of its image');
    for (const rn of DEPT_RECORDS) for (const h of ['plan', 'rounds']) if (M['unit manager'][h][rn] !== undefined) assert.equal(M['unit manager'][h][rn], 'Y', 'the unit manager @' + h + ' ← ' + rn);
  }
  for (const h of ['plan', 'rounds']) assert.equal(E.out['g home'][h]['(his own upload)'], 'Y', 'a home writer by explicit grant @' + h);
  assert.deepEqual(viol, {}, 'cells where enforce binds and legacy refuses imgown');
  assert.deepEqual(other, {}, 'cells where enforce binds and legacy refuses the save for a reason other than the image (a record decision — not judged here, but none is expected)');
});
