/* V7 · 53 (periodsui): طبقةُ العميل للتخزين بالفترة (280) على خادمٍ مزيَّف يطبّق عقد «periods» ($S/periods_api.md v1) — TEST_ONLY.
   القراءة: المورد المقسَّم يُطلب رأساً (K@) والشهرَ الحالي (range=K@<grp>) وحده، لا الوثيقةَ كلها.
   الحفظ: الصفحة تكتب «الوثيقة» كما كانت، فيُرسل ما تغيّر وحده (K@p)، وما لم يُحمَّل لا يُرسل ولا يُحذف.
   قبل الإصلاح: القراءةُ ?keys=K (الوثيقة كلها) والحفظُ يرسل الوثيقة كلها — فتفشل الحالاتُ كلُّها. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadClient } from './k264_vm.mjs';

const UID = 'TEST_ONLY owner', D = 'dA', K = (r) => 'bsdept:' + D + ':' + r;
const PL = K('bassam_plan_v1'), RD = K('bassam_rounds_v1'), DR = K('bassam_dreport_v1'), E = K('bassam_employees_v1');
const copy = (v) => JSON.parse(JSON.stringify(v));
const json = (v, status = 200) => new Response(JSON.stringify(v), { status, headers: { 'Content-Type': 'application/json' } });
const NOW = { y: 1448, m: 6, d: 14 };
const site = (n) => ({ sid: 'TEST_ONLY_s' + n, name: 'TEST_ONLY · موقع ' + n, zones: [{ uid: 'TEST_ONLY_z' + n, n: 'TEST_ONLY' }] });
/* خادمٌ مزيَّف بالعقد: لكل مورد مقسَّم رأسٌ وفترات، ومراجعةٌ لكل فترة؛ grp يحسبه «الخادم» (هنا الاختبار) لا العميل */
function server() {
  let v = 10;
  const S = { heads: {}, periods: {}, rev: {}, plain: { [E]: [{ eid: 'TEST_ONLY_e1', name: 'TEST_ONLY' }] } };
  const field = (k) => (/bassam_plan_v1$/.test(k) ? 'months' : '');
  const grp = (k, p) => (field(k) ? p : p.indexOf('m:') === 0 ? p.slice(2) : (/^(\d+-\d+)-/.exec(p) || [])[1] || p);
  function put(k, doc) {
    const f = field(k), head = {};
    Object.keys(doc).forEach((x) => { if (f) head[x] = x === f ? {} : doc[x]; else if (x.indexOf('__') === 0) head[x] = doc[x]; else S.periods[k + '@' + x] = doc[x]; });
    if (f) Object.keys(doc[f] || {}).forEach((p) => { S.periods[k + '@' + p] = doc[f][p]; });
    S.heads[k + '@'] = head;
    Object.keys(S.heads).concat(Object.keys(S.periods)).forEach((x) => { S.rev[x] = S.rev[x] || 5; });
  }
  put(PL, { floors: [site(0)], cfg: { TEST_ONLY: 1 }, months: { '1448-4': { d: [site(4)] }, '1448-5': { d: [site(5)] }, '1448-6': { d: [site(6)] } }, delMonths: {} });
  put(RD, { __pMig: 2, 'm:1448-5': { ap: 1 }, '1448-5-29': { t: 1 }, 'm:1448-6': { ap: 0 }, '1448-6-13': { t: 2 }, '1448-6-14': { t: 3 } });
  put(DR, { '1448-6-12': { x: 1 }, '1448-6-13': { x: 2 }, '1448-6-14': { x: 3 } });
  const reads = [], saves = [];
  const C = { req: async (route, o = {}) => {
    const u = new URL(route, 'http://x');
    if (u.pathname === '/api/operations/read') {
      const keys = (u.searchParams.get('keys') || '').split(',').filter(Boolean), range = (u.searchParams.get('range') || '').split(',').filter(Boolean);
      reads.push({ keys, range });
      const denied = keys.find((k) => S.deny && k.endsWith('@') && S.deny.includes(k.slice(0, -1)));
      if (denied) return json({ ok: 1, uid: UID, v: 0, epoch: 0, resources: {}, absent: [], denied: keys.slice(), base: {}, ranges: {} });   /* as the «periods» server: a denied resource, no range, no epoch */
      const out = { ok: 1, uid: UID, epoch: 3, v, resources: {}, absent: [], denied: [], failed: {}, base: {}, ranges: {} };
      const all = keys.slice();
      range.forEach((r) => { const at = r.lastIndexOf('@'), k = r.slice(0, at), g = r.slice(at + 1); out.ranges[r] = Object.keys(S.periods).filter((pk) => pk.indexOf(k + '@') === 0 && grp(k, pk.slice(k.length + 1)) === g && pk !== k + '@'); out.ranges[r].forEach((pk) => { if (!all.includes(pk)) all.push(pk); }); });
      if (all.filter((k) => /@./.test(k)).length > 40) return json({ ok: 0, err: 'read-too-large', msg: 'TEST_ONLY' }, 413);
      all.forEach((k) => {
        const val = k in S.heads ? S.heads[k] : k in S.periods ? S.periods[k] : k in S.plain ? S.plain[k] : undefined;
        if (/@/.test(k) ? !(/^bsdept:[^:]+:bassam_(plan|rounds|dreport)_v1@/.test(k)) : /bassam_(plan|rounds|dreport)_v1$/.test(k)) { out.failed[k] = 'operations-period-key'; return; }
        if (val === undefined) out.absent.push(k); else out.resources[k] = copy(val);
        out.base[k] = S.rev[k] || 0;
      });
      return json(out);
    }
    if (u.pathname === '/api/save') {
      const b = JSON.parse(o.body); saves.push({ body: b, bytes: o.body.length });
      const conflicts = {};
      Object.keys(b.set).concat(b.del).forEach((k) => { if ((S.rev[k] || 0) !== (b.base[k] || 0)) conflicts[k] = { why: 'conflict' }; });
      if (Object.keys(conflicts).length) return json({ ok: 0, requestId: b.requestId, epoch: b.epoch, atomic: 1, revs: {}, denied: {}, conflicts }, 409);
      const revs = {}; v++;
      Object.keys(b.set).forEach((k) => { const x = JSON.parse(b.set[k]); if (k.endsWith('@')) S.heads[k] = x; else S.periods[k] = x; S.rev[k] = v; revs[k] = v; });
      b.del.forEach((k) => { delete S.periods[k]; S.rev[k] = v; revs[k] = v; });
      return json({ ok: 1, requestId: b.requestId, epoch: b.epoch, atomic: 1, v, revs, denied: {}, conflicts: {} });
    }
    return json({ v: 1, keys: [] });
  } };
  return { S, C, reads, saves };
}
function client() {
  const srv = server();
  const T = loadClient({ C: srv.C, boot: { srv: 1, cf: 1, uid: UID, v: 1, keys: {}, revs: {} } });
  T.W.document.hidden = true;
  T.W.KIVO.BassamAuth = { user: () => ({ id: UID, role: 'dept', deptId: D }) };
  T.W.KIVO.BassamDepts = { active: () => D };
  T.W.KIVO.BassamCal = { hNow: (date) => (Date.now() - date.getTime() > 1000 ? { ...NOW, d: NOW.d - 1 } : { ...NOW }) };
  return { ...srv, T, ops: T.W.KIVO.__BS_SRV.operations };
}
const owner = {};
async function save(f, name, edit) {
  const r = await f.ops.patch(owner, 'TEST_ONLY:' + name + Math.random(), name, (doc) => { edit(doc); return doc; });
  return r;
}

