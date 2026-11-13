/* V7-F · independent review of "ids are compared on decoded values" (5408e0b) — four findings, each reproduced here on that build and fixed:
   F2 · imgSync deleted a key's reference rows and re-inserted them in batches: between two batches an image the stored record spells by an
        escape had no row, and a pass deciding there deleted it. Now the rows are inserted first and the stale ones leave last.
   F3 · SQLite's GLOB / length / substr stop at a NUL character: a NUL stored before a \u00XX escape hid the text from the sweep's trigger
        (and from its size bound, and a NUL in a kv row hid an id cut by a row boundary). Now every test is instr on bytes, lengths are byte
        lengths, windows are cut from bytes, and the texts reach the worker as JSON (json_quote) — whole.
   F4 · a record that already stores an undecided text was unsaveable; a large honest record was refused with the wrong reason.
   F1 · one manager could hold the sweep for everyone with one accepted save (201 floor names · one 8.2 MB value · two 3.9 MB values).
        Now the texts are read in pages bounded by bytes — never by their number —, the byte bound is above twice the body limit, the work
        of a pass is counted in units that follow the measured cost, and a hold names its bound and the place.
   Real worker, legacy and enforce, rows and R2 bytes. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { internals } from './internals.mjs';
import { WORKER } from './harness.mjs';
import { D, D2, PNG, TAG, dk, both, scene, state, gone, edit, upload, age, due, stored } from './v7_f_img_fx.mjs';
import { world as restoreWorld } from './atomic_restore_review_fx.mjs';
import { D1, IDS } from './notifications_review_fx.mjs';
import { replaceOperationalFixture, inspectOperationalFixture } from './operational_legacy_seed_fx.mjs';

const U = (ch) => '\\u00' + ch.charCodeAt(0).toString(16).padStart(2, '0');
const chain = (c, levels) => { for (let l = 0; l < levels; l++) c = c.replace(/\\/g, '\\u005c'); return c; };
const KP = dk(D, 'profile'), KP2 = dk(D2, 'profile');
const why = (r, k) => ((r.j.denied || {})[k] || {}).why || null;
const detail = (r, k) => ((r.j.denied || {})[k] || {}).detail || '';
const kvText = (W, k) => W.env.DB.q('SELECT v FROM kv WHERE k = ? ORDER BY seq', k).map((x) => x.v).join('');
const own = (W, i) => W.env.DB.q('SELECT st, ts, k, uid, dept FROM imgown WHERE img = ?', i)[0] || null;
const putKv = (W, k, text) => { W.env.DB.db.prepare('DELETE FROM kv WHERE k = ?').run(k); W.env.DB.db.prepare('INSERT INTO kv (k, seq, v) VALUES (?, 0, ?)').run(k, text); };
const delKv = (W, k) => W.env.DB.db.prepare('DELETE FROM kv WHERE k = ?').run(k);
let n = 0;
async function pass(T, logs) {
  due(T.W); const l = console.log, w = console.warn; console.log = console.warn = (m) => { if (logs) logs.push(String(m)); };
  try { const s = await edit(T.W, T.S.mgr2, D2, 'plan', (v) => { v.floors[0].name = TAG + ' rv ' + (++n); }); assert.ok(s.ok, JSON.stringify(s.j).slice(0, 200)); }
  finally { console.log = l; console.warn = w; }
}
const holds = (logs) => logs.filter((m) => m.includes('img-sweep-escape-hold')).map((m) => JSON.parse(m));
async function settled(T) {
  const { W, S, id } = T, c = id('warm'); await upload(W, S.mgr2, c); age(W, c, 31);
  for (let k = 0; k < 4 && !gone(await state(W, c)); k++) await pass(T);
  assert.ok(gone(await state(W, c)), 'warm-up: the sweep is condemning');
}
const gate = () => { let open; const p = new Promise((r) => { open = r; }); return { p, open }; };

/* ── F2 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
both(test, 'F2 · a pass that decides between two batches of a plain save\'s bookkeeping (60 images, two batches): an upload the stored value spells by an escape is not deleted — as with the literal id', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, DB = W.env.DB; await settled(T);
  for (const kind of ['literal', 'escaped']) {
    const N = 60, ids = []; for (let i = 0; i < N; i++) { const x = id('g' + kind[0] + String(i).padStart(3, '0')); ids.push(x); await upload(W, S.mgr, x); }
    const target = ids[N - 1]; age(W, target, 31);
    const text = '{"t":"' + TAG + '","imgs":[' + ids.map((x) => '"' + (kind === 'literal' ? x : U('i') + x.slice(1)) + '"').join(',') + ']}';
    const atDecision = gate(), gap = gate(), decided = gate(), prep = DB.prepare, batch = DB.batch, DECIDE = /UPDATE imgown SET st = 'dead', k = ''/; let inGap = false, r;
    DB.prepare = function (sql) { const st = prep.call(DB, sql); if (!DECIDE.test(sql)) return st; const all = st.all; st.all = async function () { atDecision.open(); await gap.p; try { return await all.call(st); } finally { decided.open(); } }; return st; };
    DB.batch = async function (stmts) {
      const deciding = stmts.some((q) => DECIDE.test(q.sql)); if (deciding) { atDecision.open(); await gap.p; }
      const b = await batch.call(DB, stmts); if (deciding) decided.open();
      /* the first batch of the bookkeeping (one reference row per image) is committed; the next is still to come */
      else if (!inGap && stmts.some((q) => /INTO imgref \(img, k\) VALUES/.test(q.sql))) { inGap = true; gap.open(); await decided.p; }
      return b;
    };
    try {
      const sweeping = pass(T).then(() => 'over'), reached = await Promise.race([atDecision.p.then(() => 'deciding'), sweeping]);
      assert.equal(reached, 'deciding', 'the pass reached its deciding statement');
      r = await W.C.save(S.mgr, { [KP]: text }); gap.open(); await sweeping;
    } finally { DB.prepare = prep; DB.batch = batch; gap.open(); }
    assert.equal(why(r, KP), null); assert.equal(kvText(W, KP), text); assert.ok(inGap, 'the pass decided inside the bookkeeping');
    for (let k = 0; k < 2; k++) await pass(T);
    const s = await state(W, target);
    assert.equal(s.r2, PNG, 'THE IMAGE THE STORED RECORD NAMES WAS DELETED (' + kind + ')'); assert.equal(s.st, 'bound', kind); assert.deepEqual(s.refs, [KP], kind);
    for (const x of ids) assert.deepEqual((await state(W, x)).refs, [KP], 'every image of the value is referenced');
  }
  /* the bookkeeping still drops what the value no longer names — and only that */
  const keepId = id('gl000'), r2 = await W.C.save(S.mgr, { [KP]: JSON.stringify({ t: TAG, imgs: [keepId] }) }); assert.equal(why(r2, KP), null);
  assert.deepEqual(W.env.DB.q('SELECT img FROM imgref WHERE k = ? ORDER BY img', KP).map((x) => x.img), [keepId], 'the rows of the images the value dropped are gone');
  assert.equal((await state(W, id('ge001'))).st, 'orphan', 'and a dropped image is an orphan');
});

