
/* ── الباب الأم والفتحات التابعة ────────────────────────────────────────────
   الباب الكبير (باب الملك فهد = 5 أبواب) يُمثَّل بـ«باب أم» له gid وعدد أبواب
   leafN، وكل فتحة باب عادي من أبواب المنظومة يحمل pOf = gid الأم و leafNo.
   الأم لا تخزّن احتياجاً ولا تسكيناً ولا حالة — كلها على الفتحات، والأم مجاميع
   محسوبة. فكل ما يعمل على «الباب» اليوم (الاحتياج، التسكين، الإغلاق، الجولات)
   يعمل على الفتحة بلا تغيير، والجديد طبقة تجميع فقط. */
(function(){
  function isParent(g){ return !!(g && g.gid && (parseInt(g.leafN, 10) || 0) > 1); }
  function isLeaf(g){ return !!(g && g.pOf); }
  function leavesOf(gates, g){ if (!g || !g.gid) return []; return (gates || []).filter(function(x){ return x && x.pOf === g.gid; }).sort(function(a, b){ return (a.leafNo || 0) - (b.leafNo || 0); }); }
  function parentOf(gates, g){ if (!g || !g.pOf) return null; return (gates || []).find(function(x){ return x && x.gid && x.gid === g.pOf; }) || null; }
  /* العناصر: للعدّ بالعناصر كالتقرير (الأم بلا فتحاتها) — الوحدات: للاحتياج والتسكين (الفتحات بلا الأم) */
  function elements(gates){ return (gates || []).filter(function(g){ return g && !g.pOf; }); }
  function units(gates){ return (gates || []).filter(function(g){ return g && !isParent(g); }); }
  function leafCount(g){ return isParent(g) ? parseInt(g.leafN, 10) : 1; }
  function leafTotal(gates){ return elements(gates).reduce(function(a, g){ return a + leafCount(g); }, 0); }
  function newId(){ return "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  /* اسم الفتحة مشتق من رقم الباب: «1 - 3» — وبلا رقم من اسمه: «باب الملك فهد - 3» */
  function leafLabel(p, n){ var num = String(p && p.num != null ? p.num : "").trim(); return (num || (p && p.label ? p.label : "باب")) + " - " + n; }
  /* موضع الفتحة: قوس صغير تحت الأم (بوحدات الخريطة 1000) */
  function arcPos(p, n, N, r){
    var R = r || 26; var span = Math.min(Math.PI, 0.55 * (N - 1)); var a0 = Math.PI / 2 - span / 2;
    var a = N === 1 ? Math.PI / 2 : a0 + span * (n - 1) / (N - 1);
    return { x: Math.round((p.x + R * Math.cos(a)) * 10) / 10, y: Math.round((p.y + R * Math.sin(a)) * 10) / 10 };
  }
  /* مزامنة الفتحات بعد حفظ الأم: تُولَّد الناقصة وتُحذف الزائدة. الحقول الوصفية
     تُورَّث دائماً؛ الاحتياج/الأولوية/الحالة/التسكين تبقى على الفتحة. */
  var INHERIT = ["loc", "gtype", "kind", "route", "cls", "cats", "hideLabel", "hideNum"];
  function sync(gates, pIdx, opts){
    opts = opts || {};
    var arr = (gates || []).slice(); var p = arr[pIdx]; if (!p) return { gates: arr, removed: [] };
    var N = parseInt(p.leafN, 10) || 1;
    if (N < 2){ if (!p.gid) return { gates: arr, removed: [] }; }
    if (!p.gid) { p = Object.assign({}, p, { gid: newId() }); arr[pIdx] = p; }
    var kids = leavesOf(arr, p), removed = [];
    /* توريث الوصف + إعادة تسمية الفتحات مع اسم الأم */
    arr = arr.map(function(x){ if (!x || x.pOf !== p.gid) return x; var o = Object.assign({}, x);
      INHERIT.forEach(function(k){ o[k] = Array.isArray(p[k]) ? p[k].slice() : p[k]; });
      o.num = p.num || ""; if (opts.relabel !== false) o.label = leafLabel(p, o.leafNo); return o; });
    kids = leavesOf(arr, p);
    if (kids.length > N - (N < 2 ? 1 : 0)){
      var keep = N < 2 ? 0 : N;
      var gone = kids.slice(keep); removed = gone.slice();
      arr = arr.filter(function(x){ return gone.indexOf(x) < 0; });
    }
    if (N >= 2){
      var have = leavesOf(arr, p).length;
      for (var n = have + 1; n <= N; n++){
        var pos = arcPos(p, n, N);
        var kid = { label: leafLabel(p, n), num: p.num || "", x: pos.x, y: pos.y, pOf: p.gid, leafNo: n,
          pri: p.pri || "", closed: !!p.closed, cats: (p.cats || []).slice(), emp: [], needN: opts.uniNeed != null ? opts.uniNeed : null, needS: null, uid: (KIVO.BassamIdent ? KIVO.BassamIdent.newUid() : undefined) };
        INHERIT.forEach(function(k){ if (k !== "cats") kid[k] = p[k]; });
        arr.push(kid);
      }
      /* إعادة توزيع مواضع الفتحات على القوس عند تغيّر عددها */
      if (opts.relayout !== false){ var ks = leavesOf(arr, p); ks.forEach(function(k, j){ var q = arcPos(p, j + 1, ks.length); k.x = q.x; k.y = q.y; k.leafNo = j + 1; if (opts.relabel !== false) k.label = leafLabel(p, j + 1); }); }
    }
    /* الأم لا تحمل احتياجاً ولا تسكيناً: كلاهما على الفتحات */
    if (N >= 2){ var p2 = arr[arr.indexOf(p)]; if (p2){ var o2 = Object.assign({}, p2); o2.needN = null; o2.needS = null; o2.emp = []; arr[arr.indexOf(p)] = o2; } }
    return { gates: arr, removed: removed };
  }
  /* هل الأم مغلقة؟ = كل فتحاتها مغلقة (تُحسب لا تُخزَّن) */
  function closedOf(gates, g){ if (!isParent(g)) return !!(g && g.closed); var ks = leavesOf(gates, g); return ks.length ? ks.every(function(k){ return !!k.closed; }) : !!g.closed; }
  /* مجاميع الأم: عدد الفتحات المفتوحة، الاحتياج، المسكّنون */
  function agg(gates, g, shiftOpts, empFilter){
    var ks = isParent(g) ? leavesOf(gates, g) : [g]; var need = 0, plc = 0, open = 0;
    ks.forEach(function(k){ if (!k.closed) open++; need += KIVO.BassamNeed ? KIVO.BassamNeed.tot(k, shiftOpts) : 0; var e = (k.emp || []); plc += empFilter ? e.filter(empFilter).length : e.length; });
    return { n: ks.length, open: open, need: need, plc: plc };
  }
  /* الاحتياج الموحّد الظاهر في محرّر الأم: رقم إن تساوت الفتحات، وإلا "" */
  function uniNeedOf(gates, g){ var ks = leavesOf(gates, g); if (!ks.length) return ""; var v = ks[0].needN == null ? "" : String(ks[0].needN); return ks.every(function(k){ return (k.needN == null ? "" : String(k.needN)) === v; }) ? v : ""; }
  /* هل تُرسم هذه الفتحة الآن؟ (الأم مفرودة) */
  function shown(g, exp){ return !g || !g.pOf || !!(exp && exp[g.pOf]); }
  /* الحذف: الأم تُحذف مع فتحاتها؛ والفتحة لا تُحذف مفردة (عدّل عدد الأبواب) */
  function removeIdx(gates, i){ var g = (gates || [])[i]; if (!g) return gates; if (isParent(g)) return gates.filter(function(x, j){ return j !== i && !(x && x.pOf === g.gid); }); return gates.filter(function(x, j){ return j !== i; }); }
  KIVO.BassamLeaf = { isParent: isParent, isLeaf: isLeaf, leavesOf: leavesOf, parentOf: parentOf, elements: elements, units: units,
    leafCount: leafCount, leafTotal: leafTotal, newId: newId, leafLabel: leafLabel, arcPos: arcPos, sync: sync, closedOf: closedOf, agg: agg, uniNeedOf: uniNeedOf, shown: shown, removeIdx: removeIdx };
})();
