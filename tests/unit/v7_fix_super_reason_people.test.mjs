/* V7 fix — the platform admin (role=super) is never asked for a reason: tasks and employees.
   Each key runs a REAL change over HTTP on the real worker in enforce mode, three times on a fresh world:
     super without a reason            => accepted, stored data changes, authz row carries «بلا سبب (مدير المنصة)»
     unit manager without a reason     => refused (why: reason), stored data unchanged
     the same manager with a reason    => accepted, stored data changes
   Keys: task.reopen · task.bulk.delete · emp.record.bulk.delete · import.replace. Synthetic data only (TEST_ONLY).
   V7 · د6 (QA) · البند ١ (قرارُ المالك): لا سببَ إلزامياً لأحد — مديرُ الإدارة بلا سبب يُقبل الآن (كان: يُرفض why=reason)، ومديرُ المنصة
   لا يُكتب له «بلا سبب (مدير المنصة)» بل حقلُ سببٍ فارغ؛ السببُ إن كُتب يُسجَّل كما هو. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { needs } from './harness.mjs';
import { world as tasksWorld, workerUnderTest, ME, MATE, D, DAY, T, TAG, stored, taskCommandBody, operationSaveBody, replaceOperationalFixture } from './world_fx.mjs';
import { world as canonWorld, D1, IDS } from './canonical_fx.mjs';
import { inspectOperationalFixture } from './operational_legacy_seed_fx.mjs';

const NONE = '';   /* V7 · د6 (QA) · البند ١: لا علامةَ «بلا سبب (مدير المنصة)» */
const WHY = TAG + ' سببٌ مكتوب';
const results = [];
const rec = (key, place, how) => { const r = { key, place, how, super: {}, mgrNoReason: {}, mgrReason: {}, note: '' }; results.push(r); return r; };
test.after(() => { if (process.env.KIVO_REASON_OUT) fs.writeFileSync(process.env.KIVO_REASON_OUT, JSON.stringify(results, null, 2)); });

/* ───────── tasks (world_fx · unit tst_d1 · manager tst_dm1) ───────── */
const WU = workerUnderTest();
const KT = 'bsdept:' + D + ':bassam_tasks_v1';
const DM = ['0000000101', '70101'];
const post = (W, ck, p, body) => W.C.api(p, { method: 'POST', cookie: ck, body: operationSaveBody(W.env, p, taskCommandBody(W.env, p, body)) });
const authzOf = (DB, k, uid) => DB.q('SELECT keys, decision, why, reason FROM authz WHERE k = ? AND uid = ? ORDER BY id', k, uid);
async function taskWorld(who) {
  const W = await tasksWorld({ worker: WU.file, mode: 'enforce' }), dm = await W.login(...DM);
  return { W, ck: who === 'super' ? W.su.ck : dm.ck, uid: who === 'super' ? 'su' : 'tst_dm1' };
}

