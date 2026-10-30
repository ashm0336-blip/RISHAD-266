/* Synthetic fixture clocks must not weaken the production SQL expiry fence. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTestEnv, client } from './harness.mjs';

for (const offset of [-10 * 86400000, 10 * 86400000])
  test('synthetic upgrade permit exceeds both clocks when Date.now is shifted by ' + offset, async () => {
    const realNow = Date.now, fakeNow = realNow() + offset;
    let env;
    try {
      Date.now = () => fakeNow;
      env = makeTestEnv();
    } finally {
      Date.now = realNow;
    }
    const permit = JSON.parse(env.DB.q("SELECT v FROM meta WHERE k='schema_upgrade_permit_v1'")[0].v),
      sqlNow = Number(env.DB.q("SELECT CAST(strftime('%s','now') AS INTEGER)*1000 AS now")[0].now);
    assert.ok(Number.isSafeInteger(permit.expiresAt));
    assert.ok(permit.expiresAt > fakeNow);
    assert.ok(permit.expiresAt > sqlNow);
    assert.equal((await client(env).api('/api/ping')).status, 200, 'The actual Worker SQL expiry fence accepts the synthetic fixture');
    assert.equal(env.DB.q("SELECT COUNT(*) n FROM meta WHERE k='schema_upgrade_permit_v1'")[0].n, 0);
  });
