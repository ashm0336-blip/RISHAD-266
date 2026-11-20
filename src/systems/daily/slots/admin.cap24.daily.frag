    const P24 = KIVO.BassamPerm && KIVO.BassamPerm.p24;
    if (!P24 || !dr) return null;
    const pg = this._pages().filter((p) => "daily" === p.key)[0];
    if (!pg || !(pg.tabs || []).length) return null;
    const lensArr = Array.isArray(dr.lenses) ? dr.lenses : KIVO.BassamPerm.deptLenses ? KIVO.BassamPerm.deptLenses(did) : [],
      C = P24.ceil(did, { cap: dr.cap, subs: dr.subs || {}, tabs: dr.tabs || {}, lenses: lensArr }),
      want = { kpiDaily: @@SYS:admin.kpiDaily.dreport|empty="!1"@@, kpiOcc: C.lens("dens") && P24.lensHosted("dens", C), kpiZones: C.lens("zones") && P24.lensHosted("zones", C) },
      has = -1 !== (dr.cap || []).indexOf("daily"),
      cur = Array.isArray((dr.tabs || {}).daily) ? dr.tabs.daily.slice() : has ? pg.tabs.map((t) => t.key) : [];
    let ch = !1;
    Object.keys(want).forEach((k) => {
      if (!pg.tabs.some((t) => t.key === k)) return;
      const i = cur.indexOf(k);
      want[k] && -1 === i && (cur.push(k), (ch = !0));
      !want[k] && -1 !== i && (cur.splice(i, 1), (ch = !0));
    });
    if (!ch) return null;
    const cap = dr.cap.slice(),
      subs = Object.assign({}, dr.subs),
      tabs = Object.assign({}, dr.tabs || {}, { daily: cur });
    this._capNormalize(cap, subs, tabs);
    return { cap: cap, subs: subs, tabs: tabs, lenses: Array.isArray(dr.lenses) ? dr.lenses.slice() : dr.lenses };
