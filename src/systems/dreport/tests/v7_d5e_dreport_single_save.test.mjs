/* V7 · د5-هـ (r4) — شرطُ المالك للمرحلة 2: «سحبُ» التقرير و«اعتمادُ الوردية» مشاركون داخل المسودة نفسِها — حفظٌ واحد ذرّي. بيانات TEST_ONLY.
   ① السحبُ (والمتابعة) واعتمادُ الوردية وفتحُها: طلبُ حفظٍ واحد يحمل وثيقةَ التقرير ومفتاحَ الجولات معاً بحضور الجولات — والقيمُ المكتوبة
      وترتيبُها حرفاً بحرف كما يكتبها الكودُ القديم (نسخةٌ حرفية منه داخل هذا الملف تُحقن في منطق الصفحة مكانَ الجديد)، والإشعارُ نفسُه.
   ② بغياب الجولات (لا مشارك): التقريرُ وحده يُحفظ، بلا إشعار جولة. وبإطفاء «الجولات» في الإدارة: كذلك.
   ③ مشاركٌ يرمي: التعديلُ كلُّه يفشل ولا يُرسل شيء.
   ④ تسكينُ موظفٍ من التقرير: أمرُ الجولات daily.spot.set@1 داخل مسودة التقرير يكتب ما كان يُكتب؛ وبغياب الجولات لا يُرسل شيء.
   ⑤ المصادر: صفحةُ التقرير لا تسمّي مفتاحَ الجولات ولا خدمتَها. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const copy = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const LOGIC = rd('src/systems/dreport/client/logic.js');
const Y = 1500, M = 3, D = 7, SHIFT = 'TEST_ONLY_S';

/* ── الكودُ القديم (src/systems/dreport/client/logic.js قبل د5-هـ · r4) حرفياً: يُحقن مكانَ الجديد ليُقارَن الناتجُ ── */
const SWAP = [
  [`                  const pulled = { y: this.state.rpY, m: this.state.rpM, d: this.state.rpD, shift: r };
                  KIVO.bus.participate("dreport.pulled@1", pulled, draft);   /* V7 · د5-هـ: الجولاتُ تُنشئ جولةَ اليوم في المسودة نفسِها وتكتب نتيجتَها في pulled.round */
                  this._drRoundResult = pulled.round || null;`,
   `                  this._drRoundResult = KIVO.BassamRound && this.bsOn("daily/rounds")
                    ? KIVO.BassamRound.prepareEnsure(draft, this.state.rpY, this.state.rpM, this.state.rpD) : null;`],
  [`                    const pulled = { y: this.state.rpY, m: this.state.rpM, d: this.state.rpD, shift: r, from: n.d };
                    KIVO.bus.participate("dreport.pulled@1", pulled, draft);   /* V7 · د5-هـ: كالسحب */
                    this._drRoundResult = pulled.round || null;`,
   `                    this._drRoundResult = KIVO.BassamRound && this.bsOn("daily/rounds")
                      ? KIVO.BassamRound.prepareEnsure(draft, this.state.rpY, this.state.rpM, this.state.rpD) : null;`],
  [`        const approval = { y: this.state.rpY, m: this.state.rpM, d: this.state.rpD, shift: e, value: !!t };
        KIVO.bus.participate("dreport.shiftApproved@1", approval, draft);   /* V7 · د5-هـ: الجولاتُ تعتمد جولةَ الوردية أو تفتحها في المسودة نفسِها ← approval.round */
        this._drRoundApproval = approval.round || null;`,
   `        if (KIVO.BassamRound && this.bsOn("daily/rounds")) {
          if (t) KIVO.BassamRound.prepareEnsure(draft, this.state.rpY, this.state.rpM, this.state.rpD);
          this._drRoundApproval = KIVO.BassamRound.prepareShiftAp(draft, this.state.rpY, this.state.rpM, this.state.rpD, e, t ? 1 : 0);
        }`],
  [`    /* V7 · د5-هـ: يومُ الجولة يكتبه مالكُه بأمرٍ معلن داخل مسودة التقرير (طلبٌ واحد) — بغيابه لا يُرسل شيء */
    const day = this.drRoundKey(), rec = t[day];
    return await this._drCommit(intent, draft => {
      const done = KIVO.bus.call("daily.spot.set@1", { day, rec }, draft);
      if (!done || done.ok !== 1) throw Error("rounds-absent");
    });`,
   `    return await this._drCommit(intent, draft => draft.set("bassam_rounds_v1", t));`],
  [`      const t = KIVO.bus.read("daily.days@1");   /* V7 · د5-هـ: أيامُ الجولات من مالكها — بغيابه undefined ⇒ {} (لا جولة) */`,
   `      const t = KIVO.__BS_SRV.operations.get("bassam_rounds_v1");`],
];
function oldLogic() {
  let s = LOGIC;
  for (const [now, was] of SWAP) { assert.equal(s.split(now).length, 2, 'المقطعُ الجديد موجودٌ مرّةً واحدة: ' + now.slice(0, 60)); s = s.replace(now, () => was); }
  return s;
}

