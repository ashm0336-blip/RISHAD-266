/* V7-F · the independent review of 68cfa6a — «the sweep can delete an image a LIVE record still shows». Every case here is one of the reviewer's
   probes turned into a test: real worker, legacy AND enforce, stored rows AND R2 bytes. Each fails on 68cfa6a.
   Owner condition: «لا تُحذف صورة يشير إليها أي سجل حي».
     1 · the mention cap (5000 matches, repeats counted) dropped references            → no id of the stored value is lost; >5000 DISTINCT ids = refusal
     2 · ids outside [a-z0-9_] were accepted at PUT and then held the sweep's queue     → refused at PUT; existing rows are swept like any other
     4 · an id cut by the 700 000-character row boundary of a kv value was invisible   → seen; so are the tables outside kv (seized photos, awards)
     6 · abandoned chunked uploads and the leftovers of a failed upload were for ever  → 7 days for staged parts; the owner row precedes the bytes
     low · the plain-KV race (condemned between the ownership read and the write)       → the save is answered as a conflict, nothing half-bound */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { D, D2, PNG, TAG, dk, both, scene, state, gone, img, edit, bind, upload, age, due, EDIT, stored, K_DEPTS } from './v7_f_img_fx.mjs';

let n = 0;
const isDay = (k) => /^\d+-\d+-\d+$/.test(k);
/* any accepted typed/atomic save — an unrelated unit's plan — is what lets the sweep run */
const typedSave = async (T) => { const s = await edit(T.W, T.S.mgr2, D2, 'plan', (v) => { v.floors[0].name = TAG + ' rv ' + (++n); }); assert.ok(s.ok, 'typed save ' + JSON.stringify(s.j).slice(0, 200)); return s; };
const pass = async (T) => { due(T.W); return typedSave(T); };
async function orphanOf(T, res, name) { const i = T.id(name); await bind(T.W, T.S.mgr, D, res, i); assert.ok((await edit(T.W, T.S.mgr, D, res, EDIT[res](''))).ok); assert.equal((await state(T.W, i)).st, 'orphan'); return i; }
const mentions = (W, k, id) => JSON.stringify(stored(W.env, k)).includes(id);
const raw = (W) => W.env.DB.db;

