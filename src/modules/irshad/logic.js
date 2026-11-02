class Component extends KIVO.BassamPageKit.base(DCLogic, ["admin+award+daily+dreport+employees+irshad+plan+profile+seized+staff+tasks","admin+profile+seized","daily+dreport+dstats+irshad+plan+seized+staff+tasks","daily+dreport+irshad+plan+seized+staff+tasks","dreport+irshad+planning+profile+seized+staff+tasks","daily+dreport+irshad+plan+profile+seized","award+irshad+seized","irshad+seized+tasks","dstats+irshad","irshad+seized"]) {
  static _irSessions = new WeakMap();
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
  _irContext() {
    const boot = window.__BS_BOOT || {}, auth = KIVO.BassamAuth, user = auth && auth.user && auth.user();
    const dept = KIVO.BassamDepts && KIVO.BassamDepts.active && KIVO.BassamDepts.active();
    if (!dept || !KIVO.BassamDepts?.has?.(dept) || (KIVO.BassamDepts.context && KIVO.BassamDepts.context().state !== "ready")) return null;
    if (this._irGone || this._irSessionStopped || boot.srv !== 1 || boot.cf !== 1 || !boot.uid || !user || String(user.id) !== String(boot.uid) ||
      (KIVO.__BS_SRV && KIVO.__BS_SRV.sesChanged && KIVO.__BS_SRV.sesChanged())) return null;
    return { uid: String(boot.uid), dept: String(dept || ""), key: String(boot.uid) + "\0" + String(dept || "") };
  }
  _irSame(context) { const now = this._irContext(); return !!now && !!context && now.key === context.key; }
  _irInteger(value) { return Number.isSafeInteger(value) && value >= 0; }
  _irBase(value) { return !!value && ["epoch", "reports", "languages", "locations", "retro"].every(k => this._irInteger(value[k])); }
  _irClone(value) { return JSON.parse(JSON.stringify(value)); }
  componentDidMount() {
    if (super.componentDidMount) super.componentDidMount();
    this._irGone = false;
    const context = this._irContext(), sessionKey = context && context.key + "\0" + (this.props?.solo || "");
    const sessions = Component._irSessions.get(window), retained = sessions?.get(sessionKey);
    if (retained) {
      sessions.delete(sessionKey);
      this._irDraftStamp = retained.stamp; this._irTickets = retained.tickets; this._irReasonRequired = retained.reasons;
      this._irReads = new Map();
      this.setState({ irDraft: retained.draft, irEditId: retained.editId, irYear: retained.year, irMonth: retained.month, irDay: retained.day, irSaveErrMsg: retained.message });
    }
    this._irOnRemote = event => {
      const context = this._irContext(), keys = event?.detail?.keys || [], dept = context?.dept || this._irActorKey?.split("\0")[1] || "";
      const affected = event?.type === "bassam:authz" || keys.some(value => {
        const key = String(value);
        if (/^bassam_(?:perms|auth_users|depts|gdepts|platform)_v1$/.test(key)) return true;
        const parts = /^bsdept:([^:]+):(.+)$/.exec(key);
        if (parts && parts[1] !== dept) return false;
        const name = parts ? parts[2] : key;
        return /^bassam_irshad(?:_langs|_locs|_retro)?_v1$/.test(name) || /^bassam_(?:employees|staffing|shift_options|grants|perm_tpls)_v[0-9]+$/.test(name);
      });
      if (!affected) return;
      this._irReads = new Map();
      this.setState({ irCatalogs: null, irCalendar: null, irRecords: null, irDashboard: null, irRetro: null, irCloudError: "", irRefresh: (this.state.irRefresh || 0) + 1 });
    };
    window.addEventListener("bassam:remote", this._irOnRemote);
    window.addEventListener("bassam:authz", this._irOnRemote);
  }
  componentWillUnmount() {
    const context = this._irDraftStamp?.context || this._irTickets?.values().next().value?.context || this._irContext();
    if (context) {
      let sessions = Component._irSessions.get(window); if (!sessions) { sessions = new Map(); Component._irSessions.set(window, sessions); }
      const key = context.key + "\0" + (this.props?.solo || "");
      if (JSON.stringify(this.state.irDraft) !== JSON.stringify(this.emptyDraft()) || this._irTickets?.size) {
        sessions.set(key, { draft: this._irClone(this.state.irDraft), editId: this.state.irEditId, year: this.state.irYear, month: this.state.irMonth, day: this.state.irDay, stamp: this._irDraftStamp, tickets: this._irTickets || new Map(), reasons: this._irReasonRequired, message: this.state.irSaveErrMsg || "مسودتك باقية في هذه الجلسة؛ راجعها قبل الحفظ" });
      } else sessions.delete(key);
    }
    this._irGone = true; this._irReads = new Map();
    if (this._irOnRemote) {
      window.removeEventListener("bassam:remote", this._irOnRemote);
      window.removeEventListener("bassam:authz", this._irOnRemote);
    }
    if (super.componentWillUnmount) super.componentWillUnmount();
  }
  _irFailure(code, status) {
    const text = {
      session: "تغيّرت الجلسة — مسودتك باقية هنا؛ أعد تسجيل الدخول قبل المتابعة",
      context: "تغيّرت الإدارة — ارجع إلى إدارة المسودة قبل إعادة المحاولة",
      conflict: "تغيّرت البيانات على الخادم؛ مسودتك باقية، حدّث البيانات وراجعها قبل إعادة الاعتماد",
      invalid: "لم يصل تأكيد كامل من الخادم؛ مسودتك باقية، أعد المحاولة بالطلب نفسه",
      network: "تعذّر تأكيد العملية على الخادم؛ مسودتك باقية لإعادة المحاولة",
      forbidden: "صلاحيتك لا تشمل هذا الإجراء",
    };
    return { ok: 0, err: code, status: status || 0, message: text[code] || "رفض الخادم العملية (" + code + ")؛ لم يُعرض نجاح" };
  }
  async _irRequest(path, options, context) {
    if (!context || !this._irSame(context)) return this._irFailure("session", 401);
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await window.fetch(path, { credentials: "same-origin", cache: "no-store", ...options, signal: controller.signal });
      if (!this._irSame(context)) return this._irFailure("session", 401);
      if (response.status === 401) { this._irSessionStopped = true; return this._irFailure("session", 401); }
      let body; try { body = await response.json(); } catch (e) { return this._irFailure("invalid", response.status); }
      if (!this._irSame(context)) return this._irFailure("session", 401);
      if (body?.err === "session-changed") { this._irSessionStopped = true; return this._irFailure("session", 409); }
      if (!response.ok || !body || body.ok !== 1) return { ...this._irFailure(response.status === 403 ? "forbidden" : response.status === 409 ? "conflict" : String(body?.err || "invalid"), response.status), why: body?.why, keys: body?.keys, details: body?.details };
      return { ok: 1, data: body };
    } catch (e) { return this._irFailure(this._irSame(context) ? "network" : "session"); }
    finally { clearTimeout(timer); }
  }
  async _irRead(view, options = {}, context = this._irContext()) {
    if (!context) return this._irFailure("session", 401);
    const query = new URLSearchParams({ uid: context.uid, dept: context.dept, view });
    Object.keys(options).forEach(k => { if (options[k] !== undefined && options[k] !== null) query.set(k, String(options[k])); });
    const result = await this._irRequest("/api/irshad?" + query, { method: "GET" }, context);
    if (!result.ok) return result;
    const data = result.data;
    if (data.dept !== context.dept || data.view !== view || !this._irBase(data.base) || !data.clock || !["y", "m", "d"].every(k => Number.isSafeInteger(data.clock[k]))) return this._irFailure("invalid");
    if (view === "catalogs" && (!data.catalogs || ["languages", "locations"].some(k => !data.catalogs[k] || typeof data.catalogs[k].present !== "boolean" || !Array.isArray(data.catalogs[k].values) || data.catalogs[k].values.some(v => typeof v !== "string")))) return this._irFailure("invalid");
    const metrics = value => value && ["trans", "bro", "pros", "pol", "ben"].every(k => typeof value[k] === "number" && Number.isFinite(value[k])) && this._irInteger(value.reports);
    if (view === "records" && (!Array.isArray(data.rows) || data.rows.some(row => !row || typeof row.id !== "string" || row.langs != null && (!Array.isArray(row.langs) || row.langs.some(v => !v || typeof v !== "object"))) || data.rows.length > Number(options.limit || 100) || !this._irInteger(data.total) || !this._irInteger(data.monthTotal) || !Number.isSafeInteger(data.page) || data.page < 1 || ![data.next, data.prev].every(v => v == null || typeof v === "string"))) return this._irFailure("invalid");
    if (view === "calendar" && (!Array.isArray(data.months) || !Array.isArray(data.days) || [...data.months, ...data.days].some(row => !row || !this._irInteger(row.n)) || !this._irInteger(data.total) || !this._irInteger(data.yearTotal) || !metrics(data.monthTotals))) return this._irFailure("invalid");
    if (view === "dashboard") {
      const dash = data.dashboard;
      if (!dash || !dash.available || !Array.isArray(dash.available.years) || !Array.isArray(dash.available.months) || !this._irInteger(dash.available.total) || !["series", "previousSeries", "heat", "languages", "locations", "shifts", "shiftSeries", "locationSeries", "employees"].every(k => Array.isArray(dash[k])) || !metrics(dash.totals) || !metrics(dash.previous) || !dash.summary || !Array.isArray(dash.summary.rows) || !metrics(dash.summary.totals)) return this._irFailure("invalid");
    }
    return { ok: 1, data, contextKey: context.key };
  }
  _irRecordQuery() {
    return { year: this.state.irYear, month: this.state.irMonth, shift: this.state.irLgShift === "all" ? undefined : this.state.irLgShift,
      loc: this.state.irLgLoc === "all" ? undefined : this.state.irLgLoc, q: (this.state.irLgSearch || "").trim(),
      limit: Math.min(200, this.state.irLedgerPerPage || 200), page: this.state.irLedgerPerPage === 0 ? 1 : this.state.irLedgerPage || 1 };
  }
  _irDashboardQuery() {
    const t = this.state, today = this.hToday(), available = t.irDashboard?.dashboard?.available || { years: [today.y], months: [] };
    const years = available.years.length ? available.years : [today.y], all = t.irDashYear == null || String(t.irDashYear) === "all";
    const year = all || !years.includes(+t.irDashYear) ? years[0] : +t.irDashYear;
    const months = available.months.filter(p => p.y === year).map(p => p.m).sort((a, b) => a - b);
    let month = all ? "all" : t.irDashMonth == null ? "" : String(t.irDashMonth);
    if (!all && month !== "all" && !months.includes(+month)) month = months.length ? String(months[months.length - 1]) : "all";
    const query = { mode: t.irDashMode === "custom" ? "custom" : all ? "all" : "month", year, month, bucket: all || month === "all" ? "month" : "day", heatYear: year, sumQ: (t.irDashSumQ || "").trim() };
    if (query.mode === "custom") {
      const parse = value => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3]).getTime() : null; };
      const current = this.hGreg(today.y, today.m, today.d), end = new Date(current.getFullYear(), current.getMonth(), current.getDate()).getTime();
      let from = parse(t.irDashFrom), to = parse(t.irDashTo); if (from == null) from = end - 29 * 864e5; if (to == null) to = end;
      if (from > to) [from, to] = [to, from];
      const date = value => { const h = this.hParts(new Date(value)); return h.y + "-" + h.m + "-" + h.d; };
      const length = Math.round((to - from) / 864e5) + 1;
      Object.assign(query, { from: date(from), to: date(to), previousFrom: date(from - length * 864e5), previousTo: date(from - 864e5), heatYear: this.hParts(new Date(to)).y, bucket: length <= 62 ? "day" : "month" });
    }
    return query;
  }
  async _irCollect(options, context = this._irContext()) {
    let rows = [], cursor = "", base = null, total = null;
    const seen = new Set();
    do {
      const result = await this._irRead("records", { ...options, limit: 200, page: cursor ? undefined : 1, cursor }, context);
      if (!result.ok) return result;
      const page = result.data;
      if (base && JSON.stringify(base) !== JSON.stringify(page.base) || total !== null && total !== page.total) return this._irFailure("conflict", 409);
      base = page.base; total = page.total; rows.push(...page.rows);
      if (rows.length > total || page.next && seen.has(page.next)) return this._irFailure("invalid");
      cursor = page.next || ""; if (cursor) seen.add(cursor);
      if (!cursor && rows.length !== total) return this._irFailure("invalid");
    } while (cursor);
    return { ok: 1, rows, base, total, contextKey: context.key };
  }
  _irEnsure(view, options) {
    const context = this._irContext();
    if (!context) return;
    this._irReads = this._irReads || new Map();
    if (this._irActorKey !== context.key) {
      this._irActorKey = context.key; this._irReads.clear();
      this.state.irCalendar = null; this.state.irRecords = null; this.state.irCatalogs = null; this.state.irDashboard = null;
    }
    const signature = JSON.stringify([context.key, options]), previous = this._irReads.get(view);
    if (previous && previous.signature === signature && (!previous.done || Date.now() - previous.at < 30000)) return;
    const token = { signature, at: Date.now() }; this._irReads.set(view, token);
    setTimeout(async () => {
      const result = view === "records" && this.state.irLedgerPerPage === 0 ? await this._irCollect(options, context) : await this._irRead(view, options, context);
      if (this._irReads.get(view) !== token || !this._irSame(context)) return;
      if (!result.ok) { token.failed = true; this.setState({ irCloudError: result.message, irSaveErrMsg: result.message }); return; }
      let data = result.data;
      if (view === "records" && !data) data = { dept: context.dept, rows: result.rows, total: result.total, monthTotal: (this.state.irCalendar || {}).monthTotals?.reports ?? result.total, page: 1, pageSize: result.total, next: null, prev: null, base: result.base };
      token.done = true;
      data._contextKey = context.key;
      this.setState({ ["ir" + view.charAt(0).toUpperCase() + view.slice(1)]: data, irCloudError: Array.from(this._irReads.values()).some(t => t.failed) ? this.state.irCloudError : "" });
    }, 0);
  }
  _irRefresh() { this._irReads = new Map(); this.setState({ irRefresh: (this.state.irRefresh || 0) + 1 }); }
  _irStampDraft(base, key) {
    if (!this._irDraftStamp) {
      const context = this._irContext(), source = base || this.state.irCalendar?.base;
      const captured = key || this.state.irCalendar?._contextKey;
      if (context && this._irBase(source)) this._irDraftStamp = { context: captured ? { ...context, key: captured } : context, base: this._irClone(source) };
    }
  }
  _irStampCatalog(kind) {
    this._irCatalogStamps = this._irCatalogStamps || new Map();
    const source = this.state.irCatalogs, context = this._irContext();
    if (!this._irCatalogStamps.has(kind) && context && source && this._irBase(source.base)) this._irCatalogStamps.set(kind, { context: { ...context, key: source._contextKey || context.key }, base: this._irClone(source.base) });
  }
  _irEnsureRetro() {
    const context = this._irContext(); if (!context) return;
    this._irReads = this._irReads || new Map();
    const prior = this._irReads?.get("retro"); if (prior && prior.context === context.key) return;
    const token = { context: context.key }; this._irReads.set("retro", token);
    setTimeout(async () => {
      const query = new URLSearchParams({ uid: context.uid, dept: context.dept, res: "irshad" });
      const result = await this._irRequest("/api/retro?" + query, { method: "GET" }, context);
      if (this._irReads.get("retro") !== token || !this._irSame(context)) return;
      if (!result.ok || !Array.isArray(result.data.windows)) { this.setState({ irCloudError: result.message || this._irFailure("invalid").message }); return; }
      this.setState({ irRetro: result.data });
    }, 0);
  }
  async _irRetroToggle(scope) {
    if (!this.PC("approve")) return this.permDeny();
    const context = this._irContext(); if (!context) { this.bsToast(this._irFailure("session").message); return; }
    if (this._irRetroBusy) return;
    this._irRetroBusy = true;
    try {
    const state = this.state.irRetro;
    if (!state) { this.bsToast("انتظر قراءة نافذة الاستدراك من الخادم ثم أعد المحاولة"); this._irEnsureRetro(); return; }
    const activeWindow = state.windows.find(w => w && !w.closedAt && w.until > Date.now() && w.scope?.y === scope.y && w.scope?.m === scope.m && (w.scope.d == null ? scope.d == null : w.scope.d === scope.d));
    const body = { dept: context.dept, res: "irshad", act: activeWindow ? "close" : "open", ...(activeWindow ? { id: activeWindow.id } : { scope }) };
    if (!activeWindow) {
      const srv = KIVO.__BS_SRV;
      if (!srv || typeof srv.askReason !== "function") { this.bsToast("تعذّر طلب سبب الاستدراك؛ لم تُفتح النافذة"); return; }
      body.reason = await new Promise(resolve => srv.askReason("bsdept:" + context.dept + ":bassam_irshad_v1", ["ir.rec.retro.open"], resolve));
      if (!body.reason || !this._irSame(context)) return;
    }
    const result = await this._irRequest("/api/retro?uid=" + encodeURIComponent(context.uid), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, context);
    this.setState({ irRetro: null });
    if (!result.ok || !result.data.window?.id) { this.bsToast(result.message || this._irFailure("invalid").message); this._irReads?.delete("retro"); this._irEnsureRetro(); return; }
    this._irRefresh();
    } finally { this._irRetroBusy = false; }
  }
  async _irMutate(op, fields, expected) {
    const context = this._irContext();
    if (!context) return this._irFailure("session", 401);
    this._irTickets = this._irTickets || new Map();
    const signature = JSON.stringify([context.key, op, fields]), intent = JSON.stringify([context.key, op, fields.id || fields.kind || (op === "delete-month" ? [fields.year, fields.month] : "")]);
    const prior = Array.from(this._irTickets.values()).find(ticket => ticket.intent === intent);
    let ticket = prior;
    if (!ticket) {
      const source = op === "catalog-replace" ? this.state.irCatalogs : this.state.irCalendar || this.state.irRecords || this.state.irDashboard;
      if (!source || source.dept !== context.dept || source._contextKey && source._contextKey !== context.key) return this._irFailure("context");
      if (["create", "edit"].includes(op) && !this._irDraftStamp) this._irStampDraft(source.base, source._contextKey);
      const draft = ["create", "edit"].includes(op) ? this._irDraftStamp : op === "catalog-replace" ? this._irCatalogStamps?.get(fields.kind) : null;
      if (draft && !this._irSame(draft.context)) return this._irFailure("context");
      const base = draft ? draft.base : source?.base;
      if (!this._irBase(base)) return this._irFailure("invalid");
      let reason;
      const required = this._irReasonRequired?.get(signature);
      if (required) {
        const srv = KIVO.__BS_SRV;
        if (!srv || typeof srv.askReason !== "function") return this._irFailure("reason");
        this._irAsking = this._irAsking || new Set();
        if (this._irAsking.has(signature)) return this._irFailure("pending");
        this._irAsking.add(signature);
        try { reason = await new Promise(resolve => srv.askReason("bsdept:" + context.dept + ":bassam_irshad_v1", required, resolve)); }
        finally { this._irAsking.delete(signature); }
        if (!reason) return this._irFailure("cancelled");
        if (!this._irSame(context)) return this._irFailure("session", 401);
      }
      if (!window.crypto || !window.crypto.getRandomValues) return this._irFailure("invalid");
      const bytes = new Uint8Array(20); window.crypto.getRandomValues(bytes);
      const requestId = "ir-" + Array.from(bytes, n => n.toString(16).padStart(2, "0")).join("");
      const body = { uid: context.uid, dept: context.dept, requestId, base: this._irClone(base), op, ...this._irClone(fields) };
      if (reason) body.reason = String(reason);
      ticket = { context, requestId, op, signature, intent, body: JSON.stringify(body), expected, busy: false };
      this._irTickets.set(signature, ticket);
    }
    if (!this._irSame(ticket.context)) return this._irFailure("context");
    if (ticket.busy) return this._irFailure("pending");
    ticket.busy = true;
    try {
      const result = await this._irRequest("/api/irshad/act", { method: "POST", headers: { "Content-Type": "application/json" }, body: ticket.body }, ticket.context);
      if (!result.ok) {
        if (result.status >= 400 && result.status < 500 && result.status !== 429) this._irTickets.delete(ticket.signature);
        if (result.status === 409) this._irConflict = true;
        if (result.status === 403 && result.why === "reason") {
          this._irReasonRequired = this._irReasonRequired || new Map();
          this._irReasonRequired.set(signature, Array.isArray(result.keys) ? result.keys : []);
          result.message = "هذا الإجراء يتطلب سببًا؛ مسودتك باقية، اضغط الحفظ لإدخال السبب";
        }
        return result;
      }
      const ack = result.data;
      if (ack.requestId !== ticket.requestId || ack.op !== op || !this._irInteger(ack.rev) || !this._irInteger(ack.n) || ticket.expected !== undefined && ack.n !== ticket.expected || !this._irBase(ack.base) || op === "create" && (typeof ack.id !== "string" || !ack.id)) return this._irFailure("invalid");
      const sent = JSON.parse(ticket.body), affected = op === "catalog-replace" ? sent.kind : "reports";
      if (ack.rev < sent.base[affected] || Object.keys(sent.base).some(k => ack.base[k] !== (k === affected ? ack.rev : sent.base[k]))) return this._irFailure("invalid");
      this._irTickets.delete(ticket.signature); this._irRefresh();
      if (op === "catalog-replace") this._irCatalogStamps?.delete(sent.kind);
      return { ok: 1, receipt: ack, sameInput: ticket.signature === signature, submitted: sent };
    } finally { ticket.busy = false; }
  }
  async _irApply(op, fields, expected, confirmed) {
    const result = await this._irMutate(op, fields, expected);
    if (this._irGone) return result;
    if (!result.ok) { this.setState({ irSaveErrMsg: result.message, irCloudError: this._irConflict ? result.message : this.state.irCloudError }); this.bsToast(result.message); return result; }
    if (confirmed) confirmed(result.receipt, result);
    return result;
  }
  benOf(t) {
    return (t.langs || []).reduce((t, e) => t + (e.count || 0), 0) + (t.bro || 0) + (t.pros || 0) + (t.pol || 0);
  }
  loadIrshadLangs() {
    const values = this.state.irCatalogs?.catalogs?.languages?.values;
    if (Array.isArray(values) && values.length) return values.slice();
    return this.LANGS.slice();
  }
  loadIrshadLocs() {
    return (this.state.irCatalogs?.catalogs?.locations?.values || []).slice();
  }
  loadStaffingIr() {
    try {
      const e = KIVO.__BS_SRV.operations.get("bassam_staffing_v3"),
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
      irDraft: this.emptyDraft(),
      irEditId: null,
      irSaveErrMsg: "",
      irCloudError: "",
      irCalendar: null,
      irRecords: null,
      irCatalogs: null,
      irDashboard: null,
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
        /* الموجة 2 · IRSZ-11: اللوحةُ الفارغة تدلّ على صفحة السجلات نفسِها — رابطاً لمن يفتحها، ونصّاً لمن لا يفتحها */
        irRecLinkOn: !!(o && this.PC("view")),
        irRecLinkOff: !(o && this.PC("view")),
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
    this._irEnsure("catalogs", {});
    if (g) {
      this._irEnsure("calendar", { year: e.irYear, month: e.irMonth });
      this._irEnsure("records", this._irRecordQuery());
      this._irEnsureRetro();
    }
    if (d) this._irEnsure("dashboard", this._irDashboardQuery());
    const needed = g ? ["catalogs", "calendar", "records"] : ["catalogs", "dashboard"];
    const commonBase = e.irCatalogs?.base;
    const mixed = needed.every(k => this._irReads?.get(k)?.done) && needed.some(k => {
      const read = e["ir" + k.charAt(0).toUpperCase() + k.slice(1)];
      return !read || Object.keys(commonBase || {}).some(key => read.base[key] !== commonBase[key]);
    });
    const pending = mixed || needed.some(k => !this._irReads?.get(k)?.done);
    c.irCloudBusy = pending && !e.irCloudError;
    c.irCloudError = e.irCloudError || (mixed ? "تغيّرت البيانات أثناء القراءة؛ أعد تحديث النتائج للحصول على نسخة متسقة" : !this._irContext() ? this._irFailure("session").message : "");
    c.irCloudBusy = pending && !c.irCloudError;
    c.irCloudNotice = pending || !!c.irCloudError;
    c.irCloudRetryLabel = this._irConflict ? "تحديث البيانات ومراجعة المسودة" : "إعادة المحاولة";
    c.irCloudRetry = () => { if (this._irConflict) { this._irDraftStamp = null; this._irConflict = false; } this.setState({ irCloudError: "" }); this._irRefresh(); };
    c.irOnDash = d && !pending;
    c.irOnRecords = g && !pending;
    return (g && Object.assign(c, this._recordsCalVals()), d && Object.assign(c, this._dashVals()), c);
  }
  _dashVals() {
    const t = this.state, e = this.hToday(), a = 864e5, i = this.MONTHS,
      dash = t.irDashboard?.dashboard || {}, available = dash.available || { total: 0, years: [], months: [] },
      totals = dash.totals || {}, previous = dash.previous || {},
      s = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
      n = v => KIVO.bsPct ? KIVO.bsPct(v) : String(Math.round(v || 0)),
      o = v => Math.round(v || 0).toLocaleString("en-US"),
      l = v => o(v).replace(/[0-9]/g, v => "٠١٢٣٤٥٦٧٨٩"[+v]),
      h = v => { v = Math.round(v || 0); return v >= 1e6 ? (v / 1e6).toFixed(1).replace(/\.0$/, "") + " مليون" : v >= 1e4 ? Math.round(v / 1e3) + " ألف" : v >= 1e3 ? (v / 1e3).toFixed(1).replace(/\.0$/, "") + " ألف" : o(v); },
      d = v => v === 1 ? "يوم واحد" : v === 2 ? "يومين" : v >= 3 && v <= 10 ? v + " أيام" : KIVO.BassamCount(v, "يوم") + "",
      g = v => this.hParts(new Date(v)),
      c = v => new Date(v.getFullYear(), v.getMonth(), v.getDate()).getTime(),
      p = v => { const hit = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ""); return hit ? new Date(+hit[1], +hit[2] - 1, +hit[3]).getTime() : null; },
      m = v => { const date = new Date(v), pad = n => String(n).padStart(2, "0"); return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()); },
      u = v => v.d + " " + i[v.m - 1] + " " + v.y + " هـ",
      x = v => 1e4 * v.y + 100 * v.m + v.d, y = v => 100 * v.y + v.m,
      w = available.years.length ? available.years : [e.y],
      v = t.irDashYear == null || String(t.irDashYear) === "all";
    let P = v ? w[0] : +t.irDashYear; if (!w.includes(P)) P = w[0];
    const M = available.months.filter(v => v.y === P).map(v => v.m).sort((a,b) => a-b);
    let O = v ? "all" : t.irDashMonth == null ? "" : String(t.irDashMonth);
    if (!v && O !== "all" && !M.includes(+O)) O = M.length ? String(M[M.length - 1]) : "all";
    const E = (y,m) => this.hMonthDays(y,m), k = (y,m) => y > e.y ? 0 : y < e.y || m < e.m ? E(y,m) : m === e.m ? e.d : 0,
      F = t.irDashMode === "custom" ? "custom" : v ? "all" : "month", C = c(this.hGreg(e.y,e.m,e.d));
    let T = p(t.irDashFrom), _ = p(t.irDashTo);
    if (F === "custom") { if (T == null) T = C - 29*a; if (_ == null) _ = C; if (T > _) [T,_] = [_,T]; }
    let A = [], B = true, Y = "", H = "", V = 0, G = P;
    if (F === "all") {
      B = false; A = available.months.slice().sort((a,b) => y(a)-y(b)).map(v => ({ k:y(v),lab:i[v.m-1],full:i[v.m-1]+" "+v.y+" هـ" }));
      Y = "كل الفترة"; G = w[0];
      if (available.first) V = Math.round((C-c(this.hGreg(available.first.y,available.first.m,available.first.d)))/a)+1;
    } else if (F === "custom") {
      const from = g(T), to = g(_); V = Math.round((_ - T)/a)+1; B = V <= 62; G = to.y;
      if (B) for (let at=T;at<=_;at+=a) { const day=g(at); A.push({k:x(day),lab:String(day.d),full:u(day)}); }
      else { const months=new Map(); for(let at=T;at<=_;at+=a){const day=g(at);months.set(y(day),day);} A=Array.from(months).sort((a,b)=>a[0]-b[0]).map(([key,v])=>({k:key,lab:i[v.m-1],full:i[v.m-1]+" "+v.y+" هـ"})); }
      Y=u(from)+" ← "+u(to); H=u(g(T-V*a))+" ← "+u(g(T-a));
    } else if (O === "all") {
      B=false; for(let month=1;month<=12;month++) if(k(P,month)>0) A.push({k:100*P+month,lab:i[month-1],full:i[month-1]+" "+P+" هـ"});
      V=A.reduce((sum,v)=>sum+k(P,v.k%100),0);Y="كل أشهر "+P+" هـ";H=P===e.y?"نفس الفترة من "+(P-1)+" هـ":"سنة "+(P-1)+" هـ";
    } else {
      V=k(P,+O)||E(P,+O);for(let day=1;day<=V;day++) A.push({k:1e4*P+100*(+O)+day,lab:String(day),full:day+" "+i[+O-1]+" "+P+" هـ"});
      Y=i[+O-1]+" "+P+" هـ";let year=P,month=+O-1;if(month<1){month=12;year--;}
      H=P===e.y&&+O===e.m?"أول "+d(e.d)+" من "+i[month-1]+" "+year+" هـ":i[month-1]+" "+year+" هـ";
    }
    const j = (previous.reports || 0)>0 && F!=="all", q=B?"يوم":"شهر",
      z = key => B ? Math.floor(key/1e4)+"-"+String(Math.floor(key/100)%100).padStart(2,"0")+"-"+String(key%100).padStart(2,"0") : Math.floor(key/100)+"-"+String(key%100).padStart(2,"0"),
      U=B?x:y,
      W = (points,metric) => { const map=new Map(points.map(v=>[U(v),v[metric]||0]));return A.map(v=>map.get(v.k)||0); },
      K = metric => { const ser=W(dash.series||[],metric);let min=0,max=0,act=0,peak=-1,low=-1;ser.forEach((v,index)=>{if(v>0){act++;if(max===0||v>max){max=v;peak=index;}if(min===0||v<min){min=v;low=index;}}});const tot=ser.reduce((a,b)=>a+b,0);return{ser,tot,min,max,avg:act?tot/act:0,act,gap:ser.length-act,peakShort:peak<0?"—":A[peak].full.replace(/ هـ$/,""),lowShort:low<0?"—":A[low].full.replace(/ هـ$/,""),peakNum:peak<0?"—":z(A[peak].k),lowNum:low<0?"—":z(A[low].k)}; },
      J=[{name:"الاسترشاد",desc:"عدد المستفيدين من الاسترشاد اللغوي",key:"trans",color:"#4a97cf"},{name:"المطويات",desc:"عدد المطويات الموزّعة",key:"bro",color:"#2fa372"},{name:"النيابة",desc:"عدد الحالات المحوَّلة للنيابة",key:"pros",color:"#d9793a"},{name:"الشرطة",desc:"عدد الحالات المحوَّلة للشرطة",key:"pol",color:"#7e2a52"}],
      X=K("ben"),Q=J.map((v,index)=>({m:v,st:K(v.key),i1:index===0,i2:index===1,i3:index===2,i4:index===3})), $=X.tot,Z=previous.ben||0,
      tt=(values,width,height,max)=>{if(!values.length)return{line:"",area:""};const top=max||Math.max(...values,1),point=index=>values.length===1?width/2:width-index/(values.length-1)*width;const line=values.map((v,index)=>(index?"L":"M")+point(index).toFixed(1)+" "+(height-v/top*height).toFixed(1)+" ").join("");return{line,area:"M"+point(0).toFixed(1)+" "+height+" "+line.replace(/^M/,"L")+"L"+point(values.length-1).toFixed(1)+" "+height+" Z"};},
      et=tt(X.ser,1000,100),rt=t.irDashBrk||"total",at=this.loadShiftOptsIr(),it=this.loadIrshadLocs(),st=["#4a97cf","#d9793a","#2fa372","#7e2a52","#7b8a94","#b99751"];
    const source = rt==="shift" ? at.map(v=>v.name) : rt==="loc" ? it.slice(0,6) : [], groups=rt==="shift"?dash.shiftSeries:dash.locationSeries,
      nt=source.map((name,index)=>({name,color:st[index%st.length],ser:W((groups||[]).find(v=>v.name===name)?.points||[],"ben")})).filter(v=>v.ser.some(n=>n>0)),
      ot=nt.length>0,lt=ot?A.map((v,index)=>nt.reduce((sum,g)=>sum+g.ser[index],0)):X.ser;
    let ht=null;
    if(j&&!ot){const values=(dash.previousSeries||[]).slice().sort((a,b)=>U(a)-U(b)).map(v=>v.ben||0);const series=A.map((v,index)=>values[index]||0);if(series.some(v=>v>0))ht=series;}
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
        (dash.heat || []).forEach((e) => {
          const r = e.m + "-" + e.d;
          t[r] = (t[r] || 0) + (e.ben || 0);
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
      };
    let Mt = (dash.languages || [])
      .map(row => ({ name: row.name, v: row.value, other: !!row.other }))
      .sort((t, e) => e.v - t.v);

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
      }));
    let Tt = (dash.locations || [])
      .map(row => ({ name: row.name, v: row.value, p: row.previous || 0, other: !!row.other }))
      .sort((t, e) => e.v - t.v);

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
      Nt = at.map((option,index) => { const row=(dash.shifts||[]).find(v=>v.name===option.name)||{}; return {...row,name:option.name,color:st[index%st.length],v:row.ben||0,n:row.reports||0}; }),
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
        ["عدد التقارير", totals.reports, previous.reports],
        ["مستفيدو الاسترشاد", Q[0].st.tot, previous.trans || 0],
        ["المطويات الموزّعة", Q[1].st.tot, previous.bro || 0],
      ].map((t) => {
        const e = vt(t[1], t[2]);
        return { label: t[0], nums: o(t[2]) + " → " + o(t[1]), txt: e.txt, style: e.style };
      }),
      Ut = (dash.employees||[]).slice(0,6).map(row => ({k:row.key,v:row.ben||0,p:row.previous||0,n:row.reports||0,nm:row.name||"—",sh:row.shift||""})),
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
        const r = t.trans || 0, a = t.bro || 0, i = (t.pros || 0) + (t.pol || 0);
        return {
          name: t.name,
          dot:
            "width:8px;height:8px;border-radius:3px;display:inline-block;margin-inline-end:7px;vertical-align:middle;background:" + t.color,
          reports: o(t.n),
          emps: o(t.employees || 0),
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
      $t = (dash.summary?.rows || []).map(row => Jt.find(t => t.name === row.name)).filter(Boolean),
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
        (t ? "color:var(--fg-x475569);cursor:pointer" : "color:var(--fg-xcbd5e1);cursor:default");
    const summary=dash.summary?.totals||{},de={label:Xt?"إجمالي المعروض":"الإجمالي",reports:o(summary.reports),emps:o(summary.employees),ben:o(summary.ben),avg:summary.reports?((summary.ben||0)/summary.reports).toFixed(1):"0",trans:o(summary.trans),bro:o(summary.bro),ref:o((summary.pros||0)+(summary.pol||0)),share:($?n((summary.ben||0)/$*100):"0")+"%"},
      ge = [{ dot: "#b99751", n: "الإجمالي", v: h($), p: "" }]
        .concat(Q.map((t) => ({ dot: t.m.color, n: t.m.name, v: h(t.st.tot), p: $ ? "(" + n((t.st.tot / $) * 100) + "٪)" : "" })))
        .concat([
          { dot: "#7b8a94", n: "التقارير", v: o(totals.reports || 0), p: "" },
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
        KIVO.BassamCount(totals.reports || 0, "تقرير") +
        "" +
        (j ? " · تُقارَن بـ " + H : "all" === F ? "" : " · لا توجد فترة سابقة للمقارنة"),
      irDashHeroLbl: "إجمالي المستفيدين من خدمة الاسترشاد · " + Y,
      irDashHeroNum: l($),
      irDashSparkHas: X.ser.length > 1,
      irDashHeroLine: et.line,
      irDashHeroArea: et.area,
      irDashHiVal: h(X.max),
      irDashHiSub: X.peakNum,
      irDashLoVal: h(X.min),
      irDashLoSub: X.lowNum,
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
          s = previous[t.m.key] || 0,
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
      irEmptyShow: !(available.total > 0),
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
      calendar = t.irCalendar || { total: 0, yearTotal: 0, months: [], days: [], monthTotals: {} },
      records = t.irRecords || { rows: [], total: 0, monthTotal: 0, page: 1 },
      i = records.rows,
      s = (y, m, d) => y !== r ? 0 : d != null ? (calendar.days.find(p => p.d === d)?.n || 0) : m != null ? (calendar.months.find(p => p.m === m)?.n || 0) : calendar.yearTotal,
      n = s(r),
      o = 12 * e.y + e.m,
      confirmedWindows = (t.irRetro?.windows || []).filter(w => w && w.scope && !w.closedAt && w.until > Date.now()),
      l = Object.fromEntries(confirmedWindows.filter(w => w.scope.d == null).map(w => [w.scope.y + "-" + w.scope.m, true])),
      h = Object.fromEntries(confirmedWindows.filter(w => w.scope.d != null).map(w => [w.scope.y + "-" + w.scope.m + "-" + w.scope.d, true])),
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
                  : { irYear: r, irMonth: n, irDay: r === e.y && n === e.m ? e.d : 1, irLedgerOpen: !1 },
              ),
            dbl: (t) => {
              /* الموجة 1 · IRSZ-4: بلا صلاحية الاعتماد كانت النقرةُ المزدوجة لا تفعل شيئاً بصمت — الآن تشرح السبب */
              (t.stopPropagation(),
                this.PC("approve")
                  ? (m || c && p) && this._irRetroToggle({ y: r, m: n, d: null })
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
        click: () => this.setState(l ? { irDay: i } : { irDay: i, irLedgerOpen: !1 }),
        dbl: (t) => {
          (t.stopPropagation(),
            this.PC("approve")
              ? u
                ? this._irRetroToggle({ y: r, m: a, d: null })
                : f && this._irRetroToggle({ y: r, m: a, d: i })
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
      N = (t) => {
        this._irStampDraft();
        const e = { ...(this.state.irDraft || this.emptyDraft()), ...t };
        this.setState({ irDraft: e, irSaveErrMsg: "" });
      },
      A = (t, e) => {
        const r = Math.max(0, (parseInt(t || "0", 10) || 0) + e);
        return String(r);
      },
      B = (t, e, r, a, i, s, n, o) => {
        const l = t();
        const kind = n === "irLangPopOpen" ? "languages" : "locations";
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
                this._irStampDraft();
                const t = this.state.irDraft || this.emptyDraft();
                this.setState({ irDraft: { ...t, ...o(s) }, [n]: !1, [a]: -1, irSaveErrMsg: "" });
              },
              editVal: d ? (null != this.state[i] ? this.state[i] : s) : "",
              setEditVal: (t) => this.setState({ [i]: t.target.value }),
              startEdit: (t) => {
                this._irStampCatalog(kind);
                (t && t.stopPropagation && t.stopPropagation(), this.setState({ [a]: h, [i]: s }));
              },
              saveEdit: async () => {
                this._irStampCatalog(kind);
                const n = (this.state[i] || "").trim();
                if (!n || (n !== s && l.includes(n))) return void this.setState({ [a]: -1, [i]: "" });
                const d = t();
                d[h] = n;
                const result = await e(d); if (!result.ok || result.sameInput === false) return;
                const g = this.state.irDraft || this.emptyDraft(),
                  c = r === s ? o(n) : {};
                this.setState({ irDraft: { ...g, ...c }, [a]: -1, [i]: "" });
              },
              cancelEdit: () => { this._irCatalogStamps?.delete(kind); this.setState({ [a]: -1, [i]: "" }); },
              delClick: async (s) => {
                this._irStampCatalog(kind);
                s && s.stopPropagation && s.stopPropagation();
                const n = t();
                if (n.length <= 1) return;
                const l = n[h];
                n.splice(h, 1);
                const result = await e(n); if (!result.ok || result.sameInput === false) return;
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
          setNewVal: (t) => { this._irStampCatalog(kind); this.setState({ [s]: t.target.value }); },
          addNew: async () => {
            this._irStampCatalog(kind);
            const r = (this.state[s] || "").trim();
            if (r) {
              const a = t();
              if (!a.includes(r)) { a.push(r); const result = await e(a); if (!result.ok || result.sameInput === false) return; }
            }
            this.setState({ [s]: "" });
          },
        };
      },
      Y = B(
        () => this.loadIrshadLangs(),
        (values) => this._irApply("catalog-replace", { kind: "languages", values }, values.length),
        O.langSel,
        "irLangEditIdx",
        "irLangEditVal",
        "irLangNewVal",
        "irLangPopOpen",
        (t) => ({ langSel: t }),
      ),
      H = B(
        () => this.loadIrshadLocs(),
        (values) => this._irApply("catalog-replace", { kind: "locations", values }, values.length),
        O.loc,
        "irLocEditIdx",
        "irLocEditVal",
        "irLocNewVal",
        "irLocPopOpen",
        (t) => ({ loc: t }),
      ),
      monthTotal = calendar.monthTotals.reports || 0,
      filteredTotal = records.total,
      G = calendar.monthTotals.ben || 0,
      j = calendar.monthTotals.trans || 0,
      R = calendar.monthTotals.bro || 0,
      z = calendar.monthTotals.pros || 0,
      U = calendar.monthTotals.pol || 0,
      K = i,
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
      Q = 0 === X ? Math.max(1, filteredTotal) : X,
      $ = Math.max(1, Math.ceil(filteredTotal / Q)),
      Z = Math.min(Math.max(1, records.page || 1), $),
      q = (Z - 1) * Q,
      tt = K,
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
      irPrevYear: () => this.setState({ irYear: r - 1, irLedgerOpen: !1 }),
      irNextYear: () => this.setState({ irYear: r + 1, irLedgerOpen: !1 }),
      irGoCurrent: () => this.setState({ irYear: e.y, irMonth: e.m, irDay: e.d, irLedgerOpen: !1 }),
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
      ...KIVO.BassamCount.pair("irKpiCount", String(monthTotal), "تقرير"),
      irKpiBen: G.toLocaleString("en-US"),
      irKpiTrans: j.toLocaleString("en-US"),
      irKpiBro: R.toLocaleString("en-US"),
      irKpiRef: (z + U).toLocaleString("en-US"),
      irKpiPros: z.toLocaleString("en-US"),
      irKpiPol: U.toLocaleString("en-US"),
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
        this._irStampDraft();
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
          this._irStampDraft();
          const t = this.state.irDraft || this.emptyDraft();
          this.setState({ irDraft: { ...t, langs: t.langs.filter((t, r) => r !== e) } });
        },
      })),
      irClearDraft: () => { this._irDraftStamp = null; this.setState({ irDraft: this.emptyDraft(), irSaveErrMsg: "", irEditId: null }); },
      irSaveErr: !!t.irSaveErrMsg,
      irSaveErrMsg: t.irSaveErrMsg || "",
      irSaveReport: async () => {
        const t = this.state.irDraft || this.emptyDraft();
        const editId = this.state.irEditId, context = this._irContext();
        const pending = Array.from(this._irTickets?.values() || []).some(ticket => ticket.context.key === context?.key && ticket.op === (editId ? "edit" : "create") && (!editId || JSON.parse(ticket.body).id === editId));
        if (!pending && !t.shift) return void this.setState({ irSaveErrMsg: "اختر الوردية أولاً" });
        const e = this.employeesForShift(r, a, t.shift, E).find((e) => e.eid === t.eid);
        if (!pending && !e)
          return void this.setState({ irSaveErrMsg: this.bsOn("staff") ? "اختر موظفاً من قائمة المسكّنين في هذه الوردية" : "اختر الموظف" });
        const snapshot = JSON.stringify(t), day = [r, a, D].join("-");
        const data = {
          shift: t.shift,
          eid: e?.eid || t.eid || "",
          loc: t.loc || "",
          langs: t.langs.slice(),
          bro: parseInt(t.bro || "0", 10) || 0,
          pros: parseInt(t.pros || "0", 10) || 0,
          pol: parseInt(t.pol || "0", 10) || 0,
        };
        if (!editId) Object.assign(data, { y: r, m: a, d: D });
        await this._irApply(editId ? "edit" : "create", editId ? { id: editId, data } : { data }, 1, (ack, result) => {
          if (!result.sameInput) {
            const old = result.submitted.data;
            if ((editId || [old.y, old.m, old.d].join("-") === day) && this.state.irEditId === editId) {
              this._irDraftStamp = { context: this._irContext(), base: this._irClone(ack.base) };
              this.setState({ irEditId: editId || ack.id, irSaveErrMsg: "تم تأكيد التقرير السابق؛ التعديل الأحدث باقٍ، راجعه ثم احفظ تعديله" });
            }
            return;
          }
          if (this.state.irEditId !== editId || JSON.stringify(this.state.irDraft) !== snapshot || [this.state.irYear, this.state.irMonth, this.state.irDay].join("-") !== day) {
            if (this.state.irEditId === editId && [this.state.irYear, this.state.irMonth, this.state.irDay].join("-") === day) {
              this._irDraftStamp = { context: this._irContext(), base: this._irClone(ack.base) };
              this.setState({ irEditId: editId || ack.id, irSaveErrMsg: "تم تأكيد التقرير؛ التعديل الأحدث باقٍ، راجعه ثم احفظ تعديله" });
            }
            return;
          }
          this._irDraftStamp = null;
          this.setState({ irDraft: editId ? this.emptyDraft() : { ...this.emptyDraft(), shift: t.shift }, irEditId: null, irSaveErrMsg: "" });
        });
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
        const collection = await this._irCollect(this._irRecordQuery());
        if (!collection.ok) { this.bsToast(collection.message); return; }
        const t = collection.rows.map((t) => {
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
        (monthTotal > 0 ? "cursor:pointer;color:var(--fg-x141414)" : "cursor:not-allowed;color:var(--fg-xcbd5e1);opacity:.6"),
      /* IRSZ-8: «ملفات» لمن يملك التصدير وحده · الفاصلُ حين يجتمع التصديرُ والحذف · زرُّ «حذف الكل» الصريح لمن يملك الحذف بلا تصدير */
      irLgSepOn: this.PC("export") && this.PC("del"),
      irLgDelOnly: !this.PC("export") && this.PC("del"),
      irLgDelBtnStyle:
        "height:34px;display:flex;align-items:center;gap:6px;font-size:11.5px;border:1px solid var(--danger-border);border-radius:10px;padding:0 10px;font-family:'Cairo',sans-serif;background:var(--danger-bg);color:var(--danger-text);" +
        (monthTotal > 0 ? "cursor:pointer" : "cursor:not-allowed;opacity:.55"),
      irLgClearAllAsk: () => {
        this.PC("del")
          ? 0 !== monthTotal
            ? this.setState({ irLgFilesOpen: !1, irLgClearAllConfirm: !0 })
            : this.bsToast("لا تقارير في " + L + " " + r + " هـ لحذفها — اختر شهراً فيه تقارير.")
          : this.permDeny();
      },
      irLgClearAllOpen: !!t.irLgClearAllConfirm,
      irLgClearAllStop: (t) => t.stopPropagation(),
      irLgClearAllCancel: () => this.setState({ irLgClearAllConfirm: !1 }),
      irLgClearAllMsg: "سيتم حذف جميع تقارير " + L + " " + r + " هـ نهائياً (" + KIVO.BassamCount(monthTotal, "تقرير|مسجّل") + ").",
      irLgClearAllDo: () => this._irApply("delete-month", { year: r, month: a }, monthTotal, ack => {
        this.setState({ irLgClearAllConfirm: !1, irLedgerPage: 1 });
        this.bsAck("تم حذف " + KIVO.BassamCount(ack.n, "تقرير", "g") + " من " + L + " " + r + " هـ.", "ok");
      }),
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
      irLgShownCount: String(filteredTotal),
      irLgTotalCount: String(monthTotal),
      irLedgerCount: KIVO.BassamCount(String(monthTotal), "تقرير") + "",
      irLedgerHas: filteredTotal > 0,
      irLedgerEmpty: 0 === filteredTotal,
      irLedgerEmptyMsg: 0 === monthTotal ? "لا تقارير مسجّلة في هذا الشهر بعد" : "لا نتائج مطابقة للبحث/الفلترة الحالية",
      irLedgerRows: tt.map((t) => {
        const { dayLabel: e, gregLabel: r, timeLabel: a } = J(t);
        const editReport = (e) => {
            e && e.stopPropagation && e.stopPropagation();
            this._irDraftStamp = null; this._irStampDraft(records.base, records._contextKey);

            this.setState({
              irYear: t.y,
              irMonth: t.m,
              irDay: t.d,
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
          };
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
          edit: editReport,
          ...this._rowMenu("ir" + t.id, [
            this.PC("edit")
              ? {
                  name: "تعديل التقرير",
                  color: "#b99751",
                  p1: "M12 20h9",
                  p2: "M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z",
                  run: editReport,
                }
              : null,
            this.PC("del")
              ? {
                  name: "حذف التقرير",
                  color: "#dc2626",
                  danger: !0,
                  p1: "M3 6h18",
                  p2: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
                  run: () => this._irApply("delete", { id: t.id }, 1),
                }
              : null,
          ]),
          del: () => {
            if (!this.PC("del")) return void this.permDeny();
            return this._irApply("delete", { id: t.id }, 1);
          },
        };
      }),
      ...KIVO.BassamCount.pair("irLedgerPgTotal", String(filteredTotal), "سجل", "g"),
      irLedgerPgRange: 0 === filteredTotal ? "0" : q + 1 + "–" + Math.min(q + Q, filteredTotal),
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
