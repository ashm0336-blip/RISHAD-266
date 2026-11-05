
/* ═══ سلوك أشرطة البحث ═══
   زرّ مسحٍ داخل الحقل يظهر متى كُتب فيه شيء، ومفتاح Esc يمسح، ورسالةٌ صريحة
   حين لا يطابق البحث شيئاً بدل جدولٍ فارغ بلا تفسير. تُبنى بالحقن لأن قوالب
   الصفحات أربعةَ عشرَ شريطاً، وتنجو من إعادة الرسم لأن الرنتايم يرقّع ولا
   يستبدل — ومع ذلك تُراجَع دورياً فتُعاد إن أزيلت. */
(function(){
  var raf = 0;
  function isQ(el){
    try { return el && el.tagName === "INPUT" && /بحث|ابحث/.test(el.getAttribute("placeholder") || ""); }
    catch (e) { return false; }
  }
  function setVal(inp, v){
    try {
      var d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
      if (d && d.set) d.set.call(inp, v); else inp.value = v;
      inp.dispatchEvent(new Event("input", { bubbles: true }));
      inp.dispatchEvent(new Event("change", { bubbles: true }));
    } catch (e) {}
  }
  function inputsIn(root){
    var out = [];
    try {
      var all = (root || document).querySelectorAll("input");
      for (var i = 0; i < all.length; i++) if (isQ(all[i]) && all[i].offsetParent) out.push(all[i]);
    } catch (e) {}
    return out;
  }
  function sweep(){
    raf = 0;
    try {
      var qs = inputsIn(document), any = "";
      for (var i = 0; i < qs.length; i++) {
        var inp = qs[i], par = inp.parentElement;
        if (!par) continue;
        if (window.getComputedStyle(par).position === "static") par.style.position = "relative";
        var btn = par.querySelector(":scope > .bs-qclear");
        if (!btn) {
          btn = document.createElement("button");
          btn.type = "button";
          btn.className = "bs-qclear";
          btn.setAttribute("aria-label", "مسح البحث");
          btn.textContent = "✕";
          btn.addEventListener("click", function(ev){
            ev.preventDefault(); ev.stopPropagation();
            var f = this.parentElement ? this.parentElement.querySelector("input") : null;
            if (f) { setVal(f, ""); try { f.focus(); } catch (e) {} }
          });
          par.appendChild(btn);
        }
        /* الزرّ يسكن طرف الحقل الأيسر — فلا بدّ من حاشيةٍ تحته وإلا ركب النصَّ الطويل */
        try { if (!inp.dataset.qpad) { inp.dataset.qpad = "1"; if (parseFloat(window.getComputedStyle(inp).paddingLeft) < 34) inp.style.paddingLeft = "34px"; } } catch (e) {}
        var has = !!String(inp.value || "").trim();
        if (has) any = String(inp.value).trim();
        if (btn.classList.contains("on") !== has) btn.classList.toggle("on", has);
      }
      /* رسالة «لا نتائج» للجداول الكبيرة */
      var boxes = document.querySelectorAll(".bs-sthead");
      for (var j = 0; j < boxes.length; j++) {
        var box = boxes[j];
        var tb = box.querySelector("table.bs-rtable tbody");
        var note = box.querySelector(":scope > .bs-noqres");
        var empty = !!tb && tb.querySelectorAll("tr").length === 0;
        if (empty && any) {
          if (!note) {
            note = document.createElement("div");
            note.className = "bs-noqres";
            note.innerHTML = '<b></b><span>جرّب اسماً أقصر أو رقماً — البحث يقبل الاسم والرقم معاً</span>';
            var b2 = document.createElement("button");
            b2.type = "button";
            b2.textContent = "مسح البحث";
            b2.addEventListener("click", function(){
              var f = inputsIn(document).filter(function(x){ return String(x.value || "").trim(); })[0];
              if (f) { setVal(f, ""); try { f.focus(); } catch (e) {} }
            });
            note.appendChild(b2);
            box.appendChild(note);
          }
          var lbl = note.querySelector("b");
          var txt = "لا نتائج مطابقة لـ «" + any + "»";
          if (lbl && lbl.textContent !== txt) lbl.textContent = txt;
        } else if (note) {
          note.parentElement.removeChild(note);
        }
      }
    } catch (e) {}
  }
  /* ═══ ضبط اللوحات المنسدلة داخل الشاشة ═══
     الرنتايم يحوّل كل لوحةٍ منسدلة إلى position:fixed بموضعٍ محسوبٍ من مكان
     زرّها، ولا يقلبها إن لم يبقَ تحتها متّسع — فتنزل تحت حافّة النافذة ولا
     تُرى. هنا تُقاس بعد فتحها، فإن تجاوزت الحافّة رُفعت فوق زرّها. */
  function fitPops(){
    try {
      var els = document.querySelectorAll('[style*="position: fixed"]');
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        var st = el.getAttribute("style") || "";
        if (st.indexOf("inset:") === -1) continue;
        if (el.hasAttribute("data-dock")) continue;
        if (window.getComputedStyle(el).position !== "fixed") continue;
        if (el.classList.contains("bs-topbar")) continue;
        var r = el.getBoundingClientRect();
        if (!r.height || r.height > window.innerHeight * 0.9) continue;
        if (r.width > window.innerWidth * 0.95) continue;
        var top = r.top, left = r.left, moved = false;
        if (r.bottom > window.innerHeight - 6) { top = Math.max(6, window.innerHeight - r.height - 6); moved = true; }
        if (top < 6) { top = 6; moved = true; }
        if (r.right > window.innerWidth - 6) { left = Math.max(6, window.innerWidth - r.width - 6); moved = true; }
        if (left < 6) { left = 6; moved = true; }
        if (moved) el.style.setProperty("inset", Math.round(top) + "px auto auto " + Math.round(left) + "px", "important");
      }
    } catch (e) {}
  }
  /* ═══ إرساء أشرطة الأفعال أسفل الكانفس ═══
     الشريط مرسوم بموضعٍ مطلق أسفل الخريطة، والخريطة أطول من النافذة غالباً —
     فيقع الشريط تحت حافّة الشاشة ولا يُرى إلا بالتمرير. هنا يُرسى أسفل الجزء
     الظاهر من خريطته ووسطه أفقياً: يبقى في متناول اليد ما دامت الخريطة أمام
     العين، ويختفي إن غابت الخريطة كلياً فلا يطفو فوق محتوى لا يخصّه. */
  function fitDocks(){
    try {
      var ds = document.querySelectorAll("[data-dock]");
      for (var i = 0; i < ds.length; i++) {
        var el = ds[i], host = el.parentElement;
        if (!host) continue;
        var hr = host.getBoundingClientRect(), vh = window.innerHeight, vw = window.innerWidth;
        var st = el.style;
        if (!hr.width || hr.bottom < 56 || hr.top > vh - 56) { st.setProperty("visibility", "hidden", "important"); continue; }
        st.removeProperty("visibility");
        st.setProperty("position", "fixed", "important");
        st.setProperty("margin", "0", "important");
        st.setProperty("max-width", Math.max(140, Math.round(Math.min(hr.width, vw) - (el.getAttribute("data-dock") === "left" ? 82 : 24))) + "px", "important");
        var w = el.offsetWidth, h = el.offsetHeight;
        if (!w || !h) continue;
        var top = Math.min(hr.bottom, vh) - 14 - h;
        top = Math.min(Math.max(top, hr.top + 8), vh - h - 8);
        /* data-dock="left" يُرسي الشريط إلى حافّة الخريطة اليسرى بدل وسطها،
           فلا يزاحم شريط الأفعال المتوسّط عند اجتماعهما. */
        var side = el.getAttribute("data-dock");
        /* الحزام الأيسر يبدأ بعد عمود الشريط الطائر (عرضه ~44 + هامشه) فلا يعلوه */
        var left = (side === "left") ? (hr.left + 58) : (hr.left + (hr.width - w) / 2);
        if (left + w > vw - 8) left = vw - 8 - w;
        if (left < 8) left = 8;
        st.setProperty("inset", Math.round(top) + "px auto auto " + Math.round(left) + "px", "important");
        st.setProperty("right", "auto", "important");
        st.setProperty("bottom", "auto", "important");
      }
    } catch (e) {}
  }
  function ask(){ if (!raf) raf = requestAnimationFrame(function(){ sweep(); fitPops(); fitDocks(); }); }
  /* التمريرُ يحرّك اللوحاتَ الثابتةَ والمراسي وحدَها — لا مسحَ الحقول والجداول */
  var raf2 = 0;
  function askFixed(){ if (!raf2) raf2 = requestAnimationFrame(function(){ raf2 = 0; fitPops(); fitDocks(); }); }
  document.addEventListener("click", function(){ ask(); setTimeout(ask, 90); setTimeout(ask, 260); }, true);
  document.addEventListener("scroll", askFixed, true);
  document.addEventListener("input", function(ev){ if (isQ(ev.target)) ask(); }, true);
  /* حقلُ بحثٍ يظهر بعد إعادة رسم (صفحةٌ جديدة، تبويب) يُزيَّن عند ظهوره — بدل التمرّة الدورية */
  try { var pendQ = false; new MutationObserver(function(muts){ if (pendQ) return; for (var i = 0; i < muts.length; i++) { var a = muts[i].addedNodes; for (var j = 0; j < a.length; j++) { var n = a[j]; if (n.nodeType !== 1) continue; if (isQ(n) || (n.querySelector && n.querySelector("input"))) { pendQ = true; setTimeout(function(){ pendQ = false; ask(); }, 120); return; } } } }).observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}
  document.addEventListener("keydown", function(ev){
    if (ev.key !== "Escape" || !isQ(ev.target)) return;
    if (!String(ev.target.value || "")) return;
    ev.stopPropagation(); setVal(ev.target, "");
  }, true);
  window.addEventListener("resize", ask);
  document.addEventListener("DOMContentLoaded", ask);
  window.addEventListener("load", ask);
  KIVO.__bsTick.add(askFixed, "geo");
  KIVO.__bsTick.add(ask);
  ask();
})();
