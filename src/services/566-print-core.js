/* ═══ نواةُ الطباعة المشتركة — «المتابعة اليومية» و«التشغيل الميداني» (KIVO_258 · AUD-013) ═══
   كان في كلٍّ من الوحدتين نسخةٌ من بانيه (_buildPrintDoc ≈ 22–24 KB) ومن لاقطِ الموقع (_capturePrintPage) — 0.78/0.90 تشابهاً في التدقيق؛
   الفروقُ الحقيقية أربعة وتصير خياراتٍ صريحة: سطرُ التاريخ (يومُ الجولة · اليوم) · صفحةُ المؤشرات وطيُّها (المتابعة وحدها) · نمطُ <i> في التذييل ·
   رقمُ الإصدار في التذييل؛ ومحدِّدُ خريطة الموقع في اللاقط. الشعارُ يمرّ من الوحدة (يُضمَّن فيها عند التركيب — @@KIVO_INLINE@@).
   البرهان: cfbench/k258print.mjs — وثيقتا الطباعة للوحدتين = ما كانت تبنيه نسختاهما (258 ↔ 257) حرفاً، وk254print = KIVO_240 بنيةً. */
(function () {
  function build(ctx, t, O) {
    const e = (t) =>
        String(null == t ? "" : t)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;"),
      s = ctx.state || {},
      n = () => {
        try {
          const t = document.getElementById("bs-print-veil");
          t && t.remove();
        } catch (t) {}
      };
    if (!t || !t.length) {
      const e = ctx._capturePrintPage(s.floor || 0);
      if (!e) return (n(), void window.print());
      t = [e];
    }
    let i = "الإدارة";
    try {
      i = (KIVO.BassamDepts && KIVO.BassamDepts.activeName()) || i;
    } catch (t) {}
    let o = "";
    /* سطرُ التاريخ: «round» = يومُ الجولة المختار في الحالة (هجري) والموافقُ الميلادي بحثاً · «today» = اليوم (BassamHijri) والموافقُ اليوم */
    if (O.date === "today")
      try {
        const t = KIVO.BassamHijri.now(),
          e = t.d + " " + (ctx.MONTHS[t.m - 1] || "") + " " + t.y + "هـ",
          s = new Date().toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });
        o = e + " الموافق " + s;
      } catch (t) {}
    else
      try {
        const t = s.year,
          e = s.month,
          n = Math.min(s.day, ctx.hMonthDays(t, e)),
          i = "جولة يوم " + n + " " + (ctx.MONTHS[e - 1] || "") + " " + t + "هـ";
        let r = "";
        try {
          const s = Date.UTC(622, 6, 16),
            i = new Date(s + Math.round(864e5 * (354.36667 * (t - 1) + 29.53 * (e - 1) + (n - 1)))),
            o = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { year: "numeric", month: "numeric", day: "numeric" });
          for (let s = -30; s <= 30; s++) {
            const a = new Date(i.getTime() + 864e5 * s),
              l = o.formatToParts(a),
              d = (t) => +l.find((e) => e.type === t).value;
            if (d("year") === t && d("month") === e && d("day") === n) {
              r = a.toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });
              break;
            }
          }
        } catch (t) {}
        o = i + (r ? " الموافق " + r : "");
      } catch (t) {}

    const r = O.logo,
      a = (function () {
        try {
          for (var t = "", e = document.styleSheets, s = 0; s < e.length; s++)
            try {
              for (var n = e[s].cssRules, i = 0; i < n.length; i++) {
                var o = n[i];
                o && (5 === o.type || (o.cssText && 0 === o.cssText.indexOf("@font-face"))) && (t += o.cssText);
              }
            } catch (t) {}
          return t ? "<style>" + t + "</style>" : "";
        } catch (t) {
          return "";
        }
      })();
    let l = "";
    try {
      l = KIVO.BassamCssText.all();
    } catch (t) {}
    try {
      let t = "",
        e = 0;
      for (; e < l.length; ) {
        const s = l.indexOf("@media", e);
        if (-1 === s) {
          t += l.slice(e);
          break;
        }
        const n = l.indexOf("{", s);
        if (-1 === n) {
          t += l.slice(e);
          break;
        }
        if (!/print/.test(l.slice(s, n))) {
          ((t += l.slice(e, n + 1)), (e = n + 1));
          continue;
        }
        t += l.slice(e, s);
        let i = 1,
          o = n + 1;
        for (; o < l.length && i > 0; ) {
          const t = l[o];
          ("{" === t ? i++ : "}" === t && i--, o++);
        }
        e = o;
      }
      l = t;
    } catch (t) {}
    const d = [
        "@page{size:420mm 297mm;margin:12mm 12mm 8mm}",
        "*{box-sizing:border-box;print-color-adjust:exact;-webkit-print-color-adjust:exact}",
        "html,body{margin:0;background:var(--bg-xffffff);font-family:'Cairo',sans-serif;color:var(--fg-x141414);font-feature-settings:'tnum';-webkit-font-smoothing:antialiased}",
        ".pg{height:276mm;display:flex;flex-direction:column;overflow:hidden;page-break-after:always;break-after:page}",
        ".pg:last-child{page-break-after:auto;break-after:auto}",
        ".hd{display:flex;align-items:flex-start;gap:12px;padding-bottom:3.5mm;border-bottom:2.2px solid var(--bd-xb99751);flex-shrink:0}",
        ".hd h2{font-size:26px;font-weight:800;margin:0 0 6px;letter-spacing:-0.2px}",
        ".hd .site{display:flex;align-items:center;gap:9px;font-size:18px;font-weight:700;color:var(--fg-x9a7e40)}",
        ".hd .site i{width:26px;height:3px;border-radius:9999px;background:var(--bg-xb99751);flex-shrink:0}",
        ".lg{height:58px;flex-shrink:0;display:flex;align-items:center;justify-content:flex-end}",
        ".gap{height:7mm;flex-shrink:0}",
        ".bd{flex:1;display:flex;gap:5mm;min-height:0;align-items:stretch;padding-bottom:6mm}",
        ".pn{width:120mm;flex-shrink:0;align-self:stretch;overflow:hidden}",
        ".pnIn{transform-origin:top right}",
        '.pn [style*="border"]{border-color:var(--bd-xcbd1d8)}',
        '.pn hr,.pn [style*="border-top"]{border-top-color:var(--bd-xcbd1d8)}',
        ".pnIn > div{border:2.2px solid var(--bd-xc9ae78)!important;border-radius:16px!important;box-shadow:0 0 0 1px rgba(185,151,81,0.18)!important}",
        ".mp{flex:1;min-width:0;align-self:stretch;height:100%;border:1.4px solid var(--bd-xcbd1d8);border-radius:16px;background:var(--bg-xffffff);display:flex;flex-direction:column;overflow:hidden}",
        ".mstrip{height:5mm;flex-shrink:0}",
        ".mstrip.t{border-bottom:1px solid var(--bd-xdfe3e8);background:linear-gradient(to bottom,var(--bg-a185151810p1),var(--bg-a185151810))}",
        ".mstrip.b{border-top:1px solid var(--bd-xdfe3e8);background:linear-gradient(to top,var(--bg-a185151810p1),var(--bg-a185151810))}",
        ".mmid{flex:1;display:flex;min-height:0}",
        ".vstrip{width:5mm;flex-shrink:0}",
        ".vstrip.r{border-left:1px solid var(--bd-xdfe3e8);background:linear-gradient(to left,var(--bg-a185151810p1),var(--bg-a185151810))}",
        ".vstrip.l{border-right:1px solid var(--bd-xdfe3e8);background:linear-gradient(to right,var(--bg-a185151810p1),var(--bg-a185151810))}",
        ".mcv{flex:1;min-width:0;min-height:0;padding:0;display:flex}",
        ".ft{flex-shrink:0;padding-top:8px;border-top:1.4px solid var(--bd-xcbd1d8);display:flex;align-items:center;gap:12px;font-size:13px;color:var(--fg-x53565a);font-weight:400}",
        ".ft .dot{color:var(--fg-xb99751);font-weight:700;opacity:.55;font-size:14px}",
        ".ft .fp{margin-right:auto;display:flex;align-items:center;justify-content:center;gap:2px;width:34px;height:34px;border-radius:9999px;border:2px solid var(--bd-xb99751);background:var(--bg-a185151810p08);flex-shrink:0;direction:ltr}",
        ".ft .fp b{font-size:13px;font-weight:700;color:var(--fg-x8a6f35);line-height:1}",
        ".ft .fp i{font-style:normal;font-size:9px;font-weight:600;color:var(--fg-x98a0a8);line-height:1;margin-top:6px}",   // في البانيين كليهما (k258print: كان مشروطاً بخيارٍ فسقط من وثيقة الخطة)
        ...(O.kpi
          ? [
              ".kbd{flex:1;min-height:0;display:flex;padding-bottom:6mm}",
              ".kfr{flex:1;min-width:0;border:1.4px solid var(--bd-xcbd1d8);border-radius:16px;background:var(--bg-xffffff);display:flex;flex-direction:column;overflow:hidden}",
              ".kstrip{height:5mm;flex-shrink:0}",
              ".kstrip.t{border-bottom:1px solid var(--bd-xdfe3e8);background:linear-gradient(to bottom,var(--bg-a185151810p1),var(--bg-a185151810))}",
              ".kstrip.b{border-top:1px solid var(--bd-xdfe3e8);background:linear-gradient(to top,var(--bg-a185151810p1),var(--bg-a185151810))}",
              ".kmid{flex:1;display:flex;min-height:0}",
              ".kv{width:5mm;flex-shrink:0}",
              ".kv.r{border-left:1px solid var(--bd-xdfe3e8);background:linear-gradient(to left,var(--bg-a185151810p1),var(--bg-a185151810))}",
              ".kv.l{border-right:1px solid var(--bd-xdfe3e8);background:linear-gradient(to right,var(--bg-a185151810p1),var(--bg-a185151810))}",
              ".kin{flex:1;min-width:0;min-height:0;padding:5mm;display:flex;align-items:stretch;overflow:hidden}",
              ".kscale{width:100%;height:100%;display:flex;flex-direction:column;transform-origin:top right}",
            ]
          : []),
      ].join(""),
      p = O.kpi ? ctx._kpiPrintBody() : "",
      h = t.length + (p ? 1 : 0),
      c = (t) =>
        '<div class="ft"><div style="display:flex;align-items:center;gap:11px">المنصة التشغيلية<span class="dot">·</span>' +
        e(i) +
        '<span class="dot">·</span>' +
        o +
        '<span style="font-size:9px;font-weight:600;color:var(--fg-xb99751);margin-right:5px">' +
        O.ver +
        '</span></div><div class="fp"><b>' +
        t +
        "</b><i>/" +
        h +
        "</i></div></div>",
      g =
        (p
          ? '<div class="pg"><div class="hd"><div style="flex:1;min-width:0"><h2>التقرير التنفيذي لتحديث الخطة التشغيلية</h2><div class="site"><i></i>لوحة المؤشرات — نظرة عامة</div></div><div class="lg">' +
            r +
            '</div></div><div class="gap"></div><div class="kbd"><div class="kfr"><div class="kstrip t"></div><div class="kmid"><div class="kv r"></div><div class="kin"><div class="kscale">' +
            p +
            '</div></div><div class="kv l"></div></div><div class="kstrip b"></div></div></div>' +
            c(1) +
            "</div>"
          : "") +
        t
          .map(
            (t, s) =>
              '<div class="pg"><div class="hd"><div style="flex:1;min-width:0"><h2>التقرير التنفيذي لتحديث الخطة التشغيلية</h2><div class="site"><i></i>' +
              e(t.name) +
              '</div></div><div class="lg">' +
              r +
              '</div></div><div class="gap"></div><div class="bd"><div class="pn"><div class="pnIn" style="width:' +
              t.panelW +
              'px">' +
              t.panel +
              '</div></div><div class="mp"><div class="mstrip t"></div><div class="mmid"><div class="vstrip r"></div><div class="mcv">' +
              t.svg +
              '</div><div class="vstrip l"></div></div><div class="mstrip b"></div></div></div>' +
              c(s + 1 + (p ? 1 : 0)) +
              "</div>",
          )
          .join(""),
      f = "التقرير التنفيذي لتحديث الخطة التشغيلية" + (o ? " — " + String(o).split(" الموافق")[0] : ""),
      u =
        '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>' +
        f +
        "</title>" +
        a +
        "<style>" +
        KIVO.BassamCssText.byId("bs-theme-tokens") +
        "</style><style>" +
        l +
        "</style><style>" +
        d +
        "</style></head><body>" +
        g +
        "<\/body></html>", /* «<\/» = «</» حرفاً — الكتلةُ تُضمَّن في <script> بالمونوليث، فلا وسمَ إغلاقٍ حرفيٍّ للجسم في نصّها */
      y = document.getElementById("bs-print-frame");
    y && y.remove();
    const m = document.createElement("iframe");
    ((m.id = "bs-print-frame"),
      m.setAttribute("sandbox", "allow-same-origin allow-modals"),
      m.setAttribute("style", "position:fixed;right:-10000px;top:0;width:1497px;height:1047px;border:0"),
      document.body.appendChild(m));
    const x = m.contentDocument || m.contentWindow.document;
    (x.open(), x.write(u), x.close());
    try {
      KIVO.BassamDigits && KIVO.BassamDigits.watch(x);
    } catch (e9) {}
    const b = (t) =>
        new Promise((e) => {
          const s = (s) => {
            try {
              const e = t.querySelector(".mcv svg");
              if (e) {
                let n = e.getBBox(),
                  i = null;
                try {
                  const t = n.width * n.height;
                  let s = 1 / 0,
                    o = 1 / 0,
                    r = -1 / 0,
                    a = -1 / 0,
                    l = 0;
                  (e.querySelectorAll("path,rect,circle,ellipse,polygon,polyline,text,line").forEach((e) => {
                    let n;
                    try {
                      n = e.getBBox();
                    } catch (t) {
                      return;
                    }
                    if (!n || n.width <= 0 || n.height <= 0) return;
                    if (n.width * n.height > 0.92 * t) return;
                    const i = (e.getAttribute("fill") || "") + "|" + (e.getAttribute("stroke") || "");
                    /none\|none/.test(i) ||
                      ((s = Math.min(s, n.x)), (o = Math.min(o, n.y)), (r = Math.max(r, n.x + n.width)), (a = Math.max(a, n.y + n.height)), l++);
                  }),
                    l > 2 && r > s && a > o && (i = { x: s, y: o, width: r - s, height: a - o }));
                } catch (t) {}
                if (s && i) {
                  const t = Math.min(s.x, i.x),
                    e = Math.min(s.y, i.y);
                  n = {
                    x: t,
                    y: e,
                    width: Math.max(s.x + s.width, i.x + i.width) - t,
                    height: Math.max(s.y + s.height, i.y + i.height) - e,
                  };
                } else s ? (n = s) : i && (n = i);
                if (s && n) {
                  const t = s.x + s.width / 2,
                    e = s.y + s.height / 2,
                    i = Math.max(t - n.x, n.x + n.width - t),
                    o = Math.max(e - n.y, n.y + n.height - e);
                  n = { x: t - i, y: e - o, width: 2 * i, height: 2 * o };
                }
                if (n && n.width > 1 && n.height > 1) {
                  if (s) {
                    const e = t.querySelector(".mcv"),
                      s = e ? e.clientWidth : 0,
                      i = e ? e.clientHeight : 0;
                    if (s > 10 && i > 10) {
                      const t = s / i,
                        e = n.x + n.width / 2,
                        o = n.y + n.height / 2;
                      if (n.width / n.height > t) {
                        const s = n.height * t;
                        n = { x: e - s / 2, y: n.y, width: s, height: n.height };
                      } else {
                        const e = n.width / t;
                        n = { x: n.x, y: o - e / 2, width: n.width, height: e };
                      }
                    }
                  }
                  const i = Math.max(n.width, n.height) * (s ? 0 : 0.06),
                    o = n.width + 2 * i,
                    r = n.height + 2 * i;
                  (e.setAttribute("viewBox", (n.x - i).toFixed(1) + " " + (n.y - i).toFixed(1) + " " + o.toFixed(1) + " " + r.toFixed(1)),
                    e.setAttribute("preserveAspectRatio", "xMidYMid meet"),
                    e.setAttribute("style", "width:100%;height:100%;display:block"));
                }
              }
            } catch (t) {}
            e();
          };
          try {
            const e = t.querySelector(".mcv svg image");
            if (e) {
              const t = +(e.getAttribute("x") || 0),
                n = +(e.getAttribute("y") || 0),
                i = +(e.getAttribute("width") || 1e3),
                o = +(e.getAttribute("height") || 600),
                r = e.getAttribute("preserveAspectRatio") || "xMidYMid meet",
                a = e.getAttribute("href") || e.getAttributeNS("http://www.w3.org/1999/xlink", "href") || "";
              let l = !1;
              const d = new Image(),
                p = () => {
                  if (l) return;
                  l = !0;
                  let e = { x: t, y: n, width: i, height: o };
                  const a = d.naturalWidth || 0,
                    p = d.naturalHeight || 0;
                  if (a > 0 && p > 0 && -1 === r.indexOf("slice") && "none" !== r) {
                    const s = Math.min(i / a, o / p),
                      r = a * s,
                      l = p * s;
                    e = { x: t + (i - r) / 2, y: n + (o - l) / 2, width: r, height: l };
                  }
                  s(e);
                };
              return ((d.onload = p), (d.onerror = p), (d.src = a), void setTimeout(p, 450));
            }
          } catch (t) {}
          s(null);
        }),
      k = () => {
        if (O.kpi) ctx._kpiPrintFit(x);
        try {
          const t = [].slice
            .call(x.querySelectorAll(".pg"))
            .map((t) => {
              const e = t.querySelector(".pn"),
                s = t.querySelector(".pnIn"),
                n = s && s.firstElementChild;
              return e && s && n
                ? { pn: e, inr: s, root: n, availW: e.clientWidth, availH: e.clientHeight, baseW: s.getBoundingClientRect().width || 1 }
                : null;
            })
            .filter(Boolean);
          if (t.length) {
            const e = () =>
              t.forEach((t) => {
                t.need = t.root.getBoundingClientRect().height || 1;
              });
            e();
            let s = 1 / 0;
            if (
              (t.forEach((t) => {
                const e = Math.min(t.availW / t.baseW, t.availH / t.need);
                e > 0 && e < s && (s = e);
              }),
              s > 0 && s !== 1 / 0)
            ) {
              const n = Math.max.apply(
                  null,
                  t.map((t) => t.need),
                ),
                i = t[0].availH,
                o = t[0].availW,
                r = (n * s) / i;
              let a = s;
              if (r < 0.97) {
                const l = 1.15 * s,
                  d = Math.min(l, (0.96 * i) / n),
                  p = o * Math.max(0.6, Math.min(1, r + 0.25)),
                  h = Math.max(560, Math.round(p / d));
                if (h < t[0].baseW - 8) {
                  (t.forEach((t) => {
                    ((t.inr.style.width = h + "px"), (t.baseW = h));
                  }),
                    e());
                  const n = Math.max.apply(
                      null,
                      t.map((t) => t.need),
                    ),
                    r = Math.min(l, (0.96 * i) / n, o / h);
                  r >= s
                    ? (a = r)
                    : (t.forEach((t) => {
                        ((t.inr.style.width = "760px"), (t.baseW = 760));
                      }),
                      e());
                } else a = Math.min(d, o / t[0].baseW);
              }
              t.forEach((t) => {
                const e = t.availH / a - t.need;
                if (e > 12) {
                  const s = [].filter.call(t.root.querySelectorAll('div[style*="border-radius: 12px"]'), (e) => {
                    if (e.getBoundingClientRect().height < 26) return !1;
                    const s = e.parentElement && e.parentElement.closest && e.parentElement.closest('div[style*="border-radius: 12px"]');
                    return !(s && t.root.contains(s));
                  });
                  if (s.length > 1) {
                    const t = Math.min(26, e / (s.length - 1));
                    s.forEach((e, s) => {
                      s && (e.style.marginTop = (parseFloat(e.style.marginTop) || 0) + t + "px");
                    });
                  }
                }
                ((t.inr.style.transform = "scale(" + a.toFixed(4) + ")"),
                  (t.pn.style.width = Math.ceil(Math.min(t.availW, t.baseW * a)) + 2 + "px"),
                  t.root.getBoundingClientRect().height < t.availH / a - 1 && (t.root.style.minHeight = Math.floor(t.availH / a) - 4 + "px"));
              });
            }
          }
        } catch (t) {}
        Promise.all([].map.call(x.querySelectorAll(".pg"), b))
          .then(() => KIVO.BassamCssText.fontData())
          .then(() =>
            Promise.all(
              [].map.call(
                x.querySelectorAll(".pg .mcv svg"),
                (t) =>
                  new Promise((e) => {
                    try {
                      const s = t.getBoundingClientRect();
                      if (!(s.width > 10 && s.height > 10)) return void e();
                      const n = 2,
                        i = Math.min(4200, Math.round(s.width * n)),
                        o = Math.min(4200, Math.round(s.height * n)),
                        r = t.cloneNode(!0);
                      (r.removeAttribute("style"),
                        r.setAttribute("width", i),
                        r.setAttribute("height", o),
                        r.setAttribute("xmlns", "http://www.w3.org/2000/svg"));
                      try {
                        let t = KIVO.BassamCssText.byId("bs-theme-tokens") + "\n";
                        if (
                          ([].forEach.call(KIVO.BassamCssText.fontSheets(), (e) => {
                            let s;
                            try {
                              s = e.cssRules;
                            } catch (t) {
                              return;
                            }
                            s &&
                              [].forEach.call(s, (e) => {
                                5 === e.type &&
                                  /data:font/.test(e.cssText) &&
                                  (/Almarai/.test(e.cssText) || /font-weight:\s*800/.test(e.cssText)) &&
                                  (t += e.cssText + "\n");
                              });
                          }),
                          t)
                        ) {
                          const e = r.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "style");
                          ((e.textContent = t), r.insertBefore(e, r.firstChild));
                        }
                      } catch (t) {}
                      const a = new XMLSerializer().serializeToString(r),
                        l = URL.createObjectURL(new Blob([a], { type: "image/svg+xml;charset=utf-8" })),
                        d = new Image();
                      let p = !1;
                      const h = (s) => {
                        if (!p) {
                          p = !0;
                          try {
                            URL.revokeObjectURL(l);
                          } catch (t) {}
                          if (s)
                            try {
                              const e = document.createElement("canvas");
                              ((e.width = i), (e.height = o));
                              const s = e.getContext("2d");
                              ((s.fillStyle = "#ffffff"), s.fillRect(0, 0, i, o), s.drawImage(d, 0, 0, i, o));
                              const n = e.toDataURL("image/jpeg", 0.86),
                                r = x.createElement("img");
                              ((r.src = n),
                                r.setAttribute("style", "width:100%;height:100%;display:block;object-fit:contain"),
                                t.parentNode.replaceChild(r, t));
                            } catch (t) {}
                          e();
                        }
                      };
                      ((d.onload = () => h(!0)), (d.onerror = () => h(!1)), setTimeout(() => h(!1), 4500), (d.src = l));
                    } catch (t) {
                      e();
                    }
                  }),
              ),
            ),
          )
          .then(
            () => {
              n();
              let t = null,
                e = null;
              try {
                ((t = document.title), (document.title = f));
              } catch (t) {}
              try {
                window.top && window.top !== window && window.top.document && ((e = window.top.document.title), (window.top.document.title = f));
              } catch (t) {}
              if (O.kpi)
                try {
                  ctx._kpiPrintFit(x);
                } catch (t) {}
              try {
                (m.contentWindow.focus(), m.contentWindow.print());
              } catch (t) {}
              setTimeout(() => {
                (() => {
                  try {
                    null != t && (document.title = t);
                  } catch (t) {}
                  try {
                    null != e && window.top && window.top.document && (window.top.document.title = e);
                  } catch (t) {}
                })();
                try {
                  m.remove();
                } catch (t) {}
              }, 1200);
            },
            () => {
              n();
              try {
                (m.contentWindow.focus(), m.contentWindow.print());
              } catch (t) {}
              setTimeout(() => {
                try {
                  m.remove();
                } catch (t) {}
              }, 1200);
            },
          );
      },
      v = () => {
        try {
          m.contentWindow.requestAnimationFrame(() => setTimeout(k, 80));
        } catch (t) {
          setTimeout(k, 350);
        }
      };
    try {
      x.fonts && x.fonts.ready ? x.fonts.ready.then(v).catch(v) : setTimeout(v, 550);
    } catch (t) {
      setTimeout(v, 550);
    }
  }
  function capture(ctx, t, zoomSel) {
    const e = ctx.state || {},
      s = document.querySelector(zoomSel),
      n = document.querySelector(".bs-panel-shell > div");
    if (!s || !n) return null;
    const i = s.cloneNode(!0);
    (i.removeAttribute("style"),
      i.setAttribute("style", "width:100%;height:100%;display:block"),
      i.setAttribute("preserveAspectRatio", "xMidYMid meet"));
    const o = n.cloneNode(!0);
    (o.setAttribute(
      "style",
      "position:relative;inset:auto;transform:none;opacity:1;box-shadow:none;display:flex;flex-direction:column;height:auto;border:1.8px solid var(--bd-a185151810p55);border-radius:16px;background:var(--bg-a185151810p055);overflow:visible",
    ),
      o.querySelectorAll("*").forEach((t) => {
        const e = t.getAttribute("style") || "";
        (/overflow|max-height/.test(e) &&
          t.setAttribute(
            "style",
            e.replace(/overflow-y?\s*:\s*[^;]+;?/g, "").replace(/max-height\s*:\s*[^;]+;?/g, "") + ";overflow:visible;max-height:none",
          ),
          "BUTTON" === t.tagName && (t.style.display = "none"),
          t.classList && (t.classList.contains("bs-mixtabs") || t.classList.contains("bs-subseg")) && (t.style.display = "none"));
      }),
      o.querySelectorAll("span,div,b,h1,h2,h3,h4").forEach((t) => {
        if (t.children.length > 1) return;
        const e = (t.textContent || "").trim();
        if (!e || e.length > 34) return;
        const s = parseFloat(t.style.fontSize) || 0;
        if (/^بحسب /.test(e)) {
          t.style.fontSize = "15px";
          const e = t.parentElement;
          if (e && /9999/.test(e.getAttribute("style") || "")) {
            ((e.style.padding = "5px 16px"), (e.style.gap = "7px"), (e.style.border = "1.5px solid rgba(185,151,81,0.35)"));
            const t = e.querySelector("svg");
            t && (t.setAttribute("width", "13"), t.setAttribute("height", "13"));
          }
        } else
          "عناصر الخريطة" === e
            ? (t.style.fontSize = (s ? Math.round(1.5 * s) : 22) + "px")
            : "استعراض وتحديد سريع للمصليات" === e
              ? (t.style.fontSize = (s ? Math.round(1.25 * s) : 13) + "px")
              : "مؤشرات المصليات" === e
                ? ((t.style.fontSize = (s ? Math.round(1.45 * s) : 16) + "px"), (t.style.fontWeight = "900"))
                : ("إجمالي المصليات" !== e && "سجل المصليات" !== e) || (t.style.fontSize = (s ? Math.round(1.35 * s) : 13) + "px");
      }));
    try {
      const t = [].find.call(o.querySelectorAll("*"), (t) => "عناصر الخريطة" === (t.textContent || "").trim());
      let e = t;
      for (let t = 0; e && t < 5; t++) {
        const t = (e.getAttribute && e.getAttribute("style")) || "";
        if (/background/.test(t)) {
          e.style.background = "var(--bg-a185151810p05)";
          break;
        }
        e = e.parentElement;
      }
      const s = e || (t && t.parentElement && t.parentElement.parentElement);
      s &&
        s.querySelectorAll("span,div").forEach((t) => {
          const e = parseFloat(t.style.width) || 0,
            s = parseFloat(t.style.height) || 0;
          if (e >= 18 && e <= 60 && s >= 18 && s <= 60 && t.querySelector("svg")) {
            ((t.style.width = Math.round(1.5 * e) + "px"),
              (t.style.height = Math.round(1.5 * s) + "px"),
              (t.style.borderRadius = Math.round(Math.max(10, 0.42 * e)) + "px"));
            const n = t.querySelector("svg");
            try {
              const t = parseFloat(n.getAttribute("width")) || 0,
                e = parseFloat(n.getAttribute("height")) || t;
              t && (n.setAttribute("width", Math.round(1.5 * t)), n.setAttribute("height", Math.round(1.5 * e)));
            } catch (t) {}
          }
        });
    } catch (t) {}
    try {
      o.querySelectorAll("div").forEach((t) => {
        const e = t.getAttribute("style") || "";
        if (!/width:\s*64px/.test(e) || !/height:\s*64px/.test(e) || !/place-items:\s*center/.test(e)) return;
        const s = t.querySelector('svg[viewBox="0 0 64 64"]');
        s &&
          ((t.style.width = "96px"),
          (t.style.height = "96px"),
          s.setAttribute("width", "96"),
          s.setAttribute("height", "96"),
          t.querySelectorAll("span").forEach((t) => {
            const e = parseFloat(t.style.fontSize) || 0;
            e >= 14 && (t.style.fontSize = Math.round(1.5 * e) + "px");
          }));
      });
    } catch (t) {}
    return (
      o.querySelectorAll("div").forEach((t) => {
        const e = t.getAttribute("style") || "";
        /display:\s*grid/.test(e) &&
          /place-items:\s*center/.test(e) &&
          [].forEach.call(t.children, (t) => {
            try {
              ((t.style.gridArea = "1 / 1"),
                (t.style.placeSelf = "center"),
                /absolute/.test(t.style.position || "") && ((t.style.position = "static"), (t.style.inset = "auto")));
            } catch (t) {}
          });
      }),
      { name: ((e.floors || [])[t] || {}).name || "موقع بلا اسم", svg: i.outerHTML, panel: o.outerHTML, panelW: 760 }
    );
  }
  KIVO.BassamPrintCore = { build: build, capture: capture };
})();
