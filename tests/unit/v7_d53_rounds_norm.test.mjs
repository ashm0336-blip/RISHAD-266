/* V7 · 53 (port-sync · بند 12 · 0022) — حفظُ الجولات للراصد: بعد أن يعيد الخادمُ الحقولَ المحجوبة من المخزَّن، يأخذ العميلُ ما خُزّن فعلاً (كما يراه) أساساً له،
   فلا يُعدّ الفرقُ كاتباً آخر («حلّت قيمةٌ أخرى محلَّ تعديلك» الكاذبة)؛ والتعارضُ الحقيقيُّ يبقى يُعلن. بيانات TEST_ONLY.
   ① الخادم (العامل الحقيقي · الإنفاذ): كتابةُ الراصد في عنصرٍ غيرِ مسنَد ⇒ الإيصالُ يحمل norm[k] = إسقاطُ المحفوظ له · حفظٌ بلا محجوب ⇒ لا norm
   ② العميل (280 · خدمةُ الإيداع): norm في الإيصال ⇒ القيمةُ المحفوظة والأساسُ = norm (لا المرسَل) والحفظُ التالي يُبنى عليه · وبلا norm كما كان
   ③ التعارضُ الحقيقي يُحسم «تعارضاً» كما كان */
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, stored, replaceOperationalFixture, operationSaveBody } from './world_fx.mjs';
import { loadClient } from './k264_vm.mjs';

const KR = 'bsdept:tst_d1:bassam_rounds_v1';
const isDay = (k) => /^\d+-\d+-\d+$/.test(k);
const own = (d) => { const z = d.d[0].zones[0]; z.fst = 'closed'; z.closed = true; z.cWhy = 'TEST_ONLY صيانة'; };
async function attempt(edit) {
  const w = await world({ mode: 'enforce' });
  const raw = stored(w.env, KR), day = Object.keys(raw).find(isDay); await replaceOperationalFixture(w.env, KR, raw);
  const f = (await w.login('0000000118', '70118')).ck;
  const g = await w.C.api('/api/operations/read?' + new URLSearchParams({ uid: 'tst_fld', keys: KR }), { cookie: f });
  assert.equal(g.status, 200, JSON.stringify(g.j)); const v = g.j.resources[KR];
  edit(v, day);
  const r = await w.C.api('/api/save', { method: 'POST', cookie: f, body: operationSaveBody(w.env, '/api/save', { uid: 'tst_fld', set: { [KR]: JSON.stringify(v) }, del: [], base: { [KR]: g.j.base[KR] } }) });
  const g2 = await w.C.api('/api/operations/read?' + new URLSearchParams({ uid: 'tst_fld', keys: KR }), { cookie: f });
  return { r, day, sent: v, view: g2.j.resources[KR] };
}

test('① الخادم: الحقلُ المحجوب عاد من المخزَّن ⇒ norm = ما يراه الراصدُ من المحفوظ · وبلا محجوب لا norm', async () => {
  const a = await attempt((v, day) => { own(v[day]); Object.assign(v[day].d[0].zones[1], { fst: 'open', cWhy: 'TEST_ONLY منسوخ' }); });
  assert.equal(a.r.status, 200, JSON.stringify(a.r.j).slice(0, 300)); assert.ok(a.r.j.revs && a.r.j.revs[KR]);
  assert.ok(a.r.j.norm && typeof a.r.j.norm[KR] === 'string', 'norm: ' + JSON.stringify(a.r.j).slice(0, 300));
  const nv = JSON.parse(a.r.j.norm[KR]);
  assert.deepEqual(nv, a.view, 'norm = ما يقرؤه الراصدُ بعد الحفظ حرفاً');
  assert.notDeepEqual(nv, a.sent, 'ويخالف ما أرسله');
  assert.equal(nv[a.day].d[0].zones[0].fst, 'closed', 'وتعديلُه قائم فيه');
  const b = await attempt((v, day) => own(v[day]));
  assert.equal(b.r.status, 200); assert.ok(b.r.j.revs && b.r.j.revs[KR]); assert.equal(b.r.j.norm, undefined, 'لا محجوب ⇒ لا norm');
});