/* ── F3 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
both(test, 'F3 · a NUL character stored before the escape does not hide it: a typed record (NUL in an earlier column), a kv row, a kv row boundary — the image the spelling names is kept; a NUL does not hide an id cut by a row boundary either', async (mode) => {
  const T = await scene(mode), { W, S, x, id } = T, DB = W.env.DB.db; await settled(T);
  /* typed: the reviewer's case — an odd-shaped id spelled by an escape in the floor name, a NUL in the floor's `n` */
  const odd = 'OddNul' + x; await upload(W, S.mgr, odd);
  const name = '{"logo":"' + U('O') + odd.slice(1) + '"}'; assert.equal(JSON.parse(name).logo, odd);
  const s = await edit(W, S.mgr, D, 'plan', (v) => { v.floors[0].name = name; v.floors[0].n = 'a\u0000b'; }); assert.ok(s.ok, JSON.stringify(s.j).slice(0, 200));
  assert.ok(DB.prepare("SELECT COUNT(*) n FROM ops_plan_live_floors_floor WHERE department_id = ? AND instr(f_n_text, char(0)) > 0").get(D).n >= 1, 'the NUL is stored');
  /* kv: NUL then the escape in one row · NUL in the first row, the escape cut by the row boundary · NUL in the first row, the literal id cut by the boundary */
  const a = id('nula'), b = id('nulb'), c = id('nulc'), ctl = id('ctl'); for (const i of [a, b, c]) await upload(W, S.mgr, i); await upload(W, S.mgr2, ctl);
  const ins = DB.prepare('INSERT OR REPLACE INTO kv (k, seq, v) VALUES (?, ?, ?)');
  ins.run('bsdept:zz1:bassam_fake_v1', 0, '{"t":"x\u0000y","logo":"' + U('i') + a.slice(1) + '"}');
  const wb = '{"t":"x\u0000y","logo":"' + U('i') + b.slice(1) + '"}', cb = wb.indexOf('\\u0069') + 3; ins.run('bsdept:zz2:bassam_fake_v1', 0, wb.slice(0, cb)); ins.run('bsdept:zz2:bassam_fake_v1', 1, wb.slice(cb));
  const wc = '{"t":"x\u0000y","logo":"' + c + '"}', cc = wc.indexOf(c) + 6; ins.run('bsdept:zz3:bassam_fake_v1', 0, wc.slice(0, cc)); ins.run('bsdept:zz3:bassam_fake_v1', 1, wc.slice(cc));
  for (const i of [a, b, c, ctl]) age(W, i, 31); age(W, odd, 32);
  const logs = []; for (let k = 0; k < 3; k++) await pass(T, logs);
  for (const [i, what] of [[odd, 'typed record, odd id'], [a, 'kv row'], [b, 'kv row boundary (escape)'], [c, 'kv row boundary (literal id)']]) {
    const st = await state(W, i); assert.equal(st.r2, PNG, 'LIVE-REFERENCED IMAGE DELETED: ' + what); assert.equal(st.st, 'claim', what);
  }
  assert.deepEqual(holds(logs), [], 'no pass held'); assert.ok(gone(await state(W, ctl)), 'the unrelated orphan is swept');
});

