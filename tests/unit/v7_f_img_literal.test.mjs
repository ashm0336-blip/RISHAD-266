/* V7-F · fourth independent review — the escape decoder of the third review (ordered literal replacements per level, up to 8 levels, JS and
   SQL) was proven by running to be a regression: at JSON nesting depth >= 3 a spelling such as "\"\\\"i\\\\u006dg_a_b\\\"\"" (three JSON.parse
   calls give img_a_b) was seen by neither the save check nor the sweep — a unit-2 manager could bind a unit-1 image, and an upload mentioned
   only by that spelling was deleted. And while a spelling stayed "deep", the sweep's keep step turned every unreferenced orphan 'amb' for good.
   The fourth review's answer was the conservative rule: ids matched literally only, a saved text carrying a JSON \u00XX escape of an id
   character or of '\' refused ('img-escape') by every writer, and every pass held while a stored text carried one.
   Owner decision after the fifth review: user text is not refused. Now (054 imgDeepEach) such a text is unescaped structure-blind, round
   after round until it stops changing, and every round is scanned literally — there is no nesting depth to get wrong — so the depth-3
   spelling IS the id: the unit-2 save is refused as for the literal id ('imgown'), the owner's is accepted and registered, an upload
   mentioned only by that spelling is kept by the sweep, and the orphans nothing names are swept in the same pass (never 'amb', never held).
   Each scenario of the fourth review is still here, with the outcome now decided. Real worker, legacy and enforce, rows and R2 bytes (fuzz: the worker's own functions). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { internals } from './internals.mjs';
import { WORKER } from './harness.mjs';
import { D, D2, PNG, TAG, dk, both, scene, state, gone, edit, upload, age, due, EDIT } from './v7_f_img_fx.mjs';
import { world as tasksWorld, ME, hij, HR, taskCommandBody } from './tasks_fx.mjs';
import { world as restoreWorld } from './atomic_restore_review_fx.mjs';
import { D1, IDS } from './notifications_review_fx.mjs';
import { inspectOperationalFixture } from './operational_legacy_seed_fx.mjs';

let n = 0;
const typedSave = async (T) => { const s = await edit(T.W, T.S.mgr2, D2, 'plan', (v) => { v.floors[0].name = TAG + ' lit ' + (++n); }); assert.ok(s.ok, JSON.stringify(s.j).slice(0, 200)); };
/* one pass (the 10 minutes are over), its log lines kept */
async function pass(T, logs) {
  due(T.W); const log = console.log, warn = console.warn;
  console.log = console.warn = (m) => { if (logs) logs.push(String(m)); };
  try { await typedSave(T); } finally { console.log = log; console.warn = warn; }
}
const holds = (logs) => logs.map((l) => { try { return JSON.parse(l); } catch (e) { return {}; } }).filter((l) => l.ev === 'img-sweep-escape-hold');
const own = (W, i) => W.env.DB.q('SELECT st, ts, k, uid, dept FROM imgown WHERE img = ?', i)[0] || null;
/* the reviewer's depth-3 spelling: {"doc": JSON.stringify(JSON.stringify(id with its 6th character escaped))} — three JSON.parse calls give the id */
const spell3 = (i) => JSON.stringify({ t: TAG, doc: JSON.stringify('"' + i.slice(0, 5) + '\\u00' + i.charCodeAt(5).toString(16) + i.slice(6) + '"') });
/* the reviewer's 9-level spelling (not settled after 8 levels of the old decoder) */
let deep9 = '\\u0069mg_zz_zz'; for (let k = 0; k < 9; k++) deep9 = deep9.replace(/\\/g, '\\u005c');