/* ── finding 1 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
both(test, 'finding 1 · a plan that repeats one map 5001 times and then mentions a fresh upload: the upload is BOUND with its reference, and 31 days later it is still there', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, a = id('capa'), b = id('capb'), K = dk(D, 'plan');
  await bind(W, S.mgr, D, 'plan', a); await upload(W, S.mgr, b);
  const s = await edit(W, S.mgr, D, 'plan', (v) => { const f0 = v.floors[0], fl = []; for (let q = 0; q < 5001; q++) fl.push(Object.assign({}, f0, { name: 'f' + q, sid: undefined, iid: a })); fl.push(Object.assign({}, f0, { name: 'last', sid: undefined, iid: b })); v.floors = fl; });
  assert.ok(s.ok, 'one map repeated is one image — the save is accepted · ' + JSON.stringify(s.j).slice(0, 200));
  assert.ok(mentions(W, K, b));
  let st = await state(W, b);
  assert.equal(st.st, 'bound', 'the 5002nd mention is bound · ' + JSON.stringify(st).replace(PNG, 'PNG')); assert.deepEqual(st.refs, [K]);
  age(W, b, 31); age(W, a, 31); await pass(T); await pass(T);
  st = await state(W, b); assert.equal(st.r2, PNG, 'bytes intact 31 days later'); assert.equal(st.body, 'r2'); assert.equal(st.st, 'bound');
  assert.equal((await img(W, S.mgr, b)).status, 200);
});

both(test, 'finding 1 · rounds history (260 days × 20 rounds reusing one map) pushes an already-bound map past mention 5000: it stays bound and is never swept', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, a = id('rmapa'), z = id('rmapz'), K = dk(D, 'rounds');
  await bind(W, S.mgr, D, 'rounds', z); await upload(W, S.mgr, a);
  const before = await state(W, z); assert.equal(before.st, 'bound');
  /* the history is written the way an import or a restore leaves it: as the stored record (the manager's own typed save of a year of days is a matter of
     his date scope, not of images); then the manager saves his ordinary edit of today on top of it */
  const v = stored(W.env, K), last = Object.keys(v).filter(isDay).sort().pop(), [y] = last.split('-'), out = {}; let c = 0;
  for (let mm = 1; mm <= 12 && c < 5200; mm++) for (let dd = 1; dd <= 29 && c < 5200; dd++) { const day = { d: [] }; for (let q = 0; q < 20; q++) { day.d.push({ iid: a }); c++; } out[(y - 1) + '-' + mm + '-' + dd] = day; }
  for (const k of Object.keys(v)) out[k] = v[k];
  const { replaceOperationalFixture } = await import('./tasks_fx.mjs'); await replaceOperationalFixture(W.env, K, out);
  const all = JSON.stringify(stored(W.env, K)).match(/img_[a-z0-9]+_[a-z0-9]+/g) || [];
  assert.ok(all.indexOf(z) >= 5000, 'the bound map is past mention 5000 (at ' + all.indexOf(z) + ' of ' + all.length + ')');
  const s = await edit(W, S.mgr, D, 'rounds', (d) => { const day = Object.keys(d).filter(isDay).sort().pop(); d[day].d[0].name = TAG + ' edit of today'; });
  assert.ok(s.ok, 'the ordinary save of today · ' + JSON.stringify(s.j).slice(0, 240));
  assert.ok(mentions(W, K, z));
  let st = await state(W, z);
  assert.equal(st.st, 'bound', 'still bound to the record that shows it · ' + JSON.stringify(st).replace(PNG, 'PNG')); assert.deepEqual(st.refs, [K]);
  assert.equal((await img(W, S.mgr, z)).status, 200, 'its manager still reads it');
  age(W, z, 31); await pass(T); await pass(T);
  st = await state(W, z); assert.equal(st.r2, PNG, 'and 31 days later the bytes are there'); assert.equal(st.st, 'bound'); assert.ok(mentions(W, K, z));
});

both(test, 'finding 1 · more than 5000 DISTINCT images in one record: the save is refused whole with a named reason — nothing is silently dropped', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, K = dk(D, 'plan'), b = id('over'), before = JSON.stringify(stored(W.env, K));
  await upload(W, S.mgr, b);
  const s = await edit(W, S.mgr, D, 'plan', (v) => { const f0 = v.floors[0], fl = []; for (let q = 0; q < 5001; q++) fl.push(Object.assign({}, f0, { name: 'f' + q, sid: undefined, iid: 'img_v7fx' + T.x + '_' + q.toString(36) })); fl.push(Object.assign({}, f0, { name: 'last', sid: undefined, iid: b })); v.floors = fl; });
  assert.equal(s.ok, false, 'refused · ' + JSON.stringify(s.j).slice(0, 200));
  assert.equal(s.why, 'img-limit', JSON.stringify(s.j).slice(0, 300));
  assert.match(String((s.j.denied[K] || {}).detail || ''), /5000/, 'the refusal says what the limit is');
  assert.equal(JSON.stringify(stored(W.env, K)), before, 'the record is unchanged');
  const st = await state(W, b); assert.equal(st.st, 'claim', 'and the upload is still its uploader\'s, with its bytes'); assert.equal(st.r2, PNG);
});

