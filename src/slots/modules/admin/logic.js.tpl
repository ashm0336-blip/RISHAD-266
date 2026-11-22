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
  /* V7 P0: عنوانُ «الإدارات» #/sysadmin/org[/<id>] — المعرّفُ هو الاختيارُ الصريح (sysSel) متى كان عقدةً أو وحدةً قائمة، فيبقى بعد إعادة التحميل */
  _orgSeg() {
    const id = this._orgKnown(this.state.sysSel) ? this.state.sysSel : "";
    return "org" + (id ? "/" + encodeURIComponent(id) + ("perm" === this.state.sysTab && this._p44SubNow ? "/perm/" + this._p44SubNow() : "") : "");   /* V7 · د5-هـ (44): …/perm/<القسم> */
  }
  _orgKnown(id) {
    try {
      const D = KIVO.BassamDepts;
      return !!id && !!D && (D.allNodes ? D.allNodes() : D.nodes().concat(D.list())).some((x) => x && x.id === id);
    } catch (e) {
      return !1;
    }
  }
  /* رابطٌ مباشر إلى عقدة: يُفتح بمسار النقر نفسه (nodePick · sysPick) إن كانت في الهيكل، وإلا تبقى الصفحةُ على الهيكل ويُقال ذلك */
  _orgOpen(id) {
    this.__orgPend = "";
    if (!this._orgKnown(id)) return void setTimeout(() => this.bsToast("العقدة المطلوبة غير موجودة في الهيكل", "warn"), 0);
    /* V7 P1: صفحةُ العقدة تُفتح على تبويبٍ يحدّده من فتحها (_orgNav) وإلا «نظرة عامة» */
    const tab = this.__orgTab || "ov";
    this.__orgTab = "";
    if (id === this.state.sysSel) return void (tab !== this.state.sysTab && (this.state = { ...this.state, sysTab: tab }));
    const node = (KIVO.BassamDepts.nodes() || []).some((x) => x && x.id === id);
    this.state = { ...this.state, sysSel: id, sysTab: tab, ndQ: "" };   /* V7 P2 · د5-ح: بحثُ حسابات الوحدة (بطاقة «مدير الوحدة») لكل صفحة عقدة */
    setTimeout(() => (node ? this.nodePick(id) : this.sysPick(id), this.state.sysSel === id && this.state.sysTab !== tab && this.setState({ sysTab: tab })), 0);
  }
  /* V7 P1: صفحةُ عقدةٍ بعنوانها — انتقالٌ حقيقيّ في سجلّ المتصفح (الرجوعُ يعود إلى الهيكل أو الصفحة السابقة) */
  _orgNav(id, tab) {
    try {
      const h = "#/sysadmin/org/" + encodeURIComponent(id);
      this.__orgTab = tab || "ov";
      /* رسمٌ قبل «hashchange» (إغلاقُ قائمة صفٍّ مثلاً) كان يعيد كتابة العنوان القديم (_hashTab) فلا تُفتح الصفحة — العنوانُ المنتظَر يُحترم حتى تُفتح */
      String(location.hash || "") !== h ? ((this.__orgPend = h), (location.hash = h)) : this._orgOpen(id);
    } catch (e) {}
  }
  _orgHome() {
    try {
      String(location.hash || "") !== "#/sysadmin/org" && (location.hash = "#/sysadmin/org");
    } catch (e) {}
  }
  /* V7 P1 · «نظرة عامة»: ما تحت العقدة (روابطُ صفحاتها) وقائمةُ التهيئة بالتسلسل المعتمد — للتوثيق وحده، لا حالةَ تمنع التشغيل.
     كلُّ قيمةٍ من الخدمات القائمة (BassamDepts · BassamAuth · BassamPerm) — لا مصدرَ جديد */
  _orgOvVals(D, o, n, p) {
    const A = KIVO.BassamAuth || null,
      safe = (f, d) => {
        try {
          return f();
        } catch (e) {
          return d;
        }
      };
    const kids = safe(() => D.childrenOf(o) || [], []).map((k) => ({
      name: k.name || "—",
      kind: k.kind || (D.isSection && D.isSection(k.id) ? "قسم" : "إدارة"),
      href: "#/sysadmin/org/" + encodeURIComponent(k.id),
      go: (ev) => {
        ev && ev.preventDefault && ev.preventDefault();
        this._orgNav(k.id);
      },
    }));
    const mgs = safe(() => (n ? A.groupManagers(o) : A.deptManagers(o)) || [], []),
      capSt = this._capStateTxt(o),
      accts = n ? 0 : safe(() => A.users().filter((u) => "staff" === u.role && u.deptId === o && !u.mgr).length, 0),
      units = n ? safe(() => (D.deptsUnder(o) || []).length, 0) : 0,
      step = (t, st, ok, tab) => ({ t, st, cls: ok ? "ok" : "wn", mark: ok ? "✓" : "!", goOn: !!tab, goLbl: "cap" === tab ? "فتح الصلاحيات" : "فتح «مدير الوحدة»", go: () => tab && this.setState({ sysTab: "perm", p44: { ...(this.state.p44 || {}), rev: null, ...("cap" === tab ? { sub: "systems" } : { sub: "roles", sel: "__mgr" }) } }) });   /* V7 · د5-هـ (44): السقفُ يُضبط في «الصلاحيات ← الأنظمة» · د5-ح: والمسؤولُ والحسابات في «الصلاحيات ← الأدوار ← مدير الوحدة» */
    return {
      ovKids: kids,
      ovKidsOn: kids.length > 0,
      ovKidsNone: !kids.length,
      ovKidsN: KIVO.BassamCount(kids.length, "تابع"),
      ovSteps: [
        step("تعريف العقدة", (p.kind || (n ? "عقدة" : "إدارة")) + " · في الهيكل", !0, ""),
        /* V7 P3-0: الحالةُ من مصدرٍ واحد (_capStateTxt ← BassamPerm.capState) — «مفتوح — لم يُضبط» تنبيهٌ لا علامةُ تمام */
        step("الصلاحيات", capSt.txt, capSt.ok, "cap"),   /* V7 · د5-هـ (44 · المدير): الخطوةُ تفتح «الصلاحيات ← الأنظمة» فاسمُها اسمُ التبويب */
        step("المسؤول", mgs.length ? "معيَّن: " + mgs.map((m) => m.name || m.un).join("، ") : "لم يُعيَّن بعد", mgs.length > 0, "mgr"),
        n
          ? step("الإدارات التابعة", KIVO.BassamCount(units, "إدارة") + " تحتها", units > 0, "")
          : step("الحسابات", KIVO.BassamCount(accts, "حساب موظف"), !0, "mgr"),
      ],
    };
  }
  /* V7 P3-0 · نصُّ حالة السقف من مصدرٍ واحد (KIVO.BassamPerm.capState) — الشجرة وقائمة التهيئة ومحرّر السقف تقرؤه هو وحده.
     عرضٌ فقط: لا يغيّر سقفاً ولا تفويضاً */
  _capStateTxt(o) {
    const P = KIVO.BassamPerm;
    let s = null;
    try {
      s = P && P.capState ? P.capState(o) : null;
    } catch (e) {}
    if (!s) return { kind: "", ok: !0, tone: "", short: "", txt: "" };
    const of = s.n + " من " + KIVO.BassamCount(s.all, "صفحة", "g"),
      k = s.kind;
    /* الفراغ: من سجلّ الوحدة نفسِه ([] — أو مستقلّةٌ سجلُّها فارغ) أم من سقوف الأصول (سجلُّها غيرُ فارغ أو لا سجلَّ لها)؟
       قراءةُ السجلّ الخام للعرض وحده (rawCap) — لا تغيّر capState ولا التفويض */
    if (s.empty) {
      const ownEmpty = "own" === k && this._capOwnRecEmpty(o);
      return ownEmpty
        ? { kind: k, empty: !0, ownEmpty: !0, ok: !1, tone: "warn", short: "السقف فارغ", txt: "سقفٌ خاصّ" + (s.independent ? " مستقلّ" : "") + " فارغ — لا صفحة مفعّلة لهذه الوحدة" }
        : { kind: k, empty: !0, ownEmpty: !1, ok: !1, tone: "warn", short: "السقف فارغ بحكم الأصول", txt: "السقف الفعلي فارغ بحكم سقوف الأصول — لا صفحة مفعّلة" };
    }
    if ("open" === k)
      return { kind: k, ok: !1, tone: "warn", short: "السقف مفتوح — لم يُضبط", txt: "مفتوح — لم يُضبط: لا سقفَ لها ولا لأصولها، فكلُّ صفحات المنصة متاحة (" + of + ")" };
    if ("inherit" === k) return { kind: k, ok: !0, tone: "", short: "يرث سقف الأصل · " + of, txt: "موروثٌ من الأصل: لا سقفَ خاصّاً لها، ويحدّها سقفُ أصلٍ فوقها — " + of };
    return { kind: k, ok: !0, tone: "", short: "سقفٌ خاصّ · " + of + (s.independent ? " · مستقلّ" : ""), txt: "سقفٌ خاصّ" + (s.independent ? " مستقلّ" : "") + ": " + of };
  }
  /* سجلُّ سقف الوحدة نفسِها فارغٌ من صفحات المنصة المعروفة؟ (عرضٌ فقط — لتمييز «سقفٌ خاصّ فارغ» من «فارغ بحكم الأصول») */
  _capOwnRecEmpty(o) {
    const P = KIVO.BassamPerm;
    try {
      const keys = (P && P.PAGE_KEYS) || [];
      return !!(P && P.hasCap && P.hasCap(o)) && !P.rawCap(o).some((x) => keys.indexOf(x) !== -1);
    } catch (e) {
      return !1;
    }
  }
  /* V7 P1: #/sysadmin/org بلا معرّف = صفحةُ الهيكل */
  _orgClose() {
    if (!this.state.sysSel) return;
    this.state = { ...this.state, sysSel: "" };
  }
  _hashTab(p, t) {
    try {
      const h = String(location.hash || "");
      if (!t || h.indexOf("#/" + p) !== 0 || (this.__orgPend && h === this.__orgPend)) return;
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
  /* V7 · د5-د: الإعداداتُ لا تقرأ مفاتيحَ الجدول الشهري ولا تكتبها — تسأل مالكَها بالاسم (الناقل). بغياب الجدول: لا مسكَّنين ولا تبعة. */
  sfUsage(t) {
    return KIVO.bus.read("staff.shiftUsage@1", t) || { on: !1, records: 0, months: 0, locked: [] };
  }
  sfSchedOn() {
    return !!this.sfUsage("").on;
  }
  sfRenameEverywhere(draft, t, e, deleting) {
    return KIVO.bus.participate("shifts.renamed@1", { from: t, to: e, deleting: !!deleting }, draft);
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
    this.bsAck("صارت وردية «" + t + "» باسم «" + s + "»" + (this.sfSchedOn() ? " — وأُعيدت تسميتها في كل شهرٍ مفتوح" : ""), "ok"); return true;
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
            nameTip: s ? "اضغط لإعادة التسمية" + (a.on ? " — تُطبَّق على كل شهرٍ مفتوح" : "") : e.name,
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
              : a.on
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
            : this.sfSchedOn()
              ? "لا أحد مسكَّن عليها — حذفها بلا أثر على الجداول."
              : "حذفها بلا أثر — الجدول الشهري غير مفعّل في هذه الإدارة."
          : "",
        sfDelCancel: () => this.setState({ shDel: null }),
        sfDelDo: () => this.sfDelDo(),
      }
    );
  }
  state = {
    rowMenu: null,
    admTab: "",
    deptTab: "backup",
    shNew: { name: "", tStart: "", tEnd: "" },
    shDel: null,
    shRen: null,
    shTick: 0,
    plTab: "id",
    plDraft: null,
    plPv: "",
    plRk: null,
    plRkKey: "",
    plRkAskOn: !1,
    plRkPw: "",
    plRkMsg: "",
    plRkInfo: "",
    plBkForm: { un: "", name: "", pw: "" },
    plBkMsg: "",
    plRs: { step: 0, keepBrand: !0, un: "", name: "", pw: "", pw2: "", curPw: "", key: "", confirm: "" },
    plRsMsg: "",
    plBusy: !1,
    usQ: "",
    usF: "all",
    usMenu: null,
    usTmp: null,
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
  /* CORE-02 (B2): نطاقاتُ نموذج سياسات الأمن — نفسُها في الخادم (001 POLICY_RANGE): [الأدنى، الأعلى، عددٌ صحيح]. القيمةُ خارجها تُرفض باسمها
     قبل التأكيد، ولا يُعرض «حُفظت» إلا بعد قبول الخادم */
  _adPolRange() {
    return { sessH: [1, 72, 1], idleH: [0.25, 24, 0], dispH: [1, 72, 1], lockN: [3, 20, 1], lockMin: [1, 60, 1], pwMin: [6, 6, 1], wrMin: [30, 5000, 1], thrOn: [0, 1, 1], thrN: [5, 100, 1], thrWin: [5, 120, 1], thrSec: [1, 10, 1] };
  }
  _adPolBadOf(k, x) {
    const r = this._adPolRange()[k];
    if (!r || null == x) return !1;
    const s = "string" == typeof x ? x.trim() : x,
      v = "" === s ? NaN : +s;
    return !isFinite(v) || v < r[0] || v > r[1] || (!!r[2] && Math.floor(v) !== v);
  }
  _adPolBad(p) {
    const R = this._adPolRange();
    for (const k of Object.keys(R))
      if (this._adPolBadOf(k, p && p[k])) {
        const r = R[k],
          l = { sessH: "مدة الجلسة القصوى", idleH: "الخمول قبل الخروج", dispH: "مدة جلسة شاشة العرض", lockN: "محاولات قبل القفل", lockMin: "مدة القفل القصوى", pwMin: "الحد الأدنى لكلمة المرور", wrMin: "سقف الحفظ في الدقيقة", thrOn: "إبطاء الحساب المستهدف (0 مطفأ · 1 مفعّل)", thrN: "عناوين مختلفة قبل الإبطاء", thrWin: "نافذة احتساب العناوين", thrSec: "مهلة الإبطاء" }[k];
        return { k: k, msg: l + (r[0] === r[1] ? " ثابت: " + r[0] : ": أدخل " + (r[2] ? "عدداً صحيحاً" : "رقماً") + " من " + r[0] + " إلى " + r[1]) };
      }
    return null;
  }
  /* CORE-02 (B2): keepErr — the refusal body (err · msg · field) instead of null, so its reason can be shown */
  /* V7 · د5-هـ (أمن ١): تبديلُ الإدارة بعد حفظٍ صادقٍ وحده — كان يُعاد التحميلُ أيّاً كانت نتيجةُ الحفظ (رفضاً أو انقطاعاً) فيضيع التعديلُ أو رسالةُ رفضه.
     الحفظُ أولاً؛ ثم التبديلُ وإعادةُ التحميل إن صدق، أو لم يبقَ ما يُحفظ ولم يُرفض شيء */
  _adSwitchDept(setActive) {
    const S = KIVO.__BS_SRV, d0 = S && S.denied ? +S.denied() || 0 : 0,
      pend = () => { try { return !!(S && ((S.dirty && S.dirty()) || (S.inflight && S.inflight()))); } catch (e) { return !0; } };
    (S && S.flushAsync ? Promise.resolve(S.flushAsync(4e3)).catch(() => !1) : Promise.resolve(!0)).then((ok) => {
      const refused = !!(S && S.denied && (+S.denied() || 0) > d0);
      if (ok !== !0 && (refused || pend())) return void this.bsToast(refused ? "رُفض حفظ بعض تعديلاتك — لم يُبدَّل" : "لم تُحفظ تعديلاتك بعد — لم يُبدَّل حتى تُحفظ", "err");
      setActive();
      location.reload();
    });
  }
  adFetch(t, e, keepErr) {
    return fetch(t, e ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(e) } : {})
      .then((t) => (t.ok ? t.json() : keepErr ? t.json().catch(() => null) : null))
      .catch(() => null);
  }
  adLoad(t) {
    if (!this.adOnSrv()) return;
    const e = this.state.admTab;
    if ("overview" !== e && "sec" !== e && "users" !== e && !t) return;
    const s = Date.now();
    if (!t && this._adLast && s - this._adLast < 4e3) return;
    this._adLast = s;
    const a = [this.adFetch("/api/presence"), this.adFetch("/api/overview")];
    if ("sec" === e || t) {
      const t = this.state,
        r = "today" === (t.adSecPeriod || "today") ? this._adDay0(s) : "7d" === t.adSecPeriod ? s - 6048e5 : s - 2592e6,
        k = this._adSecKind(t.adSecKind);
      /* نوعٌ يطابق فلتر الخادم كما هو يُرسَل إليه؛ وما يضمّ أحداثاً لا يعرفها فلترُ الخادم (الاستعادة · التهيئة · تعذّر التحقق) يُقرأ كلُّه ويُصفّى هنا */
      a.push(this.adFetch("/api/sec?limit=" + (t.adSecLim || 100) + "&since=" + r + (k && k.srv ? "&kind=" + k.k : "")));
    }
    Promise.all(a).then((t) => {
      const e = t[0],
        s = t[1],
        i = t[2],
        n = { adTick: (this.state.adTick || 0) + 1, adErr: !(e && e.ok && s && s.ok) };
      (e && e.ok && (n.adPres = e),
        s && s.ok && ((n.adOv = s), (this._adOk = Date.now()), this.state.adPol || (n.adPol = Object.assign({}, s.policy || {}))),
        i && i.ok && (n.adSec = i.rows || []),
        this.setState(n),
        this._adRetry(n.adErr));
    });
  }
  /* CORE-01: إعادةٌ هادئة بعد ٢·٤·٨·١٦ ث ثم التحديثُ الدوري */
  _adRetry(bad) {
    clearTimeout(this._adRt);
    this._adRt = null;
    if (!bad) return void (this._adRn = 0);
    const k = (this._adRn = (this._adRn || 0) + 1);
    k <= 4 &&
      (this._adRt = setTimeout(() => {
        ((this._adRt = null), (this._adLast = 0), document.hidden || this.adLoad());
      }, 1e3 * 2 ** k));
  }
  adTimerOn() {
    this._adT ||
      (this._adT = setInterval(() => {
        document.hidden || this.adLoad();
      }, 25e3));
  }
  adTimerOff() {
    (this._adT && (clearInterval(this._adT), (this._adT = null)), clearTimeout(this._adRt), (this._adRt = null));
  }
  adGo(t) {
    this.setState({ admTab: t }, () => {
      (this.adLoad(!0), this.adTimerOn(), "oplog" === t && this.audLoad(!0));
    });
  }
  /* CORE-02: الانتقالُ إلى تبويبٍ من تبويبات مركز الإدارة التسعة — ما كانت تفعله أزرارُ الشريط القديم كلٌّ على حدة، في موضعٍ واحد:
     تبويباتُ الخادم الأربعة بـ adGo (قراءةٌ + المؤقّت) · المنصة تقرأ حالة مفتاح الاستعادة · السجلُّ يُحمَّل · والباقي تبديلٌ فقط */
  _admGo(k) {
    "overview" === k || "sec" === k || "users" === k
      ? this.adGo(k)
      : "plat" === k
        ? this.setState({ admTab: "plat" }, () => this.plRkLoad())
        : "oplog" === k
          ? this.setState({ admTab: "oplog" }, () => this.audLoad(!0))
          : this.setState({ admTab: k });
  }
  /* V7 P4 · G9 — تبويباتُ «مركز إدارة رشاد»: القائمةُ الواحدة [المفتاح · المجموعة · العنوان · يعمل مع الخادم وحده] — منها ترتيبُ التبويبات
     وعناوينُ الصفحات (_conHead) وصفوفُ المركز في «خريطة المنصة» (_siteMap). عنوانُ «plat» من أقسامه (PL_SECS) */
  CON_TABS() {
    return [
      ["overview", "", "الرئيسية", 1],
      ["sec", "sec", "الأمن", 1],
      ["users", "org", "مراقبة الحسابات", 1],
      ["plat", "plat", "", 0],
      ["depts", "org", "الإدارات", 0],
      ["oplog", "sec", "سجل الأنشطة والتغييرات", 1],
      ["backup", "data", "النسخة الاحتياطية", 0],
@@SYS:admin.console.histimp@@    ];
  }
  /* «خريطة المنصة»: صفوفُ المركز من CON_TABS وأقسامُ المنصة من PL_SECS، والعدساتُ والمنصةُ والمراجعُ من بنّاء الشجرة نفسِه (t24Struct) */
  _siteMap() {
    const P = KIVO.BassamPerm;
    if (!P || !P.siteMap) return [];
    return P.siteMap({
      center: this.CON_TABS().map((t) => ({
        name: t[2] || this._conHead("plat", "").conEyebrow,
        addr: "#/sysadmin/" + ("depts" === t[0] ? "org" : t[0]),
        srv: t[3],
        hint:
          "plat" === t[0]
            ? this.PL_SECS()
                .map((x) => x[1])
                .join(" · ")
            : "",
      })),
      struct: this.t24Struct(),
    });
  }
  /* CORE-02 S7 · أقسامُ «إعدادات المنصة» (#/sysadmin/plat/<sub>) — تنقّلُها في شريط «مركز إدارة رشاد» (root-logic _sysNav).
     مراجعة S10: القائمةُ الواحدة [المفتاح · العنوان · الوصف · الأيقونة] — منها المفاتيحُ (PL_KEYS) وعنوانُ الصفحة ووصفُها (plVals) */
  PL_SECS() {
    return [
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
    ];
  }
  PL_KEYS() {
    return this.PL_SECS().map((x) => x[0]);
  }
  /* رأسُ الصفحة في المركز: مجموعتُها (سطرٌ صغير) ثم عنوانُها — المجموعةُ من موضع التبويب في الشريط الجانبي */
  _conHead(d, ps) {
    /* أسماءُ المجموعات وعناوينُ الصفحات هنا توأمُ GT و_sysNav في root-logic عن قصد: صفحةُ الإدارة لا تعتمد على الإطار (V5) —
       وتطابقُهما يثبّته core02_console_nav.test.mjs (6) */
    const G = { org: "الإدارة المؤسسية", plat: "إعدادات المنصة", sec: "الأمن والرقابة", data: "البيانات والاستمرارية" },
      T = this.CON_TABS().reduce((a, t) => ((a[t[0]] = [t[1], t[2]]), a), {}),
      x = "plat" === d ? ["setup" === ps ? "data" : "plat", ""] : T[d] || ["", ""];
    return { conEyebrow: G[x[0]] || "", conEyebrowOn: !!G[x[0]], conTitle: x[1] };
  }
  /* CORE-02 S8 · من الرئيسية إلى صفحةٍ في المركز: عبر شريطه (عنوانٌ في السجلّ وتحديدُ العنصر) — وإن غاب الشريط فالانتقالُ نفسُه داخل الصفحة */
  _ovGo(k, sub) {
    const N = KIVO.BassamNav;
    if (!N || !N.conGo) return "plat" === k ? this._plGo(sub || "id") : this._admGo(k);
    N.conGo(k, sub || null);
    /* العنوانُ تغيّر الآن و«hashchange» يفتح الصفحةَ لاحقاً — رسمٌ بينهما (قائمةٌ تُغلَق · اختيارُ إدارة) كان يعيد كتابةَ التبويب القديم
       في العنوان (_hashTab) فلا يُفتح شيء؛ فالتبويبُ يتبع العنوانَ من الآن، والقراءةُ تبقى لمسار «hashchange» وحده */
    "plat" !== k && k !== this.state.admTab && String(location.hash || "") === "#/sysadmin/" + ("depts" === k ? "org" : k) && this.setState({ admTab: k });
  }
  /* الوحداتُ (إداراتٍ وأقساماً) التي لا مدير لها — القاعدةُ نفسُها التي تكتب «بلا مدير» في شجرة الإدارات */
  _deptsNoMgr() {
    const A = KIVO.BassamAuth;
    let L = [];
    try {
      L = KIVO.BassamDepts.list() || [];
    } catch (x) {}
    return A && A.deptManager ? L.filter((d) => d && d.id && !A.deptManager(d.id)) : [];
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
  /* CORE-02 · تأكيدٌ واحد للأفعال الحساسة: KIVO.bsConfirm (المكوّن الموجود في القشرة) — الإلغاءُ لا يُرسل شيئاً ولا يغيّر شيئاً */
  _adAsk(o, run) {
    return Promise.resolve(KIVO.bsConfirm ? KIVO.bsConfirm(o) : !1).then((y) => (y ? run() : void 0));
  }
  _adKill(u) {
    const n = (u && (u.name || u.un)) || "هذا الحساب";
    return this._adAsk(
      { title: "إنهاء الجلسات", msg: "إنهاء كل جلسات «" + n + "» الآن؟ سيحتاج إلى تسجيل الدخول من جديد على كل أجهزته.", ok: "إنهاء الجلسات", danger: !0 },
      () => this.adAct("/api/sess/kill", { uid: u.id }, "أُنهيت الجلسات"),
    );
  }
  _adFreeze(u, dis, run) {
    const n = (u && (u.name || u.un)) || "هذا الحساب";
    return this._adAsk(
      dis
        ? { title: "تجميد الحساب", msg: "تجميد «" + n + "»؟ لن يستطيع الدخول حتى يُعاد تفعيله، وتبقى بياناته وصلاحياته كما هي.", ok: "تجميد الحساب", danger: !0 }
        : { title: "إعادة تفعيل الحساب", msg: "إعادة تفعيل «" + n + "»؟ سيستطيع الدخول من جديد بصلاحياته الحالية.", ok: "إعادة التفعيل" },
      run,
    );
  }
  /* V7 P2 · حسابٌ واحد بقائمة أفعالٍ واحدة: «مراقبة الحسابات» وبطاقةُ «مدير الوحدة» (الصلاحيات ← الأدوار · د5-ح) في صفحة العقدة يبنيان صفوفهما من هنا.
     كلُّ فعلٍ معالجُه القائم في KIVO.BassamAuth، والخادمُ يقرّر (044 usersA1Why · 059 enfUsersWrite · requireSuper) — لا معالجَ موازٍ،
     وعرضُ الحساب لا يمنح حقَّ تعديله: الأفعالُ نفسُها تُرفض خارج تفويضها في الخادم */
  _acctCtx() {
    const t = this.state,
      p = t.adOv || {},
      A = KIVO.BassamAuth,
      me = A && A.user ? A.user() : null,
      l = p.lastLogin || {},
      d = {},
      c = {},
      g = {};
    (p.oldHash || []).forEach((x) => {
      d[x] = 1;
    });
    (p.added || []).forEach((x) => {
      x.tg && x.tg.id && !c[x.tg.id] && (c[x.tg.id] = x);
    });
    ((t.adPres || {}).list || []).forEach((x) => {
      g[x.u.id] = x;
    });
    return { l, d, c, g, me: me ? me.id : "", now: Date.now() };
  }
  /* عقدةُ الحساب في الهيكل: المدير العام عقدتُه (gid)، وغيرُه إدارتُه أو قسمُه (deptId) */
  _acctUnit(a) {
    return a ? ("gm" === a.role ? a.gid : a.deptId) || "" : "";
  }
  /* التعديلُ والصلاحيات نافذتان في صفحة العقدة: هناك تُفتحان، ومن «مراقبة الحسابات» تُفتح بطاقةُ «مدير الوحدة» لعقدة الحساب (د5-ح) */
  _acctOpen(a, what, here) {
    const u = this._acctUnit(a);
    /* V7 · د5-هـ (44): «تعديل الصلاحيات» يفتح قسم «الأشخاص» في تبويب «الصلاحيات» لوحدة الحساب — نافذةُ صلاحيات الموظف حُذفت */
    if ("perm" === what) {
      if (!u) return void this._ovGo("depts");
      /* V7 · د5-هـ (44 · التوحيد): العنوانُ المنتظَر يُحترم حتى تُفتح (كما _orgNav) — رسمُ إغلاق القائمة قبل «hashchange» كان يعيده إلى صفحة الحسابات */
      try {
        const h = "#/sysadmin/org/" + encodeURIComponent(u) + "/perm/people";
        this.__orgPend = h;
        location.hash = h;
      } catch (e) {}
      return;
    }
    if (!here) return void (u ? this.p44Open(u, "roles", { sel: "__mgr" }) : this._ovGo("depts"));   /* V7 · د5-ح: «الصلاحيات ← الأدوار ← مدير الوحدة» */
    if ("edit" === what) return void ("gm" === a.role ? this.gmOpen(u, a.id) : this.mgrOpen(u, a.id));
  }
  /* V7 · د5-هـ (x1): «شاشة عرض» — حسابُ قراءةٍ وحدها مربوطٌ بإدارة، ينشئه مسؤولُ المنصة من «مراقبة الحسابات» (330 addDisplayAccount) */
  _dpVals(t) {
    const A = KIVO.BassamAuth,
      sup = !!(A && A.isSuper && A.isSuper()),
      f = t.dpForm || null;
    let ds = [];
    try { ds = (KIVO.BassamDepts.list() || []).map((d) => ({ id: d.id, name: d.name || d.id, sel: !!f && f.deptId === d.id })); } catch (e) { ds = []; }
    const set = (k) => (ev) => this.setState({ dpForm: Object.assign({}, this.state.dpForm || {}, { [k]: ev && ev.target ? ev.target.value : "" }), dpMsg: "" });
    return {
      dpCan: sup,
      dpOpen: sup && !!f,
      dpToggle: () => this.setState({ dpForm: this.state.dpForm ? null : { un: "", name: "", pw: "", deptId: (ds[0] || {}).id || "" }, dpMsg: "" }),
      dpF: f || { un: "", name: "", pw: "", deptId: "" },
      dpDepts: ds,
      dpOnUn: set("un"), dpOnName: set("name"), dpOnPw: set("pw"), dpOnDept: set("deptId"),
      dpMsg: t.dpMsg || "",
      dpMsgOn: !!t.dpMsg,
      dpSave: () => {
        const F = this.state.dpForm || {};
        if (!A || !A.addDisplayAccount) return;
        A.addDisplayAccount({ un: F.un, name: F.name, pw: F.pw, deptId: F.deptId }).then((r) => {
          r && r.ok ? (this.setState({ dpForm: null, dpMsg: "" }), this.bsAck("أُنشئت شاشة العرض — تدخل باسمها وكلمتها وتقرأ إدارتها فقط", "ok")) : this.setState({ dpMsg: (r && r.err) || "تعذّر" });
        });
      },
    };
  }
  _acctMenu(a, X, here) {
    const s = KIVO.BassamAuth,
      o = X.g[a.id],
      p = [],
      gm = "gm" === a.role,
      /* مديرُ الإدارة بقاعدة deptManagers نفسِها (330): mgr:<إدارته> أو mgr:<إدارته>:<n> — وإلا فحذفُه بمسار حساب الموظف */
      mk = "staff" === a.role && (a.ekey === "mgr:" + a.deptId || String(a.ekey || "").indexOf("mgr:" + a.deptId + ":") === 0),
      nm = a.name || a.un,
      fx = s.acctFixedWhy ? s.acctFixedWhy(a, !a.dis) : "";
    return (
      "super" !== a.role &&
        ((gm || mk) && this._acctUnit(a) && p.push({ t: "تعديل بيانات المدير", go: () => this._acctOpen(a, "edit", here) }),
        p.push({
          t: (a.dis ? "إعادة التفعيل" : "تجميد الحساب") + (fx ? " — غير متاح" : ""),
          go: () => {
            if (fx) return void this.bsToast(fx, "warn");
            this._adFreeze(a, !a.dis, () => {
              const t = s.setDisById(a.id, !a.dis);
              t && t.ok ? this.bsAck(a.dis ? "أُعيد التفعيل" : "جُمّد الحساب", "ok") : this.bsToast((t && t.err) || "تعذّر", "warn");
            });
          },
        }),
        p.push({
          t: "إعادة تعيين كلمة المرور",
          go: () => {
            KIVO
              .bsConfirm({
                title: "إعادة تعيين كلمة المرور",
                msg: "تعيين كلمة مرور مؤقتة لـ «" + nm + "»؟ ستُلغى كلمته الحالية فوراً، ويُطلب منه تغييرها عند أول دخول.",
                ok: "تعيين كلمة مؤقتة",
              })
              .then((y) => {
                y &&
                  s.resetPwById(a.id).then((t) => {
                    t && t.ok ? this.setState({ usTmp: { name: nm, pw: t.pw } }) : this.bsToast((t && t.err) || "تعذّر", "warn");
                  });
              });
          },
        })),
      o && !o.mine && p.push({ t: "إنهاء جلساته الآن", go: () => this._adKill(a) }),
      /* V7 · د5-هـ (x1): حذفُ شاشة العرض — لمسؤول المنصة */
      "display" === a.role &&
        p.push({
          t: "حذف شاشة العرض",
          danger: !0,
          go: () =>
            this._adAsk({ title: "حذف شاشة العرض", msg: "حذف حساب «" + nm + "» نهائياً؟ تخرج الشاشةُ فوراً ولا يعود الحساب صالحاً للدخول.", ok: "حذف الحساب", danger: !0 }, () => {
              const t = s.removeDisplayAccount(a.id);
              t && t.ok ? this.bsAck("حُذفت شاشة العرض", "ok") : this.bsToast((t && t.err) || "تعذّر", "warn");
            }),
        }),
      ("staff" === a.role || gm) && p.push({ t: "تعديل الصلاحيات", go: () => this._acctOpen(a, "perm", here) }),
      gm || mk
        ? p.push({
            t: "حذف حساب المدير",
            danger: !0,
            go: () =>
              this._adAsk(
                {
                  title: "حذف حساب المدير",
                  msg: "حذف حساب «" + (nm || "المدير") + "» وصلاحياته نهائياً؟ لن يعود صالحاً للدخول. تبقى " + (gm ? "العقدة وإداراتها" : "الإدارة وبياناتها") + " كما هي.",
                  ok: "حذف الحساب",
                  danger: !0,
                },
                () => {
                  const u = this._acctUnit(a),
                    t = gm ? s.removeGroupManager(u, a.id) : s.removeDeptManager(u, a.id);
                  t && t.ok
                    ? (this.setState({ tick: (this.state.tick || 0) + 1 }), this.bsAck("حُذف حساب «" + (nm || "المدير") + "»", "ok"))
                    : this.bsToast((t && t.err) || "تعذّر الحذف", "warn");
                },
              ),
          })
        : "staff" !== a.role ||
            a.mgr ||
            p.push({
              t: "حذف حساب الدخول",
              danger: !0,
              go: () =>
                this._adAsk(
                  {
                    title: "حذف حساب الدخول",
                    msg: "حذف حساب الدخول لـ «" + nm + "»؟ يبقى سجل الموظف ويُمحى حسابه وصلاحياته.",
                    ok: "حذف الحساب",
                    danger: !0,
                  },
                  () => {
                    const t = s.removeStaffAccount(a.ekey, a.deptId);
                    t && t.ok ? this.bsAck("حُذف الحساب", "ok") : this.bsToast((t && t.err) || "تعذّر", "warn");
                  },
                ),
            }),
      p
    );
  }
  /* صفُّ الجدول نفسُه في الموضعين — الأعمدة: الحساب · اسم المستخدم · الدور · الإدارة · الحالة · آخر دخول · أُضيف · الأفعال */
  _acctRow(a, X, here) {
    const { l, d, c, g, me, now } = X,
      i = a.dis ? "frozen" : l[a.id] ? "active" : "never",
      o = g[a.id],
      p = this._acctMenu(a, X, here),
      t = this._rowMenu((here ? "nw" : "uw") + a.id, a.id === me ? [] : p.map((x) => ({ name: x.t, danger: !!x.danger, run: x.go })));
    return {
      ini:
        String(a.name || "")
          .trim()
          .charAt(0) || "؟",
      name: a.name || a.un,
      /* ما كانت تعرضه بطاقةُ المدير: اسمُ المستخدم البديل والرقمُ الوظيفي — تلميحٌ على اسم الحساب */
      whoTip: [a.alt ? "أو " + a.alt : "", a.empno || a.no ? "الرقم الوظيفي " + (a.empno || a.no) : ""].filter(Boolean).join(" · "),
      avTone: a.dis ? "mute" : "",
      /* V7 · د5-هـ (x1): شارةُ «شاشة عرض» — قراءةٌ فقط */
      flagOn: "display" === a.role || !(!d[a.id] && !a.mc),
      flag: d[a.id] ? "كلمة مرور بصيغة قديمة — أعد تعيينها" : "display" === a.role ? "شاشة عرض · قراءة فقط" : "كلمة مؤقتة — يغيّرها عند الدخول",
      flagCls: d[a.id] ? "adm-bad" : "display" === a.role ? "adm-disp" : "adm-warn",
      un: a.un || "—",
      role: this.adRole(a),
      dept: "super" === a.role ? "الإدارة العامة" : this.adUnit(a) || "—",
      st: "frozen" === i ? "مجمّد" : o && o.active ? "متصل الآن" : "active" === i ? "نشط" : "لم يدخل",
      stTone: "frozen" === i ? "warn" : o && o.active ? "live" : "active" === i ? "ok" : "",
      last: l[a.id] ? this.adWhen(l[a.id], now) : "—",
      lastTip: l[a.id] ? this.adFull(l[a.id]) : "لا دخول مسجّل منذ بدء السجل",
      added: c[a.id] ? c[a.id].by + " · " + this.adRel(c[a.id].ts, now) : "—",
      ...t,
      rmItems: t.rmItems.map((x) => Object.assign({}, x, { tone: /حذف/.test(x.name) ? "bad" : "" })),
    };
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
    /* V7 · د5-هـ (44): الموظفُ (لا المدير) يُعرض باسم دوره الممنوح (permLabel ← محرّك الأدوار) قبل المسمّى الحرّ — بحضور المحرّك */
    if (t && "staff" === t.role && !t.mgr && t.ekey && KIVO.Perm44 && KIVO.BassamAuth && KIVO.BassamAuth.permLabel && !(KIVO.BassamAuth.isMgrKey && KIVO.BassamAuth.isMgrKey(t.ekey))) {
      const L = KIVO.BassamAuth.permLabel(t.ekey, t.deptId);
      if (L) return L;
    }
    const T = t && "super" !== t.role ? String(t.title || "").trim() : "";
    if (T) return T;
    return (
      {
        super: "مسؤول المنصة",
        dept: "مدير الإدارة",
        gm: KIVO.BassamAuth && KIVO.BassamAuth.gmRoleLabel ? KIVO.BassamAuth.gmRoleLabel(t && t.gid) : "مدير إدارة عامة",
        staff: t && t.mgr ? "مدير الإدارة" : "موظف",
        display: "شاشة عرض",   /* V7 · د5-هـ (x1) */
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
    let nr = "";
    try {
      nr = KIVO.BassamNotif && KIVO.BassamNotif.status ? String(KIVO.BassamNotif.status().rev) : "";   /* CORE-02 S8: «أحداث المنصة الأخيرة» */
    } catch (t) {}
    return [A && A.usersVer ? A.usersVer() : 0, KIVO.__dcWorld || 0, KIVO.__dcWrite || 0, Math.floor(Date.now() / 6e4), d, t.usF, t.usQ, t.adSecQ, tag(t.adPol), t.adPolMsg, t.rowMenu, t.admTab, t.adErr, tag(t.usTmp), tag(t.rmItems), tag(t.adOv), tag(t.adPres), tag(t.dpForm), t.dpMsg].join("|") + "|n" + nr;   /* V7 · د5-هـ (44): مدخلاتُ تبويب الخريطة المحذوف حُذفت معه · V7 · د5-هـ (أمن): + نموذجُ شاشة العرض ورسالتُها */
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
@@SYS:admin.keyLabels.staff@@@@SYS:admin.keyLabels.daily@@@@SYS:admin.keyLabels.dreport@@@@SYS:admin.keyLabels.plan@@@@SYS:admin.keyLabels.tasks@@        bassam_auth_users_v1: "حسابات الدخول",
        bassam_perms_v1: "الصلاحيات",
        bassam_depts_v1: "الإدارات",
@@SYS:admin.keyLabels@@@@SYS:admin.keyLabels.custody@@      }[s] || (KL ? KL.label(s) : "بيانات المنصة")) + (e ? " · " + this.adDept(e[1]) : "")
    );
  }
  /* CORE-02 · «اليوم» في فلاتر الواجهة = منذ منتصف الليل بتوقيت الرياض (UTC+3 بلا توقيت صيفي) أيّاً كانت منطقة جهاز المتصفح */
  _adDay0(now) {
    return Math.floor(((now || Date.now()) + 108e5) / 864e5) * 864e5 - 108e5;
  }
  /* أنواعُ سجل الأمن في الواجهة. srv: الأحداثُ = فلترُ الخادم لهذا النوع حرفاً بحرف (063 /api/sec kind) فيُرسَل إليه؛ وإلا يُصفّى هنا.
     «دخول» و«مسؤول المنصة» يصفّيهما الخادم كما كانا (لا يُفقد حدثٌ خلف حدّ القراءة)؛ وأحداثُ الاستعادة والتهيئة وتعذّر التحقق — وكانت في «الكل» وحده — نوعٌ واحد يُصفّى هنا */
  _adSecKind(k) {
    const K = {
      login: { t: "دخول", acts: ["login_ok", "login_fail", "lock", "logout", "sess_kill", "guard_unlock"], srv: 1 },
      pw: { t: "كلمات مرور", acts: ["pw_change"], srv: 1 },
      acct: { t: "حسابات", acts: ["acct_add", "acct_del", "acct_freeze", "acct_unfreeze"], srv: 1 },
      perm: { t: "صلاحيات", acts: ["perm_change"], srv: 1 },
      denied: { t: "مرفوض", acts: ["denied"], srv: 1 },
      admin: { t: "مسؤول المنصة", acts: ["admin", "policy_change", "sess_kill", "guard_unlock"], srv: 1 },
      authz: { t: "استعادة وتهيئة وتحقق", acts: ["recover_ok", "recover_fail", "recovery_key", "reset", "authz_unavailable"] },
    };
    if (!k) return K;
    return K[k] ? Object.assign({ k }, K[k]) : null;
  }
  /* صفوفُ السجل المقروءة بعد فلتر النوع في الواجهة (لما لا يصفّيه الخادم) — للعرض والتصدير معاً */
  _adSecRows() {
    const t = this.state,
      k = this._adSecKind(t.adSecKind),
      L = t.adSec || [];
    return k && !k.srv ? L.filter((r) => k.acts.indexOf(r.act) >= 0) : L;
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
        super: "الإعداد لمسؤول المنصة وحده",
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
        return { t: "أنشأ مفتاح استعادة جديداً لحساب مسؤول المنصة", k: "sec", w: "حدث أمني" };
      case "recover_fail":
        return {
          t: "محاولة استعادة فاشلة من شاشة الدخول" + ("no-key" === t.detail ? " — لا مفتاح مُنشأ" : " — مفتاح خاطئ"),
          k: "warn",
          w: "حدث أمني · محاولة استعادة",
        };
      case "recover_ok":
        return { t: "استُعيد دخول مسؤول المنصة بمفتاح الاستعادة — كلمة جديدة والمفتاح أُبطل", k: "sec", w: "حدث أمني" };
      case "reset":
        return {
          t:
            "تهيئة المنصة لجهة جديدة — مُسحت كل البيانات" +
            (() => {
              try {
                const e = JSON.parse(t.detail || "{}");
                return (e.keepBrand ? " (أُبقيت الهوية)" : "") + " · مسؤول المنصة الجديد: " + (e.newAdmin || "");
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
      case "lock": {
        /* CORE-02 (B3): detail عددُ المحاولات — وسجلاتُ ما قبل الإصلاح تحمل الكلمة «attempts» فلا يُعرض رقمٌ مكانها. والهدفُ «u:» عدّادُ تنبيهٍ
           على الحساب لا يقفله (054 guardCount) — القفلُ الفعليّ على مصدر المحاولات (guardFail: «p:» · «ip:») */
        const n = /^\d+$/.test(String(t.detail || "")) ? +t.detail : 0,
          c = n ? KIVO.BassamCount(n, "محاولة|فاشلة", "g") : "محاولات فاشلة متتالية",
          acct = 0 === String(t.target || "").indexOf("u:");
        return acct
          ? { t: "تنبيه: " + c + (t.un ? " باسم " + t.un : "") + " — لا يُقفل الحساب نفسه، ويُقفل مصدر المحاولات", k: "warn", w: "حدث أمني" }
          : { t: "قُفل الدخول مؤقتاً بعد " + c + (t.un ? " باسم " + t.un : ""), k: "warn", w: "حدث أمني" };
      }
      case "logout":
        return { t: "تسجيل خروج", k: "login" };
      case "sess_kill":
        return { t: "أنهى جلسات " + (e && "*" === e.id ? "الجميع" : s) + " من شاشة مسؤول المنصة", k: "adm" };
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
          /* نقصُ السبب ليس حدثاً أمنياً ولا «خارج الصلاحية»: الفاعلُ يملك الصلاحية ولم يذكر السبب */
          ...("reason" === t.detail
            ? { t: "محاولة تعديل «" + this.adKeyLbl(t.target) + "» — رُفض: هذه العملية تتطلب ذكر السبب", k: "adm" }
            : { t: "محاولة تعديل «" + this.adKeyLbl(t.target) + "» رُفضت — " + (a[t.detail] || "خارج الصلاحية"), k: "sec", w: "حدث أمني · كتابة خارج الصلاحية" }),
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
      case "authz_unavailable":
        return { t: "تعذّر على الخادم التحقق من الصلاحيات فرُفض الطلب مؤقتاً — يُعاد تلقائياً بعد ثوانٍ", k: "warn", w: "حدث أمني · تعذّر التحقق" };
      default:
        return { t: "حدث أمني آخر", k: "adm" };
    }
  }
  adSecExport() {
    const t = this._adSecRows(),
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
        setup: [],
        about: ["about"],
      }[t] || []
    ).some((t) => JSON.stringify(e[t]) !== JSON.stringify(s[t]));
  }
  async plSave() {
    const t = this.plP();
    if (!t) return;
    /* CORE-02 (B1): اسمُ المنصة الفارغ يُرفض قبل أيّ حفظ (ولا تُحفظ شجرةُ التنبيهات وحدها) — والخادمُ يرفضه كذلك */
    const d0 = this.state.plDraft ? this.plDraft() : null;
    if (d0 && t.blankName && t.blankName(d0.name)) return void this.bsToast(t.NAME_REQ, "warn");
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
    /* CORE-02: طلبٌ واحد — الزرّ معطّلٌ أثناءه، والنقرةُ الثانية لا تُرسل طلباً آخر */
    if (this.state.plBusy) return;
    const t = this.state.plRkPw;
    t
      ? (this.setState({ plBusy: !0, plRkMsg: "", plRkInfo: "" }),
        /* V7 · د5-هـ: keepErr — تعارضُ الإصدار المتزامن (409) يُعرض بسببه لا «تعذّر»، وتُعاد قراءةُ حالة المفتاح */
        this.adFetch("/api/recovery/new", { pw: t }, !0).then((t) => {
          (this.setState({ plBusy: !1 }),
            t && t.ok
              ? (this.setState({ plRkKey: t.key, plRkAskOn: !0, plRkPw: "" }), this.plRkLoad())
              : (this.setState({ plRkMsg: (t && t.err) || "تعذّر" }), t && "rk-changed" === t.why && this.plRkLoad()));
        }))
      : this.setState({ plRkMsg: "أدخل كلمة مرورك" });
  }
  /* CORE-02 · حوارُ مفتاح الاستعادة: بعد ظهور المفتاح لا يُغلق بالنقر خارجه ولا بـEscape (يصلان هنا) — يُغلق بزرّ «حفظته في مكان آمن» وحده */
  plRkOut() {
    const t = this.state;
    if (t.plRkKey) return void this.setState({ plRkInfo: "المفتاح لا يظهر مرة أخرى — انسخه أو اطبعه، ثم اضغط «حفظته في مكان آمن» لإغلاق النافذة" });
    t.plBusy || this.plRkClose();
  }
  plRkClose() {
    (this.state.plBusy && !this.state.plRkKey) || this.setState({ plRkAskOn: !1, plRkKey: "", plRkInfo: "" });
  }
  plRkCopy() {
    const t = this.state.plRkKey,
      e = () => {
        this.setState({ plRkInfo: "تعذّر النسخ التلقائي — حدّد المفتاح الظاهر وانسخه يدوياً" });
        try {
          const t = document.querySelector(".adm-rk .key"),
            e = document.createRange(),
            s = window.getSelection();
          t && s && (e.selectNodeContents(t), s.removeAllRanges(), s.addRange(e));
        } catch (t) {}
      };
    let s = null;
    try {
      s = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t) : null;
    } catch (t) {
      s = null;
    }
    if (!t || !s || "function" != typeof s.then) return void e();
    s.then(() => {
      this.state.plRkKey === t && (this.setState({ plRkInfo: "" }), this.bsToast("نُسخ المفتاح", "ok"));
    }, e);
  }
  plRkPrint(t) {
    const e = this.state.plRkKey;
    let s = null;
    try {
      s = window.open("", "_blank");
    } catch (t) {
      s = null;
    }
    if (!s || !s.document)
      return void this.setState({ plRkInfo: "منع المتصفح نافذة الطباعة — اسمح بالنوافذ المنبثقة لهذا الموقع ثم أعد المحاولة، أو انسخ المفتاح" });
    try {
      (s.document.write(
        '<html dir="rtl"><head><style>' +
          KIVO.BassamCssText.byId("bs-theme-tokens") +
          '</style></head><body style="font-family:Cairo,Arial;padding:40px"><h2>مفتاح استعادة مسؤول المنصة — ' +
          (t || "") +
          '</h2><p>يُحفظ في مكان آمن. يفتح حساب مسؤول المنصة من شاشة الدخول ← «تعذّر الدخول؟» ويُبطل بعد الاستعمال.</p><p style="font-family:monospace;font-size:28px;letter-spacing:4px;direction:ltr;text-align:center;border:2px dashed var(--bd-x999999);padding:20px">' +
          e +
          "</p><p>أُنشئ: " +
          new Date().toLocaleString("ar-SA-u-nu-latn") +
          "</p></body></html>",
      ),
        s.document.close(),
        s.print(),
        this.setState({ plRkInfo: "" }));
    } catch (t) {
      this.setState({ plRkInfo: "تعذّرت الطباعة — انسخ المفتاح واحفظه في مكان آمن" });
    }
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
        msg: "سيُحذف حساب مسؤول المنصة الاحتياطي نهائياً ولن يعود صالحاً للدخول.",
        ok: "حذف الحساب",
        danger: !0,
      })
      .then((y) => {
        if (!y) return;
        const e = t.removeBackupSuper();
        e.ok ? (this.bsAck("حُذف الحساب الاحتياطي", "ok"), this.forceUpdate()) : this.bsToast(e.err, "warn");
      });
  }
  /* CORE-02 · الخطوة ١ «نسخة كاملة قبل التهيئة»: تستدعي دالةَ النسخة الشاملة نفسها (exportBackup، تُمرَّر من renderVals)
     ولا تتقدّم إلا إن أبلغت بنجاح التنزيل. المتصفح لا يستطيع التحقق من أن الملف حُفظ على القرص — فيُقال ذلك صراحةً
     ويُطلب إقرارٌ صريح («تأكدت من حفظ ملف النسخة») قبل الخطوة ٢. الإخفاق أو الإلغاء يُبقي على الخطوة ١ برسالة واضحة. */
  plRsNext(exp) {
    const t = Object.assign({}, this.state.plRs),
      e = t.step,
      s = (t) => this.setState({ plRsMsg: t });
    if (0 === e) {
      if ("busy" === t.bk) return s("جارٍ تجهيز النسخة الكاملة — أكمل نافذة كلمة مرور النسخة أولاً");
      if ("ok" !== t.bk) return this.plRsBackup(exp);
      if (!t.ack) return s("أكّد أولاً أنك وجدت ملف النسخة محفوظاً على جهازك — لا يستطيع المتصفح التحقق من ذلك بنفسه");
      t.step = 1;
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
          }, !0).then((e) => {   /* V7 · د5-هـ: keepErr — سببُ التعارض (409) يُعرض */
            if ((this.setState({ plBusy: !1 }), e && e.ok)) {
              const go = () => {
                try {
                  KIVO.__BS_SRV && KIVO.__BS_SRV.bye && KIVO.__BS_SRV.bye();
                } catch (t) {}
                location.reload();
              };
              KIVO
                .bsConfirm({
                  title: "تمت التهيئة",
                  msg: "المنصة الآن فارغة ومسؤول المنصة الجديد هو «" + t.un + "». ستُعاد الآن إلى شاشة الدخول.",
                  ok: "إلى شاشة الدخول",
                  info: !0,
                })
                .then(go, go);
            } else s((e && e.err) || "تعذّر");
          }))
        : s("أكمل الحقول الثلاثة — وكلمة التأكيد هي «تهيئة»");
    this.setState({ plRs: t, plRsMsg: "" });
  }
  plRsBackup(exp) {
    const t = this.state.plRs || {};
    if (0 !== t.step || "busy" === t.bk) return;
    if ("function" != typeof exp) return void this.setState({ plRsMsg: "تعذّر بدء النسخة الكاملة — بقيت في هذه الخطوة" });
    this.setState({ plRs: Object.assign({}, t, { bk: "busy", ack: !1, bkFile: "" }), plRsMsg: "" });
    exp((ok, info) => {
      const e = Object.assign({}, this.state.plRs);
      if (0 !== e.step) return;
      ok
        ? this.setState({ plRs: Object.assign(e, { bk: "ok", bkFile: String(info || ""), taken: Date.now(), ack: !1 }), plRsMsg: "" })
        : this.setState({
            plRs: Object.assign(e, { bk: "", ack: !1 }),
            plRsMsg: "لم تكتمل النسخة الكاملة، فبقيت في هذه الخطوة" + (info ? " — " + info : ""),
          });
    });
  }
  /* CORE-01: قسمٌ من «المنصة» — لشريطها ولرابط «التهيئة والاستعادة» */
  _plGo(k) {
    this.setState({ admTab: "plat", plTab: k, plPv: "" }, () => {
      ("setup" === k && this.plRkLoad(), "notif" === k && this.nfLoadManagement(), this.plPvPost());
    });
  }
  plVals() {
    const a = this.plP();
    if (!a) return { admOnPlat: !1 };
    const r = this.state,
      i = this.plDraft(),
      n = (this.plSaved(), this.adOnSrv()),
      o = this.plDirtyN(),
      p = this.PL_SECS(),
      l = p.some((t) => t[0] === r.plTab) ? r.plTab : "id",
      d = p.filter((t) => t[0] === l)[0],
      c = (t) =>
        "width:36px;height:20px;border-radius:9999px;display:inline-block;flex-shrink:0;cursor:pointer;transition:background .2s;box-shadow:inset 0 0 0 1px rgba(0,0,0,.04);background:" +
        (t
          ? "radial-gradient(circle at 10px 10px,var(--text-on-fill) 6.5px,transparent 7.5px) var(--success)"
          : "radial-gradient(circle at 26px 10px,var(--text-on-fill) 6.5px,transparent 7.5px) var(--neutral-fill-soft)"),
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
          plOnSetup: "setup" === l,
          plOnAbout: "about" === l,
          plMapRows:
            "about" === l
              ? (() => {
                  try {
                    return this._siteMap();
                  } catch (t) {
                    return [];
                  }
                })()
              : [],
          plMapStat:
            "about" === l
              ? (() => {
                  try {
                    const r = this._siteMap();
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
          plPvOn: "notif" !== l && "setup" !== l,
          plGrid:
            "display:grid;grid-template-columns:" +
            ("notif" === l || "setup" === l ? "1fr" : "1fr 340px") +
            ";border:1px solid var(--border-subtle);border-radius:var(--r-lg);background:var(--bg-surface);overflow:hidden;box-shadow:var(--shadow-soft);align-items:stretch",
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
          plFoot:
            {
              notif: "الشجرة تُقرأ من سجل الأحداث في الكود — أي حدث يُضاف للمنصة يظهر هنا تلقائياً · التعاميم العامة لمسؤول المنصة وحده",
              id: "الشعار يُحفظ مع الإعدادات في الخادم — لا ملفات خارجية",
              login: "التغيير هنا لا يمسّ حسابات أحد",
              app: "يعمل كتطبيق ويب تقدّمي (PWA) — نفس المنصة ونفس الحساب، بلا نشر في المتاجر",
              side: "على مستوى المنصة كلها · صلاحيات الإدارات تبقى الحكم الأخير",
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
          ].map((t) => ({
            t: t[1],
            go: () => this.setState({ plPv: t[0] }, () => this.plPvPost()),
            style: g(
              (r.plPv ||
                { id: "login", login: "login", app: "phone", side: "side", setup: "login", about: "login" }[
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
                      a = (/\d{4}/.exec(String(KIVO.BassamCal.hParts(new Date()).y)) || [""])[0];   /* V7 · د5-د2 */
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
          plRsBkOk: "ok" === r.plRs.bk,
          plRsBkNo: "ok" !== r.plRs.bk,
          plRsBkFile: r.plRs.bkFile || "",
          plRsAck: !!r.plRs.ack,
          plRsAckTog: (t) => this.setState({ plRs: Object.assign({}, this.state.plRs, { ack: !!(t && t.target && t.target.checked) }), plRsMsg: "" }),
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
              "busy" === r.plRs.bk ? "جارٍ تجهيز النسخة…" : "ok" === r.plRs.bk ? "متابعة إلى «ماذا يبقى؟»" : "تنزيل نسخة كاملة والمتابعة",
              "متابعة إلى مسؤول المنصة الجديد",
              "متابعة إلى التأكيد",
              "متابعة",
              r.plBusy ? "جارٍ التنفيذ…" : "تهيئة المنصة الآن — لا رجعة",
            ][r.plRs.step] || "متابعة",
          plSteps: [
            ["نسخة كاملة تُنزَّل على جهازك", "تشمل كل الإدارات والحسابات والصور — احتفظ بها قبل أي شيء"],
            ["ماذا يبقى؟", "كل الإدارات والموظفين والحسابات والسجلات تُمسح — تختار إن كانت الهوية تبقى"],
            ["مسؤول المنصة الجديد", "اسم المستخدم وكلمة مؤقتة تُفرض عليه تغييرها عند أول دخول"],
            [
              "ما بعد التهيئة",
              "تُنهى كل الجلسات (بما فيها جلستك)، ويبدأ سجل الأمن صفحة جديدة بسطر واحد يوثّق التهيئة، ويُبطل مفتاح الاستعادة",
            ],
            ["التأكيد المزدوج", "كلمة مرورك + مفتاح الاستعادة + كتابة «تهيئة»"],
          ].map((t, e) => ({
            n: e < r.plRs.step ? "✓" : String(e + 1),
            t: t[0],
            d: t[1],
            isBk: 0 === e && 0 === r.plRs.step,
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
    ].forEach((t) => {
      w["tg_" + t.replace(".", "_")] = c(!!this.plGetPath(i, t));
      w["tgOn_" + t.replace(".", "_")] = !!this.plGetPath(i, t);   /* CORE-02 · الخطوة ٦: المفتاحُ زرٌّ role=switch وحالتُه aria-checked */
    }),
      [
        ["themeDef", ["light", "dark", "auto"]],
        ["app.statusBar", ["light", "dark", "gold"]],
        ["top.crumb", ["full", "page", "none"]],
      ].forEach((t) =>
        t[1].forEach((e) => {
          w["sg_" + t[0].replace(".", "_") + "_" + e] = g(String(this.plGetPath(i, t[0]) || "") === e);
          w["sgOn_" + t[0].replace(".", "_") + "_" + e] = String(this.plGetPath(i, t[0]) || "") === e;
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
        "٢٠ حرفاً يُعرض مرة واحدة ويُطبع ويُحفظ في مكان آمن. من شاشة الدخول ← «تعذّر الدخول؟» يفتح حساب مسؤول المنصة" +
        " بكلمة جديدة ثم يُبطل. وهو شرط تهيئة المنصة."),
      (w.plRkBtn = S && S.key ? "إنشاء مفتاح جديد (يُبطل الحالي)" : "إنشاء مفتاح الاستعادة"),
      (w.plRkAsk = () => this.setState({ plRkAskOn: !0, plRkPw: "", plRkMsg: "", plRkInfo: "" })));
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
      (w.plRkGoLbl = r.plBusy ? "جارٍ الإنشاء…" : "إنشاء المفتاح"),
      (w.plRkBusy = !!r.plBusy),
      (w.plRkClose = () => this.plRkClose()),
      (w.plRkOut = () => this.plRkOut()),
      (w.plRkKeep = (t) => t.stopPropagation()),
      (w.plRkKeyOn = !!r.plRkKey),
      (w.plRkKeyOff = !r.plRkKey),
      (w.plRkKey = r.plRkKey),
      (w.plRkInfo = r.plRkInfo || ""),
      (w.plRkInfoOn = !!r.plRkInfo),
      (w.plD = i),
      (w.plNameBad = !!(i && KIVO.BassamPlat && KIVO.BassamPlat.blankName && KIVO.BassamPlat.blankName(i.name))),
      (w.plRkCopy = () => this.plRkCopy()),
      (w.plRkPrint = () => this.plRkPrint(i.name)));
    const v =
      r.plPv ||
      { id: "login", login: "login", app: "phone", side: "side", setup: "login", about: "login" }[l];
    return ((w.pvLogin = "login" === v), (w.pvSide = "side" === v), (w.pvPhone = "phone" === v), w);
  }
  _adUsersVals0() {
    const t = this.state,
      e = Date.now(),
      s = KIVO.BassamAuth,
      a = KIVO.BassamPerm,
      r = KIVO.BassamDepts,
      o = s && s.users ? s.users() : [],
      X = this._acctCtx(),
      { l, d, c } = X;
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
            on: (t.usF || "all") === e[0],
          };
        }),
      S = (e, s, a, r, i) => ({
        v: String(e),
        l: s,
        tip: i || "",
        go: () => this.setState({ usF: r }),
        /* CORE-02 · الخطوة ٦: البطاقةُ زرٌّ (.bs-card.adm-stat) ولونُ الرقم نبرةٌ على الرموز الدلالية (كان سداسياً ثابتاً) */
        on: (t.usF || "all") === r,
        tone: a,
      }),
      x = [
        S(o.length, "إجمالي الحسابات", "", "all"),
        /* اتساق الأرقام: نبرةُ الرقم قاعدةُ بطاقة «الحسابات» في الرئيسية نفسُها — العدُّ العاديّ محايد، والتنبيهُ لما يحتاج إجراءً وحين يكون غيرَ صفر */
        S(o.filter((t) => !t.dis).length, "نشط", "", "all"),
        S(w(m[1]), "مجمّد", w(m[1]) ? "warn" : "", "frozen"),
        S(w(m[2]), "لم يدخلوا منذ بدء السجل", "mute", "never", "سجل الدخول يبدأ من تاريخ رفع هذا الإصدار"),
        S(w(m[4]), "خامل ٩٠ يوماً", "mute", "idle"),
        S(w(m[7]), "بصيغة كلمة مرور قديمة", w(m[7]) ? "warn" : "", "old", "لا يستطيع الدخول حتى تُعاد كلمة مروره"),
      ],
      /* V7 P2: الصفُّ وقائمةُ أفعاله من _acctRow — المصدرُ نفسُه لبطاقة «مدير الوحدة» في صفحة العقدة (د5-ح) */
      v = b.map((a) => this._acctRow(a, X, !1));
    return {
      usCards: x,
      usFilters: y,
      usQ: t.usQ || "",
      usOnQ: (t) => this.setState({ usQ: t.target.value }),
      usRows: v,
      usEmpty: !v.length,
      usFoot: v.length + " من " + KIVO.BassamCount(o.length, "حساب", "g") + "",
      usNote: "آخر دخول وتاريخ الإضافة من سجل الأمن — يبدأ من رفع هذا الإصدار",
      ...this._dpVals(t),
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
      /* CORE-02 (B4): النقرُ خارج الحوار وEscape (نقرةٌ على الطبقة) لا يُغلقانه — الكلمةُ لا تظهر مرة ثانية؛ يُغلق بزرّ «تم» وحده */
      usTmpOut: () => this.state.usTmp && this.setState({ usTmp: Object.assign({}, this.state.usTmp, { info: "الكلمة لا تظهر مرة أخرى — انسخها أولاً، ثم اضغط «تم» لإغلاق النافذة" }) }),
      usTmpInfo: t.usTmp ? t.usTmp.info || "" : "",
      usTmpInfoOn: !(!t.usTmp || !t.usTmp.info),
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
    };
  }
  /* KIVO_265 · حادثةُ الصور (البند 6) · CORE-01: «صحة التخزين» في نظرة عامة — من /api/overview imgs · أسماءُ الإدارات من السجل المحلي */
  _adImgVals(I, now) {
    if (!I) return { ovImgOn: !1 };
    if (I.err) return { ovImgOn: !0, ovImgErr: "تعذّرت قراءة حالة الصور الآن", ovImgState: "غير معروف", ovImgTone: "warn", ovImgCards: [], ovImgClaims: [], ovImgClaimsEmpty: !0, ovImgOrph: [], ovImgOrphEmpty: !0, ovImgNote: "" };
    const dn = (() => { const m = {}; try { (KIVO.BassamDepts.list() || []).forEach((d) => { m[d.id] = d.name; }); } catch (t) {} return (id) => (id && m[id]) || id || "—"; })(),
      c = I.counts || {},
      cards = [
        { l: "مخزن الصور", v: I.r2 ? "مرتبط" : "داخلي", sub: I.r2 ? "الصور الكبيرة في مخزن الصور المخصّص" : "الصور محفوظة مع البيانات", tone: I.r2 ? "ok" : "warn" },
        { l: "صور محفوظة", v: String(I.stored || 0), sub: KIVO.BassamCount(c.bound || 0, "صورة") + " مرتبطة بسجلّها", tone: "" },
        { l: "رُفعت ولم تُحفظ", v: String(c.claim || 0), sub: c.claim ? "رفعٌ لم يتبعه حفظٌ أو تسليم" : "لا شيء معلّق", tone: c.claim ? "warn" : "ok" },
        { l: "بانتظار الحذف", v: String(c.orphan || 0), sub: "تُحذف بعد " + Math.round((I.grace || 0) / 864e5) + " يوماً من إزالتها من سجلّها", tone: c.orphan ? "warn" : "" },
        { l: "رفوع لم تكتمل", v: String(I.staged || 0), sub: I.staged ? "صورٌ انقطع رفعُها قبل اكتماله" : "لا رفوع معلّقة", tone: I.staged ? "warn" : "" },
        { l: "غير محسومة", v: String(c.amb || 0), sub: "قديمةٌ بلا صاحب واضح", tone: "mute" },
      ],
      age = (ts) => (ts ? this.adRel(ts, now) : "—"),
      cl = (I.claims || []).map((q) => ({ img: q.img, who: q.name || q.uid || "—", dept: dn(q.dept), when: age(q.ts) })),
      or = (I.orphans || []).map((q) => ({ img: q.img, dept: dn(q.dept), when: age(q.ts), left: Math.max(0, Math.ceil(((q.ts || 0) + (I.grace || 0) - now) / 864e5)) + " يوماً" }));
    const warn = !!(c.claim || I.staged);
    return { ovImgOn: !0, ovImgErr: "", ovImgState: warn ? "يحتاج نظراً" : "سليم", ovImgTone: warn ? "warn" : "ok", ovImgCards: cards, ovImgClaims: cl, ovImgClaimsEmpty: !cl.length, ovImgOrph: or, ovImgOrphEmpty: !or.length,
      ovImgNote: "الصورة تُرفع أولاً، ثم تُحفظ مع المهمة عند الحفظ أو التسليم. إن أُزيلت من سجلّها تبقى مدةً قصيرة ثم تُحذف. صورةٌ بقيت مرفوعة دون حفظ طويلاً تعني أن الموظف لم يحفظ ولم يسلّم بعد." };
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
      /* CORE-02 S8 · رئيسيةُ المركز: «٠» قبل وصول القراءة الأولى يُقرأ رقماً حقيقياً — فالقيمُ من الخادم هيكلُ تحميل حتى تصل */
      ld = s && null == t.adOv && !t.adErr,
      pl = s && !t.adPres && !t.adErr,
      go = (k, x, sub) => () => this.setState(x || {}, () => this._ovGo(k, sub)),
      dl = (() => {
        try {
          return KIVO.BassamDepts.list() || [];
        } catch (x) {
          return [];
        }
      })(),
      isSec = (d) => {
        try {
          return !!KIVO.BassamDepts.isSection(d.id);
        } catch (x) {
          return !1;
        }
      },
      nm = this._deptsNoMgr(),
      oh = ld ? 0 : (o.oldHash || []).length,
      dirty = (() => {
        try {
          return !!(KIVO.__BS_SRV && KIVO.__BS_SRV.dirty && KIVO.__BS_SRV.dirty());
        } catch (x) {
          return !1;
        }
      })(),
      row = (l, v, x) => Object.assign({ l: l, v: String(v), tone: "", skel: !1, tip: "", go: null, ltr: !1 }, x || {}),
      card = (k, ti, sub, lnk, tab, rows, x) => ({
        k: k,
        t: ti,
        sub: sub,
        subOn: !!sub,
        lnk: lnk,
        href: "#/sysadmin/" + ("depts" === tab ? "org" : tab),
        go: (ev) => {
          ev && ev.preventDefault && ev.preventDefault();
          (x || go(tab))();
        },
        hid: "ov-c-" + k,
        busy: rows.some((r) => r && r.skel) ? "true" : "false",
        rows: rows.filter(Boolean).map((r) => Object.assign(r, { act: !!r.go && !r.skel, still: !r.go || r.skel, val: !r.skel })),
      }),
      y = [
        card("plat", "حالة المنصة", "النسخة الشاملة كما سُجّلت على هذا الجهاز", "إلى النسخة الاحتياطية", "backup", [
          row("الاتصال", "on" === g ? "● متصل" : "off" === g ? "● منقطع" : "● محلي", {
            tone: "on" === g ? "ok" : "off" === g ? "bad" : "mute",
            tip: "حالة الاتصال كما في مؤشر القائمة الجانبية",
          }),
          row("الإصدار", KIVO.__BS_VER || "—", { ltr: !0 }),
          row("التعديلات", dirty ? "بانتظار الحفظ" : "كل التغييرات محفوظة", { tone: dirty ? "warn" : "ok" }),
          row("آخر نسخة شاملة", u ? this.adRel(new Date(u).getTime(), e) : "لم تُؤخذ بعد", {
            tone: w >= 2 ? "warn" : "",
            tip: b.txt || "",
            go: go("backup"),
          }),
        ]),
        card(
          "acc",
          "الحسابات",
          f === null ? (t.adErr || o.ok === 1 ? "تعذّر تأكيد عدد الموظفين — سنحاول مجدداً تلقائياً" : "جارٍ تأكيد عدد الموظفين…") : KIVO.BassamCount(f, "موظف") + " في كل الإدارات",
          "إلى مراقبة الحسابات",
          "users",
          [
            row("نشطة", h),
            row("مجمّدة", m, { tone: m ? "warn" : "" }),
            row("موظفون بلا حساب", missingAccounts === null ? "—" : missingAccounts, { skel: ld }),
            row("متصلون الآن", p.active || 0, {
              skel: pl,
              tone: "ok",
              tip: "جلسات تفاعلت خلال آخر دقيقتين",
              go: () => {
                try {
                  const el = document.querySelector('[data-ov="pres"]');
                  el && el.scrollIntoView({ behavior: "smooth", block: "start" });
                } catch (x) { /* تجميلٌ فقط */ }
              },
            }),
            oh > 0 && row("بصيغة كلمة مرور قديمة", oh, { tone: "warn", go: go("users", { usF: "old" }) }),
          ],
        ),
        card("org", "الوحدات التنظيمية", "", "إلى الإدارات", "depts", [
          row("الإدارات", dl.filter((d) => !isSec(d)).length),
          row("الأقسام", dl.filter(isSec).length),
          row("بلا مدير", nm.length, { tone: nm.length ? "warn" : "" }),
        ]),
        card("sec", "الأمن اليوم", "«اليوم» هنا يبدأ من الثالثة فجراً بتوقيت الرياض، وفي سجل الأمن من منتصف الليل", "إلى صفحة الأمن", "sec", [
          row("محاولات دخول فاشلة", o.failsToday || 0, {
            skel: ld,
            tone: o.failsToday ? "bad" : "",
            tip: "من سجل أحداث الأمن",
            go: go("sec", { adSecKind: "login", adSecPeriod: "today" }),
          }),
          row("أقفال نشطة", o.lockedNow || 0, { skel: ld, tone: o.lockedNow ? "warn" : "" }),
          row("كتابات مرفوضة", o.deniedToday || 0, {
            skel: ld,
            tone: o.deniedToday ? "plum" : "",
            tip: "رُفضت وأُعيدت القيم كما هي — محاولات تعديل خارج الصلاحية",
            go: go("sec", { adSecKind: "denied", adSecPeriod: "today" }),
          }),
        ]),
      ],
      S = [];
    ((o.fails || [])
      .filter((t) => t.n >= 3)
      .forEach((t) =>
        S.push({
          tone: "bad",
          txt:
            KIVO.BassamCount(t.n, "محاولة دخول فاشلة") +
            " باسم " +
            t.un +
            (t.known ? " (حساب حقيقي)" : " — الاسم لا يطابق أي حساب") +
            (t.city ? " من " + t.city : ""),
          when: this.adRel(t.t, e),
          act: t.until > e ? "فكّ القفل" : "عرض السجل",
          go: () =>
            t.until > e ? this.adAct("/api/guard/unlock", { gk: "u:" + String(t.un).toLowerCase(), gks: t.gks || [] }, "فُكّ القفل") : go("sec")(),   /* KIVO_261 (AUD-052): أقفالُ الاسم الفعلية */
        }),
      ),
      (!u || w >= 2) &&
        S.push({
          tone: "warn",
          txt: u ? "النسخة الاحتياطية الشاملة متأخرة " + KIVO.BassamCount(w, "يوم", "g") + "" : "لم تُؤخذ نسخة احتياطية شاملة بعد",
          when: "الآن",
          act: "أخذ نسخة الآن",
          go: go("backup"),
        }),
      (o.deniedBy || [])
        .filter((t) => t.n >= 2)
        .forEach((t) =>
          S.push({
            tone: "plum",
            txt: (t.name || "مستخدم") + " حاول التعديل خارج صلاحيته " + KIVO.BassamCount(t.n, "مرة", "g") + " اليوم",
            when: this.adRel(t.t, e),
            act: "عرض السجل",
            go: go("sec", { adSecKind: "denied" }),
          }),
        ));
    /* CORE-02 S8: من بياناتٍ محمَّلة أصلاً — تظهر عند وجودها فقط */
    (nm.length &&
      S.push({
        tone: "warn",
        txt: KIVO.BassamCount(nm.length, ["وحدة واحدة", "وحدتان", "وحدتين", "وحدات", "وحدة", "وحدة"]) + " بلا مدير — لا يعتمد فيها أحدٌ الجدول أو التقرير اليومي",
        when: "",
        act: "الإدارات",
        go: go("depts"),
      }),
      oh &&
        S.push({
          tone: "warn",
          txt: KIVO.BassamCount(oh, "حساب") + " بصيغة كلمة مرور قديمة التشفير",
          when: "",
          act: "مراقبة الحسابات",
          go: go("users", { usF: "old" }),
        }));
    const x = S.map((t) => ({
        tone: t.tone,
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
        tone: t.active ? "ok" : "idle",
        last: k(t.last),
        lastTip: t.last ? this.adFull(t.last.t) : "",
        mine: !!t.mine,
        canKill: !t.mine,
        kill: () => this._adKill(t.u),
      })),
      /* «آخر الحسابات المضافة — آخر ٧ أيام»: الخادم يعيد إضافات ٣٠ يوماً (لعمود «أُضيف» في مراقبة الحسابات) — والبطاقة تعرض ما يقوله عنوانها */
      _ = (o.added || []).filter((t) => t && t.tg && t.ts >= e - 6048e5).map((t) => ({
        ini: l(t.tg.name),
        name: t.tg.name || t.tg.un || "",
        sub: this.adSub(t.tg),
        by: (t.by || "") + " · " + this.adRel(t.ts, e),
        st: t.lastLogin ? "دخل · " + this.adRel(t.lastLogin, e) : "لم يدخل بعد",
        tone: t.lastLogin ? "ok" : "mute",
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
            unfreeze: () =>
              this._adFreeze(s, !1, () => {
                const e = a && a.setDisById ? a.setDisById(s.id, !1) : { ok: !1 };
                e && e.ok
                  ? (this.bsAck("أُعيد تفعيل الحساب", "ok"), this.setState({ adTick: (this.state.adTick || 0) + 1 }))
                  : this.bsToast((e && e.err) || "تعذّر", "warn");
              }),
          };
        }),
      T = (o.fails || []).map((t) => ({
        un: t.un,
        known: t.known ? "حساب حقيقي" : "لا يطابق حساباً",
        knownTone: t.known ? "" : "bad",
        src: [t.city, "m" === t.dev ? "جوال" : "حاسوب"].filter(Boolean).join(" · ") || "—",
        n: String(t.n),
        lock: t.until > e ? "مقفل حتى " + this.adClock(t.until) : "—",
        locked: t.until > e,
        unlock: () => this.adAct("/api/guard/unlock", { gk: "u:" + String(t.un).toLowerCase(), gks: t.gks || [] }, "فُكّ القفل"),
      })),
      A = {
        login: ["login", "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4 M10 17l5-5-5-5 M15 12H3"],
        warn: ["warn", "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01"],
        sec: ["sec", "M3 11h18v11H3z M7 11V7a5 5 0 0 1 10 0v4"],
        perm: ["perm", "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"],
        adm: [
          "adm",
          "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
        ],
      },
      P = String(t.adSecQ || "")
        .trim()
        .toLowerCase(),
      B = this._adSecRows()
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
            /* CORE-02 · الخطوة ٦: نوعُ الحدث يلوّن أيقونتَه بصنفٍ على الرموز الدلالية (.adm-ico[data-k]) — كان لوناً سداسياً ثابتاً لا يتبع الداكن */
            k: a[0],
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
      /* رقاقةُ تصفية: زرٌّ حقيقي (.adm-chip) وحالتُه aria-pressed */
      E = (t, e, s) => ({ t: t, go: s, on: !!e }),
      M = (t) =>
        this.setState({ adSecKind: t }, () => {
          ((this._adLast = 0), this.adLoad(!0));
        }),
      N = (t) =>
        this.setState({ adSecPeriod: t }, () => {
          ((this._adLast = 0), this.adLoad(!0));
        }),
      R = [["all", "الكل"]]
        .concat(Object.entries(this._adSecKind()).map((e) => [e[0], e[1].t]))
        .map((e) => E(e[1], (t.adSecKind || "all") === e[0], () => M(e[0]))),
      L = [
        ["today", "اليوم", "منذ منتصف الليل بتوقيت الرياض"],
        ["7d", "٧ أيام", "آخر ٧ أيام حتى الآن"],
        ["30d", "٣٠ يوماً", "آخر ٣٠ يوماً حتى الآن"],
      ].map((e) => Object.assign(E(e[1], (t.adSecPeriod || "today") === e[0], () => N(e[0])), { tip: e[2] })),
      C = (o.failsToday || 0) + (o.deniedToday || 0),
      F = t.adPol || {},
      I = (t, e) => this.setState({ adPol: Object.assign({}, this.state.adPol || {}, { [t]: e }), adPolMsg: "" }),
      j = [
        ["sessH", "مدة الجلسة القصوى", "ساعة"],
        ["idleH", "الخمول قبل الخروج", "ساعة"],
        ["dispH", "مدة جلسة «شاشة العرض» (قراءة فقط)", "ساعة"],   /* V7 · د5-هـ (x1): 1–72 كحدود مدة الجلسة */
        ["lockN", "محاولات قبل القفل", "محاولة"],
        ["lockMin", "مدة القفل القصوى", "دقيقة"],
        ["pwMin", "الحد الأدنى لكلمة مرور الحسابات الإدارية (ثابت)", "خانة"],
        ["wrMin", "سقفُ الحفظ لكل حساب في الدقيقة (رفعُ الصور ربعُه)", "حفظة"],
        /* v7-C · Issue 2 (ب): إبطاءٌ بلا قفل — مطفأ افتراضياً (0)؛ الخادمُ هو الحَكَم (001 POLICY_RANGE) */
        ["thrOn", "إبطاء الحساب المستهدَف من عناوين مختلفة (0 مطفأ · 1 مفعّل)", "0/1"],
        ["thrN", "عناوين مختلفة أخفقت على الحساب قبل الإبطاء", "عنوان"],
        ["thrWin", "نافذة احتساب العناوين المختلفة", "دقيقة"],
        ["thrSec", "مهلة الإبطاء لكل محاولة (بلا قفل)", "ثانية"],
      ].map((t) => {
        const r = this._adPolRange()[t[0]];
        return { l: t[1], u: t[2], v: null == F[t[0]] ? "" : String(F[t[0]]), on: (e) => I(t[0], e.target.value), min: r[0], max: r[1], step: r[2] ? 1 : 0.25,
          bad: this._adPolBadOf(t[0], F[t[0]]), hint: r[0] === r[1] ? "ثابت: " + r[0] : "من " + r[0] + " إلى " + r[1] };
      }),
      G = (p.list || []).map((t) => ({
        ini: l(t.u.name),
        name: t.u.name || t.u.un,
        devs: (t.devs.indexOf("m") >= 0 ? "جوال" : "حاسوب") + (t.n > 1 ? " ×" + t.n : "") + (t.city ? " · " + t.city : ""),
        mine: !!t.mine,
        canKill: !t.mine,
        kill: () => this._adKill(t.u),
      }));
    /* CORE-02 S8 · «أحداث المنصة الأخيرة»: تنبيهاتُ المنصة والأمن كما وصلت إلى الجرس (لا قراءةَ جديدة) — أحدثُ خمسة */
    const ev = (() => {
        try {
          const N = KIVO.BassamNotif;
          return N && N.list
            ? N.list()
                .filter((x) => "sys" === x.k || "sec" === x.k)
                .sort((a, b) => b.at - a.at)
                .slice(0, 5)
                .map((x) => ({ t: x.t || "", b: x.b || "", bOn: !!x.b, when: this.adRel(x.at, e), whenTip: this.adFull(x.at), tone: "sec" === x.k ? "bad" : "" }))
            : [];
        } catch (x) {
          return [];
        }
      })(),
      /* «عرض الكل»: كلُّ قائمةٍ تعرض خمسة صفوف، والباقي في صفحته */
      all = (k, xs, sub) => ({ go: go(k, xs, sub) }),
      cap = (a) => a.slice(0, 5);
    return {
      ...this.adUsersVals(),
      ovStats: y,
      ovLoading: ld,
      ovLoaded: !ld,
      ovErrOn: !!(s && t.adErr),
      ...this._adImgVals(o.imgs, e),
      ovAlerts: x,
      ovAlertsEmpty: !!t.adOv && !x.length,
      ovAlertsOn: ld || x.length > 0,
      ovAlertsT: x.length ? "يحتاج قرارك (" + x.length + ")" : "يحتاج قرارك",
      ovStale: t.adOv ? "آخر قراءة ناجحة " + this.adRel(this._adOk || e, e) : "لم تكتمل القراءة بعد",
      ovMeta: ld ? "جارٍ القراءة…" : t.adOv ? "آخر قراءة " + this.adRel(this._adOk || e, e) + " · تتحدّث تلقائياً" : "تتحدّث تلقائياً",
      ovPresN: KIVO.BassamCount(p.active || 0, ["نشط واحد", "نشطان", "نشطَين", "نشطين", "نشطاً", "نشط"]),
      ovPres: cap(v),
      ovPresLoading: pl,
      ovPresEmpty: !!t.adPres && !v.length,
      ovPresHas: v.length > 0,
      ovPresAll: all("sec").go,
      ovAdded: cap(_),
      ovAddedN: KIVO.BassamCount(_.length, "حساب") + "",
      ovAddedEmpty: !!t.adOv && !_.length,
      ovAddedHas: _.length > 0,
      ovAddedAll: all("users", { usF: "week" }).go,
      ovFrozen: cap(D),
      ovFrozenN: D.length ? KIVO.BassamCount(D.length, "حساب") + "" : "لا شيء",
      ovFrozenEmpty: !D.length,
      ovFrozenHas: D.length > 0,
      ovFrozenAll: all("users", { usF: "frozen" }).go,
      /* كلُّ قفلٍ نشط يبقى ظاهراً بزرّ «فكّ القفل» ولو تجاوز الصفوفَ الخمسة — فسجلُّ الأمن لا يفكّ قفلاً */
      ovFails: T.filter((r, i) => i < 5 || r.locked),
      ovFailsN: KIVO.BassamCount(o.failsToday || 0, "محاولة") + "",
      ovFailsEmpty: !!t.adOv && !T.length,
      /* مراجعة S10: رأسُ الأعمدة مع الصفوف وحدها — القائمةُ الفارغة سطرٌ واحد */
      ovFailsHas: T.length > 0,
      ovFailsAll: all("sec", { adSecKind: "login", adSecPeriod: "today" }).go,
      ovEvents: ev,
      ovEventsEmpty: !ev.length,
      ovEventsAll: () => {
        try {
          KIVO.BassamNav && KIVO.BassamNav.bell && KIVO.BassamNav.bell();
        } catch (x) { /* الجرسُ في القشرة */ }
      },
      ovSendBc: () => this.setState({ nfSec: "bc" }, () => this._ovGo("plat", "notif")),
      ...KIVO.BassamCount.pair("secBadge", String(C), "حدث"),
      secBadgeOn: s && C > 0,
      secQ: t.adSecQ || "",
      secOnQ: (t) => this.setState({ adSecQ: t.target.value }),
      secKinds: R,
      secPeriods: L,
      secRows: B,
      secEmpty: !B.length, secHas: !!B.length,
      /* الخادم يعيد 500 حدث على الأكثر في القراءة الواحدة: عند بلوغها لا «عرض المزيد» بلا فائدة، ويُقال ذلك صراحة */
      secFoot: KIVO.BassamCount(B.length, "حدث") + "" + (t.adSec && t.adSec.length >= 500 ? " · بلغ العرض حدّه (أحدث 500 حدث في الفترة) — اختر فترة أقصر لرؤية الأقدم" : t.adSec && t.adSec.length >= (t.adSecLim || 100) ? " · يوجد المزيد" : ""),
      secMoreOn: !!(t.adSec && t.adSec.length >= (t.adSecLim || 100) && t.adSec.length < 500),
      secMore: () =>
        this.setState({ adSecLim: (t.adSecLim || 100) + 200 }, () => {
          ((this._adLast = 0), this.adLoad(!0));
        }),
      secExport: () => this.adSecExport(),
      secPol: j,
      secPolMsg: t.adPolMsg || "",
      secPolSave: () => {
        /* CORE-02 (B2): قيمةٌ خارج نطاقها تُرفض هنا باسمها (لا تأكيدَ ولا طلب) · ورفضُ الخادم يُعرض بسببه — لا «حُفظت» كاذبة ولا تغييرَ صامت */
        const bad = this._adPolBad(this.state.adPol || {});
        if (bad) return void (this.setState({ adPolMsg: "لم تُحفظ — " + bad.msg }), this.bsToast(bad.msg, "warn"));
        this._adAsk(
          { title: "حفظ سياسات الأمن", msg: "تسري القيم الجديدة على كل حسابات المنصة من الدخول التالي. هل تحفظها؟", ok: "حفظ السياسات" },
          () =>
            this.adFetch("/api/policy", this.state.adPol || {}, !0).then((t) => {
              if (t && t.ok) return void this.setState({ adPol: t.policy, adPolMsg: "حُفظت — تسري من الدخول التالي" });
              const m = (t && t.msg) || "تعذّر الحفظ";
              (this.setState({ adPolMsg: "لم تُحفظ — " + m }), this.bsToast(m, "warn"));
            }),
        );
      },
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
      secKillAll: () =>
        this._adAsk(
          { title: "إنهاء كل الجلسات الأخرى", msg: "إنهاء كل الجلسات عدا جلستك؟ سيحتاج الجميع إلى تسجيل الدخول من جديد.", ok: "إنهاء الجلسات", danger: !0 },
          () => this.adAct("/api/sess/kill", { uid: i, all: !0 }, "أُنهيت كل الجلسات الأخرى"),
        ),
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
          this.setState({ tick: (this.state.tick || 0) + 1, sysTab: "perm", p44: { ...(this.state.p44 || {}), sub: "roles", sel: "__mgr", rev: null }, usrPage: 1 }),   /* V7 · د5-ح: حاملو «مدير الوحدة» */
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
    const fx = a.acctFixedWhy ? a.acctFixedWhy(t, !t.dis) : "";
    if (fx) return void this.bsToast(fx, "warn");
    if (s) {
      const s = a.setDeptManagerDis(e, !t.dis, t.id);
      return void i(s, t.dis ? "فُعّل حساب مدير الإدارة" : "أُوقف حساب مدير الإدارة");
    }
    if (!t.dis) return void i(a.freezeStaff(t.ekey, e), "أُوقف حساب «" + (t.name || "المستخدم") + "»");
    let n = null;
    try {
      let a = null;
      try {
        a = KIVO.__BS_SRV.operations.reference("bsdept:" + e + ":bassam_employees_v1");
      } catch (t) {}
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
    if (!t || !t.railTree) return s || [];
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
            (t.grpDepth = s.depth),
            (t.trDepCls = "d" + Math.min(5, s.depth || 0)),
            (t.trSelCls = a === s.id ? "sel" : ""),
            (t.trSt = t.mgrLbl && 0 !== t.mgrLbl.indexOf("بلا") ? "g" : "0" === String(t.empCount || "0") ? "x" : "a"),
            (t.kidOn = !!s.kids),
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
      })();
    /* CORE-02 step 5: only what the tree row in view.html renders. The never-rendered row actions (rename, add, manager freeze/delete,
       node delete on a double-click arm) were removed — the same actions live in the selected node's panel (dh*, gmOpen, dhDel). */
    ((o.grpDepth = s.depth),
      /* KIVO_265 · ملاحظةُ المالك (2026-10-19): القطاعُ صفُّ شجرةٍ عادي بإزاحة مستواه (d1) كما تظهر الإداراتُ العامة تحته — شارةُ «قطاع» تبقى على الصفّ. */
      (o.trDepCls = "d" + Math.min(5, s.depth || 0)),
      (o.trSelCls = n === s.id ? "sel" : ""),
      (o.grpName = s.name),
      (o.grpCount = String(d)),
      (o.grpCountW = KIVO.BassamCount.word(d, "إدارة")),
      (o.grpKindOn = !p && !!s.kind),
      (o.grpKindLbl = s.kind || ""),
      (o.grpChevOn = !!l),
      (o.grpChev = "flex-shrink:0;opacity:.7;transition:transform .2s;" + (a ? "" : "transform:rotate(90deg)")),
      (o.grpToggle = (t) => {
        (t && t.stopPropagation && t.stopPropagation(), l ? this._grpFlip(s.id) : p || this._orgNav(s.id));
      }),
      (o.grpCapGo = (t) => {
        (t && t.stopPropagation && t.stopPropagation(), this._orgNav(s.id));
      }),
      Object.assign(o, p ? {} : this._trDragProps(s.id, e)));
    const f = !p && i && i.groupManager ? i.groupManager(s.id) : null;
    return (
      (o.grpMgrHas = !!f),
      (o.grpMgrNone = !p && !f),
      (o.grpMgrTip = f ? "مدير «" + s.name + "»: " + f.name + " — اضغط لتعديل بياناته" : "تعيين مدير لـ«" + s.name + "»"),
      (o.grpMgrName = f ? f.name + (f.dis ? " · موقوف" : "") : ""),
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
    /* V7 · د5-هـ (44): لا مسودةَ سقفٍ في صفحة العقدة بعد حذف «سقف الصفحات» — الاختيارُ مباشر */
    this.setState({ sysSel: t, empQ: "" });
  }
  async deptDel(target) {
    if (!target || !target.id || this._deptDeleteBusy || this._wpBusy || this._wpUncertain) return;
    const actor = this._wpActor(); if (!actor) return this.bsToast("حذف الإدارة يتطلب جلسة مسؤول المنصة الحالية", "warn");
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
      if (data.kind !== "delete" || data.dept !== target.id || !data.department || data.department.id !== target.id || typeof data.department.name !== "string" || !base || !natural(base.epoch)@@SYS:admin.base.custody@@ || !base.kv || typeof base.kv !== "object" || Array.isArray(base.kv) || globalKeys.some(key => !natural(base.kv[key])) || Object.entries(base.kv).some(([key, value]) => (!key.startsWith("bsdept:" + target.id + ":") && !globalKeys.includes(key)) || !natural(value)) || !this._businessBaseValid(base) || !base.notifications || ["rev", "configRev", "broadcastRev"].some(key => !natural(base.notifications[key])) || !data.counts || ["keys", "accounts", @@SYS:admin.counts.custody@@@@SYS:admin.counts.list.1|pre="\"notifications\""|post="].some(key =>"|empty="\"notifications\"].some(key =>"@@ !natural(data.counts[key]))) {
        this.bsToast("وصل جرد ناقص من الخادم؛ لم يُسمح بحذف الإدارة", "warn"); return;
      }
      /* F01: إدارةٌ لها أقسام لا تُحذف — يسمّيها جردُ الخادم ويرفض الحذفَ نفسَه (dept-has-sections) */
      if (Array.isArray(data.sections) && data.sections.length) { this.bsToast("«" + data.department.name + "» لها أقسام (" + data.sections.map(x => x.name).join("، ") + ") — احذفها أولاً؛ لم تُنفّذ أي كتابة", "warn"); return; }
      const draft = { dept: target.id, actor, data: JSON.parse(JSON.stringify(data)), ticket: null, uncertain: false, needsReview: false, confirmed: false };
      this._deptDeleteDraft = draft;
      const counts = data.counts, populated = counts.keys + counts.accounts@@SYS:admin.delete.custodyPopulated@@ + counts.notifications@@SYS:admin.delete.populated@@ > 0,
        name = data.department.name;
      if (populated) {
        const accepted = await KIVO.bsConfirm({ title: "حذف إدارة «" + name + "»", msg: "جرد الخادم: " + counts.keys + " مورد بيانات، " + counts.accounts + " حساب إدارة/موظف، "@@SYS:admin.delete.custodyMsg@@ + counts.notifications + " تنبيه@@SYS:admin.delete.message@@. سيُحذف تعريف الإدارة وحساباتها وبياناتها ومراجع صورها نهائياً. حسابات مسؤول المنصة والإدارات العامة والإدارات الأخرى محفوظة. صدّر نسخة احتياطية قبل الحذف إن احتجتها.", ok: "احذف الإدارة وكل بياناتها", danger: true, typed: name });
        if (!accepted || this._deptDeleteDraft !== draft || this._wpActor() !== actor) return;
        draft.confirmed = true; execute = true;
      } else {
        /* CORE-02: الإدارةُ الخالية تُؤكَّد بالحوار نفسه (KIVO.bsConfirm) بدل الضغطة الثانية خلال ٤ ثوانٍ */
        const accepted = await KIVO.bsConfirm({ title: "حذف إدارة «" + name + "»", msg: "الإدارة خالية وفق جرد الخادم: لا بيانات ولا حسابات. سيُحذف تعريفها نهائياً.", ok: "احذف الإدارة", danger: true });
        if (!accepted || this._deptDeleteDraft !== draft || this._wpActor() !== actor) return;
        draft.confirmed = true; execute = true;
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
      /* V7 · د5-هـ (44): السببُ يُسأل قبل الإرسال لا بعد رفضه (مدير المنصة لا يُسأل أبداً) — والطلبُ يُرسل مرّةً واحدة؛ الإلغاءُ لا يُرسل شيئاً */
      const pre = await this._reasonFirst("bsdept:" + draft.dept + ":bassam_employees_v1", draft.reasonKeys || []);
      if (!pre.go) return;
      if (pre.reason && draft.ticket.reason !== pre.reason) draft.ticket = { ...draft.ticket, reason: pre.reason };
      const result = await this._wpCall(draft.dept, draft.ticket, actor, "delete");
      const srv = KIVO.__BS_SRV;
      if (!result.ok) {
        draft.uncertain = ["network", "receipt", "server", "session"].includes(result.err); draft.needsReview = result.err === "conflict";
        return this.bsToast(draft.needsReview ? "تغيّرت بيانات الإدارة؛ اضغط الحذف مجدداً لمراجعة جرد جديد وتأكيده. لم يُنفّذ الطلب بهذه النسخة." : result.err === "reason" ? "يشترط الخادم سبباً؛ تأكيد الحذف محفوظ" : result.err === "unknown-data" ? "تحتوي الإدارة على " + (result.unknownCount > 0 ? KIVO.BassamCount(result.unknownCount, ["مُدخل واحد", "مُدخلان", "مُدخلَين", "مُدخلات", "مُدخلاً", "مُدخل"], "g") + " " : "") + "من البيانات لا تتعرّف عليها المنصة؛ لم تُحذف الإدارة حمايةً لسلامة البيانات، ولم يُحذف أي شيء. تواصل مع مسؤول المنصة لمراجعة هذه المدخلات." : result.err === "permission" ? "صلاحيتك لا تسمح بحذف الإدارة؛ لم يُعتمد تغيير" : "لم يصل تأكيد الحذف؛ أعد محاولة الطلب نفسه، لم يُعرض نجاح", "warn");
      }
      const receipt = result.body, natural = value => Number.isSafeInteger(value) && value >= 0;
      if (receipt.mode !== "dept-delete" || receipt.dept !== draft.dept || receipt.requestId !== draft.ticket.requestId || !natural(receipt.rev) || !receipt.revs || typeof receipt.revs !== "object" || Array.isArray(receipt.revs) || Object.values(receipt.revs).some(value => !natural(value)) || !receipt.counts || ["keys", "accounts", @@SYS:admin.counts.custody@@@@SYS:admin.counts.list.2|pre="\"notifications\""|post="].some(key =>"|empty="\"notifications\"].some(key =>"@@ !natural(receipt.counts[key]))) {
        draft.uncertain = true; return this.bsToast("وصل تأكيد حذف ناقص؛ أعد محاولة الطلب نفسه قبل أي عملية أخرى", "warn");
      }
      if (this._wpActor() !== actor || this._deptDeleteDraft !== draft) return;
      this._deptDeleteDraft = null;
      this.setState({ ...(this.state.sysSel === draft.dept ? { sysSel: "" } : {}), deptMsg: "حذف الخادم إدارة «" + draft.data.department.name + "» وحساباتها وبياناتها", tick: (this.state.tick || 0) + 1 });
      this.bsAck("اعتمد الخادم حذف إدارة «" + draft.data.department.name + "» وحساباتها وبياناتها", "ok");
      try { if (srv && srv.resync) srv.resync(false); } catch (_) {}
    } finally { this._deptDeleteBusy = false; }
  }

  /* V7 · د5-هـ (44): «اسأل أولاً ثم أرسل» لمسارات الخادم المحمية — مدير المنصة معفًى دائماً (لا نافذة)، وبغيره تُفتح نافذةُ السبب (280 reasonFirst)
     قبل أي طلب: { go:false } عند الإلغاء فلا يُرسل شيء · { go:true, reason } بعده */
  _reasonFirst(k, keys) {
    const srv = KIVO.__BS_SRV;
    if (!srv || (srv.reasonExempt && srv.reasonExempt()) || typeof srv.reasonFirst !== "function" || !(keys && keys.length)) return Promise.resolve({ go: true, reason: "" });
    return new Promise(resolve => srv.reasonFirst(k, keys, resolve));
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
  async _irBackupFence(snapshot@@SYS:admin.fence.param@@) {
    const srv = KIVO.__BS_SRV;
    const same = () => this._wpActor() === snapshot.actor && window.__BS_BOOT?.v === snapshot.v && !srv.dirty() && !srv.inflight() && !srv.sesChanged() && Object.entries(snapshot.revs).every(([k, rev]) => srv.rev(k) === rev);
    if (!same()) throw new Error("تغيّرت البيانات؛ حدّثها ثم أعد التصدير");
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch((@@SYS:admin.fence.url@@"/api/get?keys=&uid=") + encodeURIComponent(snapshot.actor), { credentials: "same-origin", cache: "no-store", signal: controller.signal });
      const value = await response.json();
      if (!response.ok || value?.ok !== 1 || value[@@SYS:admin.fence.rev@@"v"] !== snapshot.v || !same()) throw new Error("حدّث البيانات من الخادم ثم أعد التصدير؛ لم تُنشأ نسخة جزئية");
      return value;
    } finally { clearTimeout(timer); }
  }
  _businessBaseValid(base) {
    const spec={@@SYS:admin.businessBase|sep=","@@};
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
        /* Owner decision (b): a unit holding keys the platform does not classify is refused as a data-integrity problem, not a permission refusal */
        if (response.status === 403 && result && result.err === "unit-unknown-data") return { ok: 0, err: "unknown-data", unknownCount: denied.filter(([key, value]) => value && value.why === "unknown" && key.startsWith("bsdept:" + dept + ":")).length };
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
    if (body.dept !== dept || !base || !natural(base.epoch)@@SYS:admin.base.custody@@ || !base.kv || typeof base.kv !== "object" || Array.isArray(base.kv) || Object.entries(base.kv).some(([key, value]) => !key.startsWith("bsdept:" + dept + ":") || !natural(value)) || !this._businessBaseValid(base) || !base.notifications || ["rev", "configRev", "broadcastRev"].some(key => !natural(base.notifications[key])) || !body.counts || !natural(body.counts.keys)@@SYS:admin.wipe.custodyNatural@@ || !natural(body.counts.notifications)@@SYS:admin.wipe.natural@@)
      return void this.setState({ wpNeedsReview: true, wpMsg: "وصل جرد ناقص من الخادم؛ لم يُسمح بالمسح" });
    this._wpTicket = null;
    this.setState({ wpBase: JSON.parse(JSON.stringify(base)), wpBaseActor: actor, wpCounts: JSON.parse(JSON.stringify(body.counts)), wpNeedsReview: false, wpMsg: "جرد خادمي: " + body.counts.keys + " مورد@@SYS:admin.wipe.custodyMsg@@" + (natural(body.counts.notifications) ? "، " + body.counts.notifications + " تنبيه" : "") + "@@SYS:admin.wipe.message@@. راجع القائمة قبل تأكيد المسح." });
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
      /* V7 · د5-هـ (44): السببُ قبل الإرسال (مدير المنصة لا يُسأل) — طلبٌ واحد؛ الإلغاءُ لا يُرسل شيئاً ولا يُظهر رفضاً */
      const pre = await this._reasonFirst("bsdept:" + dept + ":bassam_employees_v1", ticket.reasonKeys || []);
      if (!pre.go) return void this.setState({ wpMsg: "" });
      if (pre.reason && ticket.body.reason !== pre.reason) { ticket = { ...ticket, body: { ...ticket.body, reason: pre.reason } }; this._wpTicket = ticket; }
      const result = await this._wpCall(dept, ticket.body, actor);
      const srv = KIVO.__BS_SRV;
      if (!result.ok) {
        this._wpUncertain = ["network", "receipt", "server", "session"].includes(result.err);
        return void this.setState({ wpNeedsReview: result.err === "conflict", wpMsg: result.err === "conflict" ? "تغيّرت بيانات الإدارة؛ لم يُنفّذ طلب المسح بهذه النسخة. أعد مراجعة الجرد قبل التأكيد." : result.err === "reason" ? "يشترط الخادم سبباً لهذا الإجراء؛ تأكيد المسح محفوظ" : result.err === "unknown-data" ? "تحتوي الإدارة على " + (result.unknownCount > 0 ? KIVO.BassamCount(result.unknownCount, ["مُدخل واحد", "مُدخلان", "مُدخلَين", "مُدخلات", "مُدخلاً", "مُدخل"], "g") + " " : "") + "من البيانات لا تتعرّف عليها المنصة؛ لم تُمسح بيانات الإدارة حمايةً لسلامة البيانات، ولم يُحذف أي شيء. تواصل مع مسؤول المنصة لمراجعة هذه المدخلات." : result.err === "permission" ? "صلاحيتك لا تشمل مسح الإدارة" : "لم يصل تأكيد المسح؛ محفوظ طلبك لإعادة المحاولة نفسها دون ادعاء نجاح" });
      }
      const receipt = result.body;
      if (receipt.dept !== dept || receipt.requestId !== ticket.body.requestId || !Number.isSafeInteger(receipt.rev) || receipt.rev < 0 || !receipt.counts || ["keys", @@SYS:admin.counts.custody@@@@SYS:admin.counts.list.3|pre="\"notifications\""|post="].some(key =>"|empty="\"notifications\"].some(key =>"@@ !Number.isSafeInteger(receipt.counts[key]) || receipt.counts[key] < 0))
        { this._wpUncertain = true; return void this.setState({ wpMsg: "تأكيد الخادم ناقص؛ لم يُعرض نجاح، أعد المحاولة بنفس الطلب" }); }
      if (this._wpActor() !== actor || this.state.wpDid !== dept) return;
      this._wpTicket = null; this._wpUncertain = false;
      this.setState({ wpDid: "", wpTxt: "", wpBase: null, wpCounts: null, wpNeedsReview: false, wpMsg: "", tick: (this.state.tick || 0) + 1 });
      this.bsAck("مُسحت بيانات الإدارة والعهد @@SYS:admin.wipe.ack|pre="والتنبيهات"|post=" المحددة،"|empty="والتنبيهات المحددة،"@@ وحُفظ تعريف الإدارة؛ أكّد الخادم العملية", "ok");
      try { if (srv && srv.resync) srv.resync(false); } catch (_) {}
    } finally { this._wpBusy = false; this.setState({ wpBusy: false }); }
  }
  wpClose() {
    if (this._wpBusy || this._wpUncertain) return void this.setState({ wpMsg: "لم يُحسم تأكيد المسح؛ أعد محاولة الطلب نفسه قبل إغلاق النافذة" });
    this._wpTicket = null; this.setState({ wpDid: "", wpTxt: "", wpMsg: "" });
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
        ? (this.setState({ tick: (this.state.tick || 0) + 1 }), this.bsAck("حُذف حساب «" + r + "»", "ok"))
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
      this.setState({ sysSel: t, empQ: "" });   /* V7 · د5-هـ (44): لا مسودةَ سقفٍ — «سقف الصفحات» حُذف */
    };
    go();
  }
  /* ═══ KIVO_256 · SOT-003/004/010/015 — شجرةُ الصلاحيات TO-BE v24.9 (وثيقة الشجرة · القسم ٣): الحاويات · الأوراق · العدسات · المنصة · المراجع ═══
     تُشتقّ وقتَ التشغيل من بنية المنصة الحقيقية (KIVO_MANIFEST ← manifests/pages.json: الصفحات · التبويبات · الصفحاتُ تحت حاوية · ترتيبُ seq ·
     عناوينُ التبويبات tabAddr · حاويةُ «مؤشرات الإدارة») ومن السجلّ (KIVO_REGISTRY: المالكون · المفاتيحُ النشطة والمحجوزة) — ومطابقتُها لـ
     src/manifests/perm-tree24.json (المولَّد من الوثيقة بأداة tools/perm_tree.py) مثبتةٌ في tests/unit/v7_p4_systems_map.test.mjs (A2).
     V7 P4 — خريطةُ الأنظمة: البنّاءُ نفسُه يحمل لكل ورقةٍ نظامَها (sys = module) وتصنيفَها (cls) وشروطَ لوحتها (req ← requires) ومضيفي العدسة
     (hosts ← ملفّ العدسة)، ولكل حاويةٍ لوحاتِها التي بلا مالكٍ في السجل (panels) — كلُّه مشتقٌّ من البيان والسجلّ، لا قائمةَ يدوية.
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
    let lensM = [];
    try {
      lensM = M.clone("lenses");
    } catch (t) {
      /* بيانٌ بلا عدسات: أوراقُ العدسات بلا مضيفين معلنين */
    }
    const kp = conts.filter((c) => "kpis" === c.key)[0] || null,
      refs = (kp && kp.refs) || [],
      /* شروطُ اللوحة كما يعلنها البيان (requires = المصدرُ الوحيد · يطابقه validate_schemas مع kpiPanelOk) */
      reqOf = (id) =>
        pages
          .reduce((a, p) => a.concat((p.requires || []).filter((r) => r.for === id)), [])
          .map((r) => ({ on: r.on, kind: r.kind || (0 === String(r.on).indexOf("lens:") ? "lens" : "perm") })),
      /* التصنيفُ مشتقّ: الورقةُ خارج الصفحة لوحةُ مؤشراتٍ إن كانت من مراجع «مؤشرات الإدارة»، وإلا تبويب */
      clsOf = (type, id) => ("offpage" === type ? (-1 !== refs.indexOf(id) ? "panel" : "tab") : "plugin" === type ? "lens" : type),
      /* المفتاحُ الذي يمنح لوحةً بلا مالك: أهدافُ ذرّة «عرض» ورقتها في السجل */
      viaOf = (id) =>
        Object.keys(R.atoms || {}).reduce((a, k) => {
          const at = R.atoms[k];
          return at && at.leaf === id && "view" === at.act ? a.concat((at.targets || []).filter((x) => -1 === a.indexOf(x))) : a;
        }, []),
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
        Object.assign(
          { owner: id, label: label, type: type, route: rt, keys: act(id), reserved: resv(id), managed: refsOf(id), cls: clsOf(type, id), req: reqOf(id) },
          extra || {},
        ),
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
          L = [],
          PN = [];
        if (!seq.length) own(p.key) && L.push(leaf(p.key, p.name, "page", route(p), { page: p.key, sys: p.module || "" }));
        else
          seq.forEach((e) => {
            const z = String(e).split(":"),
              k = z[0],
              v = z[1];
            if ("page" === k) {
              const q = PG[v];
              q && own(q.key) && L.push(leaf(q.key, q.name, "page", route(q), { page: q.key, under: p.key, sys: q.module || "" }));
              return;
            }
            const x = (("sub" === k ? p.subs : p.tabs) || []).filter((y) => y.key === v)[0],
              id = p.key + "/" + v;
            x && own(id) && L.push(leaf(id, x.name, x.offPage ? "offpage" : "tab", route(p, v, x.offPage), { page: p.key, sub: v, subKind: k, sys: p.module || "" }));
            /* لوحةٌ من مراجع «مؤشرات الإدارة» بلا مالكٍ في السجل (مفتاحُها عند مالكٍ آخر): صفٌّ في الخريطة وحدها — لا ورقةَ تُمنح */
            x &&
              !own(id) &&
              -1 !== refs.indexOf(id) &&
              PN.push({ id: id, label: (kp.names || {})[id] || x.name, at: L.length, page: p.key, sys: p.module || "", route: route(p, v, !0), via: viaOf(id), req: reqOf(id) });
          });
        /* مرجعٌ بلا «/» = لوحةُ صفحةٍ كاملة يمنحها مفتاحُ عرضها («مؤشرات المهام») — صفُّها بعد ورقة صفحتها */
        refs.forEach((r) => {
          const i = -1 === r.indexOf("/") ? L.findIndex((l) => l.owner === r) : -1;
          -1 !== i &&
            PN.push({ id: r + "#panel", label: (kp.names || {})[r] || L[i].label, at: i + 1, page: r, sys: L[i].sys, route: "#/" + (kp.nav || kp.key), via: viaOf(r), req: reqOf(r) });
        });
        L.length && out.push({ id: p.key, label: p.name, kind: "page", page: p.key, nav: p.nav || p.key, leaves: L, panels: PN });
      });
    const byKind = (kind) => R.data.owners.filter((o) => o.kind === kind).map((o) => o.id),
      lbl = (id) =>
        String((R.owners[id] || {}).label || id)
          .replace(/\s*\((?:Platform Feature Flags|Presenter|صفحتي|مرجع مستقل)\)\s*$/, "")
          .trim(),
      lensOf = (ln) => lensM.filter((z) => z.key === ln)[0] || {},
      /* مسارُ المضيف كما تفتحه المنصة — من مضيفي العدسة في ملفّها (hosts)، لا نصَّ حرفياً */
      hostRoute = (h) => {
        const z = String(h).split("/");
        return PG[z[0]] ? route(PG[z[0]], z[1]) : "";
      };
    /* V7 · د5-ح: حاويةُ العدسات ما وُجدت عدسة — قطعتُها (src/systems/_shared/lenses) تغيب بغياب مضيفَيها فلا حاويةَ فارغة */
    const lensLeaves = byKind("lens").map((id) => {
      const ln = id.replace(/^lens\./, ""),
        hs = (lensOf(ln).hosts || []).slice();
      return leaf(id, lbl(id), "plugin", hs.map(hostRoute).filter(Boolean).join(" · "), { lens: ln, hosts: hs, ind: (lensOf(ln).indicators || []).slice() });
    });
    lensLeaves.length && out.push({ id: "lenses", label: "العدسات", kind: "plugins", page: null, nav: null, leaves: lensLeaves });
    out.push({ id: "platform", label: "المنصة", kind: "platform", page: null, nav: null, leaves: byKind("platform").map((id) => leaf(id, lbl(id), "platform", "")) });
    out.push({
      id: "refs",
      label: "المراجع المستقلة",
      kind: "reference",
      page: null,
      nav: null,
      leaves: byKind("reference").map((id) => leaf(id, lbl(id), "reference", "", { managedIn: R.owners[id].managedIn })),
    });
    /* الأنظمة (Q1: النظام = module في pages.json كما هو) وحاوياتُ العرض — خصائصُ على المصفوفة فلا يتغيّر شكلُها لمحرّرات السقف والموظف والقالب */
    out.systems = pages
      .filter((p) => p.module)
      .map((p) => ({ key: p.module, page: p.key, label: p.name, activation: p.activation, home: p.under || p.key }));
    out.display = conts.map((c) => ({ id: c.key, label: c.name, nav: c.nav || c.key, refs: (c.refs || []).slice() }));
    return (this.__t24s = out);
  }
  /* RISHAD-266: تبويبُ «سقف النطاق» ونطاقُ بيانات الموظفين (سجلُّ النطاق القديم لكل إدارة) أُزيلا مع تقاعد سقف النطاق القديم —
     الوصولُ يحدّده سقفُ الوحدة (سقف الصفحات) وصلاحياتُ الموظف. يبقى هنا تحميلُ مرجعيّات الإدارة (الخطة · الموظفون) الذي يستعمله
     محرّرُ سقف الوحدة (sysPick) وتبويبُ الحسابات. */
  async scLoadReferences(d, retry) {
    const registry = KIVO.BassamDepts;
    if (typeof d !== "string" || !d || !registry || !registry.treeFlat().some(dept => dept.id === d)) return false;
    const ops = KIVO.__BS_SRV.operations, context = ops.context();
    if (!context) return false;
    const keys = [@@SYS:admin.scRefs.plan@@"bassam_employees_v1"].map(name => "bsdept:" + d + ":" + name),
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
      this.setState({ shTick: (this.state.shTick || 0) + 1 });
      if (!ok && retry) this.bsToast(entry.error);
      return !!ok;
    }).finally(() => { entry.promise = null; });
    return entry.promise;
  }
  _pwSet(t, e) {
    this.setState((s) => ({ pwDlg: { ...(s.pwDlg || {}), [t]: e, err: "" } }));
  }
  _pwSetErr(t) {
    this.setState((e) => ({ pwDlg: { ...(e.pwDlg || {}), err: t, busy: !1 } }));
  }
  pwDlgCancel() {
    const t = (this.state.pwDlg || {}).mode,
      d = "exp" === t && this._encPend && this._encPend.done;
    (d && d(!1, "أُلغي التصدير"),
      (this._encPend = null),
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
                (this._encPend = null),
                a.done && a.done(!0, n.download));
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
                  ")" + (KIVO.BackupRestore && KIVO.BackupRestore.missingNote ? KIVO.BackupRestore.missingNote(a.missing) : ""),
              });
            })
            .catch(() => (this.setState({ backupMsg: "تعذّر تشفير النسخة" }), a.done && a.done(!1, "تعذّر تشفير النسخة"))))
        : (a && a.done && a.done(!1, "تعذّر التصدير"), void this.setState({ pwDlg: null, backupMsg: "تعذّر التصدير" }));
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
@@SYS:admin.methods.histimp@@  audNode() {
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
      sc.site
        ? h("button", { key: key, type: "button", className: "adm-chip", "aria-pressed": on ? "true" : "false", onClick: go }, txt)
        : h(
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
      /* مراجعة S10: في «مركز إدارة رشاد» عنوانُ الصفحة (h2) يحمل الاسم — الكرتُ يبدأ بوصفه وأدواته؛ و#/admin كما هو */
      sc.site
        ? null
        : h(
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
        sc.site ? null : h("div", { style: { fontSize: 14, fontWeight: 700, color: "var(--text-primary)" } }, "سجل الأنشطة والتغييرات"),
        h(
          "div",
          { style: { fontSize: sc.site ? 12 : 10.5, color: "var(--text-muted)", marginTop: sc.site ? 0 : 2 } },
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
    const fDept =
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
          : null;
    const fUid =
        sel(
          "uid",
          Object.keys(users).map((u) => [u, users[u]]),
          "كل المستخدمين",
          150,
          "تصفية بالمستخدم",
        );
    const fQ =
        inp("q", "بحث بالاسم أو المعرّف", 170);
    const fSite =
        inp("site", "الموقع", 120);
    const fPlan =
        inp("plan", "الشهر (1448-4)", 110);
    const fDay =
        inp("day", "اليوم (1448-4-10)", 120);
    const fFromL =
        h("span", { key: "fl", style: { fontSize: 10.5, color: "var(--text-muted)" } }, "من");
    const fFrom =
        inp("from", "", 130, "date", "من تاريخ");
    const fToL =
        h("span", { key: "tl", style: { fontSize: 10.5, color: "var(--text-muted)" } }, "إلى");
    const fTo =
        inp("to", "", 130, "date", "إلى تاريخ");
    const fClr =
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
          : null;
    const fEt = [chip(!F.etype, "كل الكيانات", () => this.audSetF("etype", ""), "e_")].concat(
          A.ET_FILTER.map((o) => chip(F.etype === o[0], o[1], () => this.audSetF("etype", F.etype === o[0] ? "" : o[0]), "e" + o[0])),
        );
    const fAct = [chip(!F.act, "كل الأفعال", () => this.audSetF("act", ""), "a_")].concat(
          A.ACT_FILTER.map((o) => chip(F.act === o[0], o[1], () => this.audSetF("act", F.act === o[0] ? "" : o[0]), "a" + o[0])),
        );
    /* اتساق المرشّحات (مركز إدارة رشاد وحده — #/admin كما هو): أربعُ مجموعاتٍ مسمّاة على مكوّن الرقائق المشترك (.adm-chip كسجل الأمن)؛
       على سطح المكتب تلتفّ الرقائق تحت اسم مجموعتها، وعلى الجوال (≤640) صفُّ كل مجموعة يمرّر أفقياً، و«من … إلى» لا ينفصلان */
    const fGrp = (k, lbl, cls, kids) =>
      h("div", { key: "g" + k, className: "adm-flt-r" }, h("span", { className: "adm-flt-l", id: "aud-fl-" + k }, lbl), h("div", { role: "group", "aria-labelledby": "aud-fl-" + k, className: cls }, kids));
    const filters = sc.site
      ? h("div", { key: "ft", className: "adm-flt" }, [
          fGrp("e", "الكيان", "adm-chips adm-flt-c", fEt),
          fGrp("a", "الفعل", "adm-chips adm-flt-c", fAct),
          fGrp("q", "البحث", "adm-flt-f", [fDept, fUid, fQ, fSite]),
          fGrp("d", "الفترة", "adm-flt-f", [fPlan, fDay, h("span", { key: "rng", className: "adm-flt-rng" }, fFromL, fFrom, fToL, fTo), fClr]),
        ])
      : h(
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
      h("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" } }, fEt),
      h("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" } }, fAct),
      h("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" } }, [fDept, fUid, fQ, fSite, fPlan, fDay, fFromL, fFrom, fToL, fTo, fClr]),
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
  /* V7 · د5-ح: هل حُسمت صلاحياتُ الجلسة؟ (مديرُ المنصة · أو وصلت مفاتيحُ الخادم — 334 ready) */
  _dPermReady() {
    try {
      return !KIVO.BassamPerm || !KIVO.BassamPerm.ready || !!KIVO.BassamPerm.ready();
    } catch (e) {
      return !0;
    }
  }
  _admTabsNow(i, n, p, g) {
    const e = this.state,
      rdy = "dept" !== i || (() => { try { return !KIVO.BassamPerm || !KIVO.BassamPerm.ready || !!KIVO.BassamPerm.ready(); } catch (x) { return !0; } })();   /* = _dPermReady */
    let l = e.admTab,
      dq = null;
    try {
      if (KIVO.__ADMIN_OPEN_TAB && n) {
        /* CORE-02 S7: والقسمُ (#/sysadmin/plat/<sub> — __ADMIN_OPEN_PSUB) في الحالة قبل الرسم أيضاً؛ والتحميلُ بعده بالمسار الواحد
           (_admGo · _plGo) فتُقرأ حالةُ مفتاح الاستعادة وسجلُّ الأنشطة وإدارةُ التنبيهات من الجرس والرابط والشريط سواءً */
        const q = (l = KIVO.__ADMIN_OPEN_TAB),
          K = this.PL_KEYS(),
          rq = KIVO.__ADMIN_OPEN_PSUB,
          ps = "plat" === q ? (K.includes(rq) ? rq : !rq && K.includes(e.plTab) ? e.plTab : "id") : null;   /* بلا قسم: آخرُ قسمٍ فُتح · قسمٌ مجهول: «هوية المنصة» */
        const oid = KIVO.__ADMIN_OPEN_ORG;
        KIVO.__ADMIN_OPEN_TAB = null;
        KIVO.__ADMIN_OPEN_PSUB = null;
        KIVO.__ADMIN_OPEN_ORG = null;
        /* V7 · د5-هـ (44): #/sysadmin/org/<id>/perm/<القسم> يفتح «الصلاحيات» على قسمه */
        const osub = oid ? (/\/perm\/(systems|roles|people|log)$/.exec(String(location.hash || "")) || [])[1] : "";
        oid && osub && ((this.__orgTab = "perm"), (this.state = { ...this.state, p44: { ...(this.state.p44 || {}), sub: osub } }));
        "depts" === q && p.includes(q) && (oid ? this._orgOpen(oid) : this._orgClose());
        p.includes(q) && (q !== e.admTab || (ps && ps !== e.plTab)) && (this.state = { ...this.state, admTab: q, ...(ps ? { plTab: ps } : {}) });
        p.includes(q) && setTimeout(() => (ps ? (this._plGo(ps), "setup" !== ps && this.plRkLoad()) : this._admGo(q)), 0);
      }
    } catch(t) { /* لا يمنع العرض — يُتجاوز بصمت */ }
    try {
      /* V7 · د5-ح (قرار المالك): التبويبُ المطلوب في العنوان يُحفظ حتى تُحسم الصلاحية — قبلها لا يُرسم تبويب (حالةُ تحميل) */
      "dept" === i && rdy && KIVO.__ADMIN_OPEN_DTAB && ((dq = KIVO.__ADMIN_OPEN_DTAB), (KIVO.__ADMIN_OPEN_DTAB = null));
      /* V7 · د5-هـ (44 · المدير): #/admin/perm/<systems|roles|people|log> يفتح «الصلاحيات» على قسمه (د5-ح: و«الأنظمة» قراءةً) */
      const psub = "perm" === dq ? (/^#\/admin\/perm\/(systems|roles|people|log)$/.exec(String(location.hash || "")) || [])[1] : "";
      psub && (this.state = { ...this.state, p44: { ...(this.state.p44 || {}), sub: psub } });
    } catch(t) { /* لا يمنع العرض — يُتجاوز بصمت */ }
    /* V7 · د5-ح: تبويبٌ مطلوبٌ غيرُ مسموح ⇒ أولُ تبويبٍ مسموح (والعنوانُ يُصحَّح في renderVals) · لا تبويبَ مسموحاً ⇒ "" (رسالةٌ لا صفحةٌ فارغة) ·
       قبل حسم الصلاحية ⇒ "" (لا يُرسم تبويبٌ ثم يختفي) — كان الاحتياطُ «backup» يُرسم بلا صلاحية */
    const dt = dq ? (g.includes(dq) ? dq : g[0] || "") : e.deptTab,
      h = "dept" === i && !rdy ? "" : g.includes(dt) ? dt : g[0] || "";
    "dept" === i && rdy && dt !== e.deptTab && (this.state = { ...this.state, deptTab: dt });
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
    const v = {
      ...(() => {
        const i = "undefined" != typeof window && "site" === KIVO.__ADMIN_MODE ? "site" : "dept",
          n = "site" === i && s,
          pm = ((this.__p44Dept = "dept" === i), "dept" === i && this.p44DeptUnit ? !!this.p44DeptUnit() : !1),   /* V7 · د5-هـ (44 · المدير): «الصلاحيات» لمدير الوحدة النشطة */
          o = n && !(!window.__BS_BOOT || !window.__BS_BOOT.cf),
          p = n
            ? o
              ? this.CON_TABS().map((t) => t[0])
              : this.CON_TABS()
                  .filter((t) => !t[3])
                  .map((t) => t[0])
            : ["backup"];
        const c = !(!window.__BS_BOOT || !window.__BS_BOOT.cf),
          g = ["backup", "oplog", "shifts"]
            .filter((t) => {
              try {
                return !KIVO.BassamPerm || !KIVO.BassamPerm.subOn || KIVO.BassamPerm.subOn("admin", t);
              } catch (t) {
                return !0;
              }
            })
            .filter((t) => "oplog" !== t || c)
            .concat(pm ? ["perm"] : []),
          { l, h } = this._admTabsNow(i, n, p, g),
          d = p.includes(l) ? l : n ? "depts" : "backup",
          av = this.adVals();
        const ps = "plat" === d ? (this.PL_KEYS().includes(this.state.plTab) ? this.state.plTab : "id") : null,
          pv = n && "plat" === d ? this.plVals() : {};
        const dRdy = "dept" !== i || this._dPermReady();   /* V7 · د5-ح */
        try {
          "dept" === i
            ? dRdy && (h ? this._hashTab("admin", "perm" === h ? "perm/" + this._p44SubNow() : h) : /^#\/admin\/./.test(String(location.hash || "")) && history.replaceState && history.replaceState(null, "", location.pathname + location.search + "#/admin"))
            : n && this._hashTab("sysadmin", ps ? "plat/" + ps : "depts" === d ? this._orgSeg() : d);
        } catch (t) {}
        /* CORE-02 S7: ما تعرضه الصفحة يُنشر لشريط «مركز إدارة رشاد» (التوافرُ قاعدةُ p هنا وحدها) — بعد كتابة العنوان */
        try {
          const dz = !(!this.state.plDraft && !this.state.nfDraft);
          n &&
            KIVO.BassamNav &&
            KIVO.BassamNav.conSync &&
            KIVO.BassamNav.conSync({
              avail: p,
              tab: d,
              sub: ps || (this.PL_KEYS().includes(this.state.plTab) ? this.state.plTab : "id"),
              secBadge: av.secBadgeOn ? av.secBadge | 0 : 0,
              dirty: dz ? this.PL_KEYS().filter((k) => this.plDirtyTab(k)) : [],
              dirtyN: dz ? this.plDirtyN() : 0,
            });
        } catch (t) {}
        return {
          admModeDept: "dept" === i,
          admModeSite: "site" === i,
          admOnDepts: n && "depts" === d,
          admOnPlat: n && "plat" === d,
          admGoPlat: () => this._admGo("plat"),
          ...(n ? this._conHead(d, ps) : {}),
          ...pv,
          ...(n && "plat" === d ? { conTitle: pv.plTitle || "", conDesc: pv.plSub || "" } : {}),
          /* CORE-02 S8: الرئيسية — سطرُ وقت القراءة تحت العنوان */
          ...(o && "overview" === d ? { conDesc: av.ovMeta } : {}),
          conDescOn: (n && "plat" === d && !!pv.plSub) || (o && "overview" === d),
          conPhCls: "con-ph" + (n && "plat" === d ? " con-ph--sticky" : ""),
          admOnOverview: o && "overview" === d,
          admOnSec: o && "sec" === d,
          admOnUsers: o && "users" === d,
          ...av,
          admOnBackup: "backup" === d,
          admOnAud: o && "oplog" === d,
          showDeptAud: "dept" === i && "oplog" === h,
          audNode: (o && "oplog" === d) || ("dept" === i && "oplog" === h) ? this.audNode() : null,
          adErrOn: !!this.state.adErr,
          ovStoreOpen: !!this.state.adStoreOpen,
          ovStoreTog: () => this.setState({ adStoreOpen: !this.state.adStoreOpen }),
          admSiteBackup: n && "backup" === d,
          showDeptBk: "dept" === i && "backup" === h,
          dTabBarShow: "dept" === i && dRdy && g.length > 1,
          /* V7 · د5-ح: قبل حسم الصلاحية حالةُ تحميل (مكوّنُ حالات الصفحة) — ولا تبويبَ مسموحاً ⇒ رسالةٌ واضحة */
          dLoadOn: "dept" === i && !dRdy,
          dStates: (el) => KIVO.PageStates && KIVO.PageStates.host(el, { state: "loading" }),
          dNoneOn: "dept" === i && dRdy && !g.length,
          dTabGoBackup: () => this.setState({ deptTab: "backup" }),
          dTabGoLog: () =>
            this.setState({ deptTab: "oplog" }, () => {
              this.audLoad(!0);
            }),
          dTabBkOn: -1 !== g.indexOf("backup"),
          dTabLgOn: -1 !== g.indexOf("oplog"),
          dTabSfOn: -1 !== g.indexOf("shifts"),
          showDeptSf: "dept" === i && "shifts" === h,
          dTabGoSf: () => this.setState({ deptTab: "shifts" }),
          /* V7 · د5-هـ (44 · المدير): «الصلاحيات» — الأدوار · الأشخاص · السجل لوحدته وحدها (#/admin/perm/<القسم>) */
          dTabPmOn: -1 !== g.indexOf("perm"),
          showDeptPerm: "dept" === i && "perm" === h,
          dTabGoPerm: () => this.setState({ deptTab: "perm" }),
          ...("dept" === i && "shifts" === h ? this.sfVals() : {}),
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
              dbkLastTone: e.stale ? "warn" : "",
            };
          })(),
          dbkImport: (t) => {
            const e = t.target && t.target.files && t.target.files[0];
            (t.target && (t.target.value = ""), e && KIVO.BassamDeptBackup && KIVO.BassamDeptBackup.importFile(e));
          },
          /* مراجعة S10: كلُّ انتقالٍ داخل المركز عبر _ovGo (BassamNav.conGo) — عنوانٌ جديد في السجلّ فيعمل زرُّ الرجوع */
          admGoBackup: () => this._ovGo("backup"),
          admOnHist: n && "histimp" === d,
          hiNode: n && "histimp" === d && this.hiNode ? this.hiNode() : null,   /* V7 · د5-ح: اللوحةُ قطعةُ الإحصائيات (admin.methods.histimp) — تغيب بغيابها */
        };
      })(),
      ...(() => {
        const t = KIVO.BassamDepts;
        if (!t) return { deptRows: [], deptMsg: "", deptMsgColor: "var(--danger-text)", actDeptName: "" };
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
              /* V7 P1: صفحتان — الهيكل (#/sysadmin/org: الشجرةُ بعرض الصفحة) وصفحةُ العقدة (#/sysadmin/org/<id>: الاختيارُ الصريح وحده) */
              orgNodeOn: !!p && this._orgKnown(e.sysSel),
              orgTreeOn: !(p && this._orgKnown(e.sysSel)),
              dlOpen: !0,
              orgBack: () => {
                try {
                  location.hash = "#/sysadmin/org";
                } catch (t) {}
              },
              mdGridStyle: "display:grid;align-items:start;gap:13px;grid-template-columns:minmax(0,1fr)",
              trQ: e.trQ || "",
              trOnQ: (t) => this.setState({ trQ: t.target.value }),
              trClear: () => this.setState({ trQ: "" }),
              trHasQ: !!(e.trQ && String(e.trQ).trim()),
              trExpandAll: () => this._trSetAll(t, !0),
              trCollapseAll: () => this._trSetAll(t, !1),
            };
            if (!p || !this._orgKnown(e.sysSel)) {
              if (p) return { ...tree, deptDetailReady: false, deptDetailEmpty: false, _sel: "" };
              let context = null;
              try { context = t.context && t.context(); } catch (error) {}
              const message = context && ["error", "unavailable"].includes(context.state) && context.message
                ? context.message : a.length || t.nodes().length
                  ? "اختر إدارة أو عقدة من الهيكل لعرض تفاصيلها"
                  : "لا توجد إدارة — أضف إدارة من الهيكل";
              return { ...tree, deptDetailReady: false, deptDetailEmpty: true, deptDetailMessage: message, _sel: "" };
            }
            /* V7 P1: تبويباتُ صفحة العقدة — «نظرة عامة» افتراضاً · «البيانات» للإدارة والقسم وحدهما */
            const l = ["ov", "perm", "data"].includes(e.sysTab) && !(n && "data" === e.sysTab) ? e.sysTab : "ov";   /* V7 · د5-ح: لا تبويبَ مستقلّاً للمسؤولين والحسابات — بطاقةُ «مدير الوحدة» في «الصلاحيات ← الأدوار» */
            try {
              if (!n) KIVO.__BS_SRV.operations.reference("bsdept:" + o + ":bassam_employees_v1");
            } catch (t) {
              if (!n) this.scLoadReferences(o, false);
            }
            const M = (t) =>
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
                  act = t.active(),
                  pid = n ? t.parentIdOf(o) || "" : t.groupIdOf(o) || "";
                let path = [];
                try {
                  path = (pid ? (t.pathOf(pid) || []).concat([(t.nodeOf(pid) || {}).name]) : []).filter(Boolean);
                } catch (t) {}
                const mg = n ? (A && A.groupManager ? A.groupManager(o) : null) : A && A.deptManager ? A.deptManager(o) : null;
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
                  dhUsersLbl: n ? (t.unitCountTxt ? t.unitCountTxt(t.deptsUnder(o) || []) : KIVO.BassamCount(kids, "إدارة")) + " تحتها" : KIVO.BassamCount(users, "مستخدم") + "",
                  /* F01: «إضافة قسم» للإدارة (لا للقسم: لا شيءَ تحت قسم) — نافذةُ الإضافة بنوع «قسم» وأبٍ هو الإدارة (sectionAdd) */
                  dhSecAddOn: !n && !(t.isSection && t.isSection(o)),
                  dhSecAdd: () => {
                    const e = { ...(this.state.admGrpFlip || {}) };
                    (delete e[o],
                      this.setState({ admGrpFlip: e, ndOpen: !0, ndPid: o, ndName: "", ndKind: t.NODE_KIND_SEC || "قسم", ndNewKind: "", ndMsg: "" }, () => this._orgHome()));
                  },
                  dhAdd: () => {
                    const e = { ...(this.state.admGrpFlip || {}) };
                    (delete e[o],
                      this.setState({ admGrpFlip: e, ndOpen: !0, ndPid: o, ndName: "", ndKind: "", ndNewKind: "", ndMsg: "" }, () => this._orgHome()));
                  },
                  dhSwitch: () => {
                    this._adSwitchDept(() => t.setActive(o));
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
                    const accts = n
                      ? 0
                      : (A && A.users ? A.users() : []).filter((t) => "staff" === t.role && t.deptId === o && !t.mgr).length;
                    const K = n ? this._gmKind(o) : "";
                    /* V7 P2 · د5-ح · بطاقةُ «مدير الوحدة» (الصلاحيات ← الأدوار): جدولُ «مراقبة الحسابات» نفسُه (_acctRow · قائمة الأفعال الواحدة) مصفّىً بنطاق العقدة —
                       حساباتُ العقدة وما تحتها في الهيكل (المدير العام بعقدته gid، وغيرُه بإدارته أو قسمه deptId)، المسؤولون أولاً */
                    const X = this._acctCtx(),
                      ids = { [o]: 1 };
                    try {
                      (t.descendantsOf ? t.descendantsOf(o) : []).forEach((x) => {
                        ids[x] = 1;
                      });
                    } catch (x) {}
                    const rank = (a) => ("gm" === a.role ? 0 : "staff" === a.role && (a.mgr || /^mgr:/.test(String(a.ekey || ""))) ? 1 : "staff" === a.role ? 2 : 3),
                      q = e.ndQ ? KIVO.BassamFind.dig(String(e.ndQ).trim().toLowerCase()) : "",
                      scope = (A && A.users ? A.users() : []).filter((a) => "super" !== a.role && !!ids["gm" === a.role ? a.gid : a.deptId]),
                      shown = scope
                        .filter((a) => !q || KIVO.BassamFind.dig([a.name, a.un, a.alt, this.adUnit(a), this.adRole(a)].join(" ").toLowerCase()).indexOf(q) >= 0)
                        .sort((a, b) => rank(a) - rank(b) || String(a.name || "").localeCompare(String(b.name || ""), "ar"));
                    return {
                      mgHas: list.length > 0,
                      mgNone: 0 === list.length,
                      mgStaffTxt: n
                        ? KIVO.BassamCount(kids, "إدارة") + " في هذا الفرع"
                        : KIVO.BassamCount(accts, "موظف") + " " + KIVO.BassamCount.agr(accts, "له", "لهما", "لهم") + " حساب دخول",
                      mgTitle: n ? "مديرو " + K : "مديرو " + (t.isSection && t.isSection(o) ? "القسم" : "الإدارة"),
                      mgSub: n
                        ? "ينتقلون بين إدارات الفرع كلها ويرثون سقف كل إدارة كاملاً · أكثر من مدير مسموح"
                        : "يرثون سقف " + (t.isSection && t.isSection(o) ? "القسم" : "الإدارة") + " كاملاً · أكثر من مدير مسموح",
                      mgAddTip: n ? "إضافة مدير جديد " + this._gmFor(o) : "إضافة مدير جديد لهذه الإدارة",
                      mgEmptyT: n ? "لا مدير " + this._gmFor(o) + " بعد" : t.isSection && t.isSection(o) ? "لا مدير لهذا القسم بعد" : "لا مدير لهذه الإدارة بعد",
                      mgEmptyS: n
                        ? "أضف أول مدير من زر + — يرث سقف كل إدارة في الفرع كاملاً."
                        : "بلا مدير لا يستطيع أحد اعتماد الجدول أو التقرير اليومي — أضف أول مدير من زر +.",
                      mgAdd: () => (n ? this.gmOpen(o, "__add") : this.mgrOpen(o, "__add")),
                      ndQ: e.ndQ || "",
                      ndOnQ: (x) => this.setState({ ndQ: x.target.value }),
                      ndRows: shown.map((a) => this._acctRow(a, X, !0)),
                      ndEmpty: 0 === shown.length && !(0 === list.length && 0 === scope.length),   /* بلا مديرٍ ولا حساب: رسالةٌ واحدة (mgNone) */
                      ndEmptyTxt: scope.length ? "لا حسابات تطابق البحث" : "لا حسابات دخول في هذا النطاق بعد",
                      ndFoot: KIVO.BassamCount(scope.length, "حساب") + (n ? " في العقدة وفرعها" : " في هذه الوحدة وما تحتها"),
                    };
                  })(),
                  dhDelTip: n ? "حذف العقدة" : t.isSection && t.isSection(o) ? "حذف القسم — يمسح القسم وكل بياناته وحساباته نهائياً" : (t.deptDelWhy && t.deptDelWhy(o)) || "حذف الإدارة — يمسح الإدارة وكل بياناتها وحساباتها نهائياً",
                  dhDelOn: n ? !0 : t.list().length > 1,
                  dhDelLbl: n ? "حذف العقدة" : t.isSection && t.isSection(o) ? "حذف القسم" : "حذف الإدارة",
                  dhDel: () => {
                    if (n) {
                      /* V7 P0: عقدةٌ لها حسابُ مدير عام لا تُحذف — يُحذف الحسابُ أولاً (والخادمُ يرفضها كذلك: 018 nodeRemoveWhy «node-has-manager»).
                         كانت تُحذف العقدةُ ثم حسابُها في خطوةٍ واحدة. والعقدةُ الفارغة: تأكيدٌ بسيط كما هو */
                      /* V7 P1: ما تحتها يُفحص قبل السؤال (عُقدٌ ووحدات — t.childrenOf) — كان التأكيدُ يظهر ثم يرفض nodeDel؛ والخادمُ يرفض كذلك (018 nodeRemoveWhy) */
                      const kd = (t.childrenOf && t.childrenOf(o)) || [];
                      if (kd.length) return void this.bsToast("تحت «" + p.name + "» " + KIVO.BassamCount(kd.length, "تابع") + " — انقلها أو احذفها أولاً ثم احذف العقدة", "warn");
                      const m = KIVO.BassamAuth && KIVO.BassamAuth.groupManagers ? KIVO.BassamAuth.groupManagers(o).length : 0;
                      if (m) return void this.bsToast("لـ«" + p.name + "» " + KIVO.BassamCount(m, "حساب مدير") + " — احذفه أولاً من «الصلاحيات ← الأدوار ← مدير الوحدة» ثم احذف العقدة", "warn");
                      return void this._adAsk(
                        {
                          title: "حذف «" + p.name + "»",
                          msg: "تُحذف «" + p.name + "» من الهيكل. لا تُمسّ بيانات أي إدارة.",
                          ok: "حذف",
                          danger: !0,
                        },
                        () => {
                          const s = t.nodeDel(o);
                          if (!s || !s.ok) return void this.bsToast((s && s.err) || "تعذّر الحذف");
                          (this.setState({ sysSel: "", deptMsg: "✓ حُذفت «" + p.name + "»" }), this.bsAck("حُذفت العقدة", "ok"), this._orgHome());
                        },
                      );
                    } else {
                      /* F01: إدارةٌ لها أقسام لا تُحذف — والخادمُ يرفضها (dept-has-sections) */
                      const sw = t.deptDelWhy ? t.deptDelWhy(o) : "";
                      if (sw) return void this.bsToast(sw, "warn");
                      this.deptDel(p);
                    }
                  },
                };
              })(),
              selKindLbl: n ? p.kind || "عقدة" : t.isSection && t.isSection(o) ? "قسم · " + ((t.nodeOf(t.parentDeptOf(o)) || {}).name || "") : "إدارة",
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
                  /* CORE-02 step 5: «+ إدارة عامة جديدة…» goes through the node-add flow (BassamDepts.nodeAdd: placeWhy · freshId ·
                     seedCapFrom) and the parent rule (setDeptParent), instead of writing the groups record directly */
                  if (t.isSection && t.isSection(o)) return void this.bsToast("القسم يكون تحت إدارةٍ مباشرةً — لا تحت «إدارة عامة»");
                  let e = "إدارة عامة جديدة",
                    s = e,
                    a = 2;
                  for (; t.nodes().some((t) => t.name === s) || t.list().some((t) => t.name === s); ) s = e + " " + a++;
                  const r = t.nodeAdd({ name: s, kind: "إدارة عامة", pid: null });
                  if (!r || !r.ok) return void this.bsToast((r && r.err) || "تعذّر إنشاء الإدارة العامة");
                  const c = t.setDeptParent(o, r.id);
                  if (!c || !c.ok) return (t.nodeDel(r.id), void this.bsToast((c && c.err) || "تعذّر الإسناد"));
                  return void this.setState({
                    deptMsg: "✓ أُنشئت «" + s + "» وأُسندت إليها هذه الإدارة — غيّر اسمها من لوحتها في الشجرة",
                  });
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
                    ? this.setState({ deptMsg2: "الاسم مستخدم لإدارة أو قسم آخر" })
                    : (t.save(a.map((t) => (t.id === o ? { ...t, name: s } : t))), this.setState({ ["dnm_" + o]: void 0, deptMsg2: "" }));
                } else this.setState({ ["dnm_" + o]: void 0 });
              },
              goTabOv: () => this.setState({ sysTab: "ov" }),
              goTabData: () => this.setState({ sysTab: "data" }),
              onTabOv: "ov" === l,
              onTabData: "data" === l,
              tabOvStyle: M("ov" === l),
              tabDataStyle: M("data" === l),
              tabDataShow: !n,
              selNature: n ? "عقدة إشرافية" : t.isSection && t.isSection(o) ? "قسم تشغيلي" : "إدارة تشغيلية",
              selNatureCls: n ? "sup" : "opr",
              ...this._orgOvVals(t, o, n, p),
              /* V7 · د5-هـ (44): «الصلاحيات» حلّت محلّ «سقف الصفحات» — لوحةُ السقف وشجرتُها القديمة (صفحة × فعل) حُذفتا؛ السقفُ يُضبط في «الصلاحيات ← الأنظمة» */
              goTabPerm: () => this.setState({ sysTab: "perm" }),
              tabPermStyle: M("perm" === l),
              onTabPerm: "perm" === l,
              ...("perm" === l && !this.__p44Dept && this._p44Vals ? this._p44Vals(o, n, p) : {}),
              _sel: o,
            };
          })(),
          i = KIVO.BassamPerm && KIVO.BassamPerm.deptAccountsCount ? KIVO.BassamPerm.deptAccountsCount() : 0;
        return {
          ...r,
          oldAccOn: i > 0,
          oldAccMsg: "يوجد " + KIVO.BassamCount(i, "حساب إدارة|قديم") + " — الدخول صار للموظفين وحدهم من جدول موظفي الإدارة",
          oldAccDo: () =>
            this._adAsk(
              {
                title: "حذف حسابات الإدارة القديمة",
                msg: "حذف " + KIVO.BassamCount(i, "حساب إدارة|قديم") + " نهائياً؟ لن تعود صالحة للدخول. الدخول صار للموظفين وحدهم من جدول موظفي الإدارة، ولا تُمسّ بيانات الإدارات.",
                ok: "حذف الحسابات",
                danger: !0,
              },
              () => {
                const t = KIVO.BassamPerm.purgeDeptAccounts();
                t && t.ok ? this.setState({ tick: (this.state.tick || 0) + 1 }) : t && t.err && this.bsToast(t.err);
              },
            ),
          deptCount: a.length,
          stopProp: (t) => {
            t && t.stopPropagation && t.stopPropagation();
          },
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
@@SYS:admin.resLabels.custody@@@@SYS:admin.resLabels.staff@@@@SYS:admin.resLabels.dreport@@                bassam_shift_options_v1: "خيارات الورديات",
@@SYS:admin.wipe.labels.plan@@@@SYS:admin.wipe.labels.daily@@@@SYS:admin.wipe.labels.plan.opts@@@@SYS:admin.wipe.labels.tasks@@@@SYS:admin.wipe.labels@@                bassam_options_v1: "الخيارات العامة",
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
@@SYS:admin.wipe.custodyRow@@            if (counts.notifications > 0) p.push({ label: "تنبيهات الإدارة (" + counts.notifications + ")" });
@@SYS:admin.wipe.rows@@            const d = !!e.wpBase && ((counts.keys || 0)@@SYS:admin.wipe.custodyAny@@ + (counts.notifications || 0)@@SYS:admin.wipe.any@@ > 0);
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
          deptMsg2: e.deptMsg || "",
          actDeptName: t.activeName(),
          deptMsg: e.deptMsg || "",
          deptMsgColor: /^✓/.test(e.deptMsg || "") ? "var(--success-text)" : "var(--danger-text)",
          sdShow: (() => {
            try {
              return !!(t.needsStructure && t.needsStructure());
            } catch (e) {
              return !1;
            }
          })(),
          sdLbl: e.sdArm ? "اضغط مرة أخرى لزرع الهيكل" : "زرع هيكل القطاع",
          sdBg: e.sdArm ? "rgba(185,151,81,0.16)" : "var(--bg-surface)",
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
          ndMsgColor: /^✓/.test(e.ndMsg || "") ? "var(--success-text)" : "var(--danger-text)",
          ndGo: () => {
            const e = (this.state.ndName || "").trim(),
              s = ("__new" === this.state.ndKind ? this.state.ndNewKind || "" : this.state.ndKind || "").trim(),
              a = this.state.ndPid || null;
            if (!e) return void this.setState({ ndMsg: "اكتب الاسم" });
            if (!s) return void this.setState({ ndMsg: "اختر النوع" });
            if (t.nodes().some((t) => t.name === e) || t.list().some((t) => t.name === e))
              return void this.setState({ ndMsg: "يوجد في الهيكل ما يحمل هذا الاسم" });
            const r = { ...(this.state.admGrpFlip || {}) };
            /* F01: النوع «قسم» تحت إدارة ← BassamDepts.sectionAdd (سجلُّ الوحدات + سقفُه لقطةً من سقف الإدارة الأم) */
            if (s === (t.NODE_KIND_SEC || "قسم") && t.sectionAdd) {
              if (a) delete r[a];
              const x = t.sectionAdd({ name: e, deptId: a || "" });
              if (!x || !x.ok) return void this.setState({ ndMsg: (x && x.err) || "تعذّر إنشاء القسم" });
              return void this.setState({ admGrpFlip: r, ndName: "", ndNewKind: "", ndMsg: "✓ أُنشئ قسم «" + e + "» — عيّن مدير القسم واضبط سقفه" });
            }
            if ((a && delete r[a], s === (t.NODE_KIND_DEPT || "إدارة"))) {
              if (a && !t.nodeOf(a)) return void this.setState({ ndMsg: "الأب غير موجود" });
              /* CORE-02 step 5: the unit branch obeys the same placement rule and id source as every other add (placeWhy · freshId) */
              const w = t.placeWhy({ id: "", dept: !0 }, a);
              if (w) return void this.setState({ ndMsg: w });
              const s = t.freshId("d"),
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
                const c = (() => {
                    try {
                      let a = 0,
                        i = null;
                      try {
                        i = KIVO.__BS_SRV.operations.reference("bsdept:" + r.id + ":bassam_employees_v1");
                      } catch (t) {}
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
                  pick: () => this._orgNav(r.id),
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
                      o = (s && s.users ? s.users() : []).filter((t) => "staff" === t.role && t.deptId === r.id);
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
                      delTip: "حذف إدارة «" + r.name + "» وكل بياناتها",
                      delStyle:
                        "width:24px;height:24px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;transition:.15s;background:var(--bg-xffffff);color:var(--fg-xb91c1c);border:1px dashed var(--bd-a18528280p5)",
                      delGo: (t) => {
                        (t && t.stopPropagation && t.stopPropagation(), this.deptDel(r));
                      },
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
                      trCapTxt: this._capStateTxt(r.id).short,   /* V7 P3-0: المصدرُ الواحد — «مفتوح» لا تُقال لوحدةٍ يحدّها أصلٌ مسقوف */
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
                    this._adSwitchDept(() => t.setActive(r.id));
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
                    this._adSwitchDept(() => t.setActive(r.id));
                  },
                };
              });
            })(),
            r._sel,
          ),
        };
      })(),
      ...(() => {
        const t = KIVO.BassamAuth,
          s = KIVO.BassamDepts;
        if (!t || !s) return { uaMsg: "", uaMsgColor: "var(--danger-text)", pwHint: "" };
        const a = s.active();
        return (
          t.users().find((t) => "dept" === t.role && t.deptId === a),
          t.users().find((t) => "super" === t.role),
          {
            pwHint:
              "كلمة المرور: " + KIVO.BassamCount(t.PW_MIN || 6, "رقم") + " على الأقل — عند التعديل اترك الحقل فارغاً لإبقاء الحالي.",
            uaMsg: e.uaMsg || "",
            uaMsgColor: /^✓/.test(e.uaMsg || "") ? "var(--success-text)" : "var(--danger-text)",
          }
        );
      })(),
      backupMsg: e.backupMsg || "",
      /* CORE-02 · الخطوة ٦: نبرةُ الرسالة (.adm-bk-msg[data-tone]) على الرموز الدلالية — كانت سداسيةً ثابتة لا تتبع الداكن */
      backupMsgTone: /تعذّر|غير صالح|لا توجد/.test(e.backupMsg || "") ? "bad" : "ok",
      ...(() => {
        let t = this._fullStamp();
        const e = this._expInfo(t, "full");
        return {
          fullLastTxt: e.txt,
          fullLastTone: e.stale ? "warn" : "",
        };
      })(),
      /* done (اختياري): يُبلَّغ بنتيجة التصدير — (true, اسمُ الملف) بعد أن يسلّم المتصفحُ الملفَّ للتنزيل، أو (false, السبب) عند الإخفاق أو الإلغاء */
      exportBackup: (done) => {
        const cb = "function" == typeof done ? done : null,
          fail = (m) => {
            (this.setState({ backupMsg: m }), cb && cb(!1, m));
          };
        this._encPend && this._encPend.done && this._encPend.done(!1, "أُلغي التصدير السابق");
        this._encPend = null;
        const t = KIVO.BassamDepts;
        if (!s) return void fail("صلاحية غير كافية — تصدير النسخة الشاملة لمسؤول المنصة فقط");
        if (!t) return void fail("تعذّر التصدير — نظام الإدارات غير متاح على هذا الجهاز");
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
@@SYS:admin.full.dstatsRead@@            if (!KIVO.BassamNotif) throw new Error("خدمة التنبيهات غير متاحة");
            const notificationExport=await KIVO.BassamNotif.exportDomain();
@@SYS:admin.full.custodyExport@@            if (!notificationExport || notificationExport.ok !== 1) throw new Error("تعذّر تصدير مجال التنبيهات");
            const declaredDepts=JSON.parse(s.bassam_depts_v1||"[]").map(d=>d.id);
@@SYS:admin.full.custodyScope@@            const business = await KIVO.BackupRestore.exportDomains({departments:declaredDepts,full:true,v:snapshot.v,images:e||{}});
            Object.keys(s).forEach(key => { if (/(?:^|:)bassam_(?:@@SYS:admin.full.stripKeys|sep="|"@@)_v[12]$/.test(key)||KIVO.__BS_SRV.operations.resources.includes(key.replace(/^bsdept:[^:]+:/,''))) delete s[key]; });
            await this._irBackupFence(snapshot);
            const manifest={version:4,scope:"full",domains:{kv:1,@@SYS:admin.full.manifest.dstats@@notifications:1,@@SYS:admin.full.custodyManifest@@@@SYS:admin.full.manifest.systems|post="operations:1},departments:declaredDepts"|empty="operations:1},departments:declaredDepts"@@,keys:Object.keys(s).filter(k=>typeof s[k]==="string"&&k!=="bassam_active_dept_v1")};
            const a = new Date(),
              r = { app: "bassam-crowd", version: 4, kind: "full", exportedAt: a.toISOString(), data: s, domains: {@@SYS:admin.full.domains.dstats@@notifications:notificationExport.domain@@SYS:admin.full.custodyDomain@@,...business.domains}, manifest, idbImages: business.images, ...(business.missing && business.missing.length ? { imagesMissing: business.missing } : {}) },
              i = KIVO.BassamCrypt;
            if (!i || !i.ok()) return void fail("تعذّر التصدير — التشفير غير متاح على هذا المتصفح");
            ((this._encPend = {
              done: cb,
              json: JSON.stringify(r),
              dt: a,
              depts: t ? t.list().length : 1,
              items: Object.keys(s).length,
              imgsN: Object.keys(business.images || {}).length,
              missing: business.missing || [],
            }),
              this.setState({ pwDlg: { mode: "exp", p1: "", p2: "", err: "" } }),
              setTimeout(() => {
                try {
                  const t = document.getElementById("bsPwD1");
                  t && t.focus();
                } catch (t) {}
              }, 60));
          } catch (t) {
            fail("تعذّر التصدير");
          }
        };
        try {
          if (!KIVO.BassamIDB) throw new Error("مخزن الصور غير متاح على هذا المتصفح");
          KIVO.BassamIDB.allForBackup()
            .then((t) => e(t))
            .catch((t) => fail("تعذّر التصدير — " + ((t && t.message) || t)));
        } catch (t) {
          fail("تعذّر التصدير — " + ((t && t.message) || t));
        }
      },
      ...(() => {
        const t = e.fbkConf;
        if (!t)
          return {
            fbkOpen: !1,
            fbkPick: !0,
            fbkConfirm: !1,
            fbkFile: 0,
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
          fbkFile: t.file,
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
      this.setState({ backupMsg: "استعادة النسخة الشاملة لمسؤول المنصة فقط" });
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
            file: Array.isArray(fileDepts) ? fileDepts.length : 1,
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
    /* CORE-02: خطوةُ «النسخة قبل التهيئة» في «التهيئة والاستعادة» تستدعي دالةَ النسخة الشاملة نفسها (exportBackup) — لا نسخةً منها */
    this.p44Mount && this.p44Mount(v, !!this.__p44Dept, !!v.showDeptPerm);   /* V7 · د5-هـ (44 · المدير): صفحةُ «الصلاحيات» الواحدة في النمطين */
    return (v.plRsNext && ((v.plRsNext = () => this.plRsNext(v.exportBackup)), (v.plRsBkAgain = () => this.plRsBackup(v.exportBackup))), v);
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
          ? "radial-gradient(circle at 10px 10px,var(--text-on-fill) 6.5px,transparent 7.5px) var(--success)"
          : "radial-gradient(circle at 26px 10px,var(--text-on-fill) 6.5px,transparent 7.5px) var(--neutral-fill-soft)"),
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
          return KIVO.BassamCal.hText(new Date(t), { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });   /* V7 · د5-د2 */
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
      nfKOnTone: "", nfKUrgTone: "",   /* اتساق الأرقام: عدّا «مفعّل» و«عاجل» عدّا إعدادٍ لا حالة، فنبرتُهما محايدة */
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
        if (this._nfBcSending || this._nfBcAsking) return;
        if (E && ("all" === k.mode || !k.mode)) {
          /* CORE-02: التعميمُ على كل المنصة يُؤكَّد أولاً (KIVO.bsConfirm) — الإلغاءُ لا يرسل شيئاً */
          this._nfBcAsking = !0;
          return void this._adAsk(
            {
              title: "تعميم على كل المنصة",
              msg:
                "سيصل التعميم «" + k.title.trim() + "» إلى " + KIVO.BassamCount(_, "شخص", "g") + " في كل الإدارات" +
                ("sched" === k.when ? " في الوقت المحدد." : " الآن في الجرس."),
              ok: "sched" === k.when ? "جدولة التعميم" : "إرسال إلى الجميع",
            },
            () => M(!1),
          ).finally(() => {
            this._nfBcAsking = !1;
          });
        }
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
