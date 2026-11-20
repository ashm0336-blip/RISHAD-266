/* V7 · د5-هـ (p4) — روابطُ التشغيل الميداني بالجولات والتقرير اليومي عبر الناقل. بيانات TEST_ONLY.
   ① أوامرُ الجولات (rounds.sites.patch · month.clear · site.remove · sites.pad) تكتب ما كانت صفحةُ الخطة تكتبه في أيام الجولات بنفسها — حرفاً بحرف
      (نسخٌ مرجعية من الكود القديم)، داخل مسودة المستدعي، وبقاعدة «اليومَ فصاعداً غيرَ المعتمد».
   ② أوامرُ الخطة (plan.doc.set · zoneOpts.set · gateOpts.set) تكتب ما كانت صفحةُ الجولات تضمّه إلى حفظها ({ ...related, مفتاح: قيمة }) — بلا قراءةٍ قبلها.
   ③ القراءاتُ المعلنة (plan.doc · zoneOpts · gateOpts · rounds.days) بطريق القراءة نفسِه: قارئُ الصفحة · المسودة · Operations — ورميُها كما كان.
   ④ بغياب المالك: القراءةُ undefined · الأمرُ { ok:0, absent:1 } · ولا يُكتب شيء.
   ⑤ المصادر: صفحةُ الخطة لا تسمّي مفتاحَ الجولات ولا خدمتَها، والجولاتُ والتقريرُ لا يسمّون مفاتيحَ الخطة. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const copy = (v) => JSON.parse(JSON.stringify(v));
const same = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m);   /* قيمٌ من سياق vm (نموذجٌ أوّلي آخر) */

