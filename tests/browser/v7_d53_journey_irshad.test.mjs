/* V7 · 53 (writers · 53-د الأنظمة العلائقية — الاسترشاد): رحلةُ الإطفاء والتشغيل ببياناتٍ قائمة — «الخطة التشغيلية» مطفأة وعدستا المصليات والمسارات
   مطفأتان، ومديرُ الإدارة وموظفٌ بدورٍ على الاسترشاد يعدّلان (أو ينشئان حين لا سجلَّ في الشهر) تقريرَ استرشادٍ بكاتب الصفحة الحقيقي (_irApply ←
   /api/irshad/act)، فكلُّ فعلٍ ينجح، وبعد التشغيل كلُّ موردٍ للوحدة كما كان، ومجالُ الاسترشاد لم يتغيّر فيه إلا الصفّان. TEST_ONLY. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, snapshot, off, actor, comp, settled, judge, DD } from './d53_journey_lib.mjs';

for (const mode of ['lab', 'prod', 'mobile']) test('53 رحلة الاسترشاد (' + mode + '): الخطة وعدستان مطفأة ⇒ فعلُ الصفّ ينجح للمدير وصاحب الدور، والتشغيلُ يعيد كلَّ شيء', { timeout: 600000 }, async (t) => {
  const W = await setup({ mode, roleSys: { irshad: 'full', staff: 'view', emps: 'view' } });
  try {
    const S0 = await snapshot(W), on = await off(W, { caps: ['plan'], lenses: ['zones', 'paths'] }), acts = [];
    for (const [who, i] of [['mgr', 0], ['holder', 1]]) {
      const s = await actor(W, who);
      await comp(s, '#/irshad', '_irApply', '!!c.state && !!(c.state.irCalendar || c.state.irRecords || c.state.irDashboard)');
      const n0 = s.posts.length;
      const r = await s.page.evaluate(async ([H, i]) => {
        const c = window.__c, x = await fetch('/api/irshad?view=records&year=' + H.y + '&month=' + H.m + '&limit=100&dept=' + encodeURIComponent(KIVO.BassamDepts.active()) + '&uid=' + encodeURIComponent(window.__BS_BOOT.uid), { cache: 'no-store' }), j = await x.json();
        if (!x.ok) return { kind: 'read', ok: 0, msg: x.status + ' ' + JSON.stringify(j).slice(0, 200) };
        const rows = (j && (j.rows || j.reports || j.records)) || [], row = rows.slice().sort((a, b) => String(a.id).localeCompare(String(b.id)))[i];
        if (row) { const data = { shift: row.shift, eid: row.eid || '', loc: row.loc || '', langs: row.langs || [], bro: (+row.bro || 0) + 1, pros: +row.pros || 0, pol: +row.pol || 0 };
          const res = await c._irApply('edit', { id: row.id, data }, 1); return { kind: 'edit', id: row.id, ok: res && res.ok, msg: res && res.message, row: JSON.stringify(row).slice(0, 300) }; }
        const sh = (KIVO.__BS_SRV.operations.get('bassam_shift_options_v1') || []).filter(Boolean)[0];
        const data = { shift: sh ? sh.name : '', eid: 'tst_demo_e11', loc: '', langs: [], bro: 1 + i, pros: 0, pol: 0, y: H.y, m: H.m, d: H.d };
        const res = await c._irApply('create', { data }, 1); return { kind: 'create', ok: res && res.ok, msg: res && res.message };
      }, [W.H, i]);
      t.diagnostic(mode + ' ' + who + ': ' + JSON.stringify(r));
      assert.equal(r.ok, 1, who + ': فعلُ الصفّ ⇒ ' + JSON.stringify(r));
      await settled(s, n0, mode + ' ' + who);
      acts.push(r);
      if (s.errs.length) throw Error(who + ' أخطاء صفحة: ' + s.errs.join(' · '));
      await s.ctx.close();
    }
    await on(); await W.lab.idle();
    const S1 = await snapshot(W);
    /* المجال: جداولُه كلُّها كما كانت إلا صفوفَ التقارير التي مسّها الفعلان — صفٌّ معدَّلٌ لكل تعديل · صفٌّ مضافٌ لكل إنشاء */
    const A = S0.dom.irshad, B = S1.dom.irshad;
    assert.ok(Array.isArray(A) && Array.isArray(B) && A.length === B.length, 'المجالُ مقروءٌ قبلُ وبعدُ: ' + JSON.stringify([A, B]).slice(0, 300));
    let changed = 0, added = 0;
    for (let q = 0; q < A.length; q++) for (const tb of Object.keys({ ...A[q], ...B[q] })) {
      const a = (A[q][tb] || []).map((x) => JSON.stringify(x)), b = (B[q][tb] || []).map((x) => JSON.stringify(x));
      if (JSON.stringify(a) === JSON.stringify(b)) continue;
      const gone = a.filter((x) => !b.includes(x)), come = b.filter((x) => !a.includes(x));
      t.diagnostic(tb + ': ' + gone.length + ' صفاً تغيّر · ' + come.length + ' جديد');
      if (!/report/i.test(tb)) { if (gone.length || come.length > 0 && !/request|history|audit/i.test(tb)) assert.fail(tb + ': جدولٌ غيرُ التقارير تغيّر: ' + JSON.stringify({ gone, come }).slice(0, 600)); continue; }
      changed += gone.length; added += come.length - gone.length;
    }
    assert.equal(changed, acts.filter((x) => x.kind === 'edit').length, 'صفوفُ التقارير المعدَّلة = التعديلات');
    assert.equal(added, acts.filter((x) => x.kind === 'create').length, 'صفوفُ التقارير المضافة = الإنشاءات');
    judge(t, S0, S1, (E) => { E.dom.irshad = S1.dom.irshad; });
  } finally { await W.close(); }
});
