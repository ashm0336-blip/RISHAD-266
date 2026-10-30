class Component extends KIVO.BassamPageKit.base(DCLogic, ["admin+award+daily+dreport+employees+irshad+plan+profile+seized+staff+tasks","daily+dreport+dstats+irshad+plan+seized+staff+tasks","daily+dreport+irshad+plan+seized+staff+tasks","dreport+irshad+planning+profile+seized+staff+tasks","daily+dreport+irshad+plan+profile+seized","daily+dreport+plan","dreport+staff"]) {
  bsToast(t, r) {
    try {
      var e = document.getElementById("bs-toast");
      e || (((e = document.createElement("div")).id = "bs-toast"), document.body.appendChild(e));
      var n =
        "ok" === r
          ? ["var(--toast-ok)", "var(--bg-toast)", "var(--toast-ok-bd)", "✓"]
          : "warn" === r
            ? ["var(--toast-warn)", "var(--bg-toast)", "var(--toast-warn-bd)", "⚠"]
            : ["var(--toast-err)", "var(--bg-toast)", "var(--toast-err-bd)", "⚠"];
      (e.setAttribute(
        "style",
        "position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:2147483000;max-width:min(560px,92vw);direction:rtl;text-align:right;font-family:'Cairo',sans-serif;font-size:13px;font-weight:600;color:" +
          n[0] +
          ";background:" +
          n[1] +
          ";border:1px solid " +
          n[2] +
          ";border-radius:14px;padding:12px 18px;box-shadow:var(--shadow-elevated)",
      ),
        (e.textContent = n[3] + "  " + String(null == t ? "" : t)),
        clearTimeout(this._tt),
        (this._tt = setTimeout(function () {
          try {
            e.remove();
          } catch (t) {}
        }, 3200)));
    } catch (t) {}
  }
  hParts(t) {
    const r = this._hfmt().formatToParts(t),
      e = (t) => +r.find((r) => r.type === t).value;
    return { y: e("year"), m: e("month"), d: e("day") };
  }
  hGreg(t, r, e) {
    const n = (t) => new Date(t.getFullYear(), t.getMonth(), t.getDate(), 12);
    let a = n(new Date(new Date(2026, 5, 16).getTime() + 864e5 * (29.5306 * (12 * (t - 1448) + (r - 1)) + (e - 1))));
    try {
      for (let i = 0; i < 12; i++) {
        const i = this.hParts(a);
        if (i.y === t && i.m === r && i.d === e) return a;
        const s = 354.367 * (i.y - t) + 29.5306 * (i.m - r) + (i.d - e);
        a = n(new Date(a.getTime() - 864e5 * (Math.round(s) || (s > 0 ? 1 : -1))));
      }
    } catch (t) {}
    return a;
  }
  hMonthDays(t, r) {
    const e = t + "-" + r;
    if (((this.__hd = this.__hd || {}), this.__hd[e])) return this.__hd[e];
    let n = 30;
    try {
      const e = this.hGreg(t, r, 1),
        a = this.hParts(new Date(e.getFullYear(), e.getMonth(), e.getDate() + 29, 12));
      n = a.y === t && a.m === r ? 30 : 29;
    } catch (t) {}
    return ((this.__hd[e] = n), n);
  }
  hGregMonthLabel(t, r) {
    const e = t + "-" + r;
    if (((this.__hg = this.__hg || {}), this.__hg[e])) return this.__hg[e];
    let n = "";
    try {
      n = this.hGreg(t, r, 15).toLocaleDateString("ar-u-ca-gregory-nu-latn", { month: "long", year: "numeric" });
    } catch (t) {}
    return ((this.__hg[e] = n), n);
  }
  hGregYearRange(t) {
    try {
      const r = this.hGreg(t, 1, 1).getFullYear(),
        e = this.hGreg(t, 12, 29).getFullYear();
      return (r === e ? r : r + " – " + e) + " م";
    } catch (t) {
      return "";
    }
  }
  dayPastDS(t, r, e) {
    let n;
    try {
      n = this.hParts(new Date());
    } catch (t) {
      n = { y: 1448, m: 1, d: 1 };
    }
    return t < n.y || (t === n.y && r < n.m) || (t === n.y && r === n.m && e < n.d);
  }
  state = (() => {
    let t;
    try {
      t = ((t) => {
        const r = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {
            year: "numeric",
            month: "numeric",
            day: "numeric",
          }).formatToParts(t),
          e = (t) => +r.find((r) => r.type === t).value;
        return { y: e("year"), m: e("month"), d: e("day") };
      })(new Date());
    } catch (r) {
      t = { y: 1448, m: 1, d: 1 };
    }
    return {
      rpY: t.y,
      rpM: t.m,
      rpD: t.d,
      rpShift: "",
      rpShiftBy: {},
      rpTick: 0,
      drLk: null,
      drRt: null,
      drRs: null,
      drRsAck: !1,
      drQ: "",
      drFst: "all",
      drFmk: "all",
      drFpm: "all",
      drFddOpen: null,
      drFilesOpen: !1,
      drView: "list",
      drMkOpen: null,
      drMkLv: null,
      drMkTr: null,
      drMkPm: null,
      drShOpen: !1,
      drLdOpen: null,
      drLdAlt: null,
      drTrSel: "",
      drTrWhy: "",
      drTrConfirm: null,
      drRestOpen: null,
      drLocOpen: null,
      drCsOpen: null,
      drCsNew: "",
      drCsEdit: null,
      drLvNew: "",
      drTpOpen: null,
      drPage: 1,
      drPer: 10,
    };
  })();
  DK() {
    return this.state.rpY + "-" + this.state.rpM + "-" + this.state.rpD;
  }
  bsMenusPatch() {
    return {
      drCsOpen: null,
      drCsEdit: null,
      drCsNew: "",
      drLdOpen: null,
      drLdAlt: null,
      drLocOpen: null,
      drShOpen: !1,
      drFddOpen: null,
      drRestOpen: null,
      drFilesOpen: !1,
      drMkOpen: null,
      drMkLv: null,
      drMkTr: null,
      drMkPm: null,
      drLvNew: "",
      drTpOpen: null,
    };
  }
  _bsOutsideMenus(t) {
    try {
      for (var r = t.target, e = !1; r && r !== document.body; ) {
        if (r.style && ("absolute" === r.style.position || "fixed" === r.style.position)) {
          e = !0;
          break;
        }
        r = r.parentElement;
      }
      var n = this,
        a = this.bsMenusPatch(),
        i = {};
      (Object.keys(a).forEach(function (t) {
        i[t] = n.state[t];
      }),
        setTimeout(function () {
          try {
            var t = !1,
              r = !1,
              s = n.state;
            if (
              (Object.keys(a).forEach(function (e) {
                (s[e] !== i[e] && (t = !0), s[e] && (r = !0));
              }),
              t || e || !r)
            )
              return;
            n.setState(a);
          } catch (t) {}
        }, 0));
    } catch (t) {}
  }
  componentDidMount() {
    ((this._bsOutM = (t) => this._bsOutsideMenus(t)),
      document.addEventListener("click", this._bsOutM, !0),
      this.drFocusApply(),
      (this._focusLis = () => this.drFocusApply()));
    try {
      window.addEventListener("bs-dayfocus", this._focusLis);
    } catch (t) {}
    this._dayShLis = () => {
      try {
        this.setState({ rpTick: (this.state.rpTick || 0) + 1 });
      } catch (t) {}
    };
    try {
      window.addEventListener("bs-dayshift", this._dayShLis);
    } catch (t) {}
    this._storeLisDr = (t) => {
      try {
        "bassam_rounds_v1" !== ((t && t.detail && t.detail.key) || "") ||
          this._drWriting ||
          this.setState({ rpTick: (this.state.rpTick || 0) + 1 });
      } catch (t) {}
    };
    try {
      window.addEventListener("bassam:store", this._storeLisDr);
    } catch (t) {}
  }
  componentWillUnmount() {
    this._bsOutM && document.removeEventListener("click", this._bsOutM, !0);
    try {
      window.removeEventListener("bassam:store", this._storeLisDr);
    } catch (t) {}
    try {
      window.removeEventListener("bs-dayfocus", this._focusLis);
    } catch (t) {}
    try {
      window.removeEventListener("bs-dayshift", this._dayShLis);
    } catch (t) {}
  }
  componentDidUpdate(t, r) {
    try {
      var e = this.state,
        n = e.rpY + "-" + e.rpM + "-" + e.rpD;
      if (!r || r.rpY !== e.rpY || r.rpM !== e.rpM || r.rpD !== e.rpD) return (this.drFocusSet(e.rpY, e.rpM, e.rpD), void (this._fsig = n));
      var a = KIVO.BassamDayFocus ? KIVO.BassamDayFocus.get() : null;
      if (!a) return;
      var i = a.y + "-" + a.m + "-" + a.d;
      if (i === n) return void (this._fsig = i);
      if (this._fsig === i) return;
      ((this._fsig = i), this.drFocusApply());
    } catch (t) {}
  }
  drFocusSet(t, r, e) {
    try {
      KIVO.BassamDayFocus && KIVO.BassamDayFocus.set(t, r, e);
    } catch (t) {}
  }
  drFocusApply() {
    try {
      var t = KIVO.BassamDayFocus ? KIVO.BassamDayFocus.get() : null;
      if (!t) return;
      var r = this.state;
      if (t.y === r.rpY && t.m === r.rpM && t.d === r.rpD) return;
      var e = this.hMonthDays(t.y, t.m);
      this.setState({ rpY: t.y, rpM: t.m, rpD: Math.min(t.d, e) });
    } catch (t) {}
  }
  rpLoad() {
    var t;
    try {
      t = JSON.parse(localStorage.getItem("bassam_dreport_v1"));
    } catch (r) {
      t = null;
    }
    if (!t || "object" != typeof t) return {};
    var r = !1;
    return (
      void 0 !== t.__lv && (delete t.__lv, (r = !0)),
      void 0 !== t.__lvU && (delete t.__lvU, (r = !0)),
      Object.keys(t).forEach(function (e) {
        if (0 !== e.indexOf("m:")) {
          var n = t[e];
          if (
            (n &&
              n.shifts &&
              Object.keys(n.shifts).forEach(function (t) {
                var e = n.shifts[t];
                e && e.leaders && void 0 !== e.leaders.coord && (delete e.leaders.coord, (r = !0));
              }),
            n && n.pulled && !n.shifts)
          ) {
            var a = {};
            ((Array.isArray(n.roster) ? n.roster : []).forEach(function (t) {
              var r = t.shift || "—";
              (a[r] || (a[r] = { pulled: !0, roster: [], leaders: { chief: "", deputy: "" } }),
                a[r].roster.push(t),
                n.ap && ((a[r].ap = 1), (a[r].apBy = n.apBy || "—"), (a[r].apAt = n.apAt || "")));
            }),
              (t[e] = { created: 1, shifts: a }),
              (r = !0));
          }
        }
      }),
      r && this.rpSave(t),
      t
    );
  }
  rpSave(t) {
    try {
      localStorage.setItem("bassam_dreport_v1", JSON.stringify(t));
    } catch (t) {
      this.bsToast("تعذّر الحفظ — المساحة ممتلئة على الأرجح");
    }
  }
  rpEmps() {
    try {
      var t = JSON.parse(localStorage.getItem("bassam_employees_v1"));
      return Array.isArray(t) ? t : [];
    } catch (t) {
      return [];
    }
  }
  rpKeyOf(t) {
    return KIVO.BassamEmp && KIVO.BassamEmp.key ? KIVO.BassamEmp.key(t) : t.eid || t.nid || t.name || "";
  }
  rpStaffLive() {
    try {
      var t = JSON.parse(localStorage.getItem("bassam_staffing_v3"));
      return t && "object" == typeof t ? t : {};
    } catch (t) {
      return {};
    }
  }
  rpStaff() {
    var t = this.rpStaffLive();
    try {
      if (KIVO.BassamStaffSnap) return KIVO.BassamStaffSnap.all(t);
    } catch (t) {}
    return t;
  }
  drCsPersist(t, r) {
    var e = this.state.rpY + "-" + this.state.rpM,
      n = Object.assign({}, this.rpStaffLive()),
      a = Object.assign({}, n[e] || {});
    ((a[t] = Object.assign({}, a[t] || {}, { cs: r })), (n[e] = a));
    try {
      localStorage.setItem("bassam_staffing_v3", JSON.stringify(n));
    } catch (t) {}
  }
  drBucketFor(t, r) {
    return this.rpStaff()[t + "-" + r] || {};
  }
  rpMonthBucket() {
    return this.drBucketFor(this.state.rpY, this.state.rpM);
  }
  drShiftDefsFor(t) {
    try {
      var r = t && t.__shifts;
      if (Array.isArray(r) && r.length) return r;
    } catch (t) {}
    try {
      var e = JSON.parse(localStorage.getItem("bassam_shift_options_v1"));
      if (Array.isArray(e) && e.length) return e;
    } catch (t) {}
    return [];
  }
  drDistShiftsFor(t) {
    var r = {},
      e = [];
    return (
      Object.keys(t || {}).forEach(function (e) {
        if ("__shifts" !== e) {
          var n = t[e];
          n && "object" == typeof n && n.shift && (r[n.shift] = 1);
        }
      }),
      this.drShiftDefsFor(t).forEach(function (t) {
        t && t.name && r[t.name] && e.push({ name: t.name, color: t.color || "#b99751", tStart: t.tStart || "", tEnd: t.tEnd || "" });
      }),
      e
    );
  }
  drDistShifts() {
    return this.drDistShiftsFor(this.rpMonthBucket());
  }
  drDayShifts() {
    var t = this.drDistShifts().slice(),
      r = {};
    t.forEach(function (t) {
      r[t.name] = 1;
    });
    var e = this.rpLoad()[this.DK()],
      n = this.drShiftDefsFor(this.rpMonthBucket());
    return (
      e &&
        e.shifts &&
        Object.keys(e.shifts).forEach(function (a) {
          if (!r[a]) {
            r[a] = 1;
            var i = e.shifts[a],
              s = (i && i.def) || null,
              o = null;
            n.forEach(function (t) {
              t && t.name === a && (o = t);
            });
            var d = s || o || {};
            t.push({ name: a, color: d.color || "#b99751", tStart: d.tStart || "", tEnd: d.tEnd || "" });
          }
        }),
      t
    );
  }
  fmtClock(t) {
    var r = /^(\d{2}):(\d{2})$/.exec(t || "");
    if (!r) return t || "";
    var e = new Date(2e3, 0, 1, +r[1], +r[2]);
    try {
      return e.toLocaleTimeString("ar-SA-u-nu-latn", { hour: "2-digit", minute: "2-digit", hour12: !0 });
    } catch (r) {
      return t;
    }
  }
  drRosterOf(t) {
    var r = this.rpEmps(),
      e = this.rpMonthBucket(),
      n = [],
      a = this;
    return (
      r.forEach(function (r) {
        var i = a.rpKeyOf(r);
        if (i) {
          var s = e[i];
          s &&
            "object" == typeof s &&
            (s.shift || "") === t &&
            n.push({ ekey: i, name: r.name || "—", empno: r.empno || "—", shift: t, st: "pr" });
        }
      }),
      n
    );
  }
  drShiftSig(t) {
    var r = this.rpMonthBucket(),
      e = this.rpEmps(),
      n = this,
      a = [];
    return (
      e.forEach(function (e) {
        var i = n.rpKeyOf(e);
        if (i) {
          var s = r[i];
          s &&
            "object" == typeof s &&
            (s.shift || "") === t &&
            a.push(
              [
                i,
                s.shift || "",
                (s.rest || []).slice().sort().join("~"),
                !0 === s.muk ? 1 : 0,
                s.cs || "",
                JSON.stringify(s.leaves || []),
                (s.perm || []).slice().sort().join("~"),
                e.name || "",
                e.empno || "",
                e.phone || "",
              ].join("|"),
            );
        }
      }),
      a.sort().join("§")
    );
  }
  drShiftStale(t, r) {
    var e = this.drShiftRec(t, r);
    if (!e || !e.pulled) return 0;
    if ("string" == typeof e.sig) return this.drShiftSig(r) !== e.sig ? 1 : 0;
    var n = this.drRosterOf(r),
      a = e.tout || {};
    n = n.filter(function (t) {
      return !a[t.ekey];
    });
    var i = {};
    ((e.roster || []).forEach(function (t) {
      i[t.ekey] = 1;
    }),
      (e.roster || []).filter(function (t) {
        return t.tin;
      }).length);
    var s = 0;
    n.forEach(function (t) {
      i[t.ekey] || s++;
    });
    var o = {};
    n.forEach(function (t) {
      o[t.ekey] = 1;
    });
    var d = 0;
    return (
      (e.roster || []).forEach(function (t) {
        t.tin || o[t.ekey] || d++;
      }),
      s + d > 0 ? s + d : 0
    );
  }
  drSetShift(t, r) {
    var e = this.DK();
    if (this.drMyShift()) this.setState({ drShOpen: !1 }, r);
    else {
      try {
        KIVO.BassamDayShift && KIVO.BassamDayShift.set(this.state.rpY, this.state.rpM, this.state.rpD, t);
      } catch (t) {}
      this.setState(function (r) {
        var n = Object.assign({}, r.rpShiftBy || {});
        return ((n[e] = t), { rpShiftBy: n, rpShift: t, drShOpen: !1 });
      }, r);
    }
  }
  drRounds() {
    try {
      const t = JSON.parse(localStorage.getItem("bassam_rounds_v1"));
      return t && "object" == typeof t ? t : {};
    } catch (t) {
      return {};
    }
  }
  drGrpPref() {
    try {
      var t = JSON.parse(localStorage.getItem("bassam_dr_grp_v1"));
      if (t && "object" == typeof t) return t;
    } catch (t) {}
    return { on: !0, closed: { rest: !0 } };
  }
  drGrpSave(t) {
    try {
      localStorage.setItem("bassam_dr_grp_v1", JSON.stringify(t));
    } catch (t) {}
    this.setState({ rpTick: (this.state.rpTick || 0) + 1 });
  }
  drGrpToggle(t) {
    var r = this.drGrpPref();
    ((r.closed = r.closed || {}), (r.closed[t] = !r.closed[t]), this.drGrpSave(r));
  }
  drGrpSetOn(t) {
    var r = this.drGrpPref();
    ((r.on = !!t), this.drGrpSave(r));
  }
  drRoundsSave(t) {
    try {
      localStorage.setItem("bassam_rounds_v1", JSON.stringify(t));
    } catch (t) {
      this.bsToast("تعذّر الحفظ — المساحة ممتلئة على الأرجح");
    }
  }
  drRoundKey() {
    return this.state.rpY + "-" + this.state.rpM + "-" + this.state.rpD;
  }
  drRoundRec() {
    return this.drRounds()[this.drRoundKey()] || null;
  }
  drRoundSpots(t) {
    const r = [];
    return (
      ((t && t.d) || []).forEach((t, e) => {
        const n = t && t.name ? t.name : "الدور " + (e + 1);
        [
          ["zones", "منطقة"],
          ["gates", "باب"],
          ["marks", "معلم"],
        ].forEach(([a, i]) => {
          ((t && t[a]) || []).forEach((t, s) => {
            t &&
              (("gates" === a && KIVO.BassamLeaf && KIVO.BassamLeaf.isParent(t)) ||
                r.push({
                  id: e + ":" + a + ":" + s,
                  fi: e,
                  kk: a,
                  ii: s,
                  name:
                    "gates" === a
                      ? (String(null == t.num ? "" : t.num).trim() ? "#" + String(null == t.num ? "" : t.num).trim() + " — " : "") +
                        (String(t.label || t.name || "").trim() || "باب")
                      : "zones" === a
                        ? String(t.code || "").trim() || "منطقة"
                        : String(t.label || t.name || "").trim() || "معلم",
                  kind: i,
                  floor: n,
                  num:
                    "gates" === a
                      ? String(null == t.num ? "" : t.num).trim() +
                        (t.pOf ? (String(null == t.num ? "" : t.num).trim() ? "-" : "") + String(t.leafNo || "") : "")
                      : "",
                  zsub: "zones" === a ? [String(t.ztype || "").trim(), String(t.zcat || "").trim()].filter(Boolean).join(" · ") : "",
                  closed: "gates" === a && !!t.closed,
                  off: "marks" === a && !!t.off,
                  cWhy: t.cWhy || "",
                  cAt: t.cAt || "",
                  needN: t.needN,
                  needS: t.needS,
                  mKind: "marks" === a ? String(t.kind || "") : "",
                  emp: Array.isArray(t.emp) ? t.emp : [],
                }));
          });
        });
      }),
      r
    );
  }
  drSpotKeys(t, r) {
    const e = {};
    return (
      (t.emp || []).forEach((t) => {
        const n = r[t];
        e[n ? this.rpKeyOf(n) : t] = 1;
      }),
      e
    );
  }
  drToggleSpot(t, r, e) {
    const n = this.drRounds(),
      a = n[this.drRoundKey()];
    if (!a || !Array.isArray(a.d)) return void this.bsToast("لا توجد جولة لهذا اليوم — ابدأها من «الجولات اليومية» أولاً", "warn");
    if (a.ap) return void this.bsToast("جولة اليوم معتمدة ومقفلة — افتحها أولاً لتغيير التسكين", "warn");
    const i = this.rpEmps(),
      s = {};
    i.forEach((t) => {
      (KIVO.BassamEmp ? KIVO.BassamEmp.tokens(t) : [t.eid, t.nid, t.name]).forEach((r) => {
        r && (s[r] = t);
      });
    });
    const o = (r) => {
        const e = s[r];
        return (e ? this.rpKeyOf(e) : r) === t;
      },
      d = String(r).split(":"),
      p = (a.d || [])[+d[0]],
      c = p ? p[d[1]] || [] : null,
      l = c ? c[+d[2]] : null;
    if (!l) return;
    if ("gates" === d[1] && l.closed) return void this.bsToast("الباب مغلق — لا يُنقل إليه أحد", "warn");
    if ("marks" === d[1] && l.off) return void this.bsToast("المعلم معطّل — فعّله من «الجولات اليومية» أو اختر موقعاً عاملاً", "warn");
    const f = (Array.isArray(l.emp) ? l.emp : []).some(o);
    l.emp = f ? l.emp.filter((t) => !o(t)) : (Array.isArray(l.emp) ? l.emp : []).concat([t]);
    let h = "";
    try {
      const t = KIVO.BassamAuth && KIVO.BassamAuth.display ? KIVO.BassamAuth.display() : "";
      h = t && "object" == typeof t ? t.name || "" : String(t || "");
    } catch (t) {}
    const u =
      "gates" === d[1]
        ? "#" +
          String(null == l.num ? "" : l.num) +
          (l.pOf ? "-" + (l.leafNo || "") : "") +
          (l.label || l.name ? " — " + (l.label || l.name) : "")
        : "zones" === d[1]
          ? l.code || l.name || "مصلى"
          : l.label || l.kind || "معلم";
    ((a.mvLog = (a.mvLog || []).concat([
      {
        t: new Date().toTimeString().slice(0, 5),
        kind: d[1],
        key: t,
        tok: t,
        fromI: -1,
        toI: +d[2],
        rm: f,
        fromLbl: f ? u : "",
        toLbl: f ? "" : u,
        by: h,
        name: e || "",
        src: "dr",
      },
    ])),
      (this._drWriting = !0));
    try {
      this.drRoundsSave(n);
    } finally {
      this._drWriting = !1;
    }
    (this.bsAck(f ? "رُفع من " + u : "سُكِّن على " + u + " — انعكس على خريطة الجولات", "ok"),
      this.setState({ rpTick: (this.state.rpTick || 0) + 1 }));
  }
  drSetSpot(t, r, e) {
    const n = this.drRounds(),
      a = n[this.drRoundKey()];
    if (!a || !Array.isArray(a.d)) return void this.bsToast("لا توجد جولة لهذا اليوم — ابدأها من «الجولات اليومية» أولاً", "warn");
    if (a.ap) return void this.bsToast("جولة اليوم معتمدة ومقفلة — افتحها أولاً لتغيير التسكين", "warn");
    const i = this.rpEmps(),
      s = {};
    i.forEach((t) => {
      (KIVO.BassamEmp ? KIVO.BassamEmp.tokens(t) : [t.eid, t.nid, t.name]).forEach((r) => {
        r && (s[r] = t);
      });
    });
    const o = this,
      d = (r) => {
        const e = s[r];
        return (e ? o.rpKeyOf(e) : r) === t;
      },
      p = (t, r) => {
        try {
          const e = Date.now();
          let n = "";
          try {
            const t = KIVO.BassamAuth && KIVO.BassamAuth.display ? KIVO.BassamAuth.display() : "";
            n = t && "object" == typeof t ? t.name || "" : String(t || "");
          } catch (t) {}
          t.fLog = (Array.isArray(t.fLog) ? t.fLog : []).concat([{ at: e, a: r, by: n || "—" }]).slice(-60);
        } catch (t) {}
      };
    if (
      ((a.d || []).forEach((t) => {
        ["zones", "gates", "marks"].forEach((r) => {
          ((t && t[r]) || []).forEach((t) => {
            if (t && Array.isArray(t.emp)) {
              const r = t.emp.some((t) => d(t));
              ((t.emp = t.emp.filter((t) => !d(t))), r && p(t, "رفع تسكين " + (e || "موظف") + " عن الموقع"));
            }
          });
        });
      }),
      r)
    ) {
      const n = String(r).split(":"),
        i = (a.d || [])[+n[0]],
        s = i ? i[n[1]] || [] : null,
        o = s ? s[+n[2]] : null;
      if (o) {
        if ("gates" === n[1] && o.closed)
          return void this.bsToast("الباب مغلق — لا يُنقل إليه أحد. افتحه من «الجولات اليومية» أو اختر باباً مفتوحاً", "warn");
        if ("marks" === n[1] && o.off) return void this.bsToast("المعلم معطّل — فعّله من «الجولات اليومية» أو اختر موقعاً عاملاً", "warn");
        ((o.emp = (Array.isArray(o.emp) ? o.emp : []).concat([t])), p(o, "سكّن " + (e || "موظف") + " على الموقع"));
      }
    }
    if (!r) {
      let r = "";
      try {
        const t = KIVO.BassamAuth && KIVO.BassamAuth.display ? KIVO.BassamAuth.display() : "";
        r = t && "object" == typeof t ? t.name || "" : String(t || "");
      } catch (t) {}
      a.mvLog = (a.mvLog || []).concat([
        {
          t: new Date().toTimeString().slice(0, 5),
          kind: "gates",
          key: t,
          tok: t,
          fromI: -1,
          toI: -1,
          rm: !0,
          fromLbl: "كل المواقع",
          toLbl: "",
          by: r,
          name: e || "",
          src: "dr",
        },
      ]);
    }
    this._drWriting = !0;
    try {
      this.drRoundsSave(n);
    } finally {
      this._drWriting = !1;
    }
    this.setState({ rpTick: (this.state.rpTick || 0) + 1 });
  }
  drRestMap(t) {
    return t && t.rest && "object" == typeof t.rest ? t.rest : {};
  }
  drRestOf(t, r, e) {
    var n = this.drRestMap(t)[r];
    return Array.isArray(n) ? n : Array.isArray(e) ? e : [];
  }
  drToggleRest(t, r, e) {
    var n = this.rpLoad(),
      a = this.drCurShift();
    if (this.drLockedDay(n, this.state.rpY, this.state.rpM, this.state.rpD)) this.bsToast("التقرير مقفل — لا تعديل بعد القفل", "warn");
    else {
      var i = this.drShiftRec(n, a);
      if (i && i.pulled)
        if (i.ap) this.bsToast("تقرير الوردية معتمد — افتحه أولاً ثم عدّل", "warn");
        else {
          var s = this.drRestOf(i, t, e).slice(),
            o = s.indexOf(r);
          if (-1 === o) {
            if (s.length >= 2) return void this.bsToast("راحتان في الأسبوع حدّاً", "warn");
            s.push(r);
          } else s.splice(o, 1);
          ((i.rest = i.rest || {}),
            (i.rest[t] = s),
            (i.restSrc = i.restSrc && "object" == typeof i.restSrc ? i.restSrc : {}),
            (i.restSrc[t] = "day"),
            this.rpSave(n),
            this.setState({ rpTick: (this.state.rpTick || 0) + 1 }));
        }
    }
  }
  drRefreshShift(t) {
    var r = this;
    this.drSetShift(t, function () {
      r.rpPull();
    });
  }
  drMyShift() {
    try {
      return KIVO.BassamMyShift ? KIVO.BassamMyShift.of(this.state.rpY, this.state.rpM, this.state.rpD) : null;
    } catch (t) {
      return null;
    }
  }
  drCurShift() {
    var t = this.drDayShifts();
    if (!t.length) return "";
    var r = this.drMyShift();
    if (r) return r.shift;
    var e = "";
    try {
      e = (KIVO.BassamDayShift ? KIVO.BassamDayShift.get(this.state.rpY, this.state.rpM, this.state.rpD) : "") || "";
    } catch (t) {
      e = "";
    }
    e || (e = (this.state.rpShiftBy || {})[this.DK()] || "");
    for (var n = 0; n < t.length; n++) if (t[n].name === e) return e;
    return t[0].name;
  }
  PC(t) {
    try {
      return !!KIVO.BassamPerm && KIVO.BassamPerm.can("dreport", t || "view");
    } catch (t) {
      return !1;
    }
  }
  permDeny() {
    try {
      this.bsToast("صلاحيتك على التقرير اليومي لا تشمل هذا الإجراء — راجع مدير الإدارة");
    } catch (t) {}
  }
  drDayOpen(t, r, e, n) {
    var a = t["m:" + r + "-" + e];
    return !!(a && a.dopen && a.dopen[n]);
  }
  drDayClosed(t, r, e, n) {
    var a = t["m:" + r + "-" + e];
    return !!(a && a.dshut && a.dshut[n]);
  }
  drSetDClosed(t, r, e, n) {
    var a = this.rpLoad(),
      i = "m:" + t + "-" + r,
      s = Object.assign({}, a[i] || {}),
      o = Object.assign({}, s.dshut || {});
    (n ? (o[e] = 1) : delete o[e],
      Object.keys(o).length ? (s.dshut = o) : delete s.dshut,
      Object.keys(s).length ? (a[i] = s) : delete a[i],
      this.rpSave(a),
      this.setState({ rpTick: (this.state.rpTick || 0) + 1 }));
  }
  drToggleDayLock(t, r, e, n) {
    n
      ? this.dayPastDS(t, r, e)
        ? this.drSetDOpen(t, r, e, !1)
        : this.drSetDClosed(t, r, e, !0)
      : (this.drSetDClosed(t, r, e, !1), this.dayPastDS(t, r, e) && this.drSetDOpen(t, r, e, !0));
  }
  drSetDOpen(t, r, e, n) {
    var a = this.rpLoad(),
      i = "m:" + t + "-" + r,
      s = Object.assign({}, a[i] || {}),
      o = Object.assign({}, s.dopen || {});
    (n ? (o[e] = 1) : delete o[e],
      Object.keys(o).length ? (s.dopen = o) : delete s.dopen,
      Object.keys(s).length ? (a[i] = s) : delete a[i],
      this.rpSave(a),
      this.setState({ rpTick: (this.state.rpTick || 0) + 1 }));
  }
  drLockedDay(t, r, e, n) {
    return (this.dayPastDS(r, e, n) && !this.drDayOpen(t, r, e, n)) || this.drDayClosed(t, r, e, n);
  }
  drRec(t) {
    return t[this.DK()] || null;
  }
  drShiftRec(t, r) {
    var e = this.drRec(t);
    return (e && e.shifts && e.shifts[r]) || null;
  }
  drDayAllAp(t, r, e, n, a) {
    var i = t[r + "-" + e + "-" + n];
    if (!i || !i.created) return !1;
    var s = {},
      o = 0;
    if (
      ((a || []).forEach(function (t) {
        t && t.name && !s[t.name] && ((s[t.name] = 1), o++);
      }),
      Object.keys(i.shifts || {}).forEach(function (t) {
        s[t] || ((s[t] = 1), o++);
      }),
      !o)
    )
      return !1;
    for (var d in s) {
      var p = i.shifts && i.shifts[d];
      if (!p || !p.pulled || !p.ap) return !1;
    }
    return !0;
  }
  drAnyShiftAp(t) {
    if (!t || !t.shifts) return !1;
    for (var r = Object.keys(t.shifts), e = 0; e < r.length; e++) if (t.shifts[r[e]] && t.shifts[r[e]].ap) return !0;
    return !1;
  }
  rpCreate() {
    if (!this.PC("add")) return void this.permDeny();
    var t = this.rpLoad();
    if (this.drLockedDay(t, this.state.rpY, this.state.rpM, this.state.rpD))
      this.bsToast("اليوم مقفل — افتحه من نافذة الاستدراك أولاً", "warn");
    else if (this.drDistShifts().length) {
      var r = t[this.DK()];
      (r && r.created) ||
        ((t[this.DK()] = { created: 1, shifts: {} }),
        this.rpSave(t),
        this.setState({ rpTick: (this.state.rpTick || 0) + 1 }),
        this.bsAck("أُنشئ تقرير اليوم — اختر ورديتك وعيّن قيادتها ثم اسحب جدولها", "ok"));
    } else this.bsToast("لا يوجد تسكينٌ لهذا الشهر — أنشئ الجدول الشهري أولاً", "warn");
  }
  drEnsureShift(t, r) {
    var e = t[this.DK()];
    if (!e || !e.created) return null;
    if (((e.shifts = e.shifts || {}), !e.shifts[r])) {
      var n = null;
      (this.drDayShifts().forEach(function (t) {
        t.name === r && (n = t);
      }),
        (e.shifts[r] = {
          pulled: !1,
          roster: [],
          leaders: { chief: "", deputy: "" },
          def: n ? { color: n.color || "#b99751", tStart: n.tStart || "", tEnd: n.tEnd || "" } : null,
        }));
    }
    return e.shifts[r];
  }
  drStaffApproved(t, r) {
    try {
      var e = JSON.parse(localStorage.getItem("bassam_staffing_locks_v1"));
      return !(!e || !0 !== e[t + "-" + r]);
    } catch (t) {
      return !1;
    }
  }
  drAutoRound() {
    try {
      if (!KIVO.BassamRound || !this.bsOn("daily/rounds")) return;
      var t = this.state.rpY,
        r = this.state.rpM,
        e = this.state.rpD,
        n = KIVO.BassamRound.ensure(t, r, e);
      "created" === n.status
        ? this.bsAck(
            "plan" === n.src
              ? "أُنشئت جولة اليوم في «الجولات اليومية» من التشغيل الميداني"
              : "أُنشئت جولة اليوم في «الجولات اليومية» ممّا استقرّت عليه جولة يوم " + n.fromDay,
            "ok",
          )
        : "plandraft" === n.status
          ? this.bsToast(
              "التقرير جاهز — ولم تُنشأ جولة اليوم بعد: التشغيل الميداني لهذا الشهر ما زال مسودة، تُنشأ تلقائياً بمجرد اعتماده",
              "warn",
            )
          : "noplan" === n.status && this.bsToast("التقرير جاهز — ولا يوجد تشغيل ميداني لهذا الشهر لتُنشأ منه جولة اليوم", "warn");
    } catch (t) {}
  }
  rpPull() {
    var t = this.rpLoad(),
      r = this.drCurShift();
    if (r) {
      var e = this.MONTHS[this.state.rpM - 1] || "";
      if (this.drStaffApproved(this.state.rpY, this.state.rpM))
        if (this.drLockedDay(t, this.state.rpY, this.state.rpM, this.state.rpD))
          this.bsToast("اليوم مقفل — افتحه من نافذة الاستدراك أولاً", "warn");
        else {
          var n = this.drShiftRec(t, r);
          if (n && n.ap) this.bsToast("تقرير الوردية معتمد ومقفل — افتحه أولاً من زرّ الاعتماد بجانب قائمة الورديات", "warn");
          else {
            var a = this.drRosterOf(r),
              i = (n && n.tout) || {};
            a = a.filter(function (t) {
              return !i[t.ekey];
            });
            var s = ((n && n.roster) || []).filter(function (t) {
              return (
                t.tin &&
                !a.some(function (r) {
                  return r.ekey === t.ekey;
                })
              );
            });
            if ((a = a.concat(s)).length) {
              var o = {};
              (((n && n.roster) || []).forEach(function (t) {
                o[t.ekey] = t.st;
              }),
                a.forEach(function (t) {
                  o[t.ekey] && (t.st = o[t.ekey]);
                }));
              var d = this.drRepPerm(t),
                p = this.state.rpD;
              a.forEach(function (t) {
                "pr" === (t.st || "pr") && -1 !== (d[t.ekey] || []).indexOf(p) && (t.st = "pm");
              });
              var c = this.drEnsureShift(t, r);
              if (c) {
                if (((c.pulled = !0), (c.roster = a), (c.sig = this.drShiftSig(r)), !c.def)) {
                  var l = null;
                  (this.drDayShifts().forEach(function (t) {
                    t.name === r && (l = t);
                  }),
                    l && (c.def = { color: l.color || "#b99751", tStart: l.tStart || "", tEnd: l.tEnd || "" }));
                }
                try {
                  var f = this.rpMonthBucket();
                  ((c.rest = c.rest && "object" == typeof c.rest ? c.rest : {}),
                    (c.muk = c.muk && "object" == typeof c.muk ? c.muk : {}),
                    (c.restSrc = c.restSrc && "object" == typeof c.restSrc ? c.restSrc : {}),
                    a.forEach(function (t) {
                      var r = f[t.ekey] || {};
                      ("day" !== c.restSrc[t.ekey] &&
                        ((c.rest[t.ekey] = Array.isArray(r.rest) ? r.rest.slice() : []), (c.restSrc[t.ekey] = "sched")),
                        (c.muk[t.ekey] = !0 === r.muk));
                    }));
                } catch (t) {}
                (this.rpSave(t),
                  this.setState({ rpTick: (this.state.rpTick || 0) + 1 }),
                  this.bsAck("سُحب جدول " + r + " — " + KIVO.BassamCount(a.length, "موظف") + "", "ok"));
                try {
                  KIVO.BassamDayShift &&
                    !KIVO.BassamDayShift.get(this.state.rpY, this.state.rpM, this.state.rpD) &&
                    KIVO.BassamDayShift.set(this.state.rpY, this.state.rpM, this.state.rpD, r);
                } catch (t) {}
                var h = this;
                setTimeout(function () {
                  h.drAutoRound();
                }, 700);
              }
            } else this.bsToast("لا موظفين لهذه الوردية في الجدول الشهري", "warn");
          }
        }
      else
        this.bsToast(
          "الجدول الشهري لشهر " +
            e +
            " ما زال مسودة — لا يُسحب جدول الوردية إلا من جدولٍ معتمد. اعتمده من صفحة «الجدول الشهري» بنقرة مزدوجة على كرت الشهر",
          "warn",
        );
    }
  }
  drAddLeaveKind(t) {
    if (this.PC("edit")) {
      var r = (t || "").trim();
      if (r) {
        var e = this.drLeaveKinds();
        if (-1 === e.indexOf(r))
          try {
            localStorage.setItem("bassam_leave_kinds_v1", JSON.stringify(e.concat([r])));
          } catch (t) {}
      }
    } else this.permDeny();
  }
  drDelLeaveKind(t) {
    if (this.PC("edit")) {
      var r = this.drLeaveKinds().filter(function (r) {
        return r !== t;
      });
      try {
        localStorage.setItem("bassam_leave_kinds_v1", JSON.stringify(r));
      } catch (t) {}
    } else this.permDeny();
  }
  drRepPerm(t) {
    var r = "m:" + this.state.rpY + "-" + this.state.rpM,
      e = (t[r] = t[r] || {});
    return (e.perm || ((e.perm = {}), this.rpSave(t)), e.perm);
  }
  drPopReflow() {
    setTimeout(function () {
      try {
        window.dispatchEvent(new Event("resize"));
      } catch (t) {}
    }, 60);
  }
  rpTransfer() {
    var t = this.state.drTrConfirm;
    if (t) {
      var r = this.rpLoad();
      if (this.drLockedDay(r, this.state.rpY, this.state.rpM, this.state.rpD)) this.bsToast("التقرير مقفل — لا تحويل بعد القفل", "warn");
      else {
        var e = this.drShiftRec(r, t.from);
        if (e && e.pulled)
          if (e.ap) this.bsToast("تقرير الوردية معتمد — لا تحويل بعد الاعتماد", "warn");
          else {
            var n = this.drShiftRec(r, t.to);
            if (n && n.ap) this.bsToast("تقرير " + t.to + " معتمد ومقفل — يُفتح أولاً ثم يُحوَّل إليه", "warn");
            else {
              var a = null;
              if (
                ((e.roster || []).forEach(function (r) {
                  r.ekey === t.ekey && (a = r);
                }),
                a)
              ) {
                ((e.roster = (e.roster || []).filter(function (r) {
                  return r.ekey !== t.ekey;
                })),
                  (e.tout = e.tout || {}),
                  (e.tout[t.ekey] = { to: t.to, why: t.why }));
                var i = this.drEnsureShift(r, t.to);
                if (i) {
                  (i.tout && delete i.tout[t.ekey],
                    (i.roster = (i.roster || []).filter(function (r) {
                      return r.ekey !== t.ekey;
                    })),
                    i.roster.push({
                      ekey: t.ekey,
                      name: a.name,
                      empno: a.empno,
                      shift: t.to,
                      st: "pr",
                      tin: 1,
                      tfrom: t.from,
                      treason: t.why,
                    }));
                  try {
                    var s = KIVO.BassamNotif;
                    if (s && s.emit) {
                      var o = "";
                      try {
                        var d = KIVO.BassamAuth && KIVO.BassamAuth.display ? KIVO.BassamAuth.display() : "";
                        o = d && "object" == typeof d ? d.name || "" : String(d || "");
                      } catch (t) {}
                      s.emit("rep_mv", { own: [t.ekey], vars: { الوردية: t.to, الموقع: t.why || t.from || "—", المُعدّل: o } });
                    }
                  } catch (t) {}
                  (this.rpSave(r),
                    this.setState({
                      drTrConfirm: null,
                      drMkOpen: null,
                      drMkTr: null,
                      drTrSel: "",
                      drTrWhy: "",
                      rpTick: (this.state.rpTick || 0) + 1,
                    }),
                    this.bsAck("حُوِّل " + a.name + " إلى " + t.to, "ok"));
                }
              } else this.setState({ drTrConfirm: null });
            }
          }
        else this.setState({ drTrConfirm: null });
      }
    }
  }
  drLastRepOf(t) {
    for (var r = this.rpLoad(), e = this.state.rpY, n = this.state.rpM, a = this.state.rpD - 1; a >= 1; a--) {
      var i = r[e + "-" + n + "-" + a],
        s = i && i.shifts && i.shifts[t];
      if (s && s.pulled && (s.roster || []).length) return { d: a, sr: s, ap: !!s.ap };
    }
    return null;
  }
  drContinuePull() {
    var t = this.rpLoad(),
      r = this.drCurShift();
    if (r)
      if (this.drLockedDay(t, this.state.rpY, this.state.rpM, this.state.rpD))
        this.bsToast("اليوم مقفل — افتحه من نافذة الاستدراك أولاً", "warn");
      else {
        var e = this.drShiftRec(t, r);
        if (e && e.ap) this.bsToast("تقرير الوردية معتمد ومقفل — افتحه أولاً", "warn");
        else {
          var n = this.drLastRepOf(r);
          if (n)
            if (n.ap) {
              var a = (n.sr.roster || []).map(function (t) {
                return {
                  ekey: t.ekey,
                  name: t.name,
                  empno: t.empno && String(t.empno) !== String(t.ekey) ? t.empno : "—",
                  shift: r,
                  st: "pr",
                };
              });
              if (a.length) {
                var i = this.drRepPerm(t),
                  s = this.state.rpD;
                a.forEach(function (t) {
                  -1 !== (i[t.ekey] || []).indexOf(s) && (t.st = "pm");
                });
                var o = this.drEnsureShift(t, r);
                if (o) {
                  ((o.pulled = !0), (o.roster = a), (o.sig = this.drShiftSig(r)));
                  var d = {};
                  if (
                    (Object.keys(n.sr.rest || {}).forEach(function (t) {
                      d[t] = (n.sr.rest[t] || []).slice();
                    }),
                    (o.rest = d),
                    !o.def)
                  ) {
                    var p = null;
                    (this.drDayShifts().forEach(function (t) {
                      t.name === r && (p = t);
                    }),
                      p && (o.def = { color: p.color || "#b99751", tStart: p.tStart || "", tEnd: p.tEnd || "" }));
                  }
                  (this.rpSave(t),
                    this.setState({ rpTick: (this.state.rpTick || 0) + 1 }),
                    this.bsAck("تُوبع من تقرير يوم " + n.d + " — " + KIVO.BassamCount(a.length, "موظف") + "", "ok"));
                  try {
                    KIVO.BassamDayShift &&
                      !KIVO.BassamDayShift.get(this.state.rpY, this.state.rpM, this.state.rpD) &&
                      KIVO.BassamDayShift.set(this.state.rpY, this.state.rpM, this.state.rpD, r);
                  } catch (t) {}
                  var c = this;
                  setTimeout(function () {
                    c.drAutoRound();
                  }, 700);
                }
              } else this.bsToast("التقرير السابق بلا موظفين", "warn");
            } else this.bsToast("تقرير يوم " + n.d + " لهذه الوردية ما زال مسودة — اعتمِده أولاً ليصلح أساساً لليوم الجديد", "warn");
          else this.bsToast("لا يوجد تقريرٌ سابق لهذه الوردية في هذا الشهر — المتابعة تبدأ من يومٍ سبق اعتماده", "warn");
        }
      }
  }
  rpMark(t, r, e, n) {
    var a = this.rpLoad(),
      i = this.drCurShift();
    if (this.drLockedDay(a, this.state.rpY, this.state.rpM, this.state.rpD)) this.bsToast("التقرير مقفل — لا تأشير بعد القفل", "warn");
    else {
      var s = this.drShiftRec(a, i);
      if (s && s.pulled)
        if (s.ap) this.bsToast("تقرير الوردية معتمد — لا تأشير بعد الاعتماد", "warn");
        else {
          var o = "pr";
          if (
            ((s.roster || []).forEach(function (r) {
              r.ekey === t && (o = r.st || "pr");
            }),
            "pm" === r && "pm" !== o)
          ) {
            var d = this.drRepPerm(a)[t] || [];
            if (-1 === d.indexOf(this.state.rpD) && d.length >= this.loadPermLimit())
              return void this.bsToast("اكتمل نصاب استئذانات الشهر (" + this.loadPermLimit() + ") — احذف يوماً أو ارفع الحدّ", "warn");
            this.drSetPermDay(a, t, !0);
          }
          ("pm" === o && "pm" !== r && this.drSetPermDay(a, t, !1),
            (s.roster = (s.roster || []).map(function (a) {
              return a.ekey === t
                ? Object.assign({}, a, { st: r, pmk: "pm" === r ? n || a.pmk || "out" : "", lvk: ("lv" === r && (e || a.lvk)) || "" })
                : a;
            })),
            this.rpSave(a),
            this.setState({ drMkOpen: null, drMkLv: null, drMkTr: null, drMkPm: null, drLvNew: "", rpTick: (this.state.rpTick || 0) + 1 }));
        }
    }
  }
  drTpApply(t, r) {
    var e = KIVO.BassamPerm;
    if (e && e.setEmpPerms) {
      var n = this.rpLoad();
      if (this.drLockedDay(n, this.state.rpY, this.state.rpM, this.state.rpD)) this.bsToast("التقرير مقفل — لا تعديل بعد القفل", "warn");
      else {
        var a = this.drShiftRec(n, this.drCurShift());
        if (a && a.ap) this.bsToast("تقرير الوردية معتمد ومقفل — افتحه أولاً", "warn");
        else {
          var i = !1;
          try {
            i = !!((e.can && e.can("emps", "edit")) || (KIVO.BassamAuth && KIVO.BassamAuth.isSuper && KIVO.BassamAuth.isSuper()));
          } catch (t) {}
          if (i) {
            var s = !1;
            try {
              s = !!(KIVO.BassamAuth && KIVO.BassamAuth.staffMap && KIVO.BassamAuth.staffMap()[t]);
            } catch (t) {}
            if (s) {
              var o = "",
                d = this;
              (this.rpEmps() || []).forEach(function (r) {
                d.rpKeyOf(r) === t && (o = r.name || "");
              });
              var p = [];
              try {
                var c = JSON.parse(localStorage.getItem("bassam_perm_tpls_v1"));
                Array.isArray(c) && (p = KIVO.BassamPerm && KIVO.BassamPerm.tplsMigrate ? KIVO.BassamPerm.tplsMigrate(c) : c);
              } catch (t) {}
              var l = null;
              if (
                !r ||
                (p.forEach(function (t) {
                  t.id === r && (l = t);
                }),
                l)
              ) {
                try {
                  e.deptCap();
                } catch (t) {}
                var f = (l && l.perms) || {},
                  h = e.tplCut ? e.tplCut(f) : {},
                  u = e.setEmpPerms(t, h);
                if (u && !1 === u.ok) this.bsToast(u.err || "تعذّر حفظ الصلاحيات", "warn");
                else {
                  try {
                    e.setEmpTpl && e.setEmpTpl(t, l ? l.id : "");
                  } catch (t) {}
                  try {
                    var m = KIVO.BassamNotif;
                    if (m && m.emit) {
                      var g = Object.keys(h)
                          .filter(function (t) {
                            return (h[t] || []).length;
                          })
                          .map(function (t) {
                            try {
                              return (e.nameOf && e.nameOf(t)) || t;
                            } catch (r) {
                              return t;
                            }
                          })
                          .filter(function (t, r, e) {
                            return t && e.indexOf(t) === r;
                          }),
                        y = "";
                      try {
                        var b = KIVO.BassamAuth && KIVO.BassamAuth.display ? KIVO.BassamAuth.display() : "";
                        y = b && "object" == typeof b ? b.name || "" : String(b || "");
                      } catch (t) {}
                      m.emit("pm_chg", {
                        own: [t],
                        vars: {
                          الفعل: l ? "صلاحيتك في تقرير اليوم صارت «" + (l.name || "") + "»:" : "سُحبت صلاحياتك من تقرير اليوم:",
                          الصفحات: g.length ? g.join(" · ") : "بلا صفحات",
                          المُغيّر: y,
                        },
                      });
                    }
                  } catch (t) {}
                  (this.setState({ drTpOpen: null, rpTick: (this.state.rpTick || 0) + 1 }),
                    !l || Object.keys(h).length
                      ? this.bsAck(
                          l
                            ? "مُنح " + (o || "الموظف") + " قالب «" + (l.name || "") + "» — يسري فوراً في المنصة كلها"
                            : "أزيلت صلاحيات " + (o || "الموظف") + " — فوراً وفي المنصة كلها",
                          "ok",
                        )
                      : this.bsToast(
                          "مُنح قالب «" +
                            (l.name || "") +
                            "» لكنه بلا أي صفحات ضمن سقف الإدارة — ستظهر الخانة «بدون صلاحية» حتى تُحدَّد صفحات القالب من الجدول الشهري أو يضبط المشرف العام سقف صفحات الإدارة",
                          "warn",
                        ));
                }
              } else this.bsToast("القالب لم يعد موجوداً — أعد فتح القائمة", "warn");
            } else this.bsToast("لا حساب دخول لهذا الموظف — يُفعَّل من صفحة الموظفين أولاً", "warn");
          } else this.bsToast("منح الصلاحيات يتطلب صلاحية تحرير صفحة الموظفين", "warn");
        }
      }
    }
  }
  rpSetLeader(t, r) {
    var e = this.rpLoad(),
      n = this.drCurShift();
    if (n)
      if (this.drLockedDay(e, this.state.rpY, this.state.rpM, this.state.rpD)) this.bsToast("التقرير مقفل — لا تعديل بعد القفل", "warn");
      else {
        var a = this.drShiftRec(e, n);
        if (a && a.ap) this.bsToast("تقرير الوردية معتمد — لا تعديل على القيادة بعد الاعتماد", "warn");
        else {
          var i = this.drEnsureShift(e, n);
          if (i) {
            var s = (i.leaders && i.leaders[t]) || "",
              o = "chief" === t || "deputy" === t ? this.drRoleCs(t) : "";
            if (o && ("chief" === t || "deputy" === t)) {
              var d = e.__ldcs && "object" == typeof e.__ldcs ? e.__ldcs : {};
              void 0 === d[t] && ((d[t] = o), (e.__ldcs = d));
            }
            if (((i.leaders = i.leaders || {}), (i.leaders[t] = r), this.rpSave(e), o)) {
              var p = this.rpMonthBucket();
              (s && s !== r && p[s] && p[s].cs === o && this.drCsWrite(s, ""), r && r !== s && this.drCsWrite(r, o));
            }
            this.setState({ rpTick: (this.state.rpTick || 0) + 1 });
          }
        }
      }
  }
  drLdCs() {
    var t = this.rpLoad();
    return t.__ldcs && "object" == typeof t.__ldcs ? t.__ldcs : {};
  }
  drRoleCs(t) {
    var r = this.drLdCs();
    if (void 0 !== r[t]) return r[t] || "";
    try {
      var e = this.drShiftRec(this.rpLoad(), this.drCurShift()),
        n = (e && e.leaders && e.leaders[t]) || "";
      if (!n) return "";
      var a = this.rpMonthBucket();
      return a[n] && "string" == typeof a[n].cs ? a[n].cs : "";
    } catch (t) {
      return "";
    }
  }
  drCsWrite(t, r) {
    this.drCsPersist(t, r);
  }
  drLdCsSet(t, r) {
    var e = this.rpLoad(),
      n = e.__ldcs && "object" == typeof e.__ldcs ? e.__ldcs : {};
    ((n[t] = r || ""), (e.__ldcs = n), this.rpSave(e));
    try {
      var a = this.drShiftRec(e, this.drCurShift()),
        i = (a && a.leaders && a.leaders[t]) || "";
      i && this.drCsWrite(i, r || "");
    } catch (t) {}
    this.setState({ drCsOpen: null, rpTick: (this.state.rpTick || 0) + 1 });
  }
  drCsList() {
    try {
      var t = JSON.parse(localStorage.getItem("bassam_callsigns_v1"));
      if (Array.isArray(t))
        return t.filter(function (t) {
          return "string" == typeof t && t.trim();
        });
    } catch (t) {}
    return [];
  }
  drCsSet(t, r) {
    var e = this.rpLoad();
    if (this.drLockedDay(e, this.state.rpY, this.state.rpM, this.state.rpD)) this.bsToast("التقرير مقفل — لا تعديل بعد القفل", "warn");
    else {
      var n = this.drCurShift(),
        a = n ? this.drShiftRec(e, n) : null;
      a && a.ap
        ? this.bsToast("تقرير الوردية معتمد — لا تعديل بعد الاعتماد", "warn")
        : this.PC("edit")
          ? (this.drCsPersist(t, r), this.setState({ drCsOpen: null, rpTick: (this.state.rpTick || 0) + 1 }))
          : this.permDeny();
    }
  }
  drSetAp(t) {
    var r = this.rpLoad(),
      e = this.drCurShift(),
      n = this.drShiftRec(r, e);
    if (n && n.pulled) {
      if (t) {
        n.ap = 1;
        try {
          var a = KIVO.BassamAuth && KIVO.BassamAuth.user ? KIVO.BassamAuth.user() : null;
          n.apBy = (a && (a.name || a.username)) || "—";
        } catch (t) {
          n.apBy = "—";
        }
        n.apAt = new Date().toISOString();
        try {
          KIVO.BassamDayShift &&
            !KIVO.BassamDayShift.get(this.state.rpY, this.state.rpM, this.state.rpD) &&
            KIVO.BassamDayShift.set(this.state.rpY, this.state.rpM, this.state.rpD, e);
        } catch (t) {}
      } else (delete n.ap, delete n.apBy, delete n.apAt);
      (this.rpSave(r), this.setState({ rpTick: (this.state.rpTick || 0) + 1 }));
      try {
        if (KIVO.BassamRound && this.bsOn("daily/rounds")) {
          t && KIVO.BassamRound.ensure && KIVO.BassamRound.ensure(this.state.rpY, this.state.rpM, this.state.rpD);
          var i = KIVO.BassamRound.setShiftAp(this.state.rpY, this.state.rpM, this.state.rpD, e, t ? 1 : 0);
          "approved" === i.status
            ? this.bsAck("اعتُمدت جولة «" + e + "» في الجولات اليومية مع التقرير — لقطة الميدان محفوظة", "ok")
            : "opened" === i.status && this.bsAck("فُتحت جولة «" + e + "» في الجولات اليومية مع فتح التقرير", "ok");
        }
      } catch (t) {}
      if (t && this.dayPastDS(this.state.rpY, this.state.rpM, this.state.rpD)) {
        var s = this.rpLoad();
        this.drDayAllAp(s, this.state.rpY, this.state.rpM, this.state.rpD, this.drDistShifts()) &&
          this.drSetDOpen(this.state.rpY, this.state.rpM, this.state.rpD, !1);
      }
    }
  }
  drFilterDD(t, r, e, n) {
    var a = this.state,
      i = this,
      s = a[r],
      o = a.drFddOpen === t,
      d = {};
    ((d[t + "Open"] = o),
      (d[t + "Toggle"] = function () {
        i.setState({ drFddOpen: i.state.drFddOpen === t ? null : t });
      }));
    var p = null;
    return (
      n.forEach(function (t) {
        t.v === s && (p = t);
      }),
      (d[t + "Label"] = "all" === s ? e : p ? p.name : s),
      (d[t + "Chev"] = "transition:transform .2s;flex-shrink:0;opacity:.5;" + (o ? "transform:rotate(180deg)" : "")),
      (d[t + "BtnStyle"] =
        "height:32px;min-width:100px;font-size:11px;border-radius:8px;border:1px " +
        ("all" === s ? "dashed #cbd5e1;color:var(--fg-x475569)" : "solid rgba(185,151,81,0.5);color:var(--fg-x9a7e40);font-weight:400") +
        ";background:var(--bg-xffffff);padding:0 10px;cursor:pointer;font-family:'Cairo',sans-serif;display:inline-flex;align-items:center;justify-content:space-between;gap:6px" +
        (o ? ";box-shadow:0 0 0 2px rgba(185,151,81,0.15)" : "")),
      (d[t + "Opts"] = n.map(function (t) {
        return (
          t.v,
          {
            name: t.name,
            selected: s === t.v,
            pick: function () {
              var e = { drFddOpen: null, drPage: 1 };
              ((e[r] = t.v), i.setState(e));
            },
            style:
              "display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;font-size:11px;cursor:pointer;transition:background .15s;" +
              (s === t.v ? "background:var(--bg-a185151810p08);color:var(--fg-x9a7e40);font-weight:400" : "color:var(--fg-x141414)"),
          }
        );
      })),
      d
    );
  }
  permDaysOf(t, r, e) {
    var n = this.hMonthDays(r, e),
      a = Array.isArray(t && t.perm) ? t.perm : [],
      i = {},
      s = [];
    return (
      a.forEach(function (t) {
        var r = parseInt(t, 10);
        !isNaN(r) && r >= 1 && r <= n && !i[r] && ((i[r] = 1), s.push(r));
      }),
      s.sort(function (t, r) {
        return t - r;
      })
    );
  }
  shiftDurMins(t, r) {
    var e = /^(\d{2}):(\d{2})$/.exec(t || ""),
      n = /^(\d{2}):(\d{2})$/.exec(r || "");
    if (!e || !n) return null;
    var a = 60 * +e[1] + +e[2],
      i = 60 * +n[1] + +n[2] - a;
    return (i <= 0 && (i += 1440), i);
  }
  fmtDur(t) {
    if (null == t) return "";
    var r = Math.floor(t / 60),
      e = t % 60,
      n = "";
    1 === r ? (n = "ساعة واحدة") : 2 === r ? (n = "ساعتان") : r >= 3 && r <= 10 ? (n = r + " ساعات") : r > 10 && (n = r + " ساعة");
    var a = "";
    return (
      1 === e ? (a = "دقيقة واحدة") : 2 === e ? (a = "دقيقتان") : e >= 3 && e <= 10 ? (a = e + " دقائق") : e > 10 && (a = e + " دقيقة"),
      n && a ? n + " و" + a : n || a || "أقل من دقيقة"
    );
  }
  drLeaveKinds() {
    var t = ["إجازة سنوية", "إجازة مرضية", "إجازة اضطرارية", "إجازة بدون راتب"];
    try {
      var r = localStorage.getItem("bassam_leave_kinds_v1");
      if (r) {
        var e = JSON.parse(r);
        Array.isArray(e) && e.length && (t = e);
      }
    } catch (t) {}
    return t;
  }
  drSetPermDay(t, r, e) {
    (this.state.rpY, this.state.rpM);
    var n = this.state.rpD,
      a = this.drRepPerm(t),
      i = (a[r] || []).slice();
    e !== (-1 !== i.indexOf(n)) &&
      (a[r] = e
        ? i.concat([n]).sort(function (t, r) {
            return t - r;
          })
        : i.filter(function (t) {
            return t !== n;
          }));
  }
  renderVals() {
    var t = this.state,
      r = this,
      e = this.hParts(new Date()),
      n = this.rpLoad(),
      a = this.hMonthDays(t.rpY, t.rpM),
      i = this.drDistShifts(),
      s = this.drDayShifts(),
      o = this.drCurShift(),
      d = this.drMyShift(),
      p = null;
    s.forEach(function (t) {
      t.name === o && (p = t);
    });
    for (
      var c = (p && p.color) || "#b99751",
        l = function (r) {
          var e = n[t.rpY + "-" + t.rpM + "-" + r];
          return !(!e || !e.created);
        },
        f = function (e) {
          return r.drDayAllAp(n, t.rpY, t.rpM, e, i);
        },
        h = 0,
        u = 1;
      u <= a;
      u++
    )
      l(u) && h++;
    for (
      var m = this.MONTHS.map(function (a, i) {
          var s = i + 1,
            o = t.rpM === s,
            d = t.rpY === e.y && s === e.m,
            p =
              Object.keys(n).filter(function (r) {
                return 0 === r.indexOf(t.rpY + "-" + s + "-") && n[r] && n[r].created;
              }).length > 0,
            c = t.rpY < e.y || (t.rpY === e.y && s < e.m),
            l = (function () {
              if (!p) return !1;
              var e = r.hMonthDays(t.rpY, s);
              if (!e) return !1;
              var a = r.drDistShiftsFor(r.drBucketFor(t.rpY, s));
              if (!a.length) return !1;
              for (var i = 1; i <= e; i++) if (!r.drDayAllAp(n, t.rpY, s, i, a)) return !1;
              return !0;
            })(),
            f =
              "position:relative;width:100%;border-radius:12px;padding:8px;text-align:center;transition:all .2s;box-shadow:var(--shadow-card);cursor:pointer;box-sizing:border-box;font-family:'Cairo',sans-serif;border:1px ",
            h = "#53565a",
            u = "#cbd5e1",
            m = "—",
            g = !1,
            y = "M12 3a9 9 0 0 1 9 9",
            b = "M12 21a9 9 0 0 1-9-9";
          return (
            c && l
              ? ((f +=
                  (o ? "solid #0e7490;box-shadow:0 0 0 2px rgba(14,116,144,0.25);" : "solid rgba(14,116,144,0.4);") +
                  "background:var(--bg-a141161440p07)"),
                (h = "#0e7490"),
                (u = "#0e7490"),
                (m = "مكتمل — مقفل"),
                (g = !0),
                (y = "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"),
                (b = "m9 12 2 2 4-4"))
              : c
                ? ((f +=
                    (o ? "solid #64748b;box-shadow:0 0 0 2px rgba(100,116,139,0.25);" : "solid rgba(100,116,139,0.35);") +
                    "background:var(--bg-a1001161390p08)"),
                  (h = "#475569"),
                  (u = "#475569"),
                  (m = "انقضى — مقفل"),
                  (g = !0),
                  (y = "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"),
                  (b = ""))
                : p
                  ? ((f +=
                      (o ? "solid #b99751;box-shadow:0 0 0 2px rgba(185,151,81,0.3);" : "solid rgba(245,158,11,0.35);") +
                      "background:var(--bg-a245158110p08)"),
                    (h = o ? "#b99751" : "#b45309"),
                    (u = "#b45309"),
                    (m = "مسودة"),
                    (g = !0),
                    (y = "M7 11V7a5 5 0 0 1 9.9-1"),
                    (b = "M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z"))
                  : o
                    ? ((f += "solid #b99751;box-shadow:0 0 0 2px rgba(185,151,81,0.3);background:var(--bg-a185151810p06)"),
                      (h = "#b99751"),
                      (u = "#cbd5e1"),
                      (m = "—"),
                      (g = !1))
                    : (f += "dashed #E1E1E1;background:var(--bg-a2452452450p7);opacity:.9"),
            {
              name: a,
              greg: r.hGregMonthLabel(t.rpY, s) || r.GREG[i],
              style: f,
              nameColor: h,
              footColor: u,
              footLabel: m,
              footP1: y,
              footP2: b,
              footIcon: g,
              isCurrent: d,
              showBadge: !1,
              dbl: function (t) {
                try {
                  t.stopPropagation();
                } catch (t) {}
              },
              tip:
                a +
                " " +
                t.rpY +
                " هـ" +
                (c
                  ? l
                    ? " — كل أيامه معتمدة، مكتمل ومقفل بانقضائه"
                    : r.PC("approve")
                      ? " — انقضى، وأيامه تُفتح للاستدراك بنقرة مزدوجة على خانة اليوم"
                      : " — انقضى ومقفل · فتحُ أيامه للاستدراك يحتاج صلاحية الاعتماد"
                  : p
                    ? " — فيه تقارير مسودة"
                    : ""),
              click: (function (t, n) {
                return function () {
                  r.setState({ rpM: t, rpD: n ? e.d : 1 });
                };
              })(s, d),
            }
          );
        }),
        g = this.hGreg(t.rpY, t.rpM, 1),
        y = new Date(g.getFullYear(), g.getMonth(), g.getDate(), 12),
        b = [],
        k = 1;
      k <= a;
      k++
    )
      (function (a) {
        var i = l(a) ? "c" : "e",
          s = f(a),
          o = r.drDayOpen(n, t.rpY, t.rpM, a),
          d = r.dayPastDS(t.rpY, t.rpM, a),
          p = r.drDayClosed(n, t.rpY, t.rpM, a),
          c = (d && !o) || p,
          h = a === t.rpD,
          u = t.rpY === e.y && t.rpM === e.m && a === e.d,
          m = "#fff",
          g = "#53565a",
          k = "2px solid #E1E1E1";
        ("c" === i && ((m = s ? "#047857" : c ? "#64748b" : "#b99751"), (g = "#fff"), (k = "2px solid transparent")),
          "e" === i && c && ((m = "rgba(148,163,184,0.12)"), (g = "#94a3b8")),
          h && (k = "2px solid #b99751"));
        var S = new Date(y.getTime() + 864e5 * (a - 1)),
          x = "";
        try {
          x = S.toLocaleDateString("ar-u-ca-gregory-nu-latn", { day: "numeric", month: "long", year: "numeric" });
        } catch (t) {}
        var v =
            "position:relative;height:24px;flex:1 1 auto;min-width:28px;padding:0 3px;border-radius:4px;font-size:8px;font-weight:700;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;user-select:none;background:" +
            m +
            ";color:" +
            g +
            ";border:" +
            k,
          w =
            "display:block;width:9px;height:1px;flex-shrink:0;margin:1px 0;background:" +
            ("c" === i ? "rgba(255,255,255,0.5)" : "rgba(148,163,184,0.55)"),
          O = n[t.rpY + "-" + t.rpM + "-" + a];
        b.push({
          num: String(a),
          gnum: String(S.getDate()),
          style: v,
          sepStyle: w,
          isToday: u,
          lockClosed: s || c,
          lockOpen: !s && d && o,
          canReset: "c" === i && !c && !r.drAnyShiftAp(O),
          resetTip: "إعادة تهيئة اليوم " + a,
          reset: (function (e) {
            return function (n) {
              try {
                n.stopPropagation();
              } catch (t) {}
              var a = r.rpLoad(),
                i = a[t.rpY + "-" + t.rpM + "-" + e];
              i &&
                i.created &&
                !r.drAnyShiftAp(i) &&
                (r.drLockedDay(a, t.rpY, t.rpM, e) ||
                  r.setState({
                    rpD: e,
                    drRs: { d: e, label: "يوم " + e + " " + (r.MONTHS[t.rpM - 1] || "") + " " + t.rpY + " هـ" },
                    drRsAck: !1,
                  }));
            };
          })(a),
          tip:
            "يوم " +
            a +
            " هـ — الموافق " +
            x +
            " م — " +
            /* الموجة 1 · IRSZ-4: «نقرة مزدوجة…» لمن يملك الاعتماد وحده — وغيرُه يُخبَر بالسبب (كان يُدعى إلى نقرةٍ تنتهي برفض) */
            (r.PC("approve")
              ? "c" === i
                ? s
                  ? "كل ورديات اليوم معتمدة · نقرة مزدوجة لفتح اليوم أو إغلاقه"
                  : p
                    ? "اليوم مُغلق — عرضٌ فقط · نقرة مزدوجة لفتحه"
                    : c
                      ? "اليوم انقضى — مقفل · نقرة مزدوجة لفتحه بأثر رجعي"
                      : d && o
                        ? "مفتوح بأثر رجعي — نقرة مزدوجة لإغلاقه"
                        : "تقرير مسودة — نقرة مزدوجة لإغلاق اليوم"
                : p
                  ? "فارغ — مُغلق · نقرة مزدوجة لفتحه"
                  : c
                    ? "فارغ — انقضى ومقفل · نقرة مزدوجة لفتحه وإنشاء تقريره بأثر رجعي"
                    : d && o
                      ? "فارغ — مفتوح بأثر رجعي · نقرة مزدوجة لإعادة قفله"
                      : "فارغ"
              : "c" === i
                ? s
                  ? "كل ورديات اليوم معتمدة"
                  : p
                    ? "اليوم مُغلق — عرضٌ فقط" + " · فتحه يحتاج صلاحية الاعتماد"
                    : c
                      ? "اليوم انقضى — مقفل" + " · فتحه يحتاج صلاحية الاعتماد"
                      : d && o
                        ? "مفتوح بأثر رجعي"
                        : "تقرير مسودة"
                : p
                  ? "فارغ — مُغلق" + " · فتحه يحتاج صلاحية الاعتماد"
                  : c
                    ? "فارغ — انقضى ومقفل" + " · فتحه يحتاج صلاحية الاعتماد"
                    : d && o
                      ? "فارغ — مفتوح بأثر رجعي"
                      : "فارغ"),
          click: (function (t) {
            return function () {
              r.setState({ rpD: t });
            };
          })(a),
          dbl: (function (e) {
            return function (n) {
              try {
                n.stopPropagation();
              } catch (t) {}
              /* IRSZ-4: بلا صلاحية الاعتماد ⇒ السببُ فوراً (كانت نافذةُ الفتح تُفتح ثم يُرفض زرُّها) */
              if (!r.PC("approve")) return void (r.setState({ rpD: e }), r.bsToast("فتحُ اليوم وإغلاقُه يحتاج صلاحية الاعتماد على التقرير اليومي — راجع مدير الإدارة"));
              var a = r.rpLoad(),
                i = r.drLockedDay(a, t.rpY, t.rpM, e);
              r.setState({ rpD: e }, function () {
                r.setState({ drRt: { d: e, open: i } });
              });
            };
          })(a),
        });
      })(k);
    var S = this.drRec(n),
      x = !(!S || !S.created),
      v = this.dayPastDS(t.rpY, t.rpM, t.rpD),
      w = this.drDayOpen(n, t.rpY, t.rpM, t.rpD),
      O = this.drDayClosed(n, t.rpY, t.rpM, t.rpD),
      T = (v && !w) || O,
      E = o ? this.drShiftRec(n, o) : null,
      D = !(!E || !E.ap),
      M = this.PC("approve"),
      L = x && !T && !D,
      A = x && (T || D),
      C = this.drDayAllAp(n, t.rpY, t.rpM, t.rpD, i),
      P = 0;
    s.forEach(function (t) {
      var e = r.drShiftRec(n, t.name);
      e && e.ap && P++;
    });
    var B = E && E.pulled && Array.isArray(E.roster) ? E.roster : [],
      R = (n["m:" + t.rpY + "-" + t.rpM] || {}).perm || {},
      _ = 0,
      F = 0,
      Y = 0,
      j = 0,
      z = this;
    B.forEach(function (t) {
      "ab" === t.st ? F++ : "pm" === t.st ? Y++ : "lv" === t.st ? j++ : _++;
    });
    var N = this.drShiftDefsFor(this.rpMonthBucket()),
      K = this.rpMonthBucket(),
      I = this.rpEmps(),
      G = this.drCsList(),
      W = !L || !this.PC("edit"),
      H = this.drLdCs(),
      V = {};
    I.forEach(function (t) {
      V[r.rpKeyOf(t)] = t;
    });
    var J = "";
    try {
      J = r.hGreg(t.rpY, t.rpM, t.rpD).toLocaleDateString("ar-SA-u-nu-latn", { weekday: "long" });
    } catch (t) {}
    var Q = function (t) {
        return (
          !!J &&
          (t || []).some(function (t) {
            return t === J || "ال" + t === J || t === "ال" + J;
          })
        );
      },
      U = 0;
    (B.forEach(function (t) {
      if ("ab" !== t.st && "pm" !== t.st && "lv" !== t.st) {
        var e = K[t.ekey] || {};
        Q(r.drRestOf(E, t.ekey, Array.isArray(e.rest) ? e.rest : [])) && U++;
      }
    }),
      (_ = Math.max(0, B.length - F - Y - j - U)));
    var X = B.length - U,
      $ = Object.keys((E && E.tout) || {}).length,
      Z = B.length + $,
      q = {};
    (r.WEEKDAYS.forEach(function (t) {
      q[t] = 0;
    }),
      B.forEach(function (t) {
        var e = K[t.ekey] || {};
        r.drRestOf(E, t.ekey, Array.isArray(e.rest) ? e.rest : []).forEach(function (t) {
          var r = t && void 0 !== q[t] ? t : "ال" + t;
          void 0 !== q[r] && q[r]++;
        });
      }));
    var tt = r.WEEKDAYS.reduce(function (t, r) {
        return t + q[r];
      }, 0),
      rt = r.WEEKDAYS.reduce(function (t, r) {
        return Math.max(t, q[r]);
      }, 0),
      et = r.WEEKDAYS.reduce(function (t, r) {
        return Math.min(t, q[r]);
      }, rt),
      nt = tt > 0 && rt !== et,
      at = this.loadPermLimit(),
      it =
        (new Date().toLocaleDateString("ar-SA-u-nu-latn", { weekday: "long" }),
        N.map(function (t) {
          return t.name;
        })),
      st = B.map(function (t) {
        var e = V[t.ekey] || {},
          n = K[t.ekey] || {},
          a = void 0 !== n.shift ? n.shift : "",
          i = -1 !== it.indexOf(a) ? a : "",
          s = r.drRestOf(E, t.ekey, Array.isArray(n.rest) ? n.rest : []);
        return {
          ekey: t.ekey,
          mark: t.st || "pr",
          lvk: t.lvk || "",
          pmk: t.pmk || "",
          tin: t.tin ? 1 : 0,
          tfrom: t.tfrom || "",
          treason: t.treason || "",
          nid: e.nid || "",
          eid: e.eid || "",
          name: e.name || t.name || "",
          empno: e.empno || (t.empno && String(t.empno) !== String(t.ekey) ? String(t.empno) : ""),
          phone: e.phone || "",
          type: e.type || "",
          gender: e.gender || "",
          shift: i,
          rest: s,
          muk: !0 === n.muk,
          cs: "string" == typeof n.cs ? n.cs : "",
          perm: R[t.ekey] || [],
          onRest: Q(s),
        };
      }),
      ot = st.length;
    (String(t.drQ || "").trim() &&
      (st = KIVO.BassamFind.filter(t.drQ, st, function (t) {
        return [t.name, t.nid, t.phone, t.empno, t.cs, t.shift];
      })),
      "active" === t.drFst &&
        (st = st.filter(function (t) {
          return !(t.onRest || (t.mark && "pr" !== t.mark));
        })),
      "ab" === t.drFst &&
        (st = st.filter(function (t) {
          return "ab" === t.mark;
        })),
      "pm" === t.drFst &&
        (st = st.filter(function (t) {
          return "pm" === t.mark;
        })),
      "tin" === t.drFst &&
        (st = st.filter(function (t) {
          return !!t.tin;
        })),
      "rest" === t.drFst &&
        (st = st.filter(function (t) {
          return t.onRest && "lv" !== t.mark;
        })),
      "leave" === t.drFst &&
        (st = st.filter(function (t) {
          return "lv" === t.mark;
        })),
      "on" === t.drFmk &&
        (st = st.filter(function (t) {
          return t.muk;
        })),
      "off" === t.drFmk &&
        (st = st.filter(function (t) {
          return !t.muk;
        })));
    var dt = {};
    N.forEach(function (t) {
      var r = /^(\d{2}):(\d{2})$/.exec(t.tStart || "");
      dt[t.name] = r ? 60 * +r[1] + +r[2] : null;
    });
    var pt = function (t) {
        return t.shift ? (null == dt[t.shift] ? 1 : 0) : 2;
      },
      ct = function (t) {
        return t.onRest ? 4 : "lv" === t.mark ? 3 : "ab" === t.mark ? 2 : "pm" === t.mark ? 1 : 0;
      },
      lt = (function () {
        try {
          var t = KIVO.BassamAuth;
          return (t && t.staffMap && t.staffMap()) || {};
        } catch (t) {
          return {};
        }
      })(),
      ft = (function () {
        try {
          var t = JSON.parse(localStorage.getItem("bassam_perm_tpls_v1"));
          return Array.isArray(t) ? (KIVO.BassamPerm && KIVO.BassamPerm.tplsMigrate ? KIVO.BassamPerm.tplsMigrate(t) : t) : [];
        } catch (t) {
          return [];
        }
      })(),
      ht = function (t) {
        return Object.keys(t || {})
          .filter(function (r) {
            return (t[r] || []).length;
          })
          .sort()
          .map(function (r) {
            return r + ":" + (t[r] || []).slice().sort().join(",");
          })
          .join("|");
      },
      ut =
        ((function () {
          try {
            var t = KIVO.BassamPerm;
            return t ? t.deptCap() : [];
          } catch (t) {
            return [];
          }
        })(),
        ft.map(function (t) {
          var r = KIVO.BassamPerm;
          return r && r.tplSig ? r.tplSig(t.perms) : ht(t.perms || {});
        })),
      mt = function (t) {
        try {
          var r = KIVO.BassamPerm;
          return r && r.empPerms && t ? ht(r.empPerms(t) || {}) : "";
        } catch (t) {
          return "";
        }
      },
      gt = function (t) {
        return mt(t.ekey) ? 0 : lt[t.ekey] ? 1 : 2;
      },
      yt = function (t) {
        var r = mt(t);
        if (!r) return 99;
        var e = (function (t) {
          try {
            var r = KIVO.BassamPerm;
            return (r && r.tplOfEmp && t && r.tplOfEmp(t)) || "";
          } catch (t) {
            return "";
          }
        })(t);
        if (e) for (var n = 0; n < ft.length; n++) if (ft[n].id === e) return n;
        return 98;
      },
      bt = function (t) {
        var r = yt(t);
        return 99 === r || 98 === r ? "" : (ft[r] || {}).name || "";
      };
    if ("none" === t.drFpm)
      st = st.filter(function (t) {
        return !mt(t.ekey);
      });
    else if (t.drFpm && "all" !== t.drFpm) {
      var kt = String(t.drFpm).slice(4),
        St = [];
      try {
        var xt = JSON.parse(localStorage.getItem("bassam_perm_tpls_v1"));
        Array.isArray(xt) && (St = xt);
      } catch (t) {}
      var vt = St.filter(function (t) {
          return t.id === kt;
        })[0],
        wt = vt ? vt.name : kt;
      st = st.filter(function (t) {
        try {
          var r = KIVO.BassamSup;
          if (r && r.tplOf) {
            var e = r.tplOf(t.ekey);
            if (e) return e.id === kt || e.name === wt;
          }
        } catch (t) {}
        return bt(t.ekey) === wt;
      });
    }
    var Ot = (E && E.leaders) || {},
      Tt = function (t) {
        return Ot.chief && t.ekey === Ot.chief ? 0 : Ot.deputy && t.ekey === Ot.deputy ? 1 : 9;
      };
    String(t.drQ || "").trim() ||
      st.sort(function (t, r) {
        var e = Tt(t),
          n = Tt(r);
        if (e !== n) return e - n;
        var a = ct(t),
          i = ct(r);
        if (a !== i) return a - i;
        var s = gt(t),
          o = gt(r);
        if (s !== o) return s - o;
        var d = yt(t.ekey),
          p = yt(r.ekey);
        if (d !== p) return d - p;
        var c = pt(t),
          l = pt(r);
        return c !== l
          ? c - l
          : 0 === c && dt[t.shift] !== dt[r.shift]
            ? dt[t.shift] - dt[r.shift]
            : 1 === c && t.shift !== r.shift
              ? t.shift.localeCompare(r.shift, "ar")
              : t.name.localeCompare(r.name, "ar");
      });
    var bsRd = r.bsOn("daily/rounds") && (r.bsLensOn("zones") || r.bsLensOn("gates") || r.bsLensOn("marks")),
      bsTp = r.bsOn("admin/ptpls"),
      Et = [
        { k: "onspot", t: bsRd ? "حاضرون على مواقعهم" : "حاضرون", c: "#059669", sub: bsRd ? "من جولة اليوم" : "" },
        { k: "reserve", t: "حاضرون بلا موقع — الاحتياط", c: "#0e7490", sub: "جاهزون للتسكين" },
        { k: "pm", t: "مستأذنون", c: "#C9702A", sub: "" },
        { k: "lv", t: "في إجازة", c: "#0e7490", sub: "" },
        { k: "ab", t: "غائبون", c: "#dc2626", sub: "" },
        { k: "rest", t: "في راحة اليوم", c: "#64748b", sub: "لا إجراء مطلوب" },
      ],
      Dt = r.drGrpPref(),
      Mt = !1 !== Dt.on && !String(t.drQ || "").trim(),
      Lt = r.drRoundRec(),
      At = r.drRoundSpots(Lt),
      Ct = {};
    (r.rpEmps() || []).forEach(function (t) {
      (KIVO.BassamEmp ? KIVO.BassamEmp.tokens(t) : [t.eid, t.nid, t.name]).forEach(function (r) {
        r && (Ct[r] = t);
      });
    });
    var Pt = {};
    if (
      (Et.forEach(function (t, r) {
        Pt[t.k] = r;
      }),
      st.forEach(function (t) {
        t.grp = (function (t) {
          return !t.onRest || (t.mark && "pr" !== t.mark)
            ? "ab" === t.mark
              ? "ab"
              : "pm" === t.mark
                ? "pm"
                : "lv" === t.mark
                  ? "lv"
                  : !bsRd ||
                      At.some(function (e) {
                        return !!r.drSpotKeys(e, Ct)[t.ekey];
                      })
                    ? "onspot"
                    : "reserve"
            : "rest";
        })(t);
      }),
      Mt)
    ) {
      var Bt = st.map(function (t, r) {
        return [t, r];
      });
      (Bt.sort(function (t, r) {
        return Pt[t[0].grp] - Pt[r[0].grp] || t[1] - r[1];
      }),
        (st = Bt.map(function (t) {
          return t[0];
        })));
    }
    var Rt = {};
    st.forEach(function (t) {
      Rt[t.grp] = (Rt[t.grp] || 0) + 1;
    });
    var _t = st.length,
      Ft = 0 === t.drPer ? 0 : t.drPer || 10,
      Yt = 0 === Ft ? Math.max(1, _t) : Ft,
      jt = Math.max(1, Math.ceil(_t / Yt)),
      zt = Math.min(Math.max(1, t.drPage || 1), jt),
      Nt = (zt - 1) * Yt,
      Kt = [];
    !(function () {
      var t = [],
        e = function (r) {
          -1 === t.indexOf(r) && t.push(r);
        };
      e(1);
      for (var n = zt - 1; n <= zt + 1; n++) n >= 1 && n <= jt && e(n);
      (e(jt),
        t.sort(function (t, r) {
          return t - r;
        }));
      for (var a = 0; a < t.length; a++) {
        a > 0 && t[a] - t[a - 1] > 1 && Kt.push({ dots: !0, label: "…" });
        var i = t[a];
        Kt.push({
          dots: !1,
          label: String(i),
          cur: i === zt,
          plain: i !== zt,
          style:
            "height:28px;min-width:28px;padding:0 4px;border:0;border-right:1px solid var(--bd-xe1e1e1);font-size:11px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';" +
            (i === zt ? "background:var(--bg-xb99751);color:var(--text-on-brand)" : "background:transparent;color:var(--fg-x475569)"),
          click: (function (t) {
            return function () {
              r.setState({ drPage: t });
            };
          })(i),
        });
      }
    })();
    var It = function (t) {
        return (
          "height:28px;width:28px;border:0;border-right:1px solid var(--bd-xe1e1e1);background:transparent;display:flex;align-items:center;justify-content:center;" +
          (t ? "color:var(--fg-x475569);cursor:pointer" : "color:var(--fg-xcbd5e1);cursor:default")
        );
      },
      Gt = "عرض فقط — يُعدَّل من «الجدول الشهري»",
      Wt = this.drShiftDefsFor(this.rpMonthBucket()).filter(function (t) {
        return t && t.name && t.name !== o;
      }),
      Ht = r.drRoundRec(),
      Vt = r.drRoundSpots(Ht),
      Jt = !(!Ht || !Ht.ap),
      Qt = {};
    (r.rpEmps() || []).forEach(function (t) {
      (KIVO.BassamEmp ? KIVO.BassamEmp.tokens(t) : [t.eid, t.nid, t.name]).forEach(function (r) {
        r && (Qt[r] = t);
      });
    });
    var Ut = {};
    Vt.forEach(function (t) {
      var e = r.drSpotKeys(t, Qt);
      Object.keys(e).forEach(function (r) {
        Ut[r] || (Ut[r] = t);
      });
    });
    var Xt = {};
    Vt.forEach(function (t) {
      if ("gates" === t.kk) {
        var e = String(null == t.num ? "" : t.num).trim();
        if (e) {
          var n = r.drSpotKeys(t, Qt);
          Object.keys(n).forEach(function (t) {
            (Xt[t] = Xt[t] || []).push(e);
          });
        }
      }
    });
    var $t = !!Ht && !Jt && L,
      Zt = !Ht,
      qt = {};
    B.forEach(function (t) {
      qt[t.ekey] = 1;
    });
    var tr = {};
    Vt.forEach(function (t) {
      var e = r.drSpotKeys(t, Qt),
        n = 0;
      (Object.keys(e).forEach(function (t) {
        qt[t] && n++;
      }),
        (tr[t.id] = n));
    });
    var rr = (function () {
        var r = { gates: {}, zones: {}, marks: {} };
        try {
          var e = ((JSON.parse(localStorage.getItem("bassam_plan_v1") || "{}") || {}).months || {})[t.rpY + "-" + t.rpM];
          ((e && (Array.isArray(e) ? e : e.d)) || []).forEach(function (t) {
            ((t.gates || []).forEach(function (t) {
              var e = String(null == t.num ? "" : t.num).trim();
              (t.pOf && (e = e + (e ? "-" : "") + String(t.leafNo || "")), (r.gates[e || "L:" + String(t.label || "")] = t));
            }),
              (t.zones || []).forEach(function (t) {
                var e = String(t.code || t.name || "");
                e && (r.zones[e] = t);
              }),
              (t.marks || []).forEach(function (t) {
                r.marks[String(t.label || "") + "|" + String(t.kind || "")] = t;
              }));
          });
        } catch (t) {}
        return r;
      })(),
      er = function (t) {
        var r = t;
        if (!((null != t.needN && "" !== t.needN) || (t.needS && "object" == typeof t.needS && Object.keys(t.needS).length > 0))) {
          var e =
            "gates" === t.kk
              ? t.num || "L:" + String(t.name || "")
              : "zones" === t.kk
                ? String(t.name || "")
                : String(t.name || "") + "|" + t.mKind;
          r = (rr[t.kk] || {})[e] || null;
        }
        if (!r) return 0;
        var n = parseInt(String(null == (r.needS || {})[o] ? "" : (r.needS || {})[o]), 10);
        if (isFinite(n) && n > 0) return n;
        var a = parseInt(String(null == r.needN ? "" : r.needN), 10);
        return isFinite(a) && a > 0 ? a : 0;
      },
      nr =
        ((function () {
          var t = [],
            r = [],
            e = [],
            n = [];
          (Vt.forEach(function (a) {
            var i = tr[a.id] || 0,
              s = (a.emp || []).length,
              d = er(a),
              p = d - i,
              c = ("gates" === a.kk && a.closed) || ("marks" === a.kk && a.off),
              l = {
                id: a.id,
                gap: p,
                dead: c,
                txt: a.name,
                sub: c ? ("gates" === a.kk ? "مغلق" : "معطّل") : d > 0 ? "مسكّن " + i + " من " + d : "مسكّن " + i,
                subStyle:
                  "flex-shrink:0;font-size:9.5px;font-weight:700;font-feature-settings:'tnum';color:" +
                  (c ? "var(--fg-xdc2626)" : d > 0 ? (p > 0 ? "var(--fg-xb45309)" : "var(--fg-x059669)") : "var(--fg-x94a3b8)"),
                deadMsg: c
                  ? "gates" === a.kk
                    ? "الباب مغلق — لا يُنقل إليه أحد. افتحه من «الجولات اليومية» أو اختر باباً مفتوحاً"
                    : "المعلم معطّل — فعّله من «الجولات اليومية» أو اختر موقعاً عاملاً"
                  : "",
                tipo: c
                  ? ("gates" === a.kk ? "الباب مغلق" : "المعلم معطّل") +
                    (a.cWhy ? " — السبب: " + a.cWhy : "") +
                    (a.cAt ? " · أُغلق الساعة " + a.cAt : "") +
                    " — لا يُنقل إليه أحد؛ " +
                    ("gates" === a.kk ? "يُفتح" : "يُفعَّل") +
                    " من «الجولات اليومية»"
                  : a.kind +
                    " " +
                    a.name +
                    (a.zsub ? " — " + a.zsub : "") +
                    " · " +
                    a.floor +
                    " — تسكين وردية «" +
                    o +
                    "» عليه الآن: " +
                    i +
                    (d > 0 ? " من احتياجها " + d + (p > 0 ? " (العجز " + p + ")" : " (مكتملة التغطية)") : " ولا احتياج محدّداً له") +
                    (s > i ? " · وعليه من كل الورديات: " + s : "") +
                    " — انقر لنقل الموظف إليه",
              };
            "gates" === a.kk ? (c ? n : t).push(l) : "zones" === a.kk ? r.push(l) : (c ? n : e).push(l);
          }),
            t.sort(function (t, r) {
              return r.gap - t.gap || t.txt.localeCompare(r.txt, "ar");
            }));
          var a = function (t) {
              return { hd: !0, txt: t };
            },
            i = [];
          (t.length && (i.push(a("الأبواب المفتوحة — الأشدّ عجزاً أولاً")), (i = i.concat(t))),
            r.length && (i.push(a("المناطق")), (i = i.concat(r))),
            e.length && (i.push(a("المعالم")), (i = i.concat(e))),
            n.length && (i.push(a("مغلقة ومعطّلة — للاطّلاع لا للنقل")), (i = i.concat(n))));
        })(),
        st.slice(Nt, Nt + Yt)),
      ar =
        (nr.length,
        (function () {
          try {
            var t = KIVO.BassamDayFocus ? KIVO.BassamDayFocus.get() : null,
              r = KIVO.BassamHijri.now(new Date());
            return !t || (+t.y === +r.y && +t.m === +r.m && +t.d === +r.d);
          } catch (t) {
            return !1;
          }
        })()),
      ir = nr.map(function (e, n) {
        var a = null;
        N.forEach(function (t) {
          t.name === e.shift && (a = t);
        });
        var i,
          s,
          d,
          p,
          c,
          l,
          f,
          h,
          u,
          m,
          g,
          y,
          b,
          k,
          S,
          x,
          v,
          w,
          O = "lv" === e.mark,
          T = e.lvk || "",
          E = e.perm || [],
          D = E.length >= at,
          M = L && r.bsOn("staff"),
          A = e.rest.map(function (t) {
            return {
              name: t,
              tip: M ? "اضغط للحذف — راحة هذا اليوم وحده" : Gt,
              remove: M
                ? ((n = e.ekey),
                  (a = t),
                  (i = e.rest),
                  function () {
                    r.drToggleRest(n, a, i);
                  })
                : function () {},
              style:
                "display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:6px;font-size:9px;font-weight:400;background:var(--bg-a245158110p1);color:var(--fg-xb45309);border:1px solid var(--bd-a245158110p25);transition:all .15s" +
                (M ? ";cursor:pointer" : ";opacity:.55"),
            };
            var n, a, i;
          }),
          C = M
            ? r.WEEKDAYS.map(function (t) {
                var n,
                  a,
                  i,
                  s = -1 !== e.rest.indexOf(t);
                return {
                  name: t.replace("ال", ""),
                  tip: s ? t + " — راحة، اضغط للحذف" : t + " — اضغط لجعله راحةً في هذا اليوم",
                  toggle:
                    ((n = e.ekey),
                    (a = t),
                    (i = e.rest),
                    function () {
                      r.drToggleRest(n, a, i);
                    }),
                  style:
                    "height:26px;padding:0 9px;border-radius:8px;font-size:10px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif;transition:all .15s;border:1px solid " +
                    (s
                      ? "rgba(245,158,11,0.4);background:var(--bg-a245158110p12);color:var(--fg-xb45309)"
                      : "#E1E1E1;background:var(--bg-xffffff);color:var(--fg-x53565a)"),
                };
              })
            : [],
          P = E.map(function (e) {
            return {
              txt: "⏱ " + String(e),
              tip: "استئذان يوم " + e + " " + r.MONTHS[t.rpM - 1] + " " + t.rpY + " هـ — " + Gt,
              remove: function () {},
              style:
                "display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:6px;font-size:9.5px;font-weight:600;font-feature-settings:'tnum';background:var(--bg-a185151810p12);color:var(--fg-x8a6f35);border:1px solid var(--bd-a185151810p35);transition:all .15s;opacity:.55",
            };
          });
        return {
          sn: String(Nt + n + 1),
          name: e.name,
          nid: e.nid,
          phone: e.phone,
          shift: e.shift,
          initial: (e.name || "—").trim().charAt(0),
          empnoDisp: e.empno && e.empno !== e.ekey && e.empno !== e.eid ? e.empno : "—",
          ...((S = e.ekey),
          (x = e.ekey),
          (v = (K[S] || {}).cs || ""),
          (w = t.drCsOpen === x),
          {
            csLabel: v || "بدون رمز",
            csHas: !!v,
            csNo: !v,
            csTipU: W
              ? (v || "بدون رمز") + " — " + (L ? "صلاحيتك لا تشمل تعديل التقرير" : "التقرير مقفل — لا تعديل بعد القفل")
              : v
                ? v + " — اضغط للتغيير · يُكتب في الجدول الشهري"
                : "بدون رمز نداء — اضغط للاختيار",
            csTxtStyle: KIVO.BassamPick.txt(!W, w),
            csPlusStyle: KIVO.BassamPick.plus(!W, w),
            csGo: W
              ? function () {
                  r.bsToast(L ? "صلاحيتك لا تشمل تعديل التقرير" : "التقرير مقفل — لا تعديل بعد القفل", "warn");
                }
              : function () {
                  r.setState({
                    drCsOpen: t.drCsOpen === x ? null : x,
                    drCsNew: "",
                    drCsEdit: null,
                    drLocOpen: null,
                    drLdOpen: null,
                    drShOpen: !1,
                  });
                },
            csLockedView: W,
            csCanEdit: !W,
            csReadStyle:
              "width:100%;height:32px;display:flex;align-items:center;justify-content:center;gap:6px;padding:0 2px;font-size:11px;font-weight:400;font-family:'Cairo',sans-serif;color:" +
              (v ? "var(--fg-x141414)" : "var(--fg-x94a3b8)") +
              ";box-sizing:border-box",
            csBtnStyle:
              "width:100%;height:34px;border:1px solid " +
              (w ? "var(--bd-xb99751)" : "var(--bd-xe1e1e1)") +
              ";border-radius:9px;padding:0 26px;font-size:11px;font-weight:400;font-family:'Cairo',sans-serif;background:var(--bg-xffffff);box-sizing:border-box;position:relative;display:flex;align-items:center;justify-content:center;gap:8px;text-align:center;color:" +
              (v ? "var(--fg-x141414)" : "var(--fg-x94a3b8)") +
              (w ? ";box-shadow:0 0 0 3px rgba(185,151,81,0.14)" : "") +
              ";cursor:pointer;transition:border-color .15s,box-shadow .15s",
            csChev:
              "position:absolute;left:9px;top:50%;margin-top:-6px;transition:transform .2s;flex-shrink:0;opacity:.5;" +
              (w ? "transform:rotate(180deg)" : ""),
            csShowList: !W && w,
            csToggle: W
              ? function () {}
              : function () {
                  r.setState({
                    drCsOpen: t.drCsOpen === x ? null : x,
                    drCsNew: "",
                    drCsEdit: null,
                    drLocOpen: null,
                    drLdOpen: null,
                    drShOpen: !1,
                  });
                },
            csClear: function () {
              r.drCsSet(S, "");
            },
            csClearStyle:
              "display:flex;align-items:center;gap:9px;height:32px;padding:0 9px;border-radius:8px;font-size:11px;cursor:pointer;transition:background .12s;" +
              (v ? "color:var(--fg-x53565a)" : "background:var(--bg-a2452452450p8);color:var(--fg-x334155);font-weight:400"),
            csNoneSel: !v,
            csEmpty: !G.length,
            csOpts: G.map(function (t) {
              return {
                name: t,
                selected: v === t,
                pick: function () {
                  r.drCsSet(S, t);
                },
                style:
                  "display:flex;align-items:center;gap:9px;height:32px;padding:0 9px;border-radius:8px;font-size:11px;cursor:pointer;transition:background .12s;" +
                  (v === t ? "background:var(--bg-a185151810p09);color:var(--fg-x9a7e40);font-weight:600" : "color:var(--fg-x141414)"),
              };
            }),
          }),
          ...((f = yt(e.ekey)),
          (h = (f >= 0 && f < ft.length && (ft[f] || {}).id) || ""),
          (u = bt(e.ekey)),
          (m = !!lt[e.ekey]),
          (g = (function () {
            try {
              return !!(
                (KIVO.BassamPerm && KIVO.BassamPerm.can && KIVO.BassamPerm.can("emps", "edit")) ||
                (KIVO.BassamAuth && KIVO.BassamAuth.isSuper && KIVO.BassamAuth.isSuper())
              );
            } catch (t) {
              return !1;
            }
          })()),
          (y = L && m && g),
          (b = y && t.drTpOpen === e.ekey),
          (k = L
            ? m
              ? g
                ? ""
                : "منح الصلاحيات يتطلب صلاحية تحرير صفحة الموظفين"
              : "لا حساب دخول لهذا الموظف — يُفعَّل من صفحة الموظفين ثم تُمنح صلاحيته"
            : "التقرير مقفل — لا تعديل بعد القفل"),
          {
            tpLabel: u || "بدون صلاحية",
            tpHas: !!u,
            tpNo: !u,
            tpTxtStyle: KIVO.BassamPick.txt(y, b),
            tpPlusStyle: KIVO.BassamPick.plus(y, b),
            tpCanEdit: y,
            tpLockedView: !y,
            tpTip: y
              ? (u ? "الصلاحية الممنوحة: " + u : "لا صلاحية ممنوحة") +
                " — اضغط للتغيير · المنح يسري فوراً على حساب الموظف في المنصة كلها ويبقى بعد هذا اليوم، والجدول الشهري يقرأ المصدر نفسه"
              : (u ? "الصلاحية الممنوحة: " + u + " — " : "") + k,
            tpRel: "position:relative;display:block;width:100%;max-width:150px;margin:0 auto;text-align:right" + (b ? ";z-index:46" : ""),
            tpReadStyle:
              "width:100%;height:30px;display:flex;align-items:center;justify-content:center;gap:6px;padding:0 9px;border-radius:9px;font-family:'Cairo',sans-serif;font-size:11px;font-weight:400;box-sizing:border-box;text-align:center;border:1px solid var(--bd-xeef0f2);background:var(--bg-xfafbfc);color:" +
              (u ? "var(--fg-x53565a)" : "var(--fg-xa8aeb6)") +
              ";cursor:not-allowed",
            tpBtnStyle:
              "width:100%;height:30px;display:flex;align-items:center;justify-content:center;gap:6px;padding:0 9px;border-radius:9px;font-family:'Cairo',sans-serif;font-size:11px;font-weight:400;box-sizing:border-box;transition:border-color .15s;text-align:center;cursor:pointer;background:var(--bg-xffffff);border:1px solid " +
              (b ? "var(--bd-xb99751)" : "var(--bd-xe1e1e1)") +
              ";color:" +
              (u ? "var(--fg-x141414)" : "var(--fg-x94a3b8)"),
            tpChev: "flex-shrink:0;opacity:.5;transition:transform .18s;transform:rotate(" + (b ? "180deg" : "0deg") + ")",
            tpToggle:
              ((p = e.ekey),
              (c = y),
              (l = k),
              function () {
                c
                  ? r.setState(function (t) {
                      return { drTpOpen: t.drTpOpen === p ? null : p, drLocOpen: null, drCsOpen: null, drLdOpen: null, drShOpen: !1 };
                    })
                  : r.bsToast(l || "غير متاح", "warn");
              }),
            tpOpen: b,
            tpEmpty: !ft.length,
            tpOpts: [{ id: "", txt: "بدون صلاحية", tick: !u }]
              .concat(
                ft.map(function (t) {
                  return { id: t.id, txt: t.name || "", tick: !!h && t.id === h };
                }),
              )
              .map(function (t) {
                return {
                  txt: t.txt,
                  tick: t.tick,
                  pick: (function (t, e) {
                    return function () {
                      r.drTpApply(e, t);
                    };
                  })(t.id, e.ekey),
                  style:
                    "display:flex;align-items:center;gap:8px;height:30px;padding:0 9px;border-radius:8px;font-size:11px;cursor:pointer;transition:background .12s;" +
                    (t.tick
                      ? "background:var(--bg-a185151810p1);color:var(--fg-x8a6f35);font-weight:600"
                      : "color:var(--fg-x141414);font-weight:400"),
                };
              }),
          }),
          avatarBg: O ? "rgba(14,116,144,0.5)" : e.onRest ? "rgba(185,151,81,0.45)" : "#b99751",
          dot: O ? "#22d3ee" : e.onRest ? "#fbbf24" : "#10b981",
          rowBg:
            (O ? "background:var(--bg-a2362542550p5)" : e.onRest ? "background:var(--bg-a2552512350p4)" : "") +
            (Mt && Dt.closed && Dt.closed[e.grp] ? ";display:none" : ""),
          ...(function () {
            var t = n > 0 ? nr[n - 1] : null;
            if (!Mt || (t && t.grp === e.grp)) return { grpHeadOn: !1 };
            var a = Et[Pt[e.grp]] || Et[1],
              i = !(!Dt.closed || !Dt.closed[e.grp]);
            return {
              grpHeadOn: !0,
              grpTitle: a.t,
              grpColor: a.c,
              grpSub: a.sub,
              grpN: String(Rt[e.grp] || 0),
              grpChev:
                "margin-right:auto;color:var(--fg-x94a3b8);font-size:11px;transition:transform .15s;display:inline-block;" +
                (i ? "transform:rotate(-90deg)" : ""),
              grpTip: i ? "فرد المجموعة" : "طيّ المجموعة",
              grpToggle: (function (t) {
                return function (e) {
                  try {
                    e.stopPropagation();
                  } catch (t) {}
                  r.drGrpToggle(t);
                };
              })(e.grp),
              grpCols: String(9 - (bsRd ? 0 : 1) - (bsTp ? 0 : 1)),
            };
          })(),
          phoneD: e.phone || "—",
          typeD: e.type || "—",
          genderD: e.gender || "—",
          mukOn9: !0 === e.muk,
          idLine:
            "الرقم الوظيفي: " +
            (e.empno || "—") +
            " · الجوال: " +
            (e.phone || "—") +
            " · نوع التوظيف: " +
            (e.type || "—") +
            " · الجنس: " +
            (e.gender || "—") +
            (!0 === e.muk ? " · مكلف" : "") +
            " — تُعدّل من صفحة بيانات الموظفين، والتكليف من الجدول الشهري",
          status:
            "ab" === e.mark
              ? "غائب"
              : "pm" === e.mark
                ? "مستأذن"
                : O
                  ? T || "إجازة"
                  : e.onRest
                    ? "راحة"
                    : KIVO.BassamDay && KIVO.BassamDay.availTxt
                      ? KIVO.BassamDay.availTxt(e.shift || e.sh, ar)
                      : "متاح",
          statusColor: "ab" === e.mark ? "#b91c1c" : "pm" === e.mark ? "#C9702A" : O ? "#0e7490" : e.onRest ? "#d97706" : "#059669",
          statusTip:
            ("ab" === e.mark
              ? "غياب مسجّل في تقرير اليوم"
              : "pm" === e.mark
                ? "استئذان " + ("in" === e.pmk ? "دخول — تأخّر عن بداية الوردية" : "خروج — انصراف قبل نهاية الوردية")
                : O
                  ? "إجازة مؤشَّرة في تقرير هذا اليوم" + (T ? " — نوعها: " + T : "") + " · تُلغى من قائمة التأشير"
                  : e.onRest
                    ? "في راحة اليوم"
                    : "متاح للعمل") + (E.length ? "  ·  استُهلك من نصاب استئذانات هذا الشهر: " + E.length + " من " + at : ""),
          onLeaveNow: !!O,
          sdLockedView: !0,
          sdCanEdit: !1,
          sdOpen: !1,
          sdLabel: e.shift || "بدون تسكين",
          sdDot: a ? a.color : "#cbd5e1",
          sdReadStyle:
            "width:100%;height:32px;display:flex;align-items:center;gap:6px;padding:0 2px;font-size:11px;font-weight:400;font-family:'Cairo',sans-serif;color:" +
            (e.shift ? "var(--fg-x141414)" : "var(--fg-x94a3b8)") +
            ";box-sizing:border-box",
          timeNoShift: !e.shift,
          timeSet: !!e.shift && !!(a && a.tStart && a.tEnd),
          timeEmpty: !(!e.shift || (a && a.tStart && a.tEnd)),
          timeLabel: a && a.tStart && a.tEnd ? r.fmtClock(a.tStart) + " – " + r.fmtClock(a.tEnd) : "",
          timeDurLabel: a && a.tStart && a.tEnd ? r.fmtDur(r.shiftDurMins(a.tStart, a.tEnd)) : "",
          ...(function () {
            var n = Vt.filter(function (t) {
                return !!r.drSpotKeys(t, Qt)[e.ekey];
              }),
              a =
                (n[0],
                function (t) {
                  return ("gates" === t.kk && t.closed) || ("marks" === t.kk && t.off);
                }),
              i = n.some(a),
              s = { gates: "#8A6F35", zones: "#0e7490", marks: "#7e2a52" },
              o = { gates: "باب", zones: "مصلى", marks: "معلم" },
              d = function (t) {
                return "gates" === t.kk ? (t.num ? String(t.num) : "باب") : t.name;
              },
              p = "ab" === e.mark || "pm" === e.mark || "lv" === e.mark || !!e.onRest,
              c = "ab" === e.mark ? "غائب" : "pm" === e.mark ? "مستأذن" : "lv" === e.mark ? "إجازة" : e.onRest ? "في راحة" : "",
              l = $t && t.drLocOpen === e.ekey,
              f = n.map(function (t) {
                var r = a(t);
                return {
                  code: d(t),
                  tip:
                    o[t.kk] +
                    " " +
                    t.name +
                    " · " +
                    t.floor +
                    (r ? ("gates" === t.kk ? " — مغلق" : " — معطّل") + (t.cWhy ? ": " + t.cWhy : "") : "") +
                    ($t ? " — انقر لتغيير التسكين" : ""),
                  style: KIVO.BassamPick.txt($t, l) + ";flex-shrink:0;font-feature-settings:'tnum'",
                };
              }),
              h = { red: "#dc2626", amb: "#d97706", grn: "#059669", blu: "#3e8ac4", tea: "#2f8f86", non: "#94a3b8", cls: "#64748b" },
              u = { أ: 3, ب: 2, ج: 1 },
              m = String(t.drLocQ || "").trim(),
              g = function (t) {
                try {
                  var r = KIVO.BassamPerm;
                  return !r || !r.lensOn || !!r.lensOn(t);
                } catch (t) {
                  return !0;
                }
              },
              y = [
                ["gates", "أبواب"],
                ["marks", "معالم"],
                ["zones", "مصليات"],
              ].filter(function (t) {
                return g(t[0]);
              }),
              b = t.drLocKind || "all";
            "all" === b || g(b) || (b = "all");
            var k = {};
            n.forEach(function (t) {
              k[t.id] = 1;
            });
            var S = Vt.filter(function (t) {
                return g(t.kk) && ("all" === b || t.kk === b);
              })
                .filter(function (t) {
                  return (
                    !m ||
                    KIVO.BassamFind.filter(m, [t], function (t) {
                      return [t.name, t.num, t.floor, t.zsub, t.mKind];
                    }).length > 0
                  );
                })
                .map(function (t) {
                  var r = (function (t) {
                      var r = tr[t.id] || 0,
                        e = er(t);
                      return a(t)
                        ? { st: "cls", plc: r, nd: e }
                        : {
                            st: e > 0 ? (0 === r ? "red" : r < e ? "amb" : r === e ? "grn" : "blu") : r > 0 ? "tea" : "non",
                            plc: r,
                            nd: e,
                          };
                    })(t),
                    e = !!k[t.id];
                  return {
                    id: t.id,
                    sp: t,
                    st: r.st,
                    plc: r.plc,
                    nd: r.nd,
                    on: e,
                    dead: "cls" === r.st,
                    txt:
                      d(t) +
                      ("gates" === t.kk && t.name.indexOf(" — ") > 0 && !/ — باب$/.test(t.name) ? t.name.slice(t.name.indexOf(" — ")) : ""),
                    sub:
                      [o[t.kk], t.zsub || t.mKind || "", t.floor].filter(Boolean).join(" · ") +
                      ("cls" === r.st ? " · " + ("gates" === t.kk ? "مغلق" : "معطّل") + (t.cWhy ? " — " + t.cWhy : "") : ""),
                    num: "cls" === r.st ? "✕" : r.nd > 0 ? r.plc + "/" + r.nd : "+" + r.plc,
                    color: h[r.st],
                    kc: s[t.kk],
                    pri: t.pri || "",
                  };
                }),
              x = { here: [], red: [], amb: [], grn: [], blu: [], non: [], cls: [] };
            S.forEach(function (t) {
              t.on ? x.here.push(t) : "tea" === t.st ? x.non.push(t) : x[t.st].push(t);
            });
            var v = function (t) {
              return u[t.pri] || 0;
            };
            (x.red.sort(function (t, r) {
              return v(r) - v(t) || r.nd - r.plc - (t.nd - t.plc);
            }),
              x.amb.sort(function (t, r) {
                return v(r) - v(t) || r.nd - r.plc - (t.nd - t.plc);
              }));
            var w = function (r, e) {
                if (m) return !0;
                var n = t.drLocGrp || {};
                return void 0 === n[r] ? e : !!n[r];
              },
              O = function (t) {
                return (
                  "display:flex;align-items:center;gap:7px;height:32px;padding:0 8px;border-radius:8px;font-size:11px;transition:background .12s;" +
                  (t.dead ? "cursor:not-allowed;opacity:.6;" : "cursor:pointer;") +
                  (t.on ? "background:var(--bg-a185151810p1);" : "")
                );
              },
              T = [
                ["here", "مسكَّن هنا", !0, !0],
                ["red", "عجز كامل — الأشد أولاً", !0, !0],
                ["amb", "عجز جزئي", !0, !0],
                ["grn", "مكتمل", !0, !1],
                ["blu", "فائض", !0, !1],
                ["non", "بلا احتياج محدد", !0, !1],
                ["cls", "مغلقة ومعطّلة — للاطّلاع", !1, !1],
              ]
                .map(function (t) {
                  var n = x[t[0]] || [],
                    a = w(t[0], t[3]);
                  return {
                    key: t[0],
                    title: t[1],
                    n: String(n.length),
                    act: t[2],
                    view: !t[2],
                    open: a,
                    has: n.length > 0,
                    tog: (function (e) {
                      return function (n) {
                        (n && n.stopPropagation && n.stopPropagation(),
                          r.setState(function (r) {
                            var n = Object.assign({}, r.drLocGrp || {});
                            return ((n[e] = !w(e, t[3])), { drLocGrp: n });
                          }));
                      };
                    })(t[0]),
                    chev: "transition:transform .2s;flex-shrink:0;" + (a ? "transform:rotate(180deg)" : ""),
                    hdStyle:
                      "width:100%;display:flex;align-items:center;justify-content:space-between;gap:6px;height:26px;padding:0 6px;border:0;background:transparent;cursor:pointer;font-family:'Cairo',sans-serif;font-size:10px;font-weight:700;color:" +
                      (t[2] ? "var(--fg-x475569)" : "var(--fg-x8a6f35)"),
                    rows: n.slice(0, 300).map(function (t) {
                      return {
                        txt: t.txt,
                        sub: t.sub,
                        num: t.num,
                        on: t.on,
                        dead: t.dead,
                        style: O(t),
                        numStyle:
                          "flex-shrink:0;min-width:34px;text-align:center;font-size:11px;font-weight:700;font-feature-settings:'tnum';color:" +
                          t.color,
                        dot: "width:9px;height:9px;border-radius:3px;flex-shrink:0;background:" + t.color,
                        kcStyle:
                          "flex-shrink:0;font-size:8px;font-weight:700;padding:1px 5px;border-radius:6px;border:1px solid " +
                          t.kc +
                          "40;color:" +
                          t.kc,
                        kw: o[t.sp.kk],
                        tipo: t.dead
                          ? ("gates" === t.sp.kk ? "الباب مغلق" : "المعلم معطّل") + " — لا يُنقل إليه أحد"
                          : t.on
                            ? "مسكَّن هنا — انقر لرفعه"
                            : "انقر لتسكينه هنا" + (t.nd > 0 ? " — الاحتياج " + t.nd + " والمسكَّن " + t.plc : ""),
                        pick: (function (t, n) {
                          return function (a) {
                            (a && a.stopPropagation && a.stopPropagation(),
                              n.dead
                                ? r.bsToast(
                                    "gates" === n.sp.kk
                                      ? "الباب مغلق — لا يُنقل إليه أحد. افتحه من «الجولات اليومية» أو اختر باباً مفتوحاً"
                                      : "المعلم معطّل — فعّله من «الجولات اليومية» أو اختر موقعاً عاملاً",
                                    "warn",
                                  )
                                : r.drToggleSpot(t, n.id, e.name));
                          };
                        })(e.ekey, t),
                      };
                    }),
                  };
                })
                .filter(function (t) {
                  return t.has;
                }),
              E = c || "حاضر";
            return {
              locChips: f,
              locChipsOn: f.length > 0,
              locPlusOn: 0 === f.length,
              locNoteOn: !1,
              locNote: "",
              locWarn: i && !Zt,
              locTip: Zt
                ? "لا توجد جولة لهذا اليوم — ابدأها من «الجولات اليومية» ليظهر تسكين الموظفين هنا"
                : Jt
                  ? "جولة اليوم معتمدة ومقفلة — افتحها لتغيير التسكين"
                  : f.length
                    ? "مواقعه في جولة اليوم — انقر شريحة لتغيير التسكين"
                    : p
                      ? "ليس على رأس العمل اليوم (" + c + ") — لا يُسكَّن من التقرير"
                      : "بلا تسكين في جولة اليوم — انقر ＋ لاختيار موقعه",
              locPlusStyle: KIVO.BassamPick.plus($t && !p && !Zt, l),
              locOpen: l,
              locRel:
                "position:relative;display:block;width:100%;max-width:170px;margin:0 auto;text-align:center" + (l ? ";z-index:44" : ""),
              locToggle: (function (t) {
                return function (e) {
                  (e && e.stopPropagation && e.stopPropagation(),
                    Zt
                      ? r.bsToast("لا توجد جولة لهذا اليوم — ابدأها من «الجولات اليومية» أولاً", "warn")
                      : !p || f.length
                        ? Jt
                          ? r.bsToast("جولة اليوم معتمدة ومقفلة — افتحها أولاً لتغيير التسكين", "warn")
                          : L
                            ? r.setState(function (r) {
                                return { drLocOpen: r.drLocOpen === t ? null : t, drLocQ: "" };
                              })
                            : r.bsToast("التقرير مقفل — لا تعديل بعد القفل", "warn")
                        : r.bsToast("ليس على رأس العمل اليوم (" + c + ") — لا يُسكَّن من التقرير", "warn"));
                };
              })(e.ekey),
              locClose: function (t) {
                (t && t.stopPropagation && t.stopPropagation(), r.setState({ drLocOpen: null }));
              },
              locHdName: e.name,
              locHdSub: [e.shift || "بلا وردية", E].filter(Boolean).join(" · "),
              locHdStStyle:
                "font-size:9px;font-weight:700;padding:1px 7px;border-radius:9999px;border:1px solid;" +
                (p
                  ? "color:var(--fg-xb91c1c);border-color:var(--bd-a22038380p35);background:var(--bg-xfef2f2)"
                  : "color:var(--fg-x047857);border-color:var(--bd-a51501050p35);background:var(--bg-a51501050p08)"),
              locHdSt: E,
              locQ: t.drLocQ || "",
              onLocQ: function (t) {
                r.setState({ drLocQ: t.target.value });
              },
              locKinds: (y.length > 1 ? [["all", "الكل"]].concat(y) : []).map(function (t) {
                return {
                  txt: t[1],
                  on: b === t[0],
                  style:
                    "height:22px;padding:0 8px;border-radius:9999px;border:1px solid " +
                    (b === t[0]
                      ? "#b99751;background:var(--bg-xb99751);color:var(--text-on-brand)"
                      : "#E1E1E1;background:var(--bg-xffffff);color:var(--fg-x475569)") +
                    ";font-family:'Cairo',sans-serif;font-size:9.5px;font-weight:600;cursor:pointer",
                  pick:
                    ((e = t[0]),
                    function (t) {
                      (t && t.stopPropagation && t.stopPropagation(), r.setState({ drLocKind: e }));
                    }),
                };
                var e;
              }),
              locClearOn: n.length > 0,
              locClear: (function (t) {
                return function (n) {
                  (n && n.stopPropagation && n.stopPropagation(), r.drSetSpot(t, "", e.name));
                };
              })(e.ekey),
              locGroups: T,
              locEmpty: 0 === T.length,
              locKeep: function (t) {
                t && t.stopPropagation && t.stopPropagation();
              },
              locOpts: [],
            };
          })(),
          restChips: A,
          restCanEdit: M && e.rest.length < 2,
          restOpen: t.drRestOpen === e.ekey,
          restToggle:
            ((d = e.ekey),
            function () {
              r.setState(function (t) {
                return { drRestOpen: t.drRestOpen === d ? null : d };
              });
            }),
          restBtnStyle:
            "width:20px;height:20px;border-radius:6px;border:1px dashed " +
            (t.drRestOpen === e.ekey ? "#b99751;color:var(--fg-xb99751)" : "#cbd5e1;color:var(--fg-x94a3b8)") +
            ";background:transparent;font-size:11px;line-height:1;display:inline-flex;align-items:center;justify-content:center;cursor:pointer",
          weekDays: C,
          permChips: P,
          permCanEdit: !1,
          permOpen: !1,
          permDayBtns: [],
          permCount: String(E.length),
          permLimitTxt: String(at),
          permQuotaTxt: D ? "اكتمل النصاب" : String(E.length) + " / " + String(at),
          permQuotaTip: D
            ? "اكتمل نصاب الشهر — " + KIVO.BassamCount(String(at), "استئذان") + ""
            : "المسجّل " + String(E.length) + " من نصاب " + String(at),
          permQuotaStyle:
            "display:inline-flex;align-items:center;gap:3px;padding:1px 7px;border-radius:9999px;font-size:9px;font-weight:700;font-feature-settings:'tnum';white-space:nowrap;border:1px solid " +
            (D
              ? "rgba(100,116,139,0.3);background:var(--bg-a1001161390p08);color:var(--fg-x64748b)"
              : "rgba(185,151,81,0.45);background:var(--bg-xffffff);color:var(--fg-x8a6f35)") +
            ";opacity:.55",
          mukTip: Gt,
          mukToggle: function () {},
          mukStyle:
            "position:relative;width:40px;height:22px;border-radius:9999px;border:1px solid " +
            (e.muk
              ? "rgba(185,151,81,0.6);background:linear-gradient(135deg,var(--bg-xe6d29d),var(--bg-xb99751))"
              : "#d7dce2;background:var(--bg-xeef1f4)") +
            ";padding:0;transition:all .25s;display:inline-block;vertical-align:middle;cursor:not-allowed;opacity:.55" +
            (e.muk ? ";box-shadow:0 1px 6px -1px rgba(154,126,64,0.5)" : ""),
          mukKnob:
            "position:absolute;top:2px;width:16px;height:16px;border-radius:9999px;background:var(--bg-xffffff);box-shadow:0 1px 3px rgba(0,0,0,0.25);transition:all .25s;" +
            (e.muk ? "right:20px" : "right:2px"),
          mkOpen: t.drMkOpen === e.ekey,
          mkToggle:
            ((s = e.ekey),
            function () {
              r.setState({ drMkOpen: r.state.drMkOpen === s ? null : s, drMkLv: null, drMkTr: null, drMkPm: null, drLvNew: "" });
            }),
          mkShow: !e.onRest,
          mkRestOn: !!e.onRest,
          mkBtnStyle:
            "width:20px;height:20px;border-radius:6px;border:1px dashed " +
            (t.drMkOpen === e.ekey ? "#b99751;color:var(--fg-xb99751)" : "#cbd5e1;color:var(--fg-x94a3b8)") +
            ";background:transparent;font-size:11px;line-height:1;display:inline-flex;align-items:center;justify-content:center;cursor:pointer",
          mkDayLbl: "تأشير " + t.rpD + " " + (r.MONTHS[t.rpM - 1] || ""),
          mkPickAb: (function (t, e) {
            return function () {
              r.rpMark(t, e ? "pr" : "ab");
            };
          })(e.ekey, "ab" === e.mark),
          mkPickPm: (function (t, e, n) {
            return function () {
              e ? r.rpMark(t, "pr") : n || r.setState({ drMkPm: r.state.drMkPm === t ? null : t, drMkTr: null, drMkLv: null });
            };
          })(e.ekey, "pm" === e.mark, ((i = e.perm || []), "pm" !== e.mark && -1 === i.indexOf(t.rpD) && i.length >= at)),
          mkPmOpen: t.drMkPm === e.ekey && "pm" !== e.mark,
          mkPmIn: (function (t) {
            return function () {
              r.rpMark(t, "pm", "", "in");
            };
          })(e.ekey),
          mkPmOut: (function (t) {
            return function () {
              r.rpMark(t, "pm", "", "out");
            };
          })(e.ekey),
          mkPmInStyle:
            "height:26px;border-radius:7px;font-size:10.5px;font-weight:700;cursor:pointer;font-family:'Cairo',sans-serif;transition:all .15s;border:1px solid " +
            ("in" === e.pmk
              ? "#8A6F35;background:var(--bg-x8a6f35);color:var(--fg-xffffff)"
              : "rgba(185,151,81,0.55);background:var(--bg-a185151810p1);color:var(--fg-x8a6f35)"),
          mkPmOutStyle:
            "height:26px;border-radius:7px;font-size:10.5px;font-weight:700;cursor:pointer;font-family:'Cairo',sans-serif;transition:all .15s;border:1px solid " +
            ("out" === e.pmk
              ? "#8A6F35;background:var(--bg-x8a6f35);color:var(--fg-xffffff)"
              : "rgba(185,151,81,0.55);background:var(--bg-a185151810p1);color:var(--fg-x8a6f35)"),
          mkPickLv: (function (t, e) {
            return function () {
              e
                ? r.rpMark(t, "pr")
                : (r.setState({ drMkLv: r.state.drMkLv === t ? null : t, drMkTr: null, drMkPm: null, drLvNew: "" }), r.drPopReflow());
            };
          })(e.ekey, "lv" === e.mark),
          mkLvOpen: t.drMkOpen === e.ekey && t.drMkLv === e.ekey && "lv" !== e.mark,
          mkLvTip:
            "lv" === e.mark
              ? "إجازة" + (T ? " (" + T + ")" : "") + " مؤشَّرة لهذا اليوم — اضغط لإلغائها وإعادته حاضراً"
              : "تأشير إجازة ليوم هذا التقرير — يفتح قائمة الأنواع",
          mkLvStyle:
            "height:26px;border-radius:7px;font-size:10.5px;font-weight:700;cursor:pointer;font-family:'Cairo',sans-serif;transition:all .15s;border:1px solid " +
            ("lv" === e.mark
              ? "#0e7490;background:var(--bg-x0e7490);color:var(--fg-xffffff)"
              : t.drMkOpen === e.ekey && t.drMkLv === e.ekey
                ? "#0e7490;background:var(--bg-a141161440p1);color:var(--fg-x0e7490)"
                : "rgba(14,116,144,0.4);background:var(--bg-a141161440p05);color:var(--fg-x0e7490)"),
          mkLvKinds: r.drLeaveKinds().map(function (t) {
            return {
              name: t,
              tick: "lv" === e.mark && e.lvk === t,
              tip: "تأشير إجازة (" + t + ") ليوم هذا التقرير",
              pick: (function (t, e) {
                return function () {
                  r.rpMark(t, "lv", e);
                };
              })(e.ekey, t),
              style:
                "flex:1;min-width:0;display:flex;align-items:center;gap:6px;height:26px;border-radius:7px;padding:0 8px;font-size:10.5px;font-weight:600;cursor:pointer;font-family:'Cairo',sans-serif;transition:all .15s;text-align:right;border:1px solid " +
                ("lv" === e.mark && e.lvk === t
                  ? "#0e7490;background:var(--bg-a141161440p08);color:var(--fg-x0e7490)"
                  : "#E1E1E1;background:var(--bg-xffffff);color:var(--fg-x53565a)"),
              del:
                ((n = t),
                function (t) {
                  (t && t.stopPropagation && t.stopPropagation(),
                    r.drDelLeaveKind(n),
                    r.setState({ rpTick: (r.state.rpTick || 0) + 1 }),
                    r.drPopReflow());
                }),
              delStyle:
                "width:22px;height:26px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:7px;border:1px solid var(--bd-a22038380p25);background:var(--bg-xffffff);color:var(--fg-xdc2626);cursor:pointer",
            };
            var n;
          }),
          mkLvAddKind: function () {
            var t = (r.state.drLvNew || "").trim();
            t
              ? (r.drAddLeaveKind(t), r.setState({ drLvNew: "", rpTick: (r.state.rpTick || 0) + 1 }), r.drPopReflow())
              : r.bsToast("اكتب اسم النوع أولاً", "warn");
          },
          mkPmShow: (function () {
            var r = e.perm || [];
            return !("pm" !== e.mark && -1 === r.indexOf(t.rpD) && r.length >= at);
          })(),
          trOn: !!e.tin,
          trFrom: e.tfrom || "",
          trTip: e.treason ? "سبب التحويل: " + e.treason : "حُوِّل إلى هذه الوردية في تقرير اليوم",
          mkPickTr: (function (t) {
            return function () {
              (r.setState({ drMkTr: r.state.drMkTr === t ? null : t, drMkLv: null, drTrSel: "", drTrWhy: "" }), r.drPopReflow());
            };
          })(e.ekey),
          mkTrOpen: t.drMkOpen === e.ekey && t.drMkTr === e.ekey,
          mkTrTip: "تحويل الموظف إلى وردية أخرى في تقرير اليوم",
          mkTrStyle:
            "height:26px;border-radius:7px;font-size:10.5px;font-weight:700;cursor:pointer;font-family:'Cairo',sans-serif;transition:all .15s;border:1px solid " +
            (t.drMkOpen === e.ekey && t.drMkTr === e.ekey
              ? "#4f46e5;background:var(--bg-x4f46e5);color:var(--fg-xffffff)"
              : "rgba(79,70,229,0.4);background:var(--bg-a79702290p06);color:var(--fg-x4f46e5)"),
          mkTrShifts: Wt.map(function (e) {
            return {
              name: e.name,
              color: e.color || "#b99751",
              pick: function () {
                r.setState({ drTrSel: e.name });
              },
              style:
                "display:flex;align-items:center;gap:7px;height:26px;border-radius:7px;padding:0 8px;font-size:10.5px;font-weight:600;cursor:pointer;font-family:'Cairo',sans-serif;transition:all .15s;border:1px solid " +
                (t.drTrSel === e.name
                  ? "#4f46e5;background:var(--bg-a79702290p08);color:var(--fg-x4f46e5)"
                  : "#E1E1E1;background:var(--bg-xffffff);color:var(--fg-x53565a)"),
            };
          }),
          mkTrGo: (function (t, e, n) {
            return function () {
              if (r.state.drTrSel) {
                var a = (r.state.drTrWhy || "").trim();
                a
                  ? r.setState({ drTrConfirm: { ekey: t, name: e, empno: n, from: o, to: r.state.drTrSel, why: a } })
                  : r.bsToast("اكتب سبب التحويل أولاً — حقل مطلوب", "warn");
              } else r.bsToast("اختر الوردية المحوَّل إليها أولاً", "warn");
            };
          })(e.ekey, e.name, e.empno),
          mkTrGoStyle:
            "height:27px;border-radius:8px;font-size:11px;font-weight:700;font-family:'Cairo',sans-serif;border:0;color:var(--fg-xffffff);transition:background .15s;" +
            (t.drTrSel && (t.drTrWhy || "").trim()
              ? "cursor:pointer;background:linear-gradient(135deg,var(--bg-x4f46e5),var(--bg-x6366f1))"
              : "cursor:default;background:var(--bg-xcbd5e1)"),
          mkAbTip: "ab" === e.mark ? "غيابٌ مؤشَّر — اضغط لإلغائه وإعادته حاضراً" : "تسجيل غياب اليوم",
          mkAbStyle:
            "height:26px;border-radius:7px;font-size:10.5px;font-weight:700;cursor:pointer;font-family:'Cairo',sans-serif;transition:all .15s;border:1px solid " +
            ("ab" === e.mark
              ? "#b91c1c;background:var(--bg-xb91c1c);color:var(--fg-xffffff)"
              : "rgba(220,38,38,0.35);background:var(--bg-a22038380p06);color:var(--fg-xb91c1c)"),
          mkPmStyle: (function () {
            var r = e.perm || [],
              n = "pm" !== e.mark && -1 === r.indexOf(t.rpD) && r.length >= at;
            return (
              "height:26px;border-radius:7px;font-size:10.5px;font-weight:700;font-family:'Cairo',sans-serif;transition:all .15s;border:1px solid " +
              ("pm" === e.mark
                ? "#8A6F35;background:var(--bg-x8a6f35);color:var(--fg-xffffff);cursor:pointer"
                : n
                  ? "#E1E1E1;background:var(--bg-xffffff);color:var(--fg-xcbd5e1);cursor:not-allowed;opacity:.5"
                  : "rgba(185,151,81,0.55);background:var(--bg-a185151810p1);color:var(--fg-x8a6f35);cursor:pointer")
            );
          })(),
          mkPmTip: (function () {
            var r = e.perm || [];
            return "pm" === e.mark
              ? "استئذان " + ("in" === e.pmk ? "دخول" : "خروج") + " مؤشَّر — اضغط لإلغائه وإعادته حاضراً"
              : -1 === r.indexOf(t.rpD) && r.length >= at
                ? "اكتمل نصاب الشهر — احذف يوماً أولاً"
                : "تسجيل استئذان اليوم — ينعكس في الجدول الشهري";
          })(),
          mukOn: !0 === e.muk,
          mkNoop: 0,
        };
      }),
      sr = o ? this.drRosterOf(o) : [],
      or = E && E.leaders ? E.leaders : { chief: "", deputy: "" },
      dr = (function () {
        try {
          var t = JSON.parse(localStorage.getItem("bassam_perm_tpls_v1"));
          return Array.isArray(t) ? (KIVO.BassamPerm && KIVO.BassamPerm.tplsMigrate ? KIVO.BassamPerm.tplsMigrate(t) : t) : [];
        } catch (t) {
          return [];
        }
      })(),
      pr = function (t) {
        return Object.keys(t || {})
          .filter(function (r) {
            return (t[r] || []).length;
          })
          .sort()
          .map(function (r) {
            return r + ":" + (t[r] || []).slice().sort().join(",");
          })
          .join("|");
      },
      cr =
        ((function () {
          try {
            var t = KIVO.BassamPerm;
            return (t && t.deptCap()) || [];
          } catch (t) {
            return [];
          }
        })(),
        dr.map(function (t) {
          var r = KIVO.BassamPerm;
          return r && r.tplSig ? r.tplSig(t.perms) : pr(t.perms || {});
        })),
      lr = function (t) {
        var r = (function (t) {
          try {
            var r = KIVO.BassamPerm;
            return r && r.empPerms && t ? pr(r.empPerms(t) || {}) : "";
          } catch (t) {
            return "";
          }
        })(t);
        if (!r) return -1;
        var e = "";
        try {
          var n = KIVO.BassamPerm;
          e = (n && n.tplOfEmp && t && n.tplOfEmp(t)) || "";
        } catch (t) {}
        if (e) for (var a = 0; a < dr.length; a++) if (dr[a].id === e) return a;
        return -1;
      },
      fr = {};
    B.forEach(function (t) {
      "lv" === t.st && (fr[t.ekey] = 1);
    });
    var hr,
      ur,
      mr,
      gr,
      yr,
      br,
      kr,
      Sr,
      xr = function (t) {
        if (!t) return "—";
        var r = null;
        return (
          sr.forEach(function (e) {
            e.ekey === t && (r = e);
          }),
          r ? r.name : "—"
        );
      },
      vr = [
        ["رئيسـ / ـة الوردية", "chief"],
        ["نائبـ / ـة رئيس الوردية", "deputy"],
      ].map(function (e, n) {
        var a,
          i,
          s,
          o,
          d,
          p,
          c,
          l,
          f,
          h,
          u,
          m = or[e[1]] || "",
          g = t.drLdOpen === e[1],
          y = t.drLdAlt === e[1],
          b = y
            ? (function (t) {
                var e = [{ v: "", t: "— اختر —", sel: !t }],
                  n = {};
                ["chief", "deputy"].forEach(function (t) {
                  var r = or[t] || "";
                  r && (n[r] = 1);
                });
                var a = new Intl.Collator("ar", { sensitivity: "base", numeric: !0 }),
                  i = [];
                return (
                  sr.forEach(function (t) {
                    if (!n[t.ekey] && !fr[t.ekey]) {
                      var e = K[t.ekey] || {};
                      if (!Q(r.drRestOf(E, t.ekey, Array.isArray(e.rest) ? e.rest : []))) {
                        var a = lr(t.ekey);
                        i.push({ e: t, r: 0 === a || 1 === a || 2 === a ? a : 9 });
                      }
                    }
                  }),
                  i.sort(function (t, r) {
                    return t.r - r.r || a.compare(t.e.name || "", r.e.name || "");
                  }),
                  i.forEach(function (r) {
                    e.push({ v: r.e.ekey, t: r.e.name, sel: t === r.e.ekey, sub: r.r <= 2 && dr[r.r] && dr[r.r].name ? dr[r.r].name : "" });
                  }),
                  1 === e.length && e.push({ v: "", t: "— لا بديل متاحاً اليوم في الوردية —", sel: !1 }),
                  e
                );
              })(m)
            : ((i = n),
              (s = [{ v: "", t: "— اختر —", sel: !(a = m) }]),
              (o = sr.filter(function (t) {
                return lr(t.ekey) === i;
              })),
              a &&
                !o.some(function (t) {
                  return t.ekey === a;
                }) &&
                (o = sr
                  .filter(function (t) {
                    return t.ekey === a;
                  })
                  .concat(o)),
              o.forEach(function (t) {
                s.push({ v: t.ekey, t: t.name, sel: a === t.ekey });
              }),
              1 === s.length && s.push({ v: "", t: "— لا أحد بهذه الصلاحية في الوردية —", sel: !1 }),
              s),
          k =
            ((d = e[1]),
            (p = "L:" + d),
            (c = t.drCsOpen === p),
            (l = (E && E.leaders && E.leaders[d]) || ""),
            {
              csLabel: (f = void 0 !== H[d] ? H[d] || "" : (l && (K[l] || {}).cs) || "") || "بدون رمز",
              csHas: !!f,
              csNo: !f,
              csTipU: W
                ? (f || "بدون رمز") + " — " + (L ? "صلاحيتك لا تشمل تعديل التقرير" : "التقرير مقفل — لا تعديل بعد القفل")
                : f
                  ? f + " — اضغط للتغيير · يُكتب في الجدول الشهري"
                  : "بدون رمز نداء — اضغط للاختيار",
              csTxtStyle: KIVO.BassamPick.txt(!W, c),
              csPlusStyle: KIVO.BassamPick.plus(!W, c),
              csGo: W
                ? function () {
                    r.bsToast(L ? "صلاحيتك لا تشمل تعديل التقرير" : "التقرير مقفل — لا تعديل بعد القفل", "warn");
                  }
                : function () {
                    r.setState({
                      drCsOpen: t.drCsOpen === p ? null : p,
                      drCsNew: "",
                      drCsEdit: null,
                      drLocOpen: null,
                      drLdOpen: null,
                      drShOpen: !1,
                    });
                  },
              csLockedView: W,
              csCanEdit: !W,
              csReadStyle:
                "flex-shrink:0;min-width:86px;max-width:110px;height:39px;border-left:1px solid var(--bd-xededed);background:var(--bg-a2452452450p55);padding:0 9px;font-size:10.5px;font-weight:600;font-family:'Cairo',sans-serif;display:flex;align-items:center;justify-content:center;box-sizing:border-box;color:" +
                (f ? "var(--fg-x8a6f35)" : "var(--fg-xa8aeb6)"),
              csBtnStyle:
                "flex-shrink:0;min-width:86px;max-width:110px;height:39px;border:0;border-left:1px solid " +
                (c ? "var(--bd-xbb9661)" : "var(--bd-xededed)") +
                ";border-radius:0;background:" +
                (c ? "var(--bg-a185151810p16)" : "var(--bg-a185151810p07)") +
                ";padding:0 9px;font-size:10.5px;font-weight:600;font-family:'Cairo',sans-serif;display:flex;align-items:center;justify-content:center;gap:5px;cursor:pointer;box-sizing:border-box;color:" +
                (f ? "var(--fg-x8a6f35)" : "var(--fg-x94a3b8)") +
                ";transition:background .15s,border-color .15s",
              csChev: "transition:transform .2s;flex-shrink:0;opacity:.5;" + (c ? "transform:rotate(180deg)" : ""),
              csShowList: !W && c,
              csToggle: W
                ? function () {}
                : function () {
                    r.setState({
                      drCsOpen: t.drCsOpen === p ? null : p,
                      drCsNew: "",
                      drCsEdit: null,
                      drLocOpen: null,
                      drLdOpen: null,
                      drShOpen: !1,
                    });
                  },
              csClear: function () {
                r.drLdCsSet(d, "");
              },
              csClearStyle:
                "display:flex;align-items:center;gap:9px;height:32px;padding:0 9px;border-radius:8px;font-size:11px;cursor:pointer;transition:background .12s;" +
                (f ? "color:var(--fg-x53565a)" : "background:var(--bg-a2452452450p8);color:var(--fg-x334155);font-weight:400"),
              csNoneSel: !f,
              csEmpty: !G.length,
              csOpts: G.map(function (t) {
                return {
                  name: t,
                  selected: f === t,
                  pick: function () {
                    r.drLdCsSet(d, t);
                  },
                  style:
                    "display:flex;align-items:center;gap:9px;height:32px;padding:0 9px;border-radius:8px;font-size:11px;cursor:pointer;transition:background .12s;" +
                    (f === t ? "background:var(--bg-a185151810p09);color:var(--fg-x9a7e40);font-weight:600" : "color:var(--fg-x141414)"),
                };
              }),
            });
        return {
          role: e[0],
          curName: xr(m),
          csOn: !0,
          icoOn: !1,
          ...k,
          altShow: !0,
          altOn: y,
          altLabel: y ? "رجوع لأصحاب الصلاحية" : "البديل",
          altTip: y ? "العودة لقائمة أصحاب صلاحية هذا الدور" : "عرض كل موظفي الوردية لاختيار بديل",
          altToggle:
            ((h = e[1]),
            (u = y),
            function (t) {
              (t && t.stopPropagation && t.stopPropagation(), r.setState({ drLdAlt: u ? null : h }));
            }),
          altStyle:
            "width:100%;display:flex;align-items:center;justify-content:center;gap:7px;height:32px;border-radius:8px;cursor:pointer;font-family:'Cairo',sans-serif;font-size:11px;font-weight:600;transition:all .15s;margin-bottom:4px;border:1px dashed " +
            (y
              ? "#b99751;background:var(--bg-a185151810p12);color:var(--fg-x8a6f35)"
              : "#cbd5e1;background:var(--bg-xffffff);color:var(--fg-x53565a)"),
          opts: b.map(function (t) {
            return {
              v: t.v,
              t: t.t,
              sel: t.sel,
              sub: t.sub || "",
              subStyle:
                "flex-shrink:0;font-size:9px;font-weight:600;color:var(--fg-x8a6f35);background:var(--bg-a185151810p09);border:1px solid var(--bd-a185151810p25);border-radius:100px;padding:1px 7px;white-space:nowrap" +
                (t.sub ? "" : ";display:none"),
              pick: (function (t, e) {
                return function () {
                  r.setState({ drLdOpen: null }, function () {
                    r.rpSetLeader(t, e);
                  });
                };
              })(e[1], t.v),
              style:
                "display:flex;align-items:center;gap:9px;height:32px;padding:0 9px;border-radius:8px;font-size:11.5px;cursor:pointer;transition:background .12s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" +
                (t.sel ? "background:var(--bg-a185151810p09);color:var(--fg-x9a7e40);font-weight:700" : "color:var(--fg-x141414)"),
            };
          }),
          roleTip: dr[n] && dr[n].name ? "مقصور على أصحاب صلاحية «" + dr[n].name + "»" : "لم يُعرَّف قالب صلاحيات لهذا الدور بعد",
          ddOpen: g,
          ddToggle: (function (t) {
            return function () {
              r.setState({ drLdOpen: r.state.drLdOpen === t ? null : t, drLdAlt: null, drShOpen: !1, drCsOpen: null });
            };
          })(e[1]),
          ddTxt: "—" === xr(m) ? "— اختر —" : xr(m),
          ddTip: m ? "انقر لتغيير " + e[0] : "انقر لاختيار " + e[0],
          ddTxtStyle:
            "flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:4px;text-decoration-color:" +
            (g ? "var(--fg-xb99751)" : "var(--fg-a185151810p55)"),
          ddStyle:
            "flex:1;min-width:0;display:flex;align-items:center;gap:9px;font-family:'Cairo',sans-serif;font-size:12.5px;font-weight:700;background:transparent;border:0;padding:0 12px;height:39px;box-sizing:border-box;cursor:pointer;text-align:right;color:" +
            (m ? "var(--fg-x141414)" : "var(--fg-x94a3b8)"),
          relStyle: "position:relative" + (g || t.drCsOpen === "L:" + e[1] ? ";z-index:60" : ""),
          wrapStyle:
            "display:flex;align-items:center;background:var(--bg-xffffff);border:1px solid var(--bd-xe1e1e1);border-radius:11px;height:41px;box-sizing:border-box;overflow:hidden;transition:border-color .15s,box-shadow .15s".replace(
              "#E1E1E1",
              g ? "#BB9661" : "#E1E1E1",
            ) + (g ? ";box-shadow:0 0 0 3px rgba(187,150,97,0.13)" : ""),
          icoStyle: g
            ? "display:flex;align-items:center;justify-content:center;width:40px;height:39px;flex-shrink:0;color:var(--text-on-brand);background:linear-gradient(135deg,var(--bg-xc9a876),var(--bg-xa37f4c))"
            : "display:flex;align-items:center;justify-content:center;width:40px;height:39px;flex-shrink:0;color:var(--text-on-brand);background:linear-gradient(135deg,var(--bg-xdcc4a0),var(--bg-xbb9661))",
          icoP1:
            0 === n
              ? "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"
              : 1 === n
                ? "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                : "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",
          icoP2:
            0 === n
              ? "M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8"
              : 1 === n
                ? "M13 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8 M22 21v-2a4 4 0 0 0-3-3.87"
                : "M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z M9 12h6 M9 16h4",
          ddChev: "transition:transform .2s;flex-shrink:0;opacity:.55;" + (g ? "transform:rotate(180deg)" : ""),
          set: (function (t) {
            return function (e) {
              r.rpSetLeader(t, e.target.value);
            };
          })(e[1]),
        };
      }),
      wr = "";
    if (D && E && E.apAt)
      try {
        var Or = new Date(E.apAt),
          Tr = this.hParts(Or);
        wr =
          " في " +
          Tr.d +
          " " +
          this.MONTHS[Tr.m - 1] +
          " " +
          Tr.y +
          " هـ · " +
          ("0" + Or.getHours()).slice(-2) +
          ":" +
          ("0" + Or.getMinutes()).slice(-2);
      } catch (t) {
        wr = "";
      }
    return {
      dYearLabel: t.rpY + " هـ",
      dGregRange: this.hGregYearRange(t.rpY),
      roundDaysCount: String(h),
      ...KIVO.BassamCount.pair("dimTotal", String(a), "يوم|مسجّل"),
      months: m,
      days: b,
      drSubOn: !((x && T) || (v && w)),
      rpDayShut: O,
      rpDayLabel: (function (r) {
        var e = "",
          n = "";
        try {
          var a = r.hGreg(t.rpY, t.rpM, t.rpD);
          ((e = a.toLocaleDateString("ar-SA-u-nu-latn", { weekday: "long" }) + " "),
            (n =
              " — الموافق " + a.toLocaleDateString("ar-u-ca-gregory-nu-latn", { day: "numeric", month: "long", year: "numeric" }) + " م"));
        } catch (t) {}
        return e + t.rpD + " " + r.MONTHS[t.rpM - 1] + " " + t.rpY + " هـ" + n;
      })(this),
      rpDaySub: C
        ? "معتمد ومقفل — كل الورديات"
        : T
          ? "انقضى — مقفل"
          : v && w
            ? "مفتوح بأثر رجعي"
            : x
              ? "مسودة — اعتُمدت " + P + " من " + KIVO.BassamCount(s.length, "وردية", "g") + ""
              : t.rpY === e.y && t.rpM === e.m && t.rpD === e.d
                ? "اليوم"
                : "الوردية اليومية",
      rpEmpty: !x,
      rpHasReport: x,
      rpCanEdit: L,
      rpLockedCell: A,
      rpNoStaff: !x && !T && 0 === i.length,
      rpNoStaffMsg:
        r.bsOn && !r.bsOn("staff")
          ? "⚠ التقرير اليومي يُسحب من الجدول الشهري — وهو غير مفعّل في سقف هذه الإدارة."
          : "⚠ لا يوجد تسكينٌ لهذا الشهر في «الجدول الشهري» — أنشئ الجدول أولاً.",
      rpCreate: function () {
        r.rpCreate();
      },
      drTrWhyVal: t.drTrWhy || "",
      drTrWhyStyle:
        "height:28px;border-radius:8px;padding:0 9px;font-size:10.5px;font-family:'Cairo',sans-serif;color:var(--fg-x141414);outline:none;width:100%;box-sizing:border-box;transition:border-color .15s;border:1px solid " +
        ((t.drTrWhy || "").trim() ? "#E1E1E1;background:var(--bg-xf7f9fa)" : "rgba(220,38,38,0.45);background:var(--bg-a2542422420p6)"),
      onDrTrWhy: function (t) {
        r.setState({ drTrWhy: t.target.value });
      },
      drLvNewVal: t.drLvNew || "",
      onDrLvNew: function (t) {
        r.setState({ drLvNew: t.target.value });
      },
      drLvNewStyle:
        "flex:1;min-width:0;height:28px;border-radius:8px;border:1px solid var(--bd-xe1e1e1);padding:0 9px;font-size:10.5px;font-weight:400;font-family:'Cairo',sans-serif;outline:none;box-sizing:border-box;background:var(--bg-xffffff)",
      drTrOn: !!t.drTrConfirm,
      drTrCancel: function () {
        r.setState({ drTrConfirm: null });
      },
      drTrStop: function (t) {
        t && t.stopPropagation && t.stopPropagation();
      },
      drTrInfo: t.drTrConfirm
        ? "الموظف: " +
          t.drTrConfirm.name +
          " (" +
          t.drTrConfirm.empno +
          ")  ·  من: " +
          t.drTrConfirm.from +
          "  ·  إلى: " +
          t.drTrConfirm.to +
          (t.drTrConfirm.why ? "  ·  السبب: " + t.drTrConfirm.why : "  ·  بلا سبب مذكور")
        : "",
      drTrDo: function () {
        r.rpTransfer();
      },
      rpPull: function () {
        r.rpPull();
      },
      shOpts: s.map(function (t) {
        var e = r.drShiftRec(n, t.name),
          a = "";
        e && (e.ap ? (a = " — معتمد ✓") : (e.pulled || (e.leaders && (e.leaders.chief || e.leaders.deputy))) && (a = " — مسودة"));
        var i,
          s = r.drShiftStale(n, t.name),
          d = !(!e || !e.pulled),
          p = !(!e || !e.ap);
        return {
          v: t.name,
          t: t.name + a,
          name: t.name,
          note: a,
          sel: t.name === o,
          color: t.color || "#b99751",
          pick:
            ((i = t.name),
            function () {
              r.drSetShift(i);
            }),
          rowStyle:
            "display:flex;align-items:center;gap:9px;height:32px;padding:0 9px;border-radius:8px;font-size:11.5px;cursor:pointer;transition:background .12s;" +
            (t.name === o ? "background:var(--bg-a185151810p09);color:var(--fg-x9a7e40);font-weight:700" : "color:var(--fg-x141414)"),
          rfOn: d && !p,
          rfHot: !!s,
          rfTip: p
            ? "الوردية معتمدة ومقفلة — افتحها من زرّ الاعتماد أولاً"
            : d
              ? s
                ? "طرأ تعديل في الجدول الشهري على هذه الوردية — اضغط للتحديث مع حفظ التأشيرات"
                : "جدول الوردية مطابق للجدول الشهري — لا جديد"
              : "لم يُسحب جدول هذه الوردية بعد",
          rfStyle:
            "width:24px;height:24px;flex-shrink:0;border-radius:7px;border:0;display:flex;align-items:center;justify-content:center;background:transparent;transition:all .15s;" +
            (s ? "color:var(--fg-xb45309);cursor:pointer" : "color:var(--fg-xdfe3e8);cursor:default"),
          refresh: (function (t, e) {
            return function (n) {
              try {
                n.stopPropagation();
              } catch (t) {}
              e && r.drRefreshShift(t);
            };
          })(t.name, !!s && d && !p),
        };
      }),
      shDdOpen: !!t.drShOpen && !d,
      shDdToggle: function () {
        d
          ? r.bsToast(
              d.shift
                ? "التقرير مثبَّت على ورديتك «" + d.shift + "» — لا تُعرض ورديات أخرى"
                : "لست مجدولاً في وردية هذا الشهر — راجع مدير الإدارة",
              "warn",
            )
          : r.setState({ drShOpen: !r.state.drShOpen });
      },
      shListLabel: d ? "ورديتك" : "قائمة الورديات",
      shPinned: !!d,
      shPinTip: d ? (d.shift ? "ورديتك هذا اليوم — القائمة مثبَّتة عليها" : "لست مجدولاً في وردية هذا الشهر") : "انقر لاختيار الوردية",
      shNoShift: !(!d || d.shift),
      shNoShiftTxt: "لست مجدولاً في وردية هذا الشهر — لا يُعرض تقرير حتى يُسند لك جدول من صفحة «الجدول الشهري»",
      shPinRf: (function () {
        if (!d || !d.shift) return { on: !1 };
        var t = r.drShiftRec(n, d.shift),
          e = !(!t || !t.pulled),
          a = !(!t || !t.ap),
          i = !!r.drShiftStale(n, d.shift);
        return {
          on: e && !a && L,
          hot: i,
          tip: i ? "طرأ تعديل في الجدول الشهري على ورديتك — اضغط للتحديث مع حفظ التأشيرات" : "جدول الوردية مطابق للجدول الشهري — لا جديد",
          style:
            "width:28px;height:28px;flex-shrink:0;border-radius:8px;border:0;display:flex;align-items:center;justify-content:center;background:transparent;transition:all .15s;margin-left:6px;" +
            (i ? "color:var(--fg-xb45309);cursor:pointer" : "color:var(--fg-xdfe3e8);cursor:default"),
          go: function (t) {
            try {
              t.stopPropagation();
            } catch (t) {}
            i && e && !a && r.drRefreshShift(d.shift);
          },
        };
      })(),
      shChev: "transition:transform .2s;flex-shrink:0;opacity:.55;" + (t.drShOpen ? "transform:rotate(180deg)" : ""),
      shCurTxt:
        ((kr = r.drShiftRec(n, o)),
        (Sr = ""),
        kr && (kr.ap ? (Sr = " — معتمد ✓") : (kr.pulled || (kr.leaders && (kr.leaders.chief || kr.leaders.deputy))) && (Sr = " — مسودة")),
        (o || "الوردية") + Sr),
      shStaleAny: s.some(function (t) {
        return !!r.drShiftStale(n, t.name);
      }),
      shDot: "width:9px;height:9px;border-radius:9999px;flex-shrink:0;background:" + c + ";box-shadow:0 0 0 3px " + c + "1f",
      shRelStyle: "position:relative;flex:1;min-width:0" + (t.drShOpen ? ";z-index:60" : ""),
      shWrapStyle:
        "display:flex;align-items:center;background:var(--bg-xffffff);border:1px solid var(--bd-xe1e1e1);border-radius:11px;height:41px;box-sizing:border-box;overflow:hidden;transition:border-color .15s,box-shadow .15s".replace(
          "#E1E1E1",
          t.drShOpen ? "#BB9661" : "#E1E1E1",
        ) + (t.drShOpen ? ";box-shadow:0 0 0 3px rgba(187,150,97,0.13)" : ""),
      shIcoStyle: t.drShOpen
        ? "display:flex;align-items:center;justify-content:center;width:40px;height:39px;flex-shrink:0;color:var(--text-on-brand);background:linear-gradient(135deg,var(--bg-xc9a876),var(--bg-xa37f4c))"
        : "display:flex;align-items:center;justify-content:center;width:40px;height:39px;flex-shrink:0;color:var(--text-on-brand);background:linear-gradient(135deg,var(--bg-xdcc4a0),var(--bg-xbb9661))",
      shTimeWrapStyle:
        "display:flex;align-items:center;background:var(--bg-xffffff);border:1px solid var(--bd-xe1e1e1);border-radius:11px;height:41px;box-sizing:border-box;overflow:hidden;transition:border-color .15s,box-shadow .15s;cursor:default",
      shTimeIcoStyle:
        "display:flex;align-items:center;justify-content:center;width:40px;height:39px;flex-shrink:0;color:var(--text-on-brand);background:linear-gradient(135deg,var(--bg-xdcc4a0),var(--bg-xbb9661))",
      shSelStyle:
        "flex:1;min-width:0;display:flex;align-items:center;gap:9px;font-family:'Cairo',sans-serif;font-size:12.5px;font-weight:700;color:var(--fg-x141414);background:transparent;border:0;padding:0 12px;height:39px;box-sizing:border-box;cursor:pointer;text-align:right",
      shCurStyle: d
        ? "flex:1;min-width:0;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:default"
        : "flex:1;min-width:0;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:4px;text-decoration-color:" +
          (t.drShOpen ? "var(--fg-xb99751)" : "var(--fg-a185151810p55)"),
      shClockStyle: "color:" + c,
      shTime: p && p.tStart && p.tEnd ? this.fmtClock(p.tStart) + " – " + this.fmtClock(p.tEnd) : "—",
      shName: o || "الوردية",
      shPullOn: x && !(E && E.pulled),
      shTableOn: x && !(!E || !E.pulled),
      shPullHint: "جدول " + (o || "الوردية") + " لم يُسحب بعد — " + KIVO.BassamCount(sr.length, "موظف") + " في الجدول الشهري",
      /* KIVO_265 · فحص القبول: كان الزرُّ يبدو صامتاً حين الجدولُ الشهري مسودة (رسالةٌ عابرة وحدها) — السببُ ظاهرٌ الآن تحت الزرّ دائماً */
      shPullDraft: !this.drStaffApproved(t.rpY, t.rpM),
      shPullDraftMsg: "الجدول الشهري لشهر " + (this.MONTHS[t.rpM - 1] || "") + " ما زال مسودة — اعتمده أولاً من صفحة «الجدول الشهري» بنقرة مزدوجة على كرت الشهر، ثم يُسحب جدول " + (o || "الوردية"),
      ...((yr = o ? r.drLastRepOf(o) : null),
      (br = !(!yr || !yr.ap)),
      {
        shContOn: !0,
        shContTxt: br ? "⇥ متابعة من تقرير يوم " + yr.d : "⇥ متابعة من تقرير سابق",
        shContTip: br
          ? "يبدأ اليوم بما استقرّ عليه تقرير يوم " + yr.d + " المعتمد — الأسماء والتحويلات وتعديلات الراحات، بلا تأشير"
          : yr
            ? "غير متاح الآن: تقرير يوم " + yr.d + " لهذه الوردية ما زال مسودة — اعتمِده ليصير أساساً لليوم الجديد"
            : "غير متاح الآن: لا تقرير سابق لهذه الوردية في هذا الشهر — المتابعة تبدأ من يومٍ سبق اعتماده",
        shContReady: br,
        shContStyle:
          "border-radius:10px;padding:10px 20px;font-family:'Cairo';font-size:12.5px;font-weight:700;transition:.15s;border:1px solid " +
          (br
            ? "rgba(79,70,229,0.4);background:var(--bg-a79702290p07);color:var(--fg-x4f46e5);cursor:pointer"
            : "#E6E8EB;background:var(--bg-xf7f8fa);color:var(--fg-xa8aeb6);cursor:not-allowed"),
        shContGo: function () {
          r.drContinuePull();
        },
        shPullTip: "يبدأ اليوم من الجدول الشهري كما اعتمده مدير الإدارة",
      }),
      rpLeaders: vr,
      rows: ir,
      search: t.drQ || "",
      onSearch: function (t) {
        r.setState({ drQ: t.target.value, drPage: 1 });
      },
      stPmExport: this.PC("export"),
      filesOpen: !!t.drFilesOpen,
      filesToggle: function () {
        r.setState({ drFilesOpen: !r.state.drFilesOpen });
      },
      filesChev: "opacity:.5;transition:transform .2s;" + (t.drFilesOpen ? "transform:rotate(180deg)" : ""),
      filesBtnStyle:
        "height:36px;display:flex;align-items:center;gap:6px;font-size:12px;border:0;border-radius:12px;padding:0 12px;cursor:pointer;font-family:'Cairo',sans-serif;" +
        (t.drFilesOpen ? "color:var(--fg-xb99751);background:var(--bg-a185151810p08)" : "color:var(--fg-x475569);background:transparent"),
      selMonthName: this.MONTHS[t.rpM - 1] || "",
      exportCsv: function () {
        if (r.PC("export")) {
          var e = { pr: "حاضر", ab: "غياب", pm: "استئذان", lv: "إجازة" },
            n = st.map(function (t) {
              return [
                t.name,
                t.empno,
                t.phone,
                (t.rest || []).join(" - "),
                (t.perm || []).join(" - "),
                t.muk ? "مكلف" : "غير مكلف",
                t.onRest ? "راحة" : "على رأس العمل",
                "lv" === t.mark && t.lvk ? "إجازة — " + t.lvk : e[t.mark] || "حاضر",
              ];
            }),
            a = [["اسم الموظف", "الرقم الوظيفي", "رقم الجوال", "أيام الراحة", "الاستئذانات", "المكلف", "حالة اليوم", "التأشير"]].concat(n);
          try {
            KIVO.BassamXLSX
              ? KIVO.BassamXLSX.download(a, "dreport-" + (r.MONTHS[t.rpM - 1] || "") + "-" + t.rpD + ".xlsx")
              : r.bsToast(
                  "تعذّر تصدير Excel — مكتبة الجداول غير متاحة في هذه الجلسة. حدّث الصفحة وأعد المحاولة، أو استخدم «طباعة / حفظ PDF».",
                );
          } catch (t) {
            r.bsToast("تعذّر إنشاء ملف Excel — " + (t && t.message ? t.message : "خطأ غير متوقع") + ".");
          }
          r.setState({ drFilesOpen: !1 });
        } else r.permDeny();
      },
      printTable: function () {
        r.PC("export")
          ? (r.setState({ drFilesOpen: !1 }),
            setTimeout(function () {
              window.print();
            }, 150))
          : r.permDeny();
      },
      ...this.drFilterDD("fst", "drFst", "كل الحالات", [
        { v: "all", name: "كل الحالات" },
        { v: "active", name: "متاح" },
        { v: "ab", name: "غائب" },
        { v: "pm", name: "مستأذن" },
        { v: "leave", name: "في إجازة" },
        { v: "tin", name: "محوَّل إلى الوردية" },
        { v: "rest", name: "في الراحة" },
      ]),
      ...this.drFilterDD("fmk", "drFmk", "المكلفون", [
        { v: "all", name: "الكل — مكلفون وغيرهم" },
        { v: "on", name: "المكلفون فقط" },
        { v: "off", name: "غير المكلفين" },
      ]),
      ...this.drFilterDD(
        "fpm",
        "drFpm",
        "الصلاحية",
        (function () {
          var t = [];
          try {
            var r = JSON.parse(localStorage.getItem("bassam_perm_tpls_v1"));
            Array.isArray(r) && (t = r);
          } catch (t) {}
          var e = [{ v: "all", name: "كل الصلاحيات" }];
          return (
            t.forEach(function (t) {
              e.push({ v: "tpl:" + t.id, name: t.name });
            }),
            e.push({ v: "none", name: "بدون صلاحية" }),
            e
          );
        })(),
      ),
      isListView: "grid" !== t.drView,
      drLocColOn: bsRd,
      drPmOn: bsTp,
      grpModeTip:
        "مجموعات: يُقسَّم الجدول بحالة الموظف (" +
        (bsRd ? "على مواقعهم · الاحتياط · " : "حاضرون · ") +
        "مستأذنون · إجازة · غائبون · راحة) بعدّاد لكل مجموعة وطيّ وفرد — قائمة: الجدول المتصل",
      isGridView: "grid" === t.drView,
      subList: function () {
        r.setState({ drView: "list" });
      },
      subKanban: function () {
        r.setState({ drView: "grid" });
      },
      subListStyle:
        "height:28px;width:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;border:0;cursor:pointer;transition:all .2s;" +
        ("grid" !== t.drView
          ? "background:var(--bg-xb99751);color:var(--text-on-brand)"
          : "background:transparent;color:var(--fg-x94a3b8)"),
      subKanbanStyle:
        "height:28px;width:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;border:0;cursor:pointer;transition:all .2s;" +
        ("grid" === t.drView
          ? "background:var(--bg-xb99751);color:var(--text-on-brand)"
          : "background:transparent;color:var(--fg-x94a3b8)"),
      shownCount: String(ir.length),
      totalCount: String(ot),
      ...KIVO.BassamCount.pair("pgTotal", String(_t), "سجل", "g"),
      pgRange: 0 === _t ? "0" : Nt + 1 + "–" + Math.min(Nt + Yt, _t),
      pgNums: Kt,
      perPage: String(Ft),
      grpOn: Mt,
      grpModeOn: !1 !== Dt.on,
      grpModeOff: !1 === Dt.on,
      grpSetOn: function () {
        r.drGrpSetOn(!0);
      },
      grpSetOff: function () {
        r.drGrpSetOn(!1);
      },
      grpOnStyle:
        "padding:5px 12px;font-size:11px;font-weight:700;font-family:'Cairo',sans-serif;border:0;cursor:pointer;" +
        (!1 !== Dt.on ? "background:var(--bg-x25343f);color:var(--fg-xffffff)" : "background:var(--bg-xffffff);color:var(--fg-x4a5c68)"),
      grpOffStyle:
        "padding:5px 12px;font-size:11px;font-weight:700;font-family:'Cairo',sans-serif;border:0;cursor:pointer;" +
        (!1 === Dt.on ? "background:var(--bg-x25343f);color:var(--fg-xffffff)" : "background:var(--bg-xffffff);color:var(--fg-x4a5c68)"),
      onPerPage: function (t) {
        var e = +t.target.value;
        r.setState({ drPer: 0 === e ? 0 : e || 10, drPage: 1 });
      },
      pgFirst: function () {
        r.setState({ drPage: 1 });
      },
      pgPrev: function () {
        r.setState({ drPage: Math.max(1, (r.state.drPage || 1) - 1) });
      },
      pgNext: function () {
        r.setState({ drPage: Math.min(jt, (r.state.drPage || 1) + 1) });
      },
      pgLast: function () {
        r.setState({ drPage: jt });
      },
      pgFirstStyle: It(zt > 1),
      pgPrevStyle: It(zt > 1),
      pgNextStyle: It(zt < jt),
      pgLastStyle: It(zt < jt),
      rpTot: String(B.length),
      rpPr: String(_),
      rpAb: String(F),
      rpPm: String(Y),
      rpLv: String(j),
      rpBigVal: String(_),
      rpBigLbl: "الحضور الفعلي",
      rpBigSub: Z ? "من " + Z + " في الوردية" : "لم يُسحب الجدول بعد",
      rpBigPct: Z ? Math.round((100 * _) / Z) + "٪" : "—",
      rpRingDash:
        ((mr = 2 * Math.PI * 41), (gr = Z ? Math.min(1, _ / Z) : 0), Math.round(mr * gr * 10) / 10 + " " + Math.round(10 * mr) / 10),
      rpBigColor: Z ? (_ === Z ? "#0B5C38" : (100 * _) / Z >= 75 ? "#8A6F35" : "#b91c1c") : "#94a3b8",
      rpRstTot: String(U),
      rpRstPct: Z ? Math.round((100 * U) / Z) + "٪" : "—",
      rpRstSub: Z ? "من " + Z + " في الوردية" : "لم يُسحب الجدول بعد",
      rpRstEmpty: !tt,
      rpRstRing: (function () {
        var t = 2 * Math.PI * 41,
          r = Z ? Math.min(1, U / Z) : 0;
        return Math.round(t * r * 10) / 10 + " " + Math.round(10 * t) / 10;
      })(),
      rpRstDays: this.WEEKDAYS.map(function (t) {
        var r = q[t],
          e = t === J || "ال" + t === J || t === "ال" + J,
          n = rt ? Math.max(r ? 8 : 0, Math.round((100 * r) / rt)) : 0,
          a = nt && r === rt,
          i = nt && r === et,
          s = a ? "#dc2626" : i ? "#059669" : "#b45309";
        return {
          name: t.replace("ال", ""),
          count: String(r),
          hpct: String(n),
          pctTxt: Z ? Math.round((100 * r) / Z) + "٪" : "—",
          tip:
            t +
            ": " +
            r +
            " " +
            (1 === r ? "راحة" : "راحات") +
            (Z ? " — " + Math.round((100 * r) / Z) + "٪ من الوردية" : "") +
            (a ? " · أكثر أيام الأسبوع راحات" : i ? " · أقلّها" : "") +
            (e ? " · يوم هذا التقرير" : ""),
          barColor: a ? "#dc2626" : i ? "#059669" : e ? "#b45309" : "rgba(245,158,11,0.45)",
          numColor: r ? s : "#94a3b8",
          pctColor: r ? s : "#cbd5e1",
          lblWeight: e ? "700" : "400",
          lblColor: e ? "#141414" : "#94a3b8",
          lblUnder: e ? "2px solid rgba(185,151,81,0.7)" : "2px solid transparent",
        };
      }),
      ...(function () {
        var t = ["#8A6F35", "#3e8ac4", "#9c3d6b", "#0e7490", "#b45309", "#53565a", "#a5566e", "#047857"],
          r = dr.map(function () {
            return 0;
          }),
          e = {};
        (or.chief && (e[or.chief] = 1),
          or.deputy && (e[or.deputy] = 1),
          B.forEach(function (t) {
            if (!e[t.ekey]) {
              var n = lr(t.ekey);
              n >= 2 && n < r.length && r[n]++;
            }
          }),
          r.length > 0 && (r[0] = or.chief ? 1 : 0),
          r.length > 1 && (r[1] = or.deputy ? 1 : 0));
        var n = 0;
        r.forEach(function (t) {
          n += t;
        });
        var a = 2 * Math.PI * 41,
          i = 0,
          s = [],
          o =
            r.filter(function (t) {
              return t > 0;
            }).length > 1;
        return (
          dr.forEach(function (e, n) {
            if (r[n] && Z) {
              var d = (a * r[n]) / Z,
                p = o ? Math.min(3, 0.12 * d) : 0;
              (s.push({
                color: t[n % t.length],
                dash: Math.round(10 * Math.max(0.5, d - p)) / 10 + " " + Math.round(10 * a) / 10,
                off: String(-Math.round(10 * i) / 10),
                tip: (e.name || "قالب") + ": " + r[n] + " من " + Z,
              }),
                (i += d));
            }
          }),
          {
            rpPmTot: String(n),
            rpPmPct: Z ? Math.round((100 * n) / Z) + "٪" : "—",
            rpPmSub: Z ? "من " + Z + " في الوردية" : "لم يُسحب الجدول بعد",
            rpPmEmpty: !n,
            rpPmRing: s,
            rpPmRows: dr.map(function (e, n) {
              var a = 0 === n || 1 === n;
              return {
                label: e.name || "قالب " + (n + 1),
                n: String(r[n]),
                color: r[n] ? t[n % t.length] : "#94a3b8",
                pct: Z ? Math.round((100 * r[n]) / Z) + "٪" : "—",
                tip: a
                  ? "«" +
                    (e.name || "") +
                    "»: يُحتسب من القائمة المنسدلة أعلى التقرير — الاسم المختار " +
                    (0 === n ? "رئيساً" : "نائباً") +
                    " يُعدّ واحداً ولو كان بديلاً بلا صلاحيات، والقائمة الفارغة صفر."
                  : "أصحاب صلاحية «" +
                    (e.name || "") +
                    "» المسحوبون في هذه الوردية: " +
                    r[n] +
                    (Z ? " من " + Z + " — تُقرأ من قوالب الصلاحيات، ولا يُعدّ فيها المعيَّنان رئيساً ونائباً" : ""),
              };
            }),
          }
        );
      })(),
      rpLvOn: j > 0,
      rpLvTot: String(j),
      rpLvSub: Z ? "من " + Z + " في الوردية" : "لم يُسحب الجدول بعد",
      rpLvEmpty: !j,
      rpLvPct: Z ? Math.round((100 * j) / Z) + "٪" : "—",
      rpLvBar: (function () {
        if (!j) return [];
        var t = {};
        B.forEach(function (r) {
          if ("lv" === r.st) {
            var e = (r.lvk || "").trim() || "بلا نوع محدَّد";
            t[e] = (t[e] || 0) + 1;
          }
        });
        var r = ["#0e7490", "#9c3d6b", "#b45309", "#2a76aa", "#a5566e", "#047857", "#9A7E40", "#2f5f8a"],
          e = z.drLeaveKinds(),
          n = function (t) {
            var r = e.indexOf(t);
            return -1 === r ? 900 : r;
          };
        return Object.keys(t)
          .sort(function (r, e) {
            return t[e] - t[r] || n(r) - n(e);
          })
          .map(function (e, a) {
            var i = j ? Math.round((100 * t[e]) / j) : 0,
              s = r[(900 === n(e) ? r.length - 1 : n(e)) % r.length];
            return {
              label: e,
              n: t[e],
              pct: i + "٪",
              color: s,
              bar: "height:100%;border-radius:9999px;background:" + s + ";width:" + Math.max(4, i) + "%",
              tip:
                e +
                ": " +
                t[e] +
                " من " +
                KIVO.BassamCount(j, ["مُجاز واحد", "مُجازَين", "مُجازَين", "مُجازين", "مُجازاً", "مُجاز"], "g") +
                " في هذا اليوم (" +
                i +
                "٪)",
            };
          });
      })(),
      rpLvRing: (function () {
        var t = 2 * Math.PI * 41,
          r = 0,
          e = [],
          n = [];
        if (
          (B.forEach(function (t) {
            "lv" === t.st && n.push((t.lvk || "").trim() || "بلا نوع محدَّد");
          }),
          !n.length)
        )
          return [];
        var a = {};
        n.forEach(function (t) {
          a[t] = (a[t] || 0) + 1;
        });
        var i = ["#0e7490", "#9c3d6b", "#b45309", "#2a76aa", "#a5566e", "#047857", "#9A7E40", "#2f5f8a"],
          s = z.drLeaveKinds(),
          o = function (t) {
            var r = s.indexOf(t);
            return -1 === r ? 900 : r;
          },
          d = Object.keys(a).sort(function (t, r) {
            return a[r] - a[t] || o(t) - o(r);
          }),
          p = d.length > 1;
        return (
          d.forEach(function (s) {
            var d = (t * a[s]) / n.length,
              c = p ? Math.min(3, 0.12 * d) : 0,
              l = i[(900 === o(s) ? i.length - 1 : o(s)) % i.length];
            (e.push({
              color: l,
              dash: Math.round(10 * Math.max(0.5, d - c)) / 10 + " " + Math.round(10 * t) / 10,
              off: String(-Math.round(10 * r) / 10),
              tip: s + ": " + a[s] + " من " + n.length,
            }),
              (r += d));
          }),
          e
        );
      })(),
      rpSumRows:
        ((hr = Z),
        (ur = function (t) {
          return hr ? Math.round((100 * t) / hr) + "٪" : "—";
        }),
        [
          {
            label: "على رأس العمل",
            n: String(X),
            pct: ur(X),
            color: "#059669",
            tip: "المتوقّع حضورهم في هذا اليوم قبل التأشير — عدد الوردية بعد استبعاد الراحات وحدها.",
          },
          {
            label: "في راحة",
            n: String(U),
            pct: ur(U),
            color: "#b45309",
            tip: "من تصادف راحتهم الأسبوعية يوم هذا التقرير تحديداً" + (J ? " (" + J + ")" : "") + " — لا اليوم الحالي.",
          },
          {
            label: "غياب",
            n: String(F),
            pct: ur(F),
            color: "#b91c1c",
            tip: "المؤشَّر لهم غياب في تقرير هذا اليوم — ينقص من الحضور الفعلي.",
          },
          {
            label: "استئذان",
            n: String(Y),
            pct: ur(Y),
            color: "#C9702A",
            tip: "المؤشَّر لهم استئذان — ينقص من الحضور الفعلي، ويُحتسب يومهم من نصاب الاستئذانات الشهري.",
          },
          {
            label: "إجازة",
            n: String(j),
            pct: ur(j),
            color: "#0e7490",
            tip: "المؤشَّر لهم إجازة في تقرير هذا اليوم — تُسجَّل من قائمة التأشير بنوعها لليوم نفسه فقط، وتنقص من الحضور الفعلي.",
          },
          {
            label: "تحويل",
            n: String($),
            pct: ur($),
            color: "#9c3d6b",
            tip: "من حُوِّل إلى وردية أخرى في تقرير هذا اليوم — يُحسب حاضراً هناك، وينقص من الحضور الفعلي هنا.",
          },
        ]),
      shApBannerOn: x && D,
      shApBannerTxt: "تقرير " + o + " معتمد ومقفل — اعتمده " + ((E && E.apBy) || "—") + wr + " — لفتحه: زرّ الاعتماد بجانب قائمة الورديات",
      drEmptyPullOn: !T && this.PC("add"),
      drPmReadOnly: !(this.PC("add") || this.PC("edit") || this.PC("approve") || this.PC("del")),   /* KIVO_261 (SOT-010 · كشفه k261tree): لافتةُ «عرض فقط» كسائر الصفحات */
      drEmptyIconBox:
        "width:60px;height:60px;border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;" +
        (T ? "background:var(--bg-a1001161390p1);color:var(--fg-x64748b)" : "background:var(--bg-a185151810p08);color:var(--fg-xb99751)"),
      drEmptyTitle:
        (T ? "اليوم انقضى ومقفل — " : "لا يوجد تقرير لهذا اليوم — ") + t.rpD + " " + this.MONTHS[t.rpM - 1] + " " + t.rpY + " هـ",
      drEmptySub: T
        ? M
          ? "لم يُنشأ تقرير لهذا اليوم قبل انقضائه. افتحه بأثر رجعي بنقرة مزدوجة على خانة اليوم لإنشاء تقريره."
          : "لم يُنشأ تقرير لهذا اليوم قبل انقضائه — فتحُ الأيام المنقضية يتطلب صلاحية الاعتماد."
        : this.PC("add")
          ? "أنشئ التقرير، ثم لكل وردية: اخترها من القائمة، عيّن قيادتها، اسحب جدولها وأشّر الحضور — واعتمدها بزرّ الاعتماد بجانب القائمة." + (M ? " ونقرة مزدوجة على خانة اليوم تفتح اليوم أو تُغلقه." : "")
          : "لم يُنشأ تقرير لهذا اليوم بعد — إنشاؤه يتطلب صلاحية الإضافة.",
      ...(function () {
        var t = x && T ? "auto" : v && w ? "open" : null;
        if (!t) return { drBannerOn: !1 };
        var r =
            "auto" === t
              ? ["rgba(100,116,139,0.08)", "rgba(100,116,139,0.3)", "#475569"]
              : ["rgba(180,83,9,0.07)", "rgba(180,83,9,0.3)", "#b45309"],
          e =
            "auto" === t
              ? ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z", ""]
              : ["M7 11V7a5 5 0 0 1 9.9-1", "M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z"];
        return {
          drBannerOn: !0,
          drBannerStyle:
            "margin-inline-start:auto;display:inline-flex;align-items:center;gap:7px;padding:4px 11px;border-radius:9999px;font-size:11px;font-weight:700;white-space:nowrap;background:" +
            r[0] +
            ";border:1px solid " +
            r[1] +
            ";color:" +
            r[2],
          drBannerP1: e[0],
          drBannerP2: e[1],
          drBannerTxt:
            "auto" === t
              ? v
                ? "اليوم انقضى — التقرير مقفل تلقائياً · " + (M ? "فتحه بأثر رجعي بنقرة مزدوجة على خانة اليوم" : "فتحه بأثر رجعي يحتاج صلاحية الاعتماد")
                : "اليوم مقفل — التقرير للعرض فقط · " + (M ? "فتحه بنقرة مزدوجة على خانة اليوم" : "فتحه يحتاج صلاحية الاعتماد")
              : "يوم منقضٍ مفتوح بأثر رجعي — سجّل تقارير الورديات واعتمدها، ويعود مقفلاً تلقائياً باكتمال اعتمادها",
        };
      })(),
      drRsOn: !!t.drRs,
      drRsMsg: t.drRs ? "سيتم حذف تقرير " + t.drRs.label + " بالكامل من المنظومة." : "",
      drRsScope:
        "يشمل الحذف: تقرير اليوم بكل ورديّاته — جداولها المسحوبة، وتأشيرات الحضور والغياب والاستئذان والإجازة، وتعيينات قيادتها. لا يمكن التراجع عن هذا الإجراء.",
      drRsAckTog: function () {
        r.setState({ drRsAck: !r.state.drRsAck });
      },
      drRsAckBox:
        "flex-shrink:0;width:18px;height:18px;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;transition:all .15s;border:1.5px solid " +
        (t.drRsAck
          ? "#dc2626;background:var(--bg-xdc2626);color:var(--fg-xffffff)"
          : "#cbd5e1;background:var(--bg-xffffff);color:transparent"),
      drRsDoStyle:
        "height:38px;padding:0 22px;border-radius:10px;font-size:13px;font-weight:400;color:var(--fg-xffffff);border:0;font-family:'Cairo',sans-serif;transition:all .15s;" +
        (t.drRsAck ? "background:var(--bg-xdc2626);cursor:pointer" : "background:var(--bg-xfca5a5);cursor:not-allowed;opacity:.75"),
      drRsCancel: function () {
        r.setState({ drRs: null, drRsAck: !1 });
      },
      drRsStop: function (t) {
        try {
          t.stopPropagation();
        } catch (t) {}
      },
      drRsDo: function () {
        if (r.state.drRsAck) {
          var e = r.state.drRs;
          if (e) {
            var n = r.rpLoad(),
              a = t.rpY + "-" + t.rpM + "-" + e.d,
              i = n[a];
            (i && r.drAnyShiftAp(i)) || r.drLockedDay(n, t.rpY, t.rpM, e.d)
              ? r.setState({ drRs: null, drRsAck: !1 })
              : (delete n[a],
                r.rpSave(n),
                r.setState({ drRs: null, drRsAck: !1, rpTick: (r.state.rpTick || 0) + 1 }),
                r.bsAck("أُعيد تهيئة " + e.label + " — حُذف تقريره بالكامل", "ok"));
          }
        }
      },
      drLkOn: !!t.drLk,
      drLkClose: function () {
        r.setState({ drLk: null });
      },
      drLkStop: function (t) {
        try {
          t.stopPropagation();
        } catch (t) {}
      },
      drLkTitle: D ? "فتح تقرير " + o + " للتعديل" : "اعتماد تقرير " + o,
      drLkMsg: D
        ? "سيتم فتح تقرير " + o + " للتعديل — يمكن لمشرف الوردية تعديل التأشير وقيادة الوردية ثم إعادة الاعتماد."
        : "سيتم اعتماد وقفل تقرير " + o + " — لن يمكن تعديل التأشير أو قيادة الوردية بعد الاعتماد إلا بعد فتح التقرير من جديد.",
      drLkBtnStyle:
        "height:38px;padding:0 20px;border-radius:10px;font-size:13px;font-weight:400;border:0;cursor:pointer;color:var(--fg-xffffff);font-family:'Cairo',sans-serif;background:" +
        (D ? "var(--bg-xb45309)" : "var(--bg-x008450)"),
      drLkBtnLabel: D ? "فتح للتعديل" : "اعتماد وإغلاق",
      drLkDo: function () {
        if (
          r.PC("approve") &&
          (function () {
            var K = KIVO.BassamPerm && KIVO.BassamPerm.key;
            return !K || K(D ? "report.reopen" : "report.approve") !== !1;
          })()
        ) {
          var t = D;
          (r.drSetAp(t ? 0 : 1),
            r.setState({ drLk: null }),
            r.bsAck(t ? "فُتح تقرير " + o + " للتعديل" : "اعتُمد تقرير " + o + " وأُقفل", "ok"));
        } else r.permDeny();
      },
      shApBtnOn: x && !T && !(!E || !E.pulled),
      shApBtnTip: D ? "تقرير " + o + " معتمد ومقفل — اضغط لفتحه للتعديل" : "اعتماد وقفل تقرير " + o + " وحدها",
      shApBtnStyle:
        "width:41px;height:41px;flex-shrink:0;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;font-family:'Cairo',sans-serif;border:1px solid " +
        (D
          ? "rgba(0,132,80,0.45);background:var(--bg-a0132800p1);color:var(--fg-x008450)"
          : "#E1E1E1;background:var(--bg-xffffff);color:var(--fg-x94a3b8)"),
      shApBtnGo: function () {
        r.setState({ drLk: 1 });
      },
      ...(function () {
        var e = t.drRt;
        if (!e) return { drRtOn: !1 };
        var n = "يوم " + e.d + " " + r.MONTHS[t.rpM - 1] + " " + t.rpY + " هـ";
        return {
          drRtOn: !0,
          drRtTitle: e.open
            ? (r.dayPastDS(t.rpY, t.rpM, e.d), "فتح " + n + (r.dayPastDS(t.rpY, t.rpM, e.d) ? " بأثر رجعي" : ""))
            : "إغلاق " + n,
          drRtMsg: e.open
            ? r.dayPastDS(t.rpY, t.rpM, e.d)
              ? "هذا اليوم انقضى وأُقفل تلقائياً. فتحه يتيح إنشاء تقريره وسحب جداول ورديّاته وتسجيلها بأثر رجعي."
              : "فتح اليوم يتيح إنشاء تقريره وسحب جداول ورديّاته وتسجيلها من جديد."
            : "سيُقفل اليوم فيصير عرضاً فقط: يمكن التنقّل بين الورديات ومطالعة تقاريرها، ولا يمكن تعديلها ولا اعتمادها حتى تفتحه من جديد.",
          drRtB1: e.open ? "ما تسجّله سيُحفظ ضمن هذا اليوم المنقضي" : "ما سجّلته يبقى محفوظاً كما هو",
          drRtB2: e.open ? "يبقى مفتوحاً حتى تعتمد ورديّاته أو تعيد قفله" : "يمكنك فتحه مجدداً في أي وقت بنقرة مزدوجة",
          drRtB3: e.open
            ? "يمكنك إغلاقه في أي وقت بنقرة مزدوجة على خانته"
            : "اعتماد كل وردية يتمّ من زرّ الاعتماد بجانب قائمة الورديات قبل الإغلاق",
          drRtBtn: e.open ? (r.dayPastDS(t.rpY, t.rpM, e.d) ? "فتح بأثر رجعي" : "فتح اليوم") : "إغلاق اليوم",
          drRtBtnStyle:
            "height:38px;padding:0 20px;border-radius:10px;font-size:13px;font-weight:400;border:0;cursor:pointer;color:var(--fg-xffffff);font-family:'Cairo',sans-serif;background:" +
            (e.open ? "var(--bg-xb45309)" : "var(--bg-x64748b)"),
          drRtDo: function () {
            r.PC("approve")
              ? (r.drToggleDayLock(t.rpY, t.rpM, e.d, !e.open),
                r.setState({ drRt: null }),
                r.bsAck(
                  e.open ? "فُتح اليوم — أنشئ تقريره وسجّل ورديّاته واعتمد كلَّ وردية من زرّها" : "أُغلق اليوم — صار عرضاً فقط",
                  "ok",
                ))
              : r.permDeny();
          },
          drRtCancel: function () {
            r.setState({ drRt: null });
          },
          drRtStop: function (t) {
            try {
              t.stopPropagation();
            } catch (t) {}
          },
        };
      })(),
      goCurrent: function () {
        var t = r.hParts(new Date());
        r.setState({ rpY: t.y, rpM: t.m, rpD: t.d });
      },
      prevYear: function () {
        r.setState({ rpY: t.rpY - 1 });
      },
      nextYear: function () {
        r.setState({ rpY: t.rpY + 1 });
      },
    };
  }
}
