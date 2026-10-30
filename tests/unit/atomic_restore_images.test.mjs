import { test } from 'node:test';
import assert from 'node:assert/strict';
import { world, ok, snap, OPTIONS } from './atomic_restore_review_fx.mjs';
import { D1, D2, IDS, EKEYS, copy } from './notifications_review_fx.mjs';
const ID = 'img_testonly_existing',
  BODY = 'data:image/png;base64,VEVTVF9PTkxZ',
  OTHER = 'data:image/png;base64,T1RIRVJfVEVTVA==';
let rid = 0;
async function seed(B, { r2 = false, owner = OPTIONS, state = 'bound', text = BODY } = {}) {
  await B.DB.batch([
    ...B.W.kvPutStmts(B.env, 'kv', OPTIONS, JSON.stringify({ map: ID, tag: 'TEST_ONLY before' })),
    ...B.W.kvPutStmts(B.env, 'imgs', ID, r2 ? '~r2~' : text),
    B.DB.prepare('INSERT INTO revs(k,rev) VALUES(?1,1) ON CONFLICT(k) DO UPDATE SET rev=1').bind(OPTIONS),
    B.DB.prepare('INSERT INTO imgown(img,st,k,uid,dept,ts) VALUES(?1,?2,?3,?4,?5,1)').bind(ID, state, owner, IDS.super, D1),
    B.DB.prepare('INSERT INTO imgref(img,k) VALUES(?1,?2)').bind(ID, owner),
  ]);
}
async function payload(B, images = { [ID]: BODY }, who = 'super', scope = { kind: 'full' }) {
  const request = await B.body({ scope, keys: { [OPTIONS]: JSON.stringify({ map: ID, tag: 'TEST_ONLY restored' }) } }),
    file = {
      app: 'bassam-crowd',
      version: 3,
      kind: scope.kind,
      data: scope.kind === 'full' ? request.keys : { bassam_options_v1: request.keys[OPTIONS] },
      domains: request.domains,
      manifest: request.manifest,
      idbImages: images,
    };
  return {
    version: 1,
    uid: IDS[who],
    requestId: 'TEST_ONLY_image_restore_' + ++rid,
    scope,
    mode: 'replace',
    reason: 'TEST_ONLY image restore reason',
    base: request.base,
    backup: file,
    phase: 'commit',
    legacyConsent: false,
  };
}
function readonlyR2(B, { missing = false, text = BODY } = {}) {
  const calls = [];
  B.env.IMG_R2 = {
    get: async (key) => {
      calls.push(['get', key]);
      return missing ? null : { text: async () => text };
    },
    put: async () => {
      calls.push(['put']);
      throw Error('TEST_ONLY forbidden R2 put');
    },
    delete: async () => {
      calls.push(['delete']);
      throw Error('TEST_ONLY forbidden R2 delete');
    },
    head: async () => {
      throw Error('TEST_ONLY unexpected head');
    },
    list: async () => {
      throw Error('TEST_ONLY unexpected list');
    },
  };
  return calls;
}

test('actual backup restore accepts an identical existing inline body without rewriting image bytes or mutating R2', async () => {
  const B = await world();
  await seed(B);
  const calls = readonlyR2(B),
    images = copy(B.DB.q('SELECT * FROM imgs')),
    ack = ok(await B.api('super', '/api/backup/restore', await payload(B)));
  assert.equal(ack.ok, 1);
  assert.equal(JSON.parse(B.DB.q('SELECT v FROM kv WHERE k=?1', OPTIONS)[0].v).tag, 'TEST_ONLY restored');
  assert.deepEqual(copy(B.DB.q('SELECT * FROM imgs')), images);
  assert.deepEqual(calls, []);
});

test('an existing R2 reference is read-only matched and ACK identifies reuse, leaving object bytes current', async () => {
  const B = await world();
  await seed(B, { r2: true });
  const calls = readonlyR2(B),
    beforeImages = copy(B.DB.q('SELECT * FROM imgs')),
    ack = ok(await B.api('super', '/api/backup/restore', await payload(B)));
  assert.equal(ack.imagesReused, 1);
  assert.equal(Object.hasOwn(ack, 'imagesRestored'), false);
  assert.deepEqual(calls, [['get', 'img/' + ID]]);
  assert.deepEqual(copy(B.DB.q('SELECT * FROM imgs')), beforeImages);
});

