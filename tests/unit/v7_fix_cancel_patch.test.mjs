/* «إلغاء» عنصرٍ وُضع للتوّ بعد أن عدّل جهازٌ آخر الوثيقةَ نفسَها (برومت 41) — خدمةُ العمليات operations.patch في 280، بلا متصفح:
     (أ) جهازٌ آخر أضاف عنصراً آخر: مسودتي القديمة تُرفض كما كانت · والترقيعُ يحذف عنصري من أحدث نسخة ويُبقي عنصرَه.
     (ج) جهازٌ آخر عدّل عنصري نفسَه: الترقيعُ يعيد 'changed' ولا يكتب شيئاً.
     ثم: العنصرُ غيرُ موجود ⇒ لا كتابة · كتابةٌ بين القراءة والحفظ (تعارض) ⇒ يُعاد البناءُ على الأحدث · حفظٌ سابقٌ في الطريق يُحسم أولاً. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadClient, until } from './k264_vm.mjs';

const E = 'bsdept:dA:bassam_employees_v1', NAME = 'bassam_employees_v1', UID = 'TEST_ONLY owner';
const copy = (value) => JSON.parse(JSON.stringify(value));
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
function world(hook) {
  const documents = { [E]: [{ eid: 'TEST_ONLY e1' }] }, seen = [], revs = { [E]: 4 };
  const C = { req: async (route, options = {}) => {
    if (route.startsWith('/api/operations/read?')) {
      const keys = new URL(route, 'http://x').searchParams.get('keys').split(',');
      const value = { ok: 1, uid: UID, epoch: 3, v: 7, resources: {}, absent: [], denied: [], base: {} };
      for (const key of keys) { value.resources[key] = copy(documents[key]); value.base[key] = revs[key]; }
      return json(value);
    }
    if (route === '/api/save') {
      seen.push(options.body);
      const request = JSON.parse(options.body);
      if (hook) await hook(request, seen, documents, revs);
      /* a server that really checks the base revision and stores */
      if (request.base[E] !== revs[E]) return json({ ok: 0, requestId: request.requestId, epoch: request.epoch, atomic: 1, revs: {}, denied: {}, conflicts: { [E]: { rev: revs[E] } } }, 409);
      documents[E] = JSON.parse(request.set[E]); revs[E]++;
      return json({ ok: 1, requestId: request.requestId, epoch: request.epoch, atomic: 1, revs: { [E]: revs[E] } });
    }
    return json({ v: 1, keys: [] });
  } };
  const T = loadClient({ C, boot: { srv: 1, cf: 1, uid: UID, v: 1, keys: {}, revs: {} } });
  T.W.document.hidden = true;
  T.W.KIVO.BassamAuth = { user: () => ({ id: UID, role: 'dept', deptId: 'dA' }) };
  T.W.KIVO.BassamDepts = { active: () => 'dA' };
  return { T, operations: T.W.KIVO.__BS_SRV.operations, seen, documents, revs };
}
/* the page's own rule: remove my element only if it is still exactly as I placed it */
const removeMine = (mine) => (doc) => { const hit = doc.filter((x) => x.eid === mine.eid); if (!hit.length) return null; if (hit.some((x) => JSON.stringify(x) !== JSON.stringify(mine))) return undefined; return doc.filter((x) => x.eid !== mine.eid); };
const foreign = (f, change) => { f.documents[E] = change(copy(f.documents[E])); f.revs[E]++; };
const MINE = { eid: 'TEST_ONLY placed', label: 'باب 1' };
async function placed(f) {
  await f.operations.read([E]);
  const owner = {}, draft = f.operations.draft();
  const first = await f.operations.commit(owner, 'page', { place: 1 }, (d) => d.set(NAME, [...d.get(NAME), MINE]));
  assert.equal(first.ok, 1); assert.deepEqual(f.documents[E].map((x) => x.eid), ['TEST_ONLY e1', 'TEST_ONLY placed']);
  return { owner, pageDraft: f.operations.draft(), stale: draft };
}

