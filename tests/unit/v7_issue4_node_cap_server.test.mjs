/* RISHAD V7 · issue #4 — the SERVER removes a node's ceiling records with the node (real worker, legacy and enforce, TEST_ONLY data).
   A node (bassam_gdepts_v1) used to leave caps/subs/lenses[<id>] and its capOwn flag in bassam_perms_v1 after it was deleted (the server
   cleaned a deleted UNIT only), and a node id that came back (import · restore · re-use) silently carried that stale ceiling.
   Rule under test (054 applySave · 018 nodeCapSweep), in the SAME save that the node-removal rule (018 nodeRemoveWhy) accepts:
     (a) delete — no caps/subs/lenses/capOwn entry of the removed node remains; every other record is byte-identical; the capOwn map
         itself stays (021 capOwnWhy refuses dropping it); a refused removal cleans nothing;
     (b) import — a record the save CARRIES for a node it adds is kept exactly as sent, equal to a stored leftover or not (owner decision,
         option 1: «الاستيراد يُبقي السقف المرفق»; the descendant-opening case is proven in v7_issue4_node_cap_import.test.mjs);
     (d) manual re-use — a node added WITHOUT a record for it (and with nothing under it) does not inherit a record stored before it;
     (c) restore — a full restore that brings its own registry keeps it verbatim; one that brings the structure without a registry
         does not revive a stored leftover.
   The registry write the server derives is never reported for a key the request did not carry (280 saveAck9 refuses such an answer);
   a registry the request did carry and the server had to clean is answered with the written value (conflicts[k].cur) so the page adopts it. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeTestEnv, client, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';

const KG = 'bassam_gdepts_v1', KD = 'bassam_depts_v1', KP = 'bassam_perms_v1';
const G = 'TEST_ONLY_G', N = 'TEST_ONLY_N', X = 'TEST_ONLY_X', Y = 'TEST_ONLY_Y', U = 'TEST_ONLY_U';
const put = (DB, k, v) => { DB.db.prepare('DELETE FROM kv WHERE k = ?').run(k); DB.db.prepare('INSERT INTO kv (k, seq, v) VALUES (?, 0, ?)').run(k, JSON.stringify(v)); DB.db.prepare('INSERT INTO revs (k, rev) VALUES (?, 1) ON CONFLICT(k) DO UPDATE SET rev = rev + 1').run(k); };
const raw = (DB, k) => DB.q('SELECT v FROM kv WHERE k = ? ORDER BY seq', k).map((r) => r.v).join('');
const read = (DB, k) => JSON.parse(raw(DB, k) || 'null');
const rev = (DB, k) => (DB.q('SELECT rev FROM revs WHERE k = ?', k)[0] || {}).rev || 0;
const J = (x) => JSON.parse(JSON.stringify(x));
const node = (id, pid) => ({ id, name: id, kind: 'إدارة عامة', ...(pid ? { pid } : {}) });
const STALE = { caps: ['emps'], subs: { emps: ['data'] }, lenses: ['zones'] };
/* the registry with a ceiling record of `id` in the four maps, beside a unit's records that must never move */
const registry = (id) => ({
  caps: { [G]: ['emps', 'tasks', 'admin'], [id]: STALE.caps, [U]: ['emps', 'tasks'] },
  emps: { [U]: { TEST_ONLY_e: { tasks: ['view'] } } }, tplOf: { [U]: { TEST_ONLY_e: 'TEST_ONLY_tpl' } },
  lenses: { [id]: STALE.lenses, [U]: [] }, subs: { [id]: STALE.subs, [U]: { emps: ['data'] } }, empLens: { [U]: { TEST_ONLY_e: [] } },
  capOwn: { [id]: true, [U]: true },
});
const without = (P, id) => { const o = J(P); for (const f of ['caps', 'subs', 'lenses', 'capOwn']) if (o[f]) delete o[f][id]; return o; };
const holds = (P, id) => ['caps', 'subs', 'lenses', 'capOwn'].filter((f) => P[f] && Object.prototype.hasOwnProperty.call(P[f], id));

