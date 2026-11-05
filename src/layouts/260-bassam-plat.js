
/* ═══ BassamPlat: إعدادات المنصة وتطبيقها الحي ═══
   المخزن: bassam_platform_v1 (عام؛ يكتبه مدير النظام وحده ويقرؤه الجميع، ويُحقن للزائر جزؤه العام في __BS_BOOT.brand) */
(function () {
  var K = "bassam_platform_v1";
  var RAWget = Storage.prototype.getItem, RAWset = Storage.prototype.setItem;
  var DEF = {
    name: "المنصة التشغيلية", short: "المنصة", org: "", logo: "", themeDef: "light",
    login: { rights: "جميع الحقوق محفوظة © {م}", title: "", desc: "منظومة رقمية متكاملة تجمع إدارات الحرم المكي الشريف في مكان واحد — كل إدارة ببياناتها وصلاحياتها المستقلة، بدخول موحد واحد.", footer: "AL HARAMAIN", legal: "", sub: "سجّل دخولك للمتابعة إلى لوحة التحكم", state: "منصة مؤسَّسة — الدخول بالحسابات المسجّلة فيها", helpStaff: "موظف أو مدير إدارة؟ تواصل مع مدير إدارتك — يعيد تعيين كلمة مرورك من شاشته في ثوانٍ.", helpNoKey: "لم يُنشأ مفتاح استعادة لهذه المنصة بعد — يُنشأ من مدير النظام ← المنصة ← التهيئة والاستعادة.", showVer: true, remember: true, help: true },
    app: { name: "", statusBar: "light", install: true },
    side: { order: ["kpis", "emps", "planning", "daily", "irshad", "seized", "award"], hidden: [], ver: true, help: true, links: true },
    links: [],   /* «مواقع ذات صلة»: [{ t: العنوان, u: الرابط, d: الوصف }] يحرّرها مدير النظام من الصفحة نفسها */
    top: { theme: true, crumb: "full" },
    print: { l1: "", l2: "", l3: "", logoPos: "right", footer: "", date: true, who: true, paper: "" },
    mods: { off: [] },
    about: { license: "", licType: "", support: "", phone: "", msg: "", whatsnew: "", guides: [{ t: "دليل مدير النظام", u: "" }, { t: "دليل مدير الإدارة", u: "" }, { t: "دليل الموظف", u: "" }, { t: "دليل التشغيل والرفع", u: "" }] }
  };
  /* ترتيب روابط القائمة: كل رابطٍ في المجموعة الأولى يحمل مفتاحَه (data-key في القالب) والتنسيقُ يُكتب به —
     فلا يزيح رابطٌ جديدٌ غيرَه، ورابطٌ بلا مفتاحٍ هنا يبقى في موضعه من القالب. */
  var NAVKEYS = KIVO.KIVO_MANIFEST.clone('navOrder');   /* KIVO_247 · AUD-015: من manifests/pages.json */
  var NAVNAMES = KIVO.KIVO_MANIFEST.clone('navNames');
  var STATUS = { light: "#F7F6F2", dark: "#25343F", gold: "#b99751" };
  function isObj(x) { return !!x && typeof x === "object" && !Array.isArray(x); }
  function merge(d, v) { var o = {}; Object.keys(d).forEach(function (k) { o[k] = isObj(d[k]) ? merge(d[k], isObj(v && v[k]) ? v[k] : {}) : (v && v[k] != null ? v[k] : d[k]); }); if (v) Object.keys(v).forEach(function (k) { if (!(k in o)) o[k] = v[k]; }); return o; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  var cache = null, cacheRaw = undefined;
  function raw() {
    var v = null;
    try { v = localStorage.getItem(K); } catch (e) { v = null; }
    if (v == null) { try { var B = window.__BS_BOOT; if (B && B.brand) v = JSON.stringify(B.brand); } catch (e2) {} }
    return v;
  }
  function get() {
    var r = raw();
    if (r === cacheRaw && cache) return cache;
    var o = null; try { o = r ? JSON.parse(r) : null; } catch (e) { o = null; }
    cache = merge(DEF, isObj(o) ? o : {}); cacheRaw = r; return cache;
  }
  function set(next) {
    var sup = false; try { sup = !!(KIVO.BassamAuth && KIVO.BassamAuth.isSuper && KIVO.BassamAuth.isSuper()); } catch (e) {}
    if (!sup) return { ok: false, err: "إعدادات المنصة لمدير النظام وحده" };
    try { localStorage.setItem(K, JSON.stringify(merge(DEF, next || {}))); } catch (e) { return { ok: false, err: "تعذّر الحفظ" }; }
    cache = null; apply(); return { ok: true };
  }
  function ver() { return KIVO.__BS_VER || ""; }
  function svg(p, sz) { return '<svg width="' + (sz || 16) + '" height="' + (sz || 16) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + p + "</svg>"; }
  var I_HELP = '<circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><path d="M12 17h.01"></path>';
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  /* ── التطبيق الحي ── */
  var styleEl = null, lastSig = "";
  function apply() {
    var P = get(), H = document.documentElement;
    var sig = JSON.stringify(P);
    /* العنوان والبيانات الوصفية */
    try { if (document.title !== P.name) document.title = P.name; } catch (e) {}
    var appName = P.app.name || P.name;
    ["application-name", "apple-mobile-web-app-title"].forEach(function (n) { var m = document.querySelector('meta[name="' + n + '"]'); if (m && m.getAttribute("content") !== appName) m.setAttribute("content", appName); });
    var tc = (H.getAttribute("data-theme") === "dark") ? KIVO.__bsThemeColorDark : (STATUS[P.app.statusBar] || STATUS.light); document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) { if (m.getAttribute("content") !== tc) m.setAttribute("content", tc); });
    /* الأصناف على الجذر */
    H.classList.toggle("bs-plat-logo", !!P.logo);
    H.classList.toggle("bs-plat-nover", !P.side.ver);
    H.classList.toggle("bs-plat-nolinks", !P.side.links);
    H.classList.toggle("bs-plat-notheme", !P.top.theme);
    H.classList.toggle("bs-plat-crumb-page", P.top.crumb === "page");
    H.classList.toggle("bs-plat-crumb-none", P.top.crumb === "none");
    /* ترتيب القائمة وإخفاؤها — أنماط مولَّدة */
    if (sig !== lastSig) {
      var css = "";
      var order = (P.side.order || []).filter(function (k) { return NAVKEYS.indexOf(k) >= 0; }); NAVKEYS.forEach(function (k, i) { if (order.indexOf(k) >= 0) return; var prev = i > 0 ? order.indexOf(NAVKEYS[i - 1]) : -1; order.splice(prev + 1, 0, k); });   /* رابط جديد لم يُرتَّب بعد يقف خلف سابقه في القالب لا في الذيل */
      NAVKEYS.forEach(function (k) { var pos = order.indexOf(k); var hide = (P.side.hidden || []).indexOf(k) >= 0 || (P.mods.off || []).indexOf(k) >= 0; css += 'aside.bsb .s-nav .grp > a[data-key="' + k + '"]{order:' + pos + (hide ? ";display:none!important" : "") + "}\n"; });   /* CORE-01: بمفتاح الرابط (data-key) لا بموضعه في القالب */
      if (P.print.paper) css += "@media print{@page{size:" + ({ a4p: "A4 portrait", a4l: "A4 landscape", a3l: "A3 landscape" }[P.print.paper] || "auto") + "}}\n";
      if (!styleEl) { styleEl = document.createElement("style"); styleEl.id = "bs-plat-css"; (document.head || document.documentElement).appendChild(styleEl); }
      styleEl.textContent = css;
      /* أيقونات الجوال والمتصفح من شعار المنصة إن رُفع. بيانُ التثبيت ملفٌّ ثابتٌ من الأصل نفسه (/manifest.webmanifest — KIVO_242):
         كانت إعادةُ كتابته هنا رابطَ data: تُحجب بسياسة المحتوى (manifest-src ← default-src 'self') في كل تحميل، فلا يُقرأ بيانٌ أصلاً. */
      try {
        if (P.logo) { var at = document.querySelector('link[rel="apple-touch-icon"]'); if (at) at.setAttribute("href", P.logo); document.querySelectorAll('link[rel="icon"]').forEach(function (ic) { ic.setAttribute("href", P.logo); }); }
      } catch (e) {}
      lastSig = sig;
    }
    /* القائمة الجانبية: الاسم والشعار وزر المساعدة */
    var aside = document.querySelector("aside.bsb");
    if (aside) {
      var co = aside.querySelector(".s-txt .s-co"); if (co && co.textContent !== P.name) co.textContent = P.name;
      var mk = aside.querySelector(".s-mark"); if (mk) { if (mk.getAttribute("title") !== P.name) mk.setAttribute("title", P.name); var im = mk.querySelector("img.bs-plat-img"); if (P.logo) { if (!im) { im = document.createElement("img"); im.className = "bs-plat-img"; im.alt = ""; mk.appendChild(im); } if (im.getAttribute("src") !== P.logo) im.src = P.logo; } else if (im) im.remove(); }
      var nav = aside.querySelector(".s-nav"), hg = nav && nav.querySelector(".bs-plat-helpgrp");
      /* «المساعدة» صفحة في سجل الصلاحيات: تظهر لمن له عرضها (مدير النظام دائماً) وإعداد المنصة يطفئها للجميع */
      var helpOk = false; try { var PM9 = KIVO.BassamPerm; helpOk = !PM9 || !PM9.can || (KIVO.BassamAuth && KIVO.BassamAuth.isSuper && KIVO.BassamAuth.isSuper()) || PM9.can('help', 'view'); } catch (e9) { helpOk = true; }
      /* KIVO_254 (AUD-020 · لوحة المفاتيح): رابطُ «المساعدة» <a> بلا href كروابط التنقّل — role="link" وtabindex="0" يدخلانه ترتيبَ Tab ويُفتح بـEnter (المُحسِّن 660) */
      if (nav && P.side.help && helpOk && !hg) { hg = document.createElement("div"); hg.className = "grp bs-plat-helpgrp"; hg.innerHTML = '<a class="n bs-plat-help" role="link" tabindex="0" title="حول المنصة والأدلة"><span class="ni">' + svg(I_HELP) + '</span><span class="nlbl">المساعدة</span></a>'; hg.querySelector("a").addEventListener("click", function (ev) { ev.preventDefault(); openAbout(); }); hg.style.marginTop = "0";
        /* «المساعدة» تلي «مواقع ذات صلة» مباشرة — مجموعة المراجع — لا آخر القائمة بعد «الإعدادات»؛ وتبقى مجموعةً مستقلة كي لا تختفي معها حين تُطفأ المواقع */
        var lg = nav.querySelectorAll(":scope > .grp")[1]; if (lg && lg.nextSibling) nav.insertBefore(hg, lg.nextSibling); else nav.appendChild(hg); }
      else if (hg && (!P.side.help || !helpOk)) hg.remove();
    }
    /* المظهر الافتراضي لمن لم يختر بعد */
    try { if (RAWget.call(localStorage, "bassam_theme") == null && P.themeDef !== "light") { var want = P.themeDef === "dark" ? "dark" : (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); if (want === "dark") { RAWset.call(localStorage, "bassam_theme", "dark"); if (KIVO.__bsThemeSet) KIVO.__bsThemeSet("dark"); else H.setAttribute("data-theme", "dark"); } } } catch (e) {}
  }
  /* سنة الحقوق تُحسب من التاريخ لا تُكتب — فلا تتقادم */
  function yearG() { return String(new Date().getFullYear()); }
  function yearH() { try { var y = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { year: "numeric" }).format(new Date()); var m = /\d{4}/.exec(y); return m ? m[0] : ""; } catch (e) { return ""; } }
  function rightsText(P) { var t = (P.login && typeof P.login.rights === "string") ? P.login.rights : DEF.login.rights; return String(t || "").replace(/\{م\}/g, yearG()).replace(/\{هـ\}/g, yearH() + " هـ").replace(/\{H\}/gi, yearH()).replace(/\{Y\}/gi, yearG()).trim(); }
  /* ── شاشة الدخول ── */
  var previewOverride = null, gateEl = null, gateEmblem = {};
  var IS_PREVIEW = false; try { IS_PREVIEW = /[?&]bsPreview=login\b/.test(location.search); } catch (e) {}
  function gateApply(w, P) {
    var t = w.querySelector(".login-hero-title"); if (t) t.textContent = P.login.title || P.name;
    var co = w.querySelector(".login-form") ? w.querySelector(".login-co") : null; if (co && !w.querySelector("#bsPw1")) co.textContent = P.name;   /* عنوان بطاقة الدخول (لا شاشة تأمين الحساب) */
    var sb = w.querySelector(".login-sub"); if (sb && !w.querySelector("#bsPw1")) { sb.textContent = P.login.sub || ""; sb.style.display = P.login.sub ? "" : "none"; }
    var stl = w.querySelector("#bsSrvState"); if (stl && !stl.dataset.fresh) { stl.textContent = P.login.state || ""; stl.style.display = P.login.state ? "" : "none"; }
    var hs = w.querySelector("#bsGateHelpStaff"); if (hs) { hs.innerHTML = "<b>" + esc(P.login.helpStaff || "").replace(/؟/, "؟</b>") + (P.about.support ? " الدعم الفني: " + esc(P.about.support) + (P.about.phone ? " · " + esc(P.about.phone) : "") : ""); hs.style.display = P.login.helpStaff || P.about.support ? "" : "none"; }
    var hn = w.querySelector("#bsGateHelpNoKey"); if (hn) { hn.textContent = P.login.helpNoKey || ""; hn.style.display = P.login.helpNoKey ? "" : "none"; }
    var d = w.querySelector(".login-hero-desc"); if (d) d.textContent = P.login.desc || "";
    var dv = w.querySelector(".login-hero-divider span"); if (dv) { dv.textContent = P.login.footer || ""; dv.parentElement.style.display = P.login.footer ? "" : "none"; }
    /* نصّ الحقوق واحد للموضعين ويُدار من مدير النظام — والسنة رمزٌ يُحسب تلقائياً: {م} ميلادية · {هـ} هجرية */
    var rights = rightsText(P);
    var hf = w.querySelector(".login-hero-foot"); if (hf) { hf.textContent = (P.org ? P.org + " · " : "") + rights; hf.style.display = rights ? "" : "none"; }
    var ft = w.querySelector(".login-pane-foot"); if (ft) { var vs = ft.querySelector("#bsVer"); ft.childNodes.forEach(function (n) { if (n.nodeType === 3) n.textContent = P.name + (rights ? " · " + rights : "") + " "; }); if (vs) vs.style.display = P.login.showVer ? "" : "none"; }
    w.querySelectorAll(".login-hero-emblem, .login-pane-emblem").forEach(function (e, i) { if (gateEmblem[i] == null) gateEmblem[i] = e.innerHTML; e.innerHTML = P.logo ? '<img src="' + esc(P.logo) + '" alt="" style="width:72px;height:72px;object-fit:contain;border-radius:16px">' : gateEmblem[i]; });
    var lg = w.querySelector(".login-legal"); if (lg) { lg.textContent = P.login.legal || ""; lg.style.display = P.login.legal ? "" : "none"; }
    var hl = w.querySelector("#bsGateHelp"); if (hl) hl.style.display = P.login.help ? "" : "none";
    var hb = w.querySelector("#bsGateHelpBox"); if (hb && !P.login.help) hb.classList.remove("on");
    try { document.title = P.name; } catch (e) {}
  }
  /* النافذة الأم (مدير النظام ← المنصة) ترسل المسودة فتُطبَّق فوراً على هذه المعاينة */
  if (IS_PREVIEW) window.addEventListener("message", function (ev) { try { if (ev.origin !== location.origin || !ev.data || !ev.data.bsPlatPreview) return; previewOverride = merge(DEF, ev.data.bsPlatPreview); if (gateEl) gateApply(gateEl, previewOverride); } catch (e) {} });
  function gate(w) {
    var P = previewOverride || get(), B = window.__BS_BOOT || {};
    gateEl = w;
    var form = w.querySelector(".login-form");
    if (IS_PREVIEW) { w.classList.add("bs-gate-preview"); var stP = document.createElement("style"); stP.textContent = ".bs-gate-preview .login-card,.bs-gate-preview #bsGateTheme{pointer-events:none}.bs-gate-preview .login-hero-content,.bs-gate-preview .login-card{animation:none!important}"; document.head.appendChild(stP); try { window.parent.postMessage({ bsPlatPreviewReady: 1 }, location.origin); } catch (e) {} }
    if (!form || w.querySelector("#bsPw1")) { gateApply(w, P); return; }
    var lg = document.createElement("div"); lg.className = "login-legal"; form.appendChild(lg);
    /* تذكّر اسم المستخدم — هذا الجهاز فقط، بلا كلمة مرور أبداً */
    var un = w.querySelector("#bsGateUser"), btn = w.querySelector("#bsGateBtn");
    if (P.login.remember && un) { try { var last = RAWget.call(localStorage, "bs_last_un"); if (last && !un.value) { un.value = last; var pw = w.querySelector("#bsGatePass"); if (pw) setTimeout(function () { try { pw.focus(); } catch (e) {} }, 50); } } catch (e) {} if (btn) btn.addEventListener("click", function () { try { RAWset.call(localStorage, "bs_last_un", un.value.trim()); } catch (e) {} }, true); }
    else { try { localStorage.removeItem && RAWset.call(localStorage, "bs_last_un", ""); } catch (e) {} }
    /* «تعذّر الدخول؟» */
    var a = document.createElement("a"); a.className = "login-help-link"; a.href = "#"; a.id = "bsGateHelp"; a.textContent = "تعذّر الدخول؟";
    var box = document.createElement("div"); box.className = "login-help-box"; box.id = "bsGateHelpBox";
    var rk = !!(B.cf && B.rk);
    box.innerHTML = '<div id="bsGateHelpStaff"></div>' + (rk
      ? '<div style="margin-top:8px;border-top:1px dashed var(--bd-a185151810p4);padding-top:8px"><b>مدير النظام؟</b> أدخل مفتاح الاستعادة واختر كلمة مرور جديدة:<input class="k" id="bsRkKey" placeholder="XXXXX-XXXXX-XXXXX-XXXXX" autocomplete="off"><input type="password" id="bsRkPw" placeholder="كلمة المرور الجديدة"><input type="password" id="bsRkPw2" placeholder="تأكيد كلمة المرور"><div id="bsRkMsg" style="font-size:11.5px;margin-top:6px;min-height:18px"></div><button type="button" id="bsRkBtn" class="bs-plat-btn" style="width:100%;margin-top:4px">فتح الحساب بكلمة جديدة</button></div>'
      : (B.cf ? '<div id="bsGateHelpNoKey" style="margin-top:6px;color:var(--fg-x8a99a5)"></div>' : ""));
    form.appendChild(a); form.appendChild(box);
    /* زر استيراد النسخة الشاملة يسكن داخل «تعذّر الدخول؟» باسمٍ صريح — لا أيقونة عارية على الشاشة */
    try { var rs9 = form.querySelector(".login-restore"); if (rs9) { var hd9 = document.createElement("div"); hd9.className = "login-restore-hd"; hd9.innerHTML = "<b>مدير النظام؟</b> استعادة المنصة من ملف نسخة شاملة على هذا الجهاز:"; box.appendChild(hd9); box.appendChild(rs9); var lb9 = rs9.querySelector(".login-restore-btn"); if (lb9) { var tx9 = document.createElement("span"); tx9.className = "login-restore-lbl"; tx9.textContent = "اختيار ملف النسخة…"; tx9.addEventListener("click", function () { lb9.click(); }); lb9.insertAdjacentElement("afterend", tx9); } } } catch (e9) {}
    gateApply(w, P);
    a.addEventListener("click", function (ev) { ev.preventDefault(); box.classList.toggle("on"); });
    var rb = box.querySelector("#bsRkBtn");
    if (rb) rb.addEventListener("click", function () {
      var k = box.querySelector("#bsRkKey").value, p1 = box.querySelector("#bsRkPw").value, p2 = box.querySelector("#bsRkPw2").value, m = box.querySelector("#bsRkMsg");
      m.style.color = "var(--fg-x991b1b)";
      if (p1 !== p2) { m.textContent = "كلمتا المرور غير متطابقتين"; return; }
      rb.disabled = true; m.textContent = "جارٍ التحقق…"; m.style.color = "var(--fg-x475569)";
      fetch("/api/recover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: k, pw: p1 }) }).then(function (r) { return r.json(); }).then(function (j) {
        rb.disabled = false;
        if (j && j.ok) { m.style.color = "var(--fg-x065f46)"; m.textContent = "تم — سجّل الدخول الآن باسم «" + j.un + "» وكلمتك الجديدة. المفتاح أُبطل، أنشئ غيره بعد الدخول."; if (un) un.value = j.un; box.querySelector("#bsRkKey").value = ""; box.querySelector("#bsRkPw").value = ""; box.querySelector("#bsRkPw2").value = ""; }
        else { m.style.color = "var(--fg-x991b1b)"; m.textContent = (j && j.err) || "تعذّر"; }
      }).catch(function () { rb.disabled = false; m.textContent = "لا اتصال — حاول مجددًا بعد قليل"; });
    });
  }
  /* ── الطباعة: ترويسة موحّدة وتذييل ── */
  function printOn() {
    var P = get(); if (!P.print.l1 && !P.print.l2 && !P.logo && !P.org && !P.print.footer && !P.print.date && !P.print.who) return;
    var main = document.querySelector("main.bs-main") || document.querySelector("main"); if (!main) return;
    printOff();
    var l1 = P.print.l1 || P.org || P.name, l2 = P.print.l2, l3 = P.print.l3;
    try { var D = KIVO.BassamDepts, dn = D && D.activeName ? D.activeName() : ""; var pg = (document.querySelector(".bs-topbar > div:first-child > div:last-child > span") || {}).textContent || ""; l3 = String(l3 || "{الإدارة} · {الصفحة}").replace("{الإدارة}", dn).replace("{الصفحة}", pg).replace(/^\s*(?:[·•]\s*|-\s+)|(?:\s*[·•]|\s+-)\s*$/g, ""); } catch (e) {}
    var h = document.createElement("div"); h.id = "bs-plat-print";
    var cls = P.print.logoPos === "center" ? "c" : P.print.logoPos === "left" ? "l" : "";
    h.innerHTML = '<div class="h ' + cls + '">' + (P.logo && P.print.logoPos !== "none" ? '<img src="' + esc(P.logo) + '" alt="">' : "") + '<div><div class="t1">' + esc(l1) + "</div>" + (l2 ? '<div class="t2">' + esc(l2) + "</div>" : "") + (l3 ? '<div class="t3">' + esc(l3) + "</div>" : "") + "</div></div>";
    main.insertBefore(h, main.firstChild);
    var who = ""; try { var A = KIVO.BassamAuth, u = A && A.user ? A.user() : null; who = u ? (u.name || u.un || "") : ""; } catch (e) {}
    var parts = []; if (P.print.footer) parts.push(esc(P.print.footer)); var right = [];
    if (P.print.who && who) right.push("طُبع بواسطة " + esc(who)); if (P.print.date) { try { var HJ = KIVO.BassamHijri && KIVO.BassamHijri.fmt ? KIVO.BassamHijri.fmt(new Date()) : new Date().toLocaleDateString("ar-SA-u-nu-latn"); right.push(HJ + " " + new Date().toTimeString().slice(0, 5)); } catch (e) {} }
    var f = document.createElement("div"); f.id = "bs-plat-printfoot"; f.innerHTML = "<span>" + parts.join(" · ") + "</span><span>" + right.join(" · ") + "</span>"; main.appendChild(f);
  }
  function printOff() { ["bs-plat-print", "bs-plat-printfoot"].forEach(function (id) { var e = document.getElementById(id); if (e) e.remove(); }); }
  window.addEventListener("beforeprint", function () { try { printOn(); } catch (e) {} });
  window.addEventListener("afterprint", function () { try { printOff(); } catch (e) {} });
  /* ── دعوة التثبيت على الجوال ── */
  var deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferredPrompt = e; setTimeout(installBar, 1500); });
  function standalone() { try { return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true; } catch (e) { return false; } }
  function installBar() {
    var P = get(), B = window.__BS_BOOT || {};
    if (!P.app.install || standalone() || document.getElementById("bs-plat-install") || B.auth === "need" || document.getElementById("bsLoginGate")) return;
    var mob = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent); if (!mob) return;
    try { if (RAWget.call(localStorage, "bs_install_x") === ver()) return; } catch (e) {}
    var ios = /iPhone|iPad/i.test(navigator.userAgent) && !deferredPrompt;
    var bar = document.createElement("div"); bar.id = "bs-plat-install"; bar.setAttribute("dir", "rtl");
    bar.innerHTML = (P.logo ? '<img src="' + esc(P.logo) + '" alt="">' : '<span class="ic">' + svg('<path d="M12 5v14M5 12h14"/>', 18) + "</span>") + "<div style=\"flex:1;min-width:0\"><b>أضف «" + esc(P.app.name || P.name) + "» إلى شاشتك الرئيسية</b><small>" + (ios ? "من زر المشاركة في Safari ← «إضافة إلى الشاشة الرئيسية»" : "يفتح كتطبيق بملء الشاشة بلا شريط متصفح") + "</small></div>" + (ios ? "" : '<button id="bsInstGo" style="background:var(--bg-xb99751);color:var(--text-on-brand)">تثبيت</button>') + '<button id="bsInstX" style="background:transparent;color:var(--fg-xffffff);opacity:.7">لاحقاً</button>';
    document.body.appendChild(bar);
    bar.querySelector("#bsInstX").addEventListener("click", function () { try { RAWset.call(localStorage, "bs_install_x", ver()); } catch (e) {} bar.remove(); });
    var go = bar.querySelector("#bsInstGo"); if (go) go.addEventListener("click", function () { if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.then(function () { bar.remove(); deferredPrompt = null; }); } });
  }
  /* ── حول المنصة ── */
  function openAbout() {
    var P = get(); var old = document.getElementById("bs-plat-about"); if (old) old.remove();
    var ov = document.createElement("div"); ov.className = "bs-plat-ov"; ov.id = "bs-plat-about"; ov.setAttribute("dir", "rtl");
    var gs = (P.about.guides || []).filter(function (g) { return g && /^https?:\/\//i.test(String(g.u || "").trim()); });   /* روابط http(s) فقط */
    var sup = false; try { sup = !!(KIVO.BassamAuth && KIVO.BassamAuth.isSuper && KIVO.BassamAuth.isSuper()); } catch (e) {}
    ov.innerHTML = '<div class="bs-plat-card"><div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">' + (P.logo ? '<img src="' + esc(P.logo) + '" alt="" style="width:52px;height:52px;object-fit:contain;border-radius:14px">' : '<div style="width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,var(--bg-xc5a45c),var(--bg-x8a6f35));color:var(--text-on-brand);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800">' + esc((P.name || "م").charAt(0)) + "</div>")
      + "<div><h3>" + esc(P.name) + "</h3><div class=\"m\">الإصدار " + esc(ver()) + (P.org ? " · " + esc(P.org) : "") + "</div></div></div>"
      + (P.about.license ? '<div class="m" style="margin-bottom:8px">' + esc(P.about.license) + (P.about.licType ? " · " + esc(P.about.licType) : "") + "</div>" : "")
      + (P.about.whatsnew ? '<div style="border:1px solid var(--bd-xe9e6df);border-radius:11px;padding:10px 12px;margin-bottom:10px"><div style="font-size:11px;font-weight:700;color:var(--fg-xb99751);margin-bottom:3px">ما الجديد في هذا الإصدار</div><div class="m" style="white-space:pre-line">' + esc(P.about.whatsnew) + "</div></div>" : "")
      + (gs.length ? '<div style="font-size:11px;font-weight:700;color:var(--fg-x64748b);margin-bottom:2px">الأدلة</div>' + gs.map(function (g) { return '<a class="g" href="' + esc(g.u) + '" target="_blank" rel="noopener">' + esc(g.t) + " <span style=\"color:var(--fg-xb99751)\">↗</span></a>"; }).join("") : (sup ? '<div class="m">لم تُضف أدلة بعد — تُضاف من مدير النظام ← المنصة ← حول المنصة.</div>' : ""))
      + (P.about.support || P.about.phone ? '<div style="margin-top:10px;border-top:1px solid var(--bd-xf1efe9);padding-top:10px"><div style="font-size:11px;font-weight:700;color:var(--fg-x64748b)">الدعم الفني</div><div class="m">' + esc([P.about.support, P.about.phone].filter(Boolean).join(" · ")) + (P.about.msg ? "<br>" + esc(P.about.msg) : "") + "</div></div>" : "")
      + '<div style="display:flex;justify-content:flex-start;margin-top:14px"><button class="bs-plat-btn" id="bsAboutX">إغلاق</button></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener("click", function (e) { if (e.target === ov || e.target.id === "bsAboutX") ov.remove(); });
  }
  /* «ما الجديد» — مرة واحدة لكل إصدار على هذا الجهاز */
  function whatsNewOnce() {
    var P = get(), B = window.__BS_BOOT || {};
    if (!P.about.whatsnew || B.auth === "need" || document.getElementById("bsLoginGate")) return;
    try { if (RAWget.call(localStorage, "bs_seen_ver") === ver()) return; RAWset.call(localStorage, "bs_seen_ver", ver()); } catch (e) { return; }
    openAbout();
  }
  /* ── الاستماع للتغييرات وإعادة التطبيق ── */
  window.addEventListener("bassam:store", function (e) { try { if (e && e.detail && e.detail.key === K) { cache = null; apply(); } } catch (x) {} });
  window.addEventListener("storage", function (e) { try { if (e && e.key === K) { cache = null; apply(); } } catch (x) {} });
  var pend = 0;
  function tick() { if (pend) return; pend = setTimeout(function () { pend = 0; try { apply(); } catch (e) {} }, 60); }
  try { new MutationObserver(function (m) { for (var i = 0; i < m.length; i++) { var t = m[i].target; if (t && t.closest && t.closest("aside.bsb")) { tick(); return; } if (m[i].addedNodes && m[i].addedNodes.length) { for (var j = 0; j < m[i].addedNodes.length; j++) { var n = m[i].addedNodes[j]; if (n.nodeType === 1 && (n.matches && (n.matches("aside.bsb") || n.querySelector && n.querySelector("aside.bsb")))) { tick(); return; } } } } }).observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}
  document.addEventListener("DOMContentLoaded", function () { try { apply(); } catch (e) {} });
  window.addEventListener("load", function () { setTimeout(function () { try { apply(); whatsNewOnce(); installBar(); } catch (e) {} }, 2500); });
  KIVO.BassamPlat = { DEF: DEF, NAVKEYS: NAVKEYS, NAVNAMES: NAVNAMES, STATUS: STATUS, get: get, defaults: function () { return clone(DEF); }, set: set, apply: apply, gate: gate, openAbout: openAbout, rightsText: function () { return rightsText(get()); }, merge: merge, key: K };
})();
