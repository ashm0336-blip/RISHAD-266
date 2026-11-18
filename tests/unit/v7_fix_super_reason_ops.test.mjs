/* V7 fix — the platform admin (role=super) is never asked for a reason: «operations» resources saved through POST /api/save.
   Real worker, enforce mode, TEST_ONLY synthetic data. For every permission key the same data change is sent three times,
   each on freshly re-seeded «before» data:
     1) super, no reason            ⇒ saved, stored data really changes, authz row carries «بلا سبب (مدير المنصة)»
     2) unit manager, no reason     ⇒ refused with why = reason, data unchanged
     3) same manager, with a reason ⇒ saved, stored data really changes
   The four lens.*.status.change keys have the reason switched off for everybody (ENF_REASON_OFF): the manager without a
   reason is expected to succeed there — the real behaviour is asserted and recorded with a note.
   All «before» data sits in the CURRENT Hijri month/day, so period locks and retro windows are not in play. */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { world, workerUnderTest, D, T, DAY, stored, replaceOperationalFixture } from './world_fx.mjs';
import { needs } from './harness.mjs';

const WU = workerUnderTest();
const K = (n) => 'bsdept:' + D + ':' + n;
const DM = ['0000000101', '70101'];                 /* fixture unit manager tst_dm1 */
const MON = T.y + '-' + T.m;                        /* current Hijri month */
const NONE_SUPER = 'بلا سبب (مدير المنصة)';
const clone = (v) => JSON.parse(JSON.stringify(v));
const RESULTS = [];
let seq = 0;

after(() => { if (process.env.KIVO_REASON_OUT) fs.writeFileSync(process.env.KIVO_REASON_OUT, JSON.stringify(RESULTS, null, 2)); });

async function readRes(W, ck, key) {
  const g = await W.C.api('/api/operations/read?keys=' + encodeURIComponent(key), { cookie: ck });
  assert.equal(g.status, 200, JSON.stringify(g.j).slice(0, 300));
  return { v: g.j.resources[key], rev: g.j.base[key] };
}
const save = (W, ck, key, v, rev, why) => W.C.api('/api/save', { method: 'POST', cookie: ck, body: Object.assign({
  requestId: 'TEST_ONLY_super_reason_ops_' + (++seq), epoch: Number(W.env.DB.q("SELECT v FROM meta WHERE k='restore_epoch'")[0]?.v || 0),
  set: { [key]: JSON.stringify(v) }, base: { [key]: rev } }, why ? { why: { [key]: why } } : {}) });
const deniedWhy = (r, key) => (r.j && r.j.denied && r.j.denied[key] ? String(r.j.denied[key].why || '') : '');
const savedOk = (r, key, rev) => !!(r.status === 200 && r.j && r.j.revs && r.j.revs[key] > rev && !deniedWhy(r, key));

