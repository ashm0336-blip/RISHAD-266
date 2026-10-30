/* KIVO_265 · البند 19 (تقسيمُ منطق صفحة المهام) — جزءُ «الفلاتر الإضافية» (البند 14): المفاتيحُ المحفوظة للمسؤول · الورديةُ من الجدول الشهري
   · فهرسُ الموظفين · المقارنُ العربي الواحد · ذاكرةُ قراءة المخازن (_tkLS). يُجمَع بعد logic.js بترتيب meta.json "logicParts". */
"use strict";
Object.assign(Component.prototype, {
  /* ═══ KIVO_265 · البند 14 — الفلاتر الإضافية: المفاتيحُ المحفوظة · القراءةُ والحفظُ للمسؤول · حكمُ الصفّ ═══ */
  _tkFltKeys() {
    return ["fStatus", "fPrio", "fAsg", "fShift", "fWt", "fRv", "fRec", "fMine", "fNoProof"];
  },
  _tkFltKey() {
    const me = this._tkMe();
    return "bassam_tasks_filters_v1:" + ((me && me.id) || "anon");
  },
  _tkFltLoad() {
    const o = {};
    try {
      const s = JSON.parse(localStorage.getItem(this._tkFltKey()));
      s &&
        "object" === typeof s &&
        this._tkFltKeys().forEach((k) => {
          const v = s[k];
          ("fRec" === k || "fMine" === k || "fNoProof" === k ? "boolean" === typeof v : "string" === typeof v && v) && (o[k] = v);
        });
    } catch (t) {
      return {};   /* لا تخزينَ أو نصٌّ تالف ⇒ الافتراضيات */
    }
    return o;
  },
  _tkFltSave() {
    try {
      const o = {};
      this._tkFltKeys().forEach((k) => (o[k] = this.state[k]));
      localStorage.setItem(this._tkFltKey(), JSON.stringify(o));
    } catch (t) {}
  },
  _tkFltSet(p) {
    this.setState(Object.assign({ page: 1, fddOpen: null }, p), () => this._tkFltSave());
  },
  _tkFltClear() {
    this._tkFltSet({ fStatus: "all", fPrio: "all", fAsg: "all", fShift: "all", fWt: "all", fRv: "all", fRec: !1, fMine: !1, fNoProof: !1 });
  },
  _tkFltCount() {
    const e = this.state;
    return this._tkFltKeys().filter((k) => ("fRec" === k || "fMine" === k || "fNoProof" === k ? !!e[k] : "all" !== (e[k] || "all"))).length;
  },
  _tkRvMine(rv, me) {
    return !!(rv && me && ((rv.u && String(rv.u) === String(me.id || "")) || (rv.e && me.ekey && String(rv.e) === String(me.ekey))));
  },
  /* ورديةُ الموظف في شهر المهمة من الجدول الشهري (كما يقرؤها المنتقي — tkPickModel) */
  _tkShiftMap(y, m) {
    if (!this.bsOn("staff")) return {};
    const t = this._tkLS("bassam_staffing_v3"),
      all = t && "object" === typeof t ? (KIVO.BassamStaffSnap ? KIVO.BassamStaffSnap.all(t) : t) : {};
    return (all && all[y + "-" + m]) || {};
  },
  _tkShiftOf(emp, SM) {
    if (!emp) return "";
    const k = KIVO.BassamEmp ? KIVO.BassamEmp.key(emp) : emp.eid || emp.nid || emp.name;
    return String(((KIVO.BassamEmp ? KIVO.BassamEmp.entry(SM, emp) : SM[k]) || {}).shift || "");
  },
  /* KIVO_265 · عمودُ «الوردية» (طلبُ المالك 2026-10-20 «الوردية · المهلة · المخطط/الفعلي · الحالة كنموذج صفحة المهام المقترح»): ورديةُ المكلَّف
     من الجدول الشهري — المصدرُ نفسُه لفلتر الوردية وتقرير الإنتاجية فلا يختلفان · العامةُ «—» · ومن بلا وردية «بلا وردية» */
  _tkShiftCell(r, SM, EI, SO) {
    const ek = null == r[14] ? "" : String(r[14]),
      none = (txt, tip) => ({ shName: "", shTxt: txt, shTip: tip, shOn: !1, shNone: !0, shDot: "", shTime: "" });
    if (!ek) return none("—", "مهمة عامة — بلا مكلَّف" + (r[19] ? " · " + r[19] : ""));
    const emp = EI.byKey[ek] || null,
      sh = emp ? this._tkShiftOf(emp, SM) : "",
      o = sh ? SO[sh] : null;
    if (!sh) return none(emp ? "بلا وردية" : "—", emp ? "لا وردية له في الجدول الشهري لهذا الشهر" : "تعذّر ربط المكلَّف بسجلّ موظف");
    return {
      shName: sh,
      shTxt: sh,
      shTip: sh + " — من الجدول الشهري",
      shOn: !0,
      shNone: !1,
      shDot: "width:8px;height:8px;border-radius:50%;flex-shrink:0;background:" + ((o && o.color) || "var(--text-faint)"),
      shTime: o && o.tStart && o.tEnd ? o.tStart + "–" + o.tEnd : "",
    };
  },
  /* فهرسُ الموظفين بالرمز الذي يُسند به (العمود 14) — يُبنى مرةً لكل نسخةٍ من القائمة */
  _tkEmpIx() {
    const E = this.loadEmps(),
      c = this._tkEmpIxC;
    if (c && c.src === E) return c;
    const byKey = {};
    E.forEach((e) => {
      (KIVO.BassamEmp ? KIVO.BassamEmp.tokens(e) : [e.eid, e.nid, e.name]).forEach((k) => {
        k && !byKey[k] && (byKey[k] = e);
      });
    });
    return (this._tkEmpIxC = { src: E, byKey: byKey });
  },
  _tkFltCtx() {
    const e = this.state;
    return { me: this._tkMe() || {}, EI: this._tkEmpIx(), SM: this._tkShiftMap(e.year, e.month), M: this._tkM(), on: this._tkFltCount() > 0 };
  },
  _tkFltRow(r, FX) {
    const e = this.state,
      ek = null == r[14] ? "" : String(r[14]),
      emp = ek ? FX.EI.byKey[ek] || null : null,
      x = FX.M && r[23] && "object" === typeof r[23] ? r[23] : null;
    if ("all" !== e.fAsg && ("none" === e.fAsg ? !!ek : ek !== e.fAsg)) return !1;
    if ("all" !== e.fShift) {
      const sh = this._tkShiftOf(emp, FX.SM);
      if ("none" === e.fShift ? !!sh : sh !== e.fShift) return !1;
    }
    if ("all" !== e.fWt && String(r[19] || "") !== e.fWt && String((emp && emp.work) || "").trim() !== e.fWt) return !1;
    if (e.fRec && !(x && x.rec && "object" === typeof x.rec && x.rec.id)) return !1;
    const rv = x && x.rv && "object" === typeof x.rv && (x.rv.u || x.rv.e) ? x.rv : null;
    if ("all" !== e.fRv && ("none" === e.fRv ? !!rv : "me" === e.fRv ? !this._tkRvMine(rv, FX.me) : !(rv && String(rv.u) === e.fRv))) return !1;
    if (e.fMine && !(FX.M && this._tkRvMine(rv, FX.me) && "pending" === FX.M.state(r).rev)) return !1;
    if (e.fNoProof && r[21] && "object" === typeof r[21] && ((Array.isArray(r[21].imgs) && r[21].imgs.length) || r[21].note)) return !1;
    return !0;
  },
  /* قيمُ شريط الفلاتر الإضافية (مطويٌّ افتراضياً · عدّادٌ · مسح) */
  _tkFltVals(rows) {
    const e = this.state,
      n = this._tkFltCount(),
      SM = this._tkShiftMap(e.year, e.month),
      col = this._tkColl(),
      emps = this.loadEmps()
        .map((t) => ({ v: String(KIVO.BassamEmp ? KIVO.BassamEmp.key(t) : t.eid || t.nid || t.name), name: t.name || "موظف" }))
        .filter((o) => o.v && "undefined" !== o.v)
        .sort((a, b) => col(a.name, b.name)),
      shifts = this.tkShiftOpts().map((t) => t.name);
    Object.keys(SM).forEach((k) => {
      const s = SM[k] && SM[k].shift;
      s && shifts.indexOf(s) < 0 && shifts.push(s);
    });
    const rvs = {};
    (rows || []).forEach((t) => {
      const x = t.tkcT && t.tkcT[23] && "object" === typeof t.tkcT[23] ? t.tkcT[23] : null,
        rv = x && x.rv && "object" === typeof x.rv && x.rv.u ? x.rv : null;
      rv && !rvs[String(rv.u)] && (rvs[String(rv.u)] = String(rv.n || rv.u));
    });
    const chip = (on) => this._tkChip(on);
    return {
      tfxOpen: !!e.tfxOpen,
      tfxToggle: () => this.setState((s) => ({ tfxOpen: !s.tfxOpen, fddOpen: null })),
      tfxCount: String(n),
      tfxHas: n > 0,
      tfxLabel: "فلاتر" + (n ? " · " + n : ""),
      tfxChev: "transition:transform .2s;flex-shrink:0;opacity:.6;" + (e.tfxOpen ? "transform:rotate(180deg)" : ""),
      tfxBtnStyle:
        "height:32px;font-size:11px;border-radius:8px;padding:0 10px;cursor:pointer;font-family:'Cairo',sans-serif;display:inline-flex;align-items:center;gap:6px;border:1px " +
        (n ? "solid var(--tone-gold-50-a40);background:var(--tone-gold-50-a10);color:var(--brand-text);font-weight:700" : "dashed var(--border-default);background:var(--bg-surface);color:var(--text-secondary)") +
        (e.tfxOpen ? ";box-shadow:0 0 0 2px var(--tone-gold-50-a10)" : ""),
      tfxClear: () => this._tkFltClear(),
      ...this.filterDD("tfa", "fAsg", "كل المكلَّفين", [{ v: "all", name: "كل المكلَّفين" }, { v: "none", name: "بدون إسناد" }].concat(emps)),
      ...this.filterDD("tfh", "fShift", "كل الورديات", [{ v: "all", name: "كل الورديات" }, { v: "none", name: "بلا وردية" }].concat(shifts.map((s) => ({ v: s, name: s })))),
      ...this.filterDD("tfw", "fWt", "كل أنواع العمل", [{ v: "all", name: "كل أنواع العمل" }].concat(this.tkWorkTypes().map((s) => ({ v: s, name: s })))),
      ...this.filterDD(
        "tfr",
        "fRv",
        "كل المراجِعين",
        [{ v: "all", name: "كل المراجِعين" }, { v: "me", name: "أنا المراجِع" }, { v: "none", name: "بلا مراجِع" }].concat(Object.keys(rvs).map((u) => ({ v: u, name: rvs[u] }))),
      ),
      tfxChips: [
        ["fRec", "المتكررة فقط"],
        ["fMine", "بانتظاري أنا"],
        ["fNoProof", "بلا توثيق"],
      ].map(([k, l]) => ({ label: l, on: !!e[k], style: chip(!!e[k]), click: () => this._tkFltSet({ [k]: !e[k] }) })),
    };
  },
  /* مقارنٌ عربيّ واحدٌ مُعدٌّ مسبقاً (Intl.Collator) — localeCompare لكل مقارنةٍ كان يبني مقارِناً في كل مرة (البند 13: 1200 موظف) */
  _tkColl() {
    if (!this._tkCollF) {
      let c = null;
      try {
        c = new Intl.Collator("ar");
      } catch (t) {
        c = null;
      }
      this._tkCollF = c ? (a, b) => c.compare(String(a), String(b)) : (a, b) => String(a).localeCompare(String(b));
    }
    return this._tkCollF;
  },
  /* KIVO_265 · البند 13: قراءةٌ مخزَّنة لمخازن localStorage الكبيرة — JSON.parse مرةً لكل نصّ؛ يُبطَل بتغيّر النصّ (مقارنةٌ حرفية رخيصة)
     أو بحدث المخزن (_tkLSBust من componentDidMount). المصفوفةُ المعادة مشتركة: تُقرأ ولا تُعدَّل */
  _tkLS(k) {
    const C = (this._tkLSC = this._tkLSC || {});
    let raw = null;
    try {
      raw = localStorage.getItem(k);
    } catch (t) {
      raw = null;
    }
    const c = C[k];
    if (c && c.raw === raw) return c.v;
    let v = null;
    try {
      v = raw ? JSON.parse(raw) : null;
    } catch (t) {
      v = null;
    }
    return ((C[k] = { raw: raw, v: v }), v);
  },
  _tkLSBust() {
    ((this._tkLSC = null), (this._tkPickC = null), (this._tkEmpIxC = null), (this._tkEmpNmC = null));
  },
});
