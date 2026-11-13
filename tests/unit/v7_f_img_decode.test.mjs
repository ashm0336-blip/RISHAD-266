/* V7-F · third independent review, items B + C — JSON escapes in the save (JS, 054) and in the sweep (SQL, 054).
   B (owner's hard condition): an id whose own text holds e.g. 'u0061', mentioned by a legacy record with one letter escaped, must keep its image.
   C: a nested spelling (\u005cu0069…, \\u0069…) must not slip past the ownership check of the plain save.
   Fourth review: the third review answered B + C with a multi-level decoder, proven unsound at depth >= 3 and removed; ids were matched
   literally and a text carrying a \u00XX escape of an id character or of '\' was refused at every save and held every sweep pass.
   Owner decision after the fifth review (054 imgDeepEach): no text is refused for its spelling. A text that may hide an id is unescaped
   structure-blind, round after round, and every round is scanned — an escaped spelling of an id IS that id, at every depth: B is kept because
   the sweep reads the value and finds the id (the other orphans are swept), C is refused as the literal id is ('imgown').
   The corpus test feeds the reviewer's cases, generated spellings and random token soup to the worker's own functions. Real worker for the rest,
   legacy and enforce, rows and R2 bytes. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { internals } from './internals.mjs';
import { WORKER } from './harness.mjs';
import { D, D2, PNG, TAG, dk, both, scene, state, gone, edit, upload, age, due, EDIT } from './v7_f_img_fx.mjs';

const RX = /(?:img|szp)_[a-z0-9]+_[a-z0-9]+/g;
const scan = (t) => { const o = new Set(); for (const m of String(t).matchAll(RX)) o.add(m[0]); return [...o].sort(); };
let rnd = 0x5eed1234;
const rand = () => { rnd |= 0; rnd = (rnd + 0x6d2b79f5) | 0; let t = Math.imul(rnd ^ (rnd >>> 15), 1 | rnd); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (a) => a[Math.floor(rand() * a.length)];
const hex2 = (c, up) => { const h = c.toString(16).padStart(2, '0'); return up ? h.toUpperCase() : h; };
/* one id character spelled as an escape (either hex case) */
const escCh = (ch) => '\\u00' + hex2(ch.charCodeAt(0), rand() < 0.3);
/* a text one JSON level deeper: its backslashes doubled (JSON.stringify) or spelled as the escape of hex 5c (either case) */
const nest = (t) => rand() < 0.6 ? t.replace(/\\/g, '\\\\') : t.replace(/\\/g, () => '\\u005' + (rand() < 0.5 ? 'c' : 'C'));
function spell(id, depth, p) { let t = [...id].map((ch) => rand() < p ? escCh(ch) : ch).join(''); for (let k = 0; k < depth; k++) t = nest(t); return t; }
const TOK = ['\\', '\\\\', 'u', 'u00', '\\u00', '\\u005c', '\\u005C', '\\u0069', '\\u0049', '\\u006D', '\\u006d', '\\u0067', '\\u005f', '\\u005F', '\\u0061', 'u0061', 'u0069',
  'u005c', 'img_', 'szp_', 'i', 'mg', '_', 'a', 'b', '1', '0', '"', ':', '{', '}', 'x', '6', '9', '5', 'c', 'C', 'F', 'f', '\\u0030', '\\u007a', '\\u007A', '\\u003a', '\\u0075', '\\u0030\\u0030'];

