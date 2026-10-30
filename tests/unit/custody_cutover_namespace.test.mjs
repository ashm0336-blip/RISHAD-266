/* A malformed legacy namespace must never be reassigned to a real department. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { legacyWorld, D1, copy } from './custody_review_fx.mjs';

const state = DB => ({
  schema: copy(DB.q("SELECT type,name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name")),
  kv: copy(DB.q('SELECT k,seq,v FROM kv ORDER BY k,seq')),
  meta: copy(DB.q('SELECT k,v FROM meta ORDER BY k')),
  revs: copy(DB.q('SELECT k,rev FROM revs ORDER BY k')),
  migrations: copy(DB.q('SELECT * FROM d1_migrations ORDER BY id')),
});

for (const suffix of [':unexpected', ':'])
  test('custody cutover rejects extra namespace segments before DDL: ' + JSON.stringify(suffix), async () => {
    const B = await legacyWorld(),
      malformed = 'bsdept:' + D1 + suffix + ':bassam_custody_v1',
      valid = 'bsdept:' + D1 + ':bassam_custody_v1',
      doc = { items: [{ name: 'TEST_ONLY namespace item', qty: 1 }], moves: [] };
    await B.DB.batch([
      ...B.W.kvPutStmts(B.env, 'kv', malformed, JSON.stringify(doc)),
      ...B.W.kvPutStmts(B.env, 'kv', valid, JSON.stringify({ items: [], moves: [] })),
    ]);
    const before = state(B.DB);
    await assert.rejects(B.W.initDb(B.env), /custody-cutover-scope-unknown/);
    assert.deepEqual(state(B.DB), before, 'No source, identity, revision, migration stamp or schema changes');
    assert.equal(B.DB.q("SELECT COUNT(*) n FROM sqlite_master WHERE name GLOB 'custody_*'")[0].n, 0);
  });

test('a canonical custody namespace still migrates under its own resource revision', async () => {
  const B = await legacyWorld(),
    key = 'bsdept:' + D1 + ':bassam_custody_v1';
  await B.DB.batch(B.W.kvPutStmts(B.env, 'kv', key, JSON.stringify({ items: [{ name: 'TEST_ONLY canonical item', qty: 1 }], moves: [] })));
  await B.W.initDb(B.env);
  assert.deepEqual(copy(B.DB.q('SELECT department_id,name FROM custody_items')), [{ department_id: D1, name: 'TEST_ONLY canonical item' }]);
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM kv WHERE k=?1', key)[0].n, 0);
  assert.ok((await B.W.cuRev(B.env, D1)) > 0);
});
