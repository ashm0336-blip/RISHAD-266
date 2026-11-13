/* V7-F · owner decision after the fifth review — user text is never refused for carrying a JSON escape; the checker compares DECODED values.
   Before: a save that ADDED a \u00XX escape of an id character or of '\' was refused ('img-escape' — a Windows path such as C:\u0041bc was
   refused), and one such text anywhere held the whole sweep. Now (054 imgDeepEach / imgDeepTexts): a text that may hide an id is unescaped
   structure-blind, round after round, until it stops changing; every round is scanned literally, so an escaped spelling of an id — at any JSON
   nesting depth — is treated exactly like the literal id:
   · save: bound if the literal would be bound, refused as foreign if the literal would be refused, recorded in imgref;
   · sweep: a candidate whose id appears in any round of an escape-bearing text (kv value · ops_* text) is kept; honest text keeps nothing and
     holds nothing. Only the extreme case still holds the whole pass / refuses the save: more texts than the bound, or a text that is still
     changing after IMG_ESC_ROUNDS rounds.
   Real worker, legacy and enforce, rows and R2 bytes; the property tests call the worker's own functions. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { internals } from './internals.mjs';
import { WORKER } from './harness.mjs';
import { D, D2, PNG, TAG, dk, both, scene, state, gone, edit, upload, age, due, stored, read } from './v7_f_img_fx.mjs';
import { world as tasksWorld, ME, hij, HR, taskCommandBody, operationSaveBody } from './tasks_fx.mjs';

/* ── spellings ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
const U = (ch, up) => { const h = ch.charCodeAt(0).toString(16).padStart(2, '0'); return '\\u00' + (up ? h.toUpperCase() : h); };
const BASE = {
  one: (i) => i.slice(0, 5) + U(i[5]) + i.slice(6),                         /* one character of the id */
  prefix: (i) => U('i') + U('m', true) + U('g') + U('_', true) + i.slice(4) /* the whole prefix, mixed-case hex */
};
const NEST = {
  bs: (c) => c.replace(/\\/g, '\\\\'),                                      /* what JSON.stringify does: \ → \\ */
  u5c: (c) => c.replace(/\\/g, '\\u005c'),                                  /* \ → the escape of hex 5c */
  mixed: (c, l) => l % 2 ? c.replace(/\\/g, '\\\\') : c.replace(/\\/g, '\\u005C')
};
const DEPTHS = [1, 2, 3, 4, 5, 8];
/* the CONTENT of a JSON string literal that `depth` JSON.parse calls turn into the id */
function spell(i, depth, base, nest) { let c = BASE[base](i); for (let l = 1; l < depth; l++) c = NEST[nest](c, l); return c; }
/* the digits of an inner escape, themselves escaped: \u005cu00\u0036\u0039 → \u0069 → i */
function spellDigits(i, depth) { let c = '\\u005cu00' + U('6') + U('9', true) + i.slice(1); for (let l = 2; l < depth; l++) c = NEST.bs(c); return c; }
const parseN = (c, d) => { let v = c; for (let k = 0; k < d; k++) v = JSON.parse('"' + v + '"'); return v; };
function spellings(i) {
  const out = [];
  for (const d of DEPTHS) {
    for (const b of Object.keys(BASE)) for (const n of Object.keys(NEST)) { if (d === 1 && n !== 'bs') continue; out.push({ nm: b + '/' + n + '/' + d, d, c: spell(i, d, b, n) }); }
    if (d >= 2) out.push({ nm: 'digits/' + d, d, c: spellDigits(i, d) });
  }
  for (const s of out) { assert.equal(parseN(s.c, s.d), i, s.nm + ' parses down to the id'); assert.ok(!s.c.includes(i), s.nm + ' never spells the id'); }
  return out;
}
const rec = (c) => '{"t":"' + TAG + '","doc":"' + c + '"}';
const KP = dk(D, 'profile'), KP2 = dk(D2, 'profile');
const why = (r, k) => ((r.j.denied || {})[k] || {}).why || null;
const kvText = (W, k) => W.env.DB.q('SELECT v FROM kv WHERE k = ? ORDER BY seq', k).map((x) => x.v).join('');
const own = (W, i) => W.env.DB.q('SELECT st, ts, k, uid, dept FROM imgown WHERE img = ?', i)[0] || null;
const meta = (W, k) => (W.env.DB.q('SELECT v FROM meta WHERE k = ?', k)[0] || {}).v;
const putKv = (W, k, text) => { W.env.DB.db.prepare('DELETE FROM kv WHERE k = ?').run(k); W.env.DB.db.prepare('INSERT INTO kv (k, seq, v) VALUES (?, 0, ?)').run(k, text); };
const delKv = (W, k) => W.env.DB.db.prepare('DELETE FROM kv WHERE k = ?').run(k);
let n = 0;
async function pass(T, logs) {
  due(T.W); const l = console.log, w = console.warn; console.log = console.warn = (m) => { if (logs) logs.push(String(m)); };
  try { const s = await edit(T.W, T.S.mgr2, D2, 'plan', (v) => { v.floors[0].name = TAG + ' ev ' + (++n); }); assert.ok(s.ok, JSON.stringify(s.j).slice(0, 200)); }
  finally { console.log = l; console.warn = w; }
}
const holds = (logs) => logs.filter((m) => m.includes('img-sweep-escape-hold')).map((m) => JSON.parse(m));
async function settled(T) {
  const { W, S, id } = T, c = id('warm'); await upload(W, S.mgr2, c); age(W, c, 31);
  for (let k = 0; k < 4 && !gone(await state(W, c)); k++) await pass(T);
  assert.ok(gone(await state(W, c)), 'warm-up: the sweep is condemning'); assert.equal(meta(W, 'imgref_scan_v1'), 'done');
}
async function typed(W, ck, k, text, base) {
  const p = '/api/save', body = { set: { [k]: text }, del: [], base: { [k]: base }, why: { [k]: TAG } };
  const r = await W.C.api(p, { method: 'POST', cookie: ck, body: operationSaveBody(W.env, p, taskCommandBody(W.env, p, body)) });
  return { status: r.status, why: why(r, k), j: Object.assign({}, r.j, { requestId: null }) };   /* the request id is the caller's own (one per request): everything else is compared */
}
const HONEST = ['C:\\u0041bc', 'C:\\Users\\u0031452\\plan.pdf', 'D:\\u005cshare\\u005Cx', '\\\\server\\u0069mages\\new', 'a \\u0041 b \\u005c c \\u005f d'];