test('F3 · the trigger in SQL and in JS agree on texts with NUL characters, the windows are cut from bytes, and no size is hidden by a NUL', async () => {
  const m = await internals(['imgEsc', 'imgEscCond'], WORKER), { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(':memory:'); db.exec('CREATE TABLE t (v TEXT)');
  const sql = db.prepare('SELECT ' + m.imgEscCond('v') + ' AS r FROM t'), ins = db.prepare('INSERT INTO t VALUES (?)');
  const TOK = ['\u0000', '\u0000', '\\', '\\u00', '\\u0069', '\\u005C', '\\u0041', '\\u0040', '\\u001f', '\\u007b', 'a', '"', 'é', '\\u004f', 'u0069', '\\u00\u000069'];
  let s = 99; const r = () => { s = (s * 48271) % 2147483647; return s / 2147483647; }; let on = 0, nul = 0;
  for (let k = 0; k < 3000; k++) {
    let t = ''; const q = 1 + Math.floor(r() * 8); for (let j = 0; j < q; j++) t += TOK[Math.floor(r() * TOK.length)];
    db.exec('DELETE FROM t'); ins.run(t); const js = m.imgEsc(t); if (js) on++; if (t.includes('\u0000')) nul++;
    assert.equal(!!sql.get().r, js, 'SQL and JS disagree on ' + JSON.stringify(t));
  }
  assert.ok(on > 500 && on < 2500 && nul > 1500, 'both answers, mostly with NULs');
});

/* ── F4 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
both(test, 'F4 · a record that ALREADY stores an undecided text saves for an unrelated change (plain and typed); a save that ADDS one is refused; removing it is accepted; a large honest record nested 10 levels is accepted; a text past the work bound is refused with its own true reason', async (mode) => {
  const T = await scene(mode), { W, S } = T, m = await internals(['IMG_ESC_ROUNDS'], WORKER);
  const und = JSON.stringify({ t: TAG, note: chain('C:\\u0041bc', 70) });
  await W.C.save(S.mgr, { [KP]: JSON.stringify({ t: TAG }) }); putKv(W, KP, und);                        /* older data, stored as it is */
  const edited = und.replace('"t":"' + TAG + '"', '"t":"' + TAG + '","phone":"0500000000"'), r1 = await W.C.save(S.mgr, { [KP]: edited });
  assert.equal(why(r1, KP), null, 'unrelated change accepted · ' + JSON.stringify(r1.j).slice(0, 200)); assert.equal(kvText(W, KP), edited);
  const r2 = await W.C.save(S.mgr, { [KP]: JSON.stringify({ t: TAG, phone: '0500000000', note: 'simplified' }) }); assert.equal(why(r2, KP), null, 'removed');
  const r3 = await W.C.save(S.mgr, { [KP]: und });
  assert.equal(why(r3, KP), 'img-escape', 'a save that ADDS an undecided text is refused'); assert.ok(detail(r3, KP).includes(String(m.IMG_ESC_ROUNDS)), 'and says the nesting bound: ' + detail(r3, KP));
  /* typed: a floor name already stored with the chain; the manager edits another field */
  assert.ok(W.env.DB.db.prepare('UPDATE ops_plan_live_floors_floor SET f_name_text = ? WHERE department_id = ?').run(chain('C:\\u0041bc', 70), D).changes > 0);
  const e = await edit(W, S.mgr, D, 'plan', (v) => { v.floors[0].n = 'unrelated'; });
  assert.ok(e.ok, 'typed unrelated change accepted · ' + e.why); assert.equal(stored(W.env, dk(D, 'plan')).floors[0].n, 'unrelated');
  const e2 = await edit(W, S.mgr2, D2, 'plan', (v) => { v.floors[0].name = chain('C:\\u0041bc', 70); });
  assert.equal(e2.why, 'img-escape', 'typed: adding one is refused');
  /* a large honest record: 6.6 MB with a path nested 10 levels — accepted (it was refused, as "over 64 levels") */
  const big = JSON.stringify({ t: TAG, pad: 'x'.repeat(6.6e6), note: chain('C:\\u0041bc', 10) }), r4 = await W.C.save(S.mgr, { [KP]: big });
  assert.equal(why(r4, KP), null, 'accepted · ' + JSON.stringify(r4.j).slice(0, 300)); assert.equal(kvText(W, KP).length, big.length);
  /* past the work bound (not the nesting bound): refused, and the reason given is the true one */
  const heavy = JSON.stringify({ t: TAG, pad: 'x'.repeat(5e6), note: chain('C:\\u0041bc', 50) }), r5 = await W.C.save(S.mgr2, { [KP2]: heavy });
  assert.equal(why(r5, KP2), 'img-escape', JSON.stringify(r5.j).slice(0, 200));
  assert.ok(!detail(r5, KP2).includes(String(m.IMG_ESC_ROUNDS) + ' مستوى'), 'not "over ' + m.IMG_ESC_ROUNDS + ' levels" (it has 51): ' + detail(r5, KP2));
  assert.notEqual(detail(r5, KP2), detail(r3, KP), 'its own reason'); assert.ok(detail(r5, KP2).length > 10);
});

