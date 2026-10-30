class Component extends KIVO.BassamPageKit.base(DCLogic, ["admin+award+daily+dreport+employees+irshad+plan+profile+seized+staff+tasks","daily+dreport+dstats+irshad+plan+seized+staff+tasks","daily+dreport+irshad+plan+seized+staff+tasks","dreport+irshad+planning+profile+seized+staff+tasks","daily+dreport+irshad+plan+profile+seized","award+irshad+seized","irshad+seized+tasks","dstats+irshad","irshad+seized"]) {
  hParts(t) {
    const e = this._hfmt().formatToParts(t),
      r = (t) => +e.find((e) => e.type === t).value;
    return { y: r("year"), m: r("month"), d: r("day") };
  }
  hGreg(t, e, r) {
    let a = new Date(new Date(2026, 5, 16).getTime() + 864e5 * (29.5306 * (12 * (t - 1448) + (e - 1)) + (r - 1)));
    try {
      for (let i = 0; i < 12; i++) {
        const i = this.hParts(a);
        if (i.y === t && i.m === e && i.d === r) return a;
        const s = 354.367 * (i.y - t) + 29.5306 * (i.m - e) + (i.d - r);
        a = new Date(a.getTime() - 864e5 * (Math.round(s) || (s > 0 ? 1 : -1)));
      }
    } catch (t) {}
    return a;
  }
  hMonthDays(t, e) {
    const r = t + "-" + e;
    if (((this.__hd = this.__hd || {}), this.__hd[r])) return this.__hd[r];
    let a = 30;
    try {
      const r = this.hGreg(t, e, 1),
        i = this.hParts(new Date(r.getTime() + 25056e5));
      a = i.y === t && i.m === e ? 30 : 29;
    } catch (t) {}
    return ((this.__hd[r] = a), a);
  }
  hGregMonthLabel(t, e) {
    const r = t + "-" + e;
    if (((this.__hg = this.__hg || {}), this.__hg[r])) return this.__hg[r];
    let a = "";
    try {
      a = this.hGreg(t, e, 15).toLocaleDateString("ar-u-ca-gregory-nu-latn", { month: "long", year: "numeric" });
    } catch (t) {}
    return ((this.__hg[r] = a), a);
  }
  hGregYearRange(t) {
    try {
      const e = this.hGreg(t, 1, 1).getFullYear(),
        r = this.hGreg(t, 12, 29).getFullYear();
      return e === r ? e + " م" : e + " – " + r + " م";
    } catch (t) {
      return "";
    }
  }
  LANGS = [
    "العربية",
    "الإنجليزية",
    "الأردية",
    "الهندية",
    "النيبالية",
    "البنغالية",
    "التركية",
    "الفرنسية",
    "الهوساوية",
    "الملايوية",
    "الأوزبكية",
    "الطاجيكية",
    "الروسية",
    "الكازاخية",
    "البشتو",
    "الفارسية",
    "الصينية",
    "الفلبينية",
    "التشادية",
    "البرماوية",
    "البنجابية",
    "السواحلية",
  ];
  bsToast(t, e) {
    try {
      const r = e || "err";
      let a = document.getElementById("bs-toast");
      a || ((a = document.createElement("div")), (a.id = "bs-toast"), document.body.appendChild(a));
      const i =
        "ok" === r
          ? ["var(--toast-ok)", "var(--bg-toast)", "var(--toast-ok-bd)", "✓"]
          : "warn" === r
            ? ["var(--toast-warn)", "var(--bg-toast)", "var(--toast-warn-bd)", "⚠"]
            : ["var(--toast-err)", "var(--bg-toast)", "var(--toast-err-bd)", "⚠"];
      (a.setAttribute(
        "style",
        "position:fixed;top:16px;left:50%;transform:translateX(-50%) translateY(-8px);z-index:2147483000;max-width:min(560px,92vw);direction:rtl;text-align:right;font-family:'Cairo',sans-serif;font-size:13px;font-weight:600;line-height:1.9;color:" +
          i[0] +
          ";background:" +
          i[1] +
          ";border:1px solid " +
          i[2] +
          ";border-radius:14px;padding:12px 18px;box-shadow:var(--shadow-elevated);opacity:0;transition:opacity .22s ease, transform .22s ease;pointer-events:none",
      ),
        (a.textContent = i[3] + "  " + String(null == t ? "" : t)),
        requestAnimationFrame(() => {
          try {
            ((a.style.opacity = "1"), (a.style.transform = "translateX(-50%) translateY(0)"));
          } catch (t) {}
        }),
        clearTimeout(this._bsToastT),
        (this._bsToastT = setTimeout(() => {
          try {
            ((a.style.opacity = "0"), (a.style.transform = "translateX(-50%) translateY(-8px)"));
          } catch (t) {}
        }, 4200)));
    } catch (t) {}
  }
  loadIrshad() {
    try {
      return JSON.parse(localStorage.getItem("bassam_irshad_v1")) || { reports: [] };
    } catch (t) {
      return { reports: [] };
    }
  }
  saveIrshad(t) {
    if (this._irCanWrite())
      try {
        localStorage.setItem("bassam_irshad_v1", JSON.stringify(t));
      } catch (t) {}
    else this.permDeny();
  }
  benOf(t) {
    return (t.langs || []).reduce((t, e) => t + (e.count || 0), 0) + (t.bro || 0) + (t.pros || 0) + (t.pol || 0);
  }
  loadIrshadLangs() {
    try {
      const t = localStorage.getItem("bassam_irshad_langs_v1");
      if (t) {
        const e = JSON.parse(t);
        if (Array.isArray(e) && e.length) return e;
      }
    } catch (t) {}
    return this.LANGS.slice();
  }
  saveIrshadLangs(t) {
    if (this._irCanWrite())
      try {
        localStorage.setItem("bassam_irshad_langs_v1", JSON.stringify(t));
      } catch (t) {}
    else this.permDeny();
  }
  loadIrshadLocs() {
    try {
      const t = localStorage.getItem("bassam_irshad_locs_v1"),
        e = t ? JSON.parse(t) : [];
      return Array.isArray(e) ? e : [];
    } catch (t) {
      return [];
    }
  }
  saveIrshadLocs(t) {
    if (this._irCanWrite())
      try {
        localStorage.setItem("bassam_irshad_locs_v1", JSON.stringify(t));
      } catch (t) {}
    else this.permDeny();
  }
  loadStaffingIr() {
    try {
      const t = localStorage.getItem("bassam_staffing_v3"),
        e = t ? JSON.parse(t) : null,
        r = e && "object" == typeof e ? e : {};
      return KIVO.BassamStaffSnap ? KIVO.BassamStaffSnap.all(r) : r;
    } catch (t) {
      return {};
    }
  }
  employeesForShift(t, e, r, a) {
    if (!this.bsOn("staff"))
      return this.loadEmployeesIr()
        .filter((t) => t && t.eid)
        .map((t) => ({ eid: t.eid, name: t.name || "بدون اسم" }));
    const i = this.loadStaffingIr()[t + "-" + e] || {};
    return this.loadEmployeesIr()
      .filter((t) => {
        const e = t && t.eid;
        if (!e) return !1;
        const s = i[e];
        return !(!s || s.shift !== r) && !(Array.isArray(s.rest) ? s.rest : []).includes(a);
      })
      .map((t) => ({ eid: t.eid, name: t.name || "بدون اسم" }));
  }
  emptyDraft() {
    return { shift: "", eid: "", loc: "", bro: "", pros: "", pol: "", langs: [], langSel: "", langN: "" };
  }
  state = (() => {
    const t = this.hToday();
    return {
      rowMenu: null,
      irTab: "dash",
      irYear: t.y,
      irMonth: t.m,
      irDay: t.d,
      irOpenMonths: {},
      irOpenDays: {},
      irDraft: this.emptyDraft(),
      irEditId: null,
      irSaveErrMsg: "",
      irLedgerOpen: !1,
      irLedgerPage: 1,
      irLedgerPerPage: 10,
      irLangPopOpen: !1,
      irLangEditIdx: -1,
      irLangEditVal: "",
      irLangNewVal: "",
      irLocPopOpen: !1,
      irLocEditIdx: -1,
      irLocEditVal: "",
      irLocNewVal: "",
      irLgSearch: "",
      irLgFilesOpen: !1,
      irLgFddOpen: null,
      irLgShift: "all",
      irLgLoc: "all",
      irLgClearAllConfirm: !1,
      irDashYear: null,
      irDashMonth: null,
      irDashMode: "month",
      irDashFrom: "",
      irDashTo: "",
      irDashBrk: "total",
      irDashSumOpen: !1,
      irDashSumQ: "",
      irDashSumPage: 1,
      irDashSumPerPage: 10,
    };
  })();
  PC(t) {
    try {
      return !!KIVO.BassamPerm && KIVO.BassamPerm.can("irshad", t || "view");
    } catch (t) {
      return !1;
    }
  }
  permDeny() {
    try {
      this.bsToast("صلاحيتك على نظام الاسترشاد لا تشمل هذا الإجراء — راجع مدير الإدارة");
    } catch (t) {}
  }
  bsMenusPatch() {
    return { rowMenu: null, irLgFddOpen: null, irLgFilesOpen: !1, irLangPopOpen: !1, irLocPopOpen: !1 };
  }
  /* الفحص العميق 2026-10-21 (R7): رابطُ #/irshad/<records|dash> — يُطبَّق متزامناً قبل حساب القيم، ويبقى في العنوان ما يُعرض فعلاً.
     نسخُ solo (داخل مؤشرات الإدارة) لا تشارك */
  _bsHT(t) {
    try {
      if (this.props && this.props.solo) return;
      const h = String(location.hash || ""),
        p = "#/irshad";
      if (h.indexOf(p) !== 0) return;
      const w = t ? p + "/" + t : p;
      h !== w && history.replaceState && history.replaceState(null, "", location.pathname + location.search + w);
    } catch(e) { /* لا يمنع العرض — يُتجاوز بصمت */ }
  }
  _bsHR() {
    try {
      if (this.props && this.props.solo) return "";
      const o = KIVO.__BS_OPEN_TAB;
      if (!o || o.page !== "irshad") return "";
      KIVO.__BS_OPEN_TAB = null;
      const t = o.tab;
      if ("records" !== t && "dash" !== t) return (this._bsHT(""), "");
      this.state.irTab !== t && (this.state = { ...this.state, irTab: t });
      return t;
    } catch (e) {
      return "";
    }
  }
  renderVals() {
    const q = this._bsHR(),
      t = this._irPermVals(),
      e = this.state,
      r = (t) =>
        "position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 16px;border-radius:12px;transition:all .3s;flex-shrink:0;min-width:150px;cursor:pointer;font-family:'Cairo',sans-serif;" +
        (t
          ? "background:var(--bg-xffffff);box-shadow:0 3px 10px -4px rgba(138,111,53,0.45);border:2px solid var(--bd-a185151810p45)"
          : "background:transparent;border:2px solid transparent"),
      a = (t) =>
        "width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;transition:all .3s;" +
        (t ? "background:var(--bg-a185151810p1);color:var(--fg-xb99751)" : "background:var(--bg-a2452452450p9);color:var(--fg-x94a3b8)"),
      i = (t) =>
        "font-size:12px;transition:color .3s;" +
        (t ? "font-weight:600;color:var(--fg-xb99751)" : "font-weight:400;color:var(--fg-x53565a)"),
      s = (t) => {
        try {
          return !KIVO.BassamPerm || !KIVO.BassamPerm.subOn || KIVO.BassamPerm.subOn("irshad", t);
        } catch (t) {
          return !0;
        }
      },
      n = !(!this.props || "dash" !== this.props.solo) && s("dash"),
      o = s("records"),
      l = !(!this.props || "dash" !== this.props.solo);
    let h = l ? "dash" : "records" === e.irTab ? "records" : "dash";
    ("dash" === h && !n && o && (h = "records"), "records" === h && !o && n && (h = "dash"));
    q && q !== h && this._bsHT(h);
    const d = "dash" === h && n,
      g = "records" === h && o,
      c = {
        irOnDash: d,
        irOnRecords: g,
        irDashTabOk: n,
        irRecordsTabOk: o,
        irTabBarShow: !l && !(!n || !o),
        irDashTabStyle: r(d),
        irDashTabIcon: a(d),
        irDashTabLbl: i(d),
        irGoDash: () => (this._bsHT("dash"), this.setState({ irTab: "dash" })),   /* العنوانُ يتبع التبويب (R7) */
        irRecordsTabStyle: r(g),
        irRecordsTabIcon: a(g),
        irRecordsTabLbl: i(g),
        irGoRecords: () => (this._bsHT("records"), this.setState({ irTab: "records" })),
        ...t,
      };
    return (g && Object.assign(c, this._recordsCalVals()), d && Object.assign(c, this._dashVals()), c);
  }
  _dashVals() {
    const t = this.state,
      e = this.hToday(),
      r = this.loadIrshad().reports || [],
      a = 864e5,
      i = this.MONTHS,
      s = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
      n = (t) => (KIVO.bsPct ? KIVO.bsPct(t) : String(Math.round(t || 0))),
      o = (t) => Math.round(t || 0).toLocaleString("en-US"),
      l = (t) => o(t).replace(/[0-9]/g, (t) => "٠١٢٣٤٥٦٧٨٩"[+t]),
      h = (t) =>
        (t = Math.round(t || 0)) >= 1e6
          ? (t / 1e6).toFixed(1).replace(/\.0$/, "") + " مليون"
          : t >= 1e4
            ? Math.round(t / 1e3) + " ألف"
            : t >= 1e3
              ? (t / 1e3).toFixed(1).replace(/\.0$/, "") + " ألف"
              : o(t),
      d = (t) => (1 === t ? "يوم واحد" : 2 === t ? "يومين" : t >= 3 && t <= 10 ? t + " أيام" : KIVO.BassamCount(t, "يوم") + "");
    this.__hpc = this.__hpc || {};
    const g = (t) => (this.__hpc[t] || (this.__hpc[t] = this.hParts(new Date(t))), this.__hpc[t]),
      c = (t) => new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime(),
      p = (t) => {
        const e = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t || "");
        return e ? new Date(+e[1], +e[2] - 1, +e[3]).getTime() : null;
      },
      m = (t) => {
        const e = new Date(t),
          r = (t) => (t < 10 ? "0" + t : "" + t);
        return e.getFullYear() + "-" + r(e.getMonth() + 1) + "-" + r(e.getDate());
      },
      u = (t) => t.d + " " + i[t.m - 1] + " " + t.y + " هـ",
      f = (t) => (t.langs || []).reduce((t, e) => t + (e.count || 0), 0),
      b = (t) => this.benOf(t),
      S = r,
      x = (t) => 1e4 * t.y + 100 * t.m + t.d,
      y = (t) => 100 * t.y + t.m,
      D = {},
      L = {};
    r.forEach((t) => {
      t.y && ((D[t.y] = 1), (L[t.y + "-" + t.m] = 1));
    });
    let w = Object.keys(D)
      .map(Number)
      .sort((t, e) => e - t);
    w.length || (w = [e.y]);
    const v = null == t.irDashYear || "all" === String(t.irDashYear);
    let P = v ? w[0] : +t.irDashYear;
    w.indexOf(P) < 0 && (P = w[0]);
    const M = [];
    for (let t = 1; t <= 12; t++) L[P + "-" + t] && M.push(t);
    let O = v ? "all" : null == t.irDashMonth ? "" : String(t.irDashMonth);
    !v && "all" !== O && M.indexOf(+O) < 0 && (O = M.length ? String(M[M.length - 1]) : "all");
    const E = (t, e) => this.hMonthDays(t, e),
      k = (t, r) => (t > e.y ? 0 : t < e.y || r < e.m ? E(t, r) : r === e.m ? e.d : 0),
      F = "custom" === t.irDashMode ? "custom" : v ? "all" : "month",
      C = c(this.hGreg(e.y, e.m, e.d));
    let T = p(t.irDashFrom),
      _ = p(t.irDashTo);
    if ("custom" === F && (null == T && (T = C - 29 * a), null == _ && (_ = C), T > _)) {
      const t = T;
      ((T = _), (_ = t));
    }
    let I = [],
      N = [],
      A = [],
      B = !0,
      Y = "",
      H = "",
      V = 0,
      G = P;
    if ("all" === F) {
      ((I = S.slice()), (B = !1));
      const t = {};
      (r.forEach((e) => {
        t[y(e)] = { y: e.y, m: e.m };
      }),
        (A = Object.keys(t)
          .map(Number)
          .sort((t, e) => t - e)
          .map((e) => ({ k: e, lab: i[t[e].m - 1], full: i[t[e].m - 1] + " " + t[e].y + " هـ" }))),
        (Y = "كل الفترة"));
      let e = null;
      if (
        (r.forEach((t) => {
          const r = x(t);
          (null == e || r < e) && (e = r);
        }),
        null != e)
      ) {
        const t = Math.floor(e / 1e4),
          r = Math.floor(e / 100) % 100,
          i = e % 100;
        try {
          V = Math.round((C - c(this.hGreg(t, r, i))) / a) + 1;
        } catch (t) {
          V = 30 * A.length;
        }
      }
      G = w[0];
    } else if ("custom" === F) {
      const t = g(T),
        e = g(_),
        r = 1e4 * t.y + 100 * t.m + t.d,
        s = 1e4 * e.y + 100 * e.m + e.d;
      if (
        ((I = S.filter((t) => {
          const e = x(t);
          return e >= r && e <= s;
        })),
        (V = Math.round((_ - T) / a) + 1),
        (B = V <= 62),
        B)
      )
        for (let t = T; t <= _; t += a) {
          const e = g(t);
          A.push({ k: 1e4 * e.y + 100 * e.m + e.d, lab: String(e.d), full: u(e) });
        }
      else {
        const t = {};
        for (let e = T; e <= _; e += a) {
          const r = g(e);
          t[100 * r.y + r.m] = r;
        }
        A = Object.keys(t)
          .map(Number)
          .sort((t, e) => t - e)
          .map((e) => ({ k: e, lab: i[t[e].m - 1], full: i[t[e].m - 1] + " " + t[e].y + " هـ" }));
      }
      Y = u(t) + " ← " + u(e);
      const n = T - a,
        o = g(T - V * a),
        l = g(n),
        h = 1e4 * o.y + 100 * o.m + o.d,
        d = 1e4 * l.y + 100 * l.m + l.d;
      ((N = S.filter((t) => {
        const e = x(t);
        return e >= h && e <= d;
      })),
        (H = u(o) + " ← " + u(l)),
        (G = e.y));
    } else if ("all" === O) {
      ((I = S.filter((t) => t.y === P)), (B = !1));
      for (let t = 1; t <= 12; t++) k(P, t) > 0 && A.push({ k: 100 * P + t, lab: i[t - 1], full: i[t - 1] + " " + P + " هـ" });
      ((V = A.reduce((t, e) => t + k(P, e.k % 100), 0)), (Y = "كل أشهر " + P + " هـ"));
      const t = P === e.y;
      let r = D[P - 1] ? S.filter((t) => t.y === P - 1) : [];
      (t && (r = r.filter((t) => t.m < e.m || (t.m === e.m && t.d <= e.d))),
        (N = r),
        (H = t ? "نفس الفترة من " + (P - 1) + " هـ" : "سنة " + (P - 1) + " هـ"));
    } else {
      ((I = S.filter((t) => t.y === P && t.m === +O)), (B = !0));
      const t = k(P, +O) || E(P, +O);
      for (let e = 1; e <= t; e++) A.push({ k: 1e4 * P + 100 * +O + e, lab: String(e), full: e + " " + i[+O - 1] + " " + P + " هـ" });
      ((V = t), (Y = i[+O - 1] + " " + P + " هـ"));
      let r = P,
        a = +O - 1;
      a < 1 && ((a = 12), (r = P - 1));
      const s = P === e.y && +O === e.m;
      let n = L[r + "-" + a] ? S.filter((t) => t.y === r && t.m === a) : [];
      (s && (n = n.filter((t) => t.d <= e.d)),
        (N = n),
        (H = s ? "أول " + d(e.d) + " من " + i[a - 1] + " " + r + " هـ" : i[a - 1] + " " + r + " هـ"));
    }
    const j = N.length > 0 && "all" !== F;
    "all" === F && (H = "");
    const R = (t) => (t < 10 ? "0" + t : "" + t),
      z = (t) => (B ? Math.floor(t / 1e4) + "-" + R(Math.floor(t / 100) % 100) + "-" + R(t % 100) : Math.floor(t / 100) + "-" + R(t % 100)),
      U = B ? x : y,
      W = (t, e) => {
        const r = {};
        return (
          t.forEach((t) => {
            const a = U(t);
            r[a] = (r[a] || 0) + e(t);
          }),
          A.map((t) => r[t.k] || 0)
        );
      },
      K = (t) => {
        const e = W(I, t),
          r = e.reduce((t, e) => t + e, 0);
        let a = 0,
          i = 0,
          s = 0,
          n = -1,
          o = -1;
        return (
          e.forEach((t, e) => {
            t > 0 && (s++, (0 === i || t > i) && ((i = t), (n = e)), (0 === a || t < a) && ((a = t), (o = e)));
          }),
          {
            ser: e,
            tot: r,
            min: a,
            max: i,
            avg: s ? r / s : 0,
            act: s,
            gap: e.length - s,
            peakShort: n >= 0 ? A[n].full.replace(/ هـ$/, "") : "—",
            lowShort: o >= 0 ? A[o].full.replace(/ هـ$/, "") : "—",
            peakNum: n >= 0 ? z(A[n].k) : "—",
            lowNum: o >= 0 ? z(A[o].k) : "—",
          }
        );
      },
      J = [
        { name: "الاسترشاد", desc: "عدد المستفيدين من الاسترشاد اللغوي", f: f, color: "#4a97cf" },
        { name: "المطويات", desc: "عدد المطويات الموزّعة", f: (t) => t.bro || 0, color: "#2fa372" },
        { name: "النيابة", desc: "عدد الحالات المحوَّلة للنيابة", f: (t) => t.pros || 0, color: "#d9793a" },
        { name: "الشرطة", desc: "عدد الحالات المحوَّلة للشرطة", f: (t) => t.pol || 0, color: "#7e2a52" },
      ],
      X = K(b),
      Q = J.map((t, e) => ({ m: t, st: K(t.f), i1: 0 === e, i2: 1 === e, i3: 2 === e, i4: 3 === e })),
      $ = X.tot,
      Z = N.reduce((t, e) => t + b(e), 0),
      q = B ? "يوم" : "شهر",
      tt = (t, e, r, a) => {
        const i = t.length;
        if (!i) return { line: "", area: "" };
        const s = a || Math.max.apply(null, t.concat([1])),
          n = (t) => (1 === i ? e / 2 : e - (t / (i - 1)) * e);
        let o = "";
        return (
          t.forEach((t, e) => {
            o += (e ? "L" : "M") + n(e).toFixed(1) + " " + ((t) => r - (s > 0 ? (t / s) * r : 0))(t).toFixed(1) + " ";
          }),
          { line: o, area: "M" + n(0).toFixed(1) + " " + r + " " + o.replace(/^M/, "L") + "L" + n(i - 1).toFixed(1) + " " + r + " Z" }
        );
      },
      et = tt(X.ser, 1e3, 100),
      rt = t.irDashBrk || "total",
      at = this.loadShiftOptsIr(),
      it = this.loadIrshadLocs(),
      st = ["#4a97cf", "#d9793a", "#2fa372", "#7e2a52", "#7b8a94", "#b99751"];
    let nt = [];
    "shift" === rt
      ? (nt = at
          .map((t, e) => ({
            name: t.name,
            color: st[e % st.length],
            ser: W(
              I.filter((e) => e.shift === t.name),
              b,
            ),
          }))
          .filter((t) => t.ser.some((t) => t > 0)))
      : "loc" === rt &&
        (nt = it
          .slice(0, 6)
          .map((t, e) => ({
            name: t,
            color: st[e % st.length],
            ser: W(
              I.filter((e) => e.loc === t),
              b,
            ),
          }))
          .filter((t) => t.ser.some((t) => t > 0)));
    const ot = "total" !== rt && nt.length > 0,
      lt = ot ? A.map((t, e) => nt.reduce((t, r) => t + r.ser[e], 0)) : X.ser;
    let ht = null;
    if (j && !ot && N.length) {
      const t = {};
      N.forEach((e) => {
        const r = U(e);
        t[r] = (t[r] || 0) + b(e);
      });
      const e = Object.keys(t)
        .map(Number)
        .sort((t, e) => t - e)
        .map((e) => t[e]);
      if (e.length) {
        const t = [];
        for (let r = 0; r < A.length; r++) t.push(null == e[r] ? 0 : e[r]);
        t.some((t) => t > 0) && (ht = t);
      }
    }
    const dt = ((t) => {
        if (!(t > 0)) return 10;
        const e = Math.pow(10, Math.floor(Math.log10(t))),
          r = t / e,
          a = [1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10];
        for (let t = 0; t < a.length; t++) if (r <= a[t]) return a[t] * e;
        return 10 * e;
      })(Math.max.apply(null, [1].concat(lt).concat(ht || []))),
      gt = tt(lt, 1e3, 100, dt),
      ct = ht ? tt(ht, 1e3, 100, dt) : null,
      pt = [];
    if (ot) {
      const t = A.map(() => 0);
      nt.forEach((e) => {
        const r = e.ser.map((e, r) => t[r] + e),
          a = t.slice(),
          i = A.length,
          s = (t) => (1 === i ? 500 : 1e3 - (t / (i - 1)) * 1e3),
          n = (t) => 100 - (t / dt) * 100;
        let o = "M" + s(0).toFixed(1) + " " + n(r[0]).toFixed(1) + " ";
        for (let t = 1; t < i; t++) o += "L" + s(t).toFixed(1) + " " + n(r[t]).toFixed(1) + " ";
        for (let t = i - 1; t >= 0; t--) o += "L" + s(t).toFixed(1) + " " + n(a[t]).toFixed(1) + " ";
        (pt.push({ d: o + "Z", fill: e.color }), e.ser.forEach((e, r) => (t[r] += e)));
      });
    }
    const mt = [];
    for (let t = 4; t >= 0; t--) {
      const e = (dt * t) / 4,
        r = 100 * (1 - t / 4);
      mt.push({
        lab: o(e),
        lineStyle:
          "position:absolute;right:0;left:0;top:" +
          r.toFixed(2) +
          "%;border-top:1px solid " +
          (0 === t ? "var(--bd-xd9dee4)" : "var(--bd-xeff1f4)"),
        labStyle:
          "position:absolute;left:-52px;top:" +
          r.toFixed(2) +
          "%;transform:translateY(-50%);font-size:10px;font-weight:400;color:var(--fg-x94a3b8);direction:ltr;width:46px;text-align:left",
      });
    }
    const ut = A.length,
      ft = Math.max(1, Math.ceil(ut / 9)),
      bt = A.map((t, e) => ({ show: e % ft === 0 || e === ut - 1, lab: t.lab })),
      St = A.map((t, e) => {
        let r = t.full + "  —  " + KIVO.BassamCount(o(lt[e]), "مستفيد") + "";
        return (
          ht && (r += "  ·  السابق: " + o(ht[e])),
          ot &&
            nt.forEach((t) => {
              t.ser[e] && (r += "\n" + t.name + ": " + o(t.ser[e]));
            }),
          { tip: r }
        );
      }),
      xt = [],
      yt = [];
    let Dt = 0;
    try {
      const t = c(this.hGreg(G, 1, 1)),
        e = [];
      let n = 0;
      for (let r = 1; r <= 12; r++) {
        const i = E(G, r),
          s = k(G, r);
        for (let o = 1; o <= i; o++) (o <= s && e.push({ m: r, d: o, ts: t + n * a }), n++);
      }
      if (e.length) {
        const t = {};
        r.filter((t) => t.y === G).forEach((e) => {
          const r = e.m + "-" + e.d;
          t[r] = (t[r] || 0) + b(e);
        });
        const n = Object.keys(t)
          .map((e) => t[e])
          .filter((t) => t > 0)
          .sort((t, e) => t - e);
        Dt = n.length;
        const l = (t) => (n.length ? n[Math.min(n.length - 1, Math.floor(n.length * t))] : 1),
          h = [l(0.2), l(0.4), l(0.6), l(0.85)],
          d = ["#EFF1F4", "#F2E7D0", "#E4CFA1", "#D0B173", "#B9974F", "#8A6F35"],
          g = (t) => (t ? (t <= h[0] ? 1 : t <= h[1] ? 2 : t <= h[2] ? 3 : t <= h[3] ? 4 : 5) : 0),
          c = {};
        e.forEach((t) => (c[t.ts] = t));
        const p = e[0].ts,
          m = e[e.length - 1].ts,
          u = p - ((new Date(p).getDay() + 1) % 7) * a,
          f = Math.max(1, Math.floor((m - u) / a / 7) + 1);
        let S = -1,
          x = -9;
        for (let e = 0; e < f; e++) {
          const r = [];
          for (let n = 0; n < 7; n++) {
            const l = u + (7 * e + n) * a,
              h = c[l];
            if (!h) {
              r.push({ style: "width:15px;height:15px;border-radius:3px;background:transparent", tip: "" });
              continue;
            }
            const p = t[h.m + "-" + h.d] || 0,
              m = new Date(l);
            r.push({
              style: "width:15px;height:15px;border-radius:3px;background:" + d[g(p)],
              tip:
                h.d +
                " " +
                i[h.m - 1] +
                " " +
                G +
                " هـ · " +
                this.WEEKDAYS[m.getDay()] +
                " " +
                m.getDate() +
                " " +
                s[m.getMonth()] +
                " — " +
                KIVO.BassamCount(o(p), "مستفيد") +
                "",
            });
          }
          xt.push({ cells: r });
          let n = -1;
          for (let t = 0; t < 7; t++) {
            const r = c[u + (7 * e + t) * a];
            if (r) {
              n = r.m;
              break;
            }
          }
          const l = n > 0 && n !== S && e - x >= 3;
          (l && (x = e), n > 0 && (S = n), yt.push({ show: l, lab: n > 0 ? i[n - 1] : "" }));
        }
      }
    } catch (t) {}
    const Lt = ["#EFF1F4", "#F2E7D0", "#E4CFA1", "#D0B173", "#B9974F", "#8A6F35"].map((t) => ({
        style: "width:11px;height:11px;border-radius:3px;display:inline-block;background:" + t,
      })),
      wt = (t, e) =>
        "display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;border-radius:9999px;padding:2px 6px;" +
        (e
          ? "color:var(--fg-x94a3b8);background:var(--bg-a1481631840p14)"
          : t
            ? "color:var(--fg-x006300);background:var(--bg-a09900p09)"
            : "color:var(--fg-xd03b3b);background:var(--bg-a20859590p09)"),
      vt = (t, e) => {
        if (!j || !e) return { txt: "—", style: wt(!0, !0) };
        const r = ((t - e) / e) * 100,
          a = Math.abs(r) < 0.5;
        return { txt: (a ? "◆ " : r >= 0 ? "▲ " : "▼ ") + n(Math.abs(r)) + "%", style: wt(r >= 0, a) };
      },
      Pt = {};
    I.forEach((t) =>
      (t.langs || []).forEach((t) => {
        Pt[t.lang] = (Pt[t.lang] || 0) + (t.count || 0);
      }),
    );
    let Mt = Object.keys(Pt)
      .map((t) => ({ name: t, v: Pt[t] }))
      .sort((t, e) => e.v - t.v);
    if (Mt.length > 7) {
      const t = Mt.slice(6);
      ((Mt = Mt.slice(0, 6)), Mt.push({ name: "لغات أخرى (" + t.length + ")", v: t.reduce((t, e) => t + e.v, 0), other: !0 }));
    }
    const Ot = Mt.reduce((t, e) => t + e.v, 0),
      Et = Math.max.apply(null, [1].concat(Mt.map((t) => t.v))),
      kt = Mt.map((t) => ({
        name: t.name,
        val: o(t.v),
        pct: (Ot ? n((t.v / Ot) * 100) : "0") + "%",
        dot: "width:9px;height:9px;border-radius:3px;flex-shrink:0;background:" + (t.other ? "var(--bg-xc9cfd6)" : "var(--bg-xb99751)"),
        bar:
          "height:100%;border-radius:9999px;width:" +
          ((t.v / Et) * 100).toFixed(2) +
          "%;background:" +
          (t.other ? "var(--bg-xc9cfd6)" : "var(--bg-xb99751)"),
      })),
      Ft = {},
      Ct = {};
    (I.forEach((t) => {
      t.loc && (Ft[t.loc] = (Ft[t.loc] || 0) + b(t));
    }),
      N.forEach((t) => {
        t.loc && (Ct[t.loc] = (Ct[t.loc] || 0) + b(t));
      }));
    let Tt = Object.keys(Ft)
      .map((t) => ({ name: t, v: Ft[t], p: Ct[t] || 0 }))
      .sort((t, e) => e.v - t.v);
    if (Tt.length > 7) {
      const t = Tt.slice(6);
      ((Tt = Tt.slice(0, 6)),
        Tt.push({
          name: "مواقع أخرى (" + t.length + ")",
          v: t.reduce((t, e) => t + e.v, 0),
          p: t.reduce((t, e) => t + e.p, 0),
          other: !0,
        }));
    }
    const _t = Math.max.apply(null, [1].concat(Tt.map((t) => t.v))),
      It = Tt.map((t) => {
        const e = vt(t.v, t.p);
        return {
          name: t.name,
          val: o(t.v),
          pct: ($ ? n((t.v / $) * 100) : "0") + "%",
          dTxt: e.txt,
          dStyle: e.style,
          dot: "width:9px;height:9px;border-radius:3px;flex-shrink:0;background:" + (t.other ? "var(--bg-xc9cfd6)" : "var(--bg-x8a6f35)"),
          bar:
            "height:100%;border-radius:9999px;width:" +
            ((t.v / _t) * 100).toFixed(2) +
            "%;background:" +
            (t.other ? "var(--bg-xc9cfd6)" : "var(--bg-x8a6f35)"),
        };
      }),
      Nt = at.map((t, e) => {
        const r = I.filter((e) => e.shift === t.name);
        return { name: t.name, color: st[e % st.length], v: r.reduce((t, e) => t + b(e), 0), n: r.length, rs: r };
      }),
      At = Nt.reduce((t, e) => t + e.v, 0) || 1,
      Bt = Nt.filter((t) => t.v > 0).map((t) => ({
        style: "height:100%;width:" + ((t.v / At) * 100).toFixed(2) + "%;background:" + t.color,
      })),
      Yt = Nt.filter((t) => t.v > 0).map((t) => ({
        name: t.name,
        pct: n((t.v / At) * 100) + "%",
        dot: "width:9px;height:9px;border-radius:3px;display:inline-block;background:" + t.color,
      })),
      Ht = Nt.map((t) => ({
        name: t.name,
        val: o(t.v),
        sub: KIVO.BassamCount(t.n, "تقرير") + "",
        dot: "width:9px;height:9px;border-radius:3px;flex-shrink:0;background:" + t.color,
      })),
      Vt = [
        ["إجمالي المستفيدين", $, Z],
        ["عدد التقارير", I.length, N.length],
        ["مستفيدو الاسترشاد", Q[0].st.tot, N.reduce((t, e) => t + f(e), 0)],
        ["المطويات الموزّعة", Q[1].st.tot, N.reduce((t, e) => t + (e.bro || 0), 0)],
      ].map((t) => {
        const e = vt(t[1], t[2]);
        return { label: t[0], nums: o(t[2]) + " → " + o(t[1]), txt: e.txt, style: e.style };
      }),
      Gt = {},
      jt = {},
      Rt = {},
      zt = {};
    (I.forEach((t) => {
      t.eid && ((Gt[t.eid] = (Gt[t.eid] || 0) + b(t)), (Rt[t.eid] = (Rt[t.eid] || 0) + 1), (zt[t.eid] = { name: t.name, shift: t.shift }));
    }),
      N.forEach((t) => {
        t.eid && (jt[t.eid] = (jt[t.eid] || 0) + b(t));
      }));
    const Ut = Object.keys(Gt)
        .map((t) => ({ k: t, v: Gt[t], p: jt[t] || 0, n: Rt[t], nm: (zt[t] || {}).name || "—", sh: (zt[t] || {}).shift || "" }))
        .sort((t, e) => e.v - t.v)
        .slice(0, 6),
      Wt = Math.max.apply(null, [1].concat(Ut.map((t) => t.v))),
      Kt = Ut.map((t, e) => {
        const r = vt(t.v, t.p);
        return {
          rank: String(e + 1),
          name: t.nm,
          sub: (t.sh ? t.sh + " · " : "") + KIVO.BassamCount(t.n, "تقرير") + "",
          ben: o(t.v),
          dTxt: r.txt,
          dStyle: r.style,
          bar: "height:100%;border-radius:9999px;background:var(--bg-xb99751);width:" + ((t.v / Wt) * 100).toFixed(2) + "%",
          numStyle:
            "width:22px;height:22px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:10.5px;font-weight:700;flex-shrink:0;" +
            (0 === e
              ? "background:var(--bg-x8a6f35);color:var(--fg-xffffff)"
              : 1 === e
                ? "background:var(--bg-a185151810p3);color:var(--fg-x8a6f35)"
                : 2 === e
                  ? "background:var(--bg-a185151810p16);color:var(--fg-x8a6f35)"
                  : "background:var(--bg-xeff1f4);color:var(--fg-x53565a)"),
        };
      }),
      Jt = Nt.map((t) => {
        const e = {};
        t.rs.forEach((t) => {
          t.eid && (e[t.eid] = 1);
        });
        const r = t.rs.reduce((t, e) => t + f(e), 0),
          a = t.rs.reduce((t, e) => t + (e.bro || 0), 0),
          i = t.rs.reduce((t, e) => t + (e.pros || 0) + (e.pol || 0), 0);
        return {
          name: t.name,
          dot:
            "width:8px;height:8px;border-radius:3px;display:inline-block;margin-inline-end:7px;vertical-align:middle;background:" + t.color,
          reports: o(t.n),
          emps: o(Object.keys(e).length),
          ben: o(t.v),
          avg: t.n ? (t.v / t.n).toFixed(1) : "0",
          trans: o(r),
          bro: o(a),
          ref: o(i),
          share: ($ ? n((t.v / $) * 100) : "0") + "%",
          shareBar:
            "display:block;height:100%;border-radius:9999px;background:" +
            t.color +
            ";width:" +
            ($ ? ((t.v / $) * 100).toFixed(2) : 0) +
            "%",
        };
      }),
      Xt = (t.irDashSumQ || "").trim(),
      Qt = Jt.slice(),
      $t = KIVO.BassamFind.filter(Xt, Qt, (t) => [t.name, t.code, t.type]),
      Zt = 0 === t.irDashSumPerPage ? 0 : t.irDashSumPerPage || 10,
      qt = 0 === Zt ? Math.max(1, $t.length) : Zt,
      te = Math.max(1, Math.ceil($t.length / qt)),
      ee = Math.min(Math.max(1, t.irDashSumPage || 1), te),
      re = (ee - 1) * qt,
      ae = $t.slice(re, re + qt),
      ie = [];
    {
      const t = [],
        e = (e) => {
          t.indexOf(e) < 0 && t.push(e);
        };
      e(1);
      for (let t = ee - 1; t <= ee + 1; t++) t >= 1 && t <= te && e(t);
      (e(te), t.sort((t, e) => t - e));
      for (let e = 0; e < t.length; e++) {
        e > 0 && t[e] - t[e - 1] > 1 && ie.push({ dots: !0, label: "…" });
        const r = t[e];
        ie.push({
          dots: !1,
          label: String(r),
          cur: r === ee,
          plain: r !== ee,
          style:
            "height:28px;min-width:28px;padding:0 4px;border:0;border-right:1px solid var(--bd-xe1e1e1);font-size:11px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';" +
            (r === ee ? "background:var(--bg-xb99751);color:var(--text-on-brand)" : "background:transparent;color:var(--fg-x475569)"),
          click: () => this.setState({ irDashSumPage: r }),
        });
      }
    }
    const se = (t) =>
        "height:28px;width:28px;border:0;border-right:1px solid var(--bd-xe1e1e1);background:transparent;display:flex;align-items:center;justify-content:center;" +
        (t ? "color:var(--fg-x475569);cursor:pointer" : "color:var(--fg-xcbd5e1);cursor:default"),
      ne = {};
    $t.forEach((t) => (ne[t.name] = 1));
    const oe = I.filter((t) => ne[t.shift]),
      le = oe.reduce((t, e) => t + b(e), 0),
      he = {};
    oe.forEach((t) => {
      t.eid && (he[t.eid] = 1);
    });
    const de = {
        label: Xt ? "إجمالي المعروض" : "الإجمالي",
        reports: o(oe.length),
        emps: o(Object.keys(he).length),
        ben: o(le),
        avg: oe.length ? (le / oe.length).toFixed(1) : "0",
        trans: o(oe.reduce((t, e) => t + f(e), 0)),
        bro: o(oe.reduce((t, e) => t + (e.bro || 0), 0)),
        ref: o(oe.reduce((t, e) => t + (e.pros || 0) + (e.pol || 0), 0)),
        share: ($ ? n((le / $) * 100) : "0") + "%",
      },
      ge = [{ dot: "#b99751", n: "الإجمالي", v: h($), p: "" }]
        .concat(Q.map((t) => ({ dot: t.m.color, n: t.m.name, v: h(t.st.tot), p: $ ? "(" + n((t.st.tot / $) * 100) + "٪)" : "" })))
        .concat([
          { dot: "#7b8a94", n: "التقارير", v: o(I.length), p: "" },
          { dot: "#7b8a94", n: "المتوسط لكل " + q, v: h(X.avg), p: "" },
          { dot: "#7b8a94", n: "أعلى", v: h(X.max), p: X.peakNum },
        ]),
      ce = (t) => ({ dot: "width:7px;height:7px;border-radius:2px;flex-shrink:0;background:" + t.dot, n: t.n, v: t.v, p: t.p }),
      pe = ge.map(ce).concat(ge.map(ce)),
      me = (t) =>
        "border:0;font-family:'Cairo',sans-serif;font-size:11px;font-weight:600;padding:6px 12px;border-radius:8px;cursor:pointer;white-space:nowrap;" +
        (t
          ? "background:var(--bg-xffffff);color:var(--fg-x8a6f35);box-shadow:var(--shadow-card)"
          : "background:transparent;color:var(--fg-x94a3b8)"),
      ue = vt($, Z);
    return {
      irDashYear: v ? "all" : String(P),
      irDashYearOpts: [{ v: "all", lbl: "كل السنوات" }].concat(w.map((t) => ({ v: String(t), lbl: t + " هـ" }))),
      irDashSetYear: (t) =>
        this.setState({ irDashYear: "all" === t.target.value ? "all" : +t.target.value, irDashMonth: null, irDashMode: null }),
      irDashMonth: O,
      irDashMonthOpts: v
        ? [{ v: "all", lbl: "كل الأشهر" }]
        : M.map((t) => ({ v: String(t), lbl: i[t - 1] + " (" + (t < 10 ? "0" + t : t) + ")" })).concat([
            { v: "all", lbl: "كل أشهر السنة" },
          ]),
      irDashSetMonth: (t) => this.setState({ irDashMonth: t.target.value, irDashMode: null }),
      irDashYmBoxStyle:
        "display:flex;align-items:center;gap:7px;border:1px solid " +
        ("custom" === F ? "#E6E9ED" : "rgba(185,151,81,.45)") +
        ";background:" +
        ("custom" === F ? "#F8F9FB" : "rgba(185,151,81,.07)") +
        ";border-radius:12px;padding:4px 11px;flex-shrink:0;opacity:" +
        ("custom" === F ? ".55" : "1"),
      irDashModeOpts: [
        {
          lbl: "نطاق مخصص",
          style: me("custom" === F),
          click: () =>
            this.setState({
              irDashMode: "custom" === F ? null : "custom",
              irDashFrom: t.irDashFrom || m(C - 29 * a),
              irDashTo: t.irDashTo || m(C),
            }),
        },
      ],
      irDashCustomOn: "custom" === F,
      irDashFrom: "custom" === F ? m(T) : "",
      irDashTo: "custom" === F ? m(_) : "",
      irDashSetFrom: (t) => this.setState({ irDashFrom: t.target.value, irDashMode: "custom" }),
      irDashSetTo: (t) => this.setState({ irDashTo: t.target.value, irDashMode: "custom" }),
      irDashRangeHint: "custom" === F ? "= " + Y + " · " + d(V) : "",
      irDashPerLbl: Y,
      irDashTicker: pe,
      irDashPeriodTxt:
        "الفترة: " +
        Y +
        " · " +
        d(V) +
        " · " +
        KIVO.BassamCount(I.length, "تقرير") +
        "" +
        (j ? " · تُقارَن بـ " + H : "all" === F ? "" : " · لا توجد فترة سابقة للمقارنة"),
      irDashHeroLbl: "إجمالي المستفيدين من خدمة الاسترشاد · " + Y,
      irDashHeroNum: l($),
      irDashSparkHas: X.ser.length > 1,
      irDashHeroLine: et.line,
      irDashHeroArea: et.area,
      irDashHiVal: h(X.max),
      irDashHiSub: X.peakNum,
      irDashHiTip: "أعلى قيمة سُجّلت — " + X.peakShort,
      irDashLoVal: h(X.min),
      irDashLoSub: X.lowNum,
      irDashLoTip: "أدنى قيمة سُجّلت — " + X.lowShort,
      irDashAvgVal: h(X.avg),
      irDashAvgSub: B ? d(X.act) : KIVO.BassamCount(X.act, "شهر") + "",
      irDashGapOn: X.gap > 0,
      irDashGapVal: String(X.gap),
      irDashCmpChipOn: j,
      irDashCmpChipTxt: ue.txt,
      irDashCmpChipStyle: ue.style,
      irDashCmpChipPrev: o(Z),
      irDashMets: Q.map((t) => ({
        name: t.m.name,
        desc: t.m.desc,
        num: l(t.st.tot),
        pct: "٪" + ($ ? n((t.st.tot / $) * 100) : "0"),
        ring:
          "width:50px;height:50px;border-radius:9999px;position:relative;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:conic-gradient(var(--bg-xb99751) 0% " +
          ($ ? ((t.st.tot / $) * 100).toFixed(2) : 0) +
          "%,#E4DAC6 " +
          ($ ? ((t.st.tot / $) * 100).toFixed(2) : 0) +
          "% 100%)",
        i1: t.i1,
        i2: t.i2,
        i3: t.i3,
        i4: t.i4,
      })),
      irDashGauges: Q.map((t) => {
        const e = t.st,
          r = e.max > e.min ? Math.max(0, Math.min(1, (e.avg - e.min) / (e.max - e.min))) : 0.5,
          a = Math.PI * r,
          i = tt(e.ser, 200, 40),
          s = N.reduce((e, r) => e + t.m.f(r), 0),
          g = vt(e.tot, s);
        return {
          name: t.m.name,
          desc: t.m.desc + " خلال الفترة",
          num: l(e.tot),
          nx: (100 + 60.5 * Math.cos(a)).toFixed(1),
          ny: (87 - 60.5 * Math.sin(a)).toFixed(1),
          min: h(e.min),
          minDate: e.lowNum,
          minTip: "أدنى " + t.m.name + " — " + e.lowShort,
          avg: h(e.avg),
          avgSub: B ? d(e.act) : KIVO.BassamCount(e.act, "شهر") + "",
          max: h(e.max),
          maxDate: e.peakNum,
          maxTip: "ذروة " + t.m.name + " — " + e.peakShort,
          share: ($ ? n((e.tot / $) * 100) : "0") + "٪",
          dTxt: g.txt,
          dStyle: g.style,
          dTip: j ? t.m.name + " في " + H + ": " + o(s) : "لا توجد فترة سابقة للمقارنة",
          spark: i.area,
          i1: t.i1,
          i2: t.i2,
          i3: t.i3,
          i4: t.i4,
        };
      }),
      irDashBrkOpts: [
        ["total", "الإجمالي"],
        ["shift", "حسب الوردية"],
        ["loc", "حسب الموقع"],
      ].map((t) => ({ lbl: t[1], on: rt === t[0], style: me(rt === t[0]), click: () => this.setState({ irDashBrk: t[0] }) })),
      irDashTrendDesc:
        (B ? "تجميع يومي" : "تجميع شهري") + " · " + KIVO.BassamCount(ut, "نقطة") + "" + (ht ? " · مع خط الفترة السابقة" : ""),
      irDashTrendGrid: mt,
      irDashXLabels: bt,
      irDashHits: St,
      irDashPlain: !ot,
      irDashStacked: ot,
      irDashStackPaths: pt,
      irDashLine: gt.line,
      irDashArea: gt.area,
      irDashGhostOn: !!ct,
      irDashGhost: ct ? ct.line : "",
      irDashLegend: ot
        ? nt.map((t) => ({ name: t.name, dot: "width:9px;height:9px;border-radius:3px;display:inline-block;background:" + t.color }))
        : [
            {
              name: "المستفيدون — الفترة الحالية",
              dot: "width:9px;height:9px;border-radius:3px;display:inline-block;background:var(--bg-xb99751)",
            },
          ],
      irDashGhostLbl: H,
      irDashHasData: ut > 0 && $ > 0,
      irDashNoData: !(ut > 0 && $ > 0),
      irDashHeatCols: xt,
      irDashHeatMonths: yt,
      irDashHeatScale: Lt,
      irDashHeatDesc:
        "كل مربع = يوم واحد من سنة " +
        G +
        " هـ · " +
        KIVO.BassamCount(Dt, "يوم") +
        " " +
        KIVO.BassamCount.agr(Dt, "فيه", "فيهما", "فيها") +
        " نشاط · تعرض السنة كاملة مهما كان النطاق المختار",
      irDashHeatYear: G + " هـ",
      irDashHeatOn: xt.length > 0,
      irDashHeatOff: 0 === xt.length,
      irDashLangRows: kt,
      irDashLangOn: kt.length > 0,
      irDashLangOff: 0 === kt.length,
      ...KIVO.BassamCount.pair("irDashLangTot", o(Q[0].st.tot), "مستفيد", "g"),
      irDashLocRows: It,
      irDashLocOn: It.length > 0,
      irDashLocOff: 0 === It.length,
      ...KIVO.BassamCount.pair("irDashLocTot", o($), "مستفيد", "g"),
      irDashShareSegs: Bt,
      irDashShiftLegend: Yt,
      irDashShiftRows: Ht,
      irDashCmpOn: j,
      irDashCmpOff: !j,
      irDashCmpRows: Vt,
      irDashPrevLbl: j ? H : "الفترة السابقة",
      irDashTopEmployees: Kt,
      irDashEmpOn: Kt.length > 0,
      irDashEmpOff: 0 === Kt.length,
      irEmptyShow: 0 === r.length,
      irDashSumOpen: !!t.irDashSumOpen,
      irDashSumToggle: () => this.setState({ irDashSumOpen: !this.state.irDashSumOpen }),
      irDashSumChev: "transition:transform .2s;flex-shrink:0;" + (t.irDashSumOpen ? "transform:rotate(180deg)" : ""),
      irDashSumBadge: KIVO.BassamCount(Qt.length, "وردية") + "",
      irDashSumQ: t.irDashSumQ || "",
      irDashSumSetQ: (t) => this.setState({ irDashSumQ: t.target.value, irDashSumPage: 1 }),
      irDashSumShown: String($t.length),
      irDashSumAll: String(Qt.length),
      irDashSumRows: ae,
      irDashSumTotal: de,
      irDashSumHas: $t.length > 0,
      irDashSumEmpty: 0 === $t.length,
      irDashSumEmptyMsg: Xt ? "لا توجد وردية مطابقة لـ «" + Xt + "»" : "لا توجد بيانات ضمن هذه الفترة",
      ...KIVO.BassamCount.pair("irDashSumPgTotal", String($t.length), "سجل", "g"),
      irDashSumPgRange: 0 === $t.length ? "0" : re + 1 + "–" + Math.min(re + qt, $t.length),
      irDashSumPgNums: ie,
      irDashSumPerPage: String(Zt),
      irDashSumOnPerPage: (t) => {
        const e = +t.target.value;
        this.setState({ irDashSumPerPage: 0 === e ? 0 : e || 10, irDashSumPage: 1 });
      },
      irDashSumPgFirst: () => this.setState({ irDashSumPage: 1 }),
      irDashSumPgPrev: () => this.setState({ irDashSumPage: Math.max(1, (this.state.irDashSumPage || 1) - 1) }),
      irDashSumPgNext: () => this.setState({ irDashSumPage: Math.min(te, (this.state.irDashSumPage || 1) + 1) }),
      irDashSumPgLast: () => this.setState({ irDashSumPage: te }),
      irDashSumPgFirstStyle: se(ee > 1),
      irDashSumPgPrevStyle: se(ee > 1),
      irDashSumPgNextStyle: se(ee < te),
      irDashSumPgLastStyle: se(ee < te),
    };
  }
  _recordsCalVals() {
    const t = this.state,
      e = this.hToday(),
      r = t.irYear,
      a = t.irMonth,
      i = this.loadIrshad().reports || [],
      s = (t, e, r) => i.filter((a) => !(a.y !== t || (null != e && a.m !== e) || (null != r && a.d !== r))).length,
      n = s(r),
      o = 12 * e.y + e.m,
      l = t.irOpenMonths || {},
      h = t.irOpenDays || {},
      d = this.MONTHS.map((t, i) => {
        const n = i + 1,
          h = a === n,
          d = r === e.y && n === e.m,
          g = r + "-" + n,
          c = 12 * r + n < o,
          p = !!l[g],
          m = c && !p,
          u = s(r, n);
        let f =
            "position:relative;width:100%;border-radius:12px;padding:8px;text-align:center;transition:all .2s;box-shadow:var(--shadow-card);cursor:pointer;box-sizing:border-box;font-family:'Cairo',sans-serif;border:1px ",
          b = "#53565a",
          S = "#cbd5e1",
          x = "لا تقارير",
          y = !1,
          D = "",
          L = "";
        const w = "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",
          v = "M14 2v6h6";
        return (
          m
            ? ((f +=
                (h ? "solid #64748b;box-shadow:0 0 0 2px rgba(100,116,139,0.25);" : "solid rgba(100,116,139,0.35);") +
                "background:var(--bg-a1001161390p08)"),
              (b = "#475569"),
              (S = "#475569"),
              (y = !0),
              (x = u ? KIVO.BassamCount(u, "تقرير") + "" : "انقضى — مقفل"),
              (D = "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"),
              (L = ""))
            : h
              ? ((f += "solid #b99751;box-shadow:0 0 0 2px rgba(185,151,81,0.3);background:var(--bg-a185151810p06)"),
                (b = "#b99751"),
                u && ((x = KIVO.BassamCount(u, "تقرير") + ""), (S = "#b99751"), (y = !0), (D = w), (L = v)))
              : u
                ? ((f += "solid #E1E1E1;background:var(--bg-xffffff)"),
                  (x = KIVO.BassamCount(u, "تقرير") + ""),
                  (S = "#b99751"),
                  (y = !0),
                  (D = w),
                  (L = v))
                : (f += "dashed #E1E1E1;background:var(--bg-a2452452450p7);opacity:.9"),
          {
            name: t,
            greg: this.hGregMonthLabel(r, n),
            style: f,
            nameColor: b,
            cntColor: S,
            cntLabel: x,
            cntIcon: y,
            footP1: D,
            footP2: L,
            isCurrent: d,
            tip: m
              ? (u ? KIVO.BassamCount(u, "تقرير|مسجّل") + " في " + t + " · " : "") + (this.PC("approve") ? "الشهر انقضى — مقفل · نقرة مزدوجة لفتحه للاستدراك" : "الشهر انقضى — مقفل · فتحه للاستدراك يحتاج صلاحية الاعتماد")
              : c && p
                ? "مفتوح للاستدراك" + (this.PC("approve") ? " · نقرة مزدوجة لإغلاقه مجدداً" : "")
                : u
                  ? KIVO.BassamCount(u, "تقرير|مسجّل") + " في " + t
                  : "لا تقارير مسجّلة في " + t,
            click: () =>
              this.setState(
                h
                  ? { irYear: r, irMonth: n, irDay: r === e.y && n === e.m ? e.d : 1 }
                  : { irYear: r, irMonth: n, irDay: r === e.y && n === e.m ? e.d : 1, irOpenMonths: {}, irOpenDays: {}, irLedgerOpen: !1 },
              ),
            dbl: (t) => {
              /* الموجة 1 · IRSZ-4: بلا صلاحية الاعتماد كانت النقرةُ المزدوجة لا تفعل شيئاً بصمت — الآن تشرح السبب */
              (t.stopPropagation(),
                this.PC("approve")
                  ? m
                    ? this.setState({ irOpenMonths: { [g]: !0 }, irOpenDays: {}, irYear: r, irMonth: n, irLedgerOpen: !1 })
                    : c && p && this.setState({ irOpenMonths: {} })
                  : (m || (c && p)) && this.bsToast("فتحُ الشهر أو اليوم المقفل للاستدراك وإعادةُ قفله تحتاج صلاحية الاعتماد — راجع مدير الإدارة"));
            },
          }
        );
      }),
      g = 12 * r + a,
      c = r + "-" + a,
      p = g < o,
      m = !!l[c],
      u = p && !m,
      f = this.hMonthDays(r, a),
      b = this.hGreg(r, a, 1),
      S = new Date(b.getFullYear(), b.getMonth(), b.getDate(), 12),
      x = [];
    for (let i = 1; i <= f; i++) {
      const n = s(r, a, i),
        l = i === t.irDay,
        d = r === e.y && a === e.m && i === e.d,
        m = r + "-" + a + "-" + i,
        f = p || (g === o && i < e.d),
        b = !!h[m],
        y = u || (f && !b),
        D = !y && f && b;
      let L = "#fff",
        w = "#53565a",
        v = "2px solid #E1E1E1";
      (n
        ? ((L = y ? "#64748b" : "#b99751"), (w = "#fff"), (v = "2px solid transparent"))
        : y && ((L = "rgba(148,163,184,0.12)"), (w = "#94a3b8")),
        l && (v = "2px solid " + (y ? "#64748b" : "#b99751")));
      const P = new Date(S.getTime() + 864e5 * (i - 1));
      let M = "";
      try {
        M = P.toLocaleDateString("ar-u-ca-gregory-nu-latn", { day: "numeric", month: "long", year: "numeric" });
      } catch (t) {}
      x.push({
        num: String(i),
        gnum: String(P.getDate()),
        isToday: d,
        lockClosed: y,
        lockOpen: D,
        sepStyle:
          "display:block;width:9px;height:1px;flex-shrink:0;margin:1px 0;background:" +
          (n ? "var(--bg-a2552552550p5)" : "var(--bg-a1481631840p55)"),
        tip:
          "يوم " +
          i +
          " " +
          this.MONTHS[a - 1] +
          " " +
          r +
          " هـ — الموافق " +
          M +
          " م" +
          (n ? " — " + KIVO.BassamCount(n, "تقرير") + "" : " — لا تقارير") +
          (y ? " — انقضى، مقفل · " + (this.PC("approve") ? "نقرة مزدوجة لفتحه" : "فتحه يحتاج صلاحية الاعتماد") : D ? " — مفتوح للاستدراك" + (this.PC("approve") ? " · نقرة مزدوجة لإغلاقه" : "") : ""),
        click: () => this.setState(l ? { irDay: i } : { irDay: i, irOpenDays: {}, irLedgerOpen: !1 }),
        dbl: (t) => {
          (t.stopPropagation(),
            this.PC("approve")
              ? u
                ? this.setState({ irOpenMonths: { [c]: !0 }, irOpenDays: {} })
                : f && this.setState((t) => ({ irOpenDays: t.irOpenDays && t.irOpenDays[m] ? {} : { [m]: !0 } }))
              : (u || f) && this.bsToast("فتحُ الشهر أو اليوم المقفل للاستدراك وإعادةُ قفله تحتاج صلاحية الاعتماد — راجع مدير الإدارة"));
        },
        style:
          "position:relative;height:24px;flex:1 1 auto;min-width:28px;padding:0 3px;border-radius:4px;font-size:8px;font-weight:" +
          (l ? "900" : "700") +
          ";display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;user-select:none;background:" +
          L +
          ";color:" +
          w +
          ";border:" +
          v +
          (l ? ";box-shadow:var(--shadow-card);z-index:10" : "") +
          (d && !l ? ";box-shadow:0 0 0 2px rgba(185,151,81,0.7)" : ""),
      });
    }
    const y = r === e.y && a === e.m,
      D = t.irDay,
      L = this.MONTHS[a - 1],
      w = !!h[r + "-" + a + "-" + D],
      v = p || (g === o && D < e.d),
      P = !u && v && !w,
      M = !u && !P && this._irCanWrite(),
      O = t.irDraft || this.emptyDraft(),
      E = this.WEEKDAYS[this.hGreg(r, a, D).getDay()],
      k = this.loadShiftOptsIr(),
      F = O.shift ? this.employeesForShift(r, a, O.shift, E) : [],
      C = O.langs.reduce((t, e) => t + (e.count || 0), 0),
      T = parseInt(O.bro || "0", 10) || 0,
      _ = parseInt(O.pros || "0", 10) || 0,
      I = parseInt(O.pol || "0", 10) || 0,
      N = (t) => {
        const e = { ...(this.state.irDraft || this.emptyDraft()), ...t };
        this.setState({ irDraft: e, irSaveErrMsg: "" });
      },
      A = (t, e) => {
        const r = Math.max(0, (parseInt(t || "0", 10) || 0) + e);
        return String(r);
      },
      B = (t, e, r, a, i, s, n, o) => {
        const l = t();
        return {
          rows: l.map((s, h) => {
            const d = this.state[a] === h;
            return {
              editing: d,
              normal: !d,
              name: s,
              sel: r === s,
              rowStyle:
                "display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:pointer;font-size:12.5px;font-weight:400;color:var(--fg-x25343f);" +
                (r === s ? "background:var(--bg-a185151810p08);color:var(--fg-x8a6f35)" : ""),
              selectClick: () => {
                const t = this.state.irDraft || this.emptyDraft();
                this.setState({ irDraft: { ...t, ...o(s) }, [n]: !1, [a]: -1, irSaveErrMsg: "" });
              },
              editVal: d ? (null != this.state[i] ? this.state[i] : s) : "",
              setEditVal: (t) => this.setState({ [i]: t.target.value }),
              startEdit: (t) => {
                (t && t.stopPropagation && t.stopPropagation(), this.setState({ [a]: h, [i]: s }));
              },
              saveEdit: () => {
                const n = (this.state[i] || "").trim();
                if (!n || (n !== s && l.includes(n))) return void this.setState({ [a]: -1, [i]: "" });
                const d = t();
                ((d[h] = n), e(d));
                const g = this.state.irDraft || this.emptyDraft(),
                  c = r === s ? o(n) : {};
                this.setState({ irDraft: { ...g, ...c }, [a]: -1, [i]: "" });
              },
              cancelEdit: () => this.setState({ [a]: -1, [i]: "" }),
              delClick: (s) => {
                s && s.stopPropagation && s.stopPropagation();
                const n = t();
                if (n.length <= 1) return;
                const l = n[h];
                (n.splice(h, 1), e(n));
                const d = this.state.irDraft || this.emptyDraft(),
                  g = r === l ? o("") : {};
                this.setState({ irDraft: { ...d, ...g }, [a]: -1, [i]: "" });
              },
            };
          }),
          empty: 0 === l.length,
          popOpen: !!this.state[n],
          toggle: () => this.setState({ [n]: !this.state[n], [a]: -1 }),
          close: () => this.setState({ [n]: !1, [a]: -1 }),
          newVal: this.state[s] || "",
          setNewVal: (t) => this.setState({ [s]: t.target.value }),
          addNew: () => {
            const r = (this.state[s] || "").trim();
            if (r) {
              const a = t();
              a.includes(r) || (a.push(r), e(a));
            }
            this.setState({ [s]: "" });
          },
        };
      },
      Y = B(
        () => this.loadIrshadLangs(),
        (t) => this.saveIrshadLangs(t),
        O.langSel,
        "irLangEditIdx",
        "irLangEditVal",
        "irLangNewVal",
        "irLangPopOpen",
        (t) => ({ langSel: t }),
      ),
      H = B(
        () => this.loadIrshadLocs(),
        (t) => this.saveIrshadLocs(t),
        O.loc,
        "irLocEditIdx",
        "irLocEditVal",
        "irLocNewVal",
        "irLocPopOpen",
        (t) => ({ loc: t }),
      ),
      V = i.filter((t) => t.y === r && t.m === a).sort((t, e) => e.d - t.d || (e.ts || 0) - (t.ts || 0)),
      G = V.reduce((t, e) => t + this.benOf(e), 0),
      j = V.reduce((t, e) => t + (e.langs || []).reduce((t, e) => t + (e.count || 0), 0), 0),
      R = V.reduce((t, e) => t + (e.bro || 0), 0),
      z = V.reduce((t, e) => t + (e.pros || 0), 0),
      U = V.reduce((t, e) => t + (e.pol || 0), 0),
      W = (t.irLgSearch || "").trim().toLowerCase(),
      K = V.filter(
        (e) =>
          !(
            ("all" !== t.irLgShift && e.shift !== t.irLgShift) ||
            ("all" !== t.irLgLoc && (e.loc || "") !== t.irLgLoc) ||
            (W && !KIVO.BassamFind.match(W, [e.name, e.loc, e.shift, e.empno]))
          ),
      ),
      J = (t) => {
        let e = "—";
        try {
          const r = this.hGreg(t.y, t.m, t.d);
          e = r.getDate() + "/" + (r.getMonth() + 1) + "/" + r.getFullYear();
        } catch (t) {}
        let r = "—";
        try {
          if (t.ts) {
            const e = new Date(t.ts);
            let a = e.getHours();
            const i = e.getMinutes(),
              s = a >= 12 ? "م" : "ص";
            ((a %= 12), 0 === a && (a = 12), (r = String(a).padStart(2, "0") + ":" + String(i).padStart(2, "0") + " " + s));
          }
        } catch (t) {}
        return { dayLabel: t.d + "/" + t.m + "/" + t.y, gregLabel: e, timeLabel: r };
      },
      X = 0 === t.irLedgerPerPage ? 0 : t.irLedgerPerPage || 10,
      Q = 0 === X ? Math.max(1, K.length) : X,
      $ = Math.max(1, Math.ceil(K.length / Q)),
      Z = Math.min(Math.max(1, t.irLedgerPage || 1), $),
      q = (Z - 1) * Q,
      tt = K.slice(q, q + Q),
      et = [];
    {
      const t = [],
        e = (e) => {
          t.includes(e) || t.push(e);
        };
      e(1);
      for (let t = Z - 1; t <= Z + 1; t++) t >= 1 && t <= $ && e(t);
      (e($), t.sort((t, e) => t - e));
      for (let e = 0; e < t.length; e++) {
        e > 0 && t[e] - t[e - 1] > 1 && et.push({ dots: !0, label: "…" });
        const r = t[e];
        et.push({
          dots: !1,
          label: String(r),
          cur: r === Z,
          plain: r !== Z,
          style:
            "height:28px;min-width:28px;padding:0 4px;border:0;border-right:1px solid var(--bd-xe1e1e1);font-size:11px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';" +
            (r === Z ? "background:var(--bg-xb99751);color:var(--text-on-brand)" : "background:transparent;color:var(--fg-x475569)"),
          click: () => this.setState({ irLedgerPage: r }),
        });
      }
    }
    const rt = (t) =>
      "height:28px;width:28px;border:0;border-right:1px solid var(--bd-xe1e1e1);background:transparent;display:flex;align-items:center;justify-content:center;" +
      (t ? "color:var(--fg-x475569);cursor:pointer" : "color:var(--fg-xcbd5e1);cursor:default");
    return {
      irMonths: d,
      irYearLabel: r + " هـ",
      irGregRange: this.hGregYearRange(r),
      irBadgeLabel: KIVO.BassamCount(n, "تقرير") + " هذه السنة",
      irBadgeStyle:
        "display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;border-radius:9999px;padding:4px 12px;font-family:'Cairo',sans-serif;border:1px solid " +
        (y
          ? "rgba(185,151,81,0.35);color:var(--fg-x9a7e40);background:var(--bg-a185151810p12)"
          : "rgba(148,163,184,0.35);color:var(--fg-x64748b);background:var(--bg-a1481631840p1)"),
      irPrevYear: () => this.setState({ irYear: r - 1, irOpenMonths: {}, irOpenDays: {}, irLedgerOpen: !1 }),
      irNextYear: () => this.setState({ irYear: r + 1, irOpenMonths: {}, irOpenDays: {}, irLedgerOpen: !1 }),
      irGoCurrent: () => this.setState({ irYear: e.y, irMonth: e.m, irDay: e.d, irOpenMonths: {}, irOpenDays: {}, irLedgerOpen: !1 }),
      irDays: x,
      irSelDateLabel: t.irDay + " " + this.MONTHS[a - 1] + " " + r + " هـ",
      irMonthAutoHint: u,
      irDayLockedHint: P,
      /* IRSZ-4: نصُّ التلميح بحسب الصلاحية — «نقرة مزدوجة لفتحه» لمن يملك الاعتماد وحده */
      ...(() => {
        const AP = this.PC("approve"),
          NO = " · فتحه للاستدراك يحتاج صلاحية الاعتماد — راجع مدير الإدارة";
        return {
          irPmApprove: AP,
          irDayLockedTxt: "اليوم انقضى — مقفل" + (AP ? " · انقر بطاقة اليوم نقرة مزدوجة لفتحه ثم سجّل تقريرك" : NO),
          irMonthAutoTxt: "الشهر انقضى — مقفل" + (AP ? " · انقر بطاقة الشهر نقرة مزدوجة لفتحه ثم أضف تقريرك اليومي" : NO),
          irLegendLockTxt: AP ? "انقضى — مقفل · نقرة مزدوجة لفتحه" : "انقضى — مقفل",
        };
      })(),
      irCanEnter: M,
      irEntryTitle: (t.irEditId ? "تعديل تقرير — يوم " : "تسجيل تقرير — يوم ") + D + " " + L + " " + r + " هـ",
      irSaveBtnTitle: t.irEditId ? "حفظ التعديل" : "حفظ التقرير",
      ...KIVO.BassamCount.pair("irKpiCount", String(V.length), "تقرير"),
      irKpiBen: G.toLocaleString("en-US"),
      irKpiTrans: j.toLocaleString("en-US"),
      irKpiBro: R.toLocaleString("en-US"),
      irKpiRef: (z + U).toLocaleString("en-US"),
      irKpiPros: z.toLocaleString("en-US"),
      irKpiPol: U.toLocaleString("en-US"),
      irInputStyle:
        "width:100%;height:38px;padding:0 12px;font-size:12.5px;background:var(--bg-a2482502520p8);border:1px solid var(--bd-xe2e8f0);border-radius:11px;outline:none;font-family:'Cairo',sans-serif;color:var(--fg-x141414);box-sizing:border-box",
      irInputFocusStyle: "background:var(--bg-xffffff);border-color:var(--bd-a185151810p4);box-shadow:0 0 0 2px rgba(185,151,81,0.2)",
      irShiftOpts: k,
      irDraftShift: O.shift,
      irSetShift: (t) => N({ shift: t.target.value, eid: "" }),
      irNoShiftPicked: !O.shift,
      irNoEmpForShift: !!O.shift && 0 === F.length,
      irNoEmpMsg: this.bsOn("staff") ? "لا يوجد موظف مسكّن في هذه الوردية لهذا اليوم" : "لا يوجد موظفون",
      irHasEmpOpts: !!O.shift && F.length > 0,
      irEmpDisabled: !O.shift || 0 === F.length,
      irEmpOpts: F,
      irDraftEid: F.some((t) => t.eid === O.eid) ? O.eid : "",
      irSetEid: (t) => N({ eid: t.target.value }),
      irLocBtnLabel: O.loc || "— اختر موقعاً —",
      irLocRows: H.rows,
      irLocEmpty: H.empty,
      irLocPopOpen: H.popOpen,
      irLocBtnToggle: H.toggle,
      irLocClose: H.close,
      irLocNewVal: H.newVal,
      irLocNewSet: H.setNewVal,
      irLocAddNew: H.addNew,
      irLangBtnLabel: O.langSel || "— اختر لغة —",
      irLangRows: Y.rows,
      irLangEmpty: Y.empty,
      irLangPopOpen: Y.popOpen,
      irLangBtnToggle: Y.toggle,
      irLangClose: Y.close,
      irLangNewVal: Y.newVal,
      irLangNewSet: Y.setNewVal,
      irLangAddNew: Y.addNew,
      irDraftLangN: O.langN,
      irSetLangN: (t) => N({ langN: t.target.value.replace(/[^0-9]/g, "") }),
      irLangNUp: () => N({ langN: A(O.langN, 1) }),
      irLangNDown: () => N({ langN: A(O.langN, -1) }),
      irAddLang: () => {
        const t = this.state.irDraft || this.emptyDraft();
        if (!t.langSel) return void this.setState({ irSaveErrMsg: "اختر اللغة قبل الإضافة" });
        const e = parseInt(t.langN || "0", 10) || 0;
        this.setState({ irDraft: { ...t, langs: [...t.langs, { lang: t.langSel, count: e }], langSel: "", langN: "" }, irSaveErrMsg: "" });
      },
      irDraftBro: O.bro,
      irSetBro: (t) => N({ bro: t.target.value.replace(/[^0-9]/g, "") }),
      irBroUp: () => N({ bro: A(O.bro, 1) }),
      irBroDown: () => N({ bro: A(O.bro, -1) }),
      irDraftPros: O.pros,
      irSetPros: (t) => N({ pros: t.target.value.replace(/[^0-9]/g, "") }),
      irProsUp: () => N({ pros: A(O.pros, 1) }),
      irProsDown: () => N({ pros: A(O.pros, -1) }),
      irDraftPol: O.pol,
      irSetPol: (t) => N({ pol: t.target.value.replace(/[^0-9]/g, "") }),
      irPolUp: () => N({ pol: A(O.pol, 1) }),
      irPolDown: () => N({ pol: A(O.pol, -1) }),
      irNoDraftLangs: 0 === O.langs.length,
      irDraftLangs: O.langs.map((t, e) => ({
        label: t.lang + " — " + t.count,
        remove: () => {
          const t = this.state.irDraft || this.emptyDraft();
          this.setState({ irDraft: { ...t, langs: t.langs.filter((t, r) => r !== e) } });
        },
      })),
      irDraftTotal: (C + T + _ + I).toLocaleString("en-US"),
      irClearDraft: () => this.setState({ irDraft: this.emptyDraft(), irSaveErrMsg: "", irEditId: null }),
      irSaveErr: !!t.irSaveErrMsg,
      irSaveErrMsg: t.irSaveErrMsg || "",
      irIsEditing: !!t.irEditId,
      irSaveReport: () => {
        const t = this.state.irDraft || this.emptyDraft();
        if (!t.shift) return void this.setState({ irSaveErrMsg: "اختر الوردية أولاً" });
        const e = this.employeesForShift(r, a, t.shift, E).find((e) => e.eid === t.eid);
        if (!e)
          return void this.setState({ irSaveErrMsg: this.bsOn("staff") ? "اختر موظفاً من قائمة المسكّنين في هذه الوردية" : "اختر الموظف" });
        const i = this.loadIrshad(),
          s = this.state.irEditId;
        if (s) {
          const r = (i.reports || []).findIndex((t) => t.id === s);
          return -1 === r
            ? void this.setState({ irSaveErrMsg: "التقرير الذي تحاول تعديله لم يعد موجوداً" })
            : ((i.reports[r] = {
                ...i.reports[r],
                shift: t.shift,
                eid: e.eid,
                name: e.name,
                loc: t.loc || "",
                langs: t.langs.slice(),
                bro: parseInt(t.bro || "0", 10) || 0,
                pros: parseInt(t.pros || "0", 10) || 0,
                pol: parseInt(t.pol || "0", 10) || 0,
                editedTs: Date.now(),
                editedBy: this.irActor(),
              }),
              this.saveIrshad(i),
              void this.setState({ irDraft: this.emptyDraft(), irEditId: null, irSaveErrMsg: "" }));
        }
        const n = {
          id: "r" + Date.now().toString(36) + Math.floor(1e6 * Math.random()).toString(36),
          y: r,
          m: a,
          d: D,
          ts: Date.now(),
          shift: t.shift,
          eid: e.eid,
          name: e.name,
          loc: t.loc || "",
          actor: this.irActor(),
          langs: t.langs.slice(),
          bro: parseInt(t.bro || "0", 10) || 0,
          pros: parseInt(t.pros || "0", 10) || 0,
          pol: parseInt(t.pol || "0", 10) || 0,
        };
        ((i.reports = [...(i.reports || []), n]),
          this.saveIrshad(i),
          this.setState({ irDraft: { ...this.emptyDraft(), shift: t.shift }, irSaveErrMsg: "" }));
      },
      irLedgerOpen: !!t.irLedgerOpen,
      irLedgerToggle: () => this.setState({ irLedgerOpen: !this.state.irLedgerOpen }),
      irLedgerChev: "transition:transform .2s;flex-shrink:0;" + (t.irLedgerOpen ? "transform:rotate(180deg)" : ""),
      irLgSearch: t.irLgSearch || "",
      irLgSetSearch: (t) => this.setState({ irLgSearch: t.target.value, irLedgerPage: 1 }),
      irLgFilesOpen: !!t.irLgFilesOpen,
      irLgFilesToggle: () => this.setState((t) => ({ irLgFilesOpen: !t.irLgFilesOpen })),
      irLgFilesChev: "opacity:.5;transition:transform .2s;" + (t.irLgFilesOpen ? "transform:rotate(180deg)" : ""),
      irLgFilesBtnStyle:
        "height:34px;display:flex;align-items:center;gap:6px;font-size:11.5px;border:1px solid var(--bd-xe2e8f0);border-radius:10px;padding:0 10px;cursor:pointer;font-family:'Cairo',sans-serif;background:var(--bg-xffffff);" +
        (t.irLgFilesOpen ? "color:var(--fg-xb99751);border-color:var(--bd-a185151810p4)" : "color:var(--fg-x475569)"),
      irLgExportCsv: () => {
        if (!this.PC("export")) return;
        const t = K.map((t) => {
            const { dayLabel: e, gregLabel: r, timeLabel: a } = J(t);
            return [
              e,
              r,
              a,
              t.actor || "—",
              t.shift ? t.shift.replace("الوردية ", "") : "—",
              t.name || "—",
              t.loc || "—",
              (t.langs || []).length ? (t.langs || []).map((t) => (t.lang || "—") + " (" + (t.count || 0) + ")").join("، ") : "—",
              String((t.langs || []).reduce((t, e) => t + (e.count || 0), 0)),
              String(t.bro || 0),
              String(t.pros || 0),
              String(t.pol || 0),
              String(this.benOf(t)),
            ];
          }),
          e = [
            [
              "التاريخ هـ",
              "الموافق م",
              "وقت الحفظ",
              "المستخدم",
              "الوردية",
              "الموظف",
              "الموقع",
              "اللغات",
              "الاسترشاد",
              "مطويات",
              "النيابة",
              "الشرطة",
              "الإجمالي",
            ],
          ].concat(t);
        try {
          KIVO.BassamXLSX
            ? KIVO.BassamXLSX.download(e, "irshad-" + L + "-" + r + ".xlsx")
            : this.bsToast(
                "تعذّر تصدير Excel — مكتبة الجداول غير متاحة في هذه الجلسة. حدّث الصفحة وأعد المحاولة، أو استخدم «طباعة / حفظ PDF».",
              );
        } catch (t) {
          this.bsToast("تعذّر إنشاء ملف Excel — " + (t && t.message ? t.message : "خطأ غير متوقع") + ".");
        }
        this.setState({ irLgFilesOpen: !1 });
      },
      irLgPrintTable: () => {
        this.PC("export") && (this.setState({ irLgFilesOpen: !1 }), setTimeout(() => window.print(), 150));
      },
      irLgMonthLabel: L + " " + r + " هـ",
      irLgClearAllItemStyle:
        "display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;font-size:11px;font-weight:400;transition:background .15s;" +
        (V.length > 0 ? "cursor:pointer;color:var(--fg-x141414)" : "cursor:not-allowed;color:var(--fg-xcbd5e1);opacity:.6"),
      irLgClearAllAsk: () => {
        this.PC("del") ? 0 !== V.length && this.setState({ irLgFilesOpen: !1, irLgClearAllConfirm: !0 }) : this.permDeny();
      },
      irLgClearAllOpen: !!t.irLgClearAllConfirm,
      irLgClearAllStop: (t) => t.stopPropagation(),
      irLgClearAllCancel: () => this.setState({ irLgClearAllConfirm: !1 }),
      irLgClearAllMsg: "سيتم حذف جميع تقارير " + L + " " + r + " هـ نهائياً (" + KIVO.BassamCount(V.length, "تقرير|مسجّل") + ").",
      irLgClearAllDo: () => {
        const t = this.loadIrshad(),
          e = (t.reports || []).length;
        ((t.reports = (t.reports || []).filter((t) => !(t.y === r && t.m === a))), this.saveIrshad(t));
        const i = e - t.reports.length;
        (this.setState({ irLgClearAllConfirm: !1, irLedgerPage: 1 }),
          this.bsAck("تم حذف " + KIVO.BassamCount(i, "تقرير", "g") + " من " + L + " " + r + " هـ.", "ok"));
      },
      ...(() => {
        const e = (e, r, a, i) => {
          const s = t[r],
            n = t.irLgFddOpen === e,
            o = i.find((t) => t.v === s),
            l = {};
          return (
            (l[e + "Open"] = n),
            (l[e + "Toggle"] = () => this.setState((t) => ({ irLgFddOpen: t.irLgFddOpen === e ? null : e }))),
            (l[e + "Label"] = "all" === s ? a : o ? o.name : s),
            (l[e + "Chev"] = "transition:transform .2s;flex-shrink:0;opacity:.5;" + (n ? "transform:rotate(180deg)" : "")),
            (l[e + "BtnStyle"] =
              "height:32px;min-width:100px;font-size:11px;border-radius:8px;border:1px " +
              ("all" === s
                ? "dashed #cbd5e1;color:var(--fg-x475569)"
                : "solid rgba(185,151,81,0.5);color:var(--fg-x9a7e40);font-weight:400") +
              ";background:var(--bg-xffffff);padding:0 10px;cursor:pointer;font-family:'Cairo',sans-serif;display:inline-flex;align-items:center;justify-content:space-between;gap:6px" +
              (n ? ";box-shadow:0 0 0 2px rgba(185,151,81,0.15)" : "")),
            (l[e + "Opts"] = i.map((t) => ({
              name: t.name,
              selected: s === t.v,
              pick: () => this.setState({ [r]: t.v, irLgFddOpen: null, irLedgerPage: 1 }),
              style:
                "display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;font-size:11px;cursor:pointer;transition:background .15s;" +
                (s === t.v ? "background:var(--bg-a185151810p08);color:var(--fg-x9a7e40);font-weight:400" : "color:var(--fg-x141414)"),
            }))),
            l
          );
        };
        return {
          ...e(
            "irLgFs",
            "irLgShift",
            "كل الورديات",
            [{ v: "all", name: "كل الورديات" }].concat(k.map((t) => ({ v: t.name, name: t.name }))),
          ),
          ...e(
            "irLgFl",
            "irLgLoc",
            "كل المواقع",
            [{ v: "all", name: "كل المواقع" }].concat(this.loadIrshadLocs().map((t) => ({ v: t, name: t }))),
          ),
        };
      })(),
      irLgShownCount: String(K.length),
      irLgTotalCount: String(V.length),
      irLedgerCount: KIVO.BassamCount(String(V.length), "تقرير") + "",
      irLedgerSub: "كل تقارير الاسترشاد المسجّلة خلال " + L + " " + r + " هـ",
      irLedgerHas: K.length > 0,
      irLedgerEmpty: 0 === K.length,
      irLedgerEmptyMsg: 0 === V.length ? "لا تقارير مسجّلة في هذا الشهر بعد" : "لا نتائج مطابقة للبحث/الفلترة الحالية",
      irLedgerRows: tt.map((t) => {
        const { dayLabel: e, gregLabel: r, timeLabel: a } = J(t);
        return {
          dayLabel: e,
          gregLabel: r,
          timeLabel: a,
          actor: t.actor || "—",
          shift: t.shift ? t.shift.replace("الوردية ", "") : "—",
          ini: (t.name || "؟").trim()[0] || "؟",
          name: t.name || "—",
          loc: t.loc || "—",
          langs: (t.langs || []).map((t) => ({ name: t.lang || "—", count: String(t.count || 0) })),
          noLangs: 0 === (t.langs || []).length,
          trans: String((t.langs || []).reduce((t, e) => t + (e.count || 0), 0)),
          bro: String(t.bro || 0),
          pros: String(t.pros || 0),
          pol: String(t.pol || 0),
          ben: String(this.benOf(t)),
          edit: (e) => {
            e && e.stopPropagation && e.stopPropagation();
            const r = t.y + "-" + t.m,
              a = t.y + "-" + t.m + "-" + t.d;
            this.setState({
              irYear: t.y,
              irMonth: t.m,
              irDay: t.d,
              irOpenMonths: { [r]: !0 },
              irOpenDays: { [a]: !0 },
              irEditId: t.id,
              irDraft: {
                shift: t.shift || "",
                eid: t.eid || "",
                loc: t.loc || "",
                bro: String(t.bro || 0),
                pros: String(t.pros || 0),
                pol: String(t.pol || 0),
                langs: (t.langs || []).slice(),
                langSel: "",
                langN: "",
              },
              irSaveErrMsg: "",
            });
          },
          ...this._rowMenu("ir" + t.id, [
            this.PC("edit")
              ? {
                  name: "تعديل التقرير",
                  color: "#b99751",
                  p1: "M12 20h9",
                  p2: "M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z",
                  run: () => {
                    const e = t.y + "-" + t.m,
                      r = t.y + "-" + t.m + "-" + t.d;
                    this.setState({
                      irYear: t.y,
                      irMonth: t.m,
                      irDay: t.d,
                      irOpenMonths: { [e]: !0 },
                      irOpenDays: { [r]: !0 },
                      irEditId: t.id,
                      irDraft: {
                        shift: t.shift || "",
                        eid: t.eid || "",
                        loc: t.loc || "",
                        bro: String(t.bro || 0),
                        pros: String(t.pros || 0),
                        pol: String(t.pol || 0),
                        langs: (t.langs || []).slice(),
                        langSel: "",
                        langN: "",
                      },
                      irSaveErrMsg: "",
                    });
                  },
                }
              : null,
            this.PC("del")
              ? {
                  name: "حذف التقرير",
                  color: "#dc2626",
                  danger: !0,
                  p1: "M3 6h18",
                  p2: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
                  run: () => {
                    const e = this.loadIrshad();
                    ((e.reports = (e.reports || []).filter((e) => e.id !== t.id)),
                      this.saveIrshad(e),
                      this.setState({ irTab: this.state.irTab }));
                  },
                }
              : null,
          ]),
          del: () => {
            if (!this.PC("del")) return void this.permDeny();
            const e = this.loadIrshad();
            ((e.reports = (e.reports || []).filter((e) => e.id !== t.id)), this.saveIrshad(e), this.setState({ irTab: this.state.irTab }));
          },
        };
      }),
      ...KIVO.BassamCount.pair("irLedgerPgTotal", String(K.length), "سجل", "g"),
      irLedgerPgRange: 0 === K.length ? "0" : q + 1 + "–" + Math.min(q + Q, K.length),
      irLedgerPgNums: et,
      irLedgerPerPage: String(X),
      irLedgerOnPerPage: (t) => {
        const e = +t.target.value;
        this.setState({ irLedgerPerPage: 0 === e ? 0 : e || 10, irLedgerPage: 1 });
      },
      irLedgerPgFirst: () => this.setState({ irLedgerPage: 1 }),
      irLedgerPgPrev: () => this.setState({ irLedgerPage: Math.max(1, (this.state.irLedgerPage || 1) - 1) }),
      irLedgerPgNext: () => this.setState({ irLedgerPage: Math.min($, (this.state.irLedgerPage || 1) + 1) }),
      irLedgerPgLast: () => this.setState({ irLedgerPage: $ }),
      irLedgerPgFirstStyle: rt(Z > 1),
      irLedgerPgPrevStyle: rt(Z > 1),
      irLedgerPgNextStyle: rt(Z < $),
      irLedgerPgLastStyle: rt(Z < $),
    };
  }
}
