
/* ── الاحتياج لكل وردية ──────────────────────────────────────────────────────
   كان الاحتياج رقماً واحداً على العنصر (needN) يُضرب في عدد الورديات، أي أن
   المنظومة تفترض أن كل الورديات متساوية الاحتياج — وهذا غير صحيح ميدانياً:
   وردية الذروة تحتاج أضعاف وردية الليل. صار العنصر يحمل needS: خريطة
   {اسم الوردية: عدد} تُدخَل عند الحاجة فقط، و needN يبقى الافتراضي لكل
   وردية لم يُحدَّد لها استثناء — فلا تتغير أي أرقام قائمة ما لم يُدخل المستخدم
   استثناءً بنفسه. كل حسابات التغطية تمرّ من هنا لا من needN مباشرة. */
(function(){
  function num(v){ var n = parseInt(String(v == null ? "" : v).trim(), 10); return isNaN(n) ? null : n; }
  /* احتياج العنصر في وردية بعينها */
  function of(el, shName){
    if (!el) return 0;
    var base = num(el.needN); base = (base != null && base > 0) ? base : 0;
    var m = el.needS;
    if (m && shName && Object.prototype.hasOwnProperty.call(m, shName)){
      var v = num(m[shName]);
      if (v != null && v >= 0) return v;
    }
    return base;
  }
  /* إجمالي احتياج العنصر عبر كل الورديات */
  function tot(el, shiftOpts){
    if (!el) return 0;
    var o = shiftOpts || [];
    if (!o.length){ var b = num(el.needN); return (b != null && b > 0) ? b : 0; }
    var s = 0; for (var i = 0; i < o.length; i++) s += of(el, o[i].name || o[i]);
    return s;
  }
  /* هل للعنصر احتياج أصلاً؟ — موحّداً كان أو لوردية بعينها */
  function has(el, shiftOpts){ return tot(el, shiftOpts) > 0; }
  /* هل خُصّص للعنصر استثناء يخالف الموحّد؟ — لإظهار مؤشّر في المحرّر */
  function custom(el, shiftOpts){
    if (!el || !el.needS) return false;
    var o = shiftOpts || [], b = num(el.needN); b = (b != null && b > 0) ? b : 0;
    for (var i = 0; i < o.length; i++){ if (of(el, o[i].name || o[i]) !== b) return true; }
    return false;
  }
  /* تنظيف الخريطة قبل الحفظ: تُحذف القيم الفارغة والمطابقة للموحّد */
  function clean(needS, needN, shiftOpts){
    var out = {}, o = shiftOpts || [], b = num(needN); b = (b != null && b > 0) ? b : 0;
    for (var i = 0; i < o.length; i++){
      var nm = o[i].name || o[i];
      if (!needS || !Object.prototype.hasOwnProperty.call(needS, nm)) continue;
      var v = num(needS[nm]);
      if (v == null || v < 0) continue;
      if (v === b) continue;
      out[nm] = v;
    }
    return Object.keys(out).length ? out : null;
  }
  KIVO.BassamNeed = { of: of, tot: tot, has: has, custom: custom, clean: clean };
})();
