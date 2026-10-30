import test from 'node:test';
import assert from 'node:assert/strict';
import { FakeStorage, loadClient, sleep, until } from './k264_vm.mjs';

const E = 'bsdept:dA:bassam_employees_v1';
const S = 'bsdept:dA:bassam_staffing_v3';
const L = 'bsdept:dA:bassam_staffing_locks_v1';
const UID = 'TEST_ONLY owner';
const copy = value => JSON.parse(JSON.stringify(value));
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const initial = { [E]: [{ eid: 'TEST_ONLY e1', name: 'TEST_ONLY employee' }], [S]: { '1448-5': {} } };
test('Operations explains only the confirmed structured denial with the existing named reason mapper and no IO', async () => {
  for (const [why, expected] of [['task-asg', /لا يُغيَّر مكلَّفُها بالتعديل؛ استعمل «إعادة إسناد»/], ['task-acct', /حسابُ مستخدمٍ نشطٌ مربوطٌ بالمعرّف الذي يُسند به/], ['task-rv', /المراجِعُ لا يكون المكلَّفَ نفسَه/]]) {
    const f = world({ save: raw => { const body = JSON.parse(raw); return json({ ok: 0, requestId: body.requestId, epoch: body.epoch, atomic: 1, revs: {}, denied: { [E]: { why } }, conflicts: {} }, 403); } });
    try {
      await f.operations.read([E]); const result = await f.operations.flush(f.operations.stage({ set: { [E]: [] } }));
      assert.equal(result.ok, 0); assert.equal(result.uncertain, false); const count = f.T.urls.length;
      assert.match(f.operations.explain(result), expected); assert.equal(f.T.urls.length, count, 'Explanation must not retrieve additional data');
      assert.equal(f.operations.explain({ details: { conflicts: { [E]: { why: 'task-asg' } } } }), '');
      assert.equal(f.operations.explain(null), '');
    } finally { f.T.dispose(); }
  }
});
function ack(body) {
  const request = JSON.parse(body);
  return { ok: 1, requestId: request.requestId, epoch: request.epoch, atomic: 1,
    revs: Object.fromEntries([...Object.keys(request.set), ...request.del].map(key => [key, 8])) };
}
function world({ read, save, native } = {}) {
  const documents = copy(initial), seen = [], values = { dept: 'dA', uid: UID };
  const C = { req: async (route, options = {}) => {
    if (route.startsWith('/api/operations/read?')) {
      const keys = new URL(route, 'http://x').searchParams.get('keys').split(',');
      const value = { ok: 1, uid: UID, epoch: 3, v: 7, resources: {}, absent: [], denied: [], base: {} };
      for (const key of keys) {
        if (Object.hasOwn(documents, key)) value.resources[key] = copy(documents[key]);
        else value.absent.push(key);
        value.base[key] = 4;
      }
      return read ? read(value, keys) : json(value);
    }
    if (route === '/api/save') {
      seen.push(options.body);
      return save ? save(options.body, documents, seen) : json(ack(options.body));
    }
    return json({ v: 1, keys: [] });
  } };
  const T = loadClient({ C, native, boot: { srv: 1, cf: 1, uid: UID, v: 1,
    keys: { [E]: '[{"name":"TEST_ONLY stale bootstrap"}]' }, revs: { [E]: 900 } } });
  T.W.document.hidden = true;
  T.W.KIVO.BassamAuth = { user: () => ({ id: values.uid, role: 'dept', deptId: values.dept }) };
  T.W.KIVO.BassamDepts = { active: () => values.dept };
  return { T, operations: T.W.KIVO.__BS_SRV.operations, seen, documents, values };
}

