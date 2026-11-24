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
  /* hWeekdayIndex: بحثُ مراقب الإشعارات — يومياً من اليوم ±within يوماً (400 كما كان)، فيومُ الأسبوع هو يومُ أول يومٍ يطابق.
     V7 · د6: الخطوةُ يومٌ تقويميٌّ محلي ظهراً لا 24 ساعةً من «الآن» — تلك كانت تقفز يوماً محلياً كاملاً عند تقديم الساعة (التوقيت الصيفي) متى كان «الآن»
     في الساعة الأخيرة قبل منتصف الليل (لوس أنجلوس 23:30 + 24 ساعة بعد التقديم = 00:30 بعد يومين)، فيبقى اسمُ ذلك اليوم فارغاً (-1).
     الظهرُ موجودٌ في كل يومٍ محلي مرةً واحدة، فكلُّ يومٍ في النافذة يُزار مرةً أياً كانت الساعة والمنطقة (tests/unit/v7_d6_weekday_clock.test.mjs). */
  function hWeekdayIndex(y, m, d, within) {
    try {
      var n = within == null ? 400 : within, now = new Date(), y0 = now.getFullYear(), m0 = now.getMonth(), d0 = now.getDate();
      for (var i = -n; i <= n; i++) { var at = new Date(y0, m0, d0 + i, 12), h = hParts(at); if (h.y === y && h.m === m && h.d === d) return at.getDay(); }
    } catch (e) { /* بلا دعم: -1 */ }
    return -1;
  }
  /* ── V7 · 53 تقويم: الميلادي أساساً (cal_api.md §1) — مرآةُ تقويم الخادم (016: cal*) حرفاً في الناتج (tests/unit/v7_cal_base_agree.test.mjs).
     المفاتيح ISO مبطَّنة · السنةُ تميّز الصيغتين (1300–1599 هجري · 1900–2199 ميلادي) · التاريخُ المدنيّ تاريخُ الرياض أياً كانت منطقةُ الجهاز ·
     gToday يومٌ تشغيليٌّ بمهلة الثلاث ساعات (ق11) كيوم الخادم · الهجريُّ سطرٌ للعرض محسوبٌ من المفتاح الميلادي، لا يُخزَّن. ── */
  var G_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  var H_MONTHS = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
  var WD_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  var DAY_LETTERS = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];
  var KEY_RX = /^(m:)?(\d{4})-(\d{1,2})(?:-(\d{1,2})(?:-(.+))?)?$/, GRACE = 3 * 3600 * 1000;
  function pad(n) { n = +n; return (n < 10 ? '0' : '') + n; }
  function gKey(y, m, d) { return y + '-' + pad(m) + '-' + pad(d); }
  function gYm(y, m) { return y + '-' + pad(m); }
  function gMk(a, m) { return 'm:' + (m == null ? String(a) : gYm(a, m)); }
  function yearCal(y) { return y >= 1300 && y <= 1599 ? 'h' : y >= 1900 && y <= 2199 ? 'g' : null; }
  function gMonthDays(y, m) {
    if (m == null) { var p = /^(?:m:)?(\d{4})-(\d{1,2})$/.exec(String(y)); if (!p) return 0; y = +p[1]; m = +p[2]; }
    return m >= 1 && m <= 12 ? new Date(Date.UTC(+y, +m, 0)).getUTCDate() : 0;
  }
  function gParse(k) {
    var p = KEY_RX.exec(String(k == null ? '' : k)); if (!p) return null;
    var y = +p[2], m = +p[3], d = p[4] == null ? null : +p[4], cal = yearCal(y);
    if (!cal || m < 1 || m > 12) return null;
    if (p[1] && d != null) return null;
    if (d != null && (d < 1 || d > (cal === 'g' ? gMonthDays(y, m) : 30))) return null;
    return { cal: cal, kind: p[1] ? 'mctl' : d == null ? 'month' : 'day', y: y, m: m, d: d, suffix: p[5] || '' };
  }
  function keyCal(k) { var p = gParse(k); return p ? p.cal : null; }
  function isGKey(k, kind) {
    var p = gParse(k); if (!p || p.cal !== 'g' || (kind && p.kind !== kind)) return false;
    var c = p.kind === 'day' ? gKey(p.y, p.m, p.d) + (p.suffix ? '-' + p.suffix : '') : (p.kind === 'mctl' ? 'm:' : '') + gYm(p.y, p.m);
    return c === String(k);
  }
  function gMonthOf(k) { var p = gParse(k); return p && p.cal === 'g' ? gYm(p.y, p.m) : null; }
  function gDayNum(k) { var p = gParse(k); return p ? p.y * 10000 + p.m * 100 + (p.d || 0) : 0; }
  function gCmp(a, b) { var x = gDayNum(a), y = gDayNum(b); return x < y ? -1 : x > y ? 1 : 0; }
  function ofUTC(t) { var x = new Date(t), y = x.getUTCFullYear(), m = x.getUTCMonth() + 1, d = x.getUTCDate(); return { y: y, m: m, d: d, k: gKey(y, m, d), key: gKey(y, m, d), ym: gYm(y, m), mk: 'm:' + gYm(y, m), wd: x.getUTCDay() }; }
  function gAt(date) { return ofUTC((date == null ? Date.now() : +date) + 3 * 36e5); }
  function gToday(date) { return gAt((date == null ? Date.now() : +date) - GRACE); }
  function gAddDays(k, n) { var p = gParse(k); return p && p.kind === 'day' ? ofUTC(Date.UTC(p.y, p.m - 1, p.d + (+n || 0))).k : null; }
  function gAddMonths(ym, n) { var p = gParse(ym); if (!p) return null; var i = p.y * 12 + p.m - 1 + (+n || 0); return gYm(Math.floor(i / 12), (i % 12) + 1); }
  function gPrevMonth(ym) { return gAddMonths(ym, -1); }
  function gNextMonth(ym) { return gAddMonths(ym, 1); }
  function gWeekday(k) { var p = gParse(k); return p && p.kind === 'day' ? new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay() : -1; }
  function gDays(ym) { var p = gParse(ym), out = [], n, i; if (!p || p.cal !== 'g') return out; n = gMonthDays(p.y, p.m); for (i = 1; i <= n; i++) out.push(gKey(p.y, p.m, i)); return out; }
  function gMonthRange(ym) { var L = gDays(ym); return L.length ? { from: L[0], to: L[L.length - 1], days: L.length } : null; }
  function gRange(from, to) { var out = [], k = isGKey(from, 'day') ? from : null; while (k && gCmp(k, to) <= 0 && out.length < 4000) { out.push(k); k = gAddDays(k, 1); } return out; }
  function gYears(a, b) { var out = []; for (var y = +a; y <= +b; y++) out.push(y); return out; }
  function gLetter(k) { var w = gWeekday(k); return w < 0 ? '' : DAY_LETTERS[w]; }
  /* الهجريُّ المقابل ليومٍ ميلادي: ظهرَ UTC (الثالثةُ عصراً بالرياض) بأم القرى بتوقيت الرياض، وبغياب الدعم جدولُ الاحتياط (380) ليومه المحلي ظهراً */
  function hOf(k) {
    var p = gParse(k); if (!p || p.cal !== 'g' || p.kind !== 'day') return null;
    var h = null;
    try { h = hPartsRiyadh(new Date(Date.UTC(p.y, p.m - 1, p.d, 12))); } catch (e) { try { h = KIVO.BassamHijri.now(new Date(p.y, p.m - 1, p.d, 12)); } catch (e2) { h = null; } }
    return h && h.y > 1300 && h.m >= 1 && h.m <= 12 && h.d >= 1 && h.d <= 30 ? { y: h.y, m: h.m, d: h.d } : null;
  }
  function hLine(k) { var h = hOf(k); return h ? h.d + '/' + h.m : ''; }
  function hDayText(k) { var h = hOf(k); return h ? h.d + ' ' + H_MONTHS[h.m - 1] + ' ' + h.y : ''; }
  function hMonthsOf(ym) {
    var out = [], last = null;
    gDays(ym).forEach(function (k) {
      var h = hOf(k); if (!h) return;
      if (last && last.y === h.y && last.m === h.m) { last.days++; last.to = k; } else { last = { y: h.y, m: h.m, days: 1, from: k, to: k }; out.push(last); }
    });
    return out;
  }
  function hRangeOfMonth(ym) {
    var L = gDays(ym); if (!L.length) return '';
    var a = hOf(L[0]), b = hOf(L[L.length - 1]), N = H_MONTHS; if (!a || !b) return '';
    if (a.y === b.y && a.m === b.m) return a.d + ' – ' + b.d + ' ' + N[a.m - 1] + ' ' + a.y;
    if (a.y === b.y) return a.d + ' ' + N[a.m - 1] + ' – ' + b.d + ' ' + N[b.m - 1] + ' ' + a.y;
    return a.d + ' ' + N[a.m - 1] + ' ' + a.y + ' – ' + b.d + ' ' + N[b.m - 1] + ' ' + b.y;
  }
  function hRangeOfYear(y) { var a = hOf(gKey(+y, 1, 1)), b = hOf(gKey(+y, 12, 31)); return !a || !b ? '' : a.y === b.y ? a.y + ' هـ' : a.y + ' – ' + b.y + ' هـ'; }
  function fmtMonthName(ym) { var p = gParse(ym); return p && p.cal === 'g' ? G_MONTHS[p.m - 1] : ''; }
  function fmtMonth(ym) { var p = gParse(ym); return p && p.cal === 'g' ? G_MONTHS[p.m - 1] + ' ' + p.y : ''; }
  function fmtDay(k) { var p = gParse(k); return p && p.cal === 'g' && p.kind === 'day' ? p.d + ' ' + G_MONTHS[p.m - 1] + ' ' + p.y : ''; }
  function fmtDayLong(k) { var t = fmtDay(k); return t ? WD_NAMES[gWeekday(k)] + ' ' + t : ''; }
  function fmtPrint(k) { var t = fmtDay(k), h = hDayText(k); return t && h ? t + ' · الموافق ' + h : t; }
  function fileTag(k) { var p = gParse(k); return !p || p.cal !== 'g' ? '' : p.kind === 'day' ? gKey(p.y, p.m, p.d) : gYm(p.y, p.m); }
  function monthOptions(y) { var out = []; for (var m = 1; m <= 12; m++) out.push({ v: gYm(+y, m), t: G_MONTHS[m - 1], sub: hRangeOfMonth(gYm(+y, m)) }); return out; }
  function yearOptions(a, b) { return gYears(a, b).map(function (y) { return { v: y, t: String(y), sub: hRangeOfYear(y) }; }); }
  /* حالتا الكرت (§7 · كرتُ اليوم المعتمد docs/handoff/day_card_design.md): «مغلق» (قفل) و«مفتوح» (بلا قفل) وحدهما؛ والسببُ الإداري في التلميح وحده.
     o = { k: يوم أو شهر أو سنة 'YYYY' · closed · why · until · T: اليومُ المرجعي (افتراضاً gToday) }
     التلميحُ ثلاثةُ أسطر: «الأحد 1 نوفمبر 2026 م» · «21 جمادى الأولى 1448 هـ» · الحالة (مغلق — اعتُمد …) */
  var WHY = { ap: 'اعتُمد', auto: 'أُغلق تلقائياً بلا اعتماد', past: 'أُغلق تلقائياً بلا اعتماد', shut: 'أُغلق يدوياً', gone: 'مضى' };
  function when(k, T) {
    var p = gParse(k), t = gParse(T); if (!t) return '';
    var a = p ? (p.kind === 'day' ? gDayNum(k) : p.y * 100 + p.m) : /^\d{4}$/.test(k) ? +k : null, b;
    if (a == null) return '';
    b = p && p.kind === 'day' ? gDayNum(T) : p ? t.y * 100 + t.m : t.y;
    return a < b ? 'past' : a > b ? 'future' : 'now';
  }
  function cardState(o) {
    o = o || {};
    var k = String(o.k == null ? '' : o.k), closed = !!o.closed, w = when(k, o.T || gToday().k), why = closed ? (WHY[o.why] ? o.why : '') : o.why === 'retro' || w === 'past' ? 'retro' : '', l1, l2, l3;
    if (/^\d{4}$/.test(k)) { l1 = k + ' م'; l2 = hRangeOfYear(+k); }
    else if (isGKey(k, 'month')) { l1 = fmtMonth(k) + ' م'; l2 = hRangeOfMonth(k) ? hRangeOfMonth(k) + ' هـ' : ''; }
    else { l1 = fmtDayLong(k) + ' م'; l2 = hDayText(k) ? hDayText(k) + ' هـ' : ''; }
    var until = o.until ? ' حتى ' + (typeof o.until === 'number' ? fmtDay(gAt(o.until).k) : o.until) : '';
    l3 = closed ? 'مغلق' + (why ? ' — ' + WHY[why] : '') : why === 'retro' ? 'مفتوح — للاستدراك' + until : w === 'future' ? 'مفتوح — قادم' : 'مفتوح';
    return { closed: closed, why: why, when: w, label: closed ? 'مغلق' : 'مفتوح', lines: [l1, l2, l3], tip: [l1, l2, l3].filter(Boolean).join('\n') };
  }
  KIVO.BassamCal = Object.freeze({ hParts: hParts, hPartsSafe: hPartsSafe, hToday: hToday, hGreg: hGreg, hGregNoon: hGregNoon, hGregMonthLabel: hGregMonthLabel, hGregYearRange: hGregYearRange,
    hPartsRiyadh: hPartsRiyadh, hNow: hNow, hText: hText, hGregExact: hGregExact, hGregUTC: hGregUTC, hMonthDays: hMonthDays, hMonthDaysNoon: hMonthDaysNoon, hWeekdayIndex: hWeekdayIndex,
    /* V7 · 53 تقويم: الميلادي أساساً (cal_api.md §1) */
    G_MONTHS: Object.freeze(G_MONTHS), H_MONTHS: Object.freeze(H_MONTHS), WD_NAMES: Object.freeze(WD_NAMES), DAY_LETTERS: Object.freeze(DAY_LETTERS),
    gToday: gToday, gAt: gAt, gKey: gKey, gYm: gYm, gMk: gMk, gParse: gParse, keyCal: keyCal, isGKey: isGKey, gMonthOf: gMonthOf, gMonthDays: gMonthDays, gDays: gDays,
    gMonthRange: gMonthRange, gRange: gRange, gAddDays: gAddDays, gAddMonths: gAddMonths, gPrevMonth: gPrevMonth, gNextMonth: gNextMonth, gCmp: gCmp, gDayNum: gDayNum,
    gWeekday: gWeekday, gYears: gYears, gLetter: gLetter, hOf: hOf, hLine: hLine, hDayText: hDayText, hMonthsOf: hMonthsOf, hRangeOfMonth: hRangeOfMonth,
    hRangeOfYear: hRangeOfYear, fmtMonth: fmtMonth, fmtMonthName: fmtMonthName, fmtDay: fmtDay, fmtDayLong: fmtDayLong, fmtPrint: fmtPrint, fileTag: fileTag,
    monthOptions: monthOptions, yearOptions: yearOptions, cardState: cardState });
})();

