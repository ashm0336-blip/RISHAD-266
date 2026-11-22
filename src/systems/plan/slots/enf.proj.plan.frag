  /* الخطة: سياقُ رسم (لا يُحجب طابقٌ ولا عنصر) — تُحجب العدساتُ المعطّلة وحقولُها (RISHAD-266: لا إسقاطَ بالموقع/العنصر بعد تقاعد سقف النطاق القديم) */
  'bassam_plan_v1': {
    on: function (V) { return enfAnyLensOff(V); },
    proj: function (v, V) {
      if (!isObj(v)) return v; var o = enfShallow(v), i;
      if (Array.isArray(v.floors)) o.floors = v.floors.map(function (fl, i0) { return enfFloorProj(V, fl, false); });
      if (isObj(v.months)) { var mo = {}, k; for (k in v.months) { var md = enfMonthD(v.months[k]); if (!md) { mo[k] = v.months[k]; continue; } var dd = md.d.map(function (fl, i1) { return enfFloorProj(V, fl, false); }); if (md.arr) mo[k] = dd; else { mo[k] = enfShallow(v.months[k]); mo[k].d = dd; } } o.months = mo; }
      var root = enfFloorProj(V, enfColsOf(v), false);
      for (i = 0; i < ENF_LENS_COLS.length; i++) if (v[ENF_LENS_COLS[i]] !== undefined) o[ENF_LENS_COLS[i]] = root[ENF_LENS_COLS[i]];
      return o;
    },
    merge: function (c, n, V) {
      if (!isObj(n) || !isObj(c)) return n; var o = enfShallow(n), i, k;
      if (Array.isArray(n.floors) && Array.isArray(c.floors)) {
        var cf = {}; c.floors.forEach(function (fl, i0) { cf[ENF_ID.floor(fl, i0)] = fl; });
        o.floors = n.floors.map(function (fl, i1) { var id = ENF_ID.floor(fl, i1), x = cf[id]; return x ? enfFloorMerge(V, fl, x, false) : fl; });
      }
      if (isObj(n.months) && isObj(c.months)) {
        var mo = enfShallow(n.months);
        for (k in n.months) {
          var mn = enfMonthD(n.months[k]), mc = enfMonthD(c.months[k]); if (!mn || !mc) continue;
          var cm = {}; mc.d.forEach(function (fl, i2) { cm[ENF_ID.floor(fl, i2)] = fl; });
          var dd = mn.d.map(function (fl, i3) { var id = ENF_ID.floor(fl, i3), x = cm[id]; return x ? enfFloorMerge(V, fl, x, false) : fl; });
          if (mn.arr) mo[k] = dd; else { mo[k] = enfShallow(n.months[k]); mo[k].d = dd; }
        }
        o.months = mo;
      }
      var rn0 = enfColsOf(n), rc0 = enfColsOf(c);
      var rm = enfFloorMerge(V, rn0, rc0, false);
      for (i = 0; i < ENF_LENS_COLS.length; i++) { var col = ENF_LENS_COLS[i]; if (rm[col] !== undefined) o[col] = rm[col]; else delete o[col]; }
      return o;
    }
  },