async function world(mode, { nodes, perms }) {
  const env = makeTestEnv(mode === 'enforce' ? { KIVO_AUTHZ_MODE: 'enforce' } : {}), DB = env.DB;
  if (mode === 'enforce') DB.exec("INSERT INTO meta(k,v) VALUES('authz_mode','enforce') ON CONFLICT(k) DO UPDATE SET v='enforce'");
  put(DB, KG, nodes); put(DB, KD, [{ id: U, name: 'U', gid: G }]); put(DB, KP, perms);
  const C = client(env), su = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN); assert.ok(su.ok, 'the platform administrator signs in');
  const save = (set, base) => C.api('/api/save', { method: 'POST', cookie: su.ck, body: { set, del: [], base: base || Object.fromEntries(Object.keys(set).map((k) => [k, rev(DB, k)])), why: Object.fromEntries(Object.keys(set).map((k) => [k, 'TEST_ONLY reason'])) } });
  return { env, DB, C, su, save };
}
const clean = (r, k) => { assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 300)); assert.ok(!(r.j.denied || {})[k], k + ' not denied: ' + JSON.stringify(r.j.denied || {})); };
/* what 280 saveAck9 requires of an answer: nothing about a key the request did not carry */
const onlyAbout = (r, keys) => { for (const kind of ['revs', 'denied', 'conflicts']) for (const k of Object.keys(r.j[kind] || {})) assert.ok(keys.includes(k), kind + ' names a key the request did not carry: ' + k); };

