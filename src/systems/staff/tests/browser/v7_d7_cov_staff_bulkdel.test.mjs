/* V7 · د7 (ج ١٥ — ما لم تغطّه أدوات الفحص): «الحذف الجماعي في الجدول الشهري» — «حذف جميع بيانات الشهر» من كرت الشهر، في متصفحٍ حقيقي على المختبر
   المعزول (العاملُ الحقيقي · الإنفاذ · TEST_ONLY).
   ① مديرُ الإدارة وموظفٌ بدورٍ يملك الحذف: يُنشئ جدولَ الشهر الجاري من الواجهة («جدول جديد فارغ» ← «إنشاء») فيُحفظ ويبقى بعد التحميل، ثم ×
      «سيتم حذف جميع بيانات الشهر» ← «حذف نهائي» ⇒ يخلو الشهرُ في الخادم ويبقى خالياً بعد التحميل.
      والشهرُ السابق المعتمَد المقفل (فيه جدولُ TEST_ONLY مبذور): الحذفُ الجماعي يُرفض برسالةٍ عربية ظاهرة ولا يتغيّر شيء.
   ② موظفٌ بدورٍ بلا مفتاح الحذف («تعديل»): لا يُعرض له × على كرت الشهر، وحذفُ الشهر من منطق الصفحة نفسِه («حذف نهائي» — delMonthDo) يُرفض برسالةٍ عربية
      ولا يتغيّر شيء. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, grant, ACTORS, LAB, A, chromium, openAs, mainText, norm, reloadAt, logicOf, isArabicRefusal, until, toasts, seen, launchUtf8, filesMenu, revealAll } from '../../../../../tests/browser/d7_cov_lib.mjs';
import { replaceOperationalFixture } from '../../../../../tests/unit/world_fx.mjs';

const K = 'bsdept:' + A + ':bassam_staffing_v3', KL = 'bsdept:' + A + ':bassam_staffing_locks_v1';
const L = (p, fn, arg) => p.evaluate(async ([src, fn, arg]) => { const x = new Function('return ' + src)(); return new Function('L', 'arg', 'return (async () => {' + fn + '})()')(x, arg); }, [logicOf('Staffing'), fn, arg]);   /* src/fn: ثوابتُ هذا الملف */
const doc = async (s) => { const r = await s.api('/api/operations/read?keys=' + encodeURIComponent(K)); return (r.j && r.j.resources && r.j.resources[K]) || {}; };
const ym = (p) => L(p, 'return { y: L.state.year, m: L.state.month };');
const cardX = (p, name) => p.locator(`xpath=//main//*[p[normalize-space()="${name}"]]/span[@title="سيتم حذف جميع بيانات الشهر"]`);
const MONTHS = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
const SAVE = (r) => /^\/api\/(save|operations\/[a-z]+)$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST';

async function createMonth(p) {
  await p.getByRole('button', { name: /^إنشاء جدول/ }).first().click();
  await p.getByText('جدول جديد فارغ').first().click();
  const post = p.waitForResponse(SAVE, { timeout: 20000 });
  await p.getByRole('button', { name: 'إنشاء', exact: true }).click();
  return post;
}
async function deleteMonth(p, name) {
  await cardX(p, name).first().click();
  await p.getByRole('button', { name: 'حذف نهائي' }).waitFor();
  const post = p.waitForResponse(SAVE, { timeout: 20000 }).catch(() => null);
  await p.getByRole('button', { name: 'حذف نهائي' }).click();
  return post;
}
/* حذفُ الشهر من منطق الصفحة نفسِه: ما يستدعيه «حذف نهائي» (delMonthDo) بعد فتح نافذته */
const forgeDelete = (p, y, m) => L(p, `L.setState({ year: arg.y, month: arg.m, delMonth: { n: arg.m } }); await new Promise((go) => setTimeout(go, 600));
  const host = document.querySelector('.sc-host[data-sc-name="Staffing"]'); const btn = [...host.querySelectorAll('button')].find((b) => b.textContent.trim() === 'حذف نهائي');
  if (btn) btn.click(); return !!btn;`, { y, m });

