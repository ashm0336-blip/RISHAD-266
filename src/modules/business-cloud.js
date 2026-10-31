/* Included by the two business modules through their existing logicParts.
   No global service or persistent store: each Component owns its read cache,
   exact request tickets and drafts retained for this browser session only. */
Component._businessSessions = new WeakMap();
Object.assign(Component.prototype, {
  _bcClone(value) { return JSON.parse(JSON.stringify(value)); },
  _bcInteger(value) { return Number.isSafeInteger(value) && value >= 0; },
  _bcContext() {
    try {
    const boot = window.__BS_BOOT || {}, user = KIVO.BassamAuth?.user?.();
    const dept = KIVO.BassamDepts?.active?.();
    if (!dept || !KIVO.BassamDepts?.has?.(dept) || (KIVO.BassamDepts.context && KIVO.BassamDepts.context().state !== "ready")) return null;
    if (this._bcGone || this._bcStopped || boot.srv !== 1 || boot.cf !== 1 || !boot.uid || !dept || !user ||
      String(user.id) !== String(boot.uid) || KIVO.__BS_SRV?.sesChanged?.()) return null;
    return { uid: String(boot.uid), dept: String(dept), key: String(boot.uid) + "\0" + String(dept) };
    } catch (error) { return null; }
  },
  _bcSame(context) { return !!context && this._bcContext()?.key === context.key; },
  _bcBase(base) { return !!base && ["epoch", ...this._businessSpec().resources].every(key => this._bcInteger(base[key])); },
  _bcBaseSame(a, b) { return this._bcBase(a) && this._bcBase(b) && ["epoch", ...this._businessSpec().resources].every(key => a[key] === b[key]); },
  _bcFieldsSame(fields, sent) { return !!sent && Object.keys(fields).every(key => JSON.stringify(fields[key]) === JSON.stringify(sent[key])); },
  _bcStateKey(view) { return this._businessSpec().prefix + view.charAt(0).toUpperCase() + view.slice(1); },
  _bcData(view) {
    const context = this._bcContext(), data = this.state[this._bcStateKey(view)];
    return context && data?._contextKey === context.key ? data : null;
  },
  _bcFailure(code, status = 0) {
    const messages = { session: "تغيّرت الجلسة — مسودتك باقية؛ أعد تسجيل الدخول قبل المتابعة", context: "تغيّرت الإدارة — ارجع إلى إدارة المسودة قبل الحفظ",
      conflict: "تغيّرت البيانات — حدّثها وراجع المسودة قبل إعادة الاعتماد", forbidden: "صلاحيتك لا تشمل هذا الإجراء؛ مسودتك باقية",
      invalid: "لم يصل تأكيد كامل من الخادم؛ أعد الإجراء نفسه لتأكيد طلبك", network: "تعذّر تأكيد العملية؛ مسودتك باقية، أعد الإجراء نفسه للمحاولة" };
    return { ok: 0, err: code, status, message: messages[code] || "رفض الخادم العملية؛ مسودتك باقية (" + code + ")" };
  },
  async _bcRequest(url, options, context) {
    if (!this._bcSame(context)) return this._bcFailure("session", 401);
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await window.fetch(url, { credentials: "same-origin", cache: "no-store", ...options, signal: controller.signal });
      if (!this._bcSame(context)) return this._bcFailure("session", 401);
      if (response.status === 401) { this._bcStopped = true; return this._bcFailure("session", 401); }
      let data; try { data = await response.json(); } catch (error) { return this._bcFailure("invalid", response.status); }
      if (!this._bcSame(context)) return this._bcFailure("session", 401);
      if (data?.err === "session-changed") { this._bcStopped = true; return this._bcFailure("session", 409); }
      if (!response.ok || data?.ok !== 1) {
        const denied = data?.denied || data;
        return { ...this._bcFailure(response.status === 403 ? "forbidden" : response.status === 409 ? "conflict" : String(data?.err || "invalid"), response.status), code: String(data?.err || ""), why: denied?.why, keys: denied?.keys || denied?.reasonKeys, details: denied?.details || denied?.detail };
      }
      return { ok: 1, data };
    } catch (error) { return this._bcFailure(this._bcSame(context) ? "network" : "session"); }
    finally { clearTimeout(timer); }
  },
  async _bcRead(view, options = {}, context = this._bcContext()) {
    if (!context) return this._bcFailure("session", 401);
    const query = new URLSearchParams({ uid: context.uid, dept: context.dept, view });
    Object.entries(options).forEach(([key, value]) => { if (value !== undefined && value !== null) query.set(key, String(value)); });
    const result = await this._bcRequest(this._businessSpec().path + "?" + query, { method: "GET" }, context);
    if (result.ok && (result.data.dept !== context.dept || result.data.view !== view || !this._bcBase(result.data.base) || !this._businessReadValid(view, result.data, options))) return this._bcFailure("invalid");
    return result;
  },
  async _bcCollect(options, context = this._bcContext()) {
    const field = this._businessSpec().rows, seen = new Set();
    let rows = [], cursor = "", first;
    do {
      const result = await this._bcRead("records", { ...options, limit: 200, page: cursor ? undefined : 1, cursor }, context);
      if (!result.ok) return result;
      const data = result.data, total = data.filteredTotal ?? data.total;
      if (first && (!this._bcBaseSame(first.base, data.base) || total !== (first.filteredTotal ?? first.total))) return this._bcFailure("conflict", 409);
      first = first || data; rows.push(...data[field]);
      cursor = data.next || "";
      if (rows.length > total || cursor && seen.has(cursor) || !cursor && rows.length !== total) return this._bcFailure("invalid");
      if (cursor) seen.add(cursor);
    } while (cursor);
    return { ok: 1, data: { ...first, [field]: rows, page: 1, pageSize: rows.length, next: null, prev: null } };
  },
  _bcInvalidate() {
    this._bcReads = new Map();
    const patch = { bcMessage: "", bcTick: (this.state.bcTick || 0) + 1 };
    this._businessSpec().views.forEach(view => { patch[this._bcStateKey(view)] = null; });
    this.setState(patch);
  },
  _bcEnsure(view, options = {}, all = false) {
    const context = this._bcContext(); if (!context) return;
    this._bcReads = this._bcReads || new Map();
    if (this._bcActor !== context.key) {
      this._bcActor = context.key; this._bcReads.clear();
      this._businessSpec().views.forEach(name => { this.state[this._bcStateKey(name)] = null; });
    }
    const signature = JSON.stringify([context.key, options, all]), prior = this._bcReads.get(view);
    if (prior?.signature === signature && (!prior.done || Date.now() - prior.at < 30000)) return;
    if (prior?.signature !== signature) this.state[this._bcStateKey(view)] = null;
    const token = { signature, at: Date.now() }; this._bcReads.set(view, token);
    setTimeout(async () => {
      const result = all ? await this._bcCollect(options, context) : await this._bcRead(view, options, context);
      if (this._bcReads.get(view) !== token || !this._bcSame(context)) return;
      token.done = true; token.failed = !result.ok;
      if (!result.ok) { token.message = result.message; this.setState({ [this._bcStateKey(view)]: null }); return; }
      const data = { ...result.data, _contextKey: context.key };
      this.setState({ [this._bcStateKey(view)]: data });
    }, 0);
  },
  _bcStamp(base) {
    const context = this._bcContext();
    if (!context) return null;
    const confirmed = this._businessSpec().views.map(view => this._bcData(view)).find(data => this._bcBase(data?.base));
    return { context, base: this._bcBase(base) ? this._bcClone(base) : confirmed ? this._bcClone(confirmed.base) : null };
  },
  async _bcMutate(op, fields, { stamp, count = 1 } = {}) {
    const context = this._bcContext(); if (!context) return this._bcFailure("session", 401);
    if (stamp && !this._bcSame(stamp.context)) return this._bcFailure("context");
    this._bcTickets = this._bcTickets || new Map();
    const intent = JSON.stringify([context.key, op, fields.id || fields.kind || fields.version || (op === "delete-month" ? [fields.year, fields.month] : "")]);
    let ticket = this._bcTickets.get(intent);
    if (!ticket) {
      const captured = stamp || this._bcStamp();
      if (captured && !captured.base) captured.base = this._bcStamp()?.base;
      if (!captured || !this._bcSame(captured.context) || !this._bcBase(captured.base)) return this._bcFailure("invalid");
      const keys = this._bcReasons?.get(intent), srv = KIVO.__BS_SRV;
      let reason;
      if (keys) {
        if (typeof srv?.askReason !== "function") return this._bcFailure("forbidden", 403);
        reason = await new Promise(resolve => srv.askReason("bsdept:" + context.dept + ":" + this._businessSpec().logical, keys, resolve));
        if (!reason || !this._bcSame(context)) return this._bcFailure("forbidden", 403);
      }
      const random = new Uint8Array(16); crypto.getRandomValues(random);
      const requestId = this._businessSpec().prefix + "-" + Array.from(random, value => value.toString(16).padStart(2, "0")).join("");
      const body = { dept: context.dept, uid: context.uid, requestId, base: this._bcClone(captured.base), op, ...this._bcClone(fields), ...(reason ? { reason } : {}) };
      ticket = { context, body, wire: JSON.stringify(body), count, intent }; this._bcTickets.set(intent, ticket);
    }
    if (ticket.pending) return ticket.pending.then(result => result.ok ? { ...result, matches: this._bcFieldsSame(fields, result.sent) } : result);
    const run = async () => {
      const result = await this._bcRequest(this._businessSpec().path + "/act", { method: "POST", headers: { "Content-Type": "application/json" }, body: ticket.wire }, ticket.context);
      if (!result.ok) {
        if (result.status >= 400 && result.status < 500 && result.err !== "session") {
          if (ticket.uncertain) { this._bcInvalidate(); return { ...result, message: "الطلب السابق ما زال غير مؤكد؛ راجع السجل قبل التخلي عنه أو بدء طلب آخر. مسودتك باقية" }; }
          this._bcTickets.delete(intent);
          if (result.why === "reason") { this._bcReasons = this._bcReasons || new Map(); this._bcReasons.set(intent, result.keys || []); }
          if (result.status === 409) {
            if (/^(?:(?:seized-|award-)?conflict|(?:award-)?restore-epoch-changed)$/.test(result.code)) this._businessConflict?.();
            this._bcInvalidate();
          }
        } else ticket.uncertain = true;
        return result;
      }
      const ack = result.data;
      if (!this._bcBase(ack.base) || !this._bcInteger(ack.rev) || ack.requestId !== ticket.body.requestId || ack.op !== ticket.body.op || !this._bcInteger(ack.n) || ticket.count !== null && ack.n !== ticket.count || ack.base.epoch !== ticket.body.base.epoch || !this._businessAckValid(ack, ticket.body)) { ticket.uncertain = true; return this._bcFailure("invalid"); }
      this._bcTickets.delete(intent); this._bcReasons?.delete(intent); this._bcInvalidate();
      return { ok: 1, data: ack, sent: ticket.body, context: ticket.context };
    };
    ticket.pending = run(); this.setState({ bcPending: true });
    try { const result = await ticket.pending; if (this._bcSame(context)) this.setState({ bcMessage: result.ok ? "" : result.message }); return result.ok ? { ...result, matches: this._bcFieldsSame(fields, result.sent) } : result; }
    finally { ticket.pending = null; if (this._bcSame(context)) this.setState({ bcPending: [...this._bcTickets.values()].some(value => value.pending) }); }
  },
  _bcMount() {
    this._bcGone = false;
    const context = this._bcContext(), sessions = Component._businessSessions.get(window), key = context && context.key + "\0" + (this.props?.solo || "");
    const saved = sessions?.get(key);
    if (saved) {
      sessions.delete(key); this._bcTickets = saved.tickets; this._bcReasons = saved.reasons; this._businessRestore(saved.draft);
    }
    this._bcOnRemote = event => {
      const context = this._bcContext(), dept = context?.dept || this._bcActor?.split("\0")[1];
      const keys = event?.detail?.keys || (event?.detail?.key ? [event.detail.key] : []);
      if (event.type !== "bassam:authz" && !keys.some(value => {
        const key = String(value), scoped = /^bsdept:([^:]+):(.+)$/.exec(key);
        if (/^bassam_(?:auth_users|perms|depts|gdepts|platform)_v1$/.test(key)) return true;
        if (scoped && scoped[1] !== dept) return false;
        return this._businessSpec().changed.test(scoped ? scoped[2] : key);
      })) return;
      this._bcInvalidate();
    };
    window.addEventListener("bassam:remote", this._bcOnRemote); window.addEventListener("bassam:authz", this._bcOnRemote);
  },
  _bcDispose() {
    const draft = this._businessRetain(), context = draft?.context || this._bcTickets?.values().next().value?.context || this._bcContext();
    if (context && (draft || this._bcTickets?.size)) {
      let sessions = Component._businessSessions.get(window); if (!sessions) { sessions = new Map(); Component._businessSessions.set(window, sessions); }
      sessions.set(context.key + "\0" + (this.props?.solo || ""), { draft, tickets: this._bcTickets || new Map(), reasons: this._bcReasons });
    }
    this._bcGone = true; this._bcReads = new Map();
    if (this._bcOnRemote) { window.removeEventListener("bassam:remote", this._bcOnRemote); window.removeEventListener("bassam:authz", this._bcOnRemote); }
  },
  _bcStatusVals(required = []) {
    const data = required.map(view => this._bcData(view)), complete = data.every(Boolean);
    const mixed = complete && data.some(value => !this._bcBaseSame(data[0].base, value.base));
    const loading = !complete || !!this._bcReads && [...this._bcReads.values()].some(value => !value.done);
    const readError = required.map(view => this._bcReads?.get(view)).find(read => read?.failed)?.message;
    const message = this.state.bcMessage || readError || (mixed ? "تغيّرت البيانات أثناء القراءة؛ حدّث النتائج للحصول على نسخة متسقة" : "");
    return { bcReady: complete && !mixed, bcNotice: loading || !!message || !!this.state.bcPending, bcMessage: message || (this.state.bcPending ? "جارٍ تأكيد العملية — مسودتك باقية حتى يصل التأكيد" : "جارٍ قراءة البيانات من الخادم"), bcCanRefresh: !this.state.bcPending,
      bcRefresh: () => this._bcInvalidate() };
  },
});
