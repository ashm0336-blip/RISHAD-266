    const a = KIVO.BassamField;
    if (
      ((t.fdOn = !1), (t.fdDlgOn = !1), (t.fdNoteOn = !1), (t.fdNote = ""), (t.fdRows = []), !a || !e.isStaff || !(e.mySpots || []).length)
    )
      return;
    const r = e.mySpots;
    if (!a.canField()) {
      t.fdNoteOn = !0;
      const e = KIVO.BassamPerm;
      let s = [],
        a = [];
      try {
        s = (e && e.deptCap && e.deptCap()) || [];
      } catch (t) {}
      try {
        a = (e && e.deptTabs && e.deptTabs(null, "daily")) || [];
      } catch (t) {}
      const r = "رصد الميدان (حالة موقعك ومساره) ";
      return void (-1 === s.indexOf("daily")
        ? (t.fdNote =
            r +
            "يحتاج تفعيل صفحة «المتابعة اليومية» في سقف إدارتك أولاً — يفعّلها مسؤول المنصة من «الإدارات»، ثم يمنحك مدير الإدارة ورقة «رصد الميدان»")
        : -1 === a.indexOf("field")
          ? (t.fdNote = r + "يحتاج تفعيل ورقة «رصد الميدان» ضمن أوراق «المتابعة اليومية» لإدارتك — يفعّلها مسؤول المنصة من «الإدارات»")
          : (t.fdNote =
              r +
              "يحتاج ورقة «رصد الميدان» في صلاحيتك: صلاحيات الموظف ← المتابعة اليومية ← رصد الميدان (أو قالب «راصد ميدان») — يمنحها مدير الإدارة"));
    }
    const n = e.DK,
      i = (t, e) => {
        t.ok
          ? ((this._pfFieldPending = false), t.same) || ((this._pfMemo = null), this.setState({ pfTick: (s.pfTick || 0) + 1, fdDlg: null }), this.bsAck(e, "ok"))
          : ((this._pfFieldPending = t.status === "uncertain" || t.uncertain === true), this.bsToast(t.err || "لم يُؤكَّد الرصد — المسودة باقية؛ أعد الإجراء نفسه", "warn"));
      },
      o = [];
    if (
      (r.forEach((t) => {
        const s = -1 !== a.KINDS.indexOf(t.kind) ? t.kind : "gates",
          r = a.KIND_AL[s] || "الموقع",
          f = a.flowOn(s),
          l = ((e.rnd && e.rnd.d && e.rnd.d[t.fi] && e.rnd.d[t.fi][s]) || [])[t.i];
        if (!l) return;
        const h = a.stateOf(l, s),
          c = f ? a.flowOf(l) : "",
          p = t.fi,
          m = t.i,
          d = "open" === h ? "مفتوح" : "gates" === s ? "مغلق" : "معطّل",
          y = [
            a.KIND_T[s] || "موقع",
            d + ("closed" === h && l.cWhy ? " — " + l.cWhy : ""),
            "open" === h && c ? a.FLOWS[c].a + " " + a.FLOWS[c].t : "",
            l.fAt ? a.clock(l.fAt) + (l.fBy ? " · " + l.fBy : "") : "لم يُرصد بعد",
          ]
            .filter(Boolean)
            .join(" · ");
        o.push({
          key: s + ":" + p + ":" + m,
          name: a.label(l, s),
          meta: y,
          color: "open" === h ? "#16a34a" : "#64748b",
          flowOn: f,
          flCls: "fd-fl" + ("open" === h ? "" : " dis"),
          flows: a.FLOW_ORDER.map((t) => ({
            k: t,
            t: a.FLOWS[t].t,
            one: "both" !== t,
            two: "both" === t,
            a: a.FLOWS[t].a,
            arCls: "fd-ar" + ("out" === t ? " r" : ""),
            cls: "fd-fb" + (t === c && "open" === h ? " on" : ""),
            pick: async () => {
              if ("closed" === h) return void this.bsToast(r + " مغلق — أعد فتحه أولاً ثم حدّد المسار", "warn");
              if (t === c) return;
              this._pfFieldPending = true;
              const e = await a.observe(n, p, m, { flow: t, kind: s, expected: l });
              i(e, "سُجّل المسار: " + a.FLOWS[t].t + " — " + a.label(l, s));
            },
          })),
          stOn: "open" === h,
          stOff: "closed" === h,
          stCls: "fd-tg " + ("open" === h ? "on" : "off"),
          stTitle: "open" === h ? ("gates" === s ? "إغلاق الباب" : "تعطيل الموقع") : "إعادة الفتح",
          stPick: async () => {
            if ("open" === h) return void this.setState({ fdDlg: { why: "", txt: "", fi: p, gi: m, kind: s, name: a.label(l, s), g: l } });
            this._pfFieldPending = true;
            const t = await a.observe(n, p, m, { st: "open", kind: s, expected: l });
            i(
              t,
              "سُجّل: أُعيد فتح " +
                a.label(l, s) +
                (t.entry && t.entry.dur ? " · مدة الإغلاق " + KIVO.BassamCount(t.entry.dur, "دقيقة") + "" : ""),
            );
          },
        });
      }),
      !o.length)
    )
      return (
        (t.fdNoteOn = !0),
        void (t.fdNote = e.rnd
          ? "رصد الميدان يبدأ عندما تكون على موقعك في جولة اليوم"
          : "رصد الميدان يبدأ مع جولة اليوم — لم تُنشأ بعد (تُنشأ من المتابعة اليومية أو عند سحب التقرير اليومي)")
      );
    ((t.fdOn = !0), (t.fdRows = o), (t.fdPill = o.length > 1 ? KIVO.BassamCount(o.length, "موقع") + " لك اليوم" : "موقعك اليوم"));
    const f = s.fdDlg;
    if (!f) return;
    ((t.fdDlgOn = !0),
      (t.fdSpot = f.name || ""),
      (t.fdStop = (t) => {
        try {
          t.stopPropagation();
        } catch (t) {}
      }),
      (t.fdReasons = a.REASONS.map((t) => ({
        t: t,
        cls: "fd-chip" + (f.why === t ? " on" : ""),
        pick: () => this.setState({ fdDlg: { ...f, why: t } }),
      }))),
      (t.fdWhyTxt = f.txt),
      (t.fdOnWhy = (t) => this.setState({ fdDlg: { ...f, txt: t.target.value } })),
      (t.fdWhyPh = "أخرى" === f.why && "gates" !== f.kind ? "اكتب السبب — مطلوب مع «أخرى»" : "تفصيل السبب (اختياري)"),
      (t.fdNow = a.clock()),
      (t.fdMe = (KIVO.BassamAuth && KIVO.BassamAuth.display && KIVO.BassamAuth.display().name) || ""));
    /* V7 · 53 (REVIEW ١١-أ): سببُ إغلاق الباب اختياريّ — يُسجَّل الإغلاقُ بلا سبب، ويُحفظ ما كُتب */
    const l = "gates" === f.kind || !(!f.why || ("أخرى" === f.why && !f.txt.trim()));
    ((t.fdOkDis = !l),
      (t.fdDlgNo = () => this._pfFieldPending ? this.bsToast("الرصد السابق لم يُحسم — أعد تأكيد الطلب نفسه قبل إغلاق المسودة", "warn") : this.setState({ fdDlg: null })),
      (t.fdDlgOk = async () => {
        if (!l) return;
        this._pfFieldPending = true;
        const t = "أخرى" === f.why || !f.why ? f.txt.trim() : f.txt.trim() ? f.why + " — " + f.txt.trim() : f.why,
          e = await a.observe(n, f.fi, f.gi, { st: "closed", why: t, kind: f.kind, expected: f.g });
        i(e, "سُجّل إغلاق " + (f.name || "") + " الساعة " + a.clock());
      }));
