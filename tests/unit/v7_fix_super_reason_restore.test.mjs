/* V7 fix — the platform admin (role=super) is never asked for a reason: restore paths.
   Real worker (canonical parts), enforce mode, in-memory D1, TEST_ONLY synthetic data. Every case sends real HTTP requests,
   each actor on a fresh world, and reads the stored value back from the database.
   Cases: backup.restore (unit restore, /api/backup/restore) · sys.restore.full (full restore, super only) ·
   place 019d «restore-reason» · place 062 «missingReason» (/api/save restore marker) · place 062 historical-import reason (audHist).
   Each case records its real outcome first and asserts afterwards, so the JSON in KIVO_REASON_OUT is written whatever the verdict. */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { needs } from './harness.mjs';
import { world } from './atomic_restore_review_fx.mjs';
import { D1, IDS, EKEYS } from './notifications_review_fx.mjs';

const NONE = '';   /* V7 · د6 (QA) · البند ١ (قرارُ المالك): لا سببَ إلزامياً لأحد ولا علامةَ «بلا سبب (مدير المنصة)» — مديرُ الإدارة بلا سبب يُقبل */
/* V7 · د5-ح: كان K سجلَّ القوالب bassam_perm_tpls_v1 (أُسقط من النسخ الاحتياطية وحُذف كاتبُه) — مكانه موردُ KV عاديّ للإدارة بسقف admin/backup، يُبذر في fresh */
const K = 'bsdept:' + D1 + ':bassam_last_export_v1', GK = 'bsdept:' + D1 + ':bassam_grants_v1';
const ALL = needs('award', 'custody', 'dstats', 'irshad', 'seized');   /* the restore file carries every domain */
const GRANT = JSON.stringify({ v: 1, emp: { [EKEYS.manager1]: { plus: ['backup.restore'], minus: [] } } });
const tpl = (mark) => JSON.stringify([{ id: 'TEST_ONLY_supervisory_template', name: 'TEST_ONLY restored by ' + mark, sup: true }]);
const kv = (B, k) => B.DB.q('SELECT v FROM kv WHERE k=?1 ORDER BY seq', k).map((r) => r.v).join('') || null;
const authz = (B) => B.DB.q('SELECT uid,k,keys,decision,why,reason,path FROM authz ORDER BY id');
const results = [];
after(() => { if (process.env.KIVO_REASON_OUT) fs.writeFileSync(process.env.KIVO_REASON_OUT, JSON.stringify(results, null, 2)); });

