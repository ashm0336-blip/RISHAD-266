/* V7-F · third independent review, items B + C — the escape decoding of the save (JS, 054 imgIdsIn) and of the sweep (SQL, 054 IMG_ESC_CTE).
   B (owner's hard condition): the sweep's SQL decoder dropped EVERY backslash and then decoded any 'u00XX' — plain text included — so an id whose
     own text holds e.g. 'u0061', mentioned by a legacy record with one letter escaped, was rewritten, not found, and its image deleted.
   C: the save decoded one level, the sweep all of them — a nested spelling (\u005cu0069…) slipped past the ownership check of the plain save.
   Now: one decoding for both — genuine escapes only (backslash + u00 + two hex digits), ordered literal replacements per level, repeated to a fixed
   point (at most 8 levels); anything still not settled after that is refused on save and makes the sweep condemn nothing.
   The parity test feeds the SAME inputs (the reviewer's cases + generated spellings + random token soup) to the worker's own JS scanner and to the
   worker's own SQL (run in SQLite) and asserts they find the same ids. Real worker for the rest, legacy and enforce, rows and R2 bytes. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { internals } from './internals.mjs';
import { WORKER } from './harness.mjs';
import { D, D2, PNG, TAG, dk, both, scene, state, gone, edit, upload, age, due, EDIT } from './v7_f_img_fx.mjs';

const RX = /(?:img|szp)_[a-z0-9]+_[a-z0-9]+/g;
const scan = (texts) => { const o = new Set(); for (const t of texts) for (const m of String(t).matchAll(RX)) o.add(m[0]); return [...o].sort(); };
let rnd = 0x5eed1234;
const rand = () => { rnd |= 0; rnd = (rnd + 0x6d2b79f5) | 0; let t = Math.imul(rnd ^ (rnd >>> 15), 1 | rnd); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (a) => a[Math.floor(rand() * a.length)];
const hex2 = (c, up) => { const h = c.toString(16).padStart(2, '0'); return up ? h.toUpperCase() : h; };
/* one id character spelled as an escape (either hex case) */
const escCh = (ch) => '\\u00' + hex2(ch.charCodeAt(0), rand() < 0.3);
/* a text one JSON level deeper: its backslashes doubled (JSON.stringify) or spelled \u005c (either case) */
const nest = (t) => rand() < 0.6 ? t.replace(/\\/g, '\\\\') : t.replace(/\\/g, () => '\\u005' + (rand() < 0.5 ? 'c' : 'C'));
function spell(id, depth, p) { let t = [...id].map((ch) => rand() < p ? escCh(ch) : ch).join(''); for (let k = 0; k < depth; k++) t = nest(t); return t; }
const TOK = ['\\', '\\\\', 'u', 'u00', '\\u00', '\\u005c', '\\u005C', '\\u0069', '\\u0049', '\\u006D', '\\u006d', '\\u0067', '\\u005f', '\\u005F', '\\u0061', 'u0061', 'u0069',
  'u005c', 'img_', 'szp_', 'i', 'mg', '_', 'a', 'b', '1', '0', '"', ':', '{', '}', 'x', '6', '9', '5', 'c', 'C', 'F', 'f', '\\u0030', '\\u007a', '\\u007A', '\\u003a', '\\u0075', '\\u0030\\u0030'];

function corpus() {
  const id = 'img_v7fq_u0061b', id2 = 'img_au0069q_z9', out = [
    /* the reviewer's cases */
    '{"logo":"img_a_b"}',                                        // plain
    '{"logo":"\\u0069mg_a_b"}',                                  // single
    '{"d":"{\\"logo\\":\\"\\\\u0069mg_a_b\\"}"}',               // nested (standard: \\u0069)
    '{"d":"{\\"logo\\":\\"\\u005cu0069mg_a_b\\"}"}',            // nested through \u005c
    '{"d":"\\\\\\\\u0069mg_a_b"}',                               // double backslash, deeper
    '{"logo":"\\u0069MG_A_B \\u0049mg_a_b \\u006Dimg_q_r"}',    // upper-case hex and upper-case letters
    '{"logo":"\\u0069' + id.slice(1) + '"}',                    // an id that itself holds u0061 (A1)
    '{"logo":"\\u0069' + id2.slice(1) + '"}',                   // … and u0069
    '{"a":"img_x_u0061b","b":"u0069mg_c_d","c":"\\\\u0061"}',   // ids with u00 in plain text, an escaped backslash
    '{"m":"szp_1_2 \\u0073zp_3_4 \\\\u005cu0073zp_5_6 \\u005c\\u0075\\u0030\\u0030\\u0036\\u0039mg_7_8"}',   // mixed, an escape spelled by escapes
    '\\u005cu005cu005cu0069mg_n_n', '\\u005Cu005cu005Cu005cu0069mg_m_m', 'img_a_b\\u0063\\u0064', '\\u0030\\u0030\\u0036\\u0039'
  ];
  for (let k = 0; k < 1500; k++) {
    const i = pick(['img_', 'szp_']) + Math.floor(rand() * 1e9).toString(36) + '_' + pick(['u0061', 'au0069q', 'x', '9', 'u005c']) + Math.floor(rand() * 1e6).toString(36);
    out.push('{"t":"' + TAG + '","v":"' + spell(i, Math.floor(rand() * 5), rand()) + '"}');
  }
  for (let k = 0; k < 2500; k++) { let t = ''; const n = 1 + Math.floor(rand() * 30); for (let j = 0; j < n; j++) t += pick(TOK); out.push(t); }
  return out;
}

