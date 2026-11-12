/* V7-F · owner decision 2 — «اليتيمة 30 يوماً، والمرفوعة غير المربوطة 7 أيام. التنظيف يعمل من مسار الحفظ الجديد فعلاً.»
   (after the independent review: the unbound-upload delay is 30 days — owner rule «إن وُجدت أي شاشة تُبقي صورة مرفوعة في مسودة قبل الحفظ: 30 يوماً لا 7»,
   the seized draft keeps a confirmed upload for as long as its window lives; and a pass runs at most once per 10 minutes — `age`/`due` are that time passing.)
   Real worker, legacy AND enforce, stored rows AND R2 bytes.
   Before (develop 5add483): the sweep was called only from the plain-KV save (imgSync); every real save goes through the typed/atomic path,
   so an orphan past its grace and an upload never bound were never deleted — and a platform reset left every R2 object behind.
   Conditions proved here: (i) «لا تُحذف صورة يشير إليها أي سجل حي» — re-checked inside the deciding statement, also against a record
   written between the sweep's read and its decision; a failed R2 delete is retried and never leaves a row a live record uses without bytes. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEST_SUPER_PIN } from './harness.mjs';
import { D, D2, PNG, TAG, dk, both, scene, state, gone, img, edit, bind, upload, unitOp, age, due, EDIT, DAYMS } from './v7_f_img_fx.mjs';

const OTHER = 'data:image/png;base64,T1RIRVJfVjdG';
let n = 0;
/* any accepted typed/atomic save — here an unrelated unit's plan — is what triggers the sweep */
const typedSave = async (T) => { const s = await edit(T.W, T.S.mgr2, D2, 'plan', (v) => { v.floors[0].name = TAG + ' v7f ' + (++n); }); assert.ok(s.ok, 'typed save ' + JSON.stringify(s.j).slice(0, 200)); assert.equal(s.j.atomic, 1, 'it went through the typed/atomic path'); return s; };
async function orphanOf(T, res, name) {   /* a map bound in unit D and then removed by the unit ⇒ orphan */
  const i = T.id(name); await bind(T.W, T.S.mgr, D, res, i); assert.ok((await edit(T.W, T.S.mgr, D, res, EDIT[res](''))).ok);
  assert.equal((await state(T.W, i)).st, 'orphan'); return i;
}

both(test, 'the typed save path sweeps: an orphan past 30 days is deleted (rows and R2 object); one inside the grace is kept', async (mode) => {
  const T = await scene(mode), { W } = T, old = await orphanOf(T, 'plan', 'old'), young = await orphanOf(T, 'rounds', 'young');
  age(W, old, 31); age(W, young, 29);
  const y0 = await state(W, young);
  await typedSave(T);
  assert.ok(gone(await state(W, old)), 'past the grace: body rows, owner row and R2 object are gone · ' + JSON.stringify(await state(W, old)));
  assert.deepEqual(await state(W, young), y0, 'inside the grace: untouched'); assert.equal(y0.r2, PNG);
  assert.equal((await img(W, T.S.super, old)).status, 404, 'the platform admin reads it as gone');
});

both(test, 'an upload never bound is deleted after 30 days; a 29-day-old one is kept; so is the leftover upload of a deleted unit\'s account', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, stale = id('stale'), fresh = id('fresh'), left = id('leftover');
  await upload(W, S.mgr2, stale); await upload(W, S.mgr2, fresh); await upload(W, S.mgr, left);
  age(W, stale, 31); age(W, fresh, 29);
  const f0 = await state(W, fresh); assert.equal(f0.st, 'claim');
  await typedSave(T);
  assert.ok(gone(await state(W, stale)), 'stale upload gone · ' + JSON.stringify(await state(W, stale)));
  assert.deepEqual(await state(W, fresh), f0);
  await unitOp(W, 'dept-delete', D);
  assert.equal((await state(W, left)).st, 'claim', 'the deleted account\'s upload is still an unbound upload'); age(W, left, 31);
  await typedSave(T);
  assert.ok(gone(await state(W, left)), 'and it goes after 30 days too');
});

both(test, 'condition (i) · an aged orphan re-bound by its own unit in the very save that triggers the sweep is not deleted', async (mode) => {
  const T = await scene(mode), { W, S } = T, i = await orphanOf(T, 'plan', 'undo');
  age(W, i, 31);
  const s = await edit(W, S.mgr, D, 'plan', EDIT.plan(i)); assert.ok(s.ok, JSON.stringify(s.j).slice(0, 200));
  let st = await state(W, i);
  assert.equal(st.st, 'bound'); assert.equal(st.k, dk(D, 'plan')); assert.equal(st.r2, PNG, 'bytes intact'); assert.deepEqual(st.refs, [dk(D, 'plan')]);
  due(W); await typedSave(T); due(W); await W.C.api('/api/overview', { cookie: S.super });
  assert.deepEqual(await state(W, i), st, 'nor by any later sweep');
  assert.equal((await img(W, S.mgr, i)).status, 200);
});