test('Operations read uses SQL DTO/absence, never stale bootstrap or native business bytes', async () => {
  const native = new FakeStorage(); native.setItem(E, 'TEST_ONLY quarantined');
  const f = world({ native });
  try {
    const API = f.operations;
    assert.ok(API && Object.isFrozen(API));
    assert.equal(f.T.get(E), null);
    assert.equal(f.T.W.KIVO.__BS_SRV.rev(E), 0);
    assert.throws(() => API.value(E), /operations-read-required/);
    const result = await API.read([E, S, L]);
    assert.equal(result.ok, 1);
    assert.deepEqual(copy(API.value(E)), initial[E]);
    assert.equal(API.value(L), null);
    const view = API.value(E); view[0].name = 'TEST_ONLY mutation';
    assert.deepEqual(copy(API.value(E)), initial[E]);
    assert.throws(() => f.T.set(E, '[]'), /relational-domain-api-required/);
    assert.deepEqual(f.T.nativeLS(), { [E]: 'TEST_ONLY quarantined' });
    assert.equal(f.seen.length, 0);
  } finally { f.T.dispose(); }
});

test('read results cover every requested key exactly once; partial denied cannot retain an old confirmed value', async () => {
  let deny = false;
  const f = world({ read: value => {
    if (deny) { delete value.resources[E]; delete value.base[E]; value.denied.push(E); }
    return json(value);
  } });
  try {
    assert.equal((await f.operations.read([E, S])).ok, 1);
    deny = true;
    const result = await f.operations.read([E, S, L]);
    assert.equal(result.ok, 1);
    assert.deepEqual(copy(result.denied), [E]);
    assert.throws(() => f.operations.value(E), /operations-read-required/);
    assert.deepEqual(copy(f.operations.value(S)), initial[S]);
    assert.equal(f.operations.value(L), null);
  } finally { f.T.dispose(); }
});

test('incomplete, overlapping, foreign and principal-mismatched read DTOs fail closed before caching', async () => {
  for (const change of [
    value => { value.uid = 'TEST_ONLY other'; },
    value => { delete value.base[E]; },
    value => { value.absent.push(E); },
    value => { value.resources['bsdept:dB:bassam_employees_v1'] = []; },
    value => { value.epoch = null; },
    value => { value.denied = [E]; },
  ]) {
    const f = world({ read: value => { change(value); return json(value); } });
    try {
      assert.equal((await f.operations.read([E, S])).ok, 0);
      assert.throws(() => f.operations.value(E), /operations-read-required/);
      assert.equal(f.seen.length, 0);
    } finally { f.T.dispose(); }
  }
});

test('one staged cross-resource batch uses the existing flush and accepts only its complete strict receipt', async () => {
  const f = world();
  try {
    await f.operations.read([E, S, L]);
    const input = { set: { [E]: [{ eid: 'TEST_ONLY e2' }], [S]: { '1448-5': { 'TEST_ONLY e2': { shift: 'TEST_ONLY shift' } } } }, del: [L] };
    const ticket = f.operations.stage(input);
    assert.equal(typeof ticket.requestId, 'string');
    input.set[E][0].eid = 'TEST_ONLY changed after staging';
    await sleep(130);
    assert.equal(f.seen.length, 0, 'Stage is not an implicit save');
    assert.equal(f.T.W.KIVO.__BS_SRV.dirty(), true);
    const result = await f.operations.flush(ticket);
    assert.equal(result.ok, 1);
    assert.equal(f.seen.length, 1);
    const body = JSON.parse(f.seen[0]);
    assert.equal(body.uid, UID); assert.equal(body.epoch, 3); assert.equal(body.requestId, ticket.requestId);
    assert.deepEqual(Object.keys(body.base).sort(), [E, S, L].sort());
    assert.equal(JSON.parse(body.set[E])[0].eid, 'TEST_ONLY e2');
    assert.deepEqual(copy(f.operations.value(E)), [{ eid: 'TEST_ONLY e2' }]);
    assert.equal(f.T.W.KIVO.__BS_SRV.dirty(), false);
    assert.equal((await f.operations.flush(ticket)).ok, 1);
    assert.equal(f.seen.length, 1);
    assert.deepEqual(f.T.nativeLS(), {});
  } finally { f.T.dispose(); }
});