test('parity: the save (JS) and the sweep (SQL) decode every input to the same ids — reviewer cases, generated spellings, token soup', async () => {
  const m = await internals(['imgIdsIn', 'IMG_ESC_CTE'], WORKER);
  let deepFn = null; try { deepFn = (await internals(['imgEscDeep'], WORKER)).imgEscDeep; } catch (e) { deepFn = null; }
  const db = new DatabaseSync(':memory:'); db.exec('CREATE TABLE kv (k TEXT NOT NULL, seq INTEGER NOT NULL, v TEXT NOT NULL, PRIMARY KEY (k, seq))');
  const sqlTexts = db.prepare(m.IMG_ESC_CTE + 'SELECT d FROM esc'), ins = db.prepare("INSERT INTO kv (k, seq, v) VALUES ('k', 0, ?)");
  const C = corpus(), bad = []; let compared = 0, withIds = 0;
  for (const s of C) {
    db.exec('DELETE FROM kv'); ins.run(s);
    if (deepFn && deepFn(s)) continue;                         /* not settled: covered by the next test (refused / keeps everything) */
    const js = Object.keys(m.imgIdsIn(s)).sort(), sql = scan([s].concat(sqlTexts.all().map((r) => r.d)));
    compared++; if (js.length) withIds++;
    if (JSON.stringify(js) !== JSON.stringify(sql)) bad.push({ s, js, sql });
  }
  console.log('# parity: ' + C.length + ' inputs · ' + compared + ' compared · ' + withIds + ' with ids · ' + bad.length + ' differ');
  assert.ok(withIds > 1000, 'the corpus exercises ids');
  assert.deepEqual(bad.slice(0, 5), [], 'JS and SQL find different ids');
});

test('not settled after 8 levels: JS and SQL agree, the save refuses it, the sweep keeps everything; 8 levels are still decoded', async () => {
  const m = await internals(['imgIdsIn', 'imgEscDeep', 'IMG_ESC_CTE'], WORKER);
  const db = new DatabaseSync(':memory:'); db.exec('CREATE TABLE kv (k TEXT NOT NULL, seq INTEGER NOT NULL, v TEXT NOT NULL, PRIMARY KEY (k, seq))');
  const deepSql = (s) => { db.exec('DELETE FROM kv'); db.prepare("INSERT INTO kv VALUES ('k', 0, ?)").run(s); return db.prepare(m.IMG_ESC_CTE + 'SELECT COUNT(*) n FROM escdeep').get().n === 1; };
  for (let n = 0; n <= 10; n++) {
    /* n nested \u005c then the escaped first letter: one level per \u005c (the last one decodes the letter in the same level) */
    let t = '\\u0069mg_d' + n + '_e'; for (let k = 0; k < n; k++) t = t.replace(/\\/g, '\\u005c');
    const deep = Math.max(n, 1) > 8;
    assert.equal(m.imgEscDeep(t), deep, 'JS deep at ' + n + ': ' + t);
    assert.equal(deepSql(t), deep, 'SQL deep at ' + n);
    if (!deep) assert.deepEqual(Object.keys(m.imgIdsIn(t)), ['img_d' + n + '_e'], 'decoded within 8 levels');
  }
});

let n = 0;
const typedSave = async (T) => { const s = await edit(T.W, T.S.mgr2, D2, 'plan', (v) => { v.floors[0].name = TAG + ' dc ' + (++n); }); assert.ok(s.ok, JSON.stringify(s.j).slice(0, 200)); };
const pass = async (T) => { due(T.W); await typedSave(T); };
async function settled(T) {
  const { W, S, id } = T, c = id('warm'); await upload(W, S.mgr2, c); age(W, c, 31);
  for (let k = 0; k < 4 && !gone(await state(W, c)); k++) await pass(T);
  assert.ok(gone(await state(W, c)), 'warm-up');
}