/* ── a · honest text is accepted and stored as sent ────────────────────────────────────────────────────────────────────────────── */
both(test, 'a · plain save: text carrying \\u0041, \\u005c, Windows paths — typed by a person, or written as JSON escapes — is accepted, stored byte for byte, re-saved; no reference row', async (mode) => {
  const T = await scene(mode), { W, S } = T;
  const texts = [
    JSON.stringify({ t: TAG, notes: HONEST }),                                             /* the characters \u0041 as a person typed them */
    '{"t":"' + TAG + '","note":"\\u0041bc \\u005c\\u005c \\u005Cn C:\\\\u0041bc \\u0030\\u0039"}',   /* real JSON escapes in the text itself */
    JSON.stringify({ t: TAG, doc: JSON.stringify({ deep: JSON.stringify({ p: HONEST[1] }) }) })   /* nested JSON carrying the path */
  ];
  for (const text of texts) {
    const r = await W.C.save(S.mgr, { [KP]: text });
    assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 200)); assert.equal(why(r, KP), null, 'accepted: ' + text.slice(0, 80) + ' ' + JSON.stringify(r.j).slice(0, 200));
    assert.equal(kvText(W, KP), text, 'stored byte for byte');
    const r2 = await W.C.save(S.mgr, { [KP]: text }); assert.equal(r2.status, 200); assert.equal(why(r2, KP), null, 're-saved as it is');
    const more = text.replace('"t":"' + TAG + '"', '"t":"' + TAG + '","phone":"0500000000"'), r3 = await W.C.save(S.mgr, { [KP]: more });
    assert.equal(why(r3, KP), null, 're-saved with an unrelated change'); assert.equal(kvText(W, KP), more);
    /* adding one more such text beside the old one is accepted too (it was the fifth review's refusal) */
    const two = more.replace('"phone":"0500000000"', '"phone":"0500000000","again":"E:\\\\u0042ackup \\\\u0041"'), r4 = await W.C.save(S.mgr, { [KP]: two });
    assert.equal(why(r4, KP), null, 'a second honest text is accepted'); assert.equal(kvText(W, KP), two);
  }
  assert.equal(W.env.DB.q('SELECT COUNT(*) n FROM imgref WHERE k = ?', KP)[0].n, 0, 'honest text names no image');
});

both(test, 'a · typed save: a floor name carrying such text is accepted and read back as written; re-saved; moved to another record', async (mode) => {
  const T = await scene(mode), { W, S } = T, K = dk(D, 'plan');
  for (const name of HONEST) {
    const s = await edit(W, S.mgr, D, 'plan', (v) => { v.floors[0].name = name; });
    assert.ok(s.ok, name + ' ' + s.why + ' ' + JSON.stringify(s.j).slice(0, 200)); assert.equal(s.status, 200);
    assert.equal(stored(W.env, K).floors[0].name, name, 'stored as written');
    const s2 = await edit(W, S.mgr, D, 'plan', (v) => { v.floors[0].name = name + ' ' + name; });
    assert.ok(s2.ok, 're-saved, a second copy beside it: ' + s2.why); assert.equal(stored(W.env, K).floors[0].name, name + ' ' + name);
  }
  /* the same name written with a JSON escape in the request text: the record stores the character */
  const g = await read(W, S.mgr, K); g.v.floors[0].name = 'XQZ1 path';
  const r = await typed(W, S.mgr, K, JSON.stringify(g.v).replace('XQZ1', '\\u0041bc \\u005c\\u005c'), g.base);
  assert.equal(r.why, null, JSON.stringify(r.j).slice(0, 300)); assert.equal(stored(W.env, K).floors[0].name, 'Abc \\\\ path');
  assert.equal(W.env.DB.q('SELECT COUNT(*) n FROM imgref WHERE k = ?', K)[0].n, 0, 'honest text names no image');
});

for (const mode of ['legacy', 'enforce']) test('a · task note: an employee\'s note carrying such text is accepted and stored as written [' + mode + ']', { timeout: 600000 }, async () => {
  const W = await tasksWorld({ mode }), dm = await W.login('0000000101', '70101'), me = await W.login(ME.un, ME.pw);
  const post = (ck, p, body) => W.C.api(p, { method: 'POST', cookie: ck, body: taskCommandBody(W.env, p, body) });
  const s = Date.now() - HR, cr = await post(dm.ck, '/api/tasks/create', { k: hij(s), t: TAG + ' ev', s, e: s + 3 * HR, asg: [ME.eid], rv: 'none' }); assert.equal(cr.status, 200);
  const k = cr.j.rows[0].k, rid = cr.j.rows[0].id;
  assert.equal((await post(me.ck, '/api/me/tasks/act', { k, id: rid, act: 'start' })).status, 200);
  for (const note of ['C:\\Users\\u0041dmin', 'C:\\Users\\u0041dmin and \\u0042 \\u005c', HONEST[1]]) {
    const r = await post(me.ck, '/api/me/tasks/act', { k, id: rid, act: 'doc', note });
    assert.equal(r.status, 200, note + ' · ' + JSON.stringify(r.j).slice(0, 200));
    assert.equal(W.env.DB.q('SELECT COUNT(*) n FROM ops_task_row_proof WHERE f_note_text = ?', note)[0].n, 1, 'stored as written: ' + note);
  }
});

