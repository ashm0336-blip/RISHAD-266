/* V7 · د7 (ج ١٥ — ما لم تغطّه أدوات الفحص): «العهد» — تسليمٌ وإرجاع في متصفحٍ حقيقي على المختبر المعزول (العاملُ الحقيقي · الإنفاذ · TEST_ONLY).
   ① مديرُ الإدارة وموظفٌ بدور «تعديل» على العهد: «مستودع العهد» ← «صنف جديد» (3 قطع) ← «عهد الموظفين» ← «تسليم عهدة» (الموظف · الصنف · «اعتماد وإنشاء السند»)
      ⇒ تُسجَّل في الخادم (custody_issues) وتبقى بعد إعادة التحميل («بعهدته») · ثم «استرجاع القطعة» ⇒ حركةُ إرجاع في الخادم وتبقى بعد التحميل («إرجاعات الشهر» · لا «بعهدته»).
      والشهرُ المنقضي مقفل: لا «تسليم عهدة» فيه.
   ② موظفٌ بدور «مشاهدة» على العهد: لا «تسليم عهدة» ولا «صنف جديد»، وطلبُ التسليم من منطق الصفحة نفسِه يُرفض برسالةٍ عربية ظاهرة ولا يتغيّر شيء. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, grant, ACTORS, LAB, A, chromium, openAs, mainText, norm, reloadAt, refusals, logicOf, isArabicRefusal, until, toasts, seen } from '../../../../../tests/browser/d7_cov_lib.mjs';

const q = (lab, sql) => lab.env.DB.q(sql, A)[0].n;
const issues = (lab) => q(lab, 'SELECT COUNT(*) AS n FROM custody_issues WHERE department_id=?1');
const moves = (lab) => q(lab, 'SELECT COUNT(*) AS n FROM custody_movements WHERE department_id=?1');
const items = (lab) => q(lab, 'SELECT COUNT(*) AS n FROM custody_items WHERE department_id=?1');
const L = (p, fn, arg) => p.evaluate(async ([src, fn, arg]) => { const x = new Function('return ' + src)(); return new Function('L', 'arg', 'return (async () => {' + fn + '})()')(x, arg); }, [logicOf('Employees'), fn, arg]);   /* src/fn: ثوابتُ هذا الملف */
const btns = (p) => p.evaluate(() => [...document.querySelectorAll('main button')].filter((x) => x.getBoundingClientRect().width > 1).map((x) => x.textContent.trim()));
const holderRow = async (p, name) => (await p.evaluate(() => [...document.querySelectorAll('main tr, main [role=row]')].map((r) => r.innerText))).map(norm).find((t) => t.includes(norm(name))) || '';

