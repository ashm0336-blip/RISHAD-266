/* V7 · د5-د2: ورقةُ برنامج الجدولة يجيب عنها مالكُه بالاسم على الناقل (انظر _bsCapOk)؛ بغيابه مطفأة */
const _bsSched = "@staff.usable@1";
/* V7 · د5-د2: ورقةُ التشغيل الميداني كذلك — يجيب عنها مالكُه بالناقل؛ بغيابه مطفأة */
const _bsPlan = "@plan.usable@1";
/* V7 · د5-هـ: ورقةُ التقرير اليومي كذلك — يجيب عنها مالكُه بالناقل؛ بغيابه مطفأة */
const _bsDr = "@dreport.usable@1";
/* V7 · د5-هـ: ورقةُ الجولات (المتابعة اليومية) كذلك — يجيب عنها مالكُه بالناقل؛ بغيابه مطفأة */
const _bsRd = "@daily.usable@1";
function _bsCapOk(c) {
  try {
    const P = KIVO.BassamPerm;
    if (!c) return !0;
    /* V7 · د5-د2: «@اسم» = سؤالٌ معلن على الناقل (ورقةُ برنامجٍ يجيب عنها مالكُه؛ بغيابه لا) — وغيرُه ورقةٌ في سقف الإدارة كما كان */
    return String(c)
      .split("|")
      .some((g) => g.split("&").every((k) => ("@" === k.charAt(0) ? !!KIVO.bus.read(k.slice(1)) : !P || !P.on || !!P.on(k))));
  } catch (e) {
    return !0;
  }
}
class Component extends KIVO.BassamPageKit.base(DCLogic, ["admin+award+daily+dreport+employees+irshad+plan+profile+seized+staff+tasks","employees+staff"]) {
  /* عنوان التبويب #/employees/<tab> — يُقرأ من خطّاف الهيكل عند كل تصيير ويُكتب عند كل تبديل؛ نسخ solo (داخل مؤشرات الإدارة) لا تشارك */ _bsHT(
    t,
  ) {
    try {
      if (this.props && this.props.solo) return;
      const h = String(location.hash || ""),
        p = "#/employees";
      if (h.indexOf(p) !== 0) return;
      const w = t ? p + "/" + t : p;
      h !== w && history.replaceState && history.replaceState(null, "", location.pathname + location.search + w);
    } catch (e) {}
  }
  /* الفحص العميق 2026-10-21 (R1 · ES-1): تبويبُ العنوان يُطبَّق متزامناً قبل حساب القيم — كان setTimeout(setState) فيُرسم «بيانات الموظفين»
     بجدولها أولاً ثم يختفي. والتبويبُ المزروع من الحالة المحفوظة (__bsSeeded) يُكتب في العنوان كما كانت الاستعادةُ تفعل */
  /* F01: عنوانُ الحالة الفارغة بنوع الوحدة النشطة — «القسم» أو «الإدارة» */
  _emNoneTitle() {
    let al = "الإدارة";
    try { const D = KIVO.BassamDepts; if (D && D.unitAl) al = D.unitAl(D.active()); } catch (e) { al = "الإدارة"; }
    return "لا يوجد موظفون في " + al + " بعد";
  }
  _bsHR() {
    try {
      if (this.props && this.props.solo) return;
      const o = KIVO.__BS_OPEN_TAB,
        P = KIVO.BassamPerm || {},
        V = ["data"@@SYS:emp.tabs.custody@@],   /* KIVO_265 · مستودع العهد: تبويبٌ ثالث يخضع لورقة «عهد الموظفين» نفسِها */
        on = (t) => -1 !== V.indexOf(t) && (P.subOn ? P.subOn("emps", @@SYS:emp.tabs.custodyLeaf@@t) : !0),
        shown = () => {
          const c = this.state.empTab;   /* العنوانُ يحمل التبويبَ المعروض فعلاً (لا الافتراضيَّ دائماً) */
          return "data" !== c && on(c) ? c : "";
        };
      if (!o || o.page !== "employees") {
        const sd = this.__bsSeeded;
        sd && void 0 !== sd.empTab && ((this.__bsSeeded = null), this._bsHT(shown()));
        return;
      }
      KIVO.__BS_OPEN_TAB = null;
      this.__bsSeeded = null;
      const t = o.tab;
      if (!on(t)) {
        this._bsHT(shown());
        return;
      }
      this.state.empTab !== t && (this.state = { ...this.state, empTab: t });
      this._bsHT(t);
    } catch (e) {}
  }
  setState(t, e) {
    if (t && typeof t === "object" && this.state) {
      const employeeEditor = (t.addOpen === true && !this.state.addOpen) || (t.inlineEdit != null && t.inlineEdit !== this.state.inlineEdit);
      const optionEditor = t.ddEdit && t.ddEdit !== this.state.ddEdit;
      if (employeeEditor || optionEditor) {
        const begun = KIVO.__BS_SRV.operations.begin(this, employeeEditor ? "employee-editor" : "employee-options");
        if (!begun.ok) { this.bsToast("يوجد طلب حفظ لم يُحسم — عد إلى المسودة وأعد الطلب نفسه قبل فتح محرر آخر."); return; }
      }
    }
    const r = super.setState(t, e);
    try {
      t &&
        "object" == typeof t &&
        void 0 !== t.empTab &&
        this._bsHT(
          (() => {
            const n = { ...this.state, ...t };
            return n.empTab;
          })(),
        );
    } catch (x) {}
    return r;
  }
  bsToast(t, e) {
    try {
      const r = e || "err";
      let n = document.getElementById("bs-toast");
      n || ((n = document.createElement("div")), (n.id = "bs-toast"), document.body.appendChild(n));
      const a =
        "ok" === r
          ? ["var(--toast-ok)", "var(--bg-toast)", "var(--toast-ok-bd)", "✓"]
          : "warn" === r
            ? ["var(--toast-warn)", "var(--bg-toast)", "var(--toast-warn-bd)", "⚠"]
            : ["var(--toast-err)", "var(--bg-toast)", "var(--toast-err-bd)", "⚠"];
      (n.setAttribute(
        "style",
        "position:fixed;top:16px;left:50%;transform:translateX(-50%) translateY(-8px);z-index:2147483000;max-width:min(560px,92vw);direction:rtl;text-align:right;font-family:'Cairo',sans-serif;font-size:13px;font-weight:600;line-height:1.9;color:" +
          a[0] +
          ";background:" +
          a[1] +
          ";border:1px solid " +
          a[2] +
          ";border-radius:14px;padding:12px 18px;box-shadow:var(--shadow-elevated);opacity:0;transition:opacity .22s ease, transform .22s ease;pointer-events:none",
      ),
        (n.textContent = a[3] + "  " + String(null == t ? "" : t)),
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
  _bsLiveReload(K) {
    const h = (t) =>
      (K || []).some((k) => {
        k = String(k);
        return k === t || k.slice(-t.length - 1) === ":" + t;
      });
    const s = this.state;
    if (
      s.addOpen ||
      null != s.editIdx ||
      s.inlineEdit ||
      s.confirmDel ||
      s.confirmBulk ||
      null != s.viewIdx@@SYS:emp.live.custodyOpen@@
    )
      return !1;
    const p = {};
    h("bassam_employees_v1") && (p.employees = this.loadEmp());
    h("bassam_options_v1") && (p.options = this.loadOptions());
@@SYS:emp.live.custodyRefresh@@    Object.keys(p).length && this.setState(p);
    return !0;
  }
  loadEmp() {
    const rows = KIVO.__BS_SRV.operations.get("bassam_employees_v1");
    // Identity and legacy-field migration belong to the canonical server migration.
    return Array.isArray(rows) ? rows : [];
  }
  async persist(t, action = "employee-editor", intent = t) {
    const result = await KIVO.__BS_SRV.operations.commit(this, action, intent, (draft) => draft.set("bassam_employees_v1", t));
    if (!result || result.ok !== 1) this.bsToast(result && result.committed
      ? "ثبّت الخادم الحفظ، وتعذّرت قراءة البيانات الحالية — احتُفظ بالطلب؛ أعد التحقق بالمحتوى نفسه."
      : result && result.uncertain
      ? "لم يصل تأكيد الحفظ — المسودة محفوظة في هذه الجلسة. أعد الحفظ بالمحتوى نفسه للتحقق من الطلب."
      : "لم يُحفظ التغيير — راجع البيانات والصلاحية ثم أعد فتح المحرر.");
    return !!result && result.ok === 1;
  }
  EMP_COLS = ["اسم الموظف", "الجنس", "رقم الهوية", "الرقم الوظيفي", "رقم الجوال", "البريد الإلكتروني", "نوع التوظيف", "حساب الدخول"];
  normAr(t) {
    return String(null == t ? "" : t)
      .toLowerCase()
      .replace(/ـ/g, "")
      .replace(/[ً-ْ]/g, "")
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/[ؤئ]/g, "ء")
      .trim();
  }
  empKey(t) {
    if (!t) return "";
    const e = String(t.nid || "").trim();
    if (e) return e;
    const r = String(t.empno || "").trim();
    if (r) return "E:" + r;
    const n = this.normAr(t.name);
    return n ? "N:" + n + "|" + String(t.phone || "").trim() : "";
  }
  emailOk(t) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(t || "").trim());
  }
  dupCheck(t, e, r, n, a, i) {
    const o = String(r || "").trim(),
      s = String(n || "").trim(),
      l = String(a || "").trim(),
      d = String(i || "")
        .trim()
        .toLowerCase();
    for (let r = 0; r < (t || []).length; r++) {
      if (r === e) continue;
      const n = t[r];
      if (n) {
        if (o && String(n.nid || "").trim() === o) return "رقم الهوية " + o + " مسجّل بالفعل للموظف: " + (n.name || "—");
        if (l && String(n.phone || "").trim() === l) return "رقم الجوال " + l + " مسجّل بالفعل للموظف: " + (n.name || "—");
        if (s && String(n.empno || "").trim() === s) return "الرقم الوظيفي " + s + " مسجّل بالفعل للموظف: " + (n.name || "—");
        if (
          d &&
          String(n.email || "")
            .trim()
            .toLowerCase() === d
        )
          return "البريد الإلكتروني " + d + " مسجّل بالفعل للموظف: " + (n.name || "—");
      }
    }
    try {
      const t = KIVO.BassamAuth;
      if (t && t.mgrNumHolder) {
        const e = o ? t.mgrNumHolder(o) : "";
        if (e) return "رقم الهوية " + o + " مسجّل بالفعل في " + e;
        const r = l ? t.mgrNumHolder(l) : "";
        if (r) return "رقم الجوال " + l + " مسجّل بالفعل في " + r;
      }
    } catch (t) {}
    return "";
  }
  _empTransition() { return KIVO.BassamEmpImp && KIVO.BassamEmpImp.transition; }
  _empKey(row) {
    return typeof row === "string" ? row : String(row && (row.eid || row.nid || row.name) || "");
  }
  async _empDeleteOpen(indices, bulk) {
    if (!this.PC("del")) return this.permDeny();
    if (this._empDeleteBusy || (this._empDeleteDraft && this._empDeleteDraft.uncertain)) return;
    const rows = indices.map(index => this.state.employees[index]).filter(Boolean), keys = rows.map(row => this._empKey(row));
    if (!keys.length || keys.some(key => !key) || new Set(keys).size !== keys.length) return this.bsToast("تعذر تحديد الموظفين بمعرّفات فريدة؛ حدّث القائمة قبل الحذف", "warn");
    this._empDeleteDraft = { keys, snapshot: null, ticket: null, uncertain: false, needsReview: false, rows, bulk: !!bulk, displayRows: this.state.employees };
    this.setState({ confirmBulk: !!bulk, confirmDel: bulk ? null : indices[0], empDeleteError: "", empDeleteBusy: true, empDeleteReview: false });
    return this._empDeleteReview();
  }
  async _empDeleteReview() {
    const draft = this._empDeleteDraft, API = this._empTransition();
    if (!draft || !API || this._empDeleteBusy || draft.uncertain) return;
    this._empDeleteBusy = true; this.setState({ empDeleteBusy: true, empDeleteError: "" });
    try {
      const result = await API.read("delete"); if (this._empDeleteDraft !== draft) return;
      if (!result.ok) { this.setState({ empDeleteError: result.message, empDeleteReview: true }); return; }
      const matches = new Map(); result.data.employees.forEach(row => { const key = this._empKey(row); if (draft.keys.includes(key)) { if (!matches.has(key)) matches.set(key, []); matches.get(key).push(row); } });
      if (draft.keys.some(key => !matches.has(key) || matches.get(key).length !== 1)) {
        draft.snapshot = null; draft.needsReview = true;
        this.setState({ empDeleteError: "تغيّر تحديد الموظفين على الخادم؛ ألغِ التأكيد وحدّد الموظفين من القائمة الحالية", empDeleteReview: false }); return;
      }
      draft.rows = draft.keys.map(key => matches.get(key)[0]); draft.snapshot = result; draft.ticket = null; draft.needsReview = false;
      draft.finalRows = result.data.employees.filter(row => !draft.keys.includes(this._empKey(row)));
      this.setState({ empDeleteReview: false, empDeleteError: "" });
    } finally { this._empDeleteBusy = false; this.setState({ empDeleteBusy: false }); }
  }
  _empDeleteCancel() {
    const draft = this._empDeleteDraft;
    if (this._empDeleteBusy || (draft && draft.uncertain)) { this.bsToast("لم يُحسم تأكيد الحذف؛ أعد محاولة الطلب نفسه قبل مغادرة التأكيد", "warn"); return; }
    this._empDeleteDraft = null; this.setState({ confirmDel: null, confirmBulk: false, empDeleteError: "", empDeleteReview: false });
  }
  async _empDeleteCommit() {
    const draft = this._empDeleteDraft, API = this._empTransition();
    if (!draft || !API || this._empDeleteBusy) return;
    if (!this.PC("del")) return this.permDeny();
    if (!draft.snapshot || draft.needsReview) { this.bsToast("راجع بيانات الإدارة الحالية قبل تأكيد الحذف", "warn"); return; }
    this._empDeleteBusy = true; this.setState({ empDeleteBusy: true, empDeleteError: "" });
    try {
      if (!draft.ticket) draft.ticket = await API.prepare("delete", { finalRows: draft.finalRows, deleteMode: draft.bulk && !draft.finalRows.length ? "all" : "selected" }, draft.snapshot);
      if (draft.ticket.ok === 0) { this.setState({ empDeleteError: draft.ticket.message }); draft.ticket = null; return; }
      const result = await API.send(draft.ticket); if (result.ticket) draft.ticket = result.ticket; if (this._empDeleteDraft !== draft) return;
      if (!result.ok) {
        draft.needsReview = result.err === "conflict"; draft.uncertain = ["network", "invalid", "session"].includes(result.err);
        if (!draft.uncertain && !draft.needsReview && !["reason", "reason-cancelled"].includes(result.err)) draft.ticket = null;
        this.setState({ empDeleteError: result.message, empDeleteReview: draft.needsReview }); this.bsToast(result.message, "warn"); return;
      }
      this._empDeleteDraft = null;
      const unchanged = this.state.employees === draft.displayRows;
      this.setState({ ...(unchanged ? { employees: draft.finalRows, selected: {} } : {}), confirmDel: null, confirmBulk: false, empDeleteError: "", empDeleteReview: false });
      this.bsToast(draft.bulk && !draft.finalRows.length ? "اعتمد الخادم حذف جميع الموظفين وتنظيف بياناتهم المرتبطة" : "اعتمد الخادم حذف الموظفين وتنظيف بياناتهم المرتبطة");
      try { const sync = KIVO.__BS_SRV; if (sync && sync.resync) sync.resync(false); } catch (_) {}
    } finally { this._empDeleteBusy = false; this.setState({ empDeleteBusy: false }); }
  }

@@SYS:emp.logic.custody@@  impToast(t) {
    (clearTimeout(this._impT), this.setState({ impToast: t }), (this._impT = setTimeout(() => this.setState({ impToast: "" }), 3200)));
  }
  /* V7 · د5-هـ (أمن ١): رسالةُ النجاح بعد إقرار الخادم (كما bsAck في الإدارة) — الكتابةُ المحلية ليست حفظاً */
  impAck(t) {
    const A = KIVO.BassamAck;
    return (A && A.ack ? Promise.resolve(A.ack()).catch(() => !1) : Promise.resolve(!0)).then((r) => {
      r === !0 ? this.impToast(t) : this.impToast(r && r.denied ? "لم يُحفظ — رفضه الخادم" : (A && A.PENDING) || "لم يُحفظ بعد");
      return r === !0;
    });
  }
  _rowMenu(t, e) {
    const r = (e || []).filter(Boolean),
      n = this.state.rowMenu === t;
    return {
      rmHas: r.length > 0,
      rmOpen: n,
      rmToggle: (e) => {
        (e && e.stopPropagation && e.stopPropagation(), this.setState((e) => ({ rowMenu: e.rowMenu === t ? null : t })));
      },
      rmBtnStyle:
        "width:28px;height:28px;border-radius:8px;cursor:pointer;padding:0;display:inline-flex;align-items:center;justify-content:center;transition:all .15s;border:1px solid " +
        (n
          ? "#b99751;background:var(--bg-a185151810p1);color:var(--fg-x8a6f35)"
          : "#E1E1E1;background:var(--bg-xffffff);color:var(--fg-x64748b)"),
      rmItems: r.map((t) => ({
        name: t.name,
        p1: t.p1 || "",
        p2: t.p2 || "",
        run: (e) => {
          (e && e.stopPropagation && e.stopPropagation(), this.setState({ rowMenu: null }), t.run && t.run());
        },
        style:
          "width:30px;height:30px;border-radius:9px;cursor:pointer;padding:0;display:inline-flex;align-items:center;justify-content:center;transition:all .15s;background:var(--bg-xffffff);border:1px solid " +
          (t.danger ? "rgba(220,38,38,.28);color:var(--fg-xdc2626)" : "#EEF0F2;color:" + (t.color || "var(--fg-x53565a)")),
      })),
    };
  }
  PC(t) {
    try {
      return !!KIVO.BassamPerm && KIVO.BassamPerm.can("emps", t || "view");
    } catch (t) {
      return !1;
    }
  }
  _emCanWrite() {
    return this.PC("add") || this.PC("edit") || this.PC("del");
  }
  _emPermVals() {
    const t = this._emCanWrite();
    return {
      empPmAdd: this.PC("add"),
      empPmEdit: this.PC("edit"),
      empPmDel: this.PC("del"),
      empPmExport: this.PC("export"),
      empPmWrite: t,
      empPmReadOnly: !t,
      /* الموجة 2 · ES-6: «ملفات» لا تحمل إلا التصدير والطباعة — فلا تظهر لمن لا يملك التصدير (كانت تُفتح فارغةً لمن يملك الإضافة وحدها) */
      empPmFiles: this.PC("export") || this.PC("add"),
      empPmNoteStyle:
        "display:flex;align-items:center;gap:8px;padding:9px 14px;border-radius:12px;background:var(--bg-a1001161390p06);border:1px solid var(--bd-a1001161390p22);font-size:11.5px;font-weight:600;color:var(--fg-x475569);line-height:1.8",
    };
  }
  /* V7 · د1-د: استيراد Excel — كلُّه في 590 (hostVals) */
  impVals() {
    const t = KIVO.BassamEmpImp;
    return t && t.hostVals && t.hostVals(this);
  }
  permDeny() {
    try {
      this.bsToast("صلاحيتك على صفحة الموظفين لا تشمل هذا الإجراء — راجع مدير الإدارة");
    } catch (t) {}
  }
  async setEmp(t, intent = t) {
    if (this.PC("add") || this.PC("edit") || this.PC("del")) {
      // Account removal is performed only by the explicit employee transition API.
      if (!await this.persist(t, "employee-editor", intent)) return false;
      this.setState({ employees: this.loadEmp(), selected: {} });
      this.autoActivate(this.loadEmp());
      return true;
    }
    this.permDeny(); return false;
  }
  autoActivate(t) {
    try {
      const e = KIVO.BassamAuth;
      if (!e || !e.activateStaffMany || !e.staffMap) return;
      const r = e.isStaff && e.isStaff(),
        n = (e.user && e.user()) || {};
      if (r && !n.mgr) return;
      const a = e.staffMap() || {},
        i = (t) => (KIVO.BassamEmp && KIVO.BassamEmp.key ? KIVO.BassamEmp.key(t) : t.eid || t.nid || t.name || ""),
        o = (t || []).filter(
          (t) => t && !a[i(t)] && (String(t.nid || "").trim() || String(t.phone || "").trim()) && String(t.empno || "").trim(),
        );
      if (!o.length || this._autoAct) return;
      ((this._autoAct = !0),
        Promise.resolve(e.activateStaffMany(o.map((t) => ({ ekey: i(t), nid: t.nid, phone: t.phone, empno: t.empno, name: t.name }))))
          .then((t) => {
            ((this._autoAct = !1),
              t &&
                t.n &&
                (this.bsAck(
                  "فُعّل تلقائياً " +
                    KIVO.BassamCount(t.n, ["حساب دخول", "حسابان", "حسابين", "حسابات", "حساباً", "حساب"]) +
                    (t.skipped && t.skipped.length ? " — وتُخطّي " + t.skipped.length + ": " + t.skipped[0] : ""),
                  "ok",
                ),
                this.setState({ permTick: (this.state.permTick || 0) + 1 })));
          })
          .catch(() => {
            this._autoAct = !1;
          }));
    } catch (t) {
      this._autoAct = !1;
    }
  }
  blankForm() {
    return { name: "", empno: "", nid: "", phone: "", email: "", type: "", work: "", gender: "", shift: "بدون تسكين" };
  }
  state = {
    rowMenu: null,
    empTab: "data",
@@SYS:emp.state.custody@@    pulseNow: new Date(),
    tab: "employees",
    search: "",
    view: "list",
    sortField: "",
    sortDir: "asc",
    selected: {},
    fType: "all",
    fGender: "all",
    fAcct: "all",
    addOpen: !1,
    editIdx: null,
    confirmDel: null,
    confirmBulk: !1,
    viewIdx: null,
    fddOpen: null,
    filesOpen: !1,
    impTick: 0,
    form: this.blankForm(),
    employees: this.loadEmp(),
    options: this.loadOptions(),
    ddOpen: null,
    ddNew: "",
    inlineEdit: null,
    inlineForm: {},
    iddOpen: null,
    iddNew: "",
    page: 1,
    perPage: 10,
  };
  async iddAdd(t) {
    if (!t) return;
    const e = (this.state.iddNew || "").trim();
    if (!e) return;
    const r = { ...this.state.options };
    r[t].includes(e) || (r[t] = [...r[t], e]);
    if (await this.saveOptions(r)) this.setState((r) => ({ inlineForm: { ...r.inlineForm, [t]: e }, iddNew: "", iddOpen: null }));
  }
  loadOptions() {
    const e = KIVO.__BS_SRV.operations.get("bassam_options_v1");
    if (e && Array.isArray(e.type) && Array.isArray(e.work)) return e;
    return { type: ["دائم", "موسمي", "متعاون"], work: ["ميداني", "إداري"] };
  }
  async saveOptions(t) {
    if (this.PC("add") || this.PC("edit") || this.PC("del")) {
      const result = await KIVO.__BS_SRV.operations.commit(this, "employee-options", t, (draft) => draft.set("bassam_options_v1", t));
      if (!result || result.ok !== 1) { this.bsToast("لم يصل تأكيد حفظ القائمة — احتُفظ بالمسودة؛ أعد الحفظ نفسه للتحقق."); return false; }
      this.setState({ options: this.loadOptions() }); return true;
    }
    this.permDeny(); return false;
  }
  async ddAdd(t) {
    if (!t) return;
    const e = (this.state.ddNew || "").trim();
    if (!e) return;
    const r = { ...this.state.options };
    r[t].includes(e) || (r[t] = [...r[t], e]);
    if (await this.saveOptions(r)) this.setState((r) => ({ form: { ...r.form, [t]: e }, ddNew: "", ddOpen: null }));
  }
  ddDel(t, e, r) {
    const n = { ...this.state.options };
    if (n[t].length <= 1) return;
    const a = (this.state.employees || []).filter((r) => r && r[t] === e).length,
      go = async () => {
        n[t] = n[t].filter((t) => t !== e);
        if (!await this.saveOptions(n)) return;
        const i = "inline" === r ? "inlineForm" : "form";
        this.state[i] && this.state[i][t] === e && this.setState((e) => ({ [i]: { ...e[i], [t]: "" } }));
      };
    a
      ? KIVO
          .bsConfirm({
            title: "حذف خيار مستعمل",
            msg:
              "يستخدم هذا الخيار " +
              KIVO.BassamCount(a, "موظف") +
              " — ستبقى القيمة مسجّلة " +
              KIVO.BassamCount.agr(a, "لديه", "لديهما", "لديهم") +
              " بعد الحذف. هل تريد حذف «" +
              e +
              "»؟",
            ok: "حذف الخيار",
            danger: !0,
          })
          .then((y) => {
            y && go();
          })
      : go();
  }
  ddEditStart(t, e, r) {
    this.setState({ ddEdit: { key: t, name: e, which: r }, ddEditVal: e });
  }
  ddEditCancel() {
    this.setState({ ddEdit: null, ddEditVal: "" });
  }
  async ddEditSave() {
    const t = this.state.ddEdit;
    if (!t) return;
    const e = (this.state.ddEditVal || "").trim();
    if (!e || e === t.name) return void this.ddEditCancel();
    if ((this.state.options[t.key] || []).includes(e)) return void this.bsToast("«" + e + "» موجود في القائمة أصلاً", "warn");
    if (!this.PC("edit")) return void this.permDeny();
    const r = { ...this.state.options };
    r[t.key] = (r[t.key] || []).map((r) => (r === t.name ? e : r));
    let n = 0;
    const a = (this.state.employees || []).map((r) => (r && r[t.key] === t.name ? (n++, { ...r, [t.key]: e }) : r));
    const result = await KIVO.__BS_SRV.operations.commit(this, "employee-options", { edit: t, value: e }, (draft) => {
      draft.set("bassam_options_v1", r);
      if (n) draft.set("bassam_employees_v1", a);
    });
    if (!result || result.ok !== 1) { this.bsToast("لم يصل تأكيد إعادة التسمية — احتُفظ بالمسودة؛ أعد الحفظ نفسه للتحقق."); return; }
    const i = { ddEdit: null, ddEditVal: "", options: this.loadOptions() };
    (n && (i.employees = a),
      (this.state.form || {})[t.key] === t.name && (i.form = { ...this.state.form, [t.key]: e }),
      (this.state.inlineForm || {})[t.key] === t.name && (i.inlineForm = { ...this.state.inlineForm, [t.key]: e }));
    const o = { type: "fType", work: "fWork" }[t.key];
    (o && this.state[o] === t.name && (i[o] = e),
      this.setState(i),
      this.bsAck(n ? "عُدّل إلى «" + e + "» ورُحّل إلى " + KIVO.BassamCount(n, "موظف", "g") + "" : "عُدّل الاسم إلى «" + e + "»", "ok"));
  }
  PERM_PAGES() {
    const t = KIVO.BassamPerm,
      e = { emps: ["view", "add", "edit", "del", "export"], admin: ["view", "export"] },
      r = t && t.ALL_ACTS ? t.ALL_ACTS.slice() : ["view", "add", "edit", "del", "approve", "export"],
      n = t && t.PAGE_REG ? t.PAGE_REG : [];
    return n.length
      ? n.map((t) => ({ k: t.key, n: t.name, acts: e[t.key] || r }))
      : [
          { k: "emps", n: "موظفو الإدارة", acts: e.emps },
@@SYS:emp.permPages.staff@@@@SYS:emp.permPages.plan@@@@SYS:emp.permPages.daily@@          { k: "admin", n: "الإعدادات", acts: e.admin },
        ];
  }
  bsMenusPatch() {
    return {
      ddOpen: !1,
      iddOpen: null,
      ddEdit: null,
      ddNew: "",
      iddNew: "",
      fddOpen: null,
      rowMenu: null,
@@SYS:emp.close.custody@@      accOpen: null,
      filesOpen: !1,
    };
  }
  _bsOutsideMenus(t) {
    try {
      for (var e = t.target, r = !1; e && e !== document.body; ) {
        if (e.style && ("absolute" === e.style.position || "fixed" === e.style.position)) {
          r = !0;
          break;
        }
        e = e.parentElement;
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
              e = !1,
              o = n.state;
            if (
              (Object.keys(a).forEach(function (r) {
                (o[r] !== i[r] && (t = !0), o[r] && (e = !0));
              }),
              t || r || !e)
            )
              return;
            n.setState(a);
          } catch (t) {}
        }, 0));
    } catch (t) {}
  }
  componentDidMount() {
    ((this._bsOutM = (t) => this._bsOutsideMenus(t)), document.addEventListener("click", this._bsOutM, !0));
    try {
      this._bsPulseLast = this._bsMinKey();
      this._pt = setInterval(() => {
        if (document.hidden) return;
        const t = this._bsMinKey();
        t !== this._bsPulseLast && ((this._bsPulseLast = t), this.setState({ pulseNow: new Date() }));
      }, 3e4);
    } catch (t) {}
  }
  _bsMinKey() {
    const e = new Date();
    return e.getHours() + ":" + e.getMinutes() + "|" + this._bsClockKey(e);
  }
  _bsClockKey(t) {
    const e = t || new Date();
    let r = "";
    try {
      const h = KIVO.BassamCal.hParts(new Date());   /* V7 · د5-د2: يومُ اليوم الهجري من الخدمة — المفتاحُ بالصيغة نفسِها (شهر/يوم/سنة AH) */
      r = h.m + "/" + h.d + "/" + h.y + " AH";
    } catch (t) {}
    return e.getHours() + "|" + r;
  }
  _bsPulseKey(t) {
    return (
      this._bsClockKey(t) +
      "|" +
      (KIVO.__dcWrite || 0) +
      "|" +
      (KIVO.__dcWorld || 0) +
      "|" +
      ((KIVO.BassamDepts && KIVO.BassamDepts.active && KIVO.BassamDepts.active()) || "")
    );
  }
  componentWillUnmount() {
    this._bsOutM && document.removeEventListener("click", this._bsOutM, !0);
    try {
      clearInterval(this._pt);
    } catch (t) {}
  }
  _pulseVals(t) {
    return KIVO.__bsMemo ? KIVO.__bsMemo(this, "_pulseVals", this._bsPulseKey(t), () => this._pulseVals0(t)) : this._pulseVals0(t);
  }
  _pulseVals0(t) {
    const e = t || new Date(),
      r = e.getHours(),
      n = (() => {
        try {
          const t = KIVO.__BS_SRV.operations.text("bassam_employees_v1");
          if (t) {
            const e = JSON.parse(t);
            if (Array.isArray(e)) return e;
          }
        } catch (t) {}
        return [];
      })(),
      a = (() => {
        try {
          const e = KIVO.bus.read("staff.months@1", "copy");
          if (e && "object" == typeof e) {
            const t = KIVO.BassamCal.hParts(new Date());   /* V7 · د5-د2 */
            return e[t.y + "-" + t.m] || {};
          }
        } catch (t) {}
        return {};
      })(),
      i = (() => {
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
      })(),
      o = (() => {
        try {
          const e = KIVO.bus.read("staff.locks@1", "copy");
          if (e && "object" == typeof e) return e;
        } catch (t) {}
        return {};
      })(),
      s = i.map((t) => t.name),
      l = (function () {
        try {
          const t = KIVO.bus.read("dreport.doc@1") || {},   /* V7 · د5-هـ: التقريرُ بالناقل؛ بغيابه لا تقرير */
            e = KIVO.BassamCal.hParts(new Date()),   /* V7 · د5-د2 */
            n = t[e.y + "-" + e.m + "-" + e.d],
            a = {};
          return (
            n &&
              n.shifts &&
              Object.keys(n.shifts).forEach((t) => {
                ((n.shifts[t] || {}).roster || []).forEach((t) => {
                  t && t.ekey && "lv" === t.st && (a[t.ekey] = t.lvk || "إجازة");
                });
              }),
            a
          );
        } catch (t) {
          return {};
        }
      })(),
      d = (t) => {
        const e = KIVO.BassamEmp && KIVO.BassamEmp.key ? KIVO.BassamEmp.key(t) : t.eid || t.nid || t.name || "";
        return l[e] || "";
      },
      c = (t) => {
        const e = (KIVO.BassamEmp ? KIVO.BassamEmp.entry(a, t) : a[t.eid || t.nid || t.name || ""]) || {},
          r = void 0 !== e.shift ? e.shift : t.shift;
        return { shift: s.includes(r) ? r : "", rest: void 0 !== e.rest ? e.rest : [], muk: !0 === e.muk, lvToday: d(t) };
      },
      p = e.toLocaleDateString("ar-SA-u-nu-latn", { weekday: "long" }),
      m = n.length;
    let h = 0,
      u = 0,
      g = 0,
      f = 0;
    const b = {},
      A = {},
      x = {},
      y = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"],
      v = {};
    i.forEach((t) => {
      ((b[t.name] = 0), (A[t.name] = 0), (x[t.name] = 0), (v[t.name] = {}));
    });
    const w = {},
      S = {},
      k = [];
    n.forEach((t) => {
      const e = c(t),
        r = !!e.lvToday,
        n = !r && e.rest.some((t) => t === p || "ال" + t === p || t === "ال" + p);
      (e.shift &&
        (h++,
        b[e.shift]++,
        n && A[e.shift]++,
        r && x[e.shift]++,
        (e.rest || []).forEach((t) => {
          const r = -1 !== y.indexOf(t) ? t : "ال" + t;
          -1 !== y.indexOf(r) && (v[e.shift][r] = (v[e.shift][r] || 0) + 1);
        })),
        r && f++,
        n && (u++, k.push(t)),
        e.muk && g++);
      const a = (t.type || "").trim() || "غير محدد",
        i = (t.work || "").trim() || "غير محدد";
      ((w[a] = (w[a] || 0) + 1), (S[i] = (S[i] || 0) + 1));
    });
    const M = m - u - f,
      E = Object.keys(o).filter((t) => o[t]).length,
      z = m ? Math.round((h / m) * 100) : 0,
      O = m ? (h / m) * 100 : 0,
      C = m ? Math.round((M / m) * 100) : 0,
      F = m ? (M / m) * 100 : 0;
    let P = 1448,
      T = 1;
    try {
      const t = KIVO.BassamCal.hParts(e);   /* V7 · د5-د2 */
      ((P = t.y), (T = t.m));
    } catch (t) {}
    const I = !!o[P + "-" + T],
      j = Object.keys(o).filter((t) => o[t] && 0 === t.indexOf(P + "-")).length;
    let N = {};
    try {
      const e = KIVO.bus.read("staff.months@1", "copy");
      e && "object" == typeof e && (N = e);
    } catch (t) {}
    const Y = (t) => {
        if (!Object.prototype.hasOwnProperty.call(N, t)) return !1;
        const e = N[t];
        return (
          !(!e || "object" != typeof e) &&
          (Object.keys(e).length
            ? n.some((t) => null != (KIVO.BassamEmp ? KIVO.BassamEmp.entry(e, t) : e[t.eid || t.nid || t.name || ""]))
            : m > 0)
        );
      },
      G = Y(P + "-" + T),
      B = I ? 100 : 0,
      L = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"],
      W = {};
    (L.forEach((t) => {
      W[t] = 0;
    }),
      n.forEach((t) => {
        c(t).rest.forEach((t) => {
          void 0 !== W[t] && W[t]++;
        });
      }));
    const D = Math.max(...L.map((t) => W[t]), 0),
      Z = L.filter((t) => W[t] === D && D > 0).join(" و") || "",
      R = L.reduce((t, e) => t + W[e], 0),
      X = Math.ceil(R / 7),
      U = h > 0 || R > 0 || g > 0,
      H = R > 0,
      V = m && U && H ? Math.round((X / D) * 100) : 0,
      q = m && U && H ? (X / D) * 100 : 0,
      Q = U && H ? C : 0,
      K = Math.max(1, Math.ceil(0.25 * m)),
      J = L.filter((t) => W[t] > K),
      _ = {};
    n.forEach((t) => {
      const e = c(t);
      e.shift && (_[t.name] = e.shift);
    });
    const $ = (() => {
        const t = {
          has: !1,
          covPct: 0,
          covRaw: 0,
          apPct: 0,
          placed: 0,
          need: 0,
          floors: 0,
          apFloors: 0,
          shifts: [],
          needBy: {},
          placedBy: {},
        };
        try {
          /* V7 · د5-د2: مواقعُ الشهر من مالكها بالناقل (ترمي كقراءة المورد إن لم يُقرأ)؛ بغيابه undefined ⇒ لا خطة */
          const r = KIVO.bus.read("plan.sites@1", P + "-" + T);
          if (!Array.isArray(r) || !r.length) return t;
          ((t.has = !0),
            (t.floors = r.length),
            (t.apFloors = r.filter((t) => !!t.approved).length),
            (t.apPct = t.floors ? Math.round((100 * t.apFloors) / t.floors) : 0));
          let n = i;
          try {
            const t = KIVO.__BS_SRV.operations.get("bassam_shift_options_v1") || [];
            Array.isArray(t) && t.length && (n = t);
          } catch (t) {}
          t.shifts = n.map((t) => t.name);
          const a = {},
            o = {};
          t.shifts.forEach((t) => {
            ((a[t] = 0), (o[t] = 0));
          });
          let s = 0,
            l = 0;
          /* V7 · د5-ج: حارسُ الغياب — «نموذجُ عناصر الموقع» (الاحتياج) خدمةُ برنامجٍ قد يغيب؛ بغيابه لا عنصرَ له احتياج: الأعدادُ صفر والحساب يمضي */
          ((KIVO.BassamNeed ? r : []).forEach((e) => {
            (e.zones || [])
              .filter((t) => !t.off && KIVO.BassamNeed.has(t, n))
              .concat((e.gates || []).filter((t) => !t.closed && KIVO.BassamNeed.has(t, n)))
              .concat((e.marks || []).filter((t) => !t.off && KIVO.BassamNeed.has(t, n)))
              .forEach((e) => {
                ((s += KIVO.BassamNeed.tot(e, n)),
                  t.shifts.forEach((t) => {
                    a[t] += KIVO.BassamNeed.of(e, t);
                  }),
                  (e.emp || []).forEach((t) => {
                    l++;
                    const e = _[t] || "";
                    e && void 0 !== o[e] && o[e]++;
                  }));
              });
          }),
            (t.need = s),
            (t.placed = l),
            (t.needBy = a),
            (t.placedBy = o),
            (t.covRaw = s ? Math.min(100, (100 * l) / s) : 0),
            (t.covPct = Math.round(t.covRaw)));
        } catch (t) {}
        return t;
      })(),
      tt = (() => {
        const t = { on: !1, pct: 0, raw: 0, hi: null, lo: null, rows: [] },
          e = ($.shifts || []).filter((t) => ($.needBy || {})[t] > 0);
        if (!$.has || e.length < 2) return t;
        ((t.on = !0),
          (t.rows = e.map((t) => {
            const e = $.needBy[t],
              r = $.placedBy[t] || 0;
            return { name: t, need: e, placed: r, f: Math.min(100, (100 * r) / e) };
          })));
        let r = t.rows[0],
          n = t.rows[0];
        return (
          t.rows.forEach((t) => {
            (t.f > r.f && (r = t), t.f < n.f && (n = t));
          }),
          (t.hi = r),
          (t.lo = n),
          (t.raw = Math.max(0, 100 - (r.f - n.f))),
          (t.pct = Math.round(t.raw)),
          t
        );
      })(),
      et = (() => {
        const t = { rate: {}, days: 0 };
        try {
          const e = KIVO.bus.read("dreport.doc@1") || {},   /* V7 · د5-هـ: التقريرُ بالناقل؛ بغيابه لا تقرير */
            r = Object.keys(e).filter((t) => 0 !== t.indexOf("m:") && 0 !== t.indexOf("__") && e[t] && e[t].shifts);
          r.sort((t, e) => {
            const r = t.split("-").map(Number),
              n = e.split("-").map(Number);
            return 1e4 * n[0] + 100 * n[1] + n[2] - (1e4 * r[0] + 100 * r[1] + r[2]);
          });
          const n = {},
            a = {};
          (r.slice(0, 14).forEach((r) => {
            const i = e[r].shifts;
            let o = !1;
            (Object.keys(i).forEach((t) => {
              const e = i[t];
              if (!e || !e.pulled) return;
              const r = Array.isArray(e.roster) ? e.roster : [];
              r.length &&
                ((o = !0), (n[t] = (n[t] || 0) + r.length), (a[t] = (a[t] || 0) + r.filter((t) => "ab" === (t.st || "pr")).length));
            }),
              o && t.days++);
          }),
            Object.keys(n).forEach((e) => {
              n[e] && (t.rate[e] = a[e] / n[e]);
            }));
        } catch (t) {}
        return t;
      })(),
      rt = i
        .map((t) => {
          const e = t.name,
            r = b[e] || 0,
            n = A[e] || 0,
            a = x[e] || 0,
            i = et.rate[e] || 0,
            o = Math.max(0, r - n - a),
            s = Math.round(o * i),
            l = Math.max(0, o - s),
            d = ($.needBy || {})[e] || 0,
            c = d ? l / d : null;
          return { nm: e, color: t.color, nom: r, rst: n, lv: a, exp: s, net: l, need: d, f: c };
        })
        .filter((t) => t.need > 0 || t.nom > 0),
      nt = (() => {
        const t = [];
        try {
          (KIVO.bus.read("plan.sites@1", P + "-" + T) || []).forEach((e) => {   /* V7 · د5-د2: بالناقل؛ بغيابه لا مواقع */
            const r = {};
            ((e.gates || []).forEach((t) => {
              const e = String(null == t.num ? "" : t.num).trim();
              e && (r[e] = (r[e] || 0) + 1);
            }),
              Object.keys(r).forEach((n) => {
                r[n] > 1 && t.push((e.name ? e.name + " — " : "") + "رقم " + n + " (" + KIVO.BassamCount(r[n], "باب") + ")");
              }));
          });
        } catch (t) {}
        return t;
      })(),
      at = tt.on ? tt.pct : 0,
      it = tt.on ? tt.raw : 0,
      ot = $.has && $.need ? $.covPct : 0,
      st = $.has && $.need ? $.covRaw : 0,
      lt = $.has ? $.apPct : 0,
      dt = { assign: 20, avail: 20, balance: 10, shbal: 10, lock: 10, cover: 20, plan: 10 },
      ct = m
        ? Math.round(
            (z * dt.assign) / 100 +
              (Q * dt.avail) / 100 +
              (V * dt.balance) / 100 +
              (at * dt.shbal) / 100 +
              (B * dt.lock) / 100 +
              (ot * dt.cover) / 100 +
              (lt * dt.plan) / 100,
          )
        : 0,
      pt = KIVO.BassamCal.hText(e, { month: "long" }),
      mt = [
        {
          group: "جاهزية القوى العاملة — من الجدول الشهري",
          groupOn: !0,
          name: "نسبة التسكين",
          desc: "المسكّنون في ورديات من إجمالي الموظفين",
          weight: dt.assign,
          value: z,
          raw: O,
          color: "#2a76aa",
          bg: "rgba(14,165,233,0.12)",
        },
        {
          name: "حضور اليوم",
          desc: U
            ? H
              ? "المتاحون بعد خصم راحات اليوم وإجازاته السارية"
              : "لم تُسجَّل أي أيام راحة بعد — سجّلها في الجدول الشهري ليُحتسب الحضور"
            : "بانتظار العمل على الجدول الشهري — يبدأ الحساب بعد التسكين أو تسجيل الراحات",
          weight: dt.avail,
          value: Q,
          raw: U && H ? F : 0,
          color: "#008450",
          bg: "rgba(0,132,80,0.1)",
        },
        {
          name: "توازن الراحات",
          desc: U
            ? H
              ? "مدى توزّع الراحات على أيام الأسبوع — التركّز في يوم واحد (" + (Z || "—") + ") يخفضه، والتوزيع المتساوي يوصله لـ 100%"
              : "لم تُسجَّل أي أيام راحة بعد — لا يمكن قياس توازنها"
            : "بانتظار العمل على الجدول الشهري — يبدأ الحساب بعد التسكين أو تسجيل الراحات",
          weight: dt.balance,
          value: V,
          raw: q,
          color: "#b45309",
          bg: "rgba(245,158,11,0.12)",
        },
        {
          name: "توازن الورديات",
          desc: $.has
            ? tt.on
              ? "تحقّق احتياج كل وردية: أعلاها «" +
                tt.hi.name +
                "» " +
                Math.round(tt.hi.f) +
                "٪ وأدناها «" +
                tt.lo.name +
                "» " +
                Math.round(tt.lo.f) +
                "٪ — الفارق " +
                KIVO.BassamCount(Math.round(tt.hi.f - tt.lo.f), "نقطة") +
                ""
              : "يحتاج وردّيتين فأكثر لهما احتياج محدَّد في الميدان ليُقاس التوازن بينهما"
            : "لم تُنشأ خطة ميدانية لهذا الشهر بعد — يُقاس التوازن مقابل احتياج كل وردية",
          weight: dt.shbal,
          value: at,
          raw: it,
          color: "#2f8f86",
          bg: "rgba(8,145,178,0.12)",
        },
        {
          name: "اعتماد جدول " + pt,
          desc: "هل جدول الشهر الحالي معتمد ومقفل؟",
          weight: dt.lock,
          value: B,
          color: "#9A7E40",
          bg: "rgba(185,151,81,0.14)",
        },
        {
          group: "جاهزية الميدان — من التشغيل الميداني",
          groupOn: !0,
          name: "تغطية الموقع",
          desc: $.has
            ? $.need
              ? "المسكَّنون على عناصر الميدان " + $.placed + " من احتياج " + $.need + " (مجموع احتياج الورديات)"
              : "لم يُحدَّد احتياج لأي منطقة أو باب أو معلم — حدّده في محرّر العنصر ليُحتسب"
            : "لم تُنشأ خطة ميدانية لهذا الشهر بعد — أنشئها من «التشغيل الميداني» ليُحتسب",
          weight: dt.cover,
          value: ot,
          raw: st,
          color: "#2f8f86",
          bg: "rgba(13,148,136,0.12)",
        },
        {
          name: "اعتماد الخطة الميدانية",
          desc: $.has ? "المواقع المعتمدة " + $.apFloors + " من " + $.floors : "لا خطة لهذا الشهر بعد",
          weight: dt.plan,
          value: lt,
          color: "#9c3d6b",
          bg: "rgba(124,58,237,0.12)",
        },
      ].map((t) => ({
        ...t,
        groupOn: !!t.groupOn,
        group: t.group || "",
        weightLabel: t.weight + "%",
        valueLabel: KIVO.bsPct(null == t.raw ? t.value : t.raw) + "%",
        points: Math.round(((t.value * t.weight) / 100) * 10) / 10 + "",
        max: String(t.weight),
        barW: String(t.value),
      })),
      ht = [];
    m > 0 &&
      G &&
      (h < m && ht.push(KIVO.BassamCount(m - h, "موظف") + " بدون تسكين"),
      H || ht.push("لم تُسجَّل أي أيام راحة"),
      H && C < 100 && ht.push(u + " في راحة اليوم" + (f ? " و" + f + " في إجازة اليوم" : "") + " (الحضور " + KIVO.bsPct(F) + "%)"),
      H && V < 100 && ht.push("توازن الراحات " + KIVO.bsPct(q) + "%"),
      tt.on && at < 100 && ht.push("توازن الورديات " + KIVO.bsPct(it) + "% (أدناها " + tt.lo.name + ")"),
      I || ht.push("اعتماد جدول " + pt));
    const ut =
        (0 === u && m > 0 && H ? "الحضور مكتمل اليوم ✓ — " : "") +
        (ht.length ? "الناقص لرفع المؤشر: " + ht.join("، ") + "." : "كل المعايير مكتملة — جاهزية تامة."),
      gt =
        0 === m
          ? {
              label: "بدون بيانات",
              P: "#64748b",
              A: "#94a3b8",
              G: "rgba(148,163,184,0.12)",
              sub: "أضف الموظفين وأنشئ الجدول الشهري ليبدأ حساب مؤشر الجاهزية من بياناتك الحقيقية.",
            }
          : G
            ? ct >= 85
              ? { label: "ممتاز", P: "#008450", A: "#00A357", G: "rgba(0,163,87,0.10)", sub: ut }
              : ct >= 65
                ? { label: "جيد", P: "#b99751", A: "#E6D29D", G: "rgba(185,151,81,0.12)", sub: ut }
                : { label: "يحتاج متابعة", P: "#d97706", A: "#fbbf24", G: "rgba(245,158,11,0.12)", sub: ut }
            : {
                label: "بدون جدول",
                P: "#64748b",
                A: "#94a3b8",
                G: "rgba(148,163,184,0.12)",
                sub: "لم يُنشأ الجدول الشهري بعد — أنشئه من «الجدول الشهري» في القائمة الجانبية ليبدأ حساب المؤشر.",
              },
      ft = 2 * Math.PI * 85,
      bt = (ft * ct) / 100,
      At = [
        {
          tipText: "العدد الكلي للموظفين من صفحة موظفي الإدارة — أي إضافة أو حذف هناك ينعكس هنا فوراً.",
          label: "إجمالي الموظفين",
          value: String(m),
          sub: "من صفحة موظفي الإدارة",
          color: "#b99751",
          bg: "rgba(185,151,81,0.1)",
          p1: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
          p2: "M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
          badge: "",
        },
        {
          tipText:
            "الموظفون بعد خصم راحات اليوم ومن أُشّرت له إجازة في تقرير اليوم — يتغير تلقائياً كل يوم من الجدول الشهري والتقرير اليومي.",
          label: "متاحون اليوم",
          value: G ? String(M) : "—",
          sub: m ? (G ? C + "% من الفريق" : "لم يُنشأ الجدول الشهري بعد") : "لا يوجد موظفون بعد",
          color: "#059669",
          bg: "rgba(16,185,129,0.1)",
          p1: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
          p2: "m9 12 2 2 4-4",
          badge: m > 0 && U && M === m ? (0 === R ? "لا توجد راحات مسجّلة" : "الكل متاح") : "",
        },
        {
          tipText:
            "من يصادف اليوم الحالي أحد أيام راحتهم الأسبوعية المسجلة في الجدول الشهري — ومن اجتمعت له راحة وإجازة اليوم يُحسب في الإجازة لا هنا.",
          label: "في راحة اليوم",
          value: G ? String(u) : "—",
          sub: G ? "حسب أيام الراحة" + (f ? " · وفي إجازة اليوم " + f : "") : "لم يُنشأ الجدول الشهري بعد",
          color: "#b45309",
          bg: "rgba(245,158,11,0.1)",
          p1: "M10 2v2",
          p2: "M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1",
          badge: "",
        },
        {
          tipText: "الموظفون الذين لديهم وردية مسندة في الجدول الشهري. النسبة = المسكّنون ÷ الإجمالي.",
          label: "مسكّنون في ورديات",
          value: G ? String(h) : "—",
          sub: G ? z + "% نسبة التسكين" : "لم يُنشأ الجدول الشهري بعد",
          color: "#2a76aa",
          bg: "rgba(14,165,233,0.1)",
          p1: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
          p2: "M12 6v6l4 2",
          badge: "",
        },
        {
          tipText: "من فُعّل لهم زر التكليف في الجدول الشهري — التكليف حالة مستقلة عن الراحة والوردية.",
          label: "المكلفون",
          value: G ? String(g) : "—",
          sub: m ? (G ? Math.round((g / m) * 100) + "% من الفريق" : "لم يُنشأ الجدول الشهري بعد") : "من الجدول الشهري",
          color: "#9c3d6b",
          bg: "rgba(124,58,237,0.08)",
          p1: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
          p2: "m16 11 2 2 4-4",
          badge: "",
        },
        {
          tipText:
            "أشهر السنة " +
            P +
            " هـ المقفلة والمعتمدة — نفس ما تعرضه شبكة الأشهر أدناه. الاعتماد بنقرة مزدوجة على كرت الشهر في الجدول الشهري.",
          label: "جداول معتمدة",
          value: String(j),
          sub: "من 12 شهراً في " + P + " هـ · التراكمي " + E,
          color: "#008450",
          bg: "rgba(0,132,80,0.08)",
          p1: "M7 11V7a5 5 0 0 1 10 0v4",
          p2: "M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z",
          badge: "",
        },
      ].map((t, e) => ({ ...t, delay: (0.05 + 0.06 * e).toFixed(2) + "s", hasBadge: !!t.badge })),
      xt = 2 * Math.PI * 44,
      yt = i.map((t) => {
        return { name: t.name, color: ((e = t.color), "#b99751" === e ? "#8a6f35" : e), count: b[t.name] || 0, resting: A[t.name] || 0 };
        var e;
      }),
      vt = yt.concat([{ name: "بدون تسكين", color: "#94a3b8", count: m - h }]).filter((t) => t.count > 0);
    let wt = 0;
    const St = vt.map((t) => {
        const e = m ? t.count / m : 0,
          r = Math.max(e * xt - (vt.length > 1 ? 2.5 : 0), 1.5),
          n = {
            color: t.color,
            dash: r.toFixed(1) + " " + (xt - r).toFixed(1),
            rot: String((360 * wt - 90).toFixed(1)),
            tip: t.name + ": " + t.count,
          };
        return ((wt += e), n);
      }),
      kt = Math.max(...yt.map((t) => t.count), 0),
      Mt = yt.length ? Math.min(...yt.map((t) => t.count)) : 0,
      Et = yt.filter((t) => t.count === kt && kt > 0).map((t) => t.name),
      zt = yt.filter((t) => t.count === Mt).map((t) => t.name),
      Ot = yt
        .concat([{ name: "بدون تسكين", color: "#94a3b8", count: m - h, resting: null }])
        .map((t) => ({
          name: t.name,
          color: t.color,
          count: String(t.count),
          tip:
            "«" +
            t.name +
            "»: " +
            KIVO.BassamCount(t.count, ["مسكَّن واحد", "مسكَّنان", "مسكَّنَين", "مسكَّنين", "مسكَّناً", "مسكَّن"]) +
            " (" +
            (m ? KIVO.bsPct((t.count / m) * 100) : "0") +
            "٪ من " +
            m +
            ")" +
            (null !== t.resting && void 0 !== t.resting ? " — حاضرها اليوم " + (t.count - t.resting) + " وفي راحة " + t.resting : "") +
            " · ميزان توزيع القوة على الورديات — الفجوات هنا تفسّر عجز معامل التغطية.",
          pct: m ? KIVO.bsPct((t.count / m) * 100) : "0",
          isTop: 1 === Et.length && t.name === Et[0],
          isLow: 1 === zt.length && t.name === zt[0] && kt !== Mt,
          hasBreakdown: null !== t.resting && void 0 !== t.resting,
          presentToday: null !== t.resting && void 0 !== t.resting ? String(t.count - t.resting) : "",
          restingToday: null !== t.resting && void 0 !== t.resting ? String(t.resting) : "",
        })),
      Ct = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"],
      Ft = {};
    (Ct.forEach((t) => {
      Ft[t] = 0;
    }),
      n.forEach((t) => {
        c(t).rest.forEach((t) => {
          void 0 !== Ft[t] && Ft[t]++;
        });
      }));
    const Pt = Ct.map((t) => m - Ft[t]),
      Tt = Math.min(...Pt),
      It = Math.max(...Pt),
      jt = Math.max(It - Tt, 1),
      Nt = Ct.findIndex((t) => t === p || "ال" + t === p),
      Yt = (t) => 326 - 52 * t,
      Gt = (t) => 96 - ((t - Tt) / jt) * 58,
      Bt = Pt.map((t, e) => ({ x: Yt(e), y: Gt(t) })),
      Lt = ((t) => {
        if (t.length < 2) return "";
        let e = "M " + t[0].x.toFixed(1) + " " + t[0].y.toFixed(1);
        for (let r = 0; r < t.length - 1; r++) {
          const n = t[r - 1] || t[r],
            a = t[r],
            i = t[r + 1],
            o = t[r + 2] || i,
            s = a.x + (i.x - n.x) / 6,
            l = a.y + (i.y - n.y) / 6,
            d = i.x - (o.x - a.x) / 6,
            c = i.y - (o.y - a.y) / 6;
          e +=
            " C " +
            s.toFixed(1) +
            " " +
            l.toFixed(1) +
            ", " +
            d.toFixed(1) +
            " " +
            c.toFixed(1) +
            ", " +
            i.x.toFixed(1) +
            " " +
            i.y.toFixed(1);
        }
        return e;
      })(Bt),
      Wt = Lt + " L " + Bt[Bt.length - 1].x.toFixed(1) + " 100 L " + Bt[0].x.toFixed(1) + " 100 Z",
      Dt = Pt.map((t, e) => (t === Tt ? e : -1)).filter((t) => t >= 0),
      Zt = (t) => Tt < It && Dt.includes(t),
      Rt = Pt.map((t, e) => {
        const r = e === Nt,
          n = r ? 13 : 9,
          a = Zt(e) ? "#dc2626" : r ? "#b99751" : "#008450",
          i = ((Yt(e) / 340) * 100).toFixed(2),
          o = Gt(t).toFixed(1);
        return {
          tip: Ct[e] + ": " + KIVO.BassamCount(t, ["متاح واحد", "متاحان", "متاحَين", "متاحين", "متاحاً", "متاح"]),
          dotStyle:
            "position:absolute;left:" +
            i +
            "%;top:" +
            o +
            "px;width:" +
            n +
            "px;height:" +
            n +
            "px;margin:-" +
            n / 2 +
            "px 0 0 -" +
            n / 2 +
            "px;border-radius:9999px;background:" +
            a +
            ";border:2px solid var(--bd-xffffff);box-shadow:var(--shadow-card)" +
            (r ? ",0 0 0 3px rgba(185,151,81,0.22)" : "") +
            ";cursor:help;transition:transform .15s;z-index:2",
        };
      }),
      Xt = [],
      Ut = (t, e, r, n) => ({
        label: String(e),
        valStyle:
          "position:absolute;left:" +
          ((Yt(t) / 340) * 100).toFixed(2) +
          "%;top:" +
          (Gt(e) + (n ? -22 : 10)).toFixed(1) +
          "px;transform:translateX(-50%);font-size:10px;font-weight:600;color:" +
          r +
          ";font-family:'Cairo',sans-serif;font-feature-settings:'tnum';background:var(--bg-a2552552550p85);padding:0 4px;border-radius:6px;z-index:1",
      });
    Tt < It && (Dt.forEach((t) => Xt.push(Ut(t, Tt, "#dc2626", !1))), Xt.push(Ut(Pt.indexOf(It), It, "#047857", !0)));
    const Ht = Ct.map((t, e) => ({
        name: t.replace("ال", ""),
        color: e === Nt ? "#9A7E40" : Zt(e) ? "#dc2626" : "#94a3b8",
        weight: e === Nt || Zt(e) ? "900" : "600",
      })),
      Vt = Dt.map((t) => Ct[t]),
      qt =
        0 === m
          ? "لا توجد بيانات بعد — أضف الموظفين من صفحة «موظفي الإدارة» ليُحسب منحنى الجاهزية الأسبوعي."
          : G
            ? Tt === It
              ? "الجاهزية متساوية طوال الأسبوع (" +
                KIVO.BassamCount(It, ["متاح واحد", "متاحان", "متاحَين", "متاحين", "متاحاً", "متاح"]) +
                " يومياً)."
              : 1 === Vt.length
                ? "أضعف يوم: " +
                  Vt[0] +
                  " (" +
                  KIVO.BassamCount(Tt, ["متاح واحد", "متاحان", "متاحَين", "متاحين", "متاحاً", "متاح"]) +
                  " فقط) — أعد توزيع الراحات أو عزز التغطية فيه."
                : "أضعف الأيام (متعادلة): " +
                  Vt.join(" و") +
                  " (" +
                  KIVO.BassamCount(Tt, ["متاح واحد", "متاحان", "متاحَين", "متاحين", "متاحاً", "متاح"]) +
                  " في كلٍّ منها) — وزّع الراحات على الأيام الأخرى."
            : "لم يُنشأ الجدول الشهري بعد — أنشئه من «الجدول الشهري» في القائمة الجانبية لتُحسب جاهزية الأسبوع.",
      Qt =
        0 !== m && G
          ? Tt === It
            ? "background:var(--bg-a0163870p07);border:1px solid var(--bd-a0163870p2);color:var(--fg-x047857)"
            : "background:var(--bg-a22038380p06);border:1px solid var(--bd-a22038380p2);color:var(--fg-xb91c1c)"
          : "background:var(--bg-a1481631840p08);border:1px solid var(--bd-a1481631840p25);color:var(--fg-x64748b)",
      Kt = ["#8a6f35", "#2f8f86", "#2f5f8a", "#a5566e", "#1e9a66", "#9c3d6b"],
      Jt = (t) => {
        const e = Object.keys(t).sort((e, r) => t[r] - t[e]),
          r = e.reduce((e, r) => e + t[r], 0) || 1;
        return e.map((e, n) => ({
          name: e,
          count: String(t[e]),
          color: Kt[n % Kt.length],
          pct: KIVO.bsPct((t[e] / r) * 100),
          tip: e + ": " + KIVO.BassamCount(t[e], "موظف") + " (" + Math.round((t[e] / r) * 100) + "%)",
        }));
      },
      _t = Jt(w),
      $t = Jt(S),
      te = (t) => {
        const e = 2 * Math.PI * 38,
          r = t.reduce((t, e) => t + +e.count, 0) || 1;
        let n = 0;
        return t.map((a) => {
          const i = +a.count / r,
            o = Math.max(i * e - (t.length > 1 ? 2.5 : 0), 1.5),
            s = { color: a.color, dash: o.toFixed(1) + " " + (e - o).toFixed(1), rot: String((360 * n - 90).toFixed(1)), tip: a.tip };
          return ((n += i), s);
        });
      },
      ee = [_t, $t].map((t, e) => ({
        title: 0 === e ? "نوع التوظيف" : "نوع العمل",
        segs: t,
        donut: te(t),
        centerPct: t.length ? t[0].pct + "%" : "—",
        centerName: t.length ? t[0].name : "لا بيانات",
      })),
      re = {
        critical: {
          chip: "عاجل",
          style: "background:var(--bg-a22038380p05);border:1px solid var(--bd-a22038380p25)",
          icon: "background:var(--bg-a22038380p1);color:var(--fg-xdc2626)",
          chipS: "background:var(--bg-a22038380p1);color:var(--fg-xdc2626);border:1px solid var(--bd-a22038380p3)",
        },
        warning: {
          chip: "مهم",
          style: "background:var(--bg-a245158110p05);border:1px solid var(--bd-a245158110p25)",
          icon: "background:var(--bg-a245158110p12);color:var(--fg-xb45309)",
          chipS: "background:var(--bg-a245158110p12);color:var(--fg-xb45309);border:1px solid var(--bd-a245158110p3)",
        },
        ok: {
          chip: "مستقر",
          style: "background:var(--bg-a0163870p05);border:1px solid var(--bd-a0163870p22)",
          icon: "background:var(--bg-a0163870p1);color:var(--fg-x047857)",
          chipS: "background:var(--bg-a0163870p1);color:var(--fg-x047857);border:1px solid var(--bd-a0163870p3)",
        },
      },
      ne = [];
    if (G && $.has && $.need > 0) {
      const t = rt.filter((t) => null != t.f && t.f >= 1.1).sort((t, e) => e.f - t.f);
      (rt
        .filter((t) => null != t.f && t.f < 1)
        .sort((t, e) => t.f - e.f)
        .slice(0, 2)
        .forEach((e) => {
          const r = e.need - e.net,
            n = t[0];
          ne.push({
            cap: _bsSched + "&" + _bsPlan + "&dist",   /* V7 · د5-د2: ورقةُ الجدول بالناقل */
            s: "critical",
            title: "عجز اليوم في " + e.nm + " — " + KIVO.BassamCount(r, "موظف") + "",
            action:
              "صافي قوتها اليوم " +
              e.net +
              " مقابل احتياج " +
              e.need +
              " (معامل " +
              Math.round(100 * e.f) / 100 +
              ")." +
              (n
                ? " أقرب مصدر: " +
                  n.nm +
                  " الفائضة بـ" +
                  (n.net - n.need) +
                  " (معاملها " +
                  Math.round(100 * n.f) / 100 +
                  ") — انقل أو كلّف منها " +
                  Math.min(r, n.net - n.need) +
                  "."
                : " لا وردية فائضة اليوم — قلّص التغطية من المواقع الأدنى أولوية أو اطلب دعماً."),
            p1: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",
            p2: "M12 9v4",
          });
        }),
        rt
          .filter((t) => null != t.f && t.f >= 1 && t.f < 1.1)
          .slice(0, 1)
          .forEach((t) => {
            ne.push({
              cap: _bsSched + "&" + _bsPlan + "&dist",   /* V7 · د5-د2: ورقةُ الجدول بالناقل */
              s: "warning",
              title: t.nm + " بلا احتياط اليوم",
              action:
                "صافيها " +
                t.net +
                " واحتياجها " +
                t.need +
                " — أي غيابٍ واحد يخرق التغطية. أبقِ " +
                Math.max(1, Math.ceil(0.08 * t.need)) +
                " على الأقل احتياطاً غير مسكَّن.",
              p1: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
              p2: "M12 8v4",
            });
          }));
      const e = [];
      (rt.forEach((t) => {
        if (!t.need) return;
        const r = b[t.nm] || 0;
        let n = null,
          a = null;
        if (
          (y.forEach((e) => {
            const i = r - (v[t.nm][e] || 0);
            ((!n || i < n.av) && (n = { d: e, av: i }), (!a || i > a.av) && (a = { d: e, av: i }));
          }),
          n && n.av < t.need && a && a.av > t.need)
        ) {
          const r = Math.min(t.need - n.av, a.av - t.need);
          e.push({
            gap: t.need - n.av,
            txt:
              t.nm +
              ": " +
              n.d +
              " ينزل متاحوها إلى " +
              n.av +
              " من احتياج " +
              t.need +
              " — انقل " +
              KIVO.BassamCount(r, "راحة", "g") +
              " من " +
              n.d +
              " إلى " +
              a.d +
              " (الفائض فيه " +
              (a.av - t.need) +
              ")",
          });
        }
      }),
        e.length &&
          (e.sort((t, e) => e.gap - t.gap),
          ne.push({
            cap: _bsSched,
            s: "critical",
            title: "راحاتٌ تُغرق أياماً بعينها",
            action:
              e
                .slice(0, 2)
                .map((t) => t.txt)
                .join(" · ") +
              (e.length > 2 ? " · ومثلها في " + KIVO.BassamCount(e.length - 2, "وردية|أخرى", "g") + "" : "") +
              ".",
            p1: "M8 2v4",
            p2: "M3 10h18",
          })),
        $.need > 0 &&
          2 * $.placed < $.need &&
          ne.push({
            cap: _bsPlan + "&dist",
            s: 10 * $.placed < $.need ? "critical" : "warning",
            title: "الميدان بلا تسكين يذكر",
            action:
              "سُكِّن " +
              $.placed +
              " فقط من احتياج " +
              $.need +
              " (" +
              Math.round((100 * $.placed) / Math.max(1, $.need)) +
              "٪) — استعمل «التوزيع الآلي» في وضع «توزيع» بعدسة الأبواب: يقرأ جدول احتياجها ويسدّه من موظفي كل وردية بضغطة.",
            p1: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
            p2: "M19 8v6M22 11h-6",
          }));
    }
    (nt.length &&
      ne.push({
        cap: _bsPlan + "&gates",
        s: "warning",
        title: "أرقام أبواب مكرّرة في الخطة",
        action:
          "الرقم مفتاح الباب في الاستيراد والتقارير، وتكراره يجعل بابين يُقرآن واحداً: " +
          nt.slice(0, 4).join("، ") +
          (nt.length > 4 ? " و" + (nt.length - 4) + " أخرى" : "") +
          " — وحّد الأرقام من محرّر الباب.",
        p1: "M13 4h3a2 2 0 0 1 2 2v14",
        p2: "M10 12v.01",
      }),
      m - h > 0 &&
        ne.push({
          cap: _bsSched,
          s: "critical",
          title: "موظفون بدون تسكين",
          action:
            KIVO.BassamCount(m - h, "موظف") +
            " بلا وردية — " +
            KIVO.BassamCount.agr(m - h, "أسنده", "أسندهما", "أسندهم") +
            " من الجدول الشهري لرفع الجاهزية.",
          p1: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
          p2: "M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
        }),
      o[P + "-" + T] ||
        ne.push({
          cap: _bsSched,
          s: "warning",
          title: "جدول " + pt + " غير معتمد",
          action: "جدول الشهر الحالي ما زال مسودة — راجعه واعتمده بنقرة مزدوجة على كرت الشهر.",
          p1: "M7 11V7a5 5 0 0 1 9.9-1",
          p2: "M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z",
        }),
      kt - Mt > 1 &&
        ne.push({
          cap: _bsSched,
          s: "warning",
          title: "خلل توازن الورديات",
          action:
            "فارق " +
            KIVO.BassamCount(kt - Mt, "موظف", "g") +
            " بين " +
            (Et[0] || "") +
            " و" +
            (zt[0] || "") +
            " — انقل موظفاً لإعادة التوازن.",
          p1: "M12 3v18",
          p2: "M8 21h8",
        }),
      J.length > 0
        ? ne.push({
            cap: _bsSched,
            s: "critical",
            title: "تجاوز حد الراحات اليومي",
            action:
              "الحد الموصى به " +
              K +
              " راحات/يوم (25% من الفريق) — تجاوزه: " +
              J.map((t) => t + " (" + W[t] + ")").join("، ") +
              ". أعد توزيع الراحات.",
            p1: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",
            p2: "M12 9v4",
          })
        : Tt < It &&
          Tt <= Math.round(0.75 * m) &&
          ne.push({
            cap: _bsSched,
            s: "warning",
            title: 1 === Vt.length ? "ضعف جاهزية " + Vt[0] : "ضعف جاهزية " + KIVO.BassamCount(Vt.length, "يوم|متعادل", "g") + "",
            action:
              "ينخفض المتاحون إلى " +
              Tt +
              " في: " +
              Vt.join("، ") +
              " — وزّع الراحات على بقية الأيام (الحد الموصى به " +
              K +
              " راحات/يوم).",
            p1: "M3 3v16a2 2 0 0 0 2 2h16",
            p2: "m19 15-5-5-4 4-3-3",
          }),
      U &&
        !H &&
        ne.push({
          cap: _bsSched,
          s: "critical",
          title: "لا توجد أيام راحة مسجّلة",
          action: "لم تُسجَّل أي أيام راحة — المؤشر لا يعكس الجاهزية الحقيقية. سجّل أيام الراحة الأسبوعية في الجدول الشهري.",
          p1: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",
          p2: "M12 9v4",
        }),
      0 === g &&
        m > 0 &&
        ne.push({
          cap: _bsSched,
          s: "warning",
          title: "لا يوجد مكلفون",
          action: "لم يُكلف أي موظف بعد — فعّل التكاليف من عمود المكلفين في الجدول الشهري.",
          p1: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
          p2: "m16 11 2 2 4-4",
        }),
      0 === ne.length &&
        ne.push({
          s: "ok",
          title: "العمليات مستقرة",
          action: "لا توجد قرارات عاجلة — كل المؤشرات ضمن النطاق الصحي. تابع الاعتماد الشهري في وقته.",
          p1: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
          p2: "m9 12 2 2 4-4",
        }),
      m > 0 &&
        !G &&
        ((ne.length = 0),
        ne.push({
          cap: _bsSched,
          s: "warning",
          title: "لم يُنشأ الجدول الشهري بعد",
          action:
            "أنشئ جدول " +
            pt +
            " من «الجدول الشهري» في القائمة الجانبية — بعدها تتفعل مؤشرات التسكين والحضور والراحات تلقائياً من بياناتك.",
          p1: "M8 2v4",
          p2: "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
        })),
      0 === m &&
        ((ne.length = 0),
        ne.push({
          s: "warning",
          title: "لا توجد بيانات بعد",
          action:
            "أضف موظفي الإدارة من صفحة ««موظفي الإدارة»»" +
            (_bsCapOk(_bsSched) ? " ثم أنشئ الجدول الشهري" : "") +
            " — وستتولد التوصيات هنا تلقائياً من بياناتك الحقيقية.",
          p1: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
          p2: "M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
        })));
    const ae = { critical: 0, warning: 1, ok: 2 },
      ie = ne
        .filter((t) => _bsCapOk(t.cap))
        .sort((t, e) => (void 0 === ae[t.s] ? 9 : ae[t.s]) - (void 0 === ae[e.s] ? 9 : ae[e.s]))
        .map((t) => ({ ...t, severity: re[t.s].chip, style: re[t.s].style, iconStyle: re[t.s].icon, chipStyle: re[t.s].chipS })),
      oe = [
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
      ].map((t, e) => {
        const r = !!o[P + "-" + (e + 1)],
          n = Y(P + "-" + (e + 1));
        return {
          name: t,
          status: r ? "معتمد" : n ? "مفتوح" : "فارغ",
          subColor: r ? "#047857" : n ? "#b45309" : "#94a3b8",
          tip: "جدول " + t + " " + P + " هـ",
          style:
            "border-radius:10px;padding:7px 4px;text-align:center;border:1px solid " +
            (r
              ? "rgba(0,132,80,0.35);background:var(--bg-a0132800p07);color:var(--fg-x047857)"
              : n
                ? "rgba(245,158,11,0.35);background:var(--bg-a245158110p08);color:var(--fg-xb45309)"
                : "var(--border-default);background:var(--bg-a2452452450p6);color:var(--fg-x53565a)"),
        };
      });
    return {
      tP: gt.P,
      tA: gt.A,
      tG: gt.G,
      themeLabel: gt.label,
      themeSub: gt.sub,
      scoreParts: mt,
      score: String(ct),
      gaugeDash: bt.toFixed(1) + " " + (ft - bt).toFixed(1),
      greeting: r >= 4 && r < 12 ? "صباح الخير" : r >= 12 && r < 17 ? "نهارك سعيد" : r >= 17 && r < 21 ? "مساء الخير" : "ليلة هانئة",
      timeShort: e.toLocaleTimeString("ar-SA-u-nu-latn", { hour: "2-digit", minute: "2-digit", hour12: !0 }),
      gregShort: e.toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { weekday: "long", day: "numeric", month: "long" }),
      hijriShort: KIVO.BassamCal.hText(e, { day: "numeric", month: "long", year: "numeric" }),
      hijriChip: KIVO.BassamCal.hText(e, { month: "long", year: "numeric" }),
      assignPct: String(z),
      rdSchedOn: _bsCapOk(_bsSched),
      netCovOn: G && rt.length > 0 && _bsCapOk(_bsSched + "&" + _bsPlan + "&dist"),
      netCovNoNeed: G && rt.length > 0 && _bsCapOk(_bsSched + "&" + _bsPlan + "&dist") && !rt.some((t) => t.need > 0),
      netCovSub:
        "القوة الاسمية − راحات اليوم − الإجازات السارية − الغياب المتوقّع = القوة الصافية، مقابل احتياج الميدان" +
        (et.days
          ? " · الغياب المتوقّع من متوسط آخر " + KIVO.BassamCount(et.days, "تقرير|يومي")
          : " · لا تقارير يومية بعد فالغياب المتوقّع صفر"),
      netCovRows: rt.map((t) => {
        const e = t.f,
          r = null == e ? "#94a3b8" : e >= 1.1 ? "#008450" : e >= 1 ? "#b45309" : "#dc2626",
          n =
            null == e
              ? "بلا احتياج مُدخل"
              : e >= 1.1
                ? "فائض مريح +" + (t.net - t.need)
                : e >= 1
                  ? "على الحافة — بلا احتياط"
                  : "عجز " + (t.need - t.net) + " قبل أن يمرض أحد";
        return {
          name: t.nm,
          dot: "width:9px;height:9px;border-radius:3px;flex-shrink:0;background:" + (t.color || "var(--bg-xb99751)"),
          brk: "اسمية " + t.nom + " − راحة " + t.rst + " − إجازة " + t.lv + " − غياب متوقّع " + t.exp + " = صافي " + t.net,
          needTxt: t.need ? "الاحتياج " + t.need : "لا احتياج",
          factor: null == e ? "—" : Math.round(100 * e) / 100 + "×",
          factorStyle: "font-size:20px;font-weight:800;font-feature-settings:'tnum';color:" + r,
          verdict: n,
          verdictStyle:
            "font-size:9.5px;font-weight:700;border-radius:9999px;padding:2px 9px;white-space:nowrap;background:" +
            r +
            "14;color:" +
            r +
            ";border:1px solid " +
            r +
            "44",
          barW: String(null == e ? 0 : Math.min(100, Math.round((100 * e) / 1.2))),
          barColor: r,
          tip:
            t.nm +
            ": القوة الاسمية " +
            t.nom +
            "، يخرج منها " +
            KIVO.BassamCount(t.rst, "راحة") +
            " و" +
            KIVO.BassamCount(t.lv, "إجازة") +
            " اليوم و" +
            KIVO.BassamCount(t.exp, "غياب|متوقّع") +
            "" +
            (et.rate[t.nm] ? " (متوسط غيابها " + Math.round(1e3 * (et.rate[t.nm] || 0)) / 10 + "٪)" : "") +
            "، فتبقى " +
            t.net +
            " مقابل احتياج " +
            t.need +
            (null == e ? "" : " — المعامل " + Math.round(100 * e) / 100),
        };
      }),
      kpis: At,
      donutSegs: G ? St : [],
      shiftLegend: G ? Ot : [],
      donutCenter: G ? String(m) : "—",
      donutCenterSub: G ? "موظف" : "بدون جدول",
      schedOn: G,
      schedOff: !G,
      wkLinePath: Lt,
      wkAreaPath: Wt,
      wkDots: Rt,
      wkVals: Xt,
      wkLabels: Ht,
      wkInsight: qt,
      wkInsightStyle: Qt,
      compGroups: ee,
      execAlerts: ie,
      execMore: "",
      yearLabel: P + " هـ",
      monthCells: oe,
      todayName: p,
      resters: k
        .slice(0, 2)
        .map((t) => ({
          name: t.name || "—",
          job: (t.type || "").trim() || "موظف",
          empno: t.empno || "—",
          initial: (t.name || "؟").trim().charAt(0) || "؟",
        })),
      restersMore: k.length > 2 ? "+" + (k.length - 2) + " آخرون في راحة اليوم" : "",
      hasResters: k.length > 0,
      noResters: 0 === k.length,
      restEmptyMsg:
        0 === m
          ? "لا يوجد موظفون بعد — أضفهم من صفحة «موظفي الإدارة»"
          : G
            ? 0 === R
              ? "لا توجد راحات مسجّلة"
              : "لا يوجد موظفون في راحة اليوم — الفريق مكتمل ✓"
            : "لم يُنشأ الجدول الشهري بعد — الراحات تُسجل هناك",
    };
  }
  _rdVals(t) {
    return KIVO.__bsMemo ? KIVO.__bsMemo(this, "_rdVals", this._bsPulseKey(t), () => this._rdVals0(t)) : this._rdVals0(t);
  }
  _rdVals0(t) {
    const e = t || new Date(),
      r = (t, e) => {
        try {
          const e = KIVO.__BS_SRV.operations.text(t);
          if (null != e) {
            const t = JSON.parse(e);
            if (null != t) return t;
          }
        } catch (t) {}
        return e;
      },
      n = (t, e) => (e ? Math.round((100 * t) / e) : 0),
      a = (t, e) => (e ? Math.round((1e3 * t) / e) / 10 : 0),
      i = (() => {
        const t = r("bassam_employees_v1", []);
        return Array.isArray(t) ? t : [];
      })();
    let o = 1448,
      s = 1,
      l = 1;
    try {
      const t = KIVO.BassamCal.hParts(e);   /* V7 · د5-د2 */
      ((o = t.y), (s = t.m), (l = t.d));
    } catch (t) {}
    const d = o + "-" + s,
      c = (() => {
        try {
          const t = KIVO.bus.read("staff.months@1", "copy");
          if (null != t) return t;
        } catch (t) {}
        return {};
      })(),
      p = c && "object" == typeof c && c[d] && "object" == typeof c[d] ? c[d] : {},
      m = (() => {
        const t = r("bassam_shift_options_v1", null);
        return Array.isArray(t) && t.length && t.every((t) => t && t.name)
          ? t
          : [
              { name: "الوردية الأولى", color: "#b99751" },
              { name: "الوردية الثانية", color: "#2f8f86" },
              { name: "الوردية الثالثة", color: "#2f5f8a" },
              { name: "الوردية الرابعة", color: "#1e9a66" },
            ];
      })(),
      h = m.map((t) => t.name),
      /* V7 · د5-د2: مواقعُ الشهر من مالكها بالناقل («text»: من نصّ المورد كما كانت تُقرأ)؛ بغيابه أو تعذّرها لا مواقع */
      f = (() => {
        try {
          return KIVO.bus.read("plan.sites@1", d, "text") || [];
        } catch (t) {}
        return [];
      })(),
      b = [];
    let A = 0,
      x = 0;
    f.forEach((t) => {
      ((t.gates || []).forEach((t) => b.push(t)), (A += (t.zones || []).length), (x += (t.marks || []).length));
    });
    const y = (() => {
        try {
          const t = KIVO.bus.read("dreport.doc@1", "text");   /* V7 · د5-هـ: نسخةٌ من التقرير بالناقل؛ بغيابه لا تقرير */
          if (null != t) return t;
        } catch (t) {}
        return {};
      })(),
      v = (() => {
        try {
          const t = KIVO.bus.read("daily.days@1", (k) => r(k, {}));   /* V7 · د5-هـ: أيامُ الجولات من مالكها؛ بغيابه لا جولة */
          if (null != t) return t;
        } catch (t) {}
        return {};
      })(),
      w = i.length,
      S = (t) => String(t || "").replace("الوردية ", ""),
      k = (t) => {
        const e = (KIVO.BassamEmp ? KIVO.BassamEmp.entry(p, t) : p[t.eid || t.nid || t.name || ""]) || {};
        return e && "object" == typeof e && !Array.isArray(e) ? e : {};
      },
      M = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"],
      E = {};
    h.forEach((t) => {
      E[t] = 0;
    });
    const z = {};
    M.forEach((t) => {
      z[t] = 0;
    });
    const O = {};
    let C = 0,
      F = 0;
    i.forEach((t) => {
      const e = k(t),
        r = void 0 !== e.shift ? e.shift : t.shift,
        n = h.includes(r) ? r : "";
      n && (C++, E[n]++, (O[t.name] = n));
      const a = Array.isArray(e.rest) ? e.rest : [];
      (a.length,
        a.length >= 2 && F++,
        a.forEach((t) => {
          const e = void 0 !== z[t] ? t : "ال" + t;
          void 0 !== z[e] && z[e]++;
        }));
    });
    const P = KIVO.BassamNeed,
      T = [];
    let I = 0;
    f.forEach((t) => {
      ((t.zones || []).forEach((t) => {
        t.off || (I++, P && P.has(t, m) && T.push(t));
      }),
        (t.gates || []).forEach((t) => {
          t.closed || (I++, P && P.has(t, m) && T.push(t));
        }),
        (t.marks || []).forEach((t) => {
          t.off || (I++, P && P.has(t, m) && T.push(t));
        }));
    });
    let j = 0;
    const N = {};
    h.forEach((t) => {
      N[t] = 0;
    });
    let Y = 0,
      G = 0;
    T.forEach((t) => {
      const e = h.map((e) => (P ? P.of(t, e) : 0) || 0);
      ((j += e.reduce((t, e) => t + e, 0)),
        h.forEach((t, r) => {
          N[t] += e[r];
        }),
        e.some((t) => 1 !== t) && Y++,
        e.some((t) => t !== e[0]) && G++);
    });
    let B = 0;
    const L = {};
    T.forEach((t) => {
      (t.emp || []).forEach((t) => {
        (B++, (L[t] = (L[t] || 0) + 1));
      });
    });
    const W = Object.keys(L).length,
      D = Object.keys(L).filter((t) => L[t] > 1),
      Z = T.filter((t) =>
        h.every((e) => {
          const r = (P ? P.of(t, e) : 0) || 0;
          return !r || (t.emp || []).filter((t) => O[t] === e).length >= r;
        }),
      ).length,
      R = Math.max(1, Math.min(l, 30));
    let X = 0;
    const U = [];
    let H = 0,
      V = 0,
      q = 0,
      Q = 0;
    for (let t = 1; t <= R; t++) {
      const e = d + "-" + t,
        r = y && y[e] && y[e].shifts ? y[e].shifts : null;
      let n = 0;
      (r &&
        Object.keys(r).forEach((t) => {
          const e = r[t];
          e && e.pulled && Array.isArray(e.roster) && e.roster.length && n++;
        }),
        (X += n));
      const a = v && v[e] && Array.isArray(v[e].d) && v[e].d.length ? v[e].d : null,
        i = !(!a || !a.every((t) => t.approved || t.ap));
      (a ? (H++, i && q++) : n > 0 && V++, a && i && n >= h.length && Q++, U.push(a ? "full" : n > 0 ? "half" : "none"));
    }
    let K = 0;
    const J = {};
    for (let t = 1; t <= R; t++) {
      const e = y && y[d + "-" + t] && y[d + "-" + t].shifts ? y[d + "-" + t].shifts : null;
      e &&
        Object.keys(e).forEach((t) => {
          ((e[t] || {}).roster || []).forEach((t) => {
            t && "lv" === t.st && (K++, t.ekey && (J[t.ekey] = 1));
          });
        });
    }
    const _ = Object.keys(J).length,
      $ = Math.max(0, R - H - V),
      tt = (t) => i.filter(t).length,
      et = tt((t) => "" !== String(t.eid || "").trim()),
      rt = tt((t) => "" !== String(t.type || "").trim()),
      nt = tt((t) => "" !== String(t.work || "").trim()),
      at = tt((t) => "" !== String(t.phone || "").trim()),
      it = {},
      ot = {};
    i.forEach((t) => {
      const e = String(t.type || "").trim() || "غير محدد";
      it[e] = (it[e] || 0) + 1;
      const r = String(t.work || "").trim().replace(/\s*ـ?\s*\/\s*ـة\s*$/, "").replace(/ـ+$/, "") || "غير محدد";   /* KIVO_265: «ميدانيـ / ـة» تُحسب «ميداني» (المسمّى المعتمد بصيغة الجنسين) */
      ot[r] = (ot[r] || 0) + 1;
    });
    const st = Object.keys(it).sort((t, e) => it[e] - it[t]),
      lt = st[0] || "—",
      dt = it[lt] || 0,
      ct = st[1] || "—",
      pt = it[ct] || 0,
      mt = n(ot["ميداني"] || 0, w),
      ht = [
        {
          nm: "الرقم الوظيفي — مفتاح العدّ",
          p: n(et, w),
          tip:
            "من له رقم وظيفي مسجّل: " +
            et +
            " من " +
            w +
            " ÷ الإجمالي = " +
            n(et, w) +
            "٪ · الرقم مفتاح العدّ: يمنع التكرار والضياع بين الأسماء المتشابهة في كل استيراد وتقرير.",
        },
        {
          nm: "صفة التوظيف — دائم أم موسمي",
          p: n(rt, w),
          tip:
            "من حُدّدت صفته: " +
            rt +
            " من " +
            w +
            " = " +
            n(rt, w) +
            "٪ · تفصل القوة الثابتة عن المؤقتة — عليها يُبنى تخطيط ما بعد الموسم.",
        },
        {
          nm: "طبيعة العمل — ميداني أم إداري",
          p: n(nt, w),
          tip: "من حُدّدت طبيعته: " + nt + " من " + w + " = " + n(nt, w) + "٪ · تحدد من يُحسب على الاحتياج الميداني أصلاً ومن يُستبعد.",
        },
        {
          nm: "رقم الجوال — معلومة الاستدعاء",
          p: n(at, w),
          tip: "من له جوال مسجّل: " + at + " من " + w + " = " + n(at, w) + "٪ · معلومة الاستدعاء ليلة الطارئ — قوة لا تصل إليها ليست قوة.",
        },
      ],
      ut = b.length,
      gt = {};
    b.forEach((t) => {
      const e = String(null == t.num ? "" : t.num).trim();
      e && (gt[e] = (gt[e] || 0) + 1);
    });
    const ft = Object.keys(gt).filter((t) => gt[t] > 1),
      bt = ft.reduce((t, e) => t + gt[e], 0),
      At = ut - bt - b.filter((t) => "" === String(null == t.num ? "" : t.num).trim()).length,
      xt = b.filter((t) => "" !== String(t.loc || "").trim()).length,
      yt = b.filter((t) => "" !== String(t.kind || "").trim()).length,
      vt = b.filter((t) => "" !== String(t.pri || "").trim()).length,
      wt = b.filter((t) => null != t.x && null != t.y).length,
      St = b.filter((t) => !!t.closed).length,
      kt = {};
    b.forEach((t) => {
      const e = String(t.loc || "").trim();
      e && (kt[e] = (kt[e] || 0) + 1);
    });
    const Mt = Object.keys(kt).sort((t, e) => kt[e] - kt[t]),
      Et = ["#8A6F35", "#B99751", "#D9C08A", "#EBDCB8", "#F3EAD0", "#F8F2E2"],
      zt = Mt.map((t, e) => ({ w: "width:" + a(kt[t], ut) + "%;background:" + Et[e % Et.length] })),
      Ot = Mt.map((t, e) => ({
        dot:
          "display:inline-block;width:8px;height:8px;border-radius:3px;margin-left:5px;vertical-align:1px;background:" + Et[e % Et.length],
        nm: t.replace("الساحة ", ""),
        b: String(kt[t]),
        pc: n(kt[t], ut) + "٪",
        tip:
          "أبواب «" + t + "»: " + kt[t] + " من " + ut + " = " + n(kt[t], ut) + "٪ · ثقل الساحة يوجّه توزيع المراقبين والقيادة الميدانية.",
      })),
      Ct = {};
    b.forEach((t) => {
      const e = String(t.kind || "").trim();
      Ct[e || "بلا نوع"] = (Ct[e || "بلا نوع"] || 0) + 1;
    });
    const Ft = Object.keys(Ct)
        .sort((t, e) => Ct[e] - Ct[t])
        .map((t) => ({
          nm: t,
          b: String(Ct[t]),
          tip:
            "أبواب نوع «" +
            t +
            "»: " +
            Ct[t] +
            " من " +
            ut +
            " · " +
            ("بلا نوع" === t ? "بلا نوعٍ محدد — أسلوب تغطيتها مجهول حتى يُصنَّف." : "النوع يحدد أسلوب التغطية وعدد رجالها."),
          st:
            "بلا نوع" === t
              ? "background:var(--bg-xfdf1ef);border:1px solid var(--bd-xf2d6d0);color:var(--fg-xb3402f)"
              : "background:var(--bg-xf8f3e8);border:1px solid var(--bd-xe8dcc0);color:var(--fg-x8a6f35)",
        })),
      Pt = [
        {
          nm: "الرقم الفريد لكل باب — مفتاح الباب",
          p: n(At, ut),
          tip:
            "الأبواب برقم سليم غير مكرّر: " +
            At +
            " من " +
            ut +
            " = " +
            n(At, ut) +
            "٪ · الرقم مفتاح الباب في الاستيراد والتقارير — تكراره يجعل بابين يُقرآن واحداً.",
        },
        {
          nm: "الموقع الجغرافي (الساحة)",
          p: n(xt, ut),
          tip:
            "الأبواب المحدّدة ساحتها: " +
            xt +
            " من " +
            ut +
            " = " +
            n(xt, ut) +
            "٪ · عليها يُبنى توزيع مراقبي المواقع ونطاقات القيادة الميدانية.",
        },
        {
          nm: "النوع التشغيلي",
          p: n(yt, ut),
          tip:
            "الأبواب المحدَّد نوعها: " +
            yt +
            " من " +
            ut +
            " = " +
            n(yt, ut) +
            "٪ · النوع (رئيسي/فرعي/سلم/مصاعد) يغيّر أسلوب التغطية وعدد رجالها.",
        },
        {
          nm: "أولوية التغطية (أ / ب / ج)",
          p: n(vt, ut),
          tip:
            "الأبواب المصنّفة أولويتها: " +
            vt +
            " من " +
            ut +
            " = " +
            n(vt, ut) +
            "٪ · بدونها لا يوجد ترتيب انسحاب عند العجز: من لا يُترك أبداً ومن يُضحّى به أولاً.",
        },
        {
          nm: "الخريطة والحالة — " + wt + " مرسومة" + (St ? " · " + St + " مغلقة" : ""),
          p: n(wt, ut),
          tip:
            "الأبواب المرسومة بموضعها على الخريطة: " +
            wt +
            " من " +
            ut +
            " = " +
            n(wt, ut) +
            "٪ · المغلق الدائم (" +
            St +
            ") يخرج من الاحتياج — فلا يُحسب عجزاً وهمياً.",
        },
      ],
      _on = (k) => {
        try {
          const P = KIVO.BassamPerm;
          return "@" === String(k).charAt(0) ? !!KIVO.bus.read(String(k).slice(1)) : !P || !P.on || P.on(k);
        } catch (t) {
          return !0;
        }
      },
      _nT = [_on("zones"), _on("gates"), _on("marks")].filter(Boolean).length || 1,
      Tt = T.length,
      It = (A > 0 && _on("zones") ? 1 : 0) + (ut > 0 && _on("gates") ? 1 : 0) + (x > 0 && _on("marks") ? 1 : 0),
      jt = vt > 0;
    let Nt = null;
    if (jt && P) {
      const t = (t) => {
          const e = b.filter((e) => String(e.pri || "").trim() === t && !e.closed);
          return e.length ? e.reduce((t, e) => t + P.tot(e, m), 0) / e.length : null;
        },
        e = [t("أ"), t("ب"), t("ج")].filter((t) => null != t);
      Nt = e.length >= 2 && e.every((t, r) => 0 === r || e[r - 1] >= t) ? 100 : 0;
    }
    const Yt = [
        {
          nm: "شمول الإدخال — كل عنصرٍ مفتوح له احتياج",
          p: n(Tt, Math.max(1, I)),
          tip:
            "العناصر المفتوحة التي لها احتياج: " +
            Tt +
            " من " +
            I +
            " = " +
            n(Tt, Math.max(1, I)) +
            "٪ · عنصر بلا احتياج خارج حساب التغطية كلياً — عجزه لا يظهر أبداً.",
        },
        {
          nm: "صدق الأرقام — كم عنصراً رُوجع رقمه؟",
          p: n(Y, Tt),
          tip:
            "العناصر التي خرج احتياجها عن الافتراضي (1): " +
            Y +
            " من " +
            Tt +
            " = " +
            n(Y, Tt) +
            "٪ · الرقم غير المراجَع رقمُ استيراد لا رقمُ قرار — والعجز عليه عجزٌ افتراضي.",
        },
        {
          nm: "التفصيل بالورديات — الزحام لا يعرف التساوي",
          p: n(G, Tt),
          tip:
            "العناصر التي يختلف احتياجها بين الورديات: " +
            G +
            " من " +
            Tt +
            " = " +
            n(G, Tt) +
            "٪ · وردية الذروة غير وردية الفجر — التفصيل يضع الرجال حيث الزحام فعلاً.",
        },
        {
          nm: "انسجام الاحتياج مع الأولوية",
          p: Nt,
          dash: null == Nt,
          tip:
            null == Nt
              ? "غير قابل للقياس الآن — يُقاس بعد تصنيف الأولويات (أ/ب/ج): هل فئة (أ) تأخذ احتياجاً أعلى من (ج)؟ · يكشف تناقض الرقم مع الأهمية: من صنّفته (أ) وأعطيته احتياج (ج) فأحد الرقمين كاذب."
              : "متوسط احتياج (أ) ≥ (ب) ≥ (ج)؟ النتيجة " + Nt + "٪ · يكشف تناقض الرقم مع الأهمية.",
        },
        {
          nm: "نطاق الاحتياج — من أنواع الميدان المفعّلة",
          p: Math.round((100 * It) / _nT),
          tip:
            "الأنواع المرسومة ذات الاحتياج: " +
            It +
            " من " +
            _nT +
            " (أبواب · مناطق · معالم) = " +
            Math.round((100 * It) / 3) +
            "٪ · احتياج لا يغطي كل الأنواع يترك مساحات ومعالم بلا حساب رجال.",
        },
      ],
      Gt = n(j, w),
      Bt = w - j,
      Lt = h.map((t) => E[t] || 0),
      Wt = Math.max.apply(null, Lt.concat([0])),
      Dt = Lt.length ? Math.min.apply(null, Lt) : 0,
      Zt = Wt ? Math.round((100 * Dt) / Wt) : 0,
      Rt = M.map((t) => w - (z[t] || 0)),
      Xt = Rt.filter((t) => t >= j).length,
      Ut = Object.keys(p).filter((t) => 0 !== t.indexOf("__") && p[t] && "object" == typeof p[t] && !Array.isArray(p[t])).length,
      Ht = {};
    i.forEach((t) => {
      const e = t.eid || t.nid || t.name || "";
      e && (Ht[e] = 1);
    });
    const Vt = Object.keys(p).filter((t) => 0 !== t.indexOf("__") && Ht[t]).length,
      qt = h.filter((t) => E[t] === Wt)[0] || "—",
      Qt = h.filter((t) => E[t] === Dt)[0] || "—",
      Kt = [
        {
          nm: "شمول الجدولة — " + C + " من " + w,
          p: n(C, w),
          tip: "المسكّنون في ورديات: " + C + " من " + w + " = " + n(C, w) + "٪ · من لا وردية له قوة على الورق فقط — لا يُحسب في أي تغطية.",
        },
        {
          nm: "الراحات المحدّدة — راحتان لكل موظف",
          p: n(F, w),
          tip:
            "من له راحتان أسبوعيتان معلومتان: " +
            F +
            " من " +
            w +
            " = " +
            n(F, w) +
            "٪ · بلا راحة مقنّنة يصير الغياب هو الراحة — وتفقد التنبؤ بقوة كل يوم.",
        },
        {
          nm: "توازن الورديات — " + S(Qt) + " " + Dt + " مقابل " + S(qt) + " " + Wt,
          p: Zt,
          tip: "أخفّ وردية ÷ أثقلها: " + Dt + " ÷ " + Wt + " = " + Zt + "٪ · الفجوة الكبيرة ترهق وردية وتريح أخرى بلا سبب تشغيلي.",
        },
        {
          cap: _bsPlan,
          nm: "كشف أيام الأسبوع — " + KIVO.BassamCount(Xt, "يوم|مغطّى") + " من 7",
          p: Math.round((100 * Xt) / 7),
          lbl: Xt + "/7",
          tip:
            "الأيام التي قوتها العاملة (بعد خصم راحات اليوم) توفي الاحتياج " +
            j +
            ": " +
            Xt +
            " من 7 · اليوم المكشوف عجزٌ مبرمَج سلفاً تعرفه قبل وقوعه بأسبوع.",
        },
        {
          nm: "مطابقة الجدول لسجل القوة",
          p: Ut ? n(Vt, Ut) : 0,
          tip: "سجلات الجدول المطابقة لموظفين حقيقيين: " + Vt + " من " + Ut + " · السجل الزائد بلا موظف يشوّش كل عدٍّ وتقريرٍ قادم.",
        },
      ],
      Jt = M.map((t, e) => ({ d: t, v: Rt[e], gap: Rt[e] - j })).filter((t) => t.gap < 0),
      _t = M.map((t, e) => ({ d: t, v: Rt[e], gap: Rt[e] - j }))
        .filter((t) => t.gap > 0)
        .sort((t, e) => e.gap - t.gap),
      $t = a(B, j),
      te = [
        {
          nm: "سدّ خانات الاحتياج — " + Math.max(0, j - B) + " شاغرة",
          p: $t,
          lbl: $t + "٪",
          tip:
            "الخانات المسدودة بأسماء: " +
            B +
            " من " +
            j +
            " = " +
            $t +
            "٪ · الخانة الشاغرة عجزٌ مبرمَج قبل أن يبدأ اليوم — لا يحتاج غياباً ليقع.",
        },
        {
          nm: "اكتمال العناصر — مسدود الورديات كلها",
          p: n(Z, Tt),
          tip: "عناصر اكتمل سدّ وردياتها كلها: " + Z + " من " + Tt + " · نصف التغطية يعني باباً محروساً صباحاً مكشوفاً ليلاً.",
        },
        {
          nm: "نظافة التوزيع من الازدواج",
          p: W ? n(W - D.length, W) : 0,
          tip:
            "أسماء تقف على أكثر من عنصر معاً: " +
            D.length +
            " من " +
            W +
            " موزَّعاً · الازدواج تغطية وهمية — الرجل الواحد لا يحرس بابين في الوقت نفسه.",
        },
        {
          nm: "ترتيب السدّ بالأولوية",
          p: jt ? 100 : null,
          dash: !jt,
          tip: "غير قابل للقياس قبل تصنيف الأولويات — يقيس: هل تُسدّ فئة (أ) أولاً وفئة (ج) آخراً؟ · يضمن أن أي عجزٍ متبقٍّ يقع على الأقل أهمية لا على الأخطر.",
        },
        {
          nm: "استخدام القوة — " + W + " من " + w,
          p: a(W, w),
          lbl: a(W, w) + "٪",
          tip:
            "الموزَّعون فعلاً على مواقع: " +
            W +
            " من " +
            w +
            " = " +
            a(W, w) +
            "٪ · الباقي قوة على الورق حتى يُوزَّع — تدفع رواتبها ولا تحرس شيئاً.",
        },
      ],
      ee = [
        {
          cap: _bsDr,
          nm: "سحب تقرير الورديات — " + X + " من " + R * h.length,
          p: n(X, R * h.length),
          tip:
            "التقارير المسحوبة: " +
            X +
            " من " +
            R * h.length +
            " (" +
            KIVO.BassamCount(R, "يوم") +
            " × " +
            KIVO.BassamCount(h.length, "وردية") +
            ") = " +
            n(X, R * h.length) +
            "٪ · التقرير مصدر «من على رأس العمل فعلاً» — وبدونه الغياب لا يُرى.",
        },
        {
          cap: _bsRd,
          nm: "توثيق الجولات الميدانية — " + H + " من " + KIVO.BassamCount(R, "يوم", "g") + "",
          p: n(H, R),
          tip:
            "أيام وُثّقت بجولة على الخريطة: " +
            H +
            " من " +
            R +
            " مضى = " +
            n(H, R) +
            "٪ · الجولة حال الميدان كما شوهد لا كما خُطّط — منها يُتعلَّم للغد.",
        },
        {
          cap: _bsRd,
          nm: "اعتماد الجولات — قفل سجل اليوم",
          p: H ? n(q, H) : 0,
          tip:
            "الجولات المعتمدة: " +
            q +
            " من " +
            H +
            " مسجّلة · الاعتماد يحوّل الجولة سجلاً مقفولاً يُحاسَب عليه — والمسودة تُعدَّل بلا أثر.",
        },
        {
          cap: _bsDr,
          nm: "تأشير الإجازات — " + KIVO.BassamCount(K, "تأشيرة") + " هذا الشهر",
          p: K > 0 ? 100 : 0,
          tip:
            "تأشيرات الإجازة في تقارير هذا الشهر: " +
            K +
            " (لـ" +
            KIVO.BassamCount(_, "موظف", "g") +
            ") · تُسجَّل من قائمة التأشير بنوعها ليومها فقط، فيسقط صاحبها من عدّ يومه بدل أن يظهر «غائباً» ظلماً.",
        },
        {
          cap: _bsDr,
          nm: "اكتمال دورة اليوم — الثلاثة معاً",
          p: n(Q, R),
          tip:
            "أيام اكتملت دورتها (تقرير كامل الورديات + جولة موثّقة + اعتماد): " +
            Q +
            " من " +
            R +
            " · اليوم المكتمل وحده يصلح مرجعاً يُقاس عليه ويُتعلَّم منه.",
        },
      ],
      re = (t) => {
        const e = t.reduce((t, e) => t + (e.dash ? 0 : e.p || 0), 0) / t.length;
        return e > 0 && e < 1 ? 1 : Math.round(e);
      },
      ne = [
        {
          n: "١",
          key: "p1",
          name: "حصر القوة",
          q: "كم سيفاً أملك فعلاً — وهل أعرف عنه ما يكفي لاتخاذ القرار؟",
          rows: ht,
          color: "#1E3A5F",
        },
        {
          n: "٢",
          key: "p2",
          name: "حصر الميدان",
          q: "ماذا أحرس بالضبط — وهل أعرف عن كل موقعٍ ما يلزم لتغطيته؟",
          rows: Pt,
          color: "#B99751",
        },
        {
          n: "٣",
          key: "p3",
          name: "تحديد الاحتياج",
          q: "كم رجلاً يحتاج ميداني في كل وردية — رقمُ قرارٍ أم رقمُ افتراض؟",
          rows: Yt,
          color: "#d97706",
        },
        {
          n: "٤",
          key: "p4",
          name: "التنظيم الزمني",
          q: "هل قوّتي مرتّبة على الزمن — لكل رجلٍ وردية وراحة، وما من يومٍ مكشوف؟",
          rows: Kt,
          color: "#3e8ac4",
        },
        {
          n: "٥",
          key: "p5",
          name: "التوزيع",
          q: "هل رجالي على المواقع بقدر الاحتياج — وأين عجزي واحتياطي قبل أن يبدأ الشهر؟",
          rows: te,
          color: "#b3402f",
        },
        {
          n: "٦",
          key: "p6",
          name: "المتابعة اليومية",
          q: "هل عيني على الميدان يوماً بيوم — تقريرٌ يُسحب وجولةٌ تُوثَّق واعتمادٌ يقفل السجل؟",
          rows: ee,
          color: "#9c3d6b",
        },
      ]
        .map((t) => ({ ...t, rows: t.rows.filter((r) => !r.cap || _on(r.cap)) }))
        .filter(
          (t) =>
            ({
              p1: !0,
              p2: _on(_bsPlan) && _on("gates"),
              p3: _on(_bsPlan) && _on("dist"),
              p4: _on(_bsSched),
              p5: _on(_bsPlan) && _on("dist"),
              p6: _on(_bsDr) || _on(_bsRd),
            })[t.key] && t.rows.length,
        )
        .map((t, e) => ({ ...t, n: ["١", "٢", "٣", "٤", "٥", "٦"][e], pct: re(t.rows) })),
      _nS = ne.length || 1,
      _wS = Math.round(1e3 / _nS) / 10,
      ae = 0 === w ? 0 : Math.round(ne.reduce((t, e) => t + e.pct, 0) / ne.length),
      ie =
        0 === w
          ? { lbl: "لا بيانات بعد", c: "#64748b", bg: "rgba(148,163,184,0.12)", bd: "rgba(148,163,184,0.35)" }
          : ae >= 85
            ? { lbl: "ممتاز", c: "#008450", bg: "rgba(0,132,80,0.08)", bd: "rgba(0,132,80,0.3)" }
            : ae >= 65
              ? { lbl: "جيد", c: "#8A6F35", bg: "rgba(185,151,81,0.12)", bd: "rgba(185,151,81,0.4)" }
              : { lbl: "يحتاج متابعة", c: "#8A4D0F", bg: "rgba(255,255,255,0.55)", bd: "rgba(255,255,255,0.7)" },
      oe = ne.slice().sort((t, e) => t.pct - e.pct),
      se = ne.slice().sort((t, e) => e.pct - t.pct)[0],
      le = oe[0],
      de =
        "المؤشر الجامع = متوسط الخطوات المتاحة لهذه الإدارة (" +
        _nS +
        "): (" +
        ne.map((t) => t.pct).join(" + ") +
        ") ÷ " +
        _nS +
        " = " +
        ae +
        " · رقم واحد يلخّص موقعك من الجاهزية الكاملة ويريك أين تبدأ غداً صباحاً.",
      ce =
        "الحكم بنطاقات المنصة: 85 فأعلى «ممتاز» · 65–84 «جيد» · دونها «يحتاج متابعة» — التقييم الحالي «" +
        ie.lbl +
        "» عند " +
        ae +
        " من 100.",
      pe =
        0 === w
          ? _bsCapOk(_bsSched)
            ? "لا يُحسب المؤشر قبل وجود موظفين — أضف الموظفين وأنشئ الجدول الشهري ليبدأ من بياناتك الحقيقية."
            : "لا يُحسب المؤشر قبل وجود موظفين — أضف موظفي الإدارة ليبدأ من بياناتك الحقيقية."
          : "الناقص لرفع المؤشر: " +
            KIVO.BassamCount(Math.max(0, 100 - ae), "نقطة") +
            " — أثقلها " +
            oe
              .slice(0, 3)
              .map((t) => t.name + " (" + t.pct + "٪)")
              .join("، ") +
            ".";
    let me = 0,
      he = 0;
    ne.forEach((t) =>
      t.rows.forEach((t) => {
        !t.dash && (t.p || 0) >= 99 ? me++ : he++;
      }),
    );
    const ue = ne.map((t) => ({
        tip:
          "وزن الخطوة " +
          _wS +
          "٪ (1 من " +
          _nS +
          ") — " +
          t.pct +
          "٪ × " +
          _wS +
          "٪ = " +
          KIVO.BassamCount(Math.round((t.pct / _nS) * 10) / 10, "نقطة") +
          " من الـ" +
          ae +
          " · تريك أي خطوةٍ تسرق النقاط.",
        chip: "وزن " + _wS + "٪",
        nm: t.n + " · " + t.name,
        bar: "display:block;height:100%;border-radius:99px;background:" + t.color + ";width:" + t.pct + "%",
        val: t.pct + "٪ ← " + KIVO.BassamCount(Math.round((t.pct / _nS) * 10) / 10, "نقطة"),
        valSt: "font-size:11px;font-weight:800;white-space:nowrap;color:" + t.color,
      })),
      ge = ne.map((t) => ({
        tip: "مؤشر «" + t.name + "» = " + t.pct + "٪ — متوسط حقوله الخمسة · بطاقته أدناه فيها الحساب والقراءة والقرار.",
        v: t.pct + "٪",
        vSt: "font-size:13.5px;font-weight:900;color:" + (t.pct < 40 ? "var(--fg-x9b3a25)" : "var(--fg-x5e491a)"),
        b:
          "display:block;height:" +
          Math.max(4, Math.round(1.3 * t.pct)) +
          "px;margin:3px auto 0;max-width:70px;border-radius:7px 7px 2px 2px;background:linear-gradient(180deg,var(--bg-xa98f4f),var(--bg-x6e5626));box-shadow:inset 0 2px 3px rgba(255,255,255,0.3),0 3px 7px -2px rgba(70,52,15,0.45)",
        nm: t.name,
        step: "الخطوة " + t.n,
      })),
      fe = (t) => (263.9 * (1 - Math.min(100, Math.max(0, t)) / 100)).toFixed(1),
      be = (t) => "transform:rotate(" + (1.8 * Math.min(100, Math.max(0, t)) - 90).toFixed(1) + "deg)",
      Ae = (t, e, r, n) => ({
        b: String(t),
        s: e,
        t: n || "",
        bSt: "display:block;font-size:11.5px;font-weight:900;line-height:1.3;color:" + (r || "var(--fg-x141414)"),
      }),
      xe = h.length
        ? Math.max.apply(
            null,
            h.map((t) => N[t] || 0),
          )
        : 0,
      ye = [
        {
          label: "إجمالي القوة",
          sub: "من صفحة موظفي الإدارة — القابلون للتشغيل",
          v: String(w),
          vSt: "",
          vTip:
            "إجمالي القوة = عدد سجلات صفحة موظفي الإدارة (" +
            w +
            ") · هذا رأس المال الذي تصرف منه كل الخطوات — والعدّاد يقيس نسبة الميدانيين منه.",
          off: fe(mt),
          ndl: be(mt),
          f: [
            Ae(dt, lt, null, "عدد «" + lt + "»: " + dt + " (" + n(dt, w) + "٪) · قوة مؤقتة تنتهي بنهاية الموسم — خطط لما بعدها."),
            Ae(
              mt + "٪",
              "ميداني",
              "#8A6F35",
              "الميدانيون ÷ الإجمالي = " + (ot["ميداني"] || 0) + " ÷ " + w + " · من يُحسب على الاحتياج الميداني فعلاً.",
            ),
            Ae(pt, ct, null, "عدد «" + ct + "»: " + pt + " (" + n(pt, w) + "٪) · القوة الثابتة الباقية بعد الموسم."),
          ],
        },
        {
          label: "نطاق الميدان",
          sub: "موقع الخطة الميدانية — كل بابٍ برقمه وموضعه",
          v: String(ut),
          vSt: "",
          vTip:
            "نطاق الميدان = أبواب خطة الشهر الميدانية (" +
            ut +
            ") · كل ما تُحاسَب على تغطيته — والعدّاد يقيس نسبة المرسوم منها على الخريطة.",
          off: fe(n(wt, ut)),
          ndl: be(n(wt, ut)),
          f: [
            Ae(
              kt[Mt[0]] || 0,
              (Mt[0] || "—").replace("الساحة ", ""),
              null,
              "أكبر ساحة «" +
                (Mt[0] || "—") +
                "»: " +
                KIVO.BassamCount(kt[Mt[0]] || 0, "باب") +
                " (" +
                n(kt[Mt[0]] || 0, ut) +
                "٪) · ثقل ميدانك — توزيع المراقبين يتبعه.",
            ),
            Ae(
              n(wt, ut) + "٪",
              "مرسومة",
              "#8A6F35",
              "المرسوم بموضعه ÷ الإجمالي = " + wt + " ÷ " + ut + " · ما ليس على الخريطة محفوظ في ذاكرة شخصٍ لا في المنصة.",
            ),
            Ae(
              Ct["رئيسي"] || 0,
              "رئيسية",
              null,
              "الأبواب الرئيسية: " + (Ct["رئيسي"] || 0) + " · مراكز الثقل التشغيلية ومرشّحك الطبيعي لفئة الأولوية (أ).",
            ),
          ],
        },
        {
          label: "احتياج الشهر",
          sub: "مجموع احتياج الورديات من جداول الاحتياج",
          v: String(j),
          vSt: "",
          vTip:
            "احتياج الشهر = مجموع احتياج كل عنصرٍ في كل وردية = " +
            j +
            " · الرقم الذي تُحاسَب عليه خطوتا التنظيم الزمني والتوزيع — والعدّاد يقيس نسبته من قوّتك.",
          off: fe(Gt),
          ndl: be(Gt),
          f: [
            Ae(xe, "أعلى وردية", null, "أعلى احتياج وردية: " + xe + " · سقف ما تحتاجه في وقتٍ واحد."),
            Ae(
              Gt + "٪",
              "من القوة",
              "#8A6F35",
              "الاحتياج ÷ القوة = " + j + " ÷ " + w + " = " + Gt + "٪ قبل خصم الراحات · كلما ارتفع ضاق هامش المناورة.",
            ),
            Ae(
              Math.abs(Bt),
              Bt >= 0 ? "فائض نظري" : "عجز نظري",
              Bt >= 0 ? "#141414" : "#b3402f",
              "القوة − الاحتياج = " + w + " − " + j + " = " + Bt + " · احتياطك الحر قبل أن تأكل منه الراحاتُ والإجازات.",
            ),
          ],
        },
        {
          label: "مجدولون على الورديات",
          sub: "من الجدول الشهري — ولكلٍّ راحته الأسبوعية",
          v: String(C),
          vSt: "",
          vTip:
            "المجدولون = من له وردية في جدول هذا الشهر: " +
            C +
            " من " +
            w +
            " · من لا وردية له قوة على الورق فقط — والعدّاد يقيس نسبة المجدولين.",
          off: fe(n(C, w)),
          ndl: be(n(C, w)),
          f: [
            Ae(
              Wt,
              "أثقل — " + S(qt),
              null,
              "أثقل وردية «" +
                qt +
                "»: " +
                KIVO.BassamCount(Wt, ["مسكَّن واحد", "مسكَّنان", "مسكَّنَين", "مسكَّنين", "مسكَّناً", "مسكَّن"]) +
                " · مصدرك الأول للنقل عند عجز وردية أخرى.",
            ),
            Ae(n(C, w) + "٪", "من القوة", "#8A6F35", "المجدولون ÷ القوة = " + C + " ÷ " + w + " · اكتمال البنية الزمنية للشهر."),
            Ae(
              Dt,
              "أخفّ — " + S(Qt),
              null,
              "أخفّ وردية «" +
                Qt +
                "»: " +
                KIVO.BassamCount(Dt, ["مسكَّن واحد", "مسكَّنان", "مسكَّنَين", "مسكَّنين", "مسكَّناً", "مسكَّن"]) +
                " · أول مرشّح للتعزيز — والفرق عن الأثقل " +
                (Wt - Dt) +
                ".",
            ),
          ],
        },
        {
          label: "موزّعون على المواقع",
          sub: KIVO.BassamCount(B, "خانة|مسدودة") + " من " + j,
          v: String(W),
          vSt: "color:var(--fg-xb3402f)",
          vTip:
            "الموزَّعون = أسماء فريدة واقفة على عناصر الميدان: " +
            W +
            " · التوزيع هو تحويل الجدول إلى مواقع محروسة — والعدّاد يقيس سدّ الخانات.",
          off: fe($t),
          ndl: be($t),
          f: [
            Ae(B, "خانة مسدودة", null, "خانات الاحتياج التي عليها اسم: " + B + " من " + j + " · المسدود وحده محروس فعلاً."),
            Ae($t + "٪", "سدّ الخانات", "#b3402f", "المسدود ÷ الاحتياج = " + B + " ÷ " + j + " = " + $t + "٪ · مقياس بدء التوزيع الحقيقي."),
            Ae(
              Math.max(0, j - B),
              "خانة شاغرة",
              "#b3402f",
              "الاحتياج − المسدود = " + Math.max(0, j - B) + " · كل خانة منها عجزٌ مبرمَج قبل أن يبدأ اليوم.",
            ),
          ],
        },
        {
          label: "أيام موثّقة بجولة",
          sub:
            "من " +
            KIVO.BassamCount(R, "يوم", "g") +
            " " +
            KIVO.BassamCount.agr(R, "مضى", "مضيا", "مضت") +
            " — والاعتماد " +
            q +
            " من " +
            H,
          v: String(H),
          vSt: "",
          vTip:
            "الأيام الموثّقة بجولة ميدانية: " +
            H +
            " من " +
            R +
            " مضى · عين المدير على الميدان يوماً بيوم — واليوم غير المسجّل لا يُتعلَّم منه.",
          off: fe(n(H, R)),
          ndl: be(n(H, R)),
          f: [
            Ae(H, "جولة وتقرير", null, "أيام لها جولة موثّقة: " + H + " · اليوم المكتمل التوثيق مرجع يُقاس عليه."),
            Ae(n(H, R) + "٪", "التوثيق", "#8A6F35", "الموثّق ÷ الأيام الماضية = " + H + " ÷ " + R + " · انتظام عادة المتابعة اليومية."),
            Ae($, "بلا أثر", $ ? "#b3402f" : "#141414", "أيام بلا تقرير ولا جولة: " + $ + " · فجوات عمياء في سجل شهرك."),
          ],
        },
      ].map((t) => ({
        label: t.label,
        sub: t.sub,
        v: t.v,
        vTip: t.vTip || "",
        vSt: "font-size:31px;font-weight:900;line-height:1.2;margin-top:2px;color:var(--fg-x141414);" + (t.vSt || ""),
        off: t.off,
        ndl: "transform-origin:100px 104px;transition:transform 1.2s cubic-bezier(.3,.9,.28,1.05);" + t.ndl,
        f1b: t.f[0].b,
        f1s: t.f[0].s,
        f1st: t.f[0].bSt,
        f1t: t.f[0].t,
        f2b: t.f[1].b,
        f2s: t.f[1].s,
        f2st: t.f[1].bSt,
        f2t: t.f[1].t,
        f3b: t.f[2].b,
        f3s: t.f[2].s,
        f3st: t.f[2].bSt,
        f3t: t.f[2].t,
      })),
      ve = 2 * Math.PI * 50,
      we = w ? dt / w : 0,
      Se = w ? pt / w : 0,
      ke = Math.max(we * ve - 2, 1.5),
      Me = Math.max(Se * ve - 2, 1.5),
      Ee = {
        total: String(w),
        topName: lt,
        topC: String(dt),
        topPct: n(dt, w),
        secName: ct,
        secC: String(pt),
        secPct: n(pt, w),
        segA: "width:" + n(dt, w) + "%;background:linear-gradient(90deg,var(--bg-xd9c08a),var(--bg-x8a6f35))",
        segB: "width:" + n(pt, w) + "%;background:var(--bg-x33507f)",
        dashA: ke.toFixed(1) + " " + ve.toFixed(2),
        dashB: Me.toFixed(1) + " " + ve.toFixed(2),
        rotB: String((360 * we - 90).toFixed(1)),
        read:
          (n(dt, w) >= 55 ? "«" + lt + "» " + n(dt, w) + "٪ من قوّتك — " : "") +
          (0 === at ? "وحقل الجوال غائب عن الجميع — معلومة الاستدعاء أول ما تحتاجه ليلة أول طارئ." : "بيانات القرار شبه مكتملة."),
      },
      ze = Math.max(B > 0 ? 0.5 : 0, Math.min(100, $t)),
      Oe = {};
    ne.forEach((t) => {
      const e = ((t) => ({ off: fe(t), ndl: be(t) }))(t.pct);
      ((Oe["rd" + t.key.slice(1) + "pct"] = t.pct + "٪"),
        (Oe["rd" + t.key.slice(1) + "off"] = e.off),
        (Oe["rd" + t.key.slice(1) + "ndl"] =
          "transform-origin:100px 104px;transition:transform 1.2s cubic-bezier(.3,.9,.28,1.05);" + e.ndl),
        (Oe["rd" + t.key.slice(1) + "rows"] = t.rows.map((t) => {
          const e = !t.dash && (t.p || 0) < 99,
            r = t.dash ? 0 : Math.max((t.p || 0) > 0 ? 1.2 : 0, Math.min(100, t.p || 0));
          return {
            nm: t.nm,
            tip: t.tip || "",
            tk:
              "display:block;height:100%;border-radius:99px;width:" +
              r +
              "%;background:" +
              (e ? "linear-gradient(90deg,#EBBCB2,#b3402f)" : "linear-gradient(90deg,#D9C08A,#B99751)"),
            pc: t.dash ? "—" : void 0 !== t.lbl ? t.lbl : t.p + "٪",
            pcSt: "text-align:left;font-weight:900;font-size:12.5px;color:" + (e || t.dash ? "var(--fg-xb3402f)" : "var(--fg-x8a6f35)"),
            ic: e || t.dash ? "⚠" : "✓",
            icSt: "text-align:center;font-size:12px;color:" + (e || t.dash ? "var(--fg-xb3402f)" : "var(--fg-x16a34a)"),
          };
        })),
        (Oe["rd" + t.key.slice(1) + "pill"] = ((t) =>
          t >= 75
            ? "background:var(--bg-a185151810p1);border:1px solid var(--bd-xe8dcc0);color:var(--fg-x8a6f35)"
            : t >= 40
              ? "background:var(--bg-a245158110p12);border:1px solid var(--bd-xf3dfb9);color:var(--fg-xd97706)"
              : "background:var(--bg-xfdf1ef);border:1px solid var(--bd-xf2d6d0);color:var(--fg-xb3402f)")(t.pct)),
        (Oe["rd" + t.key.slice(1) + "pctTip"] =
          t.pct +
          "٪ = متوسط حقول القياس الخمسة لمؤشر «" +
          t.name +
          "» (" +
          t.rows.map((t) => (t.dash ? "—" : Math.round(t.p || 0))).join(" · ") +
          ") · الحقول الحمراء هي ما يخفضه — ومعالجتها ترفع المؤشر مباشرة."));
    });
    const Ce = {
        critical: {
          chip: "عاجل",
          style: "background:var(--bg-a22038380p05);border:1px solid var(--bd-a22038380p25)",
          icon: "background:var(--bg-a22038380p1);color:var(--fg-xdc2626)",
          chipS: "background:var(--bg-a22038380p1);color:var(--fg-xdc2626);border:1px solid var(--bd-a22038380p3)",
        },
        warning: {
          chip: "مهم",
          style: "background:var(--bg-a245158110p05);border:1px solid var(--bd-a245158110p25)",
          icon: "background:var(--bg-a245158110p12);color:var(--fg-xb45309)",
          chipS: "background:var(--bg-a245158110p12);color:var(--fg-xb45309);border:1px solid var(--bd-a245158110p3)",
        },
      },
      Fe = [];
    (ut &&
      (vt < ut || ft.length) &&
      Fe.push({
        cap: _bsPlan + "&gates",
        s: "critical",
        title: "صنّف أولوية التغطية (أ/ب/ج)" + (ft.length ? " — ووحّد الأرقام المكرّرة" : ""),
        action:
          "الأولوية غائبة عن " +
          (ut - vt) +
          " من " +
          KIVO.BassamCount(ut, "باب", "g") +
          " — بدونها كل قرارات العجز ارتجال. ابدأ بالأبواب الرئيسية فئة (أ) والسلالم والمصاعد (ج)." +
          (ft.length
            ? " و" +
              KIVO.BassamCount(bt, "باب") +
              " " +
              KIVO.BassamCount.agr(bt, "يتصادم", "يتصادمان", "تتصادم") +
              " على " +
              KIVO.BassamCount(ft.length, "رقم", "g") +
              " (" +
              ft.slice(0, 3).join("، ") +
              ") — وحّدها قبل أي تقرير."
            : ""),
        p1: "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z",
        p2: "M4 22v-7",
      }),
      Tt &&
        Y < Tt &&
        Fe.push({
          cap: _bsPlan + "&dist",
          s: "critical",
          title: "راجع احتياج أبوابك باباً باباً بدل الرقم الموروث",
          action:
            Tt -
            Y +
            " من " +
            KIVO.BassamCount(Tt, "عنصر", "g") +
            " " +
            KIVO.BassamCount.agr(
              Tt - Y,
              "احتياجه ما زال على القيمة الافتراضية — راجعه",
              "احتياجهما ما زال على القيمة الافتراضية — راجعهما",
              "احتياجها ما زال على القيمة الافتراضية — راجعها",
            ) +
            " بدءاً بالأبواب الرئيسية، وفصّل بالورديات حيث تختلف الأحمال.",
          p1: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
          p2: "M12 6v6l4 2",
        }),
      j > 0 &&
        $t < 50 &&
        Fe.push({
          cap: _bsPlan + "&dist",
          s: "critical",
          title: "نفّذ التوزيع — الخطوة الواقفة في الجاهزية كلها",
          action:
            "المسدود " +
            B +
            " من " +
            KIVO.BassamCount(j, "خانة", "g") +
            " (" +
            $t +
            "٪) — استعمل «التوزيع الآلي» بعدسة الأبواب في وضع «توزيع»: يقرأ جدول الاحتياج ويسدّه بضغطة." +
            (D.length ? " وحُلّ ازدواج " + D.length + " اسمٍ يقف على أكثر من عنصر." : ""),
          p1: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z",
          p2: "M12 7v6",
        }),
      Jt.length &&
        _t.length &&
        Fe.push({
          cap: _bsSched,
          s: "warning",
          title: "أعد توزيع الراحات على أيام الأسبوع",
          action:
            "أيام مكشوفة عن الاحتياج (" +
            j +
            "): " +
            Jt.map((t) => t.d + " " + t.gap).join("، ") +
            " — انقل راحاتٍ نحو " +
            _t
              .slice(0, 2)
              .map((t) => t.d + " (+" + t.gap + ")")
              .join(" و") +
            ".",
          p1: "M8 2v4",
          p2: "M3 10h18",
        }),
      Q < R &&
        Fe.push({
          cap: _bsDr + "|" + _bsRd,
          s: "warning",
          title: "حوّل المتابعة إلى عادةٍ يومية بثلاث لبنات",
          action:
            "المسحوب " +
            X +
            " من " +
            KIVO.BassamCount(R * h.length, "وردية", "g") +
            "، والموثَّق " +
            H +
            " من " +
            KIVO.BassamCount(R, "يوم", "g") +
            "، والمعتمد " +
            q +
            " من " +
            H +
            " — تقريرٌ يُسحب صباح كل وردية، وجولةٌ تُوثَّق، واعتمادٌ يقفل السجل.",
          p1: "M21 12a9 9 0 1 1-9-9",
          p2: "M21 3v6h-6",
        }),
      w &&
        at < w &&
        Fe.push({
          s: "warning",
          title: "اجمع جوالات القوة",
          action:
            (at < w ? "معلومة الاستدعاء غائبة عن " + KIVO.BassamCount(w - at, "موظف", "g") + ". " : "") +
            "تُستورد دفعةً بملف Excel من صفحة موظفي الإدارة.",
          p1: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z",
          p2: "M14 8h.01",
        }));
    const Pe = Fe.filter((t) => _bsCapOk(t.cap)).map((t) => ({
        title: t.title,
        action: t.action,
        severity: Ce[t.s].chip,
        style: Ce[t.s].style,
        iconStyle: Ce[t.s].icon,
        chipStyle: Ce[t.s].chipS,
        p1: t.p1,
        p2: t.p2,
      })),
      Te = (function () {
        try {
          const t = KIVO.bus.read("dreport.doc@1") || {},   /* V7 · د5-هـ: التقريرُ بالناقل؛ بغيابه لا تقرير */
            e = KIVO.BassamCal.hParts(new Date()),   /* V7 · د5-د2 */
            n = t[e.y + "-" + e.m + "-" + e.d],
            a = {};
          return (
            n &&
              n.shifts &&
              Object.keys(n.shifts).forEach((t) => {
                ((n.shifts[t] || {}).roster || []).forEach((t) => {
                  t && t.ekey && "lv" === t.st && (a[t.ekey] = t.lvk || "إجازة");
                });
              }),
            a
          );
        } catch (t) {
          return {};
        }
      })();
    let Ie = 0,
      je = 0,
      Ne = 0;
    const Ye = e.toLocaleDateString("ar-SA-u-nu-latn", { weekday: "long" });
    i.forEach((t) => {
      const e = k(t);
      (((t) => {
        const e = KIVO.BassamEmp && KIVO.BassamEmp.key ? KIVO.BassamEmp.key(t) : t.eid || t.nid || t.name || "";
        return Te[e] || "";
      })(t)
        ? je++
        : (Array.isArray(e.rest) ? e.rest : []).some((t) => t === Ye || "ال" + t === Ye || t === "ال" + Ye) && Ie++,
        !0 === e.muk && Ne++);
    });
    const Ge = Math.max(0, w - Ie - je),
      Be = U.map((t, e) => ({
        n: String(e + 1),
        st:
          "full" === t
            ? "width:29px;height:29px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;background:linear-gradient(135deg,var(--bg-xc9a961),var(--bg-x8a6f35));color:var(--text-on-brand);box-shadow:0 3px 8px -2px rgba(138,111,53,0.5)"
            : "half" === t
              ? "width:29px;height:29px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;background:linear-gradient(90deg,var(--bg-xfce9c8) 50%,var(--bg-xfbfaf6) 50%);border:1.6px solid var(--bd-xfbbf24);color:var(--fg-xb45309)"
              : "width:29px;height:29px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;border:1.6px dashed var(--bd-xd8d2c2);background:var(--bg-xfbfaf6);color:var(--fg-x8b8676)",
      })),
      Le = (t) => String(t);
    return {
      rdScore: Le(ae),
      rdVerdict: ie.lbl,
      rdScoreTip: de,
      rdVerdictTip: ce,
      rdTopTip: "أعلى خطوة «" + se.name + "» عند " + se.pct + "٪ — أقرب خطوةٍ للاكتمال؛ لا تحتاج إلا لمساتٍ أخيرة.",
      rdLowTip: "أدنى خطوة «" + le.name + "» عند " + le.pct + "٪ — عنق الزجاجة؛ كل نقطة فيها ترفع المؤشر الجامع أسرع من غيرها.",
      rdAvgTip: de,
      rdFldTip:
        "الحقول السليمة (99٪ فأعلى): " +
        me +
        " من " +
        KIVO.BassamCount(me + he, "حقل", "g") +
        " عبر المؤشرات المتاحة · خريطة سريعة لحجم العمل المتبقي.",
      rdFldOkTip: "حقول بلغت 99٪ فأعلى: " + me + " — مكتملة عملياً ولا تحتاج قراراً.",
      rdFldBadTip: "حقول دون 99٪: " + he + " — كل واحدٍ منها قرار عملٍ معلّق يخفض مؤشره.",
      rdTodayAvailTip:
        "القوة − راحات اليوم − إجازات اليوم = " +
        w +
        " − " +
        Ie +
        " − " +
        je +
        " = " +
        Ge +
        " (" +
        n(Ge, w) +
        "٪) · من تملكه فعلاً هذا اليوم.",
      rdTodayRestTip: "من يصادف اليومُ أحدَ يومي راحته الأسبوعية: " + Ie + " · معلومة تفسّر انخفاض متاحي اليوم.",
      rdTodayLvTip: "المؤشَّر لهم إجازة في تقرير اليوم: " + je + " · تُخصم من متاحي اليوم تلقائياً.",
      rdTodayMukTip: "المكلفون (حالة تكليف مستقلة عن الوردية): " + Ne + " · قوة إضافية خارج العدّ الاعتيادي.",
      rd1totalTip:
        "القوة الاسمية = سجلات موظفي الإدارة: " + w + " (ميداني " + (ot["ميداني"] || 0) + ") · رأس المال الذي تصرف منه بقية الخطوات.",
      rd1topTip: "«" + lt + "»: " + dt + " من " + w + " = " + n(dt, w) + "٪ · قوة مؤقتة تنتهي بنهاية الموسم — خطط لما بعدها من الآن.",
      rd1secTip: "«" + ct + "»: " + pt + " من " + w + " = " + n(pt, w) + "٪ · قوتك الثابتة الباقية بعد الموسم.",
      rd2totalTip:
        "أبواب خطة الشهر: " +
        ut +
        " موزعة على " +
        KIVO.BassamCount(Mt.length, "ساحة", "g") +
        " · نطاق مسؤولية الإدارة كاملاً — لا موقع خارج المنصة.",
      rd3needTip: "الاحتياج = مجموع احتياج كل عنصر في كل وردية = " + j + " · عليه تُحاسَب خطوتا التنظيم والتوزيع.",
      rd3strainTip:
        "الاحتياج ÷ القوة = " +
        j +
        " ÷ " +
        w +
        " = " +
        Gt +
        "٪ قبل خصم الراحات · الفائض النظري " +
        Math.max(0, Bt) +
        " ستأكل منه الراحات والإجازات.",
      rd4BigTip: "المجدولون ÷ القوة = " + C + " ÷ " + w + " = " + n(C, w) + "٪ · اكتمال البنية الزمنية — أعداد كل وردية بجانبه.",
      rd4ShiftsTip:
        "أعداد المسكّنين بكل وردية من الجدول الشهري — الفرق " + (Wt - Dt) + " بين الأثقل والأخف · فجوة كبيرة ترهق وردية بلا سبب.",
      rd5filledTip: "الخانات المسدودة بأسماء: " + B + " من " + j + " = " + $t + "٪ · كل خانة شاغرة عجز مبرمَج قبل أن يبدأ اليوم.",
      rd5dupTip: "أسماء تقف على أكثر من عنصرٍ معاً: " + D.length + " · الازدواج تغطية وهمية — عنصران محسوبان برجلٍ واحد.",
      rd5unTip2: "القوة غير الموزّعة = " + w + " − " + W + " = " + Math.max(0, w - W) + " · قوة تدفع رواتبها ولا تحرس شيئاً حتى تُوزَّع.",
      rd5resTip:
        "الاحتياط النظري = القوة − الاحتياج = " + w + " − " + j + " = " + Math.max(0, Bt) + " · ما يتبقى حراً للطوارئ بعد سدّ كل الخانات.",
      rd6docTip: "أيام وُثّقت بجولة: " + H + " من " + R + " مضى · دورة اليوم الكاملة: تقرير ثم جولة ثم اعتماد.",
      rd6fullTip: "أيام لها جولة موثّقة: " + H + " (" + n(H, R) + "٪) · أيام مكتملة الأثر.",
      rd6halfTip: "أيام لها تقرير بلا جولة: " + V + " (" + n(V, R) + "٪) · نصف دورة — حضورٌ سُحب وميدانٌ لم يُوثَّق.",
      rd6noneTip: "أيام بلا تقرير ولا جولة: " + $ + " (" + n($, R) + "٪) · فجوات عمياء لا يُعرف ما جرى فيها.",
      rd6apprTip: "الجولات المعتمدة: " + q + " من " + H + " · الاعتماد يقفل السجل فيصير مرجعاً يُحاسَب عليه.",
      rd6lvTip:
        "تأشيرات الإجازة في تقارير هذا الشهر: " +
        K +
        " (لـ" +
        KIVO.BassamCount(_, "موظف", "g") +
        ") · المؤشَّر يسقط من عدّ يومه تلقائياً بدل أن يظهر غائباً.",
      rdVerdictSt:
        "font-size:15px;font-weight:900;border-radius:9999px;padding:3px 14px;color:" +
        ie.c +
        ";background:" +
        ie.bg +
        ";border:1px solid " +
        ie.bd,
      rdMiss: pe,
      rdMonthLbl:
        "مؤشر جاهزية التشغيل · " + KIVO.BassamCal.hText(e, { month: "long", year: "numeric" }),
      rdCols: ge,
      rdCalc: ue,
      rdTopTxt: se.name + " " + se.pct + "٪",
      rdLowTxt: le.name + " " + le.pct + "٪",
      rdAvgTxt: ae + "٪",
      rdFldTxt: me + " من " + (me + he),
      rdFldOkW: "width:" + n(me, me + he) + "%;background:linear-gradient(90deg,var(--bg-x1e9e5a),var(--bg-x0f8a50))",
      rdFldBadW: "width:" + n(he, me + he) + "%;background:linear-gradient(90deg,var(--bg-xd96a57),var(--bg-xb3402f))",
      rdFldOkN: Le(me),
      rdFldBadN: Le(he),
      rdFldOkPct: n(me, me + he) + "٪",
      rdFldBadPct: n(he, me + he) + "٪",
      rdKpis: ye.filter(
        (t) =>
          ({
            "نطاق الميدان": _on(_bsPlan) && _on("gates"),
            "احتياج الشهر": _on(_bsPlan) && _on("dist"),
            "مجدولون على الورديات": _on(_bsSched),
            "موزّعون على المواقع": _on(_bsPlan) && _on("dist"),
            "أيام موثّقة بجولة": _on(_bsRd),
          })[t.label] !== !1,
      ),
      rdStepsN: String(_nS),
      rdNeedKinds:
        [
          ["zones", "المناطق"],
          ["gates", "الأبواب"],
          ["marks", "المعالم"],
        ]
          .filter((t) => _on(t[0]))
          .map((t) => t[1])
          .join(" و") || "العناصر",
      rdP1On: ne.some((t) => "p1" === t.key),
      rdP1N: (ne.find((t) => "p1" === t.key) || {}).n || "",
      rdP2On: ne.some((t) => "p2" === t.key),
      rdP2N: (ne.find((t) => "p2" === t.key) || {}).n || "",
      rdP3On: ne.some((t) => "p3" === t.key),
      rdP3N: (ne.find((t) => "p3" === t.key) || {}).n || "",
      rdP4On: ne.some((t) => "p4" === t.key),
      rdP4N: (ne.find((t) => "p4" === t.key) || {}).n || "",
      rdP5On: ne.some((t) => "p5" === t.key),
      rdP5N: (ne.find((t) => "p5" === t.key) || {}).n || "",
      rdP6On: ne.some((t) => "p6" === t.key),
      rdP6N: (ne.find((t) => "p6" === t.key) || {}).n || "",
      rdCalcSub: 6 === _nS ? "— ستة مؤشرات على خطوات قرار المدير الست" : "— " + _nS + " من خطوات قرار المدير الست متاحة لهذه الإدارة",
      rdFieldsTitle: "حالة حقول القياس (" + (me + he) + ") — عبر المؤشرات المتاحة (" + _nS + ")",
      rdTodayAvail: Le(Ge),
      rdTodayAvailPct: n(Ge, w) + "٪",
      rdTodayRest: Le(Ie),
      rdTodayLv: Le(je),
      rdTodayMuk: Le(Ne),
      ...Oe,
      ...KIVO.BassamCount.pair("rd1total", Ee.total, "موظف"),
      rd1topName: Ee.topName,
      rd1topC: Ee.topC,
      rd1topPct: Ee.topPct + "٪",
      rd1secName: Ee.secName,
      rd1secC: Ee.secC,
      rd1secPct: Ee.secPct + "٪",
      rd1segA: Ee.segA,
      rd1segB: Ee.segB,
      rd1dashA: Ee.dashA,
      rd1dashB: Ee.dashB,
      rd1rotB: Ee.rotB,
      ...KIVO.BassamCount.pair("rd2total", Le(ut), "باب"),
      rd2segs: zt,
      rd2leg: Ot,
      rd2kinds: Ft,
      rd2dupOn: ft.length > 0,
      rd2dupTxt: ft.length
        ? "رقما " +
          ft.slice(0, 2).join(" و") +
          (ft.length > 2 ? " و" + (ft.length - 2) + " أخرى" : "") +
          " مكرّران — " +
          KIVO.BassamCount(bt, "باب") +
          " " +
          KIVO.BassamCount.agr(
            bt,
            "يتصادم على رقمين، وأي تقريرٍ عليه يختلط ببعضه.",
            "يتصادمان على رقمين، وأي تقريرٍ عليهما يختلط ببعضه.",
            "تتصادم على رقمين، وأي تقريرٍ عليها يختلط ببعضه.",
          )
        : "",
      rd3need: Le(j),
      rd3formula: KIVO.BassamCount(ut, "باب") + " × " + KIVO.BassamCount(h.length, "وردية") + " — من جداول الاحتياج",
      rd3strain: Gt + "٪",
      rd3strainW:
        "display:block;height:100%;width:" +
        Math.min(100, Gt) +
        "%;border-radius:99px;background:linear-gradient(90deg,var(--bg-xd9c08a),var(--bg-x8a6f35))",
      rd3strainNote: j + " من قوةٍ قوامها " + w + " — الفائض النظري " + Math.max(0, Bt) + "، وستأكل منه الراحاتُ والإجازات.",
      rd3cols: h.map((t) => ({
        v: Le(N[t] || 0),
        nm: S(t),
        pc: n(N[t] || 0, j) + "٪",
        tip:
          "احتياج «" +
          t +
          "»: " +
          (N[t] || 0) +
          " (" +
          n(N[t] || 0, j) +
          "٪ من " +
          j +
          ") — مجموع احتياج عناصرها · تطابق الأعمدة تماماً علامة رقمٍ افتراضي لم يُراجَع.",
        h:
          "display:block;height:" +
          Math.max(6, Math.round(((N[t] || 0) / Math.max(1, xe)) * 92)) +
          "px;width:100%;max-width:60px;margin:0 auto;border-radius:8px 8px 3px 3px;background:linear-gradient(180deg,var(--bg-xd9c08a),var(--bg-x8a6f35));box-shadow:inset 0 2px 4px rgba(255,255,255,0.35)",
      })),
      rd3sameOn: Tt > 0 && 0 === Y && 0 === G,
      rd4shiftsLine: h.map((t) => S(t) + " " + (E[t] || 0)).join(" · ") + " — الفرق " + (Wt - Dt) + " بين الأثقل والأخف",
      ...KIVO.BassamCount.pair("rd5filled", Le(B), "خانة|مسدودة"),
      rd5need: Le(j),
      rd5fillW:
        "position:absolute;top:2px;bottom:2px;right:2px;border-radius:99px;background:linear-gradient(90deg,var(--bg-xb3402f),var(--bg-xd96a57));box-shadow:0 0 8px rgba(179,64,47,0.5);width:" +
        ze +
        "%;min-width:7px",
      rd5vacant: Le(Math.max(0, j - B)),
      rd5fillPct: $t + "٪",
      rd5vacPct: Math.round(10 * (100 - $t)) / 10 + "٪",
      rd5dupOn: D.length > 0,
      rd5dupTxt: D.length
        ? "⚠ " +
          (1 === D.length
            ? "اسم واحد يقف على أكثر من عنصر معاً"
            : KIVO.BassamCount(D.length, "اسم") +
              " " +
              KIVO.BassamCount.agr(D.length, "يقف", "يقفان", "تقف") +
              " على أكثر من عنصر معاً")
        : "",
      rd5unTxt: "القوة غير الموزّعة " + Math.max(0, w - W) + " من " + w,
      rd5resTxt: "الاحتياط النظري بعد السدّ " + Math.max(0, Bt),
      ...KIVO.BassamCount.pair("rd6docDays", Le(H), "يوم|موثّق"),
      ...KIVO.BassamCount.pair("rd6elapsed", Le(R), "يوم|مضى", "g"),
      rdDays: Be,
      rd6full: Le(H),
      rd6half: Le(V),
      rd6none: Le($),
      rd6fullPct: n(H, R) + "٪",
      rd6halfPct: n(V, R) + "٪",
      rd6nonePct: n($, R) + "٪",
      rd6apprTxt:
        "⚠ الاعتماد " + q + " من " + H + " — " + (H && !q ? "الجولات المسجّلة ما زالت مسودّات مفتوحة" : "اعتماد الجولة يقفل سجل اليوم"),
      rd6lvTxt: K
        ? "✓ الإجازات مستعملة — " + KIVO.BassamCount(K, "تأشيرة") + " لـ" + KIVO.BassamCount(_, "موظف", "g") + " هذا الشهر"
        : "⚠ لا تأشيرات إجازة هذا الشهر",
      rd1read: Ee.read,
      rd2read: Mt.length
        ? "ثقل ميدانك في " + Mt[0] + " (" + n(kt[Mt[0]] || 0, ut) + "٪) — توزيع المراقبين والقيادة الميدانية يتبع هذا الثقل لا التساوي."
        : "ارسم أبواب ميدانك على الخريطة ليكتمل الحصر.",
      rd3read:
        Tt > 0 && 0 === Y
          ? "احتياجك نسخة واحدة مكرّرة — نفس الرقم لكل عنصرٍ ولكل وردية. هذا رقم استيرادٍ لم يمرّ بقرار."
          : "روجع من الاحتياج " + Y + " من " + KIVO.BassamCount(Tt, "عنصر", "g") + " — أكمل المراجعة عنصراً عنصراً.",
      rd4read: Jt.length
        ? "الميزان الحقيقي بالأيام لا بالورديات — " +
          KIVO.BassamCount(Jt.length, "يوم|مكشوف") +
          " عن الاحتياج (" +
          j +
          ") أدناها " +
          (Jt.slice().sort((t, e) => t.gap - e.gap)[0] || {}).d +
          "."
        : "كل أيام الأسبوع تُوفي الاحتياج اليومي — البنية الزمنية سليمة.",
      rd5read:
        $t < 50
          ? "هذه هي الخطوة الواقفة في جاهزيتك كلها — ما قبلها شبه جاهز، والتوزيع عند " + $t + "٪."
          : "التوزيع قائم — راقب اكتمال العناصر وردياتها الأربع.",
      rd6read:
        $ > 0
          ? "منظومة يومك تعمل متقطّعة — " +
            KIVO.BassamCount($, "يوم") +
            " من شهرك " +
            KIVO.BassamCount.agr($, "مرّ", "مرّا", "مرّت") +
            " بلا أثرٍ مسجّل، واليوم الذي لا يُسجَّل لا يُتعلَّم منه غداً."
          : "دورة اليوم منتظمة — حافظ على الاعتماد أولاً بأول.",
      rdRecs: Pe,
      rdRecsOn: Pe.length > 0,
      rdGoSched: () => {
        try {
          window.dispatchEvent(new CustomEvent("bs:ptab", { detail: "sched" }));
        } catch (t) {}
      },
    };
  }
  renderVals() {
    this._bsHR();
    const t = this._emPermVals(),
      e = this.state,
      r = {
        دائم: "background:var(--bg-a0163870p08);color:var(--fg-x047857);border:1px solid var(--bd-a0163870p25)",
        موسمي: "background:var(--bg-a245158110p08);color:var(--fg-xb45309);border:1px solid var(--bd-a245158110p3)",
        ميداني: "background:var(--bg-a141652330p08);color:var(--fg-x0369a1);border:1px solid var(--bd-a141652330p25)",
        إداري: "background:var(--bg-a1131131220p08);color:var(--fg-x3f3f46);border:1px solid var(--bd-a1131131220p25)",
        نشط: "background:var(--bg-a0163870p08);color:var(--fg-x047857);border:1px solid var(--bd-a0163870p25)",
        "بانتظار التفعيل": "background:var(--bg-a245158110p08);color:var(--fg-xb45309);border:1px solid var(--bd-a245158110p3)",
        "بدون حساب": "background:var(--bg-a2452452450p8);color:var(--fg-x53565a);border:1px dashed var(--bd-xcbd5e1)",
        group: "background:var(--bg-a185151810p08);color:var(--fg-x9a7e40);border:1px solid var(--bd-a185151810p3)",
        noGroup: "background:var(--bg-a2452452450p8);color:var(--fg-x94a3b8);border:1px dashed var(--bd-xcbd5e1)",
      };
    let n = e.employees.map((t, e) => ({ i: e, ...t }));
    (String(e.search || "").trim() &&
      (n = KIVO.BassamFind.filter(e.search, n, (t) => [t.name, t.nid, t.phone, t.empno, t.email, t.type, t.gender])),
      "all" !== e.fType && (n = n.filter((t) => t.type === e.fType)),
      "all" !== e.fGender && (n = n.filter((t) => t.gender === e.fGender)));
    const a = { name: "name", type: "type", account: "account" };
    if (e.sortField) {
      const t = a[e.sortField],
        r = new Intl.Collator("ar", { sensitivity: "base", numeric: !0 });
      n = [...n].sort((n, a) => r.compare(this.normAr(n[t]), this.normAr(a[t])) * ("asc" === e.sortDir ? 1 : -1));
    }
    const i = (() => {
        try {
          return KIVO.BassamAuth && KIVO.BassamAuth.staffMap ? KIVO.BassamAuth.staffMap() : {};
        } catch (t) {
          return {};
        }
      })(),
      o = (t) => (KIVO.BassamEmp && KIVO.BassamEmp.key ? KIVO.BassamEmp.key(t) : t.eid || t.nid || t.name || ""),
      s = (t) => i[o(t)] || "none";
    if (e.fAcct && "all" !== e.fAcct) {
      const t = "نشط" === e.fAcct ? "active" : "مجمّد" === e.fAcct ? "frozen" : "none";
      n = n.filter((e) => s(e) === t);
    }
    if (!e.sortField && !String(e.search || "").trim()) {
      const t = (t) => {
          const e = s(t);
          return "active" === e ? 0 : "frozen" === e ? 1 : 2;
        },
        /* V7 · د5-هـ (44): الترتيبُ بترتيب أدوار الإدارة (محرّك الأدوار) — من لا دور له في آخرها */
        e = this.PERM_ROLES(),
        i = (t) => {
          const q = t ? this.PERM_ROLE_OF(t) : null,
            k = q ? e.findIndex((x) => x.id === q.id) : -1;
          return -1 === k ? 99 : k;
        },
        l = new Intl.Collator("ar", { sensitivity: "base", numeric: !0 });
      n = [...n].sort((e, r) => t(e) - t(r) || i(o(e)) - i(o(r)) || l.compare(String(e.name || ""), String(r.name || "")));
    }
    const l =
        this.PC("edit") &&
        (!(KIVO.BassamAuth && KIVO.BassamAuth.isStaff && KIVO.BassamAuth.isStaff()) ||
          !!(KIVO.BassamAuth && KIVO.BassamAuth.user && (KIVO.BassamAuth.user() || {}).mgr)),
      d = {
        active: ["نشط", "#008450", "rgba(0,163,87,0.08)", "rgba(0,163,87,0.28)", "#047857"],
        frozen: ["مجمّد", "#e5b563", "rgba(245,158,11,0.1)", "rgba(245,158,11,0.3)", "#b45309"],
        none: ["بلا حساب", "#cbd5e1", "rgba(245,245,245,0.9)", "#e2e8f0", "#94a3b8"],
      },
      /* دفعة الواجهات (2أ): مفاتيحُ المديرين كما يحكم بها الخادم (018 usersMgrEk) — mgr:/gm: أو مفتاحُ حسابِ مديرٍ قائم (دورُه غيرُ staff أو بالشارة) */
      mkS = (() => {
        const t = {};
        try {
          (KIVO.BassamAuth.users() || []).forEach((e) => {
            e && e.ekey && ("staff" !== e.role || e.mgr) && (t[e.ekey] = 1);
          });
        } catch (e) {}
        return (e) => /^(mgr|gm):/.test(String(e || "")) || !!t[e];
      })(),
      c = n.map((t) => ({
        ...t,
        initial: t.name.trim().charAt(0),
        ...(() => {
          const r = s(t),
            n = d[r],
            a = o(t),
            i = String(t.nid || "").trim() || String(t.phone || "").trim(),
            c = String(t.empno || "").trim(),
            p = !!i && !!c,
            m = KIVO.BassamAuth || null,
            h = !!(m && m.staffIsMgr && "none" !== r && m.staffIsMgr(a)),
            u = !!(m && m.isSuper && m.isSuper()),
            /* دفعة الواجهات (2أ): ما يرفضه الخادم لغير مدير النظام لا يُعرض فعلاً — حسابُ المدير لا يُمسّ ('mgr')، وحسابٌ بمفتاح مدير يُجمَّد ويُحذف فقط ('ekey') */
            lk =
              u || "none" === r
                ? ""
                : h
                  ? "حساب مدير الإدارة يديره مسؤول المنصة وحده — لا تفعيلَ ولا تجميدَ ولا تحديثَ لبيانات دخوله من هنا؛ اطلب ذلك من مسؤول المنصة"
                  : mkS(a)
                    ? "مفتاحُ هذا الحساب مفتاحُ مدير — صلاحيتك تجميدُه أو حذفُه فقط؛ إعادةُ تفعيله وتحديثُ بيانات دخوله لمسؤول المنصة"
                    : "",
            g = l,
            f = KIVO.BassamPerm || null,
            b = f && "none" !== r ? f.empPerms(a) : {},
            A = Object.keys(b).filter((t) => (b[t] || []).length).length,
            /* V7 · د5-هـ (44): اسمُ الصلاحية = اسمُ الدور الممنوح (permLabel ← محرّك الأدوار) */
            x = "none" !== r && KIVO.Perm44 && m && m.permLabel ? m.permLabel(a) || "" : "";
          return {
            permLabel: "none" === r ? "—" : h ? "مدير الإدارة ★" : x || (A ? "صلاحيات مخصّصة" : "بلا صلاحيات"),
            permTip:
              "none" === r
                ? "لا صلاحيات بلا حساب دخول — فعّل الحساب أولاً"
                : h
                  ? "مدير الإدارة — يدير حسابات موظفيها وصلاحياتهم ويمنحهم مما يملكه؛ وصفحاتُه كما في ورقته ما لم يوسّعها مسؤول المنصة"
                  : f && f.deptCap().length
                    ? A
                      ? (x ? x + " — " : "") + "الضبط من «الإعدادات ← الصلاحيات ← الأشخاص»"
                      : "لا دور له بعد — أسنِده من «الإعدادات ← الصلاحيات ← الأشخاص»"
                    : "لم يُحدَّد سقف هذه الإدارة — يحدّده مسؤول المنصة من: مركز إدارة رشاد ← الإدارات ← الصلاحيات ← الأنظمة",
            permBadgeStyle:
              "font-size:12px;font-weight:400;white-space:nowrap;color:" +
              (h ? "var(--fg-x9a7e40)" : "none" !== r && A ? "#141414" : "#cbd5e1"),
            permCanEdit: l && "none" !== r && !h,
            accLabel: n[0],
            accDot: n[1],
            accReadOnly: !g,
            accDdOn: g,
            accHas: "none" !== r,
            accNo: "none" === r,
            accTxtStyle: KIVO.BassamPick.txt(g, g && e.accOpen === t.i),
            accPlusStyle: KIVO.BassamPick.plus(g, g && e.accOpen === t.i),
            accBadgeStyle:
              "display:inline-flex;align-items:center;gap:5px;font-family:'Cairo',sans-serif;font-size:12px;font-weight:400;cursor:default;color:" +
              n[4],
            accBtnStyle:
              "width:100%;height:30px;border:1px solid var(--bd-xb99751);border-radius:6px;padding:0 8px;font-size:12px;font-family:'Cairo',sans-serif;background:var(--bg-xffffff);cursor:pointer;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:6px;color:var(--fg-x141414);text-align:right",
            accChev: "flex-shrink:0;opacity:.5;transition:transform .2s;" + (e.accOpen === t.i ? "transform:rotate(180deg)" : ""),
            accMissing: (() => {
              const t = [];
              return (i || t.push("رقم الهوية أو الجوال (اسم المستخدم)"), c || t.push("الرقم الوظيفي (كلمة المرور)"), t);
            })(),
            accTitle:
              "active" === r
                ? "حساب نشط · اسم المستخدم " +
                  (t.nid || t.phone || "—") +
                  (g ? " · انقر لأدوات الحساب" : " · صلاحيتك لا تشمل تعديل الحسابات")
                : "frozen" === r
                  ? "الحساب مجمّد — ممنوع الدخول" + (g ? " · انقر لأدوات الحساب" : "")
                  : "بلا حساب — يتفعّل تلقائياً متى اكتملت شروطه: رقم هوية أو جوال (اسم المستخدم) ورقم وظيفي (كلمة المرور)." +
                    (() => {
                      const t = [];
                      return (i || t.push("رقم الهوية أو الجوال"), c || t.push("الرقم الوظيفي"), t.length ? " ينقصه: " + t.join(" و") : "");
                    })(),
            accOpen: g && "none" !== r && e.accOpen === t.i,
            accToggle: () => {
              g && "none" !== r && this.setState((e) => ({ accOpen: e.accOpen === t.i ? null : t.i }));
            },
            accActText: "frozen" === r ? "إعادة التفعيل" : "active" === r ? "تحديث بيانات الدخول" : "تفعيل الحساب",
            accActStyle:
              "display:flex;align-items:center;gap:7px;padding:7px 9px;border-radius:8px;font-size:11px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif;transition:background .15s;color:" +
              (p && !lk ? "var(--fg-x047857)" : "var(--fg-xcbd5e1)"),
            accFrzStyle:
              "display:flex;align-items:center;gap:7px;padding:7px 9px;border-radius:8px;font-size:11px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif;transition:background .15s;color:" +
              ("active" === r && !(lk && h) ? "#b45309" : "#cbd5e1"),
            accHint: lk
              ? lk
              : p
              ? "اسم المستخدم: " + (t.nid || "") + (t.nid && t.phone ? " أو " : "") + (t.phone || "") + " · كلمة المرور: " + c
              : "لتفعيل الحساب يلزم رقم هوية أو جوال (اسم المستخدم) ورقم وظيفي (كلمة المرور).",
            accActivate: () => {
              if (lk) return void (this.setState({ accOpen: null }), this.impToast(lk));
              if (!p) return void this.bsToast("لتفعيل الحساب يلزم رقم هوية أو رقم جوال (اسم المستخدم) ورقم وظيفي (كلمة المرور).");
              const e = KIVO.BassamAuth;
              e &&
                e.activateStaff &&
                Promise.resolve(e.activateStaff({ ekey: a, nid: t.nid, phone: t.phone, empno: c, name: t.name })).then((e) => {
                  (this.setState({ accOpen: null }),
                    this.impToast(
                      e && e.ok
                        ? "فُعِّل حساب " + t.name + " · اسم المستخدم " + (t.nid || t.phone) + " وكلمة المرور الرقم الوظيفي"
                        : (e && e.err) || "تعذّر التفعيل",
                    ));
                });
            },
            accFreeze: () => {
              if ("active" !== r) return void this.setState({ accOpen: null });
              if (lk && h) return void (this.setState({ accOpen: null }), this.impToast(lk));
              const e = KIVO.BassamAuth;
              if (!e || !e.freezeStaff) return;
              const n = e.freezeStaff(a);
              (this.setState({ accOpen: null }),
                n && n.ok
                  ? this.impAck("جُمِّد حساب " + t.name + " — لن يستطيع الدخول حتى تُعيد تفعيله")
                  : this.impToast((n && n.err) || "تعذّر التجميد"));
            },
            /* دفعة الواجهات (2أ): حسابٌ مفتاحُه mgr: لا تُنزع عنه الشارة (الخادم: mgr-key) — يُحذف من صفحة الإدارات أو يبقى مديراً */
            accMgrShow: u && "active" === r && !(h && /^mgr:/.test(String(a || ""))),
            accMgrText: h ? "إلغاء تعيينه مديراً للإدارة" : "تعيينه مديراً للإدارة",
            accMgrStyle:
              "display:flex;align-items:center;gap:7px;padding:7px 9px;border-radius:8px;font-size:11px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif;transition:background .15s;color:" +
              (h ? "var(--fg-xb45309)" : "var(--fg-x9a7e40)"),
            accMgrToggle: () => {
              const e = KIVO.BassamAuth;
              if (!e || !e.setStaffMgr) return;
              const r = e.setStaffMgr(a, !h);
              (this.setState({ accOpen: null, permTick: (this.state.permTick || 0) + 1 }),
                r && r.ok
                  ? this.impAck(
                      h
                        ? "أُلغي تعيين " + t.name + " مديراً — لم يعد يدير الحسابات والصلاحيات، وبقيت صفحاتُه كما في ورقته"
                        : "عُيِّن " + t.name + " مديراً للإدارة — يدير حسابات موظفيها وصلاحياتهم ويمنحهم مما يملكه، وتبقى صفحاتُه كما في ورقته الحالية ما لم يوسّعها مسؤول المنصة",
                    )
                  : this.impToast((r && r.err) || "تعذّر التعيين"));
            },
          };
        })(),
        sel: !!e.selected[t.i],
        toggle: () => this.setState((e) => ({ selected: { ...e.selected, [t.i]: !e.selected[t.i] } })),
        typeBadge: t.type ? r[t.type] || r.group : r.noGroup,
        emailD: t.email || "—",
        typeD: t.type || "—",
        genderD: t.gender || "—",
        empnoDisp: t.empno || "—",
        tView: "عرض الملف",
        tEdit: "تعديل",
        tDel: "حذف",
        tSave: "حفظ",
        tCancel: "إلغاء",
        editing: e.inlineEdit === t.i,
        notEditing: e.inlineEdit !== t.i,
        fName: (e.inlineEdit === t.i && e.inlineForm.name) || "",
        fNid: (e.inlineEdit === t.i && e.inlineForm.nid) || "",
        fEmpno: (e.inlineEdit === t.i && e.inlineForm.empno) || "",
        fPhone: (e.inlineEdit === t.i && e.inlineForm.phone) || "",
        fEmail: (e.inlineEdit === t.i && e.inlineForm.email) || "",
        fType: (e.inlineEdit === t.i && e.inlineForm.type) || "",
        ...(() => {
          if (e.inlineEdit !== t.i) return {};
          const r = ((t) => {
            const r = e.iddOpen === t,
              n = e.inlineForm[t],
              a = e.options[t] || [];
            return {
              toggle: () => this.setState((e) => ({ iddOpen: e.iddOpen === t ? null : t, iddNew: "" })),
              open: r,
              value: n || "اختر…",
              chev: "transition:transform .2s;flex-shrink:0;opacity:.5;" + (r ? "transform:rotate(180deg)" : ""),
              btnStyle:
                "width:100%;height:30px;border:1px solid var(--bd-xb99751);border-radius:6px;padding:0 8px;font-size:12px;font-family:'Cairo',sans-serif;background:var(--bg-xffffff);cursor:pointer;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:6px;color:var(--fg-x141414);text-align:right" +
                (r ? ";box-shadow:0 0 0 2px rgba(185,151,81,0.15)" : ""),
              add: () => this.iddAdd(t),
              opts: a.map((r) => {
                const i = !(!e.ddEdit || e.ddEdit.key !== t || e.ddEdit.name !== r || "inline" !== e.ddEdit.which);
                return {
                  name: r,
                  selected: r === n,
                  canDel: a.length > 1,
                  style:
                    "display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;font-size:12px;cursor:pointer;transition:background .15s;" +
                    (r === n ? "background:var(--bg-a185151810p08);color:var(--fg-x9a7e40);font-weight:400" : "color:var(--fg-x141414)"),
                  pick: () => {
                    i || this.setState((e) => ({ inlineForm: { ...e.inlineForm, [t]: r }, iddOpen: null }));
                  },
                  del: (e) => {
                    (e.stopPropagation(), this.ddDel(t, r, "inline"));
                  },
                  editing: i,
                  notEdit: !i,
                  editVal: i ? (null == e.ddEditVal ? r : e.ddEditVal) : "",
                  edit: (e) => {
                    (e.stopPropagation(), this.ddEditStart(t, r, "inline"));
                  },
                  editOn: (t) => this.setState({ ddEditVal: t.target.value }),
                  editKd: (t) => {
                    "Enter" === t.key ? (t.preventDefault(), this.ddEditSave()) : "Escape" === t.key && this.ddEditCancel();
                  },
                  editSave: (t) => {
                    (t.stopPropagation(), this.ddEditSave());
                  },
                  editCancel: (t) => {
                    (t.stopPropagation(), this.ddEditCancel());
                  },
                  stop: (t) => t.stopPropagation(),
                };
              }),
            };
          })("type");
          return {
            iTypeToggle: r.toggle,
            iTypeOpen: r.open,
            iTypeValue: r.value,
            iTypeChev: r.chev,
            iTypeBtnStyle: r.btnStyle,
            iTypeOpts: r.opts,
            iTypeAdd: r.add,
            iTypeHas: !!e.inlineForm.type,
            iTypeNo: !e.inlineForm.type,
            iTypeTxtStyle: KIVO.BassamPick.txt(!0, r.open),
            iTypePlusStyle: KIVO.BassamPick.plus(!0, r.open),
            iGenderToggle: () => this.setState((t) => ({ iddOpen: "gender" === t.iddOpen ? null : "gender", iddNew: "" })),
            iGenderOpen: "gender" === e.iddOpen,
            iGenderValue: e.inlineForm.gender || "اختر…",
            iGenderHas: !!e.inlineForm.gender,
            iGenderNo: !e.inlineForm.gender,
            iGenderTxtStyle: KIVO.BassamPick.txt(!0, "gender" === e.iddOpen),
            iGenderPlusStyle: KIVO.BassamPick.plus(!0, "gender" === e.iddOpen),
            iGenderChev: "transition:transform .2s;flex-shrink:0;opacity:.5;" + ("gender" === e.iddOpen ? "transform:rotate(180deg)" : ""),
            iGenderBtnStyle:
              "width:100%;height:30px;border:1px solid var(--bd-xb99751);border-radius:6px;padding:0 8px;font-size:12px;font-family:'Cairo',sans-serif;background:var(--bg-xffffff);cursor:pointer;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:6px;color:var(--fg-x141414);text-align:right" +
              ("gender" === e.iddOpen ? ";box-shadow:0 0 0 2px rgba(185,151,81,0.15)" : ""),
            iGenderOpts: ["ذكر", "أنثى"].map((t) => ({
              name: t,
              selected: t === e.inlineForm.gender,
              style:
                "display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;font-size:12px;cursor:pointer;transition:background .15s;" +
                (t === e.inlineForm.gender
                  ? "background:var(--bg-a185151810p08);color:var(--fg-x9a7e40);font-weight:400"
                  : "color:var(--fg-x141414)"),
              pick: () => this.setState((e) => ({ inlineForm: { ...e.inlineForm, gender: t }, iddOpen: null })),
            })),
            iNew: e.iddNew,
            onINew: (t) => this.setState({ iddNew: t.target.value }),
            onINewKey: (t) => {
              "Enter" === t.key && (t.preventDefault(), this.iddAdd(this.state.iddOpen));
            },
          };
        })(),
        onIName: (t) => this.setState((e) => ({ inlineForm: { ...e.inlineForm, name: t.target.value } })),
        onIEmpno: (t) =>
          this.setState((e) => ({ inlineForm: { ...e.inlineForm, empno: t.target.value.replace(/[^0-9]/g, "").slice(0, 6) } })),
        onINid: (t) => this.setState((e) => ({ inlineForm: { ...e.inlineForm, nid: t.target.value.replace(/[^0-9]/g, "") } })),
        onIPhone: (t) => this.setState((e) => ({ inlineForm: { ...e.inlineForm, phone: t.target.value.replace(/[^0-9]/g, "") } })),
        onIEmail: (t) => this.setState((e) => ({ inlineForm: { ...e.inlineForm, email: t.target.value.trim() } })),
        edit: () =>
          this.setState({
            viewIdx: null,
            addOpen: !0,
            editIdx: t.i,
            rowMenu: null,
            formErr: {},
            form: {
              name: t.name,
              empno: t.empno || "",
              nid: t.nid || "",
              phone: t.phone || "",
              email: t.email || "",
              type: t.type,
              work: t.work,
              gender: t.gender || "",
              shift: t.shift,
            },
          }),
        saveInline: async () => {
          if (!this.PC("edit")) return void this.permDeny();
          const e = this.state.inlineForm;
          if (!e.name || !e.name.trim()) return void this.bsToast("اسم الموظف حقل إلزامي");
          if (e.phone && 10 !== e.phone.length) return void this.bsToast("رقم الجوال إمّا فارغ أو مكوّن من 10 أرقام");
          if (e.nid && 10 !== e.nid.length) return void this.bsToast("رقم الهوية إمّا فارغ أو مكوّن من 10 أرقام");
          if (e.empno && (String(e.empno).length < 5 || String(e.empno).length > 6))
            return void this.bsToast("الرقم الوظيفي مكوّن من 5 أو 6 أرقام — صحّحه ثم احفظ");
          if (e.email && !this.emailOk(e.email)) return void this.bsToast("صيغة البريد غير صحيحة — مثال: name@example.gov.sa");
          const r = this.dupCheck(this.state.employees, t.i, e.nid, e.empno, e.phone, e.email);
          if (r) return void this.bsToast(r);
          const n = this.state.employees.map((r, n) =>
            n === t.i
              ? {
                  ...r,
                  name: e.name.trim(),
                  nid: e.nid || "",
                  empno: e.empno,
                  phone: e.phone,
                  email: e.email || "",
                  type: e.type,
                  work: e.work,
                  gender: e.gender || "",
                }
              : r,
          );
          if (await this.setEmp(n, { index: t.i, form: e })) this.setState({ inlineEdit: null, inlineForm: {}, iddOpen: null, iddNew: "" });
        },
        cancelInline: () => this.setState({ inlineEdit: null, inlineForm: {}, iddOpen: null, iddNew: "" }),
        remove: () => this._empDeleteOpen([t.i], false),
        view: () => this.setState({ viewIdx: t.i }),
        ...this._rowMenu("e" + t.i, [
          {
            name: "عرض الملف",
            color: "#0e7490",
            p1: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z",
            p2: "M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
            run: () => this.setState({ viewIdx: t.i }),
          },
          this.PC("edit")
            ? {
                name: "تعديل",
                color: "#b99751",
                p1: "M12 20h9",
                p2: "M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z",
                run: () =>
                  this.setState({
                    viewIdx: null,
                    addOpen: !0,
                    editIdx: t.i,
                    rowMenu: null,
                    formErr: {},
                    form: {
                      name: t.name,
                      empno: t.empno || "",
                      nid: t.nid || "",
                      phone: t.phone || "",
                      email: t.email || "",
                      type: t.type,
                      work: t.work,
                      gender: t.gender || "",
                      shift: t.shift,
                    },
                  }),
              }
            : null,
          this.PC("del")
            ? {
                name: "حذف",
                color: "#dc2626",
                danger: !0,
                p1: "M3 6h18",
                p2: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
                run: () => this._empDeleteOpen([t.i], false),
              }
            : null,
        ]),
      })),
      p = Object.values(e.selected).filter(Boolean).length,
      m = ((t) => {
        const r = e.ddOpen === t,
          n = e.form[t],
          a = e.options[t];
        return {
          toggle: () => this.setState((e) => ({ ddOpen: e.ddOpen === t ? null : t, ddNew: "" })),
          open: r,
          value: n || "اختر…",
          chev: "transition:transform .2s;flex-shrink:0;opacity:.5;" + (r ? "transform:rotate(180deg)" : ""),
          btnStyle:
            "width:100%;height:38px;border:1px solid " +
            (r ? "var(--bd-xb99751)" : "var(--bd-xe1e1e1)") +
            ";border-radius:8px;padding:0 12px;font-size:12px;font-family:'Cairo',sans-serif;background:var(--bg-xffffff);cursor:pointer;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--fg-x141414);text-align:right" +
            (r ? ";box-shadow:0 0 0 2px rgba(185,151,81,0.15)" : ""),
          add: () => this.ddAdd(t),
          opts: a.map((r) => {
            const i = !(!e.ddEdit || e.ddEdit.key !== t || e.ddEdit.name !== r || "form" !== e.ddEdit.which);
            return {
              name: r,
              selected: r === n,
              canDel: a.length > 1,
              style:
                "display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;font-size:12px;cursor:pointer;transition:background .15s;" +
                (r === n ? "background:var(--bg-a185151810p08);color:var(--fg-x9a7e40);font-weight:400" : "color:var(--fg-x141414)"),
              pick: () => {
                i || this.setState((e) => ({ form: { ...e.form, [t]: r }, ddOpen: null }));
              },
              del: (e) => {
                (e.stopPropagation(), this.ddDel(t, r, "form"));
              },
              editing: i,
              notEdit: !i,
              editVal: i ? (null == e.ddEditVal ? r : e.ddEditVal) : "",
              edit: (e) => {
                (e.stopPropagation(), this.ddEditStart(t, r, "form"));
              },
              editOn: (t) => this.setState({ ddEditVal: t.target.value }),
              editKd: (t) => {
                "Enter" === t.key ? (t.preventDefault(), this.ddEditSave()) : "Escape" === t.key && this.ddEditCancel();
              },
              editSave: (t) => {
                (t.stopPropagation(), this.ddEditSave());
              },
              editCancel: (t) => {
                (t.stopPropagation(), this.ddEditCancel());
              },
              stop: (t) => t.stopPropagation(),
            };
          }),
        };
      })("type"),
      h = {
        toggle: () => this.setState((t) => ({ ddOpen: "gender" === t.ddOpen ? null : "gender", ddNew: "" })),
        open: "gender" === e.ddOpen,
        value: e.form.gender || "اختر…",
        chev: "transition:transform .2s;flex-shrink:0;opacity:.5;" + ("gender" === e.ddOpen ? "transform:rotate(180deg)" : ""),
        btnStyle:
          "width:100%;height:38px;border:1px solid " +
          ("gender" === e.ddOpen ? "#b99751" : "#E1E1E1") +
          ";border-radius:8px;padding:0 12px;font-size:12px;font-family:'Cairo',sans-serif;background:var(--bg-xffffff);cursor:pointer;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--fg-x141414);text-align:right" +
          ("gender" === e.ddOpen ? ";box-shadow:0 0 0 2px rgba(185,151,81,0.15)" : ""),
        opts: ["ذكر", "أنثى"].map((t) => ({
          name: t,
          selected: t === e.form.gender,
          style:
            "display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;font-size:12px;cursor:pointer;transition:background .15s;" +
            (t === e.form.gender
              ? "background:var(--bg-a185151810p08);color:var(--fg-x9a7e40);font-weight:400"
              : "color:var(--fg-x141414)"),
          pick: () => this.setState((e) => ({ form: { ...e.form, gender: t }, ddOpen: null })),
        })),
      },
      u = e.employees || [],
      g = u.length,
      f = (t) => (g ? KIVO.bsPct((t / g) * 100) : "0"),
      b = (t) =>
        "ok" === t
          ? "background:var(--bg-a0163870p07);border:1px solid var(--bd-a0163870p2);color:var(--fg-x047857)"
          : "warn" === t
            ? "background:var(--bg-a245158110p08);border:1px solid var(--bd-a245158110p25);color:var(--fg-xb45309)"
            : "bad" === t
              ? "background:var(--bg-a23968680p07);border:1px solid var(--bd-a23968680p22);color:var(--fg-xb91c1c)"
              : "background:var(--bg-a2452452450p8);border:1px solid var(--bd-a2032132250p5);color:var(--fg-x53565a)",
      A = ["#2f8f86", "#9c3d6b", "#b99751", "#1e9a66", "#a5566e", "#b45309"],
      x = (t) => {
        const e = [];
        return (
          String(t.nid || "").trim() || e.push("الهوية"),
          String(t.phone || "").trim() || e.push("الجوال"),
          String(t.email || "").trim() || e.push("البريد"),
          String(t.empno || "").trim() || e.push("الرقم الوظيفي"),
          e
        );
      },
      y = u.filter((t) => x(t).length),
      v = g - y.length,
      w = f(v),
      S = {};
    y.forEach((t) =>
      x(t).forEach((t) => {
        S[t] = (S[t] || 0) + 1;
      }),
    );
    const k = Object.keys(S).sort((t, e) => S[e] - S[t])[0],
      M = 157.08,
      E = g
        ? 0 === y.length
          ? "كل السجلات مكتملة — الهوية والجوال والبريد والرقم الوظيفي والوظيفة."
          : KIVO.BassamCount(y.length, "سجل|ناقص") + " · الأكثر غياباً: " + k + " (" + S[k] + ")"
        : "لا بيانات بعد.",
      z = g ? (0 === y.length ? "ok" : w >= 80 ? "warn" : "bad") : "",
      O = [],
      C = {};
    u.forEach((t) => {
      const e = (t.type || "").trim() || "غير محدد";
      (null == C[e] && ((C[e] = 0), O.push(e)), C[e]++);
    });
    const F = O.map((t, e) => ({ name: t, count: C[t] })).sort((t, e) => e.count - t.count),
      P = F.length ? F[0].count : 0,
      T = F.slice(0, 6).map((t, e) => ({
        name: t.name,
        count: t.count,
        pct: f(t.count),
        hpct: P ? Math.max(6, Math.round((t.count / P) * 100)) : 0,
        barColor: "غير محدد" === t.name ? "#cbd5e1" : A[e % A.length],
        numColor: "غير محدد" === t.name ? "#94a3b8" : "#53565a",
        tip: t.name + ": " + KIVO.BassamCount(t.count, "موظف") + " (" + f(t.count) + "%)",
      })),
      I = g
        ? 1 === F.length
          ? "كل الموظفين من نوع واحد: " + F[0].name + "."
          : "الأكثر: " + F[0].name + " (" + f(F[0].count) + "%) · الأنواع المسجّلة: " + F.length + "."
        : "لا بيانات بعد.",
      j = g ? (C["غير محدد"] ? "warn" : "ok") : "",
      N = u.filter((t) => "active" === s(t)).length,
      Y = u.filter((t) => "frozen" === s(t)).length,
      G = g - N - Y,
      B = f(N),
      L = g
        ? Y
          ? KIVO.BassamCount(Y, "حساب|مجمّد") +
            " — " +
            KIVO.BassamCount.agr(
              Y,
              "صاحبه ممنوع من الدخول حتى يُفعَّل.",
              "صاحباهما ممنوعان من الدخول حتى يُفعَّلا.",
              "أصحابها ممنوعون من الدخول حتى تُفعَّل.",
            )
          : N === g
            ? "كل الموظفين لهم حسابات نشطة."
            : 0 === N
              ? "لا يوجد حساب دخول لأي موظف بعد."
              : KIVO.BassamCount(G, "موظف") +
                " بلا حساب — " +
                KIVO.BassamCount.agr(
                  G,
                  "افتح له حساباً إن كان يحتاج الدخول.",
                  "افتح لهما حسابين إن كانا يحتاجان الدخول.",
                  "افتح لهم حسابات إن كانوا يحتاجون الدخول.",
                )
        : "لا بيانات بعد.",
      W = g ? (Y ? "warn" : N === g ? "ok" : "") : "",
      D = u.filter((t) => "ذكر" === (t.gender || "").trim()).length,
      Z = u.filter((t) => "أنثى" === (t.gender || "").trim()).length,
      R = g - D - Z,
      X = f(Z),
      U = f(D),
      H = g
        ? R
          ? KIVO.BassamCount(R, "موظف") + " بلا تحديد للجنس — حدّده ليكتمل المؤشر."
          : 0 === Z
            ? "لا توجد موظفات مسجّلات في الإدارة."
            : 0 === D
              ? "كل الموظفات إناث — لا يوجد ذكور مسجّلون."
              : "ذكور " + D + " (" + U + "%) · إناث " + Z + " (" + X + "%)."
        : "لا بيانات بعد.",
      V = g ? (R || 0 === Z || 0 === D ? "warn" : "ok") : "";
    let q = 0;
    const Q = [
        [D, "#2f5f8a", "ذكور"],
        [Z, "#a5566e", "إناث"],
        [R, "#cbd5e1", "غير محدد"],
      ]
        .filter((t) => t[0] > 0)
        .map((t) => {
          const e = (M * t[0]) / (g || 1),
            r = -q;
          return (
            (q += e),
            {
              color: t[1],
              dash: Math.round(100 * Math.max(0, e - 1)) / 100 + " " + M,
              off: String(Math.round(100 * r) / 100),
              tip: t[2] + ": " + t[0] + " (" + f(t[0]) + "%)",
            }
          );
        }),
      K = (t) => {
        let e = 0;
        const r = t.reduce((t, e) => t + e[0], 0) || 1;
        return t
          .filter((t) => t[0] > 0)
          .map((t) => {
            const n = (M * t[0]) / r,
              a = -e;
            return (
              (e += n),
              {
                color: t[1],
                dash: Math.round(100 * Math.max(0, n - 1)) / 100 + " " + M,
                off: String(Math.round(100 * a) / 100),
                tip: t[2] + ": " + t[0] + " (" + Math.round((100 * t[0]) / r) + "%)",
              }
            );
          });
      },
      J = K([
        [v, "#008450", "سجلات مكتملة"],
        [y.length, "#cbd5e1", "سجلات ناقصة"],
      ]),
      _ = K([
        [N, "#008450", "حسابات نشطة"],
        [Y, "#e5b563", "حسابات مجمّدة"],
        [G, "#cbd5e1", "بلا حساب"],
      ]),
      $ = K(T.map((t) => [t.count, t.barColor, t.name])),
      tt = 2 * Math.PI * 44;
    let et = 0;
    const rt = T.filter((t) => t.count > 0),
      nt = rt.map((t) => {
        const e = g ? t.count / g : 0,
          r = Math.max(e * tt - (rt.length > 1 ? 2.5 : 0), 1.5),
          n = { color: t.barColor, dash: r.toFixed(1) + " " + (tt - r).toFixed(1), rot: String((360 * et - 90).toFixed(1)), tip: t.tip };
        return ((et += e), n);
      }),
      at = Math.max(...T.map((t) => t.count), 0),
      it = T.length ? Math.min(...T.map((t) => t.count)) : 0,
      ot = T.filter((t) => t.count === at && at > 0).map((t) => t.name),
      st = T.filter((t) => t.count === it).map((t) => t.name),
      lt = T.map((t) => ({
        name: t.name,
        color: t.barColor,
        count: String(t.count),
        pct: String(t.pct),
        isTop: 1 === ot.length && t.name === ot[0],
        isLow: 1 === st.length && t.name === st[0] && at !== it,
      })),
      dt = 2 * Math.PI * 41,
      ct = function (t) {
        var e = 0,
          r = [],
          n = 0;
        if (
          (t.forEach(function (t) {
            n += t.n;
          }),
          !n)
        )
          return [];
        var a = t.filter(function (t) {
            return t.n > 0;
          }),
          i = a.length > 1;
        return (
          a.forEach(function (t) {
            var a = (dt * t.n) / n,
              o = i ? Math.min(3, 0.12 * a) : 0;
            (r.push({
              color: t.color,
              dash: Math.round(10 * Math.max(0.5, a - o)) / 10 + " " + Math.round(10 * dt) / 10,
              off: String(-Math.round(10 * e) / 10),
              tip: t.tip,
            }),
              (e += a));
          }),
          r
        );
      },
      pt = function (t) {
        return g ? Math.round((100 * t) / g) + "٪" : "—";
      },
      mt = function (t) {
        return t.map(function (t) {
          return { label: t.label, color: t.color, n: String(t.n), pct: pt(t.n), tip: t.tip || "" };
        });
      },
      ht = function (t) {
        return t.reduce(function (t, e) {
          return e.n > (t ? t.n : -1) ? e : t;
        }, null);
      },
      ut = T.map(function (t) {
        return "غير محدد" === t.name
          ? {
              label: "بدون نوع توظيف",
              color: "#b45309",
              n: t.count,
              tip: "موظفون لم يُحدَّد لهم نوع توظيف — تُستكمل من نافذة الموظف، وتختفي هذه الشريحة باكتمالها",
            }
          : { label: t.name, color: t.barColor, n: t.count, tip: t.tip || t.name + ": " + t.count + " من " + g };
      }),
      gt = Math.max(
        0,
        g -
          ut.reduce(function (t, e) {
            return t + e.n;
          }, 0),
      );
    gt > 0 &&
      ut.push({
        label: "بدون نوع توظيف",
        color: "#b45309",
        n: gt,
        tip: "موظفون لم يُحدَّد لهم نوع توظيف — تُستكمل من نافذة الموظف، وتختفي هذه الشريحة باكتمالها",
      });
    const ft = [
        { label: "مكتملة", color: "#047857", n: v, tip: "سجلات مكتملة: " + v + " من " + g },
        { label: "ناقصة", color: "#b45309", n: y.length, tip: "سجلات ينقصها حقل مطلوب أو أكثر: " + y.length + " من " + g },
      ],
      bt = {
        الهوية: "بلا رقم هوية",
        الجوال: "بلا رقم جوال",
        البريد: "بلا بريد إلكتروني",
        "الرقم الوظيفي": "بلا رقم وظيفي",
        الوظيفة: "بلا مسمى وظيفي",
      },
      At = [
        {
          label: "سجلات مكتملة",
          color: "#047857",
          n: v,
          tip: "اكتملت فيها الحقول المطلوبة الأربعة: رقم الهوية، رقم الجوال، البريد الإلكتروني، الرقم الوظيفي",
        },
      ].concat(
        Object.keys(S)
          .sort(function (t, e) {
            return S[e] - S[t];
          })
          .map(function (t) {
            return {
              label: bt[t] || "بلا " + t,
              color: "#b45309",
              n: S[t],
              tip:
                "موظفون بلا " +
                t +
                " — يُستكمل من نافذة الموظف ويختفي هذا البند باكتماله. وقد يجتمع أكثر من نقصٍ للموظف الواحد فيُعدّ في كل بندٍ ينقصه.",
            };
          }),
      ),
      xt = [
        { label: "نشط", color: "#047857", n: N, tip: "حساب دخول مفعَّل يستطيع صاحبه الدخول الآن" },
        { label: "مجمّد", color: "#b45309", n: Y, tip: "حساب مجمّد مؤقتاً — لا دخول حتى يُفعَّل" },
      ].concat(
        G > 0
          ? [
              {
                label: "بلا حساب",
                color: "#94a3b8",
                n: G,
                tip: "لا حساب دخول لهذا الموظف — يُنشأ من عمود حساب الدخول، ويختفي هذا البند حين تكون لكل الموظفين حسابات",
              },
            ]
          : [],
      ),
      yt = [
        { label: "ذكور", color: "#2a76aa", n: D, tip: "الذكور من إجمالي الموظفين" },
        { label: "إناث", color: "#a5566e", n: Z, tip: "الإناث من إجمالي الموظفين" },
      ].concat(
        R > 0
          ? [
              {
                label: "بدون جنس",
                color: "#b45309",
                n: R,
                tip: "موظفون لم يُحدَّد لهم جنس — تُستكمل من نافذة الموظف، وتختفي هذه الشريحة باكتمالها",
              },
            ]
          : [],
      ),
      vt = ht(ut),
      wt = ht(yt);
    return {
      ekTRing: ct(ut),
      ekTRows: mt(ut),
      ekTVal: String(vt ? vt.n : 0),
      ekTPct: pt(vt ? vt.n : 0),
      ekTSub: "من " + KIVO.BassamCount(g, "موظف", "g") + "",
      ekDRing: ct(ft),
      ekDRows: mt(At),
      ekDVal: String(v),
      ekDPct: pt(v),
      ekDSub: "من " + KIVO.BassamCount(g, "سجل", "g") + "",
      ekARing: ct(xt),
      ekARows: mt(xt),
      ekAVal: String(N),
      ekAPct: pt(N),
      ekASub: "من " + KIVO.BassamCount(g, "موظف", "g") + "",
      ekGRing: ct(yt),
      ekGRows: mt(yt),
      ekGVal: String(wt ? wt.n : 0),
      ekGPct: pt(wt ? wt.n : 0),
      ekGSub: "من " + KIVO.BassamCount(g, "موظف", "g") + "",
      dataSegs: J,
      accSegs: _,
      typeArcSegs: $,
      typeDonutSegs: nt,
      typeIns: lt,
      maleN: String(D),
      femaleN: String(Z),
      genNaN: String(R),
      genNaOn: R > 0,
      malePct: String(U),
      femalePct: String(X),
      genNaPct: String(f(R)),
      genSegs: Q,
      genInsight: H,
      genInsightStyle: b(V),
      kTotal: String(g),
      completePct: String(w),
      completeN: String(v),
      incompleteN: String(y.length),
      incompletePct: String(f(y.length)),
      dataInsight: E,
      dataInsightStyle: b(z),
      typeCols: T,
      typeInsight: I,
      typeInsightStyle: b(j),
      accActiveN: String(N),
      accWaitN: String(Y),
      accNoneN: String(G),
      accPct: String(B),
      accFrozenPct: String(f(Y)),
      accNonePct: String(f(G)),
      accInsight: L,
      accInsightStyle: b(W),
      ...(() => {
        const t = !(!this.props || "readiness" !== this.props.solo),
          r = (t) => {
            try {
              const P = KIVO.BassamPerm;
              return !P || !P.subOn || !!P.subOn("emps", @@SYS:emp.tabs.custodyLeaf@@t);
            } catch (t) {
              return !0;
            }
          },
          n = ["data"@@SYS:emp.tabs.custody@@].filter(r);
        let a = "data" === e.empTab@@SYS:emp.tab.custodyValid@@ ? e.empTab : "data";
        (n.length && -1 === n.indexOf(a) && (a = n[0]), t && (a = "readiness"));
        const i = (t) =>
            "position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 16px;border-radius:12px;transition:all .3s;flex-shrink:0;min-width:150px;cursor:pointer;font-family:'Cairo',sans-serif;" +
            (t
              ? "background:var(--bg-xffffff);box-shadow:0 3px 10px -4px rgba(138,111,53,0.45);border:2px solid var(--bd-a185151810p45)"
              : "background:transparent;border:2px solid transparent"),
          o = (t) =>
            "width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;transition:all .3s;" +
            (t
              ? "background:var(--bg-a185151810p1);color:var(--fg-xb99751)"
              : "background:var(--bg-a2452452450p9);color:var(--fg-x94a3b8)"),
          s = (t) =>
            "font-size:12px;transition:color .3s;" +
            (t ? "font-weight:600;color:var(--fg-xb99751)" : "font-weight:400;color:var(--fg-x53565a)");
        return {
          empOnReadiness: "readiness" === a,
          empDataTabStyle: i("data" === a),
          empDataTabIcon: o("data" === a),
          empDataTabLbl: s("data" === a),
          empOnData: "data" === a,
          empDataAllowed: r("data"),
@@SYS:emp.vals.custodyAllowed@@          empTabBarShow: !t && n.length > 1,
@@SYS:emp.vals.custodyTab@@          empGoData: () => this.setState({ empTab: "data" }),
@@SYS:emp.vals.custodyGo@@        };
      })(),
@@SYS:emp.vals.custody|empty="      empNoneTitle: this._emNoneTitle(),\n"@@      ...(() => {
        const t = this._pulseVals(e.pulseNow),
          r = this._rdVals(e.pulseNow);
        return {
          ...t,
          ...r,
          rdRecsTotal: String((t.execAlerts || []).length + (r.rdRecs || []).length),
          rdRecsOpen: !!e.rdRecsOpen,
          rdRecsChev: "transition:transform .3s;transform:rotate(" + (e.rdRecsOpen ? 180 : 0) + "deg)",
          rdRecsToggle: () => this.setState({ rdRecsOpen: !this.state.rdRecsOpen }),
        };
      })(),
      hasEmployees: e.employees.length > 0,
      noEmployees: 0 === e.employees.length,
      addOpen: e.addOpen,
      openAdd: () => this.setState({ addOpen: !0, editIdx: null, form: this.blankForm(), formErr: {} }),
      closeAdd: () => this.setState({ addOpen: !1, ddOpen: null, ddNew: "", formErr: {} }),
      stopClick: (t) => t.stopPropagation(),
      dlgTitle: null === e.editIdx ? "إضافة موظف جديد" : "تعديل بيانات الموظف",
      dlgAction: null === e.editIdx ? "إضافة الموظف" : "حفظ التعديلات",
      fErrName: (e.formErr || {}).name || "",
      fErrEmpno: (e.formErr || {}).empno || "",
      fErrNid: (e.formErr || {}).nid || "",
      fErrPhone: (e.formErr || {}).phone || "",
      fErrEmail: (e.formErr || {}).email || "",
      fName: e.form.name,
      onFName: (t) =>
        this.setState({ form: { ...this.state.form, name: t.target.value }, formErr: { ...(this.state.formErr || {}), name: "" } }),
      fEmpno: e.form.empno || "",
      onFEmpno: (t) => {
        const e = t.target.value.replace(/[^0-9]/g, "").slice(0, 6),
          r =
            e.length >= 5 ? this.dupCheck(this.state.employees, null === this.state.editIdx ? -1 : this.state.editIdx, "", e, "", "") : "";
        this.setState({ form: { ...this.state.form, empno: e }, formErr: { ...(this.state.formErr || {}), empno: r || "" } });
      },
      fNid: e.form.nid,
      onFNid: (t) => {
        const e = t.target.value.replace(/[^0-9]/g, ""),
          r =
            10 === e.length
              ? this.dupCheck(this.state.employees, null === this.state.editIdx ? -1 : this.state.editIdx, e, "", "", "")
              : "";
        this.setState({ form: { ...this.state.form, nid: e }, formErr: { ...(this.state.formErr || {}), nid: r || "" } });
      },
      fPhone: e.form.phone,
      onFPhone: (t) => {
        const e = t.target.value.replace(/[^0-9]/g, ""),
          r =
            10 === e.length
              ? this.dupCheck(this.state.employees, null === this.state.editIdx ? -1 : this.state.editIdx, "", "", e, "")
              : "";
        this.setState({ form: { ...this.state.form, phone: e }, formErr: { ...(this.state.formErr || {}), phone: r || "" } });
      },
      fEmail: e.form.email || "",
      onFEmail: (t) =>
        this.setState({
          form: { ...this.state.form, email: t.target.value.trim() },
          formErr: { ...(this.state.formErr || {}), email: "" },
        }),
      genderToggle: h.toggle,
      genderOpen: h.open,
      genderValue: h.value,
      genderChev: h.chev,
      genderBtnStyle: h.btnStyle,
      genderOpts: h.opts,
      typeToggle: m.toggle,
      typeOpen: m.open,
      typeValue: m.value,
      typeChev: m.chev,
      typeBtnStyle: m.btnStyle,
      typeOpts: m.opts,
      typeAdd: m.add,
      ddNew: e.ddNew,
      onDdNew: (t) => this.setState({ ddNew: t.target.value }),
      onDdKey: (t) => {
        "Enter" === t.key && (t.preventDefault(), this.ddAdd(this.state.ddOpen));
      },
      saveEmp: async () => {
        if (!(null === this.state.editIdx ? this.PC("add") : this.PC("edit"))) return void this.permDeny();
        const t = this.state.form,
          e = (t, e) => {
            (this.setState({ formErr: { ...(this.state.formErr || {}), [t]: e } }), this.bsToast(e));
          };
        if (!t.name.trim()) return void e("name", "اسم الموظف حقل إلزامي — اكتب الاسم أولاً");
        if (t.nid && 10 !== t.nid.length) return void e("nid", "رقم الهوية ناقص: " + t.nid.length + " من 10 أرقام — أكمله أو اتركه فارغاً");
        if (t.phone && 10 !== t.phone.length)
          return void e("phone", "رقم الجوال ناقص: " + t.phone.length + " من 10 أرقام — أكمله أو اتركه فارغاً");
        if (t.email && !this.emailOk(t.email)) return void e("email", "صيغة البريد غير صحيحة — مثال: name@example.gov.sa");
        if (t.empno && (String(t.empno).length < 5 || String(t.empno).length > 6))
          return void e("empno", "الرقم الوظيفي ناقص: " + String(t.empno).length + " من 5 أرقام على الأقل — أكمله أو اتركه فارغاً");
        const r = this.dupCheck(
          this.state.employees,
          null === this.state.editIdx ? -1 : this.state.editIdx,
          t.nid,
          t.empno,
          t.phone,
          t.email,
        );
        if (r)
          return void e(
            0 === r.indexOf("رقم الهوية") ? "nid" : 0 === r.indexOf("رقم الجوال") ? "phone" : 0 === r.indexOf("البريد") ? "email" : "empno",
            r,
          );
        const n = [...this.state.employees];
        (null === this.state.editIdx
          ? n.unshift({
              ...t,
              eid: "e" + Date.now().toString(36) + Math.floor(1e9 * Math.random()).toString(36),
              group: "بدون مجموعة",
              account: "بانتظار التفعيل",
              contact: "غير متوفر",
            })
          : (n[this.state.editIdx] = { ...n[this.state.editIdx], ...t }),
          await this.setEmp(n, { index: this.state.editIdx, form: t }) &&
          this.setState({ addOpen: !1 }));
      },
      bulkClear: () => this.setState({ selected: {} }),
      bulkAccOn: l,
      onBulkAcc: (t) => {
        const e = t.target.value;
        if (!e) return;
        t.target.value = "";
        const r = KIVO.BassamAuth;
        if (r)
          if ("act" === e) {
            if (!r.activateStaff) return;
            const t = this.state.employees.filter((t, e) => this.state.selected[e]);
            if (!t.length) return;
            let e = 0,
              n = 0,
              a = 0,
              i = 0,
              l = "",
              k = 0;
            const d = [],
              /* دفعة الواجهات (2أ): لغير مدير النظام — حسابُ مديرٍ أو حسابٌ بمفتاح مدير لا يُعاد تفعيله (الخادم يرفض الحفظ كلَّه) فيُتخطّى بسببه */
              sp = !(r.isSuper && r.isSuper());
            t.forEach((t) => {
              if ("active" === s(t)) return void n++;
              if (sp && "none" !== s(t) && mkS(o(t))) return void k++;
              const c = String(t.nid || "").trim() || String(t.phone || "").trim(),
                p = String(t.empno || "").trim();
              c && p
                ? d.push(() =>
                    Promise.resolve(r.activateStaff({ ekey: o(t), nid: t.nid, phone: t.phone, empno: p, name: t.name }))
                      .then((t) => {
                        t && t.ok ? e++ : (i++, t && t.err && (l = t.err));
                      })
                      .catch(() => {
                        i++;
                      }),
                  )
                : a++;
            });
            const c = (t) => (t >= d.length ? Promise.resolve() : d[t]().then(() => c(t + 1)));
            c(0).then(() => {
              (this.setState({ permTick: (this.state.permTick || 0) + 1 }),
                this.impToast(
                  "تفعيل الحسابات: فُعِّل " +
                    e +
                    (n ? " · نشطة أصلاً " + n : "") +
                    (a ? " · تُخطّي " + a + " (بلا هوية/جوال أو رقم وظيفي)" : "") +
                    (k ? " · تُخطّي " + k + " (حساب مدير أو بمفتاح مدير — إعادة تفعيله لمسؤول المنصة)" : "") +
                    (i ? " · تعذّر " + i + (l ? " — " + l : "") : "") +
                    " · اسم المستخدم الهوية أو الجوال وكلمة المرور الرقم الوظيفي",
                ));
            });
          } else if ("frz" === e) {
            if (!r.freezeStaff) return;
            let t = 0,
              e = 0,
              n = 0,
              k = 0;
            const sp = !(r.isSuper && r.isSuper());
            (this.state.employees.forEach((a, i) => {
              if (!this.state.selected[i]) return;
              if ("active" !== s(a)) return void e++;
              if (sp && r.staffIsMgr && r.staffIsMgr(o(a))) return void k++;
              const l = r.freezeStaff(o(a));
              l && l.ok ? t++ : n++;
            }),
              this.setState({ permTick: (this.state.permTick || 0) + 1 }),
              (t ? this.impAck.bind(this) : this.impToast.bind(this))(
                "تجميد الحسابات: جُمِّد " +
                  t +
                  (e ? " · بلا حساب نشط " + e : "") +
                  (n ? " · تعذّر " + n : "") +
                  (k ? " · تُخطّي " + k + " (حساب مدير الإدارة — يديره مسؤول المنصة)" : "") +
                  (t ? " — الممنوعون من الدخول تعود حساباتهم بإعادة التفعيل" : ""),
              ));
          }
      },
      ...this.impVals(),
      filesOpen: e.filesOpen,
      filesToggle: () => this.setState((t) => ({ filesOpen: !t.filesOpen, fddOpen: null })),
      filesChev: "opacity:.5;transition:transform .2s;" + (e.filesOpen ? "transform:rotate(180deg)" : ""),
      filesBtnStyle:
        "height:36px;display:flex;align-items:center;gap:6px;font-size:12px;border:0;border-radius:12px;padding:0 12px;cursor:pointer;font-family:'Cairo',sans-serif;" +
        (e.filesOpen ? "color:var(--fg-xb99751);background:var(--bg-a185151810p08)" : "color:var(--fg-x475569);background:transparent"),
      exportCsv: () => {
        if (!this.PC("export")) return void this.permDeny();
        const t = this.EMP_COLS.slice(),
          e = (() => {
            try {
              return KIVO.BassamAuth.staffMap() || {};
            } catch (t) {
              return {};
            }
          })(),
          r = { active: "نشط", frozen: "مجمّد" },
          n = c.map((t) => {
            const n = e[t.eid || t.nid || t.name || ""];
            return [t.name, t.gender || "", t.nid, t.empno || "", t.phone, t.email || "", t.type, r[n] || "بلا حساب"];
          }),
          a = new Date(),
          i = "employees-" + a.getFullYear() + "-" + (a.getMonth() + 1) + "-" + a.getDate() + ".xlsx",
          o = [t].concat(n);
        try {
          KIVO.BassamXLSX ? KIVO.BassamXLSX.download(o, i) : this.impToast("تعذّر إنشاء ملف Excel في هذا المتصفح");
        } catch (t) {
          this.impToast("تعذّر إنشاء ملف Excel");
        }
        this.setState({ filesOpen: !1 });
      },
      printTable: () => {
        (this.setState({ filesOpen: !1 }), setTimeout(() => window.print(), 150));
      },
      impToastOn: !!e.impToast,
      impToastMsg: e.impToast || "",
      deleteSelected: () => this._empDeleteOpen(Object.keys(this.state.selected || {}).filter(key => this.state.selected[key]).map(Number), true),
      delSelLabel: p >= this.state.employees.length ? "حذف الكل" : "حذف المحدد",
      search: e.search,
      onSearch: (t) => this.setState({ search: t.target.value, page: 1, selected: {} }),
      ...(() => {
        const t = (t, r, n, a, i) => {
          const o = e[n],
            s = e.fddOpen === t,
            l = ["all", ...(i || e.options[r] || [])],
            d = {};
          return (
            (d[t + "Open"] = s),
            (d[t + "Toggle"] = () => this.setState((e) => ({ fddOpen: e.fddOpen === t ? null : t }))),
            (d[t + "Label"] = "all" === o ? a : o),
            (d[t + "Chev"] = "transition:transform .2s;flex-shrink:0;opacity:.5;" + (s ? "transform:rotate(180deg)" : "")),
            (d[t + "BtnStyle"] =
              "height:32px;min-width:100px;font-size:11px;border-radius:8px;border:1px " +
              ("all" === o
                ? "dashed #cbd5e1;color:var(--fg-x475569)"
                : "solid rgba(185,151,81,0.5);color:var(--fg-x9a7e40);font-weight:400") +
              ";background:var(--bg-xffffff);padding:0 10px;cursor:pointer;font-family:'Cairo',sans-serif;display:inline-flex;align-items:center;justify-content:space-between;gap:6px" +
              (s ? ";box-shadow:0 0 0 2px rgba(185,151,81,0.15)" : "")),
            (d[t + "Opts"] = l.map((t) => ({
              name: "all" === t ? a : t,
              selected: o === t,
              pick: () => this.setState({ [n]: t, fddOpen: null, page: 1, selected: {} }),
              style:
                "display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;font-size:11px;cursor:pointer;transition:background .15s;" +
                (o === t ? "background:var(--bg-a185151810p08);color:var(--fg-x9a7e40);font-weight:400" : "color:var(--fg-x141414)"),
            }))),
            d
          );
        };
        return {
          ...t("ft", "type", "fType", "نوع التوظيف"),
          ...t("fg", "gender", "fGender", "الجنس", ["ذكر", "أنثى"]),
          ...t("fa", "acct", "fAcct", "حساب الدخول", ["نشط", "مجمّد", "بلا حساب"]),
        };
      })(),
      isListView: "list" === e.view,
      isGridView: "grid" === e.view,
      viewList: () => this.setState({ view: "list" }),
      viewGrid: () => this.setState({ view: "grid" }),
      confirmOpen: null !== e.confirmDel || e.confirmBulk,
      confirmPre: (e.confirmBulk, "هل أنت متأكد من حذف"),
      confirmName: this._empDeleteDraft ? this._empDeleteDraft.rows.map(row => row.name || this._empKey(row)).join("، ") : "",
      confirmScopeOn: !!(this._empDeleteDraft && this._empDeleteDraft.snapshot && this._empDeleteDraft.bulk && !this._empDeleteDraft.finalRows.length),
      confirmScope: "حذف الكل يمسح الجدول الشهري والتقارير والتسكينات@@SYS:emp.confirm.tasks@@ وحسابات الموظفين وصلاحياتهم@@SYS:emp.confirm.custodyMoves@@@@SYS:emp.confirm.award@@؛ يبقى حساب المالك@@SYS:emp.confirm.custodyCatalog@@.",
      confirmError: e.empDeleteError || "",
      confirmBusy: !!e.empDeleteBusy,
      confirmNeedsReview: !!e.empDeleteReview,
      confirmReady: !!(this._empDeleteDraft && this._empDeleteDraft.snapshot && !this._empDeleteDraft.needsReview && !e.empDeleteBusy),
      confirmReview: () => this._empDeleteReview(),
      confirmCancel: () => this._empDeleteCancel(),
      confirmDo: () => this._empDeleteCommit(),
      viewOpen: null !== e.viewIdx && !!e.employees[e.viewIdx],
      viewRows: null !== e.viewIdx ? c.filter((t) => t.i === e.viewIdx) : [],
      vName: null !== e.viewIdx && e.employees[e.viewIdx] ? e.employees[e.viewIdx].name : "",
      vInitial: null !== e.viewIdx && e.employees[e.viewIdx] ? e.employees[e.viewIdx].name.trim().charAt(0) : "",
      vEmpno: null !== e.viewIdx && e.employees[e.viewIdx] ? e.employees[e.viewIdx].empno || "—" : "",
      vNid: null !== e.viewIdx && e.employees[e.viewIdx] ? e.employees[e.viewIdx].nid : "",
      vPhone: null !== e.viewIdx && e.employees[e.viewIdx] ? e.employees[e.viewIdx].phone : "",
      vEmail: (null !== e.viewIdx && e.employees[e.viewIdx] && e.employees[e.viewIdx].email) || "—",
      vType: null !== e.viewIdx && e.employees[e.viewIdx] ? e.employees[e.viewIdx].type : "",
      vTypeBadge: null !== e.viewIdx && e.employees[e.viewIdx] ? r[e.employees[e.viewIdx].type] || r.group : "",
      viewClose: () => this.setState({ viewIdx: null }),
      viewEdit: () => {
        const t = this.state.viewIdx,
          e = this.state.employees[t];
        this.setState({
          viewIdx: null,
          addOpen: !0,
          editIdx: t,
          form: {
            name: e.name,
            empno: e.empno || "",
            nid: e.nid,
            phone: e.phone,
            email: e.email || "",
            type: e.type,
            work: e.work,
            gender: e.gender || "",
            shift: e.shift,
          },
        });
      },
      viewListStyle:
        "height:28px;width:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;border:0;cursor:pointer;transition:all .2s;" +
        ("list" === e.view
          ? "background:var(--bg-xb99751);color:var(--text-on-brand);box-shadow:var(--shadow-card)"
          : "background:transparent;color:var(--fg-x94a3b8)"),
      viewGridStyle:
        "height:28px;width:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;border:0;cursor:pointer;transition:all .2s;" +
        ("grid" === e.view
          ? "background:var(--bg-xb99751);color:var(--text-on-brand);box-shadow:var(--shadow-card)"
          : "background:transparent;color:var(--fg-x94a3b8)"),
      ...(() => {
        const t = c.length,
          r = 0 === e.perPage ? 0 : e.perPage || 10,
          n = 0 === r ? Math.max(1, t) : r,
          a = Math.max(1, Math.ceil(t / n)),
          i = Math.min(Math.max(1, e.page || 1), a),
          o = (i - 1) * n,
          s = c.slice(o, o + n).map((t, e) => ({ ...t, sn: String(o + e + 1) })),
          l = [];
        {
          const t = [],
            e = (e) => {
              t.includes(e) || t.push(e);
            };
          e(1);
          for (let t = i - 1; t <= i + 1; t++) t >= 1 && t <= a && e(t);
          (e(a), t.sort((t, e) => t - e));
          for (let e = 0; e < t.length; e++) {
            e > 0 && t[e] - t[e - 1] > 1 && l.push({ dots: !0, label: "…" });
            const r = t[e];
            l.push({
              dots: !1,
              label: String(r),
              cur: r === i,
              plain: r !== i,
              style:
                "height:28px;min-width:28px;padding:0 4px;border:0;border-right:1px solid var(--bd-xe1e1e1);font-size:11px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';" +
                (r === i ? "background:var(--bg-xb99751);color:var(--text-on-brand)" : "background:transparent;color:var(--fg-x475569)"),
              click: () => this.setState({ page: r }),
            });
          }
        }
        const d = (t) =>
          "height:28px;width:28px;border:0;border-right:1px solid var(--bd-xe1e1e1);background:transparent;display:flex;align-items:center;justify-content:center;" +
          (t ? "color:var(--fg-x475569);cursor:pointer" : "color:var(--fg-xcbd5e1);cursor:default");
        return {
          pmOn: !1,
          rows: s,
          ...KIVO.BassamCount.pair("shownCount", String(t), "موظف"),
          totalCount: String(e.employees.length),
          ...KIVO.BassamCount.pair("pgTotal", String(t), "سجل", "g"),
          pgRange: 0 === t ? "0" : o + 1 + "–" + Math.min(o + n, t),
          pgNums: l,
          perPage: String(r),
          onPerPage: (t) => {
            const e = +t.target.value;
            this.setState({ perPage: 0 === e ? 0 : e || 10, page: 1 });
          },
          pgFirst: () => this.setState({ page: 1 }),
          pgPrev: () => this.setState((t) => ({ page: Math.max(1, (t.page || 1) - 1) })),
          pgNext: () => this.setState((t) => ({ page: Math.min(a, (t.page || 1) + 1) })),
          pgLast: () => this.setState({ page: a }),
          pgFirstStyle: d(i > 1),
          pgPrevStyle: d(i > 1),
          pgNextStyle: d(i < a),
          pgLastStyle: d(i < a),
        };
      })(),
      hasSelection: p > 0,
      selCount: p,
      allSelected: c.length > 0 && c.every((t) => t.sel),
      toggleAll: () => {
        const t = c.length > 0 && c.every((t) => t.sel),
          e = {};
        (c.forEach((r) => {
          e[r.i] = !t;
        }),
          this.setState((t) => ({ selected: { ...t.selected, ...e } })));
      },
      sortByName: (
        (t) => () =>
          this.setState((e) => ({ sortField: t, sortDir: e.sortField === t && "asc" === e.sortDir ? "desc" : "asc" }))
      )("name"),
      arrName: "name" === e.sortField ? ("asc" === e.sortDir ? "↑" : "↓") : "⇅",
      arrNameColor: "name" === e.sortField ? "#b99751" : "rgba(83,86,90,0.4)",
      ...t,
    };
  }
}