function planDoc() {
  const floor = (n) => ({ sid: 'TEST_ONLY_S' + n, zones: [{ code: 'TEST_ONLY_Z' + n, count: 9, pc: { a: 1 }, emp: [] }], gates: [{ num: n, emp: [] }], marks: [], paths: [] });
  return { floors: [floor(0), floor(1)], months: { [Y + '-' + M]: { d: [floor(0), floor(1)] } } };
}
function baseStore({ round = false, pulled = false } = {}) {
  const day = Y + '-' + M + '-' + D, shifts = {};
  if (pulled) shifts[SHIFT] = { pulled: true, roster: [{ ekey: 'TEST_ONLY_E1', st: 'pr' }], leaders: { chief: '', deputy: '' }, def: null };
  const store = {
    bassam_dreport_v1: { [day]: { created: 1, shifts } },
    bassam_plan_v1: planDoc(),
    bassam_employees_v1: [{ eid: 'TEST_ONLY_E1', name: 'TEST_ONLY_A' }, { eid: 'TEST_ONLY_E2', name: 'TEST_ONLY_B' }],
    bassam_shift_options_v1: [{ name: SHIFT }],
    bassam_rounds_v1: { [Y + '-' + M + '-' + (D - 2)]: { t: 1, ap: 0, d: [{ sid: 'TEST_ONLY_S0', zones: [{ code: 'TEST_ONLY_old', emp: ['TEST_ONLY_E2'] }], gates: [], marks: [], paths: [] }] } },
  };
  if (round) store.bassam_rounds_v1[day] = { t: 1, ap: 0, d: [{ sid: 'TEST_ONLY_S0', zones: [{ code: 'TEST_ONLY_Z', emp: [] }], gates: [{ num: 3, emp: [] }], marks: [], paths: [] }] };
  return store;
}

/* عالمُ الصفحة: الناقل · التقويم · عُدّة الصفحات · (الخطة) · (الجولات: 420 + 421) · منطقُ التقرير. Operations: commit يشغّل التعديل على مسودةٍ
   ويرسل طلباً واحداً بما كُتب (بترتيبه) — وخطأُ التعديل يُفشل الحفظَ بلا إرسال، كما في 280-server-storage (operationCommit9). */
