import { test } from 'node:test';
import assert from 'node:assert/strict';
import { D1Shim } from './harness.mjs';

test('D1 batch exposes INSERT/UPDATE RETURNING rows and write metadata', async () => {
  const db = new D1Shim();
  db.exec('CREATE TABLE example(k TEXT PRIMARY KEY,v INTEGER)');
  const before = db.trips;
  const rows = await db.batch([
    db.prepare('INSERT INTO example(k,v) VALUES(?1,?2) RETURNING k,v').bind('TEST_ONLY', 1),
    db.prepare('UPDATE example SET v=v+1 WHERE k=?1 RETURNING v').bind('TEST_ONLY'),
    db.prepare('SELECT v FROM example WHERE k=?1').bind('TEST_ONLY'),
  ]);
  assert.deepEqual(rows.map(row => JSON.parse(JSON.stringify(row.results))), [[{ k:'TEST_ONLY',v:1 }],[{ v:2 }],[{ v:2 }]]);
  assert.deepEqual(rows.map(row => row.meta.changes), [1,1,0]);
  assert.equal(db.trips-before,1);
});

test('D1 batch executes non-row DML once even when RETURNING is only literal data', async () => {
  const db = new D1Shim(); db.exec('CREATE TABLE example(v TEXT)');
  const rows = await db.batch([db.prepare("INSERT INTO example(v) VALUES('RETURNING')"),db.prepare('SELECT COUNT(*) AS n FROM example')]);
  assert.deepEqual(rows[0].results,[]); assert.equal(rows[0].meta.changes,1);
  assert.equal(rows[1].results[0].n,1);
});

test('a later batch failure rolls back a DML statement that already produced RETURNING rows', async () => {
  const db = new D1Shim(); db.exec('CREATE TABLE example(k TEXT PRIMARY KEY,v INTEGER)');
  db.failIf = sql => /TEST_ONLY_FAILURE/.test(sql);
  await assert.rejects(db.batch([db.prepare("INSERT INTO example(k,v) VALUES('TEST_ONLY',1) RETURNING v"),db.prepare('SELECT 1 AS TEST_ONLY_FAILURE')]),/injected failure/);
  assert.equal(db.q('SELECT COUNT(*) AS n FROM example')[0].n,0);
});
