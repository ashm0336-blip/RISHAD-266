/* KIVO_265 · البند 19 (تقسيمُ منطق صفحة المهام) — جزءُ «الإعدادات المتقدمة»: الإثباتُ والمراجِع والاعتذار ونافذةُ التنفيذ (البند 1) في الإنشاء
   والتعديل · /api/tasks/settings بعد وصول التعديل · صفُّ التعديل بهويته. يُجمَع بعد logic.js بترتيب meta.json "logicParts". */
"use strict";
Object.assign(Component.prototype, {
  /* الإعداداتُ المتقدمة ⇒ حقولُ x (العمود 23) كما يقبلها الخادم */
  _tkAdvBody() {
    const e = this.state,
      pol = { m: e.newPol || "any" };
    ("img" !== pol.m && "both" !== pol.m) || (pol.n = Math.min(4, Math.max(1, +e.newPolN || 1)));
    const st = String(e.newSteps || "")
      .split(/\n+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 12)
      .map((t) => t.slice(0, 120));
    st.length && (pol.steps = st);
    const rv = !e.newRv || "creator" === e.newRv ? "creator" : "none" === e.newRv ? "none" : { u: e.newRv },
      cl = (v, lo, hi, d) => (isFinite(+v) ? Math.min(hi, Math.max(lo, Math.floor(+v))) : d),
      win = { early: e.newWinEarlyOn ? cl(e.newWinEarly, 0, 240, 10) : 0, late: e.newWinLateOn ? cl(e.newWinLate, 0, 24, 2) : 0 };   /* KIVO_265 · نافذةُ التنفيذ (070 tkWinIn) */
    return { pol: pol, rv: rv, dec: !1 === e.newDecOk ? 0 : 1, win: win };
  },
  /* الإعداداتُ المتقدمة في نموذج الإنشاء — مطويّةٌ افتراضياً (إفصاحٌ تدريجي) */
  _tkAdvVals() {
    const e = this.state,
      me = this._tkMe(),
      d = this._tkDept(),
      chip = (on) => this._tkChip(on),
      POL = [
        ["any", "صورة أو ملاحظة"],
        ["img", "صورة"],
        ["note", "ملاحظة"],
        ["both", "صورة وملاحظة"],
        ["none", "بلا إثبات"],
      ],
      pm = e.newPol || "any",
      users = (() => {
        try {
          return (KIVO.BassamAuth && KIVO.BassamAuth.users ? KIVO.BassamAuth.users() : []) || [];
        } catch (t) {
          return [];   /* بلا طبقة الحسابات: المراجِعُ المنشئ وحده */
        }
      })(),
      mgrs = users.filter((u) => u && !u.dis && (!me || u.id !== me.id) && ((("dept" === u.role || ("staff" === u.role && u.mgr)) && u.deptId === d) || "gm" === u.role)),
      rvOpts = [{ v: "creator", label: "أنا — منشئ المهمة (الافتراضي)" }, { v: "none", label: "بلا مراجعة — التسليمُ إنجاز" }]
        .concat(mgrs.map((u) => ({ v: u.id, label: (u.name || u.un || u.id) + " — مدير" })))
        .map((o) => Object.assign(o, { sel: (e.newRv || "creator") === o.v })),
      polTxt = { any: "صورة أو ملاحظة", img: (+e.newPolN || 1) > 1 ? +e.newPolN + " صور" : "صورة", note: "ملاحظة", both: "صورة وملاحظة", none: "بلا إثبات" }[pm],
      nSteps = String(e.newSteps || "").split(/\n+/).filter((t) => t.trim()).length,
      rvTxt = "none" === e.newRv ? "بلا مراجعة" : !e.newRv || "creator" === e.newRv ? "المراجِع: أنت" : "المراجِع: " + ((rvOpts.filter((o) => o.v === e.newRv)[0] || {}).label || "").replace(" — مدير", ""),
      /* KIVO_265 · قرارُ المالك: التكرارُ خرج من هنا إلى النموذج نفسِه («نوع المهمة») — موضعٌ واحد، وملخّصُه هناك */
      winTxt = [e.newWinEarlyOn ? "البدء قبل الموعد بـ" + (+e.newWinEarly || 0) + " د" : "", e.newWinLateOn ? (2 === +e.newWinLate ? "" : "التسليم حتى " + (+e.newWinLate || 0) + " س بعد المهلة") : "لا تسليم بعد المهلة"].filter(Boolean).join(" · "),
      sum = ["الإثبات: " + polTxt + (nSteps ? " · " + nSteps + " خطوات" : ""), rvTxt, !1 === e.newDecOk ? "لا اعتذار" : "", winTxt].filter(Boolean).join(" · ");
    return {
      advOn: this._tkSrv(),
      advOpen: !!e.newAdvOpen,
      advChev: e.newAdvOpen ? "▾" : "◂",
      advToggle: () => this.setState((s) => ({ newAdvOpen: !s.newAdvOpen, newAdvTouched: !0 })),
      advSum: sum,
      advPolOpts: POL.map(([v, l]) => ({ label: l, click: () => this.setState({ newPol: v, newAdvTouched: !0 }), style: chip(pm === v) })),
      advPolNOn: "img" === pm || "both" === pm,
      advPolNOpts: [1, 2, 3, 4].map((n) => ({ label: String(n), click: () => this.setState({ newPolN: n, newAdvTouched: !0 }), style: chip((+e.newPolN || 1) === n) })),
      newSteps: e.newSteps || "",
      onNewSteps: (t) => this.setState({ newSteps: t.target.value, newAdvTouched: !0 }),
      advRvOpts: rvOpts,
      onNewRv: (t) => this.setState({ newRv: t.target.value, newAdvTouched: !0 }),
      newDecOk: !1 !== e.newDecOk,
      onNewDec: () => this.setState((s) => ({ newDecOk: !1 === s.newDecOk, newAdvTouched: !0 })),
      /* KIVO_265 · نافذةُ التنفيذ: نعم ⇒ حقلُ الرقم يظهر · لا ⇒ البدءُ في الموعد بالضبط / لا تسليمَ بعد المهلة */
      advWinEarlyOn: !!e.newWinEarlyOn,
      onAdvWinEarly: () => this.setState((s) => ({ newWinEarlyOn: !s.newWinEarlyOn, newAdvTouched: !0 })),
      newWinEarly: String(+e.newWinEarly || 0),
      onNewWinEarly: (t) => this.setState({ newWinEarly: Math.min(240, Math.max(0, Math.floor(+t.target.value || 0))), newAdvTouched: !0 }),
      advWinLateOn: !1 !== e.newWinLateOn,
      onAdvWinLate: () => this.setState((s) => ({ newWinLateOn: !1 === s.newWinLateOn, newAdvTouched: !0 })),
      newWinLate: String(+e.newWinLate || 0),
      onNewWinLate: (t) => this.setState({ newWinLate: Math.min(24, Math.max(0, Math.floor(+t.target.value || 0))), newAdvTouched: !0 }),
      advWinHint: "القبول متاح في أي وقت بعد الإسناد · الأداء يُقاس من المهلة · الافتراضي: لا بدء قبل الموعد والتسليم حتى ساعتين بعد المهلة",
    };
  },
  _tkAdvFrom(r) {
    const x = r && r[23] && "object" === typeof r[23] ? r[23] : null,
      p = x && x.pol && "object" === typeof x.pol ? x.pol : null;
    return {
      newAdvOpen: !1,
      newAdvTouched: !1,
      newPol: (p && p.m) || "any",
      newPolN: (p && p.n) || 1,
      newSteps: p && Array.isArray(p.steps) ? p.steps.join("\n") : "",
      newRv: !x || !Object.prototype.hasOwnProperty.call(x, "rv") ? "none" : null === x.rv ? "none" : x.rv && x.by && x.rv.u === x.by.u ? "creator" : (x.rv && x.rv.u) || "creator",
      newDecOk: !(x && 0 === x.dec),
      ...(() => {
        const w = x && x.win && "object" === typeof x.win ? x.win : null;   /* KIVO_265 · نافذةُ التنفيذ من الصفّ — وبلا win الافتراضيُّ (لا · نعم 2) */
        return { newWinEarlyOn: !!(w && +w.early > 0), newWinEarly: w && +w.early > 0 ? +w.early : 10, newWinLateOn: !(w && 0 === +w.late), newWinLate: w && +w.late > 0 ? +w.late : 2 };
      })(),
      ...this._tkRecFrom(r),
      tkElig: null,
    };
  },
  /* يومُ المهمة في النموذج (Y-M-D) — «يبدأ من» للإنشاء والتحويل */
  _tkFormK() {
    const e = this.state,
      T = this.hToday(),
      n = this.mDays(e.year, e.month - 1),
      d0 = e.year === T.y && e.month === T.m ? T.d : 1;
    return e.year + "-" + e.month + "-" + Math.min(Math.max(1, +(e.newDay || d0) || 1), n);
  },
  /* الصفُّ الذي يُعدَّل (بهويته — كالحفظ) · وفي المجموعة: الفردُ الذي مُلئ النموذجُ له */
  _tkEditRow(S) {
    const e = this.state,
      R = e.editRef;
    if (!R) return null;
    const L = (S || e.tasksAll || this.loadAllTasks())[e.year + "-" + e.month + "-" + R.d] || [];
    if (R.grp) {
      const G = L.filter((t) => Array.isArray(t) && t[17] === R.grp);
      return G.filter((t) => String(t[13]) === String(e.newRecFor || ""))[0] || G[0] || null;
    }
    const q = this._tkIdx(L, R.i, R.k);
    return q >= 0 ? L[q] : null;
  },
});
