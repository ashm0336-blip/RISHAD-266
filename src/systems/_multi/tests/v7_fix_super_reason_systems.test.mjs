/* The platform admin (role=super) is never asked for a reason — typed systems (dstats · irshad · seized · award).
   Each case sends the real command over HTTP to the real worker (enforce mode, in-memory D1, TEST_ONLY data) three times,
   each in a fresh world: super without a reason · unit manager without a reason · the same manager with a reason.
   The stored rows are read back from the database after every attempt. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { world, seed, D1, IDS, ROOT } from '../../../../tests/unit/irshad_domain_fx.mjs';
import { EKEYS } from '../../../../tests/unit/canonical_fx.mjs';
import { needs, hasSystem } from '../../../../tests/unit/harness.mjs';

const NONE = '';   /* V7 · د6 (QA) · البند ١ (قرارُ المالك): لا سببَ إلزامياً لأحد ولا علامةَ «بلا سبب (مدير المنصة)» — مديرُ الإدارة بلا سبب يُقبل */
const REASON = 'TEST_ONLY reviewed reason';
const SUP = 'super', MGR = 'manager1';
const results = [];
const copy = value => JSON.parse(JSON.stringify(value));
/* worker names used for seeding only; a system's names are requested only when the system is present */
const EXPORTS = ['preOff', 'cuClock']
  .concat(hasSystem('seized') ? ['szConvert', 'szInstallStatements'] : [])
  .concat(hasSystem('award') ? ['awConvert', 'awInstallStatements'] : []);
let serial = 0;

/* Fresh enforce world: super + the manager of D1 (mgr:1), with the typed systems switched on for the unit. */
async function mk() {
  const B = await world({ mode: 'enforce', extraExports: EXPORTS }), perms = copy(B.keys.bassam_perms_v1);
  for (const d of Object.keys(perms.caps)) perms.caps[d] = [...new Set(perms.caps[d].concat('irshad', 'seized', 'award'))];
  await B.DB.batch(B.W.kvPutStmts(B.env, 'kv', 'bassam_perms_v1', JSON.stringify(perms)).concat([
    B.DB.prepare('INSERT INTO revs(k,rev)VALUES(?1,1)ON CONFLICT(k)DO UPDATE SET rev=rev+1').bind('bassam_perms_v1')]));
  B.W.preOff(B.env);
  B.today = B.W.cuClock();
  B.past = B.today.m > 1 ? { y: B.today.y, m: B.today.m - 1 } : { y: B.today.y - 1, m: 12 };
  B.post = (who, route, body) => B.api(who, route, { method: 'POST', body });
  B.n = sql => B.DB.q(sql)[0].n;
  return B;
}
/* the authz row written for an actor on a route (last one) */
const authzRow = (B, who, route) => B.DB.q('SELECT keys,decision,why,reason FROM authz WHERE uid=?1 AND path=?2 ORDER BY id DESC LIMIT 1', IDS[who], route)[0] || null;
const whyOf = j => (j && (j.why || (j.denied && j.denied.why))) || (j && j.err) || '';