for (const mode of ['legacy', 'enforce']) {
  test('(a) ' + mode + ': deleting a node through the normal save removes its ceiling records — other records byte-identical', async () => {
    const P0 = registry(N), W = await world(mode, { nodes: [node(G), node(N, G)], perms: P0 }), r0 = rev(W.DB, KP);
    const r = await W.save({ [KG]: JSON.stringify([node(G)]) });
    clean(r, KG); onlyAbout(r, [KG]);
    assert.ok(r.j.revs && r.j.revs[KG] > 0, 'the node registry was written');
    assert.deepEqual(read(W.DB, KG), [node(G)]);
    const P1 = read(W.DB, KP);
    assert.deepEqual(holds(P1, N), [], 'no caps/subs/lenses/capOwn entry of the removed node remains');
    assert.equal(raw(W.DB, KP), JSON.stringify(without(P0, N)), 'everything else is byte-identical (the capOwn map stays)');
    assert.ok(rev(W.DB, KP) > r0, 'the registry revision moved (other pages pick the change up)');
    assert.equal(rev(W.DB, KP), rev(W.DB, KG), 'both were written by the same save');
  });

  test('(a) ' + mode + ': the last capOwn flag leaves an empty map; a node without records writes no registry', async () => {
    let W = await world(mode, { nodes: [node(G), node(N, G)], perms: { caps: { [N]: [] }, capOwn: { [N]: true } } });
    clean(await W.save({ [KG]: JSON.stringify([node(G)]) }), KG);
    assert.equal(raw(W.DB, KP), JSON.stringify({ caps: {}, capOwn: {} }));
    W = await world(mode, { nodes: [node(G), node(N, G)], perms: without(registry(N), N) }); const r0 = rev(W.DB, KP), v0 = raw(W.DB, KP);
    clean(await W.save({ [KG]: JSON.stringify([node(G)]) }), KG);
    assert.equal(rev(W.DB, KP), r0, 'nothing to clean ⇒ the registry is not written'); assert.equal(raw(W.DB, KP), v0);
  });

  test('(a) ' + mode + ': the page\'s own cleaned registry in the same save (331 dropNodeCap) is accepted as sent — no conflict, no refusal', async () => {
    const P0 = registry(N), W = await world(mode, { nodes: [node(G), node(N, G)], perms: P0 }), sent = JSON.stringify(without(P0, N));
    const r = await W.save({ [KG]: JSON.stringify([node(G)]), [KP]: sent });
    clean(r, KG); clean(r, KP); onlyAbout(r, [KG, KP]);
    assert.deepEqual(r.j.conflicts || {}, {}, 'no conflict');
    assert.ok(r.j.revs[KP] > 0 && r.j.revs[KG] > 0);
    assert.equal(raw(W.DB, KP), sent);
  });

  test('(a) ' + mode + ': a registry in the same save that still holds the removed node (an older page) is cleaned by the server and answered with the written value', async () => {
    const P0 = registry(N), W = await world(mode, { nodes: [node(G), node(N, G)], perms: P0 });
    const mine = J(P0); mine.caps[U] = ['emps'];   /* an unrelated edit travelling with it */
    const r = await W.save({ [KG]: JSON.stringify([node(G)]), [KP]: JSON.stringify(mine) });
    clean(r, KG); clean(r, KP); onlyAbout(r, [KG, KP]);
    const want = JSON.stringify(without(mine, N));
    assert.equal(raw(W.DB, KP), want, 'the unrelated edit is kept, the removed node\'s records are not');
    const c = (r.j.conflicts || {})[KP]; assert.ok(c, 'the page is told what was written: ' + JSON.stringify(r.j).slice(0, 300));
    assert.equal(c.cur, want); assert.equal(c.rev, rev(W.DB, KP));
    /* the page adopts cur/rev (merge of its value over cur = cur ⇒ nothing is re-sent); a later edit built on them is an ordinary save */
    const next = JSON.parse(c.cur); next.caps[U] = ['emps', 'tasks'];
    const r2 = await W.save({ [KP]: JSON.stringify(next) }, { [KP]: c.rev });
    clean(r2, KP); assert.deepEqual(r2.j.conflicts || {}, {}); assert.deepEqual(holds(read(W.DB, KP), N), []);
  });

  test('(a) ' + mode + ': a refused removal (the node still has a unit) cleans nothing', async () => {
    const P0 = registry(G), W = await world(mode, { nodes: [node(G)], perms: P0 }), r0 = rev(W.DB, KP), v0 = raw(W.DB, KP);
    const r = await W.save({ [KG]: '[]' });
    assert.equal(((r.j.denied || {})[KG] || {}).why, 'node-has-children', JSON.stringify(r.j).slice(0, 300));
    assert.equal(raw(W.DB, KP), v0); assert.equal(rev(W.DB, KP), r0); assert.deepEqual(read(W.DB, KG), [node(G)]);
  });

  test('(a) ' + mode + ': the page\'s cleaning arriving AFTER the server already cleaned is not refused and changes nothing', async () => {
    const P0 = registry(N), W = await world(mode, { nodes: [node(G), node(N, G)], perms: P0 }), old = rev(W.DB, KP);
    clean(await W.save({ [KG]: JSON.stringify([node(G)]) }), KG);
    const sent = JSON.stringify(without(P0, N)), r1 = rev(W.DB, KP);
    const r = await W.save({ [KP]: sent }, { [KP]: old });   /* built on the revision the page knew before the node was deleted */
    clean(r, KP); onlyAbout(r, [KP]);
    assert.deepEqual(r.j.conflicts || {}, {}, 'identical to the stored registry ⇒ settled as saved, no conflict although its base revision is older');
    assert.equal(r.j.revs[KP], r1, 'answered with the current revision');
    assert.equal(raw(W.DB, KP), sent); assert.equal(rev(W.DB, KP), r1, 'nothing is written twice');
  });

  test('(d) ' + mode + ': a node created with an id that still has a leftover record does not inherit it', async () => {
    const P0 = registry(X), W = await world(mode, { nodes: [node(G)], perms: P0 });   /* the leftover is seeded directly: X is not a node */
    const r = await W.save({ [KG]: JSON.stringify([node(G), node(X, G)]) });
    clean(r, KG); onlyAbout(r, [KG]);
    assert.deepEqual(read(W.DB, KG), [node(G), node(X, G)]);
    assert.deepEqual(holds(read(W.DB, KP), X), [], 'the new node starts without the stale ceiling');
    assert.equal(raw(W.DB, KP), JSON.stringify(without(P0, X)), 'everything else is byte-identical');
  });

  test('(d) ' + mode + ': a record the same save writes deliberately for the new node is kept as sent', async () => {
    const P0 = registry(X), W = await world(mode, { nodes: [node(G)], perms: P0 });
    const mine = without(P0, X); mine.caps[X] = ['emps', 'tasks'];   /* a ceiling chosen now — not the stored one */
    const sent = JSON.stringify(mine), r = await W.save({ [KG]: JSON.stringify([node(G), node(X, G)]), [KP]: sent });
    clean(r, KG); clean(r, KP); assert.deepEqual(r.j.conflicts || {}, {});
    assert.equal(raw(W.DB, KP), sent);
  });

  test('(d) ' + mode + ': a new node\'s seeded ceiling is written with the node or not at all (so a later retry is not mistaken for a leftover)', async () => {
    const P0 = without(registry(X), X), W = await world(mode, { nodes: [node(G)], perms: P0 }), v0 = raw(W.DB, KP), r0 = rev(W.DB, KP);
    const mine = J(P0); mine.caps[X] = ['emps'];
    const r = await W.save({ [KG]: JSON.stringify([node(G), node(X, G)]), [KP]: JSON.stringify(mine) }, { [KG]: rev(W.DB, KG) - 1, [KP]: r0 });   /* the structure was built on an older revision */
    assert.ok((r.j.conflicts || {})[KG], 'the structure conflicts: ' + JSON.stringify(r.j).slice(0, 300));
    assert.equal(raw(W.DB, KP), v0, 'the seeded ceiling is not written ahead of its node'); assert.equal(rev(W.DB, KP), r0);
    assert.ok(r.j.atomic, 'the page re-sends the rest (280 settle: atomic)');
  });

  /* Rewritten by owner decision (option 1) — this case used to assert that the returning id DROPS a record identical to the stored
     leftover. An import keeps the ceiling it carries; only delete and manual re-use clean a leftover. */
  test('(b) ' + mode + ': an import that re-creates a node id beside a new node — the returning id KEEPS the ceiling the import carries (identical to the stored one), the new node keeps its seed', async () => {
    const P0 = registry(X), W = await world(mode, { nodes: [node(G)], perms: P0 });
    const mine = J(P0); mine.caps[Y] = ['emps', 'tasks'];   /* 320 seedCapFrom: Y is seeded; X «already has a ceiling — untouched» */
    const sent = JSON.stringify(mine), set = { [KG]: JSON.stringify([node(G), node(X, G), node(Y, G)]), [KP]: sent };
    const r = await W.C.api('/api/save', { method: 'POST', cookie: W.su.ck, body: { set, del: [], base: { [KG]: rev(W.DB, KG), [KP]: rev(W.DB, KP) }, why: { [KG]: 'TEST_ONLY import', [KP]: 'TEST_ONLY import' },
      aud: [{ cid: 'cTESTONLYimp1', k: KG, etype: 'dataset', eid: KG, ename: KG, act: 'import', ctx: '', bef: '', aft: '' }] } });
    clean(r, KG); clean(r, KP); onlyAbout(r, [KG, KP]);
    const P1 = read(W.DB, KP);
    assert.deepEqual(holds(P1, X), ['caps', 'subs', 'lenses', 'capOwn'], 'the returning id keeps the ceiling the import carries');
    assert.deepEqual(P1.caps[Y], ['emps', 'tasks'], 'the new node keeps the ceiling this save gave it');
    assert.equal(raw(W.DB, KP), sent, 'the registry is stored exactly as sent');
    assert.deepEqual(r.j.conflicts || {}, {}, 'the server cleaned nothing ⇒ nothing is echoed back');
    assert.ok(r.j.revs[KP] > 0 && r.j.revs[KG] > 0);
    /* a registry byte-identical to the stored one (nothing seeded): kept, not written twice, not refused */
    const W3 = await world(mode, { nodes: [node(G)], perms: P0 }), v3 = raw(W3.DB, KP);
    const r3 = await W3.save({ [KG]: JSON.stringify([node(G), node(X, G)]), [KP]: v3 });
    clean(r3, KG); clean(r3, KP); onlyAbout(r3, [KG, KP]);
    assert.equal(raw(W3.DB, KP), v3); assert.deepEqual(read(W3.DB, KG), [node(G), node(X, G)]);
    /* the structure alone (no registry carried, nothing under the node) — the same request as a node made by hand: the leftover goes */
    const W2 = await world(mode, { nodes: [node(G)], perms: P0 });
    const r2 = await W2.C.api('/api/save', { method: 'POST', cookie: W2.su.ck, body: { set: { [KG]: JSON.stringify([node(G), node(X, G)]) }, del: [], base: { [KG]: rev(W2.DB, KG) }, why: { [KG]: 'TEST_ONLY import' },
      aud: [{ cid: 'cTESTONLYimp2', k: KG, etype: 'dataset', eid: KG, ename: KG, act: 'import', ctx: '', bef: '', aft: '' }] } });
    clean(r2, KG); onlyAbout(r2, [KG]);
    assert.equal(raw(W2.DB, KP), JSON.stringify(without(P0, X)));
  });
}

