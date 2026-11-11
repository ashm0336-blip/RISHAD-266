
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
    var wr = t.wrap.getBoundingClientRect();
    var viewport = t.editable || t.site ? window.visualViewport : null;
    var x = viewport ? viewport.offsetLeft : 0, y = viewport ? viewport.offsetTop : 0;
    var right = x + (viewport ? viewport.width : window.innerWidth) - 8;
    var bottom = y + (viewport ? viewport.height : window.innerHeight) - 8;
    var left = wr.left + t.offX, top = wr.bottom + 5;
    var m = t.menu.style, width = t.w, height = t.h, maxHeight;
    if (t.site) {
      width = Math.min(width, Math.max(1, right - x - 8));
      m.setProperty("width", Math.floor(width) + "px");
      left = wr.right - width;
      var list = t.menu.querySelector(".bs-canvas-site-list");
      var listLimit = parseFloat(getComputedStyle(list).maxHeight);
      height = t.menu.offsetHeight - list.clientHeight + Math.min(list.scrollHeight, listLimit);
      var aboveEnd = Math.max(y + 8, Math.min(bottom, wr.top - 5));
      top = Math.max(y + 8, Math.min(bottom, top));
      var above = aboveEnd - y - 8, below = bottom - top;
      if (height > below && above > below) {
        maxHeight = Math.min(height, above);
        top = aboveEnd - maxHeight;
      } else {
        maxHeight = below;
      }
    }
    if (t.editable) {
      /* The on-screen keyboard can shrink and move the visible viewport while the layout viewport stays put. */
      width = Math.min(wr.width, Math.max(1, right - x - 8));
      m.setProperty("box-sizing", "border-box", "important");
      m.setProperty("width", Math.floor(width) + "px", "important");
      var naturalHeight = t.menu.scrollHeight + t.menu.offsetHeight - t.menu.clientHeight;
      height = Math.min(naturalHeight, Math.max(1, bottom - y - 8));
    }
    if (left + width > right) left = right - width;
    if (left < x + 8) left = x + 8;
    if (!t.site && top + height > bottom) top = Math.max(y + 8, wr.top - 5 - height);
    if (t.editable) top = Math.max(y + 8, Math.min(top, bottom - height));
    m.setProperty("position", "fixed", "important");
    m.setProperty("left", Math.round(left) + "px", "important");
    m.setProperty("top", Math.round(top) + "px", "important");
    m.setProperty("right", "auto", "important");
    m.setProperty("bottom", "auto", "important");
    m.setProperty("transform", "none", "important");
    m.setProperty("margin", "0", "important");
    m.setProperty("max-height", Math.floor(Math.max(1, t.site ? maxHeight : t.editable ? bottom - top : bottom - 8)) + "px", "important");
    if (t.site) m.setProperty("visibility", "visible");
    else if (t.editable || t.h > 40) m.setProperty("overflow-y", "auto", "important");
    var field = document.activeElement;
    if (t.editable && field && t.menu.contains(field) && /^(INPUT|TEXTAREA)$/.test(field.tagName)) {
      var box = t.menu.getBoundingClientRect(), fieldBox = field.getBoundingClientRect();
      var scrollTop = box.top + t.menu.clientTop;
      var scrollBottom = scrollTop + t.menu.clientHeight;
      if (fieldBox.bottom > scrollBottom) t.menu.scrollTop += fieldBox.bottom - scrollBottom;
      else if (fieldBox.top < scrollTop) t.menu.scrollTop -= scrollTop - fieldBox.top;
    }
  }
  function declip(menu) {
    var site = menu.hasAttribute("data-bs-site-menu");
    var wrap = (site ? menu.parentElement : menu.offsetParent || menu.parentElement); if (!wrap) return;
    var mr = menu.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
    var t = { menu: menu, wrap: wrap, offX: mr.left - wr.left, w: mr.width, h: mr.height,
      editable: menu.hasAttribute("data-bs-editable-menu"), site: site };
    menu.__declip = true; tracked.push(t); place(t);
  }
  function canPlace(el) {
    return (el.hasAttribute("data-bs-site-menu") && !el.__declip) || isMenu(el);
  }
  var headers = new Set();
  var headerResize = typeof ResizeObserver !== "undefined" ? new ResizeObserver(function (entries) {
    entries.forEach(function (entry) {
      var header = entry.target, workspace = header.closest(".bs-ws-row");
      if (!workspace) return;
      var top = header.getBoundingClientRect().bottom - workspace.getBoundingClientRect().top;
      workspace.style.setProperty("--bs-canvas-panel-top", Math.ceil(top) + "px");
    });
    onVisualViewport();
  }) : null;
  function watchHeader(header) {
    if (!headerResize || headers.has(header)) return;
    headers.add(header);
    headerResize.observe(header);
  }
  function scan(root) {
    try {
      if (root.nodeType !== 1 || (root.closest && root.closest("svg"))) return;
      if (canPlace(root)) declip(root);
      if (root.matches && root.matches(".bs-canvas-header")) watchHeader(root);
      var kids = root.querySelectorAll ? root.querySelectorAll("div[style],div[data-bs-site-menu]") : [];
      for (var i = 0; i < kids.length && i < 400; i++) if (canPlace(kids[i])) declip(kids[i]);
      if (headerResize && root.querySelectorAll) root.querySelectorAll(".bs-canvas-header").forEach(watchHeader);
    } catch (e) {}
  }
  function sweep() {
    raf = 0;
    for (var i = tracked.length - 1; i >= 0; i--) { if (!tracked[i].menu.isConnected) tracked.splice(i, 1); else place(tracked[i]); }
  }
  function onScroll() { if (!raf) raf = requestAnimationFrame(sweep); }
  function onVisualViewport() { if (tracked.some(function (t) { return t.editable || t.site; })) onScroll(); }
  try {
    /* كان الفحصُ يجري داخل الطفرة نفسِها — قبل أن يرسم المتصفحُ الحرفَ المكتوب.
       الآن تُجمَع العقدُ المضافة وتُفحص بعد الإطار التالي (بعد الرسم). */
    var pendNodes = [], pendT = 0;
    function flushScan() {
      pendT = 0;
      var ns = pendNodes; pendNodes = [];
      for (var i = 0; i < ns.length; i++) { if (ns[i].isConnected) scan(ns[i]); }
      for (var k = tracked.length - 1; k >= 0; k--) if (!tracked[k].menu.isConnected) tracked.splice(k, 1);
      headers.forEach(function (header) {
        if (header.isConnected) return;
        headerResize.unobserve(header);
        headers.delete(header);
      });
    }
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) { var a = muts[i].addedNodes; for (var j = 0; j < a.length; j++) if (a[j].nodeType === 1 && pendNodes.length < 600) pendNodes.push(a[j]); }
      if (!pendT) pendT = requestAnimationFrame(function () { setTimeout(function () { (KIVO.__bsAfterQuiet || function (f) { f(); })(flushScan); }, 0); });
    });
    var start = function () { try { mo.observe(document.body, { childList: true, subtree: true }); } catch (e) {} };
    if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", onVisualViewport);
      window.visualViewport.addEventListener("scroll", onVisualViewport);
    }
    document.addEventListener("focusin", function (ev) {
      if (ev.target.closest && ev.target.closest("[data-bs-editable-menu]")) onScroll();
    });
  } catch (e) {}
})();
