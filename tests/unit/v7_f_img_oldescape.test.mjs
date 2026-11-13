/* V7-F · fifth review — a record whose STORED text already carries a \u00XX escape of an id character (older data: a Windows path a person
   typed, "C:\Users\u0041dmin") must stay saveable. The fifth review kept the refusal ('img-escape') for what a save ADDS.
   Owner decision after it: user text is not refused at all — the checker compares decoded values (054 imgDeepEach). So here: a save keeps,
   repeats, adds or moves such text freely; an escaped spelling of an image id is judged as the id it spells (another unit's: refused as
   'imgown'; one's own: bound and referenced, also when the spelling was already stored by an older version). The sweep reads such texts and
   keeps what they name; it holds — and its log names WHERE (kv key · ops table.column, never content) — only for a text it cannot decide
   (nested past IMG_ESC_ROUNDS). The staged parts of an abandoned chunked upload never depended on a reference: cleaned even while a pass holds.
   Real worker, legacy and enforce, rows and R2 bytes. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { D, D2, PNG, TAG, dk, both, scene, state, gone, edit, upload, bind, age, due, stored, read } from './v7_f_img_fx.mjs';
import { world as tasksWorld, ME, MATE, hij, HR, taskCommandBody, operationSaveBody } from './tasks_fx.mjs';

let n = 0;
const OLD = 'C:\\Users\\u0031452\\plan.pdf';                               /* as a person typed it: the characters  C:\Users\u0031452\plan.pdf */
const esc = (i) => '\\u0069' + i.slice(1);                                  /* an id, its first letter spelled as an escape */
const KP = dk(D, 'profile');
const putOld = (W, k, obj) => W.env.DB.db.prepare('INSERT OR REPLACE INTO kv (k, seq, v) VALUES (?, 0, ?)').run(k, typeof obj === 'string' ? obj : JSON.stringify(obj));
const jesc = (obj) => JSON.stringify(obj).split('\\\\u0069').join('\\u0069');   /* esc() written as a JSON escape (the id hidden), not as two characters */
const why = (r, k) => ((r.j.denied || {})[k] || {}).why || null;
const kvText = (W, k) => W.env.DB.q('SELECT v FROM kv WHERE k = ? ORDER BY seq', k).map((x) => x.v).join('');
const meta = (W, k) => (W.env.DB.q('SELECT v FROM meta WHERE k = ?', k)[0] || {}).v;
const bump = (v) => { const f = v.floors[0], ks = Object.keys(f).filter((x) => typeof f[x] === 'number'); assert.ok(ks.length, 'a numeric floor field'); f[ks[0]] += 1; };
const oldFloor = (W) => assert.ok(W.env.DB.db.prepare("UPDATE ops_plan_live_floors_floor SET f_name_text = ? WHERE department_id = ? AND resource = 'bassam_plan_v1' AND row_key = '$/f:floors/i:0'").run(OLD, D).changes === 1);
async function typed(W, ck, k, text, base) {
  const p = '/api/save', body = { set: { [k]: text }, del: [], base: { [k]: base }, why: { [k]: TAG } };
  const r = await W.C.api(p, { method: 'POST', cookie: ck, body: operationSaveBody(W.env, p, taskCommandBody(W.env, p, body)) });
  return { status: r.status, why: why(r, k), j: r.j };
}
/* a sweep pass, its warnings captured */
async function pass(T, logs) {
  due(T.W); const l = console.log, w = console.warn; console.log = console.warn = (m) => { if (logs) logs.push(String(m)); };
  try { const s = await edit(T.W, T.S.mgr2, D2, 'plan', (v) => { v.floors[0].name = TAG + ' o ' + (++n); }); assert.ok(s.ok, JSON.stringify(s.j).slice(0, 200)); }
  finally { console.log = l; console.warn = w; }
}
/* a text no decoding can settle inside the bound on rounds (70 levels of \u005c): the one thing that still holds a pass */
const UNDECIDED = (() => { let c = '\\u0041'; for (let k = 0; k < 70; k++) c = c.replace(/\\/g, '\\u005c'); return c; })();
const holds = (logs) => logs.filter((m) => m.includes('img-sweep-escape-hold')).map((m) => JSON.parse(m));
async function settled(T) {
  const { W, S, id } = T, c = id('warm'); await upload(W, S.mgr2, c); age(W, c, 31);
  for (let k = 0; k < 4 && !gone(await state(W, c)); k++) await pass(T);
  assert.ok(gone(await state(W, c)), 'warm-up: the sweep is condemning'); assert.equal(meta(W, 'imgref_scan_v1'), 'done');
}