/* ── finding 2 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
both(test, 'finding 2 · PUT /api/img/<id>: an id outside letters, digits and "_" is refused 400 and leaves nothing; every shape the clients generate is accepted', async (mode) => {
  const T = await scene(mode), { W, S } = T, x = T.x;
  for (const bad of ['img_bad-' + x + '.1', 'img_' + x + '.png', 'img_' + x + '%25', 'img_' + x + '~0', 'img_' + x + '*', 'img_' + x + '-1', 'img_' + encodeURIComponent('صورة') + x]) {
    const r = await img(W, S.emp2, bad, 'PUT', PNG);
    assert.equal(r.status, 400, bad + ' → ' + r.status + ' ' + JSON.stringify(r.j)); assert.deepEqual(r.j, { ok: 0, err: 'img-id' });
    const id = decodeURIComponent(bad);
    assert.equal(W.env.DB.q('SELECT COUNT(*) n FROM imgown WHERE img = ?', id)[0].n, 0, bad + ': no owner row');
    assert.equal(W.env.DB.q('SELECT COUNT(*) n FROM imgs WHERE k = ?', id)[0].n, 0, bad + ': no body row'); assert.equal(await W.env.IMG_R2.get('img/' + id), null, bad + ': no object');
  }
  const t36 = Date.now().toString(36), r36 = Math.floor(1e9 * Math.random()).toString(36);
  /* plan + daily maps · task proof · seized photo (the three generators in src) · and the ids older tools and fixtures carry (upper case, short) */
  for (const good of ['img_' + t36 + '_' + r36, 'img_tsk' + t36 + '_' + r36, 'szp_' + t36 + '_' + r36, 'IMG_' + x.toUpperCase() + '_A1', 'img_' + x, 'x' + x]) {
    const r = await img(W, S.emp2, good, 'PUT', PNG); assert.equal(r.status, 200, good + ' → ' + r.status + ' ' + JSON.stringify(r.j));
    assert.equal((await state(W, good)).r2, PNG);
  }
});

both(test, 'finding 2 · 41 malformed rows left by the old PUT, older than every delay, do not hold the queue: a valid stale upload is swept, and so are they', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, bad = [], now = Date.now();
  for (let k = 0; k < 41; k++) { const b = 'img_bad-' + T.x + '.' + k; bad.push(b);
    raw(W).prepare("INSERT INTO imgown (img, st, k, uid, dept, ts) VALUES (?, 'claim', '', 'tst_e2', ?, ?)").run(b, D2, now - 60 * 864e5 - k);
    raw(W).prepare("INSERT INTO imgs (k, seq, v) VALUES (?, 0, '~r2~')").run(b); await W.env.IMG_R2.put('img/' + b, PNG); }
  const good = id('stale'); await upload(W, S.mgr2, good); age(W, good, 31);
  for (let k = 0; k < 9; k++) await pass(T);
  assert.ok(gone(await state(W, good)), 'the valid 31-day-old upload is swept · ' + JSON.stringify(await state(W, good)).replace(PNG, 'PNG'));
  assert.equal(W.env.DB.q("SELECT COUNT(*) n FROM imgown WHERE img LIKE 'img_bad-%'")[0].n, 0, 'the malformed rows are gone');
  assert.equal(W.env.DB.q("SELECT COUNT(*) n FROM imgs WHERE k LIKE 'img_bad-%'")[0].n, 0);
  for (const b of bad) assert.equal(await W.env.IMG_R2.get('img/' + b), null, 'and their objects');
});