test('(أ) another device added another element: my stale draft is still refused, and the patch removes mine from the latest version and keeps theirs', async () => {
  const f = world();
  try {
    const p = await placed(f);
    foreign(f, (doc) => [...doc, { eid: 'TEST_ONLY other' }]);
    await f.operations.read([E]);   /* the change of the other device reaches this tab */
    assert.throws(() => p.pageDraft.get(NAME), /operations-draft-review-required/, 'the draft protection is unchanged: the page draft is stale');
    const sent = f.seen.length;
    const result = await f.operations.patch(p.owner, 'page:cancel', NAME, removeMine(MINE));
    assert.equal(result.ok, 1, JSON.stringify(result)); assert.equal(f.seen.length, sent + 1);
    assert.deepEqual(f.documents[E].map((x) => x.eid), ['TEST_ONLY e1', 'TEST_ONLY other'], 'mine is gone, theirs stays');
    assert.equal(JSON.parse(f.seen.at(-1)).base[E], f.revs[E] - 1, 'the delete is based on the latest revision');
  } finally { f.T.dispose(); }
});

test('(ج) another device changed my element itself: no silent delete — changed, nothing written', async () => {
  const f = world();
  try {
    const p = await placed(f);
    foreign(f, (doc) => doc.map((x) => (x.eid === MINE.eid ? { ...x, num: '99' } : x)));
    const sent = f.seen.length;
    const result = await f.operations.patch(p.owner, 'page:cancel', NAME, removeMine(MINE));
    assert.deepEqual([result.ok, result.err, result.uncertain], [0, 'changed', false]);
    assert.equal(f.seen.length, sent, 'nothing was sent');
    assert.deepEqual(f.documents[E].find((x) => x.eid === MINE.eid), { ...MINE, num: '99' });
  } finally { f.T.dispose(); }
});

test('the element is already gone in the latest version: nothing to do, nothing written', async () => {
  const f = world();
  try {
    const p = await placed(f);
    foreign(f, (doc) => doc.filter((x) => x.eid !== MINE.eid));
    const sent = f.seen.length, result = await f.operations.patch(p.owner, 'page:cancel', NAME, removeMine(MINE));
    assert.deepEqual([result.ok, result.noop], [1, 1]); assert.equal(f.seen.length, sent);
  } finally { f.T.dispose(); }
});

test('a write lands between the read and the save (conflict): the delete is rebuilt on the newer version', async () => {
  let once = 0;
  const f = world((request, seen, documents, revs) => { if (seen.length === 2 && !once++) { documents[E] = [...documents[E], { eid: 'TEST_ONLY late' }]; revs[E]++; } });
  try {
    const p = await placed(f);
    const result = await f.operations.patch(p.owner, 'page:cancel', NAME, removeMine(MINE));
    assert.equal(result.ok, 1, JSON.stringify(result)); assert.equal(f.seen.length, 3, 'placed · refused delete · rebuilt delete');
    assert.deepEqual(f.documents[E].map((x) => x.eid), ['TEST_ONLY e1', 'TEST_ONLY late']);
  } finally { f.T.dispose(); }
});

test('the placing save is still in flight when cancel is pressed: it is settled first, then the element is removed', async () => {
  let release; const held = new Promise((resolve) => { release = resolve; });
  const f = world(async (request, seen) => { if (seen.length === 1) await held; });
  try {
    await f.operations.read([E]);
    const owner = {};
    const first = f.operations.commit(owner, 'page', { place: 1 }, (d) => d.set(NAME, [...d.get(NAME), MINE]));
    assert.equal(await until(() => f.seen.length === 1, 1000, 5), true);
    const cancel = f.operations.patch(owner, 'page:cancel', NAME, removeMine(MINE));
    release();
    const [a, b] = await Promise.all([first, cancel]);
    assert.equal(a.ok, 1); assert.equal(b.ok, 1, JSON.stringify(b)); assert.equal(b.noop, undefined);
    assert.deepEqual(f.documents[E].map((x) => x.eid), ['TEST_ONLY e1']);
  } finally { f.T.dispose(); }
});

/* ── برومت 41-ب: الترقيعُ الجاهز operations.removal على وثيقةٍ بشكل الخطة — المصليات · المسارات · المعالم (uid) والنطاقات (id) ──
   العنصرُ محفوظٌ في مواضعه الحقيقية: المستوى الأعلى (غير النطاقات) · floors[i] · لقطة الشهر months[k].d[i] */
