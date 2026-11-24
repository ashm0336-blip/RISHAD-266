/* V7 · 53 (writers · 53-ج الجدول الشهري): رحلةُ الإطفاء والتشغيل ببياناتٍ قائمة — «التقرير اليومي» و«المهام» مطفأتان، ومديرُ الإدارة وموظفٌ بدور
   يعدّلان رمزَ النداء لموظفٍ في الشهر الجاري بكاتب الصفحة الحقيقي (loadStaffing ← saveStaffing)، فكلُّ حفظٍ ينجح، وبعد التشغيل كلُّ موردٍ للوحدة
   كما كان إلا التعديلين حرفاً. ثلاثة أوضاع: المختبر · نسخةٌ بشكل Production مستوردة (مديرُ المنصة) · الجوال. TEST_ONLY. */
import test from 'node:test';
import { setup, snapshot, off, actor, comp, settled, judge, clone, ymOf, DD } from './d53_journey_lib.mjs';

const RES = 'bsdept:' + DD + ':bassam_staffing_v3';
/* التعديلُ نفسُه في الصفحة وفي التوقّع: رمزُ نداء الموظف رقم a.i (بترتيب المفاتيح) في الشهر الجاري */
const MUT = (t, a) => { const m = t[a.ym]; if (!m || typeof m !== 'object') throw Error('no-month ' + a.ym); const ek = Object.keys(m).filter((k) => k.indexOf('__') !== 0).sort()[a.i]; if (!ek) throw Error('no-emp'); m[ek] = Object.assign({}, m[ek], { cs: a.tag }); return t; };

for (const mode of ['lab', 'prod', 'mobile']) test('53 رحلة الجدول الشهري (' + mode + '): التقرير والمهام مطفأان ⇒ المديرُ وصاحبُ الدور يحفظان، والتشغيلُ يعيد كلَّ شيء', { timeout: 600000 }, async (t) => {
  const W = await setup({ mode, roleSys: { staff: 'edit', daily: 'view', emps: 'view' } });
  try {
    const S0 = await snapshot(W), ym = ymOf(W.H), on = await off(W, { caps: ['dreport', 'tasks'] }), edits = [];
    for (const [who, i] of [['mgr', 0], ['holder', 1]]) {
      const s = await actor(W, who), a = { ym, i, tag: 'T' + who.slice(0, 1) + i };
      await comp(s, '#/staffing', 'saveStaffing', '!!c.state && !!c.loadStaffing');
      const n0 = s.posts.length;
      const r = await s.page.evaluate(async ([src, a]) => { const c = window.__c, v = c.loadStaffing(); (0, eval)('(' + src + ')')(v, a); return c.saveStaffing(v); }, [MUT.toString(), a]);
      await settled(s, n0, mode + ' ' + who);
      if (r !== true) throw Error(who + ': saveStaffing ⇒ ' + JSON.stringify(r));
      edits.push(a);
      if (s.errs.length) throw Error(who + ' أخطاء صفحة: ' + s.errs.join(' · '));
      await s.ctx.close();
    }
    await on(); await W.lab.idle();
    const S1 = await snapshot(W);
    judge(t, S0, S1, (E) => { let v = clone(E.ops[RES].v); for (const a of edits) v = MUT(v, a); E.ops[RES].v = v; });
  } finally { await W.close(); }
});
