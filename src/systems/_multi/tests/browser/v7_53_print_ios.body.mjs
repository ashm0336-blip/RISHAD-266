/* V7 · 53 (ملحق 6 · البند 9 — سلوكُ البرودكشن 9ff484d · c26d55f · ba52a5d · d071fc9؛ والبند 10 — 6171818) — المختبرُ المعزول (TEST_ONLY):
   زرُّ الطابعة الحقيقي على خريطتَي الخطة والجولات، ونواةُ الطباعة المشتركة (src/systems/_shared/print/566-print-core.js).
   WebKit غيرُ مثبَّت هنا: الآيباد والآيفون بواصفات أجهزة Playwright في Chromium، وسلوكُ سفاري الذي أسقط التنزيلَ يُحاكى حرفياً بقواعده الثلاث:
     (1) نداءٌ يُسجَّل على نافذة إطار الطباعة المحمي (sandbox بلا allow-scripts) لا يُنفَّذ، وfonts.ready فيه لا ينتهي
     (2) لوحةٌ رُسمت عليها صورةُ SVG فيها foreignObject تُمنع قراءتُها: toDataURL ⇒ SecurityError (صورُ SVG بلا foreignObject تُقرأ كما في سفاري)
     (3) navigator.vendor = «Apple Computer, Inc.» (محرّكُ سفاري) — والمكتبةُ البديلة تُرسم من إطارٍ غيرِ محمي
   ويُتحقّق من: ستارٍ صادق «جاري تحميل الملف…» بالصفحة ن من م · شاشة «الملف جاهز» وزرّ «حفظ أو مشاركة الملف» يسلّم navigator.share ملفَّ PDF صالحاً ·
   الغلافِ صفحةً أولى (الخلفيةُ من أصل الحزمة · العنوان · سطرُ السنة بالأرقام العربية · الإدارة) · ولا نافذةَ طباعة ولا إطارَ باقٍ.
   والحاسوب: رفضُ قراءة اللوحة في متصفحٍ غير سفاري ينقل إلى الرسّام البديل وينزل الملفُّ (كان يسقط إلى نافذة الطباعة) · وغيابُ خلفية الغلاف لا يُسقط الملف. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { startLab, LAB } from '../../../../../tests/browser/local_server.mjs';
import { openAs, launchUtf8 } from '../../../../../tests/browser/d7_cov_lib.mjs';
import { replaceOperationalFixture } from '../../../../../tests/unit/operational_legacy_seed_fx.mjs';
const { devices } = createRequire(process.env.KIVO_PLAYWRIGHT || (execSync('npm root -g').toString().trim() + '/'))('playwright');
const device = (n) => { const d = Object.assign({}, devices[n]); delete d.defaultBrowserType; return d; };

const A = 'TEST_ONLY_A', KPLAN = 'bsdept:' + A + ':bassam_plan_v1', KROUNDS = 'bsdept:' + A + ':bassam_rounds_v1';
const zone = (n) => ({ uid: 'TEST_ONLY_z' + n, name: 'TEST_ONLY', code: '0' + n, ser: '0' + n, cat: 'men', d: n === 1 ? 'M100 100 L400 100 L400 250 L100 250 Z' : 'M100 100 L900 100 L900 500 L100 500 Z', cx: 250, cy: 175, emp: [] });
const sites = () => [
  { sid: 's_TEST_ONLY_1', name: 'TEST_ONLY موقع 1', num: 1, zones: [zone(1)], gates: [], marks: [], paths: [], sectors: [] },
  { sid: 's_TEST_ONLY_2', name: 'TEST_ONLY موقع 2', num: 2, zones: [zone(2)], gates: [], marks: [], paths: [], sectors: [] }];
const AR = (n) => String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

/* سفاري كما رآه المستخدم: القواعدُ الثلاث (أعلاه) — تُركَّب قبل كل تحميل */
const SAFARI = ({ vendor, rules }) => {
  if (vendor) Object.defineProperty(Navigator.prototype, 'vendor', { get: () => 'Apple Computer, Inc.', configurable: true });
  window.__h2c = []; window.__fill = []; window.__veil = []; window.__shared = []; window.__dialogs = 0; window.print = () => { window.__dialogs++; };
  if (rules) {
    const di = CanvasRenderingContext2D.prototype.drawImage, td = HTMLCanvasElement.prototype.toDataURL;
    CanvasRenderingContext2D.prototype.drawImage = function (img, ...a) { try { const u = (img && img.src) || ''; if (/^data:image\/svg\+xml/.test(u) && /foreignObject/.test(decodeURIComponent(u.slice(0, 4000)))) this.canvas.__tainted = 1; } catch (e) { /* */ } return di.call(this, img, ...a); };
    HTMLCanvasElement.prototype.toDataURL = function (...a) { if (this.__tainted) throw new DOMException('The operation is insecure.', 'SecurityError'); return td.apply(this, a); };
    const ap = Node.prototype.appendChild;
    Node.prototype.appendChild = function (n) {
      const r = ap.call(this, n);
      try {
        if (n && n.tagName === 'IFRAME' && /allow-same-origin/.test(n.getAttribute('sandbox') || '') && !/allow-scripts/.test(n.getAttribute('sandbox') || '')) {
          const w = n.contentWindow; w.Window.prototype.requestAnimationFrame = () => 0;
          Object.defineProperty(w.Document.prototype, 'fonts', { get: () => ({ ready: new Promise(() => {}), status: 'loading' }), configurable: true });
        }
      } catch (e) { /* */ }
      return r;
    };
  }
  const ft = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (t, ...a) { if (this.canvas.width === 2480 && this.canvas.height === 1754) window.__fill.push(String(t)); return ft.call(this, t, ...a); };
  Object.defineProperty(window, 'html2canvas', { configurable: true, set(H) { Object.defineProperty(window, 'html2canvas', { configurable: true, writable: true, value: (el, o) => {
    const fe = el.ownerDocument.defaultView.frameElement;
    window.__h2c.push({ frame: fe ? fe.id : '', sandbox: fe ? fe.getAttribute('sandbox') : null, scale: o.scale, fo: o.foreignObjectRendering, pg: el.classList.contains('pg') });
    return H(el, o);
  } }); }, get() { return undefined; } });
  navigator.canShare = (d) => !!(d && d.files && d.files.length);
  navigator.share = async (d) => { const f = d.files[0], b = new Uint8Array(await f.arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); window.__shared.push({ name: f.name, type: f.type, title: d.title, b64: btoa(s) }); };
  const watch = () => new MutationObserver(() => { const v = document.getElementById('bs-print-veil'); if (v) { const t = v.innerText.replace(/\s+/g, ' ').trim(); if (window.__veil[window.__veil.length - 1] !== t) window.__veil.push(t); } }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  if (document.documentElement) watch(); else document.addEventListener('DOMContentLoaded', watch);
};

function pdfOf(buf) {
  const txt = buf.toString('latin1'), imgs = [...txt.matchAll(/\/Width (\d+) \/Height (\d+) [^\n]*\/Filter \/DCTDecode \/Length (\d+) >>\nstream\n/g)].map((m) => ({ w: +m[1], h: +m[2], at: m.index + m[0].length }));
  return { txt, pages: (txt.match(/\/Type \/Page /g) || []).length, cms: [...txt.matchAll(/q [^\n]* cm \/Im0 Do Q/g)].map((m) => m[0]), imgs };
}
async function seeded() {
  const lab = await startLab(), { env } = lab;
  const parts = new Intl.DateTimeFormat('en-u-ca-gregory-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
  const num = (t) => +parts.find((x) => x.type === t).value, T = { y: num('year'), m: num('month'), d: num('day') }, F = sites();
  await replaceOperationalFixture(env, KPLAN, { pMig: 3, zones: F[0].zones, gates: [], marks: [], paths: [], floors: F, months: { [T.y + '-' + String(T.m).padStart(2, '0')]: { c: 1, d: F } }, cfg: {}, delMonths: {} });
  await replaceOperationalFixture(env, KROUNDS, { [T.y + '-' + String(T.m).padStart(2, '0') + '-' + String(T.d).padStart(2, '0')]: { ap: false, t: 12345, d: sites() } });
  return { lab, T };
}
const COVER_FULL = 'q 1190.55 0 0 841.89 0.00 0.00 cm /Im0 Do Q';

for (const [dev, hash, svg, nPages] of [['iPad Pro 11', '#/plan', 'svg[data-map-zoom]', 2], ['iPhone 13', '#/daily/rounds', 'svg[data-ds-zoom]', 3]]) {
  test('53 · البند 9 و10 · ' + dev + ' (قواعدُ سفاري الثلاث): الطابعةُ ⇒ «جاري تحميل الملف…» ن من م ⇒ «الملف جاهز» ⇒ المشاركة بملف PDF أوّلُه الغلاف', { timeout: 600000 }, async () => {
    const { lab, T } = await seeded(), b = await launchUtf8();
    try {
      const reqs = [];
      const s = await openAs(b, lab, LAB.mgrA, LAB.pw, { context: Object.assign(device(dev), { acceptDownloads: true }), onPage: async (p) => {
        await p.addInitScript(SAFARI, { vendor: true, rules: true });
        p.on('response', (r) => { const u = new URL(r.url()).pathname; if (/^\/assets\/(js\/html2canvas|img\/report-cover)/.test(u)) reqs.push([u, r.status(), r.headers()['content-type'] || '']); });
      } }), p = s.page; p.setDefaultTimeout(20000);
      assert.equal(await p.evaluate(() => navigator.vendor), 'Apple Computer, Inc.');
      let downloads = 0; p.on('download', () => downloads++);
      await s.go(hash, 5000); await p.locator(svg).first().waitFor({ state: 'attached' });
      const dept = await p.evaluate(() => KIVO.BassamDepts.activeName());
      const btn = p.locator('button[title^="طباعة الخريطة"]'); assert.ok(await btn.count() >= 1, dev + ': زرُّ الطابعة');
      await btn.first().evaluate((e) => e.click());
      const cons = []; p.on('console', (m) => cons.push(m.type() + ': ' + m.text().slice(0, 300)));
      try { await p.locator('#bs-pdf-ready').waitFor({ state: 'visible', timeout: 300000 }); }
      catch (e) { throw new Error(dev + ': no ready screen — ' + JSON.stringify(await p.evaluate(() => ({ veil: window.__veil, h2c: window.__h2c, frames: [].map.call(document.querySelectorAll('iframe'), (f) => f.id + '|' + f.getAttribute('sandbox')), h: typeof window.html2canvas }))) + ' console: ' + JSON.stringify(cons.slice(-15))); }
      const veil = (await p.evaluate(() => window.__veil)).map((t) => t.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660)));   /* الأرقامُ تُعرض هندية */
      assert.ok(veil.some((t) => /جاري تحميل الملف…/.test(t)), dev + ': نصُّ الستار ' + JSON.stringify(veil));
      for (let k = 1; k <= nPages; k++) assert.ok(veil.some((t) => t.includes('الصفحة ' + k + ' من ' + nPages)), dev + ': الصفحة ' + k + ' من ' + nPages + ' — ' + JSON.stringify(veil));
      assert.ok(!veil.some((t) => /للطباعة/.test(t)), dev + ': لا «للطباعة»');
      /* (2)+(3): كلُّ صفحةٍ بالرسّام البديل، من إطارٍ مؤقّتٍ غيرِ محمي، بلا foreignObject */
      const h2c = await p.evaluate(() => window.__h2c);
      /* كلُّ صفحةٍ بالرسّام البديل بدقّة ×2؛ وإن تعذّرت صفحةٌ (مهلةُ 60 ث تحت الحِمل) نزلت إلى ×1.5 وثبتت عليها — بالتصميم — فقد تزيد النداءات على الصفحات */
      assert.ok(h2c.length >= nPages, dev + ': الرسّامُ البديل لكل صفحة ' + JSON.stringify(h2c));
      for (const c of h2c) assert.deepEqual([c.frame, c.sandbox, c.fo, c.pg], ['bs-print-raster', null, false, true], dev + ': ' + JSON.stringify(c));
      assert.equal(h2c[0].scale, 2, dev + ': ×2 في سفاري'); assert.ok(h2c.every((c, i) => [2, 1.5].includes(c.scale) && (!i || c.scale <= h2c[i - 1].scale)), dev + ': الدقّةُ تنزل ولا تصعد ' + JSON.stringify(h2c));
      assert.ok(reqs.some(([u, st, ct]) => /^\/assets\/js\/html2canvas-1\.4\.1\.min\.[0-9a-f]{10}\.js$/.test(u) && st === 200 && /javascript/.test(ct)), dev + ': المكتبةُ من الحزمة ' + JSON.stringify(reqs));
      /* شاشةُ «الملف جاهز» */
      const ready = p.locator('#bs-pdf-ready');
      assert.match(await ready.innerText(), /الملف جاهز/); assert.equal(downloads, 0, dev + ': لا تنزيلَ مباشر على أجهزة أبل اللمسية');
      assert.equal(await p.evaluate(() => document.getElementById('bs-print-veil')), null, dev + ': الستارُ رُفع');
      await ready.getByRole('button', { name: 'حفظ أو مشاركة الملف' }).click();
      await p.waitForFunction(() => window.__shared.length === 1, null, { timeout: 20000 });
      await p.locator('#bs-pdf-ready').waitFor({ state: 'detached' });
      const sh = (await p.evaluate(() => window.__shared))[0], buf = Buffer.from(sh.b64, 'base64'), f = pdfOf(buf);
      assert.match(sh.name, /^التقرير التنفيذي لتحديث الخطة التشغيلية.*\.pdf$/); assert.equal(sh.type, 'application/pdf');
      assert.ok(f.txt.startsWith('%PDF-1.4\n') && f.txt.trimEnd().endsWith('%%EOF'), dev + ': ملفُّ PDF');
      /* البند 10: الغلافُ أولُ صفحة — كاملةٌ بلا هوامش، ثم صفحاتُ التقرير */
      assert.equal(f.pages, nPages + 1, dev + ': الغلاف + ' + nPages); assert.equal(f.cms[0], COVER_FULL, dev + ': الغلافُ يملأ الصفحة');
      assert.deepEqual([f.imgs[0].w, f.imgs[0].h], [2480, 1754]); assert.ok(f.cms.slice(1).every((c) => c !== COVER_FULL));
      assert.ok(reqs.some(([u, st, ct]) => /^\/assets\/img\/report-cover\.[0-9a-f]{10}\.jpg$/.test(u) && st === 200 && /image\/jpeg/.test(ct)), dev + ': خلفيةُ الغلاف من أصل الحزمة ' + JSON.stringify(reqs));
      const fill = await p.evaluate(() => window.__fill);
      assert.ok(fill.includes('التقرير التنفيذي'), dev + ': العنوان ' + JSON.stringify(fill));
      assert.ok(fill.includes('لتحديث الخطة التشغيلية لعام ' + AR(T.y) + 'هـ'), dev + ': سطرُ السنة ' + JSON.stringify(fill));
      assert.ok(fill.includes(dept), dev + ': اسمُ الإدارة «' + dept + '» ' + JSON.stringify(fill));
      assert.equal(await p.evaluate(() => window.__dialogs), 0, dev + ': لا نافذةَ طباعة');
      assert.equal(await p.evaluate(() => !!document.getElementById('bs-print-frame') || !!document.getElementById('bs-print-raster')), false, dev + ': لا إطارَ باقٍ');
      assert.deepEqual(s.errs, [], 'no page errors'); await s.ctx.close();
    } finally { await b.close(); await lab.close(); }
  });
}

