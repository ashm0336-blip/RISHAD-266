/* RISHAD V7 · issue #4 — an IMPORT that brings a node back together with its ceiling keeps that ceiling (owner decision, option 1:
   «الاستيراد يُبقي السقف المرفق، والبقايا تُحذف عند الحذف وإعادة استعمال الرقم يدوياً فقط»). Real worker, legacy and enforce, TEST_ONLY data.
   The defect this file reproduces (bdaff85): caps[X] is stored as a leftover (X is not a node). One save re-adds X carrying a registry
   whose record for X is IDENTICAL to the stored one, and puts unit U2 — which has no record of its own — under X. The server took the
   identical record for «a leftover copied along», dropped it, and U2 was left with no record anywhere above it = open (021 effCapOf).
   Proven twice: on the stored bytes, and on what the server then lets U2's manager do (a grant outside X's ceiling must be refused «cap»).
   Rule (018 nodeCapSweep): a record the save CARRIES for a node it adds is kept as sent, equal to the stored one or not. A stored leftover
   is dropped only for a node the save adds WITHOUT a record for it and with nothing placed under it (a node created by hand). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, stored, putKV, D as U2 } from './tasks_fx.mjs';

const KG = 'bassam_gdepts_v1', KD = 'bassam_depts_v1', KP = 'bassam_perms_v1', X = 'TEST_ONLY_X', EK = 'tst_e_emp1';
const NARROW = ['emps', 'help'];                       /* X's ceiling: «seized» is outside it, «emps» inside */
const DM = ['0000000101', '70101'];                    /* the manager account of U2 (tst_d1) */
const J = (x) => JSON.parse(JSON.stringify(x));
const raw = (env, k) => env.DB.q('SELECT v FROM kv WHERE k = ? ORDER BY seq', k).map((r) => r.v).join('');
const rev = (env, k) => (env.DB.q('SELECT rev FROM revs WHERE k = ?', k)[0] || {}).rev || 0;
const nodeX = { id: X, name: 'TEST_ONLY X', kind: 'إدارة عامة' };

/* stored: X is NOT a node; its ceiling record is a leftover; U2 has no record of its own and no ancestor with one ⇒ open */
async function scene(mode) {
  const W = await world({ mode }), P = stored(W.env, KP);
  delete P.caps[U2]; delete P.lenses[U2];
  P.caps[X] = NARROW.slice(); P.subs = { [X]: { emps: ['data'] } }; P.lenses[X] = ['zones']; P.capOwn = { [X]: true };
  putKV(W.env, KP, P);
  assert.ok(!stored(W.env, KG).some((n) => n.id === X), 'X is not a node yet');
  return Object.assign(W, { P0: J(P), dm: await W.login(DM[0], DM[1]) });
}
const underX = (W) => ({ [KG]: JSON.stringify(stored(W.env, KG).concat([nodeX])), [KD]: JSON.stringify(stored(W.env, KD).map((d) => d.id === U2 ? { ...d, gid: X } : d)) });
async function imp(W, set) {
  const ks = Object.keys(set);
  const r = await W.C.api('/api/save', { method: 'POST', cookie: W.su.ck, body: { set, del: [], base: Object.fromEntries(ks.map((k) => [k, rev(W.env, k)])), why: Object.fromEntries(ks.map((k) => [k, 'TEST_ONLY import'])),
    aud: [{ cid: 'cTESTONLYimpX', k: KG, etype: 'dataset', eid: KG, ename: KG, act: 'import', ctx: '', bef: '', aft: '' }] } });
  assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 300));
  assert.deepEqual(r.j.denied || {}, {}, 'nothing refused: ' + JSON.stringify(r.j).slice(0, 400));
  assert.ok(stored(W.env, KG).some((n) => n.id === X), 'the node is back');
  assert.equal(stored(W.env, KD).filter((d) => d.id === U2)[0].gid, X, 'U2 sits under X');
  return r;
}
/* the authorization outcome: U2's manager grants an employee a leaf — «cap» when the leaf is outside U2's effective ceiling */
async function grant(W, leaf) {
  const g = await W.C.api('/api/get?keys=' + KP, { cookie: W.dm.ck }), p = JSON.parse(g.j.keys[KP].v);
  p.emps[U2][EK][leaf] = ['view'];
  const body = { set: { [KP]: JSON.stringify(p) }, del: [], base: { [KP]: g.j.keys[KP].rev || 0 } };
  if (g.j.pscope !== undefined) body.pscope = g.j.pscope;
  const s = await W.C.api('/api/save', { method: 'POST', cookie: W.dm.ck, body });
  return { ok: !!(s.j.revs && s.j.revs[KP]), why: ((s.j.denied || {})[KP] || {}).why || '', show: JSON.stringify(s.j).slice(0, 240) };
}
async function restricted(W, m) {
  const out = await grant(W, 'seized/records');
  assert.ok(!out.ok, m + ': a grant outside X\'s ceiling was ACCEPTED — U2 is open — ' + out.show);
  assert.equal(out.why, 'cap', m + ' — ' + out.show);
  const ins = await grant(W, 'emps/data');
  assert.ok(ins.ok, m + ': a grant inside X\'s ceiling is accepted — ' + ins.show);
}
const recOf = (P, id) => Object.fromEntries(['caps', 'subs', 'lenses', 'capOwn'].filter((f) => P[f] && Object.prototype.hasOwnProperty.call(P[f], id)).map((f) => [f, P[f][id]]));

