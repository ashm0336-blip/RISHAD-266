/* V7 · 53 (ملحق 6 · البند 1 — سلوكُ البرودكشن d131cca؛ قرار المالك 24 نوفمبر) — المختبرُ المعزول (العاملُ الحقيقي · الإنفاذ · TEST_ONLY):
   طباعةُ الخريطة والتقرير (زرُّ الطابعة · PDF الخريطة · المؤشرات) لكل من يرى الصفحة؛ وتصديرُ البيانات (Excel · CSV · PDF السجلات) يبقى على قرار «أ»
   («كامل» و«حسّاس»، ويُختار في «مخصّص» — علَمُ ff.<النظام>.export).
   موظفٌ بدور «مشاهدة» على التشغيل الميداني والمتابعة اليومية: يرى زرَّ الطابعة على خريطتَي الخطة والجولات وينزّل منه ملفَّ PDF، ولا يملك «تصدير»
   (can = false) ولا يظهر له «ملفات» (Excel · طباعة السجل) في سجلّ الخطة — ومديرُ الإدارة (مرجعُ المحدِّد) يظهر له.
   قبل النقل: الزرُّ مشروطٌ بـ«تصدير» (plPmExport · dsPmExport) فلا يظهر لحامل «مشاهدة». */
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, grant, LAB, openAs, launchUtf8, revealAll, fileOk } from '../../../../../tests/browser/d7_cov_lib.mjs';
import { replaceOperationalFixture } from '../../../../../tests/unit/operational_legacy_seed_fx.mjs';

const A = 'TEST_ONLY_A', KPLAN = 'bsdept:' + A + ':bassam_plan_v1', KROUNDS = 'bsdept:' + A + ':bassam_rounds_v1';
const zone = (n) => ({ uid: 'TEST_ONLY_z' + n, name: 'TEST_ONLY', code: '0' + n, ser: '0' + n, cat: 'men', d: 'M100 100 L400 100 L400 250 L100 250 Z', cx: 250, cy: 175, emp: [] });
const sites = () => [{ sid: 's_TEST_ONLY_1', name: 'TEST_ONLY موقع 1', num: 1, zones: [zone(1)], gates: [], marks: [], paths: [], sectors: [] }];

test('53 · البند 1: «مشاهدة» يطبع الخريطة (الخطة والجولات) ولا يصدّر السجلات', { timeout: 600000 }, async () => {
  const lab = await world(), { env } = lab;
  const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
  const num = (t) => +parts.find((x) => x.type === t).value, T = { y: num('year'), m: num('month'), d: num('day') }, F = sites();
  await replaceOperationalFixture(env, KPLAN, { pMig: 3, zones: F[0].zones, gates: [], marks: [], paths: [], floors: F, months: { [T.y + '-' + T.m]: { c: 1, d: F } }, cfg: {}, delMonths: {} });
  await replaceOperationalFixture(env, KROUNDS, { [T.y + '-' + T.m + '-' + T.d]: { ap: false, t: 12345, d: sites() } });
  const b = await launchUtf8();
  try {
    await grant(b, lab, { plan: 'view', daily: 'view' });
    const files = (p) => p.locator('main button:visible', { hasText: /^\s*ملفات\s*$/ });
    /* سجلُّ الخطة أسفل الصفحة مطويٌّ افتراضاً: يُمرَّر إليه ويُفتح من ترويسته («سجل …») */
    const openLog = async (p) => {
      await revealAll(p);
      await p.locator('main div[style*="cursor"]', { hasText: /^\s*سجل/ }).first().click();
      await p.waitForTimeout(800);
    };
    /* مرجعُ المحدِّد: مديرُ الإدارة يرى «ملفات» في سجلّ الخطة */
    const m = await openAs(b, lab, LAB.mgrA, LAB.pw); await m.go('#/plan', 5000); await m.page.locator('svg[data-map-zoom]').waitFor({ state: 'visible' });
    await openLog(m.page); assert.ok(await files(m.page).count() >= 1, 'مديرُ الإدارة: «ملفات» في سجلّ الخطة (المحدِّدُ صالح)'); await m.ctx.close();

    const s = await openAs(b, lab, LAB.empA, LAB.pw, { context: { acceptDownloads: true } }), p = s.page; p.setDefaultTimeout(20000);
    await p.evaluate(() => { window.__dialogs = 0; window.print = () => { window.__dialogs++; }; });
    for (const [name, hash, svg] of [['الخطة', '#/plan', 'svg[data-map-zoom]'], ['الجولات', '#/daily/rounds', 'svg[data-ds-zoom]']]) {
      await s.go(hash, 5000); await p.locator(svg).waitFor({ state: 'visible' });
      const can = await p.evaluate(() => ({ pv: KIVO.BassamPerm.can('plan', 'view'), dv: KIVO.BassamPerm.can('daily', 'view'), pe: KIVO.BassamPerm.can('plan', 'export'), de: KIVO.BassamPerm.can('daily', 'export') }));
      assert.deepEqual(can, { pv: true, dv: true, pe: false, de: false }, name + ': «مشاهدة» يرى الصفحتين ولا يملك «تصدير» (قرار «أ»)');
      const btn = p.locator('button[title^="طباعة الخريطة"]:visible');
      assert.equal(await btn.count(), 1, name + ': زرُّ الطابعة ظاهرٌ لمن يرى الصفحة');
      const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 180000 }), btn.click()]);
      const chunks = []; for await (const c of await dl.createReadStream()) chunks.push(c);
      const f = { name: dl.suggestedFilename(), bytes: Buffer.concat(chunks) };
      assert.deepEqual(fileOk(f, 'pdf'), [], name + ': ملفُّ PDF الخريطة');
      assert.match(f.name, /^التقرير التنفيذي لتحديث الخطة التشغيلية/, name + ': اسمُ الملف ' + f.name);
    }
    assert.equal(await p.evaluate(() => window.__dialogs), 0, 'بلا نافذة طباعة');
    /* تصديرُ السجلات: لا «ملفات» (Excel · طباعة السجل) في سجلّ الخطة لحامل «مشاهدة» */
    await s.go('#/plan', 5000); await openLog(p);
    assert.ok(await p.locator('main input[placeholder^="بحث"]:visible').count() >= 1, '«مشاهدة»: السجلُّ مفتوحٌ أمامه');
    assert.equal(await files(p).count(), 0, '«مشاهدة»: لا «ملفات» لتصدير السجلات');
    assert.deepEqual(s.errs, [], 'no page errors'); await s.ctx.close();
  } finally { await b.close(); await lab.close(); }
});