test('lost ACK after commit retains exact request bytes and cannot replay from timers, online or pagehide', async () => {
  let receipt, committed = 0;
  const f = world({ save: (body, documents) => {
    if (!receipt) {
      committed++; const request = JSON.parse(body); documents[E] = JSON.parse(request.set[E]); receipt = ack(body);
      throw Error('TEST_ONLY response lost after commit');
    }
    return json(receipt);
  } });
  try {
    await f.operations.read([E]);
    const ticket = f.operations.stage({ set: { [E]: [{ eid: 'TEST_ONLY acknowledged once' }] } });
    assert.equal((await f.operations.flush(ticket)).uncertain, true);
    const first = f.seen[0];
    f.T.W.dispatchEvent(new f.T.W.Event('online'));
    f.T.W.dispatchEvent(new f.T.W.Event('pagehide'));
    await sleep(950);
    assert.equal(f.seen.length, 1);
    assert.equal(f.T.W.KIVO.__BS_SRV.dirty(), true);
    assert.equal(f.operations.release(ticket), false);
    assert.equal((await f.operations.flush(ticket)).ok, 0, 'An ordinary flush cannot approve an uncertain retry');
    assert.equal((await f.operations.retry(ticket)).ok, 1);
    assert.equal(f.seen.length, 2); assert.equal(f.seen[1], first); assert.equal(committed, 1);
    assert.deepEqual(f.T.nativeLS(), {});
  } finally { f.T.dispose(); }
});

test('malformed or incomplete save ACKs do not confirm, merge or create another request', async () => {
  for (const change of [
    value => { delete value.revs[S]; }, value => { value.atomic = true; },
    value => { value.epoch++; }, value => { value.requestId = 'TEST_ONLY wrong'; },
    value => { value.revs['bsdept:dB:bassam_employees_v1'] = 9; },
  ]) {
    const f = world({ save: body => { const result = ack(body); change(result); return json(result); } });
    try {
      await f.operations.read([E, S]);
      const ticket = f.operations.stage({ set: { [E]: [], [S]: {} } });
      const result = await f.operations.flush(ticket);
      assert.equal(result.ok, 0); assert.equal(result.uncertain, true);
      assert.equal(f.operations.status(ticket).state, 'uncertain');
      assert.equal(f.seen.length, 1);
      assert.deepEqual(copy(f.operations.value(E)), initial[E], 'Only the confirmed view remains visible');
      assert.deepEqual(f.T.nativeLS(), {});
    } finally { f.T.dispose(); }
  }
});

test('a canonical atomic CAS/ACL rejection preserves the ticket and requires a fresh explicit review', async () => {
  for (const [status, kind] of [[409, 'conflicts'], [403, 'denied']]) {
    const f = world({ save: body => { const request = JSON.parse(body); return json({ ok: 0, requestId: request.requestId, epoch: request.epoch, atomic: 1, [kind]: { [E]: { why: 'TEST_ONLY barrier', rev: 7 } } }, status); } });
    try {
      await f.operations.read([E, S]);
      const ticket = f.operations.stage({ set: { [E]: [], [S]: {} } });
      const result = await f.operations.flush(ticket);
      assert.equal(result.ok, 0); assert.equal(result.uncertain, false);
      assert.equal(f.operations.status(ticket).state, status === 409 ? 'conflict' : 'denied');
      assert.throws(() => f.operations.value(E), /operations-read-required/);
      assert.equal(f.operations.stage({ set: { [E]: [] } }).err, 'read-required');
      assert.equal(f.seen.length, 1);
    } finally { f.T.dispose(); }
  }
});

test('scope/authz invalidation cannot clear a pending draft or send it for another identity', async () => {
  const f = world();
  try {
    await f.operations.read([E]);
    const ticket = f.operations.stage({ set: { [E]: [] } });
    f.T.W.dispatchEvent(new f.T.W.CustomEvent('bassam:remote', { detail: { keys: ['bsdept:dB:bassam_employees_v1'] } }));
    assert.deepEqual(copy(f.operations.value(E)), initial[E]);
    f.T.W.dispatchEvent(new f.T.W.CustomEvent('bassam:remote', { detail: { keys: [E] } }));
    assert.throws(() => f.operations.value(E), /operations-read-required/);
    assert.equal(f.operations.status(ticket).state, 'staged');
    f.values.uid = 'TEST_ONLY other';
    assert.equal((await f.operations.flush(ticket)).err, 'session');
    assert.equal(f.operations.status(ticket).requestId, ticket.requestId);
    f.T.W.dispatchEvent(new f.T.W.Event('pagehide'));
    assert.equal(f.seen.length, 0);
    assert.deepEqual(f.T.nativeLS(), {});
  } finally { f.T.dispose(); }
});

