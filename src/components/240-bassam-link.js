
/* ═══ BassamLink: حالة الاتصال في القائمة الجانبية ═══
   set(state, extra): state = on | off | local · extra = نصّ صغير (عدد المتصلين، أو سبب الانقطاع)
   CORE-01: يظهر المؤشرُ عند الانقطاع وحده (230-link-indicator.css) · نصوصُه بلغةٍ عادية بلا مصطلحاتٍ تقنية ·
   ومراقبُ إعادة التركيب على القائمة الجانبية وحدها لا على الوثيقة كلها */
(function () {
  var st = { state: "local", extra: "", title: "" }, el = null;
  var TXT = { on: "متصل", off: "انقطع الاتصال", local: "محلي" };
  var TIP = { on: "متصل — كل تعديل يُحفظ ويصل الفريق لحظياً",
              off: "لا اتصال — تُحفظ تعديلاتك عند العودة. أبقِ الصفحة مفتوحة",
              local: "يلزم الاتصال بالمنصة لقراءة بيانات العمل وحفظها" };
  function paint() {
    if (!el) return;
    el.setAttribute("data-st", st.state);
    el.querySelector(".l").textContent = TXT[st.state] || st.state;
    el.querySelector(".x").textContent = st.extra || "";
    el.title = st.title || TIP[st.state] || "";
    var sup = false; try { sup = !!(KIVO.BassamAuth && KIVO.BassamAuth.isSuper && KIVO.BassamAuth.isSuper()); } catch (e) {}
    el.setAttribute("data-go", sup && st.state !== "local" ? "1" : "0");
  }
  function mount() {
    var bar = document.querySelector("aside.bsb .s-togbar");
    if (!bar || (el && el.isConnected)) return;
    el = document.createElement("div");
    el.className = "bs-link"; el.setAttribute("dir", "rtl");
    el.innerHTML = '<span class="d"></span><span class="l"></span><span class="x"></span>';
    el.addEventListener("click", function () {
      if (el.getAttribute("data-go") !== "1") return;
      /* مدير النظام: إلى صفحة مدير النظام ← نظرة عامة */
      try { KIVO.__ADMIN_OPEN_TAB = "overview"; if (KIVO.BassamNav && KIVO.BassamNav.go) KIVO.BassamNav.go("sysadmin"); } catch (e) {}   /* CORE-01: بمساعد التنقّل لا بمطابقة نصّ التسمية */
    });
    bar.parentElement.insertBefore(el, bar);
    paint();
  }
  /* القائمةُ الجانبية يرسمها الإطار بعد التحميل وقد يعيد رسمها: تُراقَب الوثيقةُ حتى يُركَّب المؤشر، ثم القائمةُ وحدها
     (ومكانُها في أبيها) — وإن زال المؤشرُ مع قائمةٍ أُعيد رسمها عادت المراقبةُ الواسعة حتى يُركَّب من جديد */
  var wide = null, near = null;
  function watch() {
    if (!el || !el.isConnected) mount();
    try {
      var side = el && el.isConnected ? el.closest("aside.bsb") : null;
      if (side) {
        if (wide) { wide.disconnect(); wide = null; }
        if (!near) near = new MutationObserver(watch);
        near.disconnect(); near.observe(side, { childList: true, subtree: true }); if (side.parentNode) near.observe(side.parentNode, { childList: true });
      } else if (!wide) {
        if (near) near.disconnect();
        wide = new MutationObserver(watch); wide.observe(document.documentElement, { childList: true, subtree: true });
      }
    } catch (e) {}
  }
  watch();
  document.addEventListener("DOMContentLoaded", watch);
  /* KIVO_254 · SOT-157 (البند ١ من RM-3 المعتمد): لافتةُ الجوال — حيث القائمةُ مطوية فلا يُرى المؤشر. تظهر لحظةَ الانقطاع
     توضّح أن التعديلات غير مؤكدة الحفظ وتتحوّل عند العودة إلى بيان الاتصال
     يختفي بعد ٤ ثوانٍ. لا تُعطَّل الأزرار. role=status/aria-live لقارئ الشاشة. تُعرض بالـCSS على الشاشات ≤ 1024px فقط (.bs-netbar). */
  var nb = null, nbT = null, prevSt = null;
  function netbar() {
    if (!nb || !nb.isConnected) {
      nb = document.createElement("div"); nb.className = "bs-netbar"; nb.setAttribute("role", "status"); nb.setAttribute("aria-live", "polite"); nb.setAttribute("dir", "rtl"); nb.hidden = true;
      nb.innerHTML = '<span class="i" aria-hidden="true"></span><span class="t"></span><span class="s"></span>';
      (document.body || document.documentElement).appendChild(nb);
    }
    return nb;
  }
  function netPaint() {
    var b = netbar(), off = st.state === "off";
    if (off) { clearTimeout(nbT); b.setAttribute("data-k", "off"); b.querySelector(".i").textContent = "⚠"; b.querySelector(".t").textContent = "لا اتصال"; b.querySelector(".s").textContent = "تُحفظ تعديلاتك عند العودة — أبقِ الصفحة مفتوحة"; b.hidden = false; }
    else if (prevSt === "off" && st.state === "on") { b.setAttribute("data-k", "back"); b.querySelector(".i").textContent = "✓"; b.querySelector(".t").textContent = "عاد الاتصال"; b.querySelector(".s").textContent = "تحقق من تأكيد الحفظ قبل مغادرة الصفحة"; b.hidden = false; clearTimeout(nbT); nbT = setTimeout(function () { b.hidden = true; }, 4000); }
    else if (st.state !== "off" && b.getAttribute("data-k") === "off") { b.hidden = true; }
    prevSt = st.state;
  }
  KIVO.BassamLink = {
    set: function (state, extra, title) { st.state = state || st.state; st.extra = extra == null ? st.extra : extra; st.title = title || ""; paint(); try { netPaint(); } catch (eN) { /* اللافتةُ عرضٌ فقط — لا تُسقط تحديثَ المؤشر */ } },
    get: function () { return st.state; },
    repaint: paint
  };
})();