const KINDS = [['zones', 'uid'], ['paths', 'uid'], ['marks', 'uid'], ['sectors', 'id']];
const planDoc = (kind, idKey, items) => { const site = { sid: 'TEST_ONLY_s', name: 'TEST_ONLY موقع', zones: [], gates: [], marks: [], paths: [], sectors: [], [kind]: copy(items) }; return { pMig: 3, zones: [], gates: [], marks: [], paths: [], ...(kind === 'sectors' ? {} : { [kind]: copy(items) }), floors: [copy(site)], months: { '1448-6': { c: 1, d: [copy(site)] } }, cfg: {} }; };
const everyList = (doc, kind) => [doc[kind], doc.floors[0][kind], doc.months['1448-6'].d[0][kind]].filter(Array.isArray);
for (const [kind, idKey] of KINDS) {
  const mine = { [idKey]: 'TEST_ONLY_mine', label: 'TEST_ONLY عنصري', x: 10, y: 20 }, base = { [idKey]: 'TEST_ONLY_base', label: 'TEST_ONLY قائم' };
  test('(أ) ' + kind + ': another device added another element — mine is removed from every place it is stored, theirs stays', async () => {
    const f = world();
    try {
      f.documents[E] = planDoc(kind, idKey, [base, mine]); await f.operations.read([E]);
      const stale = f.operations.draft();
      f.documents[E] = planDoc(kind, idKey, [base, mine, { [idKey]: 'TEST_ONLY_other', label: 'TEST_ONLY لغيري' }]); f.revs[E]++;
      await f.operations.read([E]);
      assert.throws(() => stale.get(NAME), /operations-draft-review-required/);
      const result = await f.operations.patch({}, 'page:cancel', NAME, f.operations.removal(kind, idKey, mine));
      assert.equal(result.ok, 1, JSON.stringify(result));
      const lists = everyList(f.documents[E], kind);
      assert.equal(lists.length, kind === 'sectors' ? 2 : 3);
      for (const list of lists) assert.deepEqual(list.map((x) => x[idKey]), ['TEST_ONLY_base', 'TEST_ONLY_other']);
    } finally { f.T.dispose(); }
  });
  test('(ج) ' + kind + ': another device changed my element in one of its places — changed, nothing written', async () => {
    const f = world();
    try {
      const doc = planDoc(kind, idKey, [base, mine]); doc.floors[0][kind][1].label = 'TEST_ONLY عدّله غيري';
      f.documents[E] = doc; await f.operations.read([E]);
      const sent = f.seen.length, result = await f.operations.patch({}, 'page:cancel', NAME, f.operations.removal(kind, idKey, mine));
      assert.deepEqual([result.ok, result.err, result.uncertain], [0, 'changed', false]); assert.equal(f.seen.length, sent);
      for (const list of everyList(f.documents[E], kind)) assert.equal(list.length, 2, 'the element stays everywhere');
    } finally { f.T.dispose(); }
  });
}
test('removal: an element without its identifier, or absent from the document, changes nothing', async () => {
  const f = world();
  try {
    f.documents[E] = planDoc('marks', 'uid', [{ uid: 'TEST_ONLY_base' }]); await f.operations.read([E]);
    for (const mine of [{ label: 'no id' }, { uid: '' }, { uid: 'TEST_ONLY_absent' }]) {
      const result = await f.operations.patch({}, 'page:cancel', NAME, f.operations.removal('marks', 'uid', mine));
      assert.deepEqual([result.ok, result.noop], [1, 1]);
    }
    assert.equal(f.seen.length, 0);
  } finally { f.T.dispose(); }
});

