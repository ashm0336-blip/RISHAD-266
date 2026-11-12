/* V7-F · second independent review, finding 4 — draining the condemned rows when the invocation is cut.
   Before: a pass deleted up to 400 R2 objects, one call each, and removed their rows only at the very end, in one batch. An invocation that is cut
   (the subrequest limit — 50 on the smallest plan — or the waitUntil limit) never reached that batch: no row ever left, and every later pass
   retried the same rows and was cut again. Nothing was ever drained.
   Now: rows leave in chunks of 4, right after the R2 deletes of the chunk are confirmed — whatever cuts the pass, what it finished stays finished;
   and a pass carried by an ordinary save asks for at most 6 condemned rows on top of its 6 candidates, which fits the smallest limit whole.
   The limit is simulated the way the platform applies it: every D1 round trip and every R2 call of ONE invocation counts; past the limit each
   call throws 'Too many subrequests.'. Real worker, legacy and enforce. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEST_SUPER_PIN } from './harness.mjs';
import { D2, PNG, TAG, dk, both, scene, state, gone, upload, age, due } from './v7_f_img_fx.mjs';
import { taskCommandBody, operationSaveBody } from './tasks_fx.mjs';

/* N rows already condemned (a reset, or objects whose delete failed), each with its R2 object */
async function condemned(T, N, tag) {
  const { W } = T, DB = W.env.DB, old = Date.now() - 3600e3, ids = [];
  DB.db.exec('BEGIN'); const own = DB.db.prepare("INSERT INTO imgown (img, st, k, uid, dept, ts) VALUES (?, 'dead', '', '', '', ?)"), body = DB.db.prepare("INSERT INTO imgs (k, seq, v) VALUES (?, 0, '~r2~')");
  for (let k = 0; k < N; k++) { const x = 'img_v7fd' + tag + T.x + '_' + k.toString(36); own.run(x, old + k); body.run(x); await W.env.IMG_R2.put('img/' + x, PNG); ids.push(x); }
  DB.db.exec('COMMIT'); return ids;
}
const left = async (T, ids) => { let objects = 0; for (const x of ids) if (await T.W.env.IMG_R2.get('img/' + x)) objects++;
  return { rows: T.W.env.DB.q("SELECT COUNT(*) n FROM imgown WHERE st = 'dead'")[0].n, bodies: T.W.env.DB.q("SELECT COUNT(*) n FROM imgs WHERE k LIKE 'img_v7fd%'")[0].n, objects }; };
/* ONE invocation under a subrequest limit: returns the response and what it used */
async function capped(T, limit, run) {
  const { W } = T, DB = W.env.DB, R2 = W.env.IMG_R2, prep = DB.prepare, batch = DB.batch, del = R2.delete; let used = 0, cut = 0;
  const over = () => { if (++used > limit) { cut++; throw new Error('Too many subrequests.'); } };
  DB.batch = async function (st) { over(); return batch.call(DB, st); };
  DB.prepare = function (sql) { const st = prep.call(DB, sql); for (const m of ['first', 'all', 'run', 'raw']) { const f = st[m].bind(st); st[m] = async (...a) => { over(); return f(...a); }; } return st; };
  R2.delete = async function (k) { over(); return del.call(R2, k); };
  try { return { r: await run(), used, cut: () => cut }; } finally { DB.prepare = prep; DB.batch = batch; R2.delete = del; }
}
let n = 0;
/* an ordinary typed save as ONE invocation (its read is another invocation, done before) */
async function saveUnder(T, limit) {
  const { W, S } = T, k = dk(D2, 'plan'), g = await W.C.api('/api/operations/read?keys=' + encodeURIComponent(k), { cookie: S.mgr2 }), v = g.j.resources[k]; v.floors[0].name = TAG + ' drain ' + (++n);
  const p = '/api/save', body = { set: { [k]: JSON.stringify(v) }, del: [], base: { [k]: g.j.base[k] }, why: { [k]: TAG } }, payload = operationSaveBody(W.env, p, taskCommandBody(W.env, p, body));
  return capped(T, limit, () => W.C.api(p, { method: 'POST', cookie: S.mgr2, body: payload }));
}
const again = (T) => { due(T.W); T.W.env.DB.exec("UPDATE imgown SET ts = ts - 60000 WHERE st = 'dead'"); };   /* ten minutes later; the 20-second lease of the last pass is over */

both(test, 'a save that carries a pass fits a 50-subrequest invocation whole — 6 candidates and 40 condemned rows waiting: never cut, every pass drains, all gone after 8 passes', async (mode) => {
  const T = await scene(mode), { W, S, id } = T;
  await saveUnder(T, 1e9);                                                   /* the pass of this fixture's first write is behind us */
  const cands = []; for (let k = 0; k < 6; k++) { const x = id('c' + k); await upload(W, S.mgr2, x); age(W, x, 31); cands.push(x); }
  again(T); await saveUnder(T, 1e9);                                         /* (the one-time re-scan of the typed records runs here, before the limit is on) */
  for (const x of cands) assert.ok(gone(await state(W, x)));
  const ids = await condemned(T, 40, 's'); let before = await left(T, ids), passes = 0; const usedBy = [];
  for (let k = 0; k < 6; k++) { const x = id('d' + k); await upload(W, S.mgr2, x); age(W, x, 31); cands.push(x); }
  while (before.rows && passes < 8) {
    again(T); const s = await saveUnder(T, 50); passes++;
    usedBy.push(s.used); assert.equal(s.r.status, 200); assert.equal(s.cut(), 0, 'pass ' + passes + ' was not cut: ' + s.used + ' subrequests'); assert.ok(s.used <= 50, String(s.used));
    const now = await left(T, ids);
    assert.ok(now.rows < before.rows, 'pass ' + passes + ' drained: ' + before.rows + ' → ' + now.rows);
    assert.equal(now.objects, now.rows, 'rows and objects leave together'); assert.equal(now.bodies, now.rows);
    before = now;
  }
  assert.deepEqual(before, { rows: 0, bodies: 0, objects: 0 }, 'everything drained after ' + passes + ' passes');
  console.log('# COST [' + mode + '] subrequests of the whole save invocation (D1 round trips + R2 calls), pass by pass: ' + usedBy.join(' · '));
  for (const x of cands) assert.ok(gone(await state(W, x)), 'and the six new candidates of the first limited pass went with it');
});