/* ── finding 4 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
both(test, 'finding 4 · a kv value that mentions the id ACROSS two stored rows (seq 0 / seq 1), with no reference row: the image is not deleted', async (mode) => {
  for (const kind of ['orphan', 'claim']) for (const at of ['first', 'middle', 'last']) {
    const T = await scene(mode), { W, S, id } = T;
    let i;
    if (kind === 'orphan') { i = await orphanOf(T, 'plan', 'strad'); } else { i = id('strad'); await upload(W, S.mgr, i); }
    age(W, i, 31);
    const K = 'bsdept:' + D + ':bassam_profile_v1', doc = '{"t":"' + 'x'.repeat(100) + '","logo":"' + i + '"}';
    const cut = doc.indexOf(i) + (at === 'first' ? 1 : at === 'last' ? i.length - 1 : 6);
    raw(W).prepare('DELETE FROM kv WHERE k = ?').run(K);
    raw(W).prepare('INSERT INTO kv (k, seq, v) VALUES (?, 0, ?)').run(K, doc.slice(0, cut)); raw(W).prepare('INSERT INTO kv (k, seq, v) VALUES (?, 1, ?)').run(K, doc.slice(cut));
    assert.deepEqual((await state(W, i)).refs, [], 'no reference row: only the value itself says so');
    await pass(T); await pass(T);
    const st = await state(W, i), tag = kind + '/' + at + ': ' + JSON.stringify(st).replace(PNG, 'PNG');
    assert.equal(st.r2, PNG, 'bytes intact · ' + tag); assert.equal(st.body, 'r2', tag);
    assert.equal(st.st, kind === 'orphan' ? 'amb' : 'claim', 'a referenced orphan becomes the platform admin\'s; a referenced upload keeps its clock · ' + tag);
  }
});

/* typed records live OUTSIDE kv (ops_* tables): they are protected by imgref alone — and the previous build wrote imgref from a scan that stopped
   at 5000 mentions. So the sweep condemns nothing until a one-time re-scan (meta.imgref_scan_v1) has re-read every typed record and restored what was dropped. */
both(test, 'finding 4 · a typed record whose reference row is missing (what the 5000-mention cap left behind): the one-time re-scan restores it before anything is condemned', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, b = id('legacy'), ctl = id('ctl'), K = dk(D, 'plan');
  await upload(W, S.mgr, b); await upload(W, S.mgr, ctl);
  const { replaceOperationalFixture } = await import('./tasks_fx.mjs'), v = stored(W.env, K); v.floors[0].iid = b;
  await replaceOperationalFixture(W.env, K, v);                               /* the record shows b; no save of this build indexed it */
  W.env.DB.exec("DELETE FROM imgref WHERE img = '" + b + "'"); W.env.DB.exec("DELETE FROM meta WHERE k = 'imgref_scan_v1'");   /* the database as the previous build left it */
  assert.ok(mentions(W, K, b)); assert.deepEqual((await state(W, b)).refs, []);
  age(W, b, 31); age(W, ctl, 31);
  for (let k = 0; k < 4; k++) await pass(T);
  const st = await state(W, b);
  assert.equal(st.r2, PNG, 'the image the plan shows is intact · ' + JSON.stringify(st).replace(PNG, 'PNG')); assert.equal(st.body, 'r2');
  assert.deepEqual(st.refs, [K], 'and its reference row is back');
  assert.equal(W.env.DB.q("SELECT v FROM meta WHERE k = 'imgref_scan_v1'")[0].v, 'done');
  assert.ok(gone(await state(W, ctl)), 'while the unreferenced upload of the same age is swept once the re-scan is complete');
});

