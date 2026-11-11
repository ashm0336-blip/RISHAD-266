class Component extends KIVO.BassamPageKit.base(DCLogic, [
  "admin+award+daily+dreport+employees+irshad+plan+profile+seized+staff+tasks",
  "daily+dreport+dstats+irshad+plan+seized+staff+tasks",
  "daily+dreport+irshad+plan+seized+staff+tasks",
  "daily+dreport+irshad+plan+profile+seized",
  "daily+plan+seized+staff",
  "daily+dreport+plan",
  "daily+plan",
]) {
  _opService() {
    const service = KIVO.__BS_SRV && KIVO.__BS_SRV.operations;
    if (!service) throw Error("operations-read-required");
    return service;
  }
  _opRead(name) {
    const service = this._opService();
    this._opDrafts || (this._opDrafts = Object.create(null));
    if (!this._opDrafts[name]) this._opDrafts[name] = service.draft();
    return this._opDrafts[name].get(name);
  }
  async _opCommit(changes) {
    try {
      const service = this._opService(),
        names = Object.keys(changes).sort(),
        action = "daily:" + names.join("|");
      // These drafts were captured when the displayed source was loaded. Verify
      // every original scope/revision synchronously before staging one batch.
      this._opActions || (this._opActions = Object.create(null));
      if (!this._opActions[action]) {
        names.forEach((name) => {
          if (!this._opDrafts || !this._opDrafts[name])
            throw Error("operations-review-required");
          this._opDrafts[name].get(name);
        });
        const begun = service.begin(this, action);
        if (!begun || begun.ok !== 1) throw Error("operations-review-required");
        this._opActions[action] = true;
      }
      let result;
      this._opBusy = (this._opBusy || 0) + 1;
      try {
        result = await service.commit(this, action, changes, (draft) => {
          names.forEach((name) => draft.set(name, changes[name]));
        });
      } finally {
        this._opBusy--;
      }
      this._opTicket = result && result.ticket;
      if (!result || result.ok !== 1) {
        this.bsToast(
          (service.explain && service.explain(result)) || (result && result.uncertain
            ? "لم يصل تأكيد الحفظ — بقيت المسودة؛ أعد المحاولة بنفس البيانات لحسم الطلب"
            : "لم يُحفظ التعديل — راجع التغييرات والصلاحيات ثم أعد تحميل البيانات"),
          "warn",
        );
        return result || { ok: 0, err: "save" };
      }
      delete this._opActions[action];
      this._opTicket = null;
      names.forEach((name) => {
        // Advance only our acknowledged source, never another editor's draft.
        if (JSON.stringify(service.get(name)) === JSON.stringify(changes[name]))
          this._opDrafts[name] = service.draft();
      });
      return result;
    } catch (error) {
      this.bsToast(
        "لم يُحفظ التعديل — تغيّرت نسخة البيانات أو سياق الحساب؛ بقي عملك في الصفحة للمراجعة",
        "warn",
      );
      return { ok: 0, err: "review-required" };
    }
  }
  _opWrite(name, value) {
    this._opLastSave = this._opCommit({ [name]: value });
    return this._opLastSave;
  }
  async _opAck(message, tone) {
    const result = this._opLastSave && (await this._opLastSave);
    if (result && result.ok === 1) this.bsAck(message, tone);
  }
  async _opImageAction(name, intent, prepare) {
    this._opImageDrafts || (this._opImageDrafts = Object.create(null));
    const signature = JSON.stringify({
      intent,
      context: this._opService().context(),
    });
    let record = this._opImageDrafts[name];
    if (record && record.intent !== signature) {
      this.bsToast(
        "طلب سابق لم يُحسم — أعد نفس البيانات أو راجع النسخة الحالية",
        "warn",
      );
      return { ok: 0, err: "review-required" };
    }
    if (!record) {
      record = {
        intent: signature,
        preparing: null,
        changes: null,
        finish: null,
        promise: null,
      };
      this._opImageDrafts[name] = record;
      record.preparing = Promise.resolve()
        .then(prepare)
        .then((prepared) => {
          record.changes = prepared.changes;
          record.finish = prepared.finish;
        })
        .catch((error) => {
          if (this._opImageDrafts[name] === record)
            delete this._opImageDrafts[name];
          throw error;
        });
    }
    await record.preparing;
    if (record.promise) return record.promise;
    this._opLastSave = this._opCommit(record.changes);
    record.promise = this._opLastSave
      .then(async (ack) => {
        if (ack && ack.ok === 1) {
          if (record.finish) await record.finish();
          if (this._opImageDrafts[name] === record)
            delete this._opImageDrafts[name];
        }
        return ack;
      })
      .finally(() => {
        record.promise = null;
      });
    return record.promise;
  }
  async _selectDayShift(year, month, day, name) {
    try {
      const service = KIVO.BassamDayShift;
      if (!service) throw Error("operations-read-required");
      const result =
        service.get(year, month, day) === name
          ? { ok: 1, value: name }
          : await service.set(year, month, day, name);
      if (!result || result.ok !== 1 || typeof result.value !== "string") {
        this.bsToast("لم يُؤكد تثبيت الوردية — بقي الاختيار السابق", "warn");
        return { ok: 0 };
      }
      return result;
    } catch (error) {
      this.bsToast("تعذّر تثبيت الوردية — راجع الاتصال والصلاحيات", "warn");
      return { ok: 0 };
    }
  }

  /* عنوان التبويب #/daily/<tab> — يُقرأ من خطّاف الهيكل عند كل تصيير ويُكتب عند كل تبديل؛ نسخ solo (داخل مؤشرات الإدارة) لا تشارك */ _bsHT(
    t,
  ) {
    try {
      if (this.props && this.props.solo) return;
      const h = String(location.hash || ""),
        p = "#/daily";
      if (h.indexOf(p) !== 0) return;
      const w = t ? p + "/" + t : p;
      h !== w && history.replaceState && history.replaceState(null, "", location.pathname + location.search + w);
    } catch (e) {}
  }
  /* الفحص العميق 2026-10-21 (R1 · DG-09): تبويبُ العنوان متزامنٌ قبل حساب القيم (كان setTimeout فيومض «التقرير اليومي» أولاً).
     (R7 · DG-04): «الجولات» تبويبٌ في daily.tabs لا فرعٌ — كان يُسأل subOn فيُرفض لكل مستخدمٍ غير مدير النظام ويُعاد العنوانُ إلى #/daily؛
     الآن قاعدةُ التبويب نفسُها (Vn في renderVals) · والرفضُ يكتب في العنوان التبويبَ المعروض فعلاً · والمزروعُ من الحالة المحفوظة يُكتب فيه */
  _bsHR() {
    try {
      if (this.props && this.props.solo) return;
      const o = KIVO.__BS_OPEN_TAB,
        hv = (x) => ("rounds" === x || "dreport" === x || "tasks" === x ? x : "");
      if (!o || o.page !== "daily") {
        const sd = this.__bsSeeded;
        sd && void 0 !== sd.dsTab && ((this.__bsSeeded = null), this._bsHT(hv(this.state.dsTab)));
        return;
      }
      KIVO.__BS_OPEN_TAB = null;
      this.__bsSeeded = null;
      const t = o.tab,
        P = KIVO.BassamPerm || {},
        V = ["rounds", "dreport", "tasks"];
      const ok =
        -1 !== V.indexOf(t) &&
        ("dreport" === t || "tasks" === t
          ? P.can
            ? P.can(t, "view")
            : !0
          : this._dsTabOn("rounds") && (this.bsLensOn("zones") || this.bsLensOn("gates") || this.bsLensOn("marks") || this.bsLensOn("paths")));
      if (!ok) {
        this._bsHT(hv(this.state.dsTab));
        return;
      }
      this.state.dsTab !== t && (this.state = { ...this.state, dsTab: t });
      this._bsHT(t);
    } catch (e) {}
  }
  setState(t, e) {
    const r = super.setState(t, e);
    try {
      t &&
        "object" == typeof t &&
        void 0 !== t.dsTab &&
        this._bsHT(
          (() => {
            const n = { ...this.state, ...t };
            return "rounds" === n.dsTab || "dreport" === n.dsTab || "tasks" === n.dsTab ? n.dsTab : "";
          })(),
        );
    } catch (x) {}
    return r;
  }
  bsToast(t, e) {
    try {
      const s = e || "err";
      let n = document.getElementById("bs-toast");
      n || ((n = document.createElement("div")), (n.id = "bs-toast"), document.body.appendChild(n));
      const i =
        "ok" === s
          ? ["var(--toast-ok)", "var(--bg-toast)", "var(--toast-ok-bd)", "✓"]
          : "warn" === s
            ? ["var(--toast-warn)", "var(--bg-toast)", "var(--toast-warn-bd)", "⚠"]
            : ["var(--toast-err)", "var(--bg-toast)", "var(--toast-err-bd)", "⚠"];
      (n.setAttribute(
        "style",
        "position:fixed;top:16px;left:50%;transform:translateX(-50%) translateY(-8px);z-index:2147483000;max-width:min(560px,92vw);direction:rtl;text-align:right;font-family:'Cairo',sans-serif;font-size:13px;font-weight:600;line-height:1.9;color:" +
          i[0] +
          ";background:" +
          i[1] +
          ";border:1px solid " +
          i[2] +
          ";border-radius:14px;padding:12px 18px;box-shadow:var(--shadow-elevated);opacity:0;transition:opacity .22s ease, transform .22s ease;pointer-events:none",
      ),
        (n.textContent = i[3] + "  " + String(null == t ? "" : t)),
        requestAnimationFrame(() => {
          try {
            ((n.style.opacity = "1"), (n.style.transform = "translateX(-50%) translateY(0)"));
          } catch (t) {}
        }),
        clearTimeout(this._bsToastT),
        (this._bsToastT = setTimeout(() => {
          try {
            ((n.style.opacity = "0"), (n.style.transform = "translateX(-50%) translateY(-8px)"));
          } catch (t) {}
        }, 4200)));
    } catch (t) {}
  }
  dsFocusApply() {
    try {
      var t = KIVO.BassamDayFocus ? KIVO.BassamDayFocus.get() : null;
      if (!t) return;
      var e = this.state;
      if (t.y === e.year && t.m === e.month && t.d === e.day) return;
      var s = this.hMonthDays ? this.hMonthDays(t.y, t.m) : 30;
      this.setState({ year: t.y, month: t.m, day: Math.min(t.d, s) });
    } catch (t) {}
  }
  componentDidUpdate(t, e) {
    try {
      var s = this.state,
        n = s.year + "-" + s.month + "-" + s.day;
      if (!e || e.year !== s.year || e.month !== s.month || e.day !== s.day)
        return (+s.day >= 1 && KIVO.BassamDayFocus && KIVO.BassamDayFocus.set(s.year, s.month, s.day), void (this._fsig = n));
      var i = KIVO.BassamDayFocus ? KIVO.BassamDayFocus.get() : null;
      if (!i) return;
      var o = i.y + "-" + i.m + "-" + i.d;
      if (o === n) return void (this._fsig = o);
      if (this._fsig === o) return;
      ((this._fsig = o), this.dsFocusApply());
    } catch (t) {}
  }
  bsMenusPatch() {
    return { zDd: null, bDd: null, fldOpen: null, distFilterOpen: null, prOpen: null, dsGateFly: null, dayShOpen: null };
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
      var n = this,
        i = this.bsMenusPatch(),
        o = {};
      (Object.keys(i).forEach(function (t) {
        o[t] = n.state[t];
      }),
        setTimeout(function () {
          try {
            var t = !1,
              e = !1,
              r = n.state;
            if (
              (Object.keys(i).forEach(function (s) {
                (r[s] !== o[s] && (t = !0), r[s] && (e = !0));
              }),
              t || s || !e)
            )
              return;
            n.setState(i);
          } catch (t) {}
        }, 0));
    } catch (t) {}
  }
  componentDidMount() {
    ((this._storeLis = (t) => {
      try {
        const e = (t && t.detail && t.detail.key) || "";
        const state = this.state || {};
        if (this._dsWriting || this._opBusy || this._opTicket) return;
        if (
          state.siteModal ||
          state.imp ||
          state.zEdit ||
          state.mkEdit ||
          state.pEdit ||
          state.gClose ||
          state.fdOffAsk ||
          (state.dsPolyPts && state.dsPolyPts.length) ||
          state.dsdrag ||
          state.zdrag ||
          state.pdrag ||
          state.vdrag
        )
          return;
        if (this._opDrafts) delete this._opDrafts[e];
        if (e === "bassam_plan_v1") {
          this.setState({ fimgs: {} });
          this._loadFloorImgs();
        }
        if (e === "bassam_zone_opts_v1")
          this.setState({ zoneOpts: this.loadZoneOpts() });
        if (this._opService().resources.indexOf(e) >= 0)
          this.setState((state) => ({ extTick: (state.extTick || 0) + 1 }));
        if ("bassam_rounds_v1" === e && !this._dsWriting)
          try {
            this.setState({ rounds: this.loadRounds() });
          } catch (t) {}
        ("bassam_plan_v1" !== e &&
          "bassam_dreport_v1" !== e &&
          "bassam_dayshift_v1" !== e) ||
          ((this._drAp9 = null),
          this.setState((t) => ({ extTick: (t.extTick || 0) + 1 })),
          "bassam_plan_v1" === e &&
            setTimeout(async () => {
              try {
                const t = KIVO.BassamDayFocus && KIVO.BassamDayFocus.get();
                if (!t) return;
                const e = (this._opRead("bassam_dreport_v1") || {} || {})[
                  t.y + "-" + t.m + "-" + t.d
                ];
                if (!(e && e.shifts && Object.keys(e.shifts).some((t) => e.shifts[t] && e.shifts[t].pulled))) return;
                (KIVO.BassamPerm &&
                  KIVO.BassamPerm.canW &&
                  !KIVO.BassamPerm.canW("bassam_rounds_v1", "add")) ||
                  ("created" ===
                    (await KIVO.BassamRound.ensure(t.y, t.m, t.d)).status &&
                    this.bsAck(
                      "أُنشئت جولة يوم " +
                        t.d +
                        " تلقائياً من التشغيل الميداني",
                      "ok",
                    ));
              } catch (t) {}
            }, 50));
      } catch (t) {}
    }),
      window.addEventListener("bassam:store", this._storeLis),
      (this._dayShLis = () => {
        try {
          this.setState({ distFilterShift: null, dsShiftAll: !1 });
        } catch (t) {}
      }));
    try {
      window.addEventListener("bs-dayshift", this._dayShLis);
    } catch (t) {}
    try {
      const t = ["zones", "paths", "marks", "gates", "dens"].filter((t) => this.bsLensOn(t));
      if (1 === t.length) {
        const e = t[0],
          s =
            "gates" === e
              ? { panelTab: "gates", lens: "gates", gateDim: "summary" }
              : "marks" === e
                ? { panelTab: "marks", lens: "marks", markDim: "summary" }
                : "dens" === e
                  ? { panelTab: "dens", lens: "density", densDim: "summary" }
                  : "paths" === e
                    ? { panelTab: "paths", lens: "zones", pathDim: "summary" }
                    : { panelTab: "zones", lens: "zones", brkDim: "summary" };
        (this.state.panelTab === s.panelTab && this.state.lens === s.lens) ||
          this.setState(Object.assign({ tool: "select", dsSel: null, selMulti: [] }, s));
      }
    } catch (t) {}
    ((this._bsOutM = (t) => this._bsOutsideMenus(t)),
      document.addEventListener("click", this._bsOutM, !0),
      this.dsFocusApply(),
      (this._focusLis = () => this.dsFocusApply()));
    try {
      window.addEventListener("bs-dayfocus", this._focusLis);
    } catch (t) {}
    ((this._fldDoc = (t) => {
      if (this.state.bDd) {
        const e = document.getElementById("bsBkDds");
        (t.target && t.target.closest && t.target.closest(".bs-optmenu")) || !e || e.contains(t.target) || this.setState({ bDd: null });
      }
      if (!this.state.fldOpen) return;
      const e = document.getElementById("bsFldBox");
      (t.target && t.target.closest && t.target.closest(".bs-pop")) || (e && e.contains(t.target)) || this.setState({ fldOpen: null });
    }),
      document.addEventListener("mousedown", this._fldDoc, !0),
      (this._wideNow = "undefined" == typeof window || window.innerWidth > 980),
      (this._rs = () => {
        (this._rsT && clearTimeout(this._rsT),
          (this._rsT = setTimeout(() => {
            const t = window.innerWidth > 980;
            t !== this._wideNow && ((this._wideNow = t), this.setState({ panelOpen: t }));
          }, 160)));
      }));
    try {
      (window.addEventListener("resize", this._rs), window.addEventListener("orientationchange", this._rs));
    } catch (t) {}
    this._dsFlyBound = (t) => this._dsFlyDoc(t);
    try {
      document.addEventListener("mousedown", this._dsFlyBound, !0);
    } catch (t) {}
    ((this._kd = (t) => {
      const e = String(t.key || "").toLowerCase();
      if ("escape" === e && this.state.zcs) return (t.preventDefault(), void this.setState({ zcs: null }));
      if ("escape" === e && (this.state.zDd || this.state.zDdEdit))
        return (t.preventDefault(), void this.setState({ zDd: null, zDdEdit: null, zDdEditT: null }));
      if ("escape" === e && this.state.zEdit) return (t.preventDefault(), void this.closeZoneEditorDS());
      if ("escape" === e && this.state.pEdit) return (t.preventDefault(), void this._dsClosePathEditor());
      if (!/INPUT|TEXTAREA|SELECT/.test(t.target.tagName)) {
        if (/^arrow(up|down|left|right)$/.test(e) && this.state.dsSel && !this.state.zEdit && !this.state.pEdit && this._dsCanEditZones()) {
          const s = this.state.dsSel,
            n = (((this.state.dview || {}).w || 1e3) / 1e3) * (t.shiftKey ? 10 : 1.5),
            i = "arrowleft" === e ? -n : "arrowright" === e ? n : 0,
            o = "arrowup" === e ? -n : "arrowdown" === e ? n : 0;
          if (!i && !o) return;
          t.preventDefault();
          const r = Array.isArray(this.state.selMulti) && this.state.selMulti.length ? this.state.selMulti : [s.i],
            a = (t) => r.indexOf(t) >= 0;
          return void this._updRoundAt(this.state.floor >= 0 ? this.state.floor : 0, (t) => {
            "zone" === s.t
              ? (t.zones = (t.zones || []).map((t, e) =>
                  a(e) ? { ...t, d: this._shiftD(t.d, i, o), cx: Math.round((+t.cx || 0) + i), cy: Math.round((+t.cy || 0) + o) } : t,
                ))
              : "path" === s.t &&
                (t.paths = (t.paths || []).map((t, e) =>
                  a(e) ? { ...t, pts: (t.pts || []).map((t) => ({ x: t.x + i, y: t.y + o })) } : t,
                ));
          });
        }
        if ((t.ctrlKey || t.metaKey) && "z" === e) return (t.preventDefault(), void (t.shiftKey ? this.dsHistRedo() : this.dsHistUndo()));
        if ((t.ctrlKey || t.metaKey) && "y" === e) return (t.preventDefault(), void this.dsHistRedo());
        if (!t.ctrlKey && !t.metaKey) {
          if ("escape" === e) {
            const t = this.state;
            return t.zdrag || t.vdrag || t.edrag || t.tdrag || t.cresize || t.rotdrag || t.dspdrag || t.dspvdrag
              ? void this.setState({
                  dsZoneTmp: null,
                  dsPathTmp: null,
                  zdrag: null,
                  vdrag: null,
                  edrag: null,
                  tdrag: null,
                  cresize: null,
                  rotdrag: null,
                  dspdrag: null,
                  dspvdrag: null,
                  dsPan: null,
                })
              : t.draft || (t.dsPolyPts && t.dsPolyPts.length) || t.dsPolyCursor
                ? void this.setState({
                    draft: null,
                    dsPolyPts: [],
                    dsPolyCursor: null,
                    dsPan: null,
                    dsSel: null,
                    selMulti: [],
                    dsHovZ: null,
                    dsHovG: null,
                  })
                : t.tool && "select" !== t.tool
                  ? void this.setState({
                      tool: "select",
                      draft: null,
                      dsPolyPts: [],
                      dsPolyCursor: null,
                      dsPan: null,
                      dsSel: null,
                      selMulti: [],
                      dsHovZ: null,
                      dsHovG: null,
                    })
                  : t.mapFs && !t.dsSel && !(t.selMulti && t.selMulti.length)
                    ? void (function (o) {
                        try {
                          document.body.style.overflow = "";
                        } catch (t) {}
                        o.setState({ mapFs: !1, draft: null, dsPolyPts: [], dsPolyCursor: null, dsPan: null, dsHovZ: null, dsHovG: null });
                      })(this)
                    : void this.setState({
                        draft: null,
                        dsPolyPts: [],
                        dsPolyCursor: null,
                        dsPan: null,
                        dsSel: null,
                        selMulti: [],
                        dsHovZ: null,
                        dsHovG: null,
                      });
          }
          ("delete" !== e && "backspace" !== e) || !this.state.dsSel
            ? "v" === e
              ? this.setState({ tool: "select" })
              : this._dsCanEditZones() &&
                ("r" === e
                  ? this.setState({ tool: "rect" })
                  : "s" === e
                    ? this.setState({ tool: "square" })
                    : "c" === e
                      ? this.setState({ tool: "circle" })
                      : "p" === e
                        ? this.setState({ tool: "poly" })
                        : "m" === e && this.bsLensOn("paths")
                          ? this.setState({ tool: "path", dsSel: null, selMulti: [], dsPolyPts: [], dsPolyCursor: null })
                          : "k" === e &&
                            this.bsLensOn("marks") &&
                            this.setState({ tool: "mark", dsSel: null, selMulti: [], dsPolyPts: [], dsPolyCursor: null }))
            : (t.preventDefault(), this._dsRemoveSel());
        }
      }
    }),
      window.addEventListener("keydown", this._kd),
      (this._dsUndo = []),
      (this._dsRedo = []),
      (this._dsHistMerge = null),
      this._loadFloorImgs());
  }
  _occStop() {
    (this._occT && (clearTimeout(this._occT), (this._occT = null)), this._occI && (clearInterval(this._occI), (this._occI = null)));
  }
  _occHold(t, e) {
    this._occStop();
    const s = this._occApply;
    if (!s || !s[t]) return;
    let n = "n" === t ? (null == s.curN ? 0 : +s.curN) : null == s.curP ? 0 : +s.curP;
    const i = "n" === t ? 9999999 : 300,
      o = () => {
        const o = Math.round(10 * (n + e)) / 10;
        o < 0 || o > i ? this._occStop() : ((n = o), this.setState({ occDraft: null }), s[t](n));
      };
    (o(),
      (this._occT = setTimeout(() => {
        this._occI = setInterval(o, 85);
      }, 420)));
  }
  _dsFlyDoc(t) {
    if (!this.state.dsShapeFly) return;
    const e = document.getElementById("bsDsToolsBar");
    (e && e.contains(t.target)) || this.setState({ dsShapeFly: null });
  }
  componentWillUnmount() {
    try {
      window.removeEventListener("bassam:store", this._storeLis);
    } catch (t) {}
    this._bsOutM && document.removeEventListener("click", this._bsOutM, !0);
    try {
      window.removeEventListener("bs-dayfocus", this._focusLis);
    } catch (t) {}
    try {
      document.removeEventListener("mousedown", this._fldDoc, !0);
    } catch (t) {}
    try {
      window.removeEventListener("bs-dayshift", this._dayShLis);
    } catch (t) {}
    try {
      (window.removeEventListener("resize", this._rs), window.removeEventListener("orientationchange", this._rs));
    } catch (t) {}
    this._rsT && (clearTimeout(this._rsT), (this._rsT = null));
    try {
      document.removeEventListener("mousedown", this._dsFlyBound, !0);
    } catch (t) {}
    this._occStop();
    try {
      window.removeEventListener("keydown", this._kd);
    } catch (t) {}
  }
  flashSel(t, e) {
    const s = t && t.t,
      n = e || ("gate" === s ? "gates" : "mark" === s ? "marks" : "path" === s ? "paths" : "zones");
    (this._dsFlashT && (clearTimeout(this._dsFlashT), (this._dsFlashT = null)),
      this.setState({ dsSel: t, selMulti: [t.i], lens: n, flash: t }),
      (this._dsFlashT = setTimeout(() => {
        ((this._dsFlashT = null), this.setState({ flash: null }));
      }, 1500)));
  }
  _covCurGates() {
    const t = this.state,
      e = t.year + "-" + t.month + "-" + Math.min(t.day, this.hMonthDays(t.year, t.month)),
      s = (t.rounds || {})[e],
      n = s && Array.isArray(s.d) ? s.d[t.floor >= 0 ? t.floor : 0] : null,
      i = this._covKind || "gates";
    return (n && n[i]) || [];
  }
  _covLbl(t) {
    if (!t) return "";
    const e = this._covKind || "gates";
    if ("marks" === e) return t.label || t.kind || "معلم";
    if ("zones" === e) return t.code || t.name || "مصلى";
    const s = KIVO.BassamLeaf,
      n = this._covCurGates(),
      i = t.pOf ? s.leafLabel(s.parentOf(n, t) || t, t) : t.num || "";
    return (i ? "#" + i : "باب") + (t.pOf || (!t.label && !t.name) ? "" : " — " + (t.label || t.name));
  }
  _covOff(t) {
    return "gates" === (this._covKind || "gates") ? !!t.closed : !!t.off;
  }
  _covPos(t) {
    if ("zones" !== (this._covKind || "gates")) return { x: t.x, y: t.y };
    const e = (String(t.d || "").match(/-?\d+\.?\d*/g) || []).map(Number);
    let s = 0,
      n = 0,
      i = 0;
    for (let t = 0; t + 1 < e.length; t += 2) ((s += e[t]), (n += e[t + 1]), i++);
    return i ? { x: s / i, y: n / i } : { x: 500, y: 300 };
  }
  _covMove(t, e, s, n, i, o) {
    const r = this._covKind || "gates",
      a = this._covCurGates()[n];
    if (!a || this._covOff(a) || ("gates" === r && KIVO.BassamLeaf.isParent(a)))
      return void (
        this.bsToast &&
        this.bsToast(
          "gates" === r ? "لا يُنقل إلى باب مغلق أو باب أم — اختر فتحة أو باباً مفتوحاً" : "لا يُنقل إلى عنصر معطّل — اختر عنصراً فعّالاً",
          "warn",
        )
      );
    let l = "";
    try {
      const t = KIVO.BassamAuth && KIVO.BassamAuth.display ? KIVO.BassamAuth.display() : "";
      l = t && "object" == typeof t ? t.name || "" : String(t || "");
    } catch (t) {}
    const d = new Date().toTimeString().slice(0, 5),
      p = o || "";
    (this._updRound((i, o) => {
      const a = i[r] || [],
        h = a[n];
      if (!h) return;
      const c = s >= 0 ? a[s] : null;
      (c && (c.emp = (c.emp || []).filter((s) => s !== t && s !== e)),
        (h.emp || []).some((s) => s === t || s === e) || (h.emp = (h.emp || []).concat([this._ck(e || t)])),
        (o.mvLog = (o.mvLog || []).concat([
          {
            t: d,
            kind: r,
            key: e || t,
            tok: t,
            fromI: s,
            toI: n,
            fromLbl: c ? this._covLbl(c) : "",
            toLbl: this._covLbl(h),
            by: l,
            name: p,
          },
        ])));
    }),
      !i &&
        this.bsToast &&
        this._opAck("تم النقل — انعكس على الخريطة والتقرير اليومي", "ok"));
  }
  _covMoveAll(t) {
    const e = this._covCurGates()[t];
    if (!e) return;
    const s = KIVO.BassamLeaf,
      n = this._covKind || "gates",
      i = (t, e) => {
        const s = this._covPos(t),
          n = this._covPos(e);
        return Math.hypot(s.x - n.x, s.y - n.y);
      };
    let o = "";
    try {
      o = (KIVO.BassamDayShift ? KIVO.BassamDayShift.get(this.state.year, this.state.month, this.state.day) : "") || "";
    } catch (t) {}
    ((e.emp || []).slice().forEach((r) => {
      const a = this._covCurGates()
        .map((t, e) => ({ g: t, i: e }))
        .filter((t) => {
          return (
            !this._covOff(t.g) &&
            !("gates" === n && s.isParent(t.g)) &&
            ((e = t.g), (o ? KIVO.BassamNeed.of(e, o) : 0) > (t.g.emp || []).length)
          );
          var e;
        })
        .map((t) => ({ x: t, d: i(t.g, e) + ((t.g.loc || t.g.region || "") === (e.loc || e.region || "") ? 0 : 150) }))
        .sort((t, e) => t.d - e.d)[0];
      a && this._covMove(r, r, t, a.x.i, !0);
    }),
      this.bsToast &&
        this._opAck("نُقل من على العنصر المعطّل إلى أقرب عجز", "ok"));
  }
  _covLift(t, e, s) {
    const n = this._covKind || "gates";
    (this._updRound((i) => {
      const o = (i[n] || [])[s];
      o && (o.emp = (o.emp || []).filter((s) => s !== t && s !== e));
    }),
      this.bsToast && this._opAck("رُفع — الإشرافي لا يُحسب في التغطية", "ok"));
  }
  _covUndo() {
    const t = this.state,
      e = t.year + "-" + t.month + "-" + Math.min(t.day, this.hMonthDays(t.year, t.month)),
      s = (t.rounds || {})[e],
      n = this._covKind || "gates",
      i = ((s && s.mvLog) || []).filter((t) => (t.kind || "gates") === n),
      o = i[i.length - 1];
    o &&
      (this._updRound((t, e) => {
        const s = t[n] || [],
          i = s[o.toI];
        if ((i && (i.emp = (i.emp || []).filter((t) => t !== o.tok && t !== o.key)), o.fromI >= 0 && s[o.fromI])) {
          const t = s[o.fromI];
          (t.emp || []).some((t) => t === o.tok || t === o.key) || (t.emp = (t.emp || []).concat([this._ck(o.tok || o.key)]));
        }
        const r = (e.mvLog || []).lastIndexOf((e.mvLog || []).filter((t) => (t.kind || "gates") === n).slice(-1)[0]);
        r >= 0 && (e.mvLog = e.mvLog.slice(0, r).concat(e.mvLog.slice(r + 1)));
      }),
      this.bsToast && this._opAck("تم التراجع عن آخر نقل", "ok"));
  }
  _covFly(t) {
    const e = this._covCurGates()[t];
    if (!e) return;
    const s = this._covKind || "gates",
      n = this._covPos(e),
      i = this.state.dview || { x: 0, y: 0, w: 1e3, h: 600 },
      o = Math.min(i.w, 300),
      r = 0.6 * o;
    this.setState({
      dsSel: { t: "gates" === s ? "gate" : "marks" === s ? "mark" : "zone", i: t },
      selMulti: [t],
      dview: { x: n.x - o / 2, y: n.y - r / 2, w: o, h: r },
      dsHovG: null,
      dsHovM: null,
      dsHovZ: null,
    });
  }
  _pickSel(t, e, s) {
    const n = this.state,
      i = n.dsSel && n.dsSel.t === t;
    let o = i && Array.isArray(n.selMulti) ? n.selMulti.slice() : [];
    if (!s || !i) return void this.setState({ dsSel: { t: t, i: e }, selMulti: [e], dsHovZ: null, dsHovG: null, dsHovM: null });
    const r = o.indexOf(e);
    (r >= 0 ? o.splice(r, 1) : o.push(e),
      o.length
        ? this.setState({ dsSel: { t: t, i: o[0] }, selMulti: o, dsHovZ: null, dsHovG: null, dsHovM: null })
        : this.setState({ dsSel: null, selMulti: [], dsHovZ: null, dsHovG: null, dsHovM: null }));
  }
  _shiftD(t, e, s) {
    let n = 0;
    return String(t || "").replace(/-?\d*\.?\d+/g, (t) => {
      const i = parseFloat(t) + (n++ % 2 == 0 ? e : s);
      return String(Math.round(100 * i) / 100);
    });
  }
  _psKeyZ(t) {
    return "z:" + (String((t && t.code) || "").trim() || "n:" + String((t && t.name) || "").trim());
  }
  _psKeyG(t) {
    if (!t) return "g:";
    if (t.pOf) return "g:leaf:" + t.pOf + ":" + (t.leafNo || 0);
    if (t.gid) return "g:id:" + t.gid;
    const e = String(null == t.num ? "" : t.num).trim();
    return e ? "g:n:" + e : "g:l:" + String(t.label || "").trim();
  }
  _psKeyM(t) {
    return "m:" + String((t && t.label) || "").trim() + "|" + String((t && t.kind) || "").trim();
  }
  _planSyncPreview(t, e) {
    if (!Array.isArray(t) || !t.length) return null;
    const s = [];
    let n = 0;
    const bySid =
      (e || []).length && (e || []).every((t) => t && t.sid)
        ? (() => {
            const t = {};
            return (
              (e || []).forEach((e) => {
                t[String(e.sid)] = e;
              }),
              t
            );
          })()
        : null;
    return (
      t.forEach((t, i) => {
        const o = bySid ? (t && t.sid ? bySid[String(t.sid)] || null : (e || [])[i]) : (e || [])[i],
          r = (t, e, s, n) => {
            const u = {};
            (s || []).forEach((t) => {
              t && t.uid && (u[String(t.uid)] = 1);
            });
            const k = (t) => (t && t.uid && u[String(t.uid)] ? "u:" + t.uid : n(t)),
              i = {},
              o = {};
            ((e || []).forEach((t) => {
              i[k(t)] = 1;
            }),
              (s || []).forEach((t) => {
                o[k(t)] = 1;
              }));
            let r = 0,
              a = 0,
              l = 0;
            return (
              Object.keys(i).forEach((t) => {
                o[t] ? a++ : r++;
              }),
              Object.keys(o).forEach((t) => {
                i[t] || l++;
              }),
              { add: r, upd: a, del: l }
            );
          },
          a = r(0, t.zones, o ? o.zones : [], this._psKeyZ.bind(this)),
          l = r(0, t.gates, o ? o.gates : [], this._psKeyG.bind(this)),
          d = r(0, t.marks, o ? o.marks : [], this._psKeyM.bind(this)),
          p = (t.paths || []).length,
          h = o ? (o.paths || []).length : 0,
          c = a.add + l.add + d.add + (o ? 0 : p),
          g = a.upd + l.upd + d.upd + (o ? Math.min(p, h) : 0),
          f = a.del + l.del + d.del + (o ? Math.max(0, h - p) : 0);
        ((n += c + f + (a.upd + l.upd + d.upd)),
          s.push({ name: (t.name || "الموقع " + (i + 1)) + (o ? "" : " (جديد)"), add: String(c), upd: String(g), del: String(f) }));
      }),
      { rows: s, total: n }
    );
  }
  _planSyncApply(t) {
    const e = this.state,
      s = e.year + "-" + e.month + "-" + Math.min(e.day, this.hMonthDays(e.year, e.month));
    let n = null;
    try {
      n = this._opRead("bassam_plan_v1");
    } catch (t) {}
    const i = n && n.months ? n.months[e.year + "-" + e.month] : null,
      o0 = i ? (Array.isArray(i) ? i : i.d) : null;
    if (!Array.isArray(o0)) return;
    const o = ((t) => {
      try {
        return KIVO.BassamRound && KIVO.BassamRound.lensFilter ? KIVO.BassamRound.lensFilter(t) : t;
      } catch (e) {
        return t;
      }
    })(o0);
    const r = { ...(e.rounds || {}) },
      a = r[s];
    if (!a || !Array.isArray(a.d) || a.ap) return;
    let l;
    try {
      l = JSON.parse(JSON.stringify(a));
    } catch (t) {
      return;
    }
    const d = (t, e, s, n) => {
        const i = {},
          iu = {};
        return (
          (e || []).forEach((t) => {
            ((i[s(t)] = t), t && t.uid && (iu[String(t.uid)] = t));
          }),
          JSON.parse(JSON.stringify(t || [])).map((t) => {
            const e =
              (t && t.uid && iu[String(t.uid)]) ||
              (() => {
                const e = i[s(t)];
                return e && e.uid && t && t.uid && String(e.uid) !== String(t.uid) ? null : e;
              })();
            if (!e) return t;
            const o = { ...t };
            return (
              n.forEach((t) => {
                void 0 !== e[t] ? (o[t] = e[t]) : delete o[t];
              }),
              o
            );
          })
        );
      },
      bySid =
        (l.d || []).length && (l.d || []).every((t) => t && t.sid)
          ? (() => {
              const t = {};
              return (
                (l.d || []).forEach((e) => {
                  t[String(e.sid)] = e;
                }),
                t
              );
            })()
          : null;
    (o.forEach((t, e) => {
      const s = bySid ? (t && t.sid ? bySid[String(t.sid)] || null : l.d[e]) : l.d[e];
      s
        ? ((s.zones = d(t.zones, s.zones, this._psKeyZ.bind(this), ["emp", "count", "pc", "off"]).map((t) => ({
            ...t,
            count: null == t.count ? null : t.count,
            pc: t.pc || {},
          }))),
          (s.gates = d(t.gates, s.gates, this._psKeyG.bind(this), ["emp", "closed", "cWhy", "cAt"])),
          (s.marks = d(t.marks, s.marks, this._psKeyM.bind(this), ["emp", "off"])),
          (s.paths = JSON.parse(JSON.stringify(t.paths || []))))
        : (() => {
            const s = JSON.parse(
              JSON.stringify({
                zones: (t.zones || []).map((t) => ({ ...t, count: null, pc: {} })),
                gates: t.gates || [],
                paths: t.paths || [],
                marks: t.marks || [],
                hidePaths: !!t.hidePaths,
                hideGates: !!t.hideGates,
                hideMarks: !!t.hideMarks,
                sid: t.sid,
              }),
            );
            bySid && t && t.sid ? l.d.push(s) : (l.d[e] = s);
          })();
    }),
      (l.synced = Date.now()),
      (r[s] = l),
      this.saveRounds(r),
      this.setState({ planSync: null, dsSel: null, selMulti: [], dsHovZ: null, dsHovG: null, dsHovM: null }),
      this._opAck(
        "حُدِّثت جولة اليوم من الخطة — التسكين وحالات الأبواب والقراءات كما هي",
        "ok",
      ));
  }
  _leafIdx(t, e) {
    const s = KIVO.BassamLeaf,
      n = [];
    return (
      (e || []).forEach((e) => {
        const i = (t || [])[e];
        s.isParent(i)
          ? (t || []).forEach((t, e) => {
              t && t.pOf === i.gid && n.push(e);
            })
          : n.push(e);
      }),
      n
    );
  }
  _fdHistOf(t, e, s) {
    const n = KIVO.BassamField,
      i = this.state,
      o = t + ":" + (i.floor >= 0 ? i.floor : 0) + ":" + e,
      r = !!(i.regHist || {})[o];
    let a = [];
    try {
      a = n && n.hist ? n.hist(s, t) : [];
    } catch (t) {}
    const A = KIVO.BassamAudit,
      ET = { zones: "zone", gates: "gate", marks: "mark", paths: "path" }[t] || t,
      eid = (s && (s.eid || s.id)) || "",
      ck = ET + ":" + eid,
      C = (eid && (i.audHist || {})[ck]) || null,
      cr = C && Array.isArray(C.rows) ? C.rows : [];
    const cen = cr.map((x) => {
      const v = A ? A.rowVM(x) : {};
      const today = Date.now() - (+x.ts || 0) < 864e5;
      return {
        at: +x.ts || 0,
        key: String(x.act || ""),
        t: (today ? "" : (v.date || "") + " ") + (v.t || ""),
        by: v.by || "—",
        act: (v.act || "") + (v.ctx ? " — " + v.ctx : ""),
        why: (v.details || [])
          .slice(0, 3)
          .map((d) => d.f + ": " + (d.from ? d.from + " ← " : "") + d.to)
          .join(" · "),
        whyOn: !!(v.details && v.details.length),
        del: !!v.deleted,
      };
    });
    const kL = (t) => (/^(عطّل|أغلق)/.test(t) ? "disabled" : /^أعاد (تفعيل|فتح)/.test(t) ? "enabled" : "");
    const loc = a
      .map((t) => ({ at: +t.at || 0, t: t.t, by: t.by || "—", act: t.act, why: t.why || "", whyOn: !!t.why, del: !1 }))
      .filter((l) => {
        const k = kL(l.act);
        return !k || !cen.some((c) => c.key === k && Math.abs(c.at - l.at) < 3e5);
      });
    const all = loc.concat(cen).sort((x, y) => y.at - x.at),
      nTot = C && C.rows ? all.length : a.length;
    return {
      histHas: !0,
      histOn: r,
      histN: String(nTot) + (eid && !(C && C.rows) ? "+" : ""),
      histTitle: (r ? "طيّ" : "فتح") + " سجل الحركة (" + nTot + ")",
      histChev: "transition:transform .2s;flex-shrink:0;" + (r ? "transform:rotate(180deg)" : ""),
      histTog: () => {
        this.setState({ regHist: { ...(this.state.regHist || {}), [o]: !r } });
        if (!r && eid && A && !(C && C.rows)) {
          const H = this.state.audHist || {};
          this.setState({ audHist: { ...H, [ck]: { ...(H[ck] || {}), loading: !0 } } });
          A.entityHistory(ET, eid).then((res) => {
            const H2 = this.state.audHist || {};
            this.setState({ audHist: { ...H2, [ck]: { loading: !1, rows: res.rows || [], err: res.ok ? "" : res.err || "تعذّر الجلب" } } });
          });
        }
      },
      histRows: all,
      histEmpty: 0 === all.length,
      histHead: "سجل الحركة" + (C && C.loading ? " — جارٍ التحميل…" : C && C.err ? " — " + C.err : ""),
    };
  }
  _fdTog(t, e) {
    const s = Date.now(),
      n = this._fdBy(),
      i = !t.off,
      o = { at: s, a: (i ? "عطّل " : "أعاد تفعيل ") + ((KIVO.BassamField && KIVO.BassamField.KIND_AL[e]) || "الموقع"), by: n, kind: e },
      r = { ...t, off: i, fAt: s, fBy: n, fLog: (Array.isArray(t.fLog) ? t.fLog : []).concat([o]).slice(-60) };
    return (i || (delete r.off, delete r.cWhy, delete r.cAt, delete r.cAtMs, delete r.cBy), r);
  }
  _togLeafExp(t) {
    if (!t) return;
    const e = this.state.gExp || {};
    this.setState({ gExp: { ...e, [t]: !e[t] }, dsHovG: null });
  }
  _bulk(t) {
    const e = this.state,
      s = Array.isArray(e.selMulti) ? e.selMulti : [];
    if (!e.dsSel || !s.length) return;
    const n = e.dsSel.t,
      i = "zone" === n ? "zones" : "gate" === n ? "gates" : "mark" === n ? "marks" : "paths";
    this._updRoundAt(this.state.floor >= 0 ? this.state.floor : 0, (e) => {
      const n = "gates" === i ? this._leafIdx(e.gates, s) : s;
      e[i] = (e[i] || []).map((e, s) => (n.indexOf(s) >= 0 ? t(e, s) : e));
    });
  }
  _bulkDelete() {
    const t = this.state,
      e = Array.isArray(t.selMulti) ? t.selMulti : [];
    if (!t.dsSel || !e.length) return;
    const s = t.dsSel.t,
      n = "zone" === s ? "zones" : "gate" === s ? "gates" : "mark" === s ? "marks" : "paths";
    (this._updRoundAt(this.state.floor >= 0 ? this.state.floor : 0, (t) => {
      t[n] = (t[n] || []).filter((t, s) => e.indexOf(s) < 0);
    }),
      this.setState({ dsSel: null, selMulti: [], bulkAsk: !1 }));
  }
  openBulkEditor() {
    const t = this.state,
      e = Array.isArray(t.selMulti) ? t.selMulti : [];
    !t.dsSel ||
      e.length < 2 ||
      this.setState({
        zdrag: null,
        bDd: null,
        bEdit: {
          t: t.dsSel.t,
          n: e.length,
          yard: "",
          region: "",
          level: "",
          ztype: "",
          zcat: "",
          off: "",
          type: "",
          line: "",
          w: "",
          active: "",
        },
      });
  }
  applyBulkEditor() {
    const t = this.state.bEdit;
    if (!t) return;
    const e = {},
      s = (s) => {
        "" !== t[s] && null != t[s] && (e[s] = t[s]);
      },
      n = (s) => {
        "yes" === t[s] ? (e[s] = !0) : "no" === t[s] && (e[s] = !1);
      };
    ("zone" === t.t
      ? (["yard", "region", "level", "ztype", "zcat"].forEach(s),
        n("off"),
        null != e.region && null == e.level && (e.level = ""),
        null != e.ztype && null == e.zcat && (e.zcat = ""))
      : (["type", "line", "w"].forEach(s), n("active")),
      Object.keys(e).length
        ? (this._bulk((z) => {
            const q = { ...z, ...e };
            return "zone" === t.t && null != q.ser && "" !== q.ser
              ? { ...q, code: this._composeZoneCode(q.region, q.level, q.ser, null, q.ztype) }
              : q;
          }),
          this.setState({ bEdit: null }))
        : this.setState({ bEdit: null }));
  }
  _catFitsType(t, e) {
    if (!e) return !0;
    const s = t && "object" == typeof t && t.r ? String(t.r) : "";
    if (s) return s === e;
    const n = this._optName(t);
    if (this.zoneOptList("zcat").some((t) => t && "object" == typeof t && t.r === e && t.n === n)) return !1;
    const i = this._typeCats(e);
    if (i) return i.indexOf(this._optName(t)) >= 0;
    const o = this._optTypes(t);
    return o && o.length
      ? o.indexOf(e) >= 0
      : !this.zoneOptList("zcat").some((t) => {
          const s = this._optTypes(t);
          return s && s.length && s.indexOf(e) >= 0;
        });
  }
  _fdBy() {
    try {
      return KIVO.BassamAuth.display().name || "المدير";
    } catch (t) {
      return "المدير";
    }
  }
  _fdOpen(t) {
    const e = { ...t, closed: !1 };
    (delete e.cWhy, delete e.cAt, delete e.cAtMs, delete e.cBy);
    const s = Date.now(),
      n = this._fdBy(),
      i = { at: s, st: "open", flow: t.flow || "", by: n };
    return (
      t.cAtMs && (i.dur = Math.max(1, Math.round((s - t.cAtMs) / 6e4))),
      (e.fst = "open"),
      (e.fAt = s),
      (e.fBy = n),
      (e.fLog = (Array.isArray(t.fLog) ? t.fLog : []).concat([i]).slice(-60)),
      e
    );
  }
  _fdClose(t, e, s) {
    const n = Date.now(),
      i = this._fdBy(),
      o = { at: n, st: "closed", flow: t.flow || "", by: i, why: e };
    return {
      ...t,
      closed: !0,
      cWhy: e,
      cAt: s,
      cAtMs: n,
      cBy: i,
      fst: "closed",
      fAt: n,
      fBy: i,
      fLog: (Array.isArray(t.fLog) ? t.fLog : []).concat([o]).slice(-60),
    };
  }
  _fdDayKey() {
    const t = this.state;
    return t.year + "-" + t.month + "-" + Math.min(t.day, this.hMonthDays(t.year, t.month));
  }
  _fdView(t, e, s, n, i) {
    const o = KIVO.BassamField,
      r = { fdFlyOn: !1, fdBarOn: !1, fdOffOn: !1 };
    if (!o || !e || !Array.isArray(e.d)) return r;
    const a = this._fdDayKey(),
      l = this._fdBy(),
      d = (e, s) => {
        if (e && e.ok && !e.same) {
          if (this._opDrafts) delete this._opDrafts.bassam_rounds_v1;
          this.setState({ rounds: this.loadRounds() });
        }
        e && e.ok
          ? e.same || (this.setState({ rpTick9: (t.rpTick9 || 0) + 1 }), s && this.bsAck(s, "ok"))
          : this.bsToast((e && e.err) || "تعذّر الرصد", "warn");
      },
      p = t.dsGateFly,
      h = p && p.kind && -1 !== o.KINDS.indexOf(p.kind) ? p.kind : "gates",
      c = "gates" === h ? s : ((e.d || [])[n] || {})[h] || [],
      g = (p && c[p.i]) || null;
    if (
      g &&
      ("gates" !== h || !KIVO.BassamLeaf || !KIVO.BassamLeaf.isParent(g))
    ) {
      const e = o.stateOf(g, h),
        s = o.flowOn(h) ? o.flowOf(g) : "",
        c = p.i;
      ((r.fdFlyOn = !0),
        (r.fdFlyBy = g.fAt ? "رصد " + (g.fBy || "") + " " + o.clock(g.fAt) + " · " + o.ageTxt(g) : "لم يُرصد بعد"),
        (r.fdFlyStates = o.ORDER.map((t) => ({
          t: o.STATES[t].t,
          cls:
            "fd-opt " +
            o.STATES[t].k +
            (t === e ? " on" : "") +
            (i ? "" : " ro"),
          pick: async (s) => {
            try {
              s.stopPropagation();
            } catch (t) {}
            if (i && t !== e) {
              if ("closed" === t && "gates" === h) {
                let t = "00",
                  e = "00";
                try {
                  const s = (t) => (t < 10 ? "0" : "") + t,
                    n = new Date();
                  ((t = s(n.getHours())), (e = s(n.getMinutes())));
                } catch (t) {}
                return void this.setState({ gClose: { idx: [c], why: "", h: t, m: e, dd: null }, dsGateFly: null });
              }
              "closed" !== t
                ? d(
                    await o.observe(
                      a,
                      n,
                      c,
                      { st: t, kind: h, expected: g },
                      l,
                    ),
                    "سُجّل: " + o.STATES[t].t + " — " + o.label(g, h),
                  )
                : this.setState({
                    fdOffAsk: { kind: h, i: c, fi: n, why: "", expected: g },
                  });
            }
          },
        }))),
        (r.fdFlyFlowOn = o.flowOn(h) && this.bsLensOn("paths")),
        (r.fdFlyKindT = (o.KIND_AL && o.KIND_AL[h]) || "الموقع"),
        (r.fdFlyFlows = o.FLOW_ORDER.map((t) => ({
          t: o.FLOWS[t].t,
          a: o.FLOWS[t].a,
          ac: o.FLOWS[t].c || "#9A7E40",
          cls:
            "fd-opt gold" +
            (t === s && "closed" !== e ? " on" : "") +
            (i ? "" : " ro"),
          pick: async (r) => {
            try {
              r.stopPropagation();
            } catch (t) {}
            i &&
              t !== s &&
              ("closed" !== e
                ? d(
                    await o.observe(
                      a,
                      n,
                      c,
                      { flow: t, kind: h, expected: g },
                      l,
                    ),
                    "سُجّل المسار: " + o.FLOWS[t].t,
                  )
                : this.bsToast(((o.KIND_AL && o.KIND_AL[h]) || "الموقع") + " مغلق — افتحه أولاً ثم حدّد المسار", "warn"));
          },
        }))));
      const f = t.fdOffAsk;
      if (
        ((r.fdOffOn = !(!f || f.kind !== h || f.i !== c || f.fi !== n)),
        r.fdOffOn)
      ) {
        ((r.fdOffReasons = o.REASONS.map((t) => ({
          t: t,
          cls: "fd-chip" + (f.why === t ? " on" : ""),
          pick: (e) => {
            try {
              e.stopPropagation();
            } catch (t) {}
            this.setState({ fdOffAsk: { ...f, why: t } });
          },
        }))),
          (r.fdOffTxt = f.txt || ""),
          (r.fdOffOnTxt = (t) => this.setState({ fdOffAsk: { ...f, txt: t.target.value } })),
          (r.fdOffPh = "أخرى" === f.why ? "اكتب السبب — مطلوب مع «أخرى»" : "تفصيل السبب (اختياري)"),
          (r.fdOffTitle = "سبب تعطيل " + ((o.KIND_AL && o.KIND_AL[h]) || "الموقع")));
        const t = !(
          !f.why ||
          ("أخرى" === f.why && !String(f.txt || "").trim())
        );
        ((r.fdOffDis = !t),
          (r.fdOffNo = (t) => {
            try {
              t.stopPropagation();
            } catch (t) {}
            this.setState({ fdOffAsk: null });
          }),
          (r.fdOffGo = async (e) => {
            try {
              e.stopPropagation();
            } catch (t) {}
            if (!t) return;
            const s =
                "أخرى" === f.why ? String(f.txt || "").trim() : String(f.txt || "").trim() ? f.why + " — " + String(f.txt).trim() : f.why,
              i = await o.observe(
                a,
                n,
                c,
                { st: "closed", why: s, kind: h, expected: f.expected },
                l,
              );
            (i && i.ok && this.setState({ fdOffAsk: null }),
              d(i, "سُجّل تعطيل " + o.label(g, h) + " — " + s));
          }));
      }
      const u = (o.hist ? o.hist(g, h) : []).slice(0, 12);
      ((r.fdFlyLogOn = u.length > 0),
        (r.fdFlyLogT = "سجل حركة " + ((o.KIND_AL && o.KIND_AL[h]) || "الموقع") + " اليوم"),
        (r.fdFlyLog = u.map((t) => ({ t: t.t, st: t.by || "—", c: "#334155", txt: t.act + (t.why ? " — " + t.why : "") }))));
    }
    const f = o.summary(e);
    if (!f.n) return r;
    ((r.fdBarOn = !0),
      (r.fdBarSum = [
        ["closed", f.closed],
        ["open", f.open],
      ].map((t) => ({ c: o.STATES[t[0]].c, n: t[1] }))));
    const u = f.items.filter((t) => "open" !== t.st || (t.at && Date.now() - t.at < 36e5)),
      y = !!t.fdBarPaused;
    return (
      (r.fdBarItems = u.map((t) => ({
        num: "gates" === t.kind ? t.g.num || "•" : (o.KIND_T && o.KIND_T[t.kind]) || "•",
        name: "gates" === t.kind ? t.g.label || t.g.name || "باب" : o.label(t.g, t.kind),
        cls: "fd-ch " + o.STATES[t.st].k,
        tip:
          o.label(t.g, t.kind) +
          " — " +
          o.STATES[t.st].t +
          (t.flow && "closed" !== t.st && this.bsLensOn("paths") ? " · " + o.FLOWS[t.flow].t : "") +
          (t.at ? " · " + o.clock(t.at) + (t.by ? " · " + t.by : "") : ""),
        sub:
          o.STATES[t.st].t +
          ("closed" === t.st && t.g.cWhy ? " — " + t.g.cWhy : "") +
          (t.flow && "closed" !== t.st && this.bsLensOn("paths") ? " · " + o.FLOWS[t.flow].t : "") +
          (t.at ? " · " + o.clock(t.at) + (t.by ? " · " + String(t.by).split(/\s+/).slice(0, 2).join(" ") : "") : ""),
        go: () => {
          const e = () => {
            ((this._covKind = t.kind || "gates"),
              this._covFly(t.gi),
              setTimeout(() => {
                try {
                  const e = document.querySelector("main svg");
                  let s = e ? e.parentElement : null;
                  for (; s && s !== document.body && "static" === getComputedStyle(s).position; ) s = s.parentElement;
                  const n = (s || document.body).getBoundingClientRect(),
                    i = Math.max(6, Math.min(n.width / 2 + 14, n.width - 214)),
                    o = Math.max(6, Math.min(n.height / 2 + 10, n.height - 100));
                  this.setState({ dsGateFly: { i: t.gi, kind: t.kind || "gates", left: i, top: o }, zDd: null, bDd: null, fldOpen: null });
                } catch (t) {}
              }, 60));
          };
          t.fi !== n ? this.setState({ floor: t.fi }, e) : e();
        },
      }))),
      u.length ||
        (r.fdBarItems = [
          { num: "✓", name: "كل المواقع مفتوحة", cls: "fd-ch ok quiet", sub: "لا إغلاق ولا ازدحام مرصود", tip: "", go: () => {} },
        ]),
      (r.fdRailCls = "fd-rail" + (y || u.length <= 3 ? " still" : "")),
      (r.fdRailStyle = u.length > 3 && !y ? "animation-duration:" + Math.max(18, 5 * u.length) + "s" : ""),
      (r.fdBarLive =
        (f.lastAt ? "آخر رصد " + o.clock(f.lastAt) : "لا رصد بعد") +
        " · ← " +
        f.in +
        " · → " +
        f.out +
        " · ⇄ " +
        f.both +
        (f.stale ? " · رصد قديم " + f.stale : "")),
      (r.fdBarPause = () => this.setState({ fdBarPaused: !y })),
      (r.fdBarPauseTxt = y ? "▶" : "❚❚"),
      (r.fdBarPauseTip = y ? "تشغيل الحركة" : "إيقاف الحركة — صف ثابت يُمرَّر باليد"),
      r
    );
  }
  _updRoundAt(t, e) {
    const s = this.state,
      n = s.year + "-" + s.month + "-" + Math.min(s.day, this.hMonthDays(s.year, s.month)),
      i = { ...(s.rounds || {}) },
      o = i[n];
    if (!o || !Array.isArray(o.d)) return !1;
    let r;
    try {
      r = JSON.parse(JSON.stringify(o));
    } catch (t) {
      return !1;
    }
    const a = r.d[t];
    return !!a && (e(a, r), (i[n] = r), this.saveRounds(i), !0);
  }
  _updRound(t) {
    const e = this.state,
      s = e.year + "-" + e.month + "-" + Math.min(e.day, this.hMonthDays(e.year, e.month)),
      n = { ...(e.rounds || {}) },
      i = n[s];
    if (!i || !Array.isArray(i.d) || i.ap) return;
    let o;
    try {
      o = JSON.parse(JSON.stringify(i));
    } catch (t) {
      return;
    }
    const r = o.d[e.floor >= 0 ? e.floor : 0];
    if (r && (t(r, o), (n[s] = o), this.saveRounds(n), this._dsGeomJson(i) !== this._dsGeomJson(o))) {
      const t = this._dsHistMerge;
      ((this._dsHistMerge = null),
        "skip" === t ||
          ("drop" === t
            ? ((this._dsUndo = (this._dsUndo || []).slice(0, -1)), (this._dsRedo = []))
            : ((this._dsUndo = (this._dsUndo || []).concat([{ rk: s, rec: JSON.stringify(i) }])),
              this._dsUndo.length > 60 && (this._dsUndo = this._dsUndo.slice(-60)),
              (this._dsRedo = []))),
        this.setState((t) => ({ dsHistTick: (t.dsHistTick || 0) + 1 })));
    }
  }
  _dsGeomJson(t) {
    try {
      return JSON.stringify(
        ((t && t.d) || []).map((t) => [
          ((t && t.zones) || []).map((t) => {
            const e = { ...t };
            return (delete e.emp, delete e.count, delete e.pc, e);
          }),
          (t && t.paths) || [],
          ((t && t.gates) || []).map((t) => {
            const e = { ...t };
            return (delete e.emp, delete e.closed, e);
          }),
          ((t && t.marks) || []).map((t) => {
            const e = { ...t };
            return (delete e.emp, delete e.off, e);
          }),
        ]),
      );
    } catch (t) {
      return "";
    }
  }
  _dsMergeLive(t, e) {
    const s = (t && t.d) || [],
      n = (e && e.d) || [];
    return (
      s.forEach((t, e) => {
        const s = n[e];
        t &&
          s &&
          ((t.zones = (t.zones || []).map((t, e) => {
            const n = (s.zones || []).find((e) => e && t && e.code && t.code && e.code === t.code) || (s.zones || [])[e];
            if (!n) return t;
            const i = { ...t };
            return (void 0 !== n.emp && (i.emp = n.emp), void 0 !== n.count && (i.count = n.count), void 0 !== n.pc && (i.pc = n.pc), i);
          })),
          (t.gates = (t.gates || []).map((t, e) => {
            const n =
              (s.gates || []).find((e) => e && t && ((e.label && e.label === t.label) || (null != e.num && e.num === t.num))) ||
              (s.gates || [])[e];
            if (!n) return t;
            const i = { ...t };
            return (void 0 !== n.emp && (i.emp = n.emp), void 0 !== n.closed && (i.closed = n.closed), i);
          })));
      }),
      t
    );
  }
  _dsHistApply(t, e) {
    const s = { ...(this.state.rounds || {}) },
      n = s[t.rk];
    if (!n || n.ap) return !1;
    let i;
    try {
      i = JSON.parse(t.rec);
    } catch (t) {
      return !1;
    }
    return (
      e.push({ rk: t.rk, rec: JSON.stringify(n) }),
      (s[t.rk] = this._dsMergeLive(i, n)),
      this.saveRounds(s),
      this.setState((t) => ({
        dsSel: null,
        selMulti: [],
        dsHovZ: null,
        dsZoneTmp: null,
        dsPathTmp: null,
        zEdit: null,
        pEdit: null,
        draft: null,
        dsPolyPts: [],
        dsPolyCursor: null,
        zdrag: null,
        vdrag: null,
        edrag: null,
        tdrag: null,
        cresize: null,
        rotdrag: null,
        dspdrag: null,
        dspvdrag: null,
        dsHistTick: (t.dsHistTick || 0) + 1,
      })),
      !0
    );
  }
  dsHistUndo() {
    if ("zones" !== this.state.lens) return;
    const t = this._dsUndo || [];
    if (!t.length) return;
    const e = t[t.length - 1];
    this._dsUndo = t.slice(0, -1);
    const s = (this._dsRedo = this._dsRedo || []);
    this._dsHistApply(e, s) || this.setState((t) => ({ dsHistTick: (t.dsHistTick || 0) + 1 }));
  }
  dsHistRedo() {
    if ("zones" !== this.state.lens) return;
    const t = this._dsRedo || [];
    if (!t.length) return;
    const e = t[t.length - 1];
    this._dsRedo = t.slice(0, -1);
    const s = (this._dsUndo = this._dsUndo || []);
    this._dsHistApply(e, s) || this.setState((t) => ({ dsHistTick: (t.dsHistTick || 0) + 1 }));
  }
  _dsRemoveSel() {
    if (!this.PC("del")) return void this.permDeny();
    const t = this.state.dsSel;
    t &&
      this._dsCanEditZones() &&
      ("zone" === t.t
        ? this.removeZoneAt(t.i)
        : "path" === t.t
          ? (this._updRound((e) => {
              Array.isArray(e.paths) && e.paths.splice(t.i, 1);
            }),
            this.setState({ dsSel: null, selMulti: [], dsPathTmp: null, pEdit: null, dspdrag: null, dspvdrag: null }))
          : "mark" === t.t &&
            (this._updRound((e) => {
              Array.isArray(e.marks) && e.marks.splice(t.i, 1);
            }),
            this.setState({ dsSel: null, selMulti: [], mkEdit: null })));
  }

  async _putImg(value, previous) {
    const service = this._opService(),
      context = JSON.stringify(service.context()),
      id =
        "img_" +
        Date.now().toString(36) +
        "_" +
        Math.floor(1e9 * Math.random()).toString(36);
    if (!KIVO.BassamIDB || typeof KIVO.BassamIDB.set !== "function" || !value)
      throw Error("image-upload-required");
    if ((await KIVO.BassamIDB.set(id, value)) !== true)
      throw Error("image-ack-required");
    if (context !== JSON.stringify(service.context()))
      throw Error("image-context-changed");
    return id;
  }
  _readSiteImg(t) {
    if (!/^image\//.test(t.type)) return void this.bsToast("الرجاء اختيار ملف صورة");
    const e = new FileReader(),
      TK = KIVO.BassamBusy ? KIVO.BassamBusy.start("جارٍ قراءة الصورة…", { sub: KIVO.BassamBusy.fmtBytes(t.size || 0) }) : null;
    e.onerror = () => {
      (TK && TK.done(), this.bsToast("تعذّرت قراءة الصورة", "warn"));
    };
    ((e.onload = () => {
      const s = new Image();
      ((s.onload = () => {
        (TK &&
          TK.set({ label: "جارٍ ضغط الصورة وتجهيزها…", sub: s.width + "×" + s.height + " · " + KIVO.BassamBusy.fmtBytes(t.size || 0) }),
          setTimeout(() => {
            try {
              const n = /png|webp|gif|svg/i.test(t.type),
                i = (t, i) => {
                  const o = Math.min(1, t / Math.max(s.width, s.height)),
                    r = Math.max(1, Math.round(s.width * o)),
                    a = Math.max(1, Math.round(s.height * o)),
                    l = document.createElement("canvas");
                  ((l.width = r), (l.height = a));
                  const d = l.getContext("2d");
                  ((d.imageSmoothingEnabled = !0),
                    (d.imageSmoothingQuality = "high"),
                    n || ((d.fillStyle = "#ffffff"), d.fillRect(0, 0, r, a)),
                    d.drawImage(s, 0, 0, r, a));
                  try {
                    return { url: n ? l.toDataURL("image/png") : l.toDataURL("image/jpeg", i), w: r, h: a };
                  } catch (t) {
                    return { url: e.result, w: s.width, h: s.height };
                  }
                };
              let o = Math.min(Math.max(s.width, s.height), 4200),
                r = i(o, 0.92),
                a = 0;
              for (; r.url.length > 11e6 && a < 12; ) {
                if (((o = Math.round(0.85 * o)), o < 900)) {
                  r = i(900, 0.8);
                  break;
                }
                ((r = i(o, 0.88)), a++);
              }
              const l = Math.max(s.width, s.height);
              this.setState({
                siteLowRes: l < 1400 ? s.width + "×" + s.height : null,
                siteModal: { ...(this.state.siteModal || {}), img: r.url, imgW: r.w, imgH: r.h, imgDirty: !0 },
              });
            } finally {
              TK && TK.done();
            }
          }, 40));
      }),
        (s.onerror = () =>
          (TK && TK.done()) || this.setState({ siteModal: { ...(this.state.siteModal || {}), img: e.result, imgDirty: !0 } })),
        (s.src = e.result));
    }),
      e.readAsDataURL(t));
  }
  async _delSiteEverywhere(index) {
    try {
      if (!(this.PC("add") || this.PC("edit") || this.PC("del"))) {
        this.permDeny();
        return false;
      }
      const plan = this._opRead("bassam_plan_v1");
      if (
        !plan ||
        !Array.isArray(plan.floors) ||
        plan.floors.length <= 1 ||
        !plan.floors[index] ||
        plan.floors[index].approved
      )
        return false;
      plan.floors.splice(index, 1);
      Object.values(plan.months || {}).forEach((entry) => {
        const rows = Array.isArray(entry) ? entry : entry && entry.d;
        if (Array.isArray(rows) && rows.length > index) rows.splice(index, 1);
        if (
          entry &&
          !Array.isArray(entry) &&
          typeof entry.c === "number" &&
          entry.c > 1
        )
          entry.c--;
      });
      const rounds = JSON.parse(JSON.stringify(this.state.rounds || {}));
      Object.values(rounds).forEach((rec) => {
        if (rec && Array.isArray(rec.d) && rec.d.length > index)
          rec.d.splice(index, 1);
      });
      this._opLastSave = this._opCommit({
        bassam_plan_v1: plan,
        bassam_rounds_v1: rounds,
      });
      const ack = await this._opLastSave;
      if (!ack || ack.ok !== 1) return false;
      let floor = this.state.floor;
      if (floor === index) floor = 0;
      else if (floor > index) floor--;
      this.setState(
        (state) => ({
          rounds,
          floor,
          dsSel: null,
          selMulti: [],
          dsHovZ: null,
          dsHovG: null,
          delFloor: null,
          delFloorAck: false,
          fldOpen: false,
          planTick: (state.planTick || 0) + 1,
          fimgs: {},
        }),
        () => {
          this._loadFloorImgs();
        },
      );
      return true;
    } catch (error) {
      this.bsToast("لم يتم تأكيد حذف الموقع — بقيت البيانات للمراجعة", "warn");
      return false;
    }
  }
  _loadFloorImgs() {
    try {
      const plan = this._opRead("bassam_plan_v1"),
        draft = this._opDrafts.bassam_plan_v1,
        stamp = JSON.stringify(this._opService().context());
      if (!plan || !Array.isArray(plan.floors) || !KIVO.BassamIDB) return;
      plan.floors.forEach((floor, index) => {
        if (!floor || !floor.iid) return;
        const iid = floor.iid,
          sid = floor.sid;
        KIVO.BassamIDB.get(iid)
          .then((image) => {
            if (!image || stamp !== JSON.stringify(this._opService().context()))
              return;
            const fresh = draft.get("bassam_plan_v1"),
              current = fresh && fresh.floors && fresh.floors[index];
            if (current && current.iid === iid && current.sid === sid)
              this.setState((state) => ({
                fimgs: { ...(state.fimgs || {}), [index]: image },
              }));
          })
          .catch(() => {});
      });
    } catch (error) {}
  }
  loadZoneOpts() {
    try {
      const t = this._opRead("bassam_zone_opts_v1");
      if (t) {
        const e = t;
        if (e && "object" == typeof e) {
          const t = (t) =>
            Array.isArray(t)
              ? t
                  .map((t) =>
                    "string" == typeof t
                      ? { n: t, c: "" }
                      : t && t.n
                        ? { n: t.n, c: null == t.c ? "" : String(t.c), ...(t.r ? { r: t.r } : {}) }
                        : null,
                  )
                  .filter(Boolean)
              : [];
          let s = e.zcatStyle && "object" == typeof e.zcatStyle ? e.zcatStyle : {},
            n = +e.hMig || 0;
          if (n < 3) {
            const t = {};
            (Object.keys(s).forEach((e) => {
              const n = s[e];
              if (!n) return void (t[e] = n);
              const i = !1 === n.sAuto;
              t[e] = { ...n, hw: 0.3, hg: 1.6, o: 50, bs: "dash", bw: 1, s: i ? n.s : this._darken(n.f || "#22c55e"), sAuto: !i };
            }),
              (s = t),
              (n = 3));
            /* Historical style defaults affect presentation only. */
          }
          return {
            region: t(e.region),
            level: t(e.level),
            ztype: Array.isArray(e.ztype) ? e.ztype : [],
            zcat: Array.isArray(e.zcat) ? e.zcat : [],
            zcatStyle: s,
            hMig: n,
          };
        }
      }
    } catch (t) {}
    return {
      region: [],
      level: [],
      ztype: [],
      zcat: [],
      zcatStyle: {},
      hMig: 3,
    };
  }
  saveZoneOpts(value, defer = false) {
    if (!(this.PC("add") || this.PC("edit") || this.PC("del"))) {
      this.permDeny();
      return Promise.resolve({ ok: 0, err: "denied" });
    }
    this.setState({ zoneOpts: value });
    return defer ? null : this._opWrite("bassam_zone_opts_v1", value);
  }
  _composeZoneCode(t, e, s, n, z) {
    const i = n || this.state.zoneOpts || {},
      o = [],
      r = t
        ? ((t, e) => {
            const s = (Array.isArray(t) ? t : []).find((t) => this._optName(t) === e);
            return s ? this._optCode(s) : "";
          })(i.region, t)
        : "",
      a = e
        ? ((t, e, s) => {
            const n = Array.isArray(t) ? t : [],
              i =
                n.find((t) => this._optName(t) === e && t && t.r === s) ||
                n.find((t) => this._optName(t) === e && !(t && t.r)) ||
                n.find((t) => this._optName(t) === e);
            return i ? this._optCode(i) : "";
          })(i.level, e, t)
        : "";
    const y = z
      ? ((t, e) => {
          const s = (Array.isArray(t) ? t : []).find((t) => this._optName(t) === e);
          return s ? this._optCode(s) : "";
        })(i.ztype, z)
      : "";
    return (r && o.push(r), a && o.push(a), y && o.push(y), o.push(s || "00"), o.join("-"));
  }
  _recomposeZoneCodes(options, related = {}) {
    const rounds = JSON.parse(
      JSON.stringify(related.bassam_rounds_v1 || this.state.rounds || {}),
    );
    Object.values(rounds).forEach((rec) => {
      if (rec && Array.isArray(rec.d) && !rec.ap)
        rec.d.forEach((site) =>
          ((site && site.zones) || []).forEach((zone) => {
            if (zone && zone.ser != null && zone.ser !== "")
              zone.code = this._composeZoneCode(
                zone.region,
                zone.level,
                zone.ser,
                options,
                zone.ztype,
              );
          }),
        );
    });
    return this.saveRounds(rounds, related);
  }
  addZoneOpt(t) {
    const e = "region" === t || "level" === t || "ztype" === t,
      s = (this.state.zDdNew || "").trim();
    if (!s) return void this.bsToast("اكتب اسم الخيار");
    const n = this.zoneOptList(t);
    if ("level" === t) {
      const t = ((this.state.zEdit || {}).region || "").trim();
      if (!t) return void this.bsToast("اختر المنطقة أولاً — قائمة الأدوار / المستويات تتبع المنطقة المختارة");
      if (n.some((e) => this._optName(e) === s && ((e && e.r) || "") === t))
        return void this.bsToast("يوجد خيار بهذا الاسم في هذه المنطقة");
      const e = (this.state.zDdNewC || "").trim();
      return e
        ? (this.setState({ zDdNew: "", zDdNewC: "" }),
          void this.saveZoneOpts({ ...(this.state.zoneOpts || {}), level: [...n, { n: s, c: e, r: t }] }))
        : void this.bsToast("اكتب الرمز — حرف أو رقم يميّز هذا الخيار");
    }
    if ("zcat" !== t && n.some((t) => this._optName(t) === s)) this.bsToast("يوجد خيار بهذا الاسم");
    else {
      if (e) {
        const e = (this.state.zDdNewC || "").trim();
        return e
          ? ("region" === t || "ztype" === t) && n.some((t) => this._optCode(t) === e)
            ? void this.bsToast("هذا الرمز مستخدم لخيار آخر")
            : (this.setState({ zDdNew: "", zDdNewC: "" }),
              void this.saveZoneOpts({ ...(this.state.zoneOpts || {}), [t]: [...n, "ztype" === t ? { n: s, k: e } : { n: s, c: e }] }))
          : void this.bsToast("اكتب الرمز — حرف أو رقم يميّز هذا الخيار");
      }
      if ((this.setState({ zDdNew: "" }), "zcat" === t)) {
        const t = ((this.state.zEdit || {}).ztype || "").trim();
        if (t) return void this.saveZoneOpts({ ...(this.state.zoneOpts || {}), zcat: [...n, { n: s, t: [t] }] });
      }
      this.saveZoneOpts({ ...(this.state.zoneOpts || {}), [t]: [...n, s] });
    }
  }
  delZoneOpt(t, e) {
    const s = this.zoneOptList(t),
      n = this._optName(s[e]),
      i = { ...(this.state.zoneOpts || {}), [t]: s.filter((t, s) => s !== e) };
    if ("zcat" === t) {
      const t = { ...(i.zcatStyle || {}) },
        o = (s[e] || {}).r || "";
      (o ? delete t[this._zcatKey(o, n)] : delete t[n],
        (i.zcatStyle = t),
        (i.ztype = (i.ztype || []).map((t) => {
          const e = this._optCats(t);
          return !e || e.indexOf(n) < 0 ? t : { ...t, n: this._optName(t), c: e.filter((t) => t !== n) };
        })));
    }
    let o = [];
    if ("region" === t) {
      const t = Array.isArray(i.level) ? i.level : [];
      ((o = t.filter((t) => t && "object" == typeof t && t.r === n).map((t) => t.n)),
        (i.level = t.filter((t) => !(t && "object" == typeof t && t.r === n))));
    }
    this.saveZoneOpts(i, true);
    this._purgeOptEverywhere(
      [{ key: t, name: n }, ...o.map((name) => ({ key: "level", name }))],
      { bassam_zone_opts_v1: i },
      ["region", "level", "ztype"].includes(t) ? i : null,
    );
  }
  _purgeOptEverywhere(fields, related = {}, zoneOptions = null) {
    const update = (site) => {
      if (!site || !Array.isArray(site.zones)) return;
      site.zones = site.zones.map((zone) => {
        if (!zone) return zone;
        const next = { ...zone };
        fields.forEach(({ key, name }) => {
          if (next[key] === name) next[key] = "";
        });
        return next;
      });
    };
    const plan = this._opRead("bassam_plan_v1");
    if (plan && typeof plan === "object") {
      update(plan);
      (plan.floors || []).forEach(update);
      Object.values(plan.months || {}).forEach((entry) => {
        const rows = Array.isArray(entry) ? entry : entry && entry.d;
        if (Array.isArray(rows)) rows.forEach(update);
      });
      related = { ...related, bassam_plan_v1: plan };
    }
    const rounds = JSON.parse(JSON.stringify(this.state.rounds || {}));
    Object.values(rounds).forEach((rec) => {
      if (rec && Array.isArray(rec.d) && !rec.ap)
        rec.d.forEach((site) => {
          if (site && !site.ap) update(site);
        });
    });
    if (zoneOptions)
      return this._recomposeZoneCodes(zoneOptions, {
        ...related,
        bassam_rounds_v1: rounds,
      });
    this.setState((state) => ({ planTick: (state.planTick || 0) + 1 }));
    return this.saveRounds(rounds, related);
  }
  saveZoneOptEdit() {
    const related = {};
    const t = this.state.zDdEdit;
    if (!t) return;
    const e = "region" === t.key || "level" === t.key || "ztype" === t.key,
      __zt = "ztype" === t.key,
      s = (this.state.zDdEditVal || "").trim();
    if (!s) return void this.bsToast("اكتب اسم الخيار");
    const n = this.zoneOptList(t.key);
    let i = t.idx;
    if (null == n[i] || (t.was && this._optName(n[i]) !== t.was)) {
      const e = n.findIndex((e) => this._optName(e) === t.was);
      e >= 0 && (i = e);
    }
    const o = n[i];
    if (null == o)
      return (this.bsToast("تعذّر العثور على الخيار — أعد فتح القائمة"), void this.setState({ zDdEdit: null, zDdEditT: null }));
    const r = this._optName(o),
      a = o && "object" == typeof o && o.r ? o.r : "zcat" === t.key ? String((this.state.zEdit || {}).ztype || "").trim() : "",
      l = "level" === t.key || "zcat" === t.key;
    if (n.some((t, e) => e !== i && this._optName(t) === s && (!l || ((t && t.r) || "") === a)))
      return void this.bsToast(
        l ? ("level" === t.key ? "يوجد خيار بهذا الاسم في هذه المنطقة" : "يوجد فئة بهذا الاسم في هذا النوع") : "يوجد خيار بهذا الاسم",
      );
    let d = "";
    if (e) {
      if (((d = (this.state.zDdEditC || "").trim()), !d)) return void this.bsToast("اكتب الرمز — حرف أو رقم يميّز هذا الخيار");
      if (("region" === t.key || "ztype" === t.key) && n.some((t, e) => e !== i && this._optCode(t) === d))
        return void this.bsToast("هذا الرمز مستخدم لخيار آخر");
    }
    if (s !== r) {
      const e = (e) => (!e || e[t.key] !== r || ("level" === t.key && a && e.region !== a) ? e : { ...e, [t.key]: s });
      try {
        const t = this._opRead("bassam_rounds_v1") || {};
        (Object.keys(t).forEach((s) => {
          const n = t[s];
          n &&
            Array.isArray(n.d) &&
            !n.ap &&
            n.d.forEach((t) => {
              t && Array.isArray(t.zones) && (t.zones = t.zones.map(e));
            });
        }),
          (related.bassam_rounds_v1 = t),
          this.setState({ rounds: t }));
      } catch (t) {}
      this.state.zEdit && this.setState({ zEdit: e(this.state.zEdit) });
    }
    const p = "ztype" === t.key && Array.isArray(this.state.zDdEditT) ? this.state.zDdEditT.filter(Boolean) : null;
    this.setState({ zDdEdit: null, zDdEditT: null });
    const h = {
      ...(this.state.zoneOpts || {}),
      [t.key]: n.map((t, n) =>
        n === i
          ? __zt
            ? { n: s, k: d, ...(p && p.length ? { c: p } : {}) }
            : e
              ? { n: s, c: d, ...(a ? { r: a } : {}) }
              : p && p.length
                ? { n: s, c: p }
                : a
                  ? { n: s, r: a }
                  : s
          : t,
      ),
    };
    if ("zcat" === t.key && s !== r) {
      const t = { ...(h.zcatStyle || {}) },
        e = this._zcatKey(a, r),
        n = this._zcatKey(a, s);
      (t[e] ? ((t[n] = t[e]), delete t[e]) : t[r] && ((t[n] = t[r]), delete t[r]), (h.zcatStyle = t));
    }
    ("zcat" === t.key &&
      s !== r &&
      (h.ztype = (h.ztype || []).map((t) => {
        const e = this._optCats(t);
        return !e || e.indexOf(r) < 0 ? t : { ...t, n: this._optName(t), c: e.map((t) => (t === r ? s : t)) };
      })),
      this.saveZoneOpts(h, e || s !== r));
    if (e) this._recomposeZoneCodes(h, { ...related, bassam_zone_opts_v1: h });
    else if (s !== r)
      this.saveRounds(related.bassam_rounds_v1 || this.state.rounds, {
        bassam_zone_opts_v1: h,
      });
  }
  _mkHatchPattern(t, e, s) {
    const n = React.createElement,
      i = Math.max(1, +e.hg || 1.6),
      o = Math.max(0.1, +e.hw || 0.3),
      r = e.hc || e.s || "#000000",
      a = "diag" === e.h ? "rotate(45)" : "diag2" === e.h ? "rotate(-45)" : "cross" === e.h ? "rotate(45)" : null,
      l = [n("rect", { key: "bg", width: i, height: i, fill: e.f })];
    ("dots" === e.h
      ? l.push(n("circle", { key: "d", cx: i / 2, cy: i / 2, r: o, fill: r }))
      : "horiz" === e.h
        ? l.push(n("line", { key: "l1", x1: 0, y1: i / 2, x2: i, y2: i / 2, stroke: r, strokeWidth: o }))
        : l.push(n("line", { key: "l1", x1: i / 2, y1: 0, x2: i / 2, y2: i, stroke: r, strokeWidth: o })),
      "cross" === e.h && l.push(n("line", { key: "l2", x1: 0, y1: i / 2, x2: i, y2: i / 2, stroke: r, strokeWidth: o })));
    const d = { key: s, id: t, patternUnits: "userSpaceOnUse", width: i, height: i };
    return (a && (d.patternTransform = a), n("pattern", d, l));
  }
  _darken(t, e) {
    try {
      const s = String(t || "")
        .trim()
        .replace("#", "");
      if (!/^[0-9a-fA-F]{6}$/.test(s)) return "#334155";
      const n = parseInt(s, 16),
        i = null == e ? 0.55 : e,
        o = (t) =>
          Math.max(0, Math.min(255, Math.round(t * i)))
            .toString(16)
            .padStart(2, "0");
      return "#" + o((n >> 16) & 255) + o((n >> 8) & 255) + o(255 & n);
    } catch (t) {
      return "#334155";
    }
  }
  zcatStyleOf(t, e) {
    const s = (this.state.zoneOpts || {}).zcatStyle || {},
      n = String(e || "").trim();
    if (n) {
      const e = s[n + " · " + t];
      if (e && e.f) return e;
    }
    const i = s[t];
    return i && i.f ? i : null;
  }
  _curFloorZones() {
    const t = this.state,
      e = t.year + "-" + t.month + "-" + Math.min(t.day, this.hMonthDays(t.year, t.month)),
      s = (t.rounds || {})[e],
      n = s && Array.isArray(s.d) ? s.d[t.floor >= 0 ? t.floor : 0] : null;
    return n && Array.isArray(n.zones) ? n.zones : [];
  }
  openZoneEditor(t, e) {
    const s = this._curFloorZones()[t];
    s &&
      this.setState({
        zdrag: null,
        vdrag: null,
        dsZoneTmp: null,
        dsSel: { t: "zone", i: t },
        zDd: null,
        zDdEdit: null,
        zDdEditT: null,
        zDdNew: "",
        zEdit: {
          i: t,
          isNew: !!e,
          yard: s.yard || "",
          code: s.code,
          ser: null != s.ser && "" !== s.ser ? String(s.ser) : /^\d+$/.test(String(s.code || "")) ? String(s.code) : "00",
          cat: s.cat,
          hideLabel: !!s.hideLabel,
          region: s.region || "",
          level: s.level || "",
          ztype: s.ztype || "",
          zcat: s.zcat || "",
          off: !!s.off,
          lang: "number" == typeof s.lang ? String(Math.round(10 * s.lang) / 10) : "",
          lsz: "number" == typeof s.lsz ? String(s.lsz) : "",
        },
      });
  }
  saveZoneEdit() {
    const t = this.state.zEdit;
    if (!t) return;
    let e = (t.ser || "").trim();
    (e || (e = "00"), 1 === e.length && (e = "0" + e));
    const s = this._composeZoneCode(t.region, t.level, e, null, t.ztype);
    t.isNew && (this._dsHistMerge = "skip");
    const n = (() => {
        const e = String(null == t.lang ? "" : t.lang).trim();
        if ("" === e) return null;
        let s = parseFloat(e);
        return isNaN(s) ? null : ((s = ((s % 360) + 360) % 360), Math.round(10 * s) / 10);
      })(),
      i = (() => {
        const e = String(null == t.lsz ? "" : t.lsz).trim();
        if ("" === e) return null;
        let s = parseFloat(e);
        return isNaN(s) ? null : Math.min(40, Math.max(4, Math.round(10 * s) / 10));
      })();
    (this._updRound((o) => {
      const r = (o.zones || [])[t.i];
      r &&
        (o.zones[t.i] = {
          ...r,
          code: s,
          ser: e,
          yard: t.yard || "",
          hideLabel: !!t.hideLabel,
          region: t.region || "",
          level: t.level || "",
          ztype: t.ztype || "",
          zcat: t.zcat || "",
          off: !!t.off,
          lang: null == n ? void 0 : n,
          lsz: null == i ? void 0 : i,
        });
    }),
      (this._dsHistMerge = null),
      this.setState({ zEdit: null, zDd: null, zDdEdit: null, zDdEditT: null }));
  }
  removeZoneAt(t) {
    this.PC("del")
      ? (this._updRound((e) => {
          Array.isArray(e.zones) && e.zones.splice(t, 1);
        }),
        this.setState({
          zEdit: null,
          zDd: null,
          zDdEdit: null,
          zDdEditT: null,
          dsSel: null,
          selMulti: [],
          dsHovZ: null,
          dsZoneTmp: null,
          zdrag: null,
          vdrag: null,
        }))
      : this.permDeny();
  }
  closeZoneEditorDS() {
    const t = this.state.zEdit;
    return (
      !!t &&
      (t.isNew
        ? ((this._dsHistMerge = "drop"), this.removeZoneAt(t.i), (this._dsHistMerge = null), !0)
        : (this.setState({ zEdit: null, zDd: null, zDdEdit: null, zDdEditT: null }), !0))
    );
  }
  _dsEvtPt(t) {
    const e = KIVO.BassamPointer.rect((t.currentTarget && t.currentTarget.ownerSVGElement) || t.currentTarget),
      s = this.state.dview,
      n = Math.min(e.width / s.w, e.height / s.h),
      i = (e.width - s.w * n) / 2,
      o = (e.height - s.h * n) / 2;
    return {
      x: Math.max(0, Math.min(1e3, s.x + (t.clientX - e.left - i) / n)),
      y: Math.max(0, Math.min(600, s.y + (t.clientY - e.top - o) / n)),
    };
  }
  _dsLockInfo() {
    const t = this.state,
      y = t.year,
      m = t.month,
      d = Math.min(t.day, this.hMonthDays(y, m)),
      k = y + "-" + m + "-" + d,
      R = (t.rounds || {})[k],
      f = t.floor >= 0 ? t.floor : 0;
    if (!this._dsCanWrite()) return { locked: !0, kind: "perm", text: "صلاحيتك على المتابعة اليومية للعرض فقط" };
    if (!R || !Array.isArray(R.d)) return { locked: !1, kind: "", text: "" };
    if (this.isMonthAp(t.rounds, y, m))
      return { locked: !0, kind: "month", text: "الشهر معتمد ومقفل — عرض فقط · افتح الشهر بنقرة مزدوجة على كرته" };
    if (R.ap) return { locked: !0, kind: "round", text: "الجولة معتمدة — عرض فقط · لتعديلها ألغِ اعتماد الموقع من قائمة «الموقع النشط»" };
    if (this.dayLockedDS(t.rounds, y, m, d))
      return {
        locked: !0,
        kind: "day",
        text: this.dayPastDS(y, m, d)
          ? "اليوم انقضى — مقفل تلقائياً · عرض فقط (نقرة مزدوجة على كرت اليوم لفتحه)"
          : "اليوم مقفل يدوياً — عرض فقط (نقرة مزدوجة على كرت اليوم لفتحه)",
      };
    const s = R.d[f];
    if (s && s.ap)
      return { locked: !0, kind: "site", text: "هذا الموقع معتمد في جولة اليوم — عرض فقط · افتح قفله من قائمة «الموقع النشط»" };
    let j = null;
    try {
      j = (KIVO.BassamDayShift && KIVO.BassamDayShift.get(y, m, d)) || null;
    } catch (e9) {
      j = null;
    }
    const V = R.shAp && j ? R.shAp[j] : null;
    if (V && V.ap && Array.isArray(V.snap)) return { locked: !0, kind: "shift", text: "جولة الوردية «" + j + "» معتمدة — عرض لقطتها فقط" };
    return { locked: !1, kind: "", text: "" };
  }
  _dsCanEditMarks() {
    const t = this.state;
    if ("marks" !== t.lens || t.dsAsn) return !1;
    if (this._dsLockInfo().locked) return !1;
    if (!this.bsLensOn("marks")) return !1;
    if (!this._dsCanWrite()) return !1;
    const e = t.year + "-" + t.month + "-" + Math.min(t.day, this.hMonthDays(t.year, t.month)),
      s = (t.rounds || {})[e];
    if (!s || !Array.isArray(s.d) || s.ap) return !1;
    if (this.isMonthAp(t.rounds, t.year, t.month)) return !1;
    const n = s.d[t.floor >= 0 ? t.floor : 0];
    return !(!n || n.ap);
  }
  _dsCanEditZones() {
    const t = this.state;
    if ("zones" !== t.lens || t.dsAsn) return !1;
    if (this._dsLockInfo().locked) return !1;
    if (!this._dsCanWrite()) return !1;
    const e = t.year + "-" + t.month + "-" + Math.min(t.day, this.hMonthDays(t.year, t.month)),
      s = (t.rounds || {})[e];
    if (!s || !Array.isArray(s.d) || s.ap) return !1;
    if (this.isMonthAp(t.rounds, t.year, t.month)) return !1;
    const n = s.d[t.floor >= 0 ? t.floor : 0];
    return !(!n || n.ap);
  }
  _curFloorMarks() {
    const t = this.state,
      e = t.year + "-" + t.month + "-" + Math.min(t.day, this.hMonthDays(t.year, t.month)),
      s = (t.rounds || {})[e],
      n = s && Array.isArray(s.d) ? s.d[t.floor >= 0 ? t.floor : 0] : null;
    return n && Array.isArray(n.marks) ? n.marks : [];
  }
  _dsAddMarkAt(t) {
    if (!this._dsCanEditMarks()) return;
    let e = -1;
    ((this._dsHistMerge = "skip"),
      this._updRound((s) => {
        s.marks = Array.isArray(s.marks) ? s.marks : [];
        const n = s.marks.map((t) => parseInt(String(t.label || "").replace(/^\D+/, ""), 10) || 0),
          i = Math.max(0, ...n, 0) + 1;
        (s.marks.push({ x: t.x, y: t.y, label: "معلم " + i, kind: "", emp: [], hideLabel: !1, uid: this._uid() }),
          (e = s.marks.length - 1));
      }),
      (this._dsHistMerge = null),
      this.setState({ tool: "select", dsSel: null, selMulti: [] }, () => {
        e >= 0 && this.openMarkEditor(e, !0);
      }));
  }
  openMarkEditor(t, e) {
    const s = this._curFloorMarks()[t];
    s &&
      this.setState({
        zdrag: null,
        vdrag: null,
        dsZoneTmp: null,
        dsSel: { t: "mark", i: t },
        mkEdit: {
          i: t,
          isNew: !!e,
          label: s.label || "",
          kind: s.kind || "",
          hideLabel: !!s.hideLabel,
          off: !!s.off,
          newKind: "",
          needN: null == s.needN ? "" : String(s.needN),
        },
      });
  }
  saveMarkEdit() {
    const t = this.state.mkEdit;
    t &&
      (t.isNew && (this._dsHistMerge = "skip"),
      this._updRound((e) => {
        const s = (e.marks || [])[t.i];
        s &&
          (e.marks[t.i] = {
            ...s,
            label: (t.label || "").trim() || s.label,
            kind: t.kind || "",
            hideLabel: !!t.hideLabel,
            off: !!t.off,
            needN: (() => {
              const e = parseInt(String(t.needN || "").trim(), 10);
              return e > 0 ? e : null;
            })(),
          });
      }),
      (this._dsHistMerge = null),
      this.setState({ mkEdit: null }));
  }
  removeMarkAt(t) {
    (this._updRound((e) => {
      Array.isArray(e.marks) && e.marks.splice(t, 1);
    }),
      this.setState({ mkEdit: null, dsSel: null, selMulti: [] }));
  }
  closeMarkEditorDS() {
    const t = this.state.mkEdit;
    return (
      !!t &&
      (t.isNew
        ? ((this._dsHistMerge = "drop"), this.removeMarkAt(t.i), (this._dsHistMerge = null), !0)
        : (this.setState({ mkEdit: null }), !0))
    );
  }
  _dsPtsHs(t) {
    const e = String(t || "").match(/[MLHVQCZ]|-?\d+(?:\.\d+)?/gi) || [],
      s = [],
      n = [];
    let i = 0,
      o = 0,
      r = 0,
      a = "";
    const l = { x: 0, y: 0 };
    for (; i < e.length; ) {
      const t = e[i];
      if (/^[MLHVQCZ]$/i.test(t)) ((a = t.toUpperCase()), i++);
      else if ("M" === a || "L" === a)
        ((o = +e[i]), (r = +e[i + 1]), (i += 2), s.push({ x: o, y: r }), n.push({ in: { ...l }, out: { ...l } }));
      else if ("C" === a) {
        const t = +e[i],
          a = +e[i + 1],
          d = +e[i + 2],
          p = +e[i + 3],
          h = +e[i + 4],
          c = +e[i + 5];
        i += 6;
        const g = s[s.length - 1];
        (g && (n[n.length - 1].out = { x: t - g.x, y: a - g.y }),
          s.push({ x: h, y: c }),
          n.push({ in: { x: d - h, y: p - c }, out: { ...l } }),
          (o = h),
          (r = c));
      } else
        "H" === a
          ? ((o = +e[i]), i++, s.push({ x: o, y: r }), n.push({ in: { ...l }, out: { ...l } }))
          : "V" === a
            ? ((r = +e[i]), i++, s.push({ x: o, y: r }), n.push({ in: { ...l }, out: { ...l } }))
            : i++;
    }
    if (s.length > 1) {
      const t = s[0],
        e = s[s.length - 1];
      Math.abs(t.x - e.x) < 0.6 && Math.abs(t.y - e.y) < 0.6 && ((n[0].in = n[n.length - 1].in), s.pop(), n.pop());
    }
    return { pts: s, hs: n };
  }
  _dsBuildPath(t, e) {
    e = e || [];
    const s = (t) => Math.round(100 * t) / 100,
      n = { x: 0, y: 0 },
      i = (t) => e[t] || { in: n, out: n };
    let o = "M" + s(t[0].x) + " " + s(t[0].y);
    for (let e = 0; e < t.length; e++) {
      const r = t[e],
        a = t[(e + 1) % t.length],
        l = i(e).out || n,
        d = i((e + 1) % t.length).in || n,
        p = Math.abs(l.x) + Math.abs(l.y) + Math.abs(d.x) + Math.abs(d.y) >= 0.5,
        h = e === t.length - 1;
      p
        ? (o += " C" + s(r.x + l.x) + " " + s(r.y + l.y) + " " + s(a.x + d.x) + " " + s(a.y + d.y) + " " + s(a.x) + " " + s(a.y))
        : h || (o += " L" + s(a.x) + " " + s(a.y));
    }
    return o + " Z";
  }
  _dsZoneFromPts(t, e, s) {
    let n = 0;
    for (let t = 0; t < e.length; t++) {
      const s = (t + 1) % e.length;
      n += e[t].x * e[s].y - e[s].x * e[t].y;
    }
    const i = this._zAnchor(e) || e[0];
    return { ...t, d: this._dsBuildPath(e, s), rawA: Math.abs(n / 2), cx: Math.round(i.x), cy: Math.round(i.y) };
  }
  _dsAddZoneFromPts(t, e) {
    let s = 0;
    for (let e = 0; e < t.length; e++) {
      const n = (e + 1) % t.length;
      s += t[e].x * t[n].y - t[n].x * t[e].y;
    }
    const n = Math.abs(s / 2),
      i = this._zAnchor(t) || t[0],
      o = "M" + t.map((t) => t.x + " " + t.y).join(" L") + " Z";
    let r = -1;
    (this._updRound((t) => {
      t.zones = Array.isArray(t.zones) ? t.zones : [];
      const s = t.zones.map(
          (t) => parseInt(String(null != t.ser && "" !== t.ser ? t.ser : String(t.code || "").replace(/^\D+/, "")), 10) || 0,
        ),
        a = Math.max(0, ...s) + 1,
        l = a < 10 ? "0" + a : String(a);
      (t.zones.push({
        d: o,
        code: l,
        ser: l,
        cat: "men",
        rawA: n,
        cx: Math.round(i.x),
        cy: Math.round(i.y),
        count: null,
        pc: {},
        emp: [],
        kind: e || null,
        hideLabel: !0,
        uid: this._uid(),
      }),
        (r = t.zones.length - 1));
    }),
      this.setState({ tool: "select", draft: null, dsPolyPts: [], dsPolyCursor: null, dsSel: null, selMulti: [] }, () => {
        r >= 0 && this.openZoneEditor(r, !0);
      }));
  }
  _dsCommitDraft(t, e) {
    const s = (this.state.dview.w / 1e3) * 2;
    if ("circle" === e) {
      const e = t.x,
        n = t.y,
        i = Math.hypot(t.cx - t.x, t.cy - t.y);
      if (i > s) {
        const t = 64,
          s = [];
        for (let o = 0; o < t; o++) {
          const r = (o / t) * 2 * Math.PI;
          s.push({ x: Math.round(100 * (e + i * Math.cos(r))) / 100, y: Math.round(100 * (n + i * Math.sin(r))) / 100 });
        }
        return (this._dsAddZoneFromPts(s, "circle"), !0);
      }
      return !1;
    }
    if ("square" === e) {
      const e = t.cx - t.x,
        n = t.cy - t.y,
        i = Math.max(Math.abs(e), Math.abs(n));
      if (i > s) {
        const s = t.x + (e < 0 ? -i : i),
          o = t.y + (n < 0 ? -i : i),
          r = Math.min(t.x, s),
          a = Math.min(t.y, o),
          l = Math.max(t.x, s),
          d = Math.max(t.y, o);
        return (
          this._dsAddZoneFromPts([
            { x: r, y: a },
            { x: l, y: a },
            { x: l, y: d },
            { x: r, y: d },
          ]),
          !0
        );
      }
      return !1;
    }
    if (Math.abs(t.cx - t.x) > s && Math.abs(t.cy - t.y) > s) {
      const e = Math.min(t.x, t.cx),
        s = Math.min(t.y, t.cy),
        n = Math.max(t.x, t.cx),
        i = Math.max(t.y, t.cy);
      return (
        this._dsAddZoneFromPts([
          { x: e, y: s },
          { x: n, y: s },
          { x: n, y: i },
          { x: e, y: i },
        ]),
        !0
      );
    }
    return !1;
  }
  _curFloorPaths() {
    const t = this.state,
      e = t.year + "-" + t.month + "-" + Math.min(t.day, this.hMonthDays(t.year, t.month)),
      s = (t.rounds || {})[e],
      n = s && Array.isArray(s.d) ? s.d[t.floor >= 0 ? t.floor : 0] : null;
    return n && Array.isArray(n.paths) ? n.paths : [];
  }
  _dsOpenPathEditor(t, e) {
    const s = this._curFloorPaths()[t];
    s &&
      this.setState({
        dspdrag: null,
        dspvdrag: null,
        dsPathTmp: null,
        dsSel: { t: "path", i: t },
        pEdit: {
          i: t,
          isNew: !!e,
          name: s.name || "",
          code: s.code || "",
          type: s.type || "in",
          dir: s.dir || "fwd",
          line: s.line || "dash",
          w: s.w || "thin",
          active: !1 !== s.active,
          hideLabel: !!s.hideLabel,
          anim: !1 !== s.anim,
        },
      });
  }
  _dsSavePathEdit() {
    const t = this.state.pEdit;
    if (!t) return;
    const e = (t.name || "").trim();
    e
      ? (t.isNew && (this._dsHistMerge = "skip"),
        this._updRound((s) => {
          const n = (s.paths || [])[t.i];
          n &&
            (s.paths[t.i] = {
              ...n,
              name: e,
              code: (t.code || "").trim(),
              type: t.type || "in",
              dir: t.dir || "fwd",
              line: t.line || "dash",
              w: t.w || "thin",
              active: !1 !== t.active,
              hideLabel: !!t.hideLabel,
              anim: !1 !== t.anim,
            });
        }),
        (this._dsHistMerge = null),
        this.setState({ pEdit: null }))
      : this.bsToast("اكتب اسم المسار");
  }
  _dsClosePathEditor() {
    const t = this.state.pEdit;
    return (
      !!t &&
      (t.isNew
        ? ((this._dsHistMerge = "drop"),
          this._updRound((e) => {
            Array.isArray(e.paths) && e.paths.splice(t.i, 1);
          }),
          (this._dsHistMerge = null),
          this.setState({ pEdit: null, dsSel: null, selMulti: [], dsPathTmp: null }),
          !0)
        : (this.setState({ pEdit: null }), !0))
    );
  }
  _dsAddPathFromPts(t) {
    const e = [];
    if (
      ((t || []).forEach((t) => {
        const s = e[e.length - 1];
        (!s || Math.hypot(t.x - s.x, t.y - s.y) > 0.5) && e.push(t);
      }),
      e.length < 2)
    )
      return void this.setState({ dsPolyPts: [], dsPolyCursor: null });
    let s = -1;
    (this._updRound((t) => {
      t.paths = Array.isArray(t.paths) ? t.paths : [];
      const n = t.paths.map((t) => parseInt(String(t.code || "").replace(/^\D+/, ""), 10) || 0),
        i = Math.max(0, ...n) + 1;
      (t.paths.push({
        pts: e,
        name: "مسار " + i,
        code: "P" + (i < 10 ? "0" + i : i),
        type: "in",
        dir: "fwd",
        line: "dash",
        w: "thin",
        active: !0,
        anim: !0,
        hideLabel: !0,
        uid: this._uid(),
      }),
        (s = t.paths.length - 1));
    }),
      this.setState({ tool: "select", dsPolyPts: [], dsPolyCursor: null, dsSel: null, selMulti: [] }, () => {
        s >= 0 && this._dsOpenPathEditor(s, !0);
      }));
  }
  _zInside(t, e, s) {
    let n = !1,
      i = s.length - 1;
    for (let o = 0; o < s.length; o++) {
      const r = s[o].x,
        a = s[o].y,
        l = s[i].x,
        d = s[i].y;
      (a > e != d > e && t < ((l - r) * (e - a)) / (d - a || 1e-12) + r && (n = !n), (i = o));
    }
    return n;
  }
  _boxFits(t, e, s, n, i, o) {
    const r = (i * Math.PI) / 180,
      a = Math.cos(r),
      l = Math.sin(r),
      d = s / 2,
      p = n / 2,
      h = (t, e) => {
        let s = !1;
        for (let n = 0, i = o.length - 1; n < o.length; i = n++) {
          const r = o[n],
            a = o[i];
          r.y > e != a.y > e && t < ((a.x - r.x) * (e - r.y)) / (a.y - r.y) + r.x && (s = !s);
        }
        return s;
      };
    for (let s = 0; s < 4; s++)
      for (let n = 0; n <= 6; n++) {
        const i = n / 6;
        let o, r;
        if (
          (0 === s
            ? ((o = 2 * d * i - d), (r = -p))
            : 1 === s
              ? ((o = d), (r = 2 * p * i - p))
              : 2 === s
                ? ((o = d - 2 * d * i), (r = p))
                : ((o = -d), (r = p - 2 * p * i)),
          !h(t + o * a - r * l, e + o * l + r * a))
        )
          return !1;
      }
    return !0;
  }
  _capturePrintPage(t) {
    return KIVO.BassamPrintCore.capture(this, t, "svg[data-ds-zoom]");
  }
  _densClearAt(t, e) {
    this._updRound((s) => {
      const n = (s.zones || [])[t];
      if (!n) return;
      const i = n.pc && "object" == typeof n.pc ? { ...n.pc } : {};
      (void 0 === i.fajr && null != n.count && "" !== n.count && (i.fajr = n.count), (i[e] = null), (n.pc = i), (n.count = null));
    });
  }
  _kpiPrintSel() {
    const t = (this.state && this.state.rounds) || {},
      e = [];
    return (
      Object.keys(t).forEach((s) => {
        if (/^m:/.test(s) || /^__/.test(s)) return;
        const n = String(s).split("-");
        if (3 !== n.length) return;
        const i = +n[0],
          o = +n[1],
          r = +n[2];
        if (!(i > 0 && o > 0 && r > 0)) return;
        const a = t[s];
        a && Array.isArray(a.d) && e.push({ y: i, m: o, d: r, k: 1e4 * i + 100 * o + r, rec: a });
      }),
      e.sort((t, e) => t.k - e.k),
      e
    );
  }
  _kpiPrintBody() {
    if (!this.bsLensOn("zones")) return "";
    let t = this._kpiSelLast;
    if (((t && t.length) || (t = this._kpiPrintSel()), !t || !t.length)) return "";
    try {
      const e = this._kData(
          t,
          t.map((t) => t.d),
        ),
        s = this._kPaneZn(e);
      if (!s) throw new Error("لوحة فارغة");
      return this._kDefs() + s;
    } catch (t) {
      try {
        console.error("[kpi-print]", t);
      } catch (t) {}
      return (
        '<div style="flex:1;display:flex;align-items:center;justify-content:center;text-align:center;font-family:\'Cairo\',sans-serif"><div><div style="font-size:16px;font-weight:700;color:var(--fg-x8a6f35)">تعذّر بناء لوحة المؤشرات</div><div style="font-size:12px;font-weight:400;color:var(--fg-x94a3b8);margin-top:8px">' +
        String((t && t.message) || t) +
        "</div></div></div>"
      );
    }
  }
  _kpiPrintFit(t) {
    try {
      const e = t.querySelector(".kscale");
      if (!e) return;
      const s = [].slice.call(e.querySelectorAll("div")).filter((t) => /linear-gradient\(125deg/.test(t.getAttribute("style") || ""))[0];
      if (!s || !s.children[1]) return;
      const n = s.children[1],
        i = n.children[0],
        o = n.children[1];
      if (!i || !o) return;
      const r = [].slice.call(i.children),
        a = r[3],
        l = r[4];
      if (!a || !l) return;
      ((s.style.marginBottom = "0"),
        (s.style.display = "flex"),
        (s.style.flexDirection = "column"),
        (n.style.flex = "1"),
        (n.style.minHeight = "0"),
        (n.style.alignItems = "stretch"),
        (i.style.flex = "1.35 1 0"),
        (i.style.minWidth = "0"),
        (i.style.minHeight = "0"),
        (o.style.flex = "1 1 0"),
        (o.style.minWidth = "0"),
        (o.style.minHeight = "0"),
        [a, l].forEach((t) => {
          ((t.style.flex = "1 1 0"),
            (t.style.minHeight = "0"),
            (t.style.display = "flex"),
            (t.style.flexDirection = "column"),
            (t.style.boxSizing = "border-box"));
          const e = t.lastElementChild;
          if (!e) return;
          ((e.style.flex = "1"), (e.style.minHeight = "0"), (e.style.display = "flex"), (e.style.flexDirection = "column"));
          const s = e.firstElementChild;
          (s && ((s.style.flex = "1"), (s.style.minHeight = "0"), (s.style.alignItems = "stretch"), (s.style.gap = "18px")),
            [].slice.call(t.querySelectorAll("div")).forEach((t) => {
              const e = t.getAttribute("style") || "";
              if ((/max-width:\s*74px/.test(e) && (t.style.maxWidth = "118px"), !/height:\s*138px/.test(e))) return;
              const s = t.firstElementChild;
              if (!s) return;
              const n = /height:\s*([\d.]+)px/.exec(s.getAttribute("style") || "");
              if (!n) return;
              const i = parseFloat(n[1]) || 1;
              ((t.style.height = "auto"),
                (t.style.flex = "1"),
                (t.style.minHeight = "0"),
                (s.style.height = ((i / 130) * 100).toFixed(2) + "%"),
                [].slice.call(s.children).forEach((t) => {
                  const e = /height:\s*([\d.]+)px/.exec(t.getAttribute("style") || "");
                  e && (t.style.height = ((parseFloat(e[1]) / i) * 100).toFixed(2) + "%");
                }));
              const o = t.parentElement;
              o && ((o.style.flex = "1"), (o.style.minHeight = "0"));
            }));
        }),
        (o.style.display = "flex"),
        (o.style.flexDirection = "column"),
        (o.style.boxSizing = "border-box"));
      const d = o.children[1];
      d &&
        ((d.style.flex = "1"),
        (d.style.minHeight = "0"),
        (d.style.display = "flex"),
        (d.style.flexDirection = "column"),
        (d.style.justifyContent = "space-between"));
      const p = o.lastElementChild;
      if (p && p !== d) {
        p.style.flex = "0 0 auto";
        const t = p.lastElementChild;
        t && ((t.firstElementChild || t).style.gridTemplateColumns = "repeat(2,minmax(0,1fr))");
      }
      const h = o.firstElementChild && o.firstElementChild.firstElementChild;
      if (h) {
        const t = 196,
          e = t / 136;
        ((h.style.width = t + "px"), (h.style.height = t + "px"));
        const s = h.querySelector("svg");
        s && (s.setAttribute("width", t), s.setAttribute("height", t), (s.style.width = t + "px"), (s.style.height = t + "px"));
        const n = h.lastElementChild;
        n &&
          [].slice.call(n.children).forEach((t) => {
            const s = /font-size:\s*([\d.]+)px/.exec(t.getAttribute("style") || "");
            s && (t.style.fontSize = (parseFloat(s[1]) * e).toFixed(1) + "px");
          });
      }
      const c = e.parentElement,
        g = t.defaultView || window;
      ((e.style.transform = "none"),
        (e.style.flex = "0 0 auto"),
        (e.style.width = "100%"),
        (e.style.alignSelf = "flex-start"),
        (e.style.height = "auto"),
        (s.style.height = "auto"));
      const f = g.getComputedStyle(c),
        u = c.clientHeight - parseFloat(f.paddingTop) - parseFloat(f.paddingBottom) - 2,
        y = c.clientWidth - parseFloat(f.paddingRight) - parseFloat(f.paddingLeft),
        m = s.offsetHeight || 1;
      if (!(u > 60 && y > 60 && m > 20)) {
        ((e.style.width = "100%"),
          (e.style.height = "100%"),
          (e.style.transform = "none"),
          (e.style.alignSelf = "auto"),
          (s.style.height = "100%"));
        try {
          console.warn("[kpi-print-fit] قياس غير صالح", u, y, m);
        } catch (t) {}
        return;
      }
      const x = Math.max(0.35, Math.min(1, u / m));
      ((e.style.transformOrigin = "top right"),
        (e.style.width = (y / x).toFixed(1) + "px"),
        (e.style.height = (u / x).toFixed(1) + "px"),
        (e.style.transform = x < 0.9999 ? "scale(" + x.toFixed(4) + ")" : "none"),
        (e.style.alignSelf = "auto"),
        (e.style.flexShrink = "0"),
        (s.style.height = "100%"));
    } catch (t) {
      try {
        console.error("[kpi-print-fit]", t);
      } catch (t) {}
    }
  }
  _buildPrintDoc(t) {
    /* KIVO_258 · AUD-013: نواةُ الطباعة المشتركة (src/services/566-print-core.js) بخيارات هذه الوحدة */
    return KIVO.BassamPrintCore.build(this, t, { date: "round", kpi: !0, ver: "v1.0.577", logo: '<img src="@@KIVO_INLINE:img/haramain-print.png@@" alt="الحرمين" style="height:100%;width:auto;display:block"/>' });
  }
  _zLabelFit(t) {
    if (!t || t.length < 3) return null;
    const e = t.map((t) => t.x),
      s = t.map((t) => t.y),
      n = Math.min(...e),
      i = Math.max(...e),
      o = Math.min(...s),
      r = Math.max(...s);
    if (!(i > n && r > o)) return null;
    const a = (e, s) => {
        let n = !1;
        for (let i = 0, o = t.length - 1; i < t.length; o = i++) {
          const r = t[i],
            a = t[o];
          r.y > s != a.y > s && e < ((a.x - r.x) * (s - r.y)) / (a.y - r.y) + r.x && (n = !n);
        }
        return n;
      },
      l = (e, s) => {
        let n = 1 / 0;
        for (let i = 0, o = t.length - 1; i < t.length; o = i++) {
          const r = t[i],
            a = t[o],
            l = a.x - r.x,
            d = a.y - r.y,
            p = l * l + d * d;
          let h = p ? ((e - r.x) * l + (s - r.y) * d) / p : 0;
          ((h = Math.max(0, Math.min(1, h))), (n = Math.min(n, Math.hypot(r.x + h * l - e, r.y + h * d - s))));
        }
        return n;
      };
    let d = 0;
    const p = (t) => {
      for (let e = 1; e < 22; e++)
        for (let s = 1; s < 22; s++) {
          const d = n + (e / 22) * (i - n),
            p = o + (s / 22) * (r - o);
          a(d, p) && t(d, p, l(d, p));
        }
    };
    if (
      (p((t, e, s) => {
        s > d && (d = s);
      }),
      !(d > 0))
    )
      return null;
    let h = 0,
      c = 0,
      g = 0;
    for (let e = 0; e < t.length; e++) {
      const s = (e + 1) % t.length,
        n = t[e].x * t[s].y - t[s].x * t[e].y;
      ((g += n), (h += (t[e].x + t[s].x) * n), (c += (t[e].y + t[s].y) * n));
    }
    Math.abs(g) > 1 ? ((h /= 3 * g), (c /= 3 * g)) : ((h = (n + i) / 2), (c = (o + r) / 2));
    let f = null;
    if (
      (p((t, e, s) => {
        if (s < 0.9 * d) return;
        const n = Math.hypot(t - h, e - c);
        (!f || n < f.dc) && (f = { x: t, y: e, dc: n });
      }),
      !f)
    )
      return null;
    const u = (e) => {
      const s = Math.cos(e),
        n = Math.sin(e),
        i = [];
      for (let e = 0; e < t.length; e++) {
        const o = t[e],
          r = t[(e + 1) % t.length],
          a = r.x - o.x,
          l = r.y - o.y,
          d = s * l - n * a;
        if (Math.abs(d) < 1e-9) continue;
        const p = ((o.x - f.x) * l - (o.y - f.y) * a) / d,
          h = ((o.x - f.x) * n - (o.y - f.y) * s) / d;
        h >= 0 && h <= 1 && i.push(p);
      }
      i.sort((t, e) => t - e);
      const o = [];
      for (let t = 0; t < i.length; t++) (!o.length || Math.abs(i[t] - o[o.length - 1]) > 1e-6) && o.push(i[t]);
      let r = null,
        l = null;
      for (let t = 0; t < o.length; t++)
        if ((o[t] <= 1e-6 && (r = o[t]), o[t] >= -1e-6)) {
          l = o[t];
          break;
        }
      if (null == r || null == l) return 0;
      const d = f.x + (Math.cos(e) * (r + l)) / 2,
        p = f.y + (Math.sin(e) * (r + l)) / 2;
      return a(d, p) ? l - r : 0;
    };
    let y = 0,
      m = 0,
      x = 0,
      b = 0,
      k = 0,
      v = 0;
    (p((t, e) => {
      ((b += t), (k += e), v++);
    }),
      v > 2 &&
        ((b /= v),
        (k /= v),
        p((t, e) => {
          const s = t - b,
            n = e - k;
          ((y += s * s), (m += n * n), (x += s * n));
        }),
        (y /= v),
        (m /= v),
        (x /= v)));
    let w = 0;
    const S = y + m,
      A = y * m - x * x,
      z = Math.max(0, (S * S) / 4 - A),
      E = S / 2 + Math.sqrt(z),
      M = S / 2 - Math.sqrt(z),
      O = M > 1e-9 ? Math.sqrt(E / M) : 99;
    v > 2 && O >= 2 && (w = 0.5 * Math.atan2(2 * x, y - m));
    let F = u(w),
      C = u(w + Math.PI / 2),
      D = (180 * w) / Math.PI;
    for (; D > 90; ) D -= 180;
    for (; D <= -90; ) D += 180;
    return (
      Math.abs(D) <= 10 ? ((D = 0), (w = 0)) : Math.abs(Math.abs(D) - 90) <= 10 && ((D = D > 0 ? 90 : -90), (w = Math.PI / 2)),
      (F = u(w)),
      (C = u(w + Math.PI / 2)),
      { x: f.x, y: f.y, w: F, h: C > 0 ? C : 0.4 * F, deg: D }
    );
  }
  _zAnchor(t) {
    if (!t || t.length < 3) return null;
    let e = 0,
      s = 0,
      n = 0;
    for (let i = 0; i < t.length; i++) {
      const o = (i + 1) % t.length,
        r = t[i].x * t[o].y - t[o].x * t[i].y;
      ((e += r), (s += (t[i].x + t[o].x) * r), (n += (t[i].y + t[o].y) * r));
    }
    if (Math.abs(e) > 1e-9 && ((s /= 3 * e), (n /= 3 * e), this._zInside(s, n, t))) return { x: s, y: n };
    let i = 1 / 0,
      o = -1 / 0;
    t.forEach((t) => {
      (t.y < i && (i = t.y), t.y > o && (o = t.y));
    });
    let r = null;
    if (
      ([0.5, 0.35, 0.65, 0.25, 0.75, 0.45, 0.55, 0.15, 0.85].forEach((e) => {
        const s = i + (o - i) * e,
          n = [];
        let a = t.length - 1;
        for (let e = 0; e < t.length; e++) {
          const i = t[e].y,
            o = t[a].y;
          (i > s != o > s && n.push(((t[a].x - t[e].x) * (s - i)) / (o - i || 1e-12) + t[e].x), (a = e));
        }
        n.sort((t, e) => t - e);
        for (let t = 0; t + 1 < n.length; t += 2) {
          const e = n[t + 1] - n[t];
          (!r || e > r.w) && (r = { w: e, x: (n[t] + n[t + 1]) / 2, y: s });
        }
      }),
      r)
    )
      return { x: r.x, y: r.y };
    let a = 0,
      l = 0;
    return (
      t.forEach((t) => {
        ((a += t.x), (l += t.y));
      }),
      { x: a / t.length, y: l / t.length }
    );
  }

  _impRead(t) {
    if (!t) return;
    const e = new FileReader();
    ((e.onload = () => {
      let t = null;
      try {
        t = JSON.parse(e.result);
      } catch (t) {}
      if (!t || "hasr_round_v1" !== t.kind || !t.day || !Array.isArray(t.maps))
        return void this.setState({
          imp: { err: "الملف غير صالح — المطلوب ملف «جولة يوم» مصدَّر من نظام الحصر والمتابعة بزر «تصدير جولة»." },
          roundAdd: !1,
        });
      let s = null;
      try {
        const e = String(t.day).split("-").map(Number);
        3 === e.length && e.every((t) => t > 0) && (s = this.hParts(new Date(e[0], e[1] - 1, e[2], 12)));
      } catch (t) {}
      if (!s) return void this.setState({ imp: { err: "تعذّرت قراءة تاريخ الجولة من الملف." }, roundAdd: !1 });
      const n = s.y + "-" + s.m + "-" + s.d,
        i = t.maps.map((t) => {
          const e = Array.isArray(t.pins) ? t.pins : [];
          return {
            name: String(t.name || "دور").trim() || "دور",
            z: e.filter((t) => t && ("polygon" === t.shape || "zone" === t.shape)).length,
            g: e.filter((t) => t && "gate" === t.shape).length,
            p: e.filter((t) => t && "path" === t.shape).length,
            img: !!t.imgData,
            on: !0,
          };
        }),
        o = !!((this.state.rounds || {})[n] || {}).d,
        r = this.isMonthAp(this.state.rounds, s.y, s.m);
      this.setState({
        imp: {
          pack: t,
          day: t.day,
          dayLabel: t.dayLabel || "",
          hy: s.y,
          hm: s.m,
          hd: s.d,
          rk: n,
          boards: i,
          exists: o,
          mLock: r,
          busy: !1,
          err: null,
        },
        roundAdd: !1,
      });
    }),
      (e.onerror = () => this.setState({ imp: { err: "تعذّرت قراءة الملف." }, roundAdd: !1 })),
      e.readAsText(t, "UTF-8"));
  }
  _impRun() {
    const t = this.state.imp;
    if (!t || !t.pack || t.busy || t.mLock) return;
    const e = (e) => !t.boards || !t.boards[e] || !1 !== t.boards[e].on;
    if (t.boards && !t.boards.some((t) => !1 !== t.on)) return;
    this.setState({ imp: { ...t, busy: !0, err: null } });
    const s = t.pack;
    return Promise.all(
      s.maps.map((t) => {
        return (
          (e = t.imgData),
          new Promise((t) => {
            if (!e) return t(null);
            const s = new Image();
            ((s.onload = () => t({ w: s.naturalWidth || s.width, h: s.naturalHeight || s.height })),
              (s.onerror = () => t(null)),
              (s.src = e));
          })
        );
        var e;
      }),
    ).then(async (n) => {
      try {
        const ack = await this._opImageAction(
          "import",
          {
            pack: t.pack,
            boards: t.boards,
            hy: t.hy,
            hm: t.hm,
            hd: t.hd,
            rk: t.rk,
          },
          async () => {
            const nextPlan = this._opRead("bassam_plan_v1") || {
                zones: [],
                gates: [],
                paths: [],
                floors: [],
                months: {},
              },
              zoneBase = this._opRead("bassam_zone_opts_v1"),
              gateBase = this._opRead("bassam_gate_opts_v1");
            this._opRead("bassam_rounds_v1");
            const related = {
              bassam_zone_opts_v1: zoneBase || {},
              bassam_gate_opts_v1: gateBase || {},
            };
            const i = 1e3,
          o = 600,
          r = (t) => Math.round(100 * t) / 100,
          a = (t) => {
            if (!t || !t.w || !t.h) return { dw: i, dh: o, ox: 0, oy: 0 };
            const e = Math.min(i / t.w, o / t.h),
              s = t.w * e,
              n = t.h * e;
            return { dw: s, dh: n, ox: (i - s) / 2, oy: (o - n) / 2 };
          },
          l = (t, e) => r(t.ox + ((+e || 0) / 100) * t.dw),
          d = (t, e) => r(t.oy + ((+e || 0) / 100) * t.dh),
          p = (t, e) => ((+e || 0) / 100) * t.dw,
          h = (t, e) => ((+e || 0) / 100) * t.dh,
          c = (t) => t.hOut || t.h || null,
          g = (t) => t.hIn || (t.h ? { x: -t.h.x, y: -t.h.y } : null),
          f = (t) =>
            (t || []).some((t) => {
              const e = c(t),
                s = g(t);
              return (e && (e.x || e.y)) || (s && (s.x || s.y));
            }),
          u = (t, e) => {
            const s = Array.isArray(t.points) ? t.points : [];
            let n, i;
            if ("zone" === t.shape) {
              const s = l(e, t.x - t.w / 2),
                i = d(e, t.y - t.h / 2),
                o = l(e, t.x + t.w / 2),
                r = d(e, t.y + t.h / 2);
              n = [
                { x: s, y: i },
                { x: o, y: i },
                { x: o, y: r },
                { x: s, y: r },
              ];
            } else n = s.map((t) => ({ x: l(e, t.x), y: d(e, t.y) }));
            if (n.length < 3) return null;
            if ("zone" !== t.shape && f(s)) {
              i = "M" + n[0].x + " " + n[0].y;
              for (let t = 0; t < n.length; t++) {
                const o = n[t],
                  a = n[(t + 1) % n.length],
                  l = c(s[t]) || { x: 0, y: 0 },
                  d = g(s[(t + 1) % s.length]) || { x: 0, y: 0 };
                i +=
                  " C" +
                  r(o.x + p(e, l.x)) +
                  " " +
                  r(o.y + h(e, l.y)) +
                  " " +
                  r(a.x + p(e, d.x)) +
                  " " +
                  r(a.y + h(e, d.y)) +
                  " " +
                  a.x +
                  " " +
                  a.y;
              }
              i += " Z";
            } else i = "M" + n.map((t) => t.x + " " + t.y).join(" L") + " Z";
            let o = 0;
            for (let t = 0; t < n.length; t++) {
              const e = (t + 1) % n.length;
              o += n[t].x * n[e].y - n[e].x * n[t].y;
            }
            const a = this._zAnchor(n) || n[0];
            return {
              d: i,
              code: "",
              ser: "",
              cat: "men",
              rawA: Math.abs(o / 2),
              cx: Math.round(a.x),
              cy: Math.round(a.y),
              count: null,
              pc: {},
              emp: [],
              uid: this._uid(),
              region: t.region || "",
              level: t.role || "",
              ztype: t.type || "",
              zcat: t.category || "",
              off: "غير مفعل" === t.activation,
              readiness: t.readiness || null,
              hideLabel: !1,
            };
          },
          y = (t, e) => ({
            x: l(e, t.x),
            y: d(e, t.y),
            label: (t.dname || "").trim(),
            num: String(null == t.code ? "" : t.code),
            hideNum: !1,
            hideLabel: !0,
            loc: t.region || "",
            kind: t.type || "",
            route: t.dpath || "",
            cls: t.dclass || "",
            closed: "مغلق" === t.dstate,
            cats: Array.isArray(t.dcats) ? t.dcats.slice() : [],
            emp: [],
            uid: this._uid(),
          }),
          m = (t, e, s) => {
            const n = Array.isArray(t.points) ? t.points : [];
            if (n.length < 2) return null;
            let i = [];
            if (f(n)) {
              const t = n.map((t) => ({ x: e.ox + ((+t.x || 0) / 100) * e.dw, y: e.oy + ((+t.y || 0) / 100) * e.dh }));
              for (let s = 0; s < n.length - 1; s++) {
                const o = t[s],
                  a = t[s + 1],
                  l = c(n[s]) || { x: 0, y: 0 },
                  d = g(n[s + 1]) || { x: 0, y: 0 },
                  f = { x: o.x + p(e, l.x), y: o.y + h(e, l.y) },
                  u = { x: a.x + p(e, d.x), y: a.y + h(e, d.y) };
                0 === s && i.push({ x: r(o.x), y: r(o.y) });
                for (let t = 1; t <= 8; t++) {
                  const e = t / 8,
                    s = 1 - e;
                  i.push({
                    x: r(s * s * s * o.x + 3 * s * s * e * f.x + 3 * s * e * e * u.x + e * e * e * a.x),
                    y: r(s * s * s * o.y + 3 * s * s * e * f.y + 3 * s * e * e * u.y + e * e * e * a.y),
                  });
                }
              }
            } else i = n.map((t) => ({ x: l(e, t.x), y: d(e, t.y) }));
            return {
              pts: i,
              uid: this._uid(),
              name: t.name || "مسار " + (s + 1),
              code: t.code || "",
              type: "out" === t.dir ? "out" : "in",
              dir: "fwd",
              line: "dashed" === t.line ? "dash" : "dotted" === t.line ? "dot" : "solid",
              w: +t.width >= 0.8 ? "bold" : "normal",
              active: "غير مفعل" !== t.activation,
              anim: !0,
            };
          },
          x = (t) => String(t || "دور").trim() || "دور";
            const k = [],
              v = async (plan) => {
                plan.floors = Array.isArray(plan.floors) ? plan.floors : [];
                for (let index = 0; index < s.maps.length; index++) {
                  const map = s.maps[index];
                  if (!e(index)) {
                    k[index] = null;
                    continue;
                  }
                  const name = x(map.name),
                    dimensions = n[index];
                  let at = plan.floors.findIndex(
                    (floor) =>
                      floor &&
                      floor.chip === "مستورد من الحصر" &&
                      ((floor.name || "").trim() === name ||
                        (floor.name || "").trim() === name + " — الحصر"),
                  );
                  if (at < 0) {
                    const duplicate = plan.floors.some(
                      (floor) => floor && (floor.name || "").trim() === name,
                    );
                    const iid = map.imgData
                      ? await this._putImg(map.imgData)
                      : null;
                    plan.floors.push({
                      sid: KIVO.BassamAudit
                        ? KIVO.BassamAudit.newId("s_")
                        : undefined,
                      num: plan.floors.length,
                      name: duplicate ? name + " — الحصر" : name,
                      iid,
                      imgW: dimensions ? dimensions.w : 0,
                      imgH: dimensions ? dimensions.h : 0,
                      approved: false,
                      chip: "مستورد من الحصر",
                      chipTone: "ok",
                      create: false,
                      zones: [],
                      gates: [],
                      paths: [],
                    });
                    at = plan.floors.length - 1;
                  } else if (!plan.floors[at].iid && map.imgData) {
                    plan.floors[at].iid = await this._putImg(map.imgData);
                    plan.floors[at].imgW = dimensions ? dimensions.w : 0;
                    plan.floors[at].imgH = dimensions ? dimensions.h : 0;
                  }
                  k[index] = at;
                }
                Object.values(plan.months || {}).forEach((entry) => {
                  const rows = Array.isArray(entry) ? entry : entry && entry.d;
                  if (Array.isArray(rows))
                    while (rows.length < plan.floors.length)
                      rows.push({
                        sid: plan.floors[rows.length].sid,
                        zones: [],
                        gates: [],
                        paths: [],
                        approved: false,
                      });
                  if (
                    entry &&
                    !Array.isArray(entry) &&
                    typeof entry.c === "number"
                  )
                    entry.c = plan.floors.length;
                });
                return true;
              };
            if ((await v(nextPlan)) === false)
              throw Error("operations-review-required");
            related.bassam_plan_v1 = nextPlan;
            const w = nextPlan.floors.map((floor) => ({
              sid: floor.sid,
              zones: [],
              gates: [],
              paths: [],
            }));
            s.maps.forEach((t, s) => {
          if (!e(s)) return;
          const i = null != k[s] ? k[s] : -1;
          if (-1 === i || !w[i]) return;
          const o = a(n[s]),
            r = w[i];
          (Array.isArray(t.pins) ? t.pins : []).forEach((t) => {
            if (t)
              if ("gate" === t.shape) r.gates.push(y(t, o));
              else if ("path" === t.shape) {
                const e = m(t, o, r.paths.length);
                e && r.paths.push(e);
              } else if ("polygon" === t.shape || "zone" === t.shape) {
                const e = u(t, o);
                e && r.zones.push(e);
              }
          });
        });
            try {
              const t = (s.lists && s.lists.lists) || {},
                e = (() => {
                  try {
                    const t = this._opRead("bassam_zone_opts_v1");
                    return t && "object" == typeof t ? t : {};
                  } catch (t) {
                    return {};
                  }
                })(),
                n = (t) =>
              Array.isArray(t)
                ? t
                    .map((t) =>
                      "string" == typeof t
                        ? { n: t, c: "" }
                        : t && t.n
                          ? { n: t.n, c: null == t.c ? "" : String(t.c), ...(t.r ? { r: t.r } : {}) }
                          : null,
                    )
                    .filter(Boolean)
                : [],
                i = {
              ...e,
              region: n(e.region),
              level: n(e.level),
              ztype: Array.isArray(e.ztype) ? e.ztype : [],
              zcat: Array.isArray(e.zcat) ? e.zcat : [],
              zcatStyle: e.zcatStyle && "object" == typeof e.zcatStyle ? e.zcatStyle : {},
            },
                o = (t, e) => {
              e && !t.some((t) => t.n === e) && t.push({ n: e, c: "" });
            },
                r = (t, e) => {
                  e && -1 === t.indexOf(e) && t.push(e);
                },
                a = (t, e) => {
              t && e && !i.level.some((s) => s && s.n === t && (s.r || "") === e) && i.level.push({ n: t, c: "", r: e });
            };
              ((t.regions || []).forEach((t) => o(i.region, t)),
            (t.types || []).forEach((t) => r(i.ztype, t)),
            w.forEach((t) =>
              t.zones.forEach((t) => {
                (o(i.region, t.region), a(t.level, t.region), r(i.ztype, t.ztype), r(i.zcat, t.zcat));
              }),
            ));
              const l = (s.lists && s.lists.catStyles) || {},
            d = { diagonal: "diag", cross: "cross", dots: "dots", horizontal: "horiz", vertical: "vert" };
              (Object.keys(l).forEach((t) => {
            if (-1 === i.zcat.indexOf(t) || i.zcatStyle[t]) return;
            const e = l[t] || {};
            i.zcatStyle[t] = {
              f: e.fill || "#BB9661",
              o: null == e.fillOpacity ? 50 : +e.fillOpacity,
              s: e.stroke || "#BB9661",
              bs: "dashed" === e.line ? "dash" : "dotted" === e.line ? "dot" : "solid",
              bw: Math.max(0.8, Math.round(3 * (+e.width || 0.4) * 10) / 10),
              h: d[e.hatch] || "none",
              hc: e.hatchColor || e.stroke || "#BB9661",
              hw: 1,
              hg: 7,
            };
          }),
                (related.bassam_zone_opts_v1 = i),
                this.setState({ zoneOpts: i }),
                w.forEach((t) => {
              let e = 0;
              (t.zones || []).forEach((t) => {
                e++;
                const s = e < 10 ? "0" + e : String(e);
                ((t.ser = s), (t.code = this._composeZoneCode(t.region, t.level, s, i, t.ztype)));
              });
            }));
              const p = (() => {
                  try {
                    const t = this._opRead("bassam_gate_opts_v1");
                    return t && "object" == typeof t ? t : {};
                  } catch (t) {
                    return {};
                  }
                })(),
                h = {
              loc: Array.isArray(p.loc) ? p.loc : [],
              gtype: Array.isArray(p.gtype) ? p.gtype : [],
              kind: Array.isArray(p.kind) ? p.kind : [],
              route: Array.isArray(p.route) ? p.route : [],
              cls: Array.isArray(p.cls) ? p.cls : [],
              cat: Array.isArray(p.cat) ? p.cat : [],
            },
                c = (s.lists && s.lists.doorLists) || {};
              ((c.type || []).forEach((t) => r(h.kind, t)),
                (c.path || []).forEach((t) => r(h.route, t)),
                (c.classification || []).forEach((t) => r(h.cls, t)),
                (c.category || []).forEach((t) => r(h.cat, t)),
                w.forEach((t) =>
              t.gates.forEach((t) => {
                (r(h.gtype, t.gtype), r(h.kind, t.kind), r(h.route, t.route), r(h.cls, t.cls), (t.cats || []).forEach((t) => r(h.cat, t)));
              }),
            ),
                (related.bassam_gate_opts_v1 = h));
            } catch (t) {}
            const S = { ...(this.state.rounds || {}) };
            S[t.rk] = {
              t: Date.now(),
              ap: 0,
              d: w,
              imp: { src: "hasr", day: s.day },
            };

            return {
              changes: { ...related, bassam_rounds_v1: S },
              finish: () => {
                const A = k.length && null != k[0] ? k[0] : 0;
                this.setState(
          (e) => ({
            imp: null,
            year: t.hy,
            month: t.hm,
            day: t.hd,
            floor: A,
            lens: "zones",
            panelTab: "zones",
            dsSel: null,
            selMulti: [],
            dsHovZ: null,
            dsHovG: null,
            dview: { x: 0, y: 0, w: 1e3, h: 600 },
            roundAdd: !1,
            planTick: (e.planTick || 0) + 1,
            fimgs: {},
          }),
          () => this._loadFloorImgs(),
        );
              },
            };
          },
        );
        if (!ack || ack.ok !== 1)
          this.setState({
            imp: {
              ...t,
              busy: false,
              err: "لم يصل تأكيد الاستيراد — بقيت المسودة والتذكرة للمراجعة",
            },
          });
      } catch (t) {
        this.setState({ imp: { ...(this.state.imp || {}), busy: !1, err: "تعذّر الاستيراد: " + String((t && t.message) || t) } });
      }
    });
  }
  loadRounds() {
    try {
      const t = this._opRead("bassam_rounds_v1");
      if (t && "object" == typeof t) {
        try {
          KIVO.BassamAudit && KIVO.BassamAudit.stampRounds(t, !1);
        } catch (e9) {}
        return t;
      }
    } catch (t) {}
    return {};
  }
  PC(t) {
    try {
      return !!KIVO.BassamPerm && KIVO.BassamPerm.can("daily", t || "view");
    } catch (t) {
      return !1;
    }
  }
  _dsCanWrite() {
    return this.PC("edit") || this.PC("approve") || this.PC("add");
  }
  _dsPermVals() {
    const t = this._dsCanWrite();
    return {
      dsPmAdd: this.PC("add"),
      dsPmEdit: this.PC("edit"),
      dsPmDel: this.PC("del"),
      dsPmApprove: this.PC("approve"),
      dsPmExport: this.PC("export"),
      dsPmWrite: t,
      dsPmReadOnly: !t,
      dsPmNoteStyle:
        "display:flex;align-items:center;gap:8px;padding:9px 14px;border-radius:12px;background:var(--bg-a1001161390p06);border:1px solid var(--bd-a1001161390p22);font-size:11.5px;font-weight:600;color:var(--fg-x475569);line-height:1.8",
    };
  }
  permDeny() {
    try {
      this.bsToast("صلاحيتك على المتابعة اليومية لا تشمل هذا الإجراء — راجع مدير الإدارة");
    } catch (t) {}
  }
  async saveRounds(value, related = {}) {
    if (!(this.PC("edit") || this.PC("approve") || this.PC("add"))) {
      this.permDeny();
      this._opLastSave = Promise.resolve({ ok: 0, err: "denied" });
      return this._opLastSave;
    }
    this._dsWriting = true;
    try {
      KIVO.BassamAudit && KIVO.BassamAudit.stampRounds(value, true);
    } catch (error) {}
    this.setState({ rounds: value });
    this._opLastSave = this._opCommit({ ...related, bassam_rounds_v1: value });
    try {
      return await this._opLastSave;
    } finally {
      this._dsWriting = false;
    }
  }
  mKey(t, e) {
    return "m:" + t + "-" + e;
  }
  isMonthAp(t, e, s) {
    const n = (t || {})[this.mKey(e, s)];
    return !(!n || !n.ap) || (this.monthPastDS(e, s) && !(n && n.mo));
  }
  monthPastDS(t, e) {
    let s;
    try {
      s = this.hParts(new Date());
    } catch (t) {
      s = KIVO.BassamHijri ? KIVO.BassamHijri.now() : { y: 1448, m: 2, d: 1 };
    }
    return t < s.y || (t === s.y && e < s.m);
  }
  dayPastDS(t, e, s) {
    let n;
    try {
      n = this.hParts(new Date());
    } catch (t) {
      n = KIVO.BassamHijri ? KIVO.BassamHijri.now() : { y: 1448, m: 2, d: 1 };
    }
    return t < n.y || (t === n.y && e < n.m) || (t === n.y && e === n.m && s < n.d);
  }
  isDayOpen(t, e, s, n) {
    const i = (t || {})[this.mKey(e, s)];
    return !!(i && i.dopen && i.dopen[n]);
  }
  isDayShut(t, e, s, n) {
    const i = (t || {})[this.mKey(e, s)];
    return !!(i && i.dshut && i.dshut[n]);
  }
  _setDShut(t, e, s, n, i) {
    const o = this.mKey(e, s),
      r = { ...(t[o] || {}) },
      a = { ...(r.dshut || {}) };
    return (
      i ? (a[n] = 1) : delete a[n],
      Object.keys(a).length ? (r.dshut = a) : delete r.dshut,
      Object.keys(r).length ? (t[o] = r) : delete t[o],
      t
    );
  }
  _setDOpenIn(t, e, s, n, i) {
    const o = this.mKey(e, s),
      r = { ...(t[o] || {}) },
      a = { ...(r.dopen || {}) };
    return (
      i ? (a[n] = 1) : delete a[n],
      Object.keys(a).length ? (r.dopen = a) : delete r.dopen,
      Object.keys(r).length ? (t[o] = r) : delete t[o],
      t
    );
  }
  dayLockedDS(t, e, s, n) {
    return this.dayPastDS(e, s, n) ? !this.isDayOpen(t, e, s, n) : this.isDayShut(t, e, s, n);
  }
  _toggleDayLock(t, e, s, n) {
    let i = { ...(this.state.rounds || {}) };
    (n
      ? (i = this.dayPastDS(t, e, s) ? this._setDOpenIn(i, t, e, s, !1) : this._setDShut(i, t, e, s, !0))
      : ((i = this._setDShut(i, t, e, s, !1)), this.dayPastDS(t, e, s) && (i = this._setDOpenIn(i, t, e, s, !0))),
      this.saveRounds(i));
  }
  _setRoundApLock(t, e, s, n) {
    let i = { ...(this.state.rounds || {}) };
    const o = t + "-" + e + "-" + s,
      r = i[o];
    return !(
      !r ||
      !Array.isArray(r.d) ||
      ((i[o] = { ...r, ap: n, d: r.d.map((t) => ({ ...(t || {}), ap: n })) }),
      this.dayPastDS(t, e, s) ? (i = this._setDOpenIn(i, t, e, s, !n)) : n || (i = this._setDShut(i, t, e, s, !1)),
      this.saveRounds(i),
      0)
    );
  }
  _mOpenFlag(t, e) {
    const s = (this.state.rounds || {})[this.mKey(t, e)];
    return !(!s || !s.mo);
  }
  _setMOpen(t, e, s) {
    const n = { ...(this.state.rounds || {}) },
      i = this.mKey(t, e),
      o = { ...(n[i] || {}) };
    (delete o.ap, s ? (o.mo = 1) : delete o.mo, Object.keys(o).length ? (n[i] = o) : delete n[i], this.saveRounds(n));
  }
  _setMonthAp(t, e, s) {
    const n = { ...(this.state.rounds || {}) },
      i = this.mKey(t, e),
      o = { ...(n[i] || {}) };
    (s ? (delete o.mo, (o.ap = 1)) : (delete o.ap, this.monthPastDS(t, e) && (o.mo = 1)),
      Object.keys(o).length ? (n[i] = o) : delete n[i],
      this.saveRounds(n));
  }
  monthDaysAllAp(t, e, s) {
    const n = this.hMonthDays(e, s);
    if (!n) return !1;
    for (let i = 1; i <= n; i++) {
      const n = (t || {})[e + "-" + s + "-" + i];
      if (!n || !Array.isArray(n.d) || !n.ap) return !1;
    }
    return !0;
  }
  autoMonthAp(t, e, s) {
    return (this.monthDaysAllAp(t, e, s) && !this.isMonthAp(t, e, s) && (t[this.mKey(e, s)] = { ap: 1, auto: 1 }), t);
  }
  state = (() => {
    const t = (() => {
      try {
        const t = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {
            year: "numeric",
            month: "numeric",
            day: "numeric",
          }).formatToParts(new Date()),
          e = (e) => +t.find((t) => t.type === e).value;
        return { y: e("year"), m: e("month"), d: e("day") };
      } catch (t) {
        return KIVO.BassamHijri ? KIVO.BassamHijri.now() : { y: 1448, m: 2, d: 1 };
      }
    })();
    return {
      dsTab: "kpi",
      dsKpiSub: "dy",
      brkDim: "summary",
      gateDim: "summary",
      markDim: "summary",
      pathDim: "summary",
      distDim: "summary",
      densDim: "summary",
      dsKpiYear: null,
      dsKpiMonth: null,
      dsKpiMode: null,
      dsKpiFrom: "",
      dsKpiTo: "",
      year: t.y,
      month: t.m,
      day: t.d,
      floor: -1,
      lens: "zones",
      panelTab: "zones",
      registryOpen: !1,
      panelOpen: "undefined" == typeof window || window.innerWidth > 980,
      dview: { x: 0, y: 0, w: 1e3, h: 600 },
      rounds: this.loadRounds(),
      roundAdd: !1,
      prayer: "fajr",
      tool: "select",
      draft: null,
      dsPolyPts: [],
      dsPolyCursor: null,
      dsToolsOpen: !0,
      dsZoneTmp: null,
      zdrag: null,
      vdrag: null,
      zEdit: null,
      zDd: null,
      zDdEdit: null,
      zDdEditT: null,
      zDdNew: "",
      zDdNewC: "",
      zDdEditVal: "",
      zDdEditC: "",
      zcs: null,
      zoneOpts: this.loadZoneOpts(),
      dsClear: null,
    };
  })();
  hGreg(t, e, s) {
    const n = (t) => new Date(t.getFullYear(), t.getMonth(), t.getDate(), 12);
    let i = n(new Date(new Date(2026, 5, 16).getTime() + 864e5 * (29.5306 * (12 * (t - 1448) + (e - 1)) + (s - 1))));
    try {
      for (let o = 0; o < 12; o++) {
        const o = this.hParts(i);
        if (o.y === t && o.m === e && o.d === s) return i;
        const r = 354.367 * (o.y - t) + 29.5306 * (o.m - e) + (o.d - s);
        i = n(new Date(i.getTime() - 864e5 * (Math.round(r) || (r > 0 ? 1 : -1))));
      }
    } catch (t) {}
    return i;
  }
  hMonthDays(t, e) {
    const s = t + "-" + e;
    if (((this.__hd = this.__hd || {}), this.__hd[s])) return this.__hd[s];
    let n = 30;
    try {
      const s = this.hGreg(t, e, 1),
        i = this.hParts(new Date(s.getFullYear(), s.getMonth(), s.getDate() + 29, 12));
      n = i.y === t && i.m === e ? 30 : 29;
    } catch (t) {}
    return ((this.__hd[s] = n), n);
  }
  KGOLD = "#b99751";
  KGOLD_D = "#8A6F35";
  KGOLD_L = "var(--brand-light)";
  KNAVY = "var(--text-secondary)";
  KLINE = "var(--border-subtle)";
  KSC = [
    "var(--chart-2)",
    "var(--chart-4)",
    "var(--chart-3)",
    "var(--chart-5)",
    "var(--chart-8)",
  ];
  KCBC = [
    "var(--chart-1)",
    "var(--chart-11)",
    "var(--chart-7)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
    "var(--chart-9)",
    "var(--chart-8)",
  ];
  _kStyle(t) {
    const e = {};
    return (
      String(t || "")
        .split(";")
        .forEach((t) => {
          const s = t.indexOf(":");
          if (s < 0) return;
          const n = t.slice(0, s).trim();
          if (n) {
            const i = n.replace(/-([a-z])/g, (t, e) => e.toUpperCase()),
              o = t.slice(s + 1).trim();
            e[i] = KIVO.__bsTokVal ? KIVO.__bsTokVal(i, o) : o;
          }
        }),
      e
    );
  }
  _kProps(t, e) {
    const s = { key: e };
    for (let e = 0; e < t.attributes.length; e++) {
      const n = t.attributes[e],
        i = n.name;
      "style" !== i
        ? "class" !== i
          ? "on" !== i.slice(0, 2) &&
            ("viewbox" !== i
              ? (s[i.indexOf("-") >= 0 ? i.replace(/-([a-z])/g, (t, e) => e.toUpperCase()) : i] = n.value)
              : (s.viewBox = n.value))
          : (s.className = n.value)
        : (s.style = this._kStyle(n.value));
    }
    return s;
  }
  _kNode(t, e) {
    if (3 === t.nodeType) {
      const e = t.nodeValue;
      return /\S/.test(e) ? e : null;
    }
    if (1 !== t.nodeType) return null;
    const s = "http://www.w3.org/2000/svg" === t.namespaceURI ? t.localName : t.tagName.toLowerCase();
    if ("br" === s) return React.createElement("br", { key: e });
    const n = [];
    for (let s = 0; s < t.childNodes.length; s++) {
      const i = this._kNode(t.childNodes[s], e + "_" + s);
      null != i && "" !== i && n.push(i);
    }
    return React.createElement(s, this._kProps(t, e), n.length ? n : null);
  }
  _h2n(t, e) {
    try {
      const s = new DOMParser()
        .parseFromString('<!doctype html><html><body><div id="kr">' + String(t || "") + "</div></body></html>", "text/html")
        .getElementById("kr");
      if (!s) return null;
      const n = [];
      for (let t = 0; t < s.childNodes.length; t++) {
        const i = this._kNode(s.childNodes[t], (e || "k") + "_" + t);
        null != i && "" !== i && n.push(i);
      }
      return React.createElement("div", { key: e || "k", style: { display: "flex", flexDirection: "column" } }, n);
    } catch (t) {
      try {
        console.error("[kpi] h2n", t);
      } catch (t) {}
      return null;
    }
  }
  _kDefs() {
    const t = this.KGOLD,
      e = this.KGOLD_D,
      s = this.KGOLD_L;
    return (
      '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="kGauge" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#E9DEC6"></stop><stop offset="0.5" stop-color="' +
      s +
      '"></stop><stop offset="1" stop-color="' +
      e +
      '"></stop></linearGradient><linearGradient id="kHero" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' +
      e +
      '" stop-opacity="0.28"></stop><stop offset="1" stop-color="' +
      e +
      '" stop-opacity="0"></stop></linearGradient><linearGradient id="kMini" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' +
      t +
      '" stop-opacity="0.22"></stop><stop offset="1" stop-color="' +
      t +
      '" stop-opacity="0"></stop></linearGradient><linearGradient id="kCol" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' +
      s +
      '"></stop><stop offset="1" stop-color="' +
      e +
      '"></stop></linearGradient></defs></svg>'
    );
  }
  _kPath(t, e, s, n) {
    const i = t.length;
    if (!i) return { line: "", area: "" };
    const o = n || Math.max.apply(null, t.concat([1])),
      r = (t) => (1 === i ? e / 2 : e - (t / (i - 1)) * e);
    let a = "";
    return (
      t.forEach((t, e) => {
        a += (e ? "L" : "M") + r(e).toFixed(1) + " " + ((t) => s - (o > 0 ? (t / o) * s : 0))(t).toFixed(1) + " ";
      }),
      { line: a, area: "M" + r(0).toFixed(1) + " " + s + " " + a.slice(1) + "L" + r(i - 1).toFixed(1) + " " + s + " Z" }
    );
  }
  _kArea(t, e, s, n, i, o, r, a) {
    if (!t.length) return "";
    ((s = s || 1e3), (n = n || 170), (i = i || this.KGOLD_D), (o = o || "url(#kHero)"), (a = a || ""));
    const l = r || 10 * Math.ceil(Math.max.apply(null, t.concat([1])) / 10),
      d = this._kPath(t, s, n - 26, l),
      p = t.length,
      h = Math.max(1, Math.floor(p / 12));
    let c = "";
    for (let t = 0; t < 5; t++)
      c +=
        '<line x1="0" y1="' +
        (((n - 26) * t) / 4).toFixed(0) +
        '" x2="' +
        s +
        '" y2="' +
        (((n - 26) * t) / 4).toFixed(0) +
        '" stroke="var(--fg-xeff1f4)" stroke-width="1"></line>';
    ((c += '<path d="' + d.area + '" fill="' + o + '"></path>'),
      (c +=
        '<path d="' +
        d.line +
        '" fill="none" stroke="' +
        i +
        '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"></path>'),
      t.forEach((t, o) => {
        const r = n - 26 - (t / l) * (n - 26);
        c +=
          '<circle cx="' +
          (1 === p ? s / 2 : s - (o / (p - 1)) * s).toFixed(1) +
          '" cy="' +
          r.toFixed(1) +
          '" r="2.6" fill="var(--fg-xffffff)" stroke="' +
          i +
          '" stroke-width="1.8"><title>' +
          e[o] +
          " — " +
          t +
          a +
          "</title></circle>";
      }));
    for (let t = 0; t < 5; t++)
      c +=
        '<text x="' +
        (s - 3) +
        '" y="' +
        (((n - 26) * t) / 4 + 4).toFixed(0) +
        '" font-size="9" fill="var(--fg-x94a3b8)" text-anchor="end">' +
        Math.round(l - (l * t) / 4) +
        "</text>";
    for (let t = 0; t < p; t += h)
      c +=
        '<text x="' +
        (1 === p ? s / 2 : s - (t / (p - 1)) * s).toFixed(0) +
        '" y="' +
        (n - 8) +
        '" font-size="9" fill="var(--fg-x94a3b8)" text-anchor="middle">' +
        e[t] +
        "</text>";
    return '<svg viewBox="0 0 ' + s + " " + n + '" style="width:100%;height:' + n + 'px;display:block;overflow:visible">' + c + "</svg>";
  }
  _kLines(t, e, s, n, i, o) {
    ((s = s || 1e3), (n = n || 230), (i = i || 100), (o = o || "٪"));
    const r = e.length,
      a = Math.max(1, Math.floor(r / 14));
    let l = "";
    for (let t = 0; t < 6; t++)
      l +=
        '<line x1="0" y1="' +
        (((n - 26) * t) / 5).toFixed(0) +
        '" x2="' +
        s +
        '" y2="' +
        (((n - 26) * t) / 5).toFixed(0) +
        '" stroke="var(--fg-xeff1f4)" stroke-width="1"></line>';
    t.forEach((t) => {
      const a = this._kPath(t.vals, s, n - 26, i);
      ((l +=
        '<path d="' +
        a.line +
        '" fill="none" stroke="' +
        t.color +
        '" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" opacity="0.95" vector-effect="non-scaling-stroke"></path>'),
        t.vals.forEach((a, d) => {
          const p = n - 26 - (a / i) * (n - 26);
          l +=
            '<circle cx="' +
            (1 === r ? s / 2 : s - (d / (r - 1)) * s).toFixed(1) +
            '" cy="' +
            p.toFixed(1) +
            '" r="2.2" fill="' +
            t.color +
            '"><title>' +
            t.name +
            " · " +
            e[d] +
            " — " +
            a +
            o +
            "</title></circle>";
        }));
    });
    for (let t = 0; t < 6; t++)
      l +=
        '<text x="' +
        (s - 3) +
        '" y="' +
        (((n - 26) * t) / 5 + 4).toFixed(0) +
        '" font-size="9" fill="var(--fg-x94a3b8)" text-anchor="end">' +
        Math.round(i - (i * t) / 5) +
        "</text>";
    for (let t = 0; t < r; t += a)
      l +=
        '<text x="' +
        (1 === r ? s / 2 : s - (t / (r - 1)) * s).toFixed(0) +
        '" y="' +
        (n - 8) +
        '" font-size="9" fill="var(--fg-x94a3b8)" text-anchor="middle">' +
        e[t] +
        "</text>";
    return '<svg viewBox="0 0 ' + s + " " + n + '" style="width:100%;height:' + n + 'px;display:block;overflow:visible">' + l + "</svg>";
  }
  _kGauge(t, e, s, n, i, o, r, a, l, d) {
    const p = ((180 - 1.8 * Math.max(0, Math.min(100, t))) * Math.PI) / 180,
      h = 100 + 66 * Math.cos(p),
      c = 87 - 66 * Math.sin(p);
    let g = "";
    n &&
      n.length &&
      (g =
        '<svg viewBox="0 0 200 40" preserveAspectRatio="none" style="position:absolute;left:0;right:0;bottom:0;height:34px;width:100%;opacity:0.5;display:block"><path d="' +
        this._kPath(n, 200, 40).area +
        '" fill="url(#kMini)"></path></svg>');
    const f = (t, e, s, n) =>
        '<div title="' +
        ("متوسط" === t
          ? "متوسط القيم اليومية للأيام المسجّلة — القيمة التمثيلية للفترة"
          : "أدنى" === t
            ? "أدنى قيمة يومية سجّلها المؤشر خلال الفترة — أسوأ يومٍ قِس عليه الخطر"
            : "أعلى قيمة يومية سجّلها المؤشر خلال الفترة — سقف ما بلغته فعلاً") +
        '" style="cursor:help;text-align:center;flex:1;min-width:0"><div style="font-size:9px;font-weight:400;color:' +
        n +
        '">' +
        t +
        '</div><div dir="ltr" style="font-size:11.5px;font-weight:700;color:' +
        n +
        ';line-height:1.25">' +
        e +
        '</div><div style="font-size:8.5px;font-weight:400;color:var(--fg-xb0b6bd);white-space:nowrap">' +
        s +
        "</div></div>",
      u = '<span style="width:1px;background:var(--bg-xeff1f4);flex-shrink:0"></span>',
      y =
        null == i
          ? ""
          : '<div style="display:flex;align-items:stretch;justify-content:space-between;gap:3px;margin-top:6px">' +
            f("أدنى", i + "٪", a || "", "#94a3b8") +
            u +
            f("متوسط", o + "٪", "الفترة", this.KGOLD_D) +
            u +
            f("أعلى", r + "٪", l || "", "#94a3b8") +
            "</div>";
    return (
      '<div style="flex:1;min-width:212px;background:var(--bg-xffffff);border:1px solid var(--bd-xe6e9ed);border-radius:16px;box-shadow:var(--shadow-card);padding:12px 13px 11px;overflow:hidden"><div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding-bottom:8px;border-bottom:1px solid var(--bd-xeff1f4)"><span style="font-size:12px;font-weight:700;color:' +
      this.KNAVY +
      ';display:inline-flex;align-items:center;gap:7px"><span style="width:7px;height:7px;border-radius:9999px;background:var(--bg-x0ca30c);box-shadow:0 0 0 3px rgba(12,163,12,.14)"></span>' +
      e +
      '</span></div><div dir="ltr" ' +
      (d ? 'title="' + d + '" ' : "") +
      'style="cursor:help;font-size:24px;font-weight:800;color:' +
      this.KGOLD_D +
      ';line-height:1;margin-top:10px">' +
      t +
      '٪</div><div style="font-size:10.5px;font-weight:400;color:var(--fg-x94a3b8);margin-top:5px;min-height:30px;line-height:1.75">' +
      s +
      '</div><div style="position:relative;margin-top:2px">' +
      g +
      '<svg viewBox="0 0 200 104" style="width:100%;height:100px;display:block;position:relative"><path d="M 172 87 A 72 72 0 0 0 28 87" fill="none" stroke="url(#kGauge)" stroke-width="13"></path><line x1="165.5" y1="87" x2="178.5" y2="87" stroke="var(--fg-xffffff)" stroke-width="2" opacity="0.75"></line><line x1="100" y1="21.5" x2="100" y2="8.5" stroke="var(--fg-xffffff)" stroke-width="2" opacity="0.75"></line><line x1="34.5" y1="87" x2="21.5" y2="87" stroke="var(--fg-xffffff)" stroke-width="2" opacity="0.75"></line><line x1="100" y1="87" x2="' +
      h.toFixed(1) +
      '" y2="' +
      c.toFixed(1) +
      '" stroke="var(--fg-x1f2a33)" stroke-width="2.6" stroke-linecap="round"></line><circle cx="100" cy="87" r="7.5" fill="var(--fg-x1f2a33)"></circle><circle cx="100" cy="87" r="3" fill="' +
      this.KGOLD_L +
      '"></circle></svg></div>' +
      y +
      "</div>"
    );
  }
  _kDonut(t, e, s, n) {
    ((e = e || 190), (s = s || 104), (n = n || ""));
    const i = t.reduce((t, e) => t + e.v, 0) || 1,
      o = e / 2,
      r = e / 2,
      a = e / 2 - 10,
      l = s / 2,
      d = (a + l) / 2,
      p = a - l;
    let h = -90,
      c = "";
    return (
      t.forEach((t) => {
        const e = (t.v / i) * 360;
        if (e <= 0) return;
        let s = h + 1.2,
          a = h + e - 1.2;
        a <= s && (a = s + 0.4);
        const l = (t, e) => [o + t * Math.cos((e * Math.PI) / 180), r + t * Math.sin((e * Math.PI) / 180)],
          g = l(d, s),
          f = l(d, a),
          u = a - s > 180 ? 1 : 0;
        ((c +=
          '<path d="M' +
          g[0].toFixed(2) +
          "," +
          g[1].toFixed(2) +
          " A" +
          d.toFixed(2) +
          "," +
          d.toFixed(2) +
          " 0 " +
          u +
          " 1 " +
          f[0].toFixed(2) +
          "," +
          f[1].toFixed(2) +
          '" fill="none" stroke="' +
          t.color +
          '" stroke-width="' +
          p.toFixed(1) +
          '" stroke-linecap="round"><title>' +
          (t.tip || t.name + " — " + t.v + " " + n + " (" + Math.round((t.v / i) * 100) + "٪)") +
          "</title></path>"),
          (h += e));
      }),
      '<svg viewBox="0 0 ' +
        e +
        " " +
        e +
        '" style="width:' +
        e +
        "px;height:" +
        e +
        'px;display:block;filter:drop-shadow(0 3px 6px rgba(15,23,42,.14))"><circle cx="' +
        o +
        '" cy="' +
        r +
        '" r="' +
        d.toFixed(1) +
        '" fill="none" stroke="var(--fg-xf1f3f5)" stroke-width="' +
        p.toFixed(1) +
        '"></circle>' +
        c +
        "</svg>"
    );
  }
  _kCols(t, e, s, n, i) {
    ((e = e || 1e3), (s = s || 210), (n = n || 100));
    const o = t.length,
      r = (e - 26 * (o + 1)) / o;
    let a = "";
    for (let t = 0; t < 5; t++)
      a +=
        '<line x1="0" y1="' +
        (((s - 32) * t) / 4).toFixed(0) +
        '" x2="' +
        e +
        '" y2="' +
        (((s - 32) * t) / 4).toFixed(0) +
        '" stroke="var(--fg-xf5f6f8)" stroke-width="1"></line>';
    if (
      (t.forEach((t, i) => {
        const o = e - 26 - (i + 1) * r - 26 * i,
          l = (t.v / n) * (s - 52),
          d = s - 32 - l;
        a +=
          '<rect x="' +
          o.toFixed(1) +
          '" y="' +
          d.toFixed(1) +
          '" width="' +
          r.toFixed(1) +
          '" height="' +
          l.toFixed(1) +
          '" rx="7" fill="url(#kCol)"><title>' +
          (t.tip || t.name + " — " + t.v + "٪") +
          '</title></rect><text x="' +
          (o + r / 2).toFixed(1) +
          '" y="' +
          (d - 7).toFixed(0) +
          '" font-size="13" font-weight="700" fill="' +
          this.KGOLD_D +
          '" text-anchor="middle">' +
          t.v +
          '٪</text><text x="' +
          (o + r / 2).toFixed(1) +
          '" y="' +
          (s - 12) +
          '" font-size="11" font-weight="400" fill="var(--fg-x53565a)" text-anchor="middle">' +
          t.name +
          "</text>";
      }),
      i)
    ) {
      const t = s - 32 - (i / n) * (s - 52);
      a +=
        '<line x1="0" y1="' +
        t.toFixed(1) +
        '" x2="' +
        e +
        '" y2="' +
        t.toFixed(1) +
        '" stroke="var(--fg-xb91c1c)" stroke-width="1.4" stroke-dasharray="6 5"></line><text x="' +
        (e - 4) +
        '" y="' +
        (t - 7).toFixed(0) +
        '" font-size="9.5" font-weight="600" fill="var(--fg-xb91c1c)" text-anchor="end">حدّ الازدحام ' +
        i +
        "٪</text>";
    }
    return '<svg viewBox="0 0 ' + e + " " + s + '" style="width:100%;height:' + s + 'px;display:block">' + a + "</svg>";
  }
  _kHeat(t, e, s, n, i) {
    n = n || 1e3;
    const o = t.length,
      r = (n - 60) / o,
      a = 26 * e.length + 34;
    let l = "";
    e.forEach((e, o) => {
      ((l +=
        '<text x="' +
        (n - 2) +
        '" y="' +
        (26 * o + 13 + 4).toFixed(0) +
        '" font-size="10" font-weight="600" fill="var(--fg-x53565a)" text-anchor="end">' +
        e[1] +
        "</text>"),
        t.forEach((t, a) => {
          const d = s(t, e[0]),
            p = n - 60 - (a + 1) * r,
            h = null == d ? null : Math.max(0, Math.min(1, d / 100)),
            c = null == h ? "#F7F8FA" : "rgba(138,111,53," + (0.1 + 0.85 * h).toFixed(2) + ")";
          l +=
            '<rect x="' +
            p.toFixed(1) +
            '" y="' +
            (26 * o + 3) +
            '" width="' +
            (r - 2.5).toFixed(1) +
            '" height="20" rx="4" fill="' +
            c +
            '" stroke="' +
            (null == h ? "#EFF1F4" : "rgba(138,111,53,.18)") +
            '" stroke-width="1"><title>' +
            (i ? i(t, e, d) : t + " · " + e[1] + " — " + (null == d ? "لا قراءة" : d + "٪")) +
            "</title></rect>";
        }));
    });
    const d = Math.max(1, Math.floor(o / 15));
    for (let s = 0; s < o; s += d)
      l +=
        '<text x="' +
        (n - 60 - (s + 1) * r + r / 2).toFixed(1) +
        '" y="' +
        (26 * e.length + 16) +
        '" font-size="9" fill="var(--fg-x94a3b8)" text-anchor="middle">' +
        t[s] +
        "</text>";
    return '<svg viewBox="0 0 ' + n + " " + a + '" style="width:100%;height:' + a + 'px;display:block">' + l + "</svg>";
  }
  _kBubble(t, e, s, n, i) {
    ((e = e || 1e3), (s = s || 300), (n = n || 460), (i = i || 140));
    let o = "";
    for (let t = 0; t < 5; t++)
      o +=
        '<line x1="0" y1="' +
        (((s - 30) * t) / 4).toFixed(0) +
        '" x2="' +
        (e - 40) +
        '" y2="' +
        (((s - 30) * t) / 4).toFixed(0) +
        '" stroke="var(--fg-xf1f3f5)" stroke-width="1"></line>';
    for (let t = 0; t < 6; t++)
      o +=
        '<line x1="' +
        (((e - 40) * t) / 5).toFixed(0) +
        '" y1="0" x2="' +
        (((e - 40) * t) / 5).toFixed(0) +
        '" y2="' +
        (s - 30) +
        '" stroke="var(--fg-xf7f8fa)" stroke-width="1"></line>';
    const r = s - 30 - (100 / i) * (s - 30);
    o +=
      '<line x1="0" y1="' +
      r.toFixed(1) +
      '" x2="' +
      (e - 40) +
      '" y2="' +
      r.toFixed(1) +
      '" stroke="var(--fg-xb91c1c)" stroke-width="1.3" stroke-dasharray="6 5"></line><text x="6" y="' +
      (r - 6).toFixed(0) +
      '" font-size="9.5" font-weight="600" fill="var(--fg-xb91c1c)">١٠٠٪ — تجاوز السعة</text>';
    const a = Math.max.apply(null, t.map((t) => t.r).concat([1]));
    t.forEach((t) => {
      const r = e - 40 - (Math.min(t.x, n) / n) * (e - 40),
        l = s - 30 - (Math.min(t.y, i) / i) * (s - 30),
        d = 5 + (t.r / a) * 13;
      o +=
        '<circle cx="' +
        r.toFixed(1) +
        '" cy="' +
        l.toFixed(1) +
        '" r="' +
        d.toFixed(1) +
        '" fill="' +
        t.color +
        '" fill-opacity="0.55" stroke="' +
        t.color +
        '" stroke-width="1.4"><title>' +
        t.name +
        " — سعة " +
        t.x +
        " · ذروة " +
        t.y +
        "٪ · " +
        t.r +
        " قراءة</title></circle>";
    });
    for (let t = 0; t < 5; t++)
      o +=
        '<text x="' +
        (e - 2) +
        '" y="' +
        (((s - 30) * t) / 4 + 4).toFixed(0) +
        '" font-size="9" fill="var(--fg-x94a3b8)" text-anchor="end">' +
        Math.round(i - (i * t) / 4) +
        "٪</text>";
    for (let t = 0; t < 6; t++)
      o +=
        '<text x="' +
        (e - 40 - ((e - 40) * t) / 5).toFixed(0) +
        '" y="' +
        (s - 8) +
        '" font-size="9" fill="var(--fg-x94a3b8)" text-anchor="middle">' +
        Math.round((n * t) / 5) +
        "</text>";
    return '<svg viewBox="0 0 ' + e + " " + s + '" style="width:100%;height:' + s + 'px;display:block;overflow:visible">' + o + "</svg>";
  }
  _kSpark(t, e, s, n) {
    if (!t || !t.length) return "";
    ((e = e || 104), (s = s || 26), (n = n || this.KGOLD_D));
    const i = this._kPath(t, e, s, Math.max.apply(null, t.concat([1])));
    return (
      '<svg viewBox="0 0 ' +
      e +
      " " +
      s +
      '" style="width:' +
      e +
      "px;height:" +
      s +
      'px;display:block"><path d="' +
      i.area +
      '" fill="url(#kMini)"></path><path d="' +
      i.line +
      '" fill="none" stroke="' +
      n +
      '" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"></path></svg>'
    );
  }
  _kStack(t, e, s) {
    ((e = e || 1e3), (s = s || 30));
    const n = t.reduce((t, e) => t + e.v, 0) || 1;
    let i = e,
      o = "";
    return (
      t.forEach((t) => {
        const r = (t.v / n) * e;
        ((i -= r),
          (o +=
            '<rect x="' +
            i.toFixed(1) +
            '" y="0" width="' +
            Math.max(0, r - 1.5).toFixed(1) +
            '" height="' +
            s +
            '" rx="5" fill="' +
            t.color +
            '"><title>' +
            (t.tip || t.name + " — " + t.v + " (" + Math.round((t.v / n) * 100) + "٪)") +
            "</title></rect>"));
      }),
      '<svg viewBox="0 0 ' + e + " " + s + '" style="width:100%;height:' + s + 'px;display:block">' + o + "</svg>"
    );
  }
  _kData(t, e) {
    const s = [
        ["fajr", "الفجر"],
        ["dhuhr", "الظهر"],
        ["asr", "العصر"],
        ["maghrib", "المغرب"],
        ["isha", "العشاء"],
      ],
      n = (t, e) => (e ? Math.round((t / e) * 1e3) / 10 : 0),
      i = {
        PR: s,
        dn: e,
        days: t.length,
        ap: 0,
        n: 0,
        cap: 0,
        reads: 0,
        slots: 0,
        zoneObs: 0,
        gateN: 0,
        pathN: 0,
        markN: 0,
        staffObs: 0,
        dayN: [],
        dayOcc: [],
        dayCov: [],
        dayStf: [],
        prCnt: {},
        prN: {},
        prCap: {},
        prSlots: {},
        prSer: {},
        cov: {},
        yard: {},
        uniq: {},
        TY: [],
        CA: [],
        emps: {},
      };
    s.forEach((t) => {
      ((i.prCnt[t[0]] = 0), (i.prN[t[0]] = 0), (i.prCap[t[0]] = 0), (i.prSlots[t[0]] = 0), (i.prSer[t[0]] = []));
    });
    const o = {};
    (t.forEach((t) => {
      t.rec.ap && i.ap++;
      let e = 0,
        r = 0,
        a = 0,
        l = 0,
        d = 0;
      const p = {};
      (s.forEach((t) => (p[t[0]] = [0, 0, 0, 0])),
        (t.rec.d || []).forEach((h) => {
          if (!h) return;
          const c = Array.isArray(h.zones) ? h.zones : [];
          ((i.gateN += Array.isArray(h.gates) ? h.gates.length : 0),
            (i.pathN += Array.isArray(h.paths) ? h.paths.length : 0),
            (i.markN += Array.isArray(h.marks) ? h.marks.length : 0),
            c.forEach((h) => {
              (i.zoneObs++, l++, h.emp && h.emp.length && (i.staffObs++, d++, (h.emp || []).forEach((t) => (i.emps[t] = 1))));
              const c = String(null == h.code ? "" : h.code) || "#" + i.zoneObs,
                g = String(h.ztype || "").trim() || "بلا نوع",
                f = String(h.zcat || "").trim() || "بلا فئة";
              (i.TY.indexOf(g) < 0 && i.TY.push(g),
                i.CA.indexOf(f) < 0 && i.CA.push(f),
                (i.uniq[c] = {
                  code: c,
                  ztype: g,
                  zcat: f,
                  off: !!h.off,
                  cap: +h.cap || 0,
                  yard: String(h.yard || "").trim() || "بلا ساحة",
                  region: h.region || "",
                  level: h.level || "",
                }));
              const u = i.uniq[c].yard;
              (i.yard[u] || (i.yard[u] = { n: 0, cap: 0, z: {} }), (i.yard[u].z[c] = 1));
              let y = 0,
                m = 0;
              (s.forEach((t) => {
                const s = t[0];
                (i.slots++, i.prSlots[s]++, p[s][3]++);
                const n = ((t, e) => {
                  if (!t) return null;
                  const s = t.pc && "object" == typeof t.pc ? t.pc : null;
                  if (s) {
                    const t = s[e];
                    return null == t || "" === t ? null : t;
                  }
                  return "fajr" === e && null != t.count && "" !== t.count ? t.count : null;
                })(h, s);
                if (null == n) return;
                (i.reads++, i.prCnt[s]++, a++, p[s][2]++);
                const o = ((t) => {
                  if (null == t) return null;
                  if ("object" == typeof t) {
                    const e = +t.cap || 0,
                      s = null == t.n || "" === t.n ? null : +t.n;
                    return { n: s, cap: e, p: e > 0 && null != s ? (s / e) * 100 : null == t.p ? null : +t.p };
                  }
                  const e = +t;
                  return { n: null, cap: 0, p: isFinite(e) ? Math.max(0, e) : null };
                })(n);
                o &&
                  null != o.n &&
                  o.cap > 0 &&
                  ((i.n += o.n),
                  (i.cap += o.cap),
                  (e += o.n),
                  (r += o.cap),
                  (y += o.n),
                  (m += o.cap),
                  (i.prN[s] += o.n),
                  (i.prCap[s] += o.cap),
                  (p[s][0] += o.n),
                  (p[s][1] += o.cap),
                  (i.yard[u].n += o.n),
                  (i.yard[u].cap += o.cap));
              }),
                o[c] || (o[c] = {}),
                m > 0 && (o[c][t.d] = n(y, m)));
            }));
        }),
        i.dayN.push(e),
        i.dayOcc.push(n(e, r)),
        i.dayCov.push(n(a, 5 * l)),
        i.dayStf.push(n(d, l)),
        s.forEach((e) => {
          (i.prSer[e[0]].push(n(p[e[0]][0], p[e[0]][1])),
            (i.cov[t.d + "|" + e[0]] = p[e[0]][3] ? Math.round((p[e[0]][2] / p[e[0]][3]) * 100) : null));
        }));
    }),
      (i.occ = n(i.n, i.cap)),
      (i.covT = n(i.reads, i.slots)),
      (i.stf = n(i.staffObs, i.zoneObs)),
      (i.empUniq = Object.keys(i.emps).length),
      (i.zones = Object.keys(i.uniq).map((t) => {
        const s = i.uniq[t],
          n = o[t] || {},
          r = Object.keys(n).map((t) => n[t]);
        return Object.assign({}, s, {
          ser: e.map((t) => n[t] || 0),
          reads: r.length,
          peak: r.length ? Math.max.apply(null, r) : 0,
          occ: r.length ? Math.round((r.reduce((t, e) => t + e, 0) / r.length) * 10) / 10 : 0,
        });
      })),
      (i.Z = i.zones.length),
      (i.ZON = i.zones.filter((t) => !t.off).length),
      (i.ZOFF = i.Z - i.ZON),
      (i.CB = []),
      (i.combo = {}),
      (i.ty = {}),
      (i.ca = {}),
      (i.reg = {}),
      (i.RG = []),
      (i.yd = {}),
      (i.YD = []));
    const r = (t, e, s) => {
      (t[e] || (t[e] = { tot: 0, on: 0, off: 0 }), t[e].tot++, s.off ? t[e].off++ : t[e].on++);
    };
    i.zones.forEach((t) => {
      const e = t.ztype + " · " + t.zcat;
      i.CB.indexOf(e) < 0 && i.CB.push(e);
      const s = String(t.region || "").trim() || "غير محدّد";
      i.RG.indexOf(s) < 0 && i.RG.push(s);
      const n = String(t.yard || "").trim() || "بلا ساحة";
      (i.YD.indexOf(n) < 0 && i.YD.push(n), r(i.combo, e, t), r(i.ty, t.ztype, t), r(i.ca, t.zcat, t), r(i.reg, s, t), r(i.yd, n, t));
    });
    const a = (t) => {
      Object.keys(t).forEach((e) => {
        const s = t[e];
        ((s.onP = s.tot ? Math.round((s.on / s.tot) * 1e3) / 10 : 0), (s.offP = s.tot ? Math.round((s.off / s.tot) * 1e3) / 10 : 0));
      });
    };
    return (
      a(i.combo),
      a(i.ty),
      a(i.ca),
      a(i.reg),
      a(i.yd),
      i.RG.sort((t, e) => i.reg[e].tot - i.reg[t].tot),
      i.YD.sort((t, e) => i.yd[e].tot - i.yd[t].tot),
      i.CB.sort(
        (t, e) =>
          i.TY.indexOf(t.split(" · ")[0]) - i.TY.indexOf(e.split(" · ")[0]) ||
          i.CA.indexOf(t.split(" · ")[1]) - i.CA.indexOf(e.split(" · ")[1]),
      ),
      (i.yardL = Object.keys(i.yard).map((t) => ({
        name: t,
        n: i.yard[t].n,
        cap: i.yard[t].cap,
        occ: n(i.yard[t].n, i.yard[t].cap),
        z: Object.keys(i.yard[t].z).length,
      }))),
      (i.prOcc = {}),
      s.forEach((t) => (i.prOcc[t[0]] = n(i.prN[t[0]], i.prCap[t[0]]))),
      i
    );
  }
  _kRep() {
    try {
      const t = this._opRead("bassam_dreport_v1");
      return t && "object" == typeof t ? t : {};
    } catch (t) {
      return {};
    }
  }
  _kStaffAll() {
    try {
      const t = this._opRead("bassam_staffing_v3"),
        e = t && "object" == typeof t ? t : {};
      return e;
    } catch (t) {
      return {};
    }
  }
  _kShiftOpts() {
    try {
      const t = this._opRead("bassam_shift_options_v1");
      return Array.isArray(t) ? t : [];
    } catch (t) {
      return [];
    }
  }
  _kNeedTot(t) {
    try {
      if (KIVO.BassamNeed && KIVO.BassamNeed.tot) return +KIVO.BassamNeed.tot(t, this._kShiftOpts()) || 0;
    } catch (t) {}
    const e = +((t && t.needN) || 0) || 0,
      s = this._kShiftOpts().length || 1;
    let n = 0,
      i = !1;
    try {
      const e = (t && t.needS) || null;
      e &&
        "object" == typeof e &&
        Object.keys(e).forEach((t) => {
          const s = +e[t];
          isFinite(s) && ((n += s), (i = !0));
        });
    } catch (t) {}
    return i ? n : e * s;
  }
  _kDataDy(t, e) {
    const s = this._kRep(),
      n = this._kStaffAll(),
      i = this._kShiftOpts(),
      o = (t, e) => (e ? Math.round((t / e) * 1e3) / 10 : 0),
      r = [
        ["zones", "المصليات"],
        ["gates", "الأبواب"],
        ["marks", "المعالم"],
      ],
      a = {
        dn: e,
        days: t.length,
        TYPES: r,
        repDays: 0,
        shN: 0,
        shAp: 0,
        tot: 0,
        pr: 0,
        ab: 0,
        pm: 0,
        lv: 0,
        rest: 0,
        tout: 0,
        dayTot: [],
        dayPr: [],
        dayPrP: [],
        dayAbP: [],
        dayPmP: [],
        dayLvP: [],
        dayRsP: [],
        dayCov: [],
        dayStf: [],
        sh: {},
        SH: [],
        heat: {},
        need: { zones: 0, gates: 0, marks: 0 },
        plc: { zones: 0, gates: 0, marks: 0 },
        cnt: { zones: 0, gates: 0, marks: 0 },
        stf: { zones: 0, gates: 0, marks: 0 },
        elN: 0,
        elStf: 0,
        gTot: 0,
        gClosed: 0,
        gWhy: {},
        gAt: [],
      },
      l = (t) => (
        a.sh[t] || ((a.sh[t] = { name: t, tot: 0, pr: 0, ab: 0, pm: 0, lv: 0, rest: 0, tout: 0, ser: [] }), a.SH.push(t)),
        a.sh[t]
      );
    i.forEach((t) => {
      t && t.name && l(t.name);
    });
    const d = {},
      p = (t, e) => {
        const s = t + "-" + e;
        if (d[s]) return d[s];
        const n = { zones: {}, gates: {}, marks: {} };
        try {
          const t = ((this._opRead("bassam_plan_v1") || {} || {}).months || {})[
            s
          ];
          ((t && (Array.isArray(t) ? t : t.d)) || []).forEach((t) => {
            ((t.gates || []).forEach((t) => {
              const e = String(null == t.num ? "" : t.num).trim() || "L:" + String(t.label || "");
              n.gates[e] = this._kNeedTot(t);
            }),
              (t.zones || []).forEach((t) => {
                const e = String(t.code || t.name || "");
                e && (n.zones[e] = this._kNeedTot(t));
              }),
              (t.marks || []).forEach((t) => {
                const e = String(t.label || "") + "|" + String(t.kind || "");
                n.marks[e] = this._kNeedTot(t);
              }));
          });
        } catch (t) {}
        return ((d[s] = n), n);
      },
      h = (t, e, s, n) => {
        if (null != e.needN || (e.needS && "object" == typeof e.needS && Object.keys(e.needS).length > 0)) return this._kNeedTot(e);
        const i = p(s, n),
          o =
            "gates" === t
              ? String(null == e.num ? "" : e.num).trim() || "L:" + String(e.label || "")
              : "zones" === t
                ? String(e.code || e.name || "")
                : String(e.label || "") + "|" + String(e.kind || "");
        return i[t][o] || 0;
      };
    return (
      t.forEach((t) => {
        const e = s[t.y + "-" + t.m + "-" + t.d] || null;
        let i = "";
        try {
          i = this.hGreg(t.y, t.m, t.d).toLocaleDateString("ar-SA-u-nu-latn", { weekday: "long" });
        } catch (t) {}
        const d = n[t.y + "-" + t.m] || {};
        let p = 0,
          c = 0,
          g = 0,
          f = 0,
          u = 0,
          y = 0;
        if (e && e.created) {
          a.repDays++;
          const s = e.shifts || {};
          Object.keys(s).forEach((e) => {
            const n = s[e];
            if (!n || !n.pulled) return;
            (a.shN++, n.ap && a.shAp++);
            const r = l(e),
              h = Array.isArray(n.roster) ? n.roster : [];
            let m = 0,
              x = 0,
              b = 0,
              k = 0,
              v = 0;
            h.forEach((t) => {
              const e = t.st || "pr";
              if ("ab" === e) return void x++;
              if ("pm" === e) return void b++;
              if ("lv" === e) return void k++;
              const s = (n.rest && n.rest[t.ekey]) || null;
              var o;
              ((o = Array.isArray(s) ? s : (d[t.ekey] && d[t.ekey].rest) || []),
                i && (Array.isArray(o) ? o : []).some((t) => t === i || "ال" + t === i || t === "ال" + i) ? v++ : m++);
            });
            const w = Object.keys(n.tout || {}).length;
            ((r.tot += h.length),
              (r.pr += m),
              (r.ab += x),
              (r.pm += b),
              (r.lv += k),
              (r.rest += v),
              (r.tout += w),
              r.ser.push(o(m, h.length)),
              (a.heat[t.d + "|" + e] = h.length ? o(m, h.length) : null),
              (p += h.length),
              (c += m),
              (g += x),
              (f += b),
              (u += k),
              (y += v),
              (a.tout += w));
          });
        }
        ((a.tot += p),
          (a.pr += c),
          (a.ab += g),
          (a.pm += f),
          (a.lv += u),
          (a.rest += y),
          a.dayTot.push(p),
          a.dayPr.push(c),
          a.dayPrP.push(o(c, p)),
          a.dayAbP.push(o(g, p)),
          a.dayPmP.push(o(f, p)),
          a.dayLvP.push(o(u, p)),
          a.dayRsP.push(o(y, p)));
        let m = 0,
          x = 0,
          b = 0,
          k = 0;
        ((t.rec && Array.isArray(t.rec.d) ? t.rec.d : []).forEach((e) => {
          e &&
            r.forEach((s) => {
              (Array.isArray(e[s[0]]) ? e[s[0]] : []).forEach((e) => {
                if (!e) return;
                (a.cnt[s[0]]++, b++, a.elN++);
                const n = h(s[0], e, t.y, t.m),
                  i = Array.isArray(e.emp) ? e.emp.length : 0;
                if (
                  ((a.need[s[0]] += n),
                  (a.plc[s[0]] += i),
                  (m += n),
                  (x += i),
                  i > 0 && (a.stf[s[0]]++, a.elStf++, k++),
                  "gates" === s[0] && (a.gTot++, e.closed))
                ) {
                  a.gClosed++;
                  const t = String(e.cWhy || "").trim() || "بلا سبب مسجّل";
                  ((a.gWhy[t] = (a.gWhy[t] || 0) + 1), e.cAt && a.gAt.push(String(e.cAt)));
                }
              });
            });
        }),
          a.dayCov.push(o(x, m)),
          a.dayStf.push(o(k, b)));
      }),
      (a.SH = a.SH.filter((t) => a.sh[t].tot > 0)),
      (a.prP = o(a.pr, a.tot)),
      (a.abP = o(a.ab, a.tot)),
      (a.pmP = o(a.pm, a.tot)),
      (a.lvP = o(a.lv, a.tot)),
      (a.rsP = o(a.rest, a.tot)),
      (a.apP = o(a.shAp, a.shN)),
      (a.needT = a.need.zones + a.need.gates + a.need.marks),
      (a.plcT = a.plc.zones + a.plc.gates + a.plc.marks),
      (a.covP = o(a.plcT, a.needT)),
      (a.stfP = o(a.elStf, a.elN)),
      (a.gapT = Math.max(0, a.needT - a.plcT)),
      (a.L = {
        day: 0,
        need: { zones: 0, gates: 0, marks: 0 },
        plc: { zones: 0, gates: 0, marks: 0 },
        cnt: { zones: 0, gates: 0, marks: 0 },
        elN: 0,
        elStf: 0,
        needT: 0,
        plcT: 0,
        covP: 0,
        stfP: 0,
        gapT: 0,
        gTot: 0,
        gClosed: 0,
      }),
      (() => {
        let e = null;
        if (
          (t.forEach((t) => {
            if (t.rec && Array.isArray(t.rec.d) && t.rec.d.length) {
              const s = 1e4 * t.y + 100 * t.m + t.d;
              (!e || s >= e.k) && (e = { k: s, r: t });
            }
          }),
          !e)
        )
          return;
        const s = e.r;
        ((a.L.day = s.d),
          s.rec.d.forEach((t) => {
            t &&
              r.forEach((e) => {
                (Array.isArray(t[e[0]]) ? t[e[0]] : []).forEach((t) => {
                  if (!t) return;
                  (a.L.cnt[e[0]]++, a.L.elN++);
                  const n = h(e[0], t, s.y, s.m),
                    i = Array.isArray(t.emp) ? t.emp.length : 0;
                  ((a.L.need[e[0]] += n),
                    (a.L.plc[e[0]] += i),
                    i > 0 && a.L.elStf++,
                    "gates" === e[0] && (a.L.gTot++, t.closed && a.L.gClosed++));
                  try {
                    const s = KIVO.BassamField,
                      n = "gates" === e[0] && KIVO.BassamLeaf && KIVO.BassamLeaf.isParent(t);
                    !s || n || ("gates" !== e[0] && !t.fAt) || (t.fAt && s.stale(t) && (a.L.gStale = (a.L.gStale || 0) + 1));
                  } catch (t) {}
                });
              });
          }),
          (a.L.needT = a.L.need.zones + a.L.need.gates + a.L.need.marks),
          (a.L.plcT = a.L.plc.zones + a.L.plc.gates + a.L.plc.marks),
          (a.L.covP = o(a.L.plcT, a.L.needT)),
          (a.L.stfP = o(a.L.elStf, a.L.elN)),
          (a.L.gapT = Math.max(0, a.L.needT - a.L.plcT)));
      })(),
      (a.WHY = Object.keys(a.gWhy).sort((t, e) => a.gWhy[e] - a.gWhy[t])),
      a
    );
  }
  _kPaneDy(t, e) {
    this.KGOLD;
    const s = this.KGOLD_D,
      n = this.KNAVY,
      i = this.KLINE,
      o = (this.KSC, (t) => Math.round(t || 0).toLocaleString("en-US")),
      r = t.dn.map(String),
      a = this.bsLensOn("zones"),
      l = this.bsLensOn("gates"),
      d = this.bsLensOn("marks"),
      Rd = this._kOn("dist") && this._dsTabOn("rounds"),
      p = (t, e, s, n) =>
        '<section style="border:1px solid ' +
        i +
        ';border-radius:16px;background:var(--bg-xffffff);overflow:hidden;margin-bottom:14px"><div style="padding:13px 16px;border-bottom:1px solid ' +
        i +
        ';background:var(--bg-xfafbfc)"><div style="font-size:13px;font-weight:700;color:var(--fg-x141414)">' +
        t +
        '</div><div style="font-size:10.5px;font-weight:400;color:var(--fg-x94a3b8);margin-top:3px">' +
        e +
        '</div></div><div style="padding:15px 16px">' +
        s +
        "</div>" +
        (n
          ? '<div style="padding:10px 16px;border-top:1px solid var(--bd-xf1f1f1);background:var(--bg-xfcfcfd);font-size:10.5px;font-weight:400;color:var(--fg-x94a3b8);line-height:1.9">' +
            n +
            "</div>"
          : "") +
        "</section>",
      h = (t) =>
        '<div style="display:flex;flex-wrap:wrap;gap:14px;margin-top:11px;padding-top:11px;border-top:1px solid var(--bd-xf5f5f5)">' +
        t
          .map(
            (t) =>
              "<span " +
              (t[3] ? 'title="' + t[3] + '" ' : "") +
              'style="cursor:help;display:inline-flex;align-items:center;gap:7px;font-size:10.5px;font-weight:400;color:var(--fg-x53565a)"><i style="width:16px;height:3px;border-radius:9999px;background:' +
              t[1] +
              ';display:inline-block"></i>' +
              t[0] +
              '<b style="font-weight:700;color:' +
              s +
              '">' +
              t[2] +
              "</b></span>",
          )
          .join("") +
        "</div>",
      c = (t, e, s, i) =>
        "<span " +
        (i ? 'title="' + i + '" ' : "") +
        'style="cursor:help;display:inline-flex;align-items:center;gap:6px;background:var(--bg-a2552552550p72);border:1px solid var(--bd-a138111530p22);border-radius:11px;padding:5px 10px;font-size:10px;font-weight:400;color:var(--fg-x53565a);white-space:nowrap">' +
        t +
        '<b dir="ltr" style="font-weight:700;color:' +
        n +
        '">' +
        e +
        '</b><em style="font-style:normal;color:var(--fg-x94a3b8);font-size:9.5px">' +
        s +
        "</em></span>",
      g = [
        ["حاضر", t.pr, "#047857"],
        ["غياب", t.ab, "#b91c1c"],
        ["استئذان", t.pm, "#C9702A"],
        ["إجازة", t.lv, "#0e7490"],
        ["راحة", t.rest, "#b45309"],
        ["تحويل", t.tout, "#9c3d6b"],
      ],
      f = {
        حاضر:
          "وقفوا على رأس العمل فعلاً: " + o(t.pr) + " (" + t.prP + "٪ من المسحوبين) · صافي قوتك بعد كل الخصوم — هذا ما تُدار به المواقع.",
        غياب: "أُشّروا غائبين بلا عذر: " + o(t.ab) + " (" + t.abP + "٪) · إنذار انضباطٍ مباشر — أول أرقام المساءلة.",
        استئذان: "خرجوا بإذنٍ أثناء الوردية: " + o(t.pm) + " (" + t.pmP + "٪) · غياب جزئي نظامي يُخصم من القوة الواقفة.",
        إجازة: "إجازة مؤشَّرة في التقرير اليومي: " + o(t.lv) + " (" + t.lvP + "٪) · غياب نظامي معلوم مسبقاً — لا يُلام عليه أحد.",
        راحة: "يوم راحتهم الأسبوعية من الجدول: " + o(t.rest) + " (" + t.rsP + "٪) · غياب مخطط — إن تضخّم فراجع توزيع الراحات.",
        تحويل: "حُوّلوا لوردية أخرى ذلك اليوم: " + o(t.tout) + " · حضورهم يُحتسب في ورديتهم الجديدة لا الأصلية.",
      },
      u = t.dayPr.length ? t.dayPr.indexOf(Math.max.apply(null, t.dayPr)) : -1,
      y = t.dayPr.length ? t.dayPr.indexOf(Math.min.apply(null, t.dayPr)) : -1,
      m = t.repDays ? Math.round(t.pr / t.repDays) : 0,
      x =
        '<div style="position:relative;border-radius:20px;padding:18px;display:flex;gap:20px;align-items:stretch;overflow:hidden;flex-wrap:wrap;background:var(--brand-pattern) center/96px 96px,linear-gradient(125deg,var(--hero-1) 0%,var(--hero-2) 38%,var(--hero-3) 72%,var(--hero-4) 100%);border:1px solid var(--bd-a185151810p3);box-shadow:0 10px 30px -20px rgba(138,111,53,.55);margin-bottom:14px"><div style="flex:1.35;min-width:300px;display:flex;flex-direction:column;padding:2px 4px 0"><div style="display:flex;align-items:center;gap:7px;margin-bottom:9px;flex-wrap:wrap"><span style="display:inline-flex;align-items:center;gap:5px;border-radius:9999px;padding:4px 11px;font-size:10.5px;font-weight:700;border:1px solid var(--bd-a138111530p4);color:' +
        s +
        ';background:var(--bg-a2552552550p55)">المؤشر القيادي</span><span style="display:inline-flex;align-items:center;gap:5px;border-radius:9999px;padding:4px 11px;font-size:10.5px;font-weight:700;border:1px solid var(--bd-a09900p28);color:var(--fg-x006300);background:var(--bg-a12163120p09)"><span style="width:6px;height:6px;border-radius:9999px;background:var(--bg-x006300)"></span>' +
        (Rd ? "محسوب من التقرير والجولة" : "محسوب من التقرير اليومي") +
        '</span></div><div style="font-size:12.5px;font-weight:600;color:' +
        s +
        ';opacity:.9">الحضور الفعلي · ' +
        e +
        '</div><div dir="ltr" title="الحضور الفعلي = من أُشّر حاضراً في التقارير المسحوبة: ' +
        o(t.pr) +
        " من " +
        KIVO.BassamCount(o(t.tot), ["مسحوب واحد", "مسحوبَين", "مسحوبَين", "مسحوبين", "مسحوباً", "مسحوب"], "g") +
        " (" +
        t.prP +
        '٪) بعد استبعاد الغياب والاستئذان والإجازة والراحة · هذه قوتك الملموسة على الأرض — لا المخططة على الورق." style="cursor:help;font-size:50px;font-weight:800;color:' +
        s +
        ';line-height:1.02;letter-spacing:-1px;margin:6px 0 4px;text-shadow:0 2px 0 rgba(255,255,255,.5)">' +
        o(t.pr) +
        '</div><div title="المسحوبون = مجموع أسطر الروسترات في كل تقرير وردية مسحوب (' +
        o(t.tot) +
        ") عبر " +
        KIVO.BassamCount(t.shN, "تقرير", "g") +
        " و" +
        KIVO.BassamCount(t.repDays, "يوم", "g") +
        ' · القاعدة التي تُنسب إليها كل الحالات والنسب." style="cursor:help;font-size:12.5px;font-weight:400;color:var(--fg-x6f5a2e);opacity:.85">من ' +
        KIVO.BassamCount(o(t.tot), ["مسحوب واحد", "مسحوبَين", "مسحوبَين", "مسحوبين", "مسحوباً", "مسحوب"], "g") +
        " في " +
        KIVO.BassamCount(t.shN, "تقرير وردية", "g") +
        " عبر " +
        KIVO.BassamCount(t.repDays, "يوم|مسجّل", "g") +
        '</div><div style="margin-top:auto;padding-top:12px">' +
        this._kArea(t.dayPr, r, 1e3, 150, s, "url(#kHero)", 0, " حاضراً") +
        '</div><div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:10px">' +
        c(
          "أعلى يوم",
          o(u < 0 ? 0 : t.dayPr[u]),
          (u < 0 ? "—" : t.dn[u]) + " ",
          "أعلى حضورٍ فعلي في يومٍ واحد: " +
            o(u < 0 ? 0 : t.dayPr[u]) +
            " (يوم " +
            (u < 0 ? "—" : t.dn[u]) +
            ") · ذروة قوتك الملموسة — قِس بها بقية الأيام.",
        ) +
        c(
          "أدنى يوم",
          o(y < 0 ? 0 : t.dayPr[y]),
          (y < 0 ? "—" : t.dn[y]) + " ",
          "أدنى حضورٍ فعلي: " +
            o(y < 0 ? 0 : t.dayPr[y]) +
            " (يوم " +
            (y < 0 ? "—" : t.dn[y]) +
            ") · قاع الفترة — ابحث عن سببه: راحات متكدسة أم سحبٌ لم يكتمل؟",
        ) +
        c(
          "متوسط يومي",
          o(m),
          "لكل يوم مسجّل",
          "مجموع الحاضرين ÷ الأيام المسجّلة = " +
            o(t.pr) +
            " ÷ " +
            t.repDays +
            " = " +
            o(m) +
            " · القيمة التمثيلية ليومٍ اعتيادي — قارن بها أي يوم.",
        ) +
        c(
          "أيام مسجّلة",
          o(t.repDays),
          "من " + KIVO.BassamCount(o(t.days), "يوم", "g") + " في الفترة",
          "أيام أُنشئ فيها تقرير: " + t.repDays + " من " + t.days + " · اليوم غير المسجّل يقع صفراً في الرسوم — فجوة تسجيلٍ لا فجوة حضور.",
        ) +
        '</div></div><div style="flex:1;min-width:300px;display:flex;flex-direction:column;justify-content:center;gap:12px"><div style="background:var(--bg-a2552552550p82);border:1px solid var(--bd-a138111530p16);border-radius:16px;padding:14px 15px"><div style="font-size:11.5px;font-weight:600;color:' +
        n +
        ';margin-bottom:9px">توزيع حالات المسحوبين</div>' +
        this._kStack(g.map((t) => ({ name: t[0], v: Math.max(0, t[1]), color: t[2], tip: f[t[0]] }))) +
        h(g.map((t) => [t[0], t[2], o(t[1]), f[t[0]]])) +
        '</div><div style="background:var(--bg-a2552552550p82);border:1px solid var(--bd-a138111530p16);border-radius:16px;padding:14px 15px"><div style="font-size:11.5px;font-weight:600;color:' +
        n +
        ';margin-bottom:6px">نسبة الحضور لكل وردية</div>' +
        (t.SH.length
          ? this._kCols(
              t.SH.map((e) => ({
                name: e.replace("الوردية ", ""),
                v: t.sh[e].tot ? Math.round((t.sh[e].pr / t.sh[e].tot) * 1e3) / 10 : 0,
                tip:
                  "«" +
                  e +
                  "»: حاضروها " +
                  o(t.sh[e].pr) +
                  " من " +
                  KIVO.BassamCount(o(t.sh[e].tot), ["مسحوب واحد", "مسحوبَين", "مسحوبَين", "مسحوبين", "مسحوباً", "مسحوب"], "g") +
                  " = " +
                  (t.sh[e].tot ? Math.round((t.sh[e].pr / t.sh[e].tot) * 1e3) / 10 : 0) +
                  "٪ عبر الفترة · قارن الورديات لتعرف أين ينخفض الالتزام.",
              })),
              600,
              186,
              100,
              0,
            )
          : '<div style="padding:26px 0;text-align:center;font-size:11px;font-weight:400;color:var(--fg-x94a3b8)">لا تقارير ورديات مسحوبة في هذه الفترة</div>') +
        "</div></div></div>",
      b = (t) => {
        const e = t.filter((t) => t > 0);
        return e.length
          ? [
              Math.round(10 * Math.min.apply(null, e)) / 10,
              Math.round((e.reduce((t, e) => t + e, 0) / e.length) * 10) / 10,
              Math.round(10 * Math.max.apply(null, e)) / 10,
            ]
          : [0, 0, 0];
      },
      k = b(t.dayPrP),
      v = b(t.dayCov),
      w = b(t.dayStf),
      S =
        '<div style="display:flex;flex-wrap:wrap;gap:13px;margin-bottom:14px">' +
        this._kGauge(
          t.prP,
          "الحضور الفعلي",
          "الحاضرون ÷ المسحوبين — بعد خصم الغياب والاستئذان والإجازة والراحة",
          t.dayPrP,
          k[0],
          k[1],
          k[2],
          "أدنى يوم",
          "أعلى يوم",
          "الحاضرون ÷ المسحوبون = " +
            o(t.pr) +
            " ÷ " +
            o(t.tot) +
            " = " +
            t.prP +
            "٪ · صدق قوتك اليومية — والفرق عن 100 مجموع الغياب والأعذار.",
        ) +
        this._kGauge(
          t.apP,
          "اعتماد تقارير الورديات",
          KIVO.BassamCount(t.shAp, "تقرير|معتمد") + " من " + KIVO.BassamCount(t.shN, "تقرير وردية|مسحوب", "g") + "",
          t.dayPrP.map(() => 0),
          0,
          t.apP,
          100,
          "مسودّة",
          "معتمدة",
          "المعتمد ÷ المسحوب = " +
            t.shAp +
            " ÷ " +
            t.shN +
            " = " +
            t.apP +
            "٪ · الاعتماد يقفل التقرير سجلاً يُحاسَب عليه — والمسودة تُعدَّل بلا أثر.",
        ) +
        (Rd
          ? this._kGauge(
              t.L.covP,
              "تغطية الاحتياج",
              "المسكَّنون ÷ الاحتياج في آخر يومٍ مسجّل بجولة (اليوم " + (t.L.day || "—") + ")",
              t.dayCov,
              v[0],
              v[1],
              v[2],
              "أدنى يوم",
              "أعلى يوم",
              "آخر جولة (اليوم " +
                (t.L.day || "—") +
                "): المسكَّنون ÷ الاحتياج = " +
                o(t.L.plcT) +
                " ÷ " +
                o(t.L.needT) +
                " = " +
                t.L.covP +
                "٪ · حال سدّ الميدان الآن — والذيل أدناه مدى أيام الفترة كلها.",
            ) +
            this._kGauge(
              t.L.stfP,
              "اكتمال التسكين",
              "العناصر التي عليها موظفٌ فأكثر ÷ عناصر آخر جولة (اليوم " + (t.L.day || "—") + ")",
              t.dayStf,
              w[0],
              w[1],
              w[2],
              "أدنى يوم",
              "أعلى يوم",
              "آخر جولة (اليوم " +
                (t.L.day || "—") +
                "): عناصر عليها موظف ÷ كل العناصر = " +
                o(t.L.elStf) +
                " ÷ " +
                o(t.L.elN) +
                " = " +
                t.L.stfP +
                "٪ · انتشار التسكين لا كثافته — عنصرٌ بواحدٍ يُحسب مُغطّى هنا.",
            )
          : "") +
        "</div>",
      A = [
        ["حاضر", "#047857", t.dayPrP],
        ["غياب", "#b91c1c", t.dayAbP],
        ["استئذان", "#C9702A", t.dayPmP],
        ["إجازة", "#0e7490", t.dayLvP],
        ["راحة", "#b45309", t.dayRsP],
      ],
      z = p(
        "الحالات عبر أيام الفترة — خط لكل حالة",
        "كل خط نسبةٌ من مسحوبي ذلك اليوم، فتُقارَن الأيام بعضها ببعض مهما اختلفت أعدادها",
        this._kLines(
          A.map((t) => ({ name: t[0], color: t[1], vals: t[2] })),
          r,
          1e3,
          250,
          100,
        ) +
          h(
            A.map((e) => [
              e[0],
              e[1],
              ("حاضر" === e[0] ? t.prP : "غياب" === e[0] ? t.abP : "استئذان" === e[0] ? t.pmP : "إجازة" === e[0] ? t.lvP : t.rsP) + "٪",
              f[e[0]],
            ]),
          ),
        "المصدر: <b>تأشير التقرير اليومي</b> لكل موظف مسحوب. اليوم الذي لم يُنشأ تقريره يقع عند الصفر — وهو «لا تقرير» لا «لا حضور»، وعدّاد «أيام مسجّلة» في البطاقة أعلاه يفصل بينهما.",
      );
    let E =
      '<div style="display:flex;align-items:center;gap:9px;margin-top:12px;padding-top:11px;border-top:1px solid var(--bd-xf5f5f5);flex-wrap:wrap"><span style="font-size:10px;font-weight:400;color:var(--fg-x94a3b8)">أفتح = حضور أقل</span>';
    for (let t = 0; t < 9; t++)
      E +=
        '<i style="width:26px;height:11px;border-radius:3px;background:rgba(138,111,53,' +
        (0.1 + (t / 8) * 0.85).toFixed(2) +
        ');display:inline-block"></i>';
    E +=
      '<span style="font-size:10px;font-weight:400;color:var(--fg-x94a3b8)">أغمق = حضور كامل ١٠٠٪</span><span style="margin-right:auto"></span><span style="display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:400;color:var(--fg-x94a3b8)"><i style="width:14px;height:11px;border-radius:3px;background:var(--bg-xf7f8fa);border:1px solid var(--bd-xeff1f4);display:inline-block"></i>لا تقرير</span></div>';
    const M = t.SH.length
        ? p(
            "خريطة الحضور — يوم × وردية",
            KIVO.BassamCount(t.repDays, "يوم|مسجّل") +
              " × " +
              KIVO.BassamCount(t.SH.length, "وردية") +
              "، كل خانة نسبة الحضور الفعلي في تلك الوردية من ذلك اليوم",
            this._kHeat(
              t.dn,
              t.SH.map((t) => [t, t.replace("الوردية ", "")]),
              (e, s) => t.heat[e + "|" + s],
              1e3,
              (t, e, s) =>
                "اليوم " +
                t +
                " · " +
                e[0] +
                " — " +
                (null == s
                  ? "لم يُسحب جدول الوردية ذلك اليوم: فجوة تسجيل لا فجوة حضور"
                  : "الحضور الفعلي " + s + "٪ من مسحوبي الوردية ذلك اليوم") +
                " · البقعة الفاتحة موضع المساءلة الأول.",
            ) + E,
            "الخانة الفارغة تعني أن جدول تلك الوردية لم يُسحب في ذلك اليوم — وهي فجوة تسجيلٍ لا فجوة حضور.",
          )
        : "",
      O = t.TYPES.map((e, s) => ({
        key: e[0],
        name: e[1],
        color: this.KCBC[s],
        need: t.L.need[e[0]],
        plc: t.L.plc[e[0]],
        cnt: t.L.cnt[e[0]],
        cov: t.L.need[e[0]] ? Math.round((t.L.plc[e[0]] / t.L.need[e[0]]) * 1e3) / 10 : 0,
        gap: Math.max(0, t.L.need[e[0]] - t.L.plc[e[0]]),
      })).filter((t) => Rd && ("zones" === t.key ? a : "gates" === t.key ? l : d)),
      F = O.length
        ? '<div style="display:grid;grid-template-columns:repeat(' +
          O.length +
          ',minmax(0,1fr));gap:13px;margin-bottom:14px">' +
          O.map(
            (e) =>
              '<div style="border:1px solid ' +
              i +
              ';border-radius:16px;background:var(--bg-xffffff);overflow:hidden;display:flex;flex-direction:column"><div style="padding:12px 15px;border-bottom:1px solid ' +
              i +
              ';background:var(--bg-xfafbfc);display:flex;align-items:center;gap:8px"><i style="width:10px;height:10px;border-radius:3px;background:' +
              e.color +
              ';flex-shrink:0"></i><span style="font-size:13px;font-weight:700;color:var(--fg-x141414)">' +
              e.name +
              '</span><span style="margin-right:auto;font-size:10px;font-weight:400;color:var(--fg-x94a3b8);white-space:nowrap">' +
              KIVO.BassamCount(e.cnt, "عنصر") +
              ' · آخر جولة</span></div><div style="padding:14px 15px;flex:1">' +
              (e.cnt
                ? '<div dir="ltr" title="المسكَّنون على ' +
                  e.name +
                  " ÷ احتياجها في آخر جولة (اليوم " +
                  (t.L.day || "—") +
                  ") = " +
                  e.plc +
                  " ÷ " +
                  e.need +
                  " = " +
                  e.cov +
                  '٪ · كل نوعٍ يُقاس وحده — موظف الوردية يقف على فعلٍ واحد فلا تُخلط الأنواع." style="cursor:help;font-size:26px;font-weight:800;color:' +
                  s +
                  ';line-height:1">' +
                  e.cov +
                  '٪</div><div style="font-size:10.5px;font-weight:400;color:var(--fg-x94a3b8);margin-top:5px">المسكَّنون <b dir="ltr" style="color:' +
                  n +
                  ';font-weight:700">' +
                  e.plc +
                  '</b> من احتياج <b dir="ltr" style="color:' +
                  n +
                  ';font-weight:700">' +
                  e.need +
                  '</b></div><div style="height:9px;border-radius:9999px;background:var(--bg-xf1f3f5);overflow:hidden;margin-top:10px"><i style="display:block;height:100%;width:' +
                  Math.max(0, Math.min(100, e.cov)) +
                  '%;border-radius:9999px;background:linear-gradient(90deg,var(--bg-x8a6f35),var(--bg-xb99751))"></i></div><div title="' +
                  (e.gap
                    ? "الاحتياج − المسكَّن = " +
                      e.need +
                      " − " +
                      e.plc +
                      " = " +
                      e.gap +
                      " · خانات مكشوفة في هذا النوع وحده — عجزٌ قائم قبل أي غياب."
                    : "احتياج هذا النوع مسدود بالكامل في آخر جولة — لا عجز.") +
                  '" style="cursor:help;margin-top:9px;font-size:11px;font-weight:700;color:' +
                  (e.gap ? "var(--fg-xb91c1c)" : "var(--fg-x047857)") +
                  '">' +
                  (e.gap ? "ناقص " + e.gap : "مكتمل") +
                  "</div>"
                : '<div style="padding:20px 0 12px;text-align:center;font-size:11px;font-weight:400;color:var(--fg-x94a3b8)">لا ' +
                  e.name.replace("ال", "") +
                  " في آخر جولةٍ مسجّلة</div>") +
              '</div><div style="padding:9px 15px;border-top:1px solid var(--bd-xf1f1f1);background:var(--bg-xfcfcfd);font-size:9.5px;font-weight:400;color:var(--fg-x94a3b8);line-height:1.8">المصدر: احتياج عناصر ' +
              e.name +
              " وتسكيناتها في آخر يومٍ مسجّل بجولة — ولا يُجمَع نوعٌ مع نوع.</div></div>",
          ).join("") +
          "</div>"
        : "",
      C = t.WHY.map(
        (e, s) =>
          '<div style="display:flex;align-items:center;gap:9px;padding:7px 0;border-bottom:1px solid var(--bd-xf7f8fa)"><i style="width:10px;height:10px;border-radius:3px;background:' +
          this.KCBC[s % 9] +
          ';flex-shrink:0"></i><span style="flex:1;font-size:11px;font-weight:400;color:var(--fg-x374151);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
          e +
          '</span><b dir="ltr" title="إغلاقات مسجّلة بسبب «' +
          e +
          "»: " +
          t.gWhy[e] +
          ' · تكرار السبب نفسه نمطٌ يستحق قراراً لا معالجة فردية." style="cursor:help;font-size:11px;font-weight:700;color:' +
          n +
          '">' +
          t.gWhy[e] +
          "</b></div>",
      ).join(""),
      D =
        l && this._dsTabOn("rounds")
          ? p(
              "الأبواب المغلقة — عدداً وسبباً",
              t.gClosed + " إغلاقاً مسجّلاً من " + t.gTot + " رصدة باب عبر الفترة",
              t.gTot
                ? '<div style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start"><div style="flex:0 0 auto;display:flex;flex-direction:column;align-items:center;gap:10px">' +
                    this._kDonut(
                      [
                        {
                          name: "مفتوحة",
                          v: Math.max(0, t.gTot - t.gClosed),
                          color: "#047857",
                          tip:
                            "رصدات أبواب مفتوحة: " +
                            o(Math.max(0, t.gTot - t.gClosed)) +
                            " من " +
                            o(t.gTot) +
                            " (رصدة = باب في يوم) · الميدان المتاح فعلاً.",
                        },
                        {
                          name: "مغلقة",
                          v: t.gClosed,
                          color: "#b91c1c",
                          tip: "رصدات إغلاق مسجّلة: " + o(t.gClosed) + " · كل إغلاقٍ له سببٌ في القائمة جانباً — راقب تكراره.",
                        },
                      ],
                      200,
                      112,
                      "باب",
                    ) +
                    '<div title="الإغلاقات ÷ الرصدات = ' +
                    o(t.gClosed) +
                    " ÷ " +
                    o(t.gTot) +
                    ' (الرصدة = بابٌ في يومٍ واحد، فالباب عبر عشرة أيام عشرُ رصدات) · نبض إتاحة الميدان." style="cursor:help;font-size:10px;font-weight:400;color:var(--fg-x94a3b8);text-align:center">' +
                    (t.gTot ? Math.round((t.gClosed / t.gTot) * 1e3) / 10 : 0) +
                    '٪ من الرصدات مغلقة</div></div><div style="flex:1;min-width:240px;max-width:380px">' +
                    (C ||
                      '<div style="padding:20px 0;text-align:center;font-size:11px;font-weight:400;color:var(--fg-x94a3b8)">لا إغلاق مسجّلاً في هذه الفترة</div>') +
                    "</div></div>"
                : '<div style="padding:26px 0;text-align:center;font-size:11px;font-weight:400;color:var(--fg-x94a3b8)">لا أبواب في جولات هذه الفترة</div>',
              "«رصدة باب» = الباب في يومٍ واحد، فالباب الواحد عبر عشرة أيام عشرُ رصدات. والسبب مصدره خانة سبب الإغلاق في عدسة الأبواب — و«بلا سبب مسجّل» يعني إغلاقاً من سجلٍّ قديم قبل أن يصير السبب إلزامياً.",
            )
          : "",
      T = (t) =>
        '<th style="padding:9px 10px;font-size:10px;font-weight:600;color:var(--fg-x8e959d);text-align:center;white-space:nowrap;border-bottom:1px solid ' +
        i +
        '">' +
        t +
        "</th>",
      P = t.SH.map((e, n) => {
        const i = t.sh[e],
          o = i.tot ? Math.round((i.pr / i.tot) * 1e3) / 10 : 0,
          r = o >= 90 ? "#047857" : o >= 75 ? s : "#b91c1c";
        return (
          '<tr style="border-bottom:1px solid var(--bd-xf5f5f5)"><td style="padding:8px 10px;text-align:center"><span style="display:inline-flex;width:22px;height:22px;border-radius:7px;background:var(--bg-a185151810p13);color:' +
          s +
          ';align-items:center;justify-content:center;font-size:10px;font-weight:700">' +
          (n + 1) +
          '</span></td><td style="padding:8px 10px;font-size:11.5px;font-weight:600;color:var(--fg-x141414);white-space:nowrap">' +
          e +
          '</td><td dir="ltr" title="مسحوبو «' +
          e +
          "»: " +
          i.tot +
          ' — مجموع أسطر روسترها في تقارير الفترة · قاعدة نسب الوردية." style="cursor:help;text-align:center;padding:8px 10px;font-size:11px;font-weight:400;color:var(--fg-x374151)">' +
          i.tot +
          '</td><td dir="ltr" title="حاضرو «' +
          e +
          "» فعلاً: " +
          i.pr +
          " من " +
          i.tot +
          ' · صافي قوة الوردية بعد كل الخصوم." style="cursor:help;text-align:center;padding:8px 10px;font-size:11px;font-weight:700;color:var(--fg-x047857)">' +
          i.pr +
          '</td><td dir="ltr" title="غياب «' +
          e +
          "» بلا عذر: " +
          i.ab +
          ' · رقم المساءلة المباشر." style="cursor:help;text-align:center;padding:8px 10px;font-size:11px;font-weight:400;color:var(--fg-xb91c1c)">' +
          i.ab +
          '</td><td dir="ltr" title="استئذانات «' +
          e +
          "»: " +
          i.pm +
          ' · خروج بإذن أثناء الوردية." style="cursor:help;text-align:center;padding:8px 10px;font-size:11px;font-weight:400;color:var(--fg-xc9702a)">' +
          i.pm +
          '</td><td dir="ltr" title="إجازات سارية في «' +
          e +
          "»: " +
          i.lv +
          ' · غياب نظامي من سجل الإجازات." style="cursor:help;text-align:center;padding:8px 10px;font-size:11px;font-weight:400;color:var(--fg-x0e7490)">' +
          i.lv +
          '</td><td dir="ltr" title="راحات «' +
          e +
          "» في أيام الفترة: " +
          i.rest +
          ' · غياب مخطط من الجدول الشهري." style="cursor:help;text-align:center;padding:8px 10px;font-size:11px;font-weight:400;color:var(--fg-xb45309)">' +
          i.rest +
          '</td><td dir="ltr" title="تحويلات من «' +
          e +
          "» لوردية أخرى: " +
          i.tout +
          ' · يُحتسب حضورهم في الوردية الجديدة." style="cursor:help;text-align:center;padding:8px 10px;font-size:11px;font-weight:400;color:var(--fg-x7c3aed)">' +
          i.tout +
          '</td><td style="padding:6px 10px;text-align:center">' +
          this._kSpark(i.ser, 118, 28, r) +
          '</td><td dir="ltr" title="نسبة حضور «' +
          e +
          "» = " +
          i.pr +
          " ÷ " +
          i.tot +
          " = " +
          o +
          '٪ · أخضر ≥90، ذهبي ≥75، أحمر دونها — والمنحنى جانبه يكشف الشذوذ من النمط." style="cursor:help;text-align:center;padding:8px 10px;font-size:11.5px;font-weight:700;color:' +
          r +
          '">' +
          o +
          "٪</td></tr>"
        );
      }).join(""),
      L = t.SH.length
        ? p(
            "الورديات — أرقام كل وردية ومنحنى حضورها",
            "المنحنى المصغّر يقول ما لا يقوله الرقم: هل الانخفاض يوم شاذّ أم نمط ثابت في الوردية",
            '<div class="bs-hscroll" style="overflow-x:auto"><table class="bs-rtable" style="width:100%;border-collapse:collapse;min-width:940px"><thead><tr>' +
              T("#") +
              '<th style="padding:9px 10px;font-size:10px;font-weight:600;color:var(--fg-x8e959d);text-align:right;white-space:nowrap;border-bottom:1px solid ' +
              i +
              '">الوردية</th>' +
              ["المسحوبون", "حاضر", "غياب", "استئذان", "إجازة", "راحة", "تحويل", "المنحنى", "نسبة الحضور"].map(T).join("") +
              "</tr></thead><tbody>" +
              P +
              "</tbody></table></div>",
          )
        : "",
      B = (t, e) =>
        t || e
          ? '<div style="display:grid;grid-template-columns:repeat(' +
            (t && e ? 2 : 1) +
            ',minmax(0,1fr));gap:14px;align-items:start">' +
            t +
            e +
            "</div>"
          : "";
    return this._kDefs() + x + S + B(z, M) + F + B(D, L);
  }
  _kPaneOv(t, e) {
    const s = this.KGOLD,
      n = this.KGOLD_D,
      i = this.KNAVY,
      o = this.KLINE,
      r = this.KSC,
      a = (t) => Math.round(t || 0).toLocaleString("en-US"),
      l = t.dn.map(String),
      d = (t, e, s, n) =>
        '<section style="border:1px solid ' +
        o +
        ';border-radius:16px;background:var(--bg-xffffff);overflow:hidden;margin-bottom:14px"><div style="padding:13px 16px;border-bottom:1px solid ' +
        o +
        ';background:var(--bg-xfafbfc)"><div style="font-size:13px;font-weight:700;color:var(--fg-x141414)">' +
        t +
        '</div><div style="font-size:10.5px;font-weight:400;color:var(--fg-x94a3b8);margin-top:3px">' +
        e +
        '</div></div><div style="padding:15px 16px">' +
        s +
        "</div>" +
        (n
          ? '<div style="padding:10px 16px;border-top:1px solid var(--bd-xf1f1f1);background:var(--bg-xfcfcfd);font-size:10.5px;font-weight:400;color:var(--fg-x94a3b8);line-height:1.9">' +
            n +
            "</div>"
          : "") +
        "</section>",
      p = (t) =>
        '<div style="display:flex;flex-wrap:wrap;gap:14px;margin-top:11px;padding-top:11px;border-top:1px solid var(--bd-xf5f5f5)">' +
        t
          .map(
            (t) =>
              '<span style="display:inline-flex;align-items:center;gap:7px;font-size:10.5px;font-weight:400;color:var(--fg-x53565a)"><i style="width:16px;height:3px;border-radius:9999px;background:' +
              t[1] +
              ';display:inline-block"></i>' +
              t[0] +
              '<b style="font-weight:700;color:' +
              n +
              '">' +
              t[2] +
              "</b></span>",
          )
          .join("") +
        "</div>",
      h = t.dayN.length ? t.dayN.indexOf(Math.max.apply(null, t.dayN)) : -1,
      c = t.dayN.length ? t.dayN.indexOf(Math.min.apply(null, t.dayN)) : -1,
      g = t.days ? Math.round(t.n / t.days) : 0,
      f = (t, e, s) =>
        '<span style="display:inline-flex;align-items:center;gap:6px;background:var(--bg-a2552552550p72);border:1px solid var(--bd-a138111530p22);border-radius:11px;padding:5px 10px;font-size:10px;font-weight:400;color:var(--fg-x53565a);white-space:nowrap">' +
        t +
        '<b dir="ltr" style="font-weight:700;color:' +
        i +
        '">' +
        e +
        '</b><em style="font-style:normal;color:var(--fg-x94a3b8);font-size:9.5px">' +
        s +
        "</em></span>",
      u =
        '<div style="position:relative;border-radius:20px;padding:18px;display:flex;gap:20px;align-items:stretch;overflow:hidden;flex-wrap:wrap;background:var(--brand-pattern) center/96px 96px,linear-gradient(125deg,var(--hero-1) 0%,var(--hero-2) 38%,var(--hero-3) 72%,var(--hero-4) 100%);border:1px solid var(--bd-a185151810p3);box-shadow:0 10px 30px -20px rgba(138,111,53,.55);margin-bottom:14px"><div style="flex:1.35;min-width:300px;display:flex;flex-direction:column;padding:2px 4px 0"><div style="display:flex;align-items:center;gap:7px;margin-bottom:9px;flex-wrap:wrap"><span style="display:inline-flex;align-items:center;gap:5px;border-radius:9999px;padding:4px 11px;font-size:10.5px;font-weight:700;border:1px solid var(--bd-a138111530p4);color:' +
        n +
        ';background:var(--bg-a2552552550p55)">المؤشر القيادي</span><span style="display:inline-flex;align-items:center;gap:5px;border-radius:9999px;padding:4px 11px;font-size:10.5px;font-weight:700;border:1px solid var(--bd-a09900p28);color:var(--fg-x006300);background:var(--bg-a12163120p09)"><span style="width:6px;height:6px;border-radius:9999px;background:var(--bg-x006300)"></span>محسوب من الجولات</span></div><div style="font-size:12.5px;font-weight:600;color:' +
        n +
        ';opacity:.9">إجمالي المصلّين المرصودين · ' +
        e +
        '</div><div dir="ltr" style="font-size:50px;font-weight:800;color:' +
        n +
        ';line-height:1.02;letter-spacing:-1px;margin:6px 0 4px;text-shadow:0 2px 0 rgba(255,255,255,.5)">' +
        a(t.n) +
        '</div><div style="font-size:12.5px;font-weight:400;color:var(--fg-x6f5a2e);opacity:.85">مجموع القراءات المسجَّلة على ' +
        KIVO.BassamCount(t.Z, "مصلى", "g") +
        " عبر " +
        KIVO.BassamCount(t.days, "يوم جولة", "g") +
        '</div><div style="margin-top:auto;padding-top:12px">' +
        this._kArea(t.dayN, l, 1e3, 150, n, "url(#kHero)", 0, " مصلٍّ") +
        '</div><div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:10px">' +
        f("أعلى يوم", a(h < 0 ? 0 : t.dayN[h]), (h < 0 ? "—" : t.dn[h]) + " ") +
        f("أدنى يوم", a(c < 0 ? 0 : t.dayN[c]), (c < 0 ? "—" : t.dn[c]) + " ") +
        f("متوسط يومي", a(g), "لكل يوم جولة") +
        f("القراءات", a(t.reads), "من " + KIVO.BassamCount(a(t.slots), "خانة", "g") + "") +
        '</div></div><div style="flex:1;min-width:300px;display:flex;flex-direction:column;justify-content:center;gap:12px"><div style="background:var(--bg-a2552552550p82);border:1px solid var(--bd-a138111530p16);border-radius:16px;padding:14px 15px"><div style="font-size:11.5px;font-weight:600;color:' +
        i +
        ';margin-bottom:9px">توزيع القراءات على الصلوات</div>' +
        this._kStack(t.PR.map((e, s) => ({ name: e[1], v: Math.max(0, t.prCnt[e[0]]), color: r[s] }))) +
        p(t.PR.map((e, s) => [e[1], r[s], a(t.prCnt[e[0]])])) +
        '</div><div style="background:var(--bg-a2552552550p82);border:1px solid var(--bd-a138111530p16);border-radius:16px;padding:14px 15px"><div style="font-size:11.5px;font-weight:600;color:' +
        i +
        ';margin-bottom:6px">متوسط الإشغال لكل صلاة</div>' +
        this._kCols(
          t.PR.map((e) => ({ name: e[1], v: t.prOcc[e[0]] })),
          600,
          186,
          100,
          85,
        ) +
        "</div></div></div>",
      y = (t) => {
        const e = t.filter((t) => t > 0);
        return e.length
          ? [
              Math.round(10 * Math.min.apply(null, e)) / 10,
              Math.round((e.reduce((t, e) => t + e, 0) / e.length) * 10) / 10,
              Math.round(10 * Math.max.apply(null, e)) / 10,
            ]
          : [0, 0, 0];
      },
      m = y(t.dayOcc),
      x = y(t.dayCov),
      b = y(t.dayStf),
      k = t.days ? Math.round((t.ap / t.days) * 100) : 0,
      v =
        '<div style="display:flex;flex-wrap:wrap;gap:13px;margin-bottom:14px">' +
        this._kGauge(
          t.occ,
          "الإشغال الموزون",
          "مجموع الأعداد ÷ مجموع السعات — يُوزَن كل مصلى بسعته",
          t.dayOcc,
          m[0],
          m[1],
          m[2],
          "أدنى يوم",
          "أعلى يوم",
        ) +
        this._kGauge(
          t.covT,
          "اكتمال الرصد",
          "الخانات المرصودة ÷ (المصليات × ٥ صلوات)",
          t.dayCov,
          x[0],
          x[1],
          x[2],
          "أدنى يوم",
          "أعلى يوم",
        ) +
        this._kGauge(
          t.stf,
          "تغطية التسكين",
          "رصدات المصليات التي عليها موظف واحد فأكثر",
          t.dayStf,
          b[0],
          b[1],
          b[2],
          "أدنى يوم",
          "أعلى يوم",
        ) +
        this._kGauge(
          k,
          "اعتماد الجولات",
          KIVO.BassamCount(t.ap, "يوم|معتمد") + " من " + KIVO.BassamCount(t.days, "يوم|مسجّل", "g") + "",
          t.dayN.map(() => 0),
          0,
          k,
          100,
          "مسودّة",
          "معتمدة",
        ) +
        "</div>",
      w = d(
        "الإشغال عبر أيام الفترة — خط لكل صلاة",
        "خمس سلاسل مستقلة؛ تقاطعها يكشف أي صلاة انقلب فيها الضغط",
        this._kLines(
          t.PR.map((e, s) => ({ name: e[1], color: r[s], vals: t.prSer[e[0]] })),
          l,
          1e3,
          250,
          120,
        ) + p(t.PR.map((e, s) => [e[1], r[s], t.prOcc[e[0]] + "٪"])),
        "المصدر: <b>zone.pc[صلاة]</b> مجمّعاً بالوزن لكل يوم. النقاط عند الصفر تعني «لا قراءة في ذلك اليوم» لا «إشغال صفر».",
      );
    let S =
      '<div style="display:flex;align-items:center;gap:9px;margin-top:12px;padding-top:11px;border-top:1px solid var(--bd-xf5f5f5);flex-wrap:wrap"><span style="font-size:10px;font-weight:400;color:var(--fg-x94a3b8)">أفتح = رصد أقل</span>';
    for (let t = 0; t < 9; t++)
      S +=
        '<i style="width:26px;height:11px;border-radius:3px;background:rgba(138,111,53,' +
        (0.1 + (t / 8) * 0.85).toFixed(2) +
        ');display:inline-block"></i>';
    S +=
      '<span style="font-size:10px;font-weight:400;color:var(--fg-x94a3b8)">أغمق = رصد كامل ١٠٠٪</span><span style="margin-right:auto"></span><span style="display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:400;color:var(--fg-x94a3b8)"><i style="width:14px;height:11px;border-radius:3px;background:var(--bg-xf7f8fa);border:1px solid var(--bd-xeff1f4);display:inline-block"></i>بلا قراءة</span></div>';
    const A = d(
        "خريطة اكتمال الرصد — يوم × صلاة",
        KIVO.BassamCount(t.days, "يوم") + " × ٥ صلوات = " + 5 * t.days + " خانة، كل خانة نسبة المصليات التي رُصدت في ذلك الوقت",
        this._kHeat(t.dn, t.PR, (e, s) => t.cov[e + "|" + s]) + S,
        "الصفّ الأفتح يعني أن كثيراً من المصليات لا تُرصد في تلك الصلاة — فجوة لا يكشفها أي متوسط.",
      ),
      z = t.CB.map((e, s) => ({ name: e, v: t.combo[e].tot, color: this.KCBC[s % 9] })),
      E = t.CB.map(
        (e, s) =>
          '<div style="display:flex;align-items:center;gap:9px;padding:6px 0;border-bottom:1px solid var(--bd-xf7f8fa)"><i style="width:10px;height:10px;border-radius:3px;background:' +
          this.KCBC[s % 9] +
          ';flex-shrink:0"></i><span style="flex:1;font-size:11px;font-weight:400;color:var(--fg-x374151);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
          e +
          '</span><b dir="ltr" style="font-size:11px;font-weight:700;color:' +
          i +
          '">' +
          t.combo[e].tot +
          "</b></div>",
      ).join(""),
      M = d(
        "تركيب المصليات وإشغال كل ساحة",
        "الحلقة: عدد المصليات حسب النوع والفئة · الأعمدة: الإشغال الموزون لكل ساحة",
        '<div style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start"><div style="flex:0 0 auto;display:flex;flex-direction:column;align-items:center;gap:10px">' +
          this._kDonut(z, 200, 112, "مصلى") +
          '<div style="font-size:10px;font-weight:400;color:var(--fg-x94a3b8);text-align:center">' +
          KIVO.BassamCount(t.Z, "مصلى") +
          " · " +
          KIVO.BassamCount(t.CB.length, "تركيبة") +
          '</div></div><div style="flex:1;min-width:230px;max-width:330px">' +
          E +
          '</div><div style="flex:1.5;min-width:330px">' +
          this._kCols(
            t.yardL
              .slice()
              .sort((t, e) => e.occ - t.occ)
              .map((t) => ({ name: t.name.replace("الساحة ", ""), v: t.occ })),
            620,
            208,
            100,
            85,
          ) +
          "</div></div>",
        "المصدر: <b>zone.ztype · zone.zcat</b> للحلقة و<b>zone.yard</b> للأعمدة. خطّ «حدّ الازدحام ٨٥٪» اقتراح — قل الحدّ المعتمد وأثبّته.",
      ),
      O = {};
    t.yardL.forEach((t, e) => (O[t.name] = r[e % r.length]));
    const F = t.zones
        .filter((t) => t.cap > 0 && t.reads > 0)
        .map((t) => ({ name: t.code, x: t.cap, y: t.peak, r: t.reads, color: O[t.yard] || s })),
      C = F.length
        ? d(
            "السعة مقابل ذروة الإشغال — كل فقاعة مصلى",
            "الأفقي: السعة · الرأسي: أعلى إشغال بلغته · الحجم: عدد القراءات · اللون: الساحة",
            this._kBubble(F) +
              '<div style="display:flex;flex-wrap:wrap;gap:14px;margin-top:11px;padding-top:11px;border-top:1px solid var(--bd-xf5f5f5)">' +
              t.yardL
                .map(
                  (t) =>
                    '<span style="display:inline-flex;align-items:center;gap:7px;font-size:10.5px;font-weight:400;color:var(--fg-x53565a)"><i style="width:11px;height:11px;border-radius:9999px;background:' +
                    (O[t.name] || s) +
                    ';opacity:.6;display:inline-block"></i>' +
                    t.name +
                    "</span>",
                )
                .join("") +
              "</div>",
            "الفقاعات فوق الخط الأحمر مصليات تجاوزت سعتها. المهم هو الركن الأيمن الأعلى: مصليات صغيرة السعة بلغت ذروة عالية.",
          )
        : "",
      D = t.zones
        .slice()
        .sort((t, e) => e.peak - t.peak)
        .slice(0, 12),
      T = (t) =>
        '<th style="padding:9px 10px;font-size:10px;font-weight:600;color:var(--fg-x8e959d);text-align:center;white-space:nowrap;border-bottom:1px solid ' +
        o +
        '">' +
        t +
        "</th>",
      P = D.map((t, e) => {
        const i = t.peak >= 100 ? "#b91c1c" : t.peak >= 85 ? n : s;
        return (
          '<tr style="border-bottom:1px solid var(--bd-xf5f5f5)"><td style="padding:8px 10px;text-align:center"><span style="display:inline-flex;width:22px;height:22px;border-radius:7px;background:var(--bg-a185151810p13);color:' +
          n +
          ';align-items:center;justify-content:center;font-size:10px;font-weight:700">' +
          (e + 1) +
          '</span></td><td style="padding:8px 10px;font-size:11.5px;font-weight:600;color:var(--fg-x141414);white-space:nowrap">' +
          t.code +
          '</td><td style="padding:8px 10px;font-size:11px;font-weight:400;color:var(--fg-x374151);white-space:nowrap">' +
          t.ztype +
          " · " +
          t.zcat +
          '</td><td style="padding:8px 10px;font-size:11px;font-weight:400;color:var(--fg-x374151);white-space:nowrap">' +
          t.yard +
          '</td><td dir="ltr" style="text-align:center;padding:8px 10px;font-size:11px;font-weight:400;color:var(--fg-x374151)">' +
          (t.cap || "—") +
          '</td><td style="padding:6px 10px;text-align:center">' +
          this._kSpark(t.ser, 118, 28, i) +
          '</td><td dir="ltr" style="text-align:center;padding:8px 10px;font-size:11.5px;font-weight:700;color:' +
          i +
          '">' +
          t.peak +
          '٪</td><td dir="ltr" style="text-align:center;padding:8px 10px;font-size:11px;font-weight:400;color:var(--fg-x53565a)">' +
          t.occ +
          '٪</td><td dir="ltr" style="text-align:center;padding:8px 10px;font-size:10.5px;font-weight:400;color:var(--fg-x94a3b8)">' +
          t.reads +
          "</td></tr>"
        );
      }).join(""),
      L = D.length
        ? d(
            "أعلى " + KIVO.BassamCount(D.length, "مصلى", "g") + " ذروةً — ومنحنى كل واحد عبر الفترة",
            "المنحنى المصغّر يقول ما لا يقوله الرقم: هل الذروة يوم شاذّ أم نمط ثابت",
            '<div class="bs-hscroll" style="overflow-x:auto"><table class="bs-rtable" style="width:100%;border-collapse:collapse;min-width:800px"><thead><tr>' +
              T("#") +
              ["الرمز", "النوع · الفئة", "الساحة"]
                .map(
                  (t) =>
                    '<th style="padding:9px 10px;font-size:10px;font-weight:600;color:var(--fg-x8e959d);text-align:right;white-space:nowrap;border-bottom:1px solid ' +
                    o +
                    '">' +
                    t +
                    "</th>",
                )
                .join("") +
              ["السعة", "المنحنى", "الذروة", "المتوسط", "قراءات"].map(T).join("") +
              "</tr></thead><tbody>" +
              P +
              "</tbody></table></div>",
          )
        : "";
    return this._kDefs() + u + v + w + A + M + C + L;
  }
  _kOn(k) {
    try {
      const e = KIVO.BassamPerm;
      return !e || !e.on || !!e.on(k);
    } catch (t) {
      return !0;
    }
  }
  _kTickOn(n) {
    const L = (k) => this._kOn(k),
      R = this._dsTabOn("rounds");
    switch (String(n || "")) {
      case "التسكين":
      case "العجز":
        return R && L("dist");
      case "أبواب مغلقة":
        return R && L("gates");
      case "المصليات":
        return L("zones");
      case "الأبواب":
        return L("gates");
      case "المسارات":
        return L("paths");
      case "المعالم":
        return L("marks");
      case "القراءات":
      case "متوسط الإشغال":
        return L("dens");
      default:
        return !0;
    }
  }
  _dsTabOn(t) {
    try {
      const e = KIVO.BassamPerm;
      if (e && e.tabOn && !e.tabOn("daily", t)) return !1;
      const L = (k) => this._kOn(k);
      if ("kpiOcc" === t) return L("zones") && L("dens");
      if ("kpiZones" === t) return L("zones");
      if ("kpiDaily" === t) return !e || !e.can || !!e.can("dreport", "view");
      return !0;
    } catch (t) {
      return !0;
    }
  }
  _kPaneZn(t) {
    const e = this.KGOLD_D,
      s = this.KNAVY,
      n = (this.KLINE, this.KCBC),
      i = t.CB,
      o = t.TY,
      r =
        (t.CA,
        {
          tot: t.Z,
          on: t.ZON,
          off: t.ZOFF,
          onP: t.Z ? Math.round((t.ZON / t.Z) * 1e3) / 10 : 0,
          offP: t.Z ? Math.round((t.ZOFF / t.Z) * 1e3) / 10 : 0,
        }),
      a = !r.tot,
      l = (t) =>
        '<div style="padding:18px 10px;text-align:center;font-size:10.5px;font-weight:400;color:var(--fg-xa79878);line-height:1.9">' +
        t +
        "</div>",
      d = Math.max.apply(null, i.map((e) => t.combo[e].tot).concat([1])),
      p = (t, e) => (e ? Math.round((t / e) * 1e3) / 10 : 0),
      h = (t) => (t >= 90 ? "#15803d" : t < 80 ? "#C9702A" : e),
      c = (t) =>
        '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--fg-xa79878)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:0 auto 2px">' +
        t +
        "</svg>",
      g = "flex:0 0 17px",
      f = "flex:0 0 10px",
      u = "flex:0 0 62px",
      y = "flex:0 0 20px",
      m = "flex:0 0 28px",
      x = "flex:0 0 28px",
      b = "flex:0 0 42px",
      k = i.slice().sort((e, s) => t.combo[s].tot - t.combo[e].tot),
      v =
        '<div style="display:flex;align-items:flex-end;gap:6px;padding:0 4px 7px;border-bottom:1px solid var(--bd-a138111530p22);font-size:8.5px;font-weight:700;letter-spacing:.2px;color:var(--fg-xa79878);white-space:nowrap"><span style="' +
        g +
        '"></span><span style="' +
        f +
        '"></span><span style="flex:1;min-width:0;text-align:right">نوع وفئة المصلّى</span><span style="' +
        u +
        ';text-align:center">' +
        c('<path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path>') +
        'الحصة</span><span style="' +
        y +
        ';text-align:center">' +
        c(
          '<rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect>',
        ) +
        'الكل</span><span style="' +
        m +
        ';text-align:center">' +
        c('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><path d="m9 11 3 3L22 4"></path>') +
        'مفعّل</span><span style="' +
        x +
        ';text-align:center">' +
        c('<path d="M18.36 6.64A9 9 0 1 1 5.64 6.64"></path><path d="M12 2v10"></path>') +
        'معطّل</span><span style="' +
        b +
        ';text-align:center">' +
        c('<path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>') +
        "التفعيل</span></div>",
      w = i
        .map((i, o) => {
          const a = t.combo[i],
            l = p(a.tot, r.tot),
            c = n[o % 9],
            v = k.indexOf(i) + 1,
            w = 1 === v,
            S = o % 2 ? "rgba(138,111,53,.035)" : "transparent";
          return (
            '<div title="' +
            i +
            " — الإجمالي " +
            a.tot +
            " (" +
            l +
            "٪) · مفعّلة " +
            a.on +
            " (" +
            a.onP +
            "٪) · معطّلة " +
            a.off +
            '" style="display:flex;align-items:center;gap:6px;padding:4px;border-radius:8px;background:' +
            (w ? "var(--bg-a138111530p1)" : S) +
            '"><span dir="ltr" style="' +
            g +
            ";height:17px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-size:8.5px;font-weight:800;" +
            (w ? "background:" + e + ";color:var(--fg-xffffff)" : "background:var(--bg-a138111530p1);color:var(--fg-xa79878)") +
            '">' +
            v +
            '</span><i style="' +
            f +
            ";height:10px;border-radius:3px;background:" +
            c +
            ';box-shadow:0 0 0 2px var(--bg-card),var(--shadow-card)"></i><span style="flex:1;min-width:0;font-size:10.5px;font-weight:400;color:var(--fg-x4a4033);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:right">' +
            i +
            '</span><span style="' +
            u +
            ';display:flex;align-items:center;gap:5px"><i style="flex:1;height:6px;border-radius:4px;background:var(--bg-a138111530p13);overflow:hidden;display:flex"><i style="height:100%;width:' +
            ((a.tot / d) * 100).toFixed(0) +
            "%;background:linear-gradient(90deg," +
            c +
            "," +
            c +
            ');border-radius:4px;display:block"></i></i><em dir="ltr" style="font-style:normal;flex-shrink:0;font-size:8.5px;font-weight:700;color:var(--fg-xa79878)">' +
            l +
            '</em></span><b dir="ltr" style="' +
            y +
            ";text-align:center;font-size:12px;font-weight:800;color:" +
            s +
            '">' +
            a.tot +
            '</b><b dir="ltr" style="' +
            m +
            ";text-align:center;font-size:11px;font-weight:800;color:" +
            (a.on ? "var(--fg-x16a34a)" : "var(--fg-xcfc7b4)") +
            '">' +
            a.on +
            '</b><b dir="ltr" style="' +
            x +
            ";text-align:center;font-size:11px;font-weight:800;color:" +
            (a.off ? "var(--fg-x6b7280)" : "var(--fg-xcfc7b4)") +
            '">' +
            (a.off || "—") +
            '</b><span dir="ltr" style="' +
            b +
            ";text-align:center;font-size:9.5px;font-weight:800;color:var(--fg-xffffff);background:" +
            h(a.onP) +
            ";border-radius:9999px;padding:2px 0;box-shadow:0 2px 6px -3px " +
            h(a.onP) +
            '">' +
            a.onP +
            "٪</span></div>"
          );
        })
        .join(""),
      S =
        '<div style="display:flex;align-items:center;gap:6px;padding:7px 4px 6px;margin-top:4px;border-radius:9px;border-top:2px solid var(--bd-a185151810p42);background:linear-gradient(90deg,var(--bg-a185151810p14),var(--bg-a185151810p05))"><span style="' +
        g +
        '"></span><i style="' +
        f +
        ";height:10px;border-radius:3px;background:" +
        e +
        '"></i><span style="flex:1;min-width:0;font-size:11px;font-weight:800;color:' +
        s +
        ';text-align:right">الإجمالي</span><span dir="ltr" style="' +
        u +
        ';text-align:center;font-size:8.5px;font-weight:800;color:var(--fg-xa79878)">100٪</span><b dir="ltr" style="' +
        y +
        ";text-align:center;font-size:12.5px;font-weight:800;color:" +
        e +
        '">' +
        r.tot +
        '</b><b dir="ltr" style="' +
        m +
        ';text-align:center;font-size:11.5px;font-weight:800;color:var(--fg-x16a34a)">' +
        r.on +
        '</b><b dir="ltr" style="' +
        x +
        ';text-align:center;font-size:11.5px;font-weight:800;color:var(--fg-x6b7280)">' +
        r.off +
        '</b><span dir="ltr" style="' +
        b +
        ";text-align:center;font-size:9.5px;font-weight:800;color:var(--fg-xffffff);background:" +
        h(r.onP) +
        ';border-radius:9999px;padding:2px 0">' +
        r.onP +
        "٪</span></div>",
      z = (t, e, s) =>
        '<svg width="' +
        (s || 15) +
        '" height="' +
        (s || 15) +
        '" viewBox="0 0 24 24" fill="none" stroke="' +
        e +
        '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
        t +
        "</svg>",
      E = (t, e, s, n, i, o, r) =>
        '<div style="display:flex;align-items:center;gap:11px;min-width:152px;background:var(--bg-a2552552550p8);border:1px solid var(--bd-a138111530p2);border-radius:14px;padding:10px 11px;box-shadow:0 4px 14px -10px rgba(138,111,53,.65)"><span style="width:31px;height:31px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:' +
        s +
        ";border:1px solid " +
        n +
        '">' +
        t +
        '</span><div style="min-width:0"><div style="font-size:9.5px;font-weight:600;color:var(--fg-x94a3b8);white-space:nowrap">' +
        i +
        '</div><div dir="ltr" style="font-size:14.5px;font-weight:800;color:' +
        e +
        ';line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
        o +
        '</div><div style="font-size:9.5px;font-weight:400;color:var(--fg-x6f5a2e);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
        r +
        "</div></div></div>",
      M =
        '<div style="display:flex;gap:9px;margin-right:auto;padding-bottom:5px;flex-wrap:wrap">' +
        E(
          z('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><path d="m9 11 3 3L22 4"></path>', "#15803d"),
          "#15803d",
          "rgba(21,128,61,.10)",
          "rgba(21,128,61,.26)",
          "مفعّلة",
          r.on + " · " + r.onP + "٪",
          "من " + KIVO.BassamCount(r.tot, "مصلى", "g") + "",
        ) +
        E(
          z('<path d="M18.36 6.64A9 9 0 1 1 5.64 6.64"></path><path d="M12 2v10"></path>', "#6B7280"),
          "#6B7280",
          "rgba(107,114,128,.10)",
          "rgba(107,114,128,.24)",
          "معطّلة",
          r.off + " · " + r.offP + "٪",
          "من " + KIVO.BassamCount(r.tot, "مصلى", "g") + "",
        ) +
        "</div>",
      O = (t, e, n, i, o, a, l) =>
        '<div style="flex:1;min-width:172px;position:relative;overflow:hidden;display:flex;align-items:center;gap:9px;background:' +
        n +
        ";border:1px solid " +
        i +
        ";border-radius:13px;padding:7px 11px 7px 9px;box-shadow:0 4px 12px -9px " +
        e +
        '"><i style="position:absolute;top:0;bottom:0;right:0;width:3px;background:' +
        e +
        '"></i><span style="width:27px;height:27px;border-radius:9999px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:' +
        e +
        ";box-shadow:0 3px 8px -4px " +
        e +
        '">' +
        t +
        '</span><div style="min-width:0"><div style="font-size:8.5px;font-weight:700;letter-spacing:.3px;color:' +
        e +
        ';opacity:.72;white-space:nowrap">' +
        o +
        '</div><div style="font-size:12px;font-weight:700;color:' +
        s +
        ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
        a +
        '</div></div><b dir="ltr" style="margin-right:auto;flex-shrink:0;font-size:16px;font-weight:800;color:' +
        e +
        '">' +
        l.tot +
        '</b><span dir="ltr" style="flex-shrink:0;font-size:9.5px;font-weight:800;color:var(--fg-xffffff);background:' +
        e +
        ";border-radius:9999px;padding:2.5px 8px;box-shadow:0 2px 6px -3px " +
        e +
        '">' +
        p(l.tot, r.tot) +
        "٪</span></div>",
      F = (t, n, i) => {
        if (!n || n.length < 2) return "";
        const o = n.slice().sort((e, s) => (t[s] || { tot: 0 }).tot - (t[e] || { tot: 0 }).tot),
          r = o[0],
          a = o[o.length - 1];
        return (
          '<div style="display:flex;align-items:stretch;gap:10px;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px dashed var(--bd-a138111530p32)">' +
          O(
            z('<path d="m3 17 6-6 4 4 8-8"></path><path d="M17 7h4v4"></path>', "#fff", 13),
            e,
            "rgba(138,111,53,.12)",
            "rgba(138,111,53,.34)",
            "الأعلى " + i,
            r,
            t[r] || { tot: 0 },
          ) +
          O(
            z('<path d="m3 7 6 6 4-4 8 8"></path><path d="M17 17h4v-4"></path>', "#fff", 13),
            s,
            "rgba(37,52,63,.075)",
            "rgba(37,52,63,.24)",
            "الأدنى " + i,
            a,
            t[a] || { tot: 0 },
          ) +
          "</div>"
        );
      },
      C = (t, n, i, o) =>
        '<div style="background:var(--bg-a2552552550p66);border:1px solid var(--bd-a138111530p24);border-radius:16px;overflow:hidden;box-shadow:0 6px 18px -14px rgba(138,111,53,.8);' +
        (o || "") +
        '"><div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:8px 13px;background:var(--bg-a138111530p075);border-bottom:1px solid var(--bd-a138111530p22)"><span style="display:inline-flex;align-items:center;gap:7px;font-size:11.5px;font-weight:700;color:' +
        s +
        '"><i style="width:3px;height:13px;border-radius:2px;background:' +
        e +
        ';display:inline-block;flex-shrink:0"></i>' +
        t +
        "</span>" +
        (n ? '<span style="display:inline-flex;align-items:center;gap:12px;flex-wrap:wrap">' + n + "</span>" : "") +
        '</div><div style="padding:11px 13px 10px">' +
        i +
        "</div></div>",
      D = (t, s) =>
        '<span style="display:inline-flex;align-items:center;gap:5px;font-size:9px;font-weight:400;color:var(--fg-x6f5a2e)"><i style="width:9px;height:9px;border-radius:3px;background:' +
        e +
        (t ? ";opacity:" + t : "") +
        ';display:inline-block"></i>' +
        s +
        "</span>",
      T = (t) => '<span style="font-size:9px;font-weight:400;color:var(--fg-x94a3b8)">' + t + "</span>",
      P = 2 * Math.PI * 17,
      L = (t, e, s, n) =>
        '<span style="display:inline-flex;align-items:center;gap:4px;font-size:9px;font-weight:400;white-space:nowrap;color:' +
        s +
        '"><i style="width:5px;height:5px;border-radius:9999px;background:' +
        n +
        ';display:inline-block;flex-shrink:0"></i><b dir="ltr" style="font-size:10.5px;font-weight:800">' +
        t +
        "</b>" +
        e +
        "</span>",
      B = (t, n, i) => {
        const o = ((a = n.tot / (i || 1)), 48 + 82 * Math.max(0, Math.min(1, a || 0))),
          r = o * (n.tot ? n.on / n.tot : 0);
        var a;
        const l =
          "position:absolute;left:50%;bottom:7px;transform:translateX(-50%);line-height:1;font-size:17px;font-weight:800;pointer-events:none;color:" +
          s +
          ";background:var(--bg-a2552552550p94);border-radius:9999px;padding:2px 10px;box-shadow:0 2px 7px -3px rgba(74,59,28,.85),inset 0 0 0 1px rgba(185,151,81,.35)";
        return (
          '<div title="' +
          t +
          " — " +
          KIVO.BassamCount(n.tot, "مصلى") +
          " · مفعّلة " +
          n.on +
          " (" +
          n.onP +
          "٪) · معطّلة " +
          n.off +
          '" style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:6px"><div style="height:138px;width:100%;max-width:74px;box-sizing:border-box;border-radius:14px;padding:4px;background:var(--bg-a138111530p055);border:1px solid var(--bd-a138111530p17);box-shadow:inset 0 1px 4px rgba(0,0,0,.05);display:flex;align-items:flex-end;justify-content:center"><div style="position:relative;width:100%;height:' +
          o.toFixed(1) +
          'px;border-radius:10px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 3px 8px -5px rgba(138,111,53,.9)"><div style="height:' +
          (o - r).toFixed(1) +
          "px;flex-shrink:0;background:" +
          e +
          ';opacity:.22"></div><div style="height:' +
          r.toFixed(1) +
          "px;flex-shrink:0;background:linear-gradient(180deg," +
          this.KGOLD_L +
          " 0%," +
          e +
          ' 62%,#6B5527 100%)"></div><b dir="ltr" style="' +
          l +
          '">' +
          n.tot +
          '</b></div></div><span style="font-size:12px;font-weight:700;color:' +
          s +
          ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">' +
          t +
          "</span>" +
          ((t) =>
            '<div style="width:100%;display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap">' +
            ((t) => {
              const e = h(t.onP),
                s = Math.max(0, Math.min(100, t.onP)),
                n = String(Math.round(10 * t.onP) / 10).replace(/\.0$/, "") + "٪";
              return (
                '<div style="position:relative;width:42px;height:42px;flex-shrink:0"><svg viewBox="0 0 42 42" style="width:42px;height:42px;display:block"><circle cx="21" cy="21" r="17" fill="none" stroke="var(--fg-a138111530p16)" stroke-width="4.5"></circle>' +
                (s > 0
                  ? '<circle cx="21" cy="21" r="17" fill="none" stroke="' +
                    e +
                    '" stroke-width="4.5" stroke-linecap="round" transform="rotate(-90 21 21)" stroke-dasharray="' +
                    P.toFixed(1) +
                    '" stroke-dashoffset="' +
                    (P * (1 - s / 100)).toFixed(1) +
                    '"></circle>'
                  : "") +
                '</svg><span dir="ltr" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:8.5px;font-weight:800;color:' +
                e +
                '">' +
                n +
                "</span></div>"
              );
            })(t) +
            '<div style="display:flex;flex-direction:column;gap:3px;min-width:0">' +
            L(t.on, "مفعّلة", "#15803d", "#15803d") +
            L(t.off, "معطّلة", t.off ? "#6B7280" : "#B9B2A2", t.off ? "#6B7280" : "#D8D2C4") +
            "</div></div>")(n) +
          "</div>"
        );
      },
      N =
        '<i style="width:1px;align-self:stretch;flex-shrink:0;background:linear-gradient(180deg,transparent 0%,var(--bg-a138111530p24) 14%,var(--bg-a138111530p24) 86%,transparent 100%)"></i>',
      W = Math.max.apply(null, o.map((e) => (t.ty[e] || { tot: 0 }).tot).concat([1])),
      j = C(
        "مجموع المصليات بحسب النوع",
        D("", "مفعّلة") + D(".22", "معطّلة"),
        o.length
          ? '<div style="display:flex;align-items:stretch;gap:13px">' +
              o.map((e) => B(e, t.ty[e] || { tot: 0, on: 0, off: 0, onP: 0 }, W)).join(N) +
              "</div>" +
              F(t.ty, o, "نوعاً")
          : l("لا مصليات مرسومة في هذه الفترة — المؤشّر يبقى ظاهراً بصفره"),
        "margin-top:12px",
      ),
      I = t.RG || [],
      R = Math.max.apply(null, I.map((e) => t.reg[e].tot).concat([1])),
      G =
        I.length <= 6
          ? '<div style="display:flex;align-items:stretch;gap:11px">' + I.map((e) => B(e, t.reg[e], R)).join(N) + "</div>"
          : '<div style="display:flex;flex-direction:column">' +
            I.map((n) => {
              const i = t.reg[n];
              return (
                '<div title="' +
                n +
                " — " +
                KIVO.BassamCount(i.tot, "مصلى") +
                " · مفعّلة " +
                i.on +
                " (" +
                i.onP +
                "٪) · معطّلة " +
                i.off +
                '" style="display:flex;align-items:center;gap:9px;padding:5px 0"><span style="flex:0 0 118px;font-size:11px;font-weight:600;color:' +
                s +
                ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:right">' +
                n +
                '</span><span style="flex:1;height:13px;border-radius:7px;background:var(--bg-a138111530p1);overflow:hidden;display:block;position:relative"><i style="position:absolute;top:0;bottom:0;right:0;width:' +
                ((i.tot / R) * 100).toFixed(1) +
                '%;border-radius:7px;overflow:hidden;display:flex;flex-direction:row-reverse"><i style="width:' +
                i.onP +
                "%;background:" +
                e +
                ';display:block"></i><i style="flex:1;background:' +
                e +
                ';opacity:.22;display:block"></i></i></span><b dir="ltr" style="flex:0 0 26px;text-align:center;font-size:12px;font-weight:800;color:' +
                s +
                '">' +
                i.tot +
                '</b><span style="flex:0 0 62px;text-align:center;font-size:9px;font-weight:400;color:var(--fg-x15803d);white-space:nowrap"><b dir="ltr" style="font-size:10.5px;font-weight:800">' +
                i.on +
                '</b> مفعّلة</span><span style="flex:0 0 62px;text-align:center;font-size:9px;font-weight:400;color:' +
                (i.off ? "var(--fg-x6b7280)" : "var(--fg-xb9b2a2)") +
                ';white-space:nowrap"><b dir="ltr" style="font-size:10.5px;font-weight:800">' +
                i.off +
                '</b> معطّلة</span><b dir="ltr" style="flex:0 0 46px;text-align:center;font-size:10px;font-weight:800;color:' +
                h(i.onP) +
                ';background:var(--bg-a138111530p08);border-radius:9999px;padding:2px 0">' +
                i.onP +
                "٪</b></div>"
              );
            }).join("") +
            "</div>",
      Z =
        I.length || a
          ? C(
              "مجموع المصليات بحسب المنطقة",
              D("", "مفعّلة") + D(".22", "معطّلة") + (I.length ? T(KIVO.BassamCount(I.length, "منطقة|معرّفة") + "") : ""),
              I.length ? G + F(t.reg, I, "مصلًّى") : l("لا مصليات مرسومة في هذه الفترة — المؤشّر يبقى ظاهراً بصفره"),
              "margin-top:11px",
            )
          : "",
      H = t.YD || [],
      Y =
        H.length || a
          ? C(
              "مؤشرات التفعيل بحسب الساحة",
              H.length ? T(KIVO.BassamCount(H.length, "ساحة") + " · القوس = نسبة التفعيل") : "",
              H.length
                ? '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(124px,1fr));gap:9px">' +
                    H.map((n) => {
                      const i = t.yd[n],
                        o = h(i.onP),
                        r = ((t) => {
                          const e = ((180 - 1.8 * Math.max(0, Math.min(100, t))) * Math.PI) / 180;
                          return { x: 60 + 46 * Math.cos(e), y: 64 - 46 * Math.sin(e) };
                        })(i.onP),
                        a =
                          i.onP > 0
                            ? '<path d="M 14 64 A 46 46 0 0 1 ' +
                              r.x.toFixed(1) +
                              " " +
                              r.y.toFixed(1) +
                              '" fill="none" stroke="' +
                              o +
                              '" stroke-width="11" stroke-linecap="round"></path><circle cx="' +
                              r.x.toFixed(1) +
                              '" cy="' +
                              r.y.toFixed(1) +
                              '" r="4.6" fill="var(--fg-xffffff)" stroke="' +
                              o +
                              '" stroke-width="2.6"></circle>'
                            : '<circle cx="14" cy="64" r="4.6" fill="var(--fg-xffffff)" stroke="' + o + '" stroke-width="2.6"></circle>';
                      return (
                        '<div title="' +
                        n +
                        " — " +
                        KIVO.BassamCount(i.tot, "مصلى") +
                        " · مفعّلة " +
                        i.on +
                        " (" +
                        i.onP +
                        "٪) · معطّلة " +
                        i.off +
                        '" style="min-width:0;background:var(--bg-a2552552550p92);border:1px solid var(--bd-a138111530p18);border-radius:14px;padding:10px 9px 9px;display:flex;flex-direction:column;align-items:center;gap:5px;box-shadow:0 3px 12px -9px rgba(138,111,53,.7)"><span style="display:flex;align-items:center;justify-content:center;gap:5px;width:100%;min-width:0"><span style="font-size:11px;font-weight:700;color:' +
                        s +
                        ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
                        n +
                        '</span><b dir="ltr" style="flex-shrink:0;font-size:9px;font-weight:800;color:' +
                        e +
                        ';background:var(--bg-a138111530p1);border:1px solid var(--bd-a138111530p22);border-radius:9999px;padding:1px 6px">' +
                        i.tot +
                        '</b></span><div style="width:100%;max-width:118px"><svg viewBox="0 0 120 82" style="width:100%;height:auto;display:block"><path d="M 14 64 A 46 46 0 0 1 106 64" fill="none" stroke="var(--fg-a138111530p15)" stroke-width="11" stroke-linecap="round"></path>' +
                        a +
                        '<line x1="14" y1="70.5" x2="14" y2="74" stroke="var(--fg-a138111530p34)" stroke-width="1.4" stroke-linecap="round"></line><line x1="106" y1="70.5" x2="106" y2="74" stroke="var(--fg-a138111530p34)" stroke-width="1.4" stroke-linecap="round"></line><text x="60" y="53" text-anchor="middle" direction="ltr" font-size="18" font-weight="800" fill="' +
                        o +
                        '">' +
                        i.onP +
                        '٪</text><text x="60" y="66" text-anchor="middle" font-size="7.5" font-weight="400" fill="var(--fg-xa79878)">نسبة التفعيل</text></svg></div><div style="display:flex;align-items:center;justify-content:center;gap:7px;white-space:nowrap;width:100%"><span style="display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:400;color:var(--fg-x15803d)"><i style="width:5px;height:5px;border-radius:9999px;background:var(--bg-x15803d);display:inline-block"></i><b dir="ltr" style="font-size:10.5px;font-weight:800">' +
                        i.on +
                        '</b>مفعّلة</span><i style="width:1px;height:9px;background:var(--bg-a138111530p3);display:inline-block"></i><span style="display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:400;color:' +
                        (i.off ? "var(--fg-x6b7280)" : "var(--fg-xb9b2a2)") +
                        '"><i style="width:5px;height:5px;border-radius:9999px;background:' +
                        (i.off ? "var(--bg-x6b7280)" : "var(--bg-xd8d2c4)") +
                        ';display:inline-block"></i><b dir="ltr" style="font-size:10.5px;font-weight:800">' +
                        i.off +
                        "</b>معطّلة</span></div></div>"
                      );
                    }).join("") +
                    "</div>"
                : l("لا مصليات مرسومة في هذه الفترة — المؤشّر يبقى ظاهراً بصفره"),
              "margin-top:13px",
            )
          : "",
      K =
        '<div style="position:relative;border-radius:24px;padding:22px;overflow:hidden;margin-bottom:14px;background:var(--brand-pattern) center/96px 96px,linear-gradient(125deg,var(--hero-1) 0%,var(--hero-2) 38%,var(--hero-3) 72%,var(--hero-4) 100%);border:1px solid var(--bd-a185151810p34);box-shadow:0 24px 60px -34px rgba(138,111,53,.75),0 2px 10px -6px rgba(138,111,53,.35)"><div style="position:absolute;inset:0;pointer-events:none;overflow:hidden;border-radius:24px"><div style="position:absolute;width:420px;height:420px;border-radius:50%;top:-190px;right:-120px;filter:blur(60px);background:radial-gradient(circle,var(--bg-a2552552550p75),transparent 70%)"></div><div style="position:absolute;width:340px;height:340px;border-radius:50%;bottom:-170px;left:-90px;filter:blur(70px);background:radial-gradient(circle,var(--bg-a138111530p28),transparent 70%)"></div><div style="position:absolute;inset:0;background:linear-gradient(105deg,transparent 42%,var(--bg-a2552552550p32) 50%,transparent 58%)"></div></div><div style="position:relative;display:flex;gap:26px;align-items:stretch;flex-wrap:wrap"><div style="flex:1.35;min-width:440px;display:flex;flex-direction:column"><div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:12px"><span style="display:inline-flex;align-items:center;gap:5px;border-radius:9999px;padding:5px 12px;font-size:10.5px;font-weight:700;border:1px solid var(--bd-a138111530p42);color:' +
        e +
        ';background:var(--bg-a2552552550p62)"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"></path><path d="m19 9-5 5-4-4-3 3"></path></svg>المؤشر القيادي</span><span style="display:inline-flex;align-items:center;gap:5px;border-radius:9999px;padding:5px 12px;font-size:10.5px;font-weight:700;border:1px solid var(--bd-a09900p3);color:var(--fg-x006300);background:var(--bg-a12163120p1)"><span style="width:6px;height:6px;border-radius:9999px;background:var(--bg-x006300);display:inline-block"></span>محسوب من الجولات</span></div><div style="font-size:13px;font-weight:600;color:' +
        e +
        ';opacity:.92">إجمالي المصليات المفعّلة · بحسب النوع والفئة</div><div style="display:flex;align-items:flex-end;gap:15px;margin:4px 0 2px;flex-wrap:wrap"><div dir="ltr" style="font-size:78px;font-weight:800;line-height:.95;letter-spacing:-3px;background:linear-gradient(165deg,' +
        e +
        ' 0%,#6B5527 55%,#4A3B1C 100%);-webkit-background-clip:text;background-clip:text;color:transparent">' +
        r.on +
        '</div><div style="padding-bottom:13px;display:inline-flex;align-items:center;gap:7px;font-size:11.5px;font-weight:400;color:var(--fg-x6f5a2e)"><span style="width:16px;height:1px;background:var(--bg-a138111530p45);display:inline-block"></span>من إجمالي <b dir="ltr" style="font-weight:800;color:' +
        e +
        '">' +
        r.tot +
        '</b> مصلى<span dir="ltr" style="font-size:10px;font-weight:700;color:var(--fg-x15803d);background:var(--bg-a21128610p1);border:1px solid var(--bd-a21128610p24);border-radius:9999px;padding:2px 8px">' +
        r.onP +
        "٪</span></div>" +
        M +
        "</div>" +
        j +
        Z +
        '</div><div style="flex:1;min-width:400px;background:var(--bg-a2552552550p74);border:1px solid var(--bd-a138111530p2);border-radius:18px;padding:15px 16px;box-shadow:0 8px 24px -18px rgba(138,111,53,.7);display:flex;flex-direction:column"><div style="display:flex;flex-direction:column">' +
        v +
        w +
        S +
        "</div>" +
        Y +
        "</div></div></div>";
    return this._kDefs() + K;
  }
  _dsKpiVals() {
    const t = this.state,
      e = t.rounds || {},
      s = this.MONTHS,
      n = 864e5,
      i = (() => {
        try {
          return this.hParts(new Date());
        } catch (e) {
          return { y: t.year, m: t.month, d: t.day };
        }
      })(),
      o = (t) => {
        try {
          return KIVO.bsPct ? KIVO.bsPct(t) : String(Math.round(t || 0));
        } catch (e) {
          return String(Math.round(t || 0));
        }
      },
      r = (t) => Math.round(t || 0).toLocaleString("en-US"),
      a = (t) => (1 === t ? "يوم واحد" : 2 === t ? "يومين" : t >= 3 && t <= 10 ? t + " أيام" : KIVO.BassamCount(t, "يوم") + ""),
      l = (t) => new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime(),
      d = (t) => {
        const e = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t || "");
        return e ? new Date(+e[1], +e[2] - 1, +e[3]).getTime() : null;
      },
      p = (t) => {
        const e = new Date(t),
          s = (t) => (t < 10 ? "0" + t : "" + t);
        return e.getFullYear() + "-" + s(e.getMonth() + 1) + "-" + s(e.getDate());
      };
    this.__khp = this.__khp || {};
    const h = (t) => (this.__khp[t] || (this.__khp[t] = this.hParts(new Date(t))), this.__khp[t]),
      c = (t) => t.d + " " + s[t.m - 1] + " " + t.y + " هـ",
      g = (() => {
        const e = { dy: this._dsTabOn("kpiDaily"), ov: this._dsTabOn("kpiOcc"), zn: this._dsTabOn("kpiZones") },
          s = (this.props && this.props.solo) || "";
        if ("kpiDaily" === s && e.dy) return "dy";
        if ("kpiOcc" === s && e.ov) return "ov";
        if ("kpiZones" === s && e.zn) return "zn";
        let n = "zn" === t.dsKpiSub ? "zn" : "ov" === t.dsKpiSub ? "ov" : "dy";
        return (e[n] || (n = e.dy ? "dy" : e.ov ? "ov" : "zn"), n);
      })(),
      f = "dy" === g ? this._kRep() : {},
      u = [];
    if (
      (Object.keys(e).forEach((t) => {
        const s = String(t).split("-");
        if (3 !== s.length) return;
        const n = +s[0],
          i = +s[1],
          o = +s[2];
        if (!(n > 0 && i >= 1 && i <= 12 && o >= 1 && o <= 30)) return;
        const r = e[t];
        r && Array.isArray(r.d) && u.push({ y: n, m: i, d: o, k: 1e4 * n + 100 * i + o, km: 100 * n + i, rec: r });
      }),
      "dy" === g)
    ) {
      const t = {};
      (u.forEach((e) => {
        t[e.k] = 1;
      }),
        Object.keys(f).forEach((e) => {
          const s = String(e);
          if (0 === s.indexOf("m:") || 0 === s.indexOf("__")) return;
          const n = s.split("-");
          if (3 !== n.length) return;
          const i = +n[0],
            o = +n[1],
            r = +n[2];
          if (!(i > 0 && o >= 1 && o <= 12 && r >= 1 && r <= 30)) return;
          const a = f[e];
          if (!a || !a.created) return;
          const l = 1e4 * i + 100 * o + r;
          t[l] || ((t[l] = 1), u.push({ y: i, m: o, d: r, k: l, km: 100 * i + o, rec: { d: [] } }));
        }));
    }
    u.sort((t, e) => t.k - e.k);
    const y = {},
      m = {};
    u.forEach((t) => {
      ((y[t.y] = 1), (m[t.y + "-" + t.m] = 1));
    });
    let x = Object.keys(y)
      .map(Number)
      .sort((t, e) => e - t);
    x.length || (x = [i.y]);
    const b = "dsKpiYear_" + g,
      k = "dsKpiMonth_" + g,
      v = "dsKpiMode_" + g,
      w = "dsKpiFrom_" + g,
      S = "dsKpiTo_" + g,
      A = null == t[b] || "all" === String(t[b]);
    let z = A ? x[0] : +t[b];
    x.indexOf(z) < 0 && (z = x[0]);
    const E = [];
    for (let t = 1; t <= 12; t++) m[z + "-" + t] && E.push(t);
    let M = A ? "all" : null == t[k] ? "" : String(t[k]);
    !A && "all" !== M && E.indexOf(+M) < 0 && (M = E.length ? String(E[E.length - 1]) : "all");
    const O = (t, e) => (t > i.y ? 0 : t < i.y || e < i.m ? this.hMonthDays(t, e) : e === i.m ? i.d : 0),
      F = "custom" === t[v] ? "custom" : A ? "all" : "month";
    let C;
    try {
      C = l(this.hGreg(i.y, i.m, i.d));
    } catch (t) {
      C = l(new Date());
    }
    let D = d(t[w]),
      T = d(t[S]);
    if ("custom" === F && (null == D && (D = C - 29 * n), null == T && (T = C), D > T)) {
      const t = D;
      ((D = T), (T = t));
    }
    let P = [],
      L = [],
      B = !0,
      N = "",
      W = 0;
    if ("all" === F) {
      ((P = u.slice()), (B = !1));
      const t = {};
      if (
        (u.forEach((e) => {
          t[e.km] = { y: e.y, m: e.m };
        }),
        (L = Object.keys(t)
          .map(Number)
          .sort((t, e) => t - e)
          .map((e) => ({ k: e, lab: s[t[e].m - 1] + " " + t[e].y, cap: this.hMonthDays(t[e].y, t[e].m) }))),
        (N = "كل الفترة"),
        u.length)
      ) {
        const t = u[0];
        try {
          W = Math.round((C - l(this.hGreg(t.y, t.m, t.d))) / n) + 1;
        } catch (t) {
          W = 30 * L.length;
        }
      }
    } else if ("custom" === F) {
      const t = h(D),
        e = h(T),
        i = 1e4 * t.y + 100 * t.m + t.d,
        o = 1e4 * e.y + 100 * e.m + e.d;
      if (((P = u.filter((t) => t.k >= i && t.k <= o)), (W = Math.round((T - D) / n) + 1), (B = W <= 62), B))
        for (let t = D; t <= T; t += n) {
          const e = h(t);
          L.push({ k: 1e4 * e.y + 100 * e.m + e.d, lab: e.d + " " + s[e.m - 1], cap: 1 });
        }
      else {
        const t = {};
        for (let e = D; e <= T; e += n) {
          const s = h(e);
          t[100 * s.y + s.m] = s;
        }
        L = Object.keys(t)
          .map(Number)
          .sort((t, e) => t - e)
          .map((e) => ({ k: e, lab: s[t[e].m - 1] + " " + t[e].y, cap: this.hMonthDays(t[e].y, t[e].m) }));
      }
      N = c(t) + " ← " + c(e);
    } else if ("all" === M) {
      ((P = u.filter((t) => t.y === z)), (B = !1));
      for (let t = 1; t <= 12; t++) L.push({ k: 100 * z + t, lab: s[t - 1], cap: this.hMonthDays(z, t) });
      ((W = L.reduce((t, e) => t + O(z, e.k % 100), 0)), (N = "كل أشهر " + z + " هـ"));
    } else {
      const t = +M;
      ((P = u.filter((e) => e.y === z && e.m === t)), (B = !0));
      const e = this.hMonthDays(z, t);
      for (let n = 1; n <= e; n++) L.push({ k: 1e4 * z + 100 * t + n, lab: String(n) + " " + s[t - 1], cap: 1 });
      ((W = O(z, t) || e), (N = s[t - 1] + " " + z + " هـ"));
    }
    const j = [
      ["fajr", "الفجر"],
      ["dhuhr", "الظهر"],
      ["asr", "العصر"],
      ["maghrib", "المغرب"],
      ["isha", "العشاء"],
    ];
    let I = 0,
      R = 0,
      G = 0,
      Z = 0,
      H = 0,
      Y = 0,
      K = 0,
      U = 0,
      X = 0;
    const J = {};
    j.forEach((t) => (J[t[0]] = 0));
    const V = {},
      q = {};
    P.forEach((t) => {
      (t.rec.ap && H++,
        (V[B ? t.k : t.km] = (V[B ? t.k : t.km] || 0) + 1),
        (t.rec.d || []).forEach((e) => {
          if (!e) return;
          const s = Array.isArray(e.zones) ? e.zones : [];
          ((I += s.length),
            (R += Array.isArray(e.gates) ? e.gates.length : 0),
            (G += Array.isArray(e.paths) ? e.paths.length : 0),
            (Z += Array.isArray(e.marks) ? e.marks.length : 0),
            s.forEach((e) => {
              (K++,
                j.forEach((s) => {
                  const n = ((t, e) => {
                    if (!t) return null;
                    const s = t.pc && "object" == typeof t.pc ? t.pc : null;
                    if (s) {
                      const t = s[e];
                      return null == t || "" === t ? null : t;
                    }
                    return "fajr" === e && null != t.count && "" !== t.count ? t.count : null;
                  })(e, s[0]);
                  if (null == n) return;
                  (J[s[0]]++, Y++, (q[B ? t.k : t.km] = (q[B ? t.k : t.km] || 0) + 1));
                  const i = ((t) => {
                    if (null == t) return null;
                    if ("object" == typeof t) {
                      const e = +t.cap || 0,
                        s = null == t.n || "" === t.n ? null : +t.n;
                      return e > 0 && null != s ? (s / e) * 100 : null == t.p ? null : +t.p;
                    }
                    const e = +t;
                    return isFinite(e) ? Math.max(0, e) : null;
                  })(n);
                  null != i && isFinite(i) && ((U += i), X++);
                }));
            }));
        }));
    });
    const Q = P.length,
      _ = X ? Math.round((U / X) * 10) / 10 : 0,
      $ =
        (P.length && P[P.length - 1],
        "dy" === g
          ? (() => {
              try {
                return this._kDataDy(
                  P,
                  P.map((t) => t.d),
                );
              } catch (t) {
                try {
                  console.error("[kpi] dy", t);
                } catch (t) {}
                return null;
              }
            })()
          : null),
      tt = $
        ? [
            {
              dot: "#b99751",
              n: "أيام مسجّلة",
              v: r($.repDays),
              p: W ? "من " + a(W) : "",
              tip:
                "أيام أُنشئ فيها تقرير يومي: " +
                r($.repDays) +
                " من " +
                W +
                " في الفترة · اليوم غير المسجّل خارج كل الحسابات — فجوة تسجيل لا حضور.",
            },
            {
              dot: "#25343F",
              n: "تقارير ورديات",
              v: r($.shN),
              p: $.shN ? r($.shAp) + " معتمد" : "",
              tip: "تقارير الورديات المسحوبة: " + r($.shN) + " — المعتمد منها " + r($.shAp) + " · المعتمد وحده سجلٌ نهائي يُحاسَب عليه.",
            },
            {
              dot: "#8A6F35",
              n: "المسحوبون",
              v: r($.tot),
              p: "",
              tip: "مجموع أسطر الروسترات في كل التقارير: " + r($.tot) + " · القاعدة التي تُنسب إليها كل الحالات.",
            },
            {
              dot: "#047857",
              n: "الحضور الفعلي",
              v: r($.pr),
              p: o($.prP) + "٪",
              tip: "الحاضرون فعلاً: " + r($.pr) + " من " + r($.tot) + " = " + o($.prP) + "٪ · صافي القوة بعد الغياب والأعذار والراحات.",
            },
            {
              dot: "#b91c1c",
              n: "غياب",
              v: r($.ab),
              p: o($.abP) + "٪",
              tip: "غياب بلا عذر: " + r($.ab) + " (" + o($.abP) + "٪) · أول أرقام المساءلة اليومية.",
            },
            {
              dot: "#C9702A",
              n: "استئذان",
              v: r($.pm),
              p: o($.pmP) + "٪",
              tip: "خرجوا بإذنٍ أثناء الوردية: " + r($.pm) + " (" + o($.pmP) + "٪) · غياب جزئي نظامي.",
            },
            {
              dot: "#0e7490",
              n: "إجازة",
              v: r($.lv),
              p: o($.lvP) + "٪",
              tip: "إجازات مؤشَّرة في التقرير اليومي: " + r($.lv) + " (" + o($.lvP) + "٪) · غياب نظامي معلوم مسبقاً.",
            },
            {
              dot: "#4a97cf",
              n: "التسكين",
              v: r($.L.plcT),
              p: "من احتياج " + r($.L.needT) + " · آخر جولة",
              tip:
                "آخر يومٍ مسجّل بجولة (اليوم " +
                ($.L.day || "—") +
                "): المسكَّنون " +
                r($.L.plcT) +
                " من احتياج " +
                r($.L.needT) +
                " (" +
                o($.L.covP) +
                "٪) · حال الميدان الآن لا مجموعُ أيامٍ متراكمة.",
            },
            {
              dot: "#d9793a",
              n: "العجز",
              v: r($.L.gapT),
              p: $.L.needT ? o(100 - $.L.covP) + "٪" : "",
              tip:
                "احتياج آخر جولة − مسكَّنوها = " +
                r($.L.needT) +
                " − " +
                r($.L.plcT) +
                " = " +
                r($.L.gapT) +
                " · خانات مكشوفة الآن قبل أي غياب.",
            },
            {
              dot: "#7b8a94",
              n: "أبواب مغلقة",
              v: r($.L.gClosed),
              p: $.L.gTot ? "من " + KIVO.BassamCount(r($.L.gTot), "باب", "g") + " · آخر جولة" : "",
              tip:
                "أبواب مغلقة في آخر جولة (اليوم " +
                ($.L.day || "—") +
                "): " +
                r($.L.gClosed) +
                " من " +
                r($.L.gTot) +
                " · أسباب الإغلاق عبر الفترة كلها في لوحة الأبواب المغلقة أدناه.",
            },
          ]
        : [
            { dot: "#b99751", n: "أيام مسجّلة", v: r(Q), p: W ? "من " + a(W) : "" },
            { dot: "#25343F", n: "المصليات", v: r(I), p: "" },
            { dot: "#4a97cf", n: "الأبواب", v: r(R), p: "" },
            { dot: "#2fa372", n: "المسارات", v: r(G), p: "" },
            { dot: "#d9793a", n: "المعالم", v: r(Z), p: "" },
            { dot: "#8A6F35", n: "القراءات", v: r(Y), p: K ? "من " + r(5 * K) : "" },
            { dot: "#047857", n: "متوسط الإشغال", v: o(_) + "٪", p: "" },
            { dot: "#7b8a94", n: "أيام معتمدة", v: r(H), p: Q ? "(" + o((H / Q) * 100) + "٪)" : "" },
          ],
      et = (t) => ({
        dot: "width:7px;height:7px;border-radius:2px;flex-shrink:0;background:" + t.dot,
        n: t.n,
        v: t.v,
        p: t.p,
        tip: t.tip || "",
      }),
      st = tt
        .filter((t) => this._kTickOn(t.n))
        .map(et)
        .concat(tt.filter((t) => this._kTickOn(t.n)).map(et)),
      nt = (t) => (B ? q[t.k] || 0 : V[t.k] || 0),
      it = Math.max(1, ...L.map(nt));
    return (
      B ||
        L.map((t) => {
          const e = nt(t),
            s = Math.round((e / it) * 100);
          return {
            name: t.lab,
            txt: e ? KIVO.BassamCount(e, "يوم") + "" : "—",
            col: e ? "#8A6F35" : "#cbd5e1",
            bar:
              "height:100%;width:" +
              s +
              "%;background:" +
              (e ? "linear-gradient(90deg,#8A6F35,#b99751)" : "transparent") +
              ";border-radius:9999px",
          };
        }),
      B &&
        L.map((t) => {
          const e = nt(t),
            s = e > 0,
            n = s ? Math.max(0.22, e / it) : 0;
          return {
            d: String(t.k % 100),
            v: s ? String(e) : "—",
            tip: t.lab + (s ? " — " + e + " قراءة إشغال" : " — لا جولة مسجّلة"),
            box:
              "width:52px;padding:7px 4px;border-radius:10px;text-align:center;flex-shrink:0;border:1px solid " +
              (s ? "rgba(138,111,53," + (0.25 + 0.4 * n).toFixed(2) + ")" : "#EFF1F4") +
              ";background:" +
              (s ? "rgba(185,151,81," + (0.08 + 0.34 * n).toFixed(2) + ")" : "#FAFBFC") +
              ";color:" +
              (s ? "var(--fg-x8a6f35)" : "var(--fg-xcbd5e1)"),
          };
        }),
      {
        dsKpiYear: A ? "all" : String(z),
        dsYearOpts: [{ v: "all", lbl: "كل السنوات" }].concat(x.map((t) => ({ v: String(t), lbl: t + " هـ" }))),
        dsSetYear: (t) => this.setState({ [b]: "all" === t.target.value ? "all" : +t.target.value, [k]: null, [v]: null }),
        dsKpiMonth: M,
        dsMonthOpts: A
          ? [{ v: "all", lbl: "كل الأشهر" }]
          : E.map((t) => {
              return { v: String(t), lbl: s[t - 1] + " (" + ((e = t), (e < 10 ? "0" + e : "" + e) + ")") };
              var e;
            }).concat([{ v: "all", lbl: "كل أشهر السنة" }]),
        dsSetMonth: (t) => this.setState({ [k]: t.target.value, [v]: null }),
        dsYmBoxStyle:
          "display:flex;align-items:center;gap:7px;border:1px solid " +
          ("custom" === F ? "#E6E9ED" : "rgba(185,151,81,.45)") +
          ";background:" +
          ("custom" === F ? "#F8F9FB" : "rgba(185,151,81,.07)") +
          ";border-radius:12px;padding:4px 11px;flex-shrink:0;opacity:" +
          ("custom" === F ? ".55" : "1"),
        dsModeOpts: [
          {
            lbl: "نطاق مخصص",
            style:
              ((ot = "custom" === F),
              "border:0;font-family:'Cairo',sans-serif;font-size:11px;font-weight:600;padding:6px 12px;border-radius:8px;cursor:pointer;white-space:nowrap;" +
                (ot
                  ? "background:var(--bg-xffffff);color:var(--fg-x8a6f35);box-shadow:var(--shadow-card)"
                  : "background:transparent;color:var(--fg-x94a3b8)")),
            click: () => this.setState({ [v]: "custom" === F ? null : "custom", [w]: t[w] || p(C - 29 * n), [S]: t[S] || p(C) }),
          },
        ],
        dsCustomOn: "custom" === F,
        dsFrom: "custom" === F ? p(D) : "",
        dsTo: "custom" === F ? p(T) : "",
        dsSetFrom: (t) => this.setState({ [w]: t.target.value, [v]: "custom" }),
        dsSetTo: (t) => this.setState({ [S]: t.target.value, [v]: "custom" }),
        dsRangeHint: "custom" === F ? "= " + a(W) : "",
        dsPerLbl: N,
        dsTicker: st,
        dsPeriodTxt:
          "الفترة: " +
          N +
          " · " +
          a(W) +
          " · " +
          ($
            ? KIVO.BassamCount($.repDays, "يوم|مسجّل") +
              " · " +
              KIVO.BassamCount($.shN, "تقرير وردية") +
              " · " +
              KIVO.BassamCount($.tot, ["مسحوب واحد", "مسحوبان", "مسحوبَين", "مسحوبين", "مسحوباً", "مسحوب"])
            : KIVO.BassamCount(Q, "يوم|مسجّل") + " · " + Y + " قراءة إشغال"),
        ...(() => {
          const t = this._dsTabOn("kpiDaily"),
            e = this._dsTabOn("kpiOcc"),
            s = this._dsTabOn("kpiZones"),
            n = !(!this.props || -1 === ["kpiDaily", "kpiOcc", "kpiZones"].indexOf(this.props.solo)),
            i = g,
            o = (t) =>
              "position:relative;min-width:210px;padding:11px 20px;border-radius:12px;cursor:pointer;transition:all .25s;text-align:center;font-family:'Cairo',sans-serif;border:1px solid " +
              (t
                ? "rgba(185,151,81,0.45);background:var(--bg-xffffff);box-shadow:0 3px 10px -4px rgba(138,111,53,0.45)"
                : "transparent;background:transparent"),
            r = (t) =>
              "display:block;font-size:12.5px;line-height:1.3;transition:color .3s;" +
              (t ? "font-weight:700;color:var(--fg-xb99751)" : "font-weight:400;color:var(--fg-x53565a)");
          let a = null;
          try {
            if (((this._kpiSelLast = P), (this._kpiPerLbl = N), "dy" === i))
              a = this._h2n(
                this._kPaneDy(
                  $ ||
                    this._kDataDy(
                      P,
                      P.map((t) => t.d),
                    ),
                  N,
                ),
                "kpi_dy",
              );
            else {
              const t = this._kData(
                P,
                P.map((t) => t.d),
              );
              a = this._h2n("zn" === i ? this._kPaneZn(t) : this._kPaneOv(t, N), "kpi_" + i);
            }
          } catch (t) {
            try {
              console.error("[kpi] build", t);
            } catch (t) {}
            a = React.createElement(
              "div",
              {
                key: "kerr",
                style: {
                  border: "1px solid var(--bd-xe1e1e1)",
                  borderRadius: 16,
                  background: "var(--bg-xffffff)",
                  padding: "34px 20px",
                  textAlign: "center",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--fg-xb91c1c)",
                },
              },
              "تعذّر بناء اللوحة — راجع الكونسول",
            );
          }
          return {
            dsKpiDyShow: t && !n,
            dsKpiOvShow: e && !n,
            dsKpiZnShow: s && !n,
            dsKpiSubBarShow: (t ? 1 : 0) + (e ? 1 : 0) + (s ? 1 : 0) > 1,
            dsKpiOnDy: "dy" === i,
            dsKpiOnOv: "ov" === i,
            dsKpiOnZn: "zn" === i,
            dsKpiDyStyle: o("dy" === i),
            dsKpiDyLbl: r("dy" === i),
            dsKpiOvStyle: o("ov" === i),
            dsKpiOvLbl: r("ov" === i),
            dsKpiZnStyle: o("zn" === i),
            dsKpiZnLbl: r("zn" === i),
            dsKpiGoDy: () => this.setState({ dsKpiSub: "dy" }),
            dsKpiGoOv: () => this.setState({ dsKpiSub: "ov" }),
            dsKpiGoZn: () => this.setState({ dsKpiSub: "zn" }),
            dsKpiNode: a,
          };
        })(),
      }
    );
    var ot;
  }
  renderVals() {
    this._bsHR();
    const t = this._dsPermVals(),
      e = (t) => {
        try {
          t && null != t.pointerId && t.currentTarget.setPointerCapture && t.currentTarget.setPointerCapture(t.pointerId);
        } catch (t) {}
      },
      s = this.state,
      n = "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7",
      i =
        "M10.7 5.1A9.9 9.9 0 0 1 12 5c6.5 0 10 7 10 7a13.2 13.2 0 0 1-1.7 2.7M6.6 6.6A13.5 13.5 0 0 0 2 12s3.5 7 10 7a9.8 9.8 0 0 0 5.4-1.6M14.1 14.1a3 3 0 1 1-4.2-4.2M2 2l20 20",
      o = (t) =>
        "width:32px;height:32px;border-radius:9px;border:0;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;background:transparent;color:" +
        (t ? "var(--fg-x9a7e40)" : "var(--fg-x94a3b8)"),
      r = (t) => (e) => {
        e && e.stopPropagation && e.stopPropagation();
        const s = "paths" === t ? "hidePaths" : "zones" === t ? "hideZones" : "hideGates";
        (this.setState({ dsClear2: null }),
          this._updRoundAt(this.state.floor >= 0 ? this.state.floor : 0, (t) => {
            t[s] = !t[s];
          }));
      },
      a = Array.isArray(s.selMulti) ? s.selMulti : [],
      l = s.dsSel ? s.dsSel.t : null,
      d = a.length > 1,
      p = ((t) => {
        const e =
          {
            zone: ["مصلى واحد", "مصلّيان", "مصليات", "مصلًّى", "مصلى"],
            gate: ["باب واحد", "بابان", "أبواب", "باباً", "باب"],
            path: ["مسار واحد", "مساران", "مسارات", "مساراً", "مسار"],
            mark: ["معلم واحد", "معلمان", "معالم", "معلماً", "معلم"],
          }[l] || null;
        return e ? KIVO.BassamCount(t, [e[0], e[1], e[1], e[2], e[3], e[4]]) : String(t);
      })(a.length),
      h = !!s.mapFs,
      c = (() => {
        try {
          return "dark" === document.documentElement.getAttribute("data-theme");
        } catch (t) {
          return !1;
        }
      })(),
      g = (() => {
        try {
          return this.hParts(new Date());
        } catch (t) {
          return KIVO.BassamHijri ? KIVO.BassamHijri.now() : { y: 1448, m: 2, d: 1 };
        }
      })(),
      f = s.floor >= 0 ? s.floor : 0,
      u = this.hMonthDays(s.year, s.month),
      y = !(+s.day >= 1),
      m = Math.min(s.day, u);
    let x = null;
    try {
      x = this._opRead("bassam_plan_v1");
    } catch (t) {}
    const b = this.MONTHS.map((t, e) => {
        const n = e + 1,
          i = s.month === n,
          o = s.year === g.y && n === g.m,
          r = Object.keys(s.rounds || {}).filter((t) => 0 === t.indexOf(s.year + "-" + n + "-")).length > 0,
          a = this.isMonthAp(s.rounds, s.year, n),
          l = (() => {
            const t = (s.rounds || {})[this.mKey(s.year, n)];
            return !(!t || !t.ap);
          })(),
          d = a && !l,
          p = l,
          h = this.monthDaysAllAp(s.rounds, s.year, n);
        let c =
            "position:relative;width:100%;border-radius:12px;padding:8px;text-align:center;transition:all .2s;box-shadow:var(--shadow-card);cursor:pointer;box-sizing:border-box;font-family:'Cairo',sans-serif;border:1px ",
          f = "#53565a",
          u = "#cbd5e1",
          y = "—",
          m = !1,
          x = "M12 3a9 9 0 0 1 9 9",
          b = "M12 21a9 9 0 0 1-9-9";
        p
          ? ((c +=
              (i ? "solid #008450;box-shadow:0 0 0 2px rgba(0,132,80,0.25);" : "solid rgba(0,132,80,0.35);") +
              "background:var(--bg-a0132800p07)"),
            (f = "#047857"),
            (u = "#047857"),
            (y = "معتمد ومقفل"),
            (m = !0),
            (x = "M7 11V7a5 5 0 0 1 10 0v4"),
            (b = "M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z"))
          : d && h
            ? ((c +=
                (i ? "solid #0e7490;box-shadow:0 0 0 2px rgba(14,116,144,0.25);" : "solid rgba(14,116,144,0.4);") +
                "background:var(--bg-a141161440p07)"),
              (f = "#0e7490"),
              (u = "#0e7490"),
              (y = "مكتمل — مقفل"),
              (m = !0),
              (x = "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"),
              (b = "m9 12 2 2 4-4"))
            : d
              ? ((c +=
                  (i ? "solid #64748b;box-shadow:0 0 0 2px rgba(100,116,139,0.25);" : "solid rgba(100,116,139,0.35);") +
                  "background:var(--bg-a1001161390p08)"),
                (f = "#475569"),
                (u = "#475569"),
                (y = "انقضى — مقفل"),
                (m = !0),
                (x = "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"),
                (b = ""))
              : r
                ? ((c +=
                    (i ? "solid #b99751;box-shadow:0 0 0 2px rgba(185,151,81,0.3);" : "solid rgba(245,158,11,0.35);") +
                    "background:var(--bg-a245158110p08)"),
                  (f = i ? "#b99751" : "#b45309"),
                  (u = "#b45309"),
                  (y = "مسودة"),
                  (m = !0),
                  (x = "M7 11V7a5 5 0 0 1 9.9-1"),
                  (b = "M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z"))
                : i
                  ? ((c += "solid #b99751;box-shadow:0 0 0 2px rgba(185,151,81,0.3);background:var(--bg-a185151810p06)"),
                    (f = "#b99751"),
                    (u = "#cbd5e1"),
                    (y = "—"),
                    (m = !1))
                  : (c += "dashed #E1E1E1;background:var(--bg-a2452452450p7);opacity:.9");
        const k = l
          ? "الشهر معتمد ومقفل — كل أيامه للعرض فقط · نقرة مزدوجة لفتح الشهر"
          : d
            ? (h ? "كل أيام الشهر معتمدة — مكتمل ومقفل بانقضائه (لم يُعتمد الشهر بعد)" : "الشهر انقضى — مقفل (غير معتمد)") +
              " · نقرة مزدوجة لفتحه للاستدراك"
            : r
              ? h
                ? "كل أيام الشهر معتمدة — نقرة مزدوجة لاعتماد الشهر وقفله"
                : "الشهر مسودة — نقرة مزدوجة لاعتماده وقفل كل أيامه"
              : "لا توجد جولات في هذا الشهر بعد";
        return {
          name: t,
          greg: this.hGregMonthLabel(s.year, n) || this.GREG[e],
          style: c,
          nameColor: f,
          footColor: u,
          footLabel: y,
          footP1: x,
          footP2: b,
          footIcon: m,
          isCurrent: o,
          showBadge: !1,
          isMAp: a,
          tip: k,
          dbl: (t) => {
            t.stopPropagation();
            const e = Object.keys(this.state.rounds || {}).some((t) => 0 === t.indexOf(s.year + "-" + n + "-"));
            this.setState(
              {
                month: n,
                day: this.state.year === g.y && n === g.m ? g.d : 0,
                dsSel: null,
                selMulti: [],
                zassign: null,
                zdens: null,
                roundAdd: !1,
                roundLock: null,
              },
              () => {
                if (this.monthPastDS(s.year, n))
                  return this._mOpenFlag(s.year, n)
                    ? l || !e
                      ? void this.setState({ retroAsk: { m: n, open: !1 } })
                      : void this.setState({ mLock2: { n: n, locked: !1 } })
                    : l
                      ? void this.setState({ mLock2: { n: n, locked: !0 } })
                      : void this.setState({ retroAsk: { m: n, open: !0 } });
                l ? this.setState({ mLock2: { n: n, locked: !0 } }) : e && this.setState({ mLock2: { n: n, locked: !1 } });
              },
            );
          },
          click: () => this.setState((t) => ({ month: n, day: t.year === g.y && n === g.m ? g.d : 0, roundAdd: !1 })),
        };
      }),
      k = [],
      v = (t) => {
        const e = s.year + "-" + s.month + "-" + t;
        return Object.keys(s.rounds || {}).some((t) => t === e || 0 === t.indexOf(e + "-"));
      };
    let w = 0;
    const S = this.hGreg(s.year, s.month, 1),
      A = new Date(S.getFullYear(), S.getMonth(), S.getDate(), 12);
    for (let t = 1; t <= u; t++) v(t) && w++;
    const z = this.isMonthAp(s.rounds, s.year, s.month),
      E = (() => {
        const t = (s.rounds || {})[this.mKey(s.year, s.month)];
        return !(!t || !t.ap);
      })(),
      M = z && !E;
    for (let t = 1; t <= u; t++) {
      const e = v(t) ? "c" : "e",
        n = (s.rounds || {})[s.year + "-" + s.month + "-" + t],
        i = !(!n || !n.ap),
        o = this.dayLockedDS(s.rounds, s.year, s.month, t),
        r = z || i || o,
        a = t === m,
        l = s.year === g.y && s.month === g.m && t === g.d;
      let d = "#fff",
        p = "#53565a",
        h = "2px solid #E1E1E1";
      ("c" === e
        ? ((d = E || i ? "#047857" : o || M ? "#64748b" : "#b99751"), (p = "#fff"), (h = "2px solid transparent"))
        : "p" === e && ((d = "rgba(185,151,81,0.4)"), (p = "#fff"), (h = "2px solid transparent")),
        "e" === e && o && ((d = "rgba(148,163,184,0.12)"), (p = "#94a3b8")),
        a && (h = "2px solid #b99751"));
      const c = new Date(A.getTime() + 864e5 * (t - 1));
      let f = "";
      try {
        f = c.toLocaleDateString("ar-u-ca-gregory-nu-latn", { day: "numeric", month: "long", year: "numeric" });
      } catch (t) {}
      const u = "c" === e,
        y = this.dayPastDS(s.year, s.month, t) && this.isDayOpen(s.rounds, s.year, s.month, t);
      k.push({
        num: String(t),
        isToday: l,
        hasR: u,
        isAp: r,
        lockClosed: r,
        lockOpen: !r && y,
        canReset: u && !r,
        dbl: (e) => {
          if ((e.stopPropagation(), E)) return void this.bsToast("الشهر معتمد ومقفل — افتحه أولاً بنقرة مزدوجة على كرت الشهر", "warn");
          const n = this.dayLockedDS(this.state.rounds, s.year, s.month, t);
          this.setState({ day: t, dsSel: null, selMulti: [] }, () => this.setState({ retroAsk: { m: s.month, d: t, open: n } }));
        },
        resetTip: "إعادة تهيئة اليوم " + t,
        reset: (e) => {
          if ((e.stopPropagation(), this.isMonthAp(this.state.rounds, s.year, s.month) || o)) return;
          const n = (this.state.rounds || {})[s.year + "-" + s.month + "-" + t];
          (n && n.ap) ||
            this.setState({
              resetDay: { d: t, label: "يوم " + t + " " + (this.MONTHS[s.month - 1] || "") + " " + s.year + " هـ" },
              resetDayAck: !1,
            });
        },
        gnum: String(c.getDate()),
        sepStyle:
          "display:block;width:9px;height:1px;flex-shrink:0;margin:1px 0;background:" +
          ("c" === e ? "rgba(255,255,255,0.5)" : "rgba(148,163,184,0.55)"),
        tip:
          "يوم " +
          t +
          " هـ — الموافق " +
          f +
          " م — " +
          ("c" === e
            ? E
              ? "الشهر معتمد ومقفل — افتح الشهر لتعديل اليوم"
              : M
                ? "الشهر انقضى ومقفل — نقرة مزدوجة على بطاقة الشهر لفتحه"
                : i
                  ? "جولة معتمدة ومقفلة — نقرة مزدوجة لفتحها"
                  : o
                    ? "اليوم انقضى — مقفل · نقرة مزدوجة لفتحه للاستدراك"
                    : "جولة مسودة — نقرة مزدوجة لاعتمادها وقفلها"
            : o
              ? "فارغ — انقضى ومقفل · نقرة مزدوجة لفتحه وتسجيل جولة بأثر رجعي"
              : "فارغ"),
        click: () => this.setState({ day: t, dsSel: null, selMulti: [], dsHovZ: null, dsHovG: null }),
        style:
          "position:relative;height:24px;flex:1 1 auto;min-width:28px;padding:0 3px;border-radius:4px;font-size:8px;font-weight:" +
          (a ? "900" : "700") +
          ";display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;user-select:none;background:" +
          d +
          ";color:" +
          p +
          ";border:" +
          h +
          (a ? ";box-shadow:var(--shadow-card);z-index:10" : "") +
          (l && !a ? ";box-shadow:0 0 0 2px rgba(185,151,81,0.7)" : ""),
      });
    }
    let O = [],
      F = [];
    try {
      x &&
        Array.isArray(x.floors) &&
        x.floors.length &&
        ((F = x.floors), (O = x.floors.map((t) => [t.name || "موقع", "", (t.zones || []).length])));
    } catch (t) {}
    const C = { men: "#22c55e", women: "#93c5fd", service: "#374151" },
      D = { men: "مصليات الرجال", women: "مصليات النساء", service: "خدمات" },
      T = s.year;
    let P = null,
      L = !1;
    try {
      if (x && x.months) {
        const t = x.months[T + "-" + s.month],
          e = t ? (Array.isArray(t) ? t : t.d) : null;
        Array.isArray(e) && ((P = e), (L = !0));
      }
    } catch (t) {}
    const B = !!(P && P.length > 0),
      N = T + "-" + s.month + "-" + m,
      W = (() => {
        const t = this._drAp9;
        if (t && t.k === N) return t.m;
        const e = {};
        try {
          const t = (this._opRead("bassam_dreport_v1") || {} || {})[N];
          t &&
            t.shifts &&
            Object.keys(t.shifts).forEach((s) => {
              ((e[s] = !!(t.shifts[s] || {}).ap), (t.shifts[s] || {}).pulled && ((e.__pulled = e.__pulled || {}), (e.__pulled[s] = 1)));
            });
        } catch (t) {}
        return ((this._drAp9 = { k: N, m: e }), e);
      })(),
      j = (() => {
        try {
          const t =
            (KIVO.BassamDayShift && KIVO.BassamDayShift.get(T, s.month, m)) ||
            null;
          if (t) return t;
          const e = Object.keys(W).filter((t) => "__pulled" !== t && (W[t] || (W.__pulled && W.__pulled[t])));
          if (1 === e.length && KIVO.BassamDayShift) {
            const t = e[0];
            return (
              setTimeout(async () => {
                try {
                  KIVO.BassamDayShift.get(T, s.month, m) ||
                    (await this._selectDayShift(T, s.month, m, t));
                } catch (error) {}
              }, 0),
              t
            );
          }
          return null;
        } catch (t) {
          return null;
        }
      })(),
      I = !(!j || !(W[j] || (W.__pulled && W.__pulled[j]))),
      R = (s.rounds || {})[N],
      G = (() => {
        const t = (s.rounds || {})[this.mKey(T, s.month)];
        return !(!t || !t.ap);
      })(),
      Z = this.dayLockedDS(s.rounds, T, s.month, m),
      H = G || Z || !(!R || !R.ap),
      Y = this.dayPastDS(T, s.month, m),
      K = !(!R || !R.ap),
      U = R && Array.isArray(R.d) ? R.d : null,
      X =
        (U && U.map((t) => !(!t || !t.ap)), G || Z || !!(U && U[f] && U[f].ap)),
      J = H || X,
      V = R && R.shAp && j ? R.shAp[j] : null,
      q = !!(V && V.ap && Array.isArray(V.snap)),
      Q = !(!U || J || q);
    let _ = U ? U[f] || { zones: [], gates: [], paths: [] } : P ? P[f] || { zones: [], gates: [], paths: [] } : null;
    q && (_ = V.snap[f] || { zones: [], gates: [], paths: [], marks: [] });
    const $ = !(_ && !0 === _.hidePaths),
      tt = !(_ && !0 === _.hideZones),
      et = !(_ && !0 === _.hideMarks),
      st = [
        ["fajr", "الفجر", ["M12 2v6", "m8 6 4-4 4 4", "M2 18h20", "M16 18a4 4 0 0 0-8 0", ""]],
        ["dhuhr", "الظهر", ["M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9", "M12 2v2.5", "M12 19.5V22", "M2 12h2.5", "M19.5 12H22"]],
        ["asr", "العصر", ["M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8", "m16.9 7.1 1.8-1.8", "M19.5 12H22", "m16.9 16.9 1.8 1.8", "M12 19.5V22"]],
        ["maghrib", "المغرب", ["M12 10V4", "m8 6 4 4 4-4", "M2 18h20", "M16 18a4 4 0 0 0-8 0", ""]],
        ["isha", "العشاء", ["M20.99 13A9 9 0 1 1 11 3a7 7 0 0 0 9.99 10", "", "", "", ""]],
      ],
      nt = st.some((t) => t[0] === s.prayer) ? s.prayer : "fajr",
      it = (st.find((t) => t[0] === nt) || st[0])[1],
      ot = (t, e) => {
        if (!t) return null;
        const s = t.pc && "object" == typeof t.pc ? t.pc : null;
        if (s) {
          const t = s[e];
          return null == t || "" === t ? null : t;
        }
        return "fajr" === e && null != t.count && "" !== t.count ? t.count : null;
      },
      rt = (() => {
        const t = {};
        try {
          (
            (((this._opRead("bassam_plan_v1") || {}).floors || [])[f] || {})
              .zones || []
          ).forEach((e) => {
            const s = +e.cap;
            null != e.code && s > 0 && void 0 === t[e.code] && (t[e.code] = s);
          });
        } catch (t) {}
        return t;
      })(),
      at = (t) => {
        const e = +(t || {}).cap;
        if (e > 0) return e;
        const s = t && null != t.code ? +rt[t.code] : 0;
        return s > 0 ? s : null;
      },
      lt = (_ && _.zones) || [],
      dt = {};
    (st.forEach((t) => {
      dt[t[0]] = lt.filter((e) => null != ot(e, t[0])).length;
    }),
      _ &&
        (_ = {
          ..._,
          zones: lt.map((t) => {
            const e = ((t, e) => {
              const s = ot(t, e);
              if (null == s) return null;
              if ("object" == typeof s) {
                const t = +s.cap || 0,
                  e = null == s.n || "" === s.n ? null : +s.n;
                return { n: e, cap: t, pct: t > 0 && null != e ? Math.round((e / t) * 1e3) / 10 : null == s.p ? null : +s.p };
              }
              const n = Math.max(0, +s) || 0,
                i = at(t) || 0;
              return { n: i > 0 ? Math.round((i * n) / 100) : null, cap: i, pct: n };
            })(t, nt);
            return { ...t, count: e ? e.pct : null, nNow: e ? e.n : null, capNow: e && e.cap > 0 ? e.cap : at(t) || 0 };
          }),
        }));
    const pt = U || P || [],
      ht = O.map((t, e) => {
        const n = f === e,
          i = pt[e] && Array.isArray(pt[e].zones) ? pt[e].zones.length : 0,
          o = pt[e] && Array.isArray(pt[e].gates) ? pt[e].gates.length : 0,
          r = F[e] || {},
          a = (U && U[e]) || {},
          l = !!r.approved,
          d = G || !!(U && U[e] && U[e].ap),
          p = !!U && !G;
        return {
          name: t[0],
          zones: (i > 0 ? KIVO.BassamCount(i, "مصلى") + "" : "—") + (o > 0 ? " · " + KIVO.BassamCount(o, "باب") + "" : ""),
          selected: n,
          eyeTip: a.showCodes
            ? "التسميات ظاهرة — يظهر منها ما فعّلته على كل عنصر. اضغط لإخفائها كلها"
            : "إظهار التسميات على خريطة هذا الموقع — يظهر ما فعّلته على المصليات والأبواب والمسارات",
          eyeSlash: a.showCodes ? "" : "M2 2 22 22",
          eyeStyle:
            "width:22px;height:22px;border-radius:6px;border:0;background:transparent;color:" +
            (a.showCodes ? "var(--fg-xb99751)" : "var(--fg-x94a3b8)") +
            ";cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0",
          eyeToggle: (t) => {
            (t && t.stopPropagation && t.stopPropagation(),
              this._updRoundAt(e, (t) => {
                t.showCodes = !t.showCodes;
              }),
              this.setState((t) => ({ planTick: (t.planTick || 0) + 1 })));
          },
          canEditF: !d && !l,
          canDel: O.length > 1 && !d && !l,
          lockP1: d ? "M7 11V7a5 5 0 0 1 10 0v4" : "M7 11V7a5 5 0 0 1 9.9-1",
          apprvTip: G
            ? "الشهر معتمد ومقفل — كل مواقعه للعرض فقط · افتح الشهر بنقرة مزدوجة على كرته"
            : U
              ? d
                ? "الموقع معتمد في جولة اليوم — قراءاته وتسكينه للعرض فقط · اضغط القفل لفتحه"
                : "اعتماد هذا الموقع في جولة اليوم — لا يتأثر باقي المواقع · باعتماد كل المواقع يُعتمد اليوم آلياً"
              : "لا توجد جولة لهذا اليوم بعد",
          apprvStyle:
            "flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:6px;transition:all .15s;" +
            (p ? "cursor:pointer;" : "cursor:default;opacity:.55;") +
            "border:1px solid " +
            (d
              ? "rgba(0,132,80,0.4);background:var(--bg-a0132800p12);color:var(--fg-x008450)"
              : "rgba(225,225,225,0.9);background:var(--bg-xffffff);color:var(--fg-x94a3b8)"),
          approveToggle: (t) => {
            if ((t && t.stopPropagation && t.stopPropagation(), !this.PC("approve"))) return void this.permDeny();
            if (!U || G) return;
            const n = { ...(this.state.rounds || {}) },
              i = n[N];
            if (!i || !Array.isArray(i.d)) return;
            const o = i.d.slice(),
              r = o[e] || { zones: [], gates: [], paths: [] };
            o[e] = { ...r, ap: r.ap ? 0 : 1 };
            const a = o.length > 0 && o.every((t) => !(!t || !t.ap));
            if (((n[N] = { ...i, d: o, ap: a ? 1 : 0 }), a)) this.autoMonthAp(n, T, s.month);
            else {
              const t = this.mKey(T, s.month),
                e = n[t];
              e && e.auto && delete n[t];
            }
            (this.saveRounds(n), this.setState({ dsSel: null, selMulti: [], zassign: null, zdens: null }));
          },
          edit: (n) => {
            (n && n.stopPropagation && n.stopPropagation(),
              d ||
                this.setState({
                  siteModal: { mode: "edit", i: e, name: t[0], img: r.img || (s.fimgs || {})[e] || "", imgDirty: !1 },
                  siteLowRes: null,
                  siteErr: null,
                  fldOpen: !1,
                }));
          },
          del: (s) => {
            (s && s.stopPropagation && s.stopPropagation(),
              d || O.length <= 1 || this.setState({ delFloor: { i: e, name: t[0] }, delFloorAck: !1, delFloorErr: null, fldOpen: !1 }));
          },
          click: () => this.setState({ floor: e, fldOpen: !1, dsSel: null, selMulti: [], dsHovZ: null, dsHovG: null }),
          style:
            "display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;font-size:12px;cursor:pointer;transition:background .15s;font-family:'Cairo',sans-serif;" +
            (n ? "background:var(--bg-a185151810p08);color:var(--fg-x9a7e40);font-weight:600" : "color:var(--fg-x141414);font-weight:400"),
        };
      }),
      ct = (t) => {
        const e = (String(t).match(/-?\d+\.?\d*/g) || []).map(Number);
        let s = 0,
          n = 0,
          i = 0;
        for (let t = 0; t + 1 < e.length; t += 2) ((s += e[t]), (n += e[t + 1]), i++);
        return i ? [s / i, n / i] : [500, 300];
      },
      gt = (t, e) => (e ? "#94a3b8" : null == t || "" === t || t < 40 ? "#22c55e" : t < 75 ? "#e5b563" : t <= 100 ? "#ef4444" : "#991b1b"),
      ft = (() => {
        try {
          const t = this._opRead("bassam_zone_opts_v1");
          return t && t.zcatStyle && "object" == typeof t.zcatStyle
            ? t.zcatStyle
            : {};
        } catch (t) {
          return {};
        }
      })(),
      ut = Object.keys(ft),
      yt = !(
        !U ||
        J ||
        "zones" !== s.lens ||
        s.dsAsn ||
        !this.bsLensOn("zones") ||
        !this._dsCanWrite()
      ),
      mt = !(
        !U ||
        J ||
        "gates" !== s.lens ||
        s.dsAsn ||
        !this.bsLensOn("gates") ||
        !this._dsCanWrite()
      ),
      xt = !(
        !U ||
        J ||
        "marks" !== s.lens ||
        s.dsAsn ||
        !this.bsLensOn("marks") ||
        !this._dsCanWrite()
      ),
      bt = !!(_ || {}).showCodes,
      kt =
        "zones" === s.lens && _ && this.bsLensOn("zones")
          ? (_.zones || [])
              .map((t, e) => {
                const n = s.dsZoneTmp && s.dsZoneTmp.i === e ? { ...t, ...s.dsZoneTmp.z } : t,
                  i = n.code || "";
                if (!bt || n.hideLabel || !i) return null;
                const o = this._dsPtsHs(n.d).pts;
                if (!o || o.length < 3) return null;
                const r = o.map((t) => t.x),
                  a = o.map((t) => t.y),
                  l = Math.min(...r),
                  d = Math.max(...r),
                  p = Math.min(...a),
                  h = Math.max(...a),
                  c = d - l,
                  g = h - p;
                let u,
                  y,
                  m = 0,
                  x = 0,
                  b = 0;
                for (let t = 0; t < o.length; t++) {
                  const e = (t + 1) % o.length,
                    s = o[t].x * o[e].y - o[e].x * o[t].y;
                  ((m += s), (x += (o[t].x + o[e].x) * s), (b += (o[t].y + o[e].y) * s));
                }
                (Math.abs(m) > 1 ? ((u = x / (3 * m)), (y = b / (3 * m))) : ((u = (l + d) / 2), (y = (p + h) / 2)),
                  (u = Math.max(l + 0.12 * c, Math.min(d - 0.12 * c, u))),
                  (y = Math.max(p + 0.12 * g, Math.min(h - 0.12 * g, y))));
                const k = s.rotdrag,
                  v = !(!k || k.i !== e);
                let w;
                if ((!k && this._rotLab && (this._rotLab = null), v)) {
                  if (!this._rotLab) {
                    const t = this._zLabelFit(o);
                    t && (this._rotLab = { f: t, a0: k.ang || 0, fs: null, lang0: "number" == typeof n.lang ? n.lang : t.deg });
                  }
                  if (this._rotLab) {
                    const t = this._rotLab,
                      e = (k.ang || 0) - t.a0,
                      s = Math.cos(e),
                      n = Math.sin(e);
                    w = {
                      x: k.cx + (t.f.x - k.cx) * s - (t.f.y - k.cy) * n,
                      y: k.cy + (t.f.x - k.cx) * n + (t.f.y - k.cy) * s,
                      w: t.f.w,
                      h: t.f.h,
                      deg: t.lang0 + (180 * e) / Math.PI,
                    };
                  } else w = this._zLabelFit(o);
                } else ((w = this._zLabelFit(o)), w && "number" == typeof n.lang && (w.deg = n.lang));
                const S = w ? w.x : u,
                  A = w ? w.y : y,
                  z = w ? w.w : c,
                  E = w ? w.h : g,
                  M = w ? w.deg : 0;
                let O = Math.min(0.62 * E, (0.92 * z) / Math.max(1, 0.6 * i.length));
                ((O = Math.min(O, 17)), v && this._rotLab && null != this._rotLab.fs && (O = this._rotLab.fs));
                for (let t = 0; t < 26 && O > 1.2 && !this._boxFits(S, A, O * i.length * 0.6, 0.78 * O, M, o); t++) O *= 0.88;
                return (
                  O < 1.2 && (O = 1.2),
                  v && this._rotLab && null == this._rotLab.fs && (this._rotLab.fs = O),
                  "number" == typeof n.lsz && n.lsz > 0 && (O = n.lsz),
                  React.createElement(
                    "g",
                    { key: "zl" + f + "_" + e, style: { pointerEvents: "none" } },
                    React.createElement(
                      "text",
                      {
                        x: S,
                        y: A + 0.34 * O,
                        textAnchor: "middle",
                        fontSize: O,
                        fontWeight: 600,
                        fill: n.off ? "#64748b" : (n.yard && this.gateLocColor(n.yard)) || "#141414",
                        stroke: "#fff",
                        strokeWidth: Math.max(0.35, 0.16 * O),
                        strokeLinejoin: "round",
                        strokeOpacity: 0.92,
                        transform: w && Math.abs(w.deg) > 1 ? "rotate(" + w.deg.toFixed(1) + " " + S + " " + A + ")" : null,
                        style: { fontFamily: "'Almarai','Cairo',sans-serif", paintOrder: "stroke fill" },
                      },
                      i,
                    ),
                  )
                );
              })
              .filter(Boolean)
          : [],
      vt = (() => {
        const t = React.createElement,
          e = s.dview.w / 1e3,
          n = { fill: "rgba(185,151,81,0.15)", stroke: "#b99751", strokeWidth: 1.6 * e, strokeDasharray: 6 * e + " " + 4 * e },
          i = s.draft;
        if (i && yt) {
          if ("circle" === s.tool) {
            const e = Math.hypot(i.cx - i.x, i.cy - i.y);
            return t("circle", { cx: i.x, cy: i.y, r: Math.max(e, 0.1), ...n, style: { pointerEvents: "none" } });
          }
          if ("square" === s.tool) {
            const e = i.cx - i.x,
              s = i.cy - i.y,
              o = Math.max(Math.abs(e), Math.abs(s)),
              r = i.x + (e < 0 ? -o : o),
              a = i.y + (s < 0 ? -o : o);
            return t("rect", { x: Math.min(i.x, r), y: Math.min(i.y, a), width: o, height: o, ...n, style: { pointerEvents: "none" } });
          }
          return t("rect", {
            x: Math.min(i.x, i.cx),
            y: Math.min(i.y, i.cy),
            width: Math.abs(i.cx - i.x),
            height: Math.abs(i.cy - i.y),
            ...n,
            style: { pointerEvents: "none" },
          });
        }
        const o = s.dsPolyPts;
        if (yt && "poly" === s.tool && o.length > 0) {
          const n = s.dsPolyCursor,
            i = o.map((t) => t.x + "," + t.y).join(" ") + (n ? " " + n.x + "," + n.y : ""),
            r = n && o.length >= 3 && Math.hypot(n.x - o[0].x, n.y - o[0].y) <= 14 * e;
          return t(
            "g",
            { style: { pointerEvents: "none" } },
            t("polyline", {
              points: i,
              fill: "rgba(185,151,81,0.12)",
              stroke: "#b99751",
              strokeWidth: 1.6 * e,
              strokeDasharray: 6 * e + " " + 4 * e,
            }),
            o.map((s, n) =>
              t("circle", {
                key: "pp" + n,
                cx: s.x,
                cy: s.y,
                r: (0 === n && r ? 6 : 3.4) * e,
                fill: 0 === n && r ? "#16a34a" : "#b99751",
                stroke: "#fff",
                strokeWidth: 1.2 * e,
              }),
            ),
          );
        }
        if (yt && "path" === s.tool && o.length > 0) {
          const n = s.dsPolyCursor,
            i = o.map((t) => t.x + "," + t.y).join(" ") + (n ? " " + n.x + "," + n.y : ""),
            r = o[o.length - 1],
            a = n && o.length >= 2 && Math.hypot(n.x - r.x, n.y - r.y) <= 10 * e;
          return t(
            "g",
            { style: { pointerEvents: "none" } },
            t("polyline", {
              points: i,
              fill: "none",
              stroke: "#16a34a",
              strokeWidth: 1.8 * e,
              strokeDasharray: 6 * e + " " + 4 * e,
              strokeLinecap: "round",
              strokeLinejoin: "round",
            }),
            o.map((s, n) =>
              t("circle", {
                key: "pq" + n,
                cx: s.x,
                cy: s.y,
                r: (n === o.length - 1 && a ? 5.5 : 3.2) * e,
                fill: "#16a34a",
                stroke: "#fff",
                strokeWidth: 1.2 * e,
              }),
            ),
          );
        }
        return null;
      })(),
      wt = (() => {
        if (!yt || "select" !== s.tool || !s.dsSel || "zone" !== s.dsSel.t) return null;
        const t = s.dsSel.i,
          e = s.dsZoneTmp && s.dsZoneTmp.i === t ? s.dsZoneTmp.z : (_.zones || [])[t];
        if (!e) return null;
        const n = React.createElement,
          i = s.dview.w / 1e3,
          o = this._dsPtsHs(e.d),
          r = o.pts,
          a = o.hs;
        if (r.length < 3) return null;
        const l = [],
          d = 3.6 * i,
          p = 1.4 * i,
          h = 2.6 * i,
          c = 1 * i,
          g = r.map((t) => t.x),
          f = r.map((t) => t.y),
          u = (Math.min(...g) + Math.max(...g)) / 2,
          y = (Math.min(...f) + Math.max(...f)) / 2,
          m = () => {
            const e = this.state.dsZoneTmp && this.state.dsZoneTmp.i === t ? this.state.dsZoneTmp.z : this._curFloorZones()[t],
              s = this._dsPtsHs(e.d);
            return { z: e, pts: s.pts, hs: s.hs };
          };
        if ("circle" === e.kind) {
          const e = (Math.max(...g) - Math.min(...g)) / 2,
            s = u + e,
            o = y;
          return (
            l.push(
              n("line", {
                key: "cr-arm",
                x1: u,
                y1: y,
                x2: s,
                y2: o,
                stroke: "#b99751",
                strokeWidth: 1 * i,
                strokeDasharray: 2 * i + " " + 2 * i,
                style: { pointerEvents: "none" },
              }),
            ),
            l.push(
              n("circle", {
                key: "cr-c",
                cx: u,
                cy: y,
                r: 2.2 * i,
                fill: "#b99751",
                stroke: "#fff",
                strokeWidth: 1 * i,
                style: { pointerEvents: "none" },
              }),
            ),
            l.push(
              n("circle", {
                key: "cr-h",
                cx: s,
                cy: o,
                r: 3.4 * i,
                fill: "#dc2626",
                stroke: "#fff",
                strokeWidth: 1.4 * i,
                style: { cursor: "ew-resize" },
                onPointerDown: (s) => {
                  s.stopPropagation();
                  const n = m();
                  this.setState({ cresize: { i: t, cx: u, cy: y, pts: n.pts, hs: n.hs, z: n.z, r0: e || 1 }, dsPan: null });
                },
              }),
            ),
            n("g", null, l)
          );
        }
        r.forEach((e, s) => {
          const o = r[(s + 1) % r.length];
          l.push(
            n("line", {
              key: "e" + s,
              x1: e.x,
              y1: e.y,
              x2: o.x,
              y2: o.y,
              stroke: "transparent",
              strokeWidth: 7 * i,
              strokeLinecap: "round",
              style: { cursor: "move" },
              onPointerDown: (e) => {
                e.stopPropagation();
                const n = this._dsEvtPt(e),
                  i = m();
                this.setState({
                  edrag: { i: t, a: s, b: (s + 1) % r.length, pts: i.pts, hs: i.hs, z: i.z, sx: n.x, sy: n.y },
                  dsPan: null,
                });
              },
            }),
          );
        });
        const x = 13 * i;
        (r.forEach((e, s) => {
          const o = r[(s - 1 + r.length) % r.length],
            d = r[(s + 1) % r.length],
            p = a[s] || {},
            h = (() => {
              let t = d.x - e.x,
                s = d.y - e.y;
              const n = Math.hypot(t, s) || 1;
              return { x: (t / n) * x, y: (s / n) * x };
            })(),
            c = (() => {
              let t = o.x - e.x,
                s = o.y - e.y;
              const n = Math.hypot(t, s) || 1;
              return { x: (t / n) * x, y: (s / n) * x };
            })();
          [
            ["out", p.out && Math.abs(p.out.x) + Math.abs(p.out.y) > 1 ? p.out : h],
            ["in", p.in && Math.abs(p.in.x) + Math.abs(p.in.y) > 1 ? p.in : c],
          ].forEach(([o, r]) => {
            const a = e.x + r.x,
              d = e.y + r.y;
            (l.push(
              n("line", {
                key: "gl" + s + o,
                x1: e.x,
                y1: e.y,
                x2: a,
                y2: d,
                stroke: "#16a34a",
                strokeWidth: 1 * i,
                strokeDasharray: 2 * i + " " + 2 * i,
                style: { pointerEvents: "none" },
              }),
            ),
              l.push(
                n("circle", {
                  key: "g" + s + o,
                  cx: a,
                  cy: d,
                  r: 2.7 * i,
                  fill: "#16a34a",
                  stroke: "#fff",
                  strokeWidth: 1.2 * i,
                  style: { cursor: "grab" },
                  onPointerDown: (e) => {
                    e.stopPropagation();
                    const n = m();
                    this.setState({ tdrag: { i: t, j: s, side: o, pts: n.pts, hs: n.hs, z: n.z }, dsPan: null });
                  },
                  onDoubleClick: (e) => {
                    e.stopPropagation();
                    const n = m(),
                      i = n.hs.map((t) => ({ in: { ...t.in }, out: { ...t.out } }));
                    i[s] = { ...(i[s] || {}), [o]: { x: 0, y: 0 } };
                    const r = this._dsZoneFromPts(n.z, n.pts, i);
                    (this._updRound((e) => {
                      Array.isArray(e.zones) && e.zones[t] && (e.zones[t] = r);
                    }),
                      this.setState({ dsZoneTmp: null }));
                  },
                }),
              ));
          });
        }),
          r.forEach((e, s) => {
            const o = r[(s + 1) % r.length],
              a = (e.x + o.x) / 2,
              d = (e.y + o.y) / 2;
            l.push(
              n("circle", {
                key: "m" + s,
                cx: a,
                cy: d,
                r: h,
                fill: "#fff",
                stroke: "#b99751",
                strokeWidth: c,
                strokeDasharray: 1.4 * i + " " + 1.4 * i,
                style: { cursor: "copy" },
                onPointerDown: (e) => {
                  e.stopPropagation();
                  const n = m(),
                    i = n.pts.slice();
                  i.splice(s + 1, 0, { x: a, y: d });
                  const H9 = KIVO.BassamCurve.ins(n.hs, n.pts.length, s + 1, !0),
                    o = this._dsZoneFromPts(n.z, i, H9);
                  /* R3-DAILY-M: الرأسُ يُكتب في الجولة عند الضغط كما كان — حالةٌ مؤقّتة يعتمدها الرفعُ بالفهرس كانت تكتب نسخةَ لحظة الضغط
                     فوق تحديثٍ وصل أثناء النقرة (يُمحى تعديلُ الجهاز الآخر أو يُكتب على مصلٍّ آخر) */
                  (this._updRound((e) => {
                    Array.isArray(e.zones) && e.zones[t] && (e.zones[t] = o);
                  }),
                    this.setState({ vdrag: { i: t, j: s + 1, pts: i, hs: H9, z: o }, dsZoneTmp: null, dsPan: null }));
                },
              }),
            );
          }),
          r.forEach((e, s) =>
            l.push(
              n("circle", {
                key: "h" + s,
                cx: e.x,
                cy: e.y,
                r: d,
                fill: "#dc2626",
                stroke: "#fff",
                strokeWidth: p,
                style: { cursor: "grab" },
                onPointerDown: (e) => {
                  e.stopPropagation();
                  const n = m();
                  this.setState({ vdrag: { i: t, j: s, pts: n.pts, hs: n.hs, z: n.z }, dsPan: null });
                },
                onDoubleClick: (e) => {
                  e.stopPropagation();
                  const n = m();
                  if (n.pts.length <= 3) return;
                  const i = n.pts.slice();
                  i.splice(s, 1);
                  const o = this._dsZoneFromPts(n.z, i, KIVO.BassamCurve.del(n.hs, s));
                  (this._updRound((e) => {
                    Array.isArray(e.zones) && e.zones[t] && (e.zones[t] = o);
                  }),
                    this.setState({ dsZoneTmp: null }));
                },
              }),
            ),
          ));
        const b = u,
          k = Math.min(...f),
          v = 4.4 * i,
          w = k - 26 * i;
        return (
          l.push(
            n("line", {
              key: "rot-arm",
              x1: b,
              y1: k,
              x2: b,
              y2: w,
              stroke: "#b99751",
              strokeWidth: 1.2 * i,
              strokeDasharray: 3 * i + " " + 2 * i,
              style: { pointerEvents: "none" },
            }),
          ),
          l.push(
            n("circle", {
              key: "rot",
              cx: b,
              cy: w,
              r: v,
              fill: "#b99751",
              stroke: "#fff",
              strokeWidth: 1.6 * i,
              style: { cursor: "grab" },
              onPointerDown: (e) => {
                e.stopPropagation();
                const s = this._dsEvtPt(e),
                  n = m(),
                  i = Math.atan2(s.y - y, s.x - u);
                this.setState({ rotdrag: { i: t, cx: u, cy: y, pts: n.pts, hs: n.hs, z: n.z, startAng: i }, dsPan: null });
              },
            }),
          ),
          n("g", null, l)
        );
      })(),
      St = (t) =>
        "height:26px;padding:0 12px;border-radius:10px;font-size:10px;font-weight:400;border:0;cursor:pointer;transition:all .2s;font-family:'Cairo',sans-serif;" +
        (t
          ? "background:var(--bg-xb99751);color:var(--text-on-brand);box-shadow:var(--shadow-card)"
          : "background:transparent;color:var(--fg-x53565a)"),
      At = "dist" === s.lens && this.bsLensOn("dist"),
      zt = "density" === s.lens && this.bsLensOn("dens"),
      Et = "gates" === s.lens && this.bsLensOn("gates"),
      Mt = "marks" === s.lens && this.bsLensOn("marks"),
      Ot = !!s.dsAsn && this.bsLensOn("dist") && (Et || Mt || ("zones" === s.lens && this.bsLensOn("zones")));
    this.bsLensOn("zones") ||
      "zones" !== s.lens ||
      this.__zfix ||
      ((this.__zfix = 1),
      setTimeout(() => {
        if (((this.__zfix = 0), this.bsLensOn("zones") || "zones" !== this.state.lens)) return;
        const t = this.bsLensOn("gates")
          ? { lens: "gates", panelTab: "gates" }
          : this.bsLensOn("marks")
            ? { lens: "marks", panelTab: "marks" }
            : this.bsLensOn("dens")
              ? { lens: "density", panelTab: "dens" }
              : null;
        t && this.setState({ dsSel: null, selMulti: [], dsHovZ: null, dsHovG: null, ...t });
      }, 0));
    const Ft = (() => {
      try {
        const t = this._opRead("bassam_employees_v1");
        if (Array.isArray(t)) return t;
      } catch (t) {}
      return [];
    })();
    let Ct = {};
    try {
      const t = this._opRead("bassam_staffing_v3");
      t &&
        "object" == typeof t &&
        (Ct = t);
    } catch (t) {}
    const Dt = Ct[s.year + "-" + s.month] || {},
      Tt = (t) => (KIVO.BassamEmp ? KIVO.BassamEmp.entryKey(Dt, t) : (t && (t.eid || t.nid || t.name)) || ""),
      Pt = {};
    Ft.forEach((t) => {
      (KIVO.BassamEmp ? KIVO.BassamEmp.tokens(t) : [t && t.eid, t && t.nid, t && t.name]).forEach((e) => {
        e && (Pt[e] = t);
      });
    });
    const Lt = {};
    Ft.forEach((t) => {
      t && t.name && (Lt[t.name] = t);
    });
    const Bt = (t) => Pt[t] || Lt[t] || null,
      Nt = (t) => {
        const e = Bt(t);
        return e ? Tt(e) : t;
      },
      Wt = (t) => {
        const e = Bt(t);
        return (e && e.name) || t;
      },
      jt = new Date(A.getTime() + 864e5 * (m - 1));
    let It = "";
    try {
      It = jt.toLocaleDateString("ar-SA-u-nu-latn", { weekday: "long" });
    } catch (t) {}
    const Rt = (t) => (t || []).some((t) => t === It || "ال" + t === It || t === "ال" + It),
      Gt = "بدون وردية";
    let Zt = [
      { name: "الوردية الأولى", color: "#b99751" },
      { name: "الوردية الثانية", color: "#2f8f86" },
      { name: "الوردية الثالثة", color: "#2f5f8a" },
      { name: "الوردية الرابعة", color: "#1e9a66" },
    ];
    try {
      const t = this._opRead("bassam_shift_options_v1");
      Array.isArray(t) && t.length && t.every((t) => t && t.name) && (Zt = t);
    } catch (t) {}
    const Ht = Zt.map((t) => t.name),
      Yt = {};
    Ft.forEach((t) => {
      const e = Dt[Tt(t)] || {},
        s = "string" == typeof e.shift && e.shift.trim() ? e.shift.trim() : "";
      s && -1 !== Ht.indexOf(s) && (Yt[Tt(t)] = s);
    });
    const Kt = (t) => Yt[Nt(t)] || "",
      Ut = (t) => (t === Gt ? "#94a3b8" : (Zt.find((e) => e.name === t) || {}).color || "#94a3b8"),
      Xt = (() => {
        const t = /^\s*\u0627\u0644\u0648\u0631\u062f\u064a\u0629\s+/,
          e = Zt.map((e) => e.name.replace(t, "").trim() || e.name),
          s = Zt.map((e) => t.test(e.name)),
          n = e.map((t, e) => (s[e] && t.split(/\s+/)[0]) || t),
          i = n.slice(),
          o = {};
        (n.forEach((t, e) => {
          (o[t] = o[t] || []).push(e);
        }),
          Object.keys(o).forEach((t) => {
            const s = o[t];
            if (s.length <= 1) return;
            const n = s.map((s) => e[s].slice(t.length).trim()),
              r = Math.max(0, ...n.map((t) => t.length));
            let a = 1,
              l = s.map(() => t);
            for (; a <= r && ((l = s.map((e, s) => (n[s] ? t + " " + n[s].slice(0, a) : t))), new Set(l).size !== l.length); ) a++;
            s.forEach((t, e) => {
              i[t] = l[e];
            });
          }));
        const r = {};
        return (
          Zt.forEach((t, e) => {
            r[t.name] = i[e] || t.name;
          }),
          r
        );
      })(),
      Jt = (t) => (null == t ? "كل الورديات" : t === Gt ? Gt : Xt[t] || t),
      Vt = Ft.some((t) => !Yt[Tt(t)]),
      qt = new Set(Object.values(Yt)),
      Qt = Ht.filter((t) => qt.has(t)),
      _t = Vt ? Qt.concat([Gt]) : Qt.slice();
    let $t = s.distFilterShift || null;
    if (null == $t)
      try {
        $t = (KIVO.BassamDayShift ? KIVO.BassamDayShift.get(T, s.month, m) : "") || null;
      } catch (t) {
        $t = null;
      }
    null == $t && ($t = (_t || []).filter((t) => t !== Gt)[0] || null);
    const te = $t && -1 !== _t.indexOf($t) ? $t : null,
      ee = (function () {
        try {
          return !(!KIVO.BassamMyShift || !KIVO.BassamMyShift.of(T, s.month, m));
        } catch (t) {
          return !1;
        }
      })(),
      se = (function () {
        try {
          return (KIVO.BassamDayShift ? KIVO.BassamDayShift.get(T, s.month, m) : "") || "";
        } catch (t) {
          return "";
        }
      })(),
      ne = _t
        .filter((t) => !se || t === se)
        .map((t) => {
          const e = t === te;
          return {
            name: t,
            fullName: t,
            color: Ut(t),
            iconColor: Ut(t),
            selected: e,
            pick: async () => {
              const selected = await this._selectDayShift(T, s.month, m, t);
              if (selected.ok === 1)
                this.setState({
                  distFilterShift: selected.value,
                  dsShiftAll: false,
                });
            },
            btnStyle:
              "width:32px;height:32px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;box-sizing:border-box;border:2px solid " +
              (e ? "#b99751;background:var(--bg-a185151810p1)" : "transparent;background:transparent"),
          };
        }),
      ie = (() => {
        const t = te || null,
          e = (Qt || []).length > 0,
          n = !!s.dayShOpen;
        return {
          dayShOn: e,
          dayShOpen: !1,
          dayShLabel: t || "لا وردية لليوم بعد",
          dayShColor: t ? Ut(t) : "#cbd5e1",
          dayShChev: "transition:transform .2s;flex-shrink:0;opacity:.5;" + (n ? "transform:rotate(180deg)" : ""),
          dayShBtnStyle:
            "height:28px;display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:600;color:var(--fg-x53565a);background:var(--bg-xffffff);border:1px solid var(--bd-a185151810p35);border-radius:10px;padding:0 10px;cursor:default;font-family:'Cairo',sans-serif;flex-shrink:0",
          dayShToggle: () =>
            this.setState((t) => ({ dayShOpen: !t.dayShOpen })),
          dayShOpts: (Qt || [])
            .filter((t) => !se || t === se || !ee)
            .map((e) => {
              const n = !!(W[e] || (W.__pulled && W.__pulled[e])),
                i = !!W[e];
              return {
                name: e,
                note: i ? " — معتمد ✓" : n ? " — مسودة" : "",
                color: n ? Ut(e) : "#cbd5e1",
                selected: e === t,
                tip: n
                  ? "تثبيت وردية اليوم على «" + e + "» — ينعكس فوراً في قائمة التقرير اليومي وعدسة التوزيع"
                  : "تتنشط بعد سحب تقرير «" + e + "» لهذا اليوم من صفحة التقرير اليومي",
                pick: async () => {
                  if (!n)
                    return void this.bsToast("لا تقرير مسحوب لـ«" + e + "» ليوم " + m + " — اسحبه من التقرير اليومي ثم بدّل إليها", "warn");
                  const selected = await this._selectDayShift(T, s.month, m, e);
                  if (selected.ok === 1)
                    this.setState({
                      distFilterShift: selected.value,
                      dsShiftAll: false,
                      dayShOpen: null,
                    });
                },
                style:
                  "display:flex;align-items:center;gap:9px;height:32px;padding:0 9px;border-radius:8px;font-size:11.5px;transition:background .12s;" +
                  (n
                    ? "cursor:pointer;" +
                      (e === t ? "background:var(--bg-a185151810p09);color:var(--fg-x9a7e40);font-weight:700" : "color:var(--fg-x141414)")
                    : "cursor:not-allowed;color:var(--fg-xa8aeb6);opacity:.75"),
              };
            }),
          dayShApOn: e,
          dayShApTxt: q ? "معتمدة ✓" : I ? "مسودة" : "بلا تقرير",
          dayShApIcon: q
            ? "M20 6 9 17l-5-5"
            : "M12 8v4l3 3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
          dayShApTip: j
            ? q
              ? "جولة «" +
                j +
                "» معتمدة مع تقرير الوردية" +
                (V && V.at ? " منذ " + V.at : "") +
                " — لقطتها معروضة قراءةً؛ لفتحها افتح تقرير الوردية من التقرير اليومي"
              : I
                ? "جولة «" + j + "» مسودة — تُعتمد لحظياً باعتماد تقرير الوردية من التقرير اليومي"
                : "لا تقرير يومي مسحوب لـ«" + j + "» — يُنشأ من التقرير اليومي"
            : "لا وردية لليوم بعد — أنشئ تقريرها اليومي",
          dayShApStyle:
            "height:28px;display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:700;border-radius:10px;padding:0 10px;font-family:'Cairo',sans-serif;flex-shrink:0;transition:all .15s;border:1px solid " +
            (q
              ? "rgba(4,120,87,0.45);background:var(--bg-a0132800p08);color:var(--fg-x047857);cursor:default"
              : I
                ? "rgba(185,151,81,0.45);background:var(--bg-a185151810p08);color:var(--fg-x9a7e40);cursor:default"
                : "#E6E8EB;background:var(--bg-xf7f8fa);color:var(--fg-xa8aeb6);cursor:default"),
          dayShApGo: () => {
            if (!j)
              return void this.bsToast(
                "ثبّت وردية اليوم من قائمة «الوردية:» أولاً",
                "warn",
              );
            if (!this.PC("approve")) return void this.bsToast("صلاحيتك لا تشمل اعتماد الجولات — راجع مدير الإدارة", "warn");
            if (G)
              return void this.bsToast(
                "الشهر معتمد ومقفل — افتحه أولاً من كرت الشهر",
                "warn",
              );
            const t = { ...(this.state.rounds || {}) },
              e = t[N];
            if (q)
              return (
                (e.shAp = { ...(e.shAp || {}) }),
                (e.shAp[j] = { ap: 0 }),
                this.saveRounds(t),
                void this._opAck(
                  "فُتحت جولة «" +
                    j +
                    "» — عاد العرض للميدان الحي، وإعادة الاعتماد تجمّد لقطة جديدة",
                  "ok",
                )
              );
            if (K) return void this.bsToast("اليوم معتمد ومقفل بالفعل — اعتمادات الورديات تسبق ختم اليوم", "warn");
            if (!I) return void this.bsToast("تقرير «" + j + "» لم يُعتمد بعد — اعتمده من التقرير اليومي أولاً", "warn");
            if (!e || !Array.isArray(e.d)) return void this.bsToast("لا جولة لليوم بعد — ابدأها أو تابعها أولاً", "warn");
            let s = [];
            try {
              s = JSON.parse(JSON.stringify(e.d));
            } catch (t) {
              return void this.bsToast("تعذر أخذ اللقطة — أعد المحاولة", "warn");
            }
            let n = "";
            try {
              const t = new Date(),
                e = (t) => (t < 10 ? "0" : "") + t;
              n = e(t.getHours()) + ":" + e(t.getMinutes());
            } catch (t) {}
            ((e.shAp = { ...(e.shAp || {}) }),
              (e.shAp[j] = { ap: 1, at: n, snap: s }),
              this.saveRounds(t));
            const i =
              (Qt || []).length > 0 &&
              (Qt || []).every((t) => e.shAp[t] && e.shAp[t].ap);
            this._opAck(
              i
                ? "اعتُمدت جولة «" + j + "» — كل الورديات معتمدة، ويمكنك اعتماد اليوم من بطاقته"
                : "اعتُمدت جولة «" + j + "» ليوم " + m + " — لقطة الميدان محفوظة",
              "ok",
            );
          },
        };
      })(),
      oe = ne.filter((t) => t.name !== Gt),
      re = ne.find((t) => t.name === Gt) || null,
      ae = Ft.filter((t) => {
        const e = Dt[Tt(t)] || {};
        return !!Yt[Tt(t)] && !Rt(e.rest);
      }),
      le = Ft.filter((t) => {
        const e = Dt[Tt(t)] || {};
        return !!Yt[Tt(t)] && Rt(e.rest);
      }),
      de = (_ && _.zones) || [],
      pe = (_ && _.gates) || [],
      he = (_ && _.paths) || [],
      ce = (_ && _.marks) || [],
      ge = {
        in: { c: "#16a34a", label: "دخول" },
        out: { c: "#dc2626", label: "خروج" },
        emg: { c: "#ea580c", label: "طوارئ" },
        svc: { c: "#9c3d6b", label: "خدمات" },
      },
      fe = { thin: 1.5, normal: 2.4, bold: 3.6 },
      ue = { solid: "متصل", dash: "متقطع", dot: "منقّط" },
      ye = (t, e, s) => ("dash" === t ? 7 * e + " " + 4.5 * e : "dot" === t ? 0.01 * e + " " + Math.max(5, 2.6 * s) * e : null),
      me = ["in", "out", "emg", "svc"],
      xe = [
        ["thin", "رفيع"],
        ["normal", "عادي"],
        ["bold", "عريض"],
      ],
      be = [
        ["solid", "متصل", "solid"],
        ["dash", "متقطع", "dashed"],
        ["dot", "منقّط", "dotted"],
      ],
      ke = (t) =>
        t && !1 === t.active
          ? "#94a3b8"
          : (ge[(t && t.type) || "in"] || ge.in).c,
      ve = (t, e, s, n, i) => {
        const o = Math.atan2(e.y - t.y, e.x - t.x),
          r = Math.cos(o),
          a = Math.sin(o),
          l = -a,
          d = r,
          p = 11 * s,
          h = 4.62 * s,
          c = 11 * 0.66 * s,
          g = e.x - r * p,
          f = e.y - a * p,
          u =
            "M" +
            e.x +
            "," +
            e.y +
            " L" +
            (g + l * h) +
            "," +
            (f + d * h) +
            " L" +
            (e.x - r * c) +
            "," +
            (e.y - a * c) +
            " L" +
            (g - l * h) +
            "," +
            (f - d * h) +
            " Z";
        return React.createElement("path", { key: i, d: u, fill: n, stroke: "#fff", strokeWidth: 0.9 * s, strokeLinejoin: "round" });
      },
      we = (t, e, s, n, i) => {
        const o = [],
          r = "two" === n,
          a = [];
        let l = 0;
        for (let e = 1; e < t.length; e++) {
          const s = t[e - 1],
            n = t[e],
            i = Math.hypot(n.x - s.x, n.y - s.y);
          i > 0.01 && (a.push({ a: s, b: n, len: i, ux: (n.x - s.x) / i, uy: (n.y - s.y) / i, d0: l }), (l += i));
        }
        if (!a.length) return o;
        const d = (t) => {
            let e = a[a.length - 1];
            for (let s = 0; s < a.length; s++)
              if (t <= a[s].d0 + a[s].len) {
                e = a[s];
                break;
              }
            const s = Math.max(0, Math.min(e.len, t - e.d0));
            return { x: e.a.x + e.ux * s, y: e.a.y + e.uy * s, ux: e.ux, uy: e.uy };
          },
          p = 30 * e,
          h = 17 * e,
          c = Math.min(Math.floor((l - h) / p), 96);
        for (let t = 1; t <= c; t++) {
          const n = d(t * p);
          r && t % 2 == 0
            ? o.push(ve({ x: n.x + n.ux, y: n.y + n.uy }, { x: n.x, y: n.y }, e, s, i + "r" + t))
            : o.push(ve({ x: n.x - n.ux, y: n.y - n.uy }, { x: n.x, y: n.y }, e, s, i + "s" + t));
        }
        const g = a[a.length - 1];
        if ((o.push(ve({ x: g.b.x - g.ux, y: g.b.y - g.uy }, g.b, e, s, i + "f")), r)) {
          const t = a[0];
          o.push(ve({ x: t.a.x + t.ux, y: t.a.y + t.uy }, t.a, e, s, i + "b0"));
        }
        return o;
      },
      Se = (t, e, s, n, i) => {
        if (!t || !1 === t.anim || !1 === t.active) return null;
        const o = String(e || "")
          .trim()
          .split(/\s+/)
          .map((t) => {
            const e = t.split(",");
            return { x: +e[0], y: +e[1] };
          })
          .filter((t) => isFinite(t.x) && isFinite(t.y));
        if (o.length < 2) return null;
        let r = 0;
        for (let t = 1; t < o.length; t++) r += Math.hypot(o[t].x - o[t - 1].x, o[t].y - o[t - 1].y);
        if (r < 26 * n) return null;
        const a = (t) => "M " + t.map((t) => t.x + " " + t.y).join(" L "),
          l = "bsPF_" + String(i || "f").replace(/[^A-Za-z0-9_]/g, ""),
          d = l + "r",
          p = "two" === t.dir,
          h = Math.max(1.6, Math.min(16, r / 62));
        let c = Math.max(1, Math.min(6, Math.round(r / 74)));
        p && (c = Math.max(2, c));
        const g = Math.max(3.4 * n, 1.05 * s),
          f = 0.72 * g,
          u = "M " + -g + " " + -f + " L " + g + " 0 L " + -g + " " + f + " Z",
          y = [];
        for (let t = 0; t < c; t++) {
          const e = p && t % 2 == 1;
          y.push(
            React.createElement(
              "path",
              {
                key: "h" + t,
                d: u,
                fill: "#ffffff",
                opacity: 0.95,
                stroke: "rgba(0,0,0,0.18)",
                strokeWidth: 0.5 * n,
                style: { pointerEvents: "none" },
              },
              React.createElement(
                "animateMotion",
                { dur: h.toFixed(2) + "s", repeatCount: "indefinite", rotate: "auto", begin: ((-t / c) * h).toFixed(2) + "s" },
                React.createElement("mpath", { href: "#" + (e ? d : l) }),
              ),
            ),
          );
        }
        return React.createElement(
          "g",
          { key: i || "flow", style: { pointerEvents: "none" } },
          React.createElement("path", { id: l, d: a(o), fill: "none", stroke: "none" }),
          p ? React.createElement("path", { id: d, d: a(o.slice().reverse()), fill: "none", stroke: "none" }) : null,
          y,
        );
      },
      Ae = de.concat(pe),
      ze = new Set();
    Ae.forEach((t) =>
      (t.emp || []).forEach((t) => {
        ze.add(Nt(t));
      }),
    );
    const Ee = new Set(ae.map((t) => Tt(t))),
      Me = ze.size,
      Oe = Array.from(ze).filter((t) => Ee.has(t)).length,
      Fe = (Math.max(Me - Oe, 0), Ae.filter((t) => (t.emp || []).length).length),
      Ce =
        (Ae.length && Math.round((Fe / Ae.length) * 100), Math.max(ae.length - Oe, 0), de.filter((t) => null != t.count && "" !== t.count)),
      De =
        (Ce.length && Math.round(Ce.reduce((t, e) => t + (+e.count || 0), 0) / Ce.length),
        Ce.filter((t) => +t.count < 40).length,
        Ce.filter((t) => +t.count >= 40 && +t.count < 75).length,
        Ce.filter((t) => +t.count >= 75).length,
        [
          [
            "zones",
            "المصليات",
            de.length,
            "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",
            "M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
          ],
          ["paths", "المسارات", he.length, "M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15", "M9 19a3 3 0 1 1-6 0 3 3 0 0 1 6 0"],
          [
            "marks",
            "المعالم",
            ce.length,
            "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",
            "M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
          ],
          [
            "gates",
            "الأبواب",
            pe.length,
            "M13 4h3a2 2 0 0 1 2 2v14",
            "M2 20h3",
            "M13 20h9",
            "M10 12v.01",
            "M13 2.5V20a2 2 0 0 1-2.437 1.953l-5-1.25A2 2 0 0 1 4 18.75V4.5a2 2 0 0 1 2.437-1.953l5 1.25A2 2 0 0 1 13 4.5",
          ],
          ["dens", "الكثافة", Ce.length, "M19 5 5 19", "M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"],
        ]),
      Te = zt
        ? "dens"
        : Et
          ? "gates"
          : ("zones" === s.panelTab && this.bsLensOn("zones")) ||
              (("gates" === s.panelTab || "paths" === s.panelTab || "marks" === s.panelTab) && this.bsLensOn(s.panelTab))
            ? s.panelTab
            : this.bsLensOn("zones")
              ? "zones"
              : this.bsLensOn("gates")
                ? "gates"
                : this.bsLensOn("paths")
                  ? "paths"
                  : this.bsLensOn("marks")
                    ? "marks"
                    : "zones",
      Pe = De.filter((t) => "dens" !== t[0] && "paths" !== t[0] && this.bsLensOn(t[0])).map((t) => {
        const [e, s, n] = t,
          i = Te === e || ("zones" === e && ("dens" === Te || "paths" === Te));
        return {
          label: s,
          paths: t.slice(3).filter(Boolean),
          click: () =>
            this.setState((t) =>
              "dens" === e
                ? {
                    panelTab: "dens",
                    lens: "density",
                    densDim: "summary",
                    dsHovZ: null,
                    dsHovG: null,
                    dsSel: t.dsSel && "gate" === t.dsSel.t ? null : t.dsSel,
                  }
                : "dist" === e
                  ? { panelTab: "dist", lens: "dist", distDim: "summary", dsHovZ: null, dsHovG: null }
                  : "gates" === e
                    ? { panelTab: "gates", lens: "gates", gateDim: t.dsAsn ? "dsum" : "summary", dsHovZ: null, dsHovG: null }
                    : "marks" === e
                      ? { panelTab: "marks", lens: "marks", markDim: t.dsAsn ? "dsum" : "summary", dsHovZ: null, dsHovG: null }
                      : Object.assign(
                          { panelTab: e, lens: "zones", dsHovZ: null, dsHovG: null },
                          "zones" === e ? { brkDim: t.dsAsn ? "dsum" : "summary" } : "paths" === e ? { pathDim: "summary" } : {},
                        ),
            ),
          on: i,
          iconColor: i ? "#b99751" : "#94a3b8",
          labelColor: i ? "#b99751" : "#64748b",
          style: "cursor:pointer",
        };
      }),
      Le = F[f] || {},
      Be = Array.isArray(Le.zones) ? Le.zones : [],
      Ne = Array.isArray(Le.gates) ? Le.gates : [],
      We = {};
    Be.forEach((t) => {
      t && t.code && (We[t.code] = t);
    });
    const je = new Set(de.map((t) => t.code).filter(Boolean)),
      Ie =
        (de.filter((t) => {
          const e = t.code ? We[t.code] : null;
          return !e || String(e.d) !== String(t.d);
        }).length,
        Be.filter((t) => t && t.code && !je.has(t.code)).length,
        de.filter((t) => !!t.off).length,
        de.length,
        de.filter((t) => t.region && t.level).length,
        de.length,
        de.reduce((t, e) => t + (+e.capNow > 0 ? +e.capNow : 0), 0),
        he.filter((t) => "in" === (t.type || "in")).length,
        he.filter((t) => "out" === t.type).length,
        he.filter((t) => "emg" === t.type).length,
        he.filter((t) => "svc" === t.type).length,
        he.filter((t) => "two" === t.dir).length,
        he.filter((t) => !1 === t.active).length,
        pe.filter((t) => !t.closed).length);
    (pe.length,
      pe.length && Math.round((Ie / pe.length) * 100),
      pe.filter((t, e) => {
        const s =
          Ne.find((e) => e && ((null != t.num && "" !== t.num && String(e.num) === String(t.num)) || (t.label && e.label === t.label))) ||
          Ne[e];
        return !!s && !!s.closed != !!t.closed;
      }).length,
      pe.filter((t) => null == t.num || "" === t.num).length,
      pe.filter((t) => !String(t.kind || "").trim()).length,
      de.length && Math.round((Ce.length / de.length) * 100),
      de.some((t) => null != t.nNow && "" !== t.nNow),
      de.reduce((t, e) => t + ((null != e.nNow && "" !== e.nNow && +e.nNow) || 0), 0),
      Ce.filter((t) => +t.count > 100).length,
      Ce.filter((t) => +t.count >= 75 && +t.count <= 100).length,
      Ce.length && Ce.reduce((t, e) => (+e.count > +t.count ? e : t), Ce[0]));
    let Re = [];
    const Ge = [
        ["men", "مصليات الرجال", "#22c55e"],
        ["women", "مصليات النساء", "#93c5fd"],
        ["service", "خدمات", "#374151"],
      ],
      Ze = ["summary", "الملخص"],
      He = [
        ["fill", "الامتلاء"],
        ["read", "القياس"],
        ["ztypecat", "النوع والفئة"],
        ["region", "المنطقة"],
        ["yard", "الساحة"],
        ["level", "الدور / المستوى"],
        ["ztype", "النوع"],
        ["zcat", "الفئة"],
      ],
      Ye = He.some((t) => t[0] === s.densDim) ? s.densDim : "fill",
      Ke = "summary" === s.densDim ? "summary" : Ye,
      Ue = (t) => {
        const e = {},
          s = [],
          n = {},
          i = (t, i) => {
            (null == e[t] && ((e[t] = 0), s.push(t), (n[t] = i)), e[t]++);
          },
          o = de.filter((t) => !t.off);
        "fill" === t
          ? de.forEach((t) => {
              if (t.off) return void i("معطّلة", "#94a3b8");
              const e = null == t.count || "" === t.count ? 0 : +t.count;
              e > 100
                ? i("اكتظاظ", "#991b1b")
                : e >= 75
                  ? i("مرتفعة", "#ef4444")
                  : e >= 40
                    ? i("متوسطة", "#e5b563")
                    : i("منخفضة", "#22c55e");
            })
          : "read" === t
            ? de.forEach((t) =>
                i(null != t.count && "" !== t.count ? "مقروءة" : "بلا قراءة", null != t.count && "" !== t.count ? "#10b981" : "#94a3b8"),
              )
            : "zcat" === t
              ? o.forEach((t) => {
                  const e = String(t.zcat || "").trim() || "بلا فئة",
                    s = this.zcatStyleOf(e, String(t.ztype || "").trim());
                  i(e, (s && s.f) || null);
                })
              : "ztype" === t
                ? o.forEach((t) => i(String(t.ztype || "").trim() || "بلا نوع", null))
                : "ztypecat" === t
                  ? o.forEach((t) =>
                      i((String(t.ztype || "").trim() || "بلا نوع") + " · " + (String(t.zcat || "").trim() || "بلا فئة"), null),
                    )
                  : "yard" === t
                    ? o.forEach((t) =>
                        i(
                          String(t.yard || "").trim() || "بلا ساحة",
                          (this.gateLocColor && this.gateLocColor(String(t.yard || "").trim())) || null,
                        ),
                      )
                    : o.forEach((e) => i(String(null == e[t] ? "" : e[t]).trim() || "غير محدّد", null));
        const r = s.map((t) => ({ label: t, n: e[t], color: n[t] })).sort((t, e) => e.n - t.n || t.label.localeCompare(e.label, "ar")),
          a = r.length ? r[0].n : 0;
        return r.map((t) => ({ ...t, color: t.color || "rgba(185,151,81," + (0.3 + 0.6 * (a ? t.n / a : 0)).toFixed(2) + ")" }));
      },
      Xe = Ue(Ye),
      Je = [Ze].concat(He),
      Ve =
        (Je.map((t) => ({
          label: t[1],
          icA: KIVO.BassamMix.dimIcon(t[0]).a,
          icB: KIVO.BassamMix.dimIcon(t[0]).b,
          click: () => this.setState({ densDim: t[0] }),
          on: t[0] === Ke,
          style: KIVO.BassamMix.tabStyle(t[0] === Ke, Je.length),
        })),
        [
          ["shift", "الوردية"],
          ["place", "الموضع"],
          ["state", "الحالة"],
          ["cat", "التصنيف"],
        ]),
      qe = Ve.some((t) => t[0] === s.distDim) ? s.distDim : "shift",
      Qe = "summary" === s.distDim ? "summary" : qe,
      _e = s.dsShiftAll || null == te ? null : te,
      $e = (t) => null == _e || (_e === Gt ? !Yt[t] : Yt[t] === _e),
      ts = (t) => null == _e || (_e === Gt ? !Kt(t) : Kt(t) === _e),
      es = null != _e && _e !== Gt ? _e : null,
      ss = (t) => null == es || (Kt(t) || "") === es,
      ns = (t) => {
        const e = (t, e, s) => {
            const n = t.find((t) => t.label === e);
            n ? n.n++ : t.push({ label: e, n: 1, color: s });
          },
          s = [],
          n = { men: "مصليات الرجال", women: "مصليات النساء", service: "خدمات" };
        if ("shift" === t)
          (_e === Gt ? Ft.filter((t) => !Yt[Tt(t)]) : ae.concat(le).filter((t) => $e(Tt(t)))).forEach((t) => {
            const n = Tt(t);
            if (ze.has(n)) {
              const t = Yt[n] || "بلا وردية",
                i = Zt.find((e) => e.name === t);
              e(s, t, i ? i.color : "#94a3b8");
            } else e(s, "بلا تسكين", "#94a3b8");
          });
        else if ("place" === t)
          (de.forEach((t) =>
            (t.emp || []).forEach((t) => {
              ts(t) && e(s, "على المصليات", "#10b981");
            }),
          ),
            pe.forEach((t) =>
              (t.emp || []).forEach((t) => {
                ts(t) && e(s, "على الأبواب", "#1E458A");
              }),
            ));
        else if ("state" === t) {
          const t = new Set(le.map((t) => Tt(t))),
            n = new Set(ae.map((t) => Tt(t)));
          Ft.forEach((i) => {
            const o = Tt(i);
            $e(o) &&
              (n.has(o) || t.has(o)
                ? t.has(o)
                  ? e(s, "في راحة", "#b25c8a")
                  : ze.has(o)
                    ? e(s, "مسكَّن", "#10b981")
                    : e(s, "غير مسكَّن", "#e5b563")
                : e(s, "بدون وردية", "#94a3b8"));
          });
        } else
          (de.forEach((t) =>
            (t.emp || []).forEach((i) => {
              ts(i) && e(s, n[t.cat] || "مصلى", C[t.cat] || "#b99751");
            }),
          ),
            pe.forEach((t) =>
              (t.emp || []).forEach((t) => {
                ts(t) && e(s, "أبواب", "#1E458A");
              }),
            ));
        return s.sort((t, e) => e.n - t.n || t.label.localeCompare(e.label, "ar"));
      },
      is = ns(qe),
      os = "shift" === qe || "state" === qe ? "موظف" : "تسكين",
      rs = [Ze].concat(Ve),
      as = rs.map((t) => ({
        label: t[1],
        icA: KIVO.BassamMix.dimIcon(t[0]).a,
        icB: KIVO.BassamMix.dimIcon(t[0]).b,
        click: () => this.setState({ distDim: t[0] }),
        on: t[0] === Qe,
        style: KIVO.BassamMix.tabStyle(t[0] === Qe, rs.length),
      })),
      ls = [
        ["الساحة الشمالية", "#1E458A"],
        ["الساحة الجنوبية", "#0E573A"],
        ["الساحة الشرقية", "#BF9958"],
        ["الساحة الغربية", "#750E1F"],
      ],
      ds = (t) => {
        const e = ls.find((e) => e[0] === t);
        return e ? e[1] : null;
      },
      ps = [
        ["loc", "الموقع"],
        ["gtype", "النوع"],
        ["kind", "الفئة"],
        ["route", "المسار"],
        ["cls", "التصنيف"],
        ["cats", "التخصيص"],
        ["closed", "الحالة"],
      ],
      hs = ps.some((t) => t[0] === s.gateDim) ? s.gateDim : "loc",
      cs = this.bsLensOn("dist") ? ("dsum" === s.gateDim ? "dsum" : "cov" === s.gateDim ? "cov" : "summary") : "summary",
      gs = "cats" === hs,
      fs = (t, e) => {
        if ("closed" === e) return [t && t.closed ? "مغلق" : "مفتوح"];
        if ("cats" === e) {
          const e = (t && t.cats) || [];
          return e.length ? e.map(String) : ["غير محدّد"];
        }
        return [String(null == (t && t[e]) ? "" : t[e]).trim() || "غير محدّد"];
      },
      us = ((t) => {
        const e = {},
          s = [];
        return (
          pe.forEach((n) =>
            fs(n, t).forEach((t) => {
              (null == e[t] && ((e[t] = 0), s.push(t)), e[t]++);
            }),
          ),
          s.map((t) => ({ label: t, n: e[t] })).sort((t, e) => e.n - t.n || t.label.localeCompare(e.label, "ar"))
        );
      })(hs),
      ys = us.reduce((t, e) => t + e.n, 0),
      ms = us.length ? us[0].n : 0,
      xs = (t) => {
        if ("loc" === hs) {
          const e = ds(t.label);
          if (e) return e;
        }
        return "closed" === hs
          ? "مغلق" === t.label
            ? "#64748b"
            : "#16a34a"
          : "rgba(185,151,81," + ((e = t.n), (0.3 + 0.6 * (ms ? e / ms : 0)).toFixed(2) + ")");
        var e;
      },
      bs = us.map((t) => ({ ...t, color: xs(t), base: ys })),
      ks = (() => {
        const t = KIVO.BassamLeaf,
          e = KIVO.BassamNeed,
          n = React.createElement,
          i = { red: "#dc2626", amb: "#d97706", grn: "#059669", blu: "#3e8ac4", tea: "#2f8f86", non: "#94a3b8", cls: "#64748b" },
          o = {
            red: "له احتياج ولا موظف عليه",
            amb: "مسكَّن أقل من الاحتياج",
            grn: "التسكين = الاحتياج",
            blu: "مسكَّن أكثر من الاحتياج — رصيد للنقل",
            tea: "موظفون على باب بلا احتياج محدد",
            non: "لا احتياج ولا تسكين",
            cls: "الشارة البرتقالية = موظفون بقوا عليه",
          },
          r = { ab: "غائب", pm: "مستأذن", lv: "إجازة", rest: "راحة", pr: "حاضر", tout: "محوَّل لوردية أخرى", tin: "محوَّل إلينا" },
          a = Object.assign(
            {},
            {
              red: "عجز كامل",
              amb: "عجز جزئي",
              grn: "مكتمل",
              blu: "فائض",
              tea: "مسكَّن بلا احتياج",
              non: "خارج النطاق",
              cls: "مغلق/معطّل",
            },
          ),
          l = "zones" === s.lens && this.bsLensOn("zones"),
          d = Et ? "gates" : Mt ? "marks" : l ? "zones" : "gates",
          p = !!s.dsAsn && this.bsLensOn("dist") && (Et || Mt || l),
          h = "gates" === d ? pe : "marks" === d ? ce : de,
          c =
            "gates" === d
              ? { one: "باب", many: "الأبواب", closed: "مغلق", closedL: "مغلق/معطّل", closedV: "أُغلق", pend: "على مواقع مغلقة" }
              : "marks" === d
                ? { one: "معلم", many: "المعالم", closed: "معطّل", closedL: "معطّل", closedV: "عُطّل", pend: "على معالم معطّلة" }
                : { one: "مصلى", many: "المصليات", closed: "معطّل", closedL: "معطّل", closedV: "عُطّل", pend: "على مصليات معطّلة" },
          g = (t) => ("gates" === d ? !!t.closed : !!t.off),
          f = (t) =>
            "zones" === d
              ? (() => {
                  const e = ct(t.d);
                  return { x: e[0], y: e[1] };
                })()
              : { x: t.x, y: t.y },
          u = (t) => ("zones" === d ? t.region || t.yard || "" : t.loc || "");
        ((this._covKind = d), (a.cls = c.closedL));
        const y = s.covFilter || null;
        let x = "";
        try {
          x = (KIVO.BassamDayShift ? KIVO.BassamDayShift.get(T, s.month, m) : "") || "";
        } catch (t) {}
        x || (x = te || "");
        const b = {};
        let k = !1;
        try {
          const t = (this._opRead("bassam_dreport_v1") || {} || {})[
            T + "-" + s.month + "-" + m
          ];
          t &&
            t.shifts &&
            Object.keys(t.shifts).forEach((e) => {
              const s = t.shifts[e] || {};
              s.pulled &&
                (s.roster || []).length &&
                ((k = !0),
                Object.keys(s.tout || {}).forEach((t) => {
                  const s = { st: "tout", sh: e, at: "", name: "" };
                  [t, Nt(t)].forEach((t) => {
                    t && !b[t] && (b[t] = s);
                  });
                  const n = Bt(t);
                  n && (n.eid && !b[n.eid] && (b[n.eid] = s), n.nid && !b[n.nid] && (b[n.nid] = s));
                }),
                (s.roster || []).forEach((t) => {
                  if (!t || !t.ekey) return;
                  const s = { st: t.st || "pr", sh: e, at: t.at || "", name: t.name || "", tin: !!t.tin };
                  b[t.ekey] = s;
                  const n = Nt(t.ekey);
                  n && (b[n] = s);
                  const i = Bt(t.ekey);
                  i && (i.eid && (b[i.eid] = s), i.nid && (b[i.nid] = s));
                }));
            });
        } catch (t) {}
        const v = new Set(),
          w = {};
        try {
          const t = KIVO.BassamSup;
          t &&
            Ft.forEach((e) => {
              const s = Tt(e),
                n = t.supName(s);
              n && (v.add(s), (w[s] = n));
            });
        } catch (t) {}
        try {
          const t = (this._opRead("bassam_dreport_v1") || {} || {})[
              T + "-" + s.month + "-" + m
            ],
            e = t && t.shifts && x ? t.shifts[x] : null,
            n = (e && e.leaders) || {},
            i = (t, e) => {
              t &&
                [t, Nt(t)]
                  .concat(
                    (() => {
                      const e = Bt(t);
                      return e ? [e.eid, e.nid] : [];
                    })(),
                  )
                  .filter(Boolean)
                  .forEach((t) => {
                    (v.add(t), (w[t] = e));
                  });
            };
          (i(n.chief, "رئيس الوردية"), i(n.deputy, "نائب رئيس الوردية"));
        } catch (t) {}
        const S = (t) => v.has(t),
          A = s.covMode ? ("act" === s.covMode ? "act" : "plan") : k ? "act" : "plan",
          z = (t) => {
            if (
              ((t) => {
                const e = Dt[t] || {};
                return Rt(e.rest);
              })(t)
            )
              return "rest";
            const e = b[t];
            return !e || ("ab" !== e.st && "lv" !== e.st && "pm" !== e.st && "tout" !== e.st) ? "pr" : e.st;
          },
          E = (t) => "pr" === z(t),
          M = (() => {
            try {
              return KIVO.BassamDay ? KIVO.BassamDay.of(T, s.month, m) : null;
            } catch (t) {
              return null;
            }
          })(),
          O = (t) => (M ? M.mukOf(t) : !(!0 !== (Dt[t] || {}).muk)),
          F = (t) => (t.emp || []).filter(ss),
          C = (t) => F(t).filter((t) => !S(Nt(t))),
          D = (t) => (x ? e.of(t, x) : e.tot(t, Zt)),
          P = (t) => C(t).length,
          L = (t) => C(t).filter((t) => E(Nt(t))).length,
          B = (t) => ("plan" === A ? P(t) : L(t)),
          N = (e) => {
            const s = "gates" === d && t.isParent(e),
              n = s ? t.leavesOf(pe, e) : null,
              o = s ? n.length > 0 && n.every((t) => !!t.closed) : g(e),
              r = s ? n.reduce((t, e) => t + (e.closed ? 0 : D(e)), 0) : o ? 0 : D(e),
              a = s ? n.reduce((t, e) => t + (e.closed ? 0 : B(e)), 0) : B(e);
            let l;
            return (
              (l = o ? "cls" : r > 0 ? (0 === a ? "red" : a < r ? "amb" : a === r ? "grn" : "blu") : a > 0 ? "tea" : "non"),
              {
                st: l,
                need: r,
                c: a,
                plan: s ? n.reduce((t, e) => t + P(e), 0) : P(e),
                act: s ? n.reduce((t, e) => t + L(e), 0) : L(e),
                closed: o,
                isP: s,
                pendN: s ? n.reduce((t, e) => t + (e.closed ? P(e) : 0), 0) : o ? P(e) : 0,
                color: i[l],
                lbl: o ? "✕" : "grn" === l || "non" === l ? "" : r > 0 ? a + "/" + r : "+" + a,
              }
            );
          },
          W = (e) => {
            if ("marks" === d) return e.label || e.kind || "معلم";
            if ("zones" === d) return (e.code || e.name || "مصلى") + (e.zcat ? " — " + e.zcat : "");
            const s = !!e.pOf,
              n = s ? t.leafLabel(t.parentOf(pe, e) || e, e) : e.num || "",
              i = (!s && (e.label || e.name)) || "";
            return (n ? "#" + n : "باب") + (i ? " — " + i : "");
          },
          j = h.map((t, e) => ({ g: t, i: e })),
          I = "gates" === d ? j.filter((t) => !t.g.pOf) : j,
          G = "gates" === d ? j.filter((e) => !t.isParent(e.g)) : j,
          Z = {};
        I.forEach((t) => {
          Z[t.i] = N(t.g);
        });
        const H = { red: 0, amb: 0, grn: 0, blu: 0, tea: 0, non: 0, cls: 0 };
        I.forEach((t) => H[Z[t.i].st]++);
        const Y = (t) => {
            const e = N(t);
            return e.closed ? 0 : Math.max(0, e.need - e.c);
          },
          K = (t) => {
            const e = N(t);
            return e.closed || 0 === e.need ? 0 : Math.max(0, e.c - e.need);
          },
          U = G.reduce((t, e) => t + (g(e.g) ? 0 : D(e.g)), 0),
          X = G.reduce((t, e) => t + (g(e.g) ? 0 : Math.min(D(e.g), B(e.g))), 0),
          V = U ? Math.round((X / U) * 100) : 0,
          q = G.reduce((t, e) => t + Y(e.g), 0),
          Q = G.reduce((t, e) => t + K(e.g), 0),
          _ = G.reduce((t, e) => t + (g(e.g) ? P(e.g) : 0), 0),
          $ = new Set();
        [pe, de, ce].forEach((t) =>
          t.forEach((t) => (t.emp || []).forEach((t) => $.add(Nt(t)))),
        );
        const tt = Ft.filter((t) => {
            const e = Tt(t),
              s = (b[e] && b[e].sh) || Yt[e] || "";
            return x ? s === x : !!s;
          }),
          et = tt.map((t) => Tt(t)).filter((t) => !$.has(t) && E(t) && !S(t)),
          st = tt.filter((t) => S(Tt(t))).length,
          nt = (t, e) => {
            const s = f(t),
              n = f(e);
            return Math.hypot(s.x - n.x, s.y - n.y);
          },
          it = (t) => {
            const e = G.filter((e) => e.g !== t && K(e.g) > 0)
              .map((e) => ({ x: e, d: nt(e.g, t) + (u(e.g) === u(t) ? 0 : 150) }))
              .sort((t, e) => t.d - e.d);
            for (const t of e) {
              const e = C(t.x.g).find((t) => E(Nt(t)) && !O(Nt(t)));
              if (e) return { fromI: t.x.i, from: t.x.g, tok: e, key: Nt(e) };
            }
            return et.length ? { fromI: -1, from: null, tok: et[0], key: et[0] } : null;
          },
          ot = { أ: 3, ب: 2, ج: 1 },
          rt = (t) =>
            String(t || "")
              .replace(/\bبنت\b|\bبن\b/g, "")
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 3)
              .join(" "),
          at = (t) => {
            let e = Wt(t);
            return (
              (e && e !== t) ||
                (b[t] && b[t].name
                  ? (e = b[t].name)
                  : (/^em[a-z0-9]{8,}$/i.test(String(t)) || /^\d{6,}$/.test(String(t))) && (e = "موظف غير معروف")),
              rt(e)
            );
          },
          lt = [];
        h.forEach((e, s) => {
          !g(e) ||
            ("gates" === d && t.isParent(e)) ||
            lt.push({
              t: e.cAt || "",
              k: "cls",
              i: s,
              txt: c.closedV + " " + W(e) + (e.cWhy ? " (" + e.cWhy + ")" : "") + (P(e) ? " — " + P(e) + " بلا موقع فعّال" : ""),
            });
        });
        try {
          const t = KIVO.BassamField;
          t &&
            h.forEach((e, s) => {
              (Array.isArray(e.fLog) ? e.fLog : []).forEach((n) => {
                n &&
                  "closed" !== n.st &&
                  lt.push({
                    t: t.clock(n.at),
                    k: "fdo",
                    i: s,
                    txt:
                      (n.a
                        ? n.a + " — " + W(e)
                        : "open" === n.st && n.dur
                          ? "أُعيد فتح " + W(e) + " بعد " + KIVO.BassamCount(n.dur, "دقيقة", "g") + ""
                          : ("open" === n.st ? "مفتوح" : "") +
                            (n.flow ? ("open" === n.st ? " · " : "") + t.FLOWS[n.flow].t : "") +
                            " — " +
                            W(e)) + (n.by ? " — " + n.by : ""),
                  });
              });
            });
        } catch (t) {}
        (G.forEach((t) =>
          C(t.g).forEach((e) => {
            const s = Nt(e),
              n = z(s);
            "pr" !== n && "rest" !== n && lt.push({ t: (b[s] && b[s].at) || "", k: n, i: t.i, txt: at(s) + " — " + r[n] + " — " + W(t.g) });
          }),
        ),
          ((R && R.mvLog) || [])
            .filter((t) => (t.kind || "gates") === d || (t.rm && -1 === t.toI))
            .forEach((t) => {
              const e = t.toI >= 0 ? h[t.toI] : null,
                s = rt(t.name || Wt(t.key)),
                n = "dr" === t.src ? " (من التقرير اليومي)" : "";
              t.rm
                ? lt.push({
                    t: t.t || "",
                    k: "mv",
                    i: Math.max(0, t.toI),
                    txt: "رُفع " + s + " من " + (t.fromLbl || "") + (t.by ? " — " + t.by : "") + n,
                  })
                : lt.push({
                    t: t.t || "",
                    k: "mv",
                    i: t.toI,
                    txt:
                      "نُقل " +
                      s +
                      " " +
                      (t.fromLbl ? "من " + t.fromLbl + " " : "من الاحتياط ") +
                      "إلى " +
                      (e ? W(e) : t.toLbl || "") +
                      (t.by ? " — " + t.by : "") +
                      n,
                  });
            }),
          lt.sort((t, e) => String(t.t).localeCompare(String(e.t))));
        const dt = ((R && R.mvLog) || []).filter((t) => (t.kind || "gates") === d).length,
          pt = (t) => !(s.covOpen && !1 === s.covOpen[t]),
          ht = (t) => () => this.setState((e) => ({ covOpen: Object.assign({}, e.covOpen || {}, { [t]: !pt(t) }) })),
          gt = (t) => () => this.setState((e) => ({ covFilter: e.covFilter === t ? null : t })),
          ft = (t) => () => this._covFly(t),
          ut = !J,
          yt = (t, e, s, i) =>
            n(
              "div",
              {
                key: t,
                style: {
                  border: "1px solid var(--bd-xeef0f2)",
                  borderRadius: 12,
                  padding: "10px 12px",
                  background: "var(--bg-xffffff)",
                  marginBottom: 10,
                },
              },
              n(
                "div",
                {
                  onClick: ht(t),
                  style: {
                    fontSize: 11.5,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: pt(t) ? 6 : 0,
                    cursor: "pointer",
                    userSelect: "none",
                  },
                },
                n(
                  "span",
                  { style: { display: "inline-flex", alignItems: "center", gap: 4 } },
                  n(
                    "span",
                    {
                      style: {
                        width: 22,
                        height: 22,
                        borderRadius: 7,
                        border: "1px solid var(--bd-xe5e7eb)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        color: "var(--fg-x64748b)",
                        transition: "transform .2s",
                        transform: pt(t) ? "none" : "rotate(-90deg)",
                        marginLeft: 6,
                        flexShrink: 0,
                      },
                    },
                    "▾",
                  ),
                  e,
                ),
                n("span", { onClick: (t) => t.stopPropagation() }, s || null),
              ),
              pt(t) ? i : null,
            ),
          mt = (t, e, s) => [
            n(
              "div",
              {
                key: t + "h",
                onClick: ht(t),
                style: {
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: "var(--fg-x64748b)",
                  margin: "6px 0 4px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                  userSelect: "none",
                },
              },
              n(
                "span",
                {
                  style: {
                    width: 18,
                    height: 18,
                    borderRadius: 6,
                    border: "1px solid var(--bd-xe5e7eb)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    color: "var(--fg-x64748b)",
                    transform: pt(t) ? "none" : "rotate(-90deg)",
                    transition: "transform .2s",
                  },
                },
                "▾",
              ),
              e,
              n("span", { style: { flex: 1, height: 1, background: "var(--bg-xf1f5f9)" } }),
            ),
            pt(t) ? n("div", { key: t + "b" }, s) : null,
          ],
          xt = (t) =>
            n(
              "span",
              {
                style: {
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--fg-x141414)",
                  background: "var(--bg-xf1f5f9)",
                  borderRadius: 9999,
                  padding: "0 8px",
                  marginRight: 4,
                },
              },
              String(t),
            ),
          bt = (t, e, s) =>
            n(
              "button",
              {
                onClick: e,
                style: Object.assign(
                  {
                    height: 24,
                    borderRadius: 8,
                    border: "1px solid var(--bd-a185151810p5)",
                    background: "var(--bg-a185151810p1)",
                    color: "var(--fg-x8a6f35)",
                    fontWeight: 700,
                    fontSize: 10,
                    cursor: "pointer",
                    padding: "0 9px",
                    fontFamily: "'Cairo',sans-serif",
                    whiteSpace: "nowrap",
                  },
                  s || {},
                ),
              },
              t,
            ),
          kt = (t, e) =>
            n(
              "span",
              {
                style: {
                  width: e || 18,
                  height: e || 18,
                  borderRadius: 9999,
                  background: "var(--bg-xb99751)",
                  color: "var(--fg-xffffff)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: (e || 18) / 2,
                  flexShrink: 0,
                },
              },
              String(Wt(t) || "؟").charAt(0),
            ),
          vt = (t, e, s) =>
            n(
              "span",
              {
                draggable: ut,
                onDragStart: (s) => {
                  this._covDrag = { tok: t, key: Nt(t), fromI: e };
                  try {
                    s.dataTransfer.effectAllowed = "move";
                  } catch (t) {}
                  s.stopPropagation();
                },
                title: ut ? "اسحبه وأفلته على باب عاجز" : "",
                style: {
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 10,
                  background: "var(--bg-xffffff)",
                  border: "1px solid var(--bd-xe5e7eb)",
                  borderRadius: 9999,
                  padding: "2px 8px 2px 3px",
                  cursor: ut ? "grab" : "default",
                  whiteSpace: "nowrap",
                },
              },
              kt(Nt(t), 16),
              at(Nt(t)),
              s ? n("i", { style: { fontStyle: "normal", color: "var(--fg-x9a7e40)", fontSize: 9 } }, s) : null,
            ),
          wt = (t) => {
            const e = ((s = t.g), F(s).filter((t) => S(Nt(t))));
            var s;
            return e.length
              ? n(
                  "div",
                  {
                    key: "sup",
                    style: {
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flexWrap: "wrap",
                      fontSize: 10,
                      color: "var(--fg-x8a6f35)",
                    },
                  },
                  n("span", null, "إشرافي على " + ("gates" === d ? "الباب" : "marks" === d ? "المعلم" : "المصلى") + " — لا يُحسب:"),
                  ...e.map((e, s) => {
                    const i = Nt(e);
                    return n(
                      "span",
                      {
                        key: "s" + s,
                        title: w[i] || "إشرافي",
                        style: {
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          background: "var(--bg-a185151810p08)",
                          border: "1px dashed var(--bd-a185151810p5)",
                          borderRadius: 9999,
                          padding: "2px 8px 2px 3px",
                        },
                      },
                      kt(i, 16),
                      at(i),
                      n("i", { style: { fontStyle: "normal", fontSize: 9 } }, w[i] || "إشرافي"),
                      ut
                        ? n(
                            "button",
                            {
                              onClick: (s) => {
                                (s.stopPropagation(), this._covLift(e, i, t.i));
                              },
                              title: "رفعه من الباب",
                              style: {
                                border: 0,
                                background: "transparent",
                                color: "var(--fg-xdc2626)",
                                cursor: "pointer",
                                fontSize: 11,
                                padding: "0 2px",
                                fontFamily: "inherit",
                              },
                            },
                            "✕",
                          )
                        : null,
                    );
                  }),
                )
              : null;
          },
          St = (t, e) => {
            const i = t.g,
              o = N(i),
              r = s.dsSel && "gate" === s.dsSel.t && s.dsSel.i === t.i,
              a = wt(t),
              l = a || e ? [].concat(a ? [a] : [], e ? (Array.isArray(e) ? e : [e]) : []) : null;
            return n(
              "div",
              { key: "r" + t.i },
              n(
                "div",
                {
                  onClick: ft(t.i),
                  onDragOver: ut
                    ? (t) => {
                        (t.preventDefault(), (t.currentTarget.style.outline = "2px dashed #2563eb"));
                      }
                    : void 0,
                  onDragLeave: (t) => {
                    t.currentTarget.style.outline = "none";
                  },
                  onDrop: ut
                    ? (e) => {
                        (e.preventDefault(), (e.currentTarget.style.outline = "none"));
                        const s = this._covDrag;
                        ((this._covDrag = null), s && s.fromI !== t.i && this._covMove(s.tok, s.key, s.fromI, t.i, !1, Wt(s.key)));
                      }
                    : void 0,
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 8px",
                    borderRadius: l ? "9px 9px 0 0" : 9,
                    border: "1px solid " + (r ? "var(--bd-xb99751)" : "var(--bd-xf1f5f9)"),
                    background: r ? "var(--bg-a185151810p08)" : "var(--bg-xffffff)",
                    marginBottom: l ? 0 : 5,
                    cursor: "pointer",
                  },
                },
                n("i", { style: { width: 10, height: 10, borderRadius: 3, flexShrink: 0, background: o.color } }),
                n(
                  "div",
                  { style: { minWidth: 0, flex: 1 } },
                  n(
                    "div",
                    { style: { fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } },
                    W(i),
                  ),
                  n(
                    "div",
                    {
                      style: {
                        fontSize: 9.5,
                        color: "var(--fg-x64748b)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      },
                    },
                    [
                      u(i),
                      "zones" === d ? i.ztype || "" : i.kind || "",
                      g(i) ? c.closed + (i.cAt ? " " + i.cAt : "") + (i.cWhy ? " — " + i.cWhy : "") : null,
                    ]
                      .filter(Boolean)
                      .join(" · "),
                  ),
                ),
                i.pri
                  ? n(
                      "span",
                      {
                        style: {
                          fontSize: 9,
                          padding: "1px 6px",
                          borderRadius: 6,
                          background: "أ" === i.pri ? "var(--bg-a22038380p1)" : "var(--bg-xf1f5f9)",
                          color: "أ" === i.pri ? "var(--fg-xdc2626)" : "var(--fg-x475569)",
                          flexShrink: 0,
                        },
                      },
                      "أولوية " + i.pri,
                    )
                  : null,
                n(
                  "span",
                  {
                    style: {
                      fontSize: 12,
                      fontWeight: 700,
                      fontFeatureSettings: "'tnum'",
                      flexShrink: 0,
                      width: 34,
                      textAlign: "center",
                      color: o.color,
                    },
                  },
                  o.closed ? "✕" : o.c + "/" + o.need,
                ),
              ),
              l
                ? n(
                    "div",
                    {
                      style: {
                        margin: "0 0 8px 0",
                        padding: "6px 10px",
                        borderRadius: "0 0 9px 9px",
                        background: "var(--bg-xf8fafc)",
                        border: "1px solid var(--bd-xf1f5f9)",
                        borderTop: 0,
                        fontSize: 10.5,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      },
                    },
                    l,
                  )
                : null,
            );
          },
          At = (() => {
            if (
              !this.bsLensOn("dist") ||
              !(
                ("gates" === Te && "cov" === s.gateDim) ||
                ("marks" === Te && "cov" === s.markDim) ||
                ("zones" === Te && "cov" === s.brkDim)
              ) ||
              ("gates" === Te ? "gates" !== d : "marks" === Te ? "marks" !== d : "zones" !== d)
            )
              return null;
            const t = 2 * Math.PI * 40,
              e = V >= 90 ? "#059669" : V >= 75 ? "#d97706" : "#dc2626",
              i = (t, e, s, i, o) =>
                n(
                  "div",
                  {
                    onClick: o,
                    style: {
                      borderRadius: 9,
                      padding: "6px 4px",
                      textAlign: "center",
                      cursor: "pointer",
                      border: "1px solid var(--bd-xf1f5f9)",
                      background: i,
                    },
                  },
                  n("div", { style: { fontSize: 17, fontWeight: 700, fontFeatureSettings: "'tnum'", color: s } }, String(t)),
                  n("div", { style: { fontSize: 9.5, color: "var(--fg-x64748b)" } }, e),
                ),
              o = (t, e) =>
                n(
                  "button",
                  {
                    onClick: () => this.setState({ covMode: t }),
                    style: {
                      border: 0,
                      background: A === t ? "var(--bg-xb99751)" : "transparent",
                      color: A === t ? "var(--fg-xffffff)" : "var(--fg-x475569)",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "3px 10px",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontFamily: "'Cairo',sans-serif",
                    },
                  },
                  e,
                ),
              a = yt(
                "now",
                n(
                  "span",
                  null,
                  "الموقف الآن ",
                  n(
                    "small",
                    { style: { fontSize: 10, color: "var(--fg-x64748b)", fontWeight: 400 } },
                    "· " + (x || "لا وردية لليوم") + (k ? " · من تقرير اليوم" : " · لا تقرير مسحوب — الفعلي يعتمد الراحات فقط"),
                  ),
                ),
                n(
                  "span",
                  { style: { display: "inline-flex", background: "var(--bg-xf1f5f9)", borderRadius: 10, padding: 2, gap: 2 } },
                  o("plan", "مخطط"),
                  o("act", "فعلي"),
                ),
                n(
                  "div",
                  null,
                  n(
                    "div",
                    { style: { display: "grid", gridTemplateColumns: "auto 1fr", gap: 12, alignItems: "center" } },
                    n(
                      "div",
                      { style: { position: "relative", width: 92, height: 92, display: "grid", placeItems: "center" } },
                      n(
                        "svg",
                        {
                          width: 92,
                          height: 92,
                          viewBox: "0 0 92 92",
                          style: { position: "absolute", inset: 0, transform: "rotate(-90deg)" },
                        },
                        n("circle", { cx: 46, cy: 46, r: 40, fill: "none", stroke: "rgba(185,151,81,.15)", strokeWidth: 8 }),
                        n("circle", {
                          cx: 46,
                          cy: 46,
                          r: 40,
                          fill: "none",
                          stroke: e,
                          strokeWidth: 8,
                          strokeLinecap: "round",
                          strokeDasharray: (t * V) / 100 + " " + t,
                        }),
                      ),
                      n(
                        "div",
                        { style: { textAlign: "center" } },
                        n("div", { style: { fontSize: 22, fontWeight: 700, lineHeight: 1 } }, V + "%"),
                        n("div", { style: { fontSize: 9.5, color: "var(--fg-x64748b)" } }, X + " من " + U),
                      ),
                    ),
                    n(
                      "div",
                      null,
                      n(
                        "div",
                        { style: { fontSize: 11, fontWeight: 700, marginBottom: 4 } },
                        "التغطية " + ("plan" === A ? "المخططة" : "الفعلية") + " — " + c.many,
                      ),
                      n(
                        "div",
                        { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 } },
                        i(q, "عجز (موظف)", "#dc2626", "rgba(220,38,38,.06)", gt("red")),
                        i(Q, "فائض قابل للنقل", "#3e8ac4", "rgba(37,99,235,.06)", gt("blu")),
                        i(_, "بلا موقع فعّال", "#b45309", "rgba(245,158,11,.08)", gt("cls")),
                      ),
                      n(
                        "div",
                        { style: { fontSize: 9.5, color: "var(--fg-x64748b)", marginTop: 5 } },
                        "الاحتياط غير المسكَّن: ",
                        n("b", null, String(et.length)),
                        " · الحاضرون الآن " + tt.filter((t) => E(Tt(t)) && !S(Tt(t))).length + " من " + (tt.length - st),
                      ),
                      st
                        ? n(
                            "div",
                            {
                              style: { fontSize: 9.5, color: "var(--fg-x8a6f35)", marginTop: 3 },
                              title:
                                "حاملو قالب صلاحيات موسوم «إشرافي» ورئيس ونائب الوردية في تقرير اليوم — لا يُسكَّنون ولا يُحسبون في التغطية",
                            },
                            "الطاقم الإشرافي: ",
                            n("b", null, String(st)),
                            " — خارج التغطية",
                          )
                        : null,
                    ),
                  ),
                ),
              ),
              l = yt(
                "log",
                n("span", null, "ما تغيّر في الوردية ", xt(lt.length)),
                dt && ut ? bt("تراجع عن آخر نقل", () => this._covUndo()) : null,
                n(
                  "div",
                  { style: { maxHeight: 190, overflow: "auto" } },
                  lt.length
                    ? lt
                        .slice()
                        .reverse()
                        .map((t, e) =>
                          n(
                            "div",
                            {
                              key: e,
                              onClick: ft(t.i),
                              style: {
                                display: "flex",
                                gap: 8,
                                padding: "6px 0",
                                borderBottom: "1px solid var(--bd-xf1f5f9)",
                                fontSize: 10.5,
                                cursor: "pointer",
                                alignItems: "flex-start",
                              },
                            },
                            n(
                              "span",
                              {
                                style: {
                                  fontSize: 9.5,
                                  color: "var(--fg-x94a3b8)",
                                  fontFeatureSettings: "'tnum'",
                                  flexShrink: 0,
                                  width: 36,
                                  direction: "ltr",
                                  textAlign: "right",
                                },
                              },
                              t.t || "—",
                            ),
                            n("i", {
                              style: {
                                width: 8,
                                height: 8,
                                borderRadius: 9999,
                                flexShrink: 0,
                                marginTop: 5,
                                background:
                                  "cls" === t.k
                                    ? "var(--bg-x64748b)"
                                    : "mv" === t.k
                                      ? "var(--bg-x2563eb)"
                                      : "ab" === t.k
                                        ? "var(--bg-xdc2626)"
                                        : "fds" === t.k
                                          ? "var(--bg-x7f1d1d)"
                                          : "fdb" === t.k
                                            ? "var(--bg-xb45309)"
                                            : "fdo" === t.k
                                              ? "var(--bg-x059669)"
                                              : "var(--bg-xd97706)",
                              },
                            }),
                            n("span", null, t.txt),
                          ),
                        )
                    : n(
                        "div",
                        { style: { fontSize: 10.5, color: "var(--fg-x94a3b8)", padding: 4 } },
                        "لا أحداث بعد — الإغلاقات والتأشيرات والنقولات تظهر هنا بوقتها",
                      ),
                ),
              ),
              p = G.filter(
                (t) =>
                  !y ||
                  N(t.g).st === y ||
                  (t.g.pOf &&
                    Z[j.find((e) => e.g.gid === t.g.pOf) ? j.find((e) => e.g.gid === t.g.pOf).i : -1] &&
                    Z[j.find((e) => e.g.gid === t.g.pOf).i].st === y),
              ),
              h = p.filter((t) => g(t.g) && P(t.g) > 0),
              f = p
                .filter((t) => Y(t.g) > 0)
                .sort((t, e) => (0 === N(e.g).c) - (0 === N(t.g).c) || (ot[e.g.pri] || 0) - (ot[t.g.pri] || 0) || Y(e.g) - Y(t.g)),
              m = p.filter((t) => K(t.g) > 0).sort((t, e) => K(e.g) - K(t.g)),
              b = [];
            (h.length &&
              b.push(
                ...mt(
                  "dec-cls",
                  n("span", null, "موظفون " + c.pend + " ", xt(h.reduce((t, e) => t + P(e.g), 0))),
                  h.map((t) =>
                    St(t, [
                      n("span", { key: "l" }, "عليه:"),
                      ...C(t.g).map((e, s) => n("span", { key: "w" + s }, vt(e, t.i))),
                      ut
                        ? bt(
                            "نقلهم إلى أقرب عجز",
                            (e) => {
                              (e.stopPropagation(), this._covMoveAll(t.i));
                            },
                            { marginRight: "auto" },
                          )
                        : null,
                    ]),
                  ),
                ),
              ),
              b.push(
                ...mt(
                  "dec-def",
                  n(
                    "span",
                    null,
                    "عجز ",
                    xt(
                      f.length +
                        " " +
                        c.one +
                        " · " +
                        KIVO.BassamCount(
                          f.reduce((t, e) => t + Y(e.g), 0),
                          "موظف",
                        ) +
                        "",
                    ),
                  ),
                  f.length
                    ? f.map((t) => {
                        const e = ut ? it(t.g) : null;
                        return St(
                          t,
                          e
                            ? [
                                n("span", { key: "a", style: { color: "var(--fg-x64748b)" } }, "اقتراح:"),
                                n("span", { key: "b" }, vt(e.tok, e.fromI)),
                                n(
                                  "span",
                                  { key: "c", style: { color: "var(--fg-x64748b)" } },
                                  e.from
                                    ? "من " + W(e.from) + " (فائض " + K(e.from) + (u(e.from) === u(t.g) ? " · نفس الموقع" : "") + ")"
                                    : "من الاحتياط",
                                ),
                                bt(
                                  "نقل",
                                  (s) => {
                                    (s.stopPropagation(), this._covMove(e.tok, e.key, e.fromI, t.i, !1, Wt(e.key)));
                                  },
                                  { marginRight: "auto" },
                                ),
                              ]
                            : ut
                              ? [
                                  n(
                                    "span",
                                    { key: "n", style: { color: "var(--fg-xdc2626)" } },
                                    "لا فائض ولا احتياط متاح — يلزم استدعاء من وردية أخرى",
                                  ),
                                ]
                              : null,
                        );
                      })
                    : n("div", { style: { fontSize: 11, color: "var(--fg-x059669)", padding: 6 } }, "لا عجز — التغطية مكتملة ✓"),
                ),
              ),
              b.push(
                ...mt(
                  "dec-sur",
                  n(
                    "span",
                    null,
                    "فائض — مصدر التغطية ",
                    xt(
                      m.length +
                        " " +
                        c.one +
                        " · " +
                        KIVO.BassamCount(
                          m.reduce((t, e) => t + K(e.g), 0),
                          "موظف",
                        ) +
                        "",
                    ),
                  ),
                  m.length
                    ? m.map((t) =>
                        St(t, [
                          n(
                            "div",
                            { key: "ch", style: { display: "flex", flexWrap: "wrap", gap: 4 } },
                            ...C(t.g).map((e, s) => {
                              const i = Nt(e),
                                o = z(i);
                              return n("span", { key: "w" + s }, vt(e, t.i, "pr" !== o ? r[o] : O(i) ? "مكلف" : ""));
                            }),
                          ),
                        ]),
                      )
                    : n("div", { style: { fontSize: 10.5, color: "var(--fg-x94a3b8)", padding: 4 } }, "لا فائض"),
                ),
              ),
              b.push(
                ...mt(
                  "dec-res",
                  n("span", null, "الاحتياط — حاضرون اليوم غير مسكَّنين ", xt(et.length)),
                  et.length
                    ? n(
                        "div",
                        { style: { display: "flex", flexWrap: "wrap", gap: 4, padding: "4px 2px 8px" } },
                        ...et.map((t, e) => n("span", { key: "rs" + e }, vt(t, -1, O(t) ? "مكلف" : ""))),
                      )
                    : n("div", { style: { fontSize: 10.5, color: "var(--fg-x94a3b8)", padding: 4 } }, "كل الحاضرين مسكَّنون — لا احتياط"),
                ),
              ));
            const v = yt(
              "dec",
              n("span", null, "يحتاج قراراً — الأشد أولاً ", xt(f.length + h.length)),
              n(
                "small",
                { style: { fontSize: 10, color: "var(--fg-x64748b)", fontWeight: 400 } },
                ut ? "اسحب موظفاً من الفائض وأفلته على الصف" : "الجولة معتمدة — عرض فقط",
              ),
              n("div", null, ...b),
            );
            return n("div", { key: "covtab" }, a, l, v);
          })(),
          zt = p
            ? n(
                "div",
                {
                  key: "covlg",
                  className: "bs-covlg",
                  dir: "rtl",
                  style: {
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    overflowX: "auto",
                    scrollbarWidth: "none",
                    flexWrap: "nowrap",
                  },
                },
                n(
                  "span",
                  {
                    title: (x || "") + " — انقر لوناً للتصفية",
                    style: {
                      fontSize: 10,
                      color: "var(--fg-x64748b)",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      marginLeft: 4,
                    },
                  },
                  "التغطية · ",
                  n("b", { style: { color: "var(--fg-x141414)" } }, "plan" === A ? "مخطط" : "فعلي"),
                ),
                n(
                  "span",
                  {
                    onClick: () => this.setState({ covFilter: null }),
                    title: "إلغاء التصفية",
                    style: {
                      width: 26,
                      height: 24,
                      borderRadius: 8,
                      border: "1px solid " + (y ? "var(--bd-xdc2626)" : "var(--bd-xe5e7eb)"),
                      color: y ? "var(--fg-xdc2626)" : "var(--fg-x334155)",
                      opacity: y ? 1 : 0.35,
                      cursor: y ? "pointer" : "default",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      flexShrink: 0,
                      background: "var(--bg-xffffff)",
                    },
                  },
                  "✕",
                ),
                n(
                  "span",
                  {
                    title: "إجمالي " + c.many + " في الجولة",
                    style: { fontSize: 10, color: "var(--fg-x64748b)", flexShrink: 0, whiteSpace: "nowrap", marginLeft: 4 },
                  },
                  I.length + " " + c.one,
                ),
                ...Object.keys(a).map((t) => {
                  return n(
                    "span",
                    {
                      key: t,
                      onClick: gt(t),
                      title: o[t],
                      style:
                        ((e = y === t),
                        {
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          fontSize: 10.5,
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: 8,
                          border: "1px solid " + (e ? "#b99751" : "#E5E7EB"),
                          background: e ? "var(--bg-a185151810p12)" : "var(--bg-xffffff)",
                          color: "var(--fg-x334155)",
                          cursor: "pointer",
                          fontFamily: "'Cairo',sans-serif",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }),
                    },
                    ((t) =>
                      n("i", {
                        style: {
                          width: 11,
                          height: 11,
                          borderRadius: 3,
                          display: "inline-block",
                          flexShrink: 0,
                          background:
                            "cls" === t
                              ? "repeating-linear-gradient(45deg,#94a3b8 0 3px,#cbd5e1 3px 6px)"
                              : "non" === t
                                ? "var(--bg-xffffff)"
                                : i[t],
                          border: "non" === t ? "1px dashed #94a3b8" : "0",
                        },
                      }))(t),
                    a[t] + " ",
                    n("b", { style: { fontFeatureSettings: "'tnum'", color: "var(--fg-x141414)" } }, String(H[t])),
                  );
                  var e;
                }),
              )
            : null;
        return {
          on: p,
          kind: d,
          mode: A,
          filter: y,
          C: i,
          stateOf: N,
          stTop: Z,
          counts: H,
          pendN: _,
          node: At,
          legend: zt,
          tops: I,
          els: G,
          NM: W,
          suggest: it,
          toks: C,
          keyOfTok0: Nt,
          isSup: S,
          supWhy: w,
          stOfKey: z,
          tinOf: (t) => !(!b[t] || !b[t].tin),
          STL: r,
          STC: { ab: "#f87171", pm: "#fbbf24", lv: "#67e8f9", rest: "#fcd34d", tout: "#c4b5fd", tin: "#a78bfa" },
          repHas: k,
          W: c,
        };
      })(),
      vs = this.bsLensOn("dist")
        ? [
            ["summary", "مؤشرات التشغيل"],
            ["dsum", "مؤشرات التوزيع"],
            ["cov", "حالة التغطية"],
          ]
        : [["summary", "مؤشرات التشغيل"]],
      ws = vs.map((t) => ({
        label: t[1],
        icA: KIVO.BassamMix.dimIcon(t[0]).a,
        icB: KIVO.BassamMix.dimIcon(t[0]).b,
        click: () =>
          this.setState(
            Object.assign(
              { gateDim: t[0] },
              "gates" === s.lens && this.bsLensOn("dist") ? { dsAsn: "dsum" === t[0] || "cov" === t[0], dsSel: null, selMulti: [] } : {},
            ),
          ),
        on: t[0] === cs,
        style: KIVO.BassamMix.tabStyle(t[0] === cs, vs.length),
      })),
      Ss = [
        ["kind", "النوع"],
        ["off", "الحالة"],
      ],
      As = Ss.some((t) => t[0] === s.markDim) ? s.markDim : "kind",
      zs = this.bsLensOn("dist") ? ("dsum" === s.markDim ? "dsum" : "cov" === s.markDim ? "cov" : "summary") : "summary",
      Es = (t) => {
        const e = {},
          s = [];
        return (
          ce.forEach((n) => {
            const i = "off" === t ? (n.off ? "معطّل" : "مفعّل") : String(n.kind || "").trim() || "بلا نوع";
            (null == e[i] && ((e[i] = 0), s.push(i)), e[i]++);
          }),
          s.map((t) => ({ label: t, n: e[t] }))
        );
      },
      Ms = Es(As),
      Os = ce.length,
      Fs = (t) => ("off" === As && "معطّل" === t.label ? "#64748b" : "#9c3d6b"),
      Cs = Ms.map((t) => ({ ...t, color: Fs(t), base: Os })),
      Ds = this.bsLensOn("dist")
        ? [
            ["summary", "مؤشرات المعالم"],
            ["dsum", "مؤشرات التوزيع"],
            ["cov", "حالة التغطية"],
          ]
        : [["summary", "مؤشرات المعالم"]],
      Ts = Ds.map((t) => ({
        label: t[1],
        icA: KIVO.BassamMix.dimIcon(t[0]).a,
        icB: KIVO.BassamMix.dimIcon(t[0]).b,
        click: () =>
          this.setState(
            Object.assign(
              { markDim: t[0] },
              "marks" === s.lens && this.bsLensOn("dist") ? { dsAsn: "dsum" === t[0] || "cov" === t[0], dsSel: null, selMulti: [] } : {},
            ),
          ),
        on: t[0] === zs,
        style: KIVO.BassamMix.tabStyle(t[0] === zs, Ds.length),
      })),
      Ps = [
        ["type", "النوع"],
        ["dir", "الاتجاه"],
      ],
      Ls = Ps.some((t) => t[0] === s.pathDim) ? s.pathDim : "type",
      Bs = "summary" === s.pathDim ? "summary" : Ls,
      Ns = {
        type: [
          ["in", "دخول"],
          ["out", "خروج"],
          ["emg", "طوارئ"],
          ["svc", "خدمات"],
        ],
        dir: [
          ["fwd", "اتجاه واحد"],
          ["two", "اتجاهان"],
        ],
        active: [
          ["on", "مفعّل"],
          ["off", "معطّل"],
        ],
      },
      Ws = (t) =>
        Ns[t]
          .map((e) => ({
            key: e[0],
            label: e[1],
            n: he.filter(
              (s) =>
                ((t, e) =>
                  "type" === e
                    ? (t && t.type) || "in"
                    : "dir" === e
                      ? "two" === (t && t.dir)
                        ? "two"
                        : "fwd"
                      : t && !1 === t.active
                        ? "off"
                        : "on")(s, t) === e[0],
            ).length,
          }))
          .filter((t) => t.n > 0)
          .sort((t, e) => e.n - t.n),
      js = Ws(Ls),
      Is = js.length ? js[0].n : 0,
      Rs = js.map((t) => {
        return {
          ...t,
          color: "type" === Ls ? ge[t.key].c : "rgba(185,151,81," + ((e = t.n), (0.3 + 0.6 * (Is ? e / Is : 0)).toFixed(2) + ")"),
        };
        var e;
      }),
      Gs = [Ze].concat(Ps);
    Gs.map((t) => ({
      label: t[1],
      icA: KIVO.BassamMix.dimIcon(t[0]).a,
      icB: KIVO.BassamMix.dimIcon(t[0]).b,
      click: () => this.setState({ pathDim: t[0] }),
      on: t[0] === Bs,
      style: KIVO.BassamMix.tabStyle(t[0] === Bs, Gs.length),
    }));
    let Zs = [],
      Hs = "",
      Ys = "";
    if ("paths" === Te) ((Hs = "مؤشرات المسارات"), (Ys = "مسار"), (Zs = Rs.map((t) => ({ label: t.label, color: t.color, n: t.n }))));
    else if ("gates" === Te)
      ((Hs = "مؤشرات التشغيل"), (Ys = gs ? "انتماء" : "باب"), (Zs = bs.map((t) => ({ label: t.label, color: t.color, n: t.n }))));
    else if ("marks" === Te) ((Hs = "مؤشرات المعالم"), (Ys = "معلم"), (Zs = Cs.map((t) => ({ label: t.label, color: t.color, n: t.n }))));
    else if ("dist" === Te)
      ((Hs = "مؤشرات التوزيع — " + (null != _e ? Jt(_e) : "كل الورديات")),
        (Ys = os),
        (Zs = is.map((t) => ({ label: t.label, color: t.color, n: t.n }))));
    else if (zt) ((Hs = "مؤشرات الكثافة"), (Ys = "مصلى"), (Zs = Xe.map((t) => ({ label: t.label, color: t.color, n: t.n }))));
    else {
      ((Hs = "توزيع المصليات على التصنيفات"),
        (Ys = "مصلى"),
        (Zs = Ge.map((t) => ({ label: t[1], color: t[2], n: de.filter((e) => e.cat === t[0]).length }))));
      const t = de.filter((t) => !Ge.some((e) => e[0] === t.cat)).length;
      t && Zs.push({ label: "أخرى", color: "#b99751", n: t });
    }
    const Ks = Zs.reduce((t, e) => t + e.n, 0),
      Us = Zs.filter((t) => t.n > 0).map((t) => ({
        label: t.label,
        color: t.color,
        count: String(t.n),
        pct: String(Ks ? Math.round((t.n / Ks) * 100) : 0),
        pillBorder: t.color + "30",
      })),
      Xs = KIVO.BassamMix.donutCss(
        Us.map((t) => ({ n: +t.count, color: t.color })),
        Ks,
      ),
      Js =
        (Us.length && Us.reduce((t, e) => (+e.count > +t.count ? e : t), Us[0]),
        zt
          ? ["region", "ztype", "zcat"].indexOf(s.densDim) >= 0
            ? s.densDim
            : "region"
          : ["region", "yard", "ztype", "zcat", "ztypecat", "zstate"].indexOf(s.brkDim) >= 0
            ? s.brkDim
            : "region"),
      Vs = (t) =>
        "zstate" === Js
          ? t.off
            ? "معطّلة"
            : "مفعّلة"
          : "ztypecat" === Js
            ? (String(t.ztype || "").trim() || "بلا نوع") + " · " + (String(t.zcat || "").trim() || "بلا فئة")
            : String(null == t[Js] ? "" : t[Js]).trim() || "غير محدّد",
      qs = de.map((t, e) => {
        return {
          gk: Vs(t),
          act: () => {
            this.flashSel({ t: "zone", i: e }, zt ? "density" : null);
          },
          actTitle: zt ? "تحديد المصلى وفتح قراءته" : "تحديد المصلى وإظهار مكانه",
          canAct: Q && !zt,
          offNow: !!t.off,
          onNow: !t.off,
          toggleOff: () => {
            Q &&
              this._updRoundAt(this.state.floor >= 0 ? this.state.floor : 0, (t) => {
                t.zones = (t.zones || []).map((t, s) => (s === e ? this._fdTog(t, "zones") : t));
              });
          },
          toggleTitle: t.off ? "تفعيل المصلى" : "إطفاء المصلى",
          canEdit: !0,
          edit: () => {
            Q && this.openZoneEditor(e);
          },
          name:
            (t.code || "مصلى") +
            " — " +
            ([String(t.ztype || "").trim(), String(t.zcat || "").trim()].filter(Boolean).join(" · ") ||
              ((s = t.cat), "men" === s ? "مصلى رجال" : "women" === s ? "مصلى نساء" : "service" === s ? "منطقة خدمات" : "مصلى")),
          meta: [t.off ? "معطّلة" : "مفعّلة", [t.region, t.level].filter(Boolean).join(" · ") || "بدون ترميز"].join(" · "),
          showAct: !0,
          showDens: zt,
          densLbl: (() => {
            if (t.off) return "معطّلة";
            const e = null == t.count || "" === t.count ? null : +t.count;
            return null == e
              ? "منخفضة · بلا قراءة"
              : (e < 40 ? "منخفضة" : e < 75 ? "متوسطة" : e <= 100 ? "مرتفعة" : "اكتظاظ") + " · " + e + "%";
          })(),
          densStyle: (() => {
            const e = t.off ? -1 : null == t.count || "" === t.count ? 0 : +t.count,
              s = t.off
                ? ["rgba(148,163,184,0.14)", "#64748b", "rgba(148,163,184,0.35)"]
                : e < 40
                  ? ["rgba(34,197,94,0.12)", "#15803d", "rgba(34,197,94,0.32)"]
                  : e < 75
                    ? ["rgba(245,158,11,0.12)", "#b45309", "rgba(245,158,11,0.32)"]
                    : e <= 100
                      ? ["rgba(239,68,68,0.12)", "#dc2626", "rgba(239,68,68,0.32)"]
                      : ["rgba(153,27,27,0.14)", "#991b1b", "rgba(153,27,27,0.4)"];
            return (
              "display:inline-flex;align-items:center;flex-shrink:0;white-space:nowrap;padding:2px 8px;border-radius:9999px;font-size:8.5px;font-weight:800;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';background:" +
              s[0] +
              ";color:" +
              s[1] +
              ";border:1px solid " +
              s[2]
            );
          })(),
          densHas: Q && !t.off && !(null == t.count || "" === t.count),
          densClear: () => {
            Q && this._densClearAt(e, nt);
          },
          densClearTitle: "مسح قراءة " + it + " لهذا المصلى — العدد والنسبة معاً",
          ...this._fdHistOf("zones", e, t),
          color: zt ? gt(t.count, t.off) : C[t.cat] || "#b99751",
        };
        var s;
      }),
      Qs = pe.map((t, e) => ({
        gk: String(t.kind || "").trim() || "بلا نوع",
        act: () => {
          this.flashSel({ t: "gate", i: e });
        },
        actTitle: "تحديد الباب وإظهار مكانه",
        canAct: Q,
        offNow: KIVO.BassamLeaf.closedOf(pe, t),
        onNow: !KIVO.BassamLeaf.closedOf(pe, t),
        toggleOff: () => {
          if (Q) {
            if (!KIVO.BassamLeaf.closedOf(pe, t)) {
              const t = (t) => (t < 10 ? "0" : "") + t;
              let s = "12",
                n = "00";
              try {
                const e = new Date();
                ((s = t(e.getHours())), (n = t(e.getMinutes())));
              } catch (t) {}
              return void this.setState({ gClose: { idx: [e], why: "", h: s, m: n, dd: null } });
            }
            this._updRoundAt(this.state.floor >= 0 ? this.state.floor : 0, (t) => {
              const s = this._leafIdx(t.gates, [e]);
              t.gates = (t.gates || []).map((t, e) => (s.indexOf(e) < 0 ? t : this._fdOpen(t)));
            });
          }
        },
        toggleTitle: KIVO.BassamLeaf.isParent(t)
          ? KIVO.BassamLeaf.closedOf(pe, t)
            ? "فتح كل فتحات الباب"
            : "إغلاق كل فتحات الباب"
          : t.closed
            ? "فتح الباب"
            : "إغلاق الباب",
        canEdit: !1,
        edit: () => {},
        name:
          (t.num ? "#" + t.num + " — " : "") +
          (t.label || t.name || "باب") +
          (KIVO.BassamLeaf.isParent(t) ? " · " + KIVO.BassamCount(KIVO.BassamLeaf.leafCount(t), "باب") + "" : ""),
        meta: KIVO.BassamLeaf.isParent(t)
          ? (() => {
              const e = KIVO.BassamLeaf.agg(pe, t, null, ss);
              return ["باب أم", "مفتوح " + e.open + " من " + e.n, t.kind || null].filter(Boolean).join(" · ");
            })()
          : [t.closed ? "مغلق" + (t.cAt ? " " + t.cAt : "") : "مفتوح", t.closed && t.cWhy ? t.cWhy : null, t.kind || null]
              .filter(Boolean)
              .join(" · "),
        ...this._fdHistOf("gates", e, t),
        color: KIVO.BassamLeaf.closedOf(pe, t) ? "#64748b" : "#16a34a",
      })),
      _s = (() => {
        const t = KIVO.BassamLeaf,
          e = s.gExp || {},
          n = {};
        return (
          Qs.forEach((e, s) => {
            const i = pe[s];
            t.isParent(i) && ((n[i.gid] = e), (e.gid = i.gid));
          }),
          Qs.forEach((t, e) => {
            const s = pe[e];
            s && s.pOf && n[s.pOf] && ((t.isKid = !0), (t.showAct = !0), (t.showDens = !1), (n[s.pOf].kids = n[s.pOf].kids || []).push(t));
          }),
          Qs.filter((t) => !t.isKid).map((t) =>
            t.kids
              ? Object.assign(t, {
                  isParent: !0,
                  kidsOn: !!e[t.gid],
                  kidsN: String(t.kids.length),
                  kidsTitle: (e[t.gid] ? "طيّ فتحات الباب" : "فرد فتحات الباب") + " (" + t.kids.length + ") — يفردها على الخريطة أيضاً",
                  kidsTog: () => this._togLeafExp(t.gid),
                  kidsChev: "transition:transform .2s;flex-shrink:0;" + (e[t.gid] ? "transform:rotate(180deg)" : ""),
                })
              : t,
          )
        );
      })(),
      $s = ce.map((t, e) => ({
        gk: String(t.kind || "").trim() || "بلا نوع",
        act: () => {
          this.flashSel({ t: "mark", i: e });
        },
        actTitle: "تحديد المعلم وإظهار مكانه",
        canAct: Q,
        offNow: !!t.off,
        onNow: !t.off,
        toggleOff: () => {
          Q &&
            this._updRoundAt(this.state.floor >= 0 ? this.state.floor : 0, (t) => {
              t.marks = (t.marks || []).map((t, s) => (s === e ? this._fdTog(t, "marks") : t));
            });
        },
        toggleTitle: t.off ? "تفعيل المعلم" : "تعطيل المعلم",
        canEdit: Q,
        edit: () => {
          Q && this.openMarkEditor(e);
        },
        name: t.label || "معلم",
        meta: [
          t.off ? "معطّل" : "مفعّل",
          t.kind || null,
          this.bsLensOn("dist") ? KIVO.BassamCount((t.emp || []).length, "موظف") + "" : null,
        ]
          .filter(Boolean)
          .join(" · "),
        ...this._fdHistOf("marks", e, t),
        color: t.off ? "#64748b" : "#9c3d6b",
      })),
      tn =
        "dens" === Te
          ? 0 === de.length
          : "gates" === Te
            ? 0 === pe.length
            : "marks" === Te
              ? 0 === ce.length
              : "paths" === Te
                ? 0 === he.length
                : "dist" === Te
                  ? 0 === Ae.length
                  : 0 === de.length,
      en =
        "dens" === Te
          ? {
              t: "لا توجد مصليات لقياس الكثافة",
              x: "هذه الجولة لا تتضمّن مصليات — تُسحب المصليات من الخطة التشغيلية عند بدء الجولة.",
              p1: "M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",
              p2: "",
            }
          : "dist" === Te
            ? {
                t: "لا توجد عناصر للتوزيع",
                x: "هذه الجولة لا تتضمّن مصليات أو أبواب — تُسحب من الخطة التشغيلية عند بدء الجولة.",
                p1: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
                p2: "M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
              }
            : "gates" === Te
              ? {
                  t: "لا توجد أبواب في هذه الجولة",
                  x: "لم تتضمّن الخطة المسحوبة أي أبواب لهذا اليوم.",
                  p1: "M13 4h3a2 2 0 0 1 2 2v14",
                  p2: "M2 20h3",
                }
              : "marks" === Te
                ? {
                    t: "لا توجد معالم في هذه الجولة",
                    x: "لم تتضمّن الخطة المسحوبة أي معالم — أو أضِف معلماً بأداة «وضع معلم».",
                    p1: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",
                    p2: "M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
                  }
                : "paths" === Te
                  ? {
                      t: "لا توجد مسارات في هذه الجولة",
                      x: "لم تتضمّن الخطة المسحوبة أي مسارات لهذا اليوم.",
                      p1: "M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15",
                      p2: "M9 19a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
                    }
                  : {
                      t: "خريطة الجولة فارغة",
                      x: "لم تتضمّن الخطة المسحوبة أي مصليات أو أبواب لهذا اليوم.",
                      p1: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",
                      p2: "M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
                    },
      sn = [
        {
          f: "region",
          title: "بحسب المنطقة",
          p1: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",
          p2: "M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
        },
        { f: "yard", title: "بحسب الساحة", p1: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z", p2: "" },
        {
          f: "ztype",
          title: "بحسب النوع",
          p1: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
          p2: "m3.3 7 8.7 5 8.7-5",
        },
        {
          f: "zcat",
          title: "بحسب الفئة",
          p1: "M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",
          p2: "M7.5 7.5h.01",
        },
        {
          f: "level",
          title: "بحسب الدور / المستوى",
          p1: "m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z",
          p2: "m2.6 12.08 8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9M2.6 17.08l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9",
        },
        { f: "zstate", title: "بحسب الحالة", p1: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0", p2: "m9 12 2 2 4-4" },
        { f: "ztypecat", title: "بحسب النوع والفئة", p1: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z", p2: "" },
      ],
      nn = (t, e, s) => {
        const n = React.createElement,
          i = "bsBrkP" + e,
          o = this.zcatStyleOf(t, s),
          r = 0.65,
          a = 0.825,
          l = 27 + 2 * Math.PI * 2.8;
        if (!o)
          return n(
            "svg",
            { key: "bk" + i, width: 17, height: 11, viewBox: "0 0 17 11", style: { flexShrink: 0, overflow: "visible" } },
            n("rect", {
              x: a,
              y: a,
              width: 15.35,
              height: 9.35,
              rx: 2.8,
              fill: "#f8fafc",
              stroke: "#cbd5e1",
              strokeWidth: r,
              strokeDasharray: "4.91 2.53",
              strokeLinejoin: "round",
            }),
          );
        const d = !(!o.h || "none" === o.h),
          p = o.bs || "dash";
        let h = "none";
        if ("dot" === p) {
          const t = l / Math.max(5, Math.round(l / 4.5));
          h = (1.15 * r).toFixed(2) + " " + (t - 1.15 * r).toFixed(2);
        } else if ("solid" !== p) {
          const t = l / Math.max(4, Math.round(l / 7.4));
          h = (0.66 * t).toFixed(2) + " " + (0.34 * t).toFixed(2);
        }
        return n(
          "svg",
          { width: 17, height: 11, viewBox: "0 0 17 11", style: { flexShrink: 0, overflow: "visible" } },
          d ? this._mkHatchPattern(i, o, "bp") : null,
          n("rect", {
            x: a,
            y: a,
            width: 15.35,
            height: 9.35,
            rx: 2.8,
            fill: d ? "url(#" + i + ")" : o.f,
            fillOpacity: (null != o.o ? o.o : 50) / 100,
            stroke: o.s,
            strokeWidth: r,
            strokeDasharray: h,
            strokeLinecap: "dot" === p ? "round" : "butt",
            strokeLinejoin: "round",
          }),
        );
      },
      on = de.length,
      rn =
        "zones" !== Te || tn || !on
          ? []
          : sn.map((t, e) => {
              const s = {},
                n = {},
                i = [],
                o = {};
              de.forEach((e) => {
                const r =
                  "zstate" === t.f
                    ? e.off
                      ? "معطّلة"
                      : "مفعّلة"
                    : "ztypecat" === t.f
                      ? (String(e.ztype || "").trim() || "بلا نوع") + " · " + (String(e.zcat || "").trim() || "بلا فئة")
                      : "yard" === t.f
                        ? String(e.yard || "").trim() || "بلا ساحة"
                        : String(null == e[t.f] ? "" : e[t.f]).trim() || "غير محدّد";
                if ((null == s[r] && ((s[r] = 0), (n[r] = 0), i.push(r)), "zcat" === t.f)) {
                  const t = String(e.ztype || "").trim();
                  void 0 === o[r] ? (o[r] = t) : o[r] !== t && (o[r] = null);
                }
                (s[r]++, e.off || n[r]++);
              });
              const r = i
                .map((t) => ({ label: t, n: s[t], on: n[t], zt: o[t] }))
                .sort((t, e) => e.n - t.n || t.label.localeCompare(e.label, "ar"));
              return { key: t.f, items: r };
            }),
      an = [["summary", "مؤشرات المصليات"]]
        .concat(this.bsLensOn("paths") ? [["paths", "مؤشرات المسارات"]] : [])
        .concat(
          this.bsLensOn("dist")
            ? [
                ["dsum", "مؤشرات التوزيع"],
                ["cov", "حالة التغطية"],
              ]
            : [],
        )
        .concat(this.bsLensOn("dens") ? [["dens", "مؤشرات الكثافة"]] : []),
      ln = an.some((t) => t[0] === s.brkDim) ? s.brkDim : "region",
      dn = rn.find((t) => t.key === ln),
      pn = dn ? dn.items : [],
      hn = pn.reduce((t, e) => t + e.n, 0),
      cn = (t, e) => {
        if ("zcat" === ln && t.zt) {
          const e = this.zcatStyleOf(t.label, t.zt);
          if (e && e.f) return e.f;
        }
        if ("yard" === ln) {
          return this.gateLocColor(t.label) || "#cbd5e1";
        }
        if ("ztypecat" === ln) {
          const e = String(t.label || "").split(" · "),
            s = this.zcatStyleOf(e[1] || "", e[0] || "");
          if (s && s.f) return s.f;
        }
        return "zstate" === ln
          ? "معطّلة" === t.label
            ? "#94a3b8"
            : "#16a34a"
          : "rgba(185,151,81," +
              ((t) => {
                const e = pn.length;
                return e <= 1 ? "0.85" : (0.92 - (t / (e - 1)) * 0.62).toFixed(3);
              })(e) +
              ")";
      },
      gn = (t) =>
        "zstate" === ln ||
        ("zcat" === ln && !!t.zt && !!(this.zcatStyleOf(t.label, t.zt) || {}).f) ||
        ("ztypecat" === ln &&
          !!(this.zcatStyleOf(String(t.label || "").split(" · ")[1] || "", String(t.label || "").split(" · ")[0] || "") || {}).f),
      fn = an.map((t) => ({
        label: t[1],
        icA: KIVO.BassamMix.dimIcon(t[0]).a,
        icB: KIVO.BassamMix.dimIcon(t[0]).b,
        click: () =>
          "paths" === t[0]
            ? this.setState({ panelTab: "paths", lens: "zones", pathDim: "summary", dsHovZ: null, dsHovG: null })
            : "dens" === t[0]
              ? this.setState({
                  lens: "density",
                  panelTab: "dens",
                  densDim: "summary",
                  dsHovZ: null,
                  dsHovG: null,
                  dsSel: null,
                  selMulti: [],
                  zassign: null,
                  zdens: null,
                })
              : this.setState(
                  Object.assign(
                    { brkDim: t[0], lens: "zones", panelTab: "zones" },
                    ("zones" === s.lens || "density" === s.lens) && this.bsLensOn("zones") && this.bsLensOn("dist")
                      ? { dsAsn: "dsum" === t[0] || "cov" === t[0], dsSel: null, selMulti: [] }
                      : {},
                  ),
                ),
        on: KIVO.__bsMixOn(t[0], s),
        style: KIVO.BassamMix.tabStyle(KIVO.__bsMixOn(t[0], s), an.length),
      })),
      un = KIVO.BassamMix.marks(pn),
      yn = (t) =>
        React.createElement(
          "svg",
          { key: "cs" + String(t), width: 17, height: 11, viewBox: "0 0 17 11", style: { flexShrink: 0, overflow: "visible" } },
          React.createElement("rect", {
            x: 0.825,
            y: 0.825,
            width: 15.35,
            height: 9.35,
            rx: 2.8,
            fill: t,
            stroke: t,
            strokeWidth: 0.65,
            strokeLinejoin: "round",
          }),
        ),
      mn = (t, e) => {
        const s = cn(t, e);
        return React.createElement(
          "svg",
          { key: "dm" + String(s), width: 17, height: 11, viewBox: "0 0 17 11", style: { flexShrink: 0, overflow: "visible" } },
          React.createElement("rect", {
            x: 0.825,
            y: 0.825,
            width: 15.35,
            height: 9.35,
            rx: 2.8,
            fill: s,
            stroke: s,
            strokeWidth: 0.65,
            strokeLinejoin: "round",
          }),
        );
      },
      xn = (t) => {
        const e = "معطّلة" !== t,
          s = e ? "#16a34a" : "#94a3b8";
        return React.createElement(
          "svg",
          { key: "st" + t, width: 17, height: 11, viewBox: "0 0 17 11", style: { flexShrink: 0, overflow: "visible" } },
          React.createElement("rect", {
            x: 0.825,
            y: 0.825,
            width: 15.35,
            height: 9.35,
            rx: 2.8,
            fill: s,
            fillOpacity: e ? 0.5 : 0.28,
            stroke: s,
            strokeWidth: 0.65,
            strokeLinejoin: "round",
          }),
        );
      },
      bn = pn.map((t, e) => {
        const s = hn ? Math.max(1, Math.round((t.n / hn) * 100)) : 0,
          n = hn ? (t.n / hn) * 100 : 0,
          i = s,
          o = 0 === e,
          r = null == t.on ? t.n : t.on,
          a = t.n - r,
          l = t.n ? Math.round((r / t.n) * 100) : 0,
          d = t.n ? (r / t.n) * 100 : 0;
        return {
          label: t.label,
          count: String(t.n),
          pct: String(s),
          pctAll: KIVO.bsPct(n) + "٪",
          subPct: "font-size:8px;font-weight:400;opacity:.62;margin-right:2px;letter-spacing:0",
          hasSplit: null != t.on && "zstate" !== ln,
          onCount: String(r),
          offCount: String(a),
          onPct: KIVO.bsPct(d) + "٪",
          offPct: KIVO.bsPct(100 - d) + "٪",
          tip:
            t.label +
            " — " +
            KIVO.BassamCount(t.n, "مصلى") +
            " (" +
            s +
            "٪ من الكل) · مفعّلة " +
            r +
            " (" +
            l +
            "٪) · معطّلة " +
            a +
            " (" +
            (100 - l) +
            "٪)",
          markOn: !!KIVO.BassamMix.markOf(un, e),
          mark: (KIVO.BassamMix.markOf(un, e) || {}).ch,
          markTitle: (KIVO.BassamMix.markOf(un, e) || {}).title,
          markStyle: KIVO.BassamMix.markStyle,
          hasSwatch: !0,
          swatch:
            "zcat" === ln
              ? t.zt
                ? nn(t.label, "mx" + String(t.label).replace(/[^A-Za-z0-9]/g, "") + e, t.zt)
                : mn(t, e)
              : "ztypecat" === ln
                ? nn(
                    String(t.label || "").split(" · ")[1] || "",
                    "mt" + String(t.label).replace(/[^A-Za-z0-9]/g, "") + e,
                    String(t.label || "").split(" · ")[0] || "",
                  )
                : "zstate" === ln
                  ? xn(t.label)
                  : mn(t, e),
          ...KIVO.BassamMix.rowStyles({
            pc: i,
            lead: o,
            wide: "ztypecat" === ln,
            color: cn(t, e),
            track: gn(t) ? cn(t, e) + "1f" : "rgba(185,151,81,0.12)",
            num: gn(t) ? cn(t, e) : "#9A7E40",
            numWidth: 24,
          }),
        };
      }),
      kn = "zones" === Te && "dsum" !== s.brkDim && !tn,
      vn = (() => {
        if (!kn) return null;
        const t = React.createElement,
          e = de || [],
          s = e.length,
          n = e.filter((t) => !t.off).length,
          i = s - n,
          o = s ? Math.round((n / s) * 100) : 0,
          r = KIVO.__bsCssObj,
          a = t(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "stretch",
                gap: 9,
                border: "1px solid var(--bd-xeef0f2)",
                borderRadius: 12,
                padding: 9,
                background: "linear-gradient(180deg,var(--bg-xffffff),var(--bg-xfcfcfd))",
                marginBottom: 10,
                boxShadow: "var(--shadow-card)",
              },
            },
            t(
              "div",
              {
                key: "big",
                style: {
                  textAlign: "center",
                  padding: "0 4px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                },
              },
              t(
                "b",
                { style: { fontSize: 22, fontWeight: 700, lineHeight: 1, color: "var(--fg-x8a6f35)", fontFamily: "'Cairo',sans-serif" } },
                String(s),
              ),
              t(
                "span",
                { style: { fontSize: 9, fontWeight: 400, color: "var(--fg-x94a3b8)", marginTop: 3, whiteSpace: "nowrap" } },
                "إجمالي المصليات",
              ),
            ),
            t("div", { key: "sp", style: { width: 1, background: "linear-gradient(180deg,transparent,var(--bg-xe6e8eb),transparent)" } }),
            t(
              "div",
              { key: "side", style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 7 } },
              [
                [
                  "on",
                  n,
                  o,
                  "#047857",
                  "#16a34a",
                  "مفعّلة",
                  ["M22 11.08V12a10 10 0 1 1-5.93-9.14", "m9 11 3 3L22 4"],
                  "rgba(0,132,80,0.10)",
                  "rgba(0,132,80,0.25)",
                ],
                ["off", i, 100 - o, "#94a3b8", "#94a3b8", "معطّلة", ["M18.36 6.64A9 9 0 1 1 5.64 6.64", "M12 2v10"], "#F5F6F8", "#E6E8EB"],
              ].map((e) => {
                return t(
                  "div",
                  { key: e[0], style: { display: "flex", alignItems: "center", gap: 5 } },
                  t(
                    "span",
                    {
                      style: {
                        width: 17,
                        height: 17,
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        background: e[7],
                        border: "1px solid " + e[8],
                      },
                    },
                    ((s = e[6]),
                    (n = e[3]),
                    t(
                      "svg",
                      {
                        width: 11,
                        height: 11,
                        viewBox: "0 0 24 24",
                        fill: "none",
                        stroke: n,
                        strokeWidth: 2.2,
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                        style: { flexShrink: 0 },
                      },
                      s.map((e, s) => t("path", { key: "p" + s, d: e })),
                    )),
                  ),
                  t("span", { style: { fontSize: 10, fontWeight: 400, flexShrink: 0 } }, e[5]),
                  ((e, s) => {
                    const n = KIVO.BassamMix.rowStyles({ pc: e, color: s, track: "#EEF0F2" });
                    return t(
                      "span",
                      { style: { display: "flex", gap: 1.5, flex: "1 1 auto", minWidth: 44 } },
                      n.cells.map((e, s) => t("i", { key: "b" + s, style: r(e) })),
                    );
                  })(e[2], e[4]),
                  t(
                    "span",
                    {
                      style: {
                        fontSize: 11,
                        fontWeight: 700,
                        width: 34,
                        textAlign: "left",
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                        color: "var(--fg-x8a6f35)",
                        fontFamily: "'Cairo',sans-serif",
                      },
                    },
                    String(e[1]),
                    t(
                      "em",
                      { style: { fontStyle: "normal", fontSize: 7.5, fontWeight: 400, color: "var(--fg-x8e959d)", marginRight: 2 } },
                      e[2] + "٪",
                    ),
                  ),
                );
                var s, n;
              }),
            ),
          ),
          l = ["ztypecat", "region", "yard", "level", "ztype", "zcat"],
          d = sn
            .filter((t) => "zstate" !== t.f)
            .slice()
            .sort((t, e) => {
              const s = l.indexOf(t.f),
                n = l.indexOf(e.f);
              return (s < 0 ? 99 : s) - (n < 0 ? 99 : n);
            })
            .map((n, i) => {
              const o = {},
                r = {},
                a = [],
                l = {};
              e.forEach((t) => {
                const e =
                  "ztypecat" === n.f
                    ? (String(t.ztype || "").trim() || "بلا نوع") + " · " + (String(t.zcat || "").trim() || "بلا فئة")
                    : "yard" === n.f
                      ? String(t.yard || "").trim() || "بلا ساحة"
                      : String(null == t[n.f] ? "" : t[n.f]).trim() || "غير محدّد";
                (null == o[e] && ((o[e] = 0), (r[e] = 0), a.push(e), (l[e] = new Set())),
                  o[e]++,
                  t.off || r[e]++,
                  l[e].add(String(t.ztype || "").trim()));
              });
              const d = a
                .map((t) => ({ label: t, n: o[t], on: r[t], zt: l[t] && 1 === l[t].size ? Array.from(l[t])[0] : null }))
                .sort((t, e) => e.n - t.n);
              if (!d.length) return null;
              const p = (t) => {
                  if ("yard" === n.f) return this.gateLocColor(t.label) || "#cbd5e1";
                  if ("zcat" === n.f && t.zt) {
                    const e = this.zcatStyleOf(t.label, t.zt);
                    if (e && e.f) return e.f;
                  }
                  if ("ztypecat" === n.f) {
                    const e = String(t.label || "").split(" · "),
                      s = this.zcatStyleOf(e[1] || "", e[0] || "");
                    if (s && s.f) return s.f;
                  }
                  const e = ["#b99751", "#9A7E40", "#c9ab6f", "#876a33", "#d6c08a", "#7c6320"],
                    s = d.indexOf(t);
                  return e[(s < 0 ? 0 : s) % e.length];
                },
                h = Math.max(...d.map((t) => t.n)),
                c = Math.min(...d.map((t) => t.n)),
                g = d.filter((t) => t.n === h),
                f = d.filter((t) => t.n === c),
                u = (e, s, n, i) =>
                  t(
                    "div",
                    {
                      key: e ? "hi" : "lo",
                      title:
                        (e ? "الأعلى" : "الأدنى") +
                        " — " +
                        (1 === n.length ? n[0].label : KIVO.BassamCount(n.length, "قيمة|متعادلة") + "") +
                        " · " +
                        i,
                      style: {
                        flex: 1,
                        minWidth: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        padding: "5px 8px",
                        borderRadius: 10,
                        border: "1px solid var(--bd-xedeff2)",
                        background: "var(--bg-xffffff)",
                        boxShadow: "var(--shadow-card)",
                      },
                    },
                    t(
                      "span",
                      {
                        key: "bd",
                        style: {
                          width: 20,
                          height: 20,
                          borderRadius: 9999,
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: s + "14",
                          border: "1px solid " + s + "29",
                        },
                      },
                      ((e, s) =>
                        t(
                          "svg",
                          {
                            width: 9,
                            height: 9,
                            viewBox: "0 0 24 24",
                            fill: "none",
                            stroke: s,
                            strokeWidth: 3,
                            strokeLinecap: "round",
                            strokeLinejoin: "round",
                            style: { flexShrink: 0 },
                          },
                          t("path", { key: "a", d: e ? "M12 19V5" : "M12 5v14" }),
                          t("path", { key: "b", d: e ? "m5 12 7-7 7 7" : "m19 12-7 7-7-7" }),
                        ))(e, s),
                    ),
                    t(
                      "span",
                      {
                        key: "v",
                        dir: "ltr",
                        style: {
                          flexShrink: 0,
                          fontSize: 13.5,
                          fontWeight: 700,
                          color: s,
                          lineHeight: 1,
                          fontFamily: "'Cairo',sans-serif",
                          fontFeatureSettings: "'tnum'",
                        },
                      },
                      String(i),
                    ),
                    t(
                      "span",
                      { key: "tx", style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 } },
                      t(
                        "span",
                        { style: { fontSize: 7.5, fontWeight: 600, color: "var(--fg-xa2a9b2)", lineHeight: 1.2, whiteSpace: "nowrap" } },
                        e ? "الأعلى" : "الأدنى",
                      ),
                      t(
                        "span",
                        { style: { display: "flex", alignItems: "center", gap: 4, minWidth: 0 } },
                        t("i", {
                          style: {
                            width: 7,
                            height: 7,
                            borderRadius: 2,
                            flexShrink: 0,
                            background: 1 === n.length ? p(n[0]) : "var(--bg-xcbd5e1)",
                            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
                          },
                        }),
                        t(
                          "span",
                          {
                            style: {
                              minWidth: 0,
                              fontSize: 9.5,
                              fontWeight: 600,
                              color: "var(--fg-x3f3f3f)",
                              lineHeight: 1.25,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            },
                          },
                          1 === n.length ? n[0].label : n.length + " متعادلة",
                        ),
                      ),
                    ),
                  ),
                y =
                  h === c
                    ? t(
                        "div",
                        { style: { display: "flex", gap: 6, marginBottom: 7 } },
                        t(
                          "div",
                          {
                            style: {
                              flex: 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                              padding: "6px 8px",
                              borderRadius: 10,
                              border: "1px solid var(--bd-xedeff2)",
                              background: "linear-gradient(180deg,var(--bg-xfcfcfd),var(--bg-xfafbfc))",
                            },
                          },
                          t(
                            "span",
                            {
                              style: {
                                width: 15,
                                height: 15,
                                borderRadius: 9999,
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "var(--bg-xf1f3f5)",
                                border: "1px solid var(--bd-xe6e8eb)",
                              },
                            },
                            t(
                              "svg",
                              {
                                width: 9,
                                height: 9,
                                viewBox: "0 0 24 24",
                                fill: "none",
                                stroke: "#94a3b8",
                                strokeWidth: 3,
                                strokeLinecap: "round",
                              },
                              t("path", { key: "e1", d: "M5 9h14" }),
                              t("path", { key: "e2", d: "M5 15h14" }),
                            ),
                          ),
                          t(
                            "span",
                            { style: { fontSize: 9, fontWeight: 400, color: "var(--fg-x8b9099)", whiteSpace: "nowrap" } },
                            "كل القيم متساوية",
                          ),
                          t(
                            "span",
                            {
                              dir: "ltr",
                              style: {
                                fontSize: 11,
                                fontWeight: 700,
                                color: "var(--fg-x6f7276)",
                                lineHeight: 1,
                                fontFamily: "'Cairo',sans-serif",
                                fontFeatureSettings: "'tnum'",
                              },
                            },
                            String(h),
                          ),
                        ),
                      )
                    : t("div", { style: { display: "flex", gap: 6, marginBottom: 6 } }, u(!0, "#dc2626", g, h), u(!1, "#047857", f, c)),
                m = KIVO.__bsCssObj,
                x = { fontSize: 8, fontWeight: 400, opacity: 0.62, marginRight: 2, letterSpacing: 0 },
                b = t(
                  "div",
                  {
                    key: "hdc",
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "0 1px 5px",
                      borderBottom: "1px solid var(--bd-a185151810p16)",
                      marginBottom: 5,
                    },
                  },
                  t("span", { key: "sp0", style: { flex: "1 1 auto" } }),
                  [
                    ["مفعّلة", "#16a34a"],
                    ["معطّلة", "#a8aeb5"],
                    ["الكل", "#9A7E40"],
                  ].map((e, s) =>
                    t(
                      "span",
                      {
                        key: "hc" + s,
                        style: {
                          flex: "0 0 24px",
                          textAlign: "left",
                          fontFamily: "'Cairo',sans-serif",
                          fontFeatureSettings: "'tnum'",
                          fontSize: 7.5,
                          fontWeight: 400,
                          color: e[1],
                        },
                      },
                      e[0],
                    ),
                  ),
                ),
                k = (e, i, o, r, a, l) => {
                  const d = s ? Math.round((i / s) * 100) : 0,
                    p = i - o,
                    h = (i && Math.round((o / i) * 100), s ? (i / s) * 100 : 0),
                    c = i ? (o / i) * 100 : 0,
                    g = KIVO.BassamMix.rowStyles({
                      pc: d,
                      lead: a,
                      color: r,
                      track: "rgba(185,151,81,0.12)",
                      num: "#9A7E40",
                      numWidth: 24,
                      wide: "ztypecat" === n.f,
                    }),
                    f = m(g.item);
                  return (
                    a &&
                      ((f.borderTop = "1px solid rgba(185,151,81,0.35)"),
                      (f.marginTop = "5px"),
                      (f.height = "20px"),
                      (f.paddingTop = "4px")),
                    t(
                      "div",
                      { key: "r" + e, title: e + " — " + i + " من " + s + " (" + d + "٪) · مفعّلة " + o + " · معطّلة " + p, style: f },
                      l,
                      t("span", { style: m(g.name) }, e),
                      t(
                        "span",
                        { style: m(g.track) },
                        g.cells.map((e, s) => t("span", { key: "cl" + s, style: m(e) })),
                      ),
                      t("span", { dir: "ltr", style: m(g.numOn) }, String(o), t("span", { style: x }, KIVO.bsPct(c) + "٪")),
                      t("span", { dir: "ltr", style: m(g.numOff) }, String(p), t("span", { style: x }, KIVO.bsPct(100 - c) + "٪")),
                      t("span", { dir: "ltr", style: m(g.num) }, String(i), t("span", { style: x }, KIVO.bsPct(h) + "٪")),
                    )
                  );
                },
                v = d.reduce((t, e) => t + e.on, 0);
              return t(
                "div",
                {
                  key: "sec" + i,
                  style: {
                    border: "1px solid var(--bd-xeef0f2)",
                    borderRadius: 12,
                    padding: 8,
                    background: "var(--bg-xffffff)",
                    boxShadow: "var(--shadow-card)",
                    marginBottom: 7,
                  },
                },
                t(
                  "div",
                  { key: "h", style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 7 } },
                  t("span", {
                    style: {
                      flex: 1,
                      height: 1,
                      background: "linear-gradient(90deg,var(--bg-a185151810) 0%,var(--bg-a185151810p32) 100%)",
                    },
                  }),
                  t(
                    "span",
                    {
                      style: {
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        flexShrink: 0,
                        borderRadius: 9999,
                        padding: "2px 9px",
                        background: "var(--bg-xffffff)",
                        border: "1px solid var(--bd-a185151810p3)",
                      },
                    },
                    t(
                      "span",
                      {
                        style: {
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          color: "var(--fg-xb99751)",
                        },
                      },
                      t(
                        "svg",
                        {
                          width: 11,
                          height: 11,
                          viewBox: "0 0 24 24",
                          fill: "none",
                          stroke: "currentColor",
                          strokeWidth: 2.4,
                          strokeLinecap: "round",
                          strokeLinejoin: "round",
                        },
                        t("path", { d: "M21.21 15.89A10 10 0 1 1 8 2.83" }),
                        t("path", { d: "M22 12A10 10 0 0 0 12 2v10z" }),
                      ),
                    ),
                    t(
                      "span",
                      {
                        style: { fontSize: 9, fontWeight: 600, color: "var(--fg-x53565a)", whiteSpace: "nowrap", letterSpacing: "-0.01em" },
                      },
                      n.title,
                    ),
                  ),
                  t("span", {
                    style: {
                      flex: 1,
                      height: 1,
                      background: "linear-gradient(90deg,var(--bg-a185151810p32) 0%,var(--bg-a185151810) 100%)",
                    },
                  }),
                ),
                y,
                t(
                  "div",
                  { key: "b", style: { display: "flex", alignItems: "center", gap: 10 } },
                  t(
                    "div",
                    { style: { position: "relative", width: 64, height: 64, flexShrink: 0, display: "grid", placeItems: "center" } },
                    KIVO.BassamMix.donutHit(
                      d.map((t) => ({ n: t.n, label: t.label, color: p(t) })),
                      s,
                      64,
                      "مصلى",
                      30,
                    ),
                    t(
                      "span",
                      {
                        style: {
                          position: "relative",
                          zIndex: 2,
                          fontSize: 18,
                          fontWeight: 700,
                          lineHeight: 1,
                          color: "var(--fg-x141414)",
                          fontFamily: "'Cairo',sans-serif",
                        },
                      },
                      String(d.length),
                    ),
                  ),
                  t(
                    "div",
                    { style: { flex: 1, minWidth: 0 } },
                    b,
                    d
                      .map((e, s) => {
                        const o = "sm" + i + String(e.label).replace(/[^A-Za-z0-9]/g, "") + s,
                          r = p(e),
                          a =
                            "zcat" === n.f && e.zt
                              ? nn(e.label, o, e.zt)
                              : "ztypecat" === n.f
                                ? nn(String(e.label || "").split(" · ")[1] || "", o, String(e.label || "").split(" · ")[0] || "")
                                : t(
                                    "svg",
                                    {
                                      key: "sw" + o,
                                      width: 17,
                                      height: 11,
                                      viewBox: "0 0 17 11",
                                      style: { flexShrink: 0, overflow: "visible" },
                                    },
                                    t("rect", {
                                      x: 0.83,
                                      y: 0.83,
                                      width: 15.35,
                                      height: 9.35,
                                      rx: 2.8,
                                      fill: r,
                                      fillOpacity: 0.5,
                                      stroke: r,
                                      strokeWidth: 0.65,
                                      strokeLinejoin: "round",
                                    }),
                                  );
                        return k(e.label, e.n, e.on, p(e), !1, a);
                      })
                      .concat([
                        k(
                          "الإجمالي",
                          s,
                          v,
                          "#9A7E40",
                          !0,
                          t("span", {
                            style: {
                              width: 17,
                              height: 11,
                              borderRadius: 2.5,
                              flexShrink: 0,
                              background: "var(--bg-x9a7e40)",
                              opacity: 0.85,
                            },
                          }),
                        ),
                      ]),
                  ),
                ),
              );
            })
            .filter(Boolean);
        return t("div", { key: "sum" }, a, d);
      })(),
      wn = (t, e) => "rgba(185,151,81," + (0.3 + 0.6 * (e ? t / e : 0)).toFixed(2) + ")",
      Sn = (t) => ns(t).map((t) => ({ label: t.label, n: t.n, color: t.color })),
      An = (t) => {
        const e = React.createElement,
          s = t.unitOf || (() => t.unit),
          n = KIVO.__bsCssObj,
          i = (t, s, n, i) =>
            e(
              "div",
              {
                key: t ? "hi" : "lo",
                title:
                  (t ? "الأعلى" : "الأدنى") +
                  " — " +
                  (1 === n.length ? n[0].label : KIVO.BassamCount(n.length, "قيمة|متعادلة") + "") +
                  " · " +
                  i,
                style: {
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "5px 8px",
                  borderRadius: 10,
                  border: "1px solid var(--bd-xedeff2)",
                  background: "var(--bg-xffffff)",
                  boxShadow: "var(--shadow-card)",
                },
              },
              e(
                "span",
                {
                  key: "bd",
                  style: {
                    width: 20,
                    height: 20,
                    borderRadius: 9999,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: s + "14",
                    border: "1px solid " + s + "29",
                  },
                },
                ((t, s) =>
                  e(
                    "svg",
                    {
                      width: 9,
                      height: 9,
                      viewBox: "0 0 24 24",
                      fill: "none",
                      stroke: s,
                      strokeWidth: 3,
                      strokeLinecap: "round",
                      strokeLinejoin: "round",
                      style: { flexShrink: 0 },
                    },
                    e("path", { key: "a", d: t ? "M12 19V5" : "M12 5v14" }),
                    e("path", { key: "b", d: t ? "m5 12 7-7 7 7" : "m19 12-7 7-7-7" }),
                  ))(t, s),
              ),
              e(
                "span",
                {
                  key: "v",
                  dir: "ltr",
                  style: {
                    flexShrink: 0,
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: s,
                    lineHeight: 1,
                    fontFamily: "'Cairo',sans-serif",
                    fontFeatureSettings: "'tnum'",
                  },
                },
                String(i),
              ),
              e(
                "span",
                { key: "tx", style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 } },
                e(
                  "span",
                  { style: { fontSize: 7.5, fontWeight: 600, color: "var(--fg-xa2a9b2)", lineHeight: 1.2, whiteSpace: "nowrap" } },
                  t ? "الأعلى" : "الأدنى",
                ),
                e(
                  "span",
                  { style: { display: "flex", alignItems: "center", gap: 4, minWidth: 0 } },
                  e("i", {
                    style: {
                      width: 7,
                      height: 7,
                      borderRadius: 2,
                      flexShrink: 0,
                      background: 1 === n.length ? n[0].color : "var(--bg-xcbd5e1)",
                      boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
                    },
                  }),
                  e(
                    "span",
                    {
                      style: {
                        minWidth: 0,
                        fontSize: 9.5,
                        fontWeight: 600,
                        color: "var(--fg-x3f3f3f)",
                        lineHeight: 1.25,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      },
                    },
                    1 === n.length ? n[0].label : n.length + " متعادلة",
                  ),
                ),
              ),
            ),
          o = t.dims.map((e) => ({ t: e[1], n: (t.itemsOf(e[0]) || []).length })).filter((t) => t.n > 0),
          r = e(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "stretch",
                gap: 9,
                border: "1px solid var(--bd-xeef0f2)",
                borderRadius: 12,
                padding: 9,
                background: "linear-gradient(180deg,var(--bg-xffffff),var(--bg-xfcfcfd))",
                marginBottom: 10,
                boxShadow: "var(--shadow-card)",
              },
            },
            e(
              "div",
              {
                key: "big",
                style: {
                  textAlign: "center",
                  padding: "0 4px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                },
              },
              e(
                "b",
                { style: { fontSize: 22, fontWeight: 700, lineHeight: 1, color: "var(--fg-x8a6f35)", fontFamily: "'Cairo',sans-serif" } },
                String(t.total),
              ),
              e(
                "span",
                { style: { fontSize: 9, fontWeight: 400, color: "var(--fg-x94a3b8)", marginTop: 3, whiteSpace: "nowrap" } },
                t.totalLabel,
              ),
            ),
            e("div", { key: "sp", style: { width: 1, background: "linear-gradient(180deg,transparent,var(--bg-xe6e8eb),transparent)" } }),
            e(
              "div",
              { key: "side", style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 } },
              t.hero
                ? (() => {
                    const s = t.hero,
                      i = (s.onN || 0) + (s.offN || 0),
                      o = i ? Math.round(((s.onN || 0) / i) * 100) : 0;
                    return [
                      [
                        "on",
                        s.onN || 0,
                        o,
                        "#047857",
                        "#16a34a",
                        s.onWord,
                        ["M22 11.08V12a10 10 0 1 1-5.93-9.14", "m9 11 3 3L22 4"],
                        "rgba(0,132,80,0.10)",
                        "rgba(0,132,80,0.25)",
                      ],
                      [
                        "off",
                        s.offN || 0,
                        100 - o,
                        "#94a3b8",
                        "#94a3b8",
                        s.offWord,
                        ["M18.36 6.64A9 9 0 1 1 5.64 6.64", "M12 2v10"],
                        "#F5F6F8",
                        "#E6E8EB",
                      ],
                    ].map((t) => {
                      return e(
                        "div",
                        { key: t[0], style: { display: "flex", alignItems: "center", gap: 5 } },
                        e(
                          "span",
                          {
                            style: {
                              width: 17,
                              height: 17,
                              borderRadius: 6,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              background: t[7],
                              border: "1px solid " + t[8],
                            },
                          },
                          ((s = t[6]),
                          (i = t[3]),
                          e(
                            "svg",
                            {
                              width: 11,
                              height: 11,
                              viewBox: "0 0 24 24",
                              fill: "none",
                              stroke: i,
                              strokeWidth: 2.2,
                              strokeLinecap: "round",
                              strokeLinejoin: "round",
                              style: { flexShrink: 0 },
                            },
                            s.map((t, s) => e("path", { key: "p" + s, d: t })),
                          )),
                        ),
                        e("span", { style: { fontSize: 10, fontWeight: 400, flexShrink: 0 } }, t[5]),
                        ((t, s) => {
                          const i = KIVO.BassamMix.rowStyles({ pc: t, color: s, track: "#EEF0F2" });
                          return e(
                            "span",
                            { style: { display: "flex", gap: 1.5, flex: "1 1 auto", minWidth: 44 } },
                            i.cells.map((t, s) => e("i", { key: "b" + s, style: n(t) })),
                          );
                        })(t[2], t[4]),
                        e(
                          "span",
                          {
                            style: {
                              fontSize: 11,
                              fontWeight: 700,
                              width: 34,
                              textAlign: "left",
                              flexShrink: 0,
                              whiteSpace: "nowrap",
                              color: "var(--fg-x8a6f35)",
                              fontFamily: "'Cairo',sans-serif",
                            },
                          },
                          String(t[1]),
                          e(
                            "em",
                            { style: { fontStyle: "normal", fontSize: 7.5, fontWeight: 400, color: "var(--fg-x8e959d)", marginRight: 2 } },
                            t[2] + "٪",
                          ),
                        ),
                      );
                      var s, i;
                    });
                  })()
                : o.map((t, s) =>
                    e(
                      "div",
                      { key: "dc" + s, style: { display: "flex", alignItems: "center", gap: 6 } },
                      e(
                        "span",
                        {
                          style: {
                            fontSize: 10,
                            fontWeight: 400,
                            flex: 1,
                            minWidth: 0,
                            color: "var(--fg-x53565a)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          },
                        },
                        t.t,
                      ),
                      e("i", {
                        style: { flex: 1, height: 1, background: "linear-gradient(90deg,var(--bg-a185151810p28),var(--bg-a185151810))" },
                      }),
                      e(
                        "span",
                        {
                          style: {
                            fontSize: 10,
                            fontWeight: 700,
                            color: "var(--fg-x8a6f35)",
                            fontFamily: "'Cairo',sans-serif",
                            whiteSpace: "nowrap",
                          },
                        },
                        String(t.n),
                        e(
                          "em",
                          { style: { fontStyle: "normal", fontSize: 7.5, fontWeight: 400, color: "var(--fg-x8e959d)", marginRight: 2 } },
                          "قيم",
                        ),
                      ),
                    ),
                  ),
            ),
          ),
          a = t.dims
            .map((n, o) => {
              const r = (t.itemsOf(n[0]) || []).slice().sort((t, e) => e.n - t.n || String(t.label).localeCompare(String(e.label), "ar"));
              if (!r.length) return null;
              const a = r.reduce((t, e) => t + e.n, 0),
                l = Math.max.apply(
                  null,
                  r.map((t) => t.n),
                ),
                d = Math.min.apply(
                  null,
                  r.map((t) => t.n),
                ),
                p = r.filter((t) => t.n === l),
                h = r.filter((t) => t.n === d),
                c =
                  l === d
                    ? e(
                        "div",
                        { style: { display: "flex", gap: 6, marginBottom: 7 } },
                        e(
                          "div",
                          {
                            style: {
                              flex: 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                              padding: "6px 8px",
                              borderRadius: 10,
                              border: "1px solid var(--bd-xedeff2)",
                              background: "linear-gradient(180deg,var(--bg-xfcfcfd),var(--bg-xfafbfc))",
                            },
                          },
                          e(
                            "span",
                            {
                              style: {
                                width: 15,
                                height: 15,
                                borderRadius: 9999,
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "var(--bg-xf1f3f5)",
                                border: "1px solid var(--bd-xe6e8eb)",
                              },
                            },
                            e(
                              "svg",
                              {
                                width: 9,
                                height: 9,
                                viewBox: "0 0 24 24",
                                fill: "none",
                                stroke: "#94a3b8",
                                strokeWidth: 3,
                                strokeLinecap: "round",
                              },
                              e("path", { key: "e1", d: "M5 9h14" }),
                              e("path", { key: "e2", d: "M5 15h14" }),
                            ),
                          ),
                          e(
                            "span",
                            { style: { fontSize: 9, fontWeight: 400, color: "var(--fg-x8b9099)", whiteSpace: "nowrap" } },
                            "كل القيم متساوية",
                          ),
                          e(
                            "span",
                            {
                              dir: "ltr",
                              style: {
                                fontSize: 11,
                                fontWeight: 700,
                                color: "var(--fg-x6f7276)",
                                lineHeight: 1,
                                fontFamily: "'Cairo',sans-serif",
                                fontFeatureSettings: "'tnum'",
                              },
                            },
                            String(l),
                          ),
                        ),
                      )
                    : e("div", { style: { display: "flex", gap: 6, marginBottom: 6 } }, i(!0, "#dc2626", p, l), i(!1, "#047857", h, d)),
                g = KIVO.__bsCssObj,
                f = { fontSize: 8, fontWeight: 400, opacity: 0.62, marginRight: 2, letterSpacing: 0 },
                u = (t, s, n) => {
                  const i = a ? Math.round((t.n / a) * 100) : 0,
                    o = a ? (t.n / a) * 100 : 0,
                    r = KIVO.BassamMix.rowStyles({
                      pc: i,
                      lead: s,
                      color: n,
                      track: "rgba(185,151,81,0.12)",
                      num: "#9A7E40",
                      numWidth: 30,
                    }),
                    l = g(r.item);
                  return (
                    s &&
                      ((l.borderTop = "1px solid rgba(185,151,81,0.35)"),
                      (l.marginTop = "5px"),
                      (l.height = "20px"),
                      (l.paddingTop = "4px")),
                    e(
                      "div",
                      { key: "r" + t.label, title: t.label + " — " + t.n + " من " + a + " (" + i + "٪)", style: l },
                      s
                        ? e("span", {
                            style: {
                              width: 17,
                              height: 11,
                              borderRadius: 2.5,
                              flexShrink: 0,
                              background: "var(--bg-x9a7e40)",
                              opacity: 0.85,
                            },
                          })
                        : e(
                            "svg",
                            { width: 17, height: 11, viewBox: "0 0 17 11", style: { flexShrink: 0, overflow: "visible" } },
                            e("rect", {
                              x: 0.83,
                              y: 0.83,
                              width: 15.35,
                              height: 9.35,
                              rx: 2.8,
                              fill: (d = n),
                              fillOpacity: 0.5,
                              stroke: d,
                              strokeWidth: 0.65,
                              strokeLinejoin: "round",
                            }),
                          ),
                      e("span", { style: g(r.name) }, t.label),
                      e(
                        "span",
                        { style: g(r.track) },
                        r.cells.map((t, s) => e("span", { key: "cl" + s, style: g(t) })),
                      ),
                      e("span", { dir: "ltr", style: g(r.num) }, String(t.n), e("span", { style: f }, KIVO.bsPct(o) + "٪")),
                    )
                  );
                  var d;
                };
              return e(
                "div",
                {
                  key: "sec" + o,
                  style: {
                    border: "1px solid var(--bd-xeef0f2)",
                    borderRadius: 12,
                    padding: 8,
                    background: "var(--bg-xffffff)",
                    boxShadow: "var(--shadow-card)",
                    marginBottom: 7,
                  },
                },
                e(
                  "div",
                  { key: "h", style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 7 } },
                  e("span", {
                    style: {
                      flex: 1,
                      height: 1,
                      background: "linear-gradient(90deg,var(--bg-a185151810) 0%,var(--bg-a185151810p32) 100%)",
                    },
                  }),
                  e(
                    "span",
                    {
                      style: {
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        flexShrink: 0,
                        borderRadius: 9999,
                        padding: "2px 9px",
                        background: "var(--bg-xffffff)",
                        border: "1px solid var(--bd-a185151810p3)",
                      },
                    },
                    e(
                      "span",
                      {
                        style: {
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          color: "var(--fg-xb99751)",
                        },
                      },
                      e(
                        "svg",
                        {
                          width: 11,
                          height: 11,
                          viewBox: "0 0 24 24",
                          fill: "none",
                          stroke: "currentColor",
                          strokeWidth: 2.4,
                          strokeLinecap: "round",
                          strokeLinejoin: "round",
                        },
                        e("path", { d: "M21.21 15.89A10 10 0 1 1 8 2.83" }),
                        e("path", { d: "M22 12A10 10 0 0 0 12 2v10z" }),
                      ),
                    ),
                    e(
                      "span",
                      {
                        style: { fontSize: 9, fontWeight: 600, color: "var(--fg-x53565a)", whiteSpace: "nowrap", letterSpacing: "-0.01em" },
                      },
                      n[1],
                    ),
                  ),
                  e("span", {
                    style: {
                      flex: 1,
                      height: 1,
                      background: "linear-gradient(90deg,var(--bg-a185151810p32) 0%,var(--bg-a185151810) 100%)",
                    },
                  }),
                ),
                c,
                e(
                  "div",
                  { key: "b", style: { display: "flex", alignItems: "center", gap: 10 } },
                  e(
                    "div",
                    { style: { position: "relative", width: 64, height: 64, flexShrink: 0, display: "grid", placeItems: "center" } },
                    KIVO.BassamMix.donutHit(
                      r.map((t) => ({ n: t.n, label: t.label, color: t.color })),
                      a,
                      64,
                      s(n[0]),
                      30,
                    ),
                    e(
                      "span",
                      {
                        style: {
                          position: "relative",
                          zIndex: 2,
                          fontSize: 18,
                          fontWeight: 700,
                          lineHeight: 1,
                          color: "var(--fg-x141414)",
                          fontFamily: "'Cairo',sans-serif",
                        },
                      },
                      String(r.length),
                    ),
                  ),
                  e(
                    "div",
                    { style: { flex: 1, minWidth: 0 } },
                    r.map((t) => u(t, !1, t.color)).concat([u({ label: "الإجمالي", n: a }, !0, "#9A7E40")]),
                  ),
                ),
              );
            })
            .filter(Boolean);
        return e("div", { key: "lsum" }, r, a);
      };
    let zn = !1,
      En = null;
    if (tn);
    else if ("paths" === Te && "summary" === s.pathDim)
      ((zn = !0),
        (En = An({
          total: he.length,
          totalLabel: "إجمالي المسارات",
          unit: "مسار",
          dims: Ps,
          itemsOf: (t) => {
            const e = Ws(t),
              s = e.length ? e[0].n : 0;
            return e.map((e) => ({ label: e.label, n: e.n, color: "type" === t ? (ge[e.key] && ge[e.key].c) || "#b99751" : wn(e.n, s) }));
          },
          hero: {
            onN: he.filter((t) => !1 !== t.active).length,
            offN: he.filter((t) => !1 === t.active).length,
            onWord: "فعّالة",
            offWord: "معطّلة",
          },
        })));
    else if ("gates" === Te && "summary" === s.gateDim)
      ((zn = !0),
        (En = (() => {
          const t = React.createElement,
            e = KIVO.BassamLeaf.elements(pe),
            s = KIVO.BassamLeaf.leafTotal(pe),
            n = e.length,
            i = e.filter((t) => !KIVO.BassamLeaf.closedOf(pe, t)).length,
            o = n - i,
            r = n ? Math.round((i / n) * 100) : 0,
            a = KIVO.__bsCssObj,
            l = t(
              "div",
              {
                style: {
                  display: "flex",
                  alignItems: "stretch",
                  gap: 9,
                  border: "1px solid var(--bd-xeef0f2)",
                  borderRadius: 12,
                  padding: 9,
                  background: "linear-gradient(180deg,var(--bg-xffffff),var(--bg-xfcfcfd))",
                  marginBottom: 10,
                  boxShadow: "var(--shadow-card)",
                },
              },
              t(
                "div",
                {
                  key: "big",
                  title: "كل أبواب جولة اليوم المعروضة على الخريطة",
                  style: {
                    textAlign: "center",
                    padding: "0 4px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                },
                t(
                  "b",
                  { style: { fontSize: 22, fontWeight: 700, lineHeight: 1, color: "var(--fg-x8a6f35)", fontFamily: "'Cairo',sans-serif" } },
                  String(n),
                ),
                t(
                  "span",
                  { style: { fontSize: 9, fontWeight: 400, color: "var(--fg-x94a3b8)", marginTop: 3, whiteSpace: "nowrap" } },
                  "إجمالي الأبواب",
                ),
                s !== n
                  ? t(
                      "span",
                      {
                        title: "العناصر تُعدّ بالباب الأم مرة واحدة، وعدد الأبواب يجمع فتحاتها — كالتقرير الرسمي",
                        style: { fontSize: 8.5, fontWeight: 700, color: "var(--fg-x9a7e40)", marginTop: 2, whiteSpace: "nowrap" },
                      },
                      "عدد الأبواب " + s,
                    )
                  : null,
              ),
              t("div", { key: "sp", style: { width: 1, background: "linear-gradient(180deg,transparent,var(--bg-xe6e8eb),transparent)" } }),
              t(
                "div",
                {
                  key: "side",
                  style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 7 },
                },
                [
                  [
                    "on",
                    i,
                    r,
                    "#047857",
                    "#16a34a",
                    "مفتوح",
                    ["M22 11.08V12a10 10 0 1 1-5.93-9.14", "m9 11 3 3L22 4"],
                    "rgba(0,132,80,0.10)",
                    "rgba(0,132,80,0.25)",
                    "المفتوح ÷ الإجمالي = " + i + " ÷ " + n + " = " + r + "٪ — والحالة تُبدَّل بنقرة على الباب في وضع التشغيل",
                  ],
                  [
                    "off",
                    o,
                    100 - r,
                    "#94a3b8",
                    "#94a3b8",
                    "مغلق",
                    ["M18.36 6.64A9 9 0 1 1 5.64 6.64", "M12 2v10"],
                    "#F5F6F8",
                    "#E6E8EB",
                    "المغلق ÷ الإجمالي = " + o + " ÷ " + n + " = " + (100 - r) + "٪ · كل إغلاق مسجَّل بسببه ووقته",
                  ],
                ].map((e) => {
                  return t(
                    "div",
                    { key: e[0], title: e[9], style: { display: "flex", alignItems: "center", gap: 5 } },
                    t(
                      "span",
                      {
                        style: {
                          width: 17,
                          height: 17,
                          borderRadius: 6,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          background: e[7],
                          border: "1px solid " + e[8],
                        },
                      },
                      ((s = e[6]),
                      (n = e[3]),
                      t(
                        "svg",
                        {
                          width: 11,
                          height: 11,
                          viewBox: "0 0 24 24",
                          fill: "none",
                          stroke: n,
                          strokeWidth: 2.2,
                          strokeLinecap: "round",
                          strokeLinejoin: "round",
                          style: { flexShrink: 0 },
                        },
                        s.map((e, s) => t("path", { key: "p" + s, d: e })),
                      )),
                    ),
                    t("span", { style: { fontSize: 10, fontWeight: 400, flexShrink: 0 } }, e[5]),
                    ((e, s) => {
                      const n = KIVO.BassamMix.rowStyles({ pc: e, color: s, track: "#EEF0F2" });
                      return t(
                        "span",
                        { style: { display: "flex", gap: 1.5, flex: "1 1 auto", minWidth: 44 } },
                        n.cells.map((e, s) => t("i", { key: "b" + s, style: a(e) })),
                      );
                    })(e[2], e[4]),
                    t(
                      "span",
                      {
                        style: {
                          fontSize: 11,
                          fontWeight: 700,
                          width: 34,
                          textAlign: "left",
                          flexShrink: 0,
                          whiteSpace: "nowrap",
                          color: "var(--fg-x8a6f35)",
                          fontFamily: "'Cairo',sans-serif",
                        },
                      },
                      String(e[1]),
                      t(
                        "em",
                        { style: { fontStyle: "normal", fontSize: 7.5, fontWeight: 400, color: "var(--fg-x8e959d)", marginRight: 2 } },
                        e[2] + "٪",
                      ),
                    ),
                  );
                  var s, n;
                }),
              ),
            ),
            d = ["#b99751", "#9A7E40", "#c9ab6f", "#876a33", "#d6c08a", "#7c6320"],
            p = a,
            h = { fontSize: 8, fontWeight: 400, opacity: 0.62, marginRight: 2, letterSpacing: 0 },
            c = ps
              .filter((t) => "closed" !== t[0])
              .map((s, n) => {
                const i = {},
                  o = {},
                  r = [];
                e.forEach((t) =>
                  fs(t, s[0]).forEach((e) => {
                    (null == i[e] && ((i[e] = 0), (o[e] = 0), r.push(e)), i[e]++, KIVO.BassamLeaf.closedOf(pe, t) || o[e]++);
                  }),
                );
                const a = r.map((t) => ({ label: t, n: i[t], on: o[t] })).sort((t, e) => e.n - t.n || t.label.localeCompare(e.label, "ar"));
                if (!a.length) return null;
                const l = a.reduce((t, e) => t + e.n, 0),
                  c = "cats" === s[0] ? "انتماء" : "باب",
                  g = "cats" === s[0] ? " · الباب قد ينتمي لأكثر من تخصيص" : "",
                  f = (t) => {
                    if ("loc" === s[0]) {
                      const e = ds(t.label);
                      if (e) return e;
                    }
                    const e = a.indexOf(t);
                    return d[(e < 0 ? 0 : e) % d.length];
                  },
                  u = Math.max(...a.map((t) => t.n)),
                  y = Math.min(...a.map((t) => t.n)),
                  m = a.filter((t) => t.n === u),
                  x = a.filter((t) => t.n === y),
                  b = (e, s, n, i) =>
                    t(
                      "div",
                      {
                        key: e ? "hi" : "lo",
                        title:
                          (e ? "الأعلى" : "الأدنى") +
                          " — " +
                          (1 === n.length ? n[0].label : KIVO.BassamCount(n.length, "قيمة|متعادلة") + "") +
                          " · " +
                          i,
                        style: {
                          flex: 1,
                          minWidth: 0,
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          padding: "5px 8px",
                          borderRadius: 10,
                          border: "1px solid var(--bd-xedeff2)",
                          background: "var(--bg-xffffff)",
                          boxShadow: "var(--shadow-card)",
                        },
                      },
                      t(
                        "span",
                        {
                          key: "bd",
                          style: {
                            width: 20,
                            height: 20,
                            borderRadius: 9999,
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: s + "14",
                            border: "1px solid " + s + "29",
                          },
                        },
                        ((e, s) =>
                          t(
                            "svg",
                            {
                              width: 9,
                              height: 9,
                              viewBox: "0 0 24 24",
                              fill: "none",
                              stroke: s,
                              strokeWidth: 3,
                              strokeLinecap: "round",
                              strokeLinejoin: "round",
                              style: { flexShrink: 0 },
                            },
                            t("path", { key: "a", d: e ? "M12 19V5" : "M12 5v14" }),
                            t("path", { key: "b", d: e ? "m5 12 7-7 7 7" : "m19 12-7 7-7-7" }),
                          ))(e, s),
                      ),
                      t(
                        "span",
                        {
                          key: "v",
                          dir: "ltr",
                          style: {
                            flexShrink: 0,
                            fontSize: 13.5,
                            fontWeight: 700,
                            color: s,
                            lineHeight: 1,
                            fontFamily: "'Cairo',sans-serif",
                            fontFeatureSettings: "'tnum'",
                          },
                        },
                        String(i),
                      ),
                      t(
                        "span",
                        { key: "tx", style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 } },
                        t(
                          "span",
                          { style: { fontSize: 7.5, fontWeight: 600, color: "var(--fg-xa2a9b2)", lineHeight: 1.2, whiteSpace: "nowrap" } },
                          e ? "الأعلى" : "الأدنى",
                        ),
                        t(
                          "span",
                          { style: { display: "flex", alignItems: "center", gap: 4, minWidth: 0 } },
                          t("i", {
                            style: {
                              width: 7,
                              height: 7,
                              borderRadius: 2,
                              flexShrink: 0,
                              background: 1 === n.length ? f(n[0]) : "var(--bg-xcbd5e1)",
                              boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
                            },
                          }),
                          t(
                            "span",
                            {
                              style: {
                                minWidth: 0,
                                fontSize: 9.5,
                                fontWeight: 600,
                                color: "var(--fg-x3f3f3f)",
                                lineHeight: 1.25,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              },
                            },
                            1 === n.length ? n[0].label : n.length + " متعادلة",
                          ),
                        ),
                      ),
                    ),
                  k =
                    u === y
                      ? t(
                          "div",
                          { style: { display: "flex", gap: 6, marginBottom: 7 } },
                          t(
                            "div",
                            {
                              style: {
                                flex: 1,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6,
                                padding: "6px 8px",
                                borderRadius: 10,
                                border: "1px solid var(--bd-xedeff2)",
                                background: "linear-gradient(180deg,var(--bg-xfcfcfd),var(--bg-xfafbfc))",
                              },
                            },
                            t(
                              "span",
                              {
                                style: {
                                  width: 15,
                                  height: 15,
                                  borderRadius: 9999,
                                  flexShrink: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  background: "var(--bg-xf1f3f5)",
                                  border: "1px solid var(--bd-xe6e8eb)",
                                },
                              },
                              t(
                                "svg",
                                {
                                  width: 9,
                                  height: 9,
                                  viewBox: "0 0 24 24",
                                  fill: "none",
                                  stroke: "#94a3b8",
                                  strokeWidth: 3,
                                  strokeLinecap: "round",
                                },
                                t("path", { key: "e1", d: "M5 9h14" }),
                                t("path", { key: "e2", d: "M5 15h14" }),
                              ),
                            ),
                            t(
                              "span",
                              { style: { fontSize: 9, fontWeight: 400, color: "var(--fg-x8b9099)", whiteSpace: "nowrap" } },
                              "كل القيم متساوية",
                            ),
                            t(
                              "span",
                              {
                                dir: "ltr",
                                style: {
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "var(--fg-x6f7276)",
                                  lineHeight: 1,
                                  fontFamily: "'Cairo',sans-serif",
                                  fontFeatureSettings: "'tnum'",
                                },
                              },
                              String(u),
                            ),
                          ),
                        )
                      : t("div", { style: { display: "flex", gap: 6, marginBottom: 6 } }, b(!0, "#dc2626", m, u), b(!1, "#047857", x, y)),
                  v = t(
                    "div",
                    {
                      key: "hdc",
                      style: {
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "0 1px 5px",
                        borderBottom: "1px solid var(--bd-a185151810p16)",
                        marginBottom: 5,
                      },
                    },
                    t("span", { key: "sp0", style: { flex: "1 1 auto" } }),
                    [
                      ["مفتوح", "#16a34a"],
                      ["مغلق", "#a8aeb5"],
                      ["الكل", "#9A7E40"],
                    ].map((e, s) =>
                      t(
                        "span",
                        {
                          key: "hc" + s,
                          style: {
                            flex: "0 0 24px",
                            textAlign: "left",
                            fontFamily: "'Cairo',sans-serif",
                            fontFeatureSettings: "'tnum'",
                            fontSize: 7.5,
                            fontWeight: 400,
                            color: e[1],
                          },
                        },
                        e[0],
                      ),
                    ),
                  ),
                  w = (e, s, n, i, o, r) => {
                    const a = l ? Math.round((s / l) * 100) : 0,
                      d = s - n,
                      f = s ? Math.round((n / s) * 100) : 0,
                      u = l ? (s / l) * 100 : 0,
                      y = s ? (n / s) * 100 : 0,
                      m = KIVO.BassamMix.rowStyles({
                        pc: a,
                        lead: o,
                        color: i,
                        track: "rgba(185,151,81,0.12)",
                        num: "#9A7E40",
                        numWidth: 24,
                      }),
                      x = p(m.item);
                    return (
                      o &&
                        ((x.borderTop = "1px solid rgba(185,151,81,0.35)"),
                        (x.marginTop = "5px"),
                        (x.height = "20px"),
                        (x.paddingTop = "4px")),
                      t(
                        "div",
                        {
                          key: "r" + e,
                          title:
                            e +
                            " — " +
                            s +
                            " " +
                            c +
                            " (" +
                            a +
                            "٪ من الكل) · مفتوح " +
                            n +
                            " (" +
                            f +
                            "٪) · مغلق " +
                            d +
                            " (" +
                            (100 - f) +
                            "٪)" +
                            g,
                          style: x,
                        },
                        r,
                        t("span", { style: p(m.name) }, e),
                        t(
                          "span",
                          { style: p(m.track) },
                          m.cells.map((e, s) => t("span", { key: "cl" + s, style: p(e) })),
                        ),
                        t("span", { dir: "ltr", style: p(m.numOn) }, String(n), t("span", { style: h }, KIVO.bsPct(y) + "٪")),
                        t("span", { dir: "ltr", style: p(m.numOff) }, String(d), t("span", { style: h }, KIVO.bsPct(100 - y) + "٪")),
                        t("span", { dir: "ltr", style: p(m.num) }, String(s), t("span", { style: h }, KIVO.bsPct(u) + "٪")),
                      )
                    );
                  };
                return (
                  a.reduce((t, e) => t + e.on, 0),
                  t(
                    "div",
                    {
                      key: "sec" + n,
                      style: {
                        border: "1px solid var(--bd-xeef0f2)",
                        borderRadius: 12,
                        padding: 8,
                        background: "var(--bg-xffffff)",
                        boxShadow: "var(--shadow-card)",
                        marginBottom: 7,
                      },
                    },
                    t(
                      "div",
                      { key: "h", style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 7 } },
                      t("span", {
                        style: {
                          flex: 1,
                          height: 1,
                          background: "linear-gradient(90deg,var(--bg-a185151810) 0%,var(--bg-a185151810p32) 100%)",
                        },
                      }),
                      t(
                        "span",
                        {
                          style: {
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            flexShrink: 0,
                            borderRadius: 9999,
                            padding: "2px 9px",
                            background: "var(--bg-xffffff)",
                            border: "1px solid var(--bd-a185151810p3)",
                          },
                        },
                        t(
                          "span",
                          {
                            style: {
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              color: "var(--fg-xb99751)",
                            },
                          },
                          t(
                            "svg",
                            {
                              width: 11,
                              height: 11,
                              viewBox: "0 0 24 24",
                              fill: "none",
                              stroke: "currentColor",
                              strokeWidth: 2.4,
                              strokeLinecap: "round",
                              strokeLinejoin: "round",
                            },
                            t("path", { d: "M21.21 15.89A10 10 0 1 1 8 2.83" }),
                            t("path", { d: "M22 12A10 10 0 0 0 12 2v10z" }),
                          ),
                        ),
                        t(
                          "span",
                          {
                            style: {
                              fontSize: 9,
                              fontWeight: 600,
                              color: "var(--fg-x53565a)",
                              whiteSpace: "nowrap",
                              letterSpacing: "-0.01em",
                            },
                          },
                          "الأبواب بحسب " + s[1],
                        ),
                      ),
                      t("span", {
                        style: {
                          flex: 1,
                          height: 1,
                          background: "linear-gradient(90deg,var(--bg-a185151810p32) 0%,var(--bg-a185151810) 100%)",
                        },
                      }),
                    ),
                    k,
                    t(
                      "div",
                      { key: "b", style: { display: "flex", alignItems: "center", gap: 10 } },
                      t(
                        "div",
                        { style: { position: "relative", width: 64, height: 64, flexShrink: 0, display: "grid", placeItems: "center" } },
                        KIVO.BassamMix.donutHit(
                          a.map((t) => ({ n: t.n, label: t.label, color: f(t) })),
                          l,
                          64,
                          c,
                          30,
                        ),
                        t(
                          "span",
                          {
                            style: {
                              position: "relative",
                              zIndex: 2,
                              fontSize: 18,
                              fontWeight: 700,
                              lineHeight: 1,
                              color: "var(--fg-x141414)",
                              fontFamily: "'Cairo',sans-serif",
                            },
                          },
                          String(a.length),
                        ),
                      ),
                      t(
                        "div",
                        { style: { flex: 1, minWidth: 0 } },
                        v,
                        a
                          .map((e, s) => {
                            const i = f(e);
                            return w(
                              e.label,
                              e.n,
                              e.on,
                              i,
                              !1,
                              t(
                                "svg",
                                {
                                  key: "sw" + n + s,
                                  width: 17,
                                  height: 11,
                                  viewBox: "0 0 17 11",
                                  style: { flexShrink: 0, overflow: "visible" },
                                },
                                t("rect", {
                                  x: 0.83,
                                  y: 0.83,
                                  width: 15.35,
                                  height: 9.35,
                                  rx: 2.8,
                                  fill: i,
                                  fillOpacity: 0.5,
                                  stroke: i,
                                  strokeWidth: 0.65,
                                  strokeLinejoin: "round",
                                }),
                              ),
                            );
                          })
                          .concat([
                            w(
                              "الإجمالي",
                              l,
                              a.reduce((t, e) => t + e.on, 0),
                              "#9A7E40",
                              !0,
                              t("span", {
                                style: {
                                  width: 17,
                                  height: 11,
                                  borderRadius: 2.5,
                                  flexShrink: 0,
                                  background: "var(--bg-x9a7e40)",
                                  opacity: 0.85,
                                },
                              }),
                            ),
                          ]),
                      ),
                    ),
                  )
                );
              })
              .filter(Boolean);
          return t("div", { key: "gops" }, l, c);
        })()));
    else if ("marks" === Te && "summary" === s.markDim)
      ((zn = !0),
        (En = An({
          total: ce.length,
          totalLabel: "إجمالي المعالم",
          unit: "معلم",
          dims: Ss,
          itemsOf: (t) => Es(t).map((e) => ({ label: e.label, n: e.n, color: "off" === t && "معطّل" === e.label ? "#64748b" : "#9c3d6b" })),
          hero: { onN: ce.filter((t) => !t.off).length, offN: ce.filter((t) => !!t.off).length, onWord: "مفعّل", offWord: "معطّل" },
        })));
    else if (
      ("gates" === Te && "dsum" === s.gateDim) ||
      ("zones" === Te && "dsum" === s.brkDim) ||
      ("marks" === Te && "dsum" === s.markDim)
    ) {
      zn = !0;
      const t =
          "gates" === Te
            ? {
                g: 1,
                arr: KIVO.BassamLeaf.units((_ || {}).gates || []),
                word: "الأبواب",
                dims: [
                  ["loc", "الموقع"],
                  ["gtype", "النوع"],
                  ["kind", "الفئة"],
                  ["route", "المسار"],
                  ["cls", "التصنيف"],
                  ["cats", "التخصيص"],
                ],
                vals: fs,
              }
            : "zones" === Te
              ? {
                  g: 0,
                  arr: (_ || {}).zones || [],
                  word: "المصليات",
                  dims: [
                    ["region", "المنطقة"],
                    ["level", "الدور/المستوى"],
                    ["ztype", "النوع"],
                    ["zcat", "الفئة"],
                  ],
                  vals: (t, e) => [String(null == (t && t[e]) ? "" : t[e]).trim() || "غير محدّد"],
                }
              : {
                  g: 0,
                  arr: (_ || {}).marks || [],
                  word: "المعالم",
                  dims: [["kind", "النوع"]],
                  vals: (t, e) => [String(null == (t && t[e]) ? "" : t[e]).trim() || "غير محدّد"],
                },
        e = t.arr,
        s = (() => {
          const t = this._drx9;
          if (t && t.k === N) return t;
          const e = {
            k: N,
            s: new Set(),
            any: !1,
            ab: 0,
            pm: 0,
            lv: 0,
            tin: {},
          };
          try {
            const t = (this._opRead("bassam_dreport_v1") || {} || {})[N];
            t &&
              t.shifts &&
              Object.keys(t.shifts).length &&
              ((e.any = !0),
              Object.keys(t.shifts).forEach((s) => {
                ((t.shifts[s] || {}).roster || []).forEach((t) => {
                  if (!t || !t.ekey) return;
                  const n =
                    "ab" === t.st || "pm" === t.st || "lv" === t.st
                      ? t.st
                      : "ab" === t.mark || "pm" === t.mark || "lv" === t.mark
                        ? t.mark
                        : null;
                  (n && (e.s.add(t.ekey), e[n]++), t.tin && (e.tin[t.ekey] = s));
                });
              }));
          } catch (t) {}
          return ((this._drx9 = e), e);
        })(),
        n = s.s,
        i = (t) => null == _e || (_e === Gt ? !Kt(t) : (Kt(t) || "") === _e),
        o = React.createElement,
        r = {};
      e.forEach((t) =>
        (t.emp || []).forEach((t) => {
          r[Nt(t)] = 1;
        }),
      );
      const a = {};
      [(_ || {}).zones, (_ || {}).gates, (_ || {}).marks].forEach((t) =>
        (t || []).forEach((t) =>
          (t.emp || []).forEach((t) => {
            a[Nt(t)] = 1;
          }),
        ),
      );
      const l = new Set(le.map((t) => t && t.name)),
        d = (t) => {
          if (null == _e) return !0;
          const e = Tt(t);
          return _e === Gt ? !Yt[e] : (s.tin[e] || Yt[e]) === _e;
        },
        p = Object.keys(s.tin).length;
      let h = 0,
        c = 0,
        g = 0,
        f = 0,
        u = 0,
        y = 0,
        m = 0;
      ae.concat(le).forEach((t) => {
        if (!t || !t.name || !d(t)) return;
        const e = Tt(t),
          s = l.has(t.name),
          i = !s && n.has(e);
        if (s || i) return (a[e] && y++, void (s ? f++ : u++));
        (h++, a[e] ? (c++, r[e] && m++) : g++);
      });
      const x = null != _e ? Jt(_e) : "كل الورديات",
        b = h ? Math.round((100 * c) / h) : 0,
        k = KIVO.__bsCssObj,
        v = (t, e) => {
          const s = KIVO.BassamMix.rowStyles({ pc: t, color: e, track: "#EEF0F2" });
          return o(
            "span",
            { style: { display: "flex", gap: 1.5, flex: "1 1 auto", minWidth: 44 } },
            s.cells.map((t, e) => o("i", { key: "b" + e, style: k(t) })),
          );
        },
        w = (t, e, s) =>
          o(
            "svg",
            {
              width: s,
              height: s,
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: e,
              strokeWidth: 2.2,
              strokeLinecap: "round",
              strokeLinejoin: "round",
              style: { flexShrink: 0 },
            },
            t.map((t, e) => o("path", { key: "p" + e, d: t })),
          ),
        S =
          "قوة «" +
          x +
          "» بعد استبعاد الراحة الأسبوعية (" +
          f +
          ") وتأشير التقرير اليومي غياباً واستئذاناً وإجازة (" +
          u +
          (s.any ? " — غائب " + s.ab + " · مستأذن " + s.pm + " · مجاز " + s.lv + " في تقارير اليوم كلها" : "") +
          ")" +
          (s.any ? "" : " · لا تقرير مؤشَّراً لليوم بعد — فالاستبعاد بالراحة وحدها") +
          (p ? " · تحويلات اليوم " + p + " — المحوَّل يُحسب في ورديته الجديدة كما في كرت التقرير" : "") +
          (y ? " · تنبيه: " + y + " مسكّنون وهم خارج الحضور الفعلي (راحة أو تأشير) — راجعهم" : ""),
        A = o(
          "div",
          {
            key: "pcard",
            style: {
              display: "flex",
              alignItems: "stretch",
              gap: 9,
              border: "1px solid var(--bd-xeef0f2)",
              borderRadius: 12,
              padding: 9,
              background: "linear-gradient(180deg,var(--bg-xffffff),var(--bg-xfcfcfd))",
              marginBottom: 10,
              boxShadow: "var(--shadow-card)",
            },
          },
          o(
            "div",
            {
              key: "big",
              title: S,
              style: {
                textAlign: "center",
                padding: "0 4px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: "help",
              },
            },
            o(
              "b",
              { style: { fontSize: 22, fontWeight: 700, lineHeight: 1, color: "var(--fg-x8a6f35)", fontFamily: "'Cairo',sans-serif" } },
              String(h),
            ),
            o(
              "span",
              { style: { fontSize: 9, fontWeight: 400, color: "var(--fg-x94a3b8)", marginTop: 3, whiteSpace: "nowrap" } },
              "الحضور الفعلي — " + x,
            ),
          ),
          o("div", { key: "sp", style: { width: 1, background: "linear-gradient(180deg,transparent,var(--bg-xe6e8eb),transparent)" } }),
          o(
            "div",
            { key: "side", style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 7 } },
            [
              [
                "on",
                c,
                b,
                "#047857",
                "#10b981",
                "مسكّنون",
                [["M22 11.08V12a10 10 0 1 1-5.93-9.14"], ["m9 11 3 3L22 4"]],
                "rgba(0,132,80,0.10)",
                "rgba(0,132,80,0.25)",
                "المسكّنون من حاضري «" +
                  x +
                  "» على أي عنصر: " +
                  c +
                  " من " +
                  h +
                  " (" +
                  b +
                  "٪) — على " +
                  t.word +
                  " " +
                  m +
                  " وعلى غيرها " +
                  (c - m),
              ],
              [
                "av",
                g,
                100 - b,
                "#b45309",
                "#e5b563",
                "متاح للتسكين",
                [["M13 2 3 14h9l-1 8 10-12h-9l1-8"]],
                "rgba(245,158,11,0.10)",
                "rgba(245,158,11,0.28)",
                "حاضرون بلا أي تسكين بعد: " + g + " من " + h + " (" + (100 - b) + "٪) — مسكّنون + متاح = الحضور الفعلي دائماً",
              ],
            ].map((t) =>
              o(
                "div",
                { key: t[0], title: t[9], style: { display: "flex", alignItems: "center", gap: 5 } },
                o(
                  "span",
                  {
                    style: {
                      width: 17,
                      height: 17,
                      borderRadius: 6,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      background: t[7],
                      border: "1px solid " + t[8],
                    },
                  },
                  w(
                    t[6].map((t) => t[0]),
                    t[3],
                    11,
                  ),
                ),
                o("span", { style: { fontSize: 10, fontWeight: 400, flexShrink: 0 } }, t[5]),
                v(t[2], t[4]),
                o(
                  "span",
                  {
                    style: {
                      fontSize: 11,
                      fontWeight: 700,
                      width: 34,
                      textAlign: "left",
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                      color: "var(--fg-x8a6f35)",
                      fontFamily: "'Cairo',sans-serif",
                    },
                  },
                  String(t[1]),
                  o(
                    "em",
                    { style: { fontStyle: "normal", fontSize: 7.5, fontWeight: 400, color: "var(--fg-x8e959d)", marginRight: 2 } },
                    t[2] + "٪",
                  ),
                ),
              ),
            ),
          ),
        ),
        z = (t) => (null != _e && _e !== Gt ? KIVO.BassamNeed.of(t, _e) : KIVO.BassamNeed.tot(t, Zt)),
        E = ["#b99751", "#9A7E40", "#c9ab6f", "#876a33", "#d6c08a", "#7c6320"],
        M = { fontSize: 8, fontWeight: 400, opacity: 0.62, marginRight: 2, letterSpacing: 0 },
        O = t.dims
          .map((s, n) => {
            const r = {},
              a = [];
            e.forEach((e) => {
              const n = z(e),
                o = (e.emp || []).filter(i).length;
              t.vals(e, s[0]).forEach((t) => {
                (null == r[t] && ((r[t] = { need: 0, plc: 0 }), a.push(t)), (r[t].need += n), (r[t].plc += o));
              });
            });
            const l = a
              .map((t) => ({ label: t, need: r[t].need, plc: r[t].plc }))
              .sort((t, e) => e.need - t.need || e.plc - t.plc || t.label.localeCompare(e.label, "ar"));
            if (!l.length) return null;
            const d = l.reduce((t, e) => t + e.need, 0),
              p = l.reduce((t, e) => t + e.plc, 0),
              h = "cats" === s[0] ? " · الباب متعدد التخصيصات يُحسب احتياجه وتسكينه في كل تخصيص ينتمي إليه" : "",
              c = (e) => {
                if (t.g && "loc" === s[0]) {
                  const t = ds(e.label);
                  if (t) return t;
                }
                const n = l.indexOf(e);
                return E[(n < 0 ? 0 : n) % E.length];
              },
              g = Math.max(...l.map((t) => t.need)),
              f = Math.min(...l.map((t) => t.need)),
              u = l.filter((t) => t.need === g),
              y = l.filter((t) => t.need === f),
              m = (t, e, s, n) =>
                o(
                  "div",
                  {
                    key: t ? "hi" : "lo",
                    title:
                      (t ? "الأعلى احتياجاً" : "الأدنى احتياجاً") +
                      " — " +
                      (1 === s.length ? s[0].label : KIVO.BassamCount(s.length, "قيمة|متعادلة") + "") +
                      " · " +
                      n,
                    style: {
                      flex: 1,
                      minWidth: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "5px 8px",
                      borderRadius: 10,
                      border: "1px solid var(--bd-xedeff2)",
                      background: "var(--bg-xffffff)",
                      boxShadow: "var(--shadow-card)",
                    },
                  },
                  o(
                    "span",
                    {
                      key: "bd",
                      style: {
                        width: 20,
                        height: 20,
                        borderRadius: 9999,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: e + "14",
                        border: "1px solid " + e + "29",
                      },
                    },
                    ((t, e) =>
                      o(
                        "svg",
                        {
                          width: 9,
                          height: 9,
                          viewBox: "0 0 24 24",
                          fill: "none",
                          stroke: e,
                          strokeWidth: 3,
                          strokeLinecap: "round",
                          strokeLinejoin: "round",
                          style: { flexShrink: 0 },
                        },
                        o("path", { key: "a", d: t ? "M12 19V5" : "M12 5v14" }),
                        o("path", { key: "b", d: t ? "m5 12 7-7 7 7" : "m19 12-7 7-7-7" }),
                      ))(t, e),
                  ),
                  o(
                    "span",
                    {
                      key: "v",
                      dir: "ltr",
                      style: {
                        flexShrink: 0,
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: e,
                        lineHeight: 1,
                        fontFamily: "'Cairo',sans-serif",
                        fontFeatureSettings: "'tnum'",
                      },
                    },
                    String(n),
                  ),
                  o(
                    "span",
                    { key: "tx", style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 } },
                    o(
                      "span",
                      { style: { fontSize: 7.5, fontWeight: 600, color: "var(--fg-xa2a9b2)", lineHeight: 1.2, whiteSpace: "nowrap" } },
                      t ? "الأعلى احتياجاً" : "الأدنى احتياجاً",
                    ),
                    o(
                      "span",
                      { style: { display: "flex", alignItems: "center", gap: 4, minWidth: 0 } },
                      o("i", {
                        style: {
                          width: 7,
                          height: 7,
                          borderRadius: 2,
                          flexShrink: 0,
                          background: 1 === s.length ? c(s[0]) : "var(--bg-xcbd5e1)",
                          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
                        },
                      }),
                      o(
                        "span",
                        {
                          style: {
                            minWidth: 0,
                            fontSize: 9.5,
                            fontWeight: 600,
                            color: "var(--fg-x3f3f3f)",
                            lineHeight: 1.25,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          },
                        },
                        1 === s.length ? s[0].label : s.length + " متعادلة",
                      ),
                    ),
                  ),
                ),
              x =
                g === f
                  ? o(
                      "div",
                      { style: { display: "flex", gap: 6, marginBottom: 7 } },
                      o(
                        "div",
                        {
                          style: {
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            padding: "6px 8px",
                            borderRadius: 10,
                            border: "1px solid var(--bd-xedeff2)",
                            background: "linear-gradient(180deg,var(--bg-xfcfcfd),var(--bg-xfafbfc))",
                          },
                        },
                        o(
                          "span",
                          {
                            style: {
                              width: 15,
                              height: 15,
                              borderRadius: 9999,
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "var(--bg-xf1f3f5)",
                              border: "1px solid var(--bd-xe6e8eb)",
                            },
                          },
                          o(
                            "svg",
                            {
                              width: 9,
                              height: 9,
                              viewBox: "0 0 24 24",
                              fill: "none",
                              stroke: "#94a3b8",
                              strokeWidth: 3,
                              strokeLinecap: "round",
                            },
                            o("path", { key: "e1", d: "M5 9h14" }),
                            o("path", { key: "e2", d: "M5 15h14" }),
                          ),
                        ),
                        o(
                          "span",
                          { style: { fontSize: 9, fontWeight: 400, color: "var(--fg-x8b9099)", whiteSpace: "nowrap" } },
                          "كل القيم متساوية الاحتياج",
                        ),
                        o(
                          "span",
                          {
                            dir: "ltr",
                            style: {
                              fontSize: 11,
                              fontWeight: 700,
                              color: "var(--fg-x6f7276)",
                              lineHeight: 1,
                              fontFamily: "'Cairo',sans-serif",
                              fontFeatureSettings: "'tnum'",
                            },
                          },
                          String(g),
                        ),
                      ),
                    )
                  : o("div", { style: { display: "flex", gap: 6, marginBottom: 6 } }, m(!0, "#dc2626", u, g), m(!1, "#047857", y, f)),
              b = o(
                "div",
                {
                  key: "hdc",
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "0 1px 5px",
                    borderBottom: "1px solid var(--bd-a185151810p16)",
                    marginBottom: 5,
                  },
                },
                o("span", { key: "sp0", style: { flex: "1 1 auto" } }),
                [
                  ["الاحتياج", "#9A7E40"],
                  ["مسكّن", "#16a34a"],
                  ["المتبقي", "#dc2626"],
                ].map((t, e) =>
                  o(
                    "span",
                    {
                      key: "hc" + e,
                      style: {
                        flex: "0 0 24px",
                        textAlign: "left",
                        fontFamily: "'Cairo',sans-serif",
                        fontFeatureSettings: "'tnum'",
                        fontSize: 7.5,
                        fontWeight: 400,
                        color: t[1],
                      },
                    },
                    t[0],
                  ),
                ),
              ),
              v = (t, e, s, n, i, r) => {
                const a = Math.max(0, e - s),
                  l = Math.max(0, s - e),
                  p = d ? Math.round((e / d) * 100) : 0,
                  c = d ? (e / d) * 100 : 0,
                  g = e ? Math.round((100 * s) / e) : 0,
                  f = e ? (100 * s) / e : 0,
                  u = (e && Math.round((100 * a) / e), e ? (100 * a) / e : 0),
                  y = KIVO.BassamMix.rowStyles({
                    pc: p,
                    lead: i,
                    color: n,
                    track: "rgba(185,151,81,0.12)",
                    num: "#9A7E40",
                    numWidth: 24,
                  }),
                  m = k(y.item);
                i &&
                  ((m.borderTop = "1px solid rgba(185,151,81,0.35)"), (m.marginTop = "5px"), (m.height = "20px"), (m.paddingTop = "4px"));
                const x = a > 0 ? String(y.numOff).split("#94a3b8").join("#dc2626") : y.numOff;
                return o(
                  "div",
                  {
                    key: "r" + t,
                    title:
                      t +
                      " — الاحتياج " +
                      e +
                      (e ? " (" + p + "٪ من احتياج القسم)" : " (بلا احتياج مُدخل)") +
                      " · مسكّن " +
                      s +
                      (e ? " (" + g + "٪ من الاحتياج)" : "") +
                      " · المتبقي " +
                      a +
                      (l ? " · فائض " + l + " فوق الاحتياج" : "") +
                      h,
                    style: m,
                  },
                  r,
                  o("span", { style: k(y.name) }, t),
                  o(
                    "span",
                    { style: k(y.track) },
                    y.cells.map((t, e) => o("span", { key: "cl" + e, style: k(t) })),
                  ),
                  o("span", { dir: "ltr", style: k(y.num) }, String(e), o("span", { style: M }, KIVO.bsPct(c) + "٪")),
                  o("span", { dir: "ltr", style: k(y.numOn) }, String(s), o("span", { style: M }, e ? KIVO.bsPct(f) + "٪" : "—")),
                  o("span", { dir: "ltr", style: k(x) }, String(a), o("span", { style: M }, e ? KIVO.bsPct(u) + "٪" : "—")),
                );
              };
            return o(
              "div",
              {
                key: "nsec" + n,
                style: {
                  border: "1px solid var(--bd-xeef0f2)",
                  borderRadius: 12,
                  padding: 8,
                  background: "var(--bg-xffffff)",
                  boxShadow: "var(--shadow-card)",
                  marginBottom: 7,
                },
              },
              o(
                "div",
                { key: "h", style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 7 } },
                o("span", {
                  style: { flex: 1, height: 1, background: "linear-gradient(90deg,var(--bg-a185151810) 0%,var(--bg-a185151810p32) 100%)" },
                }),
                o(
                  "span",
                  {
                    style: {
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      flexShrink: 0,
                      borderRadius: 9999,
                      padding: "2px 9px",
                      background: "var(--bg-xffffff)",
                      border: "1px solid var(--bd-a185151810p3)",
                    },
                  },
                  o(
                    "span",
                    {
                      style: {
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        color: "var(--fg-xb99751)",
                      },
                    },
                    o(
                      "svg",
                      {
                        width: 11,
                        height: 11,
                        viewBox: "0 0 24 24",
                        fill: "none",
                        stroke: "currentColor",
                        strokeWidth: 2.4,
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                      },
                      o("path", { d: "M21.21 15.89A10 10 0 1 1 8 2.83" }),
                      o("path", { d: "M22 12A10 10 0 0 0 12 2v10z" }),
                    ),
                  ),
                  o(
                    "span",
                    { style: { fontSize: 9, fontWeight: 600, color: "var(--fg-x53565a)", whiteSpace: "nowrap", letterSpacing: "-0.01em" } },
                    "التوزيع بحسب " + s[1],
                  ),
                ),
                o("span", {
                  style: { flex: 1, height: 1, background: "linear-gradient(90deg,var(--bg-a185151810p32) 0%,var(--bg-a185151810) 100%)" },
                }),
              ),
              x,
              o(
                "div",
                { key: "b", style: { display: "flex", alignItems: "center", gap: 10 } },
                o(
                  "div",
                  { style: { position: "relative", width: 64, height: 64, flexShrink: 0, display: "grid", placeItems: "center" } },
                  KIVO.BassamMix.donutHit(
                    l.map((t) => ({ n: t.need, label: t.label, color: c(t) })),
                    d,
                    64,
                    "احتياج",
                    30,
                  ),
                  o(
                    "span",
                    {
                      style: {
                        position: "relative",
                        zIndex: 2,
                        fontSize: 18,
                        fontWeight: 700,
                        lineHeight: 1,
                        color: "var(--fg-x141414)",
                        fontFamily: "'Cairo',sans-serif",
                      },
                    },
                    String(l.length),
                  ),
                ),
                o(
                  "div",
                  { style: { flex: 1, minWidth: 0 } },
                  b,
                  l
                    .map((t, e) => {
                      const s = c(t);
                      return v(
                        t.label,
                        t.need,
                        t.plc,
                        s,
                        !1,
                        o(
                          "svg",
                          { key: "sw" + n + e, width: 17, height: 11, viewBox: "0 0 17 11", style: { flexShrink: 0, overflow: "visible" } },
                          o("rect", {
                            x: 0.83,
                            y: 0.83,
                            width: 15.35,
                            height: 9.35,
                            rx: 2.8,
                            fill: s,
                            fillOpacity: 0.5,
                            stroke: s,
                            strokeWidth: 0.65,
                            strokeLinejoin: "round",
                          }),
                        ),
                      );
                    })
                    .concat([
                      v(
                        "الإجمالي",
                        d,
                        p,
                        "#9A7E40",
                        !0,
                        o("span", {
                          style: {
                            width: 17,
                            height: 11,
                            borderRadius: 2.5,
                            flexShrink: 0,
                            background: "var(--bg-x9a7e40)",
                            opacity: 0.85,
                          },
                        }),
                      ),
                    ]),
                ),
              ),
            );
          })
          .filter(Boolean);
      En = o("div", { key: "gdist9" }, A, O);
    } else if ("dist" === Te && "summary" === s.distDim) {
      zn = !0;
      const t = de.reduce((t, e) => t + (e.emp || []).length, 0) + pe.reduce((t, e) => t + (e.emp || []).length, 0);
      En = An({
        total: t,
        totalLabel: "إجمالي التسكينات",
        unit: "تسكين",
        unitOf: (t) => ("shift" === t || "state" === t ? "موظف" : "تسكين"),
        dims: Ve,
        itemsOf: Sn,
      });
    } else
      zt &&
        "summary" === s.densDim &&
        ((zn = !0),
        (En = An({
          total: de.length,
          totalLabel: "إجمالي المصليات",
          unit: "مصلى",
          unitOf: () => "مصلى",
          dims: He,
          itemsOf: (t) => Ue(t).map((t) => ({ label: t.label, n: t.n, color: t.color })),
          hero: {
            onN: de.filter((t) => !t.off && null != t.count && "" !== t.count).length,
            offN: de.filter((t) => t.off || null == t.count || "" === t.count).length,
            onWord: "مقروءة",
            offWord: "بلا قراءة",
          },
        })));
    (() => {
      if (!bn.length) return;
      const t = pn.some((t) => null != t.on) && "zstate" !== ln,
        e = pn.reduce((t, e) => t + (null == e.on ? e.n : e.on), 0),
        s = hn - e,
        n = hn ? Math.round((e / hn) * 100) : 0,
        i = hn ? (e / hn) * 100 : 0;
      bn.push({
        label: "الإجمالي",
        count: String(hn),
        pct: "100",
        isTotal: !0,
        pctAll: "100٪",
        subPct: "font-size:8px;font-weight:400;opacity:.62;margin-right:2px;letter-spacing:0",
        hasSplit: t,
        onCount: String(e),
        offCount: String(s),
        onPct: KIVO.bsPct(i) + "٪",
        offPct: KIVO.bsPct(100 - i) + "٪",
        tip:
          "إجمالي " +
          bn.length +
          " " +
          (1 === bn.length ? "قيمة" : "قيم") +
          " — " +
          hn +
          (t ? " · مفعّلة " + e + " (" + n + "٪) · معطّلة " + s : ""),
        hasSwatch: !1,
        markOn: !1,
        ...(() => {
          const t = KIVO.BassamMix.rowStyles({
            pc: 100,
            lead: !1,
            wide: "ztypecat" === ln,
            color: "#9A7E40",
            track: "rgba(185,151,81,0.12)",
            num: "#9A7E40",
            numWidth: 24,
          });
          return {
            ...t,
            item: (t.item || "") + ";border-top:1px solid var(--bd-a185151810p35);margin-top:5px;padding-top:7px;font-weight:600",
          };
        })(),
      });
    })();
    const Mn = KIVO.BassamMix.donutCss(
        pn.map((t, e) => ({ n: t.n, color: cn(t, e) })),
        hn,
      ),
      On = _ && Array.isArray(_.zones) ? _.zones : [],
      Fn = On.filter((t) => t && !t.off).length,
      Cn = On.length,
      Dn =
        (Cn && Math.round((Fn / Cn) * 100), "zones" === s.panelTab && Cn > 0),
      Tn = KIVO.BassamMix.donutCss(
        [
          { n: Fn, color: "#16a34a" },
          { n: Cn - Fn, color: "#e2e8f0" },
        ],
        Cn,
      ),
      Pn = KIVO.BassamMix.donutHit(
        pn.map((t, e) => ({ n: t.n, label: t.label, color: cn(t, e) })),
        hn,
        104,
        "مصلى",
        66,
      ),
      Ln = KIVO.BassamMix.donutHit(
        [
          { n: Fn, label: "مفعّلة" },
          { n: Cn - Fn, label: "معطّلة" },
        ],
        Cn,
        104,
        "مصلى",
        66,
      ),
      Bn = () => {
        if (!this.PC("export")) return void this.permDeny();
        try {
          const t = document.getElementById("bs-print-veil");
          t && t.remove();
          const e = document.createElement("div");
          ((e.id = "bs-print-veil"),
            e.setAttribute(
              "style",
              "position:fixed;inset:0;z-index:99999;background:var(--bg-a2552552550p97);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;font-family:'Cairo',sans-serif",
            ),
            (e.innerHTML =
              '<div style="width:46px;height:46px;border-radius:9999px;border:4px solid var(--bd-a185151810p22);border-top-color:var(--bd-xb99751);animation:bsvspin .9s linear infinite"></div><div style="font-size:15px;font-weight:600;color:var(--fg-x8a6f35)">جاري تجهيز التقرير للطباعة…</div><style>@keyframes bsvspin{to{transform:rotate(360deg)}}</style>'),
            document.body.appendChild(e),
            setTimeout(() => {
              try {
                const t = document.getElementById("bs-print-veil");
                t && t.remove();
              } catch (t) {}
            }, 3e4));
        } catch (t) {}
        const t = this.state,
          e = {
            floor: t.floor,
            lens: t.lens,
            panelTab: t.panelTab,
            brkDim: t.brkDim,
            panelOpen: t.panelOpen,
            dsSel: t.dsSel,
            selMulti: t.selMulti,
          },
          s = t.year + "-" + t.month + "-" + Math.min(t.day, this.hMonthDays(t.year, t.month)),
          n = (t.rounds || {})[s],
          i = n && Array.isArray(n.d) ? n.d : [];
        let o = [];
        try {
          o = (this._opRead("bassam_plan_v1") || {}).floors || [];
        } catch (t) {}
        let r = i
          .map((t, e) =>
            ((t) => {
              const e = i[t] || {},
                s = o[t] || {};
              return !!(s.iid || s.img || (e.zones || []).length || (e.gates || []).length || (e.paths || []).length);
            })(e)
              ? e
              : -1,
          )
          .filter((t) => t >= 0);
        r.length || (r = [Math.max(0, t.floor || 0)]);
        const a = [],
          l = (t) => {
            t >= r.length
              ? this.setState(
                  {
                    floor: e.floor,
                    lens: e.lens,
                    panelTab: e.panelTab,
                    brkDim: e.brkDim,
                    panelOpen: e.panelOpen,
                    dsSel: e.dsSel,
                    selMulti: e.selMulti,
                    dsHovZ: null,
                    dsHovG: null,
                  },
                  () => {
                    try {
                      this._buildPrintDoc(a);
                    } catch (t) {
                      try {
                        const t = document.getElementById("bs-print-veil");
                        t && t.remove();
                      } catch (t) {}
                      try {
                        window.print();
                      } catch (t) {}
                    }
                  },
                )
              : this.setState(
                  {
                    floor: r[t],
                    dsSel: null,
                    selMulti: [],
                    dsHovZ: null,
                    dsHovG: null,
                    ...(this.bsLensOn("zones")
                      ? { lens: "zones", panelTab: "zones", brkDim: "summary" }
                      : this.bsLensOn("gates")
                        ? { lens: "gates", panelTab: "gates" }
                        : this.bsLensOn("marks")
                          ? { lens: "marks", panelTab: "marks" }
                          : this.bsLensOn("paths")
                            ? { lens: "zones", panelTab: "paths" }
                            : { lens: "gates", panelTab: "gates" }),
                    panelOpen: !0,
                  },
                  () => {
                    setTimeout(() => {
                      try {
                        const e = this._capturePrintPage(r[t]);
                        e && ((e.name = (o[r[t]] || {}).name || e.name), a.push(e));
                      } catch (t) {}
                      l(t + 1);
                    }, 170);
                  },
                );
          };
        l(0);
      },
      Nn = new Set();
    de.forEach((t) => {
      const e = String(t.zcat || "").trim();
      e && Nn.add(e);
    });
    const Wn = [];
    let jn;
    const In =
      this.bsLensOn("dist") &&
      (("gates" === Te && "dsum" === s.gateDim) || ("zones" === Te && "dsum" === s.brkDim) || ("marks" === Te && "dsum" === s.markDim));
    if (("dist" === Te && this.bsLensOn("dist")) || In) {
      const t = {},
        e = {},
        s = (s, n, i) => {
          const o = Nt(s);
          ((t[o] = t[o] ? t[o] + " · " + n : n), e[o] || (e[o] = i));
        };
      ((("dist" === Te && this.bsLensOn("zones")) || "zones" === Te ? de : []).forEach((t, e) =>
        (t.emp || []).forEach((n) => s(n, t.code || "مصلى", { t: "zone", i: e })),
      ),
        (("dist" === Te && this.bsLensOn("gates")) || "gates" === Te ? pe : []).forEach((t, e) =>
          (t.emp || []).forEach((n) => s(n, t.label || t.name || "باب", { t: "gate", i: e })),
        ),
        (((("dist" === Te && this.bsLensOn("marks")) || "marks" === Te) && ce) || []).forEach((t, e) =>
          (t.emp || []).forEach((n) => s(n, t.label || t.name || "معلم", { t: "mark", i: e })),
        ));
      const n = {};
      if (In) {
        const e = (e, s) => {
          const i = Nt(e);
          t[i] || (n[i] = n[i] ? n[i] + " · " + s : s);
        };
        ("zones" !== Te && this.bsLensOn("zones") && de.forEach((t) => (t.emp || []).forEach((s) => e(s, t.code || "مصلى"))),
          "gates" !== Te && this.bsLensOn("gates") && pe.forEach((t) => (t.emp || []).forEach((s) => e(s, t.label || t.name || "باب"))),
          "marks" !== Te &&
            this.bsLensOn("marks") &&
            (ce || []).forEach((t) => (t.emp || []).forEach((s) => e(s, t.label || t.name || "معلم"))));
      }
      const i = {};
      (le.forEach((t) => {
        i[Tt(t)] = 1;
      }),
        (jn = ae.concat(le).map((s) => {
          const o = Tt(s);
          return {
            name: s.name + (i[o] ? " · في راحة" : ""),
            meta: t[o] || (n[o] ? "مسكَّن على نوعٍ آخر: " + n[o] : "غير مسكّن"),
            gk: t[o] || (n[o] ? "مسكَّن على نوعٍ آخر" : "غير مسكّن"),
            canAct: !1,
            canEdit: !1,
            act: () => {
              const t = e[o];
              t && this.flashSel(t, "dist" === Te ? "dist" : "gate" === t.t ? "gates" : "mark" === t.t ? "marks" : "zones");
            },
            actTitle: e[o] ? "إظهار مكان تكليفه على الخريطة" : "غير مسكّن — لا مكان لإظهاره",
            color: t[o] ? "#10b981" : n[o] ? "#b25c8a" : i[o] ? "#e5b563" : "#ef4444",
          };
        })));
    } else
      jn =
        "gates" === Te
          ? _s
          : "marks" === Te
            ? $s
            : "paths" === Te
              ? he.map((t, e) => ({
                  gk: (ge[t.type] || ge.in).label,
                  act: () => {
                    this.flashSel({ t: "path", i: e });
                  },
                  actTitle: "تحديد المسار وإظهار مكانه",
                  canAct: Q,
                  offNow: !1 === t.active,
                  onNow: !1 !== t.active,
                  toggleOff: () => {
                    Q &&
                      this._updRoundAt(this.state.floor >= 0 ? this.state.floor : 0, (t) => {
                        t.paths = (t.paths || []).map((t, s) => (s === e ? { ...t, active: !(!1 !== t.active) } : t));
                      });
                  },
                  toggleTitle: !1 === t.active ? "تفعيل المسار" : "تعطيل المسار",
                  canEdit: !1,
                  edit: () => {},
                  name: (t.code ? t.code + " — " : "") + (t.name || "مسار") + " · " + (ge[t.type] || ge.in).label,
                  meta: [
                    "two" === t.dir ? "اتجاهان" : "اتجاه واحد",
                    ue[t.line || "dash"] || "متصل",
                    !1 === t.active ? "معطّل" : "مفعّل",
                  ].join(" · "),
                  color: ke(t),
                }))
              : qs;
    const Rn = (s.regQ || "").trim().toLowerCase();
    Rn &&
      (jn = KIVO.BassamFind.filter(Rn, jn, (t) => [
        t.name,
        t.meta,
        t.code,
        t.type,
      ]));
    const Gn = s.regOpen || {},
      Zn = [],
      Hn = {};
    jn.forEach((t) => {
      (void 0 === t.showAct && (t.showAct = !0), void 0 === t.showDens && (t.showDens = !1));
      const e = t.gk || "غير محدّد";
      (Hn[e] || ((Hn[e] = []), Zn.push(e)), Hn[e].push(t));
    });
    const Yn = Zn.map((t) => {
        const e = Hn[t],
          s = Te + "|" + ("zones" === Te ? Js : "-") + "|" + t,
          n = !!Gn[s];
        return {
          label: t,
          count: String(e.length),
          rows: e,
          color: (e[0] && e[0].color) || "#cbd5e1",
          open: n,
          closed: !n,
          chev: "transition:transform .15s;flex-shrink:0" + (n ? ";transform:rotate(180deg)" : ""),
          toggle: () => this.setState({ regOpen: { ...(this.state.regOpen || {}), [s]: !n } }),
        };
      }),
      Kn = !(!this.props || -1 === ["kpiDaily", "kpiOcc", "kpiZones"].indexOf(this.props.solo)),
      Un = Kn && this._dsTabOn("kpiDaily"),
      Xn = Kn && this._dsTabOn("kpiOcc"),
      Jn = Kn && this._dsTabOn("kpiZones"),
      Vn =
        this._dsTabOn("rounds") && (this.bsLensOn("zones") || this.bsLensOn("gates") || this.bsLensOn("marks") || this.bsLensOn("paths")),
      qn = (() => {
        try {
          const t = KIVO.BassamPerm;
          return !t || !t.can || !!t.can("dreport", "view");
        } catch (t) {
          return !0;
        }
      })(),
      TKn = (() => {
        try {
          const t = KIVO.BassamPerm;
          return !t || !t.can || !!t.can("tasks", "view");
        } catch (t) {
          return !0;
        }
      })(),
      Qn = Un || Xn || Jn,
      _n = this.props && -1 !== ["kpiDaily", "kpiOcc", "kpiZones"].indexOf(this.props.solo) ? this.props.solo : "";
    let $n = _n || "kpi" === s.dsTab ? "kpi" : "dreport" === s.dsTab ? "dreport" : "tasks" === s.dsTab ? "tasks" : "rounds";
    ("kpi" !== $n || Qn || ($n = qn ? "dreport" : Vn ? "rounds" : "tasks"),
      "dreport" !== $n || qn || ($n = Qn ? "kpi" : Vn ? "rounds" : "tasks"),
      "rounds" !== $n || Vn || ($n = Qn ? "kpi" : qn ? "dreport" : TKn ? "tasks" : "rounds"),
      "tasks" !== $n || TKn || ($n = Qn ? "kpi" : qn ? "dreport" : "rounds"));
    /* الموجة 1 · DG-08: الانتقالُ للألوان والظلّ وحدها — لا يُحرَّك العرضُ والحشوةُ حين تنطبق قواعدُ الشريط (كان يُحرّك 204→140px على الجوال فيقفز الشريط) */
    const ti = (t) =>
        "position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 16px;border-radius:12px;transition:background-color .3s,border-color .3s,color .3s,box-shadow .3s;flex-shrink:0;min-width:170px;cursor:pointer;font-family:'Cairo',sans-serif;border:1px solid " +
        (t
          ? "rgba(185,151,81,0.45);background:var(--bg-xffffff);box-shadow:0 3px 10px -4px rgba(138,111,53,0.45)"
          : "transparent;background:transparent"),
      ei = (t) =>
        "width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;transition:background-color .3s,color .3s;" +
        (t ? "background:var(--bg-a185151810p1);color:var(--fg-xb99751)" : "background:var(--bg-a2452452450p9);color:var(--fg-x94a3b8)"),
      si = (t) =>
        "font-size:12px;transition:color .3s;" +
        (t ? "font-weight:600;color:var(--fg-xb99751)" : "font-weight:400;color:var(--fg-x53565a)"),
      ni = {
        dsOnKpi: "kpi" === $n,
        dsOnRounds: "rounds" === $n,
        dsOnDr: "dreport" === $n,
        dsOnTasks: "tasks" === $n,
        dsTasksTabStyle: ti("tasks" === $n),
        dsTasksTabIcon: ei("tasks" === $n),
        dsTasksTabLbl: si("tasks" === $n),
        dsGoTasks: () => this.setState({ dsTab: "tasks" }),
        dsTasksTabShow: TKn,
        dsKpiTabStyle: ti("kpi" === $n),
        dsKpiTabIcon: ei("kpi" === $n),
        dsKpiTabLbl: si("kpi" === $n),
        dsRoundsTabStyle: ti("rounds" === $n),
        dsRoundsTabIcon: ei("rounds" === $n),
        dsRoundsTabLbl: si("rounds" === $n),
        dsDrTabStyle: ti("dreport" === $n),
        dsDrTabIcon: ei("dreport" === $n),
        dsDrTabLbl: si("dreport" === $n),
        dsGoKpi: () => this.setState({ dsTab: "kpi" }),
        dsGoRounds: () => this.setState({ dsTab: "rounds" }),
        dsGoDr: () => this.setState({ dsTab: "dreport" }),
        dsKpiTabShow: Qn,
        dsRoundsTabShow: Vn,
        dsDrTabShow: qn,
        dsTabBarShow: !_n && (Qn ? 1 : 0) + (Vn ? 1 : 0) + (qn ? 1 : 0) + (TKn ? 1 : 0) > 1,
        dsPmNoteOn: "rounds" === $n,
      };
    return (
      "kpi" === $n && Object.assign(ni, this._dsKpiVals()),
      {
        ...ni,
        regQ: s.regQ || "",
        onRegQ: (t) => this.setState({ regQ: t.target.value }),
        ...(() => {
          const t = s.dsGateFly,
            e = KIVO.BassamField,
            n = t && t.kind && e && -1 !== e.KINDS.indexOf(t.kind) ? t.kind : "gates",
            i = "gates" === n ? pe : (((R && R.d) || [])[f] || {})[n] || [];
          if (!t || !i[t.i]) return { dsGateFlyOn: !1 };
          const o = i[t.i];
          return {
            dsGateFlyOn: !0,
            dsGateFlyName:
              "gates" === n
                ? (o.num ? "#" + o.num + " — " : "") + (o.label || o.name || "باب")
                : e
                  ? e.label(o, n)
                  : o.code || o.label || "موقع",
            dsGateFlyMeta: (() => {
              try {
                const t = KIVO.BassamField;
                if (!t) return "";
                const e = t.offOf(o, n),
                  s = t.stateOf(o, n),
                  i = t.flowOn(n) && this.bsLensOn("paths") ? t.flowOf(o) : "",
                  r = [t.STATES[s].t];
                (e && o.cWhy && r.push(o.cWhy),
                  i && "closed" !== s && r.push(t.FLOWS[i].a + " " + t.FLOWS[i].t),
                  o.fAt ? r.push(t.clock(o.fAt) + " · " + t.ageTxt(o)) : e && o.cAt && r.push(o.cAt));
                const a = o.fBy || o.cBy || "";
                return (a && r.push("رصد " + a), r.filter(Boolean).join(" · "));
              } catch (t) {
                return "";
              }
            })(),
            dsGateFlyColor: (() => {
              try {
                const t = KIVO.BassamField;
                return t ? t.STATES[t.stateOf(o, n)].c : "#16a34a";
              } catch (t) {
                return "#16a34a";
              }
            })(),
            dsGateFlyCanAct: Q && "gates" === n,
            dsGateFlyOnNow: "gates" === n && !o.closed,
            dsGateFlyOffNow: "gates" === n && KIVO.BassamLeaf.closedOf(pe, o),
            dsGateFlyStyle:
              "position:absolute;left:" +
              t.left +
              "px;top:" +
              t.top +
              "px;z-index:35;background:var(--bg-xffffff);border:1px solid var(--bd-xe6e8eb);border-radius:11px;box-shadow:var(--shadow-elevated);padding:9px 11px;min-width:180px;max-width:250px;text-align:right",
            dsGateFlyClose: () => this.setState({ dsGateFly: null }),
            dsGateFlyToggle: (e) => {
              e && e.stopPropagation && e.stopPropagation();
              const s = t.i,
                n = pe[s] || {};
              if (Q) {
                if (!KIVO.BassamLeaf.closedOf(pe, n)) {
                  let t = "00",
                    e = "00";
                  try {
                    const s = (t) => (t < 10 ? "0" : "") + t,
                      n = new Date();
                    ((t = s(n.getHours())), (e = s(n.getMinutes())));
                  } catch (t) {}
                  return void this.setState({ gClose: { idx: [s], why: "", h: t, m: e, dd: null }, dsGateFly: null });
                }
                (this._updRoundAt(this.state.floor >= 0 ? this.state.floor : 0, (t) => {
                  const e = this._leafIdx(t.gates, [s]);
                  t.gates = (t.gates || []).map((t, s) => (e.indexOf(s) < 0 ? t : this._fdOpen(t)));
                }),
                  this.setState({ dsGateFly: null }));
              }
            },
          };
        })(),
        ...(this._fdV9 = this._fdView(s, R, pe, f, Q)),
        regGroups: Yn,
        regEmpty: 0 === Yn.length,
        months: b,
        days: k,
        floors: ht,
        mapZones: (() =>
          tt && _ && this.bsLensOn("zones")
            ? (_.zones || []).map((t, e) => {
                const n = s.dsZoneTmp && s.dsZoneTmp.i === e ? { ...t, ...s.dsZoneTmp.z } : t,
                  i = ct(n.d),
                  o = "zones" === s.lens && ((r = e), "zone" === l && a.indexOf(r) >= 0);
                var r;
                const d = !(!s.flash || "zone" !== s.flash.t || s.flash.i !== e),
                  p = !!n.off && ("zones" === s.lens || "density" === s.lens || "dist" === s.lens),
                  h = n.zcat ? (String(n.ztype || "").trim() ? String(n.ztype).trim() + " · " + n.zcat : n.zcat) : "",
                  c = h && ft[h] && ft[h].f ? ft[h] : n.zcat && ft[n.zcat] && ft[n.zcat].f ? ft[n.zcat] : null,
                  g = "zones" !== s.lens || p ? null : c,
                  f = ks.on && "zones" === ks.kind ? ks.stateOf(n) : null,
                  u = (() => {
                    try {
                      const t = KIVO.BassamField;
                      if (!t || (!n.fAt && !n.off)) return null;
                      const e = t.stateOf(n, "zones");
                      return "open" === e ? null : t.STATES[e];
                    } catch (t) {
                      return null;
                    }
                  })(),
                  y = !(!f || !ks.filter || f.st === ks.filter);
                return {
                  d: n.d,
                  code: n.code || "",
                  down: (t) => {
                    if ("gates" === this.state.lens) return;
                    if (!this._dsCanEditZones() || "select" !== this.state.tool) return;
                    t && t.stopPropagation && t.stopPropagation();
                    const s = t && (t.ctrlKey || t.metaKey),
                      i = this._dsEvtPt(t),
                      o = this._dsPtsHs(n.d);
                    (this._pickSel("zone", e, s),
                      s || this.setState({ zdrag: { i: e, sx: i.x, sy: i.y, pts: o.pts, hs: o.hs, z: n }, dsPan: null }));
                  },
                  click: (t) => {
                    if ("gates" === this.state.lens) return;
                    const s = this._dsCanEditZones() && "select" === this.state.tool;
                    if (this._dsCanEditZones())
                      return (
                        t && t.stopPropagation && t.stopPropagation(),
                        void (s || this._dsDragged || this._pickSel("zone", e, t && (t.ctrlKey || t.metaKey)))
                      );
                    U && !J && (this._dsDragged || this._pickSel("zone", e, t && (t.ctrlKey || t.metaKey)));
                  },
                  cur: yt && "select" === s.tool ? "move" : J ? "default" : "pointer",
                  enter: () => {
                    "gates" !== this.state.lens && this.state.dsHovZ !== e && this.setState({ dsHovZ: e });
                  },
                  leave: () => {
                    this.state.dsHovZ === e && this.setState({ dsHovZ: null });
                  },
                  lx: String(Math.round(i[0])),
                  ly: String(Math.round(i[1])),
                  ly2: String(Math.round(i[1]) + 18),
                  fill: u
                    ? u.bg
                    : "gates" === s.lens || "marks" === s.lens
                      ? "#94a3b8"
                      : "density" === s.lens
                        ? gt(n.count, n.off)
                        : "zones" !== s.lens || s.dsAsn
                          ? f
                            ? "non" === f.st
                              ? "#ffffff"
                              : f.color
                            : n.off
                              ? "#94a3b8"
                              : (n.emp || []).length
                                ? "#22c55e"
                                : "#ef4444"
                          : p
                            ? "#94a3b8"
                            : g
                              ? g.h && "none" !== g.h
                                ? "url(#bsZpD" + ut.indexOf(h && ft[h] ? h : n.zcat) + ")"
                                : g.f
                              : C[n.cat] || "#94a3b8",
                  fo: d
                    ? "0.9"
                    : f
                      ? y
                        ? "0.08"
                        : "non" === f.st
                          ? "0.6"
                          : "0.42"
                      : p
                        ? "0.45"
                        : g
                          ? String((null != g.o ? g.o : 50) / 100)
                          : "0.45",
                  zstroke: d || o ? "#b99751" : u ? u.c : f ? ("non" === f.st ? "#94a3b8" : f.color) : p ? "#000000" : g ? g.s : "#334155",
                  zsw: (() => {
                    const t = s.dview.w / 1e3,
                      e = g ? +g.bw || 1 : 0.7;
                    return String((d ? Math.max(3, e + 2.4) : o ? e + 0.5 : e) * t);
                  })(),
                  zdash: (() => {
                    const t = s.dview.w / 1e3;
                    if (!g) return String(3.5 * t) + " " + String(2.5 * t);
                    const e = g.bs || "dash";
                    return "solid" === e
                      ? "none"
                      : "dot" === e
                        ? String(0.9 * t) + " " + String(3.4 * t)
                        : String(6 * t) + " " + String(4 * t);
                  })(),
                  zlc: g && "dot" === g.bs ? "round" : "butt",
                  zso: d || o ? "1" : p || g ? "0.7" : "0.6",
                  meta: f
                    ? f.closed
                      ? "معطّل"
                      : f.lbl || f.c + "/" + f.need
                    : "density" === s.lens
                      ? this.bsLensOn("dens") && null != n.count
                        ? n.count + "%"
                        : "—"
                      : "zones" === s.lens
                        ? D[n.cat] || "مصلى"
                        : this.bsLensOn("dist")
                          ? KIVO.BassamCount((n.emp || []).length, "موظف") + ""
                          : "",
                };
              })
            : [])(),
        dsZoneLabelNodes: kt,
        dsPreviewNode: vt,
        dsHandleNodes: wt,
        dsCanDraw: yt,
        dsMarksBarOn: xt,
        planSyncOpen: () => {
          if (!Q) return void this.bsToast("الجولة غير قابلة للتعديل الآن", "warn");
          const t = this._planSyncPreview(
            ((t) => {
              try {
                return KIVO.BassamRound && KIVO.BassamRound.lensFilter ? KIVO.BassamRound.lensFilter(t) : t;
              } catch (e) {
                return t;
              }
            })(P),
            U,
          );
          t
            ? this.setState({ planSync: { ...t, mName: this.MONTHS[s.month - 1] || "", dayIdx: m } })
            : this.bsToast("لا يوجد تشغيل ميداني لهذا الشهر يُحدَّث منه", "warn");
        },
        dsCanDrawBar: !(!U || J || q || !this._dsCanWrite() || "zones" !== s.lens || s.dsAsn || !this.bsLensOn("zones")),
        dsGateBarOnBar: !(!U || J || q || !this._dsCanWrite() || "gates" !== s.lens || s.dsAsn || !this.bsLensOn("gates")),
        dsMarksBarOnBar: !(!U || J || q || !this._dsCanWrite() || "marks" !== s.lens || s.dsAsn || !this.bsLensOn("marks")),
        dsRoOn:
          !!U &&
          (J || q || !this._dsCanWrite()) &&
          !s.dsAsn &&
          "density" !== s.lens,
        dsRoText: (() => {
          const L = this._dsLockInfo();
          return L.locked ? L.text : "الجولة معتمدة — عرض فقط";
        })(),
        dsToolsToggleTitle: s.dsToolsOpen
          ? "طيّ شريط الأدوات"
          : "إظهار شريط الأدوات",
        dsToolsOpenOn: !!s.dsToolsOpen,
        dsToolsToggle: () =>
          this.setState((t) => ({ dsToolsOpen: !t.dsToolsOpen })),
        dsToolsChevron:
          "transition:transform .2s;" +
          (s.dsToolsOpen ? "transform:rotate(180deg)" : ""),
        ...(() => {
          const t = (t) =>
              "width:32px;height:32px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;font-family:'Cairo',sans-serif;box-sizing:border-box;border:2px solid " +
              (t
                ? "#b99751;background:var(--bg-a185151810p1);color:var(--fg-x9a7e40)"
                : "transparent;background:transparent;color:var(--fg-x475569)"),
            e = (t) => () => {
              (this.setState({
                tool: t,
                draft: null,
                dsPolyPts: [],
                dsPolyCursor: null,
                dsSel: "select" === t ? this.state.dsSel : null,
                selMulti: "select" === t ? this.state.selMulti : [],
              }),
                "path" !== t ||
                  $ ||
                  this._updRoundAt(this.state.floor >= 0 ? this.state.floor : 0, (t) => {
                    t.hidePaths = !1;
                  }));
            };
          return {
            dsToolSelect: e("select"),
            dsTSelStyle: t("select" === s.tool),
            ...(() => {
              const t = { poly: "حر", rect: "مستطيل", square: "مربع", circle: "دائرة" },
                n = !!t[s.tool],
                i = n ? s.tool : s.dsLastShape || "poly",
                o = (t) =>
                  "width:32px;height:32px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;font-family:'Cairo',sans-serif;box-sizing:border-box;position:relative;border:2px solid " +
                  (t
                    ? "#b99751;background:var(--bg-a185151810p1);color:var(--fg-x9a7e40)"
                    : "transparent;background:transparent;color:var(--fg-x475569)"),
                r = (t) =>
                  "position:absolute;bottom:1px;left:1px;line-height:0;opacity:" +
                  (t ? ".85" : ".45") +
                  ";color:inherit;pointer-events:none",
                a = (t) => {
                  try {
                    const e = t.currentTarget.getBoundingClientRect();
                    return { t: e.top, l: e.right, rl: e.left };
                  } catch (t) {
                    return { t: 0, l: 0, rl: 0 };
                  }
                },
                l = (t, e) => {
                  if (!t) return "display:none";
                  const s = "undefined" != typeof window ? window.innerWidth : 1200,
                    n = t.l + 6 + e > s ? Math.max(4, t.rl - 6 - e) : t.l + 6;
                  return (
                    "position:fixed;top:" +
                    Math.round(t.t) +
                    "px;left:" +
                    Math.round(n) +
                    "px;z-index:2147483000;display:flex;gap:3px;background:var(--bg-xffffff);border:1px solid var(--bd-a185151810p35);border-radius:10px;padding:3px;box-shadow:var(--shadow-elevated)"
                  );
                },
                d = (t) => () => {
                  (this.setState({ dsLastShape: t, dsShapeFly: null }), e(t)());
                };
              return {
                dsClearToggle: (t) => this.setState({ dsClear2: s.dsClear2 ? null : a(t), dsShapeFly: null }),
                dsClearBtnStyle: o(!!s.dsClear2),
                dsClearChevStyle: r(!!s.dsClear2),
                dsClearFlyOpen: !!s.dsClear2,
                dsClearFlyStyle: l(s.dsClear2, 116),
                dsShapeBtnStyle: o(n),
                dsShapeChevStyle: r(n),
                dsShapeTitle: "رسم " + t[i] + " — والمثلث يفتح بقية الأشكال",
                dsShapeFlyOpen: !!s.dsShapeFly,
                dsShapeFlyStyle: l(s.dsShapeFly, 150),
                dsShapeToggle: (t) => this.setState({ dsShapeFly: s.dsShapeFly ? null : a(t) }),
                dsShapeIsPoly: "poly" === i,
                dsShapeIsRect: "rect" === i,
                dsShapeIsSquare: "square" === i,
                dsShapeIsCircle: "circle" === i,
                dsPickPoly: d("poly"),
                dsPickRect: d("rect"),
                dsPickSquare: d("square"),
                dsPickCircle: d("circle"),
                dsTitlePoly: "رسم حر",
                dsTitleRect: "رسم مستطيل",
                dsTitleSquare: "رسم مربع",
                dsTitleCircle: "رسم دائرة",
              };
            })(),
            dsTPolyStyle: t("poly" === s.tool),
            dsTRectStyle: t("rect" === s.tool),
            dsTSquareStyle: t("square" === s.tool),
            dsTCircleStyle: t("circle" === s.tool),
            dsToolPath: () => {
              this.bsLensOn("paths") && e("path")();
            },
            dsTPathStyle: t("path" === s.tool),
            dsToolMark: () => {
              this.bsLensOn("marks") && e("mark")();
            },
            dsTMarkStyle: t("mark" === s.tool),
            lzPaths: this.bsLensOn("paths"),
            lzGates: this.bsLensOn("gates"),
            lzMarks: this.bsLensOn("marks"),
            lzDist: this.bsLensOn("dist"),
            lzDens: this.bsLensOn("dens"),
            lzZones: this.bsLensOn("zones"),
            dsClearZonesAsk: () => {
              const t = ((_ && _.zones) || []).length;
              t && this.setState({ dsClear: { n: t, k: "zones" }, dsClear2: null });
            },
            dsClearPathsAsk: () => {
              const t = ((_ && _.paths) || []).length;
              t && this.setState({ dsClear: { n: t, k: "paths" }, dsClear2: null });
            },
            dsClearGatesAsk: () => {
              const t = ((_ && _.gates) || []).length;
              t && this.setState({ dsClear: { n: t, k: "gates" }, dsClear2: null });
            },
            dsLayPaths: $,
            dsLayZones: tt,
            dsEyePaths: r("paths"),
            dsEyeZones: r("zones"),
            dsEyePathsLabel: $ ? "إخفاء المسارات" : "إظهار المسارات",
            dsEyeZonesLabel: tt ? "إخفاء المصليات" : "إظهار المصليات",
            dsEyePathsRow: o($),
            dsEyeZonesRow: o(tt),
            dsEyePathsIcon: $ ? n : i,
            dsEyeZonesIcon: tt ? n : i,
            dsClearOn: !!s.dsClear,
            dsClearMsg: s.dsClear
              ? "سيتم مسح " +
                s.dsClear.n +
                " " +
                ("paths" === s.dsClear.k ? "مسار" : "مصلى") +
                " من هذا الموقع في جولة اليوم فقط — الخطة التشغيلية المعتمدة لا تتأثر. ويمكن التراجع عن المسح بـ Ctrl+Z."
              : "",
            dsClearDo: () => {
              const t = (s.dsClear && s.dsClear.k) || "zones";
              (this._updRound((e) => {
                e[t] = [];
              }),
                this.setState({ dsClear: null, dsSel: null, selMulti: [], dsHovZ: null, dsZoneTmp: null }));
            },
            dsClearCancel: () => this.setState({ dsClear: null }),
            dsHistUndoDo: () => this.dsHistUndo(),
            dsHistRedoDo: () => this.dsHistRedo(),
            dsHistUndoTitle: (this._dsUndo || []).length
              ? "تراجع (Ctrl+Z) — " + KIVO.BassamCount((this._dsUndo || []).length, "خطوة|متاحة") + ""
              : "لا يوجد ما يُتراجع عنه",
            dsHistRedoTitle: (this._dsRedo || []).length
              ? "إعادة (Ctrl+Shift+Z) — " + KIVO.BassamCount((this._dsRedo || []).length, "خطوة") + ""
              : "لا يوجد ما يُعاد",
            dsHistUndoStyle:
              "width:32px;height:28px;border-radius:9px;border:0;display:flex;align-items:center;justify-content:center;transition:all .15s;background:transparent;" +
              ((this._dsUndo || []).length ? "color:var(--fg-x475569);cursor:pointer" : "color:var(--fg-xcbd5e1);cursor:default"),
            dsHistRedoStyle:
              "width:32px;height:28px;border-radius:9px;border:0;display:flex;align-items:center;justify-content:center;transition:all .15s;background:transparent;" +
              ((this._dsRedo || []).length ? "color:var(--fg-x475569);cursor:pointer" : "color:var(--fg-xcbd5e1);cursor:default"),
          };
        })(),
        stopClick: (t) => {
          t && t.stopPropagation && t.stopPropagation();
        },
        pEditOn: !!s.pEdit,
        peName: s.pEdit ? s.pEdit.name : "",
        onPeName: (t) =>
          this.setState({
            pEdit: { ...this.state.pEdit, name: t.target.value },
          }),
        peCode: (s.pEdit && s.pEdit.code) || "",
        onPeCode: (t) =>
          this.setState({
            pEdit: { ...this.state.pEdit, code: t.target.value },
          }),
        peTypeLabel: s.pEdit ? (ge[s.pEdit.type || "in"] || ge.in).label : "",
        peHeadStyle: (() => {
          const t = s.pEdit ? (!1 === s.pEdit.active ? "#94a3b8" : (ge[s.pEdit.type || "in"] || ge.in).c) : "#b99751";
          return (
            "width:42px;height:42px;border-radius:13px;display:flex;align-items:center;justify-content:center;color:var(--fg-xffffff);box-shadow:0 4px 12px " +
            t +
            "40;background:linear-gradient(135deg," +
            t +
            "," +
            t +
            "cc)"
          );
        })(),
        peBadgeStyle:
          "display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 9px;border-radius:9999px;font-size:10px;font-weight:600;font-family:'Cairo',sans-serif;" +
          (s.pEdit && !1 === s.pEdit.active
            ? "background:var(--bg-xf1f5f9);color:var(--fg-x64748b);border:1px solid var(--bd-xe2e8f0)"
            : "background:var(--bg-a161851290p1);color:var(--fg-x047857);border:1px solid var(--bd-a161851290p25)"),
        peBadgeText: s.pEdit && !1 === s.pEdit.active ? "معطّل" : "مفعّل",
        pePreview: (() => {
          const t = s.pEdit;
          if (!t) return null;
          const e = ((_ || {}).paths || [])[t.i];
          if (!e) return null;
          const n = e.pts || [];
          if (n.length < 2) return null;
          const i = n.map((t) => t.x),
            o = n.map((t) => t.y),
            r = Math.min.apply(null, i),
            a = Math.max.apply(null, i),
            l = Math.min.apply(null, o),
            d = Math.max.apply(null, o),
            p = Math.min(268 / Math.max(a - r, 1), 42 / Math.max(d - l, 1)),
            h = (300 - (a - r) * p) / 2,
            c = (74 - (d - l) * p) / 2,
            g = n.map((t) => ({ x: (t.x - r) * p + h, y: (t.y - l) * p + c })),
            f = !1 !== t.active,
            u = f ? (ge[t.type || "in"] || ge.in).c : "#94a3b8",
            y = fe[t.w] || fe.normal,
            m = y,
            x = g.map((t) => t.x + "," + t.y).join(" ");
          return React.createElement(
            "svg",
            { viewBox: "0 0 300 74", width: "100%", height: 74, preserveAspectRatio: "xMidYMid meet", style: { display: "block" } },
            React.createElement("polyline", {
              points: x,
              fill: "none",
              stroke: u,
              strokeWidth: m,
              strokeLinecap: "round",
              strokeLinejoin: "round",
              strokeDasharray: ye(t.line, 1, y),
              opacity: f ? 1 : 0.6,
            }),
            Se({ anim: t.anim, active: t.active }, x, m, 1, "pvf"),
            we(g, 1, u, t.dir, "pv_"),
          );
        })(),
        peTypes: me.map((t) => {
          const e = !(!s.pEdit || (s.pEdit.type || "in") !== t),
            n = ge[t].c;
          return {
            label: ge[t].label,
            dot: "width:9px;height:9px;border-radius:9999px;flex-shrink:0;background:" + n,
            click: () => this.setState({ pEdit: { ...this.state.pEdit, type: t } }),
            style:
              "flex:1;height:36px;display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:10px;font-size:11.5px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif;transition:all .15s;border:1px solid " +
              (e
                ? n + ";background:" + n + "14;color:" + n + ";box-shadow:0 1px 4px " + n + "26"
                : "#E1E1E1;background:var(--bg-xffffff);color:var(--fg-x64748b)"),
          };
        }),
        peLines: be.map((t) => {
          const e = !(!s.pEdit || (s.pEdit.line || "dash") !== t[0]);
          return {
            label: t[1],
            click: () => this.setState({ pEdit: { ...this.state.pEdit, line: t[0] } }),
            sample: "display:block;width:34px;height:0;border-top:2.5px " + t[2] + " " + (e ? "#b99751" : "#94a3b8"),
            style:
              "flex:1;height:44px;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border-radius:10px;font-size:10.5px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif;transition:all .15s;border:1px solid " +
              (e
                ? "#b99751;background:var(--bg-a185151810p06);color:var(--fg-x9a7e40)"
                : "#E1E1E1;background:var(--bg-xffffff);color:var(--fg-x64748b)"),
          };
        }),
        peWidths: xe.map((t) => {
          const e = !(!s.pEdit || (s.pEdit.w || "thin") !== t[0]);
          return {
            label: t[1],
            click: () => this.setState({ pEdit: { ...this.state.pEdit, w: t[0] } }),
            sample: "display:block;width:34px;height:0;border-top:" + 0.8 * fe[t[0]] + "px solid " + (e ? "#b99751" : "#94a3b8"),
            style:
              "flex:1;height:44px;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border-radius:10px;font-size:10.5px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif;transition:all .15s;border:1px solid " +
              (e
                ? "#b99751;background:var(--bg-a185151810p06);color:var(--fg-x9a7e40)"
                : "#E1E1E1;background:var(--bg-xffffff);color:var(--fg-x64748b)"),
          };
        }),
        peDirText:
          s.pEdit && "two" === s.pEdit.dir ? "اتجاهان ⇄" : "اتجاه واحد →",
        peDirColor: s.pEdit && "two" === s.pEdit.dir ? "#047857" : "#94a3b8",
        peToggleDir: () =>
          this.setState({ pEdit: { ...this.state.pEdit, dir: this.state.pEdit && "two" === this.state.pEdit.dir ? "fwd" : "two" } }),
        peDirStyle:
          "position:relative;display:inline-block;width:36px;height:20px;border-radius:9999px;transition:all .2s;vertical-align:middle;" +
          (s.pEdit && "two" === s.pEdit.dir
            ? "background:linear-gradient(135deg,var(--bg-xe6d29d),var(--bg-xb99751))"
            : "background:var(--bg-xd7dce2)"),
        peDirKnob:
          "position:absolute;top:2px;width:16px;height:16px;border-radius:9999px;background:var(--bg-xffffff);box-shadow:0 1px 3px rgba(0,0,0,0.25);transition:all .2s;" +
          (s.pEdit && "two" === s.pEdit.dir ? "right:18px" : "right:2px"),
        peActiveText: s.pEdit && !1 === s.pEdit.active ? "معطّل" : "مفعّل",
        peActiveColor: s.pEdit && !1 === s.pEdit.active ? "#94a3b8" : "#047857",
        peToggleActive: () =>
          this.setState({ pEdit: { ...this.state.pEdit, active: !(this.state.pEdit && !1 !== this.state.pEdit.active) } }),
        peActiveStyle:
          "position:relative;display:inline-block;width:36px;height:20px;border-radius:9999px;transition:all .2s;vertical-align:middle;" +
          (s.pEdit && !1 === s.pEdit.active
            ? "background:var(--bg-xd7dce2)"
            : "background:linear-gradient(135deg,var(--bg-x6ee7b7),var(--bg-x10b981))"),
        peActiveKnob:
          "position:absolute;top:2px;width:16px;height:16px;border-radius:9999px;background:var(--bg-xffffff);box-shadow:0 1px 3px rgba(0,0,0,0.25);transition:all .2s;" +
          (s.pEdit && !1 === s.pEdit.active ? "right:2px" : "right:18px"),
        peAnimText: s.pEdit && !1 === s.pEdit.anim ? "ساكن" : "متحرك",
        peAnimColor: s.pEdit && !1 === s.pEdit.anim ? "#94a3b8" : "#9A7E40",
        peToggleAnim: () => this.setState({ pEdit: { ...this.state.pEdit, anim: !(this.state.pEdit && !1 !== this.state.pEdit.anim) } }),
        peAnimStyle:
          "position:relative;display:inline-block;width:36px;height:20px;border-radius:9999px;transition:all .2s;vertical-align:middle;" +
          (s.pEdit && !1 === s.pEdit.anim
            ? "background:var(--bg-xd7dce2)"
            : "background:linear-gradient(135deg,var(--bg-xe6d29d),var(--bg-xb99751))"),
        peAnimKnob:
          "position:absolute;top:2px;width:16px;height:16px;border-radius:9999px;background:var(--bg-xffffff);box-shadow:0 1px 3px rgba(0,0,0,0.25);transition:all .2s;" +
          (s.pEdit && !1 === s.pEdit.anim ? "right:2px" : "right:18px"),
        peLabelText: s.pEdit && s.pEdit.hideLabel ? "مخفي" : "ظاهر",
        peLabelColor: s.pEdit && s.pEdit.hideLabel ? "#94a3b8" : "#047857",
        peToggleLabel: () =>
          this.setState({ pEdit: { ...this.state.pEdit, hideLabel: !(this.state.pEdit && this.state.pEdit.hideLabel) } }),
        peLabelStyle:
          "position:relative;display:inline-block;width:36px;height:20px;border-radius:9999px;transition:all .2s;vertical-align:middle;" +
          (s.pEdit && s.pEdit.hideLabel
            ? "background:var(--bg-xd7dce2)"
            : "background:linear-gradient(135deg,var(--bg-xe6d29d),var(--bg-xb99751))"),
        peLabelKnob:
          "position:absolute;top:2px;width:16px;height:16px;border-radius:9999px;background:var(--bg-xffffff);box-shadow:0 1px 3px rgba(0,0,0,0.25);transition:all .2s;" +
          (s.pEdit && s.pEdit.hideLabel ? "right:2px" : "right:18px"),
        ...KIVO.BassamCount.pair(
          "pePointCount",
          s.pEdit ? String(((((_ || {}).paths || [])[s.pEdit.i] || {}).pts || []).length) : "0",
          "نقطة",
        ),
        peReverse: () => {
          const t = this.state.pEdit;
          if (!t) return;
          const e = t.type || "in",
            s = "in" === e ? "out" : "out" === e ? "in" : e;
          (this._updRound((e) => {
            const n = (e.paths || [])[t.i];
            n && ((n.pts = (n.pts || []).slice().reverse()), (n.type = s));
          }),
            this.setState({ pEdit: { ...t, type: s } }));
        },
        peCancel: () => this._dsClosePathEditor(),
        peDelete: () => {
          const t = this.state.pEdit;
          t &&
            (this._updRound((e) => {
              Array.isArray(e.paths) && e.paths.splice(t.i, 1);
            }),
            this.setState({ dsSel: null, selMulti: [], pEdit: null, dsPathTmp: null }));
        },
        peDeleteOn: !(s.pEdit && s.pEdit.isNew),
        peSave: () => this._dsSavePathEdit(),
        onPeKey: (t) => {
          "Enter" === t.key && (t.preventDefault(), this._dsSavePathEdit());
        },
        peTitle: s.pEdit && s.pEdit.isNew ? "مسار جديد" : "بيانات المسار",
        peSubTail: s.pEdit && s.pEdit.isNew ? "سمِّه واختر نوعه · «إلغاء» يلغي الرسمة" : "نقرة مزدوجة على أي مسار تفتح هذه النافذة",
        mkEditOn: !!s.mkEdit,
        mkLabel: s.mkEdit ? s.mkEdit.label : "",
        onMkLabel: (t) =>
          this.setState({
            mkEdit: { ...this.state.mkEdit, label: t.target.value },
          }),
        mkKinds: (() => {
          const t = this._markKinds(),
            e = (s.mkEdit && s.mkEdit.kind) || "",
            n = t.map((t) => ({ v: t, sel: t === e }));
          return (n.unshift({ v: "", sel: !e, none: !0 }), n.map((t) => ({ val: t.v, txt: t.none ? "— بلا نوع —" : t.v, sel: t.sel })));
        })(),
        onMkKind: (t) =>
          this.setState({
            mkEdit: { ...this.state.mkEdit, kind: t.target.value },
          }),
        mkNewKind: (s.mkEdit && s.mkEdit.newKind) || "",
        onMkNewKind: (t) =>
          this.setState({
            mkEdit: { ...this.state.mkEdit, newKind: t.target.value },
          }),
        mkAddKind: async () => {
          const t = this.state.mkEdit;
          if (!t || !(t.newKind || "").trim()) return;
          const e = t.newKind.trim();
          if (await this._addMarkKind(e))
            this.setState({ mkEdit: { ...t, kind: e, newKind: "" } });
        },
        ...(() => {
          const t = s.mkEdit,
            e = (t && _ && (_.marks || [])[t.i]) || null,
            n = e
              ? Zt.map((t) => ({
                  name: Xt[t.name] || t.name,
                  full: t.name,
                  val: String(KIVO.BassamNeed.of(e, t.name)),
                  own: !(!e.needS || null == e.needS[t.name]),
                  color: t.color,
                })).filter((t) => +t.val > 0)
              : [];
          return {
            mkNeedRead: n.map((t) => ({
              name: t.name,
              val: t.val,
              dot: "width:7px;height:7px;border-radius:9999px;flex-shrink:0;background:" + t.color,
              chipStyle:
                "display:inline-flex;align-items:center;gap:4px;font-size:9.5px;font-weight:600;color:var(--fg-x53565a);background:var(--bg-xffffff);border:1px solid " +
                t.color +
                (t.own ? "aa" : "44") +
                ";border-radius:9999px;padding:1.5px 8px;line-height:1.7;font-feature-settings:'tnum'",
            })),
            mkNeedNone: 0 === n.length,
            mkNeedTotRead: String(e ? KIVO.BassamNeed.tot(e, Zt) : 0),
          };
        })(),
        mkHideLabel: !!s.mkEdit && !!s.mkEdit.hideLabel,
        mkToggleLabel: () => this.setState({ mkEdit: { ...this.state.mkEdit, hideLabel: !this.state.mkEdit.hideLabel } }),
        mkOffTxt:
          s.mkEdit && s.mkEdit.off
            ? "معطّل — اضغط للتفعيل"
            : "مفعّل — اضغط للتعطيل",
        mkOffStyle:
          s.mkEdit && s.mkEdit.off
            ? "height:30px;padding:0 12px;border-radius:8px;border:1px solid var(--bd-a22038380p4);background:var(--bg-a22038380p07);color:var(--fg-xb91c1c);font-size:10px;font-weight:600;cursor:pointer;font-family:'Cairo',sans-serif"
            : "height:30px;padding:0 12px;border-radius:8px;border:1px solid var(--bd-a0163870p35);background:var(--bg-a0163870p06);color:var(--fg-x047857);font-size:10px;font-weight:600;cursor:pointer;font-family:'Cairo',sans-serif",
        mkToggleOff: () =>
          this.setState({
            mkEdit: { ...this.state.mkEdit, off: !this.state.mkEdit.off },
          }),
        mkSave: () => this.saveMarkEdit(),
        mkCancel: () => this.closeMarkEditorDS(),
        mkStop: (t) => {
          t && t.stopPropagation && t.stopPropagation();
        },
        mkDelete: () => {
          const t = (this.state.mkEdit || {}).i;
          null != t && this.removeMarkAt(t);
        },
        zEditOn: !!s.zEdit,
        ...(() => {
          const t = s.zEdit || {},
            e = React.createElement,
            n = (t.ser || "").trim() || "00";
          return {
            zeTitle: t.isNew ? "بيانات المصلى الجديد" : "تعديل بيانات المصلى",
            zeCodePreview: s.zEdit ? this._composeZoneCode(t.region, t.level, n, null, t.ztype) : "",
            zeSer: null != t.ser ? t.ser : "",
            onZeSer: (t) => this.setState({ zEdit: { ...this.state.zEdit, ser: t.target.value.replace(/[^0-9]/g, "").slice(0, 3) } }),
            onZeKey: (t) => {
              "Enter" === t.key && (t.preventDefault(), this.saveZoneEdit());
            },
            zeToggleLabel: () => this.setState({ zEdit: { ...this.state.zEdit, hideLabel: !this.state.zEdit.hideLabel } }),
            zeEyeTitle: t.hideLabel ? "الرمز مخفي على الخريطة — اضغط لإظهاره" : "الرمز ظاهر على الخريطة — اضغط لإخفائه",
            zeEyeColor: t.hideLabel ? "#94a3b8" : "#9A7E40",
            zeEyeSlash: t.hideLabel ? "M2 2 22 22" : "",
            zeSave: () => this.saveZoneEdit(),
            zeCancel: () => this.closeZoneEditorDS(),
            zeDelete: () => {
              const t = (this.state.zEdit || {}).i;
              null != t && this.removeZoneAt(t);
            },
            zeStop: (t) => {
              t && t.stopPropagation && t.stopPropagation();
            },
            zeFieldsNode: s.zEdit
              ? (() => {
                  const n = (t, s, n, i, o) => {
                      const r = this.zcatStyleOf(t, o);
                      if (!r) return null;
                      const a = "bsZsD" + i,
                        l = r.h && "none" !== r.h,
                        d = 0.65,
                        p = s - 1.85,
                        h = n - 1.85,
                        c = r.bs || "dash";
                      let g = "none";
                      if ("solid" !== c) {
                        const t = 2 * (p + h) - 28 + 2 * Math.PI * 3.5;
                        if ("dot" === c) {
                          const e = t / Math.max(6, Math.round(t / 5));
                          g = (1.15 * d).toFixed(2) + " " + (e - 1.15 * d).toFixed(2);
                        } else {
                          const e = t / Math.max(4, Math.round(t / 8.4));
                          g = (0.66 * e).toFixed(2) + " " + (0.34 * e).toFixed(2);
                        }
                      }
                      return e(
                        "svg",
                        { width: s, height: n, viewBox: "0 0 " + s + " " + n, style: { flexShrink: 0, overflow: "visible" } },
                        l ? this._mkHatchPattern(a, r, "sp") : null,
                        e("rect", {
                          x: 0.925,
                          y: 0.925,
                          width: p,
                          height: h,
                          rx: 3.5,
                          fill: l ? "url(#" + a + ")" : r.f,
                          fillOpacity: (null != r.o ? r.o : 50) / 100,
                          stroke: r.s,
                          strokeWidth: d,
                          strokeDasharray: g,
                          strokeLinecap: "dot" === c ? "round" : "butt",
                          strokeLinejoin: "round",
                        }),
                      );
                    },
                    i = e(
                      "svg",
                      {
                        width: 12,
                        height: 12,
                        viewBox: "0 0 24 24",
                        fill: "none",
                        stroke: "currentColor",
                        strokeWidth: 2,
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                      },
                      e("path", { d: "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" }),
                    ),
                    o = e(
                      "svg",
                      {
                        width: 12,
                        height: 12,
                        viewBox: "0 0 24 24",
                        fill: "none",
                        stroke: "currentColor",
                        strokeWidth: 2,
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                      },
                      e("path", { d: "M3 6h18" }),
                      e("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" }),
                    ),
                    r = (t) =>
                      e(
                        "svg",
                        {
                          width: 13,
                          height: 13,
                          viewBox: "0 0 24 24",
                          fill: "none",
                          stroke: "currentColor",
                          strokeWidth: 2.4,
                          strokeLinecap: "round",
                          strokeLinejoin: "round",
                          style: { flexShrink: 0, transition: "transform .2s", transform: t ? "rotate(180deg)" : "none", opacity: 0.55 },
                        },
                        e("path", { d: "m6 9 6 6 6-6" }),
                      ),
                    a = (a, l, d, p) => {
                      const h = this.zoneOptList(a),
                        c = (t.region || "").trim(),
                        g = (t.ztype || "").trim(),
                        f = h
                          .map((t, e) => ({ o: t, oi: e }))
                          .filter((t) => "level" !== a || !(t.o && t.o.r) || t.o.r === c)
                          .filter((t) => "zcat" !== a || this._catFitsType(t.o, g)),
                        u = s.zDd === a,
                        y = s.zDdEdit && s.zDdEdit.key === a,
                        m = t[a] || "",
                        x =
                          ("level" === a &&
                            (h.find((t) => this._optName(t) === m && t && t.r === c) ||
                              h.find((t) => this._optName(t) === m && !(t && t.r)))) ||
                          h.find((t) => this._optName(t) === m),
                        b = p ? this._optCode(x) : "",
                        k = (t) =>
                          e(
                            "span",
                            {
                              dir: "ltr",
                              style: {
                                fontFamily: "'Cairo',sans-serif",
                                fontFeatureSettings: "'tnum'",
                                fontSize: 10,
                                fontWeight: 400,
                                color: "var(--fg-x9a7e40)",
                                flexShrink: 0,
                              },
                            },
                            "#" + t,
                          ),
                        v = f.map((s) => {
                          const r = s.o,
                            l = s.oi,
                            d = this._optName(r),
                            h = this._optCode(r),
                            c = t[a] === d,
                            g = ((t, e) => {
                              let s = 0;
                              return (
                                ((_ && _.zones) || []).forEach((n) => {
                                  n[t] === e && s++;
                                }),
                                s
                              );
                            })(a, d);
                          return e(
                            "div",
                            {
                              key: "o" + l,
                              onClick: () =>
                                this.setState((t) => {
                                  const e = t.zEdit || {},
                                    s = c ? "" : d,
                                    n = { ...e, [a]: s };
                                  if ("region" === a) {
                                    const t = (e.level || "").trim();
                                    t &&
                                      !this.zoneOptList("level").some((e) => !(this._optName(e) !== t || (e && e.r && e.r !== s))) &&
                                      (n.level = "");
                                  }
                                  if ("ztype" === a) {
                                    const t = (e.zcat || "").trim();
                                    t &&
                                      !this.zoneOptList("zcat").some((e) => this._optName(e) === t && this._catFitsType(e, s)) &&
                                      (n.zcat = "");
                                  }
                                  return { zEdit: n, zDd: null };
                                }),
                              style: {
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "6px 8px",
                                borderRadius: 7,
                                cursor: "pointer",
                                fontSize: 11,
                                fontFamily: "'Cairo',sans-serif",
                                transition: "background .15s",
                                background: c ? "var(--bg-a185151810p1)" : "transparent",
                                fontWeight: c ? 800 : 400,
                                color: c ? "var(--fg-x9a7e40)" : "var(--fg-x25343f)",
                              },
                            },
                            "zcat" === a ? n(d, 26, 15, "r" + l, (t.ztype || "").trim()) : null,
                            p && h ? k(h) : null,
                            e(
                              "span",
                              { style: { flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } },
                              d,
                            ),
                            "zcat" === a
                              ? e(
                                  "button",
                                  {
                                    title: "تنسيق الفئة — لون وحدود وشفافية وتهشير",
                                    onClick: (e) => {
                                      e.stopPropagation();
                                      const s = (t.ztype || "").trim(),
                                        n = this.zcatStyleOf(d, s) || {};
                                      this.setState({
                                        zcs: {
                                          name: d,
                                          zt: s,
                                          f: n.f || "#22c55e",
                                          s: n.s || this._darken(n.f || "#22c55e"),
                                          sAuto: null == n.sAuto ? !n.s : !!n.sAuto,
                                          o: null != n.o ? n.o : 50,
                                          bs: n.bs || "dash",
                                          bw: null != n.bw ? n.bw : 1,
                                          h: n.h || "none",
                                          hc: n.hc || n.s || "#000000",
                                          hw: null != n.hw ? n.hw : 0.3,
                                          hg: null != n.hg ? n.hg : 1.6,
                                        },
                                        zDd: null,
                                        zDdEdit: null,
                                        zDdEditT: null,
                                      });
                                    },
                                    style: {
                                      width: 22,
                                      height: 22,
                                      borderRadius: 6,
                                      border: 0,
                                      background: "transparent",
                                      color: "var(--fg-xb99751)",
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      flexShrink: 0,
                                    },
                                  },
                                  e(
                                    "svg",
                                    {
                                      width: 12,
                                      height: 12,
                                      viewBox: "0 0 24 24",
                                      fill: "none",
                                      stroke: "currentColor",
                                      strokeWidth: 2,
                                      strokeLinecap: "round",
                                      strokeLinejoin: "round",
                                    },
                                    e("path", {
                                      d: "M12 22a10 10 0 1 1 10-10c0 2-1.2 3-3 3h-2.6a2.4 2.4 0 0 0-1.8 4c.4.5.6.9.6 1.3a1.7 1.7 0 0 1-1.7 1.7Z",
                                    }),
                                    e("circle", { cx: 7.5, cy: 10.5, r: 0.5 }),
                                    e("circle", { cx: 12, cy: 7, r: 0.5 }),
                                    e("circle", { cx: 16.5, cy: 10.5, r: 0.5 }),
                                  ),
                                )
                              : null,
                            e(
                              "button",
                              {
                                title: "تعديل",
                                onClick: (t) => {
                                  (t.stopPropagation(),
                                    this.setState({
                                      zDdEdit: { key: a, idx: l, was: d },
                                      zDdEditVal: d,
                                      zDdEditC: h,
                                      zDdEditT: (this._optCats(r) || []).slice(),
                                    }));
                                },
                                style: {
                                  width: 22,
                                  height: 22,
                                  borderRadius: 6,
                                  border: 0,
                                  background: "transparent",
                                  color: "var(--fg-x94a3b8)",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                },
                              },
                              i,
                            ),
                            e(
                              "button",
                              {
                                title: g
                                  ? "حذف نهائي — سيُزال من " +
                                    KIVO.BassamCount(g, "مصلى", "g") +
                                    " " +
                                    KIVO.BassamCount.agr(g, "يستعمله", "يستعملانه", "تستعمله")
                                  : "حذف",
                                onClick: (t) => {
                                  (t.stopPropagation(), this.delZoneOpt(a, l));
                                },
                                style: {
                                  width: 22,
                                  height: 22,
                                  borderRadius: 6,
                                  border: 0,
                                  background: "transparent",
                                  color: "var(--fg-xcbd5e1)",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                },
                              },
                              o,
                            ),
                          );
                        }),
                        w = {
                          position: "absolute",
                          top: "100%",
                          right: 0,
                          left: 0,
                          zIndex: 45,
                          marginTop: 4,
                          background: "var(--bg-xffffff)",
                          border: "1px solid var(--bd-a185151810p35)",
                          borderRadius: 10,
                          boxShadow: "0 12px 30px -8px rgba(0,0,0,0.30)",
                        },
                        S =
                          "level" !== a || c
                            ? "level" === a && c
                              ? "لا أدوار بعد لمنطقة «" + c + "» — أضف أول دور من الحقل أدناه"
                              : "لا خيارات بعد — أضف أول خيار من الحقل أدناه"
                            : "اختر المنطقة أولاً — قائمة الأدوار / المستويات تتبع المنطقة المختارة",
                        A = y
                          ? e(
                              "div",
                              { "data-bs-editable-menu": "", style: { ...w, zIndex: 46, padding: 10, display: "flex", flexDirection: "column", gap: 8 } },
                              e("div", { style: { fontSize: 11, fontWeight: 600, color: "var(--fg-x9a7e40)" } }, "تعديل الخيار"),
                              e("input", {
                                placeholder: "الاسم",
                                value: s.zDdEditVal || "",
                                onChange: (t) => this.setState({ zDdEditVal: t.target.value }),
                                onKeyDown: (t) => {
                                  "Enter" === t.key && (t.preventDefault(), this.saveZoneOptEdit());
                                },
                                style: {
                                  height: 30,
                                  border: "1px solid var(--bd-xe1e1e1)",
                                  borderRadius: 8,
                                  padding: "0 8px",
                                  fontSize: 11.5,
                                  outline: "none",
                                  fontFamily: "'Cairo',sans-serif",
                                  boxSizing: "border-box",
                                },
                              }),
                              "ztype" === a
                                ? e(
                                    "div",
                                    { style: { display: "flex", flexDirection: "column", gap: 5 } },
                                    e("span", { style: { fontSize: 10, fontWeight: 400, color: "var(--fg-x53565a)" } }, "فئات هذا النوع"),
                                    e(
                                      "div",
                                      { style: { display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 92, overflowY: "auto" } },
                                      this.zoneOptList("zcat").map((t, n) => {
                                        const i = this._optName(t),
                                          o = Array.isArray(s.zDdEditT) ? s.zDdEditT : [],
                                          r = o.indexOf(i) >= 0;
                                        return e(
                                          "button",
                                          {
                                            key: "ct" + n,
                                            onClick: (t) => {
                                              t.stopPropagation();
                                              const e = o.slice(),
                                                s = e.indexOf(i);
                                              (s >= 0 ? e.splice(s, 1) : e.push(i), this.setState({ zDdEditT: e }));
                                            },
                                            style: {
                                              fontSize: 10,
                                              fontWeight: 400,
                                              fontFamily: "'Cairo',sans-serif",
                                              padding: "4px 9px",
                                              borderRadius: 9999,
                                              cursor: "pointer",
                                              border: "1px solid " + (r ? "var(--bd-a185151810p5)" : "var(--bd-a2252252250p9)"),
                                              background: r ? "var(--bg-a185151810p12)" : "var(--bg-xffffff)",
                                              color: r ? "var(--fg-x9a7e40)" : "var(--fg-x94a3b8)",
                                            },
                                          },
                                          i,
                                        );
                                      }),
                                    ),
                                    e(
                                      "span",
                                      { style: { fontSize: 9, color: "var(--fg-x94a3b8)", lineHeight: 1.6 } },
                                      "بلا اختيار = كل الفئات تظهر مع هذا النوع",
                                    ),
                                  )
                                : null,
                              p
                                ? e(
                                    "div",
                                    { style: { display: "flex", alignItems: "center", gap: 6 } },
                                    e(
                                      "span",
                                      { style: { fontSize: 10, fontWeight: 400, color: "var(--fg-x53565a)", flex: 1 } },
                                      "الرمز (حرف أو رقم)",
                                    ),
                                    e("input", {
                                      dir: "ltr",
                                      placeholder: "1",
                                      value: s.zDdEditC || "",
                                      onChange: (t) => this.setState({ zDdEditC: this._codeSan(t.target.value) }),
                                      onKeyDown: (t) => {
                                        "Enter" === t.key && (t.preventDefault(), this.saveZoneOptEdit());
                                      },
                                      style: {
                                        width: 70,
                                        height: 30,
                                        border: "1px solid var(--bd-xe1e1e1)",
                                        borderRadius: 8,
                                        padding: "0 6px",
                                        fontSize: 11.5,
                                        outline: "none",
                                        fontFamily: "'Cairo',sans-serif",
                                        fontFeatureSettings: "'tnum'",
                                        textAlign: "center",
                                        boxSizing: "border-box",
                                      },
                                    }),
                                  )
                                : null,
                              e(
                                "span",
                                { style: { fontSize: 9, color: "var(--fg-x94a3b8)", lineHeight: 1.6 } },
                                "level" === a
                                  ? "الدور تابع لمنطقته — التعديل يسري على مواقع هذه المنطقة فقط"
                                  : "التعديل يسري على كل المناطق التي تستعمل هذا الخيار",
                              ),
                              e(
                                "div",
                                { style: { display: "flex", gap: 6 } },
                                e(
                                  "button",
                                  {
                                    onClick: () => this.saveZoneOptEdit(),
                                    style: {
                                      flex: 1,
                                      height: 29,
                                      borderRadius: 8,
                                      border: 0,
                                      background: "var(--bg-xb99751)",
                                      color: "var(--fg-xffffff)",
                                      fontSize: 11.5,
                                      fontWeight: 400,
                                      cursor: "pointer",
                                      fontFamily: "'Cairo',sans-serif",
                                    },
                                  },
                                  "حفظ",
                                ),
                                e(
                                  "button",
                                  {
                                    onClick: () => this.setState({ zDdEdit: null, zDdEditT: null }),
                                    style: {
                                      height: 29,
                                      padding: "0 12px",
                                      borderRadius: 8,
                                      border: "1px solid var(--bd-xe1e1e1)",
                                      background: "var(--bg-xffffff)",
                                      color: "var(--fg-x141414)",
                                      fontSize: 11.5,
                                      fontWeight: 400,
                                      cursor: "pointer",
                                      fontFamily: "'Cairo',sans-serif",
                                    },
                                  },
                                  "إلغاء",
                                ),
                              ),
                            )
                          : u
                            ? e(
                                "div",
                                { "data-bs-editable-menu": "", style: { ...w, overflow: "hidden" } },
                                e(
                                  "div",
                                  { style: { maxHeight: 150, overflowY: "auto", padding: 4 } },
                                  v.length
                                    ? v
                                    : e(
                                        "div",
                                        {
                                          style: {
                                            fontSize: 10,
                                            color: "var(--fg-x94a3b8)",
                                            padding: "10px 8px",
                                            textAlign: "center",
                                            lineHeight: 1.7,
                                          },
                                        },
                                        S,
                                      ),
                                ),
                                e(
                                  "div",
                                  {
                                    style: {
                                      display: "flex",
                                      gap: 5,
                                      padding: 6,
                                      borderTop: "1px solid var(--bd-xf1f5f9)",
                                      background: "var(--bg-xfafafa)",
                                    },
                                  },
                                  e("input", {
                                    value: s.zDdNew || "",
                                    onChange: (t) => this.setState({ zDdNew: t.target.value }),
                                    onKeyDown: (t) => {
                                      "Enter" === t.key && (t.preventDefault(), this.addZoneOpt(a));
                                    },
                                    placeholder: "خيار جديد...",
                                    style: {
                                      flex: 1,
                                      minWidth: 0,
                                      height: 28,
                                      border: "1px solid var(--bd-xe1e1e1)",
                                      borderRadius: 7,
                                      padding: "0 8px",
                                      fontSize: 11,
                                      outline: "none",
                                      fontFamily: "'Cairo',sans-serif",
                                      boxSizing: "border-box",
                                    },
                                  }),
                                  p
                                    ? e("input", {
                                        dir: "ltr",
                                        value: s.zDdNewC || "",
                                        onChange: (t) => this.setState({ zDdNewC: this._codeSan(t.target.value) }),
                                        onKeyDown: (t) => {
                                          "Enter" === t.key && (t.preventDefault(), this.addZoneOpt(a));
                                        },
                                        placeholder: "رمز",
                                        title: "رمز الخيار",
                                        style: {
                                          width: 46,
                                          height: 28,
                                          border: "1px solid var(--bd-xe1e1e1)",
                                          borderRadius: 7,
                                          padding: "0 5px",
                                          fontSize: 11,
                                          outline: "none",
                                          fontFamily: "'Cairo',sans-serif",
                                          fontFeatureSettings: "'tnum'",
                                          textAlign: "center",
                                          boxSizing: "border-box",
                                        },
                                      })
                                    : null,
                                  e(
                                    "button",
                                    {
                                      title: "إضافة",
                                      onClick: () => this.addZoneOpt(a),
                                      style: {
                                        width: 28,
                                        height: 28,
                                        borderRadius: 7,
                                        border: 0,
                                        background: "var(--bg-xb99751)",
                                        color: "var(--fg-xffffff)",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                      },
                                    },
                                    e(
                                      "svg",
                                      {
                                        width: 13,
                                        height: 13,
                                        viewBox: "0 0 24 24",
                                        fill: "none",
                                        stroke: "currentColor",
                                        strokeWidth: 2.4,
                                        strokeLinecap: "round",
                                        strokeLinejoin: "round",
                                      },
                                      e("path", { d: "M5 12h14" }),
                                      e("path", { d: "M12 5v14" }),
                                    ),
                                  ),
                                ),
                              )
                            : null;
                      return e(
                        "div",
                        { key: a, style: { position: "relative", minWidth: 0 } },
                        e(
                          "label",
                          { style: { fontSize: 11, fontWeight: 400, color: "var(--fg-x374151)", display: "block", marginBottom: 5 } },
                          l,
                        ),
                        e(
                          "button",
                          {
                            onClick: () => this.setState({ zDd: u ? null : a, zDdEdit: null, zDdEditT: null, zDdNew: "" }),
                            style: {
                              width: "100%",
                              height: 34,
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "0 10px",
                              borderRadius: 8,
                              border: "1px solid " + (u || y ? "var(--bd-xb99751)" : "var(--bd-xe1e1e1)"),
                              background: "var(--bg-xffffff)",
                              cursor: "pointer",
                              fontFamily: "'Cairo',sans-serif",
                              fontSize: 11.5,
                              fontWeight: 400,
                              color: m ? "var(--fg-x141414)" : "var(--fg-x94a3b8)",
                              boxSizing: "border-box",
                            },
                          },
                          "zcat" === a && m ? n(m, 26, 15, "b", (t.ztype || "").trim()) : null,
                          p && m && b ? k(b) : null,
                          e(
                            "span",
                            {
                              style: {
                                flex: 1,
                                minWidth: 0,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                textAlign: "right",
                              },
                            },
                            m || d,
                          ),
                          r(u),
                        ),
                        A,
                      );
                    },
                    l = !!t.off,
                    d = e(
                      "div",
                      {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          borderRadius: 10,
                          padding: "9px 12px",
                          background: l ? "var(--bg-a1001161390p07)" : "var(--bg-a22163740p06)",
                          border: "1px solid " + (l ? "var(--bd-a1001161390p3)" : "var(--bd-a22163740p3)"),
                        },
                      },
                      e("span", { style: { fontSize: 11, fontWeight: 400, color: "var(--fg-x374151)" } }, "الحالة"),
                      e(
                        "button",
                        {
                          onClick: () => this.setState({ zEdit: { ...this.state.zEdit, off: !l } }),
                          style: {
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            background: "transparent",
                            border: 0,
                            cursor: "pointer",
                            fontFamily: "'Cairo',sans-serif",
                            padding: 0,
                          },
                        },
                        e(
                          "span",
                          { style: { fontSize: 11, fontWeight: 600, color: l ? "var(--fg-x64748b)" : "var(--fg-x047857)" } },
                          l ? "معطّلة" : "مفعّلة",
                        ),
                        e(
                          "span",
                          {
                            style: {
                              position: "relative",
                              display: "inline-block",
                              width: 36,
                              height: 20,
                              borderRadius: 9999,
                              transition: "all .2s",
                              verticalAlign: "middle",
                              background: l ? "var(--bg-xd7dce2)" : "linear-gradient(135deg,#4ade80,#16a34a)",
                            },
                          },
                          e("span", {
                            style: {
                              position: "absolute",
                              top: 2,
                              width: 16,
                              height: 16,
                              borderRadius: 9999,
                              background: "var(--bg-xffffff)",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                              transition: "all .2s",
                              right: l ? 2 : 18,
                            },
                          }),
                        ),
                      ),
                    ),
                    p = (() => {
                      const s = (e) => "" === String(null == t[e] ? "" : t[e]).trim(),
                        n = (s, n, i, o) =>
                          e("input", {
                            dir: "ltr",
                            type: "number",
                            min: n,
                            max: i,
                            step: o,
                            value: null == t[s] ? "" : t[s],
                            placeholder: "تلقائي",
                            onChange: (t) => {
                              const e = t.target.value;
                              this.setState((t) => ({ zEdit: { ...(t.zEdit || {}), [s]: e } }));
                            },
                            style: {
                              flex: 1,
                              minWidth: 0,
                              height: 34,
                              border: "1px solid var(--bd-xe1e1e1)",
                              borderRadius: 8,
                              padding: "0 8px",
                              fontSize: 12,
                              outline: "none",
                              fontFamily: "'Cairo',sans-serif",
                              fontFeatureSettings: "'tnum'",
                              textAlign: "center",
                              boxSizing: "border-box",
                            },
                          }),
                        i = (t) =>
                          e(
                            "button",
                            {
                              title: "إعادة إلى الحساب التلقائي",
                              onClick: () => this.setState((e) => ({ zEdit: { ...(e.zEdit || {}), [t]: "" } })),
                              style: {
                                height: 34,
                                padding: "0 9px",
                                borderRadius: 8,
                                border: "1px solid " + (s(t) ? "var(--bd-a185151810p45)" : "var(--bd-xe1e1e1)"),
                                background: s(t) ? "var(--bg-a185151810p1)" : "var(--bg-xffffff)",
                                color: s(t) ? "var(--fg-x9a7e40)" : "var(--fg-x94a3b8)",
                                fontSize: 10,
                                fontWeight: 600,
                                cursor: "pointer",
                                fontFamily: "'Cairo',sans-serif",
                                flexShrink: 0,
                              },
                            },
                            "تلقائي",
                          ),
                        o = (t, s, o, r, a) =>
                          e(
                            "div",
                            { style: { minWidth: 0 } },
                            e(
                              "label",
                              { style: { fontSize: 11, fontWeight: 400, color: "var(--fg-x374151)", display: "block", marginBottom: 5 } },
                              s,
                            ),
                            e("div", { style: { display: "flex", gap: 5 } }, n(t, o, r, a), i(t)),
                          );
                      return e(
                        "div",
                        {
                          style: {
                            borderRadius: 10,
                            padding: "10px 12px",
                            background: "var(--bg-a185151810p05)",
                            border: "1px solid var(--bd-a185151810p25)",
                          },
                        },
                        e(
                          "div",
                          { style: { fontSize: 11, fontWeight: 600, color: "var(--fg-x9a7e40)", marginBottom: 8 } },
                          "رمز المصلى على الخريطة",
                        ),
                        e(
                          "div",
                          { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } },
                          o("lsz", "حجم الخط (4–40)", 4, 40, 0.5),
                          o("lang", "الدوران (°)", -360, 360, 1),
                        ),
                        e(
                          "div",
                          { style: { fontSize: 9.5, color: "var(--fg-x94a3b8)", marginTop: 6, lineHeight: 1.7 } },
                          "«تلقائي» = الحجم يُحسب ليتّسع داخل الشكل والدوران يتبع لفّه — والرقم يثبّته يدوياً. التعديل هنا على جولة اليوم فقط.",
                        ),
                      );
                    })();
                  return e(
                    "div",
                    { id: "bsZeDds", style: { display: "flex", flexDirection: "column", gap: 12 } },
                    e(
                      "div",
                      { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } },
                      (() => {
                        const n = "yard" === s.zDd,
                          i = t.yard || "",
                          o = i ? this.gateLocColor(i) : null,
                          a = (t) =>
                            e("span", {
                              style: {
                                width: 9,
                                height: 9,
                                borderRadius: 9999,
                                flexShrink: 0,
                                background: t || "var(--bg-xe2e8f0)",
                                border: t ? "0" : "1px solid #cbd5e1",
                              },
                            }),
                          l = this.GATE_LOCS.map((t, s) => {
                            const n = t[0],
                              o = t[1],
                              r = i === n;
                            return e(
                              "div",
                              {
                                key: "y" + s,
                                onClick: () => this.setState((t) => ({ zEdit: { ...(t.zEdit || {}), yard: r ? "" : n }, zDd: null })),
                                style: {
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  padding: "7px 9px",
                                  borderRadius: 8,
                                  cursor: "pointer",
                                  fontSize: 12,
                                  fontWeight: r ? 800 : 600,
                                  fontFamily: "'Cairo',sans-serif",
                                  background: r ? "var(--bg-a185151810p1)" : "transparent",
                                  color: r ? "var(--fg-x9a7e40)" : "var(--fg-x141414)",
                                },
                              },
                              a(o),
                              e("span", { style: { flex: 1 } }, n),
                            );
                          });
                        return (
                          l.push(
                            e(
                              "div",
                              {
                                key: "ynone",
                                onClick: () => this.setState((t) => ({ zEdit: { ...(t.zEdit || {}), yard: "" }, zDd: null })),
                                style: {
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  padding: "7px 9px",
                                  borderRadius: 8,
                                  cursor: "pointer",
                                  fontSize: 12,
                                  fontWeight: i ? 600 : 800,
                                  fontFamily: "'Cairo',sans-serif",
                                  background: i ? "transparent" : "var(--bg-a185151810p1)",
                                  color: i ? "var(--fg-x64748b)" : "var(--fg-x9a7e40)",
                                  borderTop: "1px solid var(--bd-xf1f5f9)",
                                  marginTop: 3,
                                  paddingTop: 9,
                                },
                              },
                              a(null),
                              e("span", { style: { flex: 1 } }, "بلا ساحة"),
                            ),
                          ),
                          e(
                            "div",
                            { style: { display: "flex", flexDirection: "column", gap: 5 } },
                            e("label", { style: { fontSize: 11, fontWeight: 400, color: "var(--fg-x374151)" } }, "الساحة"),
                            e(
                              "div",
                              { style: { position: "relative" } },
                              e(
                                "button",
                                {
                                  onClick: (t) => {
                                    (t.stopPropagation(),
                                      this.setState({ zDd: n ? null : "yard", zDdEdit: null, zDdEditT: null, zDdNew: "" }));
                                  },
                                  style: {
                                    width: "100%",
                                    height: 34,
                                    border: "1px solid " + (n ? "var(--bd-xb99751)" : "var(--bd-xe1e1e1)"),
                                    borderRadius: 8,
                                    padding: "0 10px",
                                    fontSize: 11.5,
                                    fontWeight: 400,
                                    fontFamily: "'Cairo',sans-serif",
                                    background: "var(--bg-xffffff)",
                                    cursor: "pointer",
                                    boxSizing: "border-box",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 7,
                                    color: i ? "var(--fg-x141414)" : "var(--fg-x94a3b8)",
                                    textAlign: "right",
                                  },
                                },
                                a(o),
                                e(
                                  "span",
                                  {
                                    style: {
                                      flex: 1,
                                      minWidth: 0,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      textAlign: "right",
                                    },
                                  },
                                  i || "اختر الساحة...",
                                ),
                                r(n),
                              ),
                              n
                                ? e(
                                    "div",
                                    {
                                      className: "bs-optmenu",
                                      style: {
                                        position: "absolute",
                                        top: "100%",
                                        right: 0,
                                        left: 0,
                                        zIndex: 45,
                                        marginTop: 4,
                                        background: "var(--bg-xffffff)",
                                        border: "1px solid var(--bd-a185151810p35)",
                                        borderRadius: 10,
                                        boxShadow: "0 12px 30px -8px rgba(0,0,0,0.30)",
                                        padding: 4,
                                      },
                                    },
                                    l,
                                  )
                                : null,
                            ),
                          )
                        );
                      })(),
                      a("region", "المنطقة", "اختر / أضف...", !0),
                      a("level", "الدور / المستوى", "اختر / أضف...", !0),
                      a("ztype", "النوع", "اختر / أضف...", !0),
                      a("zcat", "الفئة", "اختر / أضف...", !1),
                    ),
                    d,
                    p,
                  );
                })()
              : null,
          };
        })(),
        isZonesLens: Pe.length > 1,
        isDensityLens: zt,
        registryTitle:
          "dist" === Te
            ? "سجل التسكين"
            : "gates" === Te && "dsum" === s.gateDim
              ? "سجل تسكين الأبواب"
              : "zones" === Te && "dsum" === s.brkDim
                ? "سجل تسكين المصليات"
                : "marks" === Te && "dsum" === s.markDim
                  ? "سجل تسكين المعالم"
                  : "gates" === Te
                    ? "سجل الأبواب"
                    : "marks" === Te
                      ? "سجل المعالم"
                      : "dens" === Te
                        ? "سجل الكثافات"
                        : "paths" === Te
                          ? "سجل المسارات"
                          : "سجل المصليات",
        lensZones: () =>
          this.setState({
            lens: "zones",
            panelTab: "zones",
            brkDim: this.state.dsAsn ? "dsum" : "summary",
            tool: "select",
            draft: null,
            dsPolyPts: [],
            dsPolyCursor: null,
            dsHovZ: null,
            dsHovG: null,
            dsSel: null,
            selMulti: [],
            zassign: null,
            zdens: null,
          }),
        lensGates: () =>
          this.setState({
            lens: "gates",
            panelTab: "gates",
            gateDim: this.state.dsAsn ? "dsum" : "summary",
            tool: "select",
            draft: null,
            dsPolyPts: [],
            dsPolyCursor: null,
            dsHovZ: null,
            dsHovG: null,
            dsSel: null,
            selMulti: [],
            zassign: null,
            zdens: null,
          }),
        lensMarks: () => {
          this.bsLensOn("marks") &&
            this.setState({
              lens: "marks",
              panelTab: "marks",
              markDim: this.state.dsAsn ? "dsum" : "summary",
              tool: "select",
              draft: null,
              dsPolyPts: [],
              dsPolyCursor: null,
              dsHovZ: null,
              dsHovG: null,
              dsSel: null,
              selMulti: [],
              zassign: null,
              zdens: null,
            });
        },
        lensDist: () => {
          this.bsLensOn("dist") &&
            this.setState({
              lens: "dist",
              panelTab: "dist",
              distDim: "summary",
              dsHovZ: null,
              dsHovG: null,
              dsSel: null,
              selMulti: [],
              zassign: null,
              zdens: null,
            });
        },
        lensDensity: () => {
          this.bsLensOn("dens") &&
            this.setState({
              lens: "density",
              panelTab: "dens",
              densDim: "summary",
              dsHovZ: null,
              dsHovG: null,
              dsSel: null,
              selMulti: [],
              zassign: null,
              zdens: null,
            });
        },
        lensZonesStyle: St(!At && !Et && !Mt),
        lensMarksStyle: St(Mt),
        lensGatesStyle: St(Et),
        lensDistStyle: St(At),
        lensDensityStyle: St(zt),
        canFilterDist: (At || Ot) && !J,
        dsDistBarOn: At || Ot,
        dsZTogOn:
          ("zones" === s.lens || "density" === s.lens) && this.bsLensOn("zones") && (this.bsLensOn("dist") || this.bsLensOn("dens")),
        zAsnDistOn: this.bsLensOn("dist"),
        dsGTogOn: Et && this.bsLensOn("dist"),
        dsMTogOn: Mt && this.bsLensOn("dist"),
        dsAsnOpGo: () => {
          const t = this.state.lens,
            e = {
              lens: "density" === t ? "zones" : t,
              dsAsn: !1,
              dsSel: null,
              selMulti: [],
              panelTab: "gates" === t ? "gates" : "marks" === t ? "marks" : "zones",
            };
          ((e["gates" === t ? "gateDim" : "marks" === t ? "markDim" : "brkDim"] = "summary"), this.setState(e));
        },
        dsAsnAsnGo: () => {
          if (!this.bsLensOn("dist")) return;
          const t = this.state.lens,
            e = {
              lens: "density" === t ? "zones" : t,
              dsAsn: !0,
              dsSel: null,
              selMulti: [],
              panelTab: "gates" === t ? "gates" : "marks" === t ? "marks" : "zones",
            };
          ((e["gates" === t ? "gateDim" : "marks" === t ? "markDim" : "brkDim"] = "cov"), this.setState(e));
        },
        dsAsnOpStyle: St(!s.dsAsn && "density" !== s.lens),
        dsAsnAsnStyle: St(!!s.dsAsn && "density" !== s.lens),
        zDensModeStyle: St("density" === s.lens),
        ...(() => {
          const t = [
              ["zones", "المصليات", "مصلى", "المصلى"],
              ["marks", "المعالم", "معلم", "المعلم"],
              ["gates", "الأبواب", "باب", "الباب"],
            ]
              .filter((t) => this.bsLensOn(t[0]))
              .filter((t) => "dist" === s.lens || t[0] === ("gates" === s.lens ? "gates" : "marks" === s.lens ? "marks" : "zones")),
            e = (() => {
              if (!t.length) return null;
              const e = (s.needTbl && s.needTbl.kind) || "";
              return t.some((t) => t[0] === e) ? t.find((t) => t[0] === e) : t[0];
            })(),
            n = String((s.needTbl && s.needTbl.q) || ""),
            i = ((F || [])[f] || {}).name || "الموقع",
            o = { men: "مصلى رجال", women: "مصلى نساء", service: "منطقة خدمات" },
            r = (t) =>
              "width:100%;height:29px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;font-feature-settings:'tnum';box-sizing:border-box;" +
              (t
                ? "border:1px solid var(--bd-a185151810p65);background:var(--bg-a185151810p07);color:var(--fg-x9a7e40)"
                : "border:1px solid var(--bd-xefefef);background:var(--bg-xfbfbfb);color:var(--fg-xb6bbc0)"),
            a = _ || {},
            l = e ? e[0] : "zones",
            d = e ? e[1] : "",
            p = e ? e[3] : "";
          let h = ((e && a[l]) || []).map((t, e) => {
            const s =
                "gates" === l
                  ? ("" !== (t.num || "") ? "#" + t.num + " — " : "") + (t.label || t.name || "باب")
                  : "marks" === l
                    ? t.label || t.name || "معلم"
                    : (t.code ? t.code + " — " : "") + (t.name || "مصلى"),
              n = "zones" === l ? o[t.cat] || t.ztype || "مصلى" : t.kind || "بلا نوع",
              i = "gates" === l ? !!t.closed : !!t.off;
            return { i: e, el: t, name: s, meta: n, dead: i, deadTxt: i ? ("gates" === l ? "مغلق" : "معطّل") : "" };
          });
          n && (h = KIVO.BassamFind.filter(n, h, (t) => [t.name, t.meta]));
          const c = h.map((t) => {
              const e = ((t) => {
                  const e = parseInt(String(null == t ? "" : t).trim(), 10);
                  return e > 0 ? e : 0;
                })(t.el.needN),
                s = t.el.needS || {};
              return {
                name: t.name,
                meta: t.meta + (t.dead ? " · " + t.deadTxt : ""),
                nameStyle:
                  "flex:1;min-width:190px;display:flex;flex-direction:column;gap:1px;padding:0 8px 0 4px;min-width:0" +
                  (t.dead ? ";opacity:.55" : ""),
                base: e ? String(e) : "—",
                baseStyle: r(!!e),
                cells: Zt.map((e) => {
                  const n = null != s[e.name],
                    i = KIVO.BassamNeed.of(t.el, e.name);
                  return {
                    v: i ? String(i) : "—",
                    st: r(n),
                    title: e.name + (n ? " — رقم مخصَّص لهذه الوردية" : " — يأخذ الاحتياج الافتراضي"),
                  };
                }),
                tot: String(KIVO.BassamNeed.tot(t.el, Zt)),
                totStyle:
                  "width:74px;flex-shrink:0;text-align:center;font-size:12px;font-weight:700;font-feature-settings:'tnum';color:" +
                  (KIVO.BassamNeed.tot(t.el, Zt) ? "#9A7E40" : "#c3c7cb"),
                placed: String((t.el.emp || []).length),
              };
            }),
            g = ((e && a[l]) || []).filter((t) => ("gates" === l ? !t.closed : !t.off)),
            u = (t) => Yt[Nt(t)] || "",
            y = Zt.map((t) => {
              const e = g.reduce((e, s) => e + KIVO.BassamNeed.of(s, t.name), 0);
              let s = 0;
              g.forEach((e) =>
                (e.emp || []).forEach((e) => {
                  u(e) === t.name && s++;
                }),
              );
              const n = s - e;
              return {
                name: t.name,
                need: String(e),
                placed: String(s),
                gapTxt: e ? (0 === n ? "مكتمل" : n > 0 ? "زائد " + n : "ناقص " + Math.abs(n)) : "—",
                gapStyle:
                  "font-size:9.5px;font-weight:700;font-feature-settings:'tnum';color:" +
                  (e ? (n < 0 ? "var(--fg-xdc2626)" : n > 0 ? "var(--fg-x0f766e)" : "var(--fg-x008450)") : "var(--fg-xc3c7cb)"),
                cellStyle: "width:78px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:1px",
                dotStyle: "width:6px;height:6px;border-radius:9999px;background:" + t.color,
              };
            }),
            m = g.reduce((t, e) => t + KIVO.BassamNeed.tot(e, Zt), 0),
            x = 268 + 84 * Zt.length + 74 + 40,
            b = (t) =>
              "width:32px;height:32px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;box-sizing:border-box;border:2px solid " +
              (t
                ? "#b99751;background:var(--bg-a185151810p1);color:var(--fg-x9a7e40)"
                : "transparent;background:transparent;color:var(--fg-x475569)"),
            k = (t) => () => this.setState({ needTbl: { kind: t, q: "" } }),
            v = (t) => !(!s.needTbl || !e || e[0] !== t);
          return {
            dsNdtHasZones: t.some((t) => "zones" === t[0]),
            dsNdtHasMarks: t.some((t) => "marks" === t[0]),
            dsNdtHasGates: t.some((t) => "gates" === t[0]),
            dsNdtOpenZones: k("zones"),
            dsNdtOpenMarks: k("marks"),
            dsNdtOpenGates: k("gates"),
            dsNdtStyleZones: b(v("zones")),
            dsNdtStyleMarks: b(v("marks")),
            dsNdtStyleGates: b(v("gates")),
            dsNdtTitleZones: "احتياج المصليات في جولة اليوم — عرضٌ فقط",
            dsNdtTitleMarks: "احتياج المعالم في جولة اليوم — عرضٌ فقط",
            dsNdtTitleGates: "احتياج الأبواب في جولة اليوم — عرضٌ فقط",
            dsNdtOn: !!s.needTbl && !!e,
            dsNdtClose: () => this.setState({ needTbl: null }),
            dsNdtHead: "احتياج " + d + " اليوم — " + i,
            dsNdtSub:
              "احتياج كل " + p.replace("ال", "") + " في كل وردية كما سُحب مع جولة اليوم · الخانة المذهَّبة رقمٌ مخصَّص لتلك الوردية",
            dsNdtNote:
              "الاحتياج قرارٌ تخطيطي يخصّ خطة الشهر ويُقاس عليه مؤشر الجاهزية — تحريره من «التشغيل الميداني» في الخطة التشغيلية، وجولة اليوم تقيس تغطيتها أمامه.",
            dsNdtQ: n,
            onDsNdtQ: (t) => this.setState((e) => ({ needTbl: { ...(e.needTbl || {}), q: t.target.value } })),
            dsNdtSearchPh: "ابحث باسم " + p + "...",
            dsNdtMinW: "min-width:" + x + "px",
            dsNdtColHead: d,
            dsNdtCols: Zt.map((t) => ({
              name: t.name,
              short: Xt[t.name] || t.name,
              headStyle: "width:78px;flex-shrink:0;display:flex;align-items:center;justify-content:center;gap:3px",
              dotStyle: "width:7px;height:7px;border-radius:9999px;flex-shrink:0;background:" + t.color,
            })),
            dsGapStripOn: (At || Ot) && t.length > 0 && !ks.on,
            covLegendOn: ks.on,
            covLegendOff: !ks.on,
            dsHintOn: !ks.on && !(this._fdV9 && this._fdV9.fdBarOn),
            covLegendNode: ks.legend,
            covPendOn: ks.on && ks.pendN > 0,
            covPendN: String(ks.pendN),
            covPendTip: "موظفون مسكَّنون " + ks.W.pend + " — بلا موقع فعّال؛ انقر لتصفية الخريطة عليهم ونقلهم",
            covPendTxt: ks.W.pend + " — انقر للنقل",
            covPendGo: () => {
              const t = ks.els.find((t) => ("gates" === ks.kind ? t.g.closed : t.g.off) && ks.toks(t.g).length),
                e = { covFilter: "cls", panelOpen: !0, panelTab: ks.kind };
              ("gates" === ks.kind ? (e.gateDim = "cov") : "marks" === ks.kind ? (e.markDim = "cov") : (e.brkDim = "cov"),
                this.setState(e, () => {
                  t && this._covFly(t.i);
                }));
            },
            covOn:
              this.bsLensOn("dist") &&
              (("gates" === Te && "cov" === s.gateDim) ||
                ("marks" === Te && "cov" === s.markDim) ||
                ("zones" === Te && "cov" === s.brkDim)),
            covNode: ks.node,
            dsGapShiftLabel: null != te ? te : "كل الورديات",
            dsGapItems: t.map((t) => {
              const e = ((t) => {
                  const e = (a[t] || []).filter((e) => ("gates" === t ? !e.closed : !e.off)),
                    s =
                      null != te
                        ? e.reduce((t, e) => t + KIVO.BassamNeed.of(e, te), 0)
                        : e.reduce((t, e) => t + KIVO.BassamNeed.tot(e, Zt), 0);
                  let n = 0;
                  return (
                    e.forEach((t) =>
                      (t.emp || []).forEach((t) => {
                        const e = u(t);
                        e && ((null != te && e !== te) || n++);
                      }),
                    ),
                    { need: s, placed: n, gap: n - s }
                  );
                })(t[0]),
                s = e.need ? (e.gap < 0 ? "#dc2626" : e.gap > 0 ? "#2f8f86" : "#008450") : "#94a3b8";
              return {
                label: t[1],
                state: e.need ? (0 === e.gap ? "مكتمل" : e.gap > 0 ? "زائد " + e.gap : "ناقص " + Math.abs(e.gap)) : "بلا احتياج",
                counts: e.placed + "/" + e.need,
                open: k(t[0]),
                title:
                  t[1] +
                  ": سُكِّن " +
                  e.placed +
                  " من احتياج " +
                  e.need +
                  (null != te ? " في «" + te + "»" : " عبر كل الورديات") +
                  " — انقر لفتح جدول احتياجها",
                chipStyle:
                  "display:inline-flex;align-items:center;gap:5px;flex-shrink:0;font-family:'Cairo',sans-serif;font-size:10px;font-weight:600;padding:4px 10px;border-radius:9999px;cursor:pointer;border:1px solid " +
                  s +
                  "40;background:" +
                  s +
                  "0f;color:" +
                  s,
                dot: "width:6px;height:6px;border-radius:9999px;flex-shrink:0;background:" + s,
                numStyle: "font-size:9px;font-weight:400;opacity:.75;font-feature-settings:'tnum'",
              };
            }),
            dsNdtRows: c,
            dsNdtEmpty: 0 === c.length,
            dsNdtEmptyMsg: n ? "لا " + p.replace("ال", "") + " يطابق «" + n + "»" : "لا توجد " + d + " في جولة هذا اليوم بعد.",
            dsNdtTots: y,
            dsNdtNeedAll: String(m),
            dsNdtCount: ((t) => {
              const e =
                {
                  zones: ["مصلى واحد", "مصلّيان", "مصليات", "مصلًّى", "مصلى"],
                  marks: ["معلم واحد", "معلمان", "معالم", "معلماً", "معلم"],
                  gates: ["باب واحد", "بابان", "أبواب", "باباً", "باب"],
                }[l] || null;
              return e ? KIVO.BassamCount(t, [e[0], e[1], e[1], e[2], e[3], e[4]]) : String(t);
            })(c.length),
            dsNdtTotLabel: d + " في كل وردية",
            dsNdtTotSub: "الاحتياج · المسكَّن عليها · الفارق",
            dsNdtFoot: "كل الأرقام هنا من " + d + " وحدها: احتياجها، ومن سُكِّن عليها هي، والفارق بينهما — لا دخل لبقية الأنواع في حسابها.",
          };
        })(),
        isDistLens: At,
        hasShiftFilters: _t.length > 0,
        dsSelClear: () =>
          this.setState({
            dsSel: null,
            selMulti: [],
            dsHovZ: null,
            dsHovG: null,
          }),
        bulkOn: yt && d && "gate" !== l,
        dsGateBarOn: mt,
        dsGateSelOn: mt && "gate" === l && a.length >= 1,
        ...(() => {
          const t = "gate" === l && _ ? a.map((t) => (_.gates || [])[t]).filter(Boolean) : [],
            e = t.length > 0 && t.every((t) => !t.closed),
            s = t.length > 0 && t.every((t) => !!t.closed),
            n =
              "width:32px;height:32px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;box-sizing:border-box;border:2px solid ";
          return {
            dsGOpenStyle:
              n +
              (e
                ? "#16a34a;background:var(--bg-a22163740p1);color:var(--fg-x16a34a)"
                : t.length
                  ? "transparent;background:transparent;color:var(--fg-x475569)"
                  : "transparent;background:transparent;color:var(--fg-xcbd5e1);cursor:default"),
            dsGCloseStyle:
              n +
              (s
                ? "#64748b;background:var(--bg-a1001161390p12);color:var(--fg-x64748b)"
                : t.length
                  ? "transparent;background:transparent;color:var(--fg-x475569)"
                  : "transparent;background:transparent;color:var(--fg-xcbd5e1);cursor:default"),
          };
        })(),
        dsGateBarNum:
          "gate" !== l
            ? "—"
            : a.length > 1
              ? "×" + a.length
              : a
                  .map((t) => {
                    const e = (_ && (_.gates || [])[t]) || null;
                    return e ? ("" !== (e.num || "") ? String(e.num) : e.label || e.name || "باب") : "";
                  })
                  .filter(Boolean)
                  .join(" · ") || "—",
        dsGateBarNumTip: (() => {
          if ("gate" !== l) return "";
          const t = a
            .map((t) => {
              const e = (_ && (_.gates || [])[t]) || null;
              return e ? ("" !== (e.num || "") ? String(e.num) : e.label || e.name || "باب") : "";
            })
            .filter(Boolean);
          return t.length > 1 ? "الأبواب المحدَّدة (" + t.length + "): " + t.join(" · ") : t[0] ? "الباب المحدَّد: " + t[0] : "";
        })(),
        bulkLabel: (() => {
          if ("gate" !== l) return p;
          const t = a
            .map((t) => {
              const e = (_ && (_.gates || [])[t]) || null;
              return e ? ("" !== (e.num || "") ? "#" + e.num : e.label || e.name || "باب") : "";
            })
            .filter(Boolean);
          return t.length ? (1 === t.length ? "الباب " : "الأبواب ") + t.join(" · ") : p;
        })(),
        bulkIsZone: "zone" === l || "gate" === l,
        bulkOnLbl: "gate" === l ? "مفتوح" : "تفعيل",
        bulkOffLbl: "gate" === l ? "مغلق" : "تعطيل",
        bulkOnTitle: "gate" === l ? "فتح الباب" : "تفعيل المحدَّد",
        bulkOffTitle: "gate" === l ? "إغلاق الباب" : "تعطيل المحدَّد",
        ...(() => {
          const t =
            "font-family:'Cairo',sans-serif;font-size:10.5px;font-weight:600;padding:5px 11px;border-radius:9999px;cursor:pointer;flex-shrink:0;transition:all .15s;";
          let e = !1,
            s = !1;
          if ("gate" === l && _) {
            const t = this._leafIdx(_.gates || [], a)
              .map((t) => (_.gates || [])[t])
              .filter(Boolean);
            t.length && t.every((t) => !t.closed) ? (e = !0) : t.length && t.every((t) => !!t.closed) && (s = !0);
          }
          return {
            bulkOnStyle:
              t +
              (e
                ? "border:1px solid var(--bd-x16a34a);background:linear-gradient(135deg,var(--bg-x4ade80),var(--bg-x16a34a));color:var(--fg-xffffff);box-shadow:0 2px 8px rgba(22,163,74,0.35)"
                : "border:1px solid var(--bd-a22163740p3);background:var(--bg-xffffff);color:var(--fg-x16a34a)"),
            bulkOffStyle:
              t +
              (s
                ? "border:1px solid var(--bd-x64748b);background:linear-gradient(135deg,var(--bg-x94a3b8),var(--bg-x64748b));color:var(--fg-xffffff);box-shadow:0 2px 8px rgba(100,116,139,0.35)"
                : "border:1px solid var(--bd-a1481631840p4);background:var(--bg-xffffff);color:var(--fg-x64748b)"),
          };
        })(),
        bulkFull: "gate" !== l,
        bulkOn2: () =>
          this._bulk((t) =>
            "gate" === l ? this._fdOpen(t) : { ...t, off: !1 },
          ),
        bulkOff: () => {
          if ("gate" !== l) return void this._bulk((t) => ({ ...t, off: !0 }));
          const t = a.map((t) => _ && (_.gates || [])[t]).filter(Boolean);
          if (!t.length || t.every((t) => !!t.closed)) return;
          const e = (t) => (t < 10 ? "0" : "") + t;
          let s = "12",
            n = "00";
          try {
            const t = new Date();
            ((s = e(t.getHours())), (n = e(t.getMinutes())));
          } catch (t) {}
          this.setState({ gClose: { idx: a.slice(), why: "", h: s, m: n, dd: null } });
        },
        ...(() => {
          const t = s.gClose,
            e = (t) => (t < 10 ? "0" : "") + t,
            n = t
              ? t.idx
                  .map((t) => {
                    const e = (_ && (_.gates || [])[t]) || null;
                    return e ? ("" !== (e.num || "") ? "#" + e.num + " — " : "") + (e.label || e.name || "باب") : "";
                  })
                  .filter(Boolean)
              : [],
            i = t ? String(t.why || "") : "",
            o = !(!t || !i.trim()),
            r = [];
          for (let t = 0; t < 24; t++) r.push(e(t));
          const a = [];
          for (let t = 0; t < 60; t++) a.push(e(t));
          const l = (t && t.dd) || null,
            d = (t, e) => () => this.setState((s) => ({ gClose: { ...(s.gClose || {}), [t]: e, dd: null } })),
            p = (t) =>
              "display:flex;align-items:center;justify-content:center;height:30px;border-radius:8px;cursor:pointer;font-family:'Cairo',sans-serif;font-size:12px;font-weight:600;font-feature-settings:'tnum';border:0;background:" +
              (t ? "rgba(185,151,81,0.14);color:var(--fg-x9a7e40)" : "transparent;color:var(--fg-x374151)"),
            h = (t) =>
              "width:100%;height:38px;border:1px solid " +
              (t ? "var(--bd-xb99751)" : "var(--bd-xe1e1e1)") +
              ";border-radius:9px;background:var(--bg-xffffff);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;font-family:'Cairo',sans-serif;font-size:15px;font-weight:700;color:var(--fg-x141414);font-feature-settings:'tnum';box-sizing:border-box";
          return {
            planSyncOn: !!s.planSync,
            planSyncSub: s.planSync
              ? "خطة " + (s.planSync.mName || "") + " ← جولة يوم " + (s.planSync.dayIdx || "") + " · لكل موقع: يُضاف / يُحدَّث / يُحذف"
              : "",
            planSyncRows: (s.planSync && s.planSync.rows) || [],
            planSyncDoStyle:
              "height:36px;padding:0 18px;border-radius:10px;font-size:12.5px;font-weight:700;border:0;font-family:'Cairo',sans-serif;" +
              (s.planSync && s.planSync.total > 0
                ? "background:linear-gradient(135deg,var(--bg-x0f766e),var(--bg-x14b8a6));color:var(--fg-xffffff);cursor:pointer"
                : "background:var(--bg-xefefef);color:var(--fg-xa2a6aa);cursor:not-allowed"),
            planSyncCancel: () => this.setState({ planSync: null }),
            planSyncDo: () => {
              const t = this.state.planSync;
              t && t.total > 0 && this._planSyncApply(t);
            },
            gcOn: !!t,
            gcTitle: n.length > 1 ? "إغلاق أبواب" : "إغلاق باب",
            gcNames: n.map((t) => ({
              txt: t,
              style:
                "display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:600;color:var(--fg-x475569);background:var(--bg-a1001161390p08);border:1px solid var(--bd-a1001161390p25);border-radius:9999px;padding:2px 9px;line-height:1.8",
            })),
            gcWhy: i,
            onGcWhy: (t) => this.setState((e) => ({ gClose: { ...(e.gClose || {}), why: t.target.value } })),
            gcWhyStyle:
              "width:100%;height:38px;border:1px solid " +
              (i.trim() ? "var(--bd-xe1e1e1)" : "var(--bd-a22038380p5)") +
              ";border-radius:9px;padding:0 12px;font-size:13px;font-weight:400;outline:none;font-family:'Cairo',sans-serif;box-sizing:border-box",
            gcH: t ? t.h : "",
            gcM: t ? t.m : "",
            gcHStyle: h("h" === l),
            gcMStyle: h("m" === l),
            gcHOpen: "h" === l,
            gcMOpen: "m" === l,
            gcHToggle: () => this.setState((t) => ({ gClose: { ...(t.gClose || {}), dd: t.gClose && "h" === t.gClose.dd ? null : "h" } })),
            gcMToggle: () => this.setState((t) => ({ gClose: { ...(t.gClose || {}), dd: t.gClose && "m" === t.gClose.dd ? null : "m" } })),
            gcPanelStyle:
              "position:absolute;top:42px;left:0;right:0;z-index:60;background:var(--bg-xffffff);border:1px solid var(--bd-xe1e1e1);border-radius:10px;box-shadow:0 12px 28px -8px rgba(0,0,0,0.22);padding:5px;max-height:190px;overflow-y:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:3px",
            gcHOpts: r.map((e) => ({ v: e, pick: d("h", e), style: p(!!t && t.h === e) })),
            gcMOpts: a.map((e) => ({ v: e, pick: d("m", e), style: p(!!t && t.m === e) })),
            gcNow: () => {
              let t = "12",
                s = "00";
              try {
                const n = new Date();
                ((t = e(n.getHours())), (s = e(n.getMinutes())));
              } catch (t) {}
              this.setState((e) => ({ gClose: { ...(e.gClose || {}), h: t, m: s, dd: null } }));
            },
            gcHint: "الوقت بتوقيت هذا اليوم — والافتراضي ساعتك الآن",
            gcOkOn: o,
            gcOkStyle:
              "height:38px;padding:0 22px;border-radius:10px;font-size:13px;font-weight:400;border:0;font-family:'Cairo',sans-serif;" +
              (o
                ? "background:linear-gradient(135deg,var(--bg-x94a3b8),var(--bg-x64748b));color:var(--fg-xffffff);cursor:pointer;box-shadow:0 2px 8px rgba(100,116,139,0.35)"
                : "background:var(--bg-xefefef);color:var(--fg-xa2a6aa);cursor:not-allowed"),
            gcCancel: () => this.setState({ gClose: null }),
            gcDo: () => {
              const t = this.state.gClose;
              if (!t) return;
              const e = String(t.why || "").trim();
              if (!e) return;
              const s = t.h + ":" + t.m,
                n = t.idx || [];
              (this._updRoundAt(this.state.floor >= 0 ? this.state.floor : 0, (t) => {
                const i = this._leafIdx(t.gates, n);
                t.gates = (t.gates || []).map((t, n) => (i.indexOf(n) >= 0 ? this._fdClose(t, e, s) : t));
              }),
                this.setState({ gClose: null }));
            },
          };
        })(),
        bulkAskDel: () => this.setState({ bulkAsk: !0 }),
        bulkAskOn: !!s.bulkAsk,
        bulkDelNo: () => this.setState({ bulkAsk: !1 }),
        bulkDelYes: () => this._bulkDelete(),
        bulkClear: () => this.setState({ dsSel: null, selMulti: [] }),
        bulkEdit: () => this.openBulkEditor(),
        bEditOn: !!s.bEdit,
        bEditN: s.bEdit ? s.bEdit.n : 0,
        bIsZone: !(!s.bEdit || "zone" !== s.bEdit.t),
        bIsPath: !(!s.bEdit || "path" !== s.bEdit.t),
        bApply: () => this.applyBulkEditor(),
        bCancel: () => this.setState({ bEdit: null, bDd: null }),
        bFieldsNode: (() => {
          const t = s.bEdit;
          if (!t) return null;
          const e = React.createElement,
            n = "بلا تغيير",
            i = (t) =>
              e(
                "span",
                {
                  dir: "ltr",
                  style: {
                    fontFamily: "'Cairo',sans-serif",
                    fontFeatureSettings: "'tnum'",
                    fontSize: 10,
                    fontWeight: 400,
                    color: "var(--fg-x9a7e40)",
                    flexShrink: 0,
                  },
                },
                "#" + t,
              ),
            o = (t) =>
              e("span", {
                style: {
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  flexShrink: 0,
                  background: t,
                  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.12)",
                },
              }),
            r = (r, a, l, d) => {
              const p = s.bDd === r,
                h = t[r] || "",
                c = (t) =>
                  this.setState((e) => {
                    const s = { ...(e.bEdit || {}), [r]: t };
                    return (d && d(s, t), { bEdit: s, bDd: null });
                  }),
                g = p
                  ? e(
                      "div",
                      {
                        className: "bs-optmenu",
                        style: {
                          position: "absolute",
                          top: "100%",
                          right: 0,
                          left: 0,
                          zIndex: 60,
                          marginTop: 4,
                          background: "var(--bg-xffffff)",
                          border: "1px solid var(--bd-a185151810p35)",
                          borderRadius: 10,
                          boxShadow: "0 12px 30px -8px rgba(0,0,0,0.30)",
                          maxHeight: 170,
                          overflowY: "auto",
                          padding: 4,
                        },
                      },
                      [{ name: "" }].concat(l).map((t, s) => {
                        const r = "" === t.name,
                          a = r ? !h : h === t.name;
                        return e(
                          "div",
                          {
                            key: "r" + s,
                            onClick: () => c(t.name),
                            style: {
                              display: "flex",
                              alignItems: "center",
                              gap: 7,
                              padding: "7px 9px",
                              borderRadius: 7,
                              cursor: "pointer",
                              fontSize: 11,
                              fontFamily: "'Cairo',sans-serif",
                              transition: "background .15s",
                              background: a ? "var(--bg-a185151810p1)" : "transparent",
                              fontWeight: a ? 800 : r ? 700 : 400,
                              color: a ? "var(--fg-x9a7e40)" : r ? "var(--fg-x64748b)" : "var(--fg-x25343f)",
                              borderBottom: r ? "1px solid #f1f5f9" : "0",
                            },
                          },
                          t.dot ? o(t.dot) : null,
                          t.code ? i(t.code) : null,
                          e(
                            "span",
                            { style: { flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } },
                            r ? n : t.name,
                          ),
                        );
                      }),
                      0 === l.length
                        ? e(
                            "div",
                            { style: { fontSize: 10, color: "var(--fg-x94a3b8)", padding: "8px", textAlign: "center", lineHeight: 1.7 } },
                            "لا خيارات معرّفة بعد — تُضاف من محرر العنصر نفسه",
                          )
                        : null,
                    )
                  : null,
                f = l.find((t) => t.name === h);
              return e(
                "div",
                { key: r, style: { position: "relative", minWidth: 0 } },
                e(
                  "label",
                  {
                    style: {
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--fg-x8b9099)",
                      display: "block",
                      marginBottom: 4,
                      fontFamily: "'Cairo',sans-serif",
                    },
                  },
                  a,
                ),
                e(
                  "button",
                  {
                    onClick: () => this.setState({ bDd: p ? null : r }),
                    style: {
                      width: "100%",
                      height: 34,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "0 10px",
                      borderRadius: 8,
                      border: "1px solid " + (p ? "var(--bd-xb99751)" : "var(--bd-xe1e1e1)"),
                      background: "var(--bg-xffffff)",
                      cursor: "pointer",
                      fontFamily: "'Cairo',sans-serif",
                      fontSize: 11.5,
                      fontWeight: 400,
                      color: h ? "var(--fg-x141414)" : "var(--fg-x94a3b8)",
                      boxSizing: "border-box",
                    },
                  },
                  f && f.dot ? o(f.dot) : null,
                  f && f.code ? i(f.code) : null,
                  e(
                    "span",
                    {
                      style: {
                        flex: 1,
                        minWidth: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        textAlign: "right",
                      },
                    },
                    h || n,
                  ),
                  ((t) =>
                    e(
                      "svg",
                      {
                        width: 12,
                        height: 12,
                        viewBox: "0 0 24 24",
                        fill: "none",
                        stroke: "currentColor",
                        strokeWidth: 2.4,
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                        style: { flexShrink: 0, transition: "transform .2s", opacity: 0.55, transform: t ? "rotate(180deg)" : "none" },
                      },
                      e("path", { d: "m6 9 6 6 6-6" }),
                    ))(p),
                ),
                g,
              );
            },
            a = (t, e, s) =>
              this.zoneOptList(t)
                .filter((t) => !s || s(t))
                .map((t) => ({ name: this._optName(t), code: e ? this._optCode(t) : "" }));
          if ("zone" === t.t) {
            const s = (t.region || "").trim(),
              n = (t.ztype || "").trim();
            return e(
              "div",
              { id: "bsBkDds", style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 } },
              r(
                "yard",
                "الساحة",
                this.GATE_LOCS.map((t) => ({ name: t[0], dot: t[1] })),
              ),
              r("region", "المنطقة", a("region", !0), (t, e) => {
                const s = (t.level || "").trim();
                s && e && (this.zoneOptList("level").some((t) => !(this._optName(t) !== s || (t && t.r && t.r !== e))) || (t.level = ""));
              }),
              r(
                "level",
                "الدور / المستوى",
                a("level", !0, (t) => !(t && t.r && s && t.r !== s)),
              ),
              r("ztype", "النوع", a("ztype", !0), (t, e) => {
                const s = (t.zcat || "").trim();
                s && e && (this.zoneOptList("zcat").some((t) => this._optName(t) === s && this._catFitsType(t, e)) || (t.zcat = ""));
              }),
              r(
                "zcat",
                "الفئة",
                a("zcat", !1, (t) => this._catFitsType(t, n)),
              ),
            );
          }
          const l = (s, i, o) =>
            e(
              "div",
              { style: { marginBottom: 10 } },
              e(
                "span",
                {
                  style: {
                    display: "block",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--fg-x8b9099)",
                    marginBottom: 4,
                    fontFamily: "'Cairo',sans-serif",
                  },
                },
                i + ("" === (t[s] || "") ? " — " + n : ""),
              ),
              e(
                "div",
                { style: { display: "flex", gap: 6 } },
                o.map((n) => {
                  const i = (t[s] || "") === n.v,
                    o = n.c || "#9A7E40";
                  return e(
                    "button",
                    {
                      key: n.v,
                      onClick: () => this.setState((t) => ({ bEdit: { ...t.bEdit, [s]: i ? "" : n.v } })),
                      style: {
                        flex: 1,
                        height: 32,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 5,
                        borderRadius: 9,
                        fontSize: 10.5,
                        fontWeight: 400,
                        cursor: "pointer",
                        fontFamily: "'Cairo',sans-serif",
                        transition: "all .15s",
                        border: "1px solid " + (i ? o : "var(--bd-xe1e1e1)"),
                        background: i ? o + "14" : "var(--bg-xffffff)",
                        color: i ? o : "var(--fg-x64748b)",
                      },
                    },
                    n.c ? e("span", { style: { width: 8, height: 8, borderRadius: 9999, flexShrink: 0, background: n.c } }) : null,
                    n.l,
                  );
                }),
              ),
            );
          return e(
            "div",
            { id: "bsBkDds" },
            l(
              "type",
              "نوع المسار",
              me.map((t) => ({ v: t, l: ge[t].label, c: ge[t].c })),
            ),
            l(
              "line",
              "شكل الخط",
              be.map((t) => ({ v: t[0], l: t[1] })),
            ),
            l(
              "w",
              "سماكة الخط",
              xe.map((t) => ({ v: t[0], l: t[1] })),
            ),
          );
        })(),
        bOffKeep: () =>
          this.setState((t) => ({ bEdit: { ...t.bEdit, off: "" } })),
        bOffKeepS:
          "font-family:'Cairo',sans-serif;font-size:10px;font-weight:600;padding:5px 0;flex:1;border-radius:9999px;cursor:pointer;border:0;background:" +
          (s.bEdit && "" === (s.bEdit.off || "")
            ? "#fff;color:var(--fg-x9a7e40);box-shadow:var(--shadow-card)"
            : "transparent;color:var(--fg-x64748b)"),
        bOffYes: () =>
          this.setState((t) => ({ bEdit: { ...t.bEdit, off: "yes" } })),
        bOffYesS:
          "font-family:'Cairo',sans-serif;font-size:10px;font-weight:600;padding:5px 0;flex:1;border-radius:9999px;cursor:pointer;border:0;background:" +
          (s.bEdit && "yes" === (s.bEdit.off || "")
            ? "#fff;color:var(--fg-x9a7e40);box-shadow:var(--shadow-card)"
            : "transparent;color:var(--fg-x64748b)"),
        bOffNo: () =>
          this.setState((t) => ({ bEdit: { ...t.bEdit, off: "no" } })),
        bOffNoS:
          "font-family:'Cairo',sans-serif;font-size:10px;font-weight:600;padding:5px 0;flex:1;border-radius:9999px;cursor:pointer;border:0;background:" +
          (s.bEdit && "no" === (s.bEdit.off || "")
            ? "#fff;color:var(--fg-x9a7e40);box-shadow:var(--shadow-card)"
            : "transparent;color:var(--fg-x64748b)"),
        bActiveKeep: () =>
          this.setState((t) => ({ bEdit: { ...t.bEdit, active: "" } })),
        bActiveKeepS:
          "font-family:'Cairo',sans-serif;font-size:10px;font-weight:600;padding:5px 0;flex:1;border-radius:9999px;cursor:pointer;border:0;background:" +
          (s.bEdit && "" === (s.bEdit.active || "")
            ? "#fff;color:var(--fg-x9a7e40);box-shadow:var(--shadow-card)"
            : "transparent;color:var(--fg-x64748b)"),
        bActiveYes: () =>
          this.setState((t) => ({ bEdit: { ...t.bEdit, active: "yes" } })),
        bActiveYesS:
          "font-family:'Cairo',sans-serif;font-size:10px;font-weight:600;padding:5px 0;flex:1;border-radius:9999px;cursor:pointer;border:0;background:" +
          (s.bEdit && "yes" === (s.bEdit.active || "")
            ? "#fff;color:var(--fg-x9a7e40);box-shadow:var(--shadow-card)"
            : "transparent;color:var(--fg-x64748b)"),
        bActiveNo: () =>
          this.setState((t) => ({ bEdit: { ...t.bEdit, active: "no" } })),
        bActiveNoS:
          "font-family:'Cairo',sans-serif;font-size:10px;font-weight:600;padding:5px 0;flex:1;border-radius:9999px;cursor:pointer;border:0;background:" +
          (s.bEdit && "no" === (s.bEdit.active || "")
            ? "#fff;color:var(--fg-x9a7e40);box-shadow:var(--shadow-card)"
            : "transparent;color:var(--fg-x64748b)"),
        dsDensSelStyle:
          "width:32px;height:32px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;box-sizing:border-box;border:2px solid " +
          (s.dsSel
            ? "transparent;background:transparent;color:var(--fg-x475569)"
            : "#b99751;background:var(--bg-a185151810p1);color:var(--fg-x9a7e40)"),
        dsSelStyle:
          "width:32px;height:32px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;box-sizing:border-box;border:2px solid " +
          (s.dsShiftAll
            ? "#b99751;background:var(--bg-a185151810p1);color:var(--fg-x9a7e40)"
            : "transparent;background:transparent;color:var(--fg-x475569)"),
        dsSelTitle: s.dsShiftAll
          ? "إعادة حصر مؤشرات التوزيع على وردية اليوم «" + Jt(te) + "»"
          : "توسيع مؤشرات التوزيع لكل الورديات — والتسكين يبقى على «" + Jt(te) + "»",
        dsDistSelClick: () =>
          this.setState({
            dsSel: null,
            selMulti: [],
            dsHovZ: null,
            dsHovG: null,
            distFilterShift: null,
            dsShiftAll: !this.state.dsShiftAll,
          }),
        ...ie,
        shiftFilterOpts: oe,
        noshFilterOpt: re,
        hasNoshOpt: !!re,
        distFilterLabel: Jt(te),
        distFilterOpen: !1 !== s.distFilterOpen,
        distFilterToggle: () =>
          this.setState({ distFilterOpen: !1 === s.distFilterOpen }),
        distFilterChevron: "transition:transform .2s;transform:" + (!1 === s.distFilterOpen ? "rotate(0deg)" : "rotate(180deg)"),
        distFilterToggleTitle:
          !1 === s.distFilterOpen ? "إظهار شريط الأدوات" : "طيّ شريط الأدوات",
        prayerLabel: it,
        prOpen: !1 !== s.prOpen,
        prToggle: () => this.setState({ prOpen: !1 === s.prOpen }),
        prChevron: "transition:transform .2s;transform:" + (!1 === s.prOpen ? "rotate(0deg)" : "rotate(180deg)"),
        prToggleTitle:
          !1 === s.prOpen ? "إظهار الصلوات الخمس" : "طيّ الصلوات الخمس",
        prNameStyle:
          "font-size:8.5px;font-weight:600;color:var(--fg-x9a7e40);text-align:center;font-family:'Cairo',sans-serif;line-height:1.4;padding:1px 0 2px",
        prayerBtns: st.map((t) => {
          const e = t[0],
            s = t[1],
            n = t[2],
            i = e === nt,
            o = dt[e] || 0;
          return {
            label: s,
            i1: n[0],
            i2: n[1],
            i3: n[2],
            i4: n[3],
            i5: n[4],
            title:
              s +
              " — " +
              (o
                ? KIVO.BassamCount(o, "مصلى") + " " + KIVO.BassamCount.agr(o, "فيه", "فيهما", "فيها") + " قراءة"
                : "لا توجد قراءات بعد"),
            click: () => this.setState({ prayer: e, dsHovZ: null, dsHovG: null, dsSel: null, selMulti: [], zassign: null, zdens: null }),
            style:
              "position:relative;width:32px;height:32px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;box-sizing:border-box;border:2px solid " +
              (i
                ? "#b99751;background:var(--bg-a185151810p1);color:var(--fg-x9a7e40)"
                : "transparent;background:transparent;color:var(--fg-x475569)"),
          };
        }),
        panelTitle: "عناصر الخريطة",
        panelSub:
          "paths" === Te
            ? "شبكة الحركة — أنواعها واتجاهاتها وجاهزيتها"
            : "dens" === Te
              ? "قراءات " + it + " — نبض الامتلاء والقياس"
              : "dist" === Te
                ? "القوى العاملة — التسكين والتغطية"
                : "gates" === Te
                  ? "جاهزية المنافذ — الحالة مقارنة بالخطة"
                  : "marks" === Te
                    ? "المعالم الميدانية — أنواعها وحالتها"
                    : "بنية الميدان — الترميز والطاقة والتعديلات",
        panelIcon1: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",
        panelIcon2: "M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
        zoneDefsNode: (() => {
          const t = ut
            .map((t, e) => {
              const s = ft[t];
              return s && s.h && "none" !== s.h
                ? ((t, e, s) => {
                    const n = React.createElement,
                      i = Math.max(2, +e.hg || 6),
                      o = Math.max(0.3, +e.hw || 1),
                      r = e.hc || e.s || "#000000",
                      a = "diag" === e.h ? "rotate(45)" : "diag2" === e.h ? "rotate(-45)" : "cross" === e.h ? "rotate(45)" : null,
                      l = [n("rect", { key: "bg", width: i, height: i, fill: e.f })];
                    ("dots" === e.h
                      ? l.push(n("circle", { key: "d", cx: i / 2, cy: i / 2, r: o, fill: r }))
                      : "horiz" === e.h
                        ? l.push(n("line", { key: "l1", x1: 0, y1: i / 2, x2: i, y2: i / 2, stroke: r, strokeWidth: o }))
                        : l.push(n("line", { key: "l1", x1: i / 2, y1: 0, x2: i / 2, y2: i, stroke: r, strokeWidth: o })),
                      "cross" === e.h && l.push(n("line", { key: "l2", x1: 0, y1: i / 2, x2: i, y2: i / 2, stroke: r, strokeWidth: o })));
                    const d = { key: s, id: t, patternUnits: "userSpaceOnUse", width: i, height: i };
                    return (a && (d.patternTransform = a), n("pattern", d, l));
                  })("bsZpD" + e, s, "p" + e)
                : null;
            })
            .filter(Boolean);
          return t.length ? React.createElement("defs", null, t) : null;
        })(),
        zcStyleNode: (() => {
          const t = s.zcs;
          if (!t) return null;
          const e = React.createElement,
            n = (t) => this.setState({ zcs: { ...this.state.zcs, ...t } }),
            i = (t) => e("label", { style: { fontSize: 9.5, fontWeight: 600, color: "var(--fg-x64748b)", lineHeight: 1 } }, t),
            o = (e, s) =>
              n("f" === e ? (!1 === t.sAuto ? { f: s } : { f: s, s: this._darken(s) }) : "s" === e ? { s: s, sAuto: !1 } : { [e]: s }),
            r = (s, n) =>
              e(
                "div",
                { style: { display: "flex", flexDirection: "column", gap: 5 } },
                i(s),
                e("input", {
                  type: "color",
                  title: s,
                  value: t[n],
                  onChange: (t) => o(n, t.target.value),
                  style: {
                    width: "100%",
                    height: 30,
                    padding: 2,
                    border: "1px solid var(--bd-xe1e1e1)",
                    borderRadius: 8,
                    cursor: "pointer",
                    background: "var(--bg-xffffff)",
                    boxSizing: "border-box",
                  },
                }),
              ),
            a = (s, o, r, a) => {
              const l = null != t[o] ? +t[o] : a,
                d = Math.min(1, Math.max(0.05, +(l / r).toFixed(2)));
              return e(
                "div",
                { style: { display: "flex", flexDirection: "column", gap: 5, minWidth: 0 } },
                e(
                  "div",
                  { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
                  i(s),
                  e(
                    "span",
                    {
                      dir: "ltr",
                      style: {
                        fontFamily: "'Cairo',sans-serif",
                        fontFeatureSettings: "'tnum'",
                        fontSize: 10,
                        fontWeight: 400,
                        color: "var(--fg-x9a7e40)",
                      },
                    },
                    d.toFixed(2),
                  ),
                ),
                e("input", {
                  type: "range",
                  title: s,
                  min: 0.05,
                  max: 1,
                  step: 0.05,
                  value: d,
                  onChange: (t) => n({ [o]: +(+t.target.value * r).toFixed(2) }),
                  style: { width: "100%", accentColor: "var(--fg-xb99751)", margin: 0, height: 30 },
                }),
              );
            },
            l = (s, o, r, a, l, d) =>
              e(
                "div",
                { style: { display: "flex", flexDirection: "column", gap: 5, minWidth: 0 } },
                e(
                  "div",
                  { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
                  i(s),
                  e(
                    "span",
                    {
                      dir: "ltr",
                      style: {
                        fontFamily: "'Cairo',sans-serif",
                        fontFeatureSettings: "'tnum'",
                        fontSize: 10,
                        fontWeight: 400,
                        color: "var(--fg-x9a7e40)",
                      },
                    },
                    d(t[o]),
                  ),
                ),
                e("input", {
                  type: "range",
                  title: s,
                  min: r,
                  max: a,
                  step: l,
                  value: t[o],
                  onChange: (t) => n({ [o]: +t.target.value }),
                  style: { width: "100%", accentColor: "var(--fg-xb99751)", margin: 0, height: 30 },
                }),
              ),
            d = (s, i, o) =>
              e(
                "button",
                {
                  key: s,
                  title: o,
                  onClick: () => n({ bs: s }),
                  style: {
                    flex: 1,
                    height: 30,
                    borderRadius: 8,
                    cursor: "pointer",
                    background: t.bs === s ? "var(--bg-a185151810p08)" : "var(--bg-xffffff)",
                    border: "2px solid",
                    borderColor: t.bs === s ? "var(--bd-xb99751)" : "var(--bd-xe1e1e1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                  },
                },
                e(
                  "svg",
                  { width: 34, height: 8, viewBox: "0 0 34 8" },
                  e("line", {
                    x1: 2,
                    y1: 4,
                    x2: 32,
                    y2: 4,
                    stroke: "#334155",
                    strokeWidth: 2,
                    strokeDasharray: i,
                    strokeLinecap: "0.5 5" === i ? "round" : "butt",
                  }),
                ),
              ),
            p = (s, i) => {
              const o = "bsZtDs" + s,
                r = { f: "#eef2f7", h: s, hc: "#475569", hw: 1.1, hg: 6 };
              return e(
                "button",
                {
                  key: s,
                  title: i,
                  onClick: () => n({ h: s }),
                  style: {
                    flex: 1,
                    height: 34,
                    borderRadius: 8,
                    cursor: "pointer",
                    background: "var(--bg-xffffff)",
                    border: "2px solid",
                    borderColor: t.h === s ? "var(--bd-xb99751)" : "var(--bd-xe1e1e1)",
                    boxShadow: t.h === s ? "0 0 0 2px rgba(185,151,81,0.25)" : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 3,
                  },
                },
                e(
                  "svg",
                  { width: "100%", height: "100%", viewBox: "0 0 40 24", preserveAspectRatio: "none", style: { borderRadius: 4 } },
                  "none" !== s ? this._mkHatchPattern(o, r, "tp") : null,
                  e("rect", { x: 0, y: 0, width: 40, height: 24, fill: "none" === s ? "#eef2f7" : "url(#" + o + ")" }),
                ),
              );
            },
            h = "solid" === t.bs ? "none" : "dot" === t.bs ? "1 4" : "6 4",
            c = !!this.zcatStyleOf(t.name, t.zt),
            g = (t) =>
              e(
                "div",
                {
                  style: {
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: "var(--fg-x9a7e40)",
                    borderBottom: "1px solid var(--bd-a185151810p2)",
                    paddingBottom: 4,
                  },
                },
                t,
              );
          return e(
            "div",
            {
              onClick: () => this.setState({ zcs: null }),
              style: {
                position: "fixed",
                inset: 0,
                zIndex: 9240,
                background: "var(--bg-a0000p5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
              },
            },
            e(
              "div",
              {
                onClick: (t) => t.stopPropagation(),
                style: {
                  background: "var(--bg-xffffff)",
                  borderRadius: 16,
                  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
                  width: "100%",
                  maxWidth: 470,
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  fontFamily: "'Cairo',sans-serif",
                  maxHeight: "calc(100vh - 48px)",
                  overflowY: "auto",
                },
              },
              e(
                "div",
                { style: { display: "flex", alignItems: "center", gap: 10 } },
                e(
                  "div",
                  {
                    style: {
                      width: 38,
                      height: 38,
                      borderRadius: 11,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "var(--bg-a185151810p1)",
                      border: "1px solid var(--bd-a185151810p25)",
                      color: "var(--fg-xb99751)",
                    },
                  },
                  e(
                    "svg",
                    {
                      width: 17,
                      height: 17,
                      viewBox: "0 0 24 24",
                      fill: "none",
                      stroke: "currentColor",
                      strokeWidth: 2,
                      strokeLinecap: "round",
                      strokeLinejoin: "round",
                    },
                    e("path", {
                      d: "M12 22a10 10 0 1 1 10-10c0 2-1.2 3-3 3h-2.6a2.4 2.4 0 0 0-1.8 4c.4.5.6.9.6 1.3a1.7 1.7 0 0 1-1.7 1.7Z",
                    }),
                    e("circle", { cx: 7.5, cy: 10.5, r: 0.5 }),
                    e("circle", { cx: 12, cy: 7, r: 0.5 }),
                    e("circle", { cx: 16.5, cy: 10.5, r: 0.5 }),
                  ),
                ),
                e(
                  "div",
                  { style: { flex: 1 } },
                  e("h2", { style: { fontSize: 15.5, fontWeight: 600, margin: 0 } }, "تنسيق فئة «" + t.name + "»"),
                  e(
                    "p",
                    { style: { fontSize: 10.5, color: "var(--fg-x53565a)", margin: "2px 0 0" } },
                    "ينعكس على كل مصلى يحمل هذه الفئة في كل المواقع",
                  ),
                ),
                e(
                  "button",
                  {
                    onClick: () => this.setState({ zcs: null }),
                    style: {
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      border: 0,
                      background: "var(--bg-xf5f5f5)",
                      color: "var(--fg-x53565a)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    },
                  },
                  e(
                    "svg",
                    {
                      width: 13,
                      height: 13,
                      viewBox: "0 0 24 24",
                      fill: "none",
                      stroke: "currentColor",
                      strokeWidth: 2,
                      strokeLinecap: "round",
                      strokeLinejoin: "round",
                    },
                    e("path", { d: "M18 6 6 18" }),
                    e("path", { d: "m6 6 12 12" }),
                  ),
                ),
              ),
              e(
                "div",
                {
                  style: {
                    borderRadius: 12,
                    border: "1px solid var(--bd-xeef2f7)",
                    background:
                      "repeating-linear-gradient(45deg,var(--bg-xfafbfc),var(--bg-xfafbfc) 12px,var(--bg-xf4f6f9) 12px,var(--bg-xf4f6f9) 24px)",
                    position: "relative",
                  },
                },
                e(
                  "span",
                  { style: { position: "absolute", top: 5, right: 10, fontSize: 8.5, fontWeight: 600, color: "var(--fg-xb0b7c3)" } },
                  "معاينة حيّة",
                ),
                e(
                  "svg",
                  { viewBox: "0 0 200 62", style: { width: "100%", height: 62, display: "block" } },
                  "none" !== t.h ? this._mkHatchPattern("bsZpPrevDs", t, "pv") : null,
                  e("path", {
                    d: "M16 12 L184 12 L184 52 L16 52 Z",
                    fill: "none" !== t.h ? "url(#bsZpPrevDs)" : t.f,
                    fillOpacity: (null != t.o ? t.o : 50) / 100,
                    stroke: t.s,
                    strokeWidth: Math.max(0.6, +t.bw || 1),
                    strokeDasharray: h,
                    strokeLinecap: "dot" === t.bs ? "round" : "butt",
                  }),
                ),
              ),
              g("التعبئة"),
              e(
                "div",
                { style: { display: "grid", gridTemplateColumns: "92px 1fr", gap: 12, alignItems: "end" } },
                r("لون الموقع", "f"),
                l("الشفافية", "o", 10, 90, 5, (t) => t + "%"),
              ),
              g("الحدود"),
              e(
                "div",
                { style: { display: "grid", gridTemplateColumns: "92px 138px 1fr", gap: 12, alignItems: "end" } },
                r("حدود الموقع", "s"),
                e(
                  "div",
                  { style: { display: "flex", flexDirection: "column", gap: 5 } },
                  i("نمط الحدود"),
                  e(
                    "div",
                    { style: { display: "flex", gap: 5 } },
                    d("solid", "none", "متصل"),
                    d("dash", "6 4", "متقطع"),
                    d("dot", "0.5 5", "منقّط"),
                  ),
                ),
                l("سماكة الحدود", "bw", 0.6, 4, 0.2, (t) => t),
              ),
              g("التهشير"),
              e(
                "div",
                { style: { display: "flex", gap: 5 } },
                [
                  ["none", "بدون"],
                  ["diag", "مائل"],
                  ["diag2", "مائل معاكس"],
                  ["cross", "متقاطع"],
                  ["horiz", "أفقي"],
                  ["vert", "عمودي"],
                  ["dots", "نقاط"],
                ].map((t) => p(t[0], t[1])),
              ),
              "none" !== t.h
                ? e(
                    "div",
                    { style: { display: "grid", gridTemplateColumns: "92px 1fr 1fr", gap: 12, alignItems: "end" } },
                    r("لون التهشير", "hc"),
                    a("سماكة التهشير", "hw", 2, 0.3),
                    a("التباعد", "hg", 16, 1.6),
                  )
                : null,
              e(
                "div",
                { style: { display: "flex", alignItems: "center", gap: 8, borderTop: "1px solid var(--bd-xf1f5f9)", paddingTop: 12 } },
                e(
                  "button",
                  {
                    onClick: () => {
                      const e = { ...(this.state.zoneOpts || {}) };
                      ((e.zcatStyle = {
                        ...(e.zcatStyle || {}),
                        [this._zcatKey(t.zt, t.name)]: {
                          f: t.f,
                          o: t.o,
                          s: t.s,
                          sAuto: !1 !== t.sAuto,
                          bs: t.bs,
                          bw: t.bw,
                          h: t.h,
                          hc: t.hc,
                          hw: t.hw,
                          hg: t.hg,
                        },
                      }),
                        this.saveZoneOpts(e),
                        this.setState({ zcs: null }));
                    },
                    style: {
                      height: 37,
                      padding: "0 20px",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 400,
                      background: "var(--bg-xb99751)",
                      color: "var(--fg-xffffff)",
                      border: 0,
                      cursor: "pointer",
                      fontFamily: "'Cairo',sans-serif",
                    },
                  },
                  "حفظ التنسيق",
                ),
                e(
                  "button",
                  {
                    onClick: () => this.setState({ zcs: null }),
                    style: {
                      height: 37,
                      padding: "0 16px",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 400,
                      background: "var(--bg-xffffff)",
                      color: "var(--fg-x141414)",
                      border: "1px solid var(--bd-xe1e1e1)",
                      cursor: "pointer",
                      fontFamily: "'Cairo',sans-serif",
                    },
                  },
                  "إلغاء",
                ),
                c
                  ? e(
                      "button",
                      {
                        onClick: () => {
                          const e = { ...(this.state.zoneOpts || {}) },
                            s = { ...(e.zcatStyle || {}) };
                          (t.zt ? delete s[this._zcatKey(t.zt, t.name)] : delete s[t.name],
                            (e.zcatStyle = s),
                            this.saveZoneOpts(e),
                            this.setState({ zcs: null }));
                        },
                        style: {
                          marginRight: "auto",
                          height: 37,
                          padding: "0 14px",
                          borderRadius: 10,
                          fontSize: 12.5,
                          fontWeight: 400,
                          background: "var(--bg-xfef2f2)",
                          color: "var(--fg-xdc2626)",
                          border: "1px solid var(--bd-xfecaca)",
                          cursor: "pointer",
                          fontFamily: "'Cairo',sans-serif",
                        },
                      },
                      "إزالة التنسيق",
                    )
                  : null,
              ),
            ),
          );
        })(),
        mapPathNodes: ($ && this.bsLensOn("paths") ? he : [])
          .map((t, e) => {
            const n = s.dview.w / 1e3,
              i = s.dsPathTmp && s.dsPathTmp.i === e ? { ...t, pts: s.dsPathTmp.pts } : t,
              o = i.pts || [];
            if (o.length < 2) return null;
            const r = !1 !== i.active,
              a = !("zones" === s.lens || "paths" === s.lens),
              l = ("zones" === s.lens || "paths" === s.lens) && s.dsSel && "path" === s.dsSel.t && s.dsSel.i === e,
              d = yt && "select" === s.tool,
              p = a ? "#94a3b8" : ke(i),
              h = fe[i.w] || fe.normal,
              c = h * n,
              g = o[Math.floor((o.length - 1) / 2)],
              u = o.map((t) => t.x + "," + t.y).join(" "),
              y = (i.code ? i.code + " · " : "") + (i.name || "");
            return React.createElement(
              "g",
              {
                key: "pa" + f + "_" + e,
                style: { pointerEvents: a || !d ? "none" : "auto", cursor: d ? "move" : "default" },
                opacity: a ? 0.45 : r ? 1 : 0.5,
                onPointerDown: d
                  ? (t) => {
                      t.stopPropagation();
                      const s = this._dsEvtPt(t),
                        n = t.ctrlKey || t.metaKey;
                      (this._pickSel("path", e, n),
                        this.setState({
                          draft: null,
                          dsPolyPts: [],
                          dsPolyCursor: null,
                          dsPan: null,
                          dspdrag: { i: e, sx: s.x, sy: s.y, pts: ((this._curFloorPaths()[e] || {}).pts || []).slice() },
                        }));
                    }
                  : void 0,
                onDoubleClick: d
                  ? (t) => {
                      (t.stopPropagation(), this.setState({ dspdrag: null, dspvdrag: null }), this._dsOpenPathEditor(e, !1));
                    }
                  : void 0,
              },
              React.createElement("polyline", {
                points: u,
                fill: "none",
                stroke: "#ffffff",
                strokeWidth: c + (l ? 3.6 : 2) * n,
                strokeLinecap: "round",
                strokeLinejoin: "round",
                opacity: 0.92,
              }),
              l
                ? React.createElement("polyline", {
                    points: u,
                    fill: "none",
                    stroke: "#b99751",
                    strokeWidth: c + 2.6 * n,
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    opacity: 0.5,
                  })
                : null,
              React.createElement("polyline", {
                points: u,
                fill: "none",
                stroke: p,
                strokeWidth: c,
                strokeLinecap: "round",
                strokeLinejoin: "round",
                strokeDasharray: ye(i.line, n, h),
              }),
              a ? null : Se(i, u, c, n, "fl" + e),
              we(o, n, p, i.dir, "a" + e + "_"),
              bt && !i.hideLabel && y
                ? React.createElement(
                    "text",
                    {
                      x: g.x,
                      y: g.y - (7 * n + 1.6 * c),
                      textAnchor: "middle",
                      fontSize: 12.5 * n,
                      fontWeight: 600,
                      fill: p,
                      stroke: "#fff",
                      strokeWidth: 3.2 * n,
                      paintOrder: "stroke",
                      style: { fontFamily: "'Cairo',sans-serif", pointerEvents: "none" },
                    },
                    y,
                  )
                : null,
            );
          })
          .filter(Boolean),
        dsPathHandleNodes:
          "zones" === s.lens && yt && "select" === s.tool && s.dsSel && "path" === s.dsSel.t && ((_ && _.paths) || [])[s.dsSel.i]
            ? (() => {
                const t = s.dsSel.i,
                  e = (s.dsPathTmp && s.dsPathTmp.i === t ? { pts: s.dsPathTmp.pts } : (_.paths || [])[t]).pts || [],
                  n = s.dview.w / 1e3,
                  i = [],
                  o = () => ((this._curFloorPaths()[t] || {}).pts || []).slice();
                for (let s = 0; s < e.length - 1; s++) {
                  const r = e[s],
                    a = e[s + 1],
                    l = (r.x + a.x) / 2,
                    d = (r.y + a.y) / 2;
                  i.push(
                    React.createElement("circle", {
                      key: "pm" + s,
                      cx: l,
                      cy: d,
                      r: 2.6 * n,
                      fill: "#fff",
                      stroke: "#b99751",
                      strokeWidth: 1.1 * n,
                      strokeDasharray: 1.8 * n + " " + 1.6 * n,
                      opacity: 0.85,
                      style: { cursor: "copy" },
                      onPointerDown: (e) => {
                        if ((e.stopPropagation(), e.detail >= 2)) return;
                        /* W1-C1: الرأسُ المُضاف حالةٌ مؤقّتة (dsPathTmp) كمسار الخطة — لا كتابةَ في الجولة عند الضغط؛ يعتمده الرفعُ إن تحرّك (dsUp).
                           كانت الضغطةُ تكتبه في الجولة فوراً، فإن نزل إصبعٌ ثانٍ (تكبير) ألغت طبقةُ الإدخال السحبَ ولم تبلغ كتابتَه: رأسٌ شارد يُحفظ ويُزامَن */
                        const n = o(),
                          i = n.slice();
                        (i.splice(s + 1, 0, { x: l, y: d }),
                          this.setState({
                            dspvdrag: { i: t, j: s + 1, added: !0, moved: !1, pts0: n, pts: i, sx: l, sy: d },
                            dsPathTmp: { i: t, pts: i },
                            dsPan: null,
                          }));
                      },
                      onDoubleClick: (e) => {
                        (e.stopPropagation(), this.setState({ dspvdrag: null, dspdrag: null }), this._dsOpenPathEditor(t, !1));
                      },
                    }),
                  );
                }
                return (
                  e.forEach((e, s) =>
                    i.push(
                      React.createElement("circle", {
                        key: "pv" + s,
                        cx: e.x,
                        cy: e.y,
                        r: 3.6 * n,
                        fill: "#fff",
                        stroke: "#b99751",
                        strokeWidth: 1.5 * n,
                        style: { cursor: "grab" },
                        onPointerDown: (e) => {
                          (e.stopPropagation(), this.setState({ dspvdrag: { i: t, j: s, pts: o() }, dsPan: null }));
                        },
                        onDoubleClick: (e) => {
                          e.stopPropagation();
                          const n = o();
                          n.length <= 2 ||
                            (this._updRound((e) => {
                              const i = (e.paths || [])[t];
                              i && (i.pts = n.filter((t, e) => e !== s));
                            }),
                            this.setState({ dsPathTmp: null }));
                        },
                      }),
                    ),
                  ),
                  React.createElement("g", null, i)
                );
              })()
            : null,
        mapGateNodes: ((_ && this.bsLensOn("gates") && _.gates) || []).map((t, e) => {
          const n = s.dview.w / 1e3,
            i = KIVO.BassamLeaf,
            o = s.gExp || {},
            r = _.gates || [];
          if (t && t.pOf && !o[t.pOf]) return null;
          const a = i.isParent(t),
            l = a ? i.leavesOf(r, t) : null,
            d = a ? i.agg(r, t, null, ss) : null,
            p = a ? l.filter((t) => (t.emp || []).filter(ss).length > 0).length : 0,
            h = t && t.pOf ? i.parentOf(r, t) : null,
            c = s.dsSel && "gate" === s.dsSel.t && (s.dsSel.i === e || (Array.isArray(s.selMulti) && s.selMulti.indexOf(e) >= 0)),
            g = a ? d.n > 0 && 0 === d.open : !!t.closed,
            u = !("gates" === s.lens),
            y = ks.on && "gates" === ks.kind ? ks.stateOf(t) : null,
            m = (() => {
              try {
                const e = KIVO.BassamField;
                if (!e || a || (!t.fAt && !t.closed)) return null;
                const s = e.stateOf(t, "gates");
                return "open" === s ? null : e.STATES[s];
              } catch (t) {
                return null;
              }
            })(),
            x = m
              ? m.c
              : y
                ? y.color
                : "dist" === s.lens || ("gates" === s.lens && s.dsAsn)
                  ? g
                    ? "#64748b"
                    : a
                      ? 0 === p
                        ? "#dc2626"
                        : p === d.open
                          ? "#16a34a"
                          : "#e5b563"
                      : (t.emp || []).filter(ss).length > 0
                        ? "#16a34a"
                        : "#dc2626"
                  : u
                    ? "#94a3b8"
                    : g
                      ? "#64748b"
                      : "#16a34a",
            b = !(
              !y ||
              !ks.filter ||
              y.st === ks.filter ||
              (t.pOf && ks.stTop[r.findIndex((e) => e.gid === t.pOf)] && ks.stTop[r.findIndex((e) => e.gid === t.pOf)].st === ks.filter)
            );
          return (
            [t.hideNum || "" === (t.num || "") ? null : "#" + t.num, t.hideLabel ? null : t.label || t.name || "باب"]
              .filter(Boolean)
              .join(" · "),
            React.createElement(
              "g",
              {
                key: "g" + f + "_" + e,
                onClick:
                  U && "density" !== s.lens && !J
                    ? (n) => {
                        this._dsDragged ||
                          (a && (this._togLeafExp(t.gid), "dist" === s.lens || ("gates" === s.lens && s.dsAsn))) ||
                          this._pickSel("gate", e, !(!n || (!n.ctrlKey && !n.metaKey)));
                      }
                    : void 0,
                onDoubleClick:
                  U && "density" !== s.lens
                    ? (t) => {
                        t.stopPropagation();
                        try {
                          for (
                            var s = t.currentTarget.ownerSVGElement || t.currentTarget.closest("svg"), n = s ? s.parentElement : null;
                            n && n !== document.body && "static" === getComputedStyle(n).position;

                          )
                            n = n.parentElement;
                          var i = (n || document.body).getBoundingClientRect(),
                            o = Math.max(6, Math.min(t.clientX - i.left + 10, i.width - 210)),
                            r = Math.max(6, Math.min(t.clientY - i.top + 10, i.height - 96));
                          this.setState({ dsGateFly: { i: e, kind: "gates", left: o, top: r }, zDd: null, bDd: null, fldOpen: null });
                        } catch (t) {}
                      }
                    : void 0,
                onMouseEnter: () => {
                  this.state.dsHovG !== e && this.setState({ dsHovG: e });
                },
                onMouseLeave: () => {
                  this.state.dsHovG === e && this.setState({ dsHovG: null });
                },
                style: { cursor: U && "density" !== s.lens ? "pointer" : "default", pointerEvents: u ? "none" : "auto" },
                opacity: b ? 0.15 : u ? 0.45 : 1,
              },
              h
                ? React.createElement("line", {
                    x1: h.x,
                    y1: h.y,
                    x2: t.x,
                    y2: t.y,
                    stroke: "#b99751",
                    strokeWidth: 0.9 * n,
                    strokeDasharray: 2.2 * n + " " + 2 * n,
                    opacity: 0.75,
                    style: { pointerEvents: "none" },
                  })
                : null,
              React.createElement("circle", {
                cx: t.x,
                cy: t.y,
                r: (c ? 8.5 : y && "red" === y.st ? 8 : 5) * n,
                fill: x,
                opacity: y && "non" === y.st ? 0 : c ? 0.4 : y && "red" === y.st ? 0.3 : 0.22,
              }),
              c
                ? React.createElement("circle", {
                    cx: t.x,
                    cy: t.y,
                    r: 7.4 * n,
                    fill: "none",
                    stroke: "#b99751",
                    strokeWidth: 1.4 * n,
                    opacity: 0.95,
                  })
                : null,
              React.createElement("circle", {
                cx: t.x,
                cy: t.y,
                r: 3.4 * n,
                fill: y && "non" === y.st ? "#fff" : x,
                stroke: y && "non" === y.st ? "#94a3b8" : "#fff",
                strokeDasharray: y && "non" === y.st ? 1.5 * n + " " + 1 * n : void 0,
                strokeWidth: (c ? 1.7 : 1.2) * n,
              }),
              y && y.lbl && !y.closed
                ? React.createElement(
                    "text",
                    {
                      x: t.x,
                      y: t.y - 6 * n,
                      textAnchor: "middle",
                      fontSize: 5.2 * n,
                      fontWeight: 700,
                      fill: x,
                      stroke: "#fff",
                      strokeWidth: 1.2 * n,
                      paintOrder: "stroke",
                      style: { fontFamily: "'Cairo',sans-serif", fontFeatureSettings: "'tnum'", pointerEvents: "none" },
                    },
                    y.lbl,
                  )
                : null,
              y && y.pendN > 0
                ? React.createElement(
                    "g",
                    { style: { pointerEvents: "none" } },
                    React.createElement("circle", {
                      cx: t.x + 3.6 * n,
                      cy: t.y - 3.6 * n,
                      r: 2.6 * n,
                      fill: "#e5b563",
                      stroke: "#fff",
                      strokeWidth: 0.8 * n,
                    }),
                    React.createElement(
                      "text",
                      {
                        x: t.x + 3.6 * n,
                        y: t.y - 2.3 * n,
                        textAnchor: "middle",
                        fontSize: 3.4 * n,
                        fontWeight: 700,
                        fill: "#fff",
                        style: { fontFamily: "'Cairo',sans-serif" },
                      },
                      String(y.pendN),
                    ),
                  )
                : null,
              g
                ? React.createElement("line", {
                    x1: t.x - 4.8 * n,
                    y1: t.y + 4.8 * n,
                    x2: t.x + 4.8 * n,
                    y2: t.y - 4.8 * n,
                    stroke: "#fff",
                    strokeWidth: 1.4 * n,
                    strokeLinecap: "round",
                    style: { pointerEvents: "none" },
                  })
                : null,
              ...(() => {
                try {
                  const e = KIVO.BassamField;
                  if (!e || a) return [];
                  const s = e.stateOf(t),
                    i = this.bsLensOn("paths") ? e.flowOf(t) : "",
                    o = !(!t.fAt || !e.stale(t)),
                    r = [];
                  return (
                    i &&
                      "closed" !== s &&
                      r.push(
                        React.createElement(
                          "text",
                          {
                            key: "fdf",
                            x: t.x,
                            y: t.y + 11.5 * n,
                            textAnchor: "middle",
                            fontSize: 6.5 * n,
                            fontWeight: 800,
                            fill: o ? "#94a3b8" : e.FLOWS[i].c || "#9A7E40",
                            stroke: "#fff",
                            strokeWidth: 1.6 * n,
                            paintOrder: "stroke",
                            style: { fontFamily: "'Cairo',sans-serif", pointerEvents: "none" },
                          },
                          e.FLOWS[i].a,
                        ),
                      ),
                    r
                  );
                } catch (t) {
                  return [];
                }
              })(),
              !bt || t.hideNum || ("" === (t.num || "") && !t.pOf)
                ? null
                : React.createElement(
                    "text",
                    {
                      x: t.x,
                      y: t.y - 7.5 * n,
                      textAnchor: "middle",
                      fontSize: (t.pOf ? 8 : 11) * n,
                      fontWeight: 800,
                      fill: x,
                      stroke: "#fff",
                      strokeWidth: 3 * n,
                      paintOrder: "stroke",
                      style: { fontFamily: "'Cairo',sans-serif", fontFeatureSettings: "'tnum'", pointerEvents: "none" },
                    },
                    t.pOf ? ("" !== (t.num || "") ? String(t.num) + "-" : "") + String(t.leafNo || "") : String(t.num),
                  ),
              !bt || t.hideLabel || t.pOf || (!t.label && !t.name)
                ? null
                : React.createElement(
                    "text",
                    {
                      x: t.x,
                      y: t.y - (t.hideNum || "" === (t.num || "") ? 8 : 20) * n,
                      textAnchor: "middle",
                      fontSize: 6.5 * n,
                      fontWeight: 600,
                      fill: x,
                      stroke: "#fff",
                      strokeWidth: 2.2 * n,
                      paintOrder: "stroke",
                      style: { fontFamily: "'Cairo',sans-serif", pointerEvents: "none" },
                    },
                    t.label || t.name || "باب",
                  ),
              a
                ? React.createElement(
                    "g",
                    {
                      className: "bs-leafbadge",
                      style: { cursor: "pointer" },
                      onClick: (e) => {
                        (e.stopPropagation(), this._togLeafExp(t.gid));
                      },
                      onDoubleClick: (t) => {
                        t.stopPropagation();
                      },
                    },
                    React.createElement("circle", {
                      cx: t.x + 6.8 * n,
                      cy: t.y - 6.4 * n,
                      r: 4.4 * n,
                      fill: o[t.gid] ? "#9A7E40" : "#b99751",
                      stroke: "#fff",
                      strokeWidth: 1.2 * n,
                    }),
                    React.createElement(
                      "text",
                      {
                        x: t.x + 6.8 * n,
                        y: t.y - 4.9 * n,
                        textAnchor: "middle",
                        fontSize: 5.6 * n,
                        fontWeight: 800,
                        fill: "#fff",
                        style: { fontFamily: "'Cairo',sans-serif", fontFeatureSettings: "'tnum'", pointerEvents: "none" },
                      },
                      String(d.n),
                    ),
                  )
                : null,
            )
          );
        }),
        mapMarkNodes: ((et && _ && this.bsLensOn("marks") && _.marks) || []).map((t, e) => {
          const n = s.dview.w / 1e3,
            i = s.dsSel && "mark" === s.dsSel.t && (s.dsSel.i === e || (Array.isArray(s.selMulti) && s.selMulti.indexOf(e) >= 0)),
            o = !(!s.flash || "mark" !== s.flash.t || s.flash.i !== e),
            r = !!t.off,
            a = !("marks" === s.lens),
            l = ks.on && "marks" === ks.kind ? ks.stateOf(t) : null,
            d = (() => {
              try {
                const e = KIVO.BassamField;
                if (!e || (!t.fAt && !t.off)) return null;
                const s = e.stateOf(t, "marks");
                return "open" === s ? null : e.STATES[s];
              } catch (t) {
                return null;
              }
            })(),
            p = d
              ? d.c
              : l
                ? l.color
                : "dist" === s.lens || ("marks" === s.lens && s.dsAsn)
                  ? r
                    ? "#64748b"
                    : (t.emp || []).filter(ss).length > 0
                      ? "#16a34a"
                      : "#dc2626"
                  : a
                    ? "#94a3b8"
                    : r
                      ? "#64748b"
                      : "#9c3d6b",
            h = !(!l || !ks.filter || l.st === ks.filter),
            c = t.hideLabel ? "" : t.label || "",
            g = !(!U || J || "marks" !== s.lens || s.dsAsn);
          return React.createElement(
            "g",
            {
              key: "mk" + f + "_" + e,
              onClick:
                U && "density" !== s.lens && !J && "select" === s.tool
                  ? (t) => {
                      this._dsDragged || this._pickSel("mark", e, !(!t || (!t.ctrlKey && !t.metaKey)));
                    }
                  : void 0,
              onMouseEnter: () => {
                this.state.dsHovM !== e && this.setState({ dsHovM: e });
              },
              onMouseLeave: () => {
                this.state.dsHovM === e && this.setState({ dsHovM: null });
              },
              onDoubleClick: g
                ? (t) => {
                    (t.stopPropagation(), this.openMarkEditor(e, !1));
                  }
                : void 0,
              style: {
                cursor: U && "density" !== s.lens && "select" === s.tool ? "pointer" : "default",
                pointerEvents: a ? "none" : "auto",
              },
              opacity: h ? 0.15 : a ? 0.45 : 1,
            },
            React.createElement("circle", {
              cx: t.x,
              cy: t.y,
              r: (o ? 12 : i ? 8.5 : l && "red" === l.st ? 8 : 5) * n,
              fill: p,
              opacity: l && "non" === l.st ? 0 : o ? 0.6 : i ? 0.4 : l && "red" === l.st ? 0.3 : 0.22,
            }),
            o || i
              ? React.createElement("circle", {
                  cx: t.x,
                  cy: t.y,
                  r: (o ? 10.5 : 7.4) * n,
                  fill: "none",
                  stroke: "#b99751",
                  strokeWidth: 1.4 * n,
                  opacity: 0.95,
                })
              : null,
            React.createElement("circle", {
              cx: t.x,
              cy: t.y,
              r: 3.4 * n,
              fill: l && "non" === l.st ? "#fff" : p,
              stroke: l && "non" === l.st ? "#94a3b8" : "#fff",
              strokeDasharray: l && "non" === l.st ? 1.5 * n + " " + 1 * n : void 0,
              strokeWidth: (o ? 2.4 : i ? 1.7 : 1.2) * n,
            }),
            l && l.lbl && !l.closed
              ? React.createElement(
                  "text",
                  {
                    x: t.x,
                    y: t.y - 6 * n,
                    textAnchor: "middle",
                    fontSize: 5.2 * n,
                    fontWeight: 700,
                    fill: p,
                    stroke: "#fff",
                    strokeWidth: 1.2 * n,
                    paintOrder: "stroke",
                    style: { fontFamily: "'Cairo',sans-serif", fontFeatureSettings: "'tnum'", pointerEvents: "none" },
                  },
                  l.lbl,
                )
              : null,
            l && l.pendN > 0
              ? React.createElement(
                  "g",
                  { style: { pointerEvents: "none" } },
                  React.createElement("circle", {
                    cx: t.x + 3.6 * n,
                    cy: t.y - 3.6 * n,
                    r: 2.6 * n,
                    fill: "#e5b563",
                    stroke: "#fff",
                    strokeWidth: 0.8 * n,
                  }),
                  React.createElement(
                    "text",
                    {
                      x: t.x + 3.6 * n,
                      y: t.y - 2.3 * n,
                      textAnchor: "middle",
                      fontSize: 3.4 * n,
                      fontWeight: 700,
                      fill: "#fff",
                      style: { fontFamily: "'Cairo',sans-serif" },
                    },
                    String(l.pendN),
                  ),
                )
              : null,
            r
              ? React.createElement("line", {
                  x1: t.x - 4.8 * n,
                  y1: t.y + 4.8 * n,
                  x2: t.x + 4.8 * n,
                  y2: t.y - 4.8 * n,
                  stroke: "#fff",
                  strokeWidth: 1.4 * n,
                  strokeLinecap: "round",
                  style: { pointerEvents: "none" },
                })
              : null,
            c && bt
              ? React.createElement(
                  "text",
                  {
                    x: t.x,
                    y: t.y - 8 * n,
                    textAnchor: "middle",
                    fontSize: 6 * n,
                    fontWeight: 600,
                    fill: p,
                    style: { fontFamily: "'Cairo',sans-serif", pointerEvents: "none" },
                  },
                  c,
                )
              : null,
          );
        }),
        floorImgNode:
          s.fimgs && s.fimgs[f]
            ? ((s9, N9) =>
                React.createElement(
                  React.Fragment,
                  null,
                  React.createElement("image", {
                    className: "bs-map-day",
                    href: s9,
                    x: 0,
                    y: 0,
                    width: 1e3,
                    height: 600,
                    preserveAspectRatio: "xMidYMid meet",
                    style: { pointerEvents: "none" },
                  }),
                  N9
                    ? React.createElement("image", {
                        className: "bs-map-night",
                        "data-night-key": N9.key(s9),
                        href: N9.url(s9) || void 0,
                        x: 0,
                        y: 0,
                        width: 1e3,
                        height: 600,
                        preserveAspectRatio: "xMidYMid meet",
                        style: { display: "none", pointerEvents: "none" },
                      })
                    : null,
                ))(s.fimgs[f], KIVO.BassamMapNight)
            : null,
        dsSectorNodes: (() => {
          try {
            const t = this._opRead("bassam_plan_v1");
            if (!t) return null;
            const e = t.months && t.months[s.year + "-" + s.month],
              n = e ? (Array.isArray(e) ? e : e.d) : null,
              i = Array.isArray(n) && n[f] ? n[f] : (t.floors || [])[f];
            if (
              !i ||
              !0 === i.hideSectors ||
              !Array.isArray(i.sectors) ||
              !i.sectors.length
            )
              return null;
            const o = s.dview.w / 1e3;
            return React.createElement(
              "g",
              { key: "dsSec" + f, style: { pointerEvents: "none" } },
              i.sectors
                .filter((t) => t && Array.isArray(t.pts) && t.pts.length >= 3)
                .map((t, e) => {
                  const s = t.pts.map((t) => t.x),
                    n = t.pts.map((t) => t.y),
                    i = (Math.min(...s) + Math.max(...s)) / 2,
                    r = Math.min(...n),
                    a = [t.code, t.name].filter(Boolean).join(" · ") || "نطاق",
                    l = Math.max(7.5, Math.min(11, 120 / Math.max(1, a.length))) * o,
                    d = 0.62 * l * a.length + 14 * o,
                    h = 1.9 * l,
                    c = t.color || "#b99751";
                  return React.createElement(
                    "g",
                    { key: "s" + e },
                    React.createElement("path", {
                      d: "M" + t.pts.map((t) => t.x + " " + t.y).join(" L") + " Z",
                      fill: c,
                      fillOpacity: 0.06,
                      stroke: c,
                      strokeWidth: 1.3 * o,
                      strokeDasharray: 9 * o + " " + 5 * o,
                      strokeOpacity: 0.55,
                      strokeLinejoin: "round",
                    }),
                    !0 === t.showLbl
                      ? React.createElement(
                          "g",
                          { transform: "translate(" + (i - d / 2) + "," + (r - h / 2) + ")", opacity: 0.75 },
                          React.createElement("rect", { width: d, height: h, rx: h / 2, fill: c, stroke: "#fff", strokeWidth: 0.9 * o }),
                          React.createElement(
                            "text",
                            {
                              x: d / 2,
                              y: 0.68 * h,
                              textAnchor: "middle",
                              fontSize: l,
                              fontWeight: 700,
                              fill: "#fff",
                              style: { fontFamily: "'Cairo',sans-serif" },
                            },
                            a,
                          ),
                        )
                      : null,
                  );
                }),
            );
          } catch (t) {
            return null;
          }
        })(),
        panelHasData: !tn,
        panelEmpty: tn,
        panelEmptyTitle: en.t,
        panelEmptyText: en.x,
        panelEmptyP1: en.p1,
        panelEmptyP2: en.p2,
        panelTabs: Pe,
        panelKpis: tn ? [] : Re,
        catRows: Us,
        showKpis:
          !tn &&
          Re.length > 0 &&
          !(
            this.bsLensOn("dist") &&
            (("gates" === Te && "cov" === s.gateDim) || ("marks" === Te && "cov" === s.markDim) || ("zones" === Te && "cov" === s.brkDim))
          ),
        covRegOff: !(
          this.bsLensOn("dist") &&
          (("gates" === Te && "cov" === s.gateDim) || ("marks" === Te && "cov" === s.markDim) || ("zones" === Te && "cov" === s.brkDim))
        ),
        heroTiles: Wn,
        showHeroTiles: Wn.length > 0,
        kpiGridStyle:
          "display:grid;gap:8px;grid-template-columns:repeat(" +
          (Wn.length ? 2 : 3) +
          ",1fr)",
        registryRows: tn ? [] : jn,
        ...(() => {
          const t = "zones" === Te && pn.length > 0,
            e = KIVO.BassamMix.marks(Us.map((t) => ({ n: +t.count }))),
            n = t
              ? bn
              : Us.map((t, s) => ({
                  label: t.label,
                  count: t.count,
                  pct: t.pct,
                  hasSwatch: !0,
                  swatch: yn(t.color),
                  pctAll: t.pct + "٪",
                  subPct: "font-size:8px;font-weight:400;opacity:.62;margin-right:2px;letter-spacing:0",
                  markOn: !!KIVO.BassamMix.markOf(e, s),
                  mark: (KIVO.BassamMix.markOf(e, s) || {}).ch,
                  markTitle: (KIVO.BassamMix.markOf(e, s) || {}).title,
                  markStyle: KIVO.BassamMix.markStyle,
                  tip: t.label + " — " + t.count + " (" + t.pct + "٪)",
                  ...KIVO.BassamMix.rowStyles({ pc: t.pct, lead: !1, color: t.color, track: t.color + "1f", num: t.color, numWidth: 24 }),
                }));
          return {
            mixTabs: "zones" === Te || "paths" === Te ? fn : "gates" === Te ? ws : "marks" === Te ? Ts : "dist" === Te ? as : zt ? fn : [],
            showMixTabs:
              kn ||
              t ||
              ("zones" === Te && "dsum" === s.brkDim) ||
              "paths" === Te ||
              ("gates" === Te && ws.length > 0) ||
              ("marks" === Te && Ts.length > 0) ||
              ("dist" === Te && as.length > 0) ||
              zt,
            showSplitHdr: t && "zstate" !== ln,
            mixRows: n,
            showDonutRing: !(("dist" === Te || "gates" === Te || "paths" === Te || "marks" === Te || zt) && 0 === n.length),
            mixEmptyOn: ("dist" === Te || "gates" === Te || "paths" === Te || "marks" === Te || zt) && 0 === n.length,
            mixEmptyText:
              "dist" === Te ? "لا بيانات لهذا البُعد — جرّب بُعداً آخر أو أكمل جدول الشهر" : "لا بيانات لهذا البُعد — جرّب بُعداً آخر",
            mixNoteOn: n.length > 0 && (("gates" === Te && gs) || ("dist" === Te && ("place" === qe || "cat" === qe))),
            mixNote:
              "dist" === Te
                ? "الموظف قد يُسكَّن على أكثر من عنصر — والنسبة من مجموع التسكينات"
                : "الباب قد يحمل أكثر من تخصيص — والنسبة من مجموع الانتماءات",
            donutCore:
              "width:66px;height:66px;border-radius:9999px;background:var(--bg-xffffff);display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:inset 0 2px 5px rgba(15,23,42,0.16),inset 0 -1px 0 rgba(255,255,255,0.9),inset 0 0 0 1px rgba(185,151,81,0.10)",
            donutNumStyle: "font-size:19px;font-weight:700;line-height:1;color:var(--fg-x9a7e40);font-feature-settings:'tnum'",
            doPrint: Bn,
            printTitle: "المنصة التشغيلية — الجولات اليومية",
            printMeta: "الموقع: " + (O[f] ? O[f][0] : "اختر موقعاً…"),
            printDate: new Date().toLocaleDateString("ar-SA-u-nu-latn", { year: "numeric", month: "long", day: "numeric" }),
            donutHitNode: "zones" === Te ? Pn : null,
            onHitNode: Ln,
            showOnRing: Dn,
            onDonutStyle: Tn,
            onCountText: String(Fn),
            onTotalText: String(Cn),
            donutCap:
              "dist" === Te
                ? "توزيع التسكين"
                : "gates" === Te
                  ? "توزيع الأبواب"
                  : "marks" === Te
                    ? "توزيع المعالم"
                    : "paths" === Te
                      ? "توزيع المسارات"
                      : zt
                        ? "توزيع المصليات بحسب الكثافة"
                        : "توزيع المصليات",
            donutStyle: t ? Mn : Xs,
            donutTotal: String(t ? hn : Ks),
            donutTitle: t ? "مؤشرات المصليات" : Hs,
            donutUnit: t ? "مصلى" : Ys,
            sumOn: kn,
            sumNode: vn,
            lensSumOn: zn,
            lensSumNode: En,
            showDonut:
              !kn &&
              !zn &&
              !tn &&
              !(
                this.bsLensOn("dist") &&
                (("gates" === Te && "cov" === s.gateDim) ||
                  ("marks" === Te && "cov" === s.markDim) ||
                  ("zones" === Te && "cov" === s.brkDim))
              ) &&
              (n.length > 0 ||
                ("dist" === Te && as.length > 0) ||
                ("gates" === Te && pe.length > 0) ||
                ("marks" === Te && ce.length > 0) ||
                ("paths" === Te && he.length > 0) ||
                (zt && de.length > 0)),
          };
        })(),
        panelClosed: !s.panelOpen,
        closePanel: () => this.setState({ panelOpen: !1 }),
        openPanel: () => this.setState({ panelOpen: !0 }),
        panelShellStyle:
          "order:-1;position:relative;width:var(--bs-panel-w);flex-shrink:0;align-self:stretch;transition:margin .35s cubic-bezier(0.22,1,0.36,1);" +
          (s.panelOpen ? "margin-left:0" : "margin-left:calc(-1 * var(--bs-panel-w) - 12px);pointer-events:none"),
        panelStyle:
          "position:absolute;top:0;right:0;bottom:0;left:0;border-radius:16px;border:1px solid var(--bd-a2252252250p7);background:var(--bg-xffffff);overflow:hidden;box-shadow:var(--shadow-card);display:flex;flex-direction:column;transition:transform .35s cubic-bezier(0.22,1,0.36,1),opacity .3s ease;" +
          (s.panelOpen ? "transform:translateX(0);opacity:1" : "transform:translateX(40px);opacity:0"),
        registryOpen: s.registryOpen,
        toggleRegistry: () =>
          this.setState((t) => ({ registryOpen: !t.registryOpen })),
        registryChev:
          "transition:transform .2s;" +
          (s.registryOpen ? "transform:rotate(180deg)" : ""),
        dsViewBox:
          s.dview.x + " " + s.dview.y + " " + s.dview.w + " " + s.dview.h,
        ...(() => {
          const t = (t) => {
              const e = KIVO.BassamPointer.rect((t.currentTarget && t.currentTarget.ownerSVGElement) || t.currentTarget),
                s = this.state.dview,
                n = Math.min(e.width / s.w, e.height / s.h),
                i = (e.width - s.w * n) / 2,
                o = (e.height - s.h * n) / 2;
              return {
                x: Math.max(0, Math.min(1e3, s.x + (t.clientX - e.left - i) / n)),
                y: Math.max(0, Math.min(600, s.y + (t.clientY - e.top - o) / n)),
              };
            },
            e = (t, e, s) => {
              const n = this.state.dview;
              let i = Math.max(25, Math.min(1e3, n.w * s));
              const o = 0.6 * i;
              let r = t - (t - n.x) * (i / n.w),
                a = e - (e - n.y) * (i / n.w);
              ((r = Math.max(0, Math.min(1e3 - i, r))),
                (a = Math.max(0, Math.min(600 - o, a))),
                this.setState({ dview: { x: r, y: a, w: i, h: o } }));
            };
          return {
            dsWheel: (s) => {
              const n = t(s);
              e(n.x, n.y, s.deltaY > 0 ? 1.15 : 1 / 1.15);
            },
            dsDown: KIVO.BassamPointer.w(
              "down",
              (e) => {
                if (
                  ((this._dsCapT = e.currentTarget),
                  (this._dsCapId = e.pointerId),
                  (this._dsDragged = !1),
                  this.state.dsGateFly && this.setState({ dsGateFly: null }),
                  "mark" === this.state.tool && this._dsCanEditMarks())
                )
                  return void this._dsAddMarkAt(t(e));
                if (this._dsCanEditZones() && "select" !== this.state.tool) {
                  const s = t(e),
                    n = this.state.tool;
                  if ("rect" === n || "square" === n || "circle" === n) {
                    const t = this.state.draft;
                    return void (t && t.click
                      ? this._dsCommitDraft({ ...t, cx: s.x, cy: s.y }, n) || this.setState({ draft: null })
                      : this.setState({ draft: { x: s.x, y: s.y, cx: s.x, cy: s.y }, dsSel: null, selMulti: [] }));
                  }
                  if ("poly" === n) {
                    const t = this.state.dsPolyPts;
                    if (t.length >= 3) {
                      const e = t[0];
                      if (Math.hypot(s.x - e.x, s.y - e.y) <= (this.state.dview.w / 1e3) * 14) return void this._dsAddZoneFromPts(t);
                    }
                    const n =
                      e.shiftKey && t.length > 0
                        ? (() => {
                            const e = t[t.length - 1];
                            return Math.abs(s.x - e.x) > Math.abs(s.y - e.y) ? { x: s.x, y: e.y } : { x: e.x, y: s.y };
                          })()
                        : s;
                    return void this.setState({ dsPolyPts: [...t, n], dsSel: null, selMulti: [] });
                  }
                  if ("path" === n) {
                    const t = this.state.dsPolyPts;
                    if (t.length >= 2) {
                      const e = t[t.length - 1];
                      if (Math.hypot(s.x - e.x, s.y - e.y) <= (this.state.dview.w / 1e3) * 10) return void this._dsAddPathFromPts(t);
                    }
                    const n =
                      e.shiftKey && t.length > 0
                        ? (() => {
                            const e = t[t.length - 1];
                            return Math.abs(s.x - e.x) > Math.abs(s.y - e.y) ? { x: s.x, y: e.y } : { x: e.x, y: s.y };
                          })()
                        : s;
                    return void this.setState({ dsPolyPts: [...t, n], dsSel: null, selMulti: [] });
                  }
                }
                const s = KIVO.BassamPointer.rect((e.currentTarget && e.currentTarget.ownerSVGElement) || e.currentTarget),
                  n = this.state.dview,
                  i = Math.min(s.width / n.w, s.height / n.h),
                  p = { cx: e.clientX, cy: e.clientY, vx: n.x, vy: n.y, sc: i },
                  c = this._dsCanEditZones() && !!this.state.dsSel;
                /* CANVAS-4 (W1): باللمس والقلم ولا تحديدَ يُلغى — مرساةُ السحب في الحالة بلا رسمٍ للصفحة عند الضغط (يرسمها الرفع) */
                "mouse" === e.pointerType || c
                  ? this.setState({ dsPan: p, dsSel: this._dsCanEditZones() ? null : this.state.dsSel })
                  : (this.state = { ...this.state, dsPan: p });
              },
              this._bpA ||
                (this._bpA = KIVO.BassamPointer.api(
                  () => this.state.dview,
                  (v) => this.setState({ dview: v }),
                  () => {
                    try {
                      this.state.draft && this.setState({ draft: null });
                    } catch (e) {}
                  },
                  this,
                  "daily",
                )),
            ),
            dsMove: KIVO.BassamPointer.w(
              "move",
              (e) => {
                if (this.state.zdrag) {
                  const s = t(e),
                    n = this.state.zdrag,
                    i = s.x - n.sx,
                    o = s.y - n.sy;
                  if (Math.abs(i) + Math.abs(o) > 0.5) {
                    if (!this._dsDragged)
                      try {
                        this._dsCapT &&
                          null != this._dsCapId &&
                          this._dsCapT.setPointerCapture &&
                          this._dsCapT.setPointerCapture(this._dsCapId);
                      } catch (t) {}
                    this._dsDragged = !0;
                  }
                  const r = n.pts.map((t) => ({ x: t.x + i, y: t.y + o }));
                  return void this.setState({ dsZoneTmp: { i: n.i, z: this._dsZoneFromPts(n.z, r, n.hs) } });
                }
                if (this.state.vdrag) {
                  const s = t(e),
                    n = this.state.vdrag,
                    i = n.pts.map((t, e) => (e === n.j ? { x: s.x, y: s.y } : t));
                  return void this.setState({ dsZoneTmp: { i: n.i, z: this._dsZoneFromPts(n.z, i, n.hs) }, vdrag: { ...n, pts: i } });
                }
                if (this.state.edrag) {
                  const s = t(e),
                    n = this.state.edrag;
                  let i = s.x - n.sx,
                    o = s.y - n.sy;
                  e.shiftKey && (Math.abs(i) > Math.abs(o) ? (o = 0) : (i = 0));
                  const r = n.pts.map((t, e) => (e === n.a || e === n.b ? { x: t.x + i, y: t.y + o } : t));
                  return void this.setState({ dsZoneTmp: { i: n.i, z: this._dsZoneFromPts(n.z, r, n.hs) } });
                }
                if (this.state.tdrag) {
                  const s = t(e),
                    n = this.state.tdrag,
                    i = n.pts[n.j],
                    o = n.hs.map((t) => ({ in: { ...t.in }, out: { ...t.out } }));
                  return (
                    (o[n.j] = {
                      ...(o[n.j] || {}),
                      [n.side]: { x: Math.round(100 * (s.x - i.x)) / 100, y: Math.round(100 * (s.y - i.y)) / 100 },
                    }),
                    void this.setState({ dsZoneTmp: { i: n.i, z: this._dsZoneFromPts(n.z, n.pts, o) } })
                  );
                }
                if (this.state.cresize) {
                  const s = t(e),
                    n = this.state.cresize,
                    i = Math.max(4, Math.hypot(s.x - n.cx, s.y - n.cy)) / (n.r0 || 1),
                    o = n.pts.map((t) => ({
                      x: Math.round(100 * (n.cx + (t.x - n.cx) * i)) / 100,
                      y: Math.round(100 * (n.cy + (t.y - n.cy) * i)) / 100,
                    }));
                  return void this.setState({ dsZoneTmp: { i: n.i, z: this._dsZoneFromPts(n.z, o, n.hs) } });
                }
                if (this.state.rotdrag) {
                  const s = t(e),
                    n = this.state.rotdrag;
                  let i = Math.atan2(s.y - n.cy, s.x - n.cx) - n.startAng;
                  if (e.shiftKey) {
                    const t = Math.PI / 12;
                    i = Math.round(i / t) * t;
                  }
                  const o = Math.cos(i),
                    r = Math.sin(i),
                    a = n.pts.map((t) => ({
                      x: Math.round(100 * (n.cx + (t.x - n.cx) * o - (t.y - n.cy) * r)) / 100,
                      y: Math.round(100 * (n.cy + (t.x - n.cx) * r + (t.y - n.cy) * o)) / 100,
                    }));
                  return void this.setState({ rotdrag: { ...n, ang: i }, dsZoneTmp: { i: n.i, z: this._dsZoneFromPts(n.z, a, n.hs) } });
                }
                if (this.state.dspdrag) {
                  const s = t(e),
                    n = this.state.dspdrag,
                    i = s.x - n.sx,
                    o = s.y - n.sy;
                  if (Math.abs(i) + Math.abs(o) > 0.5) {
                    if (!this._dsDragged)
                      try {
                        this._dsCapT &&
                          null != this._dsCapId &&
                          this._dsCapT.setPointerCapture &&
                          this._dsCapT.setPointerCapture(this._dsCapId);
                      } catch (t) {}
                    this._dsDragged = !0;
                  }
                  return void this.setState({ dsPathTmp: { i: n.i, pts: n.pts.map((t) => ({ x: t.x + i, y: t.y + o })) } });
                }
                if (this.state.dspvdrag) {
                  const s = t(e),
                    n = this.state.dspvdrag,
                    i = null == n.sx || Math.hypot(s.x - n.sx, s.y - n.sy) > (this.state.dview.w / 1e3) * 1.6,
                    o = n.pts.map((t, e) => (e === n.j ? { x: s.x, y: s.y } : t)),
                    r = { dsPathTmp: { i: n.i, pts: o } };
                  return (i && !n.moved && (r.dspvdrag = { ...n, moved: !0 }), void this.setState(r));
                }
                if (this.state.draft) {
                  const s = t(e);
                  return void this.setState({ draft: { ...this.state.draft, cx: s.x, cy: s.y } });
                }
                if (("poly" === this.state.tool || "path" === this.state.tool) && this.state.dsPolyPts.length > 0) {
                  let s = t(e);
                  if (e.shiftKey) {
                    const t = this.state.dsPolyPts[this.state.dsPolyPts.length - 1];
                    s = Math.abs(s.x - t.x) > Math.abs(s.y - t.y) ? { x: s.x, y: t.y } : { x: t.x, y: s.y };
                  }
                  return void this.setState({ dsPolyCursor: s });
                }
                const s = this.state.dsPan;
                if (!s) return;
                if (Math.abs(e.clientX - s.cx) + Math.abs(e.clientY - s.cy) > 4) {
                  if (!this._dsDragged)
                    try {
                      this._dsCapT &&
                        null != this._dsCapId &&
                        this._dsCapT.setPointerCapture &&
                        this._dsCapT.setPointerCapture(this._dsCapId);
                    } catch (t) {}
                  this._dsDragged = !0;
                }
                const n = this.state.dview;
                let i = s.vx - (e.clientX - s.cx) / s.sc,
                  o = s.vy - (e.clientY - s.cy) / s.sc;
                ((i = Math.max(0, Math.min(1e3 - n.w, i))),
                  (o = Math.max(0, Math.min(600 - n.h, o))),
                  (i === n.x && o === n.y) ||
                    (this._bpA && KIVO.BassamPointer && KIVO.BassamPointer.panTo
                      ? KIVO.BassamPointer.panTo(this._bpA, { ...n, x: i, y: o })
                      : this.setState({ dview: { ...n, x: i, y: o } })));
              },
              this._bpA ||
                (this._bpA = KIVO.BassamPointer.api(
                  () => this.state.dview,
                  (v) => this.setState({ dview: v }),
                  () => {
                    try {
                      this.state.draft && this.setState({ draft: null });
                    } catch (e) {}
                  },
                  this,
                  "daily",
                )),
            ),
            dsUp: KIVO.BassamPointer.w(
              "up",
              () => {
                if (
                  this.state.zdrag ||
                  this.state.vdrag ||
                  this.state.edrag ||
                  this.state.tdrag ||
                  this.state.cresize ||
                  this.state.rotdrag
                ) {
                  let t = this.state.dsZoneTmp;
                  const e = this.state.rotdrag;
                  if (t && e && Math.abs(e.ang || 0) > 2e-4) {
                    let s =
                      (this._rotLab && "number" == typeof this._rotLab.lang0
                        ? this._rotLab.lang0
                        : "number" == typeof t.z.lang
                          ? t.z.lang
                          : 0) +
                      (180 * (e.ang || 0)) / Math.PI;
                    ((s = ((s % 360) + 360) % 360), s > 180 && (s -= 360), (t = { ...t, z: { ...t.z, lang: Math.round(10 * s) / 10 } }));
                  }
                  return (
                    (this._rotLab = null),
                    t &&
                      this._updRound((e) => {
                        Array.isArray(e.zones) && e.zones[t.i] && (e.zones[t.i] = t.z);
                      }),
                    void this.setState({
                      zdrag: null,
                      vdrag: null,
                      edrag: null,
                      tdrag: null,
                      cresize: null,
                      rotdrag: null,
                      dsZoneTmp: null,
                    })
                  );
                }
                if (this.state.dspdrag || this.state.dspvdrag) {
                  const t = this.state.dspvdrag;
                  /* W1-C1: ضغطةُ المنتصف بلا تحريك لا تُضيف رأساً — والرأسُ لم يُكتب في الجولة أصلاً، فلا كتابةَ تُعيده */
                  if (t && t.added && !t.moved) return void this.setState({ dspdrag: null, dspvdrag: null, dsPathTmp: null });
                  const e = this.state.dsPathTmp;
                  return (
                    e &&
                      this._updRound((t) => {
                        const s = (t.paths || [])[e.i];
                        s && (s.pts = e.pts);
                      }),
                    void this.setState({ dspdrag: null, dspvdrag: null, dsPathTmp: null })
                  );
                }
                const t = this.state.draft;
                if (t)
                  return (
                    Math.hypot(t.cx - t.x, t.cy - t.y) > (this.state.dview.w / 1e3) * 4
                      ? this._dsCommitDraft(t, this.state.tool) || this.setState({ draft: null })
                      : t.click || this.setState({ draft: { ...t, click: !0 } }),
                    void this.setState({ dsPan: null })
                  );
                this.setState({ dsPan: null });
              },
              this._bpA ||
                (this._bpA = KIVO.BassamPointer.api(
                  () => this.state.dview,
                  (v) => this.setState({ dview: v }),
                  () => {
                    try {
                      this.state.draft && this.setState({ draft: null });
                    } catch (e) {}
                  },
                  this,
                  "daily",
                )),
            ),
            dsDbl: () => {
              if (this._dsCanEditZones()) {
                if ("poly" === this.state.tool && this.state.dsPolyPts.length >= 3)
                  return void this._dsAddZoneFromPts(this.state.dsPolyPts);
                if ("path" === this.state.tool)
                  return void (this.state.dsPolyPts.length >= 2
                    ? this._dsAddPathFromPts(this.state.dsPolyPts)
                    : this.setState({ dsPolyPts: [], dsPolyCursor: null }));
                const t = this.state.dsSel;
                if ("select" === this.state.tool && t && "zone" === t.t) return void this.openZoneEditor(t.i, !1);
                if ("select" === this.state.tool && t && "path" === t.t) return void this._dsOpenPathEditor(t.i, !1);
              }
              this.setState({ dsPolyPts: [], dsPolyCursor: null });
            },
            dsSvgStyle:
              "position:absolute;inset:0;width:100%;height:100%;touch-action:none;-webkit-user-select:none;user-select:none;cursor:" +
              (s.dsPan ? "grabbing" : "zones" === s.lens && "select" !== s.tool ? "crosshair" : "grab"),
            zoomIn2: () => {
              const t = this.state.dview;
              e(t.x + t.w / 2, t.y + t.h / 2, 1 / 1.3);
            },
            zoomOut2: () => {
              const t = this.state.dview;
              e(t.x + t.w / 2, t.y + t.h / 2, 1.3);
            },
          };
        })(),
        ...(() => {
          const t = s.dsSel,
            n = t && "zone" === t.t && _ ? (_.zones || [])[t.i] : null,
            i = t && "gate" === t.t && _ ? (_.gates || [])[t.i] : null,
            o = t && "mark" === t.t && _ ? (_.marks || [])[t.i] : null;
          if (!t || (!n && !i && !o) || !U)
            return {
              showSelPanel: !1,
              selDistPanel: !1,
              selDensityPanel: !1,
              selGatePanel: !1,
              selLockedHint: !1,
              filteredAssignRows: [],
              assignSrcNote: "",
              assignSrcFromRep: !1,
              assignScopeOn: !1,
              assignScopeNote: "",
              assignGapOn: !1,
              assignGapMsg: "",
              assignShiftHas: !1,
              assignSearchOn: !1,
              assignQHas: !1,
              assignRestHas: !1,
              assignSearchEmpty: !1,
              assignTrunc: !1,
              otherShiftCounts: [],
              otherShiftCountsPresent: !1,
              assignFilterEmpty: !1,
              assignEmpty: !1,
              assignDbg: "",
              assignTruncMsg: "",
            };
          const r = J,
            a = Ot && (("gates" === s.lens && !!i) || ("zones" === s.lens && !!n) || ("marks" === s.lens && !!o));
          if (r)
            return {
              showSelPanel: !1,
              selDistPanel: !1,
              selDensityPanel: !1,
              selGatePanel: !1,
              selLockedHint: !1,
              filteredAssignRows: [],
              assignSrcNote: "",
              assignSrcFromRep: !1,
              assignScopeOn: !1,
              assignScopeNote: "",
              assignGapOn: !1,
              assignGapMsg: "",
              assignShiftHas: !1,
              assignSearchOn: !1,
              assignQHas: !1,
              assignRestHas: !1,
              assignSearchEmpty: !1,
              assignTrunc: !1,
              otherShiftCounts: [],
              otherShiftCountsPresent: !1,
              assignFilterEmpty: !1,
              assignEmpty: !1,
              assignDbg: "",
              assignTruncMsg: "",
            };
          const l = new Set(),
            d = [];
          Ft.forEach((t) => {
            if (t && t.name) {
              const e = Tt(t);
              e && !l.has(e) && (l.add(e), d.push(e));
            }
          });
          const p = n || i || o;
          (p.emp || []).forEach((t) => {
            const e = Nt(t);
            e && !l.has(e) && (l.add(e), d.push(e));
          });
          const h = {};
          Ft.forEach((t) => {
            const e = Dt[Tt(t)] || {};
            Yt[Tt(t)] && Rt(e.rest) && (h[Tt(t)] = 1);
          });
          const c = new Set((p.emp || []).map((t) => Nt(t))),
            g = Object.assign({}, h),
            f = {},
            u = {};
          let y = !1,
            x = {};
          try {
            const t = (this._opRead("bassam_dreport_v1") || {} || {})[
              T + "-" + s.month + "-" + m
            ];
            t &&
              t.shifts &&
              Object.keys(t.shifts).forEach((e) => {
                const s = t.shifts[e] || {};
                s.pulled &&
                  (s.roster || []).length &&
                  ((y = !0),
                  (x[e] = 1),
                  (s.roster || []).forEach((t) => {
                    t &&
                      t.ekey &&
                      ((u[t.ekey] = e),
                      "ab" === t.st
                        ? ((g[t.ekey] = 1), (f[t.ekey] = "ab"))
                        : "lv" === t.st
                          ? ((g[t.ekey] = 1), (f[t.ekey] = "lv"))
                          : "pm" === t.st && (f[t.ekey] || (f[t.ekey] = "pm")));
                  }),
                  Object.keys(s.tout || {}).forEach((t) => {
                    f[t] || ((f[t] = "tout"), (g[t] = 1));
                  }));
              });
          } catch (t) {}
          (Object.keys(f)
            .slice()
            .forEach((t) => {
              const e = Nt(t);
              e && e !== t && !f[e] && ((f[e] = f[t]), g[t] && (g[e] = 1), u[t] && (u[e] = u[t]));
            }),
            Object.keys(h).forEach((t) => {
              f[t] || (f[t] = "rest");
            }));
          const b = {
              ab: { txt: "غائب اليوم", bg: "rgba(220,38,38,0.12)", fg: "#b91c1c", bd: "rgba(220,38,38,0.32)", dot: "#dc2626" },
              lv: { txt: "في إجازة", bg: "rgba(14,116,144,0.12)", fg: "#0e7490", bd: "rgba(14,116,144,0.32)", dot: "#0e7490" },
              rest: { txt: "في راحة", bg: "rgba(245,158,11,0.12)", fg: "#b45309", bd: "rgba(245,158,11,0.32)", dot: "#e5b563" },
              pm: { txt: "مستأذن — يحتاج تغطية", bg: "rgba(201,112,42,0.12)", fg: "#C9702A", bd: "rgba(201,112,42,0.34)", dot: "#C9702A" },
              tout: { txt: "محوَّل لوردية أخرى", bg: "rgba(124,58,237,0.10)", fg: "#7e2a52", bd: "rgba(124,58,237,0.30)", dot: "#9c3d6b" },
            },
            k = [];
          (((_ && _.zones) || []).forEach((t) => {
            t !== p && k.push({ t: "zone", el: t });
          }),
            ((_ && _.gates) || []).forEach((t) => {
              t !== p && k.push({ t: "gate", el: t });
            }),
            ((_ && _.marks) || []).forEach((t) => {
              t !== p && k.push({ t: "mark", el: t });
            }));
          const v = { zone: "مصلى", gate: "باب", mark: "معلم" },
            w = (t) => {
              const e = t.el;
              return "gate" === t.t
                ? (null == e.num ? "" : String(e.num).trim()) || e.label || "باب"
                : "zone" === t.t
                  ? e.code || e.name || "مصلى"
                  : e.label || e.kind || "معلم";
            },
            S = d.map((t) => {
              return {
                name: Wt(t),
                shift: u[t] || Yt[t] || "",
                onRest: !!h[t],
                key: t,
                ...((e = t),
                (s = k.filter((t) => (t.el.emp || []).some((t) => Nt(t) === e)).map((t) => ({ code: w(t), word: v[t.t] }))),
                {
                  plcOn: s.length > 0,
                  plcShow: s.slice(0, 2),
                  plcMore: s.length > 2 ? s.length - 2 : 0,
                  plcMoreOn: s.length > 2,
                  plcTip: s.length
                    ? "مسكَّن أيضاً في: " +
                      s
                        .map(function (t) {
                          return t.word + " " + t.code;
                        })
                        .join("، ")
                    : "",
                }),
                stKind: f[t] || "",
                stOn: !!f[t],
                stTxt: (b[f[t]] || {}).txt || "",
                stStyle:
                  "flex-shrink:0;display:inline-flex;align-items:center;gap:3px;font-size:8px;font-weight:600;padding:1px 6px;border-radius:9999px;white-space:nowrap;background:" +
                  ((b[f[t]] || {}).bg || "transparent") +
                  ";color:" +
                  ((b[f[t]] || {}).fg || "#94a3b8") +
                  ";border:1px solid " +
                  ((b[f[t]] || {}).bd || "transparent"),
                stDot: "width:5px;height:5px;border-radius:9999px;flex-shrink:0;background:" + ((b[f[t]] || {}).dot || "#94a3b8"),
                gapOn: !(!g[t] || !c.has(t)),
                checked: c.has(t),
                toggle: () => {
                  const e = this.state.dsSel;
                  e &&
                    this._updRound((s) => {
                      const n = ("gate" === e.t ? s.gates || [] : "mark" === e.t ? s.marks || [] : s.zones || [])[e.i];
                      if (!n) return;
                      const i = n.emp || [],
                        o = i.some((e) => Nt(e) === t);
                      n.emp = o ? i.filter((e) => Nt(e) !== t) : i.concat([this._ck(t)]);
                    });
                },
              };
              var e, s;
            }),
            A = se && null == te ? "العرض شامل — والتسكين مقصور على " + se : "",
            z = y ? "القائمة من تقرير اليوم — من ليس على رأس العمل لا يظهر" : "لا تقرير يومي مسحوب لهذا اليوم — القائمة من الجدول الشهري",
            E = S.filter((t) => t.gapOn).length,
            M = se || te,
            O = (null == M ? S.slice() : S.filter((t) => (M === Gt ? !t.shift : t.shift === M))).sort(
              (t, e) => (e.checked ? 1 : 0) - (t.checked ? 1 : 0) || String(t.name).localeCompare(String(e.name), "ar"),
            ),
            F = String(s.assignQ || ""),
            C =
              ((D = F),
              String(null == D ? "" : D)
                .toLowerCase()
                .replace(/\u0640/g, "")
                .replace(/[\u064B-\u0652]/g, "")
                .replace(/[\u0623\u0625\u0622\u0671]/g, "ا")
                .replace(/\u0649/g, "ي")
                .replace(/\u0629/g, "ه")
                .replace(/[\u0624\u0626]/g, "ء")
                .trim());
          var D;
          const P = KIVO.BassamFind.filter(F, O, (t) => [t.name, t.shift, t.empno, t.cs]),
            L = P.filter((t) => ks.isSup(t.key)).map((t) => ({
              name: t.name,
              why: ks.supWhy[t.key] || "إشرافي",
              checked: t.checked,
              lift: t.toggle,
              stOn: t.stOn,
              stTxt: t.stTxt,
              stStyle: t.stStyle,
              stDot: t.stDot,
            })),
            B = [
              ["avail", "متاح للتسكين", !0, "حاضرون اليوم غير مسكَّنين في أي موقع — منهم يُسكَّن"],
              ["here", "مسكَّن هنا", !0, "المحدَّدون على هذا العنصر — إلغاء التحديد يرفعه"],
              ["else", "مسكَّنون في مواقع أخرى", !0, "حاضرون مسكَّنون في موقع آخر — تحديده هنا يجعله على موقعين"],
              ["pm", "مستأذن", !1, "خرج بإذن أثناء الوردية — موقعه يحتاج تغطية"],
              ["rest", "في راحة", !1, "يوم راحته الأسبوعية من الجدول"],
              ["ab", "غائب", !1, "أُشِّر غائباً في تقرير اليوم"],
              ["lv", "إجازة", !1, "إجازة مؤشَّرة في تقرير اليوم"],
              ["tout", "محوَّل لوردية أخرى", !1, "حُوِّل اليوم إلى وردية أخرى في تقرير اليوم"],
              ["sup", "طاقم إشرافي", !1, "قالب صلاحيات موسوم «إشرافي» أو رئيس/نائب الوردية — خارج التسكين"],
            ],
            N = {};
          (B.forEach((t) => {
            N[t[0]] = [];
          }),
            P.forEach((t) => {
              N[
                ((t) => {
                  if (ks.isSup(t.key)) return "sup";
                  if (t.checked) return "here";
                  const e = f[t.key] || "";
                  return "pm" === e || "rest" === e || "ab" === e || "lv" === e || "tout" === e ? e : t.plcOn ? "else" : "avail";
                })(t)
              ].push(t);
            }));
          const W = !!String(s.assignQ || "").trim(),
            j = (t, e) => {
              const n = s.dsAsnGrp || {};
              return !!W || (void 0 === n[t] ? e : !!n[t]);
            },
            I = B.map((t) => {
              const e = N[t[0]],
                s = t[2],
                n = j(t[0], "avail" === t[0] || "here" === t[0]);
              return {
                key: t[0],
                title: t[1],
                n: String(e.length),
                tip: t[3],
                act: s,
                view: !s,
                open: n,
                has: e.length > 0,
                tog: () =>
                  this.setState((e) => ({
                    dsAsnGrp: Object.assign({}, e.dsAsnGrp || {}, { [t[0]]: !j(t[0], "avail" === t[0] || "here" === t[0]) }),
                  })),
                chev: "transition:transform .2s;flex-shrink:0;" + (n ? "transform:rotate(180deg)" : ""),
                hdStyle:
                  "width:100%;display:flex;align-items:center;justify-content:space-between;gap:6px;height:26px;padding:0 6px;border:0;background:transparent;cursor:pointer;font-family:'Cairo',sans-serif;font-size:10px;font-weight:700;color:" +
                  (s ? "var(--fg-x475569)" : "var(--fg-x8a6f35)"),
                rows: e.slice(0, 500).map((e) => Object.assign({}, e, { why: "sup" === t[0] ? ks.supWhy[e.key] || "إشرافي" : "" })),
              };
            }).filter((t) => t.has),
            R = new Set();
          ((_ && _.zones) || []).concat((_ && _.gates) || []).forEach((t) =>
            (t.emp || []).forEach((t) => {
              const e = Nt(t);
              e && R.add(e);
            }),
          );
          const G = O.filter((t) => !g[t.key] && !ks.isSup(t.key)),
            Z = G.length,
            H = G.filter((t) => R.has(t.key)).length,
            Y = O.length - Z,
            K = Z ? Math.round((H / Z) * 100) : 0,
            X = Z > 0 && H === Z,
            V = X ? "#008450" : H > 0 ? "#b99751" : "#94a3b8",
            q = null == te ? "كل الورديات" : te === Gt ? "موظفون بلا وردية" : /^(ال)?وردية/.test(te) ? te : "وردية " + te,
            Q = Z
              ? q +
                " — سُكّن " +
                H +
                " من " +
                KIVO.BassamCount(Z, ["متاح واحد", "متاحَين", "متاحَين", "متاحين", "متاحاً", "متاح"], "g") +
                " اليوم" +
                (X ? " · اكتمل تسكين المتاحين" : " · تبقّى " + (Z - H)) +
                (Y ? " (و" + Y + " في راحة اليوم غير محسوبين)" : "")
              : "",
            $ = (() => {
              const t = {};
              return (
                null != te &&
                  (p.emp || []).forEach((e) => {
                    const s = Kt(e) || Gt;
                    s !== te && (t[s] = (t[s] || 0) + 1);
                  }),
                Ht.concat([Gt])
                  .filter((e) => t[e])
                  .map((e) => ({ name: e, label: Jt(e), color: Ut(e), count: t[e] }))
              );
            })(),
            tt = (t) => {
              const e = this.state.dsSel;
              if (!e || "zone" !== e.t) return;
              const s = nt;
              this._updRound((n) => {
                const i = (n.zones || [])[e.i];
                if (!i) return;
                const o = i.pc && "object" == typeof i.pc ? { ...i.pc } : {};
                (void 0 === o.fajr && null != i.count && "" !== i.count && (o.fajr = i.count), (o[s] = t), (i.pc = o), (i.count = null));
              });
            },
            et = (n && +n.capNow) || 0,
            st = (t) => tt(null == t ? null : { n: t, cap: et }),
            it = (t) => {
              tt(null != t ? (et > 0 ? { n: Math.round((et * t) / 100), cap: et } : { n: null, cap: 0, p: t }) : null);
            },
            ot = s.dsSel && "zone" === s.dsSel.t ? s.dsSel.i : -1,
            rt = s.occDraft,
            at = rt && rt.i === ot && rt.pid === nt ? rt : null,
            lt = n && null == n.count && null == n.nNow,
            dt = n && null != n.count ? +n.count : null,
            pt = n && null != n.nNow ? +n.nNow : null,
            ht = (t) =>
              String(null == t ? "" : t)
                .replace(/[٠-٩]/g, (t) => String(t.charCodeAt(0) - 1632))
                .replace(/[۰-۹]/g, (t) => String(t.charCodeAt(0) - 1776));
          return (
            (this._occApply = { n: st, p: it, curN: pt, curP: dt }),
            {
              showSelPanel:
                (("zones" !== s.lens && "gates" !== s.lens && "marks" !== s.lens) || a) &&
                !("dist" === s.lens && !this.bsLensOn("dist")) &&
                !("density" === s.lens && !this.bsLensOn("dens")),
              selLabel: n
                ? n.code || "مصلى"
                : i
                  ? (() => {
                      const t = KIVO.BassamLeaf,
                        e = i.pOf ? t.leafLabel(t.parentOf(_.gates || [], i) || i, i) : i.num || "",
                        s = (!i.pOf && (i.label || i.name)) || "";
                      return (e ? "#" + e : "باب") + (s ? " — " + s : "");
                    })()
                  : (o && (o.label || o.name)) || "معلم",
              selMeta: n
                ? { men: "مصلى رجال", women: "مصلى نساء", service: "منطقة خدمات" }[n.cat] || "مصلى"
                : i
                  ? [i.pOf ? "فتحة" : "باب", i.loc || "", i.kind || ""].filter(Boolean).join(" · ")
                  : "معلم",
              clearSel: () => this.setState({ dsSel: null, selMulti: [] }),
              selLockedHint: r,
              selDistPanel: this.bsLensOn("dist") && ("dist" === s.lens || a) && !r,
              selZoneOffWarn: this.bsLensOn("dist") && ("dist" === s.lens || a) && ((!!n && !!n.off) || (!!o && !!o.off)),
              dsOffWarnTxt:
                o && o.off
                  ? "هذا المعلم معطّل في جولة اليوم — تأكّد قبل تسكين موظف فيه"
                  : "هذا المصلى معطّل في جولة اليوم — تأكّد قبل تسكين موظف فيها",
              ...(() => {
                const e = n || i || (t && "mark" === t.t && _ ? (_.marks || [])[t.i] : null),
                  o = (t) => Yt[Nt(t)] || "",
                  l = !(!e || (!e.off && !e.closed)),
                  d = e && !l && KIVO.BassamNeed.has(e, Zt) ? KIVO.BassamNeed.tot(e, Zt) : 0,
                  p = this.bsLensOn("dist") && ("dist" === s.lens || a) && !!e && d > 0 && !r;
                let h = 0,
                  c = 0;
                if (p) {
                  const t = (e.emp || []).filter((t) => o(t));
                  null != te ? ((h = KIVO.BassamNeed.of(e, te)), (c = t.filter((t) => o(t) === te).length)) : ((h = d), (c = t.length));
                }
                const g = Math.max(0, h - c),
                  f = Math.max(0, c - h);
                return {
                  selCovOn: p,
                  selCovLine: p
                    ? "الاحتياج " + h + " · سُكّن " + c + (f > 0 ? " · فائض +" + f : g > 0 ? " · المتبقي " + g : " · مكتمل ✓")
                    : "",
                  selCovStyle: p
                    ? "font-size:9.5px;font-weight:600;border-radius:8px;padding:5px 9px;border:1px solid;margin-top:6px;" +
                      (g > 0
                        ? "background:var(--bg-a245158110p08);border-color:var(--bd-a245158110p35);color:var(--fg-xb45309)"
                        : f > 0
                          ? "background:var(--bg-a81451780p07);border-color:var(--bd-a81451780p3);color:var(--fg-x0e7490)"
                          : "background:var(--bg-a0163870p07);border-color:var(--bd-a0163870p25);color:var(--fg-x047857)")
                    : "",
                };
              })(),
              selDensityPanel: "density" === s.lens && !!n && !r,
              selGatePanel: !1,
              assignMonthLabel: (this.MONTHS[s.month - 1] || "") + " " + s.year,
              assignEmpty: 0 === S.length,
              assignDbg:
                "سجلّ الموظفين: " +
                Ft.length +
                " · مفاتيح وردية " +
                s.year +
                "-" +
                s.month +
                ": " +
                Object.keys(Dt).length +
                " · عناصر الجولة: " +
                KIVO.BassamCount((_ && (_.zones || []).length) || 0, "مصلى") +
                " / " +
                KIVO.BassamCount((_ && (_.gates || []).length) || 0, "باب") +
                " / " +
                KIVO.BassamCount((_ && (_.marks || []).length) || 0, "معلم") +
                "",
              filteredAssignRows: [],
              assignSrcNote: z,
              assignSrcFromRep: y,
              assignGroups: I,
              assignSupOn: !1,
              assignSupN: String(L.length),
              assignSupRows: L,
              assignSupOpen: !!s.dsSupOpen,
              assignSupTog: () => this.setState((t) => ({ dsSupOpen: !t.dsSupOpen })),
              assignSupChev: "transition:transform .2s;flex-shrink:0;" + (s.dsSupOpen ? "transform:rotate(180deg)" : ""),
              assignScopeOn: !!A,
              assignScopeNote: A,
              assignGapOn: E > 0,
              assignGapMsg: E + " " + (1 === E ? "مسكَّن غير متاح اليوم" : "مسكَّنين غير متاحين اليوم") + " — ارفعهم أو غطِّ مواقعهم",
              otherShiftCounts: $,
              otherShiftCountsPresent: $.length > 0,
              assignFilterEmpty: S.length > 0 && 0 === O.length,
              assignTrunc: P.length > 500,
              assignTruncMsg: "يُعرض 500 من " + KIVO.BassamCount(P.length, "اسم", "g") + " — والعدّاد أعلاه يحسب الوردية كاملة",
              assignShiftHas: Z > 0,
              assignShiftDone: String(H),
              assignShiftTotal: String(Z),
              assignShiftTip: Q,
              assignShiftPillStyle:
                "display:inline-flex;align-items:center;gap:2px;flex-shrink:0;font-size:9px;font-weight:600;padding:1px 7px;border-radius:9999px;line-height:1.7;cursor:default;color:" +
                V +
                ";background:" +
                V +
                "14;border:1px solid " +
                V +
                "38",
              assignShiftBarStyle: "height:3px;border-radius:9999px;background:var(--bg-a1481631840p22);overflow:hidden;margin-top:1px",
              assignShiftFillStyle: "height:100%;border-radius:9999px;transition:width .25s ease;background:" + V + ";width:" + K + "%",
              assignRestNote: Y ? Y + " في راحة" : "",
              assignRestHas: Y > 0,
              assignSearchOn: O.length > 10,
              assignQ: F,
              assignQHas: !!F,
              onAssignQ: (t) => this.setState({ assignQ: t.target.value }),
              assignQClear: () => this.setState({ assignQ: "" }),
              assignSearchNote: C ? P.length + " من " + KIVO.BassamCount(O.length, "اسم", "g") + "" : "",
              assignSearchEmpty: O.length > 0 && 0 === P.length,
              ...KIVO.BassamCount.pair("capNowText", et > 0 ? et.toLocaleString("en-US") : "—", "مصل"),
              capNowOn: et > 0,
              capNoneOn: et <= 0,
              capNoneHint: "هذا المصلى بلا سعة — عرّف مساحته في عدسة الكثافة بالخطة التشغيلية ليتحوّل الإدخال إلى عددٍ ونسبة معاً",
              occNVal: at && "n" === at.k ? at.v : null == pt ? "" : String(pt),
              onOccN: (t) => {
                const e = ht(String(null == t.target.value ? "" : t.target.value)).replace(/[^0-9]/g, "");
                (this.setState({ occDraft: { k: "n", v: e, i: ot, pid: nt } }), st("" !== e ? Math.max(0, parseInt(e, 10)) : null));
              },
              occPctVal: at && "p" === at.k ? at.v : null == dt ? "" : String(dt),
              onOccPct: (t) => {
                let e = ht(String(null == t.target.value ? "" : t.target.value)).replace(/[^0-9.]/g, "");
                const s = e.indexOf(".");
                if (
                  (s > -1 && (e = e.slice(0, s + 1) + e.slice(s + 1).replace(/\./g, "")),
                  this.setState({ occDraft: { k: "p", v: e, i: ot, pid: nt } }),
                  "" === e || "." === e)
                )
                  return void it(null);
                const n = Math.max(0, Math.min(300, parseFloat(e) || 0));
                it(Math.round(10 * n) / 10);
              },
              occNInc: (t) => {
                (e(t), this._occHold("n", 1));
              },
              occNDec: (t) => {
                (e(t), this._occHold("n", -1));
              },
              occPInc: (t) => {
                (e(t), this._occHold("p", 1));
              },
              occPDec: (t) => {
                (e(t), this._occHold("p", -1));
              },
              occStop: () => this._occStop(),
              occNOn: et > 0,
              densPctText: lt
                ? "بدون قراءة"
                : null == dt
                  ? null == pt
                    ? "بدون قراءة"
                    : KIVO.BassamCount(pt.toLocaleString("en-US"), "مصل") + ""
                  : (dt < 40 ? "منخفضة" : dt < 75 ? "متوسطة" : dt <= 100 ? "مرتفعة" : "اكتظاظ") + " · " + dt + "%",
              densChipStyle:
                "display:inline-flex;align-items:center;padding:3px 10px;border-radius:9999px;font-size:10px;font-weight:600;" +
                (lt || null == dt
                  ? "background:var(--bg-a1481631840p15);color:var(--fg-x64748b);border:1px solid var(--bd-a1481631840p35)"
                  : dt < 40
                    ? "background:var(--bg-a34197940p12);color:var(--fg-x15803d);border:1px solid var(--bd-a34197940p3)"
                    : dt < 75
                      ? "background:var(--bg-a245158110p12);color:var(--fg-xb45309);border:1px solid var(--bd-a245158110p3)"
                      : dt <= 100
                        ? "background:var(--bg-a23968680p12);color:var(--fg-xdc2626);border:1px solid var(--bd-a23968680p3)"
                        : "background:var(--bg-a15327270p14);color:var(--fg-x991b1b);border:1px solid var(--bd-a15327270p4)"),
            }
          );
        })(),
        mapBodyStyle:
          "position:relative;background:var(--bg-xf8fafc);overflow:hidden;user-select:none;-webkit-user-select:none;" +
          (h ? "flex:1;min-height:0" : "height:var(--bs-map-h)"),
        toggleFs: () => {
          const t = !this.state.mapFs;
          try {
            document.body.style.overflow = t ? "hidden" : "";
          } catch (t) {}
          this.setState({ mapFs: t });
        },
        fsOn: h,
        fsThemeTitle: c ? "الوضع النهاري" : "الوضع الليلي",
        fsThemeP1: c ? "M12 2v2" : "M12 3a6.364 6.364 0 0 0 9 9 9 9 0 1 1-9-9",
        fsThemeP2: c
          ? "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
          : "",
        fsThemeBtnStyle:
          "width:30px;height:28px;border-radius:10px;border:0;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;" +
          (c ? "background:var(--bg-a185151810p16);color:var(--fg-xb99751)" : "background:transparent;color:var(--fg-x475569)"),
        fsThemeToggle: () => {
          try {
            KIVO.BassamTheme && KIVO.BassamTheme.toggle();
          } catch (t) {}
          this.setState((t) => ({ themeTick: (t.themeTick || 0) + 1 }));
        },
        fsTitle: h
          ? "خروج من ملء الشاشة (Esc)"
          : "ملء الشاشة — مساحة عمل كاملة",
        fsBtnStyle:
          "width:30px;height:28px;border-radius:10px;border:0;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;" +
          (h ? "background:var(--bg-xb99751);color:var(--text-on-brand)" : "background:transparent;color:var(--fg-x475569)"),
        fsA: h ? "M8 3v3a2 2 0 0 1-2 2H3" : "M15 3h6v6",
        fsB: h ? "M21 8h-3a2 2 0 0 1-2-2V3" : "M9 21H3v-6",
        fsC: h ? "M3 16h3a2 2 0 0 1 2 2v3" : "m21 3-7 7",
        fsD: h ? "M16 21v-3a2 2 0 0 1 2-2h3" : "m3 21 7-7",
        wsStyle:
          "display:flex;gap:12px;align-items:stretch" +
          (h
            ? ";position:fixed;top:0;right:0;bottom:0;left:0;z-index:9000;background:var(--bg-xfafafa);padding:10px;box-sizing:border-box;animation:fsIn .2s ease"
            : ""),
        zoomFit: () => this.setState({ dview: { x: 0, y: 0, w: 1e3, h: 600 } }),
        approveBadgeTip: G
          ? "حالة الشهر: معتمد ومقفل — لفتحه انقر نقرة مزدوجة على كرت الشهر"
          : K
            ? "الجولة معتمدة ومقفلة — تُفتح بفتح تقرير الوردية من التقرير اليومي"
            : q
              ? "جولة «" + j + "» معتمدة مع تقرير الوردية — المعروض لقطتُها المجمدة قراءةً، وفتحها بفتح التقرير من التقرير اليومي"
              : Z
                ? Y
                  ? "اليوم انقضى وأُقفل تلقائياً — لفتحه بأثر رجعي انقر نقرة مزدوجة على كرت اليوم"
                  : "اليوم مقفل — عرض فقط. لفتحه انقر نقرة مزدوجة على كرت اليوم"
                : Y
                  ? "اليوم مفتوح بأثر رجعي — تُعتمد الجولة باعتماد تقرير الوردية من التقرير اليومي"
                  : "الجولة مسودة مفتوحة — تُعتمد باعتماد تقرير الوردية من التقرير اليومي",
        approveBadgeText: G
          ? "الشهر معتمد ومقفل"
          : K
            ? "الجولة معتمدة ومقفلة"
            : q
              ? "جولة «" + (j || "") + "» معتمدة — عرض لقطتها"
              : Z
                ? Y
                  ? "انقضى — مقفل تلقائياً"
                  : "مقفل — عرض فقط"
                : Y
                  ? "مفتوح بأثر رجعي"
                  : "الجولة مسودة مفتوحة",
        approveBadgeGo: () => {},
        abIcon1: H ? "M7 11V7a5 5 0 0 1 10 0v4" : "M7 11V7a5 5 0 0 1 9.9-1",
        abIcon2:
          "M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z",
        approveBadgeStyle:
          "display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:400;white-space:nowrap;font-family:'Cairo',sans-serif;border:0;padding:0;background:transparent;cursor:help;color:" +
          (K || G || q ? "var(--fg-x047857)" : Z ? "var(--fg-x64748b)" : "var(--fg-xb45309)"),
        ...(() => {
          const t = T + "-" + s.month + "-" + m,
            e = !(
              !s.rounds || !((s.rounds[t] && Array.isArray(s.rounds[t].d)) || Object.keys(s.rounds).some((e) => 0 === e.indexOf(t + "-")))
            ),
            n = this.MONTHS[s.month - 1] || "",
            i = () => {
              if (y || !B || G || Z) return;
              const e = { ...(this.state.rounds || {}) };
              let s = [];
              try {
                s = ((t) => {
                  try {
                    return KIVO.BassamRound && KIVO.BassamRound.lensFilter ? KIVO.BassamRound.lensFilter(t) : t;
                  } catch (e) {
                    return t;
                  }
                })(JSON.parse(JSON.stringify(P || []))).map((t) => ({
                  zones: (t.zones || []).map((t) => ({ ...t, count: null, pc: {} })),
                  gates: t.gates || [],
                  paths: t.paths || [],
                  marks: t.marks || [],
                  hidePaths: !!t.hidePaths,
                  hideGates: !!t.hideGates,
                  hideMarks: !!t.hideMarks,
                  sid: t.sid,
                }));
              } catch (t) {}
              ((e[t] = { t: 1, ap: 0, d: s }),
                this.saveRounds(e),
                this.setState({
                  roundAdd: !1,
                  floor: this.state.floor >= 0 ? this.state.floor : 0,
                  lens: "zones",
                  panelTab: "zones",
                  dsSel: null,
                  selMulti: [],
                  dsHovZ: null,
                  dsHovG: null,
                  dsHovM: null,
                  dview: { x: 0, y: 0, w: 1e3, h: 600 },
                }));
            };
          return {
            noRound: !e,
            noRoundTitle: y
              ? "اختر يوماً من شريط الأيام أعلاه — " + n + " " + T + " هـ"
              : "لا توجد جولة لهذا اليوم — " + m + " " + n + " " + T + " هـ",
            roundAddOn: !!s.roundAdd && !y,
            roundTitle: "جولة يوم " + m + " " + n,
            canAddRound: !y && !G && !Z && this.PC("add"),
            dayLockedHint: !y && !G && Z,
            monthApprovedHint: (() => {
              const t = (s.rounds || {})[this.mKey(T, s.month)];
              return !(!t || !t.ap);
            })(),
            monthAutoHint: (() => {
              const t = (s.rounds || {})[this.mKey(T, s.month)];
              return G && !(t && t.ap);
            })(),
            monthLocked: G,
            roundOpenDo: () => {
              y || G || Z || (this.PC("add") ? this.setState({ roundAdd: !0 }) : this.permDeny());
            },
            roundClose: () => this.setState({ roundAdd: !1 }),
            impPick: () => {
              const t = document.createElement("input");
              ((t.type = "file"),
                (t.accept = ".json,application/json"),
                (t.onchange = () => {
                  const e = t.files && t.files[0];
                  e && this._impRead(e);
                }),
                t.click());
            },
            impOpen: !!s.imp,
            impErrShow: !(!s.imp || !s.imp.err),
            impErrOnly: !(!s.imp || !s.imp.err || s.imp.pack),
            impErrMsg: (s.imp && s.imp.err) || "",
            impReady: !(!s.imp || !s.imp.pack),
            impDayLabel: s.imp && s.imp.pack ? s.imp.hd + " " + (this.MONTHS[s.imp.hm - 1] || "") + " " + s.imp.hy + " هـ" : "",
            impGregLabel: (s.imp && (s.imp.dayLabel || s.imp.day)) || "",
            impTotals:
              s.imp && s.imp.pack
                ? (() => {
                    const t = s.imp.boards || [],
                      e = t.filter((t) => !1 !== t.on),
                      n = (t) => e.reduce((e, s) => e + (s[t] || 0), 0);
                    return (
                      "المختار: " +
                      [
                        e.length + " من " + KIVO.BassamCount(t.length, "دور", "g") + "",
                        this.bsLensOn("zones") ? KIVO.BassamCount(n("z"), "موقع") + "" : null,
                        this.bsLensOn("gates") ? KIVO.BassamCount(n("g"), "باب") + "" : null,
                        this.bsLensOn("paths") ? KIVO.BassamCount(n("p"), "مسار") + "" : null,
                        KIVO.BassamCount(e.filter((t) => t.img).length, "صورة") + "",
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    );
                  })()
                : "",
            impBoards: ((s.imp && s.imp.boards) || []).map((t, e) => ({
              name: t.name,
              ckOn: !1 !== t.on,
              meta: [
                this.bsLensOn("zones") && t.z ? KIVO.BassamCount(t.z, "موقع") + "" : null,
                this.bsLensOn("gates") && t.g ? KIVO.BassamCount(t.g, "باب") + "" : null,
                this.bsLensOn("paths") && t.p ? KIVO.BassamCount(t.p, "مسار") + "" : null,
                t.img ? "صورة" : null,
              ]
                .filter(Boolean)
                .join(" · "),
              pick: () =>
                this.setState((t) => ({
                  imp: { ...t.imp, boards: t.imp.boards.map((t, s) => (s === e ? { ...t, on: !1 === t.on } : t)) },
                })),
              rowStyle:
                "display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;cursor:pointer;transition:all .15s;border:1px solid " +
                (!1 !== t.on
                  ? "rgba(30,69,138,0.25);background:var(--bg-a30691380p04)"
                  : "transparent;background:var(--bg-xf8fafc);opacity:.55"),
              ckStyle:
                "width:15px;height:15px;border-radius:4px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border:1.5px solid " +
                (!1 !== t.on
                  ? "#1E458A;background:var(--bg-x1e458a);color:var(--fg-xffffff)"
                  : "#cbd5e1;background:var(--bg-xffffff);color:transparent"),
            })),
            impAllLabel: ((s.imp && s.imp.boards) || []).every((t) => !1 !== t.on) ? "إلغاء تحديد الكل" : "تحديد الكل",
            impAllToggle: () =>
              this.setState((t) => {
                const e = (t.imp.boards || []).every((t) => !1 !== t.on);
                return { imp: { ...t.imp, boards: t.imp.boards.map((t) => ({ ...t, on: !e })) } };
              }),
            impExists: !(!s.imp || !s.imp.exists || s.imp.mLock),
            impLocked: !(!s.imp || !s.imp.mLock),
            impGoLabel:
              s.imp && s.imp.busy
                ? "جاري الاستيراد…"
                : (() => {
                    const t = ((s.imp && s.imp.boards) || []).filter((t) => !1 !== t.on).length,
                      e = ((s.imp && s.imp.boards) || []).length,
                      n = s.imp && s.imp.exists ? "استبدال جولة اليوم" : "استيراد الجولة";
                    return t === e ? n : n + " (" + KIVO.BassamCount(t, "دور") + ")";
                  })(),
            impGoStyle:
              "height:38px;padding:0 20px;border-radius:10px;font-size:13px;font-weight:600;font-family:'Cairo',sans-serif;border:0;display:flex;align-items:center;gap:7px;" +
              (s.imp && (s.imp.busy || s.imp.mLock || !(s.imp.boards || []).some((t) => !1 !== t.on))
                ? "background:var(--bg-xe5e7eb);color:var(--fg-x9ca3af);cursor:default"
                : "background:var(--bg-x1e458a);color:var(--fg-xffffff);cursor:pointer"),
            impGo: () => this._impRun(),
            impCancel: () => {
              (this.state.imp && this.state.imp.busy) || this.setState({ imp: null });
            },
            impStop: (t) => {
              t && t.stopPropagation && t.stopPropagation();
            },
            stopRound: (t) => t.stopPropagation(),
            roundNoPlan: !B,
            roundWarnMsg: "لا توجد خطة لهذا الشهر في «الخطة التشغيلية» — أنشئ خطة الشهر أولاً ثم ابدأ الجولة.",
            roundPullDesc: B
              ? "فتح خريطة الموقع بمصليات وأبواب التشغيل الميداني لشهر " + n + " " + T + " هـ"
              : "لا توجد خطة لهذا الشهر بعد",
            roundPullAllowed: !Z && this.PC("add"),
            roundPullLockedHint: Z,
            roundPullStyle:
              "width:100%;display:flex;align-items:center;gap:10px;padding:12px;border-radius:12px;font-family:'Cairo',sans-serif;transition:all .15s;text-align:right;border:1px solid " +
              (B
                ? "#b99751;background:var(--bg-a185151810p06);cursor:pointer"
                : "#E5E7EB;background:var(--bg-xf8fafc);cursor:default;opacity:.6"),
            roundPull: i,
            ...(() => {
              const e = this.MONTHS || [],
                o = Object.keys(this.state.rounds || {})
                  .map((n) => {
                    const i = n.split("-");
                    if (3 !== i.length) return null;
                    const o = (this.state.rounds || {})[n];
                    if (!o || !Array.isArray(o.d) || !o.d.length) return null;
                    if (n === t) return null;
                    const r = +i[0],
                      a = +i[1],
                      l = +i[2];
                    return r && a && l
                      ? r !== T || a !== s.month || l >= m
                        ? null
                        : { v: n, y: r, mo: a, dd: l, ap: !!o.ap, label: "يوم " + l + " " + (e[a - 1] || a) + " " + r + " هـ" }
                      : null;
                  })
                  .filter(Boolean)
                  .sort((t, e) => e.dd - t.dd)
                  .slice(0, 60),
                r = !Object.keys(this.state.rounds || {}).some((e) => {
                  const n = e.split("-"),
                    i = (this.state.rounds || {})[e];
                  return 3 === n.length && +n[0] === T && +n[1] === s.month && e !== t && !!(i && Array.isArray(i.d) && i.d.length);
                }),
                a = o[0] ? o[0].v : "",
                l = () => {
                  if (y || G) return;
                  const e = (this.state.rounds || {})[a];
                  if (!e || !Array.isArray(e.d)) return;
                  let s = [];
                  try {
                    s = JSON.parse(JSON.stringify(e.d)).map((t) => ({
                      zones: (t.zones || []).map((t) => ({ ...t, count: null, pc: {} })),
                      gates: t.gates || [],
                      paths: t.paths || [],
                      marks: t.marks || [],
                      hidePaths: !!t.hidePaths,
                      hideGates: !!t.hideGates,
                      hideMarks: !!t.hideMarks,
                      sid: t.sid,
                    }));
                  } catch (t) {}
                  const n = { ...(this.state.rounds || {}) };
                  ((n[t] = { t: 1, ap: 0, d: s, from: a }),
                    this.saveRounds(n),
                    this.setState({
                      roundAdd: !1,
                      floor: this.state.floor >= 0 ? this.state.floor : 0,
                      lens: "zones",
                      panelTab: "zones",
                      dsSel: null,
                      selMulti: [],
                      dsHovZ: null,
                      dsHovG: null,
                      dview: { x: 0, y: 0, w: 1e3, h: 600 },
                    }));
                };
              return {
                roundPullOn: r,
                roundContOn: !r,
                roundStartHint: r
                  ? "أول جولة في الشهر تُسحب من التشغيل الميداني للشهر — وبعدها يبدأ كل يوم من جولة اليوم السابق، ويُحدَّث من الخطة عند الحاجة."
                  : "جولة اليوم تبدأ ممّا استقرّت عليه " +
                    (o[0] ? o[0].label : "الجولة السابقة") +
                    " (الأبواب والتسكين والمعالم) والكثافات تبدأ فارغة · ولو عدّلت الخطة استخدم «تحديث من الخطة» داخل الجولة.",
                roundPullGo: () => {
                  r
                    ? I
                      ? B
                        ? !Z && this.PC("add")
                          ? i()
                          : this.bsToast(
                              Z ? "اليوم انقضى — مقفل · افتح بطاقة اليوم بنقرة مزدوجة ثم ابدأ الجولة" : "صلاحيتك لا تشمل بدء الجولة",
                              "warn",
                            )
                        : this.bsToast("لا يوجد تشغيل ميداني لشهر " + n + " — أنشئه أولاً", "warn")
                      : this.bsToast(
                          j
                            ? "لا يوجد تقرير يومي مسحوب لـ«" + j + "» ليوم " + m + " — أنشئه من التقرير اليومي وتُنشأ الجولة معه تلقائياً"
                            : "أنشئ التقرير اليومي لوردية اليوم أولاً (سحب جدول الوردية) — تُنشأ الجولة معه تلقائياً",
                          "warn",
                        )
                    : this.bsToast("الخطة تُسحب لأول جولة في الشهر فقط — ابدأ اليوم من الجولة السابقة ثم «تحديث من الخطة» إن لزم", "warn");
                },
                roundPullBtnTip: I
                  ? B
                    ? "يبدأ الجولة بمصليات التشغيل الميداني لشهر " + n + " وأبوابه وتسكينه"
                    : "غير متاح الآن: لا يوجد تشغيل ميداني لشهر " + n
                  : "غير متاح الآن: " +
                    (j
                      ? "لا تقرير يومي مسحوب لـ«" + j + "» لهذا اليوم — يُسحب من صفحة التقرير اليومي وتُنشأ الجولة معه"
                      : "أنشئ التقرير اليومي لوردية اليوم أولاً — تُنشأ الجولة معه تلقائياً"),
                roundPullBtnStyle:
                  "border-radius:12px;padding:11px 22px;font-family:'Cairo',sans-serif;font-size:12.5px;font-weight:700;transition:.15s;border:1px solid " +
                  (I && B && !Z && this.PC("add")
                    ? "rgba(185,151,81,0.4);background:linear-gradient(135deg,var(--bg-x8a6f35),var(--bg-xb99751));color:var(--text-on-brand);cursor:pointer"
                    : "#E6E8EB;background:var(--bg-xf7f8fa);color:var(--fg-xa8aeb6);cursor:not-allowed"),
                roundContGo: () => {
                  I
                    ? o.length
                      ? G
                        ? this.bsToast("الشهر معتمد ومقفل — افتحه أولاً", "warn")
                        : l()
                      : this.bsToast("لا توجد جولة سابقة في هذا الشهر — ابدأ أول جولة بسحب التشغيل الميداني", "warn")
                    : this.bsToast(
                        j
                          ? "لا يوجد تقرير يومي مسحوب لـ«" + j + "» ليوم " + m + " — أنشئه من التقرير اليومي وتُنشأ الجولة معه تلقائياً"
                          : "أنشئ التقرير اليومي لوردية اليوم أولاً (سحب جدول الوردية) — تُنشأ الجولة معه تلقائياً",
                        "warn",
                      );
                },
                roundContTxt: o.length ? "＋ بدء جولة اليوم — من " + o[0].label : "＋ بدء جولة اليوم",
                roundContTip: I
                  ? o.length
                    ? "تبدأ الجولة بما استقرّت عليه " +
                      o[0].label +
                      (o[0].ap ? " المعتمدة" : "") +
                      " — المصليات والأبواب بحالاتها والتسكين والمعالم والمسارات، وتبدأ الكثافات فارغة"
                    : "لا توجد جولة سابقة في هذا الشهر"
                  : "غير متاح الآن: " +
                    (j
                      ? "لا تقرير يومي مسحوب لـ«" + j + "» لهذا اليوم — يُسحب من صفحة التقرير اليومي وتُنشأ الجولة معه"
                      : "أنشئ التقرير اليومي لوردية اليوم أولاً — تُنشأ الجولة معه تلقائياً"),
                roundContStyle:
                  "border-radius:12px;padding:11px 20px;font-family:'Cairo',sans-serif;font-size:12.5px;font-weight:700;transition:.15s;border:1px solid " +
                  (I && o.length && !G
                    ? "rgba(4,120,87,0.4);background:var(--bg-a0132800p07);color:var(--fg-x047857);cursor:pointer"
                    : "#E6E8EB;background:var(--bg-xf7f8fa);color:var(--fg-xa8aeb6);cursor:not-allowed"),
                hasApprDays: o.length > 0,
                noApprDays: 0 === o.length,
                apprDays: o.map((t) => ({ v: t.v, label: t.label, sel: t.v === a })),
                onApprDay: (t) => this.setState({ apprDay: t.target.value }),
                roundCopyDay: l,
              };
            })(),
          };
        })(),
        hasFloor: !(!R || !Array.isArray(R.d)),
        floorLabel: O[f] ? O[f][0] : "اختر موقعاً…",
        ...(() => {
          const t = O.length,
            e = Math.min(Math.max(f, 0), Math.max(t - 1, 0)),
            s = (s) => {
              t < 2 || this.setState({ floor: (e + s + t) % t, fldOpen: !1, dsSel: null, selMulti: [], dsHovZ: null, dsHovG: null });
            },
            n = (t) => (O[t] || [])[0] || "";
          return {
            siteNavOn: t >= 2,
            sitePrev: () => s(-1),
            siteNext: () => s(1),
            sitePrevTip: "الموقع السابق: " + n((e - 1 + Math.max(t, 1)) % Math.max(t, 1)),
            siteNextTip: "الموقع التالي: " + n((e + 1) % Math.max(t, 1)),
            siteArrowStyle:
              "height:28px;width:26px;display:inline-flex;align-items:center;justify-content:center;border-radius:10px;cursor:pointer;transition:all .2s;border:1px solid var(--bd-a185151810p3);color:var(--fg-x53565a);background:var(--bg-xffffff);flex-shrink:0;padding:0",
            siteCount: String(e + 1) + " / " + t,
          };
        })(),
        fldOpen: !!s.fldOpen,
        fldToggle: () => this.setState((t) => ({ fldOpen: !t.fldOpen })),
        fldChev: "transition:transform .2s;flex-shrink:0;opacity:.6;" + (s.fldOpen ? "transform:rotate(180deg)" : ""),
        fldBtnStyle:
          "height:28px;display:inline-flex;align-items:center;gap:8px;padding:0 10px;border-radius:10px;font-size:11px;font-weight:600;font-family:'Cairo',sans-serif;cursor:pointer;background:var(--bg-xffffff);color:var(--fg-x141414);border:1px solid " +
          (s.fldOpen ? "#b99751;box-shadow:0 0 0 2px rgba(185,151,81,0.15)" : "rgba(185,151,81,0.4)"),
        delFloorOn: !!s.delFloor,
        delFloorMsg: s.delFloor
          ? "سيتم حذف موقع «" + s.delFloor.name + "» نهائياً من المنظومة."
          : "",
        delFloorScope:
          "يشمل الحذف: الموقع في الخطة التشغيلية، ومصلياته وأبوابه ومساراته في كل الشهور، وكل قراءات الجولات اليومية المرتبطة به في كل الأيام — بما فيها الشهور والجولات المعتمدة والمقفلة. لا يمكن التراجع عن هذا الإجراء.",
        delFloorAckTog: () =>
          this.setState((t) => ({ delFloorAck: !t.delFloorAck })),
        delFloorAckBox:
          "flex-shrink:0;width:18px;height:18px;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;transition:all .15s;border:1.5px solid " +
          (s.delFloorAck
            ? "#dc2626;background:var(--bg-xdc2626);color:var(--fg-xffffff)"
            : "#cbd5e1;background:var(--bg-xffffff);color:transparent"),
        delFloorDoStyle:
          "height:38px;padding:0 22px;border-radius:10px;font-size:13px;font-weight:400;color:var(--fg-xffffff);border:0;font-family:'Cairo',sans-serif;transition:all .15s;" +
          (s.delFloorAck ? "background:var(--bg-xdc2626);cursor:pointer" : "background:var(--bg-xfca5a5);cursor:not-allowed;opacity:.75"),
        delFloorCancel: () =>
          this.setState({ delFloor: null, delFloorAck: !1, delFloorErr: null }),
        delFloorErrOn: !!s.delFloorErr,
        delFloorErr: s.delFloorErr || "",
        delFloorDo: async () => {
          if (!s.delFloorAck) return;
          const t = this.state.delFloor;
          t &&
            ((await this._delSiteEverywhere(t.i)) ||
              this.setState({
                delFloorErr:
                  "تعذّر حذف الموقع — لم يُحفظ التغيير في التخزين (قد تكون المساحة ممتلئة أو الموقع معتمداً أو هو الموقع الوحيد). لم يُحذف شيء.",
              }));
        },
        resetDayOn: !!s.resetDay,
        resetDayMsg: s.resetDay
          ? "سيتم حذف جولة " + s.resetDay.label + " بالكامل من المنظومة."
          : "",
        resetDayScope:
          "يشمل الحذف: كل مواقع هذا اليوم ومصلياته وأبوابه ومساراته، وكل التسكين وقراءات الكثافة للصلوات الخمس المسجّلة فيه. لا يمكن التراجع عن هذا الإجراء.",
        resetDayAckTog: () =>
          this.setState((t) => ({ resetDayAck: !t.resetDayAck })),
        resetDayAckBox:
          "flex-shrink:0;width:18px;height:18px;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;transition:all .15s;border:1.5px solid " +
          (s.resetDayAck
            ? "#dc2626;background:var(--bg-xdc2626);color:var(--fg-xffffff)"
            : "#cbd5e1;background:var(--bg-xffffff);color:transparent"),
        resetDayDoStyle:
          "height:38px;padding:0 22px;border-radius:10px;font-size:13px;font-weight:400;color:var(--fg-xffffff);border:0;font-family:'Cairo',sans-serif;transition:all .15s;" +
          (s.resetDayAck ? "background:var(--bg-xdc2626);cursor:pointer" : "background:var(--bg-xfca5a5);cursor:not-allowed;opacity:.75"),
        resetDayCancel: () =>
          this.setState({ resetDay: null, resetDayAck: !1 }),
        resetDayDo: () => {
          if (!this.state.resetDayAck) return;
          const t = this.state.resetDay;
          if (!t) return;
          if (this.isMonthAp(this.state.rounds, s.year, s.month)) return void this.setState({ resetDay: null, resetDayAck: !1 });
          const e = s.year + "-" + s.month + "-" + t.d,
            n = { ...(this.state.rounds || {}) },
            i = n[e];
          i && i.ap
            ? this.setState({ resetDay: null, resetDayAck: !1 })
            : (delete n[e],
              Object.keys(n).forEach((t) => {
                0 === t.indexOf(e + "-") && delete n[t];
              }),
              this.setState({ dsSel: null, selMulti: [], resetDay: null, resetDayAck: !1 }),
              this.saveRounds(n));
        },
        fldAddOpen: () =>
          this.setState({ siteModal: { mode: "add", name: "", img: "", imgDirty: !1 }, siteLowRes: null, siteErr: null, fldOpen: !1 }),
        siteModalOn: !!s.siteModal,
        siteModalTitle: s.siteModal ? ("edit" === s.siteModal.mode ? "تعديل الموقع" : "إضافة موقع جديد") : "",
        siteModalBtn: s.siteModal
          ? "edit" === s.siteModal.mode
            ? "حفظ التعديلات"
            : "إضافة الموقع"
          : "",
        siteName2: (s.siteModal && s.siteModal.name) || "",
        onSiteName2: (t) => this.setState({ siteModal: { ...(this.state.siteModal || {}), name: t.target.value } }),
        siteImg: (s.siteModal && s.siteModal.img) || "",
        siteImgKey: KIVO.BassamMapNight ? KIVO.BassamMapNight.key((s.siteModal && s.siteModal.img) || "") : "",
        siteImgNight:
          (KIVO.BassamMapNight && KIVO.BassamMapNight.url((s.siteModal && s.siteModal.img) || "")) ||
          (KIVO.BassamMapNight ? KIVO.BassamMapNight.PH : ""),
        siteHasImg: !(!s.siteModal || !s.siteModal.img),
        noSiteImg: !(s.siteModal && s.siteModal.img),
        siteLowResOn: !!(s.siteModal && s.siteModal.img && s.siteLowRes),
        siteLowRes: s.siteLowRes || "",
        siteClearImg: (t) => {
          (t && t.stopPropagation && t.stopPropagation(),
            this.setState({ siteModal: { ...(this.state.siteModal || {}), img: "", imgDirty: !0 }, siteLowRes: null }));
        },
        siteDropStyle:
          "position:relative;border:2px dashed " +
          (s.siteDragOver ? "#b99751;background:var(--bg-a185151810p08)" : "rgba(185,151,81,0.4);background:var(--bg-a2482502520p6)") +
          ";border-radius:12px;min-height:150px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer;transition:all .15s;overflow:hidden",
        siteDragEnter: (t) => {
          (t.preventDefault(), this.state.siteDragOver || this.setState({ siteDragOver: !0 }));
        },
        siteDragLeave: (t) => {
          (t.preventDefault(), this.state.siteDragOver && this.setState({ siteDragOver: !1 }));
        },
        siteDrop: (t) => {
          (t.preventDefault(), this.setState({ siteDragOver: !1 }));
          const e = t.dataTransfer && t.dataTransfer.files && t.dataTransfer.files[0];
          e && this._readSiteImg(e);
        },
        sitePick: () => {
          const t = document.createElement("input");
          ((t.type = "file"),
            (t.accept = "image/*"),
            (t.onchange = () => {
              const e = t.files && t.files[0];
              e && this._readSiteImg(e);
            }),
            t.click());
        },
        siteModalCancel: () => this.setState({ siteModal: null, siteDragOver: !1, siteLowRes: null, siteErr: null }),
        siteErrOn: !!s.siteErr,
        siteErr: s.siteErr || "",
        siteModalSave: async () => {
          const modal = this.state.siteModal;
          if (!modal) return;
          const name = (modal.name || "").trim();
          if (!name)
            return void this.setState({ siteErr: "الرجاء إدخال اسم الموقع" });
          try {
            const ack = await this._opImageAction(
              "site",
              { modal },
              async () => {
                if (!(this.PC("add") || this.PC("edit") || this.PC("del")))
                  throw Error("denied");
                const plan = this._opRead("bassam_plan_v1");
                if (!plan || !Array.isArray(plan.floors))
                  throw Error("operations-review-required");
                const editing = modal.mode === "edit",
                  old = editing ? plan.floors[modal.i] : null;
                if (editing && (!old || old.approved))
                  throw Error("site-locked");
                const oldId = (old && old.iid) || null;
                let iid = oldId;
                if (modal.imgDirty || !editing)
                  iid = modal.img ? await this._putImg(modal.img, old) : null;
                let index = modal.i,
                  rounds = null;
                if (editing) {
                  old.name = name;
                  if (modal.imgDirty) {
                    old.iid = iid;
                    old.imgW = modal.imgW || old.imgW || 0;
                    old.imgH = modal.imgH || old.imgH || 0;
                    delete old.img;
                  }
                } else {
                  const sid = KIVO.BassamAudit
                    ? KIVO.BassamAudit.newId("s_")
                    : undefined;
                  plan.floors.push({
                    sid,
                    num: plan.floors.length,
                    name,
                    iid,
                    imgW: modal.imgW || 0,
                    imgH: modal.imgH || 0,
                    approved: false,
                    chip: "خطة جديدة",
                    chipTone: "ok",
                    create: false,
                    zones: [],
                    gates: [],
                    paths: [],
                  });
                  index = plan.floors.length - 1;
                  Object.values(plan.months || {}).forEach((entry) => {
                    const rows = Array.isArray(entry)
                      ? entry
                      : entry && entry.d;
                    if (Array.isArray(rows))
                      while (rows.length < plan.floors.length)
                        rows.push({
                          sid: plan.floors[rows.length].sid,
                          zones: [],
                          gates: [],
                          paths: [],
                          approved: false,
                        });
                    if (
                      entry &&
                      !Array.isArray(entry) &&
                      typeof entry.c === "number"
                    )
                      entry.c = plan.floors.length;
                  });
                  rounds = JSON.parse(JSON.stringify(this.state.rounds || {}));
                  Object.values(rounds).forEach((rec) => {
                    if (rec && Array.isArray(rec.d))
                      while (rec.d.length <= index)
                        rec.d.push({
                          sid: plan.floors[rec.d.length].sid,
                          zones: [],
                          gates: [],
                          paths: [],
                        });
                  });
                }
                const changes = { bassam_plan_v1: plan };
                if (rounds) changes.bassam_rounds_v1 = rounds;
                return {
                  changes,
                  finish: () =>
                    this.setState(
                      (state) => ({
                        ...(rounds
                          ? { rounds, floor: index, dsSel: null, selMulti: [] }
                          : {}),
                        siteModal: null,
                        siteLowRes: null,
                        siteErr: null,
                        siteDragOver: false,
                        planTick: (state.planTick || 0) + 1,
                        fimgs: {},
                      }),
                      () => {
                        this._loadFloorImgs();
                      },
                    ),
                };
              },
            );
            if (!ack || ack.ok !== 1)
              this.setState({
                siteErr:
                  "لم يصل تأكيد الحفظ — بقيت الصورة والمسودة والتذكرة للمراجعة",
              });
          } catch (error) {
            this.setState({
              siteErr:
                "لم يتم تأكيد الحفظ أو رفع الصورة — بقي الموقع والصورة السابقة دون تغيير",
            });
          }
        },
        ...(() => {
          const t = s.mLock2;
          if (!t) return { mlOn: !1 };
          const e = this.MONTHS[t.n - 1] || "";
          return {
            mlOn: !0,
            mlTitle: t.locked ? "فتح الشهر وإلغاء اعتماده" : "اعتماد الشهر وإغلاقه",
            mlMsg: t.locked
              ? "سيتم فتح شهر " +
                e +
                " " +
                s.year +
                " هـ وإلغاء اعتماده ليصبح متاحاً للتعديل — يمكنك إعادة اعتماده لاحقاً بنقرة مزدوجة على كرته."
              : "سيتم اعتماد شهر " +
                e +
                " " +
                s.year +
                " هـ وإغلاقه — كل جولاته تصبح للعرض فقط، ولا يمكن تعديل التسكين أو الكثافات حتى تفتحه بنقرة مزدوجة على كرته.",
            mlBtnLabel: t.locked ? "فتح للتعديل" : "اعتماد وإغلاق",
            mlBtnStyle:
              "height:38px;padding:0 20px;border-radius:10px;font-size:13px;font-weight:400;border:0;cursor:pointer;color:var(--fg-xffffff);font-family:'Cairo',sans-serif;background:" +
              (t.locked ? "var(--bg-xb45309)" : "var(--bg-x008450)"),
            mlDo: () => {
              this.PC("approve") ? (this._setMonthAp(s.year, t.n, !t.locked), this.setState({ mLock2: null })) : this.permDeny();
            },
            mlClose: () => this.setState({ mLock2: null }),
            mlStop: (t) => t.stopPropagation(),
          };
        })(),
        ...(() => {
          const t = s.retroAsk;
          if (!t) return { retroOn: !1 };
          const e = this.MONTHS[t.m - 1] || "",
            n = null != t.d,
            i = n ? "يوم " + t.d + " " + e + " " + s.year + " هـ" : "شهر " + e + " " + s.year + " هـ",
            o = !n || this.dayPastDS(s.year, t.m, t.d);
          return n && !o
            ? {
                retroOn: !0,
                retroTitle: t.open ? "فتح " + i : "إغلاق " + i,
                retroMsg: t.open
                  ? "هذا اليوم أُغلق يدوياً. فتحه يعيد جولته للتعديل."
                  : "سيُغلق اليوم فتصبح جولته للعرض فقط حتى تفتحه من جديد.",
                retroB1: t.open ? "تعود أدوات الجولة للعمل فوراً" : "ما أضفته يبقى محفوظاً كما هو",
                retroB2: t.open ? "يمكنك إغلاقه مجدداً في أي وقت بنقرة مزدوجة" : "يمكنك فتحه مجدداً في أي وقت بنقرة مزدوجة",
                retroB3: "الإغلاق غير الاعتماد — اعتماد الجولة من شارة الحالة أعلى الخريطة",
                retroBtn: t.open ? "فتح اليوم" : "إغلاق اليوم",
                retroBtnStyle:
                  "height:38px;padding:0 20px;border-radius:10px;font-size:13px;font-weight:400;border:0;cursor:pointer;color:var(--fg-xffffff);font-family:'Cairo',sans-serif;background:" +
                  (t.open ? "var(--bg-xb45309)" : "var(--bg-x64748b)"),
                retroDo: () => {
                  this.PC("approve")
                    ? (this._toggleDayLock(s.year, t.m, t.d, !t.open), this.setState({ retroAsk: null }))
                    : this.permDeny();
                },
                retroCancel: () => this.setState({ retroAsk: null }),
                retroStop: (t) => t.stopPropagation(),
              }
            : {
                retroOn: !0,
                retroTitle: t.open ? "فتح " + i + " بأثر رجعي" : "إعادة قفل " + i,
                retroMsg: t.open
                  ? n
                    ? "هذا اليوم انقضى وأُقفل تلقائياً. فتحه يتيح لك بدء جولته أو تعديلها بأثر رجعي."
                    : "هذا الشهر انقضى وأُقفل تلقائياً. فتحه يتيح لك إضافة جولاته أو تعديلها بأثر رجعي."
                  : n
                    ? "سيعود اليوم إلى حالته المقفلة بانقضائه، ولن يمكن تعديل جولته حتى تفتحه من جديد."
                    : "سيعود الشهر إلى حالته المقفلة بانقضائه، ولن يمكن تعديل جولاته حتى تفتحه من جديد.",
                retroB1: t.open ? "ما تضيفه سيُسجَّل ضمن هذا " + (n ? "اليوم المنقضي" : "الشهر المنقضي") : "ما أضفته يبقى محفوظاً كما هو",
                retroB2: t.open ? "يبقى مفتوحاً حتى تعتمده أو تعيد قفله" : "يمكنك فتحه مجدداً في أي وقت بنقرة مزدوجة",
                retroB3: t.open
                  ? "يمكنك إعادة قفله في أي وقت بنقرة مزدوجة على كرته"
                  : "الاعتماد مستقل عن القفل — من شارة الحالة أعلى الخريطة",
                retroBtn: t.open ? "فتح بأثر رجعي" : "إعادة القفل",
                retroBtnStyle:
                  "height:38px;padding:0 20px;border-radius:10px;font-size:13px;font-weight:400;border:0;cursor:pointer;color:var(--fg-xffffff);font-family:'Cairo',sans-serif;background:" +
                  (t.open ? "var(--bg-xb45309)" : "var(--bg-x64748b)"),
                retroDo: () => {
                  this.PC("approve")
                    ? (n ? this._toggleDayLock(s.year, t.m, t.d, !t.open) : this._setMOpen(s.year, t.m, !!t.open),
                      this.setState({ retroAsk: null }))
                    : this.permDeny();
                },
                retroCancel: () => this.setState({ retroAsk: null }),
                retroStop: (t) => t.stopPropagation(),
              };
        })(),
        rlOn: !!s.roundLock,
        rlClose: () => this.setState({ roundLock: null }),
        rlStop: (t) => t.stopPropagation(),
        rlTitle: K ? "فتح الجولة للتعديل" : "اعتماد جولة اليوم",
        rlMsg: K
          ? "سيتم فتح جولة اليوم للتعديل — يمكن لمشرف الوردية تعديل التسكين والكثافات ثم إعادة الاعتماد."
          : "سيتم اعتماد وقفل جولة اليوم — لن يمكن تعديل التسكين أو الكثافات بعد الاعتماد إلا بعد فتح الجولة من جديد.",
        rlBtnStyle:
          "height:38px;padding:0 20px;border-radius:10px;font-size:13px;font-weight:400;border:0;cursor:pointer;color:var(--fg-xffffff);font-family:'Cairo',sans-serif;background:" +
          (K ? "var(--bg-xb45309)" : "var(--bg-x008450)"),
        rlBtnLabel: K ? "فتح للتعديل" : "اعتماد وإغلاق",
        rlDo: () => {
          this.PC("approve")
            ? G || (this._setRoundApLock(T, s.month, m, K ? 0 : 1), this.setState({ roundLock: null, zassign: null, zdens: null }))
            : this.permDeny();
        },
        dsTipNode: KIVO.BassamTip
          ? KIVO.BassamTip.card(
              (() => {
                if (!_) return null;
                const t = {};
                Ft.forEach((e) => {
                  const s = Dt[Tt(e)] || {};
                  Yt[Tt(e)] && Rt(s.rest) && (t[Tt(e)] = 1);
                });
                const e = (t) => Yt[Nt(t)] || "",
                  n = (t) => !(!t || (!t.off && !t.closed)),
                  i = (t, e) => {
                    try {
                      const s = KIVO.BassamField;
                      if (!s || !t) return null;
                      const n = s.offOf(t, e);
                      if (!t.fAt && !n) return null;
                      const i = s.stateOf(t, e),
                        o = s.flowOn(e) && this.bsLensOn("paths") ? s.flowOf(t) : "";
                      return {
                        st: i,
                        S: s.STATES[i],
                        flow: o,
                        F: o ? s.FLOWS[o] : null,
                        at: t.fAt ? s.clock(t.fAt) + " · " + s.ageTxt(t) : t.cAt || "",
                        by: t.fBy || t.cBy || "",
                        why: (n && t.cWhy) || "",
                      };
                    } catch (t) {
                      return null;
                    }
                  },
                  o = (t, e) => {
                    t &&
                      (e.unshift({
                        label: "رصد الميدان",
                        value: t.S.t + (t.F ? " · " + t.F.a + " " + t.F.t : "") + (t.why ? " — " + t.why : ""),
                        color: t.S.c,
                        wide: !0,
                      }),
                      t.at && e.splice(1, 0, { label: "آخر رصد", value: t.at + (t.by ? " · " + t.by : "") }));
                  };
                let r = "";
                const a = (s, i) => {
                    if (!s) return null;
                    const o = [],
                      r = (t) => (i.unshift.apply(i, o), t),
                      a = !(!s.off && !s.closed),
                      l = es ? KIVO.BassamNeed.of(s, es) : KIVO.BassamNeed.tot(s, Zt),
                      d = (s.emp || []).filter((t) => e(t) && ss(t)).length;
                    if (
                      (o.push({
                        label: es ? "الاحتياج («" + Jt(es) + "»)" : "الاحتياج (لكل الورديات)",
                        value: l ? d + " من " + l : "غير محدَّد",
                        wide: !l,
                      }),
                      a)
                    )
                      return (
                        o.push({
                          label: "التغطية",
                          value: (s.closed ? "الباب مغلق" : s.d ? "المصلى معطّل" : "المعلم معطّل") + " — لا يُحتسب في التغطية",
                          wide: !0,
                        }),
                        r(null)
                      );
                    if (!l)
                      return (
                        o.push({
                          label: "التغطية",
                          value: es
                            ? "لا احتياج مُدخلاً لهذه الوردية — يُحدَّد من التشغيل الميداني"
                            : "لا تُحسب بلا احتياج — يُحدَّد من التشغيل الميداني",
                          wide: !0,
                        }),
                        r(null)
                      );
                    const p = ((t) => {
                      if (!t || n(t) || !KIVO.BassamNeed.has(t, Zt)) return null;
                      const s = es ? KIVO.BassamNeed.of(t, es) : KIVO.BassamNeed.tot(t, Zt);
                      return s ? Math.round((100 * (t.emp || []).filter((t) => e(t) && ss(t)).length) / s) : null;
                    })(s);
                    if (null == p) return r(null);
                    const h = ((s) => {
                        if (!s || n(s) || !KIVO.BassamNeed.has(s, Zt)) return null;
                        const i = es ? KIVO.BassamNeed.of(s, es) : KIVO.BassamNeed.tot(s, Zt);
                        return i ? Math.round((100 * (s.emp || []).filter((s) => e(s) && ss(s) && !t[Nt(s)]).length) / i) : null;
                      })(s),
                      c = (s.emp || []).filter((e) => ss(e) && t[Nt(e)]).length;
                    return (
                      o.push({ label: "التغطية المخططة", value: p + "٪" }),
                      c > 0 &&
                        null != h &&
                        h !== p &&
                        o.push({
                          label: "الفعلية اليوم (" + c + " في راحة)",
                          value: h + "٪",
                          color: h >= 100 ? "#6ee7b7" : h >= 60 ? "#fcd34d" : "#fca5a5",
                        }),
                      r(((t) => (t >= 100 ? "#34d399" : t >= 60 ? "#fbbf24" : "#f87171"))(p))
                    );
                  },
                  l = (t) => Math.max(0, +t.count || 0),
                  d = (t) => (l(t) < 40 ? "منخفضة" : l(t) < 75 ? "متوسطة" : l(t) <= 100 ? "مرتفعة" : "اكتظاظ"),
                  p = (t) => (l(t) < 40 ? "#6ee7b7" : l(t) < 75 ? "#fcd34d" : l(t) <= 100 ? "#fca5a5" : "#f87171"),
                  h = s.dsSel && "zone" === s.dsSel.t ? s.dsSel.i : null;
                if (
                  ("zones" === s.lens || "density" === s.lens || "dist" === s.lens) &&
                  null != s.dsHovZ &&
                  (_.zones || [])[s.dsHovZ] &&
                  s.dsHovZ !== h
                ) {
                  const t = _.zones[s.dsHovZ],
                    e = (String(t.d).match(/-?\d+\.?\d*/g) || []).map(Number),
                    n = [],
                    h = [];
                  for (let t = 0; t + 1 < e.length; t += 2) (n.push(e[t]), h.push(e[t + 1]));
                  if (!n.length) return null;
                  (Math.min.apply(null, n), Math.max.apply(null, n), Math.min.apply(null, h), Math.max.apply(null, h));
                  const c = t.emp || [],
                    g = [];
                  (t.region && g.push({ label: "المنطقة", value: t.region }),
                    t.level && g.push({ label: "الدور / المستوى", value: t.level }),
                    t.ztype && g.push({ label: "النوع", value: t.ztype }),
                    t.zcat && g.push({ label: "الفئة", value: t.zcat }));
                  let f = null,
                    u = "#b99751",
                    y = null,
                    m = 0,
                    x = "";
                  if ("density" === s.lens)
                    (null == t.count
                      ? ((u = "#94a3b8"), (f = { text: "لا قراءة بعد", label: "قراءة " + it }))
                      : ((u = p(t)),
                        (f = { value: String(l(t)), unit: "%", label: "قراءة " + it + " · " + d(t), bar: l(t) / 100, barColor: u })),
                      null != t.nNow &&
                        "" !== t.nNow &&
                        g.unshift({
                          label: "العدد المرصود",
                          value: KIVO.BassamCount(Number(t.nNow).toLocaleString("en-US"), "مصل") + "",
                        }),
                      t.capNow > 0 &&
                        g.unshift({
                          label: "الطاقة الاستيعابية",
                          value: KIVO.BassamCount(Number(t.capNow).toLocaleString("en-US"), "مصل") + "",
                        }),
                      (x = "انقر المصلى لإدخال قراءة " + it));
                  else if (("dist" === s.lens || ("zones" === s.lens && s.dsAsn)) && this.bsLensOn("dist")) {
                    const e = a(t, g),
                      s = c.filter(ss),
                      n = c.length - s.length;
                    ((u = e || (s.length ? "#34d399" : "#f87171")),
                      (f = {
                        value: String(s.length),
                        unit: "موظف",
                        label: s.length
                          ? es
                            ? "مسكّنون من «" + Jt(es) + "»"
                            : "مسكّنون على هذا المصلى"
                          : es
                            ? "لا تسكين من وردية اليوم هنا"
                            : "المصلى شاغر — لا تسكين",
                      }),
                      (m = n),
                      (r = n ? "+ " + n + " من ورديات أخرى — وسّع المؤشرات لكل الورديات لرؤية أسمائهم" : ""),
                      s.length &&
                        (y = s.slice().map((t) => {
                          const e = Bt(t) || {},
                            s = Nt(t),
                            n = Yt[s] || "",
                            i = ks.stOfKey(s),
                            o = ks.isSup(s) ? ks.supWhy[s] || "إشرافي" : "",
                            r = o
                              ? { txt: o + " — لا يُحسب", color: "#E6D29D" }
                              : "pr" !== i
                                ? { txt: ks.STL[i], color: ks.STC[i] || "#fcd34d" }
                                : ks.tinOf(s)
                                  ? { txt: "محوَّل إلينا", color: "#a78bfa" }
                                  : null;
                          return { name: Wt(t), phone: e.phone || "", shName: n, color: Ut(n) || "#94a3b8", rest: !1, st: r };
                        })),
                      (x = "انقر المصلى لتعديل تسكينه"));
                  } else
                    (this.bsLensOn("dens") && null != t.count
                      ? ((u = p(t)), (f = { value: String(l(t)), unit: "%", label: "قراءة " + it, bar: l(t) / 100, barColor: u }))
                      : this.bsLensOn("dens") &&
                        t.capNow > 0 &&
                        (f = { value: Number(t.capNow).toLocaleString("en-US"), unit: "مصلٍّ", label: "الطاقة الاستيعابية" }),
                      (x = yt ? "نقرة مزدوجة لفتح بيانات المصلى" : ""));
                  const b = i(t, "zones");
                  return (
                    o(b, g),
                    {
                      accent: b ? b.S.c : u,
                      code: t.code || "—",
                      title: t.ztype || "مصلى",
                      status: b
                        ? { text: b.S.t, tone: "closed" === b.st ? "off" : "open" === b.st ? "ok" : "warn" }
                        : { text: t.off ? "معطّلة" : "مفعّلة", tone: t.off ? "off" : "ok" },
                      hero: f,
                      stats: g,
                      people: y,
                      more: m,
                      moreTxt: r,
                      foot: x,
                    }
                  );
                }
                const c = s.dsSel && "gate" === s.dsSel.t ? s.dsSel.i : null;
                if (("gates" === s.lens || "dist" === s.lens) && null != s.dsHovG && (_.gates || [])[s.dsHovG] && s.dsHovG !== c) {
                  const t = _.gates[s.dsHovG],
                    e = t.emp || [],
                    n = {
                      "الساحة الشمالية": "#1E458A",
                      "الساحة الجنوبية": "#0E573A",
                      "الساحة الشرقية": "#BF9958",
                      "الساحة الغربية": "#750E1F",
                    },
                    l = [];
                  (t.loc && l.push({ label: "الموقع", value: t.loc, color: n[t.loc] || void 0 }),
                    t.gtype && l.push({ label: "النوع", value: t.gtype }),
                    t.kind && l.push({ label: "الفئة", value: t.kind }),
                    t.route && l.push({ label: "المسار", value: t.route }),
                    t.cls && l.push({ label: "التصنيف", value: t.cls }),
                    (t.cats || []).length && l.push({ label: "التخصيص", value: (t.cats || []).join(" · "), wide: !0 }));
                  const d = KIVO.BassamLeaf,
                    p = d.isParent(t),
                    h = p ? d.leavesOf(_.gates || [], t) : [],
                    c = p ? d.agg(_.gates || [], t, null, ss) : null,
                    g = p ? c.n > 0 && 0 === c.open : !!t.closed;
                  if (
                    (p &&
                      (l.push({ label: "عدد الأبواب", value: KIVO.BassamCount(String(c.n), "فتحة") + " · مفتوح " + c.open }),
                      l.push({
                        label: "الفتحات",
                        value: h
                          .map(
                            (t) =>
                              (t.label || "فتحة " + t.leafNo) +
                              (t.closed ? " (مغلقة)" : "") +
                              ("dist" === s.lens || ("gates" === s.lens && s.dsAsn) ? " · " + (t.emp || []).filter(ss).length : ""),
                          )
                          .join(" · "),
                        wide: !0,
                      })),
                    t.pOf)
                  ) {
                    const e = d.parentOf(_.gates || [], t);
                    e && l.unshift({ label: "الباب الأم", value: e.label || "باب" });
                  }
                  let f = null,
                    u = g ? "#94a3b8" : "#34d399",
                    y = null,
                    m = 0;
                  if (p)
                    "dist" === s.lens || ("gates" === s.lens && s.dsAsn)
                      ? ((u = 0 === c.plc ? "#f87171" : "#34d399"),
                        (f = { value: String(c.plc), unit: "موظف", label: "مسكّنون على فتحات هذا الباب" }))
                      : (f = { value: String(c.open) + "/" + c.n, unit: "فتحة", label: "الفتحات المفتوحة الآن" });
                  else if ("dist" === s.lens || ("gates" === s.lens && s.dsAsn)) {
                    const s = a(t, l),
                      n = e.filter(ss),
                      i = e.length - n.length;
                    ((u = s || (n.length ? "#34d399" : "#f87171")),
                      (f = {
                        value: String(n.length),
                        unit: "موظف",
                        label: n.length
                          ? es
                            ? "مسكّنون من «" + Jt(es) + "»"
                            : "مسكّنون على هذا الباب"
                          : es
                            ? "لا تسكين من وردية اليوم على الباب"
                            : "الباب شاغر — لا تسكين",
                      }),
                      (m = i),
                      (r = i ? "+ " + i + " من ورديات أخرى — وسّع المؤشرات لكل الورديات لرؤية أسمائهم" : ""));
                    {
                      const t = n.filter((t) => {
                        const e = Nt(t);
                        return !ks.isSup(e) && "pr" === ks.stOfKey(e);
                      }).length;
                      n.length &&
                        (ks.repHas || t !== n.length) &&
                        l.push({
                          label: "الفعلي الآن",
                          value: t + " من " + n.length + (t < n.length ? " — " + (n.length - t) + " غير متاح" : " — الكل حاضر"),
                          color: t < n.length ? "#fca5a5" : "#86efac",
                        });
                    }
                    n.length &&
                      (y = n.slice().map((t) => {
                        const e = Bt(t) || {},
                          s = Nt(t),
                          n = Yt[s] || "",
                          i = ks.stOfKey(s),
                          o = ks.isSup(s) ? ks.supWhy[s] || "إشرافي" : "",
                          r = o
                            ? { txt: o + " — لا يُحسب", color: "#E6D29D" }
                            : "pr" !== i
                              ? { txt: ks.STL[i], color: ks.STC[i] || "#fcd34d" }
                              : ks.tinOf(s)
                                ? { txt: "محوَّل إلينا", color: "#a78bfa" }
                                : null;
                        return { name: Wt(t), phone: e.phone || "", shName: n, color: Ut(n) || "#94a3b8", rest: !1, st: r };
                      }));
                  } else f = { text: t.closed ? "مغلق" : "مفتوح", label: "حالة الباب الآن" };
                  t.closed &&
                    (t.cWhy || t.cAt) &&
                    (t.cAt && l.push({ label: "وقت الإغلاق", value: t.cAt }),
                    t.cWhy && l.push({ label: "سبب الإغلاق", value: t.cWhy, wide: !0 }));
                  const x = p ? null : i(t, "gates");
                  return (
                    o(x, l),
                    {
                      accent: x ? x.S.c : u,
                      code: t.num ? "#" + t.num : "",
                      title: (t.label || t.name || "باب") + (p ? " · باب أم" : ""),
                      status: x
                        ? { text: x.S.t + (x.F ? " · " + x.F.t : ""), tone: "closed" === x.st ? "off" : "open" === x.st ? "ok" : "warn" }
                        : "dist" === s.lens || ("gates" === s.lens && s.dsAsn)
                          ? { text: g ? "مغلق" : "مفتوح", tone: g ? "off" : "ok" }
                          : null,
                      hero: f,
                      stats: l,
                      people: y,
                      more: m,
                      moreTxt: r,
                      foot: p
                        ? "انقر شارة العدد لفرد الفتحات أو طيّها" +
                          ("dist" === s.lens || ("gates" === s.lens && s.dsAsn) ? " ثم انقر الفتحة لتسكينها" : "")
                        : "dist" === s.lens || ("gates" === s.lens && s.dsAsn)
                          ? "انقر الباب لتعديل تسكينه"
                          : "",
                    }
                  );
                }
                const g = s.dsSel && "mark" === s.dsSel.t ? s.dsSel.i : null;
                if (("marks" === s.lens || "dist" === s.lens) && null != s.dsHovM && (_.marks || [])[s.dsHovM] && s.dsHovM !== g) {
                  const t = _.marks[s.dsHovM],
                    e = t.emp || [],
                    n = [];
                  t.kind && n.push({ label: "النوع", value: t.kind });
                  let l = null,
                    d = t.off ? "#94a3b8" : "#a78bfa",
                    p = null,
                    h = 0;
                  if ("dist" === s.lens || ("marks" === s.lens && s.dsAsn)) {
                    const s = a(t, n),
                      i = e.filter(ss),
                      o = e.length - i.length;
                    ((d = s || (i.length ? "#34d399" : "#f87171")),
                      (l = {
                        value: String(i.length),
                        unit: "موظف",
                        label: i.length
                          ? es
                            ? "مسكّنون من «" + Jt(es) + "»"
                            : "مسكّنون على هذا المعلم"
                          : es
                            ? "لا تسكين من وردية اليوم هنا"
                            : "المعلم شاغر — لا تسكين",
                      }),
                      (h = o),
                      (r = o ? "+ " + o + " من ورديات أخرى — وسّع المؤشرات لكل الورديات لرؤية أسمائهم" : ""),
                      i.length &&
                        (p = i.slice().map((t) => {
                          const e = Bt(t) || {},
                            s = Nt(t),
                            n = Yt[s] || "",
                            i = ks.stOfKey(s),
                            o = ks.isSup(s) ? ks.supWhy[s] || "إشرافي" : "",
                            r = o
                              ? { txt: o + " — لا يُحسب", color: "#E6D29D" }
                              : "pr" !== i
                                ? { txt: ks.STL[i], color: ks.STC[i] || "#fcd34d" }
                                : ks.tinOf(s)
                                  ? { txt: "محوَّل إلينا", color: "#a78bfa" }
                                  : null;
                          return { name: Wt(t), phone: e.phone || "", shName: n, color: Ut(n) || "#94a3b8", rest: !1, st: r };
                        })));
                  } else l = { text: t.off ? "معطّل" : "مفعّل", label: "حالة المعلم الآن" };
                  const c = i(t, "marks");
                  return (
                    o(c, n),
                    {
                      accent: c ? c.S.c : d,
                      code: "",
                      title: t.label || t.name || "معلم",
                      status: c
                        ? { text: c.S.t + (c.F ? " · " + c.F.t : ""), tone: "closed" === c.st ? "off" : "open" === c.st ? "ok" : "warn" }
                        : { text: t.off ? "معطّل" : "مفعّل", tone: t.off ? "off" : "ok" },
                      hero: l,
                      stats: n,
                      people: p,
                      more: h,
                      moreTxt: r,
                      foot: "dist" === s.lens || ("marks" === s.lens && s.dsAsn) ? "انقر المعلم لتعديل تسكينه" : "",
                    }
                  );
                }
                return null;
              })(),
            )
          : null,
        dsToolHint: G
          ? "الشهر معتمد ومقفل — كل أيامه للعرض فقط · افتح الشهر بنقرة مزدوجة على كرته لتعديل أيامه"
          : H
            ? K
              ? "الجولة معتمدة — عرض فقط · لتعديلها ألغِ اعتماد الموقع من قائمة «الموقع النشط»"
              : "اليوم مقفل — عرض فقط · انقر نقرة مزدوجة على كرت اليوم لفتحه"
            : X
              ? "هذا الموقع معتمد في جولة اليوم — افتح قفله من قائمة «الموقع النشط» لتعديله"
              : "density" === s.lens
                ? "انقر مصلًّى لإدخال قراءة " + it + " — اكتب عدد المصلين أو نسبة الإشغال ويُحسب الآخر · كل صلاة لها قراءاتها المستقلة"
                : Ot
                  ? "gates" === s.lens
                    ? "وضع التوزيع: انقر الباب لتوزيع موظفيه في جولة اليوم"
                    : "marks" === s.lens
                      ? "وضع التوزيع: انقر المعلم لتوزيع موظفيه في جولة اليوم"
                      : "وضع التوزيع: انقر المصلى لتوزيع موظفيه في جولة اليوم"
                  : "zones" === s.lens
                    ? "ارسم مصليات جولة اليوم وحرّرها — التغيير في هذا اليوم وحده"
                    : "gates" === s.lens
                      ? "انقر الباب وبدّل حالته (مفتوح/مغلق) من لوحة الأفعال"
                      : "marks" === s.lens
                        ? "نقرة مزدوجة على المعلم لتحريره أو تعطيله في جولة اليوم"
                        : "انقر مصلًّى أو باباً لتسكين الموظفين عليه · عجلة الفأرة للتكبير والتصغير · اسحب الخريطة للتنقل",
        roundDaysCount: String(w),
        ...KIVO.BassamCount.pair("dimTotal", String(u), "يوم|مسجّل"),
        prevYear: () => this.setState((t) => ({ year: t.year - 1, day: t.year - 1 === g.y && t.month === g.m ? g.d : 0, roundAdd: !1 })),
        nextYear: () => this.setState((t) => ({ year: t.year + 1, day: t.year + 1 === g.y && t.month === g.m ? g.d : 0, roundAdd: !1 })),
        goCurrent: () => this.setState({ year: g.y, month: g.m, day: g.d }),
        dYearLabel: s.year + " هـ",
        dGregRange: this.hGregYearRange(s.year),
        dayOpen: !H,
        ...t,
      }
    );
  }
}
