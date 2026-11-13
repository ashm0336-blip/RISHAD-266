/* V7-F · owner decisions 1, 3, 4 — on the real worker, legacy AND enforce, comparing the stored rows AND the R2 bytes.
   1. «اليتيمة لا تُربط إلا بسجل من إدارتها الأصلية أو بيد مسؤول المنصة. يشمل خريطة الخطة وخريطة الجولة وصورة إثبات المهمة.»
   3. «المدير العام لا يعيد ربط صورة إدارة محذوفة. مسؤول المنصة فقط.»
   4. «وحّد رسائل الرفض حتى لا تكشف وجود المعرّف.»
   Before this change (develop 5add483) any writer who knew an orphan's id saved it into his own plan/rounds and then READ the deleted unit's
   image (imgForeignIn skipped orphans; imgSync / the atomic path re-bound them to whoever mentioned them). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ME, MATE, TAG, hij, HR, taskCommandBody, addAccount, replaceOperationalFixture } from './tasks_fx.mjs';
import { D, D2, PNG, K_USERS, K_DEPTS, dk, both, scene, state, img, edit, bind, upload, unitOp, shape, EDIT, stored, putKV, read } from './v7_f_img_fx.mjs';

const post = (W, ck, p, body) => W.C.api(p, { method: 'POST', cookie: ck, body: taskCommandBody(W.env, p, body) });
const DENY = { ok: 0, err: 'forbidden' };

/* the images of a unit: its plan map, its round map, one task-proof image (bound by its own employee through the self-proof route) */
async function unitImages(T, dept, mgr) {
  const { W, S, id } = T, ids = { plan: id('planmap'), rounds: id('roundmap') };
  await bind(W, S[mgr], dept, 'plan', ids.plan); await bind(W, S[mgr], dept, 'rounds', ids.rounds);
  return ids;
}
async function proofOf(T) {   /* a task-proof image bound in unit D by its employee */
  const { W, S, x } = T, me = (await W.login(ME.un, ME.pw)).ck, pid = 'img_tskv7f' + x + '_proof', s = Date.now() - HR;
  const cr = await post(W, S.mgr, '/api/tasks/create', { k: hij(s), t: TAG + ' v7f', s, e: s + 3 * HR, asg: [ME.eid], rv: 'none' }); assert.equal(cr.status, 200, JSON.stringify(cr.j));
  const k = cr.j.rows[0].k, tid = cr.j.rows[0].id;
  assert.equal((await post(W, me, '/api/me/tasks/act', { k, id: tid, act: 'start' })).status, 200);
  await upload(W, me, pid);
  assert.equal((await post(W, me, '/api/me/tasks/act', { k, id: tid, act: 'doc', imgs: [pid], note: 'م' })).status, 200);
  assert.equal((await state(W, pid)).st, 'bound');
  return { pid, me, k, tid };
}
const sameStore = async (W, id, before, label) => assert.deepEqual(await state(W, id), before, label + ' — image row, references and bytes unchanged');

