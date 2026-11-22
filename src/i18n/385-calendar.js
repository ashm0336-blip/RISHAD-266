/* ═══ التقويم الهجري/الميلادي — نسخةٌ واحدة لكل دالة (V7 · د5-د) ═══
   كانت هذه الدوالّ منسوخةً في الصفحات (hGreg ٧ نسخ · hParts ٥ · hGregMonthLabel ٦ · hGregYearRange ٤ · hToday ٣)، متطابقةَ المنطق مختلفةَ أسماء
   المتغيّرات. صارت هنا مرةً واحدة، والصفحاتُ ترثها من عُدّة الصفحات (565) منادياتٍ لهذه الخدمة — لا نسخةَ في أي صفحة.
     hParts(date)            أجزاءُ التاريخ الهجري (أم القرى) لتاريخٍ ميلادي — يرمي إن غاب دعمُ التقويم (كما كانت نسخُ الصفحات).
     hPartsSafe(date?)       مثلُها، وبغياب الدعم ترجع من الاحتياط (BassamHijri) ثم قيمةً ثابتة — لمن كان يتراجع (ملفي).
     hToday()                أجزاءُ اليوم، بالتراجع نفسِه.
     hGreg(y, m, d)          التاريخُ الميلادي ليومٍ هجري: تقديرٌ ثم تصحيحٌ حتى يطابق hParts. الساعةُ كما يعطيها التقدير (غير مثبَّتة).
     hGregNoon(y, m, d)      مثلُها والساعةُ مثبَّتةٌ على 12 ظهراً محلياً في كل خطوة — لمن يحسب بالأيام فلا يُزيحه التوقيتُ الصيفي ولا منتصفُ الليل
                             (المتابعة اليومية والتقرير اليومي). **دالتان لا واحدة**: اليومُ الميلادي واحدٌ في الاثنتين لكلِّ تاريخ، لكنّ اللحظةَ (getTime)
                             تختلف؛ ومن يطرح لحظتين أو يقارنهما يتغيّر ناتجُه لو وُحِّدتا. (الاختبار: tests/unit/v7_d5_calendar.test.mjs)
     hGregMonthLabel(y, m)   اسمُ الشهر الميلادي والسنة لمنتصف الشهر الهجري (مخبوء).
     hGregYearRange(y)       السنةُ أو السنتان الميلاديتان اللتان تمتدّ عليهما السنةُ الهجرية.
   V7 · د5-د2: بقيةُ حسابات التقويم التي كانت تُحسب في مواضعها بأسماءٍ أخرى (نحو 40 موضعاً) صارت هنا — لا صفحةَ ولا خدمةَ غير هذه (وجدولِ الاحتياط 380)
   تبني مُنسِّقَ أم القرى أو تحسب التقويم. ما اختلف ناتجُه بقي دالتين باسمين وسببُه مكتوب؛ وما ثبت تطابقُه صار واحدة (tests/unit/v7_d5d2_calendar_rest.test.mjs):
     hPartsRiyadh(date)      أجزاءُ التاريخ الهجري بتوقيت الرياض أياً كانت منطقةُ الجهاز — لمن يقابل يومَ الخادم (الخطة: الجولات · المهام: الختم والمؤشرات).
                             **غيرُ hParts**: تلك بمنطقة الجهاز، والناتجُ يختلف خارج الرياض حول منتصف الليل. ترمي إن غاب الدعم.
     hNow(date?, absent?)    «اليوم» من جدول الاحتياط (BassamHijri: أم القرى متحقَّقاً منه ثم الجدولي ثم ثابت) — لمن كان يسأل الجدولَ مباشرة.
                             **غيرُ hPartsSafe**: هذه تتحقّق من المدى فتتراجع للجدولي إن أعاد المتصفحُ تقويماً آخر صامتاً. بغياب الجدول: ترجع absent إن أُعطيت وإلا ترمي.
     hText(date, opts)       نصٌّ هجري عربي بأرقامٍ لاتينية (ar-SA · أم القرى) بخيارات Intl كما هي (ومنها timeZone) — لكل عرضٍ هجري مكتوب. ترمي لتاريخٍ غير صالح.
     hGregExact(y, m, d)     لحظةٌ يومُها الهجري هو المطلوب تماماً، بالبحث اليومي (لا بمحلِّل hGreg — سببُه عند الدالة)، أو null — للطباعة («الموافق» يُحذف إن لم يُعرف).
     hGregUTC(y, m, d)       لحظةُ منتصف ليل UTC التي تاريخُها الهجري (بمنطقة الجهاز) هو المطلوب، أو null — للإحصائيات اليومية التي تقرأها بدوالّ UTC.
                             **غيرُ hGreg/hGregNoon**: اللحظةُ غيرُها، وغربَ غرينتش يومُها بـUTC غيرُ اليوم المحلي (مثبَتٌ في الاختبار) ⇒ دالةٌ ثالثة.
     hMonthDays(y, m, u?)    عددُ أيام الشهر الهجري (29/30) بـhGreg + 29 يوماً بالساعات — للخطة والمضبوطات والمهام والجدول والاسترشاد.
     hMonthDaysNoon(y, m, u?) مثلُها بـhGregNoon واليومُ الثلاثون ظهراً — للمتابعة اليومية والتقرير اليومي والإحصائيات. **دالتان لا واحدة**: الأولى يُزيحها التوقيتُ الصيفي
                             في بعض الأشهر (لوس أنجلوس: شهران من 252) فتختلف النتيجة؛ ونسخةُ الإحصائيات (بحثٌ على UTC) طابقت نسخةَ الظهر في كل شهر فدُمجت فيها.
                             u = القيمةُ عند غياب دعم التقويم (30 افتراضاً كما كانت الصفحات · الإحصائيات تمرّر 29 كما كانت).
     hWeekdayIndex(y, m, d, within?)  رقمُ يوم الأسبوع (0 = الأحد) ليومٍ هجري، أو -1 إن لم يُعرف — لمراقب الإشعارات (راحةُ اليوم).
                             within: لا يُجاب إلا ليومٍ يبعد عن اليوم هذا العددَ من الأيام على الأكثر (كان المراقبُ يبحث ±400 يوماً ثم يسكت).  */