both(test, 'plain save: a record whose stored text already holds an escape saves for an unrelated change; adding one (new, or a second copy of the old) is accepted and stored too', async (mode) => {
  const T = await scene(mode), { W, S } = T;
  putOld(W, KP, { t: TAG, note: OLD });
  const s1 = await W.C.save(S.mgr, { [KP]: JSON.stringify({ t: TAG, note: OLD, phone: '0500000000' }) });
  assert.equal(why(s1, KP), null, JSON.stringify(s1.j).slice(0, 200)); assert.ok(kvText(W, KP).includes('0500000000'), 'the unrelated change is stored');
  for (const note of [OLD + ' \\u0041', OLD + ' ' + OLD, 'D:\\u0041dmin']) {
    const text = JSON.stringify({ t: TAG, note, phone: '0500000000' }), r = await W.C.save(S.mgr, { [KP]: text });
    assert.equal(why(r, KP), null, note + ' ' + JSON.stringify(r.j).slice(0, 200)); assert.equal(kvText(W, KP), text, 'stored as sent: ' + note);
  }
  assert.equal(W.env.DB.q('SELECT COUNT(*) n FROM imgref WHERE k = ?', KP)[0].n, 0, 'such text names no image');
  /* removing the old text is always possible */
  const s3 = await W.C.save(S.mgr, { [KP]: JSON.stringify({ t: TAG, note: 'C:/Users/plan.pdf' }) });
  assert.equal(why(s3, KP), null); assert.ok(!kvText(W, KP).includes('\\u00'));
});

both(test, 'typed save: a plan whose stored floor name already holds an escape saves for an unrelated change; adding one is accepted, the live plan carries it', async (mode) => {
  const T = await scene(mode), { W, S } = T, K = dk(D, 'plan');
  assert.ok((await edit(W, S.mgr, D, 'plan', (v) => { v.floors[0].name = TAG + ' baseline'; })).ok);
  oldFloor(W);
  const s1 = await edit(W, S.mgr, D, 'plan', (v) => { bump(v); });
  assert.ok(s1.ok, 'unrelated change saved: ' + s1.why + ' ' + JSON.stringify(s1.j).slice(0, 200));
  for (const name of [OLD + ' \\u0041', OLD + ' ' + OLD]) {
    const r = await edit(W, S.mgr, D, 'plan', (v) => { v.floors[0].name = name; });
    assert.ok(r.ok, name + ' ' + r.why + ' ' + JSON.stringify(r.j).slice(0, 200)); assert.equal(stored(W.env, K).floors[0].name, name, 'the live plan carries the name as written');
  }
});