/* ═══ V7 · 53 تقويم: كرتُ اليوم/الشهر/السنة — المكوّنُ الواحد لكل كروت التقويم في المنصة (KIVO.BassamCalCard) ═══
   المواصفة: docs/handoff/day_card_design.md (قرارُ المالك · REVIEW 21) حرفاً، ومرجعُها المرئي صفحةُ «كرت اليوم الجديد».
   كرتُ اليوم: ارتفاع 36 · عرضٌ أدنى 28 · زوايا 5 · ثلاثةُ أسطر بينها 2px: حرفُ اليوم (7.5px · 800 · خافت، والجمعةُ والسبت بالذهبي) · اليومُ الميلادي
   (12.5px · 900) · اليومُ الهجري (7.5px · 600 · خافت). الحالات: مغلق = خلفيةُ --cal-lockb ورقمٌ بـ--cal-lock وقفلٌ في دائرة 11px بالزاوية العليا ·
   مفتوح (ماضٍ فُتح للاستدراك) = إطارٌ ذهبيٌّ متقطّع 1.5px بلا قفل · اليوم = حلقةٌ ذهبية 2px · المحدَّد = تدرّجٌ ذهبيٌّ ممتلئ ونصٌّ أبيض · القادم = شفافية 0.55.
   السببُ الإداري في التلميح وحده (BassamCal.cardState). كرتا الشهر والسنة بالآلية نفسها: الاسمُ الميلادي كبيراً والهجريُّ المقابل سطراً صغيراً.
   الألوانُ رموزٌ دلالية (--cal-* · --bg/--text) فيتبعها الوضعُ الداكن، ولا لونَ خاماً هنا.
     day({k, closed, why, until, sel, T, hint, style, onClick, onDoubleClick, key, attrs}) · month({ym, …}) · year({y, …}) ⇒ عنصرُ React
     hint (اختياري، نصٌّ عادي): سطرٌ رابع في التلميح بعد أسطر حالة الكرت — التمييزُ الإداري وإرشادُ الصلاحية (القاعدة 10 · 4)، بلا حالةٍ ولا نمطٍ جديد
     T = اليومُ المرجعي (افتراضاً BassamCal.gToday().k) ومنه «اليوم» و«القادم» و«الماضي» · style للتخطيط وحده (flex · هامش) لا للمقاس
     model(kind, p) ⇒ { style, lineStyles, title, lines, closed, state } لمن يبني بغير React */