/* ── برومت 41-ج: الدمجُ الثلاثي العام operations.merge — يُعاد بناءُ تعديلي (إضافة · تعديل حقول · تحريك · حذف) فوق أحدث نسخة ── */
const site = (extra) => ({ sid: 'TEST_ONLY_s', name: 'TEST_ONLY موقع', approved: false, zones: [], marks: [], paths: [], sectors: [], gates: [], ...extra });
const doc3 = (gates, more = {}) => ({ pMig: 3, zones: [], marks: [], paths: [], gates: copy(gates), floors: [site({ gates: copy(gates) })], months: { '1448-6': { c: 1, d: [site({ gates: copy(gates) })] } }, cfg: {}, ...more });
const LISTS4 = ['zones', 'gates', 'marks', 'paths'];
const prepare = (d) => { LISTS4.forEach((k) => delete d[k]); return d; };
const finish = (d) => { LISTS4.forEach((k) => { d[k] = d.floors[0][k] || []; }); return d; };
const G = (uid, extra) => ({ uid, x: 10, y: 20, label: 'باب', ...extra });
const gatesEverywhere = (doc) => [doc.gates, doc.floors[0].gates, doc.months['1448-6'].d[0].gates];
async function rebase(base, mine, theirs) {
  const f = world();
  f.documents[E] = theirs; await f.operations.read([E]);
  const result = await f.operations.patch({}, 'page:rebase', NAME, f.operations.merge(base, mine, prepare, finish));
  const out = { result, sent: f.seen.length, doc: f.documents[E] }; f.T.dispose(); return out;
}
for (const [what, mineGates, want] of [
  ['edits its fields', [G('a'), G('mine', { num: '7' })], [G('a'), G('mine', { num: '7' }), G('other')]],
  ['moves it', [G('a'), G('mine', { x: 99, y: 88 })], [G('a'), G('mine', { x: 99, y: 88 }), G('other')]],
  ['deletes it', [G('a')], [G('a'), G('other')]],
  ['adds another', [G('a'), G('mine'), G('mine2')], [G('a'), G('mine'), G('other'), G('mine2')]],
]) test('41-ج (أ) another device added an element, and this page ' + what + ': my change is rebuilt on the latest version, theirs stays', async () => {
  const base = doc3([G('a'), G('mine')]), theirs = doc3([G('a'), G('mine'), G('other')]);
  const { result, sent, doc } = await rebase(base, doc3(mineGates), theirs);
  assert.equal(result.ok, 1, JSON.stringify(result)); assert.equal(sent, 1);
  for (const list of gatesEverywhere(doc)) assert.deepEqual(list, want);
});
test('41-ج (ج) another device changed the same element I edited: changed, nothing written', async () => {
  const base = doc3([G('a'), G('mine')]), theirs = doc3([G('a'), G('mine', { label: 'عدّله غيري' })]);
  for (const mine of [doc3([G('a'), G('mine', { num: '7' })]), doc3([G('a')])]) {   /* edit · delete */
    const { result, sent, doc } = await rebase(base, mine, theirs);
    assert.deepEqual([result.ok, result.err, result.uncertain], [0, 'changed', false]); assert.equal(sent, 0);
    assert.deepEqual(doc, theirs);
  }
});
test('41-ج: they deleted what I edited ⇒ changed · both made the same change ⇒ nothing to write · an unrelated field they changed is kept', async () => {
  const base = doc3([G('a'), G('mine')]);
  let r = await rebase(base, doc3([G('a'), G('mine', { num: '7' })]), doc3([G('a')]));
  assert.equal(r.result.err, 'changed'); assert.equal(r.sent, 0);
  r = await rebase(base, doc3([G('a'), G('mine', { num: '7' })]), doc3([G('a'), G('mine', { num: '7' })]));
  assert.deepEqual([r.result.ok, r.result.noop], [1, 1]); assert.equal(r.sent, 0);
  const theirs = doc3([G('a'), G('mine')], { cfg: { TEST_ONLY: 1 } }); theirs.floors[0].approved = true; theirs.months['1448-6'].d[0].approved = true;
  r = await rebase(base, doc3([G('a'), G('mine', { num: '7' })]), theirs);
  assert.equal(r.result.ok, 1); assert.deepEqual(r.doc.cfg, { TEST_ONLY: 1 }); assert.equal(r.doc.floors[0].approved, true);
  assert.deepEqual(r.doc.floors[0].gates, [G('a'), G('mine', { num: '7' })]);
});
test('41-ج: the same scalar changed differently by both sides ⇒ changed (no silent overwrite)', async () => {
  const base = doc3([G('a')]), mine = doc3([G('a')], { cfg: { v: 'mine' } }), theirs = doc3([G('a')], { cfg: { v: 'theirs' } });
  const r = await rebase(base, mine, theirs);
  assert.equal(r.result.err, 'changed'); assert.equal(r.sent, 0);
});