/* what a text must be read as: the generated spellings name their id; the reviewer's cases name these (every id a chain of JSON.parse calls reaches) */
const WANT = new Map([
  ['{"logo":"\\u0069mg_a_b"}', ['img_a_b']], ['{"d":"{\\"logo\\":\\"\\\\u0069mg_a_b\\"}"}', ['img_a_b']], ['{"d":"{\\"logo\\":\\"\\u005cu0069mg_a_b\\"}"}', ['img_a_b']],
  ['{"d":"\\\\\\\\u0069mg_a_b"}', ['img_a_b']], ['{"logo":"\\u0069MG_A_B \\u0049mg_a_b \\u006Dimg_q_r"}', ['img_q_r']],
  ['{"logo":"\\u0069mg_v7fq_u0061b"}', ['img_v7fq_u0061b']], ['{"logo":"\\u0069mg_au0069q_z9"}', ['img_au0069q_z9']],
  ['{"m":"szp_1_2 \\u0073zp_3_4 \\\\u005cu0073zp_5_6 \\u005c\\u0075\\u0030\\u0030\\u0036\\u0039mg_7_8"}', ['szp_1_2', 'szp_3_4', 'szp_5_6', 'img_7_8']],
  ['\\u005cu005cu005cu0069mg_n_n', ['img_n_n']], ['\\u005Cu005cu005Cu005cu0069mg_m_m', ['img_m_m']], ['img_a_b\\u0063\\u0064', ['img_a_b', 'img_a_bcd']]
]);
function corpus() {
  const id = 'img_v7fq_u0061b', id2 = 'img_au0069q_z9', out = [
    /* the reviewer's cases */
    '{"logo":"img_a_b"}',                                        // plain
    '{"logo":"\\u0069mg_a_b"}',                                  // single
    '{"d":"{\\"logo\\":\\"\\\\u0069mg_a_b\\"}"}',               // nested (standard: \\u0069)
    '{"d":"{\\"logo\\":\\"\\u005cu0069mg_a_b\\"}"}',            // nested through the escape of hex 5c
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
    out.push('{"t":"' + TAG + '","v":"' + spell(i, Math.floor(rand() * 12), rand()) + '"}'); WANT.set(out[out.length - 1], [i]);
  }
  for (let k = 0; k < 2500; k++) { let t = ''; const n = 1 + Math.floor(rand() * 30); for (let j = 0; j < n; j++) t += pick(TOK); out.push(t); }
  return out;
}
const noDb = { DB: { prepare: () => ({ bind: () => ({ first: async () => null, all: async () => ({ results: [] }) }) }) } };
const A0 = { u: { id: 'tst_u', role: 'staff' }, depts: [] };

test('the save reads ids through escapes: a text without an id-hiding escape gives exactly the ids written in it; a text with one is never refused for it and gives every id it spells, at any depth — reviewer cases, spellings up to 12 levels, token soup', async () => {
  const m = await internals(['imgIdsIn', 'imgForeignIn', 'imgEsc'], WORKER);
  const C = corpus(), bad = []; let deep = 0, literal = 0, spelled = 0;
  for (const c of [...WANT.keys()].filter((k) => WANT.get(k).length && !k.includes(TAG))) assert.ok(C.includes(c), 'the reviewer case is in the corpus: ' + c);
  for (const s of C) {
    const why = await m.imgForeignIn(noDb, A0, dk(D, 'profile'), s, '', {}), js = Object.keys(m.imgIdsIn(s)).sort();
    if (why === 'img-escape') bad.push({ s, why });                          /* no text of this corpus is nested past the bound */
    for (const i of scan(s)) if (!js.includes(i)) bad.push({ s, js, missedLiteral: i });
    for (const i of WANT.get(s) || []) { spelled++; if (!js.includes(i)) bad.push({ s, js, missed: i }); }
    if (m.imgEsc(s)) { deep++; continue; }
    literal++;
    if (JSON.stringify(js) !== JSON.stringify(scan(s))) bad.push({ s, js });
  }
  console.log('# corpus: ' + C.length + ' inputs · ' + deep + ' read through their escapes · ' + literal + ' read literally · ' + spelled + ' ids expected of spellings · ' + bad.length + ' wrong');
  assert.ok(deep > 1000 && literal > 200 && spelled > 1500, 'both kinds are exercised');
  assert.deepEqual(bad.slice(0, 5), [], 'the save read a text wrongly');
});

