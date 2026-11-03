/* RISHAD-266 · owner decision (h) 2026-11-03: the notification summary must not run the costly due jobs (nfIrshadDaily ·
   nfSeizedDue) on every GET /api/notifications. A shared, time-bounded gate (019 nfDueRun, tkg:ird|szd:<dept> in meta) runs
   each job at most once per department per bounded interval; due reminders are never lost (a due edge always reopens the gate,
   late source data is picked up within NF_DUE_GAP, and data landing in the final NF_DUE_GAP before the window closes at Riyadh
   midnight is caught up once after the close) and never duplicated (the jobs' once keys are unchanged).
   Production path: every read passes an execution context (ctx.waitUntil, as Cloudflare does); the due job runs after the feed,
   off the read's critical path, and the read's own D1 trips are measured up to the moment the job is handed to waitUntil.
   Real canonical Worker + SQLite, fixed synthetic clocks (no wall-clock dependence), TEST_ONLY data only. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, seizedDocs, D1, clone } from './business_atomic_fx.mjs';
import { canonicalWorker } from './notifications_review_fx.mjs';
import { candidateWorker } from './irshad_domain_fx.mjs';

const GAP = 5 * 6e4;                                   /* NF_DUE_GAP */
const COSTLY = /seized_items|seized_reports|irshad_reports|FROM ops_|notification_dedup/;
/* the due jobs' own statements (019j · 019n): their source tables and their once-key dedup probes */
const JOB = /seized_items|seized_reports|irshad_reports|FROM notification_dedup WHERE scope=\?1 AND once_key/;
const TOUCH = /^UPDATE sess SET la = \?2 WHERE tok = \?1$/;
const at = (iso) => Date.parse(iso);
async function clock(start, fn) {
  const RealDate = globalThis.Date, box = { now: start };
  globalThis.Date = class extends RealDate {
    constructor(...a) { super(...(a.length ? a : [box.now])); }
    static now() { return box.now; }
  };
  try { await fn((v) => { box.now = typeof v === 'number' ? v : RealDate.parse(v); }); }
  finally { globalThis.Date = RealDate; }
}
async function fixture({ items = true, weekly = true, ageDays = 40, now } = {}) {
  const B = await world({ schema: 10 });
  if (weekly) await B.DB.prepare("INSERT INTO notification_type_overrides(type_id,enabled)VALUES('bx_wk',1)").run();
  if (items) {
    const docs = seizedDocs('due_gate');
    docs.reports.reports[0].ts = now - ageDays * 864e5;
    docs.reports.reports[0].items[0].n = 3;
    docs.reports.reports[0].items[0].val = 1200;
    await B.install('seized', D1, docs);
  }
  /* one summary read through the canonical Worker. ctx (default) = the production execution context: waitUntil promises are
     collected and settled before the helper returns, so the next read sees the job's effects. The read's own cost ends where
     the due job is handed to waitUntil (nothing of the read touches D1 after that); the once-a-minute session heartbeat
     (054 sessGet: UPDATE sess SET la, also deferred with waitUntil) is session upkeep, counted apart, never hidden. */
  const read = async (who = 'super', W = B.canonicalW, { ctx = true } = {}) => {
    const t0 = B.DB.trips, l0 = B.DB.log.length, calls = [];
    const ec = { waitUntil(p) { calls.push({ trips: B.DB.trips, log: B.DB.log.length, p }); } };
    const headers = new Headers({ Cookie: 'bs_tok=TEST_ONLY_session_' + who });
    const r = await W.default.fetch(new Request('http://x/api/notifications?dept=' + D1 + '&summary=1', { headers }), B.env, ctx ? ec : undefined);
    const status = r.status, end = B.DB.trips, endLog = B.DB.log.length;
    await Promise.all(calls.map((c) => c.p));
    const job = calls.filter((c) => !TOUCH.test(String(B.DB.log[c.log - 1] || '').trim())).at(-1),
      readSql = B.DB.log.slice(l0, job ? job.log : endLog).map(String),
      sql = B.DB.log.slice(l0).map(String),
      touch = readSql.filter((s) => TOUCH.test(s.trim())).length;
    if (ctx) assert.equal(readSql.filter((s) => JOB.test(s)).length, 0, 'the due job never runs on the read\'s critical path');
    return { status, trips: (job ? job.trips : end) - t0 - touch, touch, deferred: !!job, costly: sql.filter((s) => COSTLY.test(s)).length, seized: sql.filter((s) => /seized_items|seized_reports/.test(s)).length };
  };
  return { ...B, read };
}
const bx = (B) => clone(B.DB.q("SELECT type,scope FROM notification_messages WHERE type IN('bx_old','bx_wk') ORDER BY type"));
const bxOnce = (B) => B.DB.q("SELECT once_key FROM notification_dedup WHERE once_key LIKE 'bx_%' ORDER BY once_key").map((r) => r.once_key);
const stamp = (B) => B.DB.q("SELECT v FROM meta WHERE k=?", 'tkg:szd:' + D1)[0]?.v;

