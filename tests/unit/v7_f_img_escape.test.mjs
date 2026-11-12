/* V7-F · second independent review, finding 6 (same class as finding 1) — a reference written with a JSON escape.
   "img_…" in a record's text IS the id once the record is parsed, but the text never contains the id: the scanner (054 imgIdsIn) saw no
   reference, no imgref row was written, the sweep's instr over kv found nothing — and the image was deleted while the record still showed it.
   The typed save had the same hole (it stores the parsed value; its reference rows came from the raw text).
   Now: the scanner reads such escapes (every save — plain and typed — registers the reference), and the sweep's one deciding statement reads
   them too in every kv row (054 IMG_ESC_CTE), so a value no save of this version indexed keeps its image. Real worker, legacy and enforce, rows and R2 bytes.
   Every test carries a control: an unreferenced upload of the same age IS swept by the same passes. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { D, D2, PNG, TAG, dk, both, scene, state, gone, edit, upload, age, due, stored, read } from './v7_f_img_fx.mjs';
import { taskCommandBody, operationSaveBody } from './tasks_fx.mjs';

let n = 0;
const typedSave = async (T) => { const s = await edit(T.W, T.S.mgr2, D2, 'plan', (v) => { v.floors[0].name = TAG + ' e ' + (++n); }); assert.ok(s.ok, JSON.stringify(s.j).slice(0, 200)); };
const pass = async (T) => { due(T.W); await typedSave(T); };
const esc = (i) => '\\u0069' + i.slice(1);                                  /* the same id, its first letter spelled as an escape */
const meta = (W, k) => (W.env.DB.q('SELECT v FROM meta WHERE k = ?', k)[0] || {}).v;
/* the one-time scans are behind us: from here on the sweep condemns whatever it cannot find a reference for */
async function settled(T) {
  const { W, S, id } = T, c = id('warm'); await upload(W, S.mgr2, c); age(W, c, 31);
  for (let k = 0; k < 4 && !gone(await state(W, c)); k++) await pass(T);
  assert.ok(gone(await state(W, c)), 'warm-up: the sweep is condemning');
  assert.equal(meta(W, 'imgref_scan_v1'), 'done');
}
const control = async (T) => { const c = T.id('ctl' + (++n)); await upload(T.W, T.S.mgr2, c); return c; };
const kept = async (T, i, c) => {
  age(T.W, i, 31); age(T.W, c, 31); await pass(T); await pass(T);
  assert.ok(gone(await state(T.W, c)), 'control: the unreferenced upload of the same age is swept');
  const s = await state(T.W, i); assert.equal(s.r2, PNG, 'LIVE-REFERENCED IMAGE DELETED: ' + i); assert.equal(s.body, 'r2'); assert.notEqual(s.st, 'dead');
  return s;
};

both(test, 'a plain record saved with the id spelled by a \\u escape: the reference is registered and the image is there 31 days later', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, KP = dk(D, 'profile'), logo = id('esc'); await settled(T);
  await upload(W, S.mgr, logo); const c = await control(T);
  const text = '{"t":"' + TAG + '","logo":"' + esc(logo) + '"}';
  assert.equal(JSON.parse(text).logo, logo); assert.ok(!text.includes(logo), 'the text never spells the id');
  const s1 = await W.C.save(S.mgr, { [KP]: text });
  assert.equal(s1.status, 200); assert.ok(!(s1.j.denied || {})[KP], JSON.stringify(s1.j).slice(0, 200));
  assert.ok(String(W.env.DB.q('SELECT v FROM kv WHERE k = ?', KP)[0].v).includes('\\u0069'), 'stored as sent, escape and all');
  const s = await kept(T, logo, c);
  assert.deepEqual(s.refs, [KP], 'the save wrote its reference row');
  assert.equal(JSON.parse(W.env.DB.q('SELECT v FROM kv WHERE k = ?', KP)[0].v).logo, logo, 'and the record still shows it');
});