both(test, 'condition (i) · a 31-day-old upload bound in the same save that triggers the sweep is not deleted', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, i = id('late');
  await upload(W, S.mgr, i); age(W, i, 31);
  const s = await edit(W, S.mgr, D, 'rounds', EDIT.rounds(i)); assert.ok(s.ok, JSON.stringify(s.j).slice(0, 200));
  const st = await state(W, i); assert.equal(st.st, 'bound'); assert.equal(st.r2, PNG); assert.deepEqual(st.refs, [dk(D, 'rounds')]);
  due(W); await typedSave(T);
  assert.deepEqual(await state(W, i), st);
});

/* a record written BETWEEN the sweep's read of its candidates and its decision: the decision is one statement that re-checks, so nothing is condemned */
function between(W, hook) {
  const DB = W.env.DB, prepare = DB.prepare.bind(DB); let fired = 0;
  DB.prepare = (sql) => { const st = prepare(sql);
    if (/SELECT img, st, ts FROM imgown WHERE st = 'orphan' AND ts </.test(sql)) { const all = st.all.bind(st); st.all = async () => { const r = await all(); if (r.results.length) { fired++; hook(); } return r; }; }
    return st; };
  return { fired: () => fired, off: () => { DB.prepare = prepare; } };
}
both(test, 'condition (i) · a concurrent re-bind, a concurrent reference (typed or plain) landing after the sweep read its candidates: the image survives with its bytes', async (mode) => {
  for (const kind of ['rebind', 'typed-ref', 'kv-mention', 'upload-rebound']) {
    const T = await scene(mode), { W, S, id } = T, K = dk(D, 'plan');
    let i;
    if (kind === 'upload-rebound') { i = id('c' + kind.length); await upload(W, S.mgr, i); age(W, i, 31); } else { i = await orphanOf(T, 'plan', 'c' + kind.length); age(W, i, 31); }
    const run = (sql, ...a) => W.env.DB.db.prepare(sql).run(...a);
    const B = between(W, () => {
      if (kind === 'rebind' || kind === 'upload-rebound') { run("UPDATE imgown SET st = 'bound', k = ?, dept = ? WHERE img = ?", K, D, i); run('INSERT OR IGNORE INTO imgref (img, k) VALUES (?, ?)', i, K); }
      if (kind === 'typed-ref') run('INSERT OR IGNORE INTO imgref (img, k) VALUES (?, ?)', i, K);
      if (kind === 'kv-mention') run("INSERT INTO kv (k, seq, v) VALUES (?, 0, ?)", 'bsdept:' + D + ':bassam_profile_v1', JSON.stringify({ t: TAG, logo: i }));
    });
    try { await typedSave(T); } finally { B.off(); }
    assert.equal(B.fired(), 1, kind + ': the sweep did read the image as a candidate');
    const st = await state(W, i);
    assert.equal(st.r2, PNG, kind + ': the R2 bytes are intact'); assert.equal(st.body, 'r2', kind + ': the body row is intact');
    assert.equal(st.st, kind === 'rebind' || kind === 'upload-rebound' ? 'bound' : 'amb', kind + ': ' + JSON.stringify(st));
    due(W); await typedSave(T); due(W); await W.C.api('/api/overview', { cookie: S.super });
    assert.equal((await state(W, i)).r2, PNG, kind + ': and later sweeps leave it');
  }
});