test('repeated reads inside the interval never re-run the costly due work and stay within the seven-trip summary budget', async () => {
  const T = at('2026-10-28T09:00:00Z');                 /* Wednesday 12:00 Riyadh — bx_old window, nothing old enough to report */
  await clock(T, async (set) => {
    const B = await fixture({ ageDays: 2, now: T });
    const first = await B.read();
    assert.equal(first.status, 200);
    assert.ok(first.costly > 0, 'control: the first eligible read runs the due job');
    assert.match(stamp(B), /^\d+:\d+:0:0$/, 'the job left a shared stamp (from:until:epoch:settled)');
    assert.ok(first.deferred && first.trips <= 7, 'the job ran after the read, which itself costs ' + first.trips + ' trips');
    for (let i = 1; i <= 20; i++) {
      set(T + i * 1e4);                                  /* 20 reads over 200 s, all inside NF_DUE_GAP */
      const r = await B.read();
      assert.equal(r.status, 200);
      assert.equal(r.costly, 0, 'read ' + i + ' did not re-run the job');
      assert.ok(r.trips <= 7, 'read ' + i + ': the accepted Super summary budget is seven D1 trips: ' + r.trips);
    }
    /* another isolate (fresh module memory) shares the stamp: still no job and no extra trip — the stamp is read in the
       retired-source trip */
    const W2 = await canonicalWorker();
    await W2.default.fetch(new Request('http://x/api/ping'), B.env);          /* its own cold init, not measured */
    const cold = await B.read('super', W2);
    assert.equal(cold.costly, 0, 'a cold isolate honours the shared stamp');
    assert.ok(cold.trips <= 7, 'cold isolate: ' + cold.trips + ' trips');
    /* the interval is bounded: once it elapses the job runs exactly once more, then holds again */
    set(T + GAP + 1000);
    assert.ok((await B.read()).costly > 0, 'after NF_DUE_GAP the job is re-checked');
    set(T + GAP + 2000);
    const again = await B.read();
    assert.equal(again.costly, 0);
    assert.ok(again.trips <= 7, again.trips);
    /* a restore epoch change invalidates every stamp */
    B.DB.exec("UPDATE meta SET v='1' WHERE k='restore_epoch'");
    set(T + GAP + 3000);
    assert.ok((await B.read()).costly > 0, 'a new restore epoch re-opens the gate');
    assert.equal(bx(B).length, 0, 'nothing was due, nothing was emitted');
  });
});

test('a due reminder is emitted exactly once across many reads, and a due edge re-opens a settled gate at once', async () => {
  const T = at('2026-10-31T05:58:00Z');                 /* Saturday 08:58 Riyadh: only the weekly summary is due */
  await clock(T, async (set) => {
    const B = await fixture({ now: T });
    assert.equal((await B.read()).status, 200);
    assert.deepEqual(bx(B).map((r) => r.type), ['bx_wk']);
    set(T + 6e4);                                        /* 08:59 — settled, held until the 09:00 edge */
    assert.equal((await B.read()).costly, 0);
    set(at('2026-10-31T06:00:01Z'));                     /* 09:00:01 — bx_old is due now; the first read after it emits */
    await B.read();
    assert.deepEqual(bx(B).map((r) => r.type), ['bx_old', 'bx_wk'], 'emitted on the first eligible read after its due time');
    for (let i = 1; i <= 30; i++) {                      /* 30 reads spread over 10 hours (inside the 12 h session): never a second message */
      set(at('2026-10-31T06:00:01Z') + i * 20 * 6e4);
      const r = await B.read();
      assert.equal(r.status, 200, 'read ' + i);
      assert.ok(r.trips <= 7, 'settled for the day: read ' + i + ' costs ' + r.trips + ' trips');
    }
    assert.deepEqual(bx(B).map((r) => r.type), ['bx_old', 'bx_wk']);
    assert.equal(bxOnce(B).length, 2, 'one once key per reminder');
  });
});

test('source data arriving after a check is reported within the interval bound, once', async () => {
  const T = at('2026-10-28T07:00:00Z');                 /* Wednesday 10:00 Riyadh */
  await clock(T, async (set) => {
    const B = await fixture({ items: false, now: T });
    assert.ok((await B.read()).costly > 0);
    assert.equal(bx(B).length, 0);
    const docs = seizedDocs('late');
    docs.reports.reports[0].ts = T - 40 * 864e5;
    docs.reports.reports[0].items[0].n = 4;
    await B.install('seized', D1, docs);
    set(T + 6e4);
    assert.equal((await B.read()).costly, 0, 'bounded: inside the interval the old check holds');
    set(T + GAP);
    await B.read();
    assert.deepEqual(bx(B).map((r) => r.type), ['bx_old'], 'not lost: reported on the first read after the interval');
    for (let i = 1; i <= 10; i++) { set(T + GAP + i * GAP); await B.read(); }
    assert.equal(bx(B).length, 1, 'never duplicated');
  });
});

