/* V7 · 53 تقويم — REVIEW 22 (قبولُ تسليم الشركة): العيوبُ الأربعة التي وجدها إعادةُ المسح على integ — عرضٌ هجريٌّ وحده أو شهرٌ ميلادي موسومٌ بالهجري.
   ① الإحصائيات: محورُ «التحليلات» ومجموعاتُ الأسبوع والشهر لفترة يناير تقول «يناير» لا «محرم» (أشهرُ 565 صارت الميلادية).
   ② الإدارات والصلاحيات: انتهاءُ المنح المؤقّت يومٌ ميلادي ثم الهجريُّ المقابل.
   ③ الجدول الشهري: رسالةُ اعتماد 2026-11 «نوفمبر 2026» بلا «هـ».
   ④ «صفحتي» — سجلُّ المهمة: اليومُ الميلادي وتحته السطرُ الهجري (القاعدة 11).  TEST_ONLY. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const SRC = process.env.KIVO_SRC || new URL('../../src', import.meta.url).pathname;
const rd = (p) => fs.readFileSync(SRC + '/' + p, 'utf8');
function ctx(extra = {}) {
  const store = new Map(), toasts = [];
  const KIVO = { BassamPerm: { can: () => true, subOn: () => true, on: () => true }, BassamAuth: { user: () => ({ id: 'TEST_ONLY_u' }), display: () => ({ name: 'TEST_ONLY' }) },
    BassamDepts: { activeName: () => 'TEST_ONLY إدارة', active: () => 'TEST_ONLY_A' }, bus: { read: () => undefined, has: () => false }, ...extra };
  const C = { KIVO, DCLogic: class { constructor(p) { this.props = p || {}; this.state = {}; } setState(s) { this.state = { ...this.state, ...(typeof s === 'function' ? s(this.state) : s) }; } },
    console, Date, Intl, Math, JSON, setTimeout, clearTimeout, location: { hash: '', pathname: '/', search: '' }, history: {}, document: { getElementById: () => null, addEventListener() {} },
    addEventListener() {}, removeEventListener() {}, localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) } };
  C.window = C; C.globalThis = C; vm.createContext(C);
  for (const f of ['i18n/380-hijri-fallback.js', 'i18n/385-calendar.js', 'services/440-count.js', 'components/565-page-kit.js']) vm.runInContext(rd(f), C, { filename: f });
  return { C, KIVO, toasts };
}

test('REVIEW 22 ①: dstats Analytics — a January period shows «يناير» on the axis and in the week/month groups, never «محرم»', () => {
  const { C } = ctx();
  vm.runInContext(rd('systems/dstats/client/logic.js') + '\nglobalThis.TEST_ONLY_DS = Component;', C, { filename: 'dstats/logic.js' });
  const page = new C.TEST_ONLY_DS({});
  assert.equal(page.MONTHS[0], 'يناير'); assert.equal(page.MONTHS[10], 'نوفمبر');
  /* the three render sites read this list with Gregorian month numbers (1 = January) */
  const src = rd('systems/dstats/client/logic.js');
  const axis = /pts\.push\(\{ x:self\.MONTHS\[m-1\]/.test(src), week = /rng:ch\[0\]\.d\+" "\+self\.MONTHS\[ch\[0\]\.m-1\]/.test(src), month = /groups\.push\(\{ nm:self\.MONTHS\[m-1\], rng:self\.MONTHS\[m-1\]\+" "\+s\.anY/.test(src);
  assert.ok(axis && week && month, 'the axis, week and month groups take their names from page.MONTHS');
  const jan = { d: 5, m: 1, y: 2026 };
  assert.equal(page.MONTHS[jan.m - 1], 'يناير');
  assert.equal(jan.d + ' ' + page.MONTHS[jan.m - 1], '5 يناير', 'the week range of a January period');
  assert.doesNotMatch(page.MONTHS.join(' '), /محرم|صفر|رجب|شعبان|رمضان|شوال/);
  for (const k of ['MONTHS']) assert.equal(JSON.stringify(page[k]), JSON.stringify(C.KIVO.BassamCal.G_MONTHS));
  /* rendered: the coverage groups of the Analytics hero for a January period — month view (week ranges) and year view (month groups) */
  const days = [1, 2, 3].map((d) => ({ d, m: 1, y: 2026, k: '2026-01-0' + d, rec: { qaasideen: 100 * d } }));
  for (const anMode of ['y', 'm']) {
    page.state = { ...page.state, anMode, anY: 2026, anM: 1 };
    const A = {}; page._zHero('haram', days, A);
    const txt = JSON.stringify(A);
    assert.match(txt, /يناير/, anMode + ': «يناير» is shown');
    assert.doesNotMatch(txt, /محرم/, anMode + ': never «محرم»');
  }
});

test('REVIEW 22 ②: org temporary grant expiry — the Gregorian day, with the Hijri day as a small line under it', () => {
  const { C } = ctx();
  const src = rd('modules/org/logic-perm44.js'), m = /  _p44Day\(ms\) \{[\s\S]*?\n  \}/.exec(src), mh = /  _p44DayH\(ms\) \{[\s\S]*?\n  \}/.exec(src);
  assert.ok(m && mh, '_p44Day and _p44DayH exist');
  const P = vm.runInContext('({' + m[0].trim() + ', ' + mh[0].trim() + '})', C);
  const ms = Date.UTC(2026, 10, 24, 9, 0);   /* 24 Nov 2026, Riyadh */
  const k = C.KIVO.BassamCal.gAt(new Date(ms)).k;
  assert.equal(P._p44Day(ms), '24 نوفمبر 2026', 'the expiry date is Gregorian');
  assert.equal(P._p44DayH(ms), C.KIVO.BassamCal.hDayText(k) + ' هـ');
  assert.match(src, /metaH: x\.until \? this\._p44DayH\(x\.until\) : ""/);
  assert.match(rd('modules/org/view.html'), /<small>\{\{x\.meta\}\}<\/small><sc-if value="\{\{x\.metaH\}\}"[^>]*><small style="font-size:10px;opacity:\.85">\{\{x\.metaH\}\}<\/small><\/sc-if>/, 'a second small line under the meta line (.p44-ex small is display:block)');
});

test('REVIEW 22 ③: staff approve / reopen / delete for 2026-11 say «نوفمبر 2026» with no «هـ»', () => {
  const { C } = ctx();
  const src = rd('systems/staff/client/logic.js'), m = /  _stMonthName\(n\) \{[^\n]*\}/.exec(src);
  assert.ok(m);
  const P = vm.runInContext('({ MONTHS: KIVO.BassamCal.G_MONTHS.slice(), state: { year: 2026 }, ' + m[0].trim() + ' })', C);
  assert.equal(P._stMonthName(11), '«نوفمبر 2026»');
  assert.equal('اعتُمد جدول ' + P._stMonthName(11) + ' وأُقفل', 'اعتُمد جدول «نوفمبر 2026» وأُقفل');
  assert.doesNotMatch(P._stMonthName(11), /هـ/);
});

test('REVIEW 22 ④: «صفحتي» task history — Gregorian day with the small Hijri line under it (rule 11)', () => {
  const { C } = ctx();
  const frag = rd('systems/tasks/slots/profile.methods.2.tasks.frag'), m = /  _tkEv\(v\) \{[\s\S]*?\n  \}/.exec(frag);
  assert.ok(m);
  const P = vm.runInContext('({ MONTHS() { return KIVO.BassamCal.G_MONTHS.slice(); }, _tkHM() { return "09:00"; }, ' + m[0].trim() + ' })', C);
  const at = Date.UTC(2026, 10, 24, 9, 0), k = C.KIVO.BassamCal.gAt(new Date(at)).k;
  const ev = P._tkEv({ at, txt: 'TEST_ONLY', by: 'TEST_ONLY' });
  assert.match(ev.when, /^24 نوفمبر · 09:00/);
  assert.equal(ev.whenH, C.KIVO.BassamCal.hDayText(k) + ' هـ');
  assert.match(rd('systems/tasks/slots/profile.view.popups.tasks.frag'), /\{\{ev\.when\}\}<\/div><sc-if value="\{\{ev\.whenH\}\}"[^>]*><div style="font-size:9px[^"]*">\{\{ev\.whenH\}\}<\/div><\/sc-if>/, 'shown as a small line under the date');
});

test('REVIEW 22 ⑤: plan and staffing year card — the small line under 2026 is «1447 – 1448 هـ», not «2587 – 2588 م»', () => {
  const { C } = ctx();
  /* the trait both pages declare (plan+staff) — the real 565 method, without the pages' storage */
  assert.match(rd('systems/staff/client/logic.js'), /BassamPageKit\.base\(DCLogic, \[[^\]]*"plan\+staff"/);
  assert.match(rd('systems/plan/client/logic.js'), /BassamPageKit\.base\(DCLogic, \[[^\]]*"plan\+staff"/);
  const K = vm.runInContext('KIVO.BassamPageKit.base(DCLogic, ["plan+staff"])', C), page = new K({});
  assert.equal(page.gregYearRange(2026), '1447 – 1448 هـ');
  assert.doesNotMatch(page.gregYearRange(2026), /25\d\d|م$/);
});
