/* V7 · د5-هـ (44): أقسامُ «الصلاحيات» الأربعة (الأنظمة · الأدوار · الأشخاص · السجل) و«شاهد الصفحة كـ».
   V7 · د6: نُقل هذا الجزء كما هو من صفحة الإعدادات (src/modules/admin) إلى صفحة «الإدارات والصلاحيات» (src/modules/org) — يُجمَع بعد logic.js فيها.
   الوحدةُ والتبويبُ من العنوان وحده (logic.js: _ogRoute · go) — لا حالةَ «قسم» هنا ولا قائمةَ «الوحدة» داخل «الأنظمة» (الشجرةُ تقوم مقامها)،
   وبطاقتا «مدير المنصة» و«مدير الوحدة» صارتا تبويبَ «المسؤولون» (p44AdminsVals). كلُّ تبويبٍ يُركَّب من دالته في logic.js (ogTab…).
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
  /* المستوياتُ من المحرّك (levels) { v: المفتاح · t: الاسم · d: سطرُه الوصفي } — V7 · 53 (وضوح الصلاحيات): الاسمُ والسطرُ من perm44-levels.json وحده (لا قائمةَ أسماءٍ هنا) */
  _p44Lvls() {
    const raw = this._p44Try(() => this._p44E().levels(), null);
    return (Array.isArray(raw) ? raw : []).map((x) => ({ v: x.key, t: x.name || x.key, d: x.desc || "" }));
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
      .map((s) => ({ k: s.k || s.key || "", n: s.n || s.name || this._p44Try(() => KIVO.BassamPerm.nameOf(s.k || s.key), "") || s.k || s.key, cap: s.page || s.cap || (s.leaves && s.leaves[0]) || s.k || s.key, tg: !1 !== s.toggle, under: s.under || "" }))
      .filter((s) => s.k);
  },
  /* V7 · د7 (أ — قرار المالك: العدساتُ كالأنظمة): العدساتُ القائمة من المحرّك (KIVO.Perm44.lensList — plugins/lenses) { k: lens.<L>, L, n, sys: الأنظمةُ المضيفة }.
     سقفُها للوحدة سجلُّها القائم (BassamPerm.deptLenses · setDeptLenses — غيابُه = الكلُّ مفعّل) — لا نموذجَ ولا مفتاحَ جديد */
  _p44Lenses() {
    const raw = this._p44Try(() => this._p44E().lensList(), []);
    return (Array.isArray(raw) ? raw : []).map((x) => ({ k: x.key, L: x.lens, n: "عدسة " + x.name, sys: x.sys || [], lens: !0 }));
  },
  _p44LensOwn(u, L) {
    return this._p44Try(() => KIVO.BassamPerm.deptLenses(u).indexOf(L) !== -1, !0);
  },
  /* مصدرُ قفل العدسة: أعلى أصلٍ أطفأها (كالأنظمة _p44LockSrc) — أو null */
  _p44LensLock(u, L) {
    const D = KIVO.BassamDepts,
      anc = this._p44Try(() => (D.ancestorsOf(u) || []).slice(), []);
    for (let i = anc.length - 1; i >= 0; i--) if (!this._p44LensOwn(anc[i], L)) return { n: this._p44Try(() => D.nodeOf(anc[i]).name, "") || "الأصل", id: anc[i] };
    return null;
  },
  /* العدسةُ مفعّلةٌ فعلياً في الوحدة (المحفوظ): في سجلّها ∧ لا أصلَ أطفأها ∧ مضيفٌ مفعّلٌ فعلياً (إطفاءُ المضيف يطفئ عدساتِه) */
  p44LensOnEff(u, x, off) {
    return this._p44LensOwn(u, x.L) && !this._p44LensLock(u, x.L) && x.sys.some((s) => this.p44SysOnEff(u, s, off));
  },
  _p44PlatOff() {
    const pl = this._p44Try(() => KIVO.BassamPlat.get(), null);   /* المطفأُ على المنصة كلها — «admin» دائم (activation: always) */
    const raw = ((pl && pl.mods && pl.mods.off) || []).filter((k) => "admin" !== k);
    return this._p44Try(() => KIVO.Perm44.offClosure(raw), raw);   /* V7 · د6: مع ما يسكن حاوياتِه (الإغلاقُ الواحد في المحرّك المشترك) */
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
    const L = this._p44LockSrc(u, s, off);
    return L ? L.n : "";
  },
  /* V7 · د6 (ب5): مصدرُ القفل { n: اسمُه · id: وحدتُه ("__plat" = المنصة) · fixed: «الإعداد الدائم» في صف المنصة (لا مفتاحَ له هناك — ليس إطفاءً) } أو null.
     المصدرُ أعلى أصلٍ أطفأه (الأسلافُ من الأعلى) — فـ«افتح مصدره» يصل الوحدةَ التي يُشغَّل منها */
  _p44LockSrc(u, s, off) {
    if ("__plat" === u) return this._p44PlatSw(s.k) ? null : { n: "الإعداد الدائم", id: "", fixed: !0 };
    if ((off || this._p44PlatOff()).indexOf(s.k) !== -1) return { n: "المنصة", id: "__plat" };
    const D = KIVO.BassamDepts,
      anc = this._p44Try(() => (D.ancestorsOf(u) || []).slice(), []);
    for (let i = anc.length - 1; i >= 0; i--) if (!this._p44On(anc[i], s, off)) return { n: this._p44Try(() => D.nodeOf(anc[i]).name, "") || "الأصل", id: anc[i] };
    return null;
  },
  /* V7 · د6 (ب5 · أ1): «مفعّلٌ فعلياً» — الدالةُ الواحدة: غيرُ مقفلٍ من فوق ∧ مفعّلٌ في سقف الوحدة (!_p44Lock && _p44On؛ و«الإعداد الدائم» في صف المنصة
     ليس قفلاً من فوق). يقرؤها تبويبُ «الأنظمة» وعمودُ الشجرة وخانةُ الملخّص وخطوةُ التهيئة (p44SysCount) وبطاقةُ «أثر النقل» والتحديدُ المتعدد */
  p44SysOnEff(u, s, off) {
    const x = "string" === typeof s ? this._p44Sys().filter((y) => y.k === s)[0] || { k: s, cap: s } : s,
      L = this._p44LockSrc(u, x, off);
    return (!L || !!L.fixed) && this._p44On(u, x, off);
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
      return !!s && this.p44SysOnEff(did, s, off);   /* V7 · د6 (م6 · أ1): المفعّلُ فعلياً كما يرسمه تبويبُ «الأنظمة» — محرّرُ الدور واستثناءاتُ الشخص والسجلُّ منه */
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
    return !this.__p44Dept && this._p44SupNow() && "mgr" !== this._p44S().viewer ? "plat" : "mgr";   /* V7 · د6: __p44Dept يضبطه logic.js من موضع الشاشة (الإعدادات ← الصلاحيات) */
  },
  /* V7 · د5-هـ (44 · المدير): من يرى «الصلاحيات» في إعدادات وحدةٍ did — قاعدةُ الخادم نفسُها (018 isMgrOf · secMgrOf):
     مديرُ المنصة · حسابُ الإدارة أو حاملُ شارة المدير في وحدته أو في قسمٍ من إدارته · المديرُ العام لوحدةٍ تحت عقدته — لا الموظفُ العادي.
     D: { parentDeptOf, ancestorsOf } من خدمة الهيكل */
  p44MgrOf(u, did) {
    return !!this._p44Try(() => this._p44E().mgrOf(u, did), !1);   /* V7 · د5-ح: القاعدةُ في المحرّك (KIVO.Perm44.mgrOf) — مصدرٌ واحد مع الرأس الثابت */
  },
  /* V7 · د6: القسمُ المعروض هو تبويبُ العنوان (logic.js _ogRoute) — لا حالةَ قسمٍ هنا؛ p44DeptUnit و p44Mount و _p44Go حُذفت مع صفحتها القديمة
     (من يرى «الصلاحيات» في الإعدادات تقرّره صفحةُ الإعدادات بالقاعدة نفسها KIVO.Perm44.mgrOf، ونطاقُ الشجرة في logic.js _ogScope) */
  _p44SubNow() {
    const t = this._ogRoute ? this._ogRoute().tab : "";
    return ["systems", "roles", "people", "log"].indexOf(t) !== -1 ? t : "";
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
    if ("string" === typeof v) return this._p44Lvls().some((l) => l.v === v) ? this._p44LvName(v) : this._p44RoleName(v) || v;
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
    const lz = this._p44Lenses().filter((x) => x.k === k)[0];   /* V7 · د7 (أ) */
    if (lz) return lz.n;
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
    return this._p44Try(() => KIVO.KIVO_REGISTRY.byKey[k].label, "") || (/^ff\.[\w.]+\.export$/.test(k) ? "تصدير" : k);   /* V7 · 53: علمُ التصدير (ليس مفتاحاً في السجلّ) */
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
  /* V7 · د6 (أ1): «ماذا يرى حامل الدور» و«ما يراه الآن» = قائمتُه الجانبية الفعلية من المصدر الواحد BassamPerm.seenBy (334) — لا قائمةَ أنظمةٍ محسوبةً
     على حدة. keys: مفاتيحُ الدور (compileRole) أو مفاتيحُ الشخص الفعّالة من المسودة (effective)؛ person: الحسابُ المختار — وبلا keys يُقرأ المحفوظُ له
     (ورقتُه · منحُه · استثناءاتُه السارية · وراثةُ المدير). l: مستوى الدور في نظام الرابط، والأنظمةُ التي تسكنه باسمها ومستواها («المهام تعديل» تحت
     «المتابعة اليومية»)، أو «استثناء» لنظامٍ خارج دوره */
  _p44Menu(keys, role, did, person) {
    const S = this._p44Sys(),
      h = person ? { kind: "person", did: did, ekey: person.ekey, mgr: !!person.mgr } : { kind: "role", did: did, keys: keys || [], role: role || null },   /* V7 · 53: role — لأعلام التصدير (334 holderFlags) */
      lvOf = (k) => (role && role.sys && role.sys[k] ? this._p44LvName(role.sys[k].lvl) : "");
    person && Array.isArray(keys) && (h.keys = keys);
    return this._p44Try(() => KIVO.BassamPerm.seenBy(h), [{ k: "profile", n: "صفحتي" }]).map((x) => {
      const mine = S.filter((s) => s.k === x.k || s.under === x.k),
        lv = mine.map((s) => (lvOf(s.k) ? (s.k === x.k ? "" : s.n + " ") + lvOf(s.k) : "")).filter(Boolean).join(" · ");
      return { n: x.n, l: lv || (person && Array.isArray(keys) && mine.length ? "استثناء" : "") };
    });
  },
  /* ── الأقسام ── */
  _p44Vals(did, isNode, node, sub) {
    const E = this._p44E(),
      sup = this._p44SupNow(),
      viewer = this._p44Viewer(),
      mgrV = "mgr" === viewer,
      S = this._p44S();
    const v = {
      p44MgrV: mgrV,
      p44ViewOn: sup && !this.__p44Dept,
      p44Viewers: [
        ["plat", "مدير المنصة"],
        ["mgr", "مدير الإدارة"],
      ].map((x) => ({ t: x[1], on: x[0] === viewer ? "true" : "false", pick: () => this._p44Set({ viewer: x[0], sel: "plat" === x[0] ? S.sel : "__super" === S.sel ? "" : S.sel, rev: null }) })),
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
    if (["systems", "roles", "people", "log"].indexOf(sub) === -1) return v;   /* V7 · د6: تبويبٌ يأخذ الرأسَ المشترك وحده («المسؤولون» · سجلُّ صف المنصة) */
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
      p44Review: () => this._p44Set({ rev: { open: 1, err: this._p44EmptyCustom(d.roles) } }),
      ...this._p44RevVals(d, aff),
    });
    return Object.assign(v, "roles" === sub ? this._p44RoleVals(did, d, mgrV, !1) : this._p44PeopleVals(did, d));
  },
  /* V7 · د5-ح: فتحُ تبويبٍ لوحدةٍ أخرى — V7 · د6: عبر نقطة التنقّل الواحدة (logic.js go) فيمرّ بحارس التغييرات غير المحفوظة */
  p44Open(unit, sub, extra) {
    if (!unit) return;
    extra && (this.state = { ...this.state, p44: Object.assign({}, this.state.p44 || {}, { rev: null, exForm: null }, extra) });
    this.go(unit, sub);
  },
  /* حاملو «مدير الوحدة»: مديرو الإدارة أو القسم (deptManagers) · ومديرو العقدة العامّون (groupManagers) */
  _p44Mgrs(did, isNode) {
    const A = KIVO.BassamAuth || {};
    return this._p44Try(() => (isNode ? A.groupManagers(did) : A.deptManagers(did)) || [], []);
  },
  /* V7 · د6 (أ1): «أشخاص» الوحدة من مصدرٍ واحد — جدولُ «الأشخاص» وجدولُ «أشخاص الفرع» وعمودُ الشجرة وخانةُ «ملخّص الوحدة» تقرأ هذه القواعد نفسها:
     الإدارة والقسم أشخاصُها هي (حسابُ موظفٍ له مفتاحُ موظف في الوحدة) · القطاع والإدارة العامة أشخاصُ الفرع (كلُّ حسابٍ غيرِ مدير المنصة في العقدة وما تحتها) */
  p44UnitOfUser(u) {
    return (u && ("gm" === u.role ? u.gid : u.deptId)) || "";
  },
  p44IsOwnPerson(u) {
    return !!u && "staff" === u.role && !!u.ekey;
  },
  p44PeopleOf(did, isNode) {
    const all = this._p44Users();
    if (!isNode) return all.filter((u) => this.p44IsOwnPerson(u) && u.deptId === did);
    const D = KIVO.BassamDepts,
      ids = { [did]: 1 };
    this._p44Try(() => (D.descendantsOf ? D.descendantsOf(did) : D.deptsUnder(did)) || [], []).forEach((x) => (ids["string" === typeof x ? x : x && x.id] = 1));
    return all.filter((u) => u && "super" !== u.role && !!ids[this.p44UnitOfUser(u)]);
  },
  /* V7 · د6 (أ1): «الأنظمة» المفعّلة فعلياً في وحدةٍ بعد الوراثة من أصل ما يُشغَّل ويُطفأ — عمودُ الشجرة وخانةُ الملخّص وعدّادُ التبويب من هنا */
  p44SysCount(u) {
    const off = this._p44PlatOff(),
      sys = this._p44Sys().filter((s) => s.tg);
    return { on: sys.filter((s) => this.p44SysOnEff(u, s, off)).length, all: sys.length };   /* V7 · د6 (ب5): ما يرسمه التبويبُ نفسُه */
  },
  /* ③ أشخاصُ العقدة الإشرافية: حساباتُ فرعها كلُّها (المديرون العامّون بعقدتهم · وغيرُهم بإدارته أو قسمه) — يُفتح كلٌّ في «الأشخاص» لوحدته */
  _p44NodePeopleVals(did) {
    const D = KIVO.BassamDepts,
      S = this._p44S(),
      X = this._acctCtx ? this._p44Try(() => this._acctCtx(), { l: {}, now: Date.now() }) : { l: {}, now: Date.now() },
      q = String(S.q || "").trim();
    const unitOf = (u) => this.p44UnitOfUser(u),
      all = this.p44PeopleOf(did, !0),
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
          go: () => (gm || u.mgr ? this.p44Open(un, "admins") : this.p44Open(un, "people", { pSel: u.ekey || "" })),   /* V7 · د6: المسؤولُ يُفتح في تبويب «المسؤولون» لوحدته */
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
      chain = "__plat" === did ? ["__plat"] : ["__plat"].concat(anc, [did]),
      u = did,   /* V7 · د6: الوحدةُ تُختار مرةً واحدة من الشجرة — قائمةُ «الوحدة» داخل «الأنظمة» حُذفت */
      nm = (id) => ("__plat" === id ? "المنصة كلها" : this._p44Try(() => D.nodeOf(id).name, "") || "—"),
      off = this._p44PlatOff(),
      sys = this._p44Sys().filter((s) => s.tg),   /* ما يُشغَّل ويُطفأ وحده (toggle) — الدائمُ لا مفتاحَ له */
      dr = S.cap && S.cap.unit === u ? S.cap.on : {};
    /* V7 · د6 (ب5): الوراثةُ ظاهرة — المطفأُ من فوق صفٌّ مقفل «مطفأ من: <المصدر>» وزرُّ «افتح مصدره» (الوحدةُ المصدر على تبويب «الأنظمة»)؛
       و«الإعدادُ الدائم» في صف المنصة يُعرض بحاله الفعلية بلا مفتاح (لا «مطفأ» كاذب). المفعّلُ من الدالة الواحدة p44SysOnEff */
    const setDr = (fn) =>
      this._p44Set((st) => {
        const c = st.cap && st.cap.unit === u ? Object.assign({}, st.cap.on) : {};
        fn(c);
        return { cap: { unit: u, on: c } };
      });
    const rows0 = sys.map((s) => {
        const L = this._p44LockSrc(u, s, off),
          fixed = !!(L && L.fixed),
          by = L && !fixed ? L.n : "",
          was = this.p44SysOnEff(u, s, off),
          on = L ? was : s.k in dr ? !!dr[s.k] : was,
          srcOn = !!by && !!L.id && L.id !== u;
        return {
          k: s.k,
          n: s.n,
          kind: "sys",
          on: on ? "true" : "false",
          isOn: on,
          locked: !!L,
          by: by,
          lockTxt: fixed ? "لا مفتاح له على المنصة" : "مطفأ من: " + by,
          was: was,
          sub: fixed ? (was ? "مفعّل — يُضبط لكل وحدة، لا على المنصة" : "مطفأ مع حاويته على المنصة") : by ? "مطفأ من " + by + " — لا يُفعَّل هنا" : on ? (was ? "مفعّل" : "سيُفعَّل عند الحفظ") : was ? "سيُطفأ عند الحفظ" : "مطفأ — لا يظهر لهذه الوحدة",
          srcOn: srcOn,
          srcHref: srcOn && this.ogHref ? this.ogHref(L.id, "systems") : "",
          srcGo: (ev) => {
            ev && ev.preventDefault && ev.preventDefault();
            srcOn && this.go && this.go(L.id, "systems");
          },
          flip: () => {
            if (L) return;
            setDr((c) => ((c[s.k] = !on), c[s.k] === was && delete c[s.k]));
          },
        };
      }),
      /* V7 · د7 (أ): تحت النظام المضيف عدساتُه بمفتاحٍ كالأنظمة — مسودتُها في المسودة نفسِها (lens.<L> = في سجلّ عدسات الوحدة؟)؛ المقفلُ من أصلٍ
         «مطفأ من: <المصدر>»، والمضيفُ المطفأ (في المسودة أو المحفوظ) يطفئها معه ويقفلها — وسجلُّها يبقى فتعود كما كانت بعودته. لا عدساتَ في صف المنصة */
      rows = rows0,
      lzRows = "__plat" === u ? [] : this._p44LensInject(u, rows0, dr, setDr, off),
      /* «تشغيل الكل» / «إطفاء الكل»: المسودةُ لكل صفٍّ غيرِ مقفل — المقفلُ لا يُمسّ.
         V7 · د7 (أ): والعدسات: «تشغيل الكل» يشغّل كلَّ عدسةٍ غيرِ مقفلةٍ من أصل؛ «إطفاء الكل» يطفئها مع مضيفها (سجلُّها يبقى فتعود كما كانت بتشغيله) */
      allTo = (v) => setDr((c) => (rows.forEach((r) => r.locked || (v === r.was ? delete c[r.k] : (c[r.k] = v))), lzRows.forEach((z) => z.by || (v && !z.was ? (c[z.k] = !0) : delete c[z.k])))),
      eff = this._p44SysEffect(u, dr),
      dirtyN = Object.keys(dr).length,
      people = "__plat" === u ? this._p44Users().filter((x) => "super" !== x.role).length : this._p44Users().filter((x) => x.deptId === u || this._p44Try(() => (D.ancestorsOf(x.deptId) || []).indexOf(u) !== -1, !1)).length;
    return {
      p44Unit: {
        n: nm(u),
        path: chain.slice(0, chain.indexOf(u)).map(nm).join(" / ") || "أعلى الهيكل",
        inh: "__plat" === u ? "المنصة كلها: النظام المطفأ هنا يختفي من كل الإدارات ومن الأدوار ومن القوائم." : "يتبع ما فوقه: ما أُطفئ هناك يظهر مقفلاً هنا ولا يُفعَّل.",
      },
      p44SysCtl: !0,
      p44SysRows: rows.map((r) => Object.assign(r, { sw: !0 })),
      p44SysNone: !rows.length,
      p44SysNoneTxt: "لا أنظمة قابلة للتشغيل في هذه المنصة.",
      p44SysNavOn: "__plat" !== u,   /* V7 · د6: صفُّ «المنصة كلها» لا مديرَ وحدةٍ له — بطاقةُ قائمته تُخفى */
      p44SysNav: "__plat" === u ? [] : this.p44NavOf(u),
      p44SysNavT: "ما يراه مدير هذه الإدارة",
      p44SysOnN: String(rows0.filter((r) => r.isOn).length),
      /* عدّادُ «المفعّل من الكل» · «تشغيل الكل» / «إطفاء الكل» (المقفلُ لا يتأثر) — العدّادُ للأنظمة (= عمودُ الشجرة p44SysCount)، والعدساتُ في الزرّين */
      p44SysOnOf: rows0.filter((r) => r.isOn).length + " من " + rows0.length,
      p44SysAllOn: () => allTo(!0),
      p44SysAllOff: () => allTo(!1),
      p44SysAllOk: rows.some((r) => !r.locked),
      /* «أثر الحفظ» بالأسماء قبل الحفظ: ما يُفعَّل · ما يُطفأ · وما يُطفأ معها (الإغلاقُ الواحد Perm44.offWith) */
      p44SysEffOn: eff.on.join(" · "),
      p44SysEffOff: eff.off.join(" · "),
      p44SysEffWith: eff.with.join(" · "),
      p44SysEffVia: (eff.via || []).join(" · "),
      p44SysEffNone: !dirtyN,
      p44SysPeople: String(people),
      p44SysDirty: dirtyN > 0,
      p44SysDirtyTxt: KIVO.BassamCount(dirtyN, "تغيير|غير محفوظ"),
      p44SysUndo: () => this._p44Set({ cap: null, rev: null }),
      /* V7 · د5-ح: «مراجعة وحفظ» تفتح نافذةَ المراجعة (الملخّص · «حفظ» · «رجوع») — والحفظُ منها بمساره القائم */
      p44SysReview: () => this._p44Set({ rev: { open: 1, kind: "sys" } }),
      ...this._p44SysRevVals(u, dr, nm(u), people),
    };
  },
  /* V7 · د5-ح (قرار المالك): «ما يراه مدير هذه الإدارة / قائمة إدارتك» = قائمتُه الجانبية الفعلية كاملةً (الدائمةُ معها) من المصدر الذي تُرسم منه
     القائمةُ الجانبية نفسُه (BassamPerm.menuFor — root-logic يرسم منه) على صلاحيات مدير الوحدة (mgrPerms) — لا قائمةَ محسوبةً على حدة.
     تعرض المحفوظ: تغييرٌ غيرُ محفوظ يظهر فيها بعد «حفظ» */
  /* V7 · د7 (أ): صفوفُ العدسات بعد أول مضيفٍ حاضر (العدسةُ الواحدة تسري على مضيفَيها — سجلٌّ واحد للوحدة) */
  _p44LensInject(u, rows, dr, setDr, off) {
    const lz = this._p44Lenses();
    if (!lz.length) return rows;
    const hostOn = (s) => { const r = rows.filter((x) => x.k === s)[0]; return r ? r.isOn : this.p44SysOnEff(u, s, off); },
      hostNm = (x) => x.sys.map((s) => this._p44SysName(s)).join(" · "),
      mk = (x) => {
        const own = this._p44LensOwn(u, x.L),
          L = this._p44LensLock(u, x.L),
          hOn = x.sys.some(hostOn),
          cur = x.k in dr ? !!dr[x.k] : own,
          was = this.p44LensOnEff(u, x, off),
          on = !L && hOn && cur,
          srcOn = !!L && L.id !== u;
        return {
          k: x.k, n: x.n, lens: !0, kind: "lens", sw: !0, on: on ? "true" : "false", isOn: on, locked: !!L || !hOn, by: L ? L.n : "",
          lockTxt: L ? "مطفأ من: " + L.n : "يُطفأ مع " + hostNm(x),
          was: own,
          sub: L ? "مطفأ من " + L.n + " — لا يُفعَّل هنا" : !hOn ? "مطفأة مع النظام المضيف — تعود كما كانت بتشغيله" : on ? (was ? "مفعّلة في " + hostNm(x) : "ستُفعَّل عند الحفظ") : was ? "ستُطفأ عند الحفظ" : "مطفأة — لا تظهر لأحد في هذه الوحدة",
          srcOn: srcOn,
          srcHref: srcOn && this.ogHref ? this.ogHref(L.id, "systems") : "",
          srcGo: (ev) => { ev && ev.preventDefault && ev.preventDefault(); srcOn && this.go && this.go(L.id, "systems"); },
          flip: () => { if (L || !hOn) return; setDr((c) => ((c[x.k] = !cur), c[x.k] === own && delete c[x.k])); },
        };
      };
    /* تُعلَّق على صفِّ كلِّ مضيفٍ لها (r.lz · r.lzOn — الصفُّ نفسُه تحت المضيفَين: سجلٌّ واحد للوحدة، فالمفتاحُ تحت أيّهما يبدّلهما معاً)، فيبقى p44SysRows صفوفَ
       الأنظمة (العدّادُ = عمودُ الشجرة) — وتُعاد مسطّحةً بلا تكرار لـ«تشغيل الكل» */
    const out = lz.map(mk);
    rows.forEach((r) => {
      r.lz = out.filter((z, i) => lz[i].sys.indexOf(r.k) !== -1);
      r.lzOn = r.lz.length > 0;
    });
    return out;
  },
  p44NavOf(u) {
    /* V7 · د6 (أ1): المصدرُ الواحد لكل «ما يراه حامل» — BassamPerm.seenBy (334) */
    return this._p44Try(() => KIVO.BassamPerm.seenBy({ kind: "mgr", did: u }), [{ k: "profile", n: "صفحتي" }]);
  },
  /* V7 · د5-ح: «الأنظمة» لمدير الإدارة قراءةً — المفعّلُ في سقف وحدته وحده (السقفُ بالوراثة ∩ المنصة)، بلا مفاتيح ولا شريط حفظ؛
     والمطفأُ لا يظهر له أبداً (لا صفّاً ولا قفلاً ولا اسماً) */
  _p44SysRO(did) {
    const D = KIVO.BassamDepts,
      off = this._p44PlatOff(),
      rows = this._p44Sys()
        .filter((s) => s.tg && this.p44SysOnEff(did, s, off))   /* V7 · د6 (م6 · ب12): المفعّلُ فعلياً وحده */
        .map((s) => ({ k: s.k, n: s.n, kind: "sys", on: "true", isOn: !0, locked: !1, by: "", sw: !1, sub: "مفعّل لإدارتك", flip: () => {} }))
        /* V7 · د7 (أ): والعدساتُ المفعّلة فعلياً تحت مضيفها — المطفأةُ لا تظهر له */
        .map((r, i, all) => {
          const lz = this._p44Lenses().filter((x) => x.sys.indexOf(r.k) !== -1 && this.p44LensOnEff(did, x, off));   /* V7 · د7 (أ): تحت كلِّ مضيف */
          return Object.assign(r, { lz: lz.map((x) => ({ k: x.k, n: x.n, kind: "lens", on: "true", isOn: !0, locked: !1, by: "", sw: !1, sub: "مفعّلة لإدارتك", flip: () => {} })), lzOn: lz.length > 0 });
        }),
      people = this._p44Users().filter((x) => x.deptId === did || this._p44Try(() => (D.ancestorsOf(x.deptId) || []).indexOf(did) !== -1, !1)).length;
    return {
      p44SysRO: !0,
      p44SysCtl: !1,
      p44SysNavOn: !0,
      p44Unit: { n: this._p44Try(() => D.nodeOf(did).name, "") || "—", path: "إدارتك", inh: "يضبط الأنظمةَ مدير المنصة — ما يظهر هنا وحده متاحٌ لإدارتك ولأدوار موظفيها." },
      p44SysRows: rows,
      p44SysNone: !rows.length,
      p44SysNoneTxt: "لا نظام مفعّل لإدارتك بعد — يفعّله مدير المنصة.",
      p44SysNav: this.p44NavOf(did),
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
      p44RevRows: ks.map((k) => ({ what: unitName + " · " + this._p44SysName(k), from: dr[k] ? "مطفأ" : "مفعّل", to: dr[k] ? "مفعّل" : "مطفأ" }))
        /* V7 · د6 (قرار المالك ٤): «أثر الحفظ» يسمّي ما يُطفأ مع الحاوية قبل الحفظ — من الإغلاق الواحد (Perm44.offWith) */
        .concat(this._p44SysWith(u, dr).map((k) => ({ what: unitName + " · " + this._p44SysName(k) + " — يُطفأ معها", from: "مفعّل", to: "مطفأ" }))),
      p44RevAff: [],
      p44RevAffTxt: this.p44AffLine(people) + (people ? " في هذه الوحدة وما تحتها" : ""),
      p44RevNote: "إطفاء نظام لا يحذف بياناته: تبقى محفوظة وتعود كما هي عند التفعيل.",
      p44RevBusy: !1,
      p44RevErr: R.err || "",
      p44RevClose: () => (this._p44Set({ rev: null }), this._ogPendEnd(!1)),   /* V7 · د6 (ب11): «رجوع» من «حفظ ثم انتقال» = البقاء */
      p44RevOut: () => (this._p44Set({ rev: null }), this._ogPendEnd(!1)),
      p44RevSave: () => this._p44CapSave(u, dr),
    };
  },
  /* V7 · د6 (قرار المالك ٤): ما يُطفأ مع حاويةٍ في هذه المسودة ولم يُذكر فيها — المفعّلُ الآن وحده (الدالةُ الواحدة) */
  _p44SysWith(u, dr) {
    const ks = Object.keys(dr || {}),
      w = this._p44Try(() => KIVO.Perm44.offWith(ks.filter((k) => !dr[k] && !/^lens\./.test(k)), (k) => this.p44SysOnEff(u, k)), []) || [];
    /* V7 · د7 (أ): العدسةُ المفعّلة التي يُطفأ كلُّ مضيفيها بهذه المسودة تُطفأ معها (تعود بعودته) */
    if ("__plat" === u) return w;
    const after = (s) => (s in (dr || {}) ? !!dr[s] : w.indexOf(s) === -1 && this.p44SysOnEff(u, s));
    return w.concat(this._p44Lenses().filter((x) => !(x.k in dr) && this.p44LensOnEff(u, x) && !x.sys.some(after)).map((x) => x.k));
  },
  /* «أثر الحفظ» بالأسماء: { on: [يُفعَّل] · off: [يُطفأ] · with: [يُطفأ معها] } */
  _p44SysEffect(u, dr) {
    const ks = Object.keys(dr || {}),
      nm = (k) => this._p44SysName(k);
    /* V7 · د7 (أ): عدسةٌ يُطفأ أحدُ مضيفَيها ويبقى الآخر — تبقى عاملةً عبره (القراءةُ المحافظة) ويُسمّى ذلك قبل الحفظ */
    const after = (s) => (s in (dr || {}) ? !!dr[s] : this.p44SysOnEff(u, s)),
      via = "__plat" === u ? [] : this._p44Lenses().filter((x) => !(x.k in (dr || {}) && !dr[x.k]) && this.p44LensOnEff(u, x) && x.sys.some((s) => s in (dr || {}) && !dr[s]) && x.sys.some(after)).map((x) => x.n + " عبر " + x.sys.filter(after).map(nm).join(" · "));
    return { on: ks.filter((k) => dr[k]).map(nm), off: ks.filter((k) => !dr[k]).map(nm), with: this._p44SysWith(u, dr).map(nm), via: via };
  },
  /* حفظُ السقف بمساره القائم (مسؤولُ المنصة وحده — 331 setDeptCap يرفض غيرَه): التفعيلُ يضيف الصفحةَ بتبويباتها وصفحاتها، والإطفاءُ يزيلها
     ويزيل صفحاتِها التابعة — والبياناتُ وأوراقُ الموظفين باقيةٌ كما هي (تُقرأ مقصوصةً بالسقف) فتعود عند التفعيل */
  /* V7 · د6 (ب11): يعيد وعداً بالنتيجة بعد ردّ الخادم (true = حُفظ) — «حفظ ثم انتقال» ينتظره؛ والرفضُ يعيد المسودةَ ونافذةَ المراجعة بسببه.
     الكتابةُ نفسُها متزامنة كما كانت (_p44CapWrite)، والنافذةُ تُغلق فور الكتابة */
  _p44CapSave(u, dr) {
    const keys = Object.keys(dr || {});
    if (!keys.length) return Promise.resolve(!1);
    const K = "__plat" === u ? "bassam_platform_v1" : "bassam_perms_v1",
      d0 = this._p44Den(K),
      r = this._p44CapWrite(u, dr);
    /* V7 · د5-ح: الرفضُ يبقى في نافذة المراجعة بسببه (المسودةُ كما هي) · والنجاحُ يغلقها */
    if (r && !1 === r.ok) return (this._p44Set({ rev: { open: 1, kind: "sys", err: r.err || "لم يُحفظ" } }), Promise.resolve(!1));
    const want = this._p44Raw(K),
      nm = "__plat" === u ? "المنصة كلها" : this._p44Try(() => KIVO.BassamDepts.nodeOf(u).name, "");
    this._p44Set({ cap: null, rev: null });
    return this._p44Sent(K, d0, want).then((why) => {
      if ("denied" === why) {
        /* الخادمُ رفض المفتاحَ كلَّه فأعاده المخزنُ (280) كما كان — تعود المسودةُ ونافذتُها بالسبب، ولا انتقال */
        this._p44Set({ cap: { unit: u, on: Object.assign({}, dr) }, rev: { open: 1, kind: "sys", err: "رفض الخادم الحفظ — لم يتغيّر شيء. راجع الصلاحية ثم أعد المحاولة." } });
        return !1;
      }
      if ("unsent" === why) return (this.bsToast("لم يصل تأكيد حفظ أنظمة «" + nm + "» بعد — يُعاد الإرسال تلقائياً", "warn"), this._ogPendEnd(!1), !1);
      this.bsToast("حُفظت أنظمة «" + nm + "» — البيانات باقية كما هي", "ok");
      this._ogPendEnd(!0);
      keys.some((k) => dr[k]) && this._p44Widened([u]);   /* V7 · د7 (52 · الكامن): تفعيلٌ ⇒ الخطوةُ الثانية */
      return !0;
    });
  },
  /* القيمةُ المخزّنة لمفتاحٍ عامّ (للمقارنة بعد الحسم) · عدّادُ رفض الخادم له (280 denied) */
  _p44Raw(k) {
    return this._p44Try(() => localStorage.getItem(k), null);
  },
  _p44Den(k) {
    return this._p44Try(() => KIVO.__BS_SRV.denied(k) | 0, 0);
  },
  /* حسمُ الكتابة كما يحسمها المحرّك (345 commit): ما لم يبقَ كما كُتب بعد الإرسال، أو زاد عدّادُ رفضه، مرفوض — لا نجاحَ كاذب. "" | "denied" | "unsent" */
  async _p44Sent(k, d0, want) {
    const S = KIVO.__BS_SRV;
    let sent = !0;
    try {
      sent = S && S.flushAsync ? await S.flushAsync(15e3) : !0;
    } catch (e) {
      sent = !1;
    }
    if (this._p44Raw(k) !== want || this._p44Den(k) > d0) {
      this._p44Try(() => (KIVO.__BS_I.auth._pmMemo = null), null);   /* ذاكرةُ السجلّ تُقرأ من جديد من المخزن المُعاد */
      return "denied";
    }
    return !1 === sent ? "unsent" : "";
  },
  /* الكتابةُ المتزامنة لمسودة وحدةٍ واحدة بالكتّاب القائمين — كلُّها في مفتاحٍ واحد (bassam_perms_v1 · أو bassam_platform_v1 لصف المنصة) */
  _p44CapWrite(u, dr) {
    const P = KIVO.BassamPerm,
      lensK = Object.keys(dr || {}).filter((k) => /^lens\./.test(k)),   /* V7 · د7 (أ): مفاتيحُ العدسات بكاتبها القائم setDeptLenses — في المفتاح نفسِه والحفظةِ نفسِها */
      keys = Object.keys(dr || {}).filter((k) => !/^lens\./.test(k));
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
        keys.length && r.ok && (r = P.setDeptCap(u, cap) || r);
        if (lensK.length && r.ok) {
          const lz = this._p44Lenses(),
            cur = (P.deptLenses(u) || []).slice();
          lensK.forEach((k) => { const x = lz.filter((y) => y.k === k)[0], i = x ? cur.indexOf(x.L) : -1; x && (dr[k] ? i === -1 && cur.push(x.L) : i !== -1 && cur.splice(i, 1)); });
          r = P.setDeptLenses(u, lz.map((x) => x.L).filter((L) => cur.indexOf(L) !== -1)) || r;
        }
      }
    } catch (e) {
      r = { ok: !1, err: "تعذّر حفظ الأنظمة" };
    }
    return r || { ok: !0 };
  },
  /* V7 · د7 (أ): صفوفُ محرّر الدور = الأنظمةُ المفعّلة + كلُّ عدسةٍ مفعّلةٍ للوحدة تحت أول مضيفٍ حاضر (role.sys['lens.<L>'] بالمستويات نفسِها) —
     المفعّلةُ = مفتاحُ عرضها داخل سقف الوحدة (Perm44.ceiling: العدسةُ في السلسلة ∧ مضيفٌ مفعّل) */
  _p44RoleSys(did, sys) {
    const C = this._p44KeyCeil(did),
      lz = this._p44Lenses().filter((x) => this._p44Try(() => !!C(x.k + ".view"), !1)),
      done = {};
    /* flatMap: القائمةُ من نوع قائمة الأنظمة نفسِها (لا مصفوفةً جديدة من سياقٍ آخر) */
    return sys.flatMap((s) => [s].concat(lz.filter((x) => x.sys.indexOf(s.k) !== -1).map((x) => { const z = { k: x.k, n: x.n, kind: "lens", lens: !0, dup: !!done[x.k] }; done[x.k] = 1; return z; })));   /* تحت كلِّ مضيف — صفٌّ واحد في الدور (role.sys['lens.<L>']) */
  },
  /* ② الأدوار */
  _p44RoleVals(did, d, mgrV, isNode) {
    const S = this._p44S(),
      on = this._p44Ceil(did),
      sys = this._p44RoleSys(did, this._p44Sys().filter((s) => on(s.k))) /* مديرُ الإدارة لا يرى نظاماً مطفأً في سقفه — ولا مديرُ المنصة في محرّر دورٍ لهذه الإدارة */,
      holders = (id) => Object.keys(d.people || {}).filter((ek) => (d.people[ek] || {}).role === id).length,
      /* V7 · د6: القائمةُ أدوارُ الموظفين المخصّصة وحدها — «مدير المنصة» و«مدير الوحدة» في تبويب «المسؤولون» (p44AdminsVals) */
      sel = (d.roles.filter((r) => r.id === S.sel)[0] || d.roles[0] || { id: "" }).id,
      role = d.roles.filter((r) => r.id === sel)[0] || null,
      list = d.roles.map((r) => ({ id: r.id, name: r.name || "بلا اسم", sub: (holders(r.id) ? KIVO.BassamCount(holders(r.id), "شخص") : "بلا حاملين") + (r.sup ? " · إشرافي" : "") }));
    const v = {
      p44RoleList: list.map((r) => ({ n: r.name, sub: r.sub, lock: !!r.lock, on: r.id === sel ? "true" : "false", pick: () => this._p44Set({ sel: r.id, cmp: "", chk: null }) })),
      p44RoleN: String(list.length),
      p44RoleNew: () => this._p44NewRole(null),
      p44RoleNewOn: !isNode,
      p44NodeRoles: !!isNode,
      p44NodeUnits: isNode
        ? this._p44Try(() => KIVO.BassamDepts.deptsUnder(did) || [], []).map((id) => ({
            n: this._p44Try(() => KIVO.BassamDepts.nodeOf(id).name, "") || id,
            href: this.ogHref ? this.ogHref(id, "roles") : "",
            go: (ev) => {
              ev && ev.preventDefault && ev.preventDefault();
              this.p44Open(id, "roles", { sel: "" });
            },
          }))
        : [],
      p44NotSup: !!role,
      p44NoRole: !role && !isNode,
      p44Lvls: this._p44Lvls(),
    };
    if (!role) return Object.assign(v, { p44Nav: [{ n: "صفحتي", l: "" }] });   /* بلا دورٍ مختار: لا يرى إلا «صفحتي» */
    const keysAll = (k) => this._p44Keys(k),
      upd = (fn) =>
        this._p44Upd((x) => {
          const r = x.roles.filter((y) => y.id === role.id)[0];
          r && fn(r);
        });
    let rows = sys.map((s) => {
      const g = (role.sys || {})[s.k],
        isOn = !!g,
        lv = g ? g.lvl : "";
      return {
        k: s.k,
        n: s.n,
        kind: s.kind || "sys",
        isOn: isOn,
        onTxt: isOn ? "true" : "false",
        lv: lv || "view",
        sub: isOn ? this._p44LvName(lv) + ("custom" === lv ? " · " + KIVO.BassamCount((g.keys || []).length, ["فعل واحد", "فعلان", "فعلين", "أفعال", "فعلاً", "فعل"]) : "") : s.lens ? "تتبع مستوى النظام المضيف — فعّلها لتحدّد مستواها" : "غير مفعّل لهذا الدور",
        flip: () => upd((r) => ((r.sys = r.sys || {}), r.sys[s.k] ? delete r.sys[s.k] : (r.sys[s.k] = { lvl: "view" }))),
        setLv: (ev) => {
          const n = String((ev && ev.target && ev.target.value) || "view");
          upd((r) => {
            const was = (r.sys || {})[s.k] || {};
            r.sys = r.sys || {};
            /* «مخصّص» يبدأ من مفاتيح المستوى السابق — فلا يتغيّر شيءٌ حتى يُختار */
            r.sys[s.k] = "custom" === n ? { lvl: "custom", keys: was.keys || this._p44Try(() => this._p44E().keysFor(s.k, was.lvl || "view").concat(this._p44E().flagsFor(s.k, was.lvl || "view")), []) || [] } : { lvl: n };   /* V7 · 53: ومعها علمُ التصدير إن حمله المستوى */
          });
        },
        /* V7 · 53 (وضوح الصلاحيات — REVIEW بند 4 ب): تحت المستوى المختار سطرُه الوصفي وجدولُ أفعال الصف كلِّها (الفعل · المكان · الحالة) — وفي «مخصّص» مربعٌ عند كل فعلٍ يُمنح */
        lvD: isOn ? (this._p44Lvls().filter((l) => l.v === lv)[0] || {}).d || "" : "",
        tb: isOn
          ? this._p44Try(() => this._p44E().acts(s.k, role.sys, lv), []).map((x) => {   /* V7 · 53: «تصدير» فعلٌ يُختار في «مخصّص» — وبجانب المربع مستوى الفعل (الحسّاسُ «إشراف») */
              const has = (g.keys || []).indexOf(x.k) !== -1;
              return Object.assign(x, { on: has ? "true" : "false", flip: () => upd((r) => (r.sys[s.k].keys = has ? r.sys[s.k].keys.filter((y) => y !== x.k) : (r.sys[s.k].keys || []).concat([x.k]))) });
            })
          : [],
      };
    });
    /* V7 · د7 (أ): صفوفُ العدسات تُعلَّق على صفّ مضيفها (r.lz) — p44SysEd صفوفُ الأنظمة كما كان */
    rows.forEach((r, i) => { if (r.kind === "lens") return; r.lz = []; for (let j = i + 1; j < rows.length && rows[j].kind === "lens"; j++) r.lz.push(rows[j]); r.lzOn = r.lz.length > 0; });
    const rowsAll = rows;
    rows = rowsAll.filter((r) => r.kind !== "lens");
    const comp = this._p44Compile(role, did),
      cmpId = S.cmp && d.roles.some((r) => r.id === S.cmp && r.id !== role.id) ? S.cmp : "",
      cmp = cmpId ? d.roles.filter((r) => r.id === cmpId)[0] : null,
      chk = S.chk || {},
      chkKeys = [].concat.apply(
        [],
        sys.filter((s) => !s.dup).map((s) => keysAll(s.k).map((k) => ({ v: k, t: s.n + " · " + this._p44Label(k) }))),
      ),
      ck = chk.key && chkKeys.some((x) => x.v === chk.key) ? chk.key : (chkKeys[0] || {}).v || "";
    return Object.assign(v, {
      p44Role: { n: role.name || "بلا اسم", d: role.desc || "", badge: role.sup ? "دور إشرافي" : "دور", members: holders(role.id) ? KIVO.BassamCount(holders(role.id), "شخص") + " " + KIVO.BassamCount.agr(holders(role.id), "يحمل", "يحملان", "يحملون") + " هذا الدور" : "لا يحمل هذا الدور أحد بعد" },
      /* V7 · د6 (ب7): «حاملو الدور» بأسمائهم من المسودة نفسِها (عددُهم = holders) — كلٌّ يُفتح في «الأشخاص» لوحدته مختاراً */
      p44RoleHold: Object.keys(d.people || {})
        .filter((ek) => (d.people[ek] || {}).role === role.id)
        .map((ek) => ({ n: this._p44PName(ek), go: () => this.p44Open(did, "people", { pSel: ek, exForm: null }) })),
      p44RoleHoldNone: !holders(role.id),
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
      p44AllOn: () => upd((r) => ((r.sys = r.sys || {}), sys.forEach((s) => s.lens || r.sys[s.k] || (r.sys[s.k] = { lvl: "view" })))),   /* V7 · د7 (أ): العدسةُ بلا صفٍّ تتبع مستوى مضيفها */
      /* V7 · د7 (52 · الجرد ٢): «إيقاف الكل» يُطفئ الصفوفَ المعروضة وحدها (sys = المفعّلُ في السقف) — صفوفُ الأنظمة المطفأة والعدسات التي لا يعرضها المحرّر تُحمل كما هي مخزّنة، فتعود متى أُعيد التشغيل.
         V7 · د7 (أ): وصفوفُ العدسات المعروضة (المفعّلةُ للوحدة) في sys نفسِه — تُحذف مع الأنظمة، والمطفأةُ تبقى */
      p44AllOff: () => upd((r) => ((r.sys = r.sys || {}), sys.forEach((s) => delete r.sys[s.k]))),
      p44Nav: this._p44Menu(comp, role, did),
      p44CmpOpts: [{ v: "", t: "— اختر دوراً —" }].concat(d.roles.filter((r) => r.id !== role.id).map((r) => ({ v: r.id, t: r.name || "بلا اسم" }))),
      p44CmpVal: cmpId,
      p44CmpSet: (ev) => this._p44Set({ cmp: String((ev && ev.target && ev.target.value) || "") }),
      p44CmpOn: !!cmp,
      p44CmpName: cmp ? cmp.name : "",
      p44CmpRows: cmp ? this.p44Compare(role, cmp, sys.filter((s) => !s.dup)) : [],   /* V7 · د7 (أ): والعدساتُ صفوفٌ في المقارنة */
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
  /* V7 · د6 · تبويب «المسؤولون»: بطاقةُ «مدير المنصة» لصف «المنصة كلها» وبطاقةُ «مدير الوحدة» لكل وحدة — القيمُ نفسُها التي كانت في «الأدوار» (د5-ح) منقولةً:
     في «مركز إدارة رشاد» جدولُ حسابات الوحدة كما كان (تركّبه الصفحةُ المضيفة في موضعه ogSlotAdmins) وزرُّ «+» لمدير المنصة وحده؛ وفي عرض المدير حاملوه قراءةً */
  p44AdminsVals(did, isNode, mgrV) {
    if ("__plat" === did)
      return { p44IsSup: !0, p44IsMgr: !1, p44Role: { n: "مدير المنصة", d: "صاحب المنصة: لا قيد عليه في أي نظام أو إدارة.", badge: "دور النظام" } };
    const mgrs = this._p44Mgrs(did, isNode);
    return {
      p44IsSup: !1,
      p44IsMgr: !0,
      p44Role: { n: "مدير الوحدة", d: "يعمل بكامل سقف وحدته ويعتمد جداولها وتقاريرها — يعيّنه مدير المنصة وحده.", badge: "دور النظام", members: mgrs.length ? KIVO.BassamCount(mgrs.length, "شخص") + " " + KIVO.BassamCount.agr(mgrs.length, "يحمل", "يحملان", "يحملون") + " هذا الدور" : "لا يحمل هذا الدور أحد بعد" },
      p44MgrFull: !mgrV && !this.__p44Dept,
      p44MgrRO: mgrV || !!this.__p44Dept,
      p44MgrAddOn: this._p44SupNow() && !mgrV,
      p44MgrHold: mgrs.map((m) => ({ n: m.name || m.un || "—", st: m.dis ? "موقوف" : "نشط" })),
      p44MgrNone: !mgrs.length,
      p44MgrN: mgrs.length,
    };
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
      p44RevClose: () => R.busy || (this._p44Set({ rev: null }), this._ogPendEnd(!1)),   /* V7 · د6 (ب11): «رجوع» من «حفظ ثم انتقال» = البقاء */
      p44RevOut: () => this._p44S().rev && this._p44S().rev.busy ? void 0 : (this._p44Set({ rev: null }), this._ogPendEnd(!1)),
      p44RevSave: () => this._p44Save(),
    };
  },
  /* V7 · د6 (QA): نظامٌ مفعّلٌ لدورٍ بمستوى «مخصّص» وبلا فعلٍ واحد يبدو مفعّلاً ولا يعطي شيئاً — يُمنع حفظُه برسالةٍ تسمّي موضعه
     (قرارُ المالك: المنعُ لا الإطفاءُ التلقائي) — "" = لا شيء */
  _p44EmptyCustom(roles) {
    const bad = [];
    (roles || []).forEach((r) => Object.keys((r && r.sys) || {}).forEach((k) => {
      const g = r.sys[k];
      if (g && "custom" === g.lvl && !(Array.isArray(g.keys) && g.keys.length)) bad.push((r.name || "دور") + " · " + this._p44SysName(k));
    }));
    return bad.length ? "اختر فعلاً واحداً على الأقل أو أطفئ النظام — " + bad.join("، ") : "";
  },
  async _p44Save() {
    const E = this._p44E(),
      S = this._p44S(),
      d = S.d;
    if (!E || !d || (S.rev && S.rev.busy)) return !1;   /* V7 · د6 (م6): يعيد true حين حُفظ ثم !1 عند الرفض */
    const empty = this._p44EmptyCustom(d.roles);
    if (empty) return this._p44Set({ rev: { open: 1, err: empty } }), !1;
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
      return this._p44Set({ rev: { open: 1, err: why } }), !1;
    }
    this._p44Set((s) => ({ rev: null, d: s.d ? Object.assign({}, s.d, { base: { roles: roles, people: people } }) : s.d, log: null }));
    this.bsToast("حُفظت الصلاحيات — " + this.p44AffLine(aff.length), "ok");
    this._ogPendEnd(!0);   /* V7 · د6 (ب11): «حفظ ثم انتقال» يكمل الانتقال بعد الحفظ وحده */
    return !0;   /* V7 · د6 (م6): true حين حُفظ — والرفضُ !1 (الحارسُ ينتظر في مكانه) */
  },
  /* ③ الأشخاص */
  _p44PeopleVals(did, d) {
    const S = this._p44S(),
      D = KIVO.BassamDepts,
      X = this._acctCtx ? this._p44Try(() => this._acctCtx(), { l: {}, now: Date.now() }) : { l: {}, now: Date.now() },
      now = Date.now(),
      q = String(S.q || "").trim(),
      f = S.pf || "all",
      users = this.p44PeopleOf(did, !1),
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
      /* V7 · د6 (قرار المالك — الرد 2 · ٣): سطرٌ واحد فوق قائمته الحقيقية، وصفاً لا بديلاً عنها */
      p44PMgrLine: sel.mgr ? "مدير الوحدة · يعمل بسقف وحدته كله" : "",
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
      p44PNav: this._p44Menu(sel.mgr || !(d.people || {})[sel.ekey] ? null : eff, sel.mgr ? null : rl, did, sel),   /* V7 · د6 (أ1): المديرُ ومن لا سجلَّ دورٍ له: المحفوظُ لهما من المصدر نفسِه */
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
    this._p44Set((st) => ({ d: Object.assign({}, st.d || d, { roles: r.roles, people: r.people }), rev: { open: 1 } }));
    this.go && this.go(did, "roles", { force: !0 });   /* V7 · د6: المراجعةُ تُعرض في تبويب «الأدوار» — انتقالٌ بالعنوان (المسودةُ هي التراجعُ نفسُه فلا يُسأل عنها) */
  },
  /* ═══════════ V7 · د6 (ب2 · م5): تطبيقُ الأنظمة على الوحدات المحددة في الشجرة — خطّافُ logic.js _ogBulk ═══════════
     نافذةٌ تختار الأنظمة ← «مراجعة قبل الحفظ» لكل وحدة: ما يتغيّر · ما يُطفأ معه · وما يُتخطّى (المقفلُ من فوق بسببه «مطفأ من: …» — لا يُفعَّل أبداً)
     ← حفظٌ واحد كلُّه أو لا شيء: كتّابُ السقف القائمون كلُّهم يكتبون مفتاحاً واحداً (bassam_perms_v1) فيذهب في طلب حفظٍ واحد يقبله الخادمُ كلَّه أو يرفضه
     كلَّه (والمخزنُ يعيده كما كان). المفعّلُ من الدالة الواحدة p44SysOnEff والقفلُ من _p44LockSrc — كما يرسم تبويبُ «الأنظمة» */
  orgBulkApply(mode, unitIds) {
    if (!this._p44SupNow()) return !1;
    const D = KIVO.BassamDepts,
      order = this._p44Try(() => (D.railTree() || []).map((r) => r.id), []),
      units = (unitIds || []).filter((id) => id && "__plat" !== id).sort((a, b) => order.indexOf(a) - order.indexOf(b));
    if (!units.length) return !1;
    this._p44Set({ bulk: { mode: "off" === mode ? "off" : "on", units: units, pick: {}, step: "pick", err: "", busy: 0 } });
    return !0;
  },
  /* الخطةُ لكل وحدة: ch (يتغيّر) · skip (مقفلٌ من فوق، بسببه) · same (على الحال المطلوبة أصلاً) · with (يُطفأ معه) · dr (مسودتُها للكاتب) */
  p44BulkPlan(mode, units, keys) {
    const off = this._p44PlatOff(),
      want = "on" === mode,
      sys = this._p44Sys().filter((s) => s.tg && keys.indexOf(s.k) !== -1),
      nm = (u) => this._p44Try(() => KIVO.BassamDepts.nodeOf(u).name, "") || u;
    return units.map((u) => {
      const ch = [],
        skip = [],
        same = [],
        dr = {};
      sys.forEach((s) => {
        const L = this._p44LockSrc(u, s, off);
        if (L) return void skip.push({ k: s.k, n: s.n, why: "مطفأ من: " + L.n + (want && units.indexOf(L.id) !== -1 ? " — محدَّدةٌ معها: أعد التطبيق بعد الحفظ" : "") });
        (this.p44SysOnEff(u, s, off) === want ? same : ch).push({ k: s.k, n: s.n });
      });
      ch.forEach((x) => (dr[x.k] = want));
      return { u: u, name: nm(u), ch: ch, skip: skip, same: same, dr: dr, with: want ? [] : this._p44SysWith(u, dr).map((k) => this._p44SysName(k)) };
    });
  },
  p44BulkVals() {
    const B = this._p44S().bulk;
    if (!B) return { p44BulkOn: !1 };
    const on = "on" === B.mode,
      sys = this._p44Sys().filter((s) => s.tg),
      keys = sys.map((s) => s.k).filter((k) => B.pick[k]),
      set = (patch) => this._p44Set((st) => ({ bulk: st.bulk ? Object.assign({}, st.bulk, typeof patch === "function" ? patch(st.bulk) : patch) : null })),
      nm = (u) => this._p44Try(() => KIVO.BassamDepts.nodeOf(u).name, "") || u,
      v = {
        p44BulkOn: !0,
        p44BulkMode: B.mode,
        p44BulkT: (on ? "تفعيل أنظمة" : "إطفاء أنظمة") + " للمحدد — " + KIVO.BassamCount(B.units.length, "وحدة"),
        p44BulkUnits: B.units.map(nm).join(" · "),
        p44BulkPick: "pick" === B.step,
        p44BulkRev: "rev" === B.step,
        p44BulkSys: sys.map((s) => ({ k: s.k, n: s.n, on: B.pick[s.k] ? "true" : "false", flip: () => set((b) => ({ pick: Object.assign({}, b.pick, { [s.k]: !b.pick[s.k] }) })) })),
        p44BulkPickN: KIVO.BassamCount(keys.length, "نظام") + " من " + sys.length,
        p44BulkAll: () => set({ pick: sys.reduce((m, s) => ((m[s.k] = !0), m), {}) }),
        p44BulkNone: () => set({ pick: {} }),
        p44BulkNoPick: !keys.length,
        p44BulkNext: () => keys.length && set({ step: "rev", err: "" }),
        p44BulkBack: () => B.busy || set({ step: "pick", err: "" }),
        p44BulkClose: () => B.busy || this._p44Set({ bulk: null }),
        p44BulkBusy: !!B.busy,
        p44BulkErr: B.err || "",
      };
    if ("rev" !== B.step) return v;
    const plan = this.p44BulkPlan(B.mode, B.units, keys),
      nCh = plan.reduce((a, p) => a + p.ch.length, 0),
      nSk = plan.reduce((a, p) => a + p.skip.length, 0),
      nU = plan.filter((p) => p.ch.length).length;
    return Object.assign(v, {
      p44BulkRows: plan.map((p) => ({
        id: p.u,
        name: p.name,
        ch: p.ch.map((x) => x.n).join(" · "),
        chOn: p.ch.length > 0,
        chLbl: on ? "يُفعَّل" : "يُطفأ",
        with: p.with.join(" · "),
        withOn: p.with.length > 0,
        skip: p.skip.map((x) => ({ n: x.n, why: x.why })),
        skipOn: p.skip.length > 0,
        same: p.same.map((x) => x.n).join(" · "),
        sameOn: p.same.length > 0,
        sameLbl: on ? "مفعّل أصلاً" : "مطفأ أصلاً",
        none: !p.ch.length,
      })),
      p44BulkSum: nCh ? "يتغيّر " + KIVO.BassamCount(nCh, "نظام") + " في " + KIVO.BassamCount(nU, "وحدة") + (nSk ? " · يُتخطّى " + KIVO.BassamCount(nSk, "نظام") + " مقفل من فوق" : "") : "لا شيء يتغيّر في الوحدات المحددة" + (nSk ? " — المقفلُ من فوق يُتخطّى" : ""),
      p44BulkNote: "الحفظ واحدٌ للوحدات كلها: يُقبل كلُّه أو يُرفض كلُّه. إطفاء نظام لا يحذف بياناته.",
      p44BulkSaveOff: !nCh || !!B.busy,
      p44BulkSave: () => this.p44BulkSave(),
    });
  },
  async p44BulkSave() {
    const B = this._p44S().bulk;
    if (!B || B.busy) return !1;
    const keys = Object.keys(B.pick || {}).filter((k) => B.pick[k]),
      plan = this.p44BulkPlan(B.mode, B.units, keys).filter((p) => p.ch.length),
      fail = (err) => (this._p44Set((st) => ({ bulk: st.bulk ? Object.assign({}, st.bulk, { busy: 0, step: "rev", err: err }) : null })), !1);
    if (!plan.length) return !1;
    if (!this._p44SupNow()) return fail("سقف الإدارة لمسؤول المنصة وحده");
    const K = "bassam_perms_v1",
      d0 = this._p44Den(K),
      before = this._p44Raw(K);
    let r = { ok: !0 };
    for (let i = 0; i < plan.length && r && !1 !== r.ok; i++) r = this._p44CapWrite(plan[i].u, plan[i].dr);
    if (r && !1 === r.ok) {
      /* رفضٌ محلّيّ في منتصفها: السجلُّ يعود كما كان قبل أولِ وحدة — لا يبقى نصفُ تطبيق */
      this._p44Try(() => (null == before ? localStorage.removeItem(K) : localStorage.setItem(K, before)), null);
      this._p44Try(() => (KIVO.__BS_I.auth._pmMemo = null), null);
      return fail((r.err || "لم يُحفظ") + " — لم يتغيّر شيء في أي وحدة");
    }
    const want = this._p44Raw(K);
    this._p44Set((st) => ({ bulk: st.bulk ? Object.assign({}, st.bulk, { busy: 1, err: "" }) : null }));
    const why = await this._p44Sent(K, d0, want);
    if ("denied" === why) return fail("رفض الخادم الحفظ — لم يتغيّر شيء في أي وحدة (الحفظ كلُّه أو لا شيء). راجع الصلاحية ثم أعد المحاولة.");
    if ("unsent" === why) return fail("لم يصل تأكيد الحفظ بعد — يُعاد الإرسال تلقائياً، ويُقبل كلُّه أو يُرفض كلُّه.");
    this._p44Set({ bulk: null });
    this.setState({ ogSel: {} });
    this.bsToast((("on" === B.mode) ? "فُعّلت" : "أُطفئت") + " الأنظمة المختارة في " + KIVO.BassamCount(plan.length, "وحدة") + " — البيانات باقية كما هي", "ok");
    "on" === B.mode && this._p44Widened(plan.map((p) => p.u));   /* V7 · د7 (52 · الكامن) */
    return !0;
  },
  /* V7 · د7 (52 · الكامن): بعد توسيع سقفٍ أكّده الخادم — منحُ الأدوار في الوحدات وفروعها يُعاد حسابُه بالسقف الجديد (KIVO.Perm44.refreshUnits) في حفظٍ ثانٍ.
     فشلُه لا يُكتم: السقفُ موسَّعٌ كما حُفظ، والمنحُ كما كان، والحافظُ يُعلَم */
  _p44Widened(units) {
    const msg = "وُسِّع السقف، وتعذّر تحديث صلاحيات الأدوار: تظهر عند أول حفظ لدور الموظف";
    let p;
    try { p = KIVO.Perm44 && KIVO.Perm44.refreshUnits ? KIVO.Perm44.refreshUnits(units) : null; } catch (e) { p = Promise.resolve({ ok: !1 }); }
    return Promise.resolve(p).then((x) => { if (x && !1 === x.ok) this.bsToast(msg, "err"); return x; }, () => (this.bsToast(msg, "err"), { ok: !1 }));
  },
  /* ═══════════ V7 · د6 (ب11 · م5): حارسُ التغييرات غير المحفوظة — واجهةُ logic.js (dirty ← orgDirty · canLeave ← orgGuard) ═══════════
     سجلٌّ صغير لمصادر المسودّات: كلُّ تبويبٍ يحمل تعديلاً غيرَ محفوظ مصدرٌ { k, t, unit, tab, dirty(), review(), drop() } — review تفتح «مراجعة قبل الحفظ»
     وحفظُها الناجح يستدعي _ogPendEnd(true) و«رجوع» منها _ogPendEnd(false). المصدران القائمان هنا: مسودةُ «الأنظمة» (cap) ومسودةُ «الأدوار» و«الأشخاص» (d)؛
     وتبويبٌ آخر يسجّل مصدرَه بـ orgDirtyReg(src) (م6). السؤال: «حفظ ثم انتقال» · «تجاهل وانتقال» · «البقاء» — عند تغيير الوحدة أو التبويب أو مغادرة الصفحة؛
     وإغلاقُ المتصفح أو تحديثُه بتحذيره الأصلي (logic.js beforeunload ← dirty) */
  orgDirtyReg(src) {
    src && src.k && ((this.__ogSrc = this.__ogSrc || {})[src.k] = src);
  },
  orgDirtySources() {
    const S = this._p44S(),
      rt = this._ogRoute ? this._p44Try(() => this._ogRoute(), {}) : {},
      nm = (u) => ("__plat" === u ? "المنصة كلها" : this._p44Try(() => KIVO.BassamDepts.nodeOf(u).name, "") || ""),
      cu = S.cap && S.cap.unit,
      du = S.d && S.d.did,
      own = [
        { k: "systems", t: "الأنظمة · " + nm(cu), unit: cu, tab: "systems", dirty: () => !!this._p44S().cap && Object.keys(this._p44S().cap.on || {}).length > 0, review: () => this._p44Set({ rev: { open: 1, kind: "sys" } }), drop: () => this._p44Set({ cap: null, rev: null }) },
        { k: "perm", t: ("people" === rt.tab ? "الأشخاص" : "الأدوار") + " · " + nm(du), unit: du, tab: "people" === rt.tab ? "people" : "roles", dirty: () => this._p44Dirty(this._p44S().d), review: () => this._p44Set({ rev: { open: 1 } }), drop: () => this._p44Upd((x) => ((x.roles = x.base.roles), (x.people = x.base.people))) },
      ];
    return own.concat(Object.keys(this.__ogSrc || {}).map((k) => this.__ogSrc[k]));
  },
  _ogDirtyOf() {
    return this.orgDirtySources().filter((s) => this._p44Try(() => !!s.dirty(), !1));
  },
  orgDirty() {
    return this._ogDirtyOf().length > 0;
  },
  async orgGuard(next) {
    const src = this._ogDirtyOf()[0];
    if (!src) return !0;
    this._ogPendEnd(!1);
    const a = await this._ogAsk(src, next || {});
    if ("drop" === a) return (this._ogDirtyOf().forEach((s) => this._p44Try(() => s.drop(), null)), !0);
    if ("save" !== a) return !1;
    /* «حفظ ثم انتقال» = «مراجعة قبل الحفظ» للمسودة في تبويبها؛ والانتقالُ بعد الحفظ الناجح وحده — الرفضُ أو «رجوع» يُبقيان في المكان */
    const rt = this._ogRoute ? this._p44Try(() => this._ogRoute(), null) : null;
    if (rt && src.unit && (rt.unit !== src.unit || rt.tab !== src.tab) && this.go) await this.go(src.unit, src.tab, { force: !0 });
    const ok = await new Promise((res) => {
      this.__ogPend = res;
      src.review();
    });
    if (!ok) return !1;
    return this.orgDirty() ? this.orgGuard(next) : !0;
  },
  _ogAsk(src, next) {
    return new Promise((res) => {
      const prev = this.__ogAskRes;
      this.__ogAskRes = res;
      prev && prev("stay");
      this.setState({ ogAsk: { t: src.t, leave: !!(next && next.leave) } });
    });
  },
  _ogAnswer(a) {
    const r = this.__ogAskRes;
    this.__ogAskRes = null;
    this.setState({ ogAsk: null });
    r && r(a);
  },
  _ogPendEnd(ok) {
    const r = this.__ogPend;
    this.__ogPend = null;
    r && r(!!ok);
  },
  ogAskVals() {
    const A = this.state.ogAsk;
    if (!A) return { ogAskOn: !1 };
    return {
      ogAskOn: !0,
      ogAskTxt: "في «" + A.t + "» تغييرٌ غير محفوظ — " + (A.leave ? "مغادرةُ الصفحة" : "الانتقالُ") + " بلا حفظ يتجاهله.",
      ogAskSave: () => this._ogAnswer("save"),
      ogAskDrop: () => this._ogAnswer("drop"),
      ogAskStay: () => this._ogAnswer("stay"),
    };
  },
});