function world({ store, rounds = true, roundsOn = true, legacy = false, links = true, thrower = false } = {}) {
  const sends = [], acks = [], toasts = [], FIXED = Date.UTC(2030, 0, 2, 9, 41, 0);
  class FixedDate extends Date { constructor(...a) { super(...(a.length ? a : [FIXED])); } static now() { return FIXED; } }
  const operations = {
    get: (k) => (k in store ? copy(store[k]) : null),
    status: () => ({ state: 'idle' }),
    begin: () => ({ ok: 1 }),
    commit: async (owner, action, intent, edit) => {
      const set = new Map();
      const draft = { get: (k) => (set.has(k) ? copy(set.get(k)) : k in store ? copy(store[k]) : null), set: (k, v) => { set.delete(k); set.set(k, copy(v)); } };
      try { edit(draft); } catch (e) { return { ok: 0, err: 'review-required', status: 409 }; }
      sends.push({ intent: copy(intent), writes: [...set].map(([k, v]) => [k, JSON.stringify(v)]) });
      for (const [k, v] of set) store[k] = copy(v);
      return { ok: 1 };
    },
  };
  const KIVO = { BassamCount: (n, w) => n + " " + w, __BS_SRV: { operations }, BassamPerm: { on: (k) => (k === 'daily/rounds' ? roundsOn : true), can: () => true, lensOn: () => true } };
  const ctx = vm.createContext({ KIVO, console, Intl, Date: FixedDate, Math, JSON, Object, Array, Error, Map, Set, Promise, setTimeout, clearTimeout, isFinite, parseInt, String, Number });
  ctx.window = ctx; ctx.document = { getElementById: () => null, addEventListener() {}, removeEventListener() {} }; ctx.addEventListener = () => {}; ctx.removeEventListener = () => {};
  ctx.localStorage = { getItem: () => null, setItem() {} };
  ctx.DCLogic = class { constructor() { this.state = {}; this.props = {}; } setState(u, done) { const p = typeof u === 'function' ? u(this.state, this.props) : u; this.state = { ...this.state, ...(p || {}) }; if (done) done(); } };
  vm.runInContext(rd('src/core/060-bus.js'), ctx);
  vm.runInContext(rd('src/i18n/385-calendar.js'), ctx);
  vm.runInContext(rd('src/components/565-page-kit.js'), ctx);
  vm.runInContext(rd('src/systems/plan/client/404-plan-p4.js'), ctx);
  if (rounds) vm.runInContext(rd('src/systems/daily/client/420-round-factory.js'), ctx);
  if (rounds && links) vm.runInContext(rd('src/systems/daily/client/421-round-links.js'), ctx);
  if (thrower) KIVO.bus.participant(thrower, () => { throw Error('TEST_ONLY participant failure'); });
  const Component = vm.runInContext((legacy ? oldLogic() : LOGIC) + '\n;Component', ctx);
  const page = new Component();
  page.state = { ...page.state, rpY: Y, rpM: M, rpD: D };
  Object.assign(page, {
    bsAck: (t, k) => acks.push([t, k]), bsToast: (t, k) => toasts.push([t, k]),
    drDayShifts: () => [{ name: SHIFT, color: '#123456', tStart: '06', tEnd: '14' }], drMyShift: () => null, dayPastDS: () => false,
    drSchedApproved: () => true, drRosterOf: () => [{ ekey: 'TEST_ONLY_E1', name: 'TEST_ONLY_A' }], drShiftSig: () => 'TEST_ONLY_sig',
    rpMonthBucket: () => ({}), drRepPerm: () => ({}), rpEmps: () => store.bassam_employees_v1, rpKeyOf: (e) => e.eid,
  });
  return { page, sends, acks, toasts, store, KIVO };
}
const run = async (opts, act) => { const w = world(opts); const r = await act(w.page); return { r, sends: w.sends, acks: w.acks, toasts: w.toasts, page: w.page }; };
const both = async (opts, act) => [await run({ ...opts, store: opts.store() }, act), await run({ ...opts, store: opts.store(), legacy: true }, act)];
const keys = (s) => s.writes.map(([k]) => k);

test('① pull · continue-free pull · approve · open: ONE save carrying the report and the rounds key — byte-for-byte as the old code', async () => {
  const BOTH = ['bassam_dreport_v1', 'bassam_rounds_v1'], cases = [
    ['pull (round created from the plan)', () => baseStore(), (p) => p.rpPull(), BOTH],
    ['pull (round exists: nothing to add)', () => baseStore({ round: true }), (p) => p.rpPull(), ['bassam_dreport_v1']],
    ['approve (round created, then approved)', () => baseStore({ pulled: true }), (p) => p.drSetAp(true), BOTH],
    ['approve (round exists)', () => baseStore({ pulled: true, round: true }), (p) => p.drSetAp(true), BOTH],
    ['open (round exists)', () => baseStore({ pulled: true, round: true }), (p) => p.drSetAp(false), BOTH],
  ];
  for (const [name, store, act, want] of cases) {
    const [now, was] = await both({ store }, act);
    assert.equal(now.sends.length, 1, name + ': طلبُ حفظٍ واحد');
    assert.deepEqual(keys(now.sends[0]), want, name + ': التقريرُ ثم الجولات (في الطلب نفسِه)');
    assert.deepEqual(now.sends, was.sends, name + ': المكتوبُ وترتيبُه ونيّتُه حرفاً بحرف كالقديم');
    assert.deepEqual(now.acks, was.acks, name + ': الإشعاراتُ نفسُها');
    assert.deepEqual(now.toasts, was.toasts, name);
    assert.deepEqual(copy(now.page._drRoundResult), copy(was.page._drRoundResult), name + ': نتيجةُ إنشاء الجولة');
    assert.deepEqual(copy(now.page._drRoundApproval), copy(was.page._drRoundApproval), name + ': نتيجةُ اعتماد الجولة');
  }
  const pulled = await run({ store: baseStore() }, (p) => p.rpPull());
  assert.equal(pulled.page._drRoundResult.status, 'created');
  assert.ok(pulled.acks.some(([t]) => /أُنشئت جولة اليوم/.test(t)), 'إشعارُ إنشاء الجولة يصل من نتيجة المشارك');
  const ap = await run({ store: baseStore({ pulled: true, round: true }) }, (p) => p.drSetAp(true));
  assert.equal(ap.page._drRoundApproval.status, 'approved');
  assert.ok(ap.acks.some(([t]) => /اعتُمدت جولة/.test(t)));
});