test('any depth: n nested \\u005c before the escaped letter (n = 0 … 12) is read as the id it spells and accepted; the same id written plainly and nested by JSON.stringify (any depth) is read', async () => {
  const m = await internals(['imgIdsIn', 'imgForeignIn'], WORKER);
  for (let n = 0; n <= 12; n++) {
    let t = '\\u0069mg_d' + n + '_e'; for (let k = 0; k < n; k++) t = t.replace(/\\/g, '\\u005c');
    assert.ok(!t.includes('img_d' + n + '_e')); assert.deepEqual(Object.keys(m.imgIdsIn(t)), ['img_d' + n + '_e'], 'read through ' + n + ' levels');
    assert.equal(await m.imgForeignIn(noDb, A0, dk(D, 'profile'), t, '', {}), '', 'not refused for its spelling at ' + n + ' (no owner known here)');
    /* with an owner the actor may not use, the spelling is refused as the id: the answer is the id itself */
    const foreign = { DB: { prepare: (q) => ({ bind: () => ({ first: async () => /FROM imgown/.test(q) ? { img: 'img_d' + n + '_e', st: 'claim', k: '', uid: 'someone_else', dept: '', ts: 1 } : null, all: async () => ({ results: [] }) }) }) } };
    assert.equal(await m.imgForeignIn(foreign, A0, dk(D, 'profile'), t, '', {}), 'img_d' + n + '_e', 'refused as the literal id at ' + n);
    let p = 'img_d' + n + '_e'; for (let k = 0; k < n; k++) p = JSON.stringify({ d: p });
    assert.deepEqual(Object.keys(m.imgIdsIn(p)), ['img_d' + n + '_e'], 'read at depth ' + n);
    assert.equal(await m.imgForeignIn(noDb, A0, dk(D, 'profile'), p, '', {}), '', 'and accepted (no owner known here) at depth ' + n);
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

both(test, 'B · a legacy kv value spells, with its first letter escaped, an id that itself holds "u0061" / "u0069": the image is kept (the sweep reads the spelling), an unrelated orphan is swept meanwhile; once the value is gone it is swept', async (mode) => {
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
  for (const i of Object.values(ids)) { const s = await state(W, i); assert.equal(s.r2, PNG, 'LIVE-REFERENCED IMAGE DELETED: ' + i); assert.equal(s.st, 'claim'); }
  assert.ok(gone(await state(W, ctl)), 'the unrelated orphan is swept while such a value is stored (no hold)');
  for (const k of Object.values(keys)) W.env.DB.db.prepare('DELETE FROM kv WHERE k = ?').run(k);
  for (const i of Object.values(ids)) age(W, i, 31);
  await pass(T); await pass(T);
  for (const i of Object.values(ids)) assert.ok(gone(await state(W, i)), i + ' swept once nothing names it');
});

both(test, 'C · a plain save by the unit-2 manager naming the unit-1 image — escaped, nested, nested through \\u005c, nine levels deep: every one refused exactly as the plain id is (imgown); no reference row', async (mode) => {
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
    assert.equal(o.why, 'imgown', nm + ' · ' + JSON.stringify(o));
  }
  /* the spelling is the id, whoever saves it: the unit-1 manager, who may name his image, may spell it — and the record is registered */
  const K1 = dk(D, 'profile'), own = await W.C.save(S.mgr, { [K1]: spells.nested005c });
  assert.equal((own.j.denied || {})[K1], undefined, 'the unit-1 manager is accepted with the escaped spelling · ' + JSON.stringify(own.j).slice(0, 200));
  assert.deepEqual((await state(W, i)).refs, [dk(D, 'plan'), K1].sort(), 'and his record is a reference to it');
  const deepOwn = await W.C.save(S.mgr, { [K1]: spells.tooDeep });
  assert.equal((deepOwn.j.denied || {})[K1], undefined, 'nine levels deep too'); assert.deepEqual((await state(W, i)).refs, [dk(D, 'plan'), K1].sort());
  const own2 = await W.C.save(S.mgr, { [K1]: JSON.stringify({ t: TAG, doc: JSON.stringify({ logo: i }) }) });
  assert.ok(!(own2.j.denied || {})[K1], 'and accepted written plainly, nested by JSON.stringify · ' + JSON.stringify(own2.j).slice(0, 200));
});

both(test, 'C · while a kv value holds a nine-level spelling, the sweep keeps the image it spells and sweeps the unrelated orphan; once it is gone, it sweeps that one too', async (mode) => {
  const T = await scene(mode), { W, S, id } = T; await settled(T);
  const hid = id('hid'), ctl = id('ctl'); await upload(W, S.mgr, hid); await upload(W, S.mgr2, ctl);
  let t = '\\u0069' + hid.slice(1); for (let k = 0; k < 9; k++) t = t.replace(/\\/g, '\\u005c');
  W.env.DB.db.prepare('INSERT OR REPLACE INTO kv (k, seq, v) VALUES (?, 0, ?)').run(dk(D, 'notes'), '{"t":"' + TAG + '","logo":"' + t + '"}');
  age(W, hid, 31); age(W, ctl, 31); await pass(T); await pass(T);
  { const s = await state(W, hid); assert.equal(s.r2, PNG, 'LIVE-REFERENCED IMAGE DELETED'); assert.equal(s.st, 'claim', 'never condemned'); }
  assert.ok(gone(await state(W, ctl)), 'the unrelated orphan is swept while the value is there (no hold)');
  W.env.DB.db.prepare('DELETE FROM kv WHERE k = ?').run(dk(D, 'notes'));
  age(W, hid, 31); await pass(T); await pass(T);
  assert.ok(gone(await state(W, hid)), 'swept once nothing names it');
});