both(test, 'a pass that IS cut keeps what it finished: 120 condemned rows, the platform admin\'s overview under a 50-subrequest limit — every pass makes progress, rows never outlive their chunk, all drained', async (mode) => {
  const T = await scene(mode), { W, S } = T, ids = await condemned(T, 120, 'a'); let before = await left(T, ids), passes = 0, cuts = 0;
  const logs = [], log = console.log, warn = console.warn; console.log = console.warn = (m) => { logs.push(String(m)); };
  try {
    while (before.rows && passes < 40) {
      again(T); W.env.DB.exec("DELETE FROM guard WHERE gk = 'rl:img-sweep'");
      const o = await capped(T, 50, () => W.C.api('/api/overview', { cookie: S.super })); passes++; if (o.cut()) cuts++;
      const now = await left(T, ids);
      assert.ok(now.rows < before.rows, 'pass ' + passes + ' made progress: ' + before.rows + ' → ' + now.rows);
      assert.ok(now.objects <= now.rows && now.rows - now.objects <= 4, 'at most the chunk that was cut has objects gone and rows waiting: ' + JSON.stringify(now));
      before = now;
    }
  } finally { console.log = log; console.warn = warn; }
  assert.ok(cuts > 0, 'the limit did cut passes');
  assert.deepEqual(before, { rows: 0, bodies: 0, objects: 0 }, 'everything drained after ' + passes + ' passes');
  assert.ok(logs.filter((l) => /"op":"r2-delete"/.test(l)).length <= passes * 8, 'a pass that is refused stops asking (at most two chunks of refusals each)');
});

both(test, 'a platform reset whose invocation is cut: its first pass still removes objects; the overview and the log say how many remain, truthfully; the following passes finish', async (mode) => {
  const T = await scene(mode), { W, S } = T, DB = W.env.DB, R2 = W.env.IMG_R2, N = 90, ids = [];
  DB.db.exec('BEGIN'); const own = DB.db.prepare("INSERT INTO imgown (img, st, k, uid, dept, ts) VALUES (?, 'claim', '', 'tst_dm2', ?, ?)"), body = DB.db.prepare("INSERT INTO imgs (k, seq, v) VALUES (?, 0, '~r2~')");
  for (let k = 0; k < N; k++) { const i = 'img_v7fd' + T.x + '_' + k.toString(36); own.run(i, D2, Date.now()); body.run(i); await R2.put('img/' + i, PNG); ids.push(i); }
  DB.db.exec('COMMIT');
  const rk = await W.C.api('/api/recovery/new', { method: 'POST', cookie: S.super, body: { pw: TEST_SUPER_PIN } }); assert.ok(rk.j.key, JSON.stringify(rk.j));
  const logs = [], log = console.log, warn = console.warn; console.log = console.warn = (m) => { logs.push(String(m)); };
  let rs; try { rs = await capped(T, 50, () => W.C.api('/api/reset', { method: 'POST', cookie: S.super, body: { pw: TEST_SUPER_PIN, key: rk.j.key, confirm: 'تهيئة', admin: { un: '0500000179', name: TAG + ' reset', pw: '583928' } } })); }
  finally { console.log = log; console.warn = warn; }
  assert.equal(rs.r.status, 200, JSON.stringify(rs.r.j)); assert.ok(rs.cut() > 0, 'the reset invocation was cut by the limit');
  const one = await left(T, ids);
  assert.ok(one.rows < N && one.rows > 0, 'the first pass removed some: ' + JSON.stringify(one)); assert.ok(one.objects <= one.rows && one.rows - one.objects <= 4, JSON.stringify(one));
  assert.equal(DB.q("SELECT COUNT(*) n FROM imgown WHERE st != 'dead'")[0].n, 0, 'every image is condemned at once (no image for anyone)');
  const said = logs.map((l) => { try { return JSON.parse(l); } catch (e) { return {}; } }).filter((l) => l.ev === 'img-sweep');
  assert.ok(said.length >= 1, 'the pass reported'); assert.equal(said[said.length - 1].more, 1, 'and said that condemned objects remain');
  const nu = await W.C.login('0500000179', '583928'); assert.ok(nu.ok);
  let o = await capped(T, 50, () => W.C.api('/api/overview', { cookie: nu.ck })); assert.equal(o.r.status, 200);   /* no pass is due in this minute: the overview only reports */
  assert.equal((o.r.j.imgs.counts || {}).dead, one.rows, 'the overview tells the new admin how many condemned images still wait');
  for (let k = 0; k < 6 && (await left(T, ids)).rows; k++) { again(T); o = { r: await W.C.api('/api/overview', { cookie: nu.ck }) }; assert.equal(o.r.status, 200);
    assert.equal((o.r.j.imgs.counts || {}).dead || 0, (await left(T, ids)).rows, 'and keeps telling the truth as they drain'); }
  assert.deepEqual(await left(T, ids), { rows: 0, bodies: 0, objects: 0 }, 'the following passes finish');
});