/* ── finding 6 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
both(test, 'finding 6 · the parts of an abandoned chunked upload are removed after 7 days (not before); a chunked upload that completes leaves no clock behind', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, dead = id('stgdead'), live = id('stglive'), done = id('stgdone'), old = id('stgold');
  const part = (i, p, n2, body) => W.C.api('/api/img/' + i + '?p=' + p + '&n=' + n2, { method: 'PUT', cookie: S.mgr, body, headers: { 'Content-Type': 'text/plain' } });
  const staged = (i) => W.env.DB.q("SELECT COUNT(*) n FROM imgs WHERE k >= ? AND k < ?", '~stg~' + i + '~', '~stg~' + i + '\u007f')[0].n;
  const half = PNG.slice(0, 40), rest = PNG.slice(40);
  for (const i of [dead, live]) { const r = await part(i, 0, 2, half); assert.equal(r.status, 200, JSON.stringify(r.j)); assert.equal(staged(i), 1); }
  assert.equal((await part(done, 0, 2, half)).status, 200); const fin = await part(done, 1, 2, rest); assert.equal(fin.status, 200, JSON.stringify(fin.j));
  assert.equal((await state(W, done)).r2, PNG, 'the completed upload is a normal upload'); assert.equal((await state(W, done)).st, 'claim'); assert.equal(staged(done), 0);
  assert.equal(W.env.DB.q("SELECT COUNT(*) n FROM imgown WHERE img = ?", '~stg~' + done)[0].n, 0, 'no clock row is left for it');
  /* parts staged before this version carry no clock: the first pass gives them one (now) */
  raw(W).prepare("INSERT INTO imgs (k, seq, v) VALUES (?, 0, ?)").run('~stg~' + old + '~0', half);
  await pass(T);
  assert.equal(staged(dead), 1, 'inside 7 days: kept'); assert.equal(staged(old), 1);
  W.env.DB.exec("UPDATE imgown SET ts = ts - " + 8 * 864e5 + " WHERE img IN ('~stg~" + dead + "', '~stg~" + old + "')");
  W.env.DB.exec("UPDATE imgown SET ts = ts - " + 6 * 864e5 + " WHERE img = '~stg~" + live + "'");
  await pass(T);
  assert.equal(staged(dead), 0, 'abandoned 8 days ago: its parts are gone'); assert.equal(staged(old), 0, 'and the old version\'s leftovers, 8 days after their first pass');
  assert.equal(staged(live), 1, 'staged 6 days ago: kept');
  assert.equal(W.env.DB.q("SELECT COUNT(*) n FROM imgown WHERE img IN (?, ?)", '~stg~' + dead, '~stg~' + old)[0].n, 0, 'clock rows gone with them');
  const cont = await part(live, 1, 2, rest); assert.equal(cont.status, 200, 'the 6-day-old upload can still be completed · ' + JSON.stringify(cont.j)); assert.equal((await state(W, live)).r2, PNG);
  /* a staging clock is not an image for anyone */
  assert.equal(Object.keys((await W.C.api('/api/imgs', { cookie: S.super })).j).some((k) => k.indexOf('~stg~') === 0), false);
});

both(test, 'finding 6 · an upload whose D1 batch fails after the object was written leaves an object WITH an owner row: the sweep removes it; the uploader can retry meanwhile', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, i = id('halfput'), DB = W.env.DB, batch = DB.batch.bind(DB);
  let failed = 0;
  DB.batch = async (stmts) => { if (!failed && stmts.some((s) => /INTO imgs/.test(String(s.sql || s._sql || '')))) { failed++; throw new Error('TEST_ONLY D1 batch outage'); } return batch(stmts); };
  let r; try { r = await img(W, S.mgr, i, 'PUT', PNG); } finally { DB.batch = batch; }
  assert.equal(failed, 1, 'the body batch did fail'); assert.notEqual(r.status, 200);
  const o = await W.env.IMG_R2.get('img/' + i); assert.ok(o, 'the object was written before the batch failed');
  let st = await state(W, i);
  assert.equal(st.st, 'claim', 'and it has an owner row with a clock · ' + JSON.stringify(st).replace(PNG, 'PNG')); assert.equal(st.body, null);
  age(W, i, 31); await pass(T);
  st = await state(W, i); assert.ok(gone(st), 'so the sweep finds and removes the leftover object · ' + JSON.stringify(st).replace(PNG, 'PNG'));
  const again = await img(W, S.mgr, i, 'PUT', PNG); assert.equal(again.status, 200, 'and the id is free to upload again'); assert.equal((await state(W, i)).r2, PNG);
});