both(test, 'cross-unit: a unit manager cannot bind another unit\'s image by an escape — into a record that already holds one, plain and typed, nor by rewriting the old escape into the id: refused as for the literal id; moving honest old text to another record is accepted', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, i2 = id('other');
  await bind(W, S.mgr2, D2, 'plan', i2);                                   /* D2's image, bound to D2's plan */
  const refs0 = (await state(W, i2)).refs;
  putOld(W, KP, { t: TAG, note: OLD });
  const lit = await W.C.save(S.mgr, { [KP]: JSON.stringify({ t: TAG, note: OLD, logo: i2 }) });
  assert.equal(why(lit, KP), 'imgown', 'control: the literal id is refused as foreign');
  for (const v of [{ t: TAG, note: OLD, logo: esc(i2) }, { t: TAG, note: OLD + ' ' + esc(i2) }, { t: TAG, note: esc(i2) }]) {
    const text = jesc(v), before = kvText(W, KP);
    assert.ok(!text.includes(i2));
    const r = await W.C.save(S.mgr, { [KP]: text });
    assert.equal(why(r, KP), 'imgown', text + ' ' + JSON.stringify(r.j).slice(0, 200)); assert.equal(r.status, lit.status); assert.equal(kvText(W, KP), before, 'not stored');
  }
  /* moving the old (honest) text to another record: D's plan may take it — it names no image */
  const KPL = dk(D, 'plan'), mv = await edit(W, S.mgr, D, 'plan', (v) => { v.floors[0].name = OLD; });
  assert.ok(mv.ok, JSON.stringify(mv.j).slice(0, 300)); assert.equal(stored(W.env, KPL).floors[0].name, OLD, 'stored in the other record');
  /* typed: D's plan holds an escape in a floor name — the foreign id spelled by an escape is refused as the literal id is */
  const K = dk(D, 'plan'); oldFloor(W);
  const g = await read(W, S.mgr, K); g.v.floors[0].iid = i2;
  const litT = await typed(W, S.mgr, K, JSON.stringify(g.v), g.base); assert.equal(litT.why, 'imgown', 'control: the literal id, typed');
  const text = JSON.stringify(g.v).replace('"' + i2 + '"', '"' + esc(i2) + '"'); assert.ok(!text.includes(i2));
  const r = await typed(W, S.mgr, K, text, g.base);
  assert.equal(r.why, 'imgown', JSON.stringify(r.j).slice(0, 300)); assert.equal(r.status, litT.status);
  const s = await state(W, i2); assert.deepEqual(s.refs, refs0); assert.equal(s.k, dk(D2, 'plan')); assert.equal(s.r2, PNG);
});

both(test, 'a record that keeps an old escaped spelling of its image (saved since): the save registers the image, no pass holds, the image is kept while the record names it and swept once it no longer does — honest old text elsewhere holds nothing', async (mode) => {
  const T = await scene(mode), { W, S, id } = T; await settled(T);
  const a = id('hid'); await upload(W, S.mgr, a);
  putOld(W, KP, jesc({ t: TAG, logo: esc(a) }));                            /* older data: an id spelled by an escape */
  assert.equal(JSON.parse(kvText(W, KP)).logo, a); assert.deepEqual((await state(W, a)).refs, []);
  /* before any save: the sweep reads the spelling and keeps the image */
  age(W, a, 31); let logs = []; await pass(T, logs);
  assert.equal((await state(W, a)).r2, PNG, 'LIVE-REFERENCED IMAGE DELETED'); assert.equal((await state(W, a)).st, 'claim'); assert.deepEqual(holds(logs), [], 'no pass held');
  const s1 = await W.C.save(S.mgr, { [KP]: jesc({ t: TAG, logo: esc(a), phone: '0500000001' }) });
  assert.equal(why(s1, KP), null, 'the record keeps its old text and saves'); assert.ok(kvText(W, KP).includes('0500000001') && kvText(W, KP).includes('\\u0069'));
  assert.deepEqual((await state(W, a)).refs, [KP], 'and the save registers the image its text spells'); assert.equal((await state(W, a)).st, 'bound');
  /* honest old text in a typed record, kept by a later save */
  assert.ok((await edit(W, S.mgr, D, 'plan', (v) => { v.floors[0].name = TAG + ' baseline'; })).ok); oldFloor(W);
  assert.ok((await edit(W, S.mgr, D, 'plan', bump)).ok);
  age(W, a, 31); logs = []; await pass(T, logs); await pass(T, logs);
  assert.equal((await state(W, a)).r2, PNG, 'LIVE-REFERENCED IMAGE DELETED'); assert.notEqual((await state(W, a)).st, 'dead');
  assert.deepEqual(holds(logs), [], 'no pass held: ' + JSON.stringify(holds(logs)));
  /* the record drops the image ⇒ orphan ⇒ swept after its grace, the honest old floor name still there */
  const s2 = await W.C.save(S.mgr, { [KP]: JSON.stringify({ t: TAG, phone: '0500000001' }) }); assert.equal(why(s2, KP), null);
  assert.equal((await state(W, a)).st, 'orphan'); assert.equal(stored(W.env, dk(D, 'plan')).floors[0].name, OLD);
  age(W, a, 31); logs = []; await pass(T, logs); await pass(T, logs);
  assert.ok(gone(await state(W, a)), 'swept once nothing names it: ' + JSON.stringify(await state(W, a)) + ' ' + JSON.stringify(holds(logs)));
});