/* a fresh world where the manager of unit 1 explicitly holds backup.restore (the key is not granted by the mgr flag alone) */
async function fresh() {
  const B = await world();
  await B.DB.batch(B.W.kvPutStmts(B.env, 'kv', GK, GRANT));
  await B.DB.batch(B.W.kvPutStmts(B.env, 'kv', K, tpl('seed')).concat([B.DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,1) ON CONFLICT(k) DO UPDATE SET rev=1').bind(K)]));   /* V7 · د5-ح: بذرُ المورد البديل */
  return B;
}
/* one restore through POST /api/backup/restore: the file differs from the stored data in one KV value (the template name) */
async function restoreOnce(who, kind, reason) {
  const B = await fresh(), before = kv(B, K), want = tpl(who + '/' + kind);
  assert.notEqual(before, want, 'the file really differs from the stored data');
  const body = await B.body({ scope: kind === 'full' ? { kind } : { kind, departmentId: D1 }, keys: kind === 'full' ? { [K]: want } : { [K]: want, [GK]: GRANT }, reason });
  const r = await B.restore(body, who), now = kv(B, K);
  return { B, r, status: r.status, ok: r.status === 200 && r.json && r.json.ok === 1, err: (r.json && r.json.err) || '', changed: now === want, unchanged: now === before,
    logged: authz(B).some((x) => x.uid === IDS[who] && x.k === K && x.decision === 'allow' && (x.reason || '') === NONE),
    audReason: (B.DB.q("SELECT ctx FROM aud WHERE k='atomic_restore'").map((x) => JSON.parse(x.ctx).reason))[0] };
}
const BUG_CUSTODY = 'BUG: super with an empty reason is refused 400 err custody-text at src/systems/custody/server/019b4-custody-restore.js:4 ' +
  '(cuPlanRestore: cuString(opt.reason, 300, false)) — 019d line 954 lets the empty reason through, the custody domain plan (always part of a restore file) refuses it';
const superNote = (s) => (s.ok ? '' : s.err === 'custody-text' ? BUG_CUSTODY : 'BUG: super refused with err ' + s.err);

test('backup.restore — unit restore through /api/backup/restore: super without a reason · manager without · manager with', ALL, async () => {
  const s = await restoreOnce('super', 'dept', ''), m0 = await restoreOnce('manager1', 'dept', ''), m1 = await restoreOnce('manager1', 'dept', 'TEST_ONLY rollback after a bad import');
  results.push({ key: 'backup.restore', place: '019d rsPrepare (unit restore)', how: 'POST /api/backup/restore scope dept, mode replace, file changes one KV value',
    super: { ok: s.ok, changed: s.changed, status: s.status, logged: s.logged, err: s.err },
    mgrNoReason: { refused: !m0.ok, why: m0.err, status: m0.status }, mgrReason: { ok: m1.ok, changed: m1.changed, status: m1.status },
    note: [superNote(s), 'this route answers a missing reason with HTTP 400 err restore-reason (not why reason)'].filter(Boolean).join(' · ') });
  /* V7 · د6 (QA): كان 400 restore-reason — الآن يُستعاد بلا سبب */
  assert.ok(m0.ok, JSON.stringify(m0.r.json)); assert.ok(m0.changed, 'manager without a reason: the stored value is the file value');
  assert.ok(m1.ok, JSON.stringify(m1.r.json)); assert.ok(m1.changed, 'manager with a reason: the stored value is the file value');
  assert.equal(m1.audReason, 'TEST_ONLY rollback after a bad import');
  assert.ok(s.ok, 'super without a reason must succeed: ' + s.status + ' ' + JSON.stringify(s.r.json));
  assert.ok(s.changed, 'super without a reason: the stored value is the file value');
  assert.ok(s.logged, 'authz row of super: empty reason'); assert.equal(s.audReason || '', NONE);
});

test('sys.restore.full — full restore is super only: super without a reason succeeds · a manager is refused whatever the reason', ALL, async () => {
  const s = await restoreOnce('super', 'full', ''), m0 = await restoreOnce('manager1', 'full', ''), m1 = await restoreOnce('manager1', 'full', 'TEST_ONLY full rollback');
  results.push({ key: 'sys.restore.full', place: '019d rsPrepare (full restore)', how: 'POST /api/backup/restore scope full, mode replace, file changes one KV value',
    super: { ok: s.ok, changed: s.changed, status: s.status, logged: s.logged, err: s.err },
    mgrNoReason: { refused: !m0.ok, why: m0.err, status: m0.status }, mgrReason: { ok: m1.ok, changed: m1.changed, status: m1.status, why: m1.err },
    note: [superNote(s), 'full restore is super-only: a manager with a reason gets 403 restore-policy; without a reason the reason check comes first (400 restore-reason)'].filter(Boolean).join(' · ') });
  assert.equal(m0.status, 403); assert.equal(m0.err, 'restore-policy'); assert.ok(m0.unchanged);   /* V7 · د6 (QA): بلا فحص سبب يصل حكمُ «لمدير المنصة وحده» مباشرة */
  assert.equal(m1.status, 403); assert.equal(m1.err, 'restore-policy'); assert.ok(m1.unchanged, 'manager full restore: data unchanged');
  assert.ok(s.ok, 'super full restore without a reason must succeed: ' + s.status + ' ' + JSON.stringify(s.r.json));
  assert.ok(s.changed, 'super full restore: the stored value is the file value');
  assert.equal(s.audReason || '', NONE);
});

test('place 019d «restore-reason» — V7 · د6 (QA): empty reason passes for everyone; 301 characters is refused for everyone', ALL, async () => {
  const long = 'س'.repeat(301), edge = 'س'.repeat(300);
  const s = await restoreOnce('super', 'dept', ''), sBlank = await restoreOnce('super', 'dept', '   '), m0 = await restoreOnce('manager1', 'dept', ''), mBlank = await restoreOnce('manager1', 'dept', '   '),
    sLong = await restoreOnce('super', 'dept', long), mLong = await restoreOnce('manager1', 'dept', long), mEdge = await restoreOnce('manager1', 'dept', edge);
  results.push({ key: 'backup.restore', place: '019d restore-reason (workers/parts/019d-atomic-restore.js:954)', how: 'POST /api/backup/restore scope dept with reason "" / 301 chars / 300 chars',
    super: { ok: s.ok, changed: s.changed, status: s.status, logged: s.logged, err: s.err, passedReasonCheck: s.err !== 'restore-reason', len301: { status: sLong.status, err: sLong.err } },
    mgrNoReason: { refused: !m0.ok, why: m0.err, status: m0.status, len301: { status: mLong.status, err: mLong.err } },
    mgrReason: { ok: mEdge.ok, changed: mEdge.changed, status: mEdge.status, reasonLength: 300 },
    note: [superNote(s), 'the 019d check itself lets the empty reason of super through (err is not restore-reason)'].filter(Boolean).join(' · ') });
  assert.notEqual(s.err, 'restore-reason', 'super with an empty reason passes the 019d check'); assert.notEqual(sBlank.err, 'restore-reason');
  assert.ok(m0.ok && m0.changed, 'manager, empty reason: accepted'); assert.ok(mBlank.ok && mBlank.changed, 'manager, blank reason: accepted');
  for (const x of [sLong, mLong]) { assert.equal(x.status, 400); assert.equal(x.err, 'restore-reason'); assert.ok(x.unchanged, 'refused: data unchanged'); }
  assert.ok(mEdge.ok && mEdge.changed, 'a 300-character reason is accepted: ' + JSON.stringify(mEdge.r.json));
});

/* one generic save carrying a backup.restore marker (ops) on a plain KV unit key — the legacy restore shape, still served by /api/save */
async function markerSave(who, marker, extra = {}) {
  const B = await fresh(), before = kv(B, K), want = tpl(who + '/marker');
  const r = await B.api(who, '/api/save', { set: { [K]: want }, del: [], base: { [K]: B.DB.q('SELECT rev FROM revs WHERE k=?1', K)[0].rev },
    ops: { [K]: { op: 'backup.restore', scope: 'dept', mode: 'replace', ...marker } }, ...extra });
  const d = ((r.json && r.json.denied) || {})[K] || null, now = kv(B, K);
  return { B, r, d, status: r.status, ok: r.status === 200 && !d && !!((r.json.revs || {})[K]), changed: now === want, unchanged: now === before, rows: authz(B) };
}
test('place 062 «missingReason» — V7 · د6 (QA): /api/save with a backup.restore marker: super and manager write without a reason · with one it is logged', async () => {
  const s = await markerSave('super', {}), m0 = await markerSave('manager1', {}), m1 = await markerSave('manager1', { reason: 'TEST_ONLY marker reason' }), m2 = await markerSave('manager1', {}, { why: { [K]: 'TEST_ONLY why map' } });
  const logged = s.rows.some((x) => x.uid === IDS.super && x.k === K && x.decision === 'allow' && (x.reason || '') === NONE);
  results.push({ key: 'backup.restore', place: '062 missingReason (workers/parts/062-enf-save.js:59)', how: 'POST /api/save, set of a plain KV unit key with ops {op: backup.restore, scope: dept}',
    super: { ok: s.ok, changed: s.changed, status: s.status, logged },
    mgrNoReason: { refused: !!m0.d, why: m0.d && m0.d.why, status: m0.status, reasonKeys: m0.d && m0.d.reasonKeys },
    mgrReason: { ok: m1.ok, changed: m1.changed, status: m1.status },
    note: 'the line is reachable over HTTP; /api/save answers 200 with denied[key].why = reason (per-key refusal); the reason is taken from the marker or from body.why' });
  assert.ok(s.ok, JSON.stringify(s.r.json)); assert.ok(s.changed, 'super without a reason: stored value changed'); assert.ok(logged, 'authz row carries the no-reason label: ' + JSON.stringify(s.rows));
  assert.ok(m0.ok && m0.changed, 'V7 · د6 (QA): manager without a reason writes: ' + JSON.stringify(m0.r.json));
  assert.ok(!m0.rows.some((x) => x.why === 'reason'), 'no reason refusal logged');
  assert.ok(m1.ok && m1.changed, JSON.stringify(m1.r.json)); assert.ok(m1.rows.some((x) => x.decision === 'allow' && x.reason === 'TEST_ONLY marker reason'));
  assert.ok(m2.ok && m2.changed, 'reason from body.why: ' + JSON.stringify(m2.r.json));
});

test('place 062 historical-import reason (audHist) — not reachable through /api/save; reached through /api/dstats: super without a reason imports', needs('dstats'), async () => {
  /* (1) /api/save: the import event is accepted only for a key of the request, and a request naming bassam_dstats_v1 is stopped earlier (domain-moved) */
  const ev = [{ cid: 'cTESTONLYhist1', k: 'bassam_dstats_v1', etype: 'dataset', act: 'import', eid: 'daily-stats' }];
  const B1 = await fresh(), before1 = kv(B1, K);
  const moved = await B1.api('super', '/api/save', { set: { [K]: tpl('hist'), bassam_dstats_v1: '{}' }, del: [], base: { [K]: 1 }, aud: ev });
  assert.equal(moved.json.atomic, 'domain-moved'); assert.equal(moved.json.denied.bassam_dstats_v1.why, 'domain-moved'); assert.equal(kv(B1, K), before1, 'the whole batch is stopped');
  /* an event for a key outside the request is dropped (052 audClean): were audHist set, a manager would get why super — he does not */
  const dropped = await markerSave('manager1', { reason: 'TEST_ONLY marker reason' }, { aud: ev });
  assert.ok(dropped.ok && dropped.changed, 'the foreign import event does not turn the save into a historical import: ' + JSON.stringify(dropped.r.json));
  /* (2) the branch itself: POST /api/dstats operation historical-import (020 dsDomainCommit passes historical to enfSavePrep) */
  const rows = (B) => B.DB.q('SELECT site,greg_date,worshippers FROM daily_stats_days');
  const data = { haram: { '2199-01-01': { worshippers: 5 } }, nabawi: {}, locks: {} };
  const imp = async (who, reason) => { const B = await fresh(), g = await B.api(who, '/api/dstats'); assert.equal(g.status, 200); assert.deepEqual(rows(B), []);
    const r = await B.api(who, '/api/dstats', { uid: IDS[who], base: g.json.rev, data, operation: 'historical-import', ...(reason === undefined ? {} : { reason }) });
    return { B, r, status: r.status, ok: r.status === 200 && r.json.ok === 1, changed: rows(B).length === 1 && rows(B)[0].worshippers === 5, rows: authz(B) }; };
  const s = await imp('super', ''), sNone = await imp('super', undefined), m0 = await imp('manager1', ''), m1 = await imp('manager1', 'TEST_ONLY import');
  const row = s.rows.filter((x) => x.uid === IDS.super && x.k === 'bassam_dstats_v1');
  const audCtx = s.B.DB.q("SELECT ctx FROM aud WHERE k='bassam_dstats_v1' AND act='import'").map((x) => JSON.parse(x.ctx).reason)[0];
  results.push({ key: 'sys.histimp.run', place: '062 historical import reason (workers/parts/062-enf-save.js:63-65, audHist)', how: 'POST /api/dstats operation historical-import (the /api/save aud path is closed: domain-moved)',
    super: { ok: s.ok, changed: s.changed, status: s.status, logged: row.length ? row.some((x) => x.reason === NONE) : 'n-a', audCtxReason: audCtx },
    mgrNoReason: { refused: !m0.ok, why: m0.r.json.why, status: m0.status }, mgrReason: { ok: m1.ok, changed: m1.changed, status: m1.status, why: m1.r.json.why },
    note: 'super-only operation: a manager is refused 403 why super with or without a reason. Not reachable through /api/save any more: 054 applySave returns domain-moved for bassam_dstats_v1 before enfSavePrep, and 052 audClean drops an event whose key is not in the request. ' +
      'An allowed import writes no authz row (enfLogRow logs an allow only for a sensitive key or a required reason); the aud row of the import keeps the typed reason as is (empty for super without one)' });
  assert.ok(s.ok, JSON.stringify(s.r.json)); assert.ok(s.changed, 'super without a reason: the day row is stored'); assert.ok(sNone.ok && sNone.changed, 'reason field absent');
  for (const m of [m0, m1]) { assert.equal(m.status, 403); assert.equal(m.r.json.why, 'super'); assert.deepEqual(rows(m.B), [], 'manager: nothing stored'); }
});
