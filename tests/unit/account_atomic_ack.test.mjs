/* Synthetic accounts only. Actual canonical Worker/SQLite and the actual 280
   queue; no credentials, network, grant changes or replacement ACK parser. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, IDS, copy } from './custody_review_fx.mjs';
import { installOperationalFixture } from './operational_legacy_seed_fx.mjs';
import { loadClient, sleep, until } from './k264_vm.mjs';

const USERS = 'bassam_auth_users_v1', PERMS = 'bassam_perms_v1';
const json = value => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

test('HTTP accepted credential-redacted user no-op acknowledges its current revision without another write', async () => {
  const B = await world();
  await installOperationalFixture(B.env, B.W);
  const get = await B.api('super', '/api/get?keys=' + USERS);
  assert.equal(get.status, 200); assert.equal(get.json.ok, 1);
  const row = get.json.keys[USERS], incoming = JSON.parse(row.v);
  assert.ok(incoming.length > 1); assert.ok(incoming.every(user => !user.ph));
  // The synthetic fixture writes literal users before the API's ordinary merge
  // canonicalizes field order. Settle that first save, then retry its same data.
  const first = await B.api('super', '/api/save', { method: 'POST', body: {
    uid: IDS.super, set: { [USERS]: row.v }, del: [], base: { [USERS]: row.rev },
  } });
  assert.equal(first.status, 200); assert.equal(first.json.ok, 1);
  assert.ok(own(first.json.revs, USERS)); row.rev = first.json.revs[USERS];
  const before = copy({
    users: B.DB.q('SELECT * FROM kv WHERE k=?1 ORDER BY seq', USERS),
    permissions: B.DB.q('SELECT * FROM kv WHERE k=?1 ORDER BY seq', PERMS),
    meta: B.DB.q('SELECT * FROM meta ORDER BY k'),
    revisions: B.DB.q('SELECT * FROM revs ORDER BY k'),
    sessions: B.DB.q('SELECT * FROM sess ORDER BY tok'),
    audit: B.DB.q('SELECT * FROM aud ORDER BY rowid'),
    security: B.DB.q('SELECT * FROM sec ORDER BY rowid'),
  });
  const body = { uid: IDS.super, set: { [USERS]: row.v }, del: [], base: { [USERS]: row.rev } };
  const response = await B.api('super', '/api/save', { method: 'POST', body });
  assert.equal(response.status, 200); assert.equal(response.json.ok, 1);
  assert.equal(Array.isArray(response.json.denied), false); assert.equal(Array.isArray(response.json.conflicts), false);
  assert.deepEqual(response.json.denied, {}); assert.deepEqual(response.json.conflicts, {});
  assert.equal(own(response.json.revs, USERS), true, 'A validated no-op still settles its requested key');
  assert.equal(response.json.revs[USERS], row.rev);
  assert.deepEqual({
    users: copy(B.DB.q('SELECT * FROM kv WHERE k=?1 ORDER BY seq', USERS)),
    permissions: copy(B.DB.q('SELECT * FROM kv WHERE k=?1 ORDER BY seq', PERMS)),
    meta: copy(B.DB.q('SELECT * FROM meta ORDER BY k')),
    revisions: copy(B.DB.q('SELECT * FROM revs ORDER BY k')),
    sessions: copy(B.DB.q('SELECT * FROM sess ORDER BY tok')),
    audit: copy(B.DB.q('SELECT * FROM aud ORDER BY rowid')),
    security: copy(B.DB.q('SELECT * FROM sec ORDER BY rowid')),
  }, before);
});

function queue(t, response) {
  const requests = [];
  const T = loadClient({
    boot: { srv: 1, cf: 1, uid: 'TEST_ONLY_ACK_owner', v: 4,
      keys: { [USERS]: '[]', [PERMS]: '{}' }, revs: { [USERS]: 3, [PERMS]: 3 } },
    C: { req: async (route, options = {}) => {
      if (route === '/api/save') {
        const body = JSON.parse(options.body); requests.push(body);
        return json(response(body, requests.length));
      }
      return json({ v: 4, keys: [] });
    } },
  });
  T.W.document.hidden = true;
  t.after(() => T.dispose());
  return { T, requests, api: T.W.KIVO.__BS_SRV };
}

test('the actual queue settles successful atomic metadata keys once instead of replaying them', async t => {
  const f = queue(t, body => ({ ok: 1, v: 5, atomic: 'custody-transition',
    revs: Object.fromEntries(Object.keys(body.set).map(key => [key, 5])), denied: {}, conflicts: {} }));
  f.T.set(USERS, '[{"id":"TEST_ONLY account"}]');
  assert.equal(await f.api.flushAsync(350), true);
  await sleep(220);
  assert.equal(f.requests.length, 1); assert.equal(f.api.dirty(), false);
  assert.deepEqual(f.T.nativeLS(), {}, 'Acknowledged account metadata stays off native storage');
});

test('an atomic denial still retries only its untouched sibling, never the denied key', async t => {
  const f = queue(t, (body, count) => count === 1
    ? { ok: 1, v: 4, atomic: 'protected', revs: {}, denied: { [USERS]: { why: 'flag', cur: '[]', rev: 3 } }, conflicts: {} }
    : { ok: 1, v: 5, atomic: 'custody-transition', revs: { [PERMS]: 5 }, denied: {}, conflicts: {} });
  f.T.set(USERS, '[{"id":"TEST_ONLY rejected"}]'); f.T.set(PERMS, '{"TEST_ONLY":true}');
  assert.equal(await f.api.flushAsync(650), false, 'The rejected first batch is not reported as a successful save');
  assert.equal(await until(() => !f.api.dirty(), 650, 10), true);
  assert.equal(f.requests.length, 2);
  assert.deepEqual(Object.keys(f.requests[0].set).sort(), [PERMS, USERS].sort());
  assert.deepEqual(Object.keys(f.requests[1].set), [PERMS]);
  assert.equal(f.T.get(USERS), '[]'); assert.equal(f.api.dirty(), false);
});

test('an empty atomic acknowledgement remains invalid rather than reporting an unconfirmed save', async t => {
  const f = queue(t, () => ({ ok: 1, v: 4, atomic: 'custody-transition', revs: {}, denied: {}, conflicts: {} }));
  f.T.set(USERS, '[{"id":"TEST_ONLY unconfirmed"}]');
  assert.equal(await f.api.flushAsync(150), false);
  assert.equal(f.requests.length, 1); assert.equal(f.api.dirty(), true);
});