/* task.reopen — POST /api/tasks/reopen on a task its employee has just finished */
const RID = 1760000000103;
const taskRow = (W) => stored(W.env, KT)[DAY].find((r) => Array.isArray(r) && r[13] === RID && r[14] === ME.eid);
const reopened = (W) => W.env.DB.q("SELECT aft FROM aud WHERE k = ? AND act = 'reopened'", KT);
async function reopen(who, why) {
  const X = await taskWorld(who), me = await X.W.login(ME.un, ME.pw);
  const f = await post(X.W, me.ck, '/api/me/tasks/act', { k: DAY, id: RID, act: 'finish', note: TAG + ' done' });
  assert.equal(f.j && f.j.ok, 1, 'employee finished: ' + JSON.stringify(f.j)); assert.equal(taskRow(X.W)[3], 'done');
  const r = await post(X.W, X.ck, '/api/tasks/reopen', Object.assign({ k: DAY, id: RID, ekey: ME.eid }, who === 'super' ? { dept: D } : {}, why ? { why } : {}));
  return Object.assign(X, { r });
}
test('task.reopen — super without a reason reopens · manager without is refused · manager with a reason reopens', needs('tasks'), async () => {
  const R = rec('task.reopen', 'POST /api/tasks/reopen', 'employee finishes a task (done), then it is reopened (done => in_progress)');
  {
    const { W, r, uid } = await reopen('super', '');
    const changed = taskRow(W)[3] === 'in_progress' && taskRow(W)[12] == null, z = authzOf(W.env.DB, KT, uid).filter((q) => /task\.reopen/.test(q.keys));
    R.super = { ok: r.status === 200 && r.j.ok === 1, changed, status: r.status, logged: z.length === 1 && (z[0].reason || '') === NONE };
    assert.equal(r.status, 200, JSON.stringify(r.j)); assert.equal(r.j.ok, 1);
    assert.equal(taskRow(W)[3], 'in_progress', 'stored row is in progress again'); assert.equal(taskRow(W)[12], null, 'finish time cleared');
    assert.equal(reopened(W).length, 1, 'one «reopened» audit event');
    assert.equal(z.length, 1, JSON.stringify(z)); assert.equal(z[0].decision, 'allow'); assert.equal(z[0].reason || '', NONE);
  }
  {
    const { W, r, uid } = await reopen('manager', '');
    R.mgrNoReason = { refused: !(r.status === 200 && r.j.ok === 1), why: String(r.j.why || ''), status: r.status };
    assert.equal(r.status, 200, JSON.stringify(r.j)); assert.equal(r.j.ok, 1, 'V7 · د6 (QA): بلا سبب يُقبل');
    assert.equal(taskRow(W)[3], 'in_progress', 'reopened'); assert.equal(reopened(W).length, 1);
    const z = authzOf(W.env.DB, KT, uid).filter((q) => /task\.reopen/.test(q.keys));
    assert.equal(z.length, 1); assert.equal(z[0].decision, 'allow'); assert.equal(z[0].reason || '', '');
  }
  {
    const { W, r, uid } = await reopen('manager', WHY);
    const changed = taskRow(W)[3] === 'in_progress';
    R.mgrReason = { ok: r.status === 200 && r.j.ok === 1, changed, status: r.status };
    assert.equal(r.status, 200, JSON.stringify(r.j)); assert.equal(taskRow(W)[3], 'in_progress');
    assert.equal(JSON.parse(reopened(W)[0].aft).why, WHY, 'typed reason in the audit event');
    const z = authzOf(W.env.DB, KT, uid).filter((q) => /task\.reopen/.test(q.keys));
    assert.equal(z[0].reason, WHY);
  }
});

/* task.bulk.delete — the month delete is a save of the tasks store with every row of that month removed (two rows or more => task.bulk.delete).
   Rows with activity cannot be removed by anyone (018b task-del), so the month deleted here holds untouched pending rows only. */
const NM = T.m === 12 ? { y: T.y + 1, m: 1 } : { y: T.y, m: T.m + 1 }, YM = NM.y + '-' + NM.m;
const monthRows = (W) => { const S = stored(W.env, KT); let n = 0; for (const d in S) if (d.startsWith(YM + '-')) n += S[d].length; return n; };
const allRows = (W) => { const S = stored(W.env, KT); let n = 0; for (const d in S) n += S[d].length; return n; };
function pendingRow(id, eid, t) {
  return [TAG + ' next month ' + id, '', 'normal', 'pending', 'normal', 'مضافة', null, ['T'], TAG + ' · ' + eid, TAG + ' · manager', 60, null, null, id, eid, t, t + 36e5, null, null, null, null, null];
}
async function bulkDelete(who, why) {
  const X = await taskWorld(who), W = X.W, S0 = stored(W.env, KT), t = Date.now() + 40 * 864e5;
  for (const d of Object.keys(S0)) if (d.startsWith(YM + '-')) delete S0[d];
  S0[YM + '-12'] = [pendingRow(1760000088001, ME.eid, t), pendingRow(1760000088002, MATE.eid, t)];
  S0[YM + '-14'] = [pendingRow(1760000088003, ME.eid, t)];
  await replaceOperationalFixture(W.env, KT, S0);
  assert.equal(monthRows(W), 3, 'three rows in the month before the delete');
  const total = allRows(W);
  const g = await W.C.api('/api/operations/read?keys=' + encodeURIComponent(KT), { cookie: X.ck });
  assert.equal(g.status, 200, JSON.stringify(g.j).slice(0, 200));
  const S = g.j.resources[KT]; for (const d of Object.keys(S)) if (d.startsWith(YM + '-')) delete S[d];
  const r = await post(W, X.ck, '/api/save', Object.assign({ set: { [KT]: JSON.stringify(S) }, del: [], base: { [KT]: g.j.base[KT] } }, why ? { why: { [KT]: why } } : {}));
  return Object.assign(X, { r, total });
}
test('task.bulk.delete — super without a reason deletes the month · manager without is refused · manager with a reason deletes', needs('tasks'), async () => {
  const R = rec('task.bulk.delete', 'POST /api/save (tasks store, all rows of a month removed)', 'three pending rows seeded in next month, then every row of that month removed in one save');
  R.note = 'no dedicated route: the month delete is a tasks-store save classified task.bulk.delete (two removed rows or more); rows with activity are refused for everyone with task-del (018b), so the deleted month holds pending rows only';
  {
    const { W, r, uid, total } = await bulkDelete('super', '');
    const z = authzOf(W.env.DB, KT, uid).filter((q) => q.keys === 'task.bulk.delete');
    R.super = { ok: r.status === 200 && r.j.ok === 1, changed: monthRows(W) === 0, status: r.status, logged: z.length === 1 && (z[0].reason || '') === NONE };
    assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 300)); assert.equal(r.j.ok, 1);
    assert.equal(monthRows(W), 0, 'month is empty in storage'); assert.equal(allRows(W), total - 3, 'only that month went');
    assert.equal(z.length, 1, JSON.stringify(z)); assert.equal(z[0].decision, 'allow'); assert.equal(z[0].reason || '', NONE);
  }
  {
    const { W, r, uid, total } = await bulkDelete('manager', '');
    const d = (r.j.denied || {})[KT] || {};
    R.mgrNoReason = { refused: r.j.ok === 0 && !!d.why, why: String(d.why || ''), status: r.status };
    assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 300)); assert.equal(d.why, undefined, 'V7 · د6 (QA): بلا سبب يُقبل');
    assert.equal(monthRows(W), 0, 'month removed'); assert.equal(allRows(W), total - 3);
    const z = authzOf(W.env.DB, KT, uid).filter((q) => q.keys === 'task.bulk.delete');
    assert.equal(z.length, 1); assert.equal(z[0].decision, 'allow'); assert.equal(z[0].reason || '', '');
  }
  {
    const { W, r, uid, total } = await bulkDelete('manager', WHY);
    R.mgrReason = { ok: r.status === 200 && r.j.ok === 1, changed: monthRows(W) === 0, status: r.status };
    assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 300)); assert.equal(monthRows(W), 0); assert.equal(allRows(W), total - 3);
    const z = authzOf(W.env.DB, KT, uid).filter((q) => q.keys === 'task.bulk.delete');
    assert.equal(z[0].reason, WHY);
  }
});

