/* RISHAD V7 port · the REAL print button on the plan map and on the daily rounds map (isolated lab, TEST_ONLY data).
   Owner's notes on the live proof (2026-11-12), same shape of data: one unit, a plan with TWO sites (site 1: one zone + one two-way
   path · site 2: one zone) and today's round over the same two sites, desktop 1366×900, signed in as the unit manager.
     A. page count — the plan file is one page per site (2). The rounds file is the «لوحة المؤشرات — نظرة عامة» page first, then one
        page per site (3 for two sites): that first page is the daily module's indicators page (the core's `kpi` option, as on develop),
        not a blank, duplicate or overflow page. Both are pinned here, with the page titles and the n/N footers.
     B. the side panel «عناصر الخريطة» is whole in the file: each page is drawn as an image of the print document, and the image must lay
        the page out exactly as the print frame did. The plan panel carries the touch-only register (.bs-oreg), hidden on a desktop by
        `@media (hover:hover) and (pointer:fine)`; an SVG image has no pointer, so the register came back inside the image only and
        pushed the panel's bottom border and rounded corners under the clip. Asserted on the pixels of the downloaded file's own page
        image: the panel's gold bottom border is there, right above the clip edge, on every site page of both files. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { startLab, LAB } from './local_server.mjs';
import { chromium, openAs } from './lab_browser.mjs';
import { replaceOperationalFixture } from '../unit/operational_legacy_seed_fx.mjs';

const A = 'TEST_ONLY_A', KPLAN = 'bsdept:' + A + ':bassam_plan_v1', KROUNDS = 'bsdept:' + A + ':bassam_rounds_v1';
const zone = (n) => ({ uid: 'TEST_ONLY_z' + n, name: 'TEST_ONLY', code: '0' + n, ser: '0' + n, cat: 'men', d: n === 1 ? 'M100 100 L400 100 L400 250 L100 250 Z' : 'M100 100 L900 100 L900 500 L100 500 Z', cx: 250, cy: 175, emp: [] });
const sites = () => [
  { sid: 's_TEST_ONLY_1', name: 'TEST_ONLY موقع 1', num: 1, zones: [zone(1)], gates: [], marks: [], sectors: [],
    paths: [{ uid: 'TEST_ONLY_p1', id: 'TEST_ONLY_path_id', name: 'TEST_ONLY', code: 'P01', pts: [{ x: 140, y: 300 }, { x: 620, y: 300 }, { x: 780, y: 430 }, { x: 900, y: 430 }], type: 'in', dir: 'two', line: 'solid', w: 'bold', active: true, anim: false, hideLabel: true }] },
  { sid: 's_TEST_ONLY_2', name: 'TEST_ONLY موقع 2', num: 2, zones: [zone(2)], gates: [], marks: [], paths: [], sectors: [] }];
const latin = (s) => String(s || '').replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660)).replace(/[‎‏‪-‮⁦-⁩]/g, '').trim();

/* the page images of a file written by the print core: every page is one JPEG stream */
function jpegs(buf) {
  const txt = buf.toString('latin1'), out = [];
  for (const m of txt.matchAll(/\/Width (\d+) \/Height (\d+) [^\n]*\/Filter \/DCTDecode \/Length (\d+) >>\nstream\n/g)) { const at = m.index + m[0].length; out.push({ w: +m[1], h: +m[2], b64: buf.subarray(at, at + +m[3]).toString('base64') }); }
  return out;
}