/* ── fuzz of REAL JSON nesting (the reviewer's p1 generator): every chain verified by JSON.parse down to the id ─────────────────────── */
let s0 = 12345; const rand = () => { s0 = (s0 * 1103515245 + 12345) & 0x7fffffff; return s0 / 0x7fffffff; };
const hx = (c) => { const h = c.toString(16).padStart(2, '0'); return rand() < 0.5 ? h : h.toUpperCase(); };
function enc(str, p) {
  let o = '"';
  for (const ch of str) {
    if (ch === '"') o += rand() < 0.7 ? '\\"' : '\\u0022';
    else if (ch === '\\') o += rand() < 0.5 ? '\\\\' : '\\u00' + hx(0x5c);
    else if (/[0-9A-Za-z_]/.test(ch) && rand() < p) o += '\\u00' + hx(ch.charCodeAt(0));
    else o += ch;
  }
  return o + '"';
}
function chains(N) {
  const out = [], ctx = ['', 'x', '9', 'A', '_', '\\', ' '];
  for (let it = 0; it < N; it++) {
    const id = 'img_' + Math.floor(rand() * 1e9).toString(36) + '_' + Math.floor(rand() * 1e6).toString(36), depth = 1 + Math.floor(rand() * 8), p = rand() < 0.15 ? 0 : rand();
    let t = id, big = false;
    for (let d = 0; d < depth && !big; d++) {
      const pre = rand() < 0.3 ? ctx[Math.floor(rand() * ctx.length)] : '', post = rand() < 0.3 ? ctx[Math.floor(rand() * ctx.length)] : '';
      t = '{"a":' + enc(t, p) + ',"b":' + enc(pre + 'z' + post, p) + '}';
      if (t.length > 60000) big = true;
    }
    if (big) continue;
    let v = t; for (let d = 0; d < depth; d++) v = JSON.parse(v).a;
    assert.equal(v, id, 'the chain parses down to the id');
    out.push({ id, depth, t });
  }
  return out;
}
/* imgForeignIn with a store that knows no image: it can only answer 'img-escape' (refused for its spelling — only past the bound on rounds) or '' (accepted) */
const noDb = { DB: { prepare: () => ({ bind: () => ({ first: async () => null, all: async () => ({ results: [] }) }) }) } };
const A0 = { u: { id: 'tst_u', role: 'staff' }, depts: [] };

test('fuzz · real JSON nesting, depths 1–8, random \\u escapes: every text that names an id is read as naming it — none is refused for its spelling, none hides its id', async () => {
  const m = await internals(['imgIdsIn', 'imgForeignIn'], WORKER), C = chains(4000), miss = [], by = {}; let refusedN = 0;
  for (const c of C) {
    const refused = (await m.imgForeignIn(noDb, A0, dk(D, 'profile'), c.t, '', {})) === 'img-escape', found = !!m.imgIdsIn(c.t)[c.id];
    const b = by[c.depth] = by[c.depth] || { n: 0, hidden: 0, found: 0 }; b.n++; if (!c.t.includes(c.id)) b.hidden++; if (found) b.found++; if (refused) refusedN++;
    if (!found) miss.push({ depth: c.depth, t: c.t.slice(0, 200) });
  }
  console.log('# fuzz ' + C.length + ' chains · by depth ' + JSON.stringify(by) + ' · refused for the spelling: ' + refusedN + ' · id not found: ' + miss.length);
  assert.ok(Object.keys(by).length === 8 && C.length > 3000, 'the corpus covers every depth');
  for (const d of Object.keys(by)) assert.ok(by[d].hidden > 50, 'depth ' + d + ' has spellings that hide the id from the literal text');
  assert.equal(refusedN, 0, 'A TEXT REFUSED FOR ITS SPELLING');
  assert.deepEqual(miss.slice(0, 3), [], 'A SPELLING THE SAVE DOES NOT SEE');
});