test('F4 · backup restore: a file whose record carries an undecided text is refused whole when the platform does not hold that text; when the stored record already holds it, the same file is restored', { timeout: 600000 }, async () => {
  const OPT = 'bsdept:' + D1 + ':bassam_options_v1', work = TAG + ' r ' + chain('xyz\\u0041', 70), text = JSON.stringify({ type: [], work: [work] });
  const keep = (o) => Object.fromEntries(Object.entries(o).filter(([name]) => name !== 'operations'));
  async function run(seedText) {
    const B = await restoreWorld(); await replaceOperationalFixture(B.env, OPT, seedText);
    const request = await B.body({ scope: { kind: 'full' } });
    const file = { app: 'bassam-crowd', version: 3, kind: 'full', data: { ...request.keys, [OPT]: text }, domains: keep(request.domains),
      manifest: { ...request.manifest, version: 3, domains: keep(request.manifest.domains), keys: request.manifest.keys.concat([OPT]) } };
    const r = await B.api('super', '/api/backup/restore', { version: 1, uid: IDS.super, requestId: 'TEST_ONLY_rv_' + (++n), scope: { kind: 'full' }, mode: 'replace', reason: TAG + ' rv', base: request.base, backup: file, phase: 'commit', legacyConsent: false });
    return { r, v: inspectOperationalFixture(B.env, OPT) };
  }
  const fresh = await run({ type: [], work: [TAG + ' before'] });
  assert.equal(fresh.r.status, 403, JSON.stringify(fresh.r.json).slice(0, 200)); assert.equal(fresh.r.json.err, 'restore-key-denied');
  assert.equal(((fresh.r.json.details.denied || {})[OPT] || {}).why, 'img-escape'); assert.deepEqual(fresh.v.work, [TAG + ' before'], 'nothing written');
  const held = await run({ type: ['x'], work: [work] });                                                   /* the platform already stores the text */
  assert.equal(held.r.status, 200, JSON.stringify(held.r.json).slice(0, 300)); assert.deepEqual(held.v, { type: [], work: [work] }, 'restored as in the file');
});

