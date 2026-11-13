/* V7-F · fourth independent review — the escape decoder of the third review (ordered literal replacements per level, up to 8 levels, JS and
   SQL) was proven by running to be a regression: at JSON nesting depth >= 3 a spelling such as "\"\\\"i\\\\u006dg_a_b\\\"\"" (three JSON.parse
   calls give img_a_b) was seen by neither the save check nor the sweep — a unit-2 manager could bind a unit-1 image, and an upload mentioned
   only by that spelling was deleted. And while a spelling stayed "deep", the sweep's keep step turned every unreferenced orphan 'amb' for good.
   Now (054, the conservative rule): ids are matched literally only; a saved text carrying a JSON \u00XX escape of an id character or of '\'
   is refused ('img-escape') by every writer; while any text the sweep reads holds one, a pass changes nothing at all and says so
   (img-sweep-escape-hold); it resumes by itself once that text is gone.
   Each test here fails on the decoder build and passes on this one. Real worker, legacy and enforce, rows and R2 bytes (fuzz: the worker's own functions). */
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
/* imgForeignIn with a store that knows no image: it can only answer 'img-escape' (refused for its spelling) or '' (accepted) */
const noDb = { DB: { prepare: () => ({ bind: () => ({ first: async () => null, all: async () => ({ results: [] }) }) }) } };
const A0 = { u: { id: 'tst_u', role: 'staff' }, depts: [] };

test('fuzz · real JSON nesting, depths 1–8, random \\u escapes: every text that names an id is either refused at the save or names it literally', async () => {
  const m = await internals(['imgIdsIn', 'imgForeignIn'], WORKER), C = chains(4000), miss = [], by = {};
  for (const c of C) {
    const refused = (await m.imgForeignIn(noDb, A0, dk(D, 'profile'), c.t, '', {})) === 'img-escape', found = !!m.imgIdsIn(c.t)[c.id];
    const b = by[c.depth] = by[c.depth] || { n: 0, refused: 0, literal: 0 }; b.n++; if (refused) b.refused++; if (found) b.literal++;
    if (!refused && !found) miss.push({ depth: c.depth, t: c.t.slice(0, 200) });
  }
  console.log('# fuzz ' + C.length + ' chains · by depth ' + JSON.stringify(by) + ' · neither refused nor literal: ' + miss.length);
  assert.ok(Object.keys(by).length === 8 && C.length > 3000, 'the corpus covers every depth');
  assert.deepEqual(miss.slice(0, 3), [], 'A SPELLING THE SAVE NEITHER REFUSES NOR SEES');
});

test('fuzz · the sweep holds on exactly the texts the save refuses (JS ⇔ SQL, every row cut of a value), and JSON.stringify never trips either', async () => {
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
  assert.equal(bad, 0, 'the save (JS) and the sweep (SQL) disagree'); assert.equal(plain, 0, 'an ordinary client text is refused / holds the sweep');
});