test('fuzz · the sweep reads (SQL) exactly the texts the save decodes (JS) — every row cut of a value — and JSON.stringify never trips either', async () => {
  const m = await internals(['imgEsc', 'imgEscHold'], WORKER);
  const db = new DatabaseSync(':memory:'); db.exec('CREATE TABLE kv (k TEXT NOT NULL, seq INTEGER NOT NULL, v TEXT NOT NULL, PRIMARY KEY (k, seq))');
  /* the hold statement reads the typed records too: an empty stand-in for every table the worker names there */
  const env = { DB: { prepare: (sql) => { for (const t of new Set(sql.match(/\bFROM (ops_[a-z0-9_]+)/g) || [])) { const tb = t.slice(5); if (!db.prepare("SELECT 1 FROM sqlite_master WHERE name = ?").get(tb)) {
    const cols = [...new Set((sql.match(new RegExp('coalesce\\(([a-z0-9_]+), \'\'\\)', 'g')) || []).map((x) => x.slice(9, -5)))]; db.exec('CREATE TABLE ' + tb + ' (' + cols.concat(['zz_pad']).join(' TEXT, ') + ' TEXT)'); } }
    const st = db.prepare(sql); return { first: async () => st.get() }; } } };
  const hold = async (rows) => { db.exec('DELETE FROM kv'); const ins = db.prepare("INSERT INTO kv VALUES ('k', ?, ?)"); rows.forEach((r, i) => ins.run(i, r)); return (await m.imgEscHold(env)) > 0; };
  const TOK = ['\\', '\\\\', 'u', 'u00', '\\u00', '\\u005c', '\\u005C', '\\u005b', '\\u0069', '\\u0049', '\\u006D', '\\u0060', '\\u007b', '\\u007A', '\\u0040', '\\u003a', '\\u002f',
    '\\u0030', '\\u0039', '\\u005f', '\\u005F', '\\u005e', '\\u0041', '\\u005A', '\\u0000', '\\u001f', '\\u00e9', '\\U0069', 'img_', 'a', '"', '0', 'F', 'f'];
  let rs = 7; const r = () => { rs = (rs * 48271) % 2147483647; return rs / 2147483647; };
  /* the near misses alone (escapes of other characters, broken escapes) — so both answers are well exercised */
  const NEAR = TOK.filter((t) => !m.imgEsc(t));
  const texts = chains(200).map((c) => c.t);
  for (let k = 0; k < 2000; k++) { const P = r() < 0.5 ? NEAR : TOK; let t = ''; const q = 1 + Math.floor(r() * 10); for (let j = 0; j < q; j++) t += P[Math.floor(r() * P.length)]; texts.push(t); }
  let bad = 0, cuts = 0, on = 0;
  for (const t of texts) {
    const js = m.imgEsc(t); if (js) on++;
    if ((await hold([t])) !== js) { bad++; continue; }
    if (t.length < 24) for (let c = 1; c < t.length; c++) { cuts++; if ((await hold([t.slice(0, c), t.slice(c)])) !== js) { bad++; break; } }
  }
  /* what an ordinary client writes: JSON.stringify of any text (every ASCII character, controls, lone surrogates, non-ASCII) */
  let plain = 0; for (let k = 0; k < 3000; k++) { let s = ''; const q = 1 + Math.floor(r() * 20); for (let j = 0; j < q; j++) s += String.fromCharCode(r() < 0.8 ? Math.floor(r() * 128) : r() < 0.5 ? 0xd800 + Math.floor(r() * 2048) : Math.floor(r() * 0x3000));
    const t = JSON.stringify({ t: s, u: JSON.stringify(s) }); if (m.imgEsc(t) || await hold([t])) plain++; }
  console.log('# parity ' + texts.length + ' texts (' + on + ' carry an escape) · ' + cuts + ' row cuts · differ ' + bad + ' · ordinary JSON.stringify texts tripped: ' + plain);
  assert.ok(on > 500 && on < texts.length - 500, 'both kinds are exercised');
  assert.equal(bad, 0, 'the save (JS) and the sweep (SQL) disagree'); assert.equal(plain, 0, 'an ordinary client text is taken for one that may hide an id');
});