both(test, 'B · a legacy kv value spells, with its first letter escaped, an id that itself holds "u0061" / "u0069": the image is kept', async (mode) => {
  const T = await scene(mode), { W, S, x, id } = T; await settled(T);
  const ids = { idA: 'img_v7f' + x + '_u0061b', idB: 'img_v7f' + x + '_au0069q' }, keys = { idA: dk(D, 'profile'), idB: dk(D2, 'profile') }, ctl = id('ctl');
  for (const i of Object.values(ids)) await upload(W, S.mgr, i);
  await upload(W, S.mgr2, ctl);
  const ins = W.env.DB.db.prepare('INSERT OR REPLACE INTO kv (k, seq, v) VALUES (?, ?, ?)');
  for (const [nm, i] of Object.entries(ids)) {
    const text = '{"t":"' + TAG + '","logo":"\\u0069' + i.slice(1) + '"}';
    assert.equal(JSON.parse(text).logo, i); assert.ok(!text.includes(i));
    ins.run(keys[nm], 0, text); assert.deepEqual((await state(W, i)).refs, []); age(W, i, 31);
  }
  age(W, ctl, 31);
  await pass(T); await pass(T); await pass(T);
  assert.ok(gone(await state(W, ctl)), 'control: an unreferenced upload of the same age is swept');
  for (const i of Object.values(ids)) { const s = await state(W, i); assert.equal(s.r2, PNG, 'LIVE-REFERENCED IMAGE DELETED: ' + i); assert.notEqual(s.st, 'dead'); }
});

both(test, 'C · a plain save by the unit-2 manager naming the unit-1 image — plain, escaped, nested, nested through \\u005c, too deep: every one refused, no reference row', async (mode) => {
  const T = await scene(mode), { W, S, id } = T; const i = id('victim'); await upload(W, S.mgr, i);
  assert.ok((await edit(W, S.mgr, D, 'plan', EDIT.plan(i))).ok, 'bound into the unit-1 plan');
  const KP = dk(D2, 'profile'), inner = (s) => JSON.stringify({ t: TAG, doc: JSON.stringify({ logo: 'X' }).replace('X', s) });
  let deep = '\\u0069' + i.slice(1); for (let k = 0; k < 9; k++) deep = deep.replace(/\\/g, '\\u005c');
  const spells = {
    plain: JSON.stringify({ t: TAG, logo: i }),
    esc1: '{"t":"' + TAG + '","logo":"\\u0069' + i.slice(1) + '"}',
    nested: inner('\\u0069' + i.slice(1)),
    nested005c: '{"t":"' + TAG + '","doc":"{\\"logo\\":\\"\\u005cu0069' + i.slice(1) + '\\"}"}',
    nested005cUpper: '{"t":"' + TAG + '","doc":"{\\"logo\\":\\"\\u005Cu0069' + i.slice(1) + '\\"}"}',
    tooDeep: '{"t":"' + TAG + '","logo":"' + deep + '"}'
  };
  const out = {};
  for (const [nm, text] of Object.entries(spells)) {
    const r = await W.C.save(S.mgr2, { [KP]: text }), den = (r.j.denied || {})[KP];
    out[nm] = { stored: (W.env.DB.q('SELECT v FROM kv WHERE k = ?', KP)[0] || {}).v === text, why: den ? (den.why || den.err || 'denied') : null, refs: (await state(W, i)).refs };
    if (out[nm].stored) await W.C.save(S.mgr2, { [KP]: JSON.stringify({ t: TAG }) });
  }
  for (const [nm, o] of Object.entries(out)) {
    assert.equal(o.stored, false, 'FOREIGN IMAGE REFERENCE ACCEPTED via ' + nm + ' · ' + JSON.stringify(out));
    assert.deepEqual(o.refs, [dk(D, 'plan')], nm + ': no reference row for unit 2');
  }
  assert.equal(out.tooDeep.why, 'img-escape', 'a spelling still not settled after 8 levels is refused as such');
  /* the owner of the image may still save it plainly (the refusals above are about ownership / depth, not the spelling) */
  const own = await W.C.save(S.mgr, { [dk(D, 'profile')]: spells.nested005c }), od = (own.j.denied || {})[dk(D, 'profile')];
  assert.ok(!od, 'the unit-1 manager may name the unit-1 image through a nested spelling · ' + JSON.stringify(own.j).slice(0, 200));
});

both(test, 'C · while a kv value holds a spelling not settled after 8 levels, the sweep condemns nothing; once it is gone, it sweeps', async (mode) => {
  const T = await scene(mode), { W, S, id } = T; await settled(T);
  const hid = id('hid'), ctl = id('ctl'); await upload(W, S.mgr, hid); await upload(W, S.mgr2, ctl);
  let t = '\\u0069' + hid.slice(1); for (let k = 0; k < 9; k++) t = t.replace(/\\/g, '\\u005c');
  W.env.DB.db.prepare('INSERT OR REPLACE INTO kv (k, seq, v) VALUES (?, 0, ?)').run(dk(D, 'notes'), '{"t":"' + TAG + '","logo":"' + t + '"}');
  age(W, hid, 31); age(W, ctl, 31); await pass(T); await pass(T);
  for (const i of [hid, ctl]) { const s = await state(W, i); assert.equal(s.r2, PNG, i + ' kept'); assert.equal(s.st, 'claim', i + ' never condemned'); }
  W.env.DB.db.prepare('DELETE FROM kv WHERE k = ?').run(dk(D, 'notes'));
  age(W, hid, 31); age(W, ctl, 31); await pass(T); await pass(T);
  for (const i of [hid, ctl]) assert.ok(gone(await state(W, i)), i + ' swept once nothing hides it');
});