(function () {
  var fmt;
  function formatter() {
    if (fmt === undefined) { try { fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' }); } catch (e) { fmt = null; } }
    return fmt;
  }
  function hParts(date) {
    var parts = formatter().formatToParts(date), pick = function (type) { return +parts.find(function (p) { return p.type === type; }).value; };
    return { y: pick('year'), m: pick('month'), d: pick('day') };
  }
  function fallback(date) { try { return KIVO.BassamHijri.now(date); } catch (e) { return { y: 1448, m: 1, d: 1 }; } }
  function hPartsSafe(date) { try { return hParts(date || new Date()); } catch (e) { return fallback(date); } }
  function hToday() { try { return hParts(new Date()); } catch (e) { return KIVO.BassamHijri ? KIVO.BassamHijri.now() : { y: 1448, m: 2, d: 1 }; } }
  function estimate(y, m, d) { return new Date(new Date(2026, 5, 16).getTime() + 864e5 * (29.5306 * (12 * (y - 1448) + (m - 1)) + (d - 1))); }
  function solve(y, m, d, pin) {
    var at = pin(estimate(y, m, d));
    try {
      for (var i = 0; i < 12; i++) {
        var h = hParts(at);
        if (h.y === y && h.m === m && h.d === d) return at;
        var off = 354.367 * (h.y - y) + 29.5306 * (h.m - m) + (h.d - d);
        at = pin(new Date(at.getTime() - 864e5 * (Math.round(off) || (off > 0 ? 1 : -1))));
      }
    } catch (e) { /* بلا دعمٍ للتقويم: يبقى التقدير */ }
    return at;
  }
  function hGreg(y, m, d) { return solve(y, m, d, function (t) { return t; }); }
  function hGregNoon(y, m, d) { return solve(y, m, d, function (t) { return new Date(t.getFullYear(), t.getMonth(), t.getDate(), 12); }); }
  var labels = Object.create(null);
  function hGregMonthLabel(y, m) {
    var key = y + '-' + m;
    if (labels[key]) return labels[key];
    var label = '';
    try { label = hGreg(y, m, 15).toLocaleDateString('ar-u-ca-gregory-nu-latn', { month: 'long', year: 'numeric' }); } catch (e) { /* يبقى فارغاً */ }
    return (labels[key] = label), label;
  }
  function hGregYearRange(y) {
    try { var a = hGreg(y, 1, 1).getFullYear(), b = hGreg(y, 12, 29).getFullYear(); return a === b ? a + ' م' : a + ' – ' + b + ' م'; } catch (e) { return ''; }
  }
  /* ── V7 · د5-د2: بقيةُ الحسابات ── */
  var fmtRiyadh;
  function formatterRiyadh() {
    if (fmtRiyadh === undefined) { try { fmtRiyadh = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }); } catch (e) { fmtRiyadh = null; } }
    return fmtRiyadh;
  }
  function hPartsRiyadh(date) {
    var parts = formatterRiyadh().formatToParts(date), pick = function (type) { return +parts.find(function (p) { return p.type === type; }).value; };
    return { y: pick('year'), m: pick('month'), d: pick('day') };
  }
  function hNow(date, absent) {
    var table = KIVO.BassamHijri;
    if (table && table.now) return table.now(date);
    if (arguments.length < 2) throw new Error('hijri-fallback-missing');
    return absent;
  }
  var texts = Object.create(null);
  function hText(date, opts) {
    var key = JSON.stringify(opts || {});
    return (texts[key] || (texts[key] = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', opts))).format(date);
  }
  /* hGregExact: بحثٌ يومي (لا محلِّلُ hGreg) — المحلِّلُ يخطو 24 ساعةً من تقديرٍ قرب منتصف الليل، فيتخطّى يوماً عند قفزة التوقيت الصيفي ويتأرجح
     (مثبَتٌ في الاختبار: 1454-12-11 بلوس أنجلوس). الطباعةُ كانت تبحث هكذا: تقديرٌ من منتصف ليل UTC ثم ±30 يوماً — فهذه خوارزميتُها حرفاً. */
  function hGregExact(y, m, d) {
    var start = new Date(Date.UTC(622, 6, 16) + Math.round(864e5 * (354.36667 * (y - 1) + 29.53 * (m - 1) + (d - 1))));
    for (var s = -30; s <= 30; s++) { var at = new Date(start.getTime() + 864e5 * s), h = hParts(at); if (h.y === y && h.m === m && h.d === d) return at; }
    return null;
  }
  var utc = Object.create(null);
  function hGregUTC(y, m, d) {
    var key = y + '|' + m + '|' + d;
    if (key in utc) return utc[key];
    if (!formatter()) return (utc[key] = null);
    var lo = -40000, hi = 40000, want = y * 10000 + m * 100 + d;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1, at = new Date(Date.UTC(1970, 0, 1 + mid)), h = hParts(at), got = h.y * 10000 + h.m * 100 + h.d;
      if (got === want) return (utc[key] = at);
      if (got < want) lo = mid + 1; else hi = mid - 1;
    }
    return (utc[key] = null);
  }
  var lens = Object.create(null), lensNoon = Object.create(null);
  function monthDays(cache, y, m, day30, unsupported) {
    if (!formatter()) return unsupported === undefined ? 30 : unsupported;
    var key = y + '-' + m;
    if (cache[key]) return cache[key];
    var h = hParts(day30());
    return (cache[key] = h.y === y && h.m === m ? 30 : 29);
  }
  function hMonthDays(y, m, unsupported) { return monthDays(lens, y, m, function () { return new Date(hGreg(y, m, 1).getTime() + 25056e5); }, unsupported); }
  function hMonthDaysNoon(y, m, unsupported) { return monthDays(lensNoon, y, m, function () { var a = hGregNoon(y, m, 1); return new Date(a.getFullYear(), a.getMonth(), a.getDate() + 29, 12); }, unsupported); }
  /* hWeekdayIndex: خوارزميةُ مراقب الإشعارات حرفاً — بحثٌ يومي من «الآن» ±within يوماً (400 كما كان)، فيومُ الأسبوع هو يومُ أول لحظةٍ تطابق. */
  function hWeekdayIndex(y, m, d, within) {
    try {
      var n = within == null ? 400 : within, now = new Date();
      for (var i = -n; i <= n; i++) { var at = new Date(now.getTime() + i * 864e5), h = hParts(at); if (h.y === y && h.m === m && h.d === d) return at.getDay(); }
    } catch (e) { /* بلا دعم: -1 */ }
    return -1;
  }
  KIVO.BassamCal = Object.freeze({ hParts: hParts, hPartsSafe: hPartsSafe, hToday: hToday, hGreg: hGreg, hGregNoon: hGregNoon, hGregMonthLabel: hGregMonthLabel, hGregYearRange: hGregYearRange,
    hPartsRiyadh: hPartsRiyadh, hNow: hNow, hText: hText, hGregExact: hGregExact, hGregUTC: hGregUTC, hMonthDays: hMonthDays, hMonthDaysNoon: hMonthDaysNoon, hWeekdayIndex: hWeekdayIndex });
})();
