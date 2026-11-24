/* V7 · 53 (kpi · التخزين بالفترة) — مؤشراتُ «التشغيل اليومي» و«الإشغال» و«المصليات» على الفترة كلها بعد أن صارت الصفحةُ تحمّل الفترةَ المعروضة وحدها.
   عالمٌ بشكل S1 (500 موظف · 26 شهراً من الخطة والجدول · 60 يوماً من الجولات · 10 أيام من التقرير — TEST_ONLY) على منطق الصفحة الحقيقي
   (src/systems/daily/client/logic.js داخل node:vm). خادمٌ مزيّف بعقد الفترات (split · loaded · index · summary ← v.kpi):
     «كامل»  الصفحةُ تقرأ الوثائق كاملةً كما قبل التخزين بالفترة (المرجع: الحسابُ على التاريخ كله).
     «فترة»  الصفحةُ تحمّل شهرَ الجولات والجدول والخطة الحالي ويومَي التقرير، وما سواها من ملخّص الخادم.
   كلُّ لوحةٍ وكلُّ فترةٍ (الكل · شهرٌ ماضٍ · مدى مخصّص) يجب أن تساوي المرجعَ صفّاً صفّاً (الشريط والأرقام ونصّ اللوحة).
   DAILY_LOGIC=<مسار> يبدّل ملفَّ المنطق — على المنطق السابق تُحسب المؤشراتُ من المحمَّل وحده فيفشل الاختبار. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { ROOT } from './harness.mjs';
import { world } from './canvas_world.mjs';

const SRC = process.env.DAILY_LOGIC ? fs.readFileSync(process.env.DAILY_LOGIC, 'utf8') : undefined;
const SH = ['الوردية الأولى', 'الوردية الثانية', 'الوردية الثالثة', 'الوردية الرابعة', 'الوردية الخامسة'];
const DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
const PR = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const clone = (x) => JSON.parse(JSON.stringify(x));
let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const ri = (n) => Math.floor(rnd() * n);

/* بيانات العالم (حتمية) حول «اليوم» الهجري للصفحة */
function data(h) {
  seed = 7;
  const back = (k) => { let y = h.y, m = h.m - k; while (m < 1) { m += 12; y--; } return { y, m }; };
  const emps = Array.from({ length: 500 }, (_, i) => ({ eid: 'TEST_ONLY_e' + i, name: 'TEST_ONLY موظف ' + i, work: 'ميداني' }));
  const staffing = {}, plan = { floors: [], zones: [], gates: [], marks: [], paths: [], cfg: {}, delMonths: {}, months: {} };
  for (let k = 0; k < 26; k++) {
    const { y, m } = back(k), mo = {};
    emps.forEach((e, i) => { mo[e.eid] = { shift: SH[i % 5], rest: [DAYS[(i + k) % 7]] }; });
    staffing[y + '-' + m] = mo;
    plan.months[y + '-' + m] = { c: 1, d: [{ zones: Array.from({ length: 30 }, (_, z) => ({ code: 'Z' + z, needN: 1 + ((z + k) % 3) })), gates: [{ num: '1', label: 'TEST_ONLY_G1', needN: 2 }], marks: [{ label: 'TEST_ONLY_M', kind: 'k', needN: 1 }] }] };
  }
  const rounds = { __pMig: 3 }, dreport = {};
  const days = [];
  for (let k = 2; k >= 0; k--) { const { y, m } = back(k); const last = k ? 29 : Math.min(h.d, 29); for (let d = 1; d <= last; d++) days.push({ y, m, d }); }
  days.slice(-60).forEach(({ y, m, d }, n) => {
    const zones = Array.from({ length: 30 }, (_, z) => {
      const pc = {}; PR.forEach((p) => { if (rnd() < 0.7) pc[p] = { n: ri(400), cap: 200 + 10 * z }; });
      return { uid: 'TEST_ONLY_u' + z, code: z === 3 && n > 20 ? 'Z3b' : 'Z' + z, d: 'M0 0 L1 1', cx: 1, cy: 1, ztype: ['رجال', 'نساء'][z % 2], zcat: ['أ', 'ب', 'ج'][z % 3], yard: 'TEST_ONLY_Y' + (z % 4), region: 'R' + (z % 5), level: 'L1',
        off: rnd() < 0.1, cap: 200 + 10 * z, pc, emp: Array.from({ length: ri(3) }, () => 'TEST_ONLY_e' + ri(500)), fLog: [{ at: 1, st: 'open' }] };
    });
    const gates = [{ gid: 'TEST_ONLY_g1', num: '1', label: 'TEST_ONLY_G1', closed: rnd() < 0.3, cWhy: 'ازدحام شديد', cAt: '10:0' + ri(9), emp: ['TEST_ONLY_e' + ri(500)], x: 1, y: 1 }];
    const marks = [{ label: 'TEST_ONLY_M', kind: 'k', off: rnd() < 0.2, emp: [], x: 1, y: 1 }];
    rounds[y + '-' + m + '-' + d] = { ap: rnd() < 0.5, d: [{ zones, gates, marks, paths: [{ pts: [] }, { pts: [] }], img: 'TEST_ONLY_img' }], mvLog: [] };
    rounds['m:' + y + '-' + m] = { ap: false };
  });
  days.slice(-10).forEach(({ y, m, d }) => {
    const shifts = {};
    SH.slice(0, 3).forEach((s, j) => {
      const roster = emps.filter((_, i) => i % 5 === j).slice(0, 80).map((e) => ({ ekey: e.eid, name: e.name, st: ['pr', 'pr', 'pr', 'ab', 'pm', 'lv'][ri(6)] }));
      shifts[s] = { pulled: true, ap: rnd() < 0.5, roster, tout: rnd() < 0.3 ? { TEST_ONLY_e1: 1 } : {}, leaders: { chief: 'TEST_ONLY_e2' } };
    });
    dreport[y + '-' + m + '-' + d] = { created: true, shifts };
    dreport['m:' + y + '-' + m] = { ap: false };
  });
  return { emps, staffing, plan, rounds, dreport };
}
const RES = { rounds: 'bassam_rounds_v1', dreport: 'bassam_dreport_v1', staffing: 'bassam_staffing_v3', plan: 'bassam_plan_v1' };
const grpOf = (p) => { const m = /^(?:m:)?(\d+-\d+)/.exec(p); return m ? m[1] : p; };

