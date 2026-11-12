/* RISHAD V7-C — who is a «writer» for the technical flags and for images (real worker, legacy and enforce, TEST_ONLY data).
   Three places ask «does this account write anything in its unit?»:
     · the «tech» rule resources (bassam_first_boot_v1 · bassam_demo_purged_v1 · bassam_profile_v1 — 023:100-102 → 044:87 / 060:41);
     · a NEW image upload (PUT /api/img/<id> with no owner yet — 054 imgVerdict → 018 anyWriter → 057 enfAnyWriter);
     · put/delete of an image BOUND to a «rule» resource (054 imgWriteOk → 060 enfImgWriteOk); an image bound to an ordinary
       resource follows that resource's own write keys (057 enfResWriter) — measured here for the first time.
   Found on e34fa23 (enforce only): enfAnyWriterDept counted every key that is not view/access — including lens.<L>.enable
   (type «capability»), which enfHeld0 answers «held» to whenever the lens gate is on, whatever the sheet. So an employee with a
   view-only sheet, or with no sheet at all, in a unit whose ceiling hosts a lens (plan or daily/rounds) was a «writer»: he wrote
   the technical flags, uploaded new images and replaced/deleted images bound to a technical flag.
   Owner decision (option 1): in enforce a «capability» key does not make a writer (as 057 enfFieldLift already excludes it); legacy
   is not changed at all. The field observer keeps writing: his status-change keys (derived from field.view) are type «operation».
   The whole table is pinned from actual HTTP outcomes. BEFORE = the cells as measured on e34fa23, asserted only when
   KIVO_BASE_WORKER points at a worker generated from e34fa23 (the reproduction).
   V7-D (owner decision: «الراصد في enforce لا يستبدل ولا يحذف صور الخطة والجولات، كما في legacy»): the enforce observer rows pinned
   here by V7-C as a labelled finding (`YYYYYYbbYYYY` on OPEN/FULL) are deliberately rewritten to the legacy outcome
   (`vvnYbbbbbbbb`): the status keys derived from field.view write the status of assigned elements only and no longer make their
   holder a writer of the plan/rounds records (bound images), nor «a writer of the unit» (technical flags · new unbound image) —
   unless his confinement is lifted by an explicit non-derived write (057 enfDerivedBare; details in v7_d_observer_img). His
   task-proof upload (img_tsk…, selfProof) and its binding through /api/me/tasks/act are untouched. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { makeTestEnv, client, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';
import { internals } from './internals.mjs';
import { world, workerUnderTest, ME, MATE, P0, KT, TAG, D, PNG, hij, HR, stored, taskCommandBody, operationSaveBody } from './tasks_fx.mjs';

const { PG_KEYS } = await internals(['PG_KEYS']);
const KG = 'bassam_gdepts_v1', KD = 'bassam_depts_v1', KU = 'bassam_auth_users_v1', KP = 'bassam_perms_v1';
const put = (DB, k, v) => { DB.db.prepare('DELETE FROM kv WHERE k = ?').run(k); DB.db.prepare('INSERT INTO kv (k, seq, v) VALUES (?, 0, ?)').run(k, JSON.stringify(v)); DB.db.prepare('INSERT INTO revs (k, rev) VALUES (?, 1) ON CONFLICT(k) DO UPDATE SET rev = rev + 1').run(k); };
const read = (DB, k) => JSON.parse(DB.q('SELECT v FROM kv WHERE k = ? ORDER BY seq', k).map((r) => r.v).join('') || 'null');
const BASIC = ['emps', 'tasks', 'planning', 'staff', 'links', 'help', 'admin'];
const UNITS = { OPEN: null, FULL: PG_KEYS.slice(), BASIC };
const DER = ['lens.zones.status.change', 'lens.gates.status.change', 'lens.marks.status.change'];
/* the actors of one unit: [tag, account fields, stored sheet (or null), explicit grant (or null)] */
const ACTORS = [
  ['gm', (u) => ({ role: 'gm', gid: 'TEST_ONLY_G' + u, ekey: 'gm:TEST_ONLY_G' + u }), null, null],          /* general manager, no sheet */
  ['dept', (u) => ({ role: 'dept', deptId: 'TEST_ONLY_' + u }), null, null],                                /* the unit account */
  ['mgr', (u) => ({ role: 'staff', deptId: 'TEST_ONLY_' + u, ekey: 'mgr:TEST_ONLY_' + u, mgr: true }), null, null],   /* unit manager, no sheet */
  ['write', (u) => ({ role: 'staff', deptId: 'TEST_ONLY_' + u, ekey: 'TEST_ONLY_e_w' + u }), { tasks: ['view', 'edit'] }, null],
  ['view', (u) => ({ role: 'staff', deptId: 'TEST_ONLY_' + u, ekey: 'TEST_ONLY_e_v' + u }), { tasks: ['view'] }, null],
  ['obs', (u) => ({ role: 'staff', deptId: 'TEST_ONLY_' + u, ekey: 'TEST_ONLY_e_o' + u }), { 'daily/field': ['view'] }, null],
  ['obsG', (u) => ({ role: 'staff', deptId: 'TEST_ONLY_' + u, ekey: 'TEST_ONLY_e_g' + u }), null, ['field.view'].concat(DER)],   /* enforce: the key-level editor, no sheet */
  ['none', (u) => ({ role: 'staff', deptId: 'TEST_ONLY_' + u, ekey: 'TEST_ONLY_e_n' + u }), null, null],
];
/* the records an image is bound to: a technical flag («rule» ⇒ any writer of the unit) and three ordinary resources */
const BOUND = [['profile', 'bassam_profile_v1'], ['tasks', 'bassam_tasks_v1'], ['plan', 'bassam_plan_v1'], ['rounds', 'bassam_rounds_v1']];
const OPS = ['tech profile', 'tech first_boot', 'new img', 'new img_tsk'].concat(...BOUND.map(([b]) => ['put@' + b, 'del@' + b]));
const PNG1 = 'data:image/png;base64,iVBORw0KGgo=';
let seq = 0;