/* ───────── employees (canonical_fx · unit D1 · manager1) — POST /api/employees/transition ───────── */
const EK = 'bsdept:' + D1 + ':bassam_employees_v1', DK = 'bsdept:' + D1 + ':bassam_dreport_v1';
let rq = 0;
async function transition(who, intent, shape, reason, seed) {
  const f = await canonWorld({ mode: 'enforce' });
  if (seed) await seed(f);
  const before = inspectOperationalFixture(f.env, EK);
  const ctx = await f.api(who, '/api/employees/transition?dept=' + D1 + '&intent=' + intent);
  assert.equal(ctx.status, 200, JSON.stringify(ctx.json));
  const body = Object.assign({ uid: IDS[who], dept: D1, intent, requestId: 'TEST_ONLY_super_reason_' + (++rq), base: ctx.json.base }, shape(ctx.json), reason ? { reason } : {});
  const r = await f.api(who, '/api/employees/transition', { method: 'POST', body });
  return { f, r, before, after: inspectOperationalFixture(f.env, EK), z: authzOf(f.DB, EK, IDS[who]) };
}
const eids = (L) => L.map((e) => e.eid);

for (const [label, shape, left] of [
  ['delete all', () => ({ deleteMode: 'all', finalRows: [] }), 0],
  ['delete several selected', (c) => ({ deleteMode: 'selected', finalRows: c.employees.slice(2) }), 2],
]) {
  test('emp.record.bulk.delete (' + label + ') — super without a reason deletes · manager without is refused · manager with a reason deletes', async () => {
    const R = rec('emp.record.bulk.delete', 'POST /api/employees/transition (intent delete · ' + label + ')', 'unit of four employees: ' + (left ? 'two removed, two kept' : 'all four removed'));
    {
      const { r, before, after, z } = await transition('super', 'delete', shape, '');
      R.super = { ok: r.status === 200 && r.json.ok === 1, changed: after.length === left && before.length === 4, status: r.status, logged: z.length === 1 && (z[0].reason || '') === NONE };
      assert.equal(r.status, 200, JSON.stringify(r.json).slice(0, 300)); assert.equal(r.json.ok, 1);
      assert.equal(before.length, 4); assert.equal(after.length, left, 'stored employees after the delete');
      assert.deepEqual(eids(after), eids(before).slice(4 - left)); assert.equal(r.json.counts.removed, 4 - left);
      assert.equal(z.length, 1, JSON.stringify(z)); assert.equal(z[0].keys, 'emp.record.bulk.delete'); assert.equal(z[0].decision, 'allow'); assert.equal(z[0].reason || '', NONE);
    }
    {
      const { r, before, after, z } = await transition('manager1', 'delete', shape, '');
      const d = ((r.json || {}).denied || {})[EK] || {};
      R.mgrNoReason = { refused: !(r.status === 200 && r.json.ok === 1), why: String(d.why || ''), status: r.status };
      assert.equal(r.status, 200, JSON.stringify(r.json).slice(0, 300)); assert.equal(r.json.ok, 1, 'V7 · د6 (QA): بلا سبب يُقبل');
      assert.equal(after.length, left); assert.equal(before.length, 4);
      assert.equal(z[0].decision, 'allow'); assert.equal(z[0].reason || '', '');
    }
    {
      const { r, before, after, z } = await transition('manager1', 'delete', shape, WHY);
      R.mgrReason = { ok: r.status === 200 && r.json.ok === 1, changed: after.length === left && before.length === 4, status: r.status };
      assert.equal(r.status, 200, JSON.stringify(r.json).slice(0, 300)); assert.equal(after.length, left);
      assert.equal(z[0].decision, 'allow'); assert.equal(z[0].reason, WHY);
    }
  });
}

