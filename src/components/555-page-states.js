/* ═ PageStates — حالاتُ الصفحة الموحَّدة (V7 UX · الدفعة ٢) ═
   مكوّنٌ واحد لأربع حالات في منطقة المحتوى، بهيكلٍ واحدٍ لكل الصفحات (صفُّ بطاقات مؤشرات + بطاقةُ محتوى فيها شريط أدوات وصفوف):
     loading     أول تحميل: الهيكلُ الواحد وامضاً — بلا نص ولا زر، ولا شيء إن انتهى التحميل قبل ٣٠٠ م.ث
     refreshing  تحديثُ صفحةٍ معروضة: خطٌّ ٣px متحرك + شارة «يُحدَّث من الخادم»؛ المحتوى (تملكه الصفحة) يبقى ظاهراً غير محجوب
     error       فشل التحميل: بطاقةٌ في وسط المحتوى بزرٍّ واحد «أعد المحاولة» — وتُعاد المحاولة تلقائياً عند حدث online
     empty       لا بيانات: بطاقةٌ هادئة؛ الأزرار لمن يمرّ فحصُه (الفحص نفسُه القائم في الصفحة يُمرَّر في can) + ملاحظات
     ready       المحتوى وصل: يُخلى المضيف ويدخل المحتوى بهدوء (enter)
   قاعدةُ الغلاف الواحدة (آخر الملف): عند كل دخولٍ إلى مسار — إن كان محتواه في ذاكرة الجلسة ظهر فوراً مع الخط والشارة حتى تنتهي
   إعادةُ القراءة، وإلا فرأسُ الصفحة (عنوانها في الشريط العلوي وتبويباتها) والهيكلُ الواحد تحته — لكل الصفحات بلا استثناء ولا شيفرة في الصفحة.
   الاستعمال: KIVO.PageStates.host(el, { state, name, retry, empty, region, auto, content }) — el عنصرٌ مضيف تضعه الصفحة،
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

  /* ── الهيكلُ الواحد: صفُّ بطاقات مؤشرات + بطاقةُ محتوى (‎--bg-card‎ · حدّ ‎--border-subtle‎ · ظل ‎--shadow-card‎ · ١٢px) فيها شريطُ أدوات وصفوفٌ وامضة ── */
  function fill(box, cls, n) { for (var i = 0; i < n; i++) box.appendChild(mk("i", "ps-bone " + cls)); return box; }
  function skeleton() {
    var box = mk("div", "ps-skel"), kpis = mk("div", "ps-kpis"), panel = mk("div", "ps-panel"); box.setAttribute("aria-hidden", "true");
    for (var i = 0; i < 4; i++) kpis.appendChild(fill(fill(mk("div", "ps-kpi"), "ps-b-num", 1), "ps-b-lbl", 1));
    panel.appendChild(fill(fill(mk("div", "ps-tools"), "ps-tool ps-tool-w", 1), "ps-tool", 2));
    panel.appendChild(fill(mk("div", "ps-rows"), "ps-row", 6));
    box.appendChild(kpis); box.appendChild(panel);
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
    return JSON.stringify([s.state, s.name, !!s.region, typeof s.retry === "function", e.icon, e.title, e.line,
      (e.actions || []).map(function (a) { return [a && a.label, !!a && allowed(a.can)]; }), (e.notes || []).map(function (n) { return [n && n.tone, n && n.text]; })]);
  }

  function draw(rec) {
    var el = rec.el, s = rec.spec, st = s.state;
    clearTimeout(rec.timer); rec.timer = 0; clear(el);
    el.classList.add("ps"); el.classList[s.region ? "add" : "remove"]("ps-region");      /* أصنافُ المضيف نفسِه (تملكها الصفحة) لا تُمسّ */
    attr(el, "data-ps", st); attr(el, "dir", "rtl");
    attr(el, "role", st === "loading" || st === "refreshing" ? "status" : null);
    attr(el, "aria-busy", st === "loading" || st === "refreshing" ? true : null);
    attr(el, "aria-label", st === "loading" ? STR.loading : null);
    attr(el, "aria-live", st === "loading" || st === "refreshing" ? "polite" : null);
    if (s.content && s.content.setAttribute) attr(s.content, "aria-busy", st === "refreshing" ? true : null);
    el.hidden = st === "ready";
    if (st === "loading") {
      rec.shown = false;
      /* لا شيء قبل ٣٠٠ م.ث: تحميلٌ ينتهي قبلها لا يومض بهيكل */
      rec.timer = setTimeout(function () { rec.timer = 0; if (rec.spec.state !== "loading") return; rec.shown = true; el.appendChild(skeleton()); }, DELAY);
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
    /* page: اسمُ مكوّن الصفحة — يُشتقّ منه الاسم (describe)، والمحتوى ما يلي المضيف */
    var d = spec.page != null ? describe(spec.page || "") : null;
    var s = { state: spec.state || "ready", name: spec.name || (d ? d.name : ""), retry: spec.retry, empty: spec.empty,
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

  /* ── الاسم من سجل الصفحات (manifests/pages.json عبر KIVO_MANIFEST) ── */
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
  /** وصفُ شاشة مكوّن صفحة: { name } — الاسم: تجاوزٌ مكتوب (NAMES)، وإلا اسم التبويب المفتوح، وإلا اسم الصفحة (pages.json).
      مكوّنٌ مضمَّن في حاوية (تبويب صفحة أخرى أو لوحة في «مؤشرات الإدارة») يُسمّى باسمه هو لا باسم الحاوية. */
  function describe(component, hash) {
    var mf = manifest(), r = route(hash), slug = mf.comps[component] || "", routeName = mf.routes[r.page] || "";
    var own = slug ? pick(mf.pages, function (p) { return p.module === slug; }) : null;
    var top = routeName ? pick(mf.pages, function (p) { return p.name === routeName; }) : null;
    var box = pick(mf.boxes, function (c) { return c.key === r.page; });
    var leaves = function (p) { return (p.subs || []).concat(p.tabs || []); };
    var name = "", leaf = null;
    if (own && (top && own !== top || box && slug !== r.page)) {            /* مضمَّن */
      if (box) {
        var refs = box.refs.filter(function (x) { return x === own.key || x.indexOf(own.key + "/") === 0; });
        var ref = pick(refs, function (x) { return x.split("/")[1] === r.tab; }) || (refs.length === 1 ? refs[0] : "");
        name = NAMES[r.page + "/" + ref] || (ref && box.names[ref]) || "";
      }
      name = name || NAMES[component] || own.name;
    } else {                                                                  /* شاشةُ المسار نفسها */
      var page = own && (!routeName || own.name === routeName) ? own : top;
      if (page && r.tab) leaf = pick(leaves(page), function (x) { return x.key === r.tab; });
      name = NAMES[r.page + (r.tab ? "/" + r.tab : "")] || (leaf ? leaf.name : NAMES[r.page]) || routeName || (page && page.name) || NAMES[component] || "";
    }
    return { name: name };
  }

  /* ── خطّافُ بوابة الغلاف: core يملك الخطّاف (KIVO.__dcStates) والمكوّن يسجّل نفسه فيه — core لا يشير إلى components (R1) ──
     يرسم داخل مكان الشاشة (‎.sc-placeholder‎): الهيكل لأول تحميل وبطاقة الفشل؛ الإعادةُ التلقائية عند online يملكها core (auto:false). */
  function gate(el, info) {
    if (!el) { setTimeout(sweep, 0); setTimeout(tick, 0); return; }                 /* فُصل مرجعٌ: إن غادر مكانُ الشاشة فعلاً دخل محتواها بهدوء */
    var d = describe(info.name || "");
    host(el, { name: d.name, state: info.failed ? "error" : info.idle ? "ready" : "loading", retry: info.retry, auto: false });
    var rec = find(el); if (rec && !rec.gate) rec.gate = el.closest ? el.closest(".sc-host") : null;
    watch(); tick();
  }
  function sweep() {
    live.slice().forEach(function (rec) {
      if (!rec.gate || rec.el.isConnected !== false) return;
      var shown = rec.shown, target = rec.gate;
      clearTimeout(rec.timer); live = live.filter(function (r) { return r !== rec; });
      if (shown && target.isConnected !== false) enter(target);
    });
  }

  /* ══ قاعدةُ الغلاف الواحدة للتنقّل (V7 UX) ══
     عند كل دخولٍ إلى مسار (تبدُّلُ مضيف الصفحة داخل ‎main‎، أو تغيّرُ العنوان داخل الصفحة نفسها) يُحجب رسمُ الصفحة الحيّ حتى تهدأ
     قراءتُها (بوابةُ الغلاف، أو طلبُ قراءةٍ من الخادم بدأ مع الدخول)، ويُرسم مكانَه في ‎.ps-shell‎:
       · محتوى المسار في ذاكرة الجلسة (العقدةُ التي غادرها المستخدم — ذاكرةُ JS وحدها، لا تخزين) ⇒ هو نفسُه فوراً، ومعه الخط والشارة ما دامت القراءة جارية؛
       · لا محتوى في الذاكرة ⇒ تبويباتُ الصفحة من سجل الصفحات، والهيكلُ الواحد تحتها.
     عنوانُ الصفحة يرسمه الغلاف في الشريط العلوي من أول لحظة. ثم تظهر الصفحة الحيّة (بدخولٍ هادئ إن سبقها هيكل).
     لا طلبَ يُضاف ولا يُعاد ترتيبه: المراقبةُ عدٌّ لطلبات القراءة الجارية وحده، والوعدُ يعود كما هو. طلباتُ المؤقِّتات (المزامنة وسحبُها /api/get · الحضور · الجرس ومراقبُه) لا تُعدّ.
     الغلافُ ينتقل على مرحلتين (يُفرغ المحتوى ثم يركّب الصفحة): الدخولُ يبدأ من لحظة الإفراغ نفسِها، فلا إطارَ فارغاً بين الصفحتين.
     صفحةٌ لا تقرأ شيئاً عند الدخول تظهر بعد مهلة الهدوء (QUIET) بلا هيكل. الفشلُ (بطاقةُ الفشل · انتهاء الجلسة) يكشف الصفحة فوراً. */
  var TIMER = /^\/api\/(?:changes|presence|notifications|get)\b|^\/api\/aud\?first=1/, QUIET = 100, LIMIT = 30000;
  var flights = [], seen = {}, who = "", cur = null, watched = null, observer = null;

  function mainEl() { return document.querySelector("main.bs-main"); }
  function routeHost(main) { for (var n = main && main.firstElementChild; n; n = n.nextElementSibling) if (n.classList.contains("sc-host")) return n; return null; }
  function shellOf(main) {
    for (var n = main.lastElementChild; n; n = n.previousElementSibling) if (n.classList.contains("ps-shell")) return n;
    var e = mk("div", "ps-shell"); main.appendChild(e); return e;
  }
  function actor() { try { var b = window.__BS_BOOT || {}, D = KIVO.BassamDepts; return String(b.uid || "") + "\0" + String(D && D.active ? D.active() : ""); } catch (e) { return ""; } }
  function hashNow() { return String((window.location && window.location.hash) || ""); }

  /** تبويباتُ مسارٍ من سجل الصفحات: [{ name, on }] — أوراقُ الصفحة غيرُ الخارجة عنها بترتيبها (وللحاوية مراجعُها)، لمن يملك عرضَها؛ أقلُّ من تبويبين = لا شريط. */
  function tabs(hash) {
    var mf = manifest(), r = route(hash), out = [], P = null, i;
    try { P = KIVO.BassamPerm || null; } catch (e) { P = null; }
    var can = function (page, leaf) { try { return leaf ? !P || !P.canSub || !!P.canSub(page, leaf, "view") : !P || !P.can || !!P.can(page, "view"); } catch (e) { return true; } };
    var box = pick(mf.boxes, function (c) { return c.nav === r.page; });
    if (box) {
      box.refs.forEach(function (ref) { var x = ref.split("/"), ok = true; try { ok = !P || !P.kpiPanelOk || !!P.kpiPanelOk(x[0], x[1] || ""); } catch (e) { ok = true; } if (ok) out.push({ name: box.names[ref], key: ref }); });
    } else {
      var page = pick(mf.pages, function (p) { return p.nav === r.page; }); if (!page) return [];
      var all = (page.subs || []).concat(page.tabs || []), order = page.seq || all.map(function (x) { return "leaf:" + x.key; });
      order.forEach(function (s) {
        var k = s.split(":")[1], leaf = pick(all, function (x) { return x.key === k; }), other = s.indexOf("page:") === 0 ? pick(mf.pages, function (p) { return p.key === k; }) : null;
        if (other) { if (can(other.key)) out.push({ name: other.name, key: other.nav }); }
        else if (leaf && !leaf.offPage && can(page.key, leaf.key)) out.push({ name: leaf.name, key: leaf.key });
      });
    }
    if (out.length < 2) return [];
    var hit = -1; for (i = 0; i < out.length; i++) if (out[i].key === r.tab) hit = i;
    return out.map(function (t, n) { return { name: t.name, on: n === (hit < 0 ? 0 : hit) }; });
  }
  function strip(list) {
    var wrap = mk("div", "ps-tabbox"), bar = mk("div", "bs-hbar bs-tabstrip ps-tabs"); wrap.setAttribute("aria-hidden", "true");
    list.forEach(function (t) { var b = mk("div", "ps-tab" + (t.on ? " is-on" : "")); b.appendChild(mk("div", "ps-tab-ico")); b.appendChild(mk("span", "", t.name)); bar.appendChild(b); });
    wrap.appendChild(bar); return wrap;
  }

  function reading() {
    if (!cur) return false;
    for (var i = 0; i < flights.length; i++) if (flights[i] >= cur.t0 - 50) return true;
    var h = cur.host; if (!h) return true;                       /* الغلافُ أفرغ المحتوى ولم يركّب الصفحة بعد */
    return !!(h.isConnected !== false && h.querySelector('.sc-ps[data-ps="loading"]'));
  }
  /* العقدةُ المغادَرة تبقى كما رُسمت: تُجمَّد (inert) وتُفصل مجموعاتُ أزرار الاختيار عن الصفحة الحيّة */
  function freeze(node) {
    try {
      node.classList.add("ps-snap"); node.setAttribute("inert", ""); node.setAttribute("aria-busy", "true"); node.classList.remove("ps-enter");
      var radios = node.querySelectorAll("input[type=radio][name]"); for (var i = 0; i < radios.length; i++) radios[i].name += "​";
    } catch (e) { /* عرضٌ فقط */ }
    return node;
  }
  /* نسخةٌ من الصفحة المعروضة حين يتغيّر العنوان والمضيفُ باقٍ (تبويبٌ آخر للصفحة نفسها): القيمُ المكتوبة ولوحاتُ الرسم تُنقل إلى النسخة */
  function copy(host) {
    var c = host.cloneNode(true), i;
    try {
      var a = host.querySelectorAll("canvas"), b = c.querySelectorAll("canvas");
      for (i = 0; i < a.length && i < b.length; i++) if (a[i].width && a[i].height) b[i].getContext("2d").drawImage(a[i], 0, 0);
      a = host.querySelectorAll("input,textarea,select"); b = c.querySelectorAll("input,textarea,select");
      for (i = 0; i < a.length && i < b.length; i++) { b[i].value = a[i].value; if ("checked" in a[i]) b[i].checked = a[i].checked; }
    } catch (e) { /* عرضٌ فقط */ }
    return c;
  }
  function keep(node) {
    if (!cur || !cur.done || !node || node.querySelector(".ps-fail,.sc-placeholder")) return;
    var rec = { snap: freeze(node) };
    seen[cur.last] = rec; if (cur.last === cur.norm) seen[cur.hash] = rec;
  }
  function clearShell(main) {
    var sh = main && shellOf(main); if (!sh) return;
    for (var i = live.length - 1; i >= 0; i--) if (live[i].shell) { clearTimeout(live[i].timer); live.splice(i, 1); }
    clear(sh);
  }
  function stop() { if (cur) { clearTimeout(cur.quiet); clearTimeout(cur.limit); clearTimeout(cur.poll); } }

  function begin(main, host, hash) {
    stop();
    var me = actor(); if (me !== who) { who = me; seen = {}; }
    var rec = seen[hash], snap = rec && rec.snap && rec.snap !== host ? rec.snap : null, sh = shellOf(main);
    clearShell(main);
    cur = { main: main, host: host, hash: hash, norm: hash, last: hash, t0: Date.now(), snap: snap, done: false, quiet: 0, limit: 0, bar: null, skel: null };
    main.setAttribute("data-ps-wait", snap ? "snap" : "skel");
    sh.setAttribute("dir", "rtl");
    if (snap) {
      cur.bar = mk("div", "ps-shell-bar"); sh.appendChild(cur.bar); sh.appendChild(snap);
    } else {
      var list = tabs(hash); if (list.length) sh.appendChild(strip(list));
      cur.skel = mk("div", ""); sh.appendChild(cur.skel);
      cur.ctl = host_(cur.skel, { state: "loading" });
    }
    cur.limit = setTimeout(function () { reveal(); }, LIMIT);
    tick();
  }
  function host_(el, spec) { var c = host(el, spec), rec = find(el); if (rec) rec.shell = true; return c; }
  function tick() {
    if (!cur || cur.done) return;
    if (reading()) {
      clearTimeout(cur.quiet); cur.quiet = 0;
      if (cur.bar && cur.host) host_(cur.bar, { state: "refreshing" });   /* الخط والشارة لقراءةٍ جارية فعلاً — لا لفاصل تركيب الصفحة */
      clearTimeout(cur.poll); cur.poll = setTimeout(tick, 200);      /* مكانُ شاشةٍ مضمَّنة يزول بلا حدث — يُعاد الفحص */
      return;
    }
    if (!cur.quiet) cur.quiet = setTimeout(function () { if (cur) cur.quiet = 0; if (reading()) tick(); else reveal(); }, QUIET);
  }
  function reveal() {
    if (!cur || cur.done) return;
    stop();
    var shown = !!(cur.ctl && cur.ctl.shown()), main = cur.main;
    if (!cur.host) { cur = null; clearShell(main); main.removeAttribute("data-ps-wait"); return; }
    cur.done = true; cur.norm = cur.last = hashNow();
    clearShell(main); main.removeAttribute("data-ps-wait");
    seen[cur.hash] = seen[cur.norm] = seen[cur.norm] && !seen[cur.norm].snap ? seen[cur.norm] : { snap: null };
    if (shown && cur.host && cur.host.isConnected !== false) enter(cur.host);
  }
  /* left: صفحةٌ غادرت للتوّ. إن خلا ‎main‎ من أي صفحة (المرحلةُ الأولى من تنقّل الغلاف) والعنوانُ مسارُ صفحة بدأ الدخول بلا مضيف، ويلتحق به المضيفُ حين يُركَّب */
  function sync(left) {
    var main = mainEl(); if (!main) return;
    var h = routeHost(main), n, bare = true;
    if (h) { if (cur && !cur.host && !cur.done) { cur.host = h; tick(); } else if (!cur || cur.host !== h) begin(main, h, hashNow()); return; }
    for (n = main.firstElementChild; n; n = n.nextElementSibling) if (n.tagName !== "H1" && !n.classList.contains("ps-shell")) bare = false;
    if (bare && cur && !cur.host && !cur.done) return;
    if (bare && left && manifest().routes[route(hashNow()).page]) { begin(main, null, hashNow()); return; }
    stop(); cur = null; if (main.hasAttribute("data-ps-wait")) { clearShell(main); main.removeAttribute("data-ps-wait"); }
  }
  function watch() {
    var main = mainEl(); if (!main || main === watched || typeof MutationObserver !== "function") { if (main && !cur) sync(false); return; }
    if (observer) observer.disconnect();
    watched = main; cur = null;
    observer = new MutationObserver(function (list) {
      var left = false;
      for (var i = 0; i < list.length; i++) for (var j = 0; j < list[i].removedNodes.length; j++) {
        var n = list[i].removedNodes[j];
        if (n.nodeType === 1) left = true;
        if (cur && n === cur.host) { keep(n); stop(); cur = null; }
      }
      sync(left);
    });
    observer.observe(main, { childList: true });
    sync(false);
  }
  if (typeof window.fetch === "function") {
    var plain = window.fetch;
    window.fetch = function (input, init) {
      var p = plain.apply(this, arguments);
      try {
        watch();
        var u = typeof input === "string" ? input : (input && input.url) || "", m = String((init && init.method) || (input && input.method) || "GET").toUpperCase();
        var path = u.replace(/^[a-z]+:\/\/[^/]+/i, "");
        if (m === "GET" && path.indexOf("/api/") === 0 && !TIMER.test(path)) {
          var t = Date.now(), end = function () { var i = flights.indexOf(t); if (i >= 0) flights.splice(i, 1); tick(); };
          flights.push(t); if (cur && cur.done) cur.last = hashNow();
          p.then(end, end); tick();
        }
      } catch (e) { /* عدٌّ فقط — الطلبُ يمضي كما هو */ }
      return p;
    };
  }
  /* العنوانُ تغيّر والمضيفُ قد يبقى (تبويبٌ آخر للصفحة نفسها بالعنوان): المعروضُ يُحفظ لمساره، ويبدأ دخولٌ جديد قبل أن ترسم الصفحة */
  window.addEventListener("hashchange", function () {
    watch();
    var main = mainEl(), h = main && routeHost(main), to = hashNow();
    if (!main || !cur || cur.host !== h || !cur.done || to === cur.last || route(to).page !== route(cur.last).page) return;
    seen[cur.last] = { snap: freeze(copy(h)) };
    begin(main, h, to);
  });
  /* العنوانُ الذي تكتبه الصفحةُ لتبويبها بلا حدث (replaceState): يُقرأ بعد كل نقرة */
  document.addEventListener("click", function () { watch(); setTimeout(function () { if (cur && cur.done && cur.host && cur.host.isConnected !== false) cur.last = hashNow(); }, 0); }, true);
  window.addEventListener("bs:session-gone", function () { seen = {}; reveal(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { watch(); }); else watch();
  var api = { host: host, enter: enter, describe: describe, tabs: tabs, STR: STR, NAMES: NAMES, DELAY: DELAY, QUIET: QUIET };
  KIVO.PageStates = api;
  KIVO.__dcStates = { draw: gate };
})();