/* ── ② ③ العميل: خادمٌ مزيّف يعيد norm كما يعيده العامل — خدمةُ الإيداع عامة لكل موردٍ تشغيلي؛ موردٌ بلا تقسيمٍ إلى فترات يكفي للآلية ── */
const E = 'bsdept:dA:bassam_employees_v1', UID = 'TEST_ONLY observer';
const copy = (v) => JSON.parse(JSON.stringify(v)), same = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m);   /* قيمٌ من سياق vm */
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
function client(save) {
  const doc = { '1448-6-1': { t: 1, d: [{ zones: [{ uid: 'z1', fst: 'open' }, { uid: 'z2', fst: 'closed', cWhy: 'TEST_ONLY server' }] }] } }, seen = [], revs = { [E]: 4 }, documents = { [E]: doc };
  const C = { req: async (route, options = {}) => {
    if (route.startsWith('/api/operations/read?')) return json({ ok: 1, uid: UID, epoch: 3, v: 7, resources: { [E]: copy(documents[E]) }, absent: [], denied: [], base: { [E]: revs[E] } });
    if (route === '/api/save') { seen.push(JSON.parse(options.body)); return save(seen[seen.length - 1], documents, revs); }
    return json({ v: 1, keys: [] });
  } };
  const T = loadClient({ C, boot: { srv: 1, cf: 1, uid: UID, v: 1, keys: {}, revs: {} } });
  T.W.document.hidden = true;
  T.W.KIVO.BassamAuth = { user: () => ({ id: UID, role: 'staff', deptId: 'dA' }) };
  T.W.KIVO.BassamDepts = { active: () => 'dA' };
  return { T, operations: T.W.KIVO.__BS_SRV.operations, seen, documents, revs };
}
/* الخادمُ يكتب ما أرسله الراصدُ في عنصره وحده (z1)، ويُبقي z2 كما خُزّن — ويعيد norm حين يختلف المحفوظُ عن المرسَل */
const fieldServer = (withNorm) => (req, documents, revs) => {
  const v = JSON.parse(req.set[E]), cur = documents[E], day = Object.keys(v)[0];
  v[day].d[0].zones[1] = copy(cur[day].d[0].zones[1]);
  documents[E] = v; revs[E]++;
  const out = { ok: 1, requestId: req.requestId, epoch: req.epoch, atomic: 1, revs: { [E]: revs[E] } };
  if (withNorm && JSON.stringify(v) !== req.set[E]) out.norm = { [E]: JSON.stringify(v) };
  return json(out);
};
const edit = (fst, z2) => (draft) => { const v = draft.get('bassam_employees_v1'), day = Object.keys(v)[0]; v[day].d[0].zones[0].fst = fst; if (z2) Object.assign(v[day].d[0].zones[1], z2); draft.set('bassam_employees_v1', v); };

test('② العميل: norm في الإيصال هو القيمةُ المحفوظة والأساس — والحفظُ التالي يُبنى عليه لا على المرسَل', async () => {
  const f = client(fieldServer(true));
  try {
    await f.operations.read([E]);
    const r1 = await f.operations.commit({}, 'editor', { fst: 'closed' }, edit('closed', { fst: 'open', cWhy: 'TEST_ONLY منسوخ' }));
    assert.equal(r1.ok, 1, JSON.stringify(r1));
    const day = '1448-6-1', mem = f.operations.get('bassam_employees_v1');
    same(mem[day].d[0].zones[1], { uid: 'z2', fst: 'closed', cWhy: 'TEST_ONLY server' }, 'ما خُزّن فعلاً لا ما أُرسل: ' + JSON.stringify(mem[day].d[0].zones[1]));
    same(mem, f.documents[E], 'الذاكرةُ = المخزَّن');
    const r2 = await f.operations.commit({}, 'editor', { fst: 'open' }, edit('open'));
    assert.equal(r2.ok, 1, JSON.stringify(r2));
    assert.deepEqual(JSON.parse(f.seen[1].set[E])[day].d[0].zones[1], { uid: 'z2', fst: 'closed', cWhy: 'TEST_ONLY server' }, 'الحفظُ التالي لا يعيد إرسالَ المنسوخ');
  } finally { f.T.dispose(); }
});

test('② وبلا norm (لا محجوب): القيمةُ المحفوظة = المرسَل كما كان', async () => {
  const f = client((req, documents, revs) => { documents[E] = JSON.parse(req.set[E]); revs[E]++; return json({ ok: 1, requestId: req.requestId, epoch: req.epoch, atomic: 1, revs: { [E]: revs[E] } }); });
  try {
    await f.operations.read([E]);
    const r1 = await f.operations.commit({}, 'editor', { fst: 'closed' }, edit('closed'));
    assert.equal(r1.ok, 1); same(f.operations.get('bassam_employees_v1'), JSON.parse(f.seen[0].set[E]));
  } finally { f.T.dispose(); }
});

test('③ التعارضُ الحقيقي يُحسم «تعارضاً» كما كان', async () => {
  const f = client((req) => json({ ok: 0, requestId: req.requestId, epoch: req.epoch, atomic: 1, revs: {}, denied: {}, conflicts: { [E]: { rev: 9 } } }, 409));
  try {
    await f.operations.read([E]);
    const r = await f.operations.commit({}, 'editor', { fst: 'closed' }, edit('closed'));
    same([r.ok, r.err], [0, 'conflict']);
  } finally { f.T.dispose(); }
});
