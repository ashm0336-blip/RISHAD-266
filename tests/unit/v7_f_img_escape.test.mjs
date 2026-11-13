/* V7-F · second independent review, finding 6 (same class as finding 1) — a reference written with a JSON escape.
   "img_…" in a record's text IS the id once the record is parsed, but the text never contains the id: the scanner (054 imgIdsIn) saw no
   reference, no imgref row was written, the sweep's instr over kv found nothing — and the image was deleted while the record still showed it.
   The typed save had the same hole (it stores the parsed value; its reference rows came from the raw text).
   Fourth review: reading such escapes with a per-level decoder was proven unsound at depth >= 3; the rule became conservative (a save carrying
   a \u00XX escape of an id character or of '\' was refused, 'img-escape'; such a value held every pass).
   Owner decision after the fifth review (054 imgDeepEach): user text is not refused — an escaped spelling of an id IS that id. A save that
   spells its image by an escape is accepted, the image bound and referenced; a value no save of this version wrote (an older version, a
   direct write) that spells one keeps that image and holds nothing — the other orphans are swept in the same pass.
   Real worker, legacy and enforce, rows and R2 bytes. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { D, D2, PNG, TAG, dk, both, scene, state, gone, edit, upload, age, due, stored, read } from './v7_f_img_fx.mjs';
import { taskCommandBody, operationSaveBody } from './tasks_fx.mjs';

let n = 0;
const typedSave = async (T) => { const s = await edit(T.W, T.S.mgr2, D2, 'plan', (v) => { v.floors[0].name = TAG + ' e ' + (++n); }); assert.ok(s.ok, JSON.stringify(s.j).slice(0, 200)); };
const pass = async (T) => { due(T.W); await typedSave(T); };
const esc = (i) => '\\u0069' + i.slice(1);                                  /* the same id, its first letter spelled as an escape */
const meta = (W, k) => (W.env.DB.q('SELECT v FROM meta WHERE k = ?', k)[0] || {}).v;
const own = (W, i) => W.env.DB.q('SELECT st, ts FROM imgown WHERE img = ?', i)[0] || null;
/* the one-time scans are behind us: from here on the sweep condemns whatever it cannot find a reference for */
async function settled(T) {
  const { W, S, id } = T, c = id('warm'); await upload(W, S.mgr2, c); age(W, c, 31);
  for (let k = 0; k < 4 && !gone(await state(W, c)); k++) await pass(T);
  assert.ok(gone(await state(W, c)), 'warm-up: the sweep is condemning');
  assert.equal(meta(W, 'imgref_scan_v1'), 'done');
}
const control = async (T) => { const c = T.id('ctl' + (++n)); await upload(T.W, T.S.mgr2, c); return c; };

both(test, 'a plain record saved with the id spelled by a \\u escape is accepted as the id it spells — stored as sent, the image bound to the record and referenced', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, KP = dk(D, 'profile'), logo = id('esc');
  await upload(W, S.mgr, logo);
  const text = '{"t":"' + TAG + '","logo":"' + esc(logo) + '"}';
  assert.equal(JSON.parse(text).logo, logo); assert.ok(!text.includes(logo), 'the text never spells the id');
  const s1 = await W.C.save(S.mgr, { [KP]: text });
  assert.equal((s1.j.denied || {})[KP], undefined, JSON.stringify(s1.j).slice(0, 200));
  assert.equal((W.env.DB.q('SELECT v FROM kv WHERE k = ?', KP)[0] || {}).v, text, 'stored as sent');
  assert.deepEqual((await state(W, logo)).refs, [KP], 'registered'); assert.equal((await state(W, logo)).st, 'bound'); assert.equal((await state(W, logo)).k, KP);
  /* the same record written plainly is accepted and registered, as before */
  const s2 = await W.C.save(S.mgr, { [KP]: JSON.stringify({ t: TAG, logo }) });
  assert.ok(!(s2.j.denied || {})[KP], JSON.stringify(s2.j).slice(0, 200)); assert.deepEqual((await state(W, logo)).refs, [KP]);
  /* and another unit's manager spelling it the same way is refused as for the literal id */
  const K2 = dk(D2, 'profile'), s3 = await W.C.save(S.mgr2, { [K2]: text });
  assert.equal(((s3.j.denied || {})[K2] || {}).why, 'imgown', JSON.stringify(s3.j).slice(0, 200)); assert.deepEqual((await state(W, logo)).refs, [KP]);
});

