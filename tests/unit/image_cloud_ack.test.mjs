/* Real image transport contract; no browser database is an operational fallback. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../../src/services/360-bassam-idb.js', import.meta.url), 'utf8');
const image = 'data:image/png;base64,TEST_ONLY';
const response = (value, status = 200) => ({ ok: status === 200, status, json: async () => value, text: async () => String(value) });
function browser(handler, boot = { srv: 1, cf: 1 }) {
  const calls = [], local = [], KIVO = {};
  const W = { KIVO, __BS_BOOT: boot, Map, Set, Promise, console,
    indexedDB: { open(...args) { local.push(args); throw new Error('Local database must not be opened'); } },
    fetch: async (url, options = {}) => { calls.push({ url, options }); return handler(url, options); },
    setTimeout: fn => { fn(); return 0; }, clearTimeout() {} };
  W.window = W; vm.runInNewContext(source, W);
  return { W, api: KIVO.BassamIDB, calls, local };
}

test('image upload rejects malformed, negative, incomplete and incorrect ACKs without caching success', async () => {
  for (const invalid of [null, {}, { ok: 0, n: image.length }, { ok: 1 }, { ok: 1, n: String(image.length) }, { ok: 1, n: image.length - 1 }]) {
    const B = browser(async () => response(invalid));
    await assert.rejects(B.api.set('img_testonly_ack', image));
    assert.equal(B.W.KIVO.BassamImgCache.has('img_testonly_ack'), false);
  }
  const B = browser(async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('TEST_ONLY non-JSON response'); } }));
  await assert.rejects(B.api.set('img_testonly_ack', image));
});

test('multipart upload validates every part and never sends a following part after an invalid ACK', async () => {
  const large = 'data:image/png;base64,' + 'A'.repeat(400 * 1024 + 10);
  for (const invalid of [{ ok: 1 }, { ok: 0, part: 0, of: 2 }, { ok: 1, part: 1, of: 2 }, { ok: 1, part: 0, of: 3 }]) {
    const B = browser(async () => response(invalid));
    await assert.rejects(B.api.set('img_testonly_parts', large));
    assert.equal(B.calls.length, 1);
  }
  const B = browser(async url => response(url.includes('?p=0') ? { ok: 1, part: 0, of: 2 } : { ok: 1, n: large.length, parts: 3 }));
  await assert.rejects(B.api.set('img_testonly_parts', large));
  assert.equal(B.W.KIVO.BassamImgCache.has('img_testonly_parts'), false);
});

test('valid single and multipart cloud ACKs cache the stored image after final confirmation', async () => {
  const single = browser(async () => response({ ok: 1, n: image.length }));
  assert.equal(await single.api.set('img_testonly_single', image), true);
  assert.equal(await single.api.get('img_testonly_single'), image);
  assert.equal(single.calls.length, 1);
  const large = 'data:image/png;base64,' + 'A'.repeat(400 * 1024 + 10);
  const multi = browser(async url => response(url.includes('?p=0') ? { ok: 1, part: 0, of: 2 } : { ok: 1, n: large.length, parts: 2 }));
  assert.equal(await multi.api.set('img_testonly_multi', large), true);
  assert.equal(await multi.api.get('img_testonly_multi'), large);
  assert.equal(multi.calls.length, 2);
});

test('missing cloud bootstrap cannot open a device image or task database or claim successful verification', async () => {
  const B = browser(async () => { throw new TypeError('TEST_ONLY offline'); }, null);
  await assert.rejects(B.api.set('img_testonly_offline', image));
  assert.equal(B.api.getInfo ? (await B.api.getInfo('img_testonly_offline')).ok : true, false);
  const verified = await B.W.KIVO.BassamImgVerify({ img_testonly_offline: image });
  assert.equal(verified.ok, false);
  assert.deepEqual(B.local, []);
  assert.equal(B.W.KIVO.BassamLocalKV, undefined, 'Retired task store must have no active implementation');
});

test('bulk image upload reports a malformed ACK as a failed image', async () => {
  const B = browser(async () => response({ ok: 1 }));
  const result = await B.W.KIVO.BassamImgPut({ img_testonly_bulk: image });
  assert.equal(result.ok, false);
  assert.equal(result.done, 0);
  assert.equal(result.failed.length, 1);
});

test('image inventory errors cannot become an empty successful backup', async () => {
  for (const handler of [
    async () => response({}, 401), async () => response({}, 503),
    async () => { throw new TypeError('TEST_ONLY network failure'); },
    async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('TEST_ONLY malformed JSON'); } }),
    ...[null, [], { ok: 0, err: 'TEST_ONLY' }, { img_testonly_invalid: 1 }].map(value => async () => response(value)),
  ]) {
    const B = browser(handler);
    await assert.rejects(B.api.allForBackup(), 'An incomplete backup must not appear successful');
  }
  assert.deepEqual(Object.keys(await browser(async () => response({})).api.allForBackup()), []);
  const B = browser(async url => response(url.includes('/api/imgs?') ? { img_testonly_backup: '' } : image));
  assert.equal((await B.api.allForBackup()).img_testonly_backup, image);
});

test('pending image reads cannot expose bytes or refill memory after the session cache is cleared', async () => {
  for (const method of ['get', 'getInfo']) {
    const pending = [];
    const B = browser(() => new Promise(resolve => pending.push(resolve)));
    const old = B.api[method]('img_testonly_session');
    B.W.KIVO.BassamImgCache.clear();
    const current = B.api[method]('img_testonly_session');
    pending[0](response(image));
    const result = await old;
    assert.equal(method === 'get' ? result : result.v, null);
    assert.equal(B.W.KIVO.BassamImgCache.has('img_testonly_session'), false);
    if (method === 'get') assert.equal(B.api.get('img_testonly_session'), current, 'An old completion must not remove a new pending read');
    pending[1](response(image));
    assert.equal(method === 'get' ? await current : (await current).v, image);
    assert.equal(B.W.KIVO.BassamImgCache.has('img_testonly_session'), true);
  }
});

test('an image upload interrupted by session cache clearing cannot become cached', async () => {
  let resolve;
  const B = browser(() => new Promise(done => { resolve = done; }));
  const uploading = B.api.set('img_testonly_oldsession', image);
  await Promise.resolve(); await Promise.resolve();
  assert.equal(typeof resolve, 'function');
  B.W.KIVO.BassamImgCache.clear();
  resolve(response({ ok: 1, n: image.length }));
  await assert.rejects(uploading);
  assert.equal(B.W.KIVO.BassamImgCache.has('img_testonly_oldsession'), false);
});
