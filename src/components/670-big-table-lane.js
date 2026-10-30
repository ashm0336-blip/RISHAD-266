
/* ═══ ممرّ الجدول الكبير ═══
   الرأس اللاصق يلتصق بأقرب حاوية تمرير، فجُعل الجدول نفسه هو الممرّ. ولئلا
   يبقى نصف الممرّ تحت حافّة النافذة فتضطرّ الصفحة للنزول (فيغيب الرأس مع ما
   غاب)، يُقاس ما بقي من ارتفاع النافذة تحت رأس الممرّ ويُجعل سقفاً له. وبهذا
   ينتهي نزول الصفحة عند بلوغ الجدول، ويتولّى الجدول التمرير وحده. */
(function(){
  var raf = 0;
  function barBottom(){
    var h = 0;
    [".bs-demobar", "header.bs-topbar", ".bs-topbar"].forEach(function(sel){
      var el = null; try { el = document.querySelector(sel); } catch (e) { return; }
      if (!el) return;
      var cs = window.getComputedStyle(el);
      if (cs.position !== "fixed" || cs.display === "none" || cs.visibility === "hidden") return;
      var r = el.getBoundingClientRect();
      if (r.height > 4 && r.top <= 60) h = Math.max(h, r.bottom);
    });
    return Math.max(0, Math.round(h));
  }
  function fit(){
    raf = 0;
    try {
      var boxes = document.querySelectorAll(".bs-sthead");
      if (!boxes.length) return;
      var bar = barBottom();
      for (var i = 0; i < boxes.length; i++) {
        var el = boxes[i];
        if (!el.offsetParent) continue;
        /* ارتفاعٌ يجعل منتهى نزول الصفحة هو لحظة وصول رأس الممرّ إلى ما تحت
           الشريط العلويّ تماماً — فلا ينزلق الرأس خلفه ثم يختفي. لذا يُطرح
           أيضاً ما تحت الممرّ من محتوى (شريط الترقيم وذيل الصفحة). */
        var rect = el.getBoundingClientRect();
        var topDoc = rect.top + (window.pageYOffset || document.documentElement.scrollTop || 0);
        var docH = Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0);
        var below = Math.max(0, Math.round(docH - (topDoc + rect.height)));
        var h = Math.round(window.innerHeight - bar - below - 14);
        if (h < 300) h = 300;
        var cur = parseInt(el.style.maxHeight, 10) || 0;
        if (Math.abs(cur - h) > 2) el.style.maxHeight = h + "px";
      }
    } catch (e) {}
  }
  function ask(){ if (!raf) raf = requestAnimationFrame(fit); }
  window.addEventListener("scroll", ask, { passive: true });
  window.addEventListener("resize", ask);
  window.addEventListener("orientationchange", ask);
  document.addEventListener("DOMContentLoaded", ask);
  window.addEventListener("load", ask);
  KIVO.__bsTick.add(ask, "geo");
  /* ممرٌّ يظهر بعد إعادة رسم (تبويبٌ داخل صفحة) يُقاس عند ظهوره — مراقبةٌ على المضاف وحده */
  try { new MutationObserver(function(muts){ for (var i = 0; i < muts.length; i++) { var a = muts[i].addedNodes; for (var j = 0; j < a.length; j++) { var n = a[j]; if (n.nodeType !== 1) continue; if ((n.classList && n.classList.contains("bs-sthead")) || (n.querySelector && n.querySelector(".bs-sthead"))) { setTimeout(ask, 40); return; } } } }).observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}
  ask();
})();
