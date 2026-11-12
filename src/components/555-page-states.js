/* ═ PageStates — حالاتُ الصفحة الموحَّدة (V7 UX · الدفعة ٢) ═
   مكوّنٌ واحد لأربع حالات في منطقة المحتوى، بثلاثة قوالب هيكل (table · map · cards):
     loading     أول تحميل: هيكلٌ وامض بشكل الصفحة القادمة — بلا نص ولا زر، ولا شيء إن انتهى التحميل قبل ٣٠٠ م.ث
     refreshing  تحديثُ صفحةٍ معروضة: خطٌّ ٣px متحرك + شارة «يُحدَّث من الخادم»؛ المحتوى (تملكه الصفحة) يبقى ظاهراً غير محجوب
     error       فشل التحميل: بطاقةٌ في وسط المحتوى بزرٍّ واحد «أعد المحاولة» — وتُعاد المحاولة تلقائياً عند حدث online
     empty       لا بيانات: بطاقةٌ هادئة؛ الأزرار لمن يمرّ فحصُه (الفحص نفسُه القائم في الصفحة يُمرَّر في can) + ملاحظات
     ready       المحتوى وصل: يُخلى المضيف ويدخل المحتوى بهدوء (enter)
   الاستعمال: KIVO.PageStates.host(el, { shape, state, name, retry, empty, region, auto, content }) — el عنصرٌ مضيف تضعه الصفحة،
   والنداءُ يتكرر مع كل رسمٍ بلا كلفة (لا يُعاد بناءُ DOM إلا إن تغيّر الوصف). region: الصيغةُ المصغّرة لقسمٍ داخل صفحة.
   لا تخزين: لا localStorage ولا sessionStorage ولا IndexedDB — المكوّن عرضٌ فقط، والمحتوى السابق تملكه الصفحة في ذاكرتها.
   النصوص كلها في جدولٍ واحد (STR) — لا آلية ترجمة في المستودع. الأنماط: src/styles/555-page-states.css. */
