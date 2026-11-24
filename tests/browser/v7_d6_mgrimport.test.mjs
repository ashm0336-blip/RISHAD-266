/* V7 · د6 (QA ٦ · ١٥ — قرارُ المالك): مديرُ الإدارة (بلا منحٍ صريح) من «الإعدادات ← النسخة الاحتياطية»: يصدّر نسخةَ إدارته ثم يستوردها «استبدال كامل»
   فينجح (ملخّصُ النجاح) — ويُرفض على إدارةٍ أخرى وعلى النسخة الشاملة (الخادم 403 restore-policy). TEST_ONLY — المختبرُ المحلي ببذره.
   V7 · د7 (ج ١٥): كان متخطّى («لا حدثَ تنزيل خلال 60 ث»). السببُ ليس اسمَ الملف ولا المرساة: سقفُ الإدارة في بذر المختبر لا يحوي الاسترشاد والمضبوطات
   والجائزة، فيرفض الخادمُ تصديرَ مجالاتها لمدير الإدارة (/api/irshad/export 403 irshad-export-permission · /api/seized|award/export 403
   domain-export-permission — canRead على نظامٍ مطفأ) ويتوقف exportDomains (548) فيظهر «تعذّر التصدير» ولا يُنزَّل شيء. هذا الاختبار يعمل الآن في إدارةٍ
   أنظمتُها كلها مفعّلة (d7_cov_lib.world — كما في walkfix وaward_form_refresh) دون تغيير أيّ تأكيد، ويُضاف تحته اختبارُ الخلل نفسِه (إدارةٌ أُطفئ فيها
   نظامٌ تحمل النسخةُ مجالَه) — V7 · 53: أُصلح بقرار المالك ٦ وأُزيل التخطّي (الاختبارُ الثاني أدناه). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startLab, LAB } from './local_server.mjs';
import { world, kv, put } from './d7_cov_lib.mjs';
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

/* V7 · 53 (writers · قرار المالك ٦): «النسخةُ تحمل بياناتِ النظام المطفأ» — كان هذا الاختبارُ متخطّى (د7 ج١٥ · coverage_report): مديرُ إدارةٍ أُطفئ
   فيها نظامٌ تحمل النسخةُ مجالَه يضغط «تصدير نسخة هذه الإدارة» فلا يُنزَّل شيء ويظهر «تعذّر التصدير» وحده (الخادم: irExport/bdExport canRead يرفض
   النظامَ المطفأ). الآن: النسخةُ كاملةٌ دائماً (019u bkOffMgr)، والملخّصُ يذكر «محفوظة — غير مفعّلة»، والاستعادةُ تعيدها كما هي بلا أثر، والتشغيلُ يعيدها حرفاً.
   الرحلة: بياناتٌ قائمة (بذرُ العرض TEST_ONLY: استرشادٌ ومضبوطاتٌ وجائزة) ← مديرُ المنصة يطفئ الأنظمةَ الثلاثة ← مديرُ الإدارة يصدّر ويستورد «استبدال كامل»
   ← كلُّ خطوةٍ تنجح ← التشغيل ← المجالاتُ الثلاثة كما كانت صفاً بصف، وكلُّ موردٍ تشغيليٍّ يُقرأ. ورسالةُ الفشل تذكر سببها (رفضٌ مُحاكًى لمجالٍ واحد). */