/* import.replace — employee import with mode 'replace': the four stored employees are replaced by one new record and the daily report
   of the unit (one day seeded) is emptied by the same commit. */
const NEW = { eid: 'TEST_ONLY_new_1', name: 'TEST_ONLY new one' };
const replaceShape = () => ({ finalRows: [NEW], import: { mode: 'replace', year: T.y, month: T.m, schedule: [] } });
const seedReport = (f) => replaceOperationalFixture(f.env, DK, { [DAY]: { created: 1, shifts: {} } });
const reportDays = (f) => Object.keys(inspectOperationalFixture(f.env, DK) || {}).length;
test('import.replace — super without a reason replaces · manager without is refused · manager with a reason replaces', async () => {
  const R = rec('import.replace', 'POST /api/employees/transition (intent import · import.mode replace)', 'four employees replaced by one new record; the seeded daily-report day is emptied by the same commit');
  R.note = 'import.replace is checked as a held key before the save (019c-employee-transition.js:548); the reason of a replace is demanded by the save decision under the co-key emp.record.bulk.delete (reasonKeys = [emp.record.bulk.delete], decided keys emp.record.bulk.delete,emp.record.create,import.run) — import.replace itself is not among the decided keys on this route';
  {
    const { f, r, before, after, z } = await transition('super', 'import', replaceShape, '', seedReport);
    const changed = after.length === 1 && after[0].eid === NEW.eid && reportDays(f) === 0;
    R.super = { ok: r.status === 200 && r.json.ok === 1, changed, status: r.status, logged: z.length === 1 && (z[0].reason || '') === NONE };
    assert.equal(r.status, 200, JSON.stringify(r.json).slice(0, 300)); assert.equal(r.json.ok, 1);
    assert.equal(before.length, 4); assert.deepEqual(after, [NEW], 'stored employees are the imported ones only');
    assert.equal(reportDays(f), 0, 'daily report emptied'); assert.equal(r.json.counts.removed, 4);
    assert.equal(z.length, 1, JSON.stringify(z)); assert.match(z[0].keys, /emp\.record\.bulk\.delete/); assert.match(z[0].keys, /import\.run/);
    assert.equal(z[0].decision, 'allow'); assert.equal(z[0].reason || '', NONE);
  }
  {
    const { f, r, before, after, z } = await transition('manager1', 'import', replaceShape, '', seedReport);
    const d = ((r.json || {}).denied || {})[EK] || {};
    R.mgrNoReason = { refused: !(r.status === 200 && r.json.ok === 1), why: String(d.why || ''), status: r.status };
    assert.equal(r.status, 200, JSON.stringify(r.json).slice(0, 300)); assert.equal(r.json.ok, 1, 'V7 · د6 (QA): بلا سبب يُقبل');
    assert.deepEqual(after, [NEW]); assert.equal(reportDays(f), 0);
    assert.equal(z[0].decision, 'allow'); assert.equal(z[0].reason || '', '');
  }
  {
    const { f, r, after, z } = await transition('manager1', 'import', replaceShape, WHY, seedReport);
    const changed = after.length === 1 && after[0].eid === NEW.eid && reportDays(f) === 0;
    R.mgrReason = { ok: r.status === 200 && r.json.ok === 1, changed, status: r.status };
    assert.equal(r.status, 200, JSON.stringify(r.json).slice(0, 300)); assert.deepEqual(after, [NEW]); assert.equal(reportDays(f), 0);
    assert.equal(z[0].decision, 'allow'); assert.equal(z[0].reason, WHY);
  }
});