/* الصفحة: mode = 'full' (كما قبل التخزين بالفترة) أو 'period' (المحمَّل + ملخّصاتُ الخادم) */
async function page(mode, sumOff) {
  const W = world(), c = W.logic('daily', SRC);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/systems/dreport/client/405-dreport-links.js'), 'utf8'), W.win, { filename: '405' });
  const h = c.hParts(new Date()), D = data(h), cur = h.y + '-' + h.m;
  const yd = (() => { const k = Object.keys(D.dreport).filter((x) => !/^m:/.test(x)).sort((a, b) => { const s = (x) => x.split('-').map(Number); const [p, q] = [s(a), s(b)]; return (p[0] - q[0]) * 1e4 + (p[1] - q[1]) * 100 + (p[2] - q[2]); }); return k.slice(-2); })();
  const periodsOf = { rounds: Object.keys(D.rounds).filter((k) => k !== '__pMig'), dreport: Object.keys(D.dreport), staffing: Object.keys(D.staffing), plan: Object.keys(D.plan.months) };
  const isLoaded = (r, p) => (r === 'dreport' ? yd.includes(p) || p === 'm:' + cur : grpOf(p) === cur);
  const view = {
    bassam_employees_v1: D.emps, bassam_shift_options_v1: SH.map((n) => ({ name: n, color: '#b99751' })),
    [RES.rounds]: mode === 'full' ? D.rounds : Object.fromEntries(Object.entries(D.rounds).filter(([k]) => k === '__pMig' || isLoaded('rounds', k))),
    [RES.dreport]: mode === 'full' ? D.dreport : Object.fromEntries(Object.entries(D.dreport).filter(([k]) => isLoaded('dreport', k))),
    [RES.staffing]: mode === 'full' ? D.staffing : Object.fromEntries(Object.entries(D.staffing).filter(([k]) => isLoaded('staffing', k))),
    [RES.plan]: mode === 'full' ? D.plan : Object.assign({}, D.plan, { months: Object.fromEntries(Object.entries(D.plan.months).filter(([k]) => isLoaded('plan', k))) }),
  };
  const full = { [RES.rounds]: D.rounds, [RES.dreport]: D.dreport, [RES.staffing]: D.staffing, [RES.plan]: D.plan.months };
  const short = Object.fromEntries(Object.entries(RES).map(([a, b]) => [b, a]));
  const reqs = [];
  const ops = {
    resources: Object.keys(view), state: () => 'ready', status: () => ({ state: 'idle', epoch: 0 }), rev: () => 0,
    get: (k) => clone(view[k]), text: (k) => JSON.stringify(view[k]), draft: () => ({ get: (k) => clone(view[k]), set() {} }),
    split: (n) => mode === 'period' && !!short[n],
    loaded: (n) => ({ groups: [cur], periods: periodsOf[short[n]].filter((p) => isLoaded(short[n], p)) }),
    index: async (n) => (reqs.push(['index', n]), { ok: 1, key: n, index: periodsOf[short[n]].map((p, i) => ({ p, grp: grpOf(p), seq: i, rev: 1 })) }),
    /* الملخّص كما يحسبه الخادم: v.kpi = الإسقاطُ نفسُه (_kLean) على قيمة الفترة المخزّنة */
    summary: async (n, q) => (reqs.push(['summary', n, q.groups.length]), { ok: 1, key: n, rows: periodsOf[short[n]].filter((p) => q.groups.includes(grpOf(p))).map((p, i) => ({ p, grp: grpOf(p), seq: i, rev: 1, v: sumOff ? { readings: 1 } : { kpi: c._kLean ? c._kLean(n, p, clone(full[n][p])) : undefined } })) }),
  };
  W.KIVO.__BS_SRV.operations = ops;
  W.KIVO.BassamDayShift = { get: () => '' };
  c._h2n = (x) => ({ html: x });
  c.state = Object.assign({}, c.state, { year: h.y, month: h.m, day: h.d, floor: 0, rounds: clone(view[RES.rounds]) });
  const vals = (st) => { c._opDrafts = null; c.state = Object.assign({}, c.state, st); return JSON.parse(JSON.stringify(c._dsKpiVals())); };
  vals({ dsKpiSub: 'ov' }); vals({ dsKpiSub: 'dy' });
  for (let i = 0; i < 30; i++) await new Promise((r) => setImmediate(r));   /* الفهرسُ والملخّصات */
  return { c, h, vals, reqs, D };
}
const CASES = (h) => {
  const pm = h.m > 1 ? h.m - 1 : 12, py = h.m > 1 ? h.y : h.y - 1;
  const out = [];
  for (const g of ['dy', 'ov', 'zn']) {
    out.push([g + ' · كل الفترة', { dsKpiSub: g, ['dsKpiYear_' + g]: 'all', ['dsKpiMode_' + g]: null }]);
    out.push([g + ' · شهرٌ ماضٍ', { dsKpiSub: g, ['dsKpiYear_' + g]: py, ['dsKpiMonth_' + g]: String(pm), ['dsKpiMode_' + g]: null }]);
    out.push([g + ' · مدى مخصّص', { dsKpiSub: g, ['dsKpiMode_' + g]: 'custom' }]);
  }
  return out;
};

