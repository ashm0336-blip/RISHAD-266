class Component extends DCLogic {
  state = { ktab: null, tkY: 0, tkM: 0 };
  _okOf(n, t) {
    try {
      const r = KIVO.BassamPerm;
      /* KIVO_265 · البند 17: لوحةُ «مؤشرات المهام» لمن يرى صفحةَ المهام (tasks · view) — لا ورقةَ جديدة في الشجرة */
      if ("tkKpi" === t) return !r || !r.can ? !0 : !!r.can("tasks", "view");
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
        { k: "tk", pk: "tasks", sk: "tkKpi" },
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
      e
    );
  }
}
