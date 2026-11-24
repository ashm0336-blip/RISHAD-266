/* ═══ نواةُ الطباعة المشتركة — «المتابعة اليومية» و«التشغيل الميداني» (KIVO_258 · AUD-013) ═══
   كان في كلٍّ من الوحدتين نسخةٌ من بانيه (_buildPrintDoc ≈ 22–24 KB) ومن لاقطِ الموقع (_capturePrintPage) — 0.78/0.90 تشابهاً في التدقيق؛
   الفروقُ الحقيقية أربعة وتصير خياراتٍ صريحة: سطرُ التاريخ (يومُ الجولة · اليوم) · صفحةُ المؤشرات وطيُّها (المتابعة وحدها) · نمطُ <i> في التذييل ·
   رقمُ الإصدار في التذييل؛ ومحدِّدُ خريطة الموقع في اللاقط. الشعارُ يمرّ من الوحدة (يُضمَّن فيها عند التركيب — @@KIVO_INLINE@@).
   البرهان: cfbench/k258print.mjs — وثيقتا الطباعة للوحدتين = ما كانت تبنيه نسختاهما (258 ↔ 257) حرفاً، وk254print = KIVO_240 بنيةً. */
(function () {
  /* ═══ قرار المالك 2026-11-11: أيقونةُ الطابعة تُنزل ملفَّ PDF مباشرةً — بلا نافذة طباعة — يُفتح فوراً كأيّ ملف ═══
     ملفُّ الطباعة من المتصفح كان «تعليماتِ رسم» (تدرّجات · نقوش · مئاتُ المستطيلات) يعيدها القارئُ عند كل فتح، فيُرسم الملفُّ أمام المستخدم كصفحة ويب.
     هنا كلُّ صفحةٍ من وثيقة الطباعة نفسِها (التصميمُ نفسُه) تُرسم صورةً واحدة جاهزة، وتُجمع الصورُ في ملف PDF يُكتب هنا حرفاً — بلا مكتبةٍ ولا خادم.
     الوثيقةُ مكتفيةٌ بذاتها (أنماطُها وخطوطُها data: وصورُها data:) فتُرسم داخل SVG foreignObject كما يرسمها المتصفحُ في الصفحة.
     أيُّ تعذّرٍ (متصفحٌ يمنع قراءةَ اللوحة · مهلة) ⇒ false، فيعود المنادي إلى نافذة الطباعة كما كانت. */
  const WHITE = "#ffffff", PDF_Q = 0.92, PT = 72 / 25.4, PG_W = 420 * PT, PG_H = 297 * PT, M_X = 12 * PT, M_TOP = 12 * PT;
  function pageImage(x, pg, css, PDF_SCALE) {
    return new Promise((ok, no) => {
      try {
        const r = pg.getBoundingClientRect(), w = Math.round(r.width), h = Math.round(r.height);
        if (!(w > 10 && h > 10)) return no(new Error("page size"));
        const xml = new XMLSerializer().serializeToString(pg),
          svg =
            '<svg xmlns="http://www.w3.org/2000/svg" width="' + w * PDF_SCALE + '" height="' + h * PDF_SCALE + '" viewBox="0 0 ' + w + " " + h + '">' +
            '<foreignObject x="0" y="0" width="' + w + '" height="' + h + '">' +
            '<html xmlns="http://www.w3.org/1999/xhtml" lang="ar" dir="rtl"><head><style>' +
            css.replace(/]]>/g, "]] >").replace(/&/g, "&amp;").replace(/</g, "&lt;") +
            "<\/style><\/head><body>" + xml + "<\/body><\/html><\/foreignObject><\/svg>",   /* «<\/» = «</» حرفاً — لا وسمَ إغلاقٍ حرفيّ في نصّ الكتلة (تُضمَّن في <script> بالمونوليث) */
          img = new Image();
        let done = !1;
        const fin = (good) => {
          if (done) return;
          done = !0;
          if (!good) return no(new Error("page image"));
          try {
            const c = document.createElement("canvas");
            ((c.width = w * PDF_SCALE), (c.height = h * PDF_SCALE));
            const g = c.getContext("2d");
            ((g.fillStyle = WHITE), g.fillRect(0, 0, c.width, c.height), g.drawImage(img, 0, 0, c.width, c.height));
            const d = c.toDataURL("image/jpeg", PDF_Q);
            if (!(d.length > 2e3 && 0 === d.indexOf("data:image/jpeg"))) throw new Error("canvas " + c.width + "x" + c.height);   /* لوحةٌ أكبر من حدّ المتصفح تعود فارغة بلا خطأ */
            const b = atob(d.slice(d.indexOf(",") + 1)), u = new Uint8Array(b.length);
            for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
            ((c.width = 1), (c.height = 1));
            ok({ jpg: u, pw: w * PDF_SCALE, ph: h * PDF_SCALE, w: w, h: h });
          } catch (e) {
            no(e);
          }
        };
        ((img.onload = () => fin(!0)), (img.onerror = () => fin(!1)), setTimeout(() => fin(!1), 2e4));
        /* data: لا blob: — صورةُ SVG فيها foreignObject من رابط blob تلوّث اللوحة في Chrome فيُمنع toDataURL؛ من data: لا تتلوّث */
        img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
      } catch (e) {
        no(e);
      }
    });
  }
  function pdfBytes(pages, title) {
    const enc = new TextEncoder(), parts = [], offs = [];
    let len = 0;
    const put = (v) => {
        const u = typeof v === "string" ? enc.encode(v) : v;
        (parts.push(u), (len += u.length));
      },
      obj = (n, body, stream) => {
        offs[n] = len;
        put(n + " 0 obj\n" + body + "\n");
        if (stream) (put("stream\n"), put(stream), put("\nendstream\n"));
        put("endobj\n");
      },
      hex = (t) => {
        let o = "FEFF";
        for (let i = 0; i < t.length; i++) o += ("000" + t.charCodeAt(i).toString(16)).slice(-4);
        return "<" + o.toUpperCase() + ">";
      },
      N = pages.length, kids = [];
    put("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
    for (let i = 0; i < N; i++) kids.push(4 + 3 * i + " 0 R");
    obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
    obj(2, "<< /Type /Pages /Count " + N + " /Kids [" + kids.join(" ") + "] >>");
    obj(3, "<< /Title " + hex(title) + " /Producer (KIVO) >>");
    pages.forEach((p, i) => {
      /* V7 · 53 (ملحق 6 · البند 10): full = الغلاف — الصفحةُ كاملةً بلا هوامش */
      const a = 4 + 3 * i, wPt = p.full ? PG_W : (p.w * 72) / 96, hPt = p.full ? PG_H : (p.h * 72) / 96,
        cm = "q " + wPt.toFixed(2) + " 0 0 " + hPt.toFixed(2) + " " + (p.full ? 0 : M_X).toFixed(2) + " " + (p.full ? 0 : PG_H - M_TOP - hPt).toFixed(2) + " cm /Im0 Do Q";
      obj(a, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + PG_W.toFixed(2) + " " + PG_H.toFixed(2) + "] /Resources << /XObject << /Im0 " + (a + 2) + " 0 R >> >> /Contents " + (a + 1) + " 0 R >>");
      obj(a + 1, "<< /Length " + cm.length + " >>", cm);
      obj(a + 2, "<< /Type /XObject /Subtype /Image /Width " + p.pw + " /Height " + p.ph + " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + p.jpg.length + " >>", p.jpg);
    });
    const total = 3 + 3 * N, xref = len;
    let t = "xref\n0 " + (total + 1) + "\n0000000000 65535 f \n";
    for (let n = 1; n <= total; n++) t += ("0000000000" + offs[n]).slice(-10) + " 00000 n \n";
    put(t + "trailer\n<< /Size " + (total + 1) + " /Root 1 0 R /Info 3 0 R >>\nstartxref\n" + xref + "\n%%EOF\n");
    const out = new Uint8Array(len);
    let o = 0;
    parts.forEach((u) => {
      (out.set(u, o), (o += u.length));
    });
    return out;
  }
  /* صورةُ الصفحة تُرسم كما رُتّبت في إطار الطباعة: شروطُ ‎@media‎ تُثبَّت بحكم نافذة الإطار (all / not all) قبل تضمين الأنماط في الصورة.
     صورةُ SVG لا مؤشّرَ لها ولا hover وعرضُها عرضُ الصورة المكبَّرة، فتُقيَّم الشروطُ فيها على غير ما قِيست عليه الصفحة: قاعدةُ الخطة
     ‎@media (hover:hover) and (pointer:fine){.bs-oreg{display:none}}‎ كانت تسقط داخل الصورة فيظهر سجلُّ اللمس في الملف وحده ويدفع إطارَ
     «عناصر الخريطة» السفليَّ تحت حدّ القصّ (ملاحظةُ المالك 2026-11-12). التعليقاتُ تُتخطّى، وشرطٌ يتعذّر تقييمُه يبقى كما هو */
  function frozenMedia(css, matches) {
    return String(css || "").replace(/\/\*[\s\S]*?\*\/|@media\b([^{};]*)\{/g, (all, q) => {
      if (void 0 === q) return all;
      try {
        return "@media " + (matches(q.trim()) ? "all" : "not all") + "{";
      } catch (e) {
        return all;
      }
    });
  }
  /* ═══ V7 · 53 (ملحق 6 · البند 9 — سلوكُ البرودكشن 9ff484d · c26d55f · ba52a5d · d071fc9 بأدوات النواة): PDF على الآيباد والآيفون ═══
     كلُّ متصفحات أجهزة أبل على محرّك سفاري، وثلاثةُ أسبابٍ فيه كانت تُسقط التنزيلَ إلى نافذة الطباعة:
     (1) إطارُ الطباعة محميٌّ (sandbox بلا allow-scripts) فلا يُنفَّذ نداءٌ يُسجَّل على نافذته: الانتظارُ بإطاره (requestAnimationFrame · fonts.ready بلا مهلة)
         لا ينتهي ← الانتظارُ من الصفحة نفسِها وبمهلة (أسفل build)
     (2) صورةُ الصفحة (SVG foreignObject) تخرج فيه ناقصة (بلا اللوحة الجانبية ولا الشعار) أو تُمنع قراءةُ لوحتها (SecurityError) ← تُرسم الصفحةُ بمكتبة
         html2canvas (ترسم على اللوحة مباشرةً بلا foreignObject) — من البداية في سفاري، وعند أول رفضٍ في غيره
     (3) المكتبةُ لا تعمل داخل الإطار المحمي ← تُرسم من نسخةٍ للصفحة في إطارٍ مخفيّ مؤقّت يُحذف بعدها؛ وإطارُ الطباعة يبقى محمياً كما كان.
     المكتبةُ ملفٌّ في الحزمة (CSP: script-src 'self') لا يُحمَّل إلا حين يلزم، والملفُّ يُجمع بالبنّاء نفسِه (pdfBytes). */
  function isWK() {
    try {
      return /^Apple/.test(navigator.vendor || "");   /* «Apple Computer, Inc.» في محرّك سفاري وحده (الآيباد والآيفون بكل متصفحاتهما، وسفاري على الماك) */
    } catch (e) {
      return !1;
    }
  }
  const H2C_URL = "@@KIVO_ASSET:vendor/html2canvas-1.4.1.min.js@@";
  let h2cP = null;
  function h2c() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    if (!/^\/assets\//.test(H2C_URL)) return Promise.reject(new Error("html2canvas unavailable"));   /* حزمةُ المونوليث (اختبار): لا ملفاتِ أصول */
    if (!h2cP)
      h2cP = new Promise((ok, no) => {
        const s = document.createElement("script");
        ((s.src = H2C_URL), (s.async = !0));
        ((s.onload = () => (window.html2canvas ? ok(window.html2canvas) : no(new Error("html2canvas missing")))), (s.onerror = () => no(new Error("html2canvas load"))));
        document.head.appendChild(s);
      }).catch((e) => ((h2cP = null), Promise.reject(e)));
    return h2cP;
  }
  function jpegOf(c) {
    const d = c.toDataURL("image/jpeg", PDF_Q);
    if (!(d.length > 2e3 && 0 === d.indexOf("data:image/jpeg"))) throw new Error("canvas " + c.width + "x" + c.height);
    const b = atob(d.slice(d.indexOf(",") + 1)), u = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    return u;
  }
  function pageImageAlt(pg, PDF_SCALE) {
    return h2c().then((H) => {
      const r = pg.getBoundingClientRect(), w = Math.round(r.width), h = Math.round(r.height);
      if (!(w > 10 && h > 10)) throw new Error("page size");
      /* المكتبةُ ترسم النصَّ حرفاً حرفاً حين يكون للعنصر تباعدُ أحرف فتنفصل حروفُ العربية — في نسختها المرسومة وحدها يُصفَّر التباعد */
      const flat = (doc) => {
        try {
          const st = doc.createElement("style");
          ((st.textContent = ".pg, .pg * { letter-spacing: 0 !important; }"), (doc.head || doc.documentElement).appendChild(st));
        } catch (e) {}
      };
      const tmo = new Promise((t, no) => setTimeout(() => no(new Error("html2canvas timeout")), 6e4));
      return Promise.race([tmo, H(pg, { scale: PDF_SCALE, width: w, height: h, backgroundColor: WHITE, logging: !1, useCORS: !1, foreignObjectRendering: !1, imageTimeout: 2e4, onclone: flat })]).then((c) => {
        const u = jpegOf(c), pw = c.width, ph = c.height;
        ((c.width = 1), (c.height = 1));
        return { jpg: u, pw: pw, ph: ph, w: w, h: h };
      });
    });
  }
  /* ستارُ الانتظار أثناء صنع الملف: نصٌّ صادق («جاري تحميل الملف…» لا «الطباعة») وسطرُ تقدّمٍ بالصفحة ن من م — على الآيباد يأخذ الملفُّ ثوانيَ كثيرة؛
     والستارُ يغطي الشاشة فلا يُضغط الزرُّ مرتين. data-pdf يُبقيه بعد مؤقّت الأمان في الوحدة (30 ث) حتى يجهز الملف */
  function veilSay(msg, sub) {
    try {
      const v = document.getElementById("bs-print-veil");
      if (!v) return;
      v.dataset.pdf = "1";
      const t = v.children[1];
      t && (t.textContent = msg);
      let u = v.querySelector(".bs-veil-sub");
      if (!u) {
        u = document.createElement("div");
        u.className = "bs-veil-sub";
        u.setAttribute("style", "font-size:12.5px;font-weight:600;color:var(--fg-x475569);opacity:.85");
        t && t.parentNode === v ? v.insertBefore(u, t.nextSibling) : v.appendChild(u);
      }
      u.textContent = sub || "";
      /* V7 · 53 (nosilent · REVIEW 26 ب7): «إلغاء» آمن على الستار نفسِه — يتوقّف الصنعُ بعد الصفحة الجارية، ولا يُنزَّل ملفٌّ ناقص */
      if (PDF_RUN53 && !v.querySelector(".bs-veil-stop")) {
        const b = document.createElement("button");
        ((b.type = "button"), (b.className = "bs-veil-stop"), (b.textContent = "إلغاء"));
        b.setAttribute("style", "margin-top:6px;height:36px;padding:0 22px;border:1px solid var(--bd-a185151810p22);border-radius:10px;background:transparent;color:var(--fg-x475569);font:600 13px Cairo,sans-serif;cursor:pointer");
        b.addEventListener("click", () => {
          if (!PDF_RUN53) return;
          PDF_RUN53.stop = !0;
          ((b.disabled = !0), (b.textContent = "يتوقّف بعد الصفحة الجارية…"));
        });
        v.appendChild(b);
      }
    } catch (e) {}
  }
  let PDF_RUN53 = null;
  const PDF_STOP53 = new Error("pdf-cancelled");
  /* أجهزةُ أبل اللمسية (الآيباد والآيفون) — وخاصةً المنصةُ مفتوحةً تطبيقاً من الشاشة الرئيسية — لا تحفظ رابطَ التنزيل المباشر (a[download]): يُصنع الملفُّ
     ثم لا يُحفظ في أي مكان. فتُعرض شاشةُ «الملف جاهز» بزرٍّ يفتح قائمةَ المشاركة في الجهاز (حفظ في الملفات · واتساب · بريد · طباعة).
     الزرُّ لازم: قائمةُ المشاركة لا تُفتح إلا بلمسةٍ من المستخدم، ولمسةُ الطابعة انتهت صلاحيتُها أثناء صنع الصفحات. والحاسوبُ يبقى على التنزيل المباشر */
  function shareMode(file) {
    try {
      const touch = (navigator.maxTouchPoints || 0) > 1 || /iPad|iPhone|iPod/.test(navigator.userAgent || "");
      return !!(isWK() && touch && typeof navigator.share === "function" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] }));
    } catch (e) {
      return !1;
    }
  }
  function pdfReady(file) {
    try {
      const old = document.getElementById("bs-print-veil");
      old && old.remove();
      const prev = document.getElementById("bs-pdf-ready");
      prev && prev.remove();
      const v = document.createElement("div"), name = file.name.replace(/\.pdf$/, "");
      ((v.id = "bs-pdf-ready"), v.setAttribute("dir", "rtl"), v.setAttribute("role", "dialog"), v.setAttribute("aria-label", "الملف جاهز"));
      v.setAttribute(
        "style",
        "position:fixed;inset:0;z-index:99999;background:var(--bg-a2552552550p97);display:flex;align-items:center;justify-content:center;font-family:'Cairo',sans-serif;padding:24px",
      );
      const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
      v.innerHTML =
        '<div style="display:flex;flex-direction:column;align-items:center;gap:12px;max-width:420px;width:100%;text-align:center">' +
        '<div style="width:58px;height:58px;border-radius:9999px;background:var(--bg-x008450);color:var(--fg-xffffff);display:flex;align-items:center;justify-content:center"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>' +
        '<div style="font-size:18px;font-weight:700;color:var(--fg-x8a6f35)">الملف جاهز</div>' +
        '<div style="font-size:12.5px;font-weight:600;color:var(--fg-x475569);word-break:break-word">' + esc(name) + "</div>" +
        '<button type="button" data-act="share" style="margin-top:8px;width:100%;height:48px;border:0;border-radius:12px;background:var(--bg-xb99751);color:var(--fg-xffffff);font:700 15px Cairo,sans-serif;cursor:pointer">حفظ أو مشاركة الملف</button>' +
        '<button type="button" data-act="close" style="width:100%;height:44px;border:1px solid var(--bd-a185151810p22);border-radius:12px;background:transparent;color:var(--fg-x475569);font:600 14px Cairo,sans-serif;cursor:pointer">إغلاق</button>' +
        '<div style="font-size:11.5px;color:var(--fg-x475569);opacity:.8;line-height:1.7">من القائمة اختر «حفظ في الملفات» أو التطبيق الذي تريد الإرسال إليه</div>' +
        "</div>";
      const close = () => {
        try {
          v.remove();
        } catch (e) {}
      };
      v.addEventListener("click", (ev) => {
        const b = ev.target && ev.target.closest && ev.target.closest("button[data-act]");
        if (!b) return;
        if (b.dataset.act === "close") return void close();
        navigator.share({ files: [file], title: name }).then(
          () => {
            close();
            try {
              KIVO.BassamBusy && KIVO.BassamBusy.flash("تم حفظ التقرير PDF", "", "ok");
            } catch (e) {}
          },
          (e) => {
            /* إلغاءُ المستخدم لقائمة المشاركة ليس خطأً: تبقى الشاشةُ ليعيد أو يغلق */
            if (!(e && e.name === "AbortError"))
              try {
                console.warn("[print-pdf] share", e);
              } catch (e2) {}
          },
        );
      });
      document.body.appendChild(v);
      return !0;
    } catch (e) {
      return !1;
    }
  }
  /* ── V7 · 53 (ملحق 6 · البند 10 — سلوكُ البرودكشن 6171818): غلافُ التقرير صفحةً أولى في ملف PDF (تصميمُ المالك) ──
     الخلفيةُ والأشكالُ والشعاران من ملف التصميم الأصلي (صورةٌ واحدة بقياس A3 — src/assets/images/report-cover.jpg، لا تُحمَّل إلا عند الطباعة)،
     والنصوصُ من المنصة: العنوان، وسطرُ «لتحديث الخطة التشغيلية لعام <السنة الميلادية للتقرير>م» بخطٍّ ينتهي مع نهاية العنوان، واسما الإدارة العامة والإدارة.
     يُرسم على لوحة رسمٍ مباشرةً (لا نسخَ للوثيقة) فيخرج واحداً على الحاسوب والآيباد. إن تعذّر تحميلُ الخلفية خرج الملفُّ بلا غلاف ولم يتعطّل */
  const COVER_URL = "@@KIVO_ASSET:img/report-cover.jpg@@";
  function coverPage(info) {
    const W = 2480, H = 1754, MM = W / 420, ar = (t) => String(t).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
    const img = new Image();
    const loaded = new Promise((ok, no) => {
      img.onload = () => ok();
      img.onerror = () => no(new Error("cover image"));
      img.src = COVER_URL;
    });
    const fonts = (() => {
      try {
        return Promise.race([Promise.all(["700 80px Cairo", "600 40px Cairo", "500 40px Cairo"].map((f) => document.fonts.load(f, "التقرير"))), new Promise((t) => setTimeout(t, 3e3))]);
      } catch (e) {
        return Promise.resolve();
      }
    })();
    return Promise.race([Promise.all([loaded, fonts.catch(() => {})]), new Promise((t, no) => setTimeout(() => no(new Error("cover timeout")), 2e4))]).then(() => {
      const c = document.createElement("canvas");
      ((c.width = W), (c.height = H));
      const g = c.getContext("2d");
      g.drawImage(img, 0, 0, W, H);
      ((g.direction = "rtl"), (g.textBaseline = "alphabetic"), (g.fillStyle = WHITE));
      /* العنوان */
      const tR = W * 0.92, tSize = 21 * MM, title = "التقرير التنفيذي";
      ((g.font = "700 " + tSize + "px Cairo, sans-serif"), (g.textAlign = "right"));
      const tW = g.measureText(title).width, tBase = H * 0.406 + tSize * 0.93;
      g.fillText(title, tR, tBase);
      /* السطرُ تحته: خطٌّ ثم النص، وينتهي الصفُّ عند نهاية العنوان */
      /* V7 · 53 تقويم (§7): سنةُ التقرير ميلادية («لعام ٢٠٢٦م») */
      const sub = "لتحديث الخطة التشغيلية" + (info.year ? " لعام " + ar(info.year) + "م" : ""), sSize = 6.6 * MM, gap = 3.5 * MM;
      g.font = "500 " + sSize + "px Cairo, sans-serif";
      const sW = g.measureText(sub).width, lineLen = Math.max(8 * MM, tW - sW - gap), sBase = tBase + 6.5 * MM + sSize * 1.15;
      g.globalAlpha = 0.95;
      g.fillText(sub, tR - lineLen - gap, sBase);
      g.fillRect(tR - lineLen, sBase - sSize * 0.42, lineLen, 0.5 * MM);
      /* V7 · 53 تقويم (القاعدة 11): السنةُ الهجرية المقابلة سطرٌ صغير تحت السنة الميلادية («١٤٤٨هـ»)، في نهاية الصف نفسِه */
      if (info.hyear) { const hSize = 4.4 * MM; g.font = "500 " + hSize + "px Cairo, sans-serif"; g.globalAlpha = 0.8; g.fillText(ar(info.hyear) + "هـ", tR - lineLen - gap, sBase + hSize * 1.45); }
      g.globalAlpha = 1;
      /* الإدارةُ العامة والإدارة — في وسط صندوقهما، ويصغر الخطُّ إن طال الاسم */
      const lines = [info.group, info.dept].filter((t) => t && String(t).trim()), bx = W * (0.242 + 0.316 / 2), by = H * (0.65 + 0.226 / 2), maxW = W * 0.316 - 10 * MM;
      if (lines.length) {
        let dSize = 7.4 * MM;
        g.font = "600 " + dSize + "px Cairo, sans-serif";
        const widest = Math.max.apply(null, lines.map((t) => g.measureText(t).width));
        if (widest > maxW) dSize *= maxW / widest;
        ((g.font = "600 " + dSize + "px Cairo, sans-serif"), (g.textAlign = "center"), (g.fillStyle = "#f4ecdc"));
        const lh = dSize * 1.45, top = by - (lh * lines.length) / 2;
        lines.forEach((t, k) => g.fillText(t, bx, top + lh * k + dSize * 1.05));
      }
      const u = jpegOf(c);
      ((c.width = 1), (c.height = 1));
      return { jpg: u, pw: W, ph: H, w: W, h: H, full: !0 };
    });
  }
  /* بياناتُ الغلاف: سنةُ التقرير من سطر تاريخه (يومُ الجولة · اليوم) وإلا السنةُ الجارية، والإدارةُ والإدارةُ العامة النشطتان
     V7 · 53 تقويم (§7): السنةُ ميلادية — أولُ سنةٍ ميلادية (19xx–21xx) في سطر التاريخ (قبل «الموافق» الهجري)، وإلا سنةُ اليوم التشغيلي الميلادي */
  function coverInfo(dateLine, dept) {
    let yr = (String(dateLine || "").match(/(?:^|[^\d])((?:19|20|21)\d{2})(?!\d)/) || [])[1] || "", grp = "";
    if (!yr)
      try {
        yr = String(KIVO.BassamCal.gToday().y || "");
      } catch (e) {}
    /* والسنةُ الهجرية المقابلة للسطر الصغير: سنةُ «الموافق» في سطر التاريخ، وإلا هجريُّ اليوم التشغيلي */
    let hy = (String(dateLine || "").match(/(?:^|[^\d])(1[3-5]\d{2})(?!\d)/) || [])[1] || "";
    if (!hy)
      try {
        hy = String((KIVO.BassamCal.hOf(KIVO.BassamCal.gToday().k) || {}).y || "");
      } catch (e) {}
    try {
      grp = (KIVO.BassamDepts && KIVO.BassamDepts.activeGroupName && KIVO.BassamDepts.activeGroupName()) || "";
    } catch (e) {}
    return { dept: dept || "", group: grp, year: yr, hyear: hy };
  }
  function pdfDownload(x, title, cov) {
    let end = (r) => r;
    try {
      const pgs = [].slice.call(x.querySelectorAll(".pg"));
      if (!pgs.length) return Promise.resolve(!1);
      const N = pgs.length, say = (k) => veilSay("جاري تحميل الملف…", N > 1 ? "الصفحة " + (k + 1) + " من " + N : "صفحة واحدة");
      /* V7 · 53 (nosilent · REVIEW 26 ب3/ب7): التشغيلةُ الجارية (لزرّ «إلغاء») ورمزٌ في مؤشر التحميل الموحّد يُبقي سؤالَ المغادرة قائماً حتى تنتهي */
      const run = (PDF_RUN53 = { stop: !1 }), B = KIVO.BassamBusy, tk = B ? B.start("جاري تحميل الملف…", { btn: null }) : null;
      end = (r) => (PDF_RUN53 === run && (PDF_RUN53 = null), tk && tk.done(), r);
      say(0);
      const css = frozenMedia(
          [].map.call(x.querySelectorAll("style"), (t) => t.textContent || "").join("\n"),
          (q) => x.defaultView.matchMedia(q).matches,
        ),
        imgs = [];
      /* الدقّة: ×4 (384 نقطة/بوصة على A3) على الحاسوب، و×3 على أجهزة اللمس (لوحةُ الرسم محدودةُ المساحة فيها). إن رفض المتصفحُ قياساً نزلنا
         إلى الذي يليه وثبتنا عليه لبقية الصفحات — ولا ملفَّ إلا إن نجحت الصفحاتُ كلُّها */
      let coarse = !1;
      try {
        coarse = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
      } catch (e) {}
      /* سفاري: الرسّامُ البديل من البداية بدقّة ×2 (حدُّ لوحة الرسم في أجهزة أبل أصغر) — وفي غيره أولُ رفضٍ للقراءة (SecurityError) أو تعذّرُ صورة الصفحة ينقل إليه */
      const wk = isWK();
      let scales = wk ? [2, 1.5] : coarse ? [3, 2] : [4, 3, 2], alt = wk, rf = null;
      /* (3) نسخةٌ للصفحة التي تُرسم وحدها في إطارٍ مخفيّ مؤقّت غيرِ محمي (rf): المكتبةُ تنسخ الوثيقةَ كلَّها عند كل صفحة، فنسخةُ الصفحات كلِّها تضاعف الوقت */
      const raster = (k) => {
        if (!rf) {
          rf = document.createElement("iframe");
          (rf.setAttribute("aria-hidden", "true"), rf.setAttribute("tabindex", "-1"), (rf.id = "bs-print-raster"));
          rf.setAttribute("style", "position:fixed;right:-10000px;top:0;width:1497px;height:1047px;border:0");
          document.body.appendChild(rf);
        }
        const h = x.documentElement.cloneNode(!0);
        [].forEach.call(h.querySelectorAll(".pg"), (g, j) => {
          j !== k && g.remove();
        });
        const d = rf.contentDocument || rf.contentWindow.document;
        (d.open(), d.write("<!DOCTYPE html>" + h.outerHTML), d.close());
        const ready = d.fonts && d.fonts.ready ? Promise.race([d.fonts.ready, new Promise((t) => setTimeout(t, 3500))]) : new Promise((t) => setTimeout(t, 600));
        return ready.then(() => d.querySelector(".pg") || Promise.reject(new Error("raster page")));
      };
      const altOk = (e) => !!(e && (e.name === "SecurityError" || /^page image$/.test(e.message || "")));
      const one = (pg, k) => {
        const go = (i) =>
          (alt ? raster(k).then((P) => pageImageAlt(P, scales[i])) : pageImage(x, pg, css, scales[i])).catch((e) => {
            if (!alt && altOk(e)) return ((alt = !0), (scales = [2, 1.5]), go(0));
            if (i + 1 >= scales.length) throw e;
            return go(i + 1).then((r) => ((scales = scales.slice(i + 1)), r));
          });
        return go(0);
      };
      const drop = () => {
        try {
          rf && rf.remove();
        } catch (e) {}
      };
      const cover = cov
        ? coverPage(cov).then(
            (r) => void imgs.push(r),
            (e) => {
              try {
                console.warn("[print-pdf] cover", e);
              } catch (e2) {}
            },
          )
        : Promise.resolve();
      return pgs
        .reduce((q, pg, k) => q.then(() => { if (run.stop) throw PDF_STOP53; return (say(k), one(pg, k)); }).then((r) => void imgs.push(r)), cover)
        .then(() => { if (run.stop) throw PDF_STOP53; })
        .then(() => {
          const bytes = pdfBytes(imgs, title), fname = String(title || "report").replace(/[\\/:*?"<>|]+/g, " ").trim() + ".pdf";
          let file = null;
          try {
            file = new File([bytes], fname, { type: "application/pdf" });
          } catch (e) {}
          if (file && shareMode(file) && pdfReady(file)) return (drop(), end("share"));
          const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })), a = document.createElement("a");
          ((a.href = url), (a.download = fname), (a.style.display = "none"));
          (document.body.appendChild(a), a.click());
          setTimeout(() => {
            try {
              (a.remove(), URL.revokeObjectURL(url));
            } catch (e) {}
          }, 6e4);
          return (drop(), end(!0));
        })
        .catch((e) => {
          drop();
          if (e === PDF_STOP53) return end("cancel");
          try {
            console.warn("[print-pdf]", e);
          } catch (e2) {}
          return end(!1);
        });
    } catch (e) {
      return Promise.resolve(end(!1));
    }
  }
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
    /* سطرُ التاريخ — V7 · 53 تقويم (§7): الميلادي أساساً والهجريُّ «الموافق» بعده («24 نوفمبر 2026 · الموافق 14 جمادى الآخرة 1448») من الخدمة الواحدة:
       «round» = يومُ الجولة المختار في الحالة (ميلادي) · «today» = اليومُ التشغيلي. وإن لم يُعرف الهجريُّ تماماً سقط «الموافق» كما كان */
    if (O.date === "today")
      try {
        o = KIVO.BassamCal.fmtPrint(KIVO.BassamCal.gToday().k);
      } catch (t) {}
    else
      try {
        const C = KIVO.BassamCal, t = s.year, e = s.month, n = Math.min(s.day, C.gMonthDays(t, e));
        o = "جولة يوم " + C.fmtPrint(C.gKey(t, e, n));
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
        /* ملفُّ PDF خفيف (ملفُّ المالك 2026-11-11: 10 صفحات · 292 صورة · 114 ميغابكسل — 272 منها أقنعةُ ظلالٍ رماديةٌ بدقّة 300): كلُّ box-shadow
           وfilter يصير في الملف صورةَ قناعٍ بحجم عنصره، فيُرسم الملفُّ عند فتحه كصفحة ويب. الظلالُ أثرُ شاشةٍ لا يُرى على الورق — الحدودُ والألوانُ كما هي */
        ".pg *{box-shadow:none!important;text-shadow:none!important;filter:none!important;backdrop-filter:none!important}",
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
        /* قرار المالك 2026-11-11: شريطا التبويب في اللوحة الجانبية (المصليات/المعالم/الأبواب · مؤشرات المصليات/المسارات/التوزيع/التغطية/الكثافة) أزرارُ
           شاشةٍ لا تُطبع في أيّ صفحة. اللاقطُ كان يخفيهما بـdisplay:none مضمَّن فتغلبه قاعدةُ الواجهة (!important)؛ هنا بتحديدٍ أعلى */
        ".pg .pn .bs-subseg,.pg .pn .bs-mixtabs{display:none!important}",
        ".pnIn{transform-origin:top right}",
        '.pn [style*="border"]{border-color:var(--bd-xcbd1d8)}',
        '.pn hr,.pn [style*="border-top"]{border-top-color:var(--bd-xcbd1d8)}',
        ".pnIn > div{border:2.2px solid var(--bd-xc9ae78)!important;border-radius:16px!important;box-shadow:none!important}",
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
                ? {
                    pn: e,
                    inr: s,
                    root: n,
                    availW: e.clientWidth,
                    /* الارتفاعُ الفعليّ للعمود ناقصاً بكسلاً، لا clientHeight المقرَّب (847.8 ⇒ 848): اللوحةُ كانت تزيد عن عمودها كسرَ بكسل،
                       وحدُّ القصّ يُحاذى إلى شبكة البكسل عند رسم الصفحة صورةً فيضيع أكثرُ حدِّها السفلي (1.3px) */
                    availH: Math.floor(e.getBoundingClientRect().height) - 1,
                    baseW: s.getBoundingClientRect().width || 1,
                  }
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
        Promise.resolve()
          .then(() => KIVO.BassamCssText.fontData())
          /* خطوطُ المنصة داخل الوثيقة نفسِها (data:) لا بروابط ملفات: ملفُّ المالك 2026-11-11 خرج بـTimes/Arial — خطوطُ الروابط لم تُطبَّق في إطار
             الطباعة على الموقع الحقيقي. قواعدُ fontData هي قواعدُ الصفحة نفسُها بمصدر data:font (كما كانت الوثيقةُ قبل KIVO_242) فتغلب بترتيبها */
          .then(() => {
            try {
              let t = "";
              [].forEach.call(KIVO.BassamCssText.fontSheets(), (e) => {
                let s;
                try {
                  s = e.cssRules;
                } catch (t) {
                  return;
                }
                s &&
                  [].forEach.call(s, (e) => {
                    5 === e.type && /data:font/.test(e.cssText) && (t += e.cssText + "\n");
                  });
              });
              if (t) {
                const e = x.createElement("style");
                (e.setAttribute("data-bs-print-fonts", "1"), (e.textContent = t), x.head.appendChild(e));
              }
            } catch (t) {}
          })
          /* الخطوطُ أولاً ثم قياسُ الصفحات: مقاساتُ اللوحة والخريطة تُحسب بخطّ المنصة لا بالخطّ البديل */
          .then(() => {
            try {
              if (x.fonts && x.fonts.ready) return Promise.race([x.fonts.ready, new Promise((t) => setTimeout(t, 3500))]);
            } catch (t) {}
          })
          .then(() => Promise.all([].map.call(x.querySelectorAll(".pg"), b)))
          .then(() =>
            /* خريطةٌ بعد أخرى لا كلُّها معاً: لوحةُ رسمٍ واحدة في الذاكرة في كل لحظة (تسعةُ مواقع معاً كانت تُثقل اللوحي) */
            [].reduce.call(
              x.querySelectorAll(".pg .mcv svg"),
              (q, t) =>
                q.then(
                  () =>
                  new Promise((e) => {
                    try {
                      const s = t.getBoundingClientRect();
                      if (!(s.width > 10 && s.height > 10)) return void e();
                      /* قرار المالك 2026-11-11 (PDF احترافي خفيف بالتصميم نفسِه): الخريطةُ صورةٌ واحدة عاليةُ الدقّة في الوثيقة — الرسمُ المتّجه
                         (آلافُ المسارات والظلال) جُرِّب على الموقع الحقيقي فصار الملفُّ ثقيلاً يُرسم عند فتحه كصفحة ويب. الصورةُ تُرسم بخطّ المنصة
                         واتجاهها: كان خطُّ Cairo المتغيّر (font-weight:400 900) لا يطابق شرطَ تضمين الخط (800 حرفاً) فتُكتب نصوصُ الخريطة بخطّ النظام،
                         وكانت الصورةُ المستقلّة بلا اتجاه الصفحة فينعكس ترتيبُ الكلمات. O.vector يُبقيها متّجهةً لمن يطلبها */
                      /* تنزيلُ الملف (الأصل): الخريطةُ تبقى رسماً في الصفحة فتُرسم مرّةً واحدة بدقّة الصفحة كاملةً — تحويلُها هنا إلى JPEG ثم رسمُ
                         الصفحة صورةً كان تحويلَين متتاليَين يُغبّشان حوافَّها. التحويلُ هنا لمسار نافذة الطباعة وحده (O.dialog) */
                      if (O.vector || (!O.dialog && !isWK())) return void e();   /* V7 · 53: سفاري — الخريطةُ صورةٌ قبل الرسّام البديل (نسخُها رسماً بطيءٌ فيه) */
                      const n = 2.5,
                        i = Math.min(4200, Math.round(s.width * n)),
                        o = Math.min(4200, Math.round(s.height * n)),
                        r = t.cloneNode(!0);
                      (r.removeAttribute("style"),
                        r.setAttribute("direction", "rtl"),
                        r.setAttribute("style", "direction:rtl"),
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
                                  (/Almarai/.test(e.cssText) || /Cairo/.test(e.cssText) || /font-weight:\s*800/.test(e.cssText)) &&
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
                              ((s.fillStyle = WHITE), s.fillRect(0, 0, i, o), s.drawImage(d, 0, 0, i, o));
                              const n = e.toDataURL("image/jpeg", 0.92),
                                r = x.createElement("img");
                              ((r.src = n),
                                r.setAttribute("style", "width:100%;height:100%;display:block;object-fit:contain"),
                                t.parentNode.replaceChild(r, t));
                            } catch (t) {}
                          e();
                        }
                      };
                      ((d.onload = () => h(!0)), (d.onerror = () => h(!1)), setTimeout(() => h(!1), 9e3), (d.src = l));
                    } catch (t) {
                      e();
                    }
                  }),
                ),
              Promise.resolve(),
            ),
          )
          /* خطوطُ الوثيقة تُحمَّل قبل الطباعة (الخريطةُ المتّجهة ونصوصُ الصفحة بها) — بمهلةٍ قصيرة فلا تتعطّل الطباعةُ إن تعذّر خطّ */
          .then(() => {
            try {
              if (x.fonts && x.fonts.ready) return Promise.race([x.fonts.ready, new Promise((t) => setTimeout(t, 3500))]);
            } catch (t) {}
          })
          .then(
            () => {
              if (O.kpi)
                try {
                  ctx._kpiPrintFit(x);
                } catch (t) {}
              let gone = !1;
              const drop = () => {
                if (gone) return;
                gone = !0;
                try {
                  m.remove();
                } catch (t) {}
              };
              /* نافذةُ الطباعة — المسارُ البديل حين يتعذّر تنزيلُ الملف. إطارُها يبقى حتى afterprint (كان يُحذف بعد 1.2 ث من الاستدعاء،
                 والمتصفحاتُ التي لا تحجب عند print() لم تكن أنهت قراءتَه) · مهلةٌ قصوى دقيقتان */
              const dialog = () => {
                n();
                let t = null,
                  e = null;
                try {
                  ((t = document.title), (document.title = f));
                } catch (t) {}
                try {
                  window.top && window.top !== window && window.top.document && ((e = window.top.document.title), (window.top.document.title = f));
                } catch (t) {}
                try {
                  m.contentWindow.addEventListener("afterprint", () => setTimeout(drop, 400));
                } catch (t) {}
                setTimeout(drop, 12e4);
                try {
                  (m.contentWindow.focus(), m.contentWindow.print());
                } catch (t) {}
                setTimeout(() => {
                  try {
                    null != t && (document.title = t);
                  } catch (t) {}
                  try {
                    null != e && window.top && window.top.document && (window.top.document.title = e);
                  } catch (t) {}
                }, 1200);
              };
              /* الأصل: ملفُّ PDF يُنزَّل مباشرةً (كلُّ صفحةٍ صورةٌ جاهزة). O.dialog يطلب نافذةَ الطباعة صراحةً */
              if (O.dialog) return void dialog();
              pdfDownload(x, f, coverInfo(o, i)).then((ok) => {
                /* V7 · 53 (nosilent · REVIEW 26 ب4/ب7): الإلغاءُ يُقال، والرجوعُ إلى نافذة الطباعة يقول سببَه — لا انتقالَ صامت */
                if ("cancel" === ok) {
                  (n(), drop());
                  try {
                    KIVO.BassamBusy && KIVO.BassamBusy.flash("أُلغي تجهيز ملف PDF — لم يُنزَّل شيء", "", "warn");
                  } catch (e) {}
                  return;
                }
                if (!ok) {
                  try {
                    KIVO.BassamBusy && KIVO.BassamBusy.flash("تعذّر صنع ملف PDF في هذا المتصفح", "فُتحت نافذة الطباعة بدلاً منه — اختر «حفظ بصيغة PDF»", "warn");
                  } catch (e) {}
                  return void dialog();
                }
                (n(), drop());
                if (ok === "share") return;   /* شاشةُ «الملف جاهز» تتولّى الحفظ والإشعار */
                try {
                  KIVO.BassamBusy && KIVO.BassamBusy.flash("تم تنزيل التقرير PDF", "تجده في التنزيلات", "ok");
                } catch (e) {}
              });
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
      /* V7 · 53 (البند 9 · السبب 1): سفاري لا ينفّذ نداءً يُسجَّل على نافذة الإطار المحمي — كان الانتظارُ بإطاره (requestAnimationFrame) وبخطوطه بلا مهلة
         لا ينتهي فلا ملفَّ. الانتظارُ من الصفحة نفسِها، مرّةً واحدة، وللخطوط مهلة */
      v1 = { d: !1 },
      v = () => {
        if (v1.d) return;
        v1.d = !0;
        try {
          requestAnimationFrame(() => setTimeout(k, 80));
        } catch (t) {
          setTimeout(k, 350);
        }
      };
    try {
      x.fonts && x.fonts.ready ? (Promise.race([x.fonts.ready, new Promise((t) => setTimeout(t, 3500))]).then(v, v), setTimeout(v, 3600)) : setTimeout(v, 550);
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
  KIVO.BassamPrintCore = { build: build, capture: capture, pdfBytes: pdfBytes, frozenMedia: frozenMedia, isWK: isWK, shareMode: shareMode, coverInfo: coverInfo };
})();