/* ── low: the plain-KV race ────────────────────────────────────────────────────────────────────────────────────────────────── */
both(test, 'low · plain-KV save: the sweep condemns the upload between the ownership check and the write ⇒ the key is a conflict; no record is left showing a deleted image', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, KP = dk(D, 'profile'), probe = id('probe'), i = id('race');
  await upload(W, S.mgr, probe);
  const s0 = await W.C.save(S.mgr, { [KP]: JSON.stringify({ t: TAG + ' rv', logo: probe }) });
  if (s0.status !== 200 || (s0.j.denied || {})[KP]) { console.log('# [' + mode + '] plain profile save denied to the manager — plain-path race not reachable in this mode: ' + JSON.stringify((s0.j.denied || {})[KP] || s0.j).slice(0, 80)); return; }
  await upload(W, S.mgr, i);
  const DB = W.env.DB, prepare = DB.prepare.bind(DB); let fired = 0;
  /* the ownership read of imgForeignIn (alone or inside a guarded batch): right after it returns «claim», the sweep's deciding statement lands */
  const condemn = (row) => { if (!fired && row && row.st === 'claim') { fired++; raw(W).prepare("UPDATE imgown SET st = 'dead', k = '', ts = ? WHERE img = ?").run(Date.now(), i); } };
  DB.prepare = (sql) => { const st = prepare(sql);
    if (/FROM imgown WHERE img = \?1$/.test(sql)) { const bind0 = st.bind.bind(st); st.bind = (...a) => { const b = bind0(...a); if (a[0] === i) { const first = b.first.bind(b), sync = b._batchSync.bind(b);
      b.first = async (...c) => { const row = await first(...c); condemn(row); return row; }; b._batchSync = () => { const r = sync(); condemn((r.results || [])[0]); return r; }; } return b; }; }
    return st; };
  let s; try { s = await W.C.save(S.mgr, { [KP]: JSON.stringify({ t: TAG + ' rv 2', logo: i }) }); } finally { DB.prepare = prepare; }
  assert.equal(fired, 1, 'the sweep\'s decision did land between the check and the write');
  const st = await state(W, i), rec = JSON.stringify(stored(W.env, KP) || '');
  assert.equal(rec.includes(i), false, 'the record was not written with an image that is being deleted · ' + JSON.stringify(s.j).slice(0, 200));
  assert.ok((s.j.conflicts || {})[KP] || s.status === 409, 'the key is answered as a conflict · ' + JSON.stringify(s.j).slice(0, 200));
  assert.equal(st.st, 'dead'); assert.ok(rec.includes(probe), 'the stored record is the previous one');
});

/* ── low: orphans of a unit that is no longer on the platform ──────────────────────────────────────────────────────────────── */
both(test, 'low · an orphan whose unit is no longer in the unit list (a full replace-restore dropped it) is the platform admin\'s for good: a unit re-created under that id cannot re-bind it', async (mode) => {
  const T = await scene(mode), { W, S } = T, i = await orphanOf(T, 'plan', 'gone'), K = dk(D, 'plan');
  const units = stored(W.env, K_DEPTS), setUnits = (list) => raw(W).prepare('UPDATE kv SET v = ? WHERE k = ? AND seq = 0').run(JSON.stringify(list), K_DEPTS);
  setUnits(units.filter((d) => d.id !== D));                                /* what a full replace-restore without this unit leaves */
  await pass(T);
  const st = await state(W, i); assert.equal(st.st, 'orphan'); assert.equal(st.uid, '~unit-deleted~', 'stamped by the pass · ' + JSON.stringify(st).replace(PNG, 'PNG'));
  setUnits(units);                                                          /* a unit comes back under the same id */
  const s = await edit(W, S.mgr, D, 'plan', EDIT.plan(i));
  assert.equal(s.ok, false, 'its manager cannot re-bind the old unit\'s orphan · ' + JSON.stringify(s.j).slice(0, 200)); assert.equal(s.why, 'imgown');
  assert.equal((await state(W, i)).st, 'orphan');
  const a = await edit(W, S.super, D, 'plan', EDIT.plan(i)); assert.ok(a.ok, 'the platform admin can · ' + JSON.stringify(a.j).slice(0, 200));
  assert.equal((await state(W, i)).st, 'bound'); assert.equal((await state(W, i)).k, K);
});