function client({ store = {}, plan = true, rounds = true } = {}) {
  const KIVO = { __BS_SRV: { operations: { get: (k) => { if (k === 'TEST_ONLY_denied') throw Error('denied'); return k in store ? copy(store[k]) : null; } } }, BassamPerm: { lensOn: (k) => k !== 'marks' } };
  const ctx = vm.createContext({ KIVO, console, Intl, Date, Math, JSON, Object, Array, Error });
  vm.runInContext(rd('src/i18n/385-calendar.js'), ctx);
  vm.runInContext(rd('src/core/060-bus.js'), ctx);
  vm.runInContext(rd('src/systems/daily/client/420-round-factory.js'), ctx);
  if (rounds) vm.runInContext(rd('src/systems/daily/client/421-round-links.js'), ctx);
  if (plan) vm.runInContext(rd('src/systems/plan/client/404-plan-p4.js'), ctx);
  return { KIVO, ctx, bus: KIVO.bus };
}
/* مسودةُ صفحةٍ كما في صفحة الخطة: القراءةُ من مسودة الصفحة (نسخةٌ واحدة تُعدَّل في مكانها) والكتابةُ في «المرافقات» related */
function pageDraft(store) {
  const cache = {}, reads = [];
  return { cache, reads, read: (k) => { reads.push(k); return k in cache ? cache[k] : (cache[k] = k in store ? copy(store[k]) : null); } };
}
/* ── نسخٌ مرجعية من الكود القديم (src/systems/plan/client/logic.js قبل د5-هـ) ── */
function oldKeyNow(KIVO, key) {
  try {
    const now = KIVO.BassamCal.hPartsRiyadh(new Date()), m = /^(?:m:)?(\d+)-(\d+)(?:-(\d+))?$/.exec(String(key));
    if (!m) return !1;
    const y = +m[1], mo = +m[2], d = null == m[3] ? null : +m[3];
    return y !== now.y ? y > now.y : mo !== now.m ? mo > now.m : null == d || d >= now.d;
  } catch (e) { return !1; }
}
function oldPurge(KIVO, opRead, related, site) {
  const rounds = opRead('bassam_rounds_v1');
  if (rounds && typeof rounds === 'object') {
    let changed = false;
    Object.keys(rounds).forEach((key) => {
      const rec = rounds[key];
      if (rec && Array.isArray(rec.d) && !rec.ap && oldKeyNow(KIVO, key)) {
        rec.d = rec.d.map((floor) => { if (!floor || floor.ap) return floor; changed = true; return site(floor); });
      }
    });
    if (changed) related = { ...related, bassam_rounds_v1: rounds };
  }
  return related;
}
function oldMonthClear(opRead, _opRelated, t) {
  try {
    const e = opRead('bassam_rounds_v1');
    if (e && 'object' == typeof e) {
      const s = t.y + '-' + t.m + '-';
      let n = !1;
      (Object.keys(e).forEach((a) => { (0 !== a.indexOf(s) && a !== 'm:' + t.y + '-' + t.m) || (delete e[a], (n = !0)); }), n && (_opRelated.bassam_rounds_v1 = e));
    }
  } catch (t) {}
}
function oldSiteRemove(opRead, _opRelated, t) {
  try {
    const e = opRead('bassam_rounds_v1');
    e && 'object' == typeof e && (Object.keys(e).forEach((s) => { const n = e[s]; n && Array.isArray(n.d) && n.d.length > t.i && n.d.splice(t.i, 1); }), (_opRelated.bassam_rounds_v1 = e));
  } catch (t) {}
}
function oldSitesPad(KIVO, opRead, _opRelated, a) {
  try {
    const t = opRead('bassam_rounds_v1');
    if (t && 'object' == typeof t) {
      let e = !1;
      (Object.keys(t).forEach((s) => {
        const n = t[s];
        if (n && Array.isArray(n.d) && !n.ap && oldKeyNow(KIVO, s))
          for (; n.d.length < a.length; ) (n.d.push({ zones: [], gates: [], marks: [], paths: [], sid: (a[n.d.length] || {}).sid }), (e = !0));
      }), e && (_opRelated.bassam_rounds_v1 = t));
    }
  } catch (t) {}
}
/* أيامُ جولاتٍ حول اليوم: ماضٍ · اليوم · قادم · معتمد · موقعٌ معتمد · علاماتُ شهر — ليُختبر حدُّ «اليومَ فصاعداً» */
function roundsAround(KIVO) {
  const now = KIVO.BassamCal.hPartsRiyadh(new Date()), site = (n) => ({ sid: 'TEST_ONLY_S' + n, zones: [{ region: 'TEST_ONLY_R', level: 'TEST_ONLY_L' }], gates: [{ loc: 'TEST_ONLY loc', cats: ['TEST_ONLY_C'] }], marks: [], paths: [] });
  const y = now.y, m = now.m, d = now.d, past = (y - 1) + '-' + m + '-' + d, today = y + '-' + m + '-' + d, next = (y + 1) + '-1-1';
  return {
    [past]: { d: [site(0), site(1)] },
    [today]: { d: [site(0), { ...site(1), ap: 1 }] },
    [next]: { d: [site(0), site(1)] },
    [(y + 1) + '-1-2']: { ap: 1, d: [site(0), site(1)] },
    ['m:' + y + '-' + m]: { ap: 0 },
    ['m:' + (y - 1) + '-' + m]: { ap: 0 },
    [(y + 1) + '-1-3']: { d: [site(0)] },
    [y + '-' + m + '-x']: null,
    TEST_ONLY_junk: { d: 'no' },
  };
}

