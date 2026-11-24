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
  /* ── V7 · د5-ح (13): أرشيفُ الجولات (bassam_rounds_arc_v1) — أيامُ الأشهر المقفلة ينقلها الخادمُ من الملف الحيّ في حفظة الجولات نفسِها.
     arcOf()                 الأرشيفُ كما حمّلته خدمةُ Operations (غيرُ محمَّلٍ أو محجوب ⇒ null).
     arcShut(rounds, arc, y, m)  شهرٌ له أيامٌ في الأرشيف ولم يُفتح (لا mo ولا يومٌ مفتوح) — لا تُنشأ فيه جولةٌ ولا تُعتمد («mlock»)، فلا يُكتب
                             فوق يومٍ مؤرشفٍ بنسخةٍ جديدة من الخطة.
     liveOnly(rounds, arc)   الجولاتُ بلا أيام الأرشيف التي لم تتغيّر — لا تُرسل (غيابُها ليس حذفاً: الخادمُ يبقيها · dailyArcFill). ── */
  function arcOf() {
    try {
      return load("bassam_rounds_arc_v1", null);   /* من الخدمة لا من مسودة المستدعي: الأرشيفُ لا يدخل أساسَ حفظته */
    } catch (e) {
      return null;
    }
  }
  function arcShut(rounds, arc, y, m) {
    if (!arc) return false;
    var pre = KIVO.BassamCal.gYm(y, m) + "-",
      mrec = (rounds || {})[KIVO.BassamCal.gMk(y, m)];
    if (mrec && (mrec.mo || (mrec.dopen && Object.keys(mrec.dopen).length))) return false;
    return Object.keys(arc).some(function (k) {
      return k.indexOf(pre) === 0;
    });
  }
  function liveOnly(rounds, arc) {
    if (!arc || !rounds || typeof rounds !== "object") return rounds;
    var out = {};
    Object.keys(rounds).forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(arc, k) && JSON.stringify(arc[k]) === JSON.stringify(rounds[k])) return;
      out[k] = rounds[k];
    });
    return out;
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
      var rounds = load("bassam_rounds_v1", draft) || {},
        arc = arcOf();
      var rk = KIVO.BassamCal.gKey(y, m, d);
      var cur = rounds[rk] || (arc && arc[rk]);   /* V7 · د5-ح (13): يومٌ مؤرشفٌ موجود */
      if (cur && Array.isArray(cur.d) && cur.d.length)
        return { status: "exists", key: rk };
      var mrec = rounds[KIVO.BassamCal.gMk(y, m)];
      if ((mrec && mrec.ap) || arcShut(rounds, arc, y, m)) return { status: "mlock" };
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
      /* KIVO_240 · IP‑03: الجولةُ المُنشأة تحمل sid طابقِ مصدرها (لقطةُ الشهر أو الجولةُ السابقة) كما هو.
         V7 · د5-هـ (t4): لا حلَّ موضعياً من plan.floors[i] بعد اليوم — طابقُ مصدرٍ بلا sid يبقى بلا sid («غير مربوط») حتى يربطه ترحيلُ الهوية (sidMigration) ببرهان نسبه */
      /* V7 · د5-هـ: الخطةُ يقرؤها مالكُها (التشغيل الميداني) بطريق القراءة نفسِه (المسودة أو Operations) — بغيابه لا خطة («noplan») */
      var plan = (function () { var o = KIVO.bus.read("plan.doc@1", draft); return o && typeof o === "object" ? o : null; })();
      var sidAt = function (x) {
        return sidOf(x) || undefined;
      };
      if (!any) {
        var ent = plan && plan.months ? plan.months[KIVO.BassamCal.gYm(y, m)] : null;
        var pmd = ent ? (Array.isArray(ent) ? ent : ent.d) : null;
        if (!Array.isArray(pmd) || !pmd.length) return { status: "noplan" };
        try {
          dcopy = lensFilter(JSON.parse(JSON.stringify(pmd))).map(
            function (x) {
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
                sid: sidAt(x),
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
          dcopy = JSON.parse(JSON.stringify(s0.r.d)).map(function (x) {
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
              sid: sidAt(x),
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
      draft.set("bassam_rounds_v1", liveOnly(rounds, arc));
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
      var rounds = load("bassam_rounds_v1", draft) || {},
        arc = arcOf();
      var rk = KIVO.BassamCal.gKey(y, m, d);
      var mrec = rounds[KIVO.BassamCal.gMk(y, m)];
      if ((mrec && mrec.ap) || (!rounds[rk] && arcShut(rounds, arc, y, m))) return { status: "mlock" };
      /* V7 · د5-ح (13): يومُ شهرٍ أُعيد فتحُه ولم تعد أيامُه من الأرشيف بعد — يُكتب في الحيّ (الخادمُ يبقيه حيّاً) */
      var rec = rounds[rk] || (arc && arc[rk] ? JSON.parse(JSON.stringify(arc[rk])) : null);
      if (!rec || !Array.isArray(rec.d)) return { status: "noround" };
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
      draft.set("bassam_rounds_v1", liveOnly(rounds, arc));
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
  /* ── V7 · د5-هـ (t4): الموقعُ يُطابَق بمعرّفه sid لا بموضعه ──
     sidIndex(list, sid)        موضعُ طابقِ list الذي يحمل sid (أو −1).
     siteAt(list, floors, f)    موضعُ طابقِ list المقابل لموقع الخطة floors[f] بمعرّفه؛ موقعٌ بلا sid ⇒ −1 («غير مربوط»).
                                بلا قائمة مواقع (لا خطة) لا موقعَ يُطابَق: f نفسُه من list (اختيارُ طابقٍ من اليوم لا ربطٌ بخطة).
     unlinked(list)             مواضعُ طوابق list بلا sid — تُعرض صراحةً ولا تُطابَق بالموضع.
     padBySid(d, sites, make?)  يُلحق بـd كلَّ موقعٍ من sites (بترتيبه) لا يحمل d معرّفَه (make(site) شكلُ الطابق الفارغ)؛ موقعٌ بلا sid لا يُلحق ⇒ { added, skipped }.
     removeBySid(d, sid)        يحذف من d طوابقَ sid (الطابقُ بلا sid لا يُمسّ) ⇒ عددُ المحذوف. */
  function sidOf(x) {
    return x && typeof x === "object" && x.sid != null && x.sid !== "" ? String(x.sid) : null;
  }
  function sidIndex(list, sid) {
    if (!Array.isArray(list) || sid == null || sid === "") return -1;
    for (var i = 0; i < list.length; i++) if (sidOf(list[i]) === String(sid)) return i;
    return -1;
  }
  function siteAt(list, floors, f) {
    if (!Array.isArray(list)) return -1;
    if (!Array.isArray(floors) || !floors.length) return f >= 0 && f < list.length ? f : -1;
    return sidIndex(list, sidOf(floors[f]));
  }
  function unlinked(list) {
    var out = [];
    (Array.isArray(list) ? list : []).forEach(function (x, i) {
      if (x && !sidOf(x)) out.push(i);
    });
    return out;
  }
  function padBySid(d, sites, make) {
    var added = 0, skipped = 0;
    if (!Array.isArray(d)) return { added: 0, skipped: 0 };
    (Array.isArray(sites) ? sites : []).forEach(function (site) {
      var sid = sidOf(site);
      if (!sid) { skipped++; return; }
      if (sidIndex(d, sid) >= 0) return;
      d.push(typeof make === "function" ? make(site) : { zones: [], gates: [], marks: [], paths: [], sid: site.sid });
      added++;
    });
    return { added: added, skipped: skipped };
  }
  function removeBySid(d, sid) {
    var n = 0;
    if (!Array.isArray(d) || sid == null || sid === "") return 0;
    for (var i = d.length - 1; i >= 0; i--) if (sidOf(d[i]) === String(sid)) { d.splice(i, 1); n++; }
    return n;
  }
  KIVO.BassamRound = {
    sidIndex: sidIndex,
    siteAt: siteAt,
    unlinked: unlinked,
    padBySid: padBySid,
    removeBySid: removeBySid,
    ensure: ensure,
    setShiftAp: setShiftAp,
    prepareEnsure: prepareEnsure,
    prepareShiftAp: prepareShiftAp,
    lensFilter: lensFilter,
    liveOnly: liveOnly,
  };
})();
