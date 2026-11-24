/* V7 · 53 (لا شيء صامت · القاعدة 8) — فتحُ الصفحة لا يكتب. كانت صفحةُ «الجولات» تثبّت ورديةَ اليوم بحفظٍ تلقائيّ عند الفتح حين في تقرير اليوم
   ورديةٌ واحدة مسحوبة ولا ورديةَ مثبَّتة (POST /api/save لـ bassam_dayshift_v1 بلا فعلٍ من المستخدم) — وفي إدارةٍ معلّقة يردّ الخادمُ 503 فتظهر
   «لم يُحفظ تعديلك بعد (HTTP 503)» وحارسُ المغادرة؛ وكان وصولُ الخطة يُنشئ جولةَ اليوم تلقائياً (BassamRound.ensure).
   ① إدارةٌ بالأنظمة الأربعة عشر وتقريرُ اليوم فيه ورديةٌ واحدة مسحوبة: فتحُ كل صفحةٍ تشغيلية (وصفحاتِ الأنظمة الأخرى وصفحتي) ⇒ صفرُ /api/save وصفرُ كتابات
      /api/operations — مرةً والإدارةُ عاديّة، ومرةً وهي «معلّقة» (meta cal_pend) · ولا رسالةَ «لم يُحفظ».
   ② ورديةُ اليوم مشتقّةٌ للعرض من الدالة الواحدة (BassamDayShift.get) بلا كتابة · ③ الاختيارُ الصريح من الصفحة ما زال يحفظ (طلبٌ واحد بالمفتاح).
   المختبرُ المعزول · العاملُ الحقيقي · TEST_ONLY. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, LAB, openAs, chromium, A } from './d7_cov_lib.mjs';
import { replaceOperationalFixture } from '../unit/world_fx.mjs';

const pad = (n) => (n < 10 ? '0' : '') + n;
const dayOf = (ms) => { const x = new Date(ms); return x.getUTCFullYear() + '-' + pad(x.getUTCMonth() + 1) + '-' + pad(x.getUTCDate()); };
const CIVIL = dayOf(Date.now() + 3 * 3600e3), OPDAY = dayOf(Date.now());   /* يومُ الرياض المدني واليومُ التشغيلي (− 3 ساعات) */
const SHIFT = 'TEST_ONLY الأولى', rep = { shifts: { [SHIFT]: { pulled: true, roster: [] } } };
const PAGES = ['#/daily', '#/dreport', '#/plan', '#/staffing', '#/tasks', '#/dstats', '#/irshad', '#/seized', '#/award', '#/profile'];

async function openAll(pending) {
  const lab = await world(), b = await chromium.launch();
  await replaceOperationalFixture(lab.env, 'bsdept:' + A + ':bassam_dreport_v1', { [CIVIL]: rep, [OPDAY]: rep });
  if (pending) lab.env.DB.q("INSERT INTO meta(k,v) VALUES('cal_pend', ?1) ON CONFLICT(k) DO UPDATE SET v=excluded.v",
    JSON.stringify({ [A]: ['bassam_rounds_v1', 'bassam_rounds_arc_v1', 'bassam_plan_v1', 'bassam_dreport_v1', 'bassam_staffing_v3', 'bassam_tasks_v1', 'bassam_dayshift_v1'] }));
  const s = await openAs(b, lab, LAB.mgrA, LAB.pw), p = s.page, writes = [];
  p.on('request', (r) => { const u = new URL(r.url()).pathname; if (r.method() !== 'GET' && (/^\/api\/save/.test(u) || (/^\/api\/operations/.test(u) && !/\/read/.test(u)))) writes.push([s.at, r.method() + ' ' + u, (r.postData() || '').slice(0, 160)]); });
  return { lab, b, s, p, writes };
}

for (const pending of [false, true]) {
  test('فتحُ الصفحات لا يكتب — إدارة ' + (pending ? 'معلّقة' : 'عاديّة') + ' بالأنظمة الأربعة عشر وورديةٍ مسحوبة واحدة اليوم', { timeout: 600000 }, async () => {
    const W = await openAll(pending);
    try {
      for (const h of PAGES) { W.s.at = h; await W.s.go(h, 5000); }
      W.s.at = '#/daily'; await W.s.go('#/daily', 5000);
      assert.deepEqual(W.writes, [], 'لا حفظَ عند الفتح: ' + JSON.stringify(W.writes));
      assert.doesNotMatch(await W.p.evaluate(() => document.body.innerText), /لم يُحفظ تعديلك/);
      /* ② المشتقّة للعرض من الدالة الواحدة — بلا مفتاحٍ محفوظ */
      const D = await W.p.evaluate((d) => ({ got: KIVO.BassamDayShift.get(+d.slice(0, 4), +d.slice(5, 7), +d.slice(8)), stored: KIVO.BassamDayShift.all() }), CIVIL);
      assert.equal(D.got, SHIFT, 'ورديةُ التقرير الوحيدة تُعرض لليوم'); assert.deepEqual(D.stored, {}, 'ولا تُكتب');
      assert.deepEqual(W.s.errs, []);
    } finally { await W.b.close(); await W.lab.close(); }
  });
}

test('الاختيارُ الصريح لوردية اليوم من صفحة الجولات ما زال يحفظ — طلبٌ واحد بمفتاح اليوم', { timeout: 300000 }, async () => {
  const W = await openAll(false);
  try {
    W.s.at = '#/daily'; await W.s.go('#/daily', 5000);
    assert.deepEqual(W.writes, []);
    const r = await W.p.evaluate(async ([d, n]) => { let l = null; for (const h of document.querySelectorAll('.sc-host')) { const k = Object.keys(h).find((q) => q.startsWith('__reactFiber$')); let f = h[k]; while (f && !(f.stateNode && f.stateNode.logic && f.stateNode.logic._selectDayShift)) f = f.return; if (f) { l = f.stateNode.logic; break; } }
      return l ? await l._selectDayShift(+d.slice(0, 4), +d.slice(5, 7), +d.slice(8), n) : null; }, [CIVIL, SHIFT]);   /* اختيارُ الصفحة نفسُه (قائمةُ الورديات تستدعيه) */
    assert.ok(r && r.ok === 1, 'الاختيارُ قُبل: ' + JSON.stringify(r));
    assert.equal(W.writes.length, 1, JSON.stringify(W.writes)); assert.match(W.writes[0][2], new RegExp('bassam_dayshift_v1.*' + CIVIL));
    assert.equal(await W.p.evaluate((d) => KIVO.BassamDayShift.all()[d], CIVIL), SHIFT, 'المحفوظُ بعد الاختيار');
  } finally { await W.b.close(); await W.lab.close(); }
});