test('a split resource is read as its head + the current month only; the page still sees one document', async () => {
  const f = client();
  try {
    const r = await f.ops.read([PL, RD, E]);
    assert.equal(r.ok, 1, JSON.stringify(r));
    assert.ok(f.reads.every((q) => !q.keys.includes(PL) && !q.keys.includes(RD)), 'never the whole document: ' + JSON.stringify(f.reads));
    const qp = f.reads.find((q) => q.keys.includes(PL + '@'));
    assert.deepEqual(qp.range, [PL + '@1448-6'], 'the plan: this month');
    const plan = copy(f.ops.get('bassam_plan_v1'));
    assert.deepEqual(Object.keys(plan.months), ['1448-6'], 'only the shown month is in memory');
    assert.deepEqual(plan.floors, [site(0)], 'the head is whole');
    const rounds = copy(f.ops.get('bassam_rounds_v1'));
    assert.deepEqual(Object.keys(rounds).sort(), ['1448-6-13', '1448-6-14', '__pMig', 'm:1448-6'], 'rounds: this month days + its month control');
    assert.deepEqual(copy(f.ops.get('bassam_employees_v1')), f.S.plain[E], 'unsplit resources unchanged');
    assert.equal(f.ops.ready([PL, RD, E]), true);
  } finally { f.T.dispose(); }
});