/* ── F1 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
both(test, 'F1 · one accepted save does not hold the sweep: 201 (and 600) floor names with a Windows path · 3000 small kv values · one 8.2e6-character value · two 3.9 MB values nested 10 levels — every pass decides, the orphan is swept', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, DB = W.env.DB; await settled(T); const report = [];
  async function swept(label) {
    const o = id('o' + report.length); await upload(W, S.mgr2, o); age(W, o, 31); const logs = [], t0 = DB.trips, c0 = performance.now(); await pass(T, logs);
    report.push({ label, ms: Math.round(performance.now() - c0), trips: DB.trips - t0 });
    assert.deepEqual(holds(logs), [], label + ': the pass did not hold'); assert.ok(gone(await state(W, o)), label + ': the orphan is swept');
  }
  for (const count of [201, 600]) {
    const s = await edit(W, S.mgr, D, 'plan', (v) => { const f0 = v.floors[0]; v.floors = []; for (let i = 0; i < count; i++) v.floors.push(Object.assign({}, f0, { id: 'f' + i, name: 'C:\\u0041bc ' + i })); });
    assert.ok(s.ok, count + ' floors saved · ' + JSON.stringify(s.j).slice(0, 200)); await swept(count + ' floor names');
  }
  assert.ok((await edit(W, S.mgr, D, 'plan', (v) => { v.floors = v.floors.slice(0, 1); v.floors[0].name = TAG + ' one'; })).ok);
  const ins = DB.db.prepare('INSERT OR REPLACE INTO kv (k, seq, v) VALUES (?, 0, ?)'); for (let k = 0; k < 3000; k++) ins.run('bsdept:zz' + k + ':bassam_fake_v1', '{"p":"C:\\\\u0041bc ' + k + '"}');
  await swept('3000 small kv values'); DB.exec("DELETE FROM kv WHERE k LIKE 'bsdept:zz%'");
  const one = JSON.stringify({ t: TAG, pad: 'x'.repeat(8.2e6), p: 'C:\\u0041bc' }), r1 = await W.C.save(S.mgr, { [KP]: one });
  assert.equal(why(r1, KP), null, JSON.stringify(r1.j).slice(0, 200)); assert.equal(kvText(W, KP).length, one.length); await swept('one 8.2e6-character value');
  const deep = JSON.stringify({ t: TAG, pad: 'x'.repeat(3.9e6), p: chain('C:\\u0041bc', 9) });
  for (const [ck, k] of [[S.mgr, KP], [S.mgr2, KP2]]) { const r = await W.C.save(ck, { [k]: deep }); assert.equal(why(r, k), null); }
  await swept('two 3.9 MB values nested 10 levels');
  console.log('# F1 passes: ' + JSON.stringify(report));
  for (const x of report) assert.ok(x.trips <= 40, x.label + ': ' + x.trips + ' D1 round trips in the save that ran the pass');
});

both(test, 'F1 · when a pass does hold, the log says which bound and where: an undecided floor name is named itself (table.column and unit) though many honest texts come first; the byte bound and the work bound are named; no content', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, DB = W.env.DB; await settled(T);
  const m = await internals(['IMG_ESC_CHARS', 'IMG_ESC_PASS', 'IMG_ESC_ROUNDS'], WORKER);
  assert.ok(m.IMG_ESC_CHARS >= 2 * 8 * 1024 * 1024, 'the byte bound is at least twice the body limit');
  const ins = DB.db.prepare('INSERT OR REPLACE INTO kv (k, seq, v) VALUES (?, ?, ?)'), clear = () => DB.exec("DELETE FROM kv WHERE k LIKE 'bsdept:zz%' OR k LIKE 'bsdept:aa%'");
  const orp = id('orp'); await upload(W, S.mgr, orp); age(W, orp, 31); const before = own(W, orp);
  /* undecided, in a typed record of unit 2 — with ten honest kv texts that sort before it */
  for (let k = 0; k < 10; k++) ins.run('bsdept:aa' + k + ':bassam_fake_v1', 0, '{"p":"C:\\\\u0041bc SECRET' + k + '"}');
  assert.equal(DB.db.prepare("UPDATE ops_plan_live_floors_floor SET f_name_text = ? WHERE department_id = ? AND resource = 'bassam_plan_v1' AND row_key = '$/f:floors/i:0'").run(chain('SECRETNAME \\u0041', m.IMG_ESC_ROUNDS + 6), D).changes, 1);
  let logs = []; due(W); { const l = console.log, w = console.warn; console.log = console.warn = (x) => logs.push(String(x)); try { await W.C.save(S.mgr2, { [KP2]: JSON.stringify({ t: TAG, n: ++n }) }); } finally { console.log = l; console.warn = w; } }
  let h = holds(logs); assert.equal(h.length, 1, 'held'); assert.equal(h[0].why, 'undecided', JSON.stringify(h[0]));
  assert.deepEqual(h[0].at, ['ops:ops_plan_live_floors_floor.f_name_text@' + D], 'the undecided place itself: ' + JSON.stringify(h[0]));
  assert.ok(!JSON.stringify(h).includes('SECRET'), 'no content'); assert.deepEqual(own(W, orp), before, 'nothing changes while it holds');
  assert.equal(DB.db.prepare("UPDATE ops_plan_live_floors_floor SET f_name_text = ? WHERE department_id = ? AND resource = 'bassam_plan_v1' AND row_key = '$/f:floors/i:0'").run(TAG + ' clean', D).changes, 1);
  const pass2 = async () => { const lg = []; due(W); const l = console.log, w = console.warn; console.log = console.warn = (x) => lg.push(String(x)); try { await W.C.save(S.mgr2, { [KP2]: JSON.stringify({ t: TAG, n: ++n }) }); } finally { console.log = l; console.warn = w; } return holds(lg); };
  /* the byte bound: more bytes of escape-bearing texts than IMG_ESC_CHARS — a NUL does not shorten what is counted */
  clear(); const row = 'y'.repeat(690000), rows = Math.ceil(m.IMG_ESC_CHARS / 690000) + 1;
  ins.run('bsdept:zz0:bassam_fake_v1', 0, 'a\u0000' + row); for (let q = 1; q < rows; q++) ins.run('bsdept:zz0:bassam_fake_v1', q, row); ins.run('bsdept:zz0:bassam_fake_v1', rows, '{"p":"C:\\\\u0041bc"}');
  h = await pass2(); assert.equal(h.length, 1, 'held'); assert.equal(h[0].why, 'chars', JSON.stringify(h[0])); assert.deepEqual(h[0].at, ['kv:bsdept:zz0:bassam_fake_v1']);
  /* the work bound: many texts, each decided alone, whose decoding together is more than a pass may spend */
  clear(); const heavy = 'y'.repeat(600000) + chain('C:\\u0041bc', 60), need = Math.ceil(m.IMG_ESC_PASS / (600000 * 61)) + 1;
  for (let k = 0; k < need; k++) ins.run('bsdept:zz' + String(k).padStart(3, '0') + ':bassam_fake_v1', 0, heavy);
  const c0 = performance.now(); h = await pass2(); const ms = Math.round(performance.now() - c0);
  assert.equal(h.length, 1, 'held'); assert.equal(h[0].why, 'work', JSON.stringify(h[0])); assert.equal(h[0].at.length, 1); assert.match(h[0].at[0], /^kv:bsdept:zz\d+:bassam_fake_v1$/);
  console.log('# F1 a pass that spends its whole work budget and holds: ' + ms + ' ms (' + need + ' texts of ' + heavy.length + ' chars, 61 rounds each)');
  assert.deepEqual(own(W, orp), before, 'nothing changes while it holds');
  clear(); h = await pass2(); assert.deepEqual(h, []); await pass(T); assert.ok(gone(await state(W, orp)), 'the sweep resumes once they are gone');
});

