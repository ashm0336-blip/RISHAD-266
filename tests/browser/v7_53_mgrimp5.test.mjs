/* V7 · 53 (mgrimp5 · ملحق 5) — في المتصفح، مديرُ الإدارة TEST_ONLY_B (مختبرٌ معزول · كلُّ الأنظمة مفعّلة · TEST_ONLY):
   (١) نسخةُ إدارته بشكل Production (v7_53_mgrimp5_fx · مجهولةُ الهوية) وأوراقُ موظفيها تحمل ما لا يملكه: ملخّصُ النسخة يسرد تحت «لن يُنقل» اسمَ الموظف
       (من سجلّ الموظفين) والصفحةَ والإجراء، ثم سطراً واحداً «يمنحها مدير المنصة لاحقاً إن لزم»؛ والتأكيدُ (ملخّصُ الخادم) كذلك؛ و«استبدال كامل» ينجح
       ولا يُكتب شيءٌ من المُسقَط. لقطةُ الملخّص بدقّةٍ مضاعفة (deviceScaleFactor 2): $MGRIMP5_SHOT (افتراضاً mgrimp5_summary.png في مجلد المؤقت).
   (٢) نسخةٌ صدّرها هو من إدارته وعدساتُها ثلاث (Production) — لا تغيّر إلا شريحةَ صلاحيات الإدارة: كانت تُرفض «restore-policy» (062: «لا إدارة» في الحفظة). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { world, kv, put, LAB, chromium, openAs } from './d7_cov_lib.mjs';
import { PROD_LENSES } from '../unit/v7_d6_import_fx.mjs';
import { prodFile, expectFor, empIds, MGR_MINUS, NOT_HELD } from '../unit/v7_53_mgrimp5_fx.mjs';

const B = 'TEST_ONLY_B', SHOT = process.env.MGRIMP5_SHOT || path.join(os.tmpdir(), 'mgrimp5_summary.png');
const click = async (p, t) => { const el = p.getByText(t, { exact: true }).last(); await el.waitFor({ state: 'visible', timeout: 20000 }); await el.click(); };
const norm = (x) => String(x || '').replace(/[‎‏؜‪-‮⁦-⁩]/g, '').replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660)).replace(/\s+/g, ' ').trim();
async function upload(p, file) {
  const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 15000 }), p.locator('main label', { hasText: 'استيراد نسخة إدارة' }).first().click()]);
  await fc.setFiles(file);
  await p.waitForSelector('[data-bkc="summary"]', { timeout: 30000 });
}
async function replace(p) {
  await click(p, 'استبدال كامل'); await click(p, 'ارفع وتحقّق');
  await Promise.race([p.getByText('تأكيد الاستبدال').first().waitFor({ state: 'visible', timeout: 180000 }), p.waitForSelector('[data-bkc="fail"]', { timeout: 180000 })]);
  if (await p.locator('[data-bkc="fail"]').count()) assert.fail('فشل الاستيراد: ' + (await p.locator('[data-bkc="fail-msg"]').first().innerText()));
}

test('53 (mgrimp5 ١): مديرُ الإدارة — «لن يُنقل» بأسماء الموظفين والصفحات والإجراءات · «يمنحها مدير المنصة لاحقاً إن لزم» · الاستبدالُ ينجح بلا المُسقَط', { timeout: 420000 }, async () => {
  const lab = await world(), b = await chromium.launch();
  try {
    /* مديرُ الإدارة كما في Production: يرث سقفَ إدارته (بلا rasd) وقد ضيّق عليه مديرُ المنصة بالمنح الصريح */
    await put(lab, 'bsdept:' + B + ':bassam_grants_v1', { v: 1, emp: { ['mgr:' + B]: { plus: [], minus: MGR_MINUS } } });
    const F = await prodFile({ small: true }), want = expectFor(F), names = JSON.parse(F.data.bassam_employees_v1);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mgrimp5-')), file = path.join(dir, 'TEST_ONLY-prod-copy.json'); fs.writeFileSync(file, JSON.stringify(F));
    const s = await openAs(b, lab, LAB.mgrB, LAB.pw, { viewport: { width: 1366, height: 2600 }, context: { deviceScaleFactor: 2 } }), p = s.page;   /* ارتفاعٌ يتّسع للقائمة كلِّها في اللقطة */
    await s.go('#/admin/backup', 3500);
    await upload(p, file);
    await p.waitForSelector('[data-bkc="skip-note"]', { timeout: 30000 });
    const head = norm(await p.locator('[data-bkc="skip-head"]').innerText()), items = (await p.locator('[data-bkc="skip"] li').allInnerTexts()).map(norm), note = norm(await p.locator('[data-bkc="skip-note"]').innerText());
    assert.match(head, /^لن يُنقل \(/, head);
    assert.equal(note, 'يمنحها مدير المنصة لاحقاً إن لزم.', 'سطرٌ واحد بعد المُسقَط');
    for (const ek of empIds(F)) {
      const nm = norm(names.find((x) => x.eid === ek).name), mine = items.filter((t) => t.startsWith(nm + ' —'));
      assert.ok(mine.length, 'الموظفُ باسمه من سجلّ الموظفين: ' + nm + ' ⇐ ' + items.slice(0, 3).join(' | '));
      /* V7 · 53 (basefix): الورقةُ المحذوفة admin/ptpls تُسمّى «صفحة أُلغيت» تحت قسمها — لا اسمَ لها في الواجهة بعد حذفها (د5-ح · v7_d5h_deleted_residue ①) */
      assert.ok(mine.some((t) => /الصفحة «الإعدادات [·-] صفحة أُلغيت» — عرض/.test(t)) && mine.some((t) => /الصفحة «[^»]*سجل[^»]*» — عرض/.test(t)), nm + ': الصفحةُ والإجراء بالعربي: ' + mine.join(' | '));
      assert.ok(!mine.some((t) => /admin\/|:view|grant|cap\b/.test(t)), 'لا رموز: ' + mine.join(' | '));
    }
    const box = p.locator('[data-bkc="summary"]');
    await box.scrollIntoViewIfNeeded();
    await p.locator('[data-bkc="skip"]').evaluate((el) => { el.style.maxHeight = 'none'; });   /* اللقطةُ وحدها: القائمةُ كاملةً بلا تمرير */
    await box.screenshot({ path: SHOT });
    await p.locator('[data-bkc="skip"]').evaluate((el) => { el.style.maxHeight = ''; });
    /* التأكيد: ملخّصُ الخادم نفسُه — المُسقَطُ بأسمائه وسطرُ مدير المنصة */
    await replace(p);
    const msg = norm(await p.locator('#bsCfmMsg').innerText());
    console.error('CONFIRM ' + msg);
    assert.match(msg, /لن يُنقل من صلاحيات الموظفين \(\d+\): «موظف تجريبي/, msg.slice(0, 300));
    assert.ok(msg.includes('يمنحها مدير المنصة لاحقاً إن لزم.'), msg.slice(-300));
    assert.ok(!/\((grant|cap)\)|bassam_perms_v1 ·/.test(msg), 'لا رموز في التأكيد');
    await click(p, 'نعم، استبدل');
    await p.waitForSelector('[data-bkc="done"]', { timeout: 180000 });
    await lab.idle();
    const st = kv(lab, 'bassam_perms_v1').emps[B];
    for (const ek of empIds(F)) {
      assert.deepEqual(st[ek], want.kept[ek], ek + ': المكتوبُ بلا المُسقَط');
      for (const [pg, acts] of Object.entries(st[ek])) for (const a of acts) assert.ok(!NOT_HELD.includes(pg + ':' + a), ek + ': لا يُمنح ما لا يملكه المستورِد — ' + pg + ':' + a);
    }
    assert.deepEqual(s.errs, [], 'لا أخطاء صفحة');
    await s.ctx.close();
  } finally { await b.close(); await lab.close(); }
});