test('unknown, unreferenced, pending, unstable, missing or different image bodies reject the whole restore without revealing body/ID', async () => {
  for (const scenario of ['new', 'unreferenced', 'claim', 'orphan', 'amb', 'staged', 'inline-mismatch', 'R2-mismatch', 'R2-missing']) {
    const B = await world(),
      r2 = scenario.startsWith('R2');
    await seed(B, { r2, state: ['claim', 'orphan', 'amb'].includes(scenario) ? scenario : 'bound' });
    if (scenario === 'staged') await B.DB.batch(B.W.kvPutStmts(B.env, 'imgs', '~stg~' + ID + '~0', BODY));
    const calls = readonlyR2(B, { missing: scenario === 'R2-missing', text: scenario === 'R2-mismatch' ? OTHER : BODY }),
      body = await payload(B, { [ID]: scenario === 'inline-mismatch' ? OTHER : BODY });
    if (scenario === 'new') {
      const key = 'img_testonly_new';
      body.backup.idbImages = { [key]: BODY };
      body.backup.data[OPTIONS] = JSON.stringify({ map: key });
    }
    if (scenario === 'unreferenced') body.backup.data[OPTIONS] = '{}';
    const before = snap(B.DB),
      response = await B.api('super', '/api/backup/restore', body);
    assert.equal(response.status, 409, scenario + ':' + JSON.stringify(response.json));
    assert.equal(response.json.err, 'backup-image-reuse-rejected');
    assert.equal(JSON.stringify(response.json).includes(ID), false);
    assert.equal(JSON.stringify(response.json).includes(BODY), false);
    assert.deepEqual(snap(B.DB), before);
    assert.equal(
      calls.some((c) => ['put', 'delete'].includes(c[0])),
      false,
    );
    if (!scenario.startsWith('R2')) assert.equal(calls.length, 0);
  }
});

test('foreign ownership and images absent from the final department scope are denied before R2.get', async () => {
  const B = await world(),
    foreign = 'bsdept:' + D2 + ':bassam_options_v1';
  await seed(B, { r2: true, owner: foreign });
  await B.DB.batch(
    B.W.kvPutStmts(
      B.env,
      'kv',
      'bsdept:' + D1 + ':bassam_grants_v1',
      JSON.stringify({ v: 1, emp: { [EKEYS.manager1]: { plus: ['backup.restore'], minus: [] } } }),
    ),
  );
  const calls = readonlyR2(B),
    body = await payload(B, { [ID]: BODY }, 'manager1', { kind: 'dept', departmentId: D1 });
  body.mode = 'merge';
  const before = snap(B.DB),
    response = await B.api('manager1', '/api/backup/restore', body);
  assert.equal(response.status, 409, JSON.stringify(response.json));
  assert.equal(response.json.err, 'backup-image-reuse-rejected');
  assert.deepEqual(calls, []);
  assert.deepEqual(snap(B.DB), before);
});

test('an image metadata/body/staged-upload race rolls back all domains in the final restore transaction', async () => {
  for (const change of ['owner', 'inline-body', 'staged']) {
    const B = await world();
    await seed(B);
    const body = await payload(B),
      batch = B.DB.batch.bind(B.DB);
    let injected = false,
      concurrent;
    B.DB.batch = async (st) => {
      if (!injected && st.some((s) => /^INSERT INTO restore_operations/.test(s.sql))) {
        injected = true;
        if (change === 'owner') await batch([B.DB.prepare("UPDATE imgown SET st='claim' WHERE img=?1").bind(ID)]);
        if (change === 'inline-body') await batch(B.W.kvPutStmts(B.env, 'imgs', ID, OTHER));
        if (change === 'staged') await batch(B.W.kvPutStmts(B.env, 'imgs', '~stg~' + ID + '~0', BODY));
        concurrent = snap(B.DB);
      }
      return batch(st);
    };
    const response = await B.api('super', '/api/backup/restore', body);
    B.DB.batch = batch;
    assert.equal(injected, true);
    assert.equal(response.status, 409);
    assert.deepEqual(snap(B.DB), concurrent);
    assert.equal(B.DB.q('SELECT COUNT(*) n FROM restore_operations')[0].n, 0);
  }
});

