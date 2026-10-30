
/* ── التلميحات على شاشات اللمس ─────────────────────────────────────────────────
   الملف فيه نحو ١٩٢ زراً أيقونياً يشرحه title، وهو لا يظهر إطلاقاً بلا فأرة —
   فمستخدم اللمس يرى أيقونات صامتة. بدل تعديل ١٩٢ موضعاً، مستمع واحد على
   المستند: ضغطة مطوّلة على أي زر يحمل title تُظهر نصّه، ولا تُطلق نقرة الزر.
   يعمل على المؤشّرات الخشنة وحدها فلا يمسّ الحاسوب. */
(function(){
  try { if (!window.matchMedia || !window.matchMedia("(pointer: coarse)").matches) return; } catch (e) { return; }
  var HOLD = 480, MOVE = 10;
  var timer = null, el = null, sx = 0, sy = 0, shown = false, tip = null;

  function box(){
    if (tip) return tip;
    tip = document.createElement("div");
    tip.setAttribute("dir", "rtl");
    tip.style.cssText = "position:fixed;z-index:2147483600;max-width:76vw;padding:7px 11px;border-radius:10px;"
      + "background:var(--bg-a2323230p94);color:var(--fg-xffffff);font-family:'Cairo',sans-serif;font-size:12px;line-height:1.7;"
      + "box-shadow:var(--shadow-elevated);pointer-events:none;opacity:0;transition:opacity .12s";
    document.body.appendChild(tip);
    return tip;
  }
  function show(node, txt){
    var t = box(); t.textContent = txt; t.style.opacity = "0";
    var r = node.getBoundingClientRect();
    t.style.left = "-9999px"; t.style.top = "0px";
    var w = t.offsetWidth, h = t.offsetHeight;
    var x = Math.min(Math.max(6, r.left + r.width / 2 - w / 2), window.innerWidth - w - 6);
    var y = r.top - h - 8; if (y < 6) y = Math.min(r.bottom + 8, window.innerHeight - h - 6);
    t.style.left = Math.round(x) + "px"; t.style.top = Math.round(y) + "px"; t.style.opacity = "1";
    shown = true;
  }
  function hide(){ if (tip) tip.style.opacity = "0"; shown = false; }
  function clear(){ if (timer) { clearTimeout(timer); timer = null; } el = null; }

  document.addEventListener("pointerdown", function(e){
    /* الحلقات تحمل title على div لا button. المحدِّد على نصّ النمط لا يطابق —
       منظومة DC تعيد كتابته بمسافة بعد النقطتين — فنستعمل صنفاً موجوداً أصلاً. */
    var n = e.target && e.target.closest ? e.target.closest("button[title],[data-tip],.bs-tip-host[title]") : null;
    if (!n) return;
    // بعض الأزرار وظيفتها الضغط المطوّل نفسه (عدّادات القراءة) — لا تُختطف
    if (n.hasAttribute("data-hold") || (n.closest && n.closest("[data-hold]"))) return;
    var txt = n.getAttribute("title") || n.getAttribute("data-tip") || "";
    if (!txt.trim()) return;
    el = n; sx = e.clientX; sy = e.clientY;
    timer = setTimeout(function(){ if (el) show(el, txt); }, HOLD);
  }, true);

  document.addEventListener("pointermove", function(e){
    if (!el) return;
    if (Math.abs(e.clientX - sx) > MOVE || Math.abs(e.clientY - sy) > MOVE) { clear(); hide(); }
  }, true);

  ["pointerup", "pointercancel"].forEach(function(ev){
    document.addEventListener(ev, function(){
      clear();
      if (shown) { setTimeout(hide, 1400); }   // يبقى لحظةً بعد الرفع ليُقرأ
    }, true);
  });

  // الضغطة المطوّلة تشرح ولا تنفّذ — وإلا فتحت قائمةً أو حذفت شيئاً بلا قصد
  document.addEventListener("click", function(e){
    if (!shown) return;
    e.preventDefault(); e.stopPropagation();
  }, true);
})();
