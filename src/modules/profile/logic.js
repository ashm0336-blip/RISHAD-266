class Component extends KIVO.BassamPageKit.base(DCLogic, ["admin+award+daily+dreport+employees+irshad+plan+profile+seized+staff+tasks","dreport+irshad+planning+profile+seized+staff+tasks","daily+dreport+irshad+plan+profile+seized","admin+profile+seized"]) {
  /* KIVO_264 · «ملفي»: pfMe = ردُّ /api/me/today (حقائقُ يومي من الخادم بهويةٍ يقرّرها الخادم) · pfHist = ردودُ /api/me/history لكل شهر ·
     histYm/histType = مرشّحا «السجل» · spotAll = «+N» الزملاء داخل الصفحة نفسِها (لا تنقّل) */
  state = { pfPanel: "", pfTick: 0, pfSrv: null, pfSrvBusy: !1, pfImgs: {}, pfNow: Date.now(), pfMe: null, pfMeAt: 0, pfMeErr: "", pfHist: {}, histYm: "", histType: "all", histErr: "", spotAll: !1 };
  componentDidMount() {
    this._pfMeRequest = null;
    this._pfMeScope = null;
    this._pfMeDirty = false;
    this._pfMeBusy = false;
    ((this._pfAlive = !0),
      this.pfSrvLoad(),
      this.pfMeLoad(!0),
      (this._pfT = setInterval(() => {
        this._pfAlive && !document.hidden && (this.setState({ pfNow: Date.now() }), this.pfSrvLoad(), Date.now() - (this.state.pfMeAt || 0) > 3e5 && this.pfMeLoad(!0));
      }, 6e4)),
      (this._tkT = setInterval(() => this._tkClockTick(), 1e3)),
      (this._pfOnRemote = (ev) => {
        this._pfAlive && this.setState({ pfTick: (this.state.pfTick || 0) + 1 });
        /* KIVO_264: تغيّرٌ وصل من الخادم في مفتاحٍ يبني يومي ⇒ يُعاد جلبُ حقائقي (وشهرِ «السجل» المعروض إن كان مفتوحاً) — طلبٌ واحدٌ
           على الأكثر كلَّ ١٠ ثوانٍ مهما تتابعت الأحداث (كلُّ جلبٍ يقرأ مفاتيحَ الإدارة في الخادم)، ومفاتيحُ لا تمسّ يومي (المهام · التنبيهات …) لا تجلب */
        const keys = ev && ev.detail && ev.detail.keys,
          ks = Array.isArray(keys) ? keys.map(String) : [],
          REL = ["bassam_employees_v1", "bassam_staffing_v3", "bassam_staffing_locks_v1", "bassam_dreport_v1", "bassam_plan_v1", "bassam_rounds_v1", "bassam_shift_options_v1", "bassam_auth_users_v1", "bassam_depts_v1"];
        if (ks.length && !ks.some((k) => REL.some((r) => k === r || k.slice(-r.length - 1) === ":" + r))) return;
        this.pfMeInvalidate();
      }));
    this._pfOnMe = (event) => {
      const context = this.pfMeContext(), detail = event && event.detail;
      if (!context || !detail || detail.uid !== context.uid || detail.dept !== context.dept || detail.ekey !== context.ekey || !Number.isSafeInteger(detail.v)) return;
      this.pfMeInvalidate();
    };
    window.addEventListener("bassam:me", this._pfOnMe);
    try {
      window.addEventListener("bassam:remote", this._pfOnRemote);
    } catch (t) {}
    this._pfOnStore = (t) => {
      try {
        const e = (t && t.detail) || {},
          s = (e.keys ? e.keys : [e.key]).filter(Boolean).map(String);
        if (s.length && !s.some((t) => "bassam_tasks_v1" === t || t.slice(-16) === ":bassam_tasks_v1")) return;
        (clearTimeout(this._pfStoreT),
          (this._pfStoreT = setTimeout(() => {
            this._pfAlive && this.setState({ tkNow: Date.now() });
          }, 0)));
      } catch (t) {}
    };
    try {
      window.addEventListener("bassam:store", this._pfOnStore);
    } catch (t) {}
    this._pfOnKey = (t) => {
      this._pfAlive &&
        t &&
        "Escape" === t.key &&
        this.state.pfPanel &&
        (this.state.pfDirty
          ? this.bsToast("لديك تعديلٌ لم يُحفظ — احفظ البيانات أو اضغط «إغلاق»", "warn")
          : this.pfClose());
    };
    try {
      window.addEventListener("keydown", this._pfOnKey);
    } catch (t) {}
    /* KIVO_264: العودةُ إلى التبويب بعد غيابٍ طويل تُحدّث حقائق اليوم */
    this._pfOnVis = () => {
      this._pfAlive && !document.hidden && Date.now() - (this.state.pfMeAt || 0) > 6e4 && this.pfMeLoad(!0);
    };
    try {
      document.addEventListener("visibilitychange", this._pfOnVis);
    } catch (t) {
      this._pfOnVis = null;
    }
  }
  componentWillUnmount() {
    ((this._pfAlive = !1), clearInterval(this._pfT), clearInterval(this._tkT), clearTimeout(this._pfStoreT), clearTimeout(this._pfMeT), clearTimeout(this._tkRetryT));
    this._pfMeT = null;
    this._pfMeRequest = null;
    this._pfMeBusy = false;
    this._pfMeDirty = false;
    window.removeEventListener("bassam:me", this._pfOnMe);
    try {
      this._tkOnNet && window.removeEventListener("online", this._tkOnNet);
    } catch (t) {}
    try {
      window.removeEventListener("bassam:remote", this._pfOnRemote);
    } catch (t) {}
    try {
      window.removeEventListener("bassam:store", this._pfOnStore);
    } catch (t) {}
    try {
      window.removeEventListener("keydown", this._pfOnKey);
    } catch (t) {}
    try {
      this._pfOnVis && document.removeEventListener("visibilitychange", this._pfOnVis);
    } catch (t) {
      this._pfOnVis = null;
    }
  }
  isCF() {
    try {
      return !(!window.__BS_BOOT || !window.__BS_BOOT.cf);
    } catch (t) {
      return !1;
    }
  }
  pfSrvLoad() {
    this.isCF() &&
      fetch("/api/me")
        .then((t) => (t.ok ? t.json() : null))
        .then((t) => {
          this._pfAlive && t && t.ok && this.setState({ pfSrv: t });
        })
        .catch(() => {});
  }
  /* KIVO_264 · OD-3: حقائقُ يومي من الخادم — صفوفي وحدي مهما كانت أوراقي (الموظفُ بلا ورقةٍ تشغيلية كان يرى «لم يتم الإسناد» — D15) */
  pfMeContext() {
    const user = this.me(), boot = window.__BS_BOOT, service = KIVO.__BS_SRV;
    if (!user || !boot || boot.uid !== user.id || (service && service.sesChanged && service.sesChanged())) return null;
    return { uid: user.id, role: user.role, dept: String(user.deptId || ""), ekey: String(user.ekey || "") };
  }
  pfMeSame(context) {
    const now = this.pfMeContext();
    return !!context && !!now && context.uid === now.uid && context.role === now.role && context.dept === now.dept && context.ekey === now.ekey;
  }
  pfMeInvalidate() {
    const context = this.pfMeContext();
    if (!this._pfAlive || !context) return;
    if (this._pfMeScope && !this.pfMeSame(this._pfMeScope)) { this.pfMeLoad(true); return; }
    this._pfMeDirty = true;
    if (this._pfMeBusy || this._pfMeT) return;
    this._pfMeT = setTimeout(() => {
      this._pfMeT = null;
      if (!this._pfAlive || !this.pfMeSame(context)) return;
      this.pfMeLoad(true);
      if (this.state.pfPanel === "hist") this.pfHistReload();
    }, Math.max(0, 1e4 - (Date.now() - (this._pfMeStarted || 0))));
  }
  pfMeLoad(force) {
    if (!this.isCF()) return;
    const context = this.pfMeContext();
    if (!this._pfAlive || !context) return;
    if (!this.pfMeSame(this._pfMeScope)) {
      this._pfMeRequest = null;
      this._pfMeBusy = false;
      this._pfMeScope = context;
      this.setState({ pfMe: null, pfMeAt: 0, pfMeErr: "" });
    }
    if (this._pfMeBusy || (!force && Date.now() - (this.state.pfMeAt || 0) < 2e4)) return;
    clearTimeout(this._pfMeT);
    this._pfMeT = null;
    this._pfMeDirty = false;
    this._pfMeBusy = !0;
    this._pfMeStarted = Date.now();
    const request = this._pfMeRequest = {};
    const finish = (data, error) => {
      if (this._pfMeRequest !== request) return;
      this._pfMeRequest = null;
      this._pfMeBusy = false;
      if (!this._pfAlive) return;
      if (!this.pfMeSame(context)) { if (this._pfMeDirty) this.pfMeInvalidate(); return; }
      if (this._pfMeDirty) { this.pfMeInvalidate(); return; }
      const valid = data && data.ok === 1 && data.account && data.account.id === context.uid &&
        data.account.role === context.role && data.account.deptId === context.dept;
      this.setState(valid ? { pfMe: data, pfMeAt: Date.now(), pfMeErr: "" } : { pfMeAt: Date.now(), pfMeErr: error || "fail" });
    };
    return fetch("/api/me/today", { cache: "no-store" })
      .then((t) => (t.ok ? t.json() : null))
      .then((data) => finish(data))
      .catch(() => finish(null, "net"));
  }
  /* KIVO_264 · «السجل»: شهرٌ هجريٌّ واحد من /api/me/history — يُحفظ لكل شهر في الحالة فلا يُعاد جلبُه عند التنقّل بين المرشّحات */
  pfHistLoad(ym, force) {
    const PF = KIVO.BassamProfileFacts,
      key = ym || "cur",
      have = (this.state.pfHist || {})[key];
    if (!force && have) return;
    if (!this.isCF()) {
      /* الوضعُ المحلي: السجلُّ من المفاتيح التي تصل هذا الجهاز بالقواعد نفسِها — بلا سجلّ التغييرات (يحفظه الخادم وحده) */
      let H = null;
      try {
        H = PF ? this.pfHistLocal(ym) : null;
      } catch (t) {
        H = null;
      }
      this.setState({ pfHist: { ...(this.state.pfHist || {}), [key]: H || { ok: 0, err: "local" } }, histErr: H ? "" : "local" });
      return;
    }
    if ((this._pfHistBusy = this._pfHistBusy || {})[key]) return;
    this._pfHistBusy[key] = 1;
    fetch("/api/me/history" + (ym ? "?ym=" + encodeURIComponent(ym) : ""), { cache: "no-store" })
      .then((t) => (t.ok ? t.json() : t.status === 429 ? { ok: 0, err: "rate" } : null))
      .then((t) => {
        delete this._pfHistBusy[key];
        this._pfAlive && this.setState(t && t.ok ? { pfHist: { ...(this.state.pfHist || {}), [key]: t, [t.ym]: t }, histErr: "" } : { histErr: (t && t.err) || "fail" });
      })
      .catch(() => {
        delete this._pfHistBusy[key];
        this._pfAlive && this.setState({ histErr: "net" });
      });
  }
  pfHistLocal(ym) {
    const PF = KIVO.BassamProfileFacts,
      u = this.me(),
      emps = this.LS("bassam_employees_v1", []),
      L = PF.link(u, emps),
      toks = PF.tokens(u, L.rec, emps),
      T = PF.hijriAt(Date.now()),
      y0 = ym || T.ym,
      p = /^(\d+)-(\d+)$/.exec(y0),
      y = +p[1],
      m = +p[2],
      upto = 12 * y + m < 12 * T.y + T.m ? 31 : y === T.y && m === T.m ? T.d : 0,
      H = toks.length
        ? PF.hist({ ym: y0, days: PF.monthDays(y, m), upto, toks, staffing: this.LS("bassam_staffing_v3", {}), locks: this.LS("bassam_staffing_locks_v1", {}), dreport: this.LS("bassam_dreport_v1", {}), plan: this.LS("bassam_plan_v1", {}), rounds: this.LS("bassam_rounds_v1", {}), opts: this.LS("bassam_shift_options_v1", []) })
        : null;
    return {
      ok: 1,
      local: 1,
      ym: y0,
      today: { ym: T.ym, d: T.d },
      identity: { linked: !!L.rec, by: L.by, keyed: toks.length > 0 },
      range: { first: y0, cur: T.ym },
      month: H ? H.month : null,
      days: H ? H.days : [],
      sites: H ? H.sites : { month: [], runs: [], plan: !1, planApproved: null },
      changes: [],
      evidence: H ? { reports: H.evidence.reports, approved: H.evidence.approved, rounds: H.evidence.rounds, auditSince: null } : { reports: 0, approved: 0, rounds: 0, auditSince: null },
      moves: { ev: "none", items: [], note: "لا يوجد تاريخُ تنقّلٍ بين الإدارات — النقلُ بين الإدارات غيرُ مدعومٍ في النظام حالياً، فلا تنقّلاتٍ مسجّلةً لك" },
    };
  }
  pfKillOthers() {
    this.isCF() &&
      !this.state.pfSrvBusy &&
      (this.setState({ pfSrvBusy: !0 }),
      fetch("/api/me/sess/kill", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
        .then((t) => (t.ok ? t.json() : null))
        .then((t) => {
          this._pfAlive &&
            (this.setState({ pfSrvBusy: !1 }),
            t && t.ok
              ? (this.bsToast("أُنهيت جلساتك على الأجهزة الأخرى — هذا الجهاز وحده يبقى داخلاً", "ok"), this.pfSrvLoad())
              : this.bsToast("تعذّر إنهاء الجلسات — حاول مجدداً"));
        })
        .catch(() => {
          this._pfAlive && (this.setState({ pfSrvBusy: !1 }), this.bsToast("تعذّر الاتصال بالخادم"));
        }));
  }
  pfImg(t) {
    if (!t) return "";
    const e = this.state.pfImgs || {};
    if (void 0 !== e[t]) return e[t] || "";
    if (((this._pfImgReq = this._pfImgReq || {}), !this._pfImgReq[t] && KIVO.BassamIDB)) {
      this._pfImgReq[t] = 1;
      try {
        KIVO.BassamIDB.get(t)
          .then((e) => {
            this._pfAlive && this.setState({ pfImgs: { ...(this.state.pfImgs || {}), [t]: "string" == typeof e ? e : "" } });
          })
          .catch(() => {
            this._pfAlive && this.setState({ pfImgs: { ...(this.state.pfImgs || {}), [t]: "" } });
          });
      } catch (t) {}
    }
    return "";
  }
  /* KIVO_264 · D1/D2/D3: سجلّي الوظيفي بمعرّفٍ ثابت وحده — ekey = eid (وللحسابات القديمة nid · OD-9)؛ الاسمُ واسمُ الدخول لا يربطان أبداً
     (كان يقبل الاسمَ ثم «اسم الدخول ↔ هوية/جوال موظفٍ آخر» فيعرض سجلَّ غيري). المحليُّ لمن يصله مفتاحُ الموظفين، وإلا ما يعيده الخادم لي. */
  empRec() {
    try {
      const t = this.me(),
        PF = KIVO.BassamProfileFacts;
      if (!t || "staff" !== t.role || !t.ekey || !PF) return null;
      return PF.link(t, this.LS("bassam_employees_v1", [])).rec;
    } catch (t) {
      return null;
    }
  }
  myRec() {
    const r = this.empRec();
    if (r) return r;
    const M = this.state.pfMe;
    return M && M.ok && M.identity && M.identity.rec ? M.identity.rec : null;
  }
  emailOk(t) {
    return !String(t || "").trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(t).trim());
  }
  me() {
    try {
      if (KIVO.BassamAuth && KIVO.BassamAuth.user) return KIVO.BassamAuth.user();
    } catch (t) {}
    return null;
  }
  LS(t, e) {
    const S = KIVO.__BS_SRV && KIVO.__BS_SRV.operations;
    if (!S) throw Error("operations-read-required");
    if (S.state(t) === "denied") return e;
    const value = S.get(t);
    return value == null ? e : value;
  }
  can(t, e) {
    try {
      const s = KIVO.BassamPerm;
      return !(s && s.can && !(KIVO.BassamAuth && KIVO.BassamAuth.isSuper && KIVO.BassamAuth.isSuper()) && !s.can(t, e || "view"));
    } catch (t) {
      return !0;
    }
  }
  go(t) {
    try {
      if (KIVO.BassamNav && KIVO.BassamNav.go) return void KIVO.BassamNav.go(t);
    } catch (t) {}
  }
  hParts(t) {
    try {
      const e = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {
          year: "numeric",
          month: "numeric",
          day: "numeric",
        }).formatToParts(t || new Date()),
        s = (t) => +e.find((e) => e.type === t).value;
      return { y: s("year"), m: s("month"), d: s("day") };
    } catch (e) {
      try {
        return KIVO.BassamHijri.now(t);
      } catch (t) {
        return { y: 1448, m: 1, d: 1 };
      }
    }
  }
  MONTHS() {
    return [
      "محرم",
      "صفر",
      "ربيع الأول",
      "ربيع الآخر",
      "جمادى الأولى",
      "جمادى الآخرة",
      "رجب",
      "شعبان",
      "رمضان",
      "شوال",
      "ذو القعدة",
      "ذو الحجة",
    ];
  }
  wdName(t) {
    try {
      return t.toLocaleDateString("ar-SA-u-nu-latn", { weekday: "long" });
    } catch (t) {
      return "";
    }
  }
  isRestOn(t, e) {
    return (t || []).some((t) => t === e || "ال" + t === e || t === "ال" + e);
  }
  mins(t) {
    const e = /^(\d{1,2}):(\d{2})$/.exec(String(t || "").trim());
    return e ? 60 * +e[1] + +e[2] : null;
  }
  fmtDur(t) {
    t = Math.max(0, Math.round(t));
    const e = Math.floor(t / 60),
      s = t % 60,
      a = 1 === e ? "ساعة" : 2 === e ? "ساعتان" : e >= 3 && e <= 10 ? e + " ساعات" : e + " ساعة",
      r = 1 === s ? "دقيقة" : 2 === s ? "دقيقتان" : s >= 3 && s <= 10 ? s + " دقائق" : s + " دقيقة";
    return e && s ? a + " و" + r : e ? a : r;
  }
  rel(t) {
    if (!t) return "";
    const e = Date.now() - t;
    if (e < 6e4) return "الآن";
    if (e < 36e5) return "قبل " + this.fmtDur(e / 6e4);
    if (e < 864e5) return "قبل " + this.fmtDur(60 * Math.floor(e / 36e5));
    const s = Math.floor(e / 864e5);
    return 1 === s ? "أمس" : 2 === s ? "قبل يومين" : "قبل " + KIVO.BassamCount(s, "يوم", "g") + "";
  }
  clock(t) {
    try {
      const e = new Date(t),
        s = (t) => (t < 10 ? "0" : "") + t;
      return s(e.getHours()) + ":" + s(e.getMinutes());
    } catch (t) {
      return "";
    }
  }
  pfData() {
    const t = this.me(),
      e = [
        "bassam_employees_v1",
        "bassam_staffing_v3",
        "bassam_staffing_snap_v1",
        "bassam_shift_options_v1",
        "bassam_dreport_v1",
        "bassam_rounds_v1",
        "bassam_plan_v1",
        "bassam_tasks_v1",
        "bassam_dayshift_v1",
        "bassam_staffing_locks_v1",
        "bassam_auth_users_v1",
      ];
    let s = (this.state.pfTick || 0) + "|" + (t ? t.id : "") + "|" + Math.floor(Date.now() / 6e4) + "|" + (this.state.pfMeAt || 0);
    const ops = KIVO.__BS_SRV && KIVO.__BS_SRV.operations;
    if (ops) s += "|" + JSON.stringify([ops.status().epoch, e.filter((key) => ops.resources.includes(key)).map((key) => [ops.state(key), KIVO.__BS_SRV.rev(ops.key(key))])]);
    if (this._pfMemo && this._pfMemo.sig === s) return this._pfMemo.d;
    const a = this.pfCompute(t);
    return ((this._pfMemo = { sig: s, d: a }), a);
  }
  _tkAll() {
    /* KIVO_264 · KIVO-Tasks P0: «مهامي» من الخادم بنطاق صفوفي وحدها (KIVO.BassamMyTasks ⇒ GET /api/me/tasks) — كان المخزنُ الكامل
       من التخزين المحلي، والخادمُ لا يحقنه إلا لحامل task.view فيصل التنبيهُ ولا تظهر المهمة. الصفوفُ تُعاد بشكلها القائم (22 عموداً)
       فلا يتغيّر عرضُ البطاقة والسجل؛ والعمود 14 علامةُ «لي» لا مفتاح. */
    const MT = KIVO.BassamMyTasks;
    if (MT) {
      const S = MT.state();
      if (S.rows === this._tkRows0 && this._tkObj0) return this._tkObj0;
      const e = {},
        Qf = MT.queue && MT.queue.forRow;
      (S.rows || []).forEach((x) => {
        /* KIVO_265 · البند 9: أفعالٌ بانتظار الإرسال على الصفّ (q · qAct) — تُعلَّق عليه هنا (الطابورُ يُعلن تغيّرَه فيُبطل الذاكرة) */
        const qq = Qf ? Qf(x) : [];
        qq.length && (x = Object.assign({}, x, { q: qq.length, qAct: qq[qq.length - 1].act }));
        (e[x.k] = e[x.k] || [])[x.i] = this._tkRowOf(x);
      });
      return ((this._tkRows0 = S.rows), (this._tkObj0 = e), e);
    }
    return {};
  }
  _tkRowOf(x) {
    const r = [x.t, x.desc, x.prio, x.st, "normal", "مضافة", x.perf, [], "", x.by, x.dur, x.acc, x.fin, x.at != null ? x.at : x.id, "__me", x.s, x.e,
      x.grp ? x.grp.id : null, x.grp ? x.grp.label : null, null, x.dec, x.proof];
    return ((r.__x = x), r);
  }
  /* الفعلُ الذاتيّ في الخادم (POST /api/me/tasks/act) — لا تحديثَ متفائل: النتيجةُ من الخادم، والفشلُ يُعلَن فشلاً */
  _tkAct(d, i, a, x) {
    const MT = KIVO.BassamMyTasks,
      r = (this._tkAll()[d] || [])[i];
    if (!MT || !r || !r.__x) return Promise.resolve({ ok: !1, msg: "تعذّر الحفظ — حدّث الصفحة وأعد المحاولة" });
    const key = r.__x.k + "#" + r.__x.id;
    (this._pfSelfDrafts || (this._pfSelfDrafts = new Set())).add(key);
    return MT.act(r.__x, a, x).then((res) => (this._tkAfter(res, key), res));
  }
  /* Only a confirmed self-task ACK lets the caller close its editor. */
  _tkAfter(result, key) {
    if (key && result && (result.ok || !result.uncertain) && this._pfSelfDrafts) this._pfSelfDrafts.delete(key);
    this.setState({ pfTick: (this.state.pfTick || 0) + 1, tkNow: Date.now() });
  }
  _pfCanLeaveDraft() {
    if (this.state.tkBusy || this._pfFieldPending || (this._pfSelfDrafts && this._pfSelfDrafts.size)) {
      this.bsToast("الطلب السابق لم يُحسم — المسودة باقية؛ أعد الإجراء نفسه قبل إغلاقها أو فتح مسودة أخرى", "warn");
      return false;
    }
    return true;
  }
  /* الأداء عند الإنهاء — القاعدة نفسها المستعملة في صفحة المهام (perfOf) */
  /* KIVO_265 · نافذةُ التنفيذ: الأداءُ من المهلة بنموذج الواجهة (546 perf) — وبلا النموذج (بلا خادم) القاعدةُ القديمة */
  _tkPerfRow(r, fin) {
    if (!r) return null;
    const M = KIVO.BassamTaskModel;
    return M && M.perf ? M.perf(r, fin) : this._tkPerf(r[11], fin, r[10]);
  }
  _tkPerf(t, e, n) {
    if (!t || !e || !n) return null;
    const a = 6e4 * n,
      r = t + a - e,
      s = (t) => {
        const e = Math.floor(Math.abs(t) / 6e4),
          n = Math.floor(e / 60),
          a = e % 60;
        return (n ? n + " س" : "") + (n && a ? " " : "") + (a || !n ? a + " د" : "");
      };
    return r <= -6e4 ? ["late", "متأخر " + s(r)] : r >= 0.1 * a ? ["early", "مبكر بـ " + s(r)] : ["on_time", "في الوقت"];
  }
  /* مهامي: كل صفٍّ في المخزن مسنَدٌ إليّ بمعرّفي الثابت وحده (العمود 14) — KIVO_264 · D16: لا مطابقةَ بالاسم للمهام القديمة
     (كانت تُظهر مهمةَ سَميٍّ لغير صاحبها، والخادمُ يرفض كتابتها أصلاً — 018-ancestry.js)؛ KIVO-Tasks: والمصدرُ الذاتي (KIVO.BassamMyTasks ⇐
     GET /api/me/tasks) لا يحمل إلا صفوفي — الخادمُ طابقها بمعرّفي الثابت — فكلُّها لي */
  _tkMine(t) {
    const e = this._tkAll(),
      s = t.myToks || [],
      mt = !!KIVO.BassamMyTasks,
      r = [];
    return (
      Object.keys(e).forEach((t) => {
        const i = t.split("-");
        3 === i.length &&
          (e[t] || []).forEach((e, o) => {
            if (!Array.isArray(e)) return;
            (mt || (null != e[14] && "" !== e[14] && -1 !== s.indexOf(String(e[14])))) && r.push({ day: t, y: +i[0], m: +i[1], d: +i[2], i: o, r: e });
          });
      }),
      r
    );
  }
  /* بدءُ التنفيذ (start — والاسمُ القديم accept باقٍ في الخادم) — ويُثبت الاستلامَ معه إن لم يُؤكَّد قبله */
  tkAccept(t, e) {
    return this._tkAct(t, e, "start").then((r) =>
      r.ok ? (this.setState({ tkFocus: t + "#" + e }), this.bsAck("بدأتَ التنفيذ وبدأ العدّ — وفّقك الله", "ok")) : this.bsToast(r.msg, "warn"),
    );
  }
  /* KIVO_264 · المرحلة الثانية — تأكيدُ الاستلام مستقلٌّ عن بدء التنفيذ (ack) · والاستئنافُ بعد الإبلاغ بالتعثّر (resume) */
  tkAck(t, e) {
    this._tkAct(t, e, "ack").then((r) =>
      r.ok
        ? (this.setState({ tkFocus: t + "#" + e }), this.bsAck("أكّدتَ استلام المهمة — ابدأ التنفيذ في وقتها", "ok"))
        : this.bsToast(r.msg, "warn"),
    );
  }
  tkResume(t, e) {
    this._tkAct(t, e, "resume").then((r) =>
      r.ok ? (this.setState({ tkFocus: t + "#" + e }), this.bsAck("استُؤنفت المهمة — أكمل التنفيذ", "ok")) : this.bsToast(r.msg, "warn"),
    );
  }
  /* سجلُّ مهمةٍ واحدة (GET /api/me/tasks/log): أحداثُ صفّي وحده بفاعلٍ ووقت — «رجوع» يعيد إلى ما فُتح منه */
  tkTlOpen(t, e, b) {
    const MT = KIVO.BassamMyTasks,
      r = (this._tkAll()[t] || [])[e];
    if (!MT || !r || !r.__x) return;
    const k = t + "#" + e;
    this.setState({ pfPanel: "tktl", tkTl: { key: k, title: r[0] || "مهمة", st: "loading", ev: [], back: b || "" } });
    MT.log(r.__x).then((q) => {
      const c = this.state.tkTl;
      c && c.key === k && this._pfAlive && this.setState({ tkTl: Object.assign({}, c, { st: q.ok ? "ok" : "err", ev: q.events || [] }) });
    });
  }
  tkDeclineOpen(t, e, m) {
    if (!this._pfCanLeaveDraft()) return;
    this.setState({ pfPanel: "tkdec", tkRef: { day: t, idx: e }, tkWhy: "", tkWhyTxt: "", tkMode: "stall" === m ? "stall" : "" });
  }
  tkDecline() {
    const t = this.state,
      e = t.tkRef;
    if (!e) return;
    const st = "stall" === t.tkMode,
      s = ("أخرى" === t.tkWhy ? String(t.tkWhyTxt || "").trim() : t.tkWhy) || "";
    if (!s) return void this.bsToast(st ? "اختر سبب التعثّر أولاً" : "اختر سبب الاعتذار أولاً", "warn");
    /* التعثّر: المهمة باقيةٌ للموظف ويصل سببُه المسؤولَ فوراً — يستأنفها متى زال السبب (الخادمُ وحده: لا مسارَ محلياً) */
    if (st)
      return void this._tkAct(e.day, e.idx, "stall", { why: s.slice(0, 200) }).then((r) =>
        r.ok
          ? (this.setState({ pfPanel: "", tkRef: null, tkMode: "", tkFocus: e.day + "#" + e.idx }),
            this.bsAck("وصل بلاغُ التعثّر للمسؤول — استأنف المهمة متى زال السبب", "ok"))
          : this.bsToast(r.msg, "warn"),
      );
    return this._tkAct(e.day, e.idx, "decline", { why: s.slice(0, 200) }).then((r) =>
      r.ok
        ? (this.setState({ pfPanel: "", tkRef: null, tkFocus: null }), this.bsAck("وصل اعتذارك للمدير — وستُعاد المهمة لغيرك", "ok"))
        : this.bsToast(r.msg, "warn"),
    );
  }
  tkFinishOpen(t, e) {
    if (!this._pfCanLeaveDraft()) return;
    /* KIVO_264: المسودّةُ المحفوظة (أو ملاحظةُ التسليم المُعاد) تُستكمل لا تُكتب من جديد */
    const r = (this._tkAll()[t] || [])[e],
      x = r && r.__x;
    this.setState({
      pfPanel: "tkfin",
      tkRef: { day: t, idx: e },
      tkImgs: [],
      tkMeta: [],
      tkNote: x && x.proof ? String(x.proof.note || "") : "",
      tkImgErr: "",
      tkSteps: {},
      tkRm: [],
    });
    this._tkGeo();   /* KIVO_265 · البند 18: طلبُ الموقع مع فتح النافذة — فلا ينتظره الالتقاطُ الأول */
  }
  /* KIVO_265 · البند 18 — ختمُ الإثبات: الموقعُ يُطلب مرةً واحدة (مهلةُ 5 ثوانٍ) ويُعاد استعمالُه 10 دقائق؛ الرفضُ أو التعذّر ⇒ null («بلا موقع»)
     ولا يمنع التوثيق — الموقعُ شاهدٌ إضافي لا شرط */
  _tkGeo() {
    const g = this._tkGeoC;
    if (g && g.p && (g.v === undefined || Date.now() - g.at < 6e5)) return g.p;
    const c = (this._tkGeoC = { at: Date.now() });
    c.p = new Promise((res) => {
      let done = !1;
      const fin = (v) => {
        done || ((done = !0), (c.v = v), (c.at = Date.now()), res(v));
      };
      try {
        const G = typeof navigator !== "undefined" && navigator.geolocation;
        if (!G || !G.getCurrentPosition) return fin(null);
        G.getCurrentPosition(
          (p) => fin(p && p.coords ? { lat: +p.coords.latitude.toFixed(5), lng: +p.coords.longitude.toFixed(5), acc: Math.round(p.coords.accuracy || 0) } : null),
          () => fin(null),
          { enableHighAccuracy: !0, timeout: 5e3, maximumAge: 6e5 },
        );
        setTimeout(() => fin(null), 5500);
      } catch (t) {
        fin(null);
      }
    });
    return c.p;
  }
  /* سطرا الختم (نقيّان — للاختبار): ١) التاريخُ الهجري والميلادي والساعة بالرياض · الإحداثيات (أو «بلا موقع») ٢) اسمُ الموظف · عنوانُ المهمة */
  _tkStampLines(now, geo, name, title) {
    const d = new Date(now || Date.now()),
      tz = "Asia/Riyadh";
    let h = "",
      g = "",
      c = "";
    try {
      const P = (loc, o) => {
        const q = {};
        new Intl.DateTimeFormat(loc, Object.assign({ timeZone: tz }, o)).formatToParts(d).forEach((p) => (q[p.type] = p.value));
        return q;
      };
      const H = P("en-u-ca-islamic-umalqura-nu-latn", { year: "numeric", month: "numeric", day: "numeric" }),
        G = P("en-u-nu-latn", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
      ((h = H.day + "/" + H.month + "/" + H.year + "هـ"), (g = G.day + "/" + G.month + "/" + G.year + "م"), (c = G.hour + ":" + G.minute));
    } catch (t) {
      g = d.toISOString().slice(0, 16).replace("T", " ");
    }
    const loc =
      geo && "number" === typeof geo.lat && "number" === typeof geo.lng
        ? geo.lat.toFixed(5) + ", " + geo.lng.toFixed(5) + (geo.acc ? " (±" + Math.round(geo.acc) + " م)" : "")
        : "بلا موقع";
    return [[h, g, c].filter(Boolean).join(" · ") + " · " + loc, [String(name || "").trim(), String(title || "").trim()].filter(Boolean).join(" · ") || "توثيق مهمة"];
  }
  /* الرسمُ على اللوحة نفسِها قبل الترميز: شريطٌ سفليٌّ داكن وسطران أبيضان من اليمين — فالصورةُ المرفوعة تحمل الختمَ في بكسلاتها لا في الواجهة */
  _tkStampDraw(cv, lines) {
    const x = cv.getContext("2d"),
      w = cv.width,
      hh = cv.height,
      fs = Math.max(13, Math.round(Math.min(w, hh) * 0.03)),
      pad = Math.round(0.6 * fs),
      lh = Math.round(1.45 * fs),
      bh = 2 * pad + lh * lines.length;
    x.save();
    ((x.fillStyle = "rgba(0,0,0,0.58)"), x.fillRect(0, hh - bh, w, bh));
    ((x.fillStyle = "#fff"), (x.font = "bold " + fs + "px Cairo, Arial, sans-serif"), (x.textAlign = "right"), (x.textBaseline = "middle"));
    try {
      x.direction = "rtl";
    } catch (t) {}
    lines.forEach((t, i) => x.fillText(this._tkFitText(x, t, w - 2 * pad), w - pad, hh - bh + pad + lh * i + lh / 2));
    x.restore();
    return cv;
  }
  _tkFitText(x, t, mw) {
    let s = String(t);
    for (; s.length > 4 && x.measureText(s).width > mw; ) s = s.slice(0, -2);
    return s === String(t) ? s : s + "…";
  }
  /* سقفُ الصور الجديدة في الجولة: 4 — وحدُّ المهمة كلِّها 12 (الخادم: TK_IMG_TOTAL) بعد ما يُحذف من المسودّة */
  _tkImgCap() {
    const s = this.state,
      e = s.tkRef,
      r = e ? (this._tkAll()[e.day] || [])[e.idx] : null,
      p = r && r.__x && r.__x.proof,
      k = p && Array.isArray(p.imgs) ? p.imgs.filter((q) => (s.tkRm || []).indexOf(q) < 0).length : 0;
    return Math.max(0, Math.min(4, 12 - k));
  }
  onTkPick(t) {
    const e = t && t.target,
      s = e && e.files ? [...e.files] : [];
    try {
      e && (e.value = "");
    } catch (t) {}
    if (!s.length) return;
    const n = (this.state.tkImgs || []).length,
      cp = this._tkImgCap(),
      a = s.slice(0, Math.max(0, cp - n));
    if (!a.length)
      return void this.bsToast(cp < 4 ? "بلغت المهمةُ حدَّ صور التوثيق (12)" : "بلغت أربع صور — احذف صورةً لإضافة غيرها", "warn");
    (this.setState({ tkImgErr: "" }), a.forEach((t) => this._tkReadImg(t)));
  }
  /* قراءة صورةٍ واحدة: عرضٌ ثم ضغط. الآيفون قد يعطي HEIC فلا يفكّها <img> — فيُجرَّب createImageBitmap ثم يُصرَّح بالخطأ */
  _tkReadImg(t) {
    if (!t) return;
    if (!/^image\//.test(t.type || "") && !/\.(jpe?g|png|webp|heic|heif)$/i.test(t.name || ""))
      return void this.setState({ tkImgErr: "الملف «" + (t.name || "") + "» ليس صورة" });
    const e = KIVO.BassamBusy,
      s = e ? e.start("جارٍ تجهيز صورة التوثيق…", { sub: e.fmtBytes(t.size || 0), btn: null }) : null;
    let n = !1;
    const a = () => {
        n || ((n = !0), s && s.done());
      },
      i = (t) => {
        (a(), this.setState({ tkImgErr: t }), this.bsToast(t, "warn"));
      },
      o = (t, e, n) => {
        try {
          const a = Math.min(1, 1600 / Math.max(e, n)),
            i = Math.max(1, Math.round(e * a)),
            o = Math.max(1, Math.round(n * a)),
            r = document.createElement("canvas");
          ((r.width = i), (r.height = o));
          const l = r.getContext("2d");
          ((l.fillStyle = "#fff"), l.fillRect(0, 0, i, o), l.drawImage(t, 0, 0, i, o));
          return r;
        } catch (t) {
          return null;
        }
      },
      enc = (cv) => {
        try {
          let d = 0.82,
            c = cv.toDataURL("image/jpeg", d);
          for (; c.length > 9e5 && d > 0.4; ) ((d -= 0.1), (c = cv.toDataURL("image/jpeg", d)));
          return c;
        } catch (t) {
          return "";
        }
      },
      /* KIVO_265 · البند 18: بعد التصغير وقبل الترميز يُختم الشريطُ السفلي (التاريخ والوقت · الموقع أو «بلا موقع» · الاسم · المهمة) على اللوحة —
         فالمرفوعُ يحمله مرئياً؛ والبياناتُ الوصفية نفسُها تُحفظ مع الصورة (tkMeta ⇒ r21.meta) ليقرأها المسؤول */
      r = (cv) => {
        if (!cv) return void i("تعذّر تجهيز الصورة — جرّب صورة أخرى");
        this._tkGeo().then((g) => {
          if (n) return;
          const at = Date.now(),
            ref = this.state.tkRef,
            row = ref ? (this._tkAll()[ref.day] || [])[ref.idx] : null,
            u = this.me(),
            nm = (u && u.name) || (this.myRec() || {}).name || "",
            c = enc(this._tkStampDraw(cv, this._tkStampLines(at, g, nm, row ? row[0] : "")));
          if (!c) return void i("تعذّر تجهيز الصورة — جرّب صورة أخرى");
          const m = { at, lat: g ? g.lat : null, lng: g ? g.lng : null, acc: g ? g.acc : null };
          (a(), this.setState((e) => ({ tkImgs: [...(e.tkImgs || []), c].slice(0, 4), tkMeta: [...(e.tkMeta || []), m].slice(0, 4), tkImgErr: "" })));
        });
      },
      l = () => {
        try {
          if (!window.createImageBitmap) return void i("صيغة الصورة غير مدعومة في هذا المتصفح — اختر صورة بصيغة JPG أو PNG");
          createImageBitmap(t).then(
            (t) => {
              r(o(t, t.width, t.height));
              try {
                t.close && t.close();
              } catch (t) {}
            },
            () => i("تعذّر فتح الصورة — قد تكون بصيغة HEIC؛ اختر صورة بصيغة JPG أو PNG"),
          );
        } catch (t) {
          i("تعذّر فتح الصورة — جرّب صورة أخرى");
        }
      },
      d = new FileReader();
    ((d.onerror = () => i("تعذّرت قراءة الصورة من الجهاز — أعد المحاولة")),
      (d.onload = () => {
        const t = new Image();
        ((t.onload = () => {
          t.width && t.height ? r(o(t, t.width, t.height)) : l();
        }),
          (t.onerror = () => l()),
          (t.src = d.result));
      }),
      setTimeout(() => {
        n || i("تأخّر تجهيز الصورة — جرّب صورة أصغر");
      }, 2e4));
    try {
      d.readAsDataURL(t);
    } catch (e) {
      l();
    }
  }
  tkRmImg(t) {
    this.setState((e) => ({ tkImgs: (e.tkImgs || []).filter((e, s) => s !== t), tkMeta: (e.tkMeta || []).filter((e, s) => s !== t), tkImgErr: "" }));
  }
  tkFinish(m) {
    const state = this.state, ref = state.tkRef;
    if (!ref) return;
    return this._tkSubmit(ref, state.tkImgs || [], "doc" === m);
  }
  /* KIVO_264 · المرحلة الثانية — التوثيقُ والتسليم بسياسة المهمة (ق2: صورةٌ أو ملاحظة افتراضاً · أو ما حدّده المسؤول + خطواتُ العمل):
     «حفظ مسودّة» (doc) أو «تسليم» (submit: للمراجِع إن وُجد ⇒ «بانتظار المراجعة»، وإلا إنجاز). الصورُ الجديدة تُرفع أولاً ثم الفعلُ بمعرّفاتها؛
     المحفوظةُ في الخادم تبقى (تُضاف لا تُستبدل) إلا ما يحذفه الموظف من مسودّته. الحكمُ للخادم — والفشلُ يُعلَن فشلاً */
  _tkSubmit(e, s, doc) {
    const t = this.state,
      MT = KIVO.BassamMyTasks,
      R = (this._tkAll()[e.day] || [])[e.idx],
      x = R && R.__x;
    if (!x) return void this.bsToast("تعذّر الحفظ — حدّث الصفحة وأعد المحاولة", "warn");
    if (t.tkBusy) return;
    const note = String(t.tkNote || "").trim(),
      rm = (t.tkRm || []).slice(),
      st = this._tkStepsOf(x, t.tkSteps),
      nd = this._tkNeed(x, s, note, st, rm);
    if (!doc && !nd.ok) return void this.bsToast(nd.why, "warn");
    this.setState({ tkBusy: !0 });
    const pendingKey = x.k + "#" + x.id;
    (this._pfSelfDrafts || (this._pfSelfDrafts = new Set())).add(pendingKey);
    const b = { note: note.slice(0, 1e3) };
    (nd.steps.length && (b.steps = st), rm.length && (b.rm = rm));
    /* KIVO_265 · البند 9: الصورُ ثم الفعل في 545 (submitProof) — معرّفاتُ الصور تُولَّد هناك وتُربط بوصفيّتها (البند 18)؛ وبلا اتصالٍ يُصطفّ الكلُّ محلياً */
    Promise.resolve(MT.submitProof(x, doc ? "doc" : "submit", b, s, t.tkMeta || [])).then(
      (r) => {
        const ids = r.imgs || [];
        return Promise.resolve(r).then((r) => {
          (this.setState({ tkBusy: !1 }), this._tkAfter(r, pendingKey));
          if (!r.ok) return void this.bsToast(r.msg, "warn");
          ((this._tkImgCache = Object.assign(this._tkImgCache || {}, Object.fromEntries(ids.map((q, i) => [q, s[i]])))),
            /* KIVO_265 · P1: المسلَّمةُ (منجزةً أو للمراجعة) تخرج من «الحالية» فيُمسح tkFocus — مفتاحُه «يوم#فهرس»، فإن بقي وانزاحت الفهارس
               (حذفُ صفٍّ قبله) ثبّت صفّاً آخر «الأهم الآن». المسودّةُ تُبقيه */
            this.setState({ pfPanel: "", tkRef: null, tkImgs: [], tkMeta: [], tkNote: "", tkSteps: {}, tkRm: [], tkFocus: doc ? e.day + "#" + e.idx : null }),
            this.bsAck(
              doc
                ? "حُفظ التوثيق مسودّةً — سلّمه حين يكتمل"
                : nd.review
                  ? "سُلّمت المهمة للمراجعة — يصل توثيقُك " + (nd.rv || "المسؤول") + " وتصلك النتيجة في الجرس"
                  : "أُنجزت المهمة ووصل توثيقك للمدير — شكراً لجهدك",
              "ok",
            ));
        });
      },
      (q) => {
        (this.setState({ tkBusy: !1 }), this.bsToast("لم تُرفع الصورة — " + ((q && q.message) || "تعذّر الرفع") + " · أعد المحاولة", "warn"));
      },
    );
  }
  /* خطواتُ العمل: ما وُثّق في الخادم + ما غيّره الموظف الآن ⇒ {الخطوة: أُنجزت؟} */
  _tkStepsOf(x, ch) {
    const P = (x && x.pol) || {},
      dn = (x && x.proof && x.proof.st) || [],
      o = {};
    (P.steps || []).forEach((k) => {
      o[k] = ch && Object.prototype.hasOwnProperty.call(ch, k) ? !!ch[k] : dn.indexOf(k) >= 0;
    });
    return o;
  }
  /* ما يتطلبه التسليمُ الآن (545 need — مرآةُ فحص الخادم) على المحفوظ بعد ما يُحذف من المسودّة + الجديد */
  _tkNeed(x, s, note, st, rm) {
    const p = x.proof || {},
      y = Object.assign({}, x, { proof: Object.assign({}, p, { imgs: (p.imgs || []).filter((q) => (rm || []).indexOf(q) < 0), st: [] }) });
    return KIVO.BassamMyTasks.need(y, { imgs: s, note: note, steps: st });
  }
  /* KIVO_264 · المرحلة الثانية — قيمُ المنبثقات: «التوثيق والتسليم» بسياسة المهمة (المطلوب · خطواتُ العمل · المحفوظ — والمسلَّمُ سابقاً لا يُحذف ·
     مسودّة/تسليم) · نافذةُ الاعتذار نفسُها للإبلاغ بالتعثّر · سجلُّ المهمة الواحدة. وضعُ المتصفح بلا خادم (لا x) يبقى على نصوص المرحلة الأولى */
  _tkP2Panels(t, s, D) {
    const MT = KIVO.BassamMyTasks,
      x = D && D.r && D.r.__x && MT ? D.r.__x : null,
      im = s.tkImgs || [],
      stl = "stall" === s.tkMode;
    ((t.tkBusyOn = !!s.tkBusy),
      (t.tkFinHead = "إنهاء المهمة وتوثيقها"),
      (t.tkFinPol = ""),
      (t.tkFinRet = ""),
      (t.tkFinStepsOn = !1),
      (t.tkFinSteps = []),
      (t.tkFinOld = []),
      (t.tkFinOldOn = !1),
      (t.tkFinOldTxt = ""),
      (t.tkFinDraftOn = !1),
      (t.tkFinDraft = () => this.tkFinish("doc")),
      (t.tkFinHint = im.length ? "" : "صورة واحدة على الأقل مطلوبة لإنهاء المهمة"),
      (t.tkNotePh = "ملاحظة للمدير (اختياري)… ماذا أنجزت وما يلزم متابعته"),
      (t.tkDecStall = stl),
      (t.tkDecDec = !stl),
      (t.tkDecHead = stl ? "الإبلاغ بتعثّر المهمة" : "الاعتذار عن المهمة"),
      (t.tkDecSub = stl ? "يصل السبب للمسؤول فوراً — والمهمة باقيةٌ لك تستأنفها متى زال السبب" : "يصل السبب للمدير فوراً وتُعاد المهمة لغيرك"),
      (t.tkDecLbl = stl ? "سبب التعثّر" : "سبب الاعتذار"));
    stl &&
      (t.tkWhys = ["نقصٌ في المواد أو الأدوات", "بانتظار جهةٍ أخرى", "عطلٌ في الموقع", "ظرف طارئ", "أخرى"].map((e) => ({
        t: e,
        cls: "pf-whychip" + (s.tkWhy === e ? " on" : ""),
        pick: () => this.setState({ tkWhy: e }),
      })));
    if (x) {
      const P = x.pol || { m: "any", n: 1, steps: [] },
        pr = x.proof || {},
        rmL = s.tkRm || [],
        all = Array.isArray(pr.imgs) ? pr.imgs : [],
        /* المسلَّمُ في جولاتٍ سابقة (h) بادئةُ القائمة دائماً: الإضافةُ تُلحق والحذفُ للمسودّة وحدها (الخادم: img-locked) */
        lk = Array.isArray(pr.h) ? Math.min(all.length, pr.h.reduce((q, h) => q + ((h && h.n) || 0), 0)) : pr.sub ? all.length : 0,
        stp = this._tkStepsOf(x, s.tkSteps),
        nd = this._tkNeed(x, im, String(s.tkNote || "").trim(), stp, rmL),
        ret = "returned" === D.st;
      ((t.tkFinHead = ret ? "استكمال الإثبات وإعادة التسليم" : "التوثيق والتسليم"),
        (t.tkFinPol =
          "المطلوب للتسليم: " + (nd.txt || "صورةٌ أو ملاحظة") + (nd.review ? " · يراجعها " + (nd.rv || "المسؤول") : " · تُعدّ منجزةً عند التسليم")),
        (t.tkFinRet = ret && x.revd ? "أعادها " + (x.revd.by || "المراجِع") + ": «" + (x.revd.why || "—") + "»" : ""),
        (t.tkFinStepsOn = (P.steps || []).length > 0),
        (t.tkFinSteps = (P.steps || []).map((k) => ({
          t: (stp[k] ? "✓ " : "") + k,
          cls: "pf-whychip" + (stp[k] ? " on" : ""),
          tog: () => this.setState((q) => ({ tkSteps: Object.assign({}, q.tkSteps || {}, { [k]: !stp[k] }) })),
        }))),
        (t.tkFinOld = all
          .map((q, j) => ({ q, j }))
          .filter((o) => rmL.indexOf(o.q) < 0)
          .map((o) => {
            const src = this._tkImg(o.q) || "";
            return { src, on: !!src, off: !src, rmOn: o.j >= lk, rm: () => this.setState((z) => ({ tkRm: (z.tkRm || []).concat([o.q]) })) };
          })),
        (t.tkFinOldOn = t.tkFinOld.length > 0),
        (t.tkFinOldTxt = lk ? "ما سلّمته سابقاً جزءٌ من سجلّ المهمة — يبقى وتُضاف إليه الصورُ الجديدة" : "محفوظةٌ مسودّةً — احذف ما لا يلزم"),
        (t.tkImgsCan = im.length < this._tkImgCap()),
        (t.tkFinDis = !nd.ok || !!s.tkBusy),
        (t.tkFinHint = nd.ok ? "" : nd.why),
        (t.tkFinBtn = s.tkBusy ? "جارٍ الحفظ…" : nd.review ? "تسليم للمراجعة" : "تسليم وإنهاء"),
        (t.tkFinDraftOn = !0),
        (t.tkNotePh =
          "note" === nd.m || "both" === nd.m
            ? "ملاحظة الإنجاز (مطلوبة)… ماذا أنجزت وما يلزم متابعته"
            : "ملاحظة (اختيارية)… ماذا أنجزت وما يلزم متابعته"));
    }
    /* سجلُّ المهمة الواحدة */
    const L = s.tkTl;
    ((t.pfPanelTkTl = "tktl" === s.pfPanel && !!L),
      (t.tkTlTitle = L ? L.title : ""),
      (t.tkTlLoading = !!L && "loading" === L.st),
      (t.tkTlErr = !!L && "err" === L.st),
      (t.tkTlEmpty = !!L && "ok" === L.st && !L.ev.length),
      (t.tkTlBack = () => this.setState({ pfPanel: (L && L.back) || "", tkTl: null })),
      (t.tkTlRows = L && "ok" === L.st ? L.ev.map((v) => this._tkEv(v)) : []));
  }
  /* حدثٌ في سجلّ المهمة: ما جرى · مَن (أنت / اسمُ المسؤول) · السبب · متى (هجرياً) — والمستمدُّ من طوابع صفٍّ قديم موسومٌ بذلك */
  _tkEv(v) {
    const h = v.at ? this.hParts(new Date(v.at)) : null;
    return {
      txt: v.txt || v.act || "",
      by: v.by || "",
      why: v.why ? "«" + v.why + "»" : "",
      when: (h ? h.d + " " + this.MONTHS()[h.m - 1] + " · " : "") + this._tkHM(v.at) + ("row" === v.src ? " · من بيانات المهمة" : ""),
    };
  }
  /* سطرُ حالة المهمة في بطاقة «الأهم الآن» [النص, النمط] — رموزُ الألوان الدلالية وحدها */
  _tkBanner(s, x, d) {
    if (!x) return null;
    const p = x.proof || {},
      h = (v) => (v ? d(v) : "—"),
      q = (v) => (v ? " «" + v + "»" : "");
    if ("returned" === s && x.revd)
      return [
        "أعادها " + (x.revd.by || "المراجِع") + " " + h(x.revd.at) + " للاستكمال:" + q(x.revd.why),
        "border:1px solid var(--danger-border);background:var(--danger-bg);color:var(--danger-text)",
      ];
    if ("stalled" === s && x.stall)
      return [
        "أبلغتَ بتعثّرها " + h(x.stall.at) + ":" + q(x.stall.why) + " — استأنفها متى زال السبب",
        "border:1px solid var(--warning-border);background:var(--warning-bg);color:var(--warning-text)",
      ];
    if (("new" === s || "upcoming" === s) && x.ext && x.ext.to)
      return [
        "مُدّدت مهلتها حتى " + h(x.ext.to) + q(x.ext.why),
        "border:1px solid var(--info-border);background:var(--info-bg);color:var(--info-text)",
      ];
    if (("running" === s || "stalled" === s) && p.draft)
      return [
        "لديك توثيقٌ محفوظٌ مسودّةً — سلّمه حين يكتمل",
        "border:1px solid var(--info-border);background:var(--info-bg);color:var(--info-text)",
      ];
    return null;
  }
  /* صفُّ «سجل مهامك» لحالات المرحلة الثانية [الوصف, الوسم, نمطُ الوسم, الرمز] — والحالاتُ القائمة تبقى على صياغتها */
  _tkLogP2(s, e, d) {
    const x = e.__x || {},
      h = (v) => (v ? d(v) : "—"),
      q = (v) => (v ? " — «" + v + "»" : ""),
      I = "background:var(--info-bg);color:var(--info-text)",
      N = "background:var(--bg-surface-3);color:var(--text-muted)";
    return "review" === s
      ? ["سلّمتها " + h(e[12]) + " — بانتظار مراجعة " + (x.rv || "المسؤول"), "للمراجعة", I, "◔"]
      : "returned" === s
        ? ["أُعيدت للاستكمال" + q(x.revd && x.revd.why), "أُعيدت", "background:var(--danger-bg);color:var(--danger-text)", "↺"]
        : "stalled" === s
          ? ["متعثّرة منذ " + h(x.stall && x.stall.at) + q(x.stall && x.stall.why), "متعثّرة", "background:var(--warning-bg);color:var(--warning-text)", "‖"]
          : "cancelled" === s
            ? ["أُلغيت " + h(x.can && x.can.at) + q(x.can && x.can.why), "ملغاة", N, "×"]
            : "reassigned" === s
              ? ["أُعيد إسنادها لغيرك " + h(x.re && x.re.at) + q(x.re && x.re.why), "أُعيد إسنادها", N, "⇄"]
              : "done" === s && x.revd && "approved" === x.revd.st
                ? [
                    h(e[11]) + " ← " + h(e[12]) + " · اعتمدها " + (x.revd.by || "المراجِع"),
                    e[6] ? e[6][1] : "معتمدة",
                    "background:var(--success-bg);color:var(--success-text)",
                    "✓",
                  ]
                : null;
  }
  /* اختيارُ «الأهم الآن»: المُعادةُ (الأحدثُ إعادةً) ⇒ الجديدة (الأقربُ مهلةً) ⇒ الجارية/المتعثّرة (الأقدمُ بدءاً) ⇒ القادمة (الأقربُ) —
     KIVO_265 · «ملفي» (قرارُ المالك 2026-10-16): ما ينتظر متابعتك وحده؛ كان يرتدّ إلى «بانتظار المراجعة» ثم «آخرُ ما أنجزت اليوم»
     فتبقى المهمةُ المنجزةُ بطاقةَ «الأهم الآن» */
  _tkPick(rt, u, g, p) {
    const by = (L, f) => (L.length ? L.slice().sort(f)[0] : null),
      rd = (t) => (t.r.__x && t.r.__x.revd && t.r.__x.revd.at) || 0;
    return (
      by(rt, (t, e) => rd(e) - rd(t)) ||
      by(u, (t, e) => (t.r[16] || 0) - (e.r[16] || 0)) ||
      by(g, (t, e) => (t.r[11] || 0) - (e.r[11] || 0)) ||
      by(p, (t, e) => (t.r[15] || 0) - (e.r[15] || 0))
    );
  }
  /* KIVO_265 · «ملفي» — «مهامك الحالية» ما يحتاج متابعتَك وحده: جديدة (ومنها المستلَمةُ ولم تبدأ) · قادمة · جارية · متعثّرة · مُعادةٌ للاستكمال.
     المنجزةُ والمعتذَرُ عنها والمنقضيةُ والملغاةُ والمُعادُ إسنادُها في «سجل مهامك» وحده (لا حذفَ لبيانٍ ولا إثبات)، وما سُلّم للمراجِع في قسمه
     «بانتظار اعتماد المسؤول» — لا «الأهم الآن» ولا منجزة. سلسلةُ التكرار (rid من الخادم): أقربُ موعدٍ قادمٍ منها وحده — وبقيةُ نُسخها في السجل */
  _tkCur(o) {
    const C = { new: 1, upcoming: 1, running: 1, stalled: 1, returned: 1 },
      rid = (t) => this._tkRid(t),
      nx = {},
      l = o.filter((t) => C[t.st]);
    l.forEach((t) => {
      const k = "upcoming" === t.st && rid(t);
      k && (!nx[k] || (t.r[15] || 0) < (nx[k].r[15] || 0)) && (nx[k] = t);
    });
    return l.filter((t) => "upcoming" !== t.st || !rid(t) || nx[rid(t)] === t);
  }
  _tkRid(t) {
    return (t.r.__x ? t.r.__x.rid : t.r[23] && t.r[23].rec && t.r[23].rec.id) || "";
  }
  /* KIVO_265 · P4: نسخةُ سلسلةٍ لم يرها الموظف فليست «سجلاً»: لم تبدأ ولم يستلمها — وهي قادمةٌ بعد اليوم، أو ألغاها «أُنهي التكرار»/«عُدّل التكرار» (نصُّ الخادم 073).
     المنجزةُ والمعتذَرُ عنها والمنقضيةُ والمُلغاةُ يدوياً (ولو قادمة) والمستلَمةُ باقيةٌ في السجل */
  _tkUnseen(t, T) {
    const x = t.r.__x || {},
      w = x.can && x.can.why;
    return (
      !!this._tkRid(t) &&
      !t.r[11] &&
      !x.ack &&
      ("upcoming" === t.st || "new" === t.st ? (t.y - T.y || t.m - T.m || t.d - T.d) > 0 : "cancelled" === t.st && ("أُنهي التكرار" === w || "عُدّل التكرار" === w))
    );
  }
  /* KIVO_265 · البند 9: حالةُ الطابور الظاهرة للموظف — «بانتظار الإرسال · N» وزرُّ الإرسال الآن · والمرفوضُ (409/403) بسببه ولا يُعاد — «تجاهل» يُسقطه */
  _tkQueueVals(t, MT) {
    const Qs = MT && MT.queue ? MT.queue.state() : null,
      n = Qs ? Qs.n : 0,
      F = Qs ? Qs.failed : [],
      A = (MT && MT.queue && MT.queue.ACT) || {},
      d = (t) => {
        const e = new Date(t);
        return e.getHours().toString().padStart(2, "0") + ":" + e.getMinutes().toString().padStart(2, "0");
      };
    /* حين يفرغ الطابورُ بعد إرسالٍ ناجح يُقال ذلك مرةً (لا رسالةَ نجاحٍ قبل حكم الخادم — وقد حكم الآن) */
    const L = this._tkQLast || 0;
    Qs && Qs.loaded && !Qs.sending && ((this._tkQLast = n), L > 0 && 0 === n && this.bsAck("أُرسل ما كان بانتظار الإرسال (" + L + ") ووصل للخادم", "ok"));
    ((t.tkQOn = n > 0 || F.length > 0),
      (t.tkQPendOn = n > 0),
      (t.tkQTxt = n ? "بانتظار الإرسال · " + n : ""),
      (t.tkQSub = n ? (Qs.sending ? "جارٍ الإرسال…" : MT.online && !MT.online() ? "لا اتصال بالخادم — تُرسل تلقائياً عند عودته بترتيبها" : "تُرسل تلقائياً بترتيبها") : ""),
      (t.tkQSending = !!(Qs && Qs.sending)),
      (t.tkQSend = () => MT.queue.flush().then(() => this._pfAlive && this.setState({ pfTick: (this.state.pfTick || 0) + 1 }))),
      (t.tkQFailOn = F.length > 0),
      (t.tkQFail = F.map((q) => ({
        t: (A[q.act] || q.act) + (q.title ? " — " + q.title : ""),
        why: "رفضه الخادم: " + (q.msg || q.err || "—") + " · " + d(q.at) + " — لن يُعاد تلقائياً",
        drop: () => MT.queue.drop(q.id).then(() => this._pfAlive && this.setState({ pfTick: (this.state.pfTick || 0) + 1 })),
      }))));
  }
  /* صور التوثيق تُقرأ من مخزن الصور مرةً وتُذكر */
  _tkImg(t) {
    if (!t) return "";
    const e = (this._tkImgCache = this._tkImgCache || {});
    if (t in e) return e[t] || "";
    e[t] = "";
    const MT = KIVO.BassamMyTasks;
    if (MT)
      return (
        MT.img(t).then((s) => {
          s && ((e[t] = s), this._pfAlive && this.setState({ tkImgTick: (this.state.tkImgTick || 0) + 1 }));
        }),
        ""
      );
    const s = KIVO.BassamIDB;
    return (
      s &&
        s.get &&
        s
          .get(t)
          .then((s) => {
            s && ((e[t] = s), this._pfAlive && this.setState({ tkImgTick: (this.state.tkImgTick || 0) + 1 }));
          })
          .catch(() => {}),
      ""
    );
  }
  tkLogOpen() {
    const t = this.pfData();
    this.setState({ pfPanel: "tklog", tkLogY: t.T.y, tkLogM: t.T.m, tkLogF: "all" });
  }
  _tkHM(t) {
    try {
      const e = new Date(t),
        s = (t) => (t < 10 ? "0" + t : "" + t);
      return s(e.getHours()) + ":" + s(e.getMinutes());
    } catch (t) {
      return "";
    }
  }
  _tkSig1(r, a) {
    const s = this._tkState({ r: r }, a);
    return s + ("running" === s && r[10] && r[11] + 6e4 * r[10] < a ? "!" : "");
  }
  _tkFocusClock(e, s, a) {
    /* KIVO_264: المُعادةُ للاستكمال والمتعثّرةُ ما زالت قيد التنفيذ — ساعتُها ساعةُ «جارية» */
    ("returned" !== s && "stalled" !== s) || (s = "running");
    const n = e[10] || 0,
      r = e[15] || null,
      i = e[16] || null,
      o = e[11] || null;
    if ("new" === s)
      return {
        big: i ? this._tkFmt(Math.max(0, i - a)) : "",
        bar: i && r && i > r ? Math.max(0, Math.min(100, (100 * (a - r)) / (i - r))).toFixed(1) + "%" : "0%",
      };
    if ("upcoming" === s) return { big: this._tkFmt(Math.max(0, r - a)), bar: "0%" };
    if ("running" === s) {
      const e = n ? o + 6e4 * n - a : 0;
      return {
        big: n ? this._tkFmt(Math.abs(e)) : this._tkFmt(a - o),
        bar: n ? Math.max(0, Math.min(100, (100 * (a - o)) / (6e4 * n))).toFixed(1) + "%" : "0%",
      };
    }
    return { big: "", bar: "100%" };
  }
  _tkRestMeta(s, n, a) {
    const r = s[10] || 0,
      d = (t) => this._tkHM(t),
      x = s.__x || {},
      q = (v) => (v ? " — «" + v + "»" : "");
    /* KIVO_264 · المرحلة الثانية: ما قرّره المراجِع · التعثّر · التسليم */
    if ("returned" === n) return "أُعيدت للاستكمال" + q(x.revd && x.revd.why);
    if ("stalled" === n) return "متعثّرة" + q(x.stall && x.stall.why);
    if ("review" === n) return "سُلّمت — بانتظار مراجعة " + (x.rv || "المسؤول") + (s[12] ? " · " + d(s[12]) : "");
    return "new" === n
      ? (x.ack ? "استلمتَها ولم تبدأ" : "تنتظر استلامك") + (s[16] ? " · حتى " + d(s[16]) : "")
      : "running" === n
        ? "جارية" + (r ? " · متبقٍ " + this._tkFmt(Math.max(0, s[11] + 6e4 * r - a)) + " · تنتهي " + d(s[11] + 6e4 * r) : "")
        : "تبدأ " + d(s[15]) + " — بعد " + this._tkDur(Math.max(1, Math.round((s[15] - a) / 6e4)));
  }
  _tkClockTick() {
    if (!this._pfAlive || document.hidden) return;
    const P = this._tkPlan;
    if (!P || !P.on) return;
    const a = Date.now(),
      E = this._tkAll(),
      g = (d, i) => {
        const r = (E[d] || [])[i];
        return Array.isArray(r) ? r : null;
      };
    let s = "";
    for (let k = 0; k < P.all.length; k++) {
      const r = g(P.all[k].day, P.all[k].i);
      s += r ? this._tkSig1(r, a) : "?";
    }
    if (s !== P.sig || a >= P.nxt) return void this.setState({ tkNow: a });
    const T = (t, v) => {
      if (!t) return;
      const e = t.querySelector(".sc-interp"),
        n = e && e.firstChild;
      n && 3 === n.nodeType && n.nodeValue !== v && (n.nodeValue = v);
    };
    if (P.focus) {
      const r = g(P.focus.day, P.focus.i);
      if (r) {
        const F = this._tkFocusClock(r, P.focus.st, a);
        F.big !== P.big && ((P.big = F.big), T(document.querySelector(".tk-big"), F.big));
        if (F.bar !== P.bar) {
          P.bar = F.bar;
          const e = document.querySelector(".tk-bar>i");
          e && e.style.width !== F.bar && (e.style.width = F.bar);
        }
      }
    }
    for (let k = 0; k < P.rest.length; k++) {
      const q = P.rest[k];
      if ("running" !== q.st) continue;
      const r = g(q.day, q.i);
      if (!r) continue;
      const m = this._tkRestMeta(r, q.st, a);
      m !== q.meta && ((q.meta = m), T(document.querySelector('[data-tkq="' + q.day + "#" + q.i + '"]'), m));
    }
  }
  _tkFmt(t) {
    const e = t < 0,
      s = Math.floor(Math.abs(t) / 1e3),
      n = Math.floor(s / 3600),
      a = Math.floor((s % 3600) / 60),
      r = s % 60,
      i = (t) => (t < 10 ? "0" + t : "" + t);
    return (e ? "-" : "") + (n > 0 ? i(n) + ":" : "") + i(a) + ":" + i(r);
  }
  _tkDur(t) {
    if (!t && 0 !== t) return "";
    if (t < 1) return "أقل من دقيقة";
    const e = Math.floor(t / 60),
      s = t % 60;
    return (
      (e ? (1 === e ? "ساعة" : 2 === e ? "ساعتان" : e <= 10 ? e + " ساعات" : e + " ساعة") : "") + (e && s ? " و" : "") + (s ? s + " د" : "")
    );
  }
  /* حالة المهمة من منظور الموظف — KIVO_264 · المرحلة الثانية: ما يقرّره الخادمُ وحده يُؤخذ منه (545 phase): بانتظار المراجعة ·
     أُعيدت للاستكمال · متعثّرة · ملغاة · أُعيد إسنادها لغيرك؛ وما يتغيّر بالساعة يُحسب هنا كما كان */
  _tkState(t, e) {
    const s = t.r,
      MT = KIVO.BassamMyTasks,
      p = s.__x && MT && MT.phase ? MT.phase(s.__x, e) : "";
    if ("review" === p || "returned" === p || "stalled" === p || "cancelled" === p || "reassigned" === p) return p;
    return "declined" === s[3]
      ? "declined"
      : "done" === s[3]
        ? "done"
        : s[11]
          ? "running"
          : s[16] && e > (s.__x && s.__x.win && s.__x.win.to ? s.__x.win.to : s[16])   /* KIVO_265 · نافذةُ التنفيذ: الانقضاءُ بعد المهلة + سماحِ التأخر (الخادم win.to) */
            ? "expired"
            : s[15] && e < s[15]
              ? "upcoming"
              : "new";
  }
  /* KIVO_265 · P2: قراءةُ «مهامي» — وفشلُها (لا اتصال · 5xx · 401 · 429) يؤجّل المحاولةَ التلقائية التالية 5ث ⇒ 10 ⇒ 20 ⇒ 40 ⇒ 60ث (سقف)
     بمؤقّتٍ واحد يعيد الرسم؛ «أعد المحاولة» وعودةُ الاتصال تقرآن فوراً */
  _tkLd(MT) {
    ((this._tkLoadQ = 1), (this._tkSeen = 1), clearTimeout(this._tkRetryT));
    setTimeout(
      () =>
        MT.load().then((S) => {
          const w = S && S.err ? Math.min(6e4, 5e3 * Math.pow(2, Math.min(4, this._tkFailN || 0))) : 0;
          ((this._tkFailN = w ? (this._tkFailN || 0) + 1 : 0), (this._tkRetryAt = w && Date.now() + w), (this._tkLoadQ = 0), (this._tkObj0 = null));
          if (!this._pfAlive) return;
          w && (this._tkRetryT = setTimeout(() => this._pfAlive && this.setState({ pfTick: (this.state.pfTick || 0) + 1 }), w + 50));
          this.setState({ pfTick: (this.state.pfTick || 0) + 1 });
        }),
      0,
    );
  }
  _tkVals(t, e, s) {
    const MT = KIVO.BassamMyTasks,
      MS = MT ? MT.state() : null,
      lk = !!(MS && MS.me && MS.me.linked),
      /* SR-2.2 · F-7: صفحةُ المهام غيرُ مفعّلةٍ لإدارتي (أو مطفأةٌ للمنصة) ⇒ لا بطاقةَ ولا بياناتٍ تخصّها — الخادمُ يعيد me.off */
      n = !(MS && MS.me && MS.me.off) && (e.isStaff || lk);
    /* إعادةُ الرسم حين تتغيّر «مهامي» (تنبيهُ مهمةٍ من المدير يصل عبر /api/changes ⇒ 545 تعيد القراءة) — اشتراكٌ واحد لكل نسخةٍ من الصفحة */
    if (MT && !this._tkSub) {
      this._tkSub = 1;
      const u = MT.subscribe(() => {
        if (!this._pfAlive) return void u();
        ((this._tkObj0 = null), this.setState({ pfTick: (this.state.pfTick || 0) + 1 }));
      });
      /* P2: عودةُ الاتصال تقرأ فوراً بلا انتظار المهلة */
      this._tkOnNet = () => this._pfAlive && ((this._tkRetryAt = 0), this.setState({ pfTick: (this.state.pfTick || 0) + 1 }));
      try {
        window.addEventListener("online", this._tkOnNet);
      } catch (q) {}
    }
    /* قراءةٌ عند كل فتحٍ للصفحة (رخيصة: ?since=rev) ثم كل دقيقة — لا تُعرض قائمةٌ قديمة لمن فتح «ملفي» من التنبيه.
       KIVO_265 · P2 (قائمٌ قبله): والفشلُ لا يُعاد مع كل رسم — كان كلُّ فشلٍ يُطلق رسماً فقراءةً (~750 طلباً/ث): المحاولةُ التلقائية بعد مهلة _tkLd */
    if (MT && !MS.loading && !this._tkLoadQ && (!this._tkSeen || ((null === MS.rows || MS.err || Date.now() - MS.at > 6e4) && !(MS.err && Date.now() < (this._tkRetryAt || 0)))))
      this._tkLd(MT);
    if (((t.tkOn = !!n), !n)) return t;
    this._tkQueueVals(t, MT);
    const a = Date.now(),
      r = this._tkMine(e),
      i = e.T.y + "-" + e.T.m + "-" + e.T.d,
      o = r.map((t) => ({ ...t, st: this._tkState(t, a) })),
      /* البطاقة: كلُّ ما ينتظر متابعتك من أيّ يوم (جديدة · قادمة · جارية · متعثّرة · مُعادة) — كانت «اليوم» وحده فتختفي مهمةُ الغد
         المسنَدة الآن رغم وصول تنبيهها (KIVO_264 · RC-2)؛ ثم صارت «اليوم» بأيّ حالةٍ + ما ينتظر — فتبقى المنجزةُ اليوم في «الحالية»
         (KIVO_265 · قرارُ المالك 2026-10-16: _tkCur). المنقضيةُ والمنجزةُ والمغلقة في «السجل» */
      l = this._tkCur(o),
      f = this.MONTHS(),
      d = (t) => {
        try {
          const e = new Date(t),
            s = (t) => (t < 10 ? "0" + t : "" + t);
          return s(e.getHours()) + ":" + s(e.getMinutes());
        } catch (t) {
          return "";
        }
      };
    /* انقضاء مهلة القبول بلا ردّ: يُسجَّل مرةً واحدة على الصفّ فيصل المدير تنبيهه */
    ((this._tkExp = this._tkExp || {}),
      o
        /* SR-2.2 · F-3: ما انتهت مهلتُه خلال 48 ساعة وحده — أوّلُ زيارةٍ بعد الترقية (من بيانات 242) كانت تُسجّل انقضاءَ كلِّ متأخرةٍ قديمة (كتابةٌ وتنبيهٌ لكلٍّ منها)؛
           والقديمةُ تبقى ظاهرةً «منقضية» في «سجل مهامك» (والخادمُ يردّ الأقدمَ noop) */
        .filter((t) => "expired" === t.st && a - t.r[16] < 1728e5 && !(t.r[20] && t.r[20].exp) && !this._tkExp[t.day + "#" + t.i])
        .slice(0, 3)
        .forEach((t) => {
          ((this._tkExp[t.day + "#" + t.i] = 1),
            setTimeout(
              () =>
                MT && this._tkAct(t.day, t.i, "expire"),
              50,
            ));
        }));
    const u = l.filter((t) => "new" === t.st),
      g = l.filter((t) => "running" === t.st || "stalled" === t.st),
      p = l.filter((t) => "upcoming" === t.st),
      /* «منجزة اليوم» عدٌّ ورابطٌ إلى السجل لا بطاقةُ مهمة */
      m = o.filter((t) => t.day === i && "done" === t.st),
      /* KIVO_264 · المرحلة الثانية: المُعادةُ للاستكمال أولاً · وما سُلّم وينتظر المراجِعَ في قسمه (KIVO_265: خارجَ «الحالية» — الأقدمُ تسليماً أولاً) */
      rt = l.filter((t) => "returned" === t.st),
      rv = o.filter((t) => "review" === t.st).sort((t, e) => (t.r[12] || 0) - (e.r[12] || 0));
    /* tkFocus (بعد الاستلام/البدء/التوثيق/التعثّر/الاستئناف — ويُمسح بالتسليم) يُتبع ما دامت المهمةُ حالية — المنجزةُ والمسلَّمةُ للمراجعة والمغلقةُ لا تبقى «الأهم الآن» */
    const fx = s.tkFocus ? l.find((t) => t.day + "#" + t.i === s.tkFocus) : null,
      w = fx || this._tkPick(rt, u, g, p);
    ((t.tkNewNz = String(u.length)),
      (t.tkRunNz = String(g.length + rt.length)),
      (t.tkHotCls = u.length ? "hot" : ""),
      (t.tkNewN = u.length ? String(u.length) : ""),
      (t.tkRunN = g.length ? String(g.length) : ""),
      (t.tkRetN = rt.length ? String(rt.length) : ""),
      (t.tkRevN = rv.length ? String(rv.length) : ""),
      (t.tkUpN = String(p.length)),
      (t.tkDoneN = String(m.length)),
      (t.tkEmpty = !w),
      (t.tkHas = !!w),
      /* KIVO_265 · «ملفي»: قبل أوّل قراءةٍ من الخادم «جارٍ التحميل» لا «لا مهام» كاذبة */
      (t.tkLoad = !!(MS && null === MS.rows && !MS.err)),
      (t.tkEmptyT =
        MS && MS.me && !lk
          ? "حسابك غير مرتبط بسجل موظف بمعرّف ثابت"
          : MS && MS.err
            ? "تعذّر تحميل مهامك"
            : t.tkLoad
              ? "جارٍ تحميل مهامك…"
              : "لا توجد لديك مهام حالية"),
      (t.tkEmptyS =
        MS && MS.me && !lk
          ? "لا تظهر المهام إلا لحسابٍ مرتبطٍ بسجلّه الوظيفي — راجع مدير الإدارة"
          : MS && "session" === MS.err
            ? "انتهت الجلسة — سجّل الدخول مجدداً لعرض مهامك"
            : MS && MS.err
              ? "تحقّق من الاتصال — تُعاد المحاولة تلقائياً"
            : t.tkLoad
              ? ""
              : "حين يُسند إليك شيء يظهر هنا فوراً ويصلك تنبيه في الجرس"),
      /* RISHAD-266: بعد 401 لا إعادة محاولة (الخدمة لا تعيد) — فلا زر ولا وعدٌ كاذب */
      (t.tkRetryOn = !!(MS && MS.err && "session" !== MS.err && !(MS.me && !lk))),
      (t.tkRetry = () => ((this._tkRetryAt = 0), MT && !MT.state().loading && !this._tkLoadQ && this._tkLd(MT))),
      (t.tkExpN = o.filter((t) => "expired" === t.st && !(t.r[20] && t.r[20].exp)).length),
      (t.tkSub = w
        ? KIVO.BassamCount(l.length, "مهمة") + " — الأهم أولاً"
        : rv.length
          ? "سلّمت ما عليك — بانتظار المراجعة"
          : "ما أُسند إليك — تستلمه وتنفّذه وتوثّقه من هنا"));
    /* إحصاء الشهر للسجل وللحالة الفارغة */
    const b = (t) => {
        const e = t.filter((t) => "done" === t.st),
          s = e.filter((t) => t.r[6] && "late" !== t.r[6][0]).length;
        return {
          done: e.length,
          ontime: s,
          late: e.length - s,
          dec: t.filter((t) => "declined" === t.st).length,
          exp: t.filter((t) => "expired" === t.st).length,
        };
      },
      k = b(o.filter((t) => t.y === e.T.y && t.m === e.T.m));
    ((t.tkMonDone = String(k.done)), (t.tkMonOn = String(k.ontime)), (t.tkMonLate = String(k.late)), (t.tkMonDec = String(k.dec + k.exp)));
    /* الأهم الآن */
    if (w) {
      const e = w.r,
        s = w.st,
        n = e[10] || 0,
        r = e[15] || null,
        i = e[16] || null,
        o = e[11] || null,
        /* KIVO_264 · المرحلة الثانية: x حقولُ الخادم للصفّ · cs حالةُ الساعة (المُعادةُ والمتعثّرةُ «جارية») — وw من _tkCur وحده
           (جديدة · قادمة · جارية · متعثّرة · مُعادة: KIVO_265 · P5 حُذفت فروعُ المنجزة والمسلَّمة التي لا تُبلغ) */
        x = e.__x || null,
        cs = "returned" === s || "stalled" === s ? "running" : s,
        FC = this._tkFocusClock(e, s, a);
      ((t.tkFocusOn = !0),
        (t.tkFTitle = e[0] || "مهمة"),
        (t.tkFMeta = [
          "من " + (e[9] || "الإدارة"),
          e[1] ? String(e[1]).trim() : "",
          e[2] && "normal" !== e[2] ? "أولوية " + ({ urgent: "عاجلة", high: "مرتفعة", low: "منخفضة" }[e[2]] || e[2]) : "",
        ]
          .filter(Boolean)
          .join(" · ")),
        (t.tkFState = s),
        (t.tkFNew = "new" === s),
        (t.tkFUp = "upcoming" === s),
        (t.tkFRun = "running" === cs),
        (t.tkFLbl = {
          new: x && x.ack ? "الأهم الآن — استلمتَها ولم تبدأ" : "الأهم الآن — تنتظر استلامك",
          upcoming: "الأهم الآن — قادمة",
          running: "الأهم الآن — جارية",
          stalled: "الأهم الآن — متعثّرة",
          returned: "أُعيدت إليك — استكمل الإثبات",
        }[s]),
        (t.tkFLblC = {
          new: "#b45309",
          upcoming: "#64748b",
          running: "#047857",
          stalled: "var(--warning-text)",
          returned: "var(--danger-text)",
        }[s]),
        (t.tkFIco = { new: "!", upcoming: "◷", running: "▶", stalled: "‖", returned: "↺" }[s]),
        (t.tkFIcoStyle =
          "running" === s
            ? "background:var(--bg-a51501050p12);color:var(--fg-x047857)"
            : "new" === s
              ? "background:var(--bg-a1808390p12);color:var(--fg-xb45309)"
              : "stalled" === s
                ? "background:var(--warning-bg);color:var(--warning-text)"
                : "returned" === s
                  ? "background:var(--danger-bg);color:var(--danger-text)"
                  : "background:var(--bg-xf1f5f9);color:var(--fg-x64748b)"),
        (t.tkFM1L = "البدء"),
        (t.tkFM1V = r ? d(r) : "—"),
        (t.tkFM2L = "الانتهاء"),
        (t.tkFM2V = i ? d(i) : "—"),
        (t.tkFM3L = "المدة"),
        (t.tkFM3V = this._tkDur(n) || "—"),
        (t.tkFM3C = "#141414"));
      /* سطرُ الحالة: سببُ الإعادة · التعثّر · التمديد · المسودّة */
      const BN = this._tkBanner(s, x, d);
      ((t.tkFNoteOn = !!BN), (t.tkFNote = BN ? BN[0] : ""), (t.tkFNoteStyle = BN ? BN[1] : ""));
      if ("new" === s) {
        const e = i ? i - a : 0;
        ((t.tkFTimerOn = !!i),
          (t.tkFBig = FC.big),
          (t.tkFTimerL = x ? "مهلة البدء تنتهي خلال" : "مهلة القبول تنتهي خلال"),
          (t.tkFTimerS = x ? "بعد انتهائها لا يُبدأ إلا بتمديدٍ من المسؤول أو إعادةِ إسنادها" : "بعد انتهائها تُعاد المهمة للمدير لإسنادها لغيرك"),
          (t.tkFBar = FC.bar),
          (t.tkFBarC = "linear-gradient(90deg,#b99751,#d9c07a)"),
          (t.tkFTimerStyle = ""));
      } else if ("upcoming" === s) {
        ((t.tkFTimerOn = !0),
          (t.tkFBig = FC.big),
          (t.tkFTimerL = "تبدأ بعد"),
          (t.tkFTimerS = (x && x.win && x.win.from && a < x.win.from ? "البدء متاح من " + d(x.win.from) : x ? "البدء متاح من الآن" : "القبول متاح من الآن") + (i ? " حتى " + d(i) : "")),
          (t.tkFBar = FC.bar),
          (t.tkFBarC = "#cbd5e1"),
          (t.tkFTimerStyle = ""));
      } else if ("running" === cs) {
        const e = n ? o + 6e4 * n - a : 0,
          s = e < 0;
        ((t.tkFTimerOn = !0),
          (t.tkFBig = FC.big),
          (t.tkFTimerL = n ? (s ? "تجاوزت المدة بـ" : "متبقٍ من مدة المهمة") : "مضى منذ القبول"),
          (t.tkFTimerS = n
            ? "المدة " + this._tkDur(n) + " · مضى منها " + this._tkDur(Math.floor((a - o) / 6e4)) + " · تنتهي " + d(o + 6e4 * n)
            : "بلا مدة محدّدة"),
          (t.tkFBar = FC.bar),
          (t.tkFBarC = s ? "linear-gradient(90deg,#dc2626,#f87171)" : "linear-gradient(90deg,#059669,#34d399)"),
          (t.tkFTimerStyle = s
            ? "border-color:var(--bd-a22038380p35);background:linear-gradient(180deg,var(--bg-a22038380p06),var(--bg-xffffff))"
            : "border-color:var(--bd-a51501050p35);background:linear-gradient(180deg,var(--bg-a51501050p06),var(--bg-xffffff))"));
      }
      ((t.tkFSub =
        "running" === cs
          ? "بدأت " + d(o) + (i ? (o <= i ? " · استجبت في وقتك" : " · تأخّر البدء") : "")
          : "new" === s && x && x.ack
            ? "استلمتَها " + d(x.ack) + " — ابدأ التنفيذ في وقتها"
            : ""),
        (t.tkFSubC = ("running" === cs && (!i || o <= i)) || ("new" === s && x && x.ack) ? "#047857" : "#b45309"));
      /* التوثيق: المُعادة (ليرى الموظف ما سلّمه) · والمسودّةُ المحفوظة قيد التنفيذ */
      const f2 = e[21] && Array.isArray(e[21].imgs) ? e[21].imgs : [];
      ((t.tkFProofOn = ("returned" === s || ("running" === cs && !!(e[21] && e[21].draft))) && (f2.length > 0 || !!(e[21] && e[21].note))),
        (t.tkFProofMsg = "returned" === s ? "ما سلّمته سابقاً — أضف ما طُلب ثم سلّم من جديد" : "مسودّة محفوظة — لم تُسلَّم بعد"),
        (t.tkFProofImgs = f2.map((t) => {
          const e = this._tkImg(t) || "";
          return { src: e, on: !!e, off: !e };
        })),
        (t.tkFProofN = f2.length
          ? 1 === f2.length
            ? "صورة واحدة"
            : 2 === f2.length
              ? "صورتان"
              : KIVO.BassamCount(f2.length, "صورة") + ""
          : ""),
        (t.tkFProofNote = e[21] && e[21].note ? "«" + e[21].note + "»" : ""),
        (t.tkFAccept = () => this.tkAccept(w.day, w.i)),
        (t.tkFDecline = () => this.tkDeclineOpen(w.day, w.i)),
        (t.tkFFinish = () => this.tkFinishOpen(w.day, w.i)));
      /* KIVO_264 · الأفعالُ المتاحة (545 can — مرآةُ قواعد الخادم؛ الحكمُ له): الاستلامُ مستقلٌّ عن البدء · الاعتذارُ بحسب سياسة المهمة ·
         التعثّرُ والاستئناف · ولا فعلَ والمهمةُ بانتظار قرار المراجِع. وضعُ المتصفح بلا خادم (لا x) يبقى على أفعال المرحلة الأولى */
      const C = x && MT && MT.can ? MT.can(x, a) : null;
      /* KIVO_265 · نافذةُ التنفيذ: قبل win.from زرُّ البدء معطّلٌ ويُقال متى يُتاح — والاستلامُ (ack) والاعتذارُ كما هما */
      const EARLY = !!(C && C.early && C.startAt);
      ((t.tkFStartOn = "new" === s || "upcoming" === s),
        (t.tkFStartDis = EARLY),
        (t.tkFStartHint = EARLY ? "البدء متاح من " + d(C.startAt) + (x && x.win && x.win.early ? " (قبل الموعد بـ" + x.win.early + " د)" : "") : ""),
        (t.tkFStartTxt = C ? (EARLY ? "▶ تبدأ " + d(C.startAt) : "upcoming" === s ? "▶ ابدأ الآن" : "▶ بدء التنفيذ") : "upcoming" === s ? "✓ قبول المهمة الآن" : "✓ قبول المهمة"),
        (t.tkFAckOn = !!(C && C.ack)),
        (t.tkFDecOn = C ? !!C.decline : !0),
        (t.tkFStallOn = !!(C && C.stall)),
        (t.tkFResumeOn = !!(C && C.resume)),
        (t.tkFFinTxt = !C ? "✓ تم الإنجاز — وثّق بالصورة" : "returned" === s ? "↺ استكمال الإثبات" : "✓ التوثيق والتسليم"),
        (t.tkFAck = () => this.tkAck(w.day, w.i)),
        (t.tkFStall = () => this.tkDeclineOpen(w.day, w.i, "stall")),
        (t.tkFResume = () => this.tkResume(w.day, w.i)),
        (t.tkFTlOn = !!(x && MT)),
        (t.tkFTl = () => this.tkTlOpen(w.day, w.i)));
      /* KIVO_265 · البند 9: فعلٌ بانتظار الإرسال على هذا الصفّ ⇒ لا أزرارَ حتى يصل (ترتيبُ الصفّ) وشارةٌ تقول ما اصطفّ */
      const QN = x && x.q ? x.q : 0;
      ((t.tkFQOn = QN > 0),
        (t.tkFQTxt = QN ? "بانتظار الإرسال: " + ((MT && MT.queue && MT.queue.ACT[x.qAct]) || x.qAct) + (QN > 1 ? " (+" + (QN - 1) + ")" : "") + " — يُرسل تلقائياً عند عودة الاتصال" : ""),
        QN && ((t.tkFStartOn = !1), (t.tkFRun = !1), (t.tkFAckOn = !1)));
      /* مراحلُ المهمة: الاستلام ⇒ التنفيذ ⇒ التوثيق ⇒ (المراجعة ⇒ الاعتماد | الإنجاز) */
      const RV = !!(x && x.rv),
        g2 = RV ? ["استلام", "تنفيذ", "توثيق", "مراجعة", "معتمدة"] : ["استلام", "تنفيذ", "توثيق", "منجزة"],
        m2 = "returned" === s ? 2 : "running" === cs ? (e[21] && e[21].draft ? 2 : 1) : x && x.ack ? 1 : 0;
      t.tkFSteps = g2.map((t, e) => ({ t, cls: "pf-st" + (e < m2 ? " done" : e === m2 ? " on" : "") }));
    } else t.tkFocusOn = !1;
    /* بقية مهام اليوم — صفوف مختصرة */
    /* KIVO_264 · المرحلة الثانية: المُعادةُ أولاً ثم الجديدة فالجارية/المتعثّرة فالقادمة؛ والمغلقةُ (منجزة · اعتذار · منقضية ·
       ملغاة · أُعيد إسنادها) في «السجل» — KIVO_265: وما سُلّم للمراجِع في قسمه «بانتظار اعتماد المسؤول (N)» (tkRv) يفتح سجلَّ المهمة */
    const OR = { returned: 0, new: 1, running: 2, stalled: 2, upcoming: 3 },
      P2 = {
        stalled: "background:var(--warning-bg);color:var(--warning-text)",
        returned: "background:var(--danger-bg);color:var(--danger-text)",
        review: "background:var(--info-bg);color:var(--info-text)",
      },
      M = l.filter((t) => t !== w).sort((t, e) => OR[t.st] - OR[e.st] || (t.r[15] || 0) - (e.r[15] || 0)),
      S = M.slice(0, 3),
      Q = (e) => {
        const s = e.r,
          n = e.st,
          rq = "review" === n,
          tl = !!(s.__x && MT);
        return {
          key: e.day + "#" + e.i,
          title: s[0] || "مهمة",
          meta: this._tkRestMeta(s, n, a),
          pill: { new: "جديدة", running: "جارية", upcoming: "قادمة", stalled: "متعثّرة", returned: "أُعيدت", review: "للمراجعة" }[n],
          pillStyle:
            P2[n] ||
            {
              new: "background:var(--bg-a1808390p12);color:var(--fg-xb45309)",
              running: "background:var(--bg-a51501050p12);color:var(--fg-x047857)",
              upcoming: "background:var(--bg-xf1f5f9);color:var(--fg-x64748b)",
            }[n],
          ico: { new: "!", running: "▶", upcoming: "◷", stalled: "‖", returned: "↺", review: "◔" }[n],
          icoStyle:
            P2[n] ||
            {
              new: "background:var(--bg-a1808390p12);color:var(--fg-xb45309)",
              running: "background:var(--bg-a51501050p12);color:var(--fg-x047857)",
              upcoming: "background:var(--bg-xf1f5f9);color:var(--fg-x64748b)",
            }[n],
          rowStyle: rq && !tl ? "cursor:default" : "",
          open: rq ? () => tl && this.tkTlOpen(e.day, e.i) : () => this.setState({ tkFocus: e.day + "#" + e.i }),
        };
      };
    ((t.tkRestOn = S.length > 0),
      (t.tkRest = S.map(Q)),
      (t.tkRvOn = rv.length > 0),
      (t.tkRvHead = "بانتظار اعتماد المسؤول (" + rv.length + ")"),
      (t.tkRv = rv.map(Q)),
      (t.tkMoreTxt = [M.length > 3 ? "+" + (M.length - 3) + " أخرى" : "", m.length ? m.length + " منجزة اليوم" : ""]
        .filter(Boolean)
        .join(" · ")),
      (t.tkLogOpen = () => this.tkLogOpen()));
    {
      let NX = 1 / 0;
      const B = (t) => {
        t > a && t < NX && (NX = t);
      };
      w &&
        ("running" === w.st || "stalled" === w.st || "returned" === w.st) &&
        w.r[10] &&
        w.r[11] &&
        B(w.r[11] + (Math.floor((a - w.r[11]) / 6e4) + 1) * 6e4);
      S.forEach((t) => {
        if ("upcoming" === t.st && t.r[15]) {
          const e = Math.round((t.r[15] - a) / 6e4);
          e >= 2 && B(t.r[15] - (e - 0.5) * 6e4);
        }
      });
      if ("tkfin" === s.pfPanel && s.tkRef) {
        const t = o.find((t) => t.day === s.tkRef.day && t.i === s.tkRef.idx);
        t && t.r[11] && B(t.r[11] + (Math.floor((a - t.r[11]) / 6e4) + 1) * 6e4);
      }
      const ON =
        NX < 1 / 0 ||
        o.some(
          (t) =>
            "running" === t.st || "stalled" === t.st || "returned" === t.st || "upcoming" === t.st || ("new" === t.st && !!t.r[16]),
        );
      this._tkPlan = {
        on: ON,
        nxt: NX,
        sig: o.map((t) => this._tkSig1(t.r, a)).join(""),
        focus: w ? { day: w.day, i: w.i, st: w.st } : null,
        big: t.tkFBig || "",
        bar: t.tkFBar || "",
        rest: S.map((e) => ({ day: e.day, i: e.i, st: e.st, meta: this._tkRestMeta(e.r, e.st, a) })),
        all: o.map((t) => ({ day: t.day, i: t.i })),
      };
    }
    /* المنبثقات */
    const D = s.tkRef ? o.find((t) => t.day === s.tkRef.day && t.i === s.tkRef.idx) : null,
      R = D ? D.r : null;
    ((t.pfPanelTkFin = "tkfin" === s.pfPanel && !!R),
      (t.pfPanelTkDec = "tkdec" === s.pfPanel && !!R),
      (t.pfPanelTkLog = "tklog" === s.pfPanel),
      (t.tkDlgTitle = R ? R[0] || "مهمة" : ""),
      (t.tkFinSub =
        R && R[11]
          ? "مضى " + this._tkDur(Math.max(1, Math.floor((a - R[11]) / 6e4))) + (R[10] ? " · المدة " + this._tkDur(R[10]) : "")
          : ""),
      (t.tkImgs = (s.tkImgs || []).map((t, e) => ({ src: t, rm: () => this.tkRmImg(e) }))),
      (t.tkImgsHas = (s.tkImgs || []).length > 0),
      (t.tkImgsCan = (s.tkImgs || []).length < 4),
      (t.onTkPick = (t) => this.onTkPick(t)),
      (t.tkImgErr = s.tkImgErr || ""),
      (t.tkNote = s.tkNote || ""),
      (t.onTkNote = (t) => this.setState({ tkNote: t.target.value })),
      (t.tkFinPerf = (() => {
        const t = this._tkPerfRow(R, a);   /* KIVO_265: الأداءُ من المهلة (546 perf = 070 tkPerfOf) */
        return t ? t[1] : "";
      })()),
      (t.tkFinPerfC = (() => {
        const t = this._tkPerfRow(R, a);
        return !t ? "#64748b" : "late" === t[0] ? "#b45309" : "#047857";
      })()),
      (t.tkFinGo = () => this.tkFinish()),
      (t.tkFinDis = !(s.tkImgs || []).length || !!s.tkBusy),
      (t.tkFinHint = (s.tkImgs || []).length ? "" : "أضف صورة التوثيق أولاً"),
      (t.tkFinBtn = s.tkBusy ? "جارٍ الحفظ…" : "إنهاء المهمة"),
      (t.tkWhys = ["مكلَّف بموقع آخر", "الوقت لا يسمح", "خارج نطاق عملي", "ظرف طارئ", "أخرى"].map((e) => ({
        t: e,
        cls: "pf-whychip" + (s.tkWhy === e ? " on" : ""),
        pick: () => this.setState({ tkWhy: e }),
      }))),
      (t.tkWhyOther = "أخرى" === s.tkWhy),
      (t.tkWhyTxt = s.tkWhyTxt || ""),
      (t.onTkWhyTxt = (t) => this.setState({ tkWhyTxt: t.target.value })),
      (t.tkDecGo = () => this.tkDecline()));
    this._tkP2Panels(t, s, D);
    /* السجل */
    if ("tklog" === s.pfPanel) {
      const Y = s.tkLogY || e.T.y,
        Mo = s.tkLogM || e.T.m,
        rows = o.filter((t) => t.y === Y && t.m === Mo && !this._tkUnseen(t, e.T)),
        st = b(rows),
        fl = s.tkLogF || "all",
        vis = rows
          .filter(
            (t) =>
              "all" === fl ||
              ("done" === fl
                ? "done" === t.st
                : "late" === fl
                  ? "done" === t.st && t.r[6] && "late" === t.r[6][0]
                  : "declined" === fl
                    ? "declined" === t.st || "expired" === t.st
                    : !0),
          )
          .sort((t, e) => e.d - t.d || (e.r[12] || e.r[15] || 0) - (t.r[12] || t.r[15] || 0)),
        byDay = {};
      vis.forEach((t) => {
        (byDay[t.d] = byDay[t.d] || []).push(t);
      });
      ((t.tkLogTitle = f[Mo - 1] + " " + Y),
        (t.tkLogDone = String(st.done)),
        (t.tkLogOn = st.done ? st.ontime + " · " + Math.round((100 * st.ontime) / st.done) + "٪" : "0"),
        (t.tkLogLate = String(st.late)),
        (t.tkLogDec = String(st.dec + st.exp)),
        (t.tkLogFilt = [
          ["all", "الكل"],
          ["done", "منجزة"],
          ["late", "متأخرة"],
          ["declined", "اعتذار / لم تُقبل"],
        ].map((t) => ({
          t: t[1],
          style:
            fl === t[0]
              ? "background:var(--bg-x141414);color:var(--fg-xffffff);cursor:pointer"
              : "background:var(--bg-xf1f5f9);color:var(--fg-x64748b);cursor:pointer",
          pick: () => this.setState({ tkLogF: t[0] }),
        }))),
        (t.tkLogPrev = () => {
          let t = Mo - 1,
            e = Y;
          (t < 1 && ((t = 12), e--), this.setState({ tkLogM: t, tkLogY: e }));
        }),
        (t.tkLogNext = () => {
          let t = Mo + 1,
            e = Y;
          (t > 12 && ((t = 1), e++), this.setState({ tkLogM: t, tkLogY: e }));
        }),
        (t.tkLogEmpty = 0 === vis.length),
        (t.tkLogDays = Object.keys(byDay)
          .map(Number)
          .sort((t, e) => e - t)
          .map((dd) => ({
            label: (dd === e.T.d && Mo === e.T.m && Y === e.T.y ? "اليوم — " : "") + dd + " " + f[Mo - 1],
            rows: byDay[dd].map((t) => {
              const e = t.r,
                s = t.st,
                n = e[21] && Array.isArray(e[21].imgs) ? e[21].imgs : [],
                r = n.length ? this._tkImg(n[0]) : "",
                z = this._tkLogP2(s, e, d),
                tl = !!(e.__x && KIVO.BassamMyTasks);
              return {
                title: e[0] || "مهمة",
                /* KIVO_264: الصفُّ يفتح سجلَّ المهمة (فاعلٌ ووقت) ويعود إلى هنا */
                open: tl ? () => this.tkTlOpen(t.day, t.i, "tklog") : () => {},
                rowStyle: tl ? "cursor:pointer" : "cursor:default",
                meta: z
                  ? z[0]
                  : "done" === s
                    ? d(e[11]) +
                      " ← " +
                      d(e[12]) +
                      (n.length
                        ? " · " + (1 === n.length ? "صورة" : 2 === n.length ? "صورتان" : KIVO.BassamCount(n.length, "صورة") + "")
                        : "") +
                      (e[21] && e[21].note ? " + ملاحظة" : "")
                    : "declined" === s
                      ? "اعتذرت " + d(e[20] && e[20].at) + (e[20] && e[20].why ? " — «" + e[20].why + "»" : "")
                      : "expired" === s
                        ? "انقضت مهلة القبول " + d(e[16]) + " بلا ردّ"
                        : "running" === s
                          ? "جارية منذ " + d(e[11])
                          : e[15]
                            ? "تبدأ " + d(e[15])
                            : "",
                pill: z
                  ? z[1]
                  : "done" === s
                    ? e[6]
                      ? e[6][1]
                      : "منجزة"
                    : "declined" === s
                      ? "اعتذار"
                      : "expired" === s
                        ? "لم تُقبل"
                        : "running" === s
                          ? "جارية"
                          : "تنتظر",
                pillStyle: z
                  ? z[2]
                  : "done" === s
                    ? e[6] && "late" === e[6][0]
                      ? "background:var(--bg-a1808390p12);color:var(--fg-xb45309)"
                      : "background:var(--bg-a51501050p12);color:var(--fg-x047857)"
                    : "declined" === s || "expired" === s
                      ? "background:var(--bg-xf1f5f9);color:var(--fg-x64748b)"
                      : "running" === s
                        ? "background:var(--bg-a51501050p12);color:var(--fg-x047857)"
                        : "background:var(--bg-a1808390p12);color:var(--fg-xb45309)",
                thumb: r,
                thumbOn: !!r,
                icoOn: !r,
                ico: z ? z[3] : "done" === s ? "✓" : "declined" === s ? "—" : "expired" === s ? "⌛" : "running" === s ? "▶" : "!",
                icoStyle:
                  "done" === s
                    ? "background:var(--bg-x059669);color:var(--fg-xffffff)"
                    : "background:var(--bg-xf1f5f9);color:var(--fg-x94a3b8)",
              };
            }),
          }))));
    }
    return t;
  }
  _pfField(t, e, s) {
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
            "يحتاج تفعيل صفحة «المتابعة اليومية» في سقف إدارتك أولاً — يفعّلها مدير النظام من «الإدارات»، ثم يمنحك مدير الإدارة ورقة «رصد الميدان»")
        : -1 === a.indexOf("field")
          ? (t.fdNote = r + "يحتاج تفعيل ورقة «رصد الميدان» ضمن أوراق «المتابعة اليومية» لإدارتك — يفعّلها مدير النظام من «الإدارات»")
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
      (t.fdWhyPh = "أخرى" === f.why ? "اكتب السبب — مطلوب مع «أخرى»" : "تفصيل السبب (اختياري)"),
      (t.fdNow = a.clock()),
      (t.fdMe = (KIVO.BassamAuth && KIVO.BassamAuth.display && KIVO.BassamAuth.display().name) || ""));
    const l = !(!f.why || ("أخرى" === f.why && !f.txt.trim()));
    ((t.fdOkDis = !l),
      (t.fdDlgNo = () => this._pfFieldPending ? this.bsToast("الرصد السابق لم يُحسم — أعد تأكيد الطلب نفسه قبل إغلاق المسودة", "warn") : this.setState({ fdDlg: null })),
      (t.fdDlgOk = async () => {
        if (!l) return;
        this._pfFieldPending = true;
        const t = "أخرى" === f.why ? f.txt.trim() : f.txt.trim() ? f.why + " — " + f.txt.trim() : f.why,
          e = await a.observe(n, f.fi, f.gi, { st: "closed", why: t, kind: f.kind, expected: f.g });
        i(e, "سُجّل إغلاق " + (f.name || "") + " الساعة " + a.clock());
      }));
  }
  /* KIVO_264 · حقائقُ يومي الموحّدة { M, src, toks, els, loading }: ردُّ الخادم (/api/me/today) في الوضع السحابي هو المرجع — والحسابُ المحلي
     بالقواعد نفسِها (PF-CORE) رسمٌ أوّلُ حتى يصل لمن تصله المفاتيح، أو بديلٌ حين يتعذّر الخادم، أو في الوضع المحلي. toks/els محليّةٌ دائماً
     (للخريطة ورصد الميدان على جولة اليوم المحلية). */
  pfMine(o) {
    const PF = KIVO.BassamProfileFacts,
      S = this.state,
      srv = S.pfMe && S.pfMe.ok && this.pfMeSame(this._pfMeScope) ? S.pfMe : null;
    let loc = null;
    try {
      loc = PF && o.user ? PF.today({ user: o.user, emps: o.emps, staffing: o.staffing, locks: o.locks, dreport: o.dreport, plan: o.plan, rounds: o.rounds, opts: o.opts, now: Date.now() }) : null;
    } catch (t) {
      loc = null;
    }
    const useLoc = !!loc && (!this.isCF() || (!srv && !!o.readable));
    return { M: srv || (useLoc ? loc : null), src: srv ? "server" : useLoc ? "local" : "none", toks: (loc && loc.toks) || [], loading: !srv && !useLoc && this.isCF() && !S.pfMeErr };
  }
  pfCompute(t) {
    const AU = KIVO.BassamAuth,
      s = KIVO.BassamEmp,
      a = KIVO.BassamNeed,
      r = KIVO.BassamLeaf,
      n = KIVO.BassamSup,
      PF = KIVO.BassamProfileFacts,
      i = t ? t.role : "",
      o = "super" === i;
    let appt = !1;
    try {
      appt = !!(t && "staff" === i && AU && AU.isMgrKey && AU.isMgrKey(t.ekey));
    } catch (x) {
      appt = !1;
    }
    /* KIVO_264 · OD-6 (D10): الموظفُ بصفة مدير (سجلٌّ + شارة mgr) يبقى موظفاً — يومُه وبطاقاتُه ومهامُّه ومعها صندوقُ المدير؛
       ومديرُ الإدارة المعيَّن (mgr:) حسابٌ بلا سجلٍّ ولا يومٍ تشغيليّ مفترَض */
    const f = !!(t && (appt || ("staff" === i && t.mgr) || "dept" === i || "gm" === i)),
      l = !!(t && "staff" === i && !appt),
      h = o || f;
    const raw = (k) => {
      try {
        const ops = KIVO.__BS_SRV && KIVO.__BS_SRV.operations;
        return ops && ops.state(k) === "ready" ? ops.get(k) : null;
      } catch (x) {
        return null;
      }
    };
    const y = this.LS("bassam_employees_v1", []),
      u0 = this.LS("bassam_staffing_v3", {}),
      u = u0 && "object" == typeof u0 ? u0 : {},
      LK = this.LS("bassam_staffing_locks_v1", {}),
      B = this.LS("bassam_dreport_v1", {}),
      RND = this.LS("bassam_rounds_v1", {}),
      Z = this.LS("bassam_plan_v1", {}),
      GO = this.LS("bassam_shift_options_v1", []);
    const ME = l ? this.pfMine({ user: t, emps: y, staffing: u, locks: LK, dreport: B, plan: Z, rounds: RND, opts: GO, readable: null !== raw("bassam_employees_v1") && null !== raw("bassam_staffing_v3") }) : null,
      MM = ME && ME.M,
      F = MM ? MM.facts : null,
      SITE = MM ? MM.site : null,
      toks = ME ? ME.toks : [];
    /* يومان: (١) يومُ الجهاز التقويمي p كما في KIVO_263 — عليه الخريطةُ ورصدُ الميدان (يكتب في جولة اليوم التي تراها المتابعةُ اليومية) والمهامُّ
       وبنودُ المدير؛ (٢) اليومُ التشغيليّ Pop لحقائقي (الورديةُ الليلية تتبع يومَ بدئها — OD-10) ومنه شهرُ «السجل» الجاري. يختلفان بعد منتصف الليل
       في ورديةٍ ليلية وحدها — ولا يُنقل رصدُ الميدان إلى جولة الأمس (كان سيُكتب حيث لا تراه المتابعةُ اليومية). */
    const c = new Date(),
      P0 = this.hParts(c),
      p = P0,
      Pop = l && MM && MM.day ? { y: MM.day.y, m: MM.day.m, d: MM.day.d } : P0,
      wdOp = l && MM && MM.day ? MM.day.wd : this.wdName(c),
      m = p.y + "-" + p.m + "-" + p.d,
      d = this.wdName(c),
      g = u[p.y + "-" + p.m] || {},
      w = Array.isArray(g.__shifts) && g.__shifts.length ? g.__shifts : GO,
      S = (t) => (s ? s.entryKey(g, t) : (t && (t.eid || t.nid || t.name)) || ""),
      b = {};
    /* فهرسُ رموز العمليات (عدّ التغطية والاحتياط للمدير — كما في صفحات التشغيل) — لا يُستعمل في هويتي */
    y.forEach((t) => {
      ((s ? s.tokens(t) : [t.eid, t.nid, t.name]).forEach((e) => {
        e && (b[e] = t);
      }),
        t && t.name && (b[t.name] = b[t.name] || t));
    });
    const v = (t) => b[t] || null,
      k = (t) => {
        const e = v(t);
        return e ? S(e) : t;
      },
      M = (t) => (g[t] && "object" == typeof g[t] ? g[t] : {}),
      O = (t) => M(t).shift || "",
      T = {};
    Object.keys(g).forEach((t) => {
      "__shifts" !== t && g[t] && g[t].shift && (T[g[t].shift] = 1);
    });
    const _ = w.filter((t) => t && t.name && T[t.name]),
      A = l ? this.myRec() : null,
      E = toks[0] || "",
      R = B[m] || null,
      D = R && R.shifts ? Object.keys(R.shifts).filter((t) => R.shifts[t] && R.shifts[t].pulled) : [],
      N = D.length > 0;
    let V = "";
    try {
      V = (KIVO.BassamDayShift ? KIVO.BassamDayShift.get(p.y, p.m, p.d) : "") || "";
    } catch (t) {}
    V || (V = l ? (F && F.shift.name) || "" : _[0] ? _[0].name : "");
    const W = l ? (F && F.shift.name) || "" : V,
      U = (R && R.shifts && W && R.shifts[W]) || null,
      q = l
        ? F && F.shift.def && (F.shift.def.tStart || F.shift.def.tEnd)
          ? { name: W, tStart: F.shift.def.tStart, tEnd: F.shift.def.tEnd }
          : null
        : U && U.def && (U.def.tStart || U.def.tEnd)
          ? Object.assign({ name: W }, U.def)
          : w.filter((t) => t && t.name === W)[0] || null,
      $ = U && U.pulled && Array.isArray(U.roster) ? U.roster : [],
      J = { pr: 0, ab: 0, pm: 0, lv: 0 };
    $.forEach((t) => {
      const e = (t && t.st) || "pr";
      void 0 !== J[e] && J[e]++;
    });
    const X = {};
    R &&
      R.shifts &&
      (Object.keys(R.shifts).forEach((t) => {
        const e = R.shifts[t];
        e &&
          e.pulled &&
          (e.roster || []).forEach((e) => {
            e && e.ekey && (X[k(e.ekey)] = { st: e.st || "pr", sh: t });
          });
      }),
      Object.keys(R.shifts).forEach((t) => {
        const e = R.shifts[t];
        e &&
          e.pulled &&
          Object.keys(e.tout || {}).forEach((e) => {
            X[k(e)] = X[k(e)] || { st: "tout", sh: t };
          });
      }));
    /* الخريطة: جولةُ اليوم، وإلا مواقعُ خطة الشهر (تُرسم الخريطةُ نفسُها ولو كانت مسودة — لكن المسودة لا تُعلَّم «موقعك» — OD-5) */
    const Q = RND[m] || null,
      tt = Array.isArray(Z.floors) ? Z.floors : [],
      et = (Z.months || {})[p.y + "-" + p.m],
      st = et ? (Array.isArray(et) ? et : et.d) : null,
      at =
        !(Q && Array.isArray(Q.d)) &&
        Array.isArray(st) &&
        st.some((t) => t && ((t.gates || []).length || (t.zones || []).length || (t.marks || []).length)),
      rt = Q && Array.isArray(Q.d) ? Q.d : at ? st : [],
      planDraft = !!(at && Array.isArray(st) && !st.every((t) => t && !0 === t.approved)),
      nt = new Set();
    try {
      n &&
        y.forEach((t) => {
          const e = S(t);
          n.supName(e) && nt.add(e);
        });
    } catch (t) {}
    try {
      const t = (U && U.leaders) || {};
      [t.chief, t.deputy].filter(Boolean).forEach((t) => nt.add(k(t)));
    } catch (t) {}
    /* راحةُ زميلٍ اليوم: من خريطة التقرير المسحوب إن ورد فيه، وإلا من الجدول الشهري (كما كانت) */
    const L2 = (t) => {
      let a = null;
      N &&
        Object.keys(R.shifts).forEach((s) => {
          const r0 = R.shifts[s];
          if (!r0 || !r0.pulled) return;
          const n0 = r0.rest && "object" == typeof r0.rest ? r0.rest : {};
          Object.keys(n0).forEach((x) => {
            k(x) === t && Array.isArray(n0[x]) && (a = n0[x]);
          });
        });
      return a || M(t).rest;
    };
    const it = $.length > 0,
      ot = (t) => {
        if (this.isRestOn(L2(t), d)) return !1;
        const e = X[t];
        return !e || ("ab" !== e.st && "lv" !== e.st && "pm" !== e.st && "tout" !== e.st);
      },
      ct = (t, e, s) => {
        if (PF) return PF.label(t, e);
        if ("marks" === t) return e.label || e.kind || "معلم";
        if ("zones" === t) return e.code || e.name || "مصلى";
        let a = e.num || "";
        try {
          e.pOf && r && (a = r.leafLabel(r.parentOf(s, e) || e, e));
        } catch (t) {}
        return a ? "باب " + a : "باب";
      },
      mt = { red: 0, amb: 0, gap: 0, closed: 0, ok: 0, els: 0 },
      dt = [];
    rt.forEach((t, e) => {
      const s = t.gates || [];
      [
        ["gates", s],
        ["zones", t.zones || []],
        ["marks", t.marks || []],
      ].forEach(([t, n]) =>
        n.forEach((n, i) => {
          if (!n) return;
          const o = "gates" === t && r && r.isParent(n),
            f = "gates" === t ? !!n.closed : !!n.off,
            l = ((t) => (t.emp || []).filter((t) => ((t) => !V || (O(k(t)) || (X[k(t)] || {}).sh || "") === V)(t) && !nt.has(k(t))))(n);
          if (o) return;
          const h = f ? 0 : a ? (V ? a.of(n, V) : a.tot(n, w)) : 0,
            c = it ? l.filter((t) => ot(k(t))).length : l.length;
          let p = "non";
          (f ? (p = "cls") : h > 0 ? (p = 0 === c ? "red" : c < h ? "amb" : "ok") : c > 0 && (p = "tea"),
            mt.els++,
            "red" === p
              ? (mt.red++, (mt.gap += h))
              : "amb" === p
                ? (mt.amb++, (mt.gap += h - c))
                : "cls" === p
                  ? mt.closed++
                  : ("ok" !== p && "tea" !== p) || mt.ok++,
            "number" == typeof n.x &&
              "number" == typeof n.y &&
              "zones" !== t &&
              dt.push({ fi: e, kind: t, i: i, x: n.x, y: n.y, st: p, need: h, c: c, closed: f, uid: String(n.uid || n.eid || ""), label: ct(t, n, s), short: "gates" === t ? (n.pOf ? "" : String(n.num || "")) : "" }));
        }),
      );
    });
    /* KIVO_264 · D19: عنصري على الخريطة حتميّ — الإسنادُ الرسمي ثم تسكينُ اليوم (بالمعرّف الثابت uid؛ وبالموضع حين يكون المصدرُ نفسَه) */
    const findEl = (sx, src) => {
      if (!sx) return null;
      for (let fi = 0; fi < rt.length; fi++) {
        const fl = rt[fi];
        if (!fl) continue;
        const L = Array.isArray(fl[sx.kind]) ? fl[sx.kind] : [];
        for (let ii = 0; ii < L.length; ii++) {
          const el = L[ii];
          if (!el) continue;
          const hit = sx.uid ? String(el.uid || el.eid || "") === sx.uid : (("round" === src && Q) || ("plan" === src && at)) && fi === sx.fi && ii === sx.i;
          if (hit) return { fi: fi, kind: sx.kind, i: ii, x: el.x, y: el.y, label: sx.label, short: sx.short, loc: sx.loc, closed: "gates" === sx.kind ? !!el.closed : !!el.off };
        }
      }
      return null;
    };
    const offEl = l && SITE ? findEl(SITE.official, "plan") : null,
      tdEl = l && SITE ? findEl(SITE.today, "round") : null,
      lt = offEl ? Object.assign({ which: "official" }, offEl) : tdEl ? Object.assign({ which: "today" }, tdEl) : null,
      ltToday = offEl && tdEl && !(offEl.fi === tdEl.fi && offEl.kind === tdEl.kind && offEl.i === tdEl.i) ? tdEl : null;
    /* رصدُ الميدان: مواقعي في جولة اليوم المحلية (بمعرّفي الثابت) — المغلقُ أولاً */
    let ht = [];
    try {
      ht = l && PF && Q && toks.length
        ? PF.site({ plan: {}, round: Q, ym: "", toks: toks }).els.todayAll.map((x) => ({ fi: x.fi, kind: x.kind, i: x.i, label: PF.label(x.kind, x.el), x: x.el.x, y: x.el.y, closed: "gates" === x.kind ? !!x.el.closed : !!x.el.off }))
        : [];
    } catch (x) {
      ht = [];
    }
    const yt = y.filter((t) => {
        const e = S(t),
          s = (X[e] && X[e].sh) || O(e);
        return V ? s === V : !!s;
      });
    /* «أسبوعك» للمدير: اعتمادُ التقرير اليومي آخر ٧ أيام (كما كان) · وللموظف: طبقتا المجدول والفعلي من حقائقه (PF-CORE) */
    const vt = [];
    if (!l)
      for (let t = 6; t >= 0; t--) {
        const e = new Date(c.getTime() - 864e5 * t),
          s = this.hParts(e),
          a = s.y + "-" + s.m + "-" + s.d,
          r = this.wdName(e),
          n = B[a];
        let i = "none",
          o = "—";
        if (n && n.shifts) {
          const t = Object.keys(n.shifts).filter((t) => n.shifts[t] && n.shifts[t].pulled);
          if (t.length) {
            const e = t.every((t) => n.shifts[t].ap);
            ((i = e ? "ap" : "open"), (o = e ? "✓" : "!"));
          }
        }
        vt.push({ d: s.d, wd: r.replace(/^ال/, ""), code: i, txt: o, today: 0 === t, full: r + " " + s.d + " " + this.MONTHS()[s.m - 1] });
      }
    const kt = { pr: 0, ab: 0, pm: 0, lv: 0, ap: 0, open: 0 };
    l ||
      Object.keys(B).forEach((t) => {
        const e = t.split("-");
        if (3 !== e.length || +e[0] !== p.y || +e[1] !== p.m) return;
        const s = B[t];
        if (!s || !s.shifts) return;
        const a = Object.keys(s.shifts).filter((t) => s.shifts[t] && s.shifts[t].pulled);
        a.length && (a.every((t) => s.shifts[t].ap) ? kt.ap++ : kt.open++);
      });
    return {
      me: t,
      role: i,
      isSuper: o,
      isMgr: f,
      isAppt: appt,
      isStaff: l,
      mgrView: h,
      /* T/DK/wd: يومُ الجهاز كما كان (الخريطة · رصدُ الميدان · المهام · بنودُ المدير) · Top/wdOp: اليومُ التشغيلي (الحقائق · «السجل» — OD-10) */
      T: p,
      Top: Pop,
      DK: m,
      wd: d,
      wdOp: wdOp,
      now: c,
      emps: y,
      bucket: g,
      shiftDefs: w,
      dist: _,
      myRec: A,
      myKey: E,
      myToks: toks,
      ME: ME,
      F: F,
      SITE: SITE,
      mates: MM ? MM.mates || [] : [],
      matesN: MM ? MM.matesN || 0 : 0,
      pfWeek: MM && Array.isArray(MM.week) ? MM.week : [],
      pfMon: MM ? MM.mon : null,
      repToday: N,
      dayShift: V,
      shiftRef: W,
      sdef: q,
      rec: R,
      sr: U,
      roster: $,
      cnt: J,
      stByKey: X,
      STL: { pr: "حاضر", ab: "غائب", pm: "مستأذن", lv: "إجازة", tout: "محوَّل", rest: "راحة" },
      rnd: Q,
      fromPlan: at,
      planDraft: planDraft,
      floors: rt,
      pfl: tt,
      mySpot: lt,
      myTodayEl: ltToday,
      cov: mt,
      mapEls: dt,
      shiftEmps: yt,
      mySpots: ht,
      week: vt,
      mon: kt,
      keyOf: S,
      keyOfTok: k,
      empOfTok: v,
      present: ot,
      supSet: nt,
    };
  }
  perfOf(t, e, s) {
    if (!t || !e || !s) return null;
    const a = 6e4 * s,
      r = t + a - e,
      n = (t) => {
        const e = Math.floor(Math.abs(t) / 6e4),
          s = Math.floor(e / 60),
          a = e % 60;
        return (s ? s + " س" : "") + (s && a ? " " : "") + (a || !s ? a + " د" : "");
      };
    return r <= -6e4 ? ["late", "متأخر " + n(r)] : r >= 0.1 * a ? ["early", "مبكر بـ " + n(r)] : ["on_time", "في الوقت"];
  }
  /* ═══ KIVO_264 · العنوان #/profile/history: يفتح «السجل» (رابطٌ مباشر) — ويُكتب الذيلُ عند فتحه ويُمحى عند إغلاقه ═══ */
  _pfHR() {
    try {
      const o = KIVO.__BS_OPEN_TAB;
      if (!o || "profile" !== o.page) return;
      KIVO.__BS_OPEN_TAB = null;
      "history" === o.tab && setTimeout(() => this._pfAlive && this.pfOpenHist("all", ""), 0);
    } catch (t) {
      KIVO.__BS_OPEN_TAB = null;
    }
  }
  _pfHT(tab) {
    try {
      const h = String(location.hash || "");
      if (0 !== h.indexOf("#/profile")) return;
      const w = tab ? "#/profile/" + tab : "#/profile";
      h !== w && history.replaceState && history.replaceState(null, "", location.pathname + location.search + w);
    } catch (t) {
      this._pfHTerr = 1;
    }
  }
  /* يُفتح «السجل» على الشهر المطلوب، وإلا الشهرُ الجاري (اليومُ التشغيلي) — لا على آخر شهرٍ تُصفِّح سابقاً: «التفاصيل» تعني هذا الشهر.
     الفتحُ يعيد جلبَ الشهر (المحفوظُ في الحالة يُعرض حتى يصل الأحدث) فلا يبقى سجلٌّ قديم بعد تعديلٍ من الإدارة */
  pfOpenHist(type, ym) {
    const T = this.pfData().Top,
      cur = T.y + "-" + T.m,
      y0 = ym || cur;
    this.setState({ pfPanel: "hist", histType: type || "all", histYm: y0, histErr: "", pfMsg: "", pfAccMsg: "" });
    this.pfHistLoad(y0 === cur ? "" : y0, !0);
    this._pfHT("history");
  }
  pfHistReload() {
    const T = this.pfData().Top,
      cur = T.y + "-" + T.m,
      ym = this.state.histYm || cur;
    this.pfHistLoad(ym === cur ? "" : ym, !0);
  }
  pfClose() {
    if (!this._pfCanLeaveDraft()) return;
    "hist" === this.state.pfPanel && this._pfHT("");
    this.setState({ pfPanel: "", pfDirty: !1 });
  }
  pfOpen(k) {
    if (!this._pfCanLeaveDraft()) return;
    if ("hist" === k) return void this.pfOpenHist("all", "");
    ("day" !== k && "week" !== k && "spot" !== k && "status" !== k && "muk" !== k && "data" !== k) || this.pfMeLoad(!1);
    "hist" === this.state.pfPanel && this._pfHT("");
    this.setState({ pfPanel: this.state.pfPanel === k ? "" : k, pfMsg: "", pfAccMsg: "", spotAll: !1 });
  }
  /* F01: وحدةُ الحساب قسمٌ؟ — سجلُّه في bassam_depts_v1 بنوع «قسم» */
  deptIsSec(id) {
    try {
      const D = KIVO.BassamDepts;
      return !!(id && D && D.isSection && D.isSection(id));
    } catch (t) {
      return !1;
    }
  }
  deptNameOf(id) {
    try {
      const d = (KIVO.BassamDepts.list() || []).filter((x) => x && x.id === id)[0];
      return d ? d.name || "" : "";
    } catch (t) {
      return "";
    }
  }
  /* مديرو الإدارة الحقيقيون: كلُّ حسابات mgr:<الإدارة> والموظفون بصفة مدير فيها (كان: «الأول» وحده — D12) */
  deptMgrNames(did, meId) {
    try {
      const AU = KIVO.BassamAuth,
        L = (AU && AU.users ? AU.users() : []) || [];
      return L.filter((u) => u && "staff" === u.role && u.deptId === did && !u.dis && u.id !== meId && ((AU.isMgrKey && AU.isMgrKey(u.ekey)) || u.mgr)).map((u) => String(u.name || "").trim() || "مدير الإدارة");
    } catch (t) {
      return [];
    }
  }
  pfIcons() {
    return {
      name: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
      cs: "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3",
      gender: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
      nid: "M16 10h2M16 14h2M6 10h4v4H6zM4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
      empno: "M4 9h16M4 15h16M10 3 8 21M16 3l-2 18",
      phone: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L8.1 9.7a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.7a2 2 0 0 1 1.7 2z",
      email: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 7l-10 6L2 7",
      dept: "M2 20h20M4 20V8l8-5 8 5v12M9 20v-6h6v6",
      type: "M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2",
      mgr: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
      lead: "M12 2l2.9 6.3 6.6.8-4.9 4.6 1.3 6.6L12 17l-5.9 3.3 1.3-6.6L2.5 9.1l6.6-.8z",
      tree: "M12 3v6M12 9H5v4M12 9h7v4M5 13v4M19 13v4M3 17h4v4H3zM17 17h4v4h-4zM10 3h4",
    };
  }
  /* ═══ «بياناتي» — KIVO_264 · D3/D4: من السجل الوظيفي بمعرّفٍ ثابت وحده؛ لا استنتاجَ من اسم الدخول؛ الحقلُ الاختياريُّ الفارغ يُخفى ويُذكر
     في سطر «غير مسجّل»؛ ومديرُ الإدارة المعيَّن بيانُ حسابه وحده (OD-8: لا هويةَ ولا جوال) ═══ */
  pfInfoVals(i, e) {
    const IC = this.pfIcons(),
      out = { pfInfo: [], pfInfoNote: "", pfInfoMiss: "", pfInfoMissOn: !1, pfDataSub: "" };
    if (!e || "staff" !== e.role) return ((out.pfDataSub = "مربوطة بحساب دخولك مباشرة — تنعكس في القائمة الجانبية وكل الموقع"), out);
    const F = (k, l, v, o) => ({ k, l, v: String(v), cls: (o && o.cls) || "", dir: (o && o.dir) || "rtl", s: (o && o.s) || "", ic: IC[k] || IC.name, w: (o && o.w) || "" }),
      H = (k, l) => ({ k, l, hd: !0 }),
      has = (v) => null != v && "" !== String(v).trim(),
      did = e.deptId || "",
      dn = this.deptNameOf(did),
      mg = this.deptMgrNames(did, e.id),
      L = [];
    if (i.isAppt) {
      L.push(H("h1", "بيانات الحساب"), F("name", "الاسم", e.name || "مدير الإدارة"));
      has(e.no) && L.push(F("empno", "الرقم الوظيفي", e.no, { dir: "ltr" }));
      const sc = this.deptIsSec(did);   /* F01: مديرُ القسم المعيَّن */
      L.push(F("dept", sc ? "القسم" : "الإدارة", dn || "—"));
      mg.length && L.push(F("mgr", sc ? "مديرو القسم الآخرون" : "مديرو الإدارة الآخرون", mg.join(" · "), { w: "1" }));
      out.pfInfo = L;
      out.pfDataSub = "حسابك مُعيَّن من مدير النظام — بلا سجلّ موظف";
      out.pfInfoNote = "مديرُ الإدارة المعيَّن لا يحتاج سجلّاً في «موظفو الإدارة»؛ بياناتُ حسابك تُحدَّث من مدير النظام ← الإدارات.";
      return out;
    }
    const rec = i.myRec,
      by = (i.ME && i.ME.M && i.ME.M.identity && i.ME.M.identity.by) || "eid";
    if (!rec) {
      const sc1 = this.deptIsSec(did);
      L.push(H("h1", "بياناتك"), F("name", "الاسم", e.name || "—"), F("dept", sc1 ? "القسم" : "الإدارة", dn || "—"));
      mg.length && L.push(F("mgr", sc1 ? "مدير القسم المعيَّن" : "مدير الإدارة المعيَّن", mg.join(" · "), { w: "1" }));
      out.pfInfo = L;
      out.pfDataSub = i.ME && i.ME.loading ? "جارٍ التحقّق من سجلّك…" : "لا سجلَّ وظيفيّاً مرتبطاً بحسابك";
      out.pfInfoNote = i.ME && i.ME.loading ? "يُقرأ سجلُّك من الخادم الآن." : "لا يوجد سجلٌّ وظيفيّ مرتبطٌ بحسابك بمعرّفٍ ثابت — يربطه مدير الإدارة من «موظفو الإدارة» (لا تُستنتج بياناتُك من اسم الدخول).";
      return out;
    }
    const miss = [];
    L.push(H("h1", "البيانات الشخصية"), F("name", "اسم الموظف", rec.name || e.name || "—"));
    [
      ["gender", "الجنس", rec.gender, "rtl"],
      ["nid", "رقم الهوية", rec.nid, "ltr"],
      ["empno", "الرقم الوظيفي", rec.empno, "ltr"],
      ["phone", "رقم الجوال", rec.phone, "ltr"],
      ["email", "البريد الإلكتروني", rec.email, "ltr"],
    ].forEach((x) => (has(x[2]) ? L.push(F(x[0], x[1], String(x[2]).trim(), { dir: x[3] })) : miss.push(x[1])));
    L.push(H("h2", "البيانات الوظيفية"));
    has(rec.type) ? L.push(F("type", "نوع التوظيف", rec.type)) : miss.push("نوع التوظيف");
    has(rec.work) ? L.push(F("work", "نوع العمل", rec.work)) : miss.push("نوع العمل");
    const sec0 = this.deptIsSec(did);
    L.push(F("dept", sec0 ? "القسم" : "الإدارة", dn || "—"));
    L.push(F("mgr", sec0 ? "مدير القسم المعيَّن" : "مدير الإدارة المعيَّن", mg.length ? mg.join(" · ") : "لا مدير مُعيَّن", { cls: mg.length ? "" : "na", w: "1" }));
    out.pfInfo = L;
    out.pfInfoMiss = miss.length ? "غير مسجّل: " + miss.join("، ") + " — يصحّحها مدير الإدارة من «موظفو الإدارة»" : "";
    out.pfInfoMissOn = miss.length > 0;
    out.pfDataSub = "كما هي مسجّلة في «موظفو الإدارة» — للعرض فقط" + ("nid" === by ? " · مربوطٌ برقم الهوية (حسابٌ قديم)" : "");
    out.pfInfoNote = "تُحدَّث هذه البيانات من صفحة «موظفو الإدارة» — راجع مدير إدارتك لأي تصحيح.";
    return out;
  }
  /* ═══ «الإدارة» — KIVO_264 · D12: علاقاتٌ تنظيمية مثبتة فقط (إدارةُ الحساب لا الإدارةُ النشطة) — التسلسلُ ومديرو كلّ عقدةٍ فوقها ·
     قيادةُ ورديتي اليوم · الطاقمُ الإشرافي · صلاحياتي · رمزُ النداء؛ بلا تكرارٍ لـ«بياناتي» ═══ */
  pfDeptVals(i, e) {
    const IC = this.pfIcons(),
      AU = KIVO.BassamAuth,
      DP = KIVO.BassamDepts,
      R = (k, l, v, o) => ({ k, l, v: String(null == v || "" === v ? "—" : v), s: (o && o.s) || "", ic: IC[k] || IC.mgr, cls: null == v || "" === v ? "na" : (o && o.cls) || "", dir: (o && o.dir) || "rtl", w: (o && o.w) || "", h: (o && o.h) || "" }),
      H = (k, l) => ({ hd: 1, k, l }),
      o = [];
    if (!e) return { pfDeptInfo: o, pfDeptSub: "" };
    const title = (() => {
      try {
        return i.isSuper ? "مدير النظام" : (AU && AU.myTitle && AU.myTitle()) || ("gm" === e.role ? (AU && AU.gmRoleLabel ? AU.gmRoleLabel() : "مدير إدارة عامة") : i.isAppt ? (this.deptIsSec(e.deptId) ? "مدير القسم" : "مدير الإدارة") : AU && AU.permLabel && e.ekey ? AU.permLabel(e.ekey) || "بلا صلاحيات" : "");
      } catch (t) {
        return "";
      }
    })();
    const chain = (id) => {
      try {
        return (DP && DP.ancestorsOf ? DP.ancestorsOf(id) : []).map((g) => {
          const nd = DP.nodeOf ? DP.nodeOf(g) : null,
            ms = (AU && AU.groupManagers ? AU.groupManagers(g) : []) || [];
          return { name: (nd && nd.name) || "", kind: (nd && nd.kind) || "إدارة عامة", mgrs: ms.filter((x) => x && !x.dis).map((x) => x.name || "مدير") };
        });
      } catch (t) {
        return [];
      }
    };
    if (i.isSuper) {
      let n = 0, ns = 0;
      try {
        n = (DP.list() || []).length;
        ns = (DP.list() || []).filter((x) => x && "قسم" === x.kind).length;   /* F01: الأقسامُ لا تُعدّ إدارات */
      } catch (t) {
        n = 0;
      }
      o.push(H("h1", "نطاقك"), R("dept", "الصلاحية", "على كل الإدارات" + (n ? " (" + KIVO.BassamCount(n - ns, "إدارة") + (ns ? " · " + KIVO.BassamCount(ns, "قسم") : "") + ")" : ""), { w: "1" }), R("mgr", "الدور", title));
      return { pfDeptInfo: o, pfDeptSub: "مدير النظام — لا يتبع إدارةً بعينها" };
    }
    if ("gm" === e.role) {
      let nm = "",
        ds = [];
      try {
        const nd = DP.nodeOf ? DP.nodeOf(e.gid) : null;
        nm = (nd && nd.name) || (DP.groupName ? DP.groupName(e.gid) : "");
        ds = (AU && AU.groupDepts ? AU.groupDepts(e.gid) : []).map((d) => d.name);
      } catch (t) {
        ds = [];
      }
      o.push(H("h1", "نطاقك"), R("tree", "العقدة", nm, { w: "1" }), R("dept", "الإدارات تحتها", ds.length ? ds.join(" · ") : "", { w: "1" }), R("mgr", "الدور", title));
      chain(e.gid).forEach((c) => o.push(R("tree", c.kind + " أعلى", c.name + (c.mgrs.length ? " — " + c.mgrs.join(" · ") : " — لا مدير مُعيَّن"), { w: "1" })));
      return { pfDeptInfo: o, pfDeptSub: "نطاقُ عقدتك وإداراتها" };
    }
    const did = e.deptId || "",
      dn = this.deptNameOf(did),
      ch = chain(did);
    o.push(H("h1", "موقعك في الهيكل"));
    o.push(R("tree", "التسلسل الإداري", [dn || "—"].concat(ch.map((c) => c.name).filter(Boolean)).join(" ← "), { w: "1" }));
    ch.forEach((c) => o.push(R("mgr", "مدير " + c.kind, c.mgrs.length ? c.mgrs.join(" · ") : "", { s: c.name, w: "1" })));
    o.push(R("mgr", "الصلاحيات", title, { h: "1" }));
    if (i.isAppt) return { pfDeptInfo: o, pfDeptSub: this.deptIsSec(e.deptId) ? "قسمك وما فوقه" : "إدارتك وما فوقها" };
    const cs = (() => {
      try {
        return i.F && i.F.cs ? i.F.cs : i.myKey && i.bucket && i.bucket[i.myKey] && "string" == typeof i.bucket[i.myKey].cs ? i.bucket[i.myKey].cs.trim() : "";
      } catch (t) {
        return "";
      }
    })();
    o.push(R("cs", "رمز النداء", cs, { dir: "ltr", h: "1" }));
    /* قيادةُ ورديتي اليوم (من تقرير اليوم المسحوب) والطاقمُ الإشرافي لورديتي — لمن تصله بياناتُ اليوم */
    if (i.sr && i.sr.pulled && i.sr.leaders) {
      const nm = (t) => (t && i.empOfTok && (i.empOfTok(t) || {}).name) || "";
      o.push(H("h2", "ورديتك اليوم" + (i.shiftRef ? " — " + i.shiftRef : "")));
      o.push(R("lead", "رئيس الوردية", nm(i.sr.leaders.chief), { h: "1" }), R("lead", "نائب الرئيس", nm(i.sr.leaders.deputy), { h: "1" }));
    }
    const P = KIVO.BassamSup,
      clean = (t) =>
        String(null == t ? "" : t)
          .replace(/\s+/g, " ")
          .trim();
    let tp = [];
    try {
      tp = ((P && P.tpls && P.tpls()) || []).filter((t) => (P.isSupTpl ? P.isSupTpl(t) : !!t.sup));
    } catch (t) {
      tp = [];
    }
    tp.length && (i.roster || []).length && o.push(H("h3", "الطاقم الإشرافي لورديتك"));
    (i.roster || []).length &&
      tp.forEach((t) => {
        const seen = {},
          names = [];
        (i.roster || []).forEach((r) => {
          if (!r || !r.ekey) return;
          let x = null;
          try {
            x = P.tplOf ? P.tplOf(r.ekey) : null;
          } catch (q) {
            x = null;
          }
          if (!x || x.id !== t.id) return;
          const nm = (i.empOfTok && (i.empOfTok(r.ekey) || {}).name) || "";
          nm && !seen[nm] && ((seen[nm] = 1), names.push(nm));
        });
        o.push(R("mgr", clean(t.name) || "قالب إشرافي", names.join(" · "), { w: "1" }));
      });
    return { pfDeptInfo: o, pfDeptSub: dn ? (this.deptIsSec(e.deptId) ? "قسمك: " : "إدارتك: ") + dn : "" };
  }
  renderVals() {
    this._pfHR();
    const t = KIVO.BassamAuth,
      e = this.me();
    let s = { name: "مدير النظام", role: "مدير النظام" };
    try {
      t && t.display && (s = t.display());
    } catch (t) {}
    const a = this.state,
      i = this.pfData(),
      F = i.F,
      SITE = i.SITE,
      ME = i.ME || {},
      MM = ME.M || null,
      ident = (MM && MM.identity) || null,
      nm0 = (i.isStaff && i.myRec && i.myRec.name) || s.name,
      r = { profName: nm0, profRole: s.role, profInitial: (nm0 || "؟").trim().charAt(0) },
      n = (s) => {
        if (!t || !e || !t.changeOwnAccount) return Promise.resolve({ ok: !1, err: "تعذّر الحفظ — سجّل الدخول مجدداً" });
        try {
          return Promise.resolve(t.changeOwnAccount(s))
            .then((t) => (t && "object" == typeof t ? t : { ok: !1, err: "تعذّر الحفظ — سجّل الدخول مجدداً" }))
            .catch(() => ({ ok: !1, err: "تعذّر الحفظ — حدث خطأ غير متوقع" }));
        } catch (t) {
          return Promise.resolve({ ok: !1, err: "تعذّر الحفظ — حدث خطأ غير متوقع" });
        }
      };
    Object.assign(r, {
      pfName: void 0 !== a.pfName ? a.pfName : (e && e.name) || "",
      pfEmail: void 0 !== a.pfEmail ? a.pfEmail : (e && e.email) || "",
      pfPhone: void 0 !== a.pfPhone ? a.pfPhone : (e && e.phone) || "",
      pfRoleFixed: s.role,
      /* KIVO_264: مديرُ العقدة لا يغيّر اسمَه بنفسه (حقولُ حسابه في الخادم: كلمةُ المرور والبريد والجوال) — الاسمُ عرضٌ فقط */
      pfNameRO: !(!e || "gm" !== e.role),
      pfNameEdit: !(e && "gm" === e.role),
      onPfName: (t) => this.setState({ pfName: t.target.value, pfDirty: !0 }),
      onPfEmail: (t) => this.setState({ pfEmail: t.target.value, pfDirty: !0 }),
      onPfPhone: (t) => this.setState({ pfPhone: t.target.value, pfDirty: !0 }),
      pfMsg: a.pfMsg || "",
      pfMsgCls: a.pfErr ? "pf-msg bad" : "pf-msg ok",
      pfSave: () => {
        const t = (void 0 !== this.state.pfName ? this.state.pfName : (e && e.name) || "").trim();
        /* مديرُ العقدة: الاسمُ عرضٌ فقط فلا يُشترط هنا (يحفظ بريدَه وجوالَه ولو خلا حسابُه من اسم) */
        if (!t && !(e && "gm" === e.role)) return void this.bsToast("اكتب الاسم الكامل");
        const s = (void 0 !== this.state.pfEmail ? this.state.pfEmail : (e && e.email) || "").trim();
        this.emailOk(s)
          ? n({ name: t, email: s, phone: (void 0 !== this.state.pfPhone ? this.state.pfPhone : (e && e.phone) || "").trim() }).then((t) => {
              t.ok
                ? this.setState({ pfMsg: e && "gm" === e.role ? "✓ حُفظ بريدك وجوالك" : "✓ حُفظت البيانات — اسمك يظهر الآن في كل الموقع", pfErr: !1, pfDirty: !1, pfTick: (this.state.pfTick || 0) + 1 })
                : this.setState({ pfMsg: t.err || "تعذّر الحفظ — سجّل الدخول مجدداً", pfErr: !0 });
            })
          : this.setState({ pfMsg: "صيغة البريد غير صحيحة — مثال: name@example.gov.sa", pfErr: !0 });
      },
      pfUn: void 0 !== a.pfUn ? a.pfUn : (e && e.un) || "",
      pfCur: a.pfCur || "",
      pfNew: a.pfNew || "",
      pfNew2: a.pfNew2 || "",
      pfUnLocked: !(!e || ("staff" !== e.role && "gm" !== e.role)),
      pfUnEditable: !(e && ("staff" === e.role || "gm" === e.role)),
      pfAccSub:
        !e || ("staff" !== e.role && "gm" !== e.role)
          ? "تغيير اسم المستخدم أو كلمة المرور يتطلب كلمة مرورك الحالية — ويُتحقّق منها قبل أي تغيير"
          : "اسم مستخدمك من سجلك، وتغيّر كلمة مرورك متى شئت (5 أو 6 أرقام)",
      pfAccBtn: !e || ("staff" !== e.role && "gm" !== e.role) ? "تحديث بيانات الدخول" : "تغيير كلمة المرور",
      pfPwHint: (() => {
        const s = a.pfNew || "",
          r = (e && e.role) || "super",
          n = t && t.pwRuleText ? t.pwRuleText(r) : "";
        if (!s) return n + ("staff" === r || "gm" === r ? "" : " — أو اتركها فارغة لتغيير اسم المستخدم فقط");
        try {
          const e = t && t.pwCheck ? t.pwCheck(s, r) : { ok: !0 };
          return e.ok ? "✓ مستوفٍ للشرط" : e.msg;
        } catch (t) {
          return "";
        }
      })(),
      pfPwHintCls: (() => {
        const s = a.pfNew || "";
        if (!s) return "pf-hint";
        try {
          return (t && t.pwCheck ? t.pwCheck(s, (e && e.role) || "super") : { ok: !0 }).ok ? "pf-hint ok" : "pf-hint bad";
        } catch (t) {
          return "pf-hint";
        }
      })(),
      onPfUn: (t) => this.setState({ pfUn: t.target.value }),
      onPfCur: (t) => this.setState({ pfCur: t.target.value }),
      onPfNew: (t) => this.setState({ pfNew: t.target.value }),
      onPfNew2: (t) => this.setState({ pfNew2: t.target.value }),
      pfAccMsg: a.pfAccMsg || "",
      pfAccMsgCls: a.pfAccErr ? "pf-msg bad" : "pf-msg ok",
      pfAccSave: () => {
        if (!t || !e) return;
        const s = (void 0 !== this.state.pfUn ? this.state.pfUn : e.un || "").trim(),
          a = this.state.pfCur || "",
          r = this.state.pfNew || "",
          i = this.state.pfNew2 || "";
        s
          ? a
            ? !r || i
              ? !e || ("staff" !== e.role && "gm" !== e.role) || r
                ? n({ un: s, currentPw: a, newPw: r, confirmPw: i }).then((t) => {
                    t.ok
                      ? (this.setState({ pfCur: "", pfNew: "", pfNew2: "", pfAccMsg: "✓ حُدّثت بيانات الدخول — استخدمها في دخولك القادم", pfAccErr: !1 }), this.pfSrvLoad())
                      : this.setState({ pfAccMsg: t.err || "تعذّر تحديث بيانات الدخول", pfAccErr: !0 });
                  })
                : this.setState({ pfAccMsg: "اكتب كلمة المرور الجديدة (5 أو 6 أرقام)", pfAccErr: !0 })
              : this.setState({ pfAccMsg: "أعد كتابة كلمة المرور الجديدة في حقل التأكيد", pfAccErr: !0 })
            : this.setState({ pfAccMsg: "اكتب كلمة المرور الحالية للتأكيد", pfAccErr: !0 })
          : this.setState({ pfAccMsg: "اكتب اسم المستخدم", pfAccErr: !0 });
      },
      pfPanelData: "data" === a.pfPanel,
      pfPanelAcct: "acct" === a.pfPanel,
      pfPanelDept: "dept" === a.pfPanel,
      pfPanelDay: "day" === a.pfPanel,
      pfPanelWeek: "week" === a.pfPanel,
      pfPanelSpot: "spot" === a.pfPanel,
      pfPanelHist: "hist" === a.pfPanel,
      pfPanelWhy: "muk" === a.pfPanel || "status" === a.pfPanel,
      pfReadOnly: !(!e || "staff" !== e.role),
      pfEditable: !(e && "staff" === e.role),
      pfToggleDept: () => this.pfOpen("dept"),
      pfToggleData: () => this.pfOpen("data"),
      pfToggleAcct: () => this.pfOpen("acct"),
      pfToggleHist: () => ("hist" === this.state.pfPanel ? this.pfClose() : this.pfOpenHist("all", "")),
      pfDeptOn: "dept" === a.pfPanel ? "true" : "false",
      pfDataOn: "data" === a.pfPanel ? "true" : "false",
      pfAcctOn: "acct" === a.pfPanel ? "true" : "false",
      pfHistOn: "hist" === a.pfPanel ? "true" : "false",
      pfClosePanel: () => this.pfClose(),
      pfStop: (t) => {
        try {
          t.stopPropagation();
        } catch (t) {}
      },
      pfOvClose: () => {
        a.pfDirty ? this.bsToast("لديك تعديلٌ لم يُحفظ — احفظ البيانات أو اضغط «إغلاق»", "warn") : this.pfClose();
      },
    });
    Object.assign(r, this.pfInfoVals(i, e), this.pfDeptVals(i, e));
    const o = i.now.getHours();
    ((r.greeting = o >= 5 && o < 12 ? "صباح الخير" : o >= 12 && o < 17 ? "نهارك سعيد" : "مساء الخير"), (r.greetIsDay = o >= 5 && o < 17), (r.greetIsNight = !r.greetIsDay));
    const f = this.MONTHS();
    let l = "";
    try {
      l = i.now.toLocaleDateString("ar-u-ca-gregory-nu-latn", { day: "numeric", month: "long", year: "numeric" });
    } catch (t) {}
    const H0 = this.hParts(i.now);
    r.dateLine = this.wdName(i.now) + " " + H0.d + " " + f[H0.m - 1] + " " + H0.y + (l ? " · " + l : "");
    /* KIVO_264 · D12: الإدارةُ في سطر الدور إدارةُ الحساب (لا الإدارةُ النشطة في الجلسة) — ومدير النظام بلا إدارة */
    const h = e && e.deptId ? this.deptNameOf(e.deptId) : "",
      p = (() => {
        try {
          if (i.isSuper) return "مدير النظام";
          const T = KIVO.BassamAuth && KIVO.BassamAuth.myTitle ? KIVO.BassamAuth.myTitle() : "";
          if (T) return T;
          if ("gm" === i.role) return KIVO.BassamAuth && KIVO.BassamAuth.gmRoleLabel ? KIVO.BassamAuth.gmRoleLabel() : "مدير إدارة عامة";
          if (i.isAppt) return this.deptIsSec(e && e.deptId) ? "مدير القسم" : "مدير الإدارة";
          const t = KIVO.BassamAuth;
          return (t && t.permLabel && e && e.ekey && t.permLabel(e.ekey)) || "";
        } catch (t) {
          return "";
        }
      })(),
      cs0 = F && F.cs ? "رمز النداء " + F.cs : "";
    /* الموجة 1 · AUX-01: ما يصل من الخادم (نوعُ التوظيف · رمزُ النداء) في سطرٍ ثانٍ محجوزٍ للموظف من أول رسم — كان يُلحق بسطر الدور بعد
       وصول /api/me/today فيلتفّ السطرُ إلى سطرين وتقفز الصفحة؛ ونصُّ الانتظار «…» يحجز مكانه */
    const uq = (L) => L.filter(Boolean).filter((t, e, s) => s.indexOf(t) === e).join(" · ");
    r.roleLine2On = !!i.isStaff;
    r.roleLine2 = !i.isStaff ? "" : uq([(i.myRec && i.myRec.type) || "", cs0]) || (ME.loading ? "…" : "");
    r.roleLine = (
      i.isStaff
        ? [h, p, i.isMgr ? "بصفة مدير" : ""]
        : [
            s.role,
            (() => {
              try {
                if ("gm" === i.role) {
                  const g = KIVO.BassamDepts && KIVO.BassamDepts.groupName ? KIVO.BassamDepts.groupName(e.gid) : "";
                  if (g) return g;
                }
              } catch (t) {}
              return i.isSuper ? "" : h;
            })(),
            p,
          ]
    )
      .filter(Boolean)
      .filter((t, e, s) => s.indexOf(t) === e)
      .join(" · ");
    const d = i.sdef ? this.mins(i.sdef.tStart) : null,
      y = i.sdef ? this.mins(i.sdef.tEnd) : null,
      u = 60 * i.now.getHours() + i.now.getMinutes();
    let g = y;
    null != d && null != g && g <= d && (g += 1440);
    const night = !!(MM && MM.day && "night" === MM.day.op),
      /* ورديةٌ ليلية بدأت أمس (اليوم التشغيلي — OD-10): ما بعد منتصف الليل امتدادٌ لها */
      w = null != d && null != g && night && u < d ? u + 1440 : u,
      S = null != d && null != g;
    const bsRd = this.bsOn("daily/rounds") && (this.bsLensOn("zones") || this.bsLensOn("gates") || this.bsLensOn("marks") || this.bsLensOn("paths")),
      bsSt = this.bsOn("staff"),
      bsDr = this.bsOn("dreport"),
      bsDi = this.bsLensOn("dist"),
      bsPl = this.bsOn("plan");
    let b = "none";
    S && (b = w < d ? "before" : w <= g ? "during" : "after");
    const restToday = !!(F && F.rest.today),
      st = F ? F.status.st : "",
      loading = !!(i.isStaff && ME.loading),
      keyed = !!(ident && ident.keyed);
    ((r.isStaffView = !!i.isStaff),
      (r.statusOn = !1),
      (r.pfTopStyle = i.isStaff && bsRd ? "" : "grid-template-columns:1fr"),
      (r.bsMapOn = !!(i.isStaff && bsRd)),
      (r.shiftName = i.shiftRef || ""),
      (r.hasShift = !!i.shiftRef),
      (r.statusTxt = !i.isStaff
        ? i.shiftRef
          ? "during" === b
            ? "على الوردية الآن"
            : "before" === b
              ? "قبل بدء الوردية"
              : "after" === b
                ? "انتهت وردية اليوم"
                : "وردية " + i.shiftRef
          : "لا وردية موزَّعة هذا الشهر"
        : loading
          ? "جارٍ تحميل يومك…"
          : restToday
            ? "في راحتك اليوم"
            : "tout" === st
              ? "حُوّلت اليوم إلى " + (F.status.to || "وردية أخرى")
              : i.shiftRef
                ? "during" === b
                  ? "على الوردية الآن"
                  : "before" === b
                    ? "قبل بدء الوردية"
                    : "after" === b
                      ? "انتهت وردية اليوم"
                      : "وردية " + i.shiftRef
                : keyed
                  ? "لم يتم الإسناد بعد"
                  : "لا يومَ تشغيليّاً مرتبطاً بحسابك"),
      (r.statusColor = i.isStaff && restToday ? "var(--text-muted)" : "during" === b ? "var(--success)" : "before" === b ? "var(--warning)" : "var(--text-muted)"),
      (r.hasTime = S && !!i.shiftRef),
      (r.timeRange = S ? i.sdef.tStart + " ← " + i.sdef.tEnd : ""),
      (r.tlHint = ""));
    /* KIVO_264 · D11/D15: حقائقُ اليوم من مصدرٍ واحد بمفتاحٍ واحد — ولكلّ حقيقةٍ وسمُ مصدرها */
    const nf = "لم يتم الإسناد",
      SL = i.STL,
      stLbl = restToday ? "راحة" : "tout" === st ? "محوَّل إلى " + ((F && F.status.to) || "وردية أخرى") : st ? SL[st] || st : "",
      ICP = {
        shift: "M12 6v6l4 2M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z",
        rest: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
        spot: "M12 21s-7-5.2-7-10.5A7 7 0 0 1 19 10.5C19 15.8 12 21 12 21zM12 12.9a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2z",
        muk: "M9 12l2 2 4-4M7.8 3.2a2 2 0 0 1 1.4-.6h5.6a2 2 0 0 1 1.4.6l3.6 3.6a2 2 0 0 1 .6 1.4v5.6a2 2 0 0 1-.6 1.4l-3.6 3.6a2 2 0 0 1-1.4.6H9.2a2 2 0 0 1-1.4-.6l-3.6-3.6a2 2 0 0 1-.6-1.4V8.2a2 2 0 0 1 .6-1.4z",
        status: "M20 6L9 17l-5-5",
      },
      O = SITE && SITE.official,
      TD = SITE && SITE.today,
      DR = SITE && SITE.draft,
      tdDiff = !!(O && TD && !SITE.same),
      restSched = F ? F.rest.sched : [],
      monthSrc = F && F.month ? (F.month.locked ? "الجدول الشهري (معتمد)" : "الجدول الشهري (غير معتمد)") : "الجدول الشهري";
    /* الموجة 1 · AUX-01: البطاقاتُ الخمس نفسُها بقيمة «…» ما دامت حقائقُ اليوم تُحمَّل — كان الصفُّ فارغاً (سطرُ «جارٍ التحميل» وحده) ثم يظهر
       بعد ثانيتين فيدفع الخريطةَ والمهامَّ ~105px إلى أسفل في كل إعادة تحميل */
    const SK = [["shift", "الوردية"], ["rest", "أيام الراحة"], ["spot", "موقعك اليوم"], ["muk", "التكليف"], ["status", "الحالة"]];
    const facts = !i.isStaff || !F
      ? i.isStaff && loading
        ? SK.map((q) => ({ k: q[0], l: q[1], v: "…", sub: "جارٍ التحميل", tone: "none", wait: !0 })).filter((t) => ("shift" === t.k || "rest" === t.k || "muk" === t.k ? bsSt : "spot" === t.k ? bsRd || bsPl : "status" === t.k ? bsDr : !0))
        : []
      : [
          {
            k: "shift",
            l: "الوردية",
            v: F.shift.name || nf,
            sub: "report" === F.shift.src ? (F.shift.sched && F.shift.sched !== F.shift.name ? "من تقرير اليوم · المجدولة " + F.shift.sched : "من تقرير اليوم") : "schedule" === F.shift.src ? "من " + monthSrc : "لا صفَّ لك في جدول الشهر",
            tone: F.shift.name ? "gold" : "none",
          },
          {
            k: "rest",
            l: "أيام الراحة",
            v: restSched.length ? restSched.join(" · ") : F.month && F.month.has ? "لا أيام راحة" : nf,
            sub: restToday ? "اليوم راحتك" : F.rest.dayChanged ? "عُدّلت في تقرير اليوم" : restSched.length ? "مجدولة — الجدول الشهري" : "",
            tone: restSched.length || restToday ? "rest" : "none",
          },
          {
            k: "spot",
            l: "موقعك اليوم",
            v: O ? O.short + (O.closed ? " (مغلق)" : "") + (SITE.officialN > 1 ? " +" + (SITE.officialN - 1) : "") : TD ? TD.short + (TD.closed ? " (مغلق)" : "") + (SITE.todayN > 1 ? " +" + (SITE.todayN - 1) : "") : "لا إسناد",
            sub: O ? (tdDiff ? "تسكين اليوم: " + TD.short : "مُسنَد رسمياً") : TD ? "تسكين اليوم — لا إسنادَ معتمد" : DR ? "إسنادٌ مسودة — لم يُعتمد" : "",
            tone: O || TD ? ((O || TD).closed ? "red" : "teal") : "none",
          },
          {
            k: "muk",
            l: "التكليف",
            v: F.muk.v ? "مكلف" : "غير مكلف",
            sub: "report" === F.muk.src ? "لهذا اليوم — تقرير اليوم" : "schedule" === F.muk.src ? "لهذا الشهر — الجدول الشهري" : "",
            tone: F.muk.v ? "plum" : "none",
          },
          {
            k: "status",
            l: "الحالة",
            v: stLbl || (i.shiftRef ? (S && "during" !== b ? "غير متاح" : "متاح") : nf),
            sub: stLbl ? (restToday && !st ? "من جدول راحتك" : "مسجّلة في التقرير") : i.shiftRef ? (S ? "محسوبة من وقت الوردية" : "وردية بلا وقت محدّد") : "",
            tone: "حاضر" === stLbl ? "ok" : "غائب" === stLbl ? "red" : stLbl ? "warn" : i.shiftRef && !(S && "during" !== b) ? "ok" : "none",
          },
        ].filter((t) => ("shift" === t.k || "rest" === t.k || "muk" === t.k ? bsSt : "spot" === t.k ? bsRd || bsPl : "status" === t.k ? bsDr : !0));
    const TIP = { shift: "اضغط لعرض خطّ سير يومك", rest: "اضغط لعرض أسبوعك وأيام راحتك", spot: "اضغط لعرض تفاصيل موقعك وزملائك", muk: "اضغط لعرض تفاصيل تكليفك", status: "اضغط لمعرفة سبب حالتك الآن" },
      PANEL = { shift: "day", rest: "week", spot: "spot", muk: "muk", status: "status" };
    r.pfFacts = facts.map((x) =>
      x.wait
        ? Object.assign(x, { d: ICP[x.k] || ICP.status, subOn: !0, openOn: !1, cls: "t-none v-na sk", tip: "", aria: x.l + ": جارٍ تحميل حقائق يومك من الخادم", open: () => {}, key: () => {} })
        : Object.assign(x, {
            d: ICP[x.k] || ICP.status,
            subOn: !!x.sub,
            openOn: !0,
            cls: "go t-" + x.tone + ("none" === x.tone ? " v-na" : ""),
            tip: TIP[x.k] || "",
            aria: x.l + ": " + x.v + (x.sub ? " — " + x.sub : "") + " · " + (TIP[x.k] || ""),
            open: () => this.pfOpen(PANEL[x.k]),
            key: (e) => {
              e && ("Enter" === e.key || " " === e.key) && (e.preventDefault && e.preventDefault(), this.pfOpen(PANEL[x.k]));
            },
          }),
    );
    r.pfFactsCols = "repeat(" + (r.pfFacts.length || 1) + ",1fr)";
    /* الصفُّ يحجز ارتفاعَ البطاقات من أول رسم (الانتظارُ والنهائيُّ بالارتفاع نفسِه) · وaria-busy أثناء التحميل */
    r.pfFactsCls = "pf-facts" + (r.pfFacts.length ? " pf-facts-on" : "");
    r.pfFactsBusy = loading && r.pfFacts.length ? "true" : "false";
    /* حالاتٌ صريحة بدل الفراغات المضلِّلة (D15): تحميل · تعذّر · حسابٌ بلا سجلّ */
    const linked = !!(ident && ident.linked);
    r.pfFactsNote = !i.isStaff
      ? ""
      : loading
        ? r.pfFacts.length
          ? ""   /* AUX-01: البطاقاتُ المنتظِرة تقول ذلك في مكانها — سطرٌ يختفي عند الوصول كان يرفع ما تحته */
          : "جارٍ تحميل حقائق يومك من الخادم…"
        : !MM
          ? "تعذّر تحميل يومك من الخادم"
          : !keyed
            ? "حسابك غير مرتبط بسجلّ موظفٍ بمعرّفٍ ثابت — لا تُعرض بياناتُ يومٍ لا تخصّك بيقين. اطلب من مدير الإدارة ربط حسابك."
            : !linked
              ? "حسابك غير مرتبط بسجلّ موظف — الحقائقُ من صفوف مفتاح حسابك نفسِه في الجدول والتقرير"
              : MM.day && "night" === MM.day.op
                ? "يومُك التشغيلي: " + MM.day.d + " " + f[MM.day.m - 1] + " — ورديتك الليلية بدأت فيه ولم تنتهِ بعد"
                : "";
    r.pfFactsNoteOn = !!r.pfFactsNote;
    r.pfFactsRetryOn = !!(i.isStaff && !MM && !loading);
    r.pfFactsNoteGo = () => this.pfMeLoad(!0);
    r.pfFactsNoteCls = "pf-fnote" + (!MM && !loading ? " bad" : "") + (MM && keyed && !linked ? " warn" : "");
    /* لوحتا «التكليف» و«الحالة» (لماذا) — بمصدر كلٍّ منهما */
    (() => {
      const pn = a.pfPanel,
        mo = f[i.Top.m - 1] + " " + i.Top.y,
        sd = i.sdef || {},
        sh = i.shiftRef || "",
        L = [];
      let ti = "",
        su = "",
        c = "var(--text-muted)",
        hd = "",
        hs = "",
        src = "";
      if (F && F.report.mine) src = "تقرير وردية " + (F.report.sh || "اليوم") + (F.report.approved ? " (معتمد)" : " (غير معتمد)");
      else if (F) src = monthSrc + (F.report.any ? " · سُحب تقرير اليوم لورديات أخرى ولستَ فيه" : " · تنعكس فوراً حتى يُسحب تقرير اليوم");
      if ("muk" === pn) {
        ((hd = "التكليف"), (hs = "ساعات العمل الإضافية — " + mo));
        const k = !(!F || !F.muk.v);
        ((c = k ? "var(--plum-text)" : "var(--text-faint)"), (ti = k ? "أنت مكلَّف" : "أنت غير مكلَّف"), (su = F && "report" === F.muk.src ? "لهذا اليوم — من تقرير اليوم" : "لهذا الشهر — من " + monthSrc));
        L.push({ t: k ? "التكليفُ مثبَّت لك — ويُقرأ منه تقرير كل يوم عند سحبه؛ شكراً لتحمّلك المسؤولية" : "لا تكليف مسجَّل لك — وإن أُسند إليك تكليفٌ ظهر هنا" });
        L.push({ t: "التكليف حالتان فقط: «مكلف» أو «غير مكلف»." });
      } else if ("status" === pn) {
        ((hd = "الحالة"), (hs = "لماذا تظهر حالتك هكذا الآن"));
        const tm = this.clock(i.now);
        if (restToday) ((c = "var(--text-muted)"), (ti = "في راحتك اليوم"), (su = (MM && MM.day ? MM.day.wd : "") + " — من أيام راحتك"), L.push({ t: "أيام راحتك المجدولة: " + (restSched.join(" · ") || "—") + (F && F.rest.dayChanged ? " — وعُدّلت راحتك في تقرير اليوم" : "") }));
        else if ("tout" === st) ((c = "var(--warning-text)"), (ti = "محوَّلٌ اليوم إلى " + (F.status.to || "وردية أخرى")), (su = "من تقرير وردية " + (F.report.sh || "اليوم")), L.push({ t: "كُلّفت اليوم بالعمل مع «" + (F.status.to || "وردية أخرى") + "» بدل ورديتك الأصلية — بحسب تقرير اليوم المسحوب" }));
        else if (stLbl)
          ((c = "حاضر" === stLbl ? "var(--success-text)" : "غائب" === stLbl ? "var(--danger-text)" : "var(--warning-text)"),
            (ti = stLbl),
            (su = "مسجّلة في تقرير وردية " + ((F && F.report.sh) || sh || "اليوم")),
            L.push({ t: "سُجّلت حالتك اليوم «" + stLbl + "» في تقرير الوردية — وهي الحالة المعتمدة ليومك" + (F && F.report.approved ? "" : " (التقرير لم يُعتمد بعد)") }),
            "حاضر" !== stLbl && L.push({ t: "إن رأيت في التسجيل خطأً فبابُ الاعتراض مفتوح خلال 24 ساعة من صفحة التنبيهات أو عبر رئيس ورديتك" }));
        else if (sh && S) {
          const rg = sd.tStart + " ← " + sd.tEnd,
            nm = /^(ال)?وردية/.test(sh) ? sh : "وردية " + sh;
          "during" === b
            ? ((c = "var(--success-text)"), (ti = "متاح — على الوردية الآن"), (su = nm + " · " + rg), L.push({ t: "الساعة الآن " + tm + " وأنت ضمن وقت ورديتك — بقي منها " + this.fmtDur(g - w) + "، وفّقك الله" }))
            : "before" === b
              ? ((c = "var(--warning-text)"), (ti = "غير متاح — ورديتك لم تبدأ بعد"), (su = nm + " · " + rg), L.push({ t: "الساعة الآن " + tm + " وورديتك تبدأ في " + sd.tStart + " — تبدأ بعد " + this.fmtDur(d - w) }))
              : ((c = "var(--text-muted)"), (ti = "غير متاح — انتهت ورديتك اليوم"), (su = nm + " · " + rg), L.push({ t: "الساعة الآن " + tm + " وورديتك انتهت في " + sd.tEnd + " — شكراً لجهدك" }));
          L.push({ t: "«متاح/غير متاح» محسوبةٌ من وقت ورديتك الآن — لا حالةً مسجّلة؛ الحالةُ المسجّلة تظهر حين يؤشّرها رئيس ورديتك في التقرير" });
        } else if (sh) ((c = "var(--success-text)"), (ti = "متاح"), (su = "وردية " + sh + " — بلا وقت محدد"), L.push({ t: "ورديتك بلا وقت بدء وانتهاء محدّد، فتُعدّ متاحاً طوال اليوم" }));
        else ((c = "var(--text-faint)"), (ti = keyed ? "لم يتم الإسناد بعد" : "لا يومَ تشغيليّاً مرتبطاً بحسابك"), L.push({ t: keyed ? "ستظهر حالتك هنا فور إسناد ورديتك من الجدول الشهري أو عند سحب تقرير اليوم" : "حسابك غير مرتبط بسجلّ موظف بمعرّفٍ ثابت — يربطه مدير الإدارة" }));
      }
      ((r.whyHead = hd), (r.whyHeadSub = hs), (r.whyTitle = ti), (r.whySub = su), (r.whyC = c), (r.whyBg = "var(--bg-surface-3)"));
      ((r.whyD = "muk" === pn ? ICP.muk : restToday ? ICP.rest : sh && S && "during" !== b && !stLbl ? ICP.shift : ICP.status), (r.whyLines = L), (r.whyLinesOn = L.length > 0), (r.whySrc = src ? "المصدر: " + src : ""));
    })();
    ((r.tlNow = "during" === b ? "الآن " + this.clock(i.now) + " · بقي " + this.fmtDur(g - w) : "before" === b ? "تبدأ بعد " + this.fmtDur(d - w) : "after" === b ? "انتهت قبل " + this.fmtDur(w - g) : ""),
      (r.tlNowOn = !!r.tlNow && "during" !== b),
      (r.tlStart = S ? i.sdef.tStart : ""),
      (r.tlEnd = S ? i.sdef.tEnd : ""),
      (r.dayB1 = r.statusTxt || ""),
      (r.dayB1On = !!r.dayB1),
      (r.dayB1C = r.statusColor || "var(--text-muted)"),
      (r.dayB2 = r.tlNowOn ? r.tlNow : ""),
      (r.dayB2On = !!r.dayB2),
      (r.dayB3 = !F ? "" : (night ? "يومُك التشغيلي بدأ أمس (وردية ليلية) · " : "") + (F.report.mine ? "بيانات اليوم من تقرير وردية " + (F.report.sh || "اليوم") + " المسحوب" + (F.report.approved ? " (معتمد)" : " — لم يُعتمد بعد") + " — تعديل الجدول الشهري لا يمسّها إلا بإعادة السحب" : "بيانات اليوم من " + monthSrc + (F.report.any ? " · سُحب تقرير اليوم لورديات أخرى ولستَ فيه" : " · تنعكس فوراً حتى يُسحب تقرير اليوم"))),
      (r.dayB3On = !!r.dayB3),
      (r.dayBoxOn = !!(r.dayB1On || r.dayB2On || r.dayB3On)));
    const T0 = [];
    if (S) {
      const t = g - d,
        e = t > 600 ? 120 : 60;
      for (let s = d; s <= g; s += e) {
        const a = ((s - d) / t) * 100,
          r = Math.floor((s % 1440) / 60),
          n = s % 60;
        T0.push({ cls: (T0.length % 2 ? "odd" : "") + (a > 88 ? " off" : ""), pct: a.toFixed(2), lbl: (r < 10 ? "0" : "") + r + ":" + (n < 10 ? "0" : "") + n, first: s === d, last: s + e > g });
      }
    }
    ((r.ticks = T0), (r.tlFill = S ? ("during" === b ? (((w - d) / (g - d)) * 100).toFixed(2) : "after" === b ? "100" : "0") : "0"), (r.tlOn = "during" === b), (r.nowLbl = this.clock(i.now)));
    Object.assign(r, this.pfMapVals(i, bsDi, tdDiff));
    (this._pfField(r, i, a), this._tkVals(r, i, a));
    /* KIVO_264 · D15: «لا تملك صلاحية عرض المهام» شيءٌ و«لا مهام» شيءٌ آخر — KIVO-Tasks: مع المسار الذاتي (KIVO.BassamMyTasks) لا تتوقف رؤيةُ
       الموظف لمهامه على task.view، فنصُّ الفراغ من حالة مصدره (_tkVals: غيرُ مرتبطٍ بسجل موظف · تعذّر التحميل · لا مهام) — ويبقى D15 لما سواه */
    /* KIVO_265 · «ملفي»: لا إحصاءَ «هذا الشهر» بأصفارٍ قبل أوّل قراءة (tkLoad) — ونصُّ الفراغ «لا توجد لديك مهام حالية» في المسارين */
    if (KIVO.BassamMyTasks) ((r.tkNoPerm = !1), (r.tkStatsOn = !r.tkLoad));
    else {
      r.tkNoPerm = !!(r.tkOn && r.tkEmpty && !this.can("tasks", "view"));
      r.tkStatsOn = !r.tkNoPerm;
      r.tkEmptyT = r.tkNoPerm ? "لا تملك صلاحية عرض المهام" : "لا توجد لديك مهام حالية";
      /* لا يُوجَّه الموظفُ إلى طلب ورقةٍ إدارية — قرارُ المالك: لا تُعالَج رؤيةُ المهام بمنح صلاحياتٍ إدارية (وكيلُ المهام يعالج المسارَ الذاتي) */
      r.tkEmptyS = r.tkNoPerm ? "قائمةُ المهام لا تصل حسابك بصلاحياته الحالية — يصلك تنبيهُ الجرس حين تُسند إليك مهمة" : "حين يُسند إليك شيء يظهر هنا فوراً ويصلك تنبيه في الجرس";
    }
    Object.assign(r, this.pfWeekVals(i, F), this.pfSecVals(a), this.pfSpotVals(i, a, F, SITE, tdDiff, bsRd || bsPl), this.pfHistVals(i, a, r.tkOn));
    return r;
  }
  /* ═══ الخريطة — الخريطةُ نفسُها وأدواتُها كما كانت (لا نقلَ ولا خريطةَ ثانية)؛ KIVO_264 · D6/D18: «موقعك المُسنَد» لا «أنت هنا»،
     ومفتاحُ الألوان يذكر ما يُرسم فعلاً (ألوانُ التغطية حين تُعرض) وأن الذهبيّ إسنادٌ لا تحديدٌ جغرافي ═══ */
  pfMapVals(i, bsDi, tdDiff) {
    const r = {},
      ops = KIVO.__BS_SRV && KIVO.__BS_SRV.operations,
      unavailable = !!(ops && ops.state("bassam_rounds_v1") === "denied" && !i.fromPlan),
      bsEls = i.mapEls.filter((t) => this.bsLensOn(t.kind));
    let _ = i.mySpot ? i.mySpot.fi : 0;
    if (!i.mySpot && bsEls.length) {
      const t = {};
      bsEls.forEach((e) => {
        ("red" !== e.st && "amb" !== e.st) || (t[e.fi] = (t[e.fi] || 0) + 1);
      });
      const e = Object.keys(t).sort((e, s) => t[s] - t[e])[0];
      null != e && (_ = +e);
    }
    const A = i.pfl[_] || null,
      me = i.mySpot,
      td = tdDiff ? i.myTodayEl : null,
      srcTxt = i.rnd ? "من جولة اليوم" : i.fromPlan ? "من التشغيل الميداني" + (i.planDraft ? " (مسودة — لم يُعتمد)" : "") : "";
    ((r.mapUnavailable = unavailable),
      (r.mapHas = !unavailable && i.floors.length > 0 && bsEls.some((t) => t.fi === _)),
      (r.mapNoRound = !unavailable && !i.rnd && !i.fromPlan),
      (r.mapFromPlan = !!i.fromPlan),
      (r.mapEmpty = !unavailable && !((!i.rnd && !i.fromPlan) || r.mapHas)),
      (r.mapFloor = A ? A.name || "الموقع " + (_ + 1) : i.floors.length ? "الموقع " + (_ + 1) : ""),
      (r.mapSub = [me ? me.loc || "" : i.floors.length > 1 ? KIVO.BassamCount(i.floors.length, "موقع") + (bsDi ? " · يُعرض الأكثر عجزاً" : "") : "", srcTxt].filter(Boolean).join(" · ")),
      (r.mapImg = A && A.iid ? this.pfImg(A.iid) : ""),
      (r.mapHasImg = !!r.mapImg),
      (r.mapNoImg = !r.mapImg),
      (r.mapNightKey = KIVO.BassamMapNight ? KIVO.BassamMapNight.key(r.mapImg) : ""),
      (r.mapImgNight = (KIVO.BassamMapNight && KIVO.BassamMapNight.url(r.mapImg)) || (KIVO.BassamMapNight ? KIVO.BassamMapNight.PH : "")));
    const C = { red: "var(--danger)", amb: "var(--warning)", ok: "var(--success)", tea: "var(--info)", non: "var(--neutral-fill)", cls: "var(--text-muted)" };
    r.mapPts = bsEls
      .filter((t) => t.fi === _)
      .map((t) => {
        const mine = !!(me && me.fi === t.fi && me.kind === t.kind && me.i === t.i),
          tod = !!(td && td.fi === t.fi && td.kind === t.kind && td.i === t.i);
        return {
          x: t.x,
          y: t.y,
          r: mine ? 14 : tod ? 12 : "gates" === t.kind ? 10 : 8,
          c: mine ? "var(--brand-primary)" : tod ? "var(--brand-light)" : C[bsDi || "cls" === t.st ? t.st : "non"],
          mine: mine || tod,
          closed: t.closed,
          sq: "marks" === t.kind,
          short: t.short,
          title: t.label + (mine ? " — موقعك المُسنَد" : tod ? " — تسكين اليوم" : "") + (t.closed ? " — مغلق" : bsDi && t.need ? " — " + t.c + "/" + t.need : ""),
          lx: t.x - 80,
          ly: t.y - 33,
        };
      });
    r.mapMine =
      me && this.bsLensOn(me.kind) && me.fi === _ && "number" == typeof me.x
        ? { lx: Math.min(90, Math.max(10, me.x / 10)).toFixed(2), ty: ((me.y + (me.y > 520 ? -58 : 20)) / 6).toFixed(2), label: me.label + ("official" === me.which ? " — موقعك المُسنَد" : " — تسكين اليوم") }
        : null;
    r.mapHasMine = !!r.mapMine;
    r.mapLegend = i.isStaff
      ? "الذهبي: موقعُك المُسنَد (رسمياً أو بتسكين اليوم) — ليس تحديداً لموقعك الفعلي" + (td ? " · الذهبيُّ الفاتح: تسكين اليوم" : "") + (bsDi ? " · أحمر عجز كامل · برتقالي عجز جزئي · أخضر مكتمل" : "") + " · رمادي مغلق"
      : bsDi
        ? "أحمر عجز كامل · برتقالي عجز جزئي · أخضر مكتمل · رمادي مغلق"
        : "المغلق رمادي";
    r.pfMapGo = () => {
      this.pfClose();
      setTimeout(() => {
        try {
          const el = document.querySelector(".pf-mapcard");
          el && el.scrollIntoView && el.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch (t) {
          this._pfScrollErr = 1;
        }
      }, 60);
    };
    return r;
  }
  /* ═══ «أسبوعك» — KIVO_264 · D9: طبقتان صريحتان لكل يوم: المجدول (الإطار المنقّط = راحةٌ في الجدول الشهري لشهر ذلك اليوم وحده) والفعلي
     (رمز الحالة من التقرير اليومي · «لم يُسحب» صريحة) — بلا سقوطٍ إلى نمط شهرٍ آخر؛ و«التفاصيل ←» تفتح «السجل» على قسم الراحة (D7) ═══ */
  pfWeekVals(i, F) {
    const f = this.MONTHS(),
      PF = KIVO.BassamProfileFacts,
      GL = (PF && PF.GL) || {},
      ST = (PF && PF.ST) || {},
      r = {},
      noAl = (t) => String(t || "").replace(/^ال/, ""),
      cur = i.Top.y + "-" + i.Top.m;
    if (i.isStaff) {
      r.week = (i.pfWeek || []).map((w) => {
        const c = w.act ? w.act.code || "pr" : "",
          lbl = w.act ? ST[c] || c : w.any ? "لستَ في تقرير ذلك اليوم" : "لم يُسحب تقرير",
          sc = true === w.sched ? "راحةٌ مجدولة" : false === w.sched ? "يوم عمل مجدول" : "لا جدول لذلك الشهر";
        return {
          wd: noAl(w.wd),
          d: w.d,
          txt: w.act ? GL[c] || "✓" : "—",
          sub: w.act ? (w.act.approved ? "معتمد" : "غير معتمد") : w.any ? "لستَ فيه" : "لم يُسحب",
          cls: "pf-wd" + (w.today ? " is-today" : "") + (true === w.sched ? " s-rest" : "") + (w.act ? " a-" + c : " a-none") + (w.act && w.act.approved ? " ap" : ""),
          dis: !1,
          full: w.wd + " " + w.d + " " + f[w.m - 1] + " — " + sc + " · " + lbl,
          pick: () => this.pfOpenHist("rest", w.ym === cur ? "" : w.ym),
        };
      });
      const rs = F ? F.rest.sched || [] : [],
        wdn = noAl(i.wdOp || i.wd),
        W7 = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      r.restDays = W7.filter((x) => rs.some((y) => noAl(y) === noAl(x))).map((x) => ({ n: x, cls: "pf-restday" + (noAl(x) === wdn ? " today" : ""), tip: noAl(x) === wdn ? "راحتك اليوم — من الجدول الشهري" : "من الجدول الشهري" }));
      r.restDaysNone = !r.restDays.length;
      r.restNone = F && F.month && F.month.has ? "لا أيام راحة في جدول هذا الشهر" : "لم تُحدَّد في جدول هذا الشهر";
      r.restNext = (() => {
        if (!r.restDays.length || (F && F.rest.today)) return "";
        const e = W7.findIndex((x) => noAl(x) === wdn);
        if (e < 0) return "";
        for (let s = 1; s <= 7; s++) {
          const a = W7[(e + s) % 7];
          if (r.restDays.some((t) => t.n === a)) return "راحتك القادمة: " + a + (1 === s ? " (غداً)" : " بعد " + KIVO.BassamCount(s, "يوم", "g") + "");
        }
        return "";
      })();
      r.restSrc = F && F.rest.dayChanged ? "عُدّلت راحتك في تقرير اليوم — المجدولُ أعلاه من الجدول الشهري" : "";
      r.restSrcOn = !!r.restSrc;
      const m = i.pfMon || { pr: 0, ab: 0, pm: 0, lv: 0, n: 0, ap: 0 };
      r.monStats = [
        ["حضور", m.pr, "ok"],
        ["غياب", m.ab, "bad"],
        ["استئذان", m.pm, "warn"],
        ["إجازة", m.lv, "info"],
      ].map((t) => ({ l: t[0], v: String(t[1]), cls: "pf-ms " + t[2] }));
      r.monTitle = "هذا الشهر — " + f[i.Top.m - 1] + " " + i.Top.y + (m.n ? " (من " + KIVO.BassamCount(m.n, "تقرير") + ")" : "");
      r.weekSub = "آخر ٧ أيام — الحالة من التقرير اليومي، والراحة المجدولة من الجدول الشهري";
      r.weekLegend = "الإطار المنقّط: راحةٌ مجدولة · ✓ حاضر · غ غائب · م مستأذن · إ إجازة · ⇄ محوَّل · ر راحة في التقرير · — لم يُسحب تقرير";
      r.goWeek = () => this.pfOpenHist("rest", "");
      r.goWeekOn = !0;
      r.goWeekTxt = "التفاصيل في «السجل» ←";
    } else {
      r.week = i.week.map((t) => ({ wd: t.wd, d: t.d, txt: t.today ? "اليوم" : t.txt, sub: "", cls: "pf-wd m-" + t.code + (t.today ? " is-today" : ""), full: t.full, dis: !0, pick: () => null }));
      r.restDays = [];
      r.restDaysNone = !0;
      r.restNone = "";
      r.restNext = "";
      r.restSrc = "";
      r.restSrcOn = !1;
      r.monStats = [
        ["أيام معتمدة", i.mon.ap, "ok"],
        ["مسحوبة بلا اعتماد", i.mon.open, "warn"],
        ["اليوم", i.T.d, "muted"],
      ].map((t) => ({ l: t[0], v: String(t[1]), cls: "pf-ms " + t[2] }));
      r.monTitle = "هذا الشهر — " + f[i.T.m - 1] + " " + i.T.y;
      r.weekSub = "اعتماد التقرير اليومي آخر ٧ أيام";
      r.weekLegend = "✓ معتمد · ! مسحوب بلا اعتماد · — لم يُسحب";
      r.goWeekOn = this.can("dreport", "view");
      r.goWeek = () => this.go("dreport");
      r.goWeekTxt = "التفاصيل ←";
    }
    r.restBoxOn = !!i.isStaff;
    r.daySub = i.shiftRef ? i.shiftRef + (i.sdef && i.sdef.tStart ? " · " + i.sdef.tStart + " ← " + i.sdef.tEnd : "") : "لم تُسند وردية اليوم بعد";
    return r;
  }
  pfSecVals(a) {
    const r = {},
      P = this.isCF(),
      x = a.pfSrv,
      L = [];
    if (P && x)
      (x.sess || [])
        .slice()
        .sort((t, e) => (e.mine ? 1 : 0) - (t.mine ? 1 : 0) || e.la - t.la)
        .forEach((t) => L.push({ dev: "m" === t.dev ? "جوال" : "حاسوب", isM: "m" === t.dev, where: [t.mine ? "هذا الجهاز" : "", t.city].filter(Boolean).join(" · "), when: t.mine ? "الآن" : t.active ? "نشط الآن" : this.rel(t.la), mine: !!t.mine }));
    else {
      let t = 0;
      try {
        const e = JSON.parse((KIVO.__BS_RAWLS || localStorage).getItem("bassam_session_v1"));
        t = e && e.ts;
      } catch (e) {
        t = 0;
      }
      L.push({ dev: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? "جوال" : "حاسوب", isM: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent), where: "هذا الجهاز", when: t ? "منذ " + this.clock(t) : "الآن", mine: !0 });
    }
    ((r.sess = L.map((t) => ({ ...t, isD: !t.isM }))),
      (r.sessOthers = L.filter((t) => !t.mine).length),
      (r.sessHasOthers = r.sessOthers > 0),
      (r.sessKillTxt = a.pfSrvBusy ? "جارٍ الإنهاء…" : "إنهاء الجلسات الأخرى (" + r.sessOthers + ")"),
      (r.pfKillOthers = () => this.pfKillOthers()));
    const C = [];
    if (P && x) {
      x.lastLogin && C.push({ t: "آخر دخول سابق: " + this.rel(x.lastLogin.ts) + " · " + ("m" === x.lastLogin.dev ? "جوال" : "حاسوب") + (x.lastLogin.city ? " · " + x.lastLogin.city : ""), cls: "pf-sev" });
      /* KIVO_264 · D17: /api/me يعيد آخر ٨ أحداثٍ وحدها — فالعدُّ دقيقٌ إن غطّت الأسبوعَ كلَّه (أقلُّ من ٨ أو أقدمُها قبل بدايته)، وإلا فهو «على الأقل» */
      const ev0 = x.events || [],
        wk0 = x.thisLogin ? x.thisLogin.ts - 6048e5 : 0,
        t = ev0.filter((t) => "login_fail" === t.act && (!x.thisLogin || t.ts > wk0)).length,
        exact = ev0.length < 8 || !x.thisLogin || ev0.some((t) => t && t.ts <= wk0);
      t && C.push({ t: KIVO.BassamCount(t, "محاولة دخول فاشلة") + (exact ? "" : " على الأقل") + " على حسابك خلال الأسبوع — إن لم تكن أنت فغيّر كلمة المرور", cls: "pf-sev warn" });
      const e = (x.events || []).filter((t) => "pw_change" === t.act)[0];
      e && C.push({ t: "آخر تغيير لكلمة المرور: " + this.rel(e.ts), cls: "pf-sev" });
    } else P || C.push({ t: "الجلسات على الأجهزة الأخرى تُدار عند النشر على الخادم", cls: "pf-sev faint" });
    return Object.assign(r, { secEv: C, secSub: P ? "جلساتك الحيّة وآخر نشاط على حسابك" : "هذا الجهاز", pfOpenAcct: () => this.pfOpen("acct") });
  }
  /* ═══ «تفاصيل موقعك» — KIVO_264 · OD-5/OD-4/D5/D7/D8: الإسنادُ الرسمي (خطةُ الشهر المعتمدة) بوسمه · تسكينُ اليوم سطراً مستقلاً حين يختلف ·
     المسودةُ لا تُعرض موقعاً · الخريطةُ نفسُها (بياناتُ mapPts القائمة) · الزملاء بالاسم وحده: العنصرُ نفسُه · ورديتي اليوم · لا راحة ·
     لا غياب/إجازة/تحويل · و«+N» يكشف البقيةَ هنا — لا تنقّلَ إلى صفحاتٍ قد لا أملكها ═══ */
  pfSpotVals(i, a, F, SITE, tdDiff, mapOk) {
    const r = { spotRows: [], spotMates: [], spotMatesOn: !1 },
      PF = KIVO.BassamProfileFacts,
      O = SITE && SITE.official,
      TD = SITE && SITE.today,
      DR = SITE && SITE.draft,
      EV = (PF && PF.EV) || {},
      ml = PF ? PF.monthLabel((SITE && SITE.planYm) || i.Top.y + "-" + i.Top.m) : "",
      row = (k, l, v, s, ev, src) => ({ k, l, v, s, sOn: !!s, ev, evl: EV[ev] || "", evCls: "pf-ev ev-" + ev, src, srcOn: !!src });
    if (!i.isStaff) return r;
    if (!SITE) r.spotRows.push(row("off", "الموقع المُسنَد", i.ME && i.ME.loading ? "جارٍ التحميل…" : "لا بيانات موقعٍ مرتبطة بحسابك", "", "none", ""));
    else {
      O
        ? r.spotRows.push(row("off", "الموقع المُسنَد رسمياً", O.label + (O.closed ? " (مغلق)" : ""), [O.floor, O.loc].filter(Boolean).join(" · "), "saved_approved", "التشغيل الميداني لشهر " + ml + " (معتمد)" + (SITE.officialN > 1 ? " · " + KIVO.BassamCount(SITE.officialN, "موقع") + " مسندة لك" : "")))
        : r.spotRows.push(
            row("off", "الموقع المُسنَد رسمياً", "لا إسنادَ معتمد لهذا الشهر", DR ? "إسنادٌ مسودة: " + DR.label + " — لم يُعتمد، فلا يُعرض موقعاً لليوم" : SITE.plan ? "لست مُسنَداً في التشغيل الميداني لهذا الشهر" : "لا تشغيلَ ميدانيّاً لهذا الشهر", DR ? "saved_open" : "none", ""),
          );
      TD && (tdDiff || !O)
        ? r.spotRows.push(row("today", "تسكين اليوم", TD.label + (TD.closed ? " (مغلق)" : ""), [TD.floor, TD.loc].filter(Boolean).join(" · "), "saved_open", "جولة اليوم في المتابعة اليومية" + (SITE.todayN > 1 ? " · " + KIVO.BassamCount(SITE.todayN, "موقع") : "")))
        : SITE.round || r.spotRows.push(row("today", "تسكين اليوم", "لا جولة لليوم بعد", "تُنشأ جولة اليوم من المتابعة اليومية أو عند سحب التقرير اليومي", "none", ""));
    }
    /* الزملاءُ لموظفٍ مرتبطٍ بسجلّه وحده (OD-4) — الحسابُ غيرُ المرتبط لا يُعرض له اسمُ أحد (والخادمُ لا يعيدها له أصلاً) */
    const linked = !!(i.ME && i.ME.M && i.ME.M.identity && i.ME.M.identity.linked),
      names = linked ? i.mates || [] : [],
      lim = a.spotAll ? 20 : 8;
    r.spotMates = names.slice(0, lim).map((n) => ({ n, i: String(n).trim().charAt(0) }));
    r.spotMatesOn = r.spotMates.length > 0;
    r.spotMatesNone = !r.spotMatesOn;
    r.spotMatesTxt = !F ? "" : !linked ? "تُعرض أسماءُ الزملاء لحسابٍ مرتبطٍ بسجلّ موظف — اطلب من مدير الإدارة ربطَ حسابك" : !F.shift.name ? "لا زملاء — لا وردية لك اليوم" : !(O || TD) ? "لا زملاء — لا إسنادَ لك اليوم" : F.rest.today ? "اليوم راحتك" : "لا زملاء على موقعك في ورديتك اليوم";
    r.spotMore = !a.spotAll && names.length > lim ? "+" + (names.length - lim) : "";
    r.spotMoreOn = !!r.spotMore;
    r.spotMoreGo = () => this.setState({ spotAll: !0 });
    r.spotRest = linked && (i.matesN || 0) > names.length ? "و" + KIVO.BassamCount(i.matesN - names.length, ["زميل واحد", "زميلان", "زميلَين", "زملاء", "زميلاً", "زميل"]) + " آخرون" : "";
    r.spotRestOn = !!r.spotRest;
    r.spotMatesSub = (i.shiftRef ? "وردية " + i.shiftRef + " · " : "") + "على العنصر نفسِه · لستم في راحة · بلا غيابٍ أو إجازةٍ أو تحويل — بالاسم وحده";
    r.spotMapOn = !!(mapOk && i.floors.length);
    r.spotDailyOn = this.can("daily", "view");
    r.spotDaily = () => {
      KIVO.__BS_OPEN_TAB = { page: "daily", tab: "rounds" };
      this.pfClose();
      this.go("daily");
    };
    r.spotNote = "الموقعُ المُسنَد ليس تحديداً لموقعك الفعلي — هو ما أُسند إليك في التشغيل الميداني وجولة اليوم.";
    r.spotSub = O ? O.label : TD ? TD.label : "تفاصيل الإسناد ومصدره";
    return r;
  }
  pfHistGo(ym) {
    const T = this.pfData().Top,
      cur = T.y + "-" + T.m;
    this.setState({ histYm: ym, histErr: "" });
    this.pfHistLoad(ym === cur ? "" : ym);
  }
  /* ═══ «السجل» — KIVO_264: شهرٌ هجريٌّ واحد من الحالة المحفوظة وأحداث التغيير؛ لكل عنصرٍ وسمُ دليله الإلزامي؛ لا تُعاد صياغةُ تاريخٍ من الحالة
     الحالية؛ و«المهام ←» يفتح «سجل مهامك» القائم (لا تكرار) ═══ */
  pfHistVals(i, a, tkOn) {
    const r = { histFilters: [], histSections: [], histGrid: [], histGridOn: !1 };
    if ("hist" !== a.pfPanel) return r;
    const PF = KIVO.BassamProfileFacts,
      cur = i.Top.y + "-" + i.Top.m,
      ym = a.histYm || cur,
      HS = a.pfHist || {},
      H = HS[ym] || (ym === cur ? HS.cur : null),
      V = H && H.ok && PF ? PF.histView(H, a.histType || "all") : null,
      first = H && H.range ? H.range.first : ym,
      last = H && H.range ? H.range.cur : cur,
      EV = (PF && PF.EV) || {};
    r.histTitle = PF ? PF.monthLabel(ym) : ym;
    r.histSub = H && H.local ? "من بيانات هذا الجهاز — سجلُّ التغييرات يحفظه الخادم وحده" : "سجلّك التشغيلي — لكل عنصرٍ وسمُ دليله";
    r.histPrevDis = !H || !PF || PF.ymCmp(ym, first) <= 0;
    r.histNextDis = !H || !PF || PF.ymCmp(ym, last) >= 0;
    r.histPrev = () => r.histPrevDis || this.pfHistGo(PF.ymAdd(ym, -1));
    r.histNext = () => r.histNextDis || this.pfHistGo(PF.ymAdd(ym, 1));
    const TY = [
      ["all", "الكل"],
      ["shift", "الورديات"],
      ["rest", "الراحة"],
      ["sites", "المواقع"],
      ["muk", "التكليف"],
      ["status", "الحالات"],
      ["moves", "التنقلات"],
    ];
    r.histFilters = TY.map((x) => ({ t: x[1], cls: "pf-hf" + (x[0] === (a.histType || "all") ? " on" : ""), on: x[0] === (a.histType || "all") ? "true" : "false", pick: () => this.setState({ histType: x[0] }) }));
    /* «المهام ←» يفتح «سجل مهامك» القائم (لا تكرار) — ويُمحى ذيلُ #/profile/history إذ لم يعد «السجل» مفتوحاً */
    tkOn &&
      r.histFilters.push({
        t: "المهام ←",
        cls: "pf-hf go",
        on: "false",
        pick: () => {
          this._pfHT("");
          this.tkLogOpen();
        },
      });
    r.histLoading = !H && !a.histErr;
    r.histErrOn = !H && !!a.histErr;
    r.histErrTxt = "rate" === a.histErr ? "طلباتٌ كثيرة — أعد المحاولة بعد قليل" : "local" === a.histErr ? "لا بيانات سجلٍّ على هذا الجهاز" : "تعذّر تحميل السجل — أعد المحاولة";
    r.histRetry = () => this.pfHistLoad(ym === cur ? "" : ym, !0);
    r.histSections = V
      ? V.sections.map((s) => ({
          key: s.key,
          title: s.title,
          items: s.items.map((x) => ({ t: x.t, sub: x.sub, subOn: !!x.sub, evl: x.evl, evCls: "pf-ev ev-" + x.ev })),
        }))
      : [];
    const t = a.histType || "all";
    r.histGridOn = !(!V || !V.grid.length || ("all" !== t && "rest" !== t && "status" !== t));
    r.histGrid = r.histGridOn
      ? V.grid.map((g) => ({
          d: g.d,
          wd: g.wd,
          txt: g.txt,
          tip: g.tip,
          cls: "pf-hd" + (g.sched ? " s-rest" : "") + (g.code ? " a-" + g.code : " a-none") + ("approved" === g.rep ? " ap" : "") + ("future" === g.ev ? " fut" : ""),
        }))
      : [];
    r.histSources = V && V.sources ? "المصادر: " + V.sources : "";
    r.histSourcesOn = !!r.histSources;
    const acct = (H && H.account) || {};
    r.histNote = !H || !H.ok
      ? ""
      : V && V.linked
        ? H.identity && !H.identity.linked
          ? "حسابك غير مرتبط بسجلّ موظف — السجلُّ من صفوف مفتاح حسابك نفسِه"
          : ""
        : acct.appointed
          ? "لا سجلَّ تشغيليّاً — حسابك مُعيَّن لإدارة الإدارة بلا سجلّ موظف (متوقَّع لهذا الدور)؛ أحداثُ حسابك في «التنقلات»"
          : "super" === acct.role
            ? "مدير النظام — لا سجلَّ تشغيليّاً؛ أحداثُ حسابك في «التنقلات»"
            : "gm" === acct.role
              ? "مدير عقدة — لا سجلَّ تشغيليّاً؛ أحداثُ حسابك في «التنقلات»"
              : "لا سجلَّ تشغيليّاً مرتبطاً بحسابك بمعرّفٍ ثابت — يربطه مدير الإدارة";
    r.histNoteOn = !!r.histNote;
    r.histEmpty = !!(V && !V.sections.length);
    r.histLegend = ["saved_approved", "saved_open", "logged_change", "derived", "current", "none"].map((k) => ({ t: EV[k] || k, cls: "pf-ev ev-" + k }));
    r.histTrunc = !!(H && H.truncated);
    return r;
  }
}
