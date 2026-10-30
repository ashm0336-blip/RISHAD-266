/* ── رصد الميدان ─────────────────────────────────────────────────────────────
   الموظف المسكَّن على موقع في جولة اليوم — وله ورقة «رصد الميدان» في صلاحيات
   المتابعة اليومية — يرصد من صفحته الشخصية حالة موقعه (مفتوح · مغلق) ومساره
   (دخول · خروج · دخول وخروج). حُذفت «مزدحم» و«ازدحام شديد» نهائياً بطلب
   المستخدم: الحالة زرٌّ واحد يفتح ويغلق. الرصد يُكتب على عنصر الموقع
   في جولة اليوم نفسها (bassam_rounds_v1) — لا مخزن موازٍ — فينعكس على كانفس
   الجولات ومنبثق الباب وسجل الأبواب ومؤشرات التشغيل وشريط الحالة، وعلى صفحة
   الموظف. الإغلاق يكتب نفس حقول إغلاق الباب التي يستعملها المدير (closed · cAt
   · cWhy) ويضيف مَن أغلق، فالسبب مطلوب وساعة الإغلاق هي ساعة الرصد.           */
(function () {
  var K_R = "bassam_rounds_v1",
    LOG_CAP = 60,
    STALE_MIN = 60;
  var STATES = {
    open: { t: "مفتوح", c: "#059669", bg: "rgba(5,150,105,.10)", k: "ok" },
    closed: { t: "مغلق", c: "#dc2626", bg: "rgba(220,38,38,.10)", k: "bad" },
  };
  var ORDER = ["open", "closed"];
  /* لون السهم وحده يحمل المعنى: الدخول أخضر والخروج أحمر، ودخول وخروج سهماهما فوق بعضهما */
  var FLOWS = {
    in: { t: "دخول", a: "←", c: "#16a34a" },
    out: { t: "خروج", a: "→", c: "#dc2626" },
    both: { t: "دخول وخروج", a: "⇄", c: "" },
  };
  var FLOW_ORDER = ["in", "out", "both"];
  var REASONS = [
    "ازدحام شديد",
    "تعليمات الجهة المشرفة",
    "أعمال صيانة",
    "حادث / حالة طارئة",
    "أخرى",
  ];
  var pending = null;
  function operations() {
    var service = KIVO.__BS_SRV && KIVO.__BS_SRV.operations;
    if (!service) throw Error("operations-read-required");
    return service;
  }
  function ls(k, d, draft) {
    var value = draft ? draft.get(k) : operations().get(k);
    return value == null ? d : value;
  }
  function failure(ack, ticket) {
    return {
      ok: false,
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
      return failure({ status: 409, err: "review-required" }, pending.ticket);
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
  function hParts(dt) {
    try {
      var p = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
      }).formatToParts(dt || new Date());
      var g = function (k) {
        return +p.filter(function (x) {
          return x.type === k;
        })[0].value;
      };
      return { y: g("year"), m: g("month"), d: g("day") };
    } catch (e) {
      try {
        return KIVO.BassamHijri.now(dt);
      } catch (e2) {
        return { y: 1448, m: 1, d: 1 };
      }
    }
  }
  function todayKey() {
    var T = hParts(new Date());
    return T.y + "-" + T.m + "-" + T.d;
  }
  function clock(ts) {
    var d = new Date(ts || Date.now());
    var p = function (n) {
      return (n < 10 ? "0" : "") + n;
    };
    return p(d.getHours()) + ":" + p(d.getMinutes());
  }
  function me() {
    try {
      return KIVO.BassamAuth && KIVO.BassamAuth.user
        ? KIVO.BassamAuth.user()
        : null;
    } catch (e) {
      return null;
    }
  }
  function myName() {
    try {
      var d = KIVO.BassamAuth.display();
      return (d && d.name) || "موظف";
    } catch (e) {
      return "موظف";
    }
  }
  /* الحالة حالتان لا أكثر: مغلق إن كان معطَّلاً، وإلا مفتوح — ولا أثر لأي حالة قديمة */
  function stateOf(g, kind) {
    if (!g) return "open";
    return offOf(g, kind || "gates") ? "closed" : "open";
  }
  function flowOf(g) {
    return g && FLOWS[g.flow] ? g.flow : "";
  }
  function ageMin(g) {
    return g && g.fAt
      ? Math.max(0, Math.round((Date.now() - g.fAt) / 60000))
      : null;
  }
  function stale(g) {
    var a = ageMin(g);
    return a != null && a > STALE_MIN;
  }
  function ageTxt(g) {
    var a = ageMin(g);
    if (a == null) return "";
    if (a < 1) return "الآن";
    if (a < 60) return "قبل " + KIVO.BassamCount(a, "دقيقة", "g");
    var h = Math.round(a / 60);
    return "قبل " + KIVO.BassamCount(h, "ساعة", "g");
  }
  /* الرصد لكل موقع تسكين لا للأبواب وحدها (بطلب المستخدم): باب · مصلى/منطقة · معلم.
     المسار (دخول/خروج) معنىً للأبواب والمعالم — والمصلّى مكانٌ لا ممرّ فيُرصد بحالته وحدها. */
  var KINDS = ["gates", "zones", "marks"];
  var KIND_T = { gates: "باب", zones: "مصلى", marks: "معلم" };
  var KIND_AL = { gates: "الباب", zones: "المصلى", marks: "المعلم" };
  function flowOn(kind) {
    return kind !== "zones";
  }
  function label(g, kind) {
    if (!g) return KIND_T[kind] || "موقع";
    if (kind === "zones")
      return String(g.code || g.name || "").trim()
        ? "مصلى " + String(g.code || g.name).trim()
        : "مصلى";
    if (kind === "marks")
      return String(g.label || g.kind || "").trim()
        ? "معلم " + String(g.label || g.kind).trim()
        : "معلم";
    return (
      (g.num ? "باب " + g.num : "") +
        (g.label || g.name ? (g.num ? " — " : "") + (g.label || g.name) : "") ||
      "باب"
    );
  }
  /* المصلّى والمعلم يُعطَّلان بـ off والباب يُغلق بـ closed — والرصد يوحّدهما */
  function offOf(el, kind) {
    return kind === "gates" ? !!(el && el.closed) : !!(el && el.off);
  }
  function setOff(el, kind, on) {
    if (kind === "gates") {
      if (on) el.closed = true;
      else delete el.closed;
    } else {
      if (on) el.off = true;
      else delete el.off;
    }
  }
  /* صلاحية الرصد: ورقة «رصد الميدان» تحت المتابعة اليومية — للموظف ومدير الإدارة العامة؛ مدير الإدارة ومدير النظام يرصدان من الكانفس */
  function canField() {
    try {
      var u = me();
      if (!u) return false;
      if (u.role === "super" || u.role === "dept") return true;
      var P = KIVO.BassamPerm;
      return !!(P && P.tabOn && P.tabOn("daily", "field"));
    } catch (e) {
      return false;
    }
  }
  /* موقعي اليوم: عنصر جولة اليوم الذي يحوي مفتاحي — باباً كان أو مصلًّى أو معلماً */
  function mySpot() {
    var u = me();
    if (!u || !u.ekey) return null;
    var rounds = ls(K_R, {});
    var rec = rounds[todayKey()];
    if (!rec || !Array.isArray(rec.d)) return null;
    var E = KIVO.BassamEmp,
      emps = ls("bassam_employees_v1", []);
    var toks = {};
    emps.forEach(function (e) {
      var k = E ? E.key(e) : e.eid || e.nid || e.name;
      if (k === u.ekey)
        (E ? E.tokens(e) : [e.eid, e.nid, e.name]).forEach(function (t) {
          if (t) toks[t] = 1;
        });
    });
    toks[u.ekey] = 1;
    for (var fi = 0; fi < rec.d.length; fi++) {
      var f = rec.d[fi] || {};
      for (var ki = 0; ki < KINDS.length; ki++) {
        var kind = KINDS[ki],
          arr = f[kind] || [];
        for (var i = 0; i < arr.length; i++) {
          var el = arr[i];
          if (
            el &&
            (el.emp || []).some(function (t) {
              return toks[t];
            })
          )
            return { fi: fi, kind: kind, i: i, gi: i, g: el, key: todayKey() };
        }
      }
    }
    return null;
  }
  /* مواقعي اليوم: كل عناصر جولة اليوم التي تحوي مفتاحي — بابٌ أو مصلًّى أو معلم.
     الموظف قد يُسنَد إليه أكثر من موقع، فيرى صفّاً مستقلاً لكل موقع بأزراره. */
  function mySpots() {
    var u = me();
    if (!u || !u.ekey) return [];
    var rounds = ls(K_R, {});
    var rec = rounds[todayKey()];
    if (!rec || !Array.isArray(rec.d)) return [];
    var E = KIVO.BassamEmp,
      emps = ls("bassam_employees_v1", []);
    var toks = {};
    emps.forEach(function (e) {
      var k = E ? E.key(e) : e.eid || e.nid || e.name;
      if (k === u.ekey)
        (E ? E.tokens(e) : [e.eid, e.nid, e.name]).forEach(function (t) {
          if (t) toks[t] = 1;
        });
    });
    toks[u.ekey] = 1;
    var out = [];
    for (var fi = 0; fi < rec.d.length; fi++) {
      var f = rec.d[fi] || {};
      for (var ki = 0; ki < KINDS.length; ki++) {
        var kind = KINDS[ki],
          arr = f[kind] || [];
        for (var i = 0; i < arr.length; i++) {
          var el = arr[i];
          if (
            el &&
            (el.emp || []).some(function (t) {
              return toks[t];
            })
          )
            out.push({
              fi: fi,
              kind: kind,
              i: i,
              gi: i,
              g: el,
              key: todayKey(),
            });
        }
      }
    }
    /* المغلق أولاً ثم الأحدث حدثاً — ليقع ما يحتاج تدخّلاً في أعلى القائمة */
    out.sort(function (a, b) {
      var ca = offOf(a.g, a.kind) ? 0 : 1,
        cb = offOf(b.g, b.kind) ? 0 : 1;
      return ca - cb || (b.g.fAt || 0) - (a.g.fAt || 0);
    });
    return out;
  }
  /* سطرٌ حرٌّ في سجل حركة الموقع — للتسكين ونحوه ممّا ليس حالةً ولا مساراً */
  async function note(dayKey, fi, kind, gi, act, why) {
    try {
      kind = KINDS.indexOf(kind) !== -1 ? kind : "gates";
      var identity = token("note", [dayKey, fi, kind, gi, act, why]),
        repeated = pending ? await retry(identity) : null;
      if (repeated) return repeated;
      var draft = operations().draft(),
        rounds = ls(K_R, {}, draft);
      var rec = rounds[dayKey];
      if (
        !rec ||
        !Array.isArray(rec.d) ||
        !rec.d[fi] ||
        !(rec.d[fi][kind] || [])[gi]
      )
        return failure({ err: "review-required", status: 409 });
      var g = rec.d[fi][kind][gi];
      var e = {
        at: Date.now(),
        a: String(act || ""),
        by: myName(),
        kind: kind,
      };
      if (why) e.why = String(why);
      g.fLog = (Array.isArray(g.fLog) ? g.fLog : [])
        .concat([e])
        .slice(-LOG_CAP);
      draft.set(K_R, rounds);
      return await commit(draft, identity, { ok: true });
    } catch (error) {
      return failure({
        err: String((error && error.message) || "operations-save"),
      });
    }
  }
  /* سجل حركة هذا الموقع اليوم — الأحدث أولاً: متى · مَن · ماذا · ولماذا */
  function hist(g, kind) {
    kind = KINDS.indexOf(kind) !== -1 ? kind : "gates";
    var KA = KIND_AL[kind] || "الموقع";
    var rows = (Array.isArray(g && g.fLog) ? g.fLog : [])
      .map(function (e) {
        if (!e) return null;
        var act = "";
        if (e.a) act = e.a;
        else if (e.st === "closed")
          act = (kind === "gates" ? "أغلق " : "عطّل ") + KA;
        else if (e.st === "open")
          act =
            "أعاد فتح " +
            KA +
            (e.dur ? " بعد " + KIVO.BassamCount(e.dur, "دقيقة", "g") : "");
        else if (e.flow && FLOWS[e.flow])
          act = "غيّر المسار إلى " + FLOWS[e.flow].t;
        else return null;
        if (!e.a && e.st === "open" && e.flow && FLOWS[e.flow] && !e.dur)
          act = "غيّر المسار إلى " + FLOWS[e.flow].t;
        return {
          at: e.at || 0,
          t: clock(e.at),
          by: e.by || "",
          act: act,
          why: e.why || "",
        };
      })
      .filter(Boolean);
    rows.sort(function (a, b) {
      return b.at - a.at;
    });
    return rows;
  }
  /* الرصد نفسه — يُكتب على الباب في جولة اليوم، ويعود بالباب بعد الكتابة */
  async function observe(dayKey, fi, gi, o, byName) {
    try {
      o = o || {};
      var kind = KINDS.indexOf(o.kind) !== -1 ? o.kind : "gates";
      var identity = token("observe", [dayKey, fi, gi, o, byName]),
        repeated = pending ? await retry(identity) : null;
      if (repeated) return repeated;
      var draft = operations().draft(),
        rounds = ls(K_R, {}, draft);
      var rec = rounds[dayKey];
      if (
        !rec ||
        !Array.isArray(rec.d) ||
        !rec.d[fi] ||
        !(rec.d[fi][kind] || [])[gi]
      )
        return {
          ok: false,
          err: (KIND_T[kind] || "الموقع") + " غير موجود في جولة اليوم",
        };
      var g = rec.d[fi][kind][gi];
      var now = Date.now();
      var by = byName || myName();
      if (!o.expected || JSON.stringify(g) !== JSON.stringify(o.expected))
        return failure({ err: "review-required", status: 409 });
      var st = STATES[o.st] ? o.st : stateOf(g, kind);
      var fl = flowOn(kind) ? (FLOWS[o.flow] ? o.flow : flowOf(g)) : "";
      if (st === "closed" && !String(o.why || "").trim() && !offOf(g, kind))
        return {
          ok: false,
          err: kind === "gates" ? "سبب الإغلاق مطلوب" : "سبب التعطيل مطلوب",
        };
      var prevSt = stateOf(g, kind),
        prevFl = flowOf(g);
      if (st === prevSt && fl === prevFl && !o.why)
        return { ok: true, same: true, g: g };
      var why = st === "closed" ? String(o.why || g.cWhy || "").trim() : "";
      var entry = { at: now, st: st, flow: fl, by: by };
      if (why) entry.why = why;
      if (prevSt === "closed" && st !== "closed" && g.cAtMs)
        entry.dur = Math.max(1, Math.round((now - g.cAtMs) / 60000));
      entry.kind = kind;
      g.fst = st;
      g.flow = fl;
      g.fAt = now;
      g.fBy = by;
      g.fKind = kind;
      if (st === "closed") {
        setOff(g, kind, true);
        g.cAt = clock(now);
        g.cAtMs = now;
        g.cWhy = why;
        g.cBy = by;
      } else {
        if (offOf(g, kind)) {
          setOff(g, kind, false);
          delete g.cAt;
          delete g.cAtMs;
          delete g.cWhy;
          delete g.cBy;
        }
      }
      g.fLog = (Array.isArray(g.fLog) ? g.fLog : [])
        .concat([entry])
        .slice(-LOG_CAP);
      draft.set(K_R, rounds);
      return await commit(draft, identity, { ok: true, g: g, entry: entry });
    } catch (error) {
      return failure({
        err: String((error && error.message) || "operations-save"),
      });
    }
  }
  /* ملخص جولة يوم: العدّ بالحالات والمسارات وقائمة المواقع مرتبة بالأولوية (مغلق ← آخر تغيير) */
  function summary(rec) {
    var out = {
      n: 0,
      open: 0,
      closed: 0,
      in: 0,
      out: 0,
      both: 0,
      stale: 0,
      lastAt: 0,
      items: [],
    };
    if (!rec || !Array.isArray(rec.d)) return out;
    var LF = KIVO.BassamLeaf;
    rec.d.forEach(function (f, fi) {
      KINDS.forEach(function (kind) {
        (f[kind] || []).forEach(function (g, gi) {
          if (!g) return;
          if (kind === "gates" && LF && LF.isParent && LF.isParent(g)) return;
          /* المصلّى والمعلم لا يدخلان العدّ إلا إذا رُصدا أو عُطّلا — فلا تُحسب مواقع لم تُرصد قط ضمن «مفتوح» */
          if (kind !== "gates" && !g.fAt && !offOf(g, kind)) return;
          var st = stateOf(g, kind),
            fl = flowOf(g);
          out.n++;
          out[st]++;
          if (fl) out[fl]++;
          if (g.fAt && stale(g)) out.stale++;
          if (g.fAt && g.fAt > out.lastAt) out.lastAt = g.fAt;
          out.items.push({
            fi: fi,
            gi: gi,
            i: gi,
            kind: kind,
            g: g,
            st: st,
            flow: fl,
            at: g.fAt || 0,
            by: g.fBy || "",
            label: label(g, kind),
            pri: st === "closed" ? 0 : 1,
          });
        });
      });
    });
    out.items.sort(function (a, b) {
      return a.pri - b.pri || b.at - a.at;
    });
    return out;
  }
  KIVO.BassamField = {
    STATES: STATES,
    ORDER: ORDER,
    FLOWS: FLOWS,
    FLOW_ORDER: FLOW_ORDER,
    REASONS: REASONS,
    STALE_MIN: STALE_MIN,
    KINDS: KINDS,
    KIND_T: KIND_T,
    KIND_AL: KIND_AL,
    flowOn: flowOn,
    offOf: offOf,
    stateOf: stateOf,
    flowOf: flowOf,
    ageMin: ageMin,
    ageTxt: ageTxt,
    stale: stale,
    label: label,
    clock: clock,
    todayKey: todayKey,
    canField: canField,
    mySpot: mySpot,
    mySpots: mySpots,
    note: note,
    hist: hist,
    observe: observe,
    summary: summary,
  };
})();
