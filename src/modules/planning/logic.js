/* ملف مولَّد — لا يُحرَّر يدوياً، المصدر: src/slots/modules/planning/logic.js.tpl */
class Component extends KIVO.BassamPageKit.base(DCLogic, ["dreport+irshad+planning+profile+seized+staff+tasks"]) {
  state = { ptab: null, seen: {} };
  /* KIVO_261 (SOT-003/010 · كشفه k261tree): تبويباتُ الحاوية تتبع صلاحيةَ المستخدم لا سقفَ الإدارة وحده.
     V7 · د5-د/د5-هـ (قرار المراجع 1 · فتحاتُ البناء): الحاويةُ لا تعرف برنامجاً. كلُّ تبويبٍ قطعةٌ في مجلد برنامجه: سجلُّه هنا (PT_TABS) وزرُّه
     وموضعُ تركيبه في القالب وأنماطُه في helmet.css. مدخلُ السجل: معرّفُ التبويب ← { page: مفتاحُ صفحته · go: اسمُ مُنادي الانتقال · on: اسمُ
     شرط التركيب · act: اسمُ «هو المعروض» · lazy: لا يُركَّب حتى يُفتح أولَ مرة }. بغياب القطعة يغيب التبويب بزرّه ومحتواه؛ وبغياب القطع كلِّها
     تغيب الحاويةُ من القائمة (سجلُّ الصفحات ← seq). الترتيبُ ترتيبُ السجل، والأولُ هو الافتراضي و«الجاهزية» تنتقل إليه. */
  PT_TABS = { sched: { page: "staff", go: "goSched", on: "schedOn", act: "onSched" }, plan: { page: "plan", go: "goPlan", on: "planSeen", act: "onPlan", lazy: !0 },  };
  _ids() {
    return Object.keys(this.PT_TABS);
  }
  _tabOk(t) {
    const k = this.PT_TABS[t];
    return !!k && this._ptOk(k.page);
  }
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
    "read" === t && (t = this._ids()[0]);
    if (!this._tabOk(t)) return;
    const e = () => {
      try {
        window.dispatchEvent(new CustomEvent("bs:ptab-shown", { detail: t }));
      } catch (t) {}
    };
    if (this.PT_TABS[t].lazy && !this.state.seen[t]) return void this.setState({ ptab: t, seen: Object.assign({}, this.state.seen, { [t]: !0 }) }, e);
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
          ("read" === e || Object.prototype.hasOwnProperty.call(this.PT_TABS, e)) && this._bsGo(e);
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
      ids = this._ids(),
      ok = ids.filter(function (i) {
        return t._tabOk(i);
      }),
      e = this.state.ptab || ids[0] || "none";
    "read" === e && (e = ids[0] || "none");
    ok.indexOf(e) < 0 && (e = ok[0] || "none");
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
    var v = {
      ptab: e,
      ptOn: ok.join(" "),   /* KIVO_261: المعرّفاتُ المتاحة بلا فراغٍ أوّل — قاعدةُ إخفاء الشريط ذي التبويب الواحد تطابقها */
      onRead: "read" === e,
      readAllowed: !1,
      readStyle: n("read" === e),
      readIcon: a("read" === e),
      readLbl: r("read" === e),
      goRead: function () {
        t._bsGo("read");
      },
    };
    ids.forEach(function (i) {
      var T = t.PT_TABS[i], on = ok.indexOf(i) >= 0;
      v[T.go] = function () {
        t._bsGo(i);
      };
      v[T.on] = T.lazy ? on && (!!t.state.seen[i] || i === e) : on;
      T.act && (v[T.act] = i === e);
    });
    return v;
  }
}