test('one scoped draft builds a typed cross-resource transaction without a second queue', async () => {
  const f = world();
  try {
    await f.operations.read([E, S]);
    const draft = f.operations.draft();
    assert.equal(draft.context.uid, UID); assert.equal(draft.context.dept, 'dA'); assert.equal(draft.context.epoch, 3);
    assert.deepEqual(copy(f.operations.get('bassam_employees_v1')), initial[E]);
    const employees = draft.get('bassam_employees_v1');
    employees.push({ eid: 'TEST_ONLY e2' });
    draft.set('bassam_employees_v1', employees);
    draft.set('bassam_staffing_v3', { '1448-5': { 'TEST_ONLY e2': { shift: 'TEST_ONLY new' } } });
    assert.equal(f.T.W.KIVO.__BS_SRV.dirty(), false, 'A draft has no transport queue until staged');
    const ticket = draft.stage();
    assert.equal((await f.operations.flush(ticket)).ok, 1);
    assert.equal(f.seen.length, 1);
    assert.deepEqual(Object.keys(JSON.parse(f.seen[0]).set).sort(), [E, S].sort());
  } finally { f.T.dispose(); }
});

test('a draft cannot silently adopt a newer revision, authority or department before it is staged', async () => {
  let revision = 4;
  const f = world({ read: value => { for (const key in value.base) value.base[key] = revision; return json(value); } });
  try {
    await f.operations.read([E]);
    const draft = f.operations.draft();
    draft.set('bassam_employees_v1', []);
    revision = 5; await f.operations.read([E]);
    assert.equal(draft.stage().err, 'review-required');
    const authority = f.operations.draft(); authority.set('bassam_employees_v1', []);
    f.T.W.dispatchEvent(new f.T.W.CustomEvent('bassam:authz', { detail: {} }));
    assert.equal(authority.stage().err, 'review-required');
    await f.operations.read([E]);
    const department = f.operations.draft(); department.set('bassam_employees_v1', []); f.values.dept = 'dB';
    assert.equal(department.stage().err, 'review-required');
    assert.equal(f.seen.length, 0);
    assert.equal(f.T.W.KIVO.__BS_SRV.dirty(), false);
  } finally { f.T.dispose(); }
});

test('an editor commit retains its original draft and invokes its edit callback only once across a lost ACK', async () => {
  let attempts = 0, edits = 0;
  const f = world({ save: body => {
    if (++attempts === 1) throw Error('TEST_ONLY response lost after commit');
    const request = JSON.parse(body);
    return json({ ok: 1, requestId: request.requestId, epoch: request.epoch, atomic: 1, revs: Object.fromEntries(Object.keys(request.set).map(key => [key, 5])) });
  } });
  try {
    await f.operations.read([E, S]);
    const owner = {}, intent = { employee: 'TEST_ONLY e2' };
    assert.equal(f.operations.begin(owner, 'editor').ok, 1);
    const edit = draft => { edits++; draft.set('bassam_employees_v1', [...draft.get('bassam_employees_v1'), { eid: intent.employee }]); draft.set('bassam_staffing_v3', {}); };
    const first = await f.operations.commit(owner, 'editor', intent, edit);
    assert.equal(first.uncertain, true); assert.equal(edits, 1);
    assert.equal((await f.operations.commit(owner, 'editor', { employee: 'TEST_ONLY changed' }, edit)).err, 'review-required');
    assert.equal(f.operations.begin(owner, 'editor').err, 'pending');
    const retry = await f.operations.commit(owner, 'editor', intent, edit);
    assert.equal(retry.ok, 1); assert.equal(edits, 1); assert.equal(first.ticket, retry.ticket);
    assert.equal(f.seen.length, 2); assert.equal(f.seen[0], f.seen[1]);
  } finally { f.T.dispose(); }
});

