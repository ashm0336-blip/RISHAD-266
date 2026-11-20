  _cuEmpty() { return { rev: 0, rows: [], items: [], summary: {}, total: 0, next: "", catalogNext: "" }; }
  _cuApi() { return KIVO.Custody; }
  _cuError(result) { this.setState({ cuError: result.message || "تعذّر تأكيد بيانات العهد من الخادم" }); this.bsToast(result.message || "تعذّر تأكيد العملية", "warn"); }
  _cuEnsure() {
    if (!["custody", "store"].includes(this.state.empTab)) return;
    const API = this._cuApi(), actor = API && API.context();
    if (!actor) { this.state.cuData = this._cuEmpty(); this.state.cuError = "الجلسة غير متاحة — أعد تسجيل الدخول"; return; }
    if (this._cuActorKey && this._cuActorKey !== actor.key) {
      this.state.cuWiz = null; this.state.cuStoreF = null; this.state.cuNewF = {}; this.state.cuCard = null; this.state.cuRowOpen = null;
      this.state.cuHolder = null; this.state.cuMoves = null; this.state.cuPage = 1; this._cuCursors = [""];
    }
    this._cuActorKey = actor.key;
    const view = this.state.empTab === "store" ? "catalog" : "month";
    const wanted = JSON.stringify([actor.key, view, view === "month" ? this.state.cuYear : null, view === "month" ? this.state.cuMonth : null, this.state.cuSearch || "", this.state.cuPerPage || 10]);
    if (this._cuWanted === wanted) return;
    this._cuWanted = wanted; this._cuCursors = [""]; this.state.cuPage = 1;
    this.state.cuData = this._cuEmpty(); this.state.cuLoading = true;
    clearTimeout(this._cuTimer); this._cuTimer = setTimeout(() => this._cuRefresh(), 0);
  }
  async _cuRefresh(cursor) {
    const API = this._cuApi(), actor = API && API.context();
    if (!actor) return { ok: 0 };
    const generation = this._cuGeneration = (this._cuGeneration || 0) + 1;
    const view = this.state.empTab === "store" ? "catalog" : "month";
    const options = { view, year: view === "catalog" ? undefined : this.state.cuYear || undefined, month: view === "catalog" ? undefined : this.state.cuMonth || undefined, q: this.state.cuSearch || "", limit: Math.min(view === "month" ? 100 : 200, this.state.cuPerPage || 10), cursor: cursor || "" };
    this.setState({ cuLoading: true, cuError: "" });
    const result = await API.read(options);
    if (generation !== this._cuGeneration || !API.context() || API.context().key !== actor.key) return { ok: 0 };
    if (!result.ok) { this.setState({ cuLoading: false }); this._cuError(result); return result; }
    const data = result.data;
    this.setState({ cuData: data, cuClock: data.clock, cuLoading: false, cuError: "", cuHolder: null, cuMoves: null });
    this._cuHolderWanted = ""; this._cuMovesWanted = "";
    return result;
  }
  async _cuPage(page) {
    const current = this.state.cuPage || 1, data = this.state.cuData || this._cuEmpty();
    this._cuCursors = this._cuCursors || [""];
    if (page === current + 1 && data.next) this._cuCursors[page - 1] = data.next;
    if (page < 1 || this._cuCursors[page - 1] === undefined || page === current) return;
    const result = await this._cuRefresh(this._cuCursors[page - 1]);
    if (result.ok) this.setState({ cuPage: page });
  }
  _cuEnsureHolder(holderKey) {
    const data = this.state.cuData || this._cuEmpty(), key = holderKey + "|" + data.rev + "|" + data.year + "|" + data.month;
    if (this._cuHolderWanted === key) return;
    this._cuHolderWanted = key; this._cuHolderRequest = null; this.state.cuHolder = null; this.state.cuHolderError = ""; this.state.cuHolderLoading = true;
    setTimeout(() => this._cuLoadHolder(holderKey), 0);
  }
  async _cuLoadHolder(holderKey, more) {
    const data = this.state.cuData || this._cuEmpty(), previous = this.state.cuHolder, token = {}, API = this._cuApi(), actor = API.context();
    if (!actor || (more && (!previous || previous.key !== holderKey || previous.rev !== data.rev || !previous.next))) return;
    this._cuHolderRequest = token; this.setState({ cuHolderLoading: true, cuHolderError: "" });
    try {
      const result = await API.read({ view: "holder", year: data.year, month: data.month, holderKey, cursor: more ? previous.next : "", limit: 200 });
      if (this._cuHolderRequest !== token || this.state.cuData !== data || !API.context() || API.context().key !== actor.key) return;
      if (this.state.cuCard !== holderKey && this.state.cuRowOpen !== holderKey) return;
      if (!result.ok) { this.setState({ cuHolderError: result.message }); return this._cuError(result); }
      if (result.data.rev !== data.rev || (more && previous.rev !== result.data.rev)) {
        const message = "تغيّرت العهد أثناء قراءة التفاصيل؛ أعد تحديث الشهر، لم تُدمج صفحات متعارضة";
        this.setState({ cuHolderError: message }); return this._cuError({ message });
      }
      this.setState({ cuHolder: { key: holderKey, rev: result.data.rev, rows: (more ? previous.rows : []).concat(result.data.rows), next: result.data.next, total: result.data.total }, cuHolderError: "" });
    } finally { if (this._cuHolderRequest === token) this.setState({ cuHolderLoading: false }); }
  }
  _cuOpenHolder(holderKey, card) {
    this.setState(card ? { cuCard: holderKey, cuMenu: null, cuDd: null } : { cuRowOpen: this.state.cuRowOpen === holderKey ? null : holderKey, cuMenu: null, cuDd: null });
    if (card || this.state.cuRowOpen === holderKey) this._cuEnsureHolder(holderKey);
  }
  async _cuLoadMoves(more, holderKey) {
    const data = this.state.cuData || this._cuEmpty(), previous = this.state.cuMoves, target = holderKey || this.state.cuCard || "", kind = target ? "" : this.state.cuLogKind || "", API = this._cuApi(), actor = API.context(), token = {};
    if (!actor || (holderKey && this.state.cuCard !== holderKey) || (more && (!previous || previous.key !== target || previous.rev !== data.rev || previous.kind !== kind || !previous.next))) return;
    this._cuMovesRequest = token; this.setState({ cuMovesLoading: true, cuMovesError: "" });
    try {
      const result = await API.read({ view: "moves", year: data.year, month: data.month, holderKey: target, kind, cursor: more ? previous.next : "", limit: 100 });
      if (this._cuMovesRequest !== token || this.state.cuData !== data || !API.context() || API.context().key !== actor.key) return;
      if (!result.ok) { this.setState({ cuMovesError: result.message }); return this._cuError(result); }
      if (result.data.rev !== data.rev || (more && previous.rev !== result.data.rev)) {
        const message = "تغيّر سجل العهد؛ حدّث الشهر قبل إكمال القراءة"; this.setState({ cuMovesError: message }); return this._cuError({ message });
      }
      this.setState({ cuMoves: { key: target, kind, rev: result.data.rev, rows: (more ? previous.rows : []).concat(result.data.rows), next: result.data.next, total: result.data.total }, cuMovesError: "" });
    } finally { if (this._cuMovesRequest === token) this.setState({ cuMovesLoading: false }); }
  }
  _cuDraft(value) { return { ...value, cuBase: (this.state.cuData || this._cuEmpty()).rev }; }
  _cuIntentDraft(op, key, input) {
    this._cuIntents = this._cuIntents || new Map();
    const identity = op + "|" + key, signature = JSON.stringify(input), old = this._cuIntents.get(identity);
    if (old && old.signature === signature) return old.draft;
    const draft = this._cuDraft(input); this._cuIntents.set(identity, { signature, draft }); return draft;
  }
  _cuRowDraft(holderKey, input) {
    this._cuRowDrafts = this._cuRowDrafts || new Map();
    const signature = JSON.stringify(input), old = this._cuRowDrafts.get(holderKey);
    if (old && old.signature === signature) return old.draft;
    const draft = this._cuDraft(input); this._cuRowDrafts.set(holderKey, { signature, draft }); return draft;
  }
  async _cuMoreCatalog() {
    const current = this.state.cuData || this._cuEmpty(); if (!current.catalogNext) return;
    const result = await this._cuApi().read({ view: "catalog", year: current.year, month: current.month, cursor: current.catalogNext, limit: 200 });
    if (this.state.cuData !== current) return;
    if (!result.ok) return this._cuError(result);
    if (result.data.rev !== current.rev) return this._cuError({ message: "تغيّر المستودع؛ حدّث البيانات قبل إكمال القائمة" });
    this.setState({ cuData: { ...current, items: current.items.concat(result.data.items), catalogNext: result.data.next } });
  }
  async _cuReviewDrafts() {
    if (this._cuBusy) return;
    const actor = this._cuApi().context(); if (!actor) return;
    const result = await this._cuRefresh(); if (!result.ok) return;
    const confirmed = await KIVO.bsConfirm({ title: "مراجعة مسودة العهد", msg: "جُلبت أحدث نسخة من الخادم. هل تريد إعادة اعتماد مسودتك عليها؟ يتحقق الخادم من المتاح والصلاحيات قبل الحفظ.", ok: "إعادة مراجعة المسودة" });
    if (!confirmed) return;
    if (!this._cuApi().context() || this._cuApi().context().key !== actor.key || (this.state.cuData || {}).rev !== result.data.rev) return this._cuError({ message: "تغيرت الجلسة أو البيانات أثناء المراجعة؛ لم تُعدّل المسودة" });
    const base = result.data.rev, patch = {};
    if (this.state.cuWiz) patch.cuWiz = { ...this.state.cuWiz, cuBase: base };
    if (this.state.cuStoreF) patch.cuNewF = { ...this.state.cuNewF, cuBase: base };
    this._cuRowDrafts = new Map(); this._cuIntents = new Map(); this.setState(patch);
  }
  async _cuRun(op, data, draft) {
    if (this._cuBusy) return { ok: 0, err: "busy" };
    const API = this._cuApi(), actor = API && API.context(); if (!actor) return { ok: 0 };
    const owner = draft || this._cuDraft({}), signature = JSON.stringify([op, data]);
    this._cuTickets = this._cuTickets || new WeakMap();
    let record = this._cuTickets.get(owner);
    if (!record || record.signature !== signature) {
      const ticket = API.prepare(op, data, owner.cuBase);
      if (!ticket || ticket.ok === 0) { this._cuError(ticket || {}); return ticket || { ok: 0 }; }
      record = { signature, ticket }; this._cuTickets.set(owner, record);
    }
    this._cuBusy = true; this.setState({ cuSaving: true, cuError: "" });
    try {
      const result = await API.send(record.ticket);
      if (!result.ok) { this._cuError(result); return result; }
      const refreshed = await this._cuRefresh();
      if (!API.context() || API.context().key !== actor.key) return { ok: 0, err: "session" };
      return { ...result, refreshError: !refreshed.ok };
    } finally { this._cuBusy = false; this.setState({ cuSaving: false }); }
  }
  cuOrd(y, m) { return 12 * +y + +m; }
  cuHolderLabel(key) {
    const row = ((this.state.cuData || {}).rows || []).find(row => row.holderKey === key);
    const employee = (this.state.employees || []).find(employee => (employee.eid || employee.name) === key);
    return employee && employee.name || row && row.snapshot && row.snapshot.name || "موظف غير موجود في القائمة";
  }
  cuHeldAt() {
    const holder = this.state.cuHolder, out = {};
    (holder && holder.rows || []).forEach(row => { out[row.issueId] = { ...row, hname: row.snapshot && row.snapshot.name || "" }; });
    return out;
  }
  cuCountIn(y, m, kind) { const summary = (this.state.cuData || {}).summary || {}; return summary[kind === "dmg" ? "monthlyDmg" : kind === "lost" ? "monthlyLost" : kind] || 0; }
  cuCatalog() { return (this.state.cuData || {}).items || []; }
  cuNextSerial() { return "يُخصص عند الاعتماد"; }
  cuAvailable(name) { const item = this.cuCatalog().find(item => item.name === name); return item && item.available || 0; }
  async cuAddItemType(name, qty, prefix, color, draft) { return this._cuRun("type-create", { item: { name, qty: +qty || 0, prefix: prefix || "RD", color: color || "#b99751" } }, draft); }
  async cuEditItemType(oldName, name, qty, prefix, color, draft) {
    const item = this.cuCatalog().find(item => item.name === oldName);
    if (!item) return { ok: 0, message: "الصنف غير موجود في النسخة المعروضة" };
    return this._cuRun("type-edit", { itemId: item.id, patch: { name, qty: +qty || 0, prefix, color } }, draft);
  }
  async cuDelItemType(name, draft) {
    const item = this.cuCatalog().find(item => item.name === name);
    if (!item) return { ok: 0, message: "الصنف غير موجود" };
    return this._cuRun("type-delete", { itemId: item.id }, this._cuIntentDraft("type-delete", item.id, {}));
  }
  async cuHandOut(holderKey, name, color, condition, draft) {
    const item = this.cuCatalog().find(item => item.name === name);
    if (!item) return { ok: 0, message: "الصنف غير موجود" };
    return this._cuRun("issue", { itemId: item.id, holderKey, color, condition }, draft);
  }
  async cuCloseItem(holderKey, name, serial, kind, note) {
    const issue = (this.state.cuHolder && this.state.cuHolder.rows || []).find(issue => issue.eid === holderKey && issue.item === name && issue.ser === serial);
    if (!issue) return this._cuError({ message: "حدّث تفاصيل الحامل قبل تسجيل الحركة؛ لم يتم تحديد عهدة موثوقة" });
    const result = await this._cuRun("close", { issueId: issue.issueId, kind, note: note || "" }, this._cuIntentDraft("close", issue.issueId, { kind, note: note || "" }));
    if (result.ok) this.bsAck(({ in: "استُرجع", dmg: "سُجِّل تالفاً", lost: "سُجِّل مفقوداً" }[kind] || "سُجِّل") + " «" + name + "» " + (serial || ""), kind === "in" ? "ok" : "warn");
    return result;
  }

  cuActor() {
    try {
      const t = KIVO.BassamAuth,
        e = t && t.user && t.user();
      return (e && (e.name || e.user)) || "—";
    } catch (t) {
      return "—";
    }
  }
  CU_MONTHS = [
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
  _cuFmt() {
    if (void 0 === this.__cuF)
      try {
        this.__cuF = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { year: "numeric", month: "numeric", day: "numeric" });
      } catch (t) {
        this.__cuF = null;
      }
    return this.__cuF;
  }
  cuParts(t) {
    const e = this._cuFmt().formatToParts(t),
      r = (t) => +e.find((e) => e.type === t).value;
    return { y: r("year"), m: r("month"), d: r("day") };
  }
  cuGreg(t, e, r) {
    let n = new Date(new Date(2026, 5, 16).getTime() + 864e5 * (29.5306 * (12 * (t - 1448) + (e - 1)) + (r - 1)));
    try {
      for (let a = 0; a < 12; a++) {
        const a = this.cuParts(n);
        if (a.y === t && a.m === e && a.d === r) return n;
        const i = 354.367 * (a.y - t) + 29.5306 * (a.m - e) + (a.d - r);
        n = new Date(n.getTime() - 864e5 * (Math.round(i) || (i > 0 ? 1 : -1)));
      }
    } catch (t) {}
    return n;
  }
  cuGregMonthLabel(t, e) {
    const r = t + "-" + e;
    if (((this.__cuG = this.__cuG || {}), this.__cuG[r])) return this.__cuG[r];
    let n = "";
    try {
      n = this.cuGreg(t, e, 15).toLocaleDateString("ar-u-ca-gregory-nu-latn", { month: "long", year: "numeric" });
    } catch (t) {}
    return ((this.__cuG[r] = n), n);
  }
  cuGregYearRange(t) {
    try {
      const e = this.cuGreg(t, 1, 1).getFullYear(),
        r = this.cuGreg(t, 12, 29).getFullYear();
      return e === r ? e + " م" : e + " – " + r + " م";
    } catch (t) {
      return "";
    }
  }
  cuShiftOpts() {
    try {
      const t = KIVO.__BS_SRV.operations.text("bassam_shift_options_v1");
      if (t) {
        const e = JSON.parse(t);
        if (Array.isArray(e) && e.length && e.every((t) => t && t.name && t.color)) return e;
      }
    } catch (t) {}
    return [
      { name: "الوردية الأولى", color: "#b99751" },
      { name: "الوردية الثانية", color: "#2f8f86" },
      { name: "الوردية الثالثة", color: "#2f5f8a" },
      { name: "الوردية الرابعة", color: "#1e9a66" },
    ];
  }
  cuShiftOf(t, e, r) {
    const n = (KIVO.BassamEmp ? KIVO.BassamEmp.entry(e, t) : e[t.eid || t.nid || t.name || ""]) || {},
      a = void 0 !== n.shift ? n.shift : t.shift;
    return -1 !== r.indexOf(a) ? a : "";
  }
  cuGroupByShift(t) {
    const e = this.cuShiftOpts(),
      r = e.map((t) => t.name);
    let n = {};
    try {
      n = KIVO.bus.read("staff.schedule@1") || {};   /* V7 · د5-د2: قراءةٌ معلنة — بغياب مالك الجدول الكلُّ «بدون وردية» */
    } catch (t) {}
    const a = n[KIVO.BassamEmpImp ? KIVO.BassamEmpImp.curHijriKey() : ""] || {},
      i = {};
    (r.forEach((t) => {
      i[t] = [];
    }),
      (i[""] = []),
      (t || []).forEach((t) => {
        i[this.cuShiftOf(t, a, r)].push(t);
      }));
    const o = e.filter((t) => i[t.name].length).map((t) => ({ key: t.name, name: t.name, color: t.color, list: i[t.name] }));
    return (i[""].length && o.push({ key: "__none", name: "بدون تسكين", color: "#94a3b8", list: i[""] }), o);
  }
  cuHijri() {
    const N = Date.now();
    if (this._bsHjV && N - this._bsHjT < 3e4) return { y: this._bsHjV.y, m: this._bsHjV.m };
    const R = this.cuHijri0();
    return ((this._bsHjV = { y: R.y, m: R.m }), (this._bsHjT = N), R);
  }
  cuHijri0() { return this.state.cuClock || (KIVO.BassamHijri && KIVO.BassamHijri.now ? KIVO.BassamHijri.now() : { y: 1448, m: 1, d: 1 }); }
  cuPast(t, e) {
    const r = this.cuHijri();
    return +t < r.y || (+t === r.y && +e < r.m);
  }
  _custodyVals() {
    this._cuEnsure();
    const t = this.state,
      e = this.cuHijri(),
      r = t.cuYear || e.y,
      n = t.cuMonth || e.m,
      a = this.CU_MONTHS.map((t, a) => {
        const i = a + 1,
          o = n === i,
          s = r === e.y && i === e.m,
          l = this.cuPast(r, i);
        let d =
            "position:relative;width:100%;border-radius:12px;padding:8px;text-align:center;transition:all .2s;box-shadow:var(--shadow-card);cursor:pointer;box-sizing:border-box;font-family:'Cairo',sans-serif;border:1px ",
          c = "#53565a",
          p = "#cbd5e1",
          m = "—",
          h = !1,
          u = "M12 3a9 9 0 0 1 9 9",
          g = "M12 21a9 9 0 0 1-9-9";
        return (
          l
            ? ((d +=
                (o ? "solid #64748b;box-shadow:0 0 0 2px rgba(100,116,139,0.25);" : "solid rgba(100,116,139,0.35);") +
                "background:var(--bg-a1001161390p08)"),
              (c = "#475569"),
              (p = "#475569"),
              (m = "انقضى — مقفل"),
              (h = !0),
              (u = "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"),
              (g = ""))
            : o
              ? ((d += "solid #b99751;box-shadow:0 0 0 2px rgba(185,151,81,0.3);background:var(--bg-a185151810p06)"),
                (c = "#b99751"),
                (p = "#cbd5e1"),
                (m = "—"),
                (h = !1))
              : (d += "dashed #E1E1E1;background:var(--bg-a2452452450p7);opacity:.9"),
          {
            name: t,
            greg: this.cuGregMonthLabel(r, i),
            style: d,
            nameColor: c,
            footColor: p,
            footLabel: m,
            footP1: u,
            footP2: g,
            footIcon: h,
            isCurrent: s,
            tip: l
              ? "الشهر انقضى — مقفل، يُعرض للاطّلاع والطباعة"
              : s
                ? "الشهر الجاري — عليه تُسجَّل حركة العهد"
                : "شهر قادم — لم يبدأ بعد",
            click: () => this.setState({ cuYear: r, cuMonth: i, cuPage: 1, cuRowOpen: null }),
          }
        );
      });

    const i = this.CU_MONTHS[n - 1] || "",
      o = this.cuPast(r, n),
      s = r === e.y && n === e.m;
    return {
      cuLoadOn: ["custody", "store"].includes(t.empTab) && !!t.cuLoading,
      cuStatusOn: ["custody", "store"].includes(t.empTab) && !!(t.cuSaving || t.cuError || (t.cuHolder && t.cuHolder.next) || (t.cuMoves && t.cuMoves.next) || (t.cuData || {}).catalogNext),
      /* V7 UX: قراءةُ العهد تُعرض بمكوّن حالات الصفحة — خطٌّ وشارة فوق المحتوى الباقي، وهيكلٌ مصغّر لعهدة الحامل وحركاته */
      cuStates: (el) => KIVO.PageStates?.host(el, { state: "refreshing" }), ecStates: (el) => KIVO.PageStates?.host(el, { state: "loading", region: true }),
      cuLoading: !!t.cuLoading, cuSaving: !!t.cuSaving, cuErrorOn: !!t.cuError, cuError: t.cuError || "",
      cuReviewDrafts: () => this._cuReviewDrafts(),
      cuHolderNext: !!(t.cuHolder && t.cuHolder.next), cuHolderProgress: t.cuHolder ? "المعروض " + t.cuHolder.rows.length + " من " + t.cuHolder.total + " عهدة نشطة؛ تفاصيل الحالة تخص المعروض" : "", cuHolderMore: () => this._cuLoadHolder(t.cuHolder.key, true),
      cuCatalogNext: !!((t.cuData || {}).catalogNext), cuCatalogMore: () => this._cuMoreCatalog(),
      cuMonths: a,
      cuYearLabel: r + " هـ",
      cuGregRange: this.cuGregYearRange(r),
      cuBadgeLabel: "عهد " + i + " " + r + " هـ — " + (o ? "مقفل (أرشيف)" : s ? "الشهر الجاري" : "لم يبدأ بعد"),
      cuBadgeStyle:
        "display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;border-radius:9999px;padding:4px 12px;font-family:'Cairo',sans-serif;border:1px solid " +
        (s
          ? "rgba(185,151,81,0.35);color:var(--fg-x9a7e40);background:var(--bg-a185151810p12)"
          : "rgba(148,163,184,0.35);color:var(--fg-x64748b);background:var(--bg-a1481631840p1)"),
      cuPrevYear: () => this.setState({ cuYear: r - 1, cuMonth: n }),
      cuNextYear: () => this.setState({ cuYear: r + 1, cuMonth: n }),
      cuGoCurrent: () => this.setState({ cuYear: e.y, cuMonth: e.m }),
      ...this._custodyTableVals(r, n, e),
    };
  }
  CU_LOGO() {
    return '<img src="@@KIVO_INLINE:img/haramain-print.png@@" alt="الحرمين" style="height:100%;width:auto;display:block"/>';
  }
  async cuPrintDoc(t) {
    if (!this.PC("export")) return void this.permDeny();
    const API = this._cuApi(), actor = API && API.context(), snapshot = this.state.cuData,
      selectedYear = this.state.cuYear, selectedMonth = this.state.cuMonth;
    if (!actor || !snapshot || !snapshot.year || !snapshot.month) return this.bsToast("انتظر تحميل عهد الشهر قبل طباعة السند", "warn");
    const unchanged = () => { const now = API.context(); return this.state.cuData === snapshot && this.state.cuYear === selectedYear && this.state.cuMonth === selectedMonth && !!now && now.key === actor.key; },
      cancelled = () => this.bsToast("أُلغيت الطباعة لتغيّر الشهر أو الإدارة أو الجلسة؛ راجع البيانات الحالية ثم اطلب السند", "warn");
    if (!KIVO.BassamCssText.fontReady()) return KIVO.BassamCssText.fontData().then(() => unchanged() ? this.cuPrintDoc(t) : cancelled());
    const printRows = await API.collectHolder({ holderKey: t, year: snapshot.year, month: snapshot.month });
    if (!unchanged()) return cancelled();
    if (!printRows.ok) return this._cuError(printRows);
    const e = this.state,
      n = snapshot.year,
      a = snapshot.month,
      i = (e.employees || []).find((e) => (e.eid || e.name) === t) || {},
      o = Object.fromEntries(printRows.rows.map(issue => [issue.issueId, issue])),
      s = Object.values(o).filter((e) => e.eid === t);
    if (!s.length) return void this.bsToast("لا توجد أصناف بعهدة هذا الموظف في " + (this.CU_MONTHS[a - 1] || "") + " — لا سند للطباعة");
    let l = 1;
    try {
      l = KIVO.BassamHijri ? KIVO.BassamHijri.now().d : 1;
    } catch (t) {}
    const d = (e.employees || []).findIndex((e) => (e.eid || e.name) === t) + 1,
      c = "#" + n + String(a).padStart(2, "0") + String(d).padStart(2, "0"),
      p = l + " " + (this.CU_MONTHS[a - 1] || "") + " " + n + " هـ";
    let m = "";
    try {
      m = new Date().toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });
    } catch (t) {}
    let h = "الإدارة";
    try {
      h = (KIVO.BassamDepts && KIVO.BassamDepts.activeName()) || h;
    } catch (t) {}
    const u = (t) => String(null == t ? "" : t).replace(/[&<>]/g, (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[t]),
      g = s
        .map((t, r) => {
          const n = t;
          return (
            '<tr><td class="c">' +
            (r + 1) +
            '</td><td><span class="sw" style="background:' +
            (t.color || "var(--bg-xb99751)") +
            '"></span>' +
            u(t.item) +
            '</td><td class="c mono">' +
            u(t.ser || "—") +
            '</td><td class="c">' +
            u(n.cond || "—") +
            '</td><td class="c">1</td><td class="c mono">' +
            (t.d || "") +
            "/" +
            String(t.m).padStart(2, "0") +
            "/" +
            t.y +
            "</td></tr>"
          );
        })
        .join(""),
      f = (t, e) => '<div class="fld"><div class="fl">' + t + '</div><div class="fv">' + u(e || "—") + "</div></div>",
      b = [
        "@page{size:210mm 297mm;margin:14mm 14mm 12mm}",
        "*{box-sizing:border-box}",
        'body{margin:0;font-family:"Cairo",sans-serif;color:var(--fg-x141414);-webkit-print-color-adjust:exact;print-color-adjust:exact}',
        ".pg{padding:0}",
        ".hd{display:flex;align-items:flex-start;justify-content:space-between;border-bottom:2.5px solid var(--bd-xb99751);padding-bottom:12px}",
        ".t1{font-size:20px;font-weight:800;color:var(--fg-x25343f);margin:0}",
        ".t2{font-size:11px;font-weight:400;color:var(--fg-x94a3b8);margin-top:5px}",
        ".lg{height:52px;flex-shrink:0}",
        ".flds{display:flex;flex-wrap:wrap;gap:18px 26px;margin:18px 0 6px}",
        ".fld{min-width:110px}",
        ".fl{font-size:9px;font-weight:600;color:var(--fg-xa2a9b2)}",
        ".fv{font-size:12.5px;font-weight:600;margin-top:3px}",
        "table{width:100%;border-collapse:collapse;margin-top:14px}",
        "thead tr{background:var(--bg-a185151810p07);border-bottom:2px solid var(--bd-a185151810p3)}",
        "th{font-size:10px;font-weight:600;color:var(--fg-x53565a);padding:8px 7px;text-align:right;white-space:nowrap}",
        "td{font-size:11.5px;font-weight:400;color:var(--fg-x3f3f3f);padding:8px 7px;border-bottom:1px solid var(--bd-xf1f3f5)}",
        ".c{text-align:center}",
        '.mono{font-feature-settings:"tnum";direction:ltr;font-weight:600;color:var(--fg-x8a6f35)}',
        ".sw{display:inline-block;width:9px;height:9px;border-radius:3px;margin-left:7px;vertical-align:middle}",
        ".ack{margin-top:18px;padding:12px 14px;border-radius:10px;background:var(--bg-a185151810p05);border:1px solid var(--bd-a185151810p25);font-size:11px;font-weight:400;color:var(--fg-x53565a);line-height:1.95}",
        ".sig{display:flex;gap:34px;margin-top:34px}",
        ".sg{flex:1}",
        ".sgl{font-size:9.5px;font-weight:600;color:var(--fg-xa2a9b2);margin-bottom:30px}",
        ".sgn{border-top:1px dashed var(--bd-xcbd1d8)}",
        ".ft{position:fixed;bottom:0;left:0;right:0;display:flex;justify-content:space-between;font-size:8.5px;font-weight:400;color:var(--fg-x94a3b8);border-top:1px solid var(--bd-xeef0f2);padding-top:6px}",
      ].join("\n"),
      A =
        '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>سند تسليم عهدة ' +
        c +
        " — " +
        u(i.name) +
        "</title><style>" +
        KIVO.BassamCssText.byId("bs-theme-tokens") +
        this.cuFontCss() +
        b +
        '</style></head><body><div class="pg"><div class="hd"><div><h1 class="t1">سند تسليم عهدة</h1><div class="t2">رقم السند <span class="mono">' +
        c +
        "</span> · " +
        p +
        (m ? " الموافق " + m : "") +
        '</div></div><div class="lg">' +
        this.CU_LOGO() +
        '</div></div><div class="flds">' +
        f("المستلِم", i.name) +
        f("الرقم الوظيفي", i.eid) +
        f("نوع التوظيف", i.type) +
        f("نوع العمل", i.work) +
        f("الإدارة", h) +
        f("أمين العهدة", this.cuActor()) +
        '</div><table><thead><tr><th class="c">م</th><th>الصنف</th><th class="c">الرقم التسلسلي</th><th class="c">الحالة عند التسليم</th><th class="c">الكمية</th><th class="c">تاريخ التسليم</th></tr></thead><tbody>' +
        g +
        '</tbody></table><div class="ack">أُقرّ باستلامي الأصناف المذكورة أعلاه بحالتها الموضّحة، وألتزم بالمحافظة عليها وإعادتها عند انتهاء المهمة أو عند طلبها، وأتحمّل ما يترتّب على فقدها أو تلفها بسبب الإهمال وفق الأنظمة المعتمدة.</div><div class="sig"><div class="sg"><div class="sgl">توقيع المستلِم</div><div class="sgn"></div></div><div class="sg"><div class="sgl">توقيع أمين العهدة</div><div class="sgn"></div></div><div class="sg"><div class="sgl">اعتماد مدير الإدارة</div><div class="sgn"></div></div></div><div class="ft"><span>المنصة التشغيلية · ' +
        u(h) +
        "</span><span>" +
        p +
        "</span></div></div></body></html>";
    try {
      const t = document.getElementById("bs-cu-print");
      t && t.remove();
    } catch (t) {}
    const x = document.createElement("iframe");
    ((x.id = "bs-cu-print"),
      x.setAttribute("style", "position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;opacity:0"),
      document.body.appendChild(x));
    const y = x.contentDocument || x.contentWindow.document;
    (y.open(), y.write(A), y.close());
    try {
      KIVO.BassamDigits && KIVO.BassamDigits.watch(y);
    } catch (e9) {}
    const v = () => {
      let t = null;
      try {
        ((t = document.title), (document.title = "سند تسليم عهدة " + c + " — " + (i.name || "")));
      } catch (t) {}
      try {
        (x.contentWindow.focus(), x.contentWindow.print());
      } catch (t) {}
      setTimeout(() => {
        try {
          null != t && (document.title = t);
        } catch (t) {}
        try {
          x.remove();
        } catch (t) {}
      }, 1200);
    };
    try {
      y.fonts && y.fonts.ready ? y.fonts.ready.then(v).catch(v) : setTimeout(v, 400);
    } catch (t) {
      setTimeout(v, 400);
    }
  }
  cuFontCss() {
    if (null != this.__cuFont) return this.__cuFont;
    let t = "";
    try {
      [].forEach.call(KIVO.BassamCssText.fontSheets(), (e) => {
        let r;
        try {
          r = e.cssRules;
        } catch (t) {
          return;
        }
        r &&
          [].forEach.call(r, (e) => {
            5 === e.type && /data:font/.test(e.cssText) && /Cairo/.test(e.cssText) && (t += e.cssText + "\n");
          });
      });
    } catch (t) {}
    return ((this.__cuFont = t), t);
  }
  
  
  _custodyStatsVals(t, e) {
    const n = this.cuCatalog(), summary = (this.state.cuData || {}).summary || {}, o = {};
    n.forEach(item => { o[item.name] = { c: item.color || "#b99751", tot: +item.qty || 0, out: item.held || 0, dmg: item.dmg || 0, lost: item.lost || 0 }; });
    const s = summary.totalQty || 0, l = summary.held || 0, d = summary.dmg || 0, c = summary.lost || 0;
    const p = Math.max(0, s - l - d - c),
      m = [
        [p, "#16a34a"],
        [l, "#b99751"],
        [d, "#dc2626"],
        [c, "#64748b"],
      ].filter((t) => t[0] > 0),
      h = [];
    if (s > 0 && m.length) {
      const t = 56,
        e = 56,
        r = 45,
        n = (n) => [(t + r * Math.cos(((n - 90) * Math.PI) / 180)).toFixed(2), (e + r * Math.sin(((n - 90) * Math.PI) / 180)).toFixed(2)];
      let a = 0;
      const i = m.length > 1 ? 4 : 0;
      m.forEach(([t, e]) => {
        const r = (t / s) * 360;
        let o = a + i / 2,
          l = a + r - i / 2;
        if (((a += r), 1 === m.length && ((o = 0), (l = 359.9)), l <= o)) return;
        const d = n(o),
          c = n(l),
          p = l - o > 180 ? 1 : 0;
        h.push({ d: "M" + d[0] + " " + d[1] + " A45 45 0 " + p + " 1 " + c[0] + " " + c[1], c: e });
      });
    }
    const u = (t, e, r) => {
        const n = r || 12,
          a = t >= 100 ? n : t <= 0 ? 0 : Math.max(1, Math.min(n - 1, Math.round((t / 100) * n))),
          i = [];
        for (let t = 0; t < n; t++)
          i.push("flex:1 1 0;min-width:0;height:6px;border-radius:9999px;background:" + (t < a ? e : "var(--bg-a185151810p12)"));
        return i;
      },
      f = (summary.topHolders || []).map(row => ({ k: row.holderKey, name: row.name || "موظف غير موجود في القائمة", n: row.n })),
      b = f.length ? f[0].n : 1,
      A = summary.openingHeld || 0,
      x = this.cuCountIn(t, e, "out"),
      y = this.cuCountIn(t, e, "in"),
      v = this.cuCountIn(t, e, "dmg") + this.cuCountIn(t, e, "lost"),
      w = (t, e, r) => "background:" + t + ";color:" + e + ";border:1px solid " + r;
    return {
      ckLg: [
        { sign: "", name: "رصيد مُرحَّل", v: String(A), color: "#53565a", badge: w("#F1F3F5", "#9AA1AA", "#E6E8EB") },
        {
          sign: "+",
          name: "تسليمات الشهر",
          v: String(x),
          color: "#047857",
          badge: w("rgba(0,132,80,0.10)", "#047857", "rgba(0,132,80,0.25)"),
        },
        {
          sign: "−",
          name: "إرجاعات الشهر",
          v: String(y),
          color: "#2a76aa",
          badge: w("rgba(14,165,233,0.10)", "#2a76aa", "rgba(14,165,233,0.25)"),
        },
        {
          sign: "−",
          name: "تالف ومفقود",
          v: String(v),
          color: "#b91c1c",
          badge: w("rgba(220,38,38,0.08)", "#b91c1c", "rgba(220,38,38,0.2)"),
        },
      ],
      ckLgNow: String(summary.held || 0),
      ckOn: !0,
      ckMonth: (this.CU_MONTHS[e - 1] || "") + " " + t,
      ckTotal: String(s),
      ckArcs: h,
      ckLegend: [
        ["متاح في المستودع", p, "#16a34a"],
        ["بعهدة موظف", l, "#b99751"],
        ["تالف", d, "#dc2626"],
        ["مفقود", c, "#64748b"],
      ]
        .filter((t) => t[1] > 0 || "#16a34a" === t[2] || "#b99751" === t[2])
        .map(([t, e, r]) => ({ name: t, n: String(e), c: r })),
      ckItems: n.map((t) => {
        const e = o[t.name];
        return {
          name: t.name,
          c: e.c,
          av: String(Math.max(0, e.tot - e.out - e.dmg - e.lost)),
          out: String(e.out),
          tot: String(e.tot),
          cells: u(e.tot ? Math.round((e.out / e.tot) * 100) : 0, e.c),
        };
      }),
      ckNoItems: 0 === n.length,
      ckTops: f.map((t) => ({
        name: t.name,
        n: String(t.n),
        ini: String(t.name)
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((t) => t[0])
          .join(""),
        cells: u(Math.round((t.n / b) * 100), "#b99751"),
      })),
      ckNoTops: 0 === f.length,
      ...(() => {
        const R = KIVO.BassamRing,
          P = R.pct,
          now = summary.held || 0,
          oa = Object.values(o),
          outA = summary.held || 0,
          totA = summary.totalQty || 0,
          otherHeld = Math.max(0, outA - oa.reduce((total, item) => total + item.out, 0)),
          PAL = ["#b99751", "#8a6f35", "#2a76aa", "#64748b"],
          st = [
            ["متاح في المستودع", p, "#16a34a"],
            ["بعهدة موظف", l, "#b99751"],
            ["تالف", d, "#dc2626"],
            ["مفقود", c, "#64748b"],
          ].filter((t) => t[1] > 0 || "#16a34a" === t[2] || "#b99751" === t[2]);
        return {
          ckK1Ring: R.one(s ? now / s : 0),
          ckK1Big: String(now),
          ckK1Col: "#8a6f35",
          ckK1Pill: P(now, s),
          ckK1Sub: "القائم في نهاية الشهر",
          ckK1SubCol: "#8a6f35",
          ckK1Rows: [
            ["", "رصيد مُرحَّل", A, "#53565a"],
            ["+", "تسليمات الشهر", x, "#047857"],
            ["−", "إرجاعات الشهر", y, "#2a76aa"],
            ["−", "تالف ومفقود", v, "#b91c1c"],
          ].map((t) => ({ label: t[1], n: t[0] + t[2], pct: "", color: t[3], ncolor: t[3], tip: t[1] + ": " + t[0] + t[2] })),
          ckK2Ring: R.segs(st.map((t) => ({ n: t[1], color: t[2], tip: t[0] + ": " + t[1] }))),
          ckK2Big: String(s),
          ckK2Col: "var(--fg-x141414)",
          ckK2Pill: s ? "⁧بعهدة " + P(l, s) + "⁩" : "—",
          ckK2Sub: (this.CU_MONTHS[e - 1] || "") + " " + t,
          ckK2SubCol: "#94a3b8",
          ckK2Rows: st.map((t) => ({
            label: t[0],
            n: String(t[1]),
            pct: P(t[1], s),
            color: t[2],
            ncolor: t[1] ? t[2] : "#94a3b8",
            tip: t[0] + ": " + t[1],
          })),
          ckK3Ring: R.segs(
            n.map((t) => ({ n: o[t.name].out, color: o[t.name].c, tip: t.name + ": " + o[t.name].out + " من " + o[t.name].tot })).concat(otherHeld ? [{ n: otherHeld, color: "#94a3b8", tip: "بعهدة أصناف أخرى لم تُحمّل تفاصيلها: " + otherHeld }] : []),
            totA,
          ),
          ckK3Big: String(summary.catalogTotal || 0),
          ckK3Col: "#8a6f35",
          ckK3Pill: totA ? "⁧بعهدة " + P(outA, totA) + "⁩" : "—",
          ckK3Sub: "بعهدة / الإجمالي",
          ckK3SubCol: "#94a3b8",
          ckK3Rows: n.map((t) => {
            const e = o[t.name],
              r = Math.max(0, e.tot - e.out - e.dmg - e.lost);
            return {
              label: t.name,
              n: e.out + "/" + e.tot,
              pct: P(e.out, e.tot),
              color: e.c,
              ncolor: e.c,
              tip: t.name + " — متاح " + r + " · بعهدة " + e.out + " · الإجمالي " + e.tot,
            };
          }),
          ckK4Ring: R.segs(
            f.map((t, e) => ({ n: t.n, color: PAL[e % PAL.length], tip: t.name + ": " + t.n })),
            l,
          ),
          ckK4Big: f.length ? String(f[0].n) : "0",
          ckK4Col: "#8a6f35",
          ckK4Pill: f.length ? "⁧" + f[0].name + "⁩" : "—",
          ckK4Sub: l ? "من " + KIVO.BassamCount(l, "قطعة", "g") + " بعهدة" : "لا عهد بنهاية هذا الشهر",
          ckK4SubCol: "#94a3b8",
          ckK4Rows: f.map((t, e) => ({
            label: t.name,
            n: String(t.n),
            pct: P(t.n, l),
            color: PAL[e % PAL.length],
            ncolor: PAL[e % PAL.length],
            tip: t.name + ": " + t.n,
          })),
        };
      })(),
    };
  }
  _custodyCardVals(t, e, r) {
    const n = this.state,
      a = n.cuCard;
    if (!a) return { ecOn: !1, ecOff: !0 };
    this._cuEnsureHolder(a);
    const movesKey = a + "|" + (n.cuData || {}).rev;
    if (this._cuMovesWanted !== movesKey) { this._cuMovesWanted = movesKey; this._cuMovesRequest = null; this.state.cuMoves = null; this.state.cuMovesError = ""; this.state.cuMovesLoading = true; setTimeout(() => this._cuLoadMoves(false, a), 0); }
    const holder = n.cuHolder && n.cuHolder.key === a && n.cuHolder.rev === (n.cuData || {}).rev ? n.cuHolder : null,
      ready = !!holder, total = ready ? holder.total : null,
      moves = n.cuMoves && n.cuMoves.key === a && n.cuMoves.rev === (n.cuData || {}).rev ? n.cuMoves : null,
      i = (n.employees || []).find((t) => (t.eid || t.name) === a) || {},
      o = this.cuHeldAt(t, e, !1),
      s = ready ? Object.values(o).filter((t) => t.eid === a) : [],
      l = moves ? moves.rows : [],
      d = this.cuPast(t, e),
      c = this.cuOrd(t, e) > this.cuOrd(r.y, r.m),
      p = !d && !c && this._emCanWrite(),
      m = { out: ["تسليم", "#16a34a"], in: ["إرجاع", "#4a97cf"], dmg: ["تلف", "#dc2626"], lost: ["فقد", "#64748b"] },
      h = (serial) => (s.find(issue => issue.ser === serial) || {}).cond || "—",
      u = (t) =>
        "display:inline-flex;align-items:center;border-radius:9999px;padding:3px 10px;font-size:10px;font-weight:600;font-family:'Cairo',sans-serif;" +
        ("جديد" === t
          ? "background:var(--bg-a0132800p1);color:var(--fg-x047857);border:1px solid var(--bd-a0132800p25)"
          : "مستعمل" === t
            ? "background:var(--bg-a185151810p12);color:var(--fg-x8a6f35);border:1px solid var(--bd-a185151810p3)"
            : "background:var(--bg-a1481631840p12);color:var(--fg-x64748b);border:1px solid var(--bd-a1481631840p3)"),
      g = {};
    s.forEach((t) => {
      const e = h(t.ser);
      g[e] = (g[e] || 0) + 1;
    });
    const f = { جديد: "#16a34a", جيد: "#4a97cf", مستعمل: "#b99751" };
    return {
      ecOn: !0,
      ecOff: !1,
      ecName: i.name || this.cuHolderLabel(a, o),
      ecEid: i.eid || "غير موجود في قائمة الموظفين · " + a,
      ecType: i.type || "—",
      ecWork: i.work || "—",
      ecIni: String(i.name || "؟")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((t) => t[0])
        .join(""),
      ecMonth: (this.CU_MONTHS[e - 1] || "") + " " + t + " هـ",
      ecBadgeLbl: !ready ? n.cuHolderError ? "تعذّرت القراءة" : "يُحدَّث من الخادم" : total ? KIVO.BassamCount(total, "صنف") + " بعهدته" : "لا عهدة",
      ecBadge:
        "display:inline-flex;align-items:center;margin-right:9px;border-radius:9999px;padding:3px 11px;font-size:10.5px;font-weight:600;font-family:'Cairo',sans-serif;" +
        (ready && total
          ? "background:var(--bg-a185151810p12);color:var(--fg-x8a6f35);border:1px solid var(--bd-a185151810p3)"
          : "background:var(--bg-a1481631840p1);color:var(--fg-x64748b);border:1px solid var(--bd-a1481631840p3)"),
      ecCanWrite: p,
      ecCanIssue: p && !!(i.eid || i.name),   /* KIVO_265: لا تسليمَ جديداً لحاملٍ غير موجود في القائمة — الإرجاعُ والتلفُ والفقد فقط */
      ecBack: () => this.setState({ cuCard: null }),
      ecPrint: () => this.cuPrintDoc(a),
      ecNewDoc: () => this.setState({ cuWiz: this._cuDraft({ step: 2, eid: a, name: i.name || a, picks: {}, q: "" }) }),
      ecHasItems: s.length > 0,
      ecNoItems: ready && total === 0,
      ecLoading: !!n.cuHolderLoading || (!ready && !n.cuHolderError),
      ecError: n.cuHolderError || "",
      ecRetry: () => this._cuLoadHolder(a),
      ecProgress: ready ? "المعروض " + s.length + " من " + total + " عهدة نشطة" : "",
      ecMore: ready && !!holder.next,
      ecMoreDo: () => this._cuLoadHolder(a, true),
      ecItems: s.map((t) => {
        const e = h(t.ser);
        return {
          name: t.item,
          ser: t.ser || "—",
          color: t.color || "#b99751",
          icoStyle:
            "width:32px;height:32px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:" +
            (t.color || "var(--bg-xb99751)") +
            "18;border:1px solid " +
            (t.color || "var(--bd-xb99751)") +
            "33",
          cond: e,
          condStyle: u(e),
          since: (t.d || "") + "/" + String(t.m).padStart(2, "0"),
          ret: () => this.cuCloseItem(a, t.item, t.ser, "in"),
          dmg: () => this.cuCloseItem(a, t.item, t.ser, "dmg", "سُجِّل تلف — بانتظار الإبدال"),
          lost: () => this.cuCloseItem(a, t.item, t.ser, "lost", "بلاغ فقد — قيد المراجعة"),
        };
      }),
      ecCount: ready ? String(total) : "—",
      ecRing:
        "width:64px;height:64px;border-radius:9999px;flex-shrink:0;display:grid;place-items:center;border:9px solid " +
        (ready && total ? "var(--bd-xb99751)" : "var(--bd-xeef0f2)") +
        ";border-left-color:var(--bd-xeef0f2);border-bottom-color:var(--bd-xeef0f2)",
      ecStatsScope: ready ? "حالة الأصناف المعروضة: " + s.length + " من " + total : "تفاصيل الحالة تظهر بعد اكتمال القراءة",
      ecStats: ready ? Object.keys(g).map((t) => ({ name: t, n: String(g[t]), color: f[t] || "#94a3b8" })) : [],
      ecMoves: l.map((r) => {
        const n = m[r.kind] || m.out;
        return {
          title: n[0] + " · " + (r.item || ""),
          sub:
            (r.d || "") +
            " " +
            (this.CU_MONTHS[e - 1] || "") +
            " " +
            t +
            " هـ" +
            (r.ser ? " · " + r.ser : "") +
            (r.note ? " · " + r.note : ""),
          dot:
            "width:9px;height:9px;border-radius:9999px;margin-top:4px;flex-shrink:0;background:" +
            n[1] +
            ";box-shadow:0 0 0 3px " +
            n[1] +
            "22",
        };
      }),
      ecNoMoves: !!moves && moves.total === 0,
      ecMovesLoading: !!n.cuMovesLoading || (!moves && !n.cuMovesError),
      ecMovesError: n.cuMovesError || "",
      ecMovesProgress: moves ? "المعروض " + l.length + " من " + moves.total + " حركة" : "",
      ecMovesRetry: () => this._cuLoadMoves(false, a),
      ecMovesMore: !!(moves && moves.next),
      ecMovesMoreDo: () => this._cuLoadMoves(true, a),
    };
  }
  _custodyWizVals() {
    const t = this.state,
      e = t.cuWiz;
    if (!e) return { wzOn: !1 };
    const r = this.cuCatalog(),
      n = this.cuHijri();
    let a = 1;
    try {
      a = KIVO.BassamHijri ? KIVO.BassamHijri.now().d : 1;
    } catch (t) {}
    const i = this.cuHeldAt(n.y, n.m, !1),
      o = (e.q || "").trim(),
      s = KIVO.BassamFind.filter(o, t.employees || [], (t) => [t.name, t.eid, t.empno, t.nid]),
      l = e.picks || {},
      d = Object.keys(l).filter((t) => l[t] && l[t].on),
      c = (t) =>
        String(t || "؟")
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((t) => t[0])
          .join(""),
      p = {};
    d.forEach((t) => {
      p[t] = this.cuNextSerial(t);
    });
    const m = e.step || 1,
      h = 1 === m ? !!e.eid : 2 !== m || d.length > 0,
      av = r.filter((t) => this.cuAvailable(t.name) > 0);   /* KIVO_265 · مستودع العهد: خطوةُ التسليم تعرض المتاحَ وحده */
    return {
      wzOn: !0,
      wzS1: 1 === m,
      wzS2: 2 === m,
      wzS3: 3 === m,
      wzHint: 1 === m ? "اختر الموظف المستلِم" : 2 === m ? "حدّد الأصناف وحالتها عند التسليم" : "راجع السند قبل اعتماده",
      wzSteps: [
        ["الموظف", 1],
        ["الأصناف", 2],
        ["المراجعة", 3],
      ].map(([t, e]) => {
        return {
          n: String(e),
          name: t,
          col: m === e ? "#8A6F35" : m > e ? "#047857" : "#B0B6BD",
          badge:
            ((r = m === e),
            (n = m > e),
            "width:19px;height:19px;border-radius:9999px;display:inline-flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:600;font-family:'Cairo',sans-serif;" +
              (n
                ? "background:var(--bg-a0132800p12);color:var(--fg-x047857)"
                : r
                  ? "background:linear-gradient(135deg,var(--bg-xb99751),var(--bg-a185151810p85));color:var(--text-on-brand)"
                  : "background:var(--bg-xf1f3f5);color:var(--fg-x9aa1aa)")),
        };
        var r, n;
      }),
      wzQ: e.q || "",
      wzSetQ: (t) => this.setState({ cuWiz: { ...e, q: t.target.value } }),
      wzGroups: this.cuGroupByShift(s).map((t) => {
        const r = !!o || !!(e.open || {})[t.key];
        return {
          key: t.key,
          name: t.name,
          open: r,
          dot: "width:9px;height:9px;border-radius:9999px;flex-shrink:0;background:" + t.color,
          count: String(t.list.length),
          countStyle:
            "display:inline-flex;align-items:center;border-radius:9999px;padding:2px 9px;font-size:10px;font-weight:600;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';color:" +
            t.color +
            ";background:" +
            t.color +
            "1A;border:1px solid " +
            t.color +
            "40",
          head:
            "display:flex;align-items:center;gap:9px;padding:9px 11px;border-radius:11px;margin-bottom:6px;cursor:pointer;transition:all .15s;user-select:none;background:" +
            (r ? "var(--bg-a2482502520p9)" : "var(--bg-xffffff)") +
            ";border:1px solid " +
            (r ? "var(--bd-xe1e5ea)" : "var(--bd-xeef0f2)"),
          chev: "transition:transform .2s;flex-shrink:0;opacity:.5;" + (r ? "transform:rotate(180deg)" : ""),
          toggle: () => {
            const e = { ...(this.state.cuWiz.open || {}) };
            (e[t.key] ? delete e[t.key] : (e[t.key] = 1), this.setState({ cuWiz: { ...this.state.cuWiz, open: e } }));
          },
          emps: t.list.map((t) => {
            const r = t.eid || t.name,
              n = Object.values(i).filter((t) => t.eid === r).length;
            return {
              name: t.name || "—",
              eid: t.empno || "—",
              ini: c(t.name),
              held: n ? n + " بعهدته" : "لا عهدة",
              badge:
                "display:inline-flex;align-items:center;border-radius:9999px;padding:3px 10px;font-size:10px;font-weight:600;font-family:'Cairo',sans-serif;" +
                (n
                  ? "background:var(--bg-a185151810p12);color:var(--fg-x8a6f35);border:1px solid var(--bd-a185151810p3)"
                  : "background:var(--bg-a1481631840p1);color:var(--fg-x64748b);border:1px solid var(--bd-a1481631840p3)"),
              style:
                "display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:11px;margin-bottom:6px;cursor:pointer;transition:all .15s;background:var(--bg-xffffff);border:1px solid " +
                (e.eid === r ? "var(--bd-xb99751)" : "var(--bd-xeef0f2)"),
              pick: () => this.setState({ cuWiz: { ...e, eid: r, name: t.name || r, step: 2 } }),
            };
          }),
        };
      }),
      wzNoEmps: 0 === s.length,
      wzIni: c(e.name),
      wzName: e.name || "—",
      wzEid: e.eid || "—",
      /* KIVO_265 · مستودع العهد — قرارُ المالك: لا إضافةَ ولا تعديلَ للأصناف داخل التسليم؛ ذلك في تبويب «مستودع العهد» وحده */
      wzItems: av.map((t) => {
        const r = !(!l[t.name] || !l[t.name].on),
          n = (l[t.name] && l[t.name].cond) || "جديد",
          a = this.cuAvailable(t.name);
        return {
          name: t.name,
          color: t.color || "#b99751",
          avail: KIVO.BassamCount(a, "قطعة|متاحة") + "",
          on: r,
          ser: r ? p[t.name] || "" : "—",
          box:
            "width:18px;height:18px;border-radius:6px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border:1.6px solid " +
            (r ? "#b99751;background:var(--bg-xb99751)" : "#D9DDE2;background:var(--bg-xffffff)"),
          style:
            "display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:11px;margin-bottom:6px;transition:all .15s;cursor:pointer;background:" +
            (r ? "var(--bg-a185151810p05)" : "var(--bg-xffffff)") +
            ";border:1px solid " +
            (r ? "var(--bd-xb99751)" : "var(--bd-xeef0f2)"),
          tog: () => this.setState({ cuWiz: { ...e, picks: { ...l, [t.name]: { on: !r, cond: n } } } }),
          conds: ["جديد", "جيد", "مستعمل"].map((a) => ({
            name: a,
            pick: () => this.setState({ cuWiz: { ...e, picks: { ...l, [t.name]: { on: !0, cond: a } } } }),
            style:
              "padding:5px 9px;font-size:10px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif;" +
              (n === a && r
                ? "background:var(--bg-a185151810p1);color:var(--fg-x8a6f35);box-shadow:inset 0 -2px 0 var(--brand-primary)"
                : "background:var(--bg-xffffff);color:var(--fg-x8b9099)"),
          })),
        };
      }),
      wzNoItems: 0 === av.length,
      wzNoItemsMsg: r.length
        ? "لا قطعَ متاحةً في المستودع — كلُّ الأصناف بعهدة موظفين؛ زِد الكمية من تبويب «مستودع العهد»"
        : "لا أصنافَ في المستودع بعد — أضِفها من تبويب «مستودع العهد»",
      wzGoStore: () => this.setState({ cuWiz: null, empTab: "store", cuStoreF: null }),
      wzReview: d.map((t) => {
        const e = r.find((e) => e.name === t) || {};
        return { name: t, color: e.color || "#b99751", cond: (l[t] && l[t].cond) || "جديد", ser: p[t] || "" };
      }),
      wzCount: KIVO.BassamCount(d.length, "صنف") + "",
      wzDocNo:
        "#" +
        n.y +
        String(n.m).padStart(2, "0") +
        String((t.employees || []).findIndex((t) => (t.eid || t.name) === e.eid) + 1).padStart(2, "0"),
      wzDate: a + " " + (this.CU_MONTHS[n.m - 1] || "") + " " + n.y + " هـ",
      wzFoot:
        1 === m
          ? "اختر موظفاً للمتابعة"
          : 2 === m
            ? d.length
              ? KIVO.BassamCount(d.length, "صنف|مختار") + " — سيُخصَّص لكل قطعة رقمها التسلسلي"
              : "لم تختر أي صنف بعد"
            : "بالاعتماد تُسجَّل الحركات وتدخل العهدة فوراً",
      wzBackOn: m > 1,
      wzBack: () => this.setState({ cuWiz: { ...e, step: Math.max(1, m - 1) } }),
      wzNextLbl: 3 === m ? "اعتماد وإنشاء السند" : "متابعة",
      wzNextStyle:
        "height:36px;padding:0 18px;border-radius:10px;border:0;color:var(--fg-xffffff);font-size:12.5px;font-weight:400;font-family:'Cairo',sans-serif;background:linear-gradient(135deg,var(--bg-xb99751),var(--bg-a185151810p85));box-shadow:0 4px 12px -2px rgba(185,151,81,0.4);" +
        (h ? "cursor:pointer" : "opacity:.45;cursor:not-allowed"),
      wzNext: async () => {
        if (!h || this._cuBusy) return;
        if (m < 3) return void this.setState({ cuWiz: { ...e, step: m + 1 } });
        const lines = d.map(name => { const item = r.find(item => item.name === name); return { itemId: item.id, holderKey: e.eid, color: item.color, condition: (l[name] && l[name].cond) || "جديد" }; });
        const result = await this._cuRun("issue-batch", { lines }, e);
        if (!result.ok) return;
        if (this.state.cuWiz === e) this.setState({ cuWiz: null, cuRowOpen: e.eid });
        this.bsAck("اعتُمد السند — سُلِّم " + KIVO.BassamCount(result.receipt.n, "صنف") + " إلى " + (e.name || ""), "ok");
      },
      wzCancel: () => this.setState({ cuWiz: null }),
    };
  }
  _cuRowAdd(t, e) {
    const r = this.state,
      n = this.cuCatalog().filter((t) => this.cuAvailable(t.name) > 0),   /* KIVO_265 · مستودع العهد: المتاحُ وحده */
      a = r.cuDd === t,
      i = (r.cuPick || {})[t] || {},
      o = n.some((t) => t.name === i.name) ? i.name : n[0] ? n[0].name : "",
      s = (n.find((t) => t.name === o) || {}).color || "#b99751",
      l = i.cond || "جديد",
      d = o ? this.cuAvailable(o) : 0,
      c = (e) => this.setState({ cuPick: { ...(r.cuPick || {}), [t]: { ...i, ...e } } });
    return {
      canAdd: e,
      ddOpen: a,
      ddChev: "transition:transform .2s;flex-shrink:0;opacity:.6;" + (a ? "transform:rotate(180deg)" : ""),
      ddStyle:
        "height:32px;min-width:186px;display:inline-flex;align-items:center;gap:7px;padding:0 10px;border-radius:9px;background:var(--bg-xffffff);font-size:11.5px;font-weight:400;color:var(--fg-x141414);cursor:pointer;font-family:'Cairo',sans-serif;border:1px solid " +
        (a ? "var(--bd-xb99751)" : "var(--bd-xe1e1e1)"),
      ddToggle: () => this.setState({ cuDd: a ? null : t, cuNewOpen: null, cuMenu: null }),
      pickName: o || "لا قطعَ متاحة",
      pickColor: s,
      opts: n.map((t) => {
        const e = this.cuAvailable(t.name);
        return {
          name: t.name,
          color: t.color || "#b99751",
          avail: e + " متاحة",
          availStyle: "font-size:10px;font-weight:400;color:var(--fg-x94a3b8)",
          style:
            "display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;font-size:11.5px;font-weight:400;cursor:pointer;transition:background .15s;font-family:'Cairo',sans-serif;" +
            (o === t.name ? "background:var(--bg-a185151810p08);color:var(--fg-x9a7e40)" : "color:var(--fg-x141414)"),
          pick: () => {
            (c({ name: t.name, color: t.color || "#b99751" }), this.setState({ cuDd: null }));
          },
        };
      }),
      noOpts: 0 === n.length,
      goStore: () => this.setState({ cuDd: null, empTab: "store", cuStoreF: null }),
      conds: ["جديد", "جيد", "مستعمل"].map((t) => ({
        name: t,
        pick: () => c({ cond: t }),
        style:
          "padding:6px 11px;font-size:10.5px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif;" +
          (l === t
            ? "background:var(--bg-a185151810p1);color:var(--fg-x8a6f35);box-shadow:inset 0 -2px 0 var(--brand-primary)"
            : "background:var(--bg-xffffff);color:var(--fg-x8b9099)"),
      })),
      nextSer: o ? this.cuNextSerial(o) : "—",
      handStyle:
        "height:32px;padding:0 14px;border-radius:9px;border:0;display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:400;font-family:'Cairo',sans-serif;color:var(--text-on-brand);background:linear-gradient(135deg,var(--bg-xb99751),var(--bg-a185151810p85));" +
        (o && d > 0 ? "cursor:pointer" : "opacity:.45;cursor:not-allowed"),
      handOut: async () => {
        if (!o) return void this.bsToast("لا قطعَ متاحةً في المستودع — أضِف الأصناف أو زِد الكمية من تبويب «مستودع العهد»");
        if (d <= 0) return void this.bsToast("لا توجد قطع متاحة من «" + o + "» — كلها بعهدة موظفين");
        const e = await this.cuHandOut(t, o, s, l, this._cuRowDraft(t, { name: o, color: s, cond: l }));
        e.ok && this.bsAck("سُلِّم «" + o + "» " + e.receipt.outputs[0].serial + " — وسُجِّلت حركة تسليم", "ok");
      },
    };
  }
  /* ═══ KIVO_265 · مستودع العهد — قرارُ المالك 2026-10-19 ═══
     تبويبٌ ثالث في «موظفو الإدارة» يجمع إدارةَ الأصناف في مكانٍ واحد: الصنف · الكمية · بادئة الرقم · اللون · الحالة (محسوبة
     من سجلّ الحركات: بعهدة · متاح · تالف · مفقود) · إضافة · تعديل · حذف. كانت الإضافةُ والتعديل مدسوسَين داخل خطوة التسليم.
     الصلاحيات: ورقةُ «عهد الموظفين» نفسُها — مفاتيحُ «إنشاء صنف عهدة» و«تعديل صنف عهدة» و«حذف صنف» الموجودة تحتها في الشجرة
      (add · edit · del)؛ والخادمُ يطبّقها على عمليات العهد العلائقية ويعيد العدادات المعتمدة. */
  _storeVals() {
    const t = this.state,
      r = this.cuCatalog(),
      summary = (t.cuData || {}).summary || {},
      f = t.cuStoreF || null,
      g = t.cuNewF || {},
      b = (g.name || "").trim(),
      sim = (f && "add" === f.mode && b && r.find((e) => e.name.indexOf(b) >= 0 || b.indexOf(e.name) >= 0)) || null,
      canAdd = this.PC("add"),
      canEdit = this.PC("edit"),
      canDel = this.PC("del"),
      write = canAdd || canEdit || canDel,
      pill = (c) =>
        "display:inline-flex;align-items:center;gap:5px;border-radius:9999px;padding:3px 10px;font-size:10.5px;font-weight:600;font-family:'Cairo',sans-serif;white-space:nowrap;color:" +
        c +
        ";background:color-mix(in srgb," +
        c +
        " 10%,transparent);border:1px solid color-mix(in srgb," +
        c +
        " 28%,transparent)",
      ico = (on, tip) =>
        "width:28px;height:28px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;transition:all .15s;" +
        (on ? "cursor:pointer;color:var(--fg-x53565a)" : "opacity:.35;cursor:not-allowed;color:var(--fg-x94a3b8)") +
        (tip ? "" : ""),
      counts = name => { const item = r.find(item => item.name === name) || {}; return { h: item.held || 0, dm: item.dmg || 0, lo: item.lost || 0 }; };
    const rows = r.map((e, i) => {
      const tot = +e.qty || 0,
        k = counts(e.name),
        av = Math.max(0, tot - k.h - k.dm - k.lo),
        mv = e.moveCount || 0,
        st = tot <= 0 ? ["بلا كمية", "#64748b"] : av <= 0 ? ["نفد — كلّه خارج المستودع", "#dc2626"] : av <= Math.max(1, Math.ceil(0.2 * tot)) ? ["شارف على النفاد", "#b45309"] : ["متاح", "#047857"];
      return {
        sn: String(i + 1),
        name: e.name,
        color: e.color || "#b99751",
        prefix: e.prefix || "RD",
        nextSer: this.cuNextSerial(e.name),
        qty: String(tot),
        held: String(k.h),
        avail: String(av),
        availStyle: "font-size:13px;font-weight:700;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';color:" + (av > 0 ? "var(--fg-x047857)" : "var(--fg-xdc2626)"),
        dead: String(k.dm + k.lo),
        deadTip: "تالف " + k.dm + " · مفقود " + k.lo,
        stLabel: st[0],
        stStyle: pill(st[1]),
        canEdit,
        editStyle: ico(canEdit),
        edit: () =>
          canEdit
            ? this.setState({ cuNewF: { cuBase: (this.state.cuData || {}).rev, name: e.name, qty: String(tot), prefix: e.prefix || "RD", color: e.color || "#b99751" }, cuStoreF: { mode: "edit", orig: e.name } })
            : this.permDeny(),
        delOn: canDel && !mv,
        delStyle: ico(canDel && !mv) + (canDel && !mv ? ";color:var(--fg-xdc2626)" : ""),
        delTip: mv ? "له " + KIVO.BassamCount(mv, "حركة") + " — لا يُحذف؛ اجعل كميته صفراً" : "حذف الصنف من المستودع",
        del: () => {
          if (!canDel) return void this.permDeny();
          if (mv) return void this.bsToast("«" + e.name + "» له " + KIVO.BassamCount(mv, "حركة") + " — لا يُحذف صنفٌ له سجلّ؛ اجعل كميته صفراً بدل حذفه", "warn");
          KIVO.bsConfirm({ title: "حذف صنف من المستودع", msg: "سيُحذف «" + e.name + "» (" + KIVO.BassamCount(tot, "قطعة") + ") من مستودع العهد. هل تريد الحذف؟", ok: "حذف الصنف", danger: !0 }).then(async (y) => {
            if (!y) return;
            const z = await this.cuDelItemType(e.name, this._cuDraft({}));
            z.ok ? this.bsAck("حُذف «" + e.name + "» من المستودع", "ok") : z.err && this.bsToast(z.err, "warn");
          });
        },
      };
    });
    const setF = (k) => (ev) => this.setState({ cuNewF: { ...g, [k]: "qty" === k ? ev.target.value.replace(/[^0-9]/g, "") : ev.target.value } });
    return {
      stRows: rows,
      stEmpty: 0 === rows.length,
      stSub: rows.length ? KIVO.BassamCount(summary.catalogTotal || 0, "صنف") + " · " + KIVO.BassamCount(summary.totalQty || 0, "قطعة") + " إجمالاً" : "لا أصناف بعد",
      stKpis: [
        ["الإجمالي", summary.totalQty || 0, "#53565a"],
        ["بعهدة", summary.held || 0, "#b99751"],
        ["متاح", summary.available || 0, "#047857"],
        ["تالف/مفقود", summary.dead || 0, "#dc2626"],
      ].map((x) => ({ label: x[0], val: String(x[1]), style: pill(x[2]) })),
      stCanAdd: canAdd,
      stReadOnly: !write,
      stFormOn: !!f,
      stFormTitle: f && "edit" === f.mode ? "تعديل الصنف «" + f.orig + "»" : "صنف جديد في المستودع",
      stFQtyLbl: f && "edit" === f.mode ? "إجمالي القطع" : "الكمية",
      stFName: g.name || "",
      stFQty: g.qty || "",
      stFPre: g.prefix || "",
      stFSetName: setF("name"),
      stFSetQty: setF("qty"),
      stFSetPre: setF("prefix"),
      stFWarnOn: !!sim,
      stFWarn: sim ? "يوجد صنف مشابه في المستودع: «" + sim.name + "» — تأكّد أنك لا تُنشئ تكراراً." : "",
      stFColors: ["#b99751", "#16a34a", "#4a97cf", "#e5b563", "#b25c8a", "#64748b", "#b23a5a", "#2f8f86"].map((c) => ({
        pick: () => this.setState({ cuNewF: { ...g, color: c } }),
        style: "width:16px;height:16px;border-radius:5px;cursor:pointer;display:inline-block;background:" + c + ";border:2px solid " + ((g.color || "#b99751") === c ? "var(--bd-x25343f)" : "transparent"),
      })),
      stAddOpen: () => (canAdd ? this.setState({ cuNewF: { cuBase: (this.state.cuData || {}).rev, name: "", qty: "10", prefix: "RD", color: "#b99751" }, cuStoreF: { mode: "add" } }) : this.permDeny()),
      stFCancel: () => this.state.cuNewF === g && this.setState({ cuStoreF: null }),
      stFSave: async () => {
        const nm = (g.name || "").trim();
        if (!nm) return void this.bsToast("اكتب اسم الصنف أولاً");
        if (f && "edit" === f.mode) {
          const z = await this.cuEditItemType(f.orig, nm, g.qty, g.prefix, g.color, g);
          if (!z.ok) return;
          return (this.state.cuNewF === g && this.setState({ cuStoreF: null }), void this.bsAck(z.renamed ? "عُدِّل الصنف وصار «" + nm + "» — وحُدِّثت " + KIVO.BassamCount(z.moved, "حركة|سابقة") : "عُدِّل الصنف «" + nm + "»", "ok"));
        }
        const result = await this.cuAddItemType(nm, g.qty, g.prefix, g.color, g);
        if (!result.ok) return;
        if (this.state.cuNewF === g) this.setState({ cuStoreF: null });
        this.bsAck("أُضيف «" + nm + "» إلى المستودع (" + KIVO.BassamCount(+g.qty || 0, "قطعة") + ")", "ok");
      },
      stGoCustody: () => this.setState({ empTab: "custody" }),
    };
  }
  _custodyLogVals(t, e) {
    const r = this.state,
      n = r.cuMoves || { rows: [], total: 0 },
      a = {
        out: { t: "تسليم", bg: "rgba(0,132,80,0.10)", col: "#047857", br: "rgba(0,132,80,0.28)" },
        in: { t: "إرجاع", bg: "rgba(14,165,233,0.10)", col: "#2a76aa", br: "rgba(14,165,233,0.28)" },
        dmg: { t: "تالف", bg: "rgba(220,38,38,0.08)", col: "#b91c1c", br: "rgba(220,38,38,0.22)" },
        lost: { t: "مفقود", bg: "rgba(148,163,184,0.12)", col: "#64748b", br: "rgba(148,163,184,0.3)" },
      },
      i = n.rows || [],
      o = r.cuLogKind || "",
      s = i,
      l = [
        ["", "الكل"],
        ["out", "تسليم"],
        ["in", "إرجاع"],
        ["dmg", "تالف"],
        ["lost", "مفقود"],
      ].map(([t, e]) => ({
        name: e,
        pick: () => { this.setState({ cuLogKind: t, cuMoves: null }); this._cuLoadMoves(false); },
        style:
          "display:inline-flex;align-items:center;padding:5px 12px;border-radius:9999px;font-size:11px;font-weight:400;cursor:pointer;transition:all .15s;font-family:'Cairo',sans-serif;border:1px solid " +
          (o === t
            ? "#b99751;background:var(--bg-a185151810p1);color:var(--fg-x8a6f35)"
            : "#E1E1E1;background:var(--bg-xffffff);color:var(--fg-x64748b)"),
      })),
      d = [
        ["التاريخ", "92px"],
        ["الموظف", "200px"],
        ["الصنف", "170px"],
        ["الرقم التسلسلي", "120px"],
        ["الحركة", "110px"],
        ["ملاحظة", "auto"],
      ];
    return {
      cuLogNext: !!n.next, cuLogMore: () => this._cuLoadMoves(true),
      cuLogOpen: !!r.cuLogOpen,
      cuLogToggle: () => { this.setState({ cuLogOpen: !r.cuLogOpen }); if (!r.cuLogOpen) this._cuLoadMoves(false); },
      cuLogChev: "transition:transform .2s;flex-shrink:0;" + (r.cuLogOpen ? "transform:rotate(180deg)" : ""),
      cuLogCount: KIVO.BassamCount(String(n.total || 0), "حركة") + "",
      cuLogCountStyle:
        "display:inline-flex;align-items:center;margin-right:8px;border-radius:9999px;padding:3px 11px;font-size:10.5px;font-weight:600;font-family:'Cairo',sans-serif;background:var(--bg-a185151810p12);color:var(--fg-x8a6f35);border:1px solid var(--bd-a185151810p3)",
      cuLogSub: "كل عمليات التسليم والإرجاع والتلف خلال " + (this.CU_MONTHS[e - 1] || "") + " " + t + " هـ",
      cuLogChips: l,
      cuLogCols: d.map(([t, e], r) => ({
        name: t,
        style:
          "padding:9px 8px;" +
          ("auto" === e ? "" : "width:" + e + ";") +
          (r < d.length - 1 ? "border-left:1px solid var(--bd-a185151810p1)" : ""),
      })),
      cuLogRows: s.map((t) => {
        const e = a[t.kind] || a.out,
          n = ((t) => {
            const e = (r.employees || []).find((e) => (e.eid || e.name) === t);
            return (e && e.name) || t;
          })(t.eid);
        return {
          date: (t.d || "") + "/" + String(t.m).padStart(2, "0") + "/" + t.y,
          emp: n,
          ini: String(n)
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((t) => t[0])
            .join(""),
          item: t.item || "—",
          ser: t.ser || "—",
          color: t.color || "#b99751",
          kind: e.t,
          note: t.note || "—",
          kStyle:
            "display:inline-flex;align-items:center;border-radius:9999px;padding:3px 11px;font-size:10.5px;font-weight:600;white-space:nowrap;font-family:'Cairo',sans-serif;background:" +
            e.bg +
            ";color:" +
            e.col +
            ";border:1px solid " +
            e.br,
        };
      }),
      cuLogHas: s.length > 0,
      cuLogEmpty: 0 === s.length,
    };
  }
  _custodyTableVals(t, e, r) {
    const n = this.state,
      a = ((n.cuData || {}).summary || {}).openingHeld || 0,
      i = this.cuCountIn(t, e, "out"),
      o = this.cuCountIn(t, e, "in"),
      s = this.cuHeldAt(t, e, !1),
      l = ((n.cuData || {}).summary || {}).held || 0,
      d = (t, e, r) => ({ isCell: !0, isOp: !1, label: t, val: String(e), color: r }),
      c = (t) => ({ isCell: !1, isOp: !0, label: t, val: "", color: "" }),
      p = [
        d("رصيد مُرحَّل", a, "#53565a"),
        c("+"),
        d("تسليمات الشهر", i, "#047857"),
        c("−"),
        d("إرجاعات الشهر", o, "#2a76aa"),
        c("="),
        d("القائم في نهاية الشهر", l, "#b99751"),
      ],
      m = [
        { name: "م", w: "46px", p1: "M8 6h13", p2: "M8 12h13" },
        { name: "الموظف", w: "230px", p1: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", p2: "M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0" },
        { name: "السند", w: "110px", p1: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z", p2: "M14 2v4a2 2 0 0 0 2 2h4" },
        {
          name: "الأصناف",
          w: "110px",
          p1: "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z",
          p2: "m3.3 7 8.7 5 8.7-5",
        },
        { name: "نسبة التسليم", w: "150px", p1: "M3 3v16a2 2 0 0 0 2 2h16", p2: "m19 9-5 5-4-4-3 3" },
        { name: "آخر حركة", w: "110px", p1: "M12 6v6l4 2", p2: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18" },
        { name: "الحالة", w: "120px", p1: "M22 11.08V12a10 10 0 1 1-5.93-9.14", p2: "m9 11 3 3L22 4" },
        { name: "", w: "72px", p1: "M12 20h9", p2: "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" },
      ],
      h = m.map((t, e) => ({
        name: t.name,
        p1: t.p1,
        p2: t.p2,
        style: "padding:10px 8px;width:" + t.w + (e < m.length - 1 ? ";border-left:1px solid var(--bd-a185151810p1)" : ""),
      })),
      u = (n.cuSearch || "").trim(),
      g = ((n.cuData || {}).rows || []).map(row => ({ ...row.snapshot, eid: row.holderKey, _cuRow: row })),
      f = g,
      b = ((n.cuData || {}).summary || {}).maxHeld || 1,
      A = this.cuPast(t, e),
      x = this.cuOrd(t, e) > this.cuOrd(r.y, r.m),
      y = !A && !x && this._emCanWrite(),
      v = f.map((r, a) => {
        const i = r.eid || r.name,
          o = Object.values(s).filter((t) => t.eid === i),
          count = r._cuRow.heldCount,
          l = n.cuRowOpen === i,
          d = b ? Math.round((count / b) * 100) : 0,
          c = d >= 100 ? 12 : d <= 0 ? 0 : Math.max(1, Math.min(11, Math.round((d / 100) * 12))),
          p = [];
        for (let t = 0; t < 12; t++)
          p.push(
            "flex:1 1 0;min-width:0;height:7px;border-radius:9999px;background:" +
              (t < c ? "var(--bg-xb99751)" : "var(--bg-a185151810p12)"),
          );
        const last = r._cuRow.last || {}, m = last.d ? last.d + "/" + String(last.m).padStart(2, "0") + "/" + last.y : "—",
          h = (t, e, r, n) =>
            "display:inline-flex;align-items:center;gap:5px;border-radius:9999px;padding:3px 11px;font-size:10.5px;font-weight:600;white-space:nowrap;background:" +
            t +
            ";color:" +
            e +
            ";border:1px solid " +
            r +
            ";font-family:'Cairo',sans-serif";
        return {
          sn: String(a + 1),
          name: r.name || "—",
          eid: r.empno || "—",
          ini: String(r.name || "؟")
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((t) => t[0])
            .join(""),
          doc: count
            ? "#" +
              t +
              String(e).padStart(2, "0") +
              String((n.employees || []).findIndex((t) => (t.eid || t.name) === i) + 1).padStart(2, "0")
            : "—",
          docColor: count ? "#8A6F35" : "#cbd5e1",
          ...KIVO.BassamCount.pair("cnt", String(count), "صنف"),
          cntColor: count ? "#8A6F35" : "#94a3b8",
          cntStyle:
            "display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:9px;cursor:pointer;transition:all .15s;border:1px solid " +
            (l ? "#b99751;background:var(--bg-a185151810p06)" : "transparent"),
          chev: "transition:transform .18s;flex-shrink:0;" + (l ? "transform:rotate(180deg)" : ""),
          cells: p,
          last: m,
          stLabel: count ? "بعهدته" : "لا عهدة",
          stStyle: count
            ? h("rgba(185,151,81,0.12)", "#8A6F35", "rgba(185,151,81,0.3)")
            : h("rgba(148,163,184,0.1)", "#64748b", "rgba(148,163,184,0.3)"),
          open: l,
          noItems: 0 === count,
          chips: o.map((t) => {
            const e = i + "|" + (t.ser || t.item),
              r = n.cuMenu === e,
              a = (e, r, n) => ({
                name: e,
                run: () => {
                  (this.setState({ cuMenu: null }), this.cuCloseItem(i, t.item, t.ser, r));
                },
                dot: "width:8px;height:8px;border-radius:9999px;flex-shrink:0;background:" + n,
                style:
                  "display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;font-size:11.5px;font-weight:400;cursor:pointer;color:var(--fg-x141414);transition:background .15s;font-family:'Cairo',sans-serif",
              });
            return {
              name: t.item,
              ser: t.ser || "",
              color: t.color || "#b99751",
              open: r,
              style:
                "display:inline-flex;align-items:center;gap:6px;border:1px solid " +
                (r ? "var(--bd-xb99751)" : "var(--bd-xeef0f2)") +
                ";border-radius:9px;padding:5px 9px;font-size:11px;font-weight:400;color:var(--fg-x3f3f3f);background:var(--bg-xffffff);cursor:pointer;transition:border-color .15s",
              menu: () => this.setState({ cuMenu: r ? null : e }),
              acts: y
                ? [a("استرجاع القطعة", "in", "#2a76aa"), a("تسجيل تالفة", "dmg", "#dc2626"), a("تسجيل مفقودة", "lost", "#64748b")]
                : [
                    {
                      name: "الشهر مقفل — للعرض فقط",
                      run: () => this.setState({ cuMenu: null }),
                      dot: "width:8px;height:8px;border-radius:9999px;flex-shrink:0;background:var(--bg-xcbd5e1)",
                      style:
                        "display:flex;align-items:center;gap:8px;padding:8px 10px;font-size:11px;font-weight:400;color:var(--fg-x94a3b8);font-family:'Cairo',sans-serif",
                    },
                  ],
            };
          }),
          togTip: y ? "عرض أصنافه وتسليم صنف جديد" : "عرض الأصناف التي بعهدته",
          ...this._cuRowAdd(i, y),
          toggle: () => this._cuOpenHolder(i, false),
          openCard: () => this._cuOpenHolder(i, true),
          print: () => this.cuPrintDoc(i),
          ...this._rowMenu("cu" + i, [
            {
              name: "سجل عهدة الموظف",
              color: "#0e7490",
              p1: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z",
              p2: "M14 2v4a2 2 0 0 0 2 2h4",
              run: () => this._cuOpenHolder(i, true),
            },
            this.PC("export")
              ? {
                  name: "طباعة سند التسليم",
                  color: "#8A6F35",
                  p1: "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",
                  p2: "M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",
                  run: () => this.cuPrintDoc(i),
                }
              : null,
          ]),
        };
      }),
      w = (n.employees || []).length > 0,
      S = (n.cuData || {}).total || 0,
      k = Math.min(200, n.cuPerPage || 10),
      M = 0 === k ? Math.max(1, S) : k,
      E = Math.max(1, Math.ceil(S / M)),
      z = Math.min(Math.max(1, n.cuPage || 1), E),
      O = (z - 1) * M,
      C = v.map((t, e) => ({ ...t, sn: String(O + e + 1) })),
      F = [];
    {
      const t = [],
        e = (e) => {
          t.includes(e) || t.push(e);
        };
      e(1);
      for (let t = z - 1; t <= z + 1; t++) t >= 1 && t <= E && e(t);
      (e(E), t.sort((t, e) => t - e));
      for (let e = 0; e < t.length; e++) {
        e > 0 && t[e] - t[e - 1] > 1 && F.push({ dots: !0, label: "…" });
        const r = t[e];
        F.push({
          dots: !1,
          label: String(r),
          cur: r === z,
          plain: r !== z,
          style:
            "height:28px;min-width:28px;padding:0 4px;border:0;border-right:1px solid var(--bd-xe1e1e1);font-size:11px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';" +
            (r === z ? "background:var(--bg-xb99751);color:var(--text-on-brand)" : "background:transparent;color:var(--fg-x475569)"),
          click: () => this._cuPage(r),
        });
      }
    }
    const P = (t) =>
      "height:28px;width:28px;border:0;border-right:1px solid var(--bd-xe1e1e1);background:transparent;display:flex;align-items:center;justify-content:center;" +
      (t ? "color:var(--fg-x475569);cursor:pointer" : "color:var(--fg-xcbd5e1);cursor:default");
    return {
      cuLedger: p,
      cuCols: h,
      cuRows: C,
      cuHasRows: S > 0,
      cuNoRows: 0 === S,
      cuShown: String(S),
      cuTotal: String((n.employees || []).length),
      ...KIVO.BassamCount.pair("cuPgTotal", String(S), "سجل", "g"),
      cuPgRange: 0 === S ? "0" : O + 1 + "–" + Math.min(O + M, S),
      cuPgNums: F,
      cuPerPage: String(k),
      cuOnPerPage: (t) => {
        const e = +t.target.value;
        this.setState({ cuPerPage: 0 === e ? 0 : e || 10, cuPage: 1 });
      },
      cuPgFirst: () => this._cuPage(1),
      cuPgPrev: () => this._cuPage(Math.max(1, (n.cuPage || 1) - 1)),
      cuPgNext: () => this._cuPage((n.cuPage || 1) + 1),
      cuPgLast: () => this._cuPage(E),
      cuPgFirstStyle: P(z > 1),
      cuPgPrevStyle: P(z > 1),
      cuPgNextStyle: P(z < E),
      cuPgLastStyle: P(z < E && !!(this._cuCursors || [])[E - 1]),
      ...this._custodyLogVals(t, e),
      ...this._custodyWizVals(),
      ...this._custodyCardVals(t, e, r),
      ...this._custodyStatsVals(t, e),
      cuSearch: n.cuSearch || "",
      cuOnSearch: (t) => this.setState({ cuSearch: t.target.value, cuPage: 1 }),
      cuOpenMonth: !A && !x && this._emCanWrite(),
      cuLockedMonth: A,
      cuNewDoc: () => this.setState({ cuWiz: this._cuDraft({ step: 1, eid: "", name: "", picks: {}, q: "" }) }),
      cuEmptyTitle: w
        ? u
          ? g.length
            ? "لا عهد لمن طابق البحث"
            : "لا نتائج مطابقة للبحث"
          : "لا عهد مسجّلة في هذا الشهر"
        : this._emNoneTitle(),
      empNoneTitle: this._emNoneTitle(),
      cuEmptyDesc: w
        ? u
          ? g.length
            ? "طابق البحثَ " + g.length + " من الموظفين، ولا عهدة قائمة لأيٍّ منهم في هذا الشهر."
            : "جرّب اسماً آخر أو رقماً وظيفياً مختلفاً."
          : "ابدأ بسند تسليم جديد — وسيظهر هنا كل موظف ومعه أصنافه وميزان الشهر."
        : "أضف موظفيك من تبويب «بيانات الموظفين» أولاً — ثم تُسلَّم لهم العهد من هنا.",
    };
  }
