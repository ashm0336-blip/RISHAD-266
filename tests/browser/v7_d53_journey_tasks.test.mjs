/* V7 · 53 (writers · 53-ج المهام): رحلةُ الإطفاء والتشغيل ببياناتٍ قائمة — «الجدول الشهري» و«التقرير اليومي» مطفأان، ومديرُ الإدارة وموظفٌ بدور
   يعدّلان عنوانَ مهمةٍ في يومٍ مفتوح من الشهر الجاري بكاتب الصفحة الحقيقي (mutateStore من نسخة الخادم)، فكلُّ حفظٍ ينجح، وبعد التشغيل كلُّ موردٍ
   للوحدة كما كان إلا التعديلين. ثلاثة أوضاع: المختبر · نسخةٌ بشكل Production مستوردة (مديرُ المنصة) · الجوال. TEST_ONLY. */
import test from 'node:test';
import { setup, snapshot, off, actor, comp, settled, judge, clone, DD } from './d53_journey_lib.mjs';

const RES = 'bsdept:' + DD + ':bassam_tasks_v1';
/* عنوانُ المهمة رقم a.i في آخر يومٍ ذي مهامّ من الشهر الجاري حتى اليوم */
const MUT = (t, a) => {
  const days = Object.keys(t).filter((k) => { const p = k.split('-').map(Number); return p.length === 3 && p[0] === a.y && p[1] === a.m && p[2] <= a.d && Array.isArray(t[k]) && t[k].length; }).sort((x, z) => +x.split('-')[2] - +z.split('-')[2]);
  const k = days[days.length - 1]; if (!k) throw Error('no-open-day-with-tasks');
  const rows = t[k].map((r) => r.slice()), q = Math.min(a.i, rows.length - 1);
  rows[q][0] = String(rows[q][0] || '') + ' · ' + a.tag; t[k] = rows; return t;
};

for (const mode of ['lab', 'prod', 'mobile']) test('53 رحلة المهام (' + mode + '): الجدول والتقرير مطفأان ⇒ المديرُ وصاحبُ الدور يحفظان، والتشغيلُ يعيد كلَّ شيء', { timeout: 600000 }, async (t) => {
  const W = await setup({ mode, roleSys: { tasks: 'full', daily: 'view', emps: 'view' } });
  try {
    const S0 = await snapshot(W), on = await off(W, { caps: ['staff', 'dreport'] }), edits = [];
    for (const [who, i] of [['mgr', 0], ['holder', 1]]) {
      const s = await actor(W, who), a = { y: W.H.y, m: W.H.m, d: W.H.d, i, tag: 'TEST_ONLY ' + who };
      await comp(s, '#/tasks', 'mutateStore', '!!c.state');
      const n0 = s.posts.length;
      const r = await s.page.evaluate(async ([src, a]) => { const f = (0, eval)('(' + src + ')'); return window.__c.mutateStore((v) => { f(v, a); }, 'inline', { op: 'd53-title', a }); }, [MUT.toString(), a]);
      await settled(s, n0, mode + ' ' + who);
      if (r !== true) throw Error(who + ': mutateStore ⇒ ' + JSON.stringify(r));
      edits.push(a);
      if (s.errs.length) throw Error(who + ' أخطاء صفحة: ' + s.errs.join(' · '));
      await s.ctx.close();
    }
    await on(); await W.lab.idle();
    judge(t, S0, await snapshot(W), (E) => { let v = clone(E.ops[RES].v); for (const a of edits) v = MUT(v, a); E.ops[RES].v = v; });
  } finally { await W.close(); }
});
