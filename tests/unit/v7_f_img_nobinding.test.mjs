/* V7-F · second independent review (LOW) — the object store is not bound, or is bound to something that cannot delete.
   Before: the pass condemned its candidates and removed their rows without deleting any object (there was no store to ask): when the binding came
   back, the objects were still in the bucket with nothing in the database that knew them — never deleted, never readable.
   Now: without a store that can delete, the sweep does nothing at all — no row deleted, no row condemned, no clock moved — and says why in the log.
   When the binding is back, the same pass sweeps as usual. Real worker, legacy and enforce. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { D, D2, PNG, TAG, both, scene, state, gone, edit, bind, upload, age, due, EDIT } from './v7_f_img_fx.mjs';

let n = 0;
const typedSave = async (T) => { const s = await edit(T.W, T.S.mgr2, D2, 'plan', (v) => { v.floors[0].name = TAG + ' nb ' + (++n); }); assert.ok(s.ok, JSON.stringify(s.j).slice(0, 200)); };
const rows = (W) => JSON.stringify({ own: W.env.DB.q('SELECT img, st, k, uid, dept, ts FROM imgown ORDER BY img'), body: W.env.DB.q('SELECT k, seq, length(v) n FROM imgs ORDER BY k, seq'), ref: W.env.DB.q('SELECT img, k FROM imgref ORDER BY img, k') });

const BROKEN = {
  'no binding': () => undefined,
  'a binding that cannot delete': (R2) => ({ put: R2.put, get: R2.get }),
  'a binding that is not an object store': () => ({ fetch: async () => new Response('') })
};
for (const how of Object.keys(BROKEN)) both(test, how + ': the sweep does nothing at all and says why; with the binding back it sweeps', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, DB = W.env.DB, R2 = W.env.IMG_R2, claim = id('nbc'), orphan = id('nbo'), dead = id('nbd'), staged = id('nbs');
  due(W); await typedSave(T);
  await upload(W, S.mgr2, claim);
  await bind(W, S.mgr, D, 'plan', orphan); assert.ok((await edit(W, S.mgr, D, 'plan', EDIT.plan(''))).ok); assert.equal((await state(W, orphan)).st, 'orphan');
  DB.db.prepare("INSERT INTO imgown (img, st, k, uid, dept, ts) VALUES (?, 'dead', '', '', '', ?)").run(dead, Date.now() - 3600e3); DB.db.prepare("INSERT INTO imgs (k, seq, v) VALUES (?, 0, '~r2~')").run(dead); await R2.put('img/' + dead, PNG);
  DB.db.prepare("INSERT INTO imgs (k, seq, v) VALUES (?, 0, 'AAAA')").run('~stg~' + staged + '~0'); DB.db.prepare("INSERT INTO imgown (img, st, k, uid, dept, ts) VALUES (?, 'stage', '', '', '', ?)").run('~stg~' + staged, Date.now() - 8 * 864e5);
  age(W, claim, 31); age(W, orphan, 31);
  const before = rows(W), logs = [], warn = console.warn, log = console.log;
  const broken = BROKEN[how](R2); if (broken === undefined) delete W.env.IMG_R2; else W.env.IMG_R2 = broken;
  console.warn = console.log = (m) => { logs.push(String(m)); };
  try { for (let k = 0; k < 3; k++) { due(W); await typedSave(T); } } finally { console.warn = warn; console.log = log; W.env.IMG_R2 = R2; }
  assert.equal(rows(W), before, 'not one image row changed: nothing deleted, nothing condemned, no clock moved');
  for (const i of [claim, orphan, dead]) assert.equal(await (await R2.get('img/' + i)).text(), PNG, 'and every object is where it was');
  const said = logs.map((l) => { try { return JSON.parse(l); } catch (e) { return {}; } }).filter((l) => l.ev === 'img-sweep-off');
  assert.equal(said.length, 3, 'each due pass says it did not run'); assert.equal(said[0].lvl, 'warn'); assert.match(String(said[0].why), /^(?:no-binding|binding-cannot-delete)$/);
  /* the binding is back */
  for (let k = 0; k < 2; k++) { due(W); DB.exec("UPDATE imgown SET ts = ts - 60000 WHERE st = 'dead'"); await typedSave(T); }
  for (const i of [claim, orphan, dead]) assert.ok(gone(await state(W, i)), i + ' is swept, rows and object');
  assert.equal(DB.q("SELECT COUNT(*) n FROM imgs WHERE k LIKE '~stg~%'")[0].n, 0, 'and the abandoned staged parts');
});