test('53 (mgrimp5 ٢): مديرُ الإدارة يستورد نسخةَ إدارته وعدساتُها ثلاث — التضييقُ وحده يمرّ (كان restore-policy)', { timeout: 300000 }, async () => {
  const lab = await world(), b = await chromium.launch();
  try {
    const s = await openAs(b, lab, LAB.mgrB, LAB.pw), p = s.page;
    await s.go('#/admin/backup', 3500);
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.locator('main button', { hasText: 'تصدير نسخة هذ' }).first().click()]);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mgrimp5-lens-')), file = path.join(dir, 'TEST_ONLY-copy.json'); await dl.saveAs(file);
    const bk = JSON.parse(fs.readFileSync(file, 'utf8')); bk.perms.lenses = PROD_LENSES.slice(); fs.writeFileSync(file, JSON.stringify(bk));
    await upload(p, file);
    await replace(p);
    await click(p, 'نعم، استبدل');
    await p.waitForSelector('[data-bkc="done"]', { timeout: 120000 });
    await lab.idle();
    assert.deepEqual([...kv(lab, 'bassam_perms_v1').lenses[B]].sort(), PROD_LENSES.slice().sort(), 'العدساتُ ضُيّقت إلى ما في النسخة');
    assert.deepEqual(s.errs, [], 'لا أخطاء صفحة');
    await s.ctx.close();
  } finally { await b.close(); await lab.close(); }
});