both(test, 'a typed save whose text spells the id by a \\u escape (the stored plan holds the id itself): the reference is registered at the save, the image is there 31 days later', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, K = dk(D, 'plan'), i = id('tesc'); await settled(T);
  await upload(W, S.mgr, i); const c = await control(T);
  const g = await read(W, S.mgr, K); g.v.floors[0].iid = i;
  const text = JSON.stringify(g.v).replace('"' + i + '"', '"' + esc(i) + '"');
  assert.ok(!text.includes(i)); assert.equal(JSON.parse(text).floors[0].iid, i);
  const p = '/api/save', body = { set: { [K]: text }, del: [], base: { [K]: g.base }, why: { [K]: TAG } };
  const r = await W.C.api(p, { method: 'POST', cookie: S.mgr, body: operationSaveBody(W.env, p, taskCommandBody(W.env, p, body)) });
  assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 200)); assert.ok(!(r.j.denied || {})[K] && !(r.j.conflicts || {})[K]);
  assert.equal(stored(W.env, K).floors[0].iid, i, 'the live plan holds the id');
  assert.deepEqual((await state(W, i)).refs, [K], 'and the save wrote its reference row');
  await kept(T, i, c);
});

both(test, 'a plain record no save of this version indexed (an older version, a restore) with an escaped id and no reference row — in one row, nested in a JSON string, and cut by a row boundary: kept', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, a = id('old'), b = id('cut'), d = id('nest'), e = id('cutid'), KA = dk(D, 'profile'), KB = dk(D2, 'profile'), KD = dk(D, 'notes'), KE = dk(D2, 'notes'); await settled(T);
  for (const i of [a, b, d, e]) await upload(W, S.mgr, i);
  const c = await control(T);
  const ins = W.env.DB.db.prepare('INSERT OR REPLACE INTO kv (k, seq, v) VALUES (?, ?, ?)');
  ins.run(KA, 0, '{"t":"' + TAG + '","logo":"' + esc(a) + '"}');
  const whole = '{"t":"' + TAG + '","logo":"' + esc(b) + '"}', cut = whole.indexOf('\\u0069') + 3;      /* the escape itself straddles seq 0 / seq 1 */
  ins.run(KB, 0, whole.slice(0, cut)); ins.run(KB, 1, whole.slice(cut));
  const inner = JSON.stringify({ logo: 'X' }).replace('X', '\\u0069\\u006D' + d.slice(2)), nested = JSON.stringify({ t: TAG, doc: inner });   /* a JSON string inside a JSON string, two letters escaped (one in upper-case hex) */
  assert.equal(JSON.parse(JSON.parse(nested).doc).logo, d); assert.ok(!nested.includes(d)); ins.run(KD, 0, nested);
  const w2 = '{"t":"' + TAG + '","logo":"' + esc(e) + '"}', cut2 = w2.indexOf(e.slice(1)) + 6;           /* the id straddles the rows, its escape wholly in the first */
  ins.run(KE, 0, w2.slice(0, cut2)); ins.run(KE, 1, w2.slice(cut2));
  for (const i of [a, b, d, e]) { assert.deepEqual((await state(W, i)).refs, []); age(W, i, 31); }
  await kept(T, a, c);
  for (const i of [b, d, e]) { const s = await state(W, i); assert.equal(s.r2, PNG, 'LIVE-REFERENCED IMAGE DELETED: ' + i); assert.notEqual(s.st, 'dead'); }
});

both(test, 'the escapes an ordinary client writes (control characters: \\u000b, \\u001f) bind nothing and stall nothing', async (mode) => {
  const T = await scene(mode), { W, S } = T, KP = dk(D, 'profile'); await settled(T);
  const s1 = await W.C.save(S.mgr, { [KP]: JSON.stringify({ t: TAG, note: 'a\u000bb\u001fc img_' }) }); assert.equal(s1.status, 200);
  assert.ok(String(W.env.DB.q('SELECT v FROM kv WHERE k = ?', KP)[0].v).includes('\\u000b'));
  const c = await control(T); age(W, c, 31); await pass(T); await pass(T);
  assert.ok(gone(await state(W, c)), 'the sweep goes on');
  assert.equal(W.env.DB.q('SELECT COUNT(*) n FROM imgref WHERE k = ?', KP)[0].n, 0);
});