async function newType(p, name) {
  await p.getByRole('button', { name: 'صنف جديد' }).click();
  await p.fill('main input[placeholder="جهاز لاسلكي"]', name); await p.locator('main input[placeholder="RD"]').fill('TS');
  await p.locator('main input[placeholder="جهاز لاسلكي"]').locator('xpath=ancestor::*[.//input[@placeholder="RD"]][1]').locator('input').nth(1).fill('3');
  const post = p.waitForResponse((r) => /\/api\/custody\/act$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST');
  await p.getByRole('button', { name: 'حفظ', exact: true }).click();
  return post;
}
async function handOut(p, holder) {
  await p.getByRole('button', { name: 'تسليم عهدة' }).click();
  await p.getByText('بدون تسكين').last().click();
  await p.getByText(holder, { exact: true }).last().click();
  await p.getByRole('button', { name: 'متابعة' }).click();
  await p.locator('span', { hasText: /^جديد$/ }).last().click();
  await p.getByRole('button', { name: 'متابعة' }).click();
  const post = p.waitForResponse((r) => /\/api\/custody\/act$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST');
  await p.getByRole('button', { name: 'اعتماد وإنشاء السند' }).click();
  return post;
}
async function giveBack(p) {
  await p.locator('main [title="إجراءات هذه القطعة"]').first().click();
  const post = p.waitForResponse((r) => /\/api\/custody\/act$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST');
  await p.getByText('استرجاع القطعة', { exact: true }).first().click();
  return post;
}
/* صفُّ الحامل يُفتح لعرض قطعه (النقرُ على عدد أصنافه) */
const openRow = async (p, name) => { if (await p.locator('main [title="إجراءات هذه القطعة"]').count()) return; await p.locator('main tbody tr').filter({ hasText: name }).first().locator('td[data-label="الأصناف"] span[title]').first().click(); };

test('عهد ①: مديرُ الإدارة وموظفٌ بدور «تعديل» يضيفان صنفاً ويسلّمان عهدةً ويسترجعانها — كلٌّ يُحفظ ويبقى بعد التحميل · والشهرُ المنقضي مقفل', { timeout: 600000 }, async () => {
  const lab = await world(), b = await chromium.launch();
  try {
    await grant(b, lab, { emps: 'view', custody: 'edit' });
    for (const [i, { who, un }] of ACTORS.entries()) {
      const s = await openAs(b, lab, un, LAB.pw), p = s.page; p.setDefaultTimeout(20000); await toasts(s);
      const bad = refusals(s, /^\/api\/custody/), holder = 'TEST_ONLY موظف أ٢', type = 'TEST_ONLY صنف ' + (i + 1);
      const fail = async (e) => { throw new Error(who + ': ' + e.message + ' — ' + JSON.stringify(await seen(s)) + ' · ' + norm(await mainText(p)).slice(0, 700)); };
      await s.go('#/employees/store', 4500);
      const i0 = items(lab), t = await newType(p, type).catch(fail);
      assert.equal(t.status(), 200, who + ': ' + (await t.text()).slice(0, 300));
      await lab.idle(); assert.equal(items(lab), i0 + 1, who + ': الصنفُ في الخادم');
      await reloadAt(s, '#/employees/store');
      await until(async () => norm(await mainText(p)).includes(norm(type)), who + ': الصنفُ بعد التحميل').catch(fail);
      /* التسليم */
      await s.go('#/employees/custody', 4500);
      const n0 = issues(lab), m0 = moves(lab), h = await handOut(p, holder).catch(fail);
      assert.equal(h.status(), 200, who + ': ' + (await h.text()).slice(0, 300));
      await lab.idle(); assert.equal(issues(lab), n0 + 1, who + ': العهدةُ في الخادم'); assert.equal(moves(lab), m0 + 1, who + ': وحركةُ التسليم');
      await reloadAt(s, '#/employees/custody');
      await until(async () => /بعهدته/.test(await holderRow(p, holder)), who + ': «بعهدته» بعد التحميل').catch(fail);
      /* الإرجاع */
      await openRow(p, holder).catch(fail);
      const r = await giveBack(p).catch(fail);
      assert.equal(r.status(), 200, who + ': ' + (await r.text()).slice(0, 300));
      await lab.idle(); assert.equal(moves(lab), m0 + 2, who + ': حركةُ الإرجاع في الخادم');
      assert.equal(q(lab, "SELECT COUNT(*) AS n FROM custody_movements WHERE department_id=?1 AND kind='in'"), i + 1, who + ': الحركةُ «إرجاع» (in)');
      await reloadAt(s, '#/employees/custody');
      await until(async () => norm(await mainText(p)).includes('إرجاعات الشهر −' + (i + 1)) && !/بعهدته/.test(await holderRow(p, holder)), who + ': الإرجاعُ في «ميزان الشهر» والحاملُ بلا عهدة بعد التحميل').catch(fail);
      /* الشهرُ المنقضي (السابق) مقفل: لا تسليمَ فيه */
      await p.locator('main button, main [role=button]').filter({ hasText: /انقضى/ }).last().click(); await p.waitForTimeout(1500);
      assert.ok(!norm(await mainText(p)).includes('— الشهر الجاري'), who + ': الشهرُ المعروض هو المنقضي لا الجاري');
      assert.ok(!(await btns(p)).includes('تسليم عهدة'), who + ': لا «تسليم عهدة» في شهرٍ مقفل');
      assert.deepEqual(bad, [], who + ': لا رفضَ في مسار الحفظ');
      assert.deepEqual(s.errs, [], who + ': لا أخطاء صفحة');
      await s.ctx.close();
    }
  } finally { await b.close(); await lab.close(); }
});

test('عهد ②: موظفٌ بدور «مشاهدة» لا يُعرض له التسليمُ ولا الصنفُ الجديد، والطلبُ من منطق الصفحة يُرفض برسالةٍ عربية ظاهرة ولا يتغيّر شيء', { timeout: 300000 }, async () => {
  const lab = await world(), b = await chromium.launch();
  try {
    /* صنفٌ في المستودع يضيفه مديرُ الإدارة */
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw); await m.go('#/employees/store', 4500); assert.equal((await newType(m.page, 'TEST_ONLY صنف م')).status(), 200); await lab.idle(); await m.ctx.close();
    await grant(b, lab, { emps: 'view', custody: 'view' });
    const s = await openAs(b, lab, LAB.empA, LAB.pw), p = s.page; await toasts(s);
    await s.go('#/employees/custody', 4500);
    assert.ok((await mainText(p)).includes('ميزان الشهر'), 'تبويبُ العهد مفتوحٌ للمشاهدة');
    assert.ok(!(await btns(p)).includes('تسليم عهدة'), 'لا «تسليم عهدة» لمن لا يملك مفتاحه');
    await s.go('#/employees/store', 4500);
    assert.ok(!(await btns(p)).includes('صنف جديد'), 'ولا «صنف جديد»');
    const n0 = issues(lab), m0 = moves(lab);
    const f = await L(p, "const r = await L.cuHandOut('TEST_ONLY_eA2', 'TEST_ONLY صنف م', '#b99751', 'new'); await new Promise((go) => setTimeout(go, 800)); return { ok: r && r.ok, status: r && r.status, message: r && r.message, shown: (document.querySelector('main') || document.body).innerText.includes(r && r.message || '\\0') };");
    assert.equal(f.ok, 0, JSON.stringify(f)); assert.equal(f.status, 403, JSON.stringify(f));
    assert.ok(isArabicRefusal(f.message), JSON.stringify(f));
    assert.ok(f.shown || (await seen(s)).some((t) => t.includes(f.message)), 'الرفضُ ظاهرٌ في الصفحة: ' + JSON.stringify([f, await seen(s)]));
    await lab.idle(); assert.equal(issues(lab), n0, 'لا يتغيّر شيء'); assert.equal(moves(lab), m0);
    assert.deepEqual(s.errs, []);
  } finally { await b.close(); await lab.close(); }
});