(function () {
  "use strict";
  var DELAY = 300, ENTER_MS = 900;
  var STR = {
    loading: "جارٍ التحميل",
    refreshing: "يُحدَّث من الخادم",
    failTitle: "تعذّر تحميل {name}",
    failName: "المحتوى",
    failLine: "لم يصل رد من الخادم. بياناتك المحفوظة لم تتأثر، وتُعاد المحاولة تلقائياً عند عودة الاتصال.",
    retry: "أعد المحاولة",
    emptyTitle: "لا توجد بيانات بعد"
  };
  var SHAPES = { table: 1, map: 1, cards: 1 };
  /* تجاوزاتُ الاسم في «تعذّر تحميل <الاسم>» حيث الاسمُ الآلي (اسم التبويب وإلا اسم الصفحة من pages.json) ركيك أو غامض —
     المفتاح: مسارُ الشاشة (route/tab) أو اسمُ مكوّن الصفحة. تُعرض على المالك قبل اعتمادها (V7_UX_Failure_Names). */
  var NAMES = {
    "award/new": "الترشيحات", "award/res": "نتائج الترشيحات", "award": "الترشيحات",
    "seized/records": "سجلات المضبوطات", "seized/dash": "مؤشرات المضبوطات", "seized": "سجلات المضبوطات",
    "irshad": "سجلات الاسترشاد", "irshad/records": "سجلات الاسترشاد",
    "employees": "بيانات الموظفين", "admin/import": "صفحة الاستيراد", "profile": "صفحتك",
    "dstats/haram": "إحصائيات المسجد الحرام", "dstats/nabawi": "إحصائيات المسجد النبوي"
  };
  var live = [];

  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function reduced() { try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; } }
  function attr(el, k, v) { if (v == null || v === false) el.removeAttribute(k); else el.setAttribute(k, v === true ? "true" : String(v)); }

  /* ── الهياكل: كتلُ ‎.bs-skel‎ القائمة (التدرّج ١٫٤ ث بمتغيرات السمة) مرتبةً بشكل الصفحة ── */
  function bones(n, cls) { var f = []; for (var i = 0; i < n; i++) f.push(mk("i", "bs-skel " + cls)); return f; }
  function skeleton(shape) {
    var box = mk("div", "ps-skel ps-skel-" + shape); box.setAttribute("aria-hidden", "true");
    function row(cls, parts) { var r = mk("div", cls); parts.forEach(function (p) { r.appendChild(p); }); box.appendChild(r); return r; }
    if (shape === "table") {
      row("ps-kpis", bones(4, "ps-kpi"));
      row("ps-tools", bones(1, "ps-tool ps-tool-w").concat(bones(2, "ps-tool")));
      row("ps-rows", bones(8, "ps-row"));
    } else if (shape === "map") {
      row("ps-tools", bones(1, "ps-tool ps-tool-w").concat(bones(2, "ps-tool")));
      var m = row("ps-mapwrap", bones(1, "ps-canvas")), side = mk("div", "ps-side");
      bones(5, "ps-line-s").forEach(function (b) { side.appendChild(b); }); m.appendChild(side);
    } else row("ps-cards", bones(6, "ps-cardbone"));
    return box;
  }
  function card(kind, title, line) {
    var c = mk("div", "ps-card ps-" + kind), ico = mk("span", "ps-ico");
    ico.setAttribute("aria-hidden", "true"); c.appendChild(ico);
    c.appendChild(mk("b", "ps-title", title));
    if (line) c.appendChild(mk("p", "ps-text", line));
    return c;
  }
  function allowed(can) { try { return (typeof can === "function" ? can() : can) === true; } catch (e) { return false; } }

  function signature(s) {
    var e = s.empty || {};
    return JSON.stringify([s.state, s.shape, s.name, !!s.region, typeof s.retry === "function", e.icon, e.title, e.line,
      (e.actions || []).map(function (a) { return [a && a.label, !!a && allowed(a.can)]; }), (e.notes || []).map(function (n) { return [n && n.tone, n && n.text]; })]);
  }

  function draw(rec) {
    var el = rec.el, s = rec.spec, st = s.state;
    clearTimeout(rec.timer); rec.timer = 0; clear(el);
    el.classList.add("ps"); el.classList[s.region ? "add" : "remove"]("ps-region");      /* أصنافُ المضيف نفسِه (تملكها الصفحة) لا تُمسّ */
    attr(el, "data-ps", st); attr(el, "data-ps-shape", st === "loading" ? s.shape : null); attr(el, "dir", "rtl");
    attr(el, "role", st === "loading" || st === "refreshing" ? "status" : null);
    attr(el, "aria-busy", st === "loading" || st === "refreshing" ? true : null);
    attr(el, "aria-label", st === "loading" ? STR.loading : null);
    attr(el, "aria-live", st === "loading" || st === "refreshing" ? "polite" : null);
    if (s.content && s.content.setAttribute) attr(s.content, "aria-busy", st === "refreshing" ? true : null);
    el.hidden = st === "ready";
    if (st === "loading") {
      rec.shown = false;
      /* لا شيء قبل ٣٠٠ م.ث: تحميلٌ ينتهي قبلها لا يومض بهيكل */
      rec.timer = setTimeout(function () { rec.timer = 0; if (rec.spec.state !== "loading") return; rec.shown = true; el.appendChild(skeleton(rec.spec.shape)); }, DELAY);
    } else if (st === "refreshing") {
      el.appendChild(mk("i", "ps-line"));
      el.appendChild(mk("span", "ps-badge", STR.refreshing));
    } else if (st === "error") {
      var c = card("fail", STR.failTitle.replace("{name}", s.name || STR.failName), STR.failLine);
      c.setAttribute("role", "alert");
      if (typeof s.retry === "function") {
        var b = mk("button", "ps-btn", STR.retry); b.type = "button";
        b.addEventListener("click", function () { retry(rec); });
        c.appendChild(b);
      }
      el.appendChild(c);
    } else if (st === "empty") {
      var e = s.empty || {}, k = card("empty", e.title || STR.emptyTitle, e.line || "");
      if (e.icon) k.firstChild.textContent = e.icon;
      (e.notes || []).slice(0, 4).forEach(function (n) { if (n && n.text) k.appendChild(mk("p", "ps-note ps-note-" + (n.tone === "warn" ? "warn" : "info"), n.text)); });
      /* الأزرار (حتى اثنين) تظهر لمن يمرّ فحصُه وحدَه — can هو الفحص القائم نفسُه تمرّره الصفحة */
      var acts = (e.actions || []).filter(function (a) { return a && a.label && typeof a.on === "function" && allowed(a.can); }).slice(0, 2);
      if (acts.length) {
        var bar = mk("div", "ps-acts");
        acts.forEach(function (a, i) { var x = mk("button", "ps-btn" + (i ? " ps-btn-2" : ""), a.label); x.type = "button"; x.addEventListener("click", function (ev) { a.on(ev); }); bar.appendChild(x); });
        k.appendChild(bar);
      }
      el.appendChild(k);
    }
  }
  function retry(rec) { var f = rec.spec.retry; if (rec.spec.state === "error" && typeof f === "function") { try { f(); } catch (e) { /* الإعادةُ تملكها الصفحة */ } } }

  function find(el) { for (var i = 0; i < live.length; i++) if (live[i].el === el) return live[i]; return null; }
  function prune() { live = live.filter(function (r) { if (r.el.isConnected !== false) return true; clearTimeout(r.timer); return false; }); }

  /** يرسم الحالة في المضيف (ويحدّثها عند كل نداء). يعيد متحكّماً صغيراً: { state(), shown(), release() }. */
  function host(el, spec) {
    if (!el || !spec) return null;
    /* page: اسمُ مكوّن الصفحة — يُشتقّ منه الاسمُ والقالب (describe)، والمحتوى ما يلي المضيف */
    var d = spec.page != null ? describe(spec.page || "") : null;
    var s = { shape: SHAPES[spec.shape] ? spec.shape : d ? d.shape : "cards", state: spec.state || "ready", name: spec.name || (d ? d.name : ""), retry: spec.retry, empty: spec.empty,
      region: !!spec.region, auto: spec.auto !== false, content: spec.content || (d ? "next" : null) };
    var rec = find(el);
    if (!rec) { prune(); rec = { el: el, spec: s, sig: "", timer: 0, shown: false }; live.push(rec); }
    var prev = rec.spec.state, wasShown = rec.shown, sig = signature(s);
    rec.spec = s;
    if (sig !== rec.sig) {
      rec.sig = sig; draw(rec);
      if (s.state === "ready") { rec.shown = false; if (prev === "loading" && wasShown) arrive(el, s.content); }
    }
    return { state: function () { return rec.spec.state; }, shown: function () { return rec.shown; }, release: function () { clearTimeout(rec.timer); live = live.filter(function (r) { return r !== rec; }); } };
  }

  /* content: عنصرُ المحتوى، أو "next" = كلُّ ما يلي المضيفَ من إخوته (المضيفُ يوضع قبل محتوى الصفحة) */
  function arrive(el, content) {
    if (content !== "next") { enter(content); return; }
    for (var n = el.nextElementSibling; n; n = n.nextElementSibling) enter(n);
  }
  /** الدخول الهادئ للمحتوى عند وصوله: عتامة + إزاحة ٨px (٠٫٤ ث) وتدرّج ٥٠ م.ث لأول عشرة صفوف — الصنفُ يُزال بعدها (لا transform باقٍ). */
  function enter(el) {
    if (!el || !el.classList || reduced()) return false;
    el.classList.add("ps-enter");
    setTimeout(function () { try { el.classList.remove("ps-enter"); } catch (e) { /* عرضٌ فقط */ } }, ENTER_MS);
    return true;
  }

  /* عودةُ الاتصال: كل مضيفٍ في حالة الفشل تُعاد محاولتُه مرةً واحدة (auto:false لمن يملك إعادتَه بنفسه — بوابةُ الغلاف) */
  window.addEventListener("online", function () {
    prune();
    live.slice().forEach(function (rec) { if (rec.spec.state === "error" && rec.spec.auto) retry(rec); });
  });

  /* ── الاسم والقالب من سجل الصفحات (manifests/pages.json عبر KIVO_MANIFEST) ── */
  var M = null;
  function manifest() {
    if (M) return M;
    try {
      var K = KIVO.KIVO_MANIFEST;
      M = { pages: K.clone("pages"), routes: K.clone("routeNames"), boxes: K.clone("containers"), comps: K.keys.indexOf("pageComponents") !== -1 ? K.clone("pageComponents") : {} };
    } catch (e) { return { pages: [], routes: {}, boxes: [], comps: {} }; }
    return M;
  }
  function route(hash) { var m = /^#?\/?([A-Za-z0-9]+)(?:\/([A-Za-z0-9]+))?/.exec(hash == null ? (window.location && window.location.hash) || "" : hash); return m ? { page: m[1], tab: m[2] || "" } : { page: "", tab: "" }; }
  function pick(list, test) { for (var i = 0; i < list.length; i++) if (test(list[i])) return list[i]; return null; }
  /** وصفُ شاشة مكوّن صفحة: { name, shape } — الاسم: تجاوزٌ مكتوب (NAMES)، وإلا اسم التبويب المفتوح، وإلا اسم الصفحة (pages.json).
      مكوّنٌ مضمَّن في حاوية (تبويب صفحة أخرى أو لوحة في «مؤشرات الإدارة») يُسمّى باسمه هو لا باسم الحاوية. */
  function describe(component, hash) {
    var mf = manifest(), r = route(hash), slug = mf.comps[component] || "", routeName = mf.routes[r.page] || "";
    var own = slug ? pick(mf.pages, function (p) { return p.module === slug; }) : null;
    var top = routeName ? pick(mf.pages, function (p) { return p.name === routeName; }) : null;
    var box = pick(mf.boxes, function (c) { return c.key === r.page; });
    var leaves = function (p) { return (p.subs || []).concat(p.tabs || []); };
    var name = "", shape = "", leaf = null;
    if (own && (top && own !== top || box && slug !== r.page)) {            /* مضمَّن */
      shape = own.skeleton;
      if (box) {
        var refs = box.refs.filter(function (x) { return x === own.key || x.indexOf(own.key + "/") === 0; });
        var ref = pick(refs, function (x) { return x.split("/")[1] === r.tab; }) || (refs.length === 1 ? refs[0] : "");
        name = NAMES[r.page + "/" + ref] || (ref && box.names[ref]) || ""; shape = "cards";
      }
      name = name || NAMES[component] || own.name;
    } else {                                                                  /* شاشةُ المسار نفسها */
      var page = own && (!routeName || own.name === routeName) ? own : top;
      if (page && r.tab) leaf = pick(leaves(page), function (x) { return x.key === r.tab; });
      shape = (leaf && leaf.skeleton) || (page && page.skeleton);
      name = NAMES[r.page + (r.tab ? "/" + r.tab : "")] || (leaf ? leaf.name : NAMES[r.page]) || routeName || (page && page.name) || NAMES[component] || "";
    }
    return { name: name, shape: SHAPES[shape] ? shape : "cards" };
  }

  /* ── خطّافُ بوابة الغلاف: core يملك الخطّاف (KIVO.__dcStates) والمكوّن يسجّل نفسه فيه — core لا يشير إلى components (R1) ──
     يرسم داخل مكان الشاشة (‎.sc-placeholder‎): الهيكل لأول تحميل وبطاقة الفشل؛ الإعادةُ التلقائية عند online يملكها core (auto:false). */
  function gate(el, info) {
    if (!el) { setTimeout(sweep, 0); return; }                 /* فُصل مرجعٌ: إن غادر مكانُ الشاشة فعلاً دخل محتواها بهدوء */
    var d = describe(info.name || "");
    host(el, { shape: d.shape, name: d.name, state: info.failed ? "error" : info.idle ? "ready" : "loading", retry: info.retry, auto: false });
    var rec = find(el); if (rec && !rec.gate) rec.gate = el.closest ? el.closest(".sc-host") : null;
  }
  function sweep() {
    live.slice().forEach(function (rec) {
      if (!rec.gate || rec.el.isConnected !== false) return;
      var shown = rec.shown, target = rec.gate;
      clearTimeout(rec.timer); live = live.filter(function (r) { return r !== rec; });
      if (shown && target.isConnected !== false) enter(target);
    });
  }

  var api = { host: host, enter: enter, describe: describe, STR: STR, NAMES: NAMES, SHAPES: Object.keys(SHAPES), DELAY: DELAY };
  KIVO.PageStates = api;
  KIVO.__dcStates = { draw: gate };
})();
