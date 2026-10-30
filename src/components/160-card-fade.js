/* تلاشي حواف صفوف الكروت: يظهر فقط حين تكون هناك كروت مخفية تلك الجهة —
   بطلب المستخدم. يعمل مع الاتجاهين ومع RTL بقياس الفائض يمنةً ويسرة.
   المراقبةُ تعالج حاوياتَ الطفرة وحدَها لا كلَّ حاويةٍ في الوثيقة. */
(function(){
  function upd(el){
    try{
      var ov = el.scrollWidth - el.clientWidth;
      if (ov <= 2){ el.removeAttribute("data-ov"); return; }
      var sl = el.scrollLeft;                 /* RTL في كروم: 0 عند اليمين، سالب كلما ذهبنا يساراً */
      var left = Math.abs(sl);                /* الفائض المخفي جهة اليسار */
      var right = ov - left;                  /* والباقي جهة اليمين */
      var atL = left <= 2, atR = right <= 2;
      el.setAttribute("data-ov", atL ? (atR ? "" : "r") : (atR ? "l" : "lr"));
      if (atL && atR) el.removeAttribute("data-ov");
    }catch(e){}
  }
  function all(){ var xs = document.querySelectorAll(".bs-statscroll"); for (var i=0;i<xs.length;i++) upd(xs[i]); }
  /* الحاوياتُ المتأثّرةُ بطفرة: الحاويةُ الحاضنةُ للعقدة المتغيّرة، وما أُضيف من حاوياتٍ تحتها */
  function scoped(roots){
    var seen = [];
    function add(x){ if (x && seen.indexOf(x) === -1) seen.push(x); }
    for (var r = 0; r < roots.length; r++) {
      var el = roots[r]; if (!el || el.nodeType !== 1 || !el.isConnected) continue;
      try {
        add(el.closest(".bs-statscroll"));
        var xs = el.querySelectorAll(".bs-statscroll"); for (var i = 0; i < xs.length; i++) add(xs[i]);
      } catch (e) {}
    }
    for (var k = 0; k < seen.length; k++) upd(seen[k]);
  }
  document.addEventListener("scroll", function(e){ var el = e.target; if (el && el.classList && el.classList.contains("bs-statscroll")) upd(el); }, true);
  window.addEventListener("resize", all);
  /* قراءةُ scrollWidth داخل الطفرة تُجبر تخطيطاً قبل الرسم — تُؤجَّل إلى ما بعده، وعلى المتأثّر وحده */
  var rafA = 0, pendRoots = [];
  var mo = new MutationObserver(function(muts){
    for (var i = 0; i < muts.length && pendRoots.length < 400; i++) pendRoots.push(muts[i].target);
    if (!rafA) rafA = requestAnimationFrame(function(){ setTimeout(function(){ KIVO.__bsAfterQuiet(function(){ rafA = 0; var rs = pendRoots; pendRoots = []; scoped(rs); }); }, 0); });
  });
  try { mo.observe(document.documentElement, { childList:true, subtree:true }); } catch(e){}
  KIVO.__bsTick.add(all, "geo");    /* هندسة: تحجيمٌ · نهايةُ حركة الشريط · تنقّل */
  if (document.readyState !== "loading") all(); else document.addEventListener("DOMContentLoaded", all);
})();