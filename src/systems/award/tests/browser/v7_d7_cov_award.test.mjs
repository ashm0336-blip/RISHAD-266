/* V7 · د7 (ج ١٥ — ما لم تغطّه أدوات الفحص): «ترشيح الجائزة» في متصفحٍ حقيقي على المختبر المعزول (العاملُ الحقيقي · الإنفاذ · TEST_ONLY).
   ① مديرُ الإدارة وموظفٌ بدور «إدخال» على الجائزة: «ترشيح جديد» ← فئة العمل المتميز ← الاستمارة (الحقول الإلزامية · الإقرار · التوقيع بصورة) ←
      الشروط العامة (نعم للكل) ← التقييم (حالةٌ واحدة) ← «حفظ الترشيح في السجل» ⇒ يُحفظ في الخادم (award_records) ويظهر في «لوحة النتائج» بعد إعادة التحميل.
   ② موظفٌ بدور «مشاهدة» على الجائزة: لا يُعرض له «ترشيح جديد»، وحفظُ الترشيح من منطق الصفحة نفسِه يقول «صلاحية غير كافية…»، والطلبُ المصطنع
      (استمارةٌ صالحة كاملة ملأها مديرُ الإدارة في الواجهة ولم تُرسل) إلى الخادم يُرفض برسالةٍ عربية ظاهرة — ولا يتغيّر شيء. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, grant, ACTORS, LAB, A, chromium, openAs, mainText, norm, reloadAt, refusals, logicOf, isArabicRefusal, until, toasts, seen, png } from '../../../../../tests/browser/d7_cov_lib.mjs';

const records = (lab) => lab.env.DB.q('SELECT COUNT(*) AS n FROM award_records WHERE department_id=?1', A)[0].n;
const L = (p, fn, arg) => p.evaluate(async ([src, fn, arg]) => { const x = new Function('return ' + src)(); return new Function('L', 'arg', 'return (async () => {' + fn + '})()')(x, arg); }, [logicOf('Award'), fn, arg]);   /* src/fn: ثوابتُ هذا الملف */