/* ── b · an escaped spelling of an image the actor may not reference is refused exactly like the literal id ────────────────────── */
both(test, 'b · plain save: every spelling (depths 1,2,3,4,5,8 · \\\\ nesting · \\u005c chains · mixed-case hex · one character / the prefix / the digits of an inner escape) of another unit\'s image, and of someone\'s pending upload, is refused as the literal id is — same status, same body; nothing stored, no reference row', async (mode) => {
  const T = await scene(mode), { W, S, id } = T;
  const victim = id('victim'), pend = id('pend'); await upload(W, S.mgr, victim); await upload(W, S.mgr, pend);
  assert.ok((await edit(W, S.mgr, D, 'plan', (v) => { v.floors[0].iid = victim; })).ok, 'bound into the unit-1 plan');
  for (const target of [victim, pend]) {
    const lit = await W.C.save(S.mgr2, { [KP2]: rec(target) });
    assert.equal(why(lit, KP2), 'imgown', 'control: the literal id is refused · ' + JSON.stringify(lit.j).slice(0, 200));
    const S0 = spellings(target); assert.ok(S0.length >= 30);
    for (const s of S0) {
      const text = rec(s.c), r = await W.C.save(S.mgr2, { [KP2]: text });
      assert.notEqual(kvText(W, KP2), text, 'FOREIGN REFERENCE ACCEPTED via ' + s.nm);
      assert.equal(r.status, lit.status, s.nm); assert.deepEqual(r.j, lit.j, s.nm + ': the same answer as for the literal id · ' + JSON.stringify(r.j).slice(0, 200));
    }
  }
  assert.deepEqual((await state(W, victim)).refs, [dk(D, 'plan')], 'no reference row for unit 2'); assert.deepEqual((await state(W, pend)).refs, []);
  assert.equal((await state(W, pend)).st, 'claim', 'the pending upload is still its uploader\'s');
});

both(test, 'b · typed save: another unit\'s image spelled by an escape — in the image field, and nested in a text field at depth 3 and 8 — is refused as the literal id is; the plan is unchanged', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, K = dk(D2, 'plan'), victim = id('victim'); await upload(W, S.mgr, victim);
  assert.ok((await edit(W, S.mgr, D, 'plan', (v) => { v.floors[0].iid = victim; })).ok);
  const was = JSON.stringify(stored(W.env, K));
  const g = await read(W, S.mgr2, K); g.v.floors[0].iid = victim;
  const lit = await typed(W, S.mgr2, K, JSON.stringify(g.v), g.base);
  assert.equal(lit.why, 'imgown', 'control: the literal id · ' + JSON.stringify(lit.j).slice(0, 200));
  const esc1 = await typed(W, S.mgr2, K, JSON.stringify(g.v).replace('"' + victim + '"', '"' + BASE.one(victim) + '"'), g.base);
  assert.equal(esc1.status, lit.status); assert.deepEqual(esc1.j, lit.j, 'image field, one character escaped');
  const g2 = await read(W, S.mgr2, K); g2.v.floors[0].name = TAG + ' ' + victim;
  const lit2 = await typed(W, S.mgr2, K, JSON.stringify(g2.v), g2.base);
  assert.equal(lit2.why, 'imgown', 'control: the literal id in a text field');
  for (const s of spellings(victim).filter((x) => x.d === 3 || x.d === 8)) {
    g2.v.floors[0].name = 'XQZ1';
    const r = await typed(W, S.mgr2, K, JSON.stringify(g2.v).replace('XQZ1', TAG + ' ' + s.c), g2.base);
    assert.equal(r.status, lit2.status, s.nm); assert.deepEqual(r.j, lit2.j, s.nm + ' · ' + JSON.stringify(r.j).slice(0, 200));
  }
  assert.equal(JSON.stringify(stored(W.env, K)), was, 'the live plan is unchanged'); assert.deepEqual((await state(W, victim)).refs, [dk(D, 'plan')]);
});

/* ── c · the actor's own image: bound, referenced, kept; orphaned and swept once the reference is removed ──────────────────────── */
both(test, 'c · plain save: every spelling of the actor\'s own uploads is accepted — each image is bound to the record and referenced; after the grace period the sweep keeps them; once the record drops them they are orphans and are swept', async (mode) => {
  const T = await scene(mode), { W, S, id } = T; await settled(T);
  const proto = spellings(id('p')), imgs = proto.map((s, j) => id('o' + j));
  for (const i of imgs) await upload(W, S.mgr, i);
  const docs = proto.map((s, j) => { const d = spellings(imgs[j]).filter((x) => x.nm === s.nm)[0]; return d.c; });
  const text = '{"t":"' + TAG + '","docs":["' + docs.join('","') + '"]}';
  for (const i of imgs) assert.ok(!text.includes(i));
  const r = await W.C.save(S.mgr, { [KP]: text });
  assert.equal(why(r, KP), null, JSON.stringify(r.j).slice(0, 300)); assert.equal(kvText(W, KP), text, 'stored as sent');
  for (let j = 0; j < imgs.length; j++) { const s = await state(W, imgs[j]); assert.equal(s.st, 'bound', proto[j].nm + ' bound'); assert.equal(s.k, KP); assert.deepEqual(s.refs, [KP], proto[j].nm + ' referenced'); }
  /* past the grace period: nothing happens to them */
  for (const i of imgs) age(W, i, 31);
  const logs = []; await pass(T, logs); await pass(T, logs);
  for (let j = 0; j < imgs.length; j++) { const s = await state(W, imgs[j]); assert.equal(s.r2, PNG, 'REFERENCED IMAGE DELETED: ' + proto[j].nm); assert.equal(s.st, 'bound'); }
  assert.deepEqual(holds(logs), [], 'no pass held');
  /* the record drops them */
  const r2 = await W.C.save(S.mgr, { [KP]: JSON.stringify({ t: TAG, docs: [] }) });
  assert.equal(why(r2, KP), null, JSON.stringify(r2.j).slice(0, 300));
  for (let j = 0; j < imgs.length; j++) { const s = await state(W, imgs[j]); assert.equal(s.st, 'orphan', proto[j].nm + ' is an orphan once its reference is removed (' + s.st + ')'); assert.deepEqual(s.refs, []); }
  for (const i of imgs) age(W, i, 31);
  for (let k = 0; k < 12; k++) await pass(T);
  for (const i of imgs) assert.ok(gone(await state(W, i)), i + ' swept');
});

