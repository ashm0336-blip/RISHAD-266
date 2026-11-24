/* V7 · 53 (ملحق مؤشرات الكانفس · بند الفحص الحي 15) — «حالة التغطية» على iPhone 13 تعرض قيمَ سطح المكتب نفسَها:
   الحلقة و«عجز (موظف)» و«متاح للتغطية» بسطر «احتياط N · فائض M» و«بلا موقع فعّال» و«الحاضرون الآن» — بلا سطر «الاحتياط غير المسكَّن».
   مختبرٌ معزول · بياناتُ العرض TEST_ONLY · بلا شبكة. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { startLab } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';
import { LAB } from './local_server.mjs';

const { devices } = createRequire(process.env.KIVO_PLAYWRIGHT || (execSync('npm root -g').toString().trim() + '/'))('playwright');

async function card(b, lab, m1, dev) {
  const s = await openAs(b, lab, m1.un, m1.pw, dev ? { viewport: dev.viewport, context: dev } : { viewport: { width: 1440, height: 900 } });
  const p = s.page; p.setDefaultTimeout(20000);
  await s.go('#/daily/rounds', 4500);
  const later = p.getByText('لاحقاً'); if (await later.count()) await later.first().click().catch(() => {});
  await p.locator('main button[title^="وضع التوزيع"]').first().click();
  await p.waitForTimeout(1200);
  /* وضعُ التوزيع يفتح «حالة التغطية» مباشرةً — يُنقر تبويبُها فقط إن لم يظهر الكرت */
  if (!(await p.locator('main :text("الموقف الآن")').count())) await p.locator('main :text-is("حالة التغطية")').first().click({ force: true });
  await p.waitForTimeout(1200);
  const box = p.locator('main div', { hasText: 'الموقف الآن' }).filter({ hasText: 'متاح للتغطية' }).last();
  await box.waitFor();
  const txt = (await box.innerText()).replace(/[\u2066-\u2069\u202a-\u202e]/g, '').replace(/\s+/g, ' ');
  const tile = p.locator('main div[title^="الاحتياط: حاضر لم يُسكَّن"]').first();
  const tl = { title: await tile.getAttribute('title'), text: (await tile.innerText()).replace(/[\u2066-\u2069\u202a-\u202e]/g, '').replace(/\s+/g, ' ') };   /* طبقةُ العرض تعزل الأرقام اتجاهياً وتجعل «·» «-» */
  const errs = s.errs.slice();
  await s.ctx.close();
  return { txt, tl, errs };
}

test('V7 · 53 — «حالة التغطية» (متاح للتغطية = احتياط + فائض) بالقيم نفسها على iPhone 13 وسطح المكتب', { timeout: 600000 }, async (t) => {
  const lab = await startLab(), b = await chromium.launch();
  lab.env.KIVO_TEST_FIXTURE = 'allow'; lab.env.KIVO_TEST_HOST = 'lab.local';
  try {
    const su = await openAs(b, lab, LAB.superUn, LAB.superPw);
    const seed = await su.api('/api/demo-data', { method: 'POST', body: JSON.stringify({ act: 'seed', reveal: true }) });
    assert.equal(seed.status, 200, JSON.stringify(seed.j && seed.j.err));
    const m1 = seed.j.secrets.find((x) => x.id === 'tst_demo_u_m1');
    const desk = await card(b, lab, m1, null), phone = await card(b, lab, m1, devices['iPhone 13']);
    t.diagnostic('desktop: ' + desk.txt.slice(0, 400));
    t.diagnostic('iPhone 13: ' + phone.txt.slice(0, 400));
    const D = '([0-9٠-٩]+)', RX = new RegExp('^' + D + ' متاح للتغطية احتياط ' + D + ' [·-] فائض ' + D + '$');
    assert.match(desk.tl.text, RX, 'التبليطة: الرقم ثم «متاح للتغطية» ثم «احتياط N · فائض M»');
    const num = (x) => +String(x).replace(/[٠-٩]/g, (c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c));
    const [, n, r, f] = desk.tl.text.match(RX);
    assert.equal(num(n), num(r) + num(f), 'الرقم = الاحتياط + الفائض');
    assert.ok(!/الاحتياط غير المسكَّن/.test(desk.txt), 'لا سطر «الاحتياط غير المسكَّن»');
    assert.equal(phone.tl.text, desk.tl.text, 'التبليطة نفسها على الجوال');
    assert.equal(phone.tl.title, desk.tl.title, 'التلميح نفسه');
    const nums = (x) => (x.match(/[0-9٠-٩]+[%٪]?|—/g) || []).join(',');
    assert.equal(nums(phone.txt), nums(desk.txt), 'كل أرقام الكرت نفسها على الجوال');
    assert.deepEqual(desk.errs, []); assert.deepEqual(phone.errs, []);
  } finally { await b.close(); await lab.close(); }
});
