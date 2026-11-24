/* V7 · 53 تقويم (calops · ف٣ ف٤ ف٥) — الأنظمة المرتبطة ميلادية في متصفحٍ حقيقي (المختبرُ المعزول · العاملُ الحقيقي · الإنفاذ · TEST_ONLY).
   لكل صفحة (الجولات · التقرير اليومي · الخطة · الجدول الشهري · المهام) بحساب مدير الإدارة:
   ① شريطُ الأشهر من الكرت المشترك وحده (KIVO.BassamCalCard.month): الشهرُ الجاري باسمه الميلادي («نوفمبر») وتحته المدى الهجري الصغير
      (BassamCal.hRangeOfMonth) — ولا كرتَ شهرٍ محلي (عنصرٌ بنمط الشريط القديم داخل الشريط).
   ② شريطُ الأيام (الجولات · التقرير · المهام) من الكرت المشترك وحده: عددُ الكروت = أيامُ الشهر الميلادي، وكرتُ اليوم ثلاثةُ أسطر:
      حرفُ اليوم · رقمُه الميلادي · الهجريُّ القصير (d/m).
   ③ حالتان فقط: data-cal-state ∈ {closed, open}، وكلُّ كرتٍ مغلق يحمل سببه الإداري في التلميح (title) لا في نصّه — وأيامُ الشهر الماضية مغلقة.
   قبل التحويل: لا data-cal-kind في أي صفحة (الكروتُ محلية) — والشهرُ هجريٌّ أساساً. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, LAB, openAs, chromium, until, A } from './d7_cov_lib.mjs';
import { replaceOperationalFixture } from '../unit/world_fx.mjs';

const pad = (n) => (n < 10 ? '0' : '') + n;
/* الصفحاتُ تعرض الأرقام بالأرقام العربية الهندية وبعلامات اتجاه (عُدّةُ العرض) — المقارنةُ على النصّ بعد توحيدها */
const norm = (t) => String(t || '').replace(/[\u2066-\u2069\u202a-\u202e\u200e\u200f]/g, '').replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660)).trim();
const G = (() => { const x = new Date(Date.now() + 3 * 3600e3); return { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate() }; })();   /* يومُ الرياض المدني */
const YM = G.y + '-' + pad(G.m), DK = YM + '-' + pad(G.d);
const PAGES = [
  { name: 'الجولات', hash: '#/daily', days: true, prep: `(() => { for (const h of document.querySelectorAll('.sc-host')) { const k = Object.keys(h).find((q) => q.startsWith('__reactFiber$')); let f = h[k]; while (f && !(f.stateNode && f.stateNode.logic && f.stateNode.logic._toggleDayLock)) f = f.return; if (f) { f.stateNode.logic.setState({ dsTab: 'rounds' }); return 1; } } return 0; })()` },
  { name: 'التقرير اليومي', hash: '#/dreport', days: true },
  { name: 'الخطة التشغيلية', hash: '#/plan', days: false },
  { name: 'الجدول الشهري', hash: '#/staffing', days: false },
  { name: 'المهام', hash: '#/tasks', days: true },
];