both(test, 'the sweep holds only for a text it cannot decide (nested past the bound on rounds): no image is condemned, the log names the kv key / ops column and no content; once the text is gone the sweep resumes', async (mode) => {
  const T = await scene(mode), { W, S, id } = T; await settled(T);
  const a = id('hid'); await upload(W, S.mgr, a);
  putOld(W, KP, '{"t":"' + TAG + '","phone":"0500000001","x":"' + UNDECIDED + '"}');
  age(W, a, 31);
  let logs = []; await pass(T, logs); await pass(T, logs);
  assert.equal((await state(W, a)).r2, PNG, 'nothing is condemned while the pass holds'); assert.notEqual((await state(W, a)).st, 'dead');
  const h = holds(logs); assert.ok(h.length >= 1, 'held'); assert.ok(h[0].at.includes('kv:' + KP), JSON.stringify(h[0]));
  assert.ok(!JSON.stringify(h).includes('0500000001') && !JSON.stringify(h).includes(a.slice(1)), 'no content in the log');
  /* typed: the same in a floor name — named as table.column */
  W.env.DB.db.prepare('DELETE FROM kv WHERE k = ?').run(KP);
  assert.ok((await edit(W, S.mgr, D, 'plan', (v) => { v.floors[0].name = TAG + ' baseline'; })).ok);
  assert.ok(W.env.DB.db.prepare("UPDATE ops_plan_live_floors_floor SET f_name_text = ? WHERE department_id = ? AND resource = 'bassam_plan_v1' AND row_key = '$/f:floors/i:0'").run(UNDECIDED, D).changes === 1);
  age(W, a, 1); logs = []; await pass(T, logs);
  const h2 = holds(logs); assert.ok(h2.length >= 1); assert.ok(h2[0].at.includes('ops:ops_plan_live_floors_floor.f_name_text'), JSON.stringify(h2[0]));
  assert.equal((await state(W, a)).r2, PNG);
  /* the text goes ⇒ the sweep resumes */
  assert.ok(W.env.DB.db.prepare("UPDATE ops_plan_live_floors_floor SET f_name_text = ? WHERE department_id = ? AND resource = 'bassam_plan_v1' AND row_key = '$/f:floors/i:0'").run(TAG + ' clean', D).changes === 1);
  age(W, a, 1); logs = []; await pass(T, logs); await pass(T, logs);
  assert.ok(gone(await state(W, a)), 'swept once nothing undecided is stored: ' + JSON.stringify(await state(W, a)) + ' ' + JSON.stringify(holds(logs)));
});

both(test, 'staged parts of an abandoned chunked upload are cleaned even while a pass holds', async (mode) => {
  const T = await scene(mode), { W, S, id } = T;
  putOld(W, dk(D, 'notes'), '{"t":"' + TAG + '","note":"' + UNDECIDED + '"}');   /* what still holds a pass: a text that cannot be decided */
  const orp = id('orp'); await upload(W, S.mgr, orp); age(W, orp, 31);     /* a due row, so the pass reaches the hold */
  const sid = 'st' + mode.slice(0, 1) + Date.now().toString(36);
  W.env.DB.db.prepare("INSERT INTO imgs (k, seq, v) VALUES (?, 0, 'AAAA')").run('~stg~' + sid + '~0');
  W.env.DB.db.prepare("INSERT INTO imgown (img, st, k, uid, dept, ts) VALUES (?, 'stage', '', '', '', ?)").run('~stg~' + sid, Date.now() - 8 * 864e5);
  const logs = []; await pass(T, logs);
  assert.ok(holds(logs).length >= 1, 'the pass held');
  assert.equal(W.env.DB.q('SELECT COUNT(*) n FROM imgs WHERE k LIKE ?', '~stg~' + sid + '~%')[0].n, 0, 'expired staged parts cleaned');
  assert.equal(W.env.DB.q("SELECT COUNT(*) n FROM imgown WHERE img = ? AND st = 'stage'", '~stg~' + sid)[0].n, 0, 'and their clock');
  assert.equal((await state(W, orp)).r2, PNG, 'the held image is untouched');
});