test('a late R2 object update remains current because restore only reuses a validated reference, never restores object bytes', async () => {
  const B = await world();
  await seed(B, { r2: true });
  let current = BODY;
  const calls = [];
  B.env.IMG_R2 = {
    put: async () => {
      throw Error('TEST_ONLY forbidden put');
    },
    delete: async () => {
      throw Error('TEST_ONLY forbidden delete');
    },
    get: async (key) => {
      calls.push(key);
      const validated = current;
      current = OTHER;
      return { text: async () => validated };
    },
  };
  const ack = ok(await B.api('super', '/api/backup/restore', await payload(B)));
  assert.equal(ack.imagesReused, 1);
  assert.equal(Object.hasOwn(ack, 'imagesRestored'), false);
  assert.equal(current, OTHER);
  assert.deepEqual(calls, ['img/' + ID]);
  assert.equal(B.DB.q('SELECT v FROM imgs WHERE k=?1', ID)[0].v, '~r2~');
});

test('a failure late in the business batch rolls back the restore after read-only R2 matching', async () => {
  const B = await world();
  await seed(B, { r2: true });
  const calls = readonlyR2(B),
    body = await payload(B),
    before = snap(B.DB);
  B.DB.failIf = (sql) => /^INSERT INTO restore_operations/.test(sql);
  const response = await B.api('super', '/api/backup/restore', body);
  B.DB.failIf = null;
  assert.equal(response.status, 500);
  assert.deepEqual(snap(B.DB), before);
  assert.deepEqual(calls, [['get', 'img/' + ID]]);
});

test('a late reference or R2-marker change rejects the SQL transaction while preserving the concurrent value', async () => {
  for (const scenario of ['ref', 'R2-marker']) {
    const B = await world();
    await seed(B, { r2: true });
    const calls = readonlyR2(B),
      body = await payload(B),
      batch = B.DB.batch.bind(B.DB);
    let injected = false,
      after;
    B.DB.batch = async (st) => {
      if (!injected && st.some((s) => /^INSERT INTO restore_operations/.test(s.sql))) {
        injected = true;
        if (scenario === 'ref')
          await batch([B.DB.prepare('INSERT INTO imgref(img,k) VALUES(?1,?2)').bind(ID, 'bsdept:' + D2 + ':bassam_options_v1')]);
        else await batch(B.W.kvPutStmts(B.env, 'imgs', ID, OTHER));
        after = snap(B.DB);
      }
      return batch(st);
    };
    const response = await B.api('super', '/api/backup/restore', body);
    B.DB.batch = batch;
    assert.equal(injected, true);
    assert.equal(response.status, 409);
    assert.deepEqual(snap(B.DB), after);
    assert.deepEqual(calls, [['get', 'img/' + ID]]);
  }
});

test('a legacy multipart inline body is matched exactly with bounded witnesses and zero image writes', async () => {
  const B = await world(),
    large = 'data:image/png;base64,' + 'A'.repeat(700004);
  await seed(B, { text: large });
  assert.equal(B.DB.q('SELECT COUNT(*) n FROM imgs WHERE k=?1', ID)[0].n, 2);
  const calls = readonlyR2(B),
    body = await payload(B, { [ID]: large }),
    before = copy(B.DB.q('SELECT * FROM imgs')),
    batch = B.DB.batch.bind(B.DB);
  let maxBound = 0;
  B.DB.batch = async (st) => {
    for (const s of st) for (const arg of s.args || []) if (typeof arg === 'string') maxBound = Math.max(maxBound, Buffer.byteLength(arg));
    return batch(st);
  };
  const ack = ok(await B.api('super', '/api/backup/restore', body));
  B.DB.batch = batch;
  assert.equal(ack.imagesReused, 1);
  assert.ok(maxBound <= 500000);
  assert.deepEqual(copy(B.DB.q('SELECT * FROM imgs')), before);
  assert.deepEqual(calls, []);
});
