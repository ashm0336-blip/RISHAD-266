import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { pbkdf2Sync } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { makeSql, validAdminPin, createPassword, USER_KEY } from '../../tools/provision_first_admin.mjs';
const ROOT = path.resolve(import.meta.dirname, '../..');
const PW = '583927';
function emptyDb() { const db = new DatabaseSync(':memory:'); db.exec(fs.readFileSync(path.join(ROOT, 'migrations/0001_baseline.sql'), 'utf8')); return db; }

test('first admin must be explicitly provisioned; password is salted PBKDF2, no plaintext', () => {
  const db = emptyDb();
  assert.equal(db.prepare('SELECT count(*) AS n FROM kv').get().n, 0);
  const sql = makeSql({ username: '0501234567', name: 'System Administrator', password: PW, salt: Buffer.alloc(16, 7) });
  assert.doesNotMatch(sql, /583927/);
  assert.doesNotMatch(sql, /admin\/admin/);
  db.exec(sql);
  const rows = db.prepare('SELECT v FROM kv WHERE k=?').all(USER_KEY);
  assert.equal(rows.length, 1);
  const users = JSON.parse(rows[0].v);
  assert.equal(users.length, 1); assert.equal(users[0].role, 'super'); assert.equal(users[0].mc, 0);
  const parts = users[0].ph.split('$');
  assert.equal(parts[0], 'p2'); assert.equal(Number(parts[1]), 100000);
  assert.equal(pbkdf2Sync(PW, Buffer.from(parts[2], 'hex'), 100000, 32, 'sha256').toString('hex'), parts[3]);
  assert.equal(db.prepare('SELECT rev FROM revs WHERE k=?').get(USER_KEY).rev, 1);
  assert.throws(() => db.exec(sql), /UNIQUE constraint failed/);
  assert.equal(db.prepare('SELECT count(*) AS n FROM kv').get().n, 1);
});

test('secure account initialization follows the existing six-digit numeric PIN policy', () => {
  assert.equal(validAdminPin('123456'), false);
  assert.equal(validAdminPin('onlylowercase123'), false);
  assert.equal(validAdminPin(PW), true);
  for (const username of ['admin', '555', '05012345678', '05A1234567'])
    assert.throws(() => makeSql({ username, name:'Admin', password:PW }), /username/);
  assert.throws(() => makeSql({ username:'0501234567', name:'Admin', password:'123456' }), /PIN/);
  for (let i = 0; i < 5; i++) assert.equal(validAdminPin(createPassword()), true);
});