both(test, 'decision 1+3 · a DELETED unit\'s orphans (plan map · round map · task proof) are re-bound by nobody but the platform admin', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, ids = await unitImages(T, D, 'mgr'), proof = await proofOf(T);
  /* control: what a FOREIGN BOUND image answers to another unit's writer — the orphan must answer exactly the same */
  const ctl = id('ctlbound'); await bind(W, S.mgr3, 'tst_d3', 'plan', ctl).catch(() => null);
  const all = { plan: ids.plan, rounds: ids.rounds, proof: proof.pid };
  await unitOp(W, 'dept-delete', D);
  const before = {};
  for (const [n, i] of Object.entries(all)) {
    before[n] = await state(W, i);
    assert.equal(before[n].st, 'orphan', n + ' is an orphan after its unit is deleted'); assert.equal(before[n].dept, D); assert.deepEqual(before[n].refs, []);
    assert.ok(before[n].body, n + ' body kept for the grace');
  }
  assert.equal(before.plan.r2, PNG, 'bytes still in R2 for the grace');
  /* every other writer × every image × every image-bearing record he writes */
  const cover = {}, actors = { mgr2: 'another unit\'s manager', gm: 'the general manager of the node that contained the unit' };
  for (const [who, label] of Object.entries(actors)) for (const res of ['plan', 'rounds']) for (const [n, i] of Object.entries(all)) {
    const k = dk(D2, res), was = JSON.stringify(stored(W.env, k)), s = await edit(W, S[who], D2, res, EDIT[res](i));
    if (s.why === 'no-read') { assert.equal(who, 'gm', 'only the gm may lack the read'); cover['gm-no-read-' + res] = 1; continue; }
    cover[who + '-' + res] = (cover[who + '-' + res] || 0) + 1;
    assert.equal(s.ok, false, label + ' saving the ' + n + ' orphan into his ' + res + ' is refused · ' + JSON.stringify(s.j).slice(0, 200));
    assert.equal(s.why, 'imgown', 'refused exactly as a foreign bound image is');
    assert.equal(JSON.stringify(stored(W.env, k)), was, 'his record is unchanged');
    await sameStore(W, i, before[n], who + '/' + res + '/' + n);
    const g = await img(W, S[who], i);
    assert.equal(g.status, 403, label + ' still cannot read the ' + n + ' orphan'); assert.deepEqual(g.j, DENY);
  }
  if ((await state(W, ctl)).st === 'bound') {   /* the control really is a foreign bound image for mgr2 */
    const s = await edit(W, S.mgr2, D2, 'plan', EDIT.plan(ctl));
    assert.equal(s.ok, false); assert.equal(s.why, 'imgown', 'the control: a foreign bound image is refused with the same reason'); cover.control = 1;
  }
  console.log('# cover [' + mode + '] ' + JSON.stringify(cover));
  assert.equal(cover['mgr2-plan'], 3); assert.equal(cover['mgr2-rounds'], 3);
  /* decision 3: the platform admin — and only he — re-binds */
  const s = await edit(W, S.super, D2, 'plan', EDIT.plan(ids.plan));
  assert.ok(s.ok, 'the platform admin re-binds the orphan · ' + JSON.stringify(s.j).slice(0, 200));
  const after = await state(W, ids.plan);
  assert.equal(after.st, 'bound'); assert.equal(after.k, dk(D2, 'plan')); assert.equal(after.dept, D2); assert.equal(after.r2, PNG, 'same bytes');
  assert.equal((await img(W, S.mgr2, ids.plan)).status, 200, 'now it is his unit\'s image, by the admin\'s hand');
});

both(test, 'decision 3 · a unit or section created later under the deleted unit\'s id inherits none of its orphans', async (mode) => {
  const T = await scene(mode), { W, S } = T, ids = await unitImages(T, D, 'mgr');
  const depts0 = stored(W.env, K_DEPTS), mine = depts0.find((d) => d.id === D), plan0 = stored(W.env, dk(D, 'plan'));
  await unitOp(W, 'dept-delete', D);
  assert.equal((await state(W, ids.plan)).uid, '~unit-deleted~', 'the delete stamps the unit\'s orphans');
  /* the same id comes back (a manager can create a section under an id of his choosing) with a manager of its own */
  const L = stored(W.env, K_DEPTS); L.push(mine); putKV(W.env, K_DEPTS, L);
  addAccount(W.env, { uid: 'tst_v7f_dm', un: '0000000189', pw: '70189', ekey: 'mgr:' + D, dept: D, role: 'dept' });
  await replaceOperationalFixture(W.env, dk(D, 'plan'), plan0 && plan0.floors ? Object.assign({}, plan0, { floors: plan0.floors.map((f) => Object.assign({}, f, { iid: '' })) }) : plan0);
  const again = (await W.login('0000000189', '70189')).ck, before = await state(W, ids.plan);
  const g0 = await read(W, again, dk(D, 'plan'));
  if (g0.v) {
    const s = await edit(W, again, D, 'plan', EDIT.plan(ids.plan));
    assert.equal(s.ok, false, 'the new unit\'s manager cannot adopt the old unit\'s orphan · ' + JSON.stringify(s.j).slice(0, 200)); assert.equal(s.why, 'imgown');
  }
  console.log('# cover [' + mode + '] re-created unit: its manager ' + (g0.v ? 'reads its plan and was refused the orphan' : 'cannot read its plan (' + JSON.stringify(g0.raw.j).slice(0, 120) + ')'));
  assert.deepEqual(await state(W, ids.plan), before);
  const g = await img(W, again, ids.plan); assert.equal(g.status, 403); assert.deepEqual(g.j, DENY, 'and he gets the unified refusal, not the reason');
});