both(test, 'a typed save whose text spells the id by a \\u escape is accepted as the id it spells — the plan stores the id, the image is bound and referenced', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, K = dk(D, 'plan'), i = id('tesc');
  await upload(W, S.mgr, i);
  const g = await read(W, S.mgr, K); g.v.floors[0].iid = i;
  const text = JSON.stringify(g.v).replace('"' + i + '"', '"' + esc(i) + '"');
  assert.ok(!text.includes(i)); assert.equal(JSON.parse(text).floors[0].iid, i);
  const p = '/api/save', body = { set: { [K]: text }, del: [], base: { [K]: g.base }, why: { [K]: TAG } };
  const r = await W.C.api(p, { method: 'POST', cookie: S.mgr, body: operationSaveBody(W.env, p, taskCommandBody(W.env, p, body)) });
  assert.equal((r.j.denied || {})[K], undefined, JSON.stringify(r.j).slice(0, 300)); assert.equal(r.status, 200);
  assert.equal(stored(W.env, K).floors[0].iid, i, 'the live plan names the image'); assert.deepEqual((await state(W, i)).refs, [K]);
  assert.equal((await state(W, i)).st, 'bound'); assert.equal((await state(W, i)).k, K);
});

both(test, 'a plain record no save of this version wrote (an older version, a direct write) with an escaped id — in one row, nested in a JSON string, an escape cut by a row boundary, the id cut by a row boundary: the image it spells is kept, no pass holds, an unrelated orphan is swept in the same pass; once they are gone the kept ones are swept', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, KA = dk(D, 'profile'), KB = dk(D2, 'profile'), KD = dk(D, 'notes'), KE = dk(D2, 'notes'); await settled(T);
  const ins = W.env.DB.db.prepare('INSERT OR REPLACE INTO kv (k, seq, v) VALUES (?, ?, ?)'), del = W.env.DB.db.prepare('DELETE FROM kv WHERE k = ?');
  const cases = {
    [KA]: (a) => ins.run(KA, 0, '{"t":"' + TAG + '","logo":"' + esc(a) + '"}'),
    [KB]: (b) => { const whole = '{"t":"' + TAG + '","logo":"' + esc(b) + '"}', cut = whole.indexOf('\\u0069') + 3;      /* the escape itself straddles seq 0 / seq 1 */
      ins.run(KB, 0, whole.slice(0, cut)); ins.run(KB, 1, whole.slice(cut)); },
    [KD]: (d) => { const inner = JSON.stringify({ logo: 'X' }).replace('X', '\\u0069\\u006D' + d.slice(2)), nested = JSON.stringify({ t: TAG, doc: inner });   /* a JSON string inside a JSON string, two letters escaped (one in upper-case hex) */
      assert.equal(JSON.parse(JSON.parse(nested).doc).logo, d); assert.ok(!nested.includes(d)); ins.run(KD, 0, nested); },
    [KE]: (e) => { const w2 = '{"t":"' + TAG + '","logo":"' + esc(e) + '"}', cut2 = w2.indexOf(e.slice(1)) + 6;           /* the id straddles the rows, its escape wholly in the first */
      ins.run(KE, 0, w2.slice(0, cut2)); ins.run(KE, 1, w2.slice(cut2)); } };
  /* each spelling alone keeps the image it spells (the cut ones are seen only through the row-boundary window) — and nothing else */
  const kept = []; let q = 0;
  for (const [k, put] of Object.entries(cases)) {
    for (const x of Object.keys(cases)) del.run(x);
    const i = id('old' + (q++)), c = await control(T); await upload(W, S.mgr, i); put(i); kept.push(i);
    age(W, i, 31); age(W, c, 31);
    const before = own(W, i), logs = [], log = console.log, warn = console.warn; console.log = console.warn = (m) => logs.push(String(m));
    try { await pass(T); await pass(T); } finally { console.log = log; console.warn = warn; }
    const s = await state(W, i); assert.equal(s.r2, PNG, 'LIVE-REFERENCED IMAGE DELETED: ' + k); assert.equal(s.st, 'claim', k + ': kept, the uploader\'s still');
    assert.ok(own(W, i).ts > before.ts, k + ': kept as a referenced upload (its clock restarted)');
    assert.equal(logs.filter((m) => m.includes('img-sweep-escape-hold')).length, 0, k + ': no pass held');
    assert.ok(gone(await state(W, c)), k + ': the unrelated orphan is swept while the text is there');
  }
  for (const x of Object.keys(cases)) del.run(x);
  for (const i of kept) age(W, i, 31);
  await pass(T); await pass(T);
  for (const i of kept) assert.ok(gone(await state(W, i)), i + ' swept once nothing names it');
});

both(test, 'the escapes an ordinary client writes (control characters: \\u000b, \\u001f) bind nothing and stall nothing', async (mode) => {
  const T = await scene(mode), { W, S } = T, KP = dk(D, 'profile'); await settled(T);
  const s1 = await W.C.save(S.mgr, { [KP]: JSON.stringify({ t: TAG, note: 'a\u000bb\u001fc img_' }) }); assert.equal(s1.status, 200);
  assert.ok(String(W.env.DB.q('SELECT v FROM kv WHERE k = ?', KP)[0].v).includes('\\u000b'));
  const c = await control(T); age(W, c, 31); await pass(T); await pass(T);
  assert.ok(gone(await state(W, c)), 'the sweep goes on');
  assert.equal(W.env.DB.q('SELECT COUNT(*) n FROM imgref WHERE k = ?', KP)[0].n, 0);
});
