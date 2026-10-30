
/* ═══ R182: الأرقامُ العربية في المنصة كلها (٠١٢٣٤٥٦٧٨٩) — طبقةُ عرضٍ واحدة ═══
   كلُّ رقمٍ معروض يُكتب بالأرقام العربية في مكانه نفسه تماماً — علامةُ ٪ والإشارةُ وأجزاءُ التاريخ حيث كانت:
   يُنظر إلى ما قبل الرقم في فقرته كما يفعل المتصفح (أقربُ حرفٍ قويّ):
     • بعد حرفٍ عربي (الغالب): الرقمُ الغربيّ هنا يُعامَل أصلاً معاملةَ الرقم العربي — فيُستبدل وحده بلا أي علامة، فيبقى ترتيبُه كما كان حرفاً بحرف.
     • في أول الفقرة (لا حرفَ قبله): يُعزل في مقطعٍ «من اليسار» (LRI·LRO … PDF·PDI) — كما كان الرقمُ الغربيّ يُرسم هناك.
     • بعد كلمةٍ لاتينية: يُضمَّن «من اليسار» (LRO … PDF) — كما كان يتبعها.
   وفاصلا الآلاف والكسر بالصيغة العربية (٬ ٫). العرضُ وحده: القيمُ في الذاكرة والخادم وملفاتُ Excel/CSV كما هي.
   ويبقى كما هو: ما يُكتب في حقول الإدخال ونصُّها الإرشادي، ومحرّرُ النصوص، ورقمُ الإصدار؛ ولصحّة المعنى: كلُّ كلمةٍ فيها
   حرفٌ لاتيني — رمزٌ أو معرّفٌ أو رابطٌ أو بريد (N01 · N-1-M-03 · R181) — وعناوينُ IP.
   R187: والفاصلُ «·» يُعرض فاصلاً واضحاً في كل نصٍّ معروض وتلميحٍ ونصٍّ إرشاديّ: «·» يلتبس بصفر الأرقام العربية «٠».
   R189: والفاصلُ المعروض «-» (طلبُ المستخدم: أوضح من «•»). */
