/* V7 · د5-هـ (44): تبويبُ «الصلاحيات» في صفحة العقدة (#/sysadmin/org/<id>/perm/<systems|roles|people|log>) — أربعةُ أقسام و«شاهد الصفحة كـ».
   يُجمَع بعد logic.js بترتيب meta.json «logicParts». المحرّكُ KIVO.Perm44 وحده يقرّر (المستويات · تجميعُ الدور · الفعّال · الفرق · الكتابة في المسودة)؛
   الصفحةُ عرضٌ ومسودةٌ واحدة تُحفظ بحفظ Operations واحد. السقفُ (الأنظمة) بمخزنه القائم: bassam_perms_v1.caps (setDeptCap · setDeptSubs · setDeptTabs)
   والإطفاءُ على المنصة كلها mods.off (BassamPlat.set) — لا مخزنَ جديد. مديرُ المنصة بلا قيد: لا يُمنح ولا يُعرض «ممنوحاً». */
"use strict";
Object.assign(Component.prototype, {
  /* ── المصادر ── */
  _p44E() {
    try {
      return KIVO.Perm44 || null;
    } catch (e) {
      return null;
    }
  },
  _p44Try(f, d) {
    try {
      const v = f();
      return v === undefined ? d : v;
    } catch (e) {
      return d;
    }
  },
  _p44S() {
    return this.state.p44 || {};
  },
  _p44Set(patch) {
    this.setState((s) => ({ p44: Object.assign({}, s.p44 || {}, typeof patch === "function" ? patch(s.p44 || {}) : patch) }));
  },
  P44_LV() {
    return { view: "مشاهدة فقط", input: "إدخال", edit: "تعديل", full: "كامل", sensitive: "حسّاس", custom: "مخصّص" };
  },
  /* المستوياتُ من المحرّك (levels) — مصفوفةُ رموزٍ أو {k|key|id, n|name|label}؛ الأسماءُ الافتراضية لما لا اسمَ له */
  _p44Lvls() {
    const L = this.P44_LV(),
      raw = this._p44Try(() => this._p44E().levels(), null);
    const out = (Array.isArray(raw) ? raw : Object.keys(L)).map((x) => {
      const k = "string" === typeof x ? x : x && (x.k || x.key || x.id);
      return k ? { v: k, t: ("object" === typeof x && x && (x.n || x.name || x.label)) || L[k] || k } : null;
    });
    return out.filter(Boolean);
  },
  _p44LvName(k) {
    const x = this._p44Lvls().filter((l) => l.v === k)[0];
    return x ? x.t : k ? String(k) : "";
  },
  /* الأنظمةُ (sysList: {key, name, leaves, toggle}) — cap مفتاحُ السقف = ورقتُه الأولى (صفحتُه، مثل emps/custody) · tg: يُشغَّل ويُطفأ (toggle) */
  _p44Sys() {
    const raw = this._p44Try(() => this._p44E().sysList(), []);
    return (Array.isArray(raw) ? raw : [])
      .map((s) => ("string" === typeof s ? { k: s } : s || {}))
      .map((s) => ({ k: s.k || s.key || "", n: s.n || s.name || this._p44Try(() => KIVO.BassamPerm.nameOf(s.k || s.key), "") || s.k || s.key, cap: s.page || s.cap || (s.leaves && s.leaves[0]) || s.k || s.key, tg: !1 !== s.toggle }))
      .filter((s) => s.k);
  },
  _p44PlatOff() {
    const pl = this._p44Try(() => KIVO.BassamPlat.get(), null);   /* المطفأُ على المنصة كلها — «admin» دائم (activation: always) */
    return ((pl && pl.mods && pl.mods.off) || []).filter((k) => "admin" !== k);
  },
  /* النظامُ مفعّلٌ في الوحدة u؟ = غيرُ مطفأٍ على المنصة ∧ في سقفها الفعلي (سقفُها ∩ سقوفُ أصولها — 331 on) */
  _p44On(u, s, off) {
    const k = "string" === typeof s ? s : s.k,
      cap = "string" === typeof s ? (this._p44Sys().filter((x) => x.k === s)[0] || { cap: s }).cap : s.cap;
    if ((off || this._p44PlatOff()).indexOf(k) !== -1) return !1;
    if (!u || "__plat" === u) return !0;
    return this._p44Try(() => !!KIVO.BassamPerm.on(cap, u), !0);
  },
  /* سببُ القفل: أطفأه سقفٌ فوق الوحدة — «المنصة» أو اسمُ الأصل الأقرب. "" = يُضبط هنا */
  _p44Lock(u, s, off) {
    if ("__plat" === u) return this._p44PlatSw(s.k) ? "" : "الإعداد الدائم";
    if ((off || this._p44PlatOff()).indexOf(s.k) !== -1) return "المنصة";
    const D = KIVO.BassamDepts,
      anc = this._p44Try(() => (D.ancestorsOf(u) || []).slice(), []);
    for (let i = anc.length - 1; i >= 0; i--) if (!this._p44On(anc[i], s, off)) return this._p44Try(() => D.nodeOf(anc[i]).name, "") || "الأصل";
    return "";
  },
  /* على المنصة كلها: يُطفأ ما يحمل platSwitch في البيان وحده (كما كانت «الوحدات») — وما سواه دائم */
  _p44PlatSw(k) {
    return this._p44Try(() => KIVO.KIVO_MANIFEST.clone("pages").some((p) => p.key === k && !0 === p.platSwitch && "toggle" === p.activation), !1);
  },
  /* سقفُ الوحدة دالةً للمحرّك: (مفتاحُ النظام) ⇒ مفعّلٌ؟ */
  _p44Ceil(did) {
    const off = this._p44PlatOff(),
      S = this._p44Sys();
    return (k) => {
      const s = S.filter((x) => x.k === k)[0];
      return !!s && this._p44On(did, s, off);
    };
  },
  /* سقفُ المفاتيح للمحرّك (compileRole · effective): ceiling(did).key — القاعدةُ نفسُها في الخادم (perm44CeilingFn) */
  _p44KeyCeil(did) {
    const C = this._p44Try(() => this._p44E().ceiling(did), null),
      on = this._p44Ceil(did);
    return (k) => {
      if (C && C.key && !C.key(k)) return !1;
      const ss = this._p44Try(() => this._p44E().sysOfKey(k), null);
      return !Array.isArray(ss) || !ss.length || ss.some((x) => on(x));
    };
  },
  _p44SupNow() {
    return this._p44Try(() => !!KIVO.BassamAuth.isSuper(), !1);
  },
  /* «شاهد الصفحة كـ»: مديرُ المنصة يختار؛ غيرُه يرى عرضَ مدير الإدارة وحده — وفي إعدادات الإدارة (#/admin/perm) عرضُ المدير دائماً */
  _p44Viewer() {
    return !this.__p44Dept && this._p44SupNow() && "mgr" !== this._p44S().viewer ? "plat" : "mgr";
  },
  /* V7 · د5-هـ (44 · المدير): من يرى «الصلاحيات» في إعدادات وحدةٍ did — قاعدةُ الخادم نفسُها (018 isMgrOf · secMgrOf):
     مديرُ المنصة · حسابُ الإدارة أو حاملُ شارة المدير في وحدته أو في قسمٍ من إدارته · المديرُ العام لوحدةٍ تحت عقدته — لا الموظفُ العادي.
     D: { parentDeptOf, ancestorsOf } من خدمة الهيكل */
  p44MgrOf(u, did) {
    return !!this._p44Try(() => this._p44E().mgrOf(u, did), !1);   /* V7 · د5-ح: القاعدةُ في المحرّك (KIVO.Perm44.mgrOf) — مصدرٌ واحد مع الرأس الثابت */
  },
  /* وحدةُ «الصلاحيات» في إعدادات الإدارة: الوحدةُ النشطة إن كان المستخدمُ مديرَها — وإلا "" (لا تبويب).
     V7 · د5-ح (القفل): لا وضعَ قديماً — المديرُ يقرأ سجلَّ المنح في كل بيئة، فيُفتح له التبويبُ بقاعدة isMgrOf وحدها */
  p44DeptUnit() {
    const D = KIVO.BassamDepts,
      did = this._p44Try(() => D.active(), "") || "",
      u = this._p44Try(() => KIVO.BassamAuth.user(), null);
    return this._p44E() && this.p44MgrOf(u, did, D) ? did : "";
  },
  /* قيمُ التبويب في نمط الإدارة (renderVals يستدعيها بعد كل الأقسام): on = التبويبُ المعروض «الصلاحيات» — عرضُ المدير بأقسامه الثلاثة لوحدته وحدها.
     وفي «مركز إدارة رشاد» تبقى الصفحةُ في صفحة العقدة كما هي: p44Show = تبويبُها مع عقدةٍ مختارة */
  p44Mount(v, dept, on) {
    if (!dept) return void (v.p44Show = !!(v.admOnDepts && v.orgNodeOn && v.deptDetailReady && v.onTabPerm));
    const did = on ? this.p44DeptUnit() : "";
    v.p44Show = !!did;
    if (!did) return;
    Object.assign(v, this._p44Vals(did, !1, null));
  },
  /* V7 · د5-ح: الأقسامُ الأربعة لكل ناظر — مديرُ الإدارة يرى «الأنظمة» قراءةً (المفعّلُ في سقفه وحده)، وافتراضيُّه «الأدوار» (عملُه) */
  _p44SubNow() {
    const s = this._p44S().sub;
    return ["systems", "roles", "people", "log"].indexOf(s) !== -1 ? s : "mgr" === this._p44Viewer() ? "roles" : "systems";
  },
  _p44Go(sub) {
    this._p44Set({ sub: sub, rev: null, exForm: null });
  },
  /* ── المسودة الواحدة: أدوارُ الإدارة وأشخاصُها (rolesOf) ── */
  _p44Doc(did) {
    const r = this._p44E().rolesOf(did);
    if (r == null) return { roles: [], people: {} };
    if (Array.isArray(r)) return { roles: JSON.parse(JSON.stringify(r)), people: {} };
    return { roles: JSON.parse(JSON.stringify(r.roles || [])), people: JSON.parse(JSON.stringify(r.people || {})) };
  },
  /* القراءةُ: rolesOf يقرأ ما حمّلته Operations — إن لم يُحمَّل بعد تُطلب قراءتُه مرةً (تحميلٌ · خطأٌ بزر «أعد المحاولة») */
  _p44Ensure(did) {
    const S = this._p44S();
    if (S.d && S.d.did === did) return S.d;
    if (S.ld && S.ld.did === did && "loading" === S.ld.st) return null;
    if (S.ld && S.ld.did === did && "error" === S.ld.st) return null;
    let doc = null;
    try {
      doc = this._p44Doc(did);
    } catch (e) {
      doc = null;
    }
    if (doc) {
      const d = { did: did, base: JSON.parse(JSON.stringify(doc)), roles: doc.roles, people: doc.people };
      this.state = { ...this.state, p44: Object.assign({}, S, { d: d, ld: { did: did, st: "ready" } }) };
      return d;
    }
    this.state = { ...this.state, p44: Object.assign({}, S, { ld: { did: did, st: "loading" } }) };
    setTimeout(() => this._p44Read(did), 0);
    return null;
  },
  /* V7 · د5-هـ (44): سجلُّ الأدوار في المخزن المتزامن (ليس موردَ Operations) — rolesOf يقرؤه؛ وهنا إعادةُ قراءته بعد تحديث المخزن */
  async _p44Read(did) {
    let d = null;
    try {
      const S = KIVO.__BS_SRV;
      S && S.resync && (await S.resync(!1));
      const doc = this._p44Doc(did);
      d = { did: did, base: JSON.parse(JSON.stringify(doc)), roles: doc.roles, people: doc.people };
    } catch (e) {
      d = null;
    }
    this._p44Set({ ld: { did: did, st: d ? "ready" : "error" }, d: d });
  },
  _p44Retry(did) {
    this._p44Set({ ld: null, d: null });
  },
  _p44Dirty(d) {
    return !!d && JSON.stringify({ r: d.roles, p: d.people }) !== JSON.stringify({ r: d.base.roles, p: d.base.people });
  },
  _p44Upd(fn) {
    this._p44Set((s) => {
      if (!s.d) return {};
      const d = JSON.parse(JSON.stringify(s.d));
      fn(d);
      return { d: d, rev: null };
    });
  },
  /* حاملو الأدوار المتغيّرة + من تغيّر سجلُّه ⇒ من يتأثر بالحفظ (مفاتيحُ الموظفين) */
  p44Affected(d) {
    const B = d.base,
      changed = {},
      out = [];
    const sig = (r) => JSON.stringify(r || null),
      rb = {};
    (B.roles || []).forEach((r) => (rb[r.id] = sig(r)));
    (d.roles || []).forEach((r) => rb[r.id] !== sig(r) && (changed[r.id] = 1));
    (B.roles || []).forEach((r) => !(d.roles || []).some((x) => x.id === r.id) && (changed[r.id] = 1));
    const all = Object.assign({}, B.people || {}, d.people || {});
    Object.keys(all).forEach((ek) => {
      const a = (B.people || {})[ek],
        b = (d.people || {})[ek];
      (sig(a) !== sig(b) || (b && changed[b.role]) || (a && changed[a.role])) && out.push(ek);
    });
    return out.sort();
  },
  /* V7 · د5-ح: سطرُ المتأثرين — «لا يتأثر أحد الآن» حين لا أحد، وإلا العددُ الفعلي بمطابقته (BassamCount) */
  p44AffLine(n, pre) {
    return n ? (pre || "يتأثر") + " " + KIVO.BassamCount(n, "شخص") : "لا يتأثر أحد الآن";
  },
  /* فرقُ المراجعة من المحرّك (diff) — مصفوفةٌ أو {changes, affected}؛ كلُّ تغييرٍ {what|sys|key|person, from, to} */
  _p44DiffOf(before, after) {
    const r = this._p44Try(() => this._p44E().diff(before, after), []);
    return Array.isArray(r) ? r : (r && r.changes) || [];
  },
  /* نصُّ القيمة في التغيير: مستوى · دور · سجلّ · مفعّل/مطفأ */
  _p44Txt(v) {
    if (v == null || "" === v) return "—";
    if (!0 === v) return "مفعّل";
    if (!1 === v) return "مطفأ";
    if ("string" === typeof v) return this.P44_LV()[v] ? this._p44LvName(v) : this._p44RoleName(v) || v;
    if (Array.isArray(v)) return v.length ? v.map((x) => (x && x.key ? this._p44Label(x.key) : "string" === typeof x ? this._p44Try(() => KIVO.BassamPerm.nameOf(x), "") || this._p44Txt(x) : this._p44Txt(x))).join("، ") : "—";
    if (v.lvl) return this._p44LvName(v.lvl) + (v.keys && "custom" === v.lvl ? " (" + v.keys.length + ")" : "");
    if (v.name) return v.name;
    if ("role" in v) return this._p44RoleName(v.role) || "بلا دور";
    return "—";
  },
  _p44RoleName(id) {
    const S = this._p44S(),
      r = ((S.d && S.d.roles) || []).filter((x) => x.id === id)[0];
    return r ? r.name : "";
  },
  /* اسمُ موضع التغيير بشكل فرق المحرّك (diff): what = role · name · desc · sup · sys (role, sys) · person · ex (person, key) —
     وفرقُ السقف من الخادم (perm44CeilDiff): what = ceil.caps · ceil.subs · ceil.lenses (unit) */
  _p44SysName(k) {
    return (this._p44Sys().filter((s) => s.k === k)[0] || { n: this._p44Try(() => KIVO.KIVO_REGISTRY.byKey[k].label, k) }).n;
  },
  /* V7 · د5-ح: صفوفُ عرض التغييرات (المراجعة والسجل) — إنشاءُ الدور أو حذفُه يُفصَّل بأنظمته ومستوياتها صفّاً لكل نظام
     (كان «دور جديد» وحده فلا يُعرف متى أُضيف نظامٌ له). عرضٌ وحده: التغييراتُ نفسُها (للتراجع) كما هي */
  p44Rows(ch) {
    const out = [];
    (ch || []).forEach((c) => {
      if (!c) return;
      out.push({ what: this._p44What(c), from: this._p44Txt(c.from), to: this._p44Txt(c.to) });
      const r = "role" === c.what ? c.to || c.from : null;
      if (!r || "object" !== typeof r) return;
      const mk = !!c.to,
        nm = this._p44RoleName(c.role) || r.name || "دور",
        S = r.sys && "object" === typeof r.sys ? r.sys : {},
        ks = Object.keys(S);
      ks.forEach((k) => out.push({ what: nm + " · " + this._p44SysName(k), from: mk ? "—" : this._p44Txt(S[k]), to: mk ? this._p44Txt(S[k]) : "—" }));
      mk && !ks.length && out.push({ what: nm + " · الأنظمة", from: "—", to: "بلا أنظمة" });
      r.sup && out.push({ what: nm + " · إشرافي", from: mk ? "—" : "نعم", to: mk ? "نعم" : "—" });
    });
    return out;
  },
  _p44What(c) {
    const w = String(c.what || ""),
      sysN = (k) => this._p44SysName(k),
      rn = (id) => this._p44RoleName(id) || (c.to && c.to.name) || (c.from && c.from.name) || "دور",
      un = (id) => this._p44Try(() => KIVO.BassamDepts.nodeOf(id).name, "") || id || "";
    if ("sys" === w) return rn(c.role) + " · " + sysN(c.sys);
    if ("name" === w || "desc" === w || "sup" === w) return rn(c.role) + " · " + { name: "الاسم", desc: "الوصف", sup: "إشرافي" }[w];
    if ("role" === w) return (c.to ? (c.from ? "" : "دور جديد · ") : "حذف دور · ") + rn(c.role);
    if ("person" === w) return this._p44PName(c.person) + " · الدور";
    if ("ex" === w) return this._p44PName(c.person) + " · استثناء " + this._p44Label(c.key);
    if (/^ceil\./.test(w)) return (un(c.unit) ? un(c.unit) + " · " : "") + ({ "ceil.caps": "الأنظمة", "ceil.subs": "الصفحات الفرعية", "ceil.lenses": "العدسات" }[w] || "السقف");
    if (c.sys) return sysN(c.sys);
    if (c.person) return this._p44PName(c.person);
    if (c.key) return this._p44Label(c.key);
    return w || "—";
  },
  _p44Users() {
    return this._p44Try(() => KIVO.BassamAuth.users() || [], []);
  },
  _p44PName(ek) {
    const u = this._p44Users().filter((x) => x.ekey === ek)[0];
    return u ? u.name || u.un : ek;
  },
  _p44Label(k) {
    return this._p44Try(() => KIVO.KIVO_REGISTRY.byKey[k].label, "") || k;
  },
  _p44Keys(sk) {
    const E = this._p44E(),
      all = this._p44Try(() => E.keysFor(sk, "sensitive"), []);
    return Array.isArray(all) ? all : [];
  },
  _p44Compile(role, did) {
    const r = this._p44Try(() => this._p44E().compileRole(role, this._p44KeyCeil(did)), []);
    return Array.isArray(r) ? r : (r && (r.keys || r.plus)) || [];
  },
  /* مفاتيحُ الشخص الفعّالة الآن: (الدور ∪ الاستثناءاتُ السارية) ∩ السقف — effective */
  _p44Eff(rec, roles, did, now) {
    const r = this._p44Try(() => this._p44E().effective(rec, { roles: roles || [], people: {} }, this._p44KeyCeil(did), now), []);
    return Array.isArray(r) ? r : r instanceof Set ? Array.from(r) : (r && (r.keys || r.plus)) || [];
  },
  /* القائمةُ الجانبية لحامل المفاتيح: «صفحتي» ثم كلُّ نظامٍ مفعّلٍ في السقف له منها مفتاح — بمستوى الدور فيه */
  _p44Menu(keys, role, did, extra) {
    const on = this._p44Ceil(did),
      set = new Set(keys || []),
      out = [{ n: "صفحتي", l: "" }];
    this._p44Sys().forEach((s) => {
      if (!on(s.k)) return;
      const ks = this._p44Keys(s.k),
        n = ks.length ? ks.filter((k) => set.has(k)).length : 0,
        lv = role && role.sys && role.sys[s.k] ? this._p44LvName(role.sys[s.k].lvl) : "";
      n && out.push({ n: s.n, l: lv || (extra ? "استثناء" : "") });
    });
    return out;
  },
  /* ── الأقسام ── */
  _p44Vals(did, isNode, node) {
    const E = this._p44E(),
      sup = this._p44SupNow(),
      viewer = this._p44Viewer(),
      sub = this._p44SubNow(),
      mgrV = "mgr" === viewer,
      S = this._p44S();
    const v = {
      p44MgrV: mgrV,
      p44ViewOn: sup && !this.__p44Dept,
      p44Viewers: [
        ["plat", "مدير المنصة"],
        ["mgr", "مدير الإدارة"],
      ].map((x) => ({ t: x[1], on: x[0] === viewer ? "true" : "false", pick: () => this._p44Set({ viewer: x[0], sel: "plat" === x[0] ? S.sel : "__super" === S.sel ? "" : S.sel, rev: null }) })),
      p44Subs: [["systems", "الأنظمة"], ["roles", "الأدوار"], ["people", "الأشخاص"], ["log", "السجل"]].map((x) => ({
        t: x[1],
        cur: x[0] === sub ? "page" : "false",
        on: x[0] === sub,
        go: () => this._p44Go(x[0]),
      })),
      p44OnSys: "systems" === sub,
      p44OnRoles: "roles" === sub,
      p44OnPeople: "people" === sub,
      p44OnLog: "log" === sub,
      p44Head: { systems: "الأنظمة", roles: "الأدوار", people: "الأشخاص", log: "السجل" }[sub],
      p44Lead: {
        systems: mgrV ? "الأنظمة المفعّلة لإدارتك — يضبطها مدير المنصة، وما لا يظهر هنا غير متاح لإدارتك." : "ما تطفئه في مستوى يختفي من كل ما تحته، ولا يراه مديرها أصلاً.",
        roles: "ابنِ الدور مرة واحدة وأسنده لمن تريد. ما تراه هنا هو ما يقبله الخادم.",
        people: "لكل شخص دور واحد. الاستثناء نادر، ويظهر بوضوح حتى لا يُنسى.",
        log: "كل تغيير: من غيّر، ماذا تغيّر، ومن تأثّر — مع رجوع بضغطة.",
      }[sub],
      p44NoEng: !E,
      p44Keep: (ev) => {
        try {
          ev.stopPropagation();
        } catch (e) {}
      },
    };
    if (!E) return v;
    if ("systems" === sub) return Object.assign(v, this._p44SysVals(did, mgrV));
    if ("log" === sub) return Object.assign(v, this._p44LogVals(did));
    /* V7 · د5-ح: العقدةُ الإشرافية (قطاع · إدارة عامة) تحمل الأقسامَ الأربعة كالإدارة والقسم: أدوارُها البطاقتان الثابتتان
       (مدير المنصة · مدير الوحدة) — والأدوارُ المخصّصة تُبنى في كل إدارة أو قسم تحتها — وأشخاصُها حساباتُ فرعها */
    if (isNode) return Object.assign(v, "roles" === sub ? this._p44RoleVals(did, { did: did, base: { roles: [], people: {} }, roles: [], people: {} }, mgrV, !0) : this._p44NodePeopleVals(did));
    const d = this._p44Ensure(did),
      L = this._p44S().ld;
    if (!d) return Object.assign(v, { p44Loading: !L || "error" !== L.st, p44Err: !!L && "error" === L.st, p44Retry: () => this._p44Retry(did) });
    const dirty = this._p44Dirty(d),
      aff = dirty ? this.p44Affected(d) : [];
    Object.assign(v, {
      p44Dirty: dirty,
      p44DirtyTxt: dirty ? KIVO.BassamCount(this._p44DiffOf(d.base, { roles: d.roles, people: d.people }).length || 1, "تغيير|غير محفوظ") : "",
      p44AffTxt: this.p44AffLine(aff.length, "يتأثر بها"),
      p44Undo: () => this._p44Upd((x) => ((x.roles = x.base.roles), (x.people = x.base.people))),
      p44Review: () => this._p44Set({ rev: { open: 1 } }),
      ...this._p44RevVals(d, aff),
    });
    return Object.assign(v, "roles" === sub ? this._p44RoleVals(did, d, mgrV, !1) : this._p44PeopleVals(did, d));
  },
  /* V7 · د5-ح: فتحُ قسمٍ من «الصلاحيات» لوحدةٍ أخرى بعنوانها (#/sysadmin/org/<id>/perm/<قسم>) — العنوانُ المنتظَر يُحترم حتى تُفتح (كما _orgNav) */
  p44Open(unit, sub, extra) {
    if (!unit) return;
    this.state = { ...this.state, p44: Object.assign({}, this.state.p44 || {}, { sub: sub, rev: null, exForm: null }, extra || {}) };
    try {
      const h = "#/sysadmin/org/" + encodeURIComponent(unit) + "/perm/" + sub;
      this.__orgPend = h;
      String(location.hash || "") === h ? this.setState({ tick: (this.state.tick || 0) + 1 }) : (location.hash = h);
    } catch (e) {}
  },
  /* حاملو «مدير الوحدة»: مديرو الإدارة أو القسم (deptManagers) · ومديرو العقدة العامّون (groupManagers) */
  _p44Mgrs(did, isNode) {
    const A = KIVO.BassamAuth || {};
    return this._p44Try(() => (isNode ? A.groupManagers(did) : A.deptManagers(did)) || [], []);
  },
  /* ③ أشخاصُ العقدة الإشرافية: حساباتُ فرعها كلُّها (المديرون العامّون بعقدتهم · وغيرُهم بإدارته أو قسمه) — يُفتح كلٌّ في «الأشخاص» لوحدته */
  _p44NodePeopleVals(did) {
    const D = KIVO.BassamDepts,
      S = this._p44S(),
      X = this._acctCtx ? this._p44Try(() => this._acctCtx(), { l: {}, now: Date.now() }) : { l: {}, now: Date.now() },
      ids = { [did]: 1 },
      q = String(S.q || "").trim();
    this._p44Try(() => (D.descendantsOf ? D.descendantsOf(did) : D.deptsUnder(did)) || [], []).forEach((x) => (ids["string" === typeof x ? x : x && x.id] = 1));
    const unitOf = (u) => ("gm" === u.role ? u.gid : u.deptId) || "",
      all = this._p44Users().filter((u) => u && "super" !== u.role && !!ids[unitOf(u)]),
      shown = all.filter((u) => !q || (String(u.name || "") + " " + (u.un || "") + " " + (u.empno || u.no || "")).indexOf(q) !== -1);
    return {
      p44NodePeople: !0,
      p44PQ: S.q || "",
      p44PQSet: (ev) => this._p44Set({ q: String((ev && ev.target && ev.target.value) || "") }),
      p44NPRows: shown.map((u) => {
        const un = unitOf(u),
          gm = "gm" === u.role;
        return {
          n: u.name || u.un,
          id: u.empno || u.no || u.un || "",
          i: String(u.name || "؟").trim().charAt(0) || "؟",
          role: gm || u.mgr ? "مدير الوحدة" : (this.adRole && this._p44Try(() => this.adRole(u), "")) || "—",
          unit: (this.adUnit && this._p44Try(() => this.adUnit(u), "")) || this._p44Try(() => D.nodeOf(un).name, "") || "—",
          last: X.l[u.id] && this.adWhen ? this.adWhen(X.l[u.id], X.now) : "لم يدخل",
          go: () => (gm || u.mgr ? this.p44Open(un, "roles", { sel: "__mgr" }) : this.p44Open(un, "people", { pSel: u.ekey || "" })),
        };
      }),
      p44NPEmpty: !shown.length,
      p44NPEmptyTxt: all.length ? "لا أحد يطابق البحث" : "لا حسابات في هذا الفرع بعد",
      p44NPFoot: KIVO.BassamCount(all.length, "حساب") + " في العقدة وفرعها — يُضبط دورُ كلٍّ منهم في «الأشخاص» لوحدته",
    };
  },
  /* ① الأنظمة: وحداتُ السلسلة (المنصة ← الأصول ← الوحدة ← أقسامها) · مفتاحٌ لكل نظام · ما يراه المدير · أثرُ الحفظ */
  _p44SysVals(did, mgrV) {
    if (mgrV) return this._p44SysRO(did);
    const D = KIVO.BassamDepts,
      S = this._p44S(),
      anc = this._p44Try(() => (D.ancestorsOf(did) || []).slice(), []),
      kids = this._p44Try(() => (D.childrenOf(did) || []).map((k) => k.id), []),
      chain = ["__plat"].concat(anc, [did], kids),
      u = chain.indexOf(S.unit) !== -1 ? S.unit : did,
      nm = (id) => ("__plat" === id ? "المنصة كلها" : this._p44Try(() => D.nodeOf(id).name, "") || "—"),
      kind = (id) => ("__plat" === id ? "المنصة" : this._p44Try(() => D.nodeOf(id).kind, "") || (this._p44Try(() => D.isSection(id), !1) ? "قسم" : "إدارة")),
      off = this._p44PlatOff(),
      sys = this._p44Sys().filter((s) => s.tg),   /* ما يُشغَّل ويُطفأ وحده (toggle) — الدائمُ لا مفتاحَ له */
      dr = S.cap && S.cap.unit === u ? S.cap.on : {},
      depth = (id) => ("__plat" === id ? 0 : Math.min(4, anc.indexOf(id) !== -1 ? anc.indexOf(id) + 1 : id === did ? anc.length + 1 : anc.length + 2));
    const units = chain.map((id) => ({ n: nm(id), t: kind(id), on: id === u ? "true" : "false", dp: String(depth(id)), pick: () => this._p44Set({ unit: id, cap: null }) }));
    const nav = ["صفحتي"],
      rows = sys.map((s) => {
        const by = this._p44Lock(u, s, off),
          was = !by && this._p44On(u, s, off),
          on = by ? !1 : s.k in dr ? !!dr[s.k] : was;
        on && nav.push(s.n);
        return {
          k: s.k,
          n: s.n,
          on: on ? "true" : "false",
          isOn: on,
          locked: !!by,
          by: by,
          sub: by ? "مطفأ من " + by + " — لا يُفعَّل هنا" : on ? (was ? "مفعّل" : "سيُفعَّل عند الحفظ") : was ? "سيُطفأ عند الحفظ" : "مطفأ — لا يظهر لهذه الوحدة",
          flip: () => {
            if (by) return;
            this._p44Set((st) => {
              const c = st.cap && st.cap.unit === u ? Object.assign({}, st.cap.on) : {};
              (c[s.k] = !on), c[s.k] === was && delete c[s.k];
              return { cap: { unit: u, on: c } };
            });
          },
        };
      }),
      dirtyN = Object.keys(dr).length,
      people = "__plat" === u ? this._p44Users().filter((x) => "super" !== x.role).length : this._p44Users().filter((x) => x.deptId === u || this._p44Try(() => (D.ancestorsOf(x.deptId) || []).indexOf(u) !== -1, !1)).length;
    return {
      p44Units: units,
      p44Unit: {
        n: nm(u),
        path: chain.slice(0, chain.indexOf(u)).map(nm).join(" / ") || "أعلى الهيكل",
        inh: "__plat" === u ? "المنصة كلها: النظام المطفأ هنا يختفي من كل الإدارات ومن الأدوار ومن القوائم." : "يتبع ما فوقه: ما أُطفئ هناك يظهر مقفلاً هنا ولا يُفعَّل.",
      },
      p44SysCtl: !0,
      p44SysRows: rows.map((r) => Object.assign(r, { sw: !0 })),
      p44SysNone: !rows.length,
      p44SysNoneTxt: "لا أنظمة قابلة للتشغيل في هذه المنصة.",
      p44SysNav: nav,
      p44SysNavT: "ما يراه مدير هذه الإدارة",
      p44SysOnN: String(rows.filter((r) => r.isOn).length),
      p44SysPeople: String(people),
      p44SysDirty: dirtyN > 0,
      p44SysDirtyTxt: KIVO.BassamCount(dirtyN, "تغيير|غير محفوظ"),
      p44SysUndo: () => this._p44Set({ cap: null, rev: null }),
      /* V7 · د5-ح: «مراجعة وحفظ» تفتح نافذةَ المراجعة (الملخّص · «حفظ» · «رجوع») — والحفظُ منها بمساره القائم */
      p44SysReview: () => this._p44Set({ rev: { open: 1, kind: "sys" } }),
      ...this._p44SysRevVals(u, dr, nm(u), people),
    };
  },
  /* V7 · د5-ح: «الأنظمة» لمدير الإدارة قراءةً — المفعّلُ في سقف وحدته وحده (السقفُ بالوراثة ∩ المنصة)، بلا مفاتيح ولا شريط حفظ؛
     والمطفأُ لا يظهر له أبداً (لا صفّاً ولا قفلاً ولا اسماً) */
  _p44SysRO(did) {
    const D = KIVO.BassamDepts,
      off = this._p44PlatOff(),
      rows = this._p44Sys()
        .filter((s) => s.tg && this._p44On(did, s, off))
        .map((s) => ({ k: s.k, n: s.n, on: "true", isOn: !0, locked: !1, by: "", sw: !1, sub: "مفعّل لإدارتك", flip: () => {} })),
      people = this._p44Users().filter((x) => x.deptId === did || this._p44Try(() => (D.ancestorsOf(x.deptId) || []).indexOf(did) !== -1, !1)).length;
    return {
      p44SysRO: !0,
      p44SysCtl: !1,
      p44Units: [],
      p44Unit: { n: this._p44Try(() => D.nodeOf(did).name, "") || "—", path: "إدارتك", inh: "يضبط الأنظمةَ مدير المنصة — ما يظهر هنا وحده متاحٌ لإدارتك ولأدوار موظفيها." },
      p44SysRows: rows,
      p44SysNone: !rows.length,
      p44SysNoneTxt: "لا نظام مفعّل لإدارتك بعد — يفعّله مدير المنصة.",
      p44SysNav: ["صفحتي"].concat(rows.map((r) => r.n)),
      p44SysNavT: "قائمة إدارتك",
      p44SysOnN: String(rows.length),
      p44SysPeople: String(people),
      p44SysDirty: !1,
      p44RevOn: !1,
    };
  },
  /* مراجعةُ الأنظمة: لكل نظامٍ تغيّر «الوحدة · النظام: مفعّل ← مطفأ» ومن يتأثر (من في الوحدة وما تحتها) */
  _p44SysRevVals(u, dr, unitName, people) {
    const R = this._p44S().rev,
      ks = Object.keys(dr || {});
    if (!R || !R.open || "sys" !== R.kind || !ks.length) return { p44RevOn: !1 };
    return {
      p44RevOn: !0,
      p44RevRows: ks.map((k) => ({ what: unitName + " · " + this._p44SysName(k), from: dr[k] ? "مطفأ" : "مفعّل", to: dr[k] ? "مفعّل" : "مطفأ" })),
      p44RevAff: [],
      p44RevAffTxt: this.p44AffLine(people) + (people ? " في هذه الوحدة وما تحتها" : ""),
      p44RevNote: "إطفاء نظام لا يحذف بياناته: تبقى محفوظة وتعود كما هي عند التفعيل.",
      p44RevBusy: !1,
      p44RevErr: R.err || "",
      p44RevClose: () => this._p44Set({ rev: null }),
      p44RevOut: () => this._p44Set({ rev: null }),
      p44RevSave: () => this._p44CapSave(u, dr),
    };
  },
  /* حفظُ السقف بمساره القائم (مسؤولُ المنصة وحده — 331 setDeptCap يرفض غيرَه): التفعيلُ يضيف الصفحةَ بتبويباتها وصفحاتها، والإطفاءُ يزيلها
     ويزيل صفحاتِها التابعة — والبياناتُ وأوراقُ الموظفين باقيةٌ كما هي (تُقرأ مقصوصةً بالسقف) فتعود عند التفعيل */
  _p44CapSave(u, dr) {
    const P = KIVO.BassamPerm,
      keys = Object.keys(dr || {});
    if (!keys.length) return;
    let r = { ok: !0 };
    try {
      if ("__plat" === u) {
        const pl = KIVO.BassamPlat.get(),
          o = (pl.mods.off || []).slice();
        keys.forEach((k) => {
          const i = o.indexOf(k);
          dr[k] ? i !== -1 && o.splice(i, 1) : i === -1 && o.push(k);
        });
        r = KIVO.BassamPlat.set(Object.assign({}, pl, { mods: Object.assign({}, pl.mods, { off: o }) }));
      } else {
        const sys = this._p44Sys(),
          reg = this._pages ? this._pages() : [],
          cap = (P.hasCap(u) ? P.rawCap(u) : P.deptCap(u)).slice();
        keys.forEach((k) => {
          const s = sys.filter((x) => x.k === k)[0] || { cap: k },
            pk = s.cap,
            sl = pk.indexOf("/"),
            pg = reg.filter((p) => p.key === pk)[0] || {};
          if (sl > 0) {
            const host = pk.slice(0, sl),
              leaf = pk.slice(sl + 1),
              cur = (P.deptSubs(u, host) || []).filter((x) => x !== leaf);
            dr[k] && (cap.indexOf(host) === -1 && cap.push(host), cur.push(leaf));
            r.ok && (r = P.setDeptSubs(u, host, cur) || r);
            return;
          }
          if (dr[k]) {
            cap.indexOf(pk) === -1 && cap.push(pk);
            pg.under && cap.indexOf(pg.under) === -1 && cap.push(pg.under);
            /* V7 · د5-هـ (44 · التوحيد): التشغيلُ عكسُ الإطفاء — الإطفاءُ يُسقط صفحاتِه التابعة، فالتشغيلُ يعيدها (إطفاءٌ ثم تشغيل = كما كان) */
            reg.filter((p) => p.under === pk).forEach((p) => cap.indexOf(p.key) === -1 && cap.push(p.key));
            (pg.subs || []).length && P.setDeptSubs(u, pk, pg.subs.map((x) => x.key));
            (pg.tabs || []).length && P.setDeptTabs && P.setDeptTabs(u, pk, pg.tabs.map((x) => x.key));
          } else {
            const drop = [pk].concat(reg.filter((p) => p.under === pk).map((p) => p.key));
            for (let i = cap.length - 1; i >= 0; i--) drop.indexOf(cap[i]) !== -1 && cap.splice(i, 1);
          }
        });
        r.ok && (r = P.setDeptCap(u, cap) || r);
      }
    } catch (e) {
      r = { ok: !1, err: "تعذّر حفظ الأنظمة" };
    }
    /* V7 · د5-ح: الرفضُ يبقى في نافذة المراجعة بسببه (المسودةُ كما هي) · والنجاحُ يغلقها */
    if (r && !1 === r.ok) return void this._p44Set({ rev: { open: 1, kind: "sys", err: r.err || "لم يُحفظ" } });
    this._p44Set({ cap: null, rev: null });
    this.bsToast("حُفظت أنظمة «" + ("__plat" === u ? "المنصة كلها" : this._p44Try(() => KIVO.BassamDepts.nodeOf(u).name, "")) + "» — البيانات باقية كما هي", "ok");
  },
  /* ② الأدوار */
  _p44RoleVals(did, d, mgrV, isNode) {
    const S = this._p44S(),
      on = this._p44Ceil(did),
      sys = this._p44Sys().filter((s) => on(s.k)) /* مديرُ الإدارة لا يرى نظاماً مطفأً في سقفه — ولا مديرُ المنصة في محرّر دورٍ لهذه الإدارة */,
      holders = (id) => Object.keys(d.people || {}).filter((ek) => (d.people[ek] || {}).role === id).length,
      mgrs = this._p44Mgrs(did, isNode),
      sel = "__super" === S.sel && !mgrV ? "__super" : "__mgr" === S.sel ? "__mgr" : (d.roles.filter((r) => r.id === S.sel)[0] || d.roles[0] || { id: isNode ? "__mgr" : mgrV ? "" : "__super" }).id,
      isSup = "__super" === sel,
      isMgr = "__mgr" === sel,
      role = isSup || isMgr ? null : d.roles.filter((r) => r.id === sel)[0] || null,
      /* V7 · د5-ح: بطاقةٌ ثابتة «مدير الوحدة» (مثل «مدير المنصة») بحامليها — حلّت محلَّ تبويب العقدة القديم للمسؤولين والحسابات */
      list = (mgrV ? [] : [{ id: "__super", name: "مدير المنصة", sub: "صلاحية كاملة · بلا قيد", lock: !0 }])
        .concat([{ id: "__mgr", name: "مدير الوحدة", sub: (mgrs.length ? KIVO.BassamCount(mgrs.length, "شخص") : "بلا حاملين") + " · كامل داخل السقف", lock: !0 }])
        .concat(d.roles.map((r) => ({ id: r.id, name: r.name || "بلا اسم", sub: (holders(r.id) ? KIVO.BassamCount(holders(r.id), "شخص") : "بلا حاملين") + (r.sup ? " · إشرافي" : "") })));
    const v = {
      p44RoleList: list.map((r) => ({ n: r.name, sub: r.sub, lock: !!r.lock, on: r.id === sel ? "true" : "false", pick: () => this._p44Set({ sel: r.id, cmp: "", chk: null }) })),
      p44RoleN: String(list.length),
      p44RoleNew: () => this._p44NewRole(null),
      p44RoleNewOn: !isNode,
      p44NodeRoles: !!isNode,
      p44NodeUnits: isNode
        ? this._p44Try(() => KIVO.BassamDepts.deptsUnder(did) || [], []).map((id) => ({
            n: this._p44Try(() => KIVO.BassamDepts.nodeOf(id).name, "") || id,
            href: "#/sysadmin/org/" + encodeURIComponent(id) + "/perm/roles",
            go: (ev) => {
              ev && ev.preventDefault && ev.preventDefault();
              this.p44Open(id, "roles", { sel: "" });
            },
          }))
        : [],
      p44IsSup: isSup,
      p44IsMgr: isMgr,
      p44NotSup: !isSup && !isMgr && !!role,
      p44NoRole: !isSup && !isMgr && !role,
      p44Lvls: this._p44Lvls(),
    };
    if (isSup) return Object.assign(v, { p44Role: { n: "مدير المنصة", d: "صاحب المنصة: لا قيد عليه في أي نظام أو إدارة.", badge: "دور النظام" }, p44Nav: [{ n: "كل الأنظمة", l: "بلا قيد" }] });
    /* «مدير الوحدة»: في «مركز إدارة رشاد» جدولُ حسابات الوحدة كما كان (الصفُّ وقائمةُ أفعاله الواحدة _acctRow: اسمُ الدخول · الكلمة المؤقتة بعد إقرار الخادم ·
       التجميد · إعادة التعيين) وزرُّ «+» لمدير المنصة وحده؛ وفي عرض المدير حاملوه قراءةً */
    if (isMgr)
      return Object.assign(v, {
        p44Role: { n: "مدير الوحدة", d: "يعمل بكامل سقف وحدته ويعتمد جداولها وتقاريرها — يعيّنه مدير المنصة وحده.", badge: "دور النظام", members: mgrs.length ? KIVO.BassamCount(mgrs.length, "شخص") + " " + KIVO.BassamCount.agr(mgrs.length, "يحمل", "يحملان", "يحملون") + " هذا الدور" : "لا يحمل هذا الدور أحد بعد" },
        p44Nav: [{ n: "كل الأنظمة المفعّلة لوحدته", l: "كامل داخل السقف" }],
        p44MgrFull: !mgrV && !this.__p44Dept,
        p44MgrRO: mgrV || !!this.__p44Dept,
        p44MgrAddOn: this._p44SupNow() && !mgrV,
        p44MgrHold: mgrs.map((m) => ({ n: m.name || m.un || "—", st: m.dis ? "موقوف" : "نشط" })),
        p44MgrNone: !mgrs.length,
      });
    if (!role) return Object.assign(v, { p44Nav: [{ n: "صفحتي", l: "" }] });   /* بلا دورٍ مختار: لا يرى إلا «صفحتي» */
    const keysAll = (k) => this._p44Keys(k),
      upd = (fn) =>
        this._p44Upd((x) => {
          const r = x.roles.filter((y) => y.id === role.id)[0];
          r && fn(r);
        });
    const rows = sys.map((s) => {
      const g = (role.sys || {})[s.k],
        isOn = !!g,
        lv = g ? g.lvl : "",
        open = isOn && "custom" === lv;
      return {
        k: s.k,
        n: s.n,
        isOn: isOn,
        onTxt: isOn ? "true" : "false",
        lv: lv || "view",
        sub: isOn ? this._p44LvName(lv) + ("custom" === lv ? " · " + KIVO.BassamCount((g.keys || []).length, ["فعل واحد", "فعلان", "فعلين", "أفعال", "فعلاً", "فعل"]) : "") : "غير مفعّل لهذا الدور",
        flip: () => upd((r) => ((r.sys = r.sys || {}), r.sys[s.k] ? delete r.sys[s.k] : (r.sys[s.k] = { lvl: "view" }))),
        setLv: (ev) => {
          const n = String((ev && ev.target && ev.target.value) || "view");
          upd((r) => {
            const was = (r.sys || {})[s.k] || {};
            r.sys = r.sys || {};
            /* «مخصّص» يبدأ من مفاتيح المستوى السابق — فلا يتغيّر شيءٌ حتى يُختار */
            r.sys[s.k] = "custom" === n ? { lvl: "custom", keys: was.keys || this._p44Try(() => this._p44E().keysFor(s.k, was.lvl || "view"), []) || [] } : { lvl: n };
          });
        },
        custom: open,
        keys: open
          ? keysAll(s.k).map((k) => {
              const has = (g.keys || []).indexOf(k) !== -1;
              return {
                n: this._p44Label(k),
                sens: this._p44Try(() => !!KIVO.KIVO_REGISTRY.byKey[k].sensitive, !1),
                on: has ? "true" : "false",
                flip: () => upd((r) => ((r.sys[s.k].keys = has ? r.sys[s.k].keys.filter((x) => x !== k) : (r.sys[s.k].keys || []).concat([k])))),
              };
            })
          : [],
      };
    });
    const comp = this._p44Compile(role, did),
      cmpId = S.cmp && d.roles.some((r) => r.id === S.cmp && r.id !== role.id) ? S.cmp : "",
      cmp = cmpId ? d.roles.filter((r) => r.id === cmpId)[0] : null,
      chk = S.chk || {},
      chkKeys = [].concat.apply(
        [],
        sys.map((s) => keysAll(s.k).map((k) => ({ v: k, t: s.n + " · " + this._p44Label(k) }))),
      ),
      ck = chk.key && chkKeys.some((x) => x.v === chk.key) ? chk.key : (chkKeys[0] || {}).v || "";
    return Object.assign(v, {
      p44Role: { n: role.name || "بلا اسم", d: role.desc || "", badge: role.sup ? "دور إشرافي" : "دور", members: holders(role.id) ? KIVO.BassamCount(holders(role.id), "شخص") + " " + KIVO.BassamCount.agr(holders(role.id), "يحمل", "يحملان", "يحملون") + " هذا الدور" : "لا يحمل هذا الدور أحد بعد" },
      p44RoleName: role.name || "",
      p44RoleNameSet: (ev) => upd((r) => (r.name = String((ev && ev.target && ev.target.value) || "").slice(0, 60))),
      p44RoleDesc: role.desc || "",
      p44RoleDescSet: (ev) => upd((r) => (r.desc = String((ev && ev.target && ev.target.value) || "").slice(0, 200))),
      p44RoleSup: role.sup ? "true" : "false",
      p44RoleSupFlip: () => upd((r) => (r.sup ? delete r.sup : (r.sup = !0))),
      p44RoleCopy: () => this._p44NewRole(role),
      p44RoleDel: () => this._p44DelRole(role, holders(role.id)),
      p44SysEd: rows,
      p44SysEdNone: !rows.length,
      p44OnN: String(rows.filter((r) => r.isOn).length),
      p44AllN: String(rows.length),
      p44AllOn: () => upd((r) => ((r.sys = r.sys || {}), sys.forEach((s) => r.sys[s.k] || (r.sys[s.k] = { lvl: "view" })))),
      p44AllOff: () => upd((r) => (r.sys = {})),
      p44Nav: this._p44Menu(comp, role, did),
      p44CmpOpts: [{ v: "", t: "— اختر دوراً —" }].concat(d.roles.filter((r) => r.id !== role.id).map((r) => ({ v: r.id, t: r.name || "بلا اسم" }))),
      p44CmpVal: cmpId,
      p44CmpSet: (ev) => this._p44Set({ cmp: String((ev && ev.target && ev.target.value) || "") }),
      p44CmpOn: !!cmp,
      p44CmpName: cmp ? cmp.name : "",
      p44CmpRows: cmp ? this.p44Compare(role, cmp, sys) : [],
      p44ChkKeys: chkKeys,
      p44ChkKey: ck,
      p44ChkSet: (ev) => this._p44Set({ chk: { key: String((ev && ev.target && ev.target.value) || "") } }),
      p44ChkLocal: ck ? (comp.indexOf(ck) !== -1 ? "المعاينة: مسموح بهذا الدور كما هو الآن" : "المعاينة: غير مسموح بهذا الدور كما هو الآن") : "",
      p44ChkRun: () => this._p44Check(did, role.id, ck),
      p44ChkBusy: !!chk.busy,
      p44ChkHas: !!chk.res,
      p44ChkRes: chk.res || {},
      p44ChkNote: this._p44Dirty(d) ? "الخادم يجيب عن الدور المحفوظ — احفظ تعديلك ليُختبر" : "",
    });
  },
  /* قارن مع دور آخر: مستوى كلِّ نظامٍ مفعّلٍ في السقف عند الدورين، والمختلفُ معلَّم */
  p44Compare(a, b, sys) {
    const lv = (r, k) => ((r.sys || {})[k] ? this._p44LvName(r.sys[k].lvl) : "—");
    return sys.map((s) => ({ n: s.n, a: lv(a, s.k), b: lv(b, s.k), diff: lv(a, s.k) !== lv(b, s.k) ? "true" : "false" }));
  },
  _p44NewRole(from) {
    const id = "r" + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
    this._p44Upd((x) => {
      const r = from ? JSON.parse(JSON.stringify(from)) : { name: "دور جديد", desc: "", sys: {} };
      r.id = id;
      from && (r.name = "نسخة من " + (from.name || "دور"));
      x.roles.push(r);
    });
    this._p44Set({ sel: id, cmp: "", chk: null });
  },
  _p44DelRole(role, n) {
    if (n) return void this.bsToast("يحمل هذا الدورَ " + KIVO.BassamCount(n, "شخص") + " — انقلهم إلى دورٍ آخر أولاً", "warn");
    this._p44Upd((x) => (x.roles = x.roles.filter((r) => r.id !== role.id)));
    this._p44Set({ sel: "" });
  },
  /* اختبارُ الوصول: الجوابُ من الخادم بقاعدة القرار نفسِها (GET /api/perm44/check) — والمعاينةُ المحلية تُعرض بجانبه */
  async _p44Check(did, rid, key) {
    if (!key) return;
    this._p44Set({ chk: { key: key, busy: 1 } });
    let res = null;
    try {
      const r = await fetch("/api/perm44/check?d=" + encodeURIComponent(did) + "&role=" + encodeURIComponent(rid) + "&key=" + encodeURIComponent(key), { credentials: "same-origin", cache: "no-store" }),
        j = await r.json();
      if (!r.ok || !j || "boolean" !== typeof j.allow) throw Error("bad");
      /* أسبابُ الخادم (perm44Decide) بالعربية */
      const W = { role: "مسموح بمستوى الدور", exception: "مسموح باستثناء مؤقت", super: "مدير المنصة — بلا قيد", self: "متاح لكل صاحب حساب", level: "مستوى الدور لا يشمله", ceiling: "النظام مطفأ في سقف هذه الوحدة", "no-role": "لا دور بهذا المعرّف أو لا دور للشخص", mgr: "لمدير الإدارة وحده", "role-only": "يُمنح بالمنصب لا بالدور", "not-grantable": "لا يُمنح بالأدوار", "unknown-key": "فعلٌ غير معروف", reserved: "فعلٌ محجوز" };
      res = { ok: j.allow, mark: j.allow ? "✓" : "✕", cls: j.allow ? "ok" : "no", q: this._p44Label(key), why: W[j.why] || String(j.why || (j.allow ? "مسموح" : "غير مسموح")) };
    } catch (e) {
      res = { ok: !1, mark: "!", cls: "err", q: this._p44Label(key), why: "تعذّر سؤال الخادم — أعد المحاولة" };
    }
    this._p44Set({ chk: { key: key, res: res } });
  },
  /* المراجعة قبل الحفظ: الفرقُ (diff) ومن يتأثر — ثم حفظٌ واحد */
  _p44RevVals(d, aff) {
    const R = this._p44S().rev;
    if (!R || !R.open || "sys" === R.kind) return { p44RevOn: !1 };
    const ch = this._p44DiffOf(d.base, { roles: d.roles, people: d.people });
    /* V7 · د5-ح: نافذةٌ في وسط الشاشة (bs-dlg: التركيزُ داخلها · Tab لا يخرج · Escape = «رجوع») — لا تُغلق والحفظُ جارٍ */
    return {
      p44RevOn: !0,
      p44RevRows: this.p44Rows(ch),
      p44RevAff: aff.map((ek) => this._p44PName(ek)),
      p44RevAffTxt: this.p44AffLine(aff.length) + (aff.length ? ":" : ""),
      p44RevNote: "",
      p44RevBusy: !!R.busy,
      p44RevErr: R.err || "",
      p44RevClose: () => R.busy || this._p44Set({ rev: null }),
      p44RevOut: () => this._p44S().rev && this._p44S().rev.busy ? void 0 : this._p44Set({ rev: null }),
      p44RevSave: () => this._p44Save(),
    };
  },
  async _p44Save() {
    const E = this._p44E(),
      S = this._p44S(),
      d = S.d;
    if (!E || !d || (S.rev && S.rev.busy)) return;
    const did = d.did,
      aff = this.p44Affected(d),
      roles = JSON.parse(JSON.stringify(d.roles)),
      people = JSON.parse(JSON.stringify(d.people)),
      intent = { k: "perm44", did: did, roles: roles, people: people };
    this._p44Set({ rev: { open: 1, busy: 1 } });
    let r = null;
    /* V7 · د5-هـ (44): مسودةُ المحرّك الواحدة — السجلُّ كلُّه (الأدوار + الأشخاص) ثم المنحُ المترجَم لكل متأثر، وتُثبَّت مرةً (طلبُ حفظٍ واحد) */
    try {
      const dr = E.draft(did),
        w = E.setRoles(dr, did, { v: 1, roles: roles, people: people });
      r = w && !1 === w.ok ? { ok: !1, err: w.err } : await E.commit(dr);
      this.__p44LastDraft = dr;
    } catch (e) {
      r = null;
    }
    void intent;
    if (!r || !r.ok) {
      const why = r && "unsent" === r.err ? "لم يصل تأكيد الحفظ — المسودة باقية؛ أعد الحفظ للتحقق." : r && "denied" === r.err ? "رفض الخادم الحفظ — راجع الصلاحية ثم أعد المحاولة." : "لم يُحفظ التغيير — " + (r && r.err ? "(" + r.err + ") " : "") + "راجع الصلاحية ثم أعد المحاولة.";
      return void this._p44Set({ rev: { open: 1, err: why } });
    }
    this._p44Set((s) => ({ rev: null, d: s.d ? Object.assign({}, s.d, { base: { roles: roles, people: people } }) : s.d, log: null }));
    this.bsToast("حُفظت الصلاحيات — " + this.p44AffLine(aff.length), "ok");
  },
  /* ③ الأشخاص */
  _p44PeopleVals(did, d) {
    const S = this._p44S(),
      D = KIVO.BassamDepts,
      X = this._acctCtx ? this._p44Try(() => this._acctCtx(), { l: {}, now: Date.now() }) : { l: {}, now: Date.now() },
      now = Date.now(),
      q = String(S.q || "").trim(),
      f = S.pf || "all",
      users = this._p44Users().filter((u) => "staff" === u.role && u.ekey && u.deptId === did),
      me = this._p44Try(() => KIVO.BassamAuth.user(), null) || {},
      self = (u) => !!u && !!me.id && u.id === me.id,   /* V7 · د5-هـ (44 · المدير): سجلُّه هو — لا يعدّله (الخادمُ يرفض 'self') */
      rec = (u) => (d.people || {})[u.ekey] || { role: null, ex: [] },
      live = (x) => !x.until || x.until > now,
      roleOf = (u) => (u.mgr ? "مدير الإدارة" : this._p44RoleName(rec(u).role) || ((rec(u).ex || []).some(live) ? "صلاحيات مخصّصة" : "بلا صلاحيات")),
      keep = (u) =>
        ("ex" === f ? (rec(u).ex || []).some(live) : "never" === f ? !X.l[u.id] : "mgr" === f ? !!u.mgr : !0) &&
        (!q || (String(u.name || "") + " " + (u.un || "") + " " + (u.empno || u.no || "")).indexOf(q) !== -1);
    const F = [
      ["all", "الكل", users.length],
      ["ex", "باستثناءات", users.filter((u) => (rec(u).ex || []).some(live)).length],
      ["never", "لم يدخلوا", users.filter((u) => !X.l[u.id]).length],
      ["mgr", "المدراء", users.filter((u) => u.mgr).length],
    ];
    const shown = users.filter(keep),
      sel = users.filter((u) => u.ekey === S.pSel)[0] || shown[0] || null;
    const v = {
      p44PQ: S.q || "",
      p44PQSet: (ev) => this._p44Set({ q: String((ev && ev.target && ev.target.value) || "") }),
      p44PFilters: F.map((x) => ({ t: x[1], n: String(x[2]), on: x[0] === f ? "true" : "false", pick: () => this._p44Set({ pf: x[0] }) })),
      p44PRows: shown.map((u) => {
        const ex = (rec(u).ex || []).filter(live).length;
        return {
          n: u.name || u.un,
          id: u.empno || u.no || u.un || "",
          i: String(u.name || "؟").trim().charAt(0) || "؟",
          me: self(u),
          role: roleOf(u),
          unit: (this.adUnit && this._p44Try(() => this.adUnit(u), "")) || this._p44Try(() => D.nodeOf(u.deptId).name, "") || "—",
          hasEx: ex > 0,
          ex: "+" + ex,
          last: X.l[u.id] && this.adWhen ? this.adWhen(X.l[u.id], X.now) : "لم يدخل",
          on: sel && sel.ekey === u.ekey ? "true" : "false",
          pick: () => this._p44Set({ pSel: u.ekey, exForm: null }),
        };
      }),
      p44PEmpty: !shown.length,
      p44PEmptyTxt: users.length ? "لا أحد يطابق البحث أو المرشّح" : "لا حسابات موظفين في هذه الإدارة بعد",
      p44PSelOn: !!sel,
    };
    if (!sel) return v;
    const r = rec(sel),
      roles = d.roles,
      setRec = (fn) =>
        this._p44Upd((x) => {
          const p = (x.people[sel.ekey] = JSON.parse(JSON.stringify(x.people[sel.ekey] || { role: null, ex: [] })));
          p.ex = p.ex || [];
          fn(p);
        }),
      eff = this._p44Eff(r, roles, did, now),
      rl = roles.filter((x) => x.id === r.role)[0] || null,
      ef = S.exForm,
      have = new Set(this._p44Compile(rl || { sys: {} }, did)),
      on = this._p44Ceil(did),
      exKeys = [].concat.apply(
        [],
        this._p44Sys()
          .filter((s) => on(s.k))
          .map((s) => this._p44Keys(s.k).filter((k) => !have.has(k)).map((k) => ({ v: k, t: s.n + " · " + this._p44Label(k) }))),
      ),
      byName = (id) => (this._p44Users().filter((u) => u.id === id)[0] || {}).name || "مدير المنصة";
    return Object.assign(v, {
      p44PSel: { n: sel.name || sel.un, i: String(sel.name || "؟").trim().charAt(0) || "؟", id: sel.empno || sel.no || sel.un || "", role: roleOf(sel), mgr: !!sel.mgr },
      p44PMgr: !!sel.mgr,
      p44PSelf: self(sel),
      p44PEdit: !sel.mgr && !self(sel),
      p44PRoles: [{ id: null, name: "بلا دور" }].concat(roles).map((x) => ({ t: x.name || "بلا اسم", on: (r.role || null) === x.id ? "true" : "false", pick: () => setRec((p) => (p.role = x.id)) })),
      p44PEx: (r.ex || []).map((x, i) => ({
        vis: "mgr" !== this._p44Viewer() || this._p44KeyCeil(did)(x.key),
        n: "+ " + this._p44Label(x.key),
        meta: "منحه " + byName(x.by) + " · " + (x.until ? (live(x) ? "ينتهي " : "انتهى ") + this._p44Day(x.until) : "بلا تاريخ انتهاء"),
        live: live(x) ? "true" : "false",
        del: () => setRec((p) => p.ex.splice(i, 1)),
      })).filter((x) => x.vis),
      p44PExNone: !(r.ex || []).length,
      p44PNav: sel.mgr ? [{ n: "كل الأنظمة المفعّلة لإدارته", l: "كامل داخل السقف" }] : this._p44Menu(eff, rl, did, !0),
      p44ExAdd: () => this._p44Set({ exForm: { key: (exKeys[0] || {}).v || "", until: "", note: "" } }),
      p44ExFormOn: !!ef,
      p44ExKeys: exKeys,
      p44ExNoKeys: !!ef && !exKeys.length,
      p44ExKey: (ef && ef.key) || "",
      p44ExUntil: (ef && ef.until) || "",
      p44ExNote: (ef && ef.note) || "",
      p44ExKeySet: (ev) => this._p44Set((s) => ({ exForm: Object.assign({}, s.exForm, { key: String(ev.target.value || "") }) })),
      p44ExUntilSet: (ev) => this._p44Set((s) => ({ exForm: Object.assign({}, s.exForm, { until: String(ev.target.value || "") }) })),
      p44ExNoteSet: (ev) => this._p44Set((s) => ({ exForm: Object.assign({}, s.exForm, { note: String(ev.target.value || "").slice(0, 120) }) })),
      p44ExCancel: () => this._p44Set({ exForm: null }),
      p44ExOk: () => {
        const x = this.p44ExRec(ef, this._p44Try(() => KIVO.BassamAuth.user().id, ""), Date.now());
        if (!x.ok) return void this.bsToast(x.err, "warn");
        setRec((p) => p.ex.push(x.rec));
        this._p44Set({ exForm: null });
      },
    });
  },
  /* استثناءٌ مؤقت من النموذج: مفتاحٌ مطلوب · تاريخُ الانتهاء (اختياري) يُقرأ نهايةَ يومه ولا يكون في الماضي */
  p44ExRec(ef, by, now) {
    if (!ef || !ef.key) return { ok: !1, err: "اختر الفعل" };
    let until = null;
    if (ef.until) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ef.until);
      if (!m) return { ok: !1, err: "تاريخ الانتهاء غير صالح" };
      until = new Date(+m[1], +m[2] - 1, +m[3], 23, 59, 59).getTime();
      if (until <= now) return { ok: !1, err: "تاريخ الانتهاء مضى — اختر يوماً قادماً" };
    }
    return { ok: !0, rec: { key: ef.key, until: until, by: by, at: now, note: ef.note || "" } };
  },
  _p44Day(ms) {
    try {
      return KIVO.BassamCal.hText(new Date(ms), { day: "numeric", month: "long" });   /* V7 · د5-هـ (44): التقويمُ من خدمته الواحدة (385) */
    } catch (e) {
      return new Date(ms).toISOString().slice(0, 10);
    }
  },
  /* هل يُعرض موضعُ التغيير c في عرض المدير؟ نظامُه (sys) أو مفتاحُه (key) داخل سقف الوحدة — ولا شيءَ من السقف نفسِه */
  _p44Seen(did) {
    const on = this._p44Ceil(did),
      kon = this._p44KeyCeil(did);
    return (c) => !!c && !/^ceil\./.test(String(c.what || "")) && (!c.sys || on(c.sys)) && (!c.key || kon(c.key));
  },
  /* ④ السجل: GET /api/perm44/log — كلُّ تغيير: من · ماذا (من ← إلى) · من تأثّر · متى، و«تراجع عن هذا التغيير» */
  _p44LogVals(did) {
    const S = this._p44S(),
      L = S.log && S.log.did === did ? S.log : null;
    if (!L) {
      this.state = { ...this.state, p44: Object.assign({}, S, { log: { did: did, st: "loading" } }) };
      setTimeout(() => this._p44LogLoad(did), 0);
    }
    const st = L ? L.st : "loading",
      f = S.lf || "all",
      kindOf = (e) => {
        const w = String(((e.changes || [])[0] || {}).what || "");
        return /^ceil\./.test(w) ? "cap" : "person" === w || "ex" === w ? "person" : "role";
      },
      TG = { role: "دور", person: "شخص", cap: "سقف إدارة" },
      mgrV = "mgr" === this._p44Viewer(),
      seen = this._p44Seen(did),
      /* V7 · د5-هـ (44 · المدير): عرضُ المدير لا يذكر نظاماً مطفأً في سقفه — لا تغييراتِ السقف (شأنُ مدير المنصة) ولا موضعاً في نظامٍ مطفأ */
      items = ((L && L.items) || [])
        .map((e) => (mgrV ? Object.assign({}, e, { changes: (e.changes || []).filter(seen) }) : e))
        .filter((e) => (!mgrV || ("cap" !== kindOf(e) && e.changes.length)) && ("all" === f || kindOf(e) === f));
    return {
      p44LogLoading: "loading" === st,
      p44LogErr: "error" === st,
      p44LogRetry: () => this._p44Set({ log: null }),
      p44LogEmpty: "ready" === st && !items.length,
      p44LogFilters: [
        ["all", "الكل"],
        ["role", "الأدوار"],
        ["person", "الأشخاص"],
        ["cap", "سقوف الإدارات"],
      ]
        .filter((x) => !mgrV || "cap" !== x[0])
        .map((x) => ({ t: x[1], on: x[0] === f ? "true" : "false", pick: () => this._p44Set({ lf: x[0] }) })),
      p44LogItems: items.map((e) => {
        const k = kindOf(e),
          wid = e.who && "object" === typeof e.who ? e.who.uid : e.who,
          who = String((e.who && e.who.name) || this._p44Try(() => this._p44Users().filter((u) => u.id === wid)[0].name, "") || wid || "—");
        return {
          who: who,
          i: who.charAt(0) || "؟",
          tag: TG[k],
          kind: k,
          ch: this.p44Rows(e.changes).map((c) => ({ sys: c.what, from: c.from, to: c.to })),
          when: e.at && this.adFull ? this._p44Try(() => this.adFull(e.at), "") : "",
          aff: (e.affected || []).length ? "يتأثر " + KIVO.BassamCount(e.affected.length, "شخص") : "لم يتأثر أحد",
          undoOn: !!(e.changes || []).length && !("cap" === k && "mgr" === this._p44Viewer()),   /* السقفُ لمدير المنصة وحده */
          undo: () => this._p44Undo(did, e),
        };
      }),
    };
  },
  async _p44LogLoad(did) {
    let items = null;
    try {
      const r = await fetch("/api/perm44/log?d=" + encodeURIComponent(did) + "&limit=50", { credentials: "same-origin", cache: "no-store" }),
        j = await r.json();
      if (!r.ok) throw Error("bad");
      items = j && 1 === j.ok && Array.isArray(j.rows) ? j.rows : null;   /* /api/perm44/log → {ok, rows} */
      if (!Array.isArray(items)) throw Error("bad");
    } catch (e) {
      items = null;
    }
    this._p44Set({ log: { did: did, st: items ? "ready" : "error", items: items || [] } });
  },
  /* «تراجع عن هذا التغيير»: السقفُ بمسار حفظه نفسِه (setDeptCap · setDeptSubs · setDeptLenses) ما دام كما تركه التغيير؛
     والأدوارُ بعكس الفرق في المحرّك (undo — يرفض موضعاً تغيّر بعده) ثم المراجعةُ والحفظُ الواحد */
  _p44Undo(did, ev) {
    const ch = (ev && ev.changes) || [],
      eq = (a, b) => JSON.stringify(a == null ? null : a) === JSON.stringify(b == null ? null : b),
      drift = () => this.bsToast("تغيّر هذا الموضع بعد ذلك — لا يمكن التراجع عنه تلقائياً", "warn"),
      cl = ch.filter((c) => /^ceil\./.test(String(c.what || "")));
    if (cl.length && cl.length === ch.length) {
      const P = KIVO.BassamPerm;
      for (const c of cl) {
        const u = c.unit || did;
        if ("ceil.caps" === c.what && !eq(P.hasCap(u) ? P.rawCap(u) : null, c.to)) return void drift();
        if ("ceil.lenses" === c.what && !eq(this._p44Try(() => P.deptLenses(u), null), c.to)) return void drift();
      }
      let r = { ok: !0 };
      for (const c of cl) {
        const u = c.unit || did;
        if ("ceil.caps" === c.what) r = (r.ok && P.setDeptCap(u, c.from || [])) || r;
        else if ("ceil.lenses" === c.what) r = (r.ok && P.setDeptLenses(u, c.from || [])) || r;
        else if ("ceil.subs" === c.what) {
          const F = c.from || {},
            T = c.to || {};
          Object.keys(Object.assign({}, F, T)).forEach((k) => {
            if (!r.ok || eq(F[k], T[k])) return;
            const tb = /^(.+):tabs$/.exec(k);
            r = (tb ? P.setDeptTabs && P.setDeptTabs(u, tb[1], F[k] || []) : P.setDeptSubs(u, k, F[k] || [])) || r;
          });
        }
      }
      if (r && !1 === r.ok) return void this.bsToast(r.err || "لم يُحفظ", "err");
      this._p44Set({ log: null });
      return void this.bsToast("أُعيد السقف كما كان قبل هذا التغيير", "ok");
    }
    const S = this._p44S(),
      d = S.d && S.d.did === did ? S.d : this._p44Ensure(did);
    if (!d) return void this.bsToast("افتح «الأدوار» مرةً لتحميلها ثم أعد التراجع", "warn");
    if (this._p44Dirty(d)) return void this.bsToast("في الأدوار تعديلٌ غير محفوظ — احفظه أو تراجع عنه أولاً", "warn");
    const r = this._p44Try(() => this._p44E().undo({ v: 1, roles: d.base.roles, people: d.base.people }, ch.filter((c) => !/^ceil\./.test(String(c.what || "")))), null);
    if (!r) return void drift();
    this._p44Set((st) => ({ d: Object.assign({}, st.d || d, { roles: r.roles, people: r.people }), sub: "roles", rev: { open: 1 } }));
  },
});