both(test, 'a failed R2 delete is retried: the image is condemned (gone for everyone, bytes pending), no row is removed before R2 confirms, the next sweep finishes', async (mode) => {
  const T = await scene(mode), { W, S } = T, i = await orphanOf(T, 'plan', 'r2fail'), R2 = W.env.IMG_R2, del = R2.delete;
  age(W, i, 31);
  let fail = 0; R2.delete = async (k) => { fail++; throw new Error('TEST_ONLY R2 delete outage ' + k); };
  const s = await typedSave(T); assert.ok(s.ok, 'the save itself is not failed by the sweep');
  assert.equal(fail, 1);
  let st = await state(W, i);
  assert.equal(st.st, 'dead', 'condemned, awaiting its R2 delete'); assert.equal(st.body, 'r2', 'the row is not removed before R2 confirms'); assert.equal(st.r2, PNG);
  /* condemned = no image: not readable (the platform admin included), not listed, not re-bindable — and a save that mentions it is a save that mentions no image */
  assert.equal((await img(W, S.super, i)).status, 404);
  assert.deepEqual((await img(W, S.mgr, i)).j, { ok: 0, err: 'forbidden' });
  assert.equal(Object.keys((await W.C.api('/api/imgs', { cookie: S.super })).j).includes(i), false, 'not in the admin\'s listing');
  const re = await edit(W, S.mgr, D, 'plan', EDIT.plan(i)); assert.ok(re.ok, 'mentioning a condemned id is mentioning an id with no image');
  st = await state(W, i); assert.equal(st.st, 'dead', 'it is not revived'); assert.equal((await img(W, S.mgr, i)).status, 404, 'his own record now shows it as missing');
  assert.equal(fail, 1, 'that save ran no second pass (one per 10 minutes)');
  due(W); await typedSave(T); assert.equal(fail, 1, 'and a pass within the lease makes no second attempt'); assert.equal((await state(W, i)).st, 'dead');
  /* a re-upload of the same id while the delete is pending and the lease is fresh: told to retry, nothing written */
  const busy = await img(W, S.mgr, i, 'PUT', OTHER); assert.equal(busy.status, 409); assert.equal(busy.j.err, 'img-busy'); assert.equal((await state(W, i)).r2, PNG);
  /* the lease passes, R2 is back: the next sweep finishes the job */
  W.env.DB.exec("UPDATE imgown SET ts = ts - 60000 WHERE img = '" + i + "'"); R2.delete = del; due(W);
  await typedSave(T);
  st = await state(W, i); assert.equal(st.body, null); assert.equal(st.r2, null); assert.equal(st.st, null, 'rows and object gone · ' + JSON.stringify(st));
  assert.equal((await img(W, S.mgr, i)).status, 404, 'the unit\'s record still mentions it: MISSING for its readers');
  assert.deepEqual((await img(W, S.mgr2, i)).j, { ok: 0, err: 'forbidden' }, 'and the unified refusal for anyone else');
});

both(test, 'a condemned id re-uploaded after the lease (bytes coming back) becomes a normal upload with the NEW bytes; the pending delete never touches them', async (mode) => {
  const T = await scene(mode), { W, S } = T, i = await orphanOf(T, 'plan', 'reup'), R2 = W.env.IMG_R2, del = R2.delete;
  age(W, i, 31); R2.delete = async () => { throw new Error('TEST_ONLY R2 delete outage'); };
  await typedSave(T); assert.equal((await state(W, i)).st, 'dead');
  W.env.DB.exec("UPDATE imgown SET ts = ts - 60000 WHERE img = '" + i + "'");
  const up = await img(W, S.mgr, i, 'PUT', OTHER); assert.equal(up.status, 200, JSON.stringify(up.j));
  let st = await state(W, i); assert.equal(st.st, 'claim'); assert.equal(st.r2, OTHER); assert.equal(st.body, 'r2');
  R2.delete = del; due(W); await typedSave(T); due(W); await W.C.api('/api/overview', { cookie: S.super });
  st = await state(W, i); assert.equal(st.st, 'claim'); assert.equal(st.r2, OTHER, 'the new bytes are not swept by the old pending delete');
});

both(test, 'the work is bounded: 6 per pass, ONE pass per 10 minutes for the whole platform (the writes in between run none), the admin\'s overview asks once a minute for 40', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, ids = [];
  for (let k = 0; k < 15; k++) { const i = id('bulk' + k); await upload(W, S.mgr2, i); age(W, i, 31 + k); ids.push(i); }
  const left = async () => { let c = 0; for (const i of ids) if (!gone(await state(W, i))) c++; return c; };
  await typedSave(T); assert.equal(await left(), 9, 'one pass: 6 (the oldest first)');
  assert.ok(gone(await state(W, ids[14])), 'oldest first'); assert.equal((await state(W, ids[0])).st, 'claim');
  await typedSave(T); await typedSave(T); assert.equal(await left(), 9, 'the writes of the next 10 minutes run no pass');
  const last = () => Number(W.env.DB.q("SELECT n FROM guard WHERE gk = 'rl:img-sweep'")[0].n), back = (ms) => W.env.DB.exec("UPDATE guard SET n = " + (last() - ms) + " WHERE gk = 'rl:img-sweep'");
  back(9 * 60000); await typedSave(T); assert.equal(await left(), 9, '9 minutes later: still none');
  back(2 * 60000); await typedSave(T); assert.equal(await left(), 3, 'past 10 minutes: the next 6');
  back(30000);
  let ov = await W.C.api('/api/overview', { cookie: S.super }); assert.equal(ov.status, 200); assert.equal(await left(), 3, 'the admin overview within a minute of the last pass: none');
  back(61000);
  ov = await W.C.api('/api/overview', { cookie: S.super }); assert.equal(ov.status, 200);
  assert.equal(await left(), 0, 'a minute after it: the admin overview read sweeps too');
  assert.equal(ov.j.imgs.grace, 30 * DAYMS); assert.equal(ov.j.imgs.claimGrace, 30 * DAYMS);
});

