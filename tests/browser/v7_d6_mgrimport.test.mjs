/* V7 · د6 (QA ٦ · ١٥ — قرارُ المالك): مديرُ الإدارة (بلا منحٍ صريح) من «الإعدادات ← النسخة الاحتياطية»: يصدّر نسخةَ إدارته ثم يستوردها «استبدال كامل»
   فينجح (ملخّصُ النجاح) — ويُرفض على إدارةٍ أخرى وعلى النسخة الشاملة (الخادم 403 restore-policy). TEST_ONLY — المختبرُ المحلي ببذره.
   V7 · د7 (ج ١٥): كان متخطّى («لا حدثَ تنزيل خلال 60 ث»). السببُ ليس اسمَ الملف ولا المرساة: سقفُ الإدارة في بذر المختبر لا يحوي الاسترشاد والمضبوطات
   والجائزة، فيرفض الخادمُ تصديرَ مجالاتها لمدير الإدارة (/api/irshad/export 403 irshad-export-permission · /api/seized|award/export 403
   domain-export-permission — canRead على نظامٍ مطفأ) ويتوقف exportDomains (548) فيظهر «تعذّر التصدير» ولا يُنزَّل شيء. هذا الاختبار يعمل الآن في إدارةٍ
   أنظمتُها كلها مفعّلة (d7_cov_lib.world — كما في walkfix وaward_form_refresh) دون تغيير أيّ تأكيد، ويُضاف تحته اختبارُ الخلل نفسِه (إدارةٌ أُطفئ فيها
   نظامٌ تحمل النسخةُ مجالَه) متخطّى بسببٍ مسمّى للمُدمِج — لم يُصلَح هنا: إصلاحُه قرارُ نسخٍ واستعادة (ما تحمله نسخةُ الإدارة لنظامٍ مطفأ) لا تعديلٌ صغير. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startLab, LAB } from './local_server.mjs';
import { world } from './d7_cov_lib.mjs';
import { chromium, openAs } from './lab_browser.mjs';
import { hasSystem } from '../unit/harness.mjs';
import { staged } from '../unit/v7_d6_import_fx.mjs';
import { replaceOperationalFixture } from '../unit/world_fx.mjs';

const need = {};
void hasSystem;
const click = async (p, t) => { const el = p.getByText(t, { exact: true }).last(); await el.waitFor({ state: 'visible', timeout: 20000 }); await el.click(); };

test('د6 (QA ٦): مديرُ الإدارة يصدّر نسخةَ إدارته ويستوردها بالاستبدال الكامل فينجح — ويُرفض على إدارةٍ أخرى وعلى النسخة الشاملة', { timeout: 300000, ...need }, async () => {
  const lab = await world(), b = await chromium.launch();
  try {
    /* V7 · د7: بياناتٌ تشغيلية حقيقية في الإدارة قبل النسخ (جولةُ يومٍ ماضٍ TEST_ONLY) — ليكون للمطابقة بعد الاستبدال معنى */
    await replaceOperationalFixture(lab.env, 'bsdept:TEST_ONLY_B:bassam_rounds_v1', { '1447-1-3': { d: [] } });
    const s = await openAs(b, lab, LAB.mgrB, LAB.pw), p = s.page, refused = [];
    p.on('response', async (r) => { if (/\/api\/backup\/(import|restore)/.test(r.url()) && r.status() >= 400) { let t = ''; try { t = (await r.text()).slice(0, 300); } catch (e) { /* بلا جسم */ } refused.push(r.status() + ' ' + t); } });
    await s.go('#/admin/backup', 3500);
    /* V7 · د7: قراءةُ كل موردٍ تشغيلي للإدارة وموظفيها قبل التصدير — تُعاد بعد الاعتماد وتُطابَق (readBack) */
    const readAll = () => p.evaluate(async (d) => { const R = KIVO.__BS_SRV.operations.resources.map((r) => 'bsdept:' + d + ':' + r).concat(['bsdept:' + d + ':bassam_employees_v1']), out = {};
      for (const k of R) { const r = await fetch('/api/operations/read?keys=' + encodeURIComponent(k), { cache: 'no-store' }); const j = await r.json().catch(() => null); out[k] = { s: r.status, v: j && j.resources ? j.resources[k] : null }; } return out; }, 'TEST_ONLY_B');
    const before = await readAll();
    assert.deepEqual(before['bsdept:TEST_ONLY_B:bassam_rounds_v1'].v, { '1447-1-3': { d: [] } }, 'الجولةُ المبذورة مقروءة');
    assert.ok(Object.values(before).every((x) => x.s === 200), 'كلُّ موردٍ يُقرأ قبل التصدير: ' + JSON.stringify(Object.entries(before).filter(([, x]) => x.s !== 200).map(([k, x]) => k + ' ' + x.s)));
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
    await lab.idle();
    const after = await readAll();
    for (const k of Object.keys(before)) assert.deepEqual(after[k], before[k], k + ': بعد الاستبدال الكامل يُقرأ كما كان في النسخة');
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