(function () {
  var C = KIVO.BassamCal;
  var BOX = {
    day: { height: 36, minWidth: 28, flex: '1 0 28px' },
    month: { height: 36, minWidth: 64, flex: '1 0 auto', padding: '0 6px' },   /* العرضُ على قدر سطر المدى الهجري: لا يفيض نصٌّ خارج الكرت */
    year: { height: 36, minWidth: 72, flex: '0 0 auto', padding: '0 8px' }
  };
  var LINE = {
    w: { fontSize: 7.5, fontWeight: 800, color: 'var(--cal-mut)' },
    g: { fontSize: 12.5, fontWeight: 900, letterSpacing: -0.3 },
    h: { fontSize: 7.5, fontWeight: 600, color: 'var(--cal-mut)' }
  };
  function assign(a) { for (var i = 1; i < arguments.length; i++) { var b = arguments[i]; if (b) for (var k in b) if (Object.prototype.hasOwnProperty.call(b, k)) a[k] = b[k]; } return a; }
  function keyOf(kind, p) { return kind === 'day' ? String(p.k || '') : kind === 'month' ? String(p.ym || p.k || '') : String(p.y || p.k || ''); }
  function text(kind, k) {
    if (kind === 'day') return [C.gLetter(k), String((C.gParse(k) || {}).d || ''), String((C.hOf(k) || {}).d || '')];
    if (kind === 'month') {
      var r = C.hRangeOfMonth(k), h = C.hMonthsOf(k), y = h.length && h[0].y === h[h.length - 1].y ? ' ' + h[0].y : '';
      return [C.fmtMonthName(k), y && r.slice(-y.length) === y ? r.slice(0, -y.length) : r];
    }
    return [k, C.hRangeOfYear(+k)];
  }
  function model(kind, p) {
    p = p || {};
    var k = keyOf(kind, p), T = p.T || C.gToday().k, st = C.cardState({ k: k, closed: p.closed, why: p.why, until: p.until, T: T });
    var sel = !!p.sel, now = st.when === 'now', future = st.when === 'future', openPast = !st.closed && st.when === 'past';
    var we = kind === 'day' && (C.gWeekday(k) === 5 || C.gWeekday(k) === 6);
    var style = assign({ position: 'relative', boxSizing: 'border-box', borderRadius: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 2, lineHeight: 1, cursor: 'pointer', transition: 'transform .15s, box-shadow .15s', userSelect: 'none', textAlign: 'center', whiteSpace: 'nowrap',
      background: 'var(--cal-card)', border: '1px solid var(--cal-line)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-card)' }, p.style, BOX[kind]);
    var num = null;
    if (st.closed) { style.background = 'var(--cal-lockb)'; style.border = '1px solid color-mix(in srgb, var(--cal-lock) 35%, transparent)'; num = 'var(--cal-lock)'; }
    else if (openPast) { style.background = 'var(--cal-card)'; style.border = '1.5px dashed var(--cal-gold)'; num = 'var(--cal-gold-text)'; }
    if (future) { style.opacity = 0.55; style.boxShadow = 'none'; }
    if (now) style.boxShadow = '0 0 0 2px var(--cal-gold), var(--shadow-card)';
    if (sel) { style.background = 'linear-gradient(180deg, var(--cal-sel-a), var(--cal-sel-b))'; style.border = '1px solid transparent'; style.color = 'var(--cal-on-sel)';
      style.boxShadow = '0 4px 12px var(--cal-sel-glow)'; style.zIndex = 4; num = null; }
    var L = kind === 'day' ? [assign({}, LINE.w, we ? { color: 'var(--cal-gold)' } : null), assign({}, LINE.g, num ? { color: num } : null), assign({}, LINE.h)]
      : [assign({}, LINE.g, num ? { color: num } : null), assign({}, LINE.h)];
    if (sel) L = L.map(function (s) { return assign(s, { color: 'var(--cal-on-sel)' }); });
    var hint = p.hint == null ? '' : String(p.hint).trim();
    return { kind: kind, k: k, style: style, lineStyles: L, title: hint ? st.tip + '\n' + hint : st.tip, closed: st.closed, label: st.label, why: st.why, when: st.when, sel: sel,
      state: st.closed ? 'closed' : 'open', lines: text(kind, k) };
  }
  function render(kind, p) {
    p = p || {};
    var R = (typeof window !== 'undefined' && window.React) || KIVO.React, h = R.createElement, M = model(kind, p);
    var kids = M.lines.map(function (t, i) { return h('span', { key: 'l' + i, 'data-cal-line': String(i), style: assign({ display: 'block' }, M.lineStyles[i]) }, t); });
    if (M.closed) kids.unshift(h('i', { key: 'lock', 'data-cal-lock': '1', 'aria-hidden': 'true', style: { position: 'absolute', top: -4, left: -3, width: 11, height: 11, borderRadius: '50%', boxSizing: 'border-box',
      background: 'var(--cal-card)', border: '1px solid var(--cal-line)', display: 'grid', placeItems: 'center' } },
      h('svg', { viewBox: '0 0 24 24', width: 6, height: 6, fill: 'none', stroke: 'var(--cal-lock)', strokeWidth: 3 },
        h('rect', { x: 5, y: 11, width: 14, height: 10, rx: 2 }), h('path', { d: 'M8 11V7a4 4 0 0 1 8 0v4' }))));
    return h('div', assign({}, p.attrs || {}, { key: p.key, title: M.title, 'aria-label': M.title.replace(/\n/g, ' · '), 'data-cal-kind': kind, 'data-cal-state': M.state, 'data-cal-when': M.when,
      'data-cal-sel': M.sel ? '1' : '0', 'data-cal-key': M.k, onClick: p.onClick, onDoubleClick: p.onDoubleClick, style: M.style,
      /* تفاعلُ المرور المعتمد (المرجعُ المرئي): يرتفع الكرتُ 2px ويكبر 6% فوق جيرانه — تحويلٌ لا يمسّ مقاسَه في الشريط */
      onMouseEnter: function (e) { var t = e.currentTarget.style; t.transform = 'translateY(-2px) scale(1.06)'; t.zIndex = 5; if (p.attrs && p.attrs.onMouseEnter) p.attrs.onMouseEnter(e); },
      onMouseLeave: function (e) { var t = e.currentTarget.style; t.transform = ''; t.zIndex = M.style.zIndex == null ? '' : M.style.zIndex; if (p.attrs && p.attrs.onMouseLeave) p.attrs.onMouseLeave(e); } }), kids);
  }
  KIVO.BassamCalCard = Object.freeze({
    day: function (p) { return render('day', p); }, month: function (p) { return render('month', p); }, year: function (p) { return render('year', p); }, model: model
  });
})();
