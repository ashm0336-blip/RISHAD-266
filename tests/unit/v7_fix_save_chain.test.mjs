/* «لم يصل تأكيد الحفظ — بقيت المسودة» (برومت 40) — خدمةُ الإيداع العامة في 280، بلا متصفح:
     ① سباقُ نسخةٍ في الخادم: 409 {ok:0, err:'conflict'} بلا هويةِ الطلب ⇒ يُعاد الطلبُ نفسُه (المعرّف والجسم) تلقائياً فينجح، بلا «غير مؤكَّد».
     ② السباقُ المتكرّر: إعادتان على الأكثر ثم «غير مؤكَّد» كما كان (ثلاثةُ طلباتٍ متطابقة).
     ③ تعارضٌ حقيقي بهويته وخريطته لا يُعاد — يُحسم «تعارضاً» من أول ردّ كما كان.
     ④ حفظٌ تالٍ والسابقُ في الطريق: ينتظر حسمَه ثم يُرسل على مراجعة إيصاله؛ لا «review-required» ولا كتابةٌ ضائعة.
     ⑤ التالي لا يُرسل إن دخل بين الحفظين تعديلُ غيري (المراجعةُ عندي ليست مراجعةَ الإيصال) — خاصيةُ المسودات باقية. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadClient, until } from './k264_vm.mjs';

const E = 'bsdept:dA:bassam_employees_v1';
const UID = 'TEST_ONLY owner';
const copy = (value) => JSON.parse(JSON.stringify(value));
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
function world(save) {
  const documents = { [E]: [{ eid: 'TEST_ONLY e1', name: 'TEST_ONLY employee' }] }, seen = [], revs = { [E]: 4 };
  const C = { req: async (route, options = {}) => {
    if (route.startsWith('/api/operations/read?')) {
      const keys = new URL(route, 'http://x').searchParams.get('keys').split(',');
      const value = { ok: 1, uid: UID, epoch: 3, v: 7, resources: {}, absent: [], denied: [], base: {} };
      for (const key of keys) { value.resources[key] = copy(documents[key]); value.base[key] = revs[key]; }
      return json(value);
    }
    if (route === '/api/save') { seen.push(options.body); return save(options.body, seen, documents, revs); }
    return json({ v: 1, keys: [] });
  } };
  const T = loadClient({ C, boot: { srv: 1, cf: 1, uid: UID, v: 1, keys: {}, revs: {} } });
  T.W.document.hidden = true;
  T.W.KIVO.BassamAuth = { user: () => ({ id: UID, role: 'dept', deptId: 'dA' }) };
  T.W.KIVO.BassamDepts = { active: () => 'dA' };
  return { T, operations: T.W.KIVO.__BS_SRV.operations, seen, documents, revs };
}
/* a server that really stores: each accepted save writes the document and bumps the key's revision */
const store = (body, documents, revs) => { const request = JSON.parse(body); for (const key of Object.keys(request.set)) { assert.equal(request.base[key], revs[key], 'the save is based on the stored revision'); documents[key] = JSON.parse(request.set[key]); revs[key]++; } return { ok: 1, requestId: request.requestId, epoch: request.epoch, atomic: 1, revs: Object.fromEntries(Object.keys(request.set).map((key) => [key, revs[key]])) }; };
const bare = () => json({ ok: 0, err: 'conflict' }, 409);
const edit = (eid) => (draft) => draft.set('bassam_employees_v1', [...draft.get('bassam_employees_v1'), { eid }]);

test('① a bare 409 conflict (server version race, nothing written) is retried with the same request and succeeds', async () => {
  const f = world((body, seen, documents, revs) => (seen.length === 1 ? bare() : json(store(body, documents, revs))));
  try {
    await f.operations.read([E]);
    const result = await f.operations.commit({}, 'editor', { add: 'TEST_ONLY e2' }, edit('TEST_ONLY e2'));
    assert.equal(result.ok, 1, JSON.stringify(result)); assert.equal(result.uncertain, undefined);
    assert.equal(f.seen.length, 2); assert.equal(f.seen[0], f.seen[1], 'the retry is the same request: same requestId, same body');
    assert.deepEqual(f.documents[E].map((x) => x.eid), ['TEST_ONLY e1', 'TEST_ONLY e2']);
  } finally { f.T.dispose(); }
});