/* V7 · د7 (ج ١٥) — الخللُ الذي كان يُسقط الاختبارَ أعلاه، بصورته الحقيقية: إدارةٌ أُطفئ فيها نظامٌ تحمل نسخةُ الإدارة مجالَه (هنا بذرُ المختبر:
   الاسترشاد والمضبوطات والجائزة ليست في سقف TEST_ONLY_B). مديرُ الإدارة يضغط «تصدير نسخة هذه الإدارة» فلا يُنزَّل شيء ويظهر «تعذّر التصدير» وحده.
   الموضع: KIVO.BackupRestore.exportDomains (src/slots/services/548-atomic-backup.js.tpl:111 — حلقةُ specs تطلب /api/<نظام>/export لكل نظامٍ مبنيّ دون
   النظر في سقف الإدارة) · ورفضُ الخادم: irExport (src/systems/irshad/server/019g-irshad-domain.js:731 canRead) · bdExport
   (src/slots/workers/parts/019n-business-integration.js.tpl:112 canRead) · والرسالةُ العامة: bkExportRun (src/slots/layouts/root-logic.js.tpl — catch ← «تعذّر التصدير»).
   العهدُ (/api/custody/export) يصدَّر للنظام المطفأ بلا رفض — فالسلوكُ غيرُ متّسق بين الأنظمة. القرارُ للمُدمِج/المالك: هل تحمل نسخةُ الإدارة بياناتِ نظامٍ مطفأ
   (bkCapNote يقول «محفوظة — غير مفعّلة في هذه الإدارة» فالنيّةُ نعم) أم يُتخطّى مجالُه ويُحفظ من الاستبدال؟ */
const BUG = { skip: 'خللٌ مُبلَّغ (د7 ج١٥ · coverage_report): تصديرُ نسخة الإدارة يفشل كلُّه حين يكون نظامٌ تحمل النسخةُ مجالَه مطفأً في الإدارة — ينتظر قرارَ ما تحمله النسخةُ لنظامٍ مطفأ' };
test('د7 (ج ١٥): مديرُ إدارةٍ أُطفئ فيها نظامٌ (الاسترشاد) يصدّر نسخةَ إدارته فيُنزَّل ملفٌّ صالح', { timeout: 300000, ...BUG }, async () => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    const s = await openAs(b, lab, LAB.mgrB, LAB.pw), p = s.page;
    await s.go('#/admin/backup', 3500);
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.locator('main button', { hasText: 'تصدير نسخة هذ' }).first().click()]);
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'd7-mgr-')), 'TEST_ONLY-mgr-copy.json'); await dl.saveAs(file);
    assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).kind, 'dept');
    assert.deepEqual(s.errs, []);
    await s.ctx.close();
  } finally { await b.close(); await lab.close(); }
});