/* One case = three attempts. run(B, who, reason) → { r:{status,json}, changed:boolean }. */
async function threeWay({ key, place, how, route, run, note = '' }) {
  const out = { key, place, how, super: null, mgrNoReason: null, mgrReason: null, note };
  /* 1 — super, no reason */
  let B = await mk(), a = await run(B, SUP, '');
  const row = authzRow(B, SUP, route);
  out.super = { ok: a.r.status === 200 && a.r.json?.ok === 1, changed: a.changed, status: a.r.status, logged: row ? (row.reason || '') === NONE : 'n-a' };
  assert.equal(a.r.status, 200, key + ' · super without a reason: ' + JSON.stringify(a.r.json));
  assert.equal(a.r.json.ok, 1);
  assert.equal(a.changed, true, key + ' · super without a reason must really change the stored data');
  assert.ok(row, key + ' · the allowed sensitive decision is written to authz');
  assert.equal(row.decision, 'allow'); assert.ok(row.keys.split(',').includes(key), key + ' is the key decided: ' + row.keys);
  assert.equal(row.reason || '', NONE, key + ' · authz.reason for super without a reason');
  B.DB.db.close();
  /* 2 — unit manager, no reason */
  B = await mk(); a = await run(B, MGR, '');
  out.mgrNoReason = { refused: a.r.status !== 200, why: whyOf(a.r.json), status: a.r.status };
  /* V7 · د6 (QA) · البند ١: كان «يُرفض why=reason» — الآن يُقبل بلا سبب ويتغيّر المخزَّن فعلاً */
  assert.equal(a.r.status, 200, key + ' · manager without a reason is accepted: ' + JSON.stringify(a.r.json));
  assert.notEqual(whyOf(a.r.json), 'reason', JSON.stringify(a.r.json));
  assert.equal(a.changed, true, key + ' · manager without a reason really changes the stored data');
  B.DB.db.close();
  /* 3 — the same manager, with a reason */
  B = await mk(); a = await run(B, MGR, REASON);
  const mrow = authzRow(B, MGR, route);
  out.mgrReason = { ok: a.r.status === 200 && a.r.json?.ok === 1, changed: a.changed, status: a.r.status };
  assert.equal(a.r.status, 200, key + ' · manager with a reason: ' + JSON.stringify(a.r.json));
  assert.equal(a.changed, true, key + ' · manager with a reason must really change the stored data');
  assert.equal(mrow && mrow.reason, REASON, key + ' · the typed reason is what is logged');
  B.DB.db.close();
  results.push(out);
  return out;
}

/* ── daily statistics: reopening a closed day (locks["<site>|y-m"].dshut[d] removed) through POST /api/dstats ── */
for (const site of ['haram', 'nabawi']) {
  test('dstats.' + site + '.reopen — neither super nor the manager is asked for a reason (V7 · د6 QA)', needs('dstats'), async () => {
    await threeWay({
      key: 'dstats.' + site + '.reopen', place: 'POST /api/dstats', route: '/api/dstats',
      how: 'remove locks["' + site + '|y-m"].dshut[today] (reopen a closed day)',
      run: async (B, who, reason) => {
        const lock = site + '|' + B.today.y + '-' + B.today.m, locks = () => B.n('SELECT COUNT(*) n FROM daily_stats_day_locks');
        /* seed: super closes today (an approve, not the case under test) */
        const first = await B.api(SUP, '/api/dstats?uid=' + IDS.super);
        const closed = await B.post(SUP, '/api/dstats', { uid: IDS.super, base: first.json.rev, reason: 'TEST_ONLY seed close',
          data: { haram: {}, nabawi: {}, locks: { [lock]: { dshut: { [B.today.d]: 1 } } } } });
        assert.equal(closed.status, 200, JSON.stringify(closed.json)); assert.equal(locks(), 1, 'the day is closed before the attempt');
        const view = await B.api(who, '/api/dstats?uid=' + IDS[who]);
        assert.equal(view.status, 200); assert.ok(view.json.data.locks[lock], 'the actor sees the closed day');
        const body = { uid: IDS[who], base: view.json.rev, data: { ...view.json.data, locks: {} } };
        if (reason) body.reason = reason;
        const r = await B.post(who, '/api/dstats', body);
        return { r, changed: locks() === 0 };
      },
    });
  });
}