both(test, 'tasks: one task whose stored note holds an escape does not block the unit — other employees act, the manager creates and cancels; a note carrying or adding an escape is accepted', async (mode) => {
  const W = await tasksWorld({ mode }), dm = await W.login('0000000101', '70101'), me = await W.login(ME.un, ME.pw), mate = await W.login(MATE.un, MATE.pw);
  const post = (ck, p, body) => W.C.api(p, { method: 'POST', cookie: ck, body: taskCommandBody(W.env, p, body) });
  const s = Date.now() - HR;
  const c1 = await post(dm.ck, '/api/tasks/create', { k: hij(s), t: TAG + ' o one', s, e: s + 3 * HR, asg: [ME.eid], rv: 'none' }); assert.equal(c1.status, 200);
  const c2 = await post(dm.ck, '/api/tasks/create', { k: hij(s), t: TAG + ' o two', s, e: s + 3 * HR, asg: [MATE.eid], rv: 'none' }); assert.equal(c2.status, 200);
  const k = c1.j.rows[0].k, r1 = c1.j.rows[0].id, r2 = c2.j.rows[0].id;
  assert.equal((await post(me.ck, '/api/me/tasks/act', { k, id: r1, act: 'start' })).status, 200);
  /* a new note with an escape is accepted and stored as written */
  const n0 = await post(me.ck, '/api/me/tasks/act', { k, id: r1, act: 'doc', note: 'C:\\Users\\u0041dmin' });
  assert.equal(n0.status, 200, JSON.stringify(n0.j).slice(0, 160)); assert.equal(W.env.DB.q('SELECT COUNT(*) n FROM ops_task_row_proof WHERE f_note_text = ?', 'C:\\Users\\u0041dmin')[0].n, 1);
  assert.equal((await post(me.ck, '/api/me/tasks/act', { k, id: r1, act: 'doc', note: TAG + ' plain' })).status, 200);
  /* older data: the same note as an earlier version stored it */
  assert.equal(W.env.DB.db.prepare('UPDATE ops_task_row_proof SET f_note_text = ? WHERE f_note_text LIKE ?').run('C:\\Users\\u0041dmin', TAG + ' plain%').changes, 1);
  const st = await post(mate.ck, '/api/me/tasks/act', { k, id: r2, act: 'start' });
  assert.equal(st.status, 200, 'MATE starts their own task: ' + JSON.stringify(st.j).slice(0, 160));
  const c3 = await post(dm.ck, '/api/tasks/create', { k: hij(s), t: TAG + ' o three', s, e: s + 3 * HR, asg: [MATE.eid], rv: 'none' });
  assert.equal(c3.status, 200, 'manager creates: ' + JSON.stringify(c3.j).slice(0, 160));
  const n1 = await post(me.ck, '/api/me/tasks/act', { k, id: r1, act: 'doc', note: 'C:\\Users\\u0041dmin and \\u0042' });
  assert.equal(n1.status, 200, 'a note adding an escape: ' + JSON.stringify(n1.j).slice(0, 160));
  assert.equal(W.env.DB.q('SELECT COUNT(*) n FROM ops_task_row_proof WHERE f_note_text = ?', 'C:\\Users\\u0041dmin and \\u0042')[0].n, 1, 'stored as written');
  const cx = await post(dm.ck, '/api/tasks/cancel', { k, id: r1, why: TAG + ' o cancel' });
  assert.equal(cx.status, 200, 'manager cancels the task holding the note: ' + JSON.stringify(cx.j).slice(0, 160));
});
