
/* ── الأشرطة الأفقية على الحاسوب ─────────────────────────────────────────────
   باللمس السحب مدعوم من المتصفّح. أما بالفأرة فلا وسيلة: شريط التمرير مخفيّ،
   والعجلة رأسية، وحاويات التمرير لا تُسحب بالفأرة.

   خطآن في المحاولة السابقة عولجا هنا:
     • كان user-select:none يُضبط بعد عتبة 4px — فالبكسلات الأولى تبدأ تحديد
       نصّ، وحين يبدأ لا يتوقّف. الآن يُضبط عند الضغط قبل أي حركة.
     • كان mousemove على المستند — ينقطع إن مرّ المؤشر فوق عنصر يبتلع الحدث
       أو خرج عن النافذة. الآن أحداث مؤشّر مع setPointerCapture: كل الحركة
       تصل إلى الشريط نفسه مهما مرّ فوقه. */
(function(){
  var SEL = ".bs-daystrip,.bs-mixlegend,.bs-mixtabs,.bs-tabstrip,.bs-cardgrid,.bs-hbar,.bs-hscroll,.bs-grid,.bs-cardrow,.bs-statscroll";
  var d = null;

  function scroller(node){
    var n = node && node.closest ? node.closest(SEL) : null;
    while (n) {
      if (n.scrollWidth - n.clientWidth > 4) return n;
      var par = n.parentElement;
      n = (par && par.closest) ? par.closest(SEL) : null;
    }
    return null;
  }

  document.addEventListener("pointerdown", function(e){
    if (e.pointerType === "touch") return;      // اللمس يسحب أصلاً بلا تدخّل
    if (e.button !== 0) return;
    var t = e.target;
    /* الحقول والأزرار تحتفظ بسلوكها: التحديد داخل حقل نصّ عملٌ مقصود */
    if (t && t.closest && t.closest("input,textarea,select,[contenteditable]")) return;
    /* اللوحات الطافية مثبّتة بالنافذة لا بالشريط: لولا هذا الاستثناء لالتقط
       الشريط سحبها فتحرّك هو بدل محتواها. */
    if (t && t.closest && t.closest(".bs-fly,.bs-pop,[data-bs-dd]")) return;
    var n = scroller(t);
    if (!n) return;
    d = { n: n, x: e.clientX, sl: n.scrollLeft, moved: false, id: e.pointerId };
    n.style.userSelect = "none";                // قبل أي حركة — لا بعد العتبة
    n.style.webkitUserSelect = "none";
    /* الأسر لا يقع هنا: setPointerCapture عند الضغط يحوّل هدف النقرة إلى العنصر
       الآسر بحكم المواصفة، فتصل نقرتك إلى الشريط لا إلى الكرت الذي ضغطته
       ويتعطّل كل زرّ داخل أي شريط. يقع بعد تجاوز العتبة — أي حين يصير سحباً
       لا نقرة. */
  }, true);

  document.addEventListener("pointermove", function(e){
    if (!d || e.pointerId !== d.id) return;
    var dx = e.clientX - d.x;
    if (!d.moved) {
      if (Math.abs(dx) < 4) return;             // عتبة تمنع ابتلاع النقرات القصيرة
      d.moved = true;
      d.n.style.cursor = "grabbing";
      // صار سحباً — الآن يُؤسر المؤشّر فلا تنقطع الحركة مهما مرّت فوق عنصر آخر
      try { d.n.setPointerCapture(d.id); } catch (_e) {}
    }
    d.n.scrollLeft = d.sl - dx;
    e.preventDefault();
  }, true);

  function end(e){
    if (!d) return;
    var o = d; d = null;
    if (o.moved) { try { o.n.releasePointerCapture(o.id); } catch (_e) {} }
    o.n.style.cursor = ""; o.n.style.userSelect = ""; o.n.style.webkitUserSelect = "";
    /* بعد سحب فعلي تُبتلع النقرة التالية — وإلا فُتح ما أفلتّ فوقه */
    if (o.moved) {
      var kill = function(ev){ ev.preventDefault(); ev.stopPropagation(); };
      document.addEventListener("click", kill, true);
      setTimeout(function(){ document.removeEventListener("click", kill, true); }, 0);
    }
  }
  document.addEventListener("pointerup", end, true);
  document.addEventListener("pointercancel", end, true);
  document.addEventListener("lostpointercapture", end, true);

  document.addEventListener("wheel", function(e){
    if (e.ctrlKey) return;
    /* العجلة فوق لوحة طافية تخصّ اللوحة — لا الشريط الذي تعلوه */
    if (e.target && e.target.closest && e.target.closest(".bs-fly,.bs-pop,[data-bs-dd]")) return;
    var n = scroller(e.target);
    if (!n) return;
    if (n.classList && n.classList.contains("bs-hscroll")) return;   /* الجداول: العجلة تُمرّر الصفحة رأسياً؛ والسحب باليد يحرّكها أفقياً */
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;   // عجلة أفقية أصلاً — تُترك
    n.scrollLeft += e.deltaY;
    e.preventDefault();
  }, { passive: false, capture: true });
})();
