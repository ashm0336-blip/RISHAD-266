/* KIVO_265 · البند 19 (تقسيمُ منطق صفحة المهام) — جزءُ «مسارات الخادم للصف»: الإنشاءُ في الخادم · قائمةُ الصف وشريحتُه · نافذةُ الفعل
   (المراجعة · التمديد · إعادةُ الإسناد · الإلغاء · القبولُ نيابةً) · سجلُّ المهمة · الأهلية. يُجمَع بعد logic.js بترتيب meta.json "logicParts". */
"use strict";
Object.assign(Component.prototype, {
  /* الإنشاءُ من الخادم: أهليةُ «غير متاح» تُكشف قبل الإسناد ولا يُنشأ إلا بتأكيدك (force) */
  _tkCreateSrv(b) {
    if (this.state.tkBusy) return;
    this.setState({ tkBusy: !0 });
    this._tkApi("/api/tasks/create", b).then((x) => {
      if ((this.setState({ tkBusy: !1 }), x.j && 1 === x.j.ok)) {
        const n = (x.j.rows || []).filter((r) => r.ekey).length,
          w = (x.j.elig || []).filter((q) => "متاح" !== q.result).length,
          sk = (x.j.skipped || []).length;   /* KIVO_265 · البند 12: من تخطّاه الإسنادُ بالوردية (بلا حسابٍ نشط · بلا معرّف · فوق السقف) */
        return (
          this.setState({ newTaskOpen: !1, editRef: null, tkElig: null, newAdvOpen: !1 }),
          void this.bsAck(
            (n > 1 ? "أُسندت المهمة إلى " + this.tkN(n, 1) : n ? "أُسندت المهمة" : "أُضيفت المهمة") + (b.rec ? " — والتكرارُ يولّد مواعيدها تلقائياً" : "") + (w ? " · " + w + " بانتظار التحقق" : "") + (sk ? " · تُخطّي " + sk + " بسببهم (بلا حسابٍ نشط أو بلا معرّفٍ أو فوق السقف)" : ""),
            "ok",
          )
        );
      }
      if (x.j && ("elig" === x.j.err || "acct" === x.j.err)) return void this.setState({ tkElig: { items: x.j.items || [], body: b, acct: "acct" === x.j.err } });
      this.bsToast(this._tkErr(x, "لم تُحفظ المهمة"), "warn");
    });
  },
  /* قائمةُ المسؤول للصفّ — أفعالُ المرحلة الثانية (بخادم · والشهرُ غيرُ مقفل) */
  _tkP2Menu(r, k, o) {
    const M = this._tkM();
    if (!M || !this._tkSrv() || o || !Array.isArray(r)) return [];
    const S = M.state(r),
      ed = this.PC("edit"),
      lk = r[14] ? M.link(this.loadEmps(), r[14]) : { by: "none" },
      go = (kind) => () => this._tkActOpen(kind, r, k),
      out = [];
    "pending" === S.rev &&
      ed &&
      out.push(
        { name: "اعتماد الإنجاز", color: "var(--success-text)", p1: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0", p2: "m9 12 2 2 4-4", run: go("approve") },
        { name: "إعادة لاستكمال الإثبات", color: "var(--warning-text)", p1: "M9 14 4 9l5-5", p2: "M4 9h10.5a5.5 5.5 0 0 1 0 11H11", run: go("return") },
      );
    !S.closed && ed && out.push({ name: "تمديد المهلة", color: "var(--info-text)", p1: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0", p2: "M12 6v6l4 2", run: go("extend") });
    r[14] && ed && "done" !== r[3] && "cancelled" !== S.asg && "reassigned" !== S.asg && ("eid" === lk.by || "nid" === lk.by) &&
      out.push({ name: "إعادة إسناد", color: "var(--brand-text)", p1: "m17 2 4 4-4 4", p2: "M3 11v-1a4 4 0 0 1 4-4h14", run: go("reassign") });
    ("name" === lk.by || "unknown" === lk.by || "ambiguous" === lk.by) && ed &&
      out.push({ name: "ربط بموظف (غير مرتبطة)", color: "var(--warning-text)", p1: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71", p2: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71", run: go("relink") });
    "done" !== r[3] && "cancelled" !== S.asg && "reassigned" !== S.asg && (this.PC("del") || ed) &&
      out.push({ name: "إلغاء المهمة (يبقى سجلُّها)", color: "var(--danger-text)", danger: !0, p1: "M18 6 6 18", p2: "m6 6 12 12", run: go("cancel") });
    /* ق5: سلسلةُ التكرار (x.rec) — إيقافٌ مؤقت/استئناف/إنهاء من أيّ نسخةٍ فيها (task.edit في الخادم). KIVO_265: حالتُها من نموذجها (_tkRecSer) فلا تُعرض
       لسلسلةٍ منتهية · وبمفتاح task.edit كذلك (حاملُ الإسناد أو الإنهاء بلا التعديل كان يرى القائمة فيرفضه الخادم 403) */
    const xr = M.x(r),
      rc = xr && xr.rec && "object" === typeof xr.rec && xr.rec.id ? xr.rec : null,
      sr = rc ? this._tkRecSer(rc.id) : null,
      re = !!sr && !sr.ended && ed && this._tkPK("task.edit");
    re && out.push(sr.paused
      ? { name: "استئناف التكرار", color: "var(--info-text)", p1: "M5 3l14 9-14 9V3z", p2: "", run: go("recresume") }
      : { name: "إيقاف التكرار مؤقتاً", color: "var(--warning-text)", p1: "M6 4h4v16H6z", p2: "M14 4h4v16h-4z", run: go("recpause") });
    re && out.push({ name: "إنهاء سلسلة التكرار", color: "var(--danger-text)", danger: !0, p1: "M18 6 6 18", p2: "m6 6 12 12", run: go("recstop") });
    out.push({ name: "سجل المهمة", color: "var(--text-secondary)", p1: "M8 6h13M8 12h13M8 18h13", p2: "M3 6h.01M3 12h.01M3 18h.01", run: go("log") });
    return out;
  },
  /* حقولُ العرض لصفٍّ (المرحلة الثانية) — في خليّة القبول والموظفين */
  _tkP2Row(r, k) {
    const M = this._tkM();
    if (!M || !Array.isArray(r)) return { p2On: !1 };
    const x = M.x(r) || {},
      S = M.state(r),
      lk = r[14] ? M.link(this.loadEmps(), r[14]) : { by: "none" },
      r20 = r[20] && "object" === typeof r[20] ? r[20] : {},
      rvN = S.rv ? S.rv.n || "المسؤول" : "",
      ed = this.PC("edit") && this._tkSrv(),
      go = (kind) => (ev) => {
        (ev && ev.stopPropagation && ev.stopPropagation(), this._tkActOpen(kind, r, k));
      };
    return {
      p2On: !0,
      p2Review: "pending" === S.rev,
      p2ReviewTxt: "سُلّمت للمراجعة" + (rvN ? " — المراجِع: " + rvN : ""),
      p2RevBtns: "pending" === S.rev && ed,
      p2Approve: go("approve"),
      p2Return: go("return"),
      p2Ret: "returned" === S.rev,
      p2RetTxt: "أُعيدت لاستكمال: «" + ((x.rev && x.rev.why) || "—") + "»",
      p2Stall: "stalled" === S.exe,
      p2StallTxt: "متعثّرة: «" + ((r20.stall && r20.stall.why) || "—") + "»",
      p2Can: "cancelled" === S.asg,
      p2CanTxt: "أُلغيت" + (x.can && x.can.why ? " — «" + x.can.why + "»" : ""),
      p2Re: "reassigned" === S.asg,
      p2ReTxt: "أُعيد إسنادها إلى " + ((x.re && x.re.to && x.re.to.n) || "موظفٍ آخر"),
      p2AckOn: "acknowledged" === S.asg && !r[11],
      p2Unl: "name" === lk.by || "unknown" === lk.by || "ambiguous" === lk.by,
      p2UnlTxt: "ambiguous" === lk.by ? "غير مرتبطة · معرّفٌ يحمله أكثرُ من سجل" : "غير مرتبطة",
      p2Nid: "nid" === lk.by,
      p2Chips: [S.rv ? "بمراجعة" : "", x.rec ? this._tkRecChip(x.rec) : "", x.pol && x.pol.m && "any" !== x.pol.m ? M.polTxt(M.pol(r)) : "", M.win && M.win(r).set ? M.winTxt(M.win(r)) : "", r[21] && r[21].draft && !r[21].sub ? "مسودّة توثيق لم تُسلَّم" : "", x.elig && "متاح" !== x.elig.res ? x.elig.res : ""].filter(Boolean).join(" · "),
    };
  },
  _tkActOpen(kind, r, k) {
    this.setState(
      {
        rowMenu: null,
        tkAct: { kind: kind, k: k, id: r[13], ekey: null == r[14] ? null : String(r[14]), title: r[0] || "مهمة", name: r[8] || "", s: r[15] || 0, e: r[16] || 0, eid: this._tkEntId(r),
          rec: (() => { const xr = this._tkM() ? this._tkM().x(r) : null; return xr && xr.rec && xr.rec.id ? String(xr.rec.id) : ""; })() },
        tkActWhy: "",
        tkActTo: "",
        tkActExt: "",
        tkActErr: "",
        tkActBusy: !1,
        tkActElig: null,
        tkActLog: null,
        tkActHint: "",
      },
      () => {
        if ("log" === kind) this._tkLogLoad();
        if ("relink" === kind) {
          /* KIVO_265 · L-2: الاسمُ لا يختار أحداً — مرشَّحُ الاسم (إن تفرّد في السجل) اقتراحٌ يُعرض، والاختيارُ صريحٌ من القائمة (كان يُختار تلقائياً
             فنقرةٌ واحدة تربط صفّاً قديماً بإثباته وسجلّه بالشخص الخطأ حين يتشابه اسمان) */
          const M = this._tkM(),
            lk = M ? M.link(this.loadEmps(), r[14]) : null;
          this.setState({ tkActHint: lk && lk.cand && lk.cand.eid ? String(lk.cand.name || lk.cand.eid) : "" });
        }
      },
    );
  },
  _tkLogLoad() {
    const a = this.state.tkAct;
    if (!a) return;
    if (!a.eid) return void this.setState({ tkActLog: [] });
    this._tkApi("/api/aud?dept=" + encodeURIComponent(this._tkDept()) + "&etype=task&eid=" + encodeURIComponent(a.eid) + "&limit=100").then((x) => {
      const L = (x.j && x.j.rows) || [];
      this.state.tkAct === a && this.setState({ tkActLog: L.slice().reverse(), tkActErr: x.j && 1 === x.j.ok ? "" : this._tkErr(x, "تعذّر تحميل السجل") });
    });
  },
  _tkEligOne(ek) {
    const a = this.state.tkAct;
    if (!a || !ek) return;
    const s = a.s || Date.now(),
      e = this.state.tkActExt ? +this.state.tkActExt : a.e && a.e > s ? a.e : s + 36e5;
    this._tkApi("/api/tasks/eligibility?dept=" + encodeURIComponent(this._tkDept()) + "&ekeys=" + encodeURIComponent(ek) + "&s=" + s + "&e=" + e).then((x) => {
      const it = x.j && x.j.items && x.j.items[0];
      this.state.tkAct === a && this.state.tkActTo === ek && this.setState({ tkActElig: it || null });
    });
  },
  _tkActRun() {
    const a = this.state.tkAct,
      st = this.state;
    if (!a || st.tkActBusy) return;
    /* KIVO_265 · تأكيدُ «لمرة واحدة» لصفٍّ من سلسلة في نموذج التعديل: النافذةُ نفسُها ونصوصُها — والإنهاءُ يُرسل بعد وصول التعديل (_tkSettingsSrv) */
    if (a.form) return void this.setState({ tkAct: null, tkRecOk: !0 }, () => this.renderVals().submitTask());
    const why = String(st.tkActWhy || "").trim(),
      base = { k: a.k, id: a.id };
    let p = "",
      b = null;
    if ("approve" === a.kind || "return" === a.kind) {
      if ("return" === a.kind && !why) return void this.setState({ tkActErr: "اذكر ما ينقص الإثبات — يصل الموظفَ نصُّه" });
      ((p = "/api/tasks/review"), (b = Object.assign(base, { ekey: a.ekey, decision: a.kind, why: why || void 0 })));
    } else if ("extend" === a.kind) {
      if (!st.tkActExt) return void this.setState({ tkActErr: "اختر المهلةَ الجديدة" });
      ((p = "/api/tasks/extend"), (b = Object.assign(base, { ekey: a.ekey, e: +st.tkActExt, why: why || void 0 })));
    } else if ("reassign" === a.kind) {
      if (!st.tkActTo) return void this.setState({ tkActErr: "اختر الموظفَ الجديد" });
      const el = st.tkActElig,
        hard = el && "غير متاح" === el.result;
      if (el && el.hard) return void this.setState({ tkActErr: "«" + (el.name || "") + "»: " + (el.why || "لا حسابَ مستخدمٍ نشط") + " — لا تُسند إليه مهمةٌ إلكترونية" });   /* KIVO_265 · البند 4 */
      if (hard && !st.tkActForce) return void this.setState({ tkActForce: !0, tkActErr: "«" + (el.name || "") + "» غيرُ متاحٍ في موعدها: " + (el.why || "") + " — اضغط مرةً أخرى للإسناد رغم ذلك" });
      ((p = "/api/tasks/reassign"), (b = Object.assign(base, { from: a.ekey, to: st.tkActTo, why: why || void 0, force: hard ? !0 : void 0 })));
    } else if ("cancel" === a.kind) {
      if (!why) return void this.setState({ tkActErr: "اذكر سبب الإلغاء — يصل الموظفَ نصُّه" });
      ((p = "/api/tasks/cancel"), (b = Object.assign(base, { ekey: a.ekey, why: why })));
    } else if ("relink" === a.kind) {
      if (!st.tkActTo) return void this.setState({ tkActErr: "اختر الموظفَ صاحبَ المهمة" });
      ((p = "/api/tasks/relink"), (b = Object.assign(base, { from: a.ekey, to: st.tkActTo })));
    } else if ("recpause" === a.kind || "recresume" === a.kind || "recstop" === a.kind) {
      if (!a.rec) return void this.setState({ tkActErr: "ليست من سلسلة تكرار" });
      ((p = "/api/tasks/recur"), (b = { id: a.rec, op: { recpause: "pause", recresume: "resume", recstop: "stop" }[a.kind] }));
    } else return;
    this.setState({ tkActBusy: !0, tkActErr: "" });
    this._tkApi(p, b).then((x) => {
      if (x.j && 1 === x.j.ok) {
        const OK = { approve: "اعتُمد الإنجاز — وصل الموظفَ التنبيه", return: "أُعيدت المهمة للموظف لاستكمال الإثبات", extend: "مُدّدت المهلة — ويستطيع الموظفُ البدءَ الآن",
          reassign: "أُعيد الإسناد — نسخةٌ جديدة للمكلَّف الجديد، وسجلُّ الأول باقٍ", cancel: "أُلغيت المهمة — يبقى صفُّها وسجلُّها", relink: "رُبطت المهمة بسجلّ الموظف — تظهر في «ملفي» له",
          recpause: "أُوقف التكرار مؤقتاً — لا تُولَّد مواعيدُ جديدة حتى تستأنفه", recresume: "استُؤنف التكرار — تُولَّد المواعيدُ القادمة تلقائياً",
          recstop: "انتهت السلسلة" + (x.j.cancelled ? " — وأُلغيت " + KIVO.BassamCount(+x.j.cancelled, "مهمة") + " من المواعيد القادمة التي لم تبدأ" : "") + " · تبقى المواعيدُ السابقة بسجلّها وإثباتها" };
        return (this.setState({ tkAct: null, tkActBusy: !1, tkActForce: !1 }), void this.bsAck(OK[a.kind] || "تم", "ok"));
      }
      if (x.j && "elig" === x.j.err) return void this.setState({ tkActBusy: !1, tkActElig: (x.j.items || [])[0] || null, tkActForce: !1, tkActErr: "المكلَّفُ الجديد غيرُ متاحٍ في موعدها — راجع السبب ثم أكّد" });
      this.setState({ tkActBusy: !1, tkActErr: this._tkErr(x) });
    });
  },
  /* قيمُ نافذة الفعل (اعتماد · إعادة · تمديد · إعادة إسناد · إلغاء · ربط · سجل) */
  _tkActVals() {
    const a = this.state.tkAct,
      st = this.state;
    if (!a) return { tkActOn: !1 };
    const H = { approve: "اعتماد الإنجاز", return: "إعادة لاستكمال الإثبات", extend: "تمديد مهلة المهمة", reassign: "إعادة إسناد المهمة", cancel: "إلغاء المهمة", relink: "ربط المهمة بسجلّ موظف", log: "سجل المهمة",
        recpause: "إيقاف التكرار مؤقتاً", recresume: "استئناف التكرار", recstop: "إنهاء سلسلة التكرار" },
      B = { approve: "اعتماد", return: "إعادة للموظف", extend: "تمديد", reassign: st.tkActForce ? "إعادة الإسناد رغم ذلك" : "إعادة الإسناد", cancel: "إلغاء المهمة", relink: "ربط",
        recpause: "إيقاف مؤقت", recresume: "استئناف", recstop: "إنهاء السلسلة" },
      REC = { recpause: " · لا تُولَّد مواعيدُ جديدة حتى الاستئناف — والمولَّدةُ تبقى", recresume: " · تُولَّد المواعيدُ القادمة من جديد", recstop: " · تُلغى المواعيدُ القادمة التي لم تبدأ، وتبقى المنجزةُ والجارية بسجلّها" },
      W = {
        return: "ما الذي ينقص؟ (يصل الموظفَ نصُّه — مثال: صورة البوابة من الخارج)",
        cancel: "سبب الإلغاء (يصل الموظفَ نصُّه)",
        extend: "سبب التمديد (اختياري)",
        reassign: "سبب إعادة الإسناد (اختياري)",
        approve: "ملاحظة (اختياري)",
      },
      EA = this.loadEmps(),
      AC = "reassign" === a.kind ? this._tkAcctMap(EA) : null,
      emps = EA
        .filter((e) => e && e.eid && String(e.eid) !== String(a.ekey || ""))
        .map((e) => ({ v: String(e.eid), name: (e.name || String(e.eid)) + (AC && AC[String(e.eid)] ? " — " + this._tkM().ACCT_TXT[AC[String(e.eid)]] : ""), sel: String(e.eid) === String(st.tkActTo || "") }))
        .sort((x, y) => String(x.name).localeCompare(String(y.name), "ar")),
      now = Date.now(),
      base0 = Math.max(now, a.e || 0),
      ext = [
        ["+ ساعة", base0 + 36e5],
        ["+ 3 ساعات", base0 + 108e5],
        ["+ يوم", base0 + 864e5],
        ["+ 3 أيام", base0 + 2592e5],
      ].map(([l, v]) => ({ label: l, click: () => this.setState({ tkActExt: String(v), tkActErr: "" }), style: this._tkChip(String(v) === String(st.tkActExt)) })),
      el = st.tkActElig,
      ACT = { created: "أُنشئت", accepted: "بدأ التنفيذ", acknowledged: "أكّد الاستلام", finished: "أُنجزت", completed: "أُنجزت", submitted: "سُلّمت للمراجعة", approved: "اعتُمدت",
        returned: "أُعيدت للاستكمال", declined: "اعتذار", expired: "انقضت مهلتها", stalled: "تعثّرت", resumed: "استؤنفت", documented: "وُثّقت (مسودّة)", extended: "مُدّدت مهلتها",
        reassigned: "أُعيد إسنادها", cancelled: "أُلغيت", relinked: "رُبطت بسجلّ موظف", edited: "عُدّلت", status_changed: "تغيّرت حالتها", deleted: "حُذفت",
        rec_pause: "أُوقف التكرار مؤقتاً", rec_resume: "استُؤنف التكرار", rec_stop: "أُنهي التكرار", rec_edit: "عُدّل التكرار", rec_start: "بدأ التكرار" },
      log = (st.tkActLog || []).map((q) => {
        let why = "";
        try {
          const f = q.aft ? JSON.parse(q.aft) : null;
          why = f && "string" === typeof f.why ? f.why : "";
        } catch (e) {
          why = "";   /* تفصيلٌ غيرُ مقروء — يُعرض الحدثُ بلا سبب */
        }
        const p = q.ts ? this.fmtStampParts(q.ts) : null;
        return { txt: ACT[q.act] || q.act, by: q.name || "—", at: p ? p.date.replace(" هـ", "") + " · " + p.time : "", why: why, whyOn: !!why };
      });
    return {
      tkActOn: !0,
      tkActHead: H[a.kind] || "",
      tkActSub: "«" + a.title + "»" + (a.name ? " — " + a.name : "") + ("extend" === a.kind && a.e ? " · المهلةُ الحالية " + this.tkClock(a.e) + " " + this.tkHDay(a.e) : "") +
        /* مراجعة U1: من النموذج يبقى الصفُّ المعدَّل (row) — وتُلغى القادمةُ بعده */
        (a.form ? " · تبقى هذه المهمة، وتتوقف المواعيدُ التالية (تُلغى القادمةُ التي لم تبدأ) — وتُحفظ تعديلاتُك عليها" : REC[a.kind] || "") +
        ("relink" === a.kind && st.tkActHint ? " · اقتراحٌ بالاسم: «" + st.tkActHint + "» — اختره من القائمة إن كان هو" : ""),
      tkActWhyOn: "log" !== a.kind && "relink" !== a.kind && !REC[a.kind],
      tkActWhy: st.tkActWhy || "",
      tkActWhyPh: W[a.kind] || "",
      onTkActWhy: (t) => this.setState({ tkActWhy: t.target.value, tkActErr: "" }),
      tkActEmpOn: "reassign" === a.kind || "relink" === a.kind,
      tkActEmps: emps,
      onTkActTo: (t) => {
        const v = t.target.value;
        (this.setState({ tkActTo: v, tkActElig: null, tkActForce: !1, tkActErr: "" }), "reassign" === a.kind && v && this._tkEligOne(v));
      },
      tkActEligOn: !!el,
      tkActEligTxt: el ? el.result + (el.why ? " — " + el.why : "") + (el.warn && el.warn.length ? " · " + el.warn.join(" · ") : "") : "",
      tkActEligStyle:
        "font-size:11px;line-height:1.8;padding:8px 11px;border-radius:10px;border:1px solid " +
        (el && "متاح" === el.result ? "var(--success-border);background:var(--success-bg);color:var(--success-text)" : el && "غير متاح" === el.result ? "var(--danger-border);background:var(--danger-bg);color:var(--danger-text)" : "var(--warning-border);background:var(--warning-bg);color:var(--warning-text)"),
      tkActExtOn: "extend" === a.kind,
      tkActExts: ext,
      tkActExtTxt: st.tkActExt ? "المهلةُ الجديدة: " + this.tkClock(+st.tkActExt) + " " + this.tkHDay(+st.tkActExt) : "",
      tkActLogOn: "log" === a.kind,
      tkActLogList: log,
      tkActLogEmpty: "log" === a.kind && null !== st.tkActLog && !log.length,
      tkActLogWait: "log" === a.kind && null === st.tkActLog,
      tkActErr: st.tkActErr || "",
      tkActBtnOn: "log" !== a.kind,
      tkActBtn: st.tkActBusy ? "جارٍ الحفظ…" : B[a.kind] || "تنفيذ",
      tkActBtnStyle:
        "height:38px;padding:0 20px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;border:0;font-family:'Cairo',sans-serif;color:var(--text-on-fill);background:" +
        ("cancel" === a.kind ? "var(--danger)" : "approve" === a.kind ? "var(--success)" : "var(--border-brand)") +
        (st.tkActBusy ? ";opacity:.6" : ""),
      tkActDo: () => this._tkActRun(),
      tkActCancel: () => this.setState({ tkAct: null, tkActForce: !1 }),
      tkActCloseLbl: "log" === a.kind ? "إغلاق" : "رجوع",
    };
  },
  /* نافذةُ الأهلية عند الإنشاء: «غير متاح» يُكشف قبل الإسناد — ولا يُنشأ إلا بتأكيدك */
  _tkEligVals() {
    const E = this.state.tkElig;
    if (!E) return { tkEligOn: !1 };
    const items = (E.items || []).map((q) => ({
      name: q.name || q.ekey,
      res: q.result,
      why: (q.why || "") + (q.warn && q.warn.length ? " · " + q.warn.join(" · ") : ""),
      style:
        "font-size:10px;font-weight:700;padding:2px 9px;border-radius:9999px;white-space:nowrap;border:1px solid " +
        ("متاح" === q.result ? "var(--success-border);background:var(--success-bg);color:var(--success-text)" : "غير متاح" === q.result ? "var(--danger-border);background:var(--danger-bg);color:var(--danger-text)" : "var(--warning-border);background:var(--warning-bg);color:var(--warning-text)"),
    }));
    /* KIVO_265 · البند 4: بلا حسابِ مستخدمٍ نشط ⇒ لا «إسنادٌ رغم ذلك» (الخادمُ يرفضه ولو بالتأكيد) — يُزال من الإسناد أو يُفعَّل حسابُه */
    const noAc = (E.items || []).filter((q) => q.hard),
      hard = !!E.acct || noAc.length > 0;
    return {
      tkEligOn: !0,
      tkEligItems: items,
      tkEligForceOn: !hard,
      tkEligSub: hard
        ? "لا تُسند مهمةٌ إلكترونية لمن لا يملك حسابَ مستخدمٍ نشطاً (" + noAc.map((q) => q.name || q.ekey).join("، ") + ") — أزِله من الإسناد، أو أنشئ له حساباً مرتبطاً بسجلّه أو فعِّل حسابه، ثم أعد الحفظ"
        : items.filter((q) => "غير متاح" === q.res).length + " من " + items.length + " غيرُ متاحين في موعد التنفيذ (الجدول الشهري · تقرير اليوم · المهام الأخرى)",
      tkEligForce: () => (hard ? void 0 : this._tkCreateSrv(Object.assign({}, E.body, { force: !0 }))),
      tkEligBack: () => this.setState({ tkElig: null }),
    };
  },
});
