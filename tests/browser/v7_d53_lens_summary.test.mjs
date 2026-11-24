/* V7 · 53 (writers · بقايا 52): ملخّصُ الاستيراد يذكر تضييقَ العدسات — «العدسات 3 من 6». الاستيرادُ يضيّق عدساتِ الوحدة إلى ما في النسخة
   (019d rsDeptLensNarrow · ك1) وكان الملخّصُ قبل التأكيد صامتاً عنه. مديرُ المنصة على TEST_ONLY_B (عدساتُها الستّ) يصدّر نسختها، ونسختُها بثلاث عدسات
   (شكلُ Production: zones · paths · dens)، فيقرأ الملخّصُ «العدسات 3 من 6»، وبعد «استبدال كامل» السقفُ في الخادم ثلاث — والملخّصُ صادق. مختبرٌ معزول TEST_ONLY. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { world, kv, LAB, chromium, openAs } from './d7_cov_lib.mjs';
import { PROD_LENSES } from '../unit/v7_d6_import_fx.mjs';

const click = async (p, t) => { const el = p.getByText(t, { exact: true }).last(); await el.waitFor({ state: 'visible', timeout: 20000 }); await el.click(); };
const B = 'TEST_ONLY_B';

test('53: ملخّصُ استيراد نسخة الإدارة يذكر تضييقَ العدسات («العدسات 3 من 6») ويطابق ما يكتبه الخادم', { timeout: 300000 }, async () => {
  const lab = await world(), b = await chromium.launch();
  try {
    const P0 = kv(lab, 'bassam_perms_v1');
    assert.ok(!Array.isArray((P0.lenses || {})[B]) || P0.lenses[B].length === 6, 'الوحدةُ بعدساتها الستّ قبل الاستيراد');
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw), p = s.page;   /* مديرُ المنصة على الوحدة (التضييقُ قاعدةٌ واحدة له ولمدير الإدارة — ك1) */
    await p.evaluate((d) => KIVO.BassamDepts.setActive(d), B); await p.waitForTimeout(1500);
    await s.go('#/admin/backup', 3500);
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.locator('main button', { hasText: 'تصدير نسخة هذ' }).first().click()]);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'd53-lens-')), file = path.join(dir, 'TEST_ONLY-copy.json'); await dl.saveAs(file);
    const bk = JSON.parse(fs.readFileSync(file, 'utf8')); bk.perms.lenses = PROD_LENSES.slice(); fs.writeFileSync(file, JSON.stringify(bk));
    const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 15000 }), p.locator('main label', { hasText: 'استيراد نسخة إدارة' }).first().click()]);
    await fc.setFiles(file);
    await p.waitForSelector('[data-bkc="summary"]', { timeout: 20000 });
    const line = (await p.locator('[data-bkc="sum-line"]').first().innerText()).replace(/[\u200e\u200f\u061c\u202a-\u202e\u2066-\u2069]/g, '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    assert.match(line, /العدسات 3 من 6/, 'الملخّصُ يذكر التضييق: ' + line);
    await click(p, 'استبدال كامل'); await click(p, 'ارفع وتحقّق');
    await Promise.race([p.getByText('تأكيد الاستبدال').first().waitFor({ state: 'visible', timeout: 120000 }), p.waitForSelector('[data-bkc="fail"]', { timeout: 120000 })]);
    if (await p.locator('[data-bkc="fail"]').count()) assert.fail('فشل الاستيراد: ' + (await p.locator('[data-bkc="fail-msg"]').first().innerText()));
    await click(p, 'نعم، استبدل');
    await p.waitForSelector('[data-bkc="done"]', { timeout: 120000 });
    await lab.idle();
    assert.deepEqual([...kv(lab, 'bassam_perms_v1').lenses[B]].sort(), PROD_LENSES.slice().sort(), 'الخادمُ ضيّق إلى ما ذكره الملخّص');
    assert.deepEqual(s.errs, [], 'لا أخطاء صفحة');
    await s.ctx.close();
  } finally { await b.close(); await lab.close(); }
});