/* ── end to end ────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
both(test, 'P14 · the depth-3 spelling: a unit-2 save naming a unit-1 image is refused as for the literal id; the owner\'s is accepted and registered; as older data it keeps its image (nothing deleted) while the unrelated orphan is swept; once it is gone the image is swept', async (mode) => {
  const T = await scene(mode), { W, S, id } = T;
  const victim = id('victim'); await upload(W, S.mgr, victim);
  assert.ok((await edit(W, S.mgr, D, 'plan', EDIT.plan(victim))).ok, 'bound into the unit-1 plan');
  const text = spell3(victim); let v = JSON.parse(text).doc; v = JSON.parse(v); v = JSON.parse(v); assert.equal(v, victim); assert.ok(!text.includes(victim));
  const KP = dk(D2, 'profile'), r = await W.C.save(S.mgr2, { [KP]: text }), den = (r.j.denied || {})[KP];
  assert.notEqual((W.env.DB.q('SELECT v FROM kv WHERE k = ?', KP)[0] || {}).v, text, 'FOREIGN REFERENCE ACCEPTED');
  assert.equal(den && den.why, 'imgown', JSON.stringify(r.j).slice(0, 300));
  const lit = await W.C.save(S.mgr2, { [KP]: JSON.stringify({ t: TAG, doc: victim }) });
  assert.deepEqual(r.j, lit.j, 'the very answer the literal id gets'); assert.equal(r.status, lit.status);
  assert.deepEqual((await state(W, victim)).refs, [dk(D, 'plan')], 'no reference row for unit 2');
  const mine = id('mine'), hid = id('hid'), ctl = id('ctl'); await upload(W, S.mgr, mine); await upload(W, S.mgr, hid); await upload(W, S.mgr2, ctl);
  const KN = dk(D, 'profile'), r2 = await W.C.save(S.mgr, { [KN]: spell3(mine) });
  assert.equal((r2.j.denied || {})[KN], undefined, 'the unit-1 manager is accepted with the same spelling of his own upload · ' + JSON.stringify(r2.j).slice(0, 200));
  assert.deepEqual((await state(W, mine)).refs, [KN], 'and it is registered'); assert.equal((await state(W, mine)).st, 'bound');
  /* the same kind of text as older data (stored by an earlier version / a direct write), the only mention of hid */
  const KO = dk(D, 'notes'); W.env.DB.db.prepare('INSERT OR REPLACE INTO kv (k, seq, v) VALUES (?, 0, ?)').run(KO, spell3(hid));
  age(W, hid, 31); age(W, ctl, 31); age(W, mine, 31); const logs = [];
  for (let k = 0; k < 3; k++) await pass(T, logs);
  const sh = await state(W, hid);
  assert.equal(sh.r2, PNG, 'LIVE-REFERENCED IMAGE DELETED'); assert.equal(sh.st, 'claim', 'kept, its uploader\'s still'); assert.deepEqual(sh.refs, []);
  assert.equal((await state(W, mine)).r2, PNG, 'the registered one is kept');
  assert.ok(gone(await state(W, ctl)), 'the unrelated orphan is swept while the text is there');
  assert.deepEqual(holds(logs), [], 'no pass held');
  W.env.DB.db.prepare('DELETE FROM kv WHERE k = ?').run(KO);
  age(W, hid, 31); for (let k = 0; k < 3; k++) await pass(T);
  assert.ok(gone(await state(W, hid)), 'swept once the text is gone');
});

both(test, 'P3 · while a kv value holds a nine-level spelling, an unreferenced orphan it does not name is swept as usual — never amb, never held; the image it does name is kept', async (mode) => {
  const T = await scene(mode), { W, S, id } = T;
  const orp = id('orp'), ctl = id('ctl'); await upload(W, S.mgr, orp); await upload(W, S.mgr, ctl);
  W.env.DB.db.prepare("UPDATE imgown SET st = 'orphan', k = '', dept = ? WHERE img IN (?, ?)").run(D, orp, ctl);
  /* ctl is the image the nine-level spelling names */
  let deepCtl = '\\u0069' + ctl.slice(1); for (let k = 0; k < 9; k++) deepCtl = deepCtl.replace(/\\/g, '\\u005c');
  W.env.DB.db.prepare('INSERT OR REPLACE INTO kv (k, seq, v) VALUES (?, 0, ?)').run(dk(D, 'notes'), '{"t":"' + TAG + '","x":"' + deep9 + '","y":"' + deepCtl + '"}');
  age(W, orp, 31); age(W, ctl, 31); const logs = [], seen = [];
  for (let k = 0; k < 3; k++) { await pass(T, logs); seen.push((own(W, orp) || {}).st || 'gone'); }
  assert.ok(!seen.includes('amb'), 'an unreferenced orphan met while the value exists never turns amb · ' + seen);
  assert.ok(gone(await state(W, orp)), 'and it is swept while the value exists · ' + seen);
  assert.deepEqual(holds(logs), [], 'no pass held');
  assert.equal((await state(W, ctl)).r2, PNG, 'the orphan the value names is kept'); assert.equal((await state(W, ctl)).st, 'amb', 'as a referenced orphan');
});

