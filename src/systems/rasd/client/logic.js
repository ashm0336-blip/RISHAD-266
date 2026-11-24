/* ═══ V7 · د6: نظامُ «رصد الحالات» (rasd) — نظامٌ مستقلٌّ في مجلده: محضرٌ ميداني يومي (المنطقة · المستوى · الموقع التفصيلي · نوع الحالة ·
   مستوى التأثير · الإجراء المتخذ · الجهة المبلَّغة · ملاحظات · مرفق) بشريط السنة والأيام وقفلِ ما انقضى، وكروتِ مؤشرات الشهر، وسجلٍّ شهري
   بجدول المنصة (بحث · ملفات · فلترة · ترتيب · ترقيم)، ولوحةِ مؤشرات يملكها النظام وتظهر في «مؤشرات الإدارة».
   البيانات بصيغة Production نفسِها (عقدٌ ثابت — تنتقل نسخةُ إدارةٍ قديمة بالاستيراد بلا تحويل):
     bassam_rasd_v1      { reports: [{ id, y, m, d, t, lt, by, byName, dept, zone, floor, spot, type, impact, act, party, notes, att }] }
     bassam_rasd_opts_v1 { zone, floor, type, act, party: [{ n, c }], spot: [{ n, z, g }] }
   مفتاحا إدارةٍ في مخزن المنصة السحابي (واجهةُ localStorage في هذا المستودع هي المخزنُ السحابي نفسُه — 280 · 320 — لا مخزنَ جهاز).
   التنبيهُ يُستنتج من فرق المخزن في مراقب التنبيهات (قطعةُ النظام nfo.watch) لا من الصفحة. «حالة الحالة» (مفتوحة/قيد المعالجة/مغلقة)
   رفضها صاحبُ المنصة (18 نوفمبر): لا تُبنى، و«الإجراء المتخذ» يغطّيها. ═══ */
// eslint-disable-next-line no-redeclare, no-unused-vars -- V7 · د6: صنفُ الصفحة باسم Component كسائر الصفحات (يقرؤه مُركِّبُ DC)
class Component extends KIVO.BassamPageKit.base(DCLogic, ["admin+award+daily+dreport+employees+irshad+plan+profile+seized+staff+tasks","admin+profile+seized","daily+dreport+dstats+irshad+plan+seized+staff+tasks","daily+dreport+irshad+plan+seized+staff+tasks","dreport+irshad+planning+profile+seized+staff+tasks","daily+dreport+irshad+plan+profile+seized","award+irshad+seized","irshad+seized+tasks","dstats+irshad","irshad+seized"]) {
  /* V7 · 53 تقويم (ق1 · §7): الصفحةُ بالأشهر الميلادية — السنةُ والشهرُ واليومُ في الحالة والحالات ميلادية، ويومُ التقويم تاريخٌ محليٌّ بلا ساعة */
  gDate(y, m, d) { return new Date(y, m - 1, d); }
  gParts(t) { return { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() }; }
  /* ── القوائم الافتراضية والقيمُ الأساسية التي يعتمد عليها منطقُ النظام ── */
  /* لوحةُ المضبوطات نفسُها برموز الألوان (لا ألوانَ خام — سقّاطةُ الألوان): تُخزَّن مع البند في القوائم (c) كما في Production، والقيمُ الخام القادمة من نسخةٍ قديمة تُعرض كما هي */
  RZ_PAL = ["var(--bg-x0e7490)", "var(--bg-x9c3d6b)", "var(--bg-xb45309)", "var(--bg-x1e9a66)", "var(--bg-xa5566e)", "var(--bg-x2f5f8a)", "var(--bg-x6e8a3a)", "var(--bg-x640f2a)"];
  RZ_OTHER = "أخرى";
  RZ_REPORT = "إبلاغ جهة مختصة";
  RZ_NOPARTY = "لم يتم الإبلاغ";
  RZ_NOACT = "لم يتخذ إجراء بعد";
  RZ_SEIZED = "ممنوعات";
  RZ_IMPACTS = ["منخفض", "متوسط", "عالٍ", "حرج"];
  RZ_IMP_COL = { "منخفض": "var(--success)", "متوسط": "var(--warning)", "عالٍ": "var(--fg-xc2410c)", "حرج": "var(--danger)" };
  RZ_KEYS = ["zone", "floor", "type", "act", "party"];
  RZ_NOUN = { zone: "منطقة", floor: "مستوى", type: "نوع", act: "إجراء", party: "جهة", spot: "موقع" };
  RZ_LBL = { zone: "المنطقة", floor: "الدور / المستوى", type: "نوع الحالة", act: "الإجراء المتخذ", party: "الجهة التي تم إبلاغها", spot: "الموقع التفصيلي" };
  RZ_PH = { zone: "المنطقة", floor: "المستوى", type: "النوع", act: "الإجراء", party: "الجهة" };
  RZ_LOCK = { zone: ["أخرى"], floor: [], type: ["ممنوعات", "أخرى"], act: ["إبلاغ جهة مختصة", "لم يتخذ إجراء بعد", "أخرى"], party: ["أخرى", "لم يتم الإبلاغ"] };
  RZ_HIDE = { party: ["لم يتم الإبلاغ"] };
  RZ_DEF = {
    zone: ["الأبواب", "المسعى", "الرواق السعودي", "توسعة الملك فهد", "الساحة الشرقية", "الساحة الغربية", "أخرى"],
    floor: ["القبو", "الأرضي", "الأول", "الثاني", "السطح", "الساحات الخارجية", "لا ينطبق"],
    type: ["ممنوعات", "ظاهرة سلبية", "ازدحام", "حالة صحية", "إغلاق جزئي", "عائق بالممر", "تعثر تدفق", "أخرى"],
    act: ["منع إدخال", "تنظيم حركة", "توجيه لمسار بديل", "إبلاغ جهة مختصة", "لم يتخذ إجراء بعد", "أخرى"],
    party: ["العمليات المشتركة", "العمليات الموحدة", "مكافحة الظواهر السلبية", "الجهة الفنية", "أخرى", "لم يتم الإبلاغ"],
  };
  /* المواقعُ المعتمدة: [الأسماء · المجموعة · المنطقة] */
  RZ_SPOTS = [
    [[1, 5, 45, 62, 64, 74, 79, 84, 89, 91, 94, 100].map((n) => "باب " + n), "باب", "الأبواب"],
    [["باب الملك عبدالعزيز", "باب الملك فهد", "باب العمرة", "باب الفتح", "باب السلام"], "باب رئيسي", "الأبواب"],
    [["ممر المسعى — الذهاب", "ممر المسعى — العودة", "ممر العربات", "ممر الصفا", "ممر المروة"], "ممر", "المسعى"],
    [["جسر الراقوبة", "جسر الشبيكة"], "جسر", "الساحة الغربية"],
    [["منحدر الساحة الشرقية", "مدخل الساحة الشرقية"], "ساحة", "الساحة الشرقية"],
    [["سلم كهربائي 12", "سلم كهربائي 28", "مصعد 7"], "وصلة", "الرواق السعودي"],
    [["سطح التوسعة — المدخل 3", "ممر التوسعة الأوسط"], "ممر", "توسعة الملك فهد"],
  ];
  RZ_K_REC = "bassam_rasd_v1";
  RZ_K_OPT = "bassam_rasd_opts_v1";

