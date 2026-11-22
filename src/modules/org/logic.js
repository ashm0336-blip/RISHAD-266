/* V7 · د6 · شاشة «الإدارات والصلاحيات» (ب1 · ب2 · ب3 · ب10 · هيكلُ ب13) — صفحةٌ مستقلة تُحمَّل عند فتحها، وتُركَّب بالمكوّن نفسه في موضعين:
     «مركز إدارة رشاد ← الإدارة المؤسسية ← الإدارات والصلاحيات»  (#/sysadmin/org/<الوحدة>/<التبويب> — مدير المنصة)
     «الإعدادات ← الصلاحيات»                                     (#/admin/perm/<الوحدة>/<التبويب> — مدير الوحدة: شجرتُه وحدتُه وما تحتها، بلا أفعال هيكل)
   الصفحةُ المضيفة (الإعدادات) تمرّر host: { mode, deptDel, switchDept, exportAll, acctCtx, adRole, adUnit, adWhen, adFull, ready } وموضعَين من محتواها القائم
   (data-org-slot="admins" · "data") — فهذه الصفحةُ إطارٌ: الشجرة · رأسُ الوحدة · شريطُ التبويبات · «نظرة عامة» · نوافذُ أفعال الهيكل، وتركيبُ كل تبويب.

   ── مصدرٌ واحد للحالة ── الوحدةُ المختارة والتبويبُ من العنوان وحده (KIVO.BassamOrgRoute ← _ogRoute)؛ لا نسخةَ لهما في الحالة.
   ── نقطةُ التنقّل الواحدة ── go(unit, tab[, { force }]): كلُّ تغيير وحدةٍ أو تبويب يمرّ بها، وهي تسأل canLeave(next) أولاً.
        canLeave(next) ⇒ Promise<boolean> · dirty() ⇒ boolean (تزامني) — الافتراضي «لا شيء غير محفوظ»؛ حارسُ ب11 يعرّفهما (orgDirty · orgGuard).
        ومغادرةُ الصفحة (الإطار: القائمة · الرجوع · عنوانٌ مكتوب · تبويبٌ آخر في الإعدادات) تمرّ بـ KIVO.BassamOrgRoute.screen.canLeave({ leave: true }) نفسِها
        (الشاشةُ المركَّبة تسجّل واجهتَها في KIVO.BassamOrgRoute.screen: { go, canLeave, dirty, href, route }).
   ── نقاطُ التركيب ── دالةٌ واحدة لكل تبويب (ogTabOverview · ogTabSystems · ogTabAdmins · ogTabRoles · ogTabPeople · ogTabLog · ogTabData)
        يقابلها قسمٌ واحد في view.html (data-org-tab) — يُعدَّل كلُّ تبويبٍ على حدة. منطقُ الأقسام الأربعة القائم في logic-perm44.js (منقولٌ كما هو).
   ── التحديد المتعدد ── شريطُه وأزرارُه هنا؛ التطبيقُ خطّاف: orgBulkApply(mode, unitIds) والحدث window «bs:org-bulk» { mode: "on"|"off", units }.
   ── ب4 ── اختيارُ «أنظمة الوحدة الجديدة» ("off" الافتراضي | "parent") يُمرَّر وسيطاً إلى مسار الإنشاء في _ogAddGo (ثلاثة مواضع معلَّمة «ب4»). */