test('an editor opened before a revision change cannot save stale UI state against the newer base', async () => {
  let revision = 4;
  const f = world({ read: value => { value.base[E] = revision; return json(value); } });
  try {
    await f.operations.read([E]); const owner = {};
    assert.equal(f.operations.begin(owner, 'editor').ok, 1);
    revision++; await f.operations.read([E]);
    const result = await f.operations.commit(owner, 'editor', { name: 'TEST_ONLY stale' }, draft => draft.set('bassam_employees_v1', []));
    assert.equal(result.err, 'review-required'); assert.equal(f.seen.length, 0);
  } finally { f.T.dispose(); }
});

test('a partial typed read and save ACK cannot advance the changes cursor past another resource update', async () => {
  const B = 'bsdept:dA:bassam_perm_tpls_v1';
  let sqlV = 1, saved = false;
  const C = { req: async (route, options = {}) => {
    const url = new URL(route, 'http://x');
    if (url.pathname === '/api/operations/read') return json({ ok: 1, uid: UID, epoch: 3, v: 10, resources: { [E]: initial[E] }, absent: [], denied: [], base: { [E]: 4 } });
    if (url.pathname === '/api/save') { sqlV = 12; saved = true; return json({ ...ack(options.body), v: 12 }); }
    if (url.pathname === '/api/changes') return json({ v: sqlV, keys: Number(url.searchParams.get('since')) < sqlV ? [B, E] : [] });
    if (url.pathname === '/api/get') return json({ keys: { [B]: { v: '{"TEST_ONLY":"newer B"}', rev: 11 } } });
    return json({ ok: 1 });
  } };
  const T = loadClient({ C, boot: { srv: 1, cf: 1, uid: UID, v: 1, keys: { [B]: '{"TEST_ONLY":"old B"}' }, revs: { [B]: 1 } } });
  T.W.document.hidden = true;
  T.W.KIVO.BassamAuth = { user: () => ({ id: UID }) }; T.W.KIVO.BassamDepts = { active: () => 'dA' };
  try {
    const ops = T.W.KIVO.__BS_SRV.operations;
    assert.equal((await ops.read([E])).ok, 1); assert.equal(ops.snapshot().v, 10);
    assert.equal(T.W.__BS_BOOT.v, 1, 'A typed subset snapshot is not a completed change cursor');
    const ticket = ops.stage({ set: { [E]: [] } }); assert.equal((await ops.flush(ticket)).ok, 1); assert.equal(saved, true);
    assert.equal(T.W.__BS_BOOT.v, 1, 'The save receipt confirms A only');
    T.W.document.hidden = false;
    assert.equal(await until(() => T.get(B) === '{"TEST_ONLY":"newer B"}', 2500), true);
    assert.ok(T.urls.some(item => /\/api\/changes\?since=1(?:&|$)/.test(item.url)));
    assert.equal(T.W.__BS_BOOT.v, 12);
  } finally { T.dispose(); }
});

test('resync resolves only after actual typed reads complete and reports read failure', async () => {
  let release, pending = false, fail = false;
  const gate = new Promise(resolve => { release = resolve; });
  const f = world({ read: async value => { if (pending) await gate; return json(fail ? { ...value, base: {} } : value); } });
  try {
    await f.operations.read([E]); pending = true;
    let finished = false;
    const promise = f.T.W.KIVO.__BS_SRV.resync(true).then(result => { finished = true; return result; });
    await sleep(470); assert.equal(finished, false);
    release(); assert.equal((await promise).ok, 1);
    fail = true;
    assert.equal((await f.T.W.KIVO.__BS_SRV.resync(true)).ok, 0);
    assert.throws(() => f.operations.value(E), /operations-read-required/);
  } finally { release(); f.T.dispose(); }
});

