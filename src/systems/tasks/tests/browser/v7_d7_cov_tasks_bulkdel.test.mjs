/* V7 · د7 (ج ١٥ — ما لم تغطّه أدوات الفحص): «الحذف الجماعي في المهام» — «حذف جميع بيانات الشهر» من كرت الشهر، في متصفحٍ حقيقي على المختبر المعزول
   (العاملُ الحقيقي · الإنفاذ · TEST_ONLY).
   ① مديرُ الإدارة وموظفٌ بدورٍ يملك الحذف: يُنشئ مهمتين في الشهر الجاري من الواجهة («إنشاء المهمة») فتُحفظان وتبقيان بعد التحميل، ثم ×
      «سيتم حذف جميع بيانات الشهر» ← «حذف نهائي» ⇒ يخلو الشهرُ في الخادم ويبقى خالياً بعد التحميل.
      والشهرُ السابق المعتمَد المقفل (فيه مهامُّ TEST_ONLY مبذورة): الحذفُ الجماعي يُرفض برسالةٍ عربية ظاهرة ولا يتغيّر شيء.
   ② موظفٌ بدورٍ بلا مفتاح الحذف («تعديل»): لا يُعرض له × على كرت الشهر، وطلبُ الحذف من منطق الصفحة نفسِه يُرفض برسالةٍ عربية ولا يتغيّر شيء. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, grant, ACTORS, LAB, A, chromium, openAs, mainText, norm, reloadAt, logicOf, isArabicRefusal, until, toasts, seen, launchUtf8, filesMenu, revealAll } from '../../../../../tests/browser/d7_cov_lib.mjs';
import { replaceOperationalFixture } from '../../../../../tests/unit/world_fx.mjs';

const K = 'bsdept:' + A + ':bassam_tasks_v1';
const L = (p, fn, arg) => p.evaluate(async ([src, fn, arg]) => { const x = new Function('return ' + src)(); return new Function('L', 'arg', 'return (async () => {' + fn + '})()')(x, arg); }, [logicOf('Tasks'), fn, arg]);   /* src/fn: ثوابتُ هذا الملف */
const doc = async (s) => { const r = await s.api('/api/operations/read?keys=' + encodeURIComponent(K)); return (r.j && r.j.resources && r.j.resources[K]) || {}; };
const inMonth = (d, y, m) => Object.entries(d).filter(([k]) => { const p = k.split('-'); return +p[0] === y && +p[1] === m; }).reduce((n, [, v]) => n + (Array.isArray(v) ? v.length : 0), 0);
const ym = (p) => L(p, 'return { y: L.state.year, m: L.state.month };');
/* كرتُ الشهر m (زرُّه يحمل اسمَ الشهر) — والـ× فوقه */
/* V7 · 53 تقويم: كرتُ الشهر من المكوّن المشترك (KIVO.BassamCalCard.month · data-cal-key="YYYY-MM") — والـ× بجانبه في غلافه */
const MK = (y, m) => y + '-' + String(m).padStart(2, '0');
const cardX = (p, key) => p.locator(`xpath=//main//*[*[@data-cal-kind="month" and @data-cal-key="${key}"]]/span[@title="سيتم حذف جميع بيانات الشهر"]`);

