/* Cloud image service against the actual Worker in local SQLite; synthetic bytes only. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { makeTestEnv, client, TEST_SUPER_USERNAME, TEST_SUPER_PIN } from './harness.mjs';

const source = fs.readFileSync(new URL('../../src/services/360-bassam-idb.js', import.meta.url), 'utf8');
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

test('image service single/multipart ACK, cloud readback and backup inventory match the canonical Worker', async () => {
  const env = makeTestEnv({}), C = client(env);
  const login = await C.login(TEST_SUPER_USERNAME, TEST_SUPER_PIN);
  assert.ok(login.ok);
  const calls = [], W = { KIVO: {}, __BS_BOOT: { srv: 1, cf: 1 }, Map, Set, Promise, console, setTimeout, clearTimeout,
    indexedDB: { open() { assert.fail('No device database may be used'); } },
    fetch: async (url, options = {}) => {
      calls.push({ url, method: options.method || 'GET' });
      return C.req(url, { cookie: login.ck, method: options.method || 'GET', headers: options.headers, body: options.body });
    } };
  W.window = W; vm.runInNewContext(source, W);
  const images = { img_testonly_single: png, img_testonly_multipart: 'data:image/png;base64,' + 'A'.repeat(400 * 1024 + 12) };
  for (const [key, value] of Object.entries(images)) assert.equal(await W.KIVO.BassamIDB.set(key, value), true);
  assert.equal(calls.filter(call => call.method === 'PUT').length, 3);
  W.KIVO.BassamImgCache.clear();
  for (const [key, value] of Object.entries(images)) {
    assert.equal(await W.KIVO.BassamIDB.get(key), value, 'Server bytes must survive cache clearing');
    const info = await W.KIVO.BassamIDB.getInfo(key);
    assert.equal(info.ok, true); assert.equal(info.v, value);
  }
  const archive = await W.KIVO.BassamIDB.allForBackup();
  for (const [key, value] of Object.entries(images)) assert.equal(archive[key], value);
  assert.equal((await W.KIVO.BassamImgVerify(images)).ok, true);
  await C.api('/api/logout', { cookie: login.ck, method: 'POST', body: {} });
  W.KIVO.BassamImgCache.clear();
  await assert.rejects(W.KIVO.BassamIDB.allForBackup(), /401/);
  assert.equal(await W.KIVO.BassamIDB.get('img_testonly_single'), null);
});