both(test, 'the plain-KV save path still sweeps, and an image a plain record mentions is never deleted', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, KP = dk(D, 'profile'), logo = id('logo'), i = await orphanOf(T, 'plan', 'kvpath'), stale = id('kvstale');
  await upload(W, S.mgr, logo); await upload(W, S.mgr, stale);
  const s1 = await W.C.save(S.mgr, { [KP]: JSON.stringify({ t: TAG + ' v7f', logo }) }); assert.equal(s1.status, 200, JSON.stringify(s1.j).slice(0, 200));
  if ((s1.j.denied || {})[KP]) { console.log('# [' + mode + '] plain profile save denied to the manager: ' + JSON.stringify(s1.j.denied[KP]).slice(0, 80) + ' — plain-path leg skipped'); return; }
  assert.equal((await state(W, logo)).st, 'bound');
  age(W, i, 31); age(W, stale, 31); age(W, logo, 400);
  const s2 = await W.C.save(S.mgr, { [KP]: JSON.stringify({ t: TAG + ' v7f 2', logo }) }); assert.equal(s2.status, 200);
  assert.ok(gone(await state(W, i)), 'aged orphan swept from the plain path'); assert.ok(gone(await state(W, stale)), 'aged upload swept from the plain path');
  assert.equal((await state(W, logo)).r2, PNG, 'a bound image, however old, is not a candidate');
});

both(test, 'platform reset: the R2 objects go with the rows (they used to stay behind for ever); a failed delete is retried by the next writes', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, a = id('ra'), b = id('rb'), c = id('rc');
  await bind(W, S.mgr, D, 'plan', a); await bind(W, S.mgr, D, 'rounds', b); await upload(W, S.mgr2, c);
  for (const i of [a, b, c]) assert.equal((await state(W, i)).r2, PNG);
  const rk = await W.C.api('/api/recovery/new', { method: 'POST', cookie: S.super, body: { pw: TEST_SUPER_PIN } }); assert.ok(rk.j.key, JSON.stringify(rk.j));
  const R2 = W.env.IMG_R2, del = R2.delete; let fail = 0;
  R2.delete = async (k) => { if (k === 'img/' + b) { fail++; throw new Error('TEST_ONLY R2 delete outage'); } return del(k); };
  const rs = await W.C.api('/api/reset', { method: 'POST', cookie: S.super, body: { pw: TEST_SUPER_PIN, key: rk.j.key, confirm: 'تهيئة', admin: { un: '0500000177', name: TAG + ' reset', pw: '583928' } } });
  assert.equal(rs.status, 200, JSON.stringify(rs.j)); assert.equal(rs.j.ok, 1, JSON.stringify(rs.j));
  assert.ok(gone(await state(W, a)), 'bound image: rows and R2 object gone · ' + JSON.stringify(await state(W, a)));
  assert.ok(gone(await state(W, c)), 'unbound upload: rows and R2 object gone');
  assert.equal(W.env.DB.q('SELECT COUNT(*) n FROM imgref')[0].n, 0);
  assert.equal(fail, 1); let sb = await state(W, b);
  assert.equal(sb.st, 'dead', 'the one R2 refused to delete is condemned, queued for retry'); assert.equal(sb.r2, PNG);
  const nu = await W.C.login('0500000177', '583928'); assert.ok(nu.ok, 'the new admin');
  assert.equal((await img(W, nu.ck, b)).status, 404, 'no image for the new platform admin either');
  assert.deepEqual(Object.keys((await W.C.api('/api/imgs', { cookie: nu.ck })).j), []);
  R2.delete = del; W.env.DB.exec("UPDATE imgown SET ts = ts - 60000 WHERE img = '" + b + "'"); due(W);   /* the retry lease passes */
  const ov = await W.C.api('/api/overview', { cookie: nu.ck }); assert.equal(ov.status, 200, JSON.stringify(ov.j).slice(0, 200));
  sb = await state(W, b); assert.ok(gone(sb), 'retried and finished · ' + JSON.stringify(sb));
  assert.equal(W.env.DB.q('SELECT COUNT(*) n FROM imgs')[0].n, 0); assert.equal(W.env.DB.q('SELECT COUNT(*) n FROM imgown')[0].n, 0);
});