test('cross-department references require their own acknowledged read and the same principal, active department and authority generation', async () => {
  const foreign = 'bsdept:dB:bassam_employees_v1';
  const f = world(); f.documents[foreign] = [{ eid: 'TEST_ONLY reference B' }];
  try {
    assert.throws(() => f.operations.reference(foreign), /operations-read-required/);
    assert.equal((await f.operations.read([E, foreign])).ok, 1);
    assert.equal(f.operations.reference(foreign)[0].eid, 'TEST_ONLY reference B');
    assert.throws(() => f.operations.value(foreign), /operations-scope-required/);
    assert.equal(f.operations.stage({ set: { [foreign]: [] } }).err, 'keys');
    f.values.dept = 'dB';
    assert.throws(() => f.operations.reference(foreign), /operations-read-required/);
    assert.equal(f.operations.ready([foreign]), false);
    assert.equal((await f.operations.read([foreign])).ok, 1);
    assert.equal(f.operations.get('bassam_employees_v1')[0].eid, 'TEST_ONLY reference B');
    f.T.W.dispatchEvent(new f.T.W.CustomEvent('bassam:authz', { detail: {} }));
    assert.throws(() => f.operations.reference(foreign), /operations-read-required/);
    f.values.uid = 'TEST_ONLY other'; assert.throws(() => f.operations.reference(foreign), /operations-scope-required/);
  } finally { f.T.dispose(); }
});

test('an older typed GET response cannot overwrite the value confirmed by a later save receipt', async () => {
  let reads = 0, release;
  const gate = new Promise(resolve => { release = resolve; });
  const f = world({ read: async value => { if (++reads === 2) await gate; return json(value); } });
  try {
    await f.operations.read([E]);
    const oldRead = f.operations.read([E]);
    const next = [{ eid: 'TEST_ONLY confirmed save' }], ticket = f.operations.stage({ set: { [E]: next } });
    assert.equal((await f.operations.flush(ticket)).ok, 1);
    release(); await oldRead;
    assert.deepEqual(copy(f.operations.value(E)), next);
    assert.equal(f.T.W.KIVO.__BS_SRV.rev(E), 8);
  } finally { release(); f.T.dispose(); }
});

test('an older receipt cannot roll back a newer confirmed SQL value or revision', async () => {
  let release, newer = false;
  const gate = new Promise(resolve => { release = resolve; });
  const latest = [{ eid: 'TEST_ONLY newer colleague value' }];
  const f = world({
    read: value => { if (newer) { value.resources[E] = latest; value.base[E] = 9; } return json(value); },
    save: async body => { await gate; return json(ack(body)); },
  });
  try {
    await f.operations.read([E]);
    const ticket = f.operations.stage({ set: { [E]: [{ eid: 'TEST_ONLY own earlier value' }] } });
    const saved = f.operations.flush(ticket);
    assert.equal(await until(() => f.seen.length === 1, 300), true);
    newer = true; assert.equal((await f.operations.read([E])).ok, 1);
    release(); assert.equal((await saved).ok, 1);
    assert.deepEqual(copy(f.operations.value(E)), latest);
    assert.equal(f.T.W.KIVO.__BS_SRV.rev(E), 9);
  } finally { release(); f.T.dispose(); }
});

test('a draft sends only accessed read dependencies in base while the receipt acknowledges write keys only', async () => {
  const f = world();
  try {
    await f.operations.read([E, S, L]);
    const draft = f.operations.draft();
    assert.equal(draft.get('bassam_staffing_locks_v1'), null);
    draft.set('bassam_employees_v1', []);
    const ticket = draft.stage(); assert.equal((await f.operations.flush(ticket)).ok, 1);
    const body = JSON.parse(f.seen[0]);
    assert.deepEqual(Object.keys(body.base).sort(), [E, L].sort());
    assert.equal(body.base[L], 4); assert.equal(Object.hasOwn(body.base, S), false);
    assert.deepEqual(Object.keys(body.set), [E]);
    assert.deepEqual(Object.keys((await f.operations.flush(ticket)).receipt.revs), [E]);
  } finally { f.T.dispose(); }
});

