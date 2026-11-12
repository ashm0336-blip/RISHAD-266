/* V7-F · third independent review, item A (HIGH) — the object store is OPTIONAL: config/wrangler.toml ships with IMG_R2 commented out and the
   worker then keeps every image body inline in D1. The second review's fix made the sweep do nothing at all without a store that can delete, so
   such an installation never reclaimed an abandoned upload, an orphan or the parts of an abandoned chunked upload.
   The rule now: without a store that can delete (no binding · a binding with no delete · a binding that is not an object store), a row whose body
   lives inline in D1 — and staged parts, which always do — is swept exactly as before; only a row whose body is the object-store marker ('~r2~')
   is skipped: not condemned, not re-clocked, not deleted, its object untouched — and the pass says so in the log (img-sweep-r2-skip, with the count).
   Skipped rows never hold the queue. With the binding back they are swept as usual. Real worker, legacy and enforce. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { D, D2, PNG, TAG, both, scene, state, gone, edit, bind, upload, age, due, EDIT } from './v7_f_img_fx.mjs';

let n = 0;
const typedSave = async (T) => { const s = await edit(T.W, T.S.mgr2, D2, 'plan', (v) => { v.floors[0].name = TAG + ' in ' + (++n); }); assert.ok(s.ok, JSON.stringify(s.j).slice(0, 200)); };
const own = (W, ids) => JSON.stringify(ids.map((i) => ({ own: W.env.DB.q('SELECT img, st, k, uid, dept, ts FROM imgown WHERE img = ?', i), body: W.env.DB.q('SELECT k, seq, v FROM imgs WHERE k = ? ORDER BY seq', i) })));
const quiet = async (fn) => { const logs = [], w = console.warn, l = console.log; console.warn = console.log = (m) => logs.push(String(m)); try { await fn(); } finally { console.warn = w; console.log = l; } return logs.map((x) => { try { return JSON.parse(x); } catch (e) { return {}; } }); };
const staged = (W, i, days) => { W.env.DB.db.prepare("INSERT INTO imgs (k, seq, v) VALUES (?, 0, 'AAAA')").run('~stg~' + i + '~0'); W.env.DB.db.prepare("INSERT INTO imgown (img, st, k, uid, dept, ts) VALUES (?, 'stage', '', '', '', ?)").run('~stg~' + i, Date.now() - days * 864e5); };
const stagedLeft = (W, i) => W.env.DB.q("SELECT COUNT(*) n FROM imgs WHERE k LIKE ?", '~stg~' + i + '~%')[0].n;

both(test, 'no object store at all (the default configuration): inline abandoned upload, inline orphan, inline condemned row and staged parts are swept', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, R2 = W.env.IMG_R2; delete W.env.IMG_R2;
  try {
    const claim = id('ic'), orphan = id('io'), dead = id('idd'), stg = id('is');
    due(W); await typedSave(T);
    await upload(W, S.mgr2, claim);
    await bind(W, S.mgr, D, 'plan', orphan); assert.ok((await edit(W, S.mgr, D, 'plan', EDIT.plan(''))).ok); assert.equal((await state(W, orphan)).st, 'orphan');
    W.env.DB.db.prepare("INSERT INTO imgown (img, st, k, uid, dept, ts) VALUES (?, 'dead', '', '', '', ?)").run(dead, Date.now() - 3600e3); W.env.DB.db.prepare("INSERT INTO imgs (k, seq, v) VALUES (?, 0, ?)").run(dead, PNG);
    staged(W, stg, 8);
    for (const i of [claim, orphan, dead]) assert.equal((await state(W, i)).body, 'inline', i + ' is stored inline');
    age(W, claim, 31); age(W, orphan, 31);
    const logs = await quiet(async () => { for (let k = 0; k < 3; k++) { due(W); await typedSave(T); } });
    for (const i of [claim, orphan, dead]) assert.ok(gone(await state(W, i)), i + ' swept · ' + JSON.stringify(await state(W, i)).replace(PNG, 'PNG'));
    assert.equal(stagedLeft(W, stg), 0, 'and the abandoned staged parts');
    assert.ok(!logs.some((l) => l.ev === 'img-sweep-off'), 'the sweep is not off');
    assert.ok(!logs.some((l) => l.ev === 'img-sweep-r2-skip'), 'and with no object-store row there is nothing to skip');
  } finally { W.env.IMG_R2 = R2; }
});

const BROKEN = {
  'no binding': () => undefined,
  'a binding that cannot delete': (R2) => ({ put: R2.put, get: R2.get }),
  'a binding that is not an object store': () => ({ fetch: async () => new Response('') })
};
for (const how of Object.keys(BROKEN)) both(test, how + ': object-store rows are skipped untouched and logged, inline rows and staged parts are swept; with the binding back the rest goes', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, DB = W.env.DB, R2 = W.env.IMG_R2;
  const rc = id('rc'), ro = id('ro'), rd = id('rd'), ic = id('ic'), io = id('io'), stg = id('st');
  due(W); await typedSave(T);
  /* object-store rows, made while the binding is there */
  await upload(W, S.mgr2, rc);
  await bind(W, S.mgr, D, 'plan', ro); assert.ok((await edit(W, S.mgr, D, 'plan', EDIT.plan(''))).ok);
  DB.db.prepare("INSERT INTO imgown (img, st, k, uid, dept, ts) VALUES (?, 'dead', '', '', '', ?)").run(rd, Date.now() - 3600e3); DB.db.prepare("INSERT INTO imgs (k, seq, v) VALUES (?, 0, '~r2~')").run(rd); await R2.put('img/' + rd, PNG);
  /* inline rows, made while there is none */
  delete W.env.IMG_R2;
  await upload(W, S.mgr2, ic);
  await bind(W, S.mgr, D, 'plan', io); assert.ok((await edit(W, S.mgr, D, 'plan', EDIT.plan(''))).ok);
  W.env.IMG_R2 = R2;
  staged(W, stg, 8);
  for (const i of [rc, ro, rd]) assert.equal((await state(W, i)).body, 'r2', i);
  for (const i of [ic, io]) assert.equal((await state(W, i)).body, 'inline', i);
  for (const i of [rc, ro, ic, io]) age(W, i, 31);
  const before = own(W, [rc, ro, rd]);
  const broken = BROKEN[how](R2); if (broken === undefined) delete W.env.IMG_R2; else W.env.IMG_R2 = broken;
  let logs;
  try { logs = await quiet(async () => { for (let k = 0; k < 3; k++) { due(W); await typedSave(T); } }); }
  finally { W.env.IMG_R2 = R2; }
  assert.equal(own(W, [rc, ro, rd]), before, 'object-store rows: not condemned, not re-clocked, not deleted');
  for (const i of [rc, ro, rd]) assert.equal(await (await R2.get('img/' + i)).text(), PNG, i + ' object untouched');
  for (const i of [ic, io]) assert.ok(gone(await state(W, i)), i + ' (inline) swept · ' + JSON.stringify(await state(W, i)).replace(PNG, 'PNG'));
  assert.equal(stagedLeft(W, stg), 0, 'staged parts swept');
  const said = logs.filter((l) => l.ev === 'img-sweep-r2-skip');
  assert.equal(said.length, 3, 'each due pass says what it skipped'); assert.equal(said[0].lvl, 'warn');
  assert.match(String(said[0].why), /^(?:no-binding|binding-cannot-delete)$/); assert.equal(said[0].n, 3, 'with the count of due object-store rows');
  assert.ok(!logs.some((l) => l.ev === 'img-sweep-off'), 'the sweep itself is not off');
  /* the binding is back */
  for (let k = 0; k < 2; k++) { due(W); DB.exec("UPDATE imgown SET ts = ts - 60000 WHERE st = 'dead'"); await typedSave(T); }
  for (const i of [rc, ro, rd]) assert.ok(gone(await state(W, i)), i + ' is swept, rows and object');
});

both(test, 'object-store rows that are skipped do not hold the queue: eight of them, older, and one inline abandoned upload — the inline one is swept', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, R2 = W.env.IMG_R2, held = [], ic = id('qi');
  due(W); await typedSave(T);
  for (let k = 0; k < 8; k++) { const i = id('q' + k); await upload(W, S.mgr2, i); age(W, i, 40); held.push(i); }
  delete W.env.IMG_R2;
  try {
    await upload(W, S.mgr2, ic); age(W, ic, 31);
    const before = own(W, held);
    await quiet(async () => { for (let k = 0; k < 2; k++) { due(W); await typedSave(T); } });
    assert.ok(gone(await state(W, ic)), 'the inline abandoned upload is swept');
    assert.equal(own(W, held), before, 'the eight object-store rows are exactly as they were');
  } finally { W.env.IMG_R2 = R2; }
  for (const i of held) assert.equal(await (await R2.get('img/' + i)).text(), PNG);
});