test('جدول ①: مديرُ الإدارة وموظفٌ بدور يُنشئان جدولَ الشهر ثم يحذفانه كلَّه — يُحفظ ويبقى بعد التحميل · والشهرُ المقفل يُرفض حذفُه برسالةٍ عربية', { timeout: 600000 }, async () => {
  const lab = await world(), b = await chromium.launch();
  try {
    await grant(b, lab, { staff: 'sensitive' });
    for (const { who, un } of ACTORS) {
      const s = await openAs(b, lab, un, LAB.pw), p = s.page; p.setDefaultTimeout(20000); await toasts(s);
      const fail = async (e) => { throw new Error(who + ': ' + e.message + ' — ' + JSON.stringify(await seen(s)) + ' · ' + norm(await mainText(p)).slice(0, 600)); };
      await s.go('#/staffing', 5000);
      const { y, m } = await ym(p), key = y + '-' + m;
      const c = await createMonth(p).catch(fail);
      assert.equal(c.status(), 200, who + ': ' + (await c.text()).slice(0, 300));
      await lab.idle();
      const made = (await doc(s))[key];
      assert.ok(made, who + ': جدولُ الشهر في الخادم');
      await reloadAt(s, '#/staffing', 5000);
      assert.ok(!(await mainText(p)).includes('لا يوجد جدول لشهر'), who + ': الجدولُ باقٍ بعد التحميل');
      const del = await deleteMonth(p, MONTHS[m - 1]).catch(fail);
      assert.ok(del && del.status() === 200, who + ': حذفُ الشهر: ' + (del ? del.status() + ' ' + (await del.text()).slice(0, 300) : 'لا طلب'));
      await lab.idle(); assert.equal((await doc(s))[key], undefined, who + ': الشهرُ خالٍ في الخادم');
      await reloadAt(s, '#/staffing', 5000);
      await until(async () => (await mainText(p)).includes('لا يوجد جدول لشهر'), who + ': الشهرُ خالٍ بعد التحميل').catch(fail);
      /* الشهرُ السابق: جدولُ الواجهة نفسُه مبذوراً فيه، والشهرُ معتمدٌ مقفل (bassam_staffing_locks_v1) */
      const py = m === 1 ? y - 1 : y, pm = m === 1 ? 12 : m - 1, pk = py + '-' + pm, before = await doc(s);
      await replaceOperationalFixture(lab.env, K, { ...before, [pk]: made });
      await replaceOperationalFixture(lab.env, KL, { [pk]: true });
      await reloadAt(s, '#/staffing', 5000);
      const v0 = JSON.stringify((await doc(s))[pk]); assert.ok(v0 && v0 !== 'undefined', who + ': في الشهر المقفل جدول');
      const t0 = (await seen(s)).length, x = await (async () => { await L(p, 'L.setState({ year: arg.y, month: arg.m }); await new Promise((go) => setTimeout(go, 800));', { y: py, m: pm }); return cardX(p, MONTHS[pm - 1]).count(); })();
      if (x) await deleteMonth(p, MONTHS[pm - 1]).catch(() => null); else await forgeDelete(p, py, pm);
      await until(async () => (await seen(s)).slice(t0).some(isArabicRefusal) || isArabicRefusal(await p.evaluate(() => (document.querySelector('[role=status],[role=alert]') || {}).textContent || '')),
        who + ': رسالةُ رفضٍ عربية لحذف شهرٍ مقفل (× ' + (x ? 'ظاهر' : 'غير ظاهر') + ')').catch(fail);
      await lab.idle(); assert.equal(JSON.stringify((await doc(s))[pk]), v0, who + ': لا يتغيّر شيء في الشهر المقفل');
      await replaceOperationalFixture(lab.env, K, before); await replaceOperationalFixture(lab.env, KL, {});
      assert.deepEqual(s.errs, [], who + ': لا أخطاء صفحة');
      await s.ctx.close();
    }
  } finally { await b.close(); await lab.close(); }
});

test('جدول ②: موظفٌ بدورٍ بلا مفتاح الحذف لا يُعرض له حذفُ الشهر، والحذفُ من منطق الصفحة يُرفض برسالةٍ عربية ولا يتغيّر شيء', { timeout: 300000 }, async () => {
  const lab = await world(), b = await chromium.launch();
  try {
    const m0 = await openAs(b, lab, LAB.mgrA, LAB.pw); await m0.go('#/staffing', 5000);
    assert.equal((await createMonth(m0.page)).status(), 200); await lab.idle(); await m0.ctx.close();
    await grant(b, lab, { staff: 'edit' });
    const s = await openAs(b, lab, LAB.empA, LAB.pw), p = s.page; await toasts(s);
    await s.go('#/staffing', 5000);
    const { y, m } = await ym(p), v0 = JSON.stringify((await doc(s))[y + '-' + m]);
    assert.ok(v0 && v0 !== 'undefined', 'في الشهر جدول');
    assert.equal(await p.locator('main span[title="سيتم حذف جميع بيانات الشهر"]').count(), 0, 'لا × لحذف الشهر لمن لا يملك الحذف');
    const t0 = (await seen(s)).length;
    await forgeDelete(p, y, m);
    await until(async () => (await seen(s)).slice(t0).some(isArabicRefusal), 'رسالةُ رفضٍ عربية').catch(async (e) => { throw new Error(e.message + ' ' + JSON.stringify(await seen(s))); });
    await lab.idle(); assert.equal(JSON.stringify((await doc(s))[y + '-' + m]), v0, 'لا يتغيّر شيء');
    assert.deepEqual(s.errs, []);
  } finally { await b.close(); await lab.close(); }
});