both(test, 'decision 1 · a unit that STILL EXISTS undoes its own removal inside the grace; another unit cannot; the gm follows the unit-write rules', async (mode) => {
  const T = await scene(mode), { W, S } = T, ids = await unitImages(T, D, 'mgr');
  for (const res of ['plan', 'rounds']) {
    const i = ids[res];
    assert.ok((await edit(W, S.mgr, D, res, EDIT[res](''))).ok, 'the unit removes its ' + res + ' map');
    const o = await state(W, i); assert.equal(o.st, 'orphan'); assert.equal(o.dept, D); assert.equal(o.uid === '~unit-deleted~', false); assert.equal(o.r2, PNG);
    /* another unit's manager: refused, as for the deleted unit */
    const was = JSON.stringify(stored(W.env, dk(D2, res))), bad = await edit(W, S.mgr2, D2, res, EDIT[res](i));
    assert.equal(bad.ok, false); assert.equal(bad.why, 'imgown'); assert.equal(JSON.stringify(stored(W.env, dk(D2, res))), was); assert.deepEqual(await state(W, i), o);
    assert.deepEqual((await img(W, S.mgr2, i)).j, DENY);
    /* the gm of the node: on ANOTHER unit of his node the orphan is foreign … */
    const gmOther = await edit(W, S.gm, D2, res, EDIT[res](i));
    assert.equal(gmOther.ok, false, 'gm cannot carry the orphan into another unit · ' + JSON.stringify(gmOther.j).slice(0, 160)); assert.deepEqual(await state(W, i), o);
    /* … and on the image's OWN (existing) unit he re-binds only if the unit-write rules let him write that record at all (pinned: whatever his neutral edit gets, the re-bind gets) */
    const neutral = await edit(W, S.gm, D, res, (v) => { v.__v7f = 1; delete v.__v7f; EDIT[res]('')(v); });
    const gmOwn = await edit(W, S.gm, D, res, EDIT[res](i));
    if (gmOwn.ok) { const b = await state(W, i); assert.equal(b.st, 'bound'); assert.equal(b.k, dk(D, res)); assert.ok((await edit(W, S.mgr, D, res, EDIT[res](''))).ok); assert.equal((await state(W, i)).st, 'orphan'); }
    else assert.notEqual(gmOwn.why, null, 'refused by the unit-write rules, not silently · neutral=' + JSON.stringify(neutral.why));
    console.log('# pinned [' + mode + '] gm re-binding the ' + res + ' orphan of an EXISTING unit of his node: ' + (gmOwn.ok ? 'allowed (he writes that record)' : 'refused (' + gmOwn.why + ')'));
    /* the unit's own undo */
    const undo = await edit(W, S.mgr, D, res, EDIT[res](i));
    assert.ok(undo.ok, 'the unit re-binds its own orphan · ' + JSON.stringify(undo.j).slice(0, 200));
    const b = await state(W, i); assert.equal(b.st, 'bound'); assert.equal(b.k, dk(D, res)); assert.equal(b.dept, D); assert.equal(b.r2, PNG); assert.deepEqual(b.refs, [dk(D, res)]);
    assert.equal((await img(W, S.mgr, i)).status, 200);
  }
});

both(test, 'decision 1 · a wiped unit (still existing) re-binds its own orphans; nobody else does', async (mode) => {
  const T = await scene(mode), { W, S } = T, ids = await unitImages(T, D, 'mgr');
  await unitOp(W, 'dept-wipe', D);
  const o = await state(W, ids.plan); assert.equal(o.st, 'orphan'); assert.equal(o.dept, D);
  const bad = await edit(W, S.mgr2, D2, 'plan', EDIT.plan(ids.plan)); assert.equal(bad.ok, false); assert.equal(bad.why, 'imgown'); assert.deepEqual(await state(W, ids.plan), o);
});

