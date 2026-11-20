  /* الجولات: كالخطة + راصدُ الميدان يرى حالةَ العناصر المسنَدة إليه وحدها (P4.2-05) — الحاوياتُ والهندسةُ وemp[] تبقى */
  'bassam_rounds_v1': {
    on: function (V) { return V.restrict.Assigned || enfAnyLensOff(V); },
    proj: function (v, V) {
      if (!isObj(v)) return v; var o = {}, dk;
      for (dk in v) {
        var x = v[dk];
        if (!KIVO_SCOPE._h.parseDay(dk) || !isObj(x) || !Array.isArray(x.d)) { o[dk] = x; continue; }
        var x2 = enfShallow(x); x2.d = x.d.map(function (fl, i) { return enfFloorProj(V, fl, true); }); o[dk] = x2;
      }
      return o;
    },
    merge: function (c, n, V) {
      if (!isObj(n) || !isObj(c)) return n; var o = enfShallow(n), dk;
      for (dk in n) {
        var nx = n[dk], cx = c[dk];
        if (!KIVO_SCOPE._h.parseDay(dk) || !isObj(nx) || !Array.isArray(nx.d)) continue;
        /* F24: يومٌ أو طابقٌ جديد يُقارن بطابقٍ بلا عناصر — فلا يُكتب فيه ما لا يراه الفاعل */
        var cd = isObj(cx) && Array.isArray(cx.d) ? cx.d : [];
        var x2 = enfShallow(nx); x2.d = nx.d.map(function (fl, i) { return i < cd.length && isObj(cd[i]) ? enfFloorMerge(V, fl, cd[i], true) : enfFloorMerge(V, fl, enfFloorBlank(V, fl), true); }); o[dk] = x2;
      }
      return o;
    }
  }