both(test, 'c · typed save: the actor\'s own upload spelled by an escape in the image field, and nested in a text field (depth 3), is accepted, bound and referenced; removed, it is swept', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, K = dk(D, 'plan'), a = id('ta'), b = id('tb'); await settled(T);
  await upload(W, S.mgr, a); await upload(W, S.mgr, b);
  const g = await read(W, S.mgr, K); g.v.floors[0].iid = a; g.v.floors[0].name = 'XQZ1';
  const sp = spellings(b).filter((x) => x.nm === 'one/mixed/3')[0];
  const text = JSON.stringify(g.v).replace('"' + a + '"', '"' + BASE.prefix(a) + '"').replace('XQZ1', TAG + ' ' + sp.c);
  assert.ok(!text.includes(a) && !text.includes(b));
  const r = await typed(W, S.mgr, K, text, g.base);
  assert.equal(r.why, null, JSON.stringify(r.j).slice(0, 300));
  for (const i of [a, b]) { const s = await state(W, i); assert.equal(s.st, 'bound', i); assert.equal(s.k, K); assert.deepEqual(s.refs, [K]); }
  for (const i of [a, b]) age(W, i, 31);
  await pass(T); await pass(T);
  for (const i of [a, b]) assert.equal((await state(W, i)).r2, PNG, 'kept while the plan names it');
  /* even looked at as an orphan past its grace, the reference row the save wrote keeps it (it turns amb, as any referenced orphan) */
  const KQ = dk(D, 'profile'), z = id('tz'); await upload(W, S.mgr, z);
  const rz = await W.C.save(S.mgr, { [KQ]: rec(spellings(z).filter((x) => x.nm === 'one/u5c/5')[0].c) }); assert.equal(why(rz, KQ), null); assert.deepEqual((await state(W, z)).refs, [KQ]);
  W.env.DB.db.prepare("UPDATE imgown SET st = 'orphan', k = '' WHERE img = ?").run(z); age(W, z, 31); await pass(T);
  assert.equal((await state(W, z)).r2, PNG, 'REFERENCED IMAGE DELETED'); assert.equal((await state(W, z)).st, 'amb');
  assert.ok((await edit(W, S.mgr, D, 'plan', (v) => { v.floors[0].iid = ''; v.floors[0].name = TAG + ' clean'; })).ok);
  for (const i of [a, b]) { assert.equal((await state(W, i)).st, 'orphan', i + ' orphan once removed'); age(W, i, 31); }
  for (let k = 0; k < 3; k++) await pass(T);
  for (const i of [a, b]) assert.ok(gone(await state(W, i)), i + ' swept');
});

/* the proof is ONE statement, so a save is either before it or after it. A plain save writes its value, then (imgSync) its reference rows: a
   pass whose deciding statement lands between the two finds a LITERAL id in the value itself. An escaped spelling is not literal, and the
   pass read the escape-bearing texts BEFORE the save wrote — so the save writes the reference rows of such a value in the very batch that
   writes the value. Here the save is made to land exactly there: after the pass has read the texts, before its deciding statement. */
both(test, 'c · a plain save that lands between the sweep\'s reading of the texts and its deciding statement, the save\'s own bookkeeping still to come: the upload the value spells by an escape — newly named, or named literally before and now by the escape only — is not deleted, exactly as with the literal id', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, DB = W.env.DB; await settled(T);
  const gate = () => { let open; const p = new Promise((r) => { open = r; }); return { p, open }; };
  putKv(W, dk(D, 'notes'), JSON.stringify({ t: TAG, p: HONEST[1] }));        /* an honest escape text: the pass reads and decodes texts */
  for (const kind of ['literal', 'escaped', 'literal-then-escaped']) {
    const x = id('race' + kind.replace(/-/g, '')), sp = spellings(x).filter((q) => q.nm === 'one/u5c/3')[0];
    await upload(W, S.mgr, x); delKv(W, KP); DB.db.prepare('DELETE FROM imgref WHERE k = ?').run(KP);
    if (kind === 'literal-then-escaped') putKv(W, KP, rec(x));               /* older data: named literally, never indexed */
    age(W, x, 31);
    const text = kind === 'literal' ? rec(x) : rec(sp.c), atDecision = gate(), written = gate(), decided = gate(), prep = DB.prepare, batch = DB.batch;
    /* the pass stops at its deciding statement (run on its own, or fenced in a batch) until the save has stored its value … */
    const DECIDE = /UPDATE imgown SET st = 'dead', k = ''/; let stored = false;
    DB.prepare = function (sql) {
      const st = prep.call(DB, sql); if (!DECIDE.test(sql)) return st;
      const all = st.all; st.all = async function () { atDecision.open(); await written.p; try { return await all.call(st); } finally { decided.open(); } };
      return st;
    };
    /* … and the save stops right after the batch that stored it, until the pass has decided */
    DB.batch = async function (stmts) {
      const deciding = stmts.some((q) => DECIDE.test(q.sql));
      if (deciding) { atDecision.open(); await written.p; }
      const r = await batch.call(DB, stmts);
      if (deciding) decided.open();
      else if (!stored && kvText(W, KP) === text) { stored = true; written.open(); await decided.p; }
      return r;
    };
    let r;
    try {
      const sweeping = pass(T).then(() => 'over'), reached = await Promise.race([atDecision.p.then(() => 'deciding'), sweeping]);
      assert.equal(reached, 'deciding', kind + ': the pass reached its deciding statement (it did not hold)');
      r = await W.C.save(S.mgr, { [KP]: text }); written.open(); await sweeping;
    } finally { DB.prepare = prep; DB.batch = batch; written.open(); }
    assert.equal(why(r, KP), null, kind + ' ' + JSON.stringify(r.j).slice(0, 200)); assert.equal(kvText(W, KP), text);
    for (let k = 0; k < 2; k++) await pass(T);                               /* whatever was condemned is deleted by now */
    const s = await state(W, x);
    assert.equal(s.r2, PNG, 'THE IMAGE THE STORED RECORD NAMES WAS DELETED (' + kind + ')'); assert.notEqual(s.st, 'dead', kind);
    assert.deepEqual(s.refs, [KP], kind + ': referenced'); assert.equal(s.st, 'bound', kind + ': bound');
  }
});