/* ── historical import of daily statistics: operation 'historical-import' on the dstats save — super only ── */
test('sys.histimp.run — super imports without a reason; a manager is refused because the operation is super-only', needs('dstats'), async () => {
  /* the import still obeys the DateRange scope (a far-past day is refused with why 'scope'), so the imported day is today */
  const day = { worshippers: 5 }, days = B => B.n('SELECT COUNT(*) n FROM daily_stats_days');
  const date = B => B.today.y + '-' + String(B.today.m).padStart(2, '0') + '-' + String(B.today.d).padStart(2, '0');
  const send = async (B, who, reason) => {
    const view = await B.api(who, '/api/dstats?uid=' + IDS[who]);
    assert.equal(view.status, 200, JSON.stringify(view.json)); assert.equal(days(B), 0);
    const body = { uid: IDS[who], base: view.json.rev, operation: 'historical-import', data: { haram: { [date(B)]: day }, nabawi: {}, locks: {} } };
    if (reason) body.reason = reason;
    return B.post(who, '/api/dstats', body);
  };
  let B = await mk(), r = await send(B, SUP, '');
  assert.equal(r.status, 200, JSON.stringify(r.json)); assert.equal(r.json.ok, 1);
  assert.equal(days(B), 1, 'the imported day is stored');
  assert.equal(B.DB.q("SELECT worshippers w FROM daily_stats_days WHERE site='haram' AND hijri_date=?1", date(B))[0].w, 5);
  const row = authzRow(B, SUP, '/api/dstats'), aud = B.DB.q("SELECT act,ctx FROM aud WHERE k='bassam_dstats_v1' ORDER BY ts DESC LIMIT 1")[0];
  assert.equal(aud.act, 'import');
  /* real behaviour: the import is decided by the entry key (not sensitive) so no authz row is written; the audit line of the import carries the «no reason» label for super */
  assert.equal(row, null); assert.equal(JSON.parse(aud.ctx).reason || '', NONE);
  const sup = { ok: true, changed: true, status: r.status, logged: (JSON.parse(aud.ctx).reason || '') === NONE };
  const authzSeen = row ? copy(row) : null;
  B.DB.db.close();
  B = await mk(); r = await send(B, MGR, '');
  assert.equal(r.status, 403, JSON.stringify(r.json)); assert.equal(r.json.why, 'super'); assert.equal(days(B), 0);
  const none = { refused: true, why: r.json.why, status: r.status };
  B.DB.db.close();
  B = await mk(); r = await send(B, MGR, REASON);
  assert.equal(r.status, 403, JSON.stringify(r.json)); assert.equal(r.json.why, 'super'); assert.equal(days(B), 0, 'a reason does not open a super-only operation');
  const withReason = { ok: false, changed: false, status: r.status };
  B.DB.db.close();
  results.push({ key: 'sys.histimp.run', place: 'POST /api/dstats', how: "operation:'historical-import' (one day)", super: sup, mgrNoReason: none, mgrReason: withReason,
    note: "super-only operation: a manager is refused with why 'super' with or without a reason (src/systems/dstats/server/020-dstats.js dsDomainCommit). Super without a reason: no authz row (decided key is dstats.haram.entry, not sensitive: " + JSON.stringify(authzSeen) + "); the aud line (act 'import') stores «" + NONE + "». The import still obeys DateRange: a far-past day (1440-01-01) is refused for super with why 'scope'." });
});

/* ── irshad: delete a whole month of reports (two rows ⇒ the bulk key) through POST /api/irshad/act ── */
test('ir.rec.bulk.delete — neither super nor the manager is asked for a reason (V7 · د6 QA)', needs('irshad'), async () => {
  await threeWay({
    key: 'ir.rec.bulk.delete', place: 'POST /api/irshad/act', route: '/api/irshad/act', how: "op:'delete-month' on the current month (2 reports)",
    run: async (B, who, reason) => {
      const row = (id, d) => ({ id, y: B.today.y, m: B.today.m, d, ts: 10, shift: 'TEST_ONLY_shift_A', eid: EKEYS.employee1, name: 'TEST_ONLY snapshot',
        loc: 'TEST_ONLY location', langs: [{ lang: 'TEST_ONLY', count: 1 }], bro: 1, pros: 0, pol: 0 });
      await seed(B, { reports: { reports: [row('TEST_ONLY_ir_1', B.today.d), row('TEST_ONLY_ir_2', B.today.d)] } });
      const count = () => B.n('SELECT COUNT(*) n FROM irshad_reports');
      assert.equal(count(), 2);
      const view = await B.api(who, '/api/irshad?' + new URLSearchParams({ uid: IDS[who], dept: D1, view: 'records', year: B.today.y, month: B.today.m }));
      assert.equal(view.status, 200, JSON.stringify(view.json));
      const body = { uid: IDS[who], dept: D1, requestId: 'TEST_ONLY_ir_month_' + ++serial, base: view.json.base, op: 'delete-month', year: B.today.y, month: B.today.m };
      if (reason) body.reason = reason;
      const r = await B.post(who, '/api/irshad/act', body);
      return { r, changed: count() === 0 };
    },
  });
});