/* ── end to end ────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
both(test, 'P14 · the depth-3 spelling: a unit-2 save naming a unit-1 image is refused, the owner\'s too; as older data it holds the sweep (nothing deleted), which resumes once it is gone', async (mode) => {
  const T = await scene(mode), { W, S, id } = T;
  const victim = id('victim'); await upload(W, S.mgr, victim);
  assert.ok((await edit(W, S.mgr, D, 'plan', EDIT.plan(victim))).ok, 'bound into the unit-1 plan');
  const text = spell3(victim); let v = JSON.parse(text).doc; v = JSON.parse(v); v = JSON.parse(v); assert.equal(v, victim); assert.ok(!text.includes(victim));
  const KP = dk(D2, 'profile'), r = await W.C.save(S.mgr2, { [KP]: text }), den = (r.j.denied || {})[KP];
  assert.notEqual((W.env.DB.q('SELECT v FROM kv WHERE k = ?', KP)[0] || {}).v, text, 'FOREIGN REFERENCE ACCEPTED');
  assert.equal(den && den.why, 'img-escape', JSON.stringify(r.j).slice(0, 300));
  assert.deepEqual((await state(W, victim)).refs, [dk(D, 'plan')], 'no reference row for unit 2');
  const hid = id('hid'), ctl = id('ctl'); await upload(W, S.mgr, hid); await upload(W, S.mgr2, ctl);
  const KN = dk(D, 'profile'), r2 = await W.C.save(S.mgr, { [KN]: spell3(hid) });
  assert.equal(((r2.j.denied || {})[KN] || {}).why, 'img-escape', 'the unit-1 manager is refused the same spelling of his own upload');
  /* the same text as older data (stored by an earlier version / a direct write), the only mention of hid */
  W.env.DB.db.prepare('INSERT OR REPLACE INTO kv (k, seq, v) VALUES (?, 0, ?)').run(KN, spell3(hid));
  age(W, hid, 31); age(W, ctl, 31); const before = { hid: own(W, hid), ctl: own(W, ctl) }, logs = [];
  for (let k = 0; k < 3; k++) await pass(T, logs);
  const sh = await state(W, hid);
  assert.equal(sh.r2, PNG, 'LIVE-REFERENCED IMAGE DELETED'); assert.deepEqual(own(W, hid), before.hid, 'and its row is unchanged');
  assert.deepEqual(own(W, ctl), before.ctl, 'the pass changes nothing at all while the text is there (the control too)');
  assert.ok(holds(logs).length >= 1 && holds(logs)[0].n >= 1, 'each held pass says so · ' + JSON.stringify(holds(logs)));
  W.env.DB.db.prepare('DELETE FROM kv WHERE k = ?').run(KN);
  for (let k = 0; k < 3; k++) await pass(T);
  assert.ok(gone(await state(W, hid)) && gone(await state(W, ctl)), 'the sweep resumes once the text is gone');
});

both(test, 'P3 · while a kv value holds such a spelling, an unreferenced orphan stays an orphan (never amb), its clock untouched; once the value is gone it is swept', async (mode) => {
  const T = await scene(mode), { W, S, id } = T;
  const orp = id('orp'), ctl = id('ctl'); await upload(W, S.mgr, orp); await upload(W, S.mgr, ctl);
  W.env.DB.db.prepare("UPDATE imgown SET st = 'orphan', k = '', dept = ? WHERE img IN (?, ?)").run(D, orp, ctl);
  W.env.DB.db.prepare('INSERT OR REPLACE INTO kv (k, seq, v) VALUES (?, 0, ?)').run(dk(D, 'notes'), '{"t":"' + TAG + '","x":"' + deep9 + '"}');
  age(W, orp, 31); const b = own(W, orp), logs = []; await pass(T, logs); await pass(T, logs);
  assert.deepEqual(own(W, orp), b, 'an unreferenced orphan met while the value exists stays exactly as it was (it became ' + (own(W, orp) || {}).st + ')');
  assert.ok(holds(logs).length >= 1);
  W.env.DB.db.prepare('DELETE FROM kv WHERE k = ?').run(dk(D, 'notes'));
  age(W, orp, 31); age(W, ctl, 31); for (let k = 0; k < 3; k++) await pass(T);
  assert.ok(gone(await state(W, orp)), 'swept once the value is gone'); assert.ok(gone(await state(W, ctl)), 'the control too');
});

both(test, 'P6 · such a spelling in a typed record\'s text with an odd-shaped candidate: nothing turns amb, nothing is re-clocked; once it is gone both are swept', async (mode) => {
  const T = await scene(mode), { W, S, x, id } = T, DB = W.env.DB.db;
  const orp = id('orp'), odd = 'Odd' + x; await upload(W, S.mgr, orp); await upload(W, S.mgr2, odd);
  DB.prepare("UPDATE imgown SET st = 'orphan', k = '', dept = ? WHERE img = ?").run(D, orp);
  const was = DB.prepare('SELECT f_name_text v FROM ops_plan_live_floors_floor WHERE department_id = ?').all(D);
  assert.ok(DB.prepare('UPDATE ops_plan_live_floors_floor SET f_name_text = ? WHERE department_id = ?').run(deep9, D).changes > 0);
  age(W, orp, 31); age(W, odd, 32); const b = { orp: own(W, orp), odd: own(W, odd) }, logs = []; await pass(T, logs);
  assert.deepEqual(own(W, orp), b.orp, 'the unreferenced orphan is unchanged (it became ' + (own(W, orp) || {}).st + ')');
  assert.deepEqual(own(W, odd), b.odd, 'the odd upload is unchanged (no clock restart)');
  assert.ok(holds(logs).length >= 1);
  DB.prepare('UPDATE ops_plan_live_floors_floor SET f_name_text = ? WHERE department_id = ?').run(was[0] ? was[0].v : '', D);
  for (let k = 0; k < 3; k++) { DB.exec("UPDATE imgown SET ts = ts - 3700000 WHERE st IN ('claim', 'orphan')"); await pass(T); }
  assert.ok(gone(await state(W, orp)), 'orphan swept once the text is gone'); assert.ok(gone(await state(W, odd)), 'odd upload swept too');
});

