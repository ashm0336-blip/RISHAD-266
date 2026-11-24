/* V7 · د6 (51ج · قرار المالك): «موظفو الإدارة» والإدارة فارغة — الحالةُ الفارغة تعرض بجانب «استيراد من Excel» زرَّ «تنزيل قالب الاستيراد»
   (لا قائمة «ملفات» بلا موظفين، فكان القالبُ بلا طريق). الزرُّ يستدعي impColsDo نفسَه، وينزّل ملفاً بالعناوين الاثنَي عشر.
   المختبرُ المعزول (العاملُ الحقيقي · TEST_ONLY · بلا شبكة). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';
import { replaceOperationalFixture } from '../unit/operational_legacy_seed_fx.mjs';


test('V7 · د6 (51ج) · empty department: «تنزيل قالب الاستيراد» next to «استيراد من Excel» downloads the template with its twelve headings', { timeout: 300000 }, async () => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    const D = 'TEST_ONLY_A';
    await replaceOperationalFixture(lab.env, 'bsdept:' + D + ':bassam_employees_v1', []);
    const s = await openAs(b, lab, LAB.mgrA, LAB.pw, { context: { acceptDownloads: true } });
    const p = s.page; p.setDefaultTimeout(15000);
    await s.go('#/employees', 4000);
    await p.getByText('لا يوجد موظفون في الإدارة بعد').first().waitFor();
    const imp = p.locator('[data-emp-imp="empty"]'), tpl = p.locator('[data-emp-imp="empty-tpl"]');
    await imp.waitFor(); await tpl.waitFor();
    assert.match(await tpl.innerText(), /تنزيل قالب الاستيراد/);
    /* بشكل الزرّ المجاور: الصنفُ والنمطُ نفساهما */
    const [a, c] = await Promise.all([imp, tpl].map((l) => l.evaluate((e) => [e.className, e.getAttribute('style')])));
    assert.deepEqual(c, a, 'same look as «استيراد من Excel»');
    const dl = p.waitForEvent('download', { timeout: 20000 });
    await tpl.click();
    const d = await dl, path = await d.path();
    /* اسمُ الملف المقترح يأتي من دالة التنزيل المشتركة (BassamXLSX.download — نفسها في قائمة «ملفات») لا من هذا الزر؛ يُسجَّل للتشخيص */
    console.log('# suggested filename: ' + d.suggestedFilename());
    const bytes = fs.readFileSync(path);
    assert.ok(bytes.length > 200, 'a real file was downloaded');
    /* العناوين من الملف نفسه، بمحلّل المنصة */
    const heads = await p.evaluate(async (b64) => { const u = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0)); const rows = await KIVO.BassamXLSX.parse(u.buffer); return rows[0]; }, bytes.toString('base64'));
    const got = (heads || []).map((x) => String(x || '').trim()).filter(Boolean);
    /* المصدرُ الواحد للعناوين: colTitles() نفسُها التي يكتب بها impCols */
    const want = await p.evaluate(() => (KIVO.BassamEmpImp && KIVO.BassamEmpImp.colTitles ? KIVO.BassamEmpImp.colTitles() : []).map((x) => String(x).trim()));
    assert.equal(want.length, 12, 'the template has twelve headings: ' + JSON.stringify(want));
    assert.deepEqual(got, want, 'the downloaded file carries exactly those headings, in order');
    assert.deepEqual(s.errs, [], 'no page errors');
  } finally { await b.close(); await lab.close(); }
});
