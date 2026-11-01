class Component extends KIVO.BassamPageKit.base(DCLogic, ["admin+award+daily+dreport+employees+irshad+plan+profile+seized+staff+tasks","admin+profile+seized","admin+seized"]) {
  bsOn(t, e) {
    try {
      const s = KIVO.BassamPerm;
      return !s || !s.on || !!s.on(t, e);
    } catch (t) {
      return !0;
    }
  }
  bsKeyCap(t) {
    try {
      const e = KIVO.BassamPerm;
      return e && e.keyCap ? e.keyCap(t) : "";
    } catch (t) {
      return "";
    }
  }
  _hashTab(p, t) {
    try {
      const h = String(location.hash || "");
      if (!t || h.indexOf("#/" + p) !== 0) return;
      const w = "#/" + p + "/" + t;
      h !== w && history.replaceState && history.replaceState(null, "", location.pathname + location.search + w);
    } catch (e) {}
  }
  SH_PAL() {
    return ["#b99751", "#2f8f86", "#2f5f8a", "#1e9a66", "#b45309", "#9c3d6b", "#8b1a3a", "#2f8f86"];
  }
  sfRead() {
    return this.sfItems(KIVO.__BS_SRV.operations.get("bassam_shift_options_v1")).filter(t => t && t.name);
  }
  sfItems(value) {
    if (Array.isArray(value)) return value;
    return [
      { name: "الوردية الأولى", color: "#b99751" },
      { name: "الوردية الثانية", color: "#2f8f86" },
      { name: "الوردية الثالثة", color: "#2f5f8a" },
      { name: "الوردية الرابعة", color: "#1e9a66" },
    ];
  }
  sfOpen(patch) {
    if (!KIVO.__BS_SRV.operations.begin(this, "admin-shifts").ok) {
      this.bsToast("يوجد طلب حفظ لم يُحسم — أعد الإجراء نفسه للتحقق."); return false;
    }
    this._sfIntent = null;
    this.setState(Object.assign({ shPatch: null }, patch)); return true;
  }
  sfNewField(name, value) {
    const prior = this.state.shNew;
    if ((!prior || !Object.values(prior).some(Boolean)) && !this.sfOpen({ shNew: { name: "", tStart: "", tEnd: "" } })) return;
    this.setState({ shNew: Object.assign({}, this.state.shNew, { [name]: value }) });
  }
  async sfCommit(intent, edit) {
    const signature = JSON.stringify(intent);
    if (this._sfIntent && this._sfIntent !== signature) {
      this.bsToast("يوجد طلب حفظ لم يُحسم — أعد الإجراء نفسه للتحقق."); return false;
    }
    this._sfIntent = signature;
    const result = await KIVO.__BS_SRV.operations.commit(this, "admin-shifts", intent, edit);
    if (!result || result.ok !== 1) {
      this.bsToast(result && result.uncertain ? "لم يصل تأكيد الحفظ — المسودة باقية؛ أعد الإجراء نفسه للتحقق." : "لم يُحفظ التغيير — راجع البيانات والصلاحية ثم أعد فتح المحرر.");
      return false;
    }
    this._sfIntent = null;
    this.setState({ shTick: (this.state.shTick || 0) + 1 }); return true;
  }
  sfMin(t) {
    const e = /^(\d{1,2}):(\d{2})$/.exec(String(t || "").trim());
    return e ? 60 * +e[1] + +e[2] : -1;
  }
  sfDur(t, e) {
    const s = this.sfMin(t),
      a = this.sfMin(e);
    if (s < 0 || a < 0) return 0;
    let r = a - s;
    return (r <= 0 && (r += 1440), r);
  }
  sfPl(t, e, s, a, r) {
    return 1 === t ? e : 2 === t ? s : t <= 10 ? t + " " + a : t + " " + r;
  }
  sfDurTxt(t) {
    if (!t) return "—";
    const e = Math.floor(t / 60),
      s = t % 60,
      a = e ? this.sfPl(e, "ساعة", "ساعتان", "ساعات", "ساعة") : "",
      r = s ? this.sfPl(s, "دقيقة", "دقيقتان", "دقائق", "دقيقة") : "";
    return a + (a && r ? " و" : "") + r;
  }
  sfCross(t) {
    const e = this.sfMin(t.tStart),
      s = this.sfMin(t.tEnd);
    return e >= 0 && s >= 0 && s <= e;
  }
  sfOverlap(t, e) {
    const s = this.sfMin(t.tStart),
      a = this.sfMin(e.tStart),
      r = this.sfDur(t.tStart, t.tEnd),
      i = this.sfDur(e.tStart, e.tEnd);
    if (s < 0 || a < 0 || !r || !i) return 0;
    let n = 0;
    return (
      [-1440, 0, 1440].forEach((t) => {
        const e = a + t,
          o = Math.max(s, e),
          p = Math.min(s + r, e + i);
        p - o > n && (n = p - o);
      }),
      n > 0 ? n : 0
    );
  }
  SF_MONTHS() {
    return [
      "محرّم",
      "صفر",
      "ربيع الأول",
      "ربيع الآخر",
      "جمادى الأولى",
      "جمادى الآخرة",
      "رجب",
      "شعبان",
      "رمضان",
      "شوّال",
      "ذو القعدة",
      "ذو الحجة",
    ];
  }
  sfMonthLabel(t) {
    const e = String(t).split("-"),
      s = +e[1];
    return (this.SF_MONTHS()[s - 1] || "الشهر " + s) + " " + e[0];
  }
  sfLocks() {
    return KIVO.__BS_SRV.operations.get("bassam_staffing_locks_v1") || {};
  }
  sfUsage(t) {
    let e = 0,
      s = {},
      a = [];
    const r = this.sfLocks();
    if (this.bsOn("staff"))
      try {
        const i = KIVO.__BS_SRV.operations.get("bassam_staffing_v3") || {};
        Object.keys(i).forEach((n) => {
          const o = i[n];
          if (!o || "object" != typeof o) return;
          let p = 0;
          (Object.keys(o).forEach((a) => {
            "__shifts" !== a && o[a] && o[a].shift === t && (e++, (s[n] = 1), p++);
          }),
            p && r[n] && a.push(n));
        });
      } catch (t) {}
    return { records: e, months: Object.keys(s).length, locked: a };
  }
  sfRenameEverywhere(draft, t, e, deleting) {
    if (!this.bsOn("staff")) return !1;
      const locks = draft.get("bassam_staffing_locks_v1") || {},
        a = draft.get("bassam_staffing_v3") || {};
      let r = !1;
      return (
        Object.keys(a).forEach((i) => {
          const n = a[i];
          n &&
            "object" == typeof n &&
            Object.keys(n).forEach((s) => {
              if ("__shifts" === s || !n[s] || n[s].shift !== t) return;
              if (locks[i]) {
                if (deleting) throw Error("locked-month");
                return;
              }
              n[s] = Object.assign({}, n[s], { shift: e }); r = true;
            });
        }),
        r && draft.set("bassam_staffing_v3", a),
        r
      );
  }
  async sfRename(t, e) {
    if (!this.PC("edit")) { this.bsToast("صلاحيتك على الإعدادات عرضٌ فقط", "warn"); return false; }
    const s = String(e || "").trim();
    if (!s || s === t) { this.setState({ shRen: null }); return false; }
    if (!await this.sfCommit({ op: "rename", from: t, to: s }, draft => {
      const a = this.sfItems(draft.get("bassam_shift_options_v1"));
      if (!a.some(e => e && e.name === t) || a.some(e => e && e.name === s)) throw Error("shift-name");
      this.sfRenameEverywhere(draft, t, s, false);
      draft.set("bassam_shift_options_v1", a.map(e => e && e.name === t ? Object.assign({}, e, { name: s }) : e));
    })) return false;
    this.setState({ shRen: null });
    this.bsAck("صارت وردية «" + t + "» باسم «" + s + "»" + (this.bsOn("staff") ? " — وأُعيدت تسميتها في كل شهرٍ مفتوح" : ""), "ok"); return true;
  }
  async sfAdd() {
    if (!this.PC("add")) return void this.bsToast("صلاحيتك على الإعدادات لا تسمح بالإضافة", "warn");
    const t = this.state.shNew || {},
      e = String(t.name || "").trim();
    if (!e) return void this.bsToast("اكتب اسم الوردية أولاً", "warn");
    if ((t.tStart && this.sfMin(t.tStart) < 0) || (t.tEnd && this.sfMin(t.tEnd) < 0)) return void this.bsToast("صيغة الوقت ٠٨:٠٠", "warn");
    if (!await this.sfCommit({ op: "add", form: t }, draft => {
      const s = this.sfItems(draft.get("bassam_shift_options_v1"));
      if (s.some(t => t && t.name === e)) throw Error("shift-name");
      const a = s.filter(Boolean).map(t => t.color), r = this.SH_PAL(), i = r.find(t => !a.includes(t)) || r[s.length % r.length];
      draft.set("bassam_shift_options_v1", s.concat([{ name: e, color: i, tStart: t.tStart || "", tEnd: t.tEnd || "" }]));
    })) return false;
    this.setState({ shNew: { name: "", tStart: "", tEnd: "" } });
    this.bsAck("أُضيفت وردية «" + e + "» — تظهر الآن في قائمة الجدول الشهري", "ok"); return true;
  }
  async sfSet(t, e, original) {
    if (!this.PC("edit")) { this.bsToast("صلاحيتك على الإعدادات عرضٌ فقط", "warn"); return false; }
    if (this._sfIntent && this._sfIntent !== JSON.stringify({ op: "set", name: t, value: e })) {
      this.bsToast("يوجد طلب حفظ لم يُحسم — أعد الإجراء نفسه للتحقق."); return false;
    }
    this.setState({ shPatch: { name: t, value: e } });
    if (!await this.sfCommit({ op: "set", name: t, value: e }, draft => {
      const a = this.sfItems(draft.get("bassam_shift_options_v1")), found = a.find(s => s && s.name === t);
      if (!found || (original && JSON.stringify(found) !== JSON.stringify(original))) throw Error("shift-changed");
      draft.set("bassam_shift_options_v1", a.map(s => s && s.name === t ? Object.assign({}, s, e) : s));
    })) return false;
    this.setState({ shPatch: null }); return true;
  }
  sfAskDel(t) {
    if (!this.PC("del")) return void this.bsToast("صلاحيتك على الإعدادات لا تسمح بالحذف", "warn");
    const e = this.sfUsage(t);
    e.locked.length
      ? this.bsToast(
          "لا يمكن حذف وردية «" +
            t +
            "» — مستخدمة في جداول معتمدة ومقفلة: " +
            e.locked.map((t) => this.sfMonthLabel(t)).join("، ") +
            ". افتح تلك الجداول للتعديل أولاً إن كنت مصرّاً.",
          "warn",
        )
      : this.sfOpen({ shDel: { name: t, records: e.records, months: e.months } });
  }
  async sfDelDo() {
    const t = this.state.shDel;
    if (!t || !this.PC("del")) return false;
    if (!await this.sfCommit({ op: "delete", name: t.name }, draft => {
      this.sfRenameEverywhere(draft, t.name, "", true);
      draft.set("bassam_shift_options_v1", this.sfItems(draft.get("bassam_shift_options_v1")).filter(e => !e || e.name !== t.name));
    })) return false;
    this.setState({ shDel: null });
    this.bsAck(
          "حُذفت وردية «" + t.name + "»" + (t.records ? " وفُرّغت خانتها عن " + KIVO.BassamCount(t.records, "تسكين", "g") + "" : ""),
          "ok",
        ); return true;
  }
  sfVals() {
    const t = this.state,
      e = this.sfRead(),
      s = this.PC("edit"),
      a = this.state.shNew || { name: "", tStart: "", tEnd: "" },
      r = [];
    return (
      e.forEach((t, s) => {
        if (t.tStart && t.tEnd) {
          this.sfCross(t) &&
            r.push({
              t: "وردية «" + t.name + "» تعبر منتصف الليل (" + t.tStart + " ← " + t.tEnd + ") — محسوبة على اليوم التالي",
              c: "#0e7490",
            });
          for (let a = s + 1; a < e.length; a++) {
            const s = this.sfOverlap(t, e[a]);
            s > 0 && r.push({ t: "تداخل " + this.sfDurTxt(s) + " بين «" + t.name + "» و«" + e[a].name + "»", c: "#B45309" });
          }
        } else r.push({ t: "وردية «" + t.name + "» بلا وقت — لن يُحسب لها خطّ سير ولا مهلة سحب تقرير", c: "#B45309" });
      }),
      {
        sfRows: e.map((e) => {
          const original = e;
          if (t.shPatch && t.shPatch.name === e.name) e = Object.assign({}, e, t.shPatch.value);
          const a = this.sfUsage(e.name),
            r = this.sfDur(e.tStart, e.tEnd);
          return {
            name: e.name,
            dur: this.sfDurTxt(r),
            cross: this.sfCross(e),
            noTime: !(e.tStart && e.tEnd),
            tStart: e.tStart || "",
            tEnd: e.tEnd || "",
            renOn: !(!t.shRen || t.shRen.of !== e.name),
            renOff: !(t.shRen && t.shRen.of === e.name),
            renVal: t.shRen && t.shRen.of === e.name ? t.shRen.v : e.name,
            nameTip: s ? "اضغط لإعادة التسمية" + (this.bsOn("staff") ? " — تُطبَّق على كل شهرٍ مفتوح" : "") : e.name,
            nameStyle: "font-size:12.5px;font-weight:800;color:var(--fg-x141414);min-width:120px" + (s ? ";cursor:pointer" : ""),
            renOpen: () => {
              s && this.sfOpen({ shRen: { of: e.name, v: e.name } });
            },
            onRen: (t) => this.setState({ shRen: { of: e.name, v: t.target.value } }),
            renKey: (t) => {
              ("Enter" === t.key && this.sfRename(e.name, (this.state.shRen || {}).v),
                "Escape" === t.key && this.setState({ shRen: null }));
            },
            renSave: () => this.sfRename(e.name, (this.state.shRen || {}).v),
            lockTxt: a.locked.length ? "في " + KIVO.BassamCount(a.locked.length, "جدول|معتمد", "g") + "" : "",
            lockOn: a.locked.length > 0,
            dotStyle:
              "width:12px;height:12px;border-radius:50%;flex-shrink:0;background:" +
              (e.color || "var(--bg-xb99751)") +
              ";box-shadow:0 0 0 3px " +
              (e.color || "#b99751") +
              "22",
            useTxt: a.records
              ? KIVO.BassamCount(a.records, ["مسكَّن واحد", "مسكَّنان", "مسكَّنَين", "مسكَّنين", "مسكَّناً", "مسكَّن"]) +
                " في " +
                KIVO.BassamCount(a.months, "شهر", "g") +
                ""
              : this.bsOn("staff")
                ? "لا أحد مسكَّن عليها"
                : "الجدول الشهري غير مفعّل في هذه الإدارة",
            useStyle:
              "font-size:10.5px;font-weight:600;white-space:nowrap;color:" + (a.records ? "var(--fg-x0f7a4a)" : "var(--fg-x94a3b8)"),
            onStart: (t) => this.sfSet(e.name, { tStart: t.target.value }, original),
            onEnd: (t) => this.sfSet(e.name, { tEnd: t.target.value }, original),
            onColor: (t) => this.sfSet(e.name, { color: t.target.value }, original),
            color: e.color || "#b99751",
            del: () => this.sfAskDel(e.name),
          };
        }),
        sfEmpty: !e.length,
        sfWrite: s,
        sfReadOnly: !s,
        sfWarnOn: r.length > 0,
        sfWarns: r.map((t) => ({ t: t.t, style: "font-size:11px;font-weight:600;line-height:1.9;color:" + t.c })),
        sfNewName: a.name,
        sfNewStart: a.tStart,
        sfNewEnd: a.tEnd,
        onSfName: (t) => this.sfNewField("name", t.target.value),
        onSfStart: (t) => this.sfNewField("tStart", t.target.value),
        onSfEnd: (t) => this.sfNewField("tEnd", t.target.value),
        sfAddDo: () => this.sfAdd(),
        sfDelOn: !!t.shDel,
        sfDelName: t.shDel ? t.shDel.name : "",
        sfDelNote: t.shDel
          ? t.shDel.records
            ? "مسكَّن عليها " +
              KIVO.BassamCount(t.shDel.records, "موظف") +
              " في " +
              KIVO.BassamCount(t.shDel.months, "شهر", "g") +
              " — حذفها يُفرّغ خانة الوردية عندهم ولا يمسّ راحاتهم ولا مواقعهم."
            : this.bsOn("staff")
              ? "لا أحد مسكَّن عليها — حذفها بلا أثر على الجداول."
              : "حذفها بلا أثر — الجدول الشهري غير مفعّل في هذه الإدارة."
          : "",
        sfDelCancel: () => this.setState({ shDel: null }),
        sfDelDo: () => this.sfDelDo(),
      }
    );
  }
  IMP_KINDS() {
    return [{ key: "emps", name: "الموظفون", icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8" }];
  }
  impMount() {
    const t = KIVO.BassamEmpImp;
    t &&
      !this._impMounted &&
      ((this._impMounted = !0),
      t.mount({
        ask: (t) => this.setState({ impConf: t, impStep: "pick" }),
        close: () => this.setState({ impConf: null, impStep: "pick" }),
        toast: (message, kind) => this.bsToast(message, kind || "warn"),
        change: () => this.setState({ impTick: (this.state.impTick || 0) + 1 }),
      }));
  }
  impVals() {
    const t = KIVO.BassamEmpImp || {
      curHij: () => ({ y: 0, m: 0 }),
      month: () => ({ y: 0, m: 0 }),
      pending: () => null,
      setMonth: () => {},
      commit: () => {},
      drop: () => {},
      pick: () => {},
    };
    this.impMount();
    const e = this.state,
      s = this.IMP_KINDS(),
      a = s.some((t) => t.key === e.impKind) ? e.impKind : s[0].key,
      r = (() => {
        try {
          const t = KIVO.__BS_SRV.operations.get("bassam_employees_v1");
          return Array.isArray(t) ? t.length : 0;
        } catch (t) {
          return 0;
        }
      })();
    return {
      impKinds: s.map((t) => {
        return {
          name: t.name,
          icon: t.icon,
          on: t.key === a,
          style:
            ((e = t.key === a),
            "height:36px;padding:0 15px;border-radius:10px;border:1px solid " +
              (e
                ? "rgba(185,151,81,0.5);background:var(--bg-a185151810p1);color:var(--fg-x8a6f35)"
                : "#E1E1E1;background:var(--bg-xffffff);color:var(--fg-x53565a)") +
              ";font-family:'Cairo',sans-serif;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:7px"),
          go: () => this.setState({ impKind: t.key }),
        };
        var e;
      }),
      impOnEmps: "emps" === a,
      impBusy: !!(t.status && t.status().busy),
      impError: t.status ? t.status().error : "",
      impNeedsReview: !!(t.status && t.status().needsReview),
      impReviewDisabled: !!(t.status && (t.status().busy || t.status().uncertain)),
      impCommitDisabled: !!(t.status && (t.status().busy || t.status().needsReview)),
      impReview: () => t.review && t.review(),
      impCanAdd: (() => {
        try {
          const t = KIVO.BassamPerm;
          return !!(t && t.can && t.can("emps", "add"));
        } catch (t) {
          return !1;
        }
      })(),
      impDenyMsg: "الاستيراد يتطلّب صلاحية الإضافة على «موظفي الإدارة»",
      impCount: String(r),
      impCountTxt: r ? KIVO.BassamCount(r, "موظف") + " في الإدارة الآن" : "لا موظفين في الإدارة بعد",
      impPickDo: () => {
        this.state.impConf || t.pick();
      },
      impColsDo: () => this.impCols(),
      ...(() => {
        const s = e.impConf;
        if (!s)
          return {
            impConfOpen: !1,
            impStepPick: !0,
            impStepReplace: !1,
            impCurCount: 0,
            impFileCount: 0,
            impDupCount: 0,
            impNewCount: 0,
            impHasCur: !0,
            impConfTitle: "",
            impConfSub: "",
            impSchedOn: !1,
            impSchedYear: "",
            impSchedMonth: "",
            impYearOpts: [],
            impMonthOpts: [],
            impSetY: () => {},
            impSetM: () => {},
            impSchedLock: "",
            impSchedLockStyle: "",
            impSchedCols: "",
            impUpdateDesc: "",
            impAddDesc: "",
            impReplaceDesc: "",
            impReplaceWarn: "",
            stopClick: (t) => {
              t && t.stopPropagation && t.stopPropagation();
            },
            impConfCancel: () => {},
            impDoUpdate: () => {},
            impDoAdd: () => {},
            impAskReplace: () => {},
            impDoReplace: () => {},
            impBackToPick: () => {},
          };
        const a = t.curHij(),
          r = t.month().y,
          i = t.month().m,
          n = t.pending() || {},
          o = n.sched || {},
          p = !!(o.shift || o.rest || o.cs || o.muk);
        let l = !1;
        try {
          l = !!(KIVO.__BS_SRV.operations.get("bassam_staffing_locks_v1") || {})[r + "-" + i];
        } catch (t) {}
        const d = [o.shift ? "الوردية" : "", o.rest ? "أيام الراحة" : "", o.cs ? "رمز النداء" : "", o.muk ? "التكليف" : ""].filter(Boolean);
        return {
          impConfOpen: !0,
          impHasCur: s.cur > 0,
          impConfTitle: s.cur > 0 ? "يوجد موظفون مسجّلون بالفعل" : "تأكيد الاستيراد",
          impConfSub:
            s.cur > 0
              ? "اختر كيف تريد التعامل مع البيانات الحالية قبل إتمام الاستيراد."
              : "القائمة فارغة — سيُضاف من في الملف كما هو. راجع شهر الجدول الشهري أدناه أولاً.",
          impSchedOn: p,
          impSchedYear: String(r),
          impSchedMonth: String(i),
          impYearOpts: [a.y - 1, a.y, a.y + 1].map((t) => ({ v: String(t), lbl: t + " هـ" })),
          impMonthOpts: [
            "محرم",
            "صفر",
            "ربيع الأول",
            "ربيع الآخر",
            "جمادى الأولى",
            "جمادى الآخرة",
            "رجب",
            "شعبان",
            "رمضان",
            "شوال",
            "ذو القعدة",
            "ذو الحجة",
          ].map((t, e) => ({ v: String(e + 1), lbl: t + (a.m === e + 1 && a.y === r ? " (الجاري)" : "") })),
          impSetY: (e) => {
            (t.setMonth(parseInt(e.target.value, 10) || 0, t.month().m), this.setState({ impTick: (this.state.impTick || 0) + 1 }));
          },
          impSetM: (e) => {
            (t.setMonth(t.month().y, parseInt(e.target.value, 10) || 0), this.setState({ impTick: (this.state.impTick || 0) + 1 }));
          },
          impSchedLock: l ? "الشهر معتمد ومقفل — لن يُكتب فيه شيء" : r === a.y && i === a.m ? "الشهر الجاري" : "شهر غير الجاري",
          impSchedLockStyle:
            "font-size:10px;font-weight:700;border-radius:9999px;padding:4px 10px;white-space:nowrap;border:1px solid " +
            (l
              ? "rgba(220,38,38,0.35);background:var(--bg-a22038380p07);color:var(--fg-xb91c1c)"
              : "rgba(4,120,87,0.3);background:var(--bg-a4120870p07);color:var(--fg-x047857)"),
          impSchedCols:
            (this.bsOn("staff")
              ? "الأعمدة التي وجدها في ملفك وستذهب إلى هذا الشهر: " +
                (d.length ? d.join(" · ") : "لا شيء") +
                ". أما بقية الأعمدة فتذهب إلى سجل الموظف نفسه ولا يمسّها اختيار الشهر."
              : "أعمدة الجدول التي وجدها في ملفك (" +
                (d.length ? d.join(" · ") : "لا شيء") +
                ") لن تُكتب — الجدول الشهري غير مفعّل في هذه الإدارة. أما بقية الأعمدة فتذهب إلى سجل الموظف نفسه.") +
            ((n.derived || []).length ? " ولن تُستورد أعمدةٌ محسوبةٌ في المنصة: " + n.derived.map((t) => t.t).join(" · ") + "." : "") +
            ((n.unknown || []).length ? " وأعمدةٌ غير معروفة ستُتجاهل: " + n.unknown.join(" · ") + "." : ""),
          impStepPick: "replace" !== e.impStep,
          impStepReplace: "replace" === e.impStep,
          impCurCount: s.cur,
          impFileCount: s.file,
          impDupCount: s.dup,
          impNewCount: s.fresh,
          impUpdateDesc:
            "يُحدَّث " +
            KIVO.BassamCount(s.dup, "موظف|موجود") +
            " ببيانات الملف (المطابقة برقم الهوية، فإن غاب فبالرقم الوظيفي، فإن غاب فبالاسم مع الجوال)، ويُضاف " +
            KIVO.BassamCount(s.fresh, "موظف|جديد") +
            ". لا يُحذف أحد.",
          impAddDesc:
            "يُضاف " +
            KIVO.BassamCount(s.fresh, "موظف|جديد") +
            " فقط، ويُترك " +
            KIVO.BassamCount(s.dup, "موظف|موجود") +
            " " +
            KIVO.BassamCount.agr(s.dup, "كما هو", "كما هما", "كما هم") +
            " دون أي تعديل.",
          impReplaceDesc:
            "يُحذف " +
            KIVO.BassamCount(s.cur, "موظف") +
            " من القائمة الحالية ثم تُستورد بيانات الملف (" +
            KIVO.BassamCount(s.file, "موظف") +
            ") من جديد" +
            (this.bsOn("staff") ? "، ويُبنى الجدول الشهري " + KIVO.BassamCount.agr(s.file, "له", "لهما", "لهم") + " من الصفر." : "."),
          impReplaceWarn:
            "سيُحذف " +
            KIVO.BassamCount(s.cur, "موظف") +
            " من هذه الإدارة نهائياً وتحل " +
            KIVO.BassamCount.agr(s.cur, "محله", "محلهما", "محلهم") +
            " بيانات الملف (" +
            KIVO.BassamCount(s.file, "موظف") +
            ")، وتُنظّف المنصة من كل " +
            KIVO.BassamCount.agr(s.cur, "أثره", "أثرهما", "أثرهم") +
            ": " +
            [
              this.bsOn("staff") ? "الجدول الشهري بكل أشهره" : "",
              this.bsOn("dreport") ? "التقارير اليومية بكل أيامها ودفاتر استئذاناتها" : "",
              "تسكينات الخطة التشغيلية والجولات اليومية",
              "المهام المسندة",
              "حسابات الدخول والصلاحيات",
              this.bsOn("emps/custody") ? "حركات العهد" : "",
              this.bsOn("award") ? "ترشيحات التميز" : "",
            ]
              .filter(Boolean)
              .join("، و") +
            (this.bsOn("staff") ? " — ويُنشأ جدول الشهر من جديد مسودة مفتوحة غير معتمدة." : ".") +
            " لا يمكن التراجع.",
          stopClick: (t) => {
            t && t.stopPropagation && t.stopPropagation();
          },
          impConfCancel: () => {
            if (!t.pending()) return void this.setState({ impConf: null, impStep: "pick" });
            if (t.drop() !== false) { this.setState({ impConf: null, impStep: "pick" }); this.bsToast("أُلغي الاستيراد — لم يتغيّر شيء"); }
          },
          impDoUpdate: () => t.commit("update"),
          impDoAdd: () => t.commit("add"),
          impAskReplace: () => { if (!(t.status && (t.status().busy || t.status().uncertain))) this.setState({ impStep: "replace" }); },
          impBackToPick: () => { if (!(t.status && (t.status().busy || t.status().uncertain))) this.setState({ impStep: "pick" }); },
          impDoReplace: () => t.commit("replace"),
        };
      })(),
    };
  }
  impCols() {
    const t = KIVO.BassamEmpImp,
      e =
        t && t.colTitles
          ? t.colTitles()
          : [
              "اسم الموظف",
              "الجنس",
              "رقم الهوية",
              "الرقم الوظيفي",
              "رقم الجوال",
              "البريد الإلكتروني",
              "نوع التوظيف",
              "نوع العمل",
              "الوردية",
              "أيام الراحة",
              "رمز النداء",
              "التكليف",
            ],
      s = e.map(() => "");
    try {
      KIVO.BassamXLSX
        ? (KIVO.BassamXLSX.download([e, s.slice(), s.slice(), s.slice()], "أعمدة-استيراد-الموظفين.xlsx"),
          this.bsToast("نُزّل ملفُ الأعمدة — عبّئ صفوفه ثم ارفعه من هنا", "ok"))
        : this.bsToast("تعذّر إنشاء ملف Excel في هذا المتصفح", "warn");
    } catch (t) {
      this.bsToast("تعذّر إنشاء ملف Excel", "warn");
    }
  }
  tpRead() {
    try {
      const t = JSON.parse(localStorage.getItem("bassam_perm_tpls_v1"));
      if (Array.isArray(t)) {
        const e = KIVO.BassamPerm;
        return e && e.tplsMigrate ? e.tplsMigrate(t) : t;
      }
    } catch (t) {}
    return [];
  }
  tpWrite(t) {
    try {
      localStorage.setItem("bassam_perm_tpls_v1", JSON.stringify(t));
    } catch (t) {}
    this.setState({ tpTick: (this.state.tpTick || 0) + 1 });
  }
  tpHolders(t) {
    try {
      const e = KIVO.BassamPerm,
        s = KIVO.BassamDepts;
      if (!e || !e.tplHolders) return [];
      const a = s && s.active ? s.active() : "";
      return e.tplHolders(t, a);
    } catch (t) {
      return [];
    }
  }
  tpNewDo() {
    if (!this.PC("add")) return void this.bsToast("صلاحيتك على الإعدادات لا تسمح بالإضافة", "warn");
    const t = String(this.state.tpNew || "").trim();
    if (!t) return void this.bsToast("اكتب اسم القالب أولاً", "warn");
    const e = this.tpRead();
    if (e.some((e) => (e.name || "") === t)) return void this.bsToast("قالب بهذا الاسم موجود", "warn");
    const s = "t" + Date.now().toString(36);
    (this.tpWrite(e.concat([this.t24On() ? { id: s, name: t, perms: {}, keys24: [], lens: [] } : { id: s, name: t, perms: {} }])),
      this.setState(Object.assign({ tpNew: "", tpSel: s, tpDraft: {}, tpName: t }, this.t24On() ? { tpLens: [], tp24Draft: null, tp24Exp: {}, tp24Leaf: {} } : {})),
      this.bsToast("أُنشئ قالب «" + t + "» فارغاً — حدّد أوراقه ثم احفظ", "ok"));
  }
  tpExpand(t) {
    try {
      const e = KIVO.BassamPerm,
        s = KIVO.BassamDepts;
      if (e && e.expandPerms) return e.expandPerms(t || {}, s && s.active ? s.active() : "");
    } catch (t) {}
    return JSON.parse(JSON.stringify(t || {}));
  }
  tpLensOf(t) {
    const e = KIVO.BassamPerm;
    let s = [];
    try {
      s = (e && e.deptLenses && e.deptLenses()) || [];
    } catch (t) {}
    return t && Array.isArray(t.lens) ? t.lens.filter((t) => -1 !== s.indexOf(t)) : s.slice();
  }
  tpOpen(t) {
    const e = this.tpRead().filter((e) => e.id === t)[0];
    this.setState({ tpSel: t, tpDraft: e ? this.tpExpand(e.perms) : {}, tpName: (e && e.name) || "", tpLens: this.tpLensOf(e), tpExp: {}, tp24Draft: null, tp24Exp: {}, tp24Leaf: {} });
  }
  tpMove(t, e) {
    if (!this.PC("edit")) return void this.bsToast("صلاحيتك على الإعدادات عرضٌ فقط", "warn");
    const s = this.tpRead();
    if (null == t || null == e || t === e || t < 0 || e < 0 || t >= s.length || e >= s.length) return;
    const a = s.splice(t, 1)[0];
    (s.splice(e, 0, a), this.tpWrite(s));
  }
  tpSupOn(t) {
    try {
      return !(!KIVO.BassamSup || !KIVO.BassamSup.isSupTpl(t));
    } catch (t) {
      return !1;
    }
  }
  tpSupTog(t) {
    if (!this.PC("edit")) return void this.bsToast("صلاحيتك على الإعدادات عرضٌ فقط", "warn");
    const e = this.tpRead(),
      s = e.filter((e) => e.id === t)[0];
    if (!s) return;
    const a = !this.tpSupOn(s);
    (this.tpWrite(e.map((e) => (e.id === t ? Object.assign({}, e, { sup: a }) : e))),
      this.bsAck(
        a
          ? "وُسم «" + (s.name || "") + "» إشرافياً — حاملوه خارج التوزيع والتغطية"
          : "رُفع الوسم الإشرافي عن «" + (s.name || "") + "» — حاملوه يدخلون التوزيع",
        "ok",
      ));
  }
  tpSave() {
    if (!this.PC("edit")) return void this.bsToast("صلاحيتك على الإعدادات عرضٌ فقط", "warn");
    const t = this.state.tpSel;
    if (!t) return;
    const e = String(this.state.tpName || "").trim();
    if (!e) return void this.bsToast("اسم القالب لا يكون فارغاً", "warn");
    const s = this.tpRead();
    if (s.some((s) => s.id !== t && (s.name || "") === e)) return void this.bsToast("قالب آخر يحمل هذا الاسم", "warn");
    const r = Array.isArray(this.state.tpLens) ? this.state.tpLens.slice() : this.tpLensOf(s.filter((e) => e.id === t)[0]);
    /* caps-own (F07): a save under a narrowed ceiling keeps the template's out-of-ceiling items — its switched-off lenses, its latent leaves
       and (enforce) its latent keys — so widening the ceiling restores it exactly */
    const P0 = KIVO.BassamPerm,
      d0 = KIVO.BassamDepts && KIVO.BassamDepts.active ? KIVO.BassamDepts.active() : "",
      c0 = s.filter((e) => e.id === t)[0] || {},
      dl0 = (P0 && P0.deptLenses && P0.deptLenses(d0)) || [];
    (Array.isArray(c0.lens) ? c0.lens : []).forEach((k) => -1 === dl0.indexOf(k) && -1 === r.indexOf(k) && r.push(k));
    /* KIVO_256 · وضعُ الإنفاذ: القالبُ مفاتيحُ v24.9 (keys24) — وورقتُه القديمة (perms) أوسعُ تغطيةٍ لا تتجاوزها (النظامُ القديم بعد Kill Switch لا يمنح أكثر) */
    let k24 = null,
      a = this.state.tpDraft || {};
    if (this.t24On()) {
      const P = KIVO.BassamPerm,
        dd = KIVO.BassamDepts && KIVO.BassamDepts.active ? KIVO.BassamDepts.active() : "",
        C = P.p24.ceil(dd),
        cur = s.filter((e) => e.id === t)[0],
        dr = this.state.tp24Draft || this.tp24Base(cur, dd, C),
        tg = { role: "staff", mgr: !1 };
      k24 = Object.keys(dr)
        .filter((k) => dr[k] && P.p24.grantable(k, C, tg))
        .concat(((cur && cur.keys24) || []).filter((k) => !P.p24.keyOn(k, C)))
        .sort();
      const E = {};
      k24.forEach((k) => (E[k] = !0));
      a = P.p24.cover(E);
    }
    if (P0 && P0.latentLeaves) {
      const lt = P0.latentLeaves(c0.perms, d0);
      a = Object.assign({}, a);
      Object.keys(lt).forEach((k) => a[k] || (a[k] = lt[k]));
    }
    const i = this.tpHolders(t),
      tid = t;
    this.tpWrite(
      s.map((s) =>
        s.id === t ? Object.assign({}, s, { name: e, perms: JSON.parse(JSON.stringify(a)), lens: r }, k24 ? { keys24: k24 } : {}) : s,
      ),
    );
    k24 && this.setState({ tp24Draft: null });
    let n = 0;
    try {
      const t = KIVO.BassamPerm,
        e = KIVO.BassamDepts,
        s = e && e.active ? e.active() : "";
      i.forEach((e) => {
        const i = t.setEmpPerms(e, a, s);
        (i && i.ok && (n++, t.setEmpTpl && t.setEmpTpl(e, tid, s)), t.setEmpLens && t.setEmpLens(e, r, s));
      });
    } catch (t) {}
    this.bsAck("حُفظ القالب" + (i.length ? " وسرى على " + n + " من حامليه (" + i.length + ")" : " — لا حامل له بعد"), "ok");
  }
  tpAskDel() {
    if (!this.PC("del")) return void this.bsToast("صلاحيتك على الإعدادات لا تسمح بالحذف", "warn");
    const t = this.state.tpSel;
    if (!t) return;
    const e = this.tpRead().filter((e) => e.id === t)[0];
    e && this.setState({ tpDel: { id: t, name: e.name || "", n: this.tpHolders(t).length } });
  }
  tpDelDo() {
    const t = this.state.tpDel;
    if (t) {
      try {
        const e = KIVO.BassamPerm,
          s = KIVO.BassamDepts,
          a = s && s.active ? s.active() : "";
        e && e.dropEmpTpl && this.tpHolders(t.id).forEach((t) => e.dropEmpTpl(t, a));
      } catch (t) {}
      (this.tpWrite(this.tpRead().filter((e) => e.id !== t.id)),
        this.setState({ tpDel: null, tpSel: "", tpDraft: null, tpName: "" }),
        this.bsAck("حُذف قالب «" + t.name + "»" + (t.n ? " — بقيت صلاحيات " + t.n + " من حامليه كما هي" : ""), "ok"));
    }
  }
  /* KIVO_265 · TSK-5 — التكرارُ في شجرة الأفعال الستة (الوضعُ القديم legacy) بلا مفتاحٍ ولا بنيةٍ جديدة: «إضافة» على «المهام» تنشئ المهمةَ المتكررة
     (و«تعديل» لمكلَّفيها: task.assign ← tasks:edit) و«تعديل» تدير تكرارَها — يُلحق بتلميح مربّع ورقة «المهام» وحده (src/permissions لا تُمسّ) */
  tskRecLegacy(rows) {
    const N = (KIVO.BassamPerm && KIVO.BassamPerm.ACT_NAMES) || {},
      ad = N.add || "إضافة",
      ed = N.edit || "تعديل";
    (rows || []).forEach((r) => {
      r && r.isLeaf && "tasks" === r.key && (r.chkTip += " · التكرار: إنشاءُ مهمةٍ متكررة = «" + ad + "» (+ «" + ed + "» لمكلَّفيها) · تعديلُ التكرار وإيقافُه واستئنافُه وإنهاؤه = «" + ed + "»");
    });
    return rows;
  }
  tpVals() {
    const V24 = this.t24On(),
      t = this.state,
      e = this.tpRead(),
      s = this.PC("edit"),
      a = KIVO.BassamPerm,
      r = KIVO.BassamDepts,
      i = r && r.active ? r.active() : "",
      n = a && a.deptCap ? a.deptCap(i) : [],
      o = e.filter((e) => e.id === t.tpSel)[0] || null,
      p = t.tpDraft || {},
      l = o ? this.tpExpand(o.perms) : {},
      d = Array.isArray(t.tpLens) ? t.tpLens : this.tpLensOf(o),
      c = this.tpLensOf(o),
      g =
        !!o &&
        (JSON.stringify(p) !== JSON.stringify(l) ||
          String(t.tpName || "") !== String(o.name || "") ||
          JSON.stringify(d.slice().sort()) !== JSON.stringify(c.slice().sort())),
      h =
        o && a && a.treeModel
          ? a.treeModel({
              did: i,
              draft: p,
              expanded: t.tpExp || {},
              canEdit: s,
              hideOut: !0,
              cb: {
                expand: (e) => {
                  const s = Object.assign({}, t.tpExp || {});
                  ((s[e] = !s[e]), this.setState({ tpExp: s }));
                },
                togLeaf: (t, e) => this.setState({ tpDraft: a.togLeafIn(p, t, e) }),
                togAct: (t, e) => this.setState({ tpDraft: a.togActIn(p, t, e) }),
              },
            })
          : null;
    const RET = {
      tpRows: e.map((e, s) => {
        const a = Object.keys(this.tpExpand(e.perms)).length,
          r = this.tpHolders(e.id).length,
          i = this.tpSupOn(e);
        return {
          id: e.id,
          name: e.name || "—",
          on: e.id === t.tpSel,
          empty: 0 === a,
          idx: String(s + 1),
          metaTxt: (V24 && Array.isArray(e.keys24) ? (e.keys24.length ? KIVO.BassamCount(e.keys24.length, "صلاحية") + "" : "فارغ") : a ? KIVO.BassamCount(a, "ورقة") + "" : "فارغ") + " · " + (r ? KIVO.BassamCount(r, "حامل") + "" : "بلا حاملين"),
          rowStyle:
            "display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:1px solid var(--bd-xf1f3f5);background:" +
            (t.tpOver === s ? "var(--bg-a185151810p16)" : e.id === t.tpSel ? "var(--bg-a185151810p08)" : "var(--bg-xffffff)") +
            (t.tpDrag === s ? ";opacity:.45" : ""),
          style:
            "flex:1;min-width:0;text-align:right;padding:0;border:0;background:transparent;cursor:pointer;font-family:'Cairo',sans-serif",
          open: () => this.tpOpen(e.id),
          supOn: i,
          supOff: !i,
          supTip:
            "إشرافي — لا يُسكَّن على المواقع: من مُنح هذا القالب يخرج من عدسة التوزيع وحالة التغطية في الجولات اليومية ولا يُحسب في التغطية",
          supStyle:
            "flex-shrink:0;height:24px;padding:0 8px;border-radius:8px;font-family:'Cairo',sans-serif;font-size:9.5px;font-weight:700;cursor:pointer;white-space:nowrap;border:1px solid " +
            (i
              ? "rgba(185,151,81,0.5);background:var(--bg-a185151810p12);color:var(--fg-x8a6f35)"
              : "#E1E1E1;background:var(--bg-xffffff);color:var(--fg-x94a3b8)"),
          supTog: (t) => {
            (t && t.stopPropagation && t.stopPropagation(), this.tpSupTog(e.id));
          },
          up: (t) => {
            (t && t.stopPropagation && t.stopPropagation(), this.tpMove(s, s - 1));
          },
          down: (t) => {
            (t && t.stopPropagation && t.stopPropagation(), this.tpMove(s, s + 1));
          },
          dragStart: (t) => {
            try {
              ((t.dataTransfer.effectAllowed = "move"), t.dataTransfer.setData("text/plain", String(s)));
            } catch (t) {}
            this.setState({ tpDrag: s });
          },
          dragOver: (t) => {
            t.preventDefault();
            try {
              t.dataTransfer.dropEffect = "move";
            } catch (t) {}
            this.state.tpOver !== s && this.setState({ tpOver: s });
          },
          dragEnd: () => this.setState({ tpDrag: null, tpOver: null }),
          drop: (t) => {
            t.preventDefault();
            let e = this.state.tpDrag;
            try {
              const s = t.dataTransfer.getData("text/plain");
              "" !== s && (e = +s);
            } catch (t) {}
            (this.setState({ tpDrag: null, tpOver: null }), this.tpMove(e, s));
          },
        };
      }),
      tpEmpty: !e.length,
      tpNew: t.tpNew || "",
      onTpNew: (t) => this.setState({ tpNew: t.target.value }),
      tpNewDo: () => this.tpNewDo(),
      tpWrite: s,
      tpReadOnly: !s,
      tpSelOn: !!o,
      tpPick: !o,
      tpName: t.tpName || "",
      onTpName: (t) => this.setState({ tpName: t.target.value }),
      tpCapOn: n.length > 0,
      tpCapNote: n.length
        ? "الشجرة محصورة بسقف صفحات إدارتك — ما هو خارجه لا يُمنح ولا يُعرض."
        : "سقف صفحات إدارتك فارغ — راجع مدير النظام قبل بناء القوالب.",
      tpRows2: h ? this.tskRecLegacy(h.rows) : [],
      tpCountTxt: h ? h.pagesOn + " من " + KIVO.BassamCount(h.pagesTot, "ورقة", "g") + "" : "",
      tpExpAll: () => {
        const t = {};
        ((h && h.allExpanded) ||
          ((a && a.PAGE_REG) || []).forEach((e) => {
            t[e.key] = !0;
          }),
          this.setState({ tpExp: t }));
      },
      tpExpAllLbl: h && h.allExpanded ? "طيّ الكل" : "فرد الكل",
      tpClear: () => this.setState({ tpDraft: {} }),
      tpLensOnBox:
        !!o && ((a && a.LENS_REG) || []).filter((t) => -1 !== ((a.deptLenses && a.deptLenses(i)) || []).indexOf(t.key)).length > 0,
      tpLensCountTxt: (function () {
        try {
          const t = (a.deptLenses && a.deptLenses(i)) || [];
          return d.filter((e) => -1 !== t.indexOf(e)).length + "/" + t.length;
        } catch (t) {
          return "";
        }
      })(),
      tpLensRows:
        o && a && a.LENS_REG
          ? a.LENS_REG.filter((t) => {
              try {
                return -1 !== ((a.deptLenses && a.deptLenses(i)) || []).indexOf(t.key);
              } catch (t) {
                return !1;
              }
            }).map((t) => {
              const e = -1 !== d.indexOf(t.key);
              return {
                key: t.key,
                name: t.name,
                on: e,
                toggle: () => {
                  s
                    ? this.setState((e) => {
                        const s = Array.isArray(e.tpLens) ? e.tpLens.slice() : d.slice(),
                          a = s.indexOf(t.key);
                        return (-1 === a ? s.push(t.key) : s.splice(a, 1), { tpLens: s });
                      })
                    : this.bsToast("صلاحيتك على الإعدادات عرضٌ فقط", "warn");
                },
                style:
                  "display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:9999px;font-size:11px;font-weight:600;font-family:'Cairo',sans-serif;cursor:" +
                  (s ? "pointer" : "default") +
                  ";border:1px solid " +
                  (e
                    ? "rgba(14,116,144,0.45);background:var(--bg-a141161440p07);color:var(--fg-x0e7490)"
                    : "#e2e8f0;background:var(--bg-xffffff);color:var(--fg-x94a3b8)"),
                box:
                  "width:12px;height:12px;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;border:2px solid " +
                  (e
                    ? "#0e7490;background:var(--bg-x0e7490);color:var(--fg-xffffff)"
                    : "#CBD5E1;background:var(--bg-xffffff);color:transparent"),
              };
            })
          : [],
      tpDirty: g,
      tpDirtyTxt: g ? "تغييرات لم تُحفظ" : "",
      tpDirtyStyle: "margin-left:auto;font-size:11px;font-weight:700;color:" + (g ? "var(--fg-xb45309)" : "transparent"),
      tpSaveStyle:
        "height:36px;padding:0 18px;border-radius:10px;font-size:12px;font-weight:700;border:0;cursor:" +
        (g ? "pointer" : "default") +
        ";font-family:'Cairo',sans-serif;background:" +
        (g ? "var(--bg-xb99751)" : "var(--bg-xe5e7eb)") +
        ";color:" +
        (g ? "var(--fg-xffffff)" : "var(--fg-x9ca3af)"),
      tpSaveDo: () => this.tpSave(),
      tpDelDoAsk: () => this.tpAskDel(),
      tpSegClose:
        "height:32px;padding:0 13px;border-radius:10px;border:1px solid var(--bd-xe1e1e1);background:var(--bg-xffffff);color:var(--fg-x53565a);font-family:'Cairo',sans-serif;font-size:11.5px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:7px",
      tpDelOn: !!t.tpDel,
      tpDelName: t.tpDel ? t.tpDel.name : "",
      tpDelNote: t.tpDel
        ? t.tpDel.n
          ? "يحمله " +
            KIVO.BassamCount(t.tpDel.n, "موظف") +
            " — " +
            KIVO.BassamCount.agr(
              t.tpDel.n,
              "حذف القالب لا يسحب صلاحياته، تبقى كما هي وتُنسب له لا للقالب.",
              "حذف القالب لا يسحب صلاحياتهما، تبقى كما هي وتُنسب لهما لا للقالب.",
              "حذف القالب لا يسحب صلاحياتهم، تبقى كما هي وتُنسب لهم لا للقالب.",
            )
          : "لا يحمله أحد — حذفه بلا أثر."
        : "",
      tpDelCancel: () => this.setState({ tpDel: null }),
      tpDelGo: () => this.tpDelDo(),
      tpV24: !1,
      tpLegacy: !0,
    };
    /* ═══ KIVO_256 · وضعُ الإنفاذ: القالبُ مفاتيحُ v24.9 (keys24) على شجرة الوثيقة — والورقةُ القديمة تُشتقّ منها (تغطيةٌ لا تتجاوزها) ═══ */
    if (V24 && o && a && a.p24) {
      const C = a.p24.ceil(i),
        b24 = this.tp24Base(o, i, C),
        dr = t.tp24Draft || b24,
        tg = { role: "staff", mgr: !1 },
        md = this.t24Rows({
          mode: s ? "tpl" : "view",
          ceil: C,
          on: dr,
          lens: d,
          exp: t.tp24Exp || {},
          leafExp: t.tp24Leaf || {},
          canEdit: s,
          target: tg,
          hideOut: !0,
          platOff: this.t24PlatOff(),
          cb: {
            togKey: (k) => {
              const r = this.t24TogKey(dr, d, k);
              this.setState({ tp24Draft: r.on, tpLens: r.lens });
            },
            togLeaf: (l, v) => {
              const r = this.t24TogLeaf(dr, d, l, v, C, tg);
              this.setState({ tp24Draft: r.on, tpLens: r.lens });
            },
            expand: (id) => this.setState({ tp24Exp: { ...(this.state.tp24Exp || {}), [id]: !(this.state.tp24Exp || {})[id] } }),
            leafExpand: (id) => this.setState({ tp24Leaf: { ...(this.state.tp24Leaf || {}), [id]: !(this.state.tp24Leaf || {})[id] } }),
          },
        }),
        g24 =
          this.t24Sig(dr) !== this.t24Sig(b24) ||
          String(t.tpName || "") !== String(o.name || "") ||
          JSON.stringify(d.slice().sort()) !== JSON.stringify(c.slice().sort());
      Object.assign(RET, {
        tpV24: !0,
        tpLegacy: !1,
        tpRows24: md.rows,
        tpCount24: md.nOn + " من " + KIVO.BassamCount(md.nTot, "صلاحية", "g"),
        tpExpAll24Lbl: md.allExpanded ? "طيّ الكل" : "فرد الكل",
        tpExpAll24: () => this.setState({ tp24Exp: this.t24ExpAll(md) }),
        tpClear: () => this.setState({ tp24Draft: {}, tpLens: [] }),
        tpCapNote: n.length
          ? "شجرةُ v24.9 محصورةٌ بسقف إدارتك — القالبُ مفاتيحُ تُمنح لحامليه كما هي، وما خارج السقف لا يُعرض ولا يُمنح."
          : "سقف صفحات إدارتك فارغ — راجع مدير النظام قبل بناء القوالب.",
        tpLensOnBox: !1,
        tpDirty: g24,
        tpDirtyTxt: g24 ? "تغييرات لم تُحفظ" : "",
        tpDirtyStyle: "margin-left:auto;font-size:11px;font-weight:700;color:" + (g24 ? "var(--fg-xb45309)" : "transparent"),
        tpSaveStyle:
          "height:36px;padding:0 18px;border-radius:10px;font-size:12px;font-weight:700;border:0;cursor:" +
          (g24 ? "pointer" : "default") +
          ";font-family:'Cairo',sans-serif;background:" +
          (g24 ? "var(--bg-xb99751)" : "var(--bg-xe5e7eb)") +
          ";color:" +
          (g24 ? "var(--fg-xffffff)" : "var(--fg-x9ca3af)"),
      });
    }
    return RET;
  }
  state = {
    rowMenu: null,
    admTab: "",
    deptTab: "backup",
    shNew: { name: "", tStart: "", tEnd: "" },
    shDel: null,
    shRen: null,
    shTick: 0,
    tpSel: "",
    tpDraft: null,
    tpName: "",
    tpNew: "",
    tpDel: null,
    tpExp: {},
    tpTick: 0,
    tpDrag: null,
    tpOver: null,
    tpLens: null,
    impKind: "emps",
    impConf: null,
    impStep: "pick",
    impTick: 0,
    plTab: "id",
    plDraft: null,
    plPv: "",
    plRk: null,
    plRkKey: "",
    plRkAskOn: !1,
    plRkPw: "",
    plRkMsg: "",
    plBkForm: { un: "", name: "", pw: "" },
    plBkMsg: "",
    plRs: { step: 0, keepBrand: !0, un: "", name: "", pw: "", pw2: "", curPw: "", key: "", confirm: "" },
    plRsMsg: "",
    plBusy: !1,
    usQ: "",
    usF: "all",
    usMenu: null,
    usTmp: null,
    pmQ: "",
    adPmLog: null,
    adOv: null,
    adPres: null,
    adSec: null,
    adSecKind: "all",
    adSecPeriod: "today",
    adSecQ: "",
    adSecLim: 100,
    adPol: null,
    adPolMsg: "",
    adTick: 0,
    hi: null,
  };
  adOnSrv() {
    return !!(window.__BS_BOOT && window.__BS_BOOT.cf && KIVO.BassamAuth && KIVO.BassamAuth.isSuper && KIVO.BassamAuth.isSuper());
  }
  adFetch(t, e) {
    return fetch(t, e ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(e) } : {})
      .then((t) => (t.ok ? t.json() : null))
      .catch(() => null);
  }
  adLoad(t) {
    if (!this.adOnSrv()) return;
    const e = this.state.admTab;
    if ("overview" !== e && "sec" !== e && "users" !== e && "perms" !== e && !t) return;
    const s = Date.now();
    if (!t && this._adLast && s - this._adLast < 4e3) return;
    this._adLast = s;
    const a = [this.adFetch("/api/presence"), this.adFetch("/api/overview")];
    if ((("perms" === e || t) && a.push(this.adFetch("/api/sec?limit=30&kind=perm")), "sec" === e || t)) {
      const t = this.state,
        e = new Date();
      e.setHours(0, 0, 0, 0);
      const r = "today" === t.adSecPeriod ? e.getTime() : "7d" === t.adSecPeriod ? s - 6048e5 : s - 2592e6;
      a.push(
        this.adFetch(
          "/api/sec?limit=" + (t.adSecLim || 100) + "&since=" + r + (t.adSecKind && "all" !== t.adSecKind ? "&kind=" + t.adSecKind : ""),
        ),
      );
    }
    const r = "perms" === e || t;
    Promise.all(a).then((t) => {
      const e = t[0],
        s = t[1],
        a = r ? t[2] : null,
        i = r ? t[3] : t[2],
        n = { adTick: (this.state.adTick || 0) + 1, adErr: !(e && e.ok && s && s.ok) };
      (e && e.ok && (n.adPres = e),
        s && s.ok && ((n.adOv = s), this.state.adPol || (n.adPol = Object.assign({}, s.policy || {}))),
        a && a.ok && (n.adPmLog = a.rows || []),
        i && i.ok && (n.adSec = i.rows || []),
        this.setState(n));
    });
  }
  adTimerOn() {
    this._adT ||
      (this._adT = setInterval(() => {
        document.hidden || this.adLoad();
      }, 25e3));
  }
  adTimerOff() {
    this._adT && (clearInterval(this._adT), (this._adT = null));
  }
  adGo(t) {
    this.setState({ admTab: t }, () => {
      (this.adLoad(!0), this.adTimerOn(), "oplog" === t && this.audLoad(!0));
    });
  }
  adAct(t, e, s) {
    return this.adFetch(t, e).then(
      (t) => (
        t && t.ok
          ? (s && this.bsToast(s, "ok"), (this._adLast = 0), this.adLoad(!0))
          : this.bsToast((t && t.err) || "تعذّر التنفيذ", "warn"),
        t
      ),
    );
  }
  adRel(t, e) {
    if (!t) return "—";
    const s = Math.max(0, (e || Date.now()) - t),
      a = Math.floor(s / 6e4),
      r = Math.floor(s / 36e5),
      i = Math.floor(s / 864e5);
    return s < 45e3
      ? "الآن"
      : a < 60
        ? "قبل " + a + " د"
        : r < 24
          ? "قبل " + r + " س"
          : 1 === i
            ? "أمس"
            : "قبل " + KIVO.BassamCount(i, "يوم", "g") + "";
  }
  adClock(t) {
    try {
      const e = new Date(t);
      return ("0" + e.getHours()).slice(-2) + ":" + ("0" + e.getMinutes()).slice(-2);
    } catch (t) {
      return "";
    }
  }
  adWhen(t, e) {
    return t ? ((e || Date.now()) - t < 864e5 ? this.adClock(t) + " · " + this.adRel(t, e) : this.adRel(t, e)) : "—";
  }
  adFull(t) {
    try {
      const e = new Date(t);
      return (
        (KIVO.BassamHijri && KIVO.BassamHijri.fmt ? KIVO.BassamHijri.fmt(e) : e.toLocaleDateString("ar-SA-u-nu-latn")) +
        " · " +
        this.adClock(t)
      );
    } catch (e) {
      return String(t);
    }
  }
  adRole(t) {
    const T = t && "super" !== t.role ? String(t.title || "").trim() : "";
    if (T) return T;
    return (
      {
        super: "مدير النظام",
        dept: "مدير الإدارة",
        gm: KIVO.BassamAuth && KIVO.BassamAuth.gmRoleLabel ? KIVO.BassamAuth.gmRoleLabel(t && t.gid) : "مدير إدارة عامة",
        staff: t && t.mgr ? "مدير الإدارة" : "موظف",
      }[(t && t.role) || ""] || ""
    );
  }
  adDept(t) {
    try {
      const e = (KIVO.BassamDepts.list() || []).filter((e) => e.id === t)[0];
      return e ? e.name : "";
    } catch (t) {
      return "";
    }
  }
  _who(t) {
    try {
      const A = KIVO.BassamAuth,
        L = t && t.id && A ? (A.userById ? A.userById(t.id) : A.users ? A.users().filter((x) => x.id === t.id)[0] : null) : null;   /* KIVO_265 · أداء: فهرسٌ لا مسحٌ لكل صفّ */
      return L || t || {};
    } catch (e) {
      return t || {};
    }
  }
  adUnit(t) {
    if (!t || "super" === t.role) return "";
    if ("gm" === t.role) {
      try {
        const D = KIVO.BassamDepts;
        return (D && D.groupName ? D.groupName(t.gid) : "") || "";
      } catch (e) {
        return "";
      }
    }
    return this.adDept(t.deptId);
  }
  /* KIVO_265 · أداء (ملاحظةُ المالك 2026-10-19): قسما «الحسابات» و«نظرة عامة» كانا يُعادان كاملَين في كل رسم — ومع 13 ألف حساب (مسحٌ
     وفرزٌ وعدٌّ لثمانية مرشّحات وفكُّ قوائم موظفي الإدارات كلِّها) يكلّف كل ضغطة مفتاح في أي حقلٍ بالصفحة نصفَ ثانية. يُحسبان مرةً
     لكل (نسخة جدول الحسابات · نسخة العالم · الكتابة · الدقيقة · الإدارة النشطة · مدخلاتُ القسم من الحالة). */
  _adKey() {
    const t = this.state,
      A = KIVO.BassamAuth;
    this.__tag = this.__tag || new WeakMap();
    const tag = (o) => {
      if (!o || "object" !== typeof o) return String(o);
      this.__tag.has(o) || this.__tag.set(o, (this.__tagN = (this.__tagN || 0) + 1));
      return "o" + this.__tag.get(o);
    };
    let d = "";
    try {
      d = KIVO.BassamDepts.active();
    } catch (t) {}
    return [A && A.usersVer ? A.usersVer() : 0, KIVO.__dcWorld || 0, KIVO.__dcWrite || 0, Math.floor(Date.now() / 6e4), d, t.usF, t.usQ, t.pmQ, t.rowMenu, t.admTab, t.adErr, tag(t.usTmp), tag(t.rmItems), tag(t.adOv), tag(t.adPres)].join("|");
  }
  _adMemo(n, f) {
    const k = this._adKey(),
      m = (this.__mm = this.__mm || {})[n];
    if (m && m.k === k) return m.v;
    const v = f();
    return ((this.__mm[n] = { k, v }), v);
  }
  adUsersVals() {
    return this._adMemo("users", () => this._adUsersVals0());
  }
  adVals() {
    return this._adMemo("ov", () => this._adVals0());
  }
  adSub(t) {
    const u = this._who(t),
      r = this.adRole(u),
      d = this.adUnit(u);
    return [r, d && d !== r ? d : ""].filter(Boolean).join(" · ");
  }
  adKeyLbl(t) {
    const e = /^bsdept:([^:]+):(.+)$/.exec(String(t || "")),
      s = e ? e[2] : String(t || "");
    const KL = KIVO.BassamKeyLabels;
    if (KL && KL.all[s.replace(/:.*$/, "")]) return KL.label(s) + (e ? " · " + this.adDept(e[1]) : "");
    return (
      ({
        bassam_employees_v1: "قائمة الموظفين",
        bassam_staffing_v3: "الجدول الشهري",
        bassam_staffing_snap_v1: "بيان الشهر",
        bassam_rounds_v1: "الجولات اليومية",
        bassam_dreport_v1: "التقرير اليومي",
        bassam_plan_v1: "الخطة التشغيلية",
        bassam_tasks_v1: "المهام",
        bassam_auth_users_v1: "حسابات الدخول",
        bassam_perms_v1: "الصلاحيات",
        bassam_depts_v1: "الإدارات",
        bassam_irshad_v1: "نظام الاسترشاد",
        bassam_seized_v1: "نظام المضبوطات",
        bassam_seized_cat_v1: "قائمة ممنوعات المضبوطات",
        bassam_seized_acts_v1: "إجراءات المضبوطات",
        bassam_seized_locs_v1: "مواقع المضبوطات",
        bassam_seized_jew_v1: "أنواع قطع المجوهرات",
        bassam_award_v1: "جائزة التميز",
        bassam_custody_v1: "العهد",
      }[s] || s.replace(/^bassam_/, "").replace(/_v\d+$/, "")) + (e ? " · " + this.adDept(e[1]) : "")
    );
  }
  adSecTxt(t) {
    const e = (() => {
        try {
          return JSON.parse(t.target || "");
        } catch (t) {
          return null;
        }
      })(),
      s = e ? e.name || e.un || "" : t.target || "",
      a = {
        super: "الإعداد لمدير النظام وحده",
        dept: "السجل يخصّ إدارة أخرى",
        cap: "الصفحة خارج سقف إدارته",
        page: "صلاحيته على الصفحة عرضٌ فقط",
        view: "صلاحيته عرضٌ فقط",
        mgr: "إدارة الحسابات لمدير الإدارة",
        self: "لا يُعدَّل في الحساب سوى بياناته الشخصية",
        flag: "علم داخلي",
        dslock: "اليوم أو الشهر مقفل في الإحصائيات اليومية",
      };
    switch (t.act) {
      case "login_ok":
        return { t: "تسجيل دخول ناجح", k: "login" };
      case "recovery_key":
        return { t: "أنشأ مفتاح استعادة جديداً لحساب مدير النظام", k: "sec", w: "حدث أمني" };
      case "recover_fail":
        return {
          t: "محاولة استعادة فاشلة من شاشة الدخول" + ("no-key" === t.detail ? " — لا مفتاح مُنشأ" : " — مفتاح خاطئ"),
          k: "warn",
          w: "حدث أمني · محاولة استعادة",
        };
      case "recover_ok":
        return { t: "استُعيد دخول مدير النظام بمفتاح الاستعادة — كلمة جديدة والمفتاح أُبطل", k: "sec", w: "حدث أمني" };
      case "reset":
        return {
          t:
            "تهيئة المنصة لجهة جديدة — مُسحت كل البيانات" +
            (() => {
              try {
                const e = JSON.parse(t.detail || "{}");
                return (e.keepBrand ? " (أُبقيت الهوية)" : "") + " · مدير النظام الجديد: " + (e.newAdmin || "");
              } catch (t) {
                return "";
              }
            })(),
          k: "warn",
          w: "حدث أمني",
        };
      case "login_fail":
        return {
          t:
            "محاولة دخول فاشلة" +
            ("no-user" === t.detail ? " — الاسم لا يطابق أي حساب" : "frozen" === t.detail ? " — الحساب مجمّد" : " — كلمة مرور خاطئة"),
          k: "warn",
          w: "no-user" === t.detail ? "حدث أمني · اسم مستخدم غير معروف" : "",
        };
      case "lock":
        return {
          t: "قُفل الدخول مؤقتاً بعد " + KIVO.BassamCount(t.detail || "", "محاولة|فاشلة", "g") + "" + (t.un ? " باسم " + t.un : ""),
          k: "warn",
          w: "حدث أمني",
        };
      case "logout":
        return { t: "تسجيل خروج", k: "login" };
      case "sess_kill":
        return { t: "أنهى جلسات " + (e && "*" === e.id ? "الجميع" : s) + " من شاشة مدير النظام", k: "adm" };
      case "guard_unlock":
        return {
          t: "فكّ قفل الدخول" + (t.target && "*" !== t.target ? " عن " + String(t.target).replace(/^u:/, "") : " عن الجميع"),
          k: "adm",
        };
      case "pw_change":
        return { t: "self" === t.detail ? "غيّر كلمة مروره" : "أعاد تعيين كلمة مرور " + s, k: "sec" };
      case "acct_add":
        return { t: "فعّل حساب الدخول لـ " + s + (e && e.un ? " (اسم المستخدم " + e.un + ")" : ""), k: "adm" };
      case "acct_del":
        return { t: "حذف حساب الدخول لـ " + s, k: "adm", w: "حدث أمني" };
      case "acct_freeze":
        return { t: "جمّد حساب " + s, k: "adm" };
      case "acct_unfreeze":
        return { t: "أعاد تفعيل حساب " + s, k: "adm" };
      case "perm_change":
        return {
          t:
            "عدّل الصلاحيات" +
            (/caps/.test(t.detail || "") ? " — سقف الإدارات" : "") +
            (/emps=/.test(t.detail || "") ? " — صلاحيات موظفين" : "") +
            (/lenses/.test(t.detail || "") ? " — العدسات" : ""),
          k: "perm",
        };
      case "denied":
        return {
          t: "محاولة تعديل «" + this.adKeyLbl(t.target) + "» رُفضت — " + (a[t.detail] || "خارج الصلاحية"),
          k: "sec",
          w: "حدث أمني · كتابة خارج الصلاحية",
        };
      case "policy_change":
        return { t: "عدّل سياسات الأمن", k: "adm" };
      case "admin":
        return {
          t:
            "mgr_on" === t.detail
              ? "منح شارة «مدير الإدارة» لـ " + s
              : "mgr_off" === t.detail
                ? "سحب شارة «مدير الإدارة» من " + s
                : "إجراء إداري",
          k: "adm",
        };
      default:
        return { t: t.act, k: "adm" };
    }
  }
  adSecExport() {
    const t = this.state.adSec || [],
      e = (Date.now(), (t) => '"' + String(null == t ? "" : t).replace(/"/g, '""') + '"'),
      s = [["الوقت", "الحدث", "المستخدم", "الدور", "المدينة", "الجهاز", "IP"].map(e).join(",")];
    t.forEach((t) => {
      const a = this.adSecTxt(t);
      s.push(
        [
          new Date(t.ts).toISOString(),
          a.t,
          t.name || t.un || "",
          this.adRole(this._who({ id: t.uid, role: t.role, deptId: t.deptId })),
          t.city || "",
          "m" === t.dev ? "جوال" : "حاسوب",
          t.ip || "",
        ]
          .map(e)
          .join(","),
      );
    });
    try {
      const t = new Blob(["\ufeff" + s.join("\n")], { type: "text/csv;charset=utf-8" }),
        e = document.createElement("a");
      ((e.href = URL.createObjectURL(t)),
        (e.download = "سجل-الأمن-" + new Date().toISOString().slice(0, 10) + ".csv"),
        document.body.appendChild(e),
        e.click(),
        setTimeout(() => {
          (URL.revokeObjectURL(e.href), e.remove());
        }, 800));
    } catch (t) {
      this.bsToast("تعذّر التصدير", "warn");
    }
  }

  plP() {
    return KIVO.BassamPlat;
  }
  plSaved() {
    const t = this.plP();
    return t ? t.get() : {};
  }
  plDraft() {
    if (this.state.plDraft) return this.state.plDraft;
    const t = this.plP();
    return t ? t.merge(t.DEF, JSON.parse(JSON.stringify(this.plSaved()))) : {};
  }
  plGetPath(t, e) {
    return String(e)
      .split(".")
      .reduce((t, e) => (null == t ? void 0 : t[e]), t);
  }
  plSetPath(t, e) {
    const s = JSON.parse(JSON.stringify(this.plDraft())),
      a = String(t).split(".");
    let r = s;
    for (let t = 0; t < a.length - 1; t++) ((null != r[a[t]] && "object" == typeof r[a[t]]) || (r[a[t]] = {}), (r = r[a[t]]));
    ((r[a[a.length - 1]] = e), this.setState({ plDraft: s }, () => this.plPvPost()));
  }
  plDirtyN() {
    const t = this.nfDirtyIds().length;
    if (!this.state.plDraft) return t;
    const e = this.plSaved(),
      s = this.state.plDraft;
    let a = 0;
    const r = (t, e) => {
      const s = {};
      (Object.keys(t || {})
        .concat(Object.keys(e || {}))
        .forEach((t) => (s[t] = 1)),
        Object.keys(s).forEach((s) => {
          const i = t ? t[s] : void 0,
            n = e ? e[s] : void 0;
          i && n && "object" == typeof i && "object" == typeof n && !Array.isArray(i)
            ? r(i, n)
            : JSON.stringify(i) !== JSON.stringify(n) && a++;
        }));
    };
    return (r(e, s), a + t);
  }
  plDirtyTab(t) {
    if ("notif" === t) return this.nfDirtyIds().length > 0;
    if (!this.state.plDraft) return !1;
    const e = this.plSaved(),
      s = this.state.plDraft;
    return (
      {
        id: ["name", "org", "short", "logo", "themeDef"],
        login: ["login"],
        app: ["app"],
        side: ["side", "top"],
        print: ["print"],
        mods: ["mods"],
        setup: [],
        about: ["about"],
      }[t] || []
    ).some((t) => JSON.stringify(e[t]) !== JSON.stringify(s[t]));
  }
  async plSave() {
    const t = this.plP();
    if (!t) return;
    const e = await this.nfSave();
    if (e && e.n && !e.ok) return void this.bsToast(e.err || "تعذّر حفظ التنبيهات", "warn");
    if (!this.state.plDraft)
      return void (
        e &&
        e.n &&
        this.bsAck("حُفظت شجرة التنبيهات — تُطبَّق على الأحداث القادمة عند الجميع", "ok", { local: "حُفظت شجرة التنبيهات على هذا الجهاز" })
      );
    const s = this.plDraft(),
      a = t.set(s);
    a.ok
      ? (this.setState({ plDraft: null }, () => this.plPvPost()),
        this.bsAck(e && e.n ? "حُفظت إعدادات المنصة وشجرة التنبيهات ونُشرت للجميع" : "حُفظت إعدادات المنصة ونُشرت للجميع", "ok", {
          local: e && e.n ? "حُفظت إعدادات المنصة وشجرة التنبيهات على هذا الجهاز" : "حُفظت إعدادات المنصة على هذا الجهاز",
        }))
      : this.bsToast(a.err || "تعذّر الحفظ", "warn");
  }
  plLogoPick(t) {
    const e = t.target && t.target.files && t.target.files[0];
    if ((t.target && (t.target.value = ""), !e)) return;
    if (e.size > 4194304) return void this.bsToast("الملف أكبر من 4MB", "warn");
    const s = new FileReader();
    ((s.onload = () => {
      const t = new Image();
      ((t.onload = () => {
        try {
          const e = 512,
            s = document.createElement("canvas");
          ((s.width = e), (s.height = e));
          const a = s.getContext("2d"),
            r = Math.min(e / t.naturalWidth, e / t.naturalHeight),
            i = Math.round(t.naturalWidth * r),
            n = Math.round(t.naturalHeight * r);
          a.drawImage(t, (e - i) / 2, (e - n) / 2, i, n);
          let o = s.toDataURL("image/png");
          if (o.length > 26e4) {
            const t = document.createElement("canvas");
            ((t.width = 256), (t.height = 256), t.getContext("2d").drawImage(s, 0, 0, 256, 256), (o = t.toDataURL("image/png")));
          }
          if (o.length > 26e4) return void this.bsToast("الشعار معقّد جداً — استخدم صورة أبسط أو SVG", "warn");
          this.plSetPath("logo", o);
        } catch (t) {
          this.bsToast("تعذّر قراءة الصورة", "warn");
        }
      }),
        (t.onerror = () => this.bsToast("الملف ليس صورة صالحة", "warn")),
        (t.src = String(s.result)));
    }),
      s.readAsDataURL(e));
  }
  plPvSrc() {
    try {
      return location.pathname + (location.search ? location.search + "&" : "?") + "bsPreview=login";
    } catch (t) {
      return "?bsPreview=login";
    }
  }
  plPvPost() {
    try {
      const t = this.plDraft();
      document.querySelectorAll("main iframe[data-pv]").forEach((e) => {
        try {
          e.contentWindow.postMessage({ bsPlatPreview: t }, location.origin);
        } catch (t) {}
      });
    } catch (t) {}
  }
  plRkLoad() {
    this.adOnSrv() &&
      this.adFetch("/api/recovery").then((t) => {
        t && t.ok && this.setState({ plRk: t });
      });
  }
  plRkNew() {
    const t = this.state.plRkPw;
    t
      ? (this.setState({ plBusy: !0, plRkMsg: "" }),
        this.adFetch("/api/recovery/new", { pw: t }).then((t) => {
          (this.setState({ plBusy: !1 }),
            t && t.ok
              ? (this.setState({ plRkKey: t.key, plRkAskOn: !0, plRkPw: "" }), this.plRkLoad())
              : this.setState({ plRkMsg: (t && t.err) || "تعذّر" }));
        }))
      : this.setState({ plRkMsg: "أدخل كلمة مرورك" });
  }
  plBkSave() {
    const t = KIVO.BassamAuth,
      e = this.state.plBkForm;
    t.upsertBackupSuper({ un: e.un, name: e.name, pw: e.pw }).then((t) => {
      t.ok
        ? (this.setState({ plBkForm: { un: "", name: "", pw: "" }, plBkMsg: "" }),
          this.bsAck("أُنشئ الحساب الاحتياطي — سيُطلب منه تغيير كلمته عند أول دخول", "ok"))
        : this.setState({ plBkMsg: t.err || "تعذّر" });
    });
  }
  plBkReset() {
    const t = KIVO.BassamAuth,
      e = t.backupSuper();
    e &&
      t.resetPwById(e.id).then((t) => {
        t.ok ? this.setState({ usTmp: { name: e.name || e.un, pw: t.pw } }) : this.bsToast(t.err || "تعذّر", "warn");
      });
  }
  plBkRemove() {
    const t = KIVO.BassamAuth;
    KIVO
      .bsConfirm({
        title: "حذف الحساب الاحتياطي",
        msg: "سيُحذف حساب مدير النظام الاحتياطي نهائياً ولن يعود صالحاً للدخول.",
        ok: "حذف الحساب",
        danger: !0,
      })
      .then((y) => {
        if (!y) return;
        const e = t.removeBackupSuper();
        e.ok ? (this.bsAck("حُذف الحساب الاحتياطي", "ok"), this.forceUpdate()) : this.bsToast(e.err, "warn");
      });
  }
  plRsNext() {
    const t = Object.assign({}, this.state.plRs),
      e = t.step,
      s = (t) => this.setState({ plRsMsg: t });
    if (0 === e) {
      try {
        if (window.BassamBackup && window.BassamBackup.exportAll) window.BassamBackup.exportAll();
        else if (window.BassamFullBackup && window.BassamFullBackup.export) window.BassamFullBackup.export();
        else {
          const t = [...document.querySelectorAll("button")].find((t) => /النسخة الشاملة|تصدير نسخة شاملة/.test(t.textContent));
          t && t.click();
        }
      } catch (t) {}
      ((t.step = 1), (t.taken = Date.now()));
    } else if (1 === e) t.step = 2;
    else if (2 === e) {
      if (!(KIVO.BassamAuth && KIVO.BassamAuth.unCheck ? KIVO.BassamAuth.unCheck(t.un).ok : /^[0-9]{10}$/.test(t.un)))
        return s("اسم المستخدم: رقم جوال أو هوية من 10 أرقام");
      if (t.pw !== t.pw2) return s("كلمتا المرور غير متطابقتين");
      const e = KIVO.BassamAuth.pwCheck(t.pw);
      if (!e.ok) return s(e.msg);
      t.step = 3;
    } else if (3 === e) t.step = 4;
    else if (4 === e)
      return t.curPw && t.key && "تهيئة" === t.confirm
        ? (this.setState({ plBusy: !0, plRsMsg: "" }),
          void this.adFetch("/api/reset", {
            pw: t.curPw,
            key: t.key,
            confirm: t.confirm,
            keepBrand: !!t.keepBrand,
            admin: { un: t.un, name: t.name, pw: t.pw },
          }).then((e) => {
            if ((this.setState({ plBusy: !1 }), e && e.ok)) {
              const go = () => {
                try {
                  KIVO.__BS_SRV && KIVO.__BS_SRV.bye && KIVO.__BS_SRV.bye();
                } catch (t) {}
                try {
                  localStorage.clear();
                } catch (t) {}
                location.reload();
              };
              KIVO
                .bsConfirm({
                  title: "تمت التهيئة",
                  msg: "المنصة الآن فارغة ومدير النظام الجديد هو «" + t.un + "». ستُعاد الآن إلى شاشة الدخول.",
                  ok: "إلى شاشة الدخول",
                  info: !0,
                })
                .then(go, go);
            } else s((e && e.err) || "تعذّر");
          }))
        : s("أكمل الحقول الثلاثة — وكلمة التأكيد هي «تهيئة»");
    this.setState({ plRs: t, plRsMsg: "" });
  }
  plVals(t, e, s) {
    const a = this.plP();
    if (!a) return { admOnPlat: !1 };
    const r = this.state,
      i = this.plDraft(),
      n = (this.plSaved(), this.adOnSrv()),
      o = this.plDirtyN(),
      p = [
        [
          "id",
          "هوية المنصة",
          "الاسم والشعار والمظهر",
          "M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
        ],
        ["login", "شاشة تسجيل الدخول", "النصوص والخيارات", "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"],
        [
          "app",
          "تطبيق الجوال",
          "التثبيت على الشاشة الرئيسية",
          "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM12 18h.01",
        ],
        ["side", "القوائم", "القائمة الجانبية والشريط العلوي", "M3 4h18v16H3zM15 4v16"],
        [
          "print",
          "الطباعة والتقارير",
          "الترويسة والتذييل",
          "M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z",
        ],
        ["mods", "الوحدات", "تفعيل أقسام المنصة", "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"],
        [
          "setup",
          "التهيئة والاستعادة",
          "الطوارئ والتسليم",
          "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
        ],
        [
          "notif",
          "التنبيهات والتعاميم",
          "شجرة الأحداث · التعميم · السجل",
          "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0",
        ],
        ["about", "حول المنصة", "الإصدار والرخصة والأدلة", "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01"],
      ],
      l = p.some((t) => t[0] === r.plTab) ? r.plTab : "id",
      d = p.filter((t) => t[0] === l)[0],
      c = (t) =>
        "width:36px;height:20px;border-radius:9999px;display:inline-block;flex-shrink:0;cursor:pointer;transition:background .2s;box-shadow:inset 0 0 0 1px rgba(0,0,0,.04);background:" +
        (t
          ? "radial-gradient(circle at 10px 10px,#fff 6.5px,transparent 7.5px) #059669"
          : "radial-gradient(circle at 26px 10px,#fff 6.5px,transparent 7.5px) #cfd3da"),
      g = (t) =>
        "padding:5px 12px;border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;" +
        (t ? "background:var(--bg-xffffff);color:var(--fg-x141414);box-shadow:var(--shadow-card)" : "color:var(--fg-x6b7280)"),
      h = a.NAVNAMES,
      m = a.NAVKEYS,
      f = (i.side.order || []).filter((t) => m.indexOf(t) >= 0);
    m.forEach((t) => {
      f.indexOf(t) < 0 && f.push(t);
    });
    const u = i.side.hidden || [],
      b = i.mods.off || [],
      w =
        (i.logo && i.logo,
        i.logo ? i.logo : (i.name || "م").charAt(0),
        {
          plTabs: p.map((t) => {
            return {
              t: t[1],
              p: t[3],
              on: t[0] === l,
              dirty: this.plDirtyTab(t[0]),
              style:
                ((a = t[0] === l),
                "position:relative;display:flex;flex-direction:column;align-items:center;gap:5px;padding:9px 12px;border-radius:12px;min-width:96px;cursor:pointer;font-family:'Cairo',sans-serif;border:2px solid " +
                  (a ? "rgba(185,151,81,.4);background:var(--bg-a185151810p06)" : "transparent;background:transparent")),
              icon: e(t[0] === l),
              lbl: s(t[0] === l),
              go: () =>
                this.setState({ plTab: t[0], plPv: "" }, () => {
                  ("setup" === t[0] && this.plRkLoad(), "notif" === t[0] && this.nfLoadManagement(), this.plPvPost());
                }),
            };
            var a;
          }),
          plTitle: d[1],
          plSub: d[2] + " — تُطبَّق على كل المستخدمين فور الحفظ",
          plClean: 0 === o,
          plDirtyOn: o > 0,
          plDirtyTxt: o + (1 === o ? " تغيير غير محفوظ" : 2 === o ? " تغييران غير محفوظين" : " تغييرات غير محفوظة"),
          plSave: () => this.plSave(),
          plDiscard: () => this.setState({ plDraft: null, nfDraft: null }, () => this.plPvPost()),
          plOnId: "id" === l,
          plOnLogin: "login" === l,
          plOnApp: "app" === l,
          plOnSide: "side" === l,
          plOnPrint: "print" === l,
          plOnMods: "mods" === l,
          plOnSetup: "setup" === l,
          plOnAbout: "about" === l,
          plMapRows:
            "about" === l
              ? (() => {
                  try {
                    const P = KIVO.BassamPerm;
                    return P && P.siteMap ? P.siteMap() : [];
                  } catch (t) {
                    return [];
                  }
                })()
              : [],
          plMapStat:
            "about" === l
              ? (() => {
                  try {
                    const r = KIVO.BassamPerm.siteMap();
                    const g = r.filter((t) => t.isGroup).length;
                    return (
                      KIVO.BassamCount(r.length - g, "عنصر") +
                      " في " +
                      KIVO.BassamCount(g, "مجموعة", "g") +
                      " — تُولَّد من سجل الصفحات وترتيب القائمة الفعّال"
                    );
                  } catch (t) {
                    return "";
                  }
                })()
              : "",
          plOnNotif: "notif" === l,
          plPvOn: "notif" !== l,
          plGrid:
            "display:grid;grid-template-columns:" +
            ("notif" === l ? "1fr" : "1fr 340px") +
            ";border:1px solid var(--bd-xeceef1);border-radius:18px;background:var(--bg-xffffff);overflow:hidden;box-shadow:var(--shadow-soft);align-items:stretch",
          ...("notif" === l ? this.nfVals() : {}),
          plOn: (t) => {
            const e = t.target,
              s = e.getAttribute("data-k");
            s && this.plSetPath(s, "checkbox" === e.type ? !!e.checked : e.value);
          },
          plTog: (t) => {
            const e = t.target.closest("[data-k]");
            if (!e) return;
            const s = e.getAttribute("data-k");
            this.plSetPath(s, !this.plGetPath(i, s));
          },
          plSeg: (t) => {
            const e = t.target.closest("[data-k]");
            e && this.plSetPath(e.getAttribute("data-k"), e.getAttribute("data-v"));
          },
          plLogoPick: (t) => this.plLogoPick(t),
          plLogoClear: () => this.plSetPath("logo", ""),
          plLogoOn: !!i.logo,
          plLogoOff: !i.logo,
          plInitial: (i.name || "م").charAt(0),
          plLogoHint: i.logo
            ? "شعار مرفوع · " + Math.round((0.75 * i.logo.length) / 1024) + " KB · يُولَّد بكل المقاسات تلقائياً"
            : "لا شعار بعد — الأيقونة الافتراضية مستخدمة",
          plVer: KIVO.__BS_VER || "",
          plSrvTxt: n ? "الخادم متصل" : "نسخة الجهاز",
          plSrv: n,
          plNoSrv: !n,
          plUrl: location.origin + location.pathname,
          plPvSrc: this.plPvSrc(),
          plPvScaleD: "0.2445",
          plCopyUrl: () => {
            try {
              (navigator.clipboard.writeText(location.origin + location.pathname), this.bsToast("نُسخ الرابط", "ok"));
            } catch (t) {}
          },
          plGuides: (i.about.guides || []).map((t, e) => ({
            t: t.t || "",
            u: t.u || "",
            kt: "about.guides." + e + ".t",
            ku: "about.guides." + e + ".u",
          })),
          plNav: f.map((t, e) => {
            const s = u.indexOf(t) >= 0,
              a = b.indexOf(t) >= 0;
            return {
              i: String(e),
              k: t,
              name: h[t] || t,
              note: a ? "مطفأة من الوحدات" : s ? "مخفية من القائمة" : "",
              tg: c(!s && !a),
              style:
                "display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--bd-xeceef1);border-radius:11px;background:var(--bg-xffffff);margin-bottom:6px;" +
                (s || a ? "opacity:.6" : ""),
            };
          }),
          plUp: (t) => {
            const e = +t.target.closest("[data-k]").getAttribute("data-k");
            if (e <= 0) return;
            const s = f.slice();
            (([s[e - 1], s[e]] = [s[e], s[e - 1]]), this.plSetPath("side.order", s));
          },
          plDown: (t) => {
            const e = +t.target.closest("[data-k]").getAttribute("data-k");
            if (e >= f.length - 1) return;
            const s = f.slice();
            (([s[e + 1], s[e]] = [s[e], s[e + 1]]), this.plSetPath("side.order", s));
          },
          plHideTog: (t) => {
            const e = t.target.closest("[data-k]").getAttribute("data-k"),
              s = u.slice(),
              a = s.indexOf(e);
            (a >= 0 ? s.splice(a, 1) : s.push(e), this.plSetPath("side.hidden", s));
          },
          plMods: [
            [
              "emps",
              "موظفو الإدارة",
              "بيانات الموظفين · المهام · العهد",
              "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
              !0,
            ],
            ["planning", "الخطة التشغيلية", "مؤشرات الجاهزية · الجدول الشهري · التشغيل الميداني", "M3 4h18v18H3zM16 2v4M8 2v4M3 10h18", !1],
            ["daily", "المتابعة اليومية", "المؤشرات · التقرير اليومي · الجولات", "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2", !1],
            [
              "irshad",
              "نظام الاسترشاد",
              "",
              "M12 21s-7-5.2-7-10.5A7 7 0 0 1 19 10.5C19 15.8 12 21 12 21zM12 13a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2z",
              !1,
            ],
            ["seized", "نظام المضبوطات", "محاضر الممنوعات والمحظورات · الصور · لوحة المؤشرات", "M21 8v13H3V8M1 3h22v5H1zM10 12h4", !1],
            ["award", "جائزة التميز", "", "M8 4h8v5.2a4 4 0 0 1-8 0V4zM10 15h4M12 15v4M9 20h6", !1],
          ].map((t) => {
            const e = b.indexOf(t[0]) >= 0,
              s = (() => {
                try {
                  const e = KIVO.BassamPerm;
                  return KIVO.BassamDepts.list().filter((s) =>
                    (e.deptCap(s.id) || []).some(
                      (e) =>
                        e === t[0] ||
                        ("planning" === t[0] && ("staff" === e || "plan" === e)) ||
                        ("daily" === t[0] && ("dreport" === e || "daily" === e)) ||
                        ("emps" === t[0] && ("tasks" === e || "custody" === e)),
                    ),
                  ).length;
                } catch (t) {
                  return 0;
                }
              })();
            return {
              k: t[0],
              name: t[1],
              sub: t[2],
              p: t[3],
              note: t[4]
                ? "أساسية — لا تُطفأ"
                : e
                  ? "مطفأة"
                  : s
                    ? KIVO.BassamCount(s, "إدارة") + " " + KIVO.BassamCount.agr(s, "تستخدمها", "تستخدمانها", "تستخدمها")
                    : "لا إدارة تستخدمها",
              tg: c(!e) + (t[4] ? ";opacity:.35;cursor:not-allowed" : ""),
              style:
                "display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--bd-xeceef1);border-radius:11px;background:var(--bg-xffffff);margin-bottom:6px;" +
                (e ? "opacity:.6" : ""),
            };
          }),
          plModTog: (t) => {
            const e = t.target.closest("[data-k]").getAttribute("data-k");
            if ("emps" === e) return;
            const s = b.slice(),
              a = s.indexOf(e);
            (a >= 0 ? s.splice(a, 1) : s.push(e), this.plSetPath("mods.off", s));
          },
          plFoot:
            {
              notif: "الشجرة تُقرأ من سجل الأحداث في الكود — أي حدث يُضاف للمنصة يظهر هنا تلقائياً · التعاميم العامة لمدير النظام وحده",
              id: "الشعار يُحفظ مع الإعدادات في الخادم — لا ملفات خارجية",
              login: "التغيير هنا لا يمسّ حسابات أحد",
              app: "يعمل كتطبيق ويب تقدّمي (PWA) — نفس المنصة ونفس الحساب، بلا نشر في المتاجر",
              side: "الترتيب والإخفاء على مستوى المنصة كلها · صلاحيات الإدارات تبقى الحكم الأخير",
              print: "اليوم كل صفحة تطبع بترويستها الخاصة — هذه تُضاف فوقها موحّدةً",
              mods: "إطفاء وحدة لا يحذف بياناتها",
              setup: "كل ما في هذه الصفحة يُسجَّل في سجل الأمن",
              about: "زر «المساعدة» أسفل القائمة يفتح هذه البطاقة لكل مستخدم",
            }[l] || "",
          plAboutPreview: () => {
            const t = this.plP(),
              e = t.get;
            try {
              ((t.get = () => t.merge(t.DEF, i)), t.openAbout());
            } finally {
              t.get = e;
            }
          },
          plResetTab: () => {
            if ("notif" === l)
              return void this.nfSetAll((t, e) => {
                const s = KIVO.BassamNotif.LEAVES.filter((t) => t.id === e)[0];
                s && ((t.on = s.on), (t.to = s.to.slice()), (t.lvl = s.lvl), (t.chan = s.chan), (t.txt = s.txt));
              });
            const t = a.defaults(),
              e = JSON.parse(JSON.stringify(i));
            ((
              ({
                id: ["name", "org", "logo", "themeDef"],
                login: ["login"],
                app: ["app"],
                side: ["side", "top"],
                print: ["print"],
                mods: ["mods"],
                setup: [],
                about: ["about"],
              })[l] || []
            ).forEach((s) => (e[s] = t[s])),
              this.setState({ plDraft: e }, () => this.plPvPost()));
          },
          plPvTabs: [
            ["login", "الدخول"],
            ["side", "القائمة"],
            ["phone", "الجوال"],
            ["print", "الطباعة"],
          ].map((t) => ({
            t: t[1],
            go: () => this.setState({ plPv: t[0] }, () => this.plPvPost()),
            style: g(
              (r.plPv ||
                { id: "login", login: "login", app: "phone", side: "side", print: "print", mods: "side", setup: "login", about: "login" }[
                  l
                ]) === t[0],
            ),
          })),
          plRightsNow:
            KIVO.BassamPlat && KIVO.BassamPlat.rightsText
              ? (function () {
                  try {
                    const t = KIVO.BassamPlat.get(),
                      e = i.login && "string" == typeof i.login.rights ? i.login.rights : t.login.rights,
                      s = new Date().getFullYear();
                    let a = "";
                    try {
                      a = (/\d{4}/.exec(new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { year: "numeric" }).format(new Date())) || [
                        "",
                      ])[0];
                    } catch (t) {}
                    return String(e || "")
                      .replace(/\{م\}/g, s)
                      .replace(/\{هـ\}/g, a + " هـ");
                  } catch (t) {
                    return "";
                  }
                })()
              : "",
          pvTitle: i.login.title || i.name,
          pvUser: "اسم المستخدم",
          pvLegalOn: !!i.login.legal,
          pvFooterOn: !!i.login.footer,
          pvNav: f
            .filter((t) => u.indexOf(t) < 0 && b.indexOf(t) < 0)
            .map((t, e) => ({
              name: h[t],
              style:
                "display:flex;align-items:center;gap:7px;padding:5px 6px;border-radius:7px;" +
                (0 === e ? "background:var(--bg-a185151810p1);color:var(--fg-xb99751);font-weight:700" : ""),
            })),
          pvAppName: i.app.name || i.name,
          pvBarStyle: "height:6px;background:" + (a.STATUS[i.app.statusBar] || a.STATUS.light),
          pvPrHead:
            "display:flex;align-items:center;gap:10px;border-bottom:2px solid var(--bd-x141414);padding-bottom:8px;" +
            ("center" === i.print.logoPos
              ? "flex-direction:column;text-align:center"
              : "left" === i.print.logoPos
                ? "flex-direction:row-reverse"
                : ""),
          pvPrLogo: "none" !== i.print.logoPos,
          pvPrL1: i.print.l1 || i.org || i.name,
          pvPrL3: String(i.print.l3 || "{الإدارة} · {الصفحة}")
            .replace("{الإدارة}", "إدارة الأبواب")
            .replace("{الصفحة}", "التقرير اليومي"),
          pvPrRight: [i.print.who ? "طُبع بواسطة مدير الإدارة" : "", i.print.date ? "١٤٤٨/٣/٢٣ 06:31" : ""].filter(Boolean).join(" · "),
          plBkForm: r.plBkForm,
          plBkMsg: r.plBkMsg,
          plBkMsgOn: !!r.plBkMsg,
          plFormOn: (t) => {
            const e = t.target,
              s = e.getAttribute("data-k"),
              [a, i] = s.split(".");
            "bk" === a
              ? this.setState({ plBkForm: Object.assign({}, r.plBkForm, { [i]: e.value }) })
              : "rs" === a && this.setState({ plRs: Object.assign({}, r.plRs, { [i]: e.value }) });
          },
          plRsKeepTog: () => this.setState({ plRs: Object.assign({}, r.plRs, { keepBrand: !r.plRs.keepBrand }) }),
          tg_rs_keepBrand: c(!!r.plRs.keepBrand),
          plBkSave: () => this.plBkSave(),
          plBkReset: () => this.plBkReset(),
          plBkRemove: () => this.plBkRemove(),
          plRs: r.plRs,
          plRsMsg: r.plRsMsg,
          plRsMsgOn: !!r.plRsMsg,
          plRsNext: () => this.plRsNext(),
          plRsBack: () => this.setState({ plRs: Object.assign({}, r.plRs, { step: Math.max(0, r.plRs.step - 1) }), plRsMsg: "" }),
          plRsBackOn: r.plRs.step > 0,
          plRsNextTxt:
            [
              "تنزيل نسخة كاملة والمتابعة",
              "متابعة إلى مدير النظام الجديد",
              "متابعة إلى التأكيد",
              "متابعة",
              r.plBusy ? "جارٍ التنفيذ…" : "تهيئة المنصة الآن — لا رجعة",
            ][r.plRs.step] || "متابعة",
          plSteps: [
            ["نسخة كاملة تُنزَّل على جهازك", "تشمل كل الإدارات والحسابات والصور — احتفظ بها قبل أي شيء"],
            ["ماذا يبقى؟", "كل الإدارات والموظفين والحسابات والسجلات تُمسح — تختار إن كانت الهوية تبقى"],
            ["مدير النظام الجديد", "اسم المستخدم وكلمة مؤقتة تُفرض عليه تغييرها عند أول دخول"],
            [
              "ما بعد التهيئة",
              "تُنهى كل الجلسات (بما فيها جلستك)، ويبدأ سجل الأمن صفحة جديدة بسطر واحد يوثّق التهيئة، ويُبطل مفتاح الاستعادة",
            ],
            ["التأكيد المزدوج", "كلمة مرورك + مفتاح الاستعادة + كتابة «تهيئة»"],
          ].map((t, e) => ({
            n: e < r.plRs.step ? "✓" : String(e + 1),
            t: t[0],
            d: t[1],
            isKeep: 1 === e && 1 === r.plRs.step,
            isAdmin: 2 === e && 2 === r.plRs.step,
            isConfirm: 4 === e && 4 === r.plRs.step,
            dot:
              "width:22px;height:22px;border-radius:9999px;font-size:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:700;" +
              (e < r.plRs.step
                ? "background:var(--bg-x059669);color:var(--fg-xffffff)"
                : e === r.plRs.step
                  ? "background:var(--bg-x141414);color:var(--fg-xffffff)"
                  : "background:var(--bg-xe5e2da);color:var(--fg-x8b8f98)"),
          })),
          admGoBackup: () => this.setState({ admTab: "backup" }),
        });
    ([
      "login.help",
      "login.remember",
      "login.showVer",
      "app.install",
      "side.links",
      "side.help",
      "side.ver",
      "top.theme",
      "print.date",
      "print.who",
    ].forEach((t) => {
      w["tg_" + t.replace(".", "_")] = c(!!this.plGetPath(i, t));
    }),
      [
        ["themeDef", ["light", "dark", "auto"]],
        ["app.statusBar", ["light", "dark", "gold"]],
        ["top.crumb", ["full", "page", "none"]],
        ["print.logoPos", ["right", "center", "left", "none"]],
        ["print.paper", ["", "a4p", "a4l", "a3l"]],
      ].forEach((t) =>
        t[1].forEach((e) => {
          w["sg_" + t[0].replace(".", "_") + "_" + e] = g(String(this.plGetPath(i, t[0]) || "") === e);
        }),
      ));
    const y = (() => {
        try {
          return KIVO.BassamAuth.backupSuper();
        } catch (t) {
          return null;
        }
      })(),
      S = r.plRk;
    ((w.plBkOn = !!y),
      (w.plBkOff = !y),
      (w.plBkUn = y ? (y.name ? y.name + " · " + y.un : y.un) : ""),
      (w.plBkNote = y
        ? (S && S.backupLastLogin ? "آخر دخول به: " + this.adFull(S.backupLastLogin) : "لم يدخل قط") +
          " · كامل الصلاحية · دخوله يُسجَّل في سجل الأمن"
        : ""),
      (w.plRkDot = "width:8px;height:8px;border-radius:9999px;background:" + (S && S.key ? "var(--bg-x059669)" : "var(--bg-xd97706)")),
      (w.plRkTxt = n
        ? null == S
          ? "جارٍ التحميل…"
          : S.key
            ? "مُنشأ · " + this.adFull(S.key.ts)
            : S.used
              ? "استُخدم ثم أُبطل — أنشئ غيره"
              : "لم يُنشأ بعد"
        : "غير متاح في نسخة الجهاز"),
      (w.plRkNote =
        "٢٠ حرفاً يُعرض مرة واحدة ويُطبع ويُحفظ في مكان آمن. من شاشة الدخول ← «تعذّر الدخول؟» يفتح حساب مدير النظام" +
        (S && S.key && S.key.uid, " بكلمة جديدة ثم يُبطل. وهو شرط تهيئة المنصة.")),
      (w.plRkBtn = S && S.key ? "إنشاء مفتاح جديد (يُبطل الحالي)" : "إنشاء مفتاح الاستعادة"),
      (w.plRkAsk = () => this.setState({ plRkAskOn: !0, plRkPw: "", plRkMsg: "" })));
    let x = this._fullStamp();
    const k = x ? Math.floor((Date.now() - new Date(x).getTime()) / 864e5) : null;
    ((w.plBkupDot = "width:8px;height:8px;border-radius:9999px;background:" + (x && k < 2 ? "var(--bg-x059669)" : "var(--bg-xd97706)")),
      (w.plBkupTxt = x
        ? "يدوية · " + (0 === k ? "اليوم" : 1 === k ? "أمس" : "قبل " + KIVO.BassamCount(k, "يوم", "g") + "")
        : "لم تُؤخذ نسخة شاملة بعد"),
      (w.plRkAskOn = !!r.plRkAskOn),
      (w.plRkPw = r.plRkPw),
      (w.plRkMsg = r.plRkMsg),
      (w.plRkMsgOn = !!r.plRkMsg),
      (w.plRkOnPw = (t) => this.setState({ plRkPw: t.target.value })),
      (w.plRkGo = () => this.plRkNew()),
      (w.plRkClose = () => this.setState({ plRkAskOn: !1, plRkKey: "" })),
      (w.plRkKeep = (t) => t.stopPropagation()),
      (w.plRkKeyOn = !!r.plRkKey),
      (w.plRkKeyOff = !r.plRkKey),
      (w.plRkKey = r.plRkKey),
      (w.plD = i),
      (w.plRkCopy = () => {
        try {
          (navigator.clipboard.writeText(r.plRkKey), this.bsToast("نُسخ", "ok"));
        } catch (t) {}
      }),
      (w.plRkPrint = () => {
        try {
          const t = window.open("", "_blank");
          (t.document.write(
            '<html dir="rtl"><head><style>' +
              KIVO.BassamCssText.byId("bs-theme-tokens") +
              '</style></head><body style="font-family:Cairo,Arial;padding:40px"><h2>مفتاح استعادة مدير النظام — ' +
              (i.name || "") +
              '</h2><p>يُحفظ في مكان آمن. يفتح حساب مدير النظام من شاشة الدخول ← «تعذّر الدخول؟» ويُبطل بعد الاستعمال.</p><p style="font-family:monospace;font-size:28px;letter-spacing:4px;direction:ltr;text-align:center;border:2px dashed var(--bd-x999999);padding:20px">' +
              r.plRkKey +
              "</p><p>أُنشئ: " +
              new Date().toLocaleString("ar-SA-u-nu-latn") +
              "</p></body></html>",
          ),
            t.document.close(),
            t.print());
        } catch (t) {}
      }));
    const v =
      r.plPv ||
      { id: "login", login: "login", app: "phone", side: "side", print: "print", mods: "side", setup: "login", about: "login" }[l];
    return ((w.pvLogin = "login" === v), (w.pvSide = "side" === v), (w.pvPhone = "phone" === v), (w.pvPrint = "print" === v), w);
  }
  _adUsersVals0() {
    const t = this.state,
      e = Date.now(),
      s = KIVO.BassamAuth,
      a = KIVO.BassamPerm,
      r = KIVO.BassamDepts,
      i = s && s.user ? s.user() : null,
      n = i ? i.id : "",
      o = s && s.users ? s.users() : [],
      p = t.adOv || {},
      l = p.lastLogin || {},
      d = {};
    (p.oldHash || []).forEach((t) => {
      d[t] = 1;
    });
    const c = {};
    (p.added || []).forEach((t) => {
      t.tg && t.tg.id && !c[t.tg.id] && (c[t.tg.id] = t);
    });
    const g = {};
    ((t.adPres || {}).list || []).forEach((t) => {
      g[t.u.id] = t;
    });
    const h = (t) =>
        String(t || "")
          .trim()
          .charAt(0) || "؟",
      m = [
        ["all", "الكل", () => !0],
        ["frozen", "غير النشطين", (t) => !!t.dis],
        ["never", "لم يدخلوا منذ بدء السجل", (t) => !t.dis && !l[t.id]],
        ["week", "المضافون هذا الأسبوع", (t) => c[t.id] && e - c[t.id].ts < 6048e5],
        ["idle", "خاملون ٩٠ يوماً", (t) => l[t.id] && e - l[t.id] > 7776e6],
        ["mgrs", "مدراء الإدارات", (t) => "dept" === t.role || "gm" === t.role || !!t.mgr],
        [
          "wide",
          "صلاحيات واسعة",
          (t) => {
            if ("super" === t.role || "dept" === t.role || "gm" === t.role) return !0;
            if (t.mgr) return !0;
            const e = a && t.ekey ? a.empPerms(t.ekey, t.deptId) : {};
            return Object.keys(e).filter((t) => (e[t] || []).some((t) => "del" === t || "approve" === t)).length >= 3;
          },
        ],
        ["old", "بصيغة كلمة مرور قديمة", (t) => !!d[t.id]],
      ],
      f = String(t.usQ || "")
        .trim()
        .toLowerCase(),
      u = m.filter((e) => e[0] === (t.usF || "all"))[0] || m[0],
      b = o
        .filter((t) => u[2](t))
        .filter(
          (t) =>
            !f ||
            KIVO.BassamFind.dig([t.name, t.un, t.alt, this.adUnit(t), this.adRole(t)].join(" ").toLowerCase()).indexOf(
              KIVO.BassamFind.dig(f),
            ) >= 0,
        )
        .sort(
          (t, e) =>
            ("super" === t.role ? -1 : "super" === e.role ? 1 : 0) ||
            (l[e.id] || 0) - (l[t.id] || 0) ||
            String(t.name || "").localeCompare(String(e.name || ""), "ar"),
        ),
      w = (t) => o.filter(t[2]).length,
      y = m
        .filter((t) => "old" !== t[0] || w(t) > 0)
        .map((e) => {
          return {
            t: e[1] + ("all" === e[0] ? "" : " · " + w(e)),
            go: () => this.setState({ usF: e[0] }),
            style:
              "height:26px;display:inline-flex;align-items:center;padding:0 10px;border-radius:9999px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;border:1px solid " +
              ((s = (t.usF || "all") === e[0]) ? "#b99751" : "#E1E1E1") +
              ";background:" +
              (s ? "var(--bg-xb99751)" : "var(--bg-xffffff)") +
              ";color:" +
              (s ? "var(--fg-x1a1206)" : "var(--fg-x475569)"),
          };
          var s;
        }),
      S = (e, s, a, r, i) => ({
        v: String(e),
        l: s,
        tip: i || "",
        go: () => this.setState({ usF: r }),
        style:
          "background:var(--bg-xffffff);border:1px solid " +
          ((t.usF || "all") === r ? "#b99751" : "#ECEEF1") +
          ";border-radius:14px;padding:11px 14px;min-width:0;cursor:pointer",
        vStyle: "font-size:20px;font-weight:800;line-height:1.3;color:" + a + ";font-feature-settings:'tnum'",
      }),
      x = [
        S(o.length, "إجمالي الحسابات", "#141414", "all"),
        S(o.filter((t) => !t.dis).length, "نشط", "#059669", "all"),
        S(w(m[1]), "مجمّد", "#d97706", "frozen"),
        S(w(m[2]), "لم يدخلوا منذ بدء السجل", "#64748b", "never", "سجل الدخول يبدأ من تاريخ رفع هذا الإصدار"),
        S(w(m[4]), "خامل ٩٠ يوماً", "#64748b", "idle"),
        S(w(m[7]), "بصيغة كلمة مرور قديمة", w(m[7]) ? "#dc2626" : "#141414", "old", "لا يستطيع الدخول حتى تُعاد كلمة مروره"),
      ],
      k = (t, e) => this.setState({ usTmp: { name: t.name || t.un, pw: e } }),
      v = b.map((a) => {
        const i = ((t) => (t.dis ? "frozen" : l[t.id] ? "active" : "never"))(a),
          o = g[a.id],
          p = [];
        return (
          "super" !== a.role &&
            (p.push({
              t: a.dis ? "إعادة التفعيل" : "تجميد الحساب",
              go: () => {
                const t = s.setDisById(a.id, !a.dis);
                t && t.ok ? this.bsAck(a.dis ? "أُعيد التفعيل" : "جُمّد الحساب", "ok") : this.bsToast((t && t.err) || "تعذّر", "warn");
              },
            }),
            p.push({
              t: "إعادة تعيين كلمة المرور",
              go: () => {
                KIVO
                  .bsConfirm({
                    title: "إعادة تعيين كلمة المرور",
                    msg: "تعيين كلمة مرور مؤقتة لـ «" + (a.name || a.un) + "»؟ ستُلغى كلمته الحالية فوراً.",
                    ok: "تعيين كلمة مؤقتة",
                  })
                  .then((y) => {
                    y &&
                      s.resetPwById(a.id).then((t) => {
                        t && t.ok ? k(a, t.pw) : this.bsToast((t && t.err) || "تعذّر", "warn");
                      });
                  });
              },
            })),
          o &&
            !o.mine &&
            p.push({
              t: "إنهاء جلساته الآن",
              go: () => {
                this.adAct("/api/sess/kill", { uid: a.id }, "أُنهيت الجلسات");
              },
            }),
          ("staff" !== a.role && "gm" !== a.role) ||
            p.push({
              t: "تعديل الصلاحيات",
              go: () => {
                (a.deptId && this.sysPick(a.deptId), this.adGo("depts"));
              },
            }),
          "staff" !== a.role ||
            a.mgr ||
            p.push({
              t: "حذف حساب الدخول",
              danger: !0,
              go: () => {
                KIVO
                  .bsConfirm({
                    title: "حذف حساب الدخول",
                    msg: "حذف حساب الدخول لـ «" + (a.name || a.un) + "»؟ يبقى سجل الموظف ويُمحى حسابه وصلاحياته.",
                    ok: "حذف الحساب",
                    danger: !0,
                  })
                  .then((y) => {
                    if (!y) return;
                    const t = s.removeStaffAccount(a.ekey, a.deptId);
                    t && t.ok ? this.bsAck("حُذف الحساب", "ok") : this.bsToast((t && t.err) || "تعذّر", "warn");
                  });
              },
            }),
          {
            rowStyle:
              "display:grid;grid-template-columns:1.7fr 1fr .9fr 1fr .9fr .9fr 1.1fr 40px;gap:8px;align-items:center;padding:8px 16px;border-top:1px solid var(--bd-xf1f5f9);font-size:12px" +
              (t.rowMenu === "uw" + a.id ? ";position:relative;z-index:2" : ""),
            ini: h(a.name),
            name: a.name || a.un,
            avStyle:
              "width:28px;height:28px;border-radius:9999px;color:var(--fg-xffffff);display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;background:" +
              (a.dis ? "var(--bg-x94a3b8)" : "var(--bg-xb99751)"),
            flagOn: !(!d[a.id] && !a.mc),
            flag: d[a.id] ? "كلمة مرور بصيغة قديمة — أعد تعيينها" : "كلمة مؤقتة — يغيّرها عند الدخول",
            flagStyle: "font-size:10px;color:" + (d[a.id] ? "var(--fg-xb91c1c)" : "var(--fg-x92400e)"),
            un: a.un || "—",
            role: this.adRole(a),
            dept: "super" === a.role ? "الإدارة العامة" : this.adUnit(a) || "—",
            st: "frozen" === i ? "مجمّد" : o && o.active ? "متصل الآن" : "active" === i ? "نشط" : "لم يدخل",
            stStyle: "font-size:11.5px;white-space:nowrap;color:" + ("frozen" === i ? "#92400e" : "active" === i ? "#065f46" : "#64748b"),
            dot:
              "display:inline-block;width:8px;height:8px;border-radius:9999px;margin-left:6px;vertical-align:middle;background:" +
              ("frozen" === i ? "#d97706" : o && o.active ? "#059669" : "active" === i ? "#10b981" : "#94a3b8"),
            last: l[a.id] ? this.adWhen(l[a.id], e) : "—",
            lastTip: l[a.id] ? this.adFull(l[a.id]) : "لا دخول مسجّل منذ بدء السجل",
            added: c[a.id] ? c[a.id].by + " · " + this.adRel(c[a.id].ts, e) : "—",
            ...(() => {
              const t = this._rowMenu("uw" + a.id, a.id === n ? [] : p.map((t) => ({ name: t.t, danger: !!t.danger, run: t.go })));
              return (
                (t.rmItems = t.rmItems.map((t) =>
                  Object.assign({}, t, {
                    txtStyle:
                      "padding:7px 10px;border-radius:8px;font-size:11.5px;cursor:pointer;font-family:'Cairo',sans-serif;color:" +
                      (/حذف/.test(t.name) ? "#991b1b" : "#141414"),
                  }),
                )),
                t
              );
            })(),
          }
        );
      }),
      _ = (a && a.PAGE_REG) || [],
      O = (_.filter((t) => !t.under).concat(_.filter((t) => t.under)), _.map((t) => ({ key: t.key, name: t.name }))),
      D = r ? r.list() : [],
      T = D.map((t) => {
        const e = a ? a.deptCap(t.id) : [],
          s = a && a.deptLenses ? a.deptLenses(t.id) : [];
        return {
          name: t.name,
          pages: e.map((t) => (_.filter((e) => e.key === t)[0] || { name: t }).name).join(" · ") || "— لا صفحات",
          lenses: KIVO.BassamCount(s.length, "عدسة") + "",
          go: () => {
            (this.sysPick(t.id), this.adGo("depts"));
          },
        };
      }),
      A = [];
    D.forEach((t) => {
      let e = [];
      try {
        e = JSON.parse(r.raw.getItem.call(localStorage, "bsdept:" + t.id + ":bassam_perm_tpls_v1") || "[]") || [];
      } catch (t) {
        e = [];
      }
      ((a && a._store ? a._store() : null) || {}).tplOf;
      let s = {};
      try {
        const e = JSON.parse(r.raw.getItem.call(localStorage, "bassam_perms_v1") || "{}");
        s = (e.tplOf || {})[t.id] || {};
      } catch (t) {}
      e.forEach((e) => {
        const a = Object.keys(e.perms || {})
          .filter((t) => (e.perms[t] || []).length)
          .map(
            (t) =>
              (_.filter((e) => e.key === t)[0] || { name: t }).name +
              " (" +
              (e.perms[t] || []).map((t) => ({ view: "ع", add: "إ", edit: "ت", del: "ح", approve: "ا", export: "ص" })[t] || t).join("") +
              ")",
          )
          .join(" · ");
        A.push({
          name: e.name || e.id,
          dept: t.name,
          sup: !!e.sup,
          grant: a || "لا شيء",
          n: String(Object.keys(s).filter((t) => s[t] === e.id).length),
        });
      });
    });
    const P = { view: "ع", edit: "ت", add: "إ", del: "ح", approve: "ا", export: "ص" },
      B = String(t.pmQ || "")
        .trim()
        .toLowerCase(),
      E = (t) => {
        if ("super" === t.role) {
          const t = {};
          return (
            _.forEach((e) => {
              t[e.key] = ["view", "add", "edit", "del", "approve", "export"];
            }),
            t
          );
        }
        if ("dept" === t.role) {
          const e = {};
          return (
            (a ? a.deptCap(t.deptId) : []).forEach((t) => {
              e[t] = ["view", "add", "edit", "del", "approve", "export"];
            }),
            e
          );
        }
        if ("gm" === t.role) {
          const e = {},
            U = (() => {
              try {
                return KIVO.BassamDepts.deptsUnder(t.gid) || [];
              } catch (t) {
                return [];
              }
            })();
          return (
            D.filter((e) => U.indexOf(e.id) !== -1).forEach((s) => {
              const r = a.empPagePerms(t.ekey, s.id);
              Object.keys(r).forEach((t) => {
                e[t] = (e[t] || []).concat(r[t].filter((s) => (e[t] || []).indexOf(s) < 0));
              });
            }),
            e
          );
        }
        return a && t.ekey ? a.empPagePerms(t.ekey, t.deptId) : {};
      },
      M = o
        .filter((t) => !t.dis)
        .filter(
          (t) => !B || KIVO.BassamFind.dig([t.name, t.un, this.adUnit(t)].join(" ").toLowerCase()).indexOf(KIVO.BassamFind.dig(B)) >= 0,
        ),
      N = M.slice(0, 200).map((t) => {
        const e = E(t);
        return {
          ini: h(t.name),
          name: t.name || t.un,
          sub: this.adSub(t),
          avStyle:
            "width:26px;height:26px;border-radius:9999px;background:var(--bg-xb99751);color:var(--text-on-brand);display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0",
          style:
            "display:grid;grid-template-columns:200px repeat(" +
            _.length +
            ",1fr);gap:6px;align-items:center;padding:7px 16px;border-top:1px solid var(--bd-xf1f5f9);font-size:12px",
          cells: _.map((t) => {
            const s = e[t.key] || [],
              a = s.length
                ? ["view", "edit", "approve", "export"]
                    .filter((t) => s.indexOf(t) >= 0)
                    .map((t) => P[t])
                    .join(" ")
                : "—",
              r = s.length ? (s.indexOf("approve") >= 0 ? "#065f46" : s.indexOf("edit") >= 0 ? "#8A6F35" : "#475569") : "#cbd5e1";
            return {
              t: a,
              tip: s.length
                ? t.name +
                  ": " +
                  s
                    .map((t) => ({ view: "عرض", add: "إضافة", edit: "تعديل", del: "حذف", approve: "اعتماد", export: "تصدير" })[t] || t)
                    .join("، ")
                : t.name + ": لا شيء",
              style: "text-align:center;font-size:11px;font-weight:700;letter-spacing:1px;color:" + r,
            };
          }),
        };
      }),
      R = (t.adPmLog || []).map((t) => {
        const s = this.adSecTxt(t),
          a = (String(t.detail || "").match(/emps=([^;]*)/) || [])[1] || "",
          r = a
            ? a
                .split(",")
                .map((t) => {
                  const e = t.split(":"),
                    s = e[0],
                    a = e[1],
                    r = o.filter((t) => t.ekey === a && t.deptId === s)[0];
                  return (
                    (r ? r.name || r.un : a) +
                    (e[2]
                      ? " ← " +
                        e[2]
                          .split("|")
                          .map((t) => (_.filter((e) => e.key === t)[0] || { name: t }).name)
                          .join("، ")
                      : " ← لا شيء")
                  );
                })
                .join(" ؛ ")
            : "";
        return { txt: s.t + (r ? ": " + r : ""), who: t.name || t.un || "—", when: this.adWhen(t.ts, e), whenTip: this.adFull(t.ts) };
      });
    return {
      admGoUsers: () => this.adGo("users"),
      admGoPerms: () => this.adGo("perms"),
      usCards: x,
      usFilters: y,
      usQ: t.usQ || "",
      usOnQ: (t) => this.setState({ usQ: t.target.value }),
      usRows: v,
      usEmpty: !v.length,
      usFoot: v.length + " من " + KIVO.BassamCount(o.length, "حساب", "g") + "",
      usNote: "آخر دخول وتاريخ الإضافة من سجل الأمن — يبدأ من رفع هذا الإصدار",
      usExport: () => {
        const t = (t) => '"' + String(null == t ? "" : t).replace(/"/g, '""') + '"',
          e = [["الاسم", "اسم المستخدم", "الدور", "الإدارة", "الحالة", "آخر دخول"].map(t).join(",")];
        b.forEach((s) =>
          e.push(
            [
              s.name,
              s.un,
              this.adRole(s),
              "super" === s.role ? "الإدارة العامة" : this.adUnit(s),
              s.dis ? "مجمّد" : "نشط",
              l[s.id] ? new Date(l[s.id]).toISOString() : "",
            ]
              .map(t)
              .join(","),
          ),
        );
        try {
          const t = new Blob(["\ufeff" + e.join("\n")], { type: "text/csv;charset=utf-8" }),
            s = document.createElement("a");
          ((s.href = URL.createObjectURL(t)),
            (s.download = "الحسابات-" + new Date().toISOString().slice(0, 10) + ".csv"),
            document.body.appendChild(s),
            s.click(),
            setTimeout(() => {
              (URL.revokeObjectURL(s.href), s.remove());
            }, 800));
        } catch (t) {
          this.bsToast("تعذّر التصدير", "warn");
        }
      },
      usTmpOn: !!t.usTmp,
      usTmpName: t.usTmp ? t.usTmp.name : "",
      usTmpPw: t.usTmp ? t.usTmp.pw : "",
      usTmpClose: () => this.setState({ usTmp: null }),
      usTmpKeep: (t) => {
        try {
          t.stopPropagation();
        } catch (t) {}
      },
      usTmpCopy: () => {
        try {
          (navigator.clipboard.writeText(t.usTmp.pw), this.bsToast("نُسخت", "ok"));
        } catch (t) {}
      },
      pmCaps: T,
      pmTpls: A,
      pmTplEmpty: !A.length,
      pmCols: O,
      pmRows: N,
      pmQ: t.pmQ || "",
      pmOnQ: (t) => this.setState({ pmQ: t.target.value }),
      pmFoot: N.length + " من " + KIVO.BassamCount(M.length, "حساب|نشط", "g") + "",
      pmExport: () => {
        const t = (t) => '"' + String(null == t ? "" : t).replace(/"/g, '""') + '"',
          e = [
            ["المستخدم", "الدور", "الإدارة"]
              .concat(_.map((t) => t.name))
              .map(t)
              .join(","),
          ];
        M.forEach((s) => {
          const a = E(s);
          e.push(
            [s.name, this.adRole(s), this.adUnit(s)]
              .concat(_.map((t) => (a[t.key] || []).join("+")))
              .map(t)
              .join(","),
          );
        });
        try {
          const t = new Blob(["\ufeff" + e.join("\n")], { type: "text/csv;charset=utf-8" }),
            s = document.createElement("a");
          ((s.href = URL.createObjectURL(t)),
            (s.download = "مصفوفة-الصلاحيات-" + new Date().toISOString().slice(0, 10) + ".csv"),
            document.body.appendChild(s),
            s.click(),
            setTimeout(() => {
              (URL.revokeObjectURL(s.href), s.remove());
            }, 800));
        } catch (t) {
          this.bsToast("تعذّر التصدير", "warn");
        }
      },
      pmHeadStyle:
        "display:grid;grid-template-columns:200px repeat(" +
        _.length +
        ",1fr);gap:6px;padding:6px 16px;font-size:10.5px;font-weight:700;color:var(--fg-x94a3b8);background:var(--bg-xfafaf9)",
      pmLog: R,
      pmLogEmpty: !R.length,
    };
  }
  /* KIVO_265 · حادثةُ الصور (البند 6): بطاقةُ «تشخيص الصور» في نظرة عامة — من /api/overview imgs (الخادم) · أسماءُ الإدارات من السجل المحلي */
  _adImgVals(I, now) {
    if (!I) return { ovImgOn: !1 };
    if (I.err) return { ovImgOn: !0, ovImgErr: "تعذّر قراءة مخزن الصور: " + I.err, ovImgCards: [], ovImgClaims: [], ovImgClaimsEmpty: !0, ovImgOrph: [], ovImgOrphEmpty: !0, ovImgNote: "" };
    const dn = (() => { const m = {}; try { (KIVO.BassamDepts.list() || []).forEach((d) => { m[d.id] = d.name; }); } catch (t) {} return (id) => (id && m[id]) || id || "—"; })(),
      c = I.counts || {},
      vs = (col) => "font-size:22px;font-weight:800;font-feature-settings:'tnum';color:" + col,
      cards = [
        { l: "مخزن الأصول", v: I.r2 ? "R2 مربوط" : "D1 فقط", sub: I.r2 ? "الصور الكبيرة في المستودع الكائني" : "لا ربط IMG_R2 — الصور داخل القاعدة", vStyle: vs(I.r2 ? "var(--success-text)" : "var(--warning-text)"), tip: "" },
        { l: "صور مخزّنة", v: String(I.stored || 0), sub: KIVO.BassamCount(c.bound || 0, "صورة") + " مربوطة بسجلّها", vStyle: vs("var(--text-primary)"), tip: "" },
        { l: "رُفعت ولم تُربط", v: String(c.claim || 0), sub: c.claim ? "رفعٌ لم يتبعه حفظٌ أو تسليم" : "لا شيء معلّق", vStyle: vs(c.claim ? "var(--warning-text)" : "var(--success-text)"), tip: "" },
        { l: "يتيمة (مهلة السماح)", v: String(c.orphan || 0), sub: "تُكنس بعد " + Math.round((I.grace || 0) / 864e5) + " يوماً من إزالة مرجعها", vStyle: vs(c.orphan ? "var(--warning-text)" : "var(--text-primary)"), tip: "" },
        { l: "رفوع لم تكتمل", v: String(I.staged || 0), sub: I.staged ? "أجزاءٌ مرحَّلة لصورٍ انقطع رفعُها" : "لا أجزاء معلّقة", vStyle: vs(I.staged ? "var(--warning-text)" : "var(--text-primary)"), tip: "" },
        { l: "غير محسومة", v: String(c.amb || 0), sub: "قديمةٌ بلا مالك واضح — لمدير النظام", vStyle: vs("var(--text-secondary)"), tip: "" },
      ],
      age = (ts) => (ts ? this.adRel(ts, now) : "—"),
      cl = (I.claims || []).map((q) => ({ img: q.img, who: q.name || q.uid || "—", dept: dn(q.dept), when: age(q.ts) })),
      or = (I.orphans || []).map((q) => ({ img: q.img, dept: dn(q.dept), when: age(q.ts), left: Math.max(0, Math.ceil(((q.ts || 0) + (I.grace || 0) - now) / 864e5)) + " يوماً" }));
    return { ovImgOn: !0, ovImgErr: "", ovImgCards: cards, ovImgClaims: cl, ovImgClaimsEmpty: !cl.length, ovImgOrph: or, ovImgOrphEmpty: !or.length,
      ovImgNote: "صورة التوثيق تمرّ بثلاث حالات: رفع (claim) ⇐ ربط بالمهمة عند الحفظ أو التسليم (bound) ⇐ يتيمة إن أُزيل مرجعها (orphan) ثم تُكنس بعد مهلة السماح. رفعٌ بقي غير مربوط طويلاً يعني أن الموظف لم يحفظ ولم يسلّم بعده." };
  }
  _adVals0() {
    const t = this.state,
      e = Date.now(),
      s = this.adOnSrv(),
      a = KIVO.BassamAuth,
      r = a && a.user ? a.user() : null,
      i = r ? r.id : "",
      n = a && a.users ? a.users() : [],
      o = t.adOv || {},
      p = t.adPres || { list: [], active: 0 },
      l = (t) =>
        String(t || "")
          .trim()
          .charAt(0) || "؟",
      d = (t) => "display:inline-block;width:8px;height:8px;border-radius:9999px;margin-left:6px;vertical-align:middle;background:" + t,
      c = (t) => "font-size:11.5px;white-space:nowrap;color:" + t,
      g = KIVO.BassamLink ? KIVO.BassamLink.get() : "local",
      h = n.filter((t) => !t.dis).length,
      m = n.filter((t) => t.dis).length;
    const employeeCountsReady = s && !t.adErr && o.ok === 1 && Number.isSafeInteger(o.employeeCount) && o.employeeCount >= 0 &&
      Number.isSafeInteger(o.employeeNoAccountCount) && o.employeeNoAccountCount >= 0 && o.employeeNoAccountCount <= o.employeeCount,
      f = employeeCountsReady ? o.employeeCount : null,
      missingAccounts = employeeCountsReady ? o.employeeNoAccountCount : null;
    let u = this._fullStamp();
    const b = this._expInfo(u, "full"),
      w = u ? Math.floor((e - new Date(u).getTime()) / 864e5) : 999,
      y = [
        {
          v: "on" === g ? "● متصل" : "off" === g ? "● منقطع" : "● محلي",
          l: "الخادم والقاعدة",
          sub: "on" === g ? "الإصدار " + (KIVO.__BS_VER || "") : "off" === g ? "التعديلات تُحفظ مؤقتاً" : "نسخة الجهاز",
          vStyle: "font-size:20px;font-weight:800;line-height:1.3;color:" + ("on" === g ? "#059669" : "off" === g ? "#dc2626" : "#64748b"),
          tip: "حالة الاتصال بالخادم كما في مؤشر القائمة الجانبية",
        },
        {
          v: h + " / " + m + " / " + (missingAccounts === null ? "—" : missingAccounts),
          l: "الحسابات: نشط / مجمّد / بلا حساب",
          sub: f === null ? (t.adErr || o.ok === 1 ? "تعذّر تأكيد عدد الموظفين — أعد المحاولة" : "جارٍ تأكيد عدد الموظفين…") : KIVO.BassamCount(f, "موظف") + " في كل الإدارات",
          vStyle: "font-size:20px;font-weight:800;line-height:1.3;color:var(--fg-x141414);font-feature-settings:'tnum'",
          tip: "حسابات الدخول عبر كل الإدارات",
        },
        {
          v: String(p.active || 0),
          l: "متصلون الآن",
          sub: (p.list || []).length
            ? KIVO.BassamCount((p.list || []).length - (p.active || 0), ["خامل واحد", "خاملان", "خاملَين", "خاملين", "خاملاً", "خامل"])
            : "—",
          vStyle: "font-size:20px;font-weight:800;line-height:1.3;color:var(--fg-x059669);font-feature-settings:'tnum'",
          tip: "جلسات تفاعلت خلال آخر دقيقتين",
        },
        {
          v: String(o.failsToday || 0),
          l: "محاولات دخول فاشلة اليوم",
          sub: o.lockedNow ? o.lockedNow + " قفل نشط الآن" : "لا أقفال نشطة",
          vStyle:
            "font-size:20px;font-weight:800;line-height:1.3;color:" +
            (o.failsToday ? "var(--fg-xdc2626)" : "var(--fg-x141414)") +
            ";font-feature-settings:'tnum'",
          tip: "من سجل أحداث الأمن",
        },
        {
          v: String(o.deniedToday || 0),
          l: "كتابات مرفوضة اليوم",
          sub: "محاولات تعديل خارج الصلاحية",
          vStyle:
            "font-size:20px;font-weight:800;line-height:1.3;color:" +
            (o.deniedToday ? "var(--fg-x7c3aed)" : "var(--fg-x141414)") +
            ";font-feature-settings:'tnum'",
          tip: "رفضها الخادم وأُعيدت القيم كما هي",
        },
        {
          v: u ? this.adRel(new Date(u).getTime(), e) : "—",
          l: "آخر نسخة احتياطية شاملة",
          sub: u ? (w >= 2 ? "تجاوزت المدة المقبولة (يومان)" : "ضمن المدة") : "لم تُؤخذ نسخة بعد",
          vStyle: "font-size:20px;font-weight:800;line-height:1.3;color:" + (w >= 2 ? "var(--fg-xd97706)" : "var(--fg-x141414)"),
          tip: b.txt,
        },
      ],
      S = [];
    ((o.fails || [])
      .filter((t) => t.n >= 3)
      .forEach((t) =>
        S.push({
          c: "#dc2626",
          txt:
            KIVO.BassamCount(t.n, "محاولة دخول فاشلة") +
            " باسم " +
            t.un +
            (t.known ? " (حساب حقيقي)" : " — الاسم لا يطابق أي حساب") +
            (t.city ? " من " + t.city : ""),
          when: this.adRel(t.t, e),
          act: t.until > e ? "فكّ القفل" : "عرض السجل",
          go: () =>
            t.until > e ? this.adAct("/api/guard/unlock", { gk: "u:" + String(t.un).toLowerCase(), gks: t.gks || [] }, "فُكّ القفل") : this.adGo("sec"),   /* KIVO_261 (AUD-052): أقفالُ الاسم الفعلية */
        }),
      ),
      (!u || w >= 2) &&
        S.push({
          c: "#d97706",
          txt: u ? "النسخة الاحتياطية الشاملة متأخرة " + KIVO.BassamCount(w, "يوم", "g") + "" : "لم تُؤخذ نسخة احتياطية شاملة بعد",
          when: "الآن",
          act: "أخذ نسخة الآن",
          go: () => this.adGo("backup"),
        }),
      (o.deniedBy || [])
        .filter((t) => t.n >= 2)
        .forEach((t) =>
          S.push({
            c: "#9c3d6b",
            txt: (t.name || "مستخدم") + " حاول التعديل خارج صلاحيته " + KIVO.BassamCount(t.n, "مرة", "g") + " اليوم",
            when: this.adRel(t.t, e),
            act: "عرض السجل",
            go: () => this.setState({ adSecKind: "denied" }, () => this.adGo("sec")),
          }),
        ));
    const x = S.map((t) => ({
        dot: "width:8px;height:8px;border-radius:9999px;flex-shrink:0;background:" + t.c,
        txt: t.txt,
        when: t.when,
        act: t.act,
        hasAct: !!t.act,
        go: t.go,
      })),
      k = (t) =>
        t
          ? (KIVO.BassamKeyLabels && KIVO.BassamKeyLabels.isTech(t.k)
              ? "نشاط: " + this.adKeyLbl(t.k)
              : ("del" === t.act ? "حذف " : "عدّل ") + this.adKeyLbl(t.k)) +
            " · " +
            this.adRel(t.t, e)
          : "—",
      v = (p.list || []).map((t) => ({
        ini: l(t.u.name),
        name: t.u.name || t.u.un,
        sub: this.adSub(t.u),
        tip:
          "دخل " +
          this.adWhen(t.since, e) +
          (t.city ? " · " + t.city : "") +
          " · " +
          (t.devs.indexOf("m") >= 0 ? "جوال" : "حاسوب") +
          (t.n > 1 ? " ×" + t.n : ""),
        st: t.active ? "نشط الآن" : this.adRel(t.la, e),
        stStyle: c(t.active ? "#065f46" : "#64748b") + (t.active ? ";font-weight:700" : ""),
        dot: d(t.active ? "#059669" : "#d97706"),
        last: k(t.last),
        lastTip: t.last ? this.adFull(t.last.t) : "",
        mine: !!t.mine,
        canKill: !t.mine,
        kill: () => {
          KIVO
            .bsConfirm({
              title: "إنهاء الجلسات",
              msg: "إنهاء كل جلسات «" + (t.u.name || t.u.un) + "» الآن؟ سيحتاج إلى تسجيل الدخول من جديد على كل أجهزته.",
              ok: "إنهاء الجلسات",
              danger: !0,
            })
            .then((y) => {
              y && this.adAct("/api/sess/kill", { uid: t.u.id }, "أُنهيت الجلسات");
            });
        },
      })),
      _ = (o.added || []).map((t) => ({
        ini: l(t.tg.name),
        name: t.tg.name || t.tg.un || "",
        sub: this.adSub(t.tg),
        by: (t.by || "") + " · " + this.adRel(t.ts, e),
        st: t.lastLogin ? "دخل · " + this.adRel(t.lastLogin, e) : "لم يدخل بعد",
        stStyle: c(t.lastLogin ? "#065f46" : "#64748b"),
        dot: d(t.lastLogin ? "#059669" : "#94a3b8"),
      })),
      O = {};
    (o.frozen || []).forEach((t) => {
      t.tg && t.tg.id && !O[t.tg.id] && (O[t.tg.id] = t);
    });
    const D = n
        .filter((t) => t.dis)
        .map((s) => {
          const r = O[s.id];
          return {
            ini: l(s.name),
            name: s.name || s.un,
            sub: this.adSub(s),
            by: r ? (r.by || "") + " · " + this.adRel(r.ts, e) : "—",
            unfreeze: () => {
              const e = a && a.setDisById ? a.setDisById(s.id, !1) : { ok: !1 };
              e && e.ok
                ? (this.bsAck("أُعيد تفعيل الحساب", "ok"), this.setState({ adTick: (t.adTick || 0) + 1 }))
                : this.bsToast((e && e.err) || "تعذّر", "warn");
            },
          };
        }),
      T = (o.fails || []).map((t) => ({
        un: t.un,
        known: t.known ? "حساب حقيقي" : "لا يطابق حساباً",
        knownStyle: "font-size:10px;color:" + (t.known ? "var(--fg-x94a3b8)" : "var(--fg-xb91c1c)"),
        src: [t.city, "m" === t.dev ? "جوال" : "حاسوب"].filter(Boolean).join(" · ") || "—",
        n: String(t.n),
        lock: t.until > e ? "مقفل حتى " + this.adClock(t.until) : "—",
        locked: t.until > e,
        unlock: () => this.adAct("/api/guard/unlock", { gk: "u:" + String(t.un).toLowerCase(), gks: t.gks || [] }, "فُكّ القفل"),
      })),
      A = {
        login: ["#059669", "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4 M10 17l5-5-5-5 M15 12H3"],
        warn: ["#d97706", "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01"],
        sec: ["#dc2626", "M3 11h18v11H3z M7 11V7a5 5 0 0 1 10 0v4"],
        perm: ["#9c3d6b", "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"],
        adm: [
          "#0e7490",
          "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
        ],
      },
      P = String(t.adSecQ || "")
        .trim()
        .toLowerCase(),
      B = (t.adSec || [])
        .filter(
          (t) =>
            !P ||
            KIVO.BassamFind.dig(String((t.name || "") + " " + (t.un || "") + " " + (t.target || "")).toLowerCase()).indexOf(
              KIVO.BassamFind.dig(P),
            ) >= 0,
        )
        .map((t) => {
          const s = this.adSecTxt(t),
            a = A[s.k] || A.adm;
          return {
            icoStyle:
              "width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:" +
              a[0] +
              "14;color:" +
              a[0],
            icoPath: a[1],
            txt: s.t,
            warn: !!s.w,
            warnTxt: s.w || "",
            who: t.name || t.un || "—",
            whoTip: [t.name, t.un, this.adSub({ id: t.uid, role: t.role, deptId: t.deptId })].filter(Boolean).join(" · "),
            when: this.adWhen(t.ts, e),
            whenTip: this.adFull(t.ts),
            dev: ["m" === t.dev ? "جوال" : "d" === t.dev ? "حاسوب" : "", t.city].filter(Boolean).join(" · ") || "—",
          };
        }),
      E = (t, e, s) => ({
        t: t,
        go: s,
        style:
          "height:26px;display:inline-flex;align-items:center;padding:0 10px;border-radius:9999px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;border:1px solid " +
          (e ? "var(--bd-xb99751)" : "var(--bd-xe1e1e1)") +
          ";background:" +
          (e ? "var(--bg-xb99751)" : "var(--bg-xffffff)") +
          ";color:" +
          (e ? "var(--fg-x1a1206)" : "var(--fg-x475569)"),
      }),
      M = (t) =>
        this.setState({ adSecKind: t }, () => {
          ((this._adLast = 0), this.adLoad(!0));
        }),
      N = (t) =>
        this.setState({ adSecPeriod: t }, () => {
          ((this._adLast = 0), this.adLoad(!0));
        }),
      R = [
        ["all", "الكل"],
        ["login", "دخول"],
        ["pw", "كلمات مرور"],
        ["acct", "حسابات"],
        ["perm", "صلاحيات"],
        ["denied", "مرفوض"],
        ["admin", "مدير النظام"],
      ].map((e) => E(e[1], (t.adSecKind || "all") === e[0], () => M(e[0]))),
      L = [
        ["today", "اليوم"],
        ["7d", "٧ أيام"],
        ["30d", "٣٠ يوماً"],
      ].map((e) => E(e[1], (t.adSecPeriod || "today") === e[0], () => N(e[0]))),
      C = (o.failsToday || 0) + (o.deniedToday || 0),
      F = t.adPol || {},
      I = (t, e) => this.setState({ adPol: Object.assign({}, this.state.adPol || {}, { [t]: e }), adPolMsg: "" }),
      j = [
        ["sessH", "مدة الجلسة القصوى", "ساعة"],
        ["idleH", "الخمول قبل الخروج", "ساعة"],
        ["lockN", "محاولات قبل القفل", "محاولة"],
        ["lockMin", "مدة القفل القصوى", "دقيقة"],
        ["pwMin", "الحد الأدنى لكلمة مرور الحسابات الإدارية (ثابت)", "خانة"],
        ["wrMin", "سقفُ الحفظ لكل حساب في الدقيقة (رفعُ الصور ربعُه)", "حفظة"],
      ].map((t) => ({ l: t[1], u: t[2], v: null == F[t[0]] ? "" : String(F[t[0]]), on: (e) => I(t[0], e.target.value) })),
      G = (p.list || []).map((t) => ({
        ini: l(t.u.name),
        name: t.u.name || t.u.un,
        devs: (t.devs.indexOf("m") >= 0 ? "جوال" : "حاسوب") + (t.n > 1 ? " ×" + t.n : "") + (t.city ? " · " + t.city : ""),
        mine: !!t.mine,
        canKill: !t.mine,
        kill: () => this.adAct("/api/sess/kill", { uid: t.u.id }, "أُنهيت الجلسات"),
      }));
    return {
      admGoOverview: () => this.adGo("overview"),
      admGoSec: () => this.adGo("sec"),
      ...this.adUsersVals(),
      ovCards: y,
      ...this._adImgVals(o.imgs, e),
      ovAlerts: x,
      ovAlertsEmpty: !x.length,
      ovRefreshed: t.adOv ? "حُدّث " + this.adRel(this._adLast || e, e) : s ? "جارٍ التحميل…" : "متاح على وضع الخادم فقط",
      ovPresN: KIVO.BassamCount(p.active || 0, ["نشط واحد", "نشطان", "نشطَين", "نشطين", "نشطاً", "نشط"]),
      ovPres: v,
      ovPresEmpty: !v.length,
      ovAdded: _,
      ovAddedN: KIVO.BassamCount(_.length, "حساب") + "",
      ovAddedEmpty: !_.length,
      ovFrozen: D,
      ovFrozenN: D.length ? KIVO.BassamCount(D.length, "حساب") + "" : "لا شيء",
      ovFrozenEmpty: !D.length,
      ovFails: T,
      ovFailsN: KIVO.BassamCount(o.failsToday || 0, "محاولة") + "",
      ovFailsEmpty: !T.length,
      ...KIVO.BassamCount.pair("secBadge", String(C), "حدث"),
      secBadgeOn: s && C > 0,
      secQ: t.adSecQ || "",
      secOnQ: (t) => this.setState({ adSecQ: t.target.value }),
      secKinds: R,
      secPeriods: L,
      secRows: B,
      secEmpty: !B.length,
      secFoot: KIVO.BassamCount(B.length, "حدث") + "" + (t.adSec && t.adSec.length >= (t.adSecLim || 100) ? " · يوجد المزيد" : ""),
      secMoreOn: !!(t.adSec && t.adSec.length >= (t.adSecLim || 100)),
      secMore: () =>
        this.setState({ adSecLim: (t.adSecLim || 100) + 200 }, () => {
          ((this._adLast = 0), this.adLoad(!0));
        }),
      secExport: () => this.adSecExport(),
      secPol: j,
      secPolMsg: t.adPolMsg || "",
      secPolSaveStyle:
        "height:28px;padding:0 12px;border-radius:8px;border:0;background:var(--bg-xb99751);color:var(--text-on-brand);font-family:'Cairo',sans-serif;font-size:11px;font-weight:700;cursor:pointer",
      secPolSave: () =>
        this.adFetch("/api/policy", this.state.adPol || {}).then((t) => {
          t && t.ok ? this.setState({ adPol: t.policy, adPolMsg: "حُفظت — تسري من الدخول التالي" }) : this.bsToast("تعذّر الحفظ", "warn");
        }),
      secSess: G,
      secSessN:
        KIVO.BassamCount((p.list || []).length, "مستخدم") +
        " على " +
        KIVO.BassamCount(
          (p.list || []).reduce((t, e) => t + (e.n || 0), 0),
          "جهاز",
          "g",
        ) +
        "",
      secKillAll: () => {
        KIVO
          .bsConfirm({
            title: "إنهاء كل الجلسات الأخرى",
            msg: "إنهاء كل الجلسات عدا جلستك؟ سيحتاج الجميع إلى تسجيل الدخول من جديد.",
            ok: "إنهاء الجلسات",
            danger: !0,
          })
          .then((y) => {
            y && this.adAct("/api/sess/kill", { uid: i, all: !0 }, "أُنهيت كل الجلسات الأخرى");
          });
      },
    };
  }
  async fbkCommit(mode) {
    const pend = this._fbkPend,
      svc = KIVO.BackupRestore;
    if (!pend || !svc) return;
    if (pend.uncertain && pend.mode !== mode) {
      this.setState({ backupMsg: "أعد المحاولة بالطريقة نفسها لتأكيد نتيجة الطلب السابق أولًا" });
      return;
    }
    if (!KIVO.BassamAuth || !KIVO.BassamAuth.isSuper()) {
      this.setState({ backupMsg: "صلاحية غير كافية" });
      return;
    }
    if (this._fbkSaving) return;
    this._fbkSaving = true;
    try {
      if (!pend.ticket || pend.mode !== mode) {
        const scope = pend.legacy ? { kind: "dept", departmentId: KIVO.BassamDepts.active() } : { kind: "full" },
          prepared = await svc.prepare(pend.file, { scope, mode });
        if (!prepared.ok) {
          this.setState({ backupMsg: prepared.message });
          return;
        }
        pend.ticket = prepared.ticket;
        pend.mode = mode;
        pend.prepared = prepared;
        pend.confirmed = false;
      }
      if (!pend.confirmed) {
        if (!(await svc.confirm(pend.prepared))) return;
        const approved = svc.approve(pend.ticket);
        if (!approved.ok) {
          this.setState({ backupMsg: approved.message });
          return;
        }
        pend.confirmed = true;
      }
      this.setState({ backupMsg: "جارٍ تثبيت الاستعادة على الخادم…" });
      const result = await svc.send(pend.ticket);
      if (!result.ok) {
        pend.uncertain = result.uncertain;
        if (!result.uncertain) {
          pend.ticket = null;
          pend.confirmed = false;
        }
        this.setState({ backupMsg: result.message, fbkStep: "pick" });
        return;
      }
      if (this._fbkPend !== pend) return;
      this._fbkPend = null;
      this._decPend = null;
      this.setState({
        fbkConf: null,
        fbkStep: "pick",
        backupMsg: "اكتملت الاستعادة وأُنشئت لقطة ما قبلها على الخادم",
        tick: (this.state.tick || 0) + 1,
      });
      await svc.refresh();
      if (result.receipt.reauthRequired) this.setState({ backupMsg: "اكتملت الاستعادة؛ سجّل الدخول مجددًا بالحساب المعتمد" });
    } finally {
      this._fbkSaving = false;
    }
  }
  _pages() {
    try {
      const t = KIVO.BassamPerm && KIVO.BassamPerm.PAGE_REG;
      if (Array.isArray(t) && t.length) return t;
    } catch (t) {}
    return [];
  }
  _subsOf(t) {
    const e = this._pages().filter((e) => e.key === t)[0];
    return e && e.subs ? e.subs : [];
  }
  _tabsOf(t) {
    const e = this._pages().filter((e) => e.key === t)[0];
    return e && e.tabs ? e.tabs : [];
  }
  _loadDraft(t) {
    const e = KIVO.BassamPerm;
    if (!e || !t) return { cap: [], subs: {}, tabs: {}, lenses: [] };
    const s = (e.rawCap ? e.rawCap(t) : e.deptCap(t)).slice(),
      a = {},
      r = {},
      i = e.deptLenses ? e.deptLenses(t).slice() : [];
    return (
      this._pages().forEach((i) => {
        const n = -1 !== s.indexOf(i.key);
        (i.subs && i.subs.length && (a[i.key] = n ? e.deptSubs(t, i.key).slice() : []),
          i.tabs && i.tabs.length && e.deptTabs && (r[i.key] = n ? e.deptTabs(t, i.key).slice() : []));
      }),
      { cap: s, subs: a, tabs: r, lenses: i }
    );
  }
  _dirty() {
    const t = this.state;
    return !(!t.capDraft || !t.capBase) && JSON.stringify(t.capDraft) !== JSON.stringify(t.capBase);
  }
  /* caps-own: the explicit per-unit switch (system administrator · one ordinary protected save of the registry — 331 setCapOwn) */
  capOwnTog(o) {
    const P = KIVO.BassamPerm;
    if (!P || !P.setCapOwn || !o) return;
    if (this._dirty()) return void this.bsToast("احفظ السقف أو تراجع عنه أولاً", "warn");
    const on = !(P.capOwnOf && P.capOwnOf(o)),
      r = P.setCapOwn(o, on);
    if (r && !1 === r.ok) return void this.bsToast(r.err || "تعذّر الحفظ", "err");
    const e = this._loadDraft(o);
    this.setState({ capDraft: e, capBase: JSON.parse(JSON.stringify(e)) });
    this.bsToast(on ? "صار سقف هذه الوحدة مستقلاً عن سقف الأصل — بسقفها الفعليّ الحاليّ" : "صار سقف هذه الوحدة تابعاً: الفعليّ = تقاطعُه مع سقوف الأصول", "ok");
  }
  mgrOpen(t, e) {
    this.setState({
      mgrDid: t,
      mgrUid: e || "",
      mgrGid: "",
      mgrErr: "",
      mgrF_name: void 0,
      mgrF_nid: void 0,
      mgrF_phone: void 0,
      mgrF_no: void 0,
      mgrF_title: void 0,
      sysSel: t,
    });
  }
  gmOpen(t, u) {
    this.setState({
      mgrDid: "",
      mgrGid: t,
      mgrUid: u || "",
      mgrErr: "",
      mgrF_name: void 0,
      mgrF_nid: void 0,
      mgrF_phone: void 0,
      mgrF_no: void 0,
      mgrF_title: void 0,
    });
  }
  _unSplit(o) {
    const u = String((o && o.un) || ""),
      a = String((o && o.alt) || "");
    return !a && /^05/.test(u) ? { nid: "", phone: u } : { nid: u, phone: a };
  }
  _gmKind(t) {
    try {
      const D = KIVO.BassamDepts,
        k = String((D.nodeOf(t) || {}).kind || "");
      return "إدارة عامة" === k ? "الإدارة العامة" : "إدارة عليا" === k ? "الإدارة العليا" : "قطاع" === k ? "القطاع" : k || "العقدة";
    } catch (t) {
      return "العقدة";
    }
  }
  _gmFor(t) {
    const k = this._gmKind(t);
    return "ال" === k.slice(0, 2) ? "ل" + k.slice(1) : "لـ" + k;
  }
  _gmRec(t, u) {
    const e = KIVO.BassamAuth;
    if (!e) return null;
    if ("__add" === u) return null;
    const l = e.groupManagers ? e.groupManagers(t) : [];
    return u ? l.filter((x) => x.id === u)[0] || null : l[0] || null;
  }
  gmSave(t) {
    const e = KIVO.BassamAuth;
    if (!e || !e.setGroupManager) return;
    const s = this.state,
      u = s.mgrUid || "",
      a = this._gmRec(t, u),
      r = (t, e) => (void 0 !== s["mgrF_" + t] ? s["mgrF_" + t] : e),
      i = {
        gid: t,
        name: r("name", a ? a.name : ""),
        nid: r("nid", a ? this._unSplit(a).nid : ""),
        phone: r("phone", a ? this._unSplit(a).phone : ""),
        empno: r("no", a ? a.empno : ""),
        title: r("title", a && a.title ? a.title : ""),
      };
    a ? (i.id = a.id) : (i.add = !0);
    const k = this._gmKind(t),
      kf = this._gmFor(t),
      nn = (() => {
        try {
          return KIVO.BassamDepts.groupName(t) || "";
        } catch (e) {
          return "";
        }
      })();
    Promise.resolve(e.setGroupManager(i)).then((t) => {
      t && t.ok
        ? (this.mgrClose(),
          this.setState({ tick: (this.state.tick || 0) + 1 }),
          this.bsAck(
            t.replaced
              ? "حُدِّثت بيانات مدير " + (nn ? "«" + nn + "»" : k)
              : "عُيّن «" + i.name + "» مديراً " + (nn ? "لـ«" + nn + "»" : kf) + " — يرث سقف كل إدارة في الفرع كاملاً",
            "ok",
          ))
        : this.setState({ mgrErr: (t && t.err) || "تعذّر الحفظ" });
    });
  }
  mgrClose() {
    this.setState({
      mgrDid: "",
      mgrUid: "",
      mgrGid: "",
      mgrErr: "",
      mgrF_name: void 0,
      mgrF_nid: void 0,
      mgrF_phone: void 0,
      mgrF_no: void 0,
      mgrF_title: void 0,
    });
  }
  mgrSave(t) {
    const e = KIVO.BassamAuth;
    if (!e || !e.setDeptManager) return;
    const s = this.state,
      u = s.mgrUid || "",
      a =
        "__add" === u
          ? null
          : u
            ? (e.deptManagers ? e.deptManagers(t) : []).filter((x) => x.id === u)[0] || null
            : e.deptManager
              ? e.deptManager(t)
              : null,
      r = (t, e) => (void 0 !== s["mgrF_" + t] ? s["mgrF_" + t] : e),
      i = {
        deptId: t,
        id: a ? a.id : "",
        add: !a,
        name: r("name", a ? a.name : ""),
        nid: r("nid", a ? this._unSplit(a).nid : ""),
        phone: r("phone", a ? this._unSplit(a).phone : ""),
        empno: r("no", a ? a.empno : ""),
        title: r("title", a && a.title ? a.title : ""),
      };
    Promise.resolve(e.setDeptManager(i)).then((t) => {
      t && t.ok
        ? (this.mgrClose(),
          this.setState({ tick: (this.state.tick || 0) + 1, sysTab: "emps", usrPage: 1 }),
          this.bsAck(
            t.replaced
              ? "حُدِّثت بيانات مدير " + (this.adDept(i.deptId) ? "«" + this.adDept(i.deptId) + "»" : "الإدارة")
              : "عُيّن «" + i.name + "» مديراً " + (this.adDept(i.deptId) ? "لـ«" + this.adDept(i.deptId) + "»" : "للإدارة"),
            "ok",
          ))
        : this.setState({ mgrErr: (t && t.err) || "تعذّر الحفظ" });
    });
  }
  userDis(t, e, s) {
    const a = KIVO.BassamAuth,
      r = KIVO.BassamDepts;
    if (!a || !r) return;
    const i = (t, e) => {
      t && t.ok
        ? (this.setState({ tick: (this.state.tick || 0) + 1 }), this.bsAck(e, "ok"))
        : this.bsToast((t && t.err) || "تعذّر تنفيذ الإجراء");
    };
    if (s) {
      const s = a.setDeptManagerDis(e, !t.dis);
      return void i(s, t.dis ? "فُعّل حساب مدير الإدارة" : "أُوقف حساب مدير الإدارة");
    }
    if (!t.dis) return void i(a.freezeStaff(t.ekey, e), "أُوقف حساب «" + (t.name || "المستخدم") + "»");
    let n = null;
    try {
      const s = r.raw.getItem.call(localStorage, "bsdept:" + e + ":bassam_employees_v1");
      let a = JSON.parse(s);
      if ((Array.isArray(a) || (a = []), e === r.active()))
        try {
          const t = KIVO.__BS_SRV.operations.get("bassam_employees_v1");
          Array.isArray(t) && t.length > a.length && (a = t);
        } catch (t) {}
      n = a.filter((e) => (e.eid || e.name) === t.ekey)[0] || null;
    } catch (t) {
      n = null;
    }
    n
      ? Promise.resolve(a.activateStaff({ ekey: t.ekey, deptId: e, nid: n.nid, phone: n.phone, empno: n.empno, name: n.name })).then((t) =>
          i(t, "فُعّل حساب «" + (n.name || "المستخدم") + "»"),
        )
      : this.bsToast("لم يُعثر على سجل الموظف — أعد التفعيل من صفحة الموظفين");
  }
  _nodeRows(t, e, s, a) {
    if (!t || !t.railTree) return this._grpRows(t, e, s);
    const r = KIVO.BassamPerm || null,
      i = KIVO.BassamAuth || null,
      n = {};
    (s || []).forEach((t) => {
      t && t._rid && (n[t._rid] = t);
    });
    const o = (e && e.admGrpFlip) || {},
      p = {};
    try {
      (t.ancestorsOf(a) || []).forEach((t) => {
        p[t] = 1;
      });
    } catch (t) {}
    const l = [];
    let d = -1;
    return (
      t.railTree().forEach((s) => {
        if (d >= 0 && s.depth > d) return;
        d = -1;
        const c =
          !!s.kids &&
          (!!(e && e.trQ && String(e.trQ).trim()) ||
            ((t, e, k) => {
              const s = t || "_none";
              return "إدارة عامة" === k ? !!o[s] : !o[s];
            })(s.id, "none" === s.t, s.kind));
        if ((s.kids && !c && (d = s.depth), "dept" === s.t)) {
          const t = n[s.id];
          if (!t) return;
          return (
            (t.grpShow = !1),
            (t.grpEmpty = !1),
            (t.rowOn = !0),
            (t.depOn = s.depth > 0),
            (t.depStyle = "margin-right:" + 13 * s.depth + "px"),
            (t.grpDepth = s.depth),
            (t.trDepCls = "d" + Math.min(5, s.depth || 0)),
            (t.trSelCls = a === s.id ? "sel" : ""),
            (t.trSt = t.mgrLbl && 0 !== t.mgrLbl.indexOf("بلا") ? "g" : "0" === String(t.empCount || "0") ? "x" : "a"),
            (t.kidOn = !!s.kids),
            (t.kidOpen = c),
            (t.kidChev = "flex-shrink:0;opacity:.65;transition:transform .2s;" + (c ? "" : "transform:rotate(90deg)")),
            (t.kidTog = (t) => {
              (t && t.stopPropagation && t.stopPropagation(), this._grpFlip(s.id));
            }),
            Object.assign(t, this._trDragProps(s.id, e)),
            void l.push(t)
          );
        }
        l.push(this._nodeHead(t, e, s, c, r, i, a));
      }),
      this._trFilter(l, e && e.trQ)
    );
  }
  /* KIVO_265 · طلبُ المالك (2026-10-19): سحبُ صفوف الشجرة وإفلاتها — الثلثُ الأعلى من الصفّ «قبل» والأسفل «بعد» والوسط «تحت»
     (الإدارةُ ورقةٌ فلا «تحت» لها إلا للعقد الفوقية). الإفلاتُ ينادي BassamDepts.moveNode فتتبعه الشجرةُ هنا والقائمةُ الجانبية. */
  _trDragProps(id, e) {
    const ov = e && e.trOver;
    return {
      trDragCls: ((e && e.trDrag) === id ? "dragging" : "") + (ov && ov.id === id ? " dz-" + ov.pos : ""),
      trDragStart: (t) => {
        try {
          (t.dataTransfer.setData("text/plain", id), (t.dataTransfer.effectAllowed = "move"));
        } catch (t) {}
        t.stopPropagation && t.stopPropagation();
        this.setState({ trDrag: id, trOver: null });
      },
      trDragOver: (t) => {
        const s = this.state.trDrag;
        if (!s || s === id) return;
        t.preventDefault();
        t.stopPropagation && t.stopPropagation();
        const D = KIVO.BassamDepts,
          r = t.currentTarget.getBoundingClientRect(),
          y = t.clientY - r.top,
          h = r.height || 36,
          tg = D && D.nodeOf ? D.nodeOf(id) : null,
          leaf = !!(tg && tg.dept),
          pos = y < 0.3 * h ? "before" : y > 0.7 * h ? "after" : leaf ? (y < h / 2 ? "before" : "after") : "inside";
        try {
          t.dataTransfer.dropEffect = "move";
        } catch (t) {}
        const o = this.state.trOver;
        (o && o.id === id && o.pos === pos) || this.setState({ trOver: { id, pos } });
      },
      trDragLeave: (t) => {
        /* relatedTarget يكون null عند المرور بين أبناء الصفّ (فكان الوسطُ يفقد تظليلَه ولا يصل «تحت») — لا مسحَ إلا بخروجٍ مؤكَّد إلى خارج الصفّ */
        const o = this.state.trOver,
          r = t.relatedTarget;
        o && o.id === id && r && t.currentTarget && !t.currentTarget.contains(r) && this.setState({ trOver: null });
      },
      trDrop: (t) => {
        t.preventDefault();
        t.stopPropagation && t.stopPropagation();
        const s = this.state.trDrag,
          o = this.state.trOver;
        this.setState({ trDrag: null, trOver: null });
        s && o && o.id === id && this._trMove(s, id, o.pos);
      },
      trDragEnd: () => {
        (this.state.trDrag || this.state.trOver) && this.setState({ trDrag: null, trOver: null });
      },
    };
  }
  _trMove(s, id, pos) {
    const D = KIVO.BassamDepts,
      r = D && D.moveNode ? D.moveNode(s, id, pos) : { ok: !1, err: "غير متاح" };
    if (!r || !r.ok) return void this.bsToast((r && r.err) || "تعذّر النقل", "err");
    const f = { ...(this.state.admGrpFlip || {}) },
      pk = r.pid ? ((D.nodeOf(r.pid) || {}).kind || "") : "";
    r.pid && ("إدارة عامة" === pk ? (f[r.pid] = 1) : delete f[r.pid]);
    this.setState({ admGrpFlip: f, deptMsg: "✓ " + r.msg });
    this.bsToast(r.msg, "ok");   /* النوع «ok» يضيف العلامة بنفسه — كانت تتكرّر «✓ ✓» (فحصُ Test) */
  }
  _trFilter(t, e) {
    e = String(e || "").trim();
    if (!e) return t;
    const s = t.map((t) => KIVO.BassamFind.dig((t.grpIsNode ? t.grpName : t.name) || "").indexOf(KIVO.BassamFind.dig(e)) >= 0);
    for (let e = 0; e < t.length; e++) {
      if (!t[e].grpIsNode) continue;
      const a = t[e].grpDepth || 0;
      for (let r = e + 1; r < t.length; r++) {
        if ((t[r].grpDepth || 0) <= a) break;
        if (s[r]) {
          s[e] = !0;
          break;
        }
      }
    }
    return t.filter((t, e) => s[e]);
  }
  _trSetAll(t, e) {
    const a = {};
    ((t.railTree() || []).forEach((t) => {
      if (!t.kids) return;
      const g = "إدارة عامة" === t.kind;
      (e ? g : !g) && (a[t.id || "_none"] = 1);
    }),
      this.setState({ admGrpFlip: a }));
  }
  _grpFlip(t) {
    const e = t || "_none";
    this.setState((t) => {
      const s = { ...(t.admGrpFlip || {}) };
      return (s[e] ? delete s[e] : (s[e] = 1), { admGrpFlip: s });
    });
  }
  _nodeHead(t, e, s, a, r, i, n) {
    const o = { id: "__n" + s.id, grpIsNode: !0, grpShow: !0, rowOn: !1, grpEmpty: !1 },
      p = "none" === s.t,
      l = s.kids,
      d = (() => {
        try {
          return p ? l : (t.deptsUnder(s.id) || []).length;
        } catch (t) {
          return l;
        }
      })(),
      c = (() => {
        try {
          return !p && r ? r.rawCap(s.id).length : 0;
        } catch (t) {
          return 0;
        }
      })(),
      g = (e && e.admGrpEdit) === s.id && !p,
      h = (e && e.admGrpArm) === s.id && !p,
      m = !p && n === s.id;
    ((o.grpOpen = a),
      (o.grpDepth = s.depth),
      (o.grpNid = s.id),
      /* KIVO_265 · ملاحظةُ المالك (2026-10-19): كان القطاعُ شريطاً عريضاً ثابتاً (tr-sec) بلا إزاحة فبدا بمستوى الإدارة العليا؛
         صار صفَّ شجرةٍ عادياً بإزاحة مستواه (d1) كما تظهر الإداراتُ العامة تحته — شارةُ «قطاع» تبقى على الصفّ. */
      (o.trIsSector = !1),
      (o.trIsRow = !0),
      (o.trDepCls = "d" + Math.min(5, s.depth || 0)),
      (o.trSelCls = n === s.id ? "sel" : ""),
      (o.grpName = s.name),
      (o.grpCount = String(d)),
      (o.grpCountW = KIVO.BassamCount.word(d, "إدارة")),
      (o.grpKindOn = !p && !!s.kind),
      (o.grpKindLbl = s.kind || ""),
      (o.grpKindStyle =
        "flex-shrink:0;font-size:9px;font-weight:700;border-radius:6px;padding:2px 6px;white-space:nowrap;color:var(--fg-x94a3b8);background:var(--bg-xffffff);border:1px solid var(--bd-xe1e1e1)"),
      (o.grpStyle =
        "display:flex;align-items:center;gap:7px;padding:8px 10px;margin:6px 0 4px " +
        13 * s.depth +
        "px;border-radius:10px;cursor:pointer;user-select:none;font-family:'Cairo',sans-serif;font-size:11.5px;font-weight:800;" +
        (p
          ? "color:var(--fg-x94a3b8);background:transparent;border-right:3px solid var(--bd-xe1e1e1)"
          : m
            ? "color:var(--fg-x8a6f35);background:linear-gradient(90deg,var(--bg-a185151810p22),var(--bg-a185151810p06));border-right:3px solid var(--bd-x8a6f35)"
            : "color:var(--fg-x8a6f35);background:linear-gradient(90deg,var(--bg-a185151810p12),var(--bg-a185151810p03));border-right:3px solid var(--bd-xb99751)")),
      (o.grpCntStyle =
        "flex-shrink:0;font-size:9.5px;font-weight:700;border-radius:9999px;padding:2px 8px;font-feature-settings:'tnum';" +
        (p
          ? "color:var(--fg-x94a3b8);background:var(--bg-xffffff);border:1px solid var(--bd-xe1e1e1)"
          : "color:var(--fg-x8a6f35);background:var(--bg-xffffff);border:1px solid var(--bd-a185151810p45)")),
      (o.grpChevOn = !!l),
      (o.grpChev = "flex-shrink:0;opacity:.7;transition:transform .2s;" + (a ? "" : "transform:rotate(90deg)")),
      (o.grpCanEdit = !p),
      (o.grpToggle = (t) => {
        (t && t.stopPropagation && t.stopPropagation(), l ? this._grpFlip(s.id) : p || this.nodePick(s.id));
      }),
      (o.grpCapLbl = "سقف " + c),
      (o.grpCapTip = "سقف صفحات «" + s.name + "» — يتدفّق إلى كل ما تحتها"),
      (o.grpCapStyle =
        "flex-shrink:0;font-size:9px;font-weight:700;border-radius:6px;padding:2px 6px;cursor:pointer;white-space:nowrap;" +
        (c
          ? "color:var(--fg-x047857);background:var(--bg-a4120870p08);border:1px solid var(--bd-a4120870p3)"
          : "color:var(--fg-xc9702a);background:var(--bg-a201112420p08);border:1px solid var(--bd-a201112420p35)")),
      (o.grpCapGo = (t) => {
        (t && t.stopPropagation && t.stopPropagation(), this.nodePick(s.id));
      }),
      Object.assign(o, p ? {} : this._trDragProps(s.id, e)),
      (o.grpAddStyle =
        "width:22px;height:22px;border-radius:7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:11px;background:var(--bg-xffffff);color:var(--fg-x047857);border:1px dashed var(--bd-a4120870p45)"),
      (o.grpAddTip = "إضافة عقدة تحت «" + s.name + "»"),
      (o.grpAddGo = (t) => {
        t && t.stopPropagation && t.stopPropagation();
        const e = { ...(this.state.admGrpFlip || {}) };
        (delete e[s.id], this.setState({ admGrpFlip: e, ndOpen: !0, ndPid: s.id, ndName: "", ndKind: "", ndNewKind: "", ndMsg: "" }));
      }));
    const f = !p && i && i.groupManager ? i.groupManager(s.id) : null,
      u = (e && e.admGmArm) === s.id && !p;
    return (
      (o.grpMgrHas = !!f),
      (o.grpMgrNone = !p && !f),
      (o.grpMgrOpen = (t) => {
        (t && t.stopPropagation && t.stopPropagation(), this.gmOpen(s.id));
      }),
      (o.grpMgrTip = f ? "مدير «" + s.name + "»: " + f.name + " — اضغط لتعديل بياناته" : "تعيين مدير لـ«" + s.name + "»"),
      (o.grpMgrBtnStyle =
        "width:22px;height:22px;border-radius:7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:11px;background:var(--bg-xffffff);color:var(--fg-x8a6f35);border:1px dashed var(--bd-a185151810p5)"),
      (o.grpMgrLbl = f ? "★ " + f.name + (f.dis ? " · مجمّد" : "") : ""),
      (o.grpMgrName = f ? f.name + (f.dis ? " · موقوف" : "") : ""),
      (o.grpMgrLblStyle =
        "flex-shrink:1;min-width:0;max-width:180px;font-size:9.5px;font-weight:700;border-radius:9999px;padding:2px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;" +
        (f && f.dis
          ? "color:var(--fg-x94a3b8);background:var(--bg-xf5f6f8);border:1px solid var(--bd-xe1e1e1)"
          : "color:var(--fg-x8a6f35);background:var(--bg-xffffff);border:1px solid var(--bd-a185151810p4)")),
      (o.grpPermTip = f ? "صلاحيات «" + f.name + "» — لكل إدارة على حدة" : ""),
      (o.grpPermOpen = (e) => {
        if ((e && e.stopPropagation && e.stopPropagation(), !f)) return;
        const a = (t.deptsUnder(s.id) || [])[0] || "";
        this.setState({ upUid: f.id, upGmDept: a, upDraft: null, upLensDraft: null, upFor: "", upExp: {}, up24Draft: null, up24Exp: {}, up24Leaf: {} });
      }),
      (o.grpDisTip = f ? (f.dis ? "إعادة تفعيل حساب المدير" : "إيقاف حساب المدير مؤقتاً (يمنع الدخول بلا حذف)") : ""),
      (o.grpDisStyle =
        "width:22px;height:22px;border-radius:7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:11px;background:var(--bg-xffffff);border:1px solid " +
        (f && f.dis ? "rgba(4,120,87,.4);color:var(--fg-x047857)" : "rgba(201,112,42,.4);color:var(--fg-xc9702a)")),
      (o.grpDisGo = (t) => {
        if ((t && t.stopPropagation && t.stopPropagation(), !f || !i.setGroupManagerDis)) return;
        const e = i.setGroupManagerDis(s.id, !f.dis);
        e && e.ok
          ? (this.setState({ tick: (this.state.tick || 0) + 1 }), this.bsAck(f.dis ? "أُعيد تفعيل حساب المدير" : "أُوقف حساب المدير", "ok"))
          : this.bsToast((e && e.err) || "تعذّر");
      }),
      (o.grpGmArm = u),
      (o.grpGmDelTip = u ? "اضغط مرة أخرى لحذف حساب «" + (f ? f.name : "") + "» وصلاحياته" : "حذف حساب مدير العقدة"),
      (o.grpGmDelStyle =
        "width:22px;height:22px;border-radius:7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:11px;" +
        (u
          ? "background:var(--bg-xb91c1c);color:var(--fg-xffffff);border:1px solid var(--bd-xb91c1c)"
          : "background:var(--bg-xffffff);color:var(--fg-xb91c1c);border:1px solid var(--bd-a18528280p35)")),
      (o.grpGmDel = (t) => {
        if ((t && t.stopPropagation && t.stopPropagation(), !f)) return;
        if (!u)
          return (
            this.setState({ admGmArm: s.id }),
            clearTimeout(this._gmArmT),
            void (this._gmArmT = setTimeout(() => this.setState({ admGmArm: null }), 3500))
          );
        this.setState({ admGmArm: null });
        const e = i.removeGroupManager(s.id);
        e && e.ok
          ? (this.setState({ tick: (this.state.tick || 0) + 1, upUid: this.state.upUid === f.id ? "" : this.state.upUid }),
            this.bsAck("حُذف حساب مدير العقدة", "ok"))
          : this.bsToast((e && e.err) || "تعذّر الحذف");
      }),
      (o.grpEdit = g),
      (o.grpNotEdit = !g),
      (o.grpDraft = e && void 0 !== e.admGrpName ? e.admGrpName : s.name),
      (o.grpStop = (t) => {
        t && t.stopPropagation && t.stopPropagation();
      }),
      (o.grpOnName = (t) => this.setState({ admGrpName: t.target.value })),
      (o.grpStartEdit = (t) => {
        (t && t.stopPropagation && t.stopPropagation(), this.setState({ admGrpEdit: s.id, admGrpName: s.name, admGrpArm: null }));
      }),
      (o.grpSaveName = (e) => {
        e && e.stopPropagation && e.stopPropagation();
        const a = ((e && e.target && e.target.value) || "").trim();
        if ((this.setState({ admGrpEdit: null, admGrpName: void 0 }), !a || a === s.name)) return;
        if (t.nodes().some((t) => t.id !== s.id && t.name === a)) return void this.bsToast("توجد عقدة بهذا الاسم");
        const r = t.nodeSave(s.id, { name: a });
        r && r.ok ? this.setState({ deptMsg: "✓ تم تحديث الاسم" }) : this.bsToast((r && r.err) || "تعذّر");
      }),
      (o.grpEditStyle =
        "width:22px;height:22px;border-radius:7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:11px;background:var(--bg-xffffff);color:var(--fg-x8a6f35);border:1px dashed var(--bd-a185151810p5)"),
      (o.grpArm = h),
      (o.grpDelTip = l
        ? "«" + s.name + "» تحتها " + l + " — انقلهم أولاً ثم احذفها"
        : h
          ? "اضغط مرة أخرى لحذف «" + s.name + "»"
          : "حذف «" + s.name + "» — تصنيفٌ فقط، ولا تُمسّ بيانات"),
      (o.grpDelStyle =
        "width:22px;height:22px;border-radius:7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:11px;transition:.15s;" +
        (l
          ? "background:var(--bg-xf5f6f8);color:var(--fg-xcbd5e1);border:1px dashed var(--bd-xe1e1e1)"
          : h
            ? "background:var(--bg-xdc2626);color:var(--fg-xffffff);border:1px solid var(--bd-xdc2626)"
            : "background:var(--bg-xffffff);color:var(--fg-xb91c1c);border:1px dashed var(--bd-a18528280p5)")),
      (o.grpDel = (e) => {
        if ((e && e.stopPropagation && e.stopPropagation(), l)) return void this.bsToast("لها " + l + " تحتها — انقلهم أولاً ثم احذفها");
        if (!h) {
          const t = Date.now();
          return (
            this.setState({ admGrpArm: s.id, admGrpArmTs: t, deptMsg: "حذف «" + s.name + "» — اضغط مرة أخرى للتأكيد" }),
            void setTimeout(() => {
              this.state.admGrpArmTs === t && this.setState({ admGrpArm: null, deptMsg: "" });
            }, 4e3)
          );
        }
        this.setState({ admGrpArm: null });
        const a = t.nodeDel(s.id);
        a && a.ok
          ? this.setState({ deptMsg: "✓ حُذفت العقدة", sysSel: this.state.sysSel === s.id ? "" : this.state.sysSel })
          : this.bsToast((a && a.err) || "تعذّر الحذف");
      }),
      o
    );
  }
  _parentOpts(t, e) {
    if (!t || !t.railTree) return [];
    const s = [];
    return (
      t.railTree().forEach((a) => {
        "none" !== a.t &&
          ((e && a.id === e) ||
            (e && !t.canParent(e, a.id)) ||
            s.push({ id: a.id, name: (a.depth ? "···".repeat(a.depth) + " " : "") + a.name + (a.kind ? "  ⟨" + a.kind + "⟩" : "") }));
      }),
      s
    );
  }
  nodePick(t) {
    const go = () => {
      const e = this._loadDraft(t);
      this.setState({
        sysSel: t,
        sysTab: "cap",
        dhMenu: !1,
        capDraft: e,
        capBase: JSON.parse(JSON.stringify(e)),
        capOpenRows: {},
        empQ: "",
      });
    };
    this._dirty()
      ? KIVO
          .bsConfirm({
            title: "تغييرات غير محفوظة",
            msg: "لديك تغييرات غير محفوظة في السقف الحالي — الانتقال سيتجاهلها.",
            ok: "متابعة بلا حفظ",
            danger: !0,
          })
          .then((y) => {
            y && go();
          })
      : go();
  }
  _grpRows(t, e, s) {
    if (!t || !t.tree) return s || [];
    const a = (e && e.admGrpFlip) || {},
      r = [];
    let i = 0;
    return (
      t.tree().forEach((n) => {
        const o = n.gid || "_none",
          p = n.gid ? !!a[o] : !a[o],
          l = (s, a, r) => {
            ((s.grpShow = a),
              (s.grpOpen = p),
              (s.grpEmpty = !!r),
              (s.rowOn = p && !r),
              (s.grpName = n.name),
              (s.grpCount = String(n.depts.length)),
              (s.grpCountW = KIVO.BassamCount.word(n.depts.length, "إدارة")),
              (s.grpStyle =
                "display:flex;align-items:center;gap:7px;padding:8px 10px;margin:6px 0 4px;border-radius:10px;cursor:pointer;user-select:none;font-family:'Cairo',sans-serif;font-size:11.5px;font-weight:800;" +
                (n.gid
                  ? "color:var(--fg-x8a6f35);background:linear-gradient(90deg,var(--bg-a185151810p12),var(--bg-a185151810p03));border-right:3px solid var(--bd-xb99751)"
                  : "color:var(--fg-x94a3b8);background:transparent;border-right:3px solid var(--bd-xe1e1e1)")),
              (s.grpCntStyle =
                "flex-shrink:0;font-size:9.5px;font-weight:700;border-radius:9999px;padding:2px 8px;font-feature-settings:'tnum';" +
                (n.gid
                  ? "color:var(--fg-x8a6f35);background:var(--bg-xffffff);border:1px solid var(--bd-a185151810p45)"
                  : "color:var(--fg-x94a3b8);background:var(--bg-xffffff);border:1px solid var(--bd-xe1e1e1)")),
              (s.grpChev = "flex-shrink:0;opacity:.7;transition:transform .2s;" + (p ? "" : "transform:rotate(90deg)")));
            const i = (e && e.admGrpEdit) === n.gid && !!n.gid,
              l = (e && e.admGrpArm) === n.gid && !!n.gid;
            s.grpCanEdit = !!n.gid;
            const d = KIVO.BassamAuth || null,
              c = n.gid && d && d.groupManager ? d.groupManager(n.gid) : null,
              g = (e && e.admGmArm) === n.gid && !!n.gid;
            return (
              (s.grpMgrHas = !!c),
              (s.grpMgrNone = !c),
              (s.grpMgrOpen = (t) => {
                (t && t.stopPropagation && t.stopPropagation(), this.gmOpen(n.gid));
              }),
              (s.grpMgrTip = c
                ? "مدير " + this._gmKind(n.gid) + ": " + c.name + " — اضغط لتعديل بياناته"
                : "تعيين مدير " + this._gmFor(n.gid)),
              (s.grpMgrBtnStyle =
                "width:22px;height:22px;border-radius:7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:11px;background:var(--bg-xffffff);color:var(--fg-x8a6f35);border:1px dashed var(--bd-a185151810p5)"),
              (s.grpMgrLbl = c ? "★ " + c.name + (c.dis ? " · مجمّد" : "") : ""),
              (s.grpMgrLblStyle =
                "flex-shrink:1;min-width:0;max-width:180px;font-size:9.5px;font-weight:700;border-radius:9999px;padding:2px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;" +
                (c && c.dis
                  ? "color:var(--fg-x94a3b8);background:var(--bg-xf5f6f8);border:1px solid var(--bd-xe1e1e1)"
                  : "color:var(--fg-x8a6f35);background:var(--bg-xffffff);border:1px solid var(--bd-a185151810p4)")),
              (s.grpPermTip = c ? "صلاحيات «" + c.name + "» — لكل إدارة على حدة" : ""),
              (s.grpPermOpen = (t) => {
                if ((t && t.stopPropagation && t.stopPropagation(), !c)) return;
                const e = (n.depts[0] || {}).id || "";
                this.setState({ upUid: c.id, upGmDept: e, upDraft: null, upLensDraft: null, upFor: "", upExp: {}, up24Draft: null, up24Exp: {}, up24Leaf: {} });
              }),
              (s.grpDisTip = c ? (c.dis ? "إعادة تفعيل حساب المدير" : "إيقاف حساب المدير مؤقتاً (يمنع الدخول بلا حذف)") : ""),
              (s.grpDisStyle =
                "width:22px;height:22px;border-radius:7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:11px;background:var(--bg-xffffff);border:1px solid " +
                (c && c.dis ? "rgba(4,120,87,.4);color:var(--fg-x047857)" : "rgba(201,112,42,.4);color:var(--fg-xc9702a)")),
              (s.grpDisGo = (t) => {
                if ((t && t.stopPropagation && t.stopPropagation(), !c || !d.setGroupManagerDis)) return;
                const e = d.setGroupManagerDis(n.gid, !c.dis);
                e && e.ok
                  ? (this.setState({ tick: (this.state.tick || 0) + 1 }),
                    this.bsAck(c.dis ? "أُعيد تفعيل حساب المدير" : "أُوقف حساب المدير", "ok"))
                  : this.bsToast((e && e.err) || "تعذّر");
              }),
              (s.grpGmArm = g),
              (s.grpGmDelTip = g
                ? "اضغط مرة أخرى لحذف حساب «" + (c ? c.name : "") + "» وصلاحياته"
                : "حذف حساب مدير " + this._gmKind(n.gid)),
              (s.grpGmDelStyle =
                "width:22px;height:22px;border-radius:7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:11px;" +
                (g
                  ? "background:var(--bg-xb91c1c);color:var(--fg-xffffff);border:1px solid var(--bd-xb91c1c)"
                  : "background:var(--bg-xffffff);color:var(--fg-xb91c1c);border:1px solid var(--bd-a18528280p35)")),
              (s.grpGmDel = (t) => {
                if ((t && t.stopPropagation && t.stopPropagation(), !c)) return;
                if (!g)
                  return (
                    this.setState({ admGmArm: n.gid }),
                    clearTimeout(this._gmArmT),
                    void (this._gmArmT = setTimeout(() => this.setState({ admGmArm: null }), 3500))
                  );
                this.setState({ admGmArm: null });
                const e = d.removeGroupManager(n.gid);
                e && e.ok
                  ? (this.setState({ tick: (this.state.tick || 0) + 1, upUid: this.state.upUid === c.id ? "" : this.state.upUid }),
                    this.bsAck("حُذف حساب مدير " + this._gmKind(n.gid), "ok"))
                  : this.bsToast((e && e.err) || "تعذّر الحذف");
              }),
              (s.grpEdit = i),
              (s.grpNotEdit = !i),
              (s.grpDraft = e && void 0 !== e.admGrpName ? e.admGrpName : n.name),
              (s.grpStop = (t) => {
                t && t.stopPropagation && t.stopPropagation();
              }),
              (s.grpOnName = (t) => this.setState({ admGrpName: t.target.value })),
              (s.grpStartEdit = (t) => {
                (t && t.stopPropagation && t.stopPropagation(), this.setState({ admGrpEdit: n.gid, admGrpName: n.name, admGrpArm: null }));
              }),
              (s.grpSaveName = (e) => {
                e && e.stopPropagation && e.stopPropagation();
                const s = ((e && e.target && e.target.value) || "").trim();
                (this.setState({ admGrpEdit: null, admGrpName: void 0 }),
                  s &&
                    s !== n.name &&
                    (t.groups().some((t) => t.id !== n.gid && t.name === s)
                      ? this.bsToast("توجد إدارة عامة بهذا الاسم")
                      : (t.saveGroups(t.groups().map((t) => (t.id === n.gid ? { ...t, name: s } : t))),
                        this.setState({ deptMsg: "✓ تم تحديث اسم الإدارة العامة" }))));
              }),
              (s.grpEditStyle =
                "width:22px;height:22px;border-radius:7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:11px;background:var(--bg-xffffff);color:var(--fg-x8a6f35);border:1px dashed var(--bd-a185151810p5)"),
              (s.grpArm = l),
              (s.grpDelTip = l
                ? "اضغط مرة أخرى لحذف «" + n.name + "» — تعود إداراتها بلا تصنيف وتبقى بياناتها كما هي"
                : "حذف الإدارة العامة «" + n.name + "» — تصنيفٌ فقط، ولا تُمسّ بيانات إداراتها"),
              (s.grpDelStyle =
                "width:22px;height:22px;border-radius:7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:11px;transition:.15s;" +
                (l
                  ? "background:var(--bg-xdc2626);color:var(--fg-xffffff);border:1px solid var(--bd-xdc2626)"
                  : "background:var(--bg-xffffff);color:var(--fg-xb91c1c);border:1px dashed var(--bd-a18528280p5)")),
              (s.grpDel = (e) => {
                if ((e && e.stopPropagation && e.stopPropagation(), !l)) {
                  const t = Date.now();
                  return (
                    this.setState({
                      admGrpArm: n.gid,
                      admGrpArmTs: t,
                      deptMsg:
                        "حذف «" +
                        n.name +
                        "» يرفع التصنيف عن " +
                        KIVO.BassamCount(n.depts.length, "إدارة", "g") +
                        " — ولا يمسّ " +
                        KIVO.BassamCount.agr(n.depts.length, "بياناتها", "بياناتهما", "بياناتها") +
                        ". اضغط مرة أخرى للتأكيد",
                    }),
                    void setTimeout(() => {
                      this.state.admGrpArmTs === t && this.setState({ admGrpArm: null, deptMsg: "" });
                    }, 4e3)
                  );
                }
                (this.setState({ admGrpArm: null }),
                  t.saveGroups(t.groups().filter((t) => t.id !== n.gid)),
                  t.save(
                    t.list().map((t) => {
                      if (t.gid !== n.gid) return t;
                      const e = { ...t };
                      return (delete e.gid, e);
                    }),
                  ),
                  this.setState({ deptMsg: "✓ حُذفت الإدارة العامة — عادت إداراتها بلا تصنيف" }));
              }),
              (s.grpToggle = (t) => {
                (t && t.stopPropagation && t.stopPropagation(),
                  this.setState((t) => {
                    const e = { ...(t.admGrpFlip || {}) };
                    return (e[o] ? delete e[o] : (e[o] = 1), { admGrpFlip: e });
                  }));
              }),
              s
            );
          };
        n.depts.length
          ? n.depts.forEach((t, e) => {
              const a = s[i++];
              a && r.push(l(a, 0 === e, !1));
            })
          : r.push(l({}, !0, !0));
      }),
      r
    );
  }
  async deptDel(target) {
    if (!target || !target.id || this._deptDeleteBusy || this._wpBusy || this._wpUncertain) return;
    const actor = this._wpActor(); if (!actor) return this.bsToast("حذف الإدارة يتطلب جلسة مدير النظام الحالية", "warn");
    const pending = this._deptDeleteDraft;
    if (pending && pending.uncertain && pending.dept !== target.id) return this.bsToast("لم يُحسم طلب الحذف السابق؛ أعد محاولته نفسه قبل اختيار إدارة أخرى", "warn");
    if (pending && pending.dept === target.id && pending.actor === actor && pending.confirmed && !pending.needsReview) return this._deptDelGo(target);
    let execute = false;
    this._deptDeleteBusy = true; this.setState({ deptMsg: "جارٍ جرد بيانات الإدارة وحساباتها على الخادم…" });
    try {
      const result = await this._wpCall(target.id, null, actor, "delete");
      if (!result.ok) { this.bsToast("تعذر جرد الإدارة أو رفض الخادم حذفها؛ لم تُنفّذ أي كتابة", "warn"); return; }
      const data = result.body, base = data.base, natural = value => Number.isSafeInteger(value) && value >= 0,
        globalKeys = ["bassam_depts_v1", "bassam_auth_users_v1", "bassam_perms_v1"];
      if (data.kind !== "delete" || data.dept !== target.id || !data.department || data.department.id !== target.id || typeof data.department.name !== "string" || !base || !natural(base.epoch) || !natural(base.custody) || !base.kv || typeof base.kv !== "object" || Array.isArray(base.kv) || globalKeys.some(key => !natural(base.kv[key])) || Object.entries(base.kv).some(([key, value]) => (!key.startsWith("bsdept:" + target.id + ":") && !globalKeys.includes(key)) || !natural(value)) || !this._businessBaseValid(base) || !base.notifications || ["rev", "configRev", "broadcastRev"].some(key => !natural(base.notifications[key])) || !data.counts || ["keys", "accounts", "custody", "notifications", "irshad", "seized", "awards"].some(key => !natural(data.counts[key]))) {
        this.bsToast("وصل جرد ناقص من الخادم؛ لم يُسمح بحذف الإدارة", "warn"); return;
      }
      const draft = { dept: target.id, actor, data: JSON.parse(JSON.stringify(data)), ticket: null, uncertain: false, needsReview: false, confirmed: false };
      this._deptDeleteDraft = draft;
      const counts = data.counts, populated = counts.keys + counts.accounts + counts.custody + counts.notifications + counts.irshad + counts.seized + counts.awards > 0,
        name = data.department.name;
      if (populated) {
        const accepted = await KIVO.bsConfirm({ title: "حذف إدارة «" + name + "»", msg: "جرد الخادم: " + counts.keys + " مورد بيانات، " + counts.accounts + " حساب إدارة/موظف، " + counts.custody + " سجل عهدة، " + counts.notifications + " تنبيه، " + counts.irshad + " سجل استرشاد، "+counts.seized+" من بيانات المضبوطات، "+counts.awards+" من بيانات التكريم. سيُحذف تعريف الإدارة وحساباتها وبياناتها ومراجع صورها نهائياً. حسابات مدير المنصة والإدارات العامة والإدارات الأخرى محفوظة. صدّر نسخة احتياطية قبل الحذف إن احتجتها.", ok: "احذف الإدارة وكل بياناتها", danger: true, typed: name });
        if (!accepted || this._deptDeleteDraft !== draft || this._wpActor() !== actor) return;
        draft.confirmed = true; execute = true;
      } else {
        const armed = this.state.admArm;
        if (armed && armed.t === "dept" && armed.id === target.id) { draft.confirmed = true; execute = true; }
        else {
          const stamp = Date.now(); this.setState({ admArm: { t: "dept", id: target.id, ts: stamp } });
          this.bsToast("الإدارة خالية وفق الجرد الحالي؛ اضغط الحذف مرة أخرى لتأكيد إزالة تعريف «" + name + "»", "warn");
          setTimeout(() => { const current = this.state.admArm; if (current && current.ts === stamp) this.setState({ admArm: null }); }, 4000);
        }
      }
    } finally { this._deptDeleteBusy = false; }
    if (execute) return this._deptDelGo(target);
  }
  async _deptDelGo(target) {
    const draft = this._deptDeleteDraft, actor = this._wpActor();
    if (this._deptDeleteBusy || !draft || draft.dept !== target.id || !draft.confirmed || draft.needsReview || draft.actor !== actor) return;
    if (!draft.ticket) {
      if (!window.crypto || !window.crypto.getRandomValues) return this.bsToast("تعذّر إعداد طلب حذف موثوق", "warn");
      const random = new Uint8Array(20); window.crypto.getRandomValues(random);
      draft.ticket = { uid: actor, dept: draft.dept, base: JSON.parse(JSON.stringify(draft.data.base)), requestId: "deptdel-" + Array.from(random, value => value.toString(16).padStart(2, "0")).join("") };
    }
    this._deptDeleteBusy = true;
    try {
      let result = await this._wpCall(draft.dept, draft.ticket, actor, "delete");
      const srv = KIVO.__BS_SRV;
      if (!result.ok && result.err === "reason" && srv && typeof srv.askReason === "function") {
        const reason = await new Promise(resolve => srv.askReason(result.reasonKey, result.reasonKeys, resolve));
        if (this._wpActor() !== actor || this._deptDeleteDraft !== draft) return;
        if (typeof reason !== "string" || !reason.trim()) return this.bsToast("أُلغي إدخال السبب؛ تأكيد الحذف محفوظ ولم يُعتمد تغيير", "warn");
        const random = new Uint8Array(20); window.crypto.getRandomValues(random);
        draft.ticket = { ...draft.ticket, requestId: "deptdel-" + Array.from(random, value => value.toString(16).padStart(2, "0")).join(""), reason: reason.trim() };
        result = await this._wpCall(draft.dept, draft.ticket, actor, "delete");
      }
      if (!result.ok) {
        draft.uncertain = ["network", "receipt", "server", "session"].includes(result.err); draft.needsReview = result.err === "conflict";
        return this.bsToast(draft.needsReview ? "تغيّرت بيانات الإدارة؛ اضغط الحذف مجدداً لمراجعة جرد جديد وتأكيده. لم يُنفّذ الطلب بهذه النسخة." : result.err === "reason" ? "يشترط الخادم سبباً؛ تأكيد الحذف محفوظ" : result.err === "permission" ? "صلاحيتك لا تسمح بحذف الإدارة؛ لم يُعتمد تغيير" : "لم يصل تأكيد الحذف؛ أعد محاولة الطلب نفسه، لم يُعرض نجاح", "warn");
      }
      const receipt = result.body, natural = value => Number.isSafeInteger(value) && value >= 0;
      if (receipt.mode !== "dept-delete" || receipt.dept !== draft.dept || receipt.requestId !== draft.ticket.requestId || !natural(receipt.rev) || !receipt.revs || typeof receipt.revs !== "object" || Array.isArray(receipt.revs) || Object.values(receipt.revs).some(value => !natural(value)) || !receipt.counts || ["keys", "accounts", "custody", "notifications", "irshad", "seized", "awards"].some(key => !natural(receipt.counts[key]))) {
        draft.uncertain = true; return this.bsToast("وصل تأكيد حذف ناقص؛ أعد محاولة الطلب نفسه قبل أي عملية أخرى", "warn");
      }
      if (this._wpActor() !== actor || this._deptDeleteDraft !== draft) return;
      this._deptDeleteDraft = null;
      this.setState({ admArm: null, ...(this.state.sysSel === draft.dept ? { sysSel: "" } : {}), deptMsg: "حذف الخادم إدارة «" + draft.data.department.name + "» وحساباتها وبياناتها", tick: (this.state.tick || 0) + 1 });
      this.bsAck("اعتمد الخادم حذف إدارة «" + draft.data.department.name + "» وحساباتها وبياناتها", "ok");
      try { if (srv && srv.resync) srv.resync(false); } catch (_) {}
    } finally { this._deptDeleteBusy = false; }
  }

  _wpActor() {
    const auth = KIVO.BassamAuth, user = auth && auth.user && auth.user(), boot = window.__BS_BOOT || {};
    return user && user.role === "super" && auth.isSuper() && boot.srv === 1 && boot.cf === 1 && String(boot.uid || "") === String(user.id) ? String(user.id) : null;
  }
  _irBackupCapture(keys) {
    const actor = this._wpActor(), srv = KIVO.__BS_SRV, v = window.__BS_BOOT?.v;
    if (!actor || !srv || srv.dirty() || srv.inflight() || srv.sesChanged() || !Number.isSafeInteger(v) || v < 0) throw new Error("حدّث البيانات وانتظر اكتمال الحفظ ثم أعد التصدير");
    return { actor, v, revs: Object.fromEntries(keys.map(k => [k, srv.rev(k)])) };
  }
  async _irBackupFence(snapshot, irshad = false) {
    const srv = KIVO.__BS_SRV;
    const same = () => this._wpActor() === snapshot.actor && window.__BS_BOOT?.v === snapshot.v && !srv.dirty() && !srv.inflight() && !srv.sesChanged() && Object.entries(snapshot.revs).every(([k, rev]) => srv.rev(k) === rev);
    if (!same()) throw new Error("تغيّرت البيانات؛ حدّثها ثم أعد التصدير");
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch((irshad ? "/api/irshad/export?uid=" : "/api/get?keys=&uid=") + encodeURIComponent(snapshot.actor), { credentials: "same-origin", cache: "no-store", signal: controller.signal });
      const value = await response.json();
      if (!response.ok || value?.ok !== 1 || value[irshad ? "globalRev" : "v"] !== snapshot.v || !same()) throw new Error("حدّث البيانات من الخادم ثم أعد التصدير؛ لم تُنشأ نسخة جزئية");
      return value;
    } finally { clearTimeout(timer); }
  }
  _businessBaseValid(base) {
    const spec={irshad:['reports','languages','locations','retro'],seized:['reports','catalog','actions','locations','jew','retro'],awards:['records','docsV1','docsV2']};
    return base&&Object.entries(spec).every(([domain,names])=>base[domain]&&names.every(name=>Number.isSafeInteger(base[domain][name])&&base[domain][name]>=0));
  }
  async _wpCall(dept, body, actor, kind) {
    if (!actor || this._wpActor() !== actor) return { ok: 0, err: "session" };
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch((kind === "delete" ? "/api/admin/dept-delete" : "/api/admin/dept-wipe") + (body ? "" : "?" + new URLSearchParams({ dept })), { method: body ? "POST" : "GET", credentials: "same-origin", cache: "no-store", signal: controller.signal, ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
      if (this._wpActor() !== actor) return { ok: 0, err: "session" };
      let result; try { result = await response.json(); } catch (_) { return { ok: 0, err: "receipt" }; }
      if (this._wpActor() !== actor) return { ok: 0, err: "session" };
      if (!response.ok || !result || result.ok !== 1) {
        const denied = Object.entries(result && result.denied || {}), reasonOnly = denied.length && denied.every(([, value]) => value && value.why === "reason");
        if (response.status === 403 && result && (result.why === "reason" || reasonOnly)) return { ok: 0, err: "reason", reasonKey: denied.length ? denied[0][0] : "bsdept:" + dept + ":bassam_employees_v1", reasonKeys: [...new Set([...(Array.isArray(result.reasonKeys) ? result.reasonKeys : []), ...denied.flatMap(([, value]) => Array.isArray(value.reasonKeys) ? value.reasonKeys : [])].filter(key => typeof key === "string"))] };
        return { ok: 0, err: response.status === 409 ? "conflict" : response.status === 401 ? "session" : response.status === 403 ? "permission" : "server" };
      }
      return { ok: 1, body: result };
    } catch (_) { return { ok: 0, err: "network" }; }
    finally { clearTimeout(timer); }
  }
  async wpOpen(dept) {
    if (this._wpBusy || this._wpUncertain) return void this.setState({ wpMsg: "لم يُحسم الطلب السابق؛ أعد محاولته نفسه قبل تغيير الإدارة" });
    this._wpTicket = null;
    this.setState({ wpDid: dept, wpTxt: "", wpBase: null, wpCounts: null, wpNeedsReview: false, wpBusy: false, wpMsg: "جارٍ جرد بيانات الإدارة على الخادم…", sysSel: dept });
    return this.wpReview(dept);
  }
  async wpReview(dept) {
    if (this._wpBusy || this._wpUncertain) return;
    const actor = this._wpActor(), generation = this._wpGeneration = (this._wpGeneration || 0) + 1;
    if (!actor) return void this.setState({ wpMsg: "صلاحية غير كافية أو جلسة متغيرة — أعد تسجيل الدخول" });
    const result = await this._wpCall(dept, null, actor);
    if (generation !== this._wpGeneration || this.state.wpDid !== dept || this._wpActor() !== actor) return;
    if (!result.ok) return void this.setState({ wpNeedsReview: true, wpMsg: "تعذّر جرد الإدارة من الخادم؛ لم تُنفّذ أي كتابة" });
    const body = result.body, base = body.base, natural = value => Number.isSafeInteger(value) && value >= 0;
    if (body.dept !== dept || !base || !natural(base.epoch) || !natural(base.custody) || !base.kv || typeof base.kv !== "object" || Array.isArray(base.kv) || Object.entries(base.kv).some(([key, value]) => !key.startsWith("bsdept:" + dept + ":") || !natural(value)) || !this._businessBaseValid(base) || !base.notifications || ["rev", "configRev", "broadcastRev"].some(key => !natural(base.notifications[key])) || !body.counts || !natural(body.counts.keys) || !natural(body.counts.custody) || !natural(body.counts.notifications) || !natural(body.counts.irshad) || !natural(body.counts.seized) || !natural(body.counts.awards))
      return void this.setState({ wpNeedsReview: true, wpMsg: "وصل جرد ناقص من الخادم؛ لم يُسمح بالمسح" });
    this._wpTicket = null;
    this.setState({ wpBase: JSON.parse(JSON.stringify(base)), wpBaseActor: actor, wpCounts: JSON.parse(JSON.stringify(body.counts)), wpNeedsReview: false, wpMsg: "جرد خادمي: " + body.counts.keys + " مورد، " + body.counts.custody + " سجل عهدة" + (natural(body.counts.notifications) ? "، " + body.counts.notifications + " تنبيه" : "") + "، " + body.counts.irshad + " سجل استرشاد، "+body.counts.seized+" من بيانات المضبوطات، "+body.counts.awards+" من بيانات التكريم. راجع القائمة قبل تأكيد المسح." });
  }
  async wpGo(dept) {
    if (this._wpBusy) return;
    const actor = this._wpActor(), base = this.state.wpBase;
    if (!actor || this.state.wpBaseActor !== actor) return void this.setState({ wpMsg: "تغيّرت الجلسة — أعد فتح نافذة المسح" });
    if (this.state.wpDid !== dept || !base || this.state.wpNeedsReview) return void this.setState({ wpNeedsReview: true, wpMsg: "راجع جرد الخادم قبل تأكيد المسح؛ لم تُنفّذ أي كتابة" });
    if (!this._wpTicket || this._wpTicket.dept !== dept || this._wpTicket.base !== base) {
      if (!window.crypto || !window.crypto.getRandomValues) return void this.setState({ wpMsg: "تعذّر إنشاء طلب موثوق — أعد تحميل الصفحة" });
      const random = new Uint8Array(20); window.crypto.getRandomValues(random);
      const requestId = "wipe-" + Array.from(random, value => value.toString(16).padStart(2, "0")).join("");
      this._wpTicket = { dept, base, body: { uid: actor, dept, requestId, base: JSON.parse(JSON.stringify(base)) } };
    }
    let ticket = this._wpTicket;
    this._wpBusy = true; this.setState({ wpBusy: true, wpMsg: "جارٍ انتظار تأكيد مسح الإدارة من الخادم…" });
    try {
      let result = await this._wpCall(dept, ticket.body, actor);
      const srv = KIVO.__BS_SRV;
      if (!result.ok && result.err === "reason" && srv && typeof srv.askReason === "function") {
        const reason = await new Promise(resolve => srv.askReason(result.reasonKey, result.reasonKeys, resolve));
        if (this._wpActor() !== actor || this.state.wpDid !== dept) return;
        if (typeof reason !== "string" || !reason.trim()) return void this.setState({ wpMsg: "أُلغي إدخال السبب؛ تأكيد المسح محفوظ ولم يُعتمد تغيير" });
        const random = new Uint8Array(20); window.crypto.getRandomValues(random);
        ticket = { ...ticket, body: { ...ticket.body, requestId: "wipe-" + Array.from(random, value => value.toString(16).padStart(2, "0")).join(""), reason: reason.trim() } };
        this._wpTicket = ticket; result = await this._wpCall(dept, ticket.body, actor);
      }
      if (!result.ok) {
        this._wpUncertain = ["network", "receipt", "server", "session"].includes(result.err);
        return void this.setState({ wpNeedsReview: result.err === "conflict", wpMsg: result.err === "conflict" ? "تغيّرت بيانات الإدارة؛ لم يُنفّذ طلب المسح بهذه النسخة. أعد مراجعة الجرد قبل التأكيد." : result.err === "reason" ? "يشترط الخادم سبباً لهذا الإجراء؛ تأكيد المسح محفوظ" : result.err === "permission" ? "صلاحيتك لا تشمل مسح الإدارة" : "لم يصل تأكيد المسح؛ محفوظ طلبك لإعادة المحاولة نفسها دون ادعاء نجاح" });
      }
      const receipt = result.body;
      if (receipt.dept !== dept || receipt.requestId !== ticket.body.requestId || !Number.isSafeInteger(receipt.rev) || receipt.rev < 0 || !receipt.counts || ["keys", "custody", "notifications", "irshad", "seized", "awards"].some(key => !Number.isSafeInteger(receipt.counts[key]) || receipt.counts[key] < 0))
        { this._wpUncertain = true; return void this.setState({ wpMsg: "تأكيد الخادم ناقص؛ لم يُعرض نجاح، أعد المحاولة بنفس الطلب" }); }
      if (this._wpActor() !== actor || this.state.wpDid !== dept) return;
      this._wpTicket = null; this._wpUncertain = false;
      this.setState({ wpDid: "", wpTxt: "", wpBase: null, wpCounts: null, wpNeedsReview: false, wpMsg: "", tick: (this.state.tick || 0) + 1 });
      this.bsAck("مُسحت بيانات الإدارة والعهد والتنبيهات والاسترشاد والمضبوطات والتكريم المحددة، وحُفظ تعريف الإدارة؛ أكّد الخادم العملية", "ok");
      try { if (srv && srv.resync) srv.resync(false); } catch (_) {}
    } finally { this._wpBusy = false; this.setState({ wpBusy: false }); }
  }
  wpClose() {
    if (this._wpBusy || this._wpUncertain) return void this.setState({ wpMsg: "لم يُحسم تأكيد المسح؛ أعد محاولة الطلب نفسه قبل إغلاق النافذة" });
    this._wpTicket = null; this.setState({ wpDid: "", wpTxt: "", wpMsg: "" });
  }

  _upDeptOf(t) {
    if (!t) return "";
    if ("gm" !== t.role) return t.deptId;
    const e = KIVO.BassamAuth,
      s = e && e.groupDepts ? e.groupDepts(t.gid) : [],
      a = this.state.upGmDept;
    return s.some((t) => t.id === a) ? a : (s[0] || {}).id || "";
  }
  _upDraft(t) {
    const e = this.state;
    if (e.upDraft && e.upFor === t) return JSON.parse(JSON.stringify(e.upDraft));
    const s = KIVO.BassamAuth,
      a = KIVO.BassamPerm,
      r = (s && s.users ? s.users() : []).filter((e) => e.id === t)[0];
    return r && a ? JSON.parse(JSON.stringify(a.empPerms(r.ekey, this._upDeptOf(r)) || {})) : {};
  }
  upTog(t, e, s) {
    this.setState({ upDraft: KIVO.BassamPerm.togActIn(this._upDraft(t), e, s), upFor: t });
  }
  upAll(t, e, s) {
    this.setState({ upDraft: KIVO.BassamPerm.togLeafIn(this._upDraft(t), e, s), upFor: t });
  }
  _upLens(t, e) {
    const s = this.state;
    if (s.upLensDraft && s.upFor === t) return s.upLensDraft.slice();
    const a = KIVO.BassamPerm;
    return a && a.empLens ? a.empLens(e.ekey, this._upDeptOf(e)) : [];
  }
  upSave(t, e, s) {
    const a = KIVO.BassamPerm;
    if (!a || !a.setEmpPerms) return;
    const dd = this._upDeptOf(t),
      isM = !!t.mgr || "gm" === t.role;
    let r;
    if (isM && a.capAllPerms && a.clearEmpPerms && JSON.stringify(a.derivePages ? e : e) === JSON.stringify(a.capAllPerms(dd))) {
      r = a.clearEmpPerms(t.ekey, dd);
      r && r.ok && a.setEmpPerms && (r = { ok: !0 });
    } else r = a.setEmpPerms(t.ekey, e, dd);
    r && r.ok
      ? (Array.isArray(s) && a.setEmpLens && a.setEmpLens(t.ekey, s, this._upDeptOf(t)),
        this.setState({ upDraft: null, upLensDraft: null, upFor: "", tick: (this.state.tick || 0) + 1 }),
        this.bsAck("حُفظت صلاحيات «" + (t.name || "المستخدم") + "»", "ok"))
      : this.bsToast((r && r.err) || "تعذّر حفظ الصلاحيات");
  }
  userDel(t, e, s) {
    const a = KIVO.BassamAuth;
    if (!a) return;
    const r = t.name || "المستخدم",
      i = s
        ? "حذف حساب مدير الإدارة «" + r + "» — ستبقى الإدارة بلا مسؤول حتى تعيّن مديراً جديداً. متابعة؟"
        : "حذف حساب دخول «" + r + "» — يبقى سجل الموظف في جدول الموظفين كما هو. متابعة؟";
    KIVO.bsConfirm({ title: s ? "حذف حساب مدير الإدارة" : "حذف حساب الدخول", msg: i, ok: "حذف الحساب", danger: !0 }).then((y) => {
      if (!y) return;
      const n = s ? a.removeDeptManager(e) : a.removeStaffAccount(t.ekey, e);
      n && n.ok
        ? (this.setState({ tick: (this.state.tick || 0) + 1, upUid: "" }), this.bsAck("حُذف حساب «" + r + "»", "ok"))
        : this.bsToast((n && n.err) || "تعذّر الحذف");
    });
  }
  sysPick(t) {
    const selection = (this._referenceSelection || 0) + 1;
    this._referenceSelection = selection;
    const go = async () => {
      const isDepartment = KIVO.BassamDepts.list().some(d => d.id === t);
      if (isDepartment && !await this.scLoadReferences(t, true)) return;
      if (selection !== this._referenceSelection) return;
      const e = this._loadDraft(t);
      this.setState({ sysSel: t, dhMenu: !1, capDraft: e, capBase: JSON.parse(JSON.stringify(e)), capOpenRows: {}, empQ: "" });
    };
    this._dirty()
      ? KIVO
          .bsConfirm({
            title: "تغييرات غير محفوظة",
            msg: "لديك تغييرات غير محفوظة في سقف الإدارة الحالية — الانتقال سيتجاهلها.",
            ok: "متابعة بلا حفظ",
            danger: !0,
          })
          .then((y) => {
            y && go();
          })
      : go();
  }
  _capNormalize(t, e, s) {
    const a = this._pages();
    a.filter((t) => !t.under && this._isCont(t)).forEach((r) => {
      const i = a.filter((e) => e.under === r.key && -1 !== t.indexOf(e.key)).length,
        n = Array.isArray(e[r.key]) ? e[r.key] : [],
        o = Array.isArray(s[r.key]) ? s[r.key] : [],
        p = a.filter((t) => t.twinSub && t.twinSub.page === r.key).map((t) => t.twinSub.key),
        l = i + n.filter((t) => -1 === p.indexOf(t)).length + o.length > 0,
        d = t.indexOf(r.key);
      (l && -1 === d && t.push(r.key),
        l || -1 === d || t.splice(d, 1),
        Array.isArray(e[r.key]) || (e[r.key] = n),
        Array.isArray(s[r.key]) || (s[r.key] = o));
    });
  }
  /* ═══ KIVO_256 · SOT-003/004/010/015 — شجرةُ الصلاحيات TO-BE v24.9 (وثيقة الشجرة · القسم ٣): الحاويات · الأوراق · العدسات · المنصة · المراجع ═══
     تُشتقّ وقتَ التشغيل من بنية المنصة الحقيقية (KIVO_MANIFEST ← manifests/pages.json: الصفحات · التبويبات · الصفحاتُ تحت حاوية · ترتيبُ seq ·
     عناوينُ التبويبات tabAddr · حاويةُ «مؤشرات الإدارة») ومن السجلّ (KIVO_REGISTRY: المالكون · المفاتيحُ النشطة والمحجوزة) — ومطابقتُها لـ
     src/manifests/perm-tree24.json (المولَّد من الوثيقة بأداة tools/perm_tree.py) مثبتةٌ في tests/unit/perm_tree24.test.mjs.
     الحاويةُ لا تُمنح؛ المفاتيحُ على الأوراق والعدسات؛ المنصةُ بالدور/الذات؛ المرجعُ المستقلّ يُمنح في ورقة إدارته. ═══ */
  t24Struct() {
    if (this.__t24s) return this.__t24s;
    const M = KIVO.KIVO_MANIFEST,
      R = KIVO.KIVO_REGISTRY;
    if (!M || !R || !R.owners || !R.byOwner || !R.byKey || !R.data) return null;
    let pages, addr, conts;
    try {
      pages = M.clone("pages");
      addr = M.clone("tabAddr");
      conts = M.clone("containers");
    } catch (t) {
      return null;
    }
    const PG = {};
    pages.forEach((p) => (PG[p.key] = p));
    const kp = conts.filter((c) => "kpis" === c.key)[0] || null,
      own = (id) => !!R.owners[id],
      act = (id) => (R.byOwner[id] || []).filter((k) => R.byKey[k] && "active" === R.byKey[k].status),
      resv = (id) => (R.byOwner[id] || []).filter((k) => R.byKey[k] && "active" !== R.byKey[k].status),
      /* المسارُ كما تفتحه المنصة: #/<nav>[/<تبويب>] حيث للتبويب عنوان (tabAddr) · والتبويبُ خارج الصفحة يُعرض في «مؤشرات الإدارة» إن كان من مراجعها */
      route = (p, sub, off) => {
        if (off) return kp && -1 !== (kp.refs || []).indexOf(p.key + "/" + sub) ? "#/" + (kp.nav || kp.key) : "";
        const nav = p.nav || p.key,
          a = addr[p.key];
        return "#/" + nav + (sub && a && (1 === a || a[sub]) ? "/" + sub : "");
      },
      refsOf = (leafId) =>
        Object.keys(R.owners)
          .filter((o) => "reference" === R.owners[o].kind && R.owners[o].managedIn === leafId)
          .reduce((a, o) => a.concat(act(o)), []),
      leaf = (id, label, type, rt, extra) =>
        Object.assign({ owner: id, label: label, type: type, route: rt, keys: act(id), reserved: resv(id), managed: refsOf(id) }, extra || {}),
      out = [];
    pages
      .filter((p) => !p.under)
      .forEach((p) => {
        const seq =
            Array.isArray(p.seq) && p.seq.length
              ? p.seq
              : []
                  .concat((p.subs || []).map((x) => "sub:" + x.key))
                  .concat((p.tabs || []).map((x) => "tab:" + x.key))
                  .concat(pages.filter((q) => q.under === p.key).map((q) => "page:" + q.key)),
          L = [];
        if (!seq.length) own(p.key) && L.push(leaf(p.key, p.name, "page", route(p), { page: p.key }));
        else
          seq.forEach((e) => {
            const z = String(e).split(":"),
              k = z[0],
              v = z[1];
            if ("page" === k) {
              const q = PG[v];
              q && own(q.key) && L.push(leaf(q.key, q.name, "page", route(q), { page: q.key, under: p.key }));
              return;
            }
            const x = (("sub" === k ? p.subs : p.tabs) || []).filter((y) => y.key === v)[0],
              id = p.key + "/" + v;
            x && own(id) && L.push(leaf(id, x.name, x.offPage ? "offpage" : "tab", route(p, v, x.offPage), { page: p.key, sub: v, subKind: k }));
          });
        L.length && out.push({ id: p.key, label: p.name, kind: "page", page: p.key, nav: p.nav || p.key, leaves: L });
      });
    const byKind = (kind) => R.data.owners.filter((o) => o.kind === kind).map((o) => o.id),
      lbl = (id) =>
        String((R.owners[id] || {}).label || id)
          .replace(/\s*\((?:Platform Feature Flags|Presenter|صفحتي|مرجع مستقل)\)\s*$/, "")
          .trim();
    out.push({
      id: "lenses",
      label: "العدسات",
      kind: "plugins",
      page: null,
      nav: null,
      leaves: byKind("lens").map((id) => leaf(id, lbl(id), "plugin", "#/plan · #/daily/rounds", { lens: id.replace(/^lens\./, "") })),
    });
    out.push({ id: "platform", label: "المنصة", kind: "platform", page: null, nav: null, leaves: byKind("platform").map((id) => leaf(id, lbl(id), "platform", "")) });
    out.push({
      id: "refs",
      label: "المراجع المستقلة",
      kind: "reference",
      page: null,
      nav: null,
      leaves: byKind("reference").map((id) => leaf(id, lbl(id), "reference", "", { managedIn: R.owners[id].managedIn })),
    });
    return (this.__t24s = out);
  }
  /* المفاتيحُ التي حلّت محلّ لوحاتٍ أُلغيت أوراقُها في v24 («مؤشرات الإدارة»: مؤشراتُ التشغيل اليومي/الإشغال/المصليات) — أين تظهر في المنصة */
  t24Shown() {
    if (this.__t24w) return this.__t24w;
    const out = {};
    try {
      const R = KIVO.KIVO_REGISTRY,
        kp = KIVO.KIVO_MANIFEST.clone("containers").filter((c) => "kpis" === c.key)[0];
      kp &&
        Object.keys(R.atoms).forEach((a) => {
          const at = R.atoms[a];
          "view" === at.act &&
            -1 !== (kp.refs || []).indexOf(at.leaf) &&
            !R.owners[at.leaf] &&
            (at.targets || []).forEach((t) => (out[t] = { container: kp.name, panel: (kp.names || {})[at.leaf] || at.leaf, asis: at.leaf }));
        });
    } catch (t) {
      /* بلا حاويةِ «مؤشرات الإدارة» في البيان: لا تلميحَ «يظهر في» — الشجرةُ نفسُها لا تتغيّر */
    }
    return (this.__t24w = out);
  }
  /* مفاتيحُ الورقة التي تُمنح فيها (ما تملكه + المراجعُ المستقلة التي تُدار فيها) */
  t24LeafKeys(l) {
    return l.keys.concat(l.managed || []);
  }
  /* الشرطُ المسبق للمفتاح (نظيرُ «العرضُ شرطُ الباقي» في النظام القديم): مفتاحُ عرض المالك الأوّل (access/view) لكل مفتاحٍ ليس عرضاً،
     و«x.view» لمفتاح «x.فعل» في المالك نفسِه (المراجع: ref.y.view قبل ref.y.create) — ومفاتيحُ العرض الإضافية (المؤشرات) مستقلة،
     وبوابةُ العدسة (enable) ليست مفتاحاً يُمنح هنا */
  t24Pre(k) {
    const R = KIVO.KIVO_REGISTRY,
      e = R && R.byKey[k];
    if (!e || "access" === e.type || "capability" === e.type) return [];
    const ks = (R.byOwner[e.owner] || []).filter((x) => R.byKey[x] && "active" === R.byKey[x].status),
      prim = ks.filter((x) => "access" === R.byKey[x].type || "view" === R.byKey[x].type)[0],
      out = [];
    prim && prim !== k && out.push(prim);
    const v = k.replace(/\.[a-z_]+$/, ".view");
    v !== k && -1 !== ks.indexOf(v) && -1 === out.indexOf(v) && out.push(v);
    return out;
  }
  /* إسقاطُ مفاتيح من مسودّة مع توابعها (من شرطُه المسبق سقط) — والمشتقُّ (D‑19) يبقى ما بقي مصدرُه، ويسقط مع مصدره إن لم تقم شروطُه */
  t24Drop(d, keys) {
    const P24 = KIVO.BassamPerm.p24,
      DV = P24.DERIVE,
      gone = {},
      held = (x) => Object.keys(DV).some((s) => d[s] && -1 !== DV[s].indexOf(x));
    keys.forEach((k) => {
      delete d[k];
      gone[k] = 1;
    });
    let ch = !0;
    for (; ch; ) {
      ch = !1;
      Object.keys(d).forEach((x) => {
        held(x) || (this.t24Pre(x).some((p) => gone[p]) && (delete d[x], (gone[x] = 1), (ch = !0)));
      });
    }
    Object.keys(DV).forEach((s) => {
      gone[s] &&
        DV[s].forEach((x) => {
          d[x] && !held(x) && this.t24Pre(x).some((p) => !d[p]) && delete d[x];
        });
    });
    return d;
  }
  /* منحُ مفتاحٍ في مسودّة مع شروطه المسبقة ومشتقّاته (D‑19) — والعدسةُ تُفعَّل للموظف إن كان المفتاحُ منها */
  t24Add(d, L, k) {
    const P24 = KIVO.BassamPerm.p24;
    d[k] = !0;
    this.t24Pre(k).forEach((x) => (d[x] = !0));
    (P24.DERIVE[k] || []).forEach((x) => (d[x] = !0));
    const ln = P24.lensOf(k);
    ln && -1 === L.indexOf(ln) && L.push(ln);
  }
  /* تبديلُ مفتاحٍ في مسودّة {مفتاح:true}؛ lens: قائمةُ عدسات الموظف (البوابة) */
  t24TogKey(on, lens, k) {
    const d = Object.assign({}, on),
      L = (lens || []).slice();
    d[k] ? this.t24Drop(d, [k]) : this.t24Add(d, L, k);
    return { on: d, lens: L };
  }
  /* تبديلُ ورقةٍ كاملة: كلُّ مفاتيحها القابلة للمنح على السقف (والعدسةُ: البوابةُ ومفاتيحُها) */
  t24TogLeaf(on, lens, l, val, C, tgt) {
    const P24 = KIVO.BassamPerm.p24,
      d = Object.assign({}, on),
      L = (lens || []).slice(),
      ks = this.t24LeafKeys(l).filter((k) => P24.grantable(k, C, tgt));
    if ("plugin" === l.type) {
      const i = L.indexOf(l.lens);
      val ? -1 === i && L.push(l.lens) : -1 !== i && L.splice(i, 1);
    }
    val ? ks.forEach((k) => this.t24Add(d, L, k)) : this.t24Drop(d, ks);
    return { on: d, lens: L };
  }
  /* بصمةُ مجموعة مفاتيح/عدسات — لكشف «غير محفوظ» */
  t24Sig(o) {
    return Array.isArray(o)
      ? o.slice().sort().join(",")
      : Object.keys(o || {})
          .filter((k) => o[k])
          .sort()
          .join(",");
  }
  /* صفوفُ الشجرة للعرض — mode: emp (منحُ موظف) · tpl (قالب) · view (عرض) · cap (سقفُ الإدارة)
     o: {ceil, on, lens, exp, leafExp, canEdit, target:{role, mgr}, hideOut, lim:{allow, name(page)}, platOff:[…], cb:{togKey, togLeaf, capLeaf, expand, leafExpand}} */
  t24Rows(o) {
    const S = this.t24Struct(),
      P = KIVO.BassamPerm,
      P24 = P && P.p24,
      R = KIVO.KIVO_REGISTRY,
      ix = P24 && P24.ix ? P24.ix() : null;
    if (!S || !P24 || !R || !ix) return { rows: [], nOn: 0, nTot: 0, allExpanded: !1, ok: !1, ids: [] };
    const mode = o.mode,
      cap = "cap" === mode,
      C = o.ceil,
      exp = o.exp || {},
      lx = o.leafExp || {},
      ed = !!o.canEdit,
      on = o.on || {},
      lens = o.lens || [],
      tgt = o.target || {},
      sup = "super" === tgt.role,
      shown = this.t24Shown(),
      lim = o.lim || null,
      off = o.platOff || [],
      G = "var(--brand-primary)",
      G2 = "var(--brand-deep)",
      T = "var(--info-strong)",
      lab = (k) => (R.byKey[k] || {}).label || k,
      /* KIVO_265 · TSK-5 — التكرارُ بلا مفتاحٍ جديد (سجلُّ v24.9 مجمَّد): ما يشمله مفتاحُ المهام في المهمة المتكررة كما يحرسه الخادم
         (الإنشاءُ task.create (+ task.assign بمكلَّفين) · التحويلُ إلى متكررة task.create + task.edit + task.assign · التعديلُ والإيقافُ والاستئنافُ والإنهاءُ task.edit)
         — يُلحق بتلميح الرقاقة كما يُلحق «يظهر في»، وبملاحظةِ ورقة «المهام»؛ والأسماءُ من السجلّ نفسِه فتطابق الرقاقات */
      REC = {
        "task.create": "يشمل إنشاءَ مهمةٍ لمرة واحدة أو متكررة (يومي · أسبوعي · شهري)",
        "task.edit": "يشمل تعديلَ التكرار وإيقافَه مؤقتاً واستئنافَه وإنهاءَه، وتحويلَ مهمةٍ إلى متكررة مع «" + lab("task.create") + "» و«" + lab("task.assign") + "»",
        "task.assign": "يشمل مكلَّفي المهمة المتكررة",
      },
      BADGE = {
        tab: ["تبويب", "var(--info-text)", "var(--info-soft)", "var(--info-border)"],
        page: ["صفحة", "var(--text-secondary)", "var(--bg-surface-3)", "var(--border-default)"],
        offpage: ["خارج الصفحة", "var(--warning-text)", "var(--warning-soft)", "var(--warning-border)"],
        plugin: ["عدسة", "var(--info-text)", "var(--info-soft)", "var(--info-border)"],
        platform: ["المنصة", "var(--text-muted)", "var(--neutral-soft)", "var(--border-strong)"],
        reference: ["مرجع", "var(--plum-text)", "var(--plum-soft)", "var(--plum-soft)"],
        page_c: ["حاوية", "var(--brand-deep)", "var(--brand-soft)", "var(--brand-glow)"],
        plugins_c: ["إضافات", "var(--info-text)", "var(--info-soft)", "var(--info-border)"],
        platform_c: ["بالدور", "var(--text-muted)", "var(--neutral-soft)", "var(--border-strong)"],
        reference_c: ["مراجع", "var(--plum-text)", "var(--plum-soft)", "var(--plum-soft)"],
      },
      badge = (b) =>
        "font-size:9px;font-weight:700;border-radius:6px;padding:1px 7px;flex-shrink:0;white-space:nowrap;color:" + b[1] + ";background:" + b[2] + ";border:1px solid " + b[3],
      /* الورقةُ على السقف؟ (العدسة: في سقف الإدارة ∧ مضيفٌ على السقف · المرجع: ورقةُ إدارته · المنصة: دائماً) */
      leafOn = (l) =>
        "plugin" === l.type
          ? C.lens(l.lens) && P24.lensHosted(l.lens, C)
          : "platform" === l.type
            ? !0
            : "reference" === l.type
              ? P24.leafOn(C, l.managedIn)
              : P24.leafOn(C, l.owner),
      keyState = (k) => {
        const e = R.byKey[k];
        if (!e) return null;
        const sens = !!e.sensitive,
          sh = (shown[k] ? " · يظهر في «" + shown[k].container + " ← " + shown[k].panel + "»" : "") + (REC[k] ? " · " + REC[k] : ""),
          L = P24.lensOf(k),
          base = { k: k, name: e.label, code: k, sens: sens };
        if ("active" !== e.status)
          return Object.assign(base, { on: !1, dis: !0, kind: "resv", tip: "محجوز في v24.9 — لا يُمنح ولا يُحرس" + (e.reservedReason ? " · " + e.reservedReason : "") });
        if ("self" === e.grant) return Object.assign(base, { on: !0, dis: !0, kind: "self", tip: "ذاتيّ — لكل مستخدمٍ على بياناته هو، يُطبَّق تلقائياً ولا يُمنح" });
        if ("role" === e.grant || (ix.needMgr[k] && ix.atomless[k])) {
          const byMgr = !!ix.needMgr[k] && !ix.superOnly[k];
          return Object.assign(base, {
            on: cap ? !0 : sup || (byMgr && !!tgt.mgr),
            dis: !0,
            kind: "role",
            tip: "بالدور: " + (byMgr ? "مدير الإدارة" : "مدير النظام") + " — لا يُمنح",
          });
        }
        const kOn = P24.keyOn(k, C);
        if (cap) return Object.assign(base, { on: kOn, dis: !0, kind: "info", tip: (kOn ? "داخل سقف الإدارة" : "خارج سقف الإدارة") + " · " + k + sh });
        if (!kOn) return Object.assign(base, { on: !1, dis: !0, kind: "out", tip: "خارج سقف الإدارة · " + k + sh });
        if (/^lens\.[a-z]+\.enable$/.test(k))
          return Object.assign(base, { on: sup || -1 !== lens.indexOf(L), dis: !0, kind: "gate", tip: "بوابةُ العدسة — تتبع تفعيلَ العدسة للموظف (مربّعُ العدسة)" });
        if (sup) return Object.assign(base, { on: !0, dis: !0, kind: "role", tip: "مدير النظام يحمل كلَّ ما في السقف" });
        if (ix.needMgr[k] && !tgt.mgr) return Object.assign(base, { on: !1, dis: !0, kind: "mgr", tip: "لمدير الإدارة وحده · " + k });
        const der = Object.keys(P24.DERIVE).filter((s) => -1 !== P24.DERIVE[s].indexOf(k))[0];
        return Object.assign(base, {
          on: !!on[k],
          dis: !ed,
          kind: "asg",
          tip: (sens ? "حسّاس — يُسجَّل في التدقيق · " : "") + (der ? "يُشتقّ مع «" + lab(der) + "» (D‑19) · " : "") + (L ? "يحتاج تفعيلَ العدسة · " : "") + k + sh,
        });
      },
      chip = (st) =>
        Object.assign(st, {
          aria: st.on ? "true" : "false",
          style:
            "display:inline-flex;align-items:center;gap:5px;border-radius:9999px;padding:3px 9px;font-size:10.5px;font-weight:600;font-family:'Cairo',sans-serif;line-height:1.5;white-space:nowrap;max-width:100%;cursor:" +
            (st.dis ? "default" : "pointer") +
            ";border:1px " +
            ("resv" === st.kind || "out" === st.kind
              ? "dashed var(--bd-xcbd5e1);background:var(--bg-xffffff);color:var(--fg-x94a3b8)"
              : st.on
                ? "solid var(--info-border);background:var(--info-soft);color:var(--info-text)"
                : "solid var(--bd-xe2e8f0);background:var(--bg-xffffff);color:var(--fg-x53565a)") +
            (st.dis && "resv" !== st.kind && "out" !== st.kind && "asg" !== st.kind ? ";opacity:.7" : ""),
          box:
            "width:12px;height:12px;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;border:2px solid " +
            (st.on ? T + ";background:" + T + ";color:var(--fg-xffffff)" : "var(--bd-xcbd5e1);background:var(--bg-xffffff);color:transparent"),
          codeStyle: "font-size:9px;font-weight:500;color:var(--fg-x94a3b8);direction:ltr;unicode-bidi:isolate;font-family:ui-monospace,Menlo,Consolas,monospace",
          toggle: (ev) => {
            ev && ev.stopPropagation && ev.stopPropagation();
            st.dis || !o.cb || !o.cb.togKey || o.cb.togKey(st.k);
          },
        }),
      rows = [];
    let nOn = 0,
      nTot = 0;
    S.forEach((c) => {
      const kids = [];
      let cOn = 0,
        cTot = 0;
      const cOff = "page" === c.kind && -1 !== off.indexOf(c.id);
      c.leaves.forEach((l) => {
        const lOn = !cOff && leafOn(l);
        if (o.hideOut && !lOn && "platform" !== l.type && "reference" !== l.type) return;
        const lk = this.t24LeafKeys(l),
          sts = lk.map(keyState).filter(Boolean),
          resvSt = cap || "view" === mode ? l.reserved.map(keyState).filter(Boolean) : [],
          asg = sts.filter((x) => "asg" === x.kind),
          aOn = asg.filter((x) => x.on).length,
          isX = !!lx[l.owner],
          gate = "plugin" === l.type,
          gOn = gate && (sup || -1 !== lens.indexOf(l.lens)),
          limd = cap && lim && l.page && lOn && -1 === lim.allow.indexOf(l.page) ? lim.name(l.page) : "";
        let chkOn = !1,
          all = !1,
          some = !1,
          lOnState = !1,
          tog = null,
          chkTip = "",
          note2 = "";
        if (cap) {
          const capable = "platform" !== l.type && "reference" !== l.type;
          chkOn = capable;
          lOnState = gate ? C.lens(l.lens) : lOn;
          all = lOnState;
          tog = capable && ed && !cOff ? () => o.cb && o.cb.capLeaf && o.cb.capLeaf(l) : null;
          chkTip = capable
            ? cOff
              ? "مطفأةٌ من إعدادات المنصة"
              : lOnState
                ? "إخراجُها من سقف الإدارة"
                : "إدخالُها في سقف الإدارة"
            : "reference" === l.type
              ? "يتبع ورقةَ إدارته («" + l.managedIn + "»)"
              : "عقدةُ المنصة — بالدور لا بالسقف";
          gate && lOnState && !P24.lensHosted(l.lens, C) && (note2 = "بلا مضيف — فعّل «التشغيل الميداني» أو «الجولات اليومية» ليظهر أثرُها");
          cTot += capable ? 1 : 0;
          cOn += capable && lOnState ? 1 : 0;
        } else if ("reference" === l.type) {
          /* المرجعُ المستقلّ يُمنح في ورقة إدارته (admin/shifts) — هنا للعرض وحده فلا يُعدّ مرتين */
          lOnState = sts.some((x) => x.on);
          chkTip = "يُمنح في ورقة إدارته";
        } else {
          chkOn = asg.length > 0 || (gate && lOn && !sup);
          if (gate) {
            all = gOn && (0 === asg.length || aOn === asg.length);
            some = gOn && !all;
            lOnState = gOn;
          } else {
            all = asg.length > 0 && aOn === asg.length;
            some = aOn > 0 && !all;
            lOnState = sup ? lOn : aOn > 0;
          }
          tog = ed && chkOn ? () => o.cb && o.cb.togLeaf && o.cb.togLeaf(l, !all) : null;
          chkTip = gate
            ? all
              ? "إيقافُ العدسة للموظف (البوابة) ومفاتيحِها"
              : "تفعيلُ العدسة للموظف بكلّ مفاتيحها"
            : all
              ? "إلغاءُ كلّ مفاتيح الورقة"
              : "منحُ كلّ مفاتيح الورقة القابلة للمنح";
          cTot += asg.length;
          cOn += aOn;
        }
        const b = BADGE[l.type] || BADGE.page,
          outTxt = cOff ? "مطفأة من المنصة" : !lOn && "platform" !== l.type ? (gate && C.lens(l.lens) ? "بلا مضيفٍ على السقف" : "خارج سقف الإدارة") : "";
        kids.push({
          kind: "leaf",
          child: !0,
          isChild: !0,
          isLeaf: !0,
          isCont: !1,
          isKeys: !1,
          isGroup: !1,
          key: l.owner,
          name: l.label,
          out: !!outTxt && !cap,
          outTxt: outTxt,
          limOn: !!limd,
          limTxt: limd ? "يحدّه سقف «" + limd + "»" : "",
          note2On: !!note2,
          note2: note2,
          on: lOnState,
          all: all,
          some: some,
          chkOn: chkOn,
          chkOff: !chkOn,
          chkTip: chkTip,
          toggle: (ev) => {
            ev && ev.stopPropagation && ev.stopPropagation();
            tog && tog();
          },
          chkStyle:
            "width:20px;height:20px;border-radius:6px;flex-shrink:0;display:flex;align-items:center;justify-content:center;padding:0;cursor:" +
            (tog ? "pointer" : "default") +
            ";border:2px solid " +
            (all || some ? G : "var(--bd-xcbd5e1)") +
            ";background:" +
            (all ? G + ";color:var(--text-on-brand)" : "var(--bg-xffffff);color:" + G) +
            (tog ? "" : ";opacity:.6"),
          nameStyle:
            "min-width:0;font-size:12.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;color:" +
            (lOnState ? "var(--fg-x141414)" : "var(--fg-x94a3b8)"),
          badge: b[0],
          badgeStyle: badge(b),
          route: l.route,
          routeOn: !!l.route,
          routeStyle: "font-size:10px;color:var(--fg-x8a6f35);direction:ltr;unicode-bidi:isolate;white-space:nowrap;font-feature-settings:'tnum'",
          countTxt: cap
            ? lk.length
              ? KIVO.BassamCount(lk.length, "صلاحية", "g")
              : "بلا مفاتيح"
            : "reference" === l.type
              ? "في «" + ((S.reduce((a, cc) => a.concat(cc.leaves), []).filter((y) => y.owner === l.managedIn)[0] || {}).label || l.managedIn) + "»"
              : asg.length
                ? aOn + "/" + asg.length
                : sts.length
                  ? "بالدور"
                  : "—",
          rowStyle:
            "display:flex;align-items:center;gap:8px;padding:8px 12px;padding-right:26px;border-bottom:1px solid var(--bd-xf1f3f5);flex-wrap:wrap;" +
            (lOnState ? "" : "background:var(--bg-a2502512520p6);") +
            (outTxt ? "opacity:.6;" : ""),
          open: (ev) => {
            ev && ev.stopPropagation && ev.stopPropagation();
            o.cb && o.cb.leafExpand && o.cb.leafExpand(l.owner);
          },
          openTip: isX ? "إخفاءُ مفاتيح «" + l.label + "»" : "عرضُ مفاتيح «" + l.label + "» (" + (lk.length + l.reserved.length) + ")",
          openStyle:
            "width:24px;height:24px;border-radius:7px;border:1px solid " +
            (isX ? "var(--bd-a185151810p4)" : "var(--bd-xe1e1e1)") +
            ";background:var(--bg-xffffff);color:" +
            (isX ? G2 : "var(--fg-x94a3b8)") +
            ";display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;padding:0",
          chev: "transition:transform .2s;" + (isX ? "transform:rotate(180deg)" : ""),
        });
        if (isX) {
          const mgdIn = "reference" === l.type ? (S.reduce((a, cc) => a.concat(cc.leaves), []).filter((y) => y.owner === l.managedIn)[0] || {}).label || l.managedIn : "",
            note =
              "reference" === l.type
                ? "مرجعٌ مستقلّ يُدار في «" + mgdIn + "» — مفاتيحُه تُمنح هناك"
                : l.managed && l.managed.length
                  ? "تُدير هذه الورقةُ مرجعاً مستقلاً («" + ((R.owners[(R.byKey[l.managed[0]] || {}).owner] || {}).label || "") + "») — مفاتيحُه هنا"
                  : "platform" === l.type
                    ? "عقدةُ المنصة: مفاتيحُها بالدور (مدير النظام · مدير الإدارة) أو ذاتية لكل مستخدم — لا تدخل السقف ولا القوالب"
                    : gate
                      ? "العدسةُ إضافةٌ على كانفس «التشغيل الميداني» و«الجولات اليومية» — بوابتُها: سقفُ الإدارة ∧ تفعيلُها للموظف"
                      : "tasks" === l.owner
                        ? "التكرار: إنشاءُ مهمةٍ متكررة = «" + lab("task.create") + "» (+ «" + lab("task.assign") + "») · تعديلُ التكرار وإيقافُه واستئنافُه وإنهاؤه = «" + lab("task.edit") + "»"
                        : "",
            chips = ("reference" === l.type && !cap ? [] : sts.concat(resvSt)).map(chip);
          kids.push({
            kind: "keys",
            child: !0,
            isChild: !0,
            isKeys: !0,
            isLeaf: !1,
            isCont: !1,
            isGroup: !1,
            key: l.owner + "#keys",
            keys: chips,
            noteOn: !!note,
            note: note,
            noteStyle: "font-size:10.5px;color:var(--fg-x64748b);margin-bottom:6px;line-height:1.8",
            rowStyle: "padding:8px 12px 10px;padding-right:48px;border-bottom:1px solid var(--bd-xf1f3f5);background:var(--bg-xfafbfc)",
          });
        }
      });
      if (!kids.length) return;
      nOn += cOn;
      nTot += cTot;
      const isX = !!exp[c.id],
        anyOn = cOn > 0,
        b = BADGE[c.kind + "_c"] || BADGE.page_c;
      rows.push({
        kind: "cont",
        isCont: !0,
        isLeaf: !1,
        isKeys: !1,
        isGroup: !1,
        key: c.id,
        name: c.label,
        out: !1,
        on: anyOn,
        badge: b[0],
        badgeStyle: badge(b),
        expanded: isX,
        countTxt:
          "platform" === c.kind
            ? "بالدور والذات"
            : "reference" === c.kind
              ? "تُمنح في أوراق إدارتها"
              : cap
                ? cOn + " من " + KIVO.BassamCount(cTot, "ورقة", "g")
                : cTot
                  ? cOn + " من " + KIVO.BassamCount(cTot, "صلاحية", "g")
                  : "—",
        rowStyle: "display:flex;align-items:center;gap:9px;padding:10px 12px;border-bottom:1px solid var(--bd-xf1f3f5);cursor:pointer;" + (anyOn ? "" : "background:var(--bg-a2502512520p6);"),
        iconStyle:
          "width:20px;height:20px;border-radius:7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:" +
          (anyOn ? "var(--bg-a185151810p14)" : "var(--bg-xf1f3f5)") +
          ";color:" +
          (anyOn ? G2 : "var(--fg-xb8c0cc)"),
        nameStyle: "min-width:0;font-size:12.5px;font-weight:700;white-space:nowrap;color:" + (anyOn ? "var(--fg-x141414)" : "var(--fg-x94a3b8)"),
        dotStyle: "width:8px;height:8px;border-radius:50%;flex-shrink:0;background:" + (anyOn ? "var(--bg-x059669)" : "var(--bg-xcbd5e1)") + (anyOn ? ";box-shadow:0 0 0 3px var(--success-soft)" : ""),
        dotTip: cap ? (anyOn ? "فيها ما هو داخل سقف الإدارة" : "لا شيء منها داخل السقف") : anyOn ? "تظهر للموظف — مُنح مفتاحاً تحتها" : "لا مفتاحَ ممنوحاً تحتها",
        expTip: isX ? "طيّ «" + c.label + "»" : "فرد «" + c.label + "» وعرض أوراقها",
        expStyle:
          "width:24px;height:24px;border-radius:7px;border:1px solid " +
          (isX ? "var(--bd-a185151810p4)" : "var(--bd-xe1e1e1)") +
          ";background:var(--bg-xffffff);color:" +
          (isX ? G2 : "var(--fg-x94a3b8)") +
          ";display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;padding:0",
        chev: "transition:transform .2s;" + (isX ? "transform:rotate(180deg)" : ""),
        expand: (ev) => {
          ev && ev.stopPropagation && ev.stopPropagation();
          o.cb && o.cb.expand && o.cb.expand(c.id);
        },
      });
      isX && kids.forEach((k) => rows.push(k));
    });
    const ordered = P.orderRows ? P.orderRows(rows) : rows;
    return { rows: ordered, nOn: nOn, nTot: nTot, allExpanded: S.every((c) => !!exp[c.id]), ok: !0, ids: S.map((c) => c.id) };
  }
  /* ═══ KIVO_262 · سقفُ النطاق (Data Scope) — منفصلٌ عن سقف الصفحات (SOT-014/015/188) ═══
     سقفُ الصفحات = ما تفتحه الإدارةُ من صفحاتٍ وأفعال (bassam_perms_v1) · سقفُ النطاق = على أيّ مواقع خطتها وعناصرها تعمل بياناتُها
     (bsdept:<d>:bassam_scope_v1 — نموذجُ الخادم نفسُه: ceiling[Site|Zone/Element] = ALL | list | unknown ·
      emp[ekey][Site|Zone/Element] = inherit | list | unknown · emp[ekey].Shift = staffing-bound | n/a | unknown).
     الهويّاتُ بقاعدة المحرّك (KIVO_SCOPE.ID · R5): الموقع f:<sid> · العنصرُ u:<uid> وإلا المخطّطُ القديم — اختبارُ وحدةٍ يثبت التطابق.
     الخادمُ هو الحَكَم: السقفُ لمدير النظام وحده (sys.ceiling.set) · نطاقُ الموظفين لحامل perm.assign ضمن السقف · ولا يُفترض شيءٌ: «غير محسوم» يبقى كما هو. */
  scIdOf(kind, e) {
    if (!e || typeof e !== "object") return null;
    if (kind === "floor") { const v = e.sid || e.id; return v == null || v === "" ? null : "f:" + v; }   /* = ID.floors في المحرّك (بلا الموضعي #i) */
    if (e.uid != null && e.uid !== "") return "u:" + e.uid;
    if (kind === "zones") { const v = e.code || e.ser || e.name || e.id || e.eid; return v == null || v === "" ? null : "z:" + v; }
    if (kind === "gates") {
      if (e.id != null && e.id !== "") return "g:" + e.id;
      if (e.gid != null && e.leafNo != null) return "gl:" + e.gid + "/" + e.leafNo;
      if (e.gid != null) return "gg:" + e.gid;
      if (e.num != null && e.num !== "") return "gn:" + e.num;
      return e.label ? "gL:" + e.label : null;
    }
    if (kind === "marks") { if (e.id != null && e.id !== "") return "m:" + e.id; return e.label ? "mL:" + e.label : null; }
    if (kind === "paths") { const v = e.id || e.code || e.name; return v == null || v === "" ? null : "p:" + v; }
    return null;
  }
  scKindName(k) { return { zones: "مصلى", gates: "باب", marks: "معلم", paths: "مسار" }[k] || k; }
  scElName(k, e) {
    const nm = String((e && (e.name || e.label || e.code || (e.num != null ? "رقم " + e.num : ""))) || "").trim();
    return this.scKindName(k) + (nm ? " · " + nm : "");
  }
  /* خطةُ الإدارة كما يراها المحرّك: المواقعُ وعناصرُ كل موقع (بلا هويةٍ ثابتة ⇒ تُعرض ولا تُختار) */
  scPlan(d) {
    const pl = KIVO.__BS_SRV.operations.reference("bsdept:" + d + ":bassam_plan_v1");
    const fl = pl && Array.isArray(pl.floors) ? pl.floors : [];
    return fl.map((f, i) => {
      const els = [];
      ["zones", "gates", "marks", "paths"].forEach((k) => (Array.isArray(f && f[k]) ? f[k] : []).forEach((e) => {
        const id = this.scIdOf(k, e); els.push({ id: id, kind: k, name: this.scElName(k, e) });
      }));
      return { id: this.scIdOf("floor", f), idx: i, name: String((f && (f.name || (f.num != null ? "موقع " + f.num : ""))) || "موقع " + (i + 1)), els: els };
    });
  }
  async scLoadReferences(d, retry) {
    const registry = KIVO.BassamDepts;
    if (typeof d !== "string" || !d || !registry || !registry.treeFlat().some(dept => dept.id === d)) return false;
    const ops = KIVO.__BS_SRV.operations, context = ops.context();
    if (!context) return false;
    const keys = ["bassam_plan_v1", "bassam_employees_v1"].map(name => "bsdept:" + d + ":" + name),
      stamp = JSON.stringify([context, d]), entries = this._scopeReads || (this._scopeReads = new Map());
    if (ops.ready(keys)) {
      try { keys.forEach(k => ops.reference(k)); return true; } catch (error) {}
    }
    const prior = entries.get(stamp);
    if (prior && (prior.promise || !retry)) return prior.promise || false;
    const entry = {};
    entries.set(stamp, entry);
    entry.promise = Promise.resolve().then(async () => {
      const result = await ops.read(keys), same = JSON.stringify(ops.context()) === JSON.stringify(context);
      if (!same || this._nfDisposed) return false;
      let ok = result && result.ok === 1;
      try { if (ok) keys.forEach(k => ops.reference(k)); } catch (error) { ok = false; }
      entry.error = ok ? "" : "تعذّر تأكيد بيانات الإدارة أو لا تملك صلاحية قراءتها — أعد المحاولة";
      this.setState({ scReadFor: d, scReadError: entry.error, shTick: (this.state.shTick || 0) + 1 });
      if (!ok && retry) this.bsToast(entry.error);
      return !!ok;
    }).finally(() => { entry.promise = null; });
    return entry.promise;
  }
  scRec(d) {
    let r = null;
    try { r = JSON.parse(localStorage.getItem("bsdept:" + d + ":bassam_scope_v1") || "null"); } catch (e) { r = null; }
    return r && typeof r === "object" && !Array.isArray(r) ? r : { v: 1 };
  }
  scDims() { return [{ k: "Site", t: "المواقع", sub: "مواقعُ خطة الإدارة (الطوابق والساحات)", all: "كل مواقع الخطة", some: "مواقع محددة" },
                     { k: "Zone/Element", t: "عناصر المواقع", sub: "المصليات · الأبواب · المعالم · المسارات", all: "كل عناصر الخطة", some: "عناصر محددة" }]; }
  scModeOf(c) { return c && typeof c === "object" && (c.mode === "ALL" || c.mode === "list") ? c.mode : "unknown"; }
  scSrcTxt(c) {
    if (!c || typeof c !== "object" || this.scModeOf(c) === "unknown") return "لم يُحسم بعد — لا يُفترض سقفٌ نيابةً عنك";
    const at = c.at ? new Date(c.at) : null, when = at && !isNaN(at) ? " · " + at.toLocaleDateString("ar-SA-u-ca-islamic-umalqura-nu-arab", { year: "numeric", month: "long", day: "numeric" }) : "";
    if (c.src === "migration") return "حُسم بالترحيل من بيانات الخطة" + when + (c.basis ? " — " + String(c.basis).slice(0, 140) : "");
    if (c.src === "manual") return "حدّده مدير النظام" + (c.byName ? " (" + c.byName + ")" : "") + when;
    return "محفوظٌ سابقاً" + when;
  }
  /* نموذجُ التبويب لمدير النظام: السقفُ لكل بُعد + نطاقُ موظفي الإدارة — المسودةُ في الحالة حتى «حفظ» */
  scopeVals(d, isNode, tab) {
    const on = !isNode && this.t24On() && !!(KIVO.BassamAuth && KIVO.BassamAuth.isSuper && KIVO.BassamAuth.isSuper());
    const base = { tabScopeShow: on, onTabScope: on && tab === "scope", goTabScope: async () => {
      if (await this.scLoadReferences(d, true)) this.setState({ sysTab: "scope", scFor: d, scDraft: null, scEmpDraft: null, scOpen: {} });
    } };
    if (!on || tab !== "scope") return base;
    let plan;
    try { plan = this.scPlan(d); } catch (error) {
      this.scLoadReferences(d, false);
      return Object.assign(base, { scNoPlan: false, scDims: [], scDirty: false, scEmpRows: [], scEmpNone: false,
        scReadPending: true, scReadRetry: () => this.scLoadReferences(d, true), scSave: () => {},
        scSaveStyle: "opacity:.4;cursor:default", scDirtyTxt: this.state.scReadFor === d && this.state.scReadError || "جارٍ تأكيد بيانات الإدارة…" });
    }
    const st = this.state, rec = this.scRec(d), cur = rec.ceiling && typeof rec.ceiling === "object" ? rec.ceiling : {};
    const dr = st.scFor === d && st.scDraft ? st.scDraft : null, eff = (k) => (dr && dr[k] ? dr[k] : cur[k]);
    const allIds = { "Site": plan.map((f) => f.id).filter(Boolean), "Zone/Element": [].concat(...plan.map((f) => f.els.map((x) => x.id))).filter(Boolean) };
    const setDim = (k, v) => this.setState((pr) => ({ scFor: d, scDraft: Object.assign({}, (pr.scFor === d && pr.scDraft) || {}, { [k]: v }) }));
    const dims = this.scDims().map((D) => {
      const c = eff(D.k), mode = this.scModeOf(c), list = mode === "list" && Array.isArray(c.list) ? c.list.map(String) : [];
      const pick = (id) => { const L = list.slice(), i = L.indexOf(id); i >= 0 ? L.splice(i, 1) : L.push(id); setDim(D.k, { mode: "list", list: L }); };
      const seg = (m, lbl) => ({ lbl: lbl, on: mode === m, style: "border:1px solid " + (mode === m ? "var(--bd-a185151810p55)" : "var(--bd-xe1e1e1)") + ";background:" + (mode === m ? "var(--bg-a185151810p1)" : "var(--bg-xffffff)") + ";color:" + (mode === m ? "var(--fg-x8a6f35)" : "var(--fg-x53565a)") + ";border-radius:9px;padding:5px 11px;font-size:11px;font-weight:700;cursor:pointer;font-family:'Cairo',sans-serif",
        go: () => setDim(D.k, m === "list" ? { mode: "list", list: mode === "list" ? list : [] } : { mode: m }) });
      let rows = [];
      if (mode === "list") {
        if (D.k === "Site") rows = plan.map((f) => ({ id: f.id || "", name: f.name, sub: f.id ? "" : "بلا هويةٍ ثابتة — لا يُختار حتى تُحفظ الخطة", on: !!f.id && list.indexOf(f.id) >= 0, dis: !f.id, toggle: () => f.id && pick(f.id), head: false }));
        else plan.forEach((f) => { rows.push({ head: true, name: f.name, sub: KIVO.BassamCount(f.els.length, "عنصر") }); f.els.forEach((x) => rows.push({ id: x.id || "", name: x.name, sub: x.id ? "" : "بلا هويةٍ ثابتة", on: !!x.id && list.indexOf(x.id) >= 0, dis: !x.id, toggle: () => x.id && pick(x.id), head: false })); });
        rows.forEach((r) => { r.offRow = !r.head && !r.dis && !r.on; r.style = "display:flex;align-items:center;gap:8px;padding:6px 12px;border-top:1px solid var(--bd-xf1f3f5);" + (r.head ? "background:var(--bg-xfafbfc);font-weight:700;font-size:11px;color:var(--fg-x53565a)" : "font-size:11.5px;cursor:" + (r.dis ? "default" : "pointer") + ";" + (r.dis ? "opacity:.5" : "")); r.box = "width:16px;height:16px;border-radius:5px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border:2px solid " + (r.on ? "var(--bd-xb99751)" : "var(--bd-xcbd5e1)") + ";background:" + (r.on ? "var(--bg-xb99751)" : "var(--bg-xffffff)") + ";color:var(--fg-xffffff)"; });
      }
      const stale = mode === "list" ? list.filter((id) => allIds[D.k].indexOf(id) < 0).length : 0;
      const badge = mode === "ALL" ? D.all : mode === "list" ? list.length + " من " + allIds[D.k].length : "غير محسوم";
      return { k: D.k, t: D.t, sub: D.sub, segs: [seg("ALL", D.all), seg("list", D.some), seg("unknown", "غير محسوم")], badge: badge,
        badgeStyle: "font-size:10px;font-weight:700;border-radius:9999px;padding:2px 10px;white-space:nowrap;" + (mode === "unknown" ? "color:var(--fg-xb45309);background:var(--bg-a1808390p07);border:1px solid var(--bd-a1808390p25)" : "color:var(--fg-x0e7490);background:var(--bg-a141161440p07);border:1px solid var(--bd-a141161440p35)"),
        src: this.scSrcTxt(c), dirty: !!(dr && dr[D.k]), listOn: mode === "list", rows: rows, rowsNone: mode === "list" && !rows.length,
        staleOn: stale > 0, staleTxt: stale ? KIVO.BassamCount(stale, "هوية") + " في السقف لم تعد في الخطة (حُذفت أو تغيّرت) — تبقى حتى تُزيلها" : "",
        unknownOn: mode === "unknown" };
    });
    const dirty = !!(dr && Object.keys(dr).length);
    return Object.assign(base, {
      scReadPending: false,
      scNoPlan: !plan.length, scDims: dims, scDirty: dirty, scDirtyTxt: dirty ? "● تغييرات غير محفوظة في سقف النطاق" : "✓ محفوظ ومطابق لما يطبّقه الخادم",
      scSaveStyle: "height:34px;border:0;border-radius:10px;padding:0 18px;font-size:12px;font-weight:700;color:var(--fg-xffffff);font-family:'Cairo',sans-serif;" + (dirty ? "cursor:pointer;background:linear-gradient(135deg,var(--bg-x8a6f35),var(--bg-xb99751))" : "cursor:default;opacity:.4;background:var(--bg-x94a3b8)"),
      scSave: () => dirty && this.scSave(d, dr), scUndo: () => this.setState({ scDraft: null }),
      ...this.scEmpVals(d, rec, plan, true) });
  }
  /* مديرُ الإدارة (الإعدادات ← قوالب الصلاحيات): نطاقُ موظفيه داخل سقف إدارته — حاملُ perm.assign يعدّل، وغيرُه يرى؛ والسقفُ نفسُه يُعرض ولا يُعدَّل هنا */
  scMgrVals() {
    if (!this.t24On()) return { scMgrOn: !1 };
    const P = KIVO.BassamPerm, R0 = KIVO.BassamDepts, d = (R0 && R0.active ? R0.active() : "") || "";
    if (!d) return { scMgrOn: !1 };
    const u = (KIVO.BassamAuth && KIVO.BassamAuth.user && KIVO.BassamAuth.user()) || {};
    const held = P && P.key ? P.key("perm.assign", d) : null, mgr = u.role === "dept" || (u.role === "staff" && !!u.mgr) || u.role === "gm" || u.role === "super";
    const canEdit = mgr && held === true;
    const plan = this.scPlan(d), rec = this.scRec(d), V = this.scEmpVals(d, rec, plan, canEdit);
    if (this.state.scFor !== d && this.state.scEmpDraft) this.setState({ scFor: d, scEmpDraft: null });
    return Object.assign(V, { scMgrOn: !0, scMgrRo: !canEdit, scMgrRoTxt: canEdit ? "" : "عرضٌ فقط — تعديلُ نطاق الموظفين لمن يحمل صلاحية «منح الصلاحيات» في هذه الإدارة" });
  }
  scSave(d, draft, empDraft) {
    const rec = this.scRec(d), u = (KIVO.BassamAuth && KIVO.BassamAuth.user && KIVO.BassamAuth.user()) || {}, now = Date.now();
    const out = JSON.parse(JSON.stringify(rec)); out.v = out.v || 1;
    if (draft) {
      out.ceiling = out.ceiling && typeof out.ceiling === "object" ? out.ceiling : {};
      Object.keys(draft).forEach((k) => {
        const c = draft[k];
        if (c.mode === "unknown") out.ceiling[k] = { mode: "unknown", src: "manual", by: u.id || "", byName: u.name || "", at: now };
        else out.ceiling[k] = Object.assign({ mode: c.mode }, c.mode === "list" ? { list: (c.list || []).map(String) } : {}, { src: "manual", by: u.id || "", byName: u.name || "", at: now });
      });
    }
    if (empDraft) {
      out.emp = out.emp && typeof out.emp === "object" ? out.emp : {};
      Object.keys(empDraft).forEach((ek) => { out.emp[ek] = Object.assign({}, out.emp[ek] || {}, empDraft[ek]); });
    }
    try { localStorage.setItem("bsdept:" + d + ":bassam_scope_v1", JSON.stringify(out)); } catch (e) { return void this.bsToast("تعذّر حفظ النطاق", "err"); }
    this.setState({ scDraft: draft ? null : this.state.scDraft, scEmpDraft: empDraft ? null : this.state.scEmpDraft });
    this.bsToast("✓ حُفظ النطاق — والخادمُ يتحقّق منه قبل اعتماده", "ok");
  }
  /* نطاقُ موظفي الإدارة: لكل حساب موظف (له ekey) — الموقع · العنصر (يرث السقف · محدد · غير محسوم) · الوردية (الجدول الشهري · لا ينطبق · غير محسوم) */
  scEmpVals(d, rec, plan, canEdit) {
    const st = this.state, U = (KIVO.BassamAuth && KIVO.BassamAuth.users && KIVO.BassamAuth.users()) || [];
    const me = (KIVO.BassamAuth && KIVO.BassamAuth.user && KIVO.BassamAuth.user()) || {};
    const staff = U.filter((u) => u && u.role === "staff" && !u.mgr && u.deptId === d && u.ekey && !u.dis);
    const cur = rec.emp && typeof rec.emp === "object" ? rec.emp : {}, dr = st.scFor === d && st.scEmpDraft ? st.scEmpDraft : {};
    const ceil = rec.ceiling && typeof rec.ceiling === "object" ? rec.ceiling : {};
    const pool = (dim) => {
      const c = ceil[dim], m = this.scModeOf(c);
      const all = dim === "Site" ? plan.filter((f) => f.id).map((f) => ({ id: f.id, name: f.name })) : [].concat(...plan.map((f) => f.els.filter((x) => x.id).map((x) => ({ id: x.id, name: f.name + " ← " + x.name }))));
      return m === "ALL" ? all : m === "list" ? all.filter((x) => (c.list || []).map(String).indexOf(x.id) >= 0) : [];
    };
    const setE = (ek, dim, v) => this.setState((pr) => { const D = Object.assign({}, (pr.scFor === d && pr.scEmpDraft) || {}); D[ek] = Object.assign({}, D[ek] || {}, { [dim]: v }); return { scFor: d, scEmpDraft: D }; });
    const MODES = { "Site": [["inherit", "يرث سقف الإدارة"], ["list", "مواقع محددة"], ["unknown", "غير محسوم"]],
                    "Zone/Element": [["inherit", "يرث سقف الإدارة"], ["list", "عناصر محددة"], ["unknown", "غير محسوم"]],
                    "Shift": [["staffing-bound", "حسب الجدول الشهري"], ["n/a", "لا ينطبق"], ["unknown", "غير محسوم"]] };
    const rows = staff.map((u) => {
      const ek = String(u.ekey), self = ek === String(me.ekey || ""), ed = canEdit && !self;
      const val = (dim) => (dr[ek] && dr[ek][dim]) || (cur[ek] && cur[ek][dim]) || { mode: "unknown" };
      const open = !!(st.scEmpOpen || {})[ek];
      const cells = ["Site", "Zone/Element", "Shift"].map((dim) => {
        const v = val(dim), m = MODES[dim].some((x) => x[0] === v.mode) ? v.mode : (v.mode === "single" ? "list" : "unknown");
        const L = v.mode === "list" ? (v.list || []).map(String) : v.mode === "single" && v.value != null ? [String(v.value)] : [];
        return { dim: dim, dimName: { "Site": "الموقع", "Zone/Element": "العنصر", "Shift": "الوردية" }[dim], opts: MODES[dim].map((x) => ({ v: x[0], t: x[1], sel: x[0] === m })), mode: m, n: L.length,
          txt: m === "list" ? KIVO.BassamCount(L.length, dim === "Site" ? "موقع" : "عنصر") : (MODES[dim].find((x) => x[0] === m) || [0, ""])[1],
          onPick: (e) => { const nv = e && e.target ? e.target.value : e; if (!ed) return; setE(ek, dim, nv === "list" ? { mode: "list", list: L } : { mode: nv }); if (nv === "list") this.setState((pr) => ({ scEmpOpen: Object.assign({}, pr.scEmpOpen || {}, { [ek]: true }) })); },
          picks: m === "list" && open && dim !== "Shift" ? pool(dim).map((x) => ({ name: x.name, on: L.indexOf(x.id) >= 0, toggle: () => { if (!ed) return; const N = L.slice(), i = N.indexOf(x.id); i >= 0 ? N.splice(i, 1) : N.push(x.id); setE(ek, dim, { mode: "list", list: N }); },
            style: "display:inline-flex;align-items:center;gap:5px;border-radius:8px;padding:3px 9px;font-size:10.5px;font-weight:600;cursor:" + (ed ? "pointer" : "default") + ";border:1px solid " + (L.indexOf(x.id) >= 0 ? "var(--bd-a185151810p55)" : "var(--bd-xe1e1e1)") + ";background:" + (L.indexOf(x.id) >= 0 ? "var(--bg-a185151810p1)" : "var(--bg-xffffff)") })) : [],
          poolNone: m === "list" && open && dim !== "Shift" && !pool(dim).length };
      });
      cells.forEach((c) => { c.picksOn = c.picks.length > 0; });
      return { ek: ek, name: u.name || ek, self: self, ed: ed, ro: !ed, cells: cells, open: open, hasList: cells.some((c) => c.mode === "list" && c.dim !== "Shift"),
        toggleOpen: () => this.setState((pr) => ({ scEmpOpen: Object.assign({}, pr.scEmpOpen || {}, { [ek]: !open }) })),
        selfTip: self ? "نطاقُك يحدّده من فوقك — لا تعدّله لنفسك" : "" };
    });
    const dirty = Object.keys(dr).length > 0;
    return { scEmpRows: rows, scEmpHas: rows.length > 0, scEmpNone: rows.length === 0, scEmpDirty: dirty, scEmpEdit: !!canEdit,
      scEmpSaveStyle: "height:32px;border:0;border-radius:9px;padding:0 16px;font-size:11.5px;font-weight:700;color:var(--fg-xffffff);font-family:'Cairo',sans-serif;" + (dirty ? "cursor:pointer;background:linear-gradient(135deg,var(--bg-x8a6f35),var(--bg-xb99751))" : "cursor:default;opacity:.4;background:var(--bg-x94a3b8)"),
      scEmpSave: () => dirty && this.scSave(d, null, dr), scEmpUndo: () => this.setState({ scEmpDraft: null }),
      scEmpCeilTxt: ["Site", "Zone/Element"].map((k) => (k === "Site" ? "المواقع: " : "العناصر: ") + (this.scModeOf(ceil[k]) === "ALL" ? "كل الخطة" : this.scModeOf(ceil[k]) === "list" ? KIVO.BassamCount((ceil[k].list || []).length, "هوية") : "غير محسوم")).join(" · ") };
  }
  /* وضعُ الإنفاذ (الخادمُ يحمل __BS_AUTHZ): المنحُ على مستوى المفتاح — وإلا تبقى الشجرةُ القديمة (الأفعالُ الستة) كما هي */
  t24On() {
    try {
      return !!(KIVO.BassamPerm && KIVO.BassamPerm.authz && KIVO.BassamPerm.authz() && KIVO.BassamPerm.p24 && KIVO.BassamPerm.p24.R() && this.t24Struct());
    } catch (t) {
      return !1;
    }
  }
  /* حالةُ الفرد/الطيّ لحاويات الشجرة: كلُّها أو لا شيء */
  t24ExpAll(md) {
    const e = {};
    (md.ids || []).forEach((id) => (e[id] = !md.allExpanded));
    return e;
  }
  /* ── نافذةُ صلاحيات المستخدم في وضع الإنفاذ: الحالةُ الفعلية مفتاحاً مفتاحاً (= الخادم) والحفظُ فرقٌ صريح ── */
  up24Model(n, o, inh, edit) {
    const P = KIVO.BassamPerm,
      P24 = P.p24,
      st = this.state,
      i = n.id,
      C = P24.ceil(o),
      isMgr = !!n.mgr || "gm" === n.role,
      ed = !!edit && "super" !== n.role && "dept" !== n.role && !!n.ekey,
      eff = P24.effective({ did: o, ekey: n.ekey, inherit: inh, ceil: C, mgr: isMgr }) || { keys: {}, T: {}, lens: [], plus: [], minus: [] },
      base = eff.keys,
      draft = ed && st.up24Draft && st.upFor === i ? st.up24Draft : base,
      lensBase = eff.lens,
      lensNow = ed && st.upLensDraft && st.upFor === i ? st.upLensDraft : lensBase,
      tgt = { role: n.role, mgr: isMgr },
      md = this.t24Rows({
        mode: ed ? "emp" : "view",
        ceil: C,
        on: draft,
        lens: lensNow,
        exp: st.up24Exp || {},
        leafExp: st.up24Leaf || {},
        canEdit: ed,
        target: tgt,
        platOff: this.t24PlatOff(),
        cb: {
          togKey: (k) => {
            const r = this.t24TogKey(draft, lensNow, k);
            this.setState({ up24Draft: r.on, upLensDraft: r.lens, upFor: i });
          },
          togLeaf: (l, v) => {
            const r = this.t24TogLeaf(draft, lensNow, l, v, C, tgt);
            this.setState({ up24Draft: r.on, upLensDraft: r.lens, upFor: i });
          },
          expand: (id) => this.setState({ up24Exp: { ...(this.state.up24Exp || {}), [id]: !(this.state.up24Exp || {})[id] } }),
          leafExpand: (id) => this.setState({ up24Leaf: { ...(this.state.up24Leaf || {}), [id]: !(this.state.up24Leaf || {})[id] } }),
        },
      }),
      dK = this.t24Sig(draft) !== this.t24Sig(base),
      dL = this.t24Sig(lensNow) !== this.t24Sig(lensBase),
      nDiff = (() => {
        const a = {};
        Object.keys(draft).concat(Object.keys(base)).forEach((k) => (a[k] = 1));
        return Object.keys(a).filter((k) => !!draft[k] !== !!base[k]).length;
      })();
    return { md, eff, draft, base, lensNow, lensBase, ed, C, tgt, dirty: ed && (dK || dL), nDiff, dL };
  }
  up24Save(n, o, m) {
    const P = KIVO.BassamPerm,
      P24 = P && P.p24;
    if (!P24 || !m || !m.ed) return;
    const delta = P24.delta(m.draft, m.eff.T, m.C, m.lensNow, m.tgt),
      r = P24.setGrant(n.ekey, o, delta);
    if (!r || !r.ok) return void this.bsToast((r && r.err) || "تعذّر حفظ الصلاحيات");
    let lr = { ok: !0 };
    m.dL && P.setEmpLens && (lr = P.setEmpLens(n.ekey, m.lensNow, o));
    if (lr && !1 === lr.ok) return void this.bsToast(lr.err || "تعذّر حفظ العدسات");
    this.setState({ up24Draft: null, upLensDraft: null, upFor: "", tick: (this.state.tick || 0) + 1 });
    const dr = (r.dropped || []).length;
    this.bsAck(
      "حُفظت صلاحيات «" + (n.name || "المستخدم") + "»" + (dr ? " — عدا " + KIVO.BassamCount(dr, "مفتاح") + " لا تحملها أنت فلا تمنحها" : ""),
      dr ? "warn" : "ok",
    );
  }
  /* الحاوياتُ المطفأة على مستوى المنصة (القوائم/الوحدات) */
  t24PlatOff() {
    try {
      const pl = KIVO.BassamPlat && KIVO.BassamPlat.get ? KIVO.BassamPlat.get() : null;
      return ((pl && pl.mods && pl.mods.off) || []).filter((k) => "admin" !== k);
    } catch (t) {
      return [];
    }
  }
  /* ── قوالبُ الصلاحيات في وضع الإنفاذ: القالبُ يحمل مفاتيحه (keys24) وورقتَه القديمة المغطّاة (perms — لا تتجاوزها أبداً) ── */
  tp24Base(tp, did, C) {
    const P24 = KIVO.BassamPerm.p24,
      tgt = { role: "staff", mgr: !1 },
      out = {};
    if (!tp) return out;
    if (Array.isArray(tp.keys24)) {
      tp.keys24.forEach((k) => P24.grantable(k, C, tgt) && (out[k] = !0));
      return out;
    }
    const T = P24.translate(this.tpExpand(tp.perms || {}), C);
    Object.keys(T).forEach((k) => P24.grantable(k, C, tgt) && (out[k] = !0));
    return out;
  }
  /* ── سقفُ الإدارة في وضع الإنفاذ: الورقة ← (الصفحة · التبويب · العدسة) في المسودّة نفسِها، ولوحاتُ «مؤشرات المتابعة» القديمة تتبع مفاتيحَها ── */
  cap24Leaf(l) {
    if ("plugin" === l.type) this.capLensTog(l.lens);
    else if (l.sub) {
      const pg = this._pages().filter((p) => p.key === l.page)[0] || {};
      (pg.subs || []).some((x) => x.key === l.sub) ? this.capSubTog(l.page, l.sub) : this.capTabTog(l.page, l.sub);
    } else this.capTog(l.page);
    setTimeout(() => this.cap24Sync(), 0);
  }
  /* لوحاتُ «مؤشرات المتابعة» الثلاث (أوراقٌ قديمة تحت المتابعة اليومية — ليست أوراقاً في v24): مؤشراتُ التشغيل اليومي ← التقرير اليومي ·
     الإشغال ← عدسةُ الكثافة · المصليات ← عدسةُ المصليات (بمضيفٍ على السقف) — فيبقى شكلُ الواجهة القديم مطابقاً لمفاتيح السقف */
  _cap24Synced(dr, did) {
    const P24 = KIVO.BassamPerm && KIVO.BassamPerm.p24;
    if (!P24 || !dr) return null;
    const pg = this._pages().filter((p) => "daily" === p.key)[0];
    if (!pg || !(pg.tabs || []).length) return null;
    const lensArr = Array.isArray(dr.lenses) ? dr.lenses : KIVO.BassamPerm.deptLenses ? KIVO.BassamPerm.deptLenses(did) : [],
      C = P24.ceil(did, { cap: dr.cap, subs: dr.subs || {}, tabs: dr.tabs || {}, lenses: lensArr }),
      want = { kpiDaily: P24.leafOn(C, "dreport"), kpiOcc: C.lens("dens") && P24.lensHosted("dens", C), kpiZones: C.lens("zones") && P24.lensHosted("zones", C) },
      has = -1 !== (dr.cap || []).indexOf("daily"),
      cur = Array.isArray((dr.tabs || {}).daily) ? dr.tabs.daily.slice() : has ? pg.tabs.map((t) => t.key) : [];
    let ch = !1;
    Object.keys(want).forEach((k) => {
      if (!pg.tabs.some((t) => t.key === k)) return;
      const i = cur.indexOf(k);
      want[k] && -1 === i && (cur.push(k), (ch = !0));
      !want[k] && -1 !== i && (cur.splice(i, 1), (ch = !0));
    });
    if (!ch) return null;
    const cap = dr.cap.slice(),
      subs = Object.assign({}, dr.subs),
      tabs = Object.assign({}, dr.tabs || {}, { daily: cur });
    this._capNormalize(cap, subs, tabs);
    return { cap: cap, subs: subs, tabs: tabs, lenses: Array.isArray(dr.lenses) ? dr.lenses.slice() : dr.lenses };
  }
  cap24Sync() {
    const t = this.state.capDraft;
    if (!t || !this.state.sysSel) return;
    const n = this._cap24Synced(t, this.state.sysSel);
    n && this.setState({ capDraft: n });
  }
  _isCont(t) {
    return !!((t.subs && t.subs.length) || (t.tabs && t.tabs.length) || this._pages().some((e) => e.under === t.key));
  }
  capTog(t) {
    const e = this.state.capDraft;
    if (!e) return;
    const s = e.cap.slice(),
      a = Object.assign({}, e.subs),
      r = Object.assign({}, e.tabs || {}),
      i = s.indexOf(t),
      n = Object.assign({}, this.state.capOpenRows || {}),
      o = this._pages();
    if (-1 === i) {
      s.push(t);
      const e = this._subsOf(t);
      e.length && (a[t] = e.map((t) => t.key));
      const i = this._tabsOf(t);
      i.length && (r[t] = i.map((t) => t.key));
      const n = o.filter((e) => e.key === t)[0];
      if ((n && n.under && -1 === s.indexOf(n.under) && s.push(n.under), n && n.twinSub)) {
        const t = n.twinSub,
          e = Array.isArray(a[t.page]) ? a[t.page].slice() : this._subsOf(t.page).map((t) => t.key);
        (-1 === e.indexOf(t.key) && e.push(t.key), (a[t.page] = e));
      }
    } else {
      s.splice(i, 1);
      const e = o.filter((e) => e.key === t)[0];
      if (e && e.twinSub) {
        const t = e.twinSub,
          s = Array.isArray(a[t.page]) ? a[t.page].slice() : this._subsOf(t.page).map((t) => t.key),
          r = s.indexOf(t.key);
        (-1 !== r && s.splice(r, 1), (a[t.page] = s));
      }
      o.filter((e) => e.under === t).forEach((t) => {
        const e = s.indexOf(t.key);
        -1 !== e && s.splice(e, 1);
      });
    }
    (this._capNormalize(s, a, r),
      this.setState({ capDraft: { cap: s, subs: a, tabs: r, lenses: (e.lenses || []).slice() }, capOpenRows: n }));
  }
  capSubTog(t, e) {
    const s = this.state.capDraft;
    if (!s) return;
    const a = s.cap.slice(),
      r = Object.assign({}, s.subs),
      i = Object.assign({}, s.tabs || {}),
      n = -1 !== a.indexOf(t),
      o = Array.isArray(r[t]) ? r[t].slice() : n ? this._subsOf(t).map((t) => t.key) : [],
      p = o.indexOf(e);
    (-1 === p ? o.push(e) : o.splice(p, 1),
      (r[t] = o),
      this._capNormalize(a, r, i),
      this.setState({ capDraft: { cap: a, subs: r, tabs: i, lenses: (s.lenses || []).slice() } }));
  }
  capTabTog(t, e) {
    const s = this.state.capDraft;
    if (!s) return;
    const a = s.cap.slice(),
      r = Object.assign({}, s.subs),
      i = Object.assign({}, s.tabs || {}),
      n = -1 !== a.indexOf(t),
      o = Array.isArray(i[t]) ? i[t].slice() : n ? this._tabsOf(t).map((t) => t.key) : [],
      p = o.indexOf(e);
    (-1 === p ? o.push(e) : o.splice(p, 1),
      (i[t] = o),
      this._capNormalize(a, r, i),
      this.setState({ capDraft: { cap: a, subs: r, tabs: i, lenses: (s.lenses || []).slice() } }));
  }
  capLensTog(t) {
    const e = this.state.capDraft;
    if (!e) return;
    const s = KIVO.BassamPerm;
    if (!s) return;
    const a = Array.isArray(e.lenses) ? e.lenses.slice() : (s.LENS_KEYS || []).slice(),
      r = a.indexOf(t);
    (-1 === r ? a.push(t) : a.splice(r, 1),
      this.setState({
        capDraft: { cap: e.cap.slice(), subs: Object.assign({}, e.subs), tabs: Object.assign({}, e.tabs || {}), lenses: a },
      }));
  }
  capLensAll(t) {
    const e = this.state.capDraft;
    if (!e) return;
    const s = KIVO.BassamPerm;
    this.setState({
      capDraft: {
        cap: e.cap.slice(),
        subs: Object.assign({}, e.subs),
        tabs: Object.assign({}, e.tabs || {}),
        lenses: t ? ((s && s.LENS_KEYS) || []).slice() : [],
      },
    });
  }
  capExpand(t) {
    const e = Object.assign({}, this.state.capOpenRows || {});
    ((e[t] = !e[t]), this.setState({ capOpenRows: e }));
  }
  capAll(t) {
    if (!this.state.capDraft) return;
    const e = {},
      s = {};
    t &&
      this._pages().forEach((t) => {
        (t.subs && t.subs.length && (e[t.key] = t.subs.map((t) => t.key)),
          t.tabs && t.tabs.length && (s[t.key] = t.tabs.map((t) => t.key)));
      });
    const a = KIVO.BassamPerm;
    this.setState({
      capDraft: { cap: t ? this._pages().map((t) => t.key) : [], subs: e, tabs: s, lenses: t ? ((a && a.LENS_KEYS) || []).slice() : [] },
    });
  }
  capUndo() {
    const t = this.state.capBase;
    t && this.setState({ capDraft: JSON.parse(JSON.stringify(t)) });
  }
  capSave() {
    const t = KIVO.BassamPerm,
      e0 = this.state;
    if (!t || !e0.capDraft || !e0.sysSel) return;
    /* KIVO_256 · وضعُ الإنفاذ: لوحاتُ «مؤشرات المتابعة» القديمة تتبع مفاتيحَها قبل الحفظ (التقرير اليومي · عدستا الكثافة والمصليات) */
    const sy = this.t24On() ? this._cap24Synced(e0.capDraft, e0.sysSel) : null,
      e = sy ? Object.assign({}, e0, { capDraft: sy }) : e0;
    let s = null;
    const a = t.setDeptCap(e.sysSel, e.capDraft.cap);
    if (
      (a && !1 === a.ok && a.err && (s = a),
      this._pages().forEach((a) => {
        if (!a.subs || !a.subs.length) return;
        const r = e.capDraft.subs[a.key];
        if (!Array.isArray(r)) return;
        const i = t.setDeptSubs(e.sysSel, a.key, r);
        !s && i && !1 === i.ok && i.err && (s = i);
      }),
      this._pages().forEach((a) => {
        if (!a.tabs || !a.tabs.length || !t.setDeptTabs) return;
        const r = (e.capDraft.tabs || {})[a.key];
        if (!Array.isArray(r)) return;
        const i = t.setDeptTabs(e.sysSel, a.key, r);
        !s && i && !1 === i.ok && i.err && (s = i);
      }),
      Array.isArray(e.capDraft.lenses) && t.setDeptLenses)
    ) {
      const a = t.setDeptLenses(e.sysSel, e.capDraft.lenses);
      !s && a && !1 === a.ok && a.err && (s = a);
    }
    this.setState(sy ? { capDraft: sy, capBase: JSON.parse(JSON.stringify(sy)) } : { capBase: JSON.parse(JSON.stringify(e.capDraft)) });
    const blk = (() => {
      try {
        const s = KIVO.BassamDepts,
          a = (s.ancestorsOf(e.sysSel) || []).filter((e) => t.hasCap(e));
        if (!a.length || (t.capOwnOf && t.capOwnOf(e.sysSel))) return 0; /* caps-own: an independent ceiling is not cut by its ancestors */
        let r = null;
        return (
          a.forEach((e) => {
            const s = t.rawCap(e);
            r = r ? r.filter((t) => -1 !== s.indexOf(t)) : s.slice();
          }),
          (e.capDraft.cap || []).filter((t) => -1 === r.indexOf(t)).length
        );
      } catch (t) {
        return 0;
      }
    })();
    setTimeout(
      () =>
        this.bsToast(
          s ? s.err : blk ? "حُفظ سقف الإدارة — لكن " + blk + " من صفحاته خارج سقف الأصل فلن تُفعَّل حتى تُفتح هناك" : "حُفظ سقف الإدارة",
          s ? "err" : blk ? "warn" : "ok",
        ),
      0,
    );
  }
  _pwSet(t, e) {
    this.setState((s) => ({ pwDlg: { ...(s.pwDlg || {}), [t]: e, err: "" } }));
  }
  _pwSetErr(t) {
    this.setState((e) => ({ pwDlg: { ...(e.pwDlg || {}), err: t, busy: !1 } }));
  }
  pwDlgCancel() {
    const t = (this.state.pwDlg || {}).mode;
    ((this._encPend = null),
      (this._decPend = null),
      this.setState({ pwDlg: null, backupMsg: "imp" === t ? "أُلغي الاستيراد — لم يتغيّر شيء" : "أُلغي التصدير" }));
  }
  pwDlgGo() {
    const t = this.state.pwDlg;
    if (!t || t.busy) return;
    const e = KIVO.BassamCrypt,
      s = String(t.p1 || "");
    if ("exp" === t.mode) {
      if (s.length < 8) return void this._pwSetErr("كلمة المرور أقصر من 8 محارف — أطلها لتقوى (" + s.length + " من 8)");
      if (s !== String(t.p2 || "")) return void this._pwSetErr("الكلمتان غير متطابقتين — أعد كتابة التأكيد");
      const a = this._encPend;
      return a && e
        ? (this.setState({ pwDlg: null, backupMsg: "جاري تشفير النسخة…" }),
          void e
            .enc(a.json, s)
            .then((t) => {
              const e = a.dt || new Date(),
                s = { app: "bassam-crowd", version: 3, kind: "full-enc", exportedAt: e.toISOString(), enc: t },
                r = new Blob([JSON.stringify(s)], { type: "application/json" }),
                i = URL.createObjectURL(r),
                n = document.createElement("a");
              n.href = i;
              const o = (t) => (t < 10 ? "0" + t : "" + t);
              ((n.download = "نسخة-شاملة-كل-الإدارات-" + e.getFullYear() + "-" + o(e.getMonth() + 1) + "-" + o(e.getDate()) + ".json"),
                document.body.appendChild(n),
                n.click(),
                n.remove(),
                URL.revokeObjectURL(i),
                (this._encPend = null));
              try {
                const t = KIVO.BassamDepts;
                t && t.raw.setItem.call(localStorage, "bassam_last_full_export_v1", (a.dt || new Date()).toISOString());
              } catch (t) {}
              this.setState({
                backupMsg:
                  "✓ تم تصدير النسخة الشاملة مشفَّرة (" +
                  KIVO.BassamCount(a.depts, "إدارة") +
                  "، " +
                  KIVO.BassamCount(a.items, "عنصر بيانات") +
                  "، " +
                  KIVO.BassamCount(a.imgsN, "صورة") +
                  ")",
              });
            })
            .catch(() => this.setState({ backupMsg: "تعذّر تشفير النسخة" })))
        : void this.setState({ pwDlg: null, backupMsg: "تعذّر التصدير" });
    }
    if (!s) return void this._pwSetErr("أدخل كلمة مرور النسخة أولاً");
    const a = this._decPend;
    a && e
      ? (this.setState((t) => ({ pwDlg: { ...(t.pwDlg || {}), busy: !0, err: "" } })),
        e
          .dec(a.enc, s)
          .then((t) => {
            ((this._decPend = null), this.setState({ pwDlg: null }));
            try {
              a.cont(t);
            } catch (t) {
              this.setState({ backupMsg: "تعذّرت قراءة الملف بعد فك التشفير" });
            }
          })
          .catch(() => this._pwSetErr("كلمة المرور غير صحيحة أو الملف تالف — جرّب مرة أخرى")))
      : this.setState({ pwDlg: null, backupMsg: "تعذّر الاستيراد" });
  }
  PC(t) {
    try {
      return !!KIVO.BassamPerm && KIVO.BassamPerm.can("admin", t || "view");
    } catch (t) {
      return !1;
    }
  }
  _adCanWrite() {
    return this.PC("add") || this.PC("edit") || this.PC("del") || this.PC("approve");
  }
  /* طابعُ النسخة الشاملة: المفتاحُ العامُّ (عقدُ النظام) — ويُقرأ الطابعُ القديمُ المسبوقُ بالإدارة إن كان أحدث كي لا يضيع تاريخٌ محفوظ */ _fullStamp() {
    const t = (e) => {
      if (!e) return 0;
      const s = new Date(e).getTime();
      return isFinite(s) ? s : 0;
    };
    let e = null,
      s = null;
    try {
      const t = KIVO.BassamDepts;
      e = t ? t.raw.getItem.call(localStorage, "bassam_last_full_export_v1") : localStorage.getItem("bassam_last_full_export_v1");
    } catch (t) {}
    try {
      s = localStorage.getItem("bassam_last_full_export_v1");
    } catch (t) {}
    return t(e) >= t(s) ? e || s || null : s;
  }
  _expInfo(t, e) {
    const s = "full" === e ? "آخر نسخة شاملة" : "آخر تصدير";
    if (!t) return { txt: "full" === e ? "لم تُؤخذ نسخة شاملة بعد" : "لم تُصدَّر نسخة بعد", stale: !0 };
    let a;
    try {
      a = new Date(/^\d+$/.test(String(t).trim()) ? +String(t).trim() : t);   /* KIVO_263: الختمُ رقمُ اللحظة (والقديمُ نصُّ ISO) */
    } catch (t) {
      return { txt: s + ": —", stale: !1 };
    }
    if (isNaN(a.getTime())) return { txt: s + ": —", stale: !1 };
    const r = Date.now() - a.getTime(),
      i = 864e5,
      n = Math.floor(r / i);
    let o;
    return (
      (o =
        r < 36e5
          ? "منذ أقل من ساعة"
          : r < i
            ? "اليوم"
            : 1 === n
              ? "أمس"
              : n < 30
                ? "قبل " + KIVO.BassamCount(n, "يوم", "g") + ""
                : n < 365
                  ? "قبل أكثر من شهر"
                  : "قبل أكثر من سنة"),
      { txt: s + ": " + o, stale: n >= 7 }
    );
  }
  _adPermVals() {
    const t = "undefined" != typeof window && "site" === KIVO.__ADMIN_MODE,
      e = t || this._adCanWrite();
    return {
      adPmExport: t || this.PC("export"),
      adPmWrite: e,
      adPmReadOnly: !e,
      adPmNoteStyle:
        "display:flex;align-items:center;gap:8px;padding:9px 14px;border-radius:12px;background:var(--bg-a1001161390p06);border:1px solid var(--bd-a1001161390p22);font-size:11.5px;font-weight:600;color:var(--fg-x475569);line-height:1.8",
    };
  }
  bsMenusPatch() {
    return { rowMenu: null };
  }
  _bsOutsideMenus(t) {
    try {
      for (var e = t.target, s = !1; e && e !== document.body; ) {
        if (e.style && ("absolute" === e.style.position || "fixed" === e.style.position)) {
          s = !0;
          break;
        }
        e = e.parentElement;
      }
      var a = this,
        r = this.bsMenusPatch(),
        i = {};
      (Object.keys(r).forEach(function (t) {
        i[t] = a.state[t];
      }),
        setTimeout(function () {
          try {
            var t = !1,
              e = !1,
              n = a.state;
            if (
              (Object.keys(r).forEach(function (s) {
                (n[s] !== i[s] && (t = !0), n[s] && (e = !0));
              }),
              t || s || !e)
            )
              return;
            a.setState(r);
          } catch (t) {}
        }, 0));
    } catch (t) {}
  }
  componentDidMount() {
    this._nfDisposed=false;
    this._nfChanged=()=>{ if (!this._nfDisposed) this.setState({nfTick:(this.state.nfTick || 0)+1}); };
    window.addEventListener("bassam:notif",this._nfChanged);
    if(this.state.plTab === "notif")this.nfLoadManagement();
    ((this._audRm = () => {
      try {
        const t = this.state.aud;
        t &&
          t.loaded &&
          ("site" === KIVO.__ADMIN_MODE ? "oplog" === this.state.admTab : "oplog" === this.state.deptTab) &&
          this.setState({ aud: { ...t, newN: (t.newN || 0) + 1 } });
      } catch (e) {}
    }),
      window.addEventListener("bassam:remote", this._audRm),
      (this._bsOutM = (t) => this._bsOutsideMenus(t)),
      document.addEventListener("click", this._bsOutM, !0),
      (this._pvMsg = (t) => {
        try {
          t.data && t.data.bsPlatPreviewReady && "plat" === this.state.admTab && this.plPvPost();
        } catch (t) {}
      }),
      window.addEventListener("message", this._pvMsg),
      this.adOnSrv() && (this.adLoad(!0), this.adTimerOn()));
  }
  componentWillUnmount() {
    this._nfDisposed=true; clearTimeout(this._nfTargetsTimer);
    this._nfChanged && window.removeEventListener("bassam:notif",this._nfChanged);
    (this._audRm && window.removeEventListener("bassam:remote", this._audRm),
      this._bsOutM && document.removeEventListener("click", this._bsOutM, !0),
      this._pvMsg && window.removeEventListener("message", this._pvMsg),
      this.adTimerOff());
  }
  audScope() {
    try {
      const i = "undefined" != typeof window && "site" === KIVO.__ADMIN_MODE ? "site" : "dept";
      if ("site" === i && KIVO.BassamAuth && KIVO.BassamAuth.isSuper())
        return { site: !0, dept: String((this.state.aud || {}).dept || "") };
      return { site: !1, dept: KIVO.BassamDepts ? KIVO.BassamDepts.active() : "" };
    } catch (t) {
      return { site: !1, dept: "" };
    }
  }
  audLoad(reset) {
    const A = KIVO.BassamAudit;
    if (!A) return;
    const S = this.state.aud || {},
      F = S.f || {},
      sc = this.audScope();
    const q = {
      dept: sc.dept,
      etype: F.etype || "",
      act: F.act || "",
      uid: F.uid || "",
      q: KIVO.BassamFind.dig(F.q || ""),
      site: F.site || "",
      plan: F.plan || "",
      day: F.day || "",
      since: F.from ? +new Date(F.from) : "",
      before: F.to ? +new Date(F.to) + 864e5 : "",
      limit: 60,
      cursor: reset ? "" : S.next || "",
    };
    const tk = (this._audTk = (this._audTk || 0) + 1);
    this.setState({ aud: { ...S, loading: !0, err: "", rows: reset ? [] : S.rows || [], next: reset ? 0 : S.next, newN: 0 } });
    A.fetch(q).then((r) => {
      if (tk !== this._audTk) return;
      const S2 = this.state.aud || {};
      this.setState({
        aud: {
          ...S2,
          loading: !1,
          err: r.ok ? "" : r.err || "تعذّر الجلب",
          rows: (reset ? [] : S2.rows || []).concat(r.rows || []),
          next: r.next || 0,
          loaded: !0,
        },
      });
    });
  }
  audSetF(k, v) {
    const S = this.state.aud || {};
    this.setState({ aud: { ...S, f: { ...(S.f || {}), [k]: v }, open: null } }, () => {
      clearTimeout(this._audT);
      this._audT = setTimeout(() => this.audLoad(!0), "q" === k || "site" === k || "plan" === k || "day" === k ? 350 : 0);
    });
  }
  audExport() {
    const A = KIVO.BassamAudit,
      rows = (this.state.aud || {}).rows || [];
    if (!A || !rows.length) return;
    const e = (t) => '"' + String(null == t ? "" : t).replace(/"/g, '""') + '"',
      L = [["الوقت", "الفعل", "النوع", "الكيان", "المعرّف", "السياق", "المستخدم", "الإدارة", "التفاصيل"].map(e).join(",")];
    rows.forEach((r) => {
      const v = A.rowVM(r);
      L.push(
        [
          new Date(r.ts).toISOString(),
          v.act,
          A.ET_AR[r.etype] || r.etype,
          r.ename || "",
          r.eid,
          v.ctx,
          v.by,
          r.dept || "",
          v.details.map((d) => d.f + ": " + (d.from ? d.from + " → " : "") + d.to).join(" | "),
        ]
          .map(e)
          .join(","),
      );
    });
    try {
      const t = new Blob(["﻿" + L.join("\n")], { type: "text/csv;charset=utf-8" }),
        a = document.createElement("a");
      ((a.href = URL.createObjectURL(t)),
        (a.download = "سجل-الأنشطة-" + new Date().toISOString().slice(0, 10) + ".csv"),
        document.body.appendChild(a),
        a.click(),
        setTimeout(() => {
          (URL.revokeObjectURL(a.href), a.remove());
        }, 800));
    } catch (t) {
      this.bsToast("تعذّر التصدير", "warn");
    }
  }
  /* ═══ R185: «استيراد البيانات التاريخية» — لوحةُ موقع الإحصائيات القديم (HistoricalImportPanel) منقولةً عنصراً عنصراً ═══
   الكروتُ والشاراتُ والجداولُ والأوضاعُ والحواراتُ ونصوصُها وترتيبُها ومقاساتُها كما في الأصل؛ والألوانُ من لوحة هوية المنصة
   (فاتح/داكن) بأقرب درجةٍ لدرجة الأصل. التحليلُ والتنفيذُ في المتصفح (BassamHistImport) بمنطق خادم الموقع القديم حرفاً. */
  hiS() {
    return this.state.hi || {};
  }
  hiSet(p, cb) {
    this.setState((s) => ({ hi: Object.assign({}, s.hi || {}, p) }), cb);
  }
  hiMeta(f) {
    return { filename: String(f.name || ""), size_bytes: f.size || 0, content_type: f.type || "—" };
  }
  hiReset() {
    this.hiSet({ file: null, preview: null, result: null, mode: "add", blank: "ignore" });
  }
  hiTemplate() {
    try {
      const B = KIVO.BassamHistImport.templateBytes();
      KIVO.BassamXLSX.saveBytes(B, "historical_template.xlsx");
      this.bsToast("تم تحميل القالب", "ok");
    } catch (e) {
      this.bsToast("فشل تحميل القالب", "err");
    }
  }
  hiPick(e) {
    const t = e && e.target,
      f = t && t.files && t.files[0];
    try {
      t && (t.value = "");
    } catch (x) {}
    if (!f) return;
    const n = String(f.name || "").toLowerCase();
    if (!n.endsWith(".xlsx") && !n.endsWith(".xls")) {
      this.bsToast("الرجاء اختيار ملف Excel (.xlsx)", "err");
      return;
    }
    this.hiSet({ file: f, preview: null, result: null });
  }
  hiErrToast(m) {
    m = String(m || "");
    this.bsToast(m.length > 180 ? m.slice(0, 177) + "…" : m, "err");
  }
  async hiPreview() {
    const f = this.hiS().file;
    if (!f) {
      this.bsToast("الرجاء اختيار ملف أولاً", "err");
      return;
    }
    this.hiSet({ loading: !0, result: null, err: null, prog: "جارٍ تحضير الملف..." });
    let buf;
    try {
      buf = await f.arrayBuffer();
    } catch (e) {
      const m = "تعذّرت قراءة الملف من الجهاز: " + String((e && e.message) || "تعذّر الوصول إلى الملف");
      this.hiSet({ loading: !1, prog: "", err: { kind: "read", message: m, filename: String(f.name || ""), size: f.size || 0 } });
      this.hiErrToast(m);
      return;
    }
    try {
      const d = await KIVO.BassamHistImport.preview(buf, this.hiMeta(f));
      this.hiSet({ preview: d, loading: !1, prog: "" });
      this.bsToast("تم تحليل الملف بنجاح", "ok");
    } catch (e) {
      const m = String((e && (e.detail || e.message)) || "خطأ غير متوقع");
      this.hiSet({
        loading: !1,
        prog: "",
        err: { kind: "file", status: (e && e.status) || null, message: m, filename: String(f.name || ""), size: f.size || 0 },
      });
      this.hiErrToast(m);
    }
  }
  hiImportClick() {
    this._hiFocus = !0;
    "replace" === (this.hiS().mode || "add") ? this.hiSet({ cfRep: !0 }) : this.hiSet({ cfFin: !0 });
  }
  async hiDoImport() {
    const H = this.hiS(),
      f = H.file;
    if (!H.preview) {
      this.bsToast("نفّذ المعاينة أولاً", "err");
      return;
    }
    this.hiSet({ importing: !0 });
    try {
      const HI = KIVO.BassamHistImport, D = KIVO.DailyStats;
      if (!D) throw new Error("خدمة الإحصائيات غير متاحة");
      const R = KIVO.__BS_SRV;
      if (!R || !R.askReason) throw new Error("نافذة سبب الاستيراد غير متاحة");
      const reason = await new Promise(resolve => R.askReason(HI.KEY, ["sys.histimp.run"], resolve));
      if (!reason) return;
      const buf = await f.arrayBuffer(), x = await HI.execute(buf, H.mode || "add", H.blank || "ignore", this.hiMeta(f));
      if (!await D.save(x.store, { operation: "historical-import", reason: reason })) {
        this.bsToast(D.message(), "err"); return;
      }
      const res = Object.assign({}, x.res);
      delete res.activity;
      this.hiSet({ result: res });
      this.bsToast("تم — " + res.inserted + " إضافة، " + res.updated + " تحديث", "ok");
      try {
        window.dispatchEvent(new CustomEvent("daily-stats-refresh"));
      } catch (e) {}
    } catch (e) {
      this.bsToast((e && (e.detail || e.message)) || "فشل الاستيراد", "err");
    } finally {
      this.hiSet({ importing: !1 });
    }
  }
  hiNode() {
    /* الشريطُ ينزلق أفقياً: تبويبُنا آخرُه، فإن فُتح وهو مقصوصُ الطرف يُكشف كاملاً (مرّةً عند فتحه لا عند كل رسم) */
    if (!this._hiTabOn) {
      this._hiTabOn = 1;
      setTimeout(() => {
        try {
          const e = document.querySelector('[data-adm-tab="histimp"]'),
            s = e && e.parentElement;
          if (!e || !s) return;
          const a = e.getBoundingClientRect(),
            b = s.getBoundingClientRect();
          (a.left < b.left - 1 || a.right > b.right + 1) && e.scrollIntoView({ block: "nearest", inline: "nearest" });
        } catch (x) {}
      }, 80);
    }
    const h = React.createElement,
      F = React.Fragment,
      H = this.hiS(),
      file = H.file || null,
      preview = H.preview || null,
      result = H.result || null,
      err = H.err || null,
      mode = H.mode || "add",
      blank = H.blank || "ignore",
      loading = !!H.loading,
      importing = !!H.importing;
    const C = {
      fg: "var(--text-primary)",
      mu: "var(--text-secondary)",
      br: "var(--brand-primary)",
      onBr: "var(--text-on-fill)",
      good: "var(--success-text)",
      goodI: "var(--success)",
      warn: "var(--warning-text)",
      bad: "var(--danger-text)",
      bad9: "var(--danger-strong)",
      card: "var(--bg-surface)",
      card80: "var(--bg-a2552552550p8)",
      modal: "var(--bg-modal)",
      muted: "var(--bg-surface-3)",
      faint: "var(--bg-surface-2)",
      gBg: "var(--success-bg)",
      gFaint: "var(--bg-a51501050p05)",
      wBg: "var(--warning-bg)",
      wFaint: "var(--bg-a245158110p04)",
      wStrong: "var(--warning-soft)",
      rBg: "var(--danger-bg)",
      rFaint: "var(--bg-a22038380p04)",
      rFaint5: "var(--bg-a22038380p05)",
      rHead: "var(--bg-a22038380p08)",
      pBg: "var(--brand-primary)",
      p10: "var(--bg-a185151810p1)",
      p5: "var(--bg-a185151810p05)",
      danger: "var(--danger)",
      ov: "var(--bg-overlay)",
      bd: "var(--border-default)",
      bdBr: "var(--border-brand)",
      bd20: "var(--bd-a185151810p2)",
      bd30: "var(--bd-a185151810p3)",
      bd40: "var(--bd-a185151810p4)",
      bdG: "var(--success-border)",
      bdW: "var(--warning-border)",
      bdW1: "var(--bd-a245158110p2)",
      bdR: "var(--danger-border)",
      bdR1: "var(--bd-a22038380p18)",
    };
    const FF = "'Cairo',sans-serif",
      SH = "0 1px 3px 0 rgba(0,0,0,0.1),0 1px 2px -1px rgba(0,0,0,0.1)",
      SHSM = "0 1px 2px 0 rgba(0,0,0,0.05)",
      SHLG = "0 10px 15px -3px rgba(0,0,0,0.1),0 4px 6px -4px rgba(0,0,0,0.1)";
    const MODE_LABELS = {
      add: { ar: "إضافة الجديد فقط", hint: "تخطّي السجلات الموجودة سلفاً." },
      update: { ar: "تحديث الموجود وإضافة الجديد", hint: "إذا وُجد سجل بنفس (الموقع + التاريخ) سيتم تحديثه، وإلا سيُضاف." },
      replace: { ar: "استبدال الفترة المستوردة", hint: "حذف السجلات الموجودة في الأشهر/المواقع المضمّنة في الملف فقط، ثم إعادة إدخالها." },
    };
    const IC = {
      database: [
        ["ellipse", { cx: "12", cy: "5", rx: "9", ry: "3" }],
        ["path", { d: "M3 5V19A9 3 0 0 0 21 19V5" }],
        ["path", { d: "M3 12A9 3 0 0 0 21 12" }],
      ],
      download: [
        ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }],
        ["polyline", { points: "7 10 12 15 17 10" }],
        ["line", { x1: "12", x2: "12", y1: "15", y2: "3" }],
      ],
      upload: [
        ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }],
        ["polyline", { points: "17 8 12 3 7 8" }],
        ["line", { x1: "12", x2: "12", y1: "3", y2: "15" }],
      ],
      sheet: [
        ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }],
        ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
        ["path", { d: "M8 13h2" }],
        ["path", { d: "M14 13h2" }],
        ["path", { d: "M8 17h2" }],
        ["path", { d: "M14 17h2" }],
      ],
      x: [
        ["path", { d: "M18 6 6 18" }],
        ["path", { d: "m6 6 12 12" }],
      ],
      eye: [
        ["path", { d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" }],
        ["circle", { cx: "12", cy: "12", r: "3" }],
      ],
      loader: [["path", { d: "M21 12a9 9 0 1 1-6.219-8.56" }]],
      alert: [
        ["path", { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" }],
        ["path", { d: "M12 9v4" }],
        ["path", { d: "M12 17h.01" }],
      ],
      check: [
        ["circle", { cx: "12", cy: "12", r: "10" }],
        ["path", { d: "m9 12 2 2 4-4" }],
      ],
      shield: [
        [
          "path",
          {
            d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
          },
        ],
        ["path", { d: "M12 8v4" }],
        ["path", { d: "M12 16h.01" }],
      ],
      dot: [["circle", { cx: "12", cy: "12", r: "10" }]],
    };
    const ic = (n, sz, st, cls) =>
      h(
        "svg",
        {
          width: sz,
          height: sz,
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 2,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          className: cls || void 0,
          "aria-hidden": "true",
          style: Object.assign({ display: "block", flexShrink: 0 }, st || {}),
        },
        ...IC[n].map((q, i) => h(q[0], Object.assign({ key: i }, q[1]))),
      );
    const CSS =
      ".bshi-out:hover{background:var(--bg-a185151810p08)!important}.bshi-pri:hover{background:var(--bg-a185151810p85)!important}.bshi-dng:hover{opacity:.9}.bshi-lbl:hover{background:var(--bg-a185151810p05)!important}.bshi-clr:hover{color:var(--danger-text)!important}.bshi-mode:hover{background:var(--bg-surface-2)!important}.bshi-dis:hover{color:var(--danger-strong)!important}" +
      /* ring-1 في Tailwind يُضاف إلى ظلّ الزرّ ولا يستبدله: الحلقةُ ثم ظلُّ النوع (outline: ‏shadow-sm · الأساسيّ والإتلافيّ والدائرة: shadow) */
      ".bshi-btn:focus-visible,.bshi-rad:focus-visible{outline:none!important}.bshi-out:focus-visible{box-shadow:0 0 0 1px var(--border-brand)," +
      SHSM +
      "!important}.bshi-pri:focus-visible,.bshi-dng:focus-visible,.bshi-rad:focus-visible{box-shadow:0 0 0 1px var(--border-brand)," +
      SH +
      "!important}" +
      /* عناصرُ الأصل بلا فئة تركيز (مسح · إخفاء التفاصيل · صفوف مكرّرة): إطارُ القاعدة العامة في الأصل بلون الهوية */
      ".bshi-clr:focus-visible,.bshi-dis:focus-visible,.bshi-sum:focus-visible{outline-color:var(--brand-primary)!important;transition:outline-offset 120ms ease}" +
      /* شريطُ التمرير في جداول اللوحة وقائمتها كما في الأصل (٨ بكسل · مسارٌ باهت · مقبضٌ ذهبيّ) — ويُعاد scrollbar-color للآلي كي يُطبَّق */
      ".bshi-sc{scrollbar-color:auto;scrollbar-width:auto}.bshi-sc::-webkit-scrollbar{width:8px;height:8px}.bshi-sc::-webkit-scrollbar-track{background:var(--bg-surface-3);border-radius:4px}.bshi-sc::-webkit-scrollbar-thumb{background:var(--bd-a185151810p6);border-radius:4px;border:0;background-clip:border-box}.bshi-sc::-webkit-scrollbar-thumb:hover{background:var(--brand-primary)}" +
      /* التحديدُ ولمسةُ النقر كما في الأصل */
      ".bshi-root{-webkit-tap-highlight-color:transparent}.bshi-root ::selection{background:var(--bg-a185151810p25);color:var(--text-primary)}" +
      /* الجوال (≤٦٤٠) — قواعدُ الأصل العامة كما تقع على هذه اللوحة: مسافةُ ١٢ بين الكروت، عمودٌ واحد للإحصاءات، ٣٦ بكسل حدّاً أدنى للأزرار والدوائر، خلايا الجداول مضغوطةٌ بلا التفاف، شريطُ تمريرٍ ٢ بكسل */
      "@media (max-width:640px){.bshi-root{gap:12px!important}.bshi-grid,.bshi-eg{grid-template-columns:1fr!important}.bshi-root button{min-height:36px!important;min-width:36px!important}.bshi-root table th,.bshi-root table td{padding:8px!important;font-size:11.2px!important;white-space:nowrap!important}.bshi-root table th{font-size:10.4px!important}.bshi-sc::-webkit-scrollbar{width:2px;height:2px}.bshi-sc::-webkit-scrollbar-thumb{background:var(--border-default)}}" +
      ".bshi-spin{animation:bshi-spin 1s linear infinite}@keyframes bshi-spin{to{transform:rotate(360deg)}}" +
      ".bshi-grid{display:grid;gap:8px;grid-template-columns:repeat(2,minmax(0,1fr))}@media (min-width:640px){.bshi-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media (min-width:1024px){.bshi-grid{grid-template-columns:repeat(5,minmax(0,1fr))}}" +
      ".bshi-eg{display:grid;column-gap:24px;row-gap:4px;grid-template-columns:repeat(1,minmax(0,1fr))}@media (min-width:640px){.bshi-eg{grid-template-columns:repeat(2,minmax(0,1fr))}.bshi-s2{grid-column:span 2/span 2}}" +
      ".bshi-dh{text-align:center}.bshi-dc{border-radius:0}.bshi-df{display:flex;flex-direction:column-reverse}.bshi-can{margin-top:8px!important}@media (min-width:640px){.bshi-dh{text-align:left}.bshi-dc{border-radius:10px}.bshi-df{flex-direction:row;justify-content:flex-end}.bshi-df>*+*{margin-left:8px!important}.bshi-can{margin-top:0!important}}";
    /* الأزرارُ (Button: الحجمُ sm أو الافتراضي · outline · default · والإتلافيُّ) كما في الأصل */
    const btn = (o, ...kids) => {
      const sm = o.size === "sm",
        out = o.v === "outline",
        dng = o.v === "danger";
      return h(
        "button",
        {
          type: "button",
          "data-testid": o.tid,
          onClick: o.onClick,
          disabled: !!o.disabled,
          className: "bshi-btn " + (o.disabled ? "" : out ? "bshi-out" : dng ? "bshi-dng" : "bshi-pri") + (o.cls ? " " + o.cls : ""),
          "data-confirm-action": o.act ? "true" : void 0,
          style: {
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            whiteSpace: "nowrap",
            borderRadius: 8,
            fontSize: sm ? 12 : 14,
            lineHeight: sm ? "16px" : "20px",
            fontWeight: 500,
            height: sm ? 32 : 36,
            padding: sm ? "0 12px" : "8px 16px",
            boxSizing: "border-box",
            fontFamily: FF,
            transition: "color .15s,background-color .15s",
            cursor: o.disabled ? "default" : "pointer",
            opacity: o.disabled ? 0.5 : 1,
            pointerEvents: o.disabled ? "none" : "auto",
            border: out ? "1px solid " + C.bd : "0",
            background: out ? "transparent" : dng ? C.danger : C.pBg,
            color: out ? C.fg : C.onBr,
            boxShadow: out ? SHSM : SH,
            margin: 0,
          },
        },
        ...kids,
      );
    };
    /* StatPill ونبراتُها الخمس */
    const TONE = {
      default: { background: C.faint, color: C.fg },
      good: { background: C.gBg, color: C.good, boxShadow: "0 0 0 1px " + C.bdG },
      warn: { background: C.wBg, color: C.warn, boxShadow: "0 0 0 1px " + C.bdW },
      bad: { background: C.rBg, color: C.bad, boxShadow: "0 0 0 1px " + C.bdR },
      primary: { background: C.p10, color: C.br, boxShadow: "0 0 0 1px " + C.bd30 },
    };
    const pill = (label, value, tone, tid) =>
      h(
        "div",
        {
          key: tid,
          "data-testid": tid,
          style: Object.assign(
            {
              padding: "8px 12px",
              borderRadius: 10,
              fontSize: 12,
              lineHeight: "16px",
              fontFamily: FF,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              minWidth: 0,
            },
            TONE[tone || "default"],
          ),
        },
        h("span", { style: { fontWeight: 600 } }, label),
        h("span", { "data-testid": tid + "-value", style: { fontWeight: 700, fontVariantNumeric: "tabular-nums" } }, value),
      );
    /* Card · CardHeader · CardTitle · CardContent (space-y) */
    const card = (bc, bg, tid, ...kids) =>
      h(
        "div",
        { "data-testid": tid, style: { borderRadius: 12, border: "1px solid " + bc, background: bg, color: C.fg, boxShadow: SH } },
        ...kids,
      );
    const head = (pb, ...kids) =>
      h("div", { style: { display: "flex", flexDirection: "column", padding: "24px 24px " + pb + "px 24px" } }, ...kids);
    const title = (fs, lh, color, ...kids) =>
      h(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: FF,
            fontSize: fs,
            lineHeight: lh,
            fontWeight: 600,
            letterSpacing: "-0.025em",
            color: color || C.fg,
          },
        },
        ...kids,
      );
    const content = (gap, list) =>
      h(
        "div",
        { style: { padding: "0 24px 24px 24px" } },
        ...list.filter(Boolean).map((k, i) => h("div", { key: i, style: { marginTop: i ? gap : 0 } }, k)),
      );
    const fmtVal = (v) => (v === null || v === void 0 || v === "" ? "—" : typeof v === "number" ? v.toLocaleString("ar-EG") : String(v));
    const existingPill =
      mode === "add"
        ? { label: "موجود (سيُتخطّى)", tone: "default" }
        : mode === "replace"
          ? { label: "موجود (سيُحذف ويُعاد)", tone: "bad" }
          : { label: "موجود (سيُحدّث)", tone: "warn" };
    const rowActionText = (row) =>
      mode === "add" ? "تخطّي" : mode === "replace" ? "حذف ثم إدخال جديد" : row.changes ? "تحديث القيمة" : "بدون تغيير";
    const TH = { padding: "6px 8px", textAlign: "right", fontWeight: 700 },
      TD = { padding: "6px 8px" };
    const radio = (on, onPick, tid) =>
      h(
        "button",
        {
          type: "button",
          role: "radio",
          "aria-checked": on ? "true" : "false",
          "data-state": on ? "checked" : "unchecked",
          "data-testid": tid,
          className: "bshi-rad",
          onClick: (e) => {
            e.preventDefault();
            e.stopPropagation();
            onPick();
          },
          style: {
            width: 16,
            height: 16,
            minWidth: 16,
            borderRadius: 9999,
            border: "1px solid " + C.bdBr,
            color: C.br,
            boxShadow: SH,
            background: "transparent",
            padding: 0,
            margin: "2px 0 0 0",
            cursor: "pointer",
            display: "block",
            boxSizing: "border-box",
          },
        },
        on
          ? h(
              "span",
              { style: { display: "flex", alignItems: "center", justifyContent: "center", height: 14 } },
              ic("dot", 14, { fill: C.br }),
            )
          : null,
      );
    const out = [h("style", { key: "css" }, CSS)];
    /* ── كرتُ الترويسة والأدوات ── */
    out.push(
      card(
        C.bd20,
        C.card80,
        "hist-head-card",
        head(
          12,
          title(18, "28px", null, ic("database", 20, { color: C.br }), "استيراد البيانات التاريخية"),
          h(
            "p",
            { style: { margin: "6px 0 0 0", fontSize: 12, lineHeight: "16px", color: C.mu, fontFamily: FF } },
            "ارفع ملف Excel موحّد يحتوي بيانات الحرم والنبوي معاً. كل صف = يوم هجري واحد.",
          ),
        ),
        content(16, [
          h(
            "div",
            { style: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 } },
            btn(
              { tid: "hist-template-btn", v: "outline", size: "sm", onClick: () => this.hiTemplate() },
              ic("download", 16),
              "تحميل القالب",
            ),
            h(
              "label",
              {
                "data-testid": "hist-file-label",
                className: "bshi-lbl",
                style: {
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid " + C.bd30,
                  background: C.card,
                  cursor: "pointer",
                  fontSize: 14,
                  lineHeight: "20px",
                  fontFamily: FF,
                  color: C.fg,
                  transition: "all .15s",
                },
              },
              ic("sheet", 16, { color: C.br }),
              file ? file.name : "اختيار ملف Excel",
              h("input", {
                type: "file",
                accept: ".xlsx,.xls",
                hidden: !0,
                style: { display: "none" },
                onChange: (e) => this.hiPick(e),
                "data-testid": "hist-file-input",
              }),
            ),
            file
              ? h(
                  "button",
                  {
                    type: "button",
                    "data-testid": "hist-clear-btn",
                    onClick: () => this.hiReset(),
                    className: "bshi-clr",
                    style: {
                      fontSize: 12,
                      lineHeight: "16px",
                      color: C.mu,
                      fontFamily: FF,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      background: "none",
                      border: 0,
                      padding: 0,
                      margin: 0,
                      cursor: "pointer",
                      transition: "color .15s",
                    },
                  },
                  ic("x", 14),
                  "مسح",
                )
              : null,
            btn(
              { tid: "hist-preview-btn", size: "sm", onClick: () => this.hiPreview(), disabled: !file || loading },
              loading ? ic("loader", 16, null, "bshi-spin") : ic("eye", 16),
              "معاينة",
            ),
          ),
          H.prog
            ? h(
                "div",
                {
                  "data-testid": "hist-preview-progress",
                  style: {
                    fontSize: 11,
                    lineHeight: "16.5px",
                    fontFamily: FF,
                    color: C.warn,
                    background: C.wBg,
                    border: "1px solid " + C.bdW,
                    borderRadius: 8,
                    padding: "6px 10px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  },
                },
                ic("loader", 12, null, "bshi-spin"),
                H.prog,
              )
            : null,
        ]),
      ),
    );
    /* ── بطاقةُ فشل التحليل (لا خادمَ ولا Axios هنا: التحليلُ في المتصفح) ── */
    if (err) {
      const lab = (t) => h("span", { style: { fontWeight: 700 } }, t);
      out.push(
        card(
          C.bdR,
          "linear-gradient(" + C.rFaint5 + "," + C.rFaint5 + ")," + C.card,
          "hist-error-card",
          head(8, title(14, "20px", C.bad, ic("alert", 16), "فشل تحليل الملف — تفاصيل الخطأ")),
          h(
            "div",
            { style: { padding: "0 24px 24px 24px", fontSize: 12, lineHeight: "18px", fontFamily: FF, color: C.bad9 } },
            h(
              "div",
              { className: "bshi-eg" },
              h(
                "div",
                null,
                lab("نوع الخطأ:"),
                " ",
                err.kind === "read" ? "قراءة الملف (تعذّر فتحه من الجهاز)" : "تحليل الملف في المتصفح (قُرئ الملف وأرجع خطأ)",
              ),
              h("div", null, lab("HTTP status:"), " ", h("span", { style: { fontVariantNumeric: "tabular-nums" } }, "—")),
              h("div", { className: "bshi-s2" }, lab("الرسالة:"), " ", h("span", { "data-testid": "hist-error-msg" }, err.message)),
              h(
                "div",
                null,
                lab("الملف:"),
                " ",
                err.filename || "—",
                " ",
                h("span", { style: { color: C.bad, opacity: 0.7 } }, "(" + (err.size || 0).toLocaleString("ar-EG") + " بايت)"),
              ),
            ),
            h(
              "button",
              {
                type: "button",
                "data-testid": "hist-error-dismiss",
                className: "bshi-dis",
                onClick: () => this.hiSet({ err: null }),
                style: {
                  marginTop: 8,
                  fontSize: 11,
                  lineHeight: "16.5px",
                  textDecoration: "underline",
                  color: C.bad,
                  background: "none",
                  border: 0,
                  padding: 0,
                  cursor: "pointer",
                  fontFamily: FF,
                },
              },
              "إخفاء التفاصيل",
            ),
          ),
        ),
      );
    }
    /* ── تقريرُ المعاينة ── */
    if (preview) {
      const P = preview,
        errs = P.errors || [],
        dups = P.duplicates_in_file || [],
        match = P.matching_existing || [],
        unk = P.unknown_headers || [];
      const blocks = [
        h(
          "div",
          { className: "bshi-grid" },
          pill("إجمالي الصفوف", P.total_rows, "default", "stat-total"),
          pill("صالحة", P.valid_rows == null ? 0 : P.valid_rows, "good", "stat-valid"),
          pill("متجاهلة (فارغة)", P.ignored_empty_rows == null ? 0 : P.ignored_empty_rows, "default", "stat-ignored"),
          pill("سجلات الحرم", P.total_haram_records, "primary", "stat-haram"),
          pill("سجلات النبوي", P.total_nabawi_records, "primary", "stat-nabawi"),
          pill("جديد", P.new_records, "good", "stat-new"),
          pill(existingPill.label, P.existing_records, existingPill.tone, "stat-existing"),
          pill("خلايا فارغة", P.blank_cells_count, "default", "stat-blanks"),
          pill("أخطاء", P.errors_total, P.errors_total ? "bad" : "default", "stat-errors"),
          pill("مكرّر داخل الملف", P.duplicates_total, P.duplicates_total ? "bad" : "default", "stat-dups"),
          pill("السنوات", (P.years || []).join("، ") || "—", "default", "stat-years"),
          pill("الأشهر", (P.months || []).length, "default", "stat-months"),
        ),
      ];
      if (errs.length)
        blocks.push(
          h(
            "div",
            { "data-testid": "hist-errors-table", style: { borderRadius: 8, border: "1px solid " + C.bdR, background: C.rFaint } },
            h(
              "div",
              {
                style: {
                  padding: "8px 12px",
                  borderBottom: "1px solid " + C.bdR,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                },
              },
              h(
                "h4",
                {
                  style: {
                    margin: 0,
                    fontFamily: FF,
                    fontSize: 14,
                    lineHeight: "20px",
                    fontWeight: 700,
                    color: C.bad,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  },
                },
                ic("alert", 16),
                "تفاصيل الأخطاء (" + P.errors_total + " إجمالاً، عرض أول " + errs.length + ")",
              ),
            ),
            h(
              "div",
              { className: "bshi-sc", style: { overflowX: "auto", maxHeight: 288, overflowY: "auto" } },
              h(
                "table",
                { style: { width: "100%", fontSize: 12, lineHeight: "16px", fontFamily: FF, borderCollapse: "collapse", color: C.fg } },
                h(
                  "thead",
                  { style: { background: C.rHead, color: C.bad } },
                  h("tr", null, ...["الصف", "العمود", "القيمة", "السبب", "النوع"].map((t) => h("th", { key: t, style: TH }, t))),
                ),
                h(
                  "tbody",
                  null,
                  ...errs.map((e, i) =>
                    h(
                      "tr",
                      { key: i, style: { borderTop: "1px solid " + C.bdR1 } },
                      h(
                        "td",
                        { style: Object.assign({}, TD, { fontVariantNumeric: "tabular-nums", color: C.bad, fontWeight: 700 }) },
                        e.row,
                      ),
                      h(
                        "td",
                        {
                          title: e.column,
                          style: Object.assign({}, TD, {
                            maxWidth: 180,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }),
                        },
                        e.column || "—",
                      ),
                      h(
                        "td",
                        {
                          title: e.value,
                          style: Object.assign({}, TD, {
                            maxWidth: 160,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontVariantNumeric: "tabular-nums",
                          }),
                        },
                        e.value || "—",
                      ),
                      h("td", { style: TD }, e.reason),
                      h(
                        "td",
                        { style: Object.assign({}, TD, { fontSize: 10 }) },
                        h(
                          "span",
                          { style: { padding: "2px 6px", borderRadius: 4, background: C.rBg, color: C.bad } },
                          e.kind === "invalid_date" ? "تاريخ" : e.kind === "invalid_number" ? "رقم" : e.kind || "—",
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      if (unk.length)
        blocks.push(
          h(
            "div",
            {
              style: {
                background: C.wBg,
                border: "1px solid " + C.bdW,
                borderRadius: 8,
                padding: 12,
                fontSize: 12,
                lineHeight: "16px",
                fontFamily: FF,
              },
            },
            h("div", { style: { fontWeight: 700, color: C.warn, marginBottom: 4 } }, "أعمدة غير معروفة (سيتم تجاهلها):"),
            h("div", { style: { color: C.warn } }, unk.join("، ")),
          ),
        );
      if (dups.length)
        blocks.push(
          h(
            "details",
            {
              style: {
                background: C.wBg,
                border: "1px solid " + C.bdW,
                borderRadius: 8,
                padding: 12,
                fontSize: 12,
                lineHeight: "16px",
                fontFamily: FF,
                color: C.fg,
              },
            },
            h(
              "summary",
              { className: "bshi-sum", style: { cursor: "pointer", fontWeight: 700, color: C.warn } },
              "صفوف مكرّرة داخل الملف (" + P.duplicates_total + ")",
            ),
            h(
              "ul",
              { className: "bshi-sc", style: { margin: "8px 0 0 0", padding: 0, listStyle: "none", maxHeight: 160, overflowY: "auto" } },
              ...dups.map((d, i) =>
                h("li", { key: i, style: { marginTop: i ? 4 : 0 } }, "صف " + d.row + " — " + d.site + " / " + d.date_hijri),
              ),
            ),
          ),
        );
      if (match.length)
        blocks.push(
          h(
            "div",
            {
              "data-testid": "hist-matching-existing-table",
              style: { borderRadius: 8, border: "1px solid " + C.bdW, background: C.wFaint },
            },
            h(
              "div",
              {
                style: {
                  padding: "8px 12px",
                  borderBottom: "1px solid " + C.bdW,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                },
              },
              h(
                "h4",
                {
                  style: {
                    margin: 0,
                    fontFamily: FF,
                    fontSize: 14,
                    lineHeight: "20px",
                    fontWeight: 700,
                    color: C.warn,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  },
                },
                ic("database", 16),
                "السجلات الموجودة المطابقة (" + P.matching_existing_total + " إجمالاً، عرض أول " + match.length + ")",
              ),
              h(
                "span",
                {
                  style: {
                    fontSize: 10,
                    lineHeight: "15px",
                    fontFamily: FF,
                    color: C.warn,
                    background: C.wBg,
                    padding: "2px 8px",
                    borderRadius: 4,
                  },
                },
                "وضع: " + MODE_LABELS[mode].ar,
              ),
            ),
            h(
              "div",
              { className: "bshi-sc", style: { overflowX: "auto", maxHeight: 320, overflowY: "auto" } },
              h(
                "table",
                { style: { width: "100%", fontSize: 12, lineHeight: "16px", fontFamily: FF, borderCollapse: "collapse", color: C.fg } },
                h(
                  "thead",
                  { style: { background: C.wBg, color: C.warn, position: "sticky", top: 0 } },
                  h(
                    "tr",
                    null,
                    ...["التاريخ الهجري", "الموقع", "الحقل", "القيمة الحالية", "قيمة Excel", "الإجراء"].map((t) =>
                      h("th", { key: t, style: TH }, t),
                    ),
                  ),
                ),
                h(
                  "tbody",
                  null,
                  ...match.map((row, i) =>
                    h(
                      "tr",
                      { key: i, style: { borderTop: "1px solid " + C.bdW1 } },
                      h(
                        "td",
                        { style: Object.assign({}, TD, { fontVariantNumeric: "tabular-nums", fontWeight: 700, color: C.warn }) },
                        row.date_hijri,
                      ),
                      h("td", { style: TD }, row.site_label),
                      h("td", { style: TD }, row.field_label),
                      h("td", { style: Object.assign({}, TD, { fontVariantNumeric: "tabular-nums" }) }, fmtVal(row.current_value)),
                      h(
                        "td",
                        { style: Object.assign({}, TD, { fontVariantNumeric: "tabular-nums", fontWeight: 700 }) },
                        fmtVal(row.excel_value),
                      ),
                      h(
                        "td",
                        { style: Object.assign({}, TD, { fontSize: 10 }) },
                        h(
                          "span",
                          {
                            style: Object.assign(
                              { padding: "2px 6px", borderRadius: 4 },
                              mode === "replace"
                                ? { background: C.rBg, color: C.bad }
                                : mode === "add"
                                  ? { background: C.muted, color: C.mu }
                                  : row.changes
                                    ? { background: C.wStrong, color: C.warn }
                                    : { background: C.muted, color: C.mu },
                            ),
                          },
                          rowActionText(row),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      /* وضعُ الاستيراد (RadioGroup: grid gap-2 مع space-y-2) والخلايا الفارغة (gap-2 مع space-y-1.5) — ومجموعتا الأزرار الدائرية
   في الأصل من Radix واتجاهُهما ltr افتراضياً (الدائرةُ يساراً والنصُّ بعدها)، فتُنقلان كذلك */
      /* العنوانان في الأصل <label> سطريٌّ داخل كتلةٍ بخطّ الصفحة (Tajawal ‏16/24): سطرُه ٢٥ بكسل وخطُّ القاعدة على ١٥ — وفي Windows (مقاييس win للخط) ٢٤ و١٧ —
   فيُثبَّت هنا ارتفاعُ السطر وموضعُ النص صراحةً كي يطابقا الأصلَ على كل جهاز */
      const WINF = /Windows/.test(navigator.userAgent || "");
      const modeKids = [
        h(
          "div",
          { key: "l", style: { position: "relative", height: WINF ? 24 : 25 } },
          h(
            "label",
            {
              style: {
                position: "absolute",
                top: WINF ? -1 : -3,
                right: 0,
                whiteSpace: "nowrap",
                fontFamily: FF,
                fontSize: 14,
                lineHeight: "26px",
                fontWeight: 700,
                color: C.fg,
              },
            },
            "وضع الاستيراد",
          ),
        ),
        h(
          "div",
          { key: "g", role: "radiogroup", dir: "ltr", "data-testid": "hist-mode-group", style: { display: "grid", gap: 8, marginTop: 12 } },
          ...Object.keys(MODE_LABELS).map((k, i) => {
            const v = MODE_LABELS[k],
              on = mode === k,
              pick = () => this.hiSet({ mode: k });
            return h(
              "label",
              {
                key: k,
                "data-testid": "hist-mode-" + k,
                onClick: pick,
                className: on ? "" : "bshi-mode",
                style: {
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid " + (on ? C.bd40 : C.bd),
                  background: on ? C.p5 : "transparent",
                  cursor: "pointer",
                  transition: "all .15s",
                  marginTop: i ? 8 : 0,
                },
              },
              radio(on, pick, "hist-mode-radio-" + k),
              h(
                "div",
                { style: { flex: 1, minWidth: 0 } },
                h("div", { style: { fontFamily: FF, fontSize: 14, lineHeight: "20px", fontWeight: 600, color: C.fg } }, v.ar),
                h("div", { style: { fontFamily: FF, fontSize: 11, lineHeight: "16.5px", color: C.mu } }, v.hint),
              ),
            );
          }),
        ),
      ];
      if (mode === "update")
        modeKids.push(
          h(
            "div",
            { key: "b", "data-testid": "hist-blank-handling", style: { background: C.faint, borderRadius: 8, padding: 12, marginTop: 12 } },
            h(
              "div",
              { style: { position: "relative", height: 24 } },
              h(
                "label",
                {
                  style: {
                    position: "absolute",
                    top: WINF ? 1 : -2,
                    right: 0,
                    whiteSpace: "nowrap",
                    fontFamily: FF,
                    fontSize: 12,
                    lineHeight: "23px",
                    fontWeight: 700,
                    color: C.fg,
                  },
                },
                "الخلايا الفارغة في الملف",
              ),
            ),
            h(
              "div",
              { role: "radiogroup", dir: "ltr", style: { display: "grid", gap: 8, marginTop: 8 } },
              ...[
                ["ignore", "تجاهلها", " — احتفظ بالقيم الموجودة (افتراضي)."],
                ["clear", "امسحها", " — استبدل الموجود بـ null."],
              ].map((q, i) => {
                const on = blank === q[0],
                  pick = () => this.hiSet({ blank: q[0] });
                return h(
                  "label",
                  {
                    key: q[0],
                    "data-testid": "hist-blank-" + q[0],
                    onClick: pick,
                    style: {
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      cursor: "pointer",
                      fontSize: 12,
                      lineHeight: "16px",
                      fontFamily: FF,
                      color: C.fg,
                      marginTop: i ? 6 : 0,
                    },
                  },
                  radio(on, pick, "hist-blank-radio-" + q[0]),
                  h("span", null, h("span", { style: { fontWeight: 600 } }, q[1]), q[2]),
                );
              }),
            ),
          ),
        );
      blocks.push(h("div", { style: { borderTop: "1px solid " + C.bd, paddingTop: 16 } }, ...modeKids));
      blocks.push(
        h(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 12, paddingTop: 8 } },
          btn(
            { tid: "hist-import-btn", onClick: () => this.hiImportClick(), disabled: importing || P.errors_total > 0 },
            importing ? ic("loader", 16, null, "bshi-spin") : ic("upload", 16),
            "تنفيذ الاستيراد",
          ),
          P.errors_total > 0
            ? h(
                "span",
                {
                  style: { fontSize: 12, lineHeight: "16px", color: C.bad, fontFamily: FF, display: "flex", alignItems: "center", gap: 4 },
                },
                ic("alert", 14),
                "أصلح الأخطاء أولاً قبل التنفيذ",
              )
            : null,
        ),
      );
      out.push(
        card(
          C.bd20,
          C.card,
          "hist-preview-card",
          head(12, title(16, "24px", null, ic("check", 16, { color: C.goodI }), "تقرير المعاينة")),
          content(16, blocks),
        ),
      );
    }
    /* ── النتيجة ── */
    if (result) {
      const R = result;
      out.push(
        card(
          C.bdG,
          "linear-gradient(" + C.gFaint + "," + C.gFaint + ")," + C.card,
          "hist-result-card",
          head(12, title(16, "24px", C.good, ic("check", 16), "تم الاستيراد")),
          h(
            "div",
            { style: { padding: "0 24px 24px 24px" } },
            h(
              "div",
              { className: "bshi-grid" },
              pill("مُضاف", R.inserted, "good", "res-inserted"),
              pill("مُحدّث", R.updated, "primary", "res-updated"),
              pill("مُتخطّى", R.skipped, "default", "res-skipped"),
              pill("محذوف", R.deleted, R.deleted ? "warn" : "default", "res-deleted"),
              pill("أخطاء", R.errors_total, R.errors_total ? "bad" : "default", "res-errors"),
              pill("المواقع", (R.affected_sites || []).join("، ") || "—", "default", "res-sites"),
              pill("السنوات", (R.affected_years || []).join("، ") || "—", "default", "res-years"),
              pill("الأشهر", (R.affected_months || []).length || 0, "default", "res-months"),
            ),
          ),
        ),
      );
    }
    /* ── الحواران (AlertDialog): التركيزُ على زرّ التأكيد · Enter يؤكّد · Escape يُلغي · النقرُ خارجَ البطاقة لا يُغلق ── */
    const dialog = (tid, onClose, onOk, titleColor, titleText, desc, okText, okV, okTid, cancelTid) => {
      const pick = (root) => root && root.querySelector('[data-confirm-action="true"]');
      const grab = (el) => {
        if (!el || !this._hiFocus) return;
        this._hiFocus = !1;
        const f = () => {
          try {
            const b = pick(el);
            b && b.isConnected && b.focus({ preventScroll: !0 });
          } catch (e) {}
        };
        f();
        setTimeout(f, 60);
      };
      return h(
        "div",
        {
          onMouseDown: (e) => {
            e.target === e.currentTarget && e.preventDefault();
          },
          onClick: (e) => {
            e.target === e.currentTarget && e.nativeEvent && !e.nativeEvent.isTrusted && onClose();
          },
          style: {
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 70,
            background: C.ov,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          },
        },
        h(
          "div",
          {
            role: "alertdialog",
            "aria-modal": "true",
            dir: "rtl",
            "data-testid": tid,
            ref: grab,
            className: "bshi-dc",
            onKeyDown: (e) => {
              if (e.key === "Enter" && !e.shiftKey && e.target && e.target.tagName !== "TEXTAREA") {
                const b = pick(e.currentTarget);
                if (b && !b.disabled) {
                  e.preventDefault();
                  b.click();
                }
              } else if (e.key === "Escape") {
                e.preventDefault();
                onClose();
              }
            },
            style: {
              display: "grid",
              gap: 16,
              width: "100%",
              maxWidth: 512,
              boxSizing: "border-box",
              border: "1px solid " + C.bd,
              background: C.modal,
              padding: 24,
              boxShadow: SHLG,
              color: C.fg,
              fontSize: 16,
              lineHeight: "24px",
            },
          },
          h(
            "div",
            { className: "bshi-dh", style: { display: "flex", flexDirection: "column" } },
            h(
              "h2",
              {
                style: {
                  margin: 0,
                  fontSize: 18,
                  lineHeight: "28px",
                  fontWeight: 600,
                  fontFamily: FF,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: titleColor,
                },
              },
              ic("shield", 20),
              titleText,
            ),
            h("div", { style: { marginTop: 8, fontSize: 14, lineHeight: "20px", color: C.mu, fontFamily: FF } }, ...desc),
          ),
          h(
            "div",
            { className: "bshi-df" },
            btn({ tid: cancelTid, v: "outline", cls: "bshi-can", onClick: onClose }, "إلغاء"),
            btn(
              {
                tid: okTid,
                v: okV,
                act: !0,
                onClick: () => {
                  onOk();
                },
              },
              okText,
            ),
          ),
        ),
      );
    };
    if (H.cfRep && preview) {
      const P = preview,
        sites = P.sample_changes ? Array.from(new Set(P.sample_changes.map((s) => s.site))).join("، ") : "";
      out.push(
        dialog(
          "hist-replace-confirm",
          () => this.hiSet({ cfRep: !1 }),
          () => {
            this.hiSet({ cfRep: !1 });
            this.hiDoImport();
          },
          C.bad,
          "تأكيد استبدال الفترة",
          [
            h(
              "span",
              { key: 1, style: { display: "block" } },
              "سيتم ",
              h("span", { style: { fontWeight: 700, color: C.bad } }, "حذف"),
              " كل السجلات الموجودة في:",
            ),
            h(
              "span",
              {
                key: 2,
                style: {
                  display: "block",
                  marginTop: 8,
                  background: C.rBg,
                  border: "1px solid " + C.bdR,
                  borderRadius: 4,
                  padding: 8,
                  color: C.bad,
                  fontSize: 12,
                  lineHeight: "16px",
                },
              },
              "المواقع: " + sites,
              h("br"),
              "الأشهر: " + (P.months || []).join("، "),
            ),
            h(
              "span",
              { key: 3, style: { display: "block", marginTop: 8 } },
              "ثم إعادة إدخال السجلات من هذا الملف. هذه العملية لا يمكن التراجع عنها — يرجى التأكد قبل المتابعة.",
            ),
          ],
          "تأكيد الحذف والاستبدال",
          "danger",
          "hist-replace-confirm-yes",
          "hist-replace-confirm-cancel",
        ),
      );
    }
    if (H.cfFin && preview) {
      const P = preview,
        row = (label, val, color, tid, first) =>
          h(
            "span",
            { key: tid, style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: first ? 0 : 4 } },
            h("span", null, label),
            h("span", { "data-testid": tid, style: { fontWeight: 700, fontVariantNumeric: "tabular-nums", color: color } }, val),
          );
      out.push(
        dialog(
          "hist-final-confirm",
          () => this.hiSet({ cfFin: !1 }),
          () => {
            this.hiSet({ cfFin: !1 });
            this.hiDoImport();
          },
          C.br,
          "تأكيد تنفيذ الاستيراد",
          [
            h(
              "span",
              { key: 1, style: { display: "block" } },
              "الوضع المختار: ",
              h("span", { style: { fontWeight: 700 } }, MODE_LABELS[mode].ar),
            ),
            h(
              "span",
              {
                key: 2,
                style: {
                  display: "block",
                  marginTop: 12,
                  background: C.faint,
                  border: "1px solid " + C.bd,
                  borderRadius: 4,
                  padding: 12,
                  fontSize: 12,
                  lineHeight: "16px",
                },
              },
              row("سجلات سيتم إضافتها:", P.new_records == null ? 0 : P.new_records, C.good, "final-confirm-add", !0),
              row(
                "سجلات موجودة (" + (mode === "add" ? "ستُتخطّى" : mode === "replace" ? "ستُحذف وتُعاد" : "ستُحدّث") + "):",
                P.existing_records == null ? 0 : P.existing_records,
                mode === "add" ? C.mu : C.warn,
                "final-confirm-existing",
              ),
              row("صفوف فارغة (ستُتجاهل):", P.ignored_empty_rows == null ? 0 : P.ignored_empty_rows, C.mu, "final-confirm-ignored"),
              row("أخطاء:", P.errors_total == null ? 0 : P.errors_total, P.errors_total ? C.bad : C.mu, "final-confirm-errors"),
            ),
            h(
              "span",
              { key: 3, style: { display: "block", marginTop: 12, fontSize: 12, lineHeight: "16px", color: C.mu } },
              "هل تريد المتابعة؟",
            ),
          ],
          "تأكيد التنفيذ",
          "primary",
          "hist-final-confirm-yes",
          "hist-final-confirm-cancel",
        ),
      );
    }
    return h(
      "div",
      {
        dir: "rtl",
        "data-testid": "historical-import-panel",
        className: "bshi-root",
        style: { display: "flex", flexDirection: "column", gap: 24, fontFamily: FF, color: C.fg },
      },
      ...out.map((k, i) => h(F, { key: i }, k)),
    );
  }
  audNode() {
    const A = KIVO.BassamAudit,
      h = React.createElement;
    if (!A) return null;
    const S = this.state.aud || {},
      F = S.f || {},
      sc = this.audScope(),
      rows = S.rows || [],
      st = this.state;
    const IN =
      "height:32px;border:1px solid var(--border-default);border-radius:9px;padding:0 10px;font-size:11.5px;font-family:'Cairo',sans-serif;background:var(--bg-input);color:var(--text-primary);outline:none;box-sizing:border-box";
    const inp = (k, ph, w, type, lbl) =>   /* KIVO_263 · AUD-020: اسمٌ مقروء لكل حقل تصفية (حقلا التاريخ بلا نصٍّ إرشادي) */
      h("input", {
        key: k,
        type: type || "text",
        value: F[k] || "",
        placeholder: ph,
        "aria-label": lbl || ph || k,
        onChange: (t) => this.audSetF(k, t.target.value),
        style: { ...this._audCss(IN), width: w || 130 },
      });
    const chip = (on, txt, go, key) =>
      h(
        "button",
        {
          key: key,
          onClick: go,
          style: {
            height: 26,
            display: "inline-flex",
            alignItems: "center",
            padding: "0 10px",
            borderRadius: 9999,
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
            fontFamily: "'Cairo',sans-serif",
            border: "1px solid " + (on ? "var(--brand-primary)" : "var(--border-default)"),
            background: on ? "var(--brand-primary)" : "var(--bg-card)",
            color: on ? "var(--text-on-brand)" : "var(--text-secondary)",
          },
        },
        txt,
      );
    const users = {};
    rows.forEach((r) => {
      if (r.uid && !users[r.uid]) users[r.uid] = r.name || r.un || r.uid;
    });
    const depts = sc.site && KIVO.BassamDepts ? KIVO.BassamDepts.list() : [];
    const sel = (k, opts, ph, w, lbl) =>
      h(
        "select",
        {
          key: k,
          "aria-label": lbl || ph,   /* KIVO_263 · AUD-020: select-name */
          value: F[k] || "",
          onChange: (t) => this.audSetF(k, t.target.value),
          style: { ...this._audCss(IN), width: w || 150, cursor: "pointer" },
        },
        [h("option", { key: "_", value: "" }, ph)].concat(opts.map((o) => h("option", { key: o[0], value: o[0] }, o[1]))),
      );
    const ACT_C = {
      created: "var(--success-text)",
      deleted: "var(--danger-text)",
      edited: "var(--info-text)",
      geometry_changed: "var(--info-text)",
      moved: "var(--info-text)",
      enabled: "var(--success-text)",
      disabled: "var(--warning-text)",
      status_changed: "var(--warning-text)",
      reassigned: "var(--plum-text)",
      approved: "var(--brand-text)",
      approval_revoked: "var(--warning-text)",
      locked: "var(--text-muted)",
      unlocked: "var(--text-muted)",
      completed: "var(--success-text)",
      declined: "var(--danger-text)",
      restore: "var(--brand-text)",
      import: "var(--brand-text)",
      reset: "var(--danger-text)",
      bulk: "var(--text-muted)",
      synced: "var(--info-text)",
    };
    const head = h(
      "div",
      {
        key: "hd",
        style: {
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 18px",
          borderBottom: "1px solid var(--border-subtle)",
          flexWrap: "wrap",
        },
      },
      h(
        "div",
        {
          style: {
            width: 36,
            height: 36,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--brand-soft)",
            color: "var(--brand-fg)",
            flexShrink: 0,
          },
        },
        h(
          "svg",
          {
            width: 18,
            height: 18,
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: 2,
            strokeLinecap: "round",
            strokeLinejoin: "round",
          },
          h("path", { d: "M12 8v4l3 3" }),
          h("circle", { cx: 12, cy: 12, r: 10 }),
        ),
      ),
      h(
        "div",
        { style: { flex: 1, minWidth: 180 } },
        h("div", { style: { fontSize: 14, fontWeight: 700, color: "var(--text-primary)" } }, "سجل الأنشطة والتغييرات"),
        h(
          "div",
          { style: { fontSize: 10.5, color: "var(--text-muted)", marginTop: 2 } },
          "كلُّ فعلٍ تشغيليّ على كيانات المنصة — يبقى بعد حذف الكيان · الفاعلُ والوقتُ من الخادم · " +
            (sc.site ? (sc.dept ? "إدارة واحدة" : "كل الإدارات") : "إدارتك"),
        ),
      ),
      S.newN
        ? h(
            "button",
            {
              onClick: () => this.audLoad(!0),
              style: {
                height: 30,
                padding: "0 12px",
                borderRadius: 9999,
                border: "1px solid var(--brand-primary)",
                background: "var(--brand-soft)",
                color: "var(--brand-text)",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'Cairo',sans-serif",
              },
            },
            "تحديثات جديدة من الفريق — تحديث",
          )
        : null,
      h(
        "button",
        {
          onClick: () => this.audLoad(!0),
          title: "تحديث السجل",
          style: {
            height: 30,
            padding: "0 12px",
            borderRadius: 9,
            border: "1px solid var(--border-default)",
            background: "var(--bg-card)",
            color: "var(--text-secondary)",
            fontSize: 11,
            cursor: "pointer",
            fontFamily: "'Cairo',sans-serif",
          },
        },
        "تحديث",
      ),
      h(
        "button",
        {
          onClick: () => this.audExport(),
          style: {
            height: 30,
            padding: "0 12px",
            borderRadius: 9,
            border: "1px solid var(--border-default)",
            background: "var(--bg-card)",
            color: "var(--text-secondary)",
            fontSize: 11,
            cursor: "pointer",
            fontFamily: "'Cairo',sans-serif",
          },
        },
        "تصدير CSV",
      ),
    );
    const filters = h(
      "div",
      {
        key: "ft",
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "10px 18px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-surface-2)",
        },
      },
      h(
        "div",
        { style: { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" } },
        [chip(!F.etype, "كل الكيانات", () => this.audSetF("etype", ""), "e_")].concat(
          A.ET_FILTER.map((o) => chip(F.etype === o[0], o[1], () => this.audSetF("etype", F.etype === o[0] ? "" : o[0]), "e" + o[0])),
        ),
      ),
      h(
        "div",
        { style: { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" } },
        [chip(!F.act, "كل الأفعال", () => this.audSetF("act", ""), "a_")].concat(
          A.ACT_FILTER.map((o) => chip(F.act === o[0], o[1], () => this.audSetF("act", F.act === o[0] ? "" : o[0]), "a" + o[0])),
        ),
      ),
      h("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" } }, [
        sc.site
          ? h(
              "select",
              {
                key: "dept",
                "aria-label": "تصفية بالإدارة",   /* KIVO_263 · AUD-020: select-name */
                value: S.dept || "",
                onChange: (t) => this.setState({ aud: { ...S, dept: t.target.value, open: null } }, () => this.audLoad(!0)),
                style: { ...this._audCss(IN), width: 170, cursor: "pointer" },
              },
              [h("option", { key: "_", value: "" }, "كل الإدارات")].concat(
                depts.map((d) => h("option", { key: d.id, value: d.id }, d.name || d.id)),
              ),
            )
          : null,
        sel(
          "uid",
          Object.keys(users).map((u) => [u, users[u]]),
          "كل المستخدمين",
          150,
          "تصفية بالمستخدم",
        ),
        inp("q", "بحث بالاسم أو المعرّف", 170),
        inp("site", "الموقع", 120),
        inp("plan", "الشهر (1448-4)", 110),
        inp("day", "اليوم (1448-4-10)", 120),
        h("span", { key: "fl", style: { fontSize: 10.5, color: "var(--text-muted)" } }, "من"),
        inp("from", "", 130, "date", "من تاريخ"),
        h("span", { key: "tl", style: { fontSize: 10.5, color: "var(--text-muted)" } }, "إلى"),
        inp("to", "", 130, "date", "إلى تاريخ"),
        F.etype || F.act || F.uid || F.q || F.site || F.plan || F.day || F.from || F.to
          ? h(
              "button",
              {
                key: "clr",
                onClick: () => this.setState({ aud: { ...S, f: {}, open: null } }, () => this.audLoad(!0)),
                style: {
                  height: 28,
                  padding: "0 10px",
                  borderRadius: 9,
                  border: "1px solid var(--border-default)",
                  background: "var(--bg-card)",
                  color: "var(--text-muted)",
                  fontSize: 10.5,
                  cursor: "pointer",
                  fontFamily: "'Cairo',sans-serif",
                },
              },
              "مسح المرشّحات",
            )
          : null,
      ]),
    );
    const dn = (id) => {
      const d = depts.filter((x) => x.id === id)[0];
      return d ? d.name || id : id;
    };
    const list = rows.map((r) => {
      const v = A.rowVM(r),
        open = S.open === r.id,
        c = ACT_C[r.act] || "var(--text-secondary)";
      return h(
        "div",
        { key: "r" + r.id, style: { borderTop: "1px solid var(--border-subtle)" } },
        h(
          "div",
          {
            onClick: () => this.setState({ aud: { ...this.state.aud, open: open ? null : r.id } }),
            style: {
              display: "grid",
              gridTemplateColumns: "28px 1fr 150px 150px",
              alignItems: "center",
              gap: 10,
              padding: "8px 16px",
              fontSize: 12,
              cursor: "pointer",
              background: open ? "var(--selected-bg)" : "transparent",
            },
          },
          h(
            "span",
            {
              style: {
                width: 26,
                height: 26,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "color-mix(in srgb," + c + " 12%,transparent)",
                color: c,
                fontSize: 12,
                fontWeight: 800,
              },
            },
            r.act === "deleted" ? "×" : r.act === "created" ? "+" : r.act === "approved" ? "✓" : "•",
          ),
          h(
            "div",
            { style: { minWidth: 0 } },
            h(
              "div",
              { style: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" } },
              h("span", { style: { fontWeight: 600, color: "var(--text-primary)" } }, v.act),
              v.deleted
                ? h(
                    "span",
                    {
                      style: {
                        padding: "0 6px",
                        borderRadius: 6,
                        fontSize: 9.5,
                        fontWeight: 700,
                        background: "var(--danger-bg)",
                        color: "var(--danger-text)",
                        border: "1px solid var(--danger-border)",
                      },
                    },
                    "محذوف",
                  )
                : null,
              h(
                "span",
                {
                  style: {
                    padding: "0 6px",
                    borderRadius: 6,
                    fontSize: 9.5,
                    background: "var(--bg-surface-3)",
                    color: "var(--text-muted)",
                  },
                },
                A.ET_AR[r.etype] || r.etype,
              ),
            ),
            h(
              "div",
              { style: { fontSize: 10, color: "var(--text-muted)", marginTop: 1 } },
              [v.ctx, sc.site && r.dept ? dn(r.dept) : "", "dataset" === r.etype || "system" === r.etype ? "" : "المعرّف " + r.eid]
                .filter(Boolean)
                .join(" · "),
            ),
          ),
          h(
            "div",
            {
              style: { fontSize: 11, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
              title: v.by,
            },
            v.by,
          ),
          h(
            "div",
            {
              style: { fontSize: 10.5, color: "var(--text-muted)", whiteSpace: "nowrap", fontFeatureSettings: "'tnum'" },
              title: new Date(r.ts).toLocaleString("ar-SA"),
            },
            v.date + " · " + v.t,
          ),
        ),
        open
          ? h(
              "div",
              { style: { padding: "6px 16px 12px 54px", background: "var(--bg-surface-2)", fontSize: 11, color: "var(--text-secondary)" } },
              v.details.length
                ? h(
                    "div",
                    { style: { display: "grid", gridTemplateColumns: "140px 1fr 1fr", gap: "4px 10px", alignItems: "start" } },
                    [
                      h("span", { key: "h1", style: { fontWeight: 700, color: "var(--text-muted)", fontSize: 10 } }, "الحقل"),
                      h("span", { key: "h2", style: { fontWeight: 700, color: "var(--text-muted)", fontSize: 10 } }, "قبل"),
                      h("span", { key: "h3", style: { fontWeight: 700, color: "var(--text-muted)", fontSize: 10 } }, "بعد"),
                    ].concat(
                      v.details
                        .map((d, i) => [
                          h("span", { key: "f" + i, style: { color: "var(--text-primary)", fontWeight: 600 } }, d.f),
                          h("span", { key: "a" + i, style: { color: "var(--text-muted)", wordBreak: "break-word" } }, d.from || "—"),
                          h("span", { key: "b" + i, style: { color: "var(--text-primary)", wordBreak: "break-word" } }, d.to || "—"),
                        ])
                        .reduce((a, b) => a.concat(b), []),
                    ),
                  )
                : h("div", { style: { color: "var(--text-faint)" } }, "لا تفاصيل إضافية"),
              h(
                "div",
                { style: { marginTop: 8, fontSize: 10, color: "var(--text-faint)", display: "flex", gap: 12, flexWrap: "wrap" } },
                h("span", null, "الكيان: " + (r.ename || "—") + " · المعرّف " + r.eid),
                h("span", null, "المصدر: " + (KIVO.BassamKeyLabels ? KIVO.BassamKeyLabels.label(r.k) : r.k) + " · نسخة #" + r.rev),
                v.dev || v.city ? h("span", null, [v.dev, v.city].filter(Boolean).join(" · ")) : null,
                h("span", null, "رقم الحدث " + r.id),
              ),
            )
          : null,
      );
    });
    const foot = h(
      "div",
      {
        key: "ft2",
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          borderTop: "1px solid var(--border-subtle)",
          fontSize: 11,
          color: "var(--text-muted)",
        },
      },
      h("span", null, KIVO.BassamCount(rows.length, "حدث") + "" + (S.next ? " — يوجد المزيد" : "")),
      S.next
        ? h(
            "button",
            {
              onClick: () => this.audLoad(!1),
              disabled: !!S.loading,
              style: {
                height: 30,
                padding: "0 14px",
                borderRadius: 9,
                border: "1px solid var(--border-default)",
                background: "var(--bg-card)",
                color: "var(--text-secondary)",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "'Cairo',sans-serif",
              },
            },
            S.loading ? "جارٍ التحميل…" : "تحميل المزيد",
          )
        : null,
    );
    return h(
      "div",
      {
        style: {
          background: "var(--bg-card)",
          border: "1px solid var(--border-default)",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "var(--shadow-card)",
        },
      },
      head,
      filters,
      S.err
        ? h(
            "div",
            { className: "bs-retry", role: "alert" },
            h("span", { className: "m" }, "⚠ " + S.err + " — تحقّق من الاتصال ثم أعد المحاولة"),
            h("button", { type: "button", className: "b", onClick: () => this.audLoad(!0) }, "↻ أعد المحاولة"),
          )
        : null,
      rows.length
        ? h("div", null, list)
        : h(
            "div",
            { style: { padding: "28px 18px", textAlign: "center", fontSize: 12, color: "var(--text-faint)" } },
            S.loading ? "جارٍ التحميل…" : S.loaded ? "لا أحداث تطابق المرشّحات" : "—",
          ),
      foot,
    );
  }
  _audCss(t) {
    const o = {};
    return (
      String(t)
        .split(";")
        .forEach((s) => {
          const i = s.indexOf(":");
          if (i < 0) return;
          const k = s
              .slice(0, i)
              .trim()
              .replace(/-([a-z])/g, (a, b) => b.toUpperCase()),
            v = s.slice(i + 1).trim();
          o[k] = KIVO.__bsTokVal ? KIVO.__bsTokVal(k, v) : v;
        }),
      o
    );
  }
  /* الفحص العميق 2026-10-21 (R1 · AUX-06): التبويبُ المطلوب — الجرسُ و«مدير النظام» (__ADMIN_OPEN_TAB) وعنوانُ #/admin/<tab> (__ADMIN_OPEN_DTAB) —
     يُقرأ قبل حساب التبويب المعروض ويُثبَّت في الحالة متزامناً، فأولُ رسمٍ هو التبويبُ المطلوب نفسُه. كان setTimeout(setState) فيُرسم
     «النسخة الاحتياطية» أولاً ويُكتب #/admin/backup في العنوان ثم يُبدَّل. التحميلُ وحده بعد الرسم: adGo · وسجلُّ الحركة (audLoad) مرةً
     حين يُطلب أو حين يكون أولَ ما يُعرض ولم يُحمَّل بعد (تبويبٌ مزروعٌ من حالة العرض). i: النمط (dept|site) · n: مدير النظام في نمط المنصة
     · p: تبويباتُ مدير النظام · g: تبويباتُ الإعدادات المتاحة. يُعيد {l: تبويبَ مدير النظام المطلوب, h: تبويبَ الإعدادات المعروض} */
  _admTabsNow(i, n, p, g) {
    const e = this.state;
    let l = e.admTab,
      dq = null;
    try {
      if (KIVO.__ADMIN_OPEN_TAB && n) {
        const q = (l = KIVO.__ADMIN_OPEN_TAB);
        KIVO.__ADMIN_OPEN_TAB = null;
        p.includes(q) && q !== e.admTab && (this.state = { ...this.state, admTab: q });
        setTimeout(() => this.adGo(q), 0);
      }
    } catch(t) { /* لا يمنع العرض — يُتجاوز بصمت */ }
    try {
      "dept" === i && KIVO.__ADMIN_OPEN_DTAB && ((dq = KIVO.__ADMIN_OPEN_DTAB), (KIVO.__ADMIN_OPEN_DTAB = null));
    } catch(t) { /* لا يمنع العرض — يُتجاوز بصمت */ }
    const dt = dq && g.includes(dq) ? dq : e.deptTab,
      h = g.includes(dt) ? dt : g[0] || "backup";
    dt !== e.deptTab && (this.state = { ...this.state, deptTab: dt });
    try {
      const first = !this.__bsAudBoot,
        A = this.state.aud;
      this.__bsAudBoot = 1;
      "dept" === i &&
        "oplog" === h &&
        (("oplog" === dq && "oplog" !== e.deptTab) || (first && (!A || (!A.loaded && !A.loading)))) &&
        setTimeout(() => this.audLoad(!0), 0);
    } catch(t) { /* لا يمنع العرض — يُتجاوز بصمت */ }
    return { l: l, h: h };
  }
  renderVals() {
    const t = this._adPermVals(),
      e = this.state,
      s = !(!KIVO.BassamAuth || !KIVO.BassamAuth.isSuper());
    return {
      ...(() => {
        const t = (t) =>
            "position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 16px;border-radius:12px;transition:all .3s;flex-shrink:0;min-width:110px;cursor:pointer;font-family:'Cairo',sans-serif;" +
            (t
              ? "background:var(--bg-xffffff);box-shadow:0 3px 10px -4px rgba(138,111,53,0.45);border:2px solid var(--bd-a185151810p45)"
              : "background:transparent;border:2px solid transparent"),
          a = (t) =>
            "width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;transition:all .3s;" +
            (t
              ? "background:var(--bg-a185151810p1);color:var(--fg-xb99751)"
              : "background:var(--bg-a2452452450p9);color:var(--fg-x94a3b8)"),
          r = (t) =>
            "font-size:12px;transition:color .3s;" +
            (t ? "font-weight:600;color:var(--fg-xb99751)" : "font-weight:400;color:var(--fg-x53565a)"),
          i = "undefined" != typeof window && "site" === KIVO.__ADMIN_MODE ? "site" : "dept",
          n = "site" === i && s,
          o = n && !(!window.__BS_BOOT || !window.__BS_BOOT.cf),
          p = n
            ? o
              ? ["overview", "sec", "users", "perms", "plat", "depts", "oplog", "backup", "histimp"]
              : ["plat", "depts", "backup", "histimp"]
            : ["backup"];
        const c = !(!window.__BS_BOOT || !window.__BS_BOOT.cf),
          g = ["backup", "oplog", "shifts", "ptpls", "import"]
            .filter((t) => {
              try {
                return !KIVO.BassamPerm || !KIVO.BassamPerm.subOn || KIVO.BassamPerm.subOn("admin", t);
              } catch (t) {
                return !0;
              }
            })
            .filter((t) => "oplog" !== t || c),
          { l, h } = this._admTabsNow(i, n, p, g),
          d = p.includes(l) ? l : n ? "depts" : "backup";
        try {
          "dept" === i ? this._hashTab("admin", h) : n && this._hashTab("sysadmin", d);
        } catch (t) {}
        return {
          admModeDept: "dept" === i,
          admModeSite: "site" === i,
          admOnDepts: n && "depts" === d,
          admOnPlat: n && "plat" === d,
          admGoPlat: () => this.setState({ admTab: "plat" }, () => this.plRkLoad()),
          admPlTabStyle: t("plat" === d),
          admPlTabIcon: a("plat" === d),
          admPlTabLbl: r("plat" === d),
          ...(n && "plat" === d ? this.plVals(t, a, r) : {}),
          admSrvTabs: o,
          admOnOverview: o && "overview" === d,
          admOnSec: o && "sec" === d,
          admOnUsers: o && "users" === d,
          admOnPerms: o && "perms" === d,
          admUsTabStyle: t("users" === d),
          admUsTabIcon: a("users" === d),
          admUsTabLbl: r("users" === d),
          admPmTabStyle: t("perms" === d),
          admPmTabIcon: a("perms" === d),
          admPmTabLbl: r("perms" === d),
          admOvTabStyle: t("overview" === d),
          admOvTabIcon: a("overview" === d),
          admOvTabLbl: r("overview" === d),
          admSecTabStyle: t("sec" === d),
          admSecTabIcon: a("sec" === d),
          admSecTabLbl: r("sec" === d),
          ...this.adVals(),
          admOnBackup: "backup" === d,
          admOnAud: o && "oplog" === d,
          admGoAud: () => this.setState({ admTab: "oplog" }, () => this.audLoad(!0)),
          admAudTabStyle: t("oplog" === d),
          admAudTabIcon: a("oplog" === d),
          admAudTabLbl: r("oplog" === d),
          showDeptAud: "dept" === i && "oplog" === h,
          dTabAudOn: !1,
          dTabGoAud: () => {},
          dAudTabStyle: "",
          dAudTabIcon: "",
          dAudTabLbl: "",
          audNode: (o && "oplog" === d) || ("dept" === i && "oplog" === h) ? this.audNode() : null,
          adErrOn: !!this.state.adErr,
          adRetry: () => {
            ((this._adLast = 0), this.setState({ adErr: !1 }), this.adLoad(!0));
          },
          admSiteBackup: n && "backup" === d,
          showDeptBk: "dept" === i && "backup" === h,
          showDeptLog: !1,
          dTabBarShow: "dept" === i && g.length > 1,
          dTabGoBackup: () => this.setState({ deptTab: "backup" }),
          dTabGoLog: () =>
            this.setState({ deptTab: "oplog" }, () => {
              this.audLoad(!0);
            }),
          dBkTabStyle: t("backup" === h),
          dBkTabIcon: a("backup" === h),
          dBkTabLbl: r("backup" === h),
          dLgTabStyle: t("oplog" === h),
          dLgTabIcon: a("oplog" === h),
          dLgTabLbl: r("oplog" === h),
          dTabBkOn: -1 !== g.indexOf("backup"),
          dTabLgOn: -1 !== g.indexOf("oplog"),
          dTabSfOn: -1 !== g.indexOf("shifts"),
          dTabTpOn: -1 !== g.indexOf("ptpls"),
          dTabImOn: -1 !== g.indexOf("import"),
          showDeptIm: "dept" === i && "import" === h,
          dTabGoIm: () => this.setState({ deptTab: "import" }),
          dImTabStyle: t("import" === h),
          dImTabIcon: a("import" === h),
          dImTabLbl: r("import" === h),
          ...("dept" === i && "import" === h ? this.impVals() : {}),
          showDeptSf: "dept" === i && "shifts" === h,
          showDeptTp: "dept" === i && "ptpls" === h,
          dTabGoSf: () => this.setState({ deptTab: "shifts" }),
          dTabGoTp: () => this.setState({ deptTab: "ptpls" }),
          dSfTabStyle: t("shifts" === h),
          dSfTabIcon: a("shifts" === h),
          dSfTabLbl: r("shifts" === h),
          dTpTabStyle: t("ptpls" === h),
          dTpTabIcon: a("ptpls" === h),
          dTpTabLbl: r("ptpls" === h),
          ...("dept" === i && "shifts" === h ? this.sfVals() : {}),
          ...("dept" === i && "ptpls" === h ? this.tpVals() : {}),
          ...("dept" === i && "ptpls" === h ? this.scMgrVals() : {}),   /* KIVO_262: نطاقُ موظفي الإدارة */
          deptIntro:
            "من هنا تأخذ نسخة احتياطية من بيانات هذه الإدارة وتستعيدها. النسخة الشاملة لكل الإدارات ومسح بيانات أي إدارة في صفحة «مدير النظام».",
          dbkExport: () => {
            KIVO.BassamDeptBackup && KIVO.BassamDeptBackup.export();
          },
          ...(() => {
            let t = null;
            try {
              t = localStorage.getItem("bassam_last_export_v1");
            } catch (t) {}
            const e = this._expInfo(t, "dept");
            return {
              dbkLastTxt: e.txt,
              dbkLastStyle:
                "margin-top:12px;font-size:11.5px;font-weight:600;display:inline-flex;align-items:center;gap:6px;color:" +
                (e.stale ? "var(--fg-xb45309)" : "var(--fg-x8a929b)"),
            };
          })(),
          dbkImport: (t) => {
            const e = t.target && t.target.files && t.target.files[0];
            (t.target && (t.target.value = ""), e && KIVO.BassamDeptBackup && KIVO.BassamDeptBackup.importFile(e));
          },
          admGoDepts: () => this.setState({ admTab: "depts" }),
          admGoBackup: () => this.setState({ admTab: "backup" }),
          admDeptsTabStyle: t("depts" === d),
          admDeptsTabIcon: a("depts" === d),
          admDeptsTabLbl: r("depts" === d),
          admBackupTabStyle: t("backup" === d),
          admBackupTabIcon: a("backup" === d),
          admBackupTabLbl: r("backup" === d),
          admHistOn: n,
          admOnHist: n && "histimp" === d,
          admGoHist: () => this.setState({ admTab: "histimp" }),
          admHistTabStyle: t("histimp" === d),
          admHistTabIcon: a("histimp" === d),
          admHistTabLbl: r("histimp" === d),
          hiNode: n && "histimp" === d ? this.hiNode() : ((this._hiTabOn = 0), null),
        };
      })(),
      ...(() => {
        const t = KIVO.BassamDepts;
        if (!t) return { deptRows: [], newDeptName: "", deptMsg: "", deptMsgColor: "#dc2626", actDeptName: "" };
        const s = t.active(),
          a = t.treeFlat(),
          r = (() => {
            const r = KIVO.BassamPerm,
              i = (r && r.PAGE_REG) || [],
              n = !(!e.sysSel || a.some((t) => t.id === e.sysSel) || !t.nodes().some((t) => t.id === e.sysSel)),
              o = n || a.some((t) => t.id === e.sysSel) ? e.sysSel : a.some((t) => t.id === s) ? s : a[0] ? a[0].id : "",
              p = n ? t.nodeOf(o) : a.filter((t) => t.id === o)[0];
            const tree = {
              deptCount: String(a.length),
              dlOpen: !!p && !e.dlShut,
              dlShut: !!p && !!e.dlShut,
              dlToggle: () => this.setState({ dlShut: !this.state.dlShut }),
              mdGridStyle: "display:grid;align-items:start;gap:13px;grid-template-columns:" + (p && e.dlShut ? "56px 1fr" : "minmax(380px,42%) 1fr"),
              trQ: e.trQ || "",
              trOnQ: (t) => this.setState({ trQ: t.target.value }),
              trClear: () => this.setState({ trQ: "" }),
              trHasQ: !!(e.trQ && String(e.trQ).trim()),
              trExpandAll: () => this._trSetAll(t, !0),
              trCollapseAll: () => this._trSetAll(t, !1),
            };
            if (!p) {
              let context = null;
              try { context = t.context && t.context(); } catch (error) {}
              const message = context && ["error", "unavailable"].includes(context.state) && context.message
                ? context.message : a.length || t.nodes().length
                  ? "اختر إدارة أو عقدة من الهيكل لعرض تفاصيلها"
                  : "لا توجد إدارة — أضف إدارة من الهيكل";
              return { ...tree, deptDetailReady: false, deptDetailEmpty: true, deptDetailMessage: message, _sel: "" };
            }
            const l = "cap" === e.sysTab ? "cap" : "scope" === e.sysTab ? "scope" : "emps",   /* KIVO_262: تبويبُ سقف النطاق */
              d =
                e.capDraft && e.sysSel === o
                  ? e.capDraft
                  : { cap: r ? (r.rawCap && r.hasCap && r.hasCap(o) ? r.rawCap(o) : r.deptCap(o)) : [], subs: {}, tabs: {} },
              LIM = (() => {
                try {
                  if (!r || !r.hasCap || !r.rawCap || !t.ancestorsOf || (r.capOwnOf && r.capOwnOf(o))) return null; /* caps-own: independent */
                  const e = (t.ancestorsOf(o) || []).filter((t) => r.hasCap(t));
                  if (!e.length) return null;
                  let s = null;
                  const a = [];
                  return (
                    e.forEach((e) => {
                      const i = r.rawCap(e);
                      ((s = s ? s.filter((t) => -1 !== i.indexOf(t)) : i.slice()),
                        a.push({ id: e, name: (t.nodeOf(e) || {}).name || "—", cap: i }));
                    }),
                    { allow: s, anc: a }
                  );
                } catch (t) {
                  return null;
                }
              })(),
              BLK = LIM ? (d.cap || []).filter((t) => -1 === LIM.allow.indexOf(t)) : [],
              blkName = (t) => {
                if (!LIM) return "";
                const e = LIM.anc.filter((e) => -1 === e.cap.indexOf(t));
                return e.length ? e[0].name : "";
              },
              c = e.capBase && e.sysSel === o ? e.capBase : d,
              g = JSON.stringify(d) !== JSON.stringify(c),
              h = e.capOpenRows || {};
            let m = [];
            try {
              const rows = n ? null : KIVO.__BS_SRV.operations.reference("bsdept:" + o + ":bassam_employees_v1");
              if (Array.isArray(rows)) m = rows;
            } catch (t) {
              if (!n) this.scLoadReferences(o, false);
            }
            const f = KIVO.BassamAuth || null,
              u = (t) => !!(f && f.isMgrKey && f.isMgrKey(t)),
              b = (f && f.users ? f.users() : [])
                .filter((t) => "staff" === t.role && t.deptId === o)
                .sort((t, e) => (u(e.ekey) ? 1 : 0) - (u(t.ekey) ? 1 : 0)),
              w = (t) => m.filter((e) => (e.eid || e.name) === t)[0] || null,
              y = (t) => {
                const e = w(t.ekey);
                return (e && e.name) || t.name || "";
              },
              S = (t) => {
                const e = w(t.ekey);
                return (e && e.empno) || t.no || "";
              },
              x = (t) => {
                const e = w(t.ekey);
                return (e && e.phone) || t.alt || "";
              },
              k = (e.empQ || "").trim(),
              v = KIVO.BassamFind.filter(k, b, (t) => [y(t), t.un, S(t), x(t)]),
              _ = (b.filter((t) => !t.dis).length, 0 === e.usrPerPage ? 0 : e.usrPerPage || 10),
              O = 0 === _ ? Math.max(1, v.length) : _,
              D = Math.max(1, Math.ceil(v.length / O)),
              T = Math.min(Math.max(1, e.usrPage || 1), D),
              A = (T - 1) * O,
              P = v.slice(A, A + O),
              B = [];
            {
              const t = [],
                e = (e) => {
                  t.indexOf(e) < 0 && t.push(e);
                };
              e(1);
              for (let t = T - 1; t <= T + 1; t++) t >= 1 && t <= D && e(t);
              (e(D), t.sort((t, e) => t - e));
              for (let e = 0; e < t.length; e++) {
                e > 0 && t[e] - t[e - 1] > 1 && B.push({ dots: !0, label: "…" });
                const s = t[e];
                B.push({
                  dots: !1,
                  label: String(s),
                  cur: s === T,
                  plain: s !== T,
                  style:
                    "height:28px;min-width:28px;padding:0 4px;border:0;border-right:1px solid var(--bd-xe1e1e1);font-size:11px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';" +
                    (s === T
                      ? "background:var(--bg-xb99751);color:var(--text-on-brand)"
                      : "background:transparent;color:var(--fg-x475569)"),
                  click: () => this.setState({ usrPage: s }),
                });
              }
            }
            const E = (t) =>
                "height:28px;width:28px;border:0;border-right:1px solid var(--bd-xe1e1e1);background:transparent;display:flex;align-items:center;justify-content:center;" +
                (t ? "color:var(--fg-x475569);cursor:pointer" : "color:var(--fg-xcbd5e1);cursor:default"),
              M = (t) =>
                "border:0;background:" +
                (t ? "var(--bg-a185151810p1)" : "transparent") +
                ";padding:9px 15px;border-radius:10px 10px 0 0;font-size:12.5px;font-weight:600;cursor:pointer;font-family:'Cairo',sans-serif;display:inline-flex;align-items:center;gap:7px;position:relative;color:" +
                (t ? "var(--fg-x8a6f35)" : "var(--fg-x94a3b8)") +
                (t ? ";box-shadow:inset 0 -2.5px 0 var(--brand-primary)" : "");
            return {
              ...tree,
              deptDetailReady: true,
              deptDetailEmpty: false,
              selName: void 0 !== e["dnm_" + o] ? e["dnm_" + o] : p.name,
              selIsNode: n,
              selIsDept: !n,
              ...(() => {
                const A = KIVO.BassamAuth || null,
                  P = KIVO.BassamPerm || null,
                  act = t.active(),
                  pid = n ? t.parentIdOf(o) || "" : t.groupIdOf(o) || "";
                let path = [];
                try {
                  path = (pid ? (t.pathOf(pid) || []).concat([(t.nodeOf(pid) || {}).name]) : []).filter(Boolean);
                } catch (t) {}
                const mg = n ? (A && A.groupManager ? A.groupManager(o) : null) : A && A.deptManager ? A.deptManager(o) : null;
                const cap = (() => {
                    try {
                      return P ? P.rawCap(o).length : 0;
                    } catch (t) {
                      return 0;
                    }
                  })(),
                  capAll = ((P && P.PAGE_REG) || []).length,
                  hasCap = (() => {
                    try {
                      return !!(P && P.hasCap(o));
                    } catch (t) {
                      return !1;
                    }
                  })();
                const users = n ? 0 : (A && A.users ? A.users() : []).filter((t) => "staff" === t.role && t.deptId === o).length;
                const kids = n
                  ? (() => {
                      try {
                        return (t.deptsUnder(o) || []).length;
                      } catch (t) {
                        return 0;
                      }
                    })()
                  : 0;
                return {
                  dhPathTxt: path.join(" ← "),
                  dhPathOn: path.length > 0,
                  dhIsNode: n,
                  dhIsDept: !n,
                  dhActive: !n && o === act,
                  dhNotActive: !n && o !== act,
                  dhMgrLbl: mg ? "المدير: " + mg.name + (mg.dis ? " · موقوف" : "") : "بلا مدير",
                  dhMgrOk: !!mg,
                  dhMgrNo: !mg,
                  dhCapLbl: hasCap ? (cap ? "السقف " + cap + " من " + KIVO.BassamCount(capAll, "صفحة", "g") + "" : "السقف فارغ — لا صفحة مفعّلة") : cap ? (cap < capAll ? "يرث سقف الأصل " + cap + " من " + KIVO.BassamCount(capAll, "صفحة", "g") : "السقف مفتوح — لم يُضبط") : "السقف فارغ — بسقف أصلٍ فوقها",
                  dhCapEmpty: !cap,
                  dhUsersLbl: n ? KIVO.BassamCount(kids, "إدارة") + " تحتها" : KIVO.BassamCount(users, "مستخدم") + "",
                  dhAdd: () => {
                    const e = { ...(this.state.admGrpFlip || {}) };
                    (delete e[o],
                      this.setState({ admGrpFlip: e, ndOpen: !0, ndPid: o, ndName: "", ndKind: "", ndNewKind: "", ndMsg: "", dlShut: !1 }));
                  },
                  dhRename: () => {
                    try {
                      const t = document.getElementById("bsSelName");
                      t && (t.focus(), t.select && t.select());
                    } catch (t) {}
                  },
                  dhMgr: () => {
                    n ? this.gmOpen(o) : this.mgrOpen(o);
                  },
                  dhCap: () => {
                    (this.setState({ sysTab: "cap" }), (e.capDraft && e.sysSel === o) || this.sysPick(o));
                  },
                  dhDisOn: n && !!mg,
                  dhDisLbl: mg && mg.dis ? "إعادة تفعيل المدير" : "إيقاف المدير",
                  dhDis: () => {
                    if (!mg || !A || !A.setGroupManagerDis) return;
                    const t = A.setGroupManagerDis(o, !mg.dis);
                    t && t.ok
                      ? (this.setState({ tick: (this.state.tick || 0) + 1 }),
                        this.bsAck(mg.dis ? "أُعيد تفعيل حساب المدير" : "أُوقف حساب المدير", "ok"))
                      : this.bsToast((t && t.err) || "تعذّر");
                  },
                  dhSwitch: () => {
                    (t.setActive(o),
                      (KIVO.__BS_SRV && KIVO.__BS_SRV.flushAsync
                        ? Promise.resolve(KIVO.__BS_SRV.flushAsync(4e3)).catch(() => {})
                        : Promise.resolve()
                      ).then(
                        () => location.reload(),
                        () => location.reload(),
                      ));
                  },
                  dhExp: () => {
                    KIVO.BassamDeptBackup && KIVO.BassamDeptBackup.export();
                  },
                  dhImpStop: (t) => {
                    t && t.stopPropagation && t.stopPropagation();
                  },
                  dhImpPick: (t) => {
                    const e = t.target && t.target.files && t.target.files[0];
                    (t.target && (t.target.value = ""), e && KIVO.BassamDeptBackup && KIVO.BassamDeptBackup.importFile(e, o));
                  },
                  dhWipe: () => this.wpOpen(o),
                  ...(() => {
                    const A = KIVO.BassamAuth || null,
                      list = n ? (A && A.groupManagers ? A.groupManagers(o) : []) : A && A.deptManagers ? A.deptManagers(o) : [];
                    const staff = n
                      ? 0
                      : (A && A.users ? A.users() : []).filter((t) => "staff" === t.role && t.deptId === o && !t.mgr).length;
                    const arm = e.mgArm || "";
                    const K = n ? this._gmKind(o) : "";
                    const firstDept = n ? (t.deptsUnder(o) || [])[0] || "" : "";
                    return {
                      mgCount: String(list.length),
                      mgHas: list.length > 0,
                      mgNone: 0 === list.length,
                      mgStaffTxt: n
                        ? KIVO.BassamCount(kids, "إدارة") + " في هذا الفرع"
                        : KIVO.BassamCount(staff, "موظف") + " " + KIVO.BassamCount.agr(staff, "له", "لهما", "لهم") + " حساب دخول",
                      mgTitle: n ? "مديرو " + K : "مديرو الإدارة",
                      mgSub: n
                        ? "ينتقلون بين إدارات الفرع كلها ويرثون سقف كل إدارة كاملاً · أكثر من مدير مسموح"
                        : "يرثون سقف الإدارة كاملاً · أكثر من مدير مسموح",
                      mgAddTip: n ? "إضافة مدير جديد " + this._gmFor(o) : "إضافة مدير جديد لهذه الإدارة",
                      mgEmptyT: n ? "لا مدير " + this._gmFor(o) + " بعد" : "لا مدير لهذه الإدارة بعد",
                      mgEmptyS: n
                        ? "أضف أول مدير من زر + — يرث سقف كل إدارة في الفرع كاملاً."
                        : "بلا مدير لا يستطيع أحد اعتماد الجدول أو التقرير اليومي — أضف أول مدير من زر +.",
                      mgTmpOn: !!(e.mgTmp && e.mgTmp.pw),
                      mgTmpName: e.mgTmp ? e.mgTmp.name : "",
                      mgTmpPw: e.mgTmp ? e.mgTmp.pw : "",
                      mgTmpClose: () => this.setState({ mgTmp: null }),
                      mgAdd: () => (n ? this.gmOpen(o, "__add") : this.mgrOpen(o, "__add")),
                      mgRows: list.map((g) => ({
                        permTip: n
                          ? "الصلاحيات — يرث سقف كل إدارة في الفرع كاملاً، والتضييق اختياري لكل إدارة"
                          : "الصلاحيات — يرث سقف الإدارة كاملاً، والتضييق اختياري",
                        ini: String(g.name || "?")
                          .trim()
                          .charAt(0),
                        name: g.name || "—",
                        un: g.un || "—",
                        alt: g.alt || "",
                        altOn: !!g.alt,
                        no: g.empno || "—",
                        avCls: g.dis ? "d" : "",
                        rl: g.dis
                          ? "مدير — موقوف"
                          : String(g.title || "").trim() || (n ? ("الإدارة العليا" === K ? K : "مدير " + K) : "مدير الإدارة"),
                        rlCls: g.dis ? "dis" : "",
                        stCls: g.dis ? "off" : "",
                        stTip: g.dis ? "موقوف — لا يستطيع الدخول" : "نشط",
                        edit: () => (n ? this.gmOpen(o, g.id) : this.mgrOpen(o, g.id)),
                        tmp: () => {
                          if (!A || !A.resetPwById) return;
                          Promise.resolve(A.resetPwById(g.id)).then((t) => {
                            t && t.ok
                              ? this.setState({ mgTmp: { name: g.name || g.un, pw: t.pw }, tick: (this.state.tick || 0) + 1 })
                              : this.bsToast((t && t.err) || "تعذّر", "warn");
                          });
                        },
                        perm: () =>
                          this.setState({
                            upUid: g.id,
                            upGmDept: n ? firstDept : "",
                            upDraft: null,
                            upLensDraft: null,
                            upFor: "",
                            upExp: {},
                          }),
                        disTip: g.dis ? "إعادة تفعيل الحساب" : "إيقاف الحساب مؤقتاً — يمنع الدخول بلا حذف",
                        dis: () => {
                          const t = n ? A.setGroupManagerDis(o, !g.dis, g.id) : A.setDeptManagerDis(o, !g.dis, g.id);
                          t && t.ok
                            ? (this.setState({ tick: (this.state.tick || 0) + 1 }),
                              this.bsAck(g.dis ? "أُعيد تفعيل حساب المدير" : "أُوقف حساب المدير", "ok"))
                            : this.bsToast((t && t.err) || "تعذّر", "warn");
                        },
                        delCls: arm === g.id ? "arm" : "",
                        delTip: arm === g.id ? "اضغط مرة أخرى لتأكيد حذف الحساب" : "حذف حساب المدير — تبقى الإدارة وبياناتها",
                        del: () => {
                          if (arm !== g.id) {
                            clearTimeout(this._mgArmT);
                            this.setState({ mgArm: g.id });
                            this._mgArmT = setTimeout(() => this.setState({ mgArm: "" }), 4e3);
                            return;
                          }
                          clearTimeout(this._mgArmT);
                          const t = n ? A.removeGroupManager(o, g.id) : A.removeDeptManager(o, g.id);
                          t && t.ok
                            ? (this.setState({
                                mgArm: "",
                                tick: (this.state.tick || 0) + 1,
                                upUid: this.state.upUid === g.id ? "" : this.state.upUid,
                              }),
                              this.bsAck("حُذف حساب «" + (g.name || "المدير") + "»", "ok"))
                            : this.bsToast((t && t.err) || "تعذّر الحذف", "warn");
                        },
                      })),
                    };
                  })(),
                  dhMenuOpen: !!e.dhMenu,
                  dhMenuCls: e.dhMenu ? "on" : "",
                  dhMenuTog: () => this.setState({ dhMenu: !this.state.dhMenu }),
                  dhMenuClose: () => this.setState({ dhMenu: !1 }),
                  dhDelTip: (n ? e.admGrpArm === o : !!(e.admArm && "dept" === e.admArm.t && e.admArm.id === o))
                    ? "اضغط مرة أخرى لتأكيد الحذف النهائي"
                    : "حذف الإدارة — يمسح الإدارة وكل بياناتها وحساباتها نهائياً",
                  dhDelOn: n ? !kids : t.list().length > 1,
                  dhDelCls: (n ? e.admGrpArm === o : !!(e.admArm && "dept" === e.admArm.t && e.admArm.id === o)) ? "arm" : "",
                  dhDelLbl: (n ? e.admGrpArm === o : !!(e.admArm && "dept" === e.admArm.t && e.admArm.id === o))
                    ? "اضغط مرة أخرى للتأكيد"
                    : n
                      ? "حذف العقدة"
                      : "حذف الإدارة",
                  dhDelArm: n ? e.admGrpArm === o : !!(e.admArm && "dept" === e.admArm.t && e.admArm.id === o),
                  dhDel: () => {
                    if (n) {
                      const e = this.state.admGrpArm === o;
                      if (!e) {
                        const e = Date.now();
                        return (
                          this.setState({ admGrpArm: o, admGrpArmTs: e, deptMsg: "حذف «" + p.name + "» — اضغط مرة أخرى للتأكيد" }),
                          void setTimeout(() => {
                            this.state.admGrpArmTs === e && this.setState({ admGrpArm: null, deptMsg: "" });
                          }, 4e3)
                        );
                      }
                      this.setState({ admGrpArm: null, deptMsg: "" });
                      const s = t.nodeDel(o);
                      if (!s || !s.ok) return void this.bsToast((s && s.err) || "تعذّر الحذف");
                      try {
                        KIVO.BassamAuth && KIVO.BassamAuth.removeGroupManager && KIVO.BassamAuth.removeGroupManager(o);
                      } catch (t) {}
                      const a = t.list()[0];
                      (this.setState({ sysSel: a ? a.id : null, deptMsg: "✓ حُذفت «" + p.name + "»" }), this.bsAck("حُذفت العقدة", "ok"));
                    } else this.deptDel(p);
                  },
                };
              })(),
              selKindLbl: n ? p.kind || "عقدة" : "إدارة",
              selGid: n ? t.parentIdOf(o) || "" : t.groupIdOf(o),
              selGidStyle:
                "height:34px;max-width:230px;padding:0 10px;border-radius:9px;border:1px solid var(--bd-a185151810p34);background:var(--bg-a185151810p06);font-family:'Cairo',sans-serif;font-size:11.5px;font-weight:700;color:" +
                (t.groupIdOf(o) ? "var(--fg-x8a6f35)" : "var(--fg-x94a3b8)") +
                ";cursor:pointer;max-width:230px;text-overflow:ellipsis",
              gdeptOpts: this._parentOpts(t, o),
              selSetGid: (e) => {
                const s = e.target.value;
                if (n) {
                  if ("__new" === s) return;
                  const e = t.nodeSave(o, { pid: s || null });
                  return e && e.ok
                    ? void this.setState({ deptMsg: s ? "✓ نُقلت تحت «" + ((t.nodeOf(s) || {}).name || "") + "»" : "✓ صارت في الجذر" })
                    : void this.bsToast((e && e.err) || "تعذّر النقل");
                }
                if ("__new" === s) {
                  let e = "إدارة عامة جديدة",
                    s = e,
                    a = 2;
                  for (; t.groups().some((t) => t.name === s); ) s = e + " " + a++;
                  const r = "g" + Date.now().toString(36);
                  return (
                    t.saveGroups(t.groups().concat([{ id: r, name: s }])),
                    t.save(t.list().map((t) => (t.id === o ? { ...t, gid: r } : t))),
                    void this.setState({
                      dlShut: !1,
                      admGrpEdit: r,
                      admGrpName: s,
                      admGrpArm: null,
                      deptMsg: "✓ أُنشئت إدارة عامة وأُسندت إليها هذه الإدارة — اكتب اسمها في القائمة",
                    })
                  );
                }
                const a = t.setDeptParent(o, s || null);
                a && a.ok
                  ? this.setState({ deptMsg: s ? "✓ أُسندت إلى «" + ((t.nodeOf(s) || {}).name || "") + "»" : "✓ رُفع التصنيف" })
                  : this.bsToast((a && a.err) || "تعذّر الإسناد");
              },
              selRename: (t) => this.setState({ ["dnm_" + o]: t.target.value }),
              selRenameSave: (e) => {
                const s = (e.target.value || "").trim();
                if (s && s !== p.name) {
                  if (n) {
                    if (t.nodes().some((t) => t.id !== o && t.name === s))
                      return void this.setState({ deptMsg2: "الاسم مستخدم لعقدة أخرى" });
                    const e = t.nodeSave(o, { name: s });
                    return e && e.ok
                      ? void this.setState({ ["dnm_" + o]: void 0, deptMsg2: "" })
                      : void this.setState({ deptMsg2: (e && e.err) || "تعذّر" });
                  }
                  a.some((t) => t.id !== o && t.name === s)
                    ? this.setState({ deptMsg2: "الاسم مستخدم لإدارة أخرى" })
                    : (t.save(a.map((t) => (t.id === o ? { ...t, name: s } : t))), this.setState({ ["dnm_" + o]: void 0, deptMsg2: "" }));
                } else this.setState({ ["dnm_" + o]: void 0 });
              },
              goTabEmps: () => this.setState({ sysTab: "emps" }),
              goTabCap: () => {
                (this.setState({ sysTab: "cap" }), (e.capDraft && e.sysSel === o) || this.sysPick(o));
              },
              tabEmpsStyle: M("emps" === l),
              tabCapStyle: M("cap" === l),
              onTabEmps: "emps" === l,
              onTabCap: "cap" === l,
              tabScopeStyle: M("scope" === l),
              ...this.scopeVals(o, n, l),   /* KIVO_262 · سقفُ النطاق */
              tabEmpsShow: !0,
              tabEmpsLbl: n ? "حسابات " + this._gmKind(o) : "حسابات الإدارة",
              dhNever: !1,
              empQ: e.empQ || "",
              setEmpQ: (t) => this.setState({ empQ: t.target.value, usrPage: 1 }),
              empShown: String(v.length),
              empTotal: String(b.length),
              empHas: v.length > 0,
              empEmpty: 0 === v.length,
              empEmptyMsg: b.length ? "لا نتائج مطابقة لـ «" + k + "»" : "لم يُنشأ أي حساب مستخدم في هذه الإدارة بعد",
              empRows: P.map((t, e) => {
                const s = !!t.mgr,
                  a = u(t.ekey),
                  r = (t) =>
                    "width:28px;height:28px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;font-family:'Cairo',sans-serif;border:1px solid var(--bd-xe1e1e1);background:var(--bg-xffffff);color:var(--fg-x53565a);" +
                    (t || "");
                return {
                  i: String(A + e + 1),
                  name: y(t) || "—",
                  un: t.un || "—",
                  eid: S(t) || "—",
                  ph: x(t) || "—",
                  permTip:
                    KIVO.BassamAuth && KIVO.BassamAuth.isSuper && KIVO.BassamAuth.isSuper()
                      ? "صلاحيات المستخدم — اضبطها من هنا"
                      : s
                        ? "صلاحيات مدير الإدارة — موروثة من السقف، عرض فقط"
                        : "صلاحيات المستخدم — عرض (الضبط من صفحة الموظفين)",
                  permBtnStyle: r(""),
                  ...this._rowMenu("us" + t.id, [
                    {
                      name: "الصلاحيات",
                      color: "#0e7490",
                      p1: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z",
                      p2: "",
                      run: () => this.setState({ upUid: t.id, upDraft: null, upLensDraft: null, upFor: "", upExp: {}, up24Draft: null, up24Exp: {}, up24Leaf: {} }),
                    },
                    {
                      name: t.dis ? "تفعيل الحساب" : "إيقاف الحساب",
                      color: t.dis ? "#047857" : "#b45309",
                      p1: t.dis ? "M5 3l14 9-14 9V3Z" : "M10 4v16",
                      p2: t.dis ? "" : "M14 4v16",
                      run: () => this.userDis(t, o, a),
                    },
                    {
                      name: "حذف الحساب",
                      color: "#dc2626",
                      danger: !0,
                      p1: "M3 6h18",
                      p2: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
                      run: () => this.userDel(t, o, a),
                    },
                  ]),
                  doPerm: () => this.setState({ upUid: t.id, upDraft: null, upLensDraft: null, upFor: "", upExp: {}, up24Draft: null, up24Exp: {}, up24Leaf: {} }),
                  isDis: !!t.dis,
                  notDis: !t.dis,
                  disTip: t.dis ? "تفعيل الحساب" : "إيقاف الحساب",
                  disBtnStyle: r(""),
                  doDis: () => this.userDis(t, o, a),
                  delTip: s ? "حذف حساب مدير الإدارة" : "حذف حساب الدخول",
                  delBtnStyle: r(""),
                  doDel: () => this.userDel(t, o, a),
                  roleLbl: (s && String(t.title || "").trim()) || (s ? "مدير الإدارة" : "موظف"),
                  roleStyle:
                    "display:inline-flex;align-items:center;font-size:10px;font-weight:600;padding:3px 10px;border-radius:9999px;white-space:nowrap;" +
                    (s
                      ? "background:var(--bg-a185151810p12);border:1px solid var(--bd-a185151810p35);color:var(--fg-x8a6f35)"
                      : "background:var(--bg-a2452452450p9);border:1px solid var(--bd-xe2e8f0);color:var(--fg-x53565a)"),
                  accLbl: t.dis ? "مجمّد" : "نشط",
                  accStyle:
                    "display:inline-flex;align-items:center;font-size:10px;font-weight:600;padding:3px 10px;border-radius:9999px;white-space:nowrap;" +
                    (t.dis
                      ? "background:var(--bg-a22038380p07);border:1px solid var(--bd-a22038380p3);color:var(--fg-xb91c1c)"
                      : "background:var(--bg-a4120870p1);border:1px solid var(--bd-a4120870p3);color:var(--fg-x047857)"),
                };
              }),
              usrPgTotal: String(v.length),
              usrPgRange: 0 === v.length ? "0" : A + 1 + "–" + Math.min(A + O, v.length),
              usrPgNums: B,
              usrPerPage: String(_),
              usrOnPerPage: (t) => {
                const e = +t.target.value;
                this.setState({ usrPerPage: 0 === e ? 0 : e || 10, usrPage: 1 });
              },
              usrPgFirst: () => this.setState({ usrPage: 1 }),
              usrPgPrev: () => this.setState({ usrPage: Math.max(1, (this.state.usrPage || 1) - 1) }),
              usrPgNext: () => this.setState({ usrPage: Math.min(D, (this.state.usrPage || 1) + 1) }),
              usrPgLast: () => this.setState({ usrPage: D }),
              usrPgFirstStyle: E(T > 1),
              usrPgPrevStyle: E(T > 1),
              usrPgNextStyle: E(T < D),
              usrPgLastStyle: E(T < D),
              ...(() => {
                let t = 0,
                  e = 0;
                return (
                  i
                    .filter((t) => !t.under)
                    .forEach((s) => {
                      const a = i.filter((t) => t.under === s.key),
                        r = s.subs || [],
                        n = s.tabs || [],
                        o = i.filter((t) => t.twinSub && t.twinSub.page === s.key).map((t) => t.twinSub.key),
                        p = r.filter((t) => -1 === o.indexOf(t.key)),
                        l = a.length + p.length + n.length;
                      if (!l) return (e++, void (-1 !== d.cap.indexOf(s.key) && t++));
                      e += l;
                      const c = -1 !== d.cap.indexOf(s.key);
                      t += a.filter((t) => -1 !== d.cap.indexOf(t.key)).length;
                      const g = Array.isArray(d.subs[s.key]) ? d.subs[s.key] : c ? r.map((t) => t.key) : [],
                        h = Array.isArray((d.tabs || {})[s.key]) ? (d.tabs || {})[s.key] : c ? n.map((t) => t.key) : [];
                      t +=
                        g.filter((t) => -1 === o.indexOf(t) && r.some((e) => e.key === t)).length +
                        h.filter((t) => n.some((e) => e.key === t)).length;
                    }),
                  { capOnN: String(t), capAllN: String(e) }
                );
              })(),
              capAllDo: () => {
                ((e.capDraft && e.sysSel === o) || this.sysPick(o), setTimeout(() => this.capAll(!0), 0));
              },
              /* KIVO_265 · ملاحظةُ المالك: السقفُ الفعليُّ فارغ ⇒ تنبيهٌ صريح — المديرُ والموظفون لن يروا أي صفحة */
              capEmptyOn: !!(r && r.deptCap && 0 === r.deptCap(o).length),
              capEmptyTxt:
                !!(r && r.hasCap && r.hasCap(o))
                  ? "سقف الصفحات فارغ — لا صفحة مفعّلة لهذه الإدارة، فالمدير والموظفون لن يروا أي صفحة. أشّر الصفحات المطلوبة في الشجرة أدناه (أو «تحديد الكل») ثم اضغط «حفظ السقف»."
                  : "السقف الفعلي لهذه الإدارة فارغ لأن سقف أصلٍ فوقها (الإدارة العامة أو القطاع) فارغ — لا صفحة مفعّلة للمدير والموظفين. افتح الصفحات في سقف الأصل أولاً ثم أشّرها هنا.",
              capLimOn: BLK.length > 0,
              capOwnShow: !!(r && r.setCapOwn && r.capOwnOf),
              capOwnTxt:
                r && r.capOwnOf && r.capOwnOf(o)
                  ? "سقفٌ مستقلّ: لا يتقيّد بسقف الأصل فوقه"
                  : "سقفٌ تابع: الفعليّ = تقاطعُه مع سقوف الأصول فوقه",
              capOwnBtn: r && r.capOwnOf && r.capOwnOf(o) ? "اجعله تابعاً" : "اجعله مستقلاً",
              capOwnDo: () => this.capOwnTog(o),
              capLimTxt: BLK.length
                ? (() => {
                    const t = BLK.map((t) => ({ n: (i.filter((e) => e.key === t)[0] || {}).name || t, a: blkName(t) })),
                      e = {};
                    t.forEach((t) => {
                      (e[t.a] = e[t.a] || []).push(t.n);
                    });
                    return Object.keys(e)
                      .map((t) => "سقف «" + t + "» لا يشمل: " + e[t].join(" · "))
                      .join(" — ");
                  })()
                : "",
              capLimHead: BLK.length
                ? KIVO.BassamCount(BLK.length, "صفحة|محدّدة") +
                  " هنا " +
                  KIVO.BassamCount.agr(BLK.length, "لن تُفعَّل — لأنها", "لن تُفعَّلا — لأنهما", "لن تُفعَّل — لأنها") +
                  " خارج سقف الأصل الذي يعلو هذه الإدارة"
                : "",
              capLimNote:
                "السقف الفعلي لأي إدارة = تقاطع سقفها مع سقوف الأصول فوقها (الإدارة العامة والقطاع). افتح هذه الصفحات في سقف الأصل أولاً ثم تُفعَّل هنا تلقائياً — أو أزلها من هنا.",
              ...KIVO.BassamCount.pair("capEffN", String(r && r.deptCap ? r.deptCap(o).length : 0), "صفحة", "g"),
              capPatRows: (r && r.patternMeta ? r.patternMeta() : []).map((t) => {
                const s = (e.capPat || "basic") === t.key && "set" === t.mode;
                return {
                  name: t.name,
                  tip: t.tip,
                  style:
                    "height:26px;padding:0 11px;border-radius:9999px;font-size:11px;cursor:pointer;font-family:'Cairo',sans-serif;transition:.15s;font-weight:" +
                    (s ? "700" : "400") +
                    ";border:1px solid " +
                    (s
                      ? "#b99751;background:var(--bg-a185151810p12);color:var(--fg-x9a7e40)"
                      : "#E1E1E1;background:var(--bg-xffffff);color:var(--fg-x475569)"),
                  pick: () => {
                    ((e.capDraft && e.sysSel === o) || this.sysPick(o),
                      setTimeout(() => {
                        const s = this.state.capDraft;
                        s &&
                          r &&
                          r.patternApply &&
                          this.setState({
                            capDraft: r.patternApply(s, t.key),
                            capPat: "add" === t.mode ? this.state.capPat || "basic" : t.key,
                          });
                      }, 0));
                  },
                };
              }),
              capPatSaveTip:
                "اجعل التأشير الحالي هو نمط «" +
                ((r && r.patternMeta ? r.patternMeta() : []).filter((t) => t.key === (e.capPat || "basic"))[0] || { name: "أساسي" }).name +
                "» — يُحفظ في المنصة" +
                ("basic" === (e.capPat || "basic") ? " ويبدأ به كل ما يُنشأ من إدارات" : ""),
              capPatSaveDo: () => {
                const t = this.state.capDraft;
                if (!t || !r || !r.patternSet) return;
                const s = e.capPat || "basic",
                  a = r.patternSet(s, t),
                  i = ((r.patternMeta ? r.patternMeta() : []).filter((t) => t.key === s)[0] || {}).name || s;
                this.bsToast(
                  a && !1 === a.ok ? a.err : "حُفظ نمط «" + i + "»" + ("basic" === s ? " — يبدأ به كل ما يُنشأ من إدارات" : ""),
                  a && !1 === a.ok ? "err" : "ok",
                );
              },
              capNoneDo: () => {
                ((e.capDraft && e.sysSel === o) || this.sysPick(o), setTimeout(() => this.capAll(!1), 0));
              },
              capUndo: () => this.capUndo(),
              /* ═══ KIVO_256 · وضعُ الإنفاذ: سقفُ الإدارة على شجرة v24.9 — الورقةُ تدخل السقف أو تخرج منه (صفحة · تبويب · عدسة) ومفاتيحُها تتبعها ═══ */
              ...(() => {
                if (!this.t24On() || !r || !r.p24) return { capV24: !1, capLegacy: !0 };
                const dl = Array.isArray(d.lenses) ? d.lenses : r.deptLenses ? r.deptLenses(o) : [],
                  C = r.p24.ceil(o, { cap: d.cap || [], subs: d.subs || {}, tabs: d.tabs || {}, lenses: dl }),
                  ens = (fn) => {
                    e.capDraft && e.sysSel === o ? fn() : (this.sysPick(o), setTimeout(fn, 0));
                  },
                  md = this.t24Rows({
                    mode: "cap",
                    ceil: C,
                    exp: e.cap24Exp || {},
                    leafExp: e.cap24Leaf || {},
                    canEdit: !0,
                    lim: LIM ? { allow: LIM.allow, name: blkName } : null,
                    platOff: this.t24PlatOff(),
                    cb: {
                      capLeaf: (l) => ens(() => this.cap24Leaf(l)),
                      expand: (id) => this.setState({ cap24Exp: { ...(this.state.cap24Exp || {}), [id]: !(this.state.cap24Exp || {})[id] } }),
                      leafExpand: (id) => this.setState({ cap24Leaf: { ...(this.state.cap24Leaf || {}), [id]: !(this.state.cap24Leaf || {})[id] } }),
                    },
                  }),
                  nKeys = (r.p24.R() ? r.p24.R().keys : []).filter((k) => r.p24.R().byKey[k].status === "active" && r.p24.keyOn(k, C)).length;
                return {
                  capV24: !0,
                  capLegacy: !1,
                  capRows24: md.rows,
                  capCount24: md.nOn + " من " + KIVO.BassamCount(md.nTot, "ورقة", "g"),
                  capKeys24: KIVO.BassamCount(nKeys, "صلاحية", "g") + " داخل السقف",
                  capExpAll24Lbl: md.allExpanded ? "طيّ الكل" : "فرد الكل",
                  capExpAll24: () => this.setState({ cap24Exp: this.t24ExpAll(md) }),
                };
              })(),
              capSaveDo: () => this.capSave(),
              lensAllDo: () => this.capLensAll(!0),
              lensNoneDo: () => this.capLensAll(!1),
              lensTitle: "العدسات — إعداد واحد تشترك فيه الخطة التشغيلية والمتابعة اليومية",
              lensCount: (() => {
                const t = (r && r.LENS_KEYS) || [];
                return (Array.isArray(d.lenses) ? d.lenses : t).length + "/" + t.length;
              })(),
              lensRows: ((r && r.LENS_REG) || []).map((t) => {
                const e = (r && r.LENS_KEYS) || [],
                  s = -1 !== (Array.isArray(d.lenses) ? d.lenses : e).indexOf(t.key);
                return {
                  name: t.name,
                  style:
                    "display:inline-flex;align-items:center;gap:6px;border-radius:9999px;padding:5px 11px;font-size:11px;font-weight:600;font-family:'Cairo',sans-serif;cursor:pointer;transition:.15s;border:1px solid " +
                    (s
                      ? "rgba(14,116,144,0.4);background:var(--bg-a141161440p07);color:var(--fg-x0e7490)"
                      : "#e2e8f0;background:var(--bg-xffffff);color:var(--fg-x53565a)"),
                  box:
                    "width:14px;height:14px;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;border:2px solid " +
                    (s
                      ? "#0e7490;background:var(--bg-x0e7490);color:var(--fg-xffffff)"
                      : "#CBD5E1;background:var(--bg-xffffff);color:transparent"),
                  toggle: () => this.capLensTog(t.key),
                };
              }),
              capRows: (KIVO.BassamPerm && KIVO.BassamPerm.orderRows ? KIVO.BassamPerm.orderRows : (t) => t)(
                (() => {
                  const t = [],
                    s = (r && r.NAV_REG) || [],
                    a = {};
                  s.forEach((t) =>
                    (t.refs || []).forEach((e) => {
                      a[e] = t.key;
                    }),
                  );
                  const n = {},
                    p = "display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--bd-xf4f4f4);",
                    l = (t, e) =>
                      "width:19px;height:19px;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:" +
                      (e ? "pointer" : "default") +
                      ";border:2px solid " +
                      (t
                        ? "#b99751;background:var(--bg-xb99751);color:var(--text-on-brand)"
                        : "#CBD5E1;background:var(--bg-xffffff);color:transparent"),
                    c = (s, a, r) => {
                      const i = -1 !== d.cap.indexOf(s.key),
                        lm = i && LIM && -1 === LIM.allow.indexOf(s.key);
                      t.push(
                        Object.assign(
                          {
                            name: s.name,
                            nameColor: i ? (lm ? "#b45309" : "#141414") : "#94a3b8",
                            isChild: !!a,
                            isParent: !1,
                            isLeafRow: !0,
                            limOn: !!lm,
                            limTxt: lm ? "يحدّه سقف «" + blkName(s.key) + "»" : "",
                            limTip: lm
                              ? "محدّدة هنا لكنها خارج سقف «" + blkName(s.key) + "» الذي يعلو هذه الإدارة — لن تُفعَّل لأحد حتى تُفتح هناك"
                              : "",
                            rowStyle:
                              p +
                              (a ? "padding-right:26px;" : "") +
                              (i ? (lm ? "background:var(--bg-a2552472370p7)" : "") : "background:var(--bg-a2502512520p6)"),
                            chkStyle: l(i, !0),
                            toggle: () => {
                              e.capDraft && e.sysSel === o
                                ? this.capTog(s.key)
                                : (this.sysPick(o), setTimeout(() => this.capTog(s.key), 0));
                            },
                          },
                          r || {},
                        ),
                      );
                    },
                    g = (s, a, r, i, n) => {
                      const c =
                          "sub" === i
                            ? Array.isArray(d.subs[s])
                              ? d.subs[s]
                              : a
                                ? this._subsOf(s).map((t) => t.key)
                                : []
                            : Array.isArray((d.tabs || {})[s])
                              ? (d.tabs || {})[s]
                              : a
                                ? this._tabsOf(s).map((t) => t.key)
                                : [],
                        g = a && -1 !== c.indexOf(r.key);
                      t.push({
                        name: n || r.name,
                        nameColor: g ? "#141414" : "#94a3b8",
                        isChild: !0,
                        isParent: !1,
                        isLeafRow: !0,
                        rowStyle: p + "padding-right:26px;" + (g ? "" : "background:var(--bg-a2502512520p6)"),
                        chkStyle: l(g, !0),
                        toggle: () => {
                          e.capDraft && e.sysSel === o
                            ? "sub" === i
                              ? this.capSubTog(s, r.key)
                              : this.capTabTog(s, r.key)
                            : (this.sysPick(o), setTimeout(() => ("sub" === i ? this.capSubTog(s, r.key) : this.capTabTog(s, r.key)), 0));
                        },
                      });
                    };
                  return (
                    i
                      .filter((t) => !t.under)
                      .forEach((e) => {
                        const s = -1 !== d.cap.indexOf(e.key),
                          r = [];
                        Array.isArray(e.seq) && e.seq.length
                          ? (e.seq.forEach((t) => {
                              const s = String(t).split(":"),
                                a = s[0],
                                n = s[1];
                              if ("page" === a) {
                                const t = i.filter((t) => t.key === n)[0];
                                t && r.push({ k: "page", v: t });
                              } else {
                                const t = ("tab" === a ? e.tabs || [] : e.subs || []).filter((t) => t.key === n)[0];
                                t && r.push({ k: a, v: t });
                              }
                            }),
                            i
                              .filter((t) => t.under === e.key && -1 === e.seq.indexOf("page:" + t.key))
                              .forEach((t) => r.push({ k: "page", v: t })))
                          : (i.filter((t) => t.under === e.key).forEach((t) => r.push({ k: "page", v: t })),
                            (e.subs || []).forEach((t) => r.push({ k: "sub", v: t })),
                            (e.tabs || []).forEach((t) => r.push({ k: "tab", v: t })));
                        for (let t = r.length - 1; t >= 0; t--) {
                          const i = r[t];
                          if ("page" === i.k) continue;
                          const o = a[e.key + "/" + i.v.key];
                          o && ((n[o] = n[o] || []).push({ pk: e.key, onP: s, kd: i }), r.splice(t, 1));
                        }
                        const o = r.length > 0,
                          l = !!h[e.key],
                          m = Array.isArray(d.subs[e.key]) ? d.subs[e.key] : this._subsOf(e.key).map((t) => t.key),
                          f = Array.isArray((d.tabs || {})[e.key]) ? (d.tabs || {})[e.key] : this._tabsOf(e.key).map((t) => t.key),
                          u = r.filter((t) =>
                            "page" === t.k ? -1 !== d.cap.indexOf(t.v.key) : s && -1 !== ("sub" === t.k ? m : f).indexOf(t.v.key),
                          ).length;
                        if (o) {
                          const s = u > 0;
                          t.push({
                            name: e.name,
                            nameColor: s ? "#141414" : "#94a3b8",
                            isChild: !1,
                            isParent: !0,
                            isLeafRow: !1,
                            rowStyle: p + "cursor:pointer;" + (s ? "" : "background:var(--bg-a2502512520p6)"),
                            iconStyle:
                              "width:20px;height:20px;border-radius:7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:" +
                              (s ? "var(--bg-a185151810p14)" : "var(--bg-xf1f3f5)") +
                              ";color:" +
                              (s ? "var(--fg-x8a6f35)" : "var(--fg-xb8c0cc)"),
                            dotStyle:
                              "width:8px;height:8px;border-radius:50%;flex-shrink:0;background:" +
                              (s ? "var(--bg-x059669)" : "var(--bg-xcbd5e1)") +
                              (s ? ";box-shadow:0 0 0 3px rgba(5,150,105,0.15)" : ""),
                            dotTip: s ? "داخل سقف الإدارة — فيها ما هو مفعّل" : "خارج سقف الإدارة — لم يُفعَّل شيء تحتها",
                            subCount: u + " من " + r.length,
                            expand: () => this.capExpand(e.key),
                            expTip: l ? "طيّ «" + e.name + "»" : "فرد «" + e.name + "» وعرض ما تحتها",
                            expStyle:
                              "width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;font-family:'Cairo',sans-serif;border:1px solid " +
                              (l
                                ? "rgba(185,151,81,0.35);background:var(--bg-a185151810p1);color:var(--fg-x8a6f35)"
                                : "#e2e8f0;background:var(--bg-xffffff);color:var(--fg-x53565a)"),
                            chev: "transition:transform .2s;" + (l ? "transform:rotate(180deg)" : ""),
                          });
                        } else c(e, !1, {});
                        o &&
                          l &&
                          r.forEach((t) => {
                            "page" === t.k ? c(t.v, !0) : g(e.key, s, t.v, t.k);
                          });
                      }),
                    s.forEach((e) => {
                      const s = (n[e.key] || [])
                        .slice()
                        .sort((x, y) => (e.refs || []).indexOf(x.pk + "/" + x.kd.v.key) - (e.refs || []).indexOf(y.pk + "/" + y.kd.v.key));
                      if (!s.length) return;
                      const a = !!h[e.key],
                        r = s.filter((t) => {
                          const e =
                            "sub" === t.kd.k
                              ? Array.isArray(d.subs[t.pk])
                                ? d.subs[t.pk]
                                : this._subsOf(t.pk).map((t) => t.key)
                              : Array.isArray((d.tabs || {})[t.pk])
                                ? (d.tabs || {})[t.pk]
                                : this._tabsOf(t.pk).map((t) => t.key);
                          return t.onP && -1 !== e.indexOf(t.kd.v.key);
                        }).length,
                        i = r > 0;
                      (t.push({
                        name: e.name,
                        nameColor: i ? "#141414" : "#94a3b8",
                        isChild: !1,
                        isParent: !0,
                        isLeafRow: !1,
                        rowStyle: p + "cursor:pointer;" + (i ? "" : "background:var(--bg-a2502512520p6)"),
                        iconStyle:
                          "width:20px;height:20px;border-radius:7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:" +
                          (i ? "var(--bg-a185151810p14)" : "var(--bg-xf1f3f5)") +
                          ";color:" +
                          (i ? "var(--fg-x8a6f35)" : "var(--fg-xb8c0cc)"),
                        dotStyle:
                          "width:8px;height:8px;border-radius:50%;flex-shrink:0;background:" +
                          (i ? "var(--bg-x059669)" : "var(--bg-xcbd5e1)") +
                          (i ? ";box-shadow:0 0 0 3px rgba(5,150,105,0.15)" : ""),
                        dotTip: i ? "داخل سقف الإدارة — فيها ما هو مفعّل" : "خارج سقف الإدارة — لم يُفعَّل شيء تحتها",
                        subCount: r + " من " + s.length,
                        expand: () => this.capExpand(e.key),
                        expTip: a ? "طيّ «" + e.name + "»" : "فرد «" + e.name + "» وعرض ما تحتها",
                        expStyle:
                          "width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;font-family:'Cairo',sans-serif;border:1px solid " +
                          (a
                            ? "rgba(185,151,81,0.35);background:var(--bg-a185151810p1);color:var(--fg-x8a6f35)"
                            : "#e2e8f0;background:var(--bg-xffffff);color:var(--fg-x53565a)"),
                        chev: "transition:transform .2s;" + (a ? "transform:rotate(180deg)" : ""),
                      }),
                        a && s.forEach((t) => g(t.pk, t.onP, t.kd.v, t.kd.k, (e.names || {})[t.pk + "/" + t.kd.v.key])));
                    }),
                    t
                  );
                })(),
              ),
              saveBarStyle:
                "position:sticky;bottom:0;display:flex;align-items:center;gap:10px;padding:11px 14px;margin:14px -16px -16px;border-top:1px solid " +
                (g ? "rgba(201,112,42,0.35);background:var(--bg-a2552472370p97)" : "#E1E1E1;background:var(--bg-a2552552550p96)"),
              dirtyTxt: g ? "● تغييرات غير محفوظة — لن تُطبَّق حتى تضغط «حفظ السقف»" : "✓ محفوظ ومطابق لما هو مطبَّق الآن",
              dirtyTxtStyle: "flex:1;font-size:11.5px;font-weight:600;color:" + (g ? "var(--fg-xc9702a)" : "var(--fg-x94a3b8)"),
              saveBtnStyle:
                "height:34px;border:0;border-radius:10px;padding:0 18px;font-size:12px;font-weight:600;color:var(--fg-xffffff);font-family:'Cairo',sans-serif;" +
                (g
                  ? "cursor:pointer;background:linear-gradient(135deg,var(--bg-x8a6f35),var(--bg-xb99751));box-shadow:0 5px 14px -5px rgba(138,111,53,0.7)"
                  : "cursor:default;opacity:.4;background:var(--bg-x94a3b8)"),
              _sel: o,
            };
          })(),
          i = KIVO.BassamPerm && KIVO.BassamPerm.deptAccountsCount ? KIVO.BassamPerm.deptAccountsCount() : 0;
        return {
          ...r,
          oldAccOn: i > 0,
          oldAccMsg: "يوجد " + KIVO.BassamCount(i, "حساب إدارة|قديم") + " — الدخول صار للموظفين وحدهم من جدول موظفي الإدارة",
          oldAccDo: () => {
            const t = KIVO.BassamPerm.purgeDeptAccounts();
            t && t.ok ? this.setState({ tick: (this.state.tick || 0) + 1 }) : t && t.err && this.bsToast(t.err);
          },
          deptCount: a.length,
          stopProp: (t) => {
            t && t.stopPropagation && t.stopPropagation();
          },
          deptAddOn: !!e.deptAddOpen,
          deptAddOpen: () => this.setState({ deptAddOpen: !0, newDeptName: "", deptMsg: "" }),
          deptAddClose: () => this.setState({ deptAddOpen: !1 }),
          ...(() => {
            const s = KIVO.BassamAuth || null,
              r = e.mgrDid || "",
              i = e.mgrGid || "",
              n = i ? t.groupName(i) || "" : (a.filter((t) => t.id === r)[0] || {}).name || "",
              o = i
                ? this._gmRec(i, e.mgrUid || "")
                : r && s
                  ? "__add" === e.mgrUid
                    ? null
                    : e.mgrUid
                      ? (s.deptManagers ? s.deptManagers(r) : []).filter((x) => x.id === e.mgrUid)[0] || null
                      : s.deptManager
                        ? s.deptManager(r)
                        : null
                  : null,
              p = (t, s) => (void 0 !== e["mgrF_" + t] ? e["mgrF_" + t] : s),
              l = p("nid", o ? this._unSplit(o).nid : ""),
              d = p("phone", o ? this._unSplit(o).phone : ""),
              c = p("no", o ? o.empno : ""),
              g = p("name", o ? o.name : ""),
              h = (t, e) =>
                String(t || "")
                  .replace(/[^0-9]/g, "")
                  .slice(0, e);
            return {
              mgrOn: !(!r && !i),
              mgrTitle:
                (i
                  ? o
                    ? "تعديل مدير " + this._gmKind(i) + " — "
                    : "تعيين مدير " + this._gmKind(i) + " — "
                  : o
                    ? "تعديل مدير — "
                    : "إضافة مدير — ") + n,
              mgrHint: i
                ? "يُنشأ له حساب دخول ينتقل به بين إدارات هذا الفرع كلها، ويرث سقف كل إدارة كاملاً — والتضييق اختياري من «الصلاحيات» في بطاقته."
                : "يُنشأ له حساب دخول دون إدراجه في جدول موظفي الإدارة. لا يرث أي صفحة — بعد الحفظ افتح له «الصلاحيات» من جدول المستخدمين وحدّد صفحاته.",
              mgrName: g,
              onMgrName: (t) => this.setState({ mgrF_name: t.target.value, mgrErr: "" }),
              mgrRole: p("title", o && o.title ? o.title : ""),
              onMgrRole: (t) => this.setState({ mgrF_title: String(t.target.value || "").slice(0, 40), mgrErr: "" }),
              mgrRolePh: "إن تُرك فارغاً يظهر: " + (i ? (s && s.gmRoleLabel ? s.gmRoleLabel(i) : "مدير إدارة عامة") : "مدير الإدارة"),
              mgrNid: l,
              onMgrNid: (t) => this.setState({ mgrF_nid: h(t.target.value, 10), mgrErr: "" }),
              mgrPhone: d,
              onMgrPhone: (t) => this.setState({ mgrF_phone: h(t.target.value, 10), mgrErr: "" }),
              mgrNo: c,
              onMgrNo: (t) => this.setState({ mgrF_no: h(t.target.value, 6), mgrErr: "" }),
              mgrPreview: "يدخل بـ " + (l || d || "الهوية") + (l && d ? " أو " + d : "") + " · كلمة المرور " + (c || "الرقم الوظيفي"),
              mgrErr: e.mgrErr || "",
              mgrHasOld: !!o || !!(!i && r && s && s.deptManagers && s.deptManagers(r).length),
              mgrOldMsg: o
                ? "تعديل بيانات المدير: " + o.name + " — الحفظ يحدّث حسابه"
                : !i && r && s && s.deptManagers && s.deptManagers(r).length
                  ? "للإدارة " + KIVO.BassamCount(s.deptManagers(r).length, "مدير") + " — سيُضاف مدير جديد بنفس الصلاحيات"
                  : "",
              mgrSaveLbl: o ? "حفظ التعديل" : "إضافة المدير",
              mgrSave: () => (i ? this.gmSave(i) : this.mgrSave(r)),
              mgrClose: () => this.mgrClose(),
            };
          })(),
          ...(() => {
            const s = e.wpDid || "";
            if (!s)
              return { wpOn: !1, wpItems: [], wpHas: !1, wpNone: !1, wpClose: () => this.setState({ wpDid: "", wpTxt: "", wpMsg: "" }) };
            const r = (a.filter((t) => t.id === s)[0] || {}).name || "",
              i = {
                bassam_employees_v1: "الموظفون",
                bassam_custody_v1: "عهد الموظفين",
                bassam_staffing_v3: "الورديات والجدول الشهري",
                bassam_staffing_v2: "الورديات والجدول الشهري",
                bassam_staffing_locks_v1: "اعتمادات الجدول",
                bassam_staffing_snap_v1: "بيان الشهر (لقطة الاعتماد)",
                bassam_leave_kinds_v1: "كتالوج أنواع الإجازات",
                bassam_shift_options_v1: "خيارات الورديات",
                bassam_plan_v1: "الخطة التشغيلية وخرائط المواقع",
                bassam_rounds_v1: "الجولات اليومية",
                bassam_zone_opts_v1: "كتالوج المصليات",
                bassam_gate_opts_v1: "كتالوج البوابات",
                bassam_mark_kinds_v1: "كتالوج أنواع المعالم",
                bassam_tasks_v1: "المهام",
                bassam_tasks_locks_v1: "اعتمادات المهام",
                bassam_irshad_v1: "سجلات نظام الاسترشاد",
                bassam_award_v1: "ترشيحات جائزة التميز",
                bassam_irshad_locs_v1: "مواقع نظام الاسترشاد",
                bassam_irshad_langs_v1: "لغات نظام الاسترشاد",
                bassam_seized_v1: "محاضر نظام المضبوطات",
                bassam_seized_cat_v1: "قائمة ممنوعات المضبوطات",
                bassam_seized_acts_v1: "إجراءات المضبوطات",
                bassam_seized_locs_v1: "مواقع المضبوطات",
                bassam_seized_jew_v1: "أنواع قطع المجوهرات",
                bassam_options_v1: "الخيارات العامة",
                bassam_profile_v1: "الملف التعريفي",
              };
            let n = [];
            try {
              n = Object.keys((e.wpBase && e.wpBase.kv) || {});
            } catch (t) {
              n = [];
            }
            const o = {},
              p = [];
            let l = 0;
            let c6 = 0;
            (n.forEach((t) => {
              const e = t.slice(("bsdept:" + s + ":").length),
                a = i[e];
              a ? o[a] || ((o[a] = 1), this.bsOn(this.bsKeyCap(e), s) ? p.push({ label: a }) : c6++) : l++;
            }),
              c6 && p.push({ label: "و" + KIVO.BassamCount(c6, "مجموعة|محفوظة غير مفعّلة") + " في هذه الإدارة" }),
              l && p.push({ label: "إعدادات داخلية (" + l + ")" }));
            const counts = e.wpCounts || {};
            if (counts.custody > 0) p.push({ label: "سجل العهد والأصناف (" + counts.custody + ")" });
            if (counts.notifications > 0) p.push({ label: "تنبيهات الإدارة (" + counts.notifications + ")" });
            if (counts.irshad > 0) p.push({ label: "سجلات الاسترشاد وقوائمه والاستدراك (" + counts.irshad + ")" });
            if (counts.seized > 0) p.push({label:"بيانات المضبوطات وتوابعها ("+counts.seized+")"});
            if (counts.awards > 0) p.push({label:"بيانات التكريم ومراجعه ("+counts.awards+")"});
            const d = !!e.wpBase && ((counts.keys || 0) + (counts.custody || 0) + (counts.notifications || 0) + (counts.irshad || 0) + (counts.seized || 0) + (counts.awards || 0) > 0);
            return {
              wpOn: !0,
              wpTitle: "مسح جميع بيانات إدارة «" + r + "»",
              wpName: r,
              wpItems: p,
              wpHas: d,
              wpNone: !!e.wpBase && !d,
              wpBusy: !!e.wpBusy,
              wpNeedsReview: !!e.wpNeedsReview,
              wpReview: () => this.wpReview(s),
              wpMsg: e.wpMsg || "",
              wpGoStyle:
                "height:38px;padding:0 18px;border-radius:10px;font-size:12.5px;font-weight:600;border:0;font-family:'Cairo',sans-serif;color:var(--fg-xffffff);background:var(--bg-xdc2626);" + (e.wpBusy || e.wpNeedsReview ? "opacity:.5;cursor:not-allowed" : "cursor:pointer"),
              wpGo: () => this.wpGo(s, r),
              wpClose: () => this.wpClose(),
            };
          })(),
          ...(() => {
            const a = KIVO.BassamAuth || null,
              r = KIVO.BassamPerm || null,
              i = e.upUid || "",
              n = i ? (a && a.users ? a.users() : []).filter((t) => t.id === i)[0] : null;
            if (!n) return { upOn: !1, upRows: [], upHas: !1, upEmpty: !1, upEdit: !1, upClose: () => this.setState({ upUid: "" }) };
            const o = this._upDeptOf(n),
              p = "gm" === n.role,
              l = p && a && a.groupDepts ? a.groupDepts(n.gid) : [],
              d = r ? r.deptCap(o) : [],
              c = !!n.mgr,
              g = !!(a && a.isSuper && a.isSuper()),
              inh = (c || p) && r && r.hasOwnSheet && !r.hasOwnSheet(n.ekey, o),
              h = inh && r.capAllPerms ? r.capAllPerms(o) : r && r.empPerms ? r.empPerms(n.ekey, o) : {},
              m = g && e.upDraft && e.upFor === i ? e.upDraft : h,
              f = r && r.empLens ? r.empLens(n.ekey, o) : [],
              u = g && e.upLensDraft && e.upFor === i ? e.upLensDraft : f,
              b = g && (JSON.stringify(m) !== JSON.stringify(h) || JSON.stringify(u.slice().sort()) !== JSON.stringify(f.slice().sort())),
              w = (r && r.PAGE_REG) || [],
              y = (() => {
                try {
                  const e = t.raw && t.raw.getItem ? t.raw.getItem.call(localStorage, "bsdept:" + o + ":bassam_employees_v1") : null;
                  let a = JSON.parse(e);
                  if ((Array.isArray(a) || (a = []), o === s))
                    try {
                      const t = KIVO.__BS_SRV.operations.get("bassam_employees_v1");
                      Array.isArray(t) && t.length > a.length && (a = t);
                    } catch (t) {}
                  return a.filter((t) => (t.eid || t.name) === n.ekey)[0] || null;
                } catch (t) {
                  return null;
                }
              })(),
              S = e.upExp || {},
              x =
                r && r.treeModel
                  ? r.treeModel({
                      did: o,
                      draft: m,
                      lens: u,
                      expanded: S,
                      canEdit: g,
                      cb: {
                        togAct: (t, e) => this.upTog(i, t, e),
                        togLeaf: (t, e) => this.upAll(i, t, e),
                        expand: (t) => this.setState({ upExp: { ...(this.state.upExp || {}), [t]: !(this.state.upExp || {})[t] } }),
                        togLens: (t) => {
                          const e = this._upLens(i, n),
                            s = e.indexOf(t);
                          (-1 === s ? e.push(t) : e.splice(s, 1), this.setState({ upLensDraft: e, upFor: i }));
                        },
                      },
                    })
                  : { rows: [], lensRows: [], pagesOn: 0, pagesTot: 0, lensOnN: 0, lensTot: 0, capEmpty: !0, allExpanded: !1 },
              k = (() => {
                const t = {};
                return (
                  Object.keys(m)
                    .concat(Object.keys(h))
                    .forEach((e) => {
                      t[e] = 1;
                    }),
                  Object.keys(t).filter((t) => JSON.stringify(m[t] || []) !== JSON.stringify(h[t] || [])).length
                );
              })();
            const RET = {
              upOn: !0,
              upTitle: "صلاحيات — " + ((y && y.name) || n.name || "—"),
              upRoleLbl:
                ("super" !== n.role && String(n.title || "").trim()) ||
                (p
                  ? KIVO.BassamAuth && KIVO.BassamAuth.gmRoleLabel
                    ? KIVO.BassamAuth.gmRoleLabel(n.gid)
                    : "مدير إدارة عامة"
                  : c
                    ? "مدير الإدارة"
                    : "موظف"),
              upRoleStyle:
                "font-size:10px;font-weight:600;padding:3px 10px;border-radius:9999px;white-space:nowrap;" +
                (c
                  ? "background:var(--bg-a185151810p16);border:1px solid var(--bd-a185151810p4);color:var(--fg-x8a6f35)"
                  : "background:var(--bg-xffffff);border:1px solid var(--bd-xe2e8f0);color:var(--fg-x53565a)"),
              upNoteStyle: c
                ? "background:var(--bg-a201112420p07);border:1px solid var(--bd-a201112420p3);border-radius:11px;padding:10px 12px;font-size:11px;font-weight:400;color:var(--fg-xc9702a);line-height:1.8"
                : "background:var(--bg-a185151810p09);border:1px solid var(--bd-a185151810p25);border-radius:11px;padding:10px 12px;font-size:11px;font-weight:400;color:var(--fg-x8a6f35);line-height:1.8",
              upGmOn: p && l.length > 0,
              upGmRows: l.map((t) => ({
                name: t.name,
                on: t.id === o,
                style: KIVO.BassamMix ? KIVO.BassamMix.tabStyle(t.id === o, l.length) : "",
                pick: () => {
                  t.id !== o && this.setState({ upGmDept: t.id, upDraft: null, upLensDraft: null, upFor: "", up24Draft: null });
                },
              })),
              upNote: g
                ? p
                  ? inh
                    ? "مدير " +
                      this._gmKind(n.gid) +
                      " يرث سقف إدارة «" +
                      ((l.filter((t) => t.id === o)[0] || {}).name || "") +
                      "» كاملاً — التأشير أدناه هو حاله الآن؛ وأي تضييق تحفظه هنا يسري في هذه الإدارة وحدها، وإعادة التأشير كاملاً تعيده إلى التوريث."
                    : "لمدير " +
                      this._gmKind(n.gid) +
                      " ورقة مضيَّقة في إدارة «" +
                      ((l.filter((t) => t.id === o)[0] || {}).name || "") +
                      "» — أشّر الكل ليعود إلى توريث سقفها كاملاً."
                  : c
                    ? inh
                      ? "مدير الإدارة يرث سقف إدارته كاملاً — التأشير أدناه هو حاله الآن؛ وأي تضييق تحفظه هنا يسري عليه، وإعادة التأشير كاملاً تعيده إلى التوريث."
                      : "للمدير ورقة مضيَّقة — أشّر الكل ليعود إلى توريث سقف الإدارة كاملاً."
                    : "الحاوية بلا تأشير — تظهر في قائمة الموظف تلقائياً متى مُنح صفحةً واحدة تحتها. مربع الصفحة يمنح الأفعال الستة دفعة واحدة ثم تُلغي ما لا تريده، أو تؤشّر الأفعال بنفسك فيعكس حالتها. ما هو خارج سقف الإدارة يبقى مقفلاً."
                : c
                  ? "لتعديل صلاحيات المدير سجّل الدخول كمدير النظام."
                  : "الضبط الفعلي لصلاحيات الموظف من صفحة الموظفين بيد مدير إدارته — وهذه الشاشة للعرض.",
              upTplOn: g && d.length > 0,
              upTplRows: (() => {
                if (!g || !d.length) return [];
                let t = [];
                try {
                  const e = JSON.parse(localStorage.getItem("bassam_perm_tpls_v1"));
                  Array.isArray(e) && (t = e);
                } catch (t) {}
                return t.map((t) => ({
                  name: t.name,
                  apply: () => {
                    const e = r.expandPerms(t.perms || {}, o),
                      s = {};
                    (Object.keys(e).forEach((t) => {
                      -1 !== d.indexOf(r.splitLeaf(t).page) && (s[t] = e[t].slice());
                    }),
                      this.setState({ upDraft: s, upFor: i }));
                  },
                }));
              })(),
              upTplClear: () => this.setState({ upDraft: {}, upFor: i }),
              upEdit: g,
              upEmpty: 0 === d.length,
              upEmptyMsg: "سقف هذه الإدارة فارغ — فعّل لها صفحات أولاً من تبويب «سقف الصفحات»",
              upHas: d.length > 0,
              upRows: this.tskRecLegacy(x.rows),
              upLensRows: x.lensRows,
              upCountTxt: x.pagesOn + " من " + KIVO.BassamCount(x.pagesTot, "صفحة", "g") + "",
              upLensCountTxt: x.lensOnN + "/" + x.lensTot,
              upExpAllLbl: x.allExpanded ? "طيّ الكل" : "فرد الكل",
              upExpAll: () => {
                const t = !x.allExpanded,
                  e = {};
                (w.forEach((s) => {
                  !s.under && r.isContainer(s.key) && (e[s.key] = t);
                }),
                  this.setState({ upExp: e }));
              },
              upAllDo: () => {
                if (!g) return;
                const t = {};
                (r.leafReg().forEach((e) => {
                  -1 !== d.indexOf(e.page) &&
                    ((e.sub && -1 === r.deptSubs(o, e.page).concat(r.deptTabs(o, e.page)).indexOf(e.sub)) ||
                      (t[e.key] = r.ALL_ACTS.slice()));
                }),
                  this.setState({ upDraft: t, upFor: i }));
              },
              upNoneDo: () => {
                g && this.setState({ upDraft: {}, upFor: i });
              },
              upBarBorder: b ? "rgba(201,112,42,0.35)" : "#E1E1E1",
              upBarBg: b ? "rgba(255,247,237,0.97)" : "#FAFBFC",
              upDirtyTxt: g ? (b ? "● تغييرات غير محفوظة" + (k ? " — " + KIVO.BassamCount(k, "صفحة") + "" : "") : "✓ محفوظ") : "",
              upDirtyStyle: "flex:1;font-size:11px;font-weight:600;color:" + (b ? "var(--fg-xc9702a)" : "var(--fg-x94a3b8)"),
              upSaveStyle:
                "height:36px;border:0;border-radius:10px;padding:0 18px;font-size:12px;font-weight:600;color:var(--fg-xffffff);font-family:'Cairo',sans-serif;" +
                (b
                  ? "cursor:pointer;background:linear-gradient(135deg,var(--bg-x8a6f35),var(--bg-xb99751));box-shadow:0 5px 14px -5px rgba(138,111,53,0.7)"
                  : "cursor:default;opacity:.4;background:var(--bg-x94a3b8)"),
              upSave: () => {
                b && this.upSave(n, m, u);
              },
              upClose: () => this.setState({ upUid: "", upDraft: null, upLensDraft: null, upFor: "", upExp: {}, up24Draft: null, up24Exp: {}, up24Leaf: {} }),
              upV24: !1,
              upLegacy: !0,
            };
            /* ═══ KIVO_256 · وضعُ الإنفاذ: شجرةُ v24.9 مفتاحاً مفتاحاً — الحالةُ الفعلية كما يحسبها الخادم، والحفظُ فرقٌ صريح (plus/minus) فوق الورقة ═══ */
            if (this.t24On()) {
              const M = this.up24Model(n, o, inh, g),
                P24 = r.p24,
                dirty = M.dirty;
              Object.assign(RET, {
                upV24: !0,
                upLegacy: !1,
                upEdit: M.ed,
                upRows24: M.md.rows,
                upCount24: M.md.nOn + " من " + KIVO.BassamCount(M.md.nTot, "صلاحية", "g"),
                upExpAll24Lbl: M.md.allExpanded ? "طيّ الكل" : "فرد الكل",
                upExpAll24: () => this.setState({ up24Exp: this.t24ExpAll(M.md) }),
                upAllDo: () => {
                  if (!M.ed) return;
                  const d = {},
                    L = (r.deptLenses ? r.deptLenses(o) : []).filter((x) => M.C.lens(x) && P24.lensHosted(x, M.C));
                  P24.assignable(M.C, M.tgt).forEach((k) => {
                    const ln = P24.lensOf(k);
                    (!ln || -1 !== L.indexOf(ln)) && (d[k] = !0);
                  });
                  this.setState({ up24Draft: d, upLensDraft: L, upFor: i });
                },
                upNoneDo: () => {
                  M.ed && this.setState({ up24Draft: {}, upLensDraft: [], upFor: i });
                },
                upTplOn: M.ed && d.length > 0,
                upTplRows: M.ed
                  ? (r.tplsList ? r.tplsList(o) : []).map((tp) => ({
                      name: tp.name,
                      apply: () => {
                        const dl = r.deptLenses ? r.deptLenses(o) : [];
                        this.setState({ up24Draft: this.tp24Base(tp, o, M.C), upLensDraft: Array.isArray(tp.lens) ? tp.lens.filter((x) => -1 !== dl.indexOf(x)) : dl.slice(), upFor: i });
                      },
                    }))
                  : [],
                upTplClear: () => {
                  M.ed && this.setState({ up24Draft: {}, upLensDraft: [], upFor: i });
                },
                upNote: M.ed
                  ? "شجرةُ v24.9: الحاويةُ لا تُمنح — المفاتيحُ على الأوراق والعدسات. مربّعُ الورقة يمنح مفاتيحَها القابلة للمنح دفعةً واحدة، ومفتاحُ العرض شرطُ باقيها؛ وافتح الورقةَ (السهم) لتمنح أو تُسقط مفتاحاً بعينه. ما خارج سقف الإدارة مقفل، ومفاتيحُ الدور والذات لا تُمنح. الحفظُ يُكتب منحاً صريحاً فوق ورقته القديمة فلا يمسّها."
                  : g
                    ? "حسابٌ لا تُمنح مفاتيحُه من هنا (مدير النظام يحمل كلَّ ما في السقف · حسابُ الإدارة بالدور) — والشجرةُ للعرض."
                    : "الضبط الفعلي لصلاحيات الموظف من صفحة الموظفين بيد مدير إدارته — وهذه الشاشةُ للعرض: الحالةُ الفعلية كما يحسبها الخادم.",
                upBarBorder: dirty ? "var(--warning-border)" : "var(--border-default)",
                upBarBg: dirty ? "var(--warning-bg)" : "var(--bg-surface-2)",
                upDirtyTxt: M.ed ? (dirty ? "● تغييرات غير محفوظة" + (M.nDiff ? " — " + KIVO.BassamCount(M.nDiff, "مفتاح") : "") : "✓ محفوظ") : "",
                upDirtyStyle: "flex:1;font-size:11px;font-weight:600;color:" + (dirty ? "var(--fg-xc9702a)" : "var(--fg-x94a3b8)"),
                upSaveStyle:
                  "height:36px;border:0;border-radius:10px;padding:0 18px;font-size:12px;font-weight:600;color:var(--fg-xffffff);font-family:'Cairo',sans-serif;" +
                  (dirty
                    ? "cursor:pointer;background:linear-gradient(135deg,var(--bg-x8a6f35),var(--bg-xb99751));box-shadow:0 5px 14px -5px var(--brand-glow)"
                    : "cursor:default;opacity:.4;background:var(--bg-x94a3b8)"),
                upSave: () => {
                  dirty && this.up24Save(n, o, M);
                },
              });
            }
            return RET;
          })(),
          deptMsg2: e.deptMsg || "",
          deptAddSave: () => {
            const e = (this.state.newDeptName || "").trim();
            if (!e) return void this.setState({ deptMsg: "اكتب اسم الإدارة أولاً" });
            if (t.list().some((t) => t.name === e)) return void this.setState({ deptMsg: "يوجد إدارة بهذا الاسم" });
            const s = this.state.newDeptPid || null;
            if (s && !t.nodeOf(s)) return void this.setState({ deptMsg: "العقدة الأب غير موجودة" });
            const a = "d" + Date.now().toString(36) + Math.floor(1e6 * Math.random()).toString(36),
              r = { id: a, name: e };
            (s && (r.gid = s), t.save(t.list().concat([r])));
            try {
              const t = KIVO.BassamPerm;
              t && t.seedCapFrom && t.seedCapFrom(a, s);
            } catch (t) {}
            const i = { ...(this.state.admGrpFlip || {}) };
            (s && delete i[s],
              this.setState({
                newDeptName: "",
                deptAddOpen: !1,
                admGrpFlip: i,
                deptMsg:
                  "✓ أُضيفت إدارة «" +
                  e +
                  "»" +
                  (s ? " تحت «" + ((t.nodeOf(s) || {}).name || "") + "»" : " في الجذر بلا أب") +
                  " — أكمل حساب دخولها من صفّها",
              }));
          },
          newDeptPid: e.newDeptPid || "",
          onNewDeptPid: (t) => this.setState({ newDeptPid: t.target.value, deptMsg: "" }),
          newDeptPidOpts: this._parentOpts(t, ""),
          newDeptPathTxt: (() => {
            const s = e.newDeptPid;
            if (!s) return "في الجذر — بلا أب (غير مستحسن)";
            try {
              return (t.pathOf(s) || [])
                .concat([(t.nodeOf(s) || {}).name || ""])
                .filter(Boolean)
                .join(" ← ");
            } catch (t) {
              return "";
            }
          })(),
          actDeptName: t.activeName(),
          deptMsg: e.deptMsg || "",
          deptMsgColor: /^✓/.test(e.deptMsg || "") ? "#047857" : "#dc2626",
          newDeptName: e.newDeptName || "",
          onNewDept: (t) => this.setState({ newDeptName: t.target.value }),
          addDept: () => {
            this.setState({ deptAddOpen: !0 });
          },
          sdShow: (() => {
            try {
              return !!(t.needsStructure && t.needsStructure());
            } catch (e) {
              return !1;
            }
          })(),
          sdLbl: e.sdArm ? "اضغط مرة أخرى لزرع الهيكل" : "زرع هيكل القطاع",
          sdBg: e.sdArm ? "rgba(185,151,81,0.16)" : "#fff",
          sdGo: () => {
            if (!this.state.sdArm) {
              this.setState({ sdArm: !0, ndMsg: "" });
              clearTimeout(this._sdT);
              this._sdT = setTimeout(() => this.setState({ sdArm: !1 }), 4e3);
              return;
            }
            clearTimeout(this._sdT);
            const r = t.seedStructure();
            if (!r || !r.ok) return (this.bsToast((r && r.err) || "تعذّر زرع الهيكل"), void this.setState({ sdArm: !1 }));
            (this.setState({
              sdArm: !1,
              admGrpFlip: {},
              deptMsg:
                "✓ زُرع هيكل القطاع — " +
                KIVO.BassamCount(r.nodes, "عقدة") +
                " و" +
                KIVO.BassamCount(r.depts, "إدارة|جديدة") +
                "" +
                (r.linked ? " ورُبطت " + KIVO.BassamCount(r.linked, "إدارة|قائمة") + "" : ""),
            }),
              this.bsAck(
                "زُرع هيكل القطاع: " + KIVO.BassamCount(r.nodes, "عقدة") + " · " + KIVO.BassamCount(r.depts, "إدارة") + "",
                "ok",
              ));
          },
          ndOpen: !!e.ndOpen,
          ndToggle: () => this.setState({ ndOpen: !this.state.ndOpen, ndMsg: "", ndName: "", ndKind: "", ndNewKind: "" }),
          ndName: e.ndName || "",
          ndOnName: (t) => this.setState({ ndName: t.target.value, ndMsg: "" }),
          ndKind: e.ndKind || "",
          ndKinds: (t.nodeKinds ? t.nodeKinds() : []).map((t) => ({ id: t, name: t })),
          ndOnKind: (t) => this.setState({ ndKind: t.target.value, ndMsg: "" }),
          ndNewOn: "__new" === e.ndKind,
          ndNewKind: e.ndNewKind || "",
          ndOnNewKind: (t) => this.setState({ ndNewKind: t.target.value, ndMsg: "" }),
          ndPid: e.ndPid || "",
          ndPidOpts: this._parentOpts(t, ""),
          ndOnPid: (t) => this.setState({ ndPid: t.target.value, ndMsg: "" }),
          ndPathTxt: (() => {
            const s = e.ndPid;
            if (!s) return "في الجذر — بلا أب";
            try {
              return (t.pathOf(s) || [])
                .concat([(t.nodeOf(s) || {}).name || ""])
                .filter(Boolean)
                .join(" ← ");
            } catch (t) {
              return "";
            }
          })(),
          ndMsg: e.ndMsg || "",
          ndMsgColor: /^✓/.test(e.ndMsg || "") ? "#047857" : "#dc2626",
          ndGo: () => {
            const e = (this.state.ndName || "").trim(),
              s = ("__new" === this.state.ndKind ? this.state.ndNewKind || "" : this.state.ndKind || "").trim(),
              a = this.state.ndPid || null;
            if (!e) return void this.setState({ ndMsg: "اكتب الاسم" });
            if (!s) return void this.setState({ ndMsg: "اختر النوع" });
            if (t.nodes().some((t) => t.name === e) || t.list().some((t) => t.name === e))
              return void this.setState({ ndMsg: "يوجد في الهيكل ما يحمل هذا الاسم" });
            const r = { ...(this.state.admGrpFlip || {}) };
            if ((a && delete r[a], s === (t.NODE_KIND_DEPT || "إدارة"))) {
              if (a && !t.nodeOf(a)) return void this.setState({ ndMsg: "الأب غير موجود" });
              const s = "d" + Date.now().toString(36) + Math.floor(1e6 * Math.random()).toString(36),
                i = { id: s, name: e };
              (a && (i.gid = a), t.save(t.list().concat([i])));
              try {
                const t = KIVO.BassamPerm;
                t && t.seedCapFrom && t.seedCapFrom(s, a);
              } catch (t) {}
              return void this.setState({
                admGrpFlip: r,
                ndName: "",
                ndNewKind: "",
                ndMsg: "✓ أُنشئت إدارة «" + e + "» — أكمل حساب دخولها من صفّها",
              });
            }
            const i = t.nodeAdd({ name: e, kind: s, pid: a });
            i && i.ok
              ? this.setState({
                  admGrpFlip: r,
                  ndName: "",
                  ndNewKind: "",
                  ndMsg: "✓ أُنشئت «" + e + "» — وفُتح لها سقفُ صفحاتٍ موروثٌ من أبيها",
                })
              : this.setState({ ndMsg: (i && i.err) || "تعذّر الإنشاء" });
          },
          deptRows: this._nodeRows(
            t,
            e,
            (() => {
              const i = r._sel,
                n = ((KIVO.BassamPerm && KIVO.BassamPerm.PAGE_REG) || []).length;
              return a.map((r) => {
                const o = (KIVO.BassamAuth && KIVO.BassamAuth.users ? KIVO.BassamAuth.users() : []).find(
                    (t) => "dept" === t.role && t.deptId === r.id,
                  ),
                  p = "ua_un_" + r.id,
                  l = "ua_pw_" + r.id,
                  d = "ua_nm_" + r.id,
                  c = (() => {
                    try {
                      const e = t.raw && t.raw.getItem ? t.raw.getItem.call(localStorage, "bsdept:" + r.id + ":bassam_employees_v1") : null;
                      let a = 0;
                      const i = JSON.parse(e);
                      if ((Array.isArray(i) && (a = i.length), r.id === s))
                        try {
                          const t = KIVO.__BS_SRV.operations.get("bassam_employees_v1");
                          Array.isArray(t) && t.length > a && (a = t.length);
                        } catch (t) {}
                      return a;
                    } catch (t) {
                      return 0;
                    }
                  })(),
                  g = (KIVO.BassamAuth && KIVO.BassamAuth.users ? KIVO.BassamAuth.users() : []).filter(
                    (t) => "staff" === t.role && t.deptId === r.id && !t.dis,
                  ).length,
                  h = KIVO.BassamPerm || null,
                  m = h ? h.deptCap(r.id).length : 0;
                return {
                  ...KIVO.BassamCount.pair("empCount", String(c), "موظف"),
                  accCount: g ? KIVO.BassamCount(g, ["نشط واحد", "نشطان", "نشطَين", "نشطين", "نشطاً", "نشط"]) : "لا حسابات",
                  accCountStyle:
                    "display:inline-flex;align-items:center;font-size:10px;font-weight:600;padding:3px 10px;border-radius:9999px;white-space:nowrap;" +
                    (g
                      ? "background:var(--bg-a0132800p1);border:1px solid var(--bd-a0132800p3);color:var(--fg-x047857)"
                      : "background:var(--bg-a2452452450p9);border:1px solid var(--bd-xe2e8f0);color:var(--fg-x94a3b8)"),
                  rowTip:
                    r.id === s
                      ? "الإدارة النشطة حالياً — التبديل من قائمة الإدارات في الشريط العلوي"
                      : "للتبديل إليها استخدم قائمة الإدارات في الشريط العلوي",
                  _rid: r.id,
                  name: void 0 !== e["dnm_" + r.id] ? e["dnm_" + r.id] : r.name,
                  on: r.id === s,
                  off: r.id !== s,
                  avStyle:
                    "width:32px;height:32px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;" +
                    (r.id === s
                      ? "background:var(--bg-xb99751);color:var(--text-on-brand)"
                      : "background:var(--bg-a185151810p1);color:var(--fg-x9a7e40)"),
                  trStyle: "background:" + (r.id === s ? "var(--bg-a185151810p06)" : "var(--bg-xffffff)"),
                  pick: () => this.sysPick(r.id),
                  ...(() => {
                    const s = KIVO.BassamAuth || null,
                      i = s && s.deptManager ? s.deptManager(r.id) : null,
                      n = (() => {
                        try {
                          return t.keysOf(r.id).length > 0;
                        } catch (t) {
                          return !1;
                        }
                      })(),
                      o = (s && s.users ? s.users() : []).filter((t) => "staff" === t.role && t.deptId === r.id),
                      p = o.filter((t) => !t.dis).length,
                      l = KIVO.BassamPerm || null,
                      d = l ? l.deptCap(r.id).length : 0,
                      c = ((l && l.PAGE_REG) || []).length,
                      g = (() => {
                        const t = e.admArm;
                        return !(!t || "dept" !== t.t || t.id !== r.id);
                      })();
                    return {
                      mgrOpen: (t) => {
                        (t && t.stopPropagation && t.stopPropagation(), this.mgrOpen(r.id));
                      },
                      mgrTip: i ? "مدير الإدارة: " + i.name + " — اضغط للتعديل" : "تعيين مدير الإدارة",
                      mgrBtnStyle:
                        "width:24px;height:24px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;transition:.15s;background:var(--bg-xffffff);color:var(--fg-x8a6f35);border:1px dashed var(--bd-a185151810p55)",
                      mgrLbl: i ? "★ " + i.name + (i.dis ? " · مجمّد" : "") : "بلا مدير",
                      mgrLblStyle:
                        "display:block;width:fit-content;max-width:100%;box-sizing:border-box;font-size:10px;font-weight:600;border-radius:9999px;padding:3px 9px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" +
                        (i
                          ? "color:var(--fg-x8a6f35);background:var(--bg-a185151810p12);border:1px solid var(--bd-a185151810p32)"
                          : "color:var(--fg-xc9702a);background:var(--bg-a201112420p08);border:1px dashed var(--bd-a201112420p4)"),
                      wipeOpen: (t) => {
                        (t && t.stopPropagation && t.stopPropagation(), this.wpOpen(r.id));
                      },
                      wipeTip: n ? "مسح جميع بيانات إدارة «" + r.name + "»" : "لا توجد بيانات مخزّنة لهذه الإدارة",
                      wipeBtnStyle:
                        "width:24px;height:24px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:.15s;background:var(--bg-xffffff);" +
                        (n
                          ? "color:var(--fg-xc9702a);border:1px dashed var(--bd-a201112420p55);cursor:pointer"
                          : "color:var(--fg-xe2e8f0);border:1px dashed var(--bd-xeef1f4);cursor:default"),
                      impTip: "استيراد نسخة احتياطية إلى إدارة «" + r.name + "»",
                      impBtnStyle:
                        "width:24px;height:24px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;transition:.15s;background:var(--bg-xffffff);color:var(--fg-x0e7490);border:1px dashed var(--bd-a141161440p5)",
                      impStop: (t) => {
                        t && t.stopPropagation && t.stopPropagation();
                      },
                      impPick: (t) => {
                        t && t.stopPropagation && t.stopPropagation();
                        const e = t.target && t.target.files && t.target.files[0];
                        (t.target && (t.target.value = ""), e && KIVO.BassamDeptBackup && KIVO.BassamDeptBackup.importFile(e, r.id));
                      },
                      delOn: a.length > 1,
                      delTip: g
                        ? "اضغط مرة أخرى لحذف إدارة «" + r.name + "» وكل بياناتها نهائياً"
                        : "حذف إدارة «" + r.name + "» وكل بياناتها",
                      delStyle:
                        "width:24px;height:24px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;transition:.15s;" +
                        (g
                          ? "background:var(--bg-xdc2626);color:var(--fg-xffffff);border:1px solid var(--bd-xdc2626)"
                          : "background:var(--bg-xffffff);color:var(--fg-xb91c1c);border:1px dashed var(--bd-a18528280p5)"),
                      delGo: (t) => {
                        (t && t.stopPropagation && t.stopPropagation(), this.deptDel(r));
                      },
                      subLine:
                        KIVO.BassamCount(o.length, "مستخدم") +
                        " · " +
                        KIVO.BassamCount(p, ["نشط واحد", "نشطان", "نشطَين", "نشطين", "نشطاً", "نشط"]) +
                        " · سقف " +
                        d +
                        " من " +
                        KIVO.BassamCount(c, "صفحة", "g") +
                        "",
                      trMgrOn: !!i,
                      trMgrNo: !i,
                      trMgrName: i
                        ? i.name +
                          (i.dis ? " · موقوف" : "") +
                          (() => {
                            try {
                              const k = (s && s.deptManagers ? s.deptManagers(r.id) : []).length;
                              return k > 1 ? " +" + (k - 1) : "";
                            } catch (t) {
                              return "";
                            }
                          })()
                        : "",
                      trCapTxt: (() => {
                        try {
                          return l && l.hasCap(r.id) ? "السقف " + d + " من " + c : "السقف مفتوح";
                        } catch (t) {
                          return "السقف مفتوح";
                        }
                      })(),
                      ...KIVO.BassamCount.pair("trUsers", String(o.filter((t) => !t.mgr).length), "مستخدم"),
                    };
                  })(),
                  itemStyle:
                    "display:block;width:100%;box-sizing:border-box;text-align:right;border-radius:11px;padding:9px 10px;margin-bottom:3px;cursor:pointer;transition:.12s;border:1px solid " +
                    (r.id === i ? "rgba(185,151,81,0.35);background:var(--bg-a185151810p1)" : "transparent;background:transparent"),
                  capN: String(m),
                  capAll: String(n),
                  capBar: Array.apply(null, Array(n)).map((t, e) => ({
                    style: "flex:1;border-radius:2px;background:" + (e < m ? "var(--bg-xb99751)" : "var(--bg-xeff1f4)"),
                  })),
                  isActive: r.id === s,
                  notActive: r.id !== s,
                  switchTo: () => {
                    (t.setActive(r.id),
                      (KIVO.__BS_SRV && KIVO.__BS_SRV.flushAsync
                        ? Promise.resolve(KIVO.__BS_SRV.flushAsync(4e3)).catch(() => {})
                        : Promise.resolve()
                      ).then(
                        () => location.reload(),
                        () => location.reload(),
                      ));
                  },
                  onName: (t) => this.setState({ ["dnm_" + r.id]: t.target.value }),
                  rename: (e) => {
                    const s = (e.target.value || "").trim();
                    if (s && s !== r.name) {
                      if (t.list().some((t) => t.id !== r.id && t.name === s))
                        return (this.bsToast("يوجد إدارة بهذا الاسم"), void this.setState({ ["dnm_" + r.id]: r.name }));
                      (t.save(t.list().map((t) => (t.id === r.id ? { ...t, name: s } : t))),
                        this.setState({ ["dnm_" + r.id]: void 0, deptMsg: "✓ تم تحديث الاسم" }));
                    } else this.setState({ ["dnm_" + r.id]: r.name });
                  },
                  activate: () => {
                    (t.setActive(r.id),
                      (KIVO.__BS_SRV && KIVO.__BS_SRV.flushAsync
                        ? Promise.resolve(KIVO.__BS_SRV.flushAsync(4e3)).catch(() => {})
                        : Promise.resolve()
                      ).then(
                        () => location.reload(),
                        () => location.reload(),
                      ));
                  },
                  accExists: !!o,
                  accMissing: !o,
                  accUn: void 0 !== e["ua_un_" + r.id] ? e["ua_un_" + r.id] : o ? o.un : "",
                  accPw: e["ua_pw_" + r.id] || "",
                  accNm: void 0 !== e["ua_nm_" + r.id] ? e["ua_nm_" + r.id] : (o && o.name) || "",
                  accPwPh: o ? "كلمة مرور جديدة (اختياري)" : "كلمة المرور *",
                  onAccUn: (t) => this.setState({ [p]: t.target.value }),
                  onAccPw: (t) => this.setState({ [l]: t.target.value }),
                  onAccNm: (t) => this.setState({ [d]: t.target.value }),
                  accSave: () => {
                    const t = (void 0 !== this.state[p] ? this.state[p] : o ? o.un : "").trim(),
                      e = this.state[l] || "",
                      s = (void 0 !== this.state[d] ? this.state[d] : (o && o.name) || "").trim() || "مدير " + r.name;
                    t
                      ? KIVO.BassamAuth.upsertDeptAccount({ deptId: r.id, un: t, name: s, pw: e }).then((t) => {
                          t && t.ok
                            ? this.setState({ [l]: "", uaMsg: "✓ حُفظ حساب دخول إدارة «" + r.name + "»" })
                            : this.setState({ uaMsg: "إدارة «" + r.name + "»: " + ((t && t.err) || "تعذّر حفظ الحساب") });
                        })
                      : this.setState({ uaMsg: "اكتب اسم المستخدم لإدارة «" + r.name + "»" });
                  },
                  accArm: !(!e.admArm || "acc" !== e.admArm.t || e.admArm.id !== r.id),
                  accNoArm: !(e.admArm && "acc" === e.admArm.t && e.admArm.id === r.id),
                  accDel: () => {
                    const t = this.state.admArm;
                    if (!t || "acc" !== t.t || t.id !== r.id) {
                      const t = Date.now();
                      return (
                        this.setState({ admArm: { t: "acc", id: r.id, ts: t }, uaMsg: "" }),
                        void setTimeout(() => {
                          const e = this.state.admArm;
                          e && e.ts === t && this.setState({ admArm: null });
                        }, 4e3)
                      );
                    }
                    this.setState({ admArm: null });
                    const e = KIVO.BassamAuth.removeDeptAccount(r.id);
                    e && e.ok
                      ? this.setState({ [p]: void 0, [l]: "", uaMsg: "✓ حُذف حساب إدارة «" + r.name + "»" })
                      : this.setState({ uaMsg: (e && e.err) || "تعذّر حذف الحساب" });
                  },
                };
              });
            })(),
            r._sel,
          ),
        };
      })(),
      authSuper: s,
      admTabBarShow: s,
      ...(() => {
        const t = KIVO.BassamAuth,
          s = KIVO.BassamDepts;
        if (!t || !s) return { uaMsg: "", uaMsgColor: "#dc2626", pwHint: "" };
        const a = s.active();
        return (
          t.users().find((t) => "dept" === t.role && t.deptId === a),
          t.users().find((t) => "super" === t.role),
          {
            pwHint:
              "كلمة المرور: " + KIVO.BassamCount(t.PW_MIN || 6, "رقم") + " على الأقل — عند التعديل اترك الحقل فارغاً لإبقاء الحالي.",
            uaMsg: e.uaMsg || "",
            uaMsgColor: /^✓/.test(e.uaMsg || "") ? "#047857" : "#dc2626",
          }
        );
      })(),
      backupMsg: e.backupMsg || "",
      backupMsgColor: /تعذّر|غير صالح|لا توجد/.test(e.backupMsg || "") ? "#dc2626" : "#047857",
      ...(() => {
        let t = this._fullStamp();
        const e = this._expInfo(t, "full");
        return {
          fullLastTxt: e.txt,
          fullLastStyle:
            "margin-top:12px;font-size:11.5px;font-weight:600;display:inline-flex;align-items:center;gap:6px;color:" +
            (e.stale ? "var(--fg-xb45309)" : "var(--fg-x8a929b)"),
        };
      })(),
      exportBackup: () => {
        this._encPend = null;
        const t = KIVO.BassamDepts;
        if (!s) return void this.setState({ backupMsg: "صلاحية غير كافية — تصدير النسخة الشاملة للمشرف العام فقط" });
        if (!t) return void this.setState({ backupMsg: "تعذّر التصدير — نظام الإدارات غير متاح على هذا الجهاز" });
        const e = async (e) => {
          try {
            const s = {}, captureKeys = t.allScopedKeys().concat(["bassam_depts_v1", "bassam_gdepts_v1", "bassam_auth_users_v1", "bassam_perms_v1", "bassam_platform_v1"]), snapshot = this._irBackupCapture(captureKeys);
            (t.allScopedKeys().forEach((e) => {
              s[e] = t.raw.getItem.call(localStorage, e);
            }),
              (s.bassam_depts_v1 = t.raw.getItem.call(localStorage, "bassam_depts_v1")),
              (s.bassam_active_dept_v1 = t.raw.getItem.call(localStorage, "bassam_active_dept_v1")));
            try {
              const e = t.raw.getItem.call(localStorage, "bassam_gdepts_v1");
              null != e && (s.bassam_gdepts_v1 = e);
            } catch (t) {}
            try {
              const e = t.raw.getItem.call(localStorage, "bassam_auth_users_v1");
              null != e && (s.bassam_auth_users_v1 = e);
            } catch (t) {}
            try {
              const e = t.raw.getItem.call(localStorage, "bassam_perms_v1");
              null != e && (s.bassam_perms_v1 = e);
            } catch (t) {}
            try {
              const e = t.raw.getItem.call(localStorage, "bassam_platform_v1");
              null != e && (s.bassam_platform_v1 = e);
            } catch (t) {}
            await this._irBackupFence(snapshot);
            if (!KIVO.DailyStats) throw new Error("خدمة الإحصائيات غير متاحة");
            const dailyStats = await KIVO.DailyStats.refresh();
            if (!KIVO.BassamNotif) throw new Error("خدمة التنبيهات غير متاحة");
            const notificationExport=await KIVO.BassamNotif.exportDomain();
            const custodyExport=await KIVO.Custody.exportDomain();
            if (!custodyExport || custodyExport.ok !== 1) throw new Error("تعذّر تصدير مجال العهد؛ لم تُنشأ نسخة جزئية");
            Object.keys(s).forEach(key=>{if (/(?:^|:)bassam_custody_v1$/.test(key)) delete s[key];});
            if (!notificationExport || notificationExport.ok !== 1) throw new Error("تعذّر تصدير مجال التنبيهات");
            const declaredDepts=JSON.parse(s.bassam_depts_v1||"[]").map(d=>d.id);
            if(!Array.isArray(custodyExport.domains)||JSON.stringify(custodyExport.domains.map(d=>d.scope.departmentId).sort())!==JSON.stringify(declaredDepts.slice().sort()))throw new Error("نطاق العهد لا يطابق إدارات النسخة");
            const business = await KIVO.BackupRestore.exportDomains({departments:declaredDepts,full:true,v:snapshot.v,images:e||{}});
            Object.keys(s).forEach(key => { if (/(?:^|:)bassam_(?:irshad(?:_langs|_locs|_retro)?|seized(?:_cat|_jew|_acts|_locs|_retro)?|award(?:_docs)?)_v[12]$/.test(key)||KIVO.__BS_SRV.operations.resources.includes(key.replace(/^bsdept:[^:]+:/,''))) delete s[key]; });
            await this._irBackupFence(snapshot);
            const manifest={version:4,scope:"full",domains:{kv:1,dailyStats:1,notifications:1,custody:1,irshad:1,seized:1,awards:1,operations:1},departments:declaredDepts,keys:Object.keys(s).filter(k=>typeof s[k]==="string"&&k!=="bassam_active_dept_v1")};
            const a = new Date(),
              r = { app: "bassam-crowd", version: 4, kind: "full", exportedAt: a.toISOString(), data: s, domains: {dailyStats:{version:1,rev:KIVO.DailyStats.revision(),data:dailyStats},notifications:notificationExport.domain,custody:custodyExport.domains,...business.domains}, manifest, idbImages: business.images },
              i = KIVO.BassamCrypt;
            if (!i || !i.ok()) return void this.setState({ backupMsg: "تعذّر التصدير — التشفير غير متاح على هذا المتصفح" });
            ((this._encPend = {
              json: JSON.stringify(r),
              dt: a,
              depts: t ? t.list().length : 1,
              items: Object.keys(s).length,
              imgsN: Object.keys(e || {}).length,
            }),
              this.setState({ pwDlg: { mode: "exp", p1: "", p2: "", err: "" } }),
              setTimeout(() => {
                try {
                  const t = document.getElementById("bsPwD1");
                  t && t.focus();
                } catch (t) {}
              }, 60));
          } catch (t) {
            this.setState({ backupMsg: "تعذّر التصدير" });
          }
        };
        try {
          if (!KIVO.BassamIDB) throw new Error("مخزن الصور غير متاح على هذا المتصفح");
          KIVO.BassamIDB.allForBackup()
            .then((t) => e(t))
            .catch((t) => this.setState({ backupMsg: "تعذّر التصدير — " + ((t && t.message) || t) }));
        } catch (t) {
          this.setState({ backupMsg: "تعذّر التصدير — " + ((t && t.message) || t) });
        }
      },
      ...(() => {
        const t = e.fbkConf;
        if (!t)
          return {
            fbkOpen: !1,
            fbkPick: !0,
            fbkConfirm: !1,
            fbkCur: 0,
            fbkFile: 0,
            fbkOver: 0,
            fbkFresh: 0,
            fbkMergeDesc: "",
            fbkReplaceDesc: "",
            fbkWarn: "",
            fbkStop: () => {},
            fbkCancel: () => {},
            fbkMerge: () => {},
            fbkAskReplace: () => {},
            fbkDoReplace: () => {},
            fbkBack: () => {},
          };
        const s = !!t.legacy;
        return {
          fbkOpen: !0,
          fbkPick: "confirm" !== e.fbkStep,
          fbkConfirm: "confirm" === e.fbkStep,
          fbkCur: "—",
          fbkFile: t.file,
          fbkOver: "—",
          fbkFresh: "—",
          fbkMergeDesc: s ? "تُضاف مجموعات بيانات الإدارة المفقودة فقط؛ الموجود يبقى كما هو." : "تُضاف الإدارات الجديدة وبياناتها فقط؛ بيانات الإدارات القائمة وموارد المنصة العامة تبقى كما هي.",
          fbkReplaceDesc: "يعرض الخادم الجرد والنطاق قبل التأكيد، ثم يستبدل الموارد المعلنة بالنسخة في معاملة واحدة ويحفظ لقطة ما قبلها.",
          fbkWarn: "الاستعادة تغيّر بيانات الخادم. ستُراجع الصلاحيات والحسابات والمجالات الغائبة قبل عرض التأكيد النهائي؛ الصور الجديدة لا تُرفع من هذا المسار.",
          fbkStop: (t) => {
            t && t.stopPropagation && t.stopPropagation();
          },
          fbkCancel: () => {
            if(this._fbkSaving||this._fbkPend&&this._fbkPend.uncertain){this.setState({backupMsg:"تعذّر تأكيد نتيجة الطلب؛ أعد المحاولة نفسها قبل إغلاق الملف"});return;}
            ((this._fbkPend = null), this.setState({ fbkConf: null, fbkStep: "pick", backupMsg: "أُلغي الاستيراد — لم يتغيّر شيء" }));
          },
          fbkMerge: () => this.fbkCommit("merge"),
          fbkAskReplace: () => this.setState({ fbkStep: "confirm" }),
          fbkBack: () => this.setState({ fbkStep: "pick" }),
          fbkDoReplace: () => this.fbkCommit("replace"),
        };
      })(),
      pwOn: !!e.pwDlg,
      pwIsExp: !(!e.pwDlg || "exp" !== e.pwDlg.mode),
      pwTitle: e.pwDlg && "exp" === e.pwDlg.mode ? "تشفير النسخة الشاملة" : "النسخة الشاملة مشفَّرة",
      pwHint:
        e.pwDlg && "exp" === e.pwDlg.mode
          ? "اختر كلمة مرور (8 محارف فأكثر) — ستُطلب نفسها عند الاستيراد. احفظها في مكان آمن: لا سبيل لاستعادة النسخة بدونها."
          : "أدخل كلمة المرور التي اخترتها عند تصدير هذه النسخة لفك تشفيرها — بعدها تظهر خيارات الدمج أو الاستبدال كالمعتاد.",
      pwGoLabel: e.pwDlg && e.pwDlg.busy ? "جاري فك التشفير…" : e.pwDlg && "exp" === e.pwDlg.mode ? "تشفير وتنزيل" : "فك التشفير ومتابعة",
      pwP1: (e.pwDlg && e.pwDlg.p1) || "",
      pwP2: (e.pwDlg && e.pwDlg.p2) || "",
      pwErr: (e.pwDlg && e.pwDlg.err) || "",
      pwErrOn: !(!e.pwDlg || !e.pwDlg.err),
      pwP1Set: (t) => this._pwSet("p1", t.target.value),
      pwP2Set: (t) => this._pwSet("p2", t.target.value),
      pwKey: (t) => {
        "Enter" === t.key && (t.preventDefault(), this.pwDlgGo());
      },
      pwGo: () => this.pwDlgGo(),
      pwCancel: () => this.pwDlgCancel(),
      pwStop: (t) => t.stopPropagation(),
      importBackup: (event) => {
    if (this._fbkSaving || (this._fbkPend && this._fbkPend.uncertain)) {
      this.setState({ backupMsg: "أكمل تأكيد الطلب السابق قبل اختيار ملف آخر" });
      return;
    }
    const file = event.target && event.target.files && event.target.files[0];
    if (!file) return;
    try {
      event.target.value = "";
    } catch (error) {}
    if (!KIVO.BassamAuth || !KIVO.BassamAuth.isSuper()) {
      this.setState({ backupMsg: "استعادة النسخة الشاملة للمشرف العام فقط" });
      return;
    }
    const accept = (text) => {
      try {
        let obj = JSON.parse(text);
        if (obj && obj.kind === "full-enc" && obj.enc) {
          if (!KIVO.BassamCrypt || !KIVO.BassamCrypt.ok()) {
            this.setState({ backupMsg: "التشفير غير متاح" });
            return;
          }
          this._decPend = { enc: obj.enc, cont: accept };
          this.setState({ pwDlg: { mode: "imp", p1: "", p2: "", err: "" }, backupMsg: "" });
          return;
        }
        if (obj && obj.kind === "dept") {
          this.setState({ backupMsg: "استعد نسخة الإدارة من إعدادات الإدارة الهدف" });
          return;
        }
        if (!obj || typeof obj !== "object" || Array.isArray(obj)) throw new Error("shape");
        if (!obj.data) obj = { kind: "full", data: obj };
        const raw = obj.data;
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("shape");
        let fileDepts = [];
        try {
          fileDepts = JSON.parse(raw.bassam_depts_v1 || "[]");
        } catch (error) {}
        const legacy =
          (!obj.manifest && !Array.isArray(fileDepts)) ||
          (!obj.manifest && fileDepts.length === 0 && !Object.keys(raw).some((k) => k.startsWith("bsdept:")));
        this._fbkPend = {
          file: obj,
          data: raw,
          legacy,
          scoped: Object.keys(raw).filter((k) => k.startsWith("bsdept:")),
          fileDepts: Array.isArray(fileDepts) ? fileDepts : [],
          ticket: null,
        };
        this.setState({
          fbkStep: "pick",
          backupMsg: "اختر النمط لعرض جرد الخادم قبل الاعتماد",
          fbkConf: {
            legacy,
            cur: 0,
            file: Array.isArray(fileDepts) ? fileDepts.length : 1,
            over: 0,
            fresh: 0,
            items: Object.keys(raw).length,
            imgs: 0,
            orphans: 0,
          },
        });
      } catch (error) {
        this.setState({ backupMsg: "ملف النسخة غير صالح؛ لم يُكتب شيء" });
      }
    };
    const reader = new FileReader();
    reader.onload = () => accept(reader.result);
    reader.onerror = () => this.setState({ backupMsg: "تعذّرت قراءة الملف" });
    reader.readAsText(file);
  },
      ...t,
      __end: 0,
    };
  }
  async nfLoadManagement(more) {
    const N=this.nfN();if(!N)return;
    this.nfRefreshTargets();
    const result=await (more ? N.loadMoreBroadcasts() : N.refreshManagement());
    if(this._nfDisposed)return;
    this.setState({nfTick:(this.state.nfTick || 0)+1,nfManageError:result && result.ok === 1 ? "" : (result && result.err) || "تعذّر تحميل سجل التعاميم"});
  }
  nfN() {
    return KIVO.BassamNotif || null;
  }
  nfDraftAll() {
    if (this.state.nfDraft) return this.state.nfDraft;
    const t = this.nfN(),
      e = {};
    return t
      ? (t.types().forEach((t) => {
          e[t.id] = { on: t.on, to: t.to.slice(), lvl: t.lvl, chan: t.chan, txt: t.txt };
        }),
        e)
      : e;
  }
  nfDirtyIds() {
    const t = this.nfN();
    if (!t || !this.state.nfDraft) return [];
    const e = this.state.nfDraft,
      s = [];
    return (
      t.types().forEach((t) => {
        const a = e[t.id];
        a &&
          ((!!a.on == !!t.on &&
            a.to.slice().sort().join() === t.to.slice().sort().join() &&
            a.lvl === t.lvl &&
            a.chan === t.chan &&
            String(a.txt || "").trim() === t.txt) ||
            s.push(t.id));
      }),
      s
    );
  }
  nfSet(t, e) {
    const N=this.nfN();
    if (!N || !N.status().ready) return this.bsToast("انتظر تحميل إعدادات التنبيهات من الخادم","warn");
    const s = JSON.parse(JSON.stringify(this.nfDraftAll()));
    const base=this.state.nfDraft ? this.state.nfDraftBase : N.status().configRev;
    ((s[t] = Object.assign({}, s[t] || {}, e)), this.setState({ nfDraft: s,nfDraftBase:base }));
  }
  nfSetAll(t) {
    const N=this.nfN();
    if (!N || !N.status().ready) return this.bsToast("انتظر تحميل إعدادات التنبيهات من الخادم","warn");
    const base=this.state.nfDraft ? this.state.nfDraftBase : N.status().configRev;
    const e = JSON.parse(JSON.stringify(this.nfDraftAll()));
    (Object.keys(e).forEach((s) => t(e[s], s)), this.setState({ nfDraft: e,nfDraftBase:base }));
  }
  async nfSave() {
    const t = this.nfN();
    if (!t) return { ok: !1 };
    const e = this.nfDirtyIds();
    if (!e.length) return { ok: !0, n: 0 };
    const draft=this.nfDraftAll(), submitted=JSON.stringify(draft);
    const s = await t.setCfg(draft,this.state.nfDraftBase);
    if (s && s.ok === 1 && JSON.stringify(this.nfDraftAll()) === submitted) this.setState({nfDraft:null,nfDraftBase:null});
    return Object.assign({n:e.length},s || {ok:0});
  }
  nfBc() {
    return (
      this.state.nfBc || {
        title: "",
        body: "",
        link: "",
        lvl: "info",
        ack: !0,
        pin: !0,
        rem: !0,
        when: "now",
        at: "",
        expDays: 0,
        mode: "all",
        sel: [],
        empQ: "",
      }
    );
  }
  nfBcSet(t) {
    this.setState({nfBc:Object.assign({},this.nfBc(),t)},()=>this.nfRefreshTargets());
  }
  nfRefreshTargets(force) {
    const N=this.nfN(), A=KIVO.BassamAuth;
    if (!N || !A || !A.isSuper || !A.isSuper()) return;
    const target=this.nfBcTarget(), key=JSON.stringify(target);
    if (!force && ((this.state.nfTargets && this.state.nfTargets.key === key) || this._nfTargetsPending === key)) return;
    clearTimeout(this._nfTargetsTimer);
    const seq=(this._nfTargetsSeq || 0)+1; this._nfTargetsSeq=seq; this._nfTargetsPending=key;
    this.setState({nfTargets:{key:key,ready:false,n:null,shifts:[],error:""}});
    this._nfTargetsTimer=setTimeout(async()=>{
      let result;
      try {result=await N.targets(target);} catch(e) {result={ok:0,err:"تعذّر حساب المستهدفين"};}
      if (this._nfDisposed || this._nfTargetsSeq !== seq || JSON.stringify(this.nfBcTarget()) !== key) return;
      this._nfTargetsPending="";
      const valid=result && result.ok === 1 && Number.isSafeInteger(result.n) && result.n >= 0 && Array.isArray(result.shifts);
      this.setState({nfTargets:{key:key,ready:!!valid,n:valid ? result.n : null,shifts:valid ? result.shifts : [],error:valid ? "" : (result && result.err) || "تعذّر حساب المستهدفين"}});
    },250);
  }
  nfBcTarget(t) {
    return { mode: (t = t || this.nfBc()).mode, sel: t.sel.slice() };
  }
  nfBcPayload(t) {
    const e = "sched" === (t = t || this.nfBc()).when && t.at ? new Date(t.at).getTime() : 0;
    return {
      title: t.title,
      body: t.body,
      link: t.link,
      lvl: t.lvl,
      ack: t.ack,
      pin: t.pin,
      rem: t.rem,
      at: e > Date.now() ? e : 0,
      expDays: +t.expDays || 0,
      target: this.nfBcTarget(t),
    };
  }
  nfTargetTxt(t) {
    const e = this.nfN(),
      s = (t = t || { mode: "all" }).sel || [];
    if ("all" === t.mode || !t.mode) return "كل المنصة";
    if ("dept" === t.mode) {
      const t = KIVO.BassamDepts && KIVO.BassamDepts.list ? KIVO.BassamDepts.list() : [];
      return s.map((e) => (t.filter((t) => t.id === e)[0] || {}).name || e).join(" · ") || "— بلا إدارة";
    }
    if ("role" === t.mode) {
      const t = { mgr: "مديرو الإدارات", lead: "رؤساء الورديات", staff: "الموظفون" };
      return s.map((e) => t[e] || e).join(" · ") || "— بلا فئة";
    }
    if ("shift" === t.mode) return s.join(" · ") || "— بلا وردية";
    if ("emp" === t.mode) {
      const t = e && KIVO.BassamAuth && KIVO.BassamAuth.users ? KIVO.BassamAuth.users() : [];
      return s.map((e) => (t.filter((t) => t.ekey === e)[0] || {}).name || e).join("، ") || "— بلا موظف";
    }
    return "";
  }
  nfVals() {
    const t = this.nfN();
    if (!t || !t.status().ready) return {nfReady:!1,nfUnavailable:!0,nfLoadMessage:(t && t.status().error) || "جارٍ تحميل التنبيهات من الخادم…",nfRetry:()=>t && t.refresh()};
    const e = this.state,
      s = this.nfDraftAll(),
      a = this.nfDirtyIds(),
      r = String(e.nfQ || "").trim(),
      i = e.nfExp || {},
      n = e.nfSec || "tree",
      o = t.TO,
      p = t.LV,
      l = t.CH,
      d = t.KC,
      c = t.LEAVES,
      g = c.filter((t) => s[t.id] && s[t.id].on).length,
      h = c.filter((t) => s[t.id] && s[t.id].on && "urg" === s[t.id].lvl).length,
      m = t.bcAll(),
      u = (t) =>
        "padding:6px 14px;border-radius:9px;font-size:11.5px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:'Cairo',sans-serif;" +
        (t ? "background:var(--bg-xffffff);color:var(--fg-x141414);box-shadow:var(--shadow-card)" : "color:var(--fg-x6b7280)"),
      b = (t, e) =>
        "font-size:10px;font-weight:600;padding:3px 9px;border-radius:9999px;cursor:pointer;white-space:nowrap;user-select:none;display:inline-flex;align-items:center;gap:4px;border:1px solid " +
        (t
          ? (e || "var(--bd-a141161440p4)") +
            ";background:" +
            (e ? e.replace(/,\.\d+\)$/, ",.08)") : "rgba(14,116,144,.08)") +
            ";color:" +
            (e ? "var(--fg-x141414)" : "var(--fg-x0e7490)")
          : "#e2e8f0;background:var(--bg-xffffff);color:var(--fg-x94a3b8)"),
      w = (t, e) =>
        "font-size:10px;font-weight:700;padding:3px 8px;border-radius:7px;cursor:pointer;white-space:nowrap;" +
        (t
          ? "urg" === e
            ? "background:var(--bg-a22038380p08);color:var(--fg-xdc2626);border:1px solid var(--bd-a22038380p3)"
            : "act" === e
              ? "background:var(--bg-a185151810p1);color:var(--fg-x8a6f35);border:1px solid var(--bd-a185151810p4)"
              : "background:var(--bg-xf1f3f5);color:var(--fg-x334155);border:1px solid var(--bd-xd7dce2)"
          : "background:transparent;color:var(--fg-xb0b7c3);border:1px solid transparent"),
      y = (t) =>
        "position:relative;display:inline-block;width:36px;height:20px;border-radius:9999px;flex-shrink:0;cursor:pointer;transition:background .2s;box-shadow:inset 0 0 0 1px rgba(0,0,0,.04);background:" +
        (t
          ? "radial-gradient(circle at 10px 10px,#fff 6.5px,transparent 7.5px) #059669"
          : "radial-gradient(circle at 26px 10px,#fff 6.5px,transparent 7.5px) #cfd3da"),
      S = (t, e) =>
        !r ||
        -1 !==
          KIVO.BassamFind.dig(t.name + " " + (s[t.id] ? s[t.id].txt : "") + " " + e.name + " " + t.sub).indexOf(KIVO.BassamFind.dig(r)),
      x = [];
    t.REG.forEach((t) => {
      const e = t.subs.reduce((t, e) => t.concat(e.leaves), []),
        n = e.filter((e) => S(e, t));
      if (r && !n.length) return;
      const c = e.filter((t) => s[t.id] && s[t.id].on).length,
        g = !!r || !!i[t.key];
      (x.push({
        isCont: !0,
        key: t.key,
        name: t.name,
        icon: t.icon,
        cnt: c + " من " + e.length,
        cntW: KIVO.BassamCount.word(e.length, "تنبيه", "g"),
        open: g,
        dirty: e.some((t) => -1 !== a.indexOf(t.id)),
        rowStyle:
          "display:flex;align-items:center;gap:9px;padding:11px 12px;border-bottom:1px solid var(--bd-xf1f3f5);cursor:pointer;user-select:none;background:" +
          (g ? "var(--bg-xfafaf7)" : "var(--bg-xffffff)") +
          (c ? "" : ";opacity:.7"),
        fiStyle:
          "width:24px;height:24px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;background:" +
          (c ? "var(--bg-a185151810p14)" : "var(--bg-xf1f3f5)"),
        dotStyle:
          "width:8px;height:8px;border-radius:9999px;flex-shrink:0;background:" +
          (c ? "#059669;box-shadow:0 0 0 3px rgba(5,150,105,.15)" : "#cfd3da"),
        dotTip: c ? "فيها تنبيهات مفعّلة" : "كل تنبيهاتها مطفأة",
        exStyle: "transition:transform .15s;color:var(--fg-x94a3b8);display:inline-flex;transform:rotate(" + (g ? "180deg" : "0") + ")",
        expand: () => {
          const e = Object.assign({}, this.state.nfExp || {});
          ((e[t.key] = !e[t.key]), this.setState({ nfExp: e }));
        },
      }),
        g &&
          t.subs.forEach((e) => {
            const r = e.leaves.filter((e) => S(e, t));
            r.length &&
              (x.push({ isSub: !0, name: e.name, cnt: r.filter((t) => s[t.id] && s[t.id].on).length + "/" + e.leaves.length }),
              r.forEach((t) => {
                const e = s[t.id] || { on: t.on, to: t.to, lvl: t.lvl, chan: t.chan, txt: t.txt },
                  r = -1 !== a.indexOf(t.id),
                  i = d[t.k] || "#475569";
                x.push({
                  isLeaf: !0,
                  id: t.id,
                  name: t.name,
                  when: t.when,
                  on: e.on,
                  isDirty: r,
                  rowStyle:
                    "display:grid;grid-template-columns:36px minmax(150px,1.3fr) minmax(170px,1fr) 176px 132px minmax(190px,1.5fr);gap:10px;align-items:center;padding:8px 30px 8px 12px;border-bottom:1px solid var(--bd-xf1f3f5);" +
                    (e.on ? "background:var(--bg-xffffff)" : "background:var(--bg-a2502512520p7)") +
                    (r ? ";box-shadow:inset 3px 0 0 var(--warning)" : ""),
                  nmStyle: "font-size:12px;font-weight:700;color:" + (e.on ? "var(--fg-x141414)" : "var(--fg-x94a3b8)"),
                  swStyle: y(e.on),
                  tog: () => this.nfSet(t.id, { on: !e.on }),
                  chips: Object.keys(o)
                    .filter((e) => "own" !== e || -1 !== t.to.indexOf("own"))
                    .map((s) => ({
                      lbl: o[s],
                      style: b(-1 !== e.to.indexOf(s)),
                      go: () => {
                        const a = e.to.slice(),
                          r = a.indexOf(s);
                        (-1 === r ? a.push(s) : a.length > 1 && a.splice(r, 1), this.nfSet(t.id, { to: a }));
                      },
                    })),
                  lvls: Object.keys(p).map((s) => ({ lbl: p[s], style: w(e.lvl === s, s), go: () => this.nfSet(t.id, { lvl: s }) })),
                  chans: Object.keys(l).map((s) => ({
                    lbl: "bell" === s ? "🔔 الجرس" : "🔔+💬 توست",
                    tip: l[s],
                    style: b(e.chan === s, "rgba(185,151,81,.5)"),
                    go: () => this.nfSet(t.id, { chan: s }),
                  })),
                  txt: e.txt,
                  txtChange: (e) => this.nfSet(t.id, { txt: e.target.value }),
                  txtStyle:
                    "width:100%;height:30px;border:1px solid " +
                    (e.txt.trim() !== t.txt ? "var(--bd-a21711960p5)" : "var(--bd-xeceef1)") +
                    ";border-radius:8px;padding:0 9px;font-family:'Cairo',sans-serif;font-size:11px;color:var(--fg-x3d4148);background:" +
                    (e.on ? "var(--bg-xfcfbf8)" : "var(--bg-xffffff)") +
                    ";box-sizing:border-box;outline:none",
                  colStyle: "width:3px;height:100%;min-height:26px;border-radius:2px;background:" + i,
                });
              }));
          }));
    });
    const k = this.nfBc(),
      v = e.nfTargets && e.nfTargets.key === JSON.stringify(this.nfBcTarget(k)) ? e.nfTargets : {ready:false,n:null,shifts:[]},
      _ = v.ready ? v.n : null,
      O = KIVO.BassamDepts && KIVO.BassamDepts.list ? KIVO.BassamDepts.list() : [],
      D = KIVO.BassamAuth && KIVO.BassamAuth.users ? KIVO.BassamAuth.users().filter((t) => t && !t.dis && "super" !== t.role) : [],
      T = (t) => b(t, "rgba(185,151,81,.5)"),
      A = String(k.empQ || "").trim(),
      P =
        "emp" === k.mode && A
          ? D.filter(
              (t) =>
                -1 === k.sel.indexOf(t.ekey) &&
                -1 !== KIVO.BassamFind.dig((t.name || "") + " " + (t.un || "")).indexOf(KIVO.BassamFind.dig(A)),
            ).slice(0, 8)
          : [],
      B = [{ v: "", t: "— بلا رابط" }].concat(
        Object.keys(t.GO_NAV)
          .map((t) => t.replace(/^افتح /, ""))
          .filter((t, e, s) => s.indexOf(t) === e)
          .map((t) => ({ v: t, t: t })),
      ),
      E = !!(!this._nfBcSending && v.ready && k.title.trim() && k.body.trim() && _ > 0 && ("sched" !== k.when || (k.at && new Date(k.at).getTime() > Date.now()))),
      M = async (t) => {
        if (this._nfBcSending) return;
        this._nfBcSending=true;this.setState({nfSending:true});
        try {
        const e = this.nfN(),
          s = this.nfBcPayload(k);
        if (t) {
          const t = await e.bcPreviewMe(s);
          return void this.bsToast(
            t && t.ok ? "وصلتك نسخة معاينة في جرسك — لم تُرسل لأحد" : (t && t.err) || "تعذّر",
            t && t.ok ? "ok" : "warn",
          );
        }
        const submitted=JSON.stringify(this.nfBc());
        const a = await e.bcSend(s);
        a && a.ok
          ? (this.setState(JSON.stringify(this.nfBc()) === submitted ? {nfBc:null,nfSec:"log"} : {nfSec:"log"}),
            this.bsAck(
              s.at
                ? "جُدول التعميم — سيصل " + KIVO.BassamCount(a.n, "شخص") + " في وقته"
                : "أُرسل التعميم إلى " +
                    KIVO.BassamCount(a.n, "شخص", "g") +
                    " — " +
                    KIVO.BassamCount.agr(a.n, "ووصله", "ووصلهما", "ووصلهم") +
                    " الآن في الجرس",
              "ok",
            ))
          : this.bsToast((a && a.err) || "تعذّر الإرسال", "warn");
        } finally {this._nfBcSending=false;if(!this._nfDisposed)this.setState({nfSending:false});}
      },
      N = (t) => {
        try {
          return new Date(t).toLocaleString("ar-SA-u-ca-islamic-umalqura-nu-latn", {
            weekday: "long",
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          });
        } catch (e) {
          return new Date(t).toLocaleString();
        }
      },
      R = (t, e) => (e ? Math.round((t / e) * 100) : 0),
      L = m
        .slice()
        .sort((a,b)=>b.at-a.at)
        .map((e) => {
          const s = t.bcStats(e.id),
            a = s.unreadCount,
            r = !!e.wd || !!(e.exp && e.exp < Date.now()),
            i = e.at > Date.now();
          return {
            id: e.id,
            title: e.title,
            body: e.body.slice(0, 110) + (e.body.length > 110 ? "…" : ""),
            to: this.nfTargetTxt(e.target),
            ...KIVO.BassamCount.pair("n", String(s.n), "شخص"),
            at: N(e.at),
            by: e.by || "",
            lvl: p[e.lvl] || e.lvl,
            lvlStyle: w(!0, e.lvl),
            state: e.wd ? "مسحوب" : i ? "مجدول" : r ? "منتهٍ" : "سارٍ",
            stStyle:
              "font-size:9.5px;font-weight:700;padding:2px 8px;border-radius:6px;" +
              (e.wd
                ? "background:var(--bg-a22038380p07);color:var(--fg-xb91c1c)"
                : i
                  ? "background:var(--bg-a291112140p08);color:var(--fg-x1d6fd6)"
                  : r
                    ? "background:var(--bg-xf1f3f5);color:var(--fg-x6b7280)"
                    : "background:var(--bg-a51501050p09);color:var(--fg-x065f46)"),
            readP: R(s.read, s.n) + "٪",
            readW: "width:" + R(s.read, s.n) + "%",
            hasAck: !!e.ack,
            ackP: R(s.ack, s.n) + "٪",
            ackW: "width:" + R(s.ack, s.n) + "%",
            canRem: !r && !i && a > 0,
            remLbl: "تذكير لغير القارئين (" + a + ")",
            remind: async () => {
              const s = await t.bcRemind(e.id);
              (s && s.ok
                ? this.bsAck("أُرسل التذكير إلى " + KIVO.BassamCount(s.n, "شخص", "g") + "", "ok")
                : this.bsToast("تعذّر", "warn"),
                this.setState({ nfTick: (this.state.nfTick || 0) + 1 }));
            },
            canWd: !r,
            withdraw: () => {
              KIVO
                .bsConfirm({
                  title: "سحب التعميم",
                  msg: "سحب التعميم «" + e.title + "»؟ سيختفي من أجراس الجميع.",
                  ok: "سحب التعميم",
                  danger: !0,
                })
                .then(async(y)=>{
                  if (!y) return;
                  const result=await t.bcWithdraw(e.id);
                  if (result && result.ok === 1) {this.bsAck("سُحب التعميم","ok");this.setState({nfTick:(this.state.nfTick || 0)+1});}
                  else this.bsToast((result && result.err) || "تعذّر سحب التعميم","warn");
                });
            },
            rowStyle:
              "display:grid;grid-template-columns:minmax(200px,1.6fr) minmax(140px,1fr) 90px 150px 110px 110px auto;gap:10px;align-items:center;padding:10px 14px;border-bottom:1px solid var(--bd-xf1f3f5);font-size:11.5px;" +
              (r ? "opacity:.6" : ""),
          };
        });
    return {
      nfReady: !0,nfUnavailable:!1,
      nfKTypes: String(c.length),
      nfKOn: String(g),
      nfKUrg: String(h),
      nfKBc:t.status().bcReady ? String(t.status().bcTotal) : "…",
      nfKSum: KIVO.BassamCount(t.REG.length, "صفحة") + " · " + KIVO.BassamCount(c.length, "حدث") + " · " + g + " مفعّلاً",
      nfOnTree: "tree" === n,
      nfOnBc: "bc" === n,
      nfOnLog: "log" === n,
      nfSecTree: u("tree" === n),
      nfSecBc: u("bc" === n),
      nfSecLog: u("log" === n),
      nfGoTree: () => this.setState({ nfSec: "tree" }),
      nfGoBc: () => this.setState({ nfSec: "bc" }),
      nfGoLog:()=>this.setState({nfSec:"log"},()=>this.nfLoadManagement()),
      nfQ: r,
      nfQOn: (t) => this.setState({ nfQ: t.target.value }),
      nfQClear: () => this.setState({ nfQ: "" }),
      nfQHas: !!r,
      nfRows: x,
      nfEmptyQ: r && !x.length,
      nfEmptyTxt: "لا حدث يطابق «" + r + "»",
      nfExpLbl: t.REG.every((t) => i[t.key]) ? "طيّ الكل" : "فرد الكل",
      nfExpAll: () => {
        const e = !t.REG.every((t) => i[t.key]),
          s = {};
        (t.REG.forEach((t) => (s[t.key] = e)), this.setState({ nfExp: s }));
      },
      nfOnAll: () => this.nfSetAll((t) => (t.on = !0)),
      nfOffAll: () => this.nfSetAll((t) => (t.on = !1)),
      nfDirtyN: a.length,
      nfDirtyOn: a.length > 0,
      nfDirtyTxt:
        KIVO.BassamCount(a.length, "تغيير|غير محفوظ") +
        " — " +
        KIVO.BassamCount.agr(a.length, "يُطبَّق", "يُطبَّقان", "تُطبَّق") +
        " على الأحداث القادمة فور الحفظ",
      nfBcTitle: k.title,
      nfBcBody: k.body,
      nfBcLink: k.link,
      nfBcAt: k.at,
      nfBcExp: String(k.expDays || 0),
      nfBcEmpQ: k.empQ || "",
      nfBcSetTitle: (t) => this.nfBcSet({ title: t.target.value }),
      nfBcSetBody: (t) => this.nfBcSet({ body: t.target.value }),
      nfBcSetLink: (t) => this.nfBcSet({ link: t.target.value }),
      nfBcSetAt: (t) => this.nfBcSet({ at: t.target.value }),
      nfBcSetExp: (t) => this.nfBcSet({ expDays: +t.target.value || 0 }),
      nfBcSetEmpQ: (t) => this.nfBcSet({ empQ: t.target.value }),
      nfBcLinks: B.map((t) => ({ v: t.v, t: t.t, sel: t.v === k.link })),
      nfBcExps: [
        [0, "لا ينتهي"],
        [3, "3 أيام"],
        [7, "أسبوع"],
        [30, "شهر"],
      ].map((t) => ({ v: String(t[0]), t: t[1], sel: (+k.expDays || 0) === t[0] })),
      nfBcLvls: Object.keys(p).map((t) => ({ lbl: p[t], style: w(k.lvl === t, t), go: () => this.nfBcSet({ lvl: t }) })),
      nfBcAckSw: y(k.ack),
      nfBcAckTog: () => this.nfBcSet({ ack: !k.ack }),
      nfBcPinSw: y(k.pin),
      nfBcPinTog: () => this.nfBcSet({ pin: !k.pin }),
      nfBcRemSw: y(k.rem),
      nfBcRemTog: () => this.nfBcSet({ rem: !k.rem }),
      nfBcNowS: u("now" === k.when),
      nfBcSchedS: u("sched" === k.when),
      nfBcNow: () => this.nfBcSet({ when: "now" }),
      nfBcSched: () => this.nfBcSet({ when: "sched" }),
      nfBcIsSched: "sched" === k.when,
      nfBcModes: [
        ["all", "كل المنصة"],
        ["dept", "إدارة"],
        ["role", "فئة"],
        ["shift", "وردية"],
        ["emp", "موظف بالاسم"],
      ].map((t) => ({ t: t[1], style: T(k.mode === t[0]), go: () => this.nfBcSet({ mode: t[0], sel: [], empQ: "" }) })),
      nfBcOpts: ("dept" === k.mode
        ? O.map((t) => ({ v: t.id, t: t.name }))
        : "role" === k.mode
          ? [
              { v: "mgr", t: "مديرو الإدارات" },
              { v: "lead", t: "رؤساء الورديات" },
              { v: "staff", t: "الموظفون الميدانيون" },
            ]
          : "shift" === k.mode
            ? v.shifts.map((t) => ({ v: t.name, t: t.name + " · " + t.n }))
            : []
      ).map((t) => ({
        t: t.t,
        style: T(-1 !== k.sel.indexOf(t.v)),
        go: () => {
          const e = k.sel.slice(),
            s = e.indexOf(t.v);
          (-1 === s ? e.push(t.v) : e.splice(s, 1), this.nfBcSet({ sel: e }));
        },
      })),
      nfBcHasOpts: "dept" === k.mode || "role" === k.mode || "shift" === k.mode,
      nfBcNoOpts: "shift" !== k.mode || v.shifts.length ? "" : (v.ready ? "لا جدول شهري منشور بعد — لا ورديات لاستهدافها" : "جارٍ تحميل الورديات…"),
      nfBcIsEmp: "emp" === k.mode,
      nfBcEmpHits: P.map((t) => ({
        t: (t.name || t.un) + " · " + ((O.filter((e) => e.id === t.deptId)[0] || {}).name || ""),
        go: () => this.nfBcSet({ sel: k.sel.concat([t.ekey]), empQ: "" }),
      })),
      nfBcEmpSel: k.sel
        .filter(() => "emp" === k.mode)
        .map((t) => {
          const e = D.filter((e) => e.ekey === t)[0];
          return { t: e ? e.name || e.un : t, style: T(!0), go: () => this.nfBcSet({ sel: k.sel.filter((e) => e !== t) }) };
        }),
      nfBcReach: _ == null ? "…" : String(_),
      nfBcReachTxt: _ == null ? "جارٍ حساب المستهدفين" : KIVO.BassamCount.word(_, "شخص"),
      nfBcTargetRetryOn: !!v.error,
      nfBcTargetRetry: ()=>this.nfRefreshTargets(true),
      nfBcReachSub: v.error || this.nfTargetTxt(this.nfBcTarget(k)) + " · " + KIVO.BassamCount(D.length, "حساب|نشط") + " في المنصة",
      nfBcPvTitle: "تعميم: " + (k.title.trim() || "(بلا عنوان)"),
      nfBcPvBody: k.body.trim() ? k.body.trim().slice(0, 140) + (k.body.length > 140 ? "…" : "") : "نص التعميم يظهر هنا…",
      nfBcPvUrg: "urg" === k.lvl,
      nfBcPvAct: "urg" !== k.lvl && ("act" === k.lvl || k.ack),
      nfBcPvAck: k.ack,
      nfBcPvGo: !k.ack && !!k.link,
      nfBcPvGoTxt: "افتح " + k.link + " ←",
      nfBcNote:
        ("sched" === k.when ? "سيُرسل في الوقت المحدد · " : "") +
        (k.ack ? "يتطلب تأكيداً · " : "") +
        (k.rem ? "تذكير آلي لغير القارئين بعد 24 ساعة · " : "") +
        (+k.expDays ? "ينتهي بعد " + KIVO.BassamCount(k.expDays, "يوم", "g") + "" : "بلا انتهاء"),
      nfBcCan: E,
      nfBcSendStyle:
        "height:36px;padding:0 18px;border-radius:10px;border:1px solid var(--bd-xa8853f);background:linear-gradient(180deg,var(--bg-xc5a45c),var(--bg-xb99751));color:var(--text-on-brand);font-family:'Cairo',sans-serif;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;" +
        (E ? "" : "opacity:.45;cursor:not-allowed"),
      nfBcSend: () => {
        if (this._nfBcSending) return;
        E
          ? M(!1)
          : this.bsToast(
              k.title.trim() && k.body.trim()
                ? !v.ready ? (v.error || "انتظر تأكيد المستهدفين من الخادم") : 0 === _
                  ? "لا مستهدَفين — اختر الجهة"
                  : "حدّد وقتاً لاحقاً للجدولة"
                : "العنوان والنص مطلوبان",
              "warn",
            );
      },
      nfBcSendLbl: e.nfSending ? "جارٍ حفظ التعميم…" : "sched" === k.when ? "جدولة التعميم" : "إرسال التعميم الآن",
      nfBcMe: () => M(!0),
      nfBcClear: () => this.setState({ nfBc: null }),
      nfLog: L,
      nfLogEmpty:t.status().bcReady && !t.status().bcLoading && !e.nfManageError && !L.length,
      nfLogN:t.status().bcReady ? String(t.status().bcTotal) : "…",
      nfLogMoreOn:!!t.status().bcNext,nfLogMore:()=>this.nfLoadManagement(true),nfLogRefresh:()=>this.nfLoadManagement(),
      nfLogMessage:e.nfManageError || (t.status().bcLoading ? "جارٍ تحميل التعاميم…" : ""),nfLogMessageOn:!!e.nfManageError || t.status().bcLoading,
    };
  }
}