/* ── the other writers: the same refusal (a one-level escape the decoder build accepted) ──────────────────────────────────────── */
const esc1 = '\\u0041bc';                                                    /* one escaped letter: A = 'A' */
for (const mode of ['legacy', 'enforce']) test('task note · an employee\'s note carrying a \\u escape of an id character is refused [' + mode + ']', { timeout: 600000 }, async () => {
  const W = await tasksWorld({ mode }), dm = await W.login('0000000101', '70101'), me = await W.login(ME.un, ME.pw);
  const post = (ck, p, body) => W.C.api(p, { method: 'POST', cookie: ck, body: taskCommandBody(W.env, p, body) });
  const s = Date.now() - HR, cr = await post(dm.ck, '/api/tasks/create', { k: hij(s), t: TAG + ' lit', s, e: s + 3 * HR, asg: [ME.eid], rv: 'none' }); assert.equal(cr.status, 200);
  const k = cr.j.rows[0].k, rid = cr.j.rows[0].id;
  assert.equal((await post(me.ck, '/api/me/tasks/act', { k, id: rid, act: 'start' })).status, 200);
  const ok = await post(me.ck, '/api/me/tasks/act', { k, id: rid, act: 'doc', note: TAG + ' a plain note \\ with a backslash' });
  assert.equal(ok.status, 200, 'an ordinary note is accepted · ' + JSON.stringify(ok.j).slice(0, 200));
  const r = await post(me.ck, '/api/me/tasks/act', { k, id: rid, act: 'doc', note: esc1 });
  assert.equal(r.status, 403, JSON.stringify(r.j).slice(0, 200)); assert.equal(r.j.why, 'img-escape');
  assert.equal(W.env.DB.q("SELECT COUNT(*) n FROM ops_task_row_proof WHERE instr(f_note_text, '\\u0041') > 0")[0].n, 0, 'not stored');
});

test('backup restore · a typed record carrying a \\u escape of an id character is refused, nothing written', { timeout: 600000 }, async () => {
  const B = await restoreWorld(), OPTIONS = 'bsdept:' + D1 + ':bassam_options_v1';
  const restored = JSON.stringify({ type: [esc1], work: [TAG + ' restored'] }), request = await B.body({ scope: { kind: 'full' } });
  const keep = (o) => Object.fromEntries(Object.entries(o).filter(([name]) => name !== 'operations'));
  const file = { app: 'bassam-crowd', version: 3, kind: 'full', data: { ...request.keys, [OPTIONS]: restored }, domains: keep(request.domains),
    manifest: { ...request.manifest, version: 3, domains: keep(request.manifest.domains), keys: request.manifest.keys.concat([OPTIONS]) } };
  const r = await B.api('super', '/api/backup/restore', { version: 1, uid: IDS.super, requestId: 'TEST_ONLY_lit_restore', scope: { kind: 'full' }, mode: 'replace', reason: TAG + ' lit', base: request.base, backup: file, phase: 'commit', legacyConsent: false });
  const v = inspectOperationalFixture(B.env, OPTIONS);
  console.log('# restore', r.status, JSON.stringify(r.json).slice(0, 300), JSON.stringify(v).slice(0, 200));
  assert.notEqual(r.status, 200, 'refused · ' + JSON.stringify(r.json).slice(0, 200));
  assert.ok(!(v && v.type && v.type[0] === esc1), 'the escaped text was not written');
});