/* One case: seed(base) builds the «before» value from the fixture value; mut(v) is the change sent; pick(v) is the part that must move. */
async function runCase({ key, res, place, how, seed, mut, pick, reasonOff }) {
  const rk = K(res), W = await world({ worker: WU.file, mode: 'enforce' }), dm = await W.login(...DM);
  const before0 = seed(clone(stored(W.env, rk) || {}));
  const rec = { key, place, how, super: {}, mgrNoReason: {}, mgrReason: {}, note: '' };
  RESULTS.push(rec);
  const attempt = async (ck, why) => {
    await replaceOperationalFixture(W.env, rk, before0);                      /* fresh «before» data for every attempt */
    const was = clone(pick(stored(W.env, rk)));
    const { v, rev } = await readRes(W, ck, rk);
    const zid = W.env.DB.q('SELECT COALESCE(MAX(id),0) AS n FROM authz')[0].n;
    mut(v);
    const r = await save(W, ck, rk, v, rev, why);
    const now = clone(pick(stored(W.env, rk)));
    const rows = W.env.DB.q('SELECT decision, why, reason, keys FROM authz WHERE id > ? AND k = ? ORDER BY id', zid, rk);
    let changed = true; try { assert.deepEqual(now, was); changed = false; } catch (e) {}
    return { r, ok: savedOk(r, rk, rev), changed, why: deniedWhy(r, rk), rows };
  };

  /* 1) super, no reason */
  const s = await attempt(W.su.ck);
  const sRow = s.rows.find((x) => String(x.keys || '').includes(key));
  rec.super = { ok: s.ok, changed: s.changed, status: s.r.status, logged: reasonOff ? 'n-a' : !!(sRow && sRow.reason === NONE_SUPER) };
  if (!s.ok) rec.note = 'BUG: super refused — ' + JSON.stringify(s.r.j).slice(0, 300);
  assert.ok(s.ok, key + ': super without a reason is saved — ' + JSON.stringify(s.r.j).slice(0, 400));
  assert.ok(s.changed, key + ': super — stored data really changed');
  assert.ok(sRow, key + ': the save was classified as this key — authz ' + JSON.stringify(s.rows));
  if (!reasonOff) assert.equal(sRow.reason, NONE_SUPER, key + ': authz row of super carries the «no reason» marker');
  else assert.equal(sRow.reason || '', '', key + ': reason is off — nothing logged as a reason');

  /* 2) unit manager, no reason */
  const m0 = await attempt(dm.ck);
  const m0Row = m0.rows.find((x) => String(x.keys || '').includes(key));
  if (reasonOff) {
    rec.mgrNoReason = { refused: false, why: m0.why, status: m0.r.status };
    rec.note = 'reason switched off for everyone (ENF_REASON_OFF, 057-enf-index.js): manager without a reason is saved';
    assert.ok(m0.ok, key + ': manager without a reason is saved (reason off) — ' + JSON.stringify(m0.r.j).slice(0, 400));
    assert.ok(m0.changed, key + ': manager — stored data really changed');
    assert.ok(m0Row, key + ': manager save classified as this key');
  } else {
    rec.mgrNoReason = { refused: !m0.ok, why: m0.why, status: m0.r.status };
    assert.ok(!m0.ok, key + ': manager without a reason is refused — ' + JSON.stringify(m0.r.j).slice(0, 400));
    assert.equal(m0.why, 'reason', key + ': refused for the missing reason, nothing else');
    assert.ok(!m0.changed, key + ': manager refused — data unchanged');
    assert.ok(m0Row && m0Row.decision !== 'allow' && m0Row.why === 'reason', key + ': denial logged with why=reason — ' + JSON.stringify(m0.rows));
  }

  /* 3) same manager, with a reason */
  const m1 = await attempt(dm.ck, 'TEST_ONLY سبب موثّق');
  rec.mgrReason = { ok: m1.ok, changed: m1.changed, status: m1.r.status };
  assert.ok(m1.ok, key + ': manager with a reason is saved — ' + JSON.stringify(m1.r.j).slice(0, 400));
  assert.ok(m1.changed, key + ': manager with a reason — stored data really changed');
  if (!reasonOff) { const m1Row = m1.rows.find((x) => String(x.keys || '').includes(key)); assert.equal(m1Row && m1Row.reason, 'TEST_ONLY سبب موثّق', key + ': typed reason logged as is'); }
}

