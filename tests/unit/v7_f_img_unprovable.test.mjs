/* V7-F · second independent review, finding 1 — the owner's hard condition: the sweep never deletes an image a live record references.
   The upload accepts ids of the shape ^[A-Za-z0-9_]{1,128}$; the reference scanner (054 imgIdsIn) recognises only (img|szp)_[a-z0-9]+_[a-z0-9]+.
   An id outside the scanner's shape, placed in a typed record by the ordinary save, gets no imgref row and lives in no kv value — so nothing the
   sweep can look at mentions it, and it was deleted after 31 days while the plan still showed it. The rule now: an id the scanner could not have
   matched is never condemned (it is "unprovable": kept, counted, its clock restarted so it does not hold the queue). What PUT accepts is unchanged.
   Real worker, legacy and enforce, upload state and orphan state, rows and R2 bytes. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { D, D2, PNG, TAG, dk, scene, state, gone, img, edit, upload, age, due, EDIT, stored, MODES } from './v7_f_img_fx.mjs';

let n = 0;
const typedSave = async (T) => { const s = await edit(T.W, T.S.mgr2, D2, 'plan', (v) => { v.floors[0].name = TAG + ' u ' + (++n); }); assert.ok(s.ok, JSON.stringify(s.j).slice(0, 200)); };
const pass = async (T) => { due(T.W); await typedSave(T); };
const SHAPES = {
  three: (x) => 'img_p' + x + '_a_b',            /* a third segment: the scanner stops at img_p…_a */
  upper: (x) => 'IMG_' + x.toUpperCase() + '_A1', /* upper case throughout */
  upper2: (x) => 'img_p' + x + '_A1',             /* upper case in the last segment */
  short: (x) => 'x' + x                           /* the short id of an older tool */
};

for (const mode of MODES) for (const st of ['claim', 'orphan']) for (const shape of Object.keys(SHAPES)) {
  test('an id the scanner cannot match [' + shape + '], referenced by the plan through the typed save, is still there 31 days later — as ' + st + ' [' + mode + ']', { timeout: 600000 }, async () => {
    const T = await scene(mode), { W, S, x } = T, i = SHAPES[shape](x), K = dk(D, 'plan');
    await upload(W, S.mgr, i);
    const s = await edit(W, S.mgr, D, 'plan', EDIT.plan(i));
    assert.ok(s.ok, 'the typed save accepts the id (unchanged behaviour) · ' + JSON.stringify(s.j).slice(0, 200));
    assert.ok(JSON.stringify(stored(W.env, K)).includes('"' + i + '"'), 'the live plan record mentions the id');
    assert.deepEqual((await state(W, i)).refs, [], 'and no reference row exists for it — the scanner did not see it');
    if (st === 'orphan') W.env.DB.exec("UPDATE imgown SET st = 'orphan', k = '' WHERE img = '" + i + "'");   /* the same row as an orphan (a unit operation, an older build) */
    assert.equal((await state(W, i)).st, st);
    age(W, i, 31); await pass(T); await pass(T);
    const after = await state(W, i);
    assert.equal(after.r2, PNG, 'LIVE-REFERENCED IMAGE DELETED: ' + i);
    assert.equal(after.body, 'r2', 'its body row is there'); assert.equal(after.st, st, 'its owner row is unchanged in kind (never condemned, never handed to anyone)');
    assert.ok(JSON.stringify(stored(W.env, K)).includes('"' + i + '"'), 'and the plan still shows it');
    if (st === 'claim') assert.equal((await img(W, S.mgr, i)).status, 200, 'and its uploader still reads it');   /* who reads an orphan is another rule, not this test's */
  });
}

/* third review, item D (v7_f_img_oddref.test.mjs): an odd id that NOTHING mentions is now swept — so the seven here are mentioned by a record (a legacy
   kv value), which is what makes them unprovable-and-kept; the rest of this test is as it was */
for (const mode of MODES) test('unprovable ids do not hold the queue: seven of them, older, and one ordinary abandoned upload — the ordinary one is swept, the seven stay [' + mode + ']', { timeout: 600000 }, async () => {
  const T = await scene(mode), { W, S, x, id } = T, odd = [], ok = id('q');
  for (let k = 0; k < 7; k++) { const i = 'IMG_' + x.toUpperCase() + '_Q' + k; await upload(W, S.mgr2, i); age(W, i, 40); odd.push(i); }
  W.env.DB.db.prepare('INSERT OR REPLACE INTO kv (k, seq, v) VALUES (?, 0, ?)').run(dk(D2, 'notes'), JSON.stringify({ t: TAG, logos: odd }));
  await upload(W, S.mgr2, ok); age(W, ok, 31);
  await pass(T); await pass(T);
  assert.ok(gone(await state(W, ok)), 'the ordinary abandoned upload is deleted (the batch of 6 was not held by the seven)');
  for (const i of odd) { const s = await state(W, i); assert.equal(s.r2, PNG, i + ' kept'); assert.equal(s.st, 'claim'); }
  const logs = [], log = console.log; console.log = (m) => { logs.push(String(m)); };
  try { for (const i of odd) age(W, i, 40); await pass(T); } finally { console.log = log; }
  assert.ok(logs.some((l) => /"ev":"img-sweep-unprovable"/.test(l) && /"n":6/.test(l)), 'and the pass says so in the log, with the count');
});