/* ── seized: delete a whole month of records through POST /api/seized/act ── */
test('sz.rec.bulk.delete — neither super nor the manager is asked for a reason (V7 · د6 QA)', needs('seized', 'irshad'), async () => {
  await threeWay({
    key: 'sz.rec.bulk.delete', place: 'POST /api/seized/act', route: '/api/seized/act', how: "op:'delete-month' on the current month (2 records)",
    run: async (B, who, reason) => {
      await B.DB.batch(B.W.szInstallStatements(B.env, B.W.szConvert(D1, {
        catalog: { ver: 1, cats: [{ name: 'TEST_ONLY cash', color: '#123456', items: [{ id: 23, name: 'TEST_ONLY money', unit: 'sar' }] }] },
        actions: [{ k: 'sto', name: 'TEST_ONLY stored' }], locations: ['TEST_ONLY location'], jew: ['TEST_ONLY kind'] })));
      const get = w => B.api(w, '/api/seized?' + new URLSearchParams({ uid: IDS[w], dept: D1, view: 'records', year: B.today.y, month: B.today.m }));
      /* seed: two records created today by super through the same route */
      for (let i = 0; i < 2; i++) {
        const made = await B.post(SUP, '/api/seized/act', { uid: IDS.super, dept: D1, requestId: 'TEST_ONLY_sz_seed_' + ++serial, base: (await get(SUP)).json.base, op: 'create', reason: 'TEST_ONLY seed',
          data: { ...B.today, loc: 'TEST_ONLY location', no: 'TEST_ONLY document ' + i, note: '', items: [{ id: 23, n: 100, val: 0, act: 'sto', kind: '', kindTxt: '', photos: [] }] } });
        assert.equal(made.status, 200, JSON.stringify(made.json));
      }
      const count = () => B.n('SELECT COUNT(*) n FROM seized_reports');
      assert.equal(count(), 2);
      const view = await get(who); assert.equal(view.status, 200, JSON.stringify(view.json));
      const body = { uid: IDS[who], dept: D1, requestId: 'TEST_ONLY_sz_month_' + ++serial, base: view.json.base, op: 'delete-month', year: B.today.y, month: B.today.m };
      if (reason) body.reason = reason;
      const r = await B.post(who, '/api/seized/act', body);
      return { r, changed: count() === 0 };
    },
  });
});

/* ── retro window: POST /api/retro {act:'open'} on the previous (closed) month — reason in body.reason ── */
for (const [sys, key, table] of [['irshad', 'ir.rec.retro.open', 'irshad_retro_windows'], ['seized', 'sz.rec.retro.open', 'seized_retro_windows']]) {
  test(key + ' — neither super nor the manager is asked for a reason (V7 · د6 QA)', needs(sys), async () => {
    const out = await threeWay({
      key, place: 'POST /api/retro', route: '/api/retro', how: "act:'open' res:'" + sys + "' scope = previous month, 1 hour",
      run: async (B, who, reason) => {
        const count = () => B.n('SELECT COUNT(*) n FROM ' + table);
        assert.equal(count(), 0);
        const body = { res: sys, dept: D1, act: 'open', scope: { y: B.past.y, m: B.past.m }, hours: 1 };
        if (reason) body.reason = reason;
        const r = await B.post(who, '/api/retro', body);
        if (r.status === 200) {
          const w = B.DB.q('SELECT reason,reason_missing FROM ' + table)[0];
          assert.equal(w.reason || '', reason ? REASON : NONE, 'the stored window carries the logged reason (V7 · د6 (QA): empty when none was typed)');
          assert.equal(Number(w.reason_missing), reason ? 0 : 1);
        }
        return { r, changed: count() === 1 };
      },
    });
    assert.equal(out.mgrNoReason.status, 200, 'V7 · د6 (QA) · البند ١: the retro route opens without a reason (was 400 err:reason)');
    out.note = 'V7 · د6 (QA): no reason is required (workers/parts/047-retro.js); a window opened without one stores an empty reason and reasonMissing=1';
  });
}

/* ── award: move a record to «مستبعد» through POST /api/award/act ── */
const awardRecord = (st = 'قيد التحكيم') => ({ id: 'TEST_ONLY_award', ekey: EKEYS.employee1, cat: 'emp', hij: '1448-1-2', score: 85, cases: 3, fileOk: null, ok: true, st,
  comp: '1', declName: 'TEST_ONLY', by: 'TEST_ONLY', byTitle: 'TEST_ONLY', wdesc: 'TEST_ONLY', wevid: 'TEST_ONLY', pic: '', sigEmp: '', sigBy: null, caseTxt: [], ans: [], scores: [] });
