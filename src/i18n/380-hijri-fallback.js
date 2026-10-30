
/* ── تاريخ هجري احتياطي ────────────────────────────────────────────────────────
   كان الاحتياطي عند فشل Intl تاريخاً ثابتاً مكتوباً في الكود ومكرَّراً في خمسة
   مواضع، فأي متصفح لا يدعم islamic-umalqura يظل يظن أنه في ذلك الشهر إلى الأبد.
   المسار السليم (Intl) لم يُمسّ إطلاقاً — هذا يعمل فقط حين يفشل، ويُحسب بالتقويم
   الهجري الحسابي الجدولي: يطابق أم القرى في أغلب الأيام ويفرق يوماً أو يومين
   أحياناً، وهذا مقبول لمسارٍ بديل مقابل تاريخٍ مجمَّد لا يتحرّك أصلاً. */
(function(){
  function g2jd(y, m, d){
    var a = Math.floor((14 - m) / 12), y2 = y + 4800 - a, m2 = m + 12 * a - 3;
    return d + Math.floor((153 * m2 + 2) / 5) + 365 * y2
      + Math.floor(y2 / 4) - Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045;
  }
  /* توحيد التقويم: الصفحات كلها تحسب «اليوم» بأم القرى (Intl umalqura) — وكانت
     هذه الدالة وحدها على خوارزمية جدولية تقريبية تخالفها بيومين، فلو فشل Intl
     يوماً قفز التاريخ ومفاتيح البيانات معه. صارت أم القرى هي الأصل هنا أيضاً،
     والجدولية آخر ملاذ فقط. */
  var HF = null;
  function now(dt){
    var g = dt || new Date();
    try {
      if (HF === null) HF = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { year: "numeric", month: "numeric", day: "numeric" });
      var p = HF.formatToParts(g);
      var q = function(t){ return +p.filter(function(x){ return x.type === t; })[0].value; };
      var r = { y: q("year"), m: q("month"), d: q("day") };
      if (r.y > 1300 && r.y < 1600 && r.m >= 1 && r.m <= 12 && r.d >= 1 && r.d <= 30) return r;
    } catch (e0) {}
    try {
      var g = dt || new Date();
      var l = g2jd(g.getFullYear(), g.getMonth() + 1, g.getDate()) - 1948440 + 10632;
      var n = Math.floor((l - 1) / 10631);
      l = l - 10631 * n + 354;
      var j = (Math.floor((10985 - l) / 5316)) * (Math.floor((50 * l) / 17719))
            + (Math.floor(l / 5670)) * (Math.floor((43 * l) / 15238));
      l = l - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50))
            - (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29;
      var m = Math.floor((24 * l) / 709);
      var d = l - Math.floor((709 * m) / 24);
      var y = 30 * n + j - 30;
      if (y > 1300 && y < 1600 && m >= 1 && m <= 12 && d >= 1 && d <= 30) return { y: y, m: m, d: d };
    } catch (e) {}
    return { y: 1448, m: 2, d: 1 };          /* آخر ملاذ */
  }
  KIVO.BassamHijri = { now: now };
})();