/* V7 · د6: «class Component» اصطلاحُ إطار الصفحات نفسُه (dc-runtime يأخذ الصنفَ بهذا الاسم) — كما في كل صفحة */
/* eslint-disable-next-line no-redeclare, no-unused-vars */
class Component extends KIVO.BassamPageKit.base(DCLogic, ["admin+award+daily+dreport+employees+irshad+plan+profile+seized+staff+tasks", "admin+profile+seized"]) {
  state = { p44: {}, ogQ: "", ogFlt: "", ogShut: {}, ogSel: {}, ogSheet: !1, ogDlg: null, ogDrag: null, ogOver: null, ogTick: 0 };
  OG_TABS = { overview: "نظرة عامة", systems: "الأنظمة", admins: "المسؤولون", roles: "الأدوار", people: "الأشخاص", log: "السجل", data: "البيانات" };
  /* ═══ الصفحةُ المضيفة ═══ */
  _ogHost() {
    return (this.props && this.props.host) || {};
  }
  _ogMode() {
    return "dept" === this._ogHost().mode ? "dept" : "site";
  }
  _ogTry(f, d) {
    try {
      const v = f();
      return void 0 === v ? d : v;
    } catch (e) {
      return d;
    }
  }
  /* محتوى قائمٌ تملكه الصفحةُ المضيفة يُركَّب في تبويبه: ابنٌ مباشر يحمل data-org-slot */
  _ogSlot(name) {
    const k = this.props && this.props.children,
      a = Array.isArray(k) ? k : k ? [k] : [];
    for (let i = 0; i < a.length; i++) if (a[i] && a[i].props && a[i].props["data-org-slot"] === name) return a[i];
    return null;
  }
  /* ما يحتاجه logic-perm44.js من صفحة الإعدادات (آخرُ دخول · اسمُ الدور والوحدة · صيغةُ الوقت) — منها هي، لا نسخةَ هنا */
  _acctCtx() {
    const h = this._ogHost();
    return (h.acctCtx && this._ogTry(() => h.acctCtx(), null)) || { l: {}, now: Date.now() };
  }
  adRole(u) {
    const h = this._ogHost();
    return h.adRole ? h.adRole(u) : "";
  }
  adUnit(u) {
    const h = this._ogHost();
    return h.adUnit ? h.adUnit(u) : "";
  }
  adWhen(t, e) {
    const h = this._ogHost();
    return h.adWhen ? h.adWhen(t, e) : "";
  }
  adFull(t) {
    const h = this._ogHost();
    return h.adFull ? h.adFull(t) : "";
  }
  _pages() {
    return this._ogTry(() => KIVO.BassamPerm.PAGE_REG, []) || [];
  }
  /* ═══ العنوان: الوحدة والتبويب ═══ */
  _ogR() {
    return KIVO.BassamOrgRoute;
  }
  _ogIsRoot(id) {
    return id === this._ogR().ROOT;
  }
  _ogKnown(id) {
    const D = KIVO.BassamDepts;
    return !!id && !!this._ogTry(() => (D.allNodes ? D.allNodes() : D.nodes().concat(D.list())).some((x) => x && x.id === id), !1);
  }
  /* نطاقُ الشجرة: مدير المنصة في المركز يرى الهيكلَ كلَّه وفوقه صف «المنصة كلها»؛ ومديرُ الوحدة في إعداداته يرى وحدتَه وما تحتها وحدها
     (المدير العام عقدتُه · مديرُ الإدارة أو القسم وحدتُه) بالقاعدة نفسها التي تفتح له التبويب (KIVO.Perm44.mgrOf)؛ ومديرُ المنصة في إعدادات إدارةٍ يرى تلك الإدارة */
  _ogScope() {
    const D = KIVO.BassamDepts,
      R = this._ogR();
    if ("site" === this._ogMode()) return { mode: "site", top: R.ROOT, has: (id) => this._ogIsRoot(id) || this._ogKnown(id) };
    const A = KIVO.BassamAuth,
      u = this._ogTry(() => A.user(), null) || {},
      act = this._ogTry(() => D.active(), "") || "",
      top = "super" === u.role ? act : "gm" === u.role ? u.gid || "" : u.deptId || act,
      ok = !!top && this._ogKnown(top) && !!this._ogTry(() => KIVO.Perm44.mgrOf(u, top), !1),
      ids = {};
    ok && ((ids[top] = 1), this._ogTry(() => D.descendantsOf(top) || [], []).forEach((x) => (ids[x] = 1)));
    return { mode: "dept", top: ok ? top : "", has: (id) => !!ids[id], act: act };
  }
  _ogTabsOf(unit, mode) {
    if (this._ogIsRoot(unit)) return ["overview", "systems", "admins", "log"];   /* قرارُ المالك (الرد 2): صف «المنصة كلها» بأربعة تبويبات */
    const all = this._ogR().TABS.slice();
    return "dept" === mode ? all.filter((t) => "data" !== t) : all;                /* ب12: لا تبويبَ «البيانات» عند المدير */
  }
  /* الوحدةُ والتبويبُ المعروضان الآن: من العنوان، مصحَّحَين بالنطاق (وحدةٌ خارج النطاق أو غيرُ موجودة ⇒ الافتراضية · تبويبٌ لا تحمله الوحدة ⇒ «نظرة عامة») */
  _ogRoute() {
    const R = this._ogR(),
      sc = this._ogScope(),
      p = this._ogTry(() => R.parse(location.hash), null),
      mine = !!p && p.mode === sc.mode,
      def = "site" === sc.mode ? R.ROOT : sc.has(sc.act) ? sc.act : sc.top,
      want = mine ? p.unit : "",
      unit = want && sc.has(want) ? want : def,
      tabs = this._ogTabsOf(unit, sc.mode),
      tab = mine && tabs.indexOf(p.tab) !== -1 ? p.tab : "overview";
    return { mode: sc.mode, unit: unit, tab: tab, tabs: tabs, mine: mine, bad: mine && !!want && want !== unit ? want : "", scope: sc, href: unit ? R.href(sc.mode, unit, tab) : "" };
  }
  ogHref(unit, tab) {
    return this._ogR().href(this._ogMode(), unit, tab);
  }
  /* العنوانُ يُكتب بصيغته القانونية (فالعناوينُ القديمة تُحوَّل) — ما دام عنوانَ هذه الشاشة: لا يُكتب فوق عنوانِ صفحةٍ أخرى في طريقها للفتح */
  _ogSyncHash(rt) {
    try {
      if (!rt.mine || !rt.href || String(location.hash || "") === rt.href) return;
      history.replaceState && history.replaceState(null, "", location.pathname + location.search + rt.href);
    } catch (e) {}
  }
  /* ═══ نقطةُ التنقّل الواحدة وحارسُها (واجهةُ ب11) ═══ */
  dirty() {
    return !!(this.orgDirty && this._ogTry(() => this.orgDirty(), !1));
  }
  async canLeave(next) {
    if (!this.orgGuard) return !0;
    try {
      return !!(await this.orgGuard(next || {}));
    } catch (e) {
      return !1;
    }
  }
  async go(unit, tab, o) {
    const cur = this._ogRoute(),
      u = unit || cur.unit,
      t = tab || cur.tab,
      tabs = this._ogTabsOf(u, cur.mode),
      next = { unit: u, tab: tabs.indexOf(t) !== -1 ? t : "overview" };
    if (!cur.scope.has(u)) return !1;
    if (next.unit === cur.unit && next.tab === cur.tab && cur.mine) return !0;
    if (!(o && o.force) && !(await this.canLeave(next))) return !1;
    const h = this.ogHref(next.unit, next.tab);
    this.__ogPass = h;
    try {
      String(location.hash || "") === h ? this.setState({ ogTick: (this.state.ogTick | 0) + 1 }) : (location.hash = h);
    } catch (e) {}
    this.state.ogSheet && this.setState({ ogSheet: !1 });
    return !0;
  }
  _ogGo(unit, tab) {
    return (ev) => {
      try {
        if (ev && (ev.ctrlKey || ev.metaKey || ev.shiftKey || 1 === ev.button)) return;
        ev && ev.preventDefault && ev.preventDefault();
        ev && ev.stopPropagation && ev.stopPropagation();
      } catch (e) {}
      this.go(unit, tab);
    };
  }
  componentDidMount() {
    /* الواجهةُ التي يقرؤها الإطارُ وصفحةُ الإعدادات قبل أي مغادرة: href = آخرُ عنوانٍ قبلته الشاشة (أو المنتقَلُ إليه الآن) */
    this.__ogApi = {
      go: (u, t, o) => this.go(u, t, o),
      canLeave: (n) => this.canLeave(n),
      dirty: () => this.dirty(),
      href: () => this.__ogPass || this._ogRoute().href,
      route: () => {
        const r = this._ogRoute();
        return { mode: r.mode, unit: r.unit, tab: r.tab };
      },
    };
    KIVO.BassamOrgRoute.screen = this.__ogApi;
    this.__ogKey = (ev) => {
      "Escape" === ev.key && this.state.ogSheet && !this.state.ogDlg && this.setState({ ogSheet: !1 });
    };
    this.__ogUnload = (ev) => {
      if (!this.dirty()) return;
      ev.preventDefault();
      ev.returnValue = "";
    };
    try {
      document.addEventListener("keydown", this.__ogKey);
      window.addEventListener("beforeunload", this.__ogUnload);
    } catch (e) {}
    const h = this._ogHost();
    h.ready && this._ogTry(() => h.ready(), null);
  }
  componentWillUnmount() {
    KIVO.BassamOrgRoute.screen === this.__ogApi && (KIVO.BassamOrgRoute.screen = null);
    try {
      document.removeEventListener("keydown", this.__ogKey);
      window.removeEventListener("beforeunload", this.__ogUnload);
    } catch (e) {}
    clearTimeout(this._sdT);
  }
  /* ═══ بياناتُ الوحدة: كلُّ قيمةٍ من الخدمات القائمة (BassamDepts · BassamAuth · BassamPerm) ومن مصادر التبويبات نفسها (logic-perm44.js) ═══ */
  _ogKindKey(id, node) {
    if (this._ogIsRoot(id)) return "root";
    if (node && node.sec) return "sec";
    if (node && node.dept) return "dept";
    const k = String((node && node.kind) || "");
    return "إدارة عليا" === k ? "top" : "قطاع" === k ? "sector" : "إدارة عامة" === k ? "gen" : "other";
  }
  _ogInfo(id) {
    const D = KIVO.BassamDepts,
      A = KIVO.BassamAuth || {};
    if (this._ogIsRoot(id)) {
      const sups = this._ogTry(() => A.users().filter((u) => u && "super" === u.role && !u.dis), []);
      return { id: id, root: !0, isNode: !1, isUnit: !1, name: "المنصة كلها", kind: "المنصة", kindKey: "root", path: [], mgrs: sups, mgrHas: sups.length > 0, kids: this._ogTry(() => D.childrenOf(null) || [], []) };
    }
    const n = this._ogTry(() => D.nodeOf(id), null) || { id: id, name: id },
      isUnit = !!n.dept,
      mgrs = this._ogTry(() => (isUnit ? A.deptManagers(id) : A.groupManagers(id)) || [], []);
    return {
      id: id,
      root: !1,
      node: n,
      isNode: !isUnit,
      isUnit: isUnit,
      isSec: !!n.sec,
      name: n.name || "—",
      kind: n.kind || (isUnit ? "إدارة" : "عقدة"),
      kindKey: this._ogKindKey(id, n),
      path: this._ogTry(() => D.pathOf(id) || [], []),
      mgrs: mgrs,
      mgrHas: mgrs.length > 0,
      kids: this._ogTry(() => D.childrenOf(id) || [], []),
    };
  }
  /* V7 · د6: منقولٌ كما هو من صفحة الإعدادات — يقرؤه عمودُ «الأنظمة» في الشجرة (تلميحُه) وخطوةُ «الأنظمة» في قائمة التهيئة.
     V7 P3-0 · نصُّ حالة السقف من مصدرٍ واحد (KIVO.BassamPerm.capState) — الشجرة وقائمة التهيئة ومحرّر السقف تقرؤه هو وحده.
     عرضٌ فقط: لا يغيّر سقفاً ولا تفويضاً */
  _capStateTxt(o) {
    const P = KIVO.BassamPerm;
    let s = null;
    try {
      s = P && P.capState ? P.capState(o) : null;
    } catch (e) {}
    if (!s) return { kind: "", ok: !0, tone: "", short: "", txt: "" };
    const of = s.n + " من " + KIVO.BassamCount(s.all, "صفحة", "g"),
      k = s.kind;
    /* الفراغ: من سجلّ الوحدة نفسِه ([] — أو مستقلّةٌ سجلُّها فارغ) أم من سقوف الأصول (سجلُّها غيرُ فارغ أو لا سجلَّ لها)؟
       قراءةُ السجلّ الخام للعرض وحده (rawCap) — لا تغيّر capState ولا التفويض */
    if (s.empty) {
      const ownEmpty = "own" === k && this._capOwnRecEmpty(o);
      return ownEmpty
        ? { kind: k, empty: !0, ownEmpty: !0, ok: !1, tone: "warn", short: "السقف فارغ", txt: "سقفٌ خاصّ" + (s.independent ? " مستقلّ" : "") + " فارغ — لا صفحة مفعّلة لهذه الوحدة" }
        : { kind: k, empty: !0, ownEmpty: !1, ok: !1, tone: "warn", short: "السقف فارغ بحكم الأصول", txt: "السقف الفعلي فارغ بحكم سقوف الأصول — لا صفحة مفعّلة" };
    }
    if ("open" === k)
      return { kind: k, ok: !1, tone: "warn", short: "السقف مفتوح — لم يُضبط", txt: "مفتوح — لم يُضبط: لا سقفَ لها ولا لأصولها، فكلُّ صفحات المنصة متاحة (" + of + ")" };
    if ("inherit" === k) return { kind: k, ok: !0, tone: "", short: "يرث سقف الأصل · " + of, txt: "موروثٌ من الأصل: لا سقفَ خاصّاً لها، ويحدّها سقفُ أصلٍ فوقها — " + of };
    return { kind: k, ok: !0, tone: "", short: "سقفٌ خاصّ · " + of + (s.independent ? " · مستقلّ" : ""), txt: "سقفٌ خاصّ" + (s.independent ? " مستقلّ" : "") + ": " + of };
  }
  /* سجلُّ سقف الوحدة نفسِها فارغٌ من صفحات المنصة المعروفة؟ (عرضٌ فقط — لتمييز «سقفٌ خاصّ فارغ» من «فارغ بحكم الأصول») */
  _capOwnRecEmpty(o) {
    const P = KIVO.BassamPerm;
    try {
      const keys = (P && P.PAGE_KEYS) || [];
      return !!(P && P.hasCap && P.hasCap(o)) && !P.rawCap(o).some((x) => keys.indexOf(x) !== -1);
    } catch (e) {
      return !1;
    }
  }
  /* «الأشخاص» لكل وحدة بمسحٍ واحد للحسابات — بقواعد logic-perm44.js نفسها (p44IsOwnPerson · p44UnitOfUser · p44PeopleOf) فالعمودُ = عددُ صفوف التبويب */
  _ogPeopleIdx() {
    const own = {},
      all = {};
    let total = 0;
    this._p44Users().forEach((u) => {
      if (!u || "super" === u.role) return;
      total++;
      const k = this.p44UnitOfUser(u);
      k && (all[k] = (all[k] || 0) + 1);
      this.p44IsOwnPerson(u) && u.deptId && (own[u.deptId] = (own[u.deptId] || 0) + 1);
    });
    return { own: own, all: all, total: total };
  }
  _ogPeopleN(inf, X) {
    if (inf.root) return X.total;
    if (inf.isUnit) return X.own[inf.id] || 0;
    let n = X.all[inf.id] || 0;
    this._ogTry(() => KIVO.BassamDepts.descendantsOf(inf.id) || [], []).forEach((x) => (n += X.all[x] || 0));
    return n;
  }
  /* ═══ ب2 · الشجرة ═══ */
  _ogTreeRows(rt) {
    const D = KIVO.BassamDepts,
      sc = rt.scope,
      site = "site" === sc.mode,
      st = this.state,
      X = this._ogPeopleIdx(),
      act = this._ogTry(() => D.active(), ""),
      sup = this._p44SupNow(),
      struct = site && sup,
      q = String(st.ogQ || "").trim(),
      dig = (s) => this._ogTry(() => KIVO.BassamFind.dig(String(s || "")), String(s || "")),
      qd = q ? dig(q) : "",
      flt = st.ogFlt || "",
      forced = !!q || !!flt,
      raw = this._ogTry(() => D.railTree() || [], []).filter((r) => "none" !== r.t);
    /* الصفوفُ الخام بعمقها: في المركز تحت صف «المنصة كلها» (+1) · عند المدير فرعُه وحده من قمّته */
    let base = [];
    if (site) {
      const bucket = {};
      this._ogTry(() => D.railTree() || [], []).forEach((r, i, a) => {
        "none" === r.t && a.slice(i + 1).forEach((x) => (bucket[x.id] = 1));
      });
      base = [{ id: this._ogR().ROOT, depth: 0, kids: this._ogInfo(this._ogR().ROOT).kids.length }].concat(raw.map((r) => ({ id: r.id, depth: (bucket[r.id] ? r.depth - 1 : r.depth) + 1, kids: r.kids })));
    } else if (sc.top) {
      const i0 = raw.findIndex((r) => r.id === sc.top);
      if (i0 >= 0) for (let i = i0; i < raw.length && (i === i0 || raw[i].depth > raw[i0].depth); i++) base.push({ id: raw[i].id, depth: raw[i].depth - raw[i0].depth, kids: raw[i].kids });
    }
    const rows = base.map((b) => {
      const inf = this._ogInfo(b.id),
        people = this._ogPeopleN(inf, X),
        sys = this.p44SysCount(b.id);
      return { b: b, inf: inf, people: people, sys: sys, empty: !inf.root && !inf.kids.length && !people };
    });
    const counts = { mgr: 0, nomgr: 0, empty: 0 };
    rows.forEach((r) => {
      if (r.inf.root) return;
      r.inf.mgrHas ? counts.mgr++ : counts.nomgr++;
      r.empty && counts.empty++;
    });
    /* البحثُ والفلاترُ: الصفُّ المطابق وأصولُه (فلا يظهر فرعٌ بلا سياقه) */
    const hit = rows.map((r) => (!qd || dig(r.inf.name).indexOf(qd) >= 0) && (!flt || (!r.inf.root && ("mgr" === flt ? r.inf.mgrHas : "nomgr" === flt ? !r.inf.mgrHas : r.empty))));
    const keep = hit.slice();
    if (forced)
      for (let i = 0; i < rows.length; i++) {
        if (keep[i]) continue;
        for (let j = i + 1; j < rows.length && rows[j].b.depth > rows[i].b.depth; j++)
          if (hit[j]) {
            keep[i] = !0;
            break;
          }
      }
    const out = [];
    let shutAt = -1;
    rows.forEach((r, i) => {
      const b = r.b,
        inf = r.inf;
      if (shutAt >= 0 && b.depth > shutAt) return;
      shutAt = -1;
      if (forced && !keep[i]) return;
      const open = forced || inf.root || !st.ogShut[b.id];
      b.kids && !open && (shutAt = b.depth);
      const chk = !!st.ogSel[b.id],
        drag = struct && !inf.root ? this._ogDragProps(b.id) : {};
      out.push({
        id: b.id,
        seg: inf.root ? this._ogR().ROOT_SEG : b.id,
        name: inf.name,
        level: String(b.depth + 1),
        cls: "d" + Math.min(6, b.depth) + (inf.root ? " root" : "") + (b.id === rt.unit ? " sel" : "") + (drag.trDragCls ? " " + drag.trDragCls : ""),
        sel: b.id === rt.unit ? "true" : "false",
        exp: b.kids && !inf.root ? (open ? "true" : "false") : void 0,
        kidsOn: !!b.kids && !inf.root,
        leaf: !b.kids || inf.root,
        toggle: (ev) => {
          ev && ev.stopPropagation && ev.stopPropagation();
          this.setState((s) => {
            const m = { ...(s.ogShut || {}) };
            m[b.id] ? delete m[b.id] : (m[b.id] = 1);
            return { ogShut: m };
          });
        },
        pick: this._ogGo(b.id),
        tip: inf.path.concat([inf.name]).join(" ← "),
        kind: inf.kind,
        kindKey: inf.kindKey,
        kids: String(inf.kids.length),
        mgrHas: inf.mgrHas ? "true" : "false",
        mgr: inf.mgrHas ? "له مدير" : "بلا مدير",
        people: String(r.people),
        peopleTip: inf.root ? "كل حسابات المنصة" : inf.isUnit ? "أشخاص الوحدة" : "أشخاص الفرع",
        sys: r.sys.on + "/" + r.sys.all,
        sysTip: inf.root ? "الأنظمة المفعّلة على المنصة من الكل" : "الأنظمة المفعّلة من الكل" + (this._capStateTxt(b.id).short ? " — " + this._capStateTxt(b.id).short : ""),
        cur: inf.isUnit && b.id === act,
        chkOn: struct && !inf.root,
        chk: chk ? "true" : "false",
        chkFlip: (ev) => {
          ev && ev.stopPropagation && ev.stopPropagation();
          this.setState((s) => {
            const m = { ...(s.ogSel || {}) };
            m[b.id] ? delete m[b.id] : (m[b.id] = 1);
            return { ogSel: m };
          });
        },
        drag: struct && !inf.root ? "true" : "false",
        ...drag,
      });
    });
    return { rows: out, counts: counts, n: rows.filter((r) => !r.inf.root).length, all: rows, struct: struct, forced: forced };
  }
  /* KIVO_265 · السحبُ والإفلات (منقولٌ كما هو من صفحة الهيكل): الثلثُ الأعلى «قبل» والأسفل «بعد» والوسط «تحت» — BassamDepts.moveNode */
  _ogDragProps(id) {
    const e = this.state,
      ov = e.ogOver;
    return {
      trDragCls: (e.ogDrag === id ? "dragging" : "") + (ov && ov.id === id ? " dz-" + ov.pos : ""),
      trDragStart: (t) => {
        try {
          (t.dataTransfer.setData("text/plain", id), (t.dataTransfer.effectAllowed = "move"));
        } catch (x) {}
        t.stopPropagation && t.stopPropagation();
        this.setState({ ogDrag: id, ogOver: null });
      },
      trDragOver: (t) => {
        const s = this.state.ogDrag;
        if (!s || s === id) return;
        t.preventDefault();
        t.stopPropagation && t.stopPropagation();
        const D = KIVO.BassamDepts,
          r = t.currentTarget.getBoundingClientRect(),
          y = t.clientY - r.top,
          h = r.height || 36,
          tg = D && D.nodeOf ? D.nodeOf(id) : null,
          leaf = !!(tg && tg.dept),
          pos = y < 0.3 * h ? "before" : y > 0.7 * h ? "after" : leaf ? (y < h / 2 ? "before" : "after") : "inside";
        try {
          t.dataTransfer.dropEffect = "move";
        } catch (x) {}
        const o = this.state.ogOver;
        (o && o.id === id && o.pos === pos) || this.setState({ ogOver: { id, pos } });
      },
      trDragLeave: (t) => {
        const o = this.state.ogOver,
          r = t.relatedTarget;
        o && o.id === id && r && t.currentTarget && !t.currentTarget.contains(r) && this.setState({ ogOver: null });
      },
      trDrop: (t) => {
        t.preventDefault();
        t.stopPropagation && t.stopPropagation();
        const s = this.state.ogDrag,
          o = this.state.ogOver;
        this.setState({ ogDrag: null, ogOver: null });
        s && o && o.id === id && this._ogDndMove(s, id, o.pos);
      },
      trDragEnd: () => {
        (this.state.ogDrag || this.state.ogOver) && this.setState({ ogDrag: null, ogOver: null });
      },
    };
  }
  _ogDndMove(s, id, pos) {
    const D = KIVO.BassamDepts,
      r = D && D.moveNode ? D.moveNode(s, id, pos) : { ok: !1, err: "غير متاح" };
    if (!r || !r.ok) return void this.bsToast((r && r.err) || "تعذّر النقل", "err");
    if (r.pid) {
      const m = { ...(this.state.ogShut || {}) };
      delete m[r.pid];
      this.setState({ ogShut: m });
    }
    this.bsToast(r.msg, "ok");
  }
  _ogSetAll(open, rows) {
    const m = {};
    open || rows.forEach((r) => r.b.kids && !r.inf.root && (m[r.b.id] = 1));
    this.setState({ ogShut: m });
  }
  /* خطّافُ التحديد المتعدد (ب2 · يملؤه تبويبُ «الأنظمة»): يعيد true إن تولّى التطبيق — وإلا يُقال للمستخدم صراحةً */
  _ogBulk(mode) {
    const units = Object.keys(this.state.ogSel || {}).filter((id) => this._ogKnown(id));
    if (!units.length) return;
    let done = !1;
    try {
      done = !!(this.orgBulkApply && this.orgBulkApply(mode, units));
      window.dispatchEvent(new CustomEvent("bs:org-bulk", { detail: { mode: mode, units: units } }));
    } catch (e) {}
    done || this.bsToast("تطبيق الأنظمة على الوحدات المحددة غير متاح الآن", "warn");
  }
  /* ═══ ب3 · نوافذُ أفعال الهيكل ═══ */
  _ogDlg(patch) {
    this.setState((s) => ({ ogDlg: null === patch ? null : Object.assign({}, s.ogDlg || {}, patch) }));
  }
  _ogFocus(id) {
    const f = (n) => {
      try {
        const el = document.getElementById(id);
        el ? el.focus() : n < 12 && setTimeout(() => f(n + 1), 40);
      } catch (e) {}
    };
    setTimeout(() => f(0), 0);
  }
  _ogParentOpts(excl) {
    const D = KIVO.BassamDepts,
      out = [];
    this._ogTry(() => D.railTree() || [], []).forEach((a) => {
      "none" !== a.t && ((excl && a.id === excl) || (excl && !D.canParent(excl, a.id)) || out.push({ id: a.id, name: (a.depth ? "···".repeat(a.depth) + " " : "") + a.name + (a.kind ? "  ⟨" + a.kind + "⟩" : "") }));
    });
    return out;
  }
  _ogPathTxt(pid, tail) {
    const D = KIVO.BassamDepts;
    if (!pid) return ["في الجذر — بلا أب"].concat(tail ? [tail] : []).join(" ← ");
    return this._ogTry(() => (D.pathOf(pid) || []).concat([(D.nodeOf(pid) || {}).name || ""]), [])
      .concat(tail ? [tail] : [])
      .filter(Boolean)
      .join(" ← ");
  }
  /* الإضافة: نافذةٌ واحدة من الموضعين — «+ إضافة» فوق الشجرة (بلا أب) و«+ إضافة تحتها» في «نظرة عامة» (الأبُ الوحدةُ المختارة؛ وتحت إدارةٍ النوعُ «قسم») */
  _ogAddOpen(pid) {
    const D = KIVO.BassamDepts,
      p = pid && !this._ogIsRoot(pid) ? this._ogTry(() => D.nodeOf(pid), null) : null;
    this.setState({ ogDlg: { k: "add", name: "", kind: p && p.dept ? D.NODE_KIND_SEC || "قسم" : "", newKind: "", pid: p ? pid : "", sys: "off", msg: "" } });
    this._ogFocus("ogAddName");
  }
  /* منقولٌ من صفحة الهيكل القديمة (ndGo) بقواعده: الاسمُ فريدٌ في الهيكل · «قسم» ← sectionAdd · «إدارة» ← سجلُّ الإدارات بقاعدة الموضع · غيرُهما ← nodeAdd */
  _ogAddGo() {
    const D = KIVO.BassamDepts,
      f = this.state.ogDlg || {},
      name = String(f.name || "").trim(),
      kind = String("__new" === f.kind ? f.newKind || "" : f.kind || "").trim(),
      pid = f.pid || null,
      sys = "parent" === f.sys ? "parent" : "off",   /* ب4: «مطفأة كلها» (الافتراضي) أو «نفس أنظمة العقدة الأب» */
      fail = (m) => this._ogDlg({ msg: m });
    if (!name) return fail("اكتب الاسم");
    if (!kind) return fail("اختر النوع");
    if (D.nodes().some((x) => x.name === name) || D.list().some((x) => x.name === name)) return fail("يوجد في الهيكل ما يحمل هذا الاسم");
    let id = "";
    if (kind === (D.NODE_KIND_SEC || "قسم") && D.sectionAdd) {
      const x = D.sectionAdd({ name: name, deptId: pid || "", systems: sys });   /* ب4: الاختيارُ وسيطٌ لمسار إنشاء القسم */
      if (!x || !x.ok) return fail((x && x.err) || "تعذّر إنشاء القسم");
      id = x.id;
    } else if (kind === (D.NODE_KIND_DEPT || "إدارة")) {
      if (pid && !D.nodeOf(pid)) return fail("الأب غير موجود");
      const w = D.placeWhy({ id: "", dept: !0 }, pid);
      if (w) return fail(w);
      id = D.freshId("d");
      const rec = { id: id, name: name };
      pid && (rec.gid = pid);
      D.save(D.list().concat([rec]));
      try {
        const P = KIVO.BassamPerm;
        P && P.seedCapFrom && P.seedCapFrom(id, pid, { systems: sys });   /* ب4: الاختيارُ وسيطٌ لبذر سقف الإدارة الجديدة */
      } catch (e) {}
    } else {
      const r = D.nodeAdd({ name: name, kind: kind, pid: pid, systems: sys });   /* ب4: الاختيارُ وسيطٌ لمسار إنشاء العقدة */
      if (!r || !r.ok) return fail((r && r.err) || "تعذّر الإنشاء");
      id = r.id;
    }
    if (pid) {
      const m = { ...(this.state.ogShut || {}) };
      delete m[pid];
      this.setState({ ogShut: m });
    }
    this.setState({ ogDlg: null });
    this.bsAck("أُنشئت «" + name + "» — أكمل تهيئتها من «نظرة عامة»", "ok");
    id && this.go(id, "overview", { force: !0 });
  }
  /* منقولٌ من رأس صفحة الوحدة القديمة (selRenameSave): الاسمُ فريدٌ بين العقد أو بين الإدارات والأقسام */
  _ogRenGo(inf) {
    const D = KIVO.BassamDepts,
      s = String((this.state.ogDlg || {}).name || "").trim(),
      fail = (m) => this._ogDlg({ msg: m });
    if (!s) return fail("اكتب الاسم");
    if (s === inf.name) return void this.setState({ ogDlg: null });
    if (inf.isNode) {
      if (D.nodes().some((x) => x.id !== inf.id && x.name === s)) return fail("الاسم مستخدم لعقدة أخرى");
      const r = D.nodeSave(inf.id, { name: s });
      if (!r || !r.ok) return fail((r && r.err) || "تعذّر");
    } else {
      const L = D.treeFlat ? D.treeFlat() : D.list();
      if (L.some((x) => x.id !== inf.id && x.name === s)) return fail("الاسم مستخدم لإدارة أو قسم آخر");
      D.save(L.map((x) => (x.id === inf.id ? { ...x, name: s } : x)));
    }
    this.setState({ ogDlg: null });
    this.bsAck("تم تحديث الاسم", "ok");
  }
  /* منقولٌ من «الموضع» في صفحة الوحدة القديمة (selSetGid): العقدةُ nodeSave · الإدارةُ والقسم setDeptParent · «+ إدارة عامة جديدة…» كما كانت */
  _ogMoveGo(inf) {
    const D = KIVO.BassamDepts,
      s = (this.state.ogDlg || {}).pid || "",
      fail = (m) => this._ogDlg({ msg: m }),
      done = (m) => {
        this.setState({ ogDlg: null });
        this.bsAck(m, "ok");
      };
    if (inf.isNode) {
      const r = D.nodeSave(inf.id, { pid: s || null });
      return r && r.ok ? done(s ? "نُقلت تحت «" + ((D.nodeOf(s) || {}).name || "") + "»" : "صارت في الجذر") : fail((r && r.err) || "تعذّر النقل");
    }
    if ("__new" === s) {
      if (inf.isSec) return fail("القسم يكون تحت إدارةٍ مباشرةً — لا تحت «إدارة عامة»");
      const base = "إدارة عامة جديدة";
      let nm = base,
        k = 2;
      for (; D.nodes().some((x) => x.name === nm) || D.list().some((x) => x.name === nm); ) nm = base + " " + k++;
      const r = D.nodeAdd({ name: nm, kind: "إدارة عامة", pid: null });
      if (!r || !r.ok) return fail((r && r.err) || "تعذّر إنشاء الإدارة العامة");
      const c = D.setDeptParent(inf.id, r.id);
      if (!c || !c.ok) return (D.nodeDel(r.id), fail((c && c.err) || "تعذّر الإسناد"));
      return done("أُنشئت «" + nm + "» وأُسندت إليها هذه الإدارة — غيّر اسمها من «نظرة عامة»");
    }
    const a = D.setDeptParent(inf.id, s || null);
    a && a.ok ? done(s ? "أُسندت إلى «" + ((D.nodeOf(s) || {}).name || "") + "»" : "رُفع التصنيف") : fail((a && a.err) || "تعذّر الإسناد");
  }
  /* سببُ منع الحذف بالقاعدة القائمة (الفارغةُ وحدها) — "" = يُحذف */
  _ogDelWhy(inf) {
    const D = KIVO.BassamDepts,
      A = KIVO.BassamAuth;
    if (inf.isNode) {
      const kd = inf.kids.length;
      if (kd) return "تحت «" + inf.name + "» " + KIVO.BassamCount(kd, "تابع") + " — انقلها أو احذفها أولاً ثم احذف العقدة";
      const m = this._ogTry(() => A.groupManagers(inf.id).length, 0);
      if (m) return "لـ«" + inf.name + "» " + KIVO.BassamCount(m, "حساب مدير") + " — احذفه أولاً من تبويب «المسؤولون» ثم احذف العقدة";
      return "";
    }
    const sw = this._ogTry(() => D.deptDelWhy(inf.id), "");
    if (sw) return sw;
    if (!inf.isSec && this._ogTry(() => D.list().length, 2) <= 1) return "لا تُحذف آخر إدارة في المنصة";
    return "";
  }
  /* منقولٌ من صفحة الوحدة القديمة (dhDel): العقدةُ الفارغة تُحذف بتأكيد هذه النافذة · الإدارةُ والقسم بجرد الخادم وتأكيده (الصفحةُ المضيفة deptDel) */
  _ogDelGo(inf) {
    const D = KIVO.BassamDepts;
    if (this._ogDelWhy(inf)) return;
    if (inf.isNode) {
      const s = D.nodeDel(inf.id);
      if (!s || !s.ok) return void this._ogDlg({ msg: (s && s.err) || "تعذّر الحذف" });
      this.setState({ ogDlg: null });
      this.bsAck("حُذفت العقدة", "ok");
      return void this.go(inf.node.pid && this._ogKnown(inf.node.pid) ? inf.node.pid : this._ogR().ROOT, "overview", { force: !0 });
    }
    this.setState({ ogDlg: null });
    const h = this._ogHost();
    h.deptDel ? h.deptDel(inf.node) : this.bsToast("حذف الإدارة غير متاح هنا", "warn");
  }
  /* ═══════════════════════════════ نقاطُ التركيب: دالةٌ واحدة لكل تبويب ═══════════════════════════════
     c = { unit, tab, mode, inf, isRoot, isNode, node, mgrV, sup, struct }. كلٌّ تعيد قيمَ قسمها في view.html (data-org-tab) وحده. */
  /* ── نظرة عامة (ب10) ── */
  ogTabOverview(c) {
    const D = KIVO.BassamDepts,
      inf = c.inf,
      X = this._ogPeopleIdx(),
      people = this._ogPeopleN(inf, X),
      sys = this.p44SysCount(c.unit),
      mg = inf.mgrs,
      kids = inf.kids.map((k) => ({ name: k.name || "—", kind: k.kind || (k.sec ? "قسم" : "إدارة"), kindKey: this._ogKindKey(k.id, k), href: this.ogHref(k.id, "overview"), go: this._ogGo(k.id, "overview") })),
      sum = [
        { k: "admins", t: "المسؤول", v: mg.length ? mg[0].name || mg[0].un || "—" : "بلا مدير", s: inf.root ? KIVO.BassamCount(mg.length, "حساب") + " لمدير المنصة" : mg.length > 1 ? "و" + KIVO.BassamCount(mg.length - 1, "مدير") + " غيره" : mg.length ? "مدير الوحدة" : "لم يُعيَّن بعد" },
        { k: "people", t: "الأشخاص", v: String(people), s: inf.root ? "كل حسابات المنصة" : inf.isUnit ? "في هذه الوحدة" : "في العقدة وفرعها" },
        { k: "systems", t: "الأنظمة المفعّلة", v: sys.on + " من " + sys.all, s: inf.root ? "على المنصة كلها" : "بعد الوراثة ممّا فوقها" },
      ].map((x) => ({ ...x, go: this._ogGo(c.unit, c.tabs.indexOf(x.k) !== -1 ? x.k : "overview") }));
    const v = {
      ogOnOverview: !0,
      ogSum: sum,
      ogPosTxt: inf.root ? "أعلى الهيكل" : inf.path.concat([inf.name]).join(" ← ") || inf.name,
      ogKids: kids,
      ogKidsOn: kids.length > 0,
      ogKidsNone: !kids.length,
      ogKidsN: KIVO.BassamCount(kids.length, "تابع"),
      /* ب3: أفعالُ الهيكل هنا وحدها — لمدير المنصة في المركز (ب12: لا أفعالَ هيكلٍ عند المدير) */
      ogActsOn: c.struct,
      ogActAddOn: c.struct && !inf.isSec,
      ogActEditOn: c.struct && !inf.root,
      ogActsNote: c.struct ? "" : "أفعال الهيكل (الإضافة · إعادة التسمية · النقل · الحذف) لمدير المنصة من «مركز إدارة رشاد».",
      ogDelLbl: inf.isNode ? "حذف العقدة" : inf.isSec ? "حذف القسم" : "حذف الإدارة",
      ogAddUnder: () => this._ogAddOpen(c.unit),
      ogRenameOpen: () => (this.setState({ ogDlg: { k: "rename", id: c.unit, name: inf.name, msg: "" } }), this._ogFocus("ogRenName")),
      ogMoveOpen: () => this.setState({ ogDlg: { k: "move", id: c.unit, pid: (inf.node && inf.node.pid) || "", msg: "" } }),
      ogDelOpen: () => {
        /* الإدارةُ والقسم بلا مانع: جردُ الخادم وتأكيدُه هو النافذة (لا تأكيدَ مرتين) · وما سواه نافذةُ التأكيد أو سببُ المنع */
        if (!inf.isNode && !this._ogDelWhy(inf)) return void this._ogDelGo(inf);
        this.setState({ ogDlg: { k: "del", id: c.unit, msg: "" } });
      },
      ogStepsOn: !inf.root,
    };
    if (inf.root) return v;
    /* قائمةُ التهيئة: خمسُ خطواتٍ حقيقية — كلٌّ بحالته من البيانات الفعلية، والضغطُ يفتح تبويبَ الخطوة */
    const cs = this._capStateTxt(c.unit),   /* V7 P3-0: المصدرُ الواحد — «مفتوح — لم يُضبط» تنبيهٌ لا علامةُ تمام */
      capOk = !!cs.kind && cs.ok,
      capTxt = cs.short || sys.on + " من " + sys.all + " مفعّلة",
      units = inf.isUnit ? [c.unit] : this._ogTry(() => D.deptsUnder(c.unit) || [], []),
      withRoles = units.filter((u) => {
        const r = this._ogTry(() => this._p44E().rolesOf(u), null);
        return !!r && ((Array.isArray(r) ? r : r.roles) || []).length > 0;
      }).length,
      rolesOk = units.length > 0 && withRoles === units.length,
      rolesTxt = inf.isUnit ? (withRoles ? "أدوار الموظفين معرَّفة" : "لا أدوار للموظفين بعد") : units.length ? withRoles + " من " + KIVO.BassamCount(units.length, "وحدة") + " لها أدوار" : "لا وحدة تحتها بعد",
      all4 = capOk && mg.length > 0 && rolesOk,
      step = (k, t, st, ok, tab) => ({ k: k, t: t, st: st, ok: ok ? "true" : "false", mark: ok ? "✓" : "!", sr: ok ? "منجز" : "ناقص", tip: (ok ? "منجز" : "ناقص") + " — افتح «" + this.OG_TABS[tab] + "»", go: this._ogGo(c.unit, tab) });
    v.ogSteps = [
      step("node", "العقدة", inf.kind + " · في الهيكل", !0, "overview"),
      step("systems", "الأنظمة", capTxt, capOk, "systems"),
      step("admins", "المسؤول", mg.length ? "معيَّن: " + mg.map((m) => m.name || m.un).join("، ") : "لم يُعيَّن بعد", mg.length > 0, "admins"),
      step("roles", "الصلاحيات", rolesTxt, rolesOk, "roles"),
      step("review", "المراجعة", all4 ? "اكتملت الخطوات — راجع السجل" : "تكتمل بإنجاز ما قبلها", all4, "log"),
    ];
    return v;
  }
  /* ── الأنظمة (ب5 · م5): المحتوى القائم _p44SysVals للوحدة المختارة ("__plat" = مفاتيحُ المنصة) ── */
  ogTabSystems(c) {
    return this._p44Vals(c.unit, c.isNode, c.node, "systems");
  }
  /* ── المسؤولون (ب6 · م6): بطاقةُ «مدير المنصة» للجذر · وبطاقةُ «مدير الوحدة» القائمة (جدولُها من الصفحة المضيفة) ── */
  ogTabAdmins(c) {
    const a = this.p44AdminsVals(c.unit, c.isNode, c.mgrV),
      n = c.isRoot ? c.inf.mgrs.length : a.p44MgrN | 0;
    return Object.assign(this._p44Vals(c.unit, c.isNode, c.node, "admins"), a, {
      ogOnAdmins: !0,
      p44Head: "المسؤولون",
      p44Lead: c.isRoot ? "مدير المنصة: صلاحية كاملة بلا قيد." : "مسؤولو «" + c.inf.name + "»: " + (n ? KIVO.BassamCount(n, "مدير") : "لا مدير بعد") + " — يعيّنهم مدير المنصة وحده.",
      ogSlotAdmins: this._ogSlot("admins"),
    });
  }
  /* ── الأدوار (ب7 · م6): المحتوى القائم _p44RoleVals ── */
  ogTabRoles(c) {
    return this._p44Vals(c.unit, c.isNode, c.node, "roles");
  }
  /* ── الأشخاص (ب8 · م6): المحتوى القائم _p44PeopleVals · والعقدةُ الإشرافية «أشخاص الفرع» _p44NodePeopleVals ── */
  ogTabPeople(c) {
    return this._p44Vals(c.unit, c.isNode, c.node, "people");
  }
  /* ── السجل (ب8 · م6): المحتوى القائم _p44LogVals · صف «المنصة كلها» لا سجلَّ وحدةٍ له في الخادم اليوم (/api/perm44/log يطلب وحدة) ── */
  ogTabLog(c) {
    if (c.isRoot)
      return Object.assign(this._p44Vals(c.unit, !1, null, "none"), {
        p44Head: "السجل",
        p44Lead: "كل تغيير: من غيّر، ماذا تغيّر، ومن تأثّر.",
        ogLogRoot: !0,
        ogLogRootTxt: "تغييرات أنظمة المنصة وحساباتها تُعرض في سجل الأنشطة والتغييرات، وتغييرات كل وحدة في تبويب «السجل» لها.",
        ogLogRootGo: (ev) => {
          ev && ev.preventDefault && ev.preventDefault();
          this.canLeave({ leave: !0 }).then((y) => y && this._ogTry(() => KIVO.BassamNav.conGo("oplog", null), null));
        },
      });
    return this._p44Vals(c.unit, c.isNode, c.node, "log");
  }
  /* ── البيانات (ب8): قسمُ «بيانات الإدارة» القائم من الصفحة المضيفة — للإدارة والقسم؛ والعقدةُ الإشرافية تدلّ على وحداتها ── */
  ogTabData(c) {
    const D = KIVO.BassamDepts,
      units = c.isNode ? this._ogTry(() => D.deptsUnder(c.unit) || [], []) : [];
    return {
      ogOnData: !0,
      ogDataNode: c.isNode,
      ogDataUnit: !c.isNode,
      ogDataUnits: units.map((id) => {
        const n = this._ogTry(() => D.nodeOf(id), null) || {};
        return { name: n.name || id, kind: n.kind || "إدارة", kindKey: this._ogKindKey(id, n), href: this.ogHref(id, "data"), go: this._ogGo(id, "data") };
      }),
      ogDataUnitsNone: c.isNode && !units.length,
      ogSlotData: this._ogSlot("data"),
    };
  }
  /* ═══ الرسم ═══ */
  renderVals() {
    const D = KIVO.BassamDepts,
      st = this.state,
      rt = this._ogRoute(),
      mode = rt.mode;
    this.__p44Dept = "dept" === mode;   /* عرضُ المدير دائماً في «الإعدادات ← الصلاحيات» (logic-perm44.js _p44Viewer) */
    if (!D || !rt.unit) return { ogOn: !1, ogNoneOn: !0, ogNoneTxt: D ? "لا وحدة تديرها في هذا الموضع — «الصلاحيات» لمدير الوحدة ومدير المنصة." : "تعذّر قراءة سجل الإدارات — أعد المحاولة", ogMode: mode };
    this._ogSyncHash(rt);
    this.__ogPass === rt.href && (this.__ogPass = "");
    if (rt.bad && this.__ogBad !== rt.bad) {
      this.__ogBad = rt.bad;
      setTimeout(() => this.bsToast("العقدة المطلوبة غير موجودة في الهيكل", "warn"), 0);
    }
    const inf = this._ogInfo(rt.unit),
      sup = this._p44SupNow(),
      tree = this._ogTreeRows(rt),
      c = { unit: rt.unit, tab: rt.tab, tabs: rt.tabs, mode: mode, inf: inf, isRoot: inf.root, isNode: inf.isNode, node: inf.node || null, mgrV: "mgr" === this._p44Viewer(), sup: sup, struct: tree.struct },
      selN = Object.keys(st.ogSel || {}).filter((id) => this._ogKnown(id)).length,
      dlg = st.ogDlg || null,
      dInf = dlg && dlg.id && this._ogKnown(dlg.id) ? this._ogInfo(dlg.id) : null,
      act = this._ogTry(() => D.active(), ""),
      h = this._ogHost(),
      stop = (ev) => {
        ev && ev.stopPropagation && ev.stopPropagation();
      };
    const mount = { overview: "ogTabOverview", systems: "ogTabSystems", admins: "ogTabAdmins", roles: "ogTabRoles", people: "ogTabPeople", log: "ogTabLog", data: "ogTabData" }[rt.tab];
    const tabVals = this[mount](c);
    const v = {
      ogOn: !0,
      ogNoneOn: !1,
      ogMode: mode,
      ogUnitSeg: inf.root ? this._ogR().ROOT_SEG : rt.unit,
      ogTab: rt.tab,
      ogKeep: stop,
      /* الرأس: المسار · الاسم · النوع · حالة المدير · «التبديل إليها» — لا تعديلَ اسمٍ هنا (ب3) */
      ogU: {
        name: inf.name,
        pathTxt: inf.path.join(" ← ") || (inf.root ? "مركز إدارة رشاد" : "أعلى الهيكل"),
        kind: inf.kind,
        kindKey: inf.kindKey,
        mgrHas: inf.mgrHas ? "true" : "false",
        mgrTxt: inf.mgrHas ? "له مدير" : "بلا مدير",
        cur: inf.isUnit && rt.unit === act,
        switchOn: "site" === mode && sup && inf.isUnit && rt.unit !== act && !!h.switchDept,
      },
      ogSwitch: () => h.switchDept && this.canLeave({ leave: !0 }).then((y) => y && h.switchDept(rt.unit)),
      ogTabs: rt.tabs.map((k) => ({ k: k, t: this.OG_TABS[k], on: k === rt.tab ? "true" : "false", href: this.ogHref(rt.unit, k), go: this._ogGo(rt.unit, k) })),
      /* الشجرة */
      ogRows: tree.rows,
      ogRowsNone: !tree.rows.filter((r) => !/(^| )root( |$)/.test(r.cls)).length,
      ogRowsNoneTxt: tree.forced ? "لا وحدة تطابق البحث أو الفلتر" : "site" === mode ? "لا وحدات في الهيكل بعد — ابدأ بـ«+ إضافة»" : "لا وحدات تحت إدارتك",
      ogUnitCount: String(tree.n),
      ogStructOn: tree.struct,
      ogDndOn: tree.struct,
      ogQ: st.ogQ || "",
      ogOnQ: (ev) => this.setState({ ogQ: String((ev && ev.target && ev.target.value) || "") }),
      ogExpandAll: () => this._ogSetAll(!0, tree.all),
      ogCollapseAll: () => this._ogSetAll(!1, tree.all),
      ogFilters: [["mgr", "لها مدير"], ["nomgr", "بلا مدير"], ["empty", "فارغة"]].map((x) => ({ k: x[0], t: x[1], n: String(tree.counts[x[0]]), on: st.ogFlt === x[0] ? "true" : "false", pick: () => this.setState({ ogFlt: st.ogFlt === x[0] ? "" : x[0] }) })),
      ogBulkOn: tree.struct && selN > 0,
      ogBulkTxt: "المحدد: " + KIVO.BassamCount(selN, "وحدة"),
      ogBulkEnable: () => this._ogBulk("on"),
      ogBulkDisable: () => this._ogBulk("off"),
      ogBulkClear: () => this.setState({ ogSel: {} }),
      ogExportOn: "site" === mode && sup && !!h.exportAll,
      ogExportAll: () => h.exportAll && h.exportAll(),
      ogAddOpen: () => this._ogAddOpen(""),
      /* زرعُ هيكل القطاع (منقولٌ كما هو: ضغطتان خلال 4 ثوانٍ) */
      sdShow: tree.struct && !!this._ogTry(() => D.needsStructure && D.needsStructure(), !1),
      sdLbl: st.sdArm ? "اضغط مرة أخرى لزرع الهيكل" : "زرع هيكل القطاع",
      sdGo: () => {
        if (!this.state.sdArm) {
          this.setState({ sdArm: !0 });
          clearTimeout(this._sdT);
          this._sdT = setTimeout(() => this.setState({ sdArm: !1 }), 4e3);
          return;
        }
        clearTimeout(this._sdT);
        const r = D.seedStructure();
        if (!r || !r.ok) return (this.bsToast((r && r.err) || "تعذّر زرع الهيكل"), void this.setState({ sdArm: !1 }));
        this.setState({ sdArm: !1, ogShut: {} });
        this.bsAck("زُرع هيكل القطاع: " + KIVO.BassamCount(r.nodes, "عقدة") + " · " + KIVO.BassamCount(r.depts, "إدارة") + (r.linked ? " · ورُبطت " + KIVO.BassamCount(r.linked, "إدارة|قائمة") : ""), "ok");
      },
      /* العرض الضيّق: زرُّ الوحدة ولوحةُ الشجرة */
      ogSheetAttr: st.ogSheet ? "true" : "false",
      ogSheetOpen: () => this.setState({ ogSheet: !0 }),
      ogSheetClose: () => this.setState({ ogSheet: !1 }),
      ogSheetOut: () => this.state.ogSheet && this.setState({ ogSheet: !1 }),
      /* التبويبات: الأقسامُ الأربعة القائمة داخل غلافها (p44Show) — «نظرة عامة» و«البيانات» خارجه */
      ogOnOverview: !1,
      ogOnAdmins: !1,
      ogOnData: !1,
      p44Show: ["systems", "admins", "roles", "people", "log"].indexOf(rt.tab) !== -1,
      ...tabVals,
      /* نوافذُ أفعال الهيكل */
      ogDlgClose: () => this.setState({ ogDlg: null }),
      ogDlgOut: () => this.setState({ ogDlg: null }),
      ogDlgName: dInf ? dInf.name : "",
      ogAddOn: !!dlg && "add" === dlg.k,
      ogRenOn: !!dlg && "rename" === dlg.k && !!dInf,
      ogMoveOn: !!dlg && "move" === dlg.k && !!dInf,
      ogDelOn: !!dlg && "del" === dlg.k && !!dInf,
    };
    if (v.ogAddOn) {
      const set = (k) => (ev) => this._ogDlg({ [k]: String((ev && ev.target && ev.target.value) || ""), msg: "" });
      Object.assign(v, {
        ogAdd: dlg,
        ogAddOnName: set("name"),
        ogAddOnKind: set("kind"),
        ogAddOnNewKind: set("newKind"),
        ogAddOnPid: set("pid"),
        ogAddKinds: this._ogTry(() => D.nodeKinds() || [], []).map((k) => ({ id: k, name: k })),
        ogAddNewOn: "__new" === dlg.kind,
        ogAddParents: this._ogParentOpts(""),
        ogAddPath: this._ogPathTxt(dlg.pid || ""),
        ogAddSys: [["off", "مطفأة كلها"], ["parent", "نفس أنظمة العقدة الأب"]].map((x) => ({ k: x[0], t: x[1], on: (dlg.sys || "off") === x[0] ? "true" : "false", pick: () => this._ogDlg({ sys: x[0] }) })),
        ogAddGo: () => this._ogAddGo(),
      });
    }
    if (v.ogRenOn) Object.assign(v, { ogRen: dlg, ogRenOnName: (ev) => this._ogDlg({ name: String((ev && ev.target && ev.target.value) || ""), msg: "" }), ogRenGo: () => this._ogRenGo(dInf) });
    if (v.ogMoveOn)
      Object.assign(v, {
        ogMove: dlg,
        ogMoveOnPid: (ev) => this._ogDlg({ pid: String((ev && ev.target && ev.target.value) || ""), msg: "" }),
        ogMoveParents: this._ogParentOpts(dInf.id),   /* الوحدةُ نفسها وما تحتها وكلُّ أبٍ ترفضه قاعدةُ الموضع لا تظهر (canParent) */
        ogMoveRootOn: !dInf.isSec,
        ogMoveNewOn: dInf.isUnit && !dInf.isSec,
        ogMovePath: "__new" === dlg.pid ? ["إدارة عامة جديدة", dInf.name].join(" ← ") : this._ogPathTxt(dlg.pid || "", dInf.name),
        ogMoveGo: () => this._ogMoveGo(dInf),
      });
    if (v.ogDelOn) {
      const why = this._ogDelWhy(dInf);
      Object.assign(v, {
        ogDelTitle: (dInf.isNode ? "حذف العقدة" : dInf.isSec ? "حذف القسم" : "حذف الإدارة") + " «" + dInf.name + "»",
        ogDelWhy: why || dlg.msg || "",
        ogDelOk: !why,
        ogDelMsg: "تُحذف «" + dInf.name + "» من الهيكل. لا تُمسّ بيانات أي إدارة.",
        ogDelCancel: why ? "إغلاق" : "إلغاء",
        ogDelGo: () => this._ogDelGo(dInf),
      });
    }
    return v;
  }
}
