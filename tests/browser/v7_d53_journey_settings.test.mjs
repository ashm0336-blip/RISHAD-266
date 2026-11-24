/* V7 · 53 (writers · 53-د الإعدادات): رحلةُ الإطفاء والتشغيل ببياناتٍ قائمة — «المهام» مطفأة، ومديرُ الإدارة وموظفٌ بدور يعدّلان لونَ ورديةٍ مستعملة
   (الإعدادات ← الورديات: sfSet) ووردية اليوم المشتركة (KIVO.BassamDayShift.set من «المتابعة اليومية»)، فكلُّ حفظٍ ينجح، وبعد التشغيل الجدولُ الشهري
   والتقريرُ وكلُّ موردٍ آخر كما كان إلا التعديلات. ثلاثة أوضاع: المختبر · نسخة Production · الجوال (وردية اليوم). TEST_ONLY. */
import test from 'node:test';
import { setup, snapshot, off, actor, comp, settled, judge, clone, dkOf, DD } from './d53_journey_lib.mjs';

const SH = 'bsdept:' + DD + ':bassam_shift_options_v1', DS = 'bsdept:' + DD + ':bassam_dayshift_v1';
const COLOR = (v, a) => { const s = v.filter(Boolean)[a.i]; if (!s) throw Error('no-shift'); return v.map((x) => (x && x.name === s.name ? Object.assign({}, x, { color: a.color }) : x)); };
const DAY = (v, a) => { v = v && typeof v === 'object' ? v : {}; v[a.dk] = a.name; return v; };

for (const mode of ['lab', 'prod', 'mobile']) test('53 رحلة الإعدادات (' + mode + '): المهام مطفأة ⇒ الورديةُ ووردية اليوم تُحفظان، والتشغيلُ يعيد كلَّ شيء', { timeout: 600000 }, async (t) => {
  const W = await setup({ mode, roleSys: { daily: 'edit', staff: 'view' } });
  try {
    const S0 = await snapshot(W), on = await off(W, { caps: ['tasks'] }), colors = [], days = [];
    const shifts = (S0.ops[SH] && S0.ops[SH].v || []).filter(Boolean);
    for (const [who, i] of [['mgr', 0], ['holder', 1]]) {
      const s = await actor(W, who);
      /* الورديات: للمدير وحده — محرّرُ الأدوار لا يحمل نظامَ «الإعدادات» (perm44 sysList · sysOfKey('ref.shift.edit') = []) فلا تُسنَد لصاحب دور بتصميمها؛
         والإعداداتُ بلا واجهة جوالٍ مخصّصة — وردية اليوم وحدها على الجوال */
      if (who === 'mgr' && mode !== 'mobile') {
        const a = { i: 0, color: '#7c3aed' };
        await comp(s, '#/admin/shifts', 'sfSet', '!!c.state && typeof c.sfItems === "function"');
        const n0 = s.posts.length;
        const r = await s.page.evaluate(async ([src, a]) => { const c = window.__c, cur = c.sfItems(KIVO.__BS_SRV.operations.get('bassam_shift_options_v1')).filter(Boolean)[a.i]; const nx = (0, eval)('(' + src + ')')([cur], { i: 0, color: a.color })[0]; return c.sfSet(cur.name, { color: nx.color }, cur); }, [COLOR.toString(), a]);
        await settled(s, n0, mode + ' ' + who + ' sfSet');
        if (r !== true) throw Error(who + ': sfSet ⇒ ' + JSON.stringify(r));
        colors.push(a);
      }
      const b = { dk: dkOf(W.H), name: shifts[Math.min(i, shifts.length - 1)].name };
      await s.go('#/daily', 4000);
      const n1 = s.posts.length;
      /* مَن له ورديةٌ في جدول اليوم فوردية اليوم ورديتُه هو (BassamDayShift.mine) — لا كتابةَ مشتركة بتصميمها، فلا حفظَ يُنتظر ولا تغيير */
      const personal = await s.page.evaluate(([y, m, d]) => !!KIVO.BassamDayShift.mine(y, m, d), [W.H.y, W.H.m, W.H.d]);
      const r2 = await s.page.evaluate(async ([y, m, d, name]) => KIVO.BassamDayShift.set(y, m, d, name), [W.H.y, W.H.m, W.H.d, b.name]);
      if (!r2 || r2.ok !== 1 || r2.local) throw Error(who + ': وردية اليوم ⇒ ' + JSON.stringify(r2));
      t.diagnostic(mode + ' ' + who + ' وردية اليوم: ' + (personal ? 'شخصية (ورديتُه في الجدول — لا كتابة)' : 'مشتركة ⇒ ' + b.name));
      const cur = days.length ? days[days.length - 1].name : S0.ops[DS] && (S0.ops[DS].v || {})[b.dk];
      if (!personal) { if (cur !== b.name) await settled(s, n1, mode + ' ' + who + ' dayshift'); days.push(b); }
      if (s.errs.length) throw Error(who + ' أخطاء صفحة: ' + s.errs.join(' · '));
      await s.ctx.close();
    }
    await on(); await W.lab.idle();
    judge(t, S0, await snapshot(W), (E) => {
      let v = clone(E.ops[SH].v); for (const a of colors) v = COLOR(v, a); E.ops[SH].v = v;
      let w = clone(E.ops[DS] && E.ops[DS].v); for (const b of days) w = DAY(w, b); E.ops[DS] = { s: 200, v: w };
    });
  } finally { await W.close(); }
});
