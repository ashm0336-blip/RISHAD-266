/* V7-F · the independent review, finding 5 — the cost of the sweep on every write.
   Before (68cfa6a): EVERY accepted write selected candidates by a full scan of imgown, then ran one deciding statement PER candidate, each scanning the
   whole kv table; the admin's overview awaited 40 of them inline; nothing indexed the selection.
   Now: an ordinary write runs ONE statement for the sweep (a compare-and-set on a primary-key row of the rate-limit table `guard`); a pass runs at most once per 10 minutes for the
   whole platform; a pass with no candidate reads no kv value; all candidates of a pass are decided in ONE statement; the selection is a range scan of
   the index imgown (st, ts), created by the first pass (no operator step); the admin's overview never waits for the pass; a platform reset stays far
   under the 1000-subrequest limit of one invocation. Real worker, legacy and enforce. The `# COST` lines are the measurements quoted in the report
   (run this file with KIVO_WORKER pointing at another build to measure it). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEST_SUPER_PIN } from './harness.mjs';
import { D2, PNG, TAG, both, scene, state, gone, edit, upload, age, due } from './v7_f_img_fx.mjs';

let n = 0;
const typedSave = async (T) => { const s = await edit(T.W, T.S.mgr2, D2, 'plan', (v) => { v.floors[0].name = TAG + ' cost ' + (++n); }); assert.ok(s.ok, 'typed save ' + JSON.stringify(s.j).slice(0, 200)); return s; };
/* the SAVE request alone (its read is done before the window opens) */
async function measured(T) {
  const { W, S } = T, DB = W.env.DB, k = 'bsdept:' + D2 + ':bassam_plan_v1';
  const g = await W.C.api('/api/operations/read?keys=' + encodeURIComponent(k), { cookie: S.mgr2 }); const v = g.j.resources[k]; v.floors[0].name = TAG + ' cost ' + (++n);
  const fx = await import('./tasks_fx.mjs'), p = '/api/save', body = { set: { [k]: JSON.stringify(v) }, del: [], base: { [k]: g.j.base[k] }, why: { [k]: TAG + ' cost' } };
  const payload = fx.operationSaveBody(W.env, p, fx.taskCommandBody(W.env, p, body));
  const l0 = DB.log.length, t0 = DB.trips, c0 = performance.now();
  const r = await W.C.api(p, { method: 'POST', cookie: S.mgr2, body: payload }); assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 200));
  const sql = DB.log.slice(l0);
  return { ms: performance.now() - c0, statements: sql.length, trips: DB.trips - t0, sql,
    kvScans: sql.filter((s) => /instr\((?:kv\.)?v, /.test(s) && /\bkv\b/.test(s)).length, selects: sql.filter((s) => /FROM imgown WHERE \(?st = '(?:orphan|dead|claim)'/.test(s)).length };
}
/* every statement the sweep can issue; the compare-and-set binds its key, so it is known by its shape */
const CAS = /INTO guard \(gk, n, until\) VALUES \(\?1, \?2, \?4\) ON CONFLICT\(gk\) DO UPDATE SET n = excluded\.n, until = excluded\.until WHERE guard\.n <= \?3 RETURNING n/;
const SWEEP = new RegExp(CAS.source + "|imgown_st_ts|FROM imgown WHERE \\(?st = |UPDATE imgown SET st = 'dead'|'stage'|FROM ops_nodes WHERE \\(department_id, resource\\) >");

both(test, 'finding 5 · an ordinary write costs the sweep ONE statement (the 10-minute compare-and-set) — no candidate selection, no kv scan', async (mode) => {
  const T = await scene(mode); due(T.W);
  await typedSave(T);                                                        /* the pass of this 10 minutes */
  const idle = await measured(T), mine = idle.sql.filter((s) => SWEEP.test(s));
  assert.equal(mine.length, 1, 'one statement · ' + JSON.stringify(mine)); assert.match(mine[0], CAS);
  assert.equal(idle.selects, 0, 'no candidate selection'); assert.equal(idle.kvScans, 0, 'no kv scan');
});

both(test, 'finding 5 · a pass with no candidate reads no kv value; a pass with 6 candidates decides them all in ONE statement; the selection uses the index imgown (st, ts)', async (mode) => {
  const T = await scene(mode), { W, S, id } = T;
  due(W); const empty = await measured(T);
  assert.ok(empty.selects >= 1, 'the pass did run'); assert.equal(empty.kvScans, 0, 'nothing to prove ⇒ kv is not read');
  const idx = W.env.DB.q("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'imgown'").map((r) => r.name);
  assert.ok(idx.includes('imgown_st_ts'), 'the first pass created the index · ' + JSON.stringify(idx));
  for (const st of ['orphan', 'claim', 'dead', 'stage']) {
    const plan = W.env.DB.db.prepare("EXPLAIN QUERY PLAN SELECT img, st, ts FROM imgown WHERE st = '" + st + "' AND ts < 5 ORDER BY ts LIMIT 6").all().map((r) => r.detail).join(' | ');
    assert.match(plan, /USING (?:COVERING )?INDEX imgown_st_ts \(st=\? AND ts<\?\)/, st + ': ' + plan); assert.doesNotMatch(plan, /TEMP B-TREE/, 'and needs no sort');
  }
  const ids = []; for (let k = 0; k < 6; k++) { const i = id('c' + k); await upload(W, S.mgr2, i); age(W, i, 31); ids.push(i); }
  const six = await measured(T);
  /* two kv-reading statements in a pass with work — the escape count (054 imgEscHold, once per pass: zero here, so nothing more is read) and the ONE deciding statement */
  assert.equal(six.sql.filter((s) => /UPDATE imgown SET st = 'dead'/.test(s)).length, 1, 'one deciding statement for the whole batch');
  assert.equal(six.kvScans, 2, 'the escape count and the deciding statement · ' + six.kvScans);
  for (const i of ids) assert.ok(gone(await state(W, i)), 'and all six are swept');
});

both(test, 'finding 5 · the admin overview never waits for the pass: with waitUntil the answer comes while the pass is still running', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, i = id('ov'); await upload(W, S.mgr2, i); age(W, i, 31);
  /* the overview's statements run fenced (052 dbGuard: each one is a batch with the schema guard) — the pass is held at its candidate selection */
  const DB = W.env.DB, batch = DB.batch.bind(DB); let release, held = 0; const gate = new Promise((r) => { release = r; });
  DB.batch = async (stmts) => { if (stmts.some((q) => /FROM imgown WHERE \(?st = 'orphan' AND ts </.test(String(q.sql)))) { held++; await gate; } return batch(stmts); };
  const waits = [], req = new Request('http://x/api/overview', { headers: { cookie: S.super } });
  try {
    const res = await Promise.race([W.env.__worker.fetch(req, W.env, { waitUntil: (p) => { waits.push(p); } }), new Promise((r) => setTimeout(() => r(null), 5000))]);
    assert.ok(res, 'the overview answered while the pass was held'); assert.equal(res.status, 200);
    assert.equal(waits.length >= 1, true, 'the pass was handed to waitUntil');
    for (let k = 0; k < 200 && !held; k++) await new Promise((r) => setTimeout(r, 5));
    assert.equal(held, 1, 'the pass is running, held at its selection'); assert.equal((await state(W, i)).st, 'claim', 'and has not finished');
    release(); await Promise.all(waits);
    assert.ok(gone(await state(W, i)), 'the pass finishes after the response');
  } finally { release(); DB.batch = batch; }
});

both(test, 'finding 5 · a platform reset over 1200 R2 images: the reset invocation stays under 1000 subrequests; the following passes finish the rest', async (mode) => {
  const T = await scene(mode), { W, S } = T, DB = W.env.DB, R2 = W.env.IMG_R2, N = 1200;
  DB.db.exec('BEGIN'); const own = DB.db.prepare("INSERT INTO imgown (img, st, k, uid, dept, ts) VALUES (?, 'claim', '', 'tst_dm2', ?, ?)"), body = DB.db.prepare("INSERT INTO imgs (k, seq, v) VALUES (?, 0, '~r2~')");
  for (let k = 0; k < N; k++) { const i = 'img_v7fr' + T.x + '_' + k.toString(36); own.run(i, D2, Date.now()); body.run(i); await R2.put('img/' + i, PNG); }
  DB.db.exec('COMMIT');
  const rk = await W.C.api('/api/recovery/new', { method: 'POST', cookie: S.super, body: { pw: TEST_SUPER_PIN } }); assert.ok(rk.j.key, JSON.stringify(rk.j));
  let r2calls = 0; const del = R2.delete.bind(R2); R2.delete = async (k) => { r2calls++; return del(k); };
  const t0 = DB.trips, c0 = performance.now();
  const rs = await W.C.api('/api/reset', { method: 'POST', cookie: S.super, body: { pw: TEST_SUPER_PIN, key: rk.j.key, confirm: 'تهيئة', admin: { un: '0500000178', name: TAG + ' reset', pw: '583928' } } });
  assert.equal(rs.status, 200, JSON.stringify(rs.j));
  const sub = DB.trips - t0 + r2calls, left1 = DB.q("SELECT COUNT(*) n FROM imgown WHERE st = 'dead'")[0].n;
  console.log('# COST [' + mode + '] reset over ' + N + ' R2 images: D1 round trips ' + (DB.trips - t0) + ' + R2 deletes ' + r2calls + ' = ' + sub + ' subrequests, ' + (performance.now() - c0).toFixed(0) + ' ms; condemned and waiting: ' + left1);
  assert.ok(sub < 1000, 'under the limit of one invocation: ' + sub); assert.ok(r2calls > 0, 'the first pass did delete objects');
  assert.equal(DB.q("SELECT COUNT(*) n FROM imgown WHERE st != 'dead'")[0].n, 0, 'every image is condemned (no image for anyone) at once');
  const nu = await W.C.login('0500000178', '583928'); assert.ok(nu.ok);
  for (let k = 0; k < 6 && DB.q('SELECT COUNT(*) n FROM imgown')[0].n; k++) { due(W); DB.exec("UPDATE imgown SET ts = ts - 60000 WHERE st = 'dead'"); const ov = await W.C.api('/api/overview', { cookie: nu.ck }); assert.equal(ov.status, 200); }
  assert.equal(DB.q('SELECT COUNT(*) n FROM imgown')[0].n, 0, 'the following passes finish'); assert.equal(DB.q('SELECT COUNT(*) n FROM imgs')[0].n, 0);
  assert.equal(r2calls, N, 'every object deleted exactly once');
});

/* ── the measurement quoted in the report: an ordinary save, kv ≈ 100 MB ─────────────────────────────────────────────────────── */
test('COST · an ordinary typed save with kv ≈ 100 MB: statements, D1 round trips and time (no candidate · 6 candidates · the write after)', { timeout: 600000 }, async () => {
  const T = await scene('legacy'), { W, S, id } = T, DB = W.env.DB, out = (tag, m) => console.log('# COST ' + tag + ': statements ' + m.statements + ' · D1 round trips ' + m.trips + ' · kv-scanning statements ' + m.kvScans + ' · ' + m.ms.toFixed(1) + ' ms');
  due(W); await typedSave(T); out('small kv, ordinary save', await measured(T));
  const big = 'y'.repeat(690000), ins = DB.db.prepare('INSERT INTO kv (k, seq, v) VALUES (?, 0, ?)'); for (let k = 0; k < 150; k++) ins.run('bsdept:zz' + k + ':bassam_fake_v1', big);
  out('kv 100 MB, ordinary save (no pass due)', await measured(T));
  due(W); out('kv 100 MB, save that runs a pass, no candidate', await measured(T));
  for (let k = 0; k < 6; k++) { const i = id('m' + k); await upload(W, S.mgr2, i); age(W, i, 31); }
  out('kv 100 MB, save that runs a pass, 6 candidates', await measured(T));
  out('kv 100 MB, the write after it', await measured(T));
});

/* ── second independent review: what its fixes cost ──────────────────────────────────────────────────────────────────────────── */
both(test, 'second review · an ordinary save with no pass due is unchanged (legacy: 100 statements, 14 D1 round trips); looking for JSON escapes is ONE statement of a pass with work (the escape count), not part of the deciding statement; a pass that finds escape-bearing texts reads them in 2 more round trips', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, DB = W.env.DB;
  due(W); await typedSave(T);
  const idle = await measured(T);
  if (mode === 'legacy') { assert.equal(idle.statements, 100, 'statements of an ordinary save'); assert.equal(idle.trips, 14, 'D1 round trips of an ordinary save'); }
  assert.equal(idle.sql.filter((s) => /\besc\b|GLOB '\*\\u00/.test(s)).length, 0, 'an ordinary save never reads kv for escapes');
  const big = 'y'.repeat(690000), ins = DB.db.prepare('INSERT INTO kv (k, seq, v) VALUES (?, 0, ?)'); for (let k = 0; k < 150; k++) ins.run('bsdept:zz' + k + ':bassam_fake_v1', big);
  for (let k = 0; k < 6; k++) { const i = id('w' + k); await upload(W, S.mgr2, i); age(W, i, 31); }
  await measured(T);                                                          /* the one-time re-scan of the typed records is behind us */
  const ids = []; for (let k = 0; k < 6; k++) { const i = id('e' + k); await upload(W, S.mgr2, i); age(W, i, 31); ids.push(i); }
  const six = await measured(T), esc = six.sql.filter((s) => /GLOB '\*\\u00/.test(s));
  assert.equal(esc.length, 1, 'one statement looks for escapes'); assert.doesNotMatch(esc[0], /UPDATE imgown/, 'and it changes nothing (the escape count)');
  assert.equal(six.kvScans, 2, 'two kv-reading statements in the pass: the escape count and the deciding statement');
  for (const i of ids) assert.ok(gone(await state(W, i)));
  /* owner decision after the fifth review: honest escape text (a Windows path) is read and decoded by the pass — 2 more D1 round trips, nothing held */
  ins.run('bsdept:zzesc:bassam_fake_v1', '{"p":"C:\\\\Users\\\\u0031452\\\\plan.pdf"}');
  const ids2 = []; for (let k = 0; k < 6; k++) { const i = id('x' + k); await upload(W, S.mgr2, i); age(W, i, 31); ids2.push(i); }
  const read = await measured(T);
  assert.equal(read.trips, six.trips + 2, 'two more round trips: which texts, then their rows · ' + read.trips + ' vs ' + six.trips);
  for (const i of ids2) assert.ok(gone(await state(W, i)), 'and the six are swept all the same');
  console.log('# COST [' + mode + '] second review · ordinary save: statements ' + idle.statements + ' · D1 round trips ' + idle.trips + ' — pass with 6 candidates, kv 100 MB, re-scan done: statements ' + six.statements + ' · D1 round trips ' + six.trips + ' · ' + six.ms.toFixed(0) + ' ms');
});