/* ── d · older data: a hidden reference no save of this version wrote keeps its image, and holds nothing ───────────────────────── */
both(test, 'd · a kv value stored directly (older data) spelling an otherwise unreferenced image past its grace — every depth and spelling: the image is kept, the pass does not hold, and an unrelated orphan is swept in the same pass', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, KN = dk(D, 'notes'); await settled(T);
  const proto = spellings(id('p')); let j = 0;
  for (const p of proto) {
    const hid = id('h' + j), ctl = id('c' + j), orphan = j % 2 === 1; j++;
    await upload(W, S.mgr, hid); await upload(W, S.mgr2, ctl);
    if (orphan) W.env.DB.db.prepare("UPDATE imgown SET st = 'orphan', k = '', dept = ? WHERE img = ?").run(D, hid);
    const sp = spellings(hid).filter((x) => x.nm === p.nm)[0];
    putKv(W, KN, rec(sp.c)); assert.deepEqual((await state(W, hid)).refs, []);
    age(W, hid, 31); age(W, ctl, 31); const before = own(W, hid), logs = [];
    await pass(T, logs);
    const s = await state(W, hid);
    assert.equal(s.r2, PNG, 'LIVE-REFERENCED IMAGE DELETED via ' + p.nm); assert.equal(s.st, orphan ? 'amb' : 'claim', p.nm + ': kept as a referenced one (' + s.st + ')');
    if (!orphan) assert.ok(own(W, hid).ts > before.ts, p.nm + ': its clock restarted');
    assert.deepEqual(holds(logs), [], p.nm + ': the pass did not hold');
    assert.ok(gone(await state(W, ctl)), p.nm + ': the unrelated orphan is swept in the same pass');
  }
  /* the value goes ⇒ the kept uploads are orphans like any other */
  delKv(W, KN); const left = []; for (let k = 0; k < j; k += 2) left.push(id('h' + k));
  for (const i of left) age(W, i, 31);
  for (let k = 0; k < 10; k++) await pass(T);
  for (const i of left) assert.ok(gone(await state(W, i)), i + ' swept once nothing names it');
});

both(test, 'd · older data cut by a row boundary (the escape itself, or the id after it) and older data in a typed record\'s text column: kept, no hold, the unrelated orphan swept', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, DB = W.env.DB.db; await settled(T);
  const a = id('cutesc'), b = id('cutid'), c = id('opstxt'), ctl = id('ctl');
  for (const i of [a, b, c]) await upload(W, S.mgr, i); await upload(W, S.mgr2, ctl);
  const ins = DB.prepare('INSERT OR REPLACE INTO kv (k, seq, v) VALUES (?, ?, ?)');
  const wa = rec('\\u0069' + a.slice(1)), cutA = wa.indexOf('\\u0069') + 3; ins.run(dk(D, 'notes'), 0, wa.slice(0, cutA)); ins.run(dk(D, 'notes'), 1, wa.slice(cutA));
  const wb = rec('\\u0069' + b.slice(1)), cutB = wb.indexOf(b.slice(1)) + 6; ins.run(dk(D2, 'notes'), 0, wb.slice(0, cutB)); ins.run(dk(D2, 'notes'), 1, wb.slice(cutB));
  const sp = spellings(c).filter((x) => x.nm === 'prefix/u5c/4')[0];
  const was = DB.prepare('SELECT f_name_text v FROM ops_plan_live_floors_floor WHERE department_id = ?').all(D);
  assert.ok(DB.prepare('UPDATE ops_plan_live_floors_floor SET f_name_text = ? WHERE department_id = ?').run(TAG + ' ' + sp.c, D).changes > 0);
  for (const i of [a, b, c, ctl]) age(W, i, 31);
  const logs = []; await pass(T, logs);
  for (const i of [a, b, c]) { const s = await state(W, i); assert.equal(s.r2, PNG, 'LIVE-REFERENCED IMAGE DELETED: ' + i); assert.equal(s.st, 'claim'); }
  assert.deepEqual(holds(logs), []); assert.ok(gone(await state(W, ctl)), 'the unrelated orphan is swept in the same pass');
  DB.prepare('DELETE FROM kv WHERE k IN (?, ?)').run(dk(D, 'notes'), dk(D2, 'notes'));
  DB.prepare('UPDATE ops_plan_live_floors_floor SET f_name_text = ? WHERE department_id = ?').run(was[0] ? was[0].v : '', D);
  for (const i of [a, b, c]) age(W, i, 31);
  await pass(T); await pass(T);
  for (const i of [a, b, c]) assert.ok(gone(await state(W, i)), i + ' swept once nothing names it');
});

/* ── e · honest escape text holds nothing and protects nothing ─────────────────────────────────────────────────────────────────── */
both(test, 'e · honest escape text in a kv value (saved, and stored directly) and in a typed record\'s text column: no pass holds, real orphans are swept, nothing is kept by it', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, DB = W.env.DB.db; await settled(T);
  const r = await W.C.save(S.mgr, { [KP]: JSON.stringify({ t: TAG, notes: HONEST }) }); assert.equal(why(r, KP), null);
  putKv(W, dk(D, 'notes'), '{"t":"' + TAG + '","p":"C:\\\\Users\\\\u0031452\\\\Desktop \\u0041 \\u005c\\u005c"}');
  assert.ok((await edit(W, S.mgr, D, 'plan', (v) => { v.floors[0].name = HONEST[1]; })).ok);
  assert.ok(DB.prepare("SELECT COUNT(*) n FROM ops_plan_live_floors_floor WHERE instr(f_name_text, '\\u0031') > 0").get().n >= 1, 'the column holds the escape text');
  const a = id('orp'), b = id('clm'), odd = 'OddE' + T.x; await upload(W, S.mgr, a); await upload(W, S.mgr2, b); await upload(W, S.mgr2, odd);
  DB.prepare("UPDATE imgown SET st = 'orphan', k = '', dept = ? WHERE img = ?").run(D, a);
  age(W, a, 31); age(W, b, 31); age(W, odd, 32);
  const logs = []; for (let k = 0; k < 3; k++) { await pass(T, logs); DB.exec("UPDATE imgown SET ts = ts - 3700000 WHERE st IN ('claim', 'orphan')"); }
  assert.deepEqual(holds(logs), [], 'honest text never holds a pass');
  for (const i of [a, b, odd]) assert.ok(gone(await state(W, i)), i + ' swept: ' + JSON.stringify(await state(W, i)));
});