async function matrix(mode, workerFile) {
  const out = {};
  const env = makeTestEnv(mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce' } : {}), DB = env.DB;
  if (workerFile) env.__worker = (await import(pathToFileURL(path.resolve(workerFile)).href + '?v7c=' + (++seq))).default;
  if (mode === 'enforce') DB.exec("INSERT INTO meta(k,v) VALUES('authz_mode','enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  const US = Object.keys(UNITS);
  put(DB, KG, US.map((u) => ({ id: 'TEST_ONLY_G' + u, name: 'G' + u, kind: 'إدارة عامة' })));
  put(DB, KD, US.map((u) => ({ id: 'TEST_ONLY_' + u, name: u, gid: 'TEST_ONLY_G' + u })));
  const P = read(DB, KP) || {}; P.caps = {}; P.emps = {};
  const U = read(DB, KU), ph = U.find((x) => x.role === 'super').ph;
  US.forEach((u, i) => {
    const d = 'TEST_ONLY_' + u; if (UNITS[u]) P.caps[d] = UNITS[u]; P.emps[d] = {};
    const grants = {};
    ACTORS.forEach(([tag, acc, sheet, grant], j) => {
      const a = acc(u); U.push(Object.assign({ id: 'TEST_ONLY_' + tag + u, un: '10997' + String(i) + String(10 + j) + '00', name: tag + u, ph, mc: 0, dis: 0 }, a));
      if (sheet) P.emps[d][a.ekey] = sheet;
      if (grant) grants[a.ekey] = { plus: grant, minus: [], at: 1, by: 'TEST_ONLY' };
    });
    put(DB, 'bsdept:' + d + ':bassam_grants_v1', { v: 1, emp: grants });
    put(DB, 'bsdept:' + d + ':bassam_profile_v1', {}); put(DB, 'bsdept:' + d + ':bassam_first_boot_v1', { t: 1 });
  });
  put(DB, KP, P); put(DB, KU, U);
  const C = client(env);
  let n = 0;
  const seed = (k) => {   /* an image already stored and bound to the record k */
    const id = 'img_testonly' + (++n).toString(36) + '_' + mode.slice(0, 1) + 'x';
    DB.db.prepare('INSERT INTO imgs (k, seq, v) VALUES (?, 0, ?)').run(id, PNG1);
    DB.db.prepare('INSERT INTO imgown (img, st, k, uid, dept, ts) VALUES (?, ?, ?, ?, ?, ?)').run(id, 'bound', k, '', k.split(':')[1], 1760000000000);
    DB.db.prepare('INSERT OR IGNORE INTO imgref (img, k) VALUES (?, ?)').run(id, k);
    return id;
  };
  const img = async (ck, id, method) => {
    const r = await C.api('/api/img/' + encodeURIComponent(id), Object.assign({ cookie: ck, method }, method === 'PUT' ? { body: PNG1, headers: { 'Content-Type': 'text/plain' } } : {}));
    return r.status === 200 ? 'yes' : r.status === 403 ? 'no:' + ((r.j && r.j.why) || '') : 'HTTP ' + r.status;
  };
  const run = async (tag, u, ck) => {
    const d = 'TEST_ONLY_' + u, row = {};
    for (const [name, k] of [['tech profile', 'bassam_profile_v1'], ['tech first_boot', 'bassam_first_boot_v1']]) {
      const key = 'bsdept:' + d + ':' + k, before = JSON.stringify(read(DB, key));
      const w = await C.save(ck, { [key]: JSON.stringify({ t: ++n }) }); const dn = w.j && w.j.denied && w.j.denied[key];
      row[name] = w.status !== 200 ? 'HTTP ' + w.status : dn ? 'no:' + dn.why : 'yes';
      assert.equal(JSON.stringify(read(DB, key)) !== before, row[name] === 'yes', tag + u + ' ' + name + ': the answer matches what is stored');
    }
    row['new img'] = await img(ck, 'img_testonly' + (++n).toString(36) + '_new', 'PUT');
    row['new img_tsk'] = await img(ck, 'img_tsktestonly' + (++n).toString(36) + '_new', 'PUT');
    for (const [b, res] of BOUND) {
      const k = 'bsdept:' + d + ':' + res, a = seed(k), z = seed(k);
      row['put@' + b] = await img(ck, a, 'PUT');
      row['del@' + b] = await img(ck, z, 'DELETE');
      assert.equal(DB.q('SELECT COUNT(*) AS n FROM imgs WHERE k = ?', z)[0].n === 0, row['del@' + b] === 'yes', tag + u + ' del@' + b + ': the answer matches what is stored');
    }
    (out[tag] = out[tag] || {})[u] = row;
  };
  const su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok, 'the platform admin signs in');
  for (const [i, u] of US.entries()) {
    await run('super', u, su.ck);
    for (const [j, [tag]] of ACTORS.entries()) {
      const L = await C.login('10997' + String(i) + String(10 + j) + '00', TEST_SUPER_PIN); assert.ok(L.ok, tag + ' of ' + u + ' signs in');
      await run(tag, u, L.ck);
    }
  }
  return out;
}
/* compact form of a row: one letter per operation in OPS order — Y allowed, any other letter the refusal reason */
const WHY = { yes: 'Y', 'no:view': 'v', 'no:none': 'n', 'no:bound': 'b' };
const pack = (row) => OPS.map((o) => WHY[row[o]] || '?(' + row[o] + ')').join('');
const table = (out) => Object.fromEntries(Object.entries(out).map(([a, us]) => [a, Object.fromEntries(Object.entries(us).map(([u, r]) => [u, pack(r)]))]));


/* ── the bound-image path and the observer condition, end to end (fixture world tst_d1: ceiling with plan and rounds) ──
   Proof images in this product are the task-proof images (img_tsk…): the assignee uploads through PUT /api/img (imgVerdict
   selfProof) and binds through POST /api/me/tasks/act on a row assigned to him. The field monitoring screens themselves upload no
   image for an element (src/modules/daily: the only upload is the site map, behind a page write) — so «the observer still uploads
   proof on what is assigned to him» is exercised on the tasks assigned to him, with a sheet and with an explicit grant. */
const WU = workerUnderTest();
const DM = ['0000000101', '70101'], OBS = ['0000000118', '70118'], OBS_E = 'tst_e_field', NONE = P0[2];
const KPLAN = 'bsdept:' + D + ':bassam_plan_v1', KGR = 'bsdept:' + D + ':bassam_grants_v1';
const post = (W, ck, p, body) => W.C.api(p, { method: 'POST', cookie: ck, body: operationSaveBody(W.env, p, taskCommandBody(W.env, p, body)) });
const up = (W, ck, id, method = 'PUT') => W.C.api('/api/img/' + id, Object.assign({ method, cookie: ck }, method === 'PUT' ? { body: PNG, headers: { 'Content-Type': 'text/plain' } } : {}));
const own = (W, id) => W.env.DB.q('SELECT st, k, uid FROM imgown WHERE img = ?', id)[0] || null;
const inStore = (W, id) => W.env.DB.q('SELECT COUNT(*) AS n FROM imgs WHERE k = ?', id)[0].n > 0;
const rowOf = (S, id) => { for (const d in S) { const r = (S[d] || []).find((q) => Array.isArray(q) && q[13] === id); if (r) return r; } return null; };
async function mk(W, ck, eid, t) {
  const s = Date.now() - HR, c = await post(W, ck, '/api/tasks/create', { k: hij(s), t: TAG + ' ' + t, s, e: s + 3 * HR, asg: [eid], rv: 'none' });
  assert.equal(c.status, 200, JSON.stringify(c.j)); return { k: c.j.rows[0].k, id: c.j.rows[0].id };
}
const OBSERVERS = [['legacy', 'sheet'], ['enforce', 'sheet'], ['enforce', 'grant']];
for (const [mode, src] of OBSERVERS) {
  test('[' + mode + '] the field observer (' + src + ') uploads a proof image and binds it to the task assigned to him — and not to a task of someone else', { timeout: 300000 }, async () => {
    const W = await world({ worker: WU.file, mode }), DB = W.env.DB;
    if (src === 'grant') {   /* field.view by the key-level editor, no stored sheet */
      const P = read(DB, KP); delete P.emps[D][OBS_E]; put(DB, KP, P);
      put(DB, KGR, { v: 1, emp: { [OBS_E]: { plus: ['field.view'].concat(DER), minus: [], at: 1, by: 'TEST_ONLY' } } });
    } else assert.deepEqual(read(DB, KP).emps[D][OBS_E], { 'daily/field': ['view'] }, 'the fixture observer holds «رصد الميدان: عرض» only');
    const dm = await W.login(...DM), ob = await W.login(...OBS);
    const mine = await mk(W, dm.ck, OBS_E, 'obs own'), other = await mk(W, dm.ck, MATE.eid, 'obs other');
    /* assigned to him: upload ⇒ claim, bind through his own act ⇒ bound to the task store, readable by him */
    assert.equal((await post(W, ob.ck, '/api/me/tasks/act', { k: mine.k, id: mine.id, act: 'start' })).status, 200, 'he starts his task');
    const A = 'img_tskv7c' + mode.slice(0, 1) + src.slice(0, 1) + '_a1';
    assert.equal((await up(W, ob.ck, A)).status, 200, 'the proof upload is accepted');
    assert.equal(own(W, A).st, 'claim');
    const sub = await post(W, ob.ck, '/api/me/tasks/act', { k: mine.k, id: mine.id, act: 'submit', imgs: [A], note: TAG + ' تم' });
    assert.equal(sub.status, 200, 'the proof is bound: ' + JSON.stringify(sub.j).slice(0, 200));
    assert.deepEqual([own(W, A).st, own(W, A).k], ['bound', KT], 'the image now belongs to the task store');
    assert.ok(JSON.stringify(rowOf(stored(W.env, KT), mine.id)[21]).includes(A), 'and the row carries it');
    assert.equal((await W.C.api('/api/me/tasks/img?id=' + A, { cookie: ob.ck })).status, 200, 'he reads his proof back');
    /* not assigned to him: the act is refused, nothing is bound, the row is untouched */
    const B = 'img_tskv7c' + mode.slice(0, 1) + src.slice(0, 1) + '_b2';
    assert.equal((await up(W, ob.ck, B)).status, 200, 'a pending upload is his own (claim)');
    const before = JSON.stringify(rowOf(stored(W.env, KT), other.id));
    for (const act of ['start', 'doc', 'submit']) {
      const r = await post(W, ob.ck, '/api/me/tasks/act', { k: other.k, id: other.id, act, imgs: [B] });
      assert.notEqual(r.status, 200, act + ' on a task of someone else is refused');
    }
    assert.equal(JSON.stringify(rowOf(stored(W.env, KT), other.id)), before, 'the other row is unchanged');
    assert.equal(own(W, B).st, 'claim', 'and the image stays an unbound upload of his own');
    /* once bound, the file follows the write of the task store — which an observer does not hold */
    assert.equal((await up(W, ob.ck, A, 'DELETE')).status, 403); assert.ok(inStore(W, A), 'the bound proof is not deleted through /api/img');
    /* an ordinary (non-proof) new image: the «any writer» question. Legacy: a view sheet writes nothing ⇒ refused (unchanged).
       Enforce: was accepted through the status keys derived from field.view (before and after V7-C); V7-D (owner decision): those
       keys are not a write of the unit ⇒ refused as in legacy */
    const g = await up(W, ob.ck, 'img_v7c' + mode.slice(0, 1) + src.slice(0, 1) + '_g3');
    assert.equal(g.status, 403, 'a non-proof new image: ' + JSON.stringify(g.j)); assert.equal(g.j.why, 'none');
  });
}
for (const mode of ['legacy', 'enforce']) {
  test('[' + mode + '] a bound image, for real: uploaded, bound by saving the record that shows it, then put/delete follow the write of that record', { timeout: 300000 }, async () => {
    const W = await world({ worker: WU.file, mode }), DB = W.env.DB, x = mode.slice(0, 1);
    const dm = await W.login(...DM), ob = await W.login(...OBS), no = await W.login(NONE.un, NONE.pw);
    assert.equal((read(DB, KP).emps[D] || {})[NONE.eid], undefined, 'the plain employee has no sheet');
    /* the unit manager uploads a site map and binds it by saving the plan */
    const M = 'img_v7c' + x + 'map_m1';
    assert.equal((await up(W, dm.ck, M)).status, 200); assert.equal(own(W, M).st, 'claim');
    const g = await W.C.api('/api/operations/read?keys=' + encodeURIComponent(KPLAN), { cookie: dm.ck }), plan = g.j.resources[KPLAN];
    assert.ok(plan && Array.isArray(plan.floors) && plan.floors.length, 'the fixture plan has sites');
    plan.floors[0].iid = M;
    const sv = await post(W, dm.ck, '/api/save', { set: { [KPLAN]: JSON.stringify(plan) }, del: [], base: { [KPLAN]: g.j.base[KPLAN] }, why: { [KPLAN]: TAG + ' new site map' } });   /* enforce: map.replace asks for a reason */
    assert.ok(sv.status === 200 && !(sv.j.denied || {})[KPLAN], 'the plan is saved: ' + JSON.stringify(sv.j).slice(0, 200));
    assert.deepEqual([own(W, M).st, own(W, M).k], ['bound', KPLAN], 'the image is bound to the plan');
    /* an employee without any sheet: cannot bind an upload of his own to the plan, cannot replace or delete the bound map */
    const S = 'img_tskv7c' + x + 'self_s1';
    assert.equal((await up(W, no.ck, S)).status, 200, 'a task-proof upload is open to any employee account (selfProof)');
    const cur = stored(W.env, KPLAN), rev = DB.q('SELECT rev FROM revs WHERE k = ?', KPLAN)[0].rev, forged = JSON.parse(JSON.stringify(cur)); forged.floors[0].iid = S;
    const bad = await post(W, no.ck, '/api/save', { set: { [KPLAN]: JSON.stringify(forged) }, del: [], base: { [KPLAN]: rev } , why: { [KPLAN]: TAG + ' forged' } });
    assert.ok(bad.status !== 200 || (bad.j.denied || {})[KPLAN], 'his save of the plan is refused');
    assert.equal(stored(W.env, KPLAN).floors[0].iid, M, 'the plan still shows the manager\'s map'); assert.equal(own(W, S).st, 'claim', 'and his upload is bound to nothing');
    assert.equal((await up(W, no.ck, 'img_v7c' + x + 'none_n1')).status, 403, 'nor does he upload an ordinary new image');
    for (const m of ['PUT', 'DELETE']) { const r = await up(W, no.ck, M, m); assert.equal(r.status, 403, m + ' on the bound map: ' + JSON.stringify(r.j)); assert.equal(r.j.why, 'bound'); }
    /* the observer: no write of the plan in legacy. In enforce his derived status keys are bound to the plan and the rounds in the
       registry (guard.resources), so enfResWriter answered yes for ANY image of those records — measured on e34fa23 and pinned by
       V7-C «so that changing it is a decision». The decision came (V7-D): refused in enforce as in legacy. */
    for (const m of ['PUT', 'DELETE']) { const o = await up(W, ob.ck, M, m); assert.equal(o.status, 403, 'observer ' + m + ' on the bound map: ' + JSON.stringify(o.j)); assert.equal(o.j.why, 'bound'); }
    /* the writer of the record deletes it (no other record shows it) */
    assert.ok(inStore(W, M)); assert.equal((await up(W, dm.ck, M, 'DELETE')).status, 200); assert.ok(!inStore(W, M), 'deleted by the unit manager');
  });
}

/* One letter per operation, in this order:
     1 tech profile · 2 tech first_boot · 3 new img · 4 new img_tsk (task proof — any employee account, selfProof) ·
     5-6 put/del of an image bound to a technical flag · 7-8 bound to the tasks store · 9-10 to the plan · 11-12 to the rounds
   Y = allowed · v = refused «view» · n = refused «none» (no owner and not a writer) · b = refused «bound» (not a writer of its record).
   LEGACY — exactly as on e34fa23 (not changed by V7-C). Known and left as they are: a unit with no ceiling record gives the manager
   and the unit account no implicit write (018 writePages — the LEGACY_GAP of v7_p3_0_open_cap_matrix), and a general manager without
   a sheet is no «writer» anywhere although he writes the records themselves.
   ENFORCE — the target. The observer rows (sheet and explicit grant) equal legacy since V7-D (owner decision): the status keys
   derived from field.view are neither a write of the plan/rounds records nor of the unit. As measured on 09a5fe8 they were
   `YYYYYYbbYYYY` on OPEN/FULL (OBS_BEFORE_V7D) — he replaced/deleted ANY image of those two records. */
const EXPECT = {
  legacy: {
    super: { OPEN: 'YYYYYYYYYYYY', FULL: 'YYYYYYYYYYYY', BASIC: 'YYYYYYYYYYYY' },
    gm:    { OPEN: 'vvnYbbYYYYYY', FULL: 'vvnYbbYYYYYY', BASIC: 'vvnYbbYYbbbb' },
    dept:  { OPEN: 'vvYYbbYYYYYY', FULL: 'YYYYYYYYYYYY', BASIC: 'YYYYYYYYbbbb' },
    mgr:   { OPEN: 'vvnYbbYYYYYY', FULL: 'YYYYYYYYYYYY', BASIC: 'YYYYYYYYbbbb' },
    write: { OPEN: 'YYYYYYYYbbbb', FULL: 'YYYYYYYYbbbb', BASIC: 'YYYYYYYYbbbb' },
    view:  { OPEN: 'vvnYbbbbbbbb', FULL: 'vvnYbbbbbbbb', BASIC: 'vvnYbbbbbbbb' },
    obs:   { OPEN: 'vvnYbbbbbbbb', FULL: 'vvnYbbbbbbbb', BASIC: 'vvnYbbbbbbbb' },
    obsG:  { OPEN: 'vvnYbbbbbbbb', FULL: 'vvnYbbbbbbbb', BASIC: 'vvnYbbbbbbbb' },
    none:  { OPEN: 'vvnYbbbbbbbb', FULL: 'vvnYbbbbbbbb', BASIC: 'vvnYbbbbbbbb' },
  },
  enforce: {
    super: { OPEN: 'YYYYYYYYYYYY', FULL: 'YYYYYYYYYYYY', BASIC: 'YYYYYYYYYYYY' },
    gm:    { OPEN: 'YYYYYYYYYYYY', FULL: 'YYYYYYYYYYYY', BASIC: 'YYYYYYYYbbbb' },
    dept:  { OPEN: 'YYYYYYYYYYYY', FULL: 'YYYYYYYYYYYY', BASIC: 'YYYYYYYYbbbb' },
    mgr:   { OPEN: 'YYYYYYYYYYYY', FULL: 'YYYYYYYYYYYY', BASIC: 'YYYYYYYYbbbb' },
    write: { OPEN: 'YYYYYYYYbbbb', FULL: 'YYYYYYYYbbbb', BASIC: 'YYYYYYYYbbbb' },
    view:  { OPEN: 'vvnYbbbbbbbb', FULL: 'vvnYbbbbbbbb', BASIC: 'vvnYbbbbbbbb' },
    obs:   { OPEN: 'vvnYbbbbbbbb', FULL: 'vvnYbbbbbbbb', BASIC: 'vvnYbbbbbbbb' },
    obsG:  { OPEN: 'vvnYbbbbbbbb', FULL: 'vvnYbbbbbbbb', BASIC: 'vvnYbbbbbbbb' },
    none:  { OPEN: 'vvnYbbbbbbbb', FULL: 'vvnYbbbbbbbb', BASIC: 'vvnYbbbbbbbb' },
  },
};
/* the enforce observer rows before V7-D (e34fa23 … 09a5fe8) */
const OBS_BEFORE_V7D = { OPEN: 'YYYYYYbbYYYY', FULL: 'YYYYYYbbYYYY', BASIC: 'vvnYbbbbbbbb' };
/* the reproduction: on e34fa23, enforce, a view-only sheet and no sheet at all were «writers» wherever the ceiling hosts a lens */
const BEFORE = { obs: OBS_BEFORE_V7D, obsG: OBS_BEFORE_V7D, view: { OPEN: 'YYYYYYbbbbbb', FULL: 'YYYYYYbbbbbb', BASIC: 'vvnYbbbbbbbb' }, none: { OPEN: 'YYYYYYbbbbbb', FULL: 'YYYYYYbbbbbb', BASIC: 'vvnYbbbbbbbb' } };

for (const mode of ['legacy', 'enforce']) {
  test('[' + mode + '] the writer matrix: actor × unit ceiling × operation, by HTTP outcome', { timeout: 600000 }, async () => {
    const got = table(await matrix(mode));
    if (process.env.V7C_PRINT) console.log(mode + ' ' + JSON.stringify(got));
    assert.deepEqual(got, EXPECT[mode]);
  });
}
test('[enforce] V7-C in one line: a view-only sheet and no sheet write no technical flag, upload no new image and touch no bound image — in every unit', { timeout: 600000 }, async () => {
  const got = table(await matrix('enforce'));
  for (const a of ['view', 'none']) for (const u of Object.keys(UNITS)) assert.equal(got[a][u], 'vvnYbbbbbbbb', a + ' in ' + u);
  /* V7-D (owner decision): the observer is no «writer of the unit» either — as legacy; the 4th letter is his task-proof upload (selfProof), kept */
  for (const a of ['obs', 'obsG']) for (const u of Object.keys(UNITS)) assert.equal(got[a][u], EXPECT.legacy[a][u], 'the observer (' + a + ') in ' + u + ' equals legacy');
  for (const a of ['gm', 'dept', 'mgr', 'write']) for (const u of Object.keys(UNITS)) assert.equal(got[a][u].slice(0, 4), 'YYYY', a + ' in ' + u + ' is still a writer');
});
/* run with KIVO_BASE_WORKER=<_worker.js generated from e34fa23> to replay the measurement that led to the decision */
test('[enforce] the reproduction on e34fa23 (needs KIVO_BASE_WORKER)', { timeout: 600000, skip: !process.env.KIVO_BASE_WORKER || !fs.existsSync(process.env.KIVO_BASE_WORKER) }, async () => {
  const got = table(await matrix('enforce', process.env.KIVO_BASE_WORKER)), want = JSON.parse(JSON.stringify(EXPECT.enforce)); Object.assign(want, BEFORE);
  assert.deepEqual(got, want, 'before the fixes: only the view-only and the sheetless rows (V7-C) and the observer rows (V7-D) differ from the target');
  assert.deepEqual(table(await matrix('legacy', process.env.KIVO_BASE_WORKER)), EXPECT.legacy, 'legacy is the same before and after');
});
