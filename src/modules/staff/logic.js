class Component extends KIVO.BassamPageKit.base(DCLogic, ["admin+award+daily+dreport+employees+irshad+plan+profile+seized+staff+tasks","daily+dreport+dstats+irshad+plan+seized+staff+tasks","daily+dreport+irshad+plan+seized+staff+tasks","dreport+irshad+planning+profile+seized+staff+tasks","daily+plan+seized+staff","dreport+staff","employees+staff","plan+staff"]) {
  bsToast(t, e) {
    try {
      const s = e || "err";
      let r = document.getElementById("bs-toast");
      r || ((r = document.createElement("div")), (r.id = "bs-toast"), document.body.appendChild(r));
      const n =
        "ok" === s
          ? ["var(--toast-ok)", "var(--bg-toast)", "var(--toast-ok-bd)", "✓"]
          : "warn" === s
            ? ["var(--toast-warn)", "var(--bg-toast)", "var(--toast-warn-bd)", "⚠"]
            : ["var(--toast-err)", "var(--bg-toast)", "var(--toast-err-bd)", "⚠"];
      (r.setAttribute(
        "style",
        "position:fixed;top:16px;left:50%;transform:translateX(-50%) translateY(-8px);z-index:2147483000;max-width:min(560px,92vw);direction:rtl;text-align:right;font-family:'Cairo',sans-serif;font-size:13px;font-weight:600;line-height:1.9;color:" +
          n[0] +
          ";background:" +
          n[1] +
          ";border:1px solid " +
          n[2] +
          ";border-radius:14px;padding:12px 18px;box-shadow:var(--shadow-elevated);opacity:0;transition:opacity .22s ease, transform .22s ease;pointer-events:none",
      ),
        (r.textContent = n[3] + "  " + String(null == t ? "" : t)),
        requestAnimationFrame(() => {
          try {
            ((r.style.opacity = "1"), (r.style.transform = "translateX(-50%) translateY(0)"));
          } catch (t) {}
        }),
        clearTimeout(this._bsToastT),
        (this._bsToastT = setTimeout(() => {
          try {
            ((r.style.opacity = "0"), (r.style.transform = "translateX(-50%) translateY(-8px)"));
          } catch (t) {}
        }, 4200)));
    } catch (t) {}
  }
  state = (() => {
    const t = this.curHijri();
    return {
      permTick: 0,
      pmOpen: null,
      pmPos: null,
      year: t.y,
      month: t.m,
      sub: "list",
      lockConfirm: null,
      fsOpen: !1,
      fddOpen: null,
      search: "",
      fStatus: "all",
      fShift: "all",
      fMuk: "all",
      fRest: "all",
      fPerm: "all",
      fWork: "all",
      locked: this.loadLocks(),
      shiftOpts: this.loadShiftOpts(),
      staffing: this.loadStaffing(),
      restOpen: null,
      permOpen: null,
      permLimit: this.loadPermLimit(),
      sdOpen: null,
      sdPos: null,
      csOpen: null,
      csNew: "",
      csEdit: null,
      csTick: 0,
      wkOpen: null,
      wkNew: "",
      wkEdit: null,
      wkTick: 0,
      mMenu: null,
      delMonth: null,
      stSel: {},
      page: 1,
      perPage: 10,
    };
  })();
  snapKey() {
    return "__shifts";
  }
  monthPastS(t, e) {
    const s = this.curHijri();
    return +t < s.y || (+t === s.y && +e < s.m);
  }
  monthOpenFlagS(t, e) {
    const s = (this.state.locked || {})[t + "-" + e];
    return !(!s || "object" != typeof s || !s.mo);
  }
  monthAutoLockedS(t, e) {
    return this.monthPastS(t, e) && !this.monthOpenFlagS(t, e);
  }
  monthApprovedS(t, e) {
    return !0 === (this.state.locked || {})[t + "-" + e];
  }
  monthLockedS(t, e) {
    return this.monthApprovedS(t, e) || this.monthAutoLockedS(t, e);
  }
  _setMonthOpenS(t, e, s) {
    const r = t + "-" + e,
      n = { ...(this.state.locked || {}) };
    (s ? (n[r] = { mo: 1 }) : delete n[r], this.saveLocks(n));
  }
  hasLiveSched(t) {
    try {
      const e = (this.state.staffing || {})[t];
      return (
        !!e &&
        (Object.keys(e).filter((t) => t !== this.snapKey()).length
          ? this.loadEmp().some((t) => e[this.empKey(t)])
          : this.loadEmp().length > 0)
      );
    } catch (t) {
      return !1;
    }
  }
  empKey(t) {
    return (t && t.eid) || "";
  }
  mkLabel(t) {
    const e = String(t).split("-");
    return (this.MONTHS[+e[1] - 1] || t) + " " + e[0] + " هـ";
  }
  shiftDefsFor(t) {
    if ((this.state.locked || {})[t]) {
      const e = (this.state.staffing || {})[t],
        s = e && e[this.snapKey()];
      if (Array.isArray(s) && s.length) return s;
    }
    return this.state.shiftOpts || [];
  }
  loadEmp() {
    try {
      const t = localStorage.getItem("bassam_employees_v1");
      if (t) {
        const e = JSON.parse(t);
        if (Array.isArray(e)) {
          let t = !1;
          const s = e.map((e) =>
            e && !e.eid ? ((t = !0), { ...e, eid: "e" + Date.now().toString(36) + Math.floor(1e9 * Math.random()).toString(36) }) : e,
          );
          if (t)
            try {
              localStorage.setItem("bassam_employees_v1", JSON.stringify(s));
            } catch (t) {}
          return s;
        }
      }
    } catch (t) {}
    return [];
  }
  loadLocks() {
    try {
      const t = localStorage.getItem("bassam_staffing_locks_v1");
      if (t) {
        const e = JSON.parse(t);
        if (e && "object" == typeof e) return e;
      }
    } catch (t) {}
    return {};
  }
  /* KIVO_265 · أداء (ملاحظةُ المالك 2026-10-19): فحوصُ الصلاحية تُنادى لكل صفٍّ وخليةٍ في الجدول الشهري (آلافُ المرّات في الرسم الواحد
     مع 1000 موظف) — تُحسب مرةً لكل (نسخة العالم · الكتابة · الإدارة النشطة · الثانية) */
  _pcKey() {
    let d = "";
    try {
      d = KIVO.BassamDepts.active();
    } catch (t) {}
    return (KIVO.__dcWorld || 0) + ":" + (KIVO.__dcWrite || 0) + ":" + Math.floor(Date.now() / 1000) + ":" + d;
  }
  _pcMemo(n, f) {
    const k = this._pcKey(),
      m = this.__pcm && this.__pcm.k === k ? this.__pcm : (this.__pcm = { k, v: {} });
    return n in m.v ? m.v[n] : (m.v[n] = f());
  }
  PC(t) {
    return this._pcMemo("PC:" + (t || "view"), () => {
      try {
        return !!KIVO.BassamPerm && KIVO.BassamPerm.can("staff", t || "view");
      } catch (t) {
        return !1;
      }
    });
  }
  PCE(t) {
    return this._pcMemo("PCE:" + (t || "view"), () => {
      try {
        return !!KIVO.BassamPerm && KIVO.BassamPerm.can("emps", t || "view");
      } catch (t) {
        return !1;
      }
    });
  }
  PERM_PAGES() {
    const t = KIVO.BassamPerm,
      e = { emps: ["view", "add", "edit", "del", "export"], admin: ["view", "export"] },
      s = t && t.ALL_ACTS ? t.ALL_ACTS.slice() : ["view", "add", "edit", "del", "approve", "export"],
      r = t && t.PAGE_REG ? t.PAGE_REG : [];
    return r.length
      ? r.map((t) => ({ k: t.key, n: t.name, acts: e[t.key] || s }))
      : [
          { k: "emps", n: "موظفو الإدارة", acts: e.emps },
          { k: "staff", n: "الجدول الشهري", acts: s },
          { k: "plan", n: "الخطة التشغيلية", acts: s },
          { k: "daily", n: "المتابعة اليومية", acts: s },
          { k: "admin", n: "الإعدادات", acts: e.admin },
        ];
  }
  _pmTplOf(t) {
    const e = KIVO.BassamPerm;
    try {
      return e && e.tplOfEmp ? e.tplOfEmp(t) : "";
    } catch (t) {
      return "";
    }
  }
  pmGoOpen(t, e) {
    const s = this._pkMeasure(e);
    (this._pkScrollClose(),
      this.setState(
        (e) => ({ pmOpen: e.pmOpen === t ? null : t, pmPos: s, sdOpen: null, restOpen: null }),
        () => {
          try {
            requestAnimationFrame(() => this._pkFit('[data-pm="list"]', "pmPos"));
          } catch (t) {
            this._pkFit('[data-pm="list"]', "pmPos");
          }
        },
      ));
  }
  pmPick(t, e, s) {
    const r = KIVO.BassamPerm;
    if (!r) return;
    const n = s ? this.PERM_TPLS().filter((t) => t.id === s)[0] : null;
    if (s && !n) return void this.bsToast("القالب لم يعد موجوداً — أعد فتح القائمة", "warn");
    const i = n && r.tplCut ? r.tplCut(n.perms || {}) : {};
    if (n && !Object.keys(i).some((t) => (i[t] || []).length))
      return void this.bsToast("القالب «" + n.name + "» بلا أوراق داخل سقف هذه الإدارة — أضف أوراقه من «قوالب الصلاحيات» أولاً", "warn");
    const a = r.setEmpPerms(t, i);
    if (a && !1 === a.ok) this.bsToast(a.err || "تعذّر حفظ الصلاحيات", "warn");
    else {
      try {
        r.setEmpTpl && r.setEmpTpl(t, n ? n.id : "");
      } catch (t) {}
      try {
        if (r.setEmpLens) {
          const e = (r.deptLenses ? r.deptLenses() : []) || [];
          r.setEmpLens(t, n && Array.isArray(n.lens) ? n.lens.filter((t) => -1 !== e.indexOf(t)) : e);
        }
      } catch (t) {}
      (this.setState({ pmOpen: null, pmPos: null, permTick: (this.state.permTick || 0) + 1 }),
        this.bsAck(
          n
            ? "مُنح «" + (e || "الموظف") + "» قالب «" + n.name + "» — " + KIVO.BassamCount(Object.keys(i).length, "ورقة") + ""
            : "سُحبت صلاحيات «" + (e || "الموظف") + "»",
          "ok",
        ));
    }
  }
  _pmCanSet() {
    return this._pcMemo("pmCanSet", () => {
      try {
        const t = KIVO.BassamPerm;
        return !(!(t && t.can && t.can("admin", "view")) || (t.subOn && !t.subOn("admin", "ptpls")));
      } catch (t) {
        return !1;
      }
    });
  }
  _stCanWrite() {
    return this.PC("add") || this.PC("edit") || this.PC("del") || this.PC("approve");
  }
  _stPermVals() {
    const t = this._stCanWrite();
    return {
      stPmAdd: this.PC("add"),
      stPmEdit: this.PC("edit"),
      stPmDel: this.PC("del"),
      stPmApprove: this.PC("approve"),
      stPmExport: this.PC("export"),
      bsPtplOn: this.bsOn("admin/ptpls"),
      mkDayCap: this.bsOn("dreport"),
      bsNever: !1,
      stPmWrite: t,
      stPmReadOnly: !t,
      stPmNoteStyle:
        "display:flex;align-items:center;gap:8px;padding:9px 14px;border-radius:12px;background:var(--bg-a1001161390p06);border:1px solid var(--bd-a1001161390p22);font-size:11.5px;font-weight:600;color:var(--fg-x475569);line-height:1.8",
    };
  }
  permDeny() {
    try {
      this.bsToast("صلاحيتك على الجدول الشهري لا تشمل هذا الإجراء — راجع مدير الإدارة");
    } catch (t) {}
  }
  saveLocks(t) {
    if (this.PC("approve")) {
      try {
        localStorage.setItem("bassam_staffing_locks_v1", JSON.stringify(t));
      } catch (t) {}
      this.setState({ locked: t });
    } else this.permDeny();
  }
  migrateStaffing(t) {
    const e = this.__shiftRename || null,
      s = this.loadEmp(),
      r = {},
      n = {};
    (s.forEach((t) => {
      const e = (t && t.eid) || "";
      e && ((r[e] = !0), t.name && (n[t.name] = e));
    }),
      s.forEach((t) => {
        const e = (t && t.eid) || "";
        e && t.nid && (n[t.nid] = e);
      }));
    let i = !1;
    return (
      Object.keys(t).forEach((s) => {
        const a = t[s];
        if (!a || "object" != typeof a) return;
        let o = !1;
        const l = {};
        (Object.keys(a).forEach((t) => {
          if (t === this.snapKey()) return void (l[t] = a[t]);
          let s = a[t];
          const i = r[t] ? t : n[t] || t;
          (i !== t && (o = !0),
            e && s && e[s.shift] && ((s = { ...s, shift: e[s.shift] }), (o = !0)),
            (l[i] = l[i] ? { ...l[i], ...s } : s));
        }),
          o && ((t[s] = l), (i = !0)));
      }),
      i
    );
  }
  _bsLiveReload(K) {
    const h = (t) =>
      (K || []).some((k) => {
        k = String(k);
        return k === t || k.slice(-t.length - 1) === ":" + t;
      });
    const s = this.state;
    if (s.restOpen || s.permOpen || s.sdOpen || s.csOpen || s.csEdit || s.wkOpen || s.wkEdit || s.mMenu || s.delMonth) return !1;
    const p = {};
    h("bassam_staffing_v3") && (p.staffing = this.loadStaffing());
    h("bassam_staffing_locks_v1") && (p.locked = this.loadLocks());
    h("bassam_shift_options_v1") && (p.shiftOpts = this.loadShiftOpts());
    h("bassam_perm_limit_v1") && (p.permLimit = this.loadPermLimit());
    Object.keys(p).length && ((p._bsTick = Date.now()), (this._bsSigV = this._bsSig()), this.setState(p));
    return !0;
  }
  loadStaffing() {
    let t = null,
      e = !1;
    try {
      const e = localStorage.getItem("bassam_staffing_v3");
      if (e) {
        const s = JSON.parse(e);
        s && "object" == typeof s && (t = s);
      }
    } catch (t) {}
    if (!t)
      try {
        const s = localStorage.getItem("bassam_staffing_v2");
        if (s) {
          const r = JSON.parse(s);
          if (r && "object" == typeof r && Object.keys(r).length) {
            const s = this.curHijri();
            ((t = {}), (t[s.y + "-" + s.m] = r), (e = !0));
          }
        }
      } catch (t) {}
    if (!t) return {};
    if ((this.migrateStaffing(t) && (e = !0), e))
      try {
        localStorage.setItem("bassam_staffing_v3", JSON.stringify(t));
      } catch (t) {}
    return t;
  }
  saveStaffing(t) {
    if (this.PC("edit")) {
      try {
        localStorage.setItem("bassam_staffing_v3", JSON.stringify(t));
      } catch (t) {}
      this.setState({ staffing: t });
    } else this.permDeny();
  }
  stGrpPref() {
    try {
      var t = JSON.parse(localStorage.getItem("bassam_st_grp_v1"));
      if (t && "object" == typeof t) return t;
    } catch (t) {}
    return { on: !0, closed: {} };
  }
  stGrpSave(t) {
    try {
      localStorage.setItem("bassam_st_grp_v1", JSON.stringify(t));
    } catch (t) {}
    this.setState({ stGrpTick: (this.state.stGrpTick || 0) + 1 });
  }
  stGrpToggle(t) {
    var e = this.stGrpPref();
    ((e.closed = e.closed || {}), (e.closed[t] = !e.closed[t]), this.stGrpSave(e));
  }
  stGrpSetOn(t) {
    var e = this.stGrpPref();
    ((e.on = !!t), this.stGrpSave(e));
  }
  monthKey() {
    return this.state.year + "-" + this.state.month;
  }
  entryOf(t) {
    const e = this.monthKey(),
      s = (this.state.staffing[e] || {})[this.empKey(t)] || {},
      r = this.shiftDefsFor(e).map((t) => t.name),
      n = void 0 !== s.shift ? s.shift : "";
    return {
      shift: r.includes(n) ? n : "",
      rest: void 0 !== s.rest ? s.rest : [],
      muk: !0 === s.muk,
      leaves: Array.isArray(s.leaves) ? s.leaves : [],
      cs: "string" == typeof s.cs ? s.cs : "",
      perm: this.permDaysOf(s, this.state.year, this.state.month),
    };
  }
  savePermLimit(t) {
    if (!this.PC("approve")) return void this.permDeny();
    const e = Math.min(31, Math.max(0, parseInt(t, 10) || 0));
    try {
      localStorage.setItem("bassam_perm_limit_v1", String(e));
    } catch (t) {}
    this.setState({ permLimit: e });
  }
  permDaysOf(t, e, s) {
    const r = this.hMonthDays(e, s),
      n = Array.isArray(t && t.perm) ? t.perm : [],
      i = {},
      a = [];
    return (
      n.forEach((t) => {
        const e = parseInt(t, 10);
        !isNaN(e) && e >= 1 && e <= r && !i[e] && ((i[e] = 1), a.push(e));
      }),
      a.sort((t, e) => t - e)
    );
  }
  permToggleDay(t, e, s) {
    const r = parseInt(e, 10);
    if (isNaN(r)) return;
    const n = -1 !== s.indexOf(r);
    (!n && s.length >= this.state.permLimit) ||
      this.setEntry(t, { perm: n ? s.filter((t) => t !== r) : s.concat([r]).sort((t, e) => t - e) });
  }
  lvActiveToday(t) {
    return null;
  }
  prevMonthKey(t, e) {
    return 1 === +e ? this._mk(+t - 1, 12) : this._mk(+t, +e - 1);
  }
  _mk(t, e) {
    return t + "-" + e;
  }
  drpLoad() {
    try {
      const t = JSON.parse(localStorage.getItem("bassam_dreport_v1"));
      return t && "object" == typeof t ? t : {};
    } catch (t) {
      return {};
    }
  }
  drpApprovedDays(t, e) {
    const s = this.drpLoad(),
      r = [];
    return (
      Object.keys(s).forEach((n) => {
        if (0 === n.indexOf("m:") || "__lv" === n) return;
        const i = n.split("-");
        if (3 !== i.length || +i[0] !== +t || +i[1] !== +e) return;
        const a = (s[n] && s[n].shifts) || {},
          o = Object.keys(a).filter((t) => a[t] && a[t].ap && (a[t].roster || []).length);
        o.length && r.push({ d: +i[2], key: n, shifts: o });
      }),
      r.sort((t, e) => e.d - t.d),
      r
    );
  }
  drpDayPlan(t) {
    const e = this.drpLoad()[t],
      s = (e && e.shifts) || {},
      r = {};
    return (
      Object.keys(s).forEach((t) => {
        const e = s[t];
        if (!e || !e.ap) return;
        const n = e.rest && "object" == typeof e.rest ? e.rest : {};
        (e.roster || []).forEach((e) => {
          e && e.ekey && (r[e.ekey] = { shift: t, rest: Array.isArray(n[e.ekey]) ? n[e.ekey].slice() : null });
        });
      }),
      r
    );
  }
  doCreateSchedule(t) {
    if (!this.loadEmp().length) return;
    const e = { ...this.state.staffing },
      s = this.monthKey(),
      r = e[s] && "object" == typeof e[s] ? { ...e[s] } : {},
      n = t && "object" == typeof t && "day" === t.from,
      i = "copy" === t || n ? e[this.prevMonthKey(this.state.year, this.state.month)] || {} : null,
      a = n ? this.drpDayPlan(t.key) : null;
    (this.loadEmp().forEach((t) => {
      const e = this.empKey(t);
      if (!e || void 0 !== r[e]) return;
      const s = a ? a[e] : null;
      if (s) {
        const t = i && i[e] ? i[e] : {};
        return void (r[e] = {
          shift: s.shift || "",
          rest: s.rest ? s.rest.slice() : Array.isArray(t.rest) ? t.rest.slice() : [],
          muk: !0 === t.muk,
          cs: "string" == typeof t.cs ? t.cs : "",
        });
      }
      if (i && i[e]) {
        const t = i[e];
        r[e] = { shift: t.shift || "", rest: Array.isArray(t.rest) ? t.rest.slice() : [], muk: !0 === t.muk };
      } else r[e] = { shift: "", rest: [], muk: !1 };
    }),
      (e[s] = r),
      this.saveStaffing(e),
      this.setState({ mkNew: null }));
  }
  loadCsList() {
    try {
      const t = JSON.parse(localStorage.getItem("bassam_callsigns_v1"));
      if (Array.isArray(t)) return t.filter((t) => "string" == typeof t && t.trim());
    } catch (t) {}
    return [];
  }
  saveCsList(t) {
    const e = [];
    (t || []).forEach((t) => {
      const s = String(t || "").trim();
      s && -1 === e.indexOf(s) && e.push(s);
    });
    try {
      localStorage.setItem("bassam_callsigns_v1", JSON.stringify(e));
    } catch (t) {}
    this.setState({ csTick: (this.state.csTick || 0) + 1 });
  }
  csAdd() {
    const t = String(this.state.csNew || "").trim();
    if (!t) return;
    const e = this.loadCsList();
    if (-1 !== e.indexOf(t)) return (this.bsToast("الرمز موجود مسبقاً", "warn"), void this.setState({ csNew: "" }));
    (this.saveCsList(e.concat([t])), this.setState({ csNew: "" }));
  }
  csRename(t, e) {
    const s = String(e || "").trim();
    if (!s || s === t) return void this.setState({ csEdit: null });
    const r = this.loadCsList();
    if (-1 !== r.indexOf(s)) return void this.bsToast("الرمز موجود مسبقاً", "warn");
    this.saveCsList(r.map((e) => (e === t ? s : e)));
    const n = { ...this.state.staffing };
    (Object.keys(n).forEach((e) => {
      const r = { ...(n[e] || {}) };
      let i = !1;
      (Object.keys(r).forEach((e) => {
        r[e] && r[e].cs === t && ((r[e] = { ...r[e], cs: s }), (i = !0));
      }),
        i && (n[e] = r));
    }),
      this.saveStaffing(n),
      this.setState({ csEdit: null }));
  }
  csDel(t) {
    this.saveCsList(this.loadCsList().filter((e) => e !== t));
    const e = { ...this.state.staffing };
    (Object.keys(e).forEach((s) => {
      const r = { ...(e[s] || {}) };
      let n = !1;
      (Object.keys(r).forEach((e) => {
        r[e] && r[e].cs === t && ((r[e] = { ...r[e], cs: "" }), (n = !0));
      }),
        n && (e[s] = r));
    }),
      this.saveStaffing(e),
      this.setState({ csEdit: null }));
  }
  /* KIVO_265 · قرارُ المالك (2026-10-19): نوعُ العمل قائمةٌ مغلقة — «إداري» و«ميداني» فقط. كانت تُقرأ من bassam_options_v1 → options.work[] وتُضاف
     إليها قيمٌ حرّة وتُعاد تسميتُها وتُحذف؛ ومؤشّراتُ الإدارة والمهامُ والتقريرُ اليومي تطابق «ميداني» حرفياً فيخرج أيُّ نوعٍ آخر من الحساب بصمت. */
  wkFixed() {
    return ["ميدانيـ / ـة", "إداريـ / ـة"];   /* المسمّيان المعتمدان كما كانا في المنصة (بصيغة الجنسين) وبترتيبهما الأصلي */
  }
  loadWkOpts() {
    return this.wkFixed().slice();
  }
  /* يقبل الصيغةَ المعتمدة بالجنسين والصيغةَ المجرّدة القديمة (ميداني · إداري/اداري) ويعيد المسمّى المعتمد — أو "" لما ليس منهما */
  wkCanon(v) {
    var s = String(v == null ? "" : v).trim().replace(/\s*ـ?\s*\/\s*ـة\s*$/, "").replace(/ـ+$/, "").replace(/[يى]$/, "ي").replace(/^[أإا]د/, "إد");
    if (s === "ميداني") return "ميدانيـ / ـة";
    if (s === "إداري") return "إداريـ / ـة";
    return "";
  }
  wkFixedMsg() {
    this.bsToast("نوعُ العمل قائمةٌ ثابتة: ميدانيـ / ـة أو إداريـ / ـة — لا يُضاف ولا يُعدَّل ولا يُحذف", "warn");
  }
  saveWkOpts(t) {
    try {
      const e = localStorage.getItem("bassam_options_v1"),
        s = (e && JSON.parse(e)) || {},
        r = { type: Array.isArray(s.type) ? s.type : ["دائم", "موسمي", "متعاون"], work: t };
      localStorage.setItem("bassam_options_v1", JSON.stringify(r));
    } catch (t) {}
    this.setState({ wkTick: (this.state.wkTick || 0) + 1 });
  }
  wkSetEmp(t, e) {
    if (e && !this.wkCanon(e)) return void this.wkFixedMsg();   /* KIVO_265: لا قيمةَ خارج القائمة المغلقة */
    if (e) e = this.wkCanon(e);
    if (t) {
      try {
        const s = localStorage.getItem("bassam_employees_v1"),
          r = s ? JSON.parse(s) : [];
        if (Array.isArray(r)) {
          const s = r.map((s) => (s && s.eid === t ? { ...s, work: e } : s));
          localStorage.setItem("bassam_employees_v1", JSON.stringify(s));
        }
      } catch (t) {}
      this.setState({ wkOpen: null });
    }
  }
  wkAdd() {
    if (this.wkFixed()) return void this.wkFixedMsg();   /* KIVO_265: القائمةُ مغلقة */
    const t = String(this.state.wkNew || "").trim();
    if (!t) return;
    const e = this.loadWkOpts();
    if (-1 !== e.indexOf(t)) return (this.bsToast("الخيار موجود مسبقاً"), void this.setState({ wkNew: "" }));
    (this.saveWkOpts(e.concat([t])), this.setState({ wkNew: "" }));
  }
  wkRename(t, e) {
    if (this.wkFixed()) return void this.wkFixedMsg();   /* KIVO_265: القائمةُ مغلقة */
    const s = String(e || "").trim();
    if (!s || s === t) return void this.setState({ wkEdit: null });
    const r = this.loadWkOpts();
    if (-1 !== r.indexOf(s)) return void this.bsToast("الاسم الجديد مستخدم مسبقاً");
    this.saveWkOpts(r.map((e) => (e === t ? s : e)));
    let n = 0;
    try {
      const e = localStorage.getItem("bassam_employees_v1"),
        r = e ? JSON.parse(e) : [];
      if (Array.isArray(r)) {
        const e = r.map((e) => (e && e.work === t ? (n++, { ...e, work: s }) : e));
        localStorage.setItem("bassam_employees_v1", JSON.stringify(e));
      }
    } catch (t) {}
    (this.state.fWork === t && this.setState({ fWork: s }),
      this.setState({ wkEdit: null }),
      n && this.bsToast("رُحِّل الاسم الجديد إلى " + KIVO.BassamCount(n, "موظف", "g") + ""));
  }
  wkDel(t) {
    if (this.wkFixed()) return void this.wkFixedMsg();   /* KIVO_265: القائمةُ مغلقة */
    const e = this.loadWkOpts();
    if (e.length <= 1) return void this.bsToast("لا يُحذف آخر خيار — عدّله بدلاً من ذلك");
    const s = this.loadEmp().filter((e) => e && e.work === t).length;
    const go = () => {
      (this.saveWkOpts(e.filter((e) => e !== t)), this.state.fWork === t && this.setState({ fWork: "all" }));
    };
    s
      ? KIVO
          .bsConfirm({
            title: "حذف خيار مستعمل",
            msg:
              "يستخدم هذا الخيار " +
              KIVO.BassamCount(s, "موظف") +
              " — ستبقى القيمة مسجّلة " +
              KIVO.BassamCount.agr(s, "لديه", "لديهما", "لديهم") +
              " بعد الحذف. هل تريد حذف «" +
              t +
              "»؟",
            ok: "حذف الخيار",
            danger: !0,
          })
          .then((y) => {
            y && go();
          })
      : go();
  }
  setEntry(t, e) {
    const s = { ...this.state.staffing },
      r = this.monthKey(),
      n = { ...(s[r] || {}) };
    ((n[t] = { ...(n[t] || {}), ...e }), (s[r] = n), this.saveStaffing(s));
  }
  fmtClock(t) {
    const e = /^(\d{2}):(\d{2})$/.exec(t || "");
    if (!e) return "";
    const s = new Date(2e3, 0, 1, +e[1], +e[2]);
    try {
      return s.toLocaleTimeString("ar-SA-u-nu-latn", { hour: "2-digit", minute: "2-digit", hour12: !0 });
    } catch (e) {
      return t;
    }
  }
  shiftDurMins(t, e) {
    const s = /^(\d{2}):(\d{2})$/.exec(t || ""),
      r = /^(\d{2}):(\d{2})$/.exec(e || "");
    if (!s || !r) return null;
    const n = 60 * +s[1] + +s[2];
    let i = 60 * +r[1] + +r[2] - n;
    return (i <= 0 && (i += 1440), i);
  }
  fmtDur(t) {
    if (null == t) return "";
    const e = Math.floor(t / 60),
      s = t % 60;
    let r = "";
    1 === e ? (r = "ساعة واحدة") : 2 === e ? (r = "ساعتان") : e >= 3 && e <= 10 ? (r = e + " ساعات") : e > 10 && (r = e + " ساعة");
    let n = "";
    return (
      1 === s ? (n = "دقيقة واحدة") : 2 === s ? (n = "دقيقتان") : s >= 3 && s <= 10 ? (n = s + " دقائق") : s > 10 && (n = s + " دقيقة"),
      r && n ? r + " و" + n : r || n || "أقل من دقيقة"
    );
  }
  SD_W() {
    return 230;
  }
  SD_HEAD() {
    return 48;
  }
  _pkMeasure(t) {
    try {
      const e = t && (t.currentTarget || t.target);
      if (!e || !e.getBoundingClientRect) return null;
      const s = e.getBoundingClientRect(),
        r = window.innerWidth || 0,
        n = window.innerHeight || 0,
        i = n - s.bottom - 12,
        a = s.top - 12,
        o = i < 170 && a > i,
        l = Math.max(110, Math.min(n - 24, o ? a : i)),
        c = Math.max(64, Math.round(Math.min(210, l - this.SD_HEAD()))),
        p = this.SD_HEAD() + c;
      let h = s.right - this.SD_W();
      (h < 8 && (h = 8), h + this.SD_W() > r - 8 && (h = Math.max(8, r - 8 - this.SD_W())));
      let d = o ? s.top - p - 6 : s.bottom + 6;
      return ((d = Math.min(Math.max(8, d), Math.max(8, n - 8 - p))), { left: Math.round(h), top: Math.round(d), w: this.SD_W(), maxH: c });
    } catch (t) {
      return null;
    }
  }
  _pkListStyle(t) {
    const e =
      "z-index:60;background:var(--bg-xffffff);border:1px solid var(--bd-xe6e8eb);border-radius:12px;box-shadow:var(--shadow-elevated);overflow:hidden;text-align:right";
    return t
      ? "position:fixed;left:" + t.left + "px;top:" + t.top + "px;width:" + t.w + "px;" + e
      : "position:absolute;top:100%;right:0;left:0;margin-top:6px;" + e;
  }
  _pkFit(t, e) {
    try {
      const s = document.querySelector(t),
        r = this.state[e];
      if (!s || !r) return;
      const n = s.getBoundingClientRect(),
        i = window.innerHeight || 0,
        a = n.bottom - (i - 8);
      if (a <= 0 && n.top >= 8) return;
      let o = r.top,
        l = r.maxH;
      if (a > 0) {
        const t = Math.min(a, Math.max(0, o - 8));
        o -= t;
        const e = a - t;
        e > 0 && (l = Math.max(64, l - e));
      }
      if ((o < 8 && (o = 8), o !== r.top || l !== r.maxH)) {
        const t = {};
        ((t[e] = Object.assign({}, r, { top: Math.round(o), maxH: Math.round(l) })), this.setState(t));
      }
    } catch (t) {}
  }
  _pkScrollClose() {
    this._sdSc ||
      ((this._sdSc = () => {
        (this.state.sdOpen || this.state.pmOpen) && this.setState({ sdOpen: null, sdPos: null, pmOpen: null, pmPos: null });
      }),
      window.addEventListener("scroll", this._sdSc, !0),
      window.addEventListener("resize", this._sdSc, !0));
  }
  _sdCanSet() {
    return this._pcMemo("sdCanSet", () => {
      try {
        const t = KIVO.BassamPerm;
        return !(!(t && t.can && t.can("admin", "view")) || (t.subOn && !t.subOn("admin", "shifts")));
      } catch (t) {
        return !1;
      }
    });
  }
  hGreg(t, e, s) {
    let r = new Date(new Date(2026, 5, 16).getTime() + 864e5 * (29.5306 * (12 * (t - 1448) + (e - 1)) + (s - 1)));
    try {
      for (let n = 0; n < 12; n++) {
        const n = this.hParts(r);
        if (n.y === t && n.m === e && n.d === s) return r;
        const i = 354.367 * (n.y - t) + 29.5306 * (n.m - e) + (n.d - s);
        r = new Date(r.getTime() - 864e5 * (Math.round(i) || (i > 0 ? 1 : -1)));
      }
    } catch (t) {}
    return r;
  }
  hMonthDays(t, e) {
    const s = t + "-" + e;
    if (((this.__hd = this.__hd || {}), this.__hd[s])) return this.__hd[s];
    let r = 30;
    try {
      const s = this.hGreg(t, e, 1),
        n = this.hParts(new Date(s.getTime() + 25056e5));
      r = n.y === t && n.m === e ? 30 : 29;
    } catch (t) {}
    return ((this.__hd[s] = r), r);
  }
  hGregMonthLabel(t, e) {
    const s = t + "-" + e;
    if (((this.__hg = this.__hg || {}), this.__hg[s])) return this.__hg[s];
    let r = "";
    try {
      r = this.hGreg(t, e, 15).toLocaleDateString("ar-u-ca-gregory-nu-latn", { month: "long", year: "numeric" });
    } catch (t) {}
    return ((this.__hg[s] = r), r);
  }
  healOrphanShifts(t) {
    try {
      const e = {};
      t.forEach((t) => {
        t && t.name && (e[t.name] = 1);
      });
      const s = JSON.parse(localStorage.getItem("bassam_staffing_locks_v1") || "{}") || {},
        r = JSON.parse(localStorage.getItem("bassam_staffing_v3") || "{}") || {},
        n = this.curHijri();
      let i = !1;
      if (
        (Object.keys(r).forEach((a) => {
          if (!0 === s[a]) return;
          const o = String(a).split("-"),
            l = +o[0],
            c = +o[1];
          if (!l || !c) return;
          if ((l < n.y || (l === n.y && c < n.m)) && (!s[a] || "object" != typeof s[a] || !s[a].mo)) return;
          const p = r[a];
          p &&
            "object" == typeof p &&
            Object.keys(p).forEach((s) => {
              if (s === this.snapKey()) return;
              const r = p[s] && p[s].shift;
              r && !e[r] && ((e[r] = 1), t.push({ name: r, color: "#b99751" }), (i = !0));
            });
        }),
        i)
      )
        try {
          localStorage.setItem("bassam_shift_options_v1", JSON.stringify(t));
        } catch (t) {}
    } catch (t) {}
    return t;
  }
  loadShiftOpts() {
    this.__shiftRename = null;
    try {
      const t = localStorage.getItem("bassam_shift_options_v1");
      if (t) {
        let e = JSON.parse(t);
        if (Array.isArray(e) && e.length && e.every((t) => t && t.name && t.color)) {
          const t = ["الصباحية", "المسائية", "الليلية"];
          if (3 === e.length && e.every((e, s) => e.name === t[s])) {
            const t = { الصباحية: "الوردية الأولى", المسائية: "الوردية الثانية", الليلية: "الوردية الثالثة" };
            ((e = e.map((e) => ({ ...e, name: t[e.name] })).concat([{ name: "الوردية الرابعة", color: "#1e9a66" }])),
              localStorage.setItem("bassam_shift_options_v1", JSON.stringify(e)),
              (this.__shiftRename = t));
          }
          return this.healOrphanShifts(e);
        }
      }
    } catch (t) {}
    return this.healOrphanShifts([
      { name: "الوردية الأولى", color: "#b99751" },
      { name: "الوردية الثانية", color: "#2f8f86" },
      { name: "الوردية الثالثة", color: "#2f5f8a" },
      { name: "الوردية الرابعة", color: "#1e9a66" },
    ]);
  }
  filterDD(t, e, s, r) {
    const n = this.state,
      i = n[e],
      a = n.fddOpen === t,
      o = {};
    ((o[t + "Open"] = a), (o[t + "Toggle"] = () => this.setState((e) => ({ fddOpen: e.fddOpen === t ? null : t }))));
    const l = r.find((t) => t.v === i);
    return (
      (o[t + "Label"] = "all" === i ? s : l ? l.name : i),
      (o[t + "Chev"] = "transition:transform .2s;flex-shrink:0;opacity:.5;" + (a ? "transform:rotate(180deg)" : "")),
      (o[t + "BtnStyle"] =
        "height:32px;min-width:100px;font-size:11px;border-radius:8px;border:1px " +
        ("all" === i ? "dashed #cbd5e1;color:var(--fg-x475569)" : "solid rgba(185,151,81,0.5);color:var(--fg-x9a7e40);font-weight:400") +
        ";background:var(--bg-xffffff);padding:0 10px;cursor:pointer;font-family:'Cairo',sans-serif;display:inline-flex;align-items:center;justify-content:space-between;gap:6px" +
        (a ? ";box-shadow:0 0 0 2px rgba(185,151,81,0.15)" : "")),
      (o[t + "Opts"] = r.map((t) => ({
        name: t.name,
        selected: i === t.v,
        pick: () => this.setState({ [e]: t.v, fddOpen: null, page: 1, stSel: {} }),
        style:
          "display:flex;align-items:center;gap:9px;height:32px;padding:0 9px;border-radius:8px;font-size:11px;cursor:pointer;transition:background .12s;" +
          (i === t.v ? "background:var(--bg-a185151810p09);color:var(--fg-x9a7e40);font-weight:600" : "color:var(--fg-x141414)"),
      }))),
      o
    );
  }
  bsMenusPatch() {
    return {
      sdOpen: null,
      sdPos: null,
      csOpen: null,
      csEdit: null,
      csNew: "",
      wkOpen: null,
      wkEdit: null,
      wkNew: "",
      restOpen: null,
      permOpen: null,
      pmOpen: null,
      pmPos: null,
      fddOpen: null,
      mMenu: null,
      filesOpen: !1,
      fsOpen: !1,
    };
  }
  _bsOutsideMenus(t) {
    try {
      for (var e = t.target, s = !1; e && e !== document.body; ) {
        if (e.style && ("absolute" === e.style.position || "fixed" === e.style.position)) {
          s = !0;
          break;
        }
        e = e.parentElement;
      }
      var r = this,
        n = this.bsMenusPatch(),
        i = {};
      (Object.keys(n).forEach(function (t) {
        i[t] = r.state[t];
      }),
        setTimeout(function () {
          try {
            var t = !1,
              e = !1,
              a = r.state;
            if (
              (Object.keys(n).forEach(function (s) {
                (a[s] !== i[s] && (t = !0), a[s] && (e = !0));
              }),
              t || s || !e)
            )
              return;
            r.setState(n);
          } catch (t) {}
        }, 0));
    } catch (t) {}
  }
  _bsSig() {
    try {
      const K = [
        "bassam_staffing_v3",
        "bassam_employees_v1",
        "bassam_staffing_locks_v1",
        "bassam_shift_options_v1",
        "bassam_dreport_v1",
        "bassam_perms_v1",
        "bassam_options_v1",
        "bassam_callsigns_v1",
        "bassam_perm_tpls_v1",
      ];
      let o = "";
      for (const k of K) {
        const v = localStorage.getItem(k) || "";
        let h = 5381;
        for (let i = 0; i < v.length; i++) h = (h * 33 + v.charCodeAt(i)) | 0;
        o += v.length + ":" + h + ";";
      }
      return o;
    } catch (t) {
      return String(Date.now());
    }
  }
  componentWillUnmount() {
    try {
      window.removeEventListener("bs:ptab-shown", this._bsShown);
    } catch (t) {}
    (this._bsOutM && document.removeEventListener("click", this._bsOutM, !0),
      this._sdSc &&
        (window.removeEventListener("scroll", this._sdSc, !0), window.removeEventListener("resize", this._sdSc, !0), (this._sdSc = null)));
  }
  componentDidMount() {
    this._bsSigV = this._bsSig();
    this._bsShown = (t) => {
      try {
        if ("sched" === (t && t.detail)) {
          const g = this._bsSig();
          g !== this._bsSigV && ((this._bsSigV = g), this.setState({ _bsTick: Date.now() }));
        }
      } catch (t) {}
    };
    try {
      window.addEventListener("bs:ptab-shown", this._bsShown);
    } catch (t) {}
    ((this._bsOutM = (t) => this._bsOutsideMenus(t)), document.addEventListener("click", this._bsOutM, !0));
    try {
      const t = KIVO.BassamPerm;
      if (t && t.pruneOrphanEmpPerms) {
        const e = t.pruneOrphanEmpPerms();
        e && e.removed && this.setState({ permTick: (this.state.permTick || 0) + 1 });
      }
    } catch (t) {}
  }
  renderVals() {
    const t = this,
      e = this._stPermVals(),
      s = this.state,
      r = this.monthLockedS(s.year, s.month),
      n = this._stCanWrite(),
      i = r || !n,
      a = this.MONTHS.map((t, e) => {
        const r = this.curHijri(),
          n = e + 1,
          i = s.month === n,
          a = s.year === r.y && n === r.m,
          o = this.monthApprovedS(s.year, n),
          l = this.monthAutoLockedS(s.year, n),
          c = o || l;
        let p =
            "position:relative;width:100%;border-radius:12px;padding:8px;text-align:center;transition:all .2s;box-shadow:var(--shadow-card);cursor:pointer;box-sizing:border-box;font-family:'Cairo',sans-serif;border:1px ",
          h = "#53565a",
          d = "#cbd5e1",
          m = "—",
          f = !1,
          u = "M12 3a9 9 0 0 1 9 9",
          g = "M12 21a9 9 0 0 1-9-9";
        const y = this.hasLiveSched(s.year + "-" + n);
        return (
          o
            ? ((p +=
                (i ? "solid #008450;box-shadow:0 0 0 2px rgba(0,132,80,0.25);" : "solid rgba(0,132,80,0.35);") +
                "background:var(--bg-a0132800p07)"),
              (h = "#047857"),
              (d = "#047857"),
              (m = "معتمد"),
              (f = !0),
              (u = "M7 11V7a5 5 0 0 1 10 0v4"),
              (g = "M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z"))
            : l
              ? ((p +=
                  (i ? "solid #64748b;box-shadow:0 0 0 2px rgba(100,116,139,0.25);" : "solid rgba(100,116,139,0.35);") +
                  "background:var(--bg-a1001161390p08)"),
                (h = "#475569"),
                (d = "#475569"),
                (m = "انقضى — مقفل"),
                (f = !0),
                (u = "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"),
                (g = ""))
              : y
                ? ((p +=
                    (i ? "solid #b99751;box-shadow:0 0 0 2px rgba(185,151,81,0.3);" : "solid rgba(245,158,11,0.35);") +
                    "background:var(--bg-a245158110p08)"),
                  (h = i ? "#b99751" : "#b45309"),
                  (d = "#b45309"),
                  (m = "مسودة"),
                  (f = !0),
                  (u = "M7 11V7a5 5 0 0 1 9.9-1"),
                  (g = "M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z"))
                : i
                  ? ((p += "solid #b99751;box-shadow:0 0 0 2px rgba(185,151,81,0.3);background:var(--bg-a185151810p06)"),
                    (h = "#b99751"),
                    (d = "#cbd5e1"),
                    (m = "—"),
                    (f = !1))
                  : (p += "dashed #E1E1E1;background:var(--bg-a2452452450p7);opacity:.9"),
          {
            name: t,
            greg: this.gregOf(s.year, e),
            style: p,
            nameColor: h,
            footColor: d,
            footLabel: m,
            footP1: u,
            footP2: g,
            footIcon: f,
            isCurrent: a,
            hasData: y && !c,
            menuOpen: s.mMenu === n,
            delAll: (t) => {
              (t.stopPropagation(), this.PC("del") && this.setState({ mMenu: null, delMonth: { n: n } }));
            },
            /* الموجة 1 · IRSZ-4: «نقرة مزدوجة…» لمن يملك الاعتماد وحده — وغيرُه يُخبَر بالسبب نصّاً وعند النقر (كانت النقرةُ لا تفعل شيئاً بصمت) */
            tip: !this.PC("approve")
              ? o
                ? "الجدول معتمد ومقفل · فكُّ اعتماده يحتاج صلاحية الاعتماد"
                : l
                  ? "الشهر انقضى — مقفل · فتحه للاستدراك يحتاج صلاحية الاعتماد"
                  : this.monthPastS(s.year, n)
                    ? "مفتوح للاستدراك"
                    : y
                      ? "مسودة · اعتمادُ الجدول يحتاج صلاحية الاعتماد"
                      : "لا بيانات لهذا الشهر"
              : o
                ? "نقرة مزدوجة لفتح الجدول وإلغاء اعتماده"
                : l
                  ? "الشهر انقضى — مقفل · نقرة مزدوجة لفتحه ثم أضف الجدول"
                  : this.monthPastS(s.year, n) && y
                    ? "نقرة مزدوجة لاعتماد الجدول وإغلاقه — الاعتماد يفتح سحب التقارير اليومية"
                    : this.monthPastS(s.year, n)
                      ? "مفتوح للاستدراك — نقرة مزدوجة لإعادة قفله"
                      : y
                        ? "نقرة مزدوجة لاعتماد الجدول وإغلاقه — الاعتماد يفتح سحب التقارير اليومية"
                        : "لا بيانات لهذا الشهر — الاعتماد يتطلب بيانات",
            click: () => this.setState({ month: n, restOpen: null, sdOpen: null, stSel: {} }),
            dbl: () => {
              this.PC("approve") || !(this.monthPastS(s.year, n) || y || c) || this.permDeny();
              this.PC("approve") &&
                (this.monthPastS(s.year, n)
                  ? this.setState({ month: n, restOpen: null, sdOpen: null, stSel: {} }, () => {
                      if (!this.monthOpenFlagS(s.year, n))
                        return o
                          ? void this.setState({ lockConfirm: { n: n, locked: !0 } })
                          : void this.setState({ retroAsk: { m: n, open: !0 } });
                      !o && y ? this.setState({ lockConfirm: { n: n, locked: !1 } }) : this.setState({ retroAsk: { m: n, open: !1 } });
                    })
                  : (y || c) && this.setState({ month: n, restOpen: null, sdOpen: null, stSel: {}, lockConfirm: { n: n, locked: c } }));
            },
          }
        );
      }),
      o = this.loadEmp(),
      l = new Date().toLocaleDateString("ar-SA-u-nu-latn", { weekday: "long" }),
      c = (t) => t.some((t) => t === l || "ال" + t === l || t === "ال" + l),
      p = this.shiftDefsFor(this.monthKey());
    let h = o.map((t) => {
      const e = this.entryOf(t),
        r = (() => {
          try {
            const e = KIVO.BassamPerm;
            if (!e || !e.empPerms) return [];
            const s = KIVO.BassamEmp && KIVO.BassamEmp.key ? KIVO.BassamEmp.key(t) : t.eid || "",
              r = e.empPerms(s) || {};
            return Object.keys(r).map((t) => (e.nameOf ? e.nameOf(t) : t));
          } catch (t) {
            return [];
          }
        })(),
        n = (() => {
          try {
            const e = KIVO.BassamPerm;
            if (!e || !e.tplOfEmp) return "";
            const s = KIVO.BassamEmp && KIVO.BassamEmp.key ? KIVO.BassamEmp.key(t) : t.eid || "",
              o = e.tplOfEmp(s);
            if (!o) return "";
            const a = (e.tplsList ? e.tplsList() : []).find((t) => t.id === o);
            return a ? a.name || "" : "";
          } catch (t) {
            return "";
          }
        })(),
        i = KIVO.BassamEmp && KIVO.BassamEmp.key ? KIVO.BassamEmp.key(t) : t.eid || "",
        a = (() => {
          try {
            const t = KIVO.BassamAuth;
            return !!(t && t.staffMap && t.staffMap()[i]);
          } catch (t) {
            return !1;
          }
        })();
      return {
        sel: !!s.stSel[i],
        selTog: () => this.setState((t) => ({ stSel: { ...t.stSel, [i]: !t.stSel[i] } })),
        ekeyPm: i,
        hasAcct: a,
        tplName: n,
        type: t.type || "",
        gender: t.gender || "",
        work: t.work || "",
        nid: t.nid || "",
        eid: t.eid || "",
        name: t.name || "",
        empno: t.empno || "",
        phone: t.phone || "",
        shift: e.shift,
        muk: e.muk,   /* KIVO_247 (ESLint no-dupe-keys): كان rest مكرَّراً؛ القيمةُ النافذة هي المطبَّعة أدناه */
        leaves: Array.isArray(e.leaves) ? e.leaves : [],
        perm: e.perm || [],
        cs: e.cs || "",
        onRest: c(e.rest),
        rest: Array.isArray(e.rest) ? e.rest : [],
        restKey: this.WEEKDAYS.filter((t) => (Array.isArray(e.rest) ? e.rest : []).indexOf(t) >= 0).join("|"),
        permsList: r,
      };
    });
    const d = h.length,
      m = h.filter((t) => !(!t.hasAcct || (t.permsList && t.permsList.length))).length,
      f = h.filter((t) => !t.hasAcct).length;
    if (
      (String(s.search || "").trim() &&
        (h = KIVO.BassamFind.filter(s.search, h, (t) => [t.name, t.nid, t.phone, t.empno, t.cs, t.shift, (t.permsList || []).join(" ")])),
      "on" === s.fMuk && (h = h.filter((t) => t.muk)),
      "off" === s.fMuk && (h = h.filter((t) => !t.muk)),
      s.fRest && "all" !== s.fRest && (h = h.filter((t) => t.restKey === ("__none__" === s.fRest ? "" : s.fRest))),
      "none" === s.fShift ? (h = h.filter((t) => !t.shift)) : "all" !== s.fShift && (h = h.filter((t) => t.shift === s.fShift)),
      "__na" === s.fWork
        ? (h = h.filter((t) => !String(t.work || "").trim()))
        : s.fWork && "all" !== s.fWork && (h = h.filter((t) => String(t.work || "").trim() === s.fWork)),
      "none" === s.fPerm)
    )
      h = h.filter((t) => !(!t.hasAcct || (t.permsList && t.permsList.length)));
    else if ("noacct" === s.fPerm) h = h.filter((t) => !t.hasAcct);
    else if (s.fPerm && "all" !== s.fPerm) {
      const t = String(s.fPerm).slice(4);
      h = h.filter((e) => e.tplName === t);
    }
    const u = {};
    p.forEach((t) => {
      const e = /^(\d{2}):(\d{2})$/.exec(t.tStart || "");
      u[t.name] = e ? 60 * +e[1] + +e[2] : null;
    });
    const g = (t) => {
        if (!t.shift) return 2;
        return null == u[t.shift] ? 1 : 0;
      },
      y = (t) => (t.permsList && t.permsList.length ? 0 : t.hasAcct ? 1 : 2),
      b = (() => {
        try {
          const t = JSON.parse(localStorage.getItem("bassam_perm_tpls_v1"));
          return Array.isArray(t) ? t : [];
        } catch (t) {
          return [];
        }
      })(),
      k = (t) =>
        Object.keys(t || {})
          .filter((e) => (t[e] || []).length)
          .sort()
          .map((e) => e + ":" + (t[e] || []).slice().sort().join(","))
          .join("|"),
      S =
        ((() => {
          try {
            const t = KIVO.BassamPerm;
            return t ? t.deptCap() : [];
          } catch (t) {
            return [];
          }
        })(),
        b.map((t) => {
          const e = KIVO.BassamPerm;
          return e && e.tplSig ? e.tplSig(t.perms) : k(t.perms || {});
        })),
      w = (t) => {
        try {
          const e = KIVO.BassamPerm;
          if (!e || !e.empPerms || !t) return 99;
          const s = k(e.empPerms(t) || {});
          if (!s) return 99;
          const r = e.empTpl ? e.empTpl(t) : "";
          if (r) {
            const t = b.findIndex((t) => t.id === r);
            if (-1 !== t) return t;
          }
          const n = S.indexOf(s);
          return -1 === n ? 98 : n;
        } catch (t) {
          return 99;
        }
      };
    String(s.search || "").trim() ||
      h.sort((t, e) => {
        const s = y(t),
          r = y(e);
        if (s !== r) return s - r;
        const n = w(t.ekeyPm),
          i = w(e.ekeyPm);
        if (n !== i) return n - i;
        const a = g(t),
          o = g(e);
        return a !== o
          ? a - o
          : 0 === a && u[t.shift] !== u[e.shift]
            ? u[t.shift] - u[e.shift]
            : 1 === a && t.shift !== e.shift
              ? t.shift.localeCompare(e.shift, "ar")
              : t.name.localeCompare(e.name, "ar");
      });
    const St9P = this.stGrpPref(),
      St9On = !1 !== St9P.on && !String(s.search || "").trim(),
      St9D = { "": { t: "بلا وردية", c: "#94a3b8", sub: "لم تُسنَد لهم وردية في هذا الشهر" } },
      St9O = {},
      St9N = {};
    p.forEach((r) => {
      r &&
        r.name &&
        (St9D[r.name] = {
          t: r.name,
          c: r.color || "#94a3b8",
          sub:
            r.tStart && r.tEnd
              ? this.fmtClock(r.tStart) + " – " + this.fmtClock(r.tEnd) + " · " + this.fmtDur(this.shiftDurMins(r.tStart, r.tEnd))
              : "",
        });
    });
    p.map((r) => r && r.name)
      .filter(Boolean)
      .sort((r, a) => {
        const l = null == u[r] ? 1 : 0,
          c = null == u[a] ? 1 : 0;
        return l !== c ? l - c : 0 === l && u[r] !== u[a] ? u[r] - u[a] : String(r).localeCompare(String(a), "ar");
      })
      .concat([""])
      .forEach((r, a) => {
        null == St9O[r] && (St9O[r] = a);
      });
    const St9I = (r) => (null != St9O[r] ? St9O[r] : 1e3);
    if (St9On) {
      const r = h.map((r, a) => [r, a]);
      (r.sort((r, a) => St9I(r[0].shift || "") - St9I(a[0].shift || "") || r[1] - a[1]), (h = r.map((r) => r[0])));
    }
    h.forEach((r) => {
      const a = r.shift || "";
      St9N[a] = (St9N[a] || 0) + 1;
    });
    const St9C = String(10 + (e.bsPtplOn ? 1 : 0)),
      St9H = (r, a) => {
        if (!St9On || (a && a.grpK === r.grpK)) return { grpHeadOn: !1 };
        const l = St9D[r.grpK] || St9D[""],
          c = !(!St9P.closed || !St9P.closed[r.grpK]);
        return {
          grpHeadOn: !0,
          grpTitle: l.t,
          grpColor: l.c,
          grpSub: l.sub,
          grpN: String(St9N[r.grpK] || 0),
          grpChev:
            "margin-right:auto;color:var(--fg-x94a3b8);font-size:11px;transition:transform .15s;display:inline-block;" +
            (c ? "transform:rotate(-90deg)" : ""),
          grpTip: c ? "فرد المجموعة" : "طيّ المجموعة",
          grpToggle: ((r) => (a) => {
            try {
              a.stopPropagation();
            } catch (x) {}
            this.stGrpToggle(r);
          })(r.grpK),
          grpCols: St9C,
        };
      };
    const x = {},
      v = {};
    (this.WEEKDAYS.forEach((t) => {
      x[t] = 0;
    }),
      o.forEach((t) => {
        const e = this.entryOf(t).rest;
        e.forEach((t) => {
          void 0 !== x[t] && x[t]++;
        });
        const s = this.WEEKDAYS.filter((t) => e.indexOf(t) >= 0).join("|");
        v[s] = (v[s] || 0) + 1;
      }));
    const O = this.loadCsList(),
      E = this.loadWkOpts(),
      _ = (() => {
        try {
          const t = KIVO.BassamHijri.now(new Date());
          return +t.y === +s.year && +t.m === +s.month;
        } catch (t) {
          return !1;
        }
      })(),
      P = h.map((e) => {
        const n = s.sdOpen === this.empKey(e),
          a = s.csOpen === this.empKey(e),
          o = s.wkOpen === this.empKey(e),
          l = p.find((t) => t.name === e.shift),
          c = s.shiftOpts.map((t) => ({
            name: t.name,
            color: t.color,
            selected: e.shift === t.name,
            pick: () => {
              (this.setEntry(this.empKey(e), { shift: t.name }), this.setState({ sdOpen: null }));
            },
            style:
              "display:flex;align-items:center;gap:9px;height:32px;padding:0 9px;border-radius:8px;font-size:11px;cursor:pointer;transition:background .12s;" +
              (e.shift === t.name
                ? "background:var(--bg-a185151810p09);color:var(--fg-x9a7e40);font-weight:600"
                : "color:var(--fg-x141414)"),
          })),
          h = e.rest.map((t) => ({
            name: t,
            tip: i ? (r ? "الشهر مقفل" : "عرض فقط") : "اضغط للحذف",
            remove: i ? () => {} : () => this.setEntry(this.empKey(e), { rest: e.rest.filter((e) => e !== t) }),
            style:
              "display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:6px;font-size:9px;font-weight:400;background:var(--bg-a245158110p1);color:var(--fg-xb45309);border:1px solid var(--bd-a245158110p25);transition:all .15s" +
              (r ? ";opacity:.55" : ";cursor:pointer"),
          })),
          d = this.WEEKDAYS.map((t) => {
            const s = e.rest.includes(t),
              r = x[t];
            return {
              name: t.replace("ال", "") + " (" + r + ")",
              tip: t + ": " + r + " " + (1 === r ? "راحة" : "راحات"),
              toggle: () => {
                i ||
                  (!s && e.rest.length >= 2) ||
                  this.setEntry(this.empKey(e), { rest: s ? e.rest.filter((e) => e !== t) : [...e.rest, t] });
              },
              style:
                "height:26px;padding:0 9px;border-radius:8px;font-size:10px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif;transition:all .15s;border:1px solid " +
                (s
                  ? "rgba(245,158,11,0.4);background:var(--bg-a245158110p12);color:var(--fg-xb45309)"
                  : "#E1E1E1;background:var(--bg-xffffff);color:var(--fg-x53565a)"),
            };
          }),
          m = e.perm || [],
          f = this.state.permLimit,
          u = m.length >= f,
          g = m.map((t) => ({
            txt: "⏱ " + String(t),
            tip: "استئذان يوم " + t + " " + this.MONTHS[s.month - 1] + " " + s.year + " هـ — يُدار من «التقرير اليومي»",
            remove: () => {},
            style:
              "display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:6px;font-size:9.5px;font-weight:600;font-feature-settings:'tnum';background:var(--bg-a185151810p12);color:var(--fg-x8a6f35);border:1px solid var(--bd-a185151810p35);transition:all .15s" +
              (i ? ";opacity:.55" : ";cursor:pointer"),
          })),
          y = (() => {
            const t = [],
              r = this.hMonthDays(s.year, s.month);
            for (let s = 1; s <= r; s++) {
              const r = -1 !== m.indexOf(s),
                n = !r && u;
              t.push({
                n: String(s),
                tip: n ? "اكتمل نصاب الشهر — احذف يوماً أولاً" : r ? "مسجّل — اضغط للإلغاء" : "اضغط لتسجيل الاستئذان",
                toggle: () => {
                  i || n || this.permToggleDay(this.empKey(e), s, m);
                },
                style:
                  "height:25px;border-radius:7px;font-size:10px;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';display:flex;align-items:center;justify-content:center;transition:all .15s;border:1px solid " +
                  (r
                    ? "rgba(185,151,81,0.55);background:var(--bg-a185151810p14);color:var(--fg-x8a6f35);font-weight:700;cursor:pointer"
                    : n
                      ? "#E1E1E1;background:var(--bg-xffffff);color:var(--fg-xcbd5e1);cursor:not-allowed;opacity:.45"
                      : "#E1E1E1;background:var(--bg-xffffff);color:var(--fg-x53565a);cursor:pointer"),
              });
            }
            return t;
          })(),
          b = this.lvActiveToday(e.leaves);
        return {
          ...e,
          initial: e.name.trim().charAt(0),
          typeD: e.type || "—",
          typeTip: e.type
            ? "نوع التوظيف: " + e.type + " — يُعدَّل من صفحة بيانات الموظفين"
            : "لم يُحدَّد نوع توظيف لهذا الموظف — يُضبط من صفحة بيانات الموظفين",
          typeStyle: "font-size:12px;font-weight:400;font-family:'Cairo',sans-serif;color:var(--fg-x141414)",
          phoneD: e.phone || "—",
          idLine:
            "الرقم الوظيفي: " +
            (e.empno || "—") +
            " · الجوال: " +
            (e.phone || "—") +
            " · نوع التوظيف: " +
            (e.type || "—") +
            " · الجنس: " +
            (e.gender || "—") +
            " — تُعدّل من صفحة بيانات الموظفين",
          genderD: e.gender || "—",
          genderTip: e.gender
            ? "الجنس: " + e.gender + " — يُعدَّل من صفحة بيانات الموظفين"
            : "لم يُحدَّد جنس لهذا الموظف — يُضبط من صفحة بيانات الموظفين",
          genderStyle:
            "display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;font-family:'Cairo',sans-serif;padding:2px 10px;border-radius:9999px;white-space:nowrap;" +
            ("ذكر" === e.gender
              ? "background:var(--bg-a31051610p1);color:var(--fg-x0369a1);border:1px solid var(--bd-a31051610p28)"
              : "أنثى" === e.gender
                ? "background:var(--bg-a19024930p1);color:var(--fg-xbe185d);border:1px solid var(--bd-a19024930p28)"
                : "background:var(--bg-a1481631840p1);color:var(--fg-x94a3b8);border:1px solid var(--bd-a1481631840p26)"),
          empnoDisp: e.empno || "—",
          wkOpen: o,
          wkLabel: (String(e.work || "").trim() || "غير محدد") + (String(e.work || "").trim() && !this.wkCanon(e.work) ? " · غير معتمد" : ""),   /* KIVO_265: قيمةٌ قديمة خارج القائمة المغلقة */
          wkLockedView: i,
          wkCanEdit: !i,
          wkHas: !!String(e.work || "").trim(),
          wkNo: !String(e.work || "").trim(),
          wkTipU: i
            ? (String(e.work || "").trim() || "غير محدد") + " — " + (r ? "الشهر معتمد ومقفل — الشاشة للعرض" : "صلاحيتك على الجدول عرضٌ فقط")
            : String(e.work || "").trim()
              ? String(e.work).trim() + (!this.wkCanon(e.work) ? " — نوعٌ غير معتمد: اختر «ميدانيـ / ـة» أو «إداريـ / ـة»" : " — اضغط للتغيير")
              : "لم يُحدَّد نوع العمل — اضغط للاختيار",
          wkTxtStyle: KIVO.BassamPick.txt(!i, o),
          wkPlusStyle: KIVO.BassamPick.plus(!i, o),
          wkReadTip: r ? "الشهر معتمد ومقفل — الشاشة للعرض" : "صلاحيتك على الجدول عرضٌ فقط",
          wkReadStyle:
            "width:100%;height:32px;display:flex;align-items:center;justify-content:center;gap:6px;padding:0 2px;font-size:11px;font-weight:400;font-family:'Cairo',sans-serif;color:" +
            (String(e.work || "").trim() ? "#141414" : "#94a3b8") +
            ";box-sizing:border-box",
          wkBtnStyle:
            "width:100%;height:34px;border:1px solid " +
            (o ? "var(--bd-xb99751)" : "var(--bd-xe1e1e1)") +
            ";border-radius:9px;padding:0 26px;font-size:11px;font-weight:400;font-family:'Cairo',sans-serif;background:var(--bg-xffffff);box-sizing:border-box;position:relative;display:flex;align-items:center;justify-content:center;gap:8px;text-align:center;color:" +
            (String(e.work || "").trim() ? "#141414" : "#94a3b8") +
            (o ? ";box-shadow:0 0 0 3px rgba(185,151,81,0.14)" : "") +
            ";cursor:pointer;transition:border-color .15s,box-shadow .15s",
          wkChev:
            "position:absolute;left:9px;top:50%;margin-top:-6px;transition:transform .2s;flex-shrink:0;opacity:.5;" +
            (o ? "transform:rotate(180deg)" : ""),
          wkShowList: o,
          wkGo: i
            ? () => this.bsToast(r ? "الشهر معتمد ومقفل — الشاشة للعرض" : "صلاحيتك على الجدول عرضٌ فقط", "warn")
            : () =>
                this.setState((t) => ({
                  wkOpen: t.wkOpen === this.empKey(e) ? null : this.empKey(e),
                  wkNew: "",
                  wkEdit: null,
                  sdOpen: null,
                  sdPos: null,
                  csOpen: null,
                  restOpen: null,
                })),
          wkToggle: i
            ? () => {}
            : () =>
                this.setState((t) => ({
                  wkOpen: t.wkOpen === this.empKey(e) ? null : this.empKey(e),
                  wkNew: "",
                  wkEdit: null,
                  sdOpen: null,
                  sdPos: null,
                  csOpen: null,
                  restOpen: null,
                })),
          wkClear: () => {
            this.wkSetEmp(e.eid, "");
          },
          wkClearStyle:
            "display:flex;align-items:center;gap:9px;height:32px;padding:0 9px;border-radius:8px;font-size:11px;cursor:pointer;transition:background .12s;" +
            (String(e.work || "").trim()
              ? "color:var(--fg-x53565a)"
              : "background:var(--bg-a2452452450p8);color:var(--fg-x334155);font-weight:400"),
          wkNoneSel: !String(e.work || "").trim(),
          wkAdd: () => this.wkAdd(),
          wkOpts: E.map((t) => ({
            name: t,
            selected: (this.wkCanon(e.work) || String(e.work || "").trim()) === t,
            editing: !(!s.wkEdit || s.wkEdit.old !== t),
            draft: s.wkEdit && s.wkEdit.old === t ? s.wkEdit.val : t,
            onDraft: (e) => this.setState({ wkEdit: { old: t, val: e.target.value } }),
            onDraftKey: (e) => {
              ("Enter" === e.key && this.wkRename(t, (this.state.wkEdit || {}).val), "Escape" === e.key && this.setState({ wkEdit: null }));
            },
            save: (e) => {
              (e.stopPropagation(), this.wkRename(t, (this.state.wkEdit || {}).val));
            },
            stop: (e) => e.stopPropagation(),
            pick: () => {
              (s.wkEdit && s.wkEdit.old === t) || this.wkSetEmp(e.eid, t);
            },
            edit: (e) => {
              (e.stopPropagation(), this.setState({ wkEdit: { old: t, val: t } }));
            },
            del: (e) => {
              (e.stopPropagation(), this.wkDel(t));
            },
            style:
              "display:flex;align-items:center;gap:9px;height:32px;padding:0 9px;border-radius:8px;font-size:11px;cursor:pointer;transition:background .12s;" +
              (String(e.work || "").trim() === t
                ? "background:var(--bg-a185151810p09);color:var(--fg-x9a7e40);font-weight:600"
                : "color:var(--fg-x141414)"),
          })),
          wkEmpty: !E.length,
          permsTxt: e.tplName || "—",
          pmHas: !!e.tplName,
          pmNo: !e.tplName && !!e.hasAcct,
          pmNoAcct: !e.tplName && !e.hasAcct,
          pmNoAcctStyle: "font-size:11.5px;font-weight:400;font-family:'Cairo',sans-serif;color:var(--fg-xcbd5e1);white-space:nowrap",
          pmTxtStyle: KIVO.BassamPick.txt(
            !i && !!e.hasAcct && (this.PCE("edit") || (KIVO.BassamAuth && KIVO.BassamAuth.isSuper && KIVO.BassamAuth.isSuper())),
            s.pmOpen === e.ekeyPm,
          ),
          pmPlusStyle: KIVO.BassamPick.plus(
            !i && !!e.hasAcct && (this.PCE("edit") || (KIVO.BassamAuth && KIVO.BassamAuth.isSuper && KIVO.BassamAuth.isSuper())),
            s.pmOpen === e.ekeyPm,
          ),
          pmGo:
            ((k = e.ekeyPm),
            (S =
              !i && !!e.hasAcct && (this.PCE("edit") || (KIVO.BassamAuth && KIVO.BassamAuth.isSuper && KIVO.BassamAuth.isSuper()))),
            (w = i
              ? r
                ? "الشهر معتمد ومقفل — الشاشة للعرض"
                : "صلاحيتك على الجدول عرضٌ فقط"
              : e.hasAcct
                ? "صلاحيتك لا تشمل تعديل صلاحيات الموظفين"
                : "لا حساب دخول لهذا الموظف — فعّله من صفحة الموظفين ثم اضبط صلاحياته"),
            function (e) {
              S ? t.pmGoOpen(k, e) : t.bsToast(w, "warn");
            }),
          pmShowList: s.pmOpen === e.ekeyPm,
          pmListStyle: this._pkListStyle(s.pmOpen === e.ekeyPm ? s.pmPos : null),
          pmScrollStyle:
            "max-height:" + (s.pmOpen === e.ekeyPm && s.pmPos ? Math.max(64, s.pmPos.maxH) : 180) + "px;overflow-y:auto;padding:5px",
          pmNoneSel: !e.tplName,
          pmClear: (function (e, s) {
            return function () {
              t.pmPick(e, s, "");
            };
          })(e.ekeyPm, e.name),
          pmClearStyle:
            "display:flex;align-items:center;gap:9px;height:32px;padding:0 9px;border-radius:8px;font-size:11px;cursor:pointer;transition:background .12s;" +
            (e.tplName ? "color:var(--fg-x53565a)" : "background:var(--bg-a2452452450p8);color:var(--fg-x334155);font-weight:400"),
          pmOpts: (s.pmOpen === e.ekeyPm ? this.PERM_TPLS() : [])
            .filter(function (s) {
              var c = KIVO.BassamPerm && KIVO.BassamPerm.tplCut ? KIVO.BassamPerm.tplCut(s.perms || {}) : s.perms || {};
              return Object.keys(c).some(function (k) {
                return (c[k] || []).length;
              });
            })
            .map(function (s) {
              var r = s.id === t._pmTplOf(e.ekeyPm),
                n = Object.keys(
                  KIVO.BassamPerm && KIVO.BassamPerm.tplCut ? KIVO.BassamPerm.tplCut(s.perms || {}) : s.perms || {},
                ).length;
              return {
                name: s.name,
                selected: r,
                metaTxt: n ? KIVO.BassamCount(n, "ورقة") + "" : "فارغ",
                metaStyle:
                  "font-size:9.5px;font-weight:400;white-space:nowrap;flex-shrink:0;color:" +
                  (n ? "var(--fg-x94a3b8)" : "var(--fg-xb45309)"),
                supOn: !(!KIVO.BassamSup || !KIVO.BassamSup.isSupTpl(s)),
                pick: function () {
                  t.pmPick(e.ekeyPm, e.name, s.id);
                },
                style:
                  "display:flex;align-items:center;gap:8px;height:32px;padding:0 9px;border-radius:8px;font-size:11px;cursor:pointer;transition:background .12s;" +
                  (r ? "background:var(--bg-a185151810p09);color:var(--fg-x9a7e40);font-weight:600" : "color:var(--fg-x141414)"),
              };
            }),
          pmEmptyOn: s.pmOpen === e.ekeyPm && 0 === this.PERM_TPLS().length,
          pmSrcTxt: "تُعرَّف القوالب في الإعدادات ← قوالب الصلاحيات",
          pmSrcLink: this._pmCanSet(),
          pmSrcGo: this._pmCanSet()
            ? () => {
                this.setState({ pmOpen: null, pmPos: null });
                try {
                  KIVO.BassamNav.go("admin");
                } catch (t) {}
              }
            : null,
          pmSrcStyle:
            "display:flex;align-items:center;gap:6px;padding:7px 9px;border-bottom:1px solid var(--bd-xf1f5f9);background:var(--bg-xfafafa);font-size:10px;font-weight:600;color:" +
            (this._pmCanSet() ? "#9A7E40;cursor:pointer" : "#94a3b8"),
          permsStyle:
            (e.tplName ? "color:var(--fg-x141414);" : "color:var(--fg-xcbd5e1);") +
            "font-size:12px;font-weight:400;font-family:'Cairo',sans-serif;" +
            (!i && e.hasAcct && (this.PCE("edit") || (KIVO.BassamAuth && KIVO.BassamAuth.isSuper && KIVO.BassamAuth.isSuper()))
              ? "cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;text-decoration-color:var(--fg-a185151810p55)"
              : ""),
          permsTip: e.tplName
            ? e.tplName
            : i
              ? (e.permsList && e.permsList.length ? "الصفحات: " + e.permsList.join(" · ") : "بلا صلاحيات") +
                (r ? " · الشهر معتمد ومقفل — الشاشة للعرض" : " · صلاحيتك على الجدول عرضٌ فقط")
              : e.permsList && e.permsList.length
                ? "الصفحات: " + e.permsList.join(" · ") + " · اضغط للتعديل أو الحذف"
                : e.hasAcct
                  ? "لا صلاحيات ممنوحة لهذا الموظف — اضغط لمنحها"
                  : "لا حساب دخول لهذا الموظف — فعّله من صفحة الموظفين ثم اضبط صلاحياته",
          avatarBg: b ? "rgba(14,116,144,0.5)" : e.onRest ? "rgba(185,151,81,0.45)" : "#b99751",
          dot: b ? "#22d3ee" : e.onRest ? "#fbbf24" : "#10b981",
          rowBg:
            (b ? "background:var(--bg-a2362542550p5)" : e.onRest ? "background:var(--bg-a2552512350p4)" : "") +
            (St9On && St9P.closed && St9P.closed[e.shift || ""] ? ";display:none" : ""),
          grpK: e.shift || "",
          status: b
            ? b.kind || "إجازة"
            : e.onRest
              ? "راحة"
              : KIVO.BassamDay && KIVO.BassamDay.availTxt
                ? KIVO.BassamDay.availTxt(e.shift, _)
                : "متاح",
          statusColor: b ? "#0e7490" : e.onRest ? "#d97706" : "#059669",
          statusTip: e.onRest ? "في راحة اليوم" : "متاح للعمل",
          onLeaveNow: !!b,
          sdOpen: n,
          sdLabel: e.shift || "بدون تسكين",
          sdDot: l ? l.color : "#cbd5e1",
          sdChev:
            "position:absolute;left:9px;top:50%;margin-top:-6px;transition:transform .2s;flex-shrink:0;opacity:.5;" +
            (n ? "transform:rotate(180deg)" : ""),
          sdBtnStyle:
            "width:100%;height:34px;border:1px solid " +
            (n ? "var(--bd-xb99751)" : "var(--bd-xe1e1e1)") +
            ";border-radius:9px;padding:0 26px;font-size:11px;font-weight:400;font-family:'Cairo',sans-serif;background:var(--bg-xffffff);box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:7px;position:relative;color:" +
            (e.shift ? "var(--fg-x141414)" : "var(--fg-x94a3b8)") +
            (n ? ";box-shadow:0 0 0 3px rgba(185,151,81,0.14)" : "") +
            ";cursor:pointer;transition:border-color .15s,box-shadow .15s",
          sdCanEdit: !i,
          sdLockedView: i,
          sdHas: !!e.shift,
          sdNo: !e.shift,
          sdTipU: i
            ? (e.shift || "بدون تسكين") + " — " + (r ? "الشهر معتمد ومقفل — الشاشة للعرض" : "صلاحيتك على الجدول عرضٌ فقط")
            : e.shift
              ? e.shift + " — اضغط للتغيير"
              : "بدون وردية — اضغط لإسناد وردية",
          sdTxtStyle: KIVO.BassamPick.txt(!i, n),
          sdPlusStyle: KIVO.BassamPick.plus(!i, n),
          sdGo: i
            ? () => this.bsToast(r ? "الشهر معتمد ومقفل — الشاشة للعرض" : "صلاحيتك على الجدول عرضٌ فقط", "warn")
            : (t) => {
                const s = this._pkMeasure(t);
                (this._pkScrollClose(),
                  this.setState(
                    (t) => ({ sdOpen: t.sdOpen === this.empKey(e) ? null : this.empKey(e), sdPos: s, restOpen: null }),
                    () => {
                      try {
                        requestAnimationFrame(() => this._pkFit('[data-sd="list"]', "sdPos"));
                      } catch (t) {
                        this._pkFit('[data-sd="list"]', "sdPos");
                      }
                    },
                  ));
              },
          sdReadStyle:
            "width:100%;height:32px;display:flex;align-items:center;justify-content:center;gap:6px;padding:0 2px;font-size:11px;font-weight:400;font-family:'Cairo',sans-serif;color:" +
            (e.shift ? "var(--fg-x141414)" : "var(--fg-x94a3b8)") +
            ";box-sizing:border-box",
          sdToggle: i
            ? () => {}
            : (t) => {
                const s = this._pkMeasure(t);
                (this._pkScrollClose(),
                  this.setState(
                    (t) => ({ sdOpen: t.sdOpen === this.empKey(e) ? null : this.empKey(e), sdPos: s, restOpen: null }),
                    () => {
                      try {
                        requestAnimationFrame(() => this._pkFit('[data-sd="list"]', "sdPos"));
                      } catch (t) {
                        this._pkFit('[data-sd="list"]', "sdPos");
                      }
                    },
                  ));
              },
          sdClear: () => {
            (this.setEntry(this.empKey(e), { shift: "" }), this.setState({ sdOpen: null }));
          },
          sdClearStyle:
            "display:flex;align-items:center;gap:9px;height:32px;padding:0 9px;border-radius:8px;font-size:11px;cursor:pointer;transition:background .12s;" +
            (e.shift ? "color:var(--fg-x53565a)" : "background:var(--bg-a2452452450p8);color:var(--fg-x334155);font-weight:400"),
          sdNoneSel: !e.shift,
          csLabel: e.cs || "بدون رمز",
          csLockedView: i,
          csCanEdit: !i,
          csHas: !!e.cs,
          csNo: !e.cs,
          csTipU: i
            ? (e.cs || "بدون رمز") + " — " + (r ? "الشهر معتمد ومقفل — الشاشة للعرض" : "صلاحيتك على الجدول عرضٌ فقط")
            : e.cs
              ? e.cs + " — اضغط للتغيير"
              : "بدون رمز نداء — اضغط للاختيار",
          csTxtStyle: KIVO.BassamPick.txt(!i, a),
          csPlusStyle: KIVO.BassamPick.plus(!i, a),
          csGo: i
            ? () => this.bsToast(r ? "الشهر معتمد ومقفل — الشاشة للعرض" : "صلاحيتك على الجدول عرضٌ فقط", "warn")
            : () =>
                this.setState((t) => ({
                  csOpen: t.csOpen === this.empKey(e) ? null : this.empKey(e),
                  csNew: "",
                  csEdit: null,
                  sdOpen: null,
                  restOpen: null,
                })),
          csReadStyle:
            "width:100%;height:32px;display:flex;align-items:center;justify-content:center;gap:6px;padding:0 2px;font-size:11px;font-weight:400;font-family:'Cairo',sans-serif;color:" +
            (e.cs ? "var(--fg-x141414)" : "var(--fg-x94a3b8)") +
            ";box-sizing:border-box",
          csBtnStyle:
            "width:100%;height:34px;border:1px solid " +
            (a ? "var(--bd-xb99751)" : "var(--bd-xe1e1e1)") +
            ";border-radius:9px;padding:0 26px;font-size:11px;font-weight:400;font-family:'Cairo',sans-serif;background:var(--bg-xffffff);box-sizing:border-box;position:relative;display:flex;align-items:center;justify-content:center;gap:8px;text-align:center;color:" +
            (e.cs ? "var(--fg-x141414)" : "var(--fg-x94a3b8)") +
            (a ? ";box-shadow:0 0 0 3px rgba(185,151,81,0.14)" : "") +
            ";cursor:pointer;transition:border-color .15s,box-shadow .15s",
          csChev:
            "position:absolute;left:9px;top:50%;margin-top:-6px;transition:transform .2s;flex-shrink:0;opacity:.5;" +
            (a ? "transform:rotate(180deg)" : ""),
          csShowList: a,
          csToggle: i
            ? () => {}
            : () =>
                this.setState((t) => ({
                  csOpen: t.csOpen === this.empKey(e) ? null : this.empKey(e),
                  csNew: "",
                  csEdit: null,
                  sdOpen: null,
                  restOpen: null,
                })),
          csClear: () => {
            (this.setEntry(this.empKey(e), { cs: "" }), this.setState({ csOpen: null }));
          },
          csClearStyle:
            "display:flex;align-items:center;gap:9px;height:32px;padding:0 9px;border-radius:8px;font-size:11px;cursor:pointer;transition:background .12s;" +
            (e.cs ? "color:var(--fg-x53565a)" : "background:var(--bg-a2452452450p8);color:var(--fg-x334155);font-weight:400"),
          csNoneSel: !e.cs,
          csAdd: () => this.csAdd(),
          csOpts: O.map((t) => ({
            name: t,
            selected: e.cs === t,
            editing: !(!s.csEdit || s.csEdit.old !== t),
            draft: s.csEdit && s.csEdit.old === t ? s.csEdit.val : t,
            onDraft: (e) => this.setState({ csEdit: { old: t, val: e.target.value } }),
            onDraftKey: (e) => {
              ("Enter" === e.key && this.csRename(t, (this.state.csEdit || {}).val), "Escape" === e.key && this.setState({ csEdit: null }));
            },
            save: (e) => {
              (e.stopPropagation(), this.csRename(t, (this.state.csEdit || {}).val));
            },
            stop: (e) => e.stopPropagation(),
            pick: () => {
              (s.csEdit && s.csEdit.old === t) || (this.setEntry(this.empKey(e), { cs: t }), this.setState({ csOpen: null }));
            },
            edit: (e) => {
              (e.stopPropagation(), this.setState({ csEdit: { old: t, val: t } }));
            },
            del: (e) => {
              (e.stopPropagation(), this.csDel(t));
            },
            style:
              "display:flex;align-items:center;gap:9px;height:32px;padding:0 9px;border-radius:8px;font-size:11px;cursor:pointer;transition:background .12s;" +
              (e.cs === t ? "background:var(--bg-a185151810p09);color:var(--fg-x9a7e40);font-weight:600" : "color:var(--fg-x141414)"),
          })),
          csEmpty: !O.length,
          sdOpts: c,
          mukTip: i ? (r ? "الشهر مقفل" : "عرض فقط") : e.muk ? "مكلف — اضغط لإلغاء التكليف" : "غير مكلف — اضغط للتكليف",
          mukToggle: i ? () => {} : () => this.setEntry(this.empKey(e), { muk: !e.muk }),
          mukStyle:
            "position:relative;width:40px;height:22px;border-radius:9999px;border:1px solid " +
            (e.muk
              ? "rgba(185,151,81,0.6);background:linear-gradient(135deg,var(--bg-xe6d29d),var(--bg-xb99751))"
              : "#d7dce2;background:var(--bg-xeef1f4)") +
            ";padding:0;transition:all .25s;display:inline-block;vertical-align:middle" +
            (r ? ";cursor:not-allowed;opacity:.55" : ";cursor:pointer") +
            (e.muk ? ";box-shadow:0 1px 6px -1px rgba(154,126,64,0.5)" : ""),
          mukKnob:
            "position:absolute;top:2px;width:16px;height:16px;border-radius:9999px;background:var(--bg-xffffff);box-shadow:0 1px 3px rgba(0,0,0,0.25);transition:all .25s;" +
            (e.muk ? "right:20px" : "right:2px"),
          restOpen: s.restOpen === this.empKey(e),
          restCanEdit: !i && e.rest.length < 2,
          restToggle: i ? () => {} : () => this.setState((t) => ({ restOpen: t.restOpen === this.empKey(e) ? null : this.empKey(e) })),
          restBtnStyle:
            "width:20px;height:20px;border-radius:6px;border:1px dashed " +
            (s.restOpen === this.empKey(e) ? "#b99751;color:var(--fg-xb99751)" : "#cbd5e1;color:var(--fg-x94a3b8)") +
            ";background:transparent;font-size:11px;line-height:1;display:inline-flex;align-items:center;justify-content:center;cursor:pointer",
          restChips: h,
          weekDays: d,
          permChips: g,
          permDayBtns: y,
          permCount: String(m.length),
          permLimitTxt: String(f),
          permQuotaTxt: u ? "اكتمل النصاب" : String(m.length) + " / " + String(f),
          permQuotaTip: u
            ? "اكتمل نصاب الشهر — " + KIVO.BassamCount(String(f), "استئذان") + ""
            : "المسجّل " + String(m.length) + " من نصاب " + String(f),
          permQuotaStyle:
            "display:inline-flex;align-items:center;gap:3px;padding:1px 7px;border-radius:9999px;font-size:9px;font-weight:700;font-feature-settings:'tnum';white-space:nowrap;border:1px solid " +
            (u
              ? "rgba(100,116,139,0.3);background:var(--bg-a1001161390p08);color:var(--fg-x64748b)"
              : "rgba(185,151,81,0.45);background:var(--bg-xffffff);color:var(--fg-x8a6f35)") +
            (i ? ";opacity:.55" : ""),
          permCanEdit: !1,
          permOpen: s.permOpen === this.empKey(e),
          permToggle: i ? () => {} : () => this.setState((t) => ({ permOpen: t.permOpen === this.empKey(e) ? null : this.empKey(e) })),
          permBtnStyle:
            "width:20px;height:20px;border-radius:6px;border:1px dashed " +
            (s.permOpen === this.empKey(e) ? "#b99751;color:var(--fg-xb99751)" : "#cbd5e1;color:var(--fg-x94a3b8)") +
            ";background:transparent;font-size:11px;line-height:1;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0",
          permMonthLbl: "اختر يوم الاستئذان · " + this.MONTHS[s.month - 1] + " " + s.year + " هـ",
          permLimCanEdit: this.PC("approve") && !r,
          permLimDown: () => this.savePermLimit(this.state.permLimit - 1),
          permLimUp: () => this.savePermLimit(this.state.permLimit + 1),
          timeNoShift: !e.shift,
          timeSet: !!e.shift && !!(l && l.tStart && l.tEnd),
          timeEmpty: !(!e.shift || (l && l.tStart && l.tEnd)),
          timeLabel: l && l.tStart && l.tEnd ? this.fmtClock(l.tStart) + " – " + this.fmtClock(l.tEnd) : "",
          timeDurLabel: l && l.tStart && l.tEnd ? this.fmtDur(this.shiftDurMins(l.tStart, l.tEnd)) : "",
          sdShowList: n,
          sdListStyle: this._pkListStyle(n ? s.sdPos : null),
          sdScrollStyle: "max-height:" + (n && s.sdPos ? Math.max(64, s.sdPos.maxH) : 180) + "px;overflow-y:auto;padding:5px",
          sdSrcTxt: "تُعرَّف الورديات في الإعدادات ← الورديات",
          sdSrcGo: this._sdCanSet()
            ? () => {
                this.setState({ sdOpen: null });
                try {
                  KIVO.BassamNav.go("admin");
                } catch (t) {}
              }
            : null,
          sdSrcLink: this._sdCanSet(),
          sdSrcStyle:
            "display:flex;align-items:center;gap:6px;padding:7px 9px;border-bottom:1px solid var(--bd-xf1f5f9);background:var(--bg-xfafafa);font-size:10px;font-weight:600;color:" +
            (this._sdCanSet() ? "#9A7E40;cursor:pointer" : "#94a3b8"),
        };
        var k, S, w;
      }),
      C = {},
      A = {},
      T = {};
    p.forEach((t) => {
      ((C[t.name] = 0), (A[t.name] = 0), (T[t.name] = 0));
    });
    let M = 0,
      L = 0;
    o.forEach((t) => {
      const e = this.entryOf(t),
        s = c(e.rest),
        r = !!this.lvActiveToday(e.leaves);
      (void 0 !== C[e.shift] ? (C[e.shift]++, r ? T[e.shift]++ : s && A[e.shift]++) : M++, e.muk && L++);
    });
    const N = o.length,
      D = [...p]
        .sort((t, e) => {
          const s = /^\d{2}:\d{2}$/.test(t.tStart || "") ? 0 : 1,
            r = /^\d{2}:\d{2}$/.test(e.tStart || "") ? 0 : 1;
          return s !== r ? s - r : 0 === s && t.tStart !== e.tStart ? (t.tStart < e.tStart ? -1 : 1) : t.name.localeCompare(e.name, "ar");
        })
        .map((t) => ({ name: t.name, color: t.color, count: C[t.name] || 0, resting: A[t.name] || 0, leaving: T[t.name] || 0 })),
      B = Math.max(...D.map((t) => t.count), 0),
      j = D.length ? Math.min(...D.map((t) => t.count)) : 0,
      K =
        (D.filter((t) => t.count === B && B > 0).map((t) => t.name),
        D.filter((t) => t.count === j).map((t) => t.name),
        this.WEEKDAYS.map((t) => ({ name: t, count: x[t] })).sort((t, e) => e.count - t.count)),
      R = K[0] ? K[0].count : 0,
      I = Math.min(...this.WEEKDAYS.map((t) => x[t])),
      z = { ميداني: "#2f8f86", إداري: "#9c3d6b" },
      W = ["#2f8f86", "#9c3d6b", "#b99751", "#1e9a66", "#a5566e", "#b45309"],
      H = [],
      J = {};
    o.forEach((t) => {
      const e = String((t && t.work) || "").trim() || "غير محدد";
      (null == J[e] && ((J[e] = 0), H.push(e)), J[e]++);
    });
    const F = H.map((t, e) => ({ name: t, count: J[t], color: "غير محدد" === t ? "#cbd5e1" : z[t] || W[e % W.length] })).sort(
        (t, e) => e.count - t.count,
      ),
      G = R !== I,
      Y = 2 * Math.PI * 41,
      V = function (t) {
        var e = 0,
          s = [],
          r = 0;
        if (
          (t.forEach(function (t) {
            r += t.n;
          }),
          !r)
        )
          return [];
        var n = t.filter(function (t) {
            return t.n > 0;
          }),
          i = n.length > 1;
        return (
          n.forEach(function (t) {
            var n = (Y * t.n) / r,
              a = i ? Math.min(3, 0.12 * n) : 0;
            (s.push({
              color: t.color,
              dash: Math.round(10 * Math.max(0.5, n - a)) / 10 + " " + Math.round(10 * Y) / 10,
              off: String(-Math.round(10 * e) / 10),
              tip: t.tip,
            }),
              (e += n));
          }),
          s
        );
      },
      q = function (t) {
        return N ? Math.round((100 * t) / N) + "٪" : "—";
      },
      X = function (t) {
        return t.map(function (t) {
          return { label: t.label, color: t.color, n: String(t.n), pct: q(t.n), tip: t.tip || "" };
        });
      },
      $ = function (t) {
        return t.reduce(function (t, e) {
          return e.n > (t ? t.n : -1) ? e : t;
        }, null);
      },
      U = F.map((t) =>
        "غير محدد" === t.name
          ? {
              label: "بدون طبيعة عمل",
              color: "#b45309",
              n: t.count,
              tip: "موظفون لم تُحدَّد لهم طبيعة عمل — تُحدَّد من عمود «نوع العمل» في هذا الجدول، وتختفي هذه الشريحة باكتمالها",
            }
          : { label: t.name, color: t.color, n: t.count, tip: t.name + ": " + t.count + " من " + N },
      ),
      Q = $(U),
      Z = ["#2f8f86", "#9c3d6b", "#b99751", "#1e9a66", "#a5566e", "#b45309"],
      tt = {},
      et = [];
    o.forEach(function (t) {
      var e = String((t && t.type) || "").trim() || "غير محدد";
      (null == tt[e] && ((tt[e] = 0), et.push(e)), tt[e]++);
    });
    const st = et
        .map(function (t) {
          return { name: t, count: tt[t] };
        })
        .sort(function (t, e) {
          return e.count - t.count;
        })
        .map(function (t, e) {
          return "غير محدد" === t.name
            ? {
                label: "بدون نوع توظيف",
                color: "#b45309",
                n: t.count,
                tip: "موظفون لم يُحدَّد لهم نوع توظيف — تُستكمل من صفحة بيانات الموظفين",
              }
            : { label: t.name, color: Z[e % Z.length], n: t.count, tip: t.name + ": " + t.count + " من " + N };
        }),
      rt = $(st),
      nt = o.filter(function (t) {
        return "ذكر" === String((t && t.gender) || "").trim();
      }).length,
      it = o.filter(function (t) {
        return "أنثى" === String((t && t.gender) || "").trim();
      }).length,
      at = N - nt - it,
      ot = [
        { label: "ذكور", color: "#2a76aa", n: nt, tip: "الذكور من إجمالي الموظفين: " + nt + " من " + N },
        { label: "إناث", color: "#a5566e", n: it, tip: "الإناث من إجمالي الموظفين: " + it + " من " + N },
      ].concat(
        at > 0 ? [{ label: "بدون جنس", color: "#b45309", n: at, tip: "موظفون لم يُحدَّد لهم جنس — تُستكمل من صفحة بيانات الموظفين" }] : [],
      ),
      lt = $(ot),
      ct = D.map((t) => {
        return {
          label: t.name,
          color: ((e = t.color), "#b99751" === e ? "#8a6f35" : e),
          n: t.count,
          tip:
            t.name +
            ": " +
            t.count +
            " من " +
            N +
            " — حاضر اليوم " +
            (t.count - t.resting - t.leaving) +
            " · في راحة " +
            t.resting +
            " · في إجازة " +
            t.leaving,
        };
        var e;
      }).concat(M > 0 ? [{ label: "بدون تسكين", color: "#94a3b8", n: M, tip: "مجدولون بلا وردية بعد: " + M + " من " + N }] : []),
      pt = $(ct),
      ht =
        ((dt = this.WEEKDAYS.find(function (t) {
          return t === l || "ال" + t === l || t === "ال" + l;
        })) &&
          x[dt]) ||
        0;
    var dt;
    const mt = [
      { label: "حاضرون", color: "#008450", n: N - ht, tip: "من لم تصادف راحتهم الأسبوعية اليوم: " + (N - ht) + " من " + N },
      { label: "في راحة", color: "#e5b563", n: ht, tip: "راحتهم الأسبوعية تصادف اليوم: " + ht + " من " + N },
    ];
    let ft = 0;
    this.WEEKDAYS.forEach((t) => {
      ft += x[t] || 0;
    });
    const ut = this.WEEKDAYS.map((t) => {
        const e = x[t] || 0,
          s = t === l || "ال" + t === l || t === "ال" + l,
          r = R ? Math.max(e ? 8 : 0, Math.round((100 * e) / R)) : 0,
          n = G && e === R,
          i = G && e === I,
          a = n ? "#dc2626" : i ? "#059669" : "#b45309";
        return {
          name: t.replace("ال", ""),
          count: String(e),
          hpct: String(r),
          pctTxt: N ? Math.round((100 * e) / N) + "٪" : "—",
          tip:
            t +
            ": " +
            e +
            " " +
            (1 === e ? "راحة" : "راحات") +
            (N ? " — " + Math.round((100 * e) / N) + "٪ من الموظفين" : "") +
            (n ? " · أكثر أيام الأسبوع راحات" : i ? " · أقلّها" : "") +
            (s ? " · اليوم" : ""),
          barColor: n ? "#dc2626" : i ? "#059669" : s ? "#b45309" : "rgba(245,158,11,0.45)",
          numColor: e ? a : "#94a3b8",
          pctColor: e ? a : "#cbd5e1",
          lblWeight: s ? "700" : "400",
          lblColor: s ? "#141414" : "#94a3b8",
          lblUnder: s ? "2px solid rgba(185,151,81,0.7)" : "2px solid transparent",
        };
      }),
      gt = [
        { label: "مكلفون", color: "#9c3d6b", n: L, tip: "المكلفون بمهام إضافية هذا الشهر: " + L + " من " + N },
        { label: "غير مكلفين", color: "#cbd5e1", n: N - L, tip: "بلا تكليف هذا الشهر: " + (N - L) + " من " + N },
      ],
      yt = (() => {
        let t = [];
        try {
          const e = JSON.parse(localStorage.getItem("bassam_perm_tpls_v1"));
          Array.isArray(e) && (t = e);
        } catch (t) {}
        let e = null,
          s = {};
        try {
          e = KIVO.BassamPerm;
        } catch (t) {}
        try {
          const t = KIVO.BassamAuth;
          s = (t && t.staffMap && t.staffMap()) || {};
        } catch (t) {}
        const r = KIVO.BassamEmp && KIVO.BassamEmp.key ? KIVO.BassamEmp.key : (t) => t.eid || "",
          n = (t) =>
            Object.keys(t || {})
              .filter((e) => (t[e] || []).length)
              .sort()
              .map((e) => e + ":" + (t[e] || []).slice().sort().join(","))
              .join("|");
        let i = [];
        try {
          i = (e && e.deptCap && e.deptCap()) || [];
        } catch (t) {}
        const a = {};
        let l = 0,
          c = 0;
        o.forEach((o) => {
          const p = r(o);
          if (!s[p]) return void c++;
          let h = "";
          try {
            if (e && e.empPerms) {
              const s = n(e.empPerms(p) || {});
              if (s) {
                const r = e.empTpl ? e.empTpl(p) : "";
                if (r) {
                  const e = t.find((t) => t.id === r);
                  e && (h = e.name);
                }
                if (!h)
                  for (let e = 0; e < t.length; e++) {
                    const r = {};
                    if (
                      (Object.keys(t[e].perms || {}).forEach((s) => {
                        -1 !== i.indexOf(s) && (r[s] = t[e].perms[s]);
                      }),
                      n(r) === s)
                    ) {
                      h = t[e].name;
                      break;
                    }
                  }
              }
            }
          } catch (t) {}
          h ? (a[h] = (a[h] || 0) + 1) : l++;
        });
        const p = ["#2f5f8a", "#4a97cf", "#9c3d6b", "#2f8f86", "#b45309", "#a5566e"],
          h = t
            .filter((t) => a[t.name])
            .map((t, e) => ({
              label: t.name,
              color: p[e % p.length],
              n: a[t.name],
              tip: "قالب «" + t.name + "»: " + a[t.name] + " من " + N + " — يُمنح ويُبدَّل من عمود «الصلاحيات»",
            }));
        return (
          l &&
            h.push({
              label: "بدون صلاحية",
              color: "#cbd5e1",
              n: l,
              tip: "أصحاب حساب دخول بلا قالب صلاحيات بعد: " + l + " من " + N + " — يُمنحون من عمود «الصلاحيات»",
            }),
          c &&
            h.push({
              label: "بلا حساب",
              color: "#94a3b8",
              n: c,
              tip: "بلا حساب دخول — والصلاحيات لأصحاب الحسابات: " + c + " من " + N + " — الحسابات تُنشأ من صفحة الموظفين",
            }),
          h
        );
      })(),
      bt = yt.reduce((t, e) => t + ("بدون صلاحية" === e.label || "بلا حساب" === e.label ? 0 : e.n), 0),
      kt = this.MONTHS[s.month - 1];
    return {
      months: a,
      ...(() => {
        const t = P.length,
          e = 0 === s.perPage ? 0 : s.perPage || 10,
          n = 0 === e ? Math.max(1, t) : e,
          a = Math.max(1, Math.ceil(t / n)),
          l = Math.min(Math.max(1, s.page || 1), a),
          c = (l - 1) * n,
          p = [];
        {
          const t = [],
            e = (e) => {
              t.includes(e) || t.push(e);
            };
          e(1);
          for (let t = l - 1; t <= l + 1; t++) t >= 1 && t <= a && e(t);
          (e(a), t.sort((t, e) => t - e));
          for (let e = 0; e < t.length; e++) {
            e > 0 && t[e] - t[e - 1] > 1 && p.push({ dots: !0, label: "…" });
            const s = t[e];
            p.push({
              dots: !1,
              label: String(s),
              cur: s === l,
              plain: s !== l,
              style:
                "height:28px;min-width:28px;padding:0 4px;border:0;border-right:1px solid var(--bd-xe1e1e1);font-size:11px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';" +
                (s === l ? "background:var(--bg-xb99751);color:var(--text-on-brand)" : "background:transparent;color:var(--fg-x475569)"),
              click: () => this.setState({ page: s }),
            });
          }
        }
        const h = (t) =>
            "height:28px;width:28px;border:0;border-right:1px solid var(--bd-xe1e1e1);background:transparent;display:flex;align-items:center;justify-content:center;" +
            (t ? "color:var(--fg-x475569);cursor:pointer" : "color:var(--fg-xcbd5e1);cursor:default"),
          d = s.stSel || {},
          m = Object.keys(d).filter((t) => d[t]).length,
          f = P.length > 0 && P.every((t) => d[t.ekeyPm]),
          u = () => Object.keys(this.state.stSel || {}).filter((t) => this.state.stSel[t]),
          g = () =>
            !i ||
            (this.bsToast(
              r ? "الشهر معتمد ومقفل — افتحه من قفل الشهر أولاً" : "صلاحيتك على الجدول الشهري عرض فقط — راجع مدير الإدارة",
              "warn",
            ),
            !1),
          y = (t) => {
            const e = u();
            if (!e.length) return 0;
            const s = { ...this.state.staffing },
              r = this.monthKey(),
              n = { ...(s[r] || {}) };
            return (
              e.forEach((e) => {
                n[e] = { ...(n[e] || {}), ...t };
              }),
              (s[r] = n),
              this.saveStaffing(s),
              e.length
            );
          },
          b = (t, e) => {
            const s = u();
            if (!s.length) return 0;
            const r = {};
            s.forEach((t) => {
              r[t] = 1;
            });
            let n = 0;
            try {
              const s = localStorage.getItem("bassam_employees_v1"),
                i = s ? JSON.parse(s) : [];
              if (!Array.isArray(i)) return 0;
              const a = i.map((s) => {
                if (s && r[s.eid]) {
                  n++;
                  const r = { ...s };
                  return ((r[t] = e), r);
                }
                return s;
              });
              localStorage.setItem("bassam_employees_v1", JSON.stringify(a));
            } catch (t) {
              return 0;
            }
            return (this.setState({ wkTick: (this.state.wkTick || 0) + 1 }), n);
          };
        return {
          hasSelection: m > 0,
          selCount: String(m),
          allSelected: f,
          toggleAll: () => {
            const t = { ...this.state.stSel };
            (P.forEach((e) => {
              t[e.ekeyPm] = !f;
            }),
              this.setState({ stSel: t }));
          },
          bulkClear: () => this.setState({ stSel: {} }),
          bulkShiftOpts: (this.state.shiftOpts || [])
            .map((t) => ({ v: "sh:" + t.name, name: t.name }))
            .concat([{ v: "__none", name: "بلا وردية — إزالة التسكين" }]),
          bulkTplOpts: this.PERM_TPLS()
            .map((t) => ({ v: t.id, name: t.name }))
            .concat([{ v: "__none", name: "بدون صلاحية — إزالة" }]),
          onBulkShift: (t) => {
            const e = t.target.value;
            if (((t.target.value = ""), !e || !g())) return;
            const s = "__none" === e ? "" : e.slice(3),
              r = y({ shift: s });
            r &&
              this.bsAck(
                s
                  ? "سُكِّن " + KIVO.BassamCount(r, "موظف") + " في «" + s + "»"
                  : "أُزيل تسكين " + KIVO.BassamCount(r, "موظف", "g") + "",
                "ok",
              );
          },
          onBulkMuk: (t) => {
            const e = t.target.value;
            if (((t.target.value = ""), !e || !g())) return;
            const s = y({ muk: "on" === e });
            s &&
              this.bsAck(
                "on" === e ? "كُلِّف " + KIVO.BassamCount(s, "موظف") + "" : "أُلغي تكليف " + KIVO.BassamCount(s, "موظف", "g") + "",
                "ok",
              );
          },
          onBulkTpl: (t) => {
            const e = t.target.value;
            if (((t.target.value = ""), !e)) return;
            if (!this._stCanWrite()) return void this.bsToast("صلاحيتك على الجدول الشهري عرض فقط — راجع مدير الإدارة", "warn");
            const s = KIVO.BassamPerm;
            if (!s || !s.setEmpPerms) return;
            const r = u();
            if (!r.length) return;
            const n = (() => {
                try {
                  return (KIVO.BassamAuth && KIVO.BassamAuth.staffMap && KIVO.BassamAuth.staffMap()) || {};
                } catch (t) {
                  return {};
                }
              })(),
              i = (s.deptCap && s.deptCap(), "__none" === e ? null : this.PERM_TPLS().find((t) => t.id === e));
            if ("__none" !== e && !i) return;
            let a = 0,
              o = 0;
            (r.forEach((t) => {
              if (!n[t]) return void o++;
              const e = {};
              if (i) {
                const t = KIVO.BassamPerm && KIVO.BassamPerm.tplCut ? KIVO.BassamPerm.tplCut(i.perms) : {};
                Object.keys(t).forEach((s) => {
                  e[s] = t[s];
                });
              }
              try {
                (s.setEmpPerms(t, e), s.setEmpTpl && s.setEmpTpl(t, i ? i.id : ""), a++);
              } catch (t) {}
            }),
              this.setState({ permTick: (this.state.permTick || 0) + 1 }),
              this.bsToast(
                (i
                  ? "أُسندت صلاحية «" + i.name + "» لـ " + KIVO.BassamCount(a, "موظف", "g") + ""
                  : "أُزيلت الصلاحية عن " + KIVO.BassamCount(a, "موظف", "g") + "") +
                  (o ? " — وتُخطِّي " + o + " بلا حساب دخول: الصلاحية تتطلب حساباً نشطاً" : ""),
                o ? "warn" : "ok",
              ));
          },
          bulkWorkOpts9: (() => {
            const t = {};
            return (
              this.loadWkOpts().forEach((e) => {
                e && (t[e] = 1);
              }),
              o.forEach((e) => {
                const s = String((e && e.work) || "").trim();
                s && (t[s] = 1);
              }),
              Object.keys(t).map((t) => ({ v: t }))
            );
          })(),
          bulkTypeOpts9: (() => {
            const t = {};
            return (
              (() => {
                try {
                  const t = localStorage.getItem("bassam_options_v1"),
                    e = t ? JSON.parse(t) : null;
                  return e && Array.isArray(e.type) ? e.type : ["دائم", "موسمي", "متعاون"];
                } catch (t) {
                  return ["دائم", "موسمي", "متعاون"];
                }
              })().forEach((e) => {
                e && (t[e] = 1);
              }),
              o.forEach((e) => {
                const s = String((e && e.type) || "").trim();
                s && (t[s] = 1);
              }),
              Object.keys(t).map((t) => ({ v: t }))
            );
          })(),
          onBulkWork: (t) => {
            const e = t.target.value;
            if (((t.target.value = ""), !e || !g())) return;
            const s = b("work", e);
            s && this.bsAck("عُيِّن نوع العمل «" + e + "» لـ" + KIVO.BassamCount(s, "موظف", "g") + "", "ok");
          },
          onBulkType: (t) => {
            const e = t.target.value;
            if (((t.target.value = ""), !e || !g())) return;
            const s = b("type", e);
            s && this.bsAck("عُيِّن نوع التوظيف «" + e + "» لـ" + KIVO.BassamCount(s, "موظف", "g") + "", "ok");
          },
          rows: P.slice(c, c + n).map((t, e, r) => ({ ...t, sn: String(c + e + 1), ...St9H(t, e > 0 ? r[e - 1] : null) })),
          ...KIVO.BassamCount.pair("pgTotal", String(t), "سجل", "g"),
          pgRange: 0 === t ? "0" : c + 1 + "–" + Math.min(c + n, t),
          pgNums: p,
          perPage: String(e),
          onPerPage: (t) => {
            const e = +t.target.value;
            this.setState({ perPage: 0 === e ? 0 : e || 10, page: 1 });
          },
          pgFirst: () => this.setState({ page: 1 }),
          pgPrev: () => this.setState((t) => ({ page: Math.max(1, (t.page || 1) - 1) })),
          pgNext: () => this.setState((t) => ({ page: Math.min(a, (t.page || 1) + 1) })),
          pgLast: () => this.setState({ page: a }),
          pgFirstStyle: h(l > 1),
          pgPrevStyle: h(l > 1),
          pgNextStyle: h(l < a),
          pgLastStyle: h(l < a),
        };
      })(),
      skWRing: V(U),
      skWRows: X(U),
      skWVal: String(Q ? Q.n : 0),
      skWPct: q(Q ? Q.n : 0),
      skWSub: "من " + KIVO.BassamCount(N, "موظف", "g") + "",
      skSRing: V(ct),
      skSRows: X(ct),
      skSVal: String(pt ? pt.n : 0),
      skSPct: q(pt ? pt.n : 0),
      skSSub: "من " + KIVO.BassamCount(N, "موظف", "g") + "",
      skPRing: V(mt),
      skPRows: X(mt),
      skPVal: String(N - ht),
      skPPct: q(N - ht),
      skPSub: "من " + KIVO.BassamCount(N, "موظف", "g") + "",
      skRVal: String(ht),
      skRPct: q(ht),
      skRSub: "من " + KIVO.BassamCount(N, "موظف", "g") + "",
      skRRing:
        ((St = 2 * Math.PI * 41), (wt = N ? Math.min(1, ht / N) : 0), Math.round(St * wt * 10) / 10 + " " + Math.round(10 * St) / 10),
      skREmpty: !ft,
      skRDays: ut,
      skMRing: V(gt),
      skMRows: X(gt),
      skMVal: String(L),
      skMPct: q(L),
      skMSub: "من " + KIVO.BassamCount(N, "موظف", "g") + "",
      skTRing: V(yt),
      skTRows: X(yt),
      skTVal: String(bt),
      skTPct: q(bt),
      skTSub: "من " + KIVO.BassamCount(N, "موظف", "g") + "",
      skYRing: V(st),
      skYRows: X(st),
      skYVal: String(rt ? rt.n : 0),
      skYPct: q(rt ? rt.n : 0),
      skYSub: "من " + KIVO.BassamCount(N, "موظف", "g") + "",
      skGRing: V(ot),
      skGRows: X(ot),
      skGVal: String(lt ? lt.n : 0),
      skGPct: q(lt ? lt.n : 0),
      skGSub: "من " + KIVO.BassamCount(N, "موظف", "g") + "",
      yearLabel: s.year + " هـ",
      gregRange: this.gregYearRange(s.year),
      prevYear: () => this.setState((t) => ({ year: t.year - 1 })),
      nextYear: () => this.setState((t) => ({ year: t.year + 1 })),
      goCurrent: () => {
        const t = this.curHijri();
        this.setState({ year: t.y, month: t.m, restOpen: null, sdOpen: null, stSel: {} });
      },
      selMonthName: kt,
      /* الموجة 1 · ES-8: وجودُ الجدول أولاً — شهرٌ منقضٍ بلا جدول كان «معتمد ومقفل» (monthLockedS صادقٌ لكل شهرٍ منقضٍ بالتاريخ) ·
         و«معتمد» للمعتمد وحده كبطاقة الشهر (المنقضي غيرُ المعتمد «انقضى — مقفل» لا «معتمد») */
      ...(() => {
        const HS = this.hasLiveSched(s.year + "-" + s.month),
          AP = this.monthApprovedS(s.year, s.month),
          k = !HS ? "none" : AP ? "ok" : r ? "past" : "draft";
        return {
          badgeKind: k,
          badgeLabel:
            "جدول " +
            kt +
            " " +
            s.year +
            " هـ — " +
            ("ok" === k ? "معتمد ومقفل" : "past" === k ? "انقضى — مقفل" : "draft" === k ? "مسودة مفتوحة" : "لا يوجد جدول" + (r ? " · الشهر مقفل" : "")),
          badgeStyle:
            "display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;border-radius:9999px;padding:4px 12px;font-family:'Cairo',sans-serif;border:1px solid " +
            ("ok" === k
              ? "rgba(0,132,80,0.35);color:var(--fg-x008450);background:var(--bg-a0132800p1)"
              : "draft" === k
                ? "rgba(245,158,11,0.35);color:var(--fg-x92400e);background:var(--bg-a245158110p12)"
                : "past" === k
                  ? "var(--bd-a1001161390p35);color:var(--fg-x475569);background:var(--bg-a1001161390p06)"
                  : "rgba(148,163,184,0.35);color:var(--fg-x64748b);background:var(--bg-a1481631840p1)"),
        };
      })(),
      delMonthOn: !!s.delMonth,
      delMonthMsg: s.delMonth
        ? "سيتم حذف جدول " +
          this.MONTHS[s.delMonth.n - 1] +
          " " +
          s.year +
          " هـ بكل تسكيناته وراحاته وتكاليفه نهائياً وسيعود الكرت فارغاً — لا يمكن التراجع."
        : "",
      delMonthCancel: () => this.setState({ delMonth: null }),
      delMonthDo: () => {
        const t = this.state.delMonth;
        if (!t) return;
        const e = { ...this.state.staffing };
        (delete e[this.state.year + "-" + t.n], this.saveStaffing(e));
        const s = { ...this.state.locked };
        (delete s[this.state.year + "-" + t.n], this.saveLocks(s), this.setState({ delMonth: null }));
      },
      lockConfirmOpen: !!s.lockConfirm,
      lcStop: (t) => t.stopPropagation(),
      lockCancel: () => this.setState({ lockConfirm: null }),
      lockDo: () => {
        const t = this.state.lockConfirm;
        if (!t) return;
        const e = this.state.year + "-" + t.n;
        const s = { ...this.state.locked };
        t.locked ? (this.monthPastS(this.state.year, t.n) ? (s[e] = { mo: 1 }) : delete s[e]) : (s[e] = !0);
        const r = { ...(this.state.staffing || {}) };
        if (r[e] && "object" == typeof r[e]) {
          const s = { ...r[e] };
          if (t.locked) {
            const t = Array.isArray(s[this.snapKey()]) ? s[this.snapKey()] : [],
              e = (this.state.shiftOpts || []).slice(),
              r = {};
            e.forEach((t) => {
              t && t.name && (r[t.name] = 1);
            });
            const n = {};
            Object.keys(s).forEach((t) => {
              t !== this.snapKey() && s[t] && s[t].shift && (n[s[t].shift] = 1);
            });
            let i = !1;
            if (
              (t.forEach((t) => {
                t &&
                  t.name &&
                  n[t.name] &&
                  !r[t.name] &&
                  (e.push({ name: t.name, color: t.color || "#b99751", tStart: t.tStart || "", tEnd: t.tEnd || "" }),
                  (r[t.name] = 1),
                  (i = !0));
              }),
              i)
            ) {
              try {
                localStorage.setItem("bassam_shift_options_v1", JSON.stringify(e));
              } catch (t) {}
              this.setState({ shiftOpts: e });
            }
            delete s[this.snapKey()];
          } else
            s[this.snapKey()] = (this.state.shiftOpts || []).map((t) => ({
              name: t.name,
              color: t.color,
              tStart: t.tStart || "",
              tEnd: t.tEnd || "",
            }));
          ((r[e] = s), this.saveStaffing(r));
        }
        (this.saveLocks(s), this.setState({ lockConfirm: null }));
      },
      lcTitle: s.lockConfirm && s.lockConfirm.locked ? "فتح الجدول للتعديل" : "اعتماد وإغلاق الجدول",
      lcMsg: s.lockConfirm
        ? s.lockConfirm.locked
          ? "سيتم فتح جدول " +
            this.MONTHS[s.lockConfirm.n - 1] +
            " " +
            s.year +
            " هـ وإلغاء اعتماده ليصبح متاحاً للتعديل. تعديلاتك تنعكس فوراً على صفحات الموظفين في الأيام التي لم يُسحب تقريرها؛ والأيام المسحوبة تبقى كما سُحبت إلا بإعادة سحبها من التقرير اليومي."
          : "سيتم اعتماد جدول " +
            this.MONTHS[s.lockConfirm.n - 1] +
            " " +
            s.year +
            " هـ وإغلاقه — لن يمكن تعديل الورديات وأيام الراحة بعد الإغلاق. الاعتماد هو ما يسمح للتقرير اليومي بسحب ورديات هذا الشهر." +
            (() => {
              try {
                const k = s.year + "-" + s.lockConfirm.n,
                  st = this.state.staffing[k] || {},
                  df = this.shiftDefsFor(k).map((t) => t.name),
                  n = this.loadEmp().filter((t) => {
                    const x = st[this.empKey(t)] || {};
                    return !df.includes(x.shift || "");
                  }).length;
                return n
                  ? " ⚠ " +
                      KIVO.BassamCount(n, "موظف") +
                      " بلا وردية بعد — يُنصح " +
                      KIVO.BassamCount.agr(n, "بتوزيعه", "بتوزيعهما", "بتوزيعهم") +
                      " قبل الاعتماد."
                  : "";
              } catch (t) {
                return "";
              }
            })()
        : "",
      lcNote:
        s.lockConfirm && s.lockConfirm.locked
          ? "يمكنك إعادة اعتماده لاحقاً بنقرة مزدوجة على الكرت."
          : "يمكنك فتحه لاحقاً بنقرة مزدوجة على الكرت.",
      lcNoteColor: s.lockConfirm && s.lockConfirm.locked ? "#b45309" : "#047857",
      lcIconBox:
        "width:56px;height:56px;border-radius:16px;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;" +
        (s.lockConfirm && s.lockConfirm.locked
          ? "background:var(--bg-a245158110p1);border:1px solid var(--bd-a245158110p3);color:var(--fg-xb45309)"
          : "background:var(--bg-a0132800p08);border:1px solid var(--bd-a0132800p25);color:var(--fg-x008450)"),
      lcIconPath: s.lockConfirm && s.lockConfirm.locked ? "M7 11V7a5 5 0 0 1 9.9-1" : "M7 11V7a5 5 0 0 1 10 0v4",
      lcDoLabel: s.lockConfirm && s.lockConfirm.locked ? "فتح للتعديل" : "اعتماد وإغلاق",
      lcDoStyle:
        "height:38px;padding:0 20px;border-radius:10px;font-size:13px;font-weight:400;color:var(--fg-xffffff);border:0;cursor:pointer;font-family:'Cairo',sans-serif;background:" +
        (s.lockConfirm && s.lockConfirm.locked ? "var(--bg-xb45309)" : "var(--bg-x008450)"),
      search: s.search,
      onSearch: (t) => this.setState({ search: t.target.value, page: 1, stSel: {} }),
      ...this.filterDD("fst", "fStatus", "كل الحالات", [
        { v: "all", name: "كل الحالات" },
        { v: "active", name: "متاح" },
        { v: "rest", name: "في الراحة" },
      ]),
      ...this.filterDD("fmk", "fMuk", "المكلفون", [
        { v: "all", name: "الكل — مكلفون وغيرهم" },
        { v: "on", name: "المكلفون فقط" },
        { v: "off", name: "غير المكلفين" },
      ]),
      ...this.filterDD(
        "frd",
        "fRest",
        "أيام الراحة",
        [{ v: "all", name: "كل أيام الراحة" }]
          .concat(
            Object.keys(v)
              .filter((t) => "" !== t)
              .sort((t, e) => v[e] - v[t] || t.localeCompare(e, "ar"))
              .map((t) => ({ v: t, name: t.split("|").join(" - ") })),
          )
          .concat(v[""] ? [{ v: "__none__", name: "بلا أيام راحة" }] : []),
      ),
      ...this.filterDD(
        "fpm",
        "fPerm",
        "الصلاحية",
        (() => {
          let t = [];
          try {
            const e = JSON.parse(localStorage.getItem("bassam_perm_tpls_v1"));
            Array.isArray(e) && (t = e);
          } catch (t) {}
          return [{ v: "all", name: "كل الصلاحيات" }]
            .concat(t.map((t) => ({ v: "tpl:" + t.name, name: t.name })))
            .concat(m ? [{ v: "none", name: "بدون صلاحية (" + m + ")" }] : [])
            .concat(f ? [{ v: "noacct", name: "بلا حساب (" + f + ")" }] : []);
        })(),
      ),
      ...this.filterDD(
        "fwk",
        "fWork",
        "نوع العمل",
        (() => {
          const t = {};
          return (
            this.loadWkOpts().forEach((e) => {
              e && (t[e] = 1);
            }),
            o.forEach((e) => {
              const s = String((e && e.work) || "").trim();
              s && (t[s] = 1);
            }),
            [{ v: "all", name: "نوع العمل — الكل" }]
              .concat(Object.keys(t).map((t) => ({ v: t, name: t })))
              .concat([{ v: "__na", name: "غير محدد" }])
          );
        })(),
      ),
      fsOpen: s.fsOpen,
      fsToggle: () => this.setState((t) => ({ fsOpen: !t.fsOpen })),
      fsLabel: "all" === s.fShift ? "الورديات" : "none" === s.fShift ? "بدون تسكين" : s.fShift,
      fsChev: "transition:transform .2s;flex-shrink:0;opacity:.5;" + (s.fsOpen ? "transform:rotate(180deg)" : ""),
      fsBtnStyle:
        "height:32px;min-width:110px;font-size:11px;border-radius:8px;border:1px " +
        ("all" === s.fShift
          ? "dashed #cbd5e1;color:var(--fg-x475569)"
          : "solid rgba(185,151,81,0.5);color:var(--fg-x9a7e40);font-weight:400") +
        ";background:var(--bg-xffffff);padding:0 10px;cursor:pointer;font-family:'Cairo',sans-serif;display:inline-flex;align-items:center;justify-content:space-between;gap:6px" +
        (s.fsOpen ? ";box-shadow:0 0 0 2px rgba(185,151,81,0.15)" : ""),
      fsOpts: [{ v: "all", name: "كل الورديات", hasDot: !1, color: "" }]
        .concat(p.map((t) => ({ v: t.name, name: t.name, hasDot: !0, color: t.color })))
        .concat([{ v: "none", name: "بدون تسكين", hasDot: !0, color: "#cbd5e1" }])
        .map((t) => ({
          ...t,
          selected: s.fShift === t.v,
          pick: () => this.setState({ fShift: t.v, fsOpen: !1 }),
          style:
            "display:flex;align-items:center;gap:9px;height:32px;padding:0 9px;border-radius:8px;font-size:11px;cursor:pointer;transition:background .12s;" +
            (s.fShift === t.v ? "background:var(--bg-a185151810p09);color:var(--fg-x9a7e40);font-weight:600" : "color:var(--fg-x141414)"),
        })),
      csNew: s.csNew || "",
      onCsNew: (t) => this.setState({ csNew: t.target.value }),
      onCsKey: (t) => {
        "Enter" === t.key && this.csAdd();
      },
      wkNew: s.wkNew || "",
      onWkNew: (t) => this.setState({ wkNew: t.target.value }),
      onWkKey: (t) => {
        "Enter" === t.key && this.wkAdd();
      },
      grpOn: St9On,
      grpModeOn: !1 !== St9P.on,
      grpModeOff: !1 === St9P.on,
      grpSetOn: () => this.stGrpSetOn(!0),
      grpSetOff: () => this.stGrpSetOn(!1),
      grpOnStyle:
        "padding:5px 12px;font-size:11px;font-weight:700;font-family:'Cairo',sans-serif;border:0;cursor:pointer;" +
        (!1 !== St9P.on ? "background:var(--bg-x25343f);color:var(--fg-xffffff)" : "background:var(--bg-xffffff);color:var(--fg-x4a5c68)"),
      grpOffStyle:
        "padding:5px 12px;font-size:11px;font-weight:700;font-family:'Cairo',sans-serif;border:0;cursor:pointer;" +
        (!1 === St9P.on ? "background:var(--bg-x25343f);color:var(--fg-xffffff)" : "background:var(--bg-xffffff);color:var(--fg-x4a5c68)"),
      grpModeTip:
        "مجموعات: يُقسَّم الجدول بالورديات (كلُّ وردية مجموعة بلونها ووقتها، ثم «بلا وردية») بعدّاد لكل مجموعة وطيّ وفرد — قائمة: الجدول المتصل",
      isListView: "grid" !== s.sub,
      isGridView: "grid" === s.sub,
      subList: () => this.setState({ sub: "list" }),
      subKanban: () => this.setState({ sub: "grid" }),
      subListStyle:
        "height:28px;width:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;border:0;cursor:pointer;transition:all .2s;" +
        ("grid" !== s.sub ? "background:var(--bg-xb99751);color:var(--text-on-brand)" : "background:transparent;color:var(--fg-x94a3b8)"),
      subKanbanStyle:
        "height:28px;width:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;border:0;cursor:pointer;transition:all .2s;" +
        ("grid" === s.sub ? "background:var(--bg-xb99751);color:var(--text-on-brand)" : "background:transparent;color:var(--fg-x94a3b8)"),
      hasSchedule: this.hasLiveSched(this.monthKey()),
      noSchedule: !this.hasLiveSched(this.monthKey()),
      createScheduleLabel: "إنشاء جدول " + kt + " " + s.year + " هـ",
      noScheduleTitle: "لا يوجد جدول لشهر " + kt + " " + s.year + " هـ",
      schedLockedNote: r && !this.monthApprovedS(s.year, s.month),
      schedLockedMsg: "الشهر انقضى — مقفل · " + (this.PC("approve") ? "انقر بطاقة الشهر نقرة مزدوجة لفتحه ثم أضف الجدول" : "فتحه للاستدراك يحتاج صلاحية الاعتماد — راجع مدير الإدارة"),
      schedApprovedNote: this.monthApprovedS(s.year, s.month),
      schedApprovedMsg: "الجدول معتمد ومقفل · " + (this.PC("approve") ? "انقر بطاقة الشهر نقرة مزدوجة لفكّ الاعتماد وفتحه" : "فكُّ اعتماده يحتاج صلاحية الاعتماد — راجع مدير الإدارة"),
      canCreate: o.length > 0 && !r && this.PC("add"),
      cantCreate: 0 === o.length,
      ...(() => {
        const t = s.retroAsk;
        if (!t) return { retroOn: !1 };
        const e = this.MONTHS[t.m - 1] || "";
        return {
          retroOn: !0,
          retroTitle: t.open ? "فتح شهر " + e + " " + s.year + " هـ بأثر رجعي" : "إعادة قفل شهر " + e + " " + s.year + " هـ",
          retroMsg: t.open
            ? "هذا الشهر انقضى وأُقفل تلقائياً. فتحه يتيح لك إضافة جدوله أو تعديل الورديات والراحات والإجازات بأثر رجعي."
            : "سيعود الشهر إلى حالته المقفلة بانقضائه، ولن يمكن تعديل جدوله حتى تفتحه من جديد.",
          retroB1: t.open ? "ما تضيفه سيُسجَّل ضمن هذا الشهر المنقضي" : "ما أضفته يبقى محفوظاً كما هو",
          retroB2: t.open ? "يبقى مفتوحاً حتى تعتمده أو تعيد قفله" : "يمكنك فتحه مجدداً في أي وقت بنقرة مزدوجة",
          retroB3: t.open ? "يمكنك إعادة قفله في أي وقت بنقرة مزدوجة على كرته" : "إن أردت اعتماده بدل قفله، افتحه ثم أغلقه بنافذة الاعتماد",
          retroBtn: t.open ? "فتح بأثر رجعي" : "إعادة القفل",
          retroBtnStyle:
            "height:38px;padding:0 20px;border-radius:10px;font-size:13px;font-weight:400;border:0;cursor:pointer;color:var(--fg-xffffff);font-family:'Cairo',sans-serif;background:" +
            (t.open ? "var(--bg-xb45309)" : "var(--bg-x64748b)"),
          retroDo: () => {
            (this._setMonthOpenS(s.year, t.m, !!t.open), this.setState({ retroAsk: null }));
          },
          retroCancel: () => this.setState({ retroAsk: null }),
          retroStop: (t) => t.stopPropagation(),
        };
      })(),
      noScheduleHint:
        0 === o.length
          ? "الجدول الشهري يُبنى على موظفي الإدارة — أضفهم أولاً ثم ارجع لإنشاء الجدول."
          : "كل شهر له جدول مستقل — أنشئ جدول هذا الشهر من الصفر أو انسخه من الشهر السابق.",
      createSchedule: () => {
        this.loadEmp().length
          ? this.setState({ mkNew: { mode: "new" } })
          : this.bsToast("لا يوجد موظفون في الإدارة — الرجاء إضافة الموظفين من صفحة موظفي الإدارة أولاً.");
      },
      ...(() => {
        const t = s.mkNew;
        if (!t) return { mkNewOn: !1 };
        const e = this.prevMonthKey(s.year, s.month),
          r = (s.staffing || {})[e] || {},
          n = Object.keys(r).filter((t) => t !== this.snapKey() && r[t]).length,
          i = n > 0,
          a = (t) =>
            "flex:1;text-align:right;border-radius:12px;padding:11px 13px;cursor:pointer;font-family:'Cairo',sans-serif;transition:all .15s;border:1px solid " +
            (t ? "rgba(185,151,81,0.55);background:var(--bg-a185151810p07)" : "#E1E1E1;background:var(--bg-xffffff)");
        return {
          mkNewOn: !0,
          mkNewTitle: "إنشاء جدول " + (this.MONTHS[s.month - 1] || "") + " " + s.year + " هـ",
          mkNewIsNew: "new" === t.mode,
          mkNewIsCopy: "copy" === t.mode,
          mkPickNew: () => this.setState({ mkNew: { mode: "new" } }),
          mkPickCopy: () => {
            i && this.setState({ mkNew: { mode: "copy" } });
          },
          mkNewStyle: a("new" === t.mode),
          mkCopyStyle: a("copy" === t.mode) + (i ? "" : ";opacity:.5;cursor:not-allowed"),
          mkCopySrc: this.mkLabel(e),
          mkCopyNote: i
            ? "تُنسخ الورديات وأيام الراحة والتكاليف لـ" + KIVO.BassamCount(n, "موظف", "g") + ""
            : "لا يوجد جدول في " + this.mkLabel(e) + " للنسخ منه",
          ...(() => {
            const s = this.drpApprovedDays(+e.split("-")[0], +e.split("-")[1]),
              r = s.length > 0 && this.bsOn("dreport"),
              n = t.day || (s[0] ? s[0].key : ""),
              i = s.find((t) => t.key === n) || null,
              o = i ? Object.keys(this.drpDayPlan(i.key)).length : 0,
              l = this.loadEmp().length;
            return {
              mkDayOn: r,
              mkPickDay: () => {
                r && this.setState({ mkNew: { mode: "day", day: n } });
              },
              mkDayStyle: a("day" === t.mode) + (r ? "" : ";opacity:.5;cursor:not-allowed"),
              mkDayIsSel: "day" === t.mode,
              mkDayNote: r
                ? "تُبنى الورديات وأيام الراحة مما استقرّ عليه الميدان في يومٍ معتمد — ومن لم يرد في تقاريره يرث تسكينه من " +
                  this.mkLabel(e)
                : "لا تقارير يومية معتمدة في " + this.mkLabel(e) + " لتُبنى منها",
              mkDayRows: s
                .slice(0, 31)
                .map((t) => ({
                  lbl: t.d + " " + this.mkLabel(e),
                  note: t.shifts.length + " " + (1 === t.shifts.length ? "وردية معتمدة" : "ورديات معتمدة"),
                  sel: t.key === n,
                  pick: () => this.setState({ mkNew: { mode: "day", day: t.key } }),
                  style:
                    "display:flex;align-items:center;gap:8px;height:32px;padding:0 9px;border-radius:8px;font-size:11.5px;cursor:pointer;transition:background .12s;" +
                    (t.key === n
                      ? "background:var(--bg-a185151810p12);color:var(--fg-x8a6f35);font-weight:600"
                      : "color:var(--fg-x141414);font-weight:400"),
                })),
              mkDaySum:
                i && l
                  ? "يُبنى " +
                    KIVO.BassamCount(o, "موظف") +
                    " من تقرير يوم " +
                    i.d +
                    "، و" +
                    Math.max(0, l - o) +
                    " يرثون تسكينهم من " +
                    this.mkLabel(e)
                  : "",
            };
          })(),
          mkNewGo: () => this.doCreateSchedule("day" === t.mode ? { from: "day", key: t.day } : "copy" === t.mode && i ? "copy" : "new"),
          mkNewCancel: () => this.setState({ mkNew: null }),
          mkNewStop: (t) => t.stopPropagation(),
        };
      })(),
      filesOpen: !!s.filesOpen,
      filesToggle: () => this.setState((t) => ({ filesOpen: !t.filesOpen })),
      filesChev: "opacity:.5;transition:transform .2s;" + (s.filesOpen ? "transform:rotate(180deg)" : ""),
      filesBtnStyle:
        "height:36px;display:flex;align-items:center;gap:6px;font-size:12px;border:0;border-radius:12px;padding:0 12px;cursor:pointer;font-family:'Cairo',sans-serif;" +
        (s.filesOpen ? "color:var(--fg-xb99751);background:var(--bg-a185151810p08)" : "color:var(--fg-x475569);background:transparent"),
      exportCsv: () => {
        if (!this.PC("export")) return void this.permDeny();
        const t = h.map((t) => {
            const e = p.find((e) => e.name === t.shift),
              s = !!(e && e.tStart && e.tEnd);
            return [
              t.name,
              t.gender || "—",
              t.type || "—",
              t.empno,
              t.nid || "",
              t.phone,
              String(t.work || "").trim() || "—",
              t.tplName || "—",
              t.cs || "",
              t.shift || "",
              s ? this.fmtClock(e.tStart) + " – " + this.fmtClock(e.tEnd) : "",
              s ? this.fmtDur(this.shiftDurMins(e.tStart, e.tEnd)) : "",
              (t.rest || []).join(" - "),
              t.muk ? "مكلف" : "غير مكلف",
              t.onRest ? "راحة" : "على رأس العمل",
            ];
          }),
          e = [
            [
              "اسم الموظف",
              "الجنس",
              "نوع التوظيف",
              "الرقم الوظيفي",
              "رقم الهوية",
              "رقم الجوال",
              "نوع العمل",
              "الصلاحيات",
              "رمز النداء",
              "الوردية المسندة",
              "وقت الوردية",
              "مدة الوردية",
              "أيام الراحة",
              "التكليف",
              "الحالة",
            ],
          ]
            .concat(t)
            .map(this.bsOn("admin/ptpls") ? (t) => t : (t) => t.filter((t, e) => 7 !== e));
        try {
          KIVO.BassamXLSX
            ? KIVO.BassamXLSX.download(e, "staffing-" + kt + ".xlsx")
            : this.bsToast(
                "تعذّر تصدير Excel — مكتبة الجداول غير متاحة في هذه الجلسة. حدّث الصفحة وأعد المحاولة، أو استخدم «طباعة / حفظ PDF».",
              );
        } catch (t) {
          this.bsToast("تعذّر إنشاء ملف Excel — " + (t && t.message ? t.message : "خطأ غير متوقع") + ".");
        }
        this.setState({ filesOpen: !1 });
      },
      printTable: () => {
        this.PC("export") ? (this.setState({ filesOpen: !1 }), setTimeout(() => window.print(), 150)) : this.permDeny();
      },
      ...e,
      shownCount: String(P.length),
      totalCount: String(d),
    };
    var St, wt;
  }
}