/* ── f · an id outside the scanner's shape, hidden by escapes in a typed record's text ─────────────────────────────────────────── */
both(test, 'f · an odd-shaped id spelled by escapes (depth 1 and 4) in a typed record\'s text: kept, its clock restarted, no hold; the unrelated orphan is swept; once the text is gone it is swept too', async (mode) => {
  const T = await scene(mode), { W, S, x, id } = T, DB = W.env.DB.db; await settled(T);
  const was = DB.prepare('SELECT f_name_text v FROM ops_plan_live_floors_floor WHERE department_id = ?').all(D);
  const setName = (t) => assert.ok(DB.prepare('UPDATE ops_plan_live_floors_floor SET f_name_text = ? WHERE department_id = ?').run(t, D).changes > 0);
  let j = 0;
  for (const depth of [1, 4]) {
    const odd = 'Odd' + (j++) + x, ctl = id('ctl' + j); await upload(W, S.mgr2, odd); await upload(W, S.mgr2, ctl);
    let c = U('O', true) + U('d') + odd.slice(2); for (let l = 1; l < depth; l++) c = NEST.mixed(c, l);
    assert.equal(parseN(c, depth), odd); assert.ok(!c.includes(odd));
    setName(TAG + ' see ' + c);
    age(W, odd, 32); age(W, ctl, 31); const before = own(W, odd), logs = [];
    await pass(T, logs);
    const s = await state(W, odd);
    assert.equal(s.r2, PNG, 'LIVE-REFERENCED IMAGE DELETED (odd id, depth ' + depth + ')'); assert.equal(s.st, 'claim'); assert.ok(own(W, odd).ts > before.ts, 'its clock restarted');
    assert.deepEqual(holds(logs), [], 'no hold'); assert.ok(gone(await state(W, ctl)), 'the unrelated orphan is swept in the same pass');
    setName(was[0] ? was[0].v : '');
    for (let k = 0; k < 3; k++) { DB.exec("UPDATE imgown SET ts = ts - " + (31 * 864e5) + " WHERE img = '" + odd + "'"); await pass(T); }
    assert.ok(gone(await state(W, odd)), 'swept once the text is gone');
  }
});

/* ── g · the bounds: the extreme case still holds the whole pass / refuses the save ────────────────────────────────────────────── */
const chain = (i, levels) => { let c = '\\u0069' + i.slice(1); for (let l = 0; l < levels; l++) c = c.replace(/\\/g, '\\u005c'); return c; };

both(test, 'g · more bytes of escape-bearing texts than the bound, or a text still changing after the last round: the pass holds (logged, with its bound), no candidate changes; once they are gone the sweep resumes — the NUMBER of texts is not a bound (review, F1)', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, DB = W.env.DB.db; await settled(T);
  const m = await internals(['IMG_ESC_ROUNDS', 'IMG_ESC_CHARS'], WORKER);
  assert.ok(m.IMG_ESC_ROUNDS >= 16 && m.IMG_ESC_CHARS >= 1e6);
  const fake = (k) => 'bsdept:zz' + k + ':bassam_fake_v1', ins = DB.prepare('INSERT OR REPLACE INTO kv (k, seq, v) VALUES (?, ?, ?)'), clear = () => DB.exec("DELETE FROM kv WHERE k LIKE 'bsdept:zz%'");
  const cases = {
    chars: () => { const row = 'y'.repeat(690000), rows = Math.ceil(m.IMG_ESC_CHARS / 690000) + 1; for (let q = 0; q < rows; q++) ins.run(fake(0), q, row); ins.run(fake(0), rows, '{"p":"C:\\\\u0041bc"}'); },
    undecided: () => ins.run(fake(0), 0, rec(chain('img_zz_zz', m.IMG_ESC_ROUNDS + 2)))
  };
  for (const [nm, put] of Object.entries(cases)) {
    clear(); put();
    const orp = id('orp' + nm), ctl = id('ctl' + nm); await upload(W, S.mgr, orp); await upload(W, S.mgr2, ctl);
    DB.prepare("UPDATE imgown SET st = 'orphan', k = '', dept = ? WHERE img = ?").run(D, orp);
    age(W, orp, 31); age(W, ctl, 31); const before = [own(W, orp), own(W, ctl)], logs = [];
    await pass(T, logs); await pass(T, logs);
    assert.deepEqual([own(W, orp), own(W, ctl)], before, nm + ': nothing changes while the pass holds');
    const h = holds(logs); assert.ok(h.length >= 2 && h[0].n >= 1, nm + ': each held pass says so · ' + JSON.stringify(h)); assert.equal(h[0].why, nm, 'and which bound');
    assert.ok(h[0].at.some((x) => x.indexOf('kv:bsdept:zz') === 0), nm + ': and names where · ' + JSON.stringify(h[0]));
    clear(); await pass(T); await pass(T);
    assert.ok(gone(await state(W, orp)) && gone(await state(W, ctl)), nm + ': the sweep resumes once the texts are gone');
  }
  /* the number of texts is no bound: 1000 small honest texts (the count bound was 200) hold nothing */
  clear(); for (let k = 0; k < 1000; k++) ins.run(fake(k), 0, '{"p":"C:\\\\u0041bc ' + k + '"}');
  const c2 = id('many'); await upload(W, S.mgr2, c2); age(W, c2, 31); const logs2 = []; await pass(T, logs2);
  assert.deepEqual(holds(logs2), [], '1000 texts are read'); assert.ok(gone(await state(W, c2)));
  clear();
});