const OFF = ['irshad', 'seized', 'award'], DD = 'tst_demo_d1';
test('53 (قرار المالك ٦): مديرُ إدارةٍ أُطفئ فيها الاسترشاد والمضبوطات والجائزة يصدّر نسخةَ إدارته كاملةً ويستوردها، والتشغيلُ يعيد بياناتها كما هي', { timeout: 400000 }, async () => {
  const lab = await startLab(), b = await chromium.launch();
  try {
    lab.env.KIVO_TEST_FIXTURE = 'allow'; lab.env.KIVO_TEST_HOST = 'lab.local';
    const sa = await openAs(b, lab, LAB.superUn, LAB.superPw), seed = await sa.api('/api/demo-data', { method: 'POST', body: JSON.stringify({ act: 'seed', reveal: true }) });
    assert.equal(seed.status, 200, JSON.stringify(seed.j && seed.j.err));
    const m1 = seed.j.secrets.find((x) => x.id === 'tst_demo_u_m1');
    /* لقطةُ المجالات الثلاثة بعين مدير المنصة (التصديرُ نفسُه) */
    const domains = (s) => s.page.evaluate(async ([d, sys]) => { const out = {}; for (const n of sys) { const r = await fetch('/api/' + n + '/export?uid=' + encodeURIComponent(window.__BS_BOOT.uid) + '&dept=' + d, { cache: 'no-store' }); const j = await r.json(); out[n] = { s: r.status, rows: j && j.domains ? j.domains.map((x) => x.rows) : j }; } return out; }, [DD, OFF]);
    const before = await domains(sa);
    for (const n of OFF) { assert.equal(before[n].s, 200, n + ' ' + JSON.stringify(before[n].rows).slice(0, 200)); assert.ok(JSON.stringify(before[n].rows).length > 200, n + ': بياناتٌ قائمة قبل الإطفاء'); }
    const caps = (on) => { const P = kv(lab, 'bassam_perms_v1'); const c = P.caps[DD]; assert.ok(Array.isArray(c), 'سقفٌ صريح'); P.caps[DD] = on ? c.concat(OFF.filter((x) => c.indexOf(x) === -1)) : c.filter((x) => OFF.indexOf(x) === -1); return put(lab, 'bassam_perms_v1', P); };
    await caps(false);
    const s = await openAs(b, lab, m1.un, m1.pw), p = s.page;
    await s.go('#/admin/backup', 3500);
    const tl = () => p.evaluate(() => (window.__tl || []).join(' ¦ '));
    await p.evaluate(() => { const o = KIVO.bsToast; window.__tl = []; KIVO.bsToast = function (m) { window.__tl.push(String(m)); return o.apply(this, arguments); }; });   /* كلُّ رسالةٍ تمرّ بالتوست الواحد (280) */
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.locator('main button', { hasText: 'تصدير نسخة هذ' }).first().click()]);
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'd53-mgr-')), 'TEST_ONLY-mgr-copy.json'); await dl.saveAs(file);
    const bk = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(bk.kind, 'dept');
    assert.deepEqual(bk.domains.irshad.map((x) => x.rows), before.irshad.rows, 'النسخةُ تحمل الاسترشادَ المطفأ كما هو');
    assert.deepEqual(bk.domains.seized.map((x) => x.rows), before.seized.rows, 'والمضبوطات');
    assert.deepEqual(bk.domains.awards.map((x) => x.rows), before.award.rows, 'والجائزة');
    await p.waitForTimeout(800);
    const t1 = await tl();
    assert.match(t1, /تم تصدير نسخة/, 'ملخّصُ التصدير: ' + t1);
    assert.match(t1, /محفوظة — غير مفعّلة/, 'الملخّصُ يذكر المطفأ «محفوظة — غير مفعّلة»: ' + t1);
    /* الاستعادةُ «استبدال كامل» بيد مدير الإدارة والأنظمةُ مطفأة */
    const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 15000 }), p.locator('main label', { hasText: 'استيراد نسخة إدارة' }).first().click()]);
    await fc.setFiles(file);
    await p.waitForSelector('[data-bkc="summary"]', { timeout: 20000 });
    await click(p, 'استبدال كامل'); await click(p, 'ارفع وتحقّق');
    await Promise.race([p.getByText('تأكيد الاستبدال').first().waitFor({ state: 'visible', timeout: 120000 }), p.waitForSelector('[data-bkc="fail"]', { timeout: 120000 })]);
    if (await p.locator('[data-bkc="fail"]').count()) assert.fail('فشل استيرادُ المدير: ' + (await p.locator('[data-bkc="fail-msg"]').first().innerText()));
    await click(p, 'نعم، استبدل');
    await p.waitForSelector('[data-bkc="done"]', { timeout: 120000 });
    await click(p, 'تم');
    await lab.idle();
    /* رسالةُ الفشل تذكر سببها: رفضٌ مُحاكًى لمجال الاسترشاد وحده */
    await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000); await s.go('#/admin/backup', 3500);   /* بعد الاستعادة: جلسةٌ بالمراجعة الجديدة */
    await p.evaluate(() => { const o = KIVO.bsToast; window.__tl = []; KIVO.bsToast = function (m) { window.__tl.push(String(m)); return o.apply(this, arguments); }; });
    await p.route('**/api/irshad/export**', (r) => r.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ ok: 0, err: 'irshad-export-permission' }) }));
    await p.locator('main button', { hasText: 'تصدير نسخة هذ' }).first().click(); await p.waitForTimeout(2500);
    const t2 = await tl();
    assert.match(t2, /تعذّر التصدير: تعذّر تصدير «نظام الاسترشاد»: [^¦]*irshad-export-permission/, 'الرسالةُ تذكر المجالَ وسببه: ' + t2);
    await p.unroute('**/api/irshad/export**');
    /* التشغيل ← كلُّ شيءٍ كما كان */
    await caps(true);
    const after = await domains(sa);
    for (const n of OFF) assert.deepEqual(after[n], before[n], n + ': بعد الإطفاء والاستيراد والتشغيل كما كان صفاً بصف');
    const ops = await sa.page.evaluate(async (d) => { const R = KIVO.__BS_SRV.operations.resources.map((r) => 'bsdept:' + d + ':' + r).concat(['bsdept:' + d + ':bassam_employees_v1']), out = []; for (const k of R) { const r = await fetch('/api/operations/read?keys=' + encodeURIComponent(k), { cache: 'no-store' }); out.push(k + ' ' + r.status); } return out; }, DD);
    assert.ok(ops.every((x) => / 200$/.test(x)), 'كلُّ موردٍ يُقرأ: ' + ops.join(' · '));
    assert.equal(staged(lab.env.DB), 0);
    assert.deepEqual(s.errs, [], 'لا أخطاء صفحة');
    await s.ctx.close(); await sa.ctx.close();
  } finally { await b.close(); await lab.close(); }
});
