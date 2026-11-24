/* V7 · د7 (ج ١٥ — ما لم تغطّه أدوات الفحص): «إضافة محضر مضبوطات» في متصفحٍ حقيقي على المختبر المعزول (العاملُ الحقيقي · الإنفاذ · TEST_ONLY).
   ① مديرُ الإدارة وموظفٌ بدور «إدخال» على المضبوطات: من «نظام المضبوطات» (اليومُ الحالي) يختار التصنيف والكمية ثم «إضافة» ⇒ يُحفظ المحضر في الخادم
      (seized_reports) ويبقى بعد إعادة التحميل («سجل الحركة الشهري» = 1 محضر) · واليومُ المنقضي مقفل: لا نموذجَ إضافة بل «اليوم انقضى — مقفل»،
      والطلبُ المصطنع لذلك اليوم يُرفض برسالةٍ عربية ولا يتغيّر شيء.
   ② موظفٌ بدور «مشاهدة» على المضبوطات: لا نموذجَ إضافة، والطلبُ المصطنع من منطق الصفحة يُرفض («صلاحيتك لا تشمل هذا الإجراء») ظاهراً في الصفحة، ولا يتغيّر شيء. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, grant, ACTORS, LAB, A, chromium, openAs, mainText, norm, reloadAt, refusals, logicOf, isArabicRefusal, until } from '../../../../../tests/browser/d7_cov_lib.mjs';

const reports = (lab) => lab.env.DB.q('SELECT COUNT(*) AS n FROM seized_reports WHERE department_id=?1', A)[0].n;
const FORM = 'محضر مضبوطات — يوم';
/* التصنيفُ الأول من القائمة (البندُ الأول يُختار تلقائياً) · زيادةُ الكمية · «إضافة» */
async function addOne(p) {
  await p.getByText('— اختر التصنيف —').first().click();
  await p.evaluate(() => document.querySelector('main [title="تعديل اسم التصنيف"]').parentElement.click());
  await p.getByRole('button', { name: 'زيادة' }).first().click();
  const post = p.waitForResponse((r) => /\/api\/seized\/act$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST', { timeout: 20000 });
  await p.getByRole('button', { name: 'إضافة', exact: true }).first().click();
  return post;
}
/* طلبُ «إنشاء» من منطق الصفحة نفسِه (_bcMutate — ما يستدعيه زرُّ «إضافة») ليومٍ بعينه */
const forge = (p, day) => p.evaluate(async ([src, day]) => {
  const L = new Function('return ' + src)(), st = L.state;   /* src: الثابتُ logicOf من العُدّة — لا مدخلَ خارجي */
  const r = await L._bcMutate('create', { data: { loc: '', no: '', note: 'TEST_ONLY', items: [{ id: 1, n: 1, val: 0, act: 'store', kind: '', kindTxt: '', photos: [] }], y: st.irYear, m: st.irMonth, d: day } });
  await new Promise((go) => setTimeout(go, 600));
  return { ok: r.ok, err: r.err, status: r.status, message: r.message, shown: (document.querySelector('main') || document.body).innerText.includes(r.message || '\0') };
}, [logicOf('Seized'), day]);
/* عدّادُ «سجل الحركة الشهري» بصيغة BassamCount: «محضر واحد» · «محضران» · «N محضر/محاضر» */
const ledger = async (p) => { const t = norm(await mainText(p)), m = /سجل الحركة الشهري (?:(\d+) مح(?:ضر|اضر)|(محضر واحد)|(محضران))/.exec(t); return !m ? -1 : m[2] ? 1 : m[3] ? 2 : +m[1]; };

test('مضبوطات ①: مديرُ الإدارة وموظفٌ بدور «إدخال» يضيفان محضراً فيُحفظ ويبقى بعد التحميل — واليومُ المنقضي مقفلٌ برسالةٍ عربية', { timeout: 600000 }, async (t) => {
  const lab = await world(), b = await chromium.launch();
  try {
    await grant(b, lab, { seized: 'input' });
    let expected = 0;
    for (const { who, un } of ACTORS) {
      const s = await openAs(b, lab, un, LAB.pw), p = s.page; p.setDefaultTimeout(20000);
      const bad = refusals(s, /^\/api\/seized/);
      await s.go('#/seized', 5000);
      assert.ok((await mainText(p)).includes(FORM), who + ': نموذجُ المحضر ظاهرٌ لليوم الحالي');
      const seen0 = await until(async () => { const n = await ledger(p); return n >= 0 ? n + 1 : 0; }, who + ': عدّادُ السجل') - 1;   /* ما يراه هذا الحساب قبل الإضافة (الموظفُ يرى محاضرَه) */
      const res = await addOne(p);
      assert.equal(res.status(), 200, who + ': ' + (await res.text()).slice(0, 300));
      expected++; await lab.idle();
      assert.equal(reports(lab), expected, who + ': المحضرُ في الخادم');
      await reloadAt(s, '#/seized', 5000);
      await until(async () => (await ledger(p)) === seen0 + 1, who + ': «سجل الحركة الشهري» بعد التحميل = ' + (seen0 + 1)).catch(async (e) => { throw new Error(e.message + ' — ' + norm(await mainText(p)).slice(-400)); });
      assert.deepEqual(bad, [], who + ': لا رفضَ في مسار الحفظ');
      /* اليومُ الأول من الشهر انقضى (اليومُ الحالي بعده) — مقفل */
      const past = await p.evaluate(() => { const d = [...document.querySelectorAll('main [title^="يوم 1 "]')].find((x) => /انقضى/.test(x.title)); if (d) d.click(); return !!d; });
      if (past) {
        await p.waitForTimeout(1200);
        const txt = await mainText(p);
        assert.ok(txt.includes('اليوم انقضى — مقفل'), who + ': اليومُ المنقضي يقول «اليوم انقضى — مقفل»');
        assert.ok(!txt.includes(FORM), who + ': ولا يعرض نموذجَ الإضافة');
        const f = await forge(p, 1);
        assert.equal(f.ok, 0, who + ': الخادمُ يرفض محضراً ليومٍ مقفل: ' + JSON.stringify(f));
        assert.ok(isArabicRefusal(f.message) && f.shown, who + ': والرفضُ عربيٌّ ظاهر: ' + JSON.stringify(f));
        await lab.idle(); assert.equal(reports(lab), expected, who + ': ولا يتغيّر شيء');
      } else t.diagnostic('اليومُ الأول هو اليومُ الحالي — حالةُ اليوم المقفل لا تنطبق اليوم');
      assert.deepEqual(s.errs, [], who + ': لا أخطاء صفحة');
      await s.ctx.close();
    }
  } finally { await b.close(); await lab.close(); }
});

test('مضبوطات ②: موظفٌ بدور «مشاهدة» لا يرى نموذجَ الإضافة، والطلبُ المصطنع يُرفض برسالةٍ عربية ظاهرة ولا يتغيّر شيء', { timeout: 300000 }, async () => {
  const lab = await world(), b = await chromium.launch();
  try {
    await grant(b, lab, { seized: 'view' });
    const s = await openAs(b, lab, LAB.empA, LAB.pw), p = s.page;
    await s.go('#/seized', 5000);
    assert.ok((await mainText(p)).includes('نظام المضبوطات'), 'الصفحةُ مفتوحةٌ للمشاهدة');
    assert.ok(!(await mainText(p)).includes(FORM), 'لا نموذجَ إضافة لمن لا يملك مفتاحها');
    const before = reports(lab), f = await forge(p, (await p.evaluate((src) => new Function('return ' + src)().state.irDay, logicOf('Seized'))));
    assert.equal(f.ok, 0, JSON.stringify(f)); assert.equal(f.status, 403, JSON.stringify(f));
    assert.ok(isArabicRefusal(f.message) && f.shown, 'رفضٌ عربيٌّ ظاهر: ' + JSON.stringify(f));
    await lab.idle(); assert.equal(reports(lab), before, 'لا يتغيّر شيء');
    assert.deepEqual(s.errs, []);
  } finally { await b.close(); await lab.close(); }
});
