/* KIVO_265 · البند 19 (تقسيمُ منطق صفحة المهام) — جزءُ «الإجراءات الجماعية» (البند 11): الاختيارُ بمفتاح يوم#هوية#مكلَّف · التنفيذُ صفاً صفاً
   بالمسارات القائمة مع التقدّم والملخّص وتخطّي غيرِ المؤهّل بسببه. يُجمَع بعد logic.js بترتيب meta.json "logicParts". */
"use strict";
Object.assign(Component.prototype, {
  /* ═══ KIVO_265 · البند 11 — إجراءاتٌ جماعية: خانةُ اختيارٍ لكل صفّ · «تحديد الكل في الصفحة» · شريطٌ يظهر عند التحديد: اعتماد (للمسلَّمة بانتظار المراجعة) ·
     تمديدُ المهلة (قيمةٌ واحدة) · إلغاءٌ بسببٍ واحد · إعادةُ إسناد إلى موظفٍ واحد. التنفيذُ بالمسارات القائمة صفّاً صفّاً بتسلسل (/api/tasks/review · extend ·
     cancel · reassign — الأجسامُ نفسُها كـ_tkActRun) مع مؤشّر تقدّم وملخّصٍ نهائي (نجح N · فشل M بأسبابه) وتخطّي غيرِ المؤهّل بسببٍ واضح. لا مسارَ خادمٍ جديداً.
     مفتاحُ التحديد: يومُ الصفّ # هويتُه # مكلَّفُه (توأما المجموعة بالهوية نفسِها يتمايزان بالمكلَّف) — ويُحلّ من المخزن وقتَ التنفيذ لا من لقطةٍ قديمة ═══ */
  _tkSelKey(k, r) {
    return k + "#" + (null == r[13] ? "" : r[13]) + "#" + (null == r[14] ? "" : String(r[14]));
  },
  _tkSelRow(key) {
    const p = String(key).split("#"),
      L = this.loadAllTasks()[p[0]] || [];
    return L.find((r) => Array.isArray(r) && String(null == r[13] ? "" : r[13]) === p[1] && String(null == r[14] ? "" : r[14]) === p[2]) || null;
  },
  _tkSelToggle(key, on) {
    this.setState((s) => {
      const S = { ...(s.tkSel || {}) };
      return ((void 0 === on ? !S[key] : on) ? (S[key] = 1) : delete S[key], { tkSel: S });
    });
  },
  /* أهليةُ صفٍّ لإجراءٍ جماعي — مرآةُ شروط قائمة الصفّ (_tkP2Menu) — "" مؤهّل وإلا سببُ التخطّي */
  _tkBulkWhyNot(kind, r, to) {
    const M = this._tkM();
    if (!M || !Array.isArray(r)) return "صفٌّ غيرُ صالح";
    const S = M.state(r),
      lk = r[14] ? M.link(this.loadEmps(), r[14]) : { by: "none" },
      shut = "cancelled" === S.asg ? "ملغاة" : "reassigned" === S.asg ? "أُعيد إسنادُها" : "done" === r[3] ? "منجزة" : "declined" === r[3] ? "اعتذر عنها الموظف" : "";
    if ("approve" === kind) return "pending" === S.rev ? "" : "ليست بانتظار المراجعة" + (shut ? " (" + shut + ")" : "");
    if ("extend" === kind) return S.closed ? "مغلقة — " + (shut || "منتهية") : "";
    if ("cancel" === kind) return "done" === r[3] ? "منجزة" : "cancelled" === S.asg ? "ملغاة أصلاً" : "reassigned" === S.asg ? "أُعيد إسنادُها" : "";
    if ("reassign" === kind) {
      if (!r[14]) return "عامةٌ بلا مكلَّف";
      if ("done" === r[3]) return "منجزة";
      if ("cancelled" === S.asg || "reassigned" === S.asg) return shut;
      if ("eid" !== lk.by && "nid" !== lk.by) return "غيرُ مرتبطةٍ بسجلّ موظف — اربطها أولاً";
      if (to && String(r[14]) === String(to)) return "مسندةٌ إلى الموظف نفسِه";
      return "";
    }
    return "إجراءٌ غيرُ معروف";
  },
  _tkBulkOpen(kind) {
    this.setState({ tkBulk: { kind: kind }, tkBulkWhy: "", tkBulkTo: "", tkBulkExt: "", tkBulkErr: "", tkBulkBusy: !1, tkBulkProg: null, tkBulkRes: null, rowMenu: null, fddOpen: null });
  },
  _tkBulkKeys() {
    const e = this.state,
      pre = e.year + "-" + e.month + "-";
    return Object.keys(e.tkSel || {}).filter((k) => 0 === k.indexOf(pre));
  },
  _tkBulkRun() {
    const b = this.state.tkBulk,
      st = this.state;
    if (!b || st.tkBulkBusy || st.tkBulkRes) return;
    const why = String(st.tkBulkWhy || "").trim(),
      kind = b.kind;
    if ("cancel" === kind && !why) return void this.setState({ tkBulkErr: "اذكر سبب الإلغاء — يصل كلَّ موظفٍ نصُّه" });
    if ("extend" === kind && !st.tkBulkExt) return void this.setState({ tkBulkErr: "اختر المهلةَ الجديدة" });
    if ("reassign" === kind && !st.tkBulkTo) return void this.setState({ tkBulkErr: "اختر الموظفَ الجديد" });
    const keys = this._tkBulkKeys(),
      jobs = [],
      res = { ok: 0, fail: [], skip: [] };
    keys.forEach((key) => {
      const r = this._tkSelRow(key);
      if (!r) return void res.skip.push({ title: key, why: "لم تعد في المخزن — حدّث الصفحة" });
      const no = this._tkBulkWhyNot(kind, r, st.tkBulkTo);
      no ? res.skip.push({ title: r[0] || "مهمة", why: no }) : jobs.push({ key: key, r: r });
    });
    if (!jobs.length) return void this.setState({ tkBulkRes: res, tkBulkProg: { done: 0, total: 0 } });
    const base = (r) => ({ k: String(key0(r)), id: r[13] }),
      key0 = (r) => jobs.find((j) => j.r === r).key.split("#")[0],
      body = (r) =>
        "approve" === kind
          ? ["/api/tasks/review", Object.assign(base(r), { ekey: null == r[14] ? null : String(r[14]), decision: "approve", why: why || void 0 })]
          : "extend" === kind
            ? ["/api/tasks/extend", Object.assign(base(r), { ekey: null == r[14] ? null : String(r[14]), e: +st.tkBulkExt, why: why || void 0 })]
            : "cancel" === kind
              ? ["/api/tasks/cancel", Object.assign(base(r), { ekey: null == r[14] ? null : String(r[14]), why: why })]
              : ["/api/tasks/reassign", Object.assign(base(r), { from: String(r[14]), to: st.tkBulkTo, why: why || void 0 })];
    this.setState({ tkBulkBusy: !0, tkBulkErr: "", tkBulkProg: { done: 0, total: jobs.length, cur: jobs[0].r[0] || "" } });
    const okKeys = [];
    const step = (i) => {
      if (i >= jobs.length) {
        /* الختام: المنفَّذةُ تخرج من التحديد، والفاشلةُ تبقى محدَّدة لإعادة المحاولة */
        return void this.setState((s) => {
          const S = { ...(s.tkSel || {}) };
          okKeys.forEach((k) => delete S[k]);
          return { tkSel: S, tkBulkBusy: !1, tkBulkRes: res, tkBulkProg: { done: jobs.length, total: jobs.length, cur: "" } };
        });
      }
      const j = jobs[i],
        [p, bd] = body(j.r);
      this._tkApi(p, bd).then((x) => {
        /* «غير متاح» (409 elig) لا يُفرض جماعياً — يُسجَّل بسببه ويُعاد إسنادُه فردياً بالتأكيد من قائمة الصفّ */
        const el = x.j && "elig" === x.j.err ? (x.j.items || [])[0] : null;
        x.j && 1 === x.j.ok ? (res.ok++, okKeys.push(j.key)) : res.fail.push({ title: j.r[0] || "مهمة", why: el ? "المكلَّفُ الجديد غيرُ متاحٍ في موعدها" + (el.why ? ": " + el.why : "") + " — أعد إسنادَها فردياً من قائمة الصفّ" : this._tkErr(x) });
        this.setState({ tkBulkProg: { done: i + 1, total: jobs.length, cur: i + 1 < jobs.length ? jobs[i + 1].r[0] || "" : "" } }, () => step(i + 1));
      });
    };
    step(0);
  },
  /* قيمُ الشريط الجماعي والنافذة — pageRows: صفوفُ الصفحة المعروضة (المرئيّ وحده) */
  _tkBulkVals(pageRows) {
    const e = this.state,
      locked = this.monthLockedT(e.year, e.month),
      can = this._tkSrv() && !!this._tkM() && this.PC("edit") && !locked,
      sel = e.tkSel || {},
      keys = this._tkBulkKeys(),
      n = keys.length,
      pr = (pageRows || []).filter((t) => t.selCan),
      allOn = pr.length > 0 && pr.every((t) => !!sel[t.selKey]),
      b = e.tkBulk,
      H = { approve: "اعتماد الإنجاز لكل المحدَّد", extend: "تمديد مهلة المحدَّد", cancel: "إلغاء المهام المحدَّدة", reassign: "إعادة إسناد المحدَّد إلى موظف" },
      B = { approve: "اعتماد", extend: "تمديد", cancel: "إلغاء المهام", reassign: "إعادة الإسناد" },
      W = { cancel: "سبب الإلغاء (يصل كلَّ موظفٍ نصُّه)", extend: "سبب التمديد (اختياري)", reassign: "سبب إعادة الإسناد (اختياري)", approve: "ملاحظة (اختياري)" },
      kind = b ? b.kind : "",
      EA = b ? this.loadEmps() : [],
      AC = "reassign" === kind ? this._tkAcctMap(EA) : null,
      col = this._tkColl(),
      emps = EA.filter((q) => q && q.eid)
        .map((q) => ({ v: String(q.eid), name: (q.name || String(q.eid)) + (AC && AC[String(q.eid)] ? " — " + this._tkM().ACCT_TXT[AC[String(q.eid)]] : ""), sel: String(q.eid) === String(e.tkBulkTo || "") }))
        .sort((x, y) => col(x.name, y.name)),
      now = Date.now(),
      ext = [
        ["+ ساعة", now + 36e5],
        ["+ 3 ساعات", now + 108e5],
        ["+ يوم", now + 864e5],
        ["+ 3 أيام", now + 2592e5],
      ].map(([l, v]) => ({ label: l, click: () => this.setState({ tkBulkExt: String(v), tkBulkErr: "" }), style: this._tkChip(String(v) === String(e.tkBulkExt)) })),
      /* معاينةُ الأهلية قبل التنفيذ: كم صفّاً مؤهّلٌ وكم سيُتخطّى */
      pv = b && !e.tkBulkRes ? keys.map((k) => this._tkSelRow(k)).map((r) => (r ? this._tkBulkWhyNot(kind, r, e.tkBulkTo) : "غائب")) : [],
      pvOk = pv.filter((w) => !w).length,
      P = e.tkBulkProg,
      R = e.tkBulkRes,
      act = (k, l, c) => ({ label: l, click: () => this._tkBulkOpen(k), style: "height:30px;padding:0 11px;border-radius:9px;font-size:11px;font-weight:700;cursor:pointer;font-family:'Cairo',sans-serif;border:1px solid " + c });
    return {
      selAllOn: allOn,
      selAllCan: can && pr.length > 0,
      selAllToggle: () =>
        this.setState((s) => {
          const S = { ...(s.tkSel || {}) };
          return (pr.forEach((t) => (allOn ? delete S[t.selKey] : (S[t.selKey] = 1))), { tkSel: S });
        }),
      selAllStyle: this._tkCbStyle(allOn, !can || !pr.length),
      tkBulkOn: can && n > 0,
      tkBulkN: KIVO.BassamCount(n, "مهمة", "g"),
      tkBulkClear: () => this.setState({ tkSel: {} }),
      tkBulkActs: [
        act("approve", "✓ اعتماد الإنجاز", "var(--success-border);background:var(--success-bg);color:var(--success-text)"),
        act("extend", "تمديد المهلة", "var(--info-border);background:var(--info-bg);color:var(--info-text)"),
        act("reassign", "إعادة إسناد", "var(--tone-gold-50-a40);background:var(--tone-gold-50-a10);color:var(--brand-text)"),
        act("cancel", "إلغاء", "var(--danger-border);background:var(--danger-bg);color:var(--danger-text)"),
      ],
      tkBulkOpen: !!b,
      tkBulkHead: H[kind] || "",
      tkBulkSub: b
        ? R
          ? "اكتمل التنفيذ — نجح " + R.ok + " · فشل " + R.fail.length + " · تُخطّي " + R.skip.length
          : P && e.tkBulkBusy
            ? "جارٍ التنفيذ صفّاً صفّاً… " + P.done + " من " + P.total + (P.cur ? " · الآن: «" + P.cur + "»" : "")
            : KIVO.BassamCount(n, "مهمة", "g") + " محدَّدة — " + pvOk + " مؤهّلة" + (n - pvOk ? " · " + (n - pvOk) + " ستُتخطّى بسببها" : "") + ("extend" === kind ? " · المهلةُ الجديدة واحدةٌ للجميع" : "")
        : "",
      tkBulkWhyOn: !!b && !R,
      tkBulkWhy: e.tkBulkWhy || "",
      tkBulkWhyPh: W[kind] || "",
      onTkBulkWhy: (t) => this.setState({ tkBulkWhy: t.target.value, tkBulkErr: "" }),
      tkBulkEmpOn: "reassign" === kind && !R,
      tkBulkEmps: emps,
      onTkBulkTo: (t) => this.setState({ tkBulkTo: t.target.value, tkBulkErr: "" }),
      tkBulkExtOn: "extend" === kind && !R,
      tkBulkExts: ext,
      tkBulkExtTxt: e.tkBulkExt ? "المهلةُ الجديدة: " + this.tkClock(+e.tkBulkExt) + " " + this.tkHDay(+e.tkBulkExt) : "",
      tkBulkProgOn: !!P && P.total > 0,
      tkBulkProgPct: P && P.total ? Math.round((100 * P.done) / P.total) + "%" : "0%",
      tkBulkProgTxt: P ? P.done + " / " + P.total : "",
      tkBulkResOn: !!R,
      tkBulkResOk: R ? "نجح " + KIVO.BassamCount(R.ok, "مهمة") : "",
      tkBulkResFail: R ? R.fail : [],
      tkBulkResFailOn: !!(R && R.fail.length),
      tkBulkResSkip: R ? R.skip : [],
      tkBulkResSkipOn: !!(R && R.skip.length),
      tkBulkErr: e.tkBulkErr || "",
      tkBulkBtnOn: !!b && !R,
      tkBulkBtn: e.tkBulkBusy ? "جارٍ التنفيذ…" : (B[kind] || "تنفيذ") + (pvOk ? " (" + pvOk + ")" : ""),
      tkBulkBtnStyle:
        "height:38px;padding:0 20px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;border:0;font-family:'Cairo',sans-serif;color:var(--text-on-fill);background:" +
        ("cancel" === kind ? "var(--danger)" : "approve" === kind ? "var(--success)" : "var(--border-brand)") +
        (e.tkBulkBusy || !pvOk ? ";opacity:.6" : ""),
      tkBulkDo: () => this._tkBulkRun(),
      tkBulkCancel: () => {
        e.tkBulkBusy || this.setState({ tkBulk: null, tkBulkRes: null, tkBulkProg: null });
      },
      tkBulkCloseLbl: R ? "إغلاق" : "رجوع",
    };
  },
});