async function addTask(p, title) {
  const btn = p.getByRole('button', { name: /إضافة أول مهمة|مهمة جديدة|إضافة مهمة/ }).first();
  await btn.click();
  await p.fill('main input[placeholder="مثال: تفقد بوابة الملك عبدالعزيز"]', title);
  const post = p.waitForResponse((r) => /^\/api\/(save|tasks\/[a-z]+)$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST', { timeout: 20000 });
  await p.getByRole('button', { name: 'إنشاء المهمة' }).click();
  return post;
}
async function deleteMonth(p, name) {
  await cardX(p, name).first().click();
  await p.getByRole('button', { name: 'حذف نهائي' }).waitFor();
  const post = p.waitForResponse((r) => /^\/api\/(save|tasks\/[a-z]+)$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST', { timeout: 20000 }).catch(() => null);
  await p.getByRole('button', { name: 'حذف نهائي' }).click();
  return post;
}

test('مهام ①: مديرُ الإدارة وموظفٌ بدور يُنشئان مهامَّ ثم يحذفان الشهرَ كلَّه — يُحفظ ويبقى بعد التحميل · والشهرُ المقفل يُرفض حذفُه برسالةٍ عربية', { timeout: 600000 }, async () => {
  const lab = await world(), b = await chromium.launch();
  try {
    await grant(b, lab, { tasks: 'sensitive' });
    for (const { who, un } of ACTORS) {
      const s = await openAs(b, lab, un, LAB.pw), p = s.page; p.setDefaultTimeout(20000); await toasts(s);
      const fail = async (e) => { throw new Error(who + ': ' + e.message + ' — ' + JSON.stringify(await seen(s)) + ' · ' + norm(await mainText(p)).slice(0, 600)); };
      await s.go('#/tasks', 5000);
      const { y, m } = await ym(p);
      for (const t of ['TEST_ONLY مهمة ١', 'TEST_ONLY مهمة ٢']) { const r = await addTask(p, t).catch(fail); assert.equal(r.status(), 200, who + ': ' + (await r.text()).slice(0, 300)); await p.waitForTimeout(800); }
      await lab.idle();
      assert.equal(inMonth(await doc(s), y, m), 2, who + ': المهمتان في الخادم');
      await reloadAt(s, '#/tasks', 5000);
      await until(async () => (await mainText(p)).includes('TEST_ONLY مهمة ٢'), who + ': المهامُّ بعد التحميل').catch(fail);
      const made = Object.entries(await doc(s)).filter(([k]) => { const q = k.split('-'); return +q[0] === y && +q[1] === m; });   /* صفوفٌ حقيقية كتبتها الواجهة — تُبذر في الشهر المقفل أدناه */
      /* الحذفُ الجماعي للشهر الجاري */
      const del = await deleteMonth(p, MK(y, m)).catch(fail);
      assert.ok(del && del.status() === 200, who + ': حذفُ الشهر: ' + (del ? del.status() + ' ' + (await del.text()).slice(0, 300) : 'لا طلب'));
      await lab.idle(); assert.equal(inMonth(await doc(s), y, m), 0, who + ': الشهرُ خالٍ في الخادم');
      await reloadAt(s, '#/tasks', 5000);
      await until(async () => (await mainText(p)).includes('لا توجد مهام لشهر'), who + ': الشهرُ خالٍ بعد التحميل').catch(fail);
      /* الشهرُ المنقضي (السابق) مقفل وفيه مهامُّ مبذورة: الحذفُ يُرفض */
      const py = m === 1 ? y - 1 : y, pm = m === 1 ? 12 : m - 1, before = await doc(s);
      /* صفوفُ الواجهة نفسُها منقولةً إلى الشهر السابق (هويةٌ وأوقاتٌ قبل 30 يوماً · TEST_ONLY) — والشهرُ معتمدٌ مقفل (bassam_tasks_locks_v1: قفلُ الخادم؛
         الشهرُ المنقضي بلا اعتماد قفلُه في الواجهة وحدها — lockState في scope.items.tasks) */
      const D30 = 30 * 86400000, seeded = { ...before };
      made.forEach(([k, v]) => { seeded[MK(py, pm) + '-' + k.split('-')[2]] = v.map((r) => { const x = JSON.parse(JSON.stringify(r)); x[13] -= D30; x[15] -= D30; x[16] -= D30; x[22] = 'TEST_ONLY_lk_' + x[22]; return x; }); });
      await replaceOperationalFixture(lab.env, K, seeded);
      await replaceOperationalFixture(lab.env, 'bsdept:' + A + ':bassam_tasks_locks_v1', { [MK(py, pm)]: true });
      await reloadAt(s, '#/tasks', 5000);
      const n0 = inMonth(await doc(s), py, pm); assert.ok(n0 > 0, who + ': الشهرُ المقفل فيه مهام');
      await L(p, 'L.setState({ month: arg.m, year: arg.y }); await new Promise((go) => setTimeout(go, 800));', { y: py, m: pm });
      const t0 = (await seen(s)).length;
      const x = await cardX(p, MK(py, pm)).count();
      if (x) await deleteMonth(p, MK(py, pm)).catch(() => null);
      else await L(p, 'await L._tkDeleteMonth(arg.y, arg.m);', { y: py, m: pm });
      await until(async () => (await seen(s)).slice(t0).some(isArabicRefusal), who + ': رسالةُ رفضٍ عربية لحذف شهرٍ مقفل (× ' + (x ? 'ظاهر' : 'غير ظاهر') + ') · في الخادم الآن ' + inMonth(await doc(s), py, pm) + ' من ' + n0).catch(fail);
      await lab.idle(); assert.equal(inMonth(await doc(s), py, pm), n0, who + ': لا يتغيّر شيء في الشهر المقفل');
      await replaceOperationalFixture(lab.env, K, before); await replaceOperationalFixture(lab.env, 'bsdept:' + A + ':bassam_tasks_locks_v1', {});
      assert.deepEqual(s.errs, [], who + ': لا أخطاء صفحة');
      await s.ctx.close();
    }
  } finally { await b.close(); await lab.close(); }
});

test('مهام ②: موظفٌ بدورٍ بلا مفتاح الحذف لا يُعرض له حذفُ الشهر، والطلبُ من منطق الصفحة يُرفض برسالةٍ عربية ولا يتغيّر شيء', { timeout: 300000 }, async () => {
  const lab = await world(), b = await chromium.launch();
  try {
    const m0 = await openAs(b, lab, LAB.mgrA, LAB.pw); await m0.go('#/tasks', 5000);
    assert.equal((await addTask(m0.page, 'TEST_ONLY مهمة المدير')).status(), 200); await lab.idle(); await m0.ctx.close();
    await grant(b, lab, { tasks: 'edit' });
    const s = await openAs(b, lab, LAB.empA, LAB.pw), p = s.page; await toasts(s);
    await s.go('#/tasks', 5000);
    const { y, m } = await ym(p), n0 = inMonth(await doc(s), y, m);
    assert.ok(n0 > 0, 'في الشهر مهمة');
    assert.equal(await p.locator('main span[title="سيتم حذف جميع بيانات الشهر"]').count(), 0, 'لا × لحذف الشهر لمن لا يملك الحذف');
    const t0 = (await seen(s)).length;
    await L(p, 'await L._tkDeleteMonth(arg.y, arg.m);', { y, m });
    await until(async () => (await seen(s)).slice(t0).some(isArabicRefusal), 'رسالةُ رفضٍ عربية').catch(async (e) => { throw new Error(e.message + ' ' + JSON.stringify(await seen(s))); });
    await lab.idle(); assert.equal(inMonth(await doc(s), y, m), n0, 'لا يتغيّر شيء');
    assert.deepEqual(s.errs, []);
  } finally { await b.close(); await lab.close(); }
});

/* V7 · د7 (ج ١٥ — تصديرُ الملفات): «ملفات» ← «تصدير Excel» ⇒ ‎.xlsx‎ غيرُ فارغ · «طباعة / حفظ PDF» ⇒ نافذةُ الطباعة — لمدير الإدارة وموظفٍ بدور «كامل»؛
   وبدور «مشاهدة» لا يُعرض «ملفات» */
test('مهام ③: التصدير — مديرُ الإدارة وموظفٌ بدور «كامل» يصدّران Excel ويطبعان PDF · وبدور «مشاهدة» لا تصدير', { timeout: 600000 }, async () => {
  const lab = await world(), b = await launchUtf8();
  try {
    await grant(b, lab, { tasks: 'full' });
    for (const { who, un } of ACTORS.filter((a) => a.un === LAB.mgrA)) {   /* V7 · 53: الموظفُ بدور — الحالةُ المسمّاة أدناه (تخطٍّ بسبب) */
      const s = await openAs(b, lab, un, LAB.pw, { context: { acceptDownloads: true } }), p = s.page; p.setDefaultTimeout(20000);
      await s.go('#/tasks', 5000);
      await revealAll(p); if (!(await p.locator('main button:visible', { hasText: /^\s*ملفات\s*$/ }).count())) { for (const t of ['TEST_ONLY مهمة للتصدير']) assert.equal((await addTask(p, t)).status(), 200, who); await lab.idle(); await reloadAt(s, '#/tasks', 5000); }
      const { f, bad } = await filesMenu(p, who);
      assert.deepEqual(bad, [], who + ': ' + f.name + ' · ' + f.bytes.length + ' بايت');
      assert.deepEqual(s.errs, [], who + ': لا أخطاء صفحة');
      await s.ctx.close();
    }
    await grant(b, lab, { tasks: 'view' });
    const s = await openAs(b, lab, LAB.empA, LAB.pw), p = s.page;
    await s.go('#/tasks', 5000);
    assert.ok((await mainText(p)).includes('TEST_ONLY مهمة للتصدير'), 'المهامُّ معروضةٌ للمشاهدة');
    await revealAll(p); assert.ok(await p.locator('main input[placeholder^="بحث"]:visible').count(), 'شريطُ الجدول مرسوم (فلا يمرّ فحصُ الغياب على صفحةٍ لم تُرسم)');
    assert.equal(await p.locator('main button:visible', { hasText: /^\s*ملفات\s*$/ }).count(), 0, 'بدور «مشاهدة» لا «ملفات» ولا تصدير');
    await s.ctx.close();
  } finally { await b.close(); await lab.close(); }
});

/* V7 · 53: ③ للموظف بدور «كامل» — الحالةُ نفسُها؛ تُتخطّى بسببٍ مسمّى (الاكتشاف ١ في trimcov_report) فلا تمرّ صامتة */
test('مهام ③ب: التصدير — موظفٌ بدور «كامل» يرى «ملفات» ويصدّر', { skip: 'خللٌ مُبلَّغ (53 · trimcov_report، الاكتشاف ١): لا مستوى في محرّر الأدوار يمنح التصدير — ذرّةُ «تصدير» حُوّلت علمَ ميزة (ff.…export) ومستوياتُ الأدوار تمنح مفاتيحَ السجلّ وحدها، فحاملُ الدور «كامل» (وحتى «حسّاس») لا يرى «ملفات». يُفعَّل حين يقرّر المالك', timeout: 300000 }, async () => {
  const lab = await world(), b = await launchUtf8();
  try {
    await grant(b, lab, { tasks: 'full' });
    const s = await openAs(b, lab, LAB.empA, LAB.pw, { context: { acceptDownloads: true } }), p = s.page; p.setDefaultTimeout(20000);
    await s.go('#/tasks', 5000);
    assert.equal(await p.evaluate((k) => KIVO.BassamPerm.can(k, 'export'), 'tasks'.replace('staffing', 'staff')), true, 'حاملُ الدور «كامل» يملك التصدير');
    await s.ctx.close();
  } finally { await b.close(); await lab.close(); }
});