test('53 · البند 9 و10 · الحاسوب: رفضُ قراءة اللوحة (SecurityError) ⇒ الرسّامُ البديل وينزل الملف (لا نافذة طباعة) · وغيابُ خلفية الغلاف ⇒ الملفُّ بلا غلاف', { timeout: 600000 }, async () => {
  const { lab } = await seeded(), b = await launchUtf8();
  try {
    for (const [label, rules, coverGone] of [['رفضُ القراءة', true, false], ['خلفيةُ الغلاف غائبة', false, true]]) {
      const s = await openAs(b, lab, LAB.mgrA, LAB.pw, { context: { acceptDownloads: true }, onPage: async (p) => {
        await p.addInitScript(SAFARI, { vendor: false, rules });
        if (coverGone) await p.route(/\/assets\/img\/report-cover\.[0-9a-f]{10}\.jpg$/, (r) => r.fulfill({ status: 404, body: '' }));
      } }), p = s.page; p.setDefaultTimeout(20000);
      await s.go('#/plan', 5000); await p.locator('svg[data-map-zoom]').waitFor({ state: 'visible' });
      const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 300000 }), p.locator('button[title^="طباعة الخريطة"]:visible').click()]);
      const chunks = []; for await (const c of await dl.createReadStream()) chunks.push(c);
      const f = pdfOf(Buffer.concat(chunks));
      assert.ok(f.txt.startsWith('%PDF-1.4\n'), label + ': ملفُّ PDF');
      const h2c = await p.evaluate(() => window.__h2c);
      if (rules) {
        assert.equal(h2c.length, 2, label + ': بعد أول رفضٍ تُرسم الصفحتان بالرسّام البديل ' + JSON.stringify(h2c));
        assert.ok(h2c.every((c) => c.frame === 'bs-print-raster' && c.sandbox === null && c.fo === false), label + ': ' + JSON.stringify(h2c));
        assert.equal(f.pages, 3, label + ': الغلاف + صفحتان'); assert.equal(f.cms[0], COVER_FULL);
      } else {
        assert.equal(h2c.length, 0, label + ': Chrome بلا رفضٍ يبقى على صورة الصفحة (لا مكتبة)');
        assert.equal(f.pages, 2, label + ': بلا غلاف — والملفُّ لم يتعطّل'); assert.ok(!f.cms.includes(COVER_FULL));
      }
      assert.equal(await p.evaluate(() => window.__dialogs), 0, label + ': لا نافذةَ طباعة');
      await p.waitForFunction(() => !document.getElementById('bs-print-veil'), null, { timeout: 10000 });
      assert.deepEqual(s.errs, [], label + ': no page errors'); await s.ctx.close();
    }
  } finally { await b.close(); await lab.close(); }
});
