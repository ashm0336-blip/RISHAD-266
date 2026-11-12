/* V7-F · third independent review, item D — an upload under an id the reference scanner cannot match (PUT accepts ^[A-Za-z0-9_]{1,128}$, the
   scanner sees (img|szp)_[a-z0-9]+_[a-z0-9]+) was "unprovable → kept for ever": any uploader could make storage that is never reclaimed.
   What PUT accepts is NOT changed. Now the sweep looks for the id's literal text everywhere references live (fourth review: literally only —
   an escaped spelling anywhere holds the whole pass, tests/unit/v7_f_img_literal.test.mjs) — kv
   (rows and row boundaries), every ops_* table (the typed records), seized_item_photos, award_records: found anywhere → kept, its row unchanged
   in kind (as before); found nowhere → swept like any other. At most 2 such ids are decided per pass; the others met wait an hour, so they never
   hold the queue. Real worker, legacy and enforce, rows and R2 bytes. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { D, D2, PNG, TAG, dk, both, scene, state, gone, edit, upload, age, due, EDIT, stored } from './v7_f_img_fx.mjs';

let n = 0;
const typedSave = async (T) => { const s = await edit(T.W, T.S.mgr2, D2, 'plan', (v) => { v.floors[0].name = TAG + ' od ' + (++n); }); assert.ok(s.ok, JSON.stringify(s.j).slice(0, 200)); };
const pass = async (T) => { due(T.W); await typedSave(T); };
/* an hour passes for the ids a pass set aside (and the sweep's minutes) */
const hour = (W) => { W.env.DB.exec("UPDATE imgown SET ts = ts - 3700000 WHERE st IN ('claim', 'orphan')"); due(W); };
const SHAPES = { upper: (x) => 'IMG_' + x.toUpperCase() + '_A', junk: (x) => 'junk' + x, three: (x) => 'img_' + x + '_a_b', upper2: (x) => 'img_p' + x + '_A1' };

both(test, 'unreferenced uploads under odd ids are swept (rows and object), a control too', async (mode) => {
  const T = await scene(mode), { W, S, x, id } = T, ids = Object.values(SHAPES).map((f) => f(x)), ctl = id('ctl');
  for (const i of ids) await upload(W, S.mgr2, i); await upload(W, S.mgr2, ctl);
  for (const i of ids.concat(ctl)) age(W, i, 31);
  for (let k = 0; k < 4; k++) { await pass(T); hour(W); }
  for (const i of ids.concat(ctl)) assert.ok(gone(await state(W, i)), i + ' swept · ' + JSON.stringify(await state(W, i)).replace(PNG, 'PNG'));
});

both(test, 'an odd id referenced anywhere is kept — typed record, kv text, kv row boundary, award record — and keeps its kind', async (mode) => {
  const T = await scene(mode), { W, S, x, id } = T, DB = W.env.DB.db, ctl = id('ctl2');
  const ref = { typed: 'IMG_' + x.toUpperCase() + '_T', kvText: 'junk' + x + 'k', kvCut: 'img_' + x + '_c_d', award: 'aw' + x };
  for (const i of Object.values(ref)) await upload(W, S.mgr, i); await upload(W, S.mgr2, ctl);
  assert.ok((await edit(W, S.mgr, D, 'plan', EDIT.plan(ref.typed))).ok, 'typed save accepts the odd id (unchanged)');
  assert.ok(JSON.stringify(stored(W.env, dk(D, 'plan'))).includes('"' + ref.typed + '"')); assert.deepEqual((await state(W, ref.typed)).refs, []);
  const ins = DB.prepare('INSERT OR REPLACE INTO kv (k, seq, v) VALUES (?, ?, ?)');
  ins.run(dk(D, 'notes'), 0, JSON.stringify({ t: TAG, logo: ref.kvText }));
  const cutAt = 7; ins.run(dk(D, 'notes3'), 0, '{"t":"' + TAG + '","logo":"' + ref.kvCut.slice(0, cutAt)); ins.run(dk(D, 'notes3'), 1, ref.kvCut.slice(cutAt) + '"}');
  DB.prepare('INSERT INTO award_records (department_id, record_id, sequence, picture, presence_mask, case_text_kind, answers_kind, scores_kind) VALUES (?, ?, ?, ?, 0, 0, 0, 0)').run(D, 'tst_aw_' + x, 900000 + n, ref.award);
  DB.prepare("UPDATE imgown SET st = 'orphan', k = '' WHERE img = ?").run(ref.kvText);   /* one of them as an orphan: it stays an orphan */
  const before = {}; for (const i of Object.values(ref)) before[i] = (await state(W, i)).st;
  for (const i of Object.values(ref).concat(ctl)) age(W, i, 31);
  for (let k = 0; k < 4; k++) { await pass(T); hour(W); }
  assert.ok(gone(await state(W, ctl)), 'control swept');
  for (const [nm, i] of Object.entries(ref)) {
    const s = await state(W, i);
    assert.equal(s.r2, PNG, 'LIVE-REFERENCED IMAGE DELETED (' + nm + '): ' + i); assert.equal(s.st, before[i], nm + ': kind unchanged (' + before[i] + ')');
  }
});

both(test, 'at most 2 odd ids are decided per pass; ten of them older than one ordinary upload do not hold it', async (mode) => {
  const T = await scene(mode), { W, S, x, id } = T, odd = [], ok = id('q');
  for (let k = 0; k < 10; k++) { const i = 'Q' + x + '_' + k; await upload(W, S.mgr2, i); age(W, i, 40); odd.push(i); }
  await upload(W, S.mgr2, ok); age(W, ok, 31);
  const left = async () => { let c = 0; for (const i of odd) if (!gone(await state(W, i))) c++; return c; };
  await pass(T); assert.equal(await left(), 8, 'first pass: two decided (swept), the others set aside');
  await pass(T); assert.ok(gone(await state(W, ok)), 'the ordinary upload is swept by the next pass');
  assert.ok(await left() >= 6, 'and still at most two odd ids per pass');
  for (let k = 0; k < 8 && await left(); k++) { hour(W); await pass(T); }
  assert.equal(await left(), 0, 'the set-aside ones are swept within the next passes');
});
