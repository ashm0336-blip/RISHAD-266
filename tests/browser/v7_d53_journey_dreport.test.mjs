/* V7 · 53 (writers · 53-ج التقرير اليومي · صاحبُ الدور): رحلةُ الإطفاء والتشغيل ببياناتٍ قائمة — «المتابعة اليومية» و«المهام» مطفأتان، ومديرُ الإدارة
   يفتح «الأمس» للاستدراك (اعتمادُه) وينشئ تقريرَه، والموظفُ بدورٍ على التقرير ينشئ تقريرَ اليوم، كلٌّ بكاتب الصفحة الحقيقي (rpCreate ← rpSave · rpCarry)، فكلُّ حفظٍ ينجح، وبعد
   التشغيل وثيقةُ التقرير كما كانت إلا اليومين — والأيامُ الماضية بأشكالها القديمة (Production) مخزَّنةٌ كما هي. ثلاثة أوضاع: المختبر · نسخة Production · الجوال. */
import test from 'node:test';
import { setup, snapshot, off, actor, comp, settled, judge, clone, dkOf, DD } from './d53_journey_lib.mjs';
import { replaceOperationalFixture } from '../unit/world_fx.mjs';

const RES = 'bsdept:' + DD + ':bassam_dreport_v1';
const need = { skip: false };

for (const mode of ['lab', 'prod', 'mobile']) test('53 رحلة التقرير اليومي (' + mode + '): المتابعة والمهام مطفأتان ⇒ المديرُ وصاحبُ الدور ينشئان التقرير، والتشغيلُ يعيد كلَّ شيء', { timeout: 600000, ...need }, async (t) => {
  let days = [];
  const W = await setup({ mode, roleSys: { dreport: 'full', staff: 'view', emps: 'view' }, prep: async (W) => {
    if (W.H.d < 2) throw Error('اليومُ الأول من الشهر: لا «أمس» مفتوح');
    days = [W.H.d, W.H.d - 1];
    /* بياناتٌ قائمة: الوثيقةُ كما هي بلا اليومين اللذين سيُنشآن · ويومٌ ماضٍ بالشكل القديم (رمزُ المنسّق) */
    const doc = (await W.sa.api('/api/operations/read?keys=' + encodeURIComponent(RES))).j.resources[RES] || {};
    for (const d of days) delete doc[dkOf(W.H, d)];
    const pm = W.H.m > 1 ? W.H.y + '-' + (W.H.m - 1) + '-5' : (W.H.y - 1) + '-12-5';
    doc[pm] = { created: 1, shifts: { 'TEST_ONLY_S': { pulled: true, roster: [{ ekey: 'tst_demo_e11', st: 'pr' }], leaders: { chief: '', deputy: '', coord: 'TEST_ONLY' } } } };
    await replaceOperationalFixture(W.lab.env, RES, doc);
  } });
  try {
    const S0 = await snapshot(W), on = await off(W, { caps: ['daily', 'tasks'] }), made = [], opened = [];
    /* المدير: يفتح «الأمس» (اليومُ الماضي مقفلٌ لإنشاء تقريرٍ جديد — drToggleDayLock، اعتمادُه) ثم ينشئ تقريرَه · صاحبُ الدور: ينشئ تقريرَ اليوم */
    for (const [who, d] of [['mgr', days[1]], ['holder', days[0]]]) {
      const s = await actor(W, who);
      await comp(s, '#/dreport', 'rpCreate', '!!c.state && c.drDistShifts().length > 0');
      await s.page.evaluate((d) => new Promise((r) => window.__c.setState({ rpD: d }, r)), d);
      if (who === 'mgr') {
        const n1 = s.posts.length, ok = await s.page.evaluate(([y, m, d]) => window.__c.drToggleDayLock(y, m, d, false), [W.H.y, W.H.m, d]);
        if (ok !== true) throw Error('mgr: فتحُ الأمس ⇒ ' + JSON.stringify(ok));
        await settled(s, n1, mode + ' mgr day-open'); opened.push(d);
      }
      const n0 = s.posts.length;
      const msg = await s.page.evaluate(async () => { const c = window.__c, out = []; const o1 = c.bsToast, o2 = c.bsAck; c.bsToast = function (m) { out.push('toast:' + m); return o1 && o1.apply(this, arguments); }; c.bsAck = function (m) { out.push('ack:' + m); return o2 && o2.apply(this, arguments); }; await c.rpCreate(); return { out, dk: c.DK() }; });
      t.diagnostic(mode + ' ' + who + ' rpCreate: ' + JSON.stringify(msg));
      await settled(s, n0, mode + ' ' + who);
      made.push(dkOf(W.H, d));
      if (s.errs.length) throw Error(who + ' أخطاء صفحة: ' + s.errs.join(' · '));
      await s.ctx.close();
    }
    await on(); await W.lab.idle();
    judge(t, S0, await snapshot(W), (E) => {
      const v = clone(E.ops[RES].v) || {}, key = 'm:' + W.H.y + '-' + W.H.m;
      for (const d of opened) { const month = { ...(v[key] || {}) }, open = { ...(month.dopen || {}) }, shut = { ...(month.dshut || {}) }; delete shut[d]; open[d] = 1;
        Object.keys(open).length ? month.dopen = open : delete month.dopen; Object.keys(shut).length ? month.dshut = shut : delete month.dshut; v[key] = month; }
      for (const k of made) v[k] = { created: 1, shifts: {} };
      E.ops[RES] = { s: 200, v };
    });
  } finally { await W.close(); }
});
