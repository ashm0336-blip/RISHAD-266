class Component extends KIVO.BassamPageKit.base(DCLogic, ["dreport+irshad+planning+profile+seized+staff+tasks"]) {
  state = { ptab: null, planSeen: !1 };
  /* KIVO_261 (SOT-003/010 · كشفه k261tree): تبويبا الحاوية يتبعان صلاحيةَ المستخدم لا سقفَ الإدارة وحده — كان موظفٌ مُنح «الجدول الشهري»
     وحده يرى تبويبَ «التشغيل الميداني» فارغاً بزرّ «إضافة خطة» (الخادمُ يرفض قراءتَه وكتابتَه) · ومثلُه بالعكس */
  _ptOk(k) {
    if (!this.bsOn(k)) return !1;
    try {
      const P = KIVO.BassamPerm;
      return !P || !P.can || !!P.can(k, "view");
    } catch (e) {
      return !0;
    }
  }
  _bsGo(t) {
    "read" === t && (t = "sched");
    if (!this._ptOk("sched" === t ? "staff" : "plan")) return;
    const e = () => {
      try {
        window.dispatchEvent(new CustomEvent("bs:ptab-shown", { detail: t }));
      } catch (t) {}
    };
    if ("plan" === t && !this.state.planSeen) return void this.setState({ ptab: t, planSeen: !0 }, e);
    this.state.ptab = t;
    try {
      const s = document.getElementById("bsPtRoot");
      s && s.setAttribute("data-ptab", t);
    } catch (t) {}
    e();
  }
  componentDidMount() {
    try {
      ((this._pt = (t) => {
        try {
          const e = t && t.detail;
          ("read" !== e && "sched" !== e && "plan" !== e) || this._bsGo(e);
        } catch (t) {}
      }),
        window.addEventListener("bs:ptab", this._pt));
    } catch (t) {}
  }
  componentWillUnmount() {
    try {
      window.removeEventListener("bs:ptab", this._pt);
    } catch (t) {}
  }
  renderVals() {
    var t = this,
      e = this.state.ptab || "sched";
    "read" === e && (e = "sched");
    var S = this._ptOk("staff"),
      P = this._ptOk("plan");
    ("sched" !== e || S || (e = P ? "plan" : "none"), "plan" !== e || P || (e = S ? "sched" : "none"));
    var n = function (t) {
        return (
          "position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 16px;border-radius:12px;transition:all .3s;flex-shrink:0;min-width:170px;cursor:pointer;font-family:'Cairo',sans-serif;border:1px solid " +
          (t
            ? "rgba(185,151,81,0.45);background:var(--bg-xffffff);box-shadow:0 3px 10px -4px rgba(138,111,53,0.45)"
            : "transparent;background:transparent")
        );
      },
      a = function (t) {
        return (
          "width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;transition:all .3s;" +
          (t ? "background:var(--bg-a185151810p1);color:var(--fg-xb99751)" : "background:var(--bg-a2452452450p9);color:var(--fg-x94a3b8)")
        );
      },
      r = function (t) {
        return (
          "font-size:12px;transition:color .3s;" +
          (t ? "font-weight:600;color:var(--fg-xb99751)" : "font-weight:400;color:var(--fg-x53565a)")
        );
      };
    return {
      ptab: e,
      ptOn: (S ? "sched" : "") + (S && P ? " " : "") + (P ? "plan" : ""),   /* KIVO_261: «plan» وحدها بلا فراغٍ أوّل — كانت « plan» فلا تطابق قاعدةَ إخفاء الشريط ذي التبويب الواحد */
      schedOn: S,
      onRead: "read" === e,
      onSched: "sched" === e,
      onPlan: "plan" === e,
      planSeen: P && (!!this.state.planSeen || "plan" === e),
      readAllowed: !1,
      readStyle: n("read" === e),
      readIcon: a("read" === e),
      readLbl: r("read" === e),
      goRead: function () {
        t._bsGo("read");
      },
      schedStyle: n("sched" === e),
      schedIcon: a("sched" === e),
      schedLbl: r("sched" === e),
      planStyle: n("plan" === e),
      planIcon: a("plan" === e),
      planLbl: r("plan" === e),
      goSched: function () {
        t._bsGo("sched");
      },
      goPlan: function () {
        t._bsGo("plan");
      },
    };
  }
}