test('a reader who cannot run the job leaves no stamp, so it never suppresses a manager reminder', async () => {
  const T = at('2026-10-28T07:00:00Z');
  await clock(T, async () => {
    const B = await fixture({ now: T });
    for (const who of ['employee1', 'manager2']) assert.ok((await B.read(who)).status < 500, who);
    assert.equal(stamp(B), undefined, 'no stamp from a reader outside the job');
    assert.equal(bx(B).length, 0);
    await B.read('super');
    assert.deepEqual(bx(B).map((r) => r.type), ['bx_old']);
  });
});

test('outside the due windows the summary never runs a due job or writes a stamp, and the gate costs no extra trip', async () => {
  const T = at('2026-10-28T00:00:00Z');                 /* Wednesday 03:00 Riyadh */
  await clock(T, async () => {
    const B = await fixture({ now: T });
    const l0 = B.DB.log.length, reads = [];
    for (let i = 0; i < 3; i++) reads.push(await B.read());
    for (const r of reads) { assert.equal(r.status, 200); assert.ok(r.trips <= 7, String(r.trips)); assert.equal(r.costly, 0); assert.equal(r.deferred, false); }
    const sql = B.DB.log.slice(l0).map(String);
    /* the catch-up check only needs yesterday's stamp: read once per isolate, inside the retired-source trip (same trip count) */
    assert.equal(sql.filter((s) => /FROM meta WHERE k IN \(SELECT value/.test(s)).length, 1, 'the warm isolate remembers the quiet gate');
    assert.equal(reads[0].trips, reads[1].trips, 'reading the stamps adds no D1 trip');
    assert.equal(sql.some((s) => /tkg:|INSERT INTO meta/.test(s)), false, 'no stamp write');
    assert.equal(stamp(B), undefined);
  });
});

test('without an execution context the job still runs inline (local tools), within the same gate', async () => {
  const T = at('2026-10-28T07:00:00Z');                 /* Wednesday 10:00 Riyadh */
  await clock(T, async (set) => {
    const B = await fixture({ now: T });
    const r = await B.read('super', undefined, { ctx: false });
    assert.equal(r.status, 200);
    assert.equal(r.deferred, false);
    assert.ok(r.costly > 0);
    assert.deepEqual(bx(B).map((x) => x.type), ['bx_old'], 'emitted before the response');
    set(T + 6e4);
    assert.equal((await B.read('super', undefined, { ctx: false })).costly, 0, 'settled: held');
  });
});

/* review finding (A): an empty check in the final NF_DUE_GAP before midnight held the gate up to the close, and the next day
   uses another once key — late data in 23:55–24:00 Riyadh was never reported. The first eligible run after the close now
   re-checks the closed window once, at its close instant, under the same once key. */
const MIDNIGHT = at('2026-10-30T21:00:00Z');            /* Saturday 00:00 Riyadh (Friday's windows close) */
test('irshad daily: a report landing in the final interval before midnight is caught up once after the close', async () => {
  await clock(MIDNIGHT - 4 * 6e4, async (set) => {      /* Friday 23:56 Riyadh */
    const B = await fixture({ items: false, now: MIDNIGHT });
    const H = await candidateWorker(['pfHijriAt']), day = H.pfHijriAt(MIDNIGHT - 4 * 6e4);
    const perms = clone(B.keys.bassam_perms_v1);
    Object.keys(perms.caps).forEach((d) => { if (!perms.caps[d].includes('irshad')) perms.caps[d].push('irshad'); });
    await B.put('bassam_perms_v1', perms);
    const ir = () => B.DB.q("SELECT m.type,d.once_key FROM notification_messages m JOIN notification_dedup d ON d.scope=m.scope AND d.message_id=m.id WHERE m.type='ir_day'").map((r) => r.once_key);
    const first = await B.read();
    assert.ok(first.deferred && first.costly > 0 && first.trips <= 7, 'control: 23:56 checks Friday (nothing yet)');
    assert.deepEqual(ir(), []);
    assert.match(B.DB.q('SELECT v FROM meta WHERE k=?', 'tkg:ird:' + D1)[0].v, new RegExp('^\\d+:' + MIDNIGHT + ':0:0$'), 'unsettled, held up to the close');
    set(MIDNIGHT - 2 * 6e4);                             /* 23:58: the late report lands */
    const report = { id: 'TEST_ONLY_late_daily', y: day.y, m: day.m, d: day.d, shift: 'TEST_ONLY_shift', loc: 'TEST_ONLY_late_location', langs: [{ lang: 'TEST_ONLY', count: 1 }] };
    await B.DB.batch(B.W.irInstallStatements(B.env, B.W.irConvert(D1, { reports: { reports: [report] } })));
    assert.equal((await B.read()).costly, 0, 'still inside the hold');
    set(MIDNIGHT - 2e4);                                 /* 23:59:40 */
    assert.equal((await B.read()).costly, 0);
    set(MIDNIGHT + 3e4);                                 /* Saturday 00:00:30: first eligible read after the close */
    const caught = await B.read();
    assert.equal(caught.status, 200);
    assert.ok(caught.deferred && caught.trips <= 7, 'the catch-up runs off the read path: ' + caught.trips);
    assert.deepEqual(ir(), ['ir_day:' + day.dk], 'exactly one reminder, under Friday\'s once key');
    for (const t of [MIDNIGHT + 6e4, MIDNIGHT + 10 * 6e4, MIDNIGHT + 3600000, MIDNIGHT + 2.5 * 3600000]) {
      set(t);
      const r = await B.read();
      assert.equal(r.status, 200);
      assert.equal(r.costly, 0, 'the catch-up is done once');
      assert.ok(r.trips <= 7, String(r.trips));
    }
    const W2 = await canonicalWorker();
    await W2.default.fetch(new Request('http://x/api/ping'), B.env);
    assert.equal((await B.read('super', W2)).costly, 0, 'a cold isolate does not catch up again');
    assert.deepEqual(ir(), ['ir_day:' + day.dk], 'never duplicated');
  });
});

test('seized due: stock landing in the final interval before midnight is caught up once after the close', async () => {
  const CLOSE = at('2026-10-28T21:00:00Z');             /* Thursday 00:00 Riyadh (Wednesday's window closes) */
  await clock(CLOSE - 4 * 6e4, async (set) => {         /* Wednesday 23:56 Riyadh */
    const B = await fixture({ items: false, now: CLOSE });
    const H = await candidateWorker(['pfHijriAt']), day = H.pfHijriAt(CLOSE - 4 * 6e4);
    const first = await B.read();
    assert.ok(first.deferred && first.costly > 0 && first.trips <= 7, 'control: 23:56 checks Wednesday (nothing old yet)');
    assert.equal(bx(B).length, 0);
    assert.match(stamp(B), new RegExp('^\\d+:' + CLOSE + ':0:0$'), 'unsettled, held up to the close');
    set(CLOSE - 2 * 6e4);                                /* 23:58: old stock is recorded */
    const docs = seizedDocs('late_close');
    docs.reports.reports[0].ts = CLOSE - 40 * 864e5;
    docs.reports.reports[0].items[0].n = 2;
    await B.install('seized', D1, docs);
    assert.equal((await B.read()).costly, 0, 'still inside the hold');
    set(CLOSE + 3e4);                                    /* Thursday 00:00:30 */
    const caught = await B.read();
    assert.ok(caught.deferred && caught.trips <= 7, 'the catch-up runs off the read path: ' + caught.trips);
    assert.deepEqual(bxOnce(B), ['bx_old:' + day.y + '-' + day.m + '-' + day.d], 'exactly one reminder, under Wednesday\'s once key');
    for (const t of [CLOSE + 6e4, CLOSE + 30 * 6e4, CLOSE + 2 * 3600000, CLOSE + 3.5 * 3600000, CLOSE + 5 * 3600000]) {   /* until 05:00 Riyadh, before Thursday's own window */
      set(t);
      const r = await B.read();
      assert.equal(r.costly, 0, 'the catch-up is done once');
      assert.ok(r.trips <= 7, String(r.trips));
    }
    const W2 = await canonicalWorker();
    await W2.default.fetch(new Request('http://x/api/ping'), B.env);
    assert.equal((await B.read('super', W2)).costly, 0, 'a cold isolate does not catch up again');
    assert.equal(bx(B).length, 1, 'never duplicated');
  });
});

test('a window settled through its close is not re-checked after midnight', async () => {
  const CLOSE = at('2026-10-28T21:00:00Z');
  await clock(CLOSE - 10 * 6e4, async (set) => {        /* Wednesday 23:50 Riyadh: bx_old due and emitted */
    const B = await fixture({ now: CLOSE });
    await B.read();
    assert.deepEqual(bx(B).map((r) => r.type), ['bx_old']);
    assert.match(stamp(B), new RegExp('^\\d+:' + CLOSE + ':0:1$'), 'settled through the close');
    set(CLOSE + 3e4);
    const r = await B.read();
    assert.equal(r.seized, 0, 'nothing to catch up for the settled Seized window');
    assert.equal(bx(B).length, 1);
  });
});