(function(){
  if (KIVO.BassamDigits) return;
  var AR = "٠١٢٣٤٥٦٧٨٩", LAT = /[A-Za-z_]/, HAS = /[0-9]/,
      RX = /(?:‎[+\-−]?)?[٪%‰]?\d+(?:[.,:\/\-]\d+)*[٪%‰]?/g,
      MARKS = /[⁦⁧⁩‫‬‭]/g,
      DOT = /·/g,
      PCT0 = /^[٪%‰]/, TAILK = typeof WeakMap !== "undefined" ? new WeakMap() : null,
      S_AL = /[؈؋؍؛-ي٭-ٯٱ-ەۥۦۮۯۺ-ۿܐ-݊ݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻾]/,
      S_R = /[֐-׿߀-࡟יִ-ﭏ‏]/,
      S_L = /[A-Za-zªµºÀ-ÖØ-öø-ʸͰ-ϿЀ-ԯḀ-῿‎]/,
      SVG = "http://www.w3.org/2000/svg",
      SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1, CODE: 1, PRE: 1, TITLE: 1, HEAD: 1, script: 1, style: 1 },
      ORIG = typeof WeakMap !== "undefined" ? new WeakMap() : null;
  function conv(t) {
    return t.replace(/(\d),(?=\d)/g, "$1٬").replace(/(\d)\.(?=\d)/g, "$1٫").replace(/\d/g, function (d) { return AR.charAt(+d); });
  }
  /* أقربُ حرفٍ قويّ قبل الموضع o — ويُتخطّى ما عزلته الطبقةُ أو ضمّنته (سياقُه أبعدُ منه) */
  function strong(s, o) {
    for (var i = o - 1; i >= 0; i--) { var c = s.charAt(i);
      if (c === "⁩") { var j = Math.max(s.lastIndexOf("⁦", i), s.lastIndexOf("⁧", i)); if (j < 0) return null; i = j; continue; }
      if (c === "‬") { var k = Math.max(s.lastIndexOf("‭", i), s.lastIndexOf("‫", i)); if (k < 0) return null; i = k; continue; }
      if (S_AL.test(c)) return "AL"; if (S_L.test(c)) return "L"; if (S_R.test(c)) return "R"; }
    return null;
  }
  function win(e) { return (e.ownerDocument && e.ownerDocument.defaultView) || window; }
  /* حدُّ الفقرة أو العزل: عنصرٌ غيرُ سطريّ، أو عازل (dir · bdi · bdo · unicode-bidi)، أو نصُّ رسمٍ مستقلّ */
  function bound(e, C) {
    if (!e || e.nodeType !== 1) return true;
    var v = C ? C.get(e) : undefined; if (v !== undefined) return v;
    var r;
    if (e.namespaceURI === SVG) r = e.localName !== "tspan" && e.localName !== "a" && e.localName !== "textPath";
    else if (e.hasAttribute("dir") || e.nodeName === "BDI" || e.nodeName === "BDO" || e.nodeName === "BODY") r = true;
    else { var cs = win(e).getComputedStyle(e), d = cs.display; r = !(d === "inline" || d === "contents") || /isolate|plaintext/.test(cs.unicodeBidi); }
    if (C) C.set(e, r); return r;
  }
  /* ما قبل الرقم في العنصر السابق: حرفٌ قويّ، أو "B" حدُّ فقرة (كتلة)؛ والعازلُ السطريّ والعنصرُ الذرّي محايدان */
  function prevIn(n, C) {
    if (n.nodeType === 3) return strong(n.nodeValue, n.nodeValue.length);
    if (n.nodeType !== 1 || SKIP[n.nodeName]) return null;
    if (bound(n, C)) { if (n.namespaceURI === SVG) return null; var d = win(n).getComputedStyle(n).display; return (d === "inline" || d === "contents" || d.indexOf("inline-") === 0) ? null : "B"; }
    for (var c = n.lastChild; c; c = c.previousSibling) { var r = prevIn(c, C); if (r) return r; }
    return null;
  }
  function sos(p) { try { return win(p).getComputedStyle(p).direction === "ltr" ? "L" : "R"; } catch (x) { return "R"; } }
  /* سياقُ أوّل العقدة النصّية: أقربُ حرفٍ قويّ قبلها في فقرتها، وإلا اتجاهُ الفقرة */
  function ctx(node, C) {
    for (var cur = node; ; ) {
      for (var s = cur.previousSibling; s; s = s.previousSibling) { var r = prevIn(s, C); if (r === "B") return sos(cur.parentNode); if (r) return r; }
      var p = cur.parentNode; if (!p || p.nodeType !== 1 || bound(p, C)) return p && p.nodeType === 1 ? sos(p) : "R";
      cur = p;
    }
  }
  function fmt(v, c0, info) {
    v = String(v == null ? "" : v);
    if (!HAS.test(v)) return v;
    var base;   /* سياقُ أوّل النص — يُحسب مرّةً عند الحاجة */
    return v.replace(RX, function (t, o, all) {
      var a = o, b = o + t.length;
      while (a > 0 && !/\s/.test(all.charAt(a - 1))) a--;
      while (b < all.length && !/\s/.test(all.charAt(b))) b++;
      if (LAT.test(all.slice(a, b))) return t;           /* كلمةٌ فيها حرفٌ لاتيني: رمزٌ أو معرّفٌ أو رابطٌ أو بريد */
      if ((t.match(/\./g) || []).length > 1) return t;  /* رقمُ إصدارٍ أو عنوانُ IP */
      var k = t.charAt(0) === "‎" ? "L" : strong(all, o);
      if (!k) { if (base === undefined) base = typeof c0 === "function" ? c0() : (c0 || "R"); k = base; }
      /* R183 (الملاحظة ١٠): النسبةُ ٪ يسارَ رقمها في كل سياق — مقطعٌ معزولٌ «من اليمين» يضمّ الإشارةَ والرقمَ وعلامتَه؛
         وبعد حرفٍ عربيٍّ والعلامةُ بعد الرقم هي يسارَه أصلاً فيبقى كما كان */
      var pm = /[٪%‰]/.exec(t);
      if (pm) {
        if (k === "AL" && t.charAt(0) !== "‎" && /^[+\-−]?\d/.test(t) && /[٪%‰]$/.test(t)) return conv(t).replace(/%/g, "٪");
        var sg = (/^‎?([+\-−]?)/.exec(t) || ["", ""])[1], body = t.replace(/^‎?[+\-−]?/, "").replace(/[٪%‰]/g, "");
        return "⁧" + sg + conv(body) + (pm[0] === "‰" ? "‰" : "٪") + "⁩";
      }
      if (k === "AL") return conv(t);                                  /* بعد حرفٍ عربي: كما كان حرفاً بحرف */
      if (k === "L") { if (info && o + t.length === all.length) info.tailL = t; return "‭" + conv(t) + "‬"; }   /* بعد كلمةٍ لاتينية أو في فقرةٍ من اليسار (وقد تتبعه ٪ في العقدة التالية) */
      if (info && o + t.length === all.length) info.tail = t;           /* رقمٌ أوّلَ الفقرة في آخر العقدة — قد تتبعه ٪ في العقدة التالية */
      return "⁦‭" + conv(t) + "‬⁩";                 /* أوّلَ فقرةٍ من اليمين */
    });
  }
  function one(e) {
    return !!(SKIP[e.nodeName] || e.isContentEditable || e.id === "bsErrBar" || e.getAttribute("data-nu") === "latn"
      || (e.nodeName === "OPTION" && !e.hasAttribute("value")));
  }
  function off(el) { for (var e = el; e && e.nodeType === 1; e = e.parentNode) if (one(e)) return true; return false; }
  /* النصُّ التالي في الفقرة نفسِها (أوّلُ عقدةٍ نصّية بعد n) — والكتلةُ والعازلُ والعنصرُ الذرّي حدٌّ */
  function nextTxt(n, C) {
    for (var cur = n; ; ) {
      for (var s = cur.nextSibling; s; s = s.nextSibling) {
        if (s.nodeType === 3) { if (s.nodeValue) return s; continue; }
        if (s.nodeType !== 1 || SKIP[s.nodeName]) continue;
        if (bound(s, C)) return null;
        var w = (s.ownerDocument || document).createTreeWalker(s, 5, null), f = null;
        for (var x = w.nextNode(); x; x = w.nextNode()) { if (x.nodeType === 1) { if (bound(x, C)) return null; continue; } if (x.nodeValue) { f = x; break; } }
        if (f) return f;
      }
      var p = cur.parentNode; if (!p || p.nodeType !== 1 || bound(p, C)) return null;
      cur = p;
    }
  }
  /* ── سلسلةُ العُقد: رقمٌ أوّلَ الفقرة في آخر عقدته، وتكمله العقدةُ التالية (٪ · رقمٌ آخر · :30) ──
     كان الرقمُ الغربيُّ يلتصق بما بعده في مقطعٍ واحدٍ من اليسار «2100٪» · «0٪»؛ والعزلُ يفصلهما فينقلب ترتيبُهما.
     فيُفتح التضمينُ «من اليسار» في آخر العقدة الأولى ويُغلق في الثانية بعد ما يكمل الرقم — ويُعاد ترتيبُه كلّما تغيّرت إحداهما. */
  var OPEN = /[‭‫]([^‬⁩⁦⁧‭‫]*)$/,
      LEAD = /^(?:[0-9]|[٪%‰‱°′″‴±∓#$¢-¥₠-⃏]|[.,:\/+\-−](?=[0-9]))+/,
      CLOSER = typeof WeakMap !== "undefined" ? new WeakMap() : null, CHAINS = 0;
  function lead(v) { var m = LEAD.exec(back(v)); return m ? m[0].length : 0; }
  /* يضع إغلاقاً واحداً (PDF خارجَ أي مقطع) بعد L حرفاً ظاهراً — ويحذف إغلاقاً قديماً إن وُجد */
  function placeClose(v, L) {
    var out = "", cnt = 0, dep = 0, done = false;
    for (var i = 0; i < v.length; i++) { var c = v.charAt(i);
      if (c === "⁦" || c === "⁧" || c === "‭" || c === "‫") { if (!done && cnt >= L && dep === 0) { out += "‬"; done = true; } dep++; out += c; continue; }
      if (c === "‬" || c === "⁩") { if (dep === 0) continue; dep--; out += c; if (!done && cnt >= L && dep === 0) { out += "‬"; done = true; } continue; }
      if (!done && cnt >= L && dep === 0) { out += "‬"; done = true; }
      out += c; cnt++; }
    return done ? out : out + "‬";
  }
  function rechain(A, C) {
    var v = A.nodeValue, m = v && OPEN.exec(v); if (!m) return;
    var B = nextTxt(A, C), L = B && !off(B.parentNode) ? lead(B.nodeValue) : 0;
    /* R183: ٪ أوّلَ العقدة التالية ⇒ التضمينُ «من اليمين» فتقع يسارَ الرقم؛ وسلسلةُ «من اليسار» لا تقوم إلا لها */
    var pc = L > 0 && PCT0.test(back(B.nodeValue)), tk = (TAILK && TAILK.get(A)) || "R";
    if (L > 0 && !pc && tk === "L") L = 0;
    if (L > 0) { var op = pc ? "‫" : "‭"; if (v.charAt(m.index) !== op) A.nodeValue = v.slice(0, m.index) + op + m[1];
      var nv = placeClose(pc ? B.nodeValue.replace(/^([⁦⁧⁩‭‫‬]*)%/, "$1٪") : B.nodeValue, L);
      if (nv !== B.nodeValue) { if (ORIG && ORIG.get(B) == null) ORIG.set(B, B.nodeValue.replace(MARKS, "")); B.nodeValue = nv; }
      if (CLOSER && !CLOSER.has(B)) CHAINS++; if (CLOSER) CLOSER.set(B, A); }
    else A.nodeValue = v.slice(0, m.index) + (tk === "L" ? "‭" + m[1] + "‬" : "⁦‭" + m[1] + "‬⁩");   /* لا شيءَ يكمله الآن: يعود مغلقاً كما يُرسم في سياقه */
  }
  /* أُزيلت عقدةٌ كانت تُغلق سلسلة: تُراجَع العقدةُ الأولى فتلتحق بما بعدها أو تُغلق نفسَها */
  function unchain(node, C) {
    if (!CHAINS || !CLOSER) return;
    var chk = function (t) { var a = CLOSER.get(t); if (a && a.isConnected) rechain(a, C); };
    if (node.nodeType === 3) { chk(node); return; }
    if (node.nodeType !== 1) return;
    var w = (node.ownerDocument || document).createTreeWalker(node, 4, null);
    for (var t = w.nextNode(); t; t = w.nextNode()) chk(t);
  }
  /* النصُّ السابق في الفقرة نفسِها (آخرُ عقدةٍ نصّية قبل n) */
  function prevTxt(n, C) {
    for (var cur = n; ; ) {
      for (var s = cur.previousSibling; s; s = s.previousSibling) {
        if (s.nodeType === 3) { if (s.nodeValue) return s; continue; }
        if (s.nodeType !== 1 || SKIP[s.nodeName]) continue;
        if (bound(s, C)) return null;
        for (var x = s.lastChild, f = null; x; ) { if (x.nodeType === 3 && x.nodeValue) { f = x; break; } if (x.nodeType === 1 && !SKIP[x.nodeName]) { if (bound(x, C)) return null; if (x.lastChild) { x = x.lastChild; continue; } }
          while (x && !x.previousSibling && x !== s) x = x.parentNode; if (!x || x === s) break; x = x.previousSibling; }
        if (f) return f;
      }
      var p = cur.parentNode; if (!p || p.nodeType !== 1 || bound(p, C)) return null;
      cur = p;
    }
  }
  function txt(n, C) {
    /* R183: عقدةٌ صار نصُّها بلا أرقامٍ غربية ولا عربية («٠ نشط» ← «نشط واحد»)، أو لم يغيّرها التحويل،
       لا أصلَ غربياً لها — يُمحى المحفوظُ منه فلا يُعاد أصلٌ لم يعد قائماً (orig) */
    /* R187/R189: الفاصلُ «·» يُعرض «-» في كل نصٍّ معروض، فيه رقمٌ أو لم يكن. والأصلُ المحفوظ (orig) بالفاصل الجديد —
       فلا يختلف عن المعروض إلا في الأرقام (كما كان) */
    var v = n.nodeValue, sp = !!v && v.indexOf("·") !== -1; if (sp) v = v.replace(DOT, "-");
    if (!v || !HAS.test(v)) { if (sp) n.nodeValue = v; if (ORIG && !/[\u0660-\u0669]/.test(v || "")) ORIG["delete"](n); return; }
    var info = {}, w = fmt(v, function () { return ctx(n, C); }, info);
    if (w === v) { if (sp) n.nodeValue = v; if (ORIG) ORIG["delete"](n); return; }
    var tl = info.tail || info.tailL;
    if (tl) {
      var iso = info.tail ? "⁦‭" + conv(tl) + "‬⁩" : "‭" + conv(tl) + "‬", B = w.slice(-iso.length) === iso ? nextTxt(n, C) : null;
      if (B && !off(B.parentNode) && lead(B.nodeValue) > 0) { var pc0 = PCT0.test(back(B.nodeValue));
        if (info.tail || pc0) { w = w.slice(0, w.length - iso.length) + (pc0 ? "‫" : "‭") + conv(tl); if (TAILK) TAILK.set(n, info.tail ? "R" : "L"); } }
    }
    if (ORIG) ORIG.set(n, v.replace(MARKS, "")); n.nodeValue = w;
    if (OPEN.test(w)) rechain(n, C);                                                         /* هذه أوّلُ سلسلة */
    if (CHAINS && CLOSER && CLOSER.has(n)) { var a = CLOSER.get(n); if (a.isConnected) rechain(a, C); }   /* وهذه تُغلق سلسلةً قبلها */
  }
  function att(e) {
    /* R187: والفاصلُ في التلميح (title · data-tip) والنصِّ الإرشاديّ للحقول (placeholder) كذلك — وأرقامُ الإرشاديّ تبقى كما هي (R182) */
    for (var i = 0; i < 3; i++) { var a = i === 2 ? "placeholder" : i ? "data-tip" : "title", v = e.getAttribute(a);
      if (!v) continue;
      var w = v.indexOf("·") !== -1 ? v.replace(DOT, "-") : v;
      if (i < 2 && HAS.test(w)) w = fmt(w, "R");
      if (w !== v) e.setAttribute(a, w); }
  }
  function tree(root, C) {
    if (!root) return;
    C = C || (typeof Map !== "undefined" ? new Map() : null);
    if (root.nodeType === 3) { if (root.parentNode && !off(root.parentNode)) txt(root, C); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) { if (off(root)) return; att(root); }
    var d = root.ownerDocument || root,
        w = d.createTreeWalker(root, 5, { acceptNode: function (n) { return n.nodeType === 1 && one(n) ? 2 : 1; } });
    for (var n = w.nextNode(); n; n = w.nextNode()) { if (n.nodeType === 3) txt(n, C); else att(n); }
  }
  /* مراقبٌ على الصفحة: ما تغيّر وحده — نصٌّ تبدّل، أو عنصرٌ أُضيف، أو تلميحٌ كُتب — ويُعالَج قبل أن يُرسم */
  function watch(doc) {
    doc = doc || document; var root = doc.body || doc.documentElement;
    if (!root || typeof MutationObserver === "undefined") return null;
    tree(root);
    var mo = new MutationObserver(function (rs) {
      var C = typeof Map !== "undefined" ? new Map() : null;
      for (var i = 0; i < rs.length; i++) { var r = rs[i];
        if (r.type === "characterData") { var tg = r.target;
          if (tg.parentNode && !off(tg.parentNode)) { txt(tg, C); if (CHAINS && CLOSER && CLOSER.has(tg)) { var a0 = CLOSER.get(tg); if (a0.isConnected) rechain(a0, C); } } }
        else if (r.type === "childList") {
          for (var k = 0; k < r.removedNodes.length; k++) unchain(r.removedNodes[k], C);
          for (var j = 0; j < r.addedNodes.length; j++) { var ad = r.addedNodes[j]; if (!ad.isConnected) continue; tree(ad, C);
            if (CHAINS) { var pv = prevTxt(ad, C); if (pv && OPEN.test(pv.nodeValue)) rechain(pv, C); } } }
        else if (!off(r.target)) att(r.target);
      }
      mo.takeRecords();
    });
    mo.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["title", "data-tip", "placeholder"] });
    return mo;
  }
  /* النسخ: يعود النصُّ بأرقامٍ غربية بلا علاماتٍ خفية — كما في البيانات — فيصلح للبحث وExcel كما كان قبل التحويل */
  function back(v) {
    return String(v == null ? "" : v).replace(MARKS, "").replace(/[٠-٩]/g, function (d) { return String(AR.indexOf(d)); })
      .replace(/٬/g, ",").replace(/٫/g, ".");
  }
  document.addEventListener("copy", function (e) {
    try {
      var sel = window.getSelection(); if (!sel || !sel.rangeCount || !e.clipboardData) return;
      var t = String(sel); if (!/[٠-٩٫٬⁦⁩‬‭]/.test(t)) return;
      var box = document.createElement("div"); for (var i = 0; i < sel.rangeCount; i++) box.appendChild(sel.getRangeAt(i).cloneContents());
      e.clipboardData.setData("text/plain", back(t)); e.clipboardData.setData("text/html", back(box.innerHTML));
      e.preventDefault();
    } catch (x) {}
  }, true);
  KIVO.BassamDigits = { fmt: fmt, tree: tree, watch: watch, back: back, ctx: ctx,
    orig: function (n) { return ORIG ? ORIG.get(n) : undefined; },
    plain: function (v) { return String(v == null ? "" : v).replace(MARKS, ""); } };
  KIVO.BassamDigits.mo = watch(document);
})();
