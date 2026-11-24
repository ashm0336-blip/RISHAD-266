/* V7 · 53 (writers · 53-د الأنظمة العلائقية — المضبوطات والجائزة): رحلةُ الإطفاء والتشغيل ببياناتٍ قائمة — «الخطة التشغيلية» مطفأة وعدستا المصليات
   والمسارات مطفأتان، والكاتبُ الحقيقي للصفحة (_bcMutate ← /api/<نظام>/act) يعمل على صفٍّ قائم:
   · المضبوطات: مديرُ الإدارة وموظفٌ بدورٍ عليها يعدّلان ملاحظةَ محضرٍ (szSaveRec: البنودُ بمصدرها sourceIndex)
   · الجائزة: مديرُ الإدارة يعتمد ترشيحاً (awSetStatus — الاعتمادُ لمدير الإدارة وحده بتصميمه: awCanApprove)
   كلُّ فعلٍ ينجح، وبعد التشغيل كلُّ موردٍ للوحدة كما كان، والمجالُ لم يتغيّر فيه إلا الصفوفُ المقصودة. TEST_ONLY. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, snapshot, off, actor, comp, settled, judge, domDelta } from './d53_journey_lib.mjs';

/* محضرٌ من يوم اليوم (اليومُ الماضي مقفلٌ بلا نافذة استدراك — sz.rec.edit DateRange، قاعدةُ الفترة نفسُها) */
const SZ_EDIT = async ([i, tag, H]) => {
  const c = window.__c, rows = c.loadIrshad().reports.filter((x) => +x.y === H.y && +x.m === H.m && +x.d === H.d).sort((a, b) => String(a.id).localeCompare(String(b.id))), r = rows[Math.min(i, rows.length - 1)];
  if (!r) return { ok: 0, msg: 'no-record' };
  const items = (r.items || []).map((it, n) => ({ id: it.id, n: parseInt(it.n, 10) || 0, val: parseInt(it.val, 10) || 0, act: it.act, kind: it.kind || '', kindTxt: it.kindTxt || '', photos: (it.photos || []).slice(), sourceIndex: n }));
  const data = { loc: r.loc || '', no: String(r.no || '').trim(), note: (String(r.note || '') + ' · ' + tag).trim(), items };
  const res = await c._bcMutate('edit', { id: r.id, data }, { stamp: c._bcStamp() });
  return { ok: res && res.ok, msg: res && res.message, id: r.id };
};

/* نسخةُ Production المقيسة (v7_d6_import_fx oldFile) لا تحمل مجالَي المضبوطات والجائزة، فلا صفَّ قائماً بعد استيرادها — إنشاءُ محضرٍ أو ترشيحٍ يحتاج نموذجَه
   الكامل؛ وطريقُ الإنشاء على نسخة Production مغطّى في رحلة الاسترشاد. التخطّي مسمّى. */
const NO_PROD = { skip: 'نسخةُ Production المقيسة بلا مجالَي المضبوطات والجائزة — لا صفَّ قائماً (طريقُ الإنشاء في v7_d53_journey_irshad)' };
for (const mode of ['lab', 'prod', 'mobile']) {
  const opt = mode === 'prod' ? NO_PROD : {};
  test('53 رحلة المضبوطات (' + mode + '): الخطة وعدستان مطفأة ⇒ تعديلُ المحضر ينجح للمدير وصاحب الدور، والتشغيلُ يعيد كلَّ شيء', { timeout: 600000, ...opt }, async (t) => {
    const W = await setup({ mode, roleSys: { seized: 'full', staff: 'view', emps: 'view' } });
    try {
      const S0 = await snapshot(W), on = await off(W, { caps: ['plan'], lenses: ['zones', 'paths'] }), acts = [];
      for (const [who, i] of [['mgr', 0], ['holder', 1]]) {
        const s = await actor(W, who);
        await comp(s, '#/seized/records', '_bcMutate', '!!c.state && typeof c.loadIrshad === "function" && c.loadIrshad().reports.length > 0');
        const n0 = s.posts.length, r = await s.page.evaluate(SZ_EDIT, [i, 'TEST_ONLY ' + who, W.H]);
        await s.page.waitForTimeout(800);
        t.diagnostic(mode + ' ' + who + ': ' + JSON.stringify(r) + ' · ' + JSON.stringify(s.posts.slice(n0).map((x) => ({ st: x.st, j: x.j }))).slice(0, 900));
        assert.equal(r.ok, 1, who + ': تعديلُ المحضر ⇒ ' + JSON.stringify(r));
        await settled(s, n0, mode + ' ' + who); acts.push(r);
        if (s.errs.length) throw Error(who + ' أخطاء صفحة: ' + s.errs.join(' · '));
        await s.ctx.close();
      }
      await on(); await W.lab.idle();
      const S1 = await snapshot(W), d = domDelta(t, S0.dom.seized, S1.dom.seized, /report|item/i);
      assert.ok(d.changed >= new Set(acts.map((x) => x.id)).size && d.added === 0, 'صفوفُ المحاضر المعدَّلة وحدها: ' + JSON.stringify(d));
      judge(t, S0, S1, (E) => { E.dom.seized = S1.dom.seized; });
    } finally { await W.close(); }
  });
  test('53 رحلة الجائزة (' + mode + '): الخطة وعدستان مطفأة ⇒ اعتمادُ المدير ترشيحاً ينجح، والتشغيلُ يعيد كلَّ شيء', { timeout: 600000, ...opt }, async (t) => {
    const W = await setup({ mode, roleSys: { award: 'full', emps: 'view' } });
    try {
      const S0 = await snapshot(W), on = await off(W, { caps: ['plan'], lenses: ['zones', 'paths'] });
      const s = await actor(W, 'mgr');
      await comp(s, '#/award/res', 'awSetStatus', '!!c.state && !!(c._bcData("records") && (c._bcData("records").recs || []).length)');
      const n0 = s.posts.length;
      const r = await s.page.evaluate(async () => { const c = window.__c, recs = c._bcData('records').recs.slice().sort((a, b) => String(a.id).localeCompare(String(b.id))), x = recs.find((q) => q.status !== 'معتمد') || recs[0];
        const out = []; const o = c.bsToast; c.bsToast = function (m) { out.push(String(m)); return o && o.apply(this, arguments); }; await c.awSetStatus(x.id, 'معتمد'); return { id: x.id, from: x.status, toasts: out }; });
      t.diagnostic(mode + ' mgr: ' + JSON.stringify(r));
      await settled(s, n0, mode + ' mgr award');
      if (s.errs.length) throw Error('أخطاء صفحة: ' + s.errs.join(' · '));
      await s.ctx.close();
      await on(); await W.lab.idle();
      const S1 = await snapshot(W), d = domDelta(t, S0.dom.award, S1.dom.award, /rec|record|score|status/i);
      assert.ok(d.changed >= 1 && d.added >= 0, 'الترشيحُ المعتمد وحده: ' + JSON.stringify(d));
      judge(t, S0, S1, (E) => { E.dom.award = S1.dom.award; });
    } finally { await W.close(); }
  });
}