/* (c) the verified restore route (/api/backup/restore · 019d) on the shared restore fixture */
const { world: restoreWorld, ok } = await import('./atomic_restore_review_fx.mjs');
const { G1, G2, D1, D2 } = await import('./custody_review_fx.mjs');
const RX = 'TEST_ONLY_restored_node';
async function restoreCase() {
  const B = await restoreWorld(), DB = B.DB;
  const P0 = read(DB, KP); P0.caps[RX] = STALE.caps; P0.subs = { [RX]: STALE.subs }; P0.lenses = { [RX]: STALE.lenses }; P0.capOwn = { [RX]: true };
  put(DB, KP, P0);   /* the leftover of a node deleted before this fix: RX is not in the structure */
  const nodes = read(DB, KG); assert.ok(!nodes.some((n) => n.id === RX));
  return { B, DB, P0, nodes, withRX: JSON.stringify(nodes.concat([{ id: RX, name: 'TEST_ONLY restored node', kind: 'إدارة عامة' }])) };
}
test('(c) a full restore that brings its own registry keeps it verbatim — also for the node it brings back', async () => {
  const { B, DB, P0, withRX } = await restoreCase();
  const mine = J(P0); mine.caps[RX] = ['tasks', 'admin']; delete mine.subs[RX]; delete mine.lenses[RX]; delete mine.capOwn[RX];   /* the copy's own ceiling for RX */
  ok(await B.restore(await B.body({ keys: { [KG]: withRX, [KP]: JSON.stringify(mine) } })));
  assert.ok(read(DB, KG).some((n) => n.id === RX), 'the node is back');
  assert.deepEqual(read(DB, KP), mine, 'the registry is the copy\'s — not the stored leftover, and nothing of it removed');
  /* a copy whose record equals the stored one is still the copy's own registry: kept */
  const C2 = await restoreCase();
  ok(await C2.B.restore(await C2.B.body({ keys: { [KG]: C2.withRX } })));   /* the fixture's copy = the stored registry */
  assert.deepEqual(read(C2.DB, KP), C2.P0);
});
test('(c) a restore that brings the structure without a registry does not revive a stored leftover', async () => {
  const { B, DB, P0, withRX } = await restoreCase();
  const body = await B.body({ keys: { [KG]: withRX } });
  delete body.keys[KP]; body.manifest.keys = Object.keys(body.keys);
  ok(await B.restore(body));
  assert.ok(read(DB, KG).some((n) => n.id === RX), 'the node is back');
  assert.deepEqual(holds(read(DB, KP), RX), [], 'without the stale ceiling');
  assert.deepEqual(read(DB, KP), without(P0, RX), 'everything else is as stored');
  assert.ok([G1, G2].every((g) => read(DB, KP).caps[g]) && [D1, D2].every((d) => read(DB, KP).caps[d]), 'the other units keep their ceilings');
});