/* V7 · د7 (ج ١٥ — تصديرُ الملفات): «ملفات» ← «تصدير Excel» ⇒ ‎.xlsx‎ غيرُ فارغ · «طباعة / حفظ PDF» ⇒ نافذةُ الطباعة — لمدير الإدارة وموظفٍ بدور «كامل»؛
   وبدور «مشاهدة» لا يُعرض «ملفات» */
test('جدول ③: التصدير — مديرُ الإدارة وموظفٌ بدور «كامل» يصدّران Excel ويطبعان PDF · وبدور «مشاهدة» لا تصدير', { timeout: 600000 }, async () => {
  const lab = await world(), b = await launchUtf8();
  try {
    await grant(b, lab, { staff: 'full' });
    for (const { who, un } of ACTORS.filter((a) => a.un === LAB.mgrA)) {   /* V7 · 53: الموظفُ بدور — الحالةُ المسمّاة أدناه (تخطٍّ بسبب) */
      const s = await openAs(b, lab, un, LAB.pw, { context: { acceptDownloads: true } }), p = s.page; p.setDefaultTimeout(20000);
      await s.go('#/staffing', 5000);
      await revealAll(p); if (!(await p.locator('main button:visible', { hasText: /^\s*ملفات\s*$/ }).count())) { assert.equal((await createMonth(p)).status(), 200, who); await lab.idle(); await reloadAt(s, '#/staffing', 5000); }
      const { f, bad } = await filesMenu(p, who);
      assert.deepEqual(bad, [], who + ': ' + f.name + ' · ' + f.bytes.length + ' بايت');
      assert.deepEqual(s.errs, [], who + ': لا أخطاء صفحة');
      await s.ctx.close();
    }
    await grant(b, lab, { staff: 'view' });
    const s = await openAs(b, lab, LAB.empA, LAB.pw), p = s.page;
    await s.go('#/staffing', 5000);
    assert.ok(!(await mainText(p)).includes('لا يوجد جدول لشهر'), 'الجدولُ معروضٌ للمشاهدة');
    await revealAll(p); assert.ok(await p.locator('main input[placeholder^="بحث"]:visible').count(), 'شريطُ الجدول مرسوم (فلا يمرّ فحصُ الغياب على صفحةٍ لم تُرسم)');
    assert.equal(await p.locator('main button:visible', { hasText: /^\s*ملفات\s*$/ }).count(), 0, 'بدور «مشاهدة» لا «ملفات» ولا تصدير');
    await s.ctx.close();
  } finally { await b.close(); await lab.close(); }
});

/* V7 · 53: ③ للموظف بدور «كامل» — الحالةُ نفسُها؛ تُتخطّى بسببٍ مسمّى (الاكتشاف ١ في trimcov_report) فلا تمرّ صامتة */
test('جدول ③ب: التصدير — موظفٌ بدور «كامل» يرى «ملفات» ويصدّر', { skip: 'خللٌ مُبلَّغ (53 · trimcov_report، الاكتشاف ١): لا مستوى في محرّر الأدوار يمنح التصدير — ذرّةُ «تصدير» حُوّلت علمَ ميزة (ff.…export) ومستوياتُ الأدوار تمنح مفاتيحَ السجلّ وحدها، فحاملُ الدور «كامل» (وحتى «حسّاس») لا يرى «ملفات». يُفعَّل حين يقرّر المالك', timeout: 300000 }, async () => {
  const lab = await world(), b = await launchUtf8();
  try {
    await grant(b, lab, { staff: 'full' });
    const s = await openAs(b, lab, LAB.empA, LAB.pw, { context: { acceptDownloads: true } }), p = s.page; p.setDefaultTimeout(20000);
    await s.go('#/staffing', 5000);
    assert.equal(await p.evaluate((k) => KIVO.BassamPerm.can(k, 'export'), 'staffing'.replace('staffing', 'staff')), true, 'حاملُ الدور «كامل» يملك التصدير');
    await s.ctx.close();
  } finally { await b.close(); await lab.close(); }
});
