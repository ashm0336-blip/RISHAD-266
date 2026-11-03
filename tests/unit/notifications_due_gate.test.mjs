/* RISHAD-266 · owner decision (h) 2026-11-03: the notification summary must not run the costly due jobs (nfIrshadDaily ·
   nfSeizedDue) on every GET /api/notifications. A shared, time-bounded gate (019 nfDueRun, tkg:ird|szd:<dept> in meta) runs
   each job at most once per department per bounded interval; due reminders are never lost (a due edge always reopens the gate,
   late source data is picked up within NF_DUE_GAP) and never duplicated (the jobs' once keys are unchanged).
   Real canonical Worker + SQLite, fixed synthetic clocks (no wall-clock dependence), TEST_ONLY data only. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, seizedDocs, D1, clone } from './business_atomic_fx.mjs';
import { canonicalWorker } from './notifications_review_fx.mjs';

const GAP = 5 * 6e4;                                   /* NF_DUE_GAP */
const COSTLY = /seized_items|seized_reports|irshad_reports|FROM ops_|notification_dedup/;
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
  const read = async (who = 'super', W) => {
    const t0 = B.DB.trips, l0 = B.DB.log.length;
    const headers = new Headers({ Cookie: 'bs_tok=TEST_ONLY_session_' + who });
    const r = W
      ? await W.default.fetch(new Request('http://x/api/notifications?dept=' + D1 + '&summary=1', { headers }), B.env)
      : await B.api(who, '/api/notifications?dept=' + D1 + '&summary=1');
    const status = r.status;
    const sql = B.DB.log.slice(l0).map(String),
      /* the once-a-minute session heartbeat (054 sessGet: UPDATE sess SET la, deferred with waitUntil on Cloudflare) is
         session upkeep, not the summary; this shim has no waitUntil, so it is counted apart, never hidden */
      touch = sql.filter((s) => /^UPDATE sess SET la = \?2 WHERE tok = \?1$/.test(s.trim())).length;
    return { status, trips: B.DB.trips - t0 - touch, touch, costly: sql.filter((s) => COSTLY.test(s)).length };
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
    assert.match(stamp(B), /^\d+:\d+:0$/, 'the job left a shared stamp (from:until:epoch)');
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

test('outside the due windows the summary does not touch the gate at all', async () => {
  const T = at('2026-10-28T00:00:00Z');                 /* Wednesday 03:00 Riyadh */
  await clock(T, async () => {
    const B = await fixture({ now: T });
    const l0 = B.DB.log.length;
    for (let i = 0; i < 3; i++) assert.ok((await B.read()).trips <= 7);
    assert.equal(B.DB.log.slice(l0).some((s) => /tkg:|FROM meta WHERE k IN \(SELECT value/.test(String(s))), false);
    assert.equal(stamp(B), undefined);
  });
});
