/* global gkZone, gkMark -- سجلّا الأبواب/المعالم الاختياريان يُجَسّان بـtypeof قبل الاستعمال (سطرا 16569/16571)؛ الإعلانُ هنا للتحليل الساكن وحده (ESLint no-undef) — لا أثرَ على التنفيذ (KIVO_249) */
class Component extends KIVO.BassamPageKit.base(DCLogic, [
  "admin+award+daily+dreport+employees+irshad+plan+profile+seized+staff+tasks",
  "daily+dreport+dstats+irshad+plan+seized+staff+tasks",
  "daily+dreport+irshad+plan+seized+staff+tasks",
  "daily+dreport+irshad+plan+profile+seized",
  "daily+plan+seized+staff",
  "daily+dreport+plan",
  "daily+plan",
  "plan+staff",
]) {
  _opService() {
    const service = KIVO.__BS_SRV && KIVO.__BS_SRV.operations;
    if (!service) throw Error("operations-read-required");
    return service;
  }
  _opRead(name) {
    const service = this._opService();
    this._opDrafts || (this._opDrafts = Object.create(null));
    if (!this._opDrafts[name]) this._opDrafts[name] = service.draft();
    return this._opDrafts[name].get(name);
  }
  async _opCommit(changes) {
    try {
      const service = this._opService(),
        names = Object.keys(changes).sort(),
        action = "plan:" + names.join("|");
      // These drafts were captured when the displayed source was loaded. Verify
      // every original scope/revision synchronously before staging one batch.
      this._opActions || (this._opActions = Object.create(null));
      if (!this._opActions[action]) {
        names.forEach((name) => {
          if (!this._opDrafts || !this._opDrafts[name])
            throw Error("operations-review-required");
          this._opDrafts[name].get(name);
        });
        const begun = service.begin(this, action);
        if (!begun || begun.ok !== 1) throw Error("operations-review-required");
        this._opActions[action] = true;
      }
      let result;
      this._opBusy = (this._opBusy || 0) + 1;
      try {
        result = await service.commit(this, action, changes, (draft) => {
          names.forEach((name) => draft.set(name, changes[name]));
        });
      } finally {
        this._opBusy--;
      }
      this._opTicket = result && result.ticket;
      if (!result || result.ok !== 1) {
        this.bsToast(
          result && result.uncertain
            ? "لم يصل تأكيد الحفظ — بقيت المسودة؛ أعد المحاولة بنفس البيانات لحسم الطلب"
            : "لم يُحفظ التعديل — راجع التغييرات والصلاحيات ثم أعد تحميل البيانات",
          "warn",
        );
        return result || { ok: 0, err: "save" };
      }
      delete this._opActions[action];
      this._opTicket = null;
      names.forEach((name) => {
        // Advance only our acknowledged source, never another editor's draft.
        if (JSON.stringify(service.get(name)) === JSON.stringify(changes[name]))
          this._opDrafts[name] = service.draft();
      });
      return result;
    } catch (error) {
      this.bsToast(
        "لم يُحفظ التعديل — تغيّرت نسخة البيانات أو سياق الحساب؛ بقي عملك في الصفحة للمراجعة",
        "warn",
      );
      return { ok: 0, err: "review-required" };
    }
  }
  _opWrite(name, value) {
    this._opLastSave = this._opCommit({ [name]: value });
    return this._opLastSave;
  }
  async _opGc() {
    const result = this._opLastSave && (await this._opLastSave);
    if (!result || result.ok !== 1) return false;
    (this._opKeptImages || []).forEach(
      (id) =>
        KIVO.BassamPurge &&
        KIVO.BassamPurge.unkeep &&
        KIVO.BassamPurge.unkeep(id),
    );
    this._opKeptImages = [];
    return this._gcImages();
  }
  async _opAck(message, tone) {
    const result = this._opLastSave && (await this._opLastSave);
    if (result && result.ok === 1) this.bsAck(message, tone);
  }
  /* ══ R190: سجلُّ التشغيل الميداني بعرض الصفحة — مكوّنُ «سجل الشهر» في الإحصائيات اليومية (DailyStats) حرفاً ══
   يتبع تبويبَ القائمة الجانبية كسجلّها المختصر تماماً: المصليات · الأبواب · المعالم · المسارات · التسكين (وتسكينُ كلِّ نوع).
   الصفوفُ هي صفوفُ ذلك السجلّ نفسُها (Ps · Fs · Ls · Ds · صفوفُ الموظفين) — أفعالُها (إظهار المكان · التعديل · الإطفاء ·
   سجلُّ الحركة) دوالُّها نفسُها لا نسخٌ منها؛ والأعمدةُ تُقرأ من العنصر الخام الذي تحمله (olR) بالحساب الذي تحسبه الصفحة
   (التغطيةُ M · الاحتياجُ BassamNeed · المساحةُ والسعةُ areaOfZone/capOfZone · الأبوابُ الأم BassamLeaf.agg).
   و«آخر حركة» بصمةٌ من «سجل الحركة» القائم: آخرُ حدثٍ لكلِّ عنصرٍ في خطة الشهر وموقعه (من غيّر · يومُه بالهجري · الميلاديُّ والساعة). */
  _olIC() {
    return {
      pin: [
        "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",
        "M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
      ],
      door: [
        "M13 4h3a2 2 0 0 1 2 2v14M2 20h3M13 20h9M10 12v.01",
        "M13 2.5V20a2 2 0 0 1-2.437 1.953l-5-1.25A2 2 0 0 1 4 18.75V4.5a2 2 0 0 1 2.437-1.953l5 1.25A2 2 0 0 1 13 4.5",
      ],
      route: ["M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15", "M9 19a3 3 0 1 1-6 0 3 3 0 0 1 6 0"],
      users: [
        "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
        "M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
      ],
      layers: [
        "m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z",
        "m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65M22 17.65l-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65",
      ],
      tag: [
        "M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",
        "M7.5 7.5h.01",
      ],
      ruler: [
        "M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z",
        "m14.5 12.5 2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2",
      ],
      ucheck: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M16 11l2 2 4-4"],
      pie: [
        "M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z",
        "M21.21 15.89A10 10 0 1 1 8 2.83",
      ],
      power: ["M12 2v10", "M18.4 6.6a9 9 0 1 1-12.77.04"],
      hist: ["M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", "M3 3v5h5M12 7v5l4 2"],
      flag: ["M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z", "M4 22v-7"],
      clock: ["M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0", "M12 6v6l4 2"],
      arrows: ["M8 3 4 7l4 4M4 7h16", "m16 21 4-4-4-4M20 17H4"],
      dash: ["M3 12h4M10 12h4M17 12h4", "M3 18h18"],
      target: ["M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0", "M14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0M12 2v4M12 18v4M2 12h4M18 12h4"],
      edit: ["M12 20h9", "M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"],
      lines: ["M4 6h16", "M4 12h16M4 18h16"],
      pinplus: ["M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0", "M12 7v6M9 10h6"],
      /* R191: أيقوناتُ الأعمدة الجديدة — من أيقونات أبعاد المنصّة نفسِها (BassamMix.dimIcon وأبعاد المصليات) حيث وُجدت */
      yard: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z", ""],
      map: [
        "M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z",
        "M15 5.764v14.472",
      ],
      box: [
        "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
        "m3.3 7 8.7 5 8.7-5",
      ],
      cat: [
        "m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z",
        "m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65",
      ],
      grid: ["M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z", ""],
      pulse: [
        "M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",
        "",
      ],
      hash: ["M4 9h16M4 15h16", "M10 3 8 21M16 3l-2 18"],
      checks: ["m3 17 2 2 4-4", "m3 7 2 2 4-4M13 6h8M13 12h8M13 18h8"],
    };
  }
  /* أنماطُ شريط الأدوات والترقيم — دوالُّ الإحصائيات اليومية نفسُها (MBTN · MCHEV · PGBTN · PGNUM) */
  _olMBTN(on) {
    return (
      "height:34px;padding:0 12px;display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;font-family:'Cairo',sans-serif;border-radius:10px;cursor:pointer;transition:all .2s;box-sizing:border-box;border:1px solid " +
      (on
        ? "var(--bd-a185151810p45);background:var(--bg-a185151810p08);color:var(--fg-xb99751)"
        : "var(--bd-xe2e8f0);background:var(--bg-xffffff);color:var(--fg-x53565a)")
    );
  }
  _olMCHEV(on) {
    return "transition:transform .2s;flex-shrink:0;" + (on ? "transform:rotate(180deg)" : "");
  }
  _olPGBTN(dis) {
    return (
      "height:28px;min-width:28px;padding:0 7px;border:0;border-right:1px solid var(--bd-xe1e1e1);background:var(--bg-xffffff);font-family:'Cairo',sans-serif;font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;" +
      (dis ? "color:var(--fg-xcbd5e1);cursor:default" : "color:var(--fg-x53565a);cursor:pointer")
    );
  }
  _olPGNUM(cur) {
    return (
      "height:28px;min-width:28px;padding:0 7px;border:0;border-right:1px solid var(--bd-xe1e1e1);font-family:'Cairo',sans-serif;font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;cursor:pointer;" +
      (cur ? "background:var(--bg-a185151810p12);color:var(--fg-xb99751)" : "background:var(--bg-xffffff);color:var(--fg-x53565a)")
    );
  }
  /* خلايا السجل — أنماطُ خلايا الإحصائيات اليومية (VCELL · TD) */
  _olCell(o) {
    return Object.assign(
      {
        isTwo: !1,
        isShift: !1,
        isVal: !1,
        isTot: !1,
        isChip: !1,
        a: "",
        b: "",
        aDir: "rtl",
        bDir: "rtl",
        dot: "",
        v: "",
        vst: "",
        dir: "rtl",
        has: !1,
        sn: "",
        s1: "",
        s2: "",
        tip: "",
        namesOn: !1,
        names: [],
        moreOn: !1,
        more: "",
      },
      o,
    );
  }
  _olTwo(a, b, aDir, bDir) {
    return this._olCell({ isTwo: !0, a: String(a), b: String(b), aDir: aDir || "rtl", bDir: bDir || "rtl" });
  }
  _olVal(v, o) {
    o = o || {};
    return this._olCell(
      Object.assign(
        {
          isVal: !0,
          v: String(v),
          dir: o.dir || "rtl",
          vst: "font-size:12px;font-weight:400;color:var(--fg-x141414)" + (o.faint ? ";opacity:.4" : ""),
        },
        o.fp ? { has: !0, sn: o.fp.n, s1: o.fp.s1, s2: o.fp.s2, tip: o.fp.tip } : {},
        o.names
          ? {
              namesOn: o.names.length > 0,
              names: o.names.slice(0, 2).map((n) => ({ n: n })),
              moreOn: o.names.length > 2,
              more: "+" + (o.names.length - 2),
              tip: o.names.join("، "),
            }
          : {},
      ),
    );
  }
  _olTot(v, color, faint) {
    return this._olCell({
      isTot: !0,
      v: String(v),
      vst: "font-size:12.5px;font-weight:700;color:" + (color || "var(--fg-x8a6f35)") + (faint ? ";opacity:.4" : ""),
    });
  }
  _olChip(v, tone) {
    const T = {
      green: "background:var(--bg-a0163870p06);color:var(--fg-x047857);border:1px solid var(--bd-a0163870p35)",
      red: "background:var(--bg-a22038380p07);color:var(--fg-xb91c1c);border:1px solid var(--bd-a22038380p4)",
      amber: "background:var(--bg-a245158110p1);color:var(--fg-xb45309);border:1px solid var(--bd-a245158110p4)",
      violet: "background:#b25c8a14;color:#b25c8a;border:1px solid #b25c8a55",
    };
    return this._olCell({
      isChip: !0,
      v: String(v),
      vst:
        "display:inline-flex;align-items:center;border-radius:9999px;padding:3px 11px;font-size:10.5px;font-weight:600;font-family:'Cairo',sans-serif;white-space:nowrap;" +
        (T[tone] || T.green),
    });
  }
  /* R191: خليّةُ مُدخَلٍ نصّيّ (فارغُه «—» باهتاً) · وخليّةُ «الاحتياج لكل وردية»: الافتراضيُّ كما في المحرّر، وتحته «تخصيص لكل وردية» إن خُصِّص */
  _olTxt(v) {
    return this._olVal(v || "—", { faint: !v });
  }
  _olNS(el) {
    const s = el && el.needS;
    return s && "object" == typeof s ? Object.keys(s).filter((k) => null != s[k] && "" !== String(s[k])).length : 0;
  }
  _olNeed(n, nS) {
    return nS ? this._olTwo("" !== n ? n : "—", "تخصيص لكل وردية") : this._olVal("" !== n ? n : "—", { faint: "" === n });
  }
  /* الأولوية: شارةُ محرّر الباب والمعلم نفسُها (أ · ب · ج بألوانها) */
  _olPri(p) {
    const n = { أ: "#8A6F35", ب: "#53565a", ج: "#1668a1" }[p];
    return n
      ? this._olCell({
          isChip: !0,
          v: p,
          vst:
            "display:inline-flex;align-items:center;justify-content:center;min-width:26px;height:22px;border-radius:7px;font-size:12px;font-weight:700;font-family:'Cairo',sans-serif;border:1.5px solid " +
            n +
            ";background:" +
            n +
            "14;color:" +
            n,
        })
      : this._olVal("—", { faint: !0 });
  }
  _olShift(a, b, color) {
    return this._olCell({
      isShift: !0,
      a: String(a),
      b: String(b || ""),
      dot: "width:8px;height:8px;border-radius:9999px;flex-shrink:0;background:" + (color || "#cbd5e1"),
    });
  }
  _olTD(v, o) {
    o = o || {};
    return {
      v: String(v),
      dir: o.rtl ? "rtl" : "ltr",
      v2: String(o.v2 || ""),
      v2On: !!o.v2,
      style:
        "padding:11px 8px;text-align:center;font-size:" +
        (o.fs || "12px") +
        ";font-weight:" +
        (o.w || 400) +
        ";color:" +
        (o.c || "var(--fg-x141414)") +
        (o.nowrap ? ";white-space:nowrap" : "") +
        (o.faint ? ";opacity:.4" : ""),
    };
  }
  _olCovC(p) {
    return p >= 100 ? "#008450" : p >= 60 ? "#9A7E40" : "#dc2626";
  }
  _olNF(n) {
    return Number(n).toLocaleString("en-US");
  }
  /* بصمةُ «آخر حركة»: كبصمة المُدخِل في الإحصائيات اليومية (STX) — مَن · يومُه بالهجري · الميلاديُّ والساعة */
  _olStx(r) {
    if (!r || !r.ts) return null;
    const dt = new Date(+r.ts);
    if (isNaN(dt.getTime())) return null;
    let h = {};
    try {
      (
        this.__olHF ||
        (this.__olHF = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { year: "numeric", month: "numeric", day: "numeric" }))
      )
        .formatToParts(dt)
        .forEach((p) => {
          h[p.type] = +p.value;
        });
    } catch (e) {
      h = {};
    }
    const WD = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
      wd = WD[dt.getDay()] || "";
    let a = dt.getHours();
    const mi = dt.getMinutes(),
      ap = a >= 12 ? "م" : "ص";
    a %= 12;
    0 === a && (a = 12);
    const tm = String(a).padStart(2, "0") + ":" + String(mi).padStart(2, "0") + " " + ap,
      hs = h.day ? h.day + "/" + h.month + "/" + h.year : "—",
      gs = dt.getDate() + "/" + (dt.getMonth() + 1) + "/" + dt.getFullYear(),
      nm = String(r.name || r.un || "—"),
      act = this._olAct(r);
    return {
      act: act,
      n: nm,
      s1: wd + " " + hs,
      s2: gs + " · " + tm,
      tip: "آخر حركة: " + act + " — " + nm + " — يوم " + wd + " " + hs + " هـ الموافق " + gs + " م — الساعة " + tm,
      txt: act + " — " + nm + " — " + wd + " " + hs + " هـ — " + gs + " م " + tm,
    };
  }
  _olAct(r) {
    const M = {
      created: "إضافة",
      edited: "تعديل البيانات",
      geometry_changed: "تعديل الشكل",
      moved: "نقل الموضع",
      reassigned: "إعادة توزيع",
      enabled: "إعادة تفعيل",
      disabled: "تعطيل",
      status_changed: "تغيير الحالة",
      deleted: "حذف",
      approved: "اعتماد",
      approval_revoked: "إلغاء الاعتماد",
      locked: "إقفال",
      unlocked: "فتح",
      synced: "تحديث من الخطة",
      import: "استيراد",
      restore: "استعادة نسخة",
      bulk: "تغييرات كثيرة",
    };
    const a = (r && r.act) || "";
    if (M[a]) return M[a];
    try {
      const A = KIVO.BassamAudit;
      return (A && A.ACT_AR && A.ACT_AR[a]) || a || "—";
    } catch (e) {
      return a || "—";
    }
  }
  /* آخرُ حدثٍ لكلِّ عنصرٍ — استعلامٌ واحدٌ لكلِّ نوعٍ في خطة الشهر وموقعه (سجلُّ الحركة القائم). من لا يقرأ سجلَّ إدارته كاملاً
   (الخادمُ يردّ «forbidden») لا يُعرض له العمود — لا عمودَ فارغٌ مُلبِس. والذاكرةُ تُجدَّد بعد كل حفظٍ بمهلة (savePlan). */
  _olAudKey(et) {
    const s = this.state,
      fl = (s.floors || [])[s.floor || 0] || {};
    return et + "|" + this._mKey(s.year, s.month) + "|" + String(fl.name || "");
  }
  _olAudGet(et) {
    const k = this._olAudKey(et),
      C = this._olAudC || (this._olAudC = {}),
      e = C[k];
    if (e && e.busy) return e;
    if (e && !e.stale && Date.now() - e.t < 12e4) return e;
    const A = KIVO.BassamAudit,
      D = KIVO.BassamDepts;
    if (!A || !A.fetch || !D) return { no: !0 };
    const s = this.state,
      fl = (s.floors || [])[s.floor || 0] || {};
    C[k] = Object.assign({}, e || {}, { busy: 1, t: Date.now() });
    Promise.resolve(A.fetch({ dept: D.active(), etype: et, plan: this._mKey(s.year, s.month), site: String(fl.name || ""), limit: 200 }))
      .then((res) => {
        const m = {};
        ((res && res.rows) || []).forEach((r) => {
          r && r.eid && !m[r.eid] && (m[r.eid] = r);
        });
        C[k] = { t: Date.now(), rows: m, no: !(res && res.ok) && /403|forbidden/i.test(String((res && res.err) || "")) };
        this.setState((p) => ({ olAudTick: (p.olAudTick || 0) + 1 }));
      })
      .catch(() => {
        C[k] = { t: Date.now(), rows: {}, no: !1 };
      });
    return e || null;
  }
  _olAudStale() {
    const C = this._olAudC || {};
    Object.keys(C).forEach((k) => {
      C[k] && (C[k].stale = 1);
    });
    clearTimeout(this._olAudT);
    this._olAudT = setTimeout(() => {
      try {
        this.setState((p) => ({ olAudTick: (p.olAudTick || 0) + 1 }));
      } catch (e) {}
    }, 2500);
  }
  /* مكانُ العنصر: الخريطةُ فوق السجل — يُمرَّر إليها بعد التحديد */
  _olToMap() {
    try {
      const m = document.querySelector(".bs-mapcard");
      m && m.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {}
  }
  /* «ضعه على الخريطة»: العنصرُ المستورَد بلا موضع ينتظر في زاوية الخريطة — يُحدَّد ويُسحب إلى مكانه، وأوّلُ تحريكٍ يُسقط «بلا موضع» (savePlan) */
  _olPlace(v, i) {
    const t = "zones" === v ? "zone" : "gates" === v ? "gate" : "mark";
    this.flashSel({ t: t, i: i });
    this._olToMap();
    this.bsToast(
      "zone" === t
        ? "المصلى محدَّدٌ في زاوية الخريطة — اسحبه إلى مكانه، ثم اسحب رؤوسه لتعديل شكله"
        : "gate" === t
          ? "الباب محدَّدٌ في زاوية الخريطة — اسحبه إلى مكانه"
          : "المعلم محدَّدٌ في زاوية الخريطة — اسحبه إلى مكانه",
      "ok",
    );
  }
  /* R191: الجدولُ عنصرٌ واحدٌ تتبدّل أعمدتُه بتبويب السجل (١٤ للمصليات · ١٦ للأبواب · ٩ للمعالم · ١٠ للمسارات · ٦ للتسكين) — ومحرّكُ
   الجداول في المنصة يقرّر أدنى العرض والأعمدةَ المثبّتة مرّةً لكلّ جدول. فحين يتغيّر عددُ الأعمدة يُمحى قرارُه السابق ويُستدعى
   من جديد (طفرةٌ فارغة)، فيُحسب لكلّ تبويبٍ عرضُه وعمودُه المثبّت كأنه جدولٌ جديد. */
  _olResetTbl() {
    try {
      const t = document.querySelector("[data-op-log] table.bs-rtable");
      if (!t) return;
      t.style.removeProperty("min-width");
      t.removeAttribute("data-bsfz");
      t.querySelectorAll(".bs-fz").forEach((c) => c.classList.remove("bs-fz", "bs-fz1", "bs-fz2", "bs-fz3", "bs-fzkeep"));
      const n = document.createTextNode("");
      t.appendChild(n);
      t.removeChild(n);
    } catch (e) {}
  }
  _olEmpty() {
    return {
      olOn: !1,
      olOpen: !1,
      olChev: "",
      olToggle: () => {},
      olIc1: "",
      olIc2: "",
      olTitle: "",
      olCount: "",
      olSearch: "",
      olSetSearch: () => {},
      olSearchPh: "",
      olFilesOn: !1,
      olFilesToggle: () => {},
      olFilesBtnStyle: "",
      olFilesChev: "",
      olFilesOpen: !1,
      olCanExport: !1,
      olExport: () => {},
      olExpSub: "",
      olCanImport: !1,
      olImport: () => {},
      olPrint: () => {},
      olFsToggle: () => {},
      olFsBtnStyle: "",
      olFsLabel: "",
      olFsChev: "",
      olFsOpen: !1,
      olFsOpts: [],
      olHasRows: !1,
      olCols: [],
      olActOn: !1,
      olRows: [],
      olSpan: 1,
      olTotRow: [],
      olNoRows: !1,
      olEmptyT: "",
      olEmptyX: "",
      olFootOn: !1,
      olPgRange: "",
      olPgTotal: "",
      olPgTotalW: "",
      olPerPage: "50",
      olOnPerPage: () => {},
      olPgNums: [],
      olPgFirst: () => {},
      olPgPrev: () => {},
      olPgNext: () => {},
      olPgLast: () => {},
      olPgFirstStyle: "",
      olPgPrevStyle: "",
      olPgNextStyle: "",
      olPgLastStyle: "",
    };
  }
  _olVals(c) {
    try {
      return this._olBuild(c || {});
    } catch (e) {
      try {
        console.warn("R190 olVals", e);
      } catch (x) {}
      return this._olEmpty();
    }
  }
  _olBuild(c) {
    const s = this.state,
      self = this,
      C = KIVO.BassamCount,
      IC = this._olIC(),
      floors = s.floors || [],
      fl = floors[s.floor || 0] || null;
    if (!fl) return this._olEmpty();
    const site = String(fl.name || "").trim() || "موقع " + ((s.floor || 0) + 1),
      Y = c.Y,
      V = "dist" === Y || c.Ns ? "staff" : "gates" === Y ? "gates" : "marks" === Y ? "marks" : "paths" === Y ? "paths" : "zones";
    const title =
      ("dist" === Y
        ? "سجل التسكين"
        : "gates" === Y
          ? c.Ns
            ? "سجل تسكين الأبواب"
            : "سجل الأبواب"
          : "marks" === Y
            ? c.Ns
              ? "سجل تسكين المعالم"
              : "سجل المعالم"
            : "paths" === Y
              ? "سجل المسارات"
              : c.Ns
                ? "سجل تسكين المصليات"
                : "سجل المصليات") +
      " — " +
      site;
    /* الكتابةُ: الحفظُ في المنصة يحتاج «تعديل» أو «اعتماد» (savePlan) — والتعديلُ والإطفاءُ من السجل يحتاجان «تعديل» */
    const wr = this._plCanWrite() && !this.curApproved(),
      canSv = wr && (this.PC("edit") || this.PC("approve")),
      canEd = wr && this.PC("edit"),
      B = Array.isArray(c.B) ? c.B : [],
      y = c.y || [],
      A = c.A || {},
      NE = KIVO.BassamNeed,
      L = KIVO.BassamLeaf,
      mpu = +fl.mpu || 0;
    const et = { zones: "zone", gates: "gate", marks: "mark", paths: "path" }[V] || "",
      au = et ? this._olAudGet(et) : null,
      fpOn = !!et && !!(au && au.rows && !au.no),
      aud = (au && au.rows) || {};
    const FP = (eid) => {
      const r = eid && aud[eid],
        o = r ? this._olStx(r) : null;
      return o ? this._olVal(o.act, { fp: o }) : this._olVal("—", { faint: !0 });
    };
    /* R191: «آخر حركة» نصّاً في ملف Excel — الملفُّ بأعمدة السجل نفسِها (ولا يقرؤه الاستيراد) */
    const FPT = (eid) => {
      const r = eid && aud[eid],
        o = r ? this._olStx(r) : null;
      return o ? o.txt : "";
    };
    const NM = (m) => (m.need ? m.sch + " من " + m.need : String(m.emp.length));
    let M = [],
      cols = [],
      unit = "",
      onTxt = "",
      tot = [],
      fsList = [],
      srch = () => [],
      ic = IC.pin,
      emT = "",
      emX = "",
      exp = null;
    /* R191: أعمدةُ السجل تطابق مدخلاتِ محرّر العنصر — عمودٌ لكلّ مُدخَل بترتيب المحرّر (بطلب المستخدم: «المدخلات المفترض تطابق مع قوائم السجل»)،
     ثم المحسوبُ منه: المسكَّنون · التغطية · الحالة · آخر حركة · إجراءات. وملفُّ Excel المُصدَّر بأعمدة السجل نفسِها. */
    if ("zones" === V) {
      unit = "مصلى";
      ic = IC.pin;
      M = B.map((r) => {
        const z = r.olR || {},
          emp = (z.emp || []).filter(Boolean).map((t) => this._nm(t)),
          off = !!z.off,
          unp = !!z.unp,
          need = NE && NE.has(z, y) ? NE.tot(z, y) : 0,
          sch = emp.filter((n) => A[n]).length,
          cov = c.M ? c.M(z) : null,
          area = this.areaOfZone(z, mpu),
          cap = this.capOfZone(z, mpu);
        return {
          r: r,
          idx: r.olI,
          eid: z.eid || "",
          off: off,
          unp: unp,
          need: need,
          nN: null == z.needN ? "" : String(z.needN),
          nS: this._olNS(z),
          emp: emp,
          sch: sch,
          cov: off ? null : cov,
          area: area,
          cap: cap,
          code: String(z.code || "").trim(),
          yard: String(z.yard || "").trim(),
          region: String(z.region || "").trim(),
          level: String(z.level || "").trim(),
          ztype: String(z.ztype || "").trim(),
          zcat: String(z.zcat || "").trim(),
          pri: "أ" === z.pri || "ب" === z.pri || "ج" === z.pri ? z.pri : "",
        };
      });
      cols = [
        ["رمز المصلى", IC.pin],
        ["الساحة", IC.yard],
        ["المنطقة", IC.map],
        ["الدور / المستوى", IC.layers],
        ["النوع", IC.box],
        ["الفئة", IC.tag],
        ["المساحة والسعة", IC.ruler],
        ["أولوية التغطية", IC.flag],
        ["الاحتياج لكل وردية", IC.clock],
        ["المسكَّنون", IC.ucheck],
        ["التغطية", IC.pie],
        ["الحالة", IC.power],
      ];
      srch = (m) => [m.code, "#" + m.code, m.yard, m.region, m.level, m.ztype, m.zcat].concat(m.emp);
      fsList = [
        ["all", "كل المصليات", () => !0],
        ["on", "المفعّلة", (m) => !m.off && !m.unp],
        ["off", "المعطّلة", (m) => m.off],
        ["short", "ناقصة التسكين", (m) => !m.off && m.need > 0 && m.sch < m.need],
      ].concat(M.some((m) => m.unp) ? [["unp", "بلا موضع", (m) => m.unp]] : []);
      M.forEach((m) => {
        m.cells = [
          this._olVal(m.code ? "#" + m.code : "مصلى", { dir: "ltr" }),
          this._olTxt(m.yard),
          this._olTxt(m.region),
          this._olTxt(m.level),
          this._olTxt(m.ztype),
          this._olTxt(m.zcat),
          m.area > 0
            ? this._olTwo(this._olNF(m.area) + " م²", null != m.cap ? C(this._olNF(m.cap), "مصل") : "بلا سعة")
            : this._olVal("بلا مساحة", { faint: !0 }),
          this._olPri(m.pri),
          this._olNeed(m.nN, m.nS),
          this._olVal(m.off ? "—" : NM(m), { faint: m.off, names: m.emp }),
          this._olTot(null == m.cov ? "—" : m.cov + "٪", null == m.cov ? null : this._olCovC(m.cov), null == m.cov),
          m.unp ? this._olChip("بلا موضع", "amber") : m.off ? this._olChip("معطّلة", "red") : this._olChip("مفعّلة", "green"),
        ].concat(fpOn ? [FP(m.eid)] : []);
      });
      onTxt = M.filter((m) => !m.off && !m.unp).length + " مفعّلة";
      emT = "لا توجد مصليات في «" + site + "» بعد";
      emX = "ارسمها على الخريطة أعلاه — أو استوردها من Excel من «ملفات»";
      tot = (S) => {
        const ar = S.reduce((a, m) => a + (m.area > 0 ? m.area : 0), 0),
          cp = S.reduce((a, m) => a + (m.cap > 0 ? m.cap : 0), 0),
          act = S.filter((m) => !m.off),
          nd = act.reduce((a, m) => a + m.need, 0),
          pc = nd ? Math.round((100 * act.reduce((a, m) => a + m.sch, 0)) / nd) : null,
          nOff = S.filter((m) => m.off).length,
          nUnp = S.filter((m) => m.unp).length;
        return [
          this._olTD("الإجمالي", { rtl: !0, w: 700, c: "var(--fg-x8a6f35)", nowrap: !0 }),
          this._olTD(""),
          this._olTD(""),
          this._olTD(""),
          this._olTD(""),
          this._olTD(""),
          ar > 0
            ? this._olTD(this._olNF(ar) + " م²", { rtl: !0, w: 700, nowrap: !0, v2: cp > 0 ? C(this._olNF(cp), "مصل") : "" })
            : this._olTD(""),
          this._olTD(""),
          this._olTD(""),
          this._olTD(nd ? act.reduce((a, m) => a + m.sch, 0) + " من " + nd : String(act.reduce((a, m) => a + m.emp.length, 0)), {
            rtl: !0,
            w: 700,
            nowrap: !0,
          }),
          this._olTD(null == pc ? "—" : pc + "٪", { w: 700, c: null == pc ? null : this._olCovC(pc), fs: "12.5px" }),
          this._olTD(S.filter((m) => !m.off && !m.unp).length + " مفعّلة", {
            rtl: !0,
            w: 700,
            nowrap: !0,
            v2: nOff + " معطّلة" + (nUnp ? " - " + nUnp + " بلا موضع" : ""),
          }),
        ].concat(fpOn ? [this._olTD("")] : []);
      };
      exp = {
        name: "المصليات",
        head: [
          "رمز المصلى",
          "الساحة",
          "المنطقة",
          "الدور / المستوى",
          "النوع",
          "الفئة",
          "المساحة م²",
          "السعة",
          "أولوية التغطية",
          "الاحتياج لكل وردية",
          "المسكَّنون",
          "التغطية",
          "الحالة",
        ],
        row: (m) => [
          m.code,
          m.yard,
          m.region,
          m.level,
          m.ztype,
          m.zcat,
          m.area > 0 ? Math.round(m.area) : "",
          null != m.cap ? m.cap : "",
          m.pri,
          m.nN,
          m.emp.join("، "),
          null == m.cov ? "" : m.cov + "٪",
          m.off ? "معطّلة" : m.unp ? "بلا موضع" : "مفعّلة",
        ],
      };
    } else if ("gates" === V) {
      unit = "باب";
      ic = IC.door;
      const lAll = Array.isArray(c.l) ? c.l : [];
      M = B.map((r) => {
        const g = r.olR || {},
          par = !(!L || !L.isParent) && L.isParent(g),
          ag =
            L && L.agg
              ? L.agg(lAll, g, y, (n) => !!A[n])
              : { n: 1, open: g.closed ? 0 : 1, need: NE ? NE.tot(g, y) : 0, plc: (g.emp || []).filter((n) => A[n]).length },
          kids = par && L.leavesOf ? L.leavesOf(lAll, g) : [g],
          emp = kids.reduce((a, k) => a.concat(((k && k.emp) || []).filter(Boolean).map((t) => this._nm(t))), []),
          closed = L && L.closedOf ? L.closedOf(lAll, g) : !!g.closed;
        return {
          r: r,
          idx: r.olI,
          eid: g.eid || "",
          par: par,
          nN: par || null == g.needN ? "" : String(g.needN),
          nS: par ? 0 : this._olNS(g),
          uni: par && L && L.uniNeedOf ? String(L.uniNeedOf(lAll, g)) : "",
          nAll: ag.n,
          nOpen: ag.open,
          nLeaf: par ? ag.n : 1,
          closed: closed,
          unp: !!g.unp,
          need: ag.need,
          sch: ag.plc,
          emp: emp,
          cov: closed || !ag.need ? null : Math.round((100 * ag.plc) / ag.need),
          num: String(null == g.num ? "" : g.num).trim(),
          label: String(g.label || "").trim() || "باب",
          gtype: String(g.gtype || "").trim(),
          loc: String(g.loc || "").trim(),
          kind: String(g.kind || "").trim(),
          route: String(g.route || "").trim(),
          cls: String(g.cls || "").trim(),
          cats: (Array.isArray(g.cats) ? g.cats : []).map((x) => String(x || "").trim()).filter(Boolean),
          pri: "أ" === g.pri || "ب" === g.pri || "ج" === g.pri ? g.pri : "",
        };
      });
      cols = [
        ["رقم الباب", IC.hash],
        ["اسم الباب", IC.door],
        ["النوع", IC.box],
        ["الموقع", IC.yard],
        ["الفئة", IC.tag],
        ["المسار", IC.route],
        ["التصنيف", IC.cat],
        ["التخصيص", IC.checks],
        ["أولوية التغطية", IC.flag],
        ["عدد الأبواب", IC.grid],
        ["الاحتياج لكل وردية", IC.clock],
        ["المسكَّنون", IC.ucheck],
        ["التغطية", IC.pie],
        ["الحالة", IC.power],
      ];
      srch = (m) => [m.num, "#" + m.num, m.label, m.gtype, m.loc, m.kind, m.route, m.cls].concat(m.cats, m.emp);
      fsList = [
        ["all", "كل الأبواب", () => !0],
        ["open", "المفتوحة", (m) => !m.closed && !m.unp],
        ["closed", "المغلقة", (m) => m.closed],
        ["short", "ناقصة التسكين", (m) => !m.closed && m.need > 0 && m.sch < m.need],
      ].concat(M.some((m) => m.unp) ? [["unp", "بلا موضع", (m) => m.unp]] : []);
      M.forEach((m) => {
        m.cells = [
          this._olVal(m.num ? "#" + m.num : "—", { dir: "ltr", faint: !m.num }),
          this._olVal(m.label),
          this._olTxt(m.gtype),
          this._olTxt(m.loc),
          this._olTxt(m.kind),
          this._olTxt(m.route),
          this._olTxt(m.cls),
          this._olTxt(m.cats.join("، ")),
          this._olPri(m.pri),
          this._olVal(C(m.nLeaf, "باب")),
          m.par ? ("" !== m.uni ? this._olTwo(m.uni, "لكل فتحة") : this._olTwo("—", "يختلف بين الفتحات")) : this._olNeed(m.nN, m.nS),
          this._olVal(m.closed ? "—" : NM(m), { faint: m.closed, names: m.emp }),
          this._olTot(null == m.cov ? "—" : m.cov + "٪", null == m.cov ? null : this._olCovC(m.cov), null == m.cov),
          m.unp
            ? this._olChip("بلا موضع", "amber")
            : m.closed
              ? this._olChip("مغلق", "red")
              : m.par && m.nOpen < m.nAll
                ? this._olChip("مفتوح " + m.nOpen + " من " + m.nAll, "amber")
                : this._olChip("مفتوح", "green"),
        ].concat(fpOn ? [FP(m.eid)] : []);
      });
      onTxt = M.filter((m) => !m.closed && !m.unp).length + " مفتوحة";
      emT = "لا توجد أبواب في «" + site + "» بعد";
      emX = "ضعها على الخريطة أعلاه بأداة «وضع باب» — أو استوردها من Excel من «ملفات»";
      tot = (S) => {
        const act = S.filter((m) => !m.closed),
          nd = act.reduce((a, m) => a + m.need, 0),
          sc = act.reduce((a, m) => a + m.sch, 0),
          pc = nd ? Math.round((100 * sc) / nd) : null;
        return [
          this._olTD("الإجمالي", { rtl: !0, w: 700, c: "var(--fg-x8a6f35)", nowrap: !0 }),
          this._olTD(""),
          this._olTD(""),
          this._olTD(""),
          this._olTD(""),
          this._olTD(""),
          this._olTD(""),
          this._olTD(""),
          this._olTD(""),
          this._olTD(""),
          this._olTD(""),
          this._olTD(nd ? sc + " من " + nd : String(act.reduce((a, m) => a + m.emp.length, 0)), { rtl: !0, w: 700, nowrap: !0 }),
          this._olTD(null == pc ? "—" : pc + "٪", { w: 700, c: null == pc ? null : this._olCovC(pc), fs: "12.5px" }),
          this._olTD(S.filter((m) => !m.closed && !m.unp).length + " مفتوحة", {
            rtl: !0,
            w: 700,
            nowrap: !0,
            v2: S.filter((m) => m.closed).length + " مغلقة",
          }),
        ].concat(fpOn ? [this._olTD("")] : []);
      };
      exp = {
        name: "الأبواب",
        head: [
          "رقم الباب",
          "اسم الباب",
          "النوع",
          "الموقع",
          "الفئة",
          "المسار",
          "التصنيف",
          "التخصيص",
          "أولوية التغطية",
          "عدد الأبواب",
          "الاحتياج لكل وردية",
          "المسكَّنون",
          "التغطية",
          "الحالة",
        ],
        row: (m) => [
          m.num,
          m.label,
          m.gtype,
          m.loc,
          m.kind,
          m.route,
          m.cls,
          m.cats.join("، "),
          m.pri,
          m.nLeaf,
          m.nN,
          m.emp.join("، "),
          null == m.cov ? "" : m.cov + "٪",
          m.unp ? "بلا موضع" : m.closed ? "مغلق" : "مفتوح",
        ],
      };
    } else if ("marks" === V) {
      unit = "معلم";
      ic = IC.pin;
      M = B.map((r) => {
        const k = r.olR || {},
          emp = (k.emp || []).filter(Boolean).map((t) => this._nm(t)),
          off = !!k.off,
          need = NE && NE.has(k, y) ? NE.tot(k, y) : 0,
          sch = emp.filter((n) => A[n]).length,
          cov = off ? null : c.M ? c.M(k) : need ? Math.round((100 * sch) / need) : null;
        return {
          r: r,
          idx: r.olI,
          eid: k.eid || "",
          off: off,
          unp: !!k.unp,
          need: need,
          nN: null == k.needN ? "" : String(k.needN),
          nS: this._olNS(k),
          emp: emp,
          sch: sch,
          cov: cov,
          label: String(k.label || "").trim() || "معلم",
          kind: String(k.kind || "").trim(),
          pri: "أ" === k.pri || "ب" === k.pri || "ج" === k.pri ? k.pri : "",
        };
      });
      cols = [
        ["اسم المعلم", IC.pin],
        ["النوع", IC.tag],
        ["أولوية التغطية", IC.flag],
        ["الاحتياج لكل وردية", IC.clock],
        ["المسكَّنون", IC.ucheck],
        ["التغطية", IC.pie],
        ["الحالة", IC.power],
      ];
      srch = (m) => [m.label, m.kind].concat(m.emp);
      fsList = [
        ["all", "كل المعالم", () => !0],
        ["on", "المفعّلة", (m) => !m.off && !m.unp],
        ["off", "المعطّلة", (m) => m.off],
        ["short", "ناقصة التسكين", (m) => !m.off && m.need > 0 && m.sch < m.need],
      ].concat(M.some((m) => m.unp) ? [["unp", "بلا موضع", (m) => m.unp]] : []);
      M.forEach((m) => {
        m.cells = [
          this._olVal(m.label),
          this._olVal(m.kind || "بلا نوع", { faint: !m.kind }),
          this._olPri(m.pri),
          this._olNeed(m.nN, m.nS),
          this._olVal(m.off ? "—" : NM(m), { faint: m.off, names: m.emp }),
          this._olTot(null == m.cov ? "—" : m.cov + "٪", null == m.cov ? null : this._olCovC(m.cov), null == m.cov),
          m.unp ? this._olChip("بلا موضع", "amber") : m.off ? this._olChip("معطّل", "red") : this._olChip("مفعّل", "green"),
        ].concat(fpOn ? [FP(m.eid)] : []);
      });
      onTxt = M.filter((m) => !m.off && !m.unp).length + " مفعّلة";
      emT = "لا توجد معالم في «" + site + "» بعد";
      emX = "ضعها على الخريطة أعلاه بأداة «وضع معلم» — أو استوردها من Excel من «ملفات»";
      tot = (S) => {
        const act = S.filter((m) => !m.off),
          nd = act.reduce((a, m) => a + m.need, 0),
          sc = act.reduce((a, m) => a + m.sch, 0),
          pc = nd ? Math.round((100 * sc) / nd) : null;
        return [
          this._olTD("الإجمالي", { rtl: !0, w: 700, c: "var(--fg-x8a6f35)", nowrap: !0 }),
          this._olTD(""),
          this._olTD(""),
          this._olTD(""),
          this._olTD(nd ? sc + " من " + nd : String(act.reduce((a, m) => a + m.emp.length, 0)), { rtl: !0, w: 700, nowrap: !0 }),
          this._olTD(null == pc ? "—" : pc + "٪", { w: 700, c: null == pc ? null : this._olCovC(pc), fs: "12.5px" }),
          this._olTD(S.filter((m) => !m.off && !m.unp).length + " مفعّلة", {
            rtl: !0,
            w: 700,
            nowrap: !0,
            v2: S.filter((m) => m.off).length + " معطّلة",
          }),
        ].concat(fpOn ? [this._olTD("")] : []);
      };
      exp = {
        name: "المعالم",
        head: ["اسم المعلم", "النوع", "أولوية التغطية", "الاحتياج لكل وردية", "المسكَّنون", "التغطية", "الحالة"],
        row: (m) => [
          m.label,
          m.kind,
          m.pri,
          m.nN,
          m.emp.join("، "),
          null == m.cov ? "" : m.cov + "٪",
          m.unp ? "بلا موضع" : m.off ? "معطّل" : "مفعّل",
        ],
      };
    } else if ("paths" === V) {
      unit = "مسار";
      ic = IC.route;
      const mt = c.mt || {},
        kt = Array.isArray(c.kt) ? c.kt : [],
        xt = Array.isArray(c.xt) ? c.xt : [];
      M = B.map((r) => {
        const p = r.olR || {},
          ty = mt[p.type] || mt.in || {},
          ln = kt.find((e) => e[0] === (p.line || "dash")) || kt[1] || ["", ""],
          wd = xt.find((e) => e[0] === (p.w || "thin")) || xt[0] || ["", ""];
        return {
          r: r,
          idx: r.olI,
          eid: p.id || "",
          on: !1 !== p.active,
          code: String(p.code || "").trim(),
          name: String(p.name || "").trim() || "مسار",
          type: String(ty.label || ""),
          line: String(ln[1] || ""),
          width: String(wd[1] || ""),
          dir: "two" === p.dir ? "اتجاهان" : "اتجاه واحد",
          anim: !1 !== p.anim ? "متحرك" : "ساكن",
        };
      });
      cols = [
        ["اسم المسار", IC.route],
        ["الرمز", IC.hash],
        ["النوع", IC.tag],
        ["شكل الخط", IC.dash],
        ["سماكة الخط", IC.ruler],
        ["اتجاه الحركة", IC.arrows],
        ["حركة التدفق", IC.pulse],
        ["الحالة", IC.power],
      ];
      srch = (m) => [m.code, m.name, m.type, m.line, m.width, m.dir, m.anim];
      fsList = [
        ["all", "كل المسارات", () => !0],
        ["on", "المفعّلة", (m) => m.on],
        ["off", "المعطّلة", (m) => !m.on],
      ];
      M.forEach((m) => {
        m.cells = [
          this._olVal(m.name),
          this._olVal(m.code || "—", { dir: "ltr", faint: !m.code }),
          this._olTxt(m.type),
          this._olTxt(m.line),
          this._olTxt(m.width),
          this._olVal(m.dir),
          this._olVal(m.anim),
          m.on ? this._olChip("مفعّل", "green") : this._olChip("معطّل", "red"),
        ].concat(fpOn ? [FP(m.eid)] : []);
      });
      onTxt = M.filter((m) => m.on).length + " مفعّلة";
      emT = "لا توجد مسارات في «" + site + "» بعد";
      emX = "ارسمها على الخريطة أعلاه بأداة «رسم مسار»";
      tot = (S) =>
        [
          this._olTD("الإجمالي", { rtl: !0, w: 700, c: "var(--fg-x8a6f35)", nowrap: !0 }),
          this._olTD(""),
          this._olTD(""),
          this._olTD(""),
          this._olTD(""),
          this._olTD(""),
          this._olTD(""),
          this._olTD(S.filter((m) => m.on).length + " مفعّلة", {
            rtl: !0,
            w: 700,
            nowrap: !0,
            v2: S.filter((m) => !m.on).length + " معطّلة",
          }),
        ].concat(fpOn ? [this._olTD("")] : []);
      exp = {
        name: "المسارات",
        head: ["اسم المسار", "الرمز", "النوع", "شكل الخط", "سماكة الخط", "اتجاه الحركة", "حركة التدفق", "الحالة"],
        row: (m) => [m.name, m.code, m.type, m.line, m.width, m.dir, m.anim, m.on ? "مفعّل" : "معطّل"],
      };
    } else {
      unit = "موظف";
      ic = IC.users;
      const tF = (t) => {
        const x = String(t || "").match(/^(\d{1,2}):(\d{2})/);
        if (!x) return "";
        let h = +x[1];
        const ap = h >= 12 ? "م" : "ص";
        h %= 12;
        0 === h && (h = 12);
        return String(h).padStart(2, "0") + ":" + x[2] + " " + ap;
      };
      M = B.map((r) => {
        const e = r.olE || {},
          sh = String(r.olSh || ""),
          o = y.find((t) => t && t.name === sh) || null,
          at = r.olAt || null,
          st = r.olPl ? "on" : r.olOt ? "other" : r.olRs ? "rest" : "none";
        return {
          r: r,
          key: e.eid || e.name || "",
          name: String(e.name || ""),
          sh: sh,
          shColor: (o && o.color) || "#cbd5e1",
          shTime: o && o.tStart && o.tEnd ? tF(o.tStart) + " – " + tF(o.tEnd) : "",
          place: String(r.olPl || ""),
          at: at,
          st: st,
          rest: !!r.olRs,
        };
      });
      cols = [
        ["الموظف", IC.users],
        ["الوردية", IC.clock],
        ["مكان التسكين", IC.pin],
        ["النوع", IC.tag],
        ["الحالة", IC.ucheck],
      ];
      srch = (m) => [m.name, m.sh, m.place];
      fsList = [
        ["all", "كل الموظفين", () => !0],
        ["on", "المسكَّنون", (m) => "on" === m.st],
        ["none", "غير المسكَّنين", (m) => "none" === m.st],
        ["rest", "في راحة اليوم", (m) => m.rest],
      ];
      M.forEach((m) => {
        m.cells = [
          m.rest ? this._olTwo(m.name, "في راحة اليوم") : this._olVal(m.name),
          m.sh ? this._olShift(m.sh, m.shTime, m.shColor) : this._olVal("بدون وردية", { faint: !0 }),
          this._olVal(m.place || "—", { faint: !m.place }),
          this._olVal(m.at ? ("zone" === m.at.t ? "مصلى" : "gate" === m.at.t ? "باب" : "معلم") : "—", { faint: !m.at }),
          "on" === m.st
            ? this._olChip("مسكَّن", "green")
            : "other" === m.st
              ? this._olChip("مسكَّن على نوعٍ آخر", "violet")
              : "rest" === m.st
                ? this._olChip("في راحة اليوم", "amber")
                : this._olChip("غير مسكَّن", "red"),
        ];
      });
      onTxt = C(M.filter((m) => "on" === m.st).length, ["مسكَّن واحد", "مسكَّنان", "مسكَّنَين", "مسكَّنين", "مسكَّناً", "مسكَّن"]);
      emT = "لا يوجد موظفون في جدول الشهر";
      emX = "أضف الموظفين ووزّعهم على الورديات من «الجدول الشهري» أولاً";
      tot = (S) => [
        this._olTD("الإجمالي", { rtl: !0, w: 700, c: "var(--fg-x8a6f35)", nowrap: !0 }),
        this._olTD(""),
        this._olTD(""),
        this._olTD(""),
        this._olTD(C(S.filter((m) => "on" === m.st).length, ["مسكَّن واحد", "مسكَّنان", "مسكَّنَين", "مسكَّنين", "مسكَّناً", "مسكَّن"]), {
          rtl: !0,
          w: 700,
          nowrap: !0,
          v2: S.filter((m) => "none" === m.st).length + " غير مسكَّن - " + S.filter((m) => m.rest).length + " في راحة اليوم",
        }),
      ];
      exp = {
        name: "التسكين",
        head: ["الموظف", "الوردية", "مكان التسكين", "النوع", "الحالة"],
        row: (m) => [
          m.name,
          m.sh,
          m.place,
          m.at ? ("zone" === m.at.t ? "مصلى" : "gate" === m.at.t ? "باب" : "معلم") : "",
          "on" === m.st ? "مسكَّن" : "other" === m.st ? "مسكَّن على نوعٍ آخر" : "rest" === m.st ? "في راحة اليوم" : "غير مسكَّن",
        ],
      };
    }
    if (fpOn && "staff" !== V) cols = cols.concat([["آخر حركة", IC.hist]]);
    /* الفلترةُ والصفحةُ تخصّان نوعَ السجل — تبديلُ التبويب يبدأ بالكل وبالصفحة الأولى */
    const fsCur = String(s.olFs || "").indexOf(V + "|") === 0 ? String(s.olFs).slice(V.length + 1) : "all",
      FS = fsList.filter((f) => f[0] === fsCur)[0] || fsList[0];
    const q = String(s.olQ || "").trim();
    let S = M.filter(FS[2]);
    if (q) {
      const F = KIVO.BassamFind;
      S = F && F.filter ? F.filter(q, S, srch) : S.filter((m) => srch(m).join(" ").indexOf(q) >= 0);
    }
    const per = null == s.olPer ? 50 : +s.olPer,
      total = S.length,
      pages = per > 0 ? Math.max(1, Math.ceil(total / per)) : 1,
      pg0 = String(s.olPg || "").indexOf(V + "|") === 0 ? +String(s.olPg).slice(V.length + 1) || 1 : 1,
      page = Math.min(pages, Math.max(1, pg0)),
      from = per > 0 ? (page - 1) * per : 0,
      to = per > 0 ? Math.min(total, from + per) : total;
    const setPg = (n) => () => this.setState({ olPg: V + "|" + n, olRowMenu: null });
    const nums = [],
      push = (n) => nums.push({ dots: !1, plain: !0, label: String(n), style: this._olPGNUM(n === page), click: setPg(n) });
    if (pages <= 7) for (let i = 1; i <= pages; i++) push(i);
    else {
      push(1);
      page > 3 && nums.push({ dots: !0, plain: !1, label: "", style: "", click: () => {} });
      for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) push(i);
      page < pages - 2 && nums.push({ dots: !0, plain: !1, label: "", style: "", click: () => {} });
      push(pages);
    }
    const rows = S.slice(from, to).map((m) => {
      const r = m.r || {},
        key = V + ":" + (m.eid || m.key || m.idx),
        items = [];
      if ("staff" !== V) {
        m.unp
          ? items.push({
              name: "ضعه على الخريطة",
              p1: IC.pinplus[0],
              p2: IC.pinplus[1],
              color: "#b99751",
              run: () => this._olPlace(V, m.idx),
            })
          : r.act &&
            items.push({
              name: r.actTitle || "إظهار مكانه على الخريطة",
              p1: IC.target[0],
              p2: IC.target[1],
              run: () => {
                (r.act(), this._olToMap());
              },
            });
        canEd &&
          !1 !== r.canAct &&
          r.canEdit &&
          r.edit &&
          items.push({ name: "تعديل البيانات", p1: IC.edit[0], p2: IC.edit[1], color: "#b99751", run: () => r.edit() });
        canEd &&
          !1 !== r.canAct &&
          r.toggleOff &&
          items.push({
            name: r.toggleTitle || "",
            p1: IC.power[0],
            p2: IC.power[1],
            color: r.onNow ? "#16a34a" : "#94a3b8",
            run: () => r.toggleOff(),
          });
        r.histHas && items.push({ name: "سجل الحركة", p1: IC.lines[0], p2: IC.lines[1], run: () => r.histTog() });
      } else
        m.at &&
          r.act &&
          items.push({
            name: r.actTitle || "إظهار مكان تكليفه على الخريطة",
            p1: IC.target[0],
            p2: IC.target[1],
            run: () => {
              (r.act(), this._olToMap());
            },
          });
      const open = s.olRowMenu === key;
      return {
        key: key,
        cells: m.cells,
        histOn: !!r.histOn,
        histRows: r.histRows || [],
        histHead: r.histHead || "سجل الحركة",
        histEmpty: !!r.histEmpty,
        rmHas: items.length > 0,
        rmOpen: open,
        rmTitle: "staff" === V ? "إجراءات هذا الموظف" : "إجراءات هذا العنصر",
        rmToggle: (e) => {
          (e && e.stopPropagation && e.stopPropagation(),
            this.setState((p) => ({ olRowMenu: p.olRowMenu === key ? null : key, olFilesOpen: !1, olFsOpen: !1 })));
        },
        rmBtnStyle:
          "width:28px;height:28px;border-radius:8px;cursor:pointer;padding:0;display:inline-flex;align-items:center;justify-content:center;transition:all .15s;border:1px solid " +
          (open
            ? "#b99751;background:var(--bg-a185151810p1);color:var(--fg-x8a6f35)"
            : "#E1E1E1;background:var(--bg-xffffff);color:var(--fg-x64748b)"),
        rmItems: items.map((t) => ({
          name: t.name,
          p1: t.p1,
          p2: t.p2,
          run: (e) => {
            (e && e.stopPropagation && e.stopPropagation(), this.setState({ olRowMenu: null }), t.run && t.run());
          },
          style:
            "width:30px;height:30px;border-radius:9px;cursor:pointer;padding:0;display:inline-flex;align-items:center;justify-content:center;transition:all .15s;background:var(--bg-xffffff);border:1px solid #EEF0F2;color:" +
            (t.color || "var(--fg-x53565a)"),
        })),
      };
    });
    /* R191: القائمةُ المنسدلة مغلقةٌ افتراضاً ولا تُفتح إلا بيد المستخدم (قاعدةُ المنصّة بطلب المستخدم) */
    const actOn = rows.some((r) => r.rmHas),
      open = !!s.olOpen,
      olTk = V + "|" + cols.length + "|" + (actOn ? 1 : 0),
      olTk0 = this._olTk;
    olTk0 !== olTk && ((this._olTk = olTk), null != olTk0 && setTimeout(() => this._olResetTbl(), 0));
    const canExp = this.PC("export"),
      canImp = ["zones", "gates", "marks"].indexOf(V) >= 0 && canSv && (this.PC("add") || this.PC("edit"));
    const pr = C.pair("olPgTotal", String(total), unit, "g");
    return Object.assign(
      {
        olOn: !0,
        olOpen: open,
        olChev: this._olMCHEV(open),
        olToggle: () => this.setState((p) => ({ olOpen: !p.olOpen, olFilesOpen: !1, olFsOpen: !1, olRowMenu: null })),
        olIc1: ic[0],
        olIc2: ic[1],
        olTitle: title,
        olCount: C(M.length, unit) + " · " + onTxt,
        olSearch: s.olQ || "",
        olSetSearch: (e) => this.setState({ olQ: e && e.target ? e.target.value : "", olPg: V + "|1" }),
        olSearchPh:
          "zones" === V
            ? "بحث بالرمز أو المنطقة أو النوع أو اسم المسكَّن..."
            : "gates" === V
              ? "بحث برقم الباب أو اسمه أو الموقع أو اسم المسكَّن..."
              : "marks" === V
                ? "بحث باسم المعلم أو نوعه أو اسم المسكَّن..."
                : "paths" === V
                  ? "بحث برمز المسار أو اسمه أو نوعه..."
                  : "بحث باسم الموظف أو مكان تسكينه أو ورديته...",
        olFilesOpen: !!s.olFilesOpen,
        olFilesChev: this._olMCHEV(!!s.olFilesOpen),
        olFilesBtnStyle: this._olMBTN(!!s.olFilesOpen),
        olFilesToggle: () => {
          const on = !this.state.olFilesOpen;
          this.setState({ olFilesOpen: on, olFsOpen: !1, olRowMenu: null });
        },
        olFilesOn: canExp || canImp,
        olCanExport: canExp,
        olExpSub:
          ["zones", "gates", "marks"].indexOf(V) >= 0
            ? exp.name + " «" + site + "» — الملفُ نفسُه يصلح للاستيراد"
            : exp.name + " «" + site + "»",
        olExport: () => {
          if (!this.PC("export")) return void this.permDeny();
          this.setState({ olFilesOpen: !1 });
          const fpX = fpOn && "staff" !== V,
            aoa = [exp.head.concat(fpX ? ["آخر حركة"] : [])].concat(M.map((m) => exp.row(m).concat(fpX ? [FPT(m.eid)] : [])));
          try {
            KIVO.BassamXLSX.download(
              aoa,
              "سجل-" + exp.name + "-" + site + "-" + (this.MONTHS[s.month - 1] || s.month) + "-" + s.year + "هـ.xlsx",
            );
          } catch (e) {
            return void this.bsToast("تعذّر تجهيز ملف Excel", "err");
          }
          this.bsToast(
            "صُدِّر " + C(M.length, unit, "g") + (["zones", "gates", "marks"].indexOf(V) >= 0 ? " — الأعمدةُ نفسُها تصلح للاستيراد" : ""),
            "ok",
          );
        },
        olCanImport: canImp,
        olImport: () => this._olImport(V, site),
        olPrint: () => {
          if (!this.PC("export")) return void this.permDeny();
          this.setState({ olFilesOpen: !1, olRowMenu: null });
          setTimeout(() => {
            const b = document.body;
            try {
              b.classList.add("bs-print-oplog");
              const off = () => {
                (b.classList.remove("bs-print-oplog"), window.removeEventListener("afterprint", off));
              };
              (window.addEventListener("afterprint", off), window.print(), setTimeout(off, 1500));
            } catch (e) {
              b.classList.remove("bs-print-oplog");
            }
          }, 150);
        },
        olFsOpen: !!s.olFsOpen,
        olFsChev: this._olMCHEV(!!s.olFsOpen),
        olFsBtnStyle: this._olMBTN("all" !== FS[0] || !!s.olFsOpen),
        olFsLabel: FS[1],
        olFsToggle: () => {
          const on = !this.state.olFsOpen;
          this.setState({ olFsOpen: on, olFilesOpen: !1, olRowMenu: null });
        },
        olFsOpts: fsList.map((f) => ({
          label: f[1],
          click: () => this.setState({ olFs: V + "|" + f[0], olFsOpen: !1, olPg: V + "|1" }),
          style:
            "display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;font-size:11px;cursor:pointer;transition:background .15s;" +
            (FS[0] === f[0]
              ? "background:var(--bg-a185151810p1);color:var(--fg-xb99751);font-weight:600"
              : "color:var(--fg-x141414);font-weight:400"),
        })),
        olHasRows: rows.length > 0,
        olNoRows: 0 === rows.length,
        olEmptyT: M.length ? "لا نتائج" : emT,
        olEmptyX: M.length ? "غيّر البحث أو الفلترة" : emX,
        olCols: cols.map((t) => ({ n: t[0], d1: t[1][0], d2: t[1][1] })),
        olActOn: actOn,
        olRows: rows,
        olSpan: cols.length + (actOn ? 1 : 0),
        olTotRow: tot(S),
        olFootOn: total > 0,
        olPgRange: (total ? from + 1 : 0) + "–" + to,
      },
      pr,
      {
        olPerPage: String(per),
        olOnPerPage: (e) => this.setState({ olPer: +(e && e.target ? e.target.value : 50), olPg: V + "|1" }),
        olPgNums: nums,
        olPgFirst: setPg(1),
        olPgPrev: setPg(Math.max(1, page - 1)),
        olPgNext: setPg(Math.min(pages, page + 1)),
        olPgLast: setPg(pages),
        olPgFirstStyle: this._olPGBTN(page <= 1),
        olPgPrevStyle: this._olPGBTN(page <= 1),
        olPgNextStyle: this._olPGBTN(page >= pages),
        olPgLastStyle: this._olPGBTN(page >= pages),
      },
    );
  }

  /* ══ R190: الاستيراد من Excel إلى سجلّ التشغيل الميداني — للمصليات والأبواب والمعالم في الموقع النشط ══
   على قاعدة «استيراد Excel» في الإحصائيات اليومية حرفاً: الأعمدةُ تُطابَق بالاسم لا بالترتيب، والملفُ المُصدَّر من السجل نفسُه
   يصلح للاستيراد، ونافذةُ الإقرار تقول قبل أي كتابة ما سيحدث بالعدد وما سيُترك ولماذا.
   ‏١) عنصرٌ رمزُه (رقمُه/اسمُه) موجود: تُحدَّث بياناتُه من الأعمدة غير الفارغة — وشكلُه وموضعُه على الخريطة لا يُمسّان.
   ‏٢) عنصرٌ جديد: يُضاف «بلا موضع» — ملفُّ Excel لا يحمل مكاناً ولا شكلاً — فيُوضع شكلٌ مؤقّت في زاوية الخريطة يحمل
      الوسمَ unp (توقيعَ ذلك الموضع)؛ و«ضعه على الخريطة» في السجل يحدّده ليُسحب إلى مكانه، وأوّلُ تحريكٍ يُسقط الوسم (savePlan).
   ‏٣) لا يحذف شيئاً: عنصرٌ غائبٌ عن الملف يبقى كما هو. والأعمدةُ المحسوبة (السعة · المسكَّنون · التغطية · آخر حركة) لا تُستورد —
      التسكينُ من أدوات التوزيع وحدها، و«عدد الأبواب» (فتحاتُ الباب الأمّ) من محرّر الباب وحده.
   ‏R191) الأعمدةُ هي أعمدةُ السجل نفسُها (= مدخلاتُ محرّر العنصر): «رمز المصلى» · «الساحة» · «أولوية التغطية» · «الاحتياج لكل وردية» ·
      «التخصيص»… — والأسماءُ القديمة مقبولةٌ كما كانت. والساحةُ (والموقعُ للباب) من قائمة الساحات الثابتة في المنصة وحدها: يُقبل
      «الساحة الشمالية» أو «الشمالية»، وغيرُها يُترك ويُذكر في النافذة (لا يُضاف إلى قائمةٍ لا يعرضها المحرّر).
   ‏٤) قيمةٌ جديدة في المنطقة/المستوى/النوع/الفئة (أو قوائم الأبواب ونوع المعلم) تُضاف إلى قائمتها وتُذكر في النافذة.
   ‏٥) الصلاحيةُ والأقفال كالنموذج: الموقعُ المعتمد يُرفض قبل فتح الملف، والجديدُ يحتاج «إضافة» والتحديثُ «تعديل» —
      والحفظُ نفسُه يحتاج «تعديل» أو «اعتماد» كما في savePlan، فلا يُعرض الاستيرادُ لمن لا يُحفظ له. */
  _olNrm(t) {
    return String(null == t ? "" : t)
      .replace(/[ً-ْـ‎‏⁦-⁩‪-‮]/g, "")
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/[\s()²_\-\/]/g, "")
      .toLowerCase();
  }
  _olNrmV(t) {
    return String(null == t ? "" : t)
      .replace(/[\u064B-\u0652\u0640\u200e\u200f\u2066-\u2069\u202a-\u202e]/g, "")
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }
  _olDig(t) {
    return String(null == t ? "" : t)
      .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1584))
      .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1728));
  }
  _olNum(t) {
    const v = this._olDig(t)
      .replace(/[,٬\s]/g, "")
      .replace(/٫/g, ".");
    if ("" === v) return null;
    const n = parseFloat(v);
    return isFinite(n) ? n : null;
  }
  _olKey(t) {
    return this._olDig(t).replace(/^#+/, "").replace(/\s+/g, "").toUpperCase();
  }
  _olImpSpec(V) {
    const NEED = ["الاحتياج", "الاحتياج لكل وردية", "الاحتياج الافتراضي لكل وردية"],
      PRI = ["الأولوية", "أولوية التغطية"];
    const Z = {
      zones: {
        key: ["code"],
        keyMsg: "«رمز المصلى»",
        cols: {
          code: ["رمز المصلى", "الرمز", "code"],
          yard: ["الساحة"],
          region: ["المنطقة"],
          level: ["الدور / المستوى", "المستوى", "الدور"],
          ztype: ["النوع", "نوع المصلى"],
          zcat: ["الفئة", "فئة المصلى"],
          area: ["المساحة م²", "المساحة", "المساحة م2"],
          pri: PRI,
          needN: NEED,
          off: ["الحالة"],
        },
      },
      gates: {
        key: ["num", "label"],
        keyMsg: "«رقم الباب» أو «اسم الباب»",
        cols: {
          num: ["رقم الباب", "الرقم"],
          label: ["اسم الباب", "الاسم", "الباب"],
          gtype: ["النوع"],
          loc: ["الموقع"],
          kind: ["الفئة"],
          route: ["المسار"],
          cls: ["التصنيف"],
          cats: ["التخصيص"],
          pri: PRI,
          needN: NEED,
          closed: ["الحالة"],
        },
      },
      marks: {
        key: ["label"],
        keyMsg: "«اسم المعلم»",
        cols: { label: ["اسم المعلم", "المعلم", "الاسم"], kind: ["النوع"], pri: PRI, needN: NEED, off: ["الحالة"] },
      },
    };
    return Z[V] || null;
  }
  /* R191: الساحةُ (وموقعُ الباب) من قائمة الساحات الثابتة GATE_LOCS — «الساحة الشمالية» أو «الشمالية» — وغيرُها null */
  _olLoc(v) {
    const n = this._olNrmV(v).replace(/^الساحه\s+/, "");
    if (!n) return null;
    const L = Array.isArray(this.GATE_LOCS) ? this.GATE_LOCS : [];
    for (let i = 0; i < L.length; i++) {
      const nm = String((L[i] && L[i][0]) || "");
      if (nm && this._olNrmV(nm).replace(/^الساحه\s+/, "") === n) return nm;
    }
    return null;
  }
  /* R191: «التخصيص» قائمةٌ — تُفصل بالفاصلة العربية أو اللاتينية */
  _olList(v) {
    return String(null == v ? "" : v)
      .split(/[،,]/)
      .map((x) => x.trim())
      .filter(Boolean);
  }
  _olImport(V, site) {
    if (["zones", "gates", "marks"].indexOf(V) < 0) return;
    if (this.curApproved())
      return void this.bsToast("الموقع «" + site + "» معتمدٌ ومقفل — افتحه من القفل بجانب اسمه في قائمة «الموقع النشط» ثم استورد", "warn");
    if (!this._plCanWrite() || (!this.PC("edit") && !this.PC("approve")) || (!this.PC("add") && !this.PC("edit")))
      return void this.permDeny();
    this.setState({ olFilesOpen: !1, olRowMenu: null });
    let inp;
    try {
      ((inp = document.createElement("input")),
        (inp.type = "file"),
        (inp.accept = ".xlsx"),
        (inp.style.display = "none"),
        document.body.appendChild(inp));
    } catch (e) {
      return void this.bsToast("تعذّر فتح مُنتقي الملفات", "err");
    }
    inp.onchange = () => {
      const f = inp.files && inp.files[0];
      try {
        inp.remove();
      } catch (e) {}
      if (!f) return;
      const rd = new FileReader();
      rd.onerror = () => this.bsToast("تعذّرت قراءة الملف", "err");
      rd.onload = () => {
        try {
          Promise.resolve(KIVO.BassamXLSX.parse(rd.result))
            .then((rows) => this._olImpRows(V, site, rows || [], f.name))
            .catch(() => this.bsToast("الملفُ ليس Excel صالحاً (.xlsx)", "err"));
        } catch (e) {
          this.bsToast("الملفُ ليس Excel صالحاً (.xlsx)", "err");
        }
      };
      rd.readAsArrayBuffer(f);
    };
    inp.click();
  }
  _olImpRows(V, site, rows, name) {
    const C = KIVO.BassamCount,
      spec = this._olImpSpec(V);
    if (!spec) return;
    if (!rows.length) return void this.bsToast("الملفُ فارغ", "warn");
    /* صفُّ العناوين: أوّلُ صفٍّ (من الستة الأولى) فيه عمودُ المفتاح — والأعمدةُ تُطابَق بالاسم لا بالترتيب */
    const syn = {};
    Object.keys(spec.cols).forEach((f) =>
      spec.cols[f].forEach((h) => {
        syn[this._olNrm(h)] = syn[this._olNrm(h)] || f;
      }),
    );
    let hi = -1,
      map = null;
    for (let i = 0; i < Math.min(6, rows.length); i++) {
      const m = {};
      (rows[i] || []).forEach((h, ci) => {
        const f = syn[this._olNrm(h)];
        f && null == m[f] && (m[f] = ci);
      });
      if (spec.key.some((k) => null != m[k])) {
        hi = i;
        map = m;
        break;
      }
    }
    if (hi < 0) return void this.bsToast("لم أجد صفَّ العناوين — يلزم عمودٌ اسمُه " + spec.keyMsg + " (صدِّر السجل لترى الأعمدة)", "err");
    const st = this.state,
      key = "zones" === V ? "zones" : "gates" === V ? "gates" : "marks",
      cur = (st[key] || []).slice(),
      L = KIVO.BassamLeaf,
      mpu = +((st.floors || [])[st.floor || 0] || {}).mpu || 0;
    const unit = "zones" === V ? "مصلى" : "gates" === V ? "باب" : "معلم";
    const T = (row, f) => (null == map[f] ? null : String(null == row[map[f]] ? "" : row[map[f]]).trim());
    const kOf = (e) =>
      "zones" === V
        ? this._olKey(e.code)
        : "gates" === V
          ? null != e.num && "" !== String(e.num).trim()
            ? "N:" + this._olKey(e.num)
            : "L:" + this._olNrmV(e.label)
          : this._olNrmV(e.label);
    const idx = {};
    cur.forEach((e, i) => {
      if (!e || ("gates" === V && e.pOf)) return;
      const k = kOf(e);
      k && null == idx[k] && (idx[k] = i);
      "gates" === V && e.label && null == idx["L:" + this._olNrmV(e.label)] && (idx["L:" + this._olNrmV(e.label)] = i);
    });
    const canAdd = this.PC("add"),
      canEd = this.PC("edit"),
      seen = {},
      upd = [],
      news = [],
      newOpts = {};
    let same = 0,
      noKey = 0,
      dup = 0,
      noAdd = 0,
      noEd = 0,
      blank = 0,
      badLoc = 0;
    const addOpt = (f, v, extra) => {
      if (!v) return;
      const k = f + "|" + v + "|" + (extra || "");
      newOpts[k] = { f: f, v: v, r: extra || "" };
    };
    const optHas = (f, v, r) => {
      if ("zones" === V) {
        const l = this.zoneOptList(f);
        return l.some((o) => this._optName(o) === v && ("level" !== f || !o || !o.r || o.r === r));
      }
      if ("gates" === V) return this.gateOptList(f).indexOf(v) >= 0;
      return this._markKinds().indexOf(v) >= 0;
    };
    for (let i = hi + 1; i < rows.length; i++) {
      const row = rows[i] || [];
      if (!row.some((c) => "" !== String(null == c ? "" : c).trim())) {
        blank++;
        continue;
      }
      const P = {};
      Object.keys(spec.cols).forEach((f) => {
        const v = T(row, f);
        null != v && "" !== v && (P[f] = v);
      });
      let k = "";
      if ("zones" === V) k = P.code ? this._olKey(P.code) : "";
      else if ("gates" === V) k = P.num ? "N:" + this._olKey(P.num) : P.label ? "L:" + this._olNrmV(P.label) : "";
      else k = P.label ? this._olNrmV(P.label) : "";
      if (!k) {
        noKey++;
        continue;
      }
      if (seen[k]) {
        dup++;
        continue;
      }
      seen[k] = 1;
      /* القيمُ بأنواعها: الأرقامُ عربيةً وغربية، والحالةُ بكلماتها، والأولويةُ أ/ب/ج */
      const patch = {};
      if ("zones" === V) {
        P.code && (patch.code = this._olDig(P.code).replace(/^#+/, "").trim());
        ["region", "level", "ztype", "zcat"].forEach((f) => {
          null != P[f] && (patch[f] = P[f]);
        });
        if (null != P.yard) {
          const yd = this._olLoc(P.yard);
          yd ? (patch.yard = yd) : badLoc++;
        }
        if (null != P.area) {
          const a = this._olNum(P.area);
          null != a && a > 0 && (patch.area = Math.round(100 * a) / 100);
        }
      }
      if ("gates" === V) {
        P.num && (patch.num = this._olDig(P.num).replace(/^#+/, "").trim());
        P.label && (patch.label = P.label);
        ["route", "gtype", "kind", "cls"].forEach((f) => {
          null != P[f] && (patch[f] = P[f]);
        });
        if (null != P.loc) {
          const lc = this._olLoc(P.loc);
          lc ? (patch.loc = lc) : badLoc++;
        }
        null != P.cats && (patch.cats = this._olList(P.cats));
      }
      if ("marks" === V) {
        P.label && (patch.label = P.label);
        null != P.kind && (patch.kind = P.kind);
      }
      if (null != P.needN) {
        const n = this._olNum(P.needN);
        null != n && n >= 0 && (patch.needN = String(Math.round(n)));
      }
      if (null != P.pri) {
        const p = this._olNrm(P.pri).toUpperCase(),
          m = { ا: "أ", A: "أ", ب: "ب", B: "ب", ج: "ج", C: "ج" }[p.charAt(0)];
        m && (patch.pri = m);
      }
      const sv = null != P.off ? this._olNrm(P.off) : null != P.closed ? this._olNrm(P.closed) : "";
      if (sv) {
        if ("gates" === V) {
          /^مغلق/.test(sv) ? (patch.closed = !0) : /^مفتوح$/.test(sv) && (patch.closed = !1);
        } else /^(معطل|مطفا|موقوف)/.test(sv) ? (patch.off = !0) : /^مفعل/.test(sv) && (patch.off = !1);
      }
      let at = idx[k];
      null == at && "gates" === V && P.num && P.label && (at = idx["L:" + this._olNrmV(P.label)]);
      if (null != at) {
        const e = cur[at];
        if ("gates" === V && L && L.isParent && L.isParent(e)) {
          delete patch.needN;
          delete patch.closed;
        }
        if ("zones" === V && null != patch.area && !(+e.area > 0)) {
          const da = this.areaOfZone(e, mpu);
          da > 0 && Math.abs(Math.round(da) - patch.area) < 1 && delete patch.area;
        }
        const SET = (a) => (Array.isArray(a) ? a : []).map(String).filter(Boolean).sort().join("\u0001");
        const ch = Object.keys(patch).filter((f) =>
          "cats" === f
            ? SET(e.cats) !== SET(patch.cats)
            : (String(null == e[f] ? "" : e[f]) !== String(patch[f]) && !("off" === f || "closed" === f)) ||
              (("off" === f || "closed" === f) && !!e[f] !== !!patch[f]),
        );
        if (!ch.length) {
          same++;
          continue;
        }
        if (!canEd) {
          noEd++;
          continue;
        }
        const pp = {};
        ch.forEach((f) => {
          pp[f] = patch[f];
        });
        "zones" === V && pp.code && (pp.ser = (String(pp.code).match(/(\d+)\s*$/) || [, ""])[1] || e.ser || "");
        upd.push({ i: at, ref: e, patch: pp });
      } else {
        if (!canAdd) {
          noAdd++;
          continue;
        }
        news.push(patch);
      }
      /* قيمُ القوائم الجديدة تُضاف إلى قوائمها (كإضافتها من محرّر العنصر) */
      if ("zones" === V) {
        ["region", "ztype", "zcat"].forEach((f) => {
          patch[f] && !optHas(f, patch[f]) && addOpt(f, patch[f]);
        });
        patch.level && !optHas("level", patch.level, patch.region || "") && addOpt("level", patch.level, patch.region || "");
      }
      if ("gates" === V) {
        ["route", "gtype", "kind", "cls"].forEach((f) => {
          patch[f] && !optHas(f, patch[f]) && addOpt(f, patch[f]);
        });
        (patch.cats || []).forEach((v) => {
          optHas("cat", v) || addOpt("cat", v);
        });
      }
      if ("marks" === V) patch.kind && !optHas("kind", patch.kind) && addOpt("kind", patch.kind);
    }
    const nUp = upd.length,
      nNew = news.length,
      nRows = nUp + nNew + same;
    if (!nUp && !nNew) {
      if (noAdd || noEd) return void this.bsToast("لا صفَّ في الملف تملك صلاحيةَ إدخاله — راجع مدير الإدارة إن احتجت ذلك", "warn");
      if (same)
        return void this.bsToast(
          "لا جديد في الملف — " +
            C(same, unit) +
            " مطابقةٌ لما في السجل" +
            (badLoc
              ? " — و" +
                C(badLoc, "صف") +
                " " +
                C.agr(badLoc, "فيه", "فيهما", "فيها") +
                " " +
                ("gates" === V ? "موقعٌ غيرُ معروف" : "ساحةٌ غيرُ معروفة")
              : ""),
          "warn",
        );
      return void this.bsToast("لم أجد صفّاً واحداً صالحاً — تحقّق من عمود " + spec.keyMsg, "warn");
    }
    /* المواضعُ المؤقّتة في زوايا الخريطة: المصليات أعلى اليسار بمساحتها (إن عُرفت) · الأبواب أعلى اليمين · المعالم أسفل اليسار.
     والمصلى الذي لا مساحةَ له في الملف لا يأخذ مساحةً من شكله المؤقّت (rawA = 0): «بلا مساحة» حتى يُرسم شكلُه أو تُكتب مساحتُه —
     فلا تدخل سعةٌ وهمية في المجاميع، ولا يعود الشكلُ المؤقّت مساحةً حقيقية إن صُدِّر السجلُّ ثم استُورد */
    let zx = 16,
      zy = 16,
      rowH = 0,
      gx = 984,
      mx = 16;
    const built = news.map((p) => {
      if ("zones" === V) {
        let w = 60,
          h = 40;
        if (p.area > 0 && mpu > 0) {
          const sd = Math.max(26, Math.min(140, Math.sqrt(p.area) / mpu));
          w = h = Math.round(sd);
        }
        zx + w > 480 && ((zx = 16), (zy += rowH + 8), (rowH = 0));
        const x1 = zx,
          y1 = zy,
          x2 = zx + w,
          y2 = zy + h;
        zx += w + 8;
        rowH = Math.max(rowH, h);
        const d = "M" + x1 + " " + y1 + " L" + x2 + " " + y1 + " L" + x2 + " " + y2 + " L" + x1 + " " + y2 + " Z";
        return Object.assign(
          {
            d: d,
            code: "",
            ser: "",
            cat: /نساء/.test(p.ztype || "") ? "women" : "men",
            rawA: p.area > 0 ? w * h : 0,
            cx: Math.round((x1 + x2) / 2),
            cy: Math.round((y1 + y2) / 2),
            count: null,
            emp: [],
            kind: null,
            hideLabel: !1,
            uid: this._uid(),
          },
          p,
          { ser: (String(p.code || "").match(/(\d+)\s*$/) || [, ""])[1] || "", unp: d },
        );
      }
      if ("gates" === V) {
        const x = gx,
          y = 20;
        gx -= 30;
        gx < 700 && (gx = 984);
        return Object.assign({ x: x, y: y, label: "باب", emp: [], hideLabel: !0, uid: this._uid() }, p, { unp: x + "," + y });
      }
      const x = mx,
        y = 584;
      mx += 30;
      mx > 300 && (mx = 16);
      return Object.assign({ x: x, y: y, label: "معلم", kind: "", emp: [], hideLabel: !1, uid: this._uid() }, p, { unp: x + "," + y });
    });
    const OL = {
        region: "المنطقة",
        level: "الدور / المستوى",
        ztype: "النوع",
        zcat: "الفئة",
        route: "المسار",
        gtype: "النوع",
        kind: "zones" === V ? "الفئة" : "gates" === V ? "الفئة" : "النوع",
        cls: "التصنيف",
        cat: "التخصيص",
      },
      nO = Object.keys(newOpts).map((k) => newOpts[k]);
    const parts = [C(nRows, unit)];
    nUp &&
      parts.push(
        C(nUp, unit) +
          " " +
          C.agr(nUp, "موجودٌ تُحدَّث بياناتُه", "موجودان تُحدَّث بياناتُهما", "موجودةٌ تُحدَّث بياناتُها") +
          " — " +
          ("zones" === V ? C.agr(nUp, "وشكلُه", "وشكلاهما", "وأشكالُها") : C.agr(nUp, "وموضعُه", "وموضعاهما", "ومواضعُها")) +
          " على الخريطة " +
          C.agr(nUp, "لا يُمسّ", "لا يُمسّان", "لا تُمسّ"),
      );
    nNew &&
      parts.push(
        C(nNew, unit) +
          " " +
          C.agr(nNew, "جديدٌ يُضاف", "جديدان يُضافان", "جديدةٌ تُضاف") +
          " «بلا موضع» — " +
          C.agr(nNew, "تضعه", "تضعهما", "تضعها") +
          " على الخريطة من السجل",
      );
    same && parts.push(C(same, unit) + " بلا تغيير");
    nO.length &&
      parts.push(
        "قيمٌ جديدة تُضاف إلى القوائم: " +
          nO
            .slice(0, 4)
            .map((o) => (OL[o.f] || o.f) + " «" + o.v + "»")
            .join("، ") +
          (nO.length > 4 ? " و" + (nO.length - 4) + " غيرها" : ""),
      );
    noKey &&
      parts.push(
        C(noKey, "صف") +
          " " +
          C.agr(noKey, "بلا مفتاحٍ سيُترك", "بلا مفتاحٍ سيُتركان", "بلا مفتاحٍ ستُترك") +
          " (يلزم " +
          spec.keyMsg +
          ")",
      );
    dup && parts.push(C(dup, "صف") + " " + C.agr(dup, "مكرَّرٌ سيُترك", "مكرَّران سيُتركان", "مكرَّرةٌ ستُترك"));
    badLoc &&
      parts.push(
        C(badLoc, "صف") +
          " " +
          C.agr(badLoc, "فيه", "فيهما", "فيها") +
          " " +
          ("gates" === V ? "موقعٌ غيرُ معروف — يبقى الموقعُ كما هو" : "ساحةٌ غيرُ معروفة — تبقى الساحةُ كما هي") +
          " (المعروفة: " +
          (Array.isArray(this.GATE_LOCS) ? this.GATE_LOCS.map((x) => x[0]).join("، ") : "") +
          ")",
      );
    noAdd &&
      parts.push(
        C(noAdd, unit) + " " + C.agr(noAdd, "جديدٌ سيُترك", "جديدان سيُتركان", "جديدةٌ ستُترك") + " — الإضافةُ تحتاج صلاحية الإضافة",
      );
    noEd &&
      parts.push(
        C(noEd, unit) + " " + C.agr(noEd, "موجودٌ سيُترك", "موجودان سيُتركان", "موجودةٌ ستُترك") + " — التعديلُ يحتاج صلاحية التعديل",
      );
    const nm =
      "zones" === V ? "المصليات" : "gates" === V ? "الأبواب" : "المعالم";
    const ask = KIVO.bsConfirm
      ? KIVO.bsConfirm({
          title: "استيراد " + nm + " من Excel",
          msg: "إلى «" + site + "» من «⁨" + name + "⁩»: " + parts.join(" · ") + ". أتمضي؟",
          ok: "استورد",
          cancel: "إلغاء",
          info: !nUp,
          danger: !!nUp,
        })
      : Promise.resolve(!0);
    Promise.resolve(ask).then((ok) => {
      if (!ok) return;
      if (this.curApproved()) return void this.bsToast("أُقفل الموقع منذ المعاينة — لم يُستورد شيء", "warn");
      const now = (this.state[key] || []).slice();
      let nU = 0;
      /* الصفُّ يُطبَّق على عنصره نفسِه — فإن تغيّر موضعُه في القائمة منذ المعاينة يُبحث عنه بمفتاحه، وإن غاب يُترك */
      upd.forEach((u) => {
        let j = now[u.i] === u.ref ? u.i : now.indexOf(u.ref);
        if (j < 0) return;
        now[j] = Object.assign({}, now[j], u.patch);
        nU++;
      });
      const all = now.concat(built),
        related = {};
      if (nO.length) {
        if ("zones" === V) {
          const zo = Object.assign({}, this.state.zoneOpts || {});
          nO.forEach((o) => {
            const l = Array.isArray(zo[o.f]) ? zo[o.f].slice() : [];
            zo[o.f] = l.concat([
              "level" === o.f ? Object.assign({ n: o.v, c: "" }, o.r ? { r: o.r } : {}) : "zcat" === o.f ? { n: o.v } : { n: o.v, c: "" },
            ]);
          });
          this.saveZoneOpts(zo, true);
          related.bassam_zone_opts_v1 = zo;
        } else if ("gates" === V) {
          const go = Object.assign({}, this.state.gateOpts || {});
          nO.forEach((o) => {
            const l = Array.isArray(go[o.f]) ? go[o.f].slice() : [];
            (l.indexOf(o.v) < 0 && l.push(o.v), (go[o.f] = l));
          });
          this.saveGateOpts(go, true);
          related.bassam_gate_opts_v1 = go;
        } else {
          const kinds = this._opRead("bassam_mark_kinds_v1");
          const values = Array.isArray(kinds) ? kinds.slice() : [];
          nO.forEach((o) => {
            if (!values.includes(o.v)) values.push(o.v);
          });
          related.bassam_mark_kinds_v1 = values;
        }
      }
      const pt = { [key]: all };
      built.length &&
        ((pt.olFs = V + "|unp"), (pt.olPg = V + "|1"), (pt.olQ = ""));
      this.setState(pt, async () => {
        const ack = await this.savePlan(related);
        if (!ack || ack.ok !== 1) return;
        this.bsToast(
          "استُورد إلى «" +
            site +
            "»: " +
            [
              nU ? C(nU, unit) + " " + C.agr(nU, "حُدِّث", "حُدِّثا", "حُدِّثت") : "",
              built.length
                ? C(built.length, unit) +
                  " " +
                  C.agr(built.length, "أُضيف", "أُضيفا", "أُضيفت") +
                  " «بلا موضع» — " +
                  C.agr(built.length, "ضعه", "ضعهما", "ضعها") +
                  " على الخريطة من ⋮"
                : "",
            ]
              .filter(Boolean)
              .join(" · "),
          "ok",
        );
      });
    });
  }

  bsToast(t, e) {
    try {
      const s = e || "err";
      let n = document.getElementById("bs-toast");
      n || ((n = document.createElement("div")), (n.id = "bs-toast"), document.body.appendChild(n));
      const a =
        "ok" === s
          ? ["var(--toast-ok)", "var(--bg-toast)", "var(--toast-ok-bd)", "✓"]
          : "warn" === s
            ? ["var(--toast-warn)", "var(--bg-toast)", "var(--toast-warn-bd)", "⚠"]
            : ["var(--toast-err)", "var(--bg-toast)", "var(--toast-err-bd)", "⚠"];
      (n.setAttribute(
        "style",
        "position:fixed;top:16px;left:50%;transform:translateX(-50%) translateY(-8px);z-index:2147483000;max-width:min(560px,92vw);direction:rtl;text-align:right;font-family:'Cairo',sans-serif;font-size:13px;font-weight:600;line-height:1.9;color:" +
          a[0] +
          ";background:" +
          a[1] +
          ";border:1px solid " +
          a[2] +
          ";border-radius:14px;padding:12px 18px;box-shadow:var(--shadow-elevated);opacity:0;transition:opacity .22s ease, transform .22s ease;pointer-events:none",
      ),
        (n.textContent = a[3] + "  " + String(null == t ? "" : t)),
        requestAnimationFrame(() => {
          try {
            ((n.style.opacity = "1"), (n.style.transform = "translateX(-50%) translateY(0)"));
          } catch (t) {}
        }),
        clearTimeout(this._bsToastT),
        (this._bsToastT = setTimeout(() => {
          try {
            ((n.style.opacity = "0"), (n.style.transform = "translateX(-50%) translateY(-8px)"));
          } catch (t) {}
        }, 4200)));
    } catch (t) {}
  }
  defaults() {
    return { approved: !1, mapW: 100, zones: [], gates: [], marks: [], floors: [] };
  }
  _readSiteImg(t) {
    if (!/^image\//.test(t.type)) return void this.bsToast("الرجاء اختيار ملف صورة");
    const e = new FileReader(),
      TK = KIVO.BassamBusy ? KIVO.BassamBusy.start("جارٍ قراءة الصورة…", { sub: KIVO.BassamBusy.fmtBytes(t.size || 0) }) : null;
    e.onerror = () => {
      (TK && TK.done(), this.bsToast("تعذّرت قراءة الصورة", "warn"));
    };
    ((e.onload = () => {
      const s = new Image();
      ((s.onload = () => {
        (TK &&
          TK.set({ label: "جارٍ ضغط الصورة وتجهيزها…", sub: s.width + "×" + s.height + " · " + KIVO.BassamBusy.fmtBytes(t.size || 0) }),
          setTimeout(() => {
            try {
              const n = /png|webp|gif|svg/i.test(t.type),
                a = (t, a) => {
                  const i = Math.min(1, t / Math.max(s.width, s.height)),
                    r = Math.max(1, Math.round(s.width * i)),
                    l = Math.max(1, Math.round(s.height * i)),
                    o = document.createElement("canvas");
                  ((o.width = r), (o.height = l));
                  const d = o.getContext("2d");
                  ((d.imageSmoothingEnabled = !0),
                    (d.imageSmoothingQuality = "high"),
                    n || ((d.fillStyle = "#ffffff"), d.fillRect(0, 0, r, l)),
                    d.drawImage(s, 0, 0, r, l));
                  try {
                    return { url: n ? o.toDataURL("image/png") : o.toDataURL("image/jpeg", a), w: r, h: l };
                  } catch (t) {
                    return { url: e.result, w: s.width, h: s.height };
                  }
                },
                i = 55e5,
                r = Math.max(s.width, s.height);
              let l;
              if (r <= 4500 && e.result && e.result.length <= i) l = { url: e.result, w: s.width, h: s.height };
              else {
                let t = Math.min(r, 4500);
                l = a(t, 0.94);
                let e = 0;
                for (; l.url.length > i && e < 12; ) {
                  if (((t = Math.round(0.85 * t)), t < 900)) {
                    l = a(900, 0.82);
                    break;
                  }
                  ((l = a(t, 0.92)), e++);
                }
              }
              this.setState({
                siteLowRes: r < 1400 ? s.width + "×" + s.height : null,
                siteModal: { ...(this.state.siteModal || {}), img: l.url, imgW: l.w, imgH: l.h },
              });
            } finally {
              TK && TK.done();
            }
          }, 40));
      }),
        (s.onerror = () => (TK && TK.done()) || this.setState({ siteModal: { ...(this.state.siteModal || {}), img: e.result } })),
        (s.src = e.result));
    }),
      e.readAsDataURL(t));
  }
  _bsLiveReload(K) {
    if (this._opBusy || this._opTicket) return false;
    const h = (t) =>
      (K || []).some((k) => {
        k = String(k);
        return k === t || k.slice(-t.length - 1) === ":" + t;
      });
    const s = this.state;
    /* R3-C2b-REVERT: الحاجزُ على سحب المسار ورأسِه والتدوير وحدَها — لا يُوسَّع لكلِّ سحب: ما يصل بين الإصبعين لا يُعيده undoLead (W1-C2)،
       وإرجاؤه خلف سحب منتصف النطاق كان يُخسر تعديلَ الجهاز الآخر (حفظُ الضغطة عند الرفع)، وخلف رايةِ سحبٍ عالقة يحبسه حتى يُسقطه _liveTry */
    if (
      "select" !== s.tool ||
      s.draft ||
      (s.polyPts && s.polyPts.length) ||
      s.pdrag ||
      s.pvdrag ||
      s.rotdrag ||
      s.pan ||
      s.planAdd ||
      s.planLock ||
      s.planDelMonth ||
      s.siteModal ||
      s.addSiteOpen ||
      s.zcs ||
      s.calAsk ||
      s.retroAsk
    )
      return !1;
    if (this._opDrafts)
      Object.keys(this._opDrafts).forEach((name) => {
        if (h(name)) delete this._opDrafts[name];
      });
    const p = {};
    if (h("bassam_plan_v1")) {
      const b = this.initState(),
        k = this._mKey(s.year, s.month),
        f = this._withMonth(b.floors, b.planMonths, k),
        i = Math.min(s.floor || 0, Math.max(0, f.length - 1)),
        r = f[i] || {};
      Object.assign(p, {
        floors: f,
        planMonths: b.planMonths,
        delMonths: b.delMonths || {},
        cfg: b.cfg,
        mapW: b.mapW,
        approved: b.approved,
        zones: r.zones || [],
        gates: r.gates || [],
        marks: r.marks || [],
        paths: r.paths || [],
        floor: i,
        sel: null,
        selMulti: [],
      });
    }
    h("bassam_gate_opts_v1") && (p.gateOpts = this.loadGateOpts());
    h("bassam_zone_opts_v1") && (p.zoneOpts = this.loadZoneOpts());
    Object.keys(p).length &&
      this.setState(p, () => {
        try {
          h("bassam_plan_v1") && this._loadFloorImages();
        } catch (t) {}
      });
    return !0;
  }
  loadPlan() {
    try {
      const t = this._opRead("bassam_plan_v1");
      if (t) return t;
    } catch (t) {}
    return null;
  }
  async _putImg(value, previous) {
    const service = this._opService(),
      context = JSON.stringify(service.context()),
      id =
        "img_" +
        Date.now().toString(36) +
        "_" +
        Math.floor(1e9 * Math.random()).toString(36);
    if (!KIVO.BassamIDB || typeof KIVO.BassamIDB.set !== "function" || !value)
      throw Error("image-upload-required");
    if (previous && previous.iid && KIVO.BassamPurge) {
      KIVO.BassamPurge.keep(previous.iid);
      (this._opKeptImages || (this._opKeptImages = [])).push(previous.iid);
    }
    if ((await KIVO.BassamIDB.set(id, value)) !== true)
      throw Error("image-ack-required");
    if (context !== JSON.stringify(service.context()))
      throw Error("image-context-changed");
    return id;
  }
  _mKey(t, e) {
    return t + "-" + e;
  }
  _stageStaffOk(t, e) {
    return !0;
  }
  _snapshot(t) {
    return (t || []).map((t) => ({
      sid: t.sid || void 0,
      name: t.name,
      num: t.num,
      chip: t.chip,
      chipTone: t.chipTone,
      zones: t.zones || [],
      gates: t.gates || [],
      marks: t.marks || [],
      paths: t.paths || [],
      sectors: Array.isArray(t.sectors) ? t.sectors : [],
      hideSectors: !0 === t.hideSectors,
      approved: !!t.approved,
      iid: t.iid || null,
      ...(!t.iid && t.img ? { img: t.img } : {}),
    }));
  }
  _mData(t, e) {
    const s = t && t[e];
    return s ? (Array.isArray(s) ? s : Array.isArray(s.d) ? s.d : null) : null;
  }
  _hasPlanFor(t, e) {
    const s = t && t[e];
    return !!s && !Array.isArray(s) && Array.isArray(s.d);
  }
  _normMonths(t) {
    const e = {};
    return (
      !t ||
        "object" != typeof t ||
        Array.isArray(t) ||
        Object.keys(t).forEach((s) => {
          const n = t[s];
          Array.isArray(n)
            ? n.some((t) => t && ((t.zones && t.zones.length) || (t.gates && t.gates.length) || (t.paths && t.paths.length))) &&
              (e[s] = { c: 1, d: n })
            : n && Array.isArray(n.d) && (e[s] = { c: 1, d: n.d });
        }),
      e
    );
  }
  _withMonth(t, e, s) {
    const n = this._mData(e, s);
    return Array.isArray(n)
      ? n.map((e, s) => {
          const n = (t || [])[s] || {},
            a = {
              zones: Array.isArray(e.zones) ? e.zones : [],
              gates: Array.isArray(e.gates) ? e.gates : [],
              marks: Array.isArray(e.marks) ? e.marks : [],
              paths: Array.isArray(e.paths) ? e.paths : [],
              sectors: Array.isArray(e.sectors) ? e.sectors : [],
              hideSectors: !0 === e.hideSectors,
              approved: !!e.approved,
            },
            i = void 0 !== e.name ? e.name : n.name,
            r = void 0 !== e.num ? e.num : null != n.num ? n.num : s;
          if (void 0 === e.iid) return { ...n, ...a, name: i, num: r };
          const l = !!e.iid && e.iid === n.iid;
          return {
            ...n,
            ...a,
            name: i,
            num: r,
            chip: void 0 !== e.chip ? e.chip : n.chip,
            chipTone: void 0 !== e.chipTone ? e.chipTone : n.chipTone,
            iid: e.iid,
            img: l ? n.img : void 0,
          };
        })
      : t || [];
  }
  goTo(t, e) {
    const s = this.state,
      n = this._mKey(s.year, s.month),
      a = (s.floors || []).map((t, e) =>
        e === s.floor ? { ...t, zones: s.zones, gates: s.gates, marks: s.marks || [], paths: s.paths || [] } : t,
      ),
      i = { ...(s.planMonths || {}) };
    this._hasPlanFor(i, n) && (i[n] = { ...(i[n] && !Array.isArray(i[n]) ? i[n] : {}), c: 1, d: this._snapshot(a) });
    const w9 = this._plLeftDirty(n, i, a),
      r = this._mKey(t, e),
      l = this._withMonth(a, i, r),
      o = l[s.floor] || {};
    this.setState(
      {
        year: t,
        month: e,
        planMonths: i,
        floors: l,
        zones: o.zones || [],
        gates: o.gates || [],
        marks: o.marks || [],
        paths: o.paths || [],
        sel: null,
        selMulti: [],
        draft: null,
        polyPts: [],
        polyCursor: null,
        tool: "select",
      },
      () => {
        /* PLAN-01 (W1): تصفّحُ الأشهر قراءةٌ لا كتابة — كان كلُّ اختيارِ شهرٍ (البطاقات · السنة · «الحالية») يكتب الخطةَ كاملةً
           على الخادم (مراجعةٌ جديدة للمفتاح المشترك تُعيد تحميلَ الأجهزة الأخرى)، ويُظهر للعارض بلا تحرير «صلاحيتك لا تشمل هذا الإجراء».
           الآن يُحفظ فقط ما لم يُحفظ من الشهر المغادَر، ولمن يملك الحفظ · وخطُّ التراجع يبدأ من الشهر المعروض كما كان يبدأ بعد الحفظ */
        (this._loadFloorImages(), w9 && (this.PC("edit") || this.PC("approve")) ? this.savePlan() : (this._lastSnap = this._snapNow()));
      },
    );
  }
  /* الشهرُ المغادَر (n) فيه ما لم يُحفظ؟ — لقطتُه كما يكتبها goTo مقابلَ المخزَّن، بلا السعة (cap مشتقّةٌ من الشكل تُعاد عند كل حفظ).
     لا خطةَ للشهر ⇒ لا شيءَ شهريّاً يُحفظ · تعذّرت المقارنة ⇒ يُحفظ كما كان */
  _plLeftDirty(n, i, a) {
    if (!this._hasPlanFor(i, n)) return !1;
    let S = null;
    try {
      S = this._opRead("bassam_plan_v1");
    } catch (t) {
      /* لا يمنع العرض — يُتجاوز بصمت */
    }
    const m = S && S.months && "object" === typeof S.months ? S.months[n] : null,
      d = Array.isArray(m) ? m : m && m.d;
    if (!Array.isArray(d)) return !0;
    const k = (F) =>
      JSON.stringify(
        (F || []).map((f) => ({
          ...f,
          zones: ((f && f.zones) || []).map((z) => {
            const q = { ...z };
            return (delete q.cap, q);
          }),
        })),
      );
    try {
      return k(this._snapshot(a)) !== k(d);
    } catch (t) {
      return !0;
    }
  }
  _snapNow() {
    const t = this.state;
    return {
      floor: t.floor,
      year: t.year,
      month: t.month,
      zones: JSON.parse(JSON.stringify(t.zones || [])),
      gates: JSON.parse(JSON.stringify(t.gates || [])),
      marks: JSON.parse(JSON.stringify(t.marks || [])),
      paths: JSON.parse(JSON.stringify(t.paths || [])),
    };
  }
  _geomOnly(t) {
    const e = (t) =>
      (t || []).map((t) => {
        const e = { ...t };
        return (delete e.emp, delete e.count, delete e.pc, e);
      });
    return JSON.stringify([e(t.zones), e(t.gates), e(t.paths)]);
  }
  _sameGeom(t, e) {
    return !(!t || !e) && this._geomOnly(t) === this._geomOnly(e);
  }
  _histPush() {
    const t = this._snapNow(),
      e = this._lastSnap;
    this._lastSnap = t;
    const s = this._histMerge;
    if (((this._histMerge = null), "skip" !== s))
      return "drop" === s
        ? ((this._undoStack = (this._undoStack || []).slice(0, -1)), void this.setState({ histTick: (this.state.histTick || 0) + 1 }))
        : void (
            e &&
            e.floor === t.floor &&
            e.year === t.year &&
            e.month === t.month &&
            (this._sameGeom(e, t) ||
              ((this._undoStack = (this._undoStack || []).concat([e])),
              this._undoStack.length > 60 && (this._undoStack = this._undoStack.slice(-60)),
              (this._redoStack = []),
              this.setState({ histTick: (this.state.histTick || 0) + 1 })))
          );
  }
  _mergeLive(t, e) {
    const s = e || [];
    return (t || []).map((t, e) => {
      const n = s.find((e) => e && ((t.code && e.code === t.code) || (t.label && e.label === t.label))) || s[e];
      if (!n) return t;
      const a = { ...t };
      return (void 0 !== n.emp && (a.emp = n.emp), void 0 !== n.count && (a.count = n.count), void 0 !== n.pc && (a.pc = n.pc), a);
    });
  }
  _histApply(t) {
    const e = this.state,
      s = this._mergeLive(JSON.parse(JSON.stringify(t.zones)), e.zones),
      n = this._mergeLive(JSON.parse(JSON.stringify(t.gates)), e.gates),
      a = this._mergeLive(JSON.parse(JSON.stringify(t.marks || [])), e.marks || []),
      i = JSON.parse(JSON.stringify(t.paths));
    let r = e.sel;
    if (r) {
      const t = "gate" === r.t ? n : "path" === r.t ? i : s;
      (!t || null == r.i || r.i >= t.length) && (r = null);
    }
    this._lastSnap = { floor: t.floor, year: t.year, month: t.month, zones: s, gates: n, marks: a, paths: i };
    const l = (e.floors || []).map((e, r) => (r === t.floor ? { ...e, zones: s, gates: n, marks: a, paths: i } : e));
    this.setState(
      {
        floor: t.floor,
        floors: l,
        zones: s,
        gates: n,
        marks: a,
        paths: i,
        sel: r,
        draft: null,
        polyPts: [],
        polyCursor: null,
        histTick: (this.state.histTick || 0) + 1,
      },
      () => this.savePlan(),
    );
  }
  histUndo() {
    if (this.curApproved() || ("plan" !== this.state.lens && "gates" !== this.state.lens && "paths" !== this.state.lens)) return;
    const t = this._undoStack || [];
    if (!t.length) return;
    const e = t[t.length - 1];
    ((this._undoStack = t.slice(0, -1)), (this._redoStack = (this._redoStack || []).concat([this._snapNow()])), this._histApply(e));
  }
  histRedo() {
    if (this.curApproved() || ("plan" !== this.state.lens && "gates" !== this.state.lens && "paths" !== this.state.lens)) return;
    const t = this._redoStack || [];
    if (!t.length) return;
    const e = t[t.length - 1];
    ((this._redoStack = t.slice(0, -1)), (this._undoStack = (this._undoStack || []).concat([this._snapNow()])), this._histApply(e));
  }
  _zInside(t, e, s) {
    let n = !1,
      a = s.length - 1;
    for (let i = 0; i < s.length; i++) {
      const r = s[i].x,
        l = s[i].y,
        o = s[a].x,
        d = s[a].y;
      (l > e != d > e && t < ((o - r) * (e - l)) / (d - l || 1e-12) + r && (n = !n), (a = i));
    }
    return n;
  }
  _boxFits(t, e, s, n, a, i) {
    const r = (a * Math.PI) / 180,
      l = Math.cos(r),
      o = Math.sin(r),
      d = s / 2,
      h = n / 2,
      p = (t, e) => {
        let s = !1;
        for (let n = 0, a = i.length - 1; n < i.length; a = n++) {
          const r = i[n],
            l = i[a];
          r.y > e != l.y > e && t < ((l.x - r.x) * (e - r.y)) / (l.y - r.y) + r.x && (s = !s);
        }
        return s;
      };
    for (let s = 0; s < 4; s++)
      for (let n = 0; n <= 6; n++) {
        const a = n / 6;
        let i, r;
        if (
          (0 === s
            ? ((i = 2 * d * a - d), (r = -h))
            : 1 === s
              ? ((i = d), (r = 2 * h * a - h))
              : 2 === s
                ? ((i = d - 2 * d * a), (r = h))
                : ((i = -d), (r = h - 2 * h * a)),
          !p(t + i * l - r * o, e + i * o + r * l))
        )
          return !1;
      }
    return !0;
  }
  _capturePrintPage(t) {
    return KIVO.BassamPrintCore.capture(this, t, "svg[data-map-zoom]");
  }
  _buildPrintDoc(t) {
    /* KIVO_258 · AUD-013: نواةُ الطباعة المشتركة (src/services/566-print-core.js) بخيارات هذه الوحدة */
    return KIVO.BassamPrintCore.build(this, t, { date: "today", kpi: !1, ver: "v1.0.457", logo: '<img src="@@KIVO_INLINE:img/haramain-print.png@@" alt="الحرمين" style="height:100%;width:auto;display:block"/>' });
  }
  _zLabelFit(t) {
    if (!t || t.length < 3) return null;
    let k = "";
    try {
      k = t.length + ":" + t.map((t) => t.x + "," + t.y).join(";");
    } catch (e) {
      k = "";
    }
    if (!k) return this._zLabelFit0(t);
    const M = this._bsZL || (this._bsZL = new Map());
    if (M.has(k)) {
      const r = M.get(k);
      return r ? Object.assign({}, r) : null;
    }
    const v = this._zLabelFit0(t);
    if (M.size >= 600) M.clear();
    M.set(k, v ? Object.assign({}, v) : null);
    return v;
  }
  _zLabelFit0(t) {
    if (!t || t.length < 3) return null;
    const e = t.map((t) => t.x),
      s = t.map((t) => t.y),
      n = Math.min(...e),
      a = Math.max(...e),
      i = Math.min(...s),
      r = Math.max(...s);
    if (!(a > n && r > i)) return null;
    const l = (e, s) => {
        let n = !1;
        for (let a = 0, i = t.length - 1; a < t.length; i = a++) {
          const r = t[a],
            l = t[i];
          r.y > s != l.y > s && e < ((l.x - r.x) * (s - r.y)) / (l.y - r.y) + r.x && (n = !n);
        }
        return n;
      },
      o = (e, s) => {
        let n = 1 / 0;
        for (let a = 0, i = t.length - 1; a < t.length; i = a++) {
          const r = t[a],
            l = t[i],
            o = l.x - r.x,
            d = l.y - r.y,
            h = o * o + d * d;
          let p = h ? ((e - r.x) * o + (s - r.y) * d) / h : 0;
          ((p = Math.max(0, Math.min(1, p))), (n = Math.min(n, Math.hypot(r.x + p * o - e, r.y + p * d - s))));
        }
        return n;
      };
    let d = 0;
    const h = (t) => {
      for (let e = 1; e < 22; e++)
        for (let s = 1; s < 22; s++) {
          const d = n + (e / 22) * (a - n),
            h = i + (s / 22) * (r - i);
          l(d, h) && t(d, h, o(d, h));
        }
    };
    if (
      (h((t, e, s) => {
        s > d && (d = s);
      }),
      !(d > 0))
    )
      return null;
    let p = 0,
      c = 0,
      g = 0;
    for (let e = 0; e < t.length; e++) {
      const s = (e + 1) % t.length,
        n = t[e].x * t[s].y - t[s].x * t[e].y;
      ((g += n), (p += (t[e].x + t[s].x) * n), (c += (t[e].y + t[s].y) * n));
    }
    Math.abs(g) > 1 ? ((p /= 3 * g), (c /= 3 * g)) : ((p = (n + a) / 2), (c = (i + r) / 2));
    let f = null;
    if (
      (h((t, e, s) => {
        if (s < 0.9 * d) return;
        const n = Math.hypot(t - p, e - c);
        (!f || n < f.dc) && (f = { x: t, y: e, dc: n });
      }),
      !f)
    )
      return null;
    const u = (e) => {
      const s = Math.cos(e),
        n = Math.sin(e),
        a = [];
      for (let e = 0; e < t.length; e++) {
        const i = t[e],
          r = t[(e + 1) % t.length],
          l = r.x - i.x,
          o = r.y - i.y,
          d = s * o - n * l;
        if (Math.abs(d) < 1e-9) continue;
        const h = ((i.x - f.x) * o - (i.y - f.y) * l) / d,
          p = ((i.x - f.x) * n - (i.y - f.y) * s) / d;
        p >= 0 && p <= 1 && a.push(h);
      }
      a.sort((t, e) => t - e);
      const i = [];
      for (let t = 0; t < a.length; t++) (!i.length || Math.abs(a[t] - i[i.length - 1]) > 1e-6) && i.push(a[t]);
      let r = null,
        o = null;
      for (let t = 0; t < i.length; t++)
        if ((i[t] <= 1e-6 && (r = i[t]), i[t] >= -1e-6)) {
          o = i[t];
          break;
        }
      if (null == r || null == o) return 0;
      const d = f.x + (Math.cos(e) * (r + o)) / 2,
        h = f.y + (Math.sin(e) * (r + o)) / 2;
      return l(d, h) ? o - r : 0;
    };
    let m = 0,
      y = 0,
      b = 0,
      x = 0,
      k = 0,
      A = 0;
    (h((t, e) => {
      ((x += t), (k += e), A++);
    }),
      A > 2 &&
        ((x /= A),
        (k /= A),
        h((t, e) => {
          const s = t - x,
            n = e - k;
          ((m += s * s), (y += n * n), (b += s * n));
        }),
        (m /= A),
        (y /= A),
        (b /= A)));
    let v = 0;
    const S = m + y,
      w = m * y - b * b,
      z = Math.max(0, (S * S) / 4 - w),
      E = S / 2 + Math.sqrt(z),
      M = S / 2 - Math.sqrt(z),
      O = M > 1e-9 ? Math.sqrt(E / M) : 99;
    A > 2 && O >= 2 && (v = 0.5 * Math.atan2(2 * b, m - y));
    let C = u(v),
      P = u(v + Math.PI / 2),
      T = (180 * v) / Math.PI;
    for (; T > 90; ) T -= 180;
    for (; T <= -90; ) T += 180;
    return (
      Math.abs(T) <= 10 ? ((T = 0), (v = 0)) : Math.abs(Math.abs(T) - 90) <= 10 && ((T = T > 0 ? 90 : -90), (v = Math.PI / 2)),
      (C = u(v)),
      (P = u(v + Math.PI / 2)),
      { x: f.x, y: f.y, w: C, h: P > 0 ? P : 0.4 * C, deg: T }
    );
  }
  _zAnchor(t) {
    if (!t || t.length < 3) return null;
    let e = 0,
      s = 0,
      n = 0;
    for (let a = 0; a < t.length; a++) {
      const i = (a + 1) % t.length,
        r = t[a].x * t[i].y - t[i].x * t[a].y;
      ((e += r), (s += (t[a].x + t[i].x) * r), (n += (t[a].y + t[i].y) * r));
    }
    if (Math.abs(e) > 1e-9 && ((s /= 3 * e), (n /= 3 * e), this._zInside(s, n, t))) return { x: s, y: n };
    let a = 1 / 0,
      i = -1 / 0;
    t.forEach((t) => {
      (t.y < a && (a = t.y), t.y > i && (i = t.y));
    });
    let r = null;
    if (
      ([0.5, 0.35, 0.65, 0.25, 0.75, 0.45, 0.55, 0.15, 0.85].forEach((e) => {
        const s = a + (i - a) * e,
          n = [];
        let l = t.length - 1;
        for (let e = 0; e < t.length; e++) {
          const a = t[e].y,
            i = t[l].y;
          (a > s != i > s && n.push(((t[l].x - t[e].x) * (s - a)) / (i - a || 1e-12) + t[e].x), (l = e));
        }
        n.sort((t, e) => t - e);
        for (let t = 0; t + 1 < n.length; t += 2) {
          const e = n[t + 1] - n[t];
          (!r || e > r.w) && (r = { w: e, x: (n[t] + n[t + 1]) / 2, y: s });
        }
      }),
      r)
    )
      return { x: r.x, y: r.y };
    let l = 0,
      o = 0;
    return (
      t.forEach((t) => {
        ((l += t.x), (o += t.y));
      }),
      { x: l / t.length, y: o / t.length }
    );
  }
  _distPickOk() {
    return !0;
  }
  _pickSel(t, e, s) {
    const n = this.state,
      a = n.sel && n.sel.t === t;
    let i = a && Array.isArray(n.selMulti) ? n.selMulti.slice() : [];
    if (!s || !a)
      return void this.setState({ sel: { t: t, i: e }, selMulti: [e], hoverZone: null, hoverGate: null, hoverMark: null, hoverPath: null });
    const r = i.indexOf(e);
    (r >= 0 ? i.splice(r, 1) : i.push(e),
      i.length
        ? this.setState({ sel: { t: t, i: i[0] }, selMulti: i, hoverZone: null, hoverGate: null, hoverMark: null, hoverPath: null })
        : this.setState({ sel: null, selMulti: [], hoverZone: null, hoverGate: null, hoverMark: null, hoverPath: null }));
  }
  openBulkEditor() {
    const t = this.state,
      e = Array.isArray(t.selMulti) ? t.selMulti : [];
    !t.sel ||
      e.length < 2 ||
      this.setState({
        zdrag: null,
        gdrag: null,
        pdrag: null,
        bDd: null,
        bEdit: {
          t: t.sel.t,
          n: e.length,
          yard: "",
          region: "",
          level: "",
          ztype: "",
          zcat: "",
          off: "",
          loc: "",
          kind: "",
          route: "",
          cls: "",
          closed: "",
          type: "",
          line: "",
          w: "",
          active: "",
          hideLabel: "",
        },
      });
  }
  applyBulkEditor() {
    const t = this.state.bEdit;
    if (!t) return;
    const e = {},
      s = (s) => {
        "" !== t[s] && null != t[s] && (e[s] = t[s]);
      },
      n = (s) => {
        "yes" === t[s] ? (e[s] = !0) : "no" === t[s] && (e[s] = !1);
      };
    if ("zone" === t.t) {
      if (
        (["yard", "region", "level", "ztype", "zcat"].forEach(s), n("off"), null != e.region && null == e.level && (e.level = ""), e.level)
      ) {
        const t = null != e.region ? e.region : null;
        if (!this.zoneOptList("level").some((s) => !(this._optName(s) !== e.level || (s && s.r && null != t && s.r !== t))))
          return void this.bsToast("الدور «" + e.level + "» لا ينتمي إلى الساحة المختارة");
      }
      if ((null != e.ztype && null == e.zcat && (e.zcat = ""), e.zcat)) {
        const t = null != e.ztype ? e.ztype : null;
        if (!this.zoneOptList("zcat").some((s) => this._optName(s) === e.zcat && (null == t || this._catFitsType(s, t))))
          return void this.bsToast("الفئة «" + e.zcat + "» لا تنتمي إلى النوع المختار");
      }
    } else
      "gate" === t.t
        ? (["loc", "kind", "route", "cls"].forEach(s), n("closed"))
        : (["type", "line", "w"].forEach(s), n("active"), n("hideLabel"));
    Object.keys(e).length
      ? (this._bulk((z) => {
          const q = { ...z, ...e };
          return "zone" === t.t && null != q.ser && "" !== q.ser
            ? { ...q, code: this._composeZoneCode(q.region, q.level, q.ser, null, q.ztype) }
            : q;
        }),
        "gate" === t.t && this.setState({ gates: this._resyncLeaves(this.state.gates) }, () => this.savePlan()),
        this.setState({ bEdit: null }))
      : this.setState({ bEdit: null });
  }
  _bulk(t) {
    const e = this.state,
      s = Array.isArray(e.selMulti) ? e.selMulti : [];
    if (!e.sel || !s.length) return;
    const n = e.sel.t,
      a = "zone" === n ? "zones" : "gate" === n ? "gates" : "paths",
      i = (e[a] || []).map((e, n) => (s.indexOf(n) >= 0 ? t(e, n) : e));
    this.setState({ [a]: i }, () => {
      try {
        this.savePlan();
      } catch (t) {}
    });
  }
  _bulkDelete() {
    if (!this.PC("del")) return void this.permDeny();
    const t = this.state,
      e = Array.isArray(t.selMulti) ? t.selMulti : [];
    if (!t.sel || !e.length) return;
    const s = t.sel.t,
      n = "zone" === s ? "zones" : "gate" === s ? "gates" : "paths",
      a = (t[n] || []).filter((t, s) => e.indexOf(s) < 0);
    this.setState({ [n]: a, sel: null, selMulti: [], bulkAsk: !1 }, () => {
      try {
        this.savePlan();
      } catch (t) {}
    });
  }
  _shiftD(t, e, s) {
    let n = 0;
    return String(t || "").replace(/-?\d*\.?\d+/g, (t) => {
      const a = parseFloat(t) + (n++ % 2 == 0 ? e : s);
      return String(Math.round(100 * a) / 100);
    });
  }

  loadGateOpts() {
    try {
      const t = this._opRead("bassam_gate_opts_v1");
      if (t) {
        const e = t;
        if (e && "object" == typeof e)
          return {
            loc: Array.isArray(e.loc) ? e.loc : [],
            gtype: Array.isArray(e.gtype) ? e.gtype : [],
            kind: Array.isArray(e.kind) ? e.kind : [],
            route: Array.isArray(e.route) ? e.route : [],
            cls: Array.isArray(e.cls) ? e.cls : [],
            cat: Array.isArray(e.cat) ? e.cat : [],
          };
      }
    } catch (t) {}
    return { loc: [], gtype: [], kind: [], route: [], cls: [], cat: [] };
  }
  saveGateOpts(value, defer = false) {
    if (!this.PC("add") && !this.PC("edit") && !this.PC("del")) {
      this.permDeny();
      return Promise.resolve({ ok: 0, err: "denied" });
    }
    this.setState({ gateOpts: value });
    return defer ? null : this._opWrite("bassam_gate_opts_v1", value);
  }
  gateOptList(t) {
    const e = (this.state.gateOpts || {})[t];
    return Array.isArray(e) ? e.filter((t) => "string" == typeof t && t) : [];
  }
  addGateOpt(t) {
    const e = (this.state.gDdNew || "").trim();
    if (!e) return void this.bsToast("اكتب اسم الخيار");
    const s = this.gateOptList(t);
    -1 === s.indexOf(e)
      ? (this.setState({ gDdNew: "" }), this.saveGateOpts({ ...(this.state.gateOpts || {}), [t]: [...s, e] }))
      : this.bsToast("يوجد خيار بهذا الاسم");
  }
  delGateOpt(t, e) {
    const s = this.gateOptList(t),
      n = s[e] && "object" == typeof s[e] ? s[e].n || "" : String(s[e] || ""),
      value = {
        ...(this.state.gateOpts || {}),
        [t]: s.filter((t, s) => s !== e),
      };
    this.saveGateOpts(value, true);
    this._purgeOptEverywhere(
      [{ key: t, name: n }],
      { gates: true },
      { bassam_gate_opts_v1: value },
    );
  }
  saveGateOptEdit() {
    const t = this.state.gDdEdit;
    if (!t) return;
    const e = (this.state.gDdEditVal || "").trim();
    if (!e) return void this.bsToast("اكتب اسم الخيار");
    const s = this.gateOptList(t.key),
      n = s[t.idx];
    if (null != n)
      if (s.some((s, n) => n !== t.idx && s === e))
        this.bsToast("يوجد خيار بهذا الاسم");
      else {
        if (e !== n) {
          const s = (s) => {
            if (!s) return s;
            if ("cat" === t.key) {
              const t = s.cats || [];
              return -1 !== t.indexOf(n) ? { ...s, cats: t.map((t) => (t === n ? e : t)) } : s;
            }
            return s[t.key] === n ? { ...s, [t.key]: e } : s;
          };
          this.setState({
              gates: (this.state.gates || []).map(s),
              floors: (this.state.floors || []).map((t) => ({ ...t, gates: (t.gates || []).map(s) })),
              gEdit: this.state.gEdit ? s(this.state.gEdit) : this.state.gEdit,
            });
        }
        const ix =
          t.idx; /* KIVO_247 (ESLint no-undef): كان `ix` غيرَ معرَّف في الأصل ⇒ ReferenceError عند إعادة تسمية خيار باب — الفهرسُ المقصود فهرسُ الخيار المحرَّر (t.idx)؛ المعاملان داخل map يظلّلان t وs */
        const value = {
          ...(this.state.gateOpts || {}),
          [t.key]: s.map((t, s) => (s === ix ? e : t)),
        };
        this.saveGateOpts(value, e !== n);
        this.setState(
          { gDdEdit: null },
          e !== n
            ? () => this.savePlan({ bassam_gate_opts_v1: value })
            : undefined,
        );
      }
    else this.setState({ gDdEdit: null });
  }
  loadZoneOpts() {
    try {
      const t = this._opRead("bassam_zone_opts_v1");
      if (t) {
        const e = t;
        if (e && "object" == typeof e) {
          const t = (t) =>
            Array.isArray(t)
              ? t
                  .map((t) =>
                    "string" == typeof t
                      ? { n: t, c: "" }
                      : t && t.n
                        ? { n: t.n, c: null == t.c ? "" : String(t.c), ...(t.r ? { r: t.r } : {}) }
                        : null,
                  )
                  .filter(Boolean)
              : [];
          let s = e.zcatStyle && "object" == typeof e.zcatStyle ? e.zcatStyle : {},
            n = +e.hMig || 0;
          if (n < 3) {
            const t = {};
            (Object.keys(s).forEach((e) => {
              const n = s[e];
              if (!n) return void (t[e] = n);
              const a = !1 === n.sAuto;
              t[e] = { ...n, hw: 0.3, hg: 1.6, o: 50, bs: "dash", bw: 1, s: a ? n.s : this._darken(n.f || "#22c55e"), sAuto: !a };
            }),
              (s = t),
              (n = 3));
            try {
              // Legacy display defaults are derived in memory; opening this
              // page never rewrites historical business documents.
            } catch (t) {}
          }
          return {
            region: t(e.region),
            level: t(e.level),
            ztype: Array.isArray(e.ztype) ? e.ztype : [],
            zcat: Array.isArray(e.zcat) ? e.zcat : [],
            zcatStyle: s,
            hMig: n,
          };
        }
      }
    } catch (t) {}
    return {
      region: [],
      level: [],
      ztype: [],
      zcat: [],
      zcatStyle: {},
      hMig: 3,
    };
  }
  saveZoneOpts(value, defer = false) {
    if (!this.PC("add") && !this.PC("edit") && !this.PC("del")) {
      this.permDeny();
      return Promise.resolve({ ok: 0, err: "denied" });
    }
    this.setState({ zoneOpts: value });
    return defer ? null : this._opWrite("bassam_zone_opts_v1", value);
  }
  _catFitsType(t, e) {
    if (!e) return !0;
    const s = t && "object" == typeof t && t.r ? String(t.r) : "";
    if (s) return s === e;
    const n = this._optName(t);
    if (this.zoneOptList("zcat").some((t) => t && "object" == typeof t && t.r === e && t.n === n)) return !1;
    const a = this._typeCats(e);
    if (a) return a.indexOf(this._optName(t)) >= 0;
    const i = this._optTypes(t);
    return i && i.length
      ? i.indexOf(e) >= 0
      : !this.zoneOptList("zcat").some((t) => {
          const s = this._optTypes(t);
          return s && s.length && s.indexOf(e) >= 0;
        });
  }
  _composeZoneCode(t, e, s, n, z) {
    const a = n || this.state.zoneOpts || {},
      i = [],
      r = t
        ? ((t, e) => {
            const s = (Array.isArray(t) ? t : []).find((t) => this._optName(t) === e);
            return s ? this._optCode(s) : "";
          })(a.region, t)
        : "",
      l = e
        ? ((t, e, s) => {
            const n = Array.isArray(t) ? t : [],
              a =
                n.find((t) => this._optName(t) === e && t && t.r === s) ||
                n.find((t) => this._optName(t) === e && !(t && t.r)) ||
                n.find((t) => this._optName(t) === e);
            return a ? this._optCode(a) : "";
          })(a.level, e, t)
        : "";
    const y = z
      ? ((t, e) => {
          const s = (Array.isArray(t) ? t : []).find((t) => this._optName(t) === e);
          return s ? this._optCode(s) : "";
        })(a.ztype, z)
      : "";
    return (r && i.push(r), l && i.push(l), y && i.push(y), i.push(s || "00"), i.join("-"));
  }
  _recomposeZoneCodes(t, related = {}) {
    const e = (e) => {
      if (!e || null == e.ser) return e;
      const s = this._composeZoneCode(e.region, e.level, e.ser, t, e.ztype);
      return s !== e.code ? { ...e, code: s } : e;
    };
    this.setState(
      { zones: (this.state.zones || []).map(e), floors: (this.state.floors || []).map((t) => ({ ...t, zones: (t.zones || []).map(e) })) },
      () => this.savePlan(related),
    );
  }
  addZoneOpt(t) {
    const e = "region" === t || "level" === t || "ztype" === t,
      s = (this.state.zDdNew || "").trim();
    if (!s) return void this.bsToast("اكتب اسم الخيار");
    const n = this.zoneOptList(t);
    if ("level" === t) {
      const t = ((this.state.zEdit || {}).region || "").trim();
      if (!t) return void this.bsToast("اختر المنطقة أولاً — قائمة الأدوار / المستويات تتبع المنطقة المختارة");
      if (n.some((e) => this._optName(e) === s && ((e && e.r) || "") === t))
        return void this.bsToast("يوجد خيار بهذا الاسم في هذه المنطقة");
      const e = (this.state.zDdNewC || "").trim();
      return e
        ? (this.setState({ zDdNew: "", zDdNewC: "" }),
          void this.saveZoneOpts({ ...(this.state.zoneOpts || {}), level: [...n, { n: s, c: e, r: t }] }))
        : void this.bsToast("اكتب الرمز — حرف أو رقم يميّز هذا الخيار");
    }
    if ("zcat" !== t && n.some((t) => this._optName(t) === s)) this.bsToast("يوجد خيار بهذا الاسم");
    else {
      if (e) {
        const e = (this.state.zDdNewC || "").trim();
        return e
          ? ("region" === t || "ztype" === t) && n.some((t) => this._optCode(t) === e)
            ? void this.bsToast("هذا الرمز مستخدم لخيار آخر")
            : (this.setState({ zDdNew: "", zDdNewC: "" }),
              void this.saveZoneOpts({ ...(this.state.zoneOpts || {}), [t]: [...n, "ztype" === t ? { n: s, k: e } : { n: s, c: e }] }))
          : void this.bsToast("اكتب الرمز — حرف أو رقم يميّز هذا الخيار");
      }
      if ((this.setState({ zDdNew: "" }), "zcat" === t)) {
        const t = ((this.state.zEdit || {}).ztype || "").trim();
        if (t)
          return n.some((e) => this._optName(e) === s && ((e && e.r) || "") === t)
            ? void this.bsToast("يوجد فئة بهذا الاسم في هذا النوع")
            : void this.saveZoneOpts({ ...(this.state.zoneOpts || {}), zcat: [...n, { n: s, r: t }] });
      }
      this.saveZoneOpts({ ...(this.state.zoneOpts || {}), [t]: [...n, s] });
    }
  }
  delZoneOpt(t, e) {
    const s = this.zoneOptList(t),
      n = this._optName(s[e]),
      a = { ...(this.state.zoneOpts || {}), [t]: s.filter((t, s) => s !== e) };
    if ("zcat" === t) {
      const t = { ...(a.zcatStyle || {}) },
        i = (s[e] || {}).r || "";
      (i ? delete t[this._zcatKey(i, n)] : delete t[n],
        (a.zcatStyle = t),
        (a.ztype = (a.ztype || []).map((t) => {
          const e = this._optCats(t);
          return !e || e.indexOf(n) < 0 ? t : { ...t, n: this._optName(t), c: e.filter((t) => t !== n) };
        })));
    }
    let i = [];
    if ("region" === t) {
      const t = Array.isArray(a.level) ? a.level : [];
      ((i = t.filter((t) => t && "object" == typeof t && t.r === n).map((t) => t.n)),
        (a.level = t.filter((t) => !(t && "object" == typeof t && t.r === n))));
    }
    this.saveZoneOpts(a, true);
    this._purgeOptEverywhere(
      [{ key: t, name: n }, ...i.map((name) => ({ key: "level", name }))],
      {},
      { bassam_zone_opts_v1: a },
      ["region", "level", "ztype"].includes(t) ? a : null,
    );
  }
  _darken(t, e) {
    try {
      const s = String(t || "")
        .trim()
        .replace("#", "");
      if (!/^[0-9a-fA-F]{6}$/.test(s)) return "#334155";
      const n = parseInt(s, 16),
        a = null == e ? 0.55 : e,
        i = (t) =>
          Math.max(0, Math.min(255, Math.round(t * a)))
            .toString(16)
            .padStart(2, "0");
      return "#" + i((n >> 16) & 255) + i((n >> 8) & 255) + i(255 & n);
    } catch (t) {
      return "#334155";
    }
  }
  zcatStyleOf(t, e) {
    const s = (this.state.zoneOpts || {}).zcatStyle || {},
      n = String(e || "").trim();
    if (n) {
      const e = s[n + " · " + t];
      if (e && e.f) return e;
    }
    const a = s[t];
    return a && a.f ? a : null;
  }
  _mkHatchPattern(t, e, s) {
    const n = React.createElement,
      a = Math.max(1, +e.hg || 1.6),
      i = Math.max(0.1, +e.hw || 0.3),
      r = e.hc || e.s || "#000000",
      l = "diag" === e.h ? "rotate(45)" : "diag2" === e.h ? "rotate(-45)" : "cross" === e.h ? "rotate(45)" : null,
      o = [n("rect", { key: "bg", width: a, height: a, fill: e.f })];
    ("dots" === e.h
      ? o.push(n("circle", { key: "d", cx: a / 2, cy: a / 2, r: i, fill: r }))
      : "horiz" === e.h
        ? o.push(n("line", { key: "l1", x1: 0, y1: a / 2, x2: a, y2: a / 2, stroke: r, strokeWidth: i }))
        : o.push(n("line", { key: "l1", x1: a / 2, y1: 0, x2: a / 2, y2: a, stroke: r, strokeWidth: i })),
      "cross" === e.h && o.push(n("line", { key: "l2", x1: 0, y1: a / 2, x2: a, y2: a / 2, stroke: r, strokeWidth: i })));
    const d = { key: s, id: t, patternUnits: "userSpaceOnUse", width: a, height: a };
    return (l && (d.patternTransform = l), n("pattern", d, o));
  }
  saveZoneOptEdit() {
    const t = this.state.zDdEdit;
    if (!t) return;
    const e = "region" === t.key || "level" === t.key || "ztype" === t.key,
      __zt = "ztype" === t.key,
      s = (this.state.zDdEditVal || "").trim();
    if (!s) return void this.bsToast("اكتب اسم الخيار");
    const n = this.zoneOptList(t.key);
    let a = t.idx;
    if (null == n[a] || (t.was && this._optName(n[a]) !== t.was)) {
      const e = n.findIndex((e) => this._optName(e) === t.was);
      e >= 0 && (a = e);
    }
    const i = n[a];
    if (null == i)
      return (this.bsToast("تعذّر العثور على الخيار — أعد فتح القائمة"), void this.setState({ zDdEdit: null, zDdEditT: null }));
    const r = this._optName(i),
      l = i && "object" == typeof i && i.r ? i.r : "zcat" === t.key ? String((this.state.zEdit || {}).ztype || "").trim() : "",
      o = "level" === t.key || "zcat" === t.key;
    if (n.some((t, e) => e !== a && this._optName(t) === s && (!o || ((t && t.r) || "") === l)))
      return void this.bsToast(
        o ? ("level" === t.key ? "يوجد خيار بهذا الاسم في هذه المنطقة" : "يوجد فئة بهذا الاسم في هذا النوع") : "يوجد خيار بهذا الاسم",
      );
    let d = "";
    if (e) {
      if (((d = (this.state.zDdEditC || "").trim()), !d)) return void this.bsToast("اكتب الرمز — حرف أو رقم يميّز هذا الخيار");
      if (("region" === t.key || "ztype" === t.key) && n.some((t, e) => e !== a && this._optCode(t) === d))
        return void this.bsToast("هذا الرمز مستخدم لخيار آخر");
    }
    if (s !== r) {
      const e = (e) => (!e || e[t.key] !== r || ("level" === t.key && l && e.region !== l) ? e : { ...e, [t.key]: s });
      this.setState({
          zones: (this.state.zones || []).map(e),
          floors: (this.state.floors || []).map((t) => ({ ...t, zones: (t.zones || []).map(e) })),
          zEdit: this.state.zEdit ? e(this.state.zEdit) : this.state.zEdit,
        });
    }
    const h = "ztype" === t.key && Array.isArray(this.state.zDdEditT) ? this.state.zDdEditT.filter(Boolean) : null;
    this.setState({ zDdEdit: null, zDdEditT: null });
    const p = {
      ...(this.state.zoneOpts || {}),
      [t.key]: n.map((t, n) =>
        n === a
          ? __zt
            ? { n: s, k: d, ...(h && h.length ? { c: h } : {}) }
            : e
              ? { n: s, c: d, ...(l ? { r: l } : {}) }
              : h && h.length
                ? { n: s, c: h }
                : l
                  ? { n: s, r: l }
                  : s
          : t,
      ),
    };
    if ("zcat" === t.key && s !== r) {
      const t = { ...(p.zcatStyle || {}) },
        e = this._zcatKey(l, r),
        n = this._zcatKey(l, s);
      (t[e] ? ((t[n] = t[e]), delete t[e]) : t[r] && ((t[n] = t[r]), delete t[r]), (p.zcatStyle = t));
    }
    ("zcat" === t.key &&
      s !== r &&
      (p.ztype = (p.ztype || []).map((t) => {
        const e = this._optCats(t);
        return !e || e.indexOf(r) < 0 ? t : { ...t, n: this._optName(t), c: e.map((t) => (t === r ? s : t)) };
      })),
      this.saveZoneOpts(p, e || s !== r));
    if (e) this._recomposeZoneCodes(p, { bassam_zone_opts_v1: p });
    else if (s !== r)
      this.setState({ zDdEdit: null }, () =>
        this.savePlan({ bassam_zone_opts_v1: p }),
      );
  }
  areaOfZone(t, e) {
    if (t && null != t.area && "" !== t.area && +t.area > 0) return +t.area;
    const s = +e || 0;
    return s > 0 && t && +t.rawA > 0 ? +t.rawA * s * s : null;
  }
  flashSel(t, e) {
    const s = t && t.t,
      n = e || ("gate" === s ? "gates" : "path" === s ? "paths" : "plan");
    (this._flashT && (clearTimeout(this._flashT), (this._flashT = null)),
      this.setState({ sel: t, selMulti: [t.i], lens: n, tool: "select", flash: t }),
      (this._flashT = setTimeout(() => {
        ((this._flashT = null), this.setState({ flash: null }));
      }, 1500)));
  }
  areaIsDerived(t, e) {
    return !(t && null != t.area && "" !== t.area && +t.area > 0) && (+e || 0) > 0 && +(t || {}).rawA > 0;
  }
  DENS_LEVELS = [
    { k: "base", name: "أساسي", v: 0.74, c: "#22c55e" },
    { k: "mid", name: "متوسط", v: 0.66, c: "#e5b563" },
    { k: "high", name: "شديد", v: 0.55, c: "#ef4444" },
  ];
  densLevelOf(t) {
    const e = t && t.dens;
    return (e && this.DENS_LEVELS.find((t) => t.k === e)) || null;
  }
  curDensLevel() {
    return this.densLevelOf((this.state.floors || [])[this.state.floor]);
  }
  shareOfZone(t, e) {
    const s = void 0 === e ? this.curDensLevel() : this.densLevelOf(e);
    return s ? s.v : null;
  }
  capOfZone(t, e, s) {
    const n = this.areaOfZone(t, e),
      a = this.shareOfZone(t, s);
    return n > 0 && a > 0 ? Math.floor(n / a) : null;
  }
  zoneNeeds(t, e, s) {
    const n = this.areaOfZone(t, e) > 0,
      a = this.shareOfZone(t, s) > 0;
    return n && a
      ? ""
      : n || a
        ? n
          ? "يلزم تحديد مستوى الازدحام من الشريط"
          : "تنقصها المساحة"
        : "يلزم تحديد مستوى الازدحام ومساحة المصلى";
  }
  curMpu() {
    return +((this.state.floors || [])[this.state.floor] || {}).mpu || 0;
  }
  _withCaps(t) {
    return (t || []).map((t) => ({ ...t, zones: (t.zones || []).map((e) => ({ ...e, cap: this.capOfZone(e, t.mpu, t) })) }));
  }
  PC(t) {
    try {
      return !!KIVO.BassamPerm && KIVO.BassamPerm.can("plan", t || "view");
    } catch (t) {
      return !1;
    }
  }
  _plCanWrite() {
    return this.PC("edit") || this.PC("approve") || this.PC("add");
  }
  _plPermVals() {
    const t = this._plCanWrite();
    return {
      plPmAdd: this.PC("add"),
      plPmEdit: this.PC("edit"),
      plPmDel: this.PC("del"),
      plPmApprove: this.PC("approve"),
      plPmExport: this.PC("export"),
      plPmWrite: t,
      plPmReadOnly: !t,
      plPmNoteStyle:
        "display:flex;align-items:center;gap:8px;padding:9px 14px;border-radius:12px;background:var(--bg-a1001161390p06);border:1px solid var(--bd-a1001161390p22);font-size:11.5px;font-weight:600;color:var(--fg-x475569);line-height:1.8",
    };
  }
  permDeny() {
    try {
      this.bsToast("صلاحيتك على الخطة التشغيلية لا تشمل هذا الإجراء — راجع مدير الإدارة");
    } catch (t) {}
  }
  async savePlan(related = {}) {
    if (!this.PC("edit") && !this.PC("approve")) return void (this._permWarned1 || ((this._permWarned1 = 1), this.permDeny()));
    this._histPush();
    const t = this.state;
    try {
      let u9 = 0;
      ([
        ["zones", (z) => z.d],
        ["gates", (g) => g.x + "," + g.y],
        ["marks", (m) => m.x + "," + m.y],
      ].forEach(([k9, f9]) => {
        (t[k9] || []).forEach((e9) => {
          e9 && e9.unp && e9.unp !== f9(e9) && (delete e9.unp, u9++);
        });
      }),
        u9 &&
          setTimeout(() => {
            try {
              this.setState((p) => ({ olTick: (p.olTick || 0) + 1 }));
            } catch (x9) {}
          }, 0));
    } catch (e9) {}
    try {
      this._olAudStale && this._olAudStale();
    } catch (e9) {}
    try {
      const A9 = KIVO.BassamAudit;
      if (A9) {
        ((t.floors || []).forEach((f) => {
          f && !f.sid && (f.sid = A9.newId("s_"));
        }),
          (t.floors || []).forEach((f, i) => {
            A9.stampSite(
              i === t.floor ? { zones: t.zones, gates: t.gates, marks: t.marks || [], paths: t.paths || [], sectors: f && f.sectors } : f,
              !0,
            );
          }));
      }
    } catch (e9) {}
    const e = this._withCaps(
        (t.floors || []).map((e, s) =>
          s === t.floor ? { ...e, zones: t.zones, gates: t.gates, marks: t.marks || [], paths: t.paths || [] } : e,
        ),
      ),
      s = { ...(t.planMonths || {}) },
      n = this._mKey(t.year, t.month);
    this._hasPlanFor(s, n) && (s[n] = { ...(s[n] && !Array.isArray(s[n]) ? s[n] : {}), c: 1, d: this._snapshot(e) });
    const a = e.map((t) => {
      const e = { ...t };
      if (e.iid) delete e.img;
      return e;
    });
    const payload = {
      pMig: 3,
      zones: (e[t.floor] || {}).zones || t.zones,
      gates: t.gates,
      marks: t.marks || [],
      paths: t.paths || [],
      floors: a,
      months: s,
      cfg: t.cfg || {},
      delMonths:
        t.delMonths && typeof t.delMonths === "object" ? t.delMonths : {},
    };
    this._opLastSave = this._opCommit({ ...related, bassam_plan_v1: payload });
    const ack = await this._opLastSave;
    if (ack && ack.ok === 1 && !this._pmSyncing) {
      this._pmSyncing = true;
      try {
        this.setState({ planMonths: s });
      } finally {
        this._pmSyncing = false;
      }
    }
    return ack;
  }
  curApproved() {
    const t = this.state.floors && this.state.floors[this.state.floor];
    return (
      (!this.monthPast(this.state.year, this.state.month) || !this.monthOpenFlag(this.state.year, this.state.month)) &&
      (!(!t || !t.approved) || this.monthAutoLocked(this.state.year, this.state.month))
    );
  }
  monthOpenFlag(t, e) {
    const s = (this.state.planMonths || {})[this._mKey(t, e)];
    return !(!s || Array.isArray(s) || !s.mo);
  }
  monthAutoLocked(t, e) {
    return this.monthPast(t, e) && !this.monthOpenFlag(t, e);
  }
  _setMonthOpen(t, e, s) {
    const n = this._mKey(t, e),
      a = { ...(this.state.planMonths || {}) };
    let i = a[n];
    (Array.isArray(i) && (i = { c: 1, d: i }),
      (i = { ...(i || {}) }),
      s ? (i.mo = 1) : delete i.mo,
      Object.keys(i).length ? (a[n] = i) : delete a[n],
      this.setState({ planMonths: a }, () => this.savePlan()));
  }
  monthPast(t, e) {
    const s = this.curHijri(),
      n = void 0 === t ? this.state.year : t,
      a = void 0 === e ? this.state.month : e;
    return n < s.y || (n === s.y && a < s.m);
  }
  _purgeOptEverywhere(fields, options = {}, related = {}, zoneOptions = null) {
    const entries = Array.isArray(fields) ? fields : [];
    const update = (element, kind) => {
      if (!element) return element;
      const next = { ...element };
      entries.forEach(({ key, name }) => {
        if (next[key] === name) next[key] = "";
        if (options.gates && Array.isArray(next.cats))
          next.cats = next.cats.filter((value) => value !== name);
      });
      if (kind === "zones" && zoneOptions && next.ser != null)
        next.code = this._composeZoneCode(
          next.region,
          next.level,
          next.ser,
          zoneOptions,
          next.ztype,
        );
      return next;
    };
    const site = (floor) => ({
      ...floor,
      zones: (floor.zones || []).map((value) => update(value, "zones")),
      gates: options.gates
        ? (floor.gates || []).map((value) => update(value, "gates"))
        : floor.gates,
    });
    const rounds = this._opRead("bassam_rounds_v1");
    if (rounds && typeof rounds === "object") {
      let changed = false;
      Object.keys(rounds).forEach((key) => {
        const rec = rounds[key];
        if (rec && Array.isArray(rec.d) && !rec.ap) {
          rec.d = rec.d.map((floor) => {
            if (!floor || floor.ap) return floor;
            changed = true;
            return site(floor);
          });
        }
      });
      if (changed) related = { ...related, bassam_rounds_v1: rounds };
    }
    const months = {};
    Object.keys(this.state.planMonths || {}).forEach((key) => {
      const entry = this.state.planMonths[key],
        rows = Array.isArray(entry) ? entry : entry && entry.d;
      months[key] = Array.isArray(rows)
        ? {
            ...(Array.isArray(entry) ? {} : entry),
            c: (entry && entry.c) || rows.length,
            d: rows.map(site),
          }
        : entry;
    });
    this.setState(
      {
        zones: (this.state.zones || []).map((value) => update(value, "zones")),
        gates: options.gates
          ? (this.state.gates || []).map((value) => update(value, "gates"))
          : this.state.gates,
        floors: (this.state.floors || []).map(site),
        planMonths: months,
      },
      () => this.savePlan(related),
    );
  }
  _setZoneCap(t) {
    const e = this.state.sel;
    e &&
      "zone" === e.t &&
      this.setState({ zones: this.state.zones.map((s, n) => (n === e.i ? { ...s, ...t } : s)) }, () => this.savePlan());
  }
  saveCalibration() {
    const t = this.state.calAsk;
    if (!t) return;
    const e = parseFloat(t.len);
    e > 0
      ? t.d > 0
        ? this.setState({ calAsk: null, polyCursor: null }, () => this._setMpu(e / t.d))
        : this.setState({ calAsk: null })
      : this.bsToast("أدخل طول الخط بالمتر");
  }
  _setMpu(t) {
    const e = this.state.floor;
    this.setState({ floors: (this.state.floors || []).map((s, n) => (n === e ? { ...s, mpu: t > 0 ? t : null } : s)) }, () =>
      this.savePlan(),
    );
  }
  initState() {
    const t = {
        view: { x: 0, y: 0, w: 1e3, h: 600 },
        year: this.curHijri().y,
        month: this.curHijri().m,
        lens: "plan",
        brkDim: "summary",
        gateDim: "summary",
        markDim: "summary",
        pathDim: "summary",
        distDim: "summary",
        densDim: "summary",
        pickerOpen: !1,
        floor: 0,
        addSiteOpen: !1,
        planAdd: null,
        planLock: null,
        planDelMonth: null,
        tool: "select",
        sel: null,
        selMulti: [],
        draft: null,
        polyPts: [],
        polyCursor: null,
        rotdrag: null,
        pdrag: null,
        pvdrag: null,
        paths: [],
        siteName: "",
        siteModal: null,
        siteDragOver: !1,
        siteLowRes: null,
        pan: null,
        gateOpts: this.loadGateOpts(),
        gDd: null,
        gDdEdit: null,
        gDdNew: "",
        gDdEditVal: "",
        zoneOpts: this.loadZoneOpts(),
        zDd: null,
        zDdEdit: null,
        zDdEditT: null,
        zDdNew: "",
        zDdNewC: "",
        zDdEditVal: "",
        zDdEditC: "",
        ...this.defaults(),
        ...(this.loadPlan() || {}),
      },
      e = t.floor || 0;
    try {
      KIVO.BassamAudit && KIVO.BassamAudit.stampPlan(t, !1);
    } catch (e9) {}
    let s = Array.isArray(t.floors) ? t.floors : [];
    const n = s.some((t) => Array.isArray(t && t.zones));
    ((s = n
      ? s.map((t) => ({
          ...t,
          zones: Array.isArray(t.zones) ? t.zones : [],
          gates: Array.isArray(t.gates) ? t.gates : [],
          marks: Array.isArray(t.marks) ? t.marks : [],
          paths: Array.isArray(t.paths) ? t.paths : [],
        }))
      : s.map((s, n) => ({
          ...s,
          zones: (n === e && t.zones) || [],
          gates: (n === e && t.gates) || [],
          marks: (n === e && t.marks) || [],
          paths: (n === e && t.paths) || [],
        }))),
      (s = s.map((t) => ({ ...t, zones: (t.zones || []).map((t) => (void 0 === t.count ? { ...t, count: null } : t)) }))));
    const a = t.year + "-" + t.month;
    let i = this._normMonths(t.months);
    if (!((t.months && "object" == typeof t.months) || Object.keys(i).length)) {
      const t = this._snapshot(s);
      t.some((t) => (t.zones && t.zones.length) || (t.gates && t.gates.length) || (t.paths && t.paths.length)) && (i[a] = { c: 1, d: t });
    }
    (this._hasPlanFor(i, a) || (s = s.map((t) => ({ ...t, zones: [], gates: [], marks: [], paths: [] }))),
      (s = this._withMonth(s, i, a)),
      (t.planMonths = i),
      (t.floors = s));
    const r = s[e] || {};
    return ((t.zones = r.zones || []), (t.gates = r.gates || []), (t.marks = r.marks || []), (t.paths = r.paths || []), t);
  }
  state = this.initState();
  _audHistOf(t, e) {
    const s = (e && (e.eid || e.id)) || "",
      n = t + ":" + s,
      i = (this.state.audHist || {})[n] || null,
      o = !!(i && i.on),
      r = i && Array.isArray(i.rows) ? i.rows : [],
      A = KIVO.BassamAudit;
    const l = r.map((x) => {
      const v = A ? A.rowVM(x) : {};
      const today = Date.now() - (+x.ts || 0) < 864e5;
      return {
        t: (today ? "" : (v.date || "") + " ") + (v.t || ""),
        by: v.by || "—",
        act: (v.act || "") + (v.ctx ? " — " + v.ctx : ""),
        why: (v.details || [])
          .slice(0, 3)
          .map((d) => d.f + ": " + (d.from ? d.from + " ← " : "") + d.to)
          .join(" · "),
        whyOn: !!(v.details && v.details.length),
        del: !!v.deleted,
      };
    });
    return {
      histHas: !!s && !!A,
      histOn: o,
      histN: i && i.rows ? String(r.length) : "…",
      histTitle: (o ? "طيّ" : "فتح") + " سجل الحركة" + (i && i.rows ? " (" + r.length + ")" : ""),
      histChev: "transition:transform .2s;flex-shrink:0;" + (o ? "transform:rotate(180deg)" : ""),
      histTog: () => {
        const H = this.state.audHist || {},
          E = H[n] || {};
        if (E.on) return void this.setState({ audHist: { ...H, [n]: { ...E, on: !1 } } });
        this.setState({ audHist: { ...H, [n]: { ...E, on: !0, loading: !E.rows } } });
        E.rows ||
          !A ||
          A.entityHistory(t, s).then((res) => {
            const H2 = this.state.audHist || {};
            this.setState({
              audHist: {
                ...H2,
                [n]: { ...(H2[n] || {}), on: !0, loading: !1, rows: res.rows || [], err: res.ok ? "" : res.err || "تعذّر الجلب" },
              },
            });
          });
      },
      histRows: l,
      histEmpty: !!(i && i.rows && !r.length),
      histHead: "سجل الحركة" + (i && i.loading ? " — جارٍ التحميل…" : i && i.err ? " — " + i.err : ""),
    };
  }
  bsMenusPatch() {
    return {
      olFilesOpen: !1,
      olFsOpen: !1,
      olRowMenu: null,
      zDd: null,
      bDd: null,
      gDd: null,
      fldOpen: null,
      pickerOpen: !1,
      toolsOpen: null,
      calOpen: null,
      opGateFly: null,
    };
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
      var n = this,
        a = this.bsMenusPatch(),
        i = {};
      (Object.keys(a).forEach(function (t) {
        i[t] = n.state[t];
      }),
        setTimeout(function () {
          try {
            var t = !1,
              e = !1,
              r = n.state;
            if (
              (Object.keys(a).forEach(function (s) {
                (r[s] !== i[s] && (t = !0), r[s] && (e = !0));
              }),
              t || s || !e)
            )
              return;
            n.setState(a);
          } catch (t) {}
        }, 0));
    } catch (t) {}
  }
  componentDidMount() {
    this._bsSigV = this._bsSig();
    this._bsShown = (t) => {
      try {
        const e = t && t.detail;
        if (!e) return;
        this._bsHiddenNow = "plan" !== e;
        if ("plan" === e) {
          const g = this._bsSig();
          g !== this._bsSigV && ((this._bsSigV = g), this.setState({ _bsTick: Date.now() }));
        }
      } catch (t) {}
    };
    try {
      window.addEventListener("bs:ptab-shown", this._bsShown);
    } catch (t) {}
    try {
      const t = ["zones", "paths", "marks", "gates", "dens"].filter((t) => this.bsLensOn(t));
      if (1 === t.length) {
        const e = t[0],
          s =
            "gates" === e
              ? { panelTab: "gates", lens: "gates", gateDim: "summary" }
              : "marks" === e
                ? { panelTab: "marks", lens: "marks", markDim: "summary" }
                : "dens" === e
                  ? { panelTab: "dens", lens: "density", densDim: "summary" }
                  : "paths" === e
                    ? { panelTab: "paths", lens: "plan", pathDim: "summary" }
                    : { panelTab: "zones", lens: "plan", brkDim: "summary" };
        (this.state.panelTab === s.panelTab && this.state.lens === s.lens) ||
          this.setState(Object.assign({ tool: "select", sel: null, selMulti: [] }, s));
      }
    } catch (t) {}
    ((this._bsOutM = (t) => this._bsOutsideMenus(t)),
      document.addEventListener("click", this._bsOutM, !0),
      (this._wideNow = "undefined" == typeof window || window.innerWidth > 980),
      (this._rs = () => {
        (this._rsT && clearTimeout(this._rsT),
          (this._rsT = setTimeout(() => {
            const t = window.innerWidth > 980;
            t !== this._wideNow && ((this._wideNow = t), this.setState({ panelOpen: t }));
          }, 160)));
      }));
    try {
      (window.addEventListener("resize", this._rs), window.addEventListener("orientationchange", this._rs));
    } catch (t) {}
    ((this._kd = (t) => {
      if (this._bsHiddenNow) return;
      if ("escape" === (t.key || "").toLowerCase() && this.state.zcs) return (t.preventDefault(), void this.setState({ zcs: null }));
      if ("escape" === (t.key || "").toLowerCase() && (this.state.gDd || this.state.gDdEdit || this.state.zDd || this.state.zDdEdit))
        return (t.preventDefault(), void this.setState({ gDd: null, gDdEdit: null, zDd: null, zDdEdit: null, zDdEditT: null }));
      if ("escape" === (t.key || "").toLowerCase() && this.state.sEdit) return (t.preventDefault(), void this.closeSectorEdit());
      if ("escape" === (t.key || "").toLowerCase() && (this.state.zEdit || this.state.gEdit || this.state.pEdit))
        return (t.preventDefault(), void this.closeShapeEditor());
      if ("escape" === (t.key || "").toLowerCase() && (this.state.calMode || this.state.calAsk))
        return (t.preventDefault(), void this.setState({ calMode: null, calAsk: null, polyCursor: null }));
      if (/INPUT|TEXTAREA|SELECT/.test(t.target.tagName)) return;
      const e = t.key.toLowerCase();
      if (/^arrow(up|down|left|right)$/.test(e) && this.state.sel && !this.state.zEdit && !this.state.gEdit && !this.state.pEdit) {
        const s = this.state.sel,
          n = (this.state.view.w / 1e3) * (t.shiftKey ? 10 : 1.5),
          a = "arrowleft" === e ? -n : "arrowright" === e ? n : 0,
          i = "arrowup" === e ? -n : "arrowdown" === e ? n : 0;
        if (!a && !i) return;
        (t.preventDefault(),
          this._arrT && clearTimeout(this._arrT),
          (this._arrT = setTimeout(() => {
            this._arrT = null;
            try {
              this.savePlan();
            } catch (t) {}
          }, 320)));
        const r = Array.isArray(this.state.selMulti) && this.state.selMulti.length ? this.state.selMulti : [s.i],
          l = (t) => r.indexOf(t) >= 0;
        return void ("zone" === s.t
          ? this.setState({
              zones: this.state.zones.map((t, e) =>
                l(e) ? { ...t, d: this._shiftD(t.d, a, i), cx: Math.round((+t.cx || 0) + a), cy: Math.round((+t.cy || 0) + i) } : t,
              ),
            })
          : "gate" === s.t
            ? this.setState({ gates: this.state.gates.map((t, e) => (l(e) ? { ...t, x: t.x + a, y: t.y + i } : t)) })
            : "path" === s.t &&
              this.setState({
                paths: (this.state.paths || []).map((t, e) =>
                  l(e) ? { ...t, pts: (t.pts || []).map((t) => ({ x: t.x + a, y: t.y + i })) } : t,
                ),
              }));
      }
      if ((t.ctrlKey || t.metaKey) && "z" === e) return (t.preventDefault(), void (t.shiftKey ? this.histRedo() : this.histUndo()));
      if ((t.ctrlKey || t.metaKey) && "y" === e) return (t.preventDefault(), void this.histRedo());
      if (!t.ctrlKey && !t.metaKey) {
        if ("escape" === e) {
          const t = this.state,
            e = !!(t.zdrag || t.gdrag || t.pdrag || t.pvdrag || t.vdrag || t.edrag || t.tdrag || t.cresize || t.rdrag || t.rotdrag),
            s = this._lastSnap;
          return e && s && s.floor === t.floor && s.year === t.year && s.month === t.month
            ? void this.setState({
                zones: JSON.parse(JSON.stringify(s.zones)),
                gates: JSON.parse(JSON.stringify(s.gates)),
                marks: JSON.parse(JSON.stringify(s.marks || [])),
                paths: JSON.parse(JSON.stringify(s.paths)),
                zdrag: null,
                gdrag: null,
                pdrag: null,
                pvdrag: null,
                vdrag: null,
                edrag: null,
                tdrag: null,
                cresize: null,
                rdrag: null,
                rotdrag: null,
                pan: null,
                draft: null,
                polyPts: [],
                polyCursor: null,
              })
            : t.draft || (t.polyPts && t.polyPts.length) || t.polyCursor
              ? void this.setState({ draft: null, polyPts: [], polyCursor: null, pan: null, sel: null, selMulti: [] })
              : t.tool && "select" !== t.tool
                ? void this.setState({ tool: "select", draft: null, polyPts: [], polyCursor: null, pan: null, sel: null, selMulti: [] })
                : t.mapFs && !t.sel && !(t.selMulti && t.selMulti.length)
                  ? void (function (o) {
                      try {
                        document.body.style.overflow = "";
                      } catch (t) {}
                      o.setState({ mapFs: !1, draft: null, polyPts: [], polyCursor: null, pan: null });
                    })(this)
                  : void this.setState({ draft: null, polyPts: [], polyCursor: null, pan: null, sel: null, selMulti: [] });
        }
        if (("delete" !== e && "backspace" !== e) || !this.state.sel) {
          if ("v" === e) this.setState({ tool: "select" });
          else if (!this.curApproved()) {
            const t = this.state.lens;
            ("plan" !== t ||
              this.state.zAsn ||
              ("r" === e
                ? this.setState({ tool: "rect" })
                : "s" === e
                  ? this.setState({ tool: "square" })
                  : "c" === e
                    ? this.setState({ tool: "circle" })
                    : "p" === e && this.setState({ tool: "poly" })),
              "gates" === t &&
                "g" === e &&
                !this.state.gAsn &&
                this.bsLensOn("gates") &&
                this.setState({ tool: "gate", sel: null, selMulti: [] }),
              (("plan" === t && !this.state.zAsn) || "paths" === t) &&
                "m" === e &&
                this.bsLensOn("paths") &&
                this.setState({ tool: "path", sel: null, selMulti: [], polyPts: [], polyCursor: null }));
          }
        } else this.removeSel();
      }
    }),
      window.addEventListener("keydown", this._kd),
      (this._shDoc = (t) => {
        if (this.state.fldOpen) {
          const e = document.getElementById("bsFldBox");
          (t.target && t.target.closest && t.target.closest(".bs-pop")) || (e && e.contains(t.target)) || this.setState({ fldOpen: null });
        }
        if (this.state.shapeFly || this.state.clearFly) {
          const e = document.getElementById("bsToolsBar");
          (e && e.contains(t.target)) || this.setState({ shapeFly: null, clearFly: null });
        }
        const e = t.target && t.target.closest ? t.target.closest(".bs-optmenu") : null;
        if ((this.state.gDd || this.state.gDdEdit) && !e) {
          const e = document.getElementById("bsGeDds"),
            s = document.getElementById("bsGeType");
          !e || e.contains(t.target) || (s && s.contains(t.target)) || this.setState({ gDd: null, gDdEdit: null });
        }
        if ((this.state.zDd || this.state.zDdEdit) && !e) {
          const e = document.getElementById("bsZeDds");
          e && !e.contains(t.target) && this.setState({ zDd: null, zDdEdit: null, zDdEditT: null });
        }
        if (this.state.bDd && !e) {
          const e = document.getElementById("bsBkDds");
          e && !e.contains(t.target) && this.setState({ bDd: null });
        }
      }),
      document.addEventListener("mousedown", this._shDoc, !0),
      (this._undoStack = []),
      (this._redoStack = []),
      (this._lastSnap = this._snapNow()),
      this._loadFloorImages());
  }
  _loadFloorImages() {
    if (!KIVO.BassamIDB) return;
    (this.state.floors || []).forEach((floor, index) => {
      if (!floor || !floor.iid || floor.img) return;
      const iid = floor.iid;
      KIVO.BassamIDB.get(iid)
        .then((image) => {
          if (image)
            this.setState((state) => ({
              floors: (state.floors || []).map((current, i) =>
                i === index && current && current.iid === iid
                  ? { ...current, img: image }
                  : current,
              ),
            }));
        })
        .catch(() => {});
    });
  }
  _bsSig() {
    try {
      const K = ["bassam_staffing_v3", "bassam_employees_v1", "bassam_staffing_locks_v1", "bassam_shift_options_v1", "bassam_perms_v1"];
      let o = "";
      for (const k of K) {
        const v =
          this._opService().resources.indexOf(k) >= 0
            ? JSON.stringify(this._opRead(k))
            : localStorage.getItem(k) || "";
        let h = 5381;
        for (let i = 0; i < v.length; i++) h = (h * 33 + v.charCodeAt(i)) | 0;
        o += v.length + ":" + h + ";";
      }
      return o;
    } catch (t) {
      return String(Date.now());
    }
  }
  componentWillUnmount() {
    try {
      window.removeEventListener("bs:ptab-shown", this._bsShown);
    } catch (t) {}
    this._bsOutM && document.removeEventListener("click", this._bsOutM, !0);
    try {
      (window.removeEventListener("resize", this._rs), window.removeEventListener("orientationchange", this._rs));
    } catch (t) {}
    (this._rsT && (clearTimeout(this._rsT), (this._rsT = null)),
      window.removeEventListener("keydown", this._kd),
      this._arrT && (clearTimeout(this._arrT), (this._arrT = null)),
      document.removeEventListener("mousedown", this._shDoc, !0));
  }
  _focusEditor(t) {
    try {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const e = document.getElementById(t);
          if (e)
            try {
              (e.focus(), e.select());
            } catch (t) {}
        }),
      );
    } catch (t) {}
  }
  goSiteRel(t) {
    const e = this.state,
      s = (e.floors || []).map((t, e) => ({ f: t, i: e })).filter((t) => t.f && !t.f.create);
    if (s.length < 2) return;
    const n = s.findIndex((t) => t.i === e.floor),
      a = s[((((n < 0 ? 0 : n) + t) % s.length) + s.length) % s.length].i;
    a !== e.floor &&
      this.setState(
        (t) => {
          const e = t.floors.map((e, s) =>
              s === t.floor ? { ...e, zones: t.zones, gates: t.gates, marks: t.marks || [], paths: t.paths || [] } : e,
            ),
            s = e[a] || {};
          return {
            floors: e,
            floor: a,
            zones: s.zones || [],
            gates: s.gates || [],
            marks: s.marks || [],
            paths: s.paths || [],
            sel: null,
            selMulti: [],
            tool: "select",
            draft: null,
            polyPts: [],
            polyCursor: null,
            hoverZone: null,
            hoverGate: null,
            fldOpen: !1,
          };
        },
        () => this.savePlan(),
      );
  }
  openZoneEditor(t, e) {
    const s = (this.state.zones || [])[t];
    s &&
      this.setState(
        {
          zdrag: null,
          sel: { t: "zone", i: t },
          zDd: null,
          zDdEdit: null,
          zDdEditT: null,
          zDdNew: "",
          zEdit: {
            i: t,
            isNew: !!e,
            yard: s.yard || "",
            code: s.code,
            ser: null != s.ser ? String(s.ser) : /^\d+$/.test(String(s.code || "")) ? String(s.code) : "00",
            cat: s.cat,
            count: null == s.count ? "" : String(s.count),
            hideLabel: !!s.hideLabel,
            region: s.region || "",
            level: s.level || "",
            ztype: s.ztype || "",
            zcat: s.zcat || "",
            pri: s.pri || "",
            off: !!s.off,
            lang: "number" == typeof s.lang ? String(Math.round(10 * s.lang) / 10) : "",
            lsz: "number" == typeof s.lsz ? String(s.lsz) : "",
            needN: null == s.needN ? "" : String(s.needN),
            needS: (() => {
              const t = {},
                e = s.needS || {};
              return (
                Object.keys(e).forEach((s) => {
                  t[s] = String(e[s]);
                }),
                t
              );
            })(),
          },
        },
        () => this._focusEditor("bsZeName"),
      );
  }
  _needShifts(t) {
    let e = [
      { name: "الوردية الأولى", color: "#b99751" },
      { name: "الوردية الثانية", color: "#2f8f86" },
      { name: "الوردية الثالثة", color: "#2f5f8a" },
      { name: "الوردية الرابعة", color: "#1e9a66" },
    ];
    try {
      const t = this._opRead("bassam_shift_options_v1");
      if (t) {
        const s = t;
        Array.isArray(s) &&
          s.length &&
          s.every((t) => t && t.name && t.color) &&
          (e = s);
      }
    } catch (t) {}
    const s = this.state[t],
      n = (s && s.needS) || {},
      a = (() => {
        const t = parseInt(String((s && s.needN) || "").trim(), 10);
        return t > 0 ? t : 0;
      })();
    return e.map((e) => ({
      name: e.name,
      color: e.color,
      val: null == n[e.name] ? "" : String(n[e.name]),
      ph: a ? String(a) : "—",
      onCh: (s) => {
        const n = s.target.value.replace(/[^0-9]/g, "").slice(0, 4),
          a = this.state[t];
        if (!a) return;
        const i = { ...(a.needS || {}) };
        ("" === n ? delete i[e.name] : (i[e.name] = n), this.setState({ [t]: { ...a, needS: i } }));
      },
    }));
  }
  _lensSumPanel9(t) {
    const e = React.createElement,
      s = t.arr.length,
      n = t.arr.filter((e) => t.isOn9(e)).length,
      a = s - n,
      i = s ? Math.round((n / s) * 100) : 0,
      r = KIVO.__bsCssObj,
      l = e(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "stretch",
            gap: 9,
            border: "1px solid var(--bd-xeef0f2)",
            borderRadius: 12,
            padding: 9,
            background: "linear-gradient(180deg,var(--bg-xffffff),var(--bg-xfcfcfd))",
            marginBottom: 10,
            boxShadow: "var(--shadow-card)",
          },
        },
        e(
          "div",
          {
            key: "big",
            title: t.totalTip,
            style: {
              textAlign: "center",
              padding: "0 4px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            },
          },
          e(
            "b",
            { style: { fontSize: 22, fontWeight: 700, lineHeight: 1, color: "var(--fg-x8a6f35)", fontFamily: "'Cairo',sans-serif" } },
            String(s),
          ),
          e(
            "span",
            { style: { fontSize: 9, fontWeight: 400, color: "var(--fg-x94a3b8)", marginTop: 3, whiteSpace: "nowrap" } },
            t.totalLabel,
          ),
          t.subTotal
            ? e(
                "span",
                {
                  title: "العناصر تُعدّ بالباب الأم مرة واحدة، وعدد الأبواب يجمع فتحاتها — كالتقرير الرسمي",
                  style: { fontSize: 8.5, fontWeight: 700, color: "var(--fg-x9a7e40)", marginTop: 2, whiteSpace: "nowrap" },
                },
                t.subTotal,
              )
            : null,
        ),
        e("div", { key: "sp", style: { width: 1, background: "linear-gradient(180deg,transparent,var(--bg-xe6e8eb),transparent)" } }),
        e(
          "div",
          { key: "side", style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 7 } },
          [
            [
              "on",
              n,
              i,
              "var(--success-text)",
              "var(--success)",
              t.onWord,
              ["M22 11.08V12a10 10 0 1 1-5.93-9.14", "m9 11 3 3L22 4"],
              "var(--success-bg)",
              "var(--success-border)",
              t.onDivWord + " ÷ الإجمالي = " + n + " ÷ " + s + " = " + i + "٪" + t.onHint,
            ],
            [
              "off",
              a,
              100 - i,
              "var(--text-faint)",
              "var(--neutral-fill)",
              t.offWord,
              ["M18.36 6.64A9 9 0 1 1 5.64 6.64", "M12 2v10"],
              "var(--bg-surface-2)",
              "var(--border-default)",
              t.offDivWord + " ÷ الإجمالي = " + a + " ÷ " + s + " = " + (100 - i) + "٪",
            ],
          ].map((t) => {
            return e(
              "div",
              { key: t[0], title: t[9], style: { display: "flex", alignItems: "center", gap: 5 } },
              e(
                "span",
                {
                  style: {
                    width: 17,
                    height: 17,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    background: t[7],
                    border: "1px solid " + t[8],
                  },
                },
                ((s = t[6]),
                (n = t[3]),
                e(
                  "svg",
                  {
                    width: 11,
                    height: 11,
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: n,
                    strokeWidth: 2.2,
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    style: { flexShrink: 0 },
                  },
                  s.map((t, s) => e("path", { key: "p" + s, d: t })),
                )),
              ),
              e("span", { style: { fontSize: 10, fontWeight: 400, flexShrink: 0 } }, t[5]),
              ((t, s) => {
                const n = KIVO.BassamMix.rowStyles({ pc: t, color: s, track: "var(--chart-track)" });
                return e(
                  "span",
                  { style: { display: "flex", gap: 1.5, flex: "1 1 auto", minWidth: 44 } },
                  n.cells.map((t, s) => e("i", { key: "b" + s, style: r(t) })),
                );
              })(t[2], t[4]),
              e(
                "span",
                {
                  style: {
                    fontSize: 11,
                    fontWeight: 700,
                    width: 34,
                    textAlign: "left",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                    color: "var(--fg-x8a6f35)",
                    fontFamily: "'Cairo',sans-serif",
                  },
                },
                String(t[1]),
                e(
                  "em",
                  { style: { fontStyle: "normal", fontSize: 7.5, fontWeight: 400, color: "var(--fg-x8e959d)", marginRight: 2 } },
                  t[2] + "٪",
                ),
              ),
            );
            var s, n;
          }),
        ),
      ),
      o = ["var(--brand-primary)", "var(--brand-deep)", "var(--brand-light)", "var(--chart-7)", "var(--chart-9)", "var(--brand-text)"],
      d = r,
      h = { fontSize: 8, fontWeight: 400, opacity: 0.62, marginRight: 2, letterSpacing: 0 },
      p = t.dims
        .map((s, n) => {
          const a = {},
            i = {},
            r = [];
          t.arr.forEach((e) =>
            t.valsOf(e, s[0]).forEach((s) => {
              (null == a[s] && ((a[s] = 0), (i[s] = 0), r.push(s)), a[s]++, t.isOn9(e) && i[s]++);
            }),
          );
          const l = r.map((t) => ({ label: t, n: a[t], on: i[t] })).sort((t, e) => e.n - t.n || t.label.localeCompare(e.label, "ar"));
          if (!l.length) return null;
          const p = l.reduce((t, e) => t + e.n, 0),
            c = t.unitOf(s[0]),
            g = t.catNoteOf(s[0]),
            f = (e) => {
              const n = t.colorOf(s[0], e.label);
              if (n) return n;
              const a = l.indexOf(e);
              return o[(a < 0 ? 0 : a) % o.length];
            },
            u = Math.max(...l.map((t) => t.n)),
            m = Math.min(...l.map((t) => t.n)),
            y = l.filter((t) => t.n === u),
            b = l.filter((t) => t.n === m),
            x = (t, s, n, a) =>
              e(
                "div",
                {
                  key: t ? "hi" : "lo",
                  title:
                    (t ? "الأعلى" : "الأدنى") +
                    " — " +
                    (1 === n.length ? n[0].label : KIVO.BassamCount(n.length, "قيمة|متعادلة") + "") +
                    " · " +
                    a,
                  style: {
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "5px 8px",
                    borderRadius: 10,
                    border: "1px solid var(--bd-xedeff2)",
                    background: "var(--bg-xffffff)",
                    boxShadow: "var(--shadow-card)",
                  },
                },
                e(
                  "span",
                  {
                    key: "bd",
                    style: {
                      width: 20,
                      height: 20,
                      borderRadius: 9999,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "color-mix(in srgb," + s + " 8%,transparent)",
                      border: "1px solid color-mix(in srgb," + s + " 16%,transparent)",
                    },
                  },
                  ((t, s) =>
                    e(
                      "svg",
                      {
                        width: 9,
                        height: 9,
                        viewBox: "0 0 24 24",
                        fill: "none",
                        stroke: s,
                        strokeWidth: 3,
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                        style: { flexShrink: 0 },
                      },
                      e("path", { key: "a", d: t ? "M12 19V5" : "M12 5v14" }),
                      e("path", { key: "b", d: t ? "m5 12 7-7 7 7" : "m19 12-7 7-7-7" }),
                    ))(t, s),
                ),
                e(
                  "span",
                  {
                    key: "v",
                    dir: "ltr",
                    style: {
                      flexShrink: 0,
                      fontSize: 13.5,
                      fontWeight: 700,
                      color: s,
                      lineHeight: 1,
                      fontFamily: "'Cairo',sans-serif",
                      fontFeatureSettings: "'tnum'",
                    },
                  },
                  String(a),
                ),
                e(
                  "span",
                  { key: "tx", style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 } },
                  e(
                    "span",
                    { style: { fontSize: 7.5, fontWeight: 600, color: "var(--fg-xa2a9b2)", lineHeight: 1.2, whiteSpace: "nowrap" } },
                    t ? "الأعلى" : "الأدنى",
                  ),
                  e(
                    "span",
                    { style: { display: "flex", alignItems: "center", gap: 4, minWidth: 0 } },
                    e("i", {
                      style: {
                        width: 7,
                        height: 7,
                        borderRadius: 2,
                        flexShrink: 0,
                        background: 1 === n.length ? f(n[0]) : "var(--bg-xcbd5e1)",
                        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
                      },
                    }),
                    e(
                      "span",
                      {
                        style: {
                          minWidth: 0,
                          fontSize: 9.5,
                          fontWeight: 600,
                          color: "var(--fg-x3f3f3f)",
                          lineHeight: 1.25,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        },
                      },
                      1 === n.length ? n[0].label : n.length + " متعادلة",
                    ),
                  ),
                ),
              ),
            k =
              u === m
                ? e(
                    "div",
                    { style: { display: "flex", gap: 6, marginBottom: 7 } },
                    e(
                      "div",
                      {
                        style: {
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          padding: "6px 8px",
                          borderRadius: 10,
                          border: "1px solid var(--bd-xedeff2)",
                          background: "linear-gradient(180deg,var(--bg-xfcfcfd),var(--bg-xfafbfc))",
                        },
                      },
                      e(
                        "span",
                        {
                          style: {
                            width: 15,
                            height: 15,
                            borderRadius: 9999,
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "var(--bg-xf1f3f5)",
                            border: "1px solid var(--bd-xe6e8eb)",
                          },
                        },
                        e(
                          "svg",
                          {
                            width: 9,
                            height: 9,
                            viewBox: "0 0 24 24",
                            fill: "none",
                            stroke: "currentColor",
                            style: { color: "var(--text-faint)" },
                            strokeWidth: 3,
                            strokeLinecap: "round",
                          },
                          e("path", { key: "e1", d: "M5 9h14" }),
                          e("path", { key: "e2", d: "M5 15h14" }),
                        ),
                      ),
                      e(
                        "span",
                        { style: { fontSize: 9, fontWeight: 400, color: "var(--fg-x8b9099)", whiteSpace: "nowrap" } },
                        "كل القيم متساوية",
                      ),
                      e(
                        "span",
                        {
                          dir: "ltr",
                          style: {
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--fg-x6f7276)",
                            lineHeight: 1,
                            fontFamily: "'Cairo',sans-serif",
                            fontFeatureSettings: "'tnum'",
                          },
                        },
                        String(u),
                      ),
                    ),
                  )
                : e(
                    "div",
                    { style: { display: "flex", gap: 6, marginBottom: 6 } },
                    x(!0, "var(--danger-text)", y, u),
                    x(!1, "var(--success-text)", b, m),
                  ),
            A = e(
              "div",
              {
                key: "hdc",
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "0 1px 5px",
                  borderBottom: "1px solid var(--bd-a185151810p16)",
                  marginBottom: 5,
                },
              },
              e("span", { key: "sp0", style: { flex: "1 1 auto" } }),
              [
                [t.onWord, "var(--success-text)"],
                [t.offWord, "var(--text-faint)"],
                ["الكل", "var(--brand-text)"],
              ].map((t, s) =>
                e(
                  "span",
                  {
                    key: "hc" + s,
                    style: {
                      flex: "0 0 24px",
                      textAlign: "left",
                      fontFamily: "'Cairo',sans-serif",
                      fontFeatureSettings: "'tnum'",
                      fontSize: 7.5,
                      fontWeight: 400,
                      color: t[1],
                    },
                  },
                  t[0],
                ),
              ),
            ),
            v = (s, n, a, i, r, l) => {
              const o = p ? Math.round((n / p) * 100) : 0,
                f = n - a,
                u = n ? Math.round((a / n) * 100) : 0,
                m = p ? (n / p) * 100 : 0,
                y = n ? (a / n) * 100 : 0,
                b = KIVO.BassamMix.rowStyles({ pc: o, lead: r, color: i, track: "rgba(185,151,81,0.12)", num: "#9A7E40", numWidth: 24 }),
                x = d(b.item);
              return (
                r &&
                  ((x.borderTop = "1px solid rgba(185,151,81,0.35)"), (x.marginTop = "5px"), (x.height = "20px"), (x.paddingTop = "4px")),
                e(
                  "div",
                  {
                    key: "r" + s,
                    title:
                      s +
                      " — " +
                      n +
                      " " +
                      c +
                      " (" +
                      o +
                      "٪ من الكل) · " +
                      t.onWord +
                      " " +
                      a +
                      " (" +
                      u +
                      "٪) · " +
                      t.offWord +
                      " " +
                      f +
                      " (" +
                      (100 - u) +
                      "٪)" +
                      g,
                    style: x,
                  },
                  l,
                  e("span", { style: d(b.name) }, s),
                  e(
                    "span",
                    { style: d(b.track) },
                    b.cells.map((t, s) => e("span", { key: "cl" + s, style: d(t) })),
                  ),
                  e("span", { dir: "ltr", style: d(b.numOn) }, String(a), e("span", { style: h }, KIVO.bsPct(y) + "٪")),
                  e("span", { dir: "ltr", style: d(b.numOff) }, String(f), e("span", { style: h }, KIVO.bsPct(100 - y) + "٪")),
                  e("span", { dir: "ltr", style: d(b.num) }, String(n), e("span", { style: h }, KIVO.bsPct(m) + "٪")),
                )
              );
            };
          return e(
            "div",
            {
              key: "sec" + n,
              style: {
                border: "1px solid var(--bd-xeef0f2)",
                borderRadius: 12,
                padding: 8,
                background: "var(--bg-xffffff)",
                boxShadow: "var(--shadow-card)",
                marginBottom: 7,
              },
            },
            e(
              "div",
              { key: "h", style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 7 } },
              e("span", {
                style: { flex: 1, height: 1, background: "linear-gradient(90deg,var(--bg-a185151810) 0%,var(--bg-a185151810p32) 100%)" },
              }),
              e(
                "span",
                {
                  style: {
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    flexShrink: 0,
                    borderRadius: 9999,
                    padding: "2px 9px",
                    background: "var(--bg-xffffff)",
                    border: "1px solid var(--bd-a185151810p3)",
                  },
                },
                e(
                  "span",
                  {
                    style: {
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      color: "var(--fg-xb99751)",
                    },
                  },
                  e(
                    "svg",
                    {
                      width: 11,
                      height: 11,
                      viewBox: "0 0 24 24",
                      fill: "none",
                      stroke: "currentColor",
                      strokeWidth: 2.4,
                      strokeLinecap: "round",
                      strokeLinejoin: "round",
                    },
                    e("path", { d: "M21.21 15.89A10 10 0 1 1 8 2.83" }),
                    e("path", { d: "M22 12A10 10 0 0 0 12 2v10z" }),
                  ),
                ),
                e(
                  "span",
                  { style: { fontSize: 9, fontWeight: 600, color: "var(--fg-x53565a)", whiteSpace: "nowrap", letterSpacing: "-0.01em" } },
                  t.secPrefix ? t.secPrefix + " " + s[1] : s[1],
                ),
              ),
              e("span", {
                style: { flex: 1, height: 1, background: "linear-gradient(90deg,var(--bg-a185151810p32) 0%,var(--bg-a185151810) 100%)" },
              }),
            ),
            k,
            e(
              "div",
              { key: "b", style: { display: "flex", alignItems: "center", gap: 10 } },
              e(
                "div",
                { style: { position: "relative", width: 64, height: 64, flexShrink: 0, display: "grid", placeItems: "center" } },
                KIVO.BassamMix.donutHit(
                  l.map((t) => ({ n: t.n, label: t.label, color: f(t) })),
                  p,
                  64,
                  c,
                  30,
                ),
                e(
                  "span",
                  {
                    style: {
                      position: "relative",
                      zIndex: 2,
                      fontSize: 18,
                      fontWeight: 700,
                      lineHeight: 1,
                      color: "var(--fg-x141414)",
                      fontFamily: "'Cairo',sans-serif",
                    },
                  },
                  String(l.length),
                ),
              ),
              e(
                "div",
                { style: { flex: 1, minWidth: 0 } },
                A,
                l
                  .map((t, s) => {
                    const a = f(t);
                    return v(
                      t.label,
                      t.n,
                      t.on,
                      a,
                      !1,
                      e(
                        "svg",
                        { key: "sw" + n + s, width: 17, height: 11, viewBox: "0 0 17 11", style: { flexShrink: 0, overflow: "visible" } },
                        e("rect", {
                          x: 0.83,
                          y: 0.83,
                          width: 15.35,
                          height: 9.35,
                          rx: 2.8,
                          fill: a,
                          fillOpacity: 0.5,
                          stroke: a,
                          strokeWidth: 0.65,
                          strokeLinejoin: "round",
                        }),
                      ),
                    );
                  })
                  .concat([
                    v(
                      "الإجمالي",
                      p,
                      l.reduce((t, e) => t + e.on, 0),
                      "#9A7E40",
                      !0,
                      e("span", {
                        style: { width: 17, height: 11, borderRadius: 2.5, flexShrink: 0, background: "var(--bg-x9a7e40)", opacity: 0.85 },
                      }),
                    ),
                  ]),
              ),
            ),
          );
        })
        .filter(Boolean);
    return e("div", { key: t.key9 }, l, p);
  }
  _distPanel9(t, e) {
    const s = React.createElement,
      n = (e) => {
        try {
          return (KIVO.BassamEmp && KIVO.BassamEmp.nameOf && KIVO.BassamEmp.nameOf(t.empList, e)) || String(e);
        } catch (t) {
          return String(e);
        }
      },
      a = {};
    e.arr.forEach((t) =>
      (t.emp || []).forEach((t) => {
        a[n(t)] = 1;
      }),
    );
    const i = {};
    [t.gatesAll, t.zonesAll, t.marksAll].forEach((t) =>
      (t || []).forEach((t) =>
        (t.emp || []).forEach((t) => {
          i[n(t)] = 1;
        }),
      ),
    );
    const r = (t.scheduledEmps || []).length > 0,
      l = r ? t.scheduledEmps : t.empList || [],
      o = l.filter((t) => {
        return (
          t &&
          t.name &&
          ((e = t.work),
          0 ===
            String(null == e ? "" : e)
              .trim()
              .split("ـ")
              .join("")
              .split("ى")
              .join("ي")
              .indexOf("ميدان"))
        );
        var e;
      }),
      d = {};
    o.forEach((t) => {
      d[t.name] = 1;
    });
    let h = 0,
      p = 0,
      c = 0,
      g = 0,
      f = 0;
    (Object.keys(i).forEach((t) => {
      d[t] || f++;
    }),
      o.forEach((t) => {
        (h++, i[t.name] ? (p++, a[t.name] && g++) : c++);
      }));
    const u = h ? Math.round((100 * p) / h) : 0,
      m = KIVO.__bsCssObj,
      y =
        (r
          ? "القوة الميدانية من الجدول الشهري كاملةً — المجدولون بورديات هذا الشهر ممن نوع عملهم «ميداني»: " +
            o.length +
            " من " +
            t.scheduledEmps.length +
            " مجدولاً"
          : "لا جدول شهري لهذا الشهر بعد — تُعرض قوة الإدارة الميدانية كاملة من ملف الموظفين (" +
            o.length +
            ")، وبإنشاء جدول الشهر وتسكينه تُحسب القوة من مجدوليه الميدانيين") +
        " — نوع العمل يُحدَّد من عموده في الجدول الشهري، وراحات اليوم تظهر عند التسكين وفي التقرير والجولات لا في قوة الخطة" +
        (f ? " · تنبيه: " + KIVO.BassamCount(f, "تسكين") + " خارج القوة الميدانية" + (r ? " المجدولة" : "") + " — راجعها من السجل" : "") +
        (0 === h
          ? (() => {
              const t = {};
              l.forEach((e) => {
                const s = String((e && e.work) || "").trim() || "غير محدد";
                t[s] = (t[s] || 0) + 1;
              });
              const e = Object.keys(t)
                .sort((e, s) => t[s] - t[e])
                .slice(0, 3)
                .map((e) => "«" + e + "» (" + t[e] + ")")
                .join(" · ");
              return (
                " · القوة صفر لأن لا أحد من " +
                (r ? "المجدولين" : "الموظفين") +
                " نوعُ عمله ميداني — القيم الموجودة الآن: " +
                (e || "لا موظفين") +
                " — صحّحها من عمود «نوع العمل» في الجدول الشهري"
              );
            })()
          : ""),
      b = s(
        "div",
        {
          key: "pcard",
          style: {
            display: "flex",
            alignItems: "stretch",
            gap: 9,
            border: "1px solid var(--bd-xeef0f2)",
            borderRadius: 12,
            padding: 9,
            background: "linear-gradient(180deg,var(--bg-xffffff),var(--bg-xfcfcfd))",
            marginBottom: 10,
            boxShadow: "var(--shadow-card)",
          },
        },
        s(
          "div",
          {
            key: "big",
            title: y,
            style: {
              textAlign: "center",
              padding: "0 4px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: "help",
            },
          },
          s(
            "b",
            { style: { fontSize: 22, fontWeight: 700, lineHeight: 1, color: "var(--fg-x8a6f35)", fontFamily: "'Cairo',sans-serif" } },
            String(h),
          ),
          s(
            "span",
            { style: { fontSize: 9, fontWeight: 400, color: "var(--fg-x94a3b8)", marginTop: 3, whiteSpace: "nowrap" } },
            r ? "القوة الميدانية" : "القوة الميدانية — لا جدول لهذا الشهر بعد",
          ),
        ),
        s("div", { key: "sp", style: { width: 1, background: "linear-gradient(180deg,transparent,var(--bg-xe6e8eb),transparent)" } }),
        s(
          "div",
          { key: "side", style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 7 } },
          [
            [
              "on",
              p,
              u,
              "var(--success-text)",
              "var(--success)",
              "مسكّنون",
              ["M22 11.08V12a10 10 0 1 1-5.93-9.14", "m9 11 3 3L22 4"],
              "var(--success-bg)",
              "var(--success-border)",
              "المسكّنون من الميدانيين على أي عنصر في هذا الموقع: " +
                p +
                " من " +
                h +
                " (" +
                u +
                "٪) — على " +
                e.selfWord +
                " " +
                g +
                " وعلى غيرها " +
                (p - g),
            ],
            [
              "av",
              c,
              100 - u,
              "var(--warning-text)",
              "var(--chart-9)",
              "متاح للتسكين",
              ["M13 2 3 14h9l-1 8 10-12h-9l1-8"],
              "var(--warning-bg)",
              "var(--warning-border)",
              "ميدانيون بلا أي تسكين بعد: " + c + " من " + h + " (" + (100 - u) + "٪) — مسكّنون + متاح = القوة الميدانية دائماً",
            ],
          ].map((t) => {
            return s(
              "div",
              { key: t[0], title: t[9], style: { display: "flex", alignItems: "center", gap: 5 } },
              s(
                "span",
                {
                  style: {
                    width: 17,
                    height: 17,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    background: t[7],
                    border: "1px solid " + t[8],
                  },
                },
                ((e = t[6]),
                (n = t[3]),
                s(
                  "svg",
                  {
                    width: 11,
                    height: 11,
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: n,
                    strokeWidth: 2.2,
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    style: { flexShrink: 0 },
                  },
                  e.map((t, e) => s("path", { key: "p" + e, d: t })),
                )),
              ),
              s("span", { style: { fontSize: 10, fontWeight: 400, flexShrink: 0 } }, t[5]),
              ((t, e) => {
                const n = KIVO.BassamMix.rowStyles({ pc: t, color: e, track: "var(--chart-track)" });
                return s(
                  "span",
                  { style: { display: "flex", gap: 1.5, flex: "1 1 auto", minWidth: 44 } },
                  n.cells.map((t, e) => s("i", { key: "b" + e, style: m(t) })),
                );
              })(t[2], t[4]),
              s(
                "span",
                {
                  style: {
                    fontSize: 11,
                    fontWeight: 700,
                    width: 34,
                    textAlign: "left",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                    color: "var(--fg-x8a6f35)",
                    fontFamily: "'Cairo',sans-serif",
                  },
                },
                String(t[1]),
                s(
                  "em",
                  { style: { fontStyle: "normal", fontSize: 7.5, fontWeight: 400, color: "var(--fg-x8e959d)", marginRight: 2 } },
                  t[2] + "٪",
                ),
              ),
            );
            var e, n;
          }),
        ),
      ),
      x = ["var(--brand-primary)", "var(--brand-deep)", "var(--brand-light)", "var(--chart-7)", "var(--chart-9)", "var(--brand-text)"],
      k = { fontSize: 8, fontWeight: 400, opacity: 0.62, marginRight: 2, letterSpacing: 0 },
      A = (t, e, n, a, i) =>
        s(
          "div",
          {
            key: t,
            style: {
              border: "1px solid var(--bd-xeef0f2)",
              borderRadius: 12,
              padding: 8,
              background: "var(--bg-xffffff)",
              boxShadow: "var(--shadow-card)",
              marginBottom: 7,
            },
          },
          s(
            "div",
            { key: "h", style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 7 } },
            s("span", {
              style: { flex: 1, height: 1, background: "linear-gradient(90deg,var(--bg-a185151810) 0%,var(--bg-a185151810p32) 100%)" },
            }),
            s(
              "span",
              {
                style: {
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  flexShrink: 0,
                  borderRadius: 9999,
                  padding: "2px 9px",
                  background: "var(--bg-xffffff)",
                  border: "1px solid var(--bd-a185151810p3)",
                },
              },
              s(
                "span",
                {
                  style: {
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    color: "var(--fg-xb99751)",
                  },
                },
                s(
                  "svg",
                  {
                    width: 11,
                    height: 11,
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: 2.4,
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                  },
                  s("path", { d: "M21.21 15.89A10 10 0 1 1 8 2.83" }),
                  s("path", { d: "M22 12A10 10 0 0 0 12 2v10z" }),
                ),
              ),
              s(
                "span",
                { style: { fontSize: 9, fontWeight: 600, color: "var(--fg-x53565a)", whiteSpace: "nowrap", letterSpacing: "-0.01em" } },
                e,
              ),
            ),
            s("span", {
              style: { flex: 1, height: 1, background: "linear-gradient(90deg,var(--bg-a185151810p32) 0%,var(--bg-a185151810) 100%)" },
            }),
          ),
          n,
          s("div", { key: "b", style: { display: "flex", alignItems: "center", gap: 10 } }, a, i),
        ),
      v = (t, e, n, a, i) => {
        const r = Math.max(...t.map(e)),
          l = Math.min(...t.map(e)),
          o = t.filter((t) => e(t) === r),
          d = t.filter((t) => e(t) === l),
          h = (t, e, r, l) =>
            s(
              "div",
              {
                key: t ? "hi" : "lo",
                title: (t ? a : i) + " — " + (1 === r.length ? r[0].label : KIVO.BassamCount(r.length, "قيمة|متعادلة") + "") + " · " + l,
                style: {
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "5px 8px",
                  borderRadius: 10,
                  border: "1px solid var(--bd-xedeff2)",
                  background: "var(--bg-xffffff)",
                  boxShadow: "var(--shadow-card)",
                },
              },
              s(
                "span",
                {
                  key: "bd",
                  style: {
                    width: 20,
                    height: 20,
                    borderRadius: 9999,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "color-mix(in srgb," + e + " 8%,transparent)",
                    border: "1px solid color-mix(in srgb," + e + " 16%,transparent)",
                  },
                },
                ((t, e) =>
                  s(
                    "svg",
                    {
                      width: 9,
                      height: 9,
                      viewBox: "0 0 24 24",
                      fill: "none",
                      stroke: e,
                      strokeWidth: 3,
                      strokeLinecap: "round",
                      strokeLinejoin: "round",
                      style: { flexShrink: 0 },
                    },
                    s("path", { key: "a", d: t ? "M12 19V5" : "M12 5v14" }),
                    s("path", { key: "b", d: t ? "m5 12 7-7 7 7" : "m19 12-7 7-7-7" }),
                  ))(t, e),
              ),
              s(
                "span",
                {
                  key: "v",
                  dir: "ltr",
                  style: {
                    flexShrink: 0,
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: e,
                    lineHeight: 1,
                    fontFamily: "'Cairo',sans-serif",
                    fontFeatureSettings: "'tnum'",
                  },
                },
                String(l),
              ),
              s(
                "span",
                { key: "tx", style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 } },
                s(
                  "span",
                  { style: { fontSize: 7.5, fontWeight: 600, color: "var(--fg-xa2a9b2)", lineHeight: 1.2, whiteSpace: "nowrap" } },
                  t ? a : i,
                ),
                s(
                  "span",
                  { style: { display: "flex", alignItems: "center", gap: 4, minWidth: 0 } },
                  s("i", {
                    style: {
                      width: 7,
                      height: 7,
                      borderRadius: 2,
                      flexShrink: 0,
                      background: 1 === r.length ? n(r[0]) : "var(--bg-xcbd5e1)",
                      boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
                    },
                  }),
                  s(
                    "span",
                    {
                      style: {
                        minWidth: 0,
                        fontSize: 9.5,
                        fontWeight: 600,
                        color: "var(--fg-x3f3f3f)",
                        lineHeight: 1.25,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      },
                    },
                    1 === r.length ? r[0].label : r.length + " متعادلة",
                  ),
                ),
              ),
            );
        return r === l
          ? s(
              "div",
              { style: { display: "flex", gap: 6, marginBottom: 7 } },
              s(
                "div",
                {
                  style: {
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "6px 8px",
                    borderRadius: 10,
                    border: "1px solid var(--bd-xedeff2)",
                    background: "linear-gradient(180deg,var(--bg-xfcfcfd),var(--bg-xfafbfc))",
                  },
                },
                s(
                  "span",
                  { style: { fontSize: 9, fontWeight: 400, color: "var(--fg-x8b9099)", whiteSpace: "nowrap" } },
                  "كل القيم متساوية",
                ),
                s(
                  "span",
                  {
                    dir: "ltr",
                    style: {
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--fg-x6f7276)",
                      lineHeight: 1,
                      fontFamily: "'Cairo',sans-serif",
                      fontFeatureSettings: "'tnum'",
                    },
                  },
                  String(r),
                ),
              ),
            )
          : s(
              "div",
              { style: { display: "flex", gap: 6, marginBottom: 6 } },
              h(!0, "var(--danger-text)", o, r),
              h(!1, "var(--success-text)", d, l),
            );
      },
      S = (t, e, n, a) =>
        s(
          "div",
          { style: { position: "relative", width: 64, height: 64, flexShrink: 0, display: "grid", placeItems: "center" } },
          KIVO.BassamMix.donutHit(
            t.map((t) => ({ n: t.n2, label: t.label, color: a(t) })),
            e,
            64,
            n,
            30,
          ),
          s(
            "span",
            {
              style: {
                position: "relative",
                zIndex: 2,
                fontSize: 18,
                fontWeight: 700,
                lineHeight: 1,
                color: "var(--fg-x141414)",
                fontFamily: "'Cairo',sans-serif",
              },
            },
            String(t.length),
          ),
        ),
      w = (t, e) =>
        s(
          "svg",
          { key: e, width: 17, height: 11, viewBox: "0 0 17 11", style: { flexShrink: 0, overflow: "visible" } },
          s("rect", {
            x: 0.83,
            y: 0.83,
            width: 15.35,
            height: 9.35,
            rx: 2.8,
            fill: t,
            fillOpacity: 0.5,
            stroke: t,
            strokeWidth: 0.65,
            strokeLinejoin: "round",
          }),
        ),
      z = e.secDims
        .map((n, a) => {
          const i = {},
            r = [];
          e.arr.forEach((s) => {
            const a = KIVO.BassamNeed.tot(s, t.shiftOpts),
              l = (s.emp || []).length;
            e.valsOf(s, n[0]).forEach((t) => {
              (null == i[t] && ((i[t] = { need: 0, plc: 0 }), r.push(t)), (i[t].need += a), (i[t].plc += l));
            });
          });
          const l = r
            .map((t) => ({ label: t, need: i[t].need, plc: i[t].plc }))
            .sort((t, e) => e.need - t.need || e.plc - t.plc || t.label.localeCompare(e.label, "ar"));
          if (!l.length) return null;
          const o = l.reduce((t, e) => t + e.need, 0),
            d = l.reduce((t, e) => t + e.plc, 0),
            h = (e.unitOf(n[0]), e.catNoteOf(n[0])),
            p = (t) => {
              if (e.locDim && n[0] === e.locDim) {
                const e = this.gateLocColor(t.label);
                if (e) return e;
              }
              const s = l.indexOf(t);
              return x[(s < 0 ? 0 : s) % x.length];
            },
            c = s(
              "div",
              {
                key: "hdc",
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "0 1px 5px",
                  borderBottom: "1px solid var(--bd-a185151810p16)",
                  marginBottom: 5,
                },
              },
              s("span", { key: "sp0", style: { flex: "1 1 auto" } }),
              [
                ["الاحتياج", "var(--brand-text)"],
                ["مسكّن", "var(--success-text)"],
                ["المتبقي", "var(--danger-text)"],
              ].map((t, e) =>
                s(
                  "span",
                  {
                    key: "hc" + e,
                    style: {
                      flex: "0 0 24px",
                      textAlign: "left",
                      fontFamily: "'Cairo',sans-serif",
                      fontFeatureSettings: "'tnum'",
                      fontSize: 7.5,
                      fontWeight: 400,
                      color: t[1],
                    },
                  },
                  t[0],
                ),
              ),
            ),
            g = (t, e, n, a, i, r) => {
              const l = Math.max(0, e - n),
                d = Math.max(0, n - e),
                p = o ? Math.round((e / o) * 100) : 0,
                c = o ? (e / o) * 100 : 0,
                g = e ? Math.round((100 * n) / e) : 0,
                f = e ? (100 * n) / e : 0,
                u = e ? (100 * l) / e : 0,
                y = KIVO.BassamMix.rowStyles({ pc: p, lead: i, color: a, track: "rgba(185,151,81,0.12)", num: "#9A7E40", numWidth: 24 }),
                b = m(y.item);
              i && ((b.borderTop = "1px solid rgba(185,151,81,0.35)"), (b.marginTop = "5px"), (b.height = "20px"), (b.paddingTop = "4px"));
              const x =
                l > 0
                  ? String(y.numOff).split("var(--fg-x94a3b8)").join("var(--danger-text)").split("#94a3b8").join("var(--danger-text)")
                  : y.numOff;
              return s(
                "div",
                {
                  key: "r" + t,
                  title:
                    t +
                    " — الاحتياج " +
                    e +
                    (e ? " (" + p + "٪ من احتياج القسم — مجموع الورديات الأربع)" : " (بلا احتياج مُدخل)") +
                    " · مسكّن " +
                    n +
                    (e ? " (" + g + "٪ من الاحتياج)" : "") +
                    " · المتبقي " +
                    l +
                    (d ? " · فائض " + d + " فوق الاحتياج" : "") +
                    h,
                  style: b,
                },
                r,
                s("span", { style: m(y.name) }, t),
                s(
                  "span",
                  { style: m(y.track) },
                  y.cells.map((t, e) => s("span", { key: "cl" + e, style: m(t) })),
                ),
                s("span", { dir: "ltr", style: m(y.num) }, String(e), s("span", { style: k }, KIVO.bsPct(c) + "٪")),
                s("span", { dir: "ltr", style: m(y.numOn) }, String(n), s("span", { style: k }, e ? KIVO.bsPct(f) + "٪" : "—")),
                s("span", { dir: "ltr", style: m(x) }, String(l), s("span", { style: k }, e ? KIVO.bsPct(u) + "٪" : "—")),
              );
            },
            f = l.map((t) => ({ label: t.label, n2: t.need }));
          return A(
            "nsec" + a,
            "التوزيع بحسب " + n[1],
            v(
              l.map((t) => ({ label: t.label, need: t.need })),
              (t) => t.need,
              (t) => p(l.find((e) => e.label === t.label) || {}),
              "الأعلى احتياجاً",
              "الأدنى احتياجاً",
            ),
            S(f, o, "احتياج", (t) => p(l.find((e) => e.label === t.label) || {})),
            s(
              "div",
              { style: { flex: 1, minWidth: 0 } },
              c,
              l
                .map((t, e) => g(t.label, t.need, t.plc, p(t), !1, w(p(t), "sw" + a + e)))
                .concat([
                  g(
                    "الإجمالي",
                    o,
                    d,
                    "#9A7E40",
                    !0,
                    s("span", {
                      style: { width: 17, height: 11, borderRadius: 2.5, flexShrink: 0, background: "var(--bg-x9a7e40)", opacity: 0.85 },
                    }),
                  ),
                ]),
            ),
          );
        })
        .filter(Boolean),
      E = (() => {
        const a = {},
          i = [];
        e.arr.forEach((e) =>
          (e.emp || []).forEach((e) => {
            const s = t.shiftByName[n(e)] || "بلا وردية";
            (null == a[s] && ((a[s] = 0), i.push(s)), a[s]++);
          }),
        );
        const r = i.map((t) => ({ label: t, n: a[t] })).sort((t, e) => e.n - t.n || t.label.localeCompare(e.label, "ar"));
        if (!r.length) return null;
        const l = r.reduce((t, e) => t + e.n, 0),
          o = (e) => {
            const s = t.shiftOpts.find((t) => t.name === e.label);
            return s ? s.color || "#b99751" : "#94a3b8";
          },
          d = (t, e) => {
            const n = l ? Math.round((t.n / l) * 100) : 0,
              a = l ? (t.n / l) * 100 : 0,
              i = e ? "#9A7E40" : o(t),
              r = KIVO.BassamMix.rowStyles({ pc: n, lead: e, color: i, track: "rgba(185,151,81,0.12)", num: "#9A7E40", numWidth: 30 }),
              d = m(r.item);
            return (
              e && ((d.borderTop = "1px solid rgba(185,151,81,0.35)"), (d.marginTop = "5px"), (d.height = "20px"), (d.paddingTop = "4px")),
              s(
                "div",
                {
                  key: "r" + t.label,
                  title: t.label + " — " + t.n + " من " + KIVO.BassamCount(l, "تسكين", "g") + " (" + n + "٪)",
                  style: d,
                },
                e
                  ? s("span", {
                      style: { width: 17, height: 11, borderRadius: 2.5, flexShrink: 0, background: "var(--bg-x9a7e40)", opacity: 0.85 },
                    })
                  : w(i, "sw" + t.label),
                s("span", { style: m(r.name) }, t.label),
                s(
                  "span",
                  { style: m(r.track) },
                  r.cells.map((t, e) => s("span", { key: "cl" + e, style: m(t) })),
                ),
                s("span", { dir: "ltr", style: m(r.num) }, String(t.n), s("span", { style: k }, KIVO.bsPct(a) + "٪")),
              )
            );
          },
          h = r.map((t) => ({ label: t.label, n2: t.n }));
        return A(
          "shsec",
          "الوردية",
          v(r, (t) => t.n, o, "الأعلى", "الأدنى"),
          S(h, l, "تسكين", (t) => o(t)),
          s("div", { style: { flex: 1, minWidth: 0 } }, r.map((t) => d(t, !1)).concat([d({ label: "الإجمالي", n: l }, !0)])),
        );
      })();
    return s("div", { key: e.key9 }, b, z, E);
  }
  _priSet(t, e, s) {
    if (this.curApproved() || !this._plCanWrite()) return;
    const n = (this.state[t] || []).slice(),
      a = n[e];
    if (!a) return;
    const i = { ...a };
    (s ? (i.pri = s) : delete i.pri, (n[e] = i), this.setState({ [t]: n }, () => this.savePlan()));
  }
  _needList() {
    const t = [
      ["zones", "المصليات", "مصلى", "المصلى"],
      ["marks", "المعالم", "معلم", "المعلم"],
      ["gates", "الأبواب", "باب", "الباب"],
    ].filter((t) => this.bsLensOn(t[0]));
    return "gates" === this.state.lens && this.state.gAsn
      ? t.filter((t) => "gates" === t[0])
      : "plan" === this.state.lens && this.state.zAsn
        ? t.filter((t) => "zones" === t[0])
        : "marks" === this.state.lens && this.state.mAsn
          ? t.filter((t) => "marks" === t[0])
          : t;
  }
  _needKind() {
    const t = this._needList();
    if (!t.length) return null;
    const e = (this.state.needTbl && this.state.needTbl.kind) || "";
    return t.some((t) => t[0] === e) ? t.find((t) => t[0] === e) : t[0];
  }
  _needSet(t, e, s, n) {
    if (this.curApproved() || !this._plCanWrite()) return;
    const a = String(null == n ? "" : n)
        .replace(/[^0-9]/g, "")
        .slice(0, 4),
      i = (this.state[t] || []).slice(),
      r = i[e];
    if (!r) return;
    const l = { ...r };
    if (null == s) {
      const t = parseInt(a, 10);
      l.needN = t > 0 ? t : null;
    } else {
      const t = { ...(l.needS || {}) };
      ("" === a ? delete t[s] : (t[s] = parseInt(a, 10)), (l.needS = Object.keys(t).length ? t : null));
    }
    ((i[e] = l),
      this.setState({ [t]: i }, () => {
        (this._ndtT && clearTimeout(this._ndtT),
          (this._ndtT = setTimeout(() => {
            ((this._ndtT = null), (this._histMerge = "skip"), this.savePlan());
          }, 320)));
      }));
  }
  _needFill(t, e, s) {
    if (this.curApproved() || !this._plCanWrite()) return;
    const n = String(null == e ? "" : e)
        .replace(/[^0-9]/g, "")
        .slice(0, 4),
      a = {};
    (s || []).forEach((t) => {
      const e = t.split(":");
      (a[e[0]] = a[e[0]] || []).push(+e[1]);
    });
    const i = {};
    (Object.keys(a).forEach((e) => {
      const s = (this.state[e] || []).slice();
      (a[e].forEach((e) => {
        const a = s[e];
        if (!a) return;
        const i = { ...a };
        if (null == t) {
          const t = parseInt(n, 10);
          i.needN = t > 0 ? t : null;
        } else {
          const e = { ...(i.needS || {}) };
          ("" === n ? delete e[t] : (e[t] = parseInt(n, 10)), (i.needS = Object.keys(e).length ? e : null));
        }
        s[e] = i;
      }),
        (i[e] = s));
    }),
      Object.keys(i).length &&
        this.setState(i, () => {
          ((this._histMerge = "skip"), this.savePlan());
        }));
  }
  _needChips(t) {
    return this._needShifts(t)
      .filter((t) => "" !== t.val)
      .map((t) => ({
        name: t.name,
        val: t.val,
        dot: "width:7px;height:7px;border-radius:9999px;flex-shrink:0;background:" + t.color,
        chipStyle:
          "display:inline-flex;align-items:center;gap:4px;font-size:9.5px;font-weight:600;color:var(--fg-x53565a);background:var(--bg-xffffff);border:1px solid " +
          t.color +
          "66;border-radius:9999px;padding:1.5px 8px;line-height:1.7;font-feature-settings:'tnum'",
      }));
  }
  _needTotOf(t) {
    const e = this._needShifts(t),
      s = this.state[t],
      n = (() => {
        const t = parseInt(String((s && s.needN) || "").trim(), 10);
        return t > 0 ? t : 0;
      })();
    return e.reduce((t, e) => t + ("" === e.val ? n : parseInt(e.val, 10) || 0), 0);
  }
  openMarkEditor(t, e) {
    const s = (this.state.marks || [])[t];
    s &&
      this.setState({
        mdrag: null,
        sel: { t: "mark", i: t },
        mkEdit: {
          i: t,
          isNew: !!e,
          label: s.label || "",
          kind: s.kind || "",
          pri: s.pri || "",
          hideLabel: !!s.hideLabel,
          off: !!s.off,
          newKind: "",
          needN: null == s.needN ? "" : String(s.needN),
          needS: (() => {
            const t = {},
              e = s.needS || {};
            return (
              Object.keys(e).forEach((s) => {
                t[s] = String(e[s]);
              }),
              t
            );
          })(),
        },
      });
  }
  saveMarkEdit() {
    const t = this.state.mkEdit;
    t &&
      (t.isNew && (this._histMerge = "skip"),
      this.setState(
        {
          marks: (this.state.marks || []).map((e, s) =>
            s === t.i
              ? {
                  ...e,
                  label: (t.label || "").trim() || e.label,
                  kind: t.kind || "",
                  pri:
                    "أ" === t.pri || "ب" === t.pri || "ج" === t.pri
                      ? t.pri
                      : "",
                  hideLabel: !!t.hideLabel,
                  off: !!t.off,
                  needN: (() => {
                    const e = parseInt(String(t.needN || "").trim(), 10);
                    return e > 0 ? e : null;
                  })(),
                  needS: KIVO.BassamNeed.clean(
                    t.needS,
                    t.needN,
                    (() => {
                      let t = [
                        { name: "الوردية الأولى" },
                        { name: "الوردية الثانية" },
                        { name: "الوردية الثالثة" },
                        { name: "الوردية الرابعة" },
                      ];
                      try {
                        const e = this._opRead("bassam_shift_options_v1");
                        if (e) {
                          const s = e;
                          Array.isArray(s) && s.length && (t = s);
                        }
                      } catch (t) {}
                      return t;
                    })(),
                  ),
                }
              : e,
          ),
          mkEdit: null,
        },
        () => this.savePlan(),
      ));
  }
  _liveLeafSync() {
    const t = this.state.gEdit;
    if (!t || t.pOf) return;
    if (this.curApproved() || !this._plCanWrite()) return;
    const e = KIVO.BassamLeaf,
      s = Math.max(1, Math.min(60, parseInt(String(t.leafN || "1"), 10) || 1));
    let n = this.state.gates.slice();
    const a = n[t.i];
    if (!a) return;
    n[t.i] = { ...a, leafN: s, label: (t.label || "").trim() || a.label, num: (t.num || "").trim() };
    const i = e.leavesOf(n, n[t.i]);
    let r = s;
    if (s < i.length) {
      const e = i.reduce((t, e, s) => ((e.emp || []).length > 0 ? s + 1 : t), 0);
      (e > s && (r = e), (n[t.i] = { ...n[t.i], leafN: r }));
    }
    const l = (() => {
        const e = parseInt(String(t.uniNeed || "").trim(), 10);
        return e > 0 ? e : null;
      })(),
      o = e.sync(n, t.i, { uniNeed: l, relayout: i.length !== r }),
      d = o.gates.find((e) => e && e.gid && e.gid === (o.gates[t.i] || {}).gid) || o.gates[t.i],
      h = o.gates.indexOf(d);
    this.setState({ gates: o.gates, gEdit: { ...this.state.gEdit, i: h >= 0 ? h : t.i, gid: (d && d.gid) || "", leafN: String(s) } }, () =>
      this.savePlan(),
    );
  }
  _liveUniNeed() {
    const t = this.state.gEdit;
    if (!t || t.pOf) return;
    if (this.curApproved() || !this._plCanWrite()) return;
    const e = parseInt(String(t.uniNeed || "").trim(), 10);
    if (!(e > 0)) return;
    const s = this.state.gates[t.i];
    s &&
      s.gid &&
      this.setState({ gates: this.state.gates.map((t) => (t && t.pOf === s.gid ? { ...t, needN: e, needS: null } : t)) }, () =>
        this.savePlan(),
      );
  }
  _togLeafExp(t) {
    if (!t) return;
    const e = this.state.gExp || {};
    this.setState({ gExp: { ...e, [t]: !e[t] }, hoverGate: null });
  }
  _resyncLeaves(t) {
    const e = KIVO.BassamLeaf;
    let s = t.slice();
    return (
      s.forEach((t, n) => {
        if (e.isParent(t)) {
          const n = s.indexOf(t);
          n >= 0 && (s = e.sync(s, n, { relayout: !1 }).gates);
        }
      }),
      s
    );
  }
  openGateEditor(t, e) {
    const s = (this.state.gates || [])[t];
    s &&
      this.setState(
        {
          gdrag: null,
          sel: { t: "gate", i: t },
          gDd: null,
          gDdEdit: null,
          gDdNew: "",
          gEdit: {
            i: t,
            isNew: !!e,
            label: s.label,
            hideLabel: !!s.hideLabel,
            num: s.num || "",
            hideNum: !!s.hideNum,
            loc: s.loc || "",
            gtype: s.gtype || "",
            kind: s.kind || "",
            route: s.route || "",
            cls: s.cls || "",
            pri: s.pri || "",
            closed: KIVO.BassamLeaf.closedOf(this.state.gates, s),
            cats: (s.cats || []).slice(),
            gid: s.gid || "",
            pOf: s.pOf || "",
            leafNo: s.leafNo || 0,
            leafN: String(KIVO.BassamLeaf.leafCount(s)),
            uniNeed: KIVO.BassamLeaf.uniNeedOf(this.state.gates, s),
            closed0: KIVO.BassamLeaf.closedOf(this.state.gates, s),
            needN: null == s.needN ? "" : String(s.needN),
            needS: (() => {
              const t = {},
                e = s.needS || {};
              return (
                Object.keys(e).forEach((s) => {
                  t[s] = String(e[s]);
                }),
                t
              );
            })(),
          },
        },
        () => this._focusEditor("bsGeName"),
      );
  }
  openPathEditor(t, e) {
    const s = (this.state.paths || [])[t];
    s &&
      this.setState(
        {
          sel: { t: "path", i: t },
          pEdit: {
            i: t,
            isNew: !!e,
            name: s.name || "",
            code: s.code || "",
            type: s.type || "in",
            dir: s.dir || "fwd",
            line: s.line || "dash",
            w: s.w || "thin",
            active: !1 !== s.active,
            hideLabel: !!s.hideLabel,
            anim: !1 !== s.anim,
            pts0: (s.pts || []).slice(),
            type0: s.type || "in",
            dir0: s.dir || "fwd",
          },
        },
        () => this._focusEditor("bsPeName"),
      );
  }
  saveZoneEdit() {
    const t = this.state.zEdit;
    if (!t) return;
    t.isNew && (this._histMerge = "skip");
    let e = (t.ser || "").trim();
    (e || (e = "00"), 1 === e.length && (e = "0" + e));
    const s = this._composeZoneCode(t.region, t.level, e, null, t.ztype),
      n = (() => {
        const e = String(null == t.lang ? "" : t.lang).trim();
        if ("" === e) return null;
        let s = parseFloat(e);
        return isNaN(s) ? null : ((s = ((s % 360) + 360) % 360), Math.round(10 * s) / 10);
      })(),
      a = (() => {
        const e = String(null == t.lsz ? "" : t.lsz).trim();
        if ("" === e) return null;
        let s = parseFloat(e);
        return isNaN(s) ? null : Math.min(40, Math.max(4, Math.round(10 * s) / 10));
      })();
    this.setState(
      {
        zones: this.state.zones.map((i, r) =>
          r === t.i
            ? {
                ...i,
                code: s,
                ser: e,
                yard: t.yard || "",
                hideLabel: !!t.hideLabel,
                region: t.region || "",
                level: t.level || "",
                ztype: t.ztype || "",
                zcat: t.zcat || "",
                pri:
                  "أ" === t.pri || "ب" === t.pri || "ج" === t.pri ? t.pri : "",
                off: !!t.off,
                lang: null == n ? void 0 : n,
                lsz: null == a ? void 0 : a,
                needN: (() => {
                  const e = parseInt(String(t.needN || "").trim(), 10);
                  return e > 0 ? e : null;
                })(),
                needS: KIVO.BassamNeed.clean(
                  t.needS,
                  t.needN,
                  (() => {
                    let t = [
                      { name: "الوردية الأولى" },
                      { name: "الوردية الثانية" },
                      { name: "الوردية الثالثة" },
                      { name: "الوردية الرابعة" },
                    ];
                    try {
                      const e = this._opRead("bassam_shift_options_v1");
                      if (e) {
                        const s = e;
                        Array.isArray(s) && s.length && (t = s);
                      }
                    } catch (t) {}
                    return t;
                  })(),
                ),
              }
            : i,
        ),
        zEdit: null,
        zDd: null,
        zDdEdit: null,
        zDdEditT: null,
      },
      () => this.savePlan(),
    );
  }
  saveGateEdit() {
    const t = this.state.gEdit;
    if (!t) return;
    t.isNew && (this._histMerge = "skip");
    const e = (t.label || "").trim();
    let s = this.state.gates.map((s, n) =>
      n === t.i
        ? {
            ...s,
            label: e,
            hideLabel: !!t.hideLabel,
            num: (t.num || "").trim(),
            hideNum: !!t.hideNum,
            loc: t.loc || "",
            gtype: t.gtype || "",
            kind: t.kind || "",
            route: t.route || "",
            cls: t.cls || "",
            pri: "أ" === t.pri || "ب" === t.pri || "ج" === t.pri ? t.pri : "",
            closed: !!t.closed,
            cats: (t.cats || []).slice(),
            needN: (() => {
              const e = parseInt(String(t.needN || "").trim(), 10);
              return e > 0 ? e : null;
            })(),
            needS: KIVO.BassamNeed.clean(
              t.needS,
              t.needN,
              (() => {
                let t = [{ name: "الوردية الأولى" }, { name: "الوردية الثانية" }, { name: "الوردية الثالثة" }, { name: "الوردية الرابعة" }];
                try {
                  const e = this._opRead("bassam_shift_options_v1");
                  if (e) {
                    const s = e;
                    Array.isArray(s) && s.length && (t = s);
                  }
                } catch (t) {}
                return t;
              })(),
            ),
          }
        : s,
    );
    if (!t.pOf) {
      const e = KIVO.BassamLeaf,
        n = Math.max(1, Math.min(60, parseInt(String(t.leafN || "1"), 10) || 1));
      s = s.map((e, s) => (s === t.i ? { ...e, leafN: n } : e));
      const a = (() => {
          const e = parseInt(String(t.uniNeed || "").trim(), 10);
          return e > 0 ? e : null;
        })(),
        i = s[t.i],
        r = e.leavesOf(s, i);
      if (n < r.length) {
        const t = r.slice(n),
          e = t.reduce((t, e) => t + (e.emp || []).length, 0);
        if (e > 0 && !this._gShrinkOk) {
          KIVO
            .bsConfirm({
              title: "تقليل عدد الفتحات",
              msg:
                "تقليل عدد الأبواب سيحذف " +
                KIVO.BassamCount(t.length, "فتحة", "g") +
                " " +
                KIVO.BassamCount.agr(t.length, "عليها", "عليهما", "عليها") +
                " " +
                KIVO.BassamCount(e, "موظف|مسكّن") +
                " — هل تريد المتابعة؟",
              ok: "متابعة الحذف",
              danger: !0,
            })
            .then((y) => {
              if (!y) return;
              this._gShrinkOk = 1;
              try {
                this.saveGateEdit();
              } finally {
                this._gShrinkOk = 0;
              }
            });
          return;
        }
      }
      const l = e.sync(s, t.i, { uniNeed: a, relayout: r.length !== n });
      s = l.gates;
      const o = s.find((e) => e && e.gid && e.gid === (s[t.i] || {}).gid) || s[t.i];
      if (o && e.isParent(o)) {
        const e = !!t.closed != !!t.closed0;
        s = s.map((s) =>
          s && s.pOf === o.gid
            ? { ...s, needN: null != a ? a : s.needN, closed: e ? !!t.closed : !!s.closed, needS: null != a ? null : s.needS }
            : s,
        );
      }
    }
    this.setState({ gates: s, gEdit: null, gDd: null, gDdEdit: null }, () =>
      this.savePlan(),
    );
  }
  savePathEdit() {
    const t = this.state.pEdit;
    if (!t) return;
    t.isNew && (this._histMerge = "skip");
    const e = (t.name || "").trim();
    e
      ? this.setState(
          {
            paths: (this.state.paths || []).map((s, n) =>
              n === t.i
                ? {
                    ...s,
                    name: e,
                    code: (t.code || "").trim(),
                    type: t.type || "in",
                    dir: t.dir || "fwd",
                    line: t.line || "dash",
                    w: t.w || "thin",
                    active: !1 !== t.active,
                    hideLabel: !!t.hideLabel,
                    anim: !1 !== t.anim,
                  }
                : s,
            ),
            pEdit: null,
          },
          () => this.savePlan(),
        )
      : this.bsToast("اكتب اسم المسار");
  }
  closeShapeEditor() {
    const t = this.state;
    if (t.zEdit) {
      const e = t.zEdit;
      return (
        e.isNew
          ? ((this._histMerge = "drop"),
            this.setState(
              {
                zEdit: null,
                zDd: null,
                zDdEdit: null,
                zDdEditT: null,
                sel: null,
                selMulti: [],
                zones: (t.zones || []).filter((t, s) => s !== e.i),
              },
              () => this.savePlan(),
            ))
          : this.setState({ zEdit: null, zDd: null, zDdEdit: null, zDdEditT: null }),
        !0
      );
    }
    if (t.gEdit) {
      const e = t.gEdit;
      return (
        e.isNew
          ? ((this._histMerge = "drop"),
            this.setState(
              { gEdit: null, gDd: null, gDdEdit: null, sel: null, selMulti: [], gates: (t.gates || []).filter((t, s) => s !== e.i) },
              () => this.savePlan(),
            ))
          : this.setState({ gEdit: null, gDd: null, gDdEdit: null }),
        !0
      );
    }
    if (t.pEdit) {
      const e = t.pEdit;
      return (
        e.isNew
          ? ((this._histMerge = "drop"),
            this.setState({ pEdit: null, sel: null, selMulti: [], paths: (t.paths || []).filter((t, s) => s !== e.i) }, () =>
              this.savePlan(),
            ))
          : e.pts0
            ? this.setState(
                { pEdit: null, paths: (t.paths || []).map((t, s) => (s === e.i ? { ...t, pts: e.pts0, type: e.type0, dir: e.dir0 } : t)) },
                () => this.savePlan(),
              )
            : this.setState({ pEdit: null }),
        !0
      );
    }
    return !1;
  }
  removeSel() {
    if (!this.PC("del")) return void this.permDeny();
    if (this.curApproved()) return;
    if (this.state.sel && "sector" === this.state.sel.t) return void this.removeSector(this.state.sel.i);
    if ("plan" !== this.state.lens && "gates" !== this.state.lens && "paths" !== this.state.lens && "marks" !== this.state.lens) return;
    if (
      ("gates" === this.state.lens && this.state.gAsn) ||
      ("plan" === this.state.lens && this.state.zAsn) ||
      ("marks" === this.state.lens && this.state.mAsn)
    )
      return;
    const t = this.state.sel;
    if (t)
      if ("zone" === t.t)
        this.setState({ zones: this.state.zones.filter((e, s) => s !== t.i), sel: null, selMulti: [] }, () => this.savePlan());
      else if ("path" === t.t)
        this.setState({ paths: (this.state.paths || []).filter((e, s) => s !== t.i), sel: null, selMulti: [] }, () => this.savePlan());
      else if ("mark" === t.t)
        this.setState({ marks: (this.state.marks || []).filter((e, s) => s !== t.i), sel: null, selMulti: [], mkEdit: null }, () =>
          this.savePlan(),
        );
      else {
        const e = this.state.gates[t.i];
        if (e && e.pOf) return void this.bsToast("الفتحة تابعة لبابها الأم — عدّل «عدد الأبواب» من محرّر الباب الأم", "warn");
        this.setState({ gates: KIVO.BassamLeaf.removeIdx(this.state.gates, t.i), sel: null, selMulti: [] }, () => this.savePlan());
      }
  }
  hGreg(t, e, s) {
    let n = new Date(new Date(2026, 5, 16).getTime() + 864e5 * (29.5306 * (12 * (t - 1448) + (e - 1)) + (s - 1)));
    try {
      for (let a = 0; a < 12; a++) {
        const a = this.hParts(n);
        if (a.y === t && a.m === e && a.d === s) return n;
        const i = 354.367 * (a.y - t) + 29.5306 * (a.m - e) + (a.d - s);
        n = new Date(n.getTime() - 864e5 * (Math.round(i) || (i > 0 ? 1 : -1)));
      }
    } catch (t) {}
    return n;
  }
  hMonthDays(t, e) {
    const s = t + "-" + e;
    if (((this.__hd = this.__hd || {}), this.__hd[s])) return this.__hd[s];
    let n = 30;
    try {
      const s = this.hGreg(t, e, 1),
        a = this.hParts(new Date(s.getTime() + 25056e5));
      n = a.y === t && a.m === e ? 30 : 29;
    } catch (t) {}
    return ((this.__hd[s] = n), n);
  }
  _secs() {
    const t = this.state,
      e = (t.floors || [])[t.floor];
    return e && Array.isArray(e.sectors) ? e.sectors : [];
  }
  _secWrite(t, e) {
    this.setState(
      (e) => ({ floors: (e.floors || []).map((s, n) => (n === e.floor ? { ...s, sectors: t } : s)) }),
      () => {
        (this.savePlan(), e && e());
      },
    );
  }
  _secIn(t, e) {
    let s = !1;
    for (let n = 0, a = e.length - 1; n < e.length; a = n++) {
      const i = e[n].x,
        r = e[n].y,
        l = e[a].x,
        o = e[a].y;
      r > t.y != o > t.y && t.x < ((l - i) * (t.y - r)) / (o - r || 1e-9) + i && (s = !s);
    }
    return s;
  }
  _secD(t) {
    return t && t.length ? "M" + t.map((t) => t.x + " " + t.y).join(" L") + " Z" : "";
  }
  _secPathPts(t) {
    const e = String(t || "").match(/-?\d+(?:\.\d+)?/g) || [],
      s = [];
    for (let t = 0; t + 1 < e.length; t += 2) s.push({ x: +e[t], y: +e[t + 1] });
    return s;
  }
  _secCenter(t, e) {
    if (!t) return null;
    if ("zone" === e) {
      if (null != t.cx && null != t.cy) return { x: +t.cx, y: +t.cy };
      const e = this._secPathPts(t.d);
      return e.length ? { x: e.reduce((t, e) => t + e.x, 0) / e.length, y: e.reduce((t, e) => t + e.y, 0) / e.length } : null;
    }
    return null == t.x || null == t.y ? null : { x: +t.x, y: +t.y };
  }
  _secOf(t, e, s) {
    const n = s || this._secs(),
      a = this._secCenter(t, e);
    if (!a || !n.length) return { sec: null, amb: !1, cands: [] };
    const i = n.filter((t) => t && Array.isArray(t.pts) && t.pts.length >= 3 && this._secIn(a, t.pts));
    if (t.sec) {
      const e = i.find((e) => e.id === t.sec);
      if (e) return { sec: e, amb: !1, cands: i, manual: !0 };
    }
    return 1 === i.length
      ? { sec: i[0], amb: !1, cands: i }
      : i.length > 1
        ? { sec: null, amb: !0, cands: i }
        : { sec: null, amb: !1, cands: [] };
  }
  _secLab(t, e) {
    const s = this._secOf(t, e);
    return s.sec ? this._secLabel(s.sec) : s.amb ? "على حدّ نطاقين" : "خارج النطاقات";
  }
  _secLabel(t) {
    return t ? [t.code, t.name].filter(Boolean).join(" · ") || "نطاق" : "";
  }
  _secWord(t, e) {
    const s = { zone: "مصلى", gate: "باب", mark: "معلم" }[t] || "";
    return "gate" === t
      ? null == e.num || "" === String(e.num).trim()
        ? e.label || s
        : "#" + e.num
      : "zone" === t
        ? e.code || e.name || s
        : e.label || e.kind || s;
  }
  _secElems(t) {
    const e = this.state,
      s = [];
    return (
      [
        ["zone", e.zones || []],
        ["gate", e.gates || []],
        ["mark", e.marks || []],
      ].forEach(([e, n]) => {
        n.forEach((n, a) => {
          if (!n) return;
          if ("gate" === e && n.pOf) return;
          const i = this._secOf(n, e);
          ((i.sec && (!t || i.sec.id === t.id)) || (!t && i.amb) || (t && i.amb && i.cands.some((e) => e.id === t.id))) &&
            s.push({ kind: e, i: a, el: n, of: i });
        });
      }),
      s
    );
  }
  _secCreate(t) {
    const e = [];
    (t || []).forEach((t) => {
      const s = e[e.length - 1];
      (!s || Math.hypot(t.x - s.x, t.y - s.y) > 0.5) && e.push({ x: t.x, y: t.y });
    });
    if (e.length < 3) return void this.setState({ polyPts: [], polyCursor: null });
    const s = this._secs(),
      n = s.map((t) => parseInt(String(t.code || "").replace(/^\D+/, ""), 10) || 0),
      a = Math.max(0, ...n) + 1,
      i = ["#b99751", "#2f8f86", "#2f5f8a", "#1e9a66", "#b45309", "#8b1a3a", "#2f8f86", "#9c3d6b"],
      r = {
        id: "s" + Date.now().toString(36) + Math.floor(1e4 * Math.random()).toString(36),
        code: "N" + (a < 10 ? "0" + a : a),
        name: "نطاق " + a,
        cat: "",
        color: i[s.length % i.length],
        pts: e,
        lead: "",
        note: "",
        emp: [],
        showLbl: !1,
      };
    (this.setState({ polyPts: [], polyCursor: null, sel: { t: "sector", i: s.length }, selMulti: [], tool: "select" }),
      this._secWrite([...s, r], () => this.openSectorEditor(s.length, !0)));
  }
  openSectorEditor(t, e) {
    const s = this._secs()[t];
    s &&
      this.setState(
        {
          sdrag: null,
          svdrag: null,
          sel: { t: "sector", i: t },
          sEdit: {
            i: t,
            isNew: !!e,
            code: s.code || "",
            name: s.name || "",
            cat: s.cat || "",
            color: s.color || "#b99751",
            lead: s.lead || "",
            note: s.note || "",
            showLbl: !0 === s.showLbl,
          },
        },
        () => this._focusEditor("bsSeCode"),
      );
  }
  closeSectorEdit() {
    const t = this.state.sEdit;
    if (!t) return;
    if (t.isNew) {
      const e = this._secs().filter((e, s) => s !== t.i);
      return (this.setState({ sEdit: null, sel: null, selMulti: [] }), void this._secWrite(e));
    }
    this.setState({ sEdit: null });
  }
  saveSectorEdit() {
    const t = this.state.sEdit;
    if (!t) return;
    if (!this.PC(t.isNew ? "add" : "edit")) return void this.permDeny();
    const e = String(t.code || "").trim(),
      s = String(t.name || "").trim();
    if (!e) return void this.bsToast("اكتب رمز النطاق أولاً", "warn");
    if (!s) return void this.bsToast("اكتب اسم النطاق", "warn");
    const n = this._secs();
    if (
      n.some(
        (s, n) =>
          n !== t.i &&
          String(s.code || "")
            .trim()
            .toLowerCase() === e.toLowerCase(),
      )
    )
      return void this.bsToast("الرمز «" + e + "» مستعمل لنطاق آخر في هذا الموقع", "warn");
    const a = n.map((n, a) =>
      a === t.i
        ? {
            ...n,
            code: e,
            name: s,
            cat: String(t.cat || "").trim(),
            color: t.color || n.color || "#b99751",
            lead: t.lead || "",
            note: String(t.note || "").trim(),
            showLbl: !!t.showLbl,
          }
        : n,
    );
    (this.setState({ sEdit: null }),
      this._secWrite(a),
      this._opAck(
        t.isNew
          ? "أُضيف النطاق «" + e + " · " + s + "»"
          : "حُفظت بيانات النطاق",
        "ok",
      ));
  }
  removeSector(t) {
    if (!this.PC("del")) return void this.permDeny();
    if (this.curApproved()) return;
    const e = this._secs(),
      s = e[t];
    if (!s) return;
    const n = e.filter((e, s) => s !== t),
      a = (t) => (t || []).map((t) => (t && t.sec === s.id ? { ...t, sec: "" } : t));
    (this.setState({
      sel: null,
      selMulti: [],
      sEdit: null,
      zones: a(this.state.zones),
      gates: a(this.state.gates),
      marks: a(this.state.marks),
    }),
      this._secWrite(n),
      this._opAck(
        "حُذف النطاق «" +
          this._secLabel(s) +
          "» — بقيت مصلياته وأبوابه ومعالمه في مكانها",
        "ok",
      ));
  }
  _secSetEl(t, e, s) {
    try {
      document.activeElement && document.activeElement.blur();
    } catch (t) {}
    const n = (t) => (t || []).map((t, n) => (n === e ? { ...t, sec: s || "" } : t));
    "zone" === t
      ? this.setState({ zones: n(this.state.zones) }, () => this.savePlan())
      : "gate" === t
        ? this.setState({ gates: n(this.state.gates) }, () => this.savePlan())
        : this.setState({ marks: n(this.state.marks) }, () => this.savePlan());
  }
  _ekeyOf(t) {
    return t && t.eid ? String(t.eid) : String(KIVO.BassamEmp ? KIVO.BassamEmp.key(t) || "" : (t && (t.nid || t.name)) || "");
  }
  renderVals() {
    const t = this._plPermVals(),
      e = this.state,
      s = Array.isArray(e.selMulti) ? e.selMulti : [],
      n = e.sel ? e.sel.t : null,
      a = s.length > 1,
      i = (t, e) => n === t && s.indexOf(e) >= 0,
      r = e.lens + "|" + e.floor + "|" + e.year + "-" + e.month;
    this._histCtx !== r && ((this._histCtx = r), (this._undoStack = []), (this._redoStack = []), (this._lastSnap = this._snapNow()));
    const l = !!e.mapFs,
      o = (() => {
        try {
          return "dark" === localStorage.getItem("bassam_theme");
        } catch (t) {
          return !1;
        }
      })(),
      d = !!(e.floors && e.floors[e.floor] && e.floors[e.floor].approved),
      h =
        "sector" === e.tool && !d
          ? "رسم نطاق: انقر لوضع نقاط الحدود · Shift لخط مستقيم · انقر النقطة الأولى (تتحوّل للأخضر) لإغلاق النطاق · Escape للإلغاء"
          : "dist" === e.lens || ("gates" === e.lens && e.gAsn) || ("plan" === e.lens && e.zAsn) || ("marks" === e.lens && e.mAsn)
            ? d
              ? "الموقع معتمد ومقفل — افتحه من القفل بجانب اسمه في قائمة «الموقع النشط» لتفعيل توزيع الموظفين"
              : "انقر مصلًّى أو باباً أو معلماً لتسكين موظفيه من قائمة الورديات · المسارات هنا خلفية للاستدلال فقط"
            : "density" === e.lens
              ? d
                ? "الموقع معتمد ومقفل — افتحه من القفل بجانب اسمه في قائمة «الموقع النشط» لتفعيل إدخال القراءات"
                : e.calMode
                  ? e.calMode.a
                    ? "المعايرة: انقر الطرف الآخر للخط ثم اكتب طوله الحقيقي بالمتر · Escape للإلغاء"
                    : "المعايرة: انقر الطرف الأول لخطٍّ تعرف طوله على الأرض · Escape للإلغاء"
                  : "انقر مصلًّى لتعريف مساحته ونصيب الفرد فيه فتُحسب سعته · القراءة الميدانية مكانها المتابعة اليومية"
              : d
                ? "الموقع معتمد ومقفل — افتحه من القفل بجانب اسمه في قائمة «الموقع النشط» لتفعيل التعديل"
                : "gate" === e.tool
                  ? "وضع باب: انقر على الخريطة في موضع الباب · تفتح نافذة بياناته فور وضعه · Escape للإلغاء"
                  : "path" === e.tool
                    ? "رسم مسار: انقر لوضع نقاط المسار · Shift لخط مستقيم · نقرة مزدوجة (أو نقرة على آخر نقطة) لإنهائه · Escape للإلغاء"
                    : "poly" === e.tool
                      ? "الرسم الحر: انقر لوضع نقاط الشكل · Shift لخط مستقيم · انقر النقطة الأولى (تتحوّل للأخضر) لإغلاق المصلى · Escape للإلغاء"
                      : "rect" === e.tool || "square" === e.tool || "circle" === e.tool
                        ? "طريقتان للرسم: اضغط واسحب ثم أفلت · أو انقر نقطة البداية وحرّك المؤشر ثم انقر للإنهاء · Escape للإلغاء"
                        : "عدسة التصميم: " +
                          [
                            this.bsLensOn("zones") ? "ارسم المصليات" : "",
                            this.bsLensOn("paths") ? "ارسم المسارات" : "",
                            this.bsLensOn("gates") ? "ضع الأبواب" : "",
                            this.bsLensOn("marks") ? "ضع المعالم" : "",
                          ]
                            .filter(Boolean)
                            .join(" و") +
                          " من شريط واحد · نقرة مزدوجة على أي عنصر تفتح بياناته · Ctrl+Z للتراجع",
      p = this.curHijri(),
      c = this.MONTHS.map((t, s) => {
        const n = s + 1,
          a = e.month === n,
          i = e.year === p.y && n === p.m,
          r = this._mKey(e.year, n),
          l = this._mData(e.planMonths, r),
          o = this._hasPlanFor(e.planMonths, r),
          d = o && l && l.length > 0 && l.every((t) => !!t.approved),
          h = !d && this.monthAutoLocked(e.year, n);
        let c =
            "position:relative;width:100%;border-radius:12px;padding:8px;text-align:center;transition:all .2s;box-shadow:var(--shadow-card);cursor:pointer;box-sizing:border-box;font-family:'Cairo',sans-serif;border:1px ",
          g = "#53565a",
          f = "#cbd5e1",
          u = "—",
          m = !1,
          y = "M12 3a9 9 0 0 1 9 9",
          b = "M12 21a9 9 0 0 1-9-9";
        return (
          d
            ? ((c +=
                (a ? "solid #008450;box-shadow:0 0 0 2px rgba(0,132,80,0.25);" : "solid rgba(0,132,80,0.35);") +
                "background:var(--bg-a0132800p07)"),
              (g = "#047857"),
              (f = "#047857"),
              (u = "مقفل"),
              (m = !0),
              (y = "M7 11V7a5 5 0 0 1 10 0v4"),
              (b = "M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z"))
            : h
              ? ((c +=
                  (a ? "solid #64748b;box-shadow:0 0 0 2px rgba(100,116,139,0.25);" : "solid rgba(100,116,139,0.35);") +
                  "background:var(--bg-a1001161390p08)"),
                (g = "#475569"),
                (f = "#475569"),
                (u = "انقضى — مقفل"),
                (m = !0),
                (y = "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"),
                (b = ""))
              : o
                ? ((c +=
                    (a ? "solid #b99751;box-shadow:0 0 0 2px rgba(185,151,81,0.3);" : "solid rgba(245,158,11,0.35);") +
                    "background:var(--bg-a245158110p08)"),
                  (g = a ? "#b99751" : "#b45309"),
                  (f = "#b45309"),
                  (u = "مسودة"),
                  (m = !0),
                  (y = "M7 11V7a5 5 0 0 1 9.9-1"),
                  (b = "M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z"))
                : a
                  ? ((c += "solid #b99751;box-shadow:0 0 0 2px rgba(185,151,81,0.3);background:var(--bg-a185151810p06)"),
                    (g = "#b99751"),
                    (f = "#cbd5e1"),
                    (u = "—"),
                    (m = !1))
                  : (c += "dashed #E1E1E1;background:var(--bg-a2452452450p7);opacity:.9"),
          {
            name: t,
            greg: this.gregOf(e.year, s),
            style: c,
            nameColor: g,
            footColor: f,
            footLabel: u,
            footP1: y,
            footP2: b,
            footIcon: m,
            isCurrent: i,
            showBadge: !1,
            badgeBg: "",
            badgeP1: "",
            badgeP2: "",
            showCoverage: !1,
            coverage: "",
            hasData: o && !d,
            delAll: (t) => {
              (t.stopPropagation(), this.setState({ planDelMonth: { y: e.year, m: n } }));
            },
            click: () => this.goTo(e.year, n),
            dbl: () => {
              if (this.monthPast(e.year, n))
                return this.monthOpenFlag(e.year, n)
                  ? d || !o
                    ? void this.setState({ retroAsk: { y: e.year, m: n, open: !1 } })
                    : void this.setState({ planLock: { y: e.year, m: n, approved: !1 } })
                  : d
                    ? void this.setState({ planLock: { y: e.year, m: n, approved: !0 } })
                    : void this.setState({ retroAsk: { y: e.year, m: n, open: !0 } });
              d
                ? this.setState({ planLock: { y: e.year, m: n, approved: !0 } })
                : o && this.setState({ planLock: { y: e.year, m: n, approved: d } });
            },
          }
        );
      }),
      g = { men: "#22c55e", women: "#93c5fd", service: "#374151" };
    let f = [];
    try {
      const t = this._opRead("bassam_employees_v1");
      t && (f = t);
    } catch (t) {}
    const TK = (t) => (KIVO.BassamEmp ? KIVO.BassamEmp.tokens(t) : [t && t.eid, t && t.nid, t && t.name]).filter(Boolean).map(String),
      u = {};
    f.forEach((t) => {
      if (!t) return;
      (TK(t).forEach((e) => {
        void 0 === u[e] && (u[e] = t);
      }),
        t.name && (u[t.name] = t));
    });
    let m = {};
    try {
      const t = this._opRead("bassam_staffing_v3");
      if (t) {
        const e = t;
        e &&
          "object" == typeof e &&
          (m = KIVO.BassamStaffSnap ? KIVO.BassamStaffSnap.all(e) : e);
      }
    } catch (t) {}
    let y = [
      { name: "الوردية الأولى", color: "#b99751" },
      { name: "الوردية الثانية", color: "#2f8f86" },
      { name: "الوردية الثالثة", color: "#2f5f8a" },
      { name: "الوردية الرابعة", color: "#1e9a66" },
    ];
    try {
      const t = this._opRead("bassam_shift_options_v1");
      if (t) {
        const e = t;
        Array.isArray(e) &&
          e.length &&
          e.every((t) => t && t.name && t.color) &&
          (y = e);
      }
    } catch (t) {}
    const b = y.map((t) => t.name),
      x = (() => {
        const t = /^\s*الوردية\s+/,
          e = y.map((e) => e.name.replace(t, "").trim() || e.name),
          s = y.map((e) => t.test(e.name)),
          n = e.map((t, e) => (s[e] && t.split(/\s+/)[0]) || t),
          a = n.slice(),
          i = {};
        (n.forEach((t, e) => {
          (i[t] = i[t] || []).push(e);
        }),
          Object.keys(i).forEach((t) => {
            const s = i[t];
            if (s.length <= 1) return;
            const n = s.map((s) => e[s].slice(t.length).trim()),
              r = Math.max(0, ...n.map((t) => t.length));
            let l = 1,
              o = s.map(() => t);
            for (; l <= r && ((o = s.map((e, s) => (n[s] ? t + " " + n[s].slice(0, l) : t))), new Set(o).size !== o.length); ) l++;
            s.forEach((t, e) => {
              a[t] = o[e];
            });
          }));
        const r = {};
        return (
          y.forEach((t, e) => {
            r[t.name] = a[e] || t.name;
          }),
          r
        );
      })(),
      k = m[e.year + "-" + e.month] || {},
      A = {},
      v = f.filter((t) => {
        const e = ((t) => {
          const e = t ? (KIVO.BassamEmp ? KIVO.BassamEmp.entry(k, t) : k[t.eid || t.nid || t.name || ""]) : null,
            s = e && e.shift,
            n = "string" == typeof s && s.trim() ? s.trim() : "";
          return -1 !== b.indexOf(n) ? n : "";
        })(t);
        return (
          !!e &&
          (TK(t).forEach((s) => {
            A[s] = e;
          }),
          !0)
        );
      });
    let S = v.map((t) => this._ekeyOf(t)),
      w = "";
    try {
      w = new Date().toLocaleDateString("ar-SA-u-nu-latn", { weekday: "long" });
    } catch (t) {}
    const z = (() => {
        try {
          const t = KIVO.BassamHijri && KIVO.BassamHijri.now ? KIVO.BassamHijri.now(new Date()) : null;
          return t && KIVO.BassamDay ? KIVO.BassamDay.of(t.y, t.m, t.d) : null;
        } catch (t) {
          return null;
        }
      })(),
      E = {};
    v.forEach((t) => {
      if (z)
        return void (
          z.restToday(t) &&
          TK(t).forEach((e) => {
            E[e] = 1;
          })
        );
      (((KIVO.BassamEmp ? KIVO.BassamEmp.entry(k, t) : k[t.eid || t.nid || t.name || ""]) || {}).rest || []).some(
        (t) => t === w || "ال" + t === w || t === "ال" + w,
      ) &&
        TK(t).forEach((e) => {
          E[e] = 1;
        });
    });
    const M = (t) => {
        if (!KIVO.BassamNeed.has(t, y) || t.off) return null;
        const e = KIVO.BassamNeed.tot(t, y),
          s = (t.emp || []).filter((t) => A[t]).length;
        return e ? Math.round((100 * s) / e) : null;
      },
      O = (t, e) => {
        if (!t) return null;
        const s = [],
          n = !(!t.off && !t.closed),
          a = KIVO.BassamNeed.tot(t, y),
          i = (t.emp || []).filter((t) => A[t]).length,
          r = (t) => (e.unshift.apply(e, s), t);
        if ((s.push({ label: "الاحتياج (لكل الورديات)", value: a ? i + " من " + a : "غير محدَّد", wide: !a }), n))
          return (
            s.push({
              label: "التغطية",
              value: (t.closed ? "الباب مغلق" : t.d ? "المصلى معطّل" : "المعلم معطّل") + " — لا يُحتسب في التغطية",
              wide: !0,
            }),
            r(null)
          );
        if (!a) return (s.push({ label: "التغطية", value: "لا تُحسب بلا احتياج — حدّده من جدول الاحتياج", wide: !0 }), r(null));
        const l = M(t),
          o = C(t);
        if (null == l) return r(null);
        const d = (t.emp || []).filter((t) => E[t]).length;
        return (
          s.push({ label: "التغطية المخططة", value: l + "٪" }),
          d > 0 &&
            null != o &&
            o !== l &&
            s.push({
              label: "الفعلية اليوم (" + d + " في راحة)",
              value: o + "٪",
              color: o >= 100 ? "#6ee7b7" : o >= 60 ? "#fcd34d" : "#fca5a5",
            }),
          r(P(t))
        );
      },
      C = (t) => {
        if (!KIVO.BassamNeed.has(t, y) || t.off) return null;
        const e = KIVO.BassamNeed.tot(t, y),
          s = (t.emp || []).filter((t) => A[t] && !E[t]).length;
        return e ? Math.round((100 * s) / e) : null;
      },
      P = (t) => {
        if (t && t.off) return "#94a3b8";
        const e = C(t);
        if (null == e) return (t.emp || []).length > 0 ? "#22c55e" : "#ef4444";
        if (e >= 100) return "#16a34a";
        const s = Math.min(1, Math.max(0, e / 100));
        return s < 0.5 ? T([239, 68, 68], [245, 158, 11], 2 * s) : T([245, 158, 11], [34, 197, 94], 2 * (s - 0.5));
      },
      T = (t, e, s) =>
        "rgb(" +
        Math.round(t[0] + (e[0] - t[0]) * s) +
        "," +
        Math.round(t[1] + (e[1] - t[1]) * s) +
        "," +
        Math.round(t[2] + (e[2] - t[2]) * s) +
        ")",
      F = +(e.floors[e.floor] || {}).mpu || 0,
      L = (t) => this.areaOfZone(t, F),
      D = (t) => this.shareOfZone(t),
      N = (t) => this.capOfZone(t, F),
      B = (e.zones || []).map(N).filter((t) => null != t && t > 0),
      W = B.length ? Math.max.apply(null, B) : 0,
      I = (t) => {
        if (t && t.off) return "#94a3b8";
        const e = N(t);
        if (null == e || W <= 0) return "#cbd5e1";
        const s = Math.max(0.12, Math.min(1, e / W));
        return T([246, 237, 213], [154, 126, 64], s);
      },
      j = (t) => (null == t ? "—" : Number(t).toLocaleString("en-US")),
      R = (t) => (null == t ? "—" : (Math.round(10 * t) / 10).toLocaleString("en-US")),
      G = (t) => {
        const e = String((t && t.d) || "").match(/[MLHVQCZ]|-?\d+(?:\.\d+)?/gi) || [],
          s = [];
        let n = 0,
          a = 0,
          i = 0,
          r = "";
        for (; n < e.length; ) {
          const t = e[n];
          /^[MLHVQCZ]$/i.test(t)
            ? ((r = t.toUpperCase()), n++)
            : "M" === r || "L" === r
              ? ((a = +e[n]), (i = +e[n + 1]), (n += 2), s.push({ x: a, y: i }))
              : "Q" === r
                ? ((a = +e[n + 2]), (i = +e[n + 3]), (n += 4), s.push({ x: a, y: i }))
                : "C" === r
                  ? ((a = +e[n + 4]), (i = +e[n + 5]), (n += 6), s.push({ x: a, y: i }))
                  : "H" === r
                    ? ((a = +e[n]), n++, s.push({ x: a, y: i }))
                    : "V" === r
                      ? ((i = +e[n]), n++, s.push({ x: a, y: i }))
                      : n++;
        }
        if (s.length > 1) {
          const t = s[0],
            e = s[s.length - 1];
          Math.abs(t.x - e.x) < 0.6 && Math.abs(t.y - e.y) < 0.6 && s.pop();
        }
        return s;
      },
      Z = { x: 0, y: 0 },
      Y = (t, e) => {
        e = e || [];
        const s = (t) => Math.round(100 * t) / 100,
          n = (t) => e[t] || { in: Z, out: Z };
        let a = "M" + s(t[0].x) + " " + s(t[0].y);
        for (let e = 0; e < t.length; e++) {
          const i = t[e],
            r = t[(e + 1) % t.length],
            l = n(e).out || Z,
            o = n((e + 1) % t.length).in || Z,
            d = Math.abs(l.x) + Math.abs(l.y) + Math.abs(o.x) + Math.abs(o.y) >= 0.5,
            h = e === t.length - 1;
          d
            ? (a += " C" + s(i.x + l.x) + " " + s(i.y + l.y) + " " + s(r.x + o.x) + " " + s(r.y + o.y) + " " + s(r.x) + " " + s(r.y))
            : h || (a += " L" + s(r.x) + " " + s(r.y));
        }
        return a + " Z";
      },
      H = (t, e) => {
        let s = !1;
        for (let n = 0, a = e.length - 1; n < e.length; a = n++) {
          const i = e[n].x,
            r = e[n].y,
            l = e[a].x,
            o = e[a].y;
          r > t.y != o > t.y && t.x < ((l - i) * (t.y - r)) / (o - r || 1e-9) + i && (s = !s);
        }
        return s;
      },
      X = (t, e) => {
        let s = 0,
          n = 0,
          a = 0;
        for (let t = 0; t < e.length; t++) {
          const i = (t + 1) % e.length;
          ((s += e[t].x * e[i].y - e[i].x * e[t].y), (n += e[t].x), (a += e[t].y));
        }
        return { ...t, d: Y(e, t.hs), rawA: Math.abs(s / 2), cx: Math.round(n / e.length), cy: Math.round(a / e.length) };
      },
      K = (e.zoneOpts || {}).zcatStyle || {},
      U = Object.keys(K),
      J =
        !0 !== (e.floors[e.floor] || {}).hideZones && this.bsLensOn("zones")
          ? e.zones.map((t, s) => {
              const n = i("zone", s),
                a = !(!e.flash || "zone" !== e.flash.t || e.flash.i !== s),
                r = "paths" === e.lens || "gates" === e.lens || "marks" === e.lens,
                l = !!t.off && ("plan" === e.lens || "density" === e.lens || "dist" === e.lens),
                o = t.zcat ? (String(t.ztype || "").trim() ? String(t.ztype).trim() + " · " + t.zcat : t.zcat) : "",
                h = o && K[o] && K[o].f ? K[o] : t.zcat && K[t.zcat] && K[t.zcat].f ? K[t.zcat] : null,
                p = r || l || "plan" !== e.lens || e.zAsn ? null : h;
              return {
                d: t.d,
                fill:
                  "density" === e.lens
                    ? I(t)
                    : "dist" === e.lens || ("plan" === e.lens && e.zAsn)
                      ? P(t)
                      : r
                        ? "#cbd5e1"
                        : l
                          ? "#94a3b8"
                          : p
                            ? p.h && "none" !== p.h
                              ? "url(#bsZp" + U.indexOf(o && K[o] ? o : t.zcat) + ")"
                              : p.f
                            : g[t.cat],
                cur: d || r ? "default" : "plan" === e.lens ? "move" : "pointer",
                fo: a ? "0.9" : n ? "0.72" : r ? "0.3" : l ? "0.62" : p ? String((null != p.o ? p.o : 50) / 100) : "0.45",
                so: a || n ? "1" : r ? "0.5" : l ? "0.7" : p ? "0.9" : "0.65",
                stroke: a || n ? "#b99751" : r ? "#94a3b8" : l ? "#000000" : p ? p.s : "#334155",
                sw: (() => {
                  const t = e.view.w / 1e3,
                    s = p ? +p.bw || 1 : 0.7;
                  return String((a ? Math.max(3.2, s + 2.6) : n ? Math.max(1.8, s + 1.1) : s) * t);
                })(),
                dash: (() => {
                  const t = e.view.w / 1e3,
                    s = (p && p.bs) || "dash";
                  return a || n
                    ? "none"
                    : p
                      ? "solid" === s
                        ? "none"
                        : "dot" === s
                          ? String(0.9 * t) + " " + String(3.4 * t)
                          : String(6 * t) + " " + String(4 * t)
                      : String(3.5 * t) + " " + String(2.5 * t);
                })(),
                lc: p && "dot" === p.bs ? "round" : "butt",
                click: (t) => {
                  if ("paths" === this.state.lens || "gates" === this.state.lens) return;
                  if ("gate" === this.state.tool || "path" === this.state.tool || "mark" === this.state.tool) return;
                  const e = !this.curApproved() && "plan" === this.state.lens && !this.state.zAsn,
                    n = this.state.polyPts.length > 0 || !!this.state.draft;
                  if ("select" !== this.state.tool) {
                    if (!e || n)
                      return void (
                        n ||
                        this.curApproved() ||
                        !(
                          (("dist" === this.state.lens || ("plan" === this.state.lens && this.state.zAsn)) && this._distPickOk()) ||
                          "density" === this.state.lens
                        ) ||
                        (t.stopPropagation(),
                        this.setState({ tool: "select", draft: null, polyPts: [], polyCursor: null }),
                        this._pickSel("zone", s, t.ctrlKey || t.metaKey))
                      );
                    t.stopPropagation();
                    const a = t.ctrlKey || t.metaKey,
                      i = Ot(t);
                    return (
                      this.setState({
                        tool: "select",
                        draft: null,
                        polyPts: [],
                        polyCursor: null,
                        zdrag: a ? null : { sx: i.x, sy: i.y, pts: G(this.state.zones[s]) },
                      }),
                      void this._pickSel("zone", s, a)
                    );
                  }
                  if ((t.stopPropagation(), e)) {
                    const e = t.ctrlKey || t.metaKey,
                      n = Ot(t);
                    (e || this.setState({ zdrag: { sx: n.x, sy: n.y, pts: G(this.state.zones[s]) } }), this._pickSel("zone", s, e));
                  } else !this.curApproved() && this._distPickOk() && this._pickSel("zone", s, t.ctrlKey || t.metaKey);
                },
                dbl: (t) => {
                  (t.stopPropagation(), this.curApproved() || "plan" !== this.state.lens || this.state.zAsn || this.openZoneEditor(s, !1));
                },
              };
            })
          : [],
      q = ((t) => {
        const e =
          {
            zone: ["مصلى واحد", "مصلّيان", "مصليات", "مصلًّى", "مصلى"],
            gate: ["باب واحد", "بابان", "أبواب", "باباً", "باب"],
            path: ["مسار واحد", "مساران", "مسارات", "مساراً", "مسار"],
            mark: ["معلم واحد", "معلمان", "معالم", "معلماً", "معلم"],
          }[n] || null;
        return e ? KIVO.BassamCount(t, [e[0], e[1], e[1], e[2], e[3], e[4]]) : String(t);
      })(s.length),
      Q = e.floors[e.floor] || {},
      V = !0 !== Q.hideZones,
      _ = !0 !== Q.hidePaths,
      $ = !0 !== Q.hideGates,
      tt = !0 !== Q.hideMarks,
      et = (t) => {
        const e = { zones: "hideZones", paths: "hidePaths", gates: "hideGates", marks: "hideMarks" }[t];
        e &&
          this.setState(
            (t) => ({ floors: t.floors.map((s, n) => (n === t.floor ? { ...s, [e]: !1 } : s)) }),
            () => this.savePlan(),
          );
      },
      st = (t) => (e) => {
        (e && e.stopPropagation && e.stopPropagation(), this.setState({ clearFly: !1 }));
        const s = { zones: "hideZones", paths: "hidePaths", gates: "hideGates", marks: "hideMarks" }[t];
        this.setState(
          (t) => ({ floors: t.floors.map((e, n) => (n === t.floor ? { ...e, [s]: !e[s] } : e)) }),
          () => this.savePlan(),
        );
      },
      nt = (t) =>
        "width:32px;height:32px;border-radius:9px;border:0;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;background:transparent;color:" +
        (t ? "var(--fg-x9a7e40)" : "var(--fg-xcbd5e1)"),
      at = "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7",
      it =
        "M10.7 5.1A9.9 9.9 0 0 1 12 5c6.5 0 10 7 10 7a13.2 13.2 0 0 1-1.7 2.7M6.6 6.6A13.5 13.5 0 0 0 2 12s3.5 7 10 7a9.8 9.8 0 0 0 5.4-1.6M14.1 14.1a3 3 0 1 1-4.2-4.2M2 2l20 20",
      rt = !1 !== (e.floors[e.floor] || {}).showCodes,
      lt =
        "plan" === e.lens && rt && V && this.bsLensOn("zones")
          ? e.zones
              .filter((t) => !t.hideLabel)
              .map((t, s) => {
                const n = t.yard ? this.gateLocColor(t.yard) : null,
                  a = G(t);
                if (a.length < 3) return null;
                const i = a.map((t) => t.x),
                  r = a.map((t) => t.y),
                  l = Math.min(...i),
                  o = Math.max(...i),
                  d = Math.min(...r),
                  h = Math.max(...r),
                  p = o - l,
                  c = h - d;
                let g,
                  f,
                  u = 0,
                  m = 0,
                  y = 0;
                for (let t = 0; t < a.length; t++) {
                  const e = (t + 1) % a.length,
                    s = a[t].x * a[e].y - a[e].x * a[t].y;
                  ((u += s), (m += (a[t].x + a[e].x) * s), (y += (a[t].y + a[e].y) * s));
                }
                (Math.abs(u) > 1 ? ((g = m / (3 * u)), (f = y / (3 * u))) : ((g = (l + o) / 2), (f = (d + h) / 2)),
                  (g = Math.max(l + 0.12 * p, Math.min(o - 0.12 * p, g))),
                  (f = Math.max(d + 0.12 * c, Math.min(h - 0.12 * c, f))));
                const b = t.code || "";
                if (!b) return null;
                const x = e.rotdrag,
                  k = !(!x || !e.sel || "zone" !== e.sel.t || e.zones[e.sel.i] !== t);
                let A;
                if ((!x && this._rotLab && (this._rotLab = null), k)) {
                  if (!this._rotLab) {
                    const e = this._zLabelFit(a);
                    e && (this._rotLab = { f: e, a0: x.ang || 0, fs: null, lang0: "number" == typeof t.lang ? t.lang : e.deg });
                  }
                  if (this._rotLab) {
                    const t = this._rotLab,
                      e = (x.ang || 0) - t.a0,
                      s = Math.cos(e),
                      n = Math.sin(e);
                    A = {
                      x: x.cx + (t.f.x - x.cx) * s - (t.f.y - x.cy) * n,
                      y: x.cy + (t.f.x - x.cx) * n + (t.f.y - x.cy) * s,
                      w: t.f.w,
                      h: t.f.h,
                      deg: t.lang0 + (180 * e) / Math.PI,
                    };
                  } else A = this._zLabelFit(a);
                } else ((A = this._zLabelFit(a)), A && "number" == typeof t.lang && (A.deg = t.lang));
                const v = A ? A.x : g,
                  S = A ? A.y : f,
                  w = A ? A.w : p,
                  z = A ? A.h : c,
                  E = A ? A.deg : 0;
                let M = Math.min(0.62 * z, (0.92 * w) / Math.max(1, 0.6 * b.length));
                if (((M = Math.min(M, 17)), k && this._rotLab && null != this._rotLab.fs)) M = this._rotLab.fs;
                else {
                  for (let t = 0; t < 26 && M > 1.2 && !this._boxFits(v, S, M * b.length * 0.6, 0.78 * M, E, a); t++) M *= 0.88;
                  (M < 1.2 && (M = 1.2), k && this._rotLab && (this._rotLab.fs = M));
                }
                return (
                  "number" == typeof t.lsz && t.lsz > 0 && (M = t.lsz),
                  React.createElement(
                    "g",
                    { key: "zl" + (e.floor || 0) + "_" + s, style: { pointerEvents: "none" } },
                    React.createElement(
                      "text",
                      {
                        x: v,
                        y: S + 0.34 * M,
                        textAnchor: "middle",
                        fontSize: M,
                        fontWeight: 600,
                        fill: t.off ? "#64748b" : n || "#141414",
                        stroke: "#fff",
                        strokeWidth: Math.max(0.35, 0.16 * M),
                        strokeLinejoin: "round",
                        strokeOpacity: 0.92,
                        transform: A && Math.abs(A.deg) > 1 ? "rotate(" + A.deg.toFixed(1) + " " + v + " " + S + ")" : null,
                        style: { fontFamily: "'Almarai','Cairo',sans-serif", paintOrder: "stroke fill" },
                      },
                      b,
                    ),
                  )
                );
              })
          : [];
    let ot = null;
    const dt = e.sel && "zone" === e.sel.t && e.sel.i === e.hoverZone;
    if (null != e.hoverZone && e.zones[e.hoverZone] && !dt) {
      const t = e.zones[e.hoverZone],
        s = G(t);
      if (s.length >= 3) {
        const n = s.map((t) => t.x),
          a = s.map((t) => t.y),
          i = (Math.min(...n), Math.max(...n), Math.min(...a), Math.max(...a), t.emp || []),
          r = [];
        (t.region && r.push({ label: "المنطقة", value: t.region }),
          (() => {
            const e = this._secOf(t, "zone");
            (e.sec || e.amb) &&
              r.push({
                label: "النطاق",
                value: e.sec ? this._secLabel(e.sec) : "على حدّ نطاقين — حدّده من بيانات النطاق (نقرة مزدوجة عليه)",
              });
          })(),
          t.level && r.push({ label: "الدور / المستوى", value: t.level }),
          t.ztype && r.push({ label: "النوع", value: t.ztype }),
          t.zcat && r.push({ label: "الفئة", value: t.zcat }),
          t.pri &&
            r.push({
              label: "أولوية التغطية",
              value: "(" + t.pri + ") " + ({ أ: "لا يُخلى أبداً", ب: "يُخفَّض عند الضرورة", ج: "أول ما يُسحب منه" }[t.pri] || ""),
            }));
        let l = null,
          o = "#b99751",
          d = null,
          h = 0;
        const p = N(t);
        if ("density" === e.lens)
          ((o = null == p ? "#94a3b8" : I(t)),
            (l =
              null == p
                ? { text: "بلا سعة", label: this.zoneNeeds(t, F) }
                : { value: j(p), unit: "مصلٍّ", label: "الطاقة الاستيعابية للمصلى" }),
            null != p &&
              (r.unshift({ label: "نصيب الفرد", value: ((ht = D(t)), (null == ht || "" === ht ? "—" : String(+ht)) + " م²") }),
              r.unshift({ label: "المساحة", value: R(L(t)) + " م²" })));
        else if ("dist" === e.lens || ("plan" === e.lens && e.zAsn)) {
          const e = O(t, r);
          (e && (o = e),
            e || (o = i.length ? "#34d399" : "#f87171"),
            (l = { value: String(i.length), unit: "موظف", label: i.length ? "مسكّنون على هذا المصلى" : "المصلى شاغر — لا تسكين" }),
            i.length &&
              ((d = i.slice().map((t) => {
                const e = u[t] || {},
                  s = A[t] || "";
                return {
                  name: this._nm(t),
                  phone: e.phone || "",
                  shName: s,
                  color: (y.find((t) => t.name === s) || {}).color || "#94a3b8",
                  rest: !!E[t],
                };
              })),
              (h = 0)));
        } else null != p && (l = { value: j(p), unit: "مصلٍّ", label: "الطاقة الاستيعابية" });
        ot = {
          accent: o,
          code: t.code || "—",
          title: t.ztype || "مصلى",
          status: { text: t.off ? "معطّلة" : "مفعّلة", tone: t.off ? "off" : "ok" },
          hero: l,
          stats: r,
          people: d,
          more: h,
          foot: "dist" === e.lens || ("plan" === e.lens && e.zAsn) ? "انقر المصلى لتعديل تسكينه" : "انقر المصلى لتعريف مساحته ونصيب الفرد",
        };
      }
    }
    var ht;
    const pt = e.sel && "gate" === e.sel.t && e.sel.i === e.hoverGate;
    if (!ot && null != e.hoverGate && e.gates[e.hoverGate] && !pt) {
      const t = e.gates[e.hoverGate],
        s = t.emp || [],
        n = [];
      (t.loc && n.push({ label: "الموقع", value: t.loc, color: this.gateLocColor(t.loc) || void 0 }),
        (() => {
          const e = this._secOf(t, "gate");
          (e.sec || e.amb) &&
            n.push({
              label: "النطاق",
              value: e.sec ? this._secLabel(e.sec) : "على حدّ نطاقين — حدّده من بيانات النطاق (نقرة مزدوجة عليه)",
            });
        })(),
        t.gtype && n.push({ label: "النوع", value: t.gtype }),
        t.kind && n.push({ label: "الفئة", value: t.kind }),
        t.route && n.push({ label: "المسار", value: t.route }),
        t.cls && n.push({ label: "التصنيف", value: t.cls }),
        t.pri &&
          n.push({
            label: "أولوية التغطية",
            value: "(" + t.pri + ") " + ({ أ: "لا يُخلى أبداً", ب: "يُخفَّض عند الضرورة", ج: "أول ما يُسحب منه" }[t.pri] || ""),
          }),
        (t.cats || []).length && n.push({ label: "التخصيص", value: (t.cats || []).join(" · "), wide: !0 }));
      const a = KIVO.BassamLeaf,
        i = a.isParent(t),
        r = i ? a.leavesOf(e.gates, t) : [],
        l = i ? a.agg(e.gates, t, y) : null,
        o = i ? l.n > 0 && 0 === l.open : !!t.closed;
      if (
        (i &&
          (n.push({ label: "عدد الأبواب", value: KIVO.BassamCount(String(l.n), "فتحة") + " · مفتوح " + l.open }),
          n.push({
            label: "الفتحات",
            value: r
              .map(
                (t) =>
                  (t.label || "فتحة " + t.leafNo) +
                  (t.closed ? " (مغلقة)" : "") +
                  ("dist" === e.lens || ("gates" === e.lens && e.gAsn)
                    ? " · " + (t.emp || []).length + "/" + KIVO.BassamNeed.tot(t, y)
                    : ""),
              )
              .join(" · "),
            wide: !0,
          })),
        t.pOf)
      ) {
        const s = a.parentOf(e.gates, t);
        s && n.unshift({ label: "الباب الأم", value: s.label || "باب" });
      }
      let d = null,
        h = o ? "#94a3b8" : "#34d399",
        p = null,
        c = 0;
      if (i)
        "dist" === e.lens || ("gates" === e.lens && e.gAsn)
          ? ((h = 0 === l.plc ? "#f87171" : l.need > 0 && l.plc < l.need ? "#e5b563" : "#34d399"),
            (d = { value: String(l.plc), unit: "موظف", label: "مسكّنون على فتحات هذا الباب من احتياج " + l.need }))
          : (d = { value: String(l.open) + "/" + l.n, unit: "فتحة", label: "الفتحات المفتوحة من فتحات الباب" });
      else if ("dist" === e.lens || ("gates" === e.lens && e.gAsn)) {
        ((h = O(t, n) || (s.length ? "#34d399" : "#f87171")),
          (d = { value: String(s.length), unit: "موظف", label: s.length ? "مسكّنون على هذا الباب" : "الباب شاغر — لا تسكين" }),
          s.length &&
            ((p = s.slice().map((t) => {
              const e = u[t] || {},
                s = A[t] || "";
              return {
                name: this._nm(t),
                phone: e.phone || "",
                shName: s,
                color: (y.find((t) => t.name === s) || {}).color || "#94a3b8",
                rest: !!E[t],
              };
            })),
            (c = 0)));
      } else d = { text: t.closed ? "مغلق" : "مفتوح", label: "حالة الباب في الخطة" };
      ot = {
        accent: h,
        code: t.num ? "#" + t.num : "",
        title: (t.label || "باب") + (i ? " · باب أم" : ""),
        status: "dist" === e.lens || ("gates" === e.lens && e.gAsn) ? { text: o ? "مغلق" : "مفتوح", tone: o ? "off" : "ok" } : null,
        hero: d,
        stats: n,
        people: p,
        more: c,
        foot: i
          ? "انقر شارة العدد لفرد الفتحات أو طيّها" +
            ("dist" === e.lens || ("gates" === e.lens && e.gAsn) ? " ثم انقر الفتحة لتسكينها" : " · نقرة مزدوجة لفتح بيانات الباب الأم")
          : "dist" === e.lens || ("gates" === e.lens && e.gAsn)
            ? "انقر الباب لتعديل تسكينه"
            : "نقرة مزدوجة لفتح بيانات الباب",
      };
    }
    const ct = e.sel && "mark" === e.sel.t && e.sel.i === e.hoverMark;
    if (!ot && null != e.hoverMark && (e.marks || [])[e.hoverMark] && !ct) {
      const t = (e.marks || [])[e.hoverMark],
        s = t.emp || [],
        n = [];
      (t.kind && n.push({ label: "النوع", value: t.kind }),
        (() => {
          const e = this._secOf(t, "mark");
          (e.sec || e.amb) &&
            n.push({
              label: "النطاق",
              value: e.sec ? this._secLabel(e.sec) : "على حدّ نطاقين — حدّده من بيانات النطاق (نقرة مزدوجة عليه)",
            });
        })(),
        t.pri &&
          n.push({
            label: "أولوية التغطية",
            value: "(" + t.pri + ") " + ({ أ: "لا يُخلى أبداً", ب: "يُخفَّض عند الضرورة", ج: "أول ما يُسحب منه" }[t.pri] || ""),
          }));
      let a = null,
        i = t.off ? "#94a3b8" : "#a78bfa",
        r = null,
        l = 0;
      if ("dist" === e.lens || ("marks" === e.lens && e.mAsn)) {
        ((i = O(t, n) || (s.length ? "#34d399" : "#f87171")),
          (a = { value: String(s.length), unit: "موظف", label: s.length ? "مسكّنون على هذا المعلم" : "المعلم شاغر — لا تسكين" }),
          s.length &&
            ((r = s.slice().map((t) => {
              const e = u[t] || {},
                s = A[t] || "";
              return {
                name: this._nm(t),
                phone: e.phone || "",
                shName: s,
                color: (y.find((t) => t.name === s) || {}).color || "#94a3b8",
                rest: !!E[t],
              };
            })),
            (l = 0)));
      } else a = { text: t.off ? "معطّل" : "مفعّل", label: "حالة المعلم في الخطة" };
      ot = {
        accent: i,
        code: "",
        title: t.label || "معلم",
        status:
          "dist" === e.lens || ("marks" === e.lens && e.mAsn)
            ? { text: t.off ? "معطّل" : t.kind || "معلم", tone: t.off ? "off" : "info" }
            : null,
        hero: a,
        stats: n,
        people: r,
        more: l,
        foot: "dist" === e.lens || ("marks" === e.lens && e.mAsn) ? "انقر المعلم لتعديل تسكينه" : "نقرة مزدوجة لفتح بيانات المعلم",
      };
    }
    const gt = e.view.w / 1e3,
      ft = ($ && this.bsLensOn("gates") ? e.gates : []).map((t, s) => {
        const n = KIVO.BassamLeaf,
          a = e.gExp || {};
        if (t && t.pOf && !a[t.pOf]) return null;
        const r = n.isParent(t),
          l = r ? n.leavesOf(e.gates, t) : null,
          o = r ? n.agg(e.gates, t) : null,
          d = r ? l.filter((t) => (t.emp || []).length > 0).length : 0,
          h = t && t.pOf ? n.parentOf(e.gates, t) : null,
          p = i("gate", s),
          c = !(!e.flash || "gate" !== e.flash.t || e.flash.i !== s),
          g = r ? o.n > 0 && 0 === o.open : !!t.closed,
          f = !("gates" === e.lens || "dist" === e.lens),
          u =
            "dist" === e.lens || ("gates" === e.lens && e.gAsn)
              ? r
                ? 0 === d
                  ? "#dc2626"
                  : d === o.n
                    ? "#16a34a"
                    : "#e5b563"
                : (t.emp || []).length > 0
                  ? "#16a34a"
                  : "#dc2626"
              : f
                ? "#94a3b8"
                : g
                  ? "#64748b"
                  : "#16a34a";
        return (
          [t.hideNum || "" === (t.num || "") ? null : "#" + t.num, t.hideLabel ? null : t.label || ""].filter(Boolean).join(" · "),
          React.createElement(
            "g",
            {
              key: "g" + (e.floor || 0) + "_" + s,
              style: { cursor: f ? "default" : "pointer", pointerEvents: f ? "none" : "auto" },
              opacity: f ? 0.45 : 1,
              onPointerDown: (e) => {
                if ("gate" === this.state.tool || "path" === this.state.tool || "mark" === this.state.tool) return;
                if (r && ("dist" === this.state.lens || ("gates" === this.state.lens && this.state.gAsn)))
                  return (e.stopPropagation(), void this._togLeafExp(t.gid));
                const n = !this.curApproved() && "gates" === this.state.lens && !this.state.gAsn,
                  a = this.state.polyPts.length > 0 || !!this.state.draft;
                if ("select" !== this.state.tool) {
                  if (!n || a)
                    return void (a || this.curApproved() || "dist" !== this.state.lens || !this._distPickOk()
                      ? !a &&
                        !this.curApproved() &&
                        "gates" === this.state.lens &&
                        this.state.gAsn &&
                        this._distPickOk() &&
                        (e.stopPropagation(),
                        this.setState({ tool: "select", draft: null, polyPts: [], polyCursor: null }),
                        this._pickSel("gate", s, e.ctrlKey || e.metaKey))
                      : (e.stopPropagation(),
                        this.setState({ tool: "select", draft: null, polyPts: [], polyCursor: null }),
                        this._pickSel("gate", s, e.ctrlKey || e.metaKey)));
                  e.stopPropagation();
                  const t = e.ctrlKey || e.metaKey;
                  return (
                    this.setState({ tool: "select", draft: null, polyPts: [], polyCursor: null, gdrag: t ? null : { i: s } }),
                    void this._pickSel("gate", s, t)
                  );
                }
                if ((e.stopPropagation(), n)) {
                  const t = e.ctrlKey || e.metaKey;
                  (t || this.setState({ gdrag: { i: s } }), this._pickSel("gate", s, t));
                } else !this.curApproved() && this._distPickOk() && this._pickSel("gate", s, e.ctrlKey || e.metaKey);
              },
              onDoubleClick: (t) => {
                (t.stopPropagation(),
                  "gates" !== this.state.lens ||
                    this.state.gAsn ||
                    (this.curApproved()
                      ? this.bsToast("الموقع معتمد ومقفل — فُكّ الاعتماد أولاً لتعديل بيانات الباب", "warn")
                      : (this.setState({ opGateFly: null, hoverGate: null, zDd: null, bDd: null, gDd: null, gdrag: null }),
                        this.openGateEditor(s, !1))));
              },
            },
            h
              ? React.createElement("line", {
                  x1: h.x,
                  y1: h.y,
                  x2: t.x,
                  y2: t.y,
                  stroke: "#b99751",
                  strokeWidth: 0.9 * gt,
                  strokeDasharray: 2.2 * gt + " " + 2 * gt,
                  opacity: 0.75,
                  style: { pointerEvents: "none" },
                })
              : null,
            React.createElement("circle", { cx: t.x, cy: t.y, r: (c ? 12 : p ? 8.5 : 5) * gt, fill: u, opacity: c ? 0.6 : p ? 0.4 : 0.22 }),
            c || p
              ? React.createElement("circle", {
                  cx: t.x,
                  cy: t.y,
                  r: (c ? 10.5 : 7.4) * gt,
                  fill: "none",
                  stroke: "#b99751",
                  strokeWidth: 1.4 * gt,
                  opacity: 0.95,
                })
              : null,
            React.createElement("circle", {
              cx: t.x,
              cy: t.y,
              r: 3.4 * gt,
              fill: u,
              stroke: "#fff",
              strokeWidth: (c ? 2.4 : p ? 1.7 : 1.2) * gt,
            }),
            g
              ? React.createElement("line", {
                  x1: t.x - 4.8 * gt,
                  y1: t.y + 4.8 * gt,
                  x2: t.x + 4.8 * gt,
                  y2: t.y - 4.8 * gt,
                  stroke: "#fff",
                  strokeWidth: 1.4 * gt,
                  strokeLinecap: "round",
                  style: { pointerEvents: "none" },
                })
              : null,
            !rt || t.hideNum || ("" === (t.num || "") && !t.pOf)
              ? null
              : React.createElement(
                  "text",
                  {
                    x: t.x,
                    y: t.y - 7.5 * gt,
                    textAnchor: "middle",
                    fontSize: (t.pOf ? 8 : 11) * gt,
                    fontWeight: 800,
                    fill: u,
                    stroke: "#fff",
                    strokeWidth: 3 * gt,
                    paintOrder: "stroke",
                    style: { fontFamily: "'Cairo',sans-serif", fontFeatureSettings: "'tnum'", pointerEvents: "none" },
                  },
                  t.pOf ? ("" !== (t.num || "") ? String(t.num) + "-" : "") + String(t.leafNo || "") : String(t.num),
                ),
            rt && !t.hideLabel && !t.pOf && t.label
              ? React.createElement(
                  "text",
                  {
                    x: t.x,
                    y: t.y - (t.hideNum || "" === (t.num || "") ? 8 : 20) * gt,
                    textAnchor: "middle",
                    fontSize: 6.5 * gt,
                    fontWeight: 600,
                    fill: u,
                    stroke: "#fff",
                    strokeWidth: 2.2 * gt,
                    paintOrder: "stroke",
                    style: { fontFamily: "'Cairo',sans-serif", pointerEvents: "none" },
                  },
                  t.label,
                )
              : null,
            r
              ? React.createElement(
                  "g",
                  {
                    className: "bs-leafbadge",
                    style: { cursor: "pointer" },
                    onPointerDown: (e) => {
                      (e.stopPropagation(), e.preventDefault(), this._togLeafExp(t.gid));
                    },
                    onDoubleClick: (t) => {
                      t.stopPropagation();
                    },
                  },
                  React.createElement("circle", {
                    cx: t.x + 6.8 * gt,
                    cy: t.y - 6.4 * gt,
                    r: 4.4 * gt,
                    fill: a[t.gid] ? "#9A7E40" : "#b99751",
                    stroke: "#fff",
                    strokeWidth: 1.2 * gt,
                  }),
                  React.createElement(
                    "text",
                    {
                      x: t.x + 6.8 * gt,
                      y: t.y - 4.9 * gt,
                      textAnchor: "middle",
                      fontSize: 5.6 * gt,
                      fontWeight: 800,
                      fill: "#fff",
                      style: { fontFamily: "'Cairo',sans-serif", fontFeatureSettings: "'tnum'", pointerEvents: "none" },
                    },
                    String(o.n),
                  ),
                )
              : null,
          )
        );
      }),
      ut = ((tt && this.bsLensOn("marks") && e.marks) || []).map((t, s) => {
        const n = i("mark", s),
          a = !(!e.flash || "mark" !== e.flash.t || e.flash.i !== s),
          r = !!t.off,
          l = !("marks" === e.lens || "dist" === e.lens),
          o =
            "dist" === e.lens || ("marks" === e.lens && e.mAsn)
              ? +t.needN > 0 && !t.off
                ? P(t)
                : (t.emp || []).length > 0
                  ? "#16a34a"
                  : "#dc2626"
              : l
                ? "#94a3b8"
                : r
                  ? "#64748b"
                  : "#9c3d6b",
          d = t.hideLabel ? "" : t.label || "";
        return React.createElement(
          "g",
          {
            key: "mk" + (e.floor || 0) + "_" + s,
            style: { cursor: l ? "default" : "pointer", pointerEvents: l ? "none" : "auto" },
            opacity: l ? 0.45 : 1,
            onPointerDown: (t) => {
              if ("gate" === this.state.tool || "path" === this.state.tool || "mark" === this.state.tool) return;
              const e = !this.curApproved() && "marks" === this.state.lens && !this.state.mAsn,
                n = this.state.polyPts.length > 0 || !!this.state.draft;
              if ("select" !== this.state.tool) {
                if (!e || n)
                  return void (
                    n ||
                    this.curApproved() ||
                    "dist" !== this.state.lens ||
                    !this._distPickOk() ||
                    (t.stopPropagation(),
                    this.setState({ tool: "select", draft: null, polyPts: [], polyCursor: null }),
                    this._pickSel("mark", s, t.ctrlKey || t.metaKey))
                  );
                t.stopPropagation();
                const a = t.ctrlKey || t.metaKey;
                return (
                  this.setState({ tool: "select", draft: null, polyPts: [], polyCursor: null, mdrag: a ? null : { i: s } }),
                  void this._pickSel("mark", s, a)
                );
              }
              if ((t.stopPropagation(), e)) {
                const e = t.ctrlKey || t.metaKey;
                (e || this.setState({ mdrag: { i: s } }), this._pickSel("mark", s, e));
              } else
                !this.curApproved() && this._distPickOk()
                  ? this._pickSel("mark", s, t.ctrlKey || t.metaKey)
                  : this.curApproved() && this._pickSel("mark", s, !1);
            },
            onDoubleClick: (t) => {
              (t.stopPropagation(), this.curApproved() || "marks" !== this.state.lens || this.state.mAsn || this.openMarkEditor(s, !1));
            },
          },
          React.createElement("circle", { cx: t.x, cy: t.y, r: (a ? 12 : n ? 8.5 : 5) * gt, fill: o, opacity: a ? 0.6 : n ? 0.4 : 0.22 }),
          a || n
            ? React.createElement("circle", {
                cx: t.x,
                cy: t.y,
                r: (a ? 10.5 : 7.4) * gt,
                fill: "none",
                stroke: "#b99751",
                strokeWidth: 1.4 * gt,
                opacity: 0.95,
              })
            : null,
          React.createElement("circle", {
            cx: t.x,
            cy: t.y,
            r: 3.4 * gt,
            fill: o,
            stroke: "#fff",
            strokeWidth: (a ? 2.4 : n ? 1.7 : 1.2) * gt,
          }),
          r
            ? React.createElement("line", {
                x1: t.x - 4.8 * gt,
                y1: t.y + 4.8 * gt,
                x2: t.x + 4.8 * gt,
                y2: t.y - 4.8 * gt,
                stroke: "#fff",
                strokeWidth: 1.4 * gt,
                strokeLinecap: "round",
                style: { pointerEvents: "none" },
              })
            : null,
          d && rt
            ? React.createElement(
                "text",
                {
                  x: t.x,
                  y: t.y - 8 * gt,
                  textAnchor: "middle",
                  fontSize: 6 * gt,
                  fontWeight: 600,
                  fill: o,
                  style: { fontFamily: "'Cairo',sans-serif", pointerEvents: "none" },
                },
                d,
              )
            : null,
        );
      }),
      mt = {
        in: { c: "#16a34a", label: "دخول" },
        out: { c: "#dc2626", label: "خروج" },
        emg: { c: "#ea580c", label: "طوارئ" },
        svc: { c: "#9c3d6b", label: "خدمات" },
      },
      yt = ["in", "out", "emg", "svc"],
      bt = { thin: 1.5, normal: 2.4, bold: 3.6 },
      xt = [
        ["thin", "رفيع"],
        ["normal", "عادي"],
        ["bold", "عريض"],
      ],
      kt = [
        ["solid", "متصل", "solid"],
        ["dash", "متقطع", "dashed"],
        ["dot", "منقّط", "dotted"],
      ],
      At = (t, e, s) => ("dash" === t ? 7 * e + " " + 4.5 * e : "dot" === t ? 0.01 * e + " " + Math.max(5, 2.6 * s) * e : null),
      vt = (t) => (t && !1 === t.active ? "#94a3b8" : (mt[(t && t.type) || "in"] || mt.in).c),
      St = (t, e, s, n, a) => {
        const i = Math.atan2(e.y - t.y, e.x - t.x),
          r = Math.cos(i),
          l = Math.sin(i),
          o = -l,
          d = r,
          h = 11 * s,
          p = 4.62 * s,
          c = 11 * 0.66 * s,
          g = e.x - r * h,
          f = e.y - l * h,
          u =
            "M" +
            e.x +
            "," +
            e.y +
            " L" +
            (g + o * p) +
            "," +
            (f + d * p) +
            " L" +
            (e.x - r * c) +
            "," +
            (e.y - l * c) +
            " L" +
            (g - o * p) +
            "," +
            (f - d * p) +
            " Z";
        return React.createElement("path", { key: a, d: u, fill: n, stroke: "#fff", strokeWidth: 0.9 * s, strokeLinejoin: "round" });
      },
      wt = (t, e, s, n, a) => {
        const i = [],
          r = "two" === n,
          l = [];
        let o = 0;
        for (let e = 1; e < t.length; e++) {
          const s = t[e - 1],
            n = t[e],
            a = Math.hypot(n.x - s.x, n.y - s.y);
          a > 0.01 && (l.push({ a: s, b: n, len: a, ux: (n.x - s.x) / a, uy: (n.y - s.y) / a, d0: o }), (o += a));
        }
        if (!l.length) return i;
        const d = (t) => {
            let e = l[l.length - 1];
            for (let s = 0; s < l.length; s++)
              if (t <= l[s].d0 + l[s].len) {
                e = l[s];
                break;
              }
            const s = Math.max(0, Math.min(e.len, t - e.d0));
            return { x: e.a.x + e.ux * s, y: e.a.y + e.uy * s, ux: e.ux, uy: e.uy };
          },
          h = 30 * e,
          p = 17 * e,
          c = Math.min(Math.floor((o - p) / h), 96);
        for (let t = 1; t <= c; t++) {
          const n = d(t * h);
          r && t % 2 == 0
            ? i.push(St({ x: n.x + n.ux, y: n.y + n.uy }, { x: n.x, y: n.y }, e, s, a + "r" + t))
            : i.push(St({ x: n.x - n.ux, y: n.y - n.uy }, { x: n.x, y: n.y }, e, s, a + "s" + t));
        }
        const g = l[l.length - 1];
        if ((i.push(St({ x: g.b.x - g.ux, y: g.b.y - g.uy }, g.b, e, s, a + "f")), r)) {
          const t = l[0];
          i.push(St({ x: t.a.x + t.ux, y: t.a.y + t.uy }, t.a, e, s, a + "b0"));
        }
        return i;
      },
      zt = (t, e, s, n, a) => {
        if (!t || !1 === t.anim || !1 === t.active) return null;
        const i = String(e || "")
          .trim()
          .split(/\s+/)
          .map((t) => {
            const e = t.split(",");
            return { x: +e[0], y: +e[1] };
          })
          .filter((t) => isFinite(t.x) && isFinite(t.y));
        if (i.length < 2) return null;
        let r = 0;
        for (let t = 1; t < i.length; t++) r += Math.hypot(i[t].x - i[t - 1].x, i[t].y - i[t - 1].y);
        if (r < 26 * n) return null;
        const l = (t) => "M " + t.map((t) => t.x + " " + t.y).join(" L "),
          o = "bsPF_" + String(a || "f").replace(/[^A-Za-z0-9_]/g, ""),
          d = o + "r",
          h = "two" === t.dir,
          p = Math.max(1.6, Math.min(16, r / 62));
        let c = Math.max(1, Math.min(6, Math.round(r / 74)));
        h && (c = Math.max(2, c));
        const g = Math.max(3.4 * n, 1.05 * s),
          f = 0.72 * g,
          u = "M " + -g + " " + -f + " L " + g + " 0 L " + -g + " " + f + " Z",
          m = [];
        for (let t = 0; t < c; t++) {
          const e = h && t % 2 == 1;
          m.push(
            React.createElement(
              "path",
              {
                key: "h" + t,
                d: u,
                fill: "#ffffff",
                opacity: 0.95,
                stroke: "rgba(0,0,0,0.18)",
                strokeWidth: 0.5 * n,
                style: { pointerEvents: "none" },
              },
              React.createElement(
                "animateMotion",
                { dur: p.toFixed(2) + "s", repeatCount: "indefinite", rotate: "auto", begin: ((-t / c) * p).toFixed(2) + "s" },
                React.createElement("mpath", { href: "#" + (e ? d : o) }),
              ),
            ),
          );
        }
        return React.createElement(
          "g",
          { key: a || "flow", style: { pointerEvents: "none" } },
          React.createElement("path", { id: o, d: l(i), fill: "none", stroke: "none" }),
          h ? React.createElement("path", { id: d, d: l(i.slice().reverse()), fill: "none", stroke: "none" }) : null,
          m,
        );
      },
      Et = ((_ && this.bsLensOn("paths") && e.paths) || [])
        .map((t, s) => {
          const n = t.pts || [];
          if (n.length < 2) return null;
          const a = i("path", s),
            r = !(!e.flash || "path" !== e.flash.t || e.flash.i !== s),
            l = !1 !== t.active,
            o = !(("plan" === e.lens && !e.zAsn) || "paths" === e.lens),
            d = o ? "#94a3b8" : vt(t),
            h = bt[t.w] || bt.normal,
            p = h * gt,
            c = n[Math.floor((n.length - 1) / 2)],
            g = n.map((t) => t.x + "," + t.y).join(" "),
            f = ((t) => (t && t.code ? t.code + " · " : "") + ((t && t.name) || ""))(t),
            u = !this.curApproved() && (("plan" === e.lens && !e.zAsn) || "paths" === e.lens);
          return React.createElement(
            "g",
            {
              key: "pa" + (e.floor || 0) + "_" + s,
              style: { cursor: o ? "default" : u ? "move" : "pointer", pointerEvents: o ? "none" : "auto" },
              opacity: o ? 0.45 : l ? 1 : 0.55,
              onPointerDown: (t) => {
                if ("select" !== this.state.tool) return;
                if ((t.stopPropagation(), !u)) return void (this.curApproved() || this._pickSel("path", s, t.ctrlKey || t.metaKey));
                const e = t.ctrlKey || t.metaKey,
                  n = Ot(t);
                (this._pickSel("path", s, e),
                  this.setState({
                    draft: null,
                    polyPts: [],
                    polyCursor: null,
                    pdrag: e ? null : { i: s, sx: n.x, sy: n.y, pts: ((this.state.paths[s] || {}).pts || []).slice() },
                  }));
              },
              onDoubleClick: (t) => {
                (t.stopPropagation(), u && (this.setState({ pdrag: null }), this.openPathEditor(s)));
              },
            },
            React.createElement("polyline", {
              points: g,
              fill: "none",
              stroke: "#ffffff",
              strokeWidth: p + (r ? 7 : a ? 4.4 : 2) * gt,
              strokeLinecap: "round",
              strokeLinejoin: "round",
              opacity: 0.92,
            }),
            r || a
              ? React.createElement("polyline", {
                  points: g,
                  fill: "none",
                  stroke: "#b99751",
                  strokeWidth: p + 2.6 * gt,
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                  opacity: 0.5,
                })
              : null,
            React.createElement("polyline", {
              points: g,
              fill: "none",
              stroke: d,
              strokeWidth: p,
              strokeLinecap: "round",
              strokeLinejoin: "round",
              strokeDasharray: At(t.line, gt, h),
            }),
            o ? null : zt(t, g, p, gt, "fl" + s),
            wt(n, gt, d, t.dir, "a" + s + "_"),
            rt && !t.hideLabel && f
              ? React.createElement(
                  "text",
                  {
                    x: c.x,
                    y: c.y - (7 * gt + 1.6 * p),
                    textAnchor: "middle",
                    fontSize: 12.5 * gt,
                    fontWeight: 600,
                    fill: d,
                    style: { fontFamily: "'Cairo',sans-serif", pointerEvents: "none" },
                    stroke: "#fff",
                    strokeWidth: 3.2 * gt,
                    paintOrder: "stroke",
                  },
                  f,
                )
              : null,
          );
        })
        .filter(Boolean);
    if (
      !ot &&
      ("plan" === e.lens || "paths" === e.lens) &&
      null != e.hoverPath &&
      (e.paths || [])[e.hoverPath] &&
      (!e.sel || "path" !== e.sel.t || e.sel.i !== e.hoverPath)
    ) {
      const t = e.paths[e.hoverPath],
        s = t.pts || [];
      if (s.length >= 2) {
        const e = s.map((t) => t.x),
          n = s.map((t) => t.y),
          a = (Math.min(...e), Math.max(...e), Math.min(...n), Math.max(...n), mt[t.type || "in"] || mt.in);
        let i = 0;
        for (let t = 1; t < s.length; t++) i += Math.hypot(s[t].x - s[t - 1].x, s[t].y - s[t - 1].y);
        const r = [
          { label: "الاتجاه", value: "two" === t.dir ? "اتجاهان ⇄" : "اتجاه واحد →" },
          { label: "النقاط", value: String(s.length) },
          { label: "نمط الخط", value: (kt.find((e) => e[0] === (t.line || "dash")) || kt[1])[1] },
          { label: "السماكة", value: (xt.find((e) => e[0] === (t.w || "thin")) || xt[0])[1] },
        ];
        (F > 0 && r.push({ label: "الطول التقريبي", value: R(i * F) + " م", wide: !0 }),
          (ot = {
            accent: !1 === t.active ? "#94a3b8" : a.c,
            code: t.code || "",
            title: t.name || "مسار",
            status: { text: !1 === t.active ? "معطّل" : "مفعّل", tone: !1 === t.active ? "off" : "ok" },
            hero: { text: a.label, label: "نوع المسار" },
            stats: r,
            foot: "نقرة مزدوجة لفتح بيانات المسار",
          }));
      }
    }
    let Mt = null;
    if (e.calMode && e.calMode.a && e.polyCursor) {
      const t = e.view.w / 1e3,
        s = e.calMode.a,
        n = e.polyCursor;
      Mt = React.createElement(
        "g",
        null,
        React.createElement("line", {
          x1: s.x,
          y1: s.y,
          x2: n.x,
          y2: n.y,
          stroke: "#2f8f86",
          strokeWidth: 2 * t,
          strokeDasharray: 7 * t + " " + 4 * t,
          strokeLinecap: "round",
        }),
        React.createElement("circle", { cx: s.x, cy: s.y, r: 3.4 * t, fill: "#fff", stroke: "#2f8f86", strokeWidth: 1.6 * t }),
        React.createElement("circle", { cx: n.x, cy: n.y, r: 3.4 * t, fill: "#fff", stroke: "#2f8f86", strokeWidth: 1.6 * t }),
      );
    } else if (e.draft) {
      const t = e.view.w / 1e3,
        s = e.draft,
        n = { fill: "#b99751", fillOpacity: 0.2, stroke: "#b99751", strokeWidth: 1.6 * t, strokeDasharray: 6 * t + " " + 3 * t };
      if ("circle" === e.tool) {
        const e = Math.hypot(s.cx - s.x, s.cy - s.y);
        Mt = React.createElement(
          "g",
          null,
          React.createElement("circle", { cx: s.x, cy: s.y, r: e, ...n }),
          React.createElement("circle", { cx: s.x, cy: s.y, r: 2.4 * t, fill: "#b99751", stroke: "#fff", strokeWidth: 1 * t }),
        );
      } else if ("square" === e.tool) {
        const t = s.cx - s.x,
          e = s.cy - s.y,
          a = Math.max(Math.abs(t), Math.abs(e)),
          i = s.x + (t < 0 ? -a : a),
          r = s.y + (e < 0 ? -a : a);
        Mt = React.createElement("rect", { x: Math.min(s.x, i), y: Math.min(s.y, r), width: a, height: a, ...n });
      } else
        Mt = React.createElement("rect", {
          x: Math.min(s.x, s.cx),
          y: Math.min(s.y, s.cy),
          width: Math.abs(s.cx - s.x),
          height: Math.abs(s.cy - s.y),
          ...n,
        });
    } else if ("path" === e.tool && e.polyPts.length) {
      const t = e.view.w / 1e3,
        s = e.polyPts[e.polyPts.length - 1],
        n = e.polyCursor,
        a = "#b99751",
        i = n && e.polyPts.length >= 2 && Math.hypot(n.x - s.x, n.y - s.y) <= 10 * t;
      Mt = React.createElement(
        "g",
        null,
        React.createElement("polyline", {
          points: e.polyPts.map((t) => t.x + "," + t.y).join(" "),
          fill: "none",
          stroke: a,
          strokeWidth: 2.6 * t,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          strokeDasharray: 6 * t + " " + 3.6 * t,
        }),
        n
          ? React.createElement("line", {
              x1: s.x,
              y1: s.y,
              x2: n.x,
              y2: n.y,
              stroke: a,
              strokeWidth: 1.6 * t,
              strokeDasharray: 5 * t + " " + 3 * t,
              style: { pointerEvents: "none" },
            })
          : null,
        e.polyPts.slice(1).map((s, n) => St(e.polyPts[n], s, 2.6 * t, a, "pvA" + n)),
        n ? St(s, n, 2.6 * t, "rgba(185,151,81,0.55)", "pvC") : null,
        e.polyPts.map((s, n) =>
          React.createElement("circle", {
            key: n,
            cx: s.x,
            cy: s.y,
            r: (n === e.polyPts.length - 1 ? 3.6 : 2.6) * t,
            fill: a,
            stroke: "#fff",
            strokeWidth: 1.2 * t,
          }),
        ),
        e.polyPts.length >= 2
          ? React.createElement(
              "text",
              {
                x: s.x,
                y: s.y - 11 * t,
                textAnchor: "middle",
                fontSize: 8 * t,
                fontWeight: 600,
                fill: i ? "#16a34a" : "#9A7E40",
                style: { fontFamily: "'Cairo',sans-serif", pointerEvents: "none" },
              },
              i ? "انقر لإنهاء المسار ✓" : "نقرة مزدوجة لإنهاء المسار",
            )
          : null,
      );
    } else if (e.polyPts.length) {
      const t = e.view.w / 1e3,
        s = e.polyPts[e.polyPts.length - 1],
        n = e.polyCursor,
        a = e.polyPts.length >= 3,
        i = n && a && Math.hypot(n.x - e.polyPts[0].x, n.y - e.polyPts[0].y) <= 14 * t,
        r = "#b99751",
        l = "#16a34a",
        o = e.polyPts[0];
      Mt = React.createElement(
        "g",
        null,
        React.createElement("polyline", {
          points: e.polyPts.map((t) => t.x + "," + t.y).join(" "),
          fill: i ? "rgba(22,163,74,0.15)" : "rgba(185,151,81,0.15)",
          stroke: i ? l : r,
          strokeWidth: 1.4 * t,
          strokeDasharray: 5 * t + " " + 3 * t,
        }),
        n
          ? React.createElement("line", {
              x1: s.x,
              y1: s.y,
              x2: n.x,
              y2: n.y,
              stroke: i ? l : r,
              strokeWidth: 1.4 * t,
              strokeDasharray: 5 * t + " " + 3 * t,
              style: { pointerEvents: "none" },
            })
          : null,
        n && a
          ? React.createElement("line", {
              x1: n.x,
              y1: n.y,
              x2: o.x,
              y2: o.y,
              stroke: i ? l : "rgba(185,151,81,0.35)",
              strokeWidth: (i ? 1.4 : 1) * t,
              strokeDasharray: 2 * t + " " + 3 * t,
              style: { pointerEvents: "none" },
            })
          : null,
        a
          ? React.createElement("circle", {
              cx: o.x,
              cy: o.y,
              r: (i ? 9 : 7) * t,
              fill: i ? "rgba(22,163,74,0.2)" : "rgba(185,151,81,0.12)",
              stroke: i ? l : r,
              strokeWidth: 1.4 * t,
              strokeDasharray: 2.5 * t + " " + 2 * t,
              style: { cursor: "pointer" },
            })
          : null,
        e.polyPts.map((e, s) =>
          React.createElement("circle", {
            key: s,
            cx: e.x,
            cy: e.y,
            r: (0 === s && a ? (i ? 4.4 : 3.6) : 2.6) * t,
            fill: 0 === s && a && i ? l : r,
            stroke: "#fff",
            strokeWidth: 1.2 * t,
          }),
        ),
        a
          ? React.createElement(
              "text",
              {
                x: o.x,
                y: o.y - (i ? 15 : 12) * t,
                textAnchor: "middle",
                fontSize: 8 * t,
                fontWeight: 600,
                fill: i ? l : "#9A7E40",
                style: { fontFamily: "'Cairo',sans-serif", pointerEvents: "none" },
              },
              i ? "انقر للإغلاق ✓" : "انقر للإغلاق",
            )
          : null,
      );
    }
    const Ot = (t) => {
        const e = KIVO.BassamPointer.rect((t.currentTarget && t.currentTarget.ownerSVGElement) || t.currentTarget),
          s = this.state.view,
          n = Math.min(e.width / s.w, e.height / s.h),
          a = (e.width - s.w * n) / 2,
          i = (e.height - s.h * n) / 2,
          r = (t) => Math.round(100 * t) / 100;
        return {
          x: r(Math.max(0, Math.min(1e3, s.x + (t.clientX - e.left - a) / n))),
          y: r(Math.max(0, Math.min(600, s.y + (t.clientY - e.top - i) / n))),
        };
      },
      Ct = (t, e) => {
        const s = e.x - t.x,
          n = e.y - t.y,
          a = Math.hypot(s, n);
        if (a < 1) return e;
        const i = Math.PI / 4,
          r = Math.round(Math.atan2(n, s) / i) * i;
        return { x: Math.round(t.x + Math.cos(r) * a), y: Math.round(t.y + Math.sin(r) * a) };
      },
      Pt = (t) => {
        const e = KIVO.BassamPointer.rect((t.currentTarget && t.currentTarget.ownerSVGElement) || t.currentTarget),
          s = this.state.view,
          n = Math.min(e.width / s.w, e.height / s.h),
          p = { cx: t.clientX, cy: t.clientY, vx: s.x, vy: s.y, sc: n };
        /* CANVAS-4 (W1): مرساةُ السحب لا يرسمها شيءٌ إلا مؤشّرَ الفأرة («grabbing») — باللمس والقلم تُكتب في الحالة بلا رسمٍ للصفحة
           (كان الضغطُ يرسم الصفحةَ كلَّها ≈150ms على خطةٍ كبيرة فيتجمّد الإطارُ الأوّل ثم يقفز)؛ والرفعُ يرسم مرةً واحدة */
        "mouse" === t.pointerType ? this.setState({ pan: p }) : (this.state = { ...this.state, pan: p });
      },
      Pq = () => {
        (this.state.sel || (this.state.selMulti || []).length) && this.setState({ sel: null, selMulti: [] });
      },
      Tt = (t, e, s) => {
        const n = this.state.view;
        let a = Math.max(25, Math.min(1e3, n.w * s));
        const i = 0.6 * a;
        let r = t - (t - n.x) * (a / n.w),
          l = e - (e - n.y) * (a / n.w);
        ((r = Math.max(0, Math.min(1e3 - a, r))),
          (l = Math.max(0, Math.min(600 - i, l))),
          this.setState({ view: { x: r, y: l, w: a, h: i } }));
      },
      Ft = (t, e) => {
        let s = 0;
        for (let e = 0; e < t.length; e++) {
          const n = (e + 1) % t.length;
          s += t[e].x * t[n].y - t[n].x * t[e].y;
        }
        const n = Math.abs(s / 2),
          a = this._zAnchor(t) || t[0],
          i = Math.round(a.x),
          r = Math.round(a.y),
          l = this.state.zones.map((t) => parseInt(String(null != t.ser ? t.ser : String(t.code || "").replace(/^\D+/, "")), 10) || 0),
          o = Math.max(0, ...l) + 1,
          d = o < 10 ? "0" + o : String(o),
          h = "M" + t.map((t) => t.x + " " + t.y).join(" L") + " Z";
        this.setState(
          {
            zones: [
              ...this.state.zones,
              {
                d: h,
                code: d,
                ser: d,
                cat: "men",
                rawA: n,
                cx: i,
                cy: r,
                count: null,
                emp: [],
                kind: e || null,
                hideLabel: !1,
                uid: this._uid(),
              },
            ],
            draft: null,
            polyPts: [],
            polyCursor: null,
            sel: null,
            selMulti: [],
          },
          () => {
            (this.savePlan(), this.openZoneEditor(this.state.zones.length - 1, !0));
          },
        );
      },
      Lt = (t) => {
        const e = [];
        if (
          ((t || []).forEach((t) => {
            const s = e[e.length - 1];
            (!s || Math.hypot(t.x - s.x, t.y - s.y) > 0.5) && e.push(t);
          }),
          e.length < 2)
        )
          return void this.setState({ polyPts: [], polyCursor: null });
        const s = (this.state.paths || []).map((t) => parseInt(String(t.code || "").replace(/^\D+/, ""), 10) || 0),
          n = Math.max(0, ...s) + 1,
          a = {
            pts: e,
            name: "مسار " + n,
            code: "P" + (n < 10 ? "0" + n : n),
            type: "in",
            dir: "fwd",
            line: "dash",
            w: "thin",
            active: !0,
            anim: !0,
            hideLabel: !0,
            uid: this._uid(),
          };
        this.setState({ paths: [...(this.state.paths || []), a], polyPts: [], polyCursor: null, sel: null, selMulti: [] }, () => {
          (this.savePlan(), this.openPathEditor(this.state.paths.length - 1, !0));
        });
      },
      Dt = (t, e) => {
        const s = (this.state.view.w / 1e3) * 2;
        if ("circle" === e) {
          const e = t.x,
            n = t.y,
            a = Math.hypot(t.cx - t.x, t.cy - t.y);
          if (a > s) {
            const t = 64,
              s = [];
            for (let i = 0; i < t; i++) {
              const r = (i / t) * 2 * Math.PI;
              s.push({ x: Math.round(100 * (e + a * Math.cos(r))) / 100, y: Math.round(100 * (n + a * Math.sin(r))) / 100 });
            }
            return (Ft(s, "circle"), !0);
          }
          return !1;
        }
        if ("square" === e) {
          const e = t.cx - t.x,
            n = t.cy - t.y,
            a = Math.max(Math.abs(e), Math.abs(n));
          if (a > s) {
            const s = t.x + (e < 0 ? -a : a),
              i = t.y + (n < 0 ? -a : a),
              r = Math.min(t.x, s),
              l = Math.min(t.y, i),
              o = Math.max(t.x, s),
              d = Math.max(t.y, i);
            return (
              Ft([
                { x: r, y: l },
                { x: o, y: l },
                { x: o, y: d },
                { x: r, y: d },
              ]),
              !0
            );
          }
          return !1;
        }
        if (Math.abs(t.cx - t.x) > s && Math.abs(t.cy - t.y) > s) {
          const e = Math.min(t.x, t.cx),
            s = Math.min(t.y, t.cy),
            n = Math.max(t.x, t.cx),
            a = Math.max(t.y, t.cy);
          return (
            Ft([
              { x: e, y: s },
              { x: n, y: s },
              { x: n, y: a },
              { x: e, y: a },
            ]),
            !0
          );
        }
        return !1;
      },
      Nt = (t) =>
        "height:28px;padding:0 12px;border-radius:10px;font-size:11px;font-weight:400;border:0;cursor:pointer;transition:all .2s;font-family:'Cairo',sans-serif;" +
        (t
          ? "background:var(--bg-xb99751);color:var(--text-on-brand);box-shadow:var(--shadow-card)"
          : "background:transparent;color:var(--fg-x53565a)"),
      Bt = e.floors.map((t, s) => {
        const n = e.floor === s,
          a = "nomap" === t.chipTone;
        return {
          num: String(t.num),
          name: t.name,
          approved: t.approved,
          chip: t.chip,
          active: n,
          showCreate: !!t.create,
          chipStyle: t.chip
            ? "ok" === t.chipTone
              ? "display:inline-flex;padding:2px 6px;border-radius:4px;font-weight:400;background:var(--bg-a161851290p12);color:var(--fg-x047857);border:1px solid var(--bd-a161851290p3)"
              : "warn" === t.chipTone
                ? "display:inline-flex;padding:2px 6px;border-radius:4px;font-weight:400;background:var(--bg-a245158110p12);color:var(--fg-x92400e);border:1px solid var(--bd-a245158110p3)"
                : "display:inline-flex;padding:2px 6px;border-radius:4px;font-weight:400;background:var(--bg-xfef3c7);color:var(--fg-xb45309)"
            : "display:none",
          rowStyle:
            "display:flex;align-items:center;gap:12px;padding:12px;border-radius:12px;transition:all .2s;border:1px solid " +
            (n
              ? "#b99751;background:var(--bg-a185151810p05);box-shadow:var(--shadow-card)"
              : a
                ? "rgba(225,225,225,0.5);background:var(--bg-a2452452450p3);opacity:.6"
                : t.create
                  ? "rgba(245,158,11,0.25);background:var(--bg-a2552512350p4)"
                  : "#E1E1E1;background:var(--bg-xffffff)"),
          click: () => {
            a ||
              t.create ||
              this.setState(
                (t) => {
                  const e = t.floors.map((e, s) =>
                      s === t.floor ? { ...e, zones: t.zones, gates: t.gates, marks: t.marks || [], paths: t.paths || [] } : e,
                    ),
                    n = e[s] || {};
                  return {
                    floors: e,
                    floor: s,
                    zones: n.zones || [],
                    gates: n.gates || [],
                    marks: n.marks || [],
                    paths: n.paths || [],
                    sel: null,
                    selMulti: [],
                    tool: "select",
                    draft: null,
                    polyPts: [],
                    polyCursor: null,
                    hoverZone: null,
                    hoverGate: null,
                    pickerOpen: !1,
                  };
                },
                () => this.savePlan(),
              );
          },
          createPlan: () =>
            this.setState(
              (t) => {
                const e = t.floors
                    .map((e, s) =>
                      s === t.floor ? { ...e, zones: t.zones, gates: t.gates, marks: t.marks || [], paths: t.paths || [] } : e,
                    )
                    .map((t, e) => (e === s ? { ...t, chip: "خطة محرم متوفرة", chipTone: "ok", create: !1 } : t)),
                  n = e[s] || {};
                return {
                  floors: e,
                  floor: s,
                  zones: n.zones || [],
                  gates: n.gates || [],
                  marks: n.marks || [],
                  paths: n.paths || [],
                  sel: null,
                  selMulti: [],
                  tool: "select",
                  draft: null,
                  polyPts: [],
                  polyCursor: null,
                  hoverZone: null,
                  hoverGate: null,
                  pickerOpen: !1,
                };
              },
              () => this.savePlan(),
            ),
        };
      }),
      Wt = e.sel && "zone" === e.sel.t ? e.zones[e.sel.i] : null,
      It = e.sel && "gate" === e.sel.t ? e.gates[e.sel.i] : null,
      jt = e.sel && "mark" === e.sel.t ? (e.marks || [])[e.sel.i] : null,
      SS = e.sel && "sector" === e.sel.t ? this._secs()[e.sel.i] || null : null,
      Rt = Wt || It || jt || SS,
      Gt = new Set(),
      Zt = [],
      Yt = (t) => {
        t && !Gt.has(t) && (Gt.add(t), Zt.push(t));
      };
    (f.forEach((t) => {
      t && t.name && Yt(this._ekeyOf(t));
    }),
      S.forEach(Yt),
      (e.zones || [])
        .concat(e.gates || [])
        .concat(e.marks || [])
        .forEach((t) => (t.emp || []).forEach((t) => Yt(this._ck(t)))));
    const Ht = new Set(((Rt && Rt.emp) || []).map((t) => this._ck(t))),
      Xt = [];
    ((e.zones || []).forEach((t) => {
      t !== Rt && Xt.push({ t: "zone", el: t });
    }),
      (e.gates || []).forEach((t) => {
        t !== Rt && Xt.push({ t: "gate", el: t });
      }),
      (e.marks || []).forEach((t) => {
        t !== Rt && Xt.push({ t: "mark", el: t });
      }),
      this._secs().forEach((t) => {
        t !== Rt && Xt.push({ t: "sector", el: t });
      }));
    const Kt = { zone: "مصلى", gate: "باب", mark: "معلم", sector: "نطاق" },
      Ut = (t) => {
        const e = t.el;
        return "sector" === t.t
          ? e.code || e.name || "نطاق"
          : "gate" === t.t
            ? (null == e.num ? "" : String(e.num).trim()) || e.label || "باب"
            : "zone" === t.t
              ? e.code || e.name || "مصلى"
              : e.label || e.kind || "معلم";
      },
      Jt = Zt.filter((t) => !/^(ال)?إدار/.test(String((u[t] || {}).work || "").trim()) || Ht.has(t)).map((t) => {
        const e = u[t] || {},
          s = A[t] || "";
        return {
          key: t,
          name: this._nm(t),
          shift: s,
          onRest: !!E[t],
          checked: Ht.has(t),
          ...((n = t),
          (a = Xt.filter((t) => (t.el.emp || []).some((x) => this._ck(x) === n)).map((t) => ({ code: Ut(t), word: Kt[t.t] }))),
          {
            plcOn: a.length > 0,
            plcShow: a.slice(0, 2),
            plcMore: a.length > 2 ? a.length - 2 : 0,
            plcMoreOn: a.length > 2,
            plcTip: a.length
              ? "مسكَّن أيضاً في: " +
                a
                  .map(function (t) {
                    return t.word + " " + t.code;
                  })
                  .join("، ")
              : "",
          }),
          rowTip: this._nm(t) + " · " + (s || "بدون وردية") + (e.phone ? " · " + e.phone : ""),
        };
        var n, a;
      }),
      qt = (t) => {
        const e = this.state.sel;
        if (!e) return;
        if ("sector" === e.t) {
          const s = this._secs(),
            n = s[e.i];
          if (!n) return;
          const a = n.emp || [];
          return (
            this.setState({ assignOverAsk: null }),
            void this._secWrite(
              s.map((s, n) =>
                n === e.i ? { ...s, emp: a.some((e) => this._ck(e) === t) ? a.filter((e) => this._ck(e) !== t) : [...a, t] } : s,
              ),
            )
          );
        }
        const s = "gate" === e.t ? "gates" : "mark" === e.t ? "marks" : "zones";
        this.setState(
          {
            assignOverAsk: null,
            [s]: this.state[s].map((s, n) => {
              if (n !== e.i) return s;
              const a = s.emp || [];
              return { ...s, emp: a.some((e) => this._ck(e) === t) ? a.filter((e) => this._ck(e) !== t) : [...a, t] };
            }),
          },
          () => this.savePlan(),
        );
      },
      Qt = (t) => () => {
        const e = this.state.sel;
        if (!e) return;
        const s = "gate" === e.t ? this.state.gates[e.i] : "mark" === e.t ? (this.state.marks || [])[e.i] : this.state.zones[e.i],
          n = !!s && !(s.emp || []).some((e) => this._ck(e) === t),
          a = "zone" === e.t ? this.state.zones[e.i] : "mark" === e.t ? (this.state.marks || [])[e.i] : null,
          i = [];
        if (n && a && !a.off && KIVO.BassamNeed.has(a, y)) {
          const s = A[t] || "",
            n = a.emp || [],
            r = s ? KIVO.BassamNeed.of(a, s) : 0,
            l = s ? n.filter((t) => A[t] === s).length >= r : n.filter((t) => A[t]).length >= KIVO.BassamNeed.tot(a, y),
            o = "mark" === e.t ? "المعلم بلغ احتياجه" : "المصلى بلغ احتياجه";
          l && i.push(s ? o + " (" + r + ") من " + s : "mark" === e.t ? "المعلم بلغ إجمالي احتياجه" : "المصلى بلغ إجمالي احتياجه");
        }
        i.length
          ? this.setState({ assignOverAsk: { name: t, txt: i.join("، و") + " — تسكين «" + this._nm(t) + "» يحتاج تأكيداً" } })
          : qt(t);
      },
      Vt = "بدون وردية",
      _t = Jt.some((t) => !t.shift),
      $t = new Set(Object.values(A)),
      te = b.filter((t) => $t.has(t)),
      ee = _t ? te.concat([Vt]) : te.slice(),
      se = e.distFilterShift || null,
      ne = null,
      ae = (t) => (t === Vt ? "#94a3b8" : (y.find((e) => e.name === t) || {}).color || "#94a3b8"),
      ie = (t) => (null == t ? "كل الورديات" : t === Vt ? Vt : x[t] || t),
      re = ee.map((t) => {
        const e = t === ne;
        return {
          name: t,
          fullName: t,
          color: ae(t),
          iconColor: ae(t),
          selected: e,
          pick: () => this.setState({ distFilterShift: this.state.distFilterShift === t ? null : t }),
          btnStyle:
            "width:32px;height:32px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;box-sizing:border-box;border:2px solid " +
            (e ? "#b99751;background:var(--bg-a185151810p1)" : "transparent;background:transparent"),
        };
      }),
      le = re.filter((t) => t.name !== Vt),
      oe = re.find((t) => t.name === Vt) || null,
      de = null == ne ? Jt.slice() : Jt.filter((t) => (ne === Vt ? !t.shift : t.shift === ne)),
      he = String(e.assignQ || ""),
      pe =
        ((ce = he),
        String(null == ce ? "" : ce)
          .toLowerCase()
          .replace(/\u0640/g, "")
          .replace(/[\u064B-\u0652]/g, "")
          .replace(/[\u0623\u0625\u0622\u0671]/g, "ا")
          .replace(/\u0649/g, "ي")
          .replace(/\u0629/g, "ه")
          .replace(/[\u0624\u0626]/g, "ء")
          .trim());
    var ce;
    const ge = KIVO.BassamFind.filter(he, de, (t) => [t.name, t.shift, t.empno, t.cs]),
      fe = ge.map((t) => ({
        name: t.name,
        shift: t.shift,
        onRest: t.onRest,
        checked: t.checked,
        toggle: Qt(t.key),
        rowTip: t.rowTip,
        plcOn: t.plcOn,
        plcShow: t.plcShow,
        plcMore: t.plcMore,
        plcMoreOn: t.plcMoreOn,
        plcTip: t.plcTip,
      })),
      ue = fe.filter((t) => !t.onRest),
      me = fe.filter((t) => t.onRest),
      ye = me.length,
      be = ye > 0,
      xe = !!e.assignRestOpen,
      ke = be && xe,
      Ae = "في راحة اليوم (" + ye + ")",
      ve = xe ? "▾" : "◂",
      Se = !1,
      we = "",
      ze = new Set();
    (e.zones || []).concat(e.gates || []).forEach((t) =>
      (t.emp || []).forEach((t) => {
        t && ze.add(this._ck(t));
      }),
    );
    const Ee = de.length,
      Me = de.filter((t) => ze.has(t.key)).length,
      Oe = Ee ? Math.round((Me / Ee) * 100) : 0,
      Ce = Ee > 0 && Me === Ee,
      Pe = Ce ? "#008450" : Me > 0 ? "#b99751" : "#94a3b8",
      Te = Ee
        ? (null == ne ? "كل الورديات" : ne === Vt ? "موظفون بلا وردية" : /^(ال)?وردية/.test(ne) ? ne : "وردية " + ne) +
          " — سُكّن " +
          Me +
          " من " +
          Ee +
          (Ce ? " · اكتمل تسكين الوردية في هذا الموقع" : " · تبقّى " + (Ee - Me)) +
          " (داخل موقع «" +
          ((e.floors && e.floors[e.floor] && e.floors[e.floor].name) || "الموقع الحالي") +
          "» فقط)"
        : "",
      Fe = (() => {
        if (!Rt || null == ne) return [];
        const t = {};
        return (
          (Rt.emp || []).forEach((e) => {
            const s = A[e] || Vt;
            s !== ne && (t[s] = (t[s] || 0) + 1);
          }),
          b
            .concat([Vt])
            .filter((e) => t[e])
            .map((e) => ({ name: e, label: ie(e), color: ae(e), count: t[e] }))
        );
      })(),
      Le = () => {
        const t = new Set();
        (e.zones || [])
          .concat(e.gates || [])
          .concat(e.marks || [])
          .forEach((e) =>
            (e.emp || []).forEach((e) => {
              e && t.add(this._ck(e));
            }),
          );
        const s = {};
        f.forEach((e) => {
          if (!e || !e.name || t.has(this._ekeyOf(e))) return;
          const n = A[e.name];
          n && (s[n] = s[n] || []).push(this._ekeyOf(e));
        });
        const n = (e.gates || []).map((t) => ({ ...t, emp: (t.emp || []).slice() }));
        let a = 0,
          i = 0,
          r = 0,
          l = 0,
          o = 0;
        const d = new Set();
        return (
          y.forEach((t) => {
            const e = t.name,
              h = s[e] || [];
            let p = 0;
            (n.forEach((t, s) => {
              const n = KIVO.BassamNeed.of(t, e) || 0;
              if (!n) return;
              if (t.closed) return void o++;
              l += n;
              let r = t.emp.filter((t) => A[t] === e).length;
              for (; r < n && p < h.length; ) (t.emp.push(h[p]), p++, r++, a++, d.add(s));
              r < n && (i += n - r);
            }),
              (r += Math.max(0, h.length - p)));
          }),
          { gates2: n, placed: a, deficit: i, surplus: r, gatesN: d.size, closedSkip: o }
        );
      },
      De = () => {
        const t = new Set();
        (e.zones || [])
          .concat(e.gates || [])
          .concat(e.marks || [])
          .forEach((e) =>
            (e.emp || []).forEach((e) => {
              e && t.add(this._ck(e));
            }),
          );
        const s = {};
        f.forEach((e) => {
          if (!e || !e.name || t.has(this._ekeyOf(e))) return;
          const n = A[e.name];
          n && (s[n] = s[n] || []).push(this._ekeyOf(e));
        });
        const n = (e.zones || []).map((t) => ({ ...t, emp: (t.emp || []).slice() }));
        let a = 0,
          i = 0,
          r = 0,
          l = 0;
        const o = new Set();
        return (
          y.forEach((t) => {
            const e = t.name,
              d = s[e] || [];
            let h = 0;
            (n.forEach((t, s) => {
              const n = KIVO.BassamNeed.of(t, e) || 0;
              if (!n) return;
              if (t.off) return void l++;
              let r = t.emp.filter((t) => A[t] === e).length;
              for (; r < n && h < d.length; ) (t.emp.push(d[h]), h++, r++, a++, o.add(s));
              r < n && (i += n - r);
            }),
              (r += Math.max(0, d.length - h)));
          }),
          { zones2: n, placed: a, deficit: i, surplus: r, n: o.size, offSkip: l }
        );
      },
      Ne = () => {
        const t = new Set();
        (e.zones || [])
          .concat(e.gates || [])
          .concat(e.marks || [])
          .forEach((e) =>
            (e.emp || []).forEach((e) => {
              e && t.add(this._ck(e));
            }),
          );
        const s = {};
        f.forEach((e) => {
          if (!e || !e.name || t.has(this._ekeyOf(e))) return;
          const n = A[e.name];
          n && (s[n] = s[n] || []).push(this._ekeyOf(e));
        });
        const n = (e.marks || []).map((t) => ({ ...t, emp: (t.emp || []).slice() }));
        let a = 0,
          i = 0,
          r = 0,
          l = 0;
        const o = new Set();
        return (
          y.forEach((t) => {
            const e = t.name,
              d = s[e] || [];
            let h = 0;
            (n.forEach((t, s) => {
              const n = KIVO.BassamNeed.of(t, e) || 0;
              if (!n) return;
              if (t.off) return void l++;
              let r = t.emp.filter((t) => A[t] === e).length;
              for (; r < n && h < d.length; ) (t.emp.push(d[h]), h++, r++, a++, o.add(s));
              r < n && (i += n - r);
            }),
              (r += Math.max(0, d.length - h)));
          }),
          { marks2: n, placed: a, deficit: i, surplus: r, n: o.size, offSkip: l }
        );
      },
      Be = () => {
        let t = 0,
          s = 0,
          n = 0,
          a = 0;
        return {
          gates2: (e.gates || []).map((e) => {
            if ("أ" === e.pri || "ب" === e.pri || "ج" === e.pri) return (a++, e);
            const i = e.kind || "",
              r = e.cls || "",
              l =
                -1 !== i.indexOf("رئيسي") || -1 !== r.indexOf("جنائز")
                  ? "أ"
                  : -1 !== i.indexOf("سلم") || -1 !== i.indexOf("مصعد") || -1 !== i.indexOf("مصاعد")
                    ? "ج"
                    : "ب";
            return ("أ" === l ? t++ : "ج" === l ? n++ : s++, { ...e, pri: l });
          }),
          a: t,
          b: s,
          j: n,
          skip: a,
          n: t + s + n,
          t: (e.gates || []).length,
        };
      },
      We = () => {
        let t = 0,
          s = 0,
          n = 0;
        return {
          zones2: (e.zones || []).map((e) => {
            if ("أ" === e.pri || "ب" === e.pri || "ج" === e.pri) return (n++, e);
            const a =
              "men" === e.cat ||
              "women" === e.cat ||
              -1 !== String(e.ztype || "").indexOf("مصلى") ||
              -1 !== String(e.ztype || "").indexOf("مصليات") ||
              -1 !== String(e.zcat || "").indexOf("مصلى")
                ? "أ"
                : "ب";
            return ("أ" === a ? t++ : s++, { ...e, pri: a });
          }),
          a: t,
          b: s,
          skip: n,
          n: t + s,
          t: (e.zones || []).length,
        };
      },
      Ie = Wt ? L(Wt) : null,
      je = Wt ? N(Wt) : null,
      Re = !!Wt && this.areaIsDerived(Wt, F);
    return {
      pathHandleNodes:
        !e.sel || "path" !== e.sel.t || a || ("plan" !== e.lens && "paths" !== e.lens) || d || !(e.paths || [])[e.sel.i]
          ? null
          : (() => {
              const t = e.sel.i,
                s = e.paths[t].pts || [],
                n = e.view.w / 1e3,
                a = [];
              for (let e = 0; e < s.length - 1; e++) {
                const i = s[e],
                  r = s[e + 1],
                  l = (i.x + r.x) / 2,
                  o = (i.y + r.y) / 2;
                a.push(
                  React.createElement("circle", {
                    key: "pm" + e,
                    cx: l,
                    cy: o,
                    r: 2.6 * n,
                    fill: "#fff",
                    stroke: "#b99751",
                    strokeWidth: 1.1 * n,
                    strokeDasharray: 1.8 * n + " " + 1.6 * n,
                    opacity: 0.85,
                    style: { cursor: "copy" },
                    onPointerDown: (s) => {
                      if ((s.stopPropagation(), s.detail >= 2)) return;
                      const n = ((this.state.paths[t] || {}).pts || []).slice(),
                        a = n.slice();
                      (a.splice(e + 1, 0, { x: l, y: o }),
                        this.setState({
                          paths: this.state.paths.map((e, s) => (s === t ? { ...e, pts: a } : e)),
                          pvdrag: { i: t, j: e + 1, added: !0, moved: !1, pts0: n, sx: l, sy: o },
                        }));
                    },
                    onDoubleClick: (e) => {
                      (e.stopPropagation(), this.setState({ pvdrag: null, pdrag: null }), this.openPathEditor(t, !1));
                    },
                  }),
                );
              }
              return (
                s.forEach((e, s) =>
                  a.push(
                    React.createElement("circle", {
                      key: "pv" + s,
                      cx: e.x,
                      cy: e.y,
                      r: 3.6 * n,
                      fill: "#fff",
                      stroke: "#b99751",
                      strokeWidth: 1.5 * n,
                      style: { cursor: "grab" },
                      onPointerDown: (e) => {
                        (e.stopPropagation(), this.setState({ pvdrag: { i: t, j: s } }));
                      },
                      onDoubleClick: (e) => {
                        e.stopPropagation();
                        const n = (this.state.paths[t] || {}).pts || [];
                        n.length <= 2 ||
                          this.setState(
                            { paths: this.state.paths.map((e, a) => (a === t ? { ...e, pts: n.filter((t, e) => e !== s) } : e)) },
                            () => this.savePlan(),
                          );
                      },
                    }),
                  ),
                ),
                React.createElement("g", null, a)
              );
            })(),
      handleNodes:
        Wt && !a && "plan" === e.lens && !d && V
          ? (() => {
              const t = G(Wt);
              if (t.length < 3) return null;
              const s = [],
                n = e.view.w / 1e3,
                a = 3.6 * n,
                i = 1.4 * n,
                r = 2.6 * n,
                l = 1 * n,
                o = t.map((t) => t.x),
                d = t.map((t) => t.y),
                h = (Math.min(...o) + Math.max(...o)) / 2,
                p = (Math.min(...d) + Math.max(...d)) / 2;
              if ("circle" === Wt.kind) {
                const t = (Math.max(...o) - Math.min(...o)) / 2,
                  e = h + t,
                  a = p;
                return (
                  s.push(
                    React.createElement("line", {
                      key: "cr-arm",
                      x1: h,
                      y1: p,
                      x2: e,
                      y2: a,
                      stroke: "#b99751",
                      strokeWidth: 1 * n,
                      strokeDasharray: 2 * n + " " + 2 * n,
                      style: { pointerEvents: "none" },
                    }),
                  ),
                  s.push(
                    React.createElement("circle", {
                      key: "cr-c",
                      cx: h,
                      cy: p,
                      r: 2.2 * n,
                      fill: "#b99751",
                      stroke: "#fff",
                      strokeWidth: 1 * n,
                      style: { pointerEvents: "none" },
                    }),
                  ),
                  s.push(
                    React.createElement("circle", {
                      key: "cr-h",
                      cx: e,
                      cy: a,
                      r: 3.4 * n,
                      fill: "#dc2626",
                      stroke: "#fff",
                      strokeWidth: 1.4 * n,
                      style: { cursor: "ew-resize" },
                      onPointerDown: (e) => {
                        e.stopPropagation();
                        const s = this.state.sel;
                        s && "zone" === s.t && this.setState({ cresize: { cx: h, cy: p, pts: G(this.state.zones[s.i]), r0: t || 1 } });
                      },
                    }),
                  ),
                  s
                );
              }
              t.forEach((e, a) => {
                const i = t[(a + 1) % t.length];
                s.push(
                  React.createElement("line", {
                    key: "e" + a,
                    x1: e.x,
                    y1: e.y,
                    x2: i.x,
                    y2: i.y,
                    stroke: "transparent",
                    strokeWidth: 7 * n,
                    strokeLinecap: "round",
                    style: { cursor: "move" },
                    onPointerDown: (e) => {
                      e.stopPropagation();
                      const s = this.state.sel;
                      if (!s || "zone" !== s.t) return;
                      const n = Ot(e);
                      this.setState({ edrag: { a: a, b: (a + 1) % t.length, pts: G(this.state.zones[s.i]), sx: n.x, sy: n.y } });
                    },
                  }),
                );
              });
              const c = Wt.hs || [],
                g = 13 * n;
              (t.forEach((e, a) => {
                const i = t[(a - 1 + t.length) % t.length],
                  r = t[(a + 1) % t.length],
                  l = c[a] || {},
                  o = (() => {
                    let t = r.x - e.x,
                      s = r.y - e.y;
                    const n = Math.hypot(t, s) || 1;
                    return { x: (t / n) * g, y: (s / n) * g };
                  })(),
                  d = (() => {
                    let t = i.x - e.x,
                      s = i.y - e.y;
                    const n = Math.hypot(t, s) || 1;
                    return { x: (t / n) * g, y: (s / n) * g };
                  })();
                [
                  ["out", l.out && Math.abs(l.out.x) + Math.abs(l.out.y) > 1 ? l.out : o],
                  ["in", l.in && Math.abs(l.in.x) + Math.abs(l.in.y) > 1 ? l.in : d],
                ].forEach(([t, i]) => {
                  const r = e.x + i.x,
                    l = e.y + i.y;
                  (s.push(
                    React.createElement("line", {
                      key: "gl" + a + t,
                      x1: e.x,
                      y1: e.y,
                      x2: r,
                      y2: l,
                      stroke: "#16a34a",
                      strokeWidth: 1 * n,
                      strokeDasharray: 2 * n + " " + 2 * n,
                      style: { pointerEvents: "none" },
                    }),
                  ),
                    s.push(
                      React.createElement("circle", {
                        key: "g" + a + t,
                        cx: r,
                        cy: l,
                        r: 2.7 * n,
                        fill: "#16a34a",
                        stroke: "#fff",
                        strokeWidth: 1.2 * n,
                        style: { cursor: "grab" },
                        onPointerDown: (e) => {
                          e.stopPropagation();
                          const s = this.state.sel;
                          s && "zone" === s.t && this.setState({ tdrag: { i: a, side: t } });
                        },
                        onDoubleClick: (e) => {
                          e.stopPropagation();
                          const s = this.state.sel;
                          if (!s || "zone" !== s.t) return;
                          const n = this.state.zones[s.i],
                            i = (n.hs || []).slice(),
                            r = G(n).length;
                          for (; i.length < r; ) i.push({ in: { x: 0, y: 0 }, out: { x: 0, y: 0 } });
                          ((i[a] = { ...(i[a] || {}), [t]: { x: 0, y: 0 } }),
                            this.setState({ zones: this.state.zones.map((t, e) => (e === s.i ? X({ ...t, hs: i }, G(t)) : t)) }, () =>
                              this.savePlan(),
                            ));
                        },
                      }),
                    ));
                });
              }),
                t.forEach((e, a) => {
                  const i = t[(a + 1) % t.length],
                    o = (e.x + i.x) / 2,
                    d = (e.y + i.y) / 2;
                  s.push(
                    React.createElement("circle", {
                      key: "m" + a,
                      cx: o,
                      cy: d,
                      r: r,
                      fill: "#fff",
                      stroke: "#b99751",
                      strokeWidth: l,
                      strokeDasharray: 1.4 * n + " " + 1.4 * n,
                      style: { cursor: "copy" },
                      onPointerDown: (t) => {
                        t.stopPropagation();
                        const e = this.state.sel;
                        if (!e || "zone" !== e.t) return;
                        const s = G(this.state.zones[e.i]);
                        (s.splice(a + 1, 0, { x: o, y: d }),
                          this.setState({
                            zones: this.state.zones.map((t, n) =>
                              n === e.i ? X({ ...t, hs: KIVO.BassamCurve.ins(t.hs, s.length - 1, a + 1) }, s) : t,
                            ),
                            vdrag: { i: a + 1 },
                          }));
                      },
                    }),
                  );
                }),
                t.forEach((t, e) =>
                  s.push(
                    React.createElement("circle", {
                      key: "h" + e,
                      cx: t.x,
                      cy: t.y,
                      r: a,
                      fill: "#dc2626",
                      stroke: "#fff",
                      strokeWidth: i,
                      style: { cursor: "grab" },
                      onPointerDown: (t) => {
                        (t.stopPropagation(), this.setState({ vdrag: { i: e } }));
                      },
                      onDoubleClick: (t) => {
                        t.stopPropagation();
                        const s = this.state.sel;
                        if (!s || "zone" !== s.t) return;
                        const n = G(this.state.zones[s.i]);
                        n.length <= 3 ||
                          (n.splice(e, 1),
                          this.setState(
                            {
                              zones: this.state.zones.map(
                                ((K9) => (t, e) => (e === s.i ? X({ ...t, hs: KIVO.BassamCurve.del(t.hs, K9) }, n) : t))(e),
                              ),
                            },
                            () => this.savePlan(),
                          ));
                      },
                    }),
                  ),
                ));
              const f = t.map((t) => t.x),
                u = t.map((t) => t.y),
                m = (Math.min(...f) + Math.max(...f)) / 2,
                y = Math.min(...u),
                b = (Math.min(...f) + Math.max(...f)) / 2,
                x = (Math.min(...u) + Math.max(...u)) / 2,
                k = 4.4 * n,
                A = y - 26 * n;
              return (
                s.push(
                  React.createElement("line", {
                    key: "rot-arm",
                    x1: m,
                    y1: y,
                    x2: m,
                    y2: A,
                    stroke: "#b99751",
                    strokeWidth: 1.2 * n,
                    strokeDasharray: 3 * n + " " + 2 * n,
                    style: { pointerEvents: "none" },
                  }),
                ),
                s.push(
                  React.createElement("circle", {
                    key: "rot",
                    cx: m,
                    cy: A,
                    r: k,
                    fill: "#b99751",
                    stroke: "#fff",
                    strokeWidth: 1.6 * n,
                    style: { cursor: "grab" },
                    onPointerDown: (t) => {
                      t.stopPropagation();
                      const e = this.state.sel;
                      if (!e || "zone" !== e.t) return;
                      const s = Ot(t),
                        n = Math.atan2(s.y - x, s.x - b);
                      this.setState({ rotdrag: { cx: b, cy: x, pts: G(this.state.zones[e.i]), startAng: n } });
                    },
                  }),
                ),
                s
              );
            })()
          : null,
      zEditOn: !!e.zEdit,
      zeToggleLabel: () => this.setState({ zEdit: { ...this.state.zEdit, hideLabel: !(this.state.zEdit && this.state.zEdit.hideLabel) } }),
      zeEyeTitle: e.zEdit && e.zEdit.hideLabel ? "الرمز مخفي على اللوحة — اضغط لإظهاره" : "الرمز ظاهر على اللوحة — اضغط لإخفائه",
      zeEyeColor: e.zEdit && e.zEdit.hideLabel ? "#94a3b8" : "#9A7E40",
      zeEyeSlash: e.zEdit && e.zEdit.hideLabel ? "M2 2 22 22" : "",
      zeSer: (e.zEdit && e.zEdit.ser) || "",
      onZeSer: (t) => this.setState({ zEdit: { ...this.state.zEdit, ser: t.target.value.replace(/[^0-9]/g, "").slice(0, 3) } }),
      zeNeed: (e.zEdit && e.zEdit.needN) || "",
      zeNeedShOn: !!e.zEdit,
      zeNeedChips: e.zEdit ? this._needChips("zEdit") : [],
      zeNeedPlain: !(e.zEdit && this._needChips("zEdit").length),
      zeNeedTot: e.zEdit ? String(this._needTotOf("zEdit")) : "0",
      onZeNeed: (t) => this.setState({ zEdit: { ...this.state.zEdit, needN: t.target.value.replace(/[^0-9]/g, "").slice(0, 4) } }),
      geNeed: (e.gEdit && e.gEdit.needN) || "",
      geNeedShOn: !!e.gEdit,
      geNeedChips: e.gEdit ? this._needChips("gEdit") : [],
      geNeedPlain: !(e.gEdit && this._needChips("gEdit").length),
      geNeedTot: e.gEdit ? String(this._needTotOf("gEdit")) : "0",
      onGeNeed: (t) => this.setState({ gEdit: { ...this.state.gEdit, needN: t.target.value.replace(/[^0-9]/g, "").slice(0, 4) } }),
      zeCodePreview: e.zEdit
        ? this._composeZoneCode(e.zEdit.region, e.zEdit.level, (e.zEdit.ser || "").trim() || "00", null, e.zEdit.ztype)
        : "",
      zeDelete: () => {
        const t = this.state.zEdit;
        t &&
          this.setState({ zones: this.state.zones.filter((e, s) => s !== t.i), sel: null, selMulti: [], zEdit: null }, () =>
            this.savePlan(),
          );
      },
      zeCancel: () => this.closeShapeEditor(),
      zeFieldsNode: (() => {
        if (!e.zEdit) return null;
        const t = React.createElement,
          s = e.zEdit,
          n = t(
            "svg",
            {
              width: 11,
              height: 11,
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              strokeWidth: 2,
              strokeLinecap: "round",
              strokeLinejoin: "round",
            },
            t("path", { d: "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" }),
          ),
          a = t(
            "svg",
            {
              width: 11,
              height: 11,
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              strokeWidth: 2,
              strokeLinecap: "round",
              strokeLinejoin: "round",
            },
            t("path", { d: "M3 6h18" }),
            t("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" }),
          ),
          i = (e) =>
            t(
              "svg",
              {
                width: 12,
                height: 12,
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: 2.4,
                strokeLinecap: "round",
                strokeLinejoin: "round",
                style: { flexShrink: 0, transition: "transform .2s", opacity: 0.55, transform: e ? "rotate(180deg)" : "none" },
              },
              t("path", { d: "m6 9 6 6 6-6" }),
            ),
          r = (t, e) => {
            let s = 0;
            return (
              (this.state.floors || []).forEach((n) =>
                (n.zones || []).forEach((n) => {
                  n[t] === e && s++;
                }),
              ),
              s
            );
          },
          l = (e, s, n, a, i) => {
            const r = this.zcatStyleOf(e, i);
            if (!r) return null;
            const l = "bsZs" + a,
              o = r.h && "none" !== r.h,
              d = 0.65,
              h = s - 1.85,
              p = n - 1.85,
              c = r.bs || "dash";
            let g = "none";
            if ("solid" !== c) {
              const t = 2 * (h + p) - 28 + 2 * Math.PI * 3.5;
              if ("dot" === c) {
                const e = t / Math.max(6, Math.round(t / 5));
                g = (1.15 * d).toFixed(2) + " " + (e - 1.15 * d).toFixed(2);
              } else {
                const e = t / Math.max(4, Math.round(t / 8.4));
                g = (0.66 * e).toFixed(2) + " " + (0.34 * e).toFixed(2);
              }
            }
            return t(
              "svg",
              { width: s, height: n, viewBox: "0 0 " + s + " " + n, style: { flexShrink: 0, overflow: "visible" } },
              o ? this._mkHatchPattern(l, r, "sp") : null,
              t("rect", {
                x: 0.925,
                y: 0.925,
                width: h,
                height: p,
                rx: 3.5,
                fill: o ? "url(#" + l + ")" : r.f,
                fillOpacity: (null != r.o ? r.o : 50) / 100,
                stroke: r.s,
                strokeWidth: d,
                strokeDasharray: g,
                strokeLinecap: "dot" === c ? "round" : "butt",
                strokeLinejoin: "round",
              }),
            );
          },
          o = (o, d, h, p) => {
            const c = this.zoneOptList(o),
              g = (s.region || "").trim(),
              f = (s.ztype || "").trim(),
              u = c
                .map((t, e) => ({ o: t, oi: e }))
                .filter((t) => "level" !== o || !(t.o && t.o.r) || t.o.r === g)
                .filter((t) => "zcat" !== o || this._catFitsType(t.o, f)),
              m = e.zDd === o,
              y = e.zDdEdit && e.zDdEdit.key === o,
              b = s[o] || "",
              x =
                ("level" === o &&
                  (c.find((t) => this._optName(t) === b && t && t.r === g) || c.find((t) => this._optName(t) === b && !(t && t.r)))) ||
                c.find((t) => this._optName(t) === b),
              k = p ? this._optCode(x) : "",
              A = (e) =>
                t(
                  "span",
                  {
                    dir: "ltr",
                    style: {
                      fontFamily: "'Cairo',sans-serif",
                      fontFeatureSettings: "'tnum'",
                      fontSize: 10,
                      fontWeight: 400,
                      color: "var(--fg-x9a7e40)",
                      flexShrink: 0,
                    },
                  },
                  "#" + e,
                ),
              v = u.map((e, i) => {
                const d = e.o,
                  h = e.oi,
                  c = this._optName(d),
                  g = this._optCode(d),
                  f = s[o] === c,
                  u = r(o, c);
                return t(
                  "div",
                  {
                    key: "o" + h,
                    onClick: () =>
                      this.setState((t) => {
                        const e = t.zEdit || {},
                          s = f ? "" : c,
                          n = { ...e, [o]: s };
                        if ("region" === o) {
                          const t = (e.level || "").trim();
                          if (t) {
                            const e = this.zoneOptList("level").some((e) => !(this._optName(e) !== t || (e && e.r && e.r !== s)));
                            e || (n.level = "");
                          }
                        }
                        if ("ztype" === o) {
                          const t = (e.zcat || "").trim();
                          if (t) {
                            const e = this.zoneOptList("zcat").some((e) => this._optName(e) === t && this._catFitsType(e, s));
                            e || (n.zcat = "");
                          }
                        }
                        return { zEdit: n, zDd: null };
                      }),
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 8px",
                      borderRadius: 7,
                      cursor: "pointer",
                      fontSize: 11,
                      fontFamily: "'Cairo',sans-serif",
                      transition: "background .15s",
                      background: f ? "var(--bg-a185151810p1)" : "transparent",
                      fontWeight: f ? 800 : 400,
                      color: f ? "var(--fg-x9a7e40)" : "var(--fg-x25343f)",
                    },
                  },
                  "zcat" === o ? l(c, 26, 15, "r" + h, (s.ztype || "").trim()) : null,
                  p && g ? A(g) : null,
                  t("span", { style: { flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, c),
                  "zcat" === o
                    ? t(
                        "button",
                        {
                          title: "تنسيق الفئة — لون وحدود وشفافية وتهشير",
                          onClick: (t) => {
                            t.stopPropagation();
                            const e = (s.ztype || "").trim(),
                              n = this.zcatStyleOf(c, e) || {};
                            this.setState({
                              zcs: {
                                name: c,
                                zt: e,
                                f: n.f || "#22c55e",
                                s: n.s || this._darken(n.f || "#22c55e"),
                                sAuto: null == n.sAuto ? !n.s : !!n.sAuto,
                                o: null != n.o ? n.o : 50,
                                bs: n.bs || "dash",
                                bw: null != n.bw ? n.bw : 1,
                                h: n.h || "none",
                                hc: n.hc || n.s || "#000000",
                                hw: null != n.hw ? n.hw : 0.3,
                                hg: null != n.hg ? n.hg : 1.6,
                              },
                              zDd: null,
                              zDdEdit: null,
                              zDdEditT: null,
                            });
                          },
                          style: {
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            border: 0,
                            background: "transparent",
                            color: "var(--fg-xb99751)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          },
                        },
                        t(
                          "svg",
                          {
                            width: 12,
                            height: 12,
                            viewBox: "0 0 24 24",
                            fill: "none",
                            stroke: "currentColor",
                            strokeWidth: 2,
                            strokeLinecap: "round",
                            strokeLinejoin: "round",
                          },
                          t("path", {
                            d: "M12 22a10 10 0 1 1 10-10c0 2-1.2 3-3 3h-2.6a2.4 2.4 0 0 0-1.8 4c.4.5.6.9.6 1.3a1.7 1.7 0 0 1-1.7 1.7Z",
                          }),
                          t("circle", { cx: 7.5, cy: 10.5, r: 0.5 }),
                          t("circle", { cx: 12, cy: 7, r: 0.5 }),
                          t("circle", { cx: 16.5, cy: 10.5, r: 0.5 }),
                        ),
                      )
                    : null,
                  t(
                    "button",
                    {
                      title: "تعديل",
                      onClick: (t) => {
                        (t.stopPropagation(),
                          this.setState({
                            zDdEdit: { key: o, idx: h, was: c },
                            zDdEditVal: c,
                            zDdEditC: g,
                            zDdEditT: (this._optCats(d) || []).slice(),
                          }));
                      },
                      style: {
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        border: 0,
                        background: "transparent",
                        color: "var(--fg-x94a3b8)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      },
                    },
                    n,
                  ),
                  t(
                    "button",
                    {
                      title: u
                        ? "حذف نهائي — سيُزال من " +
                          KIVO.BassamCount(u, "مصلى", "g") +
                          " " +
                          KIVO.BassamCount.agr(u, "يستعمله", "يستعملانه", "تستعمله")
                        : "حذف",
                      onClick: (t) => {
                        (t.stopPropagation(), this.delZoneOpt(o, h));
                      },
                      style: {
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        border: 0,
                        background: "transparent",
                        color: "var(--fg-xcbd5e1)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      },
                    },
                    a,
                  ),
                );
              }),
              S = {
                position: "absolute",
                top: "100%",
                right: 0,
                left: 0,
                zIndex: 45,
                marginTop: 4,
                background: "var(--bg-xffffff)",
                border: "1px solid var(--bd-a185151810p35)",
                borderRadius: 10,
                boxShadow: "0 12px 30px -8px rgba(0,0,0,0.30)",
              },
              w =
                "level" !== o || g
                  ? "level" === o && g
                    ? "لا أدوار بعد لمنطقة «" + g + "» — أضف أول دور من الحقل أدناه"
                    : "لا خيارات بعد — أضف أول خيار من الحقل أدناه"
                  : "اختر المنطقة أولاً — قائمة الأدوار / المستويات تتبع المنطقة المختارة",
              z = y
                ? t(
                    "div",
                    { className: "bs-optmenu", style: { ...S, zIndex: 46, padding: 10, display: "flex", flexDirection: "column", gap: 8 } },
                    t("div", { style: { fontSize: 11, fontWeight: 600, color: "var(--fg-x9a7e40)" } }, "تعديل الخيار"),
                    t("input", {
                      placeholder: "الاسم",
                      value: e.zDdEditVal || "",
                      onChange: (t) => this.setState({ zDdEditVal: t.target.value }),
                      onKeyDown: (t) => {
                        "Enter" === t.key && (t.preventDefault(), this.saveZoneOptEdit());
                      },
                      style: {
                        height: 30,
                        border: "1px solid var(--bd-xe1e1e1)",
                        borderRadius: 8,
                        padding: "0 8px",
                        fontSize: 11.5,
                        outline: "none",
                        fontFamily: "'Cairo',sans-serif",
                        boxSizing: "border-box",
                      },
                    }),
                    "ztype" === o
                      ? t(
                          "div",
                          { style: { display: "flex", flexDirection: "column", gap: 5 } },
                          t("span", { style: { fontSize: 10, fontWeight: 400, color: "var(--fg-x53565a)" } }, "فئات هذا النوع"),
                          t(
                            "div",
                            { style: { display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 92, overflowY: "auto" } },
                            this.zoneOptList("zcat").map((s, n) => {
                              const a = this._optName(s),
                                i = Array.isArray(e.zDdEditT) ? e.zDdEditT : [],
                                r = i.indexOf(a) >= 0;
                              return t(
                                "button",
                                {
                                  key: "ct" + n,
                                  onClick: (t) => {
                                    t.stopPropagation();
                                    const e = i.slice(),
                                      s = e.indexOf(a);
                                    (s >= 0 ? e.splice(s, 1) : e.push(a), this.setState({ zDdEditT: e }));
                                  },
                                  style: {
                                    fontSize: 10,
                                    fontWeight: 400,
                                    fontFamily: "'Cairo',sans-serif",
                                    padding: "4px 9px",
                                    borderRadius: 9999,
                                    cursor: "pointer",
                                    border: "1px solid " + (r ? "var(--bd-a185151810p5)" : "var(--bd-a2252252250p9)"),
                                    background: r ? "var(--bg-a185151810p12)" : "var(--bg-xffffff)",
                                    color: r ? "var(--fg-x9a7e40)" : "var(--fg-x94a3b8)",
                                  },
                                },
                                a,
                              );
                            }),
                          ),
                          t(
                            "span",
                            { style: { fontSize: 9, color: "var(--fg-x94a3b8)", lineHeight: 1.6 } },
                            "بلا اختيار = كل الفئات تظهر مع هذا النوع",
                          ),
                        )
                      : null,
                    p
                      ? t(
                          "div",
                          { style: { display: "flex", alignItems: "center", gap: 6 } },
                          t(
                            "span",
                            { style: { fontSize: 10, fontWeight: 400, color: "var(--fg-x53565a)", flex: 1 } },
                            "الرمز (حرف أو رقم)",
                          ),
                          t("input", {
                            dir: "ltr",
                            placeholder: "1",
                            value: e.zDdEditC || "",
                            onChange: (t) => this.setState({ zDdEditC: this._codeSan(t.target.value) }),
                            onKeyDown: (t) => {
                              "Enter" === t.key && (t.preventDefault(), this.saveZoneOptEdit());
                            },
                            style: {
                              width: 70,
                              height: 30,
                              border: "1px solid var(--bd-xe1e1e1)",
                              borderRadius: 8,
                              padding: "0 6px",
                              fontSize: 11.5,
                              outline: "none",
                              fontFamily: "'Cairo',sans-serif",
                              fontFeatureSettings: "'tnum'",
                              textAlign: "center",
                              boxSizing: "border-box",
                            },
                          }),
                        )
                      : null,
                    t(
                      "span",
                      { style: { fontSize: 9, color: "var(--fg-x94a3b8)", lineHeight: 1.6 } },
                      "level" === o
                        ? "الدور تابع لمنطقته — التعديل يسري على مواقع هذه المنطقة فقط"
                        : "التعديل يسري على كل المناطق التي تستعمل هذا الخيار",
                    ),
                    t(
                      "div",
                      { style: { display: "flex", gap: 6 } },
                      t(
                        "button",
                        {
                          onClick: () => this.saveZoneOptEdit(),
                          style: {
                            flex: 1,
                            height: 29,
                            borderRadius: 8,
                            border: 0,
                            background: "var(--bg-xb99751)",
                            color: "var(--fg-xffffff)",
                            fontSize: 11.5,
                            fontWeight: 400,
                            cursor: "pointer",
                            fontFamily: "'Cairo',sans-serif",
                          },
                        },
                        "حفظ",
                      ),
                      t(
                        "button",
                        {
                          onClick: () => this.setState({ zDdEdit: null, zDdEditT: null }),
                          style: {
                            height: 29,
                            padding: "0 12px",
                            borderRadius: 8,
                            border: "1px solid var(--bd-xe1e1e1)",
                            background: "var(--bg-xffffff)",
                            color: "var(--fg-x141414)",
                            fontSize: 11.5,
                            fontWeight: 400,
                            cursor: "pointer",
                            fontFamily: "'Cairo',sans-serif",
                          },
                        },
                        "إلغاء",
                      ),
                    ),
                  )
                : m
                  ? t(
                      "div",
                      { className: "bs-optmenu", style: { ...S, overflow: "hidden" } },
                      t(
                        "div",
                        { style: { maxHeight: 150, overflowY: "auto", padding: 4 } },
                        v.length
                          ? v
                          : t(
                              "div",
                              {
                                style: {
                                  fontSize: 10,
                                  color: "var(--fg-x94a3b8)",
                                  padding: "10px 8px",
                                  textAlign: "center",
                                  lineHeight: 1.7,
                                },
                              },
                              w,
                            ),
                      ),
                      t(
                        "div",
                        {
                          style: {
                            display: "flex",
                            gap: 5,
                            padding: 6,
                            borderTop: "1px solid var(--bd-xf1f5f9)",
                            background: "var(--bg-xfafafa)",
                          },
                        },
                        t("input", {
                          value: e.zDdNew || "",
                          onChange: (t) => this.setState({ zDdNew: t.target.value }),
                          onKeyDown: (t) => {
                            "Enter" === t.key && (t.preventDefault(), this.addZoneOpt(o));
                          },
                          placeholder: "خيار جديد...",
                          style: {
                            flex: 1,
                            minWidth: 0,
                            height: 28,
                            border: "1px solid var(--bd-xe1e1e1)",
                            borderRadius: 7,
                            padding: "0 8px",
                            fontSize: 11,
                            outline: "none",
                            fontFamily: "'Cairo',sans-serif",
                            boxSizing: "border-box",
                          },
                        }),
                        p
                          ? t("input", {
                              dir: "ltr",
                              value: e.zDdNewC || "",
                              onChange: (t) => this.setState({ zDdNewC: this._codeSan(t.target.value) }),
                              onKeyDown: (t) => {
                                "Enter" === t.key && (t.preventDefault(), this.addZoneOpt(o));
                              },
                              placeholder: "رمز",
                              title: "رمز الخيار",
                              style: {
                                width: 46,
                                height: 28,
                                border: "1px solid var(--bd-xe1e1e1)",
                                borderRadius: 7,
                                padding: "0 5px",
                                fontSize: 11,
                                outline: "none",
                                fontFamily: "'Cairo',sans-serif",
                                fontFeatureSettings: "'tnum'",
                                textAlign: "center",
                                boxSizing: "border-box",
                              },
                            })
                          : null,
                        t(
                          "button",
                          {
                            title: "إضافة",
                            onClick: () => this.addZoneOpt(o),
                            style: {
                              width: 28,
                              height: 28,
                              borderRadius: 7,
                              border: 0,
                              background: "var(--bg-xb99751)",
                              color: "var(--fg-xffffff)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            },
                          },
                          t(
                            "svg",
                            {
                              width: 13,
                              height: 13,
                              viewBox: "0 0 24 24",
                              fill: "none",
                              stroke: "currentColor",
                              strokeWidth: 2.4,
                              strokeLinecap: "round",
                              strokeLinejoin: "round",
                            },
                            t("path", { d: "M5 12h14" }),
                            t("path", { d: "M12 5v14" }),
                          ),
                        ),
                      ),
                    )
                  : null;
            return t(
              "div",
              { key: o, style: { position: "relative", minWidth: 0 } },
              t("label", { style: { fontSize: 11, fontWeight: 400, color: "var(--fg-x374151)", display: "block", marginBottom: 5 } }, d),
              t(
                "button",
                {
                  onClick: () => this.setState({ zDd: m ? null : o, zDdEdit: null, zDdEditT: null, zDdNew: "" }),
                  style: {
                    width: "100%",
                    height: 34,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "0 10px",
                    borderRadius: 8,
                    border: "1px solid " + (m || y ? "var(--bd-xb99751)" : "var(--bd-xe1e1e1)"),
                    background: "var(--bg-xffffff)",
                    cursor: "pointer",
                    fontFamily: "'Cairo',sans-serif",
                    fontSize: 11.5,
                    fontWeight: 400,
                    color: b ? "var(--fg-x141414)" : "var(--fg-x94a3b8)",
                    boxSizing: "border-box",
                  },
                },
                "zcat" === o && b ? l(b, 26, 15, "b", (s.ztype || "").trim()) : null,
                p && b && k ? A(k) : null,
                t(
                  "span",
                  {
                    style: { flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "right" },
                  },
                  b || h,
                ),
                i(m),
              ),
              z,
            );
          },
          d = !!s.off,
          h = t(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                borderRadius: 10,
                padding: "9px 12px",
                background: d ? "var(--bg-a1001161390p07)" : "var(--bg-a22163740p06)",
                border: "1px solid " + (d ? "var(--bd-a1001161390p3)" : "var(--bd-a22163740p3)"),
              },
            },
            t("span", { style: { fontSize: 11, fontWeight: 400, color: "var(--fg-x374151)" } }, "الحالة"),
            t(
              "button",
              {
                onClick: () => this.setState({ zEdit: { ...this.state.zEdit, off: !d } }),
                style: {
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                  fontFamily: "'Cairo',sans-serif",
                  padding: 0,
                },
              },
              t(
                "span",
                { style: { fontSize: 11, fontWeight: 600, color: d ? "var(--fg-x64748b)" : "var(--fg-x047857)" } },
                d ? "معطّلة" : "مفعّلة",
              ),
              t(
                "span",
                {
                  style: {
                    position: "relative",
                    display: "inline-block",
                    width: 36,
                    height: 20,
                    borderRadius: 9999,
                    transition: "all .2s",
                    verticalAlign: "middle",
                    background: d ? "var(--bg-xd7dce2)" : "linear-gradient(135deg,#4ade80,#16a34a)",
                  },
                },
                t("span", {
                  style: {
                    position: "absolute",
                    top: 2,
                    width: 16,
                    height: 16,
                    borderRadius: 9999,
                    background: "var(--bg-xffffff)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                    transition: "all .2s",
                    right: d ? 2 : 18,
                  },
                }),
              ),
            ),
          ),
          p = (() => {
            const e = (t) => "" === String(null == s[t] ? "" : s[t]).trim(),
              n = (e, n, a, i) =>
                t("input", {
                  dir: "ltr",
                  type: "number",
                  min: n,
                  max: a,
                  step: i,
                  value: null == s[e] ? "" : s[e],
                  placeholder: "تلقائي",
                  onChange: (t) => {
                    const s = t.target.value;
                    this.setState((t) => ({ zEdit: { ...(t.zEdit || {}), [e]: s } }));
                  },
                  style: {
                    flex: 1,
                    minWidth: 0,
                    height: 34,
                    border: "1px solid var(--bd-xe1e1e1)",
                    borderRadius: 8,
                    padding: "0 8px",
                    fontSize: 12,
                    outline: "none",
                    fontFamily: "'Cairo',sans-serif",
                    fontFeatureSettings: "'tnum'",
                    textAlign: "center",
                    boxSizing: "border-box",
                  },
                }),
              a = (s) =>
                t(
                  "button",
                  {
                    title: "إعادة إلى الحساب التلقائي",
                    onClick: () => this.setState((t) => ({ zEdit: { ...(t.zEdit || {}), [s]: "" } })),
                    style: {
                      height: 34,
                      padding: "0 9px",
                      borderRadius: 8,
                      border: "1px solid " + (e(s) ? "var(--bd-a185151810p45)" : "var(--bd-xe1e1e1)"),
                      background: e(s) ? "var(--bg-a185151810p1)" : "var(--bg-xffffff)",
                      color: e(s) ? "var(--fg-x9a7e40)" : "var(--fg-x94a3b8)",
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "'Cairo',sans-serif",
                      flexShrink: 0,
                    },
                  },
                  "تلقائي",
                ),
              i = (e, s, i, r, l) =>
                t(
                  "div",
                  { style: { minWidth: 0 } },
                  t(
                    "label",
                    { style: { fontSize: 11, fontWeight: 400, color: "var(--fg-x374151)", display: "block", marginBottom: 5 } },
                    s,
                  ),
                  t("div", { style: { display: "flex", gap: 5 } }, n(e, i, r, l), a(e)),
                );
            return t(
              "div",
              {
                style: {
                  borderRadius: 10,
                  padding: "10px 12px",
                  background: "var(--bg-a185151810p05)",
                  border: "1px solid var(--bd-a185151810p25)",
                },
              },
              t("div", { style: { fontSize: 11, fontWeight: 600, color: "var(--fg-x9a7e40)", marginBottom: 8 } }, "رمز المصلى على الخريطة"),
              t(
                "div",
                { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } },
                i("lsz", "حجم الخط (4–40)", 4, 40, 0.5),
                i("lang", "الدوران (°)", -360, 360, 1),
              ),
              t(
                "div",
                { style: { fontSize: 9.5, color: "var(--fg-x94a3b8)", marginTop: 6, lineHeight: 1.7 } },
                "«تلقائي» = الحجم يُحسب ليتّسع داخل الشكل والدوران يتبع لفّه — والرقم يثبّته يدوياً.",
              ),
            );
          })(),
          c = "أ" === s.pri || "ب" === s.pri || "ج" === s.pri ? s.pri : "",
          g = { أ: "#8A6F35", ب: "#53565a", ج: "#1668a1" },
          f = (e, s) =>
            t(
              "button",
              {
                key: "priz" + e,
                title: s,
                onClick: () => this.setState({ zEdit: { ...this.state.zEdit, pri: c === e ? "" : e } }),
                style: {
                  flex: 1,
                  height: 30,
                  borderRadius: 9,
                  cursor: "pointer",
                  fontFamily: "'Cairo',sans-serif",
                  fontSize: 12.5,
                  fontWeight: 700,
                  transition: "all .15s",
                  border: "1.5px solid " + (c === e ? g[e] : "var(--bd-xe1e1e1)"),
                  background: c === e ? g[e] + "14" : "var(--bg-xffffff)",
                  color: c === e ? g[e] : "var(--fg-x94a3b8)",
                },
              },
              e,
            ),
          u = t(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: 6,
                borderRadius: 10,
                padding: "9px 12px",
                background: "var(--bg-a185151810p05)",
                border: "1px solid var(--bd-a185151810p25)",
              },
            },
            t(
              "div",
              { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 } },
              t("span", { style: { fontSize: 11, fontWeight: 400, color: "var(--fg-x374151)" } }, "أولوية التغطية"),
              t(
                "span",
                { style: { fontSize: 9.5, fontWeight: 400, color: c ? g[c] : "var(--fg-x94a3b8)" } },
                c ? { أ: "لا تُخلى أبداً", ب: "تُخفَّض عند الضرورة", ج: "أول ما يُسحب منها" }[c] : "غير مصنَّفة",
              ),
            ),
            t(
              "div",
              { style: { display: "flex", gap: 6 } },
              f("أ", "(أ) لا تُخلى أبداً — تُغطّى قبل الجميع"),
              f("ب", "(ب) تُخفَّض عند الضرورة"),
              f("ج", "(ج) أول ما يُسحب منها عند العجز"),
            ),
          );
        return t(
          "div",
          { id: "bsZeDds", style: { display: "flex", flexDirection: "column", gap: 12 } },
          t(
            "div",
            { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } },
            (() => {
              const n = "yard" === e.zDd,
                a = s.yard || "",
                r = a ? this.gateLocColor(a) : null,
                l = (e) =>
                  t("span", {
                    style: {
                      width: 9,
                      height: 9,
                      borderRadius: 9999,
                      flexShrink: 0,
                      background: e || "var(--bg-xe2e8f0)",
                      border: e ? "0" : "1px solid #cbd5e1",
                    },
                  }),
                o = this.GATE_LOCS.map((e, s) => {
                  const n = e[0],
                    i = e[1],
                    r = a === n;
                  return t(
                    "div",
                    {
                      key: "y" + s,
                      onClick: () => this.setState((t) => ({ zEdit: { ...(t.zEdit || {}), yard: r ? "" : n }, zDd: null })),
                      style: {
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "7px 9px",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: r ? 800 : 600,
                        fontFamily: "'Cairo',sans-serif",
                        background: r ? "var(--bg-a185151810p1)" : "transparent",
                        color: r ? "var(--fg-x9a7e40)" : "var(--fg-x141414)",
                      },
                    },
                    l(i),
                    t("span", { style: { flex: 1 } }, n),
                  );
                });
              return (
                o.push(
                  t(
                    "div",
                    {
                      key: "ynone",
                      onClick: () => this.setState((t) => ({ zEdit: { ...(t.zEdit || {}), yard: "" }, zDd: null })),
                      style: {
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "7px 9px",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: a ? 600 : 800,
                        fontFamily: "'Cairo',sans-serif",
                        background: a ? "transparent" : "var(--bg-a185151810p1)",
                        color: a ? "var(--fg-x64748b)" : "var(--fg-x9a7e40)",
                        borderTop: "1px solid var(--bd-xf1f5f9)",
                        marginTop: 3,
                        paddingTop: 9,
                      },
                    },
                    l(null),
                    t("span", { style: { flex: 1 } }, "بلا ساحة"),
                  ),
                ),
                t(
                  "div",
                  { style: { display: "flex", flexDirection: "column", gap: 5 } },
                  t("label", { style: { fontSize: 11, fontWeight: 400, color: "var(--fg-x374151)" } }, "الساحة"),
                  t(
                    "div",
                    { style: { position: "relative" } },
                    t(
                      "button",
                      {
                        onClick: (t) => {
                          (t.stopPropagation(), this.setState({ zDd: n ? null : "yard" }));
                        },
                        style: {
                          width: "100%",
                          height: 38,
                          border: "1px solid " + (n ? "var(--bd-xb99751)" : "var(--bd-xe1e1e1)"),
                          borderRadius: 8,
                          padding: "0 10px",
                          fontSize: 12.5,
                          fontWeight: 400,
                          fontFamily: "'Cairo',sans-serif",
                          background: "var(--bg-xffffff)",
                          cursor: "pointer",
                          boxSizing: "border-box",
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          color: a ? "var(--fg-x141414)" : "var(--fg-x94a3b8)",
                          textAlign: "right",
                        },
                      },
                      l(r),
                      t(
                        "span",
                        { style: { flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "right" } },
                        a || "اختر الساحة...",
                      ),
                      i(n),
                    ),
                    n
                      ? t(
                          "div",
                          {
                            className: "bs-optmenu",
                            style: {
                              position: "absolute",
                              top: "100%",
                              right: 0,
                              left: 0,
                              zIndex: 45,
                              marginTop: 4,
                              background: "var(--bg-xffffff)",
                              border: "1px solid var(--bd-a185151810p35)",
                              borderRadius: 10,
                              boxShadow: "0 12px 30px -8px rgba(0,0,0,0.30)",
                              padding: 4,
                            },
                          },
                          o,
                        )
                      : null,
                  ),
                )
              );
            })(),
            o("region", "المنطقة", "اختر / أضف...", !0),
            o("level", "الدور / المستوى", "اختر / أضف...", !0),
            o("ztype", "النوع", "اختر / أضف...", !0),
            o("zcat", "الفئة", "اختر / أضف...", !1),
          ),
          this.bsLensOn("dist") ? u : null,
          h,
          p,
        );
      })(),
      zoneDefsNode: (() => {
        const t = (e.zoneOpts || {}).zcatStyle || {},
          s = Object.keys(t)
            .map((e, s) => {
              const n = t[e];
              return n && n.h && "none" !== n.h ? this._mkHatchPattern("bsZp" + s, n, "p" + s) : null;
            })
            .filter(Boolean);
        return s.length ? React.createElement("defs", null, s) : null;
      })(),
      zcStyleNode: (() => {
        const t = e.zcs;
        if (!t) return null;
        const s = React.createElement,
          n = (t) => this.setState({ zcs: { ...this.state.zcs, ...t } }),
          a = (t) => s("label", { style: { fontSize: 9.5, fontWeight: 600, color: "var(--fg-x64748b)", lineHeight: 1 } }, t),
          i = (e, s) =>
            n("f" === e ? (!1 === t.sAuto ? { f: s } : { f: s, s: this._darken(s) }) : "s" === e ? { s: s, sAuto: !1 } : { [e]: s }),
          r = (e, n) =>
            s(
              "div",
              { style: { display: "flex", flexDirection: "column", gap: 5 } },
              a(e),
              s("input", {
                type: "color",
                title: e,
                value: t[n],
                onChange: (t) => i(n, t.target.value),
                style: {
                  width: "100%",
                  height: 30,
                  padding: 2,
                  border: "1px solid var(--bd-xe1e1e1)",
                  borderRadius: 8,
                  cursor: "pointer",
                  background: "var(--bg-xffffff)",
                  boxSizing: "border-box",
                },
              }),
            ),
          l = (e, i, r, l, o, d) =>
            s(
              "div",
              { style: { display: "flex", flexDirection: "column", gap: 5, minWidth: 0 } },
              s(
                "div",
                { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
                a(e),
                s(
                  "span",
                  {
                    dir: "ltr",
                    style: {
                      fontFamily: "'Cairo',sans-serif",
                      fontFeatureSettings: "'tnum'",
                      fontSize: 10,
                      fontWeight: 400,
                      color: "var(--fg-x9a7e40)",
                    },
                  },
                  d(t[i]),
                ),
              ),
              s("input", {
                type: "range",
                title: e,
                min: r,
                max: l,
                step: o,
                value: t[i],
                onChange: (t) => n({ [i]: +t.target.value }),
                style: { width: "100%", accentColor: "var(--fg-xb99751)", margin: 0, height: 30 },
              }),
            ),
          o = (e, i, r, l) => {
            const o = null != t[i] ? +t[i] : l,
              d = Math.min(1, Math.max(0.05, +(o / r).toFixed(2)));
            return s(
              "div",
              { style: { display: "flex", flexDirection: "column", gap: 5, minWidth: 0 } },
              s(
                "div",
                { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
                a(e),
                s(
                  "span",
                  {
                    dir: "ltr",
                    style: {
                      fontFamily: "'Cairo',sans-serif",
                      fontFeatureSettings: "'tnum'",
                      fontSize: 10,
                      fontWeight: 400,
                      color: "var(--fg-x9a7e40)",
                    },
                  },
                  d.toFixed(2),
                ),
              ),
              s("input", {
                type: "range",
                title: e,
                min: 0.05,
                max: 1,
                step: 0.05,
                value: d,
                onChange: (t) => n({ [i]: +(+t.target.value * r).toFixed(2) }),
                style: { width: "100%", accentColor: "var(--fg-xb99751)", margin: 0, height: 30 },
              }),
            );
          },
          d = (e, a, i) =>
            s(
              "button",
              {
                key: e,
                title: i,
                onClick: () => n({ bs: e }),
                style: {
                  flex: 1,
                  height: 30,
                  borderRadius: 8,
                  cursor: "pointer",
                  background: t.bs === e ? "var(--bg-a185151810p08)" : "var(--bg-xffffff)",
                  border: "2px solid",
                  borderColor: t.bs === e ? "var(--bd-xb99751)" : "var(--bd-xe1e1e1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                },
              },
              s(
                "svg",
                { width: 34, height: 8, viewBox: "0 0 34 8" },
                s("line", {
                  x1: 2,
                  y1: 4,
                  x2: 32,
                  y2: 4,
                  stroke: "#334155",
                  strokeWidth: 2,
                  strokeDasharray: a,
                  strokeLinecap: "0.5 5" === a ? "round" : "butt",
                }),
              ),
            ),
          h = (e, a) => {
            const i = "bsZt" + e,
              r = { f: "#eef2f7", h: e, hc: "#475569", hw: 1.1, hg: 6 };
            return s(
              "button",
              {
                key: e,
                title: a,
                onClick: () => n({ h: e }),
                style: {
                  flex: 1,
                  height: 34,
                  borderRadius: 8,
                  cursor: "pointer",
                  background: "var(--bg-xffffff)",
                  border: "2px solid",
                  borderColor: t.h === e ? "var(--bd-xb99751)" : "var(--bd-xe1e1e1)",
                  boxShadow: t.h === e ? "0 0 0 2px rgba(185,151,81,0.25)" : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 3,
                },
              },
              s(
                "svg",
                { width: "100%", height: "100%", viewBox: "0 0 40 24", preserveAspectRatio: "none", style: { borderRadius: 4 } },
                "none" !== e ? this._mkHatchPattern(i, r, "tp") : null,
                s("rect", { x: 0, y: 0, width: 40, height: 24, fill: "none" === e ? "#eef2f7" : "url(#" + i + ")" }),
              ),
            );
          },
          p = "solid" === t.bs ? "none" : "dot" === t.bs ? "1 4" : "6 4",
          c = !!this.zcatStyleOf(t.name, t.zt),
          g = (t) =>
            s(
              "div",
              {
                style: {
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: "var(--fg-x9a7e40)",
                  borderBottom: "1px solid var(--bd-a185151810p2)",
                  paddingBottom: 4,
                },
              },
              t,
            );
        return s(
          "div",
          {
            onClick: () => this.setState({ zcs: null }),
            style: {
              position: "fixed",
              inset: 0,
              zIndex: 9240,
              background: "var(--bg-a0000p5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            },
          },
          s(
            "div",
            {
              onClick: (t) => t.stopPropagation(),
              style: {
                background: "var(--bg-xffffff)",
                borderRadius: 16,
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
                width: "100%",
                maxWidth: 470,
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                fontFamily: "'Cairo',sans-serif",
                maxHeight: "calc(100vh - 48px)",
                overflowY: "auto",
              },
            },
            s(
              "div",
              { style: { display: "flex", alignItems: "center", gap: 10 } },
              s(
                "div",
                {
                  style: {
                    width: 38,
                    height: 38,
                    borderRadius: 11,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--bg-a185151810p1)",
                    border: "1px solid var(--bd-a185151810p25)",
                    color: "var(--fg-xb99751)",
                  },
                },
                s(
                  "svg",
                  {
                    width: 17,
                    height: 17,
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: 2,
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                  },
                  s("path", { d: "M12 22a10 10 0 1 1 10-10c0 2-1.2 3-3 3h-2.6a2.4 2.4 0 0 0-1.8 4c.4.5.6.9.6 1.3a1.7 1.7 0 0 1-1.7 1.7Z" }),
                  s("circle", { cx: 7.5, cy: 10.5, r: 0.5 }),
                  s("circle", { cx: 12, cy: 7, r: 0.5 }),
                  s("circle", { cx: 16.5, cy: 10.5, r: 0.5 }),
                ),
              ),
              s(
                "div",
                { style: { flex: 1 } },
                s("h2", { style: { fontSize: 15.5, fontWeight: 600, margin: 0 } }, "تنسيق فئة «" + t.name + "»"),
                s(
                  "p",
                  { style: { fontSize: 10.5, color: "var(--fg-x53565a)", margin: "2px 0 0" } },
                  "ينعكس على كل مصلى يحمل هذه الفئة في كل المواقع",
                ),
              ),
              s(
                "button",
                {
                  onClick: () => this.setState({ zcs: null }),
                  style: {
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    border: 0,
                    background: "var(--bg-xf5f5f5)",
                    color: "var(--fg-x53565a)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                },
                s(
                  "svg",
                  {
                    width: 13,
                    height: 13,
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: 2,
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                  },
                  s("path", { d: "M18 6 6 18" }),
                  s("path", { d: "m6 6 12 12" }),
                ),
              ),
            ),
            s(
              "div",
              {
                style: {
                  borderRadius: 12,
                  border: "1px solid var(--bd-xeef2f7)",
                  background:
                    "repeating-linear-gradient(45deg,var(--bg-xfafbfc),var(--bg-xfafbfc) 12px,var(--bg-xf4f6f9) 12px,var(--bg-xf4f6f9) 24px)",
                  position: "relative",
                },
              },
              s(
                "span",
                { style: { position: "absolute", top: 5, right: 10, fontSize: 8.5, fontWeight: 600, color: "var(--fg-xb0b7c3)" } },
                "معاينة حيّة",
              ),
              s(
                "svg",
                { viewBox: "0 0 200 62", style: { width: "100%", height: 62, display: "block" } },
                "none" !== t.h ? this._mkHatchPattern("bsZpPrev", t, "pv") : null,
                s("path", {
                  d: "M16 12 L184 12 L184 52 L16 52 Z",
                  fill: "none" !== t.h ? "url(#bsZpPrev)" : t.f,
                  fillOpacity: (null != t.o ? t.o : 50) / 100,
                  stroke: t.s,
                  strokeWidth: Math.max(0.6, +t.bw || 1),
                  strokeDasharray: p,
                  strokeLinecap: "dot" === t.bs ? "round" : "butt",
                }),
              ),
            ),
            g("التعبئة"),
            s(
              "div",
              { style: { display: "grid", gridTemplateColumns: "92px 1fr", gap: 12, alignItems: "end" } },
              r("لون الموقع", "f"),
              l("الشفافية", "o", 10, 90, 5, (t) => t + "%"),
            ),
            g("الحدود"),
            s(
              "div",
              { style: { display: "grid", gridTemplateColumns: "92px 138px 1fr", gap: 12, alignItems: "end" } },
              r("حدود الموقع", "s"),
              s(
                "div",
                { style: { display: "flex", flexDirection: "column", gap: 5 } },
                a("نمط الحدود"),
                s(
                  "div",
                  { style: { display: "flex", gap: 5 } },
                  d("solid", "none", "متصل"),
                  d("dash", "6 4", "متقطع"),
                  d("dot", "0.5 5", "منقّط"),
                ),
              ),
              l("سماكة الحدود", "bw", 0.6, 4, 0.2, (t) => t),
            ),
            g("التهشير"),
            s(
              "div",
              { style: { display: "flex", gap: 5 } },
              [
                ["none", "بدون"],
                ["diag", "مائل"],
                ["diag2", "مائل معاكس"],
                ["cross", "متقاطع"],
                ["horiz", "أفقي"],
                ["vert", "عمودي"],
                ["dots", "نقاط"],
              ].map((t) => h(t[0], t[1])),
            ),
            "none" !== t.h
              ? s(
                  "div",
                  { style: { display: "grid", gridTemplateColumns: "92px 1fr 1fr", gap: 12, alignItems: "end" } },
                  r("لون التهشير", "hc"),
                  o("سماكة التهشير", "hw", 2, 0.3),
                  o("التباعد", "hg", 16, 1.6),
                )
              : null,
            s(
              "div",
              { style: { display: "flex", alignItems: "center", gap: 8, borderTop: "1px solid var(--bd-xf1f5f9)", paddingTop: 12 } },
              s(
                "button",
                {
                  onClick: () => {
                    const e = { ...(this.state.zoneOpts || {}) };
                    ((e.zcatStyle = {
                      ...(e.zcatStyle || {}),
                      [this._zcatKey(t.zt, t.name)]: {
                        f: t.f,
                        o: t.o,
                        s: t.s,
                        sAuto: !1 !== t.sAuto,
                        bs: t.bs,
                        bw: t.bw,
                        h: t.h,
                        hc: t.hc,
                        hw: t.hw,
                        hg: t.hg,
                      },
                    }),
                      this.saveZoneOpts(e),
                      this.setState({ zcs: null }));
                  },
                  style: {
                    height: 37,
                    padding: "0 20px",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 400,
                    background: "var(--bg-xb99751)",
                    color: "var(--fg-xffffff)",
                    border: 0,
                    cursor: "pointer",
                    fontFamily: "'Cairo',sans-serif",
                  },
                },
                "حفظ التنسيق",
              ),
              s(
                "button",
                {
                  onClick: () => this.setState({ zcs: null }),
                  style: {
                    height: 37,
                    padding: "0 16px",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 400,
                    background: "var(--bg-xffffff)",
                    color: "var(--fg-x141414)",
                    border: "1px solid var(--bd-xe1e1e1)",
                    cursor: "pointer",
                    fontFamily: "'Cairo',sans-serif",
                  },
                },
                "إلغاء",
              ),
              c
                ? s(
                    "button",
                    {
                      onClick: () => {
                        const e = { ...(this.state.zoneOpts || {}) },
                          s = { ...(e.zcatStyle || {}) };
                        (t.zt ? delete s[this._zcatKey(t.zt, t.name)] : delete s[t.name],
                          (e.zcatStyle = s),
                          this.saveZoneOpts(e),
                          this.setState({ zcs: null }));
                      },
                      style: {
                        marginRight: "auto",
                        height: 37,
                        padding: "0 14px",
                        borderRadius: 10,
                        fontSize: 12.5,
                        fontWeight: 400,
                        background: "var(--bg-xfef2f2)",
                        color: "var(--fg-xdc2626)",
                        border: "1px solid var(--bd-xfecaca)",
                        cursor: "pointer",
                        fontFamily: "'Cairo',sans-serif",
                      },
                    },
                    "إزالة التنسيق",
                  )
                : null,
            ),
          ),
        );
      })(),
      zeDeleteOn: !(e.zEdit && e.zEdit.isNew),
      zeSave: () => this.saveZoneEdit(),
      onZeKey: (t) => {
        "Enter" === t.key && (t.preventDefault(), this.saveZoneEdit());
      },
      zeTitle: e.zEdit && e.zEdit.isNew ? "مصلى جديد" : "تعديل بيانات المصلى",
      zeSub: e.zEdit && e.zEdit.isNew ? "سمِّها واختر فئتها · «إلغاء» يلغي الرسمة" : "نقرة مزدوجة على أي مصلى تفتح هذه النافذة",
      pEditOn: !!e.pEdit,
      peName: e.pEdit ? e.pEdit.name : "",
      onPeName: (t) =>
        this.setState({ pEdit: { ...this.state.pEdit, name: t.target.value } }),
      peCode: (e.pEdit && e.pEdit.code) || "",
      onPeCode: (t) =>
        this.setState({ pEdit: { ...this.state.pEdit, code: t.target.value } }),
      peTypeLabel: e.pEdit ? (mt[e.pEdit.type || "in"] || mt.in).label : "",
      peHeadStyle: (() => {
        const t = e.pEdit ? (!1 === e.pEdit.active ? "#94a3b8" : (mt[e.pEdit.type || "in"] || mt.in).c) : "#b99751";
        return (
          "width:42px;height:42px;border-radius:13px;display:flex;align-items:center;justify-content:center;color:var(--fg-xffffff);box-shadow:0 4px 12px " +
          t +
          "40;background:linear-gradient(135deg," +
          t +
          "," +
          t +
          "cc)"
        );
      })(),
      peBadgeStyle:
        "display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 9px;border-radius:9999px;font-size:10px;font-weight:600;font-family:'Cairo',sans-serif;" +
        (e.pEdit && !1 === e.pEdit.active
          ? "background:var(--bg-xf1f5f9);color:var(--fg-x64748b);border:1px solid var(--bd-xe2e8f0)"
          : "background:var(--bg-a161851290p1);color:var(--fg-x047857);border:1px solid var(--bd-a161851290p25)"),
      peBadgeText: e.pEdit && !1 === e.pEdit.active ? "معطّل" : "مفعّل",
      pePreview: (() => {
        const t = e.pEdit;
        if (!t) return null;
        const s = (e.paths || [])[t.i];
        if (!s) return null;
        const n = s.pts || [];
        if (n.length < 2) return null;
        const a = n.map((t) => t.x),
          i = n.map((t) => t.y),
          r = Math.min.apply(null, a),
          l = Math.max.apply(null, a),
          o = Math.min.apply(null, i),
          d = Math.max.apply(null, i),
          h = Math.min(268 / Math.max(l - r, 1), 42 / Math.max(d - o, 1)),
          p = (300 - (l - r) * h) / 2,
          c = (74 - (d - o) * h) / 2,
          g = n.map((t) => ({ x: (t.x - r) * h + p, y: (t.y - o) * h + c })),
          f = !1 !== t.active,
          u = f ? (mt[t.type || "in"] || mt.in).c : "#94a3b8",
          m = bt[t.w] || bt.normal,
          y = m,
          b = g.map((t) => t.x + "," + t.y).join(" ");
        return React.createElement(
          "svg",
          { viewBox: "0 0 300 74", width: "100%", height: 74, preserveAspectRatio: "xMidYMid meet", style: { display: "block" } },
          React.createElement("polyline", {
            points: b,
            fill: "none",
            stroke: u,
            strokeWidth: y,
            strokeLinecap: "round",
            strokeLinejoin: "round",
            strokeDasharray: At(t.line, 1, m),
            opacity: f ? 1 : 0.6,
          }),
          zt({ anim: t.anim, active: t.active }, b, y, 1, "pvf"),
          wt(g, 1, u, t.dir, "pv_"),
        );
      })(),
      peTypes: yt.map((t) => {
        const s = !(!e.pEdit || (e.pEdit.type || "in") !== t),
          n = mt[t].c;
        return {
          label: mt[t].label,
          dot: "width:9px;height:9px;border-radius:9999px;flex-shrink:0;background:" + n,
          click: () => this.setState({ pEdit: { ...this.state.pEdit, type: t } }),
          style:
            "flex:1;height:36px;display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:10px;font-size:11.5px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif;transition:all .15s;border:1px solid " +
            (s
              ? n + ";background:" + n + "14;color:" + n + ";box-shadow:0 1px 4px " + n + "26"
              : "#E1E1E1;background:var(--bg-xffffff);color:var(--fg-x64748b)"),
        };
      }),
      peLines: kt.map((t) => {
        const s = !(!e.pEdit || (e.pEdit.line || "dash") !== t[0]);
        return {
          label: t[1],
          click: () => this.setState({ pEdit: { ...this.state.pEdit, line: t[0] } }),
          sample: "display:block;width:34px;height:0;border-top:2.5px " + t[2] + " " + (s ? "#b99751" : "#94a3b8"),
          style:
            "flex:1;height:44px;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border-radius:10px;font-size:10.5px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif;transition:all .15s;border:1px solid " +
            (s
              ? "#b99751;background:var(--bg-a185151810p06);color:var(--fg-x9a7e40)"
              : "#E1E1E1;background:var(--bg-xffffff);color:var(--fg-x64748b)"),
        };
      }),
      peWidths: xt.map((t) => {
        const s = !(!e.pEdit || (e.pEdit.w || "thin") !== t[0]);
        return {
          label: t[1],
          click: () => this.setState({ pEdit: { ...this.state.pEdit, w: t[0] } }),
          sample: "display:block;width:34px;height:0;border-top:" + 0.8 * bt[t[0]] + "px solid " + (s ? "#b99751" : "#94a3b8"),
          style:
            "flex:1;height:44px;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border-radius:10px;font-size:10.5px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif;transition:all .15s;border:1px solid " +
            (s
              ? "#b99751;background:var(--bg-a185151810p06);color:var(--fg-x9a7e40)"
              : "#E1E1E1;background:var(--bg-xffffff);color:var(--fg-x64748b)"),
        };
      }),
      peDirText:
        e.pEdit && "two" === e.pEdit.dir ? "اتجاهان ⇄" : "اتجاه واحد →",
      peDirColor: e.pEdit && "two" === e.pEdit.dir ? "#047857" : "#94a3b8",
      peToggleDir: () =>
        this.setState({ pEdit: { ...this.state.pEdit, dir: this.state.pEdit && "two" === this.state.pEdit.dir ? "fwd" : "two" } }),
      peDirStyle:
        "position:relative;display:inline-block;width:36px;height:20px;border-radius:9999px;transition:all .2s;vertical-align:middle;" +
        (e.pEdit && "two" === e.pEdit.dir
          ? "background:linear-gradient(135deg,var(--bg-xe6d29d),var(--bg-xb99751))"
          : "background:var(--bg-xd7dce2)"),
      peDirKnob:
        "position:absolute;top:2px;width:16px;height:16px;border-radius:9999px;background:var(--bg-xffffff);box-shadow:0 1px 3px rgba(0,0,0,0.25);transition:all .2s;" +
        (e.pEdit && "two" === e.pEdit.dir ? "right:18px" : "right:2px"),
      peActiveText: e.pEdit && !1 === e.pEdit.active ? "معطّل" : "مفعّل",
      peActiveColor: e.pEdit && !1 === e.pEdit.active ? "#94a3b8" : "#047857",
      peToggleActive: () =>
        this.setState({ pEdit: { ...this.state.pEdit, active: !(this.state.pEdit && !1 !== this.state.pEdit.active) } }),
      peActiveStyle:
        "position:relative;display:inline-block;width:36px;height:20px;border-radius:9999px;transition:all .2s;vertical-align:middle;" +
        (e.pEdit && !1 === e.pEdit.active
          ? "background:var(--bg-xd7dce2)"
          : "background:linear-gradient(135deg,var(--bg-x6ee7b7),var(--bg-x10b981))"),
      peActiveKnob:
        "position:absolute;top:2px;width:16px;height:16px;border-radius:9999px;background:var(--bg-xffffff);box-shadow:0 1px 3px rgba(0,0,0,0.25);transition:all .2s;" +
        (e.pEdit && !1 === e.pEdit.active ? "right:2px" : "right:18px"),
      peAnimText: e.pEdit && !1 === e.pEdit.anim ? "ساكن" : "متحرك",
      peAnimColor: e.pEdit && !1 === e.pEdit.anim ? "#94a3b8" : "#9A7E40",
      peToggleAnim: () => this.setState({ pEdit: { ...this.state.pEdit, anim: !(this.state.pEdit && !1 !== this.state.pEdit.anim) } }),
      peAnimStyle:
        "position:relative;display:inline-block;width:36px;height:20px;border-radius:9999px;transition:all .2s;vertical-align:middle;" +
        (e.pEdit && !1 === e.pEdit.anim
          ? "background:var(--bg-xd7dce2)"
          : "background:linear-gradient(135deg,var(--bg-xe6d29d),var(--bg-xb99751))"),
      peAnimKnob:
        "position:absolute;top:2px;width:16px;height:16px;border-radius:9999px;background:var(--bg-xffffff);box-shadow:0 1px 3px rgba(0,0,0,0.25);transition:all .2s;" +
        (e.pEdit && !1 === e.pEdit.anim ? "right:2px" : "right:18px"),
      peLabelText: e.pEdit && e.pEdit.hideLabel ? "مخفي" : "ظاهر",
      peLabelColor: e.pEdit && e.pEdit.hideLabel ? "#94a3b8" : "#047857",
      peToggleLabel: () => this.setState({ pEdit: { ...this.state.pEdit, hideLabel: !(this.state.pEdit && this.state.pEdit.hideLabel) } }),
      peLabelStyle:
        "position:relative;display:inline-block;width:36px;height:20px;border-radius:9999px;transition:all .2s;vertical-align:middle;" +
        (e.pEdit && e.pEdit.hideLabel
          ? "background:var(--bg-xd7dce2)"
          : "background:linear-gradient(135deg,var(--bg-xe6d29d),var(--bg-xb99751))"),
      peLabelKnob:
        "position:absolute;top:2px;width:16px;height:16px;border-radius:9999px;background:var(--bg-xffffff);box-shadow:0 1px 3px rgba(0,0,0,0.25);transition:all .2s;" +
        (e.pEdit && e.pEdit.hideLabel ? "right:2px" : "right:18px"),
      ...KIVO.BassamCount.pair("pePointCount", e.pEdit ? String((((e.paths || [])[e.pEdit.i] || {}).pts || []).length) : "0", "نقطة"),
      peReverse: () => {
        const t = this.state.pEdit;
        if (!t) return;
        const e = t.type || "in",
          s = "in" === e ? "out" : "out" === e ? "in" : e;
        this.setState(
          {
            pEdit: { ...t, type: s },
            paths: (this.state.paths || []).map((e, n) => (n === t.i ? { ...e, pts: (e.pts || []).slice().reverse(), type: s } : e)),
          },
          () => this.savePlan(),
        );
      },
      peCancel: () => this.closeShapeEditor(),
      peDelete: () => {
        const t = this.state.pEdit;
        t &&
          this.setState({ paths: (this.state.paths || []).filter((e, s) => s !== t.i), sel: null, selMulti: [], pEdit: null }, () =>
            this.savePlan(),
          );
      },
      peDeleteOn: !(e.pEdit && e.pEdit.isNew),
      peSave: () => this.savePathEdit(),
      onPeKey: (t) => {
        "Enter" === t.key && (t.preventDefault(), this.savePathEdit());
      },
      peTitle: e.pEdit && e.pEdit.isNew ? "مسار جديد" : "بيانات المسار",
      peSubTail: e.pEdit && e.pEdit.isNew ? "سمِّه واختر نوعه · «إلغاء» يلغي الرسمة" : "نقرة مزدوجة على أي مسار تفتح هذه النافذة",
      gEditOn: !!e.gEdit,
      geName: e.gEdit ? e.gEdit.label : "",
      onGeName: (t) =>
        this.setState({
          gEdit: { ...this.state.gEdit, label: t.target.value },
        }),
      geNum: (e.gEdit && e.gEdit.num) || "",
      onGeNum: (t) =>
        this.setState({ gEdit: { ...this.state.gEdit, num: t.target.value } }),
      geNumText: e.gEdit && e.gEdit.hideNum ? "مخفي" : "ظاهر",
      geNumColor: e.gEdit && e.gEdit.hideNum ? "#94a3b8" : "#047857",
      geToggleNum: () => this.setState({ gEdit: { ...this.state.gEdit, hideNum: !(this.state.gEdit && this.state.gEdit.hideNum) } }),
      geNumToggleStyle:
        "position:relative;display:inline-block;width:36px;height:20px;border-radius:9999px;transition:all .2s;vertical-align:middle;" +
        (e.gEdit && e.gEdit.hideNum
          ? "background:var(--bg-xd7dce2)"
          : "background:linear-gradient(135deg,var(--bg-xe6d29d),var(--bg-xb99751))"),
      geNumToggleKnob:
        "position:absolute;top:2px;width:16px;height:16px;border-radius:9999px;background:var(--bg-xffffff);box-shadow:0 1px 3px rgba(0,0,0,0.25);transition:all .2s;" +
        (e.gEdit && e.gEdit.hideNum ? "right:2px" : "right:18px"),
      geFieldsNode: (() => {
        if (!e.gEdit) return ((this._geTypeNode = null), null);
        if (e.gEdit.pOf) return ((this._geTypeNode = null), null);
        const t = React.createElement,
          s = e.gEdit,
          n = t(
            "svg",
            {
              width: 11,
              height: 11,
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              strokeWidth: 2,
              strokeLinecap: "round",
              strokeLinejoin: "round",
            },
            t("path", { d: "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" }),
          ),
          a = t(
            "svg",
            {
              width: 11,
              height: 11,
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              strokeWidth: 2,
              strokeLinecap: "round",
              strokeLinejoin: "round",
            },
            t("path", { d: "M3 6h18" }),
            t("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" }),
          ),
          i = (e) =>
            t(
              "svg",
              {
                width: 12,
                height: 12,
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: 2.4,
                strokeLinecap: "round",
                strokeLinejoin: "round",
                style: { flexShrink: 0, transition: "transform .2s", opacity: 0.55, transform: e ? "rotate(180deg)" : "none" },
              },
              t("path", { d: "m6 9 6 6 6-6" }),
            ),
          r = (t, e) => {
            let s = 0;
            return (
              (this.state.floors || []).forEach((n) =>
                (n.gates || []).forEach((n) => {
                  ("cat" === t ? -1 !== (n.cats || []).indexOf(e) : n[t] === e) && s++;
                }),
              ),
              s
            );
          },
          l = (l, o, d, h) => {
            const p = this.gateOptList(l),
              c = e.gDd === l,
              g = e.gDdEdit && e.gDdEdit.key === l,
              f = h ? (s.cats || []).join(" · ") : s[l] || "",
              u = p.map((e, i) => {
                const o = h ? -1 !== (s.cats || []).indexOf(e) : s[l] === e,
                  d = r(l, e);
                return t(
                  "div",
                  {
                    key: "o" + i,
                    onClick: () => {
                      if (h) {
                        const t = (this.state.gEdit.cats || []).slice(),
                          s = t.indexOf(e);
                        (-1 === s ? t.push(e) : t.splice(s, 1), this.setState({ gEdit: { ...this.state.gEdit, cats: t } }));
                      } else this.setState({ gEdit: { ...this.state.gEdit, [l]: s[l] === e ? "" : e }, gDd: null });
                    },
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 8px",
                      borderRadius: 7,
                      cursor: "pointer",
                      fontSize: 11,
                      fontFamily: "'Cairo',sans-serif",
                      transition: "background .15s",
                      background: o ? "var(--bg-a185151810p1)" : "transparent",
                      fontWeight: o ? 800 : 400,
                      color: o ? "var(--fg-x9a7e40)" : "var(--fg-x25343f)",
                    },
                  },
                  h
                    ? t(
                        "span",
                        {
                          style: {
                            width: 14,
                            height: 14,
                            borderRadius: 4,
                            flexShrink: 0,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 9.5,
                            fontWeight: 700,
                            color: "var(--fg-xffffff)",
                            border: "1.5px solid " + (o ? "var(--bd-xb99751)" : "var(--bd-xcbd5e1)"),
                            background: o ? "var(--bg-xb99751)" : "var(--bg-xffffff)",
                            boxSizing: "border-box",
                          },
                        },
                        o ? "✓" : "",
                      )
                    : null,
                  t("span", { style: { flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, e),
                  t(
                    "button",
                    {
                      title: "تعديل",
                      onClick: (t) => {
                        (t.stopPropagation(), this.setState({ gDdEdit: { key: l, idx: i }, gDdEditVal: e }));
                      },
                      style: {
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        border: 0,
                        background: "transparent",
                        color: "var(--fg-x94a3b8)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      },
                    },
                    n,
                  ),
                  t(
                    "button",
                    {
                      title: d
                        ? "حذف نهائي — سيُزال من " +
                          KIVO.BassamCount(d, "باب", "g") +
                          " " +
                          KIVO.BassamCount.agr(d, "يستعمله", "يستعملانه", "تستعمله")
                        : "حذف",
                      onClick: (t) => {
                        (t.stopPropagation(), this.delGateOpt(l, i));
                      },
                      style: {
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        border: 0,
                        background: "transparent",
                        color: "var(--fg-xcbd5e1)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      },
                    },
                    a,
                  ),
                );
              }),
              m = {
                position: "absolute",
                top: "100%",
                right: 0,
                left: 0,
                zIndex: 45,
                marginTop: 4,
                background: "var(--bg-xffffff)",
                border: "1px solid var(--bd-a185151810p35)",
                borderRadius: 10,
                boxShadow: "0 12px 30px -8px rgba(0,0,0,0.30)",
              },
              y = g
                ? t(
                    "div",
                    { className: "bs-optmenu", style: { ...m, zIndex: 46, padding: 10, display: "flex", flexDirection: "column", gap: 8 } },
                    t("div", { style: { fontSize: 11, fontWeight: 600, color: "var(--fg-x9a7e40)" } }, "تعديل الخيار"),
                    t("input", {
                      value: e.gDdEditVal || "",
                      onChange: (t) => this.setState({ gDdEditVal: t.target.value }),
                      onKeyDown: (t) => {
                        "Enter" === t.key && (t.preventDefault(), this.saveGateOptEdit());
                      },
                      style: {
                        height: 30,
                        border: "1px solid var(--bd-xe1e1e1)",
                        borderRadius: 8,
                        padding: "0 8px",
                        fontSize: 11.5,
                        outline: "none",
                        fontFamily: "'Cairo',sans-serif",
                        boxSizing: "border-box",
                      },
                    }),
                    t(
                      "span",
                      { style: { fontSize: 9, color: "var(--fg-x94a3b8)", lineHeight: 1.6 } },
                      "التعديل يسري على كل الأبواب التي تستعمل هذا الخيار",
                    ),
                    t(
                      "div",
                      { style: { display: "flex", gap: 6 } },
                      t(
                        "button",
                        {
                          onClick: () => this.saveGateOptEdit(),
                          style: {
                            flex: 1,
                            height: 29,
                            borderRadius: 8,
                            border: 0,
                            background: "var(--bg-xb99751)",
                            color: "var(--fg-xffffff)",
                            fontSize: 11.5,
                            fontWeight: 400,
                            cursor: "pointer",
                            fontFamily: "'Cairo',sans-serif",
                          },
                        },
                        "حفظ",
                      ),
                      t(
                        "button",
                        {
                          onClick: () => this.setState({ gDdEdit: null }),
                          style: {
                            height: 29,
                            padding: "0 12px",
                            borderRadius: 8,
                            border: "1px solid var(--bd-xe1e1e1)",
                            background: "var(--bg-xffffff)",
                            color: "var(--fg-x141414)",
                            fontSize: 11.5,
                            fontWeight: 400,
                            cursor: "pointer",
                            fontFamily: "'Cairo',sans-serif",
                          },
                        },
                        "إلغاء",
                      ),
                    ),
                  )
                : c
                  ? t(
                      "div",
                      { className: "bs-optmenu", style: { ...m, overflow: "hidden" } },
                      t(
                        "div",
                        { style: { maxHeight: 150, overflowY: "auto", padding: 4 } },
                        u.length
                          ? u
                          : t(
                              "div",
                              {
                                style: {
                                  fontSize: 10,
                                  color: "var(--fg-x94a3b8)",
                                  padding: "10px 8px",
                                  textAlign: "center",
                                  lineHeight: 1.7,
                                },
                              },
                              "لا خيارات بعد — أضف أول خيار من الحقل أدناه",
                            ),
                      ),
                      t(
                        "div",
                        {
                          style: {
                            display: "flex",
                            gap: 5,
                            padding: 6,
                            borderTop: "1px solid var(--bd-xf1f5f9)",
                            background: "var(--bg-xfafafa)",
                          },
                        },
                        t("input", {
                          value: e.gDdNew || "",
                          onChange: (t) => this.setState({ gDdNew: t.target.value }),
                          onKeyDown: (t) => {
                            "Enter" === t.key && (t.preventDefault(), this.addGateOpt(l));
                          },
                          placeholder: "خيار جديد...",
                          style: {
                            flex: 1,
                            minWidth: 0,
                            height: 28,
                            border: "1px solid var(--bd-xe1e1e1)",
                            borderRadius: 7,
                            padding: "0 8px",
                            fontSize: 11,
                            outline: "none",
                            fontFamily: "'Cairo',sans-serif",
                            boxSizing: "border-box",
                          },
                        }),
                        t(
                          "button",
                          {
                            title: "إضافة",
                            onClick: () => this.addGateOpt(l),
                            style: {
                              width: 28,
                              height: 28,
                              borderRadius: 7,
                              border: 0,
                              background: "var(--bg-xb99751)",
                              color: "var(--fg-xffffff)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            },
                          },
                          t(
                            "svg",
                            {
                              width: 13,
                              height: 13,
                              viewBox: "0 0 24 24",
                              fill: "none",
                              stroke: "currentColor",
                              strokeWidth: 2.4,
                              strokeLinecap: "round",
                              strokeLinejoin: "round",
                            },
                            t("path", { d: "M5 12h14" }),
                            t("path", { d: "M12 5v14" }),
                          ),
                        ),
                      ),
                    )
                  : null;
            return t(
              "div",
              { key: l, style: { minWidth: 0 } },
              t("label", { style: { fontSize: 11, fontWeight: 400, color: "var(--fg-x374151)", display: "block", marginBottom: 5 } }, o),
              t(
                "button",
                {
                  onClick: () => this.setState({ gDd: c ? null : l, gDdEdit: null, gDdNew: "" }),
                  style: {
                    width: "100%",
                    height: 34,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "0 10px",
                    borderRadius: 8,
                    border: "1px solid " + (c || g ? "var(--bd-xb99751)" : "var(--bd-xe1e1e1)"),
                    background: "var(--bg-xffffff)",
                    cursor: "pointer",
                    fontFamily: "'Cairo',sans-serif",
                    fontSize: 11.5,
                    fontWeight: 400,
                    color: f ? "var(--fg-x141414)" : "var(--fg-x94a3b8)",
                    boxSizing: "border-box",
                  },
                },
                t(
                  "span",
                  {
                    style: { flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "right" },
                  },
                  f || d,
                ),
                i(c),
              ),
              y,
            );
          },
          o = !!s.closed,
          d = t(
            "div",
            { key: "closed", style: { minWidth: 0 } },
            t(
              "label",
              { style: { fontSize: 11, fontWeight: 400, color: "var(--fg-x374151)", display: "block", marginBottom: 5 } },
              "الحالة",
            ),
            t(
              "button",
              {
                onClick: () => this.setState({ gEdit: { ...this.state.gEdit, closed: !o } }),
                title: o ? "الباب مغلق في الخطة — انقر لفتحه" : "الباب مفتوح في الخطة — انقر لإغلاقه",
                style: {
                  width: "100%",
                  height: 34,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 6,
                  padding: "0 10px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontFamily: "'Cairo',sans-serif",
                  boxSizing: "border-box",
                  border: "1px solid " + (o ? "var(--bd-a1001161390p4)" : "var(--bd-a22163740p4)"),
                  background: o ? "var(--bg-a1001161390p07)" : "var(--bg-a22163740p06)",
                },
              },
              t(
                "span",
                { style: { fontSize: 11.5, fontWeight: 600, color: o ? "var(--fg-x64748b)" : "var(--fg-x047857)" } },
                o ? "مغلق" : "مفتوح",
              ),
              t(
                "span",
                {
                  style: {
                    position: "relative",
                    display: "inline-block",
                    width: 36,
                    height: 20,
                    borderRadius: 9999,
                    transition: "all .2s",
                    flexShrink: 0,
                    background: o ? "var(--bg-xd7dce2)" : "linear-gradient(135deg,#4ade80,#16a34a)",
                  },
                },
                t("span", {
                  style: {
                    position: "absolute",
                    top: 2,
                    width: 16,
                    height: 16,
                    borderRadius: 9999,
                    background: "var(--bg-xffffff)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                    transition: "all .2s",
                    right: o ? 2 : 18,
                  },
                }),
              ),
            ),
          ),
          h = "أ" === s.pri || "ب" === s.pri || "ج" === s.pri ? s.pri : "",
          p = { أ: "#8A6F35", ب: "#53565a", ج: "#1668a1" },
          c = (e, s) =>
            t(
              "button",
              {
                key: "pri" + e,
                title: s,
                onClick: () => this.setState({ gEdit: { ...this.state.gEdit, pri: h === e ? "" : e } }),
                style: {
                  flex: 1,
                  height: 30,
                  borderRadius: 9,
                  cursor: "pointer",
                  fontFamily: "'Cairo',sans-serif",
                  fontSize: 12.5,
                  fontWeight: 700,
                  transition: "all .15s",
                  border: "1.5px solid " + (h === e ? p[e] : "var(--bd-xe1e1e1)"),
                  background: h === e ? p[e] + "14" : "var(--bg-xffffff)",
                  color: h === e ? p[e] : "var(--fg-x94a3b8)",
                },
              },
              e,
            ),
          g = t(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: 6,
                borderRadius: 10,
                padding: "9px 12px",
                background: "var(--bg-a185151810p05)",
                border: "1px solid var(--bd-a185151810p25)",
              },
            },
            t(
              "div",
              { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 } },
              t("span", { style: { fontSize: 11, fontWeight: 400, color: "var(--fg-x374151)" } }, "أولوية التغطية"),
              t(
                "span",
                { style: { fontSize: 9.5, fontWeight: 400, color: h ? p[h] : "var(--fg-x94a3b8)" } },
                h ? { أ: "لا يُخلى أبداً", ب: "يُخفَّض عند الضرورة", ج: "أول ما يُسحب منه" }[h] : "غير مصنَّف",
              ),
            ),
            t(
              "div",
              { style: { display: "flex", gap: 6 } },
              c("أ", "(أ) لا يُخلى أبداً — يُغطّى قبل الجميع"),
              c("ب", "(ب) يُخفَّض عند الضرورة"),
              c("ج", "(ج) أول ما يُسحب منه عند العجز"),
            ),
          ),
          f = this.bsLensOn("dist");
        return (
          (this._geTypeNode = l("gtype", "النوع", "اختر / أضف...", !1)),
          t(
            "div",
            { id: "bsGeDds", style: { display: "flex", flexDirection: "column", gap: 12 } },
            t(
              "div",
              { style: { position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 } },
              (() => {
                const n = "loc" === e.gDd,
                  a = s.loc || "",
                  r = this.gateLocColor(a),
                  l = this.GATE_LOCS.map((e, s) => {
                    const n = e[0],
                      i = e[1],
                      r = a === n;
                    return t(
                      "div",
                      {
                        key: "L" + s,
                        onClick: () => this.setState({ gEdit: { ...this.state.gEdit, loc: r ? "" : n }, gDd: null }),
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "7px 8px",
                          borderRadius: 7,
                          cursor: "pointer",
                          fontSize: 11,
                          fontFamily: "'Cairo',sans-serif",
                          transition: "background .15s",
                          background: r ? "var(--bg-a185151810p1)" : "transparent",
                          fontWeight: r ? 800 : 600,
                          color: r ? "var(--fg-x9a7e40)" : "var(--fg-x25343f)",
                        },
                      },
                      t("span", {
                        style: {
                          width: 10,
                          height: 10,
                          borderRadius: 3,
                          flexShrink: 0,
                          background: i,
                          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.12)",
                        },
                      }),
                      t("span", { style: { flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, n),
                      r ? t("span", { style: { fontSize: 10, color: "var(--fg-x9a7e40)", flexShrink: 0 } }, "✓") : null,
                    );
                  }),
                  o = n
                    ? t(
                        "div",
                        {
                          style: {
                            position: "absolute",
                            top: "100%",
                            right: 0,
                            left: 0,
                            zIndex: 45,
                            marginTop: 4,
                            background: "var(--bg-xffffff)",
                            border: "1px solid var(--bd-a185151810p35)",
                            borderRadius: 10,
                            boxShadow: "0 12px 30px -8px rgba(0,0,0,0.30)",
                            overflow: "hidden",
                            padding: 4,
                          },
                        },
                        l,
                      )
                    : null;
                return t(
                  "div",
                  { key: "loc", style: { minWidth: 0 } },
                  t(
                    "label",
                    { style: { fontSize: 11, fontWeight: 400, color: "var(--fg-x374151)", display: "block", marginBottom: 5 } },
                    "الموقع",
                  ),
                  t(
                    "button",
                    {
                      onClick: () => this.setState({ gDd: n ? null : "loc", gDdEdit: null, gDdNew: "" }),
                      style: {
                        width: "100%",
                        height: 34,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "0 10px",
                        borderRadius: 8,
                        border: "1px solid " + (n ? "var(--bd-xb99751)" : "var(--bd-xe1e1e1)"),
                        background: "var(--bg-xffffff)",
                        cursor: "pointer",
                        fontFamily: "'Cairo',sans-serif",
                        fontSize: 11.5,
                        fontWeight: 400,
                        color: a ? "var(--fg-x141414)" : "var(--fg-x94a3b8)",
                        boxSizing: "border-box",
                      },
                    },
                    r
                      ? t("span", {
                          style: {
                            width: 10,
                            height: 10,
                            borderRadius: 3,
                            flexShrink: 0,
                            background: r,
                            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.12)",
                          },
                        })
                      : null,
                    t(
                      "span",
                      {
                        style: {
                          flex: 1,
                          minWidth: 0,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          textAlign: "right",
                        },
                      },
                      a || "اختر الساحة...",
                    ),
                    i(n),
                  ),
                  o,
                );
              })(),
              l("kind", "الفئة", "اختر / أضف...", !1),
              l("route", "المسار", "اختر / أضف...", !1),
            ),
            t(
              "div",
              { style: { position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 } },
              l("cls", "التصنيف", "اختر / أضف...", !1),
              l("cat", "التخصيص", "اختر / أضف تخصيصات...", !0),
              d,
            ),
            f ? g : null,
          )
        );
      })(),
      geTypeNode: e.gEdit && e.gEdit.pOf ? null : this._geTypeNode || null,
      geIsLeaf: !(!e.gEdit || !e.gEdit.pOf),
      geLeafBlockOn: !(!e.gEdit || e.gEdit.pOf),
      geIsParent: !!(e.gEdit && !e.gEdit.pOf && KIVO.BassamLeaf.leavesOf(e.gates, e.gates[e.gEdit.i]).length > 0),
      geNeedOn:
        this.bsLensOn("dist") &&
        !(
          e.gEdit &&
          !e.gEdit.pOf &&
          KIVO.BassamLeaf.isParent(e.gates[e.gEdit.i]) &&
          KIVO.BassamLeaf.leavesOf(e.gates, e.gates[e.gEdit.i]).length > 0
        ),
      geLeafN: (e.gEdit && e.gEdit.leafN) || "1",
      onGeLeafN: (t) => {
        const e = String(t.target.value || "")
          .replace(/[^0-9]/g, "")
          .slice(0, 2);
        (this.setState({ gEdit: { ...this.state.gEdit, leafN: e } }),
          this._leafT && clearTimeout(this._leafT),
          (this._leafT = setTimeout(() => {
            ((this._leafT = null), this._liveLeafSync());
          }, 450)));
      },
      geUniNeed: (e.gEdit && e.gEdit.uniNeed) || "",
      onGeUniNeed: (t) => {
        const e = String(t.target.value || "")
          .replace(/[^0-9]/g, "")
          .slice(0, 4);
        (this.setState({ gEdit: { ...this.state.gEdit, uniNeed: e } }),
          this._uniT && clearTimeout(this._uniT),
          (this._uniT = setTimeout(() => {
            ((this._uniT = null), this._liveUniNeed());
          }, 450)));
      },
      geLeafHint: (() => {
        const t = e.gEdit;
        if (!t || t.pOf) return "";
        const s = parseInt(String(t.leafN || "1"), 10) || 1,
          n = e.gates[t.i],
          a = n ? KIVO.BassamLeaf.leavesOf(e.gates, n) : [];
        if (s < 2 && !a.length)
          return "باب واحد. اكتب عدد الأبواب (الفتحات) إن كان الباب كبيراً — تُولَّد فتحاته فوراً باسم «رقم الباب - n»، ولكل فتحة احتياجها وتسكينها وحالتها.";
        if (!a.length)
          return (
            "تُولَّد " +
            KIVO.BassamCount(s, "فتحة") +
            " حول الباب على الخريطة " +
            KIVO.BassamCount.agr(
              s,
              "(شارة العدد تفردها وتطويها) ويظهر جدولها هنا.",
              "(شارة العدد تفردهما وتطويهما) ويظهر جدولهما هنا.",
              "(شارة العدد تفردها وتطويها) ويظهر جدولها هنا.",
            )
          );
        if (s !== a.length)
          return s < a.length
            ? "الفتحات الزائدة عليها تسكين — تُحذف عند الحفظ بعد تأكيد."
            : "عند الحفظ يصبح عدد الفتحات " + s + " — الفتحات الجديدة تأخذ الاحتياج الموحّد.";
        const i = KIVO.BassamLeaf.agg(e.gates, n, this._needShifts ? this._needShifts() : []);
        return (
          "الباب الأم لا يحمل احتياجاً ولا تسكيناً — كلاهما على الفتحات. الإجمالي: احتياج " +
          i.need +
          " · مسكّن " +
          i.plc +
          " · مفتوح " +
          i.open +
          " من " +
          i.n +
          ". الاحتياج الموحّد يُكتب على كل فتحة فوراً ويمحو تخصيص الورديات."
        );
      })(),
      geLeafRows: (() => {
        const t = e.gEdit;
        if (!t || t.pOf) return [];
        const s = e.gates[t.i];
        if (!s) return [];
        const n = KIVO.BassamLeaf.leavesOf(e.gates, s),
          a = this.curApproved() || !this._plCanWrite();
        return n.map((t) => {
          const n = e.gates.indexOf(t),
            i = null == t.needN ? "" : String(t.needN);
          return {
            key: "lf" + n,
            name: t.label || "فتحة " + (t.leafNo || ""),
            need: i,
            needStyle:
              "width:100%;height:28px;border-radius:7px;padding:0 6px;font-size:12px;font-weight:600;outline:none;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';text-align:center;box-sizing:border-box;border:1px solid " +
              (i ? "var(--bd-a185151810p65)" : "var(--bd-xe8e8e8)") +
              ";background:" +
              (i ? "var(--bg-a185151810p07)" : "var(--bg-xffffff)"),
            onNeed: (t) => {
              a || this._needSet("gates", n, null, t.target.value);
            },
            plc: KIVO.BassamCount((t.emp || []).length, ["مسكَّن واحد", "مسكَّنان", "مسكَّنَين", "مسكَّنين", "مسكَّناً", "مسكَّن"]),
            pri: t.pri ? "(" + t.pri + ")" : "",
            stTxt: t.closed ? "مغلقة" : "مفتوحة",
            stStyle:
              "height:26px;padding:0 9px;border-radius:7px;border:1px solid " +
              (t.closed ? "var(--bd-xe1e1e1)" : "var(--bd-a22163740p35)") +
              ";background:" +
              (t.closed ? "var(--bg-xf5f5f5)" : "var(--bg-a22163740p08)") +
              ";color:" +
              (t.closed ? "var(--fg-x64748b)" : "var(--fg-x15803d)") +
              ";font-family:'Cairo',sans-serif;font-size:10.5px;font-weight:600;cursor:" +
              (a ? "not-allowed" : "pointer"),
            togg: () => {
              a ||
                this.setState({ gates: this.state.gates.map((t, e) => (e === n ? { ...t, closed: !t.closed } : t)) }, () =>
                  this.savePlan(),
                );
            },
            edit: () => {
              const e = s.gid,
                n = t.leafNo;
              (this.saveGateEdit(),
                setTimeout(() => {
                  const t = (this.state.gates || []).findIndex((t) => t && t.pOf === e && t.leafNo === n);
                  t >= 0 && this.openGateEditor(t, !1);
                }, 30));
            },
          };
        });
      })(),
      geInheritNote: (() => {
        const t = e.gEdit;
        if (!t || !t.pOf) return "";
        const s = KIVO.BassamLeaf.parentOf(e.gates, e.gates[t.i]);
        return (
          "الفتحة «" +
          (t.label || t.leafNo || "") +
          "» من الباب الأم «" +
          ((s && s.label) || "باب") +
          "» — الموقع والنوع والفئة والمسار والتصنيف والتخصيص موروثة من الباب الأم وتُعدَّل منه؛ وهنا الاسم والاحتياج والأولوية والحالة."
        );
      })(),
      geGoParent: () => {
        const t = this.state.gEdit;
        if (!t || !t.pOf) return;
        const e = t.pOf;
        (this.saveGateEdit(),
          setTimeout(() => {
            const t = (this.state.gates || []).findIndex((t) => t && t.gid === e);
            t >= 0 && this.openGateEditor(t, !1);
          }, 30));
      },
      geLabelText: e.gEdit && e.gEdit.hideLabel ? "مخفي" : "ظاهر",
      geLabelColor: e.gEdit && e.gEdit.hideLabel ? "#94a3b8" : "#047857",
      geToggleLabel: () => this.setState({ gEdit: { ...this.state.gEdit, hideLabel: !(this.state.gEdit && this.state.gEdit.hideLabel) } }),
      geToggleStyle:
        "position:relative;display:inline-block;width:36px;height:20px;border-radius:9999px;transition:all .2s;vertical-align:middle;" +
        (e.gEdit && e.gEdit.hideLabel
          ? "background:var(--bg-xd7dce2)"
          : "background:linear-gradient(135deg,var(--bg-xe6d29d),var(--bg-xb99751))"),
      geToggleKnob:
        "position:absolute;top:2px;width:16px;height:16px;border-radius:9999px;background:var(--bg-xffffff);box-shadow:0 1px 3px rgba(0,0,0,0.25);transition:all .2s;" +
        (e.gEdit && e.gEdit.hideLabel ? "right:2px" : "right:18px"),
      geCancel: () => this.closeShapeEditor(),
      geDelete: () => {
        const t = this.state.gEdit;
        t &&
          this.setState({ gates: KIVO.BassamLeaf.removeIdx(this.state.gates, t.i), sel: null, selMulti: [], gEdit: null }, () =>
            this.savePlan(),
          );
      },
      geDeleteOn: !((e.gEdit && e.gEdit.isNew) || (e.gEdit && e.gEdit.pOf)),
      geSave: () => this.saveGateEdit(),
      onGeKey: (t) => {
        "Enter" === t.key && (t.preventDefault(), this.saveGateEdit());
      },
      geTitle:
        e.gEdit && e.gEdit.isNew
          ? "باب جديد"
          : e.gEdit && e.gEdit.pOf
            ? "تعديل فتحة"
            : e.gEdit && KIVO.BassamLeaf.isParent(e.gates[e.gEdit.i])
              ? "تعديل الباب الأم"
              : "تعديل بيانات الباب",
      geSub: e.gEdit && e.gEdit.isNew ? "سمِّه · «إلغاء» يلغي وضعه" : "نقرة مزدوجة على أي باب تفتح هذه النافذة",
      clearZonesAsk: () => {
        (this.setState({ clearFly: null }), this.state.zones.length && this.setState({ clearAsk: { kind: "zones" } }));
      },
      clearGatesAsk: () => {
        (this.setState({ clearFly: null }), this.state.gates.length && this.setState({ clearAsk: { kind: "gates" } }));
      },
      clearMarksAsk: () => {
        (this.setState({ clearFly: null }), (this.state.marks || []).length && this.setState({ clearAsk: { kind: "marks" } }));
      },
      clearPathsAsk: () => {
        (this.setState({ clearFly: null }), (this.state.paths || []).length && this.setState({ clearAsk: { kind: "paths" } }));
      },
      priZonesAsk: () => {
        const t = We();
        this.setState({ priZAsk: { a: t.a, b: t.b, skip: t.skip, n: t.n, t: t.t } });
      },
      priZAskOn: !!e.priZAsk,
      priZAskTitle: "اقتراح أولويات التغطية للمصليات (أ/ب/ج)",
      priZAskCanDo: !!(e.priZAsk && e.priZAsk.n > 0),
      priZAskMsg: (() => {
        const t = e.priZAsk;
        return t
          ? t.t
            ? t.n
              ? "ستُصنَّف " +
                KIVO.BassamCount(t.n, "مصلى|غير مصنَّف") +
                ": " +
                KIVO.BassamCount(t.a, "فئة") +
                " (أ) — المصليات، لا تُخلى أبداً · " +
                KIVO.BassamCount(t.b, "فئة") +
                " (ب) — البقية، تُخفَّض عند الضرورة." +
                (t.skip
                  ? " ولن " +
                    KIVO.BassamCount.agr(t.skip, "يُمسّ", "يُمسّ", "تُمسّ") +
                    " " +
                    KIVO.BassamCount(t.skip, "مصلى") +
                    " " +
                    KIVO.BassamCount.agr(t.skip, "صنّفتَه", "صنّفتَهما", "صنّفتَها") +
                    " بنفسك."
                  : "") +
                " لا (ج) تلقائية للمصليات — تمنحها أنت من محرّر المصلى لما يحتمل السحب أولاً. هذه نقطة بداية — عدّل أي مصلًّى بعده من محرّره."
              : "كل مصليات هذا الموقع مصنَّفة الأولوية أصلاً — لا مصلى فارغاً يُقترح له. لتغيير أولوية مصلًّى افتح محرّره."
            : "لا مصليات في هذا الموقع بعد — ارسم المصليات من تبويب «المصليات» أولاً."
          : "";
      })(),
      priZAskCancel: () => this.setState({ priZAsk: null }),
      priZAskDo: () => {
        if (!this.PC("edit")) return (this.permDeny(), void this.setState({ priZAsk: null }));
        const t = We();
        (this.setState({ zones: t.zones2, priZAsk: null }, () => this.savePlan()),
          this.bsAck(
            t.n
              ? "صُنِّفت " +
                  KIVO.BassamCount(t.n, "مصلى") +
                  ": " +
                  t.a +
                  " (أ) · " +
                  t.b +
                  " (ب)" +
                  (t.skip ? " · بقيت بتصنيفك اليدوي: " + t.skip : "")
              : "لا مصلى فارغ الأولوية",
            t.n ? "ok" : "warn",
          ));
      },
      priGatesAsk: () => {
        const t = Be();
        this.setState({ priAsk: { a: t.a, b: t.b, j: t.j, skip: t.skip, n: t.n, t: t.t } });
      },
      priAskOn: !!e.priAsk,
      priAskTitle: "اقتراح أولويات التغطية (أ/ب/ج)",
      priAskCanDo: !!(e.priAsk && e.priAsk.n > 0),
      priAskMsg: (() => {
        const t = e.priAsk;
        return t
          ? 0 === t.t
            ? "لا أبواب في هذا الموقع بعد — أضِف الأبواب من تبويب «الأبواب» أولاً."
            : t.n
              ? "سيُصنَّف " +
                KIVO.BassamCount(t.n, "باب|غير مصنَّف") +
                " " +
                KIVO.BassamCount.agr(
                  t.n,
                  "بقراءة نوعه وتصنيفه المسجّلين",
                  "بقراءة نوع كلٍّ منهما وتصنيفه المسجّلين",
                  "بقراءة نوع كلٍّ منها وتصنيفه المسجّلين",
                ) +
                ": " +
                KIVO.BassamCount(t.a, "فئة") +
                " (أ) — الأبواب الرئيسية وأبواب الجنائز، لا تُخلى أبداً · " +
                KIVO.BassamCount(t.b, "فئة") +
                " (ب) — تُخفَّض عند الضرورة · " +
                KIVO.BassamCount(t.j, "فئة") +
                " (ج) — السلالم والمصاعد، أول ما يُسحب منه عند العجز." +
                (t.skip
                  ? " ولن يُمسّ " +
                    KIVO.BassamCount(t.skip, "باب") +
                    " " +
                    KIVO.BassamCount.agr(t.skip, "صنّفتَه", "صنّفتَهما", "صنّفتَها") +
                    " بنفسك."
                  : "") +
                " هذه نقطة بداية — عدّل أي بابٍ بعدها من محرّره."
              : "كل أبواب هذا الموقع مصنَّفة الأولوية أصلاً — لا باب فارغاً يُقترح له. لتغيير أولوية بابٍ افتح محرّره."
          : "";
      })(),
      priAskCancel: () => this.setState({ priAsk: null }),
      priAskDo: () => {
        if (!this.PC("edit")) return (this.permDeny(), void this.setState({ priAsk: null }));
        const t = Be();
        (this.setState({ gates: t.gates2, priAsk: null }, () => this.savePlan()),
          this.bsAck(
            t.n
              ? "صُنِّف " +
                  KIVO.BassamCount(t.n, "باب") +
                  ": " +
                  t.a +
                  " (أ) · " +
                  t.b +
                  " (ب) · " +
                  t.j +
                  " (ج)" +
                  (t.skip ? " · بقي بتصنيفك اليدوي: " + t.skip : "")
              : "لا باب فارغ الأولوية",
            t.n ? "ok" : "warn",
          ));
      },
      adZonesGo: () => {
        const t = De();
        this.setState({ adZAsk: { placed: t.placed, deficit: t.deficit, surplus: t.surplus, n: t.n, offSkip: t.offSkip } });
      },
      adZAskOn: !!e.adZAsk,
      adZAskTitle: "التوزيع الآلي على المصليات",
      adZAskCanDo: !!(e.adZAsk && e.adZAsk.placed > 0),
      adZAskMsg: (() => {
        const t = e.adZAsk;
        return t
          ? t.placed
            ? "سيُسكَّن " +
              KIVO.BassamCount(t.placed, "موظف") +
              " على " +
              KIVO.BassamCount(t.n, "مصلى", "g") +
              " بحسب احتياج كل مصلًّى في كل وردية، بترتيب المصليات." +
              (t.deficit
                ? " يبقى بعده عجز " + t.deficit + " بلا موظف — يظهر في شريط العجز والمؤشرات."
                : " ويكتمل به احتياج المصليات كاملاً.") +
              (t.surplus
                ? " ويبقى " +
                  KIVO.BassamCount(t.surplus, "موظف|فائض غير مسكَّن") +
                  " " +
                  KIVO.BassamCount.agr(t.surplus, "تسكّنه", "تسكّنهما", "تسكّنهم") +
                  " بيدك."
                : "") +
              (t.offSkip ? " (تُجوّزت مصليات معطّلة لا تُسكَّن)." : "") +
              " من سكّنتَه يدوياً يبقى في مكانه."
            : "لا شيء يُوزَّع: " +
              (t.deficit
                ? "احتياج المصليات قائم لكن لا موظفين غير مسكَّنين في وردياته — العجز " + t.deficit + " ويبقى ظاهراً في المؤشرات."
                : "احتياج المصليات مكتملٌ أو غير مُدخل. عبّئ جدول احتياج المصليات أولاً.")
          : "";
      })(),
      adZAskCancel: () => this.setState({ adZAsk: null }),
      adZAskDo: () => {
        if (!this.PC("edit")) return (this.permDeny(), void this.setState({ adZAsk: null }));
        const t = De();
        (this.setState({ zones: t.zones2, adZAsk: null }, () => this.savePlan()),
          this.bsAck(
            t.placed
              ? "سُكِّن " +
                  KIVO.BassamCount(t.placed, "موظف") +
                  " على " +
                  KIVO.BassamCount(t.n, "مصلى", "g") +
                  "" +
                  (t.deficit ? " · بقي عجز " + t.deficit : " · اكتمل الاحتياج") +
                  (t.surplus ? " · فائض غير مسكَّن: " + t.surplus : "")
              : "لم يُسكَّن أحد — راجع احتياج المصليات وموظفي الورديات",
            t.placed ? "ok" : "warn",
          ));
      },
      adMarksGo: () => {
        const t = Ne();
        this.setState({ adMAsk: { placed: t.placed, deficit: t.deficit, surplus: t.surplus, n: t.n, offSkip: t.offSkip } });
      },
      adMAskOn: !!e.adMAsk,
      adMAskTitle: "التوزيع الآلي على المعالم",
      adMAskCanDo: !!(e.adMAsk && e.adMAsk.placed > 0),
      adMAskMsg: (() => {
        const t = e.adMAsk;
        return t
          ? t.placed
            ? "سيُسكَّن " +
              KIVO.BassamCount(t.placed, "موظف") +
              " على " +
              KIVO.BassamCount(t.n, "معلم", "g") +
              " بحسب احتياج كل معلمٍ في كل وردية، بترتيب المعالم." +
              (t.deficit
                ? " يبقى بعده عجز " + t.deficit + " بلا موظف — يظهر في شريط العجز والمؤشرات."
                : " ويكتمل به احتياج المعالم كاملاً.") +
              (t.surplus
                ? " ويبقى " +
                  KIVO.BassamCount(t.surplus, "موظف|فائض غير مسكَّن") +
                  " " +
                  KIVO.BassamCount.agr(t.surplus, "تسكّنه", "تسكّنهما", "تسكّنهم") +
                  " بيدك."
                : "") +
              (t.offSkip ? " (تُجوّزت معالم معطّلة لا تُسكَّن)." : "") +
              " من سكّنتَه يدوياً يبقى في مكانه."
            : "لا شيء يُوزَّع: " +
              (t.deficit
                ? "احتياج المعالم قائم لكن لا موظفين غير مسكَّنين في وردياته — العجز " + t.deficit + " ويبقى ظاهراً في المؤشرات."
                : "احتياج المعالم مكتملٌ أو غير مُدخل. عبّئ جدول احتياج المعالم أولاً.")
          : "";
      })(),
      adMAskCancel: () => this.setState({ adMAsk: null }),
      adMAskDo: () => {
        if (!this.PC("edit")) return (this.permDeny(), void this.setState({ adMAsk: null }));
        const t = Ne();
        (this.setState({ marks: t.marks2, adMAsk: null }, () => this.savePlan()),
          this.bsAck(
            t.placed
              ? "سُكِّن " +
                  KIVO.BassamCount(t.placed, "موظف") +
                  " على " +
                  KIVO.BassamCount(t.n, "معلم", "g") +
                  "" +
                  (t.deficit ? " · بقي عجز " + t.deficit : " · اكتمل الاحتياج") +
                  (t.surplus ? " · فائض غير مسكَّن: " + t.surplus : "")
              : "لم يُسكَّن أحد — راجع احتياج المعالم وموظفي الورديات",
            t.placed ? "ok" : "warn",
          ));
      },
      adGatesAsk: () => {
        const t = Le();
        this.setState({
          adAsk: { kind: "gates", placed: t.placed, deficit: t.deficit, surplus: t.surplus, gatesN: t.gatesN, closedSkip: t.closedSkip },
        });
      },
      adAskOn: !!e.adAsk,
      adAskTitle: "التوزيع الآلي على الأبواب",
      adAskCanDo: !!(e.adAsk && e.adAsk.placed > 0),
      adAskMsg: (() => {
        const t = e.adAsk;
        return t
          ? t.placed
            ? "سيُسكَّن " +
              KIVO.BassamCount(t.placed, "موظف") +
              " على " +
              KIVO.BassamCount(t.gatesN, "باب", "g") +
              " بحسب احتياج كل بابٍ في كل وردية، بترتيب الأبواب." +
              (t.deficit
                ? " يبقى بعده عجز " + t.deficit + " بلا موظف — يظهر في شريط العجز والمؤشرات."
                : " ويكتمل به احتياج الأبواب كاملاً.") +
              (t.surplus
                ? " ويبقى " +
                  KIVO.BassamCount(t.surplus, "موظف|فائض غير مسكَّن") +
                  " " +
                  KIVO.BassamCount.agr(t.surplus, "تسكّنه", "تسكّنهما", "تسكّنهم") +
                  " بيدك."
                : "") +
              (t.closedSkip ? " (تُجوّزت أبواب مغلقة لا تُسكَّن)." : "") +
              " من سكّنتَه يدوياً يبقى في مكانه."
            : "لا شيء يُوزَّع: " +
              (t.deficit
                ? "احتياج الأبواب قائم لكن لا موظفين غير مسكَّنين في وردياته — العجز " + t.deficit + " ويبقى ظاهراً في المؤشرات."
                : "احتياج الأبواب مكتملٌ أو غير مُدخل. عبّئ جدول احتياج الأبواب أولاً.")
          : "";
      })(),
      adAskCancel: () => this.setState({ adAsk: null }),
      adAskDo: () => {
        if (!this.PC("edit")) return (this.permDeny(), void this.setState({ adAsk: null }));
        const t = Le();
        (this.setState({ gates: t.gates2, adAsk: null }, () => this.savePlan()),
          this.bsAck(
            t.placed
              ? "سُكِّن " +
                  KIVO.BassamCount(t.placed, "موظف") +
                  " على " +
                  KIVO.BassamCount(t.gatesN, "باب", "g") +
                  "" +
                  (t.deficit ? " · بقي عجز " + t.deficit : " · اكتمل الاحتياج") +
                  (t.surplus ? " · فائض غير مسكَّن: " + t.surplus : "")
              : "لم يُسكَّن أحد — راجع احتياج الأبواب وموظفي الورديات",
            t.placed ? "ok" : "warn",
          ));
      },
      clrGatesAsk: () => {
        (this.setState({ asnFly: null }),
          (this.state.gates || []).some((t) => (t.emp || []).length) && this.setState({ clearAsk: { kind: "gassign" } }));
      },
      clrZonesAsnAsk: () => {
        (this.setState({ asnFly: null }),
          (this.state.zones || []).some((t) => (t.emp || []).length) && this.setState({ clearAsk: { kind: "zassign" } }));
      },
      clrMarksAsnAsk: () => {
        (this.setState({ asnFly: null }),
          (this.state.marks || []).some((t) => (t.emp || []).length) && this.setState({ clearAsk: { kind: "massign" } }));
      },
      priClrGatesAsk: () => {
        (this.setState({ asnFly: null }), (this.state.gates || []).some((t) => t.pri) && this.setState({ clearAsk: { kind: "gpri" } }));
      },
      priClrZonesAsk: () => {
        (this.setState({ asnFly: null }), (this.state.zones || []).some((t) => t.pri) && this.setState({ clearAsk: { kind: "zpri" } }));
      },
      priClrMarksAsk: () => {
        (this.setState({ asnFly: null }), (this.state.marks || []).some((t) => t.pri) && this.setState({ clearAsk: { kind: "mpri" } }));
      },
      clearAssignAsk: () => {
        const t = this.state;
        [...(t.zones || []), ...(t.gates || [])].some((t) => (t.emp || []).length) && this.setState({ clearAsk: { kind: "assign" } });
      },
      clearCapAsk: () => {
        const t = this.state;
        (this.curMpu() > 0 || (t.zones || []).some((t) => null != t.area || t.shareName || null != t.share || null != t.cap)) &&
          this.setState({ clearAsk: { kind: "cap" } });
      },
      clearAskOn: !!e.clearAsk,
      clearAskTitle:
        (e.clearAsk &&
          {
            sectors: "مسح جميع النطاقات",
            zones: "مسح جميع المصليات",
            gates: "مسح جميع الأبواب",
            paths: "مسح جميع المسارات",
            assign: "مسح كل التسكين",
            gassign: "مسح تسكين الأبواب",
            zassign: "مسح تسكين المصليات",
            massign: "مسح تسكين المعالم",
            marks: "مسح جميع المعالم",
            gpri: "مسح مقترح التغطية — الأبواب",
            zpri: "مسح مقترح التغطية — المصليات",
            mpri: "مسح أولويات التغطية — المعالم",
            cap: "مسح بيانات السعة والمعايرة",
          }[e.clearAsk.kind]) ||
        "",
      clearAskMsg: (() => {
        if (!e.clearAsk) return "";
        const t = (e.floors[e.floor] || e.floors[0] || {}).name || "",
          Ld = this.bsLensOn("dist"),
          Ln = this.bsLensOn("dens");
        if ("zones" === e.clearAsk.kind)
          return (
            "سيتم مسح " +
            KIVO.BassamCount(e.zones.length, "مصلى", "g") +
            " من لوحة «" +
            t +
            "» نهائياً" +
            (Ld ? " بما عليها من تسكين" + (Ln ? " وبيانات سعة" : "") : Ln ? " بما عليها من بيانات سعة" : "") +
            ". لا يمكن التراجع."
          );
        if ("gates" === e.clearAsk.kind)
          return (
            "سيتم مسح " +
            KIVO.BassamCount(e.gates.length, "باب", "g") +
            " من لوحة «" +
            t +
            "» نهائياً" +
            (Ld ? " بما عليه من تسكين" : "") +
            ". لا يمكن التراجع."
          );
        if ("paths" === e.clearAsk.kind)
          return "سيتم مسح " + KIVO.BassamCount((e.paths || []).length, "مسار", "g") + " من لوحة «" + t + "» نهائياً. لا يمكن التراجع.";
        if ("sectors" === e.clearAsk.kind)
          return (
            "سيتم مسح " +
            this._secs().length +
            " نطاقاً من لوحة «" +
            t +
            "» نهائياً — تبقى المصليات والأبواب والمعالم في مكانها بلا نطاق. لا يمكن التراجع."
          );
        if ("marks" === e.clearAsk.kind)
          return (
            "سيتم مسح " +
            KIVO.BassamCount((e.marks || []).length, "معلم", "g") +
            " من لوحة «" +
            t +
            "» نهائياً" +
            (Ld ? " بما عليه من تسكين" : "") +
            ". لا يمكن التراجع."
          );
        if ("gpri" === e.clearAsk.kind)
          return (
            "سيُمسح تصنيف أولوية التغطية (أ/ب/ج) عن " +
            KIVO.BassamCount((e.gates || []).filter((t) => t.pri).length, "باب|مصنَّف", "g") +
            " في «" +
            t +
            "» — التسكين والرسومات تبقى. لا يمكن التراجع."
          );
        if ("zpri" === e.clearAsk.kind)
          return (
            "سيُمسح تصنيف أولوية التغطية (أ/ب/ج) عن " +
            KIVO.BassamCount((e.zones || []).filter((t) => t.pri).length, "مصلى|مصنَّف", "g") +
            " في «" +
            t +
            "» — التسكين والرسومات تبقى. لا يمكن التراجع."
          );
        if ("mpri" === e.clearAsk.kind)
          return (
            "سيُمسح تصنيف أولوية التغطية (أ/ب/ج) عن " +
            KIVO.BassamCount((e.marks || []).filter((t) => t.pri).length, "معلم|مصنَّف", "g") +
            " في «" +
            t +
            "» — التسكين يبقى. لا يمكن التراجع."
          );
        if ("zassign" === e.clearAsk.kind) {
          const s = (e.zones || []).filter((t) => (t.emp || []).length).length,
            n = new Set();
          return (
            (e.zones || []).forEach((t) => (t.emp || []).forEach((t) => n.add(t))),
            "سيُفرَّغ تسكين " +
              KIVO.BassamCount(s, "مصلى", "g") +
              " (" +
              KIVO.BassamCount(n.size, "موظف") +
              ") في «" +
              t +
              "» — المصليات ورسوماتها تبقى. لا يمكن التراجع."
          );
        }
        if ("massign" === e.clearAsk.kind) {
          const s = (e.marks || []).filter((t) => (t.emp || []).length).length,
            n = new Set();
          return (
            (e.marks || []).forEach((t) => (t.emp || []).forEach((t) => n.add(t))),
            "سيُفرَّغ تسكين " +
              KIVO.BassamCount(s, "معلم", "g") +
              " (" +
              KIVO.BassamCount(n.size, "موظف") +
              ") في «" +
              t +
              "» — المعالم تبقى. لا يمكن التراجع."
          );
        }
        if ("gassign" === e.clearAsk.kind) {
          const s = (e.gates || []).filter((t) => (t.emp || []).length).length,
            n = new Set();
          return (
            (e.gates || []).forEach((t) => (t.emp || []).forEach((t) => n.add(t))),
            "سيُفرَّغ تسكين " +
              KIVO.BassamCount(s, "باب", "g") +
              " (" +
              KIVO.BassamCount(n.size, "موظف") +
              ") في «" +
              t +
              "» — الأبواب ورسوماتها تبقى. لا يمكن التراجع."
          );
        }
        return "assign" === e.clearAsk.kind
          ? "سيتم إفراغ التسكين من " +
              ([
                this.bsLensOn("zones") ? KIVO.BassamCount((e.zones || []).filter((t) => (t.emp || []).length).length, "مصلى") + "" : null,
                this.bsLensOn("gates") ? KIVO.BassamCount((e.gates || []).filter((t) => (t.emp || []).length).length, "باب") + "" : null,
              ]
                .filter(Boolean)
                .join(" و ") || "العناصر") +
              " في «" +
              t +
              "» — تُحذف أسماء المكلّفين فقط، وتبقى الرسومات كما هي. لا يمكن التراجع."
          : "سيتم مسح معايرة الخريطة وكل بيانات السعة (المساحة ونصيب الفرد) لجميع مصليات «" +
              t +
              "» — تبقى الرسومات كما هي وتعود المصليات «بلا سعة». لا يمكن التراجع.";
      })(),
      clearAskCancel: () => this.setState({ clearAsk: null }),
      clearAskDo: () => {
        if (!this.PC("del")) return void this.permDeny();
        const t = this.state,
          e = (t.clearAsk || {}).kind;
        "sectors" === e
          ? (this.setState({
              sel: null,
              selMulti: [],
              polyPts: [],
              polyCursor: null,
              clearAsk: null,
              zones: (t.zones || []).map((t) => (t && t.sec ? { ...t, sec: "" } : t)),
              gates: (t.gates || []).map((t) => (t && t.sec ? { ...t, sec: "" } : t)),
              marks: (t.marks || []).map((t) => (t && t.sec ? { ...t, sec: "" } : t)),
            }),
            this._secWrite([]))
          : "zones" === e
            ? this.setState({ zones: [], sel: null, selMulti: [], draft: null, polyPts: [], polyCursor: null, clearAsk: null }, () =>
                this.savePlan(),
              )
            : "gates" === e
              ? this.setState({ gates: [], sel: null, selMulti: [], clearAsk: null }, () => this.savePlan())
              : "paths" === e
                ? this.setState({ paths: [], sel: null, selMulti: [], polyPts: [], polyCursor: null, clearAsk: null }, () =>
                    this.savePlan(),
                  )
                : "marks" === e
                  ? this.setState({ marks: [], sel: null, selMulti: [], clearAsk: null }, () => this.savePlan())
                  : "gassign" === e
                    ? this.setState({ gates: (t.gates || []).map((t) => ({ ...t, emp: [] })), clearAsk: null }, () => this.savePlan())
                    : "zassign" === e
                      ? this.setState({ zones: (t.zones || []).map((t) => ({ ...t, emp: [] })), clearAsk: null }, () => this.savePlan())
                      : "massign" === e
                        ? this.setState({ marks: (t.marks || []).map((t) => ({ ...t, emp: [] })), clearAsk: null }, () => this.savePlan())
                        : "gpri" === e
                          ? this.setState({ gates: (t.gates || []).map((t) => ({ ...t, pri: "" })), clearAsk: null }, () => this.savePlan())
                          : "zpri" === e
                            ? this.setState({ zones: (t.zones || []).map((t) => ({ ...t, pri: "" })), clearAsk: null }, () =>
                                this.savePlan(),
                              )
                            : "mpri" === e
                              ? this.setState({ marks: (t.marks || []).map((t) => ({ ...t, pri: "" })), clearAsk: null }, () =>
                                  this.savePlan(),
                                )
                              : "assign" === e
                                ? this.setState(
                                    {
                                      zones: (t.zones || []).map((t) => ({ ...t, emp: [] })),
                                      gates: (t.gates || []).map((t) => ({ ...t, emp: [] })),
                                      clearAsk: null,
                                    },
                                    () => this.savePlan(),
                                  )
                                : "cap" === e
                                  ? this.setState(
                                      {
                                        zones: (t.zones || []).map((t) => {
                                          const { area: e, share: s, shareName: n, cap: a, ...i } = t;
                                          return { ...i, area: null, share: null, shareName: null, cap: null };
                                        }),
                                        floors: (t.floors || []).map((e, s) => (s === t.floor ? { ...e, mpu: null } : e)),
                                        calMode: null,
                                        calAsk: null,
                                        polyCursor: null,
                                        clearAsk: null,
                                      },
                                      () => this.savePlan(),
                                    )
                                  : this.setState({ clearAsk: null });
      },
      yearLabel: e.year + " هـ",
      gregRange: this.gregYearRange(e.year),
      prevYear: () => this.goTo(this.state.year - 1, this.state.month),
      nextYear: () => this.goTo(this.state.year + 1, this.state.month),
      goCurrent: () => {
        const t = this.curHijri();
        this.goTo(t.y, t.m);
      },
      pickerMonthLabel: (this.MONTHS[e.month - 1] || "") + " " + e.year + " هـ",
      floorImgNode:
        e.floors[e.floor] && e.floors[e.floor].img
          ? ((s9, N9) =>
              React.createElement(
                React.Fragment,
                null,
                React.createElement("image", {
                  className: "bs-map-day",
                  href: s9,
                  x: 0,
                  y: 0,
                  width: 1e3,
                  height: 600,
                  preserveAspectRatio: "xMidYMid meet",
                  style: { pointerEvents: "none", imageRendering: "-webkit-optimize-contrast" },
                }),
                N9
                  ? React.createElement("image", {
                      className: "bs-map-night",
                      "data-night-key": N9.key(s9),
                      href: N9.url(s9) || void 0,
                      x: 0,
                      y: 0,
                      width: 1e3,
                      height: 600,
                      preserveAspectRatio: "xMidYMid meet",
                      style: { display: "none", pointerEvents: "none", imageRendering: "-webkit-optimize-contrast" },
                    })
                  : null,
              ))(e.floors[e.floor].img, KIVO.BassamMapNight)
          : null,
      noFloorImg: !(e.floors[e.floor] && e.floors[e.floor].img),
      floorImgHint: "خريطة " + ((e.floors[e.floor] || e.floors[0] || {}).name || "") + " — اسحب صورة الخريطة أو عدّل الموقع لرفعها",
      canDraw:
        (("plan" === e.lens && !e.zAsn && this.bsLensOn("zones")) ||
          ("marks" === e.lens && !e.mAsn && this.bsLensOn("marks")) ||
          ("gates" === e.lens && !e.gAsn && this.bsLensOn("gates"))) &&
        !d &&
        (e.floors || []).length > 0 &&
        this._plCanWrite(),
      ndtRoBarOn:
        (("plan" === e.lens && !e.zAsn && this.bsLensOn("zones")) ||
          ("marks" === e.lens && !e.mAsn && this.bsLensOn("marks")) ||
          ("gates" === e.lens && !e.gAsn && this.bsLensOn("gates"))) &&
        (e.floors || []).length > 0 &&
        (d || !this._plCanWrite()),
      inPlanBar: "plan" === e.lens,
      inGatesBar: "gates" === e.lens,
      inMarksBar: "marks" === e.lens,
      histBarOn: "plan" === e.lens || "gates" === e.lens || "marks" === e.lens,
      pathToolOn: "plan" === e.lens && this.bsLensOn("paths"),
      markToolOn: "marks" === e.lens && !e.mAsn && this.bsLensOn("marks"),
      gateToolOn: "gates" === e.lens && !e.gAsn && this.bsLensOn("gates"),
      canDrawPaths: !1,
      noSites: 0 === (e.floors || []).length,
      hasSites: (e.floors || []).length > 0,
      toolSelect: () =>
        this.setState({
          tool: "select",
          polyPts: [],
          polyCursor: null,
          draft: null,
        }),
      toolGate: () => {
        this.bsLensOn("gates") && (et("gates"), this.setState({ tool: "gate", sel: null, selMulti: [] }));
      },
      toolMark: () => {
        this.bsLensOn("marks") && (et("marks"), this.setState({ tool: "mark", sel: null, selMulti: [] }));
      },
      toolPath: () => {
        this.bsLensOn("paths") && (et("paths"), this.setState({ tool: "path", sel: null, selMulti: [], polyPts: [], polyCursor: null }));
      },
      lzPaths: this.bsLensOn("paths"),
      lzGates: this.bsLensOn("gates"),
      lzMarks: this.bsLensOn("marks"),
      lzDist: this.bsLensOn("dist"),
      lzNoDist: !this.bsLensOn("dist"),
      lzDens: this.bsLensOn("dens"),
      lzZones: this.bsLensOn("zones"),
      toolsOpen: !1 !== e.toolsOpen,
      toolsToggle: () => this.setState({ toolsOpen: !1 === e.toolsOpen }),
      toolsChevron: "transition:transform .2s;transform:" + (!1 === e.toolsOpen ? "rotate(0deg)" : "rotate(180deg)"),
      toolsToggleTitle:
        !1 === e.toolsOpen ? "إظهار شريط الأدوات" : "طيّ شريط الأدوات",
      ...(() => {
        const t = { poly: "مصلى حر", rect: "مصلى مستطيل", square: "مصلى مربع", circle: "مصلى دائري" },
          s = !!t[e.tool],
          n = s ? e.tool : e.lastShape || "poly",
          a = (t) =>
            "width:32px;height:32px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;box-sizing:border-box;position:relative;border:2px solid " +
            (t
              ? "#b99751;background:var(--bg-a185151810p1);color:var(--fg-x9a7e40)"
              : "transparent;background:transparent;color:var(--fg-x475569)"),
          i = (t) =>
            "position:absolute;bottom:1px;left:1px;line-height:0;opacity:" + (t ? ".85" : ".45") + ";color:inherit;pointer-events:none",
          r = (t) => {
            try {
              const e = t.currentTarget.getBoundingClientRect();
              return { t: e.top, l: e.right, rl: e.left };
            } catch (t) {
              return { t: 0, l: 0, rl: 0 };
            }
          },
          l = (t, e) => {
            if (!t) return "display:none";
            const s = "undefined" != typeof window ? window.innerWidth : 1200,
              n = t.l + 6 + e > s ? Math.max(4, t.rl - 6 - e) : t.l + 6;
            return (
              "position:fixed;top:" +
              Math.round(t.t) +
              "px;left:" +
              Math.round(n) +
              "px;z-index:2147483000;display:flex;gap:3px;background:var(--bg-xffffff);border:1px solid var(--bd-a185151810p35);border-radius:10px;padding:3px;box-shadow:var(--shadow-elevated)"
            );
          },
          o = (t) => () => this.setState({ tool: t, lastShape: t, sel: null, selMulti: [], polyPts: [], polyCursor: null, shapeFly: null });
        return {
          shapeBtnStyle: a(s),
          shapeChevStyle: i(s),
          shapeTitle: "رسم " + t[n] + " — والمثلث يفتح بقية الأشكال",
          shapeFlyOpen: !!e.shapeFly,
          shapeFlyStyle: l(e.shapeFly, 150),
          shapeToggle: (t) => this.setState({ shapeFly: e.shapeFly ? null : r(t), clearFly: null, asnFly: null }),
          shapeIsPoly: "poly" === n,
          shapeIsRect: "rect" === n,
          shapeIsSquare: "square" === n,
          shapeIsCircle: "circle" === n,
          pickPoly: o("poly"),
          pickRect: o("rect"),
          pickSquare: o("square"),
          pickCircle: o("circle"),
          titlePoly: "رسم مصلى حر",
          titleRect: "رسم مصلى مستطيل",
          titleSquare: "رسم مصلى مربع",
          titleCircle: "رسم مصلى دائري",
          clearBtnStyle: a(!!e.clearFly),
          clearChevStyle: i(!!e.clearFly),
          clearFlyOpen: !!e.clearFly,
          clearFlyStyle: l(e.clearFly, 150),
          clearToggle: (t) => this.setState({ clearFly: e.clearFly ? null : r(t), shapeFly: null, asnFly: null }),
          asnClrToggleZ: (t) =>
            this.setState({
              asnFly: e.asnFly && "zones" === e.asnFly.k ? null : Object.assign({ k: "zones" }, r(t)),
              shapeFly: null,
              clearFly: null,
            }),
          asnClrToggleG: (t) =>
            this.setState({
              asnFly: e.asnFly && "gates" === e.asnFly.k ? null : Object.assign({ k: "gates" }, r(t)),
              shapeFly: null,
              clearFly: null,
            }),
          asnClrToggleM: (t) =>
            this.setState({
              asnFly: e.asnFly && "marks" === e.asnFly.k ? null : Object.assign({ k: "marks" }, r(t)),
              shapeFly: null,
              clearFly: null,
            }),
          asnFlyOnZ: !(!e.asnFly || "zones" !== e.asnFly.k),
          asnFlyOnG: !(!e.asnFly || "gates" !== e.asnFly.k),
          asnFlyOnM: !(!e.asnFly || "marks" !== e.asnFly.k),
          asnFlyStyleZ: l(e.asnFly && "zones" === e.asnFly.k ? e.asnFly : null, 150),
          asnFlyStyleG: l(e.asnFly && "gates" === e.asnFly.k ? e.asnFly : null, 150),
          asnFlyStyleM: l(e.asnFly && "marks" === e.asnFly.k ? e.asnFly : null, 150),
        };
      })(),
      tSelStyle:
        ((Ge = "select" === e.tool),
        "width:32px;height:32px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;box-sizing:border-box;border:2px solid " +
          (Ge
            ? "#b99751;background:var(--bg-a185151810p1);color:var(--fg-x9a7e40)"
            : "transparent;background:transparent;color:var(--fg-x475569)")),
      tRectStyle: ((t) =>
        "width:32px;height:32px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;box-sizing:border-box;border:2px solid " +
        (t
          ? "#b99751;background:var(--bg-a185151810p1);color:var(--fg-x9a7e40)"
          : "transparent;background:transparent;color:var(--fg-x475569)"))("rect" === e.tool),
      tPolyStyle: ((t) =>
        "width:32px;height:32px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;box-sizing:border-box;border:2px solid " +
        (t
          ? "#b99751;background:var(--bg-a185151810p1);color:var(--fg-x9a7e40)"
          : "transparent;background:transparent;color:var(--fg-x475569)"))("poly" === e.tool),
      tGateStyle: ((t) =>
        "width:32px;height:32px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;box-sizing:border-box;border:2px solid " +
        (t
          ? "#b99751;background:var(--bg-a185151810p1);color:var(--fg-x9a7e40)"
          : "transparent;background:transparent;color:var(--fg-x475569)"))("gate" === e.tool),
      tMarkStyle: ((t) =>
        "width:32px;height:32px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;box-sizing:border-box;border:2px solid " +
        (t
          ? "#b99751;background:var(--bg-a185151810p1);color:var(--fg-x9a7e40)"
          : "transparent;background:transparent;color:var(--fg-x475569)"))("mark" === e.tool),
      tPathStyle: ((t) =>
        "width:32px;height:32px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;box-sizing:border-box;border:2px solid " +
        (t
          ? "#b99751;background:var(--bg-a185151810p1);color:var(--fg-x9a7e40)"
          : "transparent;background:transparent;color:var(--fg-x475569)"))("path" === e.tool),
      tSquareStyle: ((t) =>
        "width:32px;height:32px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;box-sizing:border-box;border:2px solid " +
        (t
          ? "#b99751;background:var(--bg-a185151810p1);color:var(--fg-x9a7e40)"
          : "transparent;background:transparent;color:var(--fg-x475569)"))("square" === e.tool),
      tCircleStyle: ((t) =>
        "width:32px;height:32px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;box-sizing:border-box;border:2px solid " +
        (t
          ? "#b99751;background:var(--bg-a185151810p1);color:var(--fg-x9a7e40)"
          : "transparent;background:transparent;color:var(--fg-x475569)"))("circle" === e.tool),
      histUndoTitle: (this._undoStack || []).length
        ? "تراجع (Ctrl+Z) — " + KIVO.BassamCount((this._undoStack || []).length, "خطوة|متاحة") + ""
        : "لا يوجد ما يُتراجع عنه",
      histRedoTitle: (this._redoStack || []).length
        ? "إعادة (Ctrl+Shift+Z) — " + KIVO.BassamCount((this._redoStack || []).length, "خطوة") + ""
        : "لا يوجد ما يُعاد",
      histUndoDo: () => this.histUndo(),
      histRedoDo: () => this.histRedo(),
      histUndoStyle:
        "width:30px;height:28px;border-radius:10px;border:0;display:flex;align-items:center;justify-content:center;transition:all .15s;background:transparent;" +
        (!d && (this._undoStack || []).length ? "color:var(--fg-x475569);cursor:pointer" : "color:var(--fg-xcbd5e1);cursor:default"),
      histRedoStyle:
        "width:30px;height:28px;border-radius:10px;border:0;display:flex;align-items:center;justify-content:center;transition:all .15s;background:transparent;" +
        (!d && (this._redoStack || []).length ? "color:var(--fg-x475569);cursor:pointer" : "color:var(--fg-xcbd5e1);cursor:default"),
      viewBox: e.view.x + " " + e.view.y + " " + e.view.w + " " + e.view.h,
      mapWheel: (t) => {
        const e = Ot(t);
        ((this._whAcc = (this._whAcc || 0) + (t.deltaY || 0)),
          (this._whPt = e),
          this._whRaf ||
            (this._whRaf = requestAnimationFrame(() => {
              this._whRaf = 0;
              const t = this._whAcc;
              if (((this._whAcc = 0), !t)) return;
              const e = Math.min(1.6, Math.max(1.03, 1 + Math.abs(t) / 400));
              Tt(this._whPt.x, this._whPt.y, t > 0 ? e : 1 / e);
            })));
      },
      mapBodyStyle:
        "position:relative;background:var(--bg-xf8fafc);overflow:hidden;user-select:none;-webkit-user-select:none;" +
        (l ? "flex:1;min-height:0" : "height:var(--bs-map-h)"),
      toggleFs: () => {
        const t = !this.state.mapFs;
        try {
          document.body.style.overflow = t ? "hidden" : "";
        } catch (t) {}
        this.setState({ mapFs: t });
      },
      fsOn: l,
      fsThemeTitle: o ? "الوضع النهاري" : "الوضع الليلي",
      fsThemeP1: o ? "M12 2v2" : "M12 3a6.364 6.364 0 0 0 9 9 9 9 0 1 1-9-9",
      fsThemeP2: o
        ? "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
        : "",
      fsThemeBtnStyle:
        "width:30px;height:28px;border-radius:10px;border:0;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;" +
        (o ? "background:var(--bg-a185151810p16);color:var(--fg-xb99751)" : "background:transparent;color:var(--fg-x475569)"),
      fsThemeToggle: () => {
        try {
          KIVO.BassamTheme && KIVO.BassamTheme.toggle();
        } catch (t) {}
        this.setState((t) => ({ themeTick: (t.themeTick || 0) + 1 }));
      },
      fsTitle: l ? "خروج من ملء الشاشة (Esc)" : "ملء الشاشة — مساحة عمل كاملة",
      fsBtnStyle:
        "width:30px;height:28px;border-radius:10px;border:0;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;" +
        (l ? "background:var(--bg-xb99751);color:var(--text-on-brand)" : "background:transparent;color:var(--fg-x475569)"),
      fsA: l ? "M8 3v3a2 2 0 0 1-2 2H3" : "M15 3h6v6",
      fsB: l ? "M21 8h-3a2 2 0 0 1-2-2V3" : "M9 21H3v-6",
      fsC: l ? "M3 16h3a2 2 0 0 1 2 2v3" : "m21 3-7 7",
      fsD: l ? "M16 21v-3a2 2 0 0 1 2-2h3" : "m3 21 7-7",
      wsStyle:
        "display:flex;gap:12px;align-items:stretch" +
        (l
          ? ";position:fixed;top:0;right:0;bottom:0;left:0;z-index:9000;background:var(--bg-xfafafa);padding:10px;box-sizing:border-box;animation:fsIn .2s ease"
          : ""),
      zoomIn: () =>
        Tt(e.view.x + e.view.w / 2, e.view.y + e.view.h / 2, 1 / 1.3),
      zoomOut: () => Tt(e.view.x + e.view.w / 2, e.view.y + e.view.h / 2, 1.3),
      zoomFit: () => this.setState({ view: { x: 0, y: 0, w: 1e3, h: 600 } }),
      ...(() => {
        const t = e.planMonths || {},
          s = this._mKey(e.year, e.month),
          n = this._hasPlanFor(t, s),
          a = this.MONTHS[e.month - 1] || "",
          i = Object.keys(t).filter((e) => {
            if (e === s) return !1;
            const n = this._mData(t, e);
            return !!(n && n.length);
          });
        i.sort((t, e) => {
          const [s, n] = t.split("-").map(Number),
            [a, i] = e.split("-").map(Number);
          return 12 * a + i - (12 * s + n);
        });
        const r = e.planAdd,
          l = {};
        if (r)
          try {
            const t = this._opRead("bassam_rounds_v1");
            if (t) {
              const e = t;
              e &&
                "object" == typeof e &&
                Object.keys(e).forEach((t) => {
                  const s = t.split("-");
                  if (3 !== s.length) return;
                  const n = e[t];
                  if (!(n && n.ap && Array.isArray(n.d) && n.d.length)) return;
                  const a = s[0] + "-" + s[1];
                  (l[a] = l[a] || []).push(+s[2]);
                });
            }
          } catch (t) {}
        Object.keys(l).forEach((t) => l[t].sort((t, e) => t - e));
        const o = Object.keys(l).sort((t, e) => {
            const [s, n] = t.split("-").map(Number),
              [a, i] = e.split("-").map(Number);
            return 12 * a + i - (12 * s + n);
          }),
          d = (e) => {
            const D = this._mData(t, e) || [],
              c = (k) => D.reduce((t, e) => t + ((e[k] && e[k].length) || 0), 0),
              o = [KIVO.BassamCount(D.length, "موقع")];
            this.bsLensOn("gates") && o.push(KIVO.BassamCount(c("gates"), "باب") + "");
            this.bsLensOn("zones") && o.push(KIVO.BassamCount(c("zones"), "مصلى") + "");
            this.bsLensOn("marks") && o.push(KIVO.BassamCount(c("marks"), "معلم") + "");
            this.bsLensOn("paths") && o.push(KIVO.BassamCount(c("paths"), "مسار") + "");
            return o.join(" · ");
          },
          h = r && ("copy" === r.mode || "day" === r.mode),
          p = r && ("new" === r.mode || (h && r.src));
        return {
          hasMonthPlan: n,
          noMonthPlan: !n,
          stageLocked: !this._stageStaffOk(e.year, e.month) && !n,
          noPlanTitle:
            this._stageStaffOk(e.year, e.month) || n
              ? "لا توجد خطة لشهر " + a + " " + e.year + " هـ"
              : "مرحلة التشغيل الميداني لشهر " + a + " مقفلة",
          noPlanSub:
            this._stageStaffOk(e.year, e.month) || n
              ? "كل شهر له خطته المستقلة — أنشئ خطة هذا الشهر من الصفر أو انسخها من شهر سابق."
              : "تُفتح بعد اعتماد الجدول الشهري لشهر " + a + " — أكمل المرحلة الأولى: وزّع الموظفين على الورديات واعتمد الشهر، ثم عد هنا.",
          addPlanLabel: "إضافة خطة لشهر " + a,
          planAddAllowed: !this.monthAutoLocked(e.year, e.month) && (this._stageStaffOk(e.year, e.month) || n),
          planAddLockedHint: this.monthAutoLocked(e.year, e.month),
          planAddOn: !!r,
          planAddOpenDo: () => {
            this.monthAutoLocked(e.year, e.month) || this.setState({ planAdd: { mode: "new", kind: "keep", src: i[0] || null, day: 1 } });
          },
          planAddClose: () => this.setState({ planAdd: null }),
          planModes: [
            {
              id: "new",
              title: "إنشاء خطة جديدة",
              desc: "ابدأ خطة جديدة، واختر بين استخدام المواقع والخرائط الحالية أو البدء من الصفر بالكامل.",
              p1: "M12 5v14",
              p2: "M5 12h14",
            },
            {
              id: "copy",
              title: "نسخ خطة من شهر سابق",
              desc: "استخدم خطة شهر سابق كأساس للشهر الجديد، ثم عدّل عليها حسب الحاجة.",
              p1: "M8 8m-1 0a7 7 0 1 0 14 0a7 7 0 1 0-14 0",
              p2: "M16 16H4a2 2 0 0 1-2-2V4",
            },
            {
              id: "day",
              title: "إنشاء من يوم تشغيلي",
              desc: "استخدم الحالة الفعلية المسجلة في يوم من المتابعة اليومية كأساس للخطة الجديدة.",
              p1: "M8 2v4M16 2v4M3 10h18",
              p2: "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
            },
          ].map((t) => {
            const e = r && r.mode === t.id;
            return {
              title: t.title,
              desc: t.desc,
              p1: t.p1,
              p2: t.p2,
              on: e,
              iconBg: e ? "rgba(185,151,81,0.15)" : "rgba(245,245,245,0.9)",
              iconColor: e ? "#b99751" : "#64748b",
              showKinds: e && "new" === t.id,
              delNote: e && "new" === t.id && !!(this.state.delMonths || {})[this._mKey(this.state.year, this.state.month)],
              kinds: [
                {
                  id: "keep",
                  title: "استخدام المواقع والخرائط الحالية",
                  desc: "يحتفظ بالمواقع وخرائطها فقط، وتبدأ بإضافة المصليات والمسارات والمعالم من جديد.",
                },
                {
                  id: "blank",
                  title: "بدء خطة فارغة بالكامل",
                  desc: "ابدأ بدون أي مواقع أو خرائط، ثم أضف المواقع وارفع الخرائط الجديدة بنفسك.",
                },
              ].map((k) => {
                const on = ((r && r.kind) || "keep") === k.id;
                return {
                  title: k.title,
                  desc: k.desc,
                  on: on,
                  pick: () => this.setState((e) => ({ planAdd: { ...(e.planAdd || {}), mode: "new", kind: k.id } })),
                  style:
                    "width:100%;display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:10px;cursor:pointer;font-family:'Cairo',sans-serif;transition:all .15s;text-align:right;border:1px solid " +
                    (on
                      ? "var(--brand-primary);background:var(--brand-soft);box-shadow:0 0 0 2px var(--brand-ring)"
                      : "var(--border-default);background:var(--bg-card)"),
                  dotStyle:
                    "width:14px;height:14px;border-radius:9999px;flex-shrink:0;border:2px solid " +
                    (on
                      ? "var(--brand-primary);background:var(--brand-primary);box-shadow:inset 0 0 0 3px var(--bg-card)"
                      : "var(--border-strong);background:transparent"),
                };
              }),
              showSrc: e && ("copy" === t.id || "day" === t.id),
              showDay: e && "day" === t.id,
              pick: () =>
                this.setState((e) => {
                  const s = { ...e.planAdd, mode: t.id };
                  return (
                    "day" === t.id
                      ? ((s.src && l[s.src]) || (s.src = o[0] || null),
                        s.src && l[s.src] && -1 === l[s.src].indexOf(s.day) && (s.day = l[s.src][0]))
                      : "copy" === t.id && ((s.src && -1 !== i.indexOf(s.src)) || (s.src = i[0] || null)),
                    { planAdd: s }
                  );
                }),
              style:
                "width:100%;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;cursor:pointer;font-family:'Cairo',sans-serif;transition:all .15s;text-align:right;border:1px solid " +
                (e
                  ? "#b99751;background:var(--bg-a185151810p06);box-shadow:0 0 0 2px rgba(185,151,81,0.12)"
                  : "#E5E7EB;background:var(--bg-xffffff)"),
            };
          }),
          noSrcMonths: r && "day" === r.mode ? 0 === o.length : 0 === i.length,
          noSrcMsg:
            r && "day" === r.mode
              ? "لا توجد جولات مسجلة في المتابعة اليومية بعد — سجّل أو استورد جولة يوم أولاً"
              : "لا توجد أشهر سابقة فيها بيانات",
          srcMonths: (r && "day" === r.mode ? o : i).map((t) => {
            const [e, s] = t.split("-").map(Number),
              n = r && r.src === t,
              a = r && "day" === r.mode;
            return {
              label: this.MONTHS[s - 1] + " " + e + " — " + (a ? l[t].length + (1 === l[t].length ? " جولة" : " جولات") : d(t)),
              pick: () =>
                this.setState((e) => {
                  const s = { ...e.planAdd, src: t };
                  return (e.planAdd && "day" === e.planAdd.mode && l[t] && -1 === l[t].indexOf(s.day) && (s.day = l[t][0]), { planAdd: s });
                }),
              style:
                "height:30px;padding:0 12px;border-radius:9999px;font-size:11px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif;transition:all .15s;border:1px solid " +
                (n
                  ? "#b99751;background:var(--bg-a185151810p12);color:var(--fg-x9a7e40)"
                  : "#E5E7EB;background:var(--bg-xffffff);color:var(--fg-x475569)"),
            };
          }),
          planDays:
            r && "day" === r.mode && r.src && l[r.src]
              ? l[r.src]
                  .slice()
                  .sort((t, e) => e - t)
                  .map((t) => ({ v: String(t), sel: r.day === t }))
              : [],
          planDaysNone: !(
            !r ||
            "day" !== r.mode ||
            (r.src && l[r.src] && l[r.src].length)
          ),
          planDaysNote: (function () {
            if (!r || "day" !== r.mode) return "";
            if (!r.src) return "اختر الشهر المصدر أولاً";
            var t = l[r.src] || [];
            if (!t.length) return "لا جولات معتمدة في هذا الشهر";
            var e = r.day || t[t.length - 1];
            return t.length + " " + (t.length, "جولة معتمدة في هذا الشهر — المختار: يوم ") + e;
          })(),
          onPlanDay: (t) =>
            this.setState((e) => ({
              planAdd: { ...e.planAdd, day: +t.target.value || 1 },
            })),
          planCreateStyle:
            "height:38px;padding:0 20px;border-radius:10px;font-size:13px;font-weight:400;border:0;font-family:'Cairo',sans-serif;" +
            (p
              ? "background:var(--bg-xb99751);color:var(--text-on-brand);cursor:pointer"
              : "background:var(--bg-xe5e7eb);color:var(--fg-x94a3b8);cursor:default"),
          planAddCreate: () => {
            const t = this.state.planAdd;
            if (!t) return;
            if (this.monthAutoLocked(this.state.year, this.state.month)) return;
            if (("copy" === t.mode || "day" === t.mode) && !t.src) return;
            let e;
            if ("new" === t.mode) {
              /* «المواقع وخرائطها كما هي» = قائمة المواقع الحيّة الآن — لا لقطة شهرٍ آخر قد تحمل موقعاً أو صورةً حُذفت بعده. وشهرٌ حُذفت خطتُه (شاهدُ حذف) لا يَرِثُ من الخطة المحذوفة إلا هويّةَ المواقع: اسمٌ ورقم — بلا صورةٍ ولا شارة */ const TB =
                  !!(this.state.delMonths || {})[this._mKey(this.state.year, this.state.month)],
                B = (this.state.floors || []).filter((t) => t && !t.create);
              e =
                "blank" === t.kind
                  ? []
                  : JSON.parse(JSON.stringify(B)).map((t) =>
                      TB
                        ? {
                            sid: t.sid,
                            name: t.name,
                            num: t.num,
                            chip: "",
                            chipTone: "warn",
                            zones: [],
                            gates: [],
                            marks: [],
                            paths: [],
                            sectors: [],
                            approved: !1,
                            iid: null,
                          }
                        : {
                            sid: t.sid,
                            name: t.name,
                            num: t.num,
                            chip: t.chip,
                            chipTone: t.chipTone,
                            zones: [],
                            gates: [],
                            marks: [],
                            paths: [],
                            sectors: [],
                            approved: !1,
                            iid: void 0 !== t.iid ? t.iid : null,
                          },
                    );
            } else if ("day" === t.mode) {
              const s = +t.src.split("-")[0],
                n = +t.src.split("-")[1],
                a = t.day || 1;
              let i = {};
              try {
                const t = this._opRead("bassam_rounds_v1");
                if (t) {
                  const e = t;
                  e && "object" == typeof e && (i = e);
                }
              } catch (t) {}
              const r = i[s + "-" + n + "-" + a],
                l = r && Array.isArray(r.d) ? r.d : null;
              if (!l)
                return void this.bsToast(
                  "لا توجد جولة متابعة يومية ليوم " +
                    a +
                    " من " +
                    (this.MONTHS[n - 1] || "") +
                    " " +
                    s +
                    " هـ — اختر يوماً آخر أو استخدم «نسخ من شهر سابق».",
                );
              const o = this.loadEmpList
                  ? this.loadEmpList()
                  : (() => {
                      try {
                        const t = this._opRead("bassam_employees_v1");
                        return Array.isArray(t) ? t : [];
                      } catch (t) {
                        return [];
                      }
                    })(),
                d = (t) => (t || []).map((t) => this._ck(t)).filter(Boolean),
                h =
                  this._mData(this.state.planMonths, s + "-" + n) ||
                  this.state.floors ||
                  [];
              e = JSON.parse(JSON.stringify(l)).map((t, e) => {
                const s = h[e] || {},
                  n = (this.state.floors || [])[e] || {};
                return {
                  sid: s.sid || n.sid || void 0,
                  name: void 0 !== s.name ? s.name : n.name,
                  num: void 0 !== s.num ? s.num : n.num,
                  iid: void 0 !== s.iid && null !== s.iid ? s.iid : void 0 !== n.iid ? n.iid : null,
                  zones: (t.zones || []).map((t) => ({ ...t, count: null, pc: {}, emp: d(t.emp) })),
                  gates: (t.gates || []).map((t) => ({ ...t, emp: d(t.emp) })),
                  paths: t.paths || [],
                  approved: !1,
                };
              });
            } else
              e = JSON.parse(JSON.stringify(this._mData(this.state.planMonths, t.src) || [])).map((t) => ({
                sid: t.sid || void 0,
                name: t.name,
                num: t.num,
                chip: t.chip,
                chipTone: t.chipTone,
                zones: t.zones || [],
                gates: t.gates || [],
                marks: t.marks || [],
                paths: t.paths || [],
                approved: !1,
                iid: void 0 !== t.iid ? t.iid : null,
              }));
            try {
              KIVO.BassamRound && KIVO.BassamRound.lensFilter && (e = KIVO.BassamRound.lensFilter(e));
            } catch (t) {}
            const n = { ...(this.state.planMonths || {}) };
            n[s] = {
              ...(n[s] && !Array.isArray(n[s]) ? n[s] : {}),
              c: 1,
              d: e,
            };
            const DM = { ...(this.state.delMonths || {}) },
              TB2 = !!DM[s];
            delete DM[s];
            const BL9 = "new" === t.mode && "blank" === t.kind;
            const a = BL9
                ? []
                : this._withMonth(
                    TB2
                      ? (this.state.floors || []).map((f) =>
                          f && !f.create ? { ...f, iid: null, img: null, imgW: 0, imgH: 0, mpu: null } : f,
                        )
                      : this.state.floors,
                    n,
                    s,
                  ),
              i = a[this.state.floor] || {};
            this.setState(
              {
                planMonths: n,
                delMonths: DM,
                floors: a,
                floor: BL9 ? 0 : this.state.floor,
                zones: i.zones || [],
                gates: i.gates || [],
                marks: i.marks || [],
                paths: i.paths || [],
                sel: null,
                selMulti: [],
                planAdd: null,
                tool: "select",
              },
              () => {
                (this.savePlan(),
                  this._loadFloorImages(),
                  (TB2 || BL9) && this._opGc());
              },
            );
          },
        };
      })(),
      ...(() => {
        const t = e.planMonths || {},
          s = this._mKey(e.year, e.month),
          n = (e.floors || []).every((t, s) => {
            const n = s === e.floor ? e.zones : t.zones || [],
              a = s === e.floor ? e.gates : t.gates || [];
            return !((n && n.length) || (a && a.length));
          });
        let a = null,
          i = e.year,
          r = e.month;
        if (n)
          for (let e = 0; e < 24 && !a; e++) {
            (r--, r < 1 && ((r = 12), i--));
            const e = this._mData(t, this._mKey(i, r));
            e && e.some((t) => (t.zones && t.zones.length) || (t.gates && t.gates.length)) && (a = { y: i, m: r, d: e });
          }
        return {
          pullOn: !1,
          pullLabel: a ? "سحب بيانات " + this.MONTHS[a.m - 1] + " " + a.y : "",
          pullDo: () => {
            if (!a) return;
            const t = JSON.parse(JSON.stringify(a.d)).map((t) => ({
                zones: t.zones || [],
                gates: t.gates || [],
                marks: t.marks || [],
                paths: t.paths || [],
                approved: !1,
              })),
              e = { ...(this.state.planMonths || {}) };
            e[s] = { ...(e[s] && !Array.isArray(e[s]) ? e[s] : {}), c: 1, d: t };
            const n = this._withMonth(this.state.floors, e, s),
              i = n[this.state.floor] || {};
            this.setState(
              {
                planMonths: e,
                floors: n,
                zones: i.zones || [],
                gates: i.gates || [],
                marks: i.marks || [],
                paths: i.paths || [],
                sel: null,
                selMulti: [],
              },
              () => this.savePlan(),
            );
          },
        };
      })(),
      ...(() => {
        const t = e.retroAsk;
        if (!t) return { retroOn: !1 };
        const s = this.MONTHS[t.m - 1] || "";
        return {
          retroOn: !0,
          retroOpening: !!t.open,
          retroTitle: t.open ? "فتح شهر " + s + " " + t.y + " هـ بأثر رجعي" : "إعادة قفل شهر " + s + " " + t.y + " هـ",
          retroMsg: t.open
            ? "هذا الشهر انقضى وأُقفل تلقائياً. فتحه يتيح لك إضافة خطته أو تعديلها بأثر رجعي."
            : "سيعود الشهر إلى حالته المقفلة بانقضائه، ولن يمكن تعديل خطته حتى تفتحه من جديد.",
          retroB1: t.open ? "ما تضيفه سيُسجَّل ضمن هذا الشهر المنقضي" : "ما أضفته يبقى محفوظاً كما هو",
          retroB2: t.open ? "يبقى مفتوحاً حتى تعيد قفله" : "يمكنك فتحه مجدداً في أي وقت بنقرة مزدوجة",
          retroB3: t.open
            ? "يمكنك إعادة قفله في أي وقت بنقرة مزدوجة على كرته"
            : "القفل التلقائي للشهر المنقضي يكفي — ويمكنك فتحه للاستدراك متى شئت",
          retroBtn: t.open ? "فتح بأثر رجعي" : "إعادة القفل",
          retroBtnStyle:
            "height:38px;padding:0 20px;border-radius:10px;font-size:13px;font-weight:400;border:0;cursor:pointer;color:var(--fg-xffffff);font-family:'Cairo',sans-serif;background:" +
            (t.open ? "var(--bg-xb45309)" : "var(--bg-x64748b)"),
          retroDo: () => {
            this.PC("approve") ? (this._setMonthOpen(t.y, t.m, !!t.open), this.setState({ retroAsk: null })) : this.permDeny();
          },
          retroCancel: () => this.setState({ retroAsk: null }),
          retroStop: (t) => t.stopPropagation(),
        };
      })(),
      ...(() => {
        const t = e.planLock,
          s = (t && this.MONTHS[t.m - 1]) || "";
        return {
          planLockOn: !!t,
          plTitle: t && t.approved ? "فتح الشهر للتعديل" : "قفل شهر التشغيل الميداني",
          plMsg: t
            ? t.approved
              ? "سيتم فتح شهر " + s + " " + t.y + " هـ وفكّ قفله ليصبح متاحاً للتعديل في جميع المواقع."
              : "سيتم قفل تشغيل شهر " +
                s +
                " " +
                t.y +
                " هـ — تصبح جميع المواقع للعرض فقط دون أي تعديل. القفل حماية من التعديل العرضي فقط، ولا يتوقف عليه سحب التقارير اليومية ولا الجولات."
            : "",
          plNote: t && t.approved ? "يمكنك قفله لاحقاً بنقرة مزدوجة على كرت الشهر." : "يمكنك فتحها لاحقاً بنقرة مزدوجة على كرت الشهر.",
          plNoteColor: t && t.approved ? "#b45309" : "#047857",
          plIconBox:
            "width:56px;height:56px;border-radius:16px;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;" +
            (t && t.approved
              ? "background:var(--bg-a245158110p1);border:1px solid var(--bd-a245158110p3);color:var(--fg-xb45309)"
              : "background:var(--bg-a0132800p08);border:1px solid var(--bd-a0132800p25);color:var(--fg-x008450)"),
          plIconPath: t && t.approved ? "M7 11V7a5 5 0 0 1 9.9-1" : "M7 11V7a5 5 0 0 1 10 0v4",
          plDoLabel: t && t.approved ? "فتح للتعديل" : "قفل الشهر",
          plDoStyle:
            "height:38px;padding:0 20px;border-radius:10px;font-size:13px;font-weight:400;color:var(--fg-xffffff);border:0;cursor:pointer;font-family:'Cairo',sans-serif;background:" +
            (t && t.approved ? "var(--bg-xb45309)" : "var(--bg-x008450)"),
          plCancel: () => this.setState({ planLock: null }),
          plDo: () => {
            if (!this.PC("approve")) return (this.permDeny(), void this.setState({ planLock: null }));
            const t = this.state.planLock;
            if (!t) return;
            const e = this._mKey(t.y, t.m),
              s = { ...(this.state.planMonths || {}) },
              n = { c: 1, d: (this._mData(s, e) || []).map((e) => ({ ...e, approved: !t.approved })) };
            (t.approved && this.monthPast(t.y, t.m) && (n.mo = 1), (s[e] = n));
            const a = { planMonths: s, planLock: null };
            (t.y === this.state.year &&
              t.m === this.state.month &&
              ((a.floors = this.state.floors.map((e) => ({ ...e, approved: !t.approved }))), (a.sel = null), (a.tool = "select")),
              this.setState(a, () => this.savePlan()));
          },
        };
      })(),
      ...(() => {
        const t = e.planDelMonth;
        return {
          planDelOn: !!t,
          planDelMsg: t
            ? "سيتم حذف خطة شهر " +
              (this.MONTHS[t.m - 1] || "") +
              " " +
              t.y +
              " هـ بالكامل: خريطة كل موقع (صورته) والمصليات والأبواب والمعالم والمسارات والنطاقات والتسكين والكثافات، وجولات المتابعة اليومية لهذا الشهر — تبقى أسماء المواقع وأرقامها فقط. لا يمكن التراجع."
            : "",
          planDelCancel: () => this.setState({ planDelMonth: null }),
          planDelDo: () => {
            const _opRelated = {};

            const t = this.state.planDelMonth;
            if (!t) return;
            const e = this._mKey(t.y, t.m),
              s = { ...(this.state.planMonths || {}) };
            /* صورُ الشهر المحذوف — ثم ما بقي مملوكاً لشهرٍ آخر */ const DI =
              {};
            (this._mData(s, e) || []).forEach((f) => {
              f && f.iid && (DI[f.iid] = 1);
            });
            delete s[e];
            const ST = {};
            Object.keys(s).forEach((k) => {
              (this._mData(s, k) || []).forEach((f) => {
                f && f.iid && (ST[f.iid] = 1);
              });
            });
            const dm = { ...(this.state.delMonths || {}) };
            dm[e] = Date.now();
            const n = { planMonths: s, planDelMonth: null, delMonths: dm };
            const ID = (f) => ({
              sid: f.sid,
              name: f.name,
              num: f.num,
              create: !!f.create,
              showCodes: f.showCodes,
              zones: [],
              gates: [],
              marks: [],
              paths: [],
              sectors: [],
              hideSectors: !1,
              approved: !!f.approved,
              chip: "",
              chipTone: f.create ? f.chipTone : "warn",
              iid: null,
              img: null,
              imgW: 0,
              imgH: 0,
              mpu: null,
            });
            if (t.y === this.state.year && t.m === this.state.month) {
              /* الشهرُ المعروض: المواقعُ الحيّة تعود إلى هويّتها فقط */ ((n.floors = (this.state.floors || []).map(ID)),
                (n.zones = []),
                (n.gates = []),
                (n.marks = []),
                (n.paths = []),
                (n.sel = null),
                (n.selMulti = []),
                (n.draft = null),
                (n.polyPts = []),
                (n.tool = "select"));
            } else
              n.floors = (this.state.floors || []).map((f) =>
                f && f.iid && DI[f.iid] && !ST[f.iid] ? { ...f, iid: null, img: null, imgW: 0, imgH: 0, mpu: null } : f,
              );
            try {
              const e = this._opRead("bassam_rounds_v1");
              if (e && "object" == typeof e) {
                const s = t.y + "-" + t.m + "-";
                let n = !1;
                (Object.keys(e).forEach((a) => {
                  (0 !== a.indexOf(s) && a !== "m:" + t.y + "-" + t.m) || (delete e[a], (n = !0));
                }),
                  n && (_opRelated.bassam_rounds_v1 = e));
              }
            } catch (t) {}
            this.setState(n, () => {
              (this.savePlan(_opRelated),
                this._loadFloorImages(),
                this._opGc());
            });
          },
        };
      })(),
      ...(() => {
        const t = void 0 === e.panelOpen ? "undefined" != typeof window && window.innerWidth > 980 : !!e.panelOpen,
          s = "dist" === e.lens && this.bsLensOn("dist"),
          i = "density" === e.lens && this.bsLensOn("dens");
        this.bsLensOn("zones") ||
          ("plan" !== e.lens && "paths" !== e.lens) ||
          this.__zfix ||
          ((this.__zfix = 1),
          setTimeout(() => {
            if (((this.__zfix = 0), this.bsLensOn("zones") || ("plan" !== this.state.lens && "paths" !== this.state.lens))) return;
            const t = this.bsLensOn("gates")
              ? { lens: "gates", panelTab: "gates" }
              : this.bsLensOn("marks")
                ? { lens: "marks", panelTab: "marks" }
                : this.bsLensOn("dens")
                  ? { lens: "density", panelTab: "dens" }
                  : null;
            t && this.setState({ tool: "select", sel: null, selMulti: [], draft: null, polyPts: [], polyCursor: null, ...t });
          }, 0));
        const r = e.zones || [],
          l = e.gates || [],
          o = e.marks || [],
          h = e.paths || [],
          p = "gates" === e.lens && e.gAsn ? [] : r,
          c = "gates" === e.lens && e.gAsn ? [] : o,
          u = p.concat(l),
          m = new Set(
            v.reduce(
              (t, e) =>
                t.concat(
                  (KIVO.BassamEmp ? KIVO.BassamEmp.tokens(e) : [e && e.eid, e && e.nid, e && e.name]).filter(Boolean).map(String),
                ),
              [],
            ),
          ),
          x = {};
        u.forEach((t) =>
          (t.emp || []).forEach((t) => {
            x[t] = 1;
          }),
        );
        const k = Object.keys(x),
          S = k.filter((t) => m.has(t)).length,
          w = k.length - S,
          z = u.filter((t) => (t.emp || []).length).length,
          O = (u.length && Math.round((z / u.length) * 100), v.length),
          C = (Math.max(f.length - O, 0), r.filter((t) => null != N(t)));
        (C.reduce((t, e) => t + N(e), 0), C.reduce((t, e) => t + (L(e) || 0), 0), C.length && C.reduce((t, e) => (N(e) > N(t) ? e : t)));
        let P = [];
        const T = [
            ["men", "مصليات الرجال", "#22c55e"],
            ["women", "مصليات النساء", "#93c5fd"],
            ["service", "خدمات", "#374151"],
          ],
          D = r.filter((t) => !T.some((e) => e[0] === t.cat)).length;
        let B = T.map((t) => ({
          label: t[1],
          color: t[2],
          n: r.filter((e) => e.cat === t[0]).length,
        }));
        (D && B.push({ label: "أخرى", color: "#b99751", n: D }),
          (B = B.filter((t) => t.n > 0)));
        const W = B.reduce((t, e) => t + e.n, 0),
          I = B.map((t) => (W ? (t.n / W) * 100 : 0)),
          G = I.map((t) => Math.floor(t));
        let Z = (W ? 100 : 0) - G.reduce((t, e) => t + e, 0);
        (I.map((t, e) => ({ i: e, f: t - Math.floor(t) }))
          .sort((t, e) => e.f - t.f)
          .forEach((t) => {
            Z > 0 && (G[t.i]++, Z--);
          }),
          (B = B.map((t, e) => ({ label: t.label, color: t.color, count: String(t.n), pct: String(G[e]), pillBorder: t.color + "30" }))),
          B.length && B.reduce((t, e) => (+e.count > +t.count ? e : t), B[0]));
        const Y = s
            ? "dist"
            : i
              ? "dens"
              : ("paths" !== e.panelTab && "gates" !== e.panelTab && "marks" !== e.panelTab) || !this.bsLensOn(e.panelTab)
                ? this.bsLensOn("zones")
                  ? "zones"
                  : this.bsLensOn("gates")
                    ? "gates"
                    : this.bsLensOn("paths")
                      ? "paths"
                      : this.bsLensOn("marks")
                        ? "marks"
                        : "zones"
                : e.panelTab,
          H = i
            ? 0 === r.length
            : "gates" === Y
              ? 0 === l.length
              : "marks" === Y
                ? 0 === o.length
                : "paths" === Y
                  ? 0 === h.length
                  : 0 === u.length,
          X = new Set();
        r.forEach((t) => {
          const e = String(t.zcat || "").trim();
          e && X.add(e);
        });
        r.filter((t) => !t.off).length;
        const K = (r.length, []),
          U = [
            {
              f: "region",
              title: "بحسب المنطقة",
              p1: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",
              p2: "M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
            },
            { f: "yard", title: "بحسب الساحة", p1: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z", p2: "" },
            {
              f: "ztype",
              title: "بحسب النوع",
              p1: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
              p2: "m3.3 7 8.7 5 8.7-5",
            },
            {
              f: "zcat",
              title: "بحسب الفئة",
              p1: "M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",
              p2: "M7.5 7.5h.01",
            },
            {
              f: "level",
              title: "بحسب الدور / المستوى",
              p1: "m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z",
              p2: "m2.6 12.08 8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9M2.6 17.08l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9",
            },
            { f: "zstate", title: "بحسب الحالة", p1: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0", p2: "m9 12 2 2 4-4" },
            { f: "ztypecat", title: "بحسب النوع والفئة", p1: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z", p2: "" },
          ],
          J = (t, e, s) => {
            const n = React.createElement,
              a = "bsBrkP" + e,
              i = this.zcatStyleOf(t, s);
            if (!i)
              return n(
                "svg",
                { key: "bk" + a, width: 17, height: 11, viewBox: "0 0 17 11", style: { flexShrink: 0, overflow: "visible" } },
                n("rect", {
                  x: 0.9,
                  y: 0.9,
                  width: 15.2,
                  height: 9.2,
                  rx: 2.8,
                  fill: "#f8fafc",
                  stroke: "#cbd5e1",
                  strokeWidth: 0.8,
                  strokeDasharray: "2.36 1.71",
                  strokeLinejoin: "round",
                }),
              );
            const r = !(!i.h || "none" === i.h),
              l = i.bs || "dash",
              o = 0.65,
              d = 27 + 2 * Math.PI * 2.8;
            let h = "none";
            if ("dot" === l) {
              const t = d / Math.max(5, Math.round(d / 4.5));
              h = (1.15 * o).toFixed(2) + " " + (t - 1.15 * o).toFixed(2);
            } else if ("solid" !== l) {
              const t = d / Math.max(4, Math.round(d / 7.4));
              h = (0.66 * t).toFixed(2) + " " + (0.34 * t).toFixed(2);
            }
            return n(
              "svg",
              { key: "bs" + a, width: 17, height: 11, viewBox: "0 0 17 11", style: { flexShrink: 0, overflow: "visible" } },
              r ? this._mkHatchPattern(a, i, "bp") : null,
              n("rect", {
                x: 0.825,
                y: 0.825,
                width: 15.35,
                height: 9.35,
                rx: 2.8,
                fill: r ? "url(#" + a + ")" : i.f,
                fillOpacity: (null != i.o ? i.o : 50) / 100,
                stroke: i.s,
                strokeWidth: o,
                strokeDasharray: h,
                strokeLinecap: "dot" === l ? "round" : "butt",
                strokeLinejoin: "round",
              }),
            );
          },
          Q = r.length,
          et =
            "zones" !== Y || H || !Q
              ? []
              : U.map((t, e) => {
                  const s = {},
                    n = {},
                    a = [],
                    i = {};
                  r.forEach((e) => {
                    const r =
                      "zstate" === t.f
                        ? e.off
                          ? "معطّلة"
                          : "مفعّلة"
                        : "ztypecat" === t.f
                          ? (String(e.ztype || "").trim() || "بلا نوع") + " · " + (String(e.zcat || "").trim() || "بلا فئة")
                          : "yard" === t.f
                            ? String(e.yard || "").trim() || "بلا ساحة"
                            : String(null == e[t.f] ? "" : e[t.f]).trim() || "غير محدّد";
                    if ((null == s[r] && ((s[r] = 0), (n[r] = 0), a.push(r)), "zcat" === t.f)) {
                      const t = String(e.ztype || "").trim();
                      void 0 === i[r] ? (i[r] = t) : i[r] !== t && (i[r] = null);
                    }
                    (s[r]++, e.off || n[r]++);
                  });
                  const l = a
                    .map((t) => ({ label: t, n: s[t], on: n[t], zt: i[t] }))
                    .sort((t, e) => e.n - t.n || t.label.localeCompare(e.label, "ar"));
                  return { key: t.f, items: l };
                }),
          rt = [["summary", "مؤشرات المصليات"]]
            .concat(this.bsLensOn("paths") ? [["paths", "مؤشرات المسارات"]] : [])
            .concat(this.bsLensOn("dist") ? [["dsum", "مؤشرات التوزيع"]] : [])
            .concat(this.bsLensOn("dens") ? [["dens", "مؤشرات الكثافة"]] : []),
          lt = rt.some((t) => t[0] === e.brkDim) ? e.brkDim : "region",
          ot = et.find((t) => t.key === lt),
          dt = ot ? ot.items : [],
          ht = dt.reduce((t, e) => t + e.n, 0),
          pt = (t, e) => {
            if ("zcat" === lt && t.zt) {
              const e = this.zcatStyleOf(t.label, t.zt);
              if (e && e.f) return e.f;
            }
            if ("ztypecat" === lt) {
              const e = String(t.label || "").split(" · "),
                s = this.zcatStyleOf(e[1] || "", e[0] || "");
              if (s && s.f) return s.f;
            }
            if ("yard" === lt) {
              return this.gateLocColor(t.label) || "#cbd5e1";
            }
            return "zstate" === lt
              ? "معطّلة" === t.label
                ? "#94a3b8"
                : "#16a34a"
              : "rgba(185,151,81," +
                  ((t) => {
                    const e = dt.length;
                    return e <= 1 ? "0.85" : (0.92 - (t / (e - 1)) * 0.62).toFixed(3);
                  })(e) +
                  ")";
          },
          ct = (t) =>
            "zstate" === lt ||
            ("zcat" === lt && !!t.zt && !!(this.zcatStyleOf(t.label, t.zt) || {}).f) ||
            ("ztypecat" === lt &&
              !!(this.zcatStyleOf(String(t.label || "").split(" · ")[1] || "", String(t.label || "").split(" · ")[0] || "") || {}).f),
          gt = rt.map((t) => ({
            label: t[1],
            icA: KIVO.BassamMix.dimIcon(t[0]).a,
            icB: KIVO.BassamMix.dimIcon(t[0]).b,
            click: () =>
              "paths" === t[0]
                ? this.setState({
                    panelTab: "paths",
                    lens: "plan",
                    pathDim: "summary",
                    sel: null,
                    selMulti: [],
                    hoverZone: null,
                    hoverGate: null,
                    hoverPath: null,
                  })
                : "dens" === t[0]
                  ? this.setState({
                      lens: "density",
                      panelTab: "dens",
                      densDim: "summary",
                      tool: "select",
                      sel: null,
                      selMulti: [],
                      hoverZone: null,
                      hoverGate: null,
                      draft: null,
                      polyPts: [],
                      polyCursor: null,
                      calMode: null,
                      calAsk: null,
                    })
                  : this.setState(
                      Object.assign(
                        { brkDim: t[0], lens: "plan", panelTab: "zones", asnFly: null },
                        ("plan" !== e.lens && "density" !== e.lens) || !this.bsLensOn("dist")
                          ? {}
                          : { zAsn: "dsum" === t[0], tool: "select", sel: null, selMulti: [], draft: null, polyPts: [], polyCursor: null },
                      ),
                    ),
            on: KIVO.__bsMixOn(t[0], e),
            style: KIVO.BassamMix.tabStyle(KIVO.__bsMixOn(t[0], e), rt.length),
          })),
          ft = KIVO.BassamMix.marks(dt),
          ut = (t) =>
            React.createElement(
              "svg",
              { key: "cs" + String(t), width: 17, height: 11, viewBox: "0 0 17 11", style: { flexShrink: 0, overflow: "visible" } },
              React.createElement("rect", {
                x: 0.825,
                y: 0.825,
                width: 15.35,
                height: 9.35,
                rx: 2.8,
                fill: t,
                stroke: t,
                strokeWidth: 0.65,
                strokeLinejoin: "round",
              }),
            ),
          bt = (t, e) => {
            const s = pt(t, e);
            return React.createElement(
              "svg",
              { key: "dm" + String(s), width: 17, height: 11, viewBox: "0 0 17 11", style: { flexShrink: 0, overflow: "visible" } },
              React.createElement("rect", {
                x: 0.825,
                y: 0.825,
                width: 15.35,
                height: 9.35,
                rx: 2.8,
                fill: s,
                stroke: s,
                strokeWidth: 0.65,
                strokeLinejoin: "round",
              }),
            );
          },
          At = (t) => {
            const e = "معطّلة" !== t,
              s = e ? "#16a34a" : "#94a3b8";
            return React.createElement(
              "svg",
              { key: "st" + t, width: 17, height: 11, viewBox: "0 0 17 11", style: { flexShrink: 0, overflow: "visible" } },
              React.createElement("rect", {
                x: 0.825,
                y: 0.825,
                width: 15.35,
                height: 9.35,
                rx: 2.8,
                fill: s,
                fillOpacity: e ? 0.5 : 0.28,
                stroke: s,
                strokeWidth: 0.65,
                strokeLinejoin: "round",
              }),
            );
          },
          St = dt.map((t, e) => {
            const s = ht ? Math.max(1, Math.round((t.n / ht) * 100)) : 0,
              n = ht ? (t.n / ht) * 100 : 0,
              a = s,
              i = 0 === e,
              r = null == t.on ? t.n : t.on,
              l = t.n - r,
              o = t.n ? Math.round((r / t.n) * 100) : 0,
              d = t.n ? (r / t.n) * 100 : 0;
            return {
              label: t.label,
              count: String(t.n),
              pct: String(s),
              pctAll: KIVO.bsPct(n) + "٪",
              subPct: "font-size:8px;font-weight:400;opacity:.62;margin-right:2px;letter-spacing:0",
              hasSplit: null != t.on && "zstate" !== lt,
              onCount: String(r),
              offCount: String(l),
              onPct: KIVO.bsPct(d) + "٪",
              offPct: KIVO.bsPct(100 - d) + "٪",
              tip:
                t.label +
                " — " +
                KIVO.BassamCount(t.n, "مصلى") +
                " (" +
                s +
                "٪ من الكل) · مفعّلة " +
                r +
                " (" +
                o +
                "٪) · معطّلة " +
                l +
                " (" +
                (100 - o) +
                "٪)",
              markOn: !!KIVO.BassamMix.markOf(ft, e),
              mark: (KIVO.BassamMix.markOf(ft, e) || {}).ch,
              markTitle: (KIVO.BassamMix.markOf(ft, e) || {}).title,
              markStyle: KIVO.BassamMix.markStyle,
              hasSwatch: !0,
              swatch:
                "zcat" === lt
                  ? t.zt
                    ? J(t.label, "mx" + String(t.label).replace(/[^A-Za-z0-9]/g, "") + e, t.zt)
                    : bt(t, e)
                  : "ztypecat" === lt
                    ? J(
                        String(t.label || "").split(" · ")[1] || "",
                        "mt" + String(t.label).replace(/[^A-Za-z0-9]/g, "") + e,
                        String(t.label || "").split(" · ")[0] || "",
                      )
                    : "zstate" === lt
                      ? At(t.label)
                      : bt(t, e),
              ...KIVO.BassamMix.rowStyles({
                pc: a,
                lead: i,
                wide: "ztypecat" === lt,
                color: pt(t, e),
                track: ct(t) ? pt(t, e) + "1f" : "rgba(185,151,81,0.12)",
                num: ct(t) ? pt(t, e) : "#9A7E40",
                numWidth: 24,
              }),
            };
          }),
          wt = ["summary", "الملخص"],
          zt = [
            ["ztypecat", "النوع والفئة"],
            ["sector", "النطاق"],
            ["region", "المنطقة"],
            ["yard", "الساحة"],
            ["level", "الدور / المستوى"],
            ["ztype", "النوع"],
            ["zcat", "الفئة"],
          ],
          Et = zt.some((t) => t[0] === e.densDim) ? e.densDim : "region",
          Mt = "summary" === e.densDim ? "summary" : Et,
          Ot = "ready" !== Et,
          Ct = (t) => {
            const e = {},
              s = [],
              n = {},
              a = (t, a, i) => {
                a > 0 && (null == e[t] && ((e[t] = 0), s.push(t), (n[t] = i)), (e[t] += a));
              };
            "ready" === t
              ? r.forEach((t) => a(null != N(t) ? "لها سعة" : "تنقصها المساحة", 1, null != N(t) ? "#10b981" : "#e5b563"))
              : r.forEach((e) => {
                  const s = N(e);
                  if (null == s) return;
                  const so = "sector" === t ? this._secOf(e, "zone") : null,
                    n =
                      "sector" === t
                        ? so.sec
                          ? this._secLabel(so.sec)
                          : so.amb
                            ? "على حدّ نطاقين"
                            : "خارج النطاقات"
                        : "ztypecat" === t
                          ? (String(e.ztype || "").trim() || "بلا نوع") + " · " + (String(e.zcat || "").trim() || "بلا فئة")
                          : String(null == e[t] ? "" : e[t]).trim() ||
                            ("zcat" === t ? "بلا فئة" : "ztype" === t ? "بلا نوع" : "yard" === t ? "بلا ساحة" : "غير محدّد"),
                    i =
                      "sector" === t
                        ? so.sec
                          ? { f: so.sec.color || "#b99751" }
                          : { f: "#94a3b8" }
                        : "zcat" === t
                          ? this.zcatStyleOf(n, String(e.ztype || "").trim())
                          : null;
                  a(n, s, (i && i.f) || null);
                });
            const i = s.map((t) => ({ label: t, n: e[t], color: n[t] })).sort((t, e) => e.n - t.n || t.label.localeCompare(e.label, "ar")),
              l = i.length ? i[0].n : 0;
            return i.map((t) => ({ ...t, color: t.color || "rgba(185,151,81," + (0.3 + 0.6 * (l ? t.n / l : 0)).toFixed(2) + ")" }));
          },
          Pt = Ct(Et),
          Tt = Pt.reduce((t, e) => t + e.n, 0),
          Ft = Ot ? "مصلٍّ" : "مصلى",
          Lt = [wt].concat(zt),
          Dt =
            (Lt.map((t) => ({
              label: t[1],
              icA: KIVO.BassamMix.dimIcon(t[0]).a,
              icB: KIVO.BassamMix.dimIcon(t[0]).b,
              click: () => this.setState({ densDim: t[0] }),
              on: t[0] === Mt,
              style: KIVO.BassamMix.tabStyle(t[0] === Mt, Lt.length),
            })),
            KIVO.BassamMix.marks(Pt)),
          Nt = Pt.map((t, e) => {
            const s = Tt ? Math.max(1, Math.round((t.n / Tt) * 100)) : 0,
              n = Tt ? (t.n / Tt) * 100 : 0,
              a = 0 === e;
            return {
              label: t.label,
              count: j(t.n),
              pct: String(s),
              pctAll: KIVO.bsPct(n) + "٪",
              subPct: "font-size:8px;font-weight:400;opacity:.62;margin-right:2px;letter-spacing:0",
              tip: t.label + " — " + KIVO.BassamCount(j(t.n), KIVO.BassamCount.key(Ft) || Ft) + " (" + s + "٪)",
              markOn: !!KIVO.BassamMix.markOf(Dt, e),
              mark: (KIVO.BassamMix.markOf(Dt, e) || {}).ch,
              markTitle: (KIVO.BassamMix.markOf(Dt, e) || {}).title,
              markStyle: KIVO.BassamMix.markStyle,
              hasSwatch: !0,
              swatch: ut(t.color),
              ...KIVO.BassamMix.rowStyles({
                pc: s,
                lead: a,
                color: t.color,
                track: "rgba(185,151,81,0.12)",
                num: "#9A7E40",
                numWidth: 34,
              }),
            };
          }),
          Bt = KIVO.BassamMix.donutCss(Pt, Tt),
          Rt = i,
          Gt = [
            ["shift", "الوردية"],
            ["place", "الموقع"],
            ["sector", "النطاق"],
            ["state", "الحالة"],
            ["cat", "التصنيف"],
          ],
          Zt = Gt.some((t) => t[0] === e.distDim) ? e.distDim : "shift",
          Yt = "summary" === e.distDim ? "summary" : Zt,
          Ht = (t) => !!x[t],
          Xt = p
            .filter((t) => !t.off && KIVO.BassamNeed.has(t, y))
            .concat(l.filter((t) => !t.closed && KIVO.BassamNeed.has(t, y)))
            .concat(c.filter((t) => !t.off && KIVO.BassamNeed.has(t, y))),
          Kt = Xt.reduce((t, e) => t + KIVO.BassamNeed.tot(e, y), 0),
          Ut = Kt,
          Jt = y.map((t) => {
            let e = 0;
            Xt.forEach((s) =>
              (s.emp || []).forEach((s) => {
                A[s] === t.name && e++;
              }),
            );
            const s = ((n = t.name), Xt.reduce((t, e) => t + KIVO.BassamNeed.of(e, n), 0));
            var n;
            const a = s ? Math.round((100 * e) / s) : 0;
            return {
              name: t.name,
              color: t.color,
              counts: e + "/" + s,
              pct: String(a),
              bar: "height:100%;border-radius:9999px;background:" + t.color + ";width:" + Math.min(100, a) + "%",
              pctColor: a >= 100 ? "#008450" : a >= 60 ? "#b45309" : "#dc2626",
              tip:
                t.name +
                ": " +
                KIVO.BassamCount(e, ["مسكَّن واحد", "مسكَّنان", "مسكَّنَين", "مسكَّنين", "مسكَّناً", "مسكَّن"]) +
                " من احتياج " +
                s +
                " (" +
                a +
                "٪)",
            };
          }),
          Qt = Xt.reduce((t, e) => t + (e.emp || []).filter((t) => A[t]).length, 0),
          Vt = Kt ? Math.round((100 * Qt) / Kt) : 0,
          _t = Kt ? (100 * Qt) / Kt : 0,
          $t = Wt || jt || It,
          te = $t && !$t.off && !$t.closed && KIVO.BassamNeed.has($t, y) ? KIVO.BassamNeed.tot($t, y) : 0,
          ee =
            ("dist" === e.lens || ("gates" === e.lens && e.gAsn) || ("plan" === e.lens && e.zAsn) || ("marks" === e.lens && e.mAsn)) &&
            !!$t &&
            te > 0;
        let se = 0,
          ae = 0;
        if (ee) {
          const t = ($t.emp || []).filter((t) => A[t]);
          null != ne ? ((se = KIVO.BassamNeed.of($t, ne)), (ae = t.filter((t) => A[t] === ne).length)) : ((se = te), (ae = t.length));
        }
        const ie = Math.max(0, se - ae),
          re = Math.max(0, ae - se),
          le = (t) => {
            const e = (t, e, s) => {
                const n = t.find((t) => t.label === e);
                n ? n.n++ : t.push({ label: e, n: 1, color: s });
              },
              s = [];
            if ("shift" === t)
              v.forEach((t) => {
                if (Ht(t.name)) {
                  const n = A[t.name] || "بلا وردية",
                    a = y.find((t) => t.name === n);
                  e(s, n, a ? a.color : "#94a3b8");
                } else e(s, "بلا تسكين", "#94a3b8");
              });
            else if ("place" === t)
              (r.forEach((t) => (t.emp || []).forEach(() => e(s, "على المصليات", "#10b981"))),
                l.forEach((t) => (t.emp || []).forEach(() => e(s, "على الأبواب", "#1E458A"))));
            else if ("sector" === t) {
              const n = this._secs();
              ([
                ["zone", r],
                ["gate", l],
                ["mark", this.state.marks || []],
              ].forEach(([t, a]) =>
                (a || []).forEach((a) => {
                  if (!a || ("gate" === t && a.pOf)) return;
                  const i = this._secOf(a, t, n);
                  (a.emp || []).forEach(() =>
                    e(
                      s,
                      i.sec ? this._secLabel(i.sec) : i.amb ? "على حدّ نطاقين" : "خارج النطاقات",
                      i.sec ? i.sec.color || "#b99751" : "#94a3b8",
                    ),
                  );
                }),
              ),
                n.forEach((t) => (t.emp || []).forEach(() => e(s, this._secLabel(t) + " (على النطاق)", t.color || "#b99751"))));
            } else if ("state" === t)
              f.forEach((t) => {
                m.has(t.name)
                  ? E[t.name]
                    ? e(s, "في راحة", "#b25c8a")
                    : Ht(t.name)
                      ? e(s, "مسكَّن", "#10b981")
                      : e(s, "غير مسكَّن", "#e5b563")
                  : e(s, "بدون وردية", "#94a3b8");
              });
            else {
              const t = { men: "مصليات الرجال", women: "مصليات النساء", service: "خدمات" };
              (r.forEach((n) => (n.emp || []).forEach(() => e(s, t[n.cat] || "مصلى", g[n.cat] || "#b99751"))),
                l.forEach((t) => (t.emp || []).forEach(() => e(s, "أبواب", "#1E458A"))));
            }
            return s.sort((t, e) => e.n - t.n || t.label.localeCompare(e.label, "ar"));
          },
          oe = le(Zt),
          de = oe.reduce((t, e) => t + e.n, 0),
          he = "shift" === Zt || "state" === Zt ? "موظف" : "تسكين",
          pe = [wt].concat(Gt),
          ce = pe.map((t) => ({
            label: t[1],
            icA: KIVO.BassamMix.dimIcon(t[0]).a,
            icB: KIVO.BassamMix.dimIcon(t[0]).b,
            click: () => this.setState({ distDim: t[0] }),
            on: t[0] === Yt,
            style: KIVO.BassamMix.tabStyle(t[0] === Yt, pe.length),
          })),
          ge = KIVO.BassamMix.marks(oe),
          fe = {};
        v.forEach((t) => {
          const e = A[t.name];
          e && (fe[e] = (fe[e] || 0) + 1);
        });
        const ue = oe.map((t, e) => {
          const s = ("shift" === Zt && -1 !== b.indexOf(t.label) && fe[t.label]) || 0,
            n = de ? Math.max(1, Math.round((t.n / de) * 100)) : 0,
            a = (de && t.n, s ? Math.round((100 * t.n) / s) : 0),
            i = s ? (100 * t.n) / s : 0,
            r = s ? Math.min(100, a) : n,
            l = 0 === e;
          return {
            label: t.label,
            count: s ? t.n + "/" + s : String(t.n),
            pct: String(s ? a : n),
            pctAll: "",
            subPct: "font-size:8px;font-weight:400;opacity:.62;margin-right:2px;letter-spacing:0",
            pctOn: !!s,
            pctTxt: KIVO.bsPct(i) + "٪",
            pctStyle:
              "flex-shrink:0;font-size:8.5px;font-weight:700;font-feature-settings:'tnum';color:" +
              (a >= 100 ? "var(--fg-x008450)" : a >= 60 ? "var(--fg-xb45309)" : "var(--fg-xdc2626)"),
            tip: s
              ? t.label +
                ": سُكّن " +
                t.n +
                " من " +
                KIVO.BassamCount(s, "موظف", "g") +
                " (" +
                a +
                "٪ من موظفي الوردية — لا من احتياجها؛ تغطية الاحتياج في بُعد «الموقع»)"
              : t.label + " — " + t.n + " من " + de + " " + he + " (" + n + "٪)",
            markOn: !!KIVO.BassamMix.markOf(ge, e),
            mark: (KIVO.BassamMix.markOf(ge, e) || {}).ch,
            markTitle: (KIVO.BassamMix.markOf(ge, e) || {}).title,
            markStyle: KIVO.BassamMix.markStyle,
            hasSwatch: !0,
            swatch: ut(t.color),
            ...KIVO.BassamMix.rowStyles({ pc: r, lead: l, color: t.color, track: t.color + "1f", num: t.color, numWidth: 24 }),
          };
        });
        if ("place" === Zt && Ut > 0) {
          const t = Vt >= 100 ? "#008450" : Vt >= 60 ? "#9A7E40" : "#dc2626",
            e = Xt.filter(
              (t) =>
                !!(t.emp || []).filter((t) => E[t]).length &&
                (t.emp || []).filter((t) => A[t] && !E[t]).length < KIVO.BassamNeed.tot(t, y),
            );
          (e.length &&
            ue.unshift({
              label: "تحتاج تغطية بديلة اليوم",
              count: String(e.length),
              pct: "",
              pctAll: "",
              tip:
                "عناصر فيها موظفون في راحة اليوم وتغطيتها الفعلية دون الاحتياج: " +
                e.map((t) => (t.code ? "#" + t.code : t.num ? "باب #" + t.num : t.label || t.name || "عنصر")).join(" · "),
              markOn: !1,
              mark: "",
              markTitle: "",
              markStyle: "",
              hasSwatch: !0,
              swatch: ut("#e5b563"),
              ...KIVO.BassamMix.rowStyles({
                pc: Math.min(100, Math.round((100 * e.length) / Math.max(1, Xt.length))),
                lead: !1,
                color: "#b45309",
                track: "rgba(245,158,11,0.14)",
                num: "#b45309",
                numWidth: 24,
              }),
            }),
            ue.unshift({
              label: "تغطية الموقع",
              count: Qt + "/" + Kt,
              pct: String(Vt),
              pctAll: "",
              pctOn: !0,
              pctTxt: KIVO.bsPct(_t) + "٪",
              pctStyle: "flex-shrink:0;font-size:8.5px;font-weight:700;font-feature-settings:'tnum';color:" + t,
              tip:
                "تغطية الموقع كاملاً: " +
                KIVO.BassamCount(Qt, ["مسكَّن واحد", "مسكَّنان", "مسكَّنَين", "مسكَّنين", "مسكَّناً", "مسكَّن"]) +
                " من " +
                Kt +
                " (" +
                Vt +
                "٪ — إجمالي احتياج الورديات)",
              markOn: !1,
              mark: "",
              markTitle: "",
              markStyle: "",
              hasSwatch: !0,
              swatch: ut("#b99751"),
              ...KIVO.BassamMix.rowStyles({
                pc: Math.min(100, Vt),
                lead: !0,
                color: t,
                track: "rgba(185,151,81,0.14)",
                num: t,
                numWidth: 24,
              }),
            }),
            Jt.forEach((t, e) => {
              const s = parseInt(t.pct, 10) || 0;
              ue.splice(1 + e, 0, {
                label: t.name,
                count: t.counts,
                pct: t.pct,
                pctAll: "",
                pctOn: !0,
                pctTxt: s + "٪",
                pctStyle: "flex-shrink:0;font-size:8.5px;font-weight:700;font-feature-settings:'tnum';color:" + t.pctColor,
                tip: t.tip + " — تغطية احتياج هذه الوردية وحدها",
                markOn: !1,
                mark: "",
                markTitle: "",
                markStyle: "",
                hasSwatch: !0,
                swatch: ut(t.color),
                ...KIVO.BassamMix.rowStyles({
                  pc: Math.min(100, s),
                  lead: !1,
                  color: t.pctColor,
                  track: t.color + "1f",
                  num: t.pctColor,
                  numWidth: 30,
                }),
              });
            }));
        }
        const me = KIVO.BassamMix.donutCss(oe, de),
          ye = "dist" === Y,
          be = [
            ["loc", "الموقع"],
            ["sector", "النطاق"],
            ["gtype", "النوع"],
            ["kind", "الفئة"],
            ["route", "المسار"],
            ["cls", "التصنيف"],
            ["cats", "التخصيص"],
            ["closed", "الحالة"],
          ],
          xe = be.some((t) => t[0] === e.gateDim) ? e.gateDim : "loc",
          ke = "dsum" === e.gateDim ? "dsum" : "summary",
          Ae = "cats" === xe,
          ve = (t, e) => {
            if ("sector" === e) return [this._secLab(t, "gate")];
            if ("closed" === e) return [t && t.closed ? "مغلق" : "مفتوح"];
            if ("cats" === e) {
              const e = (t && t.cats) || [];
              return e.length ? e.map(String) : ["غير محدّد"];
            }
            return [String(null == (t && t[e]) ? "" : t[e]).trim() || "غير محدّد"];
          },
          Se = ((t) => {
            const e = {},
              s = [];
            return (
              l.forEach((n) =>
                ve(n, t).forEach((t) => {
                  (null == e[t] && ((e[t] = 0), s.push(t)), e[t]++);
                }),
              ),
              s.map((t) => ({ label: t, n: e[t] })).sort((t, e) => e.n - t.n || t.label.localeCompare(e.label, "ar"))
            );
          })(xe),
          we = Se.reduce((t, e) => t + e.n, 0),
          ze = Se.length ? Se[0].n : 0,
          Ee = (t) => {
            if ("loc" === xe) {
              const e = this.gateLocColor(t.label);
              if (e) return e;
            }
            return "closed" === xe
              ? "مغلق" === t.label
                ? "var(--text-muted)"
                : "var(--success)"
              : "rgba(185,151,81," + ((e = t.n), (0.3 + 0.6 * (ze ? e / ze : 0)).toFixed(2) + ")");
            var e;
          },
          Me = (t) => {
            const e = Ee(t);
            return 0 === e.indexOf("rgba")
              ? "rgba(185,151,81,0.12)"
              : 0 === e.indexOf("var(")
                ? "color-mix(in srgb," + e + " 12%,transparent)"
                : e + "1f";
          },
          Oe = (t) => {
            const e = Ee(t);
            return 0 === e.indexOf("rgba") ? "#9A7E40" : e;
          },
          Ce = this.bsLensOn("dist")
            ? [
                ["summary", "مؤشرات الأبواب"],
                ["dsum", "مؤشرات التوزيع"],
              ]
            : [["summary", "مؤشرات الأبواب"]],
          Pe = Ce.map((t) => ({
            label: t[1],
            icA: KIVO.BassamMix.dimIcon(t[0]).a,
            icB: KIVO.BassamMix.dimIcon(t[0]).b,
            click: () =>
              this.setState(
                Object.assign(
                  { gateDim: t[0] },
                  "gates" === e.lens && this.bsLensOn("dist")
                    ? { gAsn: "dsum" === t[0], tool: "select", sel: null, selMulti: [], draft: null, polyPts: [], polyCursor: null }
                    : {},
                ),
              ),
            on: t[0] === ke,
            style: KIVO.BassamMix.tabStyle(t[0] === ke, Ce.length),
          })),
          Te = KIVO.BassamMix.marks(Se),
          Fe = Se.map((t, e) => {
            const s = we ? Math.max(1, Math.round((t.n / we) * 100)) : 0,
              n = we ? (t.n / we) * 100 : 0,
              a = 0 === e;
            return {
              label: t.label,
              count: String(t.n),
              pct: String(s),
              pctAll: KIVO.bsPct(n) + "٪",
              subPct: "font-size:8px;font-weight:400;opacity:.62;margin-right:2px;letter-spacing:0",
              tip:
                t.label +
                " — " +
                t.n +
                (Ae ? " باب · " + s + "٪ من الانتماءات" : " من " + KIVO.BassamCount(we, "باب", "g") + " (" + s + "٪)"),
              markOn: !!KIVO.BassamMix.markOf(Te, e),
              mark: (KIVO.BassamMix.markOf(Te, e) || {}).ch,
              markTitle: (KIVO.BassamMix.markOf(Te, e) || {}).title,
              markStyle: KIVO.BassamMix.markStyle,
              hasSwatch: !0,
              swatch: ut(Ee(t)),
              ...KIVO.BassamMix.rowStyles({ pc: s, lead: a, color: Ee(t), track: Me(t), num: Oe(t), numWidth: 24 }),
            };
          }),
          Le = KIVO.BassamMix.donutCss(
            Se.map((t) => ({ n: t.n, color: Ee(t) })),
            we,
          ),
          De = [
            ["kind", "النوع"],
            ["off", "الحالة"],
          ].some((t) => t[0] === e.markDim)
            ? e.markDim
            : "kind",
          Ne = "dsum" === e.markDim ? "dsum" : "summary",
          Be = ((t) => {
            const e = {},
              s = [];
            return (
              o.forEach((n) => {
                const a = "off" === t ? (n.off ? "معطّل" : "مفعّل") : String(n.kind || "").trim() || "بلا نوع";
                (null == e[a] && ((e[a] = 0), s.push(a)), e[a]++);
              }),
              s.map((t) => ({ label: t, n: e[t] }))
            );
          })(De),
          We = o.length,
          Ie = (t) => ("off" === De && "معطّل" === t.label ? "var(--text-muted)" : "var(--chart-5)"),
          je = this.bsLensOn("dist")
            ? [
                ["summary", "مؤشرات المعالم"],
                ["dsum", "مؤشرات التوزيع"],
              ]
            : [["summary", "مؤشرات المعالم"]],
          Re = je.map((t) => ({
            label: t[1],
            icA: KIVO.BassamMix.dimIcon(t[0]).a,
            icB: KIVO.BassamMix.dimIcon(t[0]).b,
            click: () =>
              this.setState(
                Object.assign(
                  { markDim: t[0] },
                  "marks" === e.lens && this.bsLensOn("dist")
                    ? { mAsn: "dsum" === t[0], tool: "select", sel: null, selMulti: [], draft: null, polyPts: [], polyCursor: null }
                    : {},
                ),
              ),
            on: t[0] === Ne,
            style: KIVO.BassamMix.tabStyle(t[0] === Ne, je.length),
          })),
          Ge = KIVO.BassamMix.marks(Be),
          Ze = Be.map((t, e) => {
            const s = We ? Math.max(1, Math.round((t.n / We) * 100)) : 0,
              n = 0 === e;
            return {
              label: t.label,
              count: String(t.n),
              pct: String(s),
              tip: t.label + " — " + t.n + " من " + KIVO.BassamCount(We, "معلم", "g") + " (" + s + "٪)",
              markOn: !!KIVO.BassamMix.markOf(Ge, e),
              mark: (KIVO.BassamMix.markOf(Ge, e) || {}).ch,
              markTitle: (KIVO.BassamMix.markOf(Ge, e) || {}).title,
              markStyle: KIVO.BassamMix.markStyle,
              hasSwatch: !0,
              swatch: ut(Ie(t)),
              ...KIVO.BassamMix.rowStyles({ pc: s, lead: n, color: Ie(t), track: Ie(t) + "1f", num: Ie(t), numWidth: 24 }),
            };
          }),
          Ye = "zones" === Y && !i && "dsum" !== e.brkDim && !H,
          He = (() => {
            if (!Ye) return null;
            const t = React.createElement,
              s = e.zones || [],
              n = s.length,
              a = s.filter((t) => !t.off).length,
              i = n - a,
              r = n ? Math.round((a / n) * 100) : 0,
              l = KIVO.__bsCssObj,
              o = t(
                "div",
                {
                  style: {
                    display: "flex",
                    alignItems: "stretch",
                    gap: 9,
                    border: "1px solid var(--bd-xeef0f2)",
                    borderRadius: 12,
                    padding: 9,
                    background: "linear-gradient(180deg,var(--bg-xffffff),var(--bg-xfcfcfd))",
                    marginBottom: 10,
                    boxShadow: "var(--shadow-card)",
                  },
                },
                t(
                  "div",
                  {
                    key: "big",
                    style: {
                      textAlign: "center",
                      padding: "0 4px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    },
                  },
                  t(
                    "b",
                    {
                      style: { fontSize: 22, fontWeight: 700, lineHeight: 1, color: "var(--fg-x8a6f35)", fontFamily: "'Cairo',sans-serif" },
                    },
                    String(n),
                  ),
                  t(
                    "span",
                    { style: { fontSize: 9, fontWeight: 400, color: "var(--fg-x94a3b8)", marginTop: 3, whiteSpace: "nowrap" } },
                    "إجمالي المصليات",
                  ),
                ),
                t("div", {
                  key: "sp",
                  style: { width: 1, background: "linear-gradient(180deg,transparent,var(--bg-xe6e8eb),transparent)" },
                }),
                t(
                  "div",
                  {
                    key: "side",
                    style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 7 },
                  },
                  [
                    [
                      "on",
                      a,
                      r,
                      "var(--success-text)",
                      "var(--success)",
                      "مفعّلة",
                      ["M22 11.08V12a10 10 0 1 1-5.93-9.14", "m9 11 3 3L22 4"],
                      "var(--success-bg)",
                      "var(--success-border)",
                    ],
                    [
                      "off",
                      i,
                      100 - r,
                      "var(--text-faint)",
                      "var(--neutral-fill)",
                      "معطّلة",
                      ["M18.36 6.64A9 9 0 1 1 5.64 6.64", "M12 2v10"],
                      "var(--bg-surface-2)",
                      "var(--border-default)",
                    ],
                  ].map((e) => {
                    return t(
                      "div",
                      { key: e[0], style: { display: "flex", alignItems: "center", gap: 5 } },
                      t(
                        "span",
                        {
                          style: {
                            width: 17,
                            height: 17,
                            borderRadius: 6,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            background: e[7],
                            border: "1px solid " + e[8],
                          },
                        },
                        ((s = e[6]),
                        (n = e[3]),
                        t(
                          "svg",
                          {
                            width: 11,
                            height: 11,
                            viewBox: "0 0 24 24",
                            fill: "none",
                            stroke: n,
                            strokeWidth: 2.2,
                            strokeLinecap: "round",
                            strokeLinejoin: "round",
                            style: { flexShrink: 0 },
                          },
                          s.map((e, s) => t("path", { key: "p" + s, d: e })),
                        )),
                      ),
                      t("span", { style: { fontSize: 10, fontWeight: 400, flexShrink: 0 } }, e[5]),
                      ((e, s) => {
                        const n = KIVO.BassamMix.rowStyles({ pc: e, color: s, track: "var(--chart-track)" });
                        return t(
                          "span",
                          { style: { display: "flex", gap: 1.5, flex: "1 1 auto", minWidth: 44 } },
                          n.cells.map((e, s) => t("i", { key: "b" + s, style: l(e) })),
                        );
                      })(e[2], e[4]),
                      t(
                        "span",
                        {
                          style: {
                            fontSize: 11,
                            fontWeight: 700,
                            width: 34,
                            textAlign: "left",
                            flexShrink: 0,
                            whiteSpace: "nowrap",
                            color: "var(--fg-x8a6f35)",
                            fontFamily: "'Cairo',sans-serif",
                          },
                        },
                        String(e[1]),
                        t(
                          "em",
                          { style: { fontStyle: "normal", fontSize: 7.5, fontWeight: 400, color: "var(--fg-x8e959d)", marginRight: 2 } },
                          e[2] + "٪",
                        ),
                      ),
                    );
                    var s, n;
                  }),
                ),
              ),
              d = ["ztypecat", "region", "yard", "level", "ztype", "zcat"],
              h = U.filter((t) => "zstate" !== t.f)
                .slice()
                .sort((t, e) => {
                  const s = d.indexOf(t.f),
                    n = d.indexOf(e.f);
                  return (s < 0 ? 99 : s) - (n < 0 ? 99 : n);
                })
                .map((e, a) => {
                  const i = {},
                    r = {},
                    l = [],
                    o = {};
                  s.forEach((t) => {
                    const s =
                      "ztypecat" === e.f
                        ? (String(t.ztype || "").trim() || "بلا نوع") + " · " + (String(t.zcat || "").trim() || "بلا فئة")
                        : "yard" === e.f
                          ? String(t.yard || "").trim() || "بلا ساحة"
                          : String(null == t[e.f] ? "" : t[e.f]).trim() || "غير محدّد";
                    (null == i[s] && ((i[s] = 0), (r[s] = 0), l.push(s), (o[s] = new Set())),
                      i[s]++,
                      t.off || r[s]++,
                      o[s].add(String(t.ztype || "").trim()));
                  });
                  const d = l
                    .map((t) => ({ label: t, n: i[t], on: r[t], zt: o[t] && 1 === o[t].size ? Array.from(o[t])[0] : null }))
                    .sort((t, e) => e.n - t.n);
                  if (!d.length) return null;
                  const h = (t) => {
                      if ("yard" === e.f) return this.gateLocColor(t.label) || "#cbd5e1";
                      if ("zcat" === e.f && t.zt) {
                        const e = this.zcatStyleOf(t.label, t.zt);
                        if (e && e.f) return e.f;
                      }
                      if ("ztypecat" === e.f) {
                        const e = String(t.label || "").split(" · "),
                          s = this.zcatStyleOf(e[1] || "", e[0] || "");
                        if (s && s.f) return s.f;
                      }
                      const s = [
                          "var(--brand-primary)",
                          "var(--brand-deep)",
                          "var(--brand-light)",
                          "var(--chart-7)",
                          "var(--chart-9)",
                          "var(--brand-text)",
                        ],
                        n = d.indexOf(t);
                      return s[(n < 0 ? 0 : n) % s.length];
                    },
                    p = Math.max(...d.map((t) => t.n)),
                    c = Math.min(...d.map((t) => t.n)),
                    g = d.filter((t) => t.n === p),
                    f = d.filter((t) => t.n === c),
                    u = (e, s, n, a) =>
                      t(
                        "div",
                        {
                          key: e ? "hi" : "lo",
                          title:
                            (e ? "الأعلى" : "الأدنى") +
                            " — " +
                            (1 === n.length ? n[0].label : KIVO.BassamCount(n.length, "قيمة|متعادلة") + "") +
                            " · " +
                            a,
                          style: {
                            flex: 1,
                            minWidth: 0,
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                            padding: "5px 8px",
                            borderRadius: 10,
                            border: "1px solid var(--bd-xedeff2)",
                            background: "var(--bg-xffffff)",
                            boxShadow: "var(--shadow-card)",
                          },
                        },
                        t(
                          "span",
                          {
                            key: "bd",
                            style: {
                              width: 20,
                              height: 20,
                              borderRadius: 9999,
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "color-mix(in srgb," + s + " 8%,transparent)",
                              border: "1px solid color-mix(in srgb," + s + " 16%,transparent)",
                            },
                          },
                          ((e, s) =>
                            t(
                              "svg",
                              {
                                width: 9,
                                height: 9,
                                viewBox: "0 0 24 24",
                                fill: "none",
                                stroke: s,
                                strokeWidth: 3,
                                strokeLinecap: "round",
                                strokeLinejoin: "round",
                                style: { flexShrink: 0 },
                              },
                              t("path", { key: "a", d: e ? "M12 19V5" : "M12 5v14" }),
                              t("path", { key: "b", d: e ? "m5 12 7-7 7 7" : "m19 12-7 7-7-7" }),
                            ))(e, s),
                        ),
                        t(
                          "span",
                          {
                            key: "v",
                            dir: "ltr",
                            style: {
                              flexShrink: 0,
                              fontSize: 13.5,
                              fontWeight: 700,
                              color: s,
                              lineHeight: 1,
                              fontFamily: "'Cairo',sans-serif",
                              fontFeatureSettings: "'tnum'",
                            },
                          },
                          String(a),
                        ),
                        t(
                          "span",
                          { key: "tx", style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 } },
                          t(
                            "span",
                            {
                              style: { fontSize: 7.5, fontWeight: 600, color: "var(--fg-xa2a9b2)", lineHeight: 1.2, whiteSpace: "nowrap" },
                            },
                            e ? "الأعلى" : "الأدنى",
                          ),
                          t(
                            "span",
                            { style: { display: "flex", alignItems: "center", gap: 4, minWidth: 0 } },
                            t("i", {
                              style: {
                                width: 7,
                                height: 7,
                                borderRadius: 2,
                                flexShrink: 0,
                                background: 1 === n.length ? h(n[0]) : "var(--bg-xcbd5e1)",
                                boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
                              },
                            }),
                            t(
                              "span",
                              {
                                style: {
                                  minWidth: 0,
                                  fontSize: 9.5,
                                  fontWeight: 600,
                                  color: "var(--fg-x3f3f3f)",
                                  lineHeight: 1.25,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                },
                              },
                              1 === n.length ? n[0].label : n.length + " متعادلة",
                            ),
                          ),
                        ),
                      ),
                    m =
                      p === c
                        ? t(
                            "div",
                            { style: { display: "flex", gap: 6, marginBottom: 7 } },
                            t(
                              "div",
                              {
                                style: {
                                  flex: 1,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 6,
                                  padding: "6px 8px",
                                  borderRadius: 10,
                                  border: "1px solid var(--bd-xedeff2)",
                                  background: "linear-gradient(180deg,var(--bg-xfcfcfd),var(--bg-xfafbfc))",
                                },
                              },
                              t(
                                "span",
                                {
                                  style: {
                                    width: 15,
                                    height: 15,
                                    borderRadius: 9999,
                                    flexShrink: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    background: "var(--bg-xf1f3f5)",
                                    border: "1px solid var(--bd-xe6e8eb)",
                                  },
                                },
                                t(
                                  "svg",
                                  {
                                    width: 9,
                                    height: 9,
                                    viewBox: "0 0 24 24",
                                    fill: "none",
                                    stroke: "currentColor",
                                    style: { color: "var(--text-faint)" },
                                    strokeWidth: 3,
                                    strokeLinecap: "round",
                                  },
                                  t("path", { key: "e1", d: "M5 9h14" }),
                                  t("path", { key: "e2", d: "M5 15h14" }),
                                ),
                              ),
                              t(
                                "span",
                                { style: { fontSize: 9, fontWeight: 400, color: "var(--fg-x8b9099)", whiteSpace: "nowrap" } },
                                "كل القيم متساوية",
                              ),
                              t(
                                "span",
                                {
                                  dir: "ltr",
                                  style: {
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: "var(--fg-x6f7276)",
                                    lineHeight: 1,
                                    fontFamily: "'Cairo',sans-serif",
                                    fontFeatureSettings: "'tnum'",
                                  },
                                },
                                String(p),
                              ),
                            ),
                          )
                        : t(
                            "div",
                            { style: { display: "flex", gap: 6, marginBottom: 6 } },
                            u(!0, "var(--danger-text)", g, p),
                            u(!1, "var(--success-text)", f, c),
                          ),
                    y = KIVO.__bsCssObj,
                    b = { fontSize: 8, fontWeight: 400, opacity: 0.62, marginRight: 2, letterSpacing: 0 },
                    x = t(
                      "div",
                      {
                        key: "hdc",
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "0 1px 5px",
                          borderBottom: "1px solid var(--bd-a185151810p16)",
                          marginBottom: 5,
                        },
                      },
                      t("span", { key: "sp0", style: { flex: "1 1 auto" } }),
                      [
                        ["مفعّلة", "var(--success-text)"],
                        ["معطّلة", "var(--text-faint)"],
                        ["الكل", "var(--brand-text)"],
                      ].map((e, s) =>
                        t(
                          "span",
                          {
                            key: "hc" + s,
                            style: {
                              flex: "0 0 24px",
                              textAlign: "left",
                              fontFamily: "'Cairo',sans-serif",
                              fontFeatureSettings: "'tnum'",
                              fontSize: 7.5,
                              fontWeight: 400,
                              color: e[1],
                            },
                          },
                          e[0],
                        ),
                      ),
                    ),
                    k = (s, a, i, r, l, o) => {
                      const d = n ? Math.round((a / n) * 100) : 0,
                        h = a - i,
                        p = (a && Math.round((i / a) * 100), n ? (a / n) * 100 : 0),
                        c = a ? (i / a) * 100 : 0,
                        g = KIVO.BassamMix.rowStyles({
                          pc: d,
                          lead: l,
                          color: r,
                          track: "rgba(185,151,81,0.12)",
                          num: "#9A7E40",
                          numWidth: 24,
                          wide: "ztypecat" === e.f,
                        }),
                        f = y(g.item);
                      return (
                        l &&
                          ((f.borderTop = "1px solid rgba(185,151,81,0.35)"),
                          (f.marginTop = "5px"),
                          (f.height = "20px"),
                          (f.paddingTop = "4px")),
                        t(
                          "div",
                          { key: "r" + s, title: s + " — " + a + " من " + n + " (" + d + "٪) · مفعّلة " + i + " · معطّلة " + h, style: f },
                          o,
                          t("span", { style: y(g.name) }, s),
                          t(
                            "span",
                            { style: y(g.track) },
                            g.cells.map((e, s) => t("span", { key: "cl" + s, style: y(e) })),
                          ),
                          t("span", { dir: "ltr", style: y(g.numOn) }, String(i), t("span", { style: b }, KIVO.bsPct(c) + "٪")),
                          t("span", { dir: "ltr", style: y(g.numOff) }, String(h), t("span", { style: b }, KIVO.bsPct(100 - c) + "٪")),
                          t("span", { dir: "ltr", style: y(g.num) }, String(a), t("span", { style: b }, KIVO.bsPct(p) + "٪")),
                        )
                      );
                    },
                    A = d.reduce((t, e) => t + e.on, 0);
                  return t(
                    "div",
                    {
                      key: "sec" + a,
                      style: {
                        border: "1px solid var(--bd-xeef0f2)",
                        borderRadius: 12,
                        padding: 8,
                        background: "var(--bg-xffffff)",
                        boxShadow: "var(--shadow-card)",
                        marginBottom: 7,
                      },
                    },
                    t(
                      "div",
                      { key: "h", style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 7 } },
                      t("span", {
                        style: {
                          flex: 1,
                          height: 1,
                          background: "linear-gradient(90deg,var(--bg-a185151810) 0%,var(--bg-a185151810p32) 100%)",
                        },
                      }),
                      t(
                        "span",
                        {
                          style: {
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            flexShrink: 0,
                            borderRadius: 9999,
                            padding: "2px 9px",
                            background: "var(--bg-xffffff)",
                            border: "1px solid var(--bd-a185151810p3)",
                          },
                        },
                        t(
                          "span",
                          {
                            style: {
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              color: "var(--fg-xb99751)",
                            },
                          },
                          t(
                            "svg",
                            {
                              width: 11,
                              height: 11,
                              viewBox: "0 0 24 24",
                              fill: "none",
                              stroke: "currentColor",
                              strokeWidth: 2.4,
                              strokeLinecap: "round",
                              strokeLinejoin: "round",
                            },
                            t("path", { d: "M21.21 15.89A10 10 0 1 1 8 2.83" }),
                            t("path", { d: "M22 12A10 10 0 0 0 12 2v10z" }),
                          ),
                        ),
                        t(
                          "span",
                          {
                            style: {
                              fontSize: 9,
                              fontWeight: 600,
                              color: "var(--fg-x53565a)",
                              whiteSpace: "nowrap",
                              letterSpacing: "-0.01em",
                            },
                          },
                          e.title,
                        ),
                      ),
                      t("span", {
                        style: {
                          flex: 1,
                          height: 1,
                          background: "linear-gradient(90deg,var(--bg-a185151810p32) 0%,var(--bg-a185151810) 100%)",
                        },
                      }),
                    ),
                    m,
                    t(
                      "div",
                      { key: "b", style: { display: "flex", alignItems: "center", gap: 10 } },
                      t(
                        "div",
                        { style: { position: "relative", width: 64, height: 64, flexShrink: 0, display: "grid", placeItems: "center" } },
                        KIVO.BassamMix.donutHit(
                          d.map((t) => ({ n: t.n, label: t.label, color: h(t) })),
                          n,
                          64,
                          "مصلى",
                          30,
                        ),
                        t(
                          "span",
                          {
                            style: {
                              position: "relative",
                              zIndex: 2,
                              fontSize: 18,
                              fontWeight: 700,
                              lineHeight: 1,
                              color: "var(--fg-x141414)",
                              fontFamily: "'Cairo',sans-serif",
                            },
                          },
                          String(d.length),
                        ),
                      ),
                      t(
                        "div",
                        { style: { flex: 1, minWidth: 0 } },
                        x,
                        d
                          .map((s, n) => {
                            const i = "sm" + a + String(s.label).replace(/[^A-Za-z0-9]/g, "") + n,
                              r = h(s),
                              l =
                                "zcat" === e.f && s.zt
                                  ? J(s.label, i, s.zt)
                                  : "ztypecat" === e.f
                                    ? J(String(s.label || "").split(" · ")[1] || "", i, String(s.label || "").split(" · ")[0] || "")
                                    : t(
                                        "svg",
                                        {
                                          key: "sw" + i,
                                          width: 17,
                                          height: 11,
                                          viewBox: "0 0 17 11",
                                          style: { flexShrink: 0, overflow: "visible" },
                                        },
                                        t("rect", {
                                          x: 0.83,
                                          y: 0.83,
                                          width: 15.35,
                                          height: 9.35,
                                          rx: 2.8,
                                          fill: r,
                                          fillOpacity: 0.5,
                                          stroke: r,
                                          strokeWidth: 0.65,
                                          strokeLinejoin: "round",
                                        }),
                                      );
                            return k(s.label, s.n, s.on, h(s), !1, l);
                          })
                          .concat([
                            k(
                              "الإجمالي",
                              n,
                              A,
                              "#9A7E40",
                              !0,
                              t("span", {
                                style: {
                                  width: 17,
                                  height: 11,
                                  borderRadius: 2.5,
                                  flexShrink: 0,
                                  background: "var(--bg-x9a7e40)",
                                  opacity: 0.85,
                                },
                              }),
                            ),
                          ]),
                      ),
                    ),
                  );
                })
                .filter(Boolean);
            return t("div", { key: "sum" }, o, h);
          })();
        (() => {
          if (!St.length) return;
          const t = dt.some((t) => null != t.on) && "zstate" !== lt,
            e = dt.reduce((t, e) => t + (null == e.on ? e.n : e.on), 0),
            s = ht - e,
            n = ht ? Math.round((e / ht) * 100) : 0,
            a = ht ? (e / ht) * 100 : 0;
          St.push({
            label: "الإجمالي",
            count: String(ht),
            pct: "100",
            isTotal: !0,
            hasSplit: t,
            onCount: String(e),
            offCount: String(s),
            onPct: KIVO.bsPct(a) + "٪",
            offPct: KIVO.bsPct(100 - a) + "٪",
            tip:
              "إجمالي " +
              St.length +
              " " +
              (1 === St.length ? "قيمة" : "قيم") +
              " — " +
              ht +
              (t ? " · مفعّلة " + e + " (" + n + "٪) · معطّلة " + s : ""),
            hasSwatch: !1,
            markOn: !1,
            pctAll: "100٪",
            subPct: "font-size:8px;font-weight:400;opacity:.62;margin-right:2px;letter-spacing:0",
            ...(() => {
              const t = KIVO.BassamMix.rowStyles({
                pc: 100,
                lead: !1,
                wide: "ztypecat" === lt,
                color: "#9A7E40",
                track: "rgba(185,151,81,0.12)",
                num: "#9A7E40",
                numWidth: 24,
              });
              return {
                ...t,
                item: (t.item || "") + ";border-top:1px solid var(--bd-a185151810p35);margin-top:5px;padding-top:7px;font-weight:600",
              };
            })(),
          });
        })();
        const Xe = KIVO.BassamMix.donutCss(
            Be.map((t) => ({ n: t.n, color: Ie(t) })),
            We,
          ),
          Ke = "marks" === Y,
          Ue = "gates" === Y,
          Je = [
            ["type", "النوع"],
            ["dir", "الاتجاه"],
          ],
          qe = Je.some((t) => t[0] === e.pathDim) ? e.pathDim : "type",
          Qe = "summary" === e.pathDim ? "summary" : qe,
          Ve = {
            type: [
              ["in", "دخول"],
              ["out", "خروج"],
              ["emg", "طوارئ"],
              ["svc", "خدمات"],
            ],
            dir: [
              ["fwd", "اتجاه واحد"],
              ["two", "اتجاهان"],
            ],
            active: [
              ["on", "مفعّل"],
              ["off", "معطّل"],
            ],
          },
          _e = (t) =>
            Ve[t]
              .map((e) => ({
                key: e[0],
                label: e[1],
                n: h.filter(
                  (s) =>
                    ((t, e) =>
                      "type" === e
                        ? (t && t.type) || "in"
                        : "dir" === e
                          ? "two" === (t && t.dir)
                            ? "two"
                            : "fwd"
                          : t && !1 === t.active
                            ? "off"
                            : "on")(s, t) === e[0],
                ).length,
              }))
              .filter((t) => t.n > 0)
              .sort((t, e) => e.n - t.n),
          $e = _e(qe),
          ts = $e.reduce((t, e) => t + e.n, 0),
          es = $e.length ? $e[0].n : 0,
          ss = (t) => {
            return "type" === qe ? mt[t.key].c : "rgba(185,151,81," + ((e = t.n), (0.3 + 0.6 * (es ? e / es : 0)).toFixed(2) + ")");
            var e;
          },
          ns = (t) => ("type" === qe ? mt[t.key].c + "1f" : "rgba(185,151,81,0.12)"),
          as = (t) => ("type" === qe ? mt[t.key].c : "#9A7E40"),
          is = [wt].concat(Je),
          rs =
            (is.map((t) => ({
              label: t[1],
              icA: KIVO.BassamMix.dimIcon(t[0]).a,
              icB: KIVO.BassamMix.dimIcon(t[0]).b,
              click: () => this.setState({ pathDim: t[0] }),
              on: t[0] === Qe,
              style: KIVO.BassamMix.tabStyle(t[0] === Qe, is.length),
            })),
            KIVO.BassamMix.marks($e)),
          ls = $e.map((t, e) => {
            const s = ts ? Math.max(1, Math.round((t.n / ts) * 100)) : 0,
              n = ts ? (t.n / ts) * 100 : 0,
              a = 0 === e;
            return {
              label: t.label,
              count: String(t.n),
              pct: String(s),
              pctAll: KIVO.bsPct(n) + "٪",
              subPct: "font-size:8px;font-weight:400;opacity:.62;margin-right:2px;letter-spacing:0",
              tip: t.label + " — " + t.n + " من " + KIVO.BassamCount(ts, "مسار", "g") + " (" + s + "٪)",
              markOn: !!KIVO.BassamMix.markOf(rs, e),
              mark: (KIVO.BassamMix.markOf(rs, e) || {}).ch,
              markTitle: (KIVO.BassamMix.markOf(rs, e) || {}).title,
              markStyle: KIVO.BassamMix.markStyle,
              hasSwatch: !0,
              swatch: ut(ss(t)),
              ...KIVO.BassamMix.rowStyles({ pc: s, lead: a, color: ss(t), track: ns(t), num: as(t), numWidth: 24 }),
            };
          }),
          os = KIVO.BassamMix.donutCss(
            $e.map((t) => ({ n: t.n, color: ss(t) })),
            ts,
          ),
          ds = "paths" === Y,
          hs = KIVO.BassamMix.donutCss(
            dt.map((t, e) => ({ n: t.n, color: pt(t, e) })),
            ht,
          ),
          ps = r.filter((t) => !t.off).length,
          cs = r.length,
          gs = (cs && Math.round((ps / cs) * 100), "zones" === Y && cs > 0),
          fs = KIVO.BassamMix.donutCss(
            [
              { n: ps, color: "#16a34a" },
              { n: cs - ps, color: "#e2e8f0" },
            ],
            cs,
          ),
          us = 66,
          ms = KIVO.BassamMix.donutHit(
            dt.map((t, e) => ({ n: t.n, label: t.label, color: pt(t, e) })),
            ht,
            104,
            "مصلى",
            us,
          ),
          ys = KIVO.BassamMix.donutHit(Pt, Tt, 104, Ft, us),
          bs = KIVO.BassamMix.donutHit(oe, de, 104, he, us),
          xs = KIVO.BassamMix.donutHit(
            Se.map((t) => ({ n: t.n, label: t.label, color: Ee(t) })),
            we,
            104,
            Ae ? "انتماء" : "باب",
            us,
          ),
          ks = KIVO.BassamMix.donutHit(
            $e.map((t) => ({ n: t.n, label: t.label, color: ss(t) })),
            ts,
            104,
            "مسار",
            us,
          ),
          As = KIVO.BassamMix.donutHit(
            [
              { n: ps, label: "مفعّلة" },
              { n: cs - ps, label: "معطّلة" },
            ],
            cs,
            104,
            "مصلى",
            us,
          ),
          vs = (t, e) => "rgba(185,151,81," + (0.3 + 0.6 * (e ? t / e : 0)).toFixed(2) + ")",
          Ss = (t) => le(t).map((t) => ({ label: t.label, n: t.n, color: t.color })),
          ws = (t) => {
            const e = React.createElement,
              s = t.unitOf || (() => t.unit),
              n = KIVO.__bsCssObj,
              a = (t, s, n, a) =>
                e(
                  "div",
                  {
                    key: t ? "hi" : "lo",
                    title:
                      (t ? "الأعلى" : "الأدنى") +
                      " — " +
                      (1 === n.length ? n[0].label : KIVO.BassamCount(n.length, "قيمة|متعادلة") + "") +
                      " · " +
                      a,
                    style: {
                      flex: 1,
                      minWidth: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "5px 8px",
                      borderRadius: 10,
                      border: "1px solid var(--bd-xedeff2)",
                      background: "var(--bg-xffffff)",
                      boxShadow: "var(--shadow-card)",
                    },
                  },
                  e(
                    "span",
                    {
                      key: "bd",
                      style: {
                        width: 20,
                        height: 20,
                        borderRadius: 9999,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "color-mix(in srgb," + s + " 8%,transparent)",
                        border: "1px solid color-mix(in srgb," + s + " 16%,transparent)",
                      },
                    },
                    ((t, s) =>
                      e(
                        "svg",
                        {
                          width: 9,
                          height: 9,
                          viewBox: "0 0 24 24",
                          fill: "none",
                          stroke: s,
                          strokeWidth: 3,
                          strokeLinecap: "round",
                          strokeLinejoin: "round",
                          style: { flexShrink: 0 },
                        },
                        e("path", { key: "a", d: t ? "M12 19V5" : "M12 5v14" }),
                        e("path", { key: "b", d: t ? "m5 12 7-7 7 7" : "m19 12-7 7-7-7" }),
                      ))(t, s),
                  ),
                  e(
                    "span",
                    {
                      key: "v",
                      dir: "ltr",
                      style: {
                        flexShrink: 0,
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: s,
                        lineHeight: 1,
                        fontFamily: "'Cairo',sans-serif",
                        fontFeatureSettings: "'tnum'",
                      },
                    },
                    String(a),
                  ),
                  e(
                    "span",
                    { key: "tx", style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 } },
                    e(
                      "span",
                      { style: { fontSize: 7.5, fontWeight: 600, color: "var(--fg-xa2a9b2)", lineHeight: 1.2, whiteSpace: "nowrap" } },
                      t ? "الأعلى" : "الأدنى",
                    ),
                    e(
                      "span",
                      { style: { display: "flex", alignItems: "center", gap: 4, minWidth: 0 } },
                      e("i", {
                        style: {
                          width: 7,
                          height: 7,
                          borderRadius: 2,
                          flexShrink: 0,
                          background: 1 === n.length ? n[0].color : "var(--bg-xcbd5e1)",
                          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
                        },
                      }),
                      e(
                        "span",
                        {
                          style: {
                            minWidth: 0,
                            fontSize: 9.5,
                            fontWeight: 600,
                            color: "var(--fg-x3f3f3f)",
                            lineHeight: 1.25,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          },
                        },
                        1 === n.length ? n[0].label : n.length + " متعادلة",
                      ),
                    ),
                  ),
                ),
              i = t.dims.map((e) => ({ t: e[1], n: (t.itemsOf(e[0]) || []).length })).filter((t) => t.n > 0),
              r = e(
                "div",
                {
                  style: {
                    display: "flex",
                    alignItems: "stretch",
                    gap: 9,
                    border: "1px solid var(--bd-xeef0f2)",
                    borderRadius: 12,
                    padding: 9,
                    background: "linear-gradient(180deg,var(--bg-xffffff),var(--bg-xfcfcfd))",
                    marginBottom: 10,
                    boxShadow: "var(--shadow-card)",
                  },
                },
                e(
                  "div",
                  {
                    key: "big",
                    style: {
                      textAlign: "center",
                      padding: "0 4px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    },
                  },
                  e(
                    "b",
                    {
                      style: { fontSize: 22, fontWeight: 700, lineHeight: 1, color: "var(--fg-x8a6f35)", fontFamily: "'Cairo',sans-serif" },
                    },
                    String(t.total),
                  ),
                  e(
                    "span",
                    { style: { fontSize: 9, fontWeight: 400, color: "var(--fg-x94a3b8)", marginTop: 3, whiteSpace: "nowrap" } },
                    t.totalLabel,
                  ),
                ),
                e("div", {
                  key: "sp",
                  style: { width: 1, background: "linear-gradient(180deg,transparent,var(--bg-xe6e8eb),transparent)" },
                }),
                e(
                  "div",
                  {
                    key: "side",
                    style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 },
                  },
                  t.hero
                    ? (() => {
                        const s = t.hero,
                          a = (s.onN || 0) + (s.offN || 0),
                          i = a ? Math.round(((s.onN || 0) / a) * 100) : 0;
                        return [
                          [
                            "on",
                            s.onN || 0,
                            i,
                            "var(--success-text)",
                            "var(--success)",
                            s.onWord,
                            ["M22 11.08V12a10 10 0 1 1-5.93-9.14", "m9 11 3 3L22 4"],
                            "var(--success-bg)",
                            "var(--success-border)",
                          ],
                          [
                            "off",
                            s.offN || 0,
                            100 - i,
                            "var(--text-faint)",
                            "var(--neutral-fill)",
                            s.offWord,
                            ["M18.36 6.64A9 9 0 1 1 5.64 6.64", "M12 2v10"],
                            "var(--bg-surface-2)",
                            "var(--border-default)",
                          ],
                        ].map((t) => {
                          return e(
                            "div",
                            { key: t[0], style: { display: "flex", alignItems: "center", gap: 5 } },
                            e(
                              "span",
                              {
                                style: {
                                  width: 17,
                                  height: 17,
                                  borderRadius: 6,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                  background: t[7],
                                  border: "1px solid " + t[8],
                                },
                              },
                              ((s = t[6]),
                              (a = t[3]),
                              e(
                                "svg",
                                {
                                  width: 11,
                                  height: 11,
                                  viewBox: "0 0 24 24",
                                  fill: "none",
                                  stroke: a,
                                  strokeWidth: 2.2,
                                  strokeLinecap: "round",
                                  strokeLinejoin: "round",
                                  style: { flexShrink: 0 },
                                },
                                s.map((t, s) => e("path", { key: "p" + s, d: t })),
                              )),
                            ),
                            e("span", { style: { fontSize: 10, fontWeight: 400, flexShrink: 0 } }, t[5]),
                            ((t, s) => {
                              const a = KIVO.BassamMix.rowStyles({ pc: t, color: s, track: "var(--chart-track)" });
                              return e(
                                "span",
                                { style: { display: "flex", gap: 1.5, flex: "1 1 auto", minWidth: 44 } },
                                a.cells.map((t, s) => e("i", { key: "b" + s, style: n(t) })),
                              );
                            })(t[2], t[4]),
                            e(
                              "span",
                              {
                                style: {
                                  fontSize: 11,
                                  fontWeight: 700,
                                  width: 34,
                                  textAlign: "left",
                                  flexShrink: 0,
                                  whiteSpace: "nowrap",
                                  color: "var(--fg-x8a6f35)",
                                  fontFamily: "'Cairo',sans-serif",
                                },
                              },
                              String(t[1]),
                              e(
                                "em",
                                {
                                  style: {
                                    fontStyle: "normal",
                                    fontSize: 7.5,
                                    fontWeight: 400,
                                    color: "var(--fg-x8e959d)",
                                    marginRight: 2,
                                  },
                                },
                                t[2] + "٪",
                              ),
                            ),
                          );
                          var s, a;
                        });
                      })()
                    : i.map((t, s) =>
                        e(
                          "div",
                          { key: "dc" + s, style: { display: "flex", alignItems: "center", gap: 6 } },
                          e(
                            "span",
                            {
                              style: {
                                fontSize: 10,
                                fontWeight: 400,
                                flex: 1,
                                minWidth: 0,
                                color: "var(--fg-x53565a)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              },
                            },
                            t.t,
                          ),
                          e("i", {
                            style: {
                              flex: 1,
                              height: 1,
                              background: "linear-gradient(90deg,var(--bg-a185151810p28),var(--bg-a185151810))",
                            },
                          }),
                          e(
                            "span",
                            {
                              style: {
                                fontSize: 10,
                                fontWeight: 700,
                                color: "var(--fg-x8a6f35)",
                                fontFamily: "'Cairo',sans-serif",
                                whiteSpace: "nowrap",
                              },
                            },
                            String(t.n),
                            e(
                              "em",
                              {
                                style: { fontStyle: "normal", fontSize: 7.5, fontWeight: 400, color: "var(--fg-x8e959d)", marginRight: 2 },
                              },
                              "قيم",
                            ),
                          ),
                        ),
                      ),
                ),
              ),
              l = t.dims
                .map((n, i) => {
                  const r = (t.itemsOf(n[0]) || [])
                    .slice()
                    .sort((t, e) => e.n - t.n || String(t.label).localeCompare(String(e.label), "ar"));
                  if (!r.length) return null;
                  const l = r.reduce((t, e) => t + e.n, 0),
                    o = Math.max.apply(
                      null,
                      r.map((t) => t.n),
                    ),
                    d = Math.min.apply(
                      null,
                      r.map((t) => t.n),
                    ),
                    h = r.filter((t) => t.n === o),
                    p = r.filter((t) => t.n === d),
                    c =
                      o === d
                        ? e(
                            "div",
                            { style: { display: "flex", gap: 6, marginBottom: 7 } },
                            e(
                              "div",
                              {
                                style: {
                                  flex: 1,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 6,
                                  padding: "6px 8px",
                                  borderRadius: 10,
                                  border: "1px solid var(--bd-xedeff2)",
                                  background: "linear-gradient(180deg,var(--bg-xfcfcfd),var(--bg-xfafbfc))",
                                },
                              },
                              e(
                                "span",
                                {
                                  style: {
                                    width: 15,
                                    height: 15,
                                    borderRadius: 9999,
                                    flexShrink: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    background: "var(--bg-xf1f3f5)",
                                    border: "1px solid var(--bd-xe6e8eb)",
                                  },
                                },
                                e(
                                  "svg",
                                  {
                                    width: 9,
                                    height: 9,
                                    viewBox: "0 0 24 24",
                                    fill: "none",
                                    stroke: "currentColor",
                                    style: { color: "var(--text-faint)" },
                                    strokeWidth: 3,
                                    strokeLinecap: "round",
                                  },
                                  e("path", { key: "e1", d: "M5 9h14" }),
                                  e("path", { key: "e2", d: "M5 15h14" }),
                                ),
                              ),
                              e(
                                "span",
                                { style: { fontSize: 9, fontWeight: 400, color: "var(--fg-x8b9099)", whiteSpace: "nowrap" } },
                                "كل القيم متساوية",
                              ),
                              e(
                                "span",
                                {
                                  dir: "ltr",
                                  style: {
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: "var(--fg-x6f7276)",
                                    lineHeight: 1,
                                    fontFamily: "'Cairo',sans-serif",
                                    fontFeatureSettings: "'tnum'",
                                  },
                                },
                                String(o),
                              ),
                            ),
                          )
                        : e(
                            "div",
                            { style: { display: "flex", gap: 6, marginBottom: 6 } },
                            a(!0, "var(--danger-text)", h, o),
                            a(!1, "var(--success-text)", p, d),
                          ),
                    g = KIVO.__bsCssObj,
                    f = { fontSize: 8, fontWeight: 400, opacity: 0.62, marginRight: 2, letterSpacing: 0 },
                    u = (t, s, n) => {
                      const a = l ? Math.round((t.n / l) * 100) : 0,
                        i = l ? (t.n / l) * 100 : 0,
                        r = KIVO.BassamMix.rowStyles({
                          pc: a,
                          lead: s,
                          color: n,
                          track: "rgba(185,151,81,0.12)",
                          num: "#9A7E40",
                          numWidth: 30,
                        }),
                        o = g(r.item);
                      return (
                        s &&
                          ((o.borderTop = "1px solid rgba(185,151,81,0.35)"),
                          (o.marginTop = "5px"),
                          (o.height = "20px"),
                          (o.paddingTop = "4px")),
                        e(
                          "div",
                          { key: "r" + t.label, title: t.label + " — " + t.n + " من " + l + " (" + a + "٪)", style: o },
                          s
                            ? e("span", {
                                style: {
                                  width: 17,
                                  height: 11,
                                  borderRadius: 2.5,
                                  flexShrink: 0,
                                  background: "var(--bg-x9a7e40)",
                                  opacity: 0.85,
                                },
                              })
                            : e(
                                "svg",
                                { width: 17, height: 11, viewBox: "0 0 17 11", style: { flexShrink: 0, overflow: "visible" } },
                                e("rect", {
                                  x: 0.83,
                                  y: 0.83,
                                  width: 15.35,
                                  height: 9.35,
                                  rx: 2.8,
                                  fill: (d = n),
                                  fillOpacity: 0.5,
                                  stroke: d,
                                  strokeWidth: 0.65,
                                  strokeLinejoin: "round",
                                }),
                              ),
                          e("span", { style: g(r.name) }, t.label),
                          e(
                            "span",
                            { style: g(r.track) },
                            r.cells.map((t, s) => e("span", { key: "cl" + s, style: g(t) })),
                          ),
                          e("span", { dir: "ltr", style: g(r.num) }, String(t.n), e("span", { style: f }, KIVO.bsPct(i) + "٪")),
                        )
                      );
                      var d;
                    };
                  return e(
                    "div",
                    {
                      key: "sec" + i,
                      style: {
                        border: "1px solid var(--bd-xeef0f2)",
                        borderRadius: 12,
                        padding: 8,
                        background: "var(--bg-xffffff)",
                        boxShadow: "var(--shadow-card)",
                        marginBottom: 7,
                      },
                    },
                    e(
                      "div",
                      { key: "h", style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 7 } },
                      e("span", {
                        style: {
                          flex: 1,
                          height: 1,
                          background: "linear-gradient(90deg,var(--bg-a185151810) 0%,var(--bg-a185151810p32) 100%)",
                        },
                      }),
                      e(
                        "span",
                        {
                          style: {
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            flexShrink: 0,
                            borderRadius: 9999,
                            padding: "2px 9px",
                            background: "var(--bg-xffffff)",
                            border: "1px solid var(--bd-a185151810p3)",
                          },
                        },
                        e(
                          "span",
                          {
                            style: {
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              color: "var(--fg-xb99751)",
                            },
                          },
                          e(
                            "svg",
                            {
                              width: 11,
                              height: 11,
                              viewBox: "0 0 24 24",
                              fill: "none",
                              stroke: "currentColor",
                              strokeWidth: 2.4,
                              strokeLinecap: "round",
                              strokeLinejoin: "round",
                            },
                            e("path", { d: "M21.21 15.89A10 10 0 1 1 8 2.83" }),
                            e("path", { d: "M22 12A10 10 0 0 0 12 2v10z" }),
                          ),
                        ),
                        e(
                          "span",
                          {
                            style: {
                              fontSize: 9,
                              fontWeight: 600,
                              color: "var(--fg-x53565a)",
                              whiteSpace: "nowrap",
                              letterSpacing: "-0.01em",
                            },
                          },
                          n[1],
                        ),
                      ),
                      e("span", {
                        style: {
                          flex: 1,
                          height: 1,
                          background: "linear-gradient(90deg,var(--bg-a185151810p32) 0%,var(--bg-a185151810) 100%)",
                        },
                      }),
                    ),
                    c,
                    e(
                      "div",
                      { key: "b", style: { display: "flex", alignItems: "center", gap: 10 } },
                      e(
                        "div",
                        { style: { position: "relative", width: 64, height: 64, flexShrink: 0, display: "grid", placeItems: "center" } },
                        KIVO.BassamMix.donutHit(
                          r.map((t) => ({ n: t.n, label: t.label, color: t.color })),
                          l,
                          64,
                          s(n[0]),
                          30,
                        ),
                        e(
                          "span",
                          {
                            style: {
                              position: "relative",
                              zIndex: 2,
                              fontSize: 18,
                              fontWeight: 700,
                              lineHeight: 1,
                              color: "var(--fg-x141414)",
                              fontFamily: "'Cairo',sans-serif",
                            },
                          },
                          String(r.length),
                        ),
                      ),
                      e(
                        "div",
                        { style: { flex: 1, minWidth: 0 } },
                        r.map((t) => u(t, !1, t.color)).concat([u({ label: "الإجمالي", n: l }, !0, "#9A7E40")]),
                      ),
                    ),
                  );
                })
                .filter(Boolean);
            return e("div", { key: "lsum" }, r, l);
          };
        let zs = !1,
          Es = null;
        if (H);
        else if ("zones" !== Y || i || "dsum" !== e.brkDim)
          if (ds && "summary" === e.pathDim)
            ((zs = !0),
              (Es = ws({
                total: h.length,
                totalLabel: "إجمالي المسارات",
                unit: "مسار",
                dims: Je,
                itemsOf: (t) => {
                  const e = _e(t),
                    s = e.length ? e[0].n : 0;
                  return e.map((e) => ({
                    label: e.label,
                    n: e.n,
                    color: "type" === t ? (mt[e.key] && mt[e.key].c) || "#b99751" : vs(e.n, s),
                  }));
                },
                hero: {
                  onN: h.filter((t) => !1 !== t.active).length,
                  offN: h.filter((t) => !1 === t.active).length,
                  onWord: "فعّالة",
                  offWord: "معطّلة",
                },
              })));
          else if (Ue && "dsum" !== e.gateDim)
            ((zs = !0),
              (Es = this._lensSumPanel9({
                arr: KIVO.BassamLeaf.elements(l),
                isOn9: (t) => !KIVO.BassamLeaf.closedOf(l, t),
                subTotal:
                  KIVO.BassamLeaf.leafTotal(l) !== KIVO.BassamLeaf.elements(l).length
                    ? "عدد الأبواب " + KIVO.BassamLeaf.leafTotal(l)
                    : "",
                totalLabel: "إجمالي الأبواب",
                totalTip: "كل أبواب التشغيل الميداني المرسومة على خريطة هذا الموقع",
                onWord: "مفتوح",
                offWord: "مغلق",
                onDivWord: "المفتوح",
                offDivWord: "المغلق",
                onHint: " — والحالة تُبدَّل بنقرة على الباب في وضع التشغيل",
                dims: be.filter((t) => "closed" !== t[0]),
                valsOf: ve,
                unitOf: (t) => ("cats" === t ? "انتماء" : "باب"),
                catNoteOf: (t) => ("cats" === t ? " · الباب قد ينتمي لأكثر من تخصيص" : ""),
                colorOf: (t, e) => ("loc" === t ? this.gateLocColor(e) : null),
                secPrefix: "الأبواب بحسب",
                key9: "gops",
              })));
          else if (Ue && "dsum" === e.gateDim)
            ((zs = !0),
              (Es = this._distPanel9(
                { empList: f, scheduledEmps: v, shiftOpts: y, shiftByName: A, zonesAll: r, gatesAll: l, marksAll: o },
                {
                  key9: "gdistp",
                  arr: KIVO.BassamLeaf.units(l),
                  selfWord: "الأبواب",
                  locDim: "loc",
                  secDims: [
                    ["loc", "الموقع"],
                    ["sector", "النطاق"],
                    ["gtype", "النوع"],
                    ["kind", "الفئة"],
                    ["route", "المسار"],
                    ["cls", "التصنيف"],
                    ["cats", "التخصيص"],
                  ],
                  valsOf: ve,
                  unitOf: (t) => ("cats" === t ? "انتماء" : "باب"),
                  catNoteOf: (t) => ("cats" === t ? " · الباب متعدد التخصيصات يُحسب احتياجه وتسكينه في كل تخصيص ينتمي إليه" : ""),
                },
              )));
          else if (Ke && "dsum" !== e.markDim)
            ((zs = !0),
              (Es = this._lensSumPanel9({
                arr: o,
                isOn9: (t) => !t.off,
                totalLabel: "إجمالي المعالم",
                totalTip: "كل معالم التشغيل الميداني المرسومة على خريطة هذا الموقع",
                onWord: "مفعّل",
                offWord: "معطّل",
                onDivWord: "المفعّل",
                offDivWord: "المعطّل",
                onHint: " — والحالة تُبدَّل من محرر المعلم أو زر التفعيل في سجل المعالم",
                dims: [
                  ["kind", "النوع"],
                  ["sector", "النطاق"],
                ],
                valsOf: (t, e) =>
                  "sector" === e ? [this._secLab(t, "mark")] : [String(null == (t && t[e]) ? "" : t[e]).trim() || "بلا نوع"],
                unitOf: () => "معلم",
                catNoteOf: () => "",
                colorOf: () => null,
                key9: "mops",
              })));
          else if (Ke && "dsum" === e.markDim) {
            zs = !0;
            const t = (t, e) =>
              "sector" === e ? [this._secLab(t, "mark")] : [String(null == (t && t[e]) ? "" : t[e]).trim() || "غير محدّد"];
            Es = this._distPanel9(
              { empList: f, scheduledEmps: v, shiftOpts: y, shiftByName: A, zonesAll: r, gatesAll: l, marksAll: o },
              {
                key9: "mdistp",
                arr: o,
                selfWord: "المعالم",
                locDim: null,
                secDims: [
                  ["kind", "النوع"],
                  ["sector", "النطاق"],
                ],
                valsOf: t,
                unitOf: () => "معلم",
                catNoteOf: () => "",
              },
            );
          } else
            ye && "summary" === e.distDim
              ? ((zs = !0),
                (Es = ws({
                  total: r.reduce((t, e) => t + (e.emp || []).length, 0) + l.reduce((t, e) => t + (e.emp || []).length, 0),
                  totalLabel: "إجمالي التسكينات",
                  unit: "تسكين",
                  unitOf: (t) => ("shift" === t || "state" === t ? "موظف" : "تسكين"),
                  dims: Gt,
                  itemsOf: Ss,
                })))
              : Rt &&
                "summary" === e.densDim &&
                ((zs = !0),
                (Es = ws({
                  total: r.length,
                  totalLabel: "إجمالي المصليات",
                  unit: "مصلٍّ",
                  hero: {
                    onN: r.filter((t) => null != N(t)).length,
                    offN: r.filter((t) => null == N(t)).length,
                    onWord: "لها سعة",
                    offWord: "بلا سعة",
                  },
                  unitOf: (t) => ("ready" === t ? "مصلى" : "مصلٍّ"),
                  dims: zt,
                  itemsOf: (t) => Ct(t).map((t) => ({ label: t.label, n: t.n, color: t.color })),
                })));
        else {
          zs = !0;
          const t = (t, e) =>
            "sector" === e
              ? [this._secLab(t, "zone")]
              : "ztypecat" === e
                ? [(String((t && t.ztype) || "").trim() || "بلا نوع") + " · " + (String((t && t.zcat) || "").trim() || "بلا فئة")]
                : "yard" === e
                  ? [String((t && t.yard) || "").trim() || "بلا ساحة"]
                  : [String(null == (t && t[e]) ? "" : t[e]).trim() || "غير محدّد"];
          Es = this._distPanel9(
            { empList: f, scheduledEmps: v, shiftOpts: y, shiftByName: A, zonesAll: r, gatesAll: l, marksAll: o },
            {
              key9: "zdistp",
              arr: r,
              selfWord: "المصليات",
              locDim: "yard",
              secDims: [
                ["ztypecat", "النوع والفئة"],
                ["sector", "النطاق"],
                ["region", "المنطقة"],
                ["yard", "الساحة"],
                ["level", "الدور / المستوى"],
                ["ztype", "النوع"],
                ["zcat", "الفئة"],
              ],
              valsOf: t,
              unitOf: () => "مصلى",
              catNoteOf: () => "",
            },
          );
        }
        const Ms = H,
          Os = i
            ? {
                t: "لا توجد مصليات لتعريف سعتها",
                x: "ارسم المصليات في عدسة «المصليات» أولًا، ثم عد إلى الكثافة لتعريف مساحتها ونصيب الفرد فيها.",
                p1: "M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",
                p2: "",
              }
            : "dist" === Y
              ? {
                  t: "لا توجد عناصر للتوزيع",
                  x: "ارسم المصليات في عدسة «المصليات» وضع الأبواب في عدسة «الأبواب» أولًا، ثم عد إلى التوزيع لتسكين الموظفين عليها.",
                  p1: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
                  p2: "M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
                }
              : "gates" === Y
                ? {
                    t: "لا توجد أبواب بعد",
                    x: "افتح عدسة «الأبواب» من شريط العدسات، ثم اختر أداة «وضع باب» وانقر على الخريطة لإضافة أول باب.",
                    p1: "M13 4h3a2 2 0 0 1 2 2v14",
                    p2: "M2 20h3",
                  }
                : "paths" === Y
                  ? {
                      t: "لا توجد مسارات بعد",
                      x: "اختر أداة «رسم مسار» من شريط الأدوات وحدّد نقاط المسار على الخريطة لإضافة أول مسار.",
                      p1: "M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15",
                      p2: "M9 19a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
                    }
                  : {
                      t: "الخريطة فارغة",
                      x: "استخدم أدوات الرسم بجانب الخريطة لرسم أول مصلى، وستظهر إحصاءات المصليات هنا.",
                      p1: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",
                      p2: "M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
                    },
          Cs = (t) =>
            "zstate" === lt
              ? t.off
                ? "معطّلة"
                : "مفعّلة"
              : "ztypecat" === lt
                ? (String(t.ztype || "").trim() || "بلا نوع") + " · " + (String(t.zcat || "").trim() || "بلا فئة")
                : String(null == t[lt] ? "" : t[lt]).trim() || "غير محدّد",
          Ps = r.map((t, e) => ({
            ...this._audHistOf("zone", t),
            olR: t,
            olI: e,
            gk: Cs(t),
            name: (t.code ? "#" + t.code : "مصلى") + (t.region ? " — " + t.region : ""),
            meta: [
              t.off ? "معطّلة" : "مفعّلة",
              [String(t.ztype || "").trim(), String(t.zcat || "").trim()].filter(Boolean).join(" · ") || null,
              i || !this.bsLensOn("dist") ? null : KIVO.BassamCount((t.emp || []).length, "موظف") + "",
            ]
              .filter(Boolean)
              .join(" · "),
            act: () => {
              this.flashSel({ t: "zone", i: e }, i ? "density" : null);
            },
            actTitle: i ? "تحديد المصلى وفتح سعته" : "تحديد المصلى وإظهار مكانه",
            canAct: !d && !i,
            offNow: !!t.off,
            onNow: !t.off,
            toggleOff: () => {
              d || this.setState({ zones: this.state.zones.map((t, s) => (s === e ? { ...t, off: !t.off } : t)) }, () => this.savePlan());
            },
            toggleTitle: t.off ? "تفعيل المصلى" : "إطفاء المصلى",
            canEdit: !0,
            edit: () => {
              d || this.openZoneEditor(e);
            },
            capOn: this.bsLensOn("dens"),
            areaTxt: (() => {
              const e = this.areaOfZone(t, F);
              return e > 0 ? R(e) + " م²" : "بلا مساحة";
            })(),
            areaStyle: (() =>
              "display:inline-flex;align-items:center;flex-shrink:0;white-space:nowrap;border-radius:9999px;padding:1px 7px;font-size:8px;font-weight:700;" +
              (this.areaOfZone(t, F) > 0
                ? "background:var(--bg-a3752630p07);color:var(--fg-x25343f);border:1px solid var(--bd-a3752630p18)"
                : "background:var(--bg-a1481631840p12);color:var(--fg-x94a3b8);border:1px solid var(--bd-a1481631840p3)"))(),
            capTxt: (() => {
              const e = N(t);
              return null == e ? "بلا سعة" : KIVO.BassamCount(j(e), "مصل") + "";
            })(),
            capTitle: (() => {
              const e = N(t),
                s = this.curDensLevel();
              return null == e ? this.zoneNeeds(t, F) : "السعة عند مستوى " + (s ? s.name + " (" + s.v + " م²/مصلٍّ)" : "—");
            })(),
            capStyle:
              "display:inline-flex;align-items:center;flex-shrink:0;white-space:nowrap;border-radius:9999px;padding:1px 7px;font-size:8px;font-weight:700;" +
              (null != N(t)
                ? "background:var(--bg-a185151810p1);color:var(--fg-x9a7e40);border:1px solid var(--bd-a185151810p3)"
                : "background:var(--bg-a245158110p1);color:var(--fg-xb45309);border:1px solid var(--bd-a245158110p3)"),
            color: (() => {
              if (t.off) return "#94a3b8";
              const e = this.zcatStyleOf(String(t.zcat || "").trim(), String(t.ztype || "").trim());
              return (e && e.f) || g[t.cat] || "#b99751";
            })(),
          })),
          Ts = l.map((t, e) => ({
            ...this._audHistOf("gate", t),
            olR: t,
            olI: e,
            gk: String(t.kind || "").trim() || "بلا نوع",
            name:
              (t.num ? "#" + t.num + " — " : "") +
              (t.label || "باب") +
              (KIVO.BassamLeaf.isParent(t) ? " · " + KIVO.BassamCount(KIVO.BassamLeaf.leafCount(t), "باب") + "" : ""),
            meta: KIVO.BassamLeaf.isParent(t)
              ? (() => {
                  const e = KIVO.BassamLeaf.agg(l, t);
                  return [
                    "باب أم",
                    "مفتوح " + e.open + " من " + e.n,
                    t.kind || null,
                    this.bsLensOn("dist") ? KIVO.BassamCount(e.plc, "موظف") + "" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ");
                })()
              : [
                  t.closed ? "مغلق" : "مفتوح",
                  t.kind || null,
                  this.bsLensOn("dist") ? KIVO.BassamCount((t.emp || []).length, "موظف") + "" : null,
                ]
                  .filter(Boolean)
                  .join(" · "),
            act: () => {
              this.flashSel({ t: "gate", i: e });
            },
            actTitle: "تحديد الباب وإظهار مكانه",
            canAct: !d,
            offNow: KIVO.BassamLeaf.closedOf(l, t),
            onNow: !KIVO.BassamLeaf.closedOf(l, t),
            toggleOff: () => {
              if (d) return;
              const t = KIVO.BassamLeaf,
                s = this.state.gates[e];
              if (t.isParent(s)) {
                const e = !t.closedOf(this.state.gates, s);
                return void this.setState({ gates: this.state.gates.map((t) => (t && t.pOf === s.gid ? { ...t, closed: e } : t)) }, () =>
                  this.savePlan(),
                );
              }
              this.setState({ gates: this.state.gates.map((t, s) => (s === e ? { ...t, closed: !t.closed } : t)) }, () => this.savePlan());
            },
            toggleTitle: KIVO.BassamLeaf.isParent(t)
              ? KIVO.BassamLeaf.closedOf(l, t)
                ? "فتح كل فتحات الباب"
                : "إغلاق كل فتحات الباب"
              : t.closed
                ? "فتح الباب"
                : "إغلاق الباب",
            canEdit: !0,
            edit: () => {
              d || this.openGateEditor(e);
            },
            color: KIVO.BassamLeaf.closedOf(l, t) ? "#64748b" : "#16a34a",
          })),
          Fs = (() => {
            const t = KIVO.BassamLeaf,
              s = e.gExp || {},
              n = {};
            return (
              Ts.forEach((e, s) => {
                const a = l[s];
                t.isParent(a) && ((n[a.gid] = e), (e.gid = a.gid));
              }),
              Ts.forEach((t, e) => {
                const s = l[e];
                s &&
                  s.pOf &&
                  n[s.pOf] &&
                  ((t.isKid = !0), (t.showAct = !0), (t.showDens = !1), (n[s.pOf].kids = n[s.pOf].kids || []).push(t));
              }),
              Ts.filter((t) => !t.isKid).map((t) =>
                t.kids
                  ? Object.assign(t, {
                      isParent: !0,
                      kidsOn: !!s[t.gid],
                      kidsN: String(t.kids.length),
                      kidsTitle: (s[t.gid] ? "طيّ فتحات الباب" : "فرد فتحات الباب") + " (" + t.kids.length + ") — يفردها على الخريطة أيضاً",
                      kidsTog: () => this._togLeafExp(t.gid),
                      kidsChev: "transition:transform .2s;flex-shrink:0;" + (s[t.gid] ? "transform:rotate(180deg)" : ""),
                    })
                  : t,
              )
            );
          })(),
          Ls = o.map((t, e) => ({
            ...this._audHistOf("mark", t),
            olR: t,
            olI: e,
            gk: String(t.kind || "").trim() || "بلا نوع",
            name: t.label || "معلم",
            meta: [
              t.off ? "معطّل" : "مفعّل",
              t.kind || null,
              this.bsLensOn("dist") ? KIVO.BassamCount((t.emp || []).length, "موظف") + "" : null,
            ]
              .filter(Boolean)
              .join(" · "),
            act: () => {
              this.flashSel({ t: "mark", i: e });
            },
            actTitle: "تحديد المعلم وإظهار مكانه",
            canAct: !d,
            offNow: !!t.off,
            onNow: !t.off,
            toggleOff: () => {
              d ||
                this.setState({ marks: (this.state.marks || []).map((t, s) => (s === e ? { ...t, off: !t.off } : t)) }, () =>
                  this.savePlan(),
                );
            },
            toggleTitle: t.off ? "تفعيل المعلم" : "تعطيل المعلم",
            canEdit: !0,
            edit: () => {
              d || this.openMarkEditor(e);
            },
            color: t.off ? "#64748b" : "#9c3d6b",
          })),
          Ds = h.map((t, e) => ({
            ...this._audHistOf("path", t),
            olR: t,
            olI: e,
            gk: (mt[t.type] || mt.in).label,
            name: (t.code ? t.code + " — " : "") + (t.name || "مسار") + " · " + (mt[t.type] || mt.in).label,
            meta: [
              "two" === t.dir ? "اتجاهان" : "اتجاه واحد",
              (kt.find((e) => e[0] === (t.line || "dash")) || kt[1])[1],
              !1 === t.active ? "معطّل" : "مفعّل",
            ].join(" · "),
            act: () => {
              this.flashSel({ t: "path", i: e });
            },
            actTitle: "تحديد المسار وإظهار مكانه",
            canAct: !d,
            offNow: !1 === t.active,
            onNow: !1 !== t.active,
            toggleOff: () => {
              d ||
                this.setState({ paths: this.state.paths.map((t, s) => (s === e ? { ...t, active: !(!1 !== t.active) } : t)) }, () =>
                  this.savePlan(),
                );
            },
            toggleTitle: !1 === t.active ? "تفعيل المسار" : "تعطيل المسار",
            canEdit: !0,
            edit: () => {
              d || this.openPathEditor(e);
            },
            color: vt(t),
          })),
          Ns =
            this.bsLensOn("dist") &&
            (("gates" === Y && "dsum" === e.gateDim) ||
              ("zones" === Y && !i && "dsum" === e.brkDim) ||
              ("marks" === Y && "dsum" === e.markDim));
        let Bs;
        if ("dist" === Y || Ns) {
          const t = {},
            e = {},
            s = (s, n, a) => {
              ((s = this._ck(s)), (t[s] = t[s] ? t[s] + " · " + n : n), e[s] || (e[s] = a));
            },
            n = {},
            a = {};
          ((("dist" === Y && this.bsLensOn("zones")) || "zones" === Y ? r : []).forEach((t, e) => {
            const a = t.code ? "#" + t.code : "مصلى";
            ((n[a] = e), (t.emp || []).forEach((t) => s(t, a, { t: "zone", i: e })));
          }),
            (("dist" === Y && this.bsLensOn("gates")) || "gates" === Y ? l : []).forEach((t, e) =>
              (t.emp || []).forEach((n) => s(n, (t.num ? "#" + t.num + " " : "") + (t.label || "باب"), { t: "gate", i: e })),
            ),
            (("dist" === Y && this.bsLensOn("marks")) || "marks" === Y ? o : []).forEach((t, e) => {
              const n = t.label || "معلم";
              ((a[n] = e), (t.emp || []).forEach((t) => s(t, n, { t: "mark", i: e })));
            }));
          const i = {};
          (Ns &&
            ("zones" === Y || !this.bsLensOn("zones") ? [] : r)
              .concat("gates" === Y || !this.bsLensOn("gates") ? [] : l)
              .concat("marks" === Y || !this.bsLensOn("marks") ? [] : o)
              .forEach((e) =>
                (e.emp || []).forEach((e) => {
                  ((e = this._ck(e)), t[e] || (i[e] = 1));
                }),
              ),
            (Bs = f
              .filter((t) => t && t.name)
              .map((s) => {
                const K = this._ekeyOf(s);
                return {
                  olE: s,
                  olPl: t[K] || "",
                  olAt: e[K] || null,
                  olOt: !!i[K],
                  olRs: !!E[s.name],
                  olSh: A[s.name] || "",
                  gk: t[K] || (i[K] ? "مسكَّن على نوعٍ آخر" : "غير مسكّن"),
                  name: s.name + (E[s.name] ? " · في راحة" : A[s.name] ? "" : " · بدون وردية"),
                  meta: t[K] || (i[K] ? "مسكَّن على نوعٍ آخر" : "غير مسكّن"),
                  canAct: !1,
                  act: () => {
                    const t = e[K];
                    t && this.flashSel(t, "dist" === Y ? "dist" : null);
                  },
                  actTitle: e[K] ? "إظهار مكان تكليفه على الخريطة" : "غير مسكّن — لا مكان لإظهاره",
                  color: t[K] ? "#10b981" : i[K] ? "#b25c8a" : E[s.name] ? "#e5b563" : "#ef4444",
                };
              })));
        } else Bs = "gates" === Y ? Fs : "marks" === Y ? Ls : "paths" === Y ? Ds : Ps;
        const olB = Bs,
          Ws = (e.regQ || "").trim().toLowerCase();
        Ws &&
          (Bs = KIVO.BassamFind.filter(Ws, Bs, (t) => [
            t.name,
            t.meta,
            t.code,
            t.type,
          ]));
        const Is = e.regOpen || {},
          js = [],
          Rs = {};
        Bs.forEach((t) => {
          const e = t.gk || "غير محدّد";
          (Rs[e] || ((Rs[e] = []), js.push(e)), Rs[e].push(t));
        });
        const Gs = js.map((t) => {
            const e = Rs[t],
              s = Y + "|" + ("zones" === Y ? lt : "-") + "|" + t,
              n = !!Is[s];
            let a = !1,
              i = "",
              l = "",
              d = [],
              h = "",
              p = "",
              c = "";
            if (
              "dist" === Y &&
              (("undefined" != typeof gkZone && null != gkZone[t]) || ("undefined" != typeof gkMark && null != gkMark[t]))
            ) {
              const e = "undefined" != typeof gkZone && null != gkZone[t] ? r[gkZone[t]] : o[gkMark[t]],
                s = e ? M(e) : null;
              if (null != s) {
                ((a = !0), (i = s + "٪"));
                const t = (e.emp || []).filter((t) => E[t]).length;
                if (t > 0) {
                  const s = (e.emp || []).filter((t) => A[t] && !E[t]).length < KIVO.BassamNeed.tot(e, y);
                  ((h = String(t)),
                    (p =
                      "flex-shrink:0;display:inline-flex;align-items:center;gap:2px;font-size:8px;font-weight:700;border-radius:9999px;padding:1px 6px;font-feature-settings:'tnum';" +
                      (s
                        ? "color:var(--fg-xb91c1c);background:var(--bg-a22038380p08);border:1px solid var(--bd-a22038380p4)"
                        : "color:var(--fg-xb45309);background:var(--bg-a245158110p1);border:1px solid var(--bd-a245158110p4)")),
                    (c = t + " من مسكّني المصلى في راحة اليوم" + (s ? " — التغطية الفعلية اليوم دون الاحتياج، تلزم تغطية بديلة" : "")));
                }
                const n = s >= 100 ? "#008450" : s >= 60 ? "#b45309" : "#dc2626";
                ((l =
                  "flex-shrink:0;font-size:8.5px;font-weight:700;color:" +
                  n +
                  ";background:var(--bg-xffffff);border:1px solid " +
                  n +
                  "55;border-radius:9999px;padding:1px 6px;font-feature-settings:'tnum'"),
                  (d = y.map((t) => ({
                    color: t.color,
                    count: String((e.emp || []).filter((e) => A[e] === t.name).length),
                    title:
                      t.name +
                      ": " +
                      KIVO.BassamCount((e.emp || []).filter((e) => A[e] === t.name).length, [
                        "مسكَّن واحد",
                        "مسكَّنان",
                        "مسكَّنَين",
                        "مسكَّنين",
                        "مسكَّناً",
                        "مسكَّن",
                      ]) +
                      " (الاحتياج " +
                      +e.needN +
                      ")",
                  }))));
              }
            }
            return {
              label: t,
              count: String(e.length),
              rows: e,
              color: (e[0] && e[0].color) || "#cbd5e1",
              covOn: a,
              covPct: i,
              covPctStyle: l,
              shiftDots: d,
              restOn: "" !== h,
              restBadge: h,
              restBadgeStyle: p,
              restBadgeTitle: c,
              open: n,
              closed: !n,
              chev: "transition:transform .15s;flex-shrink:0" + (n ? ";transform:rotate(180deg)" : ""),
              toggle: () => this.setState({ regOpen: { ...(this.state.regOpen || {}), [s]: !n } }),
            };
          }),
          Zs = 0 === Gs.length,
          Ys = [
            [
              "zones",
              "المصليات",
              r.length,
              "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",
              "M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
            ],
            ["paths", "المسارات", h.length, "M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15", "M9 19a3 3 0 1 1-6 0 3 3 0 0 1 6 0"],
            [
              "marks",
              "المعالم",
              o.length,
              "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",
              "M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
            ],
            [
              "gates",
              "الأبواب",
              l.length,
              "M13 4h3a2 2 0 0 1 2 2v14",
              "M2 20h3",
              "M13 20h9",
              "M10 12v.01",
              "M13 2.5V20a2 2 0 0 1-2.437 1.953l-5-1.25A2 2 0 0 1 4 18.75V4.5a2 2 0 0 1 2.437-1.953l5 1.25A2 2 0 0 1 13 4.5",
            ],
            [
              "dens",
              "الكثافة",
              r.filter((t) => null != N(t)).length,
              "M19 5 5 19",
              "M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM17.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
            ],
          ]
            .filter((t) => "dens" !== t[0] && "paths" !== t[0] && this.bsLensOn(t[0]))
            .map((t) => {
              const e = Y === t[0] || ("zones" === t[0] && ("dens" === Y || "paths" === Y));
              return {
                label: t[1],
                paths: t.slice(3).filter(Boolean),
                click: () =>
                  this.setState(
                    "dist" === t[0]
                      ? {
                          panelTab: "dist",
                          lens: "dist",
                          distDim: "summary",
                          tool: "select",
                          sel: null,
                          selMulti: [],
                          hoverZone: null,
                          hoverGate: null,
                          draft: null,
                          polyPts: [],
                          polyCursor: null,
                        }
                      : "gates" === t[0]
                        ? {
                            panelTab: "gates",
                            lens: "gates",
                            gateDim: "summary",
                            tool: "select",
                            sel: null,
                            selMulti: [],
                            hoverZone: null,
                            hoverGate: null,
                            hoverPath: null,
                            draft: null,
                            polyPts: [],
                            polyCursor: null,
                          }
                        : "marks" === t[0]
                          ? {
                              panelTab: "marks",
                              lens: "marks",
                              markDim: this.state.mAsn ? "dsum" : "summary",
                              tool: "select",
                              sel: null,
                              selMulti: [],
                              hoverZone: null,
                              hoverGate: null,
                              hoverPath: null,
                              draft: null,
                              polyPts: [],
                              polyCursor: null,
                            }
                          : "paths" === t[0]
                            ? Object.assign(
                                {
                                  panelTab: "paths",
                                  lens: "plan",
                                  sel: null,
                                  selMulti: [],
                                  hoverZone: null,
                                  hoverGate: null,
                                  hoverPath: null,
                                },
                                { pathDim: "summary" },
                              )
                            : "dens" === t[0]
                              ? {
                                  panelTab: "dens",
                                  lens: "density",
                                  densDim: "summary",
                                  tool: "select",
                                  sel: null,
                                  selMulti: [],
                                  hoverZone: null,
                                  hoverGate: null,
                                  draft: null,
                                  polyPts: [],
                                  polyCursor: null,
                                }
                              : {
                                  panelTab: t[0],
                                  lens: "plan",
                                  brkDim: "zones" === t[0] && this.state.zAsn ? "dsum" : "summary",
                                  tool: "select",
                                  sel: null,
                                  selMulti: [],
                                  hoverZone: null,
                                  hoverGate: null,
                                  draft: null,
                                  polyPts: [],
                                  polyCursor: null,
                                },
                  ),
                on: e,
                iconColor: e ? "#b99751" : "#94a3b8",
                labelColor: e ? "#b99751" : "#64748b",
                style: "cursor:pointer",
              };
            });
        return {
          panelShellStyle:
            "order:-1;position:relative;width:var(--bs-panel-w);flex-shrink:0;align-self:stretch;transition:margin .35s cubic-bezier(0.22,1,0.36,1);" +
            (t ? "margin-left:0" : "margin-left:calc(-1 * var(--bs-panel-w) - 12px);pointer-events:none"),
          panelStyle:
            "position:absolute;top:0;right:0;bottom:0;left:0;border-radius:16px;border:1px solid var(--bd-a2252252250p7);background:var(--bg-xffffff);overflow:hidden;box-shadow:var(--shadow-card);display:flex;flex-direction:column;transition:transform .35s cubic-bezier(0.22,1,0.36,1),opacity .3s ease;" +
            (t ? "transform:translateX(0);opacity:1" : "transform:translateX(40px);opacity:0"),
          panelClosed: !t,
          closePanel: () => this.setState({ panelOpen: !1 }),
          openPanel: () => this.setState({ panelOpen: !0 }),
          panelTitle: "عناصر الخريطة",
          panelSub:
            "dist" === Y
              ? "توزيع الموظفين على المصليات والأبواب" +
                (w
                  ? " · " +
                    KIVO.BassamCount(w, ["مسكَّن واحد", "مسكَّنان", "مسكَّنَين", "مسكَّنين", "مسكَّناً", "مسكَّن"]) +
                    " خارج جدول الشهر"
                  : "")
              : "gates" === Y
                ? "استعراض وتحديد سريع للأبواب"
                : "paths" === Y
                  ? "مسارات الحركة واتجاهاتها"
                  : "استعراض وتحديد سريع للمصليات",
          panelIcon1: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",
          panelIcon2: "M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
          isZonesLens: Ys.length > 1,
          sumOn: Ye,
          sumNode: He,
          lensSumOn: zs,
          lensSumNode: Es,
          repDept: (() => {
            try {
              return (KIVO.BassamDepts && KIVO.BassamDepts.activeName()) || "الإدارة";
            } catch (t) {
              return "الإدارة";
            }
          })(),
          repToday: (() => {
            try {
              const t = KIVO.BassamHijri.now();
              return (
                t.d +
                " " +
                (this.MONTHS[t.m] || "") +
                " " +
                t.y +
                "هـ" +
                " الموافق " +
                new Date().toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" })
              );
            } catch (t) {
              return "";
            }
          })(),
          repPage:
            "الموقع " +
            ((e.floor || 0) + 1) +
            " من " +
            ((e.floors || []).length || 1),
          showDonut:
            !Ye &&
            !zs &&
            !Ms &&
            (("zones" === Y && !i && St.length > 0) ||
              (ds && h.length > 0) ||
              (Ue && l.length > 0) ||
              (ye && u.length > 0) ||
              (Rt && r.length > 0)),
          registryTitle:
            "dist" === Y
              ? "سجل التسكين"
              : "gates" === Y
                ? "dsum" === e.gateDim
                  ? "سجل تسكين الأبواب"
                  : "سجل الأبواب"
                : "marks" === Y
                  ? "dsum" === e.markDim
                    ? "سجل تسكين المعالم"
                    : "سجل المعالم"
                  : "paths" === Y
                    ? "سجل المسارات"
                    : i || "dsum" !== e.brkDim
                      ? "سجل المصليات"
                      : "سجل تسكين المصليات",
          panelHasData: !Ms,
          panelEmpty: Ms,
          panelEmptyTitle: Os.t,
          panelEmptyText: Os.x,
          panelEmptyP1: Os.p1,
          panelEmptyP2: Os.p2,
          panelTabs: Ys,
          panelKpis: Ms || "zones" === Y ? [] : P,
          catRows: B,
          registryRows: Ms ? [] : Bs,
          ...this._olVals({
            Y: Y,
            i: i,
            Ns: Ns,
            B: olB,
            l: l,
            y: y,
            A: A,
            M: M,
            mt: mt,
            kt: kt,
            xt: xt,
          }),
          regGroups: Ms ? [] : Gs,
          regEmpty: Ms || Zs,
          covOn: "dist" === Y && !Ms && Ut > 0,
          covSitePct: String(Vt),
          covSiteBar:
            "height:100%;border-radius:9999px;background:linear-gradient(to left,var(--bg-xb99751),var(--bg-x9a7e40));width:" +
            Math.min(100, Vt) +
            "%",
          covSiteColor:
            Vt >= 100 ? "#008450" : Vt >= 60 ? "#9A7E40" : "#dc2626",
          covShiftRows: Jt,
          covNeedTotal: String(Ut),
          selCovOn: ee,
          mkEditOn: !!e.mkEdit,
          mkLabel: e.mkEdit ? e.mkEdit.label : "",
          ...(() => {
            const t = e.mkEdit || {},
              s = "أ" === t.pri || "ب" === t.pri || "ج" === t.pri ? t.pri : "",
              n = { أ: "#8A6F35", ب: "#53565a", ج: "#1668a1" },
              a = (t) =>
                "flex:1;height:30px;border-radius:9px;cursor:pointer;font-family:'Cairo',sans-serif;font-size:12.5px;font-weight:700;transition:all .15s;border:1.5px solid " +
                (s === t ? n[t] : "var(--bd-xe1e1e1)") +
                ";background:" +
                (s === t ? n[t] + "14" : "#fff") +
                ";color:" +
                (s === t ? n[t] : "var(--fg-x94a3b8)"),
              i = (t) => () => this.setState({ mkEdit: { ...this.state.mkEdit, pri: s === t ? "" : t } });
            return {
              mkPriASt: a("أ"),
              mkPriBSt: a("ب"),
              mkPriJSt: a("ج"),
              onMkPriA: i("أ"),
              onMkPriB: i("ب"),
              onMkPriJ: i("ج"),
              mkPriMeaning: s ? { أ: "لا يُخلى أبداً", ب: "يُخفَّض عند الضرورة", ج: "أول ما يُسحب منه" }[s] : "غير مصنَّف",
              mkPriMeanSt: "font-size:9.5px;font-weight:400;color:" + (s ? n[s] : "var(--fg-x94a3b8)"),
            };
          })(),
          onMkLabel: (t) =>
            this.setState({
              mkEdit: { ...this.state.mkEdit, label: t.target.value },
            }),
          mkKinds: (() => {
            const t = this._markKinds(),
              s = (e.mkEdit && e.mkEdit.kind) || "",
              n = t.map((t) => ({ v: t, sel: t === s }));
            return (n.unshift({ v: "", sel: !s, none: !0 }), n.map((t) => ({ val: t.v, txt: t.none ? "— بلا نوع —" : t.v, sel: t.sel })));
          })(),
          onMkKind: (t) =>
            this.setState({
              mkEdit: { ...this.state.mkEdit, kind: t.target.value },
            }),
          mkNewKind: (e.mkEdit && e.mkEdit.newKind) || "",
          onMkNewKind: (t) =>
            this.setState({
              mkEdit: { ...this.state.mkEdit, newKind: t.target.value },
            }),
          mkAddKind: async () => {
            const t = this.state.mkEdit;
            if (!t || !(t.newKind || "").trim()) return;
            const e = t.newKind.trim();
            if (await this._addMarkKind(e))
              this.setState({ mkEdit: { ...t, kind: e, newKind: "" } });
          },
          mkNeed: (e.mkEdit && e.mkEdit.needN) || "",
          mkNeedShOn: !!e.mkEdit,
          mkNeedChips: e.mkEdit ? this._needChips("mkEdit") : [],
          mkNeedPlain: !(e.mkEdit && this._needChips("mkEdit").length),
          mkNeedTot: e.mkEdit ? String(this._needTotOf("mkEdit")) : "0",
          onMkNeed: (t) => this.setState({ mkEdit: { ...this.state.mkEdit, needN: t.target.value.replace(/[^0-9]/g, "").slice(0, 4) } }),
          mkHideLabel: !!e.mkEdit && !!e.mkEdit.hideLabel,
          mkToggleLabel: () => this.setState({ mkEdit: { ...this.state.mkEdit, hideLabel: !this.state.mkEdit.hideLabel } }),
          mkOffTxt:
            e.mkEdit && e.mkEdit.off
              ? "معطّل — اضغط للتفعيل"
              : "مفعّل — اضغط للتعطيل",
          mkOffStyle:
            e.mkEdit && e.mkEdit.off
              ? "height:30px;padding:0 12px;border-radius:8px;border:1px solid var(--bd-a22038380p4);background:var(--bg-a22038380p07);color:var(--fg-xb91c1c);font-size:10px;font-weight:600;cursor:pointer;font-family:'Cairo',sans-serif"
              : "height:30px;padding:0 12px;border-radius:8px;border:1px solid var(--bd-a0163870p35);background:var(--bg-a0163870p06);color:var(--fg-x047857);font-size:10px;font-weight:600;cursor:pointer;font-family:'Cairo',sans-serif",
          mkToggleOff: () =>
            this.setState({
              mkEdit: { ...this.state.mkEdit, off: !this.state.mkEdit.off },
            }),
          mkSave: () => this.saveMarkEdit(),
          mkCancel: () => this.setState({ mkEdit: null }),
          mkDelete: () => {
            const t = this.state.mkEdit;
            t &&
              this.setState({ marks: (this.state.marks || []).filter((e, s) => s !== t.i), sel: null, selMulti: [], mkEdit: null }, () =>
                this.savePlan(),
              );
          },
          assignOverOn: !!e.assignOverAsk,
          assignOverText: e.assignOverAsk ? e.assignOverAsk.txt : "",
          assignOverConfirm: () => {
            const t = this.state.assignOverAsk;
            t && qt(t.name);
          },
          assignOverCancel: () => this.setState({ assignOverAsk: null }),
          selCovLine: ee
            ? "الاحتياج " + se + " · سُكّن " + ae + (re > 0 ? " · فائض +" + re : ie > 0 ? " · المتبقي " + ie : " · مكتمل ✓")
            : "",
          selCovStyle: ee
            ? "font-size:9.5px;font-weight:600;border-radius:8px;padding:5px 9px;border:1px solid;" +
              (ie > 0
                ? "background:var(--bg-a245158110p08);border-color:var(--bd-a245158110p35);color:var(--fg-xb45309)"
                : re > 0
                  ? "background:var(--bg-a81451780p07);border-color:var(--bd-a81451780p3);color:var(--fg-x0e7490)"
                  : "background:var(--bg-a0163870p07);border-color:var(--bd-a0163870p25);color:var(--fg-x047857)")
            : "",
          showKpis: !Ms && "zones" !== Y && P.length > 0,
          heroTiles: K,
          showHeroTiles: K.length > 0,
          kpiGridStyle:
            "display:grid;gap:8px;grid-template-columns:repeat(" +
            (K.length ? 2 : 3) +
            ",1fr)",
          mixTabs: Rt ? gt : ye ? ce : Ke ? Re : Ue ? Pe : gt,
          showSplitHdr: !(Rt || ye || Ue || ds || "zstate" === lt),
          mixRows: Rt ? Nt : ye ? ue : Ke ? Ze : Ue ? Fe : ds ? ls : St,
          showMixTabs:
            !!Rt || (ye ? ce.length > 0 : Ke ? Re.length > 0 : Ue ? Pe.length > 0 : !!ds || Ye || "dsum" === e.brkDim || St.length > 0),
          showDonutRing: !(
            (Rt && 0 === Nt.length) ||
            (ye && 0 === ue.length) ||
            (Ke && 0 === Ze.length) ||
            (Ue && 0 === Fe.length) ||
            (ds && 0 === ls.length)
          ),
          mixEmptyOn:
            (Rt && 0 === Nt.length) ||
            (ye && 0 === ue.length) ||
            (Ke && 0 === Ze.length) ||
            (Ue && 0 === Fe.length) ||
            (ds && 0 === ls.length),
          mixEmptyText: ye ? "لا بيانات لهذا البُعد — جرّب بُعداً آخر أو أكمل جدول الشهر" : "لا بيانات لهذا البُعد — جرّب بُعداً آخر",
          mixNoteOn:
            (Ue && Ae && Fe.length > 0) ||
            (ye && ue.length > 0 && ("place" === Zt || "cat" === Zt)),
          mixNote: ye
            ? "الموظف قد يُسكَّن على أكثر من عنصر — والنسبة من مجموع التسكينات"
            : "الباب قد يحمل أكثر من تخصيص — والنسبة من مجموع الانتماءات",
          donutCore:
            "width:66px;height:66px;border-radius:9999px;background:var(--bg-xffffff);display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:inset 0 2px 5px rgba(15,23,42,0.16),inset 0 -1px 0 rgba(255,255,255,0.9),inset 0 0 0 1px rgba(185,151,81,0.10)",
          donutNumStyle: "font-size:19px;font-weight:700;line-height:1;color:var(--fg-x9a7e40);font-feature-settings:'tnum'",
          bulkEdit: () => this.openBulkEditor(),
          bEditOn: !!e.bEdit,
          bEditN: e.bEdit ? e.bEdit.n : 0,
          bIsZone: !(!e.bEdit || "zone" !== e.bEdit.t),
          bIsGate: !(!e.bEdit || "gate" !== e.bEdit.t),
          bIsPath: !(!e.bEdit || "path" !== e.bEdit.t),
          bApply: () => this.applyBulkEditor(),
          bCancel: () => this.setState({ bEdit: null, bDd: null }),
          bFieldsNode: (() => {
            const t = e.bEdit;
            if (!t) return null;
            const s = React.createElement,
              n = "بلا تغيير",
              a = (t) =>
                s(
                  "span",
                  {
                    dir: "ltr",
                    style: {
                      fontFamily: "'Cairo',sans-serif",
                      fontFeatureSettings: "'tnum'",
                      fontSize: 10,
                      fontWeight: 400,
                      color: "var(--fg-x9a7e40)",
                      flexShrink: 0,
                    },
                  },
                  "#" + t,
                ),
              i = (t) =>
                s("span", {
                  style: {
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    flexShrink: 0,
                    background: t,
                    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.12)",
                  },
                }),
              r = (r, l, o, d) => {
                const h = e.bDd === r,
                  p = t[r] || "",
                  c = (t) =>
                    this.setState((e) => {
                      const s = { ...(e.bEdit || {}), [r]: t };
                      return (d && d(s, t), { bEdit: s, bDd: null });
                    }),
                  g = h
                    ? s(
                        "div",
                        {
                          className: "bs-optmenu",
                          style: {
                            position: "absolute",
                            top: "100%",
                            right: 0,
                            left: 0,
                            zIndex: 60,
                            marginTop: 4,
                            background: "var(--bg-xffffff)",
                            border: "1px solid var(--bd-a185151810p35)",
                            borderRadius: 10,
                            boxShadow: "0 12px 30px -8px rgba(0,0,0,0.30)",
                            maxHeight: 170,
                            overflowY: "auto",
                            padding: 4,
                          },
                        },
                        [{ name: "" }].concat(o).map((t, e) => {
                          const r = "" === t.name,
                            l = r ? !p : p === t.name;
                          return s(
                            "div",
                            {
                              key: "r" + e,
                              onClick: () => c(t.name),
                              style: {
                                display: "flex",
                                alignItems: "center",
                                gap: 7,
                                padding: "7px 9px",
                                borderRadius: 7,
                                cursor: "pointer",
                                fontSize: 11,
                                fontFamily: "'Cairo',sans-serif",
                                transition: "background .15s",
                                background: l ? "var(--bg-a185151810p1)" : "transparent",
                                fontWeight: l ? 800 : r ? 700 : 400,
                                color: l ? "var(--fg-x9a7e40)" : r ? "var(--fg-x64748b)" : "var(--fg-x25343f)",
                                borderBottom: r ? "1px solid #f1f5f9" : "0",
                              },
                            },
                            t.dot ? i(t.dot) : null,
                            t.code ? a(t.code) : null,
                            s(
                              "span",
                              { style: { flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } },
                              r ? n : t.name,
                            ),
                          );
                        }),
                        0 === o.length
                          ? s(
                              "div",
                              { style: { fontSize: 10, color: "var(--fg-x94a3b8)", padding: "8px", textAlign: "center", lineHeight: 1.7 } },
                              "لا خيارات معرّفة بعد — تُضاف من محرر العنصر نفسه",
                            )
                          : null,
                      )
                    : null,
                  f = o.find((t) => t.name === p);
                return s(
                  "div",
                  { key: r, style: { position: "relative", minWidth: 0 } },
                  s(
                    "label",
                    {
                      style: {
                        fontSize: 10,
                        fontWeight: 600,
                        color: "var(--fg-x8b9099)",
                        display: "block",
                        marginBottom: 4,
                        fontFamily: "'Cairo',sans-serif",
                      },
                    },
                    l,
                  ),
                  s(
                    "button",
                    {
                      onClick: () => this.setState({ bDd: h ? null : r }),
                      style: {
                        width: "100%",
                        height: 34,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "0 10px",
                        borderRadius: 8,
                        border: "1px solid " + (h ? "var(--bd-xb99751)" : "var(--bd-xe1e1e1)"),
                        background: "var(--bg-xffffff)",
                        cursor: "pointer",
                        fontFamily: "'Cairo',sans-serif",
                        fontSize: 11.5,
                        fontWeight: 400,
                        color: p ? "var(--fg-x141414)" : "var(--fg-x94a3b8)",
                        boxSizing: "border-box",
                      },
                    },
                    f && f.dot ? i(f.dot) : null,
                    f && f.code ? a(f.code) : null,
                    s(
                      "span",
                      {
                        style: {
                          flex: 1,
                          minWidth: 0,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          textAlign: "right",
                        },
                      },
                      p || n,
                    ),
                    ((t) =>
                      s(
                        "svg",
                        {
                          width: 12,
                          height: 12,
                          viewBox: "0 0 24 24",
                          fill: "none",
                          stroke: "currentColor",
                          strokeWidth: 2.4,
                          strokeLinecap: "round",
                          strokeLinejoin: "round",
                          style: { flexShrink: 0, transition: "transform .2s", opacity: 0.55, transform: t ? "rotate(180deg)" : "none" },
                        },
                        s("path", { d: "m6 9 6 6 6-6" }),
                      ))(h),
                  ),
                  g,
                );
              },
              l = (t, e, s) =>
                this.zoneOptList(t)
                  .filter((t) => !s || s(t))
                  .map((t) => ({ name: this._optName(t), code: e ? this._optCode(t) : "" }));
            if ("zone" === t.t) {
              const e = (t.region || "").trim(),
                n = (t.ztype || "").trim();
              return s(
                "div",
                { id: "bsBkDds", style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 } },
                r(
                  "yard",
                  "الساحة",
                  this.GATE_LOCS.map((t) => ({ name: t[0], dot: t[1] })),
                ),
                r("region", "المنطقة", l("region", !0), (t, e) => {
                  const s = (t.level || "").trim();
                  s && e && (this.zoneOptList("level").some((t) => !(this._optName(t) !== s || (t && t.r && t.r !== e))) || (t.level = ""));
                }),
                r(
                  "level",
                  "الدور / المستوى",
                  l("level", !0, (t) => !(t && t.r && e && t.r !== e)),
                ),
                r("ztype", "النوع", l("ztype", !0), (t, e) => {
                  const s = (t.zcat || "").trim();
                  s && e && (this.zoneOptList("zcat").some((t) => this._optName(t) === s && this._catFitsType(t, e)) || (t.zcat = ""));
                }),
                r(
                  "zcat",
                  "الفئة",
                  l("zcat", !1, (t) => this._catFitsType(t, n)),
                ),
              );
            }
            if ("gate" === t.t) {
              const t = (t) => this.gateOptList(t).map((t) => ({ name: t }));
              return s(
                "div",
                { id: "bsBkDds", style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 } },
                r(
                  "loc",
                  "الموقع",
                  this.GATE_LOCS.map((t) => ({ name: t[0], dot: t[1] })),
                ),
                r("kind", "الفئة", t("kind")),
                r("route", "المسار", t("route")),
                r("cls", "التصنيف", t("cls")),
              );
            }
            const o = (e, a, i) =>
              s(
                "div",
                { style: { marginBottom: 10 } },
                s(
                  "span",
                  {
                    style: {
                      display: "block",
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--fg-x8b9099)",
                      marginBottom: 4,
                      fontFamily: "'Cairo',sans-serif",
                    },
                  },
                  a + ("" === (t[e] || "") ? " — " + n : ""),
                ),
                s(
                  "div",
                  { style: { display: "flex", gap: 6 } },
                  i.map((n) => {
                    const a = (t[e] || "") === n.v,
                      i = n.c || "#9A7E40";
                    return s(
                      "button",
                      {
                        key: n.v,
                        onClick: () => this.setState((t) => ({ bEdit: { ...t.bEdit, [e]: a ? "" : n.v } })),
                        style: {
                          flex: 1,
                          height: 32,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 5,
                          borderRadius: 9,
                          fontSize: 10.5,
                          fontWeight: 400,
                          cursor: "pointer",
                          fontFamily: "'Cairo',sans-serif",
                          transition: "all .15s",
                          border: "1px solid " + (a ? i : "var(--bd-xe1e1e1)"),
                          background: a ? i + "14" : "var(--bg-xffffff)",
                          color: a ? i : "var(--fg-x64748b)",
                        },
                      },
                      n.c ? s("span", { style: { width: 8, height: 8, borderRadius: 9999, flexShrink: 0, background: n.c } }) : null,
                      n.l,
                    );
                  }),
                ),
              );
            return s(
              "div",
              { id: "bsBkDds" },
              o(
                "type",
                "نوع المسار",
                yt.map((t) => ({ v: t, l: mt[t].label, c: mt[t].c })),
              ),
              o(
                "line",
                "شكل الخط",
                kt.map((t) => ({ v: t[0], l: t[1] })),
              ),
              o(
                "w",
                "سماكة الخط",
                xt.map((t) => ({ v: t[0], l: t[1] })),
              ),
            );
          })(),
          bOffKeep: () =>
            this.setState((t) => ({ bEdit: { ...t.bEdit, off: "" } })),
          bOffKeepS:
            "font-family:'Cairo',sans-serif;font-size:10px;font-weight:600;padding:5px 0;flex:1;border-radius:9999px;cursor:pointer;border:0;background:" +
            (e.bEdit && "" === (e.bEdit.off || "")
              ? "#fff;color:var(--fg-x9a7e40);box-shadow:var(--shadow-card)"
              : "transparent;color:var(--fg-x64748b)"),
          bOffYes: () =>
            this.setState((t) => ({ bEdit: { ...t.bEdit, off: "yes" } })),
          bOffYesS:
            "font-family:'Cairo',sans-serif;font-size:10px;font-weight:600;padding:5px 0;flex:1;border-radius:9999px;cursor:pointer;border:0;background:" +
            (e.bEdit && "yes" === (e.bEdit.off || "")
              ? "#fff;color:var(--fg-x9a7e40);box-shadow:var(--shadow-card)"
              : "transparent;color:var(--fg-x64748b)"),
          bOffNo: () =>
            this.setState((t) => ({ bEdit: { ...t.bEdit, off: "no" } })),
          bOffNoS:
            "font-family:'Cairo',sans-serif;font-size:10px;font-weight:600;padding:5px 0;flex:1;border-radius:9999px;cursor:pointer;border:0;background:" +
            (e.bEdit && "no" === (e.bEdit.off || "")
              ? "#fff;color:var(--fg-x9a7e40);box-shadow:var(--shadow-card)"
              : "transparent;color:var(--fg-x64748b)"),
          bClosedKeep: () =>
            this.setState((t) => ({ bEdit: { ...t.bEdit, closed: "" } })),
          bClosedKeepS:
            "font-family:'Cairo',sans-serif;font-size:10px;font-weight:600;padding:5px 0;flex:1;border-radius:9999px;cursor:pointer;border:0;background:" +
            (e.bEdit && "" === (e.bEdit.closed || "")
              ? "#fff;color:var(--fg-x9a7e40);box-shadow:var(--shadow-card)"
              : "transparent;color:var(--fg-x64748b)"),
          bClosedYes: () =>
            this.setState((t) => ({ bEdit: { ...t.bEdit, closed: "yes" } })),
          bClosedYesS:
            "font-family:'Cairo',sans-serif;font-size:10px;font-weight:600;padding:5px 0;flex:1;border-radius:9999px;cursor:pointer;border:0;background:" +
            (e.bEdit && "yes" === (e.bEdit.closed || "")
              ? "#fff;color:var(--fg-x9a7e40);box-shadow:var(--shadow-card)"
              : "transparent;color:var(--fg-x64748b)"),
          bClosedNo: () =>
            this.setState((t) => ({ bEdit: { ...t.bEdit, closed: "no" } })),
          bClosedNoS:
            "font-family:'Cairo',sans-serif;font-size:10px;font-weight:600;padding:5px 0;flex:1;border-radius:9999px;cursor:pointer;border:0;background:" +
            (e.bEdit && "no" === (e.bEdit.closed || "")
              ? "#fff;color:var(--fg-x9a7e40);box-shadow:var(--shadow-card)"
              : "transparent;color:var(--fg-x64748b)"),
          bActiveKeep: () =>
            this.setState((t) => ({ bEdit: { ...t.bEdit, active: "" } })),
          bActiveKeepS:
            "font-family:'Cairo',sans-serif;font-size:10px;font-weight:600;padding:5px 0;flex:1;border-radius:9999px;cursor:pointer;border:0;background:" +
            (e.bEdit && "" === (e.bEdit.active || "")
              ? "#fff;color:var(--fg-x9a7e40);box-shadow:var(--shadow-card)"
              : "transparent;color:var(--fg-x64748b)"),
          bActiveYes: () =>
            this.setState((t) => ({ bEdit: { ...t.bEdit, active: "yes" } })),
          bActiveYesS:
            "font-family:'Cairo',sans-serif;font-size:10px;font-weight:600;padding:5px 0;flex:1;border-radius:9999px;cursor:pointer;border:0;background:" +
            (e.bEdit && "yes" === (e.bEdit.active || "")
              ? "#fff;color:var(--fg-x9a7e40);box-shadow:var(--shadow-card)"
              : "transparent;color:var(--fg-x64748b)"),
          bActiveNo: () =>
            this.setState((t) => ({ bEdit: { ...t.bEdit, active: "no" } })),
          bActiveNoS:
            "font-family:'Cairo',sans-serif;font-size:10px;font-weight:600;padding:5px 0;flex:1;border-radius:9999px;cursor:pointer;border:0;background:" +
            (e.bEdit && "no" === (e.bEdit.active || "")
              ? "#fff;color:var(--fg-x9a7e40);box-shadow:var(--shadow-card)"
              : "transparent;color:var(--fg-x64748b)"),
          bulkOn: a && !d,
          bulkLabel: q,
          bulkIsZone: "zone" === n,
          bulkOn2: () => this._bulk((t) => ({ ...t, off: !1 })),
          bulkOff: () => this._bulk((t) => ({ ...t, off: !0 })),
          bulkAskDel: () => this.setState({ bulkAsk: !0 }),
          bulkAskOn: !!e.bulkAsk,
          bulkDelNo: () => this.setState({ bulkAsk: !1 }),
          bulkDelYes: () => this._bulkDelete(),
          bulkClear: () => this.setState({ sel: null, selMulti: [] }),
          layPaths: _,
          layGates: $,
          layMarks: tt,
          eyeZones: st("zones"),
          eyePaths: st("paths"),
          eyeGates: st("gates"),
          eyeMarks: st("marks"),
          eyePathsRow: nt(_),
          eyeGatesRow: nt($),
          eyeZonesIcon: V ? at : it,
          eyePathsIcon: _ ? at : it,
          eyeGatesIcon: $ ? at : it,
          eyeMarksIcon: tt ? at : it,
          eyeZonesLabel: V ? "إخفاء المصليات" : "إظهار المصليات",
          eyePathsLabel: _ ? "إخفاء المسارات" : "إظهار المسارات",
          eyeGatesLabel: $ ? "إخفاء الأبواب" : "إظهار الأبواب",
          eyeMarksLabel: tt ? "إخفاء المعالم" : "إظهار المعالم",
          doPrint: () => {
            if (!this.PC("export")) return void this.permDeny();
            try {
              const t = document.getElementById("bs-print-veil");
              t && t.remove();
              const e = document.createElement("div");
              ((e.id = "bs-print-veil"),
                e.setAttribute(
                  "style",
                  "position:fixed;inset:0;z-index:99999;background:var(--bg-a2552552550p97);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;font-family:'Cairo',sans-serif",
                ),
                (e.innerHTML =
                  '<div style="width:46px;height:46px;border-radius:9999px;border:4px solid var(--bd-a185151810p22);border-top-color:var(--bd-xb99751);animation:bsvspin .9s linear infinite"></div><div style="font-size:15px;font-weight:600;color:var(--fg-x8a6f35)">جاري تجهيز التقرير للطباعة…</div><style>@keyframes bsvspin{to{transform:rotate(360deg)}}</style>'),
                document.body.appendChild(e),
                setTimeout(() => {
                  try {
                    const t = document.getElementById("bs-print-veil");
                    t && t.remove();
                  } catch (t) {}
                }, 3e4));
            } catch (t) {}
            const t = this.state,
              e = {
                lens: t.lens,
                panelTab: t.panelTab,
                brkDim: t.brkDim,
                gateDim: t.gateDim,
                markDim: t.markDim,
                panelOpen: t.panelOpen,
                sel: t.sel,
                selMulti: t.selMulti,
                floor: t.floor,
              },
              PL = this.bsLensOn("zones") ? "plan" : this.bsLensOn("gates") ? "gates" : this.bsLensOn("marks") ? "marks" : "plan",
              s = (t) =>
                (t.floors || []).map((e, s) =>
                  s === t.floor ? { ...e, zones: t.zones, gates: t.gates, marks: t.marks || [], paths: t.paths || [] } : e,
                );
            let n = s(t)
              .map((t, e) =>
                ((t) =>
                  !(
                    !t ||
                    t.create ||
                    !(
                      t.img ||
                      t.iid ||
                      (t.zones || []).length ||
                      (t.gates || []).length ||
                      (t.marks || []).length ||
                      (t.paths || []).length
                    )
                  ))(t)
                  ? e
                  : -1,
              )
              .filter((t) => t >= 0);
            n.length || (n = [t.floor || 0]);
            const a = [],
              i = (t) => {
                if (t >= n.length)
                  return void this.setState(
                    (t) => {
                      const n = s(t),
                        a = n[e.floor] || {};
                      return {
                        floors: n,
                        floor: e.floor,
                        zones: a.zones || [],
                        gates: a.gates || [],
                        marks: a.marks || [],
                        paths: a.paths || [],
                        lens: e.lens,
                        panelTab: e.panelTab,
                        brkDim: e.brkDim,
                        ...("plan" === PL ? {} : { gateDim: e.gateDim, markDim: e.markDim }),
                        panelOpen: e.panelOpen,
                        sel: e.sel,
                        selMulti: e.selMulti,
                      };
                    },
                    () => {
                      try {
                        this._buildPrintDoc(a);
                      } catch (t) {
                        try {
                          const t = document.getElementById("bs-print-veil");
                          t && t.remove();
                        } catch (t) {}
                        try {
                          window.print();
                        } catch (t) {}
                      }
                    },
                  );
                const r = n[t];
                this.setState(
                  (t) => {
                    const e = s(t),
                      n = e[r] || {};
                    return {
                      floors: e,
                      floor: r,
                      zones: n.zones || [],
                      gates: n.gates || [],
                      marks: n.marks || [],
                      paths: n.paths || [],
                      sel: null,
                      selMulti: [],
                      hoverZone: null,
                      hoverGate: null,
                      lens: PL,
                      panelTab: "plan" === PL ? "zones" : PL,
                      brkDim: "summary",
                      ...("plan" === PL ? {} : { gateDim: "summary", markDim: "summary" }),
                      panelOpen: !0,
                    };
                  },
                  () => {
                    setTimeout(() => {
                      try {
                        const t = this._capturePrintPage(r);
                        t && a.push(t);
                      } catch (t) {}
                      i(t + 1);
                    }, 170);
                  },
                );
              };
            i(0);
          },
          printTitle: "المنصة التشغيلية — الخطة التشغيلية",
          printMeta:
            "الموقع: " +
            (e.floors && e.floors.length ? (e.floors[e.floor] || e.floors[0] || {}).name || "موقع بلا اسم" : "لا يوجد موقع نشط"),
          printDate: new Date().toLocaleDateString("ar-SA-u-nu-latn", { year: "numeric", month: "long", day: "numeric" }),
          donutHitNode: Rt ? ys : ye ? bs : Ue ? xs : ds ? ks : ms,
          onHitNode: As,
          showOnRing: gs,
          onDonutStyle: fs,
          onCountText: String(ps),
          onTotalText: String(cs),
          donutCap: Rt
            ? "توزيع الطاقة الاستيعابية"
            : ye
              ? "توزيع التسكين"
              : Ue
                ? "توزيع الأبواب"
                : ds
                  ? "توزيع المسارات"
                  : "توزيع المصليات",
          donutStyle: Rt ? Bt : ye ? me : Ke ? Xe : Ue ? Le : ds ? os : hs,
          donutTotal: Rt
            ? j(Tt)
            : String(ye ? de : Ke ? We : Ue ? we : ds ? ts : ht),
          donutTitle: Rt
            ? "مؤشرات الكثافة"
            : ye
              ? "مؤشرات التوزيع"
              : Ke
                ? "مؤشرات المعالم"
                : Ue
                  ? "مؤشرات الأبواب"
                  : ds
                    ? "مؤشرات المسارات"
                    : "مؤشرات المصليات",
          donutUnit: Rt
            ? Ft
            : ye
              ? he
              : Ke
                ? "معلم"
                : Ue
                  ? Ae
                    ? "انتماء"
                    : "باب"
                  : ds
                    ? "مسار"
                    : "مصلى",
          registryOpen: !!e.registryOpen,
          ...(() => {
            const t = e.opGateFly,
              s = e.gates || [];
            if (!t || !s[t.i]) return { opGateFlyOn: !1 };
            const n = s[t.i],
              a = this.curApproved();
            return {
              opGateFlyOn: !0,
              opGateFlyName: (n.num ? "#" + n.num + " — " : "") + (n.label || "باب"),
              opGateFlyMeta: (n.closed ? "مغلق" : "مفتوح") + " · حالة الباب في الخطة" + (a ? " — الشهر مقفل، عرض فقط" : ""),
              opGateFlyColor: n.closed ? "#64748b" : "#16a34a",
              opGateFlyCanAct: !a,
              opGateFlyOnNow: !n.closed,
              opGateFlyOffNow: !!n.closed,
              opGateFlyStyle:
                "position:absolute;left:" +
                t.left +
                "px;top:" +
                t.top +
                "px;z-index:35;background:var(--bg-xffffff);border:1px solid var(--bd-xe6e8eb);border-radius:11px;box-shadow:var(--shadow-elevated);padding:9px 11px;min-width:180px;max-width:250px;text-align:right",
              opGateFlyClose: () => this.setState({ opGateFly: null }),
              opGateFlyToggle: (e) => {
                if ((e && e.stopPropagation && e.stopPropagation(), this.curApproved())) return;
                const s = t.i;
                this.setState({ gates: this.state.gates.map((t, e) => (e === s ? { ...t, closed: !t.closed } : t)), opGateFly: null }, () =>
                  this.savePlan(),
                );
              },
            };
          })(),
          regQ: e.regQ || "",
          onRegQ: (t) => this.setState({ regQ: t.target.value }),
          toggleRegistry: () =>
            this.setState((t) => ({ registryOpen: !t.registryOpen })),
          registryChev:
            "transition:transform .2s;" +
            (e.registryOpen ? "transform:rotate(180deg)" : ""),
        };
      })(),
      months: c,
      zones: J,
      zoneLabelNodes: lt,
      gateNodes: ft,
      markNodes: ut,
      pathNodes: Et,
      previewNode: Mt,
      pickerFloors: Bt,
      hoverTipNode: KIVO.BassamTip && (ot || this._secTipObj) ? KIVO.BassamTip.card(ot || this._secTipObj) : null,
      floorName: e.floors && e.floors.length ? (e.floors[e.floor] || e.floors[0] || {}).name || "موقع بلا اسم" : "لا يوجد موقع نشط",
      floorNum: String((e.floors[e.floor] || e.floors[0] || {}).num || 0),
      ...KIVO.BassamCount.pair(
        "floorCount",
        String(e.floors.length),
        "موقع|متاح",
      ),
      gateCount: String(e.gates.length),
      fldOpen: !!e.fldOpen,
      fldToggle: (t) => {
        let e = null;
        try {
          const s = t.currentTarget.getBoundingClientRect();
          e = { t: s.bottom, l: s.right, rl: s.left };
        } catch (t) {
          e = { t: 0, l: 0, rl: 0 };
        }
        this.setState((t) => ({ fldOpen: t.fldOpen ? null : e }));
      },
      fldPopStyle: (() => {
        const t = e.fldOpen;
        if (!t) return "display:none";
        const s = "undefined" != typeof window ? window.innerWidth : 1200,
          n = Math.max(4, Math.min(t.l - 190, s - 190 - 4));
        return (
          "position:fixed;top:" +
          Math.round(t.t + 4) +
          "px;left:" +
          Math.round(n) +
          "px;z-index:2147483000;min-width:190px;background:var(--bg-xffffff);border:1px solid var(--bd-a185151810p35);border-radius:10px;box-shadow:var(--shadow-elevated);overflow:hidden;padding:4px;text-align:right"
        );
      })(),
      fldChev:
        "opacity:.5;transition:transform .2s;" +
        (e.fldOpen ? "transform:rotate(180deg)" : ""),
      fldBtnStyle:
        "height:32px;display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:400;border-radius:10px;padding:0 12px;cursor:pointer;font-family:'Cairo',sans-serif;transition:all .2s;border:1px solid " +
        (e.fldOpen
          ? "rgba(185,151,81,0.5);color:var(--fg-xb99751);background:var(--bg-a185151810p08)"
          : "rgba(185,151,81,0.3);color:var(--fg-x141414);background:var(--bg-xffffff)"),
      ...(() => {
        const t = (e.floors || []).map((t, e) => ({ f: t, i: e })).filter((t) => t.f && !t.f.create),
          s = t.length,
          n = t.findIndex((t) => t.i === e.floor),
          a = n < 0 ? 0 : n,
          i = (e) => ((t[e] || {}).f || {}).name || "";
        return {
          siteNavOn: s >= 2,
          sitePrev: () => this.goSiteRel(-1),
          siteNext: () => this.goSiteRel(1),
          sitePrevTip: "الموقع السابق: " + i((a - 1 + Math.max(s, 1)) % Math.max(s, 1)),
          siteNextTip: "الموقع التالي: " + i((a + 1) % Math.max(s, 1)),
          siteArrowStyle:
            "height:32px;width:28px;display:inline-flex;align-items:center;justify-content:center;border-radius:10px;cursor:pointer;transition:all .2s;border:1px solid var(--bd-a185151810p3);color:var(--fg-x53565a);background:var(--bg-xffffff);flex-shrink:0;padding:0",
          siteCount: String(a + 1) + " / " + s,
        };
      })(),
      fldOpts: e.floors.map((t, s) => {
        const n = "nomap" === t.chipTone || t.create;
        return {
          name: t.name,
          num: String(t.num),
          selected: e.floor === s,
          eyeTip:
            !1 !== t.showCodes
              ? "التسميات ظاهرة — يظهر منها ما فعّلته على كل عنصر. اضغط لإخفائها كلها"
              : "إظهار التسميات على خريطة هذا الموقع — يظهر ما فعّلته على المصليات والأبواب والمسارات",
          eyeSlash: !1 !== t.showCodes ? "" : "M2 2 22 22",
          eyeStyle:
            "width:22px;height:22px;border-radius:6px;border:0;background:transparent;color:" +
            (!1 !== t.showCodes ? "var(--fg-xb99751)" : "var(--fg-x94a3b8)") +
            ";cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0",
          eyeToggle: (t) => {
            (t.stopPropagation(),
              this.setState(
                (t) => ({ floors: t.floors.map((t, e) => (e === s ? { ...t, showCodes: !1 === t.showCodes } : t)) }),
                () => this.savePlan(),
              ));
          },
          canDel: e.floors.length > 1 && !t.approved,
          canEditF: !t.approved,
          lockP1: t.approved ? "M7 11V7a5 5 0 0 1 10 0v4" : "M7 11V7a5 5 0 0 1 9.9-1",
          apprvTip: t.approved
            ? "الموقع مقفل ومعتمد — خريطته للعرض فقط ولا يمكن تعديله أو حذفه · اضغط القفل لفتحه"
            : "قفل الموقع واعتماده — تُقفل خريطته ويُمنع تعديله أو حذفه · لا يتأثر باقي المواقع",
          apprvStyle:
            "flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:6px;cursor:pointer;transition:all .15s;border:1px solid " +
            (t.approved
              ? "rgba(0,132,80,0.4);background:var(--bg-a0132800p12);color:var(--fg-x008450)"
              : "rgba(225,225,225,0.9);background:var(--bg-xffffff);color:var(--fg-x94a3b8)"),
          approveToggle: (t) => {
            (t.stopPropagation(),
              this.PC("approve")
                ? this.setState(
                    (t) => ({
                      floors: t.floors.map((t, e) => (e === s ? { ...t, approved: !t.approved } : t)),
                      tool: "select",
                      sel: null,
                      selMulti: [],
                      draft: null,
                      polyPts: [],
                    }),
                    () => this.savePlan(),
                  )
                : this.permDeny());
          },
          pick: () => {
            n
              ? this.setState({ pickerOpen: !0, fldOpen: !1 })
              : this.setState(
                  (t) => {
                    const e = t.floors.map((e, s) =>
                        s === t.floor ? { ...e, zones: t.zones, gates: t.gates, marks: t.marks || [], paths: t.paths || [] } : e,
                      ),
                      n = e[s] || {};
                    return {
                      floors: e,
                      floor: s,
                      zones: n.zones || [],
                      gates: n.gates || [],
                      marks: n.marks || [],
                      paths: n.paths || [],
                      sel: null,
                      selMulti: [],
                      tool: "select",
                      draft: null,
                      polyPts: [],
                      polyCursor: null,
                      hoverZone: null,
                      hoverGate: null,
                      fldOpen: !1,
                    };
                  },
                  () => this.savePlan(),
                );
          },
          del: (e) => {
            (e.stopPropagation(),
              this.state.floors.length <= 1 ||
                (this.state.floors[s] || {}).approved ||
                this.setState({ delFloor: { i: s, name: t.name }, fldOpen: !1 }));
          },
          edit: (e) => {
            (e.stopPropagation(),
              (this.state.floors[s] || {}).approved ||
                this.setState({ siteModal: { mode: "edit", i: s, name: t.name, img: t.img || "" }, fldOpen: !1 }));
          },
          style:
            "display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;font-size:11px;cursor:pointer;transition:background .15s;" +
            (e.floor === s
              ? "background:var(--bg-a185151810p08);color:var(--fg-x9a7e40);font-weight:400"
              : n
                ? "color:var(--fg-xcbd5e1)"
                : "color:var(--fg-x141414)"),
        };
      }),
      delFloorOn: !!e.delFloor,
      delFloorMsg: e.delFloor ? "سيتم حذف موقع «" + e.delFloor.name + "» نهائياً بكل خطته ومصلياته — لا يمكن التراجع." : "",
      delFloorCancel: () => this.setState({ delFloor: null }),
      delFloorDo: () => {
        const _opRelated = {};

        if (!this.PC("del")) return void this.permDeny();
        const t = this.state.delFloor;
        if (!t) return;
        if (this.state.floors.length <= 1)
          return void this.setState({ delFloor: null });
        const e = this.state.floors
            .map((t, e) =>
              e === this.state.floor
                ? { ...t, zones: this.state.zones, gates: this.state.gates, marks: this.state.marks || [], paths: this.state.paths || [] }
                : t,
            )
            .filter((e, s) => s !== t.i),
          s = this.state.planMonths || {},
          n = {};
        Object.keys(s).forEach((e) => {
          const a = this._mData(s, e) || [];
          n[e] = { c: 1, d: a.filter((e, s) => s !== t.i) };
        });
        try {
          const e = this._opRead("bassam_rounds_v1");
          e &&
            "object" == typeof e &&
            (Object.keys(e).forEach((s) => {
              const n = e[s];
              n && Array.isArray(n.d) && n.d.length > t.i && n.d.splice(t.i, 1);
            }),
            (_opRelated.bassam_rounds_v1 = e));
        } catch (t) {}
        let a = this.state.floor;
        a === t.i ? (a = 0) : a > t.i && a--;
        const i = e[a] || {};
        this.setState(
          {
            planMonths: n,
            floors: e,
            floor: a,
            zones: i.zones || [],
            gates: i.gates || [],
            marks: i.marks || [],
            paths: i.paths || [],
            sel: null,
            selMulti: [],
            tool: "select",
            draft: null,
            polyPts: [],
            polyCursor: null,
            hoverZone: null,
            hoverGate: null,
            delFloor: null,
          },
          () => {
            (this.savePlan(_opRelated), this._opGc());
          },
        );
      },
      fldAddOpen: () => {
        this.PC("add") ? this.setState({ siteModal: { mode: "add", name: "", img: "" }, fldOpen: !1 }) : this.permDeny();
      },
      siteModalOn: !!e.siteModal,
      siteModalTitle: e.siteModal ? ("edit" === e.siteModal.mode ? "تعديل الموقع" : "إضافة موقع جديد") : "",
      siteModalBtn: e.siteModal
        ? "edit" === e.siteModal.mode
          ? "حفظ التعديلات"
          : "إضافة الموقع"
        : "",
      siteName2: e.siteModal ? e.siteModal.name : "",
      onSiteName2: (t) =>
        this.setState({
          siteModal: { ...this.state.siteModal, name: t.target.value },
        }),
      siteImg: e.siteModal ? e.siteModal.img : "",
      siteImgKey: KIVO.BassamMapNight ? KIVO.BassamMapNight.key((e.siteModal && e.siteModal.img) || "") : "",
      siteImgNight:
        (KIVO.BassamMapNight && KIVO.BassamMapNight.url((e.siteModal && e.siteModal.img) || "")) ||
        (KIVO.BassamMapNight ? KIVO.BassamMapNight.PH : ""),
      siteHasImg: !(!e.siteModal || !e.siteModal.img),
      siteLowResOn: !!(e.siteModal && e.siteModal.img && e.siteLowRes),
      siteLowRes: e.siteLowRes || "",
      noSiteImg: !(e.siteModal && e.siteModal.img),
      siteClearImg: () =>
        this.setState({ siteModal: { ...this.state.siteModal, img: "" } }),
      siteDropStyle:
        "position:relative;border:2px dashed " +
        (e.siteDragOver ? "#b99751;background:var(--bg-a185151810p08)" : "rgba(185,151,81,0.4);background:var(--bg-a2482502520p6)") +
        ";border-radius:12px;min-height:150px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer;transition:all .15s;overflow:hidden",
      siteDragEnter: (t) => {
        (t.preventDefault(), this.setState({ siteDragOver: !0 }));
      },
      siteDragLeave: (t) => {
        (t.preventDefault(), this.setState({ siteDragOver: !1 }));
      },
      siteDrop: (t) => {
        (t.preventDefault(), this.setState({ siteDragOver: !1 }));
        const e = t.dataTransfer && t.dataTransfer.files && t.dataTransfer.files[0];
        e && this._readSiteImg(e);
      },
      sitePick: () => {
        const t = document.createElement("input");
        ((t.type = "file"),
          (t.accept = "image/*"),
          (t.onchange = () => {
            const e = t.files && t.files[0];
            e && this._readSiteImg(e);
          }),
          t.click());
      },
      siteModalCancel: () =>
        this.setState({ siteModal: null, siteDragOver: !1 }),
      siteModalSave: async () => {
        try {
          const _opRelated = {};

          const t = this.state.siteModal;
          if (!t) return;
          const e = (t.name || "").trim();
          if (e)
            if (
              this.state.floors.some(
                (s, n) => s.name === e && n !== ("edit" === t.mode ? t.i : -1),
              )
            )
              this.bsToast("يوجد موقع بنفس الاسم");
            else if ("edit" === t.mode) {
              const s = this.state.floors[t.i] || {},
                n = t.img
                  ? t.img !== s.img
                    ? await this._putImg(t.img, s)
                    : s.iid || (await this._putImg(t.img, s))
                  : null,
                a = !(!s.iid || s.iid === n);
              this.setState(
                {
                floors: this.state.floors.map((s, a) =>
                  a === t.i
                    ? {
                        ...s,
                        name: e,
                        img: t.img,
                        iid: n,
                        imgW: t.imgW || s.imgW || 0,
                        imgH: t.imgH || s.imgH || 0,
                        chipTone: "nomap" === s.chipTone ? (t.img ? "warn" : "nomap") : s.chipTone,
                      }
                    : s,
                ),
                siteModal: null,
                siteLowRes: null,
              },
                () => {
                  (this.savePlan(_opRelated), a && this._opGc());
                },
              );
            } else {
              const s = this.state.floors.map((t, e) =>
                e === this.state.floor
                  ? { ...t, zones: this.state.zones, gates: this.state.gates, marks: this.state.marks || [], paths: this.state.paths || [] }
                  : t,
              ),
                n = t.img ? await this._putImg(t.img) : null,
                a = [
                ...s,
                {
                  num: this.state.floors.length,
                  name: e,
                  img: t.img,
                  iid: n,
                  imgW: t.imgW || 0,
                  imgH: t.imgH || 0,
                  approved: !1,
                  chip: "خطة جديدة",
                  chipTone: "ok",
                  create: !1,
                  zones: [],
                  gates: [],
                  marks: [],
                  paths: [],
                  sid: KIVO.BassamAudit ? KIVO.BassamAudit.newId("s_") : void 0,
                },
              ];
              try {
                const t = this._opRead("bassam_rounds_v1");
                if (t && "object" == typeof t) {
                  let e = !1;
                  (Object.keys(t).forEach((s) => {
                  const n = t[s];
                  if (n && Array.isArray(n.d))
                    for (; n.d.length < a.length; )
                      (n.d.push({ zones: [], gates: [], marks: [], paths: [], sid: (a[n.d.length] || {}).sid }), (e = !0));
                }),
                    e && (_opRelated.bassam_rounds_v1 = t));
                }
              } catch (t) {}
              this.setState(
                {
                floors: a,
                floor: a.length - 1,
                zones: [],
                gates: [],
                marks: [],
                paths: [],
                sel: null,
                selMulti: [],
                tool: "select",
                draft: null,
                polyPts: [],
                polyCursor: null,
                hoverZone: null,
                hoverGate: null,
                siteModal: null,
                siteLowRes: null,
              },
                () => this.savePlan(_opRelated),
              );
            }
          else this.bsToast("اكتب اسم الموقع أولاً");
        } catch (error) {
          this.bsToast(
            "لم يتم تأكيد رفع الصورة — بقي الموقع والصورة السابقة دون تغيير",
            "warn",
          );
        }
      },
      clearSel: () => this.setState({ sel: null, selMulti: [] }),
      showSelPanel: !(
        !e.sel ||
        d ||
        ("sector" === e.sel.t &&
          !("dist" === e.lens || ("gates" === e.lens && e.gAsn) || ("plan" === e.lens && e.zAsn) || ("marks" === e.lens && e.mAsn))) ||
        ("plan" === e.lens && !e.zAsn) ||
        ("gates" === e.lens && !e.gAsn) ||
        ("marks" === e.lens && !e.mAsn) ||
        "paths" === e.lens ||
        ("dist" === e.lens && !this.bsLensOn("dist")) ||
        ("density" === e.lens && !this.bsLensOn("dens"))
      ),
      selGateEditable: ("plan" === e.lens || ("gates" === e.lens && !e.gAsn)) && !d && !!e.sel && "gate" === e.sel.t,
      selLockedHint: !1,
      selDistPanel:
        this.bsLensOn("dist") &&
        ((!!SS &&
          ("dist" === e.lens || ("gates" === e.lens && e.gAsn) || ("plan" === e.lens && e.zAsn) || ("marks" === e.lens && e.mAsn))) ||
          ("dist" === e.lens && !!(Wt || It || jt)) ||
          ("gates" === e.lens && e.gAsn && !!It) ||
          ("plan" === e.lens && e.zAsn && !!Wt) ||
          ("marks" === e.lens && e.mAsn && !!jt)) &&
        !d,
      selDensityPanel:
        "density" === e.lens && this.bsLensOn("dens") && !!Wt && !d,
      selZoneOffWarn: !!Wt && !!Wt.off && ("dist" === e.lens || "density" === e.lens || ("plan" === e.lens && e.zAsn)),
      selMeta: SS
        ? "نطاق" + (SS.lead ? " · المسؤول: " + SS.lead : "")
        : (Wt && { men: "مصلى رجال", women: "مصلى نساء", service: "خدمات" }[Wt.cat]) || "",
      assignGroups: (() => {
        const T = {};
        let L = [];
        try {
          const t = JSON.parse(localStorage.getItem("bassam_perm_tpls_v1"));
          Array.isArray(t) && (L = t);
        } catch (t) {}
        const PM = KIVO.BassamPerm,
          EM = KIVO.BassamEmp;
        f.forEach((t) => {
          if (!t || !t.name) return;
          try {
            const e = EM && EM.key ? EM.key(t) : t.eid || t.nid || t.name,
              s = PM && PM.tplOfEmp ? PM.tplOfEmp(e) : "",
              n = s ? L.findIndex((t) => t.id === s) : -1;
            T[t.name] = { tpl: n >= 0 ? L[n].name : "", ord: n >= 0 ? n : s ? 98 : 99 };
          } catch (t) {}
        });
        const RD = (t) => {
            const e = u[t];
            if (!e) return "";
            const s = ((EM && EM.entry ? EM.entry(k, e) : k[e.eid || e.nid || e.name || ""]) || {}).rest || [];
            return s.length ? "راحة: " + s.map((t) => String(t).replace(/^ال/, "")).join(" · ") : "";
          },
          rows = fe.map((t) => {
            const r = RD(t.name);
            return {
              ...t,
              tpl: (T[t.name] || {}).tpl || "",
              ord: null == (T[t.name] || {}).ord ? 99 : T[t.name].ord,
              restOn: !!t.onRest,
              restTip: t.onRest ? "في راحته اليوم" + (r ? " — " + r : "") : "",
              rowTip: (t.rowTip || "") + (r ? (t.rowTip ? " · " : "") + r : ""),
              nameStyle:
                "min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" + (t.onRest ? ";color:var(--fg-x94a3b8)" : ""),
            };
          }),
          srt = (t, e) => (t.ord !== e.ord ? t.ord - e.ord : String(t.name).localeCompare(String(e.name), "ar")),
          open = e.asnGrpOpen || {},
          q = !!he,
          groups = y.map((t) => ({
            key: t.name,
            name: t.name,
            color: t.color || "#94a3b8",
            rows: rows.filter((e) => e.shift === t.name).sort(srt),
          })),
          nosh = rows.filter((t) => !t.shift).sort(srt);
        nosh.length && groups.push({ key: "__nosh", name: "بلا وردية هذا الشهر", color: "#e2e8f0", rows: nosh, none: !0 });
        return groups.map((t) => {
          const e = t.rows.length,
            s = t.rows.filter((t) => t.checked).length,
            n = q || !!open[t.key],
            a = t.none ? "" : e ? (s === e ? "اكتمل (" + e + ")" : s ? "سُكّن " + s + " من " + e : "لم يُسكَّن أحد") : "لا موظفين";
          return {
            name: t.name,
            cnt: e ? KIVO.BassamCount(e, "موظف") : "",
            chev: n ? "▾" : "▸",
            toggle: () => this.setState((e) => ({ asnGrpOpen: { ...(e.asnGrpOpen || {}), [t.key]: !(e.asnGrpOpen || {})[t.key] } })),
            show: n,
            rows: t.rows,
            empty: 0 === e,
            emptyTxt: q ? "لا اسم يطابق البحث في هذه الوردية" : "لا يوجد موظفون على هذه الوردية هذا الشهر",
            hdStyle:
              "display:flex;align-items:center;gap:7px;padding:6px 6px;border-radius:8px;cursor:pointer;user-select:none;font-size:11px;font-weight:700;color:" +
              (t.none ? "var(--fg-x94a3b8)" : "var(--fg-x141414)"),
            dotStyle: "width:9px;height:9px;border-radius:50%;flex-shrink:0;background:" + t.color,
            prog: a,
            progStyle:
              "margin-right:auto;flex-shrink:0;font-size:8.5px;font-weight:600;padding:1px 7px;border-radius:9999px;white-space:nowrap;border:1px solid " +
              (e && s === e
                ? "rgba(0,132,80,0.3);background:var(--bg-a0132800p08);color:var(--fg-x047857)"
                : s
                  ? "rgba(245,158,11,0.35);background:var(--bg-a245158110p1);color:var(--fg-xb45309)"
                  : "#E2E8F0;background:var(--bg-xf8fafc);color:var(--fg-x94a3b8)"),
          };
        });
      })(),
      assignRows: Jt,
      filteredAssignRows: fe,
      assignWorkRows: ue,
      assignRestRows: me,
      assignRestN: ye,
      assignRestOn: be,
      assignRestOpen: xe,
      assignRestShow: ke,
      assignRestHead: Ae,
      assignRestToggle: () =>
        this.setState({ assignRestOpen: !this.state.assignRestOpen }),
      assignRestChev: ve,
      otherShiftCounts: Fe,
      otherShiftCountsPresent: Fe.length > 0,
      assignTrimmed: Se,
      assignTrimNote: we,
      assignSearchOn: de.length > 10,
      assignQ: he,
      assignQHas: !!he,
      onAssignQ: (t) => this.setState({ assignQ: t.target.value }),
      assignQClear: () => this.setState({ assignQ: "" }),
      assignSearchNote: pe
        ? ge.length + " من " + KIVO.BassamCount(de.length, "اسم", "g") + ""
        : "",
      assignShiftHas: Ee > 0,
      assignShiftDone: String(Me),
      assignShiftTotal: String(Ee),
      assignShiftTip: Te,
      assignShiftPillStyle:
        "display:inline-flex;align-items:center;gap:2px;flex-shrink:0;font-size:9px;font-weight:600;padding:1px 7px;border-radius:9999px;line-height:1.7;cursor:default;color:" +
        Pe +
        ";background:" +
        Pe +
        "14;border:1px solid " +
        Pe +
        "38",
      assignShiftBarStyle: "height:3px;border-radius:9999px;background:var(--bg-a1481631840p22);overflow:hidden;margin-top:1px",
      assignShiftFillStyle: "height:100%;border-radius:9999px;transition:width .25s ease;background:" + Pe + ";width:" + Oe + "%",
      canFilterDist:
        this.bsLensOn("dist") &&
        ("dist" === e.lens || ("gates" === e.lens && e.gAsn) || ("plan" === e.lens && e.zAsn) || ("marks" === e.lens && e.mAsn)) &&
        !d &&
        (e.floors || []).length > 0,
      distBarOn:
        this.bsLensOn("dist") &&
        ("dist" === e.lens || ("gates" === e.lens && e.gAsn) || ("plan" === e.lens && e.zAsn) || ("marks" === e.lens && e.mAsn)) &&
        (e.floors || []).length > 0,
      ...(() => {
        const t = this._needList(),
          s = this._needKind(),
          n = d || !this._plCanWrite(),
          a = String((e.needTbl && e.needTbl.q) || ""),
          i = (e.needTbl && e.needTbl.fill) || {},
          r = ((e.floors || [])[e.floor] || {}).name || "",
          l = { men: "مصلى رجال", women: "مصلى نساء", service: "منطقة خدمات" },
          o = (t) =>
            "width:100%;height:29px;border-radius:8px;padding:0 4px;font-size:12px;font-weight:600;outline:none;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';text-align:center;box-sizing:border-box;" +
            (n
              ? "border:1px solid var(--bd-xe8e8e8);background:var(--bg-xf7f7f7);color:var(--fg-x8a8f94);cursor:not-allowed"
              : t
                ? "border:1px solid var(--bd-a185151810p65);background:var(--bg-a185151810p07);color:var(--fg-x9a7e40)"
                : "border:1px solid var(--bd-xe8e8e8);background:var(--bg-xffffff);color:var(--fg-x141414)"),
          h = s ? s[0] : "zones",
          p = s ? s[1] : "",
          c = s ? s[3] : "";
        let g = ((s && e[h]) || [])
          .map((t, e) => {
            const s =
                "gates" === h
                  ? ("" !== (t.num || "") ? "#" + t.num + " — " : "") + (t.label || t.name || "باب")
                  : "marks" === h
                    ? t.label || t.name || "معلم"
                    : (t.code ? t.code + " — " : "") + (t.name || "مصلى"),
              n = "zones" === h ? l[t.cat] || t.ztype || "مصلى" : t.kind || "بلا نوع",
              a = "gates" === h ? !!t.closed : !!t.off;
            return { i: e, el: t, key: h + ":" + e, name: s, meta: n, dead: a, deadTxt: a ? ("gates" === h ? "مغلق" : "معطّل") : "" };
          })
          .filter((t) => !("gates" === h && KIVO.BassamLeaf.isParent(t.el)));
        a && (g = KIVO.BassamFind.filter(a, g, (t) => [t.name, t.meta]));
        const f = g.map((t) => t.key),
          u = g.map((t) => {
            const e = ((t) => {
                const e = parseInt(String(null == t ? "" : t).trim(), 10);
                return e > 0 ? e : 0;
              })(t.el.needN),
              s = t.el.needS || {};
            return {
              key: t.key,
              name: t.name,
              meta: t.meta + (t.dead ? " · " + t.deadTxt : ""),
              nameStyle:
                "flex:1;min-width:190px;display:flex;flex-direction:column;gap:1px;padding:0 8px 0 4px;min-width:0" +
                (t.dead ? ";opacity:.55" : ""),
              priCh: (("gates" === h || "zones" === h || "marks" === h) && t.el.pri) || "",
              priChTip:
                "gates" !== h && "zones" !== h && "marks" !== h
                  ? ""
                  : t.el.pri
                    ? "أولوية التغطية: (" +
                      t.el.pri +
                      ") " +
                      { أ: "لا يُخلى أبداً", ب: "يُخفَّض عند الضرورة", ج: "أول ما يُسحب منه عند العجز" }[t.el.pri]
                    : "gates" === h
                      ? "بلا أولوية تغطية — صنّفه من محرّر الباب أو بزرّ اقتراح الأولويات"
                      : "marks" === h
                        ? "بلا أولوية تغطية — صنّفه من محرّر المعلم"
                        : "بلا أولوية تغطية — صنّفها من محرّر المصلى أو بزرّ اقتراح الأولويات",
              priChSt:
                "gates" === h || "zones" === h || "marks" === h
                  ? "display:inline-flex;align-items:center;justify-content:center;width:17px;height:17px;flex-shrink:0;border-radius:6px;font-size:10px;font-weight:800;font-family:'Cairo',sans-serif;" +
                    (t.el.pri
                      ? (() => {
                          const e = { أ: "#8A6F35", ب: "#53565a", ج: "#1668a1" }[t.el.pri] || "#53565a";
                          return "border:1px solid " + e + "66;background:" + e + "14;color:" + e;
                        })()
                      : "border:1px dashed var(--bd-xd7dce2);background:transparent;color:transparent")
                  : "display:none",
              base: e ? String(e) : "",
              basePh: "—",
              baseStyle: o(!!e),
              onBase: (e) => this._needSet(h, t.i, null, e.target.value),
              cells: y.map((n) => ({
                v: null == s[n.name] ? "" : String(s[n.name]),
                ph: e ? String(e) : "—",
                st: o(null != s[n.name]),
                title: n.name + " — اتركه فارغاً لتأخذ الوردية الاحتياج الافتراضي (" + (e || "غير محدَّد") + ")",
                onCh: (e) => this._needSet(h, t.i, n.name, e.target.value),
              })),
              tot: String(KIVO.BassamNeed.tot(t.el, y)),
              totStyle:
                "width:74px;flex-shrink:0;text-align:center;font-size:12px;font-weight:700;font-feature-settings:'tnum';color:" +
                (KIVO.BassamNeed.tot(t.el, y) ? "#9A7E40" : "#c3c7cb"),
            };
          }),
          m = ((s && e[h]) || []).filter((t) => ("gates" === h ? !t.closed : !t.off)),
          b = y.map((t) => {
            const e = m.reduce((e, s) => e + KIVO.BassamNeed.of(s, t.name), 0);
            let s = 0;
            m.forEach((e) =>
              (e.emp || []).forEach((e) => {
                A[e] === t.name && s++;
              }),
            );
            const n = s - e;
            return {
              name: t.name,
              color: t.color,
              need: String(e),
              placed: String(s),
              gapTxt: e ? (0 === n ? "مكتمل" : n > 0 ? "زائد " + n : "ناقص " + Math.abs(n)) : "—",
              gapStyle:
                "font-size:9.5px;font-weight:700;font-feature-settings:'tnum';color:" +
                (e ? (n < 0 ? "var(--fg-xdc2626)" : n > 0 ? "var(--fg-x0f766e)" : "var(--fg-x008450)") : "var(--fg-xc3c7cb)"),
              cellStyle: "width:78px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:1px",
              dotStyle: "width:6px;height:6px;border-radius:9999px;background:" + t.color,
            };
          }),
          k = m.reduce((t, e) => t + KIVO.BassamNeed.tot(e, y), 0),
          v = (t) => {
            const e =
              {
                zones: ["مصلى واحد", "مصلّيان", "مصليات", "مصلًّى", "مصلى"],
                marks: ["معلم واحد", "معلمان", "معالم", "معلماً", "معلم"],
                gates: ["باب واحد", "بابان", "أبواب", "باباً", "باب"],
              }[h] || null;
            return e ? KIVO.BassamCount(t, [e[0], e[1], e[1], e[2], e[3], e[4]]) : String(t);
          },
          S = 268 + 84 * y.length + 74 + 40,
          w = (t) =>
            "width:32px;height:32px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;box-sizing:border-box;border:2px solid " +
            (t
              ? "#b99751;background:var(--bg-a185151810p1);color:var(--fg-x9a7e40)"
              : "transparent;background:transparent;color:var(--fg-x475569)"),
          z = (t) => () => this.setState({ needTbl: { kind: t, q: "", fill: {} } }),
          E = (t) => !(!e.needTbl || !s || s[0] !== t);
        return {
          ndtHasZones: t.some((t) => "zones" === t[0]),
          ndtHasMarks: t.some((t) => "marks" === t[0]),
          ndtHasGates: t.some((t) => "gates" === t[0]),
          ndtOpenZones: z("zones"),
          ndtOpenMarks: z("marks"),
          ndtOpenGates: z("gates"),
          ndtStyleZones: w(E("zones")),
          ndtStyleMarks: w(E("marks")),
          ndtStyleGates: w(E("gates")),
          ndtTitleZones: "جدول احتياج المصليات — عدد الموظفين الذي يحتاجه كل مصلى في كل وردية",
          ndtTitleMarks: "جدول احتياج المعالم — عدد الموظفين الذي يحتاجه كل معلم في كل وردية",
          ndtTitleGates: "جدول احتياج الأبواب — عدد الموظفين الذي يحتاجه كل باب في كل وردية",
          ndtOn: !!e.needTbl && !!s,
          ndtClose: () => {
            (this._ndtT && (clearTimeout(this._ndtT), (this._ndtT = null), (this._histMerge = "skip"), this.savePlan()),
              this.setState({ needTbl: null }));
          },
          ndtHead: "احتياج " + p + " — " + r,
          ndtSub:
            "احتياج كل " +
            c.replace("ال", "") +
            " في كل وردية · الخانة المذهَّبة رقمٌ مخصَّص لتلك الوردية، والفارغة ترث «الافتراضي» وتعرضه شبحاً · خانة «تعبئة» تحت رأس كل عمود تكتب رقمها في كل الصفوف المعروضة، وعلامة × بجانبها تمسح العمود · التغيير يُحفظ فوراً",
          ndtLockOn: n,
          ndtLockMsg: d
            ? "الموقع معتمد ومقفل — الأرقام للقراءة فقط. افتح القفل بجانب اسم الموقع لتعديلها."
            : "صلاحيتك على هذه الصفحة عرضٌ فقط — الأرقام للقراءة.",
          ndtQ: a,
          onNdtQ: (t) => this.setState((e) => ({ needTbl: { ...(e.needTbl || {}), q: t.target.value } })),
          ndtSearchPh: "ابحث باسم " + c + "...",
          ndtMinW: "min-width:" + S + "px",
          ndtColHead: p,
          ndtCols: y.map((t) => ({
            name: t.name,
            short: x[t.name] || t.name,
            color: t.color,
            headStyle: "width:78px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:3px",
            dotStyle: "width:7px;height:7px;border-radius:9999px;flex-shrink:0;background:" + t.color,
            fill: null == i[t.name] ? "" : String(i[t.name]),
            fillPh: "تعبئة",
            fillTitle: "تعبئة العمود: يكتب هذا الرقم في كل الصفوف المعروضة الآن",
            fillStyle:
              "width:50px;height:22px;border:1px dashed var(--bd-a185151810p55);border-radius:7px;padding:0 3px;font-size:10px;font-weight:600;outline:none;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';text-align:center;box-sizing:border-box;background:" +
              (n ? "var(--bg-xf7f7f7)" : "var(--bg-a185151810p05)"),
            onFill: (e) => {
              const s = e.target.value.replace(/[^0-9]/g, "").slice(0, 4);
              this.setState(
                (e) => ({ needTbl: { ...(e.needTbl || {}), fill: { ...((e.needTbl || {}).fill || {}), [t.name]: s } } }),
                () => this._needFill(t.name, s, f),
              );
            },
            clearTitle: "مسح تخصيص «" + t.name + "» من كل الصفوف المعروضة — فتعود لترث الافتراضي",
            clear: () => this.setState((e) => ({ needTbl: { ...(e.needTbl || {}), clrAsk: { sh: t.name } } })),
          })),
          ndtCanEdit: !n,
          ndtClrBtn:
            "width:18px;height:18px;flex-shrink:0;border-radius:6px;border:1px solid var(--bd-xe1e1e1);background:var(--bg-xffffff);color:var(--fg-x94a3b8);cursor:pointer;font-size:11px;line-height:1;padding:0;display:inline-flex;align-items:center;justify-content:center;transition:all .15s;font-family:'Cairo',sans-serif",
          ndtClrOn: !(!e.needTbl || !e.needTbl.clrAsk),
          ndtClrTitle: (() => {
            const t = e.needTbl && e.needTbl.clrAsk;
            return t ? (null == t.sh ? "مسح عمود «الافتراضي»؟" : "مسح تخصيص «" + t.sh + "»؟") : "";
          })(),
          ndtClrMsg: (() => {
            const t = e.needTbl && e.needTbl.clrAsk;
            if (!t) return "";
            const s = f.length;
            return (
              "سيُمسح " +
              (null == t.sh ? "الاحتياج الافتراضي" : "تخصيص «" + t.sh + "»") +
              " من " +
              v(s) +
              (a ? " (المعروضة بالبحث الحالي فقط)" : "") +
              (null == t.sh ? " — وتبقى تخصيصات الورديات كما هي." : " — فتعود هذه الصفوف ترث الافتراضي.") +
              " هذا المسح لا يطاله زرّ التراجع."
            );
          })(),
          ndtClrCancel: () => this.setState((t) => ({ needTbl: { ...(t.needTbl || {}), clrAsk: null } })),
          ndtClrDo: () => {
            const t = e.needTbl && e.needTbl.clrAsk;
            if (!t) return;
            const s = { ...(e.needTbl.fill || {}) };
            (null == t.sh ? delete s.__base : delete s[t.sh],
              this.setState(
                (t) => ({ needTbl: { ...(t.needTbl || {}), clrAsk: null, fill: s } }),
                () => this._needFill(null == t.sh ? null : t.sh, "", f),
              ));
          },
          ndtBaseFill: null == i.__base ? "" : String(i.__base),
          ndtBaseFillStyle:
            "width:50px;height:22px;border:1px dashed var(--bd-a185151810p55);border-radius:7px;padding:0 3px;font-size:10px;font-weight:600;outline:none;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';text-align:center;box-sizing:border-box;background:" +
            (n ? "var(--bg-xf7f7f7)" : "var(--bg-a185151810p05)"),
          onNdtBaseFill: (t) => {
            const e = t.target.value.replace(/[^0-9]/g, "").slice(0, 4);
            this.setState(
              (t) => ({ needTbl: { ...(t.needTbl || {}), fill: { ...((t.needTbl || {}).fill || {}), __base: e } } }),
              () => this._needFill(null, e, f),
            );
          },
          ndtBaseClear: () => this.setState((t) => ({ needTbl: { ...(t.needTbl || {}), clrAsk: { sh: null } } })),
          gapStripOn:
            this.bsLensOn("dist") &&
            ("dist" === e.lens || ("gates" === e.lens && e.gAsn) || ("plan" === e.lens && e.zAsn) || ("marks" === e.lens && e.mAsn)) &&
            (e.floors || []).length > 0 &&
            t.length > 0,
          gapShiftLabel: null != ne ? ne : "كل الورديات",
          gapItems: t.map((t) => {
            const s = ((t) => {
                const s = (e[t] || []).filter((e) => ("gates" === t ? !e.closed : !e.off)),
                  n =
                    null != ne
                      ? s.reduce((t, e) => t + KIVO.BassamNeed.of(e, ne), 0)
                      : s.reduce((t, e) => t + KIVO.BassamNeed.tot(e, y), 0);
                let a = 0;
                return (
                  s.forEach((t) =>
                    (t.emp || []).forEach((t) => {
                      const e = A[t];
                      e && ((null != ne && e !== ne) || a++);
                    }),
                  ),
                  { need: n, placed: a, gap: a - n }
                );
              })(t[0]),
              n = s.need ? (s.gap < 0 ? "#dc2626" : s.gap > 0 ? "#2f8f86" : "#008450") : "#94a3b8";
            return {
              label: t[1],
              state: s.need ? (0 === s.gap ? "مكتمل" : s.gap > 0 ? "زائد " + s.gap : "ناقص " + Math.abs(s.gap)) : "بلا احتياج",
              counts: s.placed + "/" + s.need,
              open: z(t[0]),
              title:
                t[1] +
                ": سُكِّن " +
                s.placed +
                " من احتياج " +
                s.need +
                (null != ne ? " في «" + ne + "»" : " عبر كل الورديات") +
                " — انقر لفتح جدول احتياجها",
              chipStyle:
                "display:inline-flex;align-items:center;gap:5px;flex-shrink:0;font-family:'Cairo',sans-serif;font-size:10px;font-weight:600;padding:4px 10px;border-radius:9999px;cursor:pointer;border:1px solid " +
                n +
                "40;background:" +
                n +
                "0f;color:" +
                n,
              dot: "width:6px;height:6px;border-radius:9999px;flex-shrink:0;background:" + n,
              numStyle: "font-size:9px;font-weight:400;opacity:.75;font-feature-settings:'tnum'",
            };
          }),
          ndtRows: u,
          ndtEmpty: 0 === u.length,
          ndtEmptyMsg: a ? "لا " + c.replace("ال", "") + " يطابق «" + a + "»" : "لا توجد " + p + " في هذا الموقع بعد.",
          ndtTots: b,
          ndtNeedAll: String(k),
          ndtCount: v(f.length),
          ndtTotLabel: p + " في كل وردية",
          ndtTotSub: "الاحتياج · المسكَّن عليها · الفارق",
          ndtFoot: "كل الأرقام هنا من " + p + " وحدها: احتياجها، ومن سُكِّن عليها هي، والفارق بينهما — لا دخل لبقية الأنواع في حسابها.",
        };
      })(),
      ...(() => {
        const t = this._needList(),
          s = (this.state.priTbl && this.state.priTbl.kind) || "",
          n = t.length ? (t.some((t) => t[0] === s) ? t.find((t) => t[0] === s) : t[0]) : null,
          a = d || !this._plCanWrite(),
          i = String((e.priTbl && e.priTbl.q) || ""),
          r = ((e.floors || [])[e.floor] || {}).name || "",
          l = { men: "مصلى رجال", women: "مصلى نساء", service: "منطقة خدمات" },
          o = n ? n[0] : "zones",
          h = n ? n[1] : "",
          p = n ? n[3] : "",
          c = { أ: "#8A6F35", ب: "#53565a", ج: "#1668a1" },
          g = { أ: "لا يُخلى أبداً", ب: "يُخفَّض عند الضرورة", ج: "أول ما يُسحب منه عند العجز" };
        let f = ((n && e[o]) || [])
          .map((t, e) => ({
            i: e,
            el: t,
            name:
              "gates" === o
                ? ("" !== (t.num || "") ? "#" + t.num + " — " : "") + (t.label || t.name || "باب")
                : "marks" === o
                  ? t.label || t.name || "معلم"
                  : (t.code ? t.code + " — " : "") + (t.name || "مصلى"),
            meta: "zones" === o ? l[t.cat] || t.ztype || "مصلى" : t.kind || "بلا نوع",
            dead: "gates" === o ? !!t.closed : !!t.off,
          }))
          .filter((t) => !("gates" === o && KIVO.BassamLeaf.isParent(t.el)));
        i && (f = KIVO.BassamFind.filter(i, f, (t) => [t.name, t.meta]));
        const u = (n && e[o]) || [],
          m = { أ: 0, ب: 0, ج: 0, none: 0 };
        u.forEach((t) => {
          "أ" === t.pri || "ب" === t.pri || "ج" === t.pri ? m[t.pri]++ : m.none++;
        });
        const y = (t, e) => {
            const s = c[e];
            return (
              "flex:0 0 34px;height:28px;border-radius:8px;font-family:'Cairo',sans-serif;font-size:12px;font-weight:700;transition:all .15s;box-sizing:border-box;" +
              (a
                ? "cursor:not-allowed;border:1.5px solid " +
                  (t ? s : "var(--bd-xebebeb)") +
                  ";background:" +
                  (t ? s + "14" : "#F7F7F7") +
                  ";color:" +
                  (t ? s : "var(--fg-xc3c7cb)")
                : "cursor:pointer;border:1.5px solid " +
                  (t ? s : "var(--bd-xe1e1e1)") +
                  ";background:" +
                  (t ? s + "14" : "#fff") +
                  ";color:" +
                  (t ? s : "var(--fg-x94a3b8)"))
            );
          },
          b = (t) => () => this.setState({ priTbl: { kind: t, q: "" } }),
          x = (t) => !(!e.priTbl || !n || n[0] !== t),
          k = (t) =>
            "width:32px;height:32px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;box-sizing:border-box;border:2px solid " +
            (t
              ? "#b99751;background:var(--bg-a185151810p1);color:var(--fg-x9a7e40)"
              : "transparent;background:transparent;color:var(--fg-x475569)");
        return {
          prtOpenZones: b("zones"),
          prtOpenMarks: b("marks"),
          prtOpenGates: b("gates"),
          prtStyleZones: k(x("zones")),
          prtStyleMarks: k(x("marks")),
          prtStyleGates: k(x("gates")),
          prtTitleZones: "جدول أولويات التغطية — المصليات: تصنيف كل مصلى (أ/ب/ج) من جدول واحد",
          prtTitleMarks: "جدول أولويات التغطية — المعالم: تصنيف كل معلم (أ/ب/ج) من جدول واحد",
          prtTitleGates: "جدول أولويات التغطية — الأبواب: تصنيف كل باب (أ/ب/ج) من جدول واحد",
          prtOn: !!e.priTbl && !!n,
          prtClose: () => this.setState({ priTbl: null }),
          prtHead: "أولويات التغطية — " + h + " — " + r,
          prtSub:
            "درجة كل " +
            p.replace("ال", "") +
            ": (أ) لا يُخلى أبداً · (ب) يُخفَّض عند الضرورة · (ج) أول ما يُسحب منه عند العجز · «بدون» يلغي التصنيف — والنقر يُحفظ فوراً",
          prtLockOn: a,
          prtLockMsg: d
            ? "الموقع معتمد ومقفل — التصنيفات للقراءة فقط. افتح القفل بجانب اسم الموقع لتعديلها."
            : "صلاحيتك على هذه الصفحة عرضٌ فقط — التصنيفات للقراءة.",
          prtQ: i,
          onPrtQ: (t) => this.setState((e) => ({ priTbl: { ...(e.priTbl || {}), q: t.target.value } })),
          prtSearchPh: "ابحث باسم " + p.replace("ال", "") + " أو نوعه...",
          prtCount: String(f.length),
          prtChips: [
            ["أ", m["أ"], c["أ"], g["أ"]],
            ["ب", m["ب"], c["ب"], g["ب"]],
            ["ج", m["ج"], c["ج"], g["ج"]],
            ["بدون", m.none, "#94a3b8", "بلا تصنيف بعد"],
          ].map((t) => ({
            label: t[0],
            n: String(t[1]),
            tip: "(" + t[0] + ") " + t[3] + " — " + t[1] + " من " + u.length,
            style:
              "display:inline-flex;align-items:center;gap:5px;flex-shrink:0;font-size:10px;font-weight:700;padding:3px 10px;border-radius:9999px;border:1px solid " +
              t[2] +
              "55;background:" +
              t[2] +
              "11;color:" +
              t[2],
          })),
          prtRows: f.map((t) => {
            const e = "أ" === t.el.pri || "ب" === t.el.pri || "ج" === t.el.pri ? t.el.pri : "";
            return {
              name: t.name,
              meta: t.meta + (t.dead ? ("gates" === o ? " · مغلق" : " · معطّل") : ""),
              nameStyle:
                "flex:1;min-width:170px;display:flex;flex-direction:column;gap:1px;padding:0 8px 0 4px;min-width:0" +
                (t.dead ? ";opacity:.55" : ""),
              curTxt: e ? g[e] : "غير مصنَّف",
              curStyle:
                "width:150px;flex-shrink:0;font-size:9.5px;font-weight:400;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:" +
                (e ? c[e] : "var(--fg-x94a3b8)"),
              segs: ["أ", "ب", "ج"].map((s) => ({
                label: s,
                tip: "(" + s + ") " + g[s],
                st: y(e === s, s),
                go: () => {
                  a || this._priSet(o, t.i, e === s ? "" : s);
                },
              })),
              noneSt:
                ((s = !e),
                "flex:0 0 44px;height:28px;border-radius:8px;font-family:'Cairo',sans-serif;font-size:10px;font-weight:700;transition:all .15s;box-sizing:border-box;" +
                  (a
                    ? "cursor:not-allowed;border:1.5px dashed " +
                      (s ? "var(--bd-x94a3b8)" : "var(--bd-xebebeb)") +
                      ";background:var(--bg-xf7f7f7);color:" +
                      (s ? "var(--fg-x64748b)" : "var(--fg-xc3c7cb)")
                    : "cursor:pointer;border:1.5px dashed " +
                      (s ? "var(--bd-x94a3b8)" : "var(--bd-xd7dce2)") +
                      ";background:" +
                      (s ? "var(--bg-a1481631840p12)" : "var(--bg-xffffff)") +
                      ";color:" +
                      (s ? "var(--fg-x475569)" : "var(--fg-x94a3b8)"))),
              noneGo: () => {
                !a && e && this._priSet(o, t.i, "");
              },
            };
            var s;
          }),
          prtEmpty: 0 === f.length,
          prtEmptyMsg: i ? "لا " + p.replace("ال", "") + " يطابق «" + i + "»" : "لا توجد " + h + " في هذا الموقع بعد.",
          prtFoot:
            "التصنيف يُكتب على " +
            p +
            " نفسه — فيظهر في محرّره وفي جدول الاحتياج وترتيبات السحب سواء. وزرّا «اقتراح الأولويات» في وضع التوزيع يعبّيان الفارغ منه فقط.",
        };
      })(),
      hasShiftFilters: !1,
      shiftFilterOpts: le,
      noshFilterOpt: oe,
      hasNoshOpt: !!oe,
      distFilterLabel: ie(ne),
      assignEmpty:
        ("dist" === e.lens || ("gates" === e.lens && e.gAsn) || ("plan" === e.lens && e.zAsn) || ("marks" === e.lens && e.mAsn)) &&
        !!(Wt || It || jt) &&
        0 === Jt.length,
      assignFilterEmpty:
        ("dist" === e.lens || ("gates" === e.lens && e.gAsn) || ("plan" === e.lens && e.zAsn) || ("marks" === e.lens && e.mAsn)) &&
        !!(Wt || It || jt) &&
        Jt.length > 0 &&
        0 === de.length,
      assignSearchEmpty:
        ("dist" === e.lens || ("gates" === e.lens && e.gAsn) || ("plan" === e.lens && e.zAsn) || ("marks" === e.lens && e.mAsn)) &&
        !!(Wt || It || jt) &&
        de.length > 0 &&
        0 === ge.length,
      assignMonthLabel: (this.MONTHS[e.month - 1] || "") + " " + e.year,
      capAreaVal:
        Wt && null != Wt.area && "" !== Wt.area ? String(Wt.area) : "",
      capAreaPh: Re ? R(Ie) : "أدخل المساحة",
      onCapArea: (t) => {
        const e = t.target.value.replace(/[^0-9.]/g, "");
        this._setZoneCap({ area: "" === e ? null : e });
      },
      capAreaNote: Re ? "محسوبة من الرسمة: " + R(Ie) + " م²" : F > 0 ? "" : "الخريطة غير معايَرة — عايِرها لتُحسب المساحات تلقائياً",
      capAreaNoteOn: Re || F <= 0,
      densBtns: this.DENS_LEVELS.map((t) => {
        const s = (e.floors[e.floor] || {}).dens === t.k;
        return {
          num: String(t.v).replace(/^0/, "."),
          title: t.name + " — " + t.v + " م² لكل مصلٍّ" + (s ? " (نشط)" : ""),
          dotStyle:
            "position:absolute;top:3px;left:3px;width:6px;height:6px;border-radius:9999px;background:" +
            t.c +
            ";opacity:" +
            (s ? "1" : ".45"),
          numStyle: "font-family:'Cairo',sans-serif;font-feature-settings:'tnum';font-size:10px;font-weight:600;letter-spacing:-.2px",
          style:
            "position:relative;width:32px;height:32px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;box-sizing:border-box;flex-shrink:0;border:2px solid " +
            (s ? t.c + ";background:" + t.c + "1A;color:" + t.c : "transparent;background:transparent;color:var(--fg-x475569)"),
          click: () => {
            s ||
              this.setState({ floors: (this.state.floors || []).map((e, s) => (s === this.state.floor ? { ...e, dens: t.k } : e)) }, () =>
                this.savePlan(),
              );
          },
        };
      }),
      ...KIVO.BassamCount.pair("capValText", null == je ? "—" : j(je), "مصل"),
      capValColor: null == je ? "#94a3b8" : "#9A7E40",
      capBoxStyle:
        "display:flex;align-items:center;justify-content:space-between;gap:8px;border-radius:10px;padding:8px 10px;" +
        (null == je
          ? "background:var(--bg-a1481631840p07);border:1px solid var(--bd-a1481631840p3)"
          : "background:var(--bg-a185151810p07);border:1px solid var(--bd-a185151810p25)"),
      capNeedsOn: !!Wt && null == je,
      capNeedsText: Wt ? this.zoneNeeds(Wt, F) : "",
      calOpen: !1 !== e.calOpen,
      calToggle: () => this.setState({ calOpen: !1 === e.calOpen }),
      calChevron: "transition:transform .2s;transform:" + (!1 === e.calOpen ? "rotate(0deg)" : "rotate(180deg)"),
      calToggleTitle:
        !1 === e.calOpen ? "إظهار أدوات الكثافة" : "طيّ أدوات الكثافة",
      calBtnTitle:
        (e.calMode ? (e.calMode.a ? "انقر الطرف الآخر للخط" : "انقر الطرف الأول للخط") : "معايرة مقياس الخريطة") +
        (F > 0 ? " · المقياس الحالي: 1 وحدة رسم = " + R(F) + " م" : " · غير معايَرة"),
      calBtnStyle:
        "width:32px;height:32px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;box-sizing:border-box;border:2px solid " +
        (e.calMode
          ? "#b99751;background:var(--bg-a185151810p1);color:var(--fg-x9a7e40)"
          : "transparent;background:transparent;color:var(--fg-x475569)"),
      densSelClick: () =>
        this.setState(
          {
            calMode: null,
            calAsk: null,
            polyCursor: null,
            floors: (this.state.floors || []).map((t, e) => (e === this.state.floor ? { ...t, dens: null } : t)),
          },
          () => this.savePlan(),
        ),
      densSelStyle:
        "width:32px;height:32px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;box-sizing:border-box;border:2px solid " +
        ((e.floors[e.floor] || {}).dens
          ? "transparent;background:transparent;color:var(--fg-x475569)"
          : "#b99751;background:var(--bg-a185151810p1);color:var(--fg-x9a7e40)"),
      distSelClick: () =>
        this.setState({ sel: null, selMulti: [], distFilterShift: null }),
      distSelStyle:
        "width:32px;height:32px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;box-sizing:border-box;border:2px solid " +
        (null == ne
          ? "#b99751;background:var(--bg-a185151810p1);color:var(--fg-x9a7e40)"
          : "transparent;background:transparent;color:var(--fg-x475569)"),
      distSelTitle: (() => {
        const t = "gates" === e.lens ? "الباب لتسكين موظفيه" : "marks" === e.lens ? "المعلم لتسكين موظفيه" : "المصلى لتسكين موظفيه";
        return "انقر " + t + " — والتصفّح والتحريك بالسحب";
      })(),
      calStart: () => this.setState((t) => ({ calMode: !t.calMode || null, sel: null, selMulti: [], polyCursor: null })),
      roSelStyle:
        "width:32px;height:32px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;box-sizing:border-box;border:2px solid var(--bd-xb99751);background:var(--bg-a185151810p1);color:var(--fg-x9a7e40)",
      capTotalsOn: "density" === e.lens && (e.floors || []).length > 0,
      capEditOn: !d && this._plCanWrite(),
      calAskOn: !!e.calAsk,
      calAskLen: e.calAsk ? e.calAsk.len : "",
      onCalAskLen: (t) => this.setState({ calAsk: { ...this.state.calAsk, len: t.target.value.replace(/[^0-9.]/g, "") } }),
      calAskDist: e.calAsk ? R(e.calAsk.d) : "0",
      calAskCancel: () =>
        this.setState({ calAsk: null, calMode: null, polyCursor: null }),
      onCalKey: (t) => {
        "Enter" === t.key && (t.preventDefault(), this.saveCalibration());
      },
      calAskSave: () => this.saveCalibration(),
      fSite: e.siteName,
      onFSite: (t) => this.setState({ siteName: t.target.value }),
      saveSite: () => {
        const t = this.state.siteName.trim();
        if (!t) return void this.bsToast("أدخل اسم الموقع");
        const e = this.state.floors.map((t, e) =>
          e === this.state.floor
            ? { ...t, zones: this.state.zones, gates: this.state.gates, marks: this.state.marks || [], paths: this.state.paths || [] }
            : t,
        );
        this.setState(
          {
            floors: [
              ...e,
              {
                num: this.state.floors.length,
                name: t,
                approved: !1,
                chip: "بدون خطة لـ محرم",
                chipTone: "warn",
                create: !0,
                zones: [],
                gates: [],
                marks: [],
                paths: [],
              },
            ],
            addSiteOpen: !1,
            siteName: "",
            pickerOpen: !0,
          },
          () => this.savePlan(),
        );
      },
      svgStyle:
        "position:absolute;inset:0;width:100%;height:100%;touch-action:none;-webkit-user-select:none;user-select:none;cursor:" +
        (e.calMode ? "crosshair" : d || "select" === e.tool ? (e.pan ? "grabbing" : "grab") : "crosshair"),
      mapDown: KIVO.BassamPointer.w(
        "down",
        (t) => {
          (this.state.clearFly && this.setState({ clearFly: !1 }), this.state.opGateFly && this.setState({ opGateFly: null }));
          try {
            null != t.pointerId && t.currentTarget.setPointerCapture && t.currentTarget.setPointerCapture(t.pointerId);
          } catch (t) {}
          if ("sector" === this.state.tool) {
            if (this.curApproved() || !this._plCanWrite()) return void this.setState({ tool: "select" });
            const e = Ot(t),
              s = this.state.polyPts;
            if (s.length >= 3) {
              const t = s[0];
              if (Math.hypot(e.x - t.x, e.y - t.y) <= (this.state.view.w / 1e3) * 14) return void this._secCreate(s);
            }
            const n = t.shiftKey && s.length > 0 ? Ct(s[s.length - 1], e) : e;
            return void this.setState({ polyPts: [...s, n], sel: null, selMulti: [] });
          }
          if (("plan" === this.state.lens || "gates" === this.state.lens) && !this.curApproved() && "gate" === this.state.tool) {
            const e = Ot(t),
              s = this.state.gates.map((t) => parseInt(String(t.label || "").replace(/^\D+/, ""), 10) || 0),
              n = Math.max(0, ...s) + 1;
            return void this.setState(
              {
                gates: [...this.state.gates, { x: e.x, y: e.y, label: "باب " + n, emp: [], hideLabel: !0, uid: this._uid() }],
                sel: null,
                selMulti: [],
              },
              () => {
                (this.savePlan(), this.openGateEditor(this.state.gates.length - 1, !0));
              },
            );
          }
          if ("mark" === this.state.tool && !this.curApproved() && "marks" === this.state.lens) {
            const e = Ot(t),
              s = (this.state.marks || []).map((t) => parseInt(String(t.label || "").replace(/^\D+/, ""), 10) || 0),
              n = Math.max(0, ...s, 0) + 1;
            return void this.setState(
              {
                marks: [
                  ...(this.state.marks || []),
                  { x: e.x, y: e.y, label: "معلم " + n, kind: "", emp: [], hideLabel: !1, uid: this._uid() },
                ],
                sel: null,
                selMulti: [],
              },
              () => {
                (this.savePlan(), this.openMarkEditor((this.state.marks || []).length - 1, !0));
              },
            );
          }
          if (("plan" === this.state.lens || "paths" === this.state.lens) && !this.curApproved() && "path" === this.state.tool) {
            const e = Ot(t),
              s = this.state.polyPts;
            if (s.length >= 2) {
              const t = s[s.length - 1];
              if (Math.hypot(e.x - t.x, e.y - t.y) <= (this.state.view.w / 1e3) * 10) return void Lt(s);
            }
            const n = t.shiftKey && s.length > 0 ? Ct(s[s.length - 1], e) : e;
            return void this.setState({ polyPts: [...s, n], sel: null, selMulti: [] });
          }
          if (this.state.calMode && "density" === this.state.lens && !this.curApproved()) {
            const e = Ot(t),
              s = this.state.calMode;
            if (!s.a) return void this.setState({ calMode: { a: e }, polyCursor: e });
            const n = Math.hypot(e.x - s.a.x, e.y - s.a.y);
            if (n < (this.state.view.w / 1e3) * 4) return;
            return void this.setState({ calMode: null, polyCursor: null, calAsk: { a: s.a, b: e, d: n, len: "" } }, () =>
              this._focusEditor("bsCalLen"),
            );
          }
          if (this.curApproved() || ("plan" !== this.state.lens && "gates" !== this.state.lens && "paths" !== this.state.lens))
            return (Pq(), void Pt(t));
          const e = Ot(t),
            s = this.state.tool;
          if ("rect" === s || "square" === s || "circle" === s) {
            const t = this.state.draft;
            t && t.click
              ? Dt({ ...t, cx: e.x, cy: e.y }, s) || this.setState({ draft: null })
              : this.setState({ draft: { x: e.x, y: e.y, cx: e.x, cy: e.y }, sel: null, selMulti: [] });
          } else if ("poly" === s) {
            const s = this.state.polyPts;
            if (s.length >= 3) {
              const t = s[0],
                n = e.x - t.x,
                a = e.y - t.y;
              if (Math.sqrt(n * n + a * a) <= (this.state.view.w / 1e3) * 14)
                return (this.setState({ sel: null, selMulti: [] }), void Ft(s));
            }
            const n = t.shiftKey && s.length > 0 ? Ct(s[s.length - 1], e) : e;
            this.setState({ polyPts: [...s, n], sel: null, selMulti: [] });
          } else if ("path" === s) {
            const s = this.state.polyPts;
            if (s.length >= 2) {
              const t = s[s.length - 1];
              if (Math.hypot(e.x - t.x, e.y - t.y) <= (this.state.view.w / 1e3) * 10) return void Lt(s);
            }
            const n = t.shiftKey && s.length > 0 ? Ct(s[s.length - 1], e) : e;
            this.setState({ polyPts: [...s, n], sel: null, selMulti: [] });
          } else (Pq(), Pt(t));
        },
        this._bpA ||
          (this._bpA = KIVO.BassamPointer.api(
            () => this.state.view,
            (v) => this.setState({ view: v }),
            () => {
              try {
                this.state.draft && this.setState({ draft: null });
              } catch (e) {}
            },
            this,
            "plan",
          )),
      ),
      mapMove: KIVO.BassamPointer.w(
        "move",
        (t) => {
          if (this.state.calMode && this.state.calMode.a) return void this.setState({ polyCursor: Ot(t) });
          if (this.state.sdrag) {
            const e = Ot(t),
              s = this.state.sdrag,
              n = e.x - s.sx,
              a = e.y - s.sy;
            if (!s.moved && Math.hypot(n, a) < (this.state.view.w / 1e3) * 1.2) return;
            const i = this._secs().map((t, e) =>
              e === s.i
                ? { ...t, pts: s.pts.map((t) => ({ x: Math.round(100 * (t.x + n)) / 100, y: Math.round(100 * (t.y + a)) / 100 })) }
                : t,
            );
            return void this.setState((t) => ({
              sdrag: { ...s, moved: !0 },
              floors: (t.floors || []).map((e, s) => (s === t.floor ? { ...e, sectors: i } : e)),
            }));
          }
          if (this.state.svdrag) {
            const e = Ot(t),
              s = this.state.svdrag,
              n = this._secs().map((t, n) =>
                n === s.i ? { ...t, pts: (t.pts || []).map((t, n) => (n === s.j ? { x: e.x, y: e.y } : t)) } : t,
              );
            return void this.setState((t) => ({ floors: (t.floors || []).map((e, s) => (s === t.floor ? { ...e, sectors: n } : e)) }));
          }
          if (this.state.pdrag) {
            const e = Ot(t),
              s = this.state.pdrag,
              n = e.x - s.sx,
              a = e.y - s.sy;
            return void this.setState({
              paths: (this.state.paths || []).map((t, e) =>
                e === s.i ? { ...t, pts: s.pts.map((t) => ({ x: t.x + n, y: t.y + a })) } : t,
              ),
            });
          }
          if (this.state.pvdrag) {
            const e = Ot(t),
              s = this.state.pvdrag,
              n = null == s.sx || Math.hypot(e.x - s.sx, e.y - s.sy) > (this.state.view.w / 1e3) * 1.6,
              a = {
                paths: (this.state.paths || []).map((t, n) =>
                  n === s.i ? { ...t, pts: (t.pts || []).map((t, n) => (n === s.j ? { x: e.x, y: e.y } : t)) } : t,
                ),
              };
            return (n && !s.moved && (a.pvdrag = { ...s, moved: !0 }), void this.setState(a));
          }
          if (this.state.rotdrag) {
            const e = this.state.rotdrag,
              s = Ot(t),
              n = this.state.sel;
            if (n && "zone" === n.t) {
              let a = Math.atan2(s.y - e.cy, s.x - e.cx) - e.startAng;
              if (t.shiftKey) {
                const t = Math.PI / 12;
                a = Math.round(a / t) * t;
              }
              const i = Math.cos(a),
                r = Math.sin(a),
                l = e.pts.map((t) => ({
                  x: Math.round(100 * (e.cx + (t.x - e.cx) * i - (t.y - e.cy) * r)) / 100,
                  y: Math.round(100 * (e.cy + (t.x - e.cx) * r + (t.y - e.cy) * i)) / 100,
                }));
              this.setState({ rotdrag: { ...e, ang: a }, zones: this.state.zones.map((t, e) => (e === n.i ? X(t, l) : t)) });
            }
            return;
          }
          if (this.state.pan) {
            const e = this.state.pan,
              s = this.state.view;
            let n = e.vx - (t.clientX - e.cx) / e.sc,
              a = e.vy - (t.clientY - e.cy) / e.sc;
            return (
              (n = Math.max(0, Math.min(1e3 - s.w, n))),
              (a = Math.max(0, Math.min(600 - s.h, a))),
              void (this._bpA && KIVO.BassamPointer && KIVO.BassamPointer.panTo
                ? KIVO.BassamPointer.panTo(this._bpA, { ...s, x: n, y: a })
                : this.setState({ view: { ...s, x: n, y: a } }))
            );
          }
          if (this.state.zdrag) {
            const e = Ot(t),
              s = this.state.zdrag,
              n = e.x - s.sx,
              a = e.y - s.sy,
              i = this.state.sel;
            return void (
              i &&
              "zone" === i.t &&
              this.setState({
                zones: this.state.zones.map((t, e) =>
                  e === i.i
                    ? X(
                        t,
                        s.pts.map((t) => ({ x: t.x + n, y: t.y + a })),
                      )
                    : t,
                ),
              })
            );
          }
          if (this.state.rdrag) {
            const e = Ot(t),
              s = this.state.rdrag,
              n = this.state.sel;
            if (n && "zone" === n.t) {
              let { x1: t, y1: a, x2: i, y2: r } = s.bb;
              (s.h.indexOf("l") > -1 && (t = Math.min(e.x, i - 20)),
                s.h.indexOf("r") > -1 && (i = Math.max(e.x, t + 20)),
                s.h.indexOf("t") > -1 && (a = Math.min(e.y, r - 20)),
                s.h.indexOf("b") > -1 && (r = Math.max(e.y, a + 20)));
              const l = (i - t) / (s.bb.x2 - s.bb.x1),
                o = (r - a) / (s.bb.y2 - s.bb.y1),
                d = s.pts.map((e) => ({ x: t + (e.x - s.bb.x1) * l, y: a + (e.y - s.bb.y1) * o }));
              this.setState({ zones: this.state.zones.map((t, e) => (e === n.i ? X(t, d) : t)) });
            }
            return;
          }
          if (this.state.vdrag) {
            const e = Ot(t),
              s = this.state.sel;
            if (s && "zone" === s.t) {
              const t = G(this.state.zones[s.i]);
              ((t[this.state.vdrag.i] = e), this.setState({ zones: this.state.zones.map((e, n) => (n === s.i ? X(e, t) : e)) }));
            }
            return;
          }
          if (this.state.edrag) {
            const e = Ot(t),
              s = this.state.edrag,
              n = this.state.sel;
            if (n && "zone" === n.t) {
              let a = e.x - s.sx,
                i = e.y - s.sy;
              t.shiftKey && (Math.abs(a) > Math.abs(i) ? (i = 0) : (a = 0));
              const r = s.pts.map((t, e) => (e === s.a || e === s.b ? { x: t.x + a, y: t.y + i } : t));
              this.setState({ zones: this.state.zones.map((t, e) => (e === n.i ? X(t, r) : t)) });
            }
            return;
          }
          if (this.state.cresize) {
            const e = Ot(t),
              s = this.state.cresize,
              n = this.state.sel;
            if (n && "zone" === n.t) {
              const t = Math.max(4, Math.hypot(e.x - s.cx, e.y - s.cy)) / (s.r0 || 1),
                a = s.pts.map((e) => ({
                  x: Math.round(100 * (s.cx + (e.x - s.cx) * t)) / 100,
                  y: Math.round(100 * (s.cy + (e.y - s.cy) * t)) / 100,
                }));
              this.setState({ zones: this.state.zones.map((t, e) => (e === n.i ? X(t, a) : t)) });
            }
            return;
          }
          if (this.state.tdrag) {
            const e = Ot(t),
              s = this.state.tdrag,
              n = this.state.sel;
            if (n && "zone" === n.t) {
              const t = this.state.zones[n.i],
                a = G(t),
                i = a[s.i],
                r = { x: Math.round(100 * (e.x - i.x)) / 100, y: Math.round(100 * (e.y - i.y)) / 100 },
                l = (t.hs || []).slice();
              for (; l.length < a.length; ) l.push({ in: { x: 0, y: 0 }, out: { x: 0, y: 0 } });
              ((l[s.i] = { ...(l[s.i] || { in: { x: 0, y: 0 }, out: { x: 0, y: 0 } }), [s.side]: r }),
                this.setState({ zones: this.state.zones.map((t, e) => (e === n.i ? X({ ...t, hs: l }, a) : t)) }));
            }
            return;
          }
          if (this.state.gdrag) {
            const e = Ot(t),
              s = this.state.gdrag.i,
              n = this.state.gates[s] || {},
              a = e.x - n.x,
              i = e.y - n.y,
              r = KIVO.BassamLeaf.isParent(n) ? n.gid : null;
            return void this.setState({
              gates: this.state.gates.map((t, n) =>
                n === s ? { ...t, x: e.x, y: e.y } : r && t.pOf === r ? { ...t, x: t.x + a, y: t.y + i } : t,
              ),
            });
          }
          if (this.state.mdrag) {
            const e = Ot(t),
              s = this.state.mdrag.i;
            return void this.setState({ marks: (this.state.marks || []).map((t, n) => (n === s ? { ...t, x: e.x, y: e.y } : t)) });
          }
          if (this.state.draft) {
            const e = Ot(t);
            return void this.setState({ draft: { ...this.state.draft, cx: e.x, cy: e.y } });
          }
          if (("poly" === this.state.tool || "path" === this.state.tool || "sector" === this.state.tool) && this.state.polyPts.length > 0) {
            let e = Ot(t);
            return (t.shiftKey && (e = Ct(this.state.polyPts[this.state.polyPts.length - 1], e)), void this.setState({ polyCursor: e }));
          }
          const e = this.state;
          if (
            "dist" !== e.lens &&
            "density" !== e.lens &&
            (("plan" !== e.lens && "gates" !== e.lens && "paths" !== e.lens && "marks" !== e.lens) ||
              "select" !== e.tool ||
              e.draft ||
              0 !== e.polyPts.length)
          )
            (null == e.hoverZone && null == e.hoverGate && null == e.hoverMark && null == e.hoverPath) ||
              this.setState({ hoverZone: null, hoverGate: null, hoverMark: null, hoverPath: null });
          else {
            const s = Ot(t),
              n = e.view.w / 1e3;
            let a = null;
            const i = e.gates,
              r = 9 * n;
            if ("dist" === e.lens || "gates" === e.lens)
              for (let t = i.length - 1; t >= 0; t--)
                if (KIVO.BassamLeaf.shown(i[t], e.gExp) && Math.hypot(s.x - i[t].x, s.y - i[t].y) <= r) {
                  a = t;
                  break;
                }
            let l = null;
            const o = e.marks || [];
            if (null == a && ("dist" === e.lens || "marks" === e.lens))
              for (let t = o.length - 1; t >= 0; t--)
                if (Math.hypot(s.x - o[t].x, s.y - o[t].y) <= r) {
                  l = t;
                  break;
                }
            let d = null;
            if ("plan" === e.lens || "paths" === e.lens) {
              const t = (t, e, s) => {
                  const n = s.x - e.x,
                    a = s.y - e.y,
                    i = n * n + a * a;
                  if (!i) return Math.hypot(t.x - e.x, t.y - e.y);
                  let r = ((t.x - e.x) * n + (t.y - e.y) * a) / i;
                  return ((r = Math.max(0, Math.min(1, r))), Math.hypot(t.x - (e.x + r * n), t.y - (e.y + r * a)));
                },
                a = 8 * n,
                i = e.paths || [];
              t: for (let e = i.length - 1; e >= 0; e--) {
                const n = i[e].pts || [];
                for (let i = 0; i + 1 < n.length; i++)
                  if (t(s, n[i], n[i + 1]) <= a) {
                    d = e;
                    break t;
                  }
              }
            }
            const h = e.zones;
            let p = null;
            if (null == a && null == l && null == d && "gates" !== e.lens && "paths" !== e.lens && "marks" !== e.lens)
              for (let t = h.length - 1; t >= 0; t--)
                if (H(s, G(h[t]))) {
                  p = t;
                  break;
                }
            (e.hoverZone === p && e.hoverGate === a && e.hoverMark === l && e.hoverPath === d) ||
              this.setState({ hoverZone: p, hoverGate: a, hoverMark: l, hoverPath: d });
          }
        },
        this._bpA ||
          (this._bpA = KIVO.BassamPointer.api(
            () => this.state.view,
            (v) => this.setState({ view: v }),
            () => {
              try {
                this.state.draft && this.setState({ draft: null });
              } catch (e) {}
            },
            this,
            "plan",
          )),
      ),
      mapUp: KIVO.BassamPointer.w(
        "up",
        () => {
          if (this.state.sdrag || this.state.svdrag) {
            const t = (this.state.sdrag && this.state.sdrag.moved) || !!this.state.svdrag;
            return void this.setState({ sdrag: null, svdrag: null }, () => {
              t && this.savePlan();
            });
          }
          if (this.state.pan) return void this.setState({ pan: null });
          if (this.state.rotdrag) {
            const t = this.state.rotdrag,
              e = this.state.sel,
              s = this._rotLab && "number" == typeof this._rotLab.lang0 ? this._rotLab.lang0 : null,
              n = (180 * (t.ang || 0)) / Math.PI;
            return (
              (this._rotLab = null),
              void this.setState(
                {
                  rotdrag: null,
                  zones:
                    e && "zone" === e.t && Math.abs(n) > 0.01
                      ? this.state.zones.map((t, a) => {
                          if (a !== e.i) return t;
                          let i = (null != s ? s : "number" == typeof t.lang ? t.lang : 0) + n;
                          return ((i = ((i % 360) + 360) % 360), i > 180 && (i -= 360), { ...t, lang: Math.round(10 * i) / 10 });
                        })
                      : this.state.zones,
                },
                () => this.savePlan(),
              )
            );
          }
          if (this.state.pdrag || this.state.pvdrag) {
            const t = this.state.pvdrag;
            return t && t.added && !t.moved && t.pts0
              ? void this.setState(
                  { pdrag: null, pvdrag: null, paths: (this.state.paths || []).map((e, s) => (s === t.i ? { ...e, pts: t.pts0 } : e)) },
                  () => this.savePlan(),
                )
              : void this.setState({ pdrag: null, pvdrag: null }, () => this.savePlan());
          }
          if (
            this.state.zdrag ||
            this.state.vdrag ||
            this.state.edrag ||
            this.state.tdrag ||
            this.state.cresize ||
            this.state.gdrag ||
            this.state.mdrag ||
            this.state.rdrag
          )
            return void this.setState(
              { zdrag: null, vdrag: null, edrag: null, tdrag: null, cresize: null, gdrag: null, mdrag: null, rdrag: null },
              () => this.savePlan(),
            );
          const t = this.state.draft;
          t &&
            (Math.hypot(t.cx - t.x, t.cy - t.y) > (this.state.view.w / 1e3) * 4
              ? Dt(t, this.state.tool) || this.setState({ draft: null })
              : t.click || this.setState({ draft: { ...t, click: !0 } }));
        },
        this._bpA ||
          (this._bpA = KIVO.BassamPointer.api(
            () => this.state.view,
            (v) => this.setState({ view: v }),
            () => {
              try {
                this.state.draft && this.setState({ draft: null });
              } catch (e) {}
            },
            this,
            "plan",
          )),
      ),
      mapDbl: () => {
        if ("sector" === this.state.tool)
          return void (this.state.polyPts.length >= 3
            ? this._secCreate(this.state.polyPts)
            : this.setState({ polyPts: [], polyCursor: null }));
        if ("path" === this.state.tool)
          return void (this.state.polyPts.length >= 2 ? Lt(this.state.polyPts) : this.setState({ polyPts: [], polyCursor: null }));
        if (this.state.polyPts.length >= 3) return void Ft(this.state.polyPts);
        const t = this.state.sel;
        if (
          "select" === this.state.tool &&
          t &&
          !this.curApproved() &&
          ("plan" === this.state.lens || ("gates" === this.state.lens && "gate" === t.t) || ("paths" === this.state.lens && "path" === t.t))
        ) {
          if ("path" === t.t) return (this.setState({ pdrag: null, pvdrag: null }), void this.openPathEditor(t.i, !1));
          if ("zone" === t.t) return void this.openZoneEditor(t.i, !1);
          if ("gate" === t.t) return void this.openGateEditor(t.i, !1);
        }
        this.setState({ polyPts: [], polyCursor: null });
      },
      selLabel: e.sel
        ? "sector" === e.sel.t
          ? SS
            ? this._secLabel(SS)
            : ""
          : "zone" === e.sel.t
            ? e.zones[e.sel.i]
              ? e.zones[e.sel.i].code
              : ""
            : "path" === e.sel.t
              ? ((e.paths || [])[e.sel.i] || {}).name || ""
              : e.gates[e.sel.i]
                ? e.gates[e.sel.i].label
                : ""
        : "",
      deleteSel: () => this.removeSel(),
      isDistLens:
        this.bsLensOn("dist") &&
        ("dist" === e.lens || ("gates" === e.lens && e.gAsn) || ("plan" === e.lens && e.zAsn) || ("marks" === e.lens && e.mAsn)),
      isDensLens: "density" === e.lens && this.bsLensOn("dens"),
      densLvlText: (() => {
        const t = this.curDensLevel();
        return t ? "الازدحام: " + t.name + " · " + t.v + " م²/مصلٍّ" : "بلا مستوى ازدحام — لا تُحسب سعة";
      })(),
      densLvlDot: (() => {
        const t = this.curDensLevel();
        return "width:9px;height:9px;border-radius:3px;background:" + (t ? t.c : "var(--bg-xcbd5e1)");
      })(),
      densLvlLbl: (() => {
        const t = this.curDensLevel();
        return "font-size:10px;font-weight:" + (t ? "700" : "400") + ";color:" + (t ? t.c : "var(--fg-x94a3b8)");
      })(),
      toolHintOn: (e.floors || []).length > 0 && !!h,
      toolHint: h,
      ...(() => {
        const t = this._mKey(e.year, e.month),
          s = this._mData(e.planMonths, t),
          n = this._hasPlanFor(e.planMonths, t),
          a = n && s && s.length > 0 && s.every((t) => !!t.approved);
        return {
          planChipText: function () {
            const t = "خطة " + (this.MONTHS[e.month - 1] || "") + " " + e.year + " هـ";
            return n ? (a ? t + " — مقفل" : t + " — مفتوحة") : t + " — لا توجد خطة";
          }.call(this),
          planChipStyle:
            "display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;border-radius:9999px;padding:4px 12px;font-family:'Cairo',sans-serif;cursor:default;border:1px solid ".concat(
              a
                ? "rgba(0,132,80,0.35);color:var(--fg-x008450);background:var(--bg-a0132800p1)"
                : n
                  ? "rgba(245,158,11,0.35);color:var(--fg-x92400e);background:var(--bg-a245158110p12)"
                  : "rgba(148,163,184,0.35);color:var(--fg-x64748b);background:var(--bg-a1481631840p1)",
            ),
        };
      })(),
      approveBadgeText: d ? "الموقع معتمد ومقفل" : "الموقع مسودة مفتوحة",
      approveBadgeIcon: d
        ? "M7 11V7a5 5 0 0 1 10 0v4"
        : "M7 11V7a5 5 0 0 1 9.9-1",
      approveBadgeTip: d
        ? "حالة الموقع: معتمد ومقفل — لفتحه للتعديل اضغط القفل بجانب اسمه في قائمة «الموقع النشط»"
        : "حالة الموقع: مسودة مفتوحة — لاعتماده وقفله اضغط القفل بجانب اسمه في قائمة «الموقع النشط»",
      approveBadgeStyle:
        "display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:400;white-space:nowrap;font-family:'Cairo',sans-serif;cursor:help;color:" +
        (d ? "var(--fg-x047857)" : "var(--fg-xb45309)"),
      lensPlan: () =>
        this.setState({
          lens: "plan",
          panelTab: "zones",
          brkDim: this.state.zAsn ? "dsum" : "summary",
          tool: "select",
          sel: null,
          selMulti: [],
          hoverZone: null,
          hoverGate: null,
          draft: null,
          polyPts: [],
          polyCursor: null,
          calMode: null,
          calAsk: null,
        }),
      lensGates: () => {
        this.bsLensOn("gates") &&
          this.setState({
            lens: "gates",
            panelTab: "gates",
            gateDim: this.state.gAsn ? "dsum" : "summary",
            tool: "select",
            sel: null,
            selMulti: [],
            hoverZone: null,
            hoverGate: null,
            draft: null,
            polyPts: [],
            polyCursor: null,
            calMode: null,
            calAsk: null,
          });
      },
      mAsnTogOn:
        "marks" === e.lens && this.bsLensOn("marks") && this.bsLensOn("dist"),
      mAsnAddGo: () =>
        this.setState({
          asnFly: null,
          mAsn: !1,
          panelTab: "marks",
          markDim: "summary",
          tool: "select",
          sel: null,
          selMulti: [],
          draft: null,
          polyPts: [],
          polyCursor: null,
        }),
      mAsnAsnGo: () => {
        this.bsLensOn("dist") &&
          this.setState({
            asnFly: null,
            mAsn: !0,
            panelTab: "marks",
            markDim: "dsum",
            tool: "select",
            sel: null,
            selMulti: [],
            draft: null,
            polyPts: [],
            polyCursor: null,
          });
      },
      mAsnAddStyle: Nt(!e.mAsn),
      mAsnAsnStyle: Nt(!!e.mAsn),
      zAsnTogOn: ("plan" === e.lens || "density" === e.lens) && this.bsLensOn("zones") && (this.bsLensOn("dist") || this.bsLensOn("dens")),
      zAsnDistOn: this.bsLensOn("dist"),
      zAsnAddGo: () =>
        this.setState({
          lens: "plan",
          asnFly: null,
          zAsn: !1,
          panelTab: "zones",
          brkDim: "summary",
          tool: "select",
          sel: null,
          selMulti: [],
          draft: null,
          polyPts: [],
          polyCursor: null,
        }),
      zAsnAsnGo: () => {
        this.bsLensOn("dist") &&
          this.setState({
            lens: "plan",
            asnFly: null,
            zAsn: !0,
            panelTab: "zones",
            brkDim: "dsum",
            tool: "select",
            sel: null,
            selMulti: [],
            draft: null,
            polyPts: [],
            polyCursor: null,
          });
      },
      zAsnAddStyle: Nt(!e.zAsn && "density" !== e.lens),
      zAsnAsnStyle: Nt(!!e.zAsn && "density" !== e.lens),
      zDensModeStyle: Nt("density" === e.lens),
      gAsnTogOn:
        "gates" === e.lens && this.bsLensOn("gates") && this.bsLensOn("dist"),
      gAsnAddGo: () =>
        this.setState({
          asnFly: null,
          gAsn: !1,
          panelTab: "gates",
          gateDim: "summary",
          tool: "select",
          sel: null,
          selMulti: [],
          draft: null,
          polyPts: [],
          polyCursor: null,
        }),
      gAsnAsnGo: () => {
        this.bsLensOn("dist") &&
          this.setState({
            asnFly: null,
            gAsn: !0,
            panelTab: "gates",
            gateDim: "dsum",
            tool: "select",
            sel: null,
            selMulti: [],
            draft: null,
            polyPts: [],
            polyCursor: null,
          });
      },
      gAsnAddStyle: Nt(!e.gAsn),
      gAsnAsnStyle: Nt(!!e.gAsn),
      lensMarks: () => {
        this.bsLensOn("marks") &&
          this.setState({
            lens: "marks",
            panelTab: "marks",
            markDim: this.state.mAsn ? "dsum" : "summary",
            tool: "select",
            sel: null,
            selMulti: [],
            hoverZone: null,
            hoverGate: null,
            draft: null,
            polyPts: [],
            polyCursor: null,
            calMode: null,
            calAsk: null,
          });
      },
      lensDist: () => {
        this.bsLensOn("dist") &&
          this.setState({
            lens: "dist",
            distDim: "summary",
            tool: "select",
            sel: null,
            selMulti: [],
            hoverZone: null,
            hoverGate: null,
            draft: null,
            polyPts: [],
            polyCursor: null,
            calMode: null,
            calAsk: null,
          });
      },
      lensDensity: () => {
        this.bsLensOn("dens") &&
          this.setState({
            lens: "density",
            panelTab: "dens",
            densDim: "summary",
            tool: "select",
            sel: null,
            selMulti: [],
            hoverZone: null,
            hoverGate: null,
            draft: null,
            polyPts: [],
            polyCursor: null,
            calMode: null,
            calAsk: null,
          });
      },
      lensPlanStyle: Nt(
        "plan" === e.lens || "paths" === e.lens || "density" === e.lens,
      ),
      lensMarksStyle: Nt("marks" === e.lens),
      lensGatesStyle: Nt("gates" === e.lens),
      lensDistStyle: Nt("dist" === e.lens),
      lensDensityStyle: Nt("density" === e.lens),
      addSiteOpen: e.addSiteOpen,
      openAddSite: () => this.setState({ addSiteOpen: !0 }),
      closeAddSite: () => this.setState({ addSiteOpen: !1 }),
      pickerOpen: e.pickerOpen,
      closePicker: () => this.setState({ pickerOpen: !1 }),
      ...(() => {
        const S = this._secs(),
          ADD = ("plan" === e.lens && !e.zAsn) || ("gates" === e.lens && !e.gAsn) || ("marks" === e.lens && !e.mAsn),
          DM =
            this.bsLensOn("dist") &&
            ("dist" === e.lens || ("gates" === e.lens && e.gAsn) || ("plan" === e.lens && e.zAsn) || ("marks" === e.lens && e.mAsn)),
          W = ADD && !d && this._plCanWrite(),
          vw = e.view.w / 1e3,
          FL = e.floors[e.floor] || {},
          hid = !0 === FL.hideSectors,
          sel = e.sel && "sector" === e.sel.t ? e.sel.i : -1,
          cur = sel >= 0 ? S[sel] : null,
          tb = (t) =>
            "width:32px;height:32px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;box-sizing:border-box;border:2px solid " +
            (t
              ? "#b99751;background:var(--bg-a185151810p1);color:var(--fg-x9a7e40)"
              : "transparent;background:transparent;color:var(--fg-x475569)"),
          lab = this._secLabel.bind(this),
          NEED = KIVO.BassamNeed,
          statsOf = (t) => {
            const s = { zones: 0, gates: 0, marks: 0, need: 0, plc: 0, amb: 0 };
            return (
              [
                ["zone", e.zones || []],
                ["gate", e.gates || []],
                ["mark", e.marks || []],
              ].forEach(([e, n]) => {
                n.forEach((n) => {
                  if (!n || ("gate" === e && n.pOf)) return;
                  const a = this._secOf(n, e, S);
                  (a.amb && a.cands.some((e) => e.id === t.id) && s.amb++,
                    a.sec &&
                      a.sec.id === t.id &&
                      (s["zone" === e ? "zones" : "gate" === e ? "gates" : "marks"]++,
                      NEED && NEED.has && !n.off && !n.closed && NEED.has(n, y) && (s.need += NEED.tot(n, y)),
                      (s.plc += (n.emp || []).length)));
                });
              }),
              s
            );
          },
          shown = (hid ? [] : S).map((t, s) => ({ t, s })).filter((t) => t.t && Array.isArray(t.t.pts) && t.t.pts.length >= 3),
          live = (ADD || DM) && !d && "select" === e.tool;
        return {
          secToolOn: W,
          tSectorStyle: tb("sector" === e.tool),
          toolSector: () =>
            this.setState({
              tool: "sector",
              sel: null,
              selMulti: [],
              polyPts: [],
              polyCursor: null,
              draft: null,
              shapeFly: null,
              clearFly: null,
            }),
          secClearAsk: () => {
            (this.setState({ clearFly: null }), S.length && this.setState({ clearAsk: { kind: "sectors" } }));
          },
          secHasAny: S.length > 0,
          secFlyOn: ADD,
          eyeSectors: () =>
            this.setState(
              (t) => ({
                clearFly: null,
                floors: (t.floors || []).map((e, s) => (s === t.floor ? { ...e, hideSectors: !0 !== e.hideSectors } : e)),
              }),
              () => this.savePlan(),
            ),
          eyeSectorsLabel: hid ? "إظهار النطاقات" : "إخفاء النطاقات",
          sectorNodes: shown.length
            ? React.createElement(
                "g",
                { key: "secL" + (e.floor || 0) },
                shown.map(({ t, s }) => {
                  const n = s === sel,
                    a = t.pts.map((t) => t.x),
                    i = t.pts.map((t) => t.y),
                    r = (Math.min(...a) + Math.max(...a)) / 2,
                    l = Math.min(...i),
                    o = lab(t),
                    h = Math.max(1, o.length),
                    p = Math.max(7.5, Math.min(11, 120 / h)) * vw,
                    c = 0.62 * p * h + 14 * vw,
                    g = 1.9 * p,
                    col = t.color || "#b99751",
                    hov = e.hoverSector === s;
                  return React.createElement(
                    "g",
                    { key: "sec" + s },
                    React.createElement("path", {
                      d: this._secD(t.pts),
                      fill: col,
                      fillOpacity: n ? 0.2 : hov ? 0.16 : ADD || DM ? 0.11 : 0.06,
                      stroke: col,
                      strokeWidth: (n ? 2.6 : hov ? 2.2 : ADD ? 1.9 : 1.3) * vw,
                      strokeDasharray: n ? "none" : 9 * vw + " " + 5 * vw,
                      strokeLinejoin: "round",
                      strokeOpacity: ADD ? 0.95 : 0.55,
                      style: { cursor: live ? (W ? "move" : "pointer") : "default", pointerEvents: live ? "auto" : "none" },
                      onMouseEnter: () => this.setState({ hoverSector: s }),
                      onMouseLeave: () => {
                        this.state.hoverSector === s && this.setState({ hoverSector: null });
                      },
                      onPointerDown: (t) => {
                        if (!live) return;
                        if ("select" !== this.state.tool) return;
                        t.stopPropagation();
                        const e = Ot(t),
                          n = this._secs()[s];
                        this.setState({
                          sel: { t: "sector", i: s },
                          selMulti: [],
                          draft: null,
                          polyPts: [],
                          polyCursor: null,
                          sdrag: W && ADD && n ? { i: s, sx: e.x, sy: e.y, pts: n.pts.map((t) => ({ x: t.x, y: t.y })), moved: !1 } : null,
                        });
                      },
                      onDoubleClick: (t) => {
                        (t.stopPropagation(), W && ADD && this.openSectorEditor(s, !1));
                      },
                    }),
                    !0 === t.showLbl
                      ? React.createElement(
                          "g",
                          {
                            transform: "translate(" + (r - c / 2) + "," + (l - g / 2) + ")",
                            opacity: ADD ? 1 : 0.75,
                            style: { pointerEvents: "none" },
                          },
                          React.createElement("rect", { width: c, height: g, rx: g / 2, fill: col, stroke: "#fff", strokeWidth: 0.9 * vw }),
                          React.createElement(
                            "text",
                            {
                              x: c / 2,
                              y: 0.68 * g,
                              textAnchor: "middle",
                              fontSize: p,
                              fontWeight: 700,
                              fill: "#fff",
                              style: { fontFamily: "'Cairo',sans-serif" },
                            },
                            o,
                          ),
                        )
                      : null,
                  );
                }),
              )
            : null,
          sectorHandleNodes:
            cur && W && ADD && "select" === e.tool
              ? (() => {
                  const t = cur.pts,
                    s = [],
                    n = sel;
                  for (let a = 0; a < t.length; a++) {
                    const i = t[a],
                      r = t[(a + 1) % t.length],
                      l = (i.x + r.x) / 2,
                      o = (i.y + r.y) / 2;
                    s.push(
                      React.createElement("circle", {
                        key: "sm" + a,
                        cx: l,
                        cy: o,
                        r: 2.6 * vw,
                        fill: "#fff",
                        stroke: cur.color || "#b99751",
                        strokeWidth: 1.1 * vw,
                        strokeDasharray: 1.8 * vw + " " + 1.6 * vw,
                        opacity: 0.9,
                        style: { cursor: "copy" },
                        onPointerDown: (t) => {
                          if ((t.stopPropagation(), t.detail >= 2)) return;
                          const e = this._secs(),
                            s = (e[n] || {}).pts || [],
                            i = s.slice();
                          (i.splice(a + 1, 0, { x: l, y: o }),
                            this.setState({ svdrag: { i: n, j: a + 1 }, sdrag: null }),
                            this._secWrite(e.map((t, e) => (e === n ? { ...t, pts: i } : t))));
                        },
                      }),
                    );
                  }
                  return (
                    t.forEach((t, a) =>
                      s.push(
                        React.createElement("circle", {
                          key: "sv" + a,
                          cx: t.x,
                          cy: t.y,
                          r: 3.8 * vw,
                          fill: "#fff",
                          stroke: cur.color || "#b99751",
                          strokeWidth: 1.6 * vw,
                          style: { cursor: "grab" },
                          onPointerDown: (t) => {
                            (t.stopPropagation(), this.setState({ svdrag: { i: n, j: a }, sdrag: null }));
                          },
                          onDoubleClick: (t) => {
                            t.stopPropagation();
                            const e = this._secs(),
                              s = (e[n] || {}).pts || [];
                            s.length <= 3
                              ? this.bsToast("النطاق لا يقلّ عن ثلاث نقاط", "warn")
                              : this._secWrite(e.map((t, e) => (e === n ? { ...t, pts: s.filter((t, e) => e !== a) } : t)));
                          },
                        }),
                      ),
                    ),
                    React.createElement("g", { key: "secH" }, s)
                  );
                })()
              : null,
          secTip: (this._secTipObj = (() => {
            const t = null != e.hoverSector ? S[e.hoverSector] : null;
            if (!t || e.sEdit) return null;
            const s = statsOf(t),
              n = [];
            (t.cat && n.push({ label: "التصنيف", value: t.cat }),
              t.lead && n.push({ label: "مسؤول النطاق", value: t.lead + (A[t.lead] ? " · " + A[t.lead] : "") }),
              n.push({ label: "المصليات", value: String(s.zones) }),
              n.push({ label: "الأبواب", value: String(s.gates) }),
              n.push({ label: "المعالم", value: String(s.marks) }),
              s.amb && n.push({ label: "على حدّ نطاقين", value: s.amb + " — حدّدها من بيانات النطاق (نقرة مزدوجة)", wide: !0 }),
              t.note && n.push({ label: "الحدود", value: t.note, wide: !0 }));
            const EMP = (t.emp || []).slice(),
              people = EMP.map((t) => {
                const e = u[t] || {},
                  s = A[t] || "";
                return {
                  name: this._nm(t),
                  phone: e.phone || "",
                  shName: s,
                  color: (y.find((t) => t.name === s) || {}).color || "#94a3b8",
                  rest: !!E[t],
                };
              }).sort(
                (t, e) => String(t.shName).localeCompare(String(e.shName), "ar") || String(t.name).localeCompare(String(e.name), "ar"),
              );
            EMP.length &&
              n.push({
                label: "مسكّنون على النطاق",
                value:
                  (1 === EMP.length
                    ? "موظف واحد"
                    : 2 === EMP.length
                      ? "موظفان"
                      : EMP.length <= 10
                        ? EMP.length + " موظفين"
                        : KIVO.BassamCount(EMP.length, "موظف") + "") +
                  y
                    .filter((t) => EMP.some((e) => A[e] === t.name))
                    .map((t) => " · " + t.name + " " + EMP.filter((e) => A[e] === t.name).length)
                    .join(""),
                wide: !0,
              });
            const a = s.zones + s.gates + s.marks;
            return {
              accent: t.color || "#b99751",
              code: t.code || "",
              title: t.name || "نطاق",
              status: { text: a ? KIVO.BassamCount(a, "عنصر") + " داخله" : "بلا عناصر", tone: a ? "ok" : "off" },
              hero:
                s.need > 0
                  ? { value: String(s.plc), unit: "موظف", label: "مسكّنون داخل النطاق من احتياج " + s.need }
                  : { text: a ? "لا احتياج محدّد لعناصره بعد" : "ارسم المصليات والأبواب داخل حدوده" },
              stats: n,
              people: people,
              foot: W
                ? "نقرة مزدوجة لتعديل بيانات النطاق · اسحبه أو اسحب رؤوسه لتعديل حدوده"
                : DM
                  ? "انقر النطاق لتسكين موظفيه من قائمة الورديات"
                  : "بيانات النطاق للقراءة",
            };
          })()),
          hoverTipNode: KIVO.BassamTip && (ot || this._secTipObj) ? KIVO.BassamTip.card(ot || this._secTipObj) : null,
          sEditOn: !!e.sEdit,
          seTitle: e.sEdit && e.sEdit.isNew ? "نطاق جديد" : "بيانات النطاق",
          seSub: e.sEdit && e.sEdit.isNew ? "حدّد رمزه واسمه · «إلغاء» يلغي رسمه" : "نقرة مزدوجة على أي نطاق تفتح هذه النافذة",
          seCode: e.sEdit ? e.sEdit.code : "",
          onSeCode: (t) => this.setState({ sEdit: { ...this.state.sEdit, code: t.target.value } }),
          seName: e.sEdit ? e.sEdit.name : "",
          onSeName: (t) => this.setState({ sEdit: { ...this.state.sEdit, name: t.target.value } }),
          seCat: e.sEdit ? e.sEdit.cat : "",
          onSeCat: (t) => this.setState({ sEdit: { ...this.state.sEdit, cat: t.target.value } }),
          seCatOpts: (() => {
            const t = {};
            return (
              (e.floors || []).forEach((e) =>
                ((e && e.sectors) || []).forEach((e) => {
                  e && e.cat && (t[e.cat] = 1);
                }),
              ),
              ["تشغيلي", "أمني", "خدمي", "إداري"].forEach((e) => {
                t[e] = 1;
              }),
              Object.keys(t).map((t) => ({ v: t }))
            );
          })(),
          seColors: ["#b99751", "#2f8f86", "#2f5f8a", "#1e9a66", "#b45309", "#8b1a3a", "#2f8f86", "#9c3d6b"].map((t) => ({
            style:
              "width:22px;height:22px;border-radius:50%;cursor:pointer;background:" +
              t +
              ";border:2px solid var(--bd-xffffff);box-shadow:0 0 0 " +
              (e.sEdit && e.sEdit.color === t ? "2px " + t : "1px #E1E1E1"),
            click: () => this.setState({ sEdit: { ...this.state.sEdit, color: t } }),
          })),
          seLead: e.sEdit ? e.sEdit.lead || "" : "",
          seLeadOpts: [{ v: "", t: "— بلا مسؤول —" }].concat(
            (f || [])
              .filter((t) => t && t.name)
              .slice()
              .sort((t, e) => String(t.name).localeCompare(String(e.name), "ar"))
              .map((t) => ({ v: t.name, t: t.name + (A[t.name] ? " — " + A[t.name] : "") })),
          ),
          onSeLead: (t) => this.setState({ sEdit: { ...this.state.sEdit, lead: t.target.value } }),
          seNote: e.sEdit ? e.sEdit.note : "",
          onSeNote: (t) => this.setState({ sEdit: { ...this.state.sEdit, note: t.target.value } }),
          seLblOn: !!(e.sEdit && e.sEdit.showLbl),
          seLblTog: () => this.setState({ sEdit: { ...this.state.sEdit, showLbl: !this.state.sEdit.showLbl } }),
          seLblStyle:
            "position:relative;width:30px;height:16px;border-radius:9999px;flex-shrink:0;transition:background .2s;background:" +
            (e.sEdit && e.sEdit.showLbl ? "var(--bg-xb99751)" : "var(--bg-xcbd5e1)"),
          seLblKnob:
            "position:absolute;top:2px;width:12px;height:12px;border-radius:50%;background:var(--bg-xffffff);transition:all .2s;" +
            (e.sEdit && e.sEdit.showLbl ? "right:2px" : "right:16px"),
          seLblTxt:
            e.sEdit && e.sEdit.showLbl ? "الرمز والاسم ظاهران على الخريطة" : "الرمز والاسم مخفيّان — يظهران في التلميحة عند التمرير",
          ...(() => {
            const t = e.sEdit ? S[e.sEdit.i] : null;
            if (!t) return { seAmbOn: !1, seAmb: [], seElems: "", seStat: "" };
            const s = statsOf(t),
              n = this._secElems(t)
                .filter((t) => t.of.amb && !t.of.manual)
                .map((t) => ({
                  key: t.kind + t.i,
                  kind: { zone: "مصلى", gate: "باب", mark: "معلم" }[t.kind],
                  name: this._secWord(t.kind, t.el),
                  pickVal: t.el.sec || "",
                  opts: [{ v: "", t: "— اختر النطاق —" }].concat(t.of.cands.map((e) => ({ v: e.id, t: lab(e) }))),
                  onPick: (e) => this._secSetEl(t.kind, t.i, e.target.value),
                }));
            return {
              seAmbOn: n.length > 0,
              seAmb: n,
              seStat:
                KIVO.BassamCount(s.zones, "مصلى") +
                " · " +
                KIVO.BassamCount(s.gates, "باب") +
                " · " +
                KIVO.BassamCount(s.marks, "معلم") +
                "" +
                (s.need ? " · احتياج " + s.need + " مسكّن منه " + s.plc : ""),
            };
          })(),
          seSave: () => this.saveSectorEdit(),
          seCancel: () => this.closeSectorEdit(),
          seDelete: () => {
            const t = this.state.sEdit;
            t && this.removeSector(t.i);
          },
          seDeleteOn: !!(e.sEdit && !e.sEdit.isNew && this.PC("del")),
          onSeKey: (t) => {
            "Enter" === t.key && (t.preventDefault(), this.saveSectorEdit());
          },
        };
      })(),
      stopClick: (t) => t.stopPropagation(),
      ...t,
    };
    var Ge;
  }
}
