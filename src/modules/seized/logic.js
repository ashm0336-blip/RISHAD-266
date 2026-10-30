class Component extends KIVO.BassamPageKit.base(DCLogic, ["admin+award+daily+dreport+employees+irshad+plan+profile+seized+staff+tasks","daily+dreport+dstats+irshad+plan+seized+staff+tasks","daily+dreport+irshad+plan+seized+staff+tasks","dreport+irshad+planning+profile+seized+staff+tasks","daily+dreport+irshad+plan+profile+seized","daily+plan+seized+staff","admin+profile+seized","award+irshad+seized","irshad+seized+tasks","admin+seized","irshad+seized"]) {
  hGreg(t, e, s) {
    let a = new Date(new Date(2026, 5, 16).getTime() + 864e5 * (29.5306 * (12 * (t - 1448) + (e - 1)) + (s - 1)));
    try {
      for (let r = 0; r < 12; r++) {
        const r = this.hParts(a);
        if (r.y === t && r.m === e && r.d === s) return a;
        const i = 354.367 * (r.y - t) + 29.5306 * (r.m - e) + (r.d - s);
        a = new Date(a.getTime() - 864e5 * (Math.round(i) || (i > 0 ? 1 : -1)));
      }
    } catch (t) {}
    return a;
  }
  hMonthDays(t, e) {
    const s = t + "-" + e;
    if (((this.__hd = this.__hd || {}), this.__hd[s])) return this.__hd[s];
    let a = 30;
    try {
      const s = this.hGreg(t, e, 1),
        r = this.hParts(new Date(s.getTime() + 25056e5));
      a = r.y === t && r.m === e ? 30 : 29;
    } catch (t) {}
    return ((this.__hd[s] = a), a);
  }
  hGregMonthLabel(t, e) {
    const s = t + "-" + e;
    if (((this.__hg = this.__hg || {}), this.__hg[s])) return this.__hg[s];
    let a = "";
    try {
      a = this.hGreg(t, e, 15).toLocaleDateString("ar-u-ca-gregory-nu-latn", { month: "long", year: "numeric" });
    } catch (t) {}
    return ((this.__hg[s] = a), a);
  }
  SZ_VER = "النسخة الثالثة — 2026/07/02";
  SZ_DEF_ACTS = [
    { k: "sec", name: "أُحيل للجهة الأمنية", color: "#dc2626" },
    { k: "des", name: "أُتلف / صودر", color: "#b45309" },
    { k: "sto", name: "محفوظ بالمستودع", color: "#475569" },
  ];
  SZ_DEF_CATS() {
    const t = (t, e, s, a) => ({
      name: t,
      color: e,
      def: s,
      items: a.map((t) => ({ id: t[0], name: t[1], desc: t[2] || "", unit: t[3] || "pc" })),
    });
    return [
      t("الأجهزة والمعدات", "#1d6fd6", "sto", [
        [1, "أجهزة التنصت الإلكترونية", "معدات تقنية صُممت خصيصاً للاستماع أو تسجيل المحادثات والاتصالات بشكل سري"],
        [2, "الطائرات اللاسلكية (الدرون)", "مركبات جوية يتم التحكم بها عن بعد"],
        [3, "أجهزة الاتصالات اللاسلكية والإرسال", "معدات تقنية لإرسال واستقبال الإشارات عبر موجات الراديو"],
        [4, "أجهزة البث والتسجيل الصوتي", "أدوات إلكترونية مخصصة لنقل الإشارات الصوتية أو تخزينها"],
        [5, "الشواحن المتنقلة (Power Banks)", "بطاريات خارجية محمولة تحتوي على خلايا الليثيوم"],
        [6, "أجهزة الحاسب الآلي (لابتوب)", "أجهزة حاسوبية محمولة متكاملة"],
        [7, "مكبرات الصوت والصافرات", "أجهزة تضخيم الإشارات الصوتية أو تنبيهات عالية التردد"],
        [8, "أجهزة الليزر ومؤشراتها", "أدوات بصرية تصدر حزماً ضوئية مركزة"],
        [9, "بطاريات الليثيوم", "خلايا كيميائية عالية الكثافة تتطلب معايير سلامة خاصة"],
        [10, "أسطوانات أجهزة التنفس الكبيرة", "أوعية ضغط معدنية لتخزين غازات التنفس"],
        [11, "كاميرات التصوير الاحترافية (غير مصرحة)", "أجهزة بصرية متقدمة بعدسات قابلة للتبديل"],
        [12, "الأجهزة الكهربائية والإلكترونية العامة", "كافة المعدات التي تعمل بالطاقة الكهربائية"],
      ]),
      t("الأدوات الحادة", "#f07d1a", "sec", [
        [13, "مضارب البيسبول والآلات الكبيرة", "أدوات رياضية أو يدوية صلبة وطويلة"],
        [14, "الأسلحة والآلات والسكاكين الحادة", "أدوات معدنية لها حواف حادة أو نهايات مدببة"],
        [15, "مقراض الأظافر", "أداة معدنية صغيرة ذات حواف قاطعة"],
        [16, "الأدوات المعدنية والحديدية", "معدات من المعادن الصلبة تُستخدم في الصيانة"],
        [17, "الأدوات الخشبية ذات النهايات الحادة", "قطع خشبية برؤوس مدببة أو حواف قاطعة"],
      ]),
      t("الأسلحة والذخائر", "#d02b2b", "sec", [
        [18, "النبال (القاذفات)", "أدوات يدوية لإطلاق المقذوفات"],
        [19, "الذخائر الحية", "مقذوفات مجهزة بمواد دافعة ومتفجرة"],
        [20, "الأسلحة النارية", "أجهزة لإطلاق المقذوفات بقوة انفجار البارود"],
        [21, "الصواعق والعصي الكهربائية", "أجهزة تصدر شحنات كهربائية عالية الجهد"],
        [22, "ألعاب الأطفال الشبيهة بالأسلحة والمجسمات", "نماذج تحاكي شكل الأسلحة الحقيقية"],
      ]),
      t("الأغراض الثمينة والأموال", "#c9a227", "sto", [
        [23, "المبالغ النقدية الكبيرة", "عملات ورقية ومعدنية تبلغ قيمتها الحد المقرر أو أكثر", "sar"],
        [24, "المجوهرات والذهب", "سبائك ومعادن ثمينة وأحجار كريمة تبلغ الحد المقرر", "pcval"],
      ]),
      t("الأغراض الشخصية", "#7b2fb5", "sto", [
        [25, "ملابس تحمل صور ذوات أرواح", "أزياء تشتمل على رسوم أو صور لكائنات حية"],
        [26, "الملابس العسكرية أو الشبيهة بها", "أزياء رسمية للقوات المسلحة أو تحاكيها"],
        [27, "الأدوات والمعدات الرياضية", "أجهزة يدوية للتمارين البدنية"],
        [28, "أدوات الدفاع عن النفس", "آلات يدوية صلبة أو مسننة لصد الهجوم"],
        [29, "المواد السائلة والهلامية (LAGs)", "مواد سائلة أو هلامية بعبوات تتجاوز الأحجام المقررة"],
        [30, "الحقائب والأمتعة الكبيرة", "حقائب تتجاوز 56×45×25 سم أو وزنها 7 كجم"],
        [31, "الأكياس والعبوات البلاستيكية غير الشفافة", "لفائف وأوعية تحجب رؤية المحتويات"],
        [32, "السجائر الإلكترونية ونكهاتها", "أجهزة إلكترونية لتبخير السوائل المحتوية على النيكوتين"],
        [33, "المواد السائلة (عصائر وألبان)", "منتجات غذائية سائلة تخضع لقيود الأحجام"],
        [34, "الملابس غير اللائقة", "أزياء تخالف معايير الآداب العامة"],
        [35, "عبوات الرذاذ (البخاخات)", "حاويات تحتوي على مواد تحت الضغط"],
      ]),
      t("الأمتعة والأغراض الكبيرة", "#8b6a5a", "sto", [[36, "السجاد والمفروشات والبطانيات", "منسوجات وأغطية ذات أحجام كبيرة تعيق الحركة"]]),
      t("الحيوانات", "#222222", "sec", [[37, "الحيوانات بجميع أنواعها", "كائنات حية أليفة أو مفترسة وطيور وحشرات"]]),
      t("المطبوعات والمواد المخالفة", "#4f6b7a", "sec", [
        [38, "الكتب والمنشورات المخلة بالآداب", "مواد ورقية أو رقمية بمحتوى مخالف"],
        [39, "المواد الدعائية غير المصرح بها", "منشورات أو ملصقات ترويجية بلا إذن"],
        [40, "الشعارات والأعلام السياسية أو العنصرية", "منسوجات أو رموز تحمل دلالات سياسية أو عنصرية"],
        [41, "الكتب والمصاحف غير المصرح بها", "إصدارات دينية لم تحصل على فسح إعلامي"],
      ]),
      t("المواد الغذائية والمشروبات", "#2e9e44", "des", [[42, "الأطعمة والمشروبات بعبوات كبيرة", "وجبات وسوائل في أوعية ذات سعات كبيرة"]]),
      t("المواد القابلة للاشتعال", "#e35a15", "des", [
        [43, "المواد البترولية ومشتقاتها", "سوائل هيدروكربونية سريعة الاشتعال"],
        [44, "الألعاب النارية والمفرقعات", "عبوات بمواد كيميائية قابلة للانفجار"],
        [45, "القداحات وأدوات الاشتعال", "أدوات يدوية لإنتاج لهب أو شرارة"],
      ]),
      t("المواد الكيميائية والسامة", "#f2a516", "des", [
        [46, "الغازات المضغوطة", "غازات محفوظة تحت ضغط عالٍ داخل أسطوانات"],
        [47, "المواد السامة والمعدية", "مركبات كيميائية أو مسببات أمراض"],
        [48, "رذاذ الفلفل والمواد الحارقة", "بخاخات مهيجة تسبب حروقاً وتآكلاً"],
        [49, "السوائل القابلة للاشتعال (كحول ودهانات)", "مركبات سائلة تشتعل بسهولة"],
        [50, "المبيدات الحشرية", "مواد كيميائية لإبادة الحشرات"],
      ]),
      t("المواد المتفجرة والخطرة", "#b3161b", "sec", [
        [51, "المواد المشعة والملوثة", "عناصر تصدر إشعاعات نووية"],
        [52, "المتفجرات والصواعق العسكرية", "عبوات ناسفة وصواعق للاستخدام الحربي"],
      ]),
      t("المواد المخدرة والتبغ", "#5a3d33", "sec", [
        [53, "المخدرات والمؤثرات العقلية", "مواد تؤثر على الجهاز العصبي ويُحظر تداولها"],
        [54, "التبغ ومواد التدخين", "منتجات من أوراق التبغ للتدخين أو المضغ"],
      ]),
      t("فئات ممنوعة أمنياً", "#1a1a1a", "sec", [
        [55, "المتسولون والباعة المتجولون", "أفراد يمارسون استجداء الأموال أو البيع بلا تصريح", "case"],
      ]),
      t("وسائل النقل", "#0f8f80", "sto", [
        [56, "الدراجات والاسكوترات ووسائل التنقل", "مركبات فردية بالدفع اليدوي أو المحركات"],
        [57, "عربات الأطفال والكراسي الكبيرة", "أدوات نقل تتجاوز السعات المكانية المحددة"],
      ]),
    ];
  }
  SZ_PALETTE = ["#0e7490", "#9c3d6b", "#b45309", "#1e9a66", "#a5566e", "#2f5f8a", "#6e8a3a", "#640f2a"];
  loadIrshad() {
    try {
      return JSON.parse(localStorage.getItem("bassam_seized_v1")) || { reports: [] };
    } catch (t) {
      return { reports: [] };
    }
  }
  saveIrshad(t) {
    if (this._irCanWrite())
      try {
        localStorage.setItem("bassam_seized_v1", JSON.stringify(t));
      } catch (t) {}
    else this.permDeny();
  }
  qtyOf(t) {
    return "sar" === this.unitOf(t.id) ? 1 : parseInt(t.n, 10) || 0;
  }
  sarOf(t) {
    const e = this.unitOf(t.id);
    return "sar" === e ? parseInt(t.n, 10) || 0 : ("pcval" === e && parseInt(t.val, 10)) || 0;
  }
  benOf(t) {
    return (t.items || []).reduce((t, e) => t + this.qtyOf(e), 0);
  }
  actOf(t, e) {
    return (t.items || []).filter((t) => t.act === e).reduce((t, e) => t + this.qtyOf(e), 0);
  }
  sarTot(t) {
    return (t.items || []).reduce((t, e) => t + this.sarOf(e), 0);
  }
  irActorKey() {
    try {
      const t = KIVO.BassamAuth && KIVO.BassamAuth.user ? KIVO.BassamAuth.user() : null;
      return (t && (t.ekey || t.id || t.un)) || "";
    } catch (t) {
      return "";
    }
  }
  recBy(t) {
    return (t && (t.actor || t.name)) || "—";
  }
  recKey(t) {
    return (t && (t.actorKey || t.eid || t.actor)) || "";
  }
  recShift(t) {
    if (!t) return "";
    if (t.shift) return t.shift;
    const e = this.loadShiftOptsIr();
    if (!t.ts || !e.length) return "";
    const s = new Date(t.ts),
      a = 60 * s.getHours() + s.getMinutes(),
      r = (t) => {
        const e = String(t || "").split(":");
        return 2 === e.length ? 60 * +e[0] + +e[1] : null;
      };
    for (const t of e) {
      const e = r(t.tStart),
        s = r(t.tEnd);
      if (null != e && null != s && (e <= s ? a >= e && a < s : a >= e || a < s)) return t.name;
    }
    return "";
  }
  loadCat() {
    try {
      const t = localStorage.getItem("bassam_seized_cat_v1");
      if (t) {
        const e = JSON.parse(t);
        if (e && Array.isArray(e.cats) && e.cats.length) return e;
      }
    } catch (t) {}
    return { ver: this.SZ_VER, cats: this.SZ_DEF_CATS().map((t) => ({ ...t, items: t.items.map((t) => ({ ...t })) })) };
  }
  saveCat(t) {
    if (this._irCanWrite())
      try {
        localStorage.setItem("bassam_seized_cat_v1", JSON.stringify(t));
      } catch (t) {}
    else this.permDeny();
  }
  SZ_OTHER = "أخرى";
  SZ_DEF_KINDS = ["أقراط", "أساور", "عقد", "ساعات", "خواتم"];
  loadKinds() {
    try {
      const t = localStorage.getItem("bassam_seized_jew_v1");
      if (t) {
        const e = JSON.parse(t);
        if (Array.isArray(e) && e.length) return e.filter((t) => "string" == typeof t && t && t !== this.SZ_OTHER);
      }
    } catch (t) {}
    return this.SZ_DEF_KINDS.slice();
  }
  saveKinds(t) {
    if (this._irCanWrite())
      try {
        localStorage.setItem("bassam_seized_jew_v1", JSON.stringify(t));
      } catch (t) {}
    else this.permDeny();
  }
  kindOf(t) {
    return t && t.kind ? (t.kind === this.SZ_OTHER ? (t.kindTxt || "").trim() || this.SZ_OTHER : t.kind) : "";
  }
  loadActs() {
    try {
      const t = localStorage.getItem("bassam_seized_acts_v1");
      if (t) {
        const e = JSON.parse(t);
        if (Array.isArray(e) && e.length) return e;
      }
    } catch (t) {}
    return this.SZ_DEF_ACTS.map((t) => ({ ...t }));
  }
  saveActs(t) {
    if (this._irCanWrite())
      try {
        localStorage.setItem("bassam_seized_acts_v1", JSON.stringify(t));
      } catch (t) {}
    else this.permDeny();
  }
  loadIrshadLocs() {
    try {
      const t = localStorage.getItem("bassam_seized_locs_v1"),
        e = t ? JSON.parse(t) : [];
      return Array.isArray(e) ? e : [];
    } catch (t) {
      return [];
    }
  }
  saveIrshadLocs(t) {
    if (this._irCanWrite())
      try {
        localStorage.setItem("bassam_seized_locs_v1", JSON.stringify(t));
      } catch (t) {}
    else this.permDeny();
  }
  catIndex() {
    const t = this.loadCat(),
      e = {};
    return (
      t.cats.forEach((t, s) =>
        (t.items || []).forEach((a) => {
          e[a.id] = { ...a, cat: t.name, color: t.color || "#94a3b8", def: t.def || "sto", ci: s };
        }),
      ),
      e
    );
  }
  itemOf(t) {
    return ((this.__ix = this.__ix || this.catIndex()), this.__ix[t] || null);
  }
  unitOf(t) {
    const e = this.itemOf(t);
    return (e && e.unit) || "pc";
  }
  actMap() {
    const t = {};
    return (
      this.loadActs().forEach((e) => {
        t[e.k] = e;
      }),
      t
    );
  }
  actName(t) {
    const e = this.actMap()[t];
    return e ? e.name : "—";
  }
  actColor(t) {
    const e = this.actMap()[t];
    return e ? e.color : "#94a3b8";
  }
  loadStaffingIr() {
    try {
      const t = localStorage.getItem("bassam_staffing_v3"),
        e = t ? JSON.parse(t) : null,
        s = e && "object" == typeof e ? e : {};
      return KIVO.BassamStaffSnap ? KIVO.BassamStaffSnap.all(s) : s;
    } catch (t) {
      return {};
    }
  }
  employeesForShift(t, e, s, a) {
    const r = this.loadStaffingIr()[t + "-" + e] || {};
    return this.loadEmployeesIr()
      .filter((t) => {
        const e = t && t.eid;
        if (!e) return !1;
        const i = r[e];
        return !(!i || i.shift !== s) && !(Array.isArray(i.rest) ? i.rest : []).includes(a);
      })
      .map((t) => ({ eid: t.eid, name: t.name || "بدون اسم" }));
  }
  emptyDraft() {
    return {
      shift: "",
      eid: "",
      loc: "",
      cat: "",
      item: 0,
      n: "",
      val: "",
      act: "",
      kind: "",
      kindTxt: "",
      photos: [],
      items: [],
      no: "",
      note: "",
    };
  }
  szAutoFill(t, e, s) {
    const a = { ...t };
    if (s) return a;
    const r = (e.myEmp && e.spots[e.myEmp.eid]) || "";
    return (!r || (a.loc && a.loc !== a.locAuto) || a.loc === r || ((a.loc = r), (a.locAuto = r)), a);
  }
  szSaveRec(t) {
    const e = this.state,
      s = e.irYear,
      a = e.irMonth,
      r = e.irDay;
    if (!(t.items || []).length) return (this.setState({ irSaveErrMsg: "اختر التصنيف والبند والكمية ثم «إضافة»" }), !1);
    const i = this.loadIrshad(),
      o = e.irEditId,
      n = t.items.map((t) => ({
        id: +t.id,
        n: parseInt(t.n, 10) || 0,
        val: parseInt(t.val, 10) || 0,
        act: t.act,
        kind: t.kind || "",
        kindTxt: t.kindTxt || "",
        photos: (t.photos || []).slice(),
        hist: (t.hist || []).slice(),
      }));
    if (o) {
      const e = (i.reports || []).findIndex((t) => t.id === o);
      if (-1 === e) return (this.setState({ irSaveErrMsg: "السجل الذي تحاول تعديله لم يعد موجوداً" }), !1);
      const s = i.reports[e],
        a = {};
      return (
        n.forEach((t) => (t.photos || []).forEach((t) => (a[t] = 1))),
        (s.items || []).forEach((t) =>
          (t.photos || []).forEach((t) => {
            if (!a[t])
              try {
                KIVO.BassamIDB && KIVO.BassamIDB.del(t);
              } catch (t) {}
          }),
        ),
        (i.reports[e] = {
          ...s,
          loc: t.loc || "",
          no: (t.no || "").trim(),
          note: (t.note || "").trim(),
          items: n,
          editedTs: Date.now(),
          editedBy: this.irActor(),
        }),
        this.saveIrshad(i),
        !0
      );
    }
    const l = {
      id: "r" + Date.now().toString(36) + Math.floor(1e6 * Math.random()).toString(36),
      y: s,
      m: a,
      d: r,
      ts: Date.now(),
      loc: t.loc || "",
      actor: this.irActor(),
      actorKey: this.irActorKey(),
      no: (t.no || "").trim(),
      note: (t.note || "").trim(),
      items: n,
    };
    return ((i.reports = [...(i.reports || []), l]), this.saveIrshad(i), !0);
  }
  szDayCtx(t, e, s, a) {
    const r = KIVO.BassamEmp,
      i = this.loadEmployeesIr(),
      o = {};
    i.forEach((t) => {
      (r && r.tokens ? r.tokens(t) : [t.eid, t.nid, t.name]).forEach((e) => {
        e && (o[String(e)] = t);
      });
    });
    const n = (t) => o[String(t)] || null,
      l = t + "-" + e + "-" + s;
    let h = null;
    if (this.bsOn("dreport"))
      try {
        const t = JSON.parse(localStorage.getItem("bassam_dreport_v1") || "{}");
        h = t[l] || null;
      } catch (t) {}
    const c = (this.bsOn("staff") && this.loadStaffingIr()[t + "-" + e]) || {},
      d = [],
      p = {},
      m = {};
    h &&
      h.shifts &&
      Object.keys(h.shifts).forEach((t) => {
        const e = h.shifts[t];
        if (!e || !e.pulled) return;
        (d.push(t), (m[t] = e.leaders || {}));
        const s = e.rest && "object" == typeof e.rest ? e.rest : {};
        p[t] = (e.roster || [])
          .map((t) => {
            if (!t || !t.ekey) return null;
            const e = n(t.ekey),
              r = t.st || "pr";
            if ("ab" === r || "pm" === r || "lv" === r) return null;
            const i = (c[t.ekey] || (e && c[e.eid]) || (e && c[e.nid]) || {}).rest;
            return ((Array.isArray(s[t.ekey]) ? s[t.ekey] : Array.isArray(i) ? i : []) || []).some(
              (t) => t === a || "ال" + t === a || t === "ال" + a,
            )
              ? null
              : { eid: e ? e.eid : t.ekey, name: (e && e.name) || t.name || t.ekey, key: t.ekey, tin: !!t.tin };
          })
          .filter(Boolean);
      });
    let g = null;
    if (this.bsOn("daily/rounds"))
      try {
        g = JSON.parse(localStorage.getItem("bassam_rounds_v1") || "{}")[l] || null;
      } catch (t) {}
    const u = {},
      f = [];
    g &&
      Array.isArray(g.d) &&
      g.d.forEach((t) => {
        [
          ["gates", t.gates || []],
          ["zones", t.zones || []],
        ]
          .filter(([t]) => this.bsLensOn(t))
          .forEach(([t, e]) =>
            e.forEach((e) => {
              if (!e) return;
              const s = ((t, e) =>
                "zones" === t
                  ? e.code || e.name || "مصلى"
                  : "marks" === t
                    ? e.label || e.kind || "معلم"
                    : e.label || "باب " + (e.num || ""))(t, e);
              (-1 === f.indexOf(s) && f.push(s),
                (e.emp || []).forEach((t) => {
                  const e = n(t);
                  u[e ? e.eid : String(t)] = s;
                }));
            }),
          );
      });
    let b = null;
    try {
      b = KIVO.BassamAuth && KIVO.BassamAuth.user ? KIVO.BassamAuth.user() : null;
    } catch (t) {}
    const y = (b && b.ekey && n(b.ekey)) || null,
      S = !(!b || !("super" === b.role || "dept" === b.role || "gm" === b.role || ("staff" === b.role && b.mgr)));
    let x = null;
    d.forEach((t) =>
      p[t].forEach((e) => {
        y && e.eid === y.eid && (x = { shift: t, eid: e.eid, name: e.name });
      }),
    );
    const D = !(
        !y ||
        !d.some((t) => {
          const e = m[t];
          return e && [e.chief, e.deputy].some((t) => t && (t === y.name || t === y.eid || t === y.nid));
        })
      ),
      z = !(!b || "staff" !== b.role || S || D);
    let w = "";
    try {
      w = (KIVO.BassamDayShift ? KIVO.BassamDayShift.get(t, e, s) : "") || "";
    } catch (t) {}
    const k = [],
      O = {};
    return (
      d.forEach((t) =>
        p[t].forEach((t) => {
          O[t.eid] || ((O[t.eid] = 1), k.push(t));
        }),
      ),
      {
        rep: !!h,
        shifts: d,
        rows: p,
        leaders: m,
        spots: u,
        labels: f,
        shiftOf: (t) => {
          let e = "";
          return (
            d.forEach((s) =>
              p[s].forEach((a) => {
                a.eid === t && (e = s);
              }),
            ),
            e
          );
        },
        present: k,
        hasRound: !!(g && Array.isArray(g.d) && g.d.length && (this.bsLensOn("gates") || this.bsLensOn("zones"))),
        me: b,
        myEmp: y,
        isMgr: S,
        amLeader: D,
        locked: z,
        myRow: x,
        dayShift: -1 !== d.indexOf(w) ? w : d[0] || w || "",
      }
    );
  }
  state = (() => {
    const t = this.hToday();
    return {
      rowMenu: null,
      irTab: "dash",
      irYear: t.y,
      irMonth: t.m,
      irDay: t.d,
      irOpenMonths: {},
      irOpenDays: {},
      irDraft: this.emptyDraft(),
      irEditId: null,
      irSaveErrMsg: "",
      irLedgerOpen: !1,
      irLedgerPage: 1,
      irLedgerPerPage: 10,
      irLocPopOpen: !1,
      irLocEditIdx: -1,
      irLocEditVal: "",
      irLocNewVal: "",
      szCatPopOpen: !1,
      szCatEditIdx: -1,
      szCatEditVal: "",
      szCatNewVal: "",
      szItemPopOpen: !1,
      szItemEditIdx: -1,
      szItemEditVal: "",
      szItemNewVal: "",
      szItemQ: "",
      szActPopOpen: !1,
      szActEditIdx: -1,
      szActEditVal: "",
      szActNewVal: "",
      szKindPopOpen: !1,
      szKindEditIdx: -1,
      szKindEditVal: "",
      szKindNewVal: "",
      szImgTick: 0,
      szGal: null,
      szGalIdx: 0,
      szUpd: null,
      szUpdSel: {},
      irLgSearch: "",
      irLgFilesOpen: !1,
      irLgFddOpen: null,
      irLgLoc: "all",
      irLgCat: "all",
      irLgAct: "all",
      irLgClearAllConfirm: !1,
      irDashYear: null,
      irDashMonth: null,
      irDashMode: "month",
      irDashFrom: "",
      irDashTo: "",
      irDashBrk: "total",
      irDashSumOpen: !1,
      irDashSumQ: "",
      irDashSumPage: 1,
      irDashSumPerPage: 10,
    };
  })();
  PC(t) {
    try {
      return !!KIVO.BassamPerm && KIVO.BassamPerm.can("seized", t || "view");
    } catch (t) {
      return !1;
    }
  }
  permDeny() {
    try {
      this.bsToast("صلاحيتك على نظام المضبوطات لا تشمل هذا الإجراء — راجع مدير الإدارة");
    } catch (t) {}
  }
  bsMenusPatch() {
    return { rowMenu: null, irLgFddOpen: null, irLgFilesOpen: !1, irLocPopOpen: !1, szCatPopOpen: !1, szItemPopOpen: !1, szActPopOpen: !1 };
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
              o = a.state;
            if (
              (Object.keys(r).forEach(function (s) {
                (o[s] !== i[s] && (t = !0), o[s] && (e = !0));
              }),
              t || s || !e)
            )
              return;
            a.setState(r);
          } catch (t) {}
        }, 0));
    } catch (t) {}
  }
  /* الفحص العميق 2026-10-21 (R7): رابطُ #/seized/<records|dash> — يُطبَّق متزامناً قبل حساب القيم، ويبقى في العنوان ما يُعرض فعلاً.
     نسخُ solo (داخل مؤشرات الإدارة) لا تشارك */
  _bsHT(t) {
    try {
      if (this.props && this.props.solo) return;
      const h = String(location.hash || ""),
        p = "#/seized";
      if (h.indexOf(p) !== 0) return;
      const w = t ? p + "/" + t : p;
      h !== w && history.replaceState && history.replaceState(null, "", location.pathname + location.search + w);
    } catch(e) { /* لا يمنع العرض — يُتجاوز بصمت */ }
  }
  _bsHR() {
    try {
      if (this.props && this.props.solo) return "";
      const o = KIVO.__BS_OPEN_TAB;
      if (!o || o.page !== "seized") return "";
      KIVO.__BS_OPEN_TAB = null;
      const t = o.tab;
      if ("records" !== t && "dash" !== t) return (this._bsHT(""), "");
      this.state.irTab !== t && (this.state = { ...this.state, irTab: t });
      return t;
    } catch (e) {
      return "";
    }
  }
  renderVals() {
    const q = this._bsHR(),
      t = this._irPermVals(),
      e = this.state,
      s = (t) =>
        "position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 16px;border-radius:12px;transition:all .3s;flex-shrink:0;min-width:150px;cursor:pointer;font-family:'Cairo',sans-serif;" +
        (t
          ? "background:var(--bg-xffffff);box-shadow:0 3px 10px -4px rgba(138,111,53,0.45);border:2px solid var(--bd-a185151810p45)"
          : "background:transparent;border:2px solid transparent"),
      a = (t) =>
        "width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;transition:all .3s;" +
        (t ? "background:var(--bg-a185151810p1);color:var(--fg-xb99751)" : "background:var(--bg-a2452452450p9);color:var(--fg-x94a3b8)"),
      r = (t) =>
        "font-size:12px;transition:color .3s;" +
        (t ? "font-weight:600;color:var(--fg-xb99751)" : "font-weight:400;color:var(--fg-x53565a)"),
      i = (t) => {
        try {
          return !KIVO.BassamPerm || !KIVO.BassamPerm.subOn || KIVO.BassamPerm.subOn("seized", t);
        } catch (t) {
          return !0;
        }
      },
      o = !(!this.props || "dash" !== this.props.solo) && i("dash"),
      n = i("records"),
      l = !(!this.props || "dash" !== this.props.solo);
    let h = l ? "dash" : "records" === e.irTab ? "records" : "dash";
    ("dash" === h && !o && n && (h = "records"), "records" === h && !n && o && (h = "dash"));
    q && q !== h && this._bsHT(h);
    const c = "dash" === h && o,
      d = "records" === h && n,
      p = {
        irOnDash: c,
        irOnRecords: d,
        irDashTabOk: o,
        irRecordsTabOk: n,
        irTabBarShow: !l && !(!o || !n),
        irDashTabStyle: s(c),
        irDashTabIcon: a(c),
        irDashTabLbl: r(c),
        irGoDash: () => (this._bsHT("dash"), this.setState({ irTab: "dash" })),   /* العنوانُ يتبع التبويب (R7) */
        irRecordsTabStyle: s(d),
        irRecordsTabIcon: a(d),
        irRecordsTabLbl: r(d),
        irGoRecords: () => (this._bsHT("records"), this.setState({ irTab: "records" })),
        ...t,
      };
    return (d && Object.assign(p, this._recordsCalVals()), c && Object.assign(p, this._dashVals()), p);
  }
  _dashVals() {
    const t = this.state,
      e = this.hToday(),
      s = this.loadIrshad().reports || [],
      a = 864e5,
      r = this.MONTHS,
      i = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
      o = (t) => (KIVO.bsPct ? KIVO.bsPct(t) : String(Math.round(t || 0))),
      n = (t) => Math.round(t || 0).toLocaleString("en-US"),
      l = (t) => n(t).replace(/[0-9]/g, (t) => "٠١٢٣٤٥٦٧٨٩"[+t]),
      h = (t) =>
        (t = Math.round(t || 0)) >= 1e6
          ? (t / 1e6).toFixed(1).replace(/\.0$/, "") + " مليون"
          : t >= 1e4
            ? Math.round(t / 1e3) + " ألف"
            : t >= 1e3
              ? (t / 1e3).toFixed(1).replace(/\.0$/, "") + " ألف"
              : n(t),
      c = (t) => (1 === t ? "يوم واحد" : 2 === t ? "يومين" : t >= 3 && t <= 10 ? t + " أيام" : KIVO.BassamCount(t, "يوم") + "");
    this.__hpc = this.__hpc || {};
    const d = (t) => (this.__hpc[t] || (this.__hpc[t] = this.hParts(new Date(t))), this.__hpc[t]),
      p = (t) => new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime(),
      m = (t) => {
        const e = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t || "");
        return e ? new Date(+e[1], +e[2] - 1, +e[3]).getTime() : null;
      },
      g = (t) => {
        const e = new Date(t),
          s = (t) => (t < 10 ? "0" + t : "" + t);
        return e.getFullYear() + "-" + s(e.getMonth() + 1) + "-" + s(e.getDate());
      },
      u = (t) => t.d + " " + r[t.m - 1] + " " + t.y + " هـ",
      f = this.loadActs(),
      b = (t) => (e) => this.actOf(e, t),
      y = (b((f[0] || {}).k || "sec"), (t) => this.benOf(t)),
      S = s,
      x = (t) => 1e4 * t.y + 100 * t.m + t.d,
      D = (t) => 100 * t.y + t.m,
      z = {},
      w = {};
    s.forEach((t) => {
      t.y && ((z[t.y] = 1), (w[t.y + "-" + t.m] = 1));
    });
    let k = Object.keys(z)
      .map(Number)
      .sort((t, e) => e - t);
    k.length || (k = [e.y]);
    const O = null == t.irDashYear || "all" === String(t.irDashYear);
    let v = O ? k[0] : +t.irDashYear;
    k.indexOf(v) < 0 && (v = k[0]);
    const E = [];
    for (let t = 1; t <= 12; t++) w[v + "-" + t] && E.push(t);
    let L = O ? "all" : null == t.irDashMonth ? "" : String(t.irDashMonth);
    !O && "all" !== L && E.indexOf(+L) < 0 && (L = E.length ? String(E[E.length - 1]) : "all");
    const P = (t, e) => this.hMonthDays(t, e),
      I = (t, s) => (t > e.y ? 0 : t < e.y || s < e.m ? P(t, s) : s === e.m ? e.d : 0),
      C = "custom" === t.irDashMode ? "custom" : O ? "all" : "month",
      M = p(this.hGreg(e.y, e.m, e.d));
    let A = m(t.irDashFrom),
      T = m(t.irDashTo);
    if ("custom" === C && (null == A && (A = M - 29 * a), null == T && (T = M), A > T)) {
      const t = A;
      ((A = T), (T = t));
    }
    let _ = [],
      F = [],
      N = [],
      B = !0,
      K = "",
      V = "",
      H = 0,
      R = v;
    if ("all" === C) {
      ((_ = S.slice()), (B = !1));
      const t = {};
      (s.forEach((e) => {
        t[D(e)] = { y: e.y, m: e.m };
      }),
        (N = Object.keys(t)
          .map(Number)
          .sort((t, e) => t - e)
          .map((e) => ({ k: e, lab: r[t[e].m - 1], full: r[t[e].m - 1] + " " + t[e].y + " هـ" }))),
        (K = "كل الفترة"));
      let e = null;
      if (
        (s.forEach((t) => {
          const s = x(t);
          (null == e || s < e) && (e = s);
        }),
        null != e)
      ) {
        const t = Math.floor(e / 1e4),
          s = Math.floor(e / 100) % 100,
          r = e % 100;
        try {
          H = Math.round((M - p(this.hGreg(t, s, r))) / a) + 1;
        } catch (t) {
          H = 30 * N.length;
        }
      }
      R = k[0];
    } else if ("custom" === C) {
      const t = d(A),
        e = d(T),
        s = 1e4 * t.y + 100 * t.m + t.d,
        i = 1e4 * e.y + 100 * e.m + e.d;
      if (
        ((_ = S.filter((t) => {
          const e = x(t);
          return e >= s && e <= i;
        })),
        (H = Math.round((T - A) / a) + 1),
        (B = H <= 62),
        B)
      )
        for (let t = A; t <= T; t += a) {
          const e = d(t);
          N.push({ k: 1e4 * e.y + 100 * e.m + e.d, lab: String(e.d), full: u(e) });
        }
      else {
        const t = {};
        for (let e = A; e <= T; e += a) {
          const s = d(e);
          t[100 * s.y + s.m] = s;
        }
        N = Object.keys(t)
          .map(Number)
          .sort((t, e) => t - e)
          .map((e) => ({ k: e, lab: r[t[e].m - 1], full: r[t[e].m - 1] + " " + t[e].y + " هـ" }));
      }
      K = u(t) + " ← " + u(e);
      const o = A - a,
        n = d(A - H * a),
        l = d(o),
        h = 1e4 * n.y + 100 * n.m + n.d,
        c = 1e4 * l.y + 100 * l.m + l.d;
      ((F = S.filter((t) => {
        const e = x(t);
        return e >= h && e <= c;
      })),
        (V = u(n) + " ← " + u(l)),
        (R = e.y));
    } else if ("all" === L) {
      ((_ = S.filter((t) => t.y === v)), (B = !1));
      for (let t = 1; t <= 12; t++) I(v, t) > 0 && N.push({ k: 100 * v + t, lab: r[t - 1], full: r[t - 1] + " " + v + " هـ" });
      ((H = N.reduce((t, e) => t + I(v, e.k % 100), 0)), (K = "كل أشهر " + v + " هـ"));
      const t = v === e.y;
      let s = z[v - 1] ? S.filter((t) => t.y === v - 1) : [];
      (t && (s = s.filter((t) => t.m < e.m || (t.m === e.m && t.d <= e.d))),
        (F = s),
        (V = t ? "نفس الفترة من " + (v - 1) + " هـ" : "سنة " + (v - 1) + " هـ"));
    } else {
      ((_ = S.filter((t) => t.y === v && t.m === +L)), (B = !0));
      const t = I(v, +L) || P(v, +L);
      for (let e = 1; e <= t; e++) N.push({ k: 1e4 * v + 100 * +L + e, lab: String(e), full: e + " " + r[+L - 1] + " " + v + " هـ" });
      ((H = t), (K = r[+L - 1] + " " + v + " هـ"));
      let s = v,
        a = +L - 1;
      a < 1 && ((a = 12), (s = v - 1));
      const i = v === e.y && +L === e.m;
      let o = w[s + "-" + a] ? S.filter((t) => t.y === s && t.m === a) : [];
      (i && (o = o.filter((t) => t.d <= e.d)),
        (F = o),
        (V = i ? "أول " + c(e.d) + " من " + r[a - 1] + " " + s + " هـ" : r[a - 1] + " " + s + " هـ"));
    }
    const G = F.length > 0 && "all" !== C;
    "all" === C && (V = "");
    const U = (t) => (t < 10 ? "0" + t : "" + t),
      j = (t) => (B ? Math.floor(t / 1e4) + "-" + U(Math.floor(t / 100) % 100) + "-" + U(t % 100) : Math.floor(t / 100) + "-" + U(t % 100)),
      Y = B ? x : D,
      Z = (t, e) => {
        const s = {};
        return (
          t.forEach((t) => {
            const a = Y(t);
            s[a] = (s[a] || 0) + e(t);
          }),
          N.map((t) => s[t.k] || 0)
        );
      },
      Q = (t) => {
        const e = Z(_, t),
          s = e.reduce((t, e) => t + e, 0);
        let a = 0,
          r = 0,
          i = 0,
          o = -1,
          n = -1;
        return (
          e.forEach((t, e) => {
            t > 0 && (i++, (0 === r || t > r) && ((r = t), (o = e)), (0 === a || t < a) && ((a = t), (n = e)));
          }),
          {
            ser: e,
            tot: s,
            min: a,
            max: r,
            avg: i ? s / i : 0,
            act: i,
            gap: e.length - i,
            peakShort: o >= 0 ? N[o].full.replace(/ هـ$/, "") : "—",
            lowShort: n >= 0 ? N[n].full.replace(/ هـ$/, "") : "—",
            peakNum: o >= 0 ? j(N[o].k) : "—",
            lowNum: n >= 0 ? j(N[n].k) : "—",
          }
        );
      },
      q = f
        .slice(0, 4)
        .map((t) => ({ name: t.name, desc: "عدد القطع التي كان إجراؤها: " + t.name, f: b(t.k), color: t.color || "#b99751" })),
      J = (t) => (e) => (q[t] ? q[t].f(e) : 0),
      W = Q(y),
      X = q.map((t, e) => ({ m: t, st: Q(t.f), i1: 0 === e, i2: 1 === e, i3: 2 === e, i4: 3 === e })),
      $ = W.tot,
      tt = F.reduce((t, e) => t + y(e), 0),
      et = B ? "يوم" : "شهر",
      st = (t, e, s, a) => {
        const r = t.length;
        if (!r) return { line: "", area: "" };
        const i = a || Math.max.apply(null, t.concat([1])),
          o = (t) => (1 === r ? e / 2 : e - (t / (r - 1)) * e);
        let n = "";
        return (
          t.forEach((t, e) => {
            n += (e ? "L" : "M") + o(e).toFixed(1) + " " + ((t) => s - (i > 0 ? (t / i) * s : 0))(t).toFixed(1) + " ";
          }),
          { line: n, area: "M" + o(0).toFixed(1) + " " + s + " " + n.replace(/^M/, "L") + "L" + o(r - 1).toFixed(1) + " " + s + " Z" }
        );
      },
      at = st(W.ser, 1e3, 100),
      rt = t.irDashBrk || "total",
      it = this.loadShiftOptsIr(),
      ot = this.loadIrshadLocs(),
      nt = ["#4a97cf", "#d9793a", "#2fa372", "#7e2a52", "#7b8a94", "#b99751"];
    let lt = [];
    "shift" === rt
      ? (lt = it
          .map((t, e) => ({
            name: t.name,
            color: nt[e % nt.length],
            ser: Z(
              _.filter((e) => this.recShift(e) === t.name),
              y,
            ),
          }))
          .filter((t) => t.ser.some((t) => t > 0)))
      : "loc" === rt &&
        (lt = ot
          .slice(0, 6)
          .map((t, e) => ({
            name: t,
            color: nt[e % nt.length],
            ser: Z(
              _.filter((e) => e.loc === t),
              y,
            ),
          }))
          .filter((t) => t.ser.some((t) => t > 0)));
    const ht = "total" !== rt && lt.length > 0,
      ct = ht ? N.map((t, e) => lt.reduce((t, s) => t + s.ser[e], 0)) : W.ser;
    let dt = null;
    if (G && !ht && F.length) {
      const t = {};
      F.forEach((e) => {
        const s = Y(e);
        t[s] = (t[s] || 0) + y(e);
      });
      const e = Object.keys(t)
        .map(Number)
        .sort((t, e) => t - e)
        .map((e) => t[e]);
      if (e.length) {
        const t = [];
        for (let s = 0; s < N.length; s++) t.push(null == e[s] ? 0 : e[s]);
        t.some((t) => t > 0) && (dt = t);
      }
    }
    const pt = ((t) => {
        if (!(t > 0)) return 10;
        const e = Math.pow(10, Math.floor(Math.log10(t))),
          s = t / e,
          a = [1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10];
        for (let t = 0; t < a.length; t++) if (s <= a[t]) return a[t] * e;
        return 10 * e;
      })(Math.max.apply(null, [1].concat(ct).concat(dt || []))),
      mt = st(ct, 1e3, 100, pt),
      gt = dt ? st(dt, 1e3, 100, pt) : null,
      ut = [];
    if (ht) {
      const t = N.map(() => 0);
      lt.forEach((e) => {
        const s = e.ser.map((e, s) => t[s] + e),
          a = t.slice(),
          r = N.length,
          i = (t) => (1 === r ? 500 : 1e3 - (t / (r - 1)) * 1e3),
          o = (t) => 100 - (t / pt) * 100;
        let n = "M" + i(0).toFixed(1) + " " + o(s[0]).toFixed(1) + " ";
        for (let t = 1; t < r; t++) n += "L" + i(t).toFixed(1) + " " + o(s[t]).toFixed(1) + " ";
        for (let t = r - 1; t >= 0; t--) n += "L" + i(t).toFixed(1) + " " + o(a[t]).toFixed(1) + " ";
        (ut.push({ d: n + "Z", fill: e.color }), e.ser.forEach((e, s) => (t[s] += e)));
      });
    }
    const ft = [];
    for (let t = 4; t >= 0; t--) {
      const e = (pt * t) / 4,
        s = 100 * (1 - t / 4);
      ft.push({
        lab: n(e),
        lineStyle:
          "position:absolute;right:0;left:0;top:" +
          s.toFixed(2) +
          "%;border-top:1px solid " +
          (0 === t ? "var(--bd-xd9dee4)" : "var(--bd-xeff1f4)"),
        labStyle:
          "position:absolute;left:-52px;top:" +
          s.toFixed(2) +
          "%;transform:translateY(-50%);font-size:10px;font-weight:400;color:var(--fg-x94a3b8);direction:ltr;width:46px;text-align:left",
      });
    }
    const bt = N.length,
      yt = Math.max(1, Math.ceil(bt / 9)),
      St = N.map((t, e) => ({ show: e % yt === 0 || e === bt - 1, lab: t.lab })),
      xt = N.map((t, e) => {
        let s = t.full + "  —  " + KIVO.BassamCount(n(ct[e]), "قطعة") + "";
        return (
          dt && (s += "  ·  السابق: " + n(dt[e])),
          ht &&
            lt.forEach((t) => {
              t.ser[e] && (s += "\n" + t.name + ": " + n(t.ser[e]));
            }),
          { tip: s }
        );
      }),
      Dt = [],
      zt = [];
    let wt = 0;
    try {
      const t = p(this.hGreg(R, 1, 1)),
        e = [];
      let o = 0;
      for (let s = 1; s <= 12; s++) {
        const r = P(R, s),
          i = I(R, s);
        for (let n = 1; n <= r; n++) (n <= i && e.push({ m: s, d: n, ts: t + o * a }), o++);
      }
      if (e.length) {
        const t = {};
        s.filter((t) => t.y === R).forEach((e) => {
          const s = e.m + "-" + e.d;
          t[s] = (t[s] || 0) + y(e);
        });
        const o = Object.keys(t)
          .map((e) => t[e])
          .filter((t) => t > 0)
          .sort((t, e) => t - e);
        wt = o.length;
        const l = (t) => (o.length ? o[Math.min(o.length - 1, Math.floor(o.length * t))] : 1),
          h = [l(0.2), l(0.4), l(0.6), l(0.85)],
          c = ["#EFF1F4", "#F2E7D0", "#E4CFA1", "#D0B173", "#B9974F", "#8A6F35"],
          d = (t) => (t ? (t <= h[0] ? 1 : t <= h[1] ? 2 : t <= h[2] ? 3 : t <= h[3] ? 4 : 5) : 0),
          p = {};
        e.forEach((t) => (p[t.ts] = t));
        const m = e[0].ts,
          g = e[e.length - 1].ts,
          u = m - ((new Date(m).getDay() + 1) % 7) * a,
          f = Math.max(1, Math.floor((g - u) / a / 7) + 1);
        let b = -1,
          S = -9;
        for (let e = 0; e < f; e++) {
          const s = [];
          for (let o = 0; o < 7; o++) {
            const l = u + (7 * e + o) * a,
              h = p[l];
            if (!h) {
              s.push({ style: "width:15px;height:15px;border-radius:3px;background:transparent", tip: "" });
              continue;
            }
            const m = t[h.m + "-" + h.d] || 0,
              g = new Date(l);
            s.push({
              style: "width:15px;height:15px;border-radius:3px;background:" + c[d(m)],
              tip:
                h.d +
                " " +
                r[h.m - 1] +
                " " +
                R +
                " هـ · " +
                this.WEEKDAYS[g.getDay()] +
                " " +
                g.getDate() +
                " " +
                i[g.getMonth()] +
                " — " +
                KIVO.BassamCount(n(m), "قطعة") +
                "",
            });
          }
          Dt.push({ cells: s });
          let o = -1;
          for (let t = 0; t < 7; t++) {
            const s = p[u + (7 * e + t) * a];
            if (s) {
              o = s.m;
              break;
            }
          }
          const l = o > 0 && o !== b && e - S >= 3;
          (l && (S = e), o > 0 && (b = o), zt.push({ show: l, lab: o > 0 ? r[o - 1] : "" }));
        }
      }
    } catch (t) {}
    const kt = ["#EFF1F4", "#F2E7D0", "#E4CFA1", "#D0B173", "#B9974F", "#8A6F35"].map((t) => ({
        style: "width:11px;height:11px;border-radius:3px;display:inline-block;background:" + t,
      })),
      Ot = (t, e) =>
        "display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;border-radius:9999px;padding:2px 6px;" +
        (e
          ? "color:var(--fg-x94a3b8);background:var(--bg-a1481631840p14)"
          : t
            ? "color:var(--fg-x006300);background:var(--bg-a09900p09)"
            : "color:var(--fg-xd03b3b);background:var(--bg-a20859590p09)"),
      vt = (t, e) => {
        if (!G || !e) return { txt: "—", style: Ot(!0, !0) };
        const s = ((t - e) / e) * 100,
          a = Math.abs(s) < 0.5;
        return { txt: (a ? "◆ " : s >= 0 ? "▲ " : "▼ ") + o(Math.abs(s)) + "%", style: Ot(s >= 0, a) };
      },
      Et = {},
      Lt = {};
    _.forEach((t) =>
      (t.items || []).forEach((t) => {
        const e = this.itemOf(t.id),
          s = e ? e.cat : "غير مصنّف";
        ((Et[s] = (Et[s] || 0) + this.qtyOf(t)), e && (Lt[s] = e.color));
      }),
    );
    let Pt = Object.keys(Et)
      .map((t) => ({ name: t, v: Et[t], c: Lt[t] || "#94a3b8" }))
      .sort((t, e) => e.v - t.v);
    if (Pt.length > 7) {
      const t = Pt.slice(6);
      ((Pt = Pt.slice(0, 6)), Pt.push({ name: "تصنيفات أخرى (" + t.length + ")", v: t.reduce((t, e) => t + e.v, 0), other: !0 }));
    }
    const It = Pt.reduce((t, e) => t + e.v, 0),
      Ct = Math.max.apply(null, [1].concat(Pt.map((t) => t.v))),
      Mt = Pt.map((t) => ({
        name: t.name,
        val: n(t.v),
        pct: (It ? o((t.v / It) * 100) : "0") + "%",
        dot: "width:9px;height:9px;border-radius:3px;flex-shrink:0;background:" + (t.other ? "var(--bg-xc9cfd6)" : t.c),
        bar:
          "height:100%;border-radius:9999px;width:" +
          ((t.v / Ct) * 100).toFixed(2) +
          "%;background:" +
          (t.other ? "var(--bg-xc9cfd6)" : t.c),
      })),
      At = {},
      Tt = {};
    (_.forEach((t) => {
      t.loc && (At[t.loc] = (At[t.loc] || 0) + y(t));
    }),
      F.forEach((t) => {
        t.loc && (Tt[t.loc] = (Tt[t.loc] || 0) + y(t));
      }));
    let _t = Object.keys(At)
      .map((t) => ({ name: t, v: At[t], p: Tt[t] || 0 }))
      .sort((t, e) => e.v - t.v);
    if (_t.length > 7) {
      const t = _t.slice(6);
      ((_t = _t.slice(0, 6)),
        _t.push({
          name: "مواقع أخرى (" + t.length + ")",
          v: t.reduce((t, e) => t + e.v, 0),
          p: t.reduce((t, e) => t + e.p, 0),
          other: !0,
        }));
    }
    const Ft = Math.max.apply(null, [1].concat(_t.map((t) => t.v))),
      Nt = _t.map((t) => {
        const e = vt(t.v, t.p);
        return {
          name: t.name,
          val: n(t.v),
          pct: ($ ? o((t.v / $) * 100) : "0") + "%",
          dTxt: e.txt,
          dStyle: e.style,
          dot: "width:9px;height:9px;border-radius:3px;flex-shrink:0;background:" + (t.other ? "var(--bg-xc9cfd6)" : "var(--bg-x8a6f35)"),
          bar:
            "height:100%;border-radius:9999px;width:" +
            ((t.v / Ft) * 100).toFixed(2) +
            "%;background:" +
            (t.other ? "var(--bg-xc9cfd6)" : "var(--bg-x8a6f35)"),
        };
      }),
      Bt = it.map((t, e) => {
        const s = _.filter((e) => this.recShift(e) === t.name);
        return { name: t.name, color: nt[e % nt.length], v: s.reduce((t, e) => t + y(e), 0), n: s.length, rs: s };
      }),
      Kt = Bt.reduce((t, e) => t + e.v, 0) || 1,
      Vt = Bt.filter((t) => t.v > 0).map((t) => ({
        style: "height:100%;width:" + ((t.v / Kt) * 100).toFixed(2) + "%;background:" + t.color,
      })),
      Ht = Bt.filter((t) => t.v > 0).map((t) => ({
        name: t.name,
        pct: o((t.v / Kt) * 100) + "%",
        dot: "width:9px;height:9px;border-radius:3px;display:inline-block;background:" + t.color,
      })),
      Rt = Bt.map((t) => ({
        name: t.name,
        val: n(t.v),
        sub: KIVO.BassamCount(t.n, "محضر") + "",
        dot: "width:9px;height:9px;border-radius:3px;flex-shrink:0;background:" + t.color,
      })),
      Gt = [
        ["إجمالي القطع", $, tt],
        ["عدد المحاضر", _.length, F.length],
      ]
        .concat(X.slice(0, 2).map((t, e) => [t.m.name, t.st.tot, F.reduce((t, s) => t + J(e)(s), 0)]))
        .map((t) => {
          const e = vt(t[1], t[2]);
          return { label: t[0], nums: n(t[2]) + " → " + n(t[1]), txt: e.txt, style: e.style };
        }),
      Ut = {},
      jt = {},
      Yt = {},
      Zt = {};
    (_.forEach((t) => {
      const e = this.recKey(t);
      e && ((Ut[e] = (Ut[e] || 0) + y(t)), (Yt[e] = (Yt[e] || 0) + 1), (Zt[e] = { name: this.recBy(t), shift: this.recShift(t) }));
    }),
      F.forEach((t) => {
        const e = this.recKey(t);
        e && (jt[e] = (jt[e] || 0) + y(t));
      }));
    const Qt = Object.keys(Ut)
        .map((t) => ({ k: t, v: Ut[t], p: jt[t] || 0, n: Yt[t], nm: (Zt[t] || {}).name || "—", sh: (Zt[t] || {}).shift || "" }))
        .sort((t, e) => e.v - t.v)
        .slice(0, 6),
      qt = Math.max.apply(null, [1].concat(Qt.map((t) => t.v))),
      Jt = Qt.map((t, e) => {
        const s = vt(t.v, t.p);
        return {
          rank: String(e + 1),
          name: t.nm,
          sub: (t.sh ? t.sh + " · " : "") + KIVO.BassamCount(t.n, "محضر") + "",
          ben: n(t.v),
          dTxt: s.txt,
          dStyle: s.style,
          bar: "height:100%;border-radius:9999px;background:var(--bg-xb99751);width:" + ((t.v / qt) * 100).toFixed(2) + "%",
          numStyle:
            "width:22px;height:22px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:10.5px;font-weight:700;flex-shrink:0;" +
            (0 === e
              ? "background:var(--bg-x8a6f35);color:var(--fg-xffffff)"
              : 1 === e
                ? "background:var(--bg-a185151810p3);color:var(--fg-x8a6f35)"
                : 2 === e
                  ? "background:var(--bg-a185151810p16);color:var(--fg-x8a6f35)"
                  : "background:var(--bg-xeff1f4);color:var(--fg-x53565a)"),
        };
      }),
      Wt = Bt.map((t) => {
        const e = {};
        t.rs.forEach((t) => {
          const s = this.recKey(t);
          s && (e[s] = 1);
        });
        const s = t.rs.reduce((t, e) => t + J(0)(e), 0),
          a = t.rs.reduce((t, e) => t + J(1)(e), 0),
          r = t.rs.reduce((t, e) => t + J(2)(e) + J(3)(e), 0);
        return {
          name: t.name,
          dot:
            "width:8px;height:8px;border-radius:3px;display:inline-block;margin-inline-end:7px;vertical-align:middle;background:" + t.color,
          reports: n(t.n),
          emps: n(Object.keys(e).length),
          ben: n(t.v),
          avg: t.n ? (t.v / t.n).toFixed(1) : "0",
          trans: n(s),
          bro: n(a),
          ref: n(r),
          share: ($ ? o((t.v / $) * 100) : "0") + "%",
          shareBar:
            "display:block;height:100%;border-radius:9999px;background:" +
            t.color +
            ";width:" +
            ($ ? ((t.v / $) * 100).toFixed(2) : 0) +
            "%",
        };
      }),
      Xt = (t.irDashSumQ || "").trim(),
      $t = Wt.slice(),
      te = KIVO.BassamFind.filter(Xt, $t, (t) => [t.name, t.code, t.type]),
      ee = 0 === t.irDashSumPerPage ? 0 : t.irDashSumPerPage || 10,
      se = 0 === ee ? Math.max(1, te.length) : ee,
      ae = Math.max(1, Math.ceil(te.length / se)),
      re = Math.min(Math.max(1, t.irDashSumPage || 1), ae),
      ie = (re - 1) * se,
      oe = te.slice(ie, ie + se),
      ne = [];
    {
      const t = [],
        e = (e) => {
          t.indexOf(e) < 0 && t.push(e);
        };
      e(1);
      for (let t = re - 1; t <= re + 1; t++) t >= 1 && t <= ae && e(t);
      (e(ae), t.sort((t, e) => t - e));
      for (let e = 0; e < t.length; e++) {
        e > 0 && t[e] - t[e - 1] > 1 && ne.push({ dots: !0, label: "…" });
        const s = t[e];
        ne.push({
          dots: !1,
          label: String(s),
          cur: s === re,
          plain: s !== re,
          style:
            "height:28px;min-width:28px;padding:0 4px;border:0;border-right:1px solid var(--bd-xe1e1e1);font-size:11px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';" +
            (s === re ? "background:var(--bg-xb99751);color:var(--text-on-brand)" : "background:transparent;color:var(--fg-x475569)"),
          click: () => this.setState({ irDashSumPage: s }),
        });
      }
    }
    const le = (t) =>
        "height:28px;width:28px;border:0;border-right:1px solid var(--bd-xe1e1e1);background:transparent;display:flex;align-items:center;justify-content:center;" +
        (t ? "color:var(--fg-x475569);cursor:pointer" : "color:var(--fg-xcbd5e1);cursor:default"),
      he = {};
    te.forEach((t) => (he[t.name] = 1));
    const ce = _.filter((t) => he[this.recShift(t)]),
      de = ce.reduce((t, e) => t + y(e), 0),
      pe = {};
    ce.forEach((t) => {
      const e = this.recKey(t);
      e && (pe[e] = 1);
    });
    const me = {
        label: Xt ? "إجمالي المعروض" : "الإجمالي",
        reports: n(ce.length),
        emps: n(Object.keys(pe).length),
        ben: n(de),
        avg: ce.length ? (de / ce.length).toFixed(1) : "0",
        trans: n(ce.reduce((t, e) => t + J(0)(e), 0)),
        bro: n(ce.reduce((t, e) => t + J(1)(e), 0)),
        ref: n(ce.reduce((t, e) => t + J(2)(e) + J(3)(e), 0)),
        share: ($ ? o((de / $) * 100) : "0") + "%",
      },
      ge = [{ dot: "#b99751", n: "الإجمالي", v: h($), p: "" }]
        .concat(X.map((t) => ({ dot: t.m.color, n: t.m.name, v: h(t.st.tot), p: $ ? "(" + o((t.st.tot / $) * 100) + "٪)" : "" })))
        .concat([
          { dot: "#7b8a94", n: "المحاضر", v: n(_.length), p: "" },
          { dot: "#7b8a94", n: "المتوسط لكل " + et, v: h(W.avg), p: "" },
          { dot: "#7b8a94", n: "أعلى", v: h(W.max), p: W.peakNum },
        ]),
      ue = (t) => ({ dot: "width:7px;height:7px;border-radius:2px;flex-shrink:0;background:" + t.dot, n: t.n, v: t.v, p: t.p }),
      fe = ge.map(ue).concat(ge.map(ue)),
      be = (t) =>
        "border:0;font-family:'Cairo',sans-serif;font-size:11px;font-weight:600;padding:6px 12px;border-radius:8px;cursor:pointer;white-space:nowrap;" +
        (t
          ? "background:var(--bg-xffffff);color:var(--fg-x8a6f35);box-shadow:var(--shadow-card)"
          : "background:transparent;color:var(--fg-x94a3b8)"),
      ye = vt($, tt);
    return {
      irDashYear: O ? "all" : String(v),
      irDashYearOpts: [{ v: "all", lbl: "كل السنوات" }].concat(k.map((t) => ({ v: String(t), lbl: t + " هـ" }))),
      irDashSetYear: (t) =>
        this.setState({ irDashYear: "all" === t.target.value ? "all" : +t.target.value, irDashMonth: null, irDashMode: null }),
      irDashMonth: L,
      irDashMonthOpts: O
        ? [{ v: "all", lbl: "كل الأشهر" }]
        : E.map((t) => ({ v: String(t), lbl: r[t - 1] + " (" + (t < 10 ? "0" + t : t) + ")" })).concat([
            { v: "all", lbl: "كل أشهر السنة" },
          ]),
      irDashSetMonth: (t) => this.setState({ irDashMonth: t.target.value, irDashMode: null }),
      irDashYmBoxStyle:
        "display:flex;align-items:center;gap:7px;border:1px solid " +
        ("custom" === C ? "#E6E9ED" : "rgba(185,151,81,.45)") +
        ";background:" +
        ("custom" === C ? "#F8F9FB" : "rgba(185,151,81,.07)") +
        ";border-radius:12px;padding:4px 11px;flex-shrink:0;opacity:" +
        ("custom" === C ? ".55" : "1"),
      irDashModeOpts: [
        {
          lbl: "نطاق مخصص",
          style: be("custom" === C),
          click: () =>
            this.setState({
              irDashMode: "custom" === C ? null : "custom",
              irDashFrom: t.irDashFrom || g(M - 29 * a),
              irDashTo: t.irDashTo || g(M),
            }),
        },
      ],
      irDashCustomOn: "custom" === C,
      irDashFrom: "custom" === C ? g(A) : "",
      irDashTo: "custom" === C ? g(T) : "",
      irDashSetFrom: (t) => this.setState({ irDashFrom: t.target.value, irDashMode: "custom" }),
      irDashSetTo: (t) => this.setState({ irDashTo: t.target.value, irDashMode: "custom" }),
      irDashRangeHint: "custom" === C ? "= " + K + " · " + c(H) : "",
      irDashPerLbl: K,
      irDashTicker: fe,
      irDashPeriodTxt:
        "الفترة: " +
        K +
        " · " +
        c(H) +
        " · " +
        KIVO.BassamCount(_.length, "محضر") +
        "" +
        (G ? " · تُقارَن بـ " + V : "all" === C ? "" : " · لا توجد فترة سابقة للمقارنة"),
      irDashHeroLbl: "إجمالي القطع المضبوطة · " + K,
      irDashHeroNum: l($),
      irDashSparkHas: W.ser.length > 1,
      irDashHeroLine: at.line,
      irDashHeroArea: at.area,
      irDashHiVal: h(W.max),
      irDashHiSub: W.peakNum,
      irDashHiTip: "أعلى قيمة سُجّلت — " + W.peakShort,
      irDashLoVal: h(W.min),
      irDashLoSub: W.lowNum,
      irDashLoTip: "أدنى قيمة سُجّلت — " + W.lowShort,
      irDashAvgVal: h(W.avg),
      irDashAvgSub: B ? c(W.act) : KIVO.BassamCount(W.act, "شهر") + "",
      irDashGapOn: W.gap > 0,
      irDashGapVal: String(W.gap),
      irDashCmpChipOn: G,
      irDashCmpChipTxt: ye.txt,
      irDashCmpChipStyle: ye.style,
      irDashCmpChipPrev: n(tt),
      irDashMets: X.map((t) => ({
        name: t.m.name,
        desc: t.m.desc,
        num: l(t.st.tot),
        pct: "٪" + ($ ? o((t.st.tot / $) * 100) : "0"),
        ring:
          "width:50px;height:50px;border-radius:9999px;position:relative;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:conic-gradient(var(--bg-xb99751) 0% " +
          ($ ? ((t.st.tot / $) * 100).toFixed(2) : 0) +
          "%,#E4DAC6 " +
          ($ ? ((t.st.tot / $) * 100).toFixed(2) : 0) +
          "% 100%)",
        i1: t.i1,
        i2: t.i2,
        i3: t.i3,
        i4: t.i4,
      })),
      irDashGauges: X.map((t) => {
        const e = t.st,
          s = e.max > e.min ? Math.max(0, Math.min(1, (e.avg - e.min) / (e.max - e.min))) : 0.5,
          a = Math.PI * s,
          r = st(e.ser, 200, 40),
          i = F.reduce((e, s) => e + t.m.f(s), 0),
          d = vt(e.tot, i);
        return {
          name: t.m.name,
          desc: t.m.desc + " خلال الفترة",
          num: l(e.tot),
          nx: (100 + 60.5 * Math.cos(a)).toFixed(1),
          ny: (87 - 60.5 * Math.sin(a)).toFixed(1),
          min: h(e.min),
          minDate: e.lowNum,
          minTip: "أدنى " + t.m.name + " — " + e.lowShort,
          avg: h(e.avg),
          avgSub: B ? c(e.act) : KIVO.BassamCount(e.act, "شهر") + "",
          max: h(e.max),
          maxDate: e.peakNum,
          maxTip: "ذروة " + t.m.name + " — " + e.peakShort,
          share: ($ ? o((e.tot / $) * 100) : "0") + "٪",
          dTxt: d.txt,
          dStyle: d.style,
          dTip: G ? t.m.name + " في " + V + ": " + n(i) : "لا توجد فترة سابقة للمقارنة",
          spark: r.area,
          i1: t.i1,
          i2: t.i2,
          i3: t.i3,
          i4: t.i4,
        };
      }),
      irDashBrkOpts: [
        ["total", "الإجمالي"],
        ["shift", "حسب الوردية"],
        ["loc", "حسب الموقع"],
      ].map((t) => ({ lbl: t[1], on: rt === t[0], style: be(rt === t[0]), click: () => this.setState({ irDashBrk: t[0] }) })),
      irDashTrendDesc:
        (B ? "تجميع يومي" : "تجميع شهري") + " · " + KIVO.BassamCount(bt, "نقطة") + "" + (dt ? " · مع خط الفترة السابقة" : ""),
      irDashTrendGrid: ft,
      irDashXLabels: St,
      irDashHits: xt,
      irDashPlain: !ht,
      irDashStacked: ht,
      irDashStackPaths: ut,
      irDashLine: mt.line,
      irDashArea: mt.area,
      irDashGhostOn: !!gt,
      irDashGhost: gt ? gt.line : "",
      irDashLegend: ht
        ? lt.map((t) => ({ name: t.name, dot: "width:9px;height:9px;border-radius:3px;display:inline-block;background:" + t.color }))
        : [
            {
              name: "القطع المضبوطة — الفترة الحالية",
              dot: "width:9px;height:9px;border-radius:3px;display:inline-block;background:var(--bg-xb99751)",
            },
          ],
      irDashGhostLbl: V,
      irDashHasData: bt > 0 && $ > 0,
      irDashNoData: !(bt > 0 && $ > 0),
      irDashHeatCols: Dt,
      irDashHeatMonths: zt,
      irDashHeatScale: kt,
      irDashHeatDesc:
        "كل مربع = يوم واحد من سنة " +
        R +
        " هـ · " +
        KIVO.BassamCount(wt, "يوم") +
        " " +
        KIVO.BassamCount.agr(wt, "فيه", "فيهما", "فيها") +
        " نشاط · تعرض السنة كاملة مهما كان النطاق المختار",
      irDashHeatYear: R + " هـ",
      irDashHeatOn: Dt.length > 0,
      irDashHeatOff: 0 === Dt.length,
      irDashLangRows: Mt,
      irDashLangOn: Mt.length > 0,
      irDashLangOff: 0 === Mt.length,
      ...KIVO.BassamCount.pair("irDashLangTot", n(X[0].st.tot), "قطعة", "g"),
      irDashLocRows: Nt,
      irDashLocOn: Nt.length > 0,
      irDashLocOff: 0 === Nt.length,
      ...KIVO.BassamCount.pair("irDashLocTot", n($), "قطعة", "g"),
      irDashShareSegs: Vt,
      irDashShiftLegend: Ht,
      irDashShiftRows: Rt,
      irDashCmpOn: G,
      irDashCmpOff: !G,
      irDashCmpRows: Gt,
      irDashPrevLbl: G ? V : "الفترة السابقة",
      irDashTopEmployees: Jt,
      irDashEmpOn: Jt.length > 0,
      irDashEmpOff: 0 === Jt.length,
      irEmptyShow: 0 === s.length,
      irDashSumOpen: !!t.irDashSumOpen,
      irDashSumToggle: () => this.setState({ irDashSumOpen: !this.state.irDashSumOpen }),
      irDashSumChev: "transition:transform .2s;flex-shrink:0;" + (t.irDashSumOpen ? "transform:rotate(180deg)" : ""),
      irDashSumBadge: KIVO.BassamCount($t.length, "وردية") + "",
      irDashSumQ: t.irDashSumQ || "",
      irDashSumSetQ: (t) => this.setState({ irDashSumQ: t.target.value, irDashSumPage: 1 }),
      irDashSumShown: String(te.length),
      irDashSumAll: String($t.length),
      irDashSumRows: oe,
      irDashSumTotal: me,
      irDashMetNames: q.map((t) => t.name),
      irDashMet1: q[0] ? q[0].name : "—",
      irDashMet2: q[1] ? q[1].name : "—",
      irDashMet34:
        q
          .slice(2)
          .map((t) => t.name)
          .join(" + ") || "—",
      irDashMetsLine: q.map((t) => t.name).join(" + "),
      irDashSumHas: te.length > 0,
      irDashSumEmpty: 0 === te.length,
      irDashSumEmptyMsg: Xt ? "لا توجد وردية مطابقة لـ «" + Xt + "»" : "لا توجد بيانات ضمن هذه الفترة",
      ...KIVO.BassamCount.pair("irDashSumPgTotal", String(te.length), "سجل", "g"),
      irDashSumPgRange: 0 === te.length ? "0" : ie + 1 + "–" + Math.min(ie + se, te.length),
      irDashSumPgNums: ne,
      irDashSumPerPage: String(ee),
      irDashSumOnPerPage: (t) => {
        const e = +t.target.value;
        this.setState({ irDashSumPerPage: 0 === e ? 0 : e || 10, irDashSumPage: 1 });
      },
      irDashSumPgFirst: () => this.setState({ irDashSumPage: 1 }),
      irDashSumPgPrev: () => this.setState({ irDashSumPage: Math.max(1, (this.state.irDashSumPage || 1) - 1) }),
      irDashSumPgNext: () => this.setState({ irDashSumPage: Math.min(ae, (this.state.irDashSumPage || 1) + 1) }),
      irDashSumPgLast: () => this.setState({ irDashSumPage: ae }),
      irDashSumPgFirstStyle: le(re > 1),
      irDashSumPgPrevStyle: le(re > 1),
      irDashSumPgNextStyle: le(re < ae),
      irDashSumPgLastStyle: le(re < ae),
    };
  }
  _recordsCalVals() {
    const t = this.state,
      e = this.hToday(),
      s = t.irYear,
      a = t.irMonth,
      r = this.loadIrshad(),
      i = this.szDayCtx(s, a, t.irDay, ""),
      o = this.irActorKey(),
      n = (r.reports || []).filter((t) => !i.locked || this.recKey(t) === o || (i.myEmp && t.eid === i.myEmp.eid)),
      l = (t, e, s) => n.filter((a) => !(a.y !== t || (null != e && a.m !== e) || (null != s && a.d !== s))).length,
      h = l(s),
      c = 12 * e.y + e.m,
      d = t.irOpenMonths || {},
      p = t.irOpenDays || {},
      m = this.MONTHS.map((t, r) => {
        const i = r + 1,
          o = a === i,
          n = s === e.y && i === e.m,
          h = s + "-" + i,
          p = 12 * s + i < c,
          m = !!d[h],
          g = p && !m,
          u = l(s, i);
        let f =
            "position:relative;width:100%;border-radius:12px;padding:8px;text-align:center;transition:all .2s;box-shadow:var(--shadow-card);cursor:pointer;box-sizing:border-box;font-family:'Cairo',sans-serif;border:1px ",
          b = "#53565a",
          y = "#cbd5e1",
          S = "لا محاضر",
          x = !1,
          D = "",
          z = "";
        const w = "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",
          k = "M14 2v6h6";
        return (
          g
            ? ((f +=
                (o ? "solid #64748b;box-shadow:0 0 0 2px rgba(100,116,139,0.25);" : "solid rgba(100,116,139,0.35);") +
                "background:var(--bg-a1001161390p08)"),
              (b = "#475569"),
              (y = "#475569"),
              (x = !0),
              (S = u ? KIVO.BassamCount(u, "محضر") + "" : "انقضى — مقفل"),
              (D = "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"),
              (z = ""))
            : o
              ? ((f += "solid #b99751;box-shadow:0 0 0 2px rgba(185,151,81,0.3);background:var(--bg-a185151810p06)"),
                (b = "#b99751"),
                u && ((S = KIVO.BassamCount(u, "محضر") + ""), (y = "#b99751"), (x = !0), (D = w), (z = k)))
              : u
                ? ((f += "solid #E1E1E1;background:var(--bg-xffffff)"),
                  (S = KIVO.BassamCount(u, "محضر") + ""),
                  (y = "#b99751"),
                  (x = !0),
                  (D = w),
                  (z = k))
                : (f += "dashed #E1E1E1;background:var(--bg-a2452452450p7);opacity:.9"),
          {
            name: t,
            greg: this.hGregMonthLabel(s, i),
            style: f,
            nameColor: b,
            cntColor: y,
            cntLabel: S,
            cntIcon: x,
            footP1: D,
            footP2: z,
            isCurrent: n,
            tip: g
              ? (u ? KIVO.BassamCount(u, "محضر|مسجّل") + " في " + t + " · " : "") + (this.PC("approve") ? "الشهر انقضى — مقفل · نقرة مزدوجة لفتحه للاستدراك" : "الشهر انقضى — مقفل · فتحه للاستدراك يحتاج صلاحية الاعتماد")
              : p && m
                ? "مفتوح للاستدراك" + (this.PC("approve") ? " · نقرة مزدوجة لإغلاقه مجدداً" : "")
                : u
                  ? KIVO.BassamCount(u, "محضر|مسجّل") + " في " + t
                  : "لا محاضر مسجّلة في " + t,
            click: () =>
              this.setState(
                o
                  ? { irYear: s, irMonth: i, irDay: s === e.y && i === e.m ? e.d : 1 }
                  : { irYear: s, irMonth: i, irDay: s === e.y && i === e.m ? e.d : 1, irOpenMonths: {}, irOpenDays: {}, irLedgerOpen: !1 },
              ),
            dbl: (t) => {
              /* الموجة 1 · IRSZ-4: بلا صلاحية الاعتماد كانت النقرةُ المزدوجة لا تفعل شيئاً بصمت — الآن تشرح السبب */
              (t.stopPropagation(),
                this.PC("approve")
                  ? g
                    ? this.setState({ irOpenMonths: { [h]: !0 }, irOpenDays: {}, irYear: s, irMonth: i, irLedgerOpen: !1 })
                    : p && m && this.setState({ irOpenMonths: {} })
                  : (g || (p && m)) && this.bsToast("فتحُ الشهر أو اليوم المقفل للاستدراك وإعادةُ قفله تحتاج صلاحية الاعتماد — راجع مدير الإدارة"));
            },
          }
        );
      }),
      g = 12 * s + a,
      u = s + "-" + a,
      f = g < c,
      b = !!d[u],
      y = f && !b,
      S = this.hMonthDays(s, a),
      x = this.hGreg(s, a, 1),
      D = new Date(x.getFullYear(), x.getMonth(), x.getDate(), 12),
      z = [];
    for (let r = 1; r <= S; r++) {
      const i = l(s, a, r),
        o = r === t.irDay,
        n = s === e.y && a === e.m && r === e.d,
        h = s + "-" + a + "-" + r,
        d = f || (g === c && r < e.d),
        m = !!p[h],
        b = y || (d && !m),
        S = !b && d && m;
      let x = "#fff",
        w = "#53565a",
        k = "2px solid #E1E1E1";
      (i
        ? ((x = b ? "#64748b" : "#b99751"), (w = "#fff"), (k = "2px solid transparent"))
        : b && ((x = "rgba(148,163,184,0.12)"), (w = "#94a3b8")),
        o && (k = "2px solid " + (b ? "#64748b" : "#b99751")));
      const O = new Date(D.getTime() + 864e5 * (r - 1));
      let v = "";
      try {
        v = O.toLocaleDateString("ar-u-ca-gregory-nu-latn", { day: "numeric", month: "long", year: "numeric" });
      } catch (t) {}
      z.push({
        num: String(r),
        gnum: String(O.getDate()),
        isToday: n,
        lockClosed: b,
        lockOpen: S,
        sepStyle:
          "display:block;width:9px;height:1px;flex-shrink:0;margin:1px 0;background:" +
          (i ? "var(--bg-a2552552550p5)" : "var(--bg-a1481631840p55)"),
        tip:
          "يوم " +
          r +
          " " +
          this.MONTHS[a - 1] +
          " " +
          s +
          " هـ — الموافق " +
          v +
          " م" +
          (i ? " — " + KIVO.BassamCount(i, "محضر") + "" : " — لا محاضر") +
          (b ? " — انقضى، مقفل · " + (this.PC("approve") ? "نقرة مزدوجة لفتحه" : "فتحه يحتاج صلاحية الاعتماد") : S ? " — مفتوح للاستدراك" + (this.PC("approve") ? " · نقرة مزدوجة لإغلاقه" : "") : ""),
        click: () => this.setState(o ? { irDay: r } : { irDay: r, irOpenDays: {}, irLedgerOpen: !1 }),
        dbl: (t) => {
          (t.stopPropagation(),
            this.PC("approve")
              ? y
                ? this.setState({ irOpenMonths: { [u]: !0 }, irOpenDays: {} })
                : d && this.setState((t) => ({ irOpenDays: t.irOpenDays && t.irOpenDays[h] ? {} : { [h]: !0 } }))
              : (y || d) && this.bsToast("فتحُ الشهر أو اليوم المقفل للاستدراك وإعادةُ قفله تحتاج صلاحية الاعتماد — راجع مدير الإدارة"));
        },
        style:
          "position:relative;height:24px;flex:1 1 auto;min-width:28px;padding:0 3px;border-radius:4px;font-size:8px;font-weight:" +
          (o ? "900" : "700") +
          ";display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;user-select:none;background:" +
          x +
          ";color:" +
          w +
          ";border:" +
          k +
          (o ? ";box-shadow:var(--shadow-card);z-index:10" : "") +
          (n && !o ? ";box-shadow:0 0 0 2px rgba(185,151,81,0.7)" : ""),
      });
    }
    const w = s === e.y && a === e.m,
      k = t.irDay,
      O = this.MONTHS[a - 1],
      v = !!p[s + "-" + a + "-" + k],
      E = f || (g === c && k < e.d),
      L = !y && E && !v,
      P = !y && !L && this._irCanWrite(),
      I = this.WEEKDAYS[this.hGreg(s, a, k).getDay()],
      C = this.szDayCtx(s, a, k, I),
      M = this.szAutoFill(t.irDraft || this.emptyDraft(), C, !!t.irEditId),
      A = (t) => {
        const e = { ...(this.state.irDraft || this.emptyDraft()), ...t };
        this.setState({ irDraft: e, irSaveErrMsg: "" });
      },
      T = (t, e) => {
        const s = Math.max(0, (parseInt(t || "0", 10) || 0) + e);
        return String(s);
      },
      _ = (t) => (parseInt(t, 10) || 0).toLocaleString("en-US"),
      F = (t) => String(null == t ? "" : t).replace(/[^0-9]/g, "");
    this.__ix = null;
    const N = this.loadCat(),
      B = this.loadActs(),
      K = (this.actMap(), (V = M.cat), N.cats.find((t) => t.name === V) || null);
    var V;
    const H = this.itemOf(+M.item),
      R = (H && H.unit) || "pc",
      G = this.loadIrshad(),
      U = (t) =>
        (G.reports || []).some((e) =>
          (e.items || []).some((e) => {
            const s = this.itemOf(e.id);
            return s && s.cat === t;
          }),
        ),
      j = (t, e, s) => {
        const a = this.itemOf(t.id) || { name: "بند محذوف", cat: "", color: "#94a3b8", id: t.id },
          r = a.unit || "pc",
          i =
            "sar" === r
              ? _(t.n) + " ريال"
              : "case" === r
                ? KIVO.BassamCount(parseInt(t.n, 10) || 0, "حالة") + ""
                : "×" + (parseInt(t.n, 10) || 0),
          o = (t.hist || [])[(t.hist || []).length - 1],
          n = this.kindOf(t);
        return {
          key: String(e),
          cat: a.cat,
          id: String(a.id),
          name: a.name,
          color: a.color,
          qty: i,
          kind: n,
          hasKind: !!n,
          nameK: a.name + (n ? " · " + n : ""),
          hasVal: "pcval" === r && !!parseInt(t.val, 10),
          val: _(t.val) + " ريال",
          actName: this.actName(t.act),
          actColor: this.actColor(t.act),
          updated: !!o,
          updatedAt: o ? o.at : "",
          photos: (t.photos || []).map((t) => ({ url: this.szImgUrl(t), has: !!this.szImgUrl(t) })),
          nPhotos: (t.photos || []).length,
          hasPhotos: (t.photos || []).length > 0,
          editable: !!s,
          remove: () => {
            const t = this.state.irDraft || this.emptyDraft();
            this.setState({ irDraft: { ...t, items: t.items.filter((t, s) => s !== e) } });
          },
          addPhoto: () => {
            ((this._szPhotoTarget = e), this.szOpenFile());
          },
        };
      },
      Y = M.items || [],
      Z =
        (Y.reduce((t, e) => t + this.qtyOf(e), 0),
        Y.reduce((t, e) => t + this.sarOf(e), 0),
        B.map((t) => ({ name: t.name, color: t.color, n: Y.filter((e) => e.act === t.k).reduce((t, e) => t + this.qtyOf(e), 0) })).filter(
          (t) => t.n > 0,
        ),
        ((t, e, s, a, r, i, o, n) => {
          const l = t();
          return {
            rows: l.map((i, h) => {
              const c = this.state[a] === h;
              return {
                editing: c,
                normal: !c,
                canEdit: !0,
                name: i,
                sel: s === i,
                rowStyle:
                  "display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:pointer;font-size:12.5px;font-weight:400;color:var(--fg-x25343f);" +
                  (s === i ? "background:var(--bg-a185151810p08);color:var(--fg-x8a6f35)" : ""),
                selectClick: () => {
                  const t = this.state.irDraft || this.emptyDraft();
                  this.setState({ irDraft: { ...t, ...n(i) }, [o]: !1, [a]: -1, irSaveErrMsg: "" });
                },
                editVal: c ? (null != this.state[r] ? this.state[r] : i) : "",
                setEditVal: (t) => this.setState({ [r]: t.target.value }),
                startEdit: (t) => {
                  (t && t.stopPropagation && t.stopPropagation(), this.setState({ [a]: h, [r]: i }));
                },
                saveEdit: () => {
                  const o = (this.state[r] || "").trim();
                  if (!o || (o !== i && l.includes(o))) return void this.setState({ [a]: -1, [r]: "" });
                  const c = t();
                  ((c[h] = o), e(c));
                  const d = this.state.irDraft || this.emptyDraft(),
                    p = s === i ? n(o) : {};
                  this.setState({ irDraft: { ...d, ...p }, [a]: -1, [r]: "" });
                },
                cancelEdit: () => this.setState({ [a]: -1, [r]: "" }),
                delClick: (i) => {
                  i && i.stopPropagation && i.stopPropagation();
                  const o = t();
                  if (o.length <= 1) return;
                  const l = o[h];
                  (o.splice(h, 1), e(o));
                  const c = this.state.irDraft || this.emptyDraft(),
                    d = s === l ? n("") : {};
                  this.setState({ irDraft: { ...c, ...d }, [a]: -1, [r]: "" });
                },
              };
            }),
            empty: 0 === l.length,
            popOpen: !!this.state[o],
            toggle: () => this.setState({ [o]: !this.state[o], [a]: -1 }),
            close: () => this.setState({ [o]: !1, [a]: -1 }),
            newVal: this.state[i] || "",
            setNewVal: (t) => this.setState({ [i]: t.target.value }),
            addNew: () => {
              const s = (this.state[i] || "").trim();
              if (s) {
                const a = t();
                a.includes(s) || (a.push(s), e(a));
              }
              this.setState({ [i]: "" });
            },
          };
        })(
          () => this.loadIrshadLocs(),
          (t) => this.saveIrshadLocs(t),
          M.loc,
          "irLocEditIdx",
          "irLocEditVal",
          "irLocNewVal",
          "irLocPopOpen",
          (t) => ({ loc: t }),
        )),
      Q = (t) =>
        "display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:pointer;font-size:12.5px;font-weight:400;color:var(--fg-x25343f);" +
        (t ? "background:var(--bg-a185151810p08);color:var(--fg-x8a6f35)" : ""),
      q = (t, e, s, a, r, i, o, n, l, h, c, d) =>
        e.map((t, e) => {
          const p = this.state[c] === e,
            m = a(t);
          return {
            editing: p,
            normal: !p,
            name: r(t),
            sub: o ? o(t) : "",
            hasSub: !(!o || !o(t)),
            color: i(t),
            sel: s === m,
            rowStyle: Q(s === m),
            selectClick: () => n(t, e),
            editVal: p ? (null != this.state[d] ? this.state[d] : r(t)) : "",
            setEditVal: (t) => this.setState({ [d]: t.target.value }),
            startEdit: (s) => {
              (s && s.stopPropagation && s.stopPropagation(), this.setState({ [c]: e, [d]: r(t) }));
            },
            saveEdit: () => {
              const s = (this.state[d] || "").trim();
              (this.setState({ [c]: -1, [d]: "" }), s && s !== r(t) && l(t, e, s));
            },
            cancelEdit: () => this.setState({ [c]: -1, [d]: "" }),
            delClick: (s) => {
              (s && s.stopPropagation && s.stopPropagation(), h(t, e));
            },
          };
        }),
      J = q(
        0,
        N.cats,
        M.cat,
        (t) => t.name,
        (t) => t.name,
        (t) => t.color || "#94a3b8",
        (t) => KIVO.BassamCount((t.items || []).length, "بند") + "",
        (t) => {
          const e = (t.items || [])[0];
          (A({
            cat: t.name,
            item: e ? e.id : 0,
            act: B.some((e) => e.k === t.def) ? t.def : B[0].k,
            n: "",
            val: "",
            kind: "",
            kindTxt: "",
          }),
            this.setState({ szCatPopOpen: !1, szCatEditIdx: -1 }));
        },
        (t, e, s) => {
          const a = this.loadCat();
          if (a.cats.some((t, a) => a !== e && t.name === s)) return void this.bsToast("يوجد تصنيف بهذا الاسم");
          const r = a.cats[e].name;
          ((a.cats[e].name = s), this.saveCat(a), M.cat === r && A({ cat: s }));
        },
        (t, e) => {
          if (U(t.name)) return void this.bsToast("لا يمكن حذف «" + t.name + "» لأنه مستخدم في محاضر محفوظة — عدّل اسمه أو أبقه");
          const s = this.loadCat();
          s.cats.length <= 1 ||
            (s.cats.splice(e, 1), this.saveCat(s), M.cat === t.name && A({ cat: "", item: 0 }), this.setState({ szCatEditIdx: -1 }));
        },
        "szCatEditIdx",
        "szCatEditVal",
      ),
      W = (t.szItemQ || "").trim(),
      X = (t) => !W || KIVO.BassamFind.match(W, [t.name, String(t.id)]),
      $ = (t, e, s) =>
        q(
          0,
          s,
          +M.item,
          (t) => t.id,
          (t) => t.name,
          () => t.color || "#94a3b8",
          (t) => String(t.id),
          (e) => {
            (A({ cat: t.name, item: e.id, act: B.some((e) => e.k === t.def) ? t.def : B[0].k, n: "", val: "", kind: "", kindTxt: "" }),
              this.setState({ szItemPopOpen: !1, szItemEditIdx: -1, szItemQ: "" }));
          },
          (t, s, a) => {
            const r = this.loadCat(),
              i = r.cats[e].items.find((e) => e.id === t.id);
            i && ((i.name = a), this.saveCat(r));
          },
          (t, s) => {
            if (((a = t.id), (G.reports || []).some((t) => (t.items || []).some((t) => +t.id === +a))))
              return void this.bsToast("لا يمكن حذف «" + t.name + "» لأنه مستخدم في محاضر محفوظة — عدّل اسمه أو أبقه");
            var a;
            const r = this.loadCat(),
              i = r.cats[e];
            ((i.items = i.items.filter((e) => e.id !== t.id)),
              this.saveCat(r),
              +M.item === t.id && A({ item: 0 }),
              this.setState({ szItemEditIdx: -1 }));
          },
          "szItemEditIdx",
          "szItemEditVal",
        );
    let tt = [],
      et = [];
    if (K) {
      const t = N.cats.indexOf(K);
      tt = $(K, t, (K.items || []).filter(X));
    }
    W &&
      N.cats.forEach((t, e) => {
        if (t === K) return;
        const s = (t.items || []).filter(X);
        s.length && et.push({ name: t.name, color: t.color || "#94a3b8", rows: $(t, e, s) });
      });
    const st = q(
        0,
        B,
        M.act,
        (t) => t.k,
        (t) => t.name,
        (t) => t.color || "#475569",
        null,
        (t) => {
          (A({ act: t.k }), this.setState({ szActPopOpen: !1, szActEditIdx: -1 }));
        },
        (t, e, s) => {
          const a = this.loadActs();
          ((a[e].name = s), this.saveActs(a));
        },
        (t, e) => {
          if (((s = t.k), (G.reports || []).some((t) => (t.items || []).some((t) => t.act === s))))
            return void this.bsToast("لا يمكن حذف «" + t.name + "» لأنه مستخدم في محاضر محفوظة — عدّل اسمه أو أبقه");
          var s;
          const a = this.loadActs();
          a.length <= 1 || (a.splice(e, 1), this.saveActs(a), M.act === t.k && A({ act: a[0].k }), this.setState({ szActEditIdx: -1 }));
        },
        "szActEditIdx",
        "szActEditVal",
      ),
      at = this.loadKinds(),
      rt = q(
        0,
        at,
        M.kind,
        (t) => t,
        (t) => t,
        () => "#c9a227",
        null,
        (t) => {
          (A({ kind: t, kindTxt: "" }), this.setState({ szKindPopOpen: !1, szKindEditIdx: -1 }));
        },
        (t, e, s) => {
          const a = this.loadKinds();
          if (s === this.SZ_OTHER || a.some((t, a) => a !== e && t === s)) return void this.bsToast("يوجد نوع بهذا الاسم");
          const r = a[e];
          ((a[e] = s), this.saveKinds(a));
          const i = this.loadIrshad();
          let o = !1;
          ((i.reports || []).forEach((t) =>
            (t.items || []).forEach((t) => {
              t.kind === r && ((t.kind = s), (o = !0));
            }),
          ),
            o && this.saveIrshad(i),
            M.kind === r && A({ kind: s }));
        },
        (t, e) => {
          if (((t) => (G.reports || []).some((e) => (e.items || []).some((e) => e.kind === t)))(t))
            return void this.bsToast("لا يمكن حذف «" + t + "» لأنه مستخدم في محاضر محفوظة — عدّل اسمه أو أبقه");
          const s = this.loadKinds();
          s.length <= 1 || (s.splice(e, 1), this.saveKinds(s), M.kind === t && A({ kind: "" }), this.setState({ szKindEditIdx: -1 }));
        },
        "szKindEditIdx",
        "szKindEditVal",
      ),
      it = "pcval" === R && M.kind === this.SZ_OTHER,
      ot = n.filter((t) => t.y === s && t.m === a).sort((t, e) => e.d - t.d || (e.ts || 0) - (t.ts || 0)),
      nt = ot.reduce((t, e) => t + this.benOf(e), 0),
      lt = (t) => ot.reduce((e, s) => e + this.actOf(s, t), 0),
      ht = B[0] || { k: "sec", name: "—" },
      ct = B[1] || { k: "des", name: "—" },
      dt = B[2] || { k: "sto", name: "—" },
      pt = ot.reduce((t, e) => t + this.sarTot(e), 0),
      mt = (t.irLgSearch || "").trim().toLowerCase(),
      gt = ot.filter(
        (e) =>
          !(
            ("all" !== t.irLgLoc && (e.loc || "") !== t.irLgLoc) ||
            ("all" !== t.irLgCat &&
              !(e.items || []).some((e) => {
                const s = this.itemOf(e.id);
                return s && s.cat === t.irLgCat;
              })) ||
            ("all" !== t.irLgAct && !(e.items || []).some((e) => e.act === t.irLgAct)) ||
            (mt &&
              !KIVO.BassamFind.match(
                mt,
                [this.recBy(e), e.loc, e.no].concat(
                  (e.items || []).map((t) => {
                    const e = this.itemOf(t.id);
                    return (e ? e.name : "") + " " + this.kindOf(t);
                  }),
                ),
              ))
          ),
      ),
      ut = (t) => {
        let e = "—";
        try {
          const s = this.hGreg(t.y, t.m, t.d);
          e = s.getDate() + "/" + (s.getMonth() + 1) + "/" + s.getFullYear();
        } catch (t) {}
        let s = "—";
        try {
          if (t.ts) {
            const e = new Date(t.ts);
            let a = e.getHours();
            const r = e.getMinutes(),
              i = a >= 12 ? "م" : "ص";
            ((a %= 12), 0 === a && (a = 12), (s = String(a).padStart(2, "0") + ":" + String(r).padStart(2, "0") + " " + i));
          }
        } catch (t) {}
        return { dayLabel: t.d + "/" + t.m + "/" + t.y, gregLabel: e, timeLabel: s };
      },
      ft = 0 === t.irLedgerPerPage ? 0 : t.irLedgerPerPage || 10,
      bt = 0 === ft ? Math.max(1, gt.length) : ft,
      yt = Math.max(1, Math.ceil(gt.length / bt)),
      St = Math.min(Math.max(1, t.irLedgerPage || 1), yt),
      xt = (St - 1) * bt,
      Dt = gt.slice(xt, xt + bt),
      zt = [];
    {
      const t = [],
        e = (e) => {
          t.includes(e) || t.push(e);
        };
      e(1);
      for (let t = St - 1; t <= St + 1; t++) t >= 1 && t <= yt && e(t);
      (e(yt), t.sort((t, e) => t - e));
      for (let e = 0; e < t.length; e++) {
        e > 0 && t[e] - t[e - 1] > 1 && zt.push({ dots: !0, label: "…" });
        const s = t[e];
        zt.push({
          dots: !1,
          label: String(s),
          cur: s === St,
          plain: s !== St,
          style:
            "height:28px;min-width:28px;padding:0 4px;border:0;border-right:1px solid var(--bd-xe1e1e1);font-size:11px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';" +
            (s === St ? "background:var(--bg-xb99751);color:var(--text-on-brand)" : "background:transparent;color:var(--fg-x475569)"),
          click: () => this.setState({ irLedgerPage: s }),
        });
      }
    }
    const wt = (t) =>
        "height:28px;width:28px;border:0;border-right:1px solid var(--bd-xe1e1e1);background:transparent;display:flex;align-items:center;justify-content:center;" +
        (t ? "color:var(--fg-x475569);cursor:pointer" : "color:var(--fg-xcbd5e1);cursor:default"),
      kt =
        "width:100%;height:38px;padding:0 12px;font-size:12.5px;background:var(--bg-a2482502520p8);border:1px solid var(--bd-xe2e8f0);border-radius:11px;outline:none;font-family:'Cairo',sans-serif;color:var(--fg-x141414);box-sizing:border-box",
      Ot = (t) => (t.items || []).map((t, e) => j(t, e, !1)),
      vt = () => {
        const t = new Date(),
          e = this.hToday();
        return e.d + "/" + e.m + "/" + e.y + " " + String(t.getHours()).padStart(2, "0") + ":" + String(t.getMinutes()).padStart(2, "0");
      },
      Et = t.szUpd ? n.find((e) => e.id === t.szUpd) : null,
      Lt = Et
        ? (() => {
            const e = t.szUpdSel || {},
              s = (Et.items || []).map((t, s) => {
                const a = this.itemOf(t.id) || { name: "بند محذوف", cat: "", color: "#94a3b8", id: t.id },
                  r = null != e[s] ? e[s] : t.act,
                  i = (t.hist || [])[(t.hist || []).length - 1];
                return {
                  key: String(s),
                  name: a.id + " · " + a.name + (this.kindOf(t) ? " · " + this.kindOf(t) : ""),
                  color: a.color,
                  qty: j(t, s, !1).qty,
                  curAct: r,
                  changed: r !== t.act,
                  hist: i
                    ? "آخر تحديث: " + this.actName(i.from) + " ← " + this.actName(i.to) + " · " + i.at + " · " + i.by
                    : "الإجراء الأصلي عند الضبط",
                  opts: B.map((t) => ({ v: t.k, name: t.name })),
                  selStyle:
                    "height:32px;border:1px solid var(--bd-xe1e1e1);border-radius:8px;padding:0 8px;font-family:'Cairo',sans-serif;font-size:11.5px;font-weight:700;background:var(--bg-xffffff);color:" +
                    this.actColor(r),
                  onSel: (t) => this.setState({ szUpdSel: { ...(this.state.szUpdSel || {}), [s]: t.target.value } }),
                  btnStyle:
                    "height:32px;padding:0 12px;border-radius:9px;border:1px solid var(--bd-xa8853f);background:linear-gradient(180deg,var(--bg-xc5a45c),var(--bg-xb99751));color:var(--text-on-brand);font-family:'Cairo',sans-serif;font-size:11.5px;font-weight:700;" +
                    (r !== t.act ? "cursor:pointer" : "opacity:.45;cursor:default"),
                  apply: () => {
                    if (r === t.act) return;
                    if (!this.PC("edit")) return void this.permDeny();
                    const e = this.loadIrshad(),
                      i = (e.reports || []).find((t) => t.id === Et.id);
                    if (!i || !i.items[s]) return;
                    const o = i.items[s];
                    ((o.hist = (o.hist || []).concat([{ from: o.act, to: r, at: vt(), by: this.irActor(), t: Date.now() }])),
                      (o.act = r),
                      (i.editedTs = Date.now()),
                      (i.editedBy = this.irActor()),
                      this.saveIrshad(e));
                    const n = { ...(this.state.szUpdSel || {}) };
                    (delete n[s],
                      this.setState({ szUpdSel: n }),
                      this.bsAck("حُدّث إجراء «" + a.name + "» إلى " + this.actName(r) + " — وسُجّل الوقت والمستخدم", "ok"));
                  },
                };
              }),
              a = (Et.items || [])
                .flatMap((t) =>
                  (t.hist || []).map((e) => ({
                    ...e,
                    name: (this.itemOf(t.id) || { name: "—" }).name + (this.kindOf(t) ? " · " + this.kindOf(t) : ""),
                  })),
                )
                .sort((t, e) => (e.t || 0) - (t.t || 0))
                .map((t) => ({
                  at: t.at,
                  by: t.by,
                  txt: t.name + ": " + this.actName(t.from) + " ← " + this.actName(t.to),
                  toColor: this.actColor(t.to),
                })),
              r = ut(Et);
            return {
              szUpdOpen: !0,
              szUpdTitle: "المحضر " + (Et.no || r.dayLabel),
              szUpdSub:
                (Et.loc || "—") +
                " · " +
                this.recBy(Et) +
                " · " +
                r.dayLabel +
                " " +
                r.timeLabel +
                " · " +
                (Et.name || "—") +
                (Et.editedTs ? " · عُدّل " + new Date(Et.editedTs).toLocaleString("ar-u-nu-latn") : ""),
              szUpdRows: s,
              szUpdHist: a,
              szUpdHistHas: a.length > 0,
              szUpdNote: Et.note || "",
              szUpdNoteHas: !!Et.note,
              szUpdClose: () => this.setState({ szUpd: null, szUpdSel: {} }),
              szUpdStop: (t) => t.stopPropagation(),
            };
          })()
        : { szUpdOpen: !1 },
      Pt = t.szGal ? n.find((e) => e.id === t.szGal) : null,
      It = Pt
        ? (() => {
            const e = [];
            (Pt.items || []).forEach((t, s) => {
              const a = this.itemOf(t.id) || { name: "—", color: "#94a3b8", id: t.id };
              (t.photos || []).forEach((r, i) =>
                e.push({
                  iid: r,
                  url: this.szImgUrl(r),
                  name: a.id + " · " + a.name + (this.kindOf(t) ? " · " + this.kindOf(t) : ""),
                  color: a.color,
                  k: i + 1,
                  of: t.photos.length,
                  act: this.actName(t.act),
                  actColor: this.actColor(t.act),
                  qty: j(t, s, !1).qty,
                  ii: s,
                }),
              );
            });
            const s = Math.min(Math.max(0, t.szGalIdx || 0), Math.max(0, e.length - 1)),
              a = e[s] || null,
              r = ut(Pt);
            return {
              szGalOpen: !0,
              szGalTitle: "صور المحضر " + (Pt.no || r.dayLabel),
              szGalSub: (Pt.loc || "—") + " · " + this.recBy(Pt) + " · " + r.dayLabel + " " + r.timeLabel + " · " + (Pt.name || "—"),
              szGalCount: KIVO.BassamCount(e.length, "صورة"),
              szGalHas: !!a,
              szGalUrl: a ? a.url : "",
              szGalUrlHas: !(!a || !a.url),
              szGalCap: a ? a.name + " " + a.qty + " · " + a.act : "",
              szGalCapColor: a ? a.actColor : "#fff",
              szGalThumbs: e.map((t, e) => ({
                url: t.url,
                has: !!t.url,
                name: t.name.replace(/\s*\(.*\)/, "") + " · " + t.k + "/" + t.of,
                style:
                  "display:flex;align-items:center;gap:8px;border:1px solid " +
                  (e === s ? "var(--bd-xb99751)" : "var(--bd-xeceef1)") +
                  ";border-radius:10px;padding:6px;cursor:pointer",
                pick: () => this.setState({ szGalIdx: e }),
              })),
              szGalClose: () => this.setState({ szGal: null, szGalIdx: 0 }),
              szGalStop: (t) => t.stopPropagation(),
              szGalDel: () => {
                if (!a) return;
                if (!this.PC("del")) return void this.permDeny();
                const t = this.loadIrshad(),
                  e = (t.reports || []).find((t) => t.id === Pt.id);
                if (!e) return;
                const s = e.items[a.ii];
                if (s) {
                  ((s.photos = (s.photos || []).filter((t) => t !== a.iid)), this.saveIrshad(t));
                  try {
                    KIVO.BassamIDB && KIVO.BassamIDB.del(a.iid);
                  } catch (t) {}
                  (this.setState({ szGalIdx: 0 }), this.bsAck("حُذفت الصورة", "ok"));
                }
              },
              szGalDownload: () => {
                if (a && a.url)
                  try {
                    const t = document.createElement("a");
                    ((t.href = a.url),
                      (t.download = (Pt.no || "mb") + "-" + a.iid + ".jpg"),
                      document.body.appendChild(t),
                      t.click(),
                      t.remove());
                  } catch (t) {}
              },
            };
          })()
        : { szGalOpen: !1 };
    return {
      irMonths: m,
      irYearLabel: s + " هـ",
      irGregRange: this.hGregYearRange(s),
      irBadgeLabel: KIVO.BassamCount(h, "محضر") + " هذه السنة",
      irBadgeStyle:
        "display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;border-radius:9999px;padding:4px 12px;font-family:'Cairo',sans-serif;border:1px solid " +
        (w
          ? "rgba(185,151,81,0.35);color:var(--fg-x9a7e40);background:var(--bg-a185151810p12)"
          : "rgba(148,163,184,0.35);color:var(--fg-x64748b);background:var(--bg-a1481631840p1)"),
      irPrevYear: () => this.setState({ irYear: s - 1, irOpenMonths: {}, irOpenDays: {}, irLedgerOpen: !1 }),
      irNextYear: () => this.setState({ irYear: s + 1, irOpenMonths: {}, irOpenDays: {}, irLedgerOpen: !1 }),
      irGoCurrent: () => this.setState({ irYear: e.y, irMonth: e.m, irDay: e.d, irOpenMonths: {}, irOpenDays: {}, irLedgerOpen: !1 }),
      irDays: z,
      irSelDateLabel: t.irDay + " " + this.MONTHS[a - 1] + " " + s + " هـ",
      irMonthAutoHint: y,
      irDayLockedHint: L,
      /* IRSZ-4: نصُّ التلميح بحسب الصلاحية — «نقرة مزدوجة لفتحه» لمن يملك الاعتماد وحده */
      ...(() => {
        const AP = this.PC("approve"),
          NO = " · فتحه للاستدراك يحتاج صلاحية الاعتماد — راجع مدير الإدارة";
        return {
          irPmApprove: AP,
          irDayLockedTxt: "اليوم انقضى — مقفل" + (AP ? " · انقر بطاقة اليوم نقرة مزدوجة لفتحه ثم سجّل محضرك" : NO),
          irMonthAutoTxt: "الشهر انقضى — مقفل" + (AP ? " · انقر بطاقة الشهر نقرة مزدوجة لفتحه ثم أضف محضرك" : NO),
          irLegendLockTxt: AP ? "انقضى — مقفل · نقرة مزدوجة لفتحه" : "انقضى — مقفل",
        };
      })(),
      irCanEnter: P && !0,
      irRepBlock: P && !1,
      irRepBlockMsg: "",
      szLocked: !0,
      szUnlocked: !1,
      szStatsOn: !C.locked,
      szGridStyle: "display:grid;gap:14px;grid-template-columns:1fr",
      irLocFreeVal: t.irLocFreeVal || "",
      irLocFreeSet: (t) => this.setState({ irLocFreeVal: t.target.value }),
      irLocFreeUse: () => {
        const t = String(this.state.irLocFreeVal || "").trim();
        if (!t) return;
        const e = this.state.irDraft || this.emptyDraft();
        this.setState({ irDraft: { ...e, loc: t }, irLocFreeVal: "", irLocPopOpen: !1, irSaveErrMsg: "" });
      },
      szMyName: this.irActor(),
      irEntryTitle: (t.irEditId ? "تعديل محضر — يوم " : "محضر مضبوطات — يوم ") + k + " " + O + " " + s + " هـ",
      irSaveBtnTitle: t.irEditId ? "حفظ التعديل" : "حفظ المحضر",
      szAddTitle: t.irEditId ? "حفظ التعديل على السجل" : "إضافة — تُحفظ فوراً في سجل الحركة",
      szAddLbl: t.irEditId ? "حفظ التعديل" : "إضافة",
      szCatVer: N.ver || this.SZ_VER,
      ...KIVO.BassamCount.pair("irKpiCount", String(ot.length), "محضر"),
      irKpiBen: nt.toLocaleString("en-US"),
      irKpiSar: pt.toLocaleString("en-US"),
      irKpiSarHas: pt > 0,
      irKpiA0: lt(ht.k).toLocaleString("en-US"),
      irKpiA1: lt(ct.k).toLocaleString("en-US"),
      irKpiA2: lt(dt.k).toLocaleString("en-US"),
      szA0: ht.name,
      szA1: ct.name,
      szA2: dt.name,
      irInputStyle: kt,
      irInputFocusStyle: "background:var(--bg-xffffff);border-color:var(--bd-a185151810p4);box-shadow:0 0 0 2px rgba(185,151,81,0.2)",
      irNoteStyle: kt + ";flex:1 1 240px;min-width:0;width:auto",
      irLocBtnLabel: M.loc || (C.hasRound ? "— اختر موقعاً من الجولة —" : "— اختر موقعاً —"),
      irLocFromRound: C.hasRound,
      irLocManual: !C.hasRound,
      irLocRows: C.hasRound
        ? C.labels.map((t) => ({
            normal: !0,
            editing: !1,
            name: t,
            sel: M.loc === t,
            fixed: !0,
            rowStyle:
              "display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:pointer;font-size:12.5px;font-weight:400;color:var(--fg-x25343f);" +
              (M.loc === t ? "background:var(--bg-a185151810p08);color:var(--fg-x8a6f35)" : ""),
            selectClick: () => {
              const e = this.state.irDraft || this.emptyDraft();
              this.setState({ irDraft: { ...e, loc: t }, irLocPopOpen: !1, irSaveErrMsg: "" });
            },
          }))
        : Z.rows,
      irLocEmpty: C.hasRound ? !C.labels.length : Z.empty,
      irLocPopOpen: Z.popOpen,
      irLocBtnToggle: Z.toggle,
      irLocClose: Z.close,
      irLocNewVal: Z.newVal,
      irLocNewSet: Z.setNewVal,
      irLocAddNew: Z.addNew,
      szNo: M.no || "",
      szSetNo: (t) => A({ no: t.target.value }),
      szNote: M.note || "",
      szSetNote: (t) => A({ note: t.target.value }),
      szCatLabel: M.cat || "— اختر التصنيف —",
      szCatColor: K ? K.color || "#94a3b8" : "#cbd5e1",
      szCatHint: K
        ? KIVO.BassamCount((K.items || []).length, "بند") +
          " · الإجراء المقترح: " +
          this.actName(B.some((t) => t.k === K.def) ? K.def : B[0].k)
        : "",
      szCatRows: J,
      szCatPopOpen: !!t.szCatPopOpen,
      szCatToggle: () =>
        this.setState({ szCatPopOpen: !t.szCatPopOpen, szCatEditIdx: -1, szItemPopOpen: !1, szActPopOpen: !1, szKindPopOpen: !1 }),
      szCatClose: () => this.setState({ szCatPopOpen: !1, szCatEditIdx: -1 }),
      szCatNewVal: t.szCatNewVal || "",
      szCatNewSet: (t) => this.setState({ szCatNewVal: t.target.value }),
      szCatAddNew: () => {
        const t = (this.state.szCatNewVal || "").trim();
        if (!t) return;
        const e = this.loadCat();
        e.cats.some((e) => e.name === t)
          ? this.bsToast("يوجد تصنيف بهذا الاسم")
          : (e.cats.push({ name: t, color: this.SZ_PALETTE[e.cats.length % this.SZ_PALETTE.length], def: B[0].k, items: [] }),
            this.saveCat(e),
            this.setState({ szCatNewVal: "", szCatPopOpen: !1 }),
            A({ cat: t, item: 0, act: B[0].k }));
      },
      szItemLabel: H ? H.id + " · " + H.name : K ? "— اختر البند —" : "اختر التصنيف أولاً",
      szItemColor: H ? H.color : "#cbd5e1",
      szItemHint: (H && H.desc) || "",
      szItemRows: tt,
      szItemEmpty: !!K && 0 === tt.length,
      szItemNoCat: !K,
      szItemOthers: et,
      szItemOthersHas: et.length > 0,
      szItemCatName: K ? K.name : "",
      szItemCatColor: K ? K.color || "#94a3b8" : "#cbd5e1",
      szItemPopOpen: !!t.szItemPopOpen,
      szItemToggle: () =>
        this.setState({
          szItemPopOpen: !t.szItemPopOpen,
          szItemEditIdx: -1,
          szItemQ: "",
          szCatPopOpen: !1,
          szActPopOpen: !1,
          szKindPopOpen: !1,
        }),
      szItemClose: () => this.setState({ szItemPopOpen: !1, szItemEditIdx: -1, szItemQ: "" }),
      szItemQ: t.szItemQ || "",
      szItemSetQ: (t) => this.setState({ szItemQ: t.target.value }),
      szItemNewVal: t.szItemNewVal || "",
      szItemNewSet: (t) => this.setState({ szItemNewVal: t.target.value }),
      szItemAddNew: () => {
        const t = (this.state.szItemNewVal || "").trim();
        if (!t || !K) return void (K || this.bsToast("اختر التصنيف أولاً ثم أضف البند فيه"));
        const e = this.loadCat(),
          s = e.cats.find((t) => t.name === K.name);
        if (!s) return;
        const a = { id: Math.max(57, ...e.cats.flatMap((t) => (t.items || []).map((t) => t.id))) + 1, name: t, desc: "", unit: "pc" };
        (s.items.push(a),
          this.saveCat(e),
          this.setState({ szItemNewVal: "", szItemPopOpen: !1, szItemQ: "" }),
          A({ item: a.id, act: B.some((t) => t.k === s.def) ? s.def : B[0].k }));
      },
      szUnitPc: "pc" === R || "case" === R || "pcval" === R,
      szUnitSar: "sar" === R,
      szUnitVal: "pcval" === R,
      szQtyLabel: "pcval" === R ? "عدد القطع" : "الكمية",
      szQtyHint: "case" === R ? "تُعدّ حالة (أشخاص)" : "قطعة",
      szDraftN: "sar" === R ? (M.n ? _(M.n) : "") : M.n || "",
      szSetN: (t) => A({ n: F(t.target.value) }),
      szNUp: () => A({ n: T(M.n, 1) }),
      szNDown: () => A({ n: T(M.n, -1) }),
      szSarLabel: H && 23 === H.id ? "المبلغ بالريال" : "القيمة بالريال",
      szDraftVal: M.val ? _(M.val) : "",
      szSetVal: (t) => A({ val: F(t.target.value) }),
      szActLabel: this.actName(M.act || (K ? K.def : "")),
      szActColor: this.actColor(M.act || (K ? K.def : "")),
      szActHint: K ? "مقترح للتصنيف: " + this.actName(B.some((t) => t.k === K.def) ? K.def : B[0].k) : "",
      szActRows: st,
      szActPopOpen: !!t.szActPopOpen,
      szActToggle: () =>
        this.setState({ szActPopOpen: !t.szActPopOpen, szActEditIdx: -1, szCatPopOpen: !1, szItemPopOpen: !1, szKindPopOpen: !1 }),
      szActClose: () => this.setState({ szActPopOpen: !1, szActEditIdx: -1 }),
      szActNewVal: t.szActNewVal || "",
      szActNewSet: (t) => this.setState({ szActNewVal: t.target.value }),
      szActAddNew: () => {
        const t = (this.state.szActNewVal || "").trim();
        if (!t) return;
        const e = this.loadActs(),
          s = "a" + Date.now().toString(36);
        (e.push({ k: s, name: t, color: "#475569" }),
          this.saveActs(e),
          this.setState({ szActNewVal: "", szActPopOpen: !1 }),
          A({ act: s }));
      },
      szKindLabel: M.kind || "— اختر نوع القطعة —",
      szKindColor: M.kind ? (it ? "#94a3b8" : "#c9a227") : "#cbd5e1",
      szKindHint: it ? "اكتب النوع في الحقل المجاور" : "للمجوهرات والذهب فقط · تُدار من داخل القائمة",
      szKindRows: rt,
      szKindOtherSel: it,
      szKindOtherRowStyle: Q(it),
      szKindPickOther: () => {
        (A({ kind: this.SZ_OTHER }), this.setState({ szKindPopOpen: !1, szKindEditIdx: -1 }));
      },
      szKindPopOpen: !!t.szKindPopOpen,
      szKindToggle: () =>
        this.setState({ szKindPopOpen: !t.szKindPopOpen, szKindEditIdx: -1, szCatPopOpen: !1, szItemPopOpen: !1, szActPopOpen: !1 }),
      szKindClose: () => this.setState({ szKindPopOpen: !1, szKindEditIdx: -1 }),
      szKindNewVal: t.szKindNewVal || "",
      szKindNewSet: (t) => this.setState({ szKindNewVal: t.target.value }),
      szKindAddNew: () => {
        const t = (this.state.szKindNewVal || "").trim();
        if (!t) return;
        if (t === this.SZ_OTHER) return void this.bsToast("«أخرى» موجودة دائماً في آخر القائمة");
        const e = this.loadKinds();
        e.includes(t)
          ? this.bsToast("يوجد نوع بهذا الاسم")
          : (e.push(t), this.saveKinds(e), this.setState({ szKindNewVal: "", szKindPopOpen: !1 }), A({ kind: t, kindTxt: "" }));
      },
      szKindOther: it,
      szKindTxt: M.kindTxt || "",
      szSetKindTxt: (t) => A({ kindTxt: t.target.value }),
      szEntryGrid:
        "display:grid;gap:10px;align-items:start;grid-template-columns:" +
        ("pcval" === R
          ? it
            ? "1fr 1.25fr 0.8fr 0.9fr 0.65fr 0.9fr 1fr"
            : "1.1fr 1.4fr 0.95fr 0.7fr 0.95fr 1fr"
          : "1.1fr 1.5fr 0.75fr 1fr"),
      szPhotoPick: (t) => this.szOnFile(t),
      szTakePhoto: () => {
        ((this._szPhotoTarget = null), this.szOpenFile());
      },
      szPhotoN: (M.photos || []).length ? "(" + M.photos.length + ")" : "",
      szPending: (M.photos || []).map((t) => ({ url: t.url })),
      szPendingHas: (M.photos || []).length > 0,
      szAddItem: () => {
        const t = this.state.irDraft || this.emptyDraft(),
          e = this.itemOf(+t.item);
        if (!e) return void this.setState({ irSaveErrMsg: "اختر التصنيف ثم البند قبل الإضافة" });
        const s = e.unit || "pc",
          a = parseInt(t.n || "0", 10) || 0;
        if (a <= 0) return void this.setState({ irSaveErrMsg: "sar" === s ? "اكتب المبلغ بالريال" : "حدّد الكمية" });
        let r = "",
          i = "";
        if ("pcval" === s) {
          if (((r = t.kind || ""), (i = (t.kindTxt || "").trim()), !r))
            return void this.setState({ irSaveErrMsg: "اختر نوع القطعة (أقراط، أساور، …) أو «أخرى»" });
          if (r === this.SZ_OTHER && !i) return void this.setState({ irSaveErrMsg: "اذكر نوع القطعة في الحقل المجاور لـ «أخرى»" });
          r !== this.SZ_OTHER && (i = "");
        }
        const o = t.act || (B.some((t) => t.k === e.def) ? e.def : B[0].k),
          n = (t.photos || []).map((t) => t.iid);
        (t.photos || []).forEach((t) => {
          ((this._szImg = this._szImg || {}), (this._szImg[t.iid] = t.url));
        });
        const l = this.state.irEditId ? (t.items || []).slice() : [],
          h = {
            id: e.id,
            n: a,
            val: ("pcval" === s && parseInt(t.val, 10)) || 0,
            act: o,
            kind: r,
            kindTxt: i,
            photos: this.state.irEditId ? ((l[0] || {}).photos || []).concat(n) : n,
            hist: (this.state.irEditId && (l[0] || {}).hist) || [],
          },
          c = this.state.irEditId ? [h].concat(l.slice(1)) : [h];
        this.szSaveRec({ ...t, items: c }) &&
          this.setState({
            irDraft: { ...this.emptyDraft(), loc: t.loc, locAuto: t.locAuto, cat: t.cat, act: "" },
            irEditId: null,
            irSaveErrMsg: "",
            irLedgerOpen: !1,
            irLgPage: 1,
          });
      },
      irClearDraft: () => this.setState({ irDraft: this.emptyDraft(), irSaveErrMsg: "", irEditId: null }),
      irSaveErr: !!t.irSaveErrMsg,
      irSaveErrMsg: t.irSaveErrMsg || "",
      irIsEditing: !!t.irEditId,
      irSaveReport: () => {
        const t = this.szAutoFill(this.state.irDraft || this.emptyDraft(), C, !!this.state.irEditId);
        this.szSaveRec(t) && this.setState({ irDraft: this.emptyDraft(), irEditId: null, irSaveErrMsg: "" });
      },
      irLedgerOpen: !!t.irLedgerOpen,
      irLedgerToggle: () => this.setState({ irLedgerOpen: !this.state.irLedgerOpen }),
      irLedgerChev: "transition:transform .2s;flex-shrink:0;" + (t.irLedgerOpen ? "transform:rotate(180deg)" : ""),
      irLgSearch: t.irLgSearch || "",
      irLgSetSearch: (t) => this.setState({ irLgSearch: t.target.value, irLedgerPage: 1 }),
      irLgFilesOpen: !!t.irLgFilesOpen,
      irLgFilesToggle: () => this.setState((t) => ({ irLgFilesOpen: !t.irLgFilesOpen })),
      irLgFilesChev: "opacity:.5;transition:transform .2s;" + (t.irLgFilesOpen ? "transform:rotate(180deg)" : ""),
      irLgFilesBtnStyle:
        "height:34px;display:flex;align-items:center;gap:6px;font-size:11.5px;border:1px solid var(--bd-xe2e8f0);border-radius:10px;padding:0 10px;cursor:pointer;font-family:'Cairo',sans-serif;background:var(--bg-xffffff);" +
        (t.irLgFilesOpen ? "color:var(--fg-xb99751);border-color:var(--bd-a185151810p4)" : "color:var(--fg-x475569)"),
      irLgExportCsv: () => {
        if (!this.PC("export")) return;
        const t = gt.map((t) => {
            const { dayLabel: e, gregLabel: s, timeLabel: a } = ut(t),
              r = (t.items || []).map((t, e) => j(t, e, !1));
            return [
              e,
              s,
              a,
              this.recBy(t),
              t.no || "—",
              t.loc || "—",
              r.map((t) => t.cat).join("، ") || "—",
              r.map((t) => t.id + " · " + t.nameK).join("، ") || "—",
              r.map((t) => t.qty + (t.hasVal ? " ≈ " + t.val : "")).join("، ") || "—",
              r.map((t) => t.actName).join("، ") || "—",
              String((t.items || []).reduce((t, e) => t + (e.photos || []).length, 0)),
              t.note || "",
            ];
          }),
          e = [
            [
              "التاريخ هـ",
              "الموافق م",
              "وقت الحفظ",
              "المُسجّل",
              "رقم المحضر",
              "موقع الضبط",
              "التصنيف",
              "البند",
              "الكمية",
              "الإجراء",
              "الصور",
              "الملاحظات",
            ],
          ].concat(t);
        try {
          KIVO.BassamXLSX
            ? KIVO.BassamXLSX.download(e, "seized-" + O + "-" + s + ".xlsx")
            : this.bsToast(
                "تعذّر تصدير Excel — مكتبة الجداول غير متاحة في هذه الجلسة. حدّث الصفحة وأعد المحاولة، أو استخدم «طباعة / حفظ PDF».",
              );
        } catch (t) {
          this.bsToast("تعذّر إنشاء ملف Excel — " + (t && t.message ? t.message : "خطأ غير متوقع") + ".");
        }
        this.setState({ irLgFilesOpen: !1 });
      },
      irLgPrintTable: () => {
        this.PC("export") && (this.setState({ irLgFilesOpen: !1 }), setTimeout(() => window.print(), 150));
      },
      irLgMonthLabel: O + " " + s + " هـ",
      irLgClearAllItemStyle:
        "display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;font-size:11px;font-weight:400;transition:background .15s;" +
        (ot.length > 0 ? "cursor:pointer;color:var(--fg-x141414)" : "cursor:not-allowed;color:var(--fg-xcbd5e1);opacity:.6"),
      irLgClearAllAsk: () => {
        this.PC("del") ? 0 !== ot.length && this.setState({ irLgFilesOpen: !1, irLgClearAllConfirm: !0 }) : this.permDeny();
      },
      irLgClearAllOpen: !!t.irLgClearAllConfirm,
      irLgClearAllStop: (t) => t.stopPropagation(),
      irLgClearAllCancel: () => this.setState({ irLgClearAllConfirm: !1 }),
      irLgClearAllMsg:
        "سيتم حذف جميع محاضر " +
        O +
        " " +
        s +
        " هـ نهائياً (" +
        KIVO.BassamCount(ot.length, "محضر|مسجّل") +
        ") مع " +
        KIVO.BassamCount.agr(ot.length, "صوره", "صورهما", "صورها") +
        ".",
      irLgClearAllDo: () => {
        const t = this.loadIrshad(),
          e = (t.reports || []).length;
        ((t.reports || [])
          .filter((t) => t.y === s && t.m === a)
          .forEach((t) =>
            (t.items || []).forEach((t) =>
              (t.photos || []).forEach((t) => {
                try {
                  KIVO.BassamIDB && KIVO.BassamIDB.del(t);
                } catch (t) {}
              }),
            ),
          ),
          (t.reports = (t.reports || []).filter((t) => !(t.y === s && t.m === a))),
          this.saveIrshad(t));
        const r = e - t.reports.length;
        (this.setState({ irLgClearAllConfirm: !1, irLedgerPage: 1 }),
          this.bsAck("تم حذف " + KIVO.BassamCount(r, "محضر", "g") + " من " + O + " " + s + " هـ.", "ok"));
      },
      ...(() => {
        const e = (e, s, a, r) => {
          const i = t[s],
            o = t.irLgFddOpen === e,
            n = r.find((t) => t.v === i),
            l = {};
          return (
            (l[e + "Open"] = o),
            (l[e + "Toggle"] = () => this.setState((t) => ({ irLgFddOpen: t.irLgFddOpen === e ? null : e }))),
            (l[e + "Label"] = "all" === i ? a : n ? n.name : i),
            (l[e + "Chev"] = "transition:transform .2s;flex-shrink:0;opacity:.5;" + (o ? "transform:rotate(180deg)" : "")),
            (l[e + "BtnStyle"] =
              "height:32px;min-width:100px;font-size:11px;border-radius:8px;border:1px " +
              ("all" === i
                ? "dashed #cbd5e1;color:var(--fg-x475569)"
                : "solid rgba(185,151,81,0.5);color:var(--fg-x9a7e40);font-weight:400") +
              ";background:var(--bg-xffffff);padding:0 10px;cursor:pointer;font-family:'Cairo',sans-serif;display:inline-flex;align-items:center;justify-content:space-between;gap:6px" +
              (o ? ";box-shadow:0 0 0 2px rgba(185,151,81,0.15)" : "")),
            (l[e + "Opts"] = r.map((t) => ({
              name: t.name,
              selected: i === t.v,
              pick: () => this.setState({ [s]: t.v, irLgFddOpen: null, irLedgerPage: 1 }),
              style:
                "display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;font-size:11px;cursor:pointer;transition:background .15s;" +
                (i === t.v ? "background:var(--bg-a185151810p08);color:var(--fg-x9a7e40);font-weight:400" : "color:var(--fg-x141414)"),
            }))),
            l
          );
        };
        return {
          ...e(
            "irLgFl",
            "irLgLoc",
            "كل المواقع",
            [{ v: "all", name: "كل المواقع" }].concat(
              ot
                .map((t) => t.loc)
                .filter((t, e, s) => t && s.indexOf(t) === e)
                .map((t) => ({ v: t, name: t })),
            ),
          ),
          ...e(
            "irLgFc",
            "irLgCat",
            "كل التصنيفات",
            [{ v: "all", name: "كل التصنيفات" }].concat(N.cats.map((t) => ({ v: t.name, name: t.name }))),
          ),
          ...e("irLgFa", "irLgAct", "كل الإجراءات", [{ v: "all", name: "كل الإجراءات" }].concat(B.map((t) => ({ v: t.k, name: t.name })))),
        };
      })(),
      irLgShownCount: String(gt.length),
      irLgTotalCount: String(ot.length),
      irLedgerCount: KIVO.BassamCount(String(ot.length), "محضر") + "",
      irLedgerSub: "كل محاضر المضبوطات المسجّلة خلال " + O + " " + s + " هـ",
      irLedgerHas: gt.length > 0,
      irLedgerEmpty: 0 === gt.length,
      irLedgerEmptyMsg: 0 === ot.length ? "لا محاضر مسجّلة في هذا الشهر بعد" : "لا نتائج مطابقة للبحث/الفلترة الحالية",
      irLedgerRows: Dt.map((t) => {
        const { dayLabel: e, gregLabel: s, timeLabel: a } = ut(t),
          r = (t.items || []).reduce((t, e) => t + (e.photos || []).length, 0);
        return {
          dayLabel: e,
          gregLabel: s,
          timeLabel: a,
          actor: this.recBy(t),
          loc: t.loc || "—",
          noTxt: t.no || "—",
          noteTxt: t.note || "—",
          no: t.no || "",
          noHas: !!t.no,
          items: Ot(t),
          noItems: 0 === (t.items || []).length,
          nPhotos: String(r),
          hasPhotos: r > 0,
          noPhotos: 0 === r,
          openGal: () => this.setState({ szGal: t.id, szGalIdx: 0 }),
          a0: String(this.actOf(t, ht.k)),
          a1: String(this.actOf(t, ct.k)),
          a2: String(this.actOf(t, dt.k)),
          ben: String(this.benOf(t)),
          sar: this.sarTot(t) ? this.sarTot(t).toLocaleString("en-US") + " ريال" : "",
          sarHas: this.sarTot(t) > 0,
          edited: !!t.editedTs,
          ...this._rowMenu("sz" + t.id, [
            this.PC("edit")
              ? {
                  name: "تحديث إجراء بند (مثلاً: محفوظ بالمستودع ← أُتلف)",
                  color: "#2f8f86",
                  p1: "M21 12a9 9 0 1 1-3-6.7",
                  p2: "M21 3v6h-6",
                  run: () => this.setState({ szUpd: t.id, szUpdSel: {} }),
                }
              : null,
            r > 0
              ? {
                  name: "صور المحضر",
                  color: "#9c3d6b",
                  p1: "M4 7h3l2-3h6l2 3h3v12H4z",
                  p2: "M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
                  run: () => this.setState({ szGal: t.id, szGalIdx: 0 }),
                }
              : null,
            this.PC("edit")
              ? {
                  name: "تعديل المحضر",
                  color: "#b99751",
                  p1: "M12 20h9",
                  p2: "M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z",
                  run: () => {
                    const e = t.y + "-" + t.m,
                      s = t.y + "-" + t.m + "-" + t.d;
                    this.setState({
                      irYear: t.y,
                      irMonth: t.m,
                      irDay: t.d,
                      irOpenMonths: { [e]: !0 },
                      irOpenDays: { [s]: !0 },
                      irEditId: t.id,
                      irDraft: {
                        ...this.emptyDraft(),
                        item: t.items && t.items[0] ? +t.items[0].id : 0,
                        cat: t.items && t.items[0] && this.itemOf(t.items[0].id) ? this.itemOf(t.items[0].id).cat : "",
                        n: t.items && t.items[0] ? String(t.items[0].n || "") : "",
                        val: t.items && t.items[0] && t.items[0].val ? String(t.items[0].val) : "",
                        act: (t.items && t.items[0] && t.items[0].act) || "",
                        kind: (t.items && t.items[0] && t.items[0].kind) || "",
                        kindTxt: (t.items && t.items[0] && t.items[0].kindTxt) || "",
                        loc: t.loc || "",
                        no: t.no || "",
                        note: t.note || "",
                        items: (t.items || []).map((t) => ({ ...t, photos: (t.photos || []).slice(), hist: (t.hist || []).slice() })),
                      },
                      irSaveErrMsg: "",
                    });
                  },
                }
              : null,
            this.PC("del")
              ? {
                  name: "حذف المحضر",
                  color: "#dc2626",
                  danger: !0,
                  p1: "M3 6h18",
                  p2: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
                  run: () => {
                    const e = this.loadIrshad();
                    ((t.items || []).forEach((t) =>
                      (t.photos || []).forEach((t) => {
                        try {
                          KIVO.BassamIDB && KIVO.BassamIDB.del(t);
                        } catch (t) {}
                      }),
                    ),
                      (e.reports = (e.reports || []).filter((e) => e.id !== t.id)),
                      this.saveIrshad(e),
                      this.setState({ irTab: this.state.irTab }));
                  },
                }
              : null,
          ]),
        };
      }),
      ...KIVO.BassamCount.pair("irLedgerPgTotal", String(gt.length), "سجل", "g"),
      irLedgerPgRange: 0 === gt.length ? "0" : xt + 1 + "–" + Math.min(xt + bt, gt.length),
      irLedgerPgNums: zt,
      irLedgerPerPage: String(ft),
      irLedgerOnPerPage: (t) => {
        const e = +t.target.value;
        this.setState({ irLedgerPerPage: 0 === e ? 0 : e || 10, irLedgerPage: 1 });
      },
      irLedgerPgFirst: () => this.setState({ irLedgerPage: 1 }),
      irLedgerPgPrev: () => this.setState({ irLedgerPage: Math.max(1, (this.state.irLedgerPage || 1) - 1) }),
      irLedgerPgNext: () => this.setState({ irLedgerPage: Math.min(yt, (this.state.irLedgerPage || 1) + 1) }),
      irLedgerPgLast: () => this.setState({ irLedgerPage: yt }),
      irLedgerPgFirstStyle: wt(St > 1),
      irLedgerPgPrevStyle: wt(St > 1),
      irLedgerPgNextStyle: wt(St < yt),
      irLedgerPgLastStyle: wt(St < yt),
      ...Lt,
      ...It,
    };
  }
  szOpenFile() {
    try {
      const t = document.getElementById("szPhotoInp");
      t && ((t.value = ""), t.click());
    } catch (t) {}
  }
  szOnFile(t) {
    const e = t && t.target && t.target.files && t.target.files[0];
    if (!e) return;
    const s = new Image(),
      a = URL.createObjectURL(e);
    ((s.onload = () => {
      try {
        const t = Math.min(1, 1280 / Math.max(s.width, s.height)),
          r = document.createElement("canvas");
        ((r.width = Math.max(1, Math.round(s.width * t))), (r.height = Math.max(1, Math.round(s.height * t))));
        const g9 = r.getContext("2d");
        ((g9.fillStyle = "#ffffff"), g9.fillRect(0, 0, r.width, r.height), g9.drawImage(s, 0, 0, r.width, r.height));
        const i = r.toDataURL("image/jpeg", 0.8);
        URL.revokeObjectURL(a);
        const o = "szp_" + Date.now().toString(36) + "_" + Math.floor(1e9 * Math.random()).toString(36);
        ((this._szImg = this._szImg || {}), (this._szImg[o] = i));
        try {
          KIVO.BassamIDB && KIVO.BassamIDB.set(o, i);
        } catch (t) {}
        const n = this.state.irDraft || this.emptyDraft();
        if (null != this._szPhotoTarget && n.items[this._szPhotoTarget]) {
          const t = n.items.slice(),
            e = { ...t[this._szPhotoTarget] };
          ((e.photos = (e.photos || []).concat([o])), (t[this._szPhotoTarget] = e), this.setState({ irDraft: { ...n, items: t } }));
        } else this.setState({ irDraft: { ...n, photos: (n.photos || []).concat([{ iid: o, url: i }]) } });
        ((this._szPhotoTarget = null),
          this.bsToast(
            "ضُغطت الصورة من " +
              (e.size / 1048576).toFixed(1) +
              " MB إلى " +
              Math.round((0.75 * i.length) / 1024) +
              " KB (" +
              r.width +
              "×" +
              r.height +
              ")",
            "ok",
          ));
      } catch (t) {
        this.bsToast("تعذّر معالجة الصورة");
      }
    }),
      (s.onerror = () => {
        (URL.revokeObjectURL(a), this.bsToast("الملف ليس صورة صالحة"));
      }),
      (s.src = a));
  }
  szImgUrl(t) {
    if (!t) return "";
    if (((this._szImg = this._szImg || {}), void 0 !== this._szImg[t])) return this._szImg[t] || "";
    this._szImg[t] = "";
    try {
      KIVO.BassamIDB &&
        KIVO.BassamIDB.get(t)
          .then((e) => {
            ((this._szImg[t] = "string" == typeof e ? e : ""), e && this.setState({ szImgTick: (this.state.szImgTick || 0) + 1 }));
          })
          .catch(() => {});
    } catch (t) {}
    return "";
  }
}
