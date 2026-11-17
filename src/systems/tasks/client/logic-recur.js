/* KIVO_265 · البند 19 (تقسيمُ منطق صفحة المهام) — جزءُ «التكرار» (قرارُ المالك 2026-10-16 · البند 16): القاعدةُ في النموذج (يومي · كل عدة أيام ·
   أسبوعي · شهري · آخرُ الشهر · النهاية) · نصُّها وفحصُها · خطةُ الإرسال (start · edit · stop) · سياقُ السلسلة. يُجمَع بعد logic.js بترتيب meta.json "logicParts". */
"use strict";
Object.assign(Component.prototype, {
  /* KIVO_265 · قرارُ المالك: قاعدةُ التكرار من النموذج كما يقبلها الخادم {t, wd?, md?, to? | open:1} — k يومُ البداية (افتراضُ يوم الأسبوع ويوم الشهر)
     وb أساسُ اختصارات النهاية (البدايةُ في الإنشاء والتحويل · اليومُ في تعديل سلسلةٍ قائمة). «أيام محددة» القديمة = أسبوعي بأيامٍ عدّة */
  _tkRecBody(k, b) {
    const e = this.state,
      t = "days" === e.newRec ? "weekly" : e.newRec || "once";
    if ("daily" !== t && "weekly" !== t && "monthly" !== t && "every" !== t) return null;
    const o = { t: t };
    "weekly" === t && (o.wd = this._tkRecWd(k));
    /* KIVO_265 · البند 16: "last" آخرُ يومٍ في الشهر الهجري · every بعدد الأيام n (الخادمُ يرفض خارج 2–30) */
    "monthly" === t && (o.md = "last" === e.newRecMd ? "last" : +e.newRecMd || +String(k).split("-")[2] || 1);
    "every" === t && (o.n = Math.floor(+e.newRecN) || 0);
    "date" === e.newRecEnd ? (o.to = this._tkRecTo(b || k)) : (o.open = 1);
    return o;
  },
  _tkRecWd(k, s) {
    const W = (s || this.state).newRecWd;
    return W && "object" === typeof W
      ? Object.keys(W)
          .filter((q) => W[q])
          .map(Number)
          .sort((a, b) => a - b)
      : [this._tkWdOf(k)];
  },
  /* نهايةُ التكرار: تاريخٌ صريح أو اختصارٌ من الأساس b (أسبوع · أسبوعان · شهر · 3 أشهر · سنة) */
  _tkRecTo(b) {
    const v = String(this.state.newRecTo || "m1"),
      n = { w1: 7, w2: 14, m1: 30, m3: 90, y1: 354 }[v];
    if (!n) return this._tkDayN(v) ? v : "";
    const a = String(b).split("-").map(Number),
      g = this.hGreg(a[0], a[1], a[2]),
      h = g ? this.tkHParts(g.getTime() + 864e5 * n) : null;
    return h ? h.y + "-" + h.m + "-" + h.d : "";
  },
  /* بصمةُ القاعدة (النوع · الأيام · يوم الشهر · النهاية) — تغييرُها في النموذج وحده يرسل «تعديل التكرار» */
  _tkRecSig(o) {
    if (!o || "object" !== typeof o) return "";
    const t = "days" === o.t ? "weekly" : String(o.t || "");
    return JSON.stringify([t, "weekly" === t && Array.isArray(o.wd) ? o.wd.map(Number).sort((a, b) => a - b) : [], "monthly" === t ? ("last" === o.md ? "last" : +o.md || 0) : 0, o.to ? this._tkDayN(o.to) : 0, "every" === t ? +o.n || 0 : 0]);
  },
  /* نصُّ القاعدة: «تتكرر أسبوعياً: الأحد والثلاثاء · من 1448-5-12 حتى الإيقاف» */
  _tkRecTxt(o, from) {
    const WD = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
      t = o && "days" === o.t ? "weekly" : o && o.t,
      w = o && Array.isArray(o.wd) ? o.wd.map(Number).sort((a, b) => a - b).map((i) => WD[i]).filter(Boolean) : [];
    if (!t) return "";
    return (
      ("daily" === t
        ? "تتكرر يومياً"
        : "weekly" === t
          ? "تتكرر أسبوعياً" + (w.length ? ": " + w.join(" و") : "")
          : "every" === t
            ? "تتكرر كل " + (+o.n || "—") + " أيام"
            : "تتكرر شهرياً: " + ("last" === o.md ? "آخر يوم في الشهر" : "يوم " + (+o.md || "—"))) +
      (from ? " · من " + from : "") +
      (o.to ? " حتى " + o.to : " حتى الإيقاف")
    );
  },
  /* تحقّقُ القاعدة قبل الإرسال (الخادمُ يحكم بعدها: rec.wd · rec.md · rec.to) — ed: "ser" تعديلُ سلسلةٍ قائمة · "one" تحويل (لا نهايةَ قبل اليوم) */
  _tkRecChk(o, from, ed) {
    if (!o) return "";
    if ("weekly" === o.t && !(o.wd && o.wd.length)) return "اختر يوماً واحداً على الأقل";
    if ("monthly" === o.t && !("last" === o.md || (o.md >= 1 && o.md <= 30))) return "اختر يوم الشهر";
    if ("every" === o.t && !(o.n >= 2 && o.n <= 30)) return "اختر عدد الأيام بين موعدين (من 2 إلى 30)";
    if (o.open) return "";
    const n = this._tkDayN(o.to);
    if (!n) return "اختر تاريخ النهاية";
    if (n < this._tkDayN(from)) return "تاريخ النهاية قبل تاريخ البدء";
    if (ed && n < this._tkTodayN()) return "تاريخ النهاية قبل اليوم — " + ("ser" === ed ? "لإنهاء التكرار الآن استعمل «إنهاء التكرار»" : "اختر تاريخاً من اليوم فصاعداً");
    return "";
  },
  /* KIVO_265 · صلاحيةُ المفتاح في الواجهة (انعكاسٌ للخادم — الحكمُ له): null قديم ⇒ يُسمح · true/false في الإنفاذ (كـdreport: PC && key !== false) */
  _tkPK(k) {
    try {
      const K = KIVO.BassamPerm && KIVO.BassamPerm.key;
      return !K || K(k, this._tkDept() || void 0) !== !1;
    } catch (t) {
      return !0;   /* بلا طبقة الصلاحيات: الخادمُ يحكم */
    }
  },
  /* سلاسلُ التكرار في المخزن — مرآةُ 073 tkSeries: حالةُ السلسلة من نموذجها (أحدثُ نسخةٍ غيرِ منفصلة بأعلى إصدار · التعادلُ بأحدث بداية) لا من الصفّ المنقور */
  _tkRecIx() {
    const S0 = this.state.tasksAll,
      R = this._tkRecM;
    if (R && (S0 ? R.S === S0 : !R.S && Date.now() - R.at < 1e3)) return R.M;   /* قبل أوّل tasksAll: المخزنُ نفسُه لكل صفوف الرسم الواحد */
    const S = S0 || this.loadAllTasks(),
      X = this._tkM();
    const M = {};
    for (const k in S)
      Array.isArray(S[k]) &&
        S[k].forEach((r) => {
          const x = X ? X.x(r) : null,
            c = x && x.rec && "object" === typeof x.rec && x.rec.id ? x.rec : null;
          if (!c) return;
          const id = String(c.id),
            v = +c.ver || 0,
            s = M[id] || (M[id] = { id: id, p: null, pv: -1, ps: 0, a: null, av: -1 });
          v > s.av && ((s.av = v), (s.a = r));
          !x.det && (v > s.pv || (v === s.pv && (r[15] || 0) > s.ps)) && ((s.p = r), (s.pv = v), (s.ps = r[15] || 0));
        });
    this._tkRecM = { S: S0 || null, M: M, at: Date.now() };
    return M;
  },
  _tkRecSer(id) {
    const s = null == id || "" === id ? null : this._tkRecIx()[String(id)];
    if (!s) return null;
    const r = s.p || s.a,
      c = this._tkM().x(r).rec,
      n = this._tkDayN(c.to),
      ended = 1 === +c.stop || (n > 0 && n < this._tkTodayN());
    return { id: s.id, rec: c, row: r, t: "days" === c.t ? "weekly" : String(c.t || ""), paused: !ended && 1 === +c.paused, ended: ended };
  },
  _tkRecChip(c) {
    const sr = c && c.id ? this._tkRecSer(c.id) : null,
      t = sr ? sr.t : c && ("days" === c.t ? "weekly" : c.t);
    const rc = sr ? sr.rec : c;
    return "متكررة" + ("every" === t ? " · كل " + (+(rc && rc.n) || "—") + " أيام" : { daily: " · يومياً", weekly: " · أسبوعياً", monthly: " · شهرياً" }[t] || "") + (sr && sr.ended ? " · منتهية" : sr && sr.paused ? " · موقوفة مؤقتاً" : "");
  },
  /* KIVO_265 · قرارُ المالك: نموذجُ التعديل يُملأ بقاعدة السلسلة من نموذجها (لا من الصفّ المنقور) — وnewRecFor هويةُ الصفّ الذي مُلئ له
     (فلا يُرسل تكرارٌ لصفٍّ لم يُفتح النموذجُ له) · newRecSig بصمةُ القاعدة عند الفتح (تغييرُها وحده يرسل «تعديل التكرار») */
  _tkRecFrom(r) {
    const M = this._tkM(),
      x = M && r ? M.x(r) : null,
      c0 = x && x.rec && "object" === typeof x.rec && x.rec.id ? x.rec : null,
      sr = c0 ? this._tkRecSer(c0.id) : null,
      c = sr ? sr.rec : c0,
      t = c ? ("days" === c.t ? "weekly" : String(c.t || "daily")) : "once";
    return {
      newRec: t,
      newRecF: "once" === t ? "daily" : t,
      newRecWd: c && Array.isArray(c.wd) && c.wd.length ? c.wd.reduce((o, q) => ((o[+q] = !0), o), {}) : null,
      newRecMd: c && c.md ? ("last" === c.md ? "last" : +c.md) : 0,
      newRecN: c && c.n ? +c.n : 2,
      newRecEnd: c && c.to ? "date" : "open",
      newRecTo: c && c.to ? String(c.to) : "m1",
      newRecFor: r && null != r[13] ? String(r[13]) : "",
      newRecSig: c ? this._tkRecSig(c) : "",
      tkRecOk: !1,
    };
  },
  /* سياقُ التكرار في النموذج: new (إنشاء) · ser (صفٌّ من سلسلة) · one (لمرةٍ واحدة يُحوَّل) · none — والصلاحيةُ انعكاسٌ للخادم:
     الإنشاءُ task.create (+ task.assign بمكلَّفين) · تعديلُ السلسلة وإيقافُها task.edit · التحويلُ task.create + task.edit + task.assign */
  _tkRecCtx(r) {
    const e = this.state,
      P = (k) => this._tkPK(k),
      noAsg = !(e.editRef && e.editRef.grp) && "direct" !== e.newAsg,
      ASG = "المهمة المتكررة تحتاج مكلَّفاً واحداً على الأقل";
    if (!e.editRef) return { mode: "new", dis: noAsg ? ASG : this.PC("add") && P("task.create") && P("task.assign") ? "" : "صلاحيتك لا تشمل إنشاءَ مهامٍ متكررة" };
    if (!r || null == r[13] || String(r[13]) !== String(e.newRecFor || "")) return { mode: "none" };
    const M = this._tkM(),
      x = M ? M.x(r) : null,
      c = x && x.rec && "object" === typeof x.rec && x.rec.id ? x.rec : null;
    if (c) {
      const sr = this._tkRecSer(c.id),
        can = this.PC("edit") && P("task.edit");
      return { mode: "ser", ser: sr, can: can, ro: !sr || sr.ended || !can };
    }
    return {
      mode: "one",
      dis: this._tkShut(r)
        ? "مهمةٌ ملغاةٌ أو أُعيد إسنادُها — لا تُحوَّل إلى متكررة"
        : noAsg
          ? ASG
          : this.PC("add") && this.PC("edit") && P("task.create") && P("task.edit") && P("task.assign")
            ? ""
            : "تحويلُ المهمة إلى متكررة يحتاج صلاحياتِ الإنشاء والتعديل والإسناد",
    };
  },
  /* ما يُرسل مع الحفظ: {rec} للإنشاء · {op:start|edit|stop} بعد وصول التعديل · {ask} تأكيدُ «لمرة واحدة» لصفٍّ من سلسلة · {err} */
  _tkRecPlan(r) {
    const e = this.state;
    if (!this._tkSrv()) return {};
    const C = this._tkRecCtx(r),
      t0 = "days" === e.newRec ? "weekly" : e.newRec || "once",
      k = this._tkFormK();
    if ("new" === C.mode || "one" === C.mode) {
      if ("once" === t0 || C.dis) return {};
      const o = this._tkRecBody(k),
        er = this._tkRecChk(o, k, "one" === C.mode && "one");
      return er ? { err: er } : "new" === C.mode ? { rec: o } : { op: "start", rec: o };
    }
    if ("ser" !== C.mode || C.ro) return {};
    /* KIVO_265 · مراجعة U1: الصفُّ المعدَّل يبقى (آخرُ مواعيد السلسلة) — row مع يومه بعد الحفظ (ref.k) فلا يُلغيه الإنهاء */
    if ("once" === t0) return e.tkRecOk ? { op: "stop", id: C.ser.id, row: String(r[13]) } : { ask: !0, id: C.ser.id };
    const o = this._tkRecBody(k, this._tkTodayK());
    if (this._tkRecSig(o) === e.newRecSig) return {};
    const er = this._tkRecChk(o, C.ser.rec.from || k, "ser");
    return er ? { err: er } : { op: "edit", id: C.ser.id, rec: o };
  },
  /* تأكيدُ «لمرة واحدة» لصفٍّ من سلسلة: نافذةُ «إنهاء سلسلة التكرار» نفسُها — وبعد التأكيد يُعاد الحفظُ ثم يُنهى التكرار */
  _tkRecAsk(id) {
    const e = this.state;
    this.setState({
      rowMenu: null,
      tkAct: { kind: "recstop", form: 1, k: "", id: null, ekey: null, title: String(e.newTitle || "").trim() || "مهمة", name: "", s: 0, e: 0, eid: "", rec: String(id || "") },
      tkActWhy: "",
      tkActTo: "",
      tkActExt: "",
      tkActErr: "",
      tkActBusy: !1,
      tkActElig: null,
      tkActLog: null,
      tkActHint: "",
    });
  },
  /* Display the committed atomic settings receipt; never issue a second
     recurrence command after the editor has already saved its changes. */
  _tkRecAck(op, result) {
    const n = result && +result.cancelled || 0,
      count = n ? KIVO.BassamCount(n, "مهمة") : "",
      text = "start" === op
        ? "حُوّلت المهمة إلى متكررة — تُولَّد مواعيدها تلقائياً"
        : "edit" === op
          ? "عُدّل التكرار" + (n ? " — أُلغيت " + count + " من المواعيد القادمة التي لم تعد ضمنه" : "")
          : "أُنهي التكرار — تبقى هذه المهمة" + (n ? "، وأُلغيت " + count + " من المواعيد القادمة التي لم تبدأ" : "") + " · تبقى المواعيدُ السابقة بسجلّها وإثباتها";
    this.bsToast(text, "ok");
  },
  /* KIVO_265 · قرارُ المالك (تكرارُ المهام ظاهرٌ في النموذج): «نوع المهمة: لمرة واحدة | متكررة» بعد وقت المهمة مباشرةً — يومي · أسبوعي (أيامٌ عدّة) ·
     شهري (يومُ الشهر الهجري) · يبدأ من يوم المهمة · ينتهي حتى الإيقاف أو في تاريخ. وللسلسلة القائمة: حالتُها وإيقافُها مؤقتاً واستئنافُها وإنهاؤها */
  _tkRecVals() {
    const e = this.state;
    if (!this._tkSrv() || !e.newTaskOpen) return { tkRecOn: !1 };
    const S = e.tasksAll || this.loadAllTasks(),
      r = e.editRef ? this._tkEditRow(S) : null,
      C = this._tkRecCtx(r);
    if ("none" === C.mode || ("ser" === C.mode && !C.ser)) return { tkRecOn: !1 };
    const chip = (on) => this._tkChip(on),
      ser = "ser" === C.mode ? C.ser : null,
      ro = !!C.ro,
      dis = C.dis || "",
      t0 = "days" === e.newRec ? "weekly" : e.newRec || "once",
      on = ser ? ro || "once" !== t0 : "once" !== t0 && !dis,
      k = this._tkFormK(),
      from = ser ? String(ser.rec.from || k) : k,
      base = ser ? this._tkTodayK() : k,
      o = on && !ro ? this._tkRecBody(k, base) : null,
      er = o ? this._tkRecChk(o, from, "new" !== C.mode && C.mode) : "",
      dk = e.editRef ? e.year + "-" + e.month + "-" + e.editRef.d : "",
      to = o && o.to ? o.to.split("-").map(Number) : null,
      ty = to ? to[0] : +from.split("-")[0],
      y0 = +base.split("-")[0],
      WD = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
      wd = this._tkRecWd(k),
      md = "last" === e.newRecMd ? "last" : +e.newRecMd || +k.split("-")[2] || 1,
      setTo = (y, m, d) => this.setState({ newRecTo: y + "-" + m + "-" + Math.min(Math.max(1, d), this.hMonthDays(y, m)) }),
      tone = ser && ser.ended ? "var(--border-strong);background:var(--bg-surface-3);color:var(--text-muted)" : ser && ser.paused ? "var(--warning-border);background:var(--warning-bg);color:var(--warning-text)" : "var(--success-border);background:var(--success-bg);color:var(--success-text)",
      typ = (label, sel, off, click) => ({ label: label, aria: sel ? "true" : "false", ariaDis: off ? "true" : "false", tip: off && dis ? dis : "", style: this._tkSeg(sel, off), click: click });
    return {
      tkRecOn: !0,
      tkRecTypes: [
        typ("لمرة واحدة", !on, ro, () => (ro ? void 0 : this.setState({ newRec: "once" }))),
        typ("متكررة", on, ro || !!dis, () => (dis ? this.bsToast(dis, "warn") : ro ? void 0 : this.setState((s) => ({ newRec: "once" === (s.newRec || "once") ? s.newRecF || "daily" : s.newRec })))),
      ],
      tkRecHint: dis,
      tkRecStOn: !!ser,
      tkRecSt: ser ? (ser.ended ? "منتهية" : ser.paused ? "موقوفة مؤقتاً" : "نشطة") : "",
      tkRecStStyle: "font-size:10.5px;font-weight:700;padding:2px 10px;border-radius:9999px;white-space:nowrap;border:1px solid " + tone,
      tkRecActOn: !!ser && !ser.ended && !!C.can,
      tkRecPauseLbl: ser && ser.paused ? "استئناف" : "إيقاف مؤقت",
      tkRecPause: () => r && ser && this._tkActOpen(ser.paused ? "recresume" : "recpause", r, dk),
      tkRecPauseStyle: chip(!1),
      tkRecStop: () => r && ser && this._tkActOpen("recstop", r, dk),
      tkRecStopStyle: chip(!1) + ";color:var(--danger-text)",
      tkRecRoOn: !!ser && ro,
      tkRecRoTxt: ser ? this._tkRecTxt(ser.rec, from) + (ser.ended ? " — انتهى التكرار" : !C.can ? " — تعديلُ التكرار يحتاج صلاحيةَ تعديل المهام" : "") : "",
      tkRecBodyOn: on && !ro,
      tkRecFreqs: [
        ["daily", "يومي"],
        ["weekly", "أسبوعي"],
        ["monthly", "شهري"],
        ["every", "كل عدة أيام"],
      ].map(([v, l]) => ({ label: l, click: () => this.setState({ newRec: v, newRecF: v }), style: chip(t0 === v) })),
      /* KIVO_265 · البند 16: كل N يوم من يوم البدء (2–30) */
      tkRecNOn: "every" === t0,
      tkRecN: String(Math.min(30, Math.max(2, Math.floor(+e.newRecN) || 2))),
      onTkRecN: (t) => this.setState({ newRecN: Math.min(30, Math.max(2, Math.floor(+t.target.value) || 2)) }),
      tkRecWdOn: "weekly" === t0,
      tkRecWds: WD.map((l, i) => ({
        label: l,
        click: () =>
          this.setState((s) => {
            const W = {};
            this._tkRecWd(k, s).forEach((q) => (W[q] = !0));
            W[i] = !W[i];
            return { newRecWd: W };
          }),
        style: chip(wd.indexOf(i) >= 0),
      })),
      tkRecMdOn: "monthly" === t0,
      tkRecMds: Array.from({ length: 30 }, (q, i) => ({ v: String(i + 1), label: "يوم " + (i + 1), sel: i + 1 === md })).concat([{ v: "last", label: "آخر يوم في الشهر", sel: "last" === md }]),
      onTkRecMd: (t) => this.setState({ newRecMd: "last" === t.target.value ? "last" : +t.target.value }),
      tkRecMdNote: 30 === md ? "الأشهرُ الهجرية ذاتُ 29 يوماً لا يقع فيها يوم 30 — اختر «آخر يوم في الشهر» ليقع في 29 أو 30" : "last" === md ? "آخرُ يومٍ في الشهر الهجري (29 أو 30) — لا يُتخطّى شهر" : "",
      tkRecFrom: "يبدأ من " + from,
      tkRecEnds: [
        ["open", "حتى الإيقاف"],
        ["date", "في تاريخ"],
      ].map(([v, l]) => ({ label: l, click: () => this.setState({ newRecEnd: v }), style: chip(("date" === e.newRecEnd ? "date" : "open") === v) })),
      tkRecToOn: "date" === e.newRecEnd,
      tkRecToDs: to ? Array.from({ length: this.hMonthDays(to[0], to[1]) }, (q, i) => ({ v: String(i + 1), label: String(i + 1), sel: i + 1 === to[2] })) : [],
      tkRecToMs: this.MONTHS.map((l, i) => ({ v: String(i + 1), label: l, sel: !!to && i + 1 === to[1] })),
      tkRecToYs: [0, 1, 2, 3].map((q) => ({ v: String(y0 + q), label: y0 + q + " هـ", sel: y0 + q === ty })),
      onTkRecToD: (t) => to && setTo(to[0], to[1], +t.target.value),
      onTkRecToM: (t) => to && setTo(to[0], +t.target.value, to[2]),
      onTkRecToY: (t) => to && setTo(+t.target.value, to[1], to[2]),
      tkRecQuickOn: "date" === e.newRecEnd && !ser,
      tkRecQuick: [
        ["w1", "أسبوع"],
        ["w2", "أسبوعان"],
        ["m1", "شهر"],
        ["m3", "3 أشهر"],
        ["y1", "سنة"],
      ].map(([v, l]) => ({ label: l, click: () => this.setState({ newRecTo: v }), style: chip(String(e.newRecTo || "") === v) })),
      tkRecSum: er || (o ? this._tkRecTxt(o, from) : ""),
      tkRecSumStyle: "font-size:11.5px;font-weight:700;line-height:1.8;color:" + (er ? "var(--danger-text)" : "var(--brand-text)"),
      tkRecNote: "كلُّ موعدٍ مهمةٌ مستقلة بسجلّها وإثباتها — لا تتكرّر نسخةُ اليوم الواحد، ولا تُسند لغير المتاح يومَها (يصلك تنبيه)، والمواعيدُ السابقة تبقى كما هي",
      tkRecWarn:
        ser && !ro && "once" === t0
          ? "سيُنهى التكرار عند الحفظ — تبقى هذه المهمة، وتتوقف المواعيدُ التالية (تُلغى القادمةُ التي لم تبدأ)"
          : ser && !ro && o && !er && this._tkRecSig(o) !== e.newRecSig
            ? "يُعدَّل التكرار عند الحفظ — تُلغى المواعيدُ القادمة التي لم تبدأ ولم تعد ضمن القاعدة الجديدة"
            : "one" === C.mode && on
              ? "تتحوّل المهمة إلى متكررة عند الحفظ — يولّد الخادمُ مواعيدها القادمة تلقائياً"
              : "",
    };
  },
});
