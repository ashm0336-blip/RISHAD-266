/* V7 · 53 (writers · 53-د الموظفون): رحلةُ الإطفاء والتشغيل ببياناتٍ قائمة — «الجدول الشهري» مطفأ، ومديرُ الإدارة وموظفٌ بدور (يرى سجلَّ الموظفين
   مُسقَطاً بالخصوصية) يعدّلان «طبيعة العمل» لموظفٍ بكاتب الصفحة الحقيقي (loadEmp ← persist)، فكلُّ حفظٍ ينجح، وبعد التشغيل سجلُّ الموظفين كما كان
   إلا التعديلين — والحقولُ الشخصية التي لا يراها صاحبُ الدور مخزَّنةٌ كما هي (privEmpIn). ثلاثة أوضاع: المختبر · نسخة Production · الجوال. TEST_ONLY. */
import test from 'node:test';
import { setup, snapshot, off, actor, comp, settled, judge, clone, DD } from './d53_journey_lib.mjs';

const RES = 'bsdept:' + DD + ':bassam_employees_v1';
const MUT = (rows, a) => { const list = rows.slice().sort((x, z) => String(x.eid).localeCompare(String(z.eid))), e = list[a.i]; if (!e) throw Error('no-emp'); const q = rows.findIndex((x) => x.eid === e.eid); rows[q] = Object.assign({}, rows[q], { work: a.tag }); return rows; };

for (const mode of ['lab', 'prod', 'mobile']) test('53 رحلة الموظفين (' + mode + '): الجدول مطفأ ⇒ المديرُ وصاحبُ الدور يحفظان، والحقولُ المحجوبة مخزَّنة، والتشغيلُ يعيد كلَّ شيء', { timeout: 600000 }, async (t) => {
  const W = await setup({ mode, roleSys: { emps: 'edit' } });
  try {
    const S0 = await snapshot(W), on = await off(W, { caps: ['staff'] }), edits = [];
    for (const [who, i] of [['mgr', 0], ['holder', 1]]) {
      const s = await actor(W, who), a = { i, tag: 'TEST_ONLY عمل ' + who };
      await comp(s, '#/employees', 'persist', '!!c.state && c.loadEmp().length > 1');
      const n0 = s.posts.length;
      const r = await s.page.evaluate(async ([src, a]) => { const c = window.__c, v = c.loadEmp(); (0, eval)('(' + src + ')')(v, a); return c.persist(v, 'employee-editor', { op: 'd53-work', a }); }, [MUT.toString(), a]);
      await settled(s, n0, mode + ' ' + who);
      if (r !== true) throw Error(who + ': persist ⇒ ' + JSON.stringify(r));
      edits.push(a);
      if (s.errs.length) throw Error(who + ' أخطاء صفحة: ' + s.errs.join(' · '));
      await s.ctx.close();
    }
    await on(); await W.lab.idle();
    judge(t, S0, await snapshot(W), (E) => { let v = clone(E.ops[RES].v); for (const a of edits) v = MUT(v, a); E.ops[RES].v = v; });
  } finally { await W.close(); }
});