async function nominate(p, nominee, img) {
  await p.getByText('فئة العمل المتميز').first().click();
  await p.getByRole('button', { name: 'التالي' }).click();
  const sel = p.locator('main select:visible');
  await sel.first().waitFor();
  await sel.nth(0).selectOption({ label: nominee }); await sel.nth(1).selectOption({ index: 1 }); await sel.nth(2).selectOption({ index: 1 });
  await p.fill('main input[placeholder="رقم الحاسب"]', '12345');
  await p.fill('main input[placeholder="05XXXXXXXX"]', '0500000001'); await p.fill('main input[placeholder="name@example.gov.sa"]', 'TEST_ONLY@example.gov.sa');
  await p.fill('main input[placeholder="اسم الموظف المُقِر"]', nominee);
  await p.locator('main textarea').nth(0).fill('TEST_ONLY وصف العمل المتميز'); await p.locator('main textarea').nth(1).fill('TEST_ONLY الشاهد');
  await p.fill('main input[placeholder="اسم معتمد الترشيح"]', 'TEST_ONLY معتمد'); await p.fill('main input[placeholder="مثال: مدير إدارة التشغيل"]', 'TEST_ONLY مدير الإدارة');
  await p.getByText('إقرار صحة جميع البيانات في استمارة الترشيح', { exact: false }).first().click();
  const files = p.locator('main input[type=file]'); const n = await files.count();
  for (let i = 0; i < n; i++) { await files.nth(i).setInputFiles(img); await p.waitForTimeout(400); }   /* الصورة الشخصية · توقيعا المُقِرّ والمعتمِد */
  await p.getByRole('button', { name: 'التالي' }).click();
  await p.getByText('أجب على جميع الشروط', { exact: false }).first().waitFor();
  const yes = p.locator('main button:visible', { hasText: /^نعم$/ }); const k = await yes.count(); for (let j = 0; j < k; j++) await yes.nth(j).click();
  await p.getByRole('button', { name: 'التالي' }).click();
  await p.getByText('ترشيح المدير المباشر لإنجاز استثنائي').first().click();
  await p.getByRole('button', { name: 'التالي' }).click();
  const post = p.waitForResponse((r) => /\/api\/award\/act$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST', { timeout: 20000 });
  await p.getByRole('button', { name: 'حفظ الترشيح في السجل' }).click();
  return post;
}

test('جائزة ①: مديرُ الإدارة وموظفٌ بدور «إدخال» يرشّحان فيُحفظ الترشيح ويظهر في «لوحة النتائج» بعد إعادة التحميل', { timeout: 600000 }, async () => {
  const lab = await world(), b = await chromium.launch(), img = png();
  try {
    await grant(b, lab, { award: 'input' });
    let expected = 0;
    for (const [i, { who, un }] of ACTORS.entries()) {
      const s = await openAs(b, lab, un, LAB.pw), p = s.page; p.setDefaultTimeout(20000); await toasts(s);
      const bad = refusals(s, /^\/api\/award/);
      await s.go('#/award/new', 4500);
      const nominee = i ? 'TEST_ONLY موظف أ' : 'TEST_ONLY موظف أ٢';
      const res = await nominate(p, nominee, img).catch(async (e) => { throw new Error(who + ': ' + e.message + ' — ' + norm(await mainText(p)).slice(0, 600) + ' · ' + JSON.stringify(await seen(s))); });
      assert.equal(res.status(), 200, who + ': ' + (await res.text()).slice(0, 300));
      expected++; await lab.idle();
      assert.equal(records(lab), expected, who + ': الترشيحُ في الخادم');
      await until(async () => (await seen(s)).some((t) => t.includes('حُفظ الترشيح في السجل')), who + ': إقرارُ الحفظ');
      await reloadAt(s, '#/award/res', 5000);
      await until(async () => norm(await mainText(p)).includes(norm(nominee)), who + ': المرشَّح في «لوحة النتائج» بعد التحميل').catch(async (e) => { throw new Error(e.message + ' — ' + norm(await mainText(p)).slice(0, 800)); });
      assert.deepEqual(bad, [], who + ': لا رفضَ في مسار الحفظ');
      assert.deepEqual(s.errs, [], who + ': لا أخطاء صفحة');
      await s.ctx.close();
    }
  } finally { await b.close(); await lab.close(); }
});

test('جائزة ②: موظفٌ بدور «مشاهدة» لا يُعرض له «ترشيح جديد»، والحفظُ يُرفض برسالةٍ عربية ظاهرة ولا يتغيّر شيء', { timeout: 300000 }, async () => {
  const lab = await world(), b = await chromium.launch();
  try {
    await grant(b, lab, { award: 'view' });
    /* استمارةٌ صالحة كاملة يملؤها مديرُ الإدارة في الواجهة — يُلتقط جسمُها ولا يُرسل (route.abort) — ليرسلها الموظفُ بلا مفتاح */
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw); let wire = null;
    await m.page.route('**/api/award/act', (route) => { wire = route.request().postData(); return route.abort(); });
    await m.go('#/award/new', 4500); await nominate(m.page, 'TEST_ONLY موظف أ٢', png()).catch(() => null);
    await until(() => wire, 'the manager\'s nomination body'); await m.ctx.close();
    const data = JSON.parse(wire).data;
    const s = await openAs(b, lab, LAB.empA, LAB.pw), p = s.page; await toasts(s);
    await s.go('#/award', 4500);
    assert.ok((await mainText(p)).includes('جائزة التميز'), 'الصفحةُ مفتوحةٌ للمشاهدة');
    const tabs = await p.evaluate(() => [...document.querySelectorAll('main button')].filter((x) => x.getBoundingClientRect().width > 1).map((x) => x.textContent.trim()));
    assert.ok(!tabs.includes('ترشيح جديد'), 'لا «ترشيح جديد» لمن لا يملك مفتاحه: ' + JSON.stringify(tabs));
    const before = records(lab);
    await L(p, 'await L.awDoSave();');   /* ما يستدعيه زرُّ «حفظ الترشيح في السجل» */
    await until(async () => (await seen(s)).some(isArabicRefusal), 'رسالةُ رفضٍ عربية').catch((e) => { throw new Error(e.message); });
    assert.ok((await seen(s)).some((t) => t.includes('صلاحية غير كافية')), JSON.stringify(await seen(s)));
    const f = await L(p, "const r = await L._bcMutate('create', { data: arg }); await new Promise((go) => setTimeout(go, 600)); return { ok: r.ok, status: r.status, message: r.message };", data);
    assert.equal(f.ok, 0); assert.equal(f.status, 403, JSON.stringify(f)); assert.ok(isArabicRefusal(f.message), JSON.stringify(f));
    await lab.idle(); assert.equal(records(lab), before, 'لا يتغيّر شيء');
    assert.deepEqual(s.errs, []);
  } finally { await b.close(); await lab.close(); }
});
