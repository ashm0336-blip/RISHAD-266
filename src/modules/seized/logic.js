class Component extends KIVO.BassamPageKit.base(DCLogic, ["admin+award+daily+dreport+employees+irshad+plan+profile+seized+staff+tasks","daily+dreport+dstats+irshad+plan+seized+staff+tasks","daily+dreport+irshad+plan+seized+staff+tasks","dreport+irshad+planning+profile+seized+staff+tasks","daily+dreport+irshad+plan+profile+seized","daily+plan+seized+staff","admin+profile+seized","award+irshad+seized","irshad+seized+tasks","admin+seized","irshad+seized"]) {
  _businessSpec() {
    return { prefix: "sz", path: "/api/seized", logical: "bassam_seized_v1", resources: ["reports", "catalog", "actions", "locations", "jew", "retro"], rows: "rows",
      views: ["records", "calendar", "catalogs", "dashboard", "context", "retro"], changed: /^bassam_(?:seized(?:_cat|_acts|_locs|_jew|_retro)?|employees|staffing(?:_snap|_locks)?|dreport|rounds|shift_options|dayshift|grants|perm_tpls|perms|auth_users|depts|gdepts|platform)_v[0-9]+$/ };
  }
  _businessReadValid(view, data, options = {}) {
    if (!data.clock || !["y", "m", "d"].every(key => Number.isSafeInteger(data.clock[key]))) return false;
    if (view === "records") return Array.isArray(data.rows) && data.rows.length <= Number(options.limit || 100) && data.rows.every(row => row && typeof row.id === "string" && (row.items === undefined || row.items === null || Array.isArray(row.items))) && this._bcInteger(data.total) && Number.isSafeInteger(data.page) && data.page > 0 && [data.next, data.prev].every(value => value === undefined || value === null || typeof value === "string") && Array.isArray(data.facets?.locations);
    if (view === "catalogs") return data.catalogs && ["catalog", "actions", "locations", "jew"].every(key => typeof data.catalogs[key]?.present === "boolean") &&
      Array.isArray(data.catalogs.catalog.value?.cats) && ["actions", "locations", "jew"].every(key => Array.isArray(data.catalogs[key].value));
    if (view === "calendar") return Array.isArray(data.months) && Array.isArray(data.days) && [...data.months, ...data.days].every(row => this._bcInteger(row.n)) && data.monthTotals && this._bcInteger(data.monthTotals.reports);
    if (view === "dashboard") {
      const dash = data.dashboard, metrics = value => value && ["reports", "employees"].every(key => this._bcInteger(value[key])) &&
        ["qty", "sar"].every(key => typeof value[key] === "number" && Number.isFinite(value[key])) && value.actions && typeof value.actions === "object";
      return dash && Array.isArray(dash.available?.years) && Array.isArray(dash.available.months) && this._bcInteger(dash.available.total) &&
        ["series", "previousSeries", "heat", "categories", "locations", "shifts", "employees", "shiftSeries", "locationSeries"].every(key => Array.isArray(dash[key])) &&
        metrics(dash.totals) && metrics(dash.previous) && Array.isArray(dash.summary?.rows) && metrics(dash.summary.totals);
    }
    return view === "context" && data.context && Array.isArray(data.context.labels) && Array.isArray(data.context.present);
  }
  _businessAckValid(ack, body) {
    const affected = body.op === "catalog-replace" ? [body.kind] : body.op === "jew-rename" ? ["reports", "jew"] : ["reports"];
    return JSON.stringify(ack.affected) === JSON.stringify(affected) && this._businessSpec().resources.every(key =>
      affected.includes(key) ? ack.base[key] === ack.rev && ack.rev > body.base[key] : ack.base[key] === body.base[key]) &&
      (body.op === "catalog-replace" || body.op === "jew-rename" || body.op === "delete-month" || typeof ack.id === "string" && (body.op === "create" || ack.id === body.id));
  }
  _businessConflict() {
    this._szDraftStamp = null; this._szNeedsReview = !!this.state.irEditId;
    for (const stamp of this._szCatalogStamps?.values() || []) if (stamp) stamp.base = null;
  }
  _businessRetain() {
    const editing = Object.entries(this.state).some(([key, value]) => /(?:EditVal|NewVal)$/.test(key) && !!value || key === "szUpdSel" && Object.keys(value || {}).length > 0);
    if (JSON.stringify(this.state.irDraft) === JSON.stringify(this.emptyDraft()) && !this._bcTickets?.size && !editing) return null;
    const local = { ...this.state }; this._businessSpec().views.forEach(view => { delete local[this._bcStateKey(view)]; }); delete local.bcPending;
    return { context: this._szDraftStamp?.context || [...this._szCatalogStamps?.values() || []].find(stamp => stamp?.context)?.context || this._bcContext(), local: this._bcClone(local), draft: this._bcClone(this.state.irDraft), stamp: this._szDraftStamp,
      catalogs: this._szCatalogStamps, uploads: this._szUploads, needsReview: this._szNeedsReview, year: this.state.irYear, month: this.state.irMonth, day: this.state.irDay, editId: this.state.irEditId, message: this.state.bcMessage };
  }
  _businessRestore(saved) {
    if (!saved) return;
    this._szDraftStamp = saved.stamp; this._szCatalogStamps = saved.catalogs; this._szUploads = saved.uploads; this._szNeedsReview = saved.needsReview;
    this.setState({ ...saved.local, irDraft: saved.draft, irYear: saved.year, irMonth: saved.month, irDay: saved.day, irEditId: saved.editId, bcPending: false, bcMessage: saved.message || "مسودتك باقية في هذه الجلسة؛ راجعها قبل الحفظ" });
  }
  componentDidMount() { if (super.componentDidMount) super.componentDidMount(); this._bcMount(); }
  componentWillUnmount() { this._bcDispose(); if (super.componentWillUnmount) super.componentWillUnmount(); }
  _szRecordQuery() {
    const state = this.state;
    return { year: state.irYear, month: state.irMonth, day: state.irDay, q: (state.irLgSearch || "").trim(), loc: state.irLgLoc === "all" ? undefined : state.irLgLoc,
      category: state.irLgCat === "all" ? undefined : state.irLgCat, action: state.irLgAct === "all" ? undefined : state.irLgAct,
      limit: Math.min(200, state.irLedgerPerPage || 200), page: state.irLedgerPerPage === 0 ? 1 : state.irLedgerPage || 1 };
  }
  async _szCatalogWrite(kind, value) {
    if (!this._irCanWrite()) { this.permDeny(); return false; }
    if (!this._bcData("catalogs")) { this.bsToast("انتظر قراءة القوائم من الخادم قبل تعديلها"); return false; }
    const count = kind === "catalog" ? value.cats.length : value.length;
    const result = await this._bcMutate("catalog-replace", { kind, value }, { stamp: this._szCatalogStamps?.get(kind), count });
    if (!result.ok) { this.bsToast(result.message); return false; }
    this._szCatalogStamps = this._szCatalogStamps || new Map();
    this._szCatalogStamps.set(kind, { context: result.context, base: this._bcClone(result.data.base), target: this._szCatalogStamps.get(kind)?.target });
    if (!result.matches) { this.setState({ bcMessage: "أُكّد طلب القائمة السابق؛ راجع تعديلك اللاحق قبل إرساله" }); return false; }
    return true;
  }
  _szStampCatalog(kind, target) {
    this._szCatalogStamps = this._szCatalogStamps || new Map();
    if (target !== undefined || !this._szCatalogStamps.has(kind)) {
      const stamp = this._bcStamp(this._bcData("catalogs")?.base); this._szCatalogStamps.set(kind, stamp ? { ...stamp, target } : null);
    }
  }
  async _szClearDraft() {
    const unresolved = [...this._bcTickets?.values() || []].filter(ticket => ["create", "edit"].includes(ticket.body.op));
    if (unresolved.length) {
      const context = this._bcContext();
      if (!context || typeof KIVO.bsConfirm !== "function") return void this.bsToast("هناك طلب غير مؤكد؛ راجع السجل قبل التخلي عن مسودته", "warn");
      const confirmed = await KIVO.bsConfirm({ title: "مسح المسودة", msg: "قد يكون الطلب السابق محفوظًا في السحابة. راجع السجل أولًا. مسح المسودة يتخلى عن إعادة تأكيد طلبها ويمسح تعديلاتها من هذا الجهاز، ولا يلغي سجلًا محفوظًا في السحابة.", ok: "راجعت السجل — امسح المسودة" });
      if (!confirmed || !this._bcSame(context)) return;
      unresolved.forEach(ticket => this._bcTickets.delete(ticket.intent));
    }
    this._szDraftStamp = null; this._szNeedsReview = false; this.setState({ irDraft: this.emptyDraft(), irSaveErrMsg: "", irEditId: null, bcMessage: "" });
  }
  _szDashboardQuery() {
    const state = this.state, today = this.hToday(), context = this._bcContext();
    const available = this._bcData("dashboard")?.dashboard.available || (this._szAvailable?.context === context?.key ? this._szAvailable.value : { years: [], months: [] });
    const years = available.years.length ? available.years : [today.y], all = state.irDashYear == null || String(state.irDashYear) === "all";
    const year = all || !years.includes(+state.irDashYear) ? years[0] : +state.irDashYear;
    const months = available.months.filter(row => row.y === year).map(row => row.m).sort((a, b) => a - b);
    let month = all ? "all" : state.irDashMonth == null ? "" : String(state.irDashMonth);
    if (!all && month !== "all" && !months.includes(+month)) month = months.length ? String(months[months.length - 1]) : "all";
    const query = { mode: state.irDashMode === "custom" ? "custom" : all ? "all" : "month", year, month,
      bucket: all || month === "all" ? "month" : "day", heatYear: year, sumQ: (state.irDashSumQ || "").trim() };
    if (query.mode === "custom") {
      const parse = value => { const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || ""); return match ? new Date(+match[1], +match[2] - 1, +match[3]).getTime() : null; };
      const current = this.hGreg(today.y, today.m, today.d), end = new Date(current.getFullYear(), current.getMonth(), current.getDate()).getTime();
      let from = parse(state.irDashFrom), to = parse(state.irDashTo); if (from == null) from = end - 29 * 864e5; if (to == null) to = end;
      if (from > to) [from, to] = [to, from];
      const date = value => { const h = this.hParts(new Date(value)); return h.y + "-" + h.m + "-" + h.d; }, length = Math.round((to - from) / 864e5) + 1;
      Object.assign(query, { from: date(from), to: date(to), previousFrom: date(from - length * 864e5), previousTo: date(from - 864e5), heatYear: this.hParts(new Date(to)).y, bucket: length <= 62 ? "day" : "month" });
    }
    return query;
  }
  _szEnsureRetro() {
    const context = this._bcContext(); if (!context) return;
    this._bcReads = this._bcReads || new Map();
    const prior = this._bcReads.get("retro"); if (prior?.context === context.key) return;
    const token = { context: context.key }; this._bcReads.set("retro", token);
    setTimeout(async () => {
      const query = new URLSearchParams({ uid: context.uid, dept: context.dept, res: "seized" });
      const result = await this._bcRequest("/api/retro?" + query, { method: "GET" }, context);
      if (this._bcReads.get("retro") !== token || !this._bcSame(context)) return;
      token.done = true;
      if (!result.ok || result.data.dept !== context.dept || result.data.res !== "seized" || !Array.isArray(result.data.windows) || !this._bcInteger(result.data.now)) {
        token.failed = true; this.setState({ bcMessage: result.message || this._bcFailure("invalid").message }); return;
      }
      this.setState({ szRetro: { ...result.data, _contextKey: context.key, _received: Date.now() } });
    }, 0);
  }
  _szRetroFlags() {
    const state = this._bcData("retro"), months = {}, days = {};
    const now = state ? state.now + Math.max(0, Date.now() - state._received) : 0;
    (state?.windows || []).filter(entry => !entry.closedAt && entry.until > now).forEach(entry => {
      const scope = entry.scope || {}, key = scope.y + "-" + scope.m;
      if (scope.d == null) months[key] = true; else days[key + "-" + scope.d] = true;
    });
    return { months, days };
  }
  async _szRetroToggle(scope) {
    if (!this.PC("approve")) return this.permDeny();
    if (this._szRetroBusy) return;
    const context = this._bcContext(), state = this._bcData("retro");
    if (!context || !state) { this.bsToast("انتظر قراءة نوافذ الاستدراك من الخادم ثم أعد المحاولة"); this._szEnsureRetro(); return; }
    if (!state.may) return this.permDeny();
    this._szRetroBusy = true;
    try {
      const now = state.now + Math.max(0, Date.now() - state._received);
      const active = state.windows.find(item => !item.closedAt && item.until > now && item.scope?.y === scope.y && item.scope?.m === scope.m && (item.scope.d == null ? scope.d == null : item.scope.d === scope.d));
      const body = { dept: context.dept, res: "seized", act: active ? "close" : "open", ...(active ? { id: active.id } : { scope }) };
      if (!active) {
        const srv = KIVO.__BS_SRV;
        if (typeof srv?.askReason !== "function") return void this.bsToast("تعذّر طلب سبب الاستدراك؛ لم تُفتح النافذة");
        body.reason = await new Promise(resolve => srv.askReason("bsdept:" + context.dept + ":bassam_seized_v1", ["sz.rec.retro.open"], resolve));
        if (!body.reason || !this._bcSame(context)) return;
      }
      const result = await this._bcRequest("/api/retro?uid=" + encodeURIComponent(context.uid), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, context);
      this._bcInvalidate();
      if (!result.ok || typeof result.data.window?.id !== "string") this.bsToast(result.message || this._bcFailure("invalid").message);
      this._szEnsureRetro();
    } finally { this._szRetroBusy = false; }
  }
  hGreg(t, e, s) {
    let a = new Date(new Date(2026, 5, 16).getTime() + 864e5 * (29.5306 * (12 * (t - 1448) + (e - 1)) + (s - 1)));
    try {
      for (let r = 0; r < 12; r++) {
        const r = this.hParts(a);
        if (r.y === t && r.m === e && r.d === s) return a;
        const i = 354.367 * (r.y - t) + 29.5306 * (r.m - e) + (r.d - s);
        a = new Date(a.getTime() - 864e5 * (Math.round(i) || (i > 0 ? 1 : -1)));
      }
    } catch (t) {}
    return a;
  }
  hMonthDays(t, e) {
    const s = t + "-" + e;
    if (((this.__hd = this.__hd || {}), this.__hd[s])) return this.__hd[s];
    let a = 30;
    try {
      const s = this.hGreg(t, e, 1),
        r = this.hParts(new Date(s.getTime() + 25056e5));
      a = r.y === t && r.m === e ? 30 : 29;
    } catch (t) {}
    return ((this.__hd[s] = a), a);
  }
  hGregMonthLabel(t, e) {
    const s = t + "-" + e;
    if (((this.__hg = this.__hg || {}), this.__hg[s])) return this.__hg[s];
    let a = "";
    try {
      a = this.hGreg(t, e, 15).toLocaleDateString("ar-u-ca-gregory-nu-latn", { month: "long", year: "numeric" });
    } catch (t) {}
    return ((this.__hg[s] = a), a);
  }
  SZ_VER = "النسخة الثالثة — 2026/07/02";


  SZ_PALETTE = ["#0e7490", "#9c3d6b", "#b45309", "#1e9a66", "#a5566e", "#2f5f8a", "#6e8a3a", "#640f2a"];
  loadIrshad() {
    return { reports: this._bcClone(this._bcData("records")?.rows || []) };
  }
  qtyOf(t) {
    return "sar" === this.unitOf(t.id) ? 1 : parseInt(t.n, 10) || 0;
  }
  sarOf(t) {
    const e = this.unitOf(t.id);
    return "sar" === e ? parseInt(t.n, 10) || 0 : ("pcval" === e && parseInt(t.val, 10)) || 0;
  }
  benOf(t) {
    return (t.items || []).reduce((t, e) => t + this.qtyOf(e), 0);
  }
  actOf(t, e) {
    return (t.items || []).filter((t) => t.act === e).reduce((t, e) => t + this.qtyOf(e), 0);
  }
  sarTot(t) {
    return (t.items || []).reduce((t, e) => t + this.sarOf(e), 0);
  }

  recBy(t) {
    return (t && (t.actor || t.name)) || "—";
  }


  loadCat() {
    const source = this._bcData("catalogs");
    if (!source) return { ver: "", cats: [] };
    return this._bcClone(source.catalogs.catalog.value);
  }
  saveCat(t) {
    return this._szCatalogWrite("catalog", t);
  }
  SZ_OTHER = "أخرى";

  loadKinds() {
    const source = this._bcData("catalogs"); if (!source) return [];
    return source.catalogs.jew.value.slice();
  }
  saveKinds(t) {
    return this._szCatalogWrite("jew", t);
  }
  kindOf(t) {
    return t && t.kind ? (t.kind === this.SZ_OTHER ? (t.kindTxt || "").trim() || this.SZ_OTHER : t.kind) : "";
  }
  loadActs() {
    const source = this._bcData("catalogs"); if (!source) return [];
    return this._bcClone(source.catalogs.actions.value);
  }
  saveActs(t) {
    return this._szCatalogWrite("actions", t);
  }
  loadIrshadLocs() {
    return (this._bcData("catalogs")?.catalogs.locations.value || []).slice();
  }
  saveIrshadLocs(t) {
    return this._szCatalogWrite("locations", t);
  }
  catIndex() {
    const t = this.loadCat(),
      e = {};
    return (
      t.cats.forEach((t, s) =>
        (t.items || []).forEach((a) => {
          e[a.id] = { ...a, cat: t.name, color: t.color || "#94a3b8", def: t.def || "sto", ci: s };
        }),
      ),
      e
    );
  }
  itemOf(t) {
    return ((this.__ix = this.__ix || this.catIndex()), this.__ix[t] || null);
  }
  unitOf(t) {
    const e = this.itemOf(t);
    return (e && e.unit) || "pc";
  }
  actMap() {
    const t = {};
    return (
      this.loadActs().forEach((e) => {
        t[e.k] = e;
      }),
      t
    );
  }
  actName(t) {
    const e = this.actMap()[t];
    return e ? e.name : "—";
  }
  actColor(t) {
    const e = this.actMap()[t];
    return e ? e.color : "#94a3b8";
  }
  emptyDraft() {
    return {
      shift: "",
      eid: "",
      loc: "",
      cat: "",
      item: 0,
      n: "",
      val: "",
      act: "",
      kind: "",
      kindTxt: "",
      photos: [],
      items: [],
      no: "",
      note: "",
    };
  }
  szAutoFill(t, e, s) {
    const a = { ...t };
    if (s) return a;
    const r = (e.myEmp && e.spots[e.myEmp.eid]) || "";
    return (!r || (a.loc && a.loc !== a.locAuto) || a.loc === r || ((a.loc = r), (a.locAuto = r)), a);
  }
  async _szConfirmPhotos(items, context) {
    for (const id of new Set(items.flatMap(item => item.photos || []))) {
      const upload = this._szUploads?.get(id);
      if (!upload || upload.confirmed) continue;
      if (!this._bcSame(context) || typeof KIVO.BassamIDB?.set !== "function") return false;
      try {
        if (!upload.pending) upload.pending = KIVO.BassamIDB.set(id, upload.url);
        const confirmed = await upload.pending;
        if (confirmed !== true || !this._bcSame(context)) throw Error("لم يؤكد الخادم حفظ الصورة");
        upload.confirmed = true;
      } catch (error) {
        this.setState({ irSaveErrMsg: "لم تُحفظ الصورة؛ صورتك ومسودتك باقيتان لإعادة المحاولة", bcMessage: "تعذّر تأكيد الصورة؛ لم يُرسل سجل الضبط" }); return false;
      } finally { upload.pending = null; }
    }
    return true;
  }
  async szSaveRec(t) {
    const state = this.state, editId = state.irEditId, context = this._bcContext();
    if (this._szNeedsReview) { this.setState({ irSaveErrMsg: "تغيّر المحضر على الخادم؛ مسودتك باقية. افتح المحضر المحدث للمراجعة قبل استبداله" }); return false; }
    if (!this.PC(editId ? "edit" : "add")) { this.permDeny(); return false; }
    if (!(t.items || []).length) { this.setState({ irSaveErrMsg: "اختر التصنيف والبند والكمية ثم «إضافة»" }); return false; }
    if (!context) { this.setState({ irSaveErrMsg: this._bcFailure("session").message }); return false; }
    const snapshot = JSON.stringify(state.irDraft), before = this.loadIrshad().reports.find(row => row.id === editId);
    const items = t.items.map((item, index) => ({ id: item.id, n: parseInt(item.n, 10) || 0, val: parseInt(item.val, 10) || 0,
      act: item.act, kind: item.kind || "", kindTxt: item.kindTxt || "", photos: (item.photos || []).slice(),
      ...(editId && Number.isSafeInteger(item.sourceIndex) ? { sourceIndex: item.sourceIndex } : editId && before?.items?.[index]?.id === item.id ? { sourceIndex: index } : {}) }));
    this._szDraftStamp = this._szDraftStamp || this._bcStamp();
    if (!await this._szConfirmPhotos(items, context)) return false;
    const data = { loc: t.loc || "", no: (t.no || "").trim(), note: (t.note || "").trim(), items };
    if (!editId) Object.assign(data, { y: state.irYear, m: state.irMonth, d: state.irDay });
    const result = await this._bcMutate(editId ? "edit" : "create", { ...(editId ? { id: editId } : {}), data }, { stamp: this._szDraftStamp });
    if (!result.ok) { this.setState({ irSaveErrMsg: result.message }); return false; }
    if (!this._bcSame(result.context)) return false;
    if (JSON.stringify(this.state.irDraft) !== snapshot || !result.matches) {
      const draft = this.state.irDraft, sentItems = result.sent.data.items;
      const currentItems = draft.items.map((item, index) => {
        const sourceIndex = Number.isSafeInteger(item.sourceIndex) ? sentItems.findIndex(old => old.sourceIndex === item.sourceIndex && old.id === item.id) : sentItems[index]?.id === item.id ? index : -1;
        const next = { ...item }; if (sourceIndex >= 0) next.sourceIndex = sourceIndex; else delete next.sourceIndex; return next;
      });
      this._szDraftStamp = { context: result.context, base: this._bcClone(result.data.base) };
      this.setState({ irEditId: result.data.id, irDraft: { ...draft, items: currentItems }, irSaveErrMsg: "أُكّد السجل المرسل؛ تعديلاتك اللاحقة باقية ولم تُرسل تلقائيًا" }); return false;
    }
    this._szDraftStamp = null; this.setState({ irSaveErrMsg: "" }); return true;
  }
  szDayCtx() {
    const context = this._bcData("context")?.context;
    const data = context || { rep: false, shifts: [], rows: {}, leaders: {}, spots: {}, labels: [], present: [], myEmp: null, isMgr: false, amLeader: false, locked: true, myRow: null, hasRound: false };
    return { ...data, shiftOf: eid => Object.keys(data.rows || {}).filter(shift => data.rows[shift].some(row => row.eid === eid)).pop() || "" };
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
      irLocPopOpen: !1,
      irLocEditIdx: -1,
      irLocEditVal: "",
      irLocNewVal: "",
      szCatPopOpen: !1,
      szCatEditIdx: -1,
      szCatEditVal: "",
      szCatNewVal: "",
      szItemPopOpen: !1,
      szItemEditIdx: -1,
      szItemEditVal: "",
      szItemNewVal: "",
      szItemQ: "",
      szActPopOpen: !1,
      szActEditIdx: -1,
      szActEditVal: "",
      szActNewVal: "",
      szKindPopOpen: !1,
      szKindEditIdx: -1,
      szKindEditVal: "",
      szKindNewVal: "",
      szImgTick: 0,
      szGal: null,
      szGalIdx: 0,
      szUpd: null,
      szUpdSel: {},
      irLgSearch: "",
      irLgFilesOpen: !1,
      irLgFddOpen: null,
      irLgLoc: "all",
      irLgCat: "all",
      irLgAct: "all",
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
      return !!KIVO.BassamPerm && KIVO.BassamPerm.can("seized", t || "view");
    } catch (t) {
      return !1;
    }
  }
  permDeny() {
    try {
      this.bsToast("صلاحيتك على نظام المضبوطات لا تشمل هذا الإجراء — راجع مدير الإدارة");
    } catch (t) {}
  }
  bsMenusPatch() {
    return { rowMenu: null, irLgFddOpen: null, irLgFilesOpen: !1, irLocPopOpen: !1, szCatPopOpen: !1, szItemPopOpen: !1, szActPopOpen: !1 };
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
      var a = this,
        r = this.bsMenusPatch(),
        i = {};
      (Object.keys(r).forEach(function (t) {
        i[t] = a.state[t];
      }),
        setTimeout(function () {
          try {
            var t = !1,
              e = !1,
              o = a.state;
            if (
              (Object.keys(r).forEach(function (s) {
                (o[s] !== i[s] && (t = !0), o[s] && (e = !0));
              }),
              t || s || !e)
            )
              return;
            a.setState(r);
          } catch (t) {}
        }, 0));
    } catch (t) {}
  }
  /* الفحص العميق 2026-10-21 (R7): رابطُ #/seized/<records|dash> — يُطبَّق متزامناً قبل حساب القيم، ويبقى في العنوان ما يُعرض فعلاً.
     نسخُ solo (داخل مؤشرات الإدارة) لا تشارك */
  _bsHT(t) {
    try {
      if (this.props && this.props.solo) return;
      const h = String(location.hash || ""),
        p = "#/seized";
      if (h.indexOf(p) !== 0) return;
      const w = t ? p + "/" + t : p;
      h !== w && history.replaceState && history.replaceState(null, "", location.pathname + location.search + w);
    } catch(e) { /* لا يمنع العرض — يُتجاوز بصمت */ }
  }
  _bsHR() {
    try {
      if (this.props && this.props.solo) return "";
      const o = KIVO.__BS_OPEN_TAB;
      if (!o || o.page !== "seized") return "";
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
      s = (t) =>
        "position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 16px;border-radius:12px;transition:all .3s;flex-shrink:0;min-width:150px;cursor:pointer;font-family:'Cairo',sans-serif;" +
        (t
          ? "background:var(--bg-xffffff);box-shadow:0 3px 10px -4px rgba(138,111,53,0.45);border:2px solid var(--bd-a185151810p45)"
          : "background:transparent;border:2px solid transparent"),
      a = (t) =>
        "width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;transition:all .3s;" +
        (t ? "background:var(--bg-a185151810p1);color:var(--fg-xb99751)" : "background:var(--bg-a2452452450p9);color:var(--fg-x94a3b8)"),
      r = (t) =>
        "font-size:12px;transition:color .3s;" +
        (t ? "font-weight:600;color:var(--fg-xb99751)" : "font-weight:400;color:var(--fg-x53565a)"),
      i = (t) => {
        try {
          return !KIVO.BassamPerm || !KIVO.BassamPerm.subOn || KIVO.BassamPerm.subOn("seized", t);
        } catch (t) {
          return !0;
        }
      },
      o = !(!this.props || "dash" !== this.props.solo) && i("dash"),
      n = i("records"),
      l = !(!this.props || "dash" !== this.props.solo);
    let h = l ? "dash" : "records" === e.irTab ? "records" : "dash";
    ("dash" === h && !o && n && (h = "records"), "records" === h && !n && o && (h = "dash"));
    q && q !== h && this._bsHT(h);
    const c = "dash" === h && o,
      d = "records" === h && n,
      p = {
        irOnDash: c,
        irOnRecords: d,
        irDashTabOk: o,
        irRecordsTabOk: n,
        irTabBarShow: !l && !(!o || !n),
        irDashTabStyle: s(c),
        irDashTabIcon: a(c),
        irDashTabLbl: r(c),
        irGoDash: () => (this._bsHT("dash"), this.setState({ irTab: "dash" })),   /* العنوانُ يتبع التبويب (R7) */
        irRecordsTabStyle: s(d),
        irRecordsTabIcon: a(d),
        irRecordsTabLbl: r(d),
        irGoRecords: () => (this._bsHT("records"), this.setState({ irTab: "records" })),
        ...t,
      };
    this._bcEnsure("catalogs");
    Object.assign(p, this._bcStatusVals());
    return (d && Object.assign(p, this._recordsCalVals()), c && Object.assign(p, this._dashVals()), p);
  }
  _dashVals() {
    this._bcEnsure("dashboard", this._szDashboardQuery());
    const source = this._bcData("dashboard"), dash = source?.dashboard || {
      available: { years: [], months: [], total: 0, first: null }, totals: { reports: 0, qty: 0, actions: {} }, previous: { reports: 0, qty: 0, actions: {} },
      series: [], previousSeries: [], heat: [], categories: [], locations: [], shifts: [], shiftSeries: [], locationSeries: [], employees: [], summary: { rows: [], totals: { reports: 0, qty: 0, employees: 0, actions: {} } }
    }, totals = dash.totals, previous = dash.previous;
    if (source) this._szAvailable = { context: source._contextKey, value: dash.available };
    const t = this.state,
      e = this.hToday(),
      s = dash.heat,
      a = 864e5,
      r = this.MONTHS,
      i = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
      o = (t) => (KIVO.bsPct ? KIVO.bsPct(t) : String(Math.round(t || 0))),
      n = (t) => Math.round(t || 0).toLocaleString("en-US"),
      l = (t) => n(t).replace(/[0-9]/g, (t) => "٠١٢٣٤٥٦٧٨٩"[+t]),
      h = (t) =>
        (t = Math.round(t || 0)) >= 1e6
          ? (t / 1e6).toFixed(1).replace(/\.0$/, "") + " مليون"
          : t >= 1e4
            ? Math.round(t / 1e3) + " ألف"
            : t >= 1e3
              ? (t / 1e3).toFixed(1).replace(/\.0$/, "") + " ألف"
              : n(t),
      c = (t) => (1 === t ? "يوم واحد" : 2 === t ? "يومين" : t >= 3 && t <= 10 ? t + " أيام" : KIVO.BassamCount(t, "يوم") + "");
    this.__hpc = this.__hpc || {};
    const d = (t) => (this.__hpc[t] || (this.__hpc[t] = this.hParts(new Date(t))), this.__hpc[t]),
      p = (t) => new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime(),
      m = (t) => {
        const e = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t || "");
        return e ? new Date(+e[1], +e[2] - 1, +e[3]).getTime() : null;
      },
      g = (t) => {
        const e = new Date(t),
          s = (t) => (t < 10 ? "0" + t : "" + t);
        return e.getFullYear() + "-" + s(e.getMonth() + 1) + "-" + s(e.getDate());
      },
      u = (t) => t.d + " " + r[t.m - 1] + " " + t.y + " هـ",
      f = this.loadActs(),
      b = key => row => row.actions?.[key] || 0,
      y = row => row.qty || 0,
      x = (t) => 1e4 * t.y + 100 * t.m + t.d,
      D = (t) => 100 * t.y + t.m,
      z = {},
      w = {};
    dash.available.years.forEach(year => { z[year] = 1; });
    dash.available.months.forEach(row => { w[row.y + "-" + row.m] = 1; });
    let k = Object.keys(z)
      .map(Number)
      .sort((t, e) => e - t);
    k.length || (k = [e.y]);
    const O = null == t.irDashYear || "all" === String(t.irDashYear);
    let v = O ? k[0] : +t.irDashYear;
    k.indexOf(v) < 0 && (v = k[0]);
    const E = [];
    for (let t = 1; t <= 12; t++) w[v + "-" + t] && E.push(t);
    let L = O ? "all" : null == t.irDashMonth ? "" : String(t.irDashMonth);
    !O && "all" !== L && E.indexOf(+L) < 0 && (L = E.length ? String(E[E.length - 1]) : "all");
    const P = (t, e) => this.hMonthDays(t, e),
      I = (t, s) => (t > e.y ? 0 : t < e.y || s < e.m ? P(t, s) : s === e.m ? e.d : 0),
      C = "custom" === t.irDashMode ? "custom" : O ? "all" : "month",
      M = p(this.hGreg(e.y, e.m, e.d));
    let A = m(t.irDashFrom),
      T = m(t.irDashTo);
    if ("custom" === C && (null == A && (A = M - 29 * a), null == T && (T = M), A > T)) {
      const t = A;
      ((A = T), (T = t));
    }
    let _ = dash.series,
      F = dash.previousSeries,
      N = [],
      B = !0,
      K = "",
      V = "",
      H = 0,
      R = v;
    if ("all" === C) {
      B = false;
      N = dash.available.months.slice().sort((a, b) => a.y - b.y || a.m - b.m)
        .map(row => ({ k: 100 * row.y + row.m, lab: r[row.m - 1], full: r[row.m - 1] + " " + row.y + " هـ" }));
      K = "كل الفترة";
      const first = dash.available.first;
      if (first) H = Math.round((M - p(this.hGreg(first.y, first.m, first.d))) / a) + 1;
      R = k[0];
    } else if ("custom" === C) {
      const t = d(A),
      e = d(T);
      if (
        (        (H = Math.round((T - A) / a) + 1),
        (B = H <= 62),
        B)
      )
        for (let t = A; t <= T; t += a) {
          const e = d(t);
          N.push({ k: 1e4 * e.y + 100 * e.m + e.d, lab: String(e.d), full: u(e) });
        }
      else {
        const t = {};
        for (let e = A; e <= T; e += a) {
          const s = d(e);
          t[100 * s.y + s.m] = s;
        }
        N = Object.keys(t)
          .map(Number)
          .sort((t, e) => t - e)
          .map((e) => ({ k: e, lab: r[t[e].m - 1], full: r[t[e].m - 1] + " " + t[e].y + " هـ" }));
      }
      K = u(t) + " ← " + u(e);
      const o = A - a,
      n = d(A - H * a),
      l = d(o);
      V = u(n) + " ← " + u(l);
      R = e.y;
    } else if ("all" === L) {
      B = false;
      for (let t = 1; t <= 12; t++) I(v, t) > 0 && N.push({ k: 100 * v + t, lab: r[t - 1], full: r[t - 1] + " " + v + " هـ" });
      ((H = N.reduce((t, e) => t + I(v, e.k % 100), 0)), (K = "كل أشهر " + v + " هـ"));
      const t = v === e.y;
      V = t ? "نفس الفترة من " + (v - 1) + " هـ" : "سنة " + (v - 1) + " هـ";
    } else {
      B = true;
      const t = I(v, +L) || P(v, +L);
      for (let e = 1; e <= t; e++) N.push({ k: 1e4 * v + 100 * +L + e, lab: String(e), full: e + " " + r[+L - 1] + " " + v + " هـ" });
      ((H = t), (K = r[+L - 1] + " " + v + " هـ"));
      let s = v,
        a = +L - 1;
      a < 1 && ((a = 12), (s = v - 1));
      const i = v === e.y && +L === e.m;
      V = i ? "أول " + c(e.d) + " من " + r[a - 1] + " " + s + " هـ" : r[a - 1] + " " + s + " هـ";
    }
    const G = previous.reports > 0 && "all" !== C;
    "all" === C && (V = "");
    const U = (t) => (t < 10 ? "0" + t : "" + t),
      j = (t) => (B ? Math.floor(t / 1e4) + "-" + U(Math.floor(t / 100) % 100) + "-" + U(t % 100) : Math.floor(t / 100) + "-" + U(t % 100)),
      Y = B ? x : D,
      Z = (t, e) => {
        const s = {};
        return (
          t.forEach((t) => {
            const a = Y(t);
            s[a] = (s[a] || 0) + e(t);
          }),
          N.map((t) => s[t.k] || 0)
        );
      },
      Q = (t) => {
        const e = Z(_, t),
          s = e.reduce((t, e) => t + e, 0);
        let a = 0,
          r = 0,
          i = 0,
          o = -1,
          n = -1;
        return (
          e.forEach((t, e) => {
            t > 0 && (i++, (0 === r || t > r) && ((r = t), (o = e)), (0 === a || t < a) && ((a = t), (n = e)));
          }),
          {
            ser: e,
            tot: s,
            min: a,
            max: r,
            avg: i ? s / i : 0,
            act: i,
            gap: e.length - i,
            peakShort: o >= 0 ? N[o].full.replace(/ هـ$/, "") : "—",
            lowShort: n >= 0 ? N[n].full.replace(/ هـ$/, "") : "—",
            peakNum: o >= 0 ? j(N[o].k) : "—",
            lowNum: n >= 0 ? j(N[n].k) : "—",
          }
        );
      },
      q = f
        .slice(0, 4)
        .map((t) => ({ k: t.k, name: t.name, desc: "عدد القطع التي كان إجراؤها: " + t.name, f: b(t.k), color: t.color || "#b99751" })),
      W = Q(y),
      X = q.map((t, e) => ({ m: t, st: Q(t.f), i1: 0 === e, i2: 1 === e, i3: 2 === e, i4: 3 === e })),
      $ = W.tot,
      tt = previous.qty || 0,
      et = B ? "يوم" : "شهر",
      st = (t, e, s, a) => {
        const r = t.length;
        if (!r) return { line: "", area: "" };
        const i = a || Math.max.apply(null, t.concat([1])),
          o = (t) => (1 === r ? e / 2 : e - (t / (r - 1)) * e);
        let n = "";
        return (
          t.forEach((t, e) => {
            n += (e ? "L" : "M") + o(e).toFixed(1) + " " + ((t) => s - (i > 0 ? (t / i) * s : 0))(t).toFixed(1) + " ";
          }),
          { line: n, area: "M" + o(0).toFixed(1) + " " + s + " " + n.replace(/^M/, "L") + "L" + o(r - 1).toFixed(1) + " " + s + " Z" }
        );
      },
      at = st(W.ser, 1e3, 100),
      rt = t.irDashBrk || "total",
      it = this.loadShiftOptsIr(),
      ot = this.loadIrshadLocs(),
      nt = ["#4a97cf", "#d9793a", "#2fa372", "#7e2a52", "#7b8a94", "#b99751"];
    let lt = [];
    "shift" === rt
      ? (lt = it.map((option, index) => ({ name: option.name, color: nt[index % nt.length],
          ser: Z(dash.shiftSeries.find(row => row.name === option.name)?.series || [], y) })).filter(row => row.ser.some(value => value > 0)))
      : "loc" === rt && (lt = ot.slice(0, 6).map((name, index) => ({ name, color: nt[index % nt.length],
          ser: Z(dash.locationSeries.find(row => row.name === name)?.series || [], y) })).filter(row => row.ser.some(value => value > 0)));
    const ht = "total" !== rt && lt.length > 0,
      ct = ht ? N.map((t, e) => lt.reduce((t, s) => t + s.ser[e], 0)) : W.ser;
    let dt = null;
    if (G && !ht && F.length) {
      const t = {};
      F.forEach((e) => {
        const s = Y(e);
        t[s] = (t[s] || 0) + y(e);
      });
      const e = Object.keys(t)
        .map(Number)
        .sort((t, e) => t - e)
        .map((e) => t[e]);
      if (e.length) {
        const t = [];
        for (let s = 0; s < N.length; s++) t.push(null == e[s] ? 0 : e[s]);
        t.some((t) => t > 0) && (dt = t);
      }
    }
    const pt = ((t) => {
        if (!(t > 0)) return 10;
        const e = Math.pow(10, Math.floor(Math.log10(t))),
          s = t / e,
          a = [1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10];
        for (let t = 0; t < a.length; t++) if (s <= a[t]) return a[t] * e;
        return 10 * e;
      })(Math.max.apply(null, [1].concat(ct).concat(dt || []))),
      mt = st(ct, 1e3, 100, pt),
      gt = dt ? st(dt, 1e3, 100, pt) : null,
      ut = [];
    if (ht) {
      const t = N.map(() => 0);
      lt.forEach((e) => {
        const s = e.ser.map((e, s) => t[s] + e),
          a = t.slice(),
          r = N.length,
          i = (t) => (1 === r ? 500 : 1e3 - (t / (r - 1)) * 1e3),
          o = (t) => 100 - (t / pt) * 100;
        let n = "M" + i(0).toFixed(1) + " " + o(s[0]).toFixed(1) + " ";
        for (let t = 1; t < r; t++) n += "L" + i(t).toFixed(1) + " " + o(s[t]).toFixed(1) + " ";
        for (let t = r - 1; t >= 0; t--) n += "L" + i(t).toFixed(1) + " " + o(a[t]).toFixed(1) + " ";
        (ut.push({ d: n + "Z", fill: e.color }), e.ser.forEach((e, s) => (t[s] += e)));
      });
    }
    const ft = [];
    for (let t = 4; t >= 0; t--) {
      const e = (pt * t) / 4,
        s = 100 * (1 - t / 4);
      ft.push({
        lab: n(e),
        lineStyle:
          "position:absolute;right:0;left:0;top:" +
          s.toFixed(2) +
          "%;border-top:1px solid " +
          (0 === t ? "var(--bd-xd9dee4)" : "var(--bd-xeff1f4)"),
        labStyle:
          "position:absolute;left:-52px;top:" +
          s.toFixed(2) +
          "%;transform:translateY(-50%);font-size:10px;font-weight:400;color:var(--fg-x94a3b8);direction:ltr;width:46px;text-align:left",
      });
    }
    const bt = N.length,
      yt = Math.max(1, Math.ceil(bt / 9)),
      St = N.map((t, e) => ({ show: e % yt === 0 || e === bt - 1, lab: t.lab })),
      xt = N.map((t, e) => {
        let s = t.full + "  —  " + KIVO.BassamCount(n(ct[e]), "قطعة") + "";
        return (
          dt && (s += "  ·  السابق: " + n(dt[e])),
          ht &&
            lt.forEach((t) => {
              t.ser[e] && (s += "\n" + t.name + ": " + n(t.ser[e]));
            }),
          { tip: s }
        );
      }),
      Dt = [],
      zt = [];
    let wt = 0;
    try {
      const t = p(this.hGreg(R, 1, 1)),
        e = [];
      let o = 0;
      for (let s = 1; s <= 12; s++) {
        const r = P(R, s),
          i = I(R, s);
        for (let n = 1; n <= r; n++) (n <= i && e.push({ m: s, d: n, ts: t + o * a }), o++);
      }
      if (e.length) {
        const t = {};
        s.filter((t) => t.y === R).forEach((e) => {
          const s = e.m + "-" + e.d;
          t[s] = (t[s] || 0) + y(e);
        });
        const o = Object.keys(t)
          .map((e) => t[e])
          .filter((t) => t > 0)
          .sort((t, e) => t - e);
        wt = o.length;
        const l = (t) => (o.length ? o[Math.min(o.length - 1, Math.floor(o.length * t))] : 1),
          h = [l(0.2), l(0.4), l(0.6), l(0.85)],
          c = ["#EFF1F4", "#F2E7D0", "#E4CFA1", "#D0B173", "#B9974F", "#8A6F35"],
          d = (t) => (t ? (t <= h[0] ? 1 : t <= h[1] ? 2 : t <= h[2] ? 3 : t <= h[3] ? 4 : 5) : 0),
          p = {};
        e.forEach((t) => (p[t.ts] = t));
        const m = e[0].ts,
          g = e[e.length - 1].ts,
          u = m - ((new Date(m).getDay() + 1) % 7) * a,
          f = Math.max(1, Math.floor((g - u) / a / 7) + 1);
        let b = -1,
          S = -9;
        for (let e = 0; e < f; e++) {
          const s = [];
          for (let o = 0; o < 7; o++) {
            const l = u + (7 * e + o) * a,
              h = p[l];
            if (!h) {
              s.push({ style: "width:15px;height:15px;border-radius:3px;background:transparent", tip: "" });
              continue;
            }
            const m = t[h.m + "-" + h.d] || 0,
              g = new Date(l);
            s.push({
              style: "width:15px;height:15px;border-radius:3px;background:" + c[d(m)],
              tip:
                h.d +
                " " +
                r[h.m - 1] +
                " " +
                R +
                " هـ · " +
                this.WEEKDAYS[g.getDay()] +
                " " +
                g.getDate() +
                " " +
                i[g.getMonth()] +
                " — " +
                KIVO.BassamCount(n(m), "قطعة") +
                "",
            });
          }
          Dt.push({ cells: s });
          let o = -1;
          for (let t = 0; t < 7; t++) {
            const s = p[u + (7 * e + t) * a];
            if (s) {
              o = s.m;
              break;
            }
          }
          const l = o > 0 && o !== b && e - S >= 3;
          (l && (S = e), o > 0 && (b = o), zt.push({ show: l, lab: o > 0 ? r[o - 1] : "" }));
        }
      }
    } catch (t) {}
    const kt = ["#EFF1F4", "#F2E7D0", "#E4CFA1", "#D0B173", "#B9974F", "#8A6F35"].map((t) => ({
        style: "width:11px;height:11px;border-radius:3px;display:inline-block;background:" + t,
      })),
      Ot = (t, e) =>
        "display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;border-radius:9999px;padding:2px 6px;" +
        (e
          ? "color:var(--fg-x94a3b8);background:var(--bg-a1481631840p14)"
          : t
            ? "color:var(--fg-x006300);background:var(--bg-a09900p09)"
            : "color:var(--fg-xd03b3b);background:var(--bg-a20859590p09)"),
      vt = (t, e) => {
        if (!G || !e) return { txt: "—", style: Ot(!0, !0) };
        const s = ((t - e) / e) * 100,
          a = Math.abs(s) < 0.5;
        return { txt: (a ? "◆ " : s >= 0 ? "▲ " : "▼ ") + o(Math.abs(s)) + "%", style: Ot(s >= 0, a) };
      };
    const Pt = dash.categories.map(row => ({ name: row.name, v: row.value, c: row.color, other: !!row.other }));
    const It = Pt.reduce((t, e) => t + e.v, 0),
      Ct = Math.max.apply(null, [1].concat(Pt.map((t) => t.v))),
      Mt = Pt.map((t) => ({
        name: t.name,
        val: n(t.v),
        pct: (It ? o((t.v / It) * 100) : "0") + "%",
        dot: "width:9px;height:9px;border-radius:3px;flex-shrink:0;background:" + (t.other ? "var(--bg-xc9cfd6)" : t.c),
        bar:
          "height:100%;border-radius:9999px;width:" +
          ((t.v / Ct) * 100).toFixed(2) +
          "%;background:" +
          (t.other ? "var(--bg-xc9cfd6)" : t.c),
      }));
    const _t = dash.locations.map(row => ({ name: row.name, v: row.value, p: row.previous || 0, other: !!row.other }));
    const Ft = Math.max.apply(null, [1].concat(_t.map((t) => t.v))),
      Nt = _t.map((t) => {
        const e = vt(t.v, t.p);
        return {
          name: t.name,
          val: n(t.v),
          pct: ($ ? o((t.v / $) * 100) : "0") + "%",
          dTxt: e.txt,
          dStyle: e.style,
          dot: "width:9px;height:9px;border-radius:3px;flex-shrink:0;background:" + (t.other ? "var(--bg-xc9cfd6)" : "var(--bg-x8a6f35)"),
          bar:
            "height:100%;border-radius:9999px;width:" +
            ((t.v / Ft) * 100).toFixed(2) +
            "%;background:" +
            (t.other ? "var(--bg-xc9cfd6)" : "var(--bg-x8a6f35)"),
        };
      }),
      Bt = it.map((option, index) => {
        const row = dash.shifts.find(value => value.name === option.name) || {};
        return { ...row, name: option.name, color: nt[index % nt.length], v: row.qty || 0, n: row.reports || 0 };
      }),
      Kt = Bt.reduce((t, e) => t + e.v, 0) || 1,
      Vt = Bt.filter((t) => t.v > 0).map((t) => ({
        style: "height:100%;width:" + ((t.v / Kt) * 100).toFixed(2) + "%;background:" + t.color,
      })),
      Ht = Bt.filter((t) => t.v > 0).map((t) => ({
        name: t.name,
        pct: o((t.v / Kt) * 100) + "%",
        dot: "width:9px;height:9px;border-radius:3px;display:inline-block;background:" + t.color,
      })),
      Rt = Bt.map((t) => ({
        name: t.name,
        val: n(t.v),
        sub: KIVO.BassamCount(t.n, "محضر") + "",
        dot: "width:9px;height:9px;border-radius:3px;flex-shrink:0;background:" + t.color,
      })),
      Gt = [
        ["إجمالي القطع", $, tt],
        ["عدد المحاضر", totals.reports, previous.reports],
      ]
        .concat(X.slice(0, 2).map((t, e) => [t.m.name, t.st.tot, previous.actions?.[t.m.k] || 0]))
        .map((t) => {
          const e = vt(t[1], t[2]);
          return { label: t[0], nums: n(t[2]) + " → " + n(t[1]), txt: e.txt, style: e.style };
        });
    const Qt = dash.employees.map(row => ({ k: row.key, v: row.qty || 0, p: row.previous || 0, n: row.reports || 0, nm: row.name || "—", sh: row.shift || "" })),
      qt = Math.max.apply(null, [1].concat(Qt.map((t) => t.v))),
      Jt = Qt.map((t, e) => {
        const s = vt(t.v, t.p);
        return {
          rank: String(e + 1),
          name: t.nm,
          sub: (t.sh ? t.sh + " · " : "") + KIVO.BassamCount(t.n, "محضر") + "",
          ben: n(t.v),
          dTxt: s.txt,
          dStyle: s.style,
          bar: "height:100%;border-radius:9999px;background:var(--bg-xb99751);width:" + ((t.v / qt) * 100).toFixed(2) + "%",
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
      Wt = Bt.map((t) => {
        const s = t.actions?.[q[0]?.k] || 0, a = t.actions?.[q[1]?.k] || 0,
          r = (t.actions?.[q[2]?.k] || 0) + (t.actions?.[q[3]?.k] || 0);
        return {
          name: t.name,
          dot:
            "width:8px;height:8px;border-radius:3px;display:inline-block;margin-inline-end:7px;vertical-align:middle;background:" + t.color,
          reports: n(t.n),
          emps: n(t.employees || 0),
          ben: n(t.v),
          avg: t.n ? (t.v / t.n).toFixed(1) : "0",
          trans: n(s),
          bro: n(a),
          ref: n(r),
          share: ($ ? o((t.v / $) * 100) : "0") + "%",
          shareBar:
            "display:block;height:100%;border-radius:9999px;background:" +
            t.color +
            ";width:" +
            ($ ? ((t.v / $) * 100).toFixed(2) : 0) +
            "%",
        };
      }),
      Xt = (t.irDashSumQ || "").trim(),
      $t = Wt.slice(),
      te = KIVO.BassamFind.filter(Xt, $t, (t) => [t.name, t.code, t.type]),
      ee = 0 === t.irDashSumPerPage ? 0 : t.irDashSumPerPage || 10,
      se = 0 === ee ? Math.max(1, te.length) : ee,
      ae = Math.max(1, Math.ceil(te.length / se)),
      re = Math.min(Math.max(1, t.irDashSumPage || 1), ae),
      ie = (re - 1) * se,
      oe = te.slice(ie, ie + se),
      ne = [];
    {
      const t = [],
        e = (e) => {
          t.indexOf(e) < 0 && t.push(e);
        };
      e(1);
      for (let t = re - 1; t <= re + 1; t++) t >= 1 && t <= ae && e(t);
      (e(ae), t.sort((t, e) => t - e));
      for (let e = 0; e < t.length; e++) {
        e > 0 && t[e] - t[e - 1] > 1 && ne.push({ dots: !0, label: "…" });
        const s = t[e];
        ne.push({
          dots: !1,
          label: String(s),
          cur: s === re,
          plain: s !== re,
          style:
            "height:28px;min-width:28px;padding:0 4px;border:0;border-right:1px solid var(--bd-xe1e1e1);font-size:11px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';" +
            (s === re ? "background:var(--bg-xb99751);color:var(--text-on-brand)" : "background:transparent;color:var(--fg-x475569)"),
          click: () => this.setState({ irDashSumPage: s }),
        });
      }
    }
    const le = (t) =>
        "height:28px;width:28px;border:0;border-right:1px solid var(--bd-xe1e1e1);background:transparent;display:flex;align-items:center;justify-content:center;" +
        (t ? "color:var(--fg-x475569);cursor:pointer" : "color:var(--fg-xcbd5e1);cursor:default"),
      he = dash.summary.totals,
      de = he.qty || 0,
      me = {
        label: Xt ? "إجمالي المعروض" : "الإجمالي", reports: n(he.reports || 0), emps: n(he.employees || 0), ben: n(de),
        avg: he.reports ? (de / he.reports).toFixed(1) : "0", trans: n(he.actions?.[q[0]?.k] || 0), bro: n(he.actions?.[q[1]?.k] || 0),
        ref: n((he.actions?.[q[2]?.k] || 0) + (he.actions?.[q[3]?.k] || 0)), share: ($ ? o((de / $) * 100) : "0") + "%",
      },
      ge = [{ dot: "#b99751", n: "الإجمالي", v: h($), p: "" }]
        .concat(X.map((t) => ({ dot: t.m.color, n: t.m.name, v: h(t.st.tot), p: $ ? "(" + o((t.st.tot / $) * 100) + "٪)" : "" })))
        .concat([
          { dot: "#7b8a94", n: "المحاضر", v: n(totals.reports), p: "" },
          { dot: "#7b8a94", n: "المتوسط لكل " + et, v: h(W.avg), p: "" },
          { dot: "#7b8a94", n: "أعلى", v: h(W.max), p: W.peakNum },
        ]),
      ue = (t) => ({ dot: "width:7px;height:7px;border-radius:2px;flex-shrink:0;background:" + t.dot, n: t.n, v: t.v, p: t.p }),
      fe = ge.map(ue).concat(ge.map(ue)),
      be = (t) =>
        "border:0;font-family:'Cairo',sans-serif;font-size:11px;font-weight:600;padding:6px 12px;border-radius:8px;cursor:pointer;white-space:nowrap;" +
        (t
          ? "background:var(--bg-xffffff);color:var(--fg-x8a6f35);box-shadow:var(--shadow-card)"
          : "background:transparent;color:var(--fg-x94a3b8)"),
      ye = vt($, tt);
    return {
      irDashYear: O ? "all" : String(v),
      irDashYearOpts: [{ v: "all", lbl: "كل السنوات" }].concat(k.map((t) => ({ v: String(t), lbl: t + " هـ" }))),
      irDashSetYear: (t) =>
        this.setState({ irDashYear: "all" === t.target.value ? "all" : +t.target.value, irDashMonth: null, irDashMode: null }),
      irDashMonth: L,
      irDashMonthOpts: O
        ? [{ v: "all", lbl: "كل الأشهر" }]
        : E.map((t) => ({ v: String(t), lbl: r[t - 1] + " (" + (t < 10 ? "0" + t : t) + ")" })).concat([
            { v: "all", lbl: "كل أشهر السنة" },
          ]),
      irDashSetMonth: (t) => this.setState({ irDashMonth: t.target.value, irDashMode: null }),
      irDashYmBoxStyle:
        "display:flex;align-items:center;gap:7px;border:1px solid " +
        ("custom" === C ? "#E6E9ED" : "rgba(185,151,81,.45)") +
        ";background:" +
        ("custom" === C ? "#F8F9FB" : "rgba(185,151,81,.07)") +
        ";border-radius:12px;padding:4px 11px;flex-shrink:0;opacity:" +
        ("custom" === C ? ".55" : "1"),
      irDashModeOpts: [
        {
          lbl: "نطاق مخصص",
          style: be("custom" === C),
          click: () =>
            this.setState({
              irDashMode: "custom" === C ? null : "custom",
              irDashFrom: t.irDashFrom || g(M - 29 * a),
              irDashTo: t.irDashTo || g(M),
            }),
        },
      ],
      irDashCustomOn: "custom" === C,
      irDashFrom: "custom" === C ? g(A) : "",
      irDashTo: "custom" === C ? g(T) : "",
      irDashSetFrom: (t) => this.setState({ irDashFrom: t.target.value, irDashMode: "custom" }),
      irDashSetTo: (t) => this.setState({ irDashTo: t.target.value, irDashMode: "custom" }),
      irDashRangeHint: "custom" === C ? "= " + K + " · " + c(H) : "",
      irDashPerLbl: K,
      irDashTicker: fe,
      irDashPeriodTxt:
        "الفترة: " +
        K +
        " · " +
        c(H) +
        " · " +
        KIVO.BassamCount(totals.reports, "محضر") +
        "" +
        (G ? " · تُقارَن بـ " + V : "all" === C ? "" : " · لا توجد فترة سابقة للمقارنة"),
      irDashHeroLbl: "إجمالي القطع المضبوطة · " + K,
      irDashHeroNum: l($),
      irDashSparkHas: W.ser.length > 1,
      irDashHeroLine: at.line,
      irDashHeroArea: at.area,
      irDashHiVal: h(W.max),
      irDashHiSub: W.peakNum,
      irDashHiTip: "أعلى قيمة سُجّلت — " + W.peakShort,
      irDashLoVal: h(W.min),
      irDashLoSub: W.lowNum,
      irDashLoTip: "أدنى قيمة سُجّلت — " + W.lowShort,
      irDashAvgVal: h(W.avg),
      irDashAvgSub: B ? c(W.act) : KIVO.BassamCount(W.act, "شهر") + "",
      irDashGapOn: W.gap > 0,
      irDashGapVal: String(W.gap),
      irDashCmpChipOn: G,
      irDashCmpChipTxt: ye.txt,
      irDashCmpChipStyle: ye.style,
      irDashCmpChipPrev: n(tt),
      irDashMets: X.map((t) => ({
        name: t.m.name,
        desc: t.m.desc,
        num: l(t.st.tot),
        pct: "٪" + ($ ? o((t.st.tot / $) * 100) : "0"),
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
      irDashGauges: X.map((t) => {
        const e = t.st,
          s = e.max > e.min ? Math.max(0, Math.min(1, (e.avg - e.min) / (e.max - e.min))) : 0.5,
          a = Math.PI * s,
          r = st(e.ser, 200, 40),
          i = F.reduce((e, s) => e + t.m.f(s), 0),
          d = vt(e.tot, i);
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
          avgSub: B ? c(e.act) : KIVO.BassamCount(e.act, "شهر") + "",
          max: h(e.max),
          maxDate: e.peakNum,
          maxTip: "ذروة " + t.m.name + " — " + e.peakShort,
          share: ($ ? o((e.tot / $) * 100) : "0") + "٪",
          dTxt: d.txt,
          dStyle: d.style,
          dTip: G ? t.m.name + " في " + V + ": " + n(i) : "لا توجد فترة سابقة للمقارنة",
          spark: r.area,
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
      ].map((t) => ({ lbl: t[1], on: rt === t[0], style: be(rt === t[0]), click: () => this.setState({ irDashBrk: t[0] }) })),
      irDashTrendDesc:
        (B ? "تجميع يومي" : "تجميع شهري") + " · " + KIVO.BassamCount(bt, "نقطة") + "" + (dt ? " · مع خط الفترة السابقة" : ""),
      irDashTrendGrid: ft,
      irDashXLabels: St,
      irDashHits: xt,
      irDashPlain: !ht,
      irDashStacked: ht,
      irDashStackPaths: ut,
      irDashLine: mt.line,
      irDashArea: mt.area,
      irDashGhostOn: !!gt,
      irDashGhost: gt ? gt.line : "",
      irDashLegend: ht
        ? lt.map((t) => ({ name: t.name, dot: "width:9px;height:9px;border-radius:3px;display:inline-block;background:" + t.color }))
        : [
            {
              name: "القطع المضبوطة — الفترة الحالية",
              dot: "width:9px;height:9px;border-radius:3px;display:inline-block;background:var(--bg-xb99751)",
            },
          ],
      irDashGhostLbl: V,
      irDashHasData: bt > 0 && $ > 0,
      irDashNoData: !(bt > 0 && $ > 0),
      irDashHeatCols: Dt,
      irDashHeatMonths: zt,
      irDashHeatScale: kt,
      irDashHeatDesc:
        "كل مربع = يوم واحد من سنة " +
        R +
        " هـ · " +
        KIVO.BassamCount(wt, "يوم") +
        " " +
        KIVO.BassamCount.agr(wt, "فيه", "فيهما", "فيها") +
        " نشاط · تعرض السنة كاملة مهما كان النطاق المختار",
      irDashHeatYear: R + " هـ",
      irDashHeatOn: Dt.length > 0,
      irDashHeatOff: 0 === Dt.length,
      irDashLangRows: Mt,
      irDashLangOn: Mt.length > 0,
      irDashLangOff: 0 === Mt.length,
      ...KIVO.BassamCount.pair("irDashLangTot", n(X[0]?.st.tot || 0), "قطعة", "g"),
      irDashLocRows: Nt,
      irDashLocOn: Nt.length > 0,
      irDashLocOff: 0 === Nt.length,
      ...KIVO.BassamCount.pair("irDashLocTot", n($), "قطعة", "g"),
      irDashShareSegs: Vt,
      irDashShiftLegend: Ht,
      irDashShiftRows: Rt,
      irDashCmpOn: G,
      irDashCmpOff: !G,
      irDashCmpRows: Gt,
      irDashPrevLbl: G ? V : "الفترة السابقة",
      irDashTopEmployees: Jt,
      irDashEmpOn: Jt.length > 0,
      irDashEmpOff: 0 === Jt.length,
      irEmptyShow: 0 === dash.available.total,
      irDashSumOpen: !!t.irDashSumOpen,
      irDashSumToggle: () => this.setState({ irDashSumOpen: !this.state.irDashSumOpen }),
      irDashSumChev: "transition:transform .2s;flex-shrink:0;" + (t.irDashSumOpen ? "transform:rotate(180deg)" : ""),
      irDashSumBadge: KIVO.BassamCount($t.length, "وردية") + "",
      irDashSumQ: t.irDashSumQ || "",
      irDashSumSetQ: (t) => this.setState({ irDashSumQ: t.target.value, irDashSumPage: 1 }),
      irDashSumShown: String(te.length),
      irDashSumAll: String($t.length),
      irDashSumRows: oe,
      irDashSumTotal: me,
      irDashMetNames: q.map((t) => t.name),
      irDashMet1: q[0] ? q[0].name : "—",
      irDashMet2: q[1] ? q[1].name : "—",
      irDashMet34:
        q
          .slice(2)
          .map((t) => t.name)
          .join(" + ") || "—",
      irDashMetsLine: q.map((t) => t.name).join(" + "),
      irDashSumHas: te.length > 0,
      irDashSumEmpty: 0 === te.length,
      irDashSumEmptyMsg: Xt ? "لا توجد وردية مطابقة لـ «" + Xt + "»" : "لا توجد بيانات ضمن هذه الفترة",
      ...KIVO.BassamCount.pair("irDashSumPgTotal", String(te.length), "سجل", "g"),
      irDashSumPgRange: 0 === te.length ? "0" : ie + 1 + "–" + Math.min(ie + se, te.length),
      irDashSumPgNums: ne,
      irDashSumPerPage: String(ee),
      irDashSumOnPerPage: (t) => {
        const e = +t.target.value;
        this.setState({ irDashSumPerPage: 0 === e ? 0 : e || 10, irDashSumPage: 1 });
      },
      irDashSumPgFirst: () => this.setState({ irDashSumPage: 1 }),
      irDashSumPgPrev: () => this.setState({ irDashSumPage: Math.max(1, (this.state.irDashSumPage || 1) - 1) }),
      irDashSumPgNext: () => this.setState({ irDashSumPage: Math.min(ae, (this.state.irDashSumPage || 1) + 1) }),
      irDashSumPgLast: () => this.setState({ irDashSumPage: ae }),
      irDashSumPgFirstStyle: le(re > 1),
      irDashSumPgPrevStyle: le(re > 1),
      irDashSumPgNextStyle: le(re < ae),
      irDashSumPgLastStyle: le(re < ae),
    };
  }
  _recordsCalVals() {
    this._bcEnsure("calendar", { year: this.state.irYear, month: this.state.irMonth, day: this.state.irDay });
    this._bcEnsure("records", this._szRecordQuery(), this.state.irLedgerPerPage === 0);
    this._bcEnsure("context", { year: this.state.irYear, month: this.state.irMonth, day: this.state.irDay });
    this._szEnsureRetro();
    const t = this.state,
      e = this.hToday(),
      s = t.irYear,
      a = t.irMonth,
      calendar = this._bcData("calendar"),
      records = this._bcData("records"),
      recordStamp = records ? this._bcStamp(records.base) : null,
      r = this.loadIrshad(),
      n = r.reports || [],
      l = (year, month, day) => year !== s ? 0 : day != null ? month === a ? calendar?.days.find(row => row.d === day)?.n || 0 : 0 : month != null ? calendar?.months.find(row => row.m === month)?.n || 0 : calendar?.yearTotal || 0,
      h = l(s),
      c = 12 * e.y + e.m,
      flags = this._szRetroFlags(),
      d = flags.months,
      p = flags.days,
      m = this.MONTHS.map((t, r) => {
        const i = r + 1,
          o = a === i,
          n = s === e.y && i === e.m,
          h = s + "-" + i,
          p = 12 * s + i < c,
          m = !!d[h],
          g = p && !m,
          u = l(s, i);
        let f =
            "position:relative;width:100%;border-radius:12px;padding:8px;text-align:center;transition:all .2s;box-shadow:var(--shadow-card);cursor:pointer;box-sizing:border-box;font-family:'Cairo',sans-serif;border:1px ",
          b = "#53565a",
          y = "#cbd5e1",
          S = "لا محاضر",
          x = !1,
          D = "",
          z = "";
        const w = "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",
          k = "M14 2v6h6";
        return (
          g
            ? ((f +=
                (o ? "solid #64748b;box-shadow:0 0 0 2px rgba(100,116,139,0.25);" : "solid rgba(100,116,139,0.35);") +
                "background:var(--bg-a1001161390p08)"),
              (b = "#475569"),
              (y = "#475569"),
              (x = !0),
              (S = u ? KIVO.BassamCount(u, "محضر") + "" : "انقضى — مقفل"),
              (D = "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"),
              (z = ""))
            : o
              ? ((f += "solid #b99751;box-shadow:0 0 0 2px rgba(185,151,81,0.3);background:var(--bg-a185151810p06)"),
                (b = "#b99751"),
                u && ((S = KIVO.BassamCount(u, "محضر") + ""), (y = "#b99751"), (x = !0), (D = w), (z = k)))
              : u
                ? ((f += "solid #E1E1E1;background:var(--bg-xffffff)"),
                  (S = KIVO.BassamCount(u, "محضر") + ""),
                  (y = "#b99751"),
                  (x = !0),
                  (D = w),
                  (z = k))
                : (f += "dashed #E1E1E1;background:var(--bg-a2452452450p7);opacity:.9"),
          {
            name: t,
            greg: this.hGregMonthLabel(s, i),
            style: f,
            nameColor: b,
            cntColor: y,
            cntLabel: S,
            cntIcon: x,
            footP1: D,
            footP2: z,
            isCurrent: n,
            tip: g
              ? (u ? KIVO.BassamCount(u, "محضر|مسجّل") + " في " + t + " · " : "") + (this.PC("approve") ? "الشهر انقضى — مقفل · نقرة مزدوجة لفتحه للاستدراك" : "الشهر انقضى — مقفل · فتحه للاستدراك يحتاج صلاحية الاعتماد")
              : p && m
                ? "مفتوح للاستدراك" + (this.PC("approve") ? " · نقرة مزدوجة لإغلاقه مجدداً" : "")
                : u
                  ? KIVO.BassamCount(u, "محضر|مسجّل") + " في " + t
                  : "لا محاضر مسجّلة في " + t,
            click: () =>
              this.setState(
                o
                  ? { irYear: s, irMonth: i, irDay: s === e.y && i === e.m ? e.d : 1 }
                  : { irYear: s, irMonth: i, irDay: s === e.y && i === e.m ? e.d : 1, irOpenMonths: {}, irOpenDays: {}, irLedgerOpen: !1 },
              ),
            dbl: (t) => {
              /* الموجة 1 · IRSZ-4: بلا صلاحية الاعتماد كانت النقرةُ المزدوجة لا تفعل شيئاً بصمت — الآن تشرح السبب */
              return (t.stopPropagation(),
                this.PC("approve")
                  ? g
                    ? this._szRetroToggle({ y: s, m: i })
                    : p && m && this._szRetroToggle({ y: s, m: i })
                  : (g || (p && m)) && this.bsToast("فتحُ الشهر أو اليوم المقفل للاستدراك وإعادةُ قفله تحتاج صلاحية الاعتماد — راجع مدير الإدارة"));
            },
          }
        );
      }),
      g = 12 * s + a,
      u = s + "-" + a,
      f = g < c,
      b = !!d[u],
      y = f && !b,
      S = this.hMonthDays(s, a),
      x = this.hGreg(s, a, 1),
      D = new Date(x.getFullYear(), x.getMonth(), x.getDate(), 12),
      z = [];
    for (let r = 1; r <= S; r++) {
      const i = l(s, a, r),
        o = r === t.irDay,
        n = s === e.y && a === e.m && r === e.d,
        h = s + "-" + a + "-" + r,
        d = f || (g === c && r < e.d),
        m = !!p[h],
        b = y || (d && !m),
        S = !b && d && m;
      let x = "#fff",
        w = "#53565a",
        k = "2px solid #E1E1E1";
      (i
        ? ((x = b ? "#64748b" : "#b99751"), (w = "#fff"), (k = "2px solid transparent"))
        : b && ((x = "rgba(148,163,184,0.12)"), (w = "#94a3b8")),
        o && (k = "2px solid " + (b ? "#64748b" : "#b99751")));
      const O = new Date(D.getTime() + 864e5 * (r - 1));
      let v = "";
      try {
        v = O.toLocaleDateString("ar-u-ca-gregory-nu-latn", { day: "numeric", month: "long", year: "numeric" });
      } catch (t) {}
      z.push({
        num: String(r),
        gnum: String(O.getDate()),
        isToday: n,
        lockClosed: b,
        lockOpen: S,
        sepStyle:
          "display:block;width:9px;height:1px;flex-shrink:0;margin:1px 0;background:" +
          (i ? "var(--bg-a2552552550p5)" : "var(--bg-a1481631840p55)"),
        tip:
          "يوم " +
          r +
          " " +
          this.MONTHS[a - 1] +
          " " +
          s +
          " هـ — الموافق " +
          v +
          " م" +
          (i ? " — " + KIVO.BassamCount(i, "محضر") + "" : " — لا محاضر") +
          (b ? " — انقضى، مقفل · " + (this.PC("approve") ? "نقرة مزدوجة لفتحه" : "فتحه يحتاج صلاحية الاعتماد") : S ? " — مفتوح للاستدراك" + (this.PC("approve") ? " · نقرة مزدوجة لإغلاقه" : "") : ""),
        click: () => this.setState(o ? { irDay: r } : { irDay: r, irOpenDays: {}, irLedgerOpen: !1 }),
        dbl: (t) => {
          return (t.stopPropagation(),
            this.PC("approve")
              ? y
                ? this._szRetroToggle({ y: s, m: a })
                : d && this._szRetroToggle({ y: s, m: a, d: r })
              : (y || d) && this.bsToast("فتحُ الشهر أو اليوم المقفل للاستدراك وإعادةُ قفله تحتاج صلاحية الاعتماد — راجع مدير الإدارة"));
        },
        style:
          "position:relative;height:24px;flex:1 1 auto;min-width:28px;padding:0 3px;border-radius:4px;font-size:8px;font-weight:" +
          (o ? "900" : "700") +
          ";display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;user-select:none;background:" +
          x +
          ";color:" +
          w +
          ";border:" +
          k +
          (o ? ";box-shadow:var(--shadow-card);z-index:10" : "") +
          (n && !o ? ";box-shadow:0 0 0 2px rgba(185,151,81,0.7)" : ""),
      });
    }
    const w = s === e.y && a === e.m,
      k = t.irDay,
      O = this.MONTHS[a - 1],
      v = !!p[s + "-" + a + "-" + k],
      E = f || (g === c && k < e.d),
      L = !y && E && !v,
      P = !!calendar && !!this._bcData("catalogs") && !!this._bcData("context") && !y && !L && this._irCanWrite(),
      I = this.WEEKDAYS[this.hGreg(s, a, k).getDay()],
      C = this.szDayCtx(s, a, k, I),
      M = this.szAutoFill(t.irDraft || this.emptyDraft(), C, !!t.irEditId),
      A = (t) => {
        this._szDraftStamp = this._szDraftStamp || this._bcStamp(calendar?.base);
        const e = { ...(this.state.irDraft || this.emptyDraft()), ...t };
        this.setState({ irDraft: e, irSaveErrMsg: "" });
      },
      T = (t, e) => {
        const s = Math.max(0, (parseInt(t || "0", 10) || 0) + e);
        return String(s);
      },
      _ = (t) => (parseInt(t, 10) || 0).toLocaleString("en-US"),
      F = (t) => String(null == t ? "" : t).replace(/[^0-9]/g, "");
    this.__ix = null;
    const N = this.loadCat(),
      B = this.loadActs(),
      K = (this.actMap(), (V = M.cat), N.cats.find((t) => t.name === V) || null);
    var V;
    const H = this.itemOf(M.item),
      R = (H && H.unit) || "pc",
      G = this.loadIrshad(),
      U = (t) =>
        (G.reports || []).some((e) =>
          (e.items || []).some((e) => {
            const s = this.itemOf(e.id);
            return s && s.cat === t;
          }),
        ),
      j = (t, e, s) => {
        const a = this.itemOf(t.id) || { name: "بند محذوف", cat: "", color: "#94a3b8", id: t.id },
          r = a.unit || "pc",
          i =
            "sar" === r
              ? _(t.n) + " ريال"
              : "case" === r
                ? KIVO.BassamCount(parseInt(t.n, 10) || 0, "حالة") + ""
                : "×" + (parseInt(t.n, 10) || 0),
          o = (t.hist || [])[(t.hist || []).length - 1],
          n = this.kindOf(t);
        return {
          key: String(e),
          cat: a.cat,
          id: String(a.id),
          name: a.name,
          color: a.color,
          qty: i,
          kind: n,
          hasKind: !!n,
          nameK: a.name + (n ? " · " + n : ""),
          hasVal: "pcval" === r && !!parseInt(t.val, 10),
          val: _(t.val) + " ريال",
          actName: this.actName(t.act),
          actColor: this.actColor(t.act),
          updated: !!o,
          updatedAt: o ? o.at : "",
          photos: (t.photos || []).map((t) => ({ url: this.szImgUrl(t), has: !!this.szImgUrl(t) })),
          nPhotos: (t.photos || []).length,
          hasPhotos: (t.photos || []).length > 0,
          editable: !!s,
          remove: () => {
            const t = this.state.irDraft || this.emptyDraft();
            this.setState({ irDraft: { ...t, items: t.items.filter((t, s) => s !== e) } });
          },
          addPhoto: () => {
            ((this._szPhotoTarget = e), this.szOpenFile());
          },
        };
      },
      Y = M.items || [],
      Z =
        (Y.reduce((t, e) => t + this.qtyOf(e), 0),
        Y.reduce((t, e) => t + this.sarOf(e), 0),
        B.map((t) => ({ name: t.name, color: t.color, n: Y.filter((e) => e.act === t.k).reduce((t, e) => t + this.qtyOf(e), 0) })).filter(
          (t) => t.n > 0,
        ),
        ((t, e, s, a, r, i, o, n) => {
          const l = t();
          return {
            rows: l.map((i, h) => {
              const c = this.state[a] === h;
              return {
                editing: c,
                normal: !c,
                canEdit: !0,
                name: i,
                sel: s === i,
                rowStyle:
                  "display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:pointer;font-size:12.5px;font-weight:400;color:var(--fg-x25343f);" +
                  (s === i ? "background:var(--bg-a185151810p08);color:var(--fg-x8a6f35)" : ""),
                selectClick: () => {
                  const t = this.state.irDraft || this.emptyDraft();
                  this.setState({ irDraft: { ...t, ...n(i) }, [o]: !1, [a]: -1, irSaveErrMsg: "" });
                },
                editVal: c ? (null != this.state[r] ? this.state[r] : i) : "",
                setEditVal: (t) => this.setState({ [r]: t.target.value }),
                startEdit: (t) => {
                   this._szStampCatalog("locations", i);
                  (t && t.stopPropagation && t.stopPropagation(), this.setState({ [a]: h, [r]: i }));
                },
                 saveEdit: async () => {
                  const o = (this.state[r] || "").trim();
                   const stamp = this._szCatalogStamps?.get("locations");
                   if (stamp?.target !== undefined && stamp.target !== i) return void this.bsToast("تغيّر الموقع أو موضعه؛ أعد فتحه للمراجعة قبل تعديله");
                  if (!o || (o !== i && l.includes(o))) return void this.setState({ [a]: -1, [r]: "" });
                  const c = t();
                   c[h] = o; if (!await e(c)) return;
                   const updated = this._szCatalogStamps?.get("locations"); if (updated) updated.target = o;
                  const d = this.state.irDraft || this.emptyDraft(),
                    p = s === i ? n(o) : {};
                   this.setState({ irDraft: { ...d, ...p }, ...(this.state[r]?.trim() === o ? { [a]: -1, [r]: "" } : {}) });
                },
                 cancelEdit: () => { this._szCatalogStamps?.delete("locations"); this.setState({ [a]: -1, [r]: "" }); },
                 delClick: async (i) => {
                  i && i.stopPropagation && i.stopPropagation();
                  const o = t();
                  if (o.length <= 1) return;
                  const l = o[h];
                   o.splice(h, 1); if (!await e(o)) return;
                  const c = this.state.irDraft || this.emptyDraft(),
                    d = s === l ? n("") : {};
                  this.setState({ irDraft: { ...c, ...d }, [a]: -1, [r]: "" });
                },
              };
            }),
            empty: 0 === l.length,
            popOpen: !!this.state[o],
            toggle: () => this.setState({ [o]: !this.state[o], [a]: -1 }),
            close: () => this.setState({ [o]: !1, [a]: -1 }),
            newVal: this.state[i] || "",
             setNewVal: (t) => { this._szStampCatalog("locations"); this.setState({ [i]: t.target.value }); },
             addNew: async () => {
              const s = (this.state[i] || "").trim();
              if (s) {
                const a = t();
                 if (!a.includes(s)) { a.push(s); if (!await e(a)) return; }
              }
               if ((this.state[i] || "").trim() === s) this.setState({ [i]: "" });
            },
          };
        })(
          () => this.loadIrshadLocs(),
          (t) => this.saveIrshadLocs(t),
          M.loc,
          "irLocEditIdx",
          "irLocEditVal",
          "irLocNewVal",
          "irLocPopOpen",
          (t) => ({ loc: t }),
        )),
      Q = (t) =>
        "display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:pointer;font-size:12.5px;font-weight:400;color:var(--fg-x25343f);" +
        (t ? "background:var(--bg-a185151810p08);color:var(--fg-x8a6f35)" : ""),
      q = (kind, e, s, a, r, i, o, n, l, h, c, d) =>
        e.map((t, e) => {
          const p = this.state[c] === e,
            m = a(t);
          return {
            editing: p,
            normal: !p,
            name: r(t),
            sub: o ? o(t) : "",
            hasSub: !(!o || !o(t)),
            color: i(t),
            sel: s === m,
            rowStyle: Q(s === m),
            selectClick: () => n(t, e),
            editVal: p ? (null != this.state[d] ? this.state[d] : r(t)) : "",
            setEditVal: (t) => this.setState({ [d]: t.target.value }),
            startEdit: (s) => {
               this._szStampCatalog(kind, a(t));
              (s && s.stopPropagation && s.stopPropagation(), this.setState({ [c]: e, [d]: r(t) }));
            },
             saveEdit: async () => {
              const s = (this.state[d] || "").trim();
               const stamp = this._szCatalogStamps?.get(kind);
               if (stamp?.target !== undefined && stamp.target !== a(t)) return void this.bsToast("تغيّر العنصر أو موضعه؛ أعد فتحه للمراجعة قبل تعديله");
               if (s && s !== r(t) && await l(t, e, s) === false) return;
               const updated = this._szCatalogStamps?.get(kind);
               if (updated && (kind === "jew" || kind === "catalog" && t && typeof t === "object" && !("id" in t))) updated.target = s;
               if ((this.state[d] || "").trim() === s && this.state[c] === e) this.setState({ [c]: -1, [d]: "" });
            },
             cancelEdit: () => { this._szCatalogStamps?.delete(kind); this.setState({ [c]: -1, [d]: "" }); },
             delClick: async (s) => {
               s && s.stopPropagation && s.stopPropagation(); await h(t, e);
            },
          };
        }),
      J = q(
        "catalog",
        N.cats,
        M.cat,
        (t) => t.name,
        (t) => t.name,
        (t) => t.color || "#94a3b8",
        (t) => KIVO.BassamCount((t.items || []).length, "بند") + "",
        (t) => {
          const e = (t.items || [])[0];
          (A({
            cat: t.name,
            item: e ? e.id : 0,
            act: B.some((e) => e.k === t.def) ? t.def : B[0].k,
            n: "",
            val: "",
            kind: "",
            kindTxt: "",
          }),
            this.setState({ szCatPopOpen: !1, szCatEditIdx: -1 }));
        },
        async (t, e, s) => {
          const a = this.loadCat();
          if (a.cats.some((t, a) => a !== e && t.name === s)) return void this.bsToast("يوجد تصنيف بهذا الاسم");
          const r = a.cats[e].name;
          a.cats[e].name = s; if (!await this.saveCat(a)) return false; if (M.cat === r) A({ cat: s }); return true;
        },
        async (t, e) => {
          if (U(t.name)) return void this.bsToast("لا يمكن حذف «" + t.name + "» لأنه مستخدم في محاضر محفوظة — عدّل اسمه أو أبقه");
          const s = this.loadCat();
          if (s.cats.length <= 1) return false;
          s.cats.splice(e, 1); if (!await this.saveCat(s)) return false;
          if (M.cat === t.name) A({ cat: "", item: 0 }); this.setState({ szCatEditIdx: -1 }); return true;
        },
        "szCatEditIdx",
        "szCatEditVal",
      ),
      W = (t.szItemQ || "").trim(),
      X = (t) => !W || KIVO.BassamFind.match(W, [t.name, String(t.id)]),
      $ = (t, e, s) =>
        q(
          "catalog",
          s,
           String(M.item),
           (t) => String(t.id),
          (t) => t.name,
          () => t.color || "#94a3b8",
          (t) => String(t.id),
          (e) => {
            (A({ cat: t.name, item: e.id, act: B.some((e) => e.k === t.def) ? t.def : B[0].k, n: "", val: "", kind: "", kindTxt: "" }),
              this.setState({ szItemPopOpen: !1, szItemEditIdx: -1, szItemQ: "" }));
          },
          async (t, s, a) => {
            const r = this.loadCat(),
              i = r.cats[e].items.find((e) => e.id === t.id);
            if (!i) return false; i.name = a; return await this.saveCat(r);
          },
          async (t, s) => {
            if (((a = t.id), (G.reports || []).some((t) => (t.items || []).some((t) => String(t.id) === String(a)))))
              return void this.bsToast("لا يمكن حذف «" + t.name + "» لأنه مستخدم في محاضر محفوظة — عدّل اسمه أو أبقه");
            var a;
            const r = this.loadCat(),
              i = r.cats[e];
            i.items = i.items.filter((e) => e.id !== t.id);
            if (!await this.saveCat(r)) return false;
            if (String(M.item) === String(t.id)) A({ item: 0 }); this.setState({ szItemEditIdx: -1 }); return true;
          },
          "szItemEditIdx",
          "szItemEditVal",
        );
    let tt = [],
      et = [];
    if (K) {
      const t = N.cats.indexOf(K);
      tt = $(K, t, (K.items || []).filter(X));
    }
    W &&
      N.cats.forEach((t, e) => {
        if (t === K) return;
        const s = (t.items || []).filter(X);
        s.length && et.push({ name: t.name, color: t.color || "#94a3b8", rows: $(t, e, s) });
      });
    const st = q(
        "actions",
        B,
        M.act,
        (t) => t.k,
        (t) => t.name,
        (t) => t.color || "#475569",
        null,
        (t) => {
          (A({ act: t.k }), this.setState({ szActPopOpen: !1, szActEditIdx: -1 }));
        },
        async (t, e, s) => {
          const a = this.loadActs();
          a[e].name = s; return await this.saveActs(a);
        },
        async (t, e) => {
          if (((s = t.k), (G.reports || []).some((t) => (t.items || []).some((t) => t.act === s))))
            return void this.bsToast("لا يمكن حذف «" + t.name + "» لأنه مستخدم في محاضر محفوظة — عدّل اسمه أو أبقه");
          var s;
          const a = this.loadActs();
          if (a.length <= 1) return false; a.splice(e, 1); if (!await this.saveActs(a)) return false;
          if (M.act === t.k) A({ act: a[0].k }); this.setState({ szActEditIdx: -1 }); return true;
        },
        "szActEditIdx",
        "szActEditVal",
      ),
      at = this.loadKinds(),
      rt = q(
        "jew",
        at,
        M.kind,
        (t) => t,
        (t) => t,
        () => "#c9a227",
        null,
        (t) => {
          (A({ kind: t, kindTxt: "" }), this.setState({ szKindPopOpen: !1, szKindEditIdx: -1 }));
        },
        async (t, e, s) => {
          const a = this.loadKinds();
          if (s === this.SZ_OTHER || a.some((t, a) => a !== e && t === s)) return void this.bsToast("يوجد نوع بهذا الاسم");
          const r = a[e], result = await this._bcMutate("jew-rename", { from: r, to: s }, { stamp: this._szCatalogStamps?.get("jew"), count: null });
          if (!result.ok) { this.bsToast(result.message); return false; }
          this._szCatalogStamps?.delete("jew");
          if (!result.matches) return false;
          if (M.kind === r) A({ kind: s }); return true;
        },
        async (t, e) => {
          if (((t) => (G.reports || []).some((e) => (e.items || []).some((e) => e.kind === t)))(t))
            return void this.bsToast("لا يمكن حذف «" + t + "» لأنه مستخدم في محاضر محفوظة — عدّل اسمه أو أبقه");
          const s = this.loadKinds();
          if (s.length <= 1) return false; s.splice(e, 1); if (!await this.saveKinds(s)) return false;
          if (M.kind === t) A({ kind: "" }); this.setState({ szKindEditIdx: -1 }); return true;
        },
        "szKindEditIdx",
        "szKindEditVal",
      ),
      it = "pcval" === R && M.kind === this.SZ_OTHER,
      monthTotals = calendar?.monthTotals || { reports: 0, qty: 0, sar: 0, actions: {} },
      monthCount = monthTotals.reports,
      total = records?.total || 0,
      nt = monthTotals.qty || 0,
      lt = key => monthTotals.actions?.[key] || 0,
      ht = B[0] || { k: "sec", name: "—" },
      ct = B[1] || { k: "des", name: "—" },
      dt = B[2] || { k: "sto", name: "—" },
      pt = monthTotals.sar || 0,
      gt = records?.rows || [],
      ut = (t) => {
        let e = "—";
        try {
          const s = this.hGreg(t.y, t.m, t.d);
          e = s.getDate() + "/" + (s.getMonth() + 1) + "/" + s.getFullYear();
        } catch (t) {}
        let s = "—";
        try {
          if (t.ts) {
            const e = new Date(t.ts);
            let a = e.getHours();
            const r = e.getMinutes(),
              i = a >= 12 ? "م" : "ص";
            ((a %= 12), 0 === a && (a = 12), (s = String(a).padStart(2, "0") + ":" + String(r).padStart(2, "0") + " " + i));
          }
        } catch (t) {}
        return { dayLabel: t.d + "/" + t.m + "/" + t.y, gregLabel: e, timeLabel: s };
      },
      ft = 0 === t.irLedgerPerPage ? 0 : t.irLedgerPerPage || 10,
      bt = 0 === ft ? Math.max(1, total) : ft,
      yt = Math.max(1, Math.ceil(total / bt)),
      St = records?.page || Math.min(Math.max(1, t.irLedgerPage || 1), yt),
      xt = (St - 1) * bt,
      Dt = gt,
      zt = [];
    {
      const t = [],
        e = (e) => {
          t.includes(e) || t.push(e);
        };
      e(1);
      for (let t = St - 1; t <= St + 1; t++) t >= 1 && t <= yt && e(t);
      (e(yt), t.sort((t, e) => t - e));
      for (let e = 0; e < t.length; e++) {
        e > 0 && t[e] - t[e - 1] > 1 && zt.push({ dots: !0, label: "…" });
        const s = t[e];
        zt.push({
          dots: !1,
          label: String(s),
          cur: s === St,
          plain: s !== St,
          style:
            "height:28px;min-width:28px;padding:0 4px;border:0;border-right:1px solid var(--bd-xe1e1e1);font-size:11px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';" +
            (s === St ? "background:var(--bg-xb99751);color:var(--text-on-brand)" : "background:transparent;color:var(--fg-x475569)"),
          click: () => this.setState({ irLedgerPage: s }),
        });
      }
    }
    const wt = (t) =>
        "height:28px;width:28px;border:0;border-right:1px solid var(--bd-xe1e1e1);background:transparent;display:flex;align-items:center;justify-content:center;" +
        (t ? "color:var(--fg-x475569);cursor:pointer" : "color:var(--fg-xcbd5e1);cursor:default"),
      kt =
        "width:100%;height:38px;padding:0 12px;font-size:12.5px;background:var(--bg-a2482502520p8);border:1px solid var(--bd-xe2e8f0);border-radius:11px;outline:none;font-family:'Cairo',sans-serif;color:var(--fg-x141414);box-sizing:border-box",
      Ot = (t) => (t.items || []).map((t, e) => j(t, e, !1)),
      Et = t.szUpd ? n.find((e) => e.id === t.szUpd) : null,
      Lt = Et
        ? (() => {
            const e = t.szUpdSel || {},
              s = (Et.items || []).map((t, s) => {
                const a = this.itemOf(t.id) || { name: "بند محذوف", cat: "", color: "#94a3b8", id: t.id },
                  r = null != e[s] ? e[s] : t.act,
                  i = (t.hist || [])[(t.hist || []).length - 1];
                return {
                  key: String(s),
                  name: a.id + " · " + a.name + (this.kindOf(t) ? " · " + this.kindOf(t) : ""),
                  color: a.color,
                  qty: j(t, s, !1).qty,
                  curAct: r,
                  changed: r !== t.act,
                  hist: i
                    ? "آخر تحديث: " + this.actName(i.from) + " ← " + this.actName(i.to) + " · " + i.at + " · " + i.by
                    : "الإجراء الأصلي عند الضبط",
                  opts: B.map((t) => ({ v: t.k, name: t.name })),
                  selStyle:
                    "height:32px;border:1px solid var(--bd-xe1e1e1);border-radius:8px;padding:0 8px;font-family:'Cairo',sans-serif;font-size:11.5px;font-weight:700;background:var(--bg-xffffff);color:" +
                    this.actColor(r),
                  onSel: (t) => this.setState({ szUpdSel: { ...(this.state.szUpdSel || {}), [s]: t.target.value } }),
                  btnStyle:
                    "height:32px;padding:0 12px;border-radius:9px;border:1px solid var(--bd-xa8853f);background:linear-gradient(180deg,var(--bg-xc5a45c),var(--bg-xb99751));color:var(--text-on-brand);font-family:'Cairo',sans-serif;font-size:11.5px;font-weight:700;" +
                    (r !== t.act ? "cursor:pointer" : "opacity:.45;cursor:default"),
                  apply: async () => {
                    if (r === t.act) return;
                    if (!this.PC("edit")) return void this.permDeny();
                  const result = await this._bcMutate("item-action", { id: Et.id, index: s, act: r }, { stamp: recordStamp });
                  if (!result.ok) return void this.bsToast(result.message);
                  if (!result.matches) return void this.bsToast("أُكّد الإجراء السابق؛ راجع المحضر قبل تغيير الإجراء مجددًا", "warn");
                    const n = { ...(this.state.szUpdSel || {}) };
                    (delete n[s],
                      this.setState({ szUpdSel: n }),
                      this.bsAck("حُدّث إجراء «" + a.name + "» إلى " + this.actName(r) + " — وسُجّل الوقت والمستخدم", "ok"));
                  },
                };
              }),
              a = (Et.items || [])
                .flatMap((t) =>
                  (t.hist || []).map((e) => ({
                    ...e,
                    name: (this.itemOf(t.id) || { name: "—" }).name + (this.kindOf(t) ? " · " + this.kindOf(t) : ""),
                  })),
                )
                .sort((t, e) => (e.t || 0) - (t.t || 0))
                .map((t) => ({
                  at: t.at,
                  by: t.by,
                  txt: t.name + ": " + this.actName(t.from) + " ← " + this.actName(t.to),
                  toColor: this.actColor(t.to),
                })),
              r = ut(Et);
            return {
              szUpdOpen: !0,
              szUpdTitle: "المحضر " + (Et.no || r.dayLabel),
              szUpdSub:
                (Et.loc || "—") +
                " · " +
                this.recBy(Et) +
                " · " +
                r.dayLabel +
                " " +
                r.timeLabel +
                " · " +
                (Et.name || "—") +
                (Et.editedTs ? " · عُدّل " + new Date(Et.editedTs).toLocaleString("ar-u-nu-latn") : ""),
              szUpdRows: s,
              szUpdHist: a,
              szUpdHistHas: a.length > 0,
              szUpdNote: Et.note || "",
              szUpdNoteHas: !!Et.note,
              szUpdClose: () => this.setState({ szUpd: null, szUpdSel: {} }),
              szUpdStop: (t) => t.stopPropagation(),
            };
          })()
        : { szUpdOpen: !1 },
      Pt = t.szGal ? n.find((e) => e.id === t.szGal) : null,
      It = Pt
        ? (() => {
            const e = [];
            (Pt.items || []).forEach((t, s) => {
              const a = this.itemOf(t.id) || { name: "—", color: "#94a3b8", id: t.id };
              (t.photos || []).forEach((r, i) =>
                e.push({
                  iid: r,
                  url: this.szImgUrl(r),
                  name: a.id + " · " + a.name + (this.kindOf(t) ? " · " + this.kindOf(t) : ""),
                  color: a.color,
                  k: i + 1,
                  of: t.photos.length,
                  act: this.actName(t.act),
                  actColor: this.actColor(t.act),
                  qty: j(t, s, !1).qty,
                  ii: s,
                }),
              );
            });
            const s = Math.min(Math.max(0, t.szGalIdx || 0), Math.max(0, e.length - 1)),
              a = e[s] || null,
              r = ut(Pt);
            return {
              szGalOpen: !0,
              szGalTitle: "صور المحضر " + (Pt.no || r.dayLabel),
              szGalSub: (Pt.loc || "—") + " · " + this.recBy(Pt) + " · " + r.dayLabel + " " + r.timeLabel + " · " + (Pt.name || "—"),
              szGalCount: KIVO.BassamCount(e.length, "صورة"),
              szGalHas: !!a,
              szGalUrl: a ? a.url : "",
              szGalUrlHas: !(!a || !a.url),
              szGalCap: a ? a.name + " " + a.qty + " · " + a.act : "",
              szGalCapColor: a ? a.actColor : "#fff",
              szGalThumbs: e.map((t, e) => ({
                url: t.url,
                has: !!t.url,
                name: t.name.replace(/\s*\(.*\)/, "") + " · " + t.k + "/" + t.of,
                style:
                  "display:flex;align-items:center;gap:8px;border:1px solid " +
                  (e === s ? "var(--bd-xb99751)" : "var(--bd-xeceef1)") +
                  ";border-radius:10px;padding:6px;cursor:pointer",
                pick: () => this.setState({ szGalIdx: e }),
              })),
              szGalClose: () => this.setState({ szGal: null, szGalIdx: 0 }),
              szGalStop: (t) => t.stopPropagation(),
              szGalDel: async () => {
                if (!a) return;
                if (!this.PC("del")) return void this.permDeny();
                const result = await this._bcMutate("photo-delete", { id: Pt.id, index: a.ii, image: a.iid }, { stamp: recordStamp });
                if (!result.ok) return void this.bsToast(result.message);
                 if (!result.matches) return void this.bsToast("أُكّد حذف الصورة السابق؛ راجع المحضر قبل حذف صورة أخرى", "warn");
                 this.setState({ szGalIdx: 0 }); this.bsAck("حُذفت الصورة", "ok");
              },
              szGalDownload: () => {
                if (a && a.url)
                  try {
                    const t = document.createElement("a");
                    ((t.href = a.url),
                      (t.download = (Pt.no || "mb") + "-" + a.iid + ".jpg"),
                      document.body.appendChild(t),
                      t.click(),
                      t.remove());
                  } catch (t) {}
              },
            };
          })()
        : { szGalOpen: !1 };
    return {
      irMonths: m,
      irYearLabel: s + " هـ",
      irGregRange: this.hGregYearRange(s),
      irBadgeLabel: KIVO.BassamCount(h, "محضر") + " هذه السنة",
      irBadgeStyle:
        "display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;border-radius:9999px;padding:4px 12px;font-family:'Cairo',sans-serif;border:1px solid " +
        (w
          ? "rgba(185,151,81,0.35);color:var(--fg-x9a7e40);background:var(--bg-a185151810p12)"
          : "rgba(148,163,184,0.35);color:var(--fg-x64748b);background:var(--bg-a1481631840p1)"),
      irPrevYear: () => this.setState({ irYear: s - 1, irOpenMonths: {}, irOpenDays: {}, irLedgerOpen: !1 }),
      irNextYear: () => this.setState({ irYear: s + 1, irOpenMonths: {}, irOpenDays: {}, irLedgerOpen: !1 }),
      irGoCurrent: () => this.setState({ irYear: e.y, irMonth: e.m, irDay: e.d, irOpenMonths: {}, irOpenDays: {}, irLedgerOpen: !1 }),
      irDays: z,
      irSelDateLabel: t.irDay + " " + this.MONTHS[a - 1] + " " + s + " هـ",
      irMonthAutoHint: y,
      irDayLockedHint: L,
      /* IRSZ-4: نصُّ التلميح بحسب الصلاحية — «نقرة مزدوجة لفتحه» لمن يملك الاعتماد وحده */
      ...(() => {
        const AP = this.PC("approve"),
          NO = " · فتحه للاستدراك يحتاج صلاحية الاعتماد — راجع مدير الإدارة";
        return {
          irPmApprove: AP,
          irDayLockedTxt: "اليوم انقضى — مقفل" + (AP ? " · انقر بطاقة اليوم نقرة مزدوجة لفتحه ثم سجّل محضرك" : NO),
          irMonthAutoTxt: "الشهر انقضى — مقفل" + (AP ? " · انقر بطاقة الشهر نقرة مزدوجة لفتحه ثم أضف محضرك" : NO),
          irLegendLockTxt: AP ? "انقضى — مقفل · نقرة مزدوجة لفتحه" : "انقضى — مقفل",
        };
      })(),
      irCanEnter: P && !0,
      irRepBlock: P && !1,
      irRepBlockMsg: "",
      szLocked: !0,
      szUnlocked: !1,
      szStatsOn: !C.locked,
      szGridStyle: "display:grid;gap:14px;grid-template-columns:1fr",
      irLocFreeVal: t.irLocFreeVal || "",
      irLocFreeSet: (t) => this.setState({ irLocFreeVal: t.target.value }),
      irLocFreeUse: () => {
        const t = String(this.state.irLocFreeVal || "").trim();
        if (!t) return;
        const e = this.state.irDraft || this.emptyDraft();
        this.setState({ irDraft: { ...e, loc: t }, irLocFreeVal: "", irLocPopOpen: !1, irSaveErrMsg: "" });
      },
      szMyName: this.irActor(),
      irEntryTitle: (t.irEditId ? "تعديل محضر — يوم " : "محضر مضبوطات — يوم ") + k + " " + O + " " + s + " هـ",
      irSaveBtnTitle: t.irEditId ? "حفظ التعديل" : "حفظ المحضر",
      szAddTitle: t.irEditId ? "حفظ التعديل على السجل" : "إضافة — تُحفظ فوراً في سجل الحركة",
      szAddLbl: t.irEditId ? "حفظ التعديل" : "إضافة",
      szCatVer: N.ver || this.SZ_VER,
      ...KIVO.BassamCount.pair("irKpiCount", String(monthCount), "محضر"),
      irKpiBen: nt.toLocaleString("en-US"),
      irKpiSar: pt.toLocaleString("en-US"),
      irKpiSarHas: pt > 0,
      irKpiA0: lt(ht.k).toLocaleString("en-US"),
      irKpiA1: lt(ct.k).toLocaleString("en-US"),
      irKpiA2: lt(dt.k).toLocaleString("en-US"),
      szA0: ht.name,
      szA1: ct.name,
      szA2: dt.name,
      irInputStyle: kt,
      irInputFocusStyle: "background:var(--bg-xffffff);border-color:var(--bd-a185151810p4);box-shadow:0 0 0 2px rgba(185,151,81,0.2)",
      irNoteStyle: kt + ";flex:1 1 240px;min-width:0;width:auto",
      irLocBtnLabel: M.loc || (C.hasRound ? "— اختر موقعاً من الجولة —" : "— اختر موقعاً —"),
      irLocFromRound: C.hasRound,
      irLocManual: !C.hasRound,
      irLocRows: C.hasRound
        ? C.labels.map((t) => ({
            normal: !0,
            editing: !1,
            name: t,
            sel: M.loc === t,
            fixed: !0,
            rowStyle:
              "display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:pointer;font-size:12.5px;font-weight:400;color:var(--fg-x25343f);" +
              (M.loc === t ? "background:var(--bg-a185151810p08);color:var(--fg-x8a6f35)" : ""),
            selectClick: () => {
              const e = this.state.irDraft || this.emptyDraft();
              this.setState({ irDraft: { ...e, loc: t }, irLocPopOpen: !1, irSaveErrMsg: "" });
            },
          }))
        : Z.rows,
      irLocEmpty: C.hasRound ? !C.labels.length : Z.empty,
      irLocPopOpen: Z.popOpen,
      irLocBtnToggle: Z.toggle,
      irLocClose: Z.close,
      irLocNewVal: Z.newVal,
      irLocNewSet: Z.setNewVal,
      irLocAddNew: Z.addNew,
      szNo: M.no || "",
      szSetNo: (t) => A({ no: t.target.value }),
      szNote: M.note || "",
      szSetNote: (t) => A({ note: t.target.value }),
      szCatLabel: M.cat || "— اختر التصنيف —",
      szCatColor: K ? K.color || "#94a3b8" : "#cbd5e1",
      szCatHint: K
        ? KIVO.BassamCount((K.items || []).length, "بند") +
          " · الإجراء المقترح: " +
          this.actName(B.some((t) => t.k === K.def) ? K.def : B[0].k)
        : "",
      szCatRows: J,
      szCatPopOpen: !!t.szCatPopOpen,
      szCatToggle: () =>
        this.setState({ szCatPopOpen: !t.szCatPopOpen, szCatEditIdx: -1, szItemPopOpen: !1, szActPopOpen: !1, szKindPopOpen: !1 }),
      szCatClose: () => this.setState({ szCatPopOpen: !1, szCatEditIdx: -1 }),
      szCatNewVal: t.szCatNewVal || "",
      szCatNewSet: (t) => { this._szStampCatalog("catalog"); this.setState({ szCatNewVal: t.target.value }); },
      szCatAddNew: async () => {
        const t = (this.state.szCatNewVal || "").trim();
        if (!t) return;
        const e = this.loadCat();
        if (e.cats.some(e => e.name === t)) return void this.bsToast("يوجد تصنيف بهذا الاسم");
        if (!B.length) return void this.bsToast("انتظر قراءة القوائم من الخادم");
        e.cats.push({ name: t, color: this.SZ_PALETTE[e.cats.length % this.SZ_PALETTE.length], def: B[0].k, items: [] });
        if (!await this.saveCat(e)) return;
        if ((this.state.szCatNewVal || "").trim() === t) this.setState({ szCatNewVal: "", szCatPopOpen: false }); A({ cat: t, item: 0, act: B[0].k });
      },
      szItemLabel: H ? H.id + " · " + H.name : K ? "— اختر البند —" : "اختر التصنيف أولاً",
      szItemColor: H ? H.color : "#cbd5e1",
      szItemHint: (H && H.desc) || "",
      szItemRows: tt,
      szItemEmpty: !!K && 0 === tt.length,
      szItemNoCat: !K,
      szItemOthers: et,
      szItemOthersHas: et.length > 0,
      szItemCatName: K ? K.name : "",
      szItemCatColor: K ? K.color || "#94a3b8" : "#cbd5e1",
      szItemPopOpen: !!t.szItemPopOpen,
      szItemToggle: () =>
        this.setState({
          szItemPopOpen: !t.szItemPopOpen,
          szItemEditIdx: -1,
          szItemQ: "",
          szCatPopOpen: !1,
          szActPopOpen: !1,
          szKindPopOpen: !1,
        }),
      szItemClose: () => this.setState({ szItemPopOpen: !1, szItemEditIdx: -1, szItemQ: "" }),
      szItemQ: t.szItemQ || "",
      szItemSetQ: (t) => this.setState({ szItemQ: t.target.value }),
      szItemNewVal: t.szItemNewVal || "",
      szItemNewSet: (t) => { this._szStampCatalog("catalog"); this.setState({ szItemNewVal: t.target.value }); },
      szItemAddNew: async () => {
        const t = (this.state.szItemNewVal || "").trim();
        if (!t || !K) return void (K || this.bsToast("اختر التصنيف أولاً ثم أضف البند فيه"));
        const e = this.loadCat(),
          s = e.cats.find((t) => t.name === K.name);
        if (!s) return;
        const a = { id: Math.max(57, ...e.cats.flatMap((t) => (t.items || []).map((t) => Number(t.id)).filter(Number.isFinite))) + 1, name: t, desc: "", unit: "pc" };
        s.items.push(a); if (!await this.saveCat(e)) return;
        if ((this.state.szItemNewVal || "").trim() === t) this.setState({ szItemNewVal: "", szItemPopOpen: false, szItemQ: "" });
        A({ item: a.id, act: B.some(t => t.k === s.def) ? s.def : B[0]?.k || "" });
      },
      szUnitPc: "pc" === R || "case" === R || "pcval" === R,
      szUnitSar: "sar" === R,
      szUnitVal: "pcval" === R,
      szQtyLabel: "pcval" === R ? "عدد القطع" : "الكمية",
      szQtyHint: "case" === R ? "تُعدّ حالة (أشخاص)" : "قطعة",
      szDraftN: "sar" === R ? (M.n ? _(M.n) : "") : M.n || "",
      szSetN: (t) => A({ n: F(t.target.value) }),
      szNUp: () => A({ n: T(M.n, 1) }),
      szNDown: () => A({ n: T(M.n, -1) }),
      szSarLabel: H && 23 === H.id ? "المبلغ بالريال" : "القيمة بالريال",
      szDraftVal: M.val ? _(M.val) : "",
      szSetVal: (t) => A({ val: F(t.target.value) }),
      szActLabel: this.actName(M.act || (K ? K.def : "")),
      szActColor: this.actColor(M.act || (K ? K.def : "")),
      szActHint: K ? "مقترح للتصنيف: " + this.actName(B.some((t) => t.k === K.def) ? K.def : B[0].k) : "",
      szActRows: st,
      szActPopOpen: !!t.szActPopOpen,
      szActToggle: () =>
        this.setState({ szActPopOpen: !t.szActPopOpen, szActEditIdx: -1, szCatPopOpen: !1, szItemPopOpen: !1, szKindPopOpen: !1 }),
      szActClose: () => this.setState({ szActPopOpen: !1, szActEditIdx: -1 }),
      szActNewVal: t.szActNewVal || "",
      szActNewSet: (t) => { this._szStampCatalog("actions"); this.setState({ szActNewVal: t.target.value }); },
      szActAddNew: async () => {
        const t = (this.state.szActNewVal || "").trim();
        if (!t) return;
        const e = this.loadActs(),
          s = "a" + Date.now().toString(36);
        e.push({ k: s, name: t, color: "#475569" }); if (!await this.saveActs(e)) return;
        if ((this.state.szActNewVal || "").trim() === t) this.setState({ szActNewVal: "", szActPopOpen: false }); A({ act: s });
      },
      szKindLabel: M.kind || "— اختر نوع القطعة —",
      szKindColor: M.kind ? (it ? "#94a3b8" : "#c9a227") : "#cbd5e1",
      szKindHint: it ? "اكتب النوع في الحقل المجاور" : "للمجوهرات والذهب فقط · تُدار من داخل القائمة",
      szKindRows: rt,
      szKindOtherSel: it,
      szKindOtherRowStyle: Q(it),
      szKindPickOther: () => {
        (A({ kind: this.SZ_OTHER }), this.setState({ szKindPopOpen: !1, szKindEditIdx: -1 }));
      },
      szKindPopOpen: !!t.szKindPopOpen,
      szKindToggle: () =>
        this.setState({ szKindPopOpen: !t.szKindPopOpen, szKindEditIdx: -1, szCatPopOpen: !1, szItemPopOpen: !1, szActPopOpen: !1 }),
      szKindClose: () => this.setState({ szKindPopOpen: !1, szKindEditIdx: -1 }),
      szKindNewVal: t.szKindNewVal || "",
      szKindNewSet: (t) => { this._szStampCatalog("jew"); this.setState({ szKindNewVal: t.target.value }); },
      szKindAddNew: async () => {
        const t = (this.state.szKindNewVal || "").trim();
        if (!t) return;
        if (t === this.SZ_OTHER) return void this.bsToast("«أخرى» موجودة دائماً في آخر القائمة");
        const e = this.loadKinds();
        if (e.includes(t)) return void this.bsToast("يوجد نوع بهذا الاسم");
        e.push(t); if (!await this.saveKinds(e)) return;
        if ((this.state.szKindNewVal || "").trim() === t) this.setState({ szKindNewVal: "", szKindPopOpen: false }); A({ kind: t, kindTxt: "" });
      },
      szKindOther: it,
      szKindTxt: M.kindTxt || "",
      szSetKindTxt: (t) => A({ kindTxt: t.target.value }),
      szEntryGrid:
        "display:grid;gap:10px;align-items:start;grid-template-columns:" +
        ("pcval" === R
          ? it
            ? "1fr 1.25fr 0.8fr 0.9fr 0.65fr 0.9fr 1fr"
            : "1.1fr 1.4fr 0.95fr 0.7fr 0.95fr 1fr"
          : "1.1fr 1.5fr 0.75fr 1fr"),
      szPhotoPick: (t) => this.szOnFile(t),
      szTakePhoto: () => {
        ((this._szPhotoTarget = null), this.szOpenFile());
      },
      szPhotoN: (M.photos || []).length ? "(" + M.photos.length + ")" : "",
      szPending: (M.photos || []).map((t) => ({ url: t.url })),
      szPendingHas: (M.photos || []).length > 0,
      szAddItem: async () => {
        const t = this.state.irDraft || this.emptyDraft(),
          e = this.itemOf(t.item);
        if (!e) return void this.setState({ irSaveErrMsg: "اختر التصنيف ثم البند قبل الإضافة" });
        const s = e.unit || "pc",
          a = parseInt(t.n || "0", 10) || 0;
        if (a <= 0) return void this.setState({ irSaveErrMsg: "sar" === s ? "اكتب المبلغ بالريال" : "حدّد الكمية" });
        let r = "",
          i = "";
        if ("pcval" === s) {
          if (((r = t.kind || ""), (i = (t.kindTxt || "").trim()), !r))
            return void this.setState({ irSaveErrMsg: "اختر نوع القطعة (أقراط، أساور، …) أو «أخرى»" });
          if (r === this.SZ_OTHER && !i) return void this.setState({ irSaveErrMsg: "اذكر نوع القطعة في الحقل المجاور لـ «أخرى»" });
          r !== this.SZ_OTHER && (i = "");
        }
        const o = t.act || (B.some((t) => t.k === e.def) ? e.def : B[0].k),
          n = (t.photos || []).map((t) => t.iid);
        (t.photos || []).forEach((t) => {
          ((this._szImg = this._szImg || {}), (this._szImg[t.iid] = t.url));
        });
        const l = this.state.irEditId ? (t.items || []).slice() : [],
          h = {
            id: this.state.irEditId && String(l[0]?.id) === String(e.id) ? l[0].id : e.id,
            n: a,
            val: ("pcval" === s && parseInt(t.val, 10)) || 0,
            act: o,
            kind: r,
            kindTxt: i,
            photos: this.state.irEditId ? ((l[0] || {}).photos || []).concat(n) : n,
            hist: (this.state.irEditId && (l[0] || {}).hist) || [],
             ...(this.state.irEditId && String(l[0]?.id) === String(e.id) && Number.isSafeInteger(l[0]?.sourceIndex) ? { sourceIndex: l[0].sourceIndex } : {}),
          },
          c = this.state.irEditId ? [h].concat(l.slice(1)) : [h];
        await this.szSaveRec({ ...t, items: c }) &&
          this.setState({
            irDraft: { ...this.emptyDraft(), loc: t.loc, locAuto: t.locAuto, cat: t.cat, act: "" },
            irEditId: null,
            irSaveErrMsg: "",
            irLedgerOpen: !1,
            irLgPage: 1,
          });
      },
      irClearDraft: () => this._szClearDraft(),
      irSaveErr: !!t.irSaveErrMsg,
      irSaveErrMsg: t.irSaveErrMsg || "",
      irIsEditing: !!t.irEditId,
      irSaveReport: async () => {
        const t = this.szAutoFill(this.state.irDraft || this.emptyDraft(), C, !!this.state.irEditId);
        await this.szSaveRec(t) && this.setState({ irDraft: this.emptyDraft(), irEditId: null, irSaveErrMsg: "" });
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
      irLgExportCsv: async () => {
        if (!this.PC("export")) return;
        const context = this._bcContext(), catalogBase = this._bcData("catalogs")?.base;
        const result = await this._bcCollect(this._szRecordQuery(), context);
        if (!result.ok) return void this.bsToast(result.message);
        if (!this._bcSame(context) || !this._bcBaseSame(catalogBase, result.data.base) || !this._bcBaseSame(this._bcData("catalogs")?.base, catalogBase)) return void this.bsToast("تغيّرت البيانات أثناء التصدير؛ حدّثها وأعد المحاولة");
        const t = result.data.rows.map((t) => {
            const { dayLabel: e, gregLabel: s, timeLabel: a } = ut(t),
              r = (t.items || []).map((t, e) => j(t, e, !1));
            return [
              e,
              s,
              a,
              this.recBy(t),
              t.no || "—",
              t.loc || "—",
              r.map((t) => t.cat).join("، ") || "—",
              r.map((t) => t.id + " · " + t.nameK).join("، ") || "—",
              r.map((t) => t.qty + (t.hasVal ? " ≈ " + t.val : "")).join("، ") || "—",
              r.map((t) => t.actName).join("، ") || "—",
              String((t.items || []).reduce((t, e) => t + (e.photos || []).length, 0)),
              t.note || "",
            ];
          }),
          e = [
            [
              "التاريخ هـ",
              "الموافق م",
              "وقت الحفظ",
              "المُسجّل",
              "رقم المحضر",
              "موقع الضبط",
              "التصنيف",
              "البند",
              "الكمية",
              "الإجراء",
              "الصور",
              "الملاحظات",
            ],
          ].concat(t);
        try {
          KIVO.BassamXLSX
            ? KIVO.BassamXLSX.download(e, "seized-" + O + "-" + s + ".xlsx")
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
      irLgMonthLabel: O + " " + s + " هـ",
      irLgClearAllItemStyle:
        "display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;font-size:11px;font-weight:400;transition:background .15s;" +
        (monthCount > 0 ? "cursor:pointer;color:var(--fg-x141414)" : "cursor:not-allowed;color:var(--fg-xcbd5e1);opacity:.6"),
      irLgClearAllAsk: () => {
        this.PC("del") ? 0 !== monthCount && this.setState({ irLgFilesOpen: !1, irLgClearAllConfirm: !0 }) : this.permDeny();
      },
      irLgClearAllOpen: !!t.irLgClearAllConfirm,
      irLgClearAllStop: (t) => t.stopPropagation(),
      irLgClearAllCancel: () => this.setState({ irLgClearAllConfirm: !1 }),
      irLgClearAllMsg:
        "سيتم حذف جميع محاضر " +
        O +
        " " +
        s +
        " هـ نهائياً (" +
        KIVO.BassamCount(monthCount, "محضر|مسجّل") +
        ") مع " +
        KIVO.BassamCount.agr(monthCount, "صوره", "صورهما", "صورها") +
        ".",
      irLgClearAllDo: async () => {
        if (!this.PC("del") || !calendar) return void this.permDeny();
        const result = await this._bcMutate("delete-month", { year: s, month: a, day: k }, { stamp: this._bcStamp(calendar.base), count: monthCount });
        if (!result.ok) return void this.bsToast(result.message);
        if (!result.matches) return void this.bsToast("أُكّد الحذف السابق؛ راجع الفترة الحالية قبل تنفيذ حذف آخر", "warn");
        this.setState({ irLgClearAllConfirm: false, irLedgerPage: 1 });
        this.bsAck("تم حذف " + KIVO.BassamCount(result.data.n, "محضر", "g") + " من " + O + " " + s + " هـ.", "ok");
      },
      ...(() => {
        const e = (e, s, a, r) => {
          const i = t[s],
            o = t.irLgFddOpen === e,
            n = r.find((t) => t.v === i),
            l = {};
          return (
            (l[e + "Open"] = o),
            (l[e + "Toggle"] = () => this.setState((t) => ({ irLgFddOpen: t.irLgFddOpen === e ? null : e }))),
            (l[e + "Label"] = "all" === i ? a : n ? n.name : i),
            (l[e + "Chev"] = "transition:transform .2s;flex-shrink:0;opacity:.5;" + (o ? "transform:rotate(180deg)" : "")),
            (l[e + "BtnStyle"] =
              "height:32px;min-width:100px;font-size:11px;border-radius:8px;border:1px " +
              ("all" === i
                ? "dashed #cbd5e1;color:var(--fg-x475569)"
                : "solid rgba(185,151,81,0.5);color:var(--fg-x9a7e40);font-weight:400") +
              ";background:var(--bg-xffffff);padding:0 10px;cursor:pointer;font-family:'Cairo',sans-serif;display:inline-flex;align-items:center;justify-content:space-between;gap:6px" +
              (o ? ";box-shadow:0 0 0 2px rgba(185,151,81,0.15)" : "")),
            (l[e + "Opts"] = r.map((t) => ({
              name: t.name,
              selected: i === t.v,
              pick: () => this.setState({ [s]: t.v, irLgFddOpen: null, irLedgerPage: 1 }),
              style:
                "display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;font-size:11px;cursor:pointer;transition:background .15s;" +
                (i === t.v ? "background:var(--bg-a185151810p08);color:var(--fg-x9a7e40);font-weight:400" : "color:var(--fg-x141414)"),
            }))),
            l
          );
        };
        return {
          ...e(
            "irLgFl",
            "irLgLoc",
            "كل المواقع",
            [{ v: "all", name: "كل المواقع" }].concat(
              (records?.facets?.locations || [])
                .filter((t, e, s) => t && s.indexOf(t) === e)
                .map((t) => ({ v: t, name: t })),
            ),
          ),
          ...e(
            "irLgFc",
            "irLgCat",
            "كل التصنيفات",
            [{ v: "all", name: "كل التصنيفات" }].concat(N.cats.map((t) => ({ v: t.name, name: t.name }))),
          ),
          ...e("irLgFa", "irLgAct", "كل الإجراءات", [{ v: "all", name: "كل الإجراءات" }].concat(B.map((t) => ({ v: t.k, name: t.name })))),
        };
      })(),
      irLgShownCount: String(total),
      irLgTotalCount: String(monthCount),
      irLedgerCount: KIVO.BassamCount(String(monthCount), "محضر") + "",
      irLedgerSub: "كل محاضر المضبوطات المسجّلة خلال " + O + " " + s + " هـ",
      irLedgerHas: gt.length > 0,
      irLedgerEmpty: 0 === gt.length,
      irLedgerEmptyMsg: !records ? "انتظر قراءة المحاضر من الخادم" : 0 === monthCount ? "لا محاضر مسجّلة في هذا الشهر بعد" : "لا نتائج مطابقة للبحث/الفلترة الحالية",
      irLedgerRows: Dt.map((t) => {
        const { dayLabel: e, gregLabel: s, timeLabel: a } = ut(t),
          r = (t.items || []).reduce((t, e) => t + (e.photos || []).length, 0);
        return {
          dayLabel: e,
          gregLabel: s,
          timeLabel: a,
          actor: this.recBy(t),
          loc: t.loc || "—",
          noTxt: t.no || "—",
          noteTxt: t.note || "—",
          no: t.no || "",
          noHas: !!t.no,
          items: Ot(t),
          noItems: 0 === (t.items || []).length,
          nPhotos: String(r),
          hasPhotos: r > 0,
          noPhotos: 0 === r,
          openGal: () => this.setState({ szGal: t.id, szGalIdx: 0 }),
          a0: String(this.actOf(t, ht.k)),
          a1: String(this.actOf(t, ct.k)),
          a2: String(this.actOf(t, dt.k)),
          ben: String(this.benOf(t)),
          sar: this.sarTot(t) ? this.sarTot(t).toLocaleString("en-US") + " ريال" : "",
          sarHas: this.sarTot(t) > 0,
          edited: !!t.editedTs,
          ...this._rowMenu("sz" + t.id, [
            this.PC("edit")
              ? {
                  name: "تحديث إجراء بند (مثلاً: محفوظ بالمستودع ← أُتلف)",
                  color: "#2f8f86",
                  p1: "M21 12a9 9 0 1 1-3-6.7",
                  p2: "M21 3v6h-6",
                  run: () => this.setState({ szUpd: t.id, szUpdSel: {} }),
                }
              : null,
            r > 0
              ? {
                  name: "صور المحضر",
                  color: "#9c3d6b",
                  p1: "M4 7h3l2-3h6l2 3h3v12H4z",
                  p2: "M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
                  run: () => this.setState({ szGal: t.id, szGalIdx: 0 }),
                }
              : null,
            this.PC("edit")
              ? {
                  name: "تعديل المحضر",
                  color: "#b99751",
                  p1: "M12 20h9",
                  p2: "M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z",
                  run: async () => {
                    if (this._szNeedsReview) {
                      if (typeof KIVO.bsConfirm !== "function") return void this.bsToast("مسودتك باقية؛ يلزم تأكيد مراجعة المحضر المحدث قبل استبدالها");
                      const context = this._bcContext(), confirmed = await KIVO.bsConfirm({ title: "مراجعة المحضر المحدث", msg: "فتح المحضر المحدث يستبدل محتوى مسودتك الحالية بالنسخة المؤكدة. راجع مسودتك قبل المتابعة.", ok: "افتح النسخة المؤكدة" });
                      if (!confirmed || !this._bcSame(context)) return;
                    }
                    this._szNeedsReview = false;
                    this._szDraftStamp = recordStamp;
                    this.setState({
                      irYear: t.y,
                      irMonth: t.m,
                      irDay: t.d,
                      irEditId: t.id,
                      irDraft: {
                        ...this.emptyDraft(),
                        item: t.items && t.items[0] ? t.items[0].id : 0,
                        cat: t.items && t.items[0] && this.itemOf(t.items[0].id) ? this.itemOf(t.items[0].id).cat : "",
                        n: t.items && t.items[0] ? String(t.items[0].n || "") : "",
                        val: t.items && t.items[0] && t.items[0].val ? String(t.items[0].val) : "",
                        act: (t.items && t.items[0] && t.items[0].act) || "",
                        kind: (t.items && t.items[0] && t.items[0].kind) || "",
                        kindTxt: (t.items && t.items[0] && t.items[0].kindTxt) || "",
                        loc: t.loc || "",
                        no: t.no || "",
                        note: t.note || "",
                        items: (t.items || []).map((t, sourceIndex) => ({ ...t, sourceIndex, photos: (t.photos || []).slice(), hist: (t.hist || []).slice() })),
                      },
                      irSaveErrMsg: "",
                    });
                  },
                }
              : null,
            this.PC("del")
              ? {
                  name: "حذف المحضر",
                  color: "#dc2626",
                  danger: !0,
                  p1: "M3 6h18",
                  p2: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
                  run: async () => {
                    const result = await this._bcMutate("delete", { id: t.id }, { stamp: recordStamp });
                    if (!result.ok) return void this.bsToast(result.message);
                    this.bsAck("حُذف المحضر", "ok");
                  },
                }
              : null,
          ]),
        };
      }),
      ...KIVO.BassamCount.pair("irLedgerPgTotal", String(total), "سجل", "g"),
      irLedgerPgRange: 0 === total ? "0" : xt + 1 + "–" + Math.min(xt + bt, total),
      irLedgerPgNums: zt,
      irLedgerPerPage: String(ft),
      irLedgerOnPerPage: (t) => {
        const e = +t.target.value;
        this.setState({ irLedgerPerPage: 0 === e ? 0 : e || 10, irLedgerPage: 1 });
      },
      irLedgerPgFirst: () => this.setState({ irLedgerPage: 1 }),
      irLedgerPgPrev: () => this.setState({ irLedgerPage: Math.max(1, (this.state.irLedgerPage || 1) - 1) }),
      irLedgerPgNext: () => this.setState({ irLedgerPage: Math.min(yt, (this.state.irLedgerPage || 1) + 1) }),
      irLedgerPgLast: () => this.setState({ irLedgerPage: yt }),
      irLedgerPgFirstStyle: wt(St > 1),
      irLedgerPgPrevStyle: wt(St > 1),
      irLedgerPgNextStyle: wt(St < yt),
      irLedgerPgLastStyle: wt(St < yt),
      ...Lt,
      ...It,
    };
  }
  szOpenFile() {
    try {
      const t = document.getElementById("szPhotoInp");
      t && ((t.value = ""), t.click());
    } catch (t) {}
  }
  szOnFile(t) {
    const e = t && t.target && t.target.files && t.target.files[0];
    if (!e) return;
    if (!this._bcContext()) return void this.bsToast(this._bcFailure("session").message);
    this._szDraftStamp = this._szDraftStamp || this._bcStamp();
    const s = new Image(),
      a = URL.createObjectURL(e);
    ((s.onload = () => {
      try {
        const t = Math.min(1, 1280 / Math.max(s.width, s.height)),
          r = document.createElement("canvas");
        ((r.width = Math.max(1, Math.round(s.width * t))), (r.height = Math.max(1, Math.round(s.height * t))));
        const g9 = r.getContext("2d");
        ((g9.fillStyle = "#ffffff"), g9.fillRect(0, 0, r.width, r.height), g9.drawImage(s, 0, 0, r.width, r.height));
        const i = r.toDataURL("image/jpeg", 0.8);
        URL.revokeObjectURL(a);
        const o = "szp_" + Date.now().toString(36) + "_" + Math.floor(1e9 * Math.random()).toString(36);
        ((this._szImg = this._szImg || {}), (this._szImg[o] = i));
        this._szUploads = this._szUploads || new Map(); this._szUploads.set(o, { url: i, confirmed: false });
        const n = this.state.irDraft || this.emptyDraft();
        if (null != this._szPhotoTarget && n.items[this._szPhotoTarget]) {
          const t = n.items.slice(),
            e = { ...t[this._szPhotoTarget] };
          ((e.photos = (e.photos || []).concat([o])), (t[this._szPhotoTarget] = e), this.setState({ irDraft: { ...n, items: t } }));
        } else this.setState({ irDraft: { ...n, photos: (n.photos || []).concat([{ iid: o, url: i }]) } });
        ((this._szPhotoTarget = null),
          this.bsToast(
            "ضُغطت الصورة من " +
              (e.size / 1048576).toFixed(1) +
              " MB إلى " +
              Math.round((0.75 * i.length) / 1024) +
              " KB (" +
              r.width +
              "×" +
              r.height +
              ")",
            "ok",
          ));
      } catch (t) {
        this.bsToast("تعذّر معالجة الصورة");
      }
    }),
      (s.onerror = () => {
        (URL.revokeObjectURL(a), this.bsToast("الملف ليس صورة صالحة"));
      }),
      (s.src = a));
  }
  szImgUrl(t) {
    if (!t) return "";
    if (((this._szImg = this._szImg || {}), void 0 !== this._szImg[t])) return this._szImg[t] || "";
    this._szImg[t] = "";
    try {
      KIVO.BassamIDB &&
        KIVO.BassamIDB.get(t)
          .then((e) => {
            ((this._szImg[t] = "string" == typeof e ? e : ""), e && this.setState({ szImgTick: (this.state.szImgTick || 0) + 1 }));
          })
          .catch(() => {});
    } catch (t) {}
    return "";
  }
}