both(test, 'decision 4 · one refusal for every id the caller is not entitled to — GET, DELETE and PUT; the own unit keeps the reason', async (mode) => {
  const T = await scene(mode), { W, S, id } = T, ids = await unitImages(T, D, 'mgr');
  const claim = id('claim'); await upload(W, S.staff, claim).catch(() => upload(W, S.mgr, claim));
  const bound3 = id('b3'); await bind(W, S.mgr, D, 'rounds', bound3); await edit(W, S.mgr, D, 'rounds', EDIT.rounds(ids.rounds));   /* bound3 → orphan of a LIVE unit */
  const orphanLive = bound3, none = id('nosuchimage');
  const cases = { 'no such id': none, 'orphan (live unit)': orphanLive, 'another\'s upload': claim, 'another unit\'s bound image': ids.plan };
  for (const who of ['mgr2', 'emp2', 'mgr3']) for (const method of ['GET', 'DELETE']) {
    const seen = {};
    for (const [n, i] of Object.entries(cases)) { const r = await img(W, S[who], i, method); seen[n] = shape(r); assert.equal(r.status, 403, who + ' ' + method + ' ' + n); assert.deepEqual(r.j, DENY, who + ' ' + method + ' ' + n + ' carries no reason'); }
    assert.equal(new Set(Object.values(seen)).size, 1, who + ' ' + method + ': the four cases are indistinguishable · ' + JSON.stringify(seen));
  }
  /* PUT: an id that exists and is not the caller's is one answer whatever its state (a free id is, by necessity, accepted from a writer and is not in this set) */
  for (const who of ['mgr2', 'mgr3']) {
    const seen = {};
    for (const [n, i] of Object.entries(cases)) { if (i === none) continue; const r = await img(W, S[who], i, 'PUT'); seen[n] = shape(r); assert.deepEqual(r.j, DENY); }
    assert.equal(new Set(Object.values(seen)).size, 1, who + ' PUT · ' + JSON.stringify(seen));
  }
  /* after the unit is deleted its orphans join the same answer — for the gm of its node too */
  const st0 = {}; for (const i of Object.values(cases)) st0[i] = await state(W, i);
  /* the image's own unit keeps the precise reason (the UI names it: «أُزيل مرجعُها وتنتظر الكنس» · «لم تُربط بعد») */
  const own = await img(W, S.mgr, orphanLive); assert.equal(own.status, 403); assert.equal(own.j.why, 'orphan', 'own unit: the reason');
  if ((await state(W, claim)).uid !== stored(W.env, K_USERS).find((u) => u.un === '0000000101').id) { const c = await img(W, S.mgr, claim); assert.equal(c.status, 403); assert.equal(c.j.why, 'claim', 'own unit: a colleague\'s upload not bound yet'); }
  /* a writer told his own image is in use by another record */
  const shared = ids.rounds; assert.ok((await edit(W, S.mgr, D, 'plan', EDIT.plan(shared))).ok, 'the same image in two records of the unit');
  const inuse = await img(W, S.mgr, shared, 'DELETE'); assert.equal(inuse.status, 403); assert.equal(inuse.j.why, 'inuse');
  assert.equal((await state(W, shared)).r2, PNG, 'and nothing was deleted');
  /* nothing above changed any image */
  for (const i of [none, orphanLive, claim]) assert.deepEqual(await state(W, i), st0[i]);
  await unitOp(W, 'dept-delete', D);
  for (const who of ['mgr2', 'gm', 'emp2']) { const seen = new Set(); for (const i of [none, orphanLive, claim, shared]) { const r = await img(W, S[who], i); assert.equal(r.status, 403); assert.deepEqual(r.j, DENY); seen.add(shape(r)); } assert.equal(seen.size, 1, who + ' after the delete'); }
  assert.equal((await img(W, S.super, shared)).status, 200, 'the platform admin still reads the orphan for the grace');
});

/* pinned (already so on develop): the self-proof route binds only the caller's own fresh upload — never an orphan, his own or a colleague's */
both(test, 'decision 1 · task proof by the self route (062c): an orphan id is never attached — only the caller\'s own upload', async (mode) => {
  const T = await scene(mode), { W, S } = T, proof = await proofOf(T);
  assert.equal((await post(W, proof.me, '/api/me/tasks/act', { k: proof.k, id: proof.tid, act: 'doc', rm: [proof.pid] })).status, 200);
  const o = await state(W, proof.pid); assert.equal(o.st, 'orphan'); assert.equal(o.dept, D);
  const mate = (await W.login(MATE.un, MATE.pw)).ck, s = Date.now() - HR;
  const cr = await post(W, S.mgr, '/api/tasks/create', { k: hij(s), t: TAG + ' v7f mate', s, e: s + 3 * HR, asg: [MATE.eid], rv: 'none' }); assert.equal(cr.status, 200, JSON.stringify(cr.j));
  const r = cr.j.rows[0]; assert.equal((await post(W, mate, '/api/me/tasks/act', { k: r.k, id: r.id, act: 'start' })).status, 200);
  for (const [who, ck, row] of [['a colleague', mate, r], ['its former owner', proof.me, { k: proof.k, id: proof.tid }]]) {
    const x = await post(W, ck, '/api/me/tasks/act', { k: row.k, id: row.id, act: 'doc', imgs: [proof.pid], note: 'م' });
    assert.equal(x.status, 409, who + ' attaching the orphan: ' + JSON.stringify(x.j)); assert.equal(x.j.err, 'img');
    assert.deepEqual(await state(W, proof.pid), o, who + ': the orphan is untouched');
  }
  assert.deepEqual((await img(W, S.mgr2, proof.pid)).j, DENY);
});