test('a read-only draft dependency invalidated before stage cannot be silently recaptured', async () => {
  const f = world();
  try {
    await f.operations.read([E, L]);
    const draft = f.operations.draft(); draft.get('bassam_staffing_locks_v1'); draft.set('bassam_employees_v1', []);
    f.operations.invalidate([L]);
    assert.equal(draft.stage().err, 'review-required'); assert.equal(f.seen.length, 0);
  } finally { f.T.dispose(); }
});

test('typed SQL values never appear in Storage enumeration or become legacy deletes through clear()', async () => {
  const f = world();
  try {
    await f.operations.read([E, S]);
    assert.equal(f.T.W.localStorage.length, 0);
    assert.equal(f.T.W.localStorage.key(0), null);
    f.T.W.localStorage.clear();
    assert.deepEqual(copy(f.operations.value(E)), initial[E]);
    assert.equal(f.T.W.KIVO.__BS_SRV.dirty(), false); assert.equal(f.seen.length, 0);
    const ticket = f.operations.stage({ set: { [E]: [] } });
    assert.throws(() => f.T.W.localStorage.clear(), /relational-domain-api-required/);
    assert.equal(f.operations.status(ticket).state, 'staged');
  } finally { f.T.dispose(); }
});

test('a remote invalidation during save requires a fresh SQL read before confirming the visible value', async () => {
  let release, reads = 0;
  const gate = new Promise(resolve => { release = resolve; }), latest = [{ eid: 'TEST_ONLY newer SQL value after own commit' }];
  const f = world({ read: value => { if (++reads > 1) { value.resources[E] = latest; value.base[E] = 9; } return json(value); }, save: async body => { await gate; return json(ack(body)); } });
  try {
    await f.operations.read([E]);
    const ticket = f.operations.stage({ set: { [E]: [{ eid: 'TEST_ONLY own earlier commit' }] } });
    const pending = f.operations.flush(ticket);
    assert.equal(await until(() => f.seen.length === 1, 300), true);
    f.T.W.dispatchEvent(new f.T.W.CustomEvent('bassam:remote', { detail: { keys: [E], v: 9 } }));
    assert.throws(() => f.operations.value(E), /operations-read-required/);
    release(); assert.equal((await pending).ok, 1);
    assert.equal(reads, 2); assert.deepEqual(copy(f.operations.value(E)), latest);
    assert.equal(f.seen.length, 1, 'Refreshing confirmation never replays the business write');
  } finally { release(); f.T.dispose(); }
});

test('a failed post-receipt read retains the committed ticket for an explicit retry without inventing confirmed data', async () => {
  let release, reads = 0, allow = false;
  const gate = new Promise(resolve => { release = resolve; }), latest = [{ eid: 'TEST_ONLY SQL current' }];
  const f = world({ read: value => {
    reads++;
    if (reads > 1 && !allow) throw Error('TEST_ONLY confirmation read disconnected');
    if (reads > 1) { value.resources[E] = latest; value.base[E] = 9; }
    return json(value);
  }, save: async body => { await gate; return json(ack(body)); } });
  try {
    await f.operations.read([E]); const ticket = f.operations.stage({ set: { [E]: [] } });
    const pending = f.operations.flush(ticket); await until(() => f.seen.length === 1, 300);
    f.operations.invalidate([E]); release();
    const result = await pending; assert.equal(result.ok, 0); assert.equal(result.committed, 1); assert.equal(result.uncertain, true);
    assert.throws(() => f.operations.value(E), /operations-read-required/);
    assert.equal(f.operations.status(ticket).state, 'uncertain'); assert.equal(f.seen.length, 1);
    allow = true; assert.equal((await f.operations.retry(ticket)).ok, 1);
    assert.equal(f.seen[0], f.seen[1]); assert.deepEqual(copy(f.operations.value(E)), latest);
  } finally { release(); f.T.dispose(); }
});