both(test, 'P6 · such a spelling in a typed record\'s text with an odd-shaped candidate: nothing it does not name turns amb or is re-clocked — both are swept while the text is there, no pass held', async (mode) => {
  const T = await scene(mode), { W, S, x, id } = T, DB = W.env.DB.db;
  const orp = id('orp'), odd = 'Odd' + x; await upload(W, S.mgr, orp); await upload(W, S.mgr2, odd);
  DB.prepare("UPDATE imgown SET st = 'orphan', k = '', dept = ? WHERE img = ?").run(D, orp);
  assert.ok(DB.prepare('UPDATE ops_plan_live_floors_floor SET f_name_text = ? WHERE department_id = ?').run(deep9, D).changes > 0);
  age(W, orp, 31); age(W, odd, 32); const b = { odd: own(W, odd) }, logs = [], seen = [];
  await pass(T, logs); seen.push((own(W, orp) || {}).st || 'gone');
  assert.ok(!own(W, odd) || own(W, odd).ts <= b.odd.ts || own(W, odd).st === 'dead', 'the odd upload is not re-clocked as a referenced one');
  for (let k = 0; k < 3; k++) { DB.exec("UPDATE imgown SET ts = ts - 3700000 WHERE st IN ('claim', 'orphan')"); await pass(T, logs); seen.push((own(W, orp) || {}).st || 'gone'); }
  assert.ok(!seen.includes('amb'), 'the unreferenced orphan never turns amb · ' + seen);
  assert.ok(DB.prepare("SELECT COUNT(*) n FROM ops_plan_live_floors_floor WHERE f_name_text = ?").get(deep9).n > 0, 'the text is still there');
  assert.ok(gone(await state(W, orp)), 'orphan swept while the text is there'); assert.ok(gone(await state(W, odd)), 'odd upload swept too');
  assert.deepEqual(holds(logs), [], 'no pass held');
});

/* ── the other writers: the same acceptance of honest text (the fourth review refused it) ─────────────────────────────────────── */
const esc1 = '\\u0041bc';                                                    /* one escaped letter: A = 'A' */
for (const mode of ['legacy', 'enforce']) test('task note · an employee\'s note carrying a \\u escape of an id character is accepted and stored as written [' + mode + ']', { timeout: 600000 }, async () => {
  const W = await tasksWorld({ mode }), dm = await W.login('0000000101', '70101'), me = await W.login(ME.un, ME.pw);
  const post = (ck, p, body) => W.C.api(p, { method: 'POST', cookie: ck, body: taskCommandBody(W.env, p, body) });
  const s = Date.now() - HR, cr = await post(dm.ck, '/api/tasks/create', { k: hij(s), t: TAG + ' lit', s, e: s + 3 * HR, asg: [ME.eid], rv: 'none' }); assert.equal(cr.status, 200);
  const k = cr.j.rows[0].k, rid = cr.j.rows[0].id;
  assert.equal((await post(me.ck, '/api/me/tasks/act', { k, id: rid, act: 'start' })).status, 200);
  const ok = await post(me.ck, '/api/me/tasks/act', { k, id: rid, act: 'doc', note: TAG + ' a plain note \\ with a backslash' });
  assert.equal(ok.status, 200, 'an ordinary note is accepted · ' + JSON.stringify(ok.j).slice(0, 200));
  const r = await post(me.ck, '/api/me/tasks/act', { k, id: rid, act: 'doc', note: esc1 });
  assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 200)); assert.notEqual(r.j.why, 'img-escape');
  assert.equal(W.env.DB.q("SELECT COUNT(*) n FROM ops_task_row_proof WHERE f_note_text = ?", esc1)[0].n, 1, 'stored as written');
});

test('backup restore · a typed record carrying a \\u escape of an id character is restored as written', { timeout: 600000 }, async () => {
  const B = await restoreWorld(), OPTIONS = 'bsdept:' + D1 + ':bassam_options_v1';
  const restored = JSON.stringify({ type: [esc1], work: [TAG + ' restored'] }), request = await B.body({ scope: { kind: 'full' } });
  const keep = (o) => Object.fromEntries(Object.entries(o).filter(([name]) => name !== 'operations'));
  const file = { app: 'bassam-crowd', version: 3, kind: 'full', data: { ...request.keys, [OPTIONS]: restored }, domains: keep(request.domains),
    manifest: { ...request.manifest, version: 3, domains: keep(request.manifest.domains), keys: request.manifest.keys.concat([OPTIONS]) } };
  const r = await B.api('super', '/api/backup/restore', { version: 1, uid: IDS.super, requestId: 'TEST_ONLY_lit_restore', scope: { kind: 'full' }, mode: 'replace', reason: TAG + ' lit', base: request.base, backup: file, phase: 'commit', legacyConsent: false });
  const v = inspectOperationalFixture(B.env, OPTIONS);
  console.log('# restore', r.status, JSON.stringify(r.json).slice(0, 300), JSON.stringify(v).slice(0, 200));
  assert.equal(r.status, 200, 'restored · ' + JSON.stringify(r.json).slice(0, 200));
  assert.ok(v && v.type && v.type[0] === esc1, 'the text is written as it was in the file');
});
