/* KIVO_265 · البند 19 (تقسيمُ منطق صفحة المهام) — جزءُ «منتقي الإسناد»: نموذجُ المنتقي (الورديات · الموظفون · القوالب · البند 13 الأداء مع 1000+)
   وقيمُ الإسناد وصفوفُ المجموعات وحسابُ المستخدم النشط (البند 4). يُجمَع بعد logic.js بترتيب meta.json "logicParts" (tools/page_modules.py)
   — مناهجُ Component نفسُها نُقلت بنصّها إلى Object.assign(Component.prototype, {…}) بلا تغييرِ سلوك. */
"use strict";
Object.assign(Component.prototype, {
  _tkPickers(t, e, n) {
    const a = (t, e) => {
        if (!t) return { d: n, h: e, m: 0, ap: "ص" };
        const a = new Date(t),
          r = a.getHours();
        let s = n;
        try {
          const e = this.tkHParts(t);
          e && e.d && (s = e.d);
        } catch (t) {}
        return { d: s, h: r % 12 || 12, m: a.getMinutes(), ap: r >= 12 ? "م" : "ص" };
      },
      r = a(t, 8),
      s = a(e, 10);
    return { newDay: r.d, newSh: r.h, newSm: r.m, newSap: r.ap, newEDay: s.d, newEh: s.h, newEm: s.m, newEap: s.ap };
  },
  /* ═══ رؤية المهام العامة المقيّدة بنوع عمل: الموظف يرى ما يخصّ نوع عمله (أو غير المقيّد) — والمدراء يرون الكل ═══ */
  tkViewer() {
    try {
      const t = KIVO.BassamAuth && KIVO.BassamAuth.user ? KIVO.BassamAuth.user() : null;
      if (!t || "staff" !== t.role || t.mgr) return { all: !0 };
      let n = !1;
      try {
        n = !!(KIVO.BassamSup && KIVO.BassamSup.isSup(t.ekey));
      } catch (t) {}
      const e = this.loadEmps().find((e) => (KIVO.BassamEmp ? KIVO.BassamEmp.key(e) : e.eid || e.nid || e.name) === t.ekey);
      return { all: !1, sup: n, me: t.ekey || "", wt: String((e && e.work) || "").trim() };
    } catch (t) {
      return { all: !0 };
    }
  },
  /* الموظف يرى: العامة غير المقيّدة، والعامة المقيّدة بنوع عمله، وما وُجّه إليه هو — ورئيس/نائب الوردية (قالب إشرافي) يرى مهام غيره الموجّهة أيضاً */
  tkVisible(t, e) {
    return !!e.all || (t[14] ? e.sup || t[14] === e.me : !t[19] || t[19] === e.wt);
  },
  tkN(t, e) {
    return KIVO.BassamCount(t, "موظف", e ? "g" : "");
  },
  /* أنواع العمل المعروضة = ما في قائمة «نوع العمل» ∩ ما هو مُسجَّل فعلاً على موظفي الإدارة — نوعٌ بلا موظف لا يُعرض، والإضافة والحذف وإعادة التسمية في القائمة تنعكس فوراً */
  tkWorkTypes() {
    let t = ["ميداني", "إداري"];
    try {
      const e = this._tkLS("bassam_options_v1");
      e && Array.isArray(e.work) && (t = e.work.map((t) => String(t || "").trim()).filter(Boolean));
    } catch (t) {}
    const e = {};
    this.loadEmps().forEach((t) => {
      const n = String((t && t.work) || "").trim();
      n && (e[n] = (e[n] || 0) + 1);
    });
    return t.filter((t) => e[t] > 0);
  },
  tkTplInfo() {
    const t = {};
    let e = [];
    try {
      const t = this._tkLS("bassam_perm_tpls_v1");
      Array.isArray(t) && (e = t);
    } catch (t) {}
    const n = KIVO.BassamPerm;
    return (
      this.loadEmps().forEach((a) => {
        try {
          const r = KIVO.BassamEmp ? KIVO.BassamEmp.key(a) : a.eid || a.nid || a.name,
            s = n && n.tplOfEmp ? n.tplOfEmp(r) : "",
            o = s ? e.findIndex((t) => t.id === s) : -1;
          t[r] = { tpl: o >= 0 ? e[o].name : "", ord: o >= 0 ? o : s ? 98 : 99 };
        } catch (t) {}
      }),
      t
    );
  },
  tkShiftOpts() {
    try {
      const t = this._tkLS("bassam_shift_options_v1");
      if (Array.isArray(t) && t.length && t.every((t) => t && t.name)) return t;
    } catch (t) {}
    return [
      { name: "الوردية الأولى", color: "#b99751" },
      { name: "الوردية الثانية", color: "#2f8f86" },
      { name: "الوردية الثالثة", color: "#2f5f8a" },
      { name: "الوردية الرابعة", color: "#1e9a66" },
    ];
  },
  /* ═══ نموذج منتقي الإسناد: الموظفون مجموعين بورديات يوم المهمة، ومن في راحة أو مؤشَّر غائباً/مستأذناً/بإجازة في تقرير ذلك اليوم يُعلَّم ولا يُختار ═══
     KIVO_265 · البند 13 (أداءُ المنتقي مع 1000+ موظف): كان كلُّ رسمٍ يعيد تحليلَ الجدول الشهري وتقرير اليوم والموظفين والقوالب ويرتّب بـlocaleCompare.
     الآن: المخازنُ من ذاكرة القراءة (_tkLS)، والنموذجُ كلُّه مخزَّنٌ لليوم (ym · يوم · الجدول · التقرير · الموظفون · نسخةُ الحسابات) ويُبطَل بتغيّر أيٍّ منها
     أو بحدث المخزن (_tkLSBust)؛ ومقارنٌ واحد (Intl.Collator)؛ واسمُ كل موظفٍ مهضومٌ مرةً (q) للبحث */
  tkPickModel(t) {
    const e = this.state,
      n = this.loadEmps(),
      r = this.bsOn("staff"),
      ST = r ? this._tkLS("bassam_staffing_v3") : null,
      DR = this._tkLS("bassam_dreport_v1"),
      TP = this._tkLS("bassam_perm_tpls_v1"),
      SO = this._tkLS("bassam_shift_options_v1"),
      uv = (() => {
        try {
          return KIVO.BassamAuth && KIVO.BassamAuth.usersVer ? KIVO.BassamAuth.usersVer() : KIVO.BassamAuth && KIVO.BassamAuth.users ? (KIVO.BassamAuth.users() || []).length : 0;
        } catch (x) {
          return 0;
        }
      })(),
      key = e.year + "-" + e.month + "|" + t + "|" + (r ? 1 : 0),
      C = this._tkPickC;
    if (C && C.key === key && C.n === n && C.ST === ST && C.DR === DR && C.TP === TP && C.SO === SO && C.uv === uv) return C.model;
    const AC = this._tkAcctMap(n),
      TM = this._tkM(),
      a = (t) => (KIVO.BassamEmp ? KIVO.BassamEmp.key(t) : t.eid || t.nid || t.name),
      dig = (v) => (KIVO.BassamFind && KIVO.BassamFind.dig ? KIVO.BassamFind.dig(String(v || "")) : String(v || ""));
    let s = {};
    r && ST && "object" == typeof ST && (s = (KIVO.BassamStaffSnap ? KIVO.BassamStaffSnap.all(ST) : ST)[e.year + "-" + e.month] || {});
    let o = "";
    try {
      const n = this.tkStamp(e.year, e.month, t, 12, 0, "م");
      n && (o = new Date(n).toLocaleDateString("ar-SA-u-nu-latn", { weekday: "long" }));
    } catch (t) {}
    const i = {};
    try {
      const n = DR && "object" === typeof DR ? DR[e.year + "-" + e.month + "-" + t] : null;
      n &&
        n.shifts &&
        Object.keys(n.shifts).forEach((t) => {
          ((n.shifts[t] || {}).roster || []).forEach((t) => {
            t && t.ekey && (i[String(t.ekey)] = t.st || "");
          });
        });
    } catch (t) {}
    const TI = this.tkTplInfo(),
      l = { ab: "غائب", pm: "مستأذن", lv: "إجازة" },
      h = {},
      c = [],
      d = (t, e) => {
        h[t] || ((h[t] = { name: t, color: e, emps: [] }), c.push(t));
      };
    r ? this.tkShiftOpts().forEach((t) => d(t.name, t.color)) : d("موظفو الإدارة", "#b99751");
    const m = { name: "بلا وردية هذا الشهر", color: "#e2e8f0", emps: [], none: !0 };
    n.forEach((t) => {
      const e = a(t),
        n = r ? (KIVO.BassamEmp ? KIVO.BassamEmp.entry(s, t) : s[e]) || {} : {},
        p = r ? n.shift || "" : "موظفو الإدارة",
        u = r && !!o && (n.rest || []).some((t) => t === o || "ال" + t === o || t === "ال" + o),
        ac = AC && null != e && "" !== e ? AC[String(e)] || "" : "",
        f = ac ? TM.ACCT_TXT[ac] : u ? "راحة" : l[i[e]] || "";
      p && d(p, "#64748b");
      const g = {
        id: e,
        name: t.name || "موظف",
        q: dig(t.name || "موظف"),
        off: f,
        acct: ac,
        shift: p,
        wt: String(t.work || "").trim(),
        tpl: (TI[e] || {}).tpl || "",
        ord: null == (TI[e] || {}).ord ? 99 : TI[e].ord,
      };
      (p ? h[p] : m).emps.push(g);
    });
    const col = this._tkColl(),
      srt = (t, e) => (t.ord !== e.ord ? t.ord - e.ord : col(t.name, e.name));
    (c.forEach((t) => h[t].emps.sort(srt)), m.emps.sort(srt));
    const p = c.map((t) => h[t]);
    m.emps.length && p.push(m);
    const model = { groups: p, wd: o, dayLbl: t + " " + this.MONTHS[e.month - 1] + (o ? " (" + o + ")" : ""), staffOn: r };
    return ((this._tkPickC = { key: key, n: n, ST: ST, DR: DR, TP: TP, SO: SO, uv: uv, model: model }), model);
  },
  tkAsgVals(t, e) {
    const n = this.state,
      a = "direct" === n.newAsg,
      r = n.newPick || {},
      s = Object.keys(r),
      o = n.editRef && n.editRef.grp,
      i = String(n.pickQ || "").trim(),
      WT = this.tkWorkTypes(),
      W = WT.indexOf(String(n.pickWt || "")) >= 0 ? String(n.pickWt) : "",
      wtOf = (t) => (W ? (t.wt === W ? t : t.wt ? null : Object.assign({}, t, { off: "بلا نوع عمل" })) : t),
      l = (t) => this._tkSeg(t),
      h = (t, e) =>
        this.setState((n) => {
          const a = { ...(n.newPick || {}) };
          return (e ? (a[t.id] = t.name) : delete a[t.id], { newPick: a });
        }),
      c = a && !o ? this.tkPickModel(t) : { groups: [], dayLbl: "" },
      d = [],
      /* KIVO_265 · البند 13: عرضٌ نافذي — أوّلُ pickLim (60) موظفاً عبر الوردِيات المفتوحة ثم «عرض المزيد»؛ والبحثُ على الاسم المهضوم مسبقاً (q) */
      qd = i ? (KIVO.BassamFind && KIVO.BassamFind.dig ? KIVO.BassamFind.dig(i) : i) : "";
    let budget = Math.max(1, +n.pickLim || 60),
      hidden = 0,
      shown = 0;
    const m = c.groups.map((t, e) => {
        const T = t.emps.length,
          E = t.emps.map(wtOf).filter(Boolean),
          n = E.filter((t) => !t.off),
          a = n.length > 0 && n.every((t) => void 0 !== r[t.id]),
          o = E.filter((t) => t.off).length,
          l = i ? E.filter((t) => -1 !== (t.q || "").indexOf(qd)) : E,
          c = (this.state.pickOpen || {})[t.name],
          m = !!c,
          vis = m || !!i ? l.slice(0, budget) : [];
        ((budget -= vis.length), (hidden += m || !!i ? l.length - vis.length : 0), (shown += vis.length));
        a
          ? d.push({
              label: t.name + " كاملة" + (W ? " · " + W : ""),
              sub: this.tkN(n.length),
              remove: () =>
                this.setState((t) => {
                  const e = { ...(t.newPick || {}) };
                  return (n.forEach((t) => delete e[t.id]), { newPick: e });
                }),
            })
          : t.emps.filter((t) => void 0 !== r[t.id]).forEach((t) => d.push({ label: t.name, sub: "", remove: () => h(t, !1) }));
        return {
          name: t.name,
          dotStyle: "width:10px;height:10px;border-radius:50%;flex-shrink:0;background:" + t.color,
          cnt: (W ? W + ": " + E.filter((t) => t.wt === W).length + " من " + T : this.tkN(T)) + (o ? " · " + o + " غير متاح" : ""),
          open: m || !!i,
          chev: m || i ? "▾" : "▸",
          toggle: () => this.setState((e) => ({ pickOpen: { ...(e.pickOpen || {}), [t.name]: !m } })),
          allOn: a,
          allHas: !t.none && n.length > 0,
          allLabel: a ? "✓ الوردية كاملة" : "الوردية كاملة",
          allStyle:
            "margin-inline-start:auto;font-size:10px;padding:4px 10px;border-radius:9999px;cursor:pointer;font-family:'Cairo',sans-serif;border:1px " +
            (a
              ? "solid #b99751;background:var(--bg-xb99751);color:var(--text-on-brand)"
              : "dashed rgba(185,151,81,0.6);background:var(--bg-xffffff);color:var(--fg-x8a6f35)"),
          allClick: (e) => {
            (e && e.stopPropagation && e.stopPropagation(),
              this.setState((t) => {
                const e = { ...(t.newPick || {}) };
                return (
                  n.forEach((t) => {
                    a ? delete e[t.id] : (e[t.id] = t.name);
                  }),
                  { newPick: e }
                );
              }));
          },
          hasEmps: vis.length > 0,
          moreN: m || !!i ? l.length - vis.length : 0,
          emps: vis.map((e) => {
            const n = void 0 !== r[e.id],
              a = !!e.off;
            return {
              name: e.name,
              initial: (e.name || "؟").charAt(0),
              avStyle:
                "width:24px;height:24px;border-radius:50%;color:var(--fg-xffffff);font-size:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:" +
                (a ? "var(--bg-xcbd5e1)" : t.color),
              isOff: a,
              offLbl: e.off,
              tpl: e.tpl || "",
              on: n,
              rowStyle:
                "display:flex;align-items:center;gap:10px;padding:7px 12px 7px 40px;font-size:11.5px;border-top:1px solid var(--bd-xf8fafc);cursor:" +
                (a ? "not-allowed;color:var(--fg-x94a3b8)" : "pointer;color:var(--fg-x141414)"),
              cbStyle:
                "width:15px;height:15px;border-radius:4px;margin-inline-start:auto;flex-shrink:0;border:1.5px solid " +
                (n ? "#b99751;background:var(--bg-xb99751)" : "#cbd5e1;background:var(--bg-xffffff)") +
                (a ? ";opacity:.35" : ""),
              click: () => {
                a
                  ? this.bsToast(
                      e.acct
                        ? this._tkAcctMsg(e.name, e.acct)
                        : "بلا نوع عمل" === e.off
                          ? "لم يُحدَّد نوع عمل هذا الموظف — أكمل بياناته أو اختر «الكل»"
                          : "الموظف " + e.off + " يوم المهمة — لا يُسند إليه شيء",
                      "warn",
                    )
                  : h(e, !n);
              },
            };
          }),
        };
      });
    return {
      asgOpts: [
        { label: "عامة — تنزل في الجدول ويقبلها من يتفرّغ", on: !a, style: l(!a), click: () => this.setState({ newAsg: "general" }) },
        { label: "موجّهة — لوردية أو موظفين محددين", on: a, style: l(a), click: () => this.setState({ newAsg: "direct" }) },
      ],
      asgOn: !o,
      asgDirect: a && !o,
      asgGrpEdit: !!o,
      asgGrpNote: o
        ? "هذه مهمة موجّهة إلى " + (n.editRef.grpLabel || "مجموعة") + " — التعديل هنا يسري على كل أفرادها، والإسناد نفسه لا يتغيّر."
        : "",
      pickWtOn: WT.length > 0,
      pickWtOpts: [""]
        .concat(WT)
        .map((t) => ({
          label: t || "الكل",
          style:
            "font-size:10px;padding:4px 10px;border-radius:9999px;cursor:pointer;font-family:'Cairo',sans-serif;border:1px " +
            (W === t
              ? "solid #b99751;background:var(--bg-xb99751);color:var(--text-on-brand)"
              : "dashed rgba(185,151,81,0.6);background:var(--bg-xffffff);color:var(--fg-x8a6f35)"),
          click: () => this.setState({ pickWt: t }),
        })),
      pickWtHint: W
        ? a
          ? "يُعرض " + W + " كل وردية فقط — واختياراتك السابقة تبقى"
          : "تنزل في الجدول ولا يقبلها إلا موظفو «" + W + "»"
        : a
          ? ""
          : "يقبلها أي موظف متفرّغ",
      asgGeneral: !a && !o,
      pickQ: n.pickQ || "",
      onPickQ: (t) => this.setState({ pickQ: t.target.value, pickLim: 60 }),   /* KIVO_265 · البند 13: البحثُ يرشّح النموذجَ المخزَّن ويعيد النافذة إلى أولها */
      pickDayLbl: "يوم المهمة: " + c.dayLbl,
      pickSelOn: d.length > 0,
      pickSel: d,
      pickGroups: m,
      pickEmpty: 0 === m.length,
      pickMoreOn: hidden > 0,
      pickMoreLbl: "عرض المزيد — " + this.tkN(hidden) + " بعد",
      pickMore: () => this.setState((s) => ({ pickLim: Math.max(60, +s.pickLim || 60) + 60 })),
      pickShownTxt: hidden > 0 ? "يُعرض " + shown + " من " + (shown + hidden) : "",
      pickCount: s.length,
      pickNote: a
        ? s.length
          ? n.editRef
            ? ""
            : "تُنشأ مهمة باسم كل موظف مختار (" +
              s.length +
              ")، ويصله تنبيه «أُسندت إليك»؛ ومن هو في راحة أو غائب أو مستأذن أو بإجازة يوم المهمة لا يُختار ولا يصله شيء."
          : "اختر وردية كاملة أو موظفين بعينهم — أو أكثر من وردية."
        : "",
    };
  },
  /* ═══ صفوف الجدول: المهمة الموجّهة لمجموعة تُعرض صفاً واحداً ينفتح إلى أفراده؛ الكانبان يعرض الأفراد لأنه حسب حالة كل موظف ═══ */
  tkGroupRows(t) {
    const e = this.state.grpOpen || {},
      n = {},
      a = [],
      r = [];
    t.forEach((t) => {
      if (!t.grp) return (a.push(t), void r.push(t));
      r.push(t);
      const s = t.dayNum + "|" + t.grp;
      (n[s] || ((n[s] = { members: [], row: { ...t, isGroup: !0 } }), a.push(n[s].row)),
        n[s].members.push(t),
        e[s] && a.push(t),
        (t.isMember = !0),
        (t.trStyle += ";background:var(--bg-a185151810p035)"));
    });
    return (
      Object.keys(n).forEach((t) => {
        const a = n[t].row,
          sL = this.tkLockedAt(this.state.year, this.state.month, a.dayNum),   /* KIVO_265 · قفلُ يوم المجموعة (لا الشهر وحده) */
          r = n[t].members,
          o = r.filter((t) => t.hasAccepted).length,
          i = r.filter((t) => "done" === t.status).length,
          l = r.some((t) => "overdue" === t.status) ? "overdue" : i === r.length ? "done" : o ? "in_progress" : "pending",
          h = this.ST[l],
          c = !!e[t],
          d = a.dayNum,
          m = a.grp;
        ((a.status = l),
          (a.stLabel = h[0] + (i < r.length ? " " + (o + "/" + r.length) + " قُبلت" : "")),
          (a.stColor = h[1]),
          (a.stBg = h[2]),
          (a.stBorder = h[3]),
          (a.avNames = a.grpLabel || this.tkN(r.length)),
          (a.grpSum = this.tkN(r.length) + " · " + o + " قُبلت · " + i + " منجزة"),
          (a.grpTag = ""),
          /* KIVO_265 · الوردية: ورديةٌ واحدة لأفراد المجموعة ⇒ هي · أكثر ⇒ عددُها وأسماؤها في التلميح · ولا شيء ⇒ «بلا وردية» */
          (() => {
            const L = Array.from(new Set(r.map((q) => q.shName).filter(Boolean)));
            const M = r.find((q) => q.shName === L[0]) || {},
              nN = r.filter((q) => !q.shName).length;
            1 === L.length
              ? ((a.shName = L[0]), (a.shTxt = L[0]), (a.shDot = M.shDot || ""), (a.shTime = M.shTime || ""), (a.shOn = !0), (a.shNone = !1),
                (a.shTip = L[0] + (nN ? " · " + KIVO.BassamCount(String(nN), "فرد") + " بلا وردية" : " — كلُّ أفراد المجموعة")))
              : L.length
                ? ((a.shName = L.join(" · ")), (a.shTxt = KIVO.BassamCount(String(L.length), "وردية")), (a.shTime = ""), (a.shDot = "width:8px;height:8px;border-radius:50%;flex-shrink:0;background:var(--text-faint)"), (a.shOn = !0), (a.shNone = !1), (a.shTip = L.join(" · ")))
                : ((a.shName = ""), (a.shTxt = "بلا وردية"), (a.shOn = !1), (a.shNone = !0), (a.shTip = "لا وردية لأفراد المجموعة في الجدول الشهري"));
          })(),
          (a.hasEmp = !0),
          (a.noEmp = !1),
          (a.showAccept = a.showFinish = a.showReopen = a.showRunning = a.showDone = a.showPerf = a.hasAccepted = a.hasResp = a.selCan = a.selOn = a.apOn = !1),
          (a.grpOpen = c),
          (a.grpToggleLbl = c ? "إخفاء الأفراد ▴" : "عرض الأفراد (" + r.length + ") ▾"),
          (a.grpToggle = () => this.setState((e) => ({ grpOpen: { ...(e.grpOpen || {}), [t]: !(e.grpOpen || {})[t] } }))),
          (a.trStyle = "border-bottom:1px solid var(--bd-xf1f5f9);transition:background .15s;background:var(--bg-a185151810p06)"));
        /* KIVO_265 · مراجعة U4: النموذجُ يُملأ لأوّل فردٍ لم يُلغَ ولم يُعَد إسنادُه — فيُحوَّل الباقون إلى متكررة كالخادم (073 يتخطّى الملغى بـgrp) */
        const p = r.find((q) => !this._tkShut(q.tkcT)) || r[0];
        Object.assign(
          a,
          this._rowMenu("g" + t, [
            this.PC("edit")
              ? {
                  name: "تعديل المهمة لكل الأفراد",
                  color: "#b99751",
                  p1: "M12 20h9",
                  p2: "M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z",
                  run: () => {
                    sL ? this.bsToast(this._tkLockTxt(this.state.year, this.state.month, a.dayNum)) : p.edit();
                  },
                }
              : null,
            this.PC("del")
              ? {
                  name: "حذف المهمة عن كل الأفراد",
                  color: "#dc2626",
                  danger: !0,
                  p1: "M3 6h18",
                  p2: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
                  run: () => {
                    sL
                      ? this.bsToast(this._tkLockTxt(this.state.year, this.state.month, a.dayNum))
                      : this._tkOpen({ confirmDel: { d: d, i: -1, grp: m, n: r.length, title: a.title } });
                  },
                }
              : null,
          ]),
        );
      }),
      a.forEach((t, e) => {
        t.seq = e + 1;
      }),
      { rows: a, flat: r }
    );
  },
  /* KIVO_265 · قرارُ المالك 15:13 (البند 4): مَن لا حسابَ مستخدمٍ نشطاً له لا تُسند إليه مهمةٌ إلكترونية — يُعلَّم في المنتقي بسببه (546 acct · مرآةُ 070).
     الحكمُ في الخادم (409 acct)؛ بلا خادم (الوضعُ المحلي) أو بلا قائمة الحسابات لا تعليمَ هنا، ويبيّن الخادمُ السببَ عند الحفظ */
  _tkAcctMap(emps) {
    const M = this._tkM();
    if (!M || !M.acct || !this._tkSrv()) return null;
    let U = [];
    try {
      U = (KIVO.BassamAuth && KIVO.BassamAuth.users ? KIVO.BassamAuth.users() : []) || [];
    } catch (e) {
      U = [];
    }
    if (!U.length) return null;
    /* إعادةُ المراجعة (N-2 · N-8 أ): فهرسٌ واحدٌ للقائمة كلِّها (546 acctMap — كان الحكمُ لكل موظفٍ يمسح السجلَّ لكل حساب) · ومفتاحُ الخريطة الرمزُ الذي
       يُسند به (BassamEmp.key: المعرّفُ الثابت وإلا رقمُ الهوية) — كحكم الخادم بالعمود 14 (070 tkAcctTok) */
    const key = (e) => (KIVO.BassamEmp && KIVO.BassamEmp.key ? KIVO.BassamEmp.key(e) : e.eid || e.nid || e.name);
    return M.acctMap ? M.acctMap(U, emps || [], this._tkDept(), key) : null;
  },
  /* تنبيهُ من لا يُسند إليه (المنتقي · قائمةُ «قبول نيابةً»): السببُ وما يُصلحه — والمراجعةُ الموحّدة (R-3): الحسابُ برقم الهوية يُربط بمعرّفه الثابت */
  _tkAcctMsg(name, st) {
    const M = this._tkM() || {},
      T = M.ACCT_TXT || {},
      F = M.ACCT_FIX || {};
    return "لا تُسند مهمةٌ إلكترونية إلى «" + (name || "") + "»: " + (T[st] || T.none || "") + " — " + (F[st] || "أنشئ له حساباً مرتبطاً بسجلّه أو فعِّل حسابه أولاً");
  },
  /* نافذةُ «قبول المهمة وإسنادها» (قبولٌ نيابةً لمهمةٍ عامة): المداومون اليوم (ولنوع عملها إن حُدِّد).
     KIVO_265 · المراجعةُ الموحّدة (R-2): الإسنادُ هنا جديدٌ بالحفظ الخامّ — من لا حسابَ نشطاً له معلَّمٌ بسببه ولا يُختار (كمنتقي الإنشاء)، والخادمُ يرفضه (task-acct) */
  _tkDutyVals() {
    const e = this.state,
      W = (e.acceptRef && e.acceptRef.wt) || "",
      wm = {};
    W &&
      this.loadEmps().forEach((t) => {
        wm[KIVO.BassamEmp ? KIVO.BassamEmp.key(t) : t.eid || t.nid || t.name] = String(t.work || "").trim();
      });
    const t = this.onDutyToday().filter((t) => !W || wm[t.id] === W),
      AC = e.acceptRef ? this._tkAcctMap(this.loadEmps()) : null,
      TM = this._tkM() || {};
    return {
      dutyEmpty: 0 === t.length && this.bsOn("staff"),
      dutyHas: t.length > 0,
      dutyStaffOn: this.bsOn("staff"),
      dutyWt: W ? " — مهمة لنوع العمل «" + W + "» فقط" : "",
      dutyList: t.map((t) => {
        const ac = AC && null != t.id ? AC[String(t.id)] || "" : "";
        return {
          name: t.name,
          initial: (t.name || "؟").charAt(0),
          acct: ac,
          shiftLabel: ac ? (TM.ACCT_TXT || {})[ac] + " — لا تُسند إليه مهمةٌ إلكترونية" : t.shift ? "وردية: " + t.shift : t.bsPlain ? "" : "مداوم اليوم",
          click: () => (ac ? this.bsToast(this._tkAcctMsg(t.name, ac), "warn") : this._doAccept(t.name, t.id)),
        };
      }),
    };
  },
});