test('V7 port · real print button: plan = one page per site, rounds = indicators page + one page per site; the side panel is whole in the file', { timeout: 600000 }, async () => {
  const lab = await startLab(), { env } = lab;
  const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
  const num = (t) => +parts.find((x) => x.type === t).value, T = { y: num('year'), m: num('month'), d: num('day') }, F = sites();
  await replaceOperationalFixture(env, KPLAN, { pMig: 3, zones: F[0].zones, gates: [], marks: [], paths: F[0].paths, floors: F, months: { [T.y + '-' + T.m]: { c: 1, d: F } }, cfg: {}, delMonths: {} });
  await replaceOperationalFixture(env, KROUNDS, { [T.y + '-' + T.m + '-' + T.d]: { ap: false, t: 12345, d: sites() } });
  /* a UTF-8 locale for the browser process: with an empty LANG headless Chromium replaces a non-ASCII download name by «download» */
  const b = await chromium.launch({ env: Object.assign({}, process.env, { LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' }) });
  try {
    const s = await openAs(b, lab, LAB.mgrA, LAB.pw, { context: { acceptDownloads: true } }), p = s.page; p.setDefaultTimeout(20000);
    assert.deepEqual(await p.evaluate(() => KIVO.BassamHijri.now()), T, 'the page and the fixture agree on today');
    assert.equal(await p.evaluate(() => matchMedia('(hover:hover) and (pointer:fine)').matches), true, 'a desktop: the touch-only register is hidden on the page');
    for (const [name, hash, svg, titles] of [
      ['plan', '#/plan', 'svg[data-map-zoom]', ['TEST_ONLY موقع 1', 'TEST_ONLY موقع 2']],
      ['rounds', '#/daily/rounds', 'svg[data-ds-zoom]', ['لوحة المؤشرات — نظرة عامة', 'TEST_ONLY موقع 1', 'TEST_ONLY موقع 2']]]) {
      await s.go(hash, 5000); await p.locator(svg).waitFor({ state: 'visible' });
      /* the print document as the core laid it out, read at the moment the core removes its frame (after the file is written) */
      await p.evaluate(() => {
        window.__doc = null; window.__dialogs = 0; window.print = () => { window.__dialogs++; };
        if (window.__hooked) return; window.__hooked = 1;
        const remove = Element.prototype.remove;
        Element.prototype.remove = function () {
          if (this.id === 'bs-print-frame' && !window.__doc) try {
            const x = this.contentDocument, box = (e) => { const q = e.getBoundingClientRect(); return { l: q.left, r: q.right, t: q.top, b: q.bottom }; };
            if (x.querySelector('.pg')) window.__doc = [].map.call(x.querySelectorAll('.pg'), (pg) => { const pn = pg.querySelector('.pn'), root = pn && pn.querySelector('.pnIn > div');
              return { title: pg.querySelector('.site').textContent, foot: pg.querySelector('.fp').textContent, pg: box(pg), pn: pn && box(pn), root: root && box(root),
                cards: root ? [].filter.call(root.querySelectorAll('span,div,b'), (e) => !e.children.length && /^بحسب /.test(e.textContent.trim())).map((e) => box(e).b) : [],
                shown: root ? [].filter.call(root.querySelectorAll('.bs-oreg'), (e) => e.getClientRects().length).length : 0 }; });
          } catch (e) { window.__doc = String(e); }
          return remove.call(this);
        };
      });
      const btn = p.locator('button[title^="طباعة الخريطة"]:visible'); assert.equal(await btn.count(), 1, name + ': the print button is on the map toolbar');
      const dl = p.waitForEvent('download', { timeout: 120000 }); await btn.click();
      const d = await dl, chunks = []; for await (const c of await d.createReadStream()) chunks.push(c);
      const buf = Buffer.concat(chunks), txt = buf.toString('latin1');
      assert.match(d.suggestedFilename(), /^التقرير التنفيذي لتحديث الخطة التشغيلية.*\.pdf$/, name + ': download name ' + d.suggestedFilename());
      assert.ok(txt.startsWith('%PDF-1.4\n') && txt.trimEnd().endsWith('%%EOF'), name + ': a PDF file');
      await p.waitForFunction(() => !!window.__doc, null, { timeout: 30000 });
      const doc = await p.evaluate(() => window.__doc); assert.ok(Array.isArray(doc), name + ': print document read: ' + doc);
      /* A — the pages */
      assert.deepEqual(doc.map((g) => latin(g.title)), titles, name + ': the pages of the print document');
      assert.deepEqual(doc.map((g) => latin(g.foot)), titles.map((_, i) => (i + 1) + '/' + titles.length), name + ': the n/N footers');
      assert.equal((txt.match(/\/Type \/Page /g) || []).length, titles.length, name + ': pages in the file');
      assert.equal((txt.match(/\/MediaBox \[0 0 1190\.55 841\.89\]/g) || []).length, titles.length, name + ': A3 landscape');
      const imgs = jpegs(buf); assert.equal(imgs.length, titles.length, name + ': one image per page');
      assert.equal(await p.evaluate(() => window.__dialogs), 0, name + ': no print dialog');
      /* B — every site page: the panel fits its column in the document, all six cards inside … */
      for (const [i, g] of doc.entries()) {
        if (!g.pn) { assert.equal(titles[i], 'لوحة المؤشرات — نظرة عامة'); continue; }
        const label = name + ' · ' + latin(g.title);
        assert.equal(g.shown, 0, label + ': the touch-only register is not displayed in the print document on a desktop');
        assert.equal(g.cards.length, 6, label + ': six «بحسب …» cards'); assert.ok(Math.max(...g.cards) < g.pn.b - 4, label + ': the last card ends inside the panel column');
        /* a whole pixel of room: the column's clip edge is snapped to the pixel grid when the page is drawn, so a panel fitted to the
           column's ROUNDED height (0.1–0.5 px too tall) lost most of its 1.3 px bottom border in the image */
        assert.ok(g.pn.b - g.root.b >= 0.5 && g.pn.b - g.root.b < 4, label + ': the panel ends inside its column, right above its edge (' + (g.pn.b - g.root.b).toFixed(2) + ' px)');
        /* … and the page image in the file shows the same: the panel's gold frame closes at the bottom. Sampled on the image's own
           pixels, a column through the middle of the panel, the rows right above the clip edge of the column. */
        const k = imgs[i].w / Math.round(g.pg.r - g.pg.l), cx = Math.round(((g.pn.l + g.pn.r) / 2 - g.pg.l) * k), y1 = Math.round((g.pn.b - g.pg.t) * k);
        const px = await p.evaluate(async ([b64, cx, y0, y1]) => {
          const im = new Image(); await new Promise((ok, no) => { im.onload = ok; im.onerror = no; im.src = 'data:image/jpeg;base64,' + b64; });
          const c = document.createElement('canvas'); c.width = 1; c.height = y1 - y0; const q = c.getContext('2d'); q.drawImage(im, cx, y0, 1, y1 - y0, 0, 0, 1, y1 - y0);
          const d = q.getImageData(0, 0, 1, y1 - y0).data, rows = []; for (let y = 0; y < y1 - y0; y++) rows.push([d[y * 4], d[y * 4 + 1], d[y * 4 + 2]]); return rows;
        }, [imgs[i].b64, cx, y1 - Math.round(3 * k), y1]);
        /* the frame colour is a gold (≈ 185,151,81 on the light panel): clearly darker and yellower than the panel background */
        const gold = px.filter(([r, gg, bl]) => r > 150 && r < 225 && r - bl > 55 && gg > bl).length;
        assert.ok(gold >= 3, label + ': the bottom border of the panel is drawn at its full thickness in the file (gold rows above the clip edge: ' + gold + ' of ' + px.length + ' — ' + JSON.stringify(px.slice(-6)) + ')');
      }
    }
    assert.deepEqual(s.errs, [], 'no page errors'); await s.ctx.close();
  } finally { await b.close(); await lab.close(); }
});