both(test, 'g · a save whose text is still changing after the last round is refused (img-escape), nothing stored; one round less is decided like any other — the own image is bound', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, m = await internals(['IMG_ESC_ROUNDS'], WORKER);
  const mine = id('mine'); await upload(W, S.mgr, mine);
  const deep = rec(chain(mine, m.IMG_ESC_ROUNDS)), r = await W.C.save(S.mgr, { [KP]: deep });
  assert.equal(why(r, KP), 'img-escape', JSON.stringify(r.j).slice(0, 200)); assert.notEqual(kvText(W, KP), deep, 'not stored');
  assert.deepEqual((await state(W, mine)).refs, []); assert.equal((await state(W, mine)).st, 'claim');
  const last = rec(chain(mine, m.IMG_ESC_ROUNDS - 1)), r2 = await W.C.save(S.mgr, { [KP]: last });
  assert.equal(why(r2, KP), null, JSON.stringify(r2.j).slice(0, 200)); assert.equal(kvText(W, KP), last);
  assert.equal((await state(W, mine)).st, 'bound'); assert.deepEqual((await state(W, mine)).refs, [KP]);
  /* and the foreign one, at the last decided round, is refused as foreign */
  const r3 = await W.C.save(S.mgr2, { [KP2]: last }); assert.equal(why(r3, KP2), 'imgown', JSON.stringify(r3.j).slice(0, 200));
});

/* ── h · the deep scan finds every id: property and exhaustive checks on the worker's own functions ────────────────────────────── */
let seed = 0x1badb002;
const rand = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (a) => a[Math.floor(rand() * a.length)];
const hx = (c) => { const h = c.toString(16).padStart(4, '0'); return rand() < 0.5 ? h : h.toUpperCase(); };
/* a JSON string literal for str: the mandatory escapes spelled either way, any other character re-spelled as \uXXXX with probability p */
function enc(str, p) {
  let o = '"';
  for (let q = 0; q < str.length; q++) {
    const ch = str[q], c = str.charCodeAt(q);
    if (ch === '"') o += rand() < 0.7 ? '\\"' : '\\u' + hx(c);
    else if (ch === '\\') o += rand() < 0.5 ? '\\\\' : '\\u' + hx(c);
    else if (c < 0x20) o += rand() < 0.5 && '\b\f\n\r\t'.includes(ch) ? { '\b': '\\b', '\f': '\\f', '\n': '\\n', '\r': '\\r', '\t': '\\t' }[ch] : '\\u' + hx(c);
    else if (ch === '/' && rand() < 0.3) o += '\\/';
    else if (rand() < p) o += '\\u' + hx(c);
    else o += ch;
  }
  return o + '"';
}
const NOISE = ['"', '\\', '\\\\', '/', 'u', 'u00', '\\u0041', '\\u005c', '\\u0069', '\\n', '\n', '\t', ' ', '{', '}', ':', ',', 'é', 'ص', '0', '9', 'a', 'f', 'A', '_', 'img_', 'szp', 'x', '\\"', '\u0001', '😀'];
function randomCase() {
  const ids = [], parts = [], q = 1 + Math.floor(rand() * 3);
  for (let k = 0; k < 6; k++) parts.push(pick(NOISE));
  for (let k = 0; k < q; k++) {
    const i = pick(['img_', 'szp_']) + Math.floor(rand() * 1e9).toString(36) + '_' + pick(['', 'u0061', 'u005c', 'x']) + Math.floor(rand() * 1e6).toString(36);
    ids.push(i); parts.push(pick(['"', ' ', '\\', '/', ':', '\n', 'é', '-', '\\u0041 '])); parts.push(i); parts.push(pick(['"', ' ', '\\', '/', ':', '\n', 'é', '-', '.'])); for (let z = 0; z < 3; z++) parts.push(pick(NOISE));
  }
  const s = parts.join(''), depth = 1 + Math.floor(rand() * 10);
  let t = s; const path = [];
  for (let d = 0; d < depth; d++) {
    const p = t.length > 4000 ? 0 : pick([0, 0, 0.05, 0.3, 1]), shape = pick(['obj', 'arr', 'str', 'key']), junk = enc(pick(NOISE) + 'z' + pick(NOISE), p);
    if (shape === 'obj') { t = '{"b":' + junk + ',"a":' + enc(t, p) + ',"c":[1,null,' + junk + ']}'; path.unshift((v) => v.a); }
    else if (shape === 'arr') { t = '[' + junk + ', ' + enc(t, p) + ']'; path.unshift((v) => v[1]); }
    else if (shape === 'key') { t = '{' + enc(t, p) + ':' + junk + '}'; path.unshift((v) => Object.keys(v)[0]); }
    else { t = enc(t, p); path.unshift((v) => v); }
    if (t.length > 200000) return null;
  }
  let v = t; for (const f of path) v = f(JSON.parse(v));
  assert.equal(v, s, 'the chain parses down to the text');
  return { s, ids, depth, t };
}