test('الأنظمة المرتبطة: الشهرُ الميلادي وسطرُه الهجري · كرتُ اليوم بثلاثة أسطر · حالتان فقط والسببُ في التلميح', { timeout: 600000 }, async () => {
  const lab = await world(), b = await chromium.launch();
  try {
    /* مهمةٌ واحدة TEST_ONLY اليوم — شريطُ أيام المهام يظهر لشهرٍ فيه مهام (hasMonthTasks) */
    const s0 = Date.now() + 3600e3;
    await replaceOperationalFixture(lab.env, 'bsdept:' + A + ':bassam_tasks_v1', { [DK]: [['TEST_ONLY مهمة التقويم', '', 'normal', 'pending', 'normal', 'مضافة', null, [], '', 'TEST_ONLY', 60, null, null, s0 - 7200e3, null, s0, s0 + 3600e3, null, null, null, null, null]] });
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw), p = m.page; p.setDefaultTimeout(15000);
    for (const P of PAGES) {
      await m.go(P.hash, 4000);
      if (P.prep) await until(() => p.evaluate(P.prep), P.name + ': page logic');
      const M = await until(() => p.evaluate((ym) => {
        const c = document.querySelector('[data-cal-kind="month"][data-cal-key="' + ym + '"]'); if (!c) return null;
        const C = KIVO.BassamCal, lines = [...c.querySelectorAll('[data-cal-line]')].map((x) => x.textContent);
        return { lines, want0: C.fmtMonthName(ym), range: C.hRangeOfMonth(ym), n: document.querySelectorAll('[data-cal-kind="month"]').length };
      }, YM), P.name + ': the current month card');
      assert.equal(M.n, 12, P.name + ': twelve month cards from the shared component');
      assert.equal(norm(M.lines[0]), M.want0, P.name + ': Gregorian month name first: ' + JSON.stringify(M));
      assert.ok(M.lines[1] && M.range.indexOf(norm(M.lines[1])) === 0, P.name + ': the small Hijri line under it: ' + JSON.stringify(M));
      if (P.days) {
        const D = await until(() => p.evaluate((dk) => {
          const all = [...document.querySelectorAll('[data-cal-kind="day"]')], c = document.querySelector('[data-cal-kind="day"][data-cal-key="' + dk + '"]'); if (!c) return null;
          const C = KIVO.BassamCal, ym = dk.slice(0, 7);
          return { n: all.length, want: C.gMonthDays(ym), lines: [...c.querySelectorAll('[data-cal-line]')].map((x) => x.textContent),
            exp: [C.gLetter(dk), String(+dk.slice(8)), String((C.hOf(dk) || {}).d)],   /* day_card_design: السطرُ الأسفل رقمُ اليوم الهجري */
            states: [...new Set(all.map((x) => x.getAttribute('data-cal-state')))].sort(),
            closedNoWhy: all.filter((x) => x.getAttribute('data-cal-state') === 'closed' && !/مغلق — (اعتُمد|أُغلق تلقائياً|أُغلق يدوياً|مضى)/.test(x.title)).map((x) => x.getAttribute('data-cal-key')),
            pastOpen: all.filter((x) => x.getAttribute('data-cal-key') < dk && x.getAttribute('data-cal-state') !== 'closed' && !/للاستدراك/.test(x.title)).map((x) => x.getAttribute('data-cal-key')),
            textHasReason: all.some((x) => /اعتُمد|أُغلق/.test(x.textContent)) };
        }, DK), P.name + ': the day strip');
        assert.equal(D.n, D.want, P.name + ': one card per Gregorian day of the month');
        assert.deepEqual(D.lines.map(norm), D.exp, P.name + ': letter · Gregorian day · Hijri line');
        assert.ok(D.states.every((s) => s === 'closed' || s === 'open'), P.name + ': only two states: ' + D.states);
        assert.deepEqual(D.closedNoWhy, [], P.name + ': every closed card says why in its tooltip');
        assert.deepEqual(D.pastOpen, [], P.name + ': past days are closed unless opened for retro');
        assert.equal(D.textHasReason, false, P.name + ': the reason is in the tooltip, not in the card text');
      }
    }
    assert.deepEqual(m.errs, []);
  } finally { await b.close(); await lab.close(); }
});

/* ④ الحفظُ من الصفحة يكتب مفاتيح ISO: إغلاقُ اليوم الجاري بيده في الجولات (dshut) ⇒ علامةُ الشهر m:YYYY-MM ورقمُ اليوم الميلادي — ولا مفتاحَ هجري */
test('الجولات: الحفظُ يكتب علامةَ الشهر ISO ويومَه الميلادي — ولا مفتاحَ هجري في المخزَّن', { timeout: 300000 }, async () => {
  const lab = await world(), b = await chromium.launch();
  try {
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw), p = m.page; p.setDefaultTimeout(15000);
    await m.go('#/daily', 4000);
    const L = PAGES[0].prep.replace("f.stateNode.logic.setState({ dsTab: 'rounds' }); return 1;", 'return f.stateNode.logic;').replace('return 0; })()', 'return null; })()');
    await until(() => p.evaluate('!!' + L), 'the rounds page logic');
    const res = p.waitForResponse((r) => /\/api\/save/.test(r.url()) && r.request().method() === 'POST');
    await p.evaluate(`${L}._toggleDayLock(${G.y}, ${G.m}, ${G.d}, true)`);
    const r = await res; assert.equal(r.status(), 200, 'the server accepts the save: ' + (await r.text()).slice(0, 300));
    await lab.idle();
    const KR = 'bsdept:' + A + ':bassam_rounds_v1', g = await m.api('/api/operations/read?keys=' + encodeURIComponent(KR)), R = (g.j.resources || {})[KR] || {};
    assert.ok(R['m:' + YM] && R['m:' + YM].dshut && R['m:' + YM].dshut[G.d] === 1, 'm:' + YM + ' carries the shut day: ' + JSON.stringify(R).slice(0, 300));
    assert.deepEqual(Object.keys(R).filter((k) => /^(m:)?1[3-5]\d\d-/.test(k)), [], 'no Hijri key stored');
    await p.evaluate(`${L}.setState({ dsTab: 'rounds' })`);
    const st = await until(() => p.evaluate((dk) => { const c = document.querySelector('[data-cal-kind="day"][data-cal-key="' + dk + '"]'); return c && c.getAttribute('data-cal-state') === 'closed' ? c.title : null; }, DK), 'today closed in the strip');
    assert.match(norm(st), /مغلق — أُغلق يدوياً/, 'the reason in the tooltip');
    assert.deepEqual(m.errs, []);
  } finally { await b.close(); await lab.close(); }
});