test('المؤشرات على الفترة كلها = الحسابُ على التاريخ كله صفّاً صفّاً (عالمٌ بشكل S1 · المحمَّلُ شهرٌ واحد والباقي من ملخّص الخادم)', { timeout: 300000 }, async () => {
  const F = await page('full'), P = await page('period');
  for (const [name, st] of CASES(F.h)) {
    const a = F.vals(st), b = P.vals(st);
    assert.ok(a.dsTicker && a.dsTicker.length, name + ': للمرجع شريطُ مؤشرات');
    assert.deepEqual(b.dsTicker, a.dsTicker, name + ': الشريط صفّاً صفّاً');
    assert.deepEqual(b.dsKpiNode, a.dsKpiNode, name + ': اللوحة (كل الأرقام والنصوص)');
    assert.deepEqual(b, a, name + ': كلُّ قيم اللوحة (المحدِّدات والفترات)');
  }
  assert.ok(P.reqs.some((r) => r[0] === 'summary' && r[1] === RES.rounds), 'أيامُ الجولات غيرُ المحمَّلة من ملخّص الخادم');
  assert.ok(P.reqs.some((r) => r[0] === 'summary' && r[1] === RES.dreport), 'وأيامُ التقرير');
  assert.ok(P.reqs.every((r) => r[0] !== 'summary' || r[2] <= 26), 'كلُّ طلب ملخّصٍ ≤ 26 شهراً');
});

test('على المحمَّل وحده (ملخّصٌ بلا v.kpi) تختلف الأرقامُ عن الحساب على التاريخ كله — ويُسجَّل الحقلُ ناقصاً', { timeout: 300000 }, async () => {
  const F = await page('full'), P = await page('period', true);
  const st = { dsKpiSub: 'ov', dsKpiYear_ov: 'all', dsKpiMode_ov: null };
  assert.notDeepEqual(P.vals(st).dsTicker, F.vals(st).dsTicker, 'بلا ملخّصٍ تُعدّ الأيامُ المحمَّلة وحدها');
  assert.ok(P.c._kSumMiss && P.c._kSumMiss[RES.rounds], 'الحقلُ الناقص مسجَّل');
});