test('① rounds commands write exactly what the Plan page used to write into the rounds days itself', () => {
  const c = client(), store = { bassam_rounds_v1: roundsAround(c.KIVO) };
  const purgeSite = (floor) => ({ ...floor, zones: (floor.zones || []).map((z) => ({ ...z, region: '' })), gates: (floor.gates || []).map((g) => ({ ...g, loc: '', cats: [] })) });
  /* daily.sites.patch@1 = _purgeOptEverywhere (الجزءُ الخاص بالجولات) — related يُستبدل بنسخةٍ جديدة كما كان */
  for (const site of [purgeSite, (f) => f]) {
    const a = pageDraft(store), b = pageDraft(store), base = { bassam_gate_opts_v1: { loc: [] } };
    const want = oldPurge(c.KIVO, a.read, base, site);
    let related = base;
    const r = c.bus.call('daily.sites.patch@1', { site }, { get: (k) => b.read(k), set: (k, v) => (related = { ...related, [k]: v }) });
    assert.equal(r.ok, 1);
    same(related, want); assert.deepEqual(Object.keys(related), Object.keys(want), 'ترتيبُ المفاتيح كما كان');
    assert.equal(JSON.stringify(related), JSON.stringify(want), 'البايتاتُ نفسُها');
    assert.notEqual(related, base, 'لا يُعدَّل كائنُ المستدعي'); assert.deepEqual(base, { bassam_gate_opts_v1: { loc: [] } });
    same(b.cache, a.cache, 'مسودةُ الصفحة تُعدَّل في مكانها كما كانت'); assert.deepEqual(b.reads, a.reads);
  }
  { const a = pageDraft(store), want = oldPurge(c.KIVO, a.read, {}, purgeSite);
    const days = want.bassam_rounds_v1, now = c.KIVO.BassamCal.hPartsRiyadh(new Date());
    assert.equal(days[(now.y - 1) + '-' + now.m + '-' + now.d].d[0].gates[0].loc, 'TEST_ONLY loc', 'الماضي لا يُمسّ');
    assert.equal(days[now.y + '-' + now.m + '-' + now.d].d[0].gates[0].loc, '', 'اليومُ يُنقّى');
    assert.equal(days[now.y + '-' + now.m + '-' + now.d].d[1].gates[0].loc, 'TEST_ONLY loc', 'الموقعُ المعتمد لا يُمسّ');
    assert.equal(days[(now.y + 1) + '-1-2'].d[0].gates[0].loc, 'TEST_ONLY loc', 'اليومُ المعتمد لا يُمسّ'); }
  /* daily.month.clear@1 = planDelDo · daily.site.remove@1 = delFloorDo · daily.sites.pad@1 = siteModalSave (إضافة) */
  const now = c.KIVO.BassamCal.hPartsRiyadh(new Date());
  const cases = [
    ['daily.month.clear@1', (t) => ({ y: t.y, m: t.m }), (rel, read, t) => oldMonthClear(read, rel, t), [{ y: now.y, m: now.m }, { y: now.y - 1, m: now.m }, { y: 1300, m: 1 }]],
    ['daily.site.remove@1', (t) => ({ index: t.i }), (rel, read, t) => oldSiteRemove(read, rel, t), [{ i: 0 }, { i: 1 }, { i: 5 }]],
    ['daily.sites.pad@1', (a) => ({ sites: a }), (rel, read, a) => oldSitesPad(c.KIVO, read, rel, a), [[{ sid: 'A' }, { sid: 'B' }, { sid: 'TEST_ONLY_NEW' }], [{ sid: 'A' }], [{}, {}, {}, { sid: 'D' }]]],
  ];
  for (const [name, payload, old, inputs] of cases)
    for (const input of inputs) {
      const a = pageDraft(store), b = pageDraft(store), want = {}, got = {};
      old(want, a.read, input);
      const r = c.bus.call(name, payload(input), { get: (k) => b.read(k), set: (k, v) => (got[k] = v) });
      assert.equal(r.ok, 1, name);
      assert.equal(JSON.stringify(got), JSON.stringify(want), name + ' ' + JSON.stringify(input));
      same(b.cache, a.cache, name + ': المسودةُ نفسُها');
    }
  /* بلا وثيقة جولات: كما كان — لا كتابة */
  for (const [name, payload] of [['daily.sites.patch@1', { site: (f) => f }], ['daily.month.clear@1', { y: 1, m: 1 }], ['daily.site.remove@1', { index: 0 }], ['daily.sites.pad@1', { sites: [{}] }]]) {
    const got = {}; c.bus.call(name, payload, { get: () => null, set: (k, v) => (got[k] = v) }); assert.deepEqual(got, {}, name);
    assert.throws(() => c.bus.call(name, payload), /bus-draft-required/, name + ' يطلب مسودة');
  }
});

