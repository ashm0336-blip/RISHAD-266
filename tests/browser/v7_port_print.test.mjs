/* RISHAD V7 port · printing downloads a PDF directly (isolated lab, TEST_ONLY data).
   SCOPE — read before trusting this test: the lab has NO operational plan and no site map («لا توجد خطة»), so the print control
   (the printer button on the map toolbar of «التشغيل الميداني» / «المتابعة اليومية») is not rendered and is NOT clicked here.
   What IS exercised, in a real Chromium on the built app, signed in as the platform administrator: the real shared print core
   (KIVO.BassamPrintCore.build — src/services/566-print-core.js) with two SYNTHETIC captured sites (a rectangle and one label each),
   through the real pipeline: print document → embedded platform fonts → every page drawn as one image → hand-written PDF → download.
   Asserted: a download event with a .pdf name, a %PDF- header, one A3 page and one JPEG per site, no print dialog, no frame left.
   Not covered here: the button → capture → build wiring of the two modules, real maps, the indicators page, tablets. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';

test('V7 port · print core: two synthetic sites → a two-page PDF is downloaded, no print dialog', { timeout: 600000 }, async () => {
  const lab = await startLab();
  /* a UTF-8 locale for the browser process: with an empty LANG headless Chromium replaces any non-ASCII download name by «download» */
  const b = await chromium.launch({ env: Object.assign({}, process.env, { LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' }) });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'print-'));
  try {
    const s = await openAs(b, lab, LAB.superUn, LAB.superPw, { context: { acceptDownloads: true } }); const p = s.page;
    await s.go('#/plan', 5000);
    assert.equal(await p.locator('button[title^="طباعة الخريطة"]').count(), 0, 'the lab has no plan: if the control is rendered now, click it in this test instead of calling the core');
    assert.equal(await p.evaluate(() => typeof (window.KIVO && KIVO.BassamPrintCore && KIVO.BassamPrintCore.build)), 'function');
    const dl = p.waitForEvent('download', { timeout: 120000 });
    await p.evaluate(() => {
      window.__printCalls = 0; window.print = () => { window.__printCalls++; };
      const site = (n) => ({
        name: 'TEST_ONLY موقع ' + n, panelW: 760,
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500"><rect x="20" y="20" width="760" height="460" fill="#f4efe2" stroke="#b99751" stroke-width="4"/><text x="400" y="260" text-anchor="middle" font-family="Cairo" font-size="40" fill="#141414">TEST_ONLY مصلى ' + n + '</text></svg>',
        panel: '<div style="padding:20px;font-size:22px"><div class="bs-subseg">TEST_ONLY شريط</div><div class="bs-mixtabs">TEST_ONLY شريط</div><div>TEST_ONLY لوحة ' + n + '</div></div>',
      });
      const MONTHS = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
      KIVO.BassamPrintCore.build({ state: {}, MONTHS }, [site(1), site(2)], { date: 'today', kpi: !1, ver: 'v-test', logo: '' });
    });
    const d = await dl, f = path.join(dir, 'out.pdf');
    await d.saveAs(f);
    assert.match(d.suggestedFilename(), /^التقرير التنفيذي لتحديث الخطة التشغيلية.*\.pdf$/, 'download name: ' + d.suggestedFilename());
    const txt = fs.readFileSync(f).toString('latin1');
    assert.ok(txt.startsWith('%PDF-1.4\n'), 'PDF header'); assert.ok(txt.trimEnd().endsWith('%%EOF'), 'PDF trailer');
    assert.equal((txt.match(/\/Type \/Page /g) || []).length, 2, 'one page per site');
    assert.equal((txt.match(/\/MediaBox \[0 0 1190\.55 841\.89\]/g) || []).length, 2, 'A3 landscape');
    assert.equal((txt.match(/\/Filter \/DCTDecode/g) || []).length, 2, 'every page is one image');
    for (const m of txt.matchAll(/\/Filter \/DCTDecode \/Length (\d+) >>\nstream\n/g)) {
      const at = m.index + m[0].length;
      assert.equal(txt.charCodeAt(at), 0xff); assert.equal(txt.charCodeAt(at + 1), 0xd8, 'a real JPEG in the page');
      assert.ok(+m[1] > 20000, 'the page image is not blank-sized: ' + m[1]);
    }
    const wh = /\/Width (\d+) \/Height (\d+)/.exec(txt);
    assert.ok(+wh[1] >= 2900 && +wh[2] >= 2000, 'page image resolution ' + wh[1] + 'x' + wh[2]);
    await p.waitForTimeout(500);
    assert.equal(await p.evaluate(() => window.__printCalls), 0, 'no print dialog on the page');
    assert.equal(await p.evaluate(() => [].filter.call(document.querySelectorAll('iframe'), (e) => { try { return !!e.contentDocument.querySelector('.pg'); } catch (x) { return !1; } }).length), 0, 'the print frame is removed after the download');
    assert.deepEqual(s.errs, []); await s.ctx.close();
  } finally { await b.close(); await lab.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});
