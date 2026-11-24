
/* ═══ BassamLink: حالة الاتصال في القائمة الجانبية ═══
   set(state, extra): state = on | off | local · extra = نصّ صغير (عدد المتصلين، أو سبب الانقطاع)
   CORE-01: يظهر المؤشرُ عند الانقطاع وحده (230-link-indicator.css) · نصوصُه بلغةٍ عادية بلا مصطلحاتٍ تقنية ·
   ومراقبُ إعادة التركيب على القائمة الجانبية وحدها لا على الوثيقة كلها */
(function () {
  var st = { state: "local", extra: "", title: "" }, el = null;
  /* V7 · 53 (nosilent · REVIEW 26 ب1 — قرارُ المالك): حالتان فوق «متصل» وحده — «يُحفظ…» لحفظٍ ينتظر أكثرَ من 300 م.ث، و«حُفظ» لحظةً بعد إقرار
     المستودع ثم يختفي. الانقطاعُ والجلسةُ (off · local) تبقى كما هي وتعلو عليهما؛ وسببُ الإخفاق يقوله التوستُ الواحد — لا «حُفظ» بلا إقرار */
  var ov = "";
  var TXT = { on: "متصل", off: "انقطع الاتصال", local: "محلي", saving: "يُحفظ…", saved: "حُفظ" };
  var TIP = { on: "متصل — كل تعديل يُحفظ ويصل الفريق لحظياً",
              off: "لا اتصال — تُحفظ تعديلاتك عند العودة. أبقِ الصفحة مفتوحة",
              local: "يلزم الاتصال بالمنصة لقراءة بيانات العمل وحفظها",
              saving: "تعديلك في طريقه — لا تغلق الصفحة حتى يظهر «حُفظ»",
              saved: "وصل تعديلك وحُفظ" };
  function eff() { return st.state === "on" && ov ? ov : st.state; }
  function paint() {
    if (!el) return;
    var s9 = eff();
    el.setAttribute("data-st", s9);
    el.querySelector(".l").textContent = TXT[s9] || s9;
    el.querySelector(".x").textContent = ov && s9 === ov ? "" : st.extra || "";
    el.title = (ov && s9 === ov ? "" : st.title) || TIP[s9] || "";
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
    var b = netbar(), off = st.state === "off", s9 = eff();
    if (!off && (s9 === "saving" || s9 === "saved")) { clearTimeout(nbT); b.setAttribute("data-k", s9); b.querySelector(".i").textContent = s9 === "saved" ? "✓" : ""; b.querySelector(".t").textContent = TXT[s9]; b.querySelector(".s").textContent = ""; b.hidden = false; prevSt = st.state; return; }
    if (b.getAttribute("data-k") === "saving" || b.getAttribute("data-k") === "saved") { b.removeAttribute("data-k"); b.hidden = true; }
    if (off) { clearTimeout(nbT); b.setAttribute("data-k", "off"); b.querySelector(".i").textContent = "⚠"; b.querySelector(".t").textContent = "لا اتصال"; b.querySelector(".s").textContent = "تُحفظ تعديلاتك عند العودة — أبقِ الصفحة مفتوحة"; b.hidden = false; }
    else if (prevSt === "off" && st.state === "on") { b.setAttribute("data-k", "back"); b.querySelector(".i").textContent = "✓"; b.querySelector(".t").textContent = "عاد الاتصال"; b.querySelector(".s").textContent = "تحقق من تأكيد الحفظ قبل مغادرة الصفحة"; b.hidden = false; clearTimeout(nbT); nbT = setTimeout(function () { b.hidden = true; }, 4000); }
    else if (st.state !== "off" && b.getAttribute("data-k") === "off") { b.hidden = true; }
    prevSt = st.state;
  }
  KIVO.BassamLink = {
    set: function (state, extra, title) { st.state = state || st.state; st.extra = extra == null ? st.extra : extra; st.title = title || ""; paint(); try { netPaint(); } catch (eN) { /* اللافتةُ عرضٌ فقط — لا تُسقط تحديثَ المؤشر */ } },
    get: function () { return st.state; },
    view: function () { return eff(); },   /* ما يُعرض فعلاً (للاختبار): الحالةُ وفوقها «يُحفظ…/حُفظ» */
    repaint: paint
  };
  /* V7 · 53 (nosilent): مراقبُ الحفظ — يقرأ طبقةَ التخزين ولا يغيّرها. «حُفظ» لا يُقال إلا حين يُحلّ انتظارُ الإفراغ (flushAsync) بنجاحٍ
     بلا رفضٍ جديد — وهو الإقرارُ نفسُه الذي تنتظره رسائلُ النجاح (300 BassamAck). والانتظارُ يُسجَّل والطلبُ في الهواء وحده، فلا يُعجِّل إرسالاً
     ولا يتخطّى مهلةَ إعادةٍ مجدولة. الحفظُ «غيرُ المؤكَّد» أو المرفوض ليس «يُحفظ…» — قالت الطبقةُ سببَه، فيُخفى المؤشر */
  var sv = null, svT = null, BAD = { uncertain: 1, failed: 1, conflict: 1, denied: 1 };
  function setOv(v) { if (ov === v) return; ov = v; paint(); try { netPaint(); } catch (eN) { /* عرضٌ فقط */ } }
  function tick() {
    var S = KIVO.__BS_SRV, pend = false, den = 0;
    if (!S || typeof S.dirty !== "function") return;
    try {
      var os = S.operations && S.operations.status ? S.operations.status().state : "idle";
      pend = !BAD[os] && !!(S.dirty() || (S.inflight && S.inflight()));
      den = S.denied ? +S.denied() || 0 : 0;
    } catch (e) { return; }
    if (pend) {
      if (!sv) sv = { t0: Date.now(), d0: den, shown: false, ok: false, wait: false };
      if (!sv.shown && Date.now() - sv.t0 >= 300 && st.state === "on") { sv.shown = true; clearTimeout(svT); setOv("saving"); }
      if (!sv.wait && S.inflight && S.inflight() && S.flushAsync) {
        var me = sv; me.wait = true;
        Promise.resolve(S.flushAsync(60000)).then(function (ok) { me.wait = false; me.ok = ok === true && (S.denied ? +S.denied() || 0 : 0) === me.d0; }, function () { me.wait = false; me.ok = false; });
      }
      return;
    }
    if (!sv) return;
    var done = sv; sv = null;
    if (!done.shown) return;
    if (done.ok && den === done.d0) { setOv("saved"); clearTimeout(svT); svT = setTimeout(function () { if (ov === "saved") setOv(""); }, 1600); }
    else setOv("");
  }
  try { setInterval(tick, 120); } catch (e) { /* بلا مؤقّت: لا مؤشر */ }
})();