const PLAN = 'bassam_plan_v1';
const CASES = [
  { key: 'map.replace', res: PLAN, place: 'POST /api/save · bassam_plan_v1 · floors[0].iid/imgW/imgH',
    how: 'site map image id and size replaced on the live plan site (floors[0]: iid tst_img_a→tst_img_b, imgW/imgH 100→200)',
    seed: (P) => { Object.assign(P.floors[0], { iid: 'tst_img_a', imgW: 100, imgH: 100 }); return P; },
    mut: (P) => { Object.assign(P.floors[0], { iid: 'tst_img_b', imgW: 200, imgH: 200 }); },
    pick: (P) => [P.floors[0].iid, P.floors[0].imgW, P.floors[0].imgH] },
  { key: 'plan.reopen', res: PLAN, place: 'POST /api/save · bassam_plan_v1 · months[<current>].d[0].approved',
    how: 'approved site of the CURRENT month plan reopened (months[' + MON + '].d[0].approved true→false); current month, no period lock in play',
    seed: (P) => { P.months[MON].d[0].approved = true; return P; },
    mut: (P) => { P.months[MON].d[0].approved = false; },
    pick: (P) => !!P.months[MON].d[0].approved },
  { key: 'round.reopen', res: 'bassam_rounds_v1', place: 'POST /api/save · bassam_rounds_v1 · ["<today>"].ap',
    how: 'approved round of TODAY reopened (["' + DAY + '"].ap 1→0); current day, no period lock in play',
    seed: (R) => { R[DAY].ap = 1; return R; },
    mut: (R) => { R[DAY].ap = 0; },
    pick: (R) => !!R[DAY].ap },
  { key: 'report.reopen', res: 'bassam_dreport_v1', place: 'POST /api/save · bassam_dreport_v1 · ["<today>"].shifts[TST-A].ap',
    how: 'approved shift of TODAY daily report reopened (ap/apAt/apBy removed from ["' + DAY + '"].shifts["TST-A"]); current day, no period lock in play',
    seed: (R) => { Object.assign(R[DAY].shifts['TST-A'], { ap: 1, apAt: '1/1', apBy: 'TEST_ONLY' }); return R; },
    mut: (R) => { const s = R[DAY].shifts['TST-A']; delete s.ap; delete s.apAt; delete s.apBy; },
    pick: (R) => !!R[DAY].shifts['TST-A'].ap },
  { key: 'staff.reopen', res: 'bassam_staffing_locks_v1', place: 'POST /api/save · bassam_staffing_locks_v1 · ["<current month>"]',
    how: 'lock of the CURRENT month staffing table removed (["' + MON + '"]: true→absent)',
    seed: (L) => { L[MON] = true; return L; },
    mut: (L) => { delete L[MON]; },
    pick: (L) => (L || {})[MON] === true },
  { key: 'staff.bulk.delete', res: 'bassam_staffing_v3', place: 'POST /api/save · bassam_staffing_v3 · ["<current month>"]',
    how: 'the whole CURRENT month of the staffing table removed (["' + MON + '"] with 10 rows → absent); month not locked',
    seed: (S) => S,
    mut: (S) => { delete S[MON]; },
    pick: (S) => Object.keys((S || {})[MON] || {}).length },
  { key: 'task.month.reopen', res: 'bassam_tasks_locks_v1', sys: 'tasks', place: 'POST /api/save · bassam_tasks_locks_v1 · ["<current month>"]',
    how: 'lock of the CURRENT month of tasks removed (["' + MON + '"]: true→absent)',
    seed: (L) => { L[MON] = true; return L; },
    mut: (L) => { delete L[MON]; },
    pick: (L) => (L || {})[MON] === true },
  { key: 'lens.zones.status.change', res: PLAN, reasonOff: 1, place: 'POST /api/save · bassam_plan_v1 · floors[0].zones[0].fst',
    how: 'field status of a prayer zone changed (floors[0].zones[0].fst →full)',
    seed: (P) => P, mut: (P) => { P.floors[0].zones[0].fst = 'full'; }, pick: (P) => P.floors[0].zones[0].fst || null },
  { key: 'lens.gates.status.change', res: PLAN, reasonOff: 1, place: 'POST /api/save · bassam_plan_v1 · floors[0].gates[0].closed',
    how: 'gate closed (floors[0].gates[0].closed →1)',
    seed: (P) => P, mut: (P) => { P.floors[0].gates[0].closed = 1; }, pick: (P) => P.floors[0].gates[0].closed || null },
  { key: 'lens.marks.status.change', res: PLAN, reasonOff: 1, place: 'POST /api/save · bassam_plan_v1 · floors[0].marks[0].off',
    how: 'landmark switched off (floors[0].marks[0].off →1)',
    seed: (P) => P, mut: (P) => { P.floors[0].marks[0].off = 1; }, pick: (P) => P.floors[0].marks[0].off || null },
  { key: 'lens.paths.status.change', res: PLAN, reasonOff: 1, place: 'POST /api/save · bassam_plan_v1 · floors[0].paths[0].active',
    how: 'path deactivated (floors[0].paths[0].active true→false)',
    seed: (P) => P, mut: (P) => { P.floors[0].paths[0].active = false; }, pick: (P) => !!P.floors[0].paths[0].active },
];

for (const c of CASES) test(c.key + ' — super without a reason · manager without · manager with', c.sys ? needs(c.sys) : {}, () => runCase(c));
