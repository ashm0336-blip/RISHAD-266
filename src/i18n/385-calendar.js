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
     hGregYearRange(y)       السنةُ أو السنتان الميلاديتان اللتان تمتدّ عليهما السنةُ الهجرية.  */
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
  KIVO.BassamCal = Object.freeze({ hParts: hParts, hPartsSafe: hPartsSafe, hToday: hToday, hGreg: hGreg, hGregNoon: hGregNoon, hGregMonthLabel: hGregMonthLabel, hGregYearRange: hGregYearRange });
})();