test('② plan commands write what the rounds page used to fold into its own save — without reading first', () => {
  const c = client(), value = { floors: [{ sid: 'TEST_ONLY_SITE' }], months: {} };
  for (const [name, key] of [['plan.doc.set@1', 'bassam_plan_v1'], ['plan.zoneOpts.set@1', 'bassam_zone_opts_v1'], ['plan.gateOpts.set@1', 'bassam_gate_opts_v1']])
    for (const related of [{}, { bassam_rounds_v1: { x: 1 } }, { [key]: 'TEST_ONLY_old', bassam_rounds_v1: {} }]) {
      const want = { ...related, [key]: value }, reads = [];
      const out = { ...related };   /* _opWith في صفحة الجولات */
      const r = c.bus.call(name, { value }, { get: (k) => (reads.push(k), null), set: (k, v) => (out[k] = v) });
      assert.equal(r.ok, 1);
      assert.equal(JSON.stringify(out), JSON.stringify(want), name);
      assert.deepEqual(reads, [], name + ': لا قراءةَ قبل الكتابة (من لم يقرأ يُرفض حفظُه كما كان)');
      assert.throws(() => c.bus.call(name, { value }), /bus-draft-required/);
    }
  /* صفحةُ الجولات: مساعداتُ الحفظ نفسُها في مصدرها */
  const daily = rd('src/systems/daily/client/logic.js.tpl');
  assert.match(daily, /_opWith\(related, command, payload\) \{\s*const out = \{ \.\.\.related \};\s*KIVO\.bus\.call\(command, payload, this\._opSink\(out\)\);\s*return out;/);
});

test('③ declared reads use the caller\'s own reading path and fail the same way', () => {
  const store = { bassam_plan_v1: { floors: [{ sid: 'P' }] }, bassam_zone_opts_v1: { region: ['R'] }, bassam_gate_opts_v1: { loc: ['L'] }, bassam_rounds_v1: { '1448-1-1': { d: [] } } }, c = client({ store });
  for (const [name, key] of [['plan.doc@1', 'bassam_plan_v1'], ['plan.zoneOpts@1', 'bassam_zone_opts_v1'], ['plan.gateOpts@1', 'bassam_gate_opts_v1'], ['daily.days@1', 'bassam_rounds_v1']]) {
    const page = pageDraft(store);
    assert.equal(c.bus.read(name, page.read), page.read(key), name + ': قارئُ الصفحة (النسخةُ نفسُها)');
    assert.deepEqual(page.reads, [key, key]);
    const seen = []; assert.deepEqual(c.bus.read(name, { get: (k) => (seen.push(k), store[k]) }), store[key]); assert.deepEqual(seen, [key], name + ': المسودة');
    assert.deepEqual(c.bus.read(name), store[key], name + ': Operations');
    assert.throws(() => c.bus.read(name, () => { throw Error('operations-review-required'); }), /operations-review-required/, name + ': يرمي ما كان يرميه');
  }
  delete c.KIVO.__BS_SRV; assert.throws(() => c.bus.read('plan.doc@1'), /operations-read-required/);
  same(client().bus.read('plan.resources@1'), ['bassam_plan_v1', 'bassam_zone_opts_v1', 'bassam_gate_opts_v1']);
  same(client().bus.read('plan.resources@1', 'doc', 'zoneOpts'), ['bassam_plan_v1', 'bassam_zone_opts_v1']);
  /* العدساتُ = خدمةُ الجولات نفسُها */
  const sites = [{ zones: [{ emp: ['e'] }], gates: [{}], marks: [{}], paths: [{}] }], k = client();
  same(k.bus.read('daily.lensFilter@1', copy(sites)), k.KIVO.BassamRound.lensFilter(copy(sites)));
  same(k.bus.read('daily.lensFilter@1', copy(sites))[0].marks, [], 'عدسةُ المعالم مطفأة');
  same(k.bus.read('daily.names@1'), { bassam_rounds_v1: 'الجولات اليومية' });
  /* الجولةُ الأولى في الشهر من خطة الشهر عبر plan.doc@1 داخل مسودة المصنع — وبغياب الخطة «noplan» */
  const month = { bassam_rounds_v1: {}, bassam_plan_v1: { floors: [{ sid: 'TEST_ONLY_SITE' }], months: { '1448-1': { d: [{ zones: [], gates: [], marks: [], paths: [] }] } } } };
  const draft = (s) => ({ get: (x) => copy(s[x]), set() {} });
  assert.equal(client().KIVO.BassamRound.prepareEnsure(draft(month), 1448, 1, 4).status, 'created');
  assert.equal(client({ plan: false }).KIVO.BassamRound.prepareEnsure(draft(month), 1448, 1, 4).status, 'noplan');
});

test('④ owner absent: reads are undefined, commands report absence, nothing is written', () => {
  const store = { bassam_plan_v1: { floors: [] }, bassam_rounds_v1: { '1500-1-1': { d: [{}] } } };
  for (const [opts, names] of [[{ plan: false }, ['plan.doc@1', 'plan.zoneOpts@1', 'plan.gateOpts@1', 'plan.resources@1', 'plan.doc.set@1', 'plan.zoneOpts.set@1', 'plan.gateOpts.set@1']],
    [{ rounds: false }, ['daily.days@1', 'daily.lensFilter@1', 'daily.names@1', 'daily.sites.patch@1', 'daily.month.clear@1', 'daily.site.remove@1', 'daily.sites.pad@1']]]) {
    const c = client({ store, ...opts });
    for (const n of names) {
      const written = {}, read = [];
      const sink = { get: (k) => (read.push(k), store[k]), set: (k, v) => (written[k] = v) };
      if (/\.set@1$|\.(?:patch|clear|remove|pad)@1$/.test(n)) same(c.bus.call(n, { value: 1, site: (f) => f, y: 1500, m: 1, index: 0, sites: [{}, {}] }, sink), { ok: 0, absent: 1 }, n);
      else assert.equal(c.bus.read(n, sink), undefined, n);
      assert.deepEqual(written, {}, n + ': لا كتابة'); assert.deepEqual(read, [], n + ': لا قراءة');
      assert.equal(c.bus.has(n), false);
    }
  }
});

test('⑤ sources: Plan names no rounds key or service; rounds and the daily report name no Plan key', () => {
  const plan = rd('src/systems/plan/client/logic.js');
  assert.doesNotMatch(plan, /bassam_rounds_v1|KIVO\.BassamRound|_roundKeyNow/);
  for (const n of ['daily.sites.patch@1', 'daily.month.clear@1', 'daily.site.remove@1', 'daily.sites.pad@1', 'daily.days@1', 'daily.lensFilter@1', 'daily.names@1']) assert.ok(plan.includes('"' + n + '"'), n);
  for (const f of ['src/systems/daily/client/logic.js.tpl', 'src/systems/daily/client/logic.js', 'src/systems/daily/client/420-round-factory.js', 'src/systems/daily/client/421-round-links.js', 'src/systems/daily/client/520-field-monitor.js', 'src/systems/dreport/client/logic.js'])
    assert.doesNotMatch(rd(f), /bassam_(?:plan|zone_opts|gate_opts)_v1/, f);
  const contract = JSON.parse(rd('src/systems/plan/contract.json')), rounds = JSON.parse(rd('src/contracts/rounds.json'));
  /* د5-هـ (r4): وأمرُ الجولات للتقرير اليومي (daily.spot.set@1) يعلن غيابَه مستهلكُه — عقدُ التقرير */
  const dreport = JSON.parse(rd('src/systems/dreport/contract.json'));
  for (const n of Object.keys(rounds.provides.commands)) assert.ok((contract.consumes[n] && contract.consumes[n].absent) || (dreport.consumes[n] && dreport.consumes[n].absent), n);
  /* د5-هـ (دمج p3): كلُّ أمرٍ للخطة له مستهلكٌ أعلن غيابَه — الجولات (عقدها)، أو عُدّةُ الصفحات في القاعدة (_base.json ← consumes) لأمر أنواع المعالم */
  const base = JSON.parse(rd('src/contracts/_base.json')).consumes || {};
  for (const n of Object.keys(contract.provides.commands)) assert.ok((rounds.consumes[n] && rounds.consumes[n].absent) || (base[n] && base[n].absent), n);
  assert.deepEqual(contract.readResources['plan.doc@1'], ['bassam_plan_v1']); assert.deepEqual(rounds.readResources['daily.days@1'], ['bassam_rounds_v1']);
});
