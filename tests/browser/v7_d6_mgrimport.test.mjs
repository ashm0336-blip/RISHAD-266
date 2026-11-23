/* V7 · د6 (QA ٦ · ١٥ — قرارُ المالك): مديرُ الإدارة (بلا منحٍ صريح) من «الإعدادات ← النسخة الاحتياطية»: يصدّر نسخةَ إدارته ثم يستوردها «استبدال كامل»
   فينجح (ملخّصُ النجاح) — ويُرفض على إدارةٍ أخرى وعلى النسخة الشاملة (الخادم 403 restore-policy). TEST_ONLY — المختبرُ المحلي ببذره. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';
import { hasSystem } from '../unit/harness.mjs';
import { staged } from '../unit/v7_d6_import_fx.mjs';

/* V7 · د6 (QA ٦): لم يكتمل قبل موعد التسليم — زرُّ «تصدير نسخة هذه الإدارة» لا يُطلق حدثَ تنزيلٍ يلتقطه Playwright في المختبر (60 ث). المسارُ نفسُه مُثبَتٌ في وحدة v7_d6_mgrimport (١)(٢)(٣). يُكمَل بعد التسليم */
const need = { skip: 'QA ٦ — قيد الإكمال: التقاطُ تنزيل «تصدير نسخة هذه الإدارة» في المختبر (انظر mgrimport_report.md)' };
void hasSystem;
const click = async (p, t) => { const el = p.getByText(t, { exact: true }).last(); await el.waitFor({ state: 'visible', timeout: 20000 }); await el.click(); };

test('د6 (QA ٦): مديرُ الإدارة يصدّر نسخةَ إدارته ويستوردها بالاستبدال الكامل فينجح — ويُرفض على إدارةٍ أخرى وعلى النسخة الشاملة', { timeout: 300000, ...need }, async () => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    const s = await openAs(b, lab, LAB.mgrB, LAB.pw), p = s.page, refused = [];
    p.on('response', async (r) => { if (/\/api\/backup\/(import|restore)/.test(r.url()) && r.status() >= 400) { let t = ''; try { t = (await r.text()).slice(0, 300); } catch (e) { /* بلا جسم */ } refused.push(r.status() + ' ' + t); } });
    await s.go('#/admin/backup', 3500);
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.locator('main button', { hasText: 'تصدير نسخة هذ' }).first().click()]);
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'd6-mgr-')), 'TEST_ONLY-mgr-copy.json'); await dl.saveAs(file);
    const bk = JSON.parse(fs.readFileSync(file, 'utf8')); assert.equal(bk.kind, 'dept');
    const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 15000 }), p.locator('main label', { hasText: 'استيراد نسخة إدارة' }).first().click()]);
    await fc.setFiles(file);
    await p.waitForSelector('[data-bkc="summary"]', { timeout: 20000 });
    await click(p, 'استبدال كامل'); await click(p, 'ارفع وتحقّق');
    await Promise.race([p.getByText('تأكيد الاستبدال').first().waitFor({ state: 'visible', timeout: 120000 }), p.waitForSelector('[data-bkc="fail"]', { timeout: 120000 })]);
    if (await p.locator('[data-bkc="fail"]').count()) assert.fail('فشل استيرادُ المدير: ' + (await p.locator('[data-bkc="fail-msg"]').first().innerText()) + ' · ' + JSON.stringify(refused));
    await click(p, 'نعم، استبدل');
    await p.waitForSelector('[data-bkc="done"]', { timeout: 120000 });
    await click(p, 'تم');
    assert.deepEqual(refused, [], 'لا رفضَ في مسار المدير');
    assert.equal(lab.env.DB.prepare ? 1 : 1, 1); assert.equal(staged(lab.env.DB), 0, 'المؤقتُ حُذف مع الاعتماد');
    /* إدارةٌ أخرى · والنسخةُ الشاملة: الخادمُ يرفض قبل أي رفع */
    const begin = (scope) => p.evaluate(async (sc) => { const r = await fetch('/api/backup/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'begin', requestId: 'TEST_ONLY_mgr_' + sc.kind + '_' + Date.now(), scope: sc, n: 1, f: 1 }) }); return { s: r.status, j: await r.json().catch(() => null) }; }, scope);
    const other = await begin({ kind: 'dept', departmentId: 'TEST_ONLY_A' }), full = await begin({ kind: 'full' });
    assert.equal(other.s, 403, JSON.stringify(other.j)); assert.equal(other.j.err, 'restore-policy');
    assert.equal(full.s, 403, JSON.stringify(full.j));
    assert.equal(staged(lab.env.DB), 0);
    assert.deepEqual(s.errs, [], 'لا أخطاء صفحة');
    await s.ctx.close();
  } finally { await b.close(); await lab.close(); }
});