  /* ═══ القوائم والسجلات ═══ */
  rzSeedOpts() {
    const o = {};
    this.RZ_KEYS.forEach((k) => (o[k] = this.RZ_DEF[k].map((n, i) => ({ n: n, c: this.RZ_PAL[i % this.RZ_PAL.length] }))));
    o.spot = [];
    this.RZ_SPOTS.forEach(([names, g, z]) => names.forEach((n) => o.spot.push({ n: n, z: z, g: g })));
    return o;
  }
  /* تطبيعُ القوائم المخزّنة: القائمةُ الغائبة أو الفارغة تأخذ الافتراضي، والقيمُ الأساسية (RZ_LOCK) حاضرةٌ دائماً */
  rzNormOpts(raw) {
    const seed = this.rzSeedOpts(),
      src = raw && "object" === typeof raw && !Array.isArray(raw) ? raw : {},
      named = (x) => x && "string" === typeof x.n && x.n.trim(),
      o = {};
    this.RZ_KEYS.forEach((k) => {
      const kept = Array.isArray(src[k]) ? src[k].filter(named) : [],
        list = (kept.length ? kept : seed[k]).map((x) => ({ n: x.n, c: x.c || this.RZ_PAL[0] }));
      this.RZ_LOCK[k].forEach((n) => list.some((x) => x.n === n) || list.push({ n: n, c: this.RZ_PAL[list.length % this.RZ_PAL.length] }));
      o[k] = list;
    });
    o.spot = Array.isArray(src.spot) ? src.spot.filter(named).map((x) => ({ n: x.n, z: x.z || "", g: x.g || "" })) : seed.spot;
    return o;
  }
  _rzGet(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch (e) {
      return null;
    }
  }
  _rzPut(key, value, what) {
    if (!this._irCanWrite()) return void this.permDeny(), !1;
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return !0;
    } catch (e) {
      this.bsToast("تعذّر حفظ " + what + " — " + ((e && e.message) || "خطأ في التخزين"));
      return !1;
    }
  }
  loadRzOpts() {
    return this.rzNormOpts(this._rzGet(this.RZ_K_OPT));
  }
  saveRzOpts(o) {
    return this._rzPut(this.RZ_K_OPT, o, "القائمة");
  }
  loadRasd() {
    const d = this._rzGet(this.RZ_K_REC);
    return d && Array.isArray(d.reports) ? d : { reports: [] };
  }
  saveRasd(d) {
    return this._rzPut(this.RZ_K_REC, d, "السجل");
  }

  /* ═══ منطقٌ صافٍ (يُختبر وحده) ═══ */
  rzLocked(k, n) {
    return (this.RZ_LOCK[k] || []).indexOf(n) >= 0;
  }
  /* «أخرى: نصٌّ حرّ» تُحسب في المؤشرات «أخرى» */
  rzBase(v) {
    const s = String(v || "");
    return /^أخرى:/.test(s) ? this.RZ_OTHER : s;
  }
  rzHM(dt) {
    const p = (n) => (n < 10 ? "0" : "") + n;
    return p(dt.getHours()) + ":" + p(dt.getMinutes());
  }
  /* إضافةُ قيمة: قبل «أخرى» إن وُجدت · لونٌ من اللوحة · الموقعُ يُضاف إلى المنطقة المختارة */
  rzListAdd(opts, k, name, zone) {
    const v = String(name || "").trim().slice(0, 40);
    if (!v) return { err: "اكتب الاسم أولاً" };
    const list = opts[k] || [];
    if (list.some((x) => x.n === v)) return { err: "«" + v + "» موجود في القائمة" };
    const o = { ...opts, [k]: list.slice() };
    if ("spot" === k) {
      if (!zone || zone === this.RZ_OTHER) return { err: "اختر المنطقة أولاً لإضافة موقع" };
      o.spot.push({ n: v, z: zone, g: "مضاف" });
      return { opts: o, v: v };
    }
    const item = { n: v, c: this.RZ_PAL[o[k].length % this.RZ_PAL.length] },
      at = o[k].findIndex((x) => x.n === this.RZ_OTHER);
    at >= 0 ? o[k].splice(at, 0, item) : o[k].push(item);
    return { opts: o, v: v };
  }
  /* تعديلُ الاسم يسري على السجلات المسجّلة به (فتتبعه المؤشرات) · ومواقعُ المنطقة تتبع اسمَها */
  rzListRename(opts, reports, k, from, to) {
    const v = String(to || "").trim().slice(0, 40);
    if (!v) return { err: "اكتب الاسم أولاً" };
    if ("spot" !== k && this.rzLocked(k, from)) return { err: "«" + from + "» قيمةٌ أساسية يعتمد عليها النظام — لا تُعدَّل" };
    const list = opts[k] || [];
    if (!list.some((x) => x.n === from)) return { err: "«" + from + "» لم يعد في القائمة" };
    if (v !== from && list.some((x) => x.n === v)) return { err: "«" + v + "» موجود في القائمة" };
    const o = { ...opts, [k]: list.map((x) => (x.n === from ? { ...x, n: v } : x)) };
    if ("zone" === k) o.spot = (opts.spot || []).map((s) => (s.z === from ? { ...s, z: v } : s));
    let n = 0;
    const r = (reports || []).map((x) => (x && x[k] === from ? (n++, { ...x, [k]: v }) : x));
    return { opts: o, reports: r, n: n, v: v };
  }
  /* الحذفُ من القائمة وحدها — الحالاتُ المسجّلة تبقى بنصّها */
  rzListDel(opts, k, name) {
    if ("spot" !== k && this.rzLocked(k, name)) return { err: "«" + name + "» قيمةٌ أساسية — لا تُحذف" };
    const list = opts[k] || [];
    if (!list.some((x) => x.n === name)) return { err: "«" + name + "» لم يعد في القائمة" };
    return { opts: { ...opts, [k]: list.filter((x) => x.n !== name) } };
  }
  /* التحقّق: أخطاءٌ لكل حقل، أو حقولُ السجل الجاهزة. الجهةُ لا تُطلب إلا مع «إبلاغ جهة مختصة» وإلا سُجّلت «لم يتم الإبلاغ» */
  rzValidate(dr, ctx) {
    const d = dr || {},
      O = this.RZ_OTHER,
      E = {},
      pick = (k) => {
        if (d[k] !== O) return d[k] || "";
        const tx = String(d[k + "Tx"] || "").trim();
        return tx ? O + ": " + tx.slice(0, 60) : "";
      },
      r = { zone: pick("zone"), floor: d.floor || "", spot: d.spot || "", type: pick("type"), act: pick("act"), party: d.act === this.RZ_REPORT ? pick("party") : this.RZ_NOPARTY, impact: d.impact || "" },
      need = { zone: "اختر المنطقة", floor: "اختر المستوى", spot: "اختر موقعاً من القائمة", type: "اختر نوع الحالة", act: "اختر الإجراء", party: "اختر الجهة", impact: "حدّد مستوى التأثير" };
    Object.keys(need).forEach((k) => {
      if (!r[k]) E[k] = d[k] === O ? "اكتب التفاصيل" : need[k];
    });
    if (r.impact && this.RZ_IMPACTS.indexOf(r.impact) < 0) E.impact = need.impact;
    const t = String(d.t || (ctx && ctx.nowHM) || "");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) E.t = "وقت الوقوع غير صالح";
    else if (ctx && ctx.isToday && ctx.nowHM && t > ctx.nowHM) E.t = "وقت الوقوع لا يكون بعد الآن";
    r.t = t;
    r.notes = String(d.notes || "").trim().slice(0, 500);
    return { ok: !Object.keys(E).length, errs: E, rec: r };
  }
  /* أعلى max قيمٍ في حقلٍ ثم «غيرها» */
  rzTop(reports, k, max, colOf) {
    const m = {};
    reports.forEach((r) => {
      const v = this.rzBase(r[k]) || "—";
      m[v] = (m[v] || 0) + 1;
    });
    const all = Object.keys(m)
        .map((n) => ({ label: n, n: m[n] }))
        .sort((a, b) => b.n - a.n || (a.label < b.label ? -1 : 1)),
      out = all.slice(0, max).map((x, i) => ({ ...x, color: colOf(x.label, i) })),
      rest = all.slice(max).reduce((s, x) => s + x.n, 0);
    rest && out.push({ label: "غيرها", n: rest, color: "var(--fg-x94a3b8)" });
    return out;
  }
  /* مؤشراتُ الشهر الأربعة: التأثير · النوع · الإجراء · الإبلاغ */
  rzKpis(reports, opts) {
    const R = reports || [],
      T = R.length,
      O = opts || this.rzNormOpts(null),
      CH = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"],
      colOf = (k) => (n, i) => {
        if (n === this.RZ_NOPARTY) return "var(--fg-x94a3b8)";
        const it = (O[k] || []).find((x) => x.n === n);
        return it ? it.c : CH[i % CH.length];
      },
      count = (f) => R.filter(f).length,
      imp = this.RZ_IMPACTS.map((v) => ({ label: v, color: this.RZ_IMP_COL[v], n: count((r) => r.impact === v) })),
      /* شهرٌ بلا حالات: الكروتُ ظاهرةٌ بأصفار — أوّلُ أربعِ قيمٍ معتمدة بصفر */
      top = (k) => {
        const L = this.rzTop(R, k, 4, colOf(k));
        if (L.length) return L;
        return (O[k] || [])
          .filter((x) => x && x.n !== this.RZ_NOPARTY && x.n !== this.RZ_NOACT)
          .slice(0, 4)
          .map((x, i) => ({ label: x.n, color: x.c || CH[i % CH.length], n: 0 }));
      },
      type = top("type");
    return {
      total: T,
      hot: imp[2].n + imp[3].n,
      acted: T - count((r) => r.act === this.RZ_NOACT),
      reported: count((r) => r.party && r.party !== this.RZ_NOPARTY),
      topType: T && type.length ? type[0] : null,
      impact: imp,
      type: type,
      act: top("act"),
      party: top("party"),
    };
  }
  rzDateCells(r) {
    const p = (n) => (n < 10 ? "0" : "") + n;
    /* V7 · 53 تقويم (ق1 · §7): الحالةُ بيومها الميلادي (greg) والهجريُّ المقابل محسوبٌ للعرض (hij) — لا يُخزَّن */
    let h = "—";
    try {
      const x = KIVO.BassamCal.hOf(KIVO.BassamCal.gKey(r.y, r.m, r.d));
      x && (h = x.y + "/" + p(x.m) + "/" + p(x.d));
    } catch (e) {
      h = "—";
    }
    return { hij: h, greg: r.y + "/" + p(r.m) + "/" + p(r.d) };
  }
  rzSearchHit(q, r) {
    if (!q) return !0;
    const f = [r.spot, r.type, r.act, r.zone, r.byName, r.party, r.notes, r.floor, r.dept];
    try {
      if (KIVO.BassamFind && KIVO.BassamFind.match) return !!KIVO.BassamFind.match(q, f);
    } catch (e) {
      /* البحثُ الموحّد غيرُ متاح — المطابقةُ النصّية أدناه */
    }
    return f.some((x) => String(x == null ? "" : x).toLowerCase().indexOf(q) >= 0);
  }
  _rzSpotOk(opts, zone, spot) {
    const s = (opts.spot || []).find((i) => i.n === spot);
    return !zone || zone === this.RZ_OTHER || !s || s.z === zone;
  }

  /* ═══ الصلاحيات: ورقتا rasd/dash · rasd/records بأفعال المنصة (view · add · edit · del · approve · export) ═══ */
  PC(a) {
    try {
      return !!KIVO.BassamPerm && KIVO.BassamPerm.can("rasd", a || "view");
    } catch (e) {
      return !1;
    }
  }
  permDeny() {
    try {
      this.bsToast("صلاحيتك على نظام رصد الحالات لا تشمل هذا الإجراء — راجع مدير الإدارة");
    } catch (e) {
      /* لا توستَ قبل التركيب */
    }
  }
  bsMenusPatch() {
    /* قوائمُ النموذج (rzDd) تُغلق بطبقتها الشفافة لا هنا: حقلُ الموقع يفتح قائمته بالنقر قبل أن يُحسب «خارجها» */
    return { rowMenu: null, rzLgFilesOpen: !1, rzLgFddOpen: null };
  }
  rzActorKey() {
    try {
      const u = KIVO.BassamAuth && KIVO.BassamAuth.user ? KIVO.BassamAuth.user() : null;
      return (u && (u.id || u.ekey || u.un)) || "";
    } catch (e) {
      return "";
    }
  }
  rzDeptName() {
    try {
      return (KIVO.BassamDepts && KIVO.BassamDepts.activeName && KIVO.BassamDepts.activeName()) || "";
    } catch (e) {
      return "";
    }
  }
  /* تنبيهُ «ممنوعات»: قطعُها تُسجَّل في نظام المضبوطات — عبر الناقل وحده (seized.usable@1)؛ غيابُه أو إطفاؤه ⇒ لا تنبيه ولا رابط */
  rzSeizedOn() {
    try {
      return !0 === KIVO.bus.read("seized.usable@1");
    } catch (e) {
      return !1;
    }
  }
  emptyDraft() {
    return { zone: "", zoneTx: "", floor: "", spot: "", spotQ: "", type: "", typeTx: "", act: "", actTx: "", party: "", partyTx: "", impact: "", notes: "", t: "", att: null };
  }
  state = (() => {
    const t = KIVO.BassamCal.gToday();
    return {
      rowMenu: null,
      rzTab: "records",
      rzYear: t.y,
      rzMonth: t.m,
      rzDay: t.d,
      rzRetro: null,
      rzDraft: this.emptyDraft(),
      rzErr: {},
      rzSaveErrMsg: "",
      rzDd: null,
      rzDdEdit: "",
      rzDdEditVal: "",
      rzDdDel: "",
      rzDdNew: "",
      rzDdErr: "",
      rzLedgerOpen: !0,
      rzLedgerPage: 1,
      rzLedgerPerPage: 10,
      rzLgSearch: "",
      rzLgFilesOpen: !1,
      rzLgFddOpen: null,
      rzLgType: "all",
      rzLgImp: "all",
      rzLgScope: "month",
      rzSortK: "date",
      rzSortD: -1,
      rzDelAsk: null,
      rzImgView: null,
      rzImgTick: 0,
    };
  })();

  /* ═══ العنوان #/rasd/records — نسخةُ «مؤشرات الإدارة» (solo) لا تشارك ═══ */
  _bsHT(t) {
    try {
      if (this.props && this.props.solo) return;
      const h = String(location.hash || ""),
        p = "#/rasd";
      if (h.indexOf(p) !== 0) return;
      const w = t ? p + "/" + t : p;
      h !== w && history.replaceState && history.replaceState(null, "", location.pathname + location.search + w);
    } catch (e) {
      /* لا يمنع العرض */
    }
  }
  _bsHR() {
    try {
      if (this.props && this.props.solo) return "";
      const o = KIVO.__BS_OPEN_TAB;
      if (!o || o.page !== "rasd") return "";
      KIVO.__BS_OPEN_TAB = null;
      if ("records" !== o.tab && "dash" !== o.tab) return (this._bsHT(""), "");
      return o.tab;
    } catch (e) {
      return "";
    }
  }
  renderVals() {
    const q = this._bsHR(),
      pv = this._irPermVals(),
      sub = (t) => {
        try {
          return !KIVO.BassamPerm || !KIVO.BassamPerm.subOn || KIVO.BassamPerm.subOn("rasd", t);
        } catch (e) {
          return !0;
        }
      },
      solo = !(!this.props || "dash" !== this.props.solo),
      dOk = solo && sub("dash"),
      rOk = sub("records");
    /* الصفحةُ تعرض السجلات، و«مؤشرات الإدارة» تعرض اللوحة (solo) — لا تبويبَ للوحة داخل الصفحة */
    let h = solo ? "dash" : "records";
    "records" === h && !rOk && dOk && (h = "dash");
    q && q !== h && this._bsHT(h);
    const onDash = "dash" === h && dOk,
      onRec = "records" === h && rOk,
      link = !!(rOk && this.PC("view")),
      c = { rzOnDash: onDash, rzOnRecords: onRec, irRecLinkOn: link, irRecLinkOff: !link, ...pv };
    onRec && (this._rzEnsureRetro(), Object.assign(c, this._rzCalVals()));
    onDash && Object.assign(c, this._rzDashVals());
    return c;
  }

  /* ═══ لوحةُ المؤشرات — بنيةُ لوحة مؤشرات المضبوطات قسماً بقسم: الوحدةُ «حالة» · ثلاثةُ مقاييس (عالية/حرجة · اتُّخذ فيها إجراء ·
     أُبلغت فيها جهة مختصة) · التوزيعُ بمستوى التأثير · الأنواع والمناطق · الراصدون · الملخّصُ بالمنطقة. أسماءُ القيم irDash* هي أسماءُ
     لوحة المضبوطات نفسُها فتشترك معها في أجساد الأيقونات المولَّدة (المنحنى · العدّاد · الاتجاه). ═══ */
  _rzDashVals() {
    const t = this.state,
      e = KIVO.BassamCal.gToday(),
      S = this.loadRasd().reports || [],
      O = this.loadRzOpts(),
      DAY = 864e5,
      MN = KIVO.BassamCal.G_MONTHS,
      GM = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
      pc = (x) => (KIVO.bsPct ? KIVO.bsPct(x) : String(Math.round(x || 0))),
      n = (x) => Math.round(x || 0).toLocaleString("en-US"),
      ar = (x) => n(x).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[+d]),
      fx = (x) => ((x = x || 0), x > 0 && x < 10 && Math.round(x) !== x ? x.toFixed(1) : n(x)),
      days = (x) => (1 === x ? "يوم واحد" : 2 === x ? "يومين" : x >= 3 && x <= 10 ? x + " أيام" : KIVO.BassamCount(x, "يوم") + ""),
      hp = (ts) => this.gParts(new Date(ts)),
      d0 = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime(),
      pIso = (v) => {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || "");
        return m ? new Date(+m[1], +m[2] - 1, +m[3]).getTime() : null;
      },
      iso = (ts) => {
        const x = new Date(ts),
          p = (k) => (k < 10 ? "0" + k : "" + k);
        return x.getFullYear() + "-" + p(x.getMonth() + 1) + "-" + p(x.getDate());
      },
      hLbl = (p) => p.d + " " + MN[p.m - 1] + " " + p.y,
      kD = (r) => 1e4 * r.y + 100 * r.m + r.d,
      kM = (r) => 100 * r.y + r.m,
      one = () => 1,
      MET = [
        { name: "عالية/حرجة", desc: "عدد الحالات ذات التأثير العالي أو الحرج", f: (r) => ("عالٍ" === r.impact || "حرج" === r.impact ? 1 : 0), color: "var(--danger)" },
        { name: "اتُّخذ فيها إجراء", desc: "عدد الحالات التي اتُّخذ فيها إجراء", f: (r) => (r.act && r.act !== this.RZ_NOACT ? 1 : 0), color: "var(--success)" },
        { name: "أُبلغت فيها جهة مختصة", desc: "عدد الحالات التي أُبلغت فيها جهةٌ مختصة", f: (r) => (r.party && r.party !== this.RZ_NOPARTY ? 1 : 0), color: "var(--fg-x2a78d6)" },
      ],
      yrs = {},
      ym = {};
    S.forEach((r) => r.y && ((yrs[r.y] = 1), (ym[r.y + "-" + r.m] = 1)));
    let Ys = Object.keys(yrs)
      .map(Number)
      .sort((a, b) => b - a);
    Ys.length || (Ys = [e.y]);
    const allY = null == t.irDashYear || "all" === String(t.irDashYear);
    let Y = allY ? Ys[0] : +t.irDashYear;
    Ys.indexOf(Y) < 0 && (Y = Ys[0]);
    const Ms = [];
    for (let m = 1; m <= 12; m++) ym[Y + "-" + m] && Ms.push(m);
    let M = allY ? "all" : null == t.irDashMonth ? "" : String(t.irDashMonth);
    !allY && "all" !== M && Ms.indexOf(+M) < 0 && (M = Ms.length ? String(Ms[Ms.length - 1]) : "all");
    const mDays = (y, m) => KIVO.BassamCal.gMonthDays(y, m),
      elapsed = (y, m) => (y > e.y ? 0 : y < e.y || m < e.m ? mDays(y, m) : m === e.m ? e.d : 0),
      mode = "custom" === t.irDashMode ? "custom" : allY ? "all" : "month",
      today = d0(this.gDate(e.y, e.m, e.d));
    let A = pIso(t.irDashFrom),
      B = pIso(t.irDashTo);
    if ("custom" === mode) {
      null == A && (A = today - 29 * DAY);
      null == B && (B = today);
      A > B && ([A, B] = [B, A]);
    }
    let cur = [],
      prev = [],
      X = [],
      daily = !0,
      perLbl = "",
      prevLbl = "",
      H = 0,
      heatY = Y;
    const monthAxis = (keys) => keys.map((k) => ({ k: k, lab: MN[(k % 100) - 1], full: MN[(k % 100) - 1] + " " + Math.floor(k / 100) }));
    if ("all" === mode) {
      cur = S.slice();
      daily = !1;
      const mm = {};
      S.forEach((r) => (mm[kM(r)] = 1));
      X = monthAxis(Object.keys(mm).map(Number).sort((a, b) => a - b));
      perLbl = "كل الفترة";
      let lo = null;
      S.forEach((r) => {
        const k = kD(r);
        (null == lo || k < lo) && (lo = k);
      });
      if (null != lo)
        try {
          H = Math.round((today - d0(this.gDate(Math.floor(lo / 1e4), Math.floor(lo / 100) % 100, lo % 100))) / DAY) + 1;
        } catch (er) {
          H = 30 * X.length;
        }
      heatY = Ys[0];
    } else if ("custom" === mode) {
      const ka = kD(hp(A)),
        kb = kD(hp(B));
      cur = S.filter((r) => kD(r) >= ka && kD(r) <= kb);
      H = Math.round((B - A) / DAY) + 1;
      daily = H <= 62;
      if (daily)
        for (let ts = A; ts <= B; ts += DAY) {
          const p = hp(ts);
          X.push({ k: kD(p), lab: String(p.d), full: hLbl(p) });
        }
      else {
        const mm = {};
        for (let ts = A; ts <= B; ts += DAY) mm[kM(hp(ts))] = 1;
        X = monthAxis(Object.keys(mm).map(Number).sort((a, b) => a - b));
      }
      perLbl = hLbl(hp(A)) + " ← " + hLbl(hp(B));
      const q0 = hp(A - H * DAY),
        q1 = hp(A - DAY);
      prev = S.filter((r) => kD(r) >= kD(q0) && kD(r) <= kD(q1));
      prevLbl = hLbl(q0) + " ← " + hLbl(q1);
      heatY = e.y;
    } else if ("all" === M) {
      cur = S.filter((r) => r.y === Y);
      daily = !1;
      for (let m = 1; m <= 12; m++) elapsed(Y, m) > 0 && X.push({ k: 100 * Y + m, lab: MN[m - 1], full: MN[m - 1] + " " + Y });
      H = X.reduce((s, x) => s + elapsed(Y, x.k % 100), 0);
      perLbl = "كل أشهر " + Y;
      const isCur = Y === e.y;
      let pr = yrs[Y - 1] ? S.filter((r) => r.y === Y - 1) : [];
      isCur && (pr = pr.filter((r) => r.m < e.m || (r.m === e.m && r.d <= e.d)));
      prev = pr;
      prevLbl = isCur ? "نفس الفترة من " + (Y - 1) : "سنة " + (Y - 1);
    } else {
      const mo = +M,
        nd = elapsed(Y, mo) || mDays(Y, mo);
      cur = S.filter((r) => r.y === Y && r.m === mo);
      for (let d = 1; d <= nd; d++) X.push({ k: 1e4 * Y + 100 * mo + d, lab: String(d), full: d + " " + MN[mo - 1] + " " + Y });
      H = nd;
      perLbl = MN[mo - 1] + " " + Y;
      let py = Y,
        pm = mo - 1;
      pm < 1 && ((pm = 12), (py = Y - 1));
      const isCur = Y === e.y && mo === e.m;
      let pr = ym[py + "-" + pm] ? S.filter((r) => r.y === py && r.m === pm) : [];
      isCur && (pr = pr.filter((r) => r.d <= e.d));
      prev = pr;
      prevLbl = isCur ? "أول " + days(e.d) + " من " + MN[pm - 1] + " " + py : MN[pm - 1] + " " + py;
    }
    const G = prev.length > 0 && "all" !== mode;
    "all" === mode && (prevLbl = "");
    const p2 = (k) => (k < 10 ? "0" + k : "" + k),
      kNum = (k) => (daily ? Math.floor(k / 1e4) + "-" + p2(Math.floor(k / 100) % 100) + "-" + p2(k % 100) : Math.floor(k / 100) + "-" + p2(k % 100)),
      KEY = daily ? kD : kM,
      series = (rs, f) => {
        const b = {};
        rs.forEach((r) => (b[KEY(r)] = (b[KEY(r)] || 0) + f(r)));
        return X.map((x) => b[x.k] || 0);
      },
      stat = (f) => {
        const ser = series(cur, f),
          tot = ser.reduce((a, v) => a + v, 0);
        let mn = 0,
          mx = 0,
          act = 0,
          iMx = -1,
          iMn = -1;
        ser.forEach((v, i) => {
          if (!(v > 0)) return;
          act++;
          (0 === mx || v > mx) && ((mx = v), (iMx = i));
          (0 === mn || v < mn) && ((mn = v), (iMn = i));
        });
        const at = (i) => (i >= 0 ? X[i] : null);
        return {
          ser: ser,
          tot: tot,
          min: mn,
          max: mx,
          avg: act ? tot / act : 0,
          act: act,
          gap: ser.length - act,
          peakShort: at(iMx) ? at(iMx).full.replace(/ هـ$/, "") : "—",
          lowShort: at(iMn) ? at(iMn).full.replace(/ هـ$/, "") : "—",
          peakNum: at(iMx) ? kNum(at(iMx).k) : "—",
          lowNum: at(iMn) ? kNum(at(iMn).k) : "—",
        };
      },
      W = stat(one),
      MS = MET.map((m, i) => ({ m: m, st: stat(m.f), i1: 0 === i, i2: 1 === i, i3: 2 === i, i4: !1 })),
      T = W.tot,
      Tp = prev.length,
      unit = daily ? "يوم" : "شهر",
      path = (ser, w, h, top) => {
        const L = ser.length;
        if (!L) return { line: "", area: "" };
        const mx = top || Math.max.apply(null, ser.concat([1])),
          xo = (i) => (1 === L ? w / 2 : w - (i / (L - 1)) * w);
        let ln = "";
        ser.forEach((v, i) => (ln += (i ? "L" : "M") + xo(i).toFixed(1) + " " + (h - (mx > 0 ? (v / mx) * h : 0)).toFixed(1) + " "));
        return { line: ln, area: "M" + xo(0).toFixed(1) + " " + h + " " + ln.replace(/^M/, "L") + "L" + xo(L - 1).toFixed(1) + " " + h + " Z" };
      },
      hero = path(W.ser, 1e3, 100),
      brk = t.irDashBrk || "total",
      PAL = this.RZ_PAL,
      zoneCol = (z, i) => {
        const it = (O.zone || []).find((x) => x && x.n === z);
        return (it && it.c) || PAL[i % PAL.length];
      };
    let layers = [];
    if ("imp" === brk)
      layers = this.RZ_IMPACTS.map((v) => ({ name: v, color: this.RZ_IMP_COL[v], ser: series(cur.filter((r) => r.impact === v), one) })).filter((l) => l.ser.some((v) => v > 0));
    else if ("zone" === brk) {
      const zc = {};
      cur.forEach((r) => r.zone && (zc[r.zone] = (zc[r.zone] || 0) + 1));
      layers = Object.keys(zc)
        .sort((a, b) => zc[b] - zc[a])
        .slice(0, 6)
        .map((z, i) => ({ name: z, color: zoneCol(z, i), ser: series(cur.filter((r) => r.zone === z), one) }));
    }
    const stacked = "total" !== brk && layers.length > 0,
      main = stacked ? X.map((x, i) => layers.reduce((a, l) => a + l.ser[i], 0)) : W.ser;
    let ghost = null;
    if (G && !stacked) {
      const b = {};
      prev.forEach((r) => (b[KEY(r)] = (b[KEY(r)] || 0) + 1));
      const pv = Object.keys(b)
        .map(Number)
        .sort((a, c) => a - c)
        .map((k) => b[k]);
      const g = X.map((x, i) => (null == pv[i] ? 0 : pv[i]));
      pv.length && g.some((v) => v > 0) && (ghost = g);
    }
    const nice = (v) => {
        if (!(v > 0)) return 10;
        const p = Math.pow(10, Math.floor(Math.log10(v))),
          r = v / p,
          st = [1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10];
        for (let i = 0; i < st.length; i++) if (r <= st[i]) return Math.max(4, st[i] * p);
        return 10 * p;
      },
      top = nice(Math.max.apply(null, [1].concat(main).concat(ghost || []))),
      mainP = path(main, 1e3, 100, top),
      ghostP = ghost ? path(ghost, 1e3, 100, top) : null,
      stackP = [];
    if (stacked) {
      const acc = X.map(() => 0),
        L = X.length,
        xo = (i) => (1 === L ? 500 : 1e3 - (i / (L - 1)) * 1e3),
        yo = (v) => 100 - (v / top) * 100;
      layers.forEach((l) => {
        const hi = l.ser.map((v, i) => acc[i] + v),
          lo = acc.slice();
        let d = "M" + xo(0).toFixed(1) + " " + yo(hi[0]).toFixed(1) + " ";
        for (let i = 1; i < L; i++) d += "L" + xo(i).toFixed(1) + " " + yo(hi[i]).toFixed(1) + " ";
        for (let i = L - 1; i >= 0; i--) d += "L" + xo(i).toFixed(1) + " " + yo(lo[i]).toFixed(1) + " ";
        stackP.push({ d: d + "Z", fill: l.color });
        l.ser.forEach((v, i) => (acc[i] += v));
      });
    }
    const grid = [];
    for (let i = 4; i >= 0; i--) {
      const y = 100 * (1 - i / 4);
      grid.push({
        lab: fx((top * i) / 4),
        lineStyle: "position:absolute;right:0;left:0;top:" + y.toFixed(2) + "%;border-top:1px solid " + (0 === i ? "var(--bd-xd9dee4)" : "var(--bd-xeff1f4)"),
        labStyle: "position:absolute;left:-52px;top:" + y.toFixed(2) + "%;transform:translateY(-50%);font-size:10px;font-weight:400;color:var(--fg-x94a3b8);direction:ltr;width:46px;text-align:left",
      });
    }
    const NX = X.length,
      stepX = Math.max(1, Math.ceil(NX / 9)),
      xLabs = X.map((x, i) => ({ show: i % stepX === 0 || i === NX - 1, lab: x.lab })),
      hits = X.map((x, i) => {
        let s = x.full + "  —  " + KIVO.BassamCount(n(main[i]), "حالة");
        ghost && (s += "  ·  السابق: " + n(ghost[i]));
        stacked && layers.forEach((l) => l.ser[i] && (s += "\n" + l.name + ": " + n(l.ser[i])));
        return { tip: s };
      });
    /* خريطةُ النشاط اليومي — السنةُ كاملة بتدرّج رموز الذهب */
    const SH = [
        "var(--bg-xeff1f4)",
        "color-mix(in srgb,var(--bg-xb99751) 22%,var(--bg-xffffff))",
        "color-mix(in srgb,var(--bg-xb99751) 45%,var(--bg-xffffff))",
        "color-mix(in srgb,var(--bg-xb99751) 72%,var(--bg-xffffff))",
        "var(--bg-xb99751)",
        "var(--bg-x8a6f35)",
      ],
      heatCols = [],
      heatMos = [];
    let heatAct = 0;
    try {
      const t0 = d0(this.gDate(heatY, 1, 1)),
        cells = [];
      let o = 0;
      for (let m = 1; m <= 12; m++) {
        const nd = mDays(heatY, m),
          el = elapsed(heatY, m);
        for (let d = 1; d <= nd; d++, o++) d <= el && cells.push({ m: m, d: d, ts: t0 + o * DAY });
      }
      if (cells.length) {
        const cnt = {};
        S.filter((r) => r.y === heatY).forEach((r) => (cnt[r.m + "-" + r.d] = (cnt[r.m + "-" + r.d] || 0) + 1));
        const vals = Object.keys(cnt)
          .map((k) => cnt[k])
          .filter((v) => v > 0)
          .sort((a, b) => a - b);
        heatAct = vals.length;
        const q = (p) => (vals.length ? vals[Math.min(vals.length - 1, Math.floor(vals.length * p))] : 1),
          cut = [q(0.2), q(0.4), q(0.6), q(0.85)],
          lvl = (v) => (v ? (v <= cut[0] ? 1 : v <= cut[1] ? 2 : v <= cut[2] ? 3 : v <= cut[3] ? 4 : 5) : 0),
          at = {};
        cells.forEach((c) => (at[c.ts] = c));
        const first = cells[0].ts,
          last = cells[cells.length - 1].ts,
          start = first - ((new Date(first).getDay() + 1) % 7) * DAY,
          weeks = Math.max(1, Math.floor((last - start) / DAY / 7) + 1);
        let lastM = -1,
          lastW = -9;
        for (let w = 0; w < weeks; w++) {
          const col = [];
          let mo = -1;
          for (let k = 0; k < 7; k++) {
            const ts = start + (7 * w + k) * DAY,
              c = at[ts];
            if (!c) {
              col.push({ style: "width:15px;height:15px;border-radius:3px;background:transparent", tip: "" });
              continue;
            }
            mo < 0 && (mo = c.m);
            const v = cnt[c.m + "-" + c.d] || 0,
              g = new Date(ts);
            col.push({
              style: "width:15px;height:15px;border-radius:3px;background:" + SH[lvl(v)],
              tip: this.WEEKDAYS[g.getDay()] + " " + c.d + " " + MN[c.m - 1] + " " + heatY + (KIVO.BassamCal.hDayText(KIVO.BassamCal.gKey(heatY, c.m, c.d)) ? " · " + KIVO.BassamCal.hDayText(KIVO.BassamCal.gKey(heatY, c.m, c.d)) + " هـ" : "") + " — " + KIVO.BassamCount(n(v), "حالة"),   /* V7 · 53 تقويم: الشبكةُ سنةٌ ميلادية — الهجريُّ المقابل بعدها */
            });
          }
          heatCols.push({ cells: col });
          const show = mo > 0 && mo !== lastM && w - lastW >= 3;
          show && (lastW = w);
          mo > 0 && (lastM = mo);
          heatMos.push({ show: show, lab: mo > 0 ? MN[mo - 1] : "" });
        }
      }
    } catch (er) {
      heatCols.length = 0;
    }
    const heatScale = SH.map((c) => ({ style: "width:11px;height:11px;border-radius:3px;display:inline-block;background:" + c })),
      pill = (up, flat) =>
        "display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;border-radius:9999px;padding:2px 6px;" +
        (flat ? "color:var(--fg-x94a3b8);background:var(--bg-a1481631840p14)" : up ? "color:var(--fg-x006300);background:var(--bg-a09900p09)" : "color:var(--fg-xd03b3b);background:var(--bg-a20859590p09)"),
      delta = (v, p) => {
        if (!G || !p) return { txt: "—", style: pill(!0, !0) };
        const x = ((v - p) / p) * 100,
          fl = Math.abs(x) < 0.5;
        return { txt: (fl ? "◆ " : x >= 0 ? "▲ " : "▼ ") + pc(Math.abs(x)) + "%", style: pill(x >= 0, fl) };
      },
      group = (list, max, otherName) => {
        if (list.length <= max) return list;
        const rest = list.slice(max - 1);
        return list.slice(0, max - 1).concat([{ name: otherName(rest.length), v: rest.reduce((a, x) => a + x.v, 0), p: rest.reduce((a, x) => a + (x.p || 0), 0), other: !0 }]);
      },
      dotBar = (x, col, max) => ({
        dot: "width:9px;height:9px;border-radius:3px;flex-shrink:0;background:" + (x.other ? "var(--bg-xc9cfd6)" : col),
        bar: "height:100%;border-radius:9999px;width:" + ((x.v / max) * 100).toFixed(2) + "%;background:" + (x.other ? "var(--bg-xc9cfd6)" : col),
      });
    /* الحالات حسب النوع */
    const tc = {};
    cur.forEach((r) => {
      const k = r.type || "غير محدد";
      tc[k] = (tc[k] || 0) + 1;
    });
    const types = group(
        Object.keys(tc)
          .map((k, i) => {
            const it = (O.type || []).find((x) => x && x.n === k);
            return { name: k, v: tc[k], c: (it && it.c) || PAL[i % PAL.length] };
          })
          .sort((a, b) => b.v - a.v),
        7,
        (k) => "أنواع أخرى (" + k + ")",
      ),
      typeMax = Math.max.apply(null, [1].concat(types.map((x) => x.v))),
      typeRows = types.map((x) => ({ name: x.name, val: n(x.v), pct: (T ? pc((x.v / T) * 100) : "0") + "%", ...dotBar(x, x.c, typeMax) }));
    /* الحالات حسب المنطقة — مع التغيّر مقابل الفترة السابقة */
    const zc = {},
      zp = {};
    cur.forEach((r) => r.zone && (zc[r.zone] = (zc[r.zone] || 0) + 1));
    prev.forEach((r) => r.zone && (zp[r.zone] = (zp[r.zone] || 0) + 1));
    const zones = group(
        Object.keys(zc)
          .map((k) => ({ name: k, v: zc[k], p: zp[k] || 0 }))
          .sort((a, b) => b.v - a.v),
        7,
        (k) => "مناطق أخرى (" + k + ")",
      ),
      zoneMax = Math.max.apply(null, [1].concat(zones.map((x) => x.v))),
      zoneRows = zones.map((x) => {
        const dl = delta(x.v, x.p);
        return { name: x.name, val: n(x.v), pct: (T ? pc((x.v / T) * 100) : "0") + "%", dTxt: dl.txt, dStyle: dl.style, ...dotBar(x, "var(--bg-x8a6f35)", zoneMax) };
      });
    /* مستوى التأثير (مكانُ الورديات في لوحة المضبوطات) */
    const imp = this.RZ_IMPACTS.map((v) => ({ name: v, color: this.RZ_IMP_COL[v], v: cur.filter((r) => r.impact === v).length })),
      impTot = imp.reduce((a, x) => a + x.v, 0) || 1,
      cmpRows = [["إجمالي الحالات", T, Tp]].concat(MS.map((x) => [x.m.name, x.st.tot, prev.reduce((a, r) => a + x.m.f(r), 0)])).map((x) => {
        const dl = delta(x[1], x[2]);
        return { label: x[0], nums: n(x[2]) + " → " + n(x[1]), txt: dl.txt, style: dl.style };
      });
    /* أكثرُ الراصدين نشاطاً */
    const by = {},
      byP = {},
      byHot = {},
      byNm = {},
      whoOf = (r) => r.by || r.byName;
    cur.forEach((r) => {
      const k = whoOf(r);
      k && ((by[k] = (by[k] || 0) + 1), (byHot[k] = (byHot[k] || 0) + MET[0].f(r)), (byNm[k] = r.byName || k));
    });
    prev.forEach((r) => {
      const k = whoOf(r);
      k && (byP[k] = (byP[k] || 0) + 1);
    });
    const RANK = ["background:var(--bg-x8a6f35);color:var(--fg-xffffff)", "background:var(--bg-a185151810p3);color:var(--fg-x8a6f35)", "background:var(--bg-a185151810p16);color:var(--fg-x8a6f35)"],
      topR = Object.keys(by)
        .map((k) => ({ v: by[k], p: byP[k] || 0, hot: byHot[k] || 0, nm: byNm[k] || "—" }))
        .sort((a, b) => b.v - a.v)
        .slice(0, 6),
      topMax = Math.max.apply(null, [1].concat(topR.map((x) => x.v))),
      topRows = topR.map((x, i) => {
        const dl = delta(x.v, x.p);
        return {
          rank: String(i + 1),
          name: x.nm,
          sub: x.hot ? "منها " + KIVO.BassamCount(x.hot, "حالة") + " عالية/حرجة" : "لا حالات عالية أو حرجة",
          ben: n(x.v),
          dTxt: dl.txt,
          dStyle: dl.style,
          bar: "height:100%;border-radius:9999px;background:var(--bg-xb99751);width:" + ((x.v / topMax) * 100).toFixed(2) + "%",
          numStyle:
            "width:22px;height:22px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:10.5px;font-weight:700;flex-shrink:0;" +
            (RANK[i] || "background:var(--bg-xeff1f4);color:var(--fg-x53565a)"),
        };
      });
    /* الملخّصُ التفصيلي حسب المنطقة: المواقع · الراصدون · الحالات · المتوسط لكل يوم · المقاييس الثلاثة · الحصة */
    const Hd = Math.max(1, H),
      sumOf = (rs) => {
        const sp = {},
          em = {};
        rs.forEach((r) => (r.spot && (sp[r.spot] = 1), whoOf(r) && (em[whoOf(r)] = 1)));
        return {
          reports: n(Object.keys(sp).length),
          emps: n(Object.keys(em).length),
          ben: n(rs.length),
          avg: (rs.length / Hd).toFixed(1),
          trans: n(rs.reduce((a, r) => a + MET[0].f(r), 0)),
          bro: n(rs.reduce((a, r) => a + MET[1].f(r), 0)),
          ref: n(rs.reduce((a, r) => a + MET[2].f(r), 0)),
          share: (T ? pc((rs.length / T) * 100) : "0") + "%",
        };
      },
      sumAll = Object.keys(zc)
        .sort((a, b) => zc[b] - zc[a])
        .map((z, i) => {
          const rs = cur.filter((r) => r.zone === z),
            col = zoneCol(z, i);
          return {
            name: z,
            dot: "width:8px;height:8px;border-radius:3px;display:inline-block;margin-inline-end:7px;vertical-align:middle;background:" + col,
            shareBar: "display:block;height:100%;border-radius:9999px;background:" + col + ";width:" + (T ? ((rs.length / T) * 100).toFixed(2) : 0) + "%",
            ...sumOf(rs),
          };
        }),
      sq = (t.irDashSumQ || "").trim(),
      sumF = KIVO.BassamFind.filter(sq, sumAll.slice(), (x) => [x.name]),
      pg = this._rzPager(sumF.length, t.irDashSumPerPage, t.irDashSumPage, (k) => this.setState({ irDashSumPage: k })),
      inF = {};
    sumF.forEach((x) => (inF[x.name] = 1));
    const sumTot = { label: sq ? "إجمالي المعروض" : "الإجمالي", ...sumOf(cur.filter((r) => inF[r.zone])) },
      tick = [{ dot: "var(--bg-xb99751)", n: "الإجمالي", v: n(T), p: "" }]
        .concat(MS.map((x) => ({ dot: x.m.color, n: x.m.name, v: n(x.st.tot), p: T ? "(" + pc((x.st.tot / T) * 100) + "٪)" : "" })))
        .concat([
          { dot: "var(--bg-x7b8a94)", n: "الراصدون", v: n(Object.keys(by).length), p: "" },
          { dot: "var(--bg-x7b8a94)", n: "المتوسط لكل " + unit, v: fx(W.avg), p: "" },
          { dot: "var(--bg-x7b8a94)", n: "أعلى", v: n(W.max), p: W.peakNum },
        ])
        .map((x) => ({ dot: "width:7px;height:7px;border-radius:2px;flex-shrink:0;background:" + x.dot, n: x.n, v: x.v, p: x.p })),
      seg = (on) =>
        "border:0;font-family:'Cairo',sans-serif;font-size:11px;font-weight:600;padding:6px 12px;border-radius:8px;cursor:pointer;white-space:nowrap;" +
        (on ? "background:var(--bg-xffffff);color:var(--fg-x8a6f35);box-shadow:var(--shadow-card)" : "background:transparent;color:var(--fg-x94a3b8)"),
      heroD = delta(T, Tp),
      cu = "custom" === mode,
      actSub = (k) => (daily ? days(k) : KIVO.BassamCount(k, "شهر") + "");
    return {
      irEmptyShow: 0 === S.length,
      irDashYear: allY ? "all" : String(Y),
      irDashYearOpts: [{ v: "all", lbl: "كل السنوات" }].concat(Ys.map((y) => ({ v: String(y), lbl: y }))),
      irDashSetYear: (ev) => this.setState({ irDashYear: "all" === ev.target.value ? "all" : +ev.target.value, irDashMonth: null, irDashMode: null }),
      irDashMonth: M,
      irDashMonthOpts: allY ? [{ v: "all", lbl: "كل الأشهر" }] : Ms.map((m) => ({ v: String(m), lbl: MN[m - 1] + " (" + p2(m) + ")" })).concat([{ v: "all", lbl: "كل أشهر السنة" }]),
      irDashSetMonth: (ev) => this.setState({ irDashMonth: ev.target.value, irDashMode: null }),
      irDashYmBoxStyle:
        "display:flex;align-items:center;gap:7px;border:1px solid " + (cu ? "var(--bd-xe6e9ed)" : "var(--bd-a185151810p45)") + ";background:" + (cu ? "var(--bg-xf8f9fb)" : "var(--bg-a185151810p07)") +
        ";border-radius:12px;padding:4px 11px;flex-shrink:0;opacity:" + (cu ? ".55" : "1"),
      irDashModeOpts: [{ lbl: "نطاق مخصص", style: seg(cu), click: () => this.setState({ irDashMode: cu ? null : "custom", irDashFrom: t.irDashFrom || iso(today - 29 * DAY), irDashTo: t.irDashTo || iso(today) }) }],
      irDashCustomOn: cu,
      irDashFrom: cu ? iso(A) : "",
      irDashTo: cu ? iso(B) : "",
      irDashSetFrom: (ev) => this.setState({ irDashFrom: ev.target.value, irDashMode: "custom" }),
      irDashSetTo: (ev) => this.setState({ irDashTo: ev.target.value, irDashMode: "custom" }),
      irDashRangeHint: cu ? "= " + perLbl + " · " + days(H) : "",
      irDashPerLbl: perLbl,
      irDashTicker: tick.concat(tick),
      irDashPeriodTxt: "الفترة: " + perLbl + " · " + days(H) + " · " + KIVO.BassamCount(cur.length, "حالة") + (G ? " · تُقارَن بـ " + prevLbl : "all" === mode ? "" : " · لا توجد فترة سابقة للمقارنة"),
      irDashHeroLbl: "إجمالي الحالات المرصودة · " + perLbl,
      irDashHeroNum: ar(T),
      irDashMetsLine: MET.map((m) => m.name).join(" · "),
      irDashSparkHas: W.ser.length > 1,
      irDashHeroLine: hero.line,
      irDashHeroArea: hero.area,
      irDashHiVal: n(W.max),
      irDashHiSub: W.peakNum,
      irDashLoVal: n(W.min),
      irDashLoSub: W.lowNum,
      irDashAvgVal: fx(W.avg),
      irDashAvgSub: actSub(W.act),
      irDashGapOn: W.gap > 0,
      irDashGapVal: String(W.gap),
      irDashCmpChipOn: G,
      irDashCmpChipTxt: heroD.txt,
      irDashCmpChipStyle: heroD.style,
      irDashCmpChipPrev: n(Tp),
      irDashMets: MS.map((x) => {
        const p = T ? ((x.st.tot / T) * 100).toFixed(2) : 0;
        return {
          name: x.m.name,
          desc: x.m.desc,
          num: ar(x.st.tot),
          pct: "٪" + (T ? pc((x.st.tot / T) * 100) : "0"),
          ring:
            "width:50px;height:50px;border-radius:9999px;position:relative;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:conic-gradient(var(--bg-xb99751) 0% " +
            p + "%,var(--bg-a185151810p16) " + p + "% 100%)",
          i1: x.i1,
          i2: x.i2,
          i3: x.i3,
          i4: x.i4,
        };
      }),
      irDashGauges: MS.map((x) => {
        const s = x.st,
          f = s.max > s.min ? Math.max(0, Math.min(1, (s.avg - s.min) / (s.max - s.min))) : 0.5,
          a = Math.PI * f,
          pv = prev.reduce((acc, r) => acc + x.m.f(r), 0),
          dl = delta(s.tot, pv);
        return {
          name: x.m.name,
          desc: x.m.desc + " خلال الفترة",
          num: ar(s.tot),
          nx: (100 + 60.5 * Math.cos(a)).toFixed(1),
          ny: (87 - 60.5 * Math.sin(a)).toFixed(1),
          min: n(s.min),
          minDate: s.lowNum,
          minTip: "أدنى " + x.m.name + " — " + s.lowShort,
          avg: fx(s.avg),
          avgSub: actSub(s.act),
          max: n(s.max),
          maxDate: s.peakNum,
          maxTip: "ذروة " + x.m.name + " — " + s.peakShort,
          share: (T ? pc((s.tot / T) * 100) : "0") + "٪",
          dTxt: dl.txt,
          dStyle: dl.style,
          dTip: G ? x.m.name + " في " + prevLbl + ": " + n(pv) : "لا توجد فترة سابقة للمقارنة",
          spark: path(s.ser, 200, 40).area,
          i1: x.i1,
          i2: x.i2,
          i3: x.i3,
          i4: x.i4,
        };
      }),
      irDashBrkOpts: [["total", "الإجمالي"], ["imp", "حسب التأثير"], ["zone", "حسب المنطقة"]].map((o) => ({ lbl: o[1], on: brk === o[0], style: seg(brk === o[0]), click: () => this.setState({ irDashBrk: o[0] }) })),
      irDashTrendDesc: (daily ? "تجميع يومي" : "تجميع شهري") + " · " + KIVO.BassamCount(NX, "نقطة") + (ghost ? " · مع خط الفترة السابقة" : ""),
      irDashTrendGrid: grid,
      irDashXLabels: xLabs,
      irDashHits: hits,
      irDashPlain: !stacked,
      irDashStacked: stacked,
      irDashStackPaths: stackP,
      irDashLine: mainP.line,
      irDashArea: mainP.area,
      irDashGhostOn: !!ghostP,
      irDashGhost: ghostP ? ghostP.line : "",
      irDashLegend: stacked
        ? layers.map((l) => ({ name: l.name, dot: "width:9px;height:9px;border-radius:3px;display:inline-block;background:" + l.color }))
        : [{ name: "الحالات المرصودة — الفترة الحالية", dot: "width:9px;height:9px;border-radius:3px;display:inline-block;background:var(--bg-xb99751)" }],
      irDashGhostLbl: prevLbl,
      irDashHasData: NX > 0 && T > 0,
      irDashNoData: !(NX > 0 && T > 0),
      irDashHeatCols: heatCols,
      irDashHeatMonths: heatMos,
      irDashHeatScale: heatScale,
      irDashHeatDesc:
        "كل مربع = يوم واحد من سنة " + heatY + " · " + KIVO.BassamCount(heatAct, "يوم") + " " + KIVO.BassamCount.agr(heatAct, "فيه", "فيهما", "فيها") + " نشاط · تعرض السنة كاملة مهما كان النطاق المختار",
      irDashHeatYear: heatY,
      irDashHeatOn: heatCols.length > 0,
      irDashHeatOff: 0 === heatCols.length,
      irDashLangRows: typeRows,
      irDashLangOn: typeRows.length > 0,
      irDashLangOff: 0 === typeRows.length,
      ...KIVO.BassamCount.pair("irDashLangTot", n(T), "حالة", "g"),
      irDashLocRows: zoneRows,
      irDashLocOn: zoneRows.length > 0,
      irDashLocOff: 0 === zoneRows.length,
      ...KIVO.BassamCount.pair("irDashLocTot", n(T), "حالة", "g"),
      irDashShareSegs: imp.filter((x) => x.v > 0).map((x) => ({ style: "height:100%;width:" + ((x.v / impTot) * 100).toFixed(2) + "%;background:" + x.color })),
      irDashShiftLegend: imp.filter((x) => x.v > 0).map((x) => ({ name: x.name, pct: pc((x.v / impTot) * 100) + "%", dot: "width:9px;height:9px;border-radius:3px;display:inline-block;background:" + x.color })),
      irDashShiftRows: imp.map((x) => ({ name: x.name, val: n(x.v), sub: T ? pc((x.v / T) * 100) + "٪ من الحالات" : "—", dot: "width:9px;height:9px;border-radius:3px;flex-shrink:0;background:" + x.color })),
      irDashCmpOn: G,
      irDashCmpOff: !G,
      irDashCmpRows: cmpRows,
      irDashPrevLbl: G ? prevLbl : "الفترة السابقة",
      irDashTopEmployees: topRows,
      irDashEmpOn: topRows.length > 0,
      irDashEmpOff: 0 === topRows.length,
      irDashSumOpen: !!t.irDashSumOpen,
      irDashSumToggle: () => this.setState({ irDashSumOpen: !this.state.irDashSumOpen }),
      irDashSumChev: "transition:transform .2s;flex-shrink:0;" + (t.irDashSumOpen ? "transform:rotate(180deg)" : ""),
      irDashSumBadge: KIVO.BassamCount(sumAll.length, "منطقة") + "",
      irDashSumQ: t.irDashSumQ || "",
      irDashSumSetQ: (ev) => this.setState({ irDashSumQ: ev.target.value, irDashSumPage: 1 }),
      irDashSumShown: String(sumF.length),
      irDashSumAll: String(sumAll.length),
      irDashSumRows: sumF.slice(pg.from, pg.to),
      irDashSumTotal: sumTot,
      irDashMet1: MET[0].name,
      irDashMet2: MET[1].name,
      irDashMet34: MET[2].name,
      irDashSumHas: sumF.length > 0,
      irDashSumEmpty: 0 === sumF.length,
      irDashSumEmptyMsg: sq ? "لا توجد منطقة مطابقة لـ «" + sq + "»" : "لا توجد بيانات ضمن هذه الفترة",
      ...KIVO.BassamCount.pair("irDashSumPgTotal", String(sumF.length), "سجل", "g"),
      irDashSumPgRange: pg.range,
      irDashSumPgNums: pg.nums,
      irDashSumPerPage: String(pg.per),
      irDashSumOnPerPage: (ev) => this.setState({ irDashSumPerPage: 0 === +ev.target.value ? 0 : +ev.target.value || 10, irDashSumPage: 1 }),
      irDashSumPgFirst: () => this.setState({ irDashSumPage: 1 }),
      irDashSumPgPrev: () => this.setState({ irDashSumPage: Math.max(1, pg.page - 1) }),
      irDashSumPgNext: () => this.setState({ irDashSumPage: Math.min(pg.pages, pg.page + 1) }),
      irDashSumPgLast: () => this.setState({ irDashSumPage: pg.pages }),
      irDashSumPgFirstStyle: pg.navStyle(pg.page > 1),
      irDashSumPgPrevStyle: pg.navStyle(pg.page > 1),
      irDashSumPgNextStyle: pg.navStyle(pg.page < pg.pages),
      irDashSumPgLastStyle: pg.navStyle(pg.page < pg.pages),
    };
  }
  /* ترقيمُ جدول المنصة: الأولى · نافذةُ ±1 · الأخيرة بفواصل «…» — للسجل والملخّص */
  _rzPager(total, perRaw, pageRaw, go) {
    const per = 0 === perRaw ? 0 : perRaw || 10,
      size = 0 === per ? Math.max(1, total) : per,
      pages = Math.max(1, Math.ceil(total / size)),
      page = Math.min(Math.max(1, pageRaw || 1), pages),
      from = (page - 1) * size,
      list = [];
    [1, page - 1, page, page + 1, pages].forEach((k) => k >= 1 && k <= pages && list.indexOf(k) < 0 && list.push(k));
    list.sort((a, b) => a - b);
    const nums = [];
    list.forEach((k, i) => {
      i > 0 && k - list[i - 1] > 1 && nums.push({ dots: !0, label: "…" });
      nums.push({
        dots: !1,
        label: String(k),
        cur: k === page,
        plain: k !== page,
        style:
          "height:28px;min-width:28px;padding:0 4px;border:0;border-right:1px solid var(--bd-xe1e1e1);font-size:11px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';" +
          (k === page ? "background:var(--bg-xb99751);color:var(--text-on-brand)" : "background:transparent;color:var(--fg-x475569)"),
        click: () => go(k),
      });
    });
    return {
      per: per,
      pages: pages,
      page: page,
      from: from,
      to: from + size,
      nums: nums,
      range: 0 === total ? "0" : from + 1 + "–" + Math.min(from + size, total),
      navStyle: (on) =>
        "height:28px;width:28px;border:0;border-right:1px solid var(--bd-xe1e1e1);background:transparent;display:flex;align-items:center;justify-content:center;" +
        (on ? "color:var(--fg-x475569);cursor:pointer" : "color:var(--fg-xcbd5e1);cursor:default"),
    };
  }

  /* ═══ V7 · د6 (قرار المالك): فتحُ الشهر أو اليوم المقفل نافذةُ استدراكٍ على الخادم بالآلية القائمة (/api/retro · res=rasd) — كالمضبوطات والاسترشاد:
     النقرةُ المزدوجة لحامل approve تفتح نافذةً بسبب (مديرُ المنصة بلا سؤال) أو تغلقها، والحفظُ في فترةٍ مغلقة بلا نافذةٍ سارية يرفضه الخادم ═══ */
  _rzRetroCtx() {
    try {
      const boot = window.__BS_BOOT || {}, d = KIVO.BassamDepts && KIVO.BassamDepts.active && KIVO.BassamDepts.active();
      return boot.uid && d ? { uid: String(boot.uid), dept: String(d), key: boot.uid + "\0" + d } : null;
    } catch (e) {
      return null;
    }
  }
  _rzEnsureRetro(force) {
    const c = this._rzRetroCtx();
    if (!c || (!force && this._rzRetroFor === c.key)) return;
    this._rzRetroFor = c.key;
    fetch("/api/retro?" + new URLSearchParams({ uid: c.uid, dept: c.dept, res: "rasd" }), { credentials: "same-origin", cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { const n = this._rzRetroCtx(); n && n.key === c.key && j && j.ok && Array.isArray(j.windows) && this.setState({ rzRetro: { windows: j.windows } }); })
      .catch(() => { this._rzRetroFor = ""; });
  }
  _rzWins() {
    const r = this.state.rzRetro, now = Date.now();
    return r ? r.windows.filter((w) => w && w.scope && !w.closedAt && w.until > now) : [];
  }
  _rzWinOf(y, m, d) {
    return this._rzWins().find((w) => w.scope.y === y && w.scope.m === m && (w.scope.d == null ? d == null : w.scope.d === d)) || null;
  }
  _rzCovers(y, m, d) {
    return this._rzWins().some((w) => w.scope.y === y && w.scope.m === m && (w.scope.d == null || w.scope.d === d));
  }
  async _rzRetroToggle(scope) {
    if (!this.PC("approve")) return void this.permDeny();
    const c = this._rzRetroCtx();
    if (!c || this._rzRetroBusy) return;
    if (!this.state.rzRetro) return void (this.bsToast("انتظر قراءة نافذة الاستدراك من الخادم ثم أعد المحاولة"), this._rzEnsureRetro(!0));
    this._rzRetroBusy = !0;
    try {
      const w = this._rzWinOf(scope.y, scope.m, scope.d),
        body = { uid: c.uid, dept: c.dept, res: "rasd", act: w ? "close" : "open", ...(w ? { id: w.id } : { scope: scope }) };
      if (!w) {
        /* V7 · د6 (QA) · البند ١: لا سبب — رسالةُ تأكيدٍ قبل فتح الفترة (كانت نافذةُ السبب هي التأكيد) */
        if (!(await (KIVO.bsConfirm ? KIVO.bsConfirm({ title: "فتح الفترة للاستدراك", msg: "تُفتح الفترةُ المغلقة للاستدراك لإدارتك 24 ساعة وتُسجَّل باسمك في سجل الحركة.", ok: "فتح الفترة" }) : false))) return;
      }
      const r = await fetch("/api/retro?uid=" + encodeURIComponent(c.uid), { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
        j = await r.json().catch(() => null);
      if (!r.ok || !j || !j.ok) this.bsToast(r.status === 403 ? "فتحُ الفترة المقفلة للاستدراك يحتاج صلاحية الاعتماد — راجع مدير الإدارة" : "تعذّر " + (w ? "إغلاق" : "فتح") + " نافذة الاستدراك");
      else this.bsAck(w ? "أُغلقت نافذة الاستدراك" : "فُتحت الفترة للاستدراك", "ok");
    } catch (e) {
      this.bsToast("تعذّر الاتصال بالخادم — لم تتغيّر نافذة الاستدراك");
    } finally {
      this._rzRetroBusy = !1;
      this._rzEnsureRetro(!0);
    }
  }

  /* ═══ صفحةُ السجلات: شريطُ السنة والأشهر · شريطُ الأيام بقفله ونقرةِ الاستدراك المزدوجة · كروتُ الشهر ═══ */
  _rzCalVals() {
    const t = this.state,
      e = KIVO.BassamCal.gToday(),
      Y = t.rzYear,
      M = t.rzMonth,
      all = this.loadRasd().reports || [],
      cnt = (y, m, d) => all.filter((r) => r.y === y && (null == m || r.m === m) && (null == d || r.d === d)).length,
      nowM = 12 * e.y + e.m,
      AP = this.PC("approve"),
      NOAP = "فتحُ الشهر أو اليوم المقفل للاستدراك وإعادةُ قفله تحتاج صلاحية الاعتماد — راجع مدير الإدارة",
      FILE = ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6"],
      SHIELD = ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z", ""];
    const months = KIVO.BassamCal.G_MONTHS.map((name, i) => {
      const m = i + 1,
        sel = M === m,
        key = Y + "-" + m,
        past = 12 * Y + m < nowM,
        open = !!this._rzWinOf(Y, m, null),
        locked = past && !open,
        k = cnt(Y, m),
        cases = KIVO.BassamCount(k, "حالة") + "";
      let st = "position:relative;width:100%;border-radius:12px;padding:8px;text-align:center;transition:all .2s;box-shadow:var(--shadow-card);cursor:pointer;box-sizing:border-box;font-family:'Cairo',sans-serif;border:1px ",
        nameC = "var(--fg-x53565a)",
        cntC = "var(--fg-xcbd5e1)",
        lbl = "لا حالات",
        icon = null;
      if (locked) {
        st += (sel ? "solid var(--bd-x64748b);box-shadow:0 0 0 2px var(--bd-a1001161390p22);" : "solid var(--bd-a1001161390p35);") + "background:var(--bg-a1001161390p08)";
        nameC = cntC = "var(--fg-x475569)";
        lbl = k ? cases : "انقضى — مقفل";
        icon = SHIELD;
      } else if (sel) {
        st += "solid var(--bd-xb99751);box-shadow:0 0 0 2px var(--bd-a185151810p3);background:var(--bg-a185151810p06)";
        nameC = "var(--fg-xb99751)";
        k && ((lbl = cases), (cntC = "var(--fg-xb99751)"), (icon = FILE));
      } else if (k) {
        st += "solid var(--bd-xe1e1e1);background:var(--bg-xffffff)";
        lbl = cases;
        cntC = "var(--fg-xb99751)";
        icon = FILE;
      } else st += "dashed var(--bd-xe1e1e1);background:var(--bg-a2452452450p7);opacity:.9";
      const fresh = { rzYear: Y, rzMonth: m, rzDay: Y === e.y && m === e.m ? e.d : 1 };
      return {
        name: name,
        greg: KIVO.BassamCal.hRangeOfMonth(KIVO.BassamCal.gYm(Y, m)),
        style: st,
        nameColor: nameC,
        cntColor: cntC,
        cntLabel: lbl,
        cntIcon: !!icon && !locked,
        cntShield: locked,
        isCurrent: Y === e.y && m === e.m,
        tip: locked
          ? (k ? cases + " في " + name + " · " : "") + (AP ? "الشهر انقضى — مقفل · نقرة مزدوجة لفتحه للاستدراك" : "الشهر انقضى — مقفل · فتحه للاستدراك يحتاج صلاحية الاعتماد")
          : past && open
            ? "مفتوح للاستدراك" + (AP ? " · نقرة مزدوجة لإغلاقه مجدداً" : "")
            : k
              ? cases + " في " + name
              : "لا حالات مرصودة في " + name,
        click: () => this.setState(sel ? fresh : { ...fresh, rzLedgerPage: 1 }),
        dbl: (ev) => {
          ev && ev.stopPropagation && ev.stopPropagation();
          if (!AP) return void ((locked || (past && open)) && this.bsToast(NOAP));
          (locked || (past && open)) && (this.setState({ rzYear: Y, rzMonth: m }), this._rzRetroToggle({ y: Y, m: m, d: null }));
        },
      };
    });
    const selM = 12 * Y + M,
      mPast = selM < nowM,
      mLocked = mPast && !this._rzWinOf(Y, M, null),
      nDays = KIVO.BassamCal.gMonthDays(Y, M),
      g1 = this.gDate(Y, M, 1),
      g0 = new Date(g1.getFullYear(), g1.getMonth(), g1.getDate(), 12),
      isCurM = Y === e.y && M === e.m,
      days = [];
    for (let i = 1; i <= nDays; i++) {
      const k = cnt(Y, M, i),
        sel = i === t.rzDay,
        today = isCurM && i === e.d,
        past = mPast || (selM === nowM && i < e.d),
        fut = selM > nowM || (isCurM && i > e.d),
        covered = this._rzCovers(Y, M, i),
        lockC = mLocked || (past && !covered),
        lockO = !lockC && past && covered;
      let bg = "var(--bg-xffffff)",
        fg = "var(--fg-x53565a)",
        bd = "2px solid var(--bd-xe1e1e1)";
      if (k) (bg = lockC ? "var(--bg-x64748b)" : "var(--bg-xb99751)"), (fg = "var(--fg-xffffff)"), (bd = "2px solid transparent");
      else if (lockC) (bg = "var(--bg-a1481631840p12)"), (fg = "var(--fg-x94a3b8)");
      sel && (bd = "2px solid " + (lockC ? "var(--bd-x64748b)" : "var(--bd-xb99751)"));
      const gd = new Date(g0.getTime() + 864e5 * (i - 1));
      let gl = "";
      try {
        gl = gd.toLocaleDateString("ar-u-ca-gregory-nu-latn", { day: "numeric", month: "long", year: "numeric" });
      } catch (er) {
        gl = "";
      }
      days.push({
        num: String(i),
        gnum: String(gd.getDate()),
        isToday: today,
        lockClosed: lockC,
        lockOpen: lockO,
        sepStyle: "display:block;width:9px;height:1px;flex-shrink:0;margin:1px 0;background:" + (k ? "var(--bg-a2552552550p5)" : "var(--bg-a1481631840p55)"),
        tip:
          "يوم " + i + " " + KIVO.BassamCal.G_MONTHS[M - 1] + " " + Y + " هـ — الموافق " + gl + " م" + (k ? " — " + KIVO.BassamCount(k, "حالة") : " — لا حالات") +
          (lockC ? " — انقضى، مقفل · " + (AP ? "نقرة مزدوجة لفتحه" : "فتحه يحتاج صلاحية الاعتماد") : lockO ? " — مفتوح للاستدراك" + (AP ? " · نقرة مزدوجة لإغلاقه" : "") : fut ? " — لم يأتِ بعد" : ""),
        click: () => this.setState(sel ? { rzDay: i } : { rzDay: i, rzDelAsk: null }),
        dbl: (ev) => {
          ev && ev.stopPropagation && ev.stopPropagation();
          if (!AP) return void ((mLocked || past) && this.bsToast(NOAP));
          mLocked ? this._rzRetroToggle({ y: Y, m: M, d: null }) : past && this._rzRetroToggle({ y: Y, m: M, d: this._rzWinOf(Y, M, null) ? null : i });
        },
        style:
          "position:relative;height:24px;flex:1 1 auto;min-width:28px;padding:0 3px;border-radius:4px;font-size:8px;font-weight:" + (sel ? "900" : "700") +
          ";display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;user-select:none;background:" + bg + ";color:" + fg + ";border:" + bd +
          (sel ? ";box-shadow:var(--shadow-card);z-index:10" : "") + (today && !sel ? ";box-shadow:0 0 0 2px var(--bd-a185151810p6)" : "") + (fut ? ";opacity:.55" : ""),
      });
    }
    const D = t.rzDay,
      dPast = mPast || (selM === nowM && D < e.d),
      dFut = selM > nowM || (isCurM && D > e.d),
      dayLocked = !mLocked && dPast && !this._rzCovers(Y, M, D),
      monthRows = all.filter((r) => r.y === Y && r.m === M),
      opts = this.loadRzOpts();
    return {
      /* V7 · 53 تقويم (§7 · day_card_design · REVIEW 21): كرتا الشهر واليوم من المكوّن الواحد KIVO.BassamCalCard — الميلاديُّ أساساً والهجريُّ سطرٌ صغير، وحالتان فقط */
      rzMonths: months.map((x, i) => {
        const m = i + 1, ym = KIVO.BassamCal.gYm(Y, m), past = 12 * Y + m < nowM, open = !!this._rzWinOf(Y, m, null);
        return Object.assign(x, { card: KIVO.BassamCalCard.month({ key: ym, ym, closed: past && !open, why: past && !open ? "past" : past && open ? "retro" : "", sel: M === m, T: e.k, onClick: x.click, onDoubleClick: x.dbl, attrs: { "data-strip-cur": String(x.isCurrent) } }) });
      }),
      rzYearLabel: Y,
      rzGregRange: KIVO.BassamCal.hRangeOfYear(Y),
      rzBadgeLabel: KIVO.BassamCount(cnt(Y), "حالة") + " هذه السنة",
      rzBadgeStyle:
        "display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;border-radius:9999px;padding:4px 12px;font-family:'Cairo',sans-serif;border:1px solid " +
        (isCurM ? "var(--bd-a185151810p35);color:var(--fg-x9a7e40);background:var(--bg-a185151810p12)" : "var(--bd-a1481631840p35);color:var(--fg-x64748b);background:var(--bg-a1481631840p1)"),
      rzPrevYear: () => this.setState({ rzYear: Y - 1, rzLedgerPage: 1 }),
      rzNextYear: () => this.setState({ rzYear: Y + 1, rzLedgerPage: 1 }),
      rzGoCurrent: () => this.setState({ rzYear: e.y, rzMonth: e.m, rzDay: e.d, rzLedgerPage: 1 }),
      rzDays: days.map((v, i) => {
        const k = KIVO.BassamCal.gKey(Y, M, i + 1);
        return Object.assign(v, { card: KIVO.BassamCalCard.day({ key: k, k, closed: v.lockClosed, why: v.lockClosed ? "past" : v.lockOpen ? "retro" : "", sel: t.rzDay === i + 1, T: e.k, onClick: v.click, onDoubleClick: v.dbl, attrs: { "data-strip-cur": String(v.isToday) } }) });
      }),
      rzSelDateLabel: D + " " + KIVO.BassamCal.G_MONTHS[M - 1] + " " + Y + (KIVO.BassamCal.hDayText(KIVO.BassamCal.gKey(Y, M, D)) ? " · " + KIVO.BassamCal.hDayText(KIVO.BassamCal.gKey(Y, M, D)) + " هـ" : ""),
      rzLegendLockTxt: AP ? "انقضى — مقفل · نقرة مزدوجة لفتحه" : "انقضى — مقفل",
      /* الكروتُ ظاهرةٌ دائماً — بأصفار في الشهر الفارغ */
      rzKpiCards: this._rzKpiCards(this.rzKpis(monthRows, opts)),
      ...this._rzEntryVals({ Y, M, D, e, isCurM, mLocked, dayLocked, dFut, AP, opts, all }),
      ...this._rzLedgerVals({ Y, M, D, monthRows, opts }),
    };
  }
  /* كرتُ المؤشر: حلقةٌ بعددٍ ونسبة · عنوانٌ بتلميح · سطرٌ فرعي · مفتاحُ الشرائح — بنيةُ كرت مؤشرات موظفي الإدارة */
  _rzKpiCards(K) {
    /* V7 · 53 (port-sync · بند 8): البناءُ في القطعة المشتركة (src/systems/_shared/kpiring — _kpiRing) — الكرتُ نفسُه في المضبوطات والاسترشاد */
    const T = K.total,
      pct = (k) => (T ? Math.round((100 * k) / T) + "٪" : "—"),
      card = (o) => this._kpiRing({ ...o, T }),
      tt = K.topType,
      noAct = T - K.acted;
    return [
      card({ title: "مستوى التأثير", tip: "توزيعُ حالات الشهر على مستويات التأثير الأربعة — النسبةُ للعالية والحرجة", val: String(T), chip: pct(K.hot), sub: "عالية/حرجة من حالات الشهر", accent: K.hot ? "var(--danger)" : "var(--fg-x53565a)", parts: K.impact }),
      card({ title: "نوع الحالة", tip: "أكثرُ أنواع الحالات تكراراً هذا الشهر (أعلى أربعة ثم غيرها)", val: String(tt ? tt.n : 0), chip: pct(tt ? tt.n : 0), sub: tt ? "الأكثر: " + tt.label : "—", accent: "var(--fg-xb99751)", parts: K.type }),
      card({ title: "الإجراء المتخذ", tip: "الإجراءاتُ المتخذة في حالات الشهر — الرقمُ ما اتُّخذ فيه إجراء", val: String(K.acted), chip: pct(K.acted), sub: !T ? "لا حالات بعد" : noAct ? KIVO.BassamCount(noAct, "حالة") + " بلا إجراء" : "اتُّخذ إجراءٌ في كلها", accent: noAct ? "var(--warning)" : "var(--success)", parts: K.act }),
      card({ title: "الإبلاغ", tip: "الجهاتُ التي أُبلغت بحالات الشهر — الرقمُ ما أُبلغت فيه جهةٌ مختصة", val: String(K.reported), chip: pct(K.reported), sub: "أُبلغت فيها جهةٌ مختصة", accent: "var(--fg-xb99751)", parts: K.party }),
    ];
  }

  /* ═══ محضرُ الرصد: الحقول · القوائم المُدارة من داخلها (اختيار · إضافة · تعديلٌ يسري على السجل · حذفٌ يُبقي النصَّ في السجل) ═══ */
  _rzEntryVals(x) {
    const t = this.state,
      dr = t.rzDraft || this.emptyDraft(),
      opts = x.opts,
      nowHM = this.rzHM(new Date()),
      isToday = x.isCurM && x.D === x.e.d,
      canAdd = this.PC("add"),
      lists = this._irCanWrite(),
      E = t.rzErr || {},
      O = this.RZ_OTHER,
      draft = () => this.state.rzDraft || this.emptyDraft(),
      set = (p) => this.setState({ rzDraft: { ...draft(), ...p }, rzSaveErrMsg: "" }),
      clr = (k) => {
        const e2 = { ...(this.state.rzErr || {}) };
        delete e2[k];
        return e2;
      },
      used = (k, v) => x.all.filter((r) => r[k] === v).length,
      ddReset = { rzDdEdit: "", rzDdDel: "", rzDdNew: "", rzDdErr: "" },
      stop = (ev) => ev && ev.stopPropagation && ev.stopPropagation();
    const persistRename = (k, from, to) => {
      const d0 = this.loadRasd(),
        r = this.rzListRename(this.loadRzOpts(), d0.reports, k, from, to);
      if (r.err) return void this.setState({ rzDdErr: r.err });
      if (!this.saveRzOpts(r.opts)) return;
      r.n && this.saveRasd({ ...d0, reports: r.reports });
      const cur = draft(),
        p = {};
      cur[k] === from && (p[k] = r.v);
      "spot" === k && cur.spot === from && ((p.spot = r.v), (p.spotQ = r.v));
      this.setState({ rzDraft: { ...cur, ...p }, rzDdEdit: "", rzDdEditVal: "", rzDdErr: "" });
      this.bsAck(r.n ? "عُدّل الاسم في القائمة و" + KIVO.BassamCount(r.n, "حالة", "g") + " في السجل والمؤشرات" : "عُدّل الاسم في القائمة", "ok");
    };
    const persistDel = (k, name) => {
      const r = this.rzListDel(this.loadRzOpts(), k, name);
      if (r.err) return void this.setState({ rzDdErr: r.err });
      if (!this.saveRzOpts(r.opts)) return;
      const cur = draft(),
        p = cur[k] === name ? ("spot" === k ? { spot: "", spotQ: "" } : { [k]: "", [k + "Tx"]: "" }) : {};
      this.setState({ rzDraft: { ...cur, ...p }, rzDdDel: "", rzDdErr: "" });
      this.bsAck("حُذف «" + name + "» من القائمة — الحالاتُ المسجّلة تبقى باسمها", "ok");
    };
    const persistAdd = (k) => {
      const cur = draft(),
        r = this.rzListAdd(this.loadRzOpts(), k, this.state.rzDdNew, cur.zone);
      if (r.err) return void this.setState({ rzDdErr: r.err });
      if (!this.saveRzOpts(r.opts)) return;
      const p = "spot" === k ? { spot: r.v, spotQ: r.v } : { [k]: r.v, [k + "Tx"]: "" };
      this.setState({ rzDraft: { ...cur, ...p }, rzErr: clr(k), rzDd: null, rzDdNew: "", rzDdErr: "" });
      this.bsAck("أُضيف «" + r.v + "» إلى القائمة" + ("spot" === k ? " في «" + cur.zone + "»" : ""), "ok");
    };
    const rowsOf = (k, list) =>
      list.map((it) => {
        const v = it.n,
          lock = "spot" !== k && this.rzLocked(k, v),
          k2 = used(k, v),
          ed = t.rzDdEdit === v,
          del = t.rzDdDel === v,
          sel = dr[k] === v;
        return {
          name: v,
          sq: "width:10px;height:10px;border-radius:3px;flex-shrink:0;background:" + (it.c || "var(--bd-xe1e1e1)"),
          hasSq: "spot" !== k,
          meta: "spot" === k ? [it.g, it.z].filter(Boolean).join(" · ") : k2 ? KIVO.BassamCount(k2, "حالة") : "",
          normal: !ed && !del,
          editing: ed,
          deleting: del,
          lock: lock,
          tools: !lock && lists,
          sel: sel,
          rowStyle: "display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:pointer;font-size:12.5px;font-weight:400;border-radius:8px;color:var(--fg-x25343f);" + (sel ? "background:var(--bg-a185151810p08);color:var(--fg-x8a6f35)" : ""),
          pick: () => {
            const cur = draft(),
              p = "spot" === k ? { spot: v, spotQ: v } : { [k]: v, [k + "Tx"]: v === O ? cur[k + "Tx"] : "" };
            /* الجهةُ تتبع الإجراء: غيرُ «إبلاغ جهة مختصة» يمسحها · والمنطقةُ تمسح موقعاً ليس فيها */
            "act" === k && v !== this.RZ_REPORT && ((p.party = ""), (p.partyTx = ""));
            "zone" === k && cur.spot && !this._rzSpotOk(opts, v, cur.spot) && ((p.spot = ""), (p.spotQ = ""));
            this.setState({ rzDraft: { ...cur, ...p }, rzErr: clr(k), rzDd: null, ...ddReset, rzSaveErrMsg: "" });
          },
          startEdit: (ev) => (stop(ev), this.setState({ rzDdEdit: v, rzDdEditVal: v, rzDdDel: "", rzDdErr: "" })),
          startDel: (ev) => (stop(ev), this.setState({ rzDdDel: v, rzDdEdit: "", rzDdErr: "" })),
          delMsg: k2 ? "مستخدم في " + KIVO.BassamCount(k2, "حالة", "g") + " — تبقى في السجل باسمها" : "غير مستخدم في أي حالة",
          editVal: ed ? t.rzDdEditVal : "",
          setEditVal: (ev) => this.setState({ rzDdEditVal: ev.target.value }),
          editKey: (ev) => {
            ev && "Enter" === ev.key && (ev.preventDefault && ev.preventDefault(), persistRename(k, v, this.state.rzDdEditVal));
            ev && "Escape" === ev.key && this.setState({ rzDdEdit: "", rzDdErr: "" });
          },
          saveEdit: (ev) => (stop(ev), persistRename(k, v, this.state.rzDdEditVal)),
          cancel: (ev) => (stop(ev), this.setState({ rzDdEdit: "", rzDdDel: "", rzDdErr: "" })),
          doDel: (ev) => (stop(ev), persistDel(k, v)),
          stop: stop,
        };
      });
    const fieldOf = (k, ord) => {
      const list = opts[k].filter((it) => (this.RZ_HIDE[k] || []).indexOf(it.n) < 0),
        v = dr[k],
        it = opts[k].find((i) => i.n === v),
        open = t.rzDd === k;
      return {
        k: k,
        label: this.RZ_LBL[k],
        /* حقلُ الجهة لا يظهر إلا مع «إبلاغ جهة مختصة» */
        show: "party" !== k || dr.act === this.RZ_REPORT,
        wrapStyle: "display:flex;flex-direction:column;gap:5px;min-width:0;position:relative;order:" + ord,
        btnLabel: v || "— اختر " + this.RZ_PH[k] + " —",
        btnStyle:
          "width:100%;height:40px;padding:0 12px;border-radius:11px;border:1px solid " + (E[k] ? "var(--bd-xdc2626)" : open ? "var(--bd-a185151810p4)" : "var(--bd-xe2e8f0)") +
          ";background:var(--bg-a2482502520p8);display:flex;align-items:center;font-family:'Cairo',sans-serif;font-size:12.5px;font-weight:400;color:" + (v ? "var(--fg-x141414)" : "var(--fg-x94a3b8)") + ";cursor:pointer;box-sizing:border-box;gap:8px",
        sq: "width:10px;height:10px;border-radius:3px;flex-shrink:0;background:" + (it ? it.c : "var(--bd-xe1e1e1)"),
        open: open,
        toggle: () => this.setState({ rzDd: open ? null : k, ...ddReset }),
        close: () => this.setState({ rzDd: null, ...ddReset }),
        rows: rowsOf(k, list),
        canAdd: lists,
        addPh: "إضافة " + this.RZ_NOUN[k] + " جديد…",
        newVal: open ? t.rzDdNew : "",
        setNew: (ev) => this.setState({ rzDdNew: ev.target.value, rzDdErr: "" }),
        newKey: (ev) => ev && "Enter" === ev.key && (ev.preventDefault && ev.preventDefault(), persistAdd(k)),
        addNew: () => persistAdd(k),
        ddErr: open ? t.rzDdErr : "",
        ddErrOn: open && !!t.rzDdErr,
        other: v === O,
        otherVal: dr[k + "Tx"] || "",
        otherPh: "اكتب " + ("zone" === k ? "المنطقة" : "type" === k ? "نوع الحالة" : "act" === k ? "الإجراء" : "الجهة"),
        setOther: (ev) => (set({ [k + "Tx"]: ev.target.value }), E[k] && this.setState({ rzErr: clr(k) })),
        err: E[k] || "",
        errOn: !!E[k],
      };
    };
    /* الموقعُ التفصيلي: بحثٌ في القائمة المعتمدة مصفّاةً بالمنطقة المختارة */
    const zz = dr.zone,
      zFree = !zz || zz === O,
      sq = String(dr.spotQ || "").trim(),
      spotsHit = opts.spot.filter((s) => (zFree || s.z === zz) && (!sq || sq === dr.spot || s.n.indexOf(sq) >= 0 || (s.g || "").indexOf(sq) >= 0)).slice(0, 40),
      spOpen = t.rzDd === "spot",
      IMP_ON = {
        "منخفض": "background:var(--success-bg);border-color:var(--success);color:var(--success-text)",
        "متوسط": "background:var(--warning-bg);border-color:var(--warning);color:var(--warning-text)",
        "عالٍ": "background:color-mix(in srgb,var(--fg-xc2410c) 12%,transparent);border-color:var(--fg-xc2410c);color:var(--fg-xc2410c)",
        "حرج": "background:var(--danger-bg);border-color:var(--danger);color:var(--danger-text)",
      },
      hd = x.e,
      canEnter = canAdd && !x.mLocked && !x.dayLocked && !x.dFut,
      lockTail = x.AP ? "" : " · فتحه للاستدراك يحتاج صلاحية الاعتماد — راجع مدير الإدارة";
    return {
      rzCanEnter: canEnter,
      rzEntryShow: canAdd,
      rzMonthAutoHint: canAdd && x.mLocked,
      rzDayLockedHint: canAdd && x.dayLocked,
      rzFutureHint: canAdd && !x.mLocked && x.dFut,
      rzDayLockedTxt: "اليوم انقضى — مقفل" + (x.AP ? " · انقر بطاقة اليوم نقرة مزدوجة لفتحه ثم سجّل الحالة" : lockTail),
      rzMonthAutoTxt: "الشهر انقضى — مقفل" + (x.AP ? " · انقر بطاقة الشهر نقرة مزدوجة لفتحه ثم أضف الحالة" : lockTail),
      rzFutureTxt: "هذا اليوم لم يأتِ بعد — الرصدُ لليوم الحالي أو لأيامٍ مضت مفتوحةٍ للاستدراك",
      rzEntryTitle: "محضر رصد — يوم " + x.D + " " + KIVO.BassamCal.G_MONTHS[x.M - 1] + " " + x.Y,
      rzAutoBy: "يُسجَّل آلياً: " + this.irActor() + " · " + hd.d + " " + KIVO.BassamCal.G_MONTHS[hd.m - 1] + " " + hd.y + " · " + nowHM,
      rzAutoTip: "اسمُ الراصد وإدارتُه وتاريخُ الإدخال ووقتُه تُسجَّل آلياً من الجلسة — لا تُكتب",
      /* وقتُ الوقوع منفصلٌ عن وقت الإدخال (يُعدَّل) · لا يكون بعد الآن في اليوم الحالي */
      rzWhen: dr.t || nowHM,
      rzWhenMax: isToday ? nowHM : "23:59",
      rzSetWhen: (ev) => (set({ t: ev.target.value }), E.t && this.setState({ rzErr: clr("t") })),
      rzWhenErr: E.t || "",
      rzWhenErrOn: !!E.t,
      rzWhenStyle: "height:30px;border:1px solid " + (E.t ? "var(--bd-xdc2626)" : "var(--bd-xe2e8f0)") + ";border-radius:8px;background:var(--bg-xffffff);padding:0 8px;font-size:12px;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';color:var(--fg-x141414);outline:none",
      rzFields: [fieldOf("zone", 1), fieldOf("floor", 2), fieldOf("type", 4), fieldOf("act", 5), fieldOf("party", 6)],
      rzSpotLabel: this.RZ_LBL.spot,
      rzSpotQ: dr.spotQ || "",
      rzSpotPh: zFree ? "ابحث: باب، ممر، سلم…" : "ابحث في مواقع «" + zz + "»…",
      rzSpotStyle:
        "width:100%;height:40px;padding:0 34px 0 12px;border-radius:11px;border:1px solid " + (E.spot ? "var(--bd-xdc2626)" : spOpen ? "var(--bd-a185151810p4)" : "var(--bd-xe2e8f0)") +
        ";background:var(--bg-a2482502520p8);font-family:'Cairo',sans-serif;font-size:12.5px;color:var(--fg-x141414);outline:none;box-sizing:border-box",
      rzSpotOpen: spOpen,
      /* تفتح بالنقر أو الكتابة لا بالتركيز: المحرّكُ يعيد التركيز إلى الحقل بعد الاختيار */
      rzSpotFocus: () => t.rzDd !== "spot" && this.setState({ rzDd: "spot", ...ddReset }),
      rzSpotSet: (ev) => this.setState({ rzDraft: { ...draft(), spotQ: ev.target.value, spot: "" }, rzDd: "spot" }),
      rzSpotClose: () => this.setState({ rzDd: null, ...ddReset, rzDraft: { ...draft(), spotQ: draft().spot } }),
      rzSpotRows: rowsOf("spot", spotsHit).map((r) => ({ ...r, sel: dr.spot === r.name })),
      rzSpotNone: 0 === spotsHit.length,
      rzSpotNoneMsg: zFree ? "لا نتيجة — الموقع ليس في القائمة المعتمدة" : "لا مواقع معتمدة بهذا الاسم في «" + zz + "»",
      rzSpotAddOn: lists && !zFree,
      rzSpotAddOff: lists && zFree,
      rzSpotAddPh: "إضافة موقع إلى «" + zz + "»…",
      rzSpotNew: spOpen ? t.rzDdNew : "",
      rzSpotSetNew: (ev) => this.setState({ rzDdNew: ev.target.value, rzDdErr: "" }),
      rzSpotNewKey: (ev) => ev && "Enter" === ev.key && (ev.preventDefault && ev.preventDefault(), persistAdd("spot")),
      rzSpotAdd: () => persistAdd("spot"),
      rzSpotErr: spOpen ? t.rzDdErr : "",
      rzSpotErrOn: spOpen && !!t.rzDdErr,
      rzSpotFErr: E.spot || "",
      rzSpotFErrOn: !!E.spot,
      /* «ممنوعات»: تنبيهٌ بتسجيل القطع في نظام المضبوطات — بحضوره مفعَّلاً وحده (الناقل) */
      rzSzNote: dr.type === this.RZ_SEIZED && this.rzSeizedOn(),
      rzImpacts: this.RZ_IMPACTS.map((v) => ({
        name: v,
        aria: dr.impact === v ? "true" : "false",
        pick: () => this.setState({ rzDraft: { ...draft(), impact: v }, rzErr: clr("impact") }),
        style:
          "height:42px;border:1px solid var(--bd-xe2e8f0);border-radius:11px;background:var(--bg-xffffff);cursor:pointer;font-size:12.5px;font-weight:600;font-family:'Cairo',sans-serif;color:var(--fg-x53565a);" + (dr.impact === v ? IMP_ON[v] : ""),
      })),
      rzImpErr: E.impact || "",
      rzImpErrOn: !!E.impact,
      rzNotes: dr.notes || "",
      rzSetNotes: (ev) => set({ notes: String(ev.target.value || "").slice(0, 500) }),
      rzNotesLeft: String(500 - String(dr.notes || "").length),
      rzAttHas: !!dr.att,
      rzAttNo: !dr.att,
      rzAttUrl: dr.att ? dr.att.url : "",
      rzAttName: dr.att ? dr.att.name || "صورة" : "",
      rzAttPick: () => this.rzOpenFile(),
      rzAttOnFile: (ev) => this.rzOnFile(ev),
      rzAttRemove: () => {
        const cur = draft();
        cur.att && this.rzDropImg(cur.att.iid);
        this.setState({ rzDraft: { ...cur, att: null } });
      },
      rzClearDraft: () => {
        const cur = draft();
        cur.att && this.rzDropImg(cur.att.iid);
        this.setState({ rzDraft: this.emptyDraft(), rzErr: {}, rzSaveErrMsg: "", rzDd: null });
      },
      rzSaveErr: !!t.rzSaveErrMsg,
      rzSaveErrMsg: t.rzSaveErrMsg || "",
      rzSave: () => this.rzSaveCase({ Y: x.Y, M: x.M, D: x.D, isToday: isToday, canEnter: canEnter }),
      rzStop: stop,
    };
  }
  rzSaveCase(c) {
    if (!this.PC("add")) return void this.permDeny();
    if (!c.canEnter) return void this.setState({ rzSaveErrMsg: "هذا اليوم مقفل — افتحه للاستدراك أولاً" });
    const nowHM = this.rzHM(new Date()),
      dr = this.state.rzDraft || this.emptyDraft(),
      v = this.rzValidate(dr, { isToday: c.isToday, nowHM: nowHM });
    if (!v.ok) return void this.setState({ rzErr: v.errs, rzSaveErrMsg: v.errs.t ? v.errs.t : "أكمل الحقول المطلوبة" });
    const rec = {
      id: "z" + Date.now().toString(36) + Math.floor(1e6 * Math.random()).toString(36),
      y: c.Y,
      m: c.M,
      d: c.D,
      t: v.rec.t,
      lt: nowHM,
      by: this.rzActorKey(),
      byName: this.irActor(),
      dept: this.rzDeptName(),
      zone: v.rec.zone,
      floor: v.rec.floor,
      spot: v.rec.spot,
      type: v.rec.type,
      impact: v.rec.impact,
      act: v.rec.act,
      party: v.rec.party,
      notes: v.rec.notes,
      att: dr.att ? dr.att.iid : null,
    };
    const d = this.loadRasd();
    if (!this.saveRasd({ ...d, reports: [...(d.reports || []), rec] })) return;
    dr.att && ((this._rzImg = this._rzImg || {}), (this._rzImg[dr.att.iid] = dr.att.url));
    const hot = "حرج" === rec.impact || "عالٍ" === rec.impact;
    this.setState({ rzDraft: this.emptyDraft(), rzErr: {}, rzSaveErrMsg: "", rzDd: null, rzLedgerPage: 1 });
    this.bsAck(hot ? "أُضيفت الحالة، ويُرسل تنبيهٌ فوري لمدير الإدارة (تأثير «" + rec.impact + "»)" : "أُضيفت الحالة إلى السجل", "ok");
  }

  /* ═══ المرفق: صورةٌ تُصغَّر وتُحفظ في مخزن الصور الموحّد (BassamIDB) بمعرّفٍ من عائلة img_ القانونية (310 BassamImgRefs) ═══ */
  rzOpenFile() {
    try {
      const el = document.getElementById("rzAttInp");
      el && ((el.value = ""), el.click());
    } catch (e) {
      this.bsToast("تعذّر فتح منتقي الملفات");
    }
  }
  rzOnFile(ev) {
    const f = ev && ev.target && ev.target.files && ev.target.files[0];
    if (!f) return;
    if (f.size > 5242880) return void this.bsToast("المرفق أكبر من 5 ميغابايت — اختر صورةً أصغر");
    if (!/^image\//.test(f.type || "")) return void this.bsToast("المرفق صورةٌ فقط — ملفات PDF وغيرها لا تُحفظ في مخزن صور المنصة بعد");
    const im = new Image(),
      u = URL.createObjectURL(f);
    im.onload = () => {
      try {
        const s = Math.min(1, 1280 / Math.max(im.width, im.height)),
          cv = document.createElement("canvas");
        cv.width = Math.max(1, Math.round(im.width * s));
        cv.height = Math.max(1, Math.round(im.height * s));
        const g = cv.getContext("2d");
        g.fillStyle = "white";
        g.fillRect(0, 0, cv.width, cv.height);
        g.drawImage(im, 0, 0, cv.width, cv.height);
        const data = cv.toDataURL("image/jpeg", 0.8),
          iid = "img_rzd" + Date.now().toString(36) + "_" + Math.floor(1e9 * Math.random()).toString(36);
        URL.revokeObjectURL(u);
        (this._rzImg = this._rzImg || {})[iid] = data;
        try {
          KIVO.BassamIDB && KIVO.BassamIDB.set(iid, data);
        } catch (e) {
          this.bsToast("تعذّر حفظ الصورة في المخزن");
        }
        const cur = this.state.rzDraft || this.emptyDraft();
        cur.att && this.rzDropImg(cur.att.iid);
        this.setState({ rzDraft: { ...cur, att: { iid: iid, url: data, name: f.name || "صورة" } } });
      } catch (e) {
        this.bsToast("تعذّر معالجة الصورة");
      }
    };
    im.onerror = () => (URL.revokeObjectURL(u), this.bsToast("الملف ليس صورة صالحة"));
    im.src = u;
  }
  rzImgUrl(iid) {
    if (!iid) return "";
    this._rzImg = this._rzImg || {};
    if (void 0 !== this._rzImg[iid]) return this._rzImg[iid] || "";
    this._rzImg[iid] = "";
    try {
      KIVO.BassamIDB &&
        KIVO.BassamIDB.get(iid)
          .then((v) => {
            this._rzImg[iid] = "string" === typeof v ? v : "";
            v && this.setState({ rzImgTick: (this.state.rzImgTick || 0) + 1 });
          })
          .catch(() => (this._rzImg[iid] = ""));
    } catch (e) {
      this._rzImg[iid] = "";
    }
    return "";
  }
  rzDropImg(iid) {
    if (!iid) return;
    try {
      KIVO.BassamIDB && KIVO.BassamIDB.del(iid);
    } catch (e) {
      /* كنسُ اليتيمات الدوري يلتقطها لاحقاً */
    }
  }

  /* ═══ سجلُّ الحالات الشهري — جدولُ المنصة: بحث · ملفات · فلترة (النوع · التأثير · الشهر/اليوم) · ترتيب · ترقيم ═══ */
  _rzLedgerVals(x) {
    const t = this.state,
      V = x.monthRows,
      ML = KIVO.BassamCal.G_MONTHS[x.M - 1] + " " + x.Y,
      q = String(t.rzLgSearch || "").trim().toLowerCase(),
      IMPN = { "منخفض": 1, "متوسط": 2, "عالٍ": 3, "حرج": 4 },
      K = V.filter((r) => ("all" === t.rzLgType || this.rzBase(r.type) === t.rzLgType) && ("all" === t.rzLgImp || r.impact === t.rzLgImp) && ("day" !== t.rzLgScope || r.d === x.D) && this.rzSearchHit(q, r)),
      key = (r) => ("impact" === t.rzSortK ? IMPN[r.impact] || 0 : 100 * r.d + (r.t || "").replace(":", "") / 1e4),
      S = K.slice().sort((a, b) => {
        const p = key(a),
          n = key(b);
        return (p > n ? 1 : p < n ? -1 : (a.lt || "") < (b.lt || "") ? -1 : 1) * (t.rzSortD < 0 ? -1 : 1);
      }),
      pg = this._rzPager(S.length, t.rzLedgerPerPage, t.rzLedgerPage, (k) => this.setState({ rzLedgerPage: k })),
      sortBy = (k) => () => this.setState((s) => ({ rzSortK: k, rzSortD: s.rzSortK === k ? -s.rzSortD : -1, rzLedgerPage: 1 })),
      arr = (k) => (t.rzSortK === k ? (t.rzSortD < 0 ? "↓" : "↑") : "⇅"),
      arrC = (k) => "font-size:11px;color:" + (t.rzSortK === k ? "var(--fg-xb99751)" : "var(--fg-xcbd5e1)"),
      fdd = (id, sk, all, list) => {
        const cur = t[sk],
          open = t.rzLgFddOpen === id,
          hit = list.find((o) => o.v === cur);
        return {
          [id + "Open"]: open,
          [id + "Toggle"]: () => this.setState((s) => ({ rzLgFddOpen: s.rzLgFddOpen === id ? null : id })),
          [id + "Label"]: hit ? hit.name : all,
          [id + "Chev"]: "transition:transform .2s;flex-shrink:0;opacity:.5;" + (open ? "transform:rotate(180deg)" : ""),
          [id + "BtnStyle"]:
            "height:32px;min-width:100px;font-size:11px;border-radius:8px;border:1px " +
            (list[0].v === cur ? "dashed var(--bd-xcbd5e1);color:var(--fg-x475569)" : "solid var(--bd-a185151810p5);color:var(--fg-x9a7e40);font-weight:400") +
            ";background:var(--bg-xffffff);padding:0 10px;cursor:pointer;font-family:'Cairo',sans-serif;display:inline-flex;align-items:center;justify-content:space-between;gap:6px" +
            (open ? ";box-shadow:0 0 0 2px var(--bd-a185151810p15)" : ""),
          [id + "Opts"]: list.map((op) => ({
            name: op.name,
            selected: cur === op.v,
            pick: () => this.setState({ [sk]: op.v, rzLgFddOpen: null, rzLedgerPage: 1 }),
            style:
              "display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;font-size:11px;cursor:pointer;transition:background .15s;" +
              (cur === op.v ? "background:var(--bg-a185151810p08);color:var(--fg-x9a7e40);font-weight:400" : "color:var(--fg-x141414)"),
          })),
        };
      },
      canDel = this.PC("del"),
      tagOf = (c) => "display:inline-flex;align-items:center;font-size:11px;font-weight:700;border-radius:9999px;padding:2px 10px;white-space:nowrap;border:1px solid " + c + ";color:" + c + ";background:color-mix(in srgb," + c + " 10%,transparent)",
      exportRows = () =>
        [["التاريخ", "الموافق هـ", "وقت الوقوع", "وقت الإدخال", "الراصد", "إدارة الرصد", "المنطقة", "المستوى", "الموقع", "النوع", "التأثير", "الإجراء", "الجهة المبلَّغة", "ملاحظات", "مرفق"]].concat(
          S.map((r) => {
            const dc = this.rzDateCells(r);
            return [dc.greg, dc.hij, r.t || "", r.lt || "", r.byName || "—", r.dept || "—", r.zone || "", r.floor || "", r.spot || "", r.type || "", r.impact || "", r.act || "", r.party || "", r.notes || "", r.att ? "نعم" : ""];
          }),
        ),
      fileName = (ext) => "rasd-" + KIVO.BassamCal.fileTag(KIVO.BassamCal.gYm(x.Y, x.M)) + "." + ext,   /* V7 · 53 تقويم: اسمُ الملف ميلادي (rasd-2026-11.xlsx) */
      failMsg = (kind, e) => this.bsToast("تعذّر إنشاء ملف " + kind + " — " + (e && e.message ? e.message : "خطأ غير متوقع") + "."),
      delRec = (r) => {
        if (!this.PC("del")) return void this.permDeny();
        const d = this.loadRasd();
        if (!this.saveRasd({ ...d, reports: (d.reports || []).filter((z) => z.id !== r.id) })) return;
        r.att && this.rzDropImg(r.att);
        this.setState({ rzDelAsk: null, rowMenu: null });
        this.bsAck("حُذفت الحالة", "ok");
      };
    return {
      rzLedgerOpen: !!t.rzLedgerOpen,
      rzLedgerToggle: () => this.setState({ rzLedgerOpen: !this.state.rzLedgerOpen }),
      rzLedgerChev: "transition:transform .2s;flex-shrink:0;" + (t.rzLedgerOpen ? "transform:rotate(180deg)" : ""),
      rzLedgerCount: KIVO.BassamCount(String(V.length), "حالة") + "",
      rzLgSearch: t.rzLgSearch || "",
      rzLgSetSearch: (ev) => this.setState({ rzLgSearch: ev.target.value, rzLedgerPage: 1 }),
      rzLgFilesOpen: !!t.rzLgFilesOpen,
      rzLgFilesToggle: () => this.setState((s) => ({ rzLgFilesOpen: !s.rzLgFilesOpen })),
      rzLgFilesChev: "opacity:.5;transition:transform .2s;" + (t.rzLgFilesOpen ? "transform:rotate(180deg)" : ""),
      rzLgFilesBtnStyle:
        "height:34px;display:flex;align-items:center;gap:6px;font-size:11.5px;border:1px solid var(--bd-xe2e8f0);border-radius:10px;padding:0 10px;cursor:pointer;font-family:'Cairo',sans-serif;background:var(--bg-xffffff);" +
        (t.rzLgFilesOpen ? "color:var(--fg-xb99751);border-color:var(--bd-a185151810p4)" : "color:var(--fg-x475569)"),
      rzLgMonthLabel: ML,
      rzLgShownLbl: KIVO.BassamCount(S.length, "حالة") + "",
      rzLgExportXlsx: () => {
        if (!this.PC("export")) return void this.permDeny();
        try {
          KIVO.BassamXLSX
            ? KIVO.BassamXLSX.download(exportRows(), fileName("xlsx"))
            : this.bsToast("تعذّر تصدير Excel — مكتبة الجداول غير متاحة في هذه الجلسة. حدّث الصفحة وأعد المحاولة، أو استخدم «طباعة / حفظ PDF».");
        } catch (e) {
          failMsg("Excel", e);
        }
        this.setState({ rzLgFilesOpen: !1 });
      },
      rzLgExportCsv: () => {
        if (!this.PC("export")) return void this.permDeny();
        const esc = (v) => {
          const s = String(null == v ? "" : v);
          return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        };
        try {
          const b = new Blob(["﻿" + exportRows().map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8" }),
            u = URL.createObjectURL(b),
            a = document.createElement("a");
          a.href = u;
          a.download = fileName("csv");
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(u), 1500);
        } catch (e) {
          failMsg("CSV", e);
        }
        this.setState({ rzLgFilesOpen: !1 });
      },
      rzLgPrint: () => {
        this.PC("export") && (this.setState({ rzLgFilesOpen: !1 }), setTimeout(() => window.print(), 150));
      },
      ...fdd("rzLgFt", "rzLgType", "نوع الحالة", [{ v: "all", name: "كل الأنواع" }].concat(x.opts.type.map((i) => ({ v: i.n, name: i.n })))),
      ...fdd("rzLgFi", "rzLgImp", "مستوى التأثير", [{ v: "all", name: "كل المستويات" }].concat(this.RZ_IMPACTS.map((v) => ({ v: v, name: v })))),
      ...fdd("rzLgFd", "rzLgScope", "الشهر كاملاً", [{ v: "month", name: "الشهر كاملاً" }, { v: "day", name: "اليوم المحدد" }]),
      rzLgShownCount: String(S.length),
      rzLgTotalCount: String(V.length),
      rzSortDate: sortBy("date"),
      rzSortImp: sortBy("impact"),
      rzArrDate: arr("date"),
      rzArrImp: arr("impact"),
      rzArrDateC: arrC("date"),
      rzArrImpC: arrC("impact"),
      rzLedgerHas: S.length > 0,
      rzLedgerEmpty: 0 === S.length,
      rzLedgerEmptyMsg: 0 === V.length ? "لا حالات مرصودة في هذا الشهر بعد" : "لا حالات تطابق البحث أو الفلترة الحالية",
      rzLedgerRows: S.slice(pg.from, pg.to).map((r) => {
        const dc = this.rzDateCells(r),
          ask = t.rzDelAsk === r.id,
          img = r.att ? this.rzImgUrl(r.att) : "";
        return {
          hij: dc.hij,
          greg: dc.greg,
          time: r.t || "—",
          lgOn: !!r.lt && r.lt !== r.t,
          lg: "أُدخلت " + (r.lt || ""),
          noteOn: !!r.notes,
          note: r.notes || "",
          by: r.byName || "—",
          dept: r.dept || "—",
          zone: r.zone || "—",
          floor: r.floor || "—",
          spot: r.spot || "—",
          type: r.type || "—",
          impact: r.impact || "—",
          impStyle: tagOf(this.RZ_IMP_COL[r.impact] || "var(--fg-x94a3b8)"),
          act: r.act || "—",
          party: r.party || "—",
          attOn: !!r.att,
          attNo: !r.att,
          attImg: img,
          attImgOn: !!img,
          attWait: !!r.att && !img,
          attView: () => img && this.setState({ rzImgView: r.att }),
          askDel: ask,
          notAsk: !ask,
          delYes: () => delRec(r),
          delNo: () => this.setState({ rzDelAsk: null }),
          ...this._rowMenu("rz" + r.id, [canDel ? { name: "حذف الحالة", color: "var(--fg-xdc2626)", danger: !0, run: () => this.setState({ rzDelAsk: r.id }) } : null]),
        };
      }),
      ...KIVO.BassamCount.pair("rzLedgerPgTotal", String(S.length), "حالة", "g"),
      rzLedgerPgRange: pg.range,
      rzLedgerPgNums: pg.nums,
      rzLedgerPerPage: String(pg.per),
      rzLedgerOnPerPage: (ev) => this.setState({ rzLedgerPerPage: 0 === +ev.target.value ? 0 : +ev.target.value || 10, rzLedgerPage: 1 }),
      rzLedgerPgFirst: () => this.setState({ rzLedgerPage: 1 }),
      rzLedgerPgPrev: () => this.setState({ rzLedgerPage: Math.max(1, pg.page - 1) }),
      rzLedgerPgNext: () => this.setState({ rzLedgerPage: Math.min(pg.pages, pg.page + 1) }),
      rzLedgerPgLast: () => this.setState({ rzLedgerPage: pg.pages }),
      rzLedgerPgFirstStyle: pg.navStyle(pg.page > 1),
      rzLedgerPgPrevStyle: pg.navStyle(pg.page > 1),
      rzLedgerPgNextStyle: pg.navStyle(pg.page < pg.pages),
      rzLedgerPgLastStyle: pg.navStyle(pg.page < pg.pages),
      rzImgViewOn: !!t.rzImgView,
      rzImgViewUrl: t.rzImgView ? this.rzImgUrl(t.rzImgView) : "",
      rzImgViewClose: () => this.setState({ rzImgView: null }),
    };
  }
}
