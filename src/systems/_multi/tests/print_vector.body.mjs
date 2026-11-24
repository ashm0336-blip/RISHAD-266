/* ══ طباعةُ الخريطة والمؤشرات — PDF احترافي بالتصميم نفسِه (قرار المالك 2026-11-11) ══
   نواةُ الطباعة المشتركة (src/systems/_shared/print/566-print-core.js — «التشغيل الميداني» و«المتابعة اليومية»):
   V7 · د5-ح: خرجت النواةُ من القاعدة إلى قطعةٍ مشتركة، وانتقل هذا الاختبارُ معها (كان tests/unit/print_vector.test.mjs) — يعمل ما حضر أحدُ مالكيها،
   وما يقرأ منطقَ «المتابعة اليومية» يُتخطّى بغيابها.
   (1) الخريطةُ صورةٌ واحدة عاليةُ الدقّة بخطّ المنصة واتجاهها (الرسمُ المتّجه أثقل الملفَّ على الموقع الحقيقي — يبقى بخيار O.vector).
       كان خطُّ Cairo المتغيّر (font-weight:400 900) لا يطابق شرطَ تضمين الخط (800 حرفاً) فتُرسم النصوصُ بخطّ النظام وبترتيبٍ معكوس.
   (2) خطوطُ الوثيقة تُنتظر قبل الطباعة بمهلة.
   (3) إطارُ الطباعة يُحذف عند afterprint لا بمؤقّتٍ قصير بعد استدعاء print().
   node --test src/systems/_multi/tests/print_vector.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SRC, moduleDir, SYSTEMS, needs } from '../../../../tests/unit/harness.mjs';
const core = fs.readFileSync(path.join(SRC, 'systems', '_shared', 'print', '566-print-core.js'), 'utf8');

test('الخريطةُ صورةٌ واحدة عاليةُ الدقّة (ملفٌّ خفيف) بخطّ المنصة واتجاهها — والمتّجهُ بخيارٍ صريح وحده', () => {
  const guard = core.indexOf('if (O.vector || (!O.dialog && !isWK())) return void e();');   /* V7 · 53 (البند 9): وفي سفاري صورةٌ قبل الرسّام البديل */
  const raster = core.indexOf('toDataURL("image/jpeg", 0.92)');
  assert.ok(guard > 0 && raster > guard, 'التحويلُ إلى صورةٍ هو الافتراضي، وO.vector يتخطّاه');
  assert.doesNotMatch(core, /if \(!O\.raster\)/);
  assert.match(core, /const n = 2\.5,\s*i = Math\.min\(4200, Math\.round\(s\.width \* n\)\),/, 'دقّةٌ ×2.5 بسقف 4200');
  /* خطُّ المنصة داخل الصورة: Cairo المتغيّر (400 900) لم يكن يطابق «800» فكانت النصوصُ بخطّ النظام */
  assert.match(core, /\(\/Almarai\/\.test\(e\.cssText\) \|\| \/Cairo\/\.test\(e\.cssText\) \|\| \/font-weight:\\s\*800\/\.test\(e\.cssText\)\)/);
  /* اتجاهُ الصفحة داخل الصورة المستقلّة: بلا rtl ينعكس ترتيبُ الكلمات */
  assert.match(core, /r\.setAttribute\("direction", "rtl"\),\s*r\.setAttribute\("style", "direction:rtl"\),/);
  /* موقعٌ بعد آخر لا كلُّها معاً */
  assert.match(core, /\[\]\.reduce\.call\(\s*x\.querySelectorAll\("\.pg \.mcv svg"\),/);
  assert.doesNotMatch(core, /Promise\.all\(\s*\[\]\.map\.call\(\s*x\.querySelectorAll\("\.pg \.mcv svg"\)/);
  for (const m of ['plan', 'daily'].filter((k) => SYSTEMS.includes(k))) {   /* V7 · د5-ح: المالكُ الحاضر وحده */
    const lg = fs.readFileSync(path.join(moduleDir(m), 'logic.js'), 'utf8');
    const call = /BassamPrintCore\.build\(this, t, \{([^\n]*)\}\)/.exec(lg); assert.ok(call, m + ': نداءُ النواة');
    assert.doesNotMatch(call[1].split('logo:')[0], /vector\s*:/, m + ': لا يطلب المتّجه');
  }
});

test('خطوطُ الوثيقة تُنتظر قبل الطباعة، وبمهلةٍ لا تعطّلها', () => {
  assert.match(core, /if \(x\.fonts && x\.fonts\.ready\) return Promise\.race\(\[x\.fonts\.ready, new Promise\(\(t\) => setTimeout\(t, 3500\)\)\]\);/);
  assert.ok(core.indexOf('x.fonts.ready') < core.lastIndexOf('m.contentWindow.print()'), 'الانتظارُ قبل الطباعة');
});

test('إطارُ الطباعة يُحذف عند afterprint (ومهلةٌ قصوى) — لا بعد 1.2 ث من الاستدعاء', () => {
  assert.match(core, /m\.contentWindow\.addEventListener\("afterprint", \(\) => setTimeout\(drop, 400\)\);/);
  assert.match(core, /setTimeout\(drop, 12e4\);/);
  const ok = core.slice(core.indexOf('addEventListener("afterprint"'), core.indexOf('addEventListener("afterprint"') + 900);
  assert.doesNotMatch(ok, /m\.remove\(\);\s*\} catch \(t\) \{\}\s*\}, 1200\);/, 'لا حذفَ للإطار بمؤقّت 1.2 ث في مسار النجاح');
});

