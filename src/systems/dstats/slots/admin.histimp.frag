  /* V7 · د5-ح: «استيراد البيانات التاريخية» في مركز الإدارة — منطقُها خدمتا هذا النظام (BassamHistImport · DailyStats)، فهي قطعتُه لا معرفةُ القاعدة به */
  /* ═══ R185: «استيراد البيانات التاريخية» — لوحةُ موقع الإحصائيات القديم (HistoricalImportPanel) منقولةً عنصراً عنصراً ═══
   الكروتُ والشاراتُ والجداولُ والأوضاعُ والحواراتُ ونصوصُها وترتيبُها ومقاساتُها كما في الأصل؛ والألوانُ من لوحة هوية المنصة
   (فاتح/داكن) بأقرب درجةٍ لدرجة الأصل. التحليلُ والتنفيذُ في المتصفح (BassamHistImport) بمنطق خادم الموقع القديم حرفاً. */
  hiS() {
    return this.state.hi || {};
  }
  hiSet(p, cb) {
    this.setState((s) => ({ hi: Object.assign({}, s.hi || {}, p) }), cb);
  }
  hiMeta(f) {
    return { filename: String(f.name || ""), size_bytes: f.size || 0, content_type: f.type || "—" };
  }
  hiReset() {
    this.hiSet({ file: null, preview: null, result: null, mode: "add", blank: "ignore" });
  }
  hiTemplate() {
    try {
      const B = KIVO.BassamHistImport.templateBytes();
      KIVO.BassamXLSX.saveBytes(B, "historical_template.xlsx");
      this.bsToast("تم تحميل القالب", "ok");
    } catch (e) {
      this.bsToast("فشل تحميل القالب", "err");
    }
  }
  hiPick(e) {
    const t = e && e.target,
      f = t && t.files && t.files[0];
    try {
      t && (t.value = "");
    } catch (x) {}
    if (!f) return;
    const n = String(f.name || "").toLowerCase();
    if (!n.endsWith(".xlsx") && !n.endsWith(".xls")) {
      this.bsToast("الرجاء اختيار ملف Excel (.xlsx)", "err");
      return;
    }
    this.hiSet({ file: f, preview: null, result: null });
  }
  hiErrToast(m) {
    m = String(m || "");
    this.bsToast(m.length > 180 ? m.slice(0, 177) + "…" : m, "err");
  }
  async hiPreview() {
    const f = this.hiS().file;
    if (!f) {
      this.bsToast("الرجاء اختيار ملف أولاً", "err");
      return;
    }
    this.hiSet({ loading: !0, result: null, err: null, prog: "جارٍ تحضير الملف..." });
    let buf;
    try {
      buf = await f.arrayBuffer();
    } catch (e) {
      const m = "تعذّرت قراءة الملف من الجهاز: " + String((e && e.message) || "تعذّر الوصول إلى الملف");
      this.hiSet({ loading: !1, prog: "", err: { kind: "read", message: m, filename: String(f.name || ""), size: f.size || 0 } });
      this.hiErrToast(m);
      return;
    }
    try {
      const d = await KIVO.BassamHistImport.preview(buf, this.hiMeta(f));
      this.hiSet({ preview: d, loading: !1, prog: "" });
      this.bsToast("تم تحليل الملف بنجاح", "ok");
    } catch (e) {
      const m = String((e && (e.detail || e.message)) || "خطأ غير متوقع");
      this.hiSet({
        loading: !1,
        prog: "",
        err: { kind: "file", status: (e && e.status) || null, message: m, filename: String(f.name || ""), size: f.size || 0 },
      });
      this.hiErrToast(m);
    }
  }
  hiImportClick() {
    this._hiFocus = !0;
    "replace" === (this.hiS().mode || "add") ? this.hiSet({ cfRep: !0 }) : this.hiSet({ cfFin: !0 });
  }
  async hiDoImport() {
    const H = this.hiS(),
      f = H.file;
    if (!H.preview) {
      this.bsToast("نفّذ المعاينة أولاً", "err");
      return;
    }
    this.hiSet({ importing: !0 });
    try {
      const HI = KIVO.BassamHistImport, D = KIVO.DailyStats;
      if (!D) throw new Error("خدمة الإحصائيات غير متاحة");
      /* V7 · 53 (noreason · قرارُ المالك): لا يُسأل عن سبب — المعاينةُ ثم «تنفيذ الاستيراد» هما التأكيد */
      const buf = await f.arrayBuffer(), x = await HI.execute(buf, H.mode || "add", H.blank || "ignore", this.hiMeta(f));
      if (!await D.save(x.store, { operation: "historical-import" })) {
        this.bsToast(D.message(), "err"); return;
      }
      const res = Object.assign({}, x.res);
      delete res.activity;
      this.hiSet({ result: res });
      this.bsToast("تم — " + res.inserted + " إضافة، " + res.updated + " تحديث", "ok");
      try {
        window.dispatchEvent(new CustomEvent("daily-stats-refresh"));
      } catch (e) {}
    } catch (e) {
      this.bsToast((e && (e.detail || e.message)) || "فشل الاستيراد", "err");
    } finally {
      this.hiSet({ importing: !1 });
    }
  }
  hiNode() {
    const h = React.createElement,
      F = React.Fragment,
      H = this.hiS(),
      file = H.file || null,
      preview = H.preview || null,
      result = H.result || null,
      err = H.err || null,
      mode = H.mode || "add",
      blank = H.blank || "ignore",
      loading = !!H.loading,
      importing = !!H.importing;
    const C = {
      fg: "var(--text-primary)",
      mu: "var(--text-secondary)",
      br: "var(--brand-primary)",
      onBr: "var(--text-on-brand)",   /* CORE-02 · الخطوة ٦: نصُّ الزرّ الأساسي على الذهبي كـ.bs-btn--primary (الأبيضُ عليه 2.8:1 دون حدّ القراءة) */
      good: "var(--success-text)",
      goodI: "var(--success)",
      warn: "var(--warning-text)",
      bad: "var(--danger-text)",
      bad9: "var(--danger-strong)",
      card: "var(--bg-surface)",
      card80: "var(--bg-a2552552550p8)",
      modal: "var(--bg-modal)",
      muted: "var(--bg-surface-3)",
      faint: "var(--bg-surface-2)",
      gBg: "var(--success-bg)",
      gFaint: "var(--bg-a51501050p05)",
      wBg: "var(--warning-bg)",
      wFaint: "var(--bg-a245158110p04)",
      wStrong: "var(--warning-soft)",
      rBg: "var(--danger-bg)",
      rFaint: "var(--bg-a22038380p04)",
      rFaint5: "var(--bg-a22038380p05)",
      rHead: "var(--bg-a22038380p08)",
      pBg: "var(--brand-primary)",
      p10: "var(--bg-a185151810p1)",
      p5: "var(--bg-a185151810p05)",
      danger: "var(--danger)",
      ov: "var(--bg-overlay)",
      bd: "var(--border-default)",
      bdBr: "var(--border-brand)",
      bd20: "var(--bd-a185151810p2)",
      bd30: "var(--bd-a185151810p3)",
      bd40: "var(--bd-a185151810p4)",
      bdG: "var(--success-border)",
      bdW: "var(--warning-border)",
      bdW1: "var(--bd-a245158110p2)",
      bdR: "var(--danger-border)",
      bdR1: "var(--bd-a22038380p18)",
    };
    const FF = "'Cairo',sans-serif",
      SH = "0 1px 3px 0 rgba(0,0,0,0.1),0 1px 2px -1px rgba(0,0,0,0.1)",
      SHSM = "0 1px 2px 0 rgba(0,0,0,0.05)",
      SHLG = "0 10px 15px -3px rgba(0,0,0,0.1),0 4px 6px -4px rgba(0,0,0,0.1)";
    const MODE_LABELS = {
      add: { ar: "إضافة الجديد فقط", hint: "تخطّي السجلات الموجودة سلفاً." },
      update: { ar: "تحديث الموجود وإضافة الجديد", hint: "إذا وُجد سجل بنفس (الموقع + التاريخ) سيتم تحديثه، وإلا سيُضاف." },
      replace: { ar: "استبدال الفترة المستوردة", hint: "حذف السجلات الموجودة في الأشهر/المواقع المضمّنة في الملف فقط، ثم إعادة إدخالها." },
    };
    const IC = {
      database: [
        ["ellipse", { cx: "12", cy: "5", rx: "9", ry: "3" }],
        ["path", { d: "M3 5V19A9 3 0 0 0 21 19V5" }],
        ["path", { d: "M3 12A9 3 0 0 0 21 12" }],
      ],
      download: [
        ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }],
        ["polyline", { points: "7 10 12 15 17 10" }],
        ["line", { x1: "12", x2: "12", y1: "15", y2: "3" }],
      ],
      upload: [
        ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }],
        ["polyline", { points: "17 8 12 3 7 8" }],
        ["line", { x1: "12", x2: "12", y1: "3", y2: "15" }],
      ],
      sheet: [
        ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }],
        ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
        ["path", { d: "M8 13h2" }],
        ["path", { d: "M14 13h2" }],
        ["path", { d: "M8 17h2" }],
        ["path", { d: "M14 17h2" }],
      ],
      x: [
        ["path", { d: "M18 6 6 18" }],
        ["path", { d: "m6 6 12 12" }],
      ],
      eye: [
        ["path", { d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" }],
        ["circle", { cx: "12", cy: "12", r: "3" }],
      ],
      loader: [["path", { d: "M21 12a9 9 0 1 1-6.219-8.56" }]],
      alert: [
        ["path", { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" }],
        ["path", { d: "M12 9v4" }],
        ["path", { d: "M12 17h.01" }],
      ],
      check: [
        ["circle", { cx: "12", cy: "12", r: "10" }],
        ["path", { d: "m9 12 2 2 4-4" }],
      ],
      shield: [
        [
          "path",
          {
            d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
          },
        ],
        ["path", { d: "M12 8v4" }],
        ["path", { d: "M12 16h.01" }],
      ],
      dot: [["circle", { cx: "12", cy: "12", r: "10" }]],
    };
    const ic = (n, sz, st, cls) =>
      h(
        "svg",
        {
          width: sz,
          height: sz,
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 2,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          className: cls || void 0,
          "aria-hidden": "true",
          style: Object.assign({ display: "block", flexShrink: 0 }, st || {}),
        },
        ...IC[n].map((q, i) => h(q[0], Object.assign({ key: i }, q[1]))),
      );
    const CSS =
      ".bshi-out:hover{background:var(--bg-a185151810p08)!important}.bshi-pri:hover{background:var(--bg-a185151810p85)!important}.bshi-dng:hover{opacity:.9}.bshi-lbl:hover{background:var(--bg-a185151810p05)!important}.bshi-clr:hover{color:var(--danger-text)!important}.bshi-mode:hover{background:var(--bg-surface-2)!important}.bshi-dis:hover{color:var(--danger-strong)!important}" +
      /* ring-1 في Tailwind يُضاف إلى ظلّ الزرّ ولا يستبدله: الحلقةُ ثم ظلُّ النوع (outline: ‏shadow-sm · الأساسيّ والإتلافيّ والدائرة: shadow) */
      ".bshi-btn:focus-visible,.bshi-rad:focus-visible{outline:none!important}.bshi-out:focus-visible{box-shadow:0 0 0 1px var(--border-brand)," +
      SHSM +
      "!important}.bshi-pri:focus-visible,.bshi-dng:focus-visible,.bshi-rad:focus-visible{box-shadow:0 0 0 1px var(--border-brand)," +
      SH +
      "!important}" +
      /* عناصرُ الأصل بلا فئة تركيز (مسح · إخفاء التفاصيل · صفوف مكرّرة): إطارُ القاعدة العامة في الأصل بلون الهوية */
      ".bshi-clr:focus-visible,.bshi-dis:focus-visible,.bshi-sum:focus-visible{outline-color:var(--brand-primary)!important;transition:outline-offset 120ms ease}" +
      /* شريطُ التمرير في جداول اللوحة وقائمتها كما في الأصل (٨ بكسل · مسارٌ باهت · مقبضٌ ذهبيّ) — ويُعاد scrollbar-color للآلي كي يُطبَّق */
      ".bshi-sc{scrollbar-color:auto;scrollbar-width:auto}.bshi-sc::-webkit-scrollbar{width:8px;height:8px}.bshi-sc::-webkit-scrollbar-track{background:var(--bg-surface-3);border-radius:4px}.bshi-sc::-webkit-scrollbar-thumb{background:var(--bd-a185151810p6);border-radius:4px;border:0;background-clip:border-box}.bshi-sc::-webkit-scrollbar-thumb:hover{background:var(--brand-primary)}" +
      /* التحديدُ ولمسةُ النقر كما في الأصل */
      ".bshi-root{-webkit-tap-highlight-color:transparent}.bshi-root ::selection{background:var(--bg-a185151810p25);color:var(--text-primary)}" +
      /* الجوال (≤٦٤٠) — قواعدُ الأصل العامة كما تقع على هذه اللوحة: مسافةُ ١٢ بين الكروت، عمودٌ واحد للإحصاءات، ٣٦ بكسل حدّاً أدنى للأزرار والدوائر، خلايا الجداول مضغوطةٌ بلا التفاف، شريطُ تمريرٍ ٢ بكسل */
      "@media (max-width:640px){.bshi-root{gap:12px!important}.bshi-grid,.bshi-eg{grid-template-columns:1fr!important}.bshi-root button{min-height:36px!important;min-width:36px!important}.bshi-root table th,.bshi-root table td{padding:8px!important;font-size:11.2px!important;white-space:nowrap!important}.bshi-root table th{font-size:10.4px!important}.bshi-sc::-webkit-scrollbar{width:2px;height:2px}.bshi-sc::-webkit-scrollbar-thumb{background:var(--border-default)}}" +
      ".bshi-spin{animation:bshi-spin 1s linear infinite}@keyframes bshi-spin{to{transform:rotate(360deg)}}" +
      ".bshi-grid{display:grid;gap:8px;grid-template-columns:repeat(2,minmax(0,1fr))}@media (min-width:640px){.bshi-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media (min-width:1024px){.bshi-grid{grid-template-columns:repeat(5,minmax(0,1fr))}}" +
      ".bshi-eg{display:grid;column-gap:24px;row-gap:4px;grid-template-columns:repeat(1,minmax(0,1fr))}@media (min-width:640px){.bshi-eg{grid-template-columns:repeat(2,minmax(0,1fr))}.bshi-s2{grid-column:span 2/span 2}}" +
      ".bshi-dh{text-align:center}.bshi-dc{border-radius:0}.bshi-df{display:flex;flex-direction:column-reverse}.bshi-can{margin-top:8px!important}@media (min-width:640px){.bshi-dh{text-align:left}.bshi-dc{border-radius:10px}.bshi-df{flex-direction:row;justify-content:flex-end}.bshi-df>*+*{margin-left:8px!important}.bshi-can{margin-top:0!important}}";
    /* الأزرارُ (Button: الحجمُ sm أو الافتراضي · outline · default · والإتلافيُّ) كما في الأصل */
    const btn = (o, ...kids) => {
      const sm = o.size === "sm",
        out = o.v === "outline",
        dng = o.v === "danger";
      return h(
        "button",
        {
          type: "button",
          "data-testid": o.tid,
          onClick: o.onClick,
          disabled: !!o.disabled,
          className: "bshi-btn " + (o.disabled ? "" : out ? "bshi-out" : dng ? "bshi-dng" : "bshi-pri") + (o.cls ? " " + o.cls : ""),
          "data-confirm-action": o.act ? "true" : void 0,
          style: {
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            whiteSpace: "nowrap",
            borderRadius: 8,
            fontSize: sm ? 12 : 14,
            lineHeight: sm ? "16px" : "20px",
            fontWeight: 500,
            height: sm ? 32 : 36,
            padding: sm ? "0 12px" : "8px 16px",
            boxSizing: "border-box",
            fontFamily: FF,
            transition: "color .15s,background-color .15s",
            cursor: o.disabled ? "default" : "pointer",
            opacity: o.disabled ? 0.5 : 1,
            pointerEvents: o.disabled ? "none" : "auto",
            border: out ? "1px solid " + C.bd : "0",
            background: out ? "transparent" : dng ? C.danger : C.pBg,
            color: out ? C.fg : C.onBr,
            boxShadow: out ? SHSM : SH,
            margin: 0,
          },
        },
        ...kids,
      );
    };
    /* StatPill ونبراتُها الخمس */
    const TONE = {
      default: { background: C.faint, color: C.fg },
      good: { background: C.gBg, color: C.good, boxShadow: "0 0 0 1px " + C.bdG },
      warn: { background: C.wBg, color: C.warn, boxShadow: "0 0 0 1px " + C.bdW },
      bad: { background: C.rBg, color: C.bad, boxShadow: "0 0 0 1px " + C.bdR },
      primary: { background: C.p10, color: C.br, boxShadow: "0 0 0 1px " + C.bd30 },
    };
    const pill = (label, value, tone, tid) =>
      h(
        "div",
        {
          key: tid,
          "data-testid": tid,
          style: Object.assign(
            {
              padding: "8px 12px",
              borderRadius: 10,
              fontSize: 12,
              lineHeight: "16px",
              fontFamily: FF,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              minWidth: 0,
            },
            TONE[tone || "default"],
          ),
        },
        h("span", { style: { fontWeight: 600 } }, label),
        h("span", { "data-testid": tid + "-value", style: { fontWeight: 700, fontVariantNumeric: "tabular-nums" } }, value),
      );
    /* Card · CardHeader · CardTitle · CardContent (space-y) */
    const card = (bc, bg, tid, ...kids) =>
      h(
        "div",
        { "data-testid": tid, style: { borderRadius: 12, border: "1px solid " + bc, background: bg, color: C.fg, boxShadow: SH } },
        ...kids,
      );
    const head = (pb, ...kids) =>
      h("div", { style: { display: "flex", flexDirection: "column", padding: "24px 24px " + pb + "px 24px" } }, ...kids);
    const title = (fs, lh, color, ...kids) =>
      h(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: FF,
            fontSize: fs,
            lineHeight: lh,
            fontWeight: 600,
            letterSpacing: "-0.025em",
            color: color || C.fg,
          },
        },
        ...kids,
      );
    const content = (gap, list) =>
      h(
        "div",
        { style: { padding: "0 24px 24px 24px" } },
        ...list.filter(Boolean).map((k, i) => h("div", { key: i, style: { marginTop: i ? gap : 0 } }, k)),
      );
    const fmtVal = (v) => (v === null || v === void 0 || v === "" ? "—" : typeof v === "number" ? v.toLocaleString("ar-EG") : String(v));
    const existingPill =
      mode === "add"
        ? { label: "موجود (سيُتخطّى)", tone: "default" }
        : mode === "replace"
          ? { label: "موجود (سيُحذف ويُعاد)", tone: "bad" }
          : { label: "موجود (سيُحدّث)", tone: "warn" };
    const rowActionText = (row) =>
      mode === "add" ? "تخطّي" : mode === "replace" ? "حذف ثم إدخال جديد" : row.changes ? "تحديث القيمة" : "بدون تغيير";
    const TH = { padding: "6px 8px", textAlign: "right", fontWeight: 700 },
      TD = { padding: "6px 8px" };
    const radio = (on, onPick, tid) =>
      h(
        "button",
        {
          type: "button",
          role: "radio",
          "aria-checked": on ? "true" : "false",
          "data-state": on ? "checked" : "unchecked",
          "data-testid": tid,
          className: "bshi-rad",
          onClick: (e) => {
            e.preventDefault();
            e.stopPropagation();
            onPick();
          },
          style: {
            width: 16,
            height: 16,
            minWidth: 16,
            borderRadius: 9999,
            border: "1px solid " + C.bdBr,
            color: C.br,
            boxShadow: SH,
            background: "transparent",
            padding: 0,
            margin: "2px 0 0 0",
            cursor: "pointer",
            display: "block",
            boxSizing: "border-box",
          },
        },
        on
          ? h(
              "span",
              { style: { display: "flex", alignItems: "center", justifyContent: "center", height: 14 } },
              ic("dot", 14, { fill: C.br }),
            )
          : null,
      );
    const out = [h("style", { key: "css" }, CSS)];
    /* ── كرتُ الترويسة والأدوات ── */
    out.push(
      card(
        C.bd20,
        C.card80,
        "hist-head-card",
        head(
          12,
          /* مراجعة S10: العنوانُ في رأس الصفحة (h2) — الكرتُ يبدأ بوصفه */
          h(
            "p",
            { style: { margin: 0, fontSize: 12, lineHeight: "16px", color: C.mu, fontFamily: FF } },
            "ارفع ملف Excel موحّد يحتوي بيانات الحرم والنبوي معاً. كل صف = يوم واحد (التاريخ الهجري يُحوَّل إلى يومه الميلادي بأم القرى، والميلادي يُقبل كما هو).",
          ),
        ),
        content(16, [
          h(
            "div",
            { style: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 } },
            btn(
              { tid: "hist-template-btn", v: "outline", size: "sm", onClick: () => this.hiTemplate() },
              ic("download", 16),
              "تحميل القالب",
            ),
            h(
              "label",
              {
                "data-testid": "hist-file-label",
                className: "bshi-lbl",
                style: {
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid " + C.bd30,
                  background: C.card,
                  cursor: "pointer",
                  fontSize: 14,
                  lineHeight: "20px",
                  fontFamily: FF,
                  color: C.fg,
                  transition: "all .15s",
                },
              },
              ic("sheet", 16, { color: C.br }),
              file ? file.name : "اختيار ملف Excel",
              h("input", {
                type: "file",
                accept: ".xlsx,.xls",
                hidden: !0,
                style: { display: "none" },
                onChange: (e) => this.hiPick(e),
                "data-testid": "hist-file-input",
              }),
            ),
            file
              ? h(
                  "button",
                  {
                    type: "button",
                    "data-testid": "hist-clear-btn",
                    onClick: () => this.hiReset(),
                    className: "bshi-clr",
                    style: {
                      fontSize: 12,
                      lineHeight: "16px",
                      color: C.mu,
                      fontFamily: FF,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      background: "none",
                      border: 0,
                      padding: 0,
                      margin: 0,
                      cursor: "pointer",
                      transition: "color .15s",
                    },
                  },
                  ic("x", 14),
                  "مسح",
                )
              : null,
            btn(
              { tid: "hist-preview-btn", size: "sm", onClick: () => this.hiPreview(), disabled: !file || loading },
              loading ? ic("loader", 16, null, "bshi-spin") : ic("eye", 16),
              "معاينة",
            ),
          ),
          H.prog
            ? h(
                "div",
                {
                  "data-testid": "hist-preview-progress",
                  style: {
                    fontSize: 11,
                    lineHeight: "16.5px",
                    fontFamily: FF,
                    color: C.warn,
                    background: C.wBg,
                    border: "1px solid " + C.bdW,
                    borderRadius: 8,
                    padding: "6px 10px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  },
                },
                ic("loader", 12, null, "bshi-spin"),
                H.prog,
              )
            : null,
        ]),
      ),
    );
    /* ── بطاقةُ فشل التحليل (لا خادمَ ولا Axios هنا: التحليلُ في المتصفح) ── */
    if (err) {
      const lab = (t) => h("span", { style: { fontWeight: 700 } }, t);
      out.push(
        card(
          C.bdR,
          "linear-gradient(" + C.rFaint5 + "," + C.rFaint5 + ")," + C.card,
          "hist-error-card",
          head(8, title(14, "20px", C.bad, ic("alert", 16), "فشل تحليل الملف — تفاصيل الخطأ")),
          h(
            "div",
            { style: { padding: "0 24px 24px 24px", fontSize: 12, lineHeight: "18px", fontFamily: FF, color: C.bad9 } },
            h(
              "div",
              { className: "bshi-eg" },
              h(
                "div",
                null,
                lab("نوع الخطأ:"),
                " ",
                err.kind === "read" ? "قراءة الملف (تعذّر فتحه من الجهاز)" : "تحليل الملف في المتصفح (قُرئ الملف وأرجع خطأ)",
              ),
              h("div", null, lab("HTTP status:"), " ", h("span", { style: { fontVariantNumeric: "tabular-nums" } }, "—")),
              h("div", { className: "bshi-s2" }, lab("الرسالة:"), " ", h("span", { "data-testid": "hist-error-msg" }, err.message)),
              h(
                "div",
                null,
                lab("الملف:"),
                " ",
                err.filename || "—",
                " ",
                h("span", { style: { color: C.bad, opacity: 0.7 } }, "(" + (err.size || 0).toLocaleString("ar-EG") + " بايت)"),
              ),
            ),
            h(
              "button",
              {
                type: "button",
                "data-testid": "hist-error-dismiss",
                className: "bshi-dis",
                onClick: () => this.hiSet({ err: null }),
                style: {
                  marginTop: 8,
                  fontSize: 11,
                  lineHeight: "16.5px",
                  textDecoration: "underline",
                  color: C.bad,
                  background: "none",
                  border: 0,
                  padding: 0,
                  cursor: "pointer",
                  fontFamily: FF,
                },
              },
              "إخفاء التفاصيل",
            ),
          ),
        ),
      );
    }
    /* ── تقريرُ المعاينة ── */
    if (preview) {
      const P = preview,
        errs = P.errors || [],
        dups = P.duplicates_in_file || [],
        match = P.matching_existing || [],
        unk = P.unknown_headers || [];
      const blocks = [
        h(
          "div",
          { className: "bshi-grid" },
          pill("إجمالي الصفوف", P.total_rows, "default", "stat-total"),
          pill("صالحة", P.valid_rows == null ? 0 : P.valid_rows, "good", "stat-valid"),
          pill("متجاهلة (فارغة)", P.ignored_empty_rows == null ? 0 : P.ignored_empty_rows, "default", "stat-ignored"),
          pill("سجلات الحرم", P.total_haram_records, "primary", "stat-haram"),
          pill("سجلات النبوي", P.total_nabawi_records, "primary", "stat-nabawi"),
          pill("جديد", P.new_records, "good", "stat-new"),
          pill(existingPill.label, P.existing_records, existingPill.tone, "stat-existing"),
          pill("خلايا فارغة", P.blank_cells_count, "default", "stat-blanks"),
          pill("أخطاء", P.errors_total, P.errors_total ? "bad" : "default", "stat-errors"),
          pill("مكرّر داخل الملف", P.duplicates_total, P.duplicates_total ? "bad" : "default", "stat-dups"),
          pill("السنوات", (P.years || []).join("، ") || "—", "default", "stat-years"),
          pill("الأشهر", (P.months || []).length, "default", "stat-months"),
        ),
      ];
      if (errs.length)
        blocks.push(
          h(
            "div",
            { "data-testid": "hist-errors-table", style: { borderRadius: 8, border: "1px solid " + C.bdR, background: C.rFaint } },
            h(
              "div",
              {
                style: {
                  padding: "8px 12px",
                  borderBottom: "1px solid " + C.bdR,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                },
              },
              h(
                "h4",
                {
                  style: {
                    margin: 0,
                    fontFamily: FF,
                    fontSize: 14,
                    lineHeight: "20px",
                    fontWeight: 700,
                    color: C.bad,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  },
                },
                ic("alert", 16),
                "تفاصيل الأخطاء (" + P.errors_total + " إجمالاً، عرض أول " + errs.length + ")",
              ),
            ),
            h(
              "div",
              { className: "bshi-sc", style: { overflowX: "auto", maxHeight: 288, overflowY: "auto" } },
              h(
                "table",
                { style: { width: "100%", fontSize: 12, lineHeight: "16px", fontFamily: FF, borderCollapse: "collapse", color: C.fg } },
                h(
                  "thead",
                  { style: { background: C.rHead, color: C.bad } },
                  h("tr", null, ...["الصف", "العمود", "القيمة", "السبب", "النوع"].map((t) => h("th", { key: t, style: TH }, t))),
                ),
                h(
                  "tbody",
                  null,
                  ...errs.map((e, i) =>
                    h(
                      "tr",
                      { key: i, style: { borderTop: "1px solid " + C.bdR1 } },
                      h(
                        "td",
                        { style: Object.assign({}, TD, { fontVariantNumeric: "tabular-nums", color: C.bad, fontWeight: 700 }) },
                        e.row,
                      ),
                      h(
                        "td",
                        {
                          title: e.column,
                          style: Object.assign({}, TD, {
                            maxWidth: 180,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }),
                        },
                        e.column || "—",
                      ),
                      h(
                        "td",
                        {
                          title: e.value,
                          style: Object.assign({}, TD, {
                            maxWidth: 160,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontVariantNumeric: "tabular-nums",
                          }),
                        },
                        e.value || "—",
                      ),
                      h("td", { style: TD }, e.reason),
                      h(
                        "td",
                        { style: Object.assign({}, TD, { fontSize: 10 }) },
                        h(
                          "span",
                          { style: { padding: "2px 6px", borderRadius: 4, background: C.rBg, color: C.bad } },
                          e.kind === "invalid_date" ? "تاريخ" : e.kind === "invalid_number" ? "رقم" : e.kind || "—",
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      if (unk.length)
        blocks.push(
          h(
            "div",
            {
              style: {
                background: C.wBg,
                border: "1px solid " + C.bdW,
                borderRadius: 8,
                padding: 12,
                fontSize: 12,
                lineHeight: "16px",
                fontFamily: FF,
              },
            },
            h("div", { style: { fontWeight: 700, color: C.warn, marginBottom: 4 } }, "أعمدة غير معروفة (سيتم تجاهلها):"),
            h("div", { style: { color: C.warn } }, unk.join("، ")),
          ),
        );
      if (dups.length)
        blocks.push(
          h(
            "details",
            {
              style: {
                background: C.wBg,
                border: "1px solid " + C.bdW,
                borderRadius: 8,
                padding: 12,
                fontSize: 12,
                lineHeight: "16px",
                fontFamily: FF,
                color: C.fg,
              },
            },
            h(
              "summary",
              { className: "bshi-sum", style: { cursor: "pointer", fontWeight: 700, color: C.warn } },
              "صفوف مكرّرة داخل الملف (" + P.duplicates_total + ")",
            ),
            h(
              "ul",
              { className: "bshi-sc", style: { margin: "8px 0 0 0", padding: 0, listStyle: "none", maxHeight: 160, overflowY: "auto" } },
              ...dups.map((d, i) =>
                h("li", { key: i, style: { marginTop: i ? 4 : 0 } }, "صف " + d.row + " — " + d.site + " / " + (KIVO.BassamCal.fmtDay(d.date_hijri) || d.date_hijri)),   /* V7 · 53 تقويم: اليومُ الميلادي */
              ),
            ),
          ),
        );
      if (match.length)
        blocks.push(
          h(
            "div",
            {
              "data-testid": "hist-matching-existing-table",
              style: { borderRadius: 8, border: "1px solid " + C.bdW, background: C.wFaint },
            },
            h(
              "div",
              {
                style: {
                  padding: "8px 12px",
                  borderBottom: "1px solid " + C.bdW,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                },
              },
              h(
                "h4",
                {
                  style: {
                    margin: 0,
                    fontFamily: FF,
                    fontSize: 14,
                    lineHeight: "20px",
                    fontWeight: 700,
                    color: C.warn,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  },
                },
                ic("database", 16),
                "السجلات الموجودة المطابقة (" + P.matching_existing_total + " إجمالاً، عرض أول " + match.length + ")",
              ),
              h(
                "span",
                {
                  style: {
                    fontSize: 10,
                    lineHeight: "15px",
                    fontFamily: FF,
                    color: C.warn,
                    background: C.wBg,
                    padding: "2px 8px",
                    borderRadius: 4,
                  },
                },
                "وضع: " + MODE_LABELS[mode].ar,
              ),
            ),
            h(
              "div",
              { className: "bshi-sc", style: { overflowX: "auto", maxHeight: 320, overflowY: "auto" } },
              h(
                "table",
                { style: { width: "100%", fontSize: 12, lineHeight: "16px", fontFamily: FF, borderCollapse: "collapse", color: C.fg } },
                h(
                  "thead",
                  { style: { background: C.wBg, color: C.warn, position: "sticky", top: 0 } },
                  h(
                    "tr",
                    null,
                    ...["التاريخ", "الموقع", "الحقل", "القيمة الحالية", "قيمة Excel", "الإجراء"].map((t) =>
                      h("th", { key: t, style: TH }, t),
                    ),
                  ),
                ),
                h(
                  "tbody",
                  null,
                  ...match.map((row, i) =>
                    h(
                      "tr",
                      { key: i, style: { borderTop: "1px solid " + C.bdW1 } },
                      h(
                        "td",
                        { style: Object.assign({}, TD, { fontVariantNumeric: "tabular-nums", fontWeight: 700, color: C.warn }) },
                        KIVO.BassamCal.fmtDay(row.date_hijri) || row.date_hijri,
                      ),
                      h("td", { style: TD }, row.site_label),
                      h("td", { style: TD }, row.field_label),
                      h("td", { style: Object.assign({}, TD, { fontVariantNumeric: "tabular-nums" }) }, fmtVal(row.current_value)),
                      h(
                        "td",
                        { style: Object.assign({}, TD, { fontVariantNumeric: "tabular-nums", fontWeight: 700 }) },
                        fmtVal(row.excel_value),
                      ),
                      h(
                        "td",
                        { style: Object.assign({}, TD, { fontSize: 10 }) },
                        h(
                          "span",
                          {
                            style: Object.assign(
                              { padding: "2px 6px", borderRadius: 4 },
                              mode === "replace"
                                ? { background: C.rBg, color: C.bad }
                                : mode === "add"
                                  ? { background: C.muted, color: C.mu }
                                  : row.changes
                                    ? { background: C.wStrong, color: C.warn }
                                    : { background: C.muted, color: C.mu },
                            ),
                          },
                          rowActionText(row),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      /* وضعُ الاستيراد (RadioGroup: grid gap-2 مع space-y-2) والخلايا الفارغة (gap-2 مع space-y-1.5) — ومجموعتا الأزرار الدائرية
   في الأصل من Radix واتجاهُهما ltr افتراضياً (الدائرةُ يساراً والنصُّ بعدها)، فتُنقلان كذلك */
      /* العنوانان في الأصل <label> سطريٌّ داخل كتلةٍ بخطّ الصفحة (Tajawal ‏16/24): سطرُه ٢٥ بكسل وخطُّ القاعدة على ١٥ — وفي Windows (مقاييس win للخط) ٢٤ و١٧ —
   فيُثبَّت هنا ارتفاعُ السطر وموضعُ النص صراحةً كي يطابقا الأصلَ على كل جهاز */
      const WINF = /Windows/.test(navigator.userAgent || "");
      const modeKids = [
        h(
          "div",
          { key: "l", style: { position: "relative", height: WINF ? 24 : 25 } },
          h(
            "label",
            {
              style: {
                position: "absolute",
                top: WINF ? -1 : -3,
                right: 0,
                whiteSpace: "nowrap",
                fontFamily: FF,
                fontSize: 14,
                lineHeight: "26px",
                fontWeight: 700,
                color: C.fg,
              },
            },
            "وضع الاستيراد",
          ),
        ),
        h(
          "div",
          { key: "g", role: "radiogroup", dir: "ltr", "data-testid": "hist-mode-group", style: { display: "grid", gap: 8, marginTop: 12 } },
          ...Object.keys(MODE_LABELS).map((k, i) => {
            const v = MODE_LABELS[k],
              on = mode === k,
              pick = () => this.hiSet({ mode: k });
            return h(
              "label",
              {
                key: k,
                "data-testid": "hist-mode-" + k,
                onClick: pick,
                className: on ? "" : "bshi-mode",
                style: {
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid " + (on ? C.bd40 : C.bd),
                  background: on ? C.p5 : "transparent",
                  cursor: "pointer",
                  transition: "all .15s",
                  marginTop: i ? 8 : 0,
                },
              },
              radio(on, pick, "hist-mode-radio-" + k),
              h(
                "div",
                { style: { flex: 1, minWidth: 0 } },
                h("div", { style: { fontFamily: FF, fontSize: 14, lineHeight: "20px", fontWeight: 600, color: C.fg } }, v.ar),
                h("div", { style: { fontFamily: FF, fontSize: 11, lineHeight: "16.5px", color: C.mu } }, v.hint),
              ),
            );
          }),
        ),
      ];
      if (mode === "update")
        modeKids.push(
          h(
            "div",
            { key: "b", "data-testid": "hist-blank-handling", style: { background: C.faint, borderRadius: 8, padding: 12, marginTop: 12 } },
            h(
              "div",
              { style: { position: "relative", height: 24 } },
              h(
                "label",
                {
                  style: {
                    position: "absolute",
                    top: WINF ? 1 : -2,
                    right: 0,
                    whiteSpace: "nowrap",
                    fontFamily: FF,
                    fontSize: 12,
                    lineHeight: "23px",
                    fontWeight: 700,
                    color: C.fg,
                  },
                },
                "الخلايا الفارغة في الملف",
              ),
            ),
            h(
              "div",
              { role: "radiogroup", dir: "ltr", style: { display: "grid", gap: 8, marginTop: 8 } },
              ...[
                ["ignore", "تجاهلها", " — احتفظ بالقيم الموجودة (افتراضي)."],
                ["clear", "امسحها", " — استبدل الموجود بـ null."],
              ].map((q, i) => {
                const on = blank === q[0],
                  pick = () => this.hiSet({ blank: q[0] });
                return h(
                  "label",
                  {
                    key: q[0],
                    "data-testid": "hist-blank-" + q[0],
                    onClick: pick,
                    style: {
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      cursor: "pointer",
                      fontSize: 12,
                      lineHeight: "16px",
                      fontFamily: FF,
                      color: C.fg,
                      marginTop: i ? 6 : 0,
                    },
                  },
                  radio(on, pick, "hist-blank-radio-" + q[0]),
                  h("span", null, h("span", { style: { fontWeight: 600 } }, q[1]), q[2]),
                );
              }),
            ),
          ),
        );
      blocks.push(h("div", { style: { borderTop: "1px solid " + C.bd, paddingTop: 16 } }, ...modeKids));
      blocks.push(
        h(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 12, paddingTop: 8 } },
          btn(
            { tid: "hist-import-btn", onClick: () => this.hiImportClick(), disabled: importing || P.errors_total > 0 },
            importing ? ic("loader", 16, null, "bshi-spin") : ic("upload", 16),
            "تنفيذ الاستيراد",
          ),
          P.errors_total > 0
            ? h(
                "span",
                {
                  style: { fontSize: 12, lineHeight: "16px", color: C.bad, fontFamily: FF, display: "flex", alignItems: "center", gap: 4 },
                },
                ic("alert", 14),
                "أصلح الأخطاء أولاً قبل التنفيذ",
              )
            : null,
        ),
      );
      out.push(
        card(
          C.bd20,
          C.card,
          "hist-preview-card",
          head(12, title(16, "24px", null, ic("check", 16, { color: C.goodI }), "تقرير المعاينة")),
          content(16, blocks),
        ),
      );
    }
    /* ── النتيجة ── */
    if (result) {
      const R = result;
      out.push(
        card(
          C.bdG,
          "linear-gradient(" + C.gFaint + "," + C.gFaint + ")," + C.card,
          "hist-result-card",
          head(12, title(16, "24px", C.good, ic("check", 16), "تم الاستيراد")),
          h(
            "div",
            { style: { padding: "0 24px 24px 24px" } },
            h(
              "div",
              { className: "bshi-grid" },
              pill("مُضاف", R.inserted, "good", "res-inserted"),
              pill("مُحدّث", R.updated, "primary", "res-updated"),
              pill("مُتخطّى", R.skipped, "default", "res-skipped"),
              pill("محذوف", R.deleted, R.deleted ? "warn" : "default", "res-deleted"),
              pill("أخطاء", R.errors_total, R.errors_total ? "bad" : "default", "res-errors"),
              pill("المواقع", (R.affected_sites || []).join("، ") || "—", "default", "res-sites"),
              pill("السنوات", (R.affected_years || []).join("، ") || "—", "default", "res-years"),
              pill("الأشهر", (R.affected_months || []).length || 0, "default", "res-months"),
            ),
          ),
        ),
      );
    }
    /* ── الحواران (AlertDialog): التركيزُ على زرّ التأكيد · Enter يؤكّد · Escape يُلغي · النقرُ خارجَ البطاقة لا يُغلق ── */
    const dialog = (tid, onClose, onOk, titleColor, titleText, desc, okText, okV, okTid, cancelTid) => {
      const pick = (root) => root && root.querySelector('[data-confirm-action="true"]');
      const grab = (el) => {
        if (!el || !this._hiFocus) return;
        this._hiFocus = !1;
        const f = () => {
          try {
            const b = pick(el);
            b && b.isConnected && b.focus({ preventScroll: !0 });
          } catch (e) {}
        };
        f();
        setTimeout(f, 60);
      };
      return h(
        "div",
        {
          onMouseDown: (e) => {
            e.target === e.currentTarget && e.preventDefault();
          },
          onClick: (e) => {
            e.target === e.currentTarget && e.nativeEvent && !e.nativeEvent.isTrusted && onClose();
          },
          style: {
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 70,
            background: C.ov,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          },
        },
        h(
          "div",
          {
            role: "alertdialog",
            "aria-modal": "true",
            dir: "rtl",
            "data-testid": tid,
            ref: grab,
            className: "bshi-dc",
            onKeyDown: (e) => {
              if (e.key === "Enter" && !e.shiftKey && e.target && e.target.tagName !== "TEXTAREA") {
                const b = pick(e.currentTarget);
                if (b && !b.disabled) {
                  e.preventDefault();
                  b.click();
                }
              } else if (e.key === "Escape") {
                e.preventDefault();
                onClose();
              }
            },
            style: {
              display: "grid",
              gap: 16,
              width: "100%",
              maxWidth: 512,
              boxSizing: "border-box",
              border: "1px solid " + C.bd,
              background: C.modal,
              padding: 24,
              boxShadow: SHLG,
              color: C.fg,
              fontSize: 16,
              lineHeight: "24px",
            },
          },
          h(
            "div",
            { className: "bshi-dh", style: { display: "flex", flexDirection: "column" } },
            h(
              "h2",
              {
                style: {
                  margin: 0,
                  fontSize: 18,
                  lineHeight: "28px",
                  fontWeight: 600,
                  fontFamily: FF,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: titleColor,
                },
              },
              ic("shield", 20),
              titleText,
            ),
            h("div", { style: { marginTop: 8, fontSize: 14, lineHeight: "20px", color: C.mu, fontFamily: FF } }, ...desc),
          ),
          h(
            "div",
            { className: "bshi-df" },
            btn({ tid: cancelTid, v: "outline", cls: "bshi-can", onClick: onClose }, "إلغاء"),
            btn(
              {
                tid: okTid,
                v: okV,
                act: !0,
                onClick: () => {
                  onOk();
                },
              },
              okText,
            ),
          ),
        ),
      );
    };
    if (H.cfRep && preview) {
      const P = preview,
        sites = P.sample_changes ? Array.from(new Set(P.sample_changes.map((s) => s.site))).join("، ") : "";
      out.push(
        dialog(
          "hist-replace-confirm",
          () => this.hiSet({ cfRep: !1 }),
          () => {
            this.hiSet({ cfRep: !1 });
            this.hiDoImport();
          },
          C.bad,
          "تأكيد استبدال الفترة",
          [
            h(
              "span",
              { key: 1, style: { display: "block" } },
              "سيتم ",
              h("span", { style: { fontWeight: 700, color: C.bad } }, "حذف"),
              " كل السجلات الموجودة في:",
            ),
            h(
              "span",
              {
                key: 2,
                style: {
                  display: "block",
                  marginTop: 8,
                  background: C.rBg,
                  border: "1px solid " + C.bdR,
                  borderRadius: 4,
                  padding: 8,
                  color: C.bad,
                  fontSize: 12,
                  lineHeight: "16px",
                },
              },
              "المواقع: " + sites,
              h("br"),
              "الأشهر: " + (P.months || []).join("، "),
            ),
            h(
              "span",
              { key: 3, style: { display: "block", marginTop: 8 } },
              "ثم إعادة إدخال السجلات من هذا الملف. هذه العملية لا يمكن التراجع عنها — يرجى التأكد قبل المتابعة.",
            ),
          ],
          "تأكيد الحذف والاستبدال",
          "danger",
          "hist-replace-confirm-yes",
          "hist-replace-confirm-cancel",
        ),
      );
    }
    if (H.cfFin && preview) {
      const P = preview,
        row = (label, val, color, tid, first) =>
          h(
            "span",
            { key: tid, style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: first ? 0 : 4 } },
            h("span", null, label),
            h("span", { "data-testid": tid, style: { fontWeight: 700, fontVariantNumeric: "tabular-nums", color: color } }, val),
          );
      out.push(
        dialog(
          "hist-final-confirm",
          () => this.hiSet({ cfFin: !1 }),
          () => {
            this.hiSet({ cfFin: !1 });
            this.hiDoImport();
          },
          C.br,
          "تأكيد تنفيذ الاستيراد",
          [
            h(
              "span",
              { key: 1, style: { display: "block" } },
              "الوضع المختار: ",
              h("span", { style: { fontWeight: 700 } }, MODE_LABELS[mode].ar),
            ),
            h(
              "span",
              {
                key: 2,
                style: {
                  display: "block",
                  marginTop: 12,
                  background: C.faint,
                  border: "1px solid " + C.bd,
                  borderRadius: 4,
                  padding: 12,
                  fontSize: 12,
                  lineHeight: "16px",
                },
              },
              row("سجلات سيتم إضافتها:", P.new_records == null ? 0 : P.new_records, C.good, "final-confirm-add", !0),
              row(
                "سجلات موجودة (" + (mode === "add" ? "ستُتخطّى" : mode === "replace" ? "ستُحذف وتُعاد" : "ستُحدّث") + "):",
                P.existing_records == null ? 0 : P.existing_records,
                mode === "add" ? C.mu : C.warn,
                "final-confirm-existing",
              ),
              row("صفوف فارغة (ستُتجاهل):", P.ignored_empty_rows == null ? 0 : P.ignored_empty_rows, C.mu, "final-confirm-ignored"),
              row("أخطاء:", P.errors_total == null ? 0 : P.errors_total, P.errors_total ? C.bad : C.mu, "final-confirm-errors"),
            ),
            h(
              "span",
              { key: 3, style: { display: "block", marginTop: 12, fontSize: 12, lineHeight: "16px", color: C.mu } },
              "هل تريد المتابعة؟",
            ),
          ],
          "تأكيد التنفيذ",
          "primary",
          "hist-final-confirm-yes",
          "hist-final-confirm-cancel",
        ),
      );
    }
    return h(
      "div",
      {
        dir: "rtl",
        "data-testid": "historical-import-panel",
        className: "bshi-root",
        style: { display: "flex", flexDirection: "column", gap: 24, fontFamily: FF, color: C.fg },
      },
      ...out.map((k, i) => h(F, { key: i }, k)),
    );
  }