test('saving a month sends only that month (request bytes), never the head or the months not shown', async () => {
  const f = client();
  try {
    await f.ops.read([PL]);
    await f.ops.want('bassam_plan_v1', { groups: ['1448-5'] });
    assert.deepEqual(Object.keys(copy(f.ops.get('bassam_plan_v1')).months).sort(), ['1448-5', '1448-6'], 'navigation loads the other month');
    const r = await save(f, 'bassam_plan_v1', (d) => { d.months['1448-6'].d[0].name = 'TEST_ONLY · معدَّل'; });
    assert.equal(r.ok, 1, JSON.stringify(r));
    assert.equal(f.saves.length, 1);
    const b = f.saves[0].body;
    assert.deepEqual(Object.keys(b.set), [PL + '@1448-6'], 'only the changed month');
    assert.deepEqual(b.del, []);
    assert.equal(b.base[PL + '@1448-6'], 5, 'its own period revision');
    const monthBytes = JSON.stringify(JSON.stringify(f.S.periods[PL + '@1448-6'])).length;
    assert.ok(f.saves[0].bytes < monthBytes + 1500, 'request ≈ one month: ' + f.saves[0].bytes + ' vs month ' + monthBytes);
    assert.deepEqual(f.S.periods[PL + '@1448-4'], { d: [site(4)] }, 'the month never loaded is stored as it was');
    assert.equal(copy(f.ops.get('bassam_plan_v1')).months['1448-6'].d[0].name, 'TEST_ONLY · معدَّل');
  } finally { f.T.dispose(); }
});

test('a head edit sends the head alone; a stamp-only / no-change save sends nothing', async () => {
  const f = client();
  try {
    await f.ops.read([PL]);
    const r0 = await save(f, 'bassam_plan_v1', () => {});
    assert.equal(r0.ok, 1);
    assert.equal(f.saves.length, 0, 'no difference ⇒ no request');
    const r = await save(f, 'bassam_plan_v1', (d) => { d.floors[0].name = 'TEST_ONLY · موقع جديد'; });
    assert.equal(r.ok, 1, JSON.stringify(r));
    assert.deepEqual(Object.keys(f.saves[0].body.set), [PL + '@']);
    assert.equal(f.S.heads[PL + '@'].floors[0].name, 'TEST_ONLY · موقع جديد');
    assert.deepEqual(f.S.heads[PL + '@'].months, {}, 'the head keeps the empty months placeholder');
  } finally { f.T.dispose(); }
});

test('a day save sends only that day; removing a shown day deletes that day only; a new day is written on revision 0', async () => {
  const f = client();
  try {
    await f.ops.read([RD]);
    let r = await save(f, 'bassam_rounds_v1', (d) => { d['1448-6-14'].t = 99; });
    assert.equal(r.ok, 1, JSON.stringify(r));
    assert.deepEqual(Object.keys(f.saves[0].body.set), [RD + '@1448-6-14']);
    r = await save(f, 'bassam_rounds_v1', (d) => { delete d['1448-6-13']; d['1448-6-15'] = { t: 4 }; });
    assert.equal(r.ok, 1, JSON.stringify(r));
    const b = f.saves[1].body;
    assert.deepEqual(Object.keys(b.set), [RD + '@1448-6-15']);
    assert.equal(b.base[RD + '@1448-6-15'], 0);
    assert.deepEqual(b.del, [RD + '@1448-6-13']);
    assert.deepEqual(f.S.periods[RD + '@1448-5-29'], { t: 1 }, 'the month not shown is untouched');
    assert.ok(!(RD + '@1448-6-13' in f.S.periods));
  } finally { f.T.dispose(); }
});