test('صفحةُ المؤشرات المطبوعة = لوحةُ «مؤشرات الإدارة»: لا أيقونةَ مكبَّرة ولا بطاقةَ منزَّلة إلى أسفل الصفحة', needs('daily'), () => {
  const lg = fs.readFileSync(path.join(SRC, 'systems', 'daily', 'client', 'logic.js'), 'utf8');
  const fit = lg.slice(lg.indexOf('  _kpiPrintFit(t) {'), lg.indexOf('  _kpiPrintFit(t) {') + 9000);
  assert.match(fit, /h = h0 && \/width:\\s\*136px\/\.test\(h0\.getAttribute\("style"\) \|\| ""\) && \/height:\\s\*136px\/\.test\(h0\.getAttribute\("style"\) \|\| ""\) \? h0 : null;/, 'تكبيرُ 136→196 للحلقة وحدها');
  assert.match(fit, /\(d\.style\.justifyContent = "flex-start"\)/);
  assert.doesNotMatch(fit, /d\.style\.justifyContent = "space-between"/);
  /* صفُّ عناوين الجدول (أولُ العمود اليوم) أيقوناتُه 11px وليس حلقةً بقياس 136 */
  assert.match(lg, /'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var\(--fg-xa79878\)"/);
});

test('مؤشراتُ التقرير المطبوع تتبع يومَ الجولة المطبوعة — لا آخرَ اختيارٍ في اللوحة ولا «كل الفترة» (قرار المالك 2026-11-11)', needs('daily'), () => {
  const lg = fs.readFileSync(path.join(SRC, 'systems', 'daily', 'client', 'logic.js'), 'utf8');
  const body = lg.slice(lg.indexOf('  _kpiPrintBody() {'), lg.indexOf('  _kpiPrintFit(t) {'));
  assert.match(body, /const t = this\._kpiPrintSel\(\)\.filter\(\(t\) => t\.y === st\.year && t\.m === st\.month && t\.d === dd\);/);
  assert.match(body, /dd = Math\.min\(st\.day, this\.gMonthDaysOf\(st\.year, st\.month\)\);/, 'اليومُ مقصوصٌ بطول الشهر كما في سطر التذييل');   /* V7 · 53 تقويم: الشهرُ ميلادي (gMonthDaysOf كما في مفتاح اليوم) */
  assert.doesNotMatch(body, /_kpiSelLast/, 'لا يتبع اختيارَ لوحة المؤشرات');
  assert.match(body, /if \(!t\.length\) return "";/, 'يومٌ بلا جولة ⇒ لا صفحةَ مؤشرات');
});

test('ملفٌّ خفيف: توهّجُ خلفية لوحة المؤشرات (blur واللمعة) لا يُطبع — النقشُ والتدرّجُ باقيان', needs('daily'), () => {
  const lg = fs.readFileSync(path.join(SRC, 'systems', 'daily', 'client', 'logic.js'), 'utf8');
  const fit = lg.slice(lg.indexOf('  _kpiPrintFit(t) {'), lg.indexOf('  _kpiPrintFit(t) {') + 3000);
  assert.match(fit, /\/pointer-events:\\s\*none\/\.test\(gs\) && \/inset:\\s\*0\/\.test\(gs\) && \(g\.style\.display = "none"\);/);
  /* الطبقةُ المستهدفة هي أولُ أبناء اللوحة في القالب: غلافٌ بلا محتوى فيه طبقتا blur واللمعة */
  assert.match(lg, /<div style="position:absolute;inset:0;pointer-events:none;overflow:hidden;border-radius:24px"><div style="position:absolute;width:420px;height:420px;border-radius:50%;top:-190px;right:-120px;filter:blur\(60px\);/);
});

test('ملفٌّ خفيف: لا ظلالَ ولا filter في وثيقة الطباعة (كانت تصير مئاتِ صور الأقنعة في الملف)', () => {
  assert.ok(core.includes('".pg *{box-shadow:none!important;text-shadow:none!important;filter:none!important;backdrop-filter:none!important}",'));
  assert.doesNotMatch(core, /\.pnIn > div\{[^}]*box-shadow:0 0 0 1px/, 'حلقةُ اللوحة الجانبية بالحدّ وحده');
});

test('خطوطُ المنصة مضمَّنةٌ في الوثيقة نفسِها (data:) وتسبق قياسَ الصفحات', () => {
  const inj = core.indexOf('e.setAttribute("data-bs-print-fonts", "1")');
  assert.ok(inj > 0, 'ورقةُ الخطوط المضمَّنة تُلحق برأس وثيقة الطباعة');
  assert.match(core, /5 === e\.type && \/data:font\/\.test\(e\.cssText\) && \(t \+= e\.cssText \+ "\\n"\);/, 'قواعدُ @font-face بمصدر data:font كلُّها — لا شرطَ وزن');
  const fit = core.indexOf('.then(() => Promise.all([].map.call(x.querySelectorAll(".pg"), b)))');
  assert.ok(core.indexOf('.then(() => KIVO.BassamCssText.fontData())') < inj && inj < fit, 'الجلبُ ثم التضمين ثم قياسُ الصفحات');
  const wait = core.indexOf('x.fonts.ready', inj);
  assert.ok(wait > inj && wait < fit, 'انتظارُ الخطوط بين التضمين والقياس');
});

/* ══ تنزيلُ ملف PDF مباشرةً (قرار المالك 2026-11-11): كلُّ صفحةٍ صورةٌ جاهزة — يُفتح فوراً بلا إعادة رسم ══ */
import vm from 'node:vm';
const loadCore = () => { const KIVO = {}; vm.runInNewContext(core, { KIVO, TextEncoder, Uint8Array, URL, Blob, setTimeout, console, document: {}, window: {} }); return KIVO.BassamPrintCore; };

test('كاتبُ PDF: ملفٌّ صالح البنية — صفحةٌ لكل صورة بقياس A3 وجدولُ الإزاحات يطابق مواضعَ الكائنات', () => {
  const C = loadCore(); assert.equal(typeof C.pdfBytes, 'function');
  const jpg = (n) => { const u = new Uint8Array(n); u[0] = 0xff; u[1] = 0xd8; u[n - 2] = 0xff; u[n - 1] = 0xd9; return u; };
  const pages = [{ jpg: jpg(1000), pw: 4491, ph: 3129, w: 1497, h: 1043 }, { jpg: jpg(2500), pw: 4491, ph: 3129, w: 1497, h: 1043 }];
  const out = C.pdfBytes(pages, 'تقرير اختبار');
  const txt = Buffer.from(out).toString('latin1');
  assert.ok(txt.startsWith('%PDF-1.4\n'), 'ترويسة'); assert.ok(txt.trimEnd().endsWith('%%EOF'), 'خاتمة');
  assert.equal((txt.match(/\/Type \/Page /g) || []).length, 2, 'صفحتان');
  assert.match(txt, /\/Type \/Pages \/Count 2 \/Kids \[4 0 R 7 0 R\]/);
  assert.equal((txt.match(/\/MediaBox \[0 0 1190\.55 841\.89\]/g) || []).length, 2, 'A3 أفقي');
  assert.equal((txt.match(/\/Filter \/DCTDecode/g) || []).length, 2, 'صورةٌ واحدة لكل صفحة');
  assert.match(txt, /\/Width 4491 \/Height 3129 \/ColorSpace \/DeviceRGB/);
  /* الصورةُ داخل هوامش الصفحة: 12mm يميناً ويساراً وأعلى */
  assert.match(txt, /q 1122\.75 0 0 782\.25 34\.02 25\.62 cm \/Im0 Do Q/);
  /* العنوانُ يونيكود (UTF-16BE) */
  assert.match(txt, /\/Title <FEFF[0-9A-F]+>/);
  /* جدولُ xref: كلُّ إزاحةٍ تشير إلى «n 0 obj» */
  const sx = +/startxref\n(\d+)\n%%EOF/.exec(txt)[1]; assert.ok(txt.slice(sx).startsWith('xref\n0 10\n'), 'موضعُ xref');
  const rows = txt.slice(sx).split('\n').slice(3, 12);
  rows.forEach((r, i) => { const off = +r.slice(0, 10); assert.ok(txt.slice(off).startsWith((i + 1) + ' 0 obj\n'), 'الكائن ' + (i + 1)); });
  /* طولُ كل تدفّقٍ = /Length */
  for (const m of txt.matchAll(/\/Length (\d+) >>\nstream\n/g)) { const st = m.index + m[0].length; assert.equal(txt.slice(st + (+m[1]), st + (+m[1]) + 11), '\nendstream\n'); }
});

test('الطابعةُ تُنزل الملفَّ مباشرةً ونافذةُ الطباعة مسارٌ بديل عند التعذّر', () => {
  assert.match(core, /if \(O\.dialog\) return void dialog\(\);\s*pdfDownload\(x, f, coverInfo\(o, i\)\)\.then\(\(ok\) => \{\s*(?:\/\*[^*]*\*\/\s*)?if \("cancel" === ok\) \{[^}]*\{[^}]*\} catch \(e\) \{\}\s*return;\s*\}\s*if \(!ok\) \{\s*try \{[^}]*\} catch \(e\) \{\}\s*return void dialog\(\);\s*\}/);   /* V7 · 53 (nosilent): الإلغاءُ لا يفتح النافذة، والتعذّرُ يعود إليها بعد إشعارٍ بسببه */   /* V7 · 53 (البند 10): والغلافُ صفحةً أولى */
  assert.match(core, /let scales = wk \? \[2, 1\.5\] : coarse \? \[3, 2\] : \[4, 3, 2\], alt = wk, rf = null;/, 'دقّةٌ ×4 على الحاسوب و×3 على اللمس و×2 في سفاري، وتنزل عند الرفض');
  /* V7 · 53 (ملحق 6 · البند 9): أسبابُ سفاري الثلاثة التي كانت تُسقط التنزيلَ إلى نافذة الطباعة على الآيباد والآيفون */
  assert.match(core, /return \/\^Apple\/\.test\(navigator\.vendor \|\| ""\);/, 'محرّكُ سفاري يُعرف بمورّده');
  assert.match(core, /\n\s+requestAnimationFrame\(\(\) => setTimeout\(k, 80\)\);/, '(1) الانتظارُ من الصفحة');
  assert.doesNotMatch(core, /m\.contentWindow\.requestAnimationFrame/, '(1) لا انتظارَ بنافذة الإطار المحمي');
  assert.match(core, /Promise\.race\(\[x\.fonts\.ready, new Promise\(\(t\) => setTimeout\(t, 3500\)\)\]\)\.then\(v, v\), setTimeout\(v, 3600\)/, '(1) لانتظار الخطوط مهلة');
  assert.match(core, /if \(!alt && altOk\(e\)\) return \(\(alt = !0\), \(scales = \[2, 1\.5\]\), go\(0\)\);/, '(2) رفضُ القراءة في متصفحٍ آخر ينقل إلى الرسّام البديل');
  assert.match(core, /const H2C_URL = "@@KIVO_ASSET:vendor\/html2canvas-1\.4\.1\.min\.js@@";/, 'المكتبةُ ملفٌّ في الحزمة');
  assert.match(core, /foreignObjectRendering: !1/, 'الرسّامُ البديل بلا foreignObject');
  assert.match(core, /\(alt \? raster\(k\)\.then\(\(P\) => pageImageAlt\(P, scales\[i\]\)\)/, '(3) من نسخة الصفحة في إطارٍ مؤقّت');
  assert.match(core, /m\.setAttribute\("sandbox", "allow-same-origin allow-modals"\)/, 'إطارُ الطباعة باقٍ محمياً كما كان');
  assert.match(core, /if \(!\(d\.length > 2e3 && 0 === d\.indexOf\("data:image\/jpeg"\)\)\) throw new Error/, 'لوحةٌ فارغة ⇒ القياسُ التالي');
  assert.match(core, /if \(O\.vector \|\| \(!O\.dialog && !isWK\(\)\)\) return void e\(\);/, 'الخريطةُ تُرسم مرّةً واحدة بدقّة الصفحة في مسار التنزيل — وفي سفاري صورةٌ قبل الرسّام البديل');
  assert.match(core, /img\.src = "data:image\/svg\+xml;charset=utf-8," \+ encodeURIComponent\(svg\);/, 'data: لا blob: (اللوحةُ لا تتلوّث)');
  assert.doesNotMatch(core, /"<\/body>|<\/body>"/, 'لا وسمَ إغلاقٍ حرفيّ في نصّ الكتلة');
});

test('اللوحةُ الجانبية المطبوعة بلا شريطَي التبويب (أزرارُ شاشة) — في كل صفحة', () => {
  assert.ok(core.includes('".pg .pn .bs-subseg,.pg .pn .bs-mixtabs{display:none!important}",'));
});

/* ══ صورةُ الصفحة = الإطارُ نفسُه: شروطُ ‎@media‎ تُثبَّت بحكم الإطار قبل الرسم (ملاحظةُ المالك 2026-11-12: حافةُ «عناصر الخريطة» السفلى مقصوصة) ══
   صورةُ SVG لا مؤشّرَ لها ولا hover: قاعدةُ الخطة ‎@media (hover:hover) and (pointer:fine){.bs-oreg{display:none!important}}‎ تصدق في الإطار
   (فيُقاس تحجيمُ اللوحة بلا سجلّ اللمس) ولا تصدق داخل الصورة، فيظهر السجلُّ في الملف وحده ويدفع إطارَ اللوحة تحت حدّ القصّ. */
test('شروطُ @media في أنماط صورة الصفحة تُثبَّت بحكم إطار الطباعة — لا يُعاد تقييمُها داخل الصورة', () => {
  const C = loadCore(); assert.equal(typeof C.frozenMedia, 'function');
  const asked = [], yes = (q) => (asked.push(q), /hover:hover/.test(q) || q === 'screen');
  const css = '.a{color:red}@media (hover:hover) and (pointer:fine){ .bs-oreg{ display:none !important; } }\n@media (pointer: coarse){.b{min-width:36px}}@media screen{.c{top:0}}@media print{.d{display:none}}@font-face{font-family:Cairo;src:url(data:font/woff2;base64,AA==)}';
  assert.equal(C.frozenMedia(css, yes),
    '.a{color:red}@media all{ .bs-oreg{ display:none !important; } }\n@media not all{.b{min-width:36px}}@media all{.c{top:0}}@media not all{.d{display:none}}@font-face{font-family:Cairo;src:url(data:font/woff2;base64,AA==)}');
  assert.deepEqual(asked, ['(hover:hover) and (pointer:fine)', '(pointer: coarse)', 'screen', 'print']);
  /* مقيِّمٌ يرمي ⇒ القاعدةُ كما هي (لا تُسقط ولا تُفرض) · نصٌّ بلا ‎@media‎ لا يُمسّ · تعليقٌ يذكر ‎@media‎ لا يبتلع ما بعده */
  assert.equal(C.frozenMedia('@media (x){.a{b:c}}', () => { throw new Error('x'); }), '@media (x){.a{b:c}}');
  assert.equal(C.frozenMedia('.a{b:c}', yes), '.a{b:c}');
  assert.equal(C.frozenMedia('/* @media note */.a{b:c}@media screen{.c{top:0}}', yes), '/* @media note */.a{b:c}@media all{.c{top:0}}');
  /* والتنزيلُ يمرّ بها بحكم نافذة الإطار نفسِه */
  assert.ok(core.includes('(q) => x.defaultView.matchMedia(q).matches'), 'الحكمُ حكمُ نافذة إطار الطباعة');
  assert.match(core, /const css = frozenMedia\(/);
});

test('تحجيمُ اللوحة الجانبية على ارتفاع عمودها الفعليّ ناقصاً بكسلاً — لا على المقرَّب (كان يزيد كسرَ بكسل فيُقصّ حدُّها السفلي)', () => {
  assert.ok(core.includes('availH: Math.floor(e.getBoundingClientRect().height) - 1,'));
  assert.doesNotMatch(core, /availH: e\.clientHeight/);
});

/* ══ V7 · 53 (ملحق 6 — نقلُ سلوك البرودكشن بأدوات النواة) ══
   البند 9 (9ff484d · c26d55f · ba52a5d · d071fc9): PDF على الآيباد والآيفون — محرّكُ سفاري يُعرف بمورّده، وشاشةُ «الملف جاهز» (المشاركة) لأجهزة أبل اللمسية
   وحدها، وستارٌ صادق «جاري تحميل الملف…» بالصفحة ن من م يبقى حتى يجهز الملف.
   البند 10 (6171818): غلافُ التقرير صفحةً أولى كاملةً بلا هوامش، والسنةُ والإدارتان من المنصة. المسارُ الحيّ في المتصفح: v7_53_print_ios (browser). */
const loadCoreWith = (nav, K = {}) => { const KIVO = K; vm.runInNewContext(core, { KIVO, navigator: nav, TextEncoder, Uint8Array, URL, Blob, setTimeout, console, document: {}, window: {} }); return KIVO.BassamPrintCore; };
const IPAD = { vendor: 'Apple Computer, Inc.', maxTouchPoints: 5, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15', share: () => Promise.resolve(), canShare: () => true };

test('53 · البند 10: الغلافُ صفحةٌ كاملة بلا هوامش (A3 كلُّها) وصفحاتُ المواقع بهوامشها كما كانت', () => {
  const C = loadCore(), jpg = (n) => { const u = new Uint8Array(n); u[0] = 0xff; u[1] = 0xd8; u[n - 2] = 0xff; u[n - 1] = 0xd9; return u; };
  const txt = Buffer.from(C.pdfBytes([{ jpg: jpg(900), pw: 2480, ph: 1754, w: 2480, h: 1754, full: true }, { jpg: jpg(1000), pw: 4491, ph: 3129, w: 1497, h: 1043 }], 'TEST_ONLY')).toString('latin1');
  assert.match(txt, /\/Type \/Pages \/Count 2 \/Kids \[4 0 R 7 0 R\]/);
  const cms = [...txt.matchAll(/q [^\n]* cm \/Im0 Do Q/g)].map((m) => m[0]);
  assert.deepEqual(cms, ['q 1190.55 0 0 841.89 0.00 0.00 cm /Im0 Do Q', 'q 1122.75 0 0 782.25 34.02 25.62 cm /Im0 Do Q'], 'الغلافُ يملأ الصفحة · الموقعُ بهوامش 12mm');
  assert.match(txt, /\/Width 2480 \/Height 1754 \/ColorSpace \/DeviceRGB/);
  const sx = +/startxref\n(\d+)\n%%EOF/.exec(txt)[1];
  txt.slice(sx).split('\n').slice(3, 12).forEach((r, i) => assert.ok(txt.slice(+r.slice(0, 10)).startsWith((i + 1) + ' 0 obj\n'), 'الكائن ' + (i + 1)));
});

test('53 · البند 10: بياناتُ الغلاف — سنةُ التقرير من سطر تاريخه وإلا السنةُ الجارية، والإدارةُ العامة والإدارة النشطتان', () => {
  /* V7 · 53 تقويم (القاعدة 11): السنةُ ميلاديةٌ أساساً («لعام ٢٠٢٦م») والهجريةُ المقابلة سطرٌ صغير تحتها («١٤٤٨هـ») — من سطر التاريخ، وإلا اليومُ التشغيلي */
  const Cal = (y, hy) => ({ gToday: () => ({ y, k: y + '-11-24' }), hOf: () => ({ y: hy }) });
  const K = { BassamDepts: { activeGroupName: () => 'TEST_ONLY الإدارة العامة' }, BassamCal: Cal(2026, 1448) };
  const C = loadCoreWith(IPAD, K);
  assert.deepEqual(JSON.parse(JSON.stringify(C.coverInfo('جولة يوم 25 ديسمبر 2025 · الموافق 5 رجب 1447', 'TEST_ONLY إدارة'))), { dept: 'TEST_ONLY إدارة', group: 'TEST_ONLY الإدارة العامة', year: '2025', hyear: '1447' });
  assert.deepEqual(JSON.parse(JSON.stringify(C.coverInfo('', 'TEST_ONLY إدارة'))), { dept: 'TEST_ONLY إدارة', group: 'TEST_ONLY الإدارة العامة', year: '2026', hyear: '1448' }, 'بلا سطر تاريخ ⇒ السنةُ الجارية الميلادية وهجريُّها');
  const C2 = loadCoreWith(IPAD, { BassamCal: Cal(2025, 1447) });
  assert.deepEqual(JSON.parse(JSON.stringify(C2.coverInfo('12 فبراير 2026 · الموافق 24 شعبان 1447', ''))), { dept: '', group: '', year: '2026', hyear: '1447' }, 'بلا خدمة الإدارات ⇒ سطرٌ فارغ لا عطل');
  assert.match(core, /" لعام " \+ ar\(info\.year\) \+ "م"/, 'الغلاف: «لعام ٢٠٢٦م»');
  assert.match(core, /g\.fillText\(ar\(info\.hyear\) \+ "هـ", /, 'والهجريُّ سطرٌ صغيرٌ تحته');
  /* الغلافُ من الأصل في الحزمة، ويُرسم بلا نسخٍ للوثيقة؛ وتعذّرُ خلفيته لا يُسقط الملف */
  assert.match(core, /const COVER_URL = "@@KIVO_ASSET:img\/report-cover\.jpg@@";/);
  assert.match(core, /\.reduce\(\(q, pg, k\) => q\.then\(\(\) => \{ if \(run\.stop\) throw PDF_STOP53; return \(say\(k\), one\(pg, k\)\); \}\)\.then\(\(r\) => void imgs\.push\(r\)\), cover\)/, 'الغلافُ قبل الصفحات');   /* V7 · 53 (nosilent): و«إلغاء» يُفحص بين الصفحات */
  assert.match(core, /coverPage\(cov\)\.then\(\s*\(r\) => void imgs\.push\(r\),\s*\(e\) => \{/, 'تعذّرُ الغلاف ⇒ الملفُّ بلا غلاف');
});

test('53 · البند 9: محرّكُ سفاري ومسارُ «الملف جاهز» — أجهزةُ أبل اللمسية وحدها (الحاسوبُ وأندرويد على التنزيل المباشر)', () => {
  const file = { name: 'TEST_ONLY.pdf', type: 'application/pdf' };
  const cases = [
    ['iPad (سطح مكتب الطلب)', IPAD, true, true],
    ['iPhone', Object.assign({}, IPAD, { maxTouchPoints: 5, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15' }), true, true],
    ['سفاري على الماك (بلا لمس)', Object.assign({}, IPAD, { maxTouchPoints: 0 }), true, false],
    ['iPad بلا مشاركة ملفات', Object.assign({}, IPAD, { canShare: () => false }), true, false],
    ['iPad بلا navigator.share', Object.assign({}, IPAD, { share: undefined }), true, false],
    ['Chrome أندرويد', { vendor: 'Google Inc.', maxTouchPoints: 5, userAgent: 'Mozilla/5.0 (Linux; Android 14)', share: () => Promise.resolve(), canShare: () => true }, false, false],
    ['Chrome الحاسوب', { vendor: 'Google Inc.', maxTouchPoints: 0, userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' }, false, false],
  ];
  for (const [who, nav, wk, share] of cases) {
    const C = loadCoreWith(nav);
    assert.equal(C.isWK(), wk, who + ': محرّكُ سفاري'); assert.equal(C.shareMode(file), share, who + ': شاشةُ المشاركة');
  }
  assert.equal(loadCoreWith(Object.assign({}, IPAD, { canShare: () => { throw new Error('x'); } })).shareMode(file), false, 'canShare يرمي ⇒ التنزيلُ المباشر');
  /* الزرُّ يفتح قائمةَ المشاركة بلمسة المستخدم (لا تلقائياً)، والملفُّ نفسُه؛ وإلغاءُ القائمة ليس خطأً */
  assert.match(core, /if \(file && shareMode\(file\) && pdfReady\(file\)\) return \(drop\(\), end\("share"\)\);/);   /* V7 · 53 (nosilent): end يُنهي مؤشرَ التحميل ويُبقي النتيجة */
  assert.match(core, /navigator\.share\(\{ files: \[file\], title: name \}\)/);
  assert.ok(core.indexOf('navigator.share({') > core.indexOf('v.addEventListener("click"'), 'المشاركةُ من نقرة الزر');
  assert.ok(core.includes('>الملف جاهز</div>') && core.includes('>حفظ أو مشاركة الملف</button>'));
  assert.match(core, /if \(ok === "share"\) return;/, 'شاشةُ «الملف جاهز» تتولّى الإشعار');
});

test('53 · البند 9: ستارٌ صادق — «جاري تحميل الملف…» والصفحة ن من م، ويبقى بعد مؤقّت الأمان ما دام الملفُّ يُصنع', () => {
  assert.match(core, /say = \(k\) => veilSay\("جاري تحميل الملف…", N > 1 \? "الصفحة " \+ \(k \+ 1\) \+ " من " \+ N : "صفحة واحدة"\);/);
  assert.match(core, /v\.dataset\.pdf = "1";/);
  assert.ok(core.includes('KIVO.BassamBusy.flash("تم تنزيل التقرير PDF", "تجده في التنزيلات", "ok")'), 'إشعارُ النجاح');
  for (const m of ['plan', 'daily'].filter((k) => SYSTEMS.includes(k))) {
    const lg = fs.readFileSync(path.join(moduleDir(m), 'logic.js'), 'utf8');
    assert.ok(lg.includes('جاري تحميل الملف…</div>'), m + ': نصُّ الستار');
    assert.doesNotMatch(lg, /جاري تجهيز التقرير للطباعة/, m + ': لا «للطباعة» والملفُّ PDF');
    assert.match(lg, /t && \(t\.dataset\.pdf \? setTimeout\(\(\) => \{ try \{ t\.remove\(\); \} catch \(e\) \{\} \}, 15e4\) : t\.remove\(\)\);/, m + ': مؤقّتُ الأمان (30 ث) لا يرفع الستارَ والملفُّ يُصنع');
  }
});
