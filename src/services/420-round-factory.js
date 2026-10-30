/* ── إنشاء جولة اليوم — مصنع مشترك بين التقرير اليومي والجولات اليومية ──
   مسار الشهر: أول جولة في الشهر تُسحب من التشغيل الميداني للشهر (مقفلاً كان أو مفتوحاً) بعدسات سقف الإدارة،
   وما بعدها يبدأ من أقرب جولة سابقة في الشهر كما استقرّت (والكثافات فارغة). */
(function () {
  var pending = null;
  function operations() {
    var service = KIVO.__BS_SRV && KIVO.__BS_SRV.operations;
    if (!service) throw Error("operations-read-required");
    return service;
  }
  function load(k, draft) {
    var o = draft ? draft.get(k) : operations().get(k);
    return o && typeof o === "object" ? o : null;
  }
  function failure(ack, ticket) {
    return {
      status:
        ack && ack.uncertain
          ? "uncertain"
          : ack && ack.err === "denied"
            ? "denied"
            : ack && ack.status === 409
              ? "conflict"
              : "err",
      ticket: ticket,
      err: (ack && ack.err) || "operations-save",
    };
  }
  function token(op, args) {
    var context = operations().context();
    return JSON.stringify([
      context && context.uid,
      context && context.dept,
      op,
      args,
    ]);
  }
  function dispatch(entry, retrying) {
    if (entry.promise) return entry.promise;
    var service = operations();
    entry.promise = (
      retrying ? service.retry(entry.ticket) : service.flush(entry.ticket)
    )
      .then(
        function (ack) {
          var out =
            ack && ack.ok === 1 ? entry.result : failure(ack, entry.ticket);
          if (
            pending === entry &&
            ack &&
            (ack.ok === 1 ||
              (!ack.uncertain &&
                (ack.err === "denied" || ack.err === "conflict")))
          )
            pending = null;
          return out;
        },
        function () {
          return failure(
            { uncertain: true, err: "operations-save" },
            entry.ticket,
          );
        },
      )
      .finally(function () {
        entry.promise = null;
      });
    return entry.promise;
  }
  async function retry(identity) {
    if (!pending) return null;
    if (pending.token !== identity)
      return {
        status: "conflict",
        err: "review-required",
        ticket: pending.ticket,
      };
    return dispatch(pending, true);
  }
  async function commit(draft, identity, result) {
    var ticket = draft.stage();
    if (!ticket || !ticket.requestId)
      return failure(ticket || { err: "operations-save" });
    pending = {
      ticket: ticket,
      token: identity,
      result: result,
      promise: null,
    };
    return dispatch(pending, false);
  }
  function prepareEnsure(draft, y, m, d) {
    try {
      y = +y;
      m = +m;
      d = +d;
      if (!(y > 0 && m > 0 && d > 0)) return { status: "bad" };
      var rounds = load("bassam_rounds_v1", draft) || {};
      var rk = y + "-" + m + "-" + d;
      var cur = rounds[rk];
      if (cur && Array.isArray(cur.d) && cur.d.length)
        return { status: "exists", key: rk };
      var mrec = rounds["m:" + y + "-" + m];
      if (mrec && mrec.ap) return { status: "mlock" };
      var prev = null,
        later = null,
        any = false;
      Object.keys(rounds).forEach(function (k) {
        var p = k.split("-");
        if (p.length !== 3 || +p[0] !== y || +p[1] !== m || k === rk) return;
        var r = rounds[k];
        if (!r || !Array.isArray(r.d) || !r.d.length) return;
        any = true;
        var dd = +p[2];
        if (dd < d && (!prev || dd > prev.dd)) prev = { dd: dd, k: k, r: r };
        if (dd > d && (!later || dd < later.dd)) later = { dd: dd, k: k, r: r };
      });
      var dcopy = [],
        from = null,
        src = "plan";
      /* KIVO_240 · IP‑03: إقفالُ هوية الموقع في الجولة المُنشأة — إن خلا طابقُ المصدر (لقطةُ الشهر أو الجولةُ السابقة) من sid فيُحلّ من طابق الخطة الحالي المقابل موضعياً (plan.floors[i].sid)؛ وإن حمل sid بقي كما هو */
      var plan = load("bassam_plan_v1", draft);
      var pfl = plan && Array.isArray(plan.floors) ? plan.floors : [];
      var sidAt = function (i, x) {
        if (x && x.sid) return x.sid;
        var pf = pfl[i];
        return pf && pf.sid ? pf.sid : undefined;
      };
      if (!any) {
        var ent = plan && plan.months ? plan.months[y + "-" + m] : null;
        var pmd = ent ? (Array.isArray(ent) ? ent : ent.d) : null;
        if (!Array.isArray(pmd) || !pmd.length) return { status: "noplan" };
        try {
          dcopy = lensFilter(JSON.parse(JSON.stringify(pmd))).map(
            function (x, i) {
              return {
                zones: (x.zones || []).map(function (z) {
                  var o = Object.assign({}, z);
                  o.count = null;
                  o.pc = {};
                  return o;
                }),
                gates: x.gates || [],
                paths: x.paths || [],
                marks: x.marks || [],
                hidePaths: !!x.hidePaths,
                hideGates: !!x.hideGates,
                hideMarks: !!x.hideMarks,
                sid: sidAt(i, x),
              };
            },
          );
        } catch (e) {
          return { status: "err" };
        }
      } else {
        var s0 = prev || later;
        from = s0.k;
        src = "round";
        try {
          dcopy = JSON.parse(JSON.stringify(s0.r.d)).map(function (x, i) {
            return {
              zones: (x.zones || []).map(function (z) {
                var o = Object.assign({}, z);
                o.count = null;
                o.pc = {};
                return o;
              }),
              gates: x.gates || [],
              paths: x.paths || [],
              marks: x.marks || [],
              hidePaths: !!x.hidePaths,
              hideGates: !!x.hideGates,
              hideMarks: !!x.hideMarks,
              sid: sidAt(i, x),
            };
          });
        } catch (e) {
          return { status: "err" };
        }
      }
      var rec = { t: 1, ap: 0, d: dcopy };
      if (from) rec.from = from;
      rec.auto = 1;
      rounds[rk] = rec;
      draft.set("bassam_rounds_v1", rounds);
      return {
        status: "created",
        key: rk,
        src: src,
        from: from,
        fromDay: from ? +from.split("-")[2] : null,
      };
    } catch (error) {
      return {
        status: "err",
        err: String((error && error.message) || "operations-save"),
      };
    }
  }
  async function ensure(y, m, d) {
    try {
      var identity = token("ensure", [+y, +m, +d]),
        repeated = pending ? await retry(identity) : null;
      if (repeated) return repeated;
      var draft = operations().draft(),
        result = prepareEnsure(draft, y, m, d);
      return result.status === "created"
        ? await commit(draft, identity, result)
        : result;
    } catch (error) {
      return {
        status: "err",
        err: String((error && error.message) || "operations-save"),
      };
    }
  }
  /* اعتماد جولة الوردية مرآةً لاعتماد تقريرها: on=1 يجمّد لقطة الميدان، on=0 يفتحها */
  function prepareShiftAp(draft, y, m, d, name, on) {
    try {
      y = +y;
      m = +m;
      d = +d;
      if (!(y > 0 && m > 0 && d > 0) || !name) return { status: "bad" };
      var rounds = load("bassam_rounds_v1", draft) || {};
      var rk = y + "-" + m + "-" + d;
      var rec = rounds[rk];
      if (!rec || !Array.isArray(rec.d)) return { status: "noround" };
      var mrec = rounds["m:" + y + "-" + m];
      if (mrec && mrec.ap) return { status: "mlock" };
      rec.shAp = Object.assign({}, rec.shAp || {});
      if (on) {
        var snap;
        try {
          snap = JSON.parse(JSON.stringify(rec.d));
        } catch (e) {
          return { status: "err" };
        }
        var at = "";
        try {
          var d0 = new Date();
          var p2 = function (n) {
            return (n < 10 ? "0" : "") + n;
          };
          at = p2(d0.getHours()) + ":" + p2(d0.getMinutes());
        } catch (e) {}
        rec.shAp[name] = { ap: 1, at: at, snap: snap, byRep: 1 };
      } else rec.shAp[name] = { ap: 0 };
      rounds[rk] = rec;
      draft.set("bassam_rounds_v1", rounds);
      return { status: on ? "approved" : "opened", key: rk };
    } catch (error) {
      return {
        status: "err",
        err: String((error && error.message) || "operations-save"),
      };
    }
  }
  async function setShiftAp(y, m, d, name, on) {
    try {
      var identity = token("setShiftAp", [+y, +m, +d, name, !!on]),
        repeated = pending ? await retry(identity) : null;
      if (repeated) return repeated;
      var draft = operations().draft(),
        result = prepareShiftAp(draft, y, m, d, name, on);
      return result.status === "approved" || result.status === "opened"
        ? await commit(draft, identity, result)
        : result;
    } catch (error) {
      return {
        status: "err",
        err: String((error && error.message) || "operations-save"),
      };
    }
  }
  /* تصفية عناصر الخطة بعدسات سقف الإدارة: ما أُطفئت عدسته لا يُنسخ (المواقع وخرائطها تبقى)، والتسكين مع عدسة التوزيع فقط */
  function lensFilter(arr) {
    var P = KIVO.BassamPerm;
    var on = function (k) {
      try {
        return !P || !P.lensOn || !!P.lensOn(k);
      } catch (e) {
        return true;
      }
    };
    var Z = on("zones"),
      G = on("gates"),
      M = on("marks"),
      T = on("paths"),
      D = on("dist");
    var strip = function (x) {
      if (D || !x || typeof x !== "object") return x;
      var o = Object.assign({}, x);
      o.emp = [];
      return o;
    };
    return (arr || []).map(function (f) {
      if (!f || typeof f !== "object") return f;
      var o = Object.assign({}, f);
      o.zones = Z ? (f.zones || []).map(strip) : [];
      o.gates = G ? (f.gates || []).map(strip) : [];
      o.marks = M ? (f.marks || []).map(strip) : [];
      o.paths = T ? f.paths || [] : [];
      return o;
    });
  }
  KIVO.BassamRound = {
    ensure: ensure,
    setShiftAp: setShiftAp,
    prepareEnsure: prepareEnsure,
    prepareShiftAp: prepareShiftAp,
    lensFilter: lensFilter,
  };
})();