test('② without the rounds participant (rounds absent, or switched off): the report saves alone, with no round notice', async () => {
  for (const opts of [{ rounds: false }, { links: false }, { roundsOn: false }]) {
    for (const [store, act] of [[() => baseStore(), (p) => p.rpPull()], [() => baseStore({ pulled: true }), (p) => p.drSetAp(true)], [() => baseStore({ pulled: true, round: true }), (p) => p.drSetAp(false)]]) {
      const now = await run({ ...opts, store: store() }, act);
      assert.equal(now.sends.length, 1, JSON.stringify(opts));
      assert.deepEqual(keys(now.sends[0]), ['bassam_dreport_v1'], 'التقريرُ وحده');
      assert.equal(now.page._drRoundResult || null, null); assert.equal(now.page._drRoundApproval || null, null);
      assert.ok(!now.acks.some(([t]) => /جولة/.test(t)), 'لا إشعارَ جولة');
      if (opts.rounds === false || opts.roundsOn === false) {
        const was = await run({ ...opts, store: store(), legacy: true }, act);
        assert.deepEqual(now.sends, was.sends, 'كالقديم حين لا خدمةَ جولات أو أُطفئت');
        assert.deepEqual(now.acks, was.acks);
      }
    }
  }
});

test('③ a participant that throws fails the whole edit — nothing is sent', async () => {
  for (const [name, store, act] of [['dreport.pulled@1', () => baseStore(), (p) => p.rpPull()], ['dreport.shiftApproved@1', () => baseStore({ pulled: true }), (p) => p.drSetAp(true)]]) {
    const now = await run({ store: store(), thrower: name }, act);
    assert.equal(now.sends.length, 0, name + ': لا طلب');
    assert.ok(now.toasts.some(([t]) => /لم يُحفظ التغيير/.test(t)), name + ': الصفحةُ تبلغ بالفشل');
    assert.ok(!now.acks.length, name + ': لا إشعارَ نجاح');
  }
});

test('④ spot toggle / set from the report: daily.spot.set@1 inside the report draft writes what was written; rounds absent ⇒ nothing sent', async () => {
  for (const act of [(p) => p.drToggleSpot('TEST_ONLY_E1', '0:zones:0', 'TEST_ONLY_A'), (p) => p.drToggleSpot('TEST_ONLY_E1', '0:gates:0', 'TEST_ONLY_A'), (p) => p.drSetSpot('TEST_ONLY_E1', '0:gates:0', 'TEST_ONLY_A'), (p) => p.drSetSpot('TEST_ONLY_E1', '', 'TEST_ONLY_A')]) {
    const [now, was] = await both({ store: () => baseStore({ round: true }) }, act);
    assert.equal(now.sends.length, 1);
    assert.deepEqual(keys(now.sends[0]), ['bassam_rounds_v1']);
    assert.deepEqual(now.sends, was.sends, 'حرفاً بحرف كالقديم');
    assert.deepEqual(now.acks, was.acks);
    const gone = await run({ rounds: false, store: baseStore({ round: true }) }, act);
    assert.equal(gone.sends.length, 0, 'بغياب الجولات لا يُرسل شيء');
    assert.ok(gone.toasts.some(([t]) => /لا توجد جولة/.test(t)));
  }
});

test('⑤ sources: the report names no rounds key or service; rounds take part through declared names', () => {
  const code = LOGIC.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(code, /bassam_rounds_v1|KIVO\.BassamRound/);
  const links = rd('src/systems/daily/client/421-round-links.js');
  for (const n of ['dreport.pulled@1', 'dreport.shiftApproved@1']) {
    assert.match(code, new RegExp('KIVO\\.bus\\.participate\\("' + n.replace('.', '\\.') + '"'));
    assert.match(links, new RegExp("bus\\.participant\\('" + n.replace('.', '\\.') + "'"));
  }
  const dr = JSON.parse(rd('src/systems/dreport/contract.json')), rounds = JSON.parse(rd('src/contracts/rounds.json'));
  assert.deepEqual(Object.keys(dr.provides.events), ['dreport.pulled@1', 'dreport.shiftApproved@1']);
  for (const n of ['daily.days@1', 'daily.resources@1', 'daily.spot.set@1']) assert.ok(dr.consumes[n] && dr.consumes[n].absent, n);
  assert.ok(rounds.provides.commands['daily.spot.set@1'] && rounds.provides.read['daily.resources@1']);
  for (const n of ['dreport.doc@1', 'dreport.resources@1']) assert.ok(rounds.consumes[n] && rounds.consumes[n].absent, n);
});