test('h · property: a text nested 1…10 times by real JSON (objects, arrays, keys, bare strings), every level re-spelled at random as \\uXXXX — every id of the innermost text is found, and the innermost text itself appears whole in the round of its depth', async () => {
  const m = await internals(['imgIdsIn', 'imgDeepTexts', 'imgForeignIn'], WORKER), by = {}, miss = []; let N = 0, escaped = 0;
  const noDb = { DB: { prepare: () => ({ bind: () => ({ first: async () => null, all: async () => ({ results: [] }) }) }) } }, A0 = { u: { id: 'tst_u', role: 'staff' }, depts: [] };
  for (let it = 0; it < 6000; it++) {
    const c = randomCase(); if (!c) continue; N++;
    const found = m.imgIdsIn(c.t), b = by[c.depth] = by[c.depth] || { n: 0, hidden: 0 }; b.n++;
    const hidden = c.ids.some((i) => !c.t.includes(i)); if (hidden) { b.hidden++; escaped++; }
    for (const i of c.ids) if (!found[i]) miss.push({ depth: c.depth, id: i, t: c.t.slice(0, 300) });
    const R = m.imgDeepTexts(c.t);
    assert.equal(R.undecided, false, 'decided at depth ' + c.depth);
    assert.equal(R.texts[0], c.t, 'round 0 is the text');
    if (!R.texts[Math.min(c.depth, R.texts.length - 1)].includes(c.s)) miss.push({ depth: c.depth, whole: 1, t: c.t.slice(0, 300) });
    assert.notEqual(await m.imgForeignIn(noDb, A0, KP, c.t, '', {}), 'img-escape', 'never refused for its spelling');
  }
  console.log('# property: ' + N + ' chains · ' + escaped + ' hide an id from the literal text · by depth ' + JSON.stringify(by) + ' · missed: ' + miss.length);
  assert.ok(N > 4000 && escaped > 1500, 'the corpus is large and mostly hidden'); for (let d = 1; d <= 10; d++) assert.ok(by[d] && by[d].n >= 100 && by[d].hidden >= 30, 'depth ' + d + ' is covered · ' + JSON.stringify(by[d]));
  assert.deepEqual(miss.slice(0, 3), [], 'AN ID THE DEEP SCAN DOES NOT SEE');
});

test('h · exhaustive: every subset of the characters of an id escaped (127 spellings) × every nesting of depth 1…6 by \\\\ or \\u005c per level — found every time; and the literal scan alone misses them', async () => {
  const m = await internals(['imgIdsIn', 'imgDeepTexts'], WORKER), id0 = 'img_a_b9'.slice(0, 7); let N = 0, lit = 0;
  for (let mask = 1; mask < 128; mask++) {
    const base = [...id0].map((ch, q) => (mask >> q) & 1 ? U(ch, (mask + q) % 3 === 0) : ch).join('');
    for (let depth = 1; depth <= 6; depth++) for (let style = 0; style < (1 << (depth - 1)); style++) {
      let c = base; for (let l = 0; l < depth - 1; l++) c = (style >> l) & 1 ? NEST.u5c(c) : NEST.bs(c);
      if (N % 97 === 0) assert.equal(parseN(c, depth), id0);
      const text = rec(c); N++; if (text.includes(id0)) lit++;
      assert.ok(m.imgIdsIn(text)[id0], 'missed: ' + text);
    }
  }
  console.log('# exhaustive: ' + N + ' spellings · ' + lit + ' literal');
  assert.equal(N, 127 * 63); assert.equal(lit, 0);
});

test('h · the rounds: what one round replaces, what it leaves; the bound on rounds; honest text names nothing', async () => {
  const m = await internals(['imgIdsIn', 'imgDeepTexts', 'imgDeep', 'imgEsc', 'IMG_ESC_ROUNDS', 'IMG_ESC_WORK'], WORKER);
  const R = m.imgDeepTexts('a\\\\b \\" \\/ \\b\\f\\n\\r\\t \\u0041\\u00e9\\uD83D\\uDE00 \\x \\u12 \\u00zz \\U0041 end\\');
  assert.equal(R.texts[1], 'a\\b " / \b\f\n\r\t Aé😀 \\x \\u12 \\u00zz \\U0041 end\\', 'every valid escape replaced once, left to right; an invalid one left as it is');
  assert.equal(R.undecided, false);
  assert.deepEqual(m.imgDeepTexts('no backslash at all').texts, ['no backslash at all']);
  assert.deepEqual(m.imgDeepTexts('\\\\\\\\u0041').texts, ['\\\\\\\\u0041', '\\\\u0041', '\\u0041', 'A']);
  assert.deepEqual(m.imgDeepTexts('\\u005cu005cn').texts, ['\\u005cu005cn', '\\u005cn', '\\n', '\n']);
  for (const t of HONEST.concat(HONEST.map((x) => JSON.stringify({ a: JSON.stringify({ b: x }) })))) { assert.ok(m.imgEsc(t), 'the trigger sees it: ' + t); assert.deepEqual(Object.keys(m.imgIdsIn(t)), [], 'honest text names no image: ' + t); assert.equal(m.imgDeepTexts(t).undecided, false); }
  /* an id that itself holds "u0061" keeps its own spelling too (the literal round), beside whatever a deeper round reads */
  assert.deepEqual(Object.keys(m.imgIdsIn('{"a":"\\u0069mg_x_u0061b"}')).sort(), ['img_x_u0061b']);
  assert.ok(m.imgIdsIn('img_q_r \\u0069mg_x_y \\\\u0073zp_1_2')['img_q_r'] && m.imgIdsIn('img_q_r \\u0069mg_x_y \\\\u0073zp_1_2')['img_x_y'] && m.imgIdsIn('img_q_r \\u0069mg_x_y \\\\u0073zp_1_2')['szp_1_2'], 'the union over all rounds');
  /* the bound on rounds, exactly */
  const ok = chain('img_zz_zz', m.IMG_ESC_ROUNDS - 1), over = chain('img_zz_zz', m.IMG_ESC_ROUNDS);
  assert.equal(m.imgDeepTexts(ok).undecided, false); assert.equal(m.imgDeepTexts(ok).texts.length, m.IMG_ESC_ROUNDS + 1); assert.ok(m.imgIdsIn(ok)['img_zz_zz'], 'found at the last round');
  assert.equal(m.imgDeepTexts(over).undecided, true, 'still changing after the last round'); assert.equal(m.imgDeep(over).und, 'rounds');
  /* the bound on work: a large text that needs many rounds is undecided, the same text with few rounds is not */
  const pad = 'y'.repeat(Math.ceil(m.IMG_ESC_WORK / 16));
  assert.equal(m.imgDeep(pad + chain('img_zz_zz', 30)).und, 'work', 'more work than the bound'); assert.equal(m.imgDeep(pad + chain('img_zz_zz', 3)).und, '');
  assert.ok(m.imgIdsIn(pad + chain('img_zz_zz', 3))['img_zz_zz']);
});
