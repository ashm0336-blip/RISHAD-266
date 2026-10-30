
/* ── إنشاء جولة اليوم — مصنع مشترك بين التقرير اليومي والجولات اليومية ──
   مسار الشهر: أول جولة في الشهر تُسحب من التشغيل الميداني للشهر (مقفلاً كان أو مفتوحاً) بعدسات سقف الإدارة،
   وما بعدها يبدأ من أقرب جولة سابقة في الشهر كما استقرّت (والكثافات فارغة). */
(function(){
  function load(k){ try { var o = JSON.parse(localStorage.getItem(k)); return (o && typeof o === "object") ? o : null; } catch(e){ return null; } }
  function ensure(y, m, d){
    y = +y; m = +m; d = +d; if (!(y > 0 && m > 0 && d > 0)) return { status: "bad" };
    var rounds = load("bassam_rounds_v1") || {}; var rk = y + "-" + m + "-" + d;
    var cur = rounds[rk]; if (cur && Array.isArray(cur.d) && cur.d.length) return { status: "exists", key: rk };
    var mrec = rounds["m:" + y + "-" + m]; if (mrec && mrec.ap) return { status: "mlock" };
    var prev = null, later = null, any = false;
    Object.keys(rounds).forEach(function(k){ var p = k.split("-"); if (p.length !== 3 || +p[0] !== y || +p[1] !== m || k === rk) return;
      var r = rounds[k]; if (!r || !Array.isArray(r.d) || !r.d.length) return; any = true; var dd = +p[2];
      if (dd < d && (!prev || dd > prev.dd)) prev = { dd: dd, k: k, r: r };
      if (dd > d && (!later || dd < later.dd)) later = { dd: dd, k: k, r: r }; });
    var dcopy = [], from = null, src = "plan";
    /* KIVO_240 · IP‑03: إقفالُ هوية الموقع في الجولة المُنشأة — إن خلا طابقُ المصدر (لقطةُ الشهر أو الجولةُ السابقة) من sid فيُحلّ من طابق الخطة الحالي المقابل موضعياً (plan.floors[i].sid)؛ وإن حمل sid بقي كما هو */
    var plan = load("bassam_plan_v1"); var pfl = plan && Array.isArray(plan.floors) ? plan.floors : [];
    var sidAt = function(i, x){ if (x && x.sid) return x.sid; var pf = pfl[i]; return pf && pf.sid ? pf.sid : undefined; };
    if (!any){
      var ent = plan && plan.months ? plan.months[y + "-" + m] : null;
      var pmd = ent ? (Array.isArray(ent) ? ent : ent.d) : null;
      if (!Array.isArray(pmd) || !pmd.length) return { status: "noplan" };
      try { dcopy = lensFilter(JSON.parse(JSON.stringify(pmd))).map(function(x, i){ return { zones: (x.zones || []).map(function(z){ var o = Object.assign({}, z); o.count = null; o.pc = {}; return o; }), gates: x.gates || [], paths: x.paths || [], marks: x.marks || [], hidePaths: !!x.hidePaths, hideGates: !!x.hideGates, hideMarks: !!x.hideMarks, sid: sidAt(i, x) }; }); } catch(e){ return { status: "err" }; }
    } else {
      var s0 = prev || later; from = s0.k; src = "round";
      try { dcopy = JSON.parse(JSON.stringify(s0.r.d)).map(function(x, i){ return { zones: (x.zones || []).map(function(z){ var o = Object.assign({}, z); o.count = null; o.pc = {}; return o; }), gates: x.gates || [], paths: x.paths || [], marks: x.marks || [], hidePaths: !!x.hidePaths, hideGates: !!x.hideGates, hideMarks: !!x.hideMarks, sid: sidAt(i, x) }; }); } catch(e){ return { status: "err" }; }
    }
    var rec = { t: 1, ap: 0, d: dcopy }; if (from) rec.from = from; rec.auto = 1;
    rounds[rk] = rec;
    try { localStorage.setItem("bassam_rounds_v1", JSON.stringify(rounds)); } catch(e){ return { status: "err" }; }
    return { status: "created", key: rk, src: src, from: from, fromDay: from ? +from.split("-")[2] : null };
  }
  /* اعتماد جولة الوردية مرآةً لاعتماد تقريرها: on=1 يجمّد لقطة الميدان، on=0 يفتحها */
  function setShiftAp(y, m, d, name, on){
    y = +y; m = +m; d = +d; if (!(y > 0 && m > 0 && d > 0) || !name) return { status: "bad" };
    var rounds = load("bassam_rounds_v1") || {}; var rk = y + "-" + m + "-" + d; var rec = rounds[rk];
    if (!rec || !Array.isArray(rec.d)) return { status: "noround" };
    var mrec = rounds["m:" + y + "-" + m]; if (mrec && mrec.ap) return { status: "mlock" };
    rec.shAp = Object.assign({}, rec.shAp || {});
    if (on){
      var snap; try { snap = JSON.parse(JSON.stringify(rec.d)); } catch(e){ return { status: "err" }; }
      var at = ""; try { var d0 = new Date(); var p2 = function(n){ return (n < 10 ? "0" : "") + n; }; at = p2(d0.getHours()) + ":" + p2(d0.getMinutes()); } catch(e){}
      rec.shAp[name] = { ap: 1, at: at, snap: snap, byRep: 1 };
    } else rec.shAp[name] = { ap: 0 };
    rounds[rk] = rec;
    try { localStorage.setItem("bassam_rounds_v1", JSON.stringify(rounds)); } catch(e){ return { status: "err" }; }
    return { status: on ? "approved" : "opened", key: rk };
  }
  /* تصفية عناصر الخطة بعدسات سقف الإدارة: ما أُطفئت عدسته لا يُنسخ (المواقع وخرائطها تبقى)، والتسكين مع عدسة التوزيع فقط */
  function lensFilter(arr){
    var P = KIVO.BassamPerm; var on = function(k){ try { return !P || !P.lensOn || !!P.lensOn(k); } catch(e){ return true; } };
    var Z = on("zones"), G = on("gates"), M = on("marks"), T = on("paths"), D = on("dist");
    var strip = function(x){ if (D || !x || typeof x !== "object") return x; var o = Object.assign({}, x); o.emp = []; return o; };
    return (arr || []).map(function(f){ if (!f || typeof f !== "object") return f; var o = Object.assign({}, f);
      o.zones = Z ? (f.zones || []).map(strip) : []; o.gates = G ? (f.gates || []).map(strip) : []; o.marks = M ? (f.marks || []).map(strip) : []; o.paths = T ? (f.paths || []) : []; return o; });
  }
  KIVO.BassamRound = { ensure: ensure, setShiftAp: setShiftAp, lensFilter: lensFilter };
})();
