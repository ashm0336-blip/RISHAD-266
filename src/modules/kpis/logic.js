class Component extends DCLogic {
  state = { ktab: null };
  _okOf(n, t) {
    try {
      const r = KIVO.BassamPerm;
      /* KIVO_265 · البند 17: لوحةُ «مؤشرات المهام» لمن يرى صفحةَ المهام (tasks · view) — لا ورقةَ جديدة في الشجرة.
         V7 P4 · G6: صارت مرجعاً في حاوية «مؤشرات الإدارة» (refs: "tasks" بلا ورقة) فيحكمها kpiPanelOk نفسُه مع رابط القائمة — وهذا السطرُ احتياطُ غياب المحرّك وحده */
      if (!t && !(r && r.kpiPanelOk)) return !r || !r.can ? !0 : !!r.can(n, "view");
      if (r && r.kpiPanelOk) return !!r.kpiPanelOk(n, t);   /* KIVO_261: المصدرُ الواحد مع رابط القائمة (334) */
      if (r && r.canSub && !r.canSub(n, t, "view")) return !1;
      const L = (k) => !r || !r.on || !!r.on(k);
      if ("kpiOcc" === t) return L("zones") && L("dens");
      if ("kpiZones" === t) return L("zones");
      if ("kpiDaily" === t) return !r || !r.can || !!r.can("dreport", "view");
      return !0;
    } catch (n) {
      return !0;
    }
  }
  renderVals() {
    const n = this,
      t = [
        { k: "read", pk: "planning", sk: "readiness" },
        { k: "dy", pk: "daily", sk: "kpiDaily" },
        { k: "occ", pk: "daily", sk: "kpiOcc" },
        { k: "zn", pk: "daily", sk: "kpiZones" },
        { k: "sz", pk: "seized", sk: "dash" },
        { k: "ir", pk: "irshad", sk: "dash" },
        { k: "tk", pk: "tasks", sk: "" },
        { k: "dsh", pk: "dstats", sk: "anHaram" },
        { k: "dsn", pk: "dstats", sk: "anNabawi" },
        { k: "dsc", pk: "dstats", sk: "anCmp" },
        { k: "dst", pk: "dstats", sk: "anTime" },
      ],
      r = {};
    t.forEach(function (t) {
      r[t.k] = n._okOf(t.pk, t.sk);
    });
    const i = t.filter(function (n) {
      return r[n.k];
    });
    let o = this.state.ktab;
    (o && r[o]) || (o = i.length ? i[0].k : "");
    const e = { noneOn: !i.length, stripOn: i.length > 1 };
    return (
      t.forEach(function (t) {
        const i = o === t.k;
        ((e["ok_" + t.k] = r[t.k]),
          (e["on_" + t.k] = i && r[t.k]),
          (e["st_" + t.k] = (function (n) {
            return (
              "position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 16px;border-radius:12px;transition:all .3s;flex-shrink:0;min-width:170px;cursor:pointer;font-family:'Cairo',sans-serif;border:1px solid " +
              (n
                ? "rgba(185,151,81,0.45);background:var(--bg-xffffff);box-shadow:0 3px 10px -4px rgba(138,111,53,0.45)"
                : "transparent;background:transparent")
            );
          })(i)),
          (e["ic_" + t.k] = (function (n) {
            return (
              "width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;transition:all .3s;" +
              (n
                ? "background:var(--bg-a185151810p1);color:var(--fg-xb99751)"
                : "background:var(--bg-a2452452450p9);color:var(--fg-x94a3b8)")
            );
          })(i)),
          (e["lb_" + t.k] = (function (n) {
            return (
              "font-size:12px;transition:color .3s;" +
              (n ? "font-weight:600;color:var(--fg-xb99751)" : "font-weight:400;color:var(--fg-x53565a)")
            );
          })(i)),
          (e["go_" + t.k] = function () {
            n.setState({ ktab: t.k });
          }));
      }),
      /* لوحةُ المهام يملكها نظامُ المهام (RISHAD-266 P9 · tasks/logic-kpi.js) — العارضُ يحرس سياقَ الإدارة وحده كما كان: بلا إدارةٍ جاهزة لا تُستورد اللوحة */
      e.on_tk && (() => {
        const scope = KIVO.BassamDepts?.context?.();
        if (!scope || scope.state !== "ready") {
          e.tkScopeNotice = scope?.message || "تعذّر قراءة سجل الإدارات — أعد المحاولة";
          e.on_tk = false;
        }
      })(),
      /* بعد أول فتح تبقى اللوحةُ مركَّبةً مخفيّة: شهرُها المختار يبقى عند الرجوع إلى التبويب كما كان قبل النقل، ولا تُقرأ قبل أن تُفتح */
      e.on_tk && (this._tkSeen = !0),
      (e.tkMount = !!this._tkSeen && !e.tkScopeNotice),
      (e.tkShow = e.on_tk ? "" : "display:none"),
      e
    );
  }
}