async function awardStatus(B, who, status, reason, st) {
  await B.DB.batch(B.W.awInstallStatements(B.env, B.W.awConvert(D1, { records: { recs: [awardRecord(st)] } })));
  const view = await B.api(who, '/api/award?' + new URLSearchParams({ uid: IDS[who], dept: D1, view: 'context' }));
  assert.equal(view.status, 200, JSON.stringify(view.json));
  const body = { uid: IDS[who], dept: D1, requestId: 'TEST_ONLY_aw_status_' + ++serial, base: view.json.base, op: 'status', id: 'TEST_ONLY_award', status };
  if (reason) body.reason = reason;
  const r = await B.post(who, '/api/award/act', body), rec = await B.api(SUP, '/api/award?' + new URLSearchParams({ uid: IDS.super, dept: D1, view: 'record', id: 'TEST_ONLY_award' }));
  return { r, st: rec.json.record.st };
}
test('award.res.reject — neither super nor the manager is asked for a reason (V7 · د6 QA)', needs('award'), async () => {
  await threeWay({
    key: 'award.res.reject', place: 'POST /api/award/act', route: '/api/award/act', how: "op:'status' قيد التحكيم → مستبعد",
    run: async (B, who, reason) => { const a = await awardStatus(B, who, 'مستبعد', reason); return { r: a.r, changed: a.st === 'مستبعد' }; },
  });
});

/* ── award.res.reopen: reserved in the registry — there is no live operation to exempt ── */
test('award.res.reopen — reserved key: no live operation (a return to «قيد التحكيم» is refused for everyone, reason or not)', needs('award'), async () => {
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/permissions/registry/registry-v24.9.json'), 'utf8'));
  let entry = null;
  (function walk(o) { if (!o || typeof o !== 'object') return; if (!Array.isArray(o) && o.key === 'award.res.reopen') entry = o; for (const v of Object.values(o)) walk(v); })(registry);
  assert.ok(entry, 'the key is in the registry');
  assert.equal(entry.status, 'reserved'); assert.equal(entry.grant, 'none'); assert.equal(entry.guard.kind, 'none');
  /* the real route agrees: «معتمد» → «قيد التحكيم» is refused even for super with a reason — not a reason question */
  const seen = {};
  for (const [who, reason] of [[SUP, ''], [SUP, REASON], [MGR, REASON]]) {
    const B = await mk(), a = await awardStatus(B, who, 'قيد التحكيم', reason, 'معتمد');
    assert.equal(a.r.status, 403, JSON.stringify(a.r.json)); assert.notEqual(whyOf(a.r.json), 'reason'); assert.equal(a.st, 'معتمد');
    seen[who + (reason ? '+reason' : '')] = whyOf(a.r.json);
    B.DB.db.close();
  }
  results.push({ key: 'award.res.reopen', place: 'n-a (POST /api/award/act refuses the transition)', how: 'registry status + op:status معتمد → قيد التحكيم',
    super: { ok: false, changed: false, status: 403, logged: 'n-a' }, mgrNoReason: { refused: true, why: seen[MGR + '+reason'], status: 403 }, mgrReason: { ok: false, changed: false, status: 403 },
    note: 'reserved: no live operation (registry status=reserved, grant=none); the back-transition is refused for all with why ' + JSON.stringify(seen) });
});

test('write the recorded outcomes', () => {
  const expected = ['dstats.haram.reopen', 'dstats.nabawi.reopen', 'sys.histimp.run', 'ir.rec.bulk.delete', 'sz.rec.bulk.delete', 'ir.rec.retro.open', 'sz.rec.retro.open', 'award.res.reject', 'award.res.reopen'];
  if (hasSystem('dstats', 'irshad', 'seized', 'award')) assert.deepEqual(results.map(r => r.key).sort(), expected.sort());
  if (process.env.KIVO_REASON_OUT) fs.writeFileSync(process.env.KIVO_REASON_OUT, JSON.stringify(results, null, 2));
});
