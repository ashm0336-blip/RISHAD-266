/* KIVO_265 · البند 19 (تقسيمُ منطق صفحة المهام) — جزءُ «الإنتاجية» (البند 8): تقريرُ الشهر لكل موظف ولكل وردية من المخزن الشهري المحلي
   (المسندة · المنجزة · في الوقت/متأخرة · الفعلي/المخطط · التوثيق). يُجمَع بعد logic.js بترتيب meta.json "logicParts". */
"use strict";
Object.assign(Component.prototype, {
  /* ═══ KIVO_265 · البند 8 — تقريرُ إنتاجية المهام للشهر المختار: لكل موظف ولكل وردية (ورديةُ الموظف من الجدول الشهري كما يراها المنتقي):
     المسندة · المنجزة · في الوقت/متأخرة (من العمود 6) · متوسطُ الفعلي/المخطط (12−11 مقابل 10 للمنجزة ذات المخطط) · معدّلُ التوثيق بالصور (منجزةٌ بصورة ÷ المنجزة).
     من المخزن الشهري المحلي كما تفعل الصفحة (صفوفُ الشهر المرئية للمشاهد — بلا فلاتر). نسخةُ «أُعيد إسنادها» لا تُعدّ مسندةً (صفُّها الجديد يُعدّ) ═══ */
  _tkProdVals(rows) {
    const e = this.state,
      on = "prod" === e.sub,
      SM = this._tkShiftMap(e.year, e.month),
      EI = this._tkEmpIx(),
      col = this._tkColl(),
      mk = (name, shift) => ({ name: name, shift: shift, asg: 0, done: 0, onTime: 0, late: 0, apSum: 0, apN: 0, img: 0, can: 0 }),
      add = (o, r) => {
        const x = r[23] && "object" === typeof r[23] ? r[23] : {},
          done = "done" === r[3],
          pf = done && Array.isArray(r[6]) ? String(r[6][0] || "") : "";
        /* الموجة 1 · DG-01: الملغاةُ ليست مسندةً قائمة — تُعدّ في can وحدها ولا تدخل المقام (كانت «المسندة 14 · المنجزة 2 · 14٪» والحيُّ منجزٌ كله) */
        if ("cancelled" === x.asg) return void o.can++;
        o.asg++;
        if (!done) return;
        (o.done++, ("on_time" === pf || "early" === pf) && o.onTime++, "late" === pf && o.late++);
        r[11] && r[12] && +r[10] > 0 && ((o.apSum += Math.max(0, (r[12] - r[11]) / 6e4) / +r[10]), o.apN++);
        r[21] && "object" === typeof r[21] && Array.isArray(r[21].imgs) && r[21].imgs.length && o.img++;
      },
      E = {},
      H = {},
      pct = (a, b) => (b ? Math.round((100 * a) / b) + "٪" : "—");
    let noAsg = 0,
      canN = 0;
    (rows || []).forEach((t) => {
      const r = t.tkcT,
        x = r[23] && "object" === typeof r[23] ? r[23] : {};
      if (!r[14] || "reassigned" === x.asg) return void (r[14] || noAsg++);
      "cancelled" === x.asg && canN++;
      const ek = String(r[14]),
        emp = EI.byKey[ek] || null,
        sh = this._tkShiftOf(emp, SM) || "بلا وردية",
        nm = (emp && emp.name) || t.avNames || ek;
      (E[ek] || (E[ek] = mk(nm, sh)), add(E[ek], r), H[sh] || (H[sh] = mk(sh, sh)), add(H[sh], r));
    });
    const fin = (o) =>
        Object.assign(o, {
          onTimeTxt: o.onTime + " / " + o.late,
          apAvg: o.apN ? Math.round((100 * o.apSum) / o.apN) + "٪" : "—",
          apWarn: o.apN > 0 && o.apSum / o.apN > 1.2,
          apStyle: o.apN > 0 && o.apSum / o.apN > 1.2 ? "color:var(--warning-text);font-weight:700" : "",
          apTip: o.apN ? "متوسطُ الفعلي ÷ المخطط لـ" + KIVO.BassamCount(o.apN, "مهمة", "g") + " منجزةٍ بمدةٍ مخططة" : "لا منجزةَ بمدةٍ مخططة",
          docPct: pct(o.img, o.done),
          docTip: o.done ? o.img + " من " + o.done + " منجزةً بصورة" : "لا منجزة",
          donePct: pct(o.done, o.asg),
          onTimePct: pct(o.onTime, o.onTime + o.late),
          asgS: String(o.asg),
          doneS: String(o.done),
          onTimeS: String(o.onTime),
          lateS: String(o.late),
        }),
      srt = (a, b) => b.done - a.done || b.asg - a.asg || col(a.name, b.name),
      /* موظفٌ أو ورديةٌ كلُّ مهامها ملغاة ⇒ لا صفَّ له (لا «المسندة 0») */
      emps = Object.keys(E).filter((k) => E[k].asg > 0).map((k) => fin(E[k])).sort(srt),
      shifts = Object.keys(H).filter((k) => H[k].asg > 0).map((k) => fin(H[k])).sort((a, b) => ("بلا وردية" === a.name) - ("بلا وردية" === b.name) || srt(a, b)),
      tot = fin(emps.reduce((o, q) => ((o.asg += q.asg), (o.done += q.done), (o.onTime += q.onTime), (o.late += q.late), (o.apSum += q.apSum), (o.apN += q.apN), (o.img += q.img), (o.can += q.can), o), mk("الإجمالي", ""))),
      ttl = "إنتاجية مهام " + this.MONTHS[e.month - 1] + " " + e.year + " هـ",
      aoa = () =>
        [["الموظف", "الوردية", "المسندة", "المنجزة", "نسبة الإنجاز", "في الوقت", "متأخرة", "متوسط الفعلي/المخطط", "التوثيق بالصور"]]
          .concat(emps.map((q) => [q.name, q.shift, q.asg, q.done, q.donePct, q.onTime, q.late, q.apAvg, q.docPct]))
          .concat([[tot.name, "", tot.asg, tot.done, tot.donePct, tot.onTime, tot.late, tot.apAvg, tot.docPct], [], ["الوردية", "", "المسندة", "المنجزة", "نسبة الإنجاز", "في الوقت", "متأخرة", "متوسط الفعلي/المخطط", "التوثيق بالصور"]])
          .concat(shifts.map((q) => [q.name, "", q.asg, q.done, q.donePct, q.onTime, q.late, q.apAvg, q.docPct]));
    return {
      showProd: on,
      subProd: () => this.setState({ sub: "prod" }),
      subProdStyle:
        "height:28px;padding:0 8px;border-radius:8px;display:flex;align-items:center;justify-content:center;border:0;cursor:pointer;transition:all .2s;font-size:11px;font-family:'Cairo',sans-serif;" +
        (on ? "background:var(--bg-xb99751);color:var(--text-on-brand)" : "background:transparent;color:var(--fg-x94a3b8)"),
      prodTitle: ttl,
      prodSub: KIVO.BassamCount(tot.asg, "مهمة", "g") + " مسندة إلى " + this.tkN(emps.length) + " في " + KIVO.BassamCount(shifts.length, "وردية") + (noAsg ? " · " + KIVO.BassamCount(noAsg, "مهمة", "g") + " عامة بلا مكلَّف (خارج الحساب)" : "") + (canN ? " · " + canN + " ملغاة (خارج الحساب)" : "") + " — من المخزن الشهري المحلي · الوردية من الجدول الشهري",
      prodEmpRows: emps,
      prodShiftRows: shifts,
      prodTot: tot,
      prodEmpty: on && 0 === emps.length,
      prodHas: emps.length > 0,
      prodExport: () => {
        if (!this.PC("export")) return;
        try {
          KIVO.BassamXLSX && KIVO.BassamXLSX.download(aoa(), "tasks-prod-" + this.MONTHS[e.month - 1] + "-" + e.year + ".xlsx");
        } catch (t) {}
      },
      prodPrint: () => {
        this.PC("export") && setTimeout(() => window.print(), 150);
      },
      prodAoa: aoa,
    };
  },
});
