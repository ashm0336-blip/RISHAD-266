
/* ══ توحيد سلوك القوائم المنسدلة — مانع القصّ داخل الحاويات ذات التمرير ═══════════
   القوائم المخصّصة تُفتح بموضع مطلق (absolute) داخل حاويات overflow (الجداول
   والبطاقات) فتُقصّ ولا يمكن اختيار عناصرها. هذا الحارس يرصد أي قائمة مفتوحة
   محبوسة داخل حاوية قاصّة، ويعيد تثبيتها بموضع ثابت (fixed) في مكانها المقصود
   نفسه فتفلت من القصّ، وتتبع زرّها عند التمرير، وتُنظَّف عند إغلاقها. حلٌّ واحد
   يوحّد سلوك كل القوائم في الموقع بلا تعديل كل قائمة على حدة. */
(function () {
  "use strict";
  var tracked = [], raf = 0;
  function clipAncestor(el) {
    for (var p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      var cs; try { cs = getComputedStyle(p); } catch (e) { return null; }
      if (/auto|scroll|hidden|clip/.test((cs.overflow || "") + (cs.overflowX || "") + (cs.overflowY || ""))) return p;
    }
    return null;
  }
  function isMenu(el) {
    if (!el || el.nodeType !== 1 || el.__declip) return false;
    /* القوائمُ المنسدلةُ تُموضَع بنمطٍ داخليّ: إن قال النمطُ الداخليُّ إنها ليست
       absolute فلا حاجةَ إلى getComputedStyle (الذي يُجبر إعادةَ حساب الأنماط) */
    var ist = el.style;
    if (ist && ist.position && ist.position !== "absolute") return false;
    if (ist && ist.position !== "absolute" && !ist.zIndex) return false;
    /* شريط الأفعال المرسى أسفل الكانفس ليس قائمة منسدلة: هو مطلق الموضع
       وz-index عالٍ وفيه أزرار، فكان الحارس يحسبه قائمةً ويثبّته تحت
       «زرّه» أي عند رأس الخريطة فوق شريط الأدوات. يُستثنى صراحةً. */
    if (el.hasAttribute && el.hasAttribute("data-dock")) return false;
    if (el.closest && el.closest("svg")) return false;
    var cs; try { cs = getComputedStyle(el); } catch (e) { return false; }
    if (cs.position !== "absolute") return false;
    var z = parseInt(cs.zIndex, 10); if (!(z >= 40)) return false;
    if (!el.querySelector('button,a,[role="button"],[onclick],input,label')) return false;
    return !!clipAncestor(el);
  }
  function place(t) {
    if (!t.menu.isConnected || !t.wrap.isConnected) return;
    var wr = t.wrap.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight;
    var left = wr.left + t.offX, top = wr.bottom + 5;
    if (left + t.w > vw - 8) left = vw - 8 - t.w; if (left < 8) left = 8;
    if (top + t.h > vh - 8) top = Math.max(8, wr.top - 5 - t.h);
    var m = t.menu.style;
    m.setProperty("position", "fixed", "important");
    m.setProperty("left", Math.round(left) + "px", "important");
    m.setProperty("top", Math.round(top) + "px", "important");
    m.setProperty("right", "auto", "important");
    m.setProperty("bottom", "auto", "important");
    m.setProperty("transform", "none", "important");
    m.setProperty("margin", "0", "important");
    m.setProperty("max-height", (vh - 16) + "px", "important");
    if (t.h > 40) m.setProperty("overflow-y", "auto", "important");
  }
  function declip(menu) {
    var wrap = menu.offsetParent || menu.parentElement; if (!wrap) return;
    var mr = menu.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
    var t = { menu: menu, wrap: wrap, offX: mr.left - wr.left, w: mr.width, h: mr.height };
    menu.__declip = true; tracked.push(t); place(t);
  }
  function scan(root) {
    try {
      if (root.nodeType !== 1 || (root.closest && root.closest("svg"))) return;
      if (isMenu(root)) declip(root);
      var kids = root.querySelectorAll ? root.querySelectorAll("div[style]") : [];
      for (var i = 0; i < kids.length && i < 400; i++) if (isMenu(kids[i])) declip(kids[i]);
    } catch (e) {}
  }
  function sweep() {
    raf = 0;
    for (var i = tracked.length - 1; i >= 0; i--) { if (!tracked[i].menu.isConnected) tracked.splice(i, 1); else place(tracked[i]); }
  }
  function onScroll() { if (!raf) raf = requestAnimationFrame(sweep); }
  try {
    /* كان الفحصُ يجري داخل الطفرة نفسِها — قبل أن يرسم المتصفحُ الحرفَ المكتوب.
       الآن تُجمَع العقدُ المضافة وتُفحص بعد الإطار التالي (بعد الرسم). */
    var pendNodes = [], pendT = 0;
    function flushScan() {
      pendT = 0;
      var ns = pendNodes; pendNodes = [];
      for (var i = 0; i < ns.length; i++) { if (ns[i].isConnected) scan(ns[i]); }
      for (var k = tracked.length - 1; k >= 0; k--) if (!tracked[k].menu.isConnected) tracked.splice(k, 1);
    }
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) { var a = muts[i].addedNodes; for (var j = 0; j < a.length; j++) if (a[j].nodeType === 1 && pendNodes.length < 600) pendNodes.push(a[j]); }
      if (!pendT) pendT = requestAnimationFrame(function () { setTimeout(function () { (KIVO.__bsAfterQuiet || function (f) { f(); })(flushScan); }, 0); });
    });
    var start = function () { try { mo.observe(document.body, { childList: true, subtree: true }); } catch (e) {} };
    if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
  } catch (e) {}
})();