test('② a race that keeps repeating: two automatic retries at most, then uncertain as before', async () => {
  const f = world(() => bare());
  try {
    await f.operations.read([E]);
    const result = await f.operations.commit({}, 'editor', { add: 'TEST_ONLY e2' }, edit('TEST_ONLY e2'));
    assert.deepEqual([result.ok, result.err, result.uncertain], [0, 'ack', true]);
    assert.equal(f.seen.length, 3); assert.ok(f.seen.every((body) => body === f.seen[0]));
    assert.deepEqual(f.documents[E].map((x) => x.eid), ['TEST_ONLY e1']);
  } finally { f.T.dispose(); }
});

test('③ a real conflict (identity and conflict map) is settled at the first answer, never retried', async () => {
  const f = world((body) => { const request = JSON.parse(body); return json({ ok: 0, requestId: request.requestId, epoch: request.epoch, atomic: 1, revs: {}, denied: {}, conflicts: { [E]: { rev: 9 } } }, 409); });
  try {
    await f.operations.read([E]);
    const result = await f.operations.commit({}, 'editor', { add: 'TEST_ONLY e2' }, edit('TEST_ONLY e2'));
    assert.deepEqual([result.ok, result.err, result.uncertain], [0, 'conflict', false]); assert.equal(f.seen.length, 1);
  } finally { f.T.dispose(); }
});

test('④ a following commit of the same editor waits for the one in flight and is sent on its receipt — no review-required, no lost write', async () => {
  let release; const held = new Promise((resolve) => { release = resolve; });
  const f = world(async (body, seen, documents, revs) => { if (seen.length === 1) await held; return json(store(body, documents, revs)); });
  try {
    await f.operations.read([E]);
    const owner = {};
    const first = f.operations.commit(owner, 'editor', { add: 'TEST_ONLY e2' }, edit('TEST_ONLY e2'));
    assert.equal(await until(() => f.seen.length === 1, 1000, 5), true);
    assert.equal(f.operations.begin(owner, 'editor').ok, 1, 'the editor is accepted while its previous commit is in flight');
    const second = f.operations.commit(owner, 'editor', { add: 'TEST_ONLY e3' }, edit('TEST_ONLY e3'));
    release();
    const [a, b] = await Promise.all([first, second]);
    assert.equal(a.ok, 1); assert.equal(b.ok, 1, JSON.stringify(b)); assert.equal(f.seen.length, 2);
    assert.deepEqual(f.documents[E].map((x) => x.eid), ['TEST_ONLY e1', 'TEST_ONLY e2', 'TEST_ONLY e3'], 'both writes reached the server');
    assert.equal(JSON.parse(f.seen[1]).base[E], a.receipt.revs[E], 'the following save is based on the revision of the first receipt');
  } finally { f.T.dispose(); }
});

test('⑤ the following commit is not sent when my revision is no longer the receipt revision (someone else wrote in between)', async () => {
  let release; const held = new Promise((resolve) => { release = resolve; });
  const f = world(async (body, seen, documents, revs) => { if (seen.length === 1) await held; const out = store(body, documents, revs); if (seen.length === 1) out.revs[E] += 5; return json(out); });
  try {
    await f.operations.read([E]);
    const owner = {};
    const first = f.operations.commit(owner, 'editor', { add: 'TEST_ONLY e2' }, edit('TEST_ONLY e2'));
    assert.equal(await until(() => f.seen.length === 1, 1000, 5), true);
    const second = f.operations.commit(owner, 'editor', { add: 'TEST_ONLY e3' }, edit('TEST_ONLY e3'));
    /* a foreign revision reaches this tab before the first receipt: the key is re-read at a newer revision */
    f.revs[E] += 9; await f.operations.read([E]);
    release();
    const [a, b] = await Promise.all([first, second]);
    assert.equal(b.ok, 0, JSON.stringify([a, b])); assert.equal(b.err, 'review-required'); assert.equal(b.uncertain, true);
    assert.equal(f.seen.length, 1, 'nothing more was sent');
  } finally { f.T.dispose(); }
});