both(test, 'F1 · a held pass still deletes what an earlier pass already condemned', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, DB = W.env.DB; await settled(T);
  const m = await internals(['IMG_ESC_ROUNDS'], WORKER), dead = id('dead'), orp = id('orp'); await upload(W, S.mgr, dead); await upload(W, S.mgr, orp);
  DB.db.prepare("UPDATE imgown SET st = 'dead', k = '', ts = ? WHERE img = ?").run(Date.now() - 3600e3, dead); age(W, orp, 31); const before = own(W, orp);
  putKv(W, 'bsdept:zz0:bassam_fake_v1', '{"p":"' + chain('C:\\u0041bc', m.IMG_ESC_ROUNDS + 6) + '"}');
  const logs = []; await pass(T, logs);
  assert.equal(holds(logs).length, 1, 'the pass held'); assert.deepEqual(own(W, orp), before, 'the candidate is untouched');
  assert.ok(gone(await state(W, dead)), 'the condemned image is deleted all the same: ' + JSON.stringify(await state(W, dead)));
});

test('F1 · the decoder: one round equals the reference (a regex replace) on token soup; the work it counts follows tokens, not only characters', async () => {
  const m = await internals(['imgUnesc', 'imgDeepTexts', 'IMG_ESC_WORK', 'IMG_ESC_TOK'], WORKER);
  const RX = /\\(?:(["\\\/bfnrt])|u([0-9A-Fa-f]{4}))/g, CH = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };
  const ref = (s) => s.replace(RX, (x, c, h) => c ? CH[c] : String.fromCharCode(parseInt(h, 16)));
  const TOK = ['\\', '\\\\', '"', '/', 'b', 'f', 'n', 'r', 't', 'u', 'u0041', 'u00', '0', 'F', 'g', 'x', '\\u005c', '\\u12', 'é', '\\uD83D', 'U0041', ' ', '\u0000', '\\u00zz', '\\"'];
  let s = 7; const r = () => { s = (s * 48271) % 2147483647; return s / 2147483647; };
  for (let k = 0; k < 200000; k++) { let t = ''; const q = Math.floor(r() * 12); for (let j = 0; j < q; j++) t += TOK[Math.floor(r() * TOK.length)]; assert.equal(m.imgUnesc(t), ref(t), JSON.stringify(t)); }
  assert.ok(m.IMG_ESC_TOK >= 8);
  /* 2 MB of backslashes decide alone only if tokens are charged: here they are undecided by work, not by rounds */
  const dense = m.imgDeepTexts('\\'.repeat(Math.ceil(m.IMG_ESC_WORK / m.IMG_ESC_TOK) * 2 + 2));
  assert.equal(dense.undecided, true); assert.equal(dense.why, 'work');
});

/* ── round 2 · the search for the candidates is work too ───────────────────────────────────────────────────────────────────────── */
/* The reviewer's setup (one of its three values, so that a pass that asks two odd ids fits the budget): a stored value of 6.3 MB ('a' filler + a path nested 15 levels: 16 rounds each, each saveable alone) and stale
   uploads under odd-shaped 128-character ids made of an 'a' run with one 'b'. The search of every round for every selected candidate (one
   alternation) was not counted in the pass budget and took 7 s for 12 such ids, 21 s for 46. Now only the odd ids the pass really decides
   (IMG_SWEEP_ODD) are searched, each by indexOf, the alternation serves the scanner-shaped ids only, and every search of a round is charged. */
test('round 2 · the search is charged to the pass budget, odd ids are searched only when asked: twelve odd 128-character candidates over a 6.3 MB value nested 15 levels no longer cost seconds; what is kept and what is swept is unchanged', { timeout: 600000 }, async () => {
  const T = await scene('legacy'), { W, S, id } = T, DB = W.env.DB.db; await settled(T);
  const m = await internals(['imgEscKeep', 'IMG_ESC_PASS', 'IMG_SWEEP_ODD'], WORKER);
  const text = JSON.stringify({ t: TAG, pad: 'a'.repeat(6.3e6), p: chain('C:\\u0041bc', 15) });
  const r = await W.C.save(S.mgr, { [KP]: text }); assert.equal(why(r, KP), null, 'such a value is accepted');
  const odd = Array.from({ length: 12 }, (_, i) => 'a'.repeat(80 + i) + 'b' + 'a'.repeat(47 - i)), reg = Array.from({ length: 12 }, (_, i) => 'img_cand' + i + '_zz');
  /* the function itself, with a deterministic counter: the work a call spent */
  const one = await m.imgEscKeep(W.env, reg.slice(0, 1)), three = await m.imgEscKeep(W.env, reg.slice(0, 1).concat(odd.slice(0, 2)));
  assert.ok(one.work > 0 && !one.hold, 'the work spent is reported: ' + JSON.stringify(one).slice(0, 120));
  assert.ok(three.work >= one.work * 2, 'each searched id adds its scans of every round: ' + one.work + ' → ' + three.work);
  assert.ok(three.work <= m.IMG_ESC_PASS, 'the ids one pass asks: inside the budget');
  const t0 = performance.now(), all = await m.imgEscKeep(W.env, odd), ms = Math.round(performance.now() - t0);
  assert.equal(all.hold, 'work', 'twelve odd ids searched in every round is more than a pass may spend: it stops, it does not run on'); assert.deepEqual(all.at, ['kv:' + KP]);
  /* a real pass: 12 stale odd uploads (one of them named by an escaped spelling in a small value), a regular stale upload */
  for (const o of odd) await upload(W, S.mgr2, o);
  const ctl = id('ctl'); await upload(W, S.mgr2, ctl);
  putKv(W, 'bsdept:zz0:bassam_fake_v1', '{"logo":"' + U('a') + odd[0].slice(1) + '"}');
  DB.exec("UPDATE imgown SET ts = ts - " + (32 * 864e5) + " WHERE st = 'claim'"); odd.forEach((o, i) => DB.prepare('UPDATE imgown SET ts = ts - ? WHERE img = ?').run((12 - i) * 1000, o));   DB.prepare('UPDATE imgown SET ts = ts - 99000 WHERE img = ?').run(ctl);   /* a pass takes the oldest six: ctl, then odd[0], odd[1] … */
  const before = own(W, odd[0]), logs = [], t1 = performance.now(); await pass(T, logs); const passMs = Math.round(performance.now() - t1);
  console.log('# round 2: imgEscKeep with 12 odd ids ' + ms + ' ms (holds: work) · work for 1 regular id ' + one.work + ', + 2 odd ids ' + three.work + ' of ' + m.IMG_ESC_PASS + ' · the whole save that ran the pass ' + passMs + ' ms');
  assert.deepEqual(holds(logs), [], 'the pass decided');
  assert.equal(m.IMG_SWEEP_ODD, 2);
  const s0 = await state(W, odd[0]); assert.equal(s0.r2, PNG, 'the odd upload a value spells by an escape is kept'); assert.equal(s0.st, 'claim'); assert.ok(own(W, odd[0]).ts > before.ts, 'its clock restarted');
  assert.ok(gone(await state(W, odd[1])), 'the other odd upload asked by this pass, named nowhere, is swept');
  assert.ok(gone(await state(W, ctl)), 'the regular stale upload is swept');
  for (const o of odd.slice(2)) { const s = await state(W, o); assert.equal(s.st, 'claim', 'a deferred odd upload is not condemned by this pass'); assert.equal(s.r2, PNG); }
  assert.ok(ms < 1000, 'imgEscKeep with twelve odd candidates: ' + ms + ' ms'); assert.ok(passMs < 1500, 'the pass: ' + passMs + ' ms');
});