test('a period loaded after the page last read the document is never deleted by its absence', async () => {
  const f = client();
  try {
    await f.ops.read([PL]);
    const stale = copy(f.ops.get('bassam_plan_v1'));          /* what the page holds */
    await f.ops.want('bassam_plan_v1', { groups: ['1448-5'] }); /* loaded later, not yet read by the page */
    const d = f.ops.draft();
    stale.months['1448-6'].c = 1;
    d.set('bassam_plan_v1', stale);
    const r = await f.ops.flush(d.stage());
    assert.equal(r.ok, 1, JSON.stringify(r));
    assert.deepEqual(f.saves[0].body.del, [], 'the later month is not deleted');
    assert.deepEqual(Object.keys(f.saves[0].body.set), [PL + '@1448-6']);
    assert.deepEqual(f.S.periods[PL + '@1448-5'], { d: [site(5)] });
  } finally { f.T.dispose(); }
});

test('loading another month does not invalidate an open draft; a changed shown period does', async () => {
  const f = client();
  try {
    await f.ops.read([PL]);
    const d = f.ops.draft(); d.get('bassam_plan_v1');
    await f.ops.want('bassam_plan_v1', { groups: ['1448-5'] });
    const doc = d.get('bassam_plan_v1'); doc.months['1448-6'].c = 2; d.set('bassam_plan_v1', doc);
    const r = await f.ops.flush(d.stage());
    assert.equal(r.ok, 1, JSON.stringify(r));
    const d2 = f.ops.draft(); d2.get('bassam_plan_v1');
    f.S.rev[PL + '@1448-6'] = 90; f.S.periods[PL + '@1448-6'] = { d: [], TEST_ONLY: 'غيري' };   /* another editor changed the shown month */
    await f.ops.read([PL]);
    assert.throws(() => d2.get('bassam_plan_v1'), /operations-draft-review-required/, 'the draft built on the old month is refused, as before');
  } finally { f.T.dispose(); }
});

test('a conflict on a period is reported on the logical key (pages know their resource by name)', async () => {
  const f = client();
  try {
    await f.ops.read([RD]);
    f.S.rev[RD + '@1448-6-14'] = 77;   /* someone else saved that day */
    const d = f.ops.draft(), doc = d.get('bassam_rounds_v1'); doc['1448-6-14'].t = 5; d.set('bassam_rounds_v1', doc);
    const r = await f.ops.flush(d.stage());
    assert.equal(r.ok, 0); assert.equal(r.err, 'conflict');
    assert.deepEqual(Object.keys(r.details.conflicts), [RD]);
  } finally { f.T.dispose(); }
});

test('the daily report is read by day (today, yesterday, month control), not by month', async () => {
  const f = client();
  try {
    const r = await f.ops.read([DR]);
    assert.equal(r.ok, 1, JSON.stringify(r));
    const q = f.reads.find((x) => x.keys.includes(DR + '@'));
    assert.deepEqual(q.range, []);
    assert.deepEqual(q.keys.slice().sort(), [DR + '@', DR + '@1448-6-13', DR + '@1448-6-14', DR + '@m:1448-6'].sort());
    assert.deepEqual(Object.keys(copy(f.ops.get('bassam_dreport_v1'))).sort(), ['1448-6-13', '1448-6-14']);
    assert.equal(f.ops.period('bassam_dreport_v1', 'm:1448-6'), null, 'month control absent');
    assert.equal(f.ops.period('bassam_dreport_v1', '1448-6-12'), undefined, 'not loaded');
  } finally { f.T.dispose(); }
});

test('a month range over the read limit falls back to the shown days', async () => {
  const f = client();
  try {
    for (let i = 1; i <= 45; i++) f.S.periods[RD + '@1448-6-x' + i] = { t: i };   /* > 40 periods in the month (grp: 1448-6 by the TEST_ONLY server) */
    const r = await f.ops.read([RD]);
    assert.equal(r.ok, 1, JSON.stringify(r));
    const last = f.reads[f.reads.length - 1];
    assert.deepEqual(last.range, []);
    assert.ok(last.keys.includes(RD + '@1448-6-14') && last.keys.includes(RD + '@m:1448-6'));
  } finally { f.T.dispose(); }
});

test('a resource the reader may not see comes back denied without range or epoch; the other resources are still read', async () => {
  const f = client();
  try {
    f.S.deny = [DR];
    const r = await f.ops.read([PL, DR, E]);
    assert.equal(r.ok, 1, JSON.stringify(r));
    assert.equal(f.ops.state('bassam_dreport_v1'), 'denied');
    assert.equal(f.ops.state('bassam_plan_v1'), 'ready');
    assert.equal(f.ops.ready([PL, DR, E]), true, 'the page is ready (denied counts as answered)');
  } finally { f.T.dispose(); }
});