for (const mode of ['legacy', 'enforce']) {
  const M = '[' + mode + '] ';

  test(M + 'control: before the import U2 is open (no record on it or above it) — the grant the later cases must refuse is accepted here', async () => {
    const W = await scene(mode), out = await grant(W, 'seized/records');
    assert.ok(out.ok, out.show);
  });

  test(M + 'an import that re-adds X with a record IDENTICAL to the stored leftover and puts U2 under it keeps the record — U2 stays restricted', async () => {
    const W = await scene(mode), sent = raw(W.env, KP);          /* the registry of the file = the stored registry, byte for byte */
    await imp(W, { ...underX(W), [KP]: sent });
    const after = raw(W.env, KP);
    await restricted(W, 'after the import');                     /* the outcome first: it is what the defect cost */
    assert.equal(after, sent, 'the registry is stored as sent — X\'s record included');
    assert.deepEqual(recOf(JSON.parse(after), X), recOf(W.P0, X), 'caps · subs · lenses · capOwn of X are all there');
  });

  test(M + 'the same import with another edit in its registry: X\'s identical record is kept, the edit is written, nothing is echoed back as cleaned', async () => {
    const W = await scene(mode), mine = J(W.P0); mine.caps.tst_d2 = ['emps', 'tasks'];
    const sent = JSON.stringify(mine), r = await imp(W, { ...underX(W), [KP]: sent });
    assert.equal(raw(W.env, KP), sent);
    assert.deepEqual(r.j.conflicts || {}, {}, 'the server changed nothing in what was sent');
    assert.ok(r.j.revs[KP] > 0 && r.j.revs[KG] > 0 && r.j.revs[KD] > 0);
    await restricted(W, 'after the import');
  });

  test(M + 'fail-closed: a save that adds X WITHOUT a registry but places U2 under it does not drop the stored record (nothing opens silently)', async () => {
    const W = await scene(mode), v0 = raw(W.env, KP), r0 = rev(W.env, KP);
    await imp(W, underX(W));
    const after = raw(W.env, KP), r1 = rev(W.env, KP);
    await restricted(W, 'after the structure-only import');
    assert.equal(after, v0, 'the stored record of X stays'); assert.equal(r1, r0, 'the registry is not written');
  });

  test(M + 'manual re-use is still cleaned: X added by hand (no record carried, nothing under it) drops the leftover; U2 elsewhere is untouched', async () => {
    const W = await scene(mode), nodes = stored(W.env, KG).concat([nodeX]);
    const r = await W.C.api('/api/save', { method: 'POST', cookie: W.su.ck, body: { set: { [KG]: JSON.stringify(nodes) }, del: [], base: { [KG]: rev(W.env, KG) }, why: { [KG]: 'TEST_ONLY reason' } } });
    assert.equal(r.status, 200); assert.deepEqual(r.j.denied || {}, {}, JSON.stringify(r.j).slice(0, 300));
    const P1 = stored(W.env, KP), want = J(W.P0); for (const f of ['caps', 'subs', 'lenses', 'capOwn']) delete want[f][X];
    assert.deepEqual(recOf(P1, X), {}, 'the hand-made node starts without the stale ceiling');
    assert.equal(raw(W.env, KP), JSON.stringify(want), 'everything else is byte-identical');
  });

  test(M + 'delete is still cleaned: removing X (after U2 moved away) removes its records in the same save', async () => {
    const W = await scene(mode), sent = raw(W.env, KP);
    await imp(W, { ...underX(W), [KP]: sent });
    const back = { [KD]: JSON.stringify(stored(W.env, KD).map((d) => d.id === U2 ? { ...d, gid: 'tst_g1' } : d)) };
    let r = await W.C.api('/api/save', { method: 'POST', cookie: W.su.ck, body: { set: back, del: [], base: { [KD]: rev(W.env, KD) }, why: { [KD]: 'TEST_ONLY reason' } } });
    assert.deepEqual(r.j.denied || {}, {}, JSON.stringify(r.j).slice(0, 300));
    r = await W.C.api('/api/save', { method: 'POST', cookie: W.su.ck, body: { set: { [KG]: JSON.stringify(stored(W.env, KG).filter((n) => n.id !== X)) }, del: [], base: { [KG]: rev(W.env, KG) }, why: { [KG]: 'TEST_ONLY reason' } } });
    assert.deepEqual(r.j.denied || {}, {}, JSON.stringify(r.j).slice(0, 300));
    assert.ok(!stored(W.env, KG).some((n) => n.id === X), 'X is gone');
    assert.deepEqual(recOf(stored(W.env, KP), X), {}, 'and so are its records');
  });
}
