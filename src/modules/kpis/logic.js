class Component extends DCLogic {
  state = { ktab: null, tkY: 0, tkM: 0 };
  _okOf(n, t) {
    try {
      const r = KIVO.BassamPerm;
      /* KIVO_265 · البند 17: لوحةُ «مؤشرات المهام» لمن يرى صفحةَ المهام (tasks · view) — لا ورقةَ جديدة في الشجرة */
      if ("tkKpi" === t) return !r || !r.can ? !0 : !!r.can("tasks", "view");
      if (r && r.kpiPanelOk) return !!r.kpiPanelOk(n, t);   /* KIVO_261: المصدرُ الواحد مع رابط القائمة (334) */
      if (r && r.canSub && !r.canSub(n, t, "view")) return !1;
      const L = (k) => !r || !r.on || !!r.on(k);
      if ("kpiOcc" === t) return L("zones") && L("dens");
      if ("kpiZones" === t) return L("zones");
      if ("kpiDaily" === t) return !r || !r.can || !!r.can("dreport", "view");
      return !0;
    } catch (n) {
      return !0;
    }
  }
  renderVals() {
    const n = this,
      t = [
        { k: "read", pk: "planning", sk: "readiness" },
        { k: "dy", pk: "daily", sk: "kpiDaily" },
        { k: "occ", pk: "daily", sk: "kpiOcc" },
        { k: "zn", pk: "daily", sk: "kpiZones" },
        { k: "sz", pk: "seized", sk: "dash" },
        { k: "ir", pk: "irshad", sk: "dash" },
        { k: "tk", pk: "tasks", sk: "tkKpi" },
        { k: "dsh", pk: "dstats", sk: "anHaram" },
        { k: "dsn", pk: "dstats", sk: "anNabawi" },
        { k: "dsc", pk: "dstats", sk: "anCmp" },
        { k: "dst", pk: "dstats", sk: "anTime" },
      ],
      r = {};
    t.forEach(function (t) {
      r[t.k] = n._okOf(t.pk, t.sk);
    });
    const i = t.filter(function (n) {
      return r[n.k];
    });
    let o = this.state.ktab;
    (o && r[o]) || (o = i.length ? i[0].k : "");
    const e = { noneOn: !i.length, stripOn: i.length > 1 };
    return (
      t.forEach(function (t) {
        const i = o === t.k;
        ((e["ok_" + t.k] = r[t.k]),
          (e["on_" + t.k] = i && r[t.k]),
          (e["st_" + t.k] = (function (n) {
            return (
              "position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 16px;border-radius:12px;transition:all .3s;flex-shrink:0;min-width:170px;cursor:pointer;font-family:'Cairo',sans-serif;border:1px solid " +
              (n
                ? "rgba(185,151,81,0.45);background:var(--bg-xffffff);box-shadow:0 3px 10px -4px rgba(138,111,53,0.45)"
                : "transparent;background:transparent")
            );
          })(i)),
          (e["ic_" + t.k] = (function (n) {
            return (
              "width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;transition:all .3s;" +
              (n
                ? "background:var(--bg-a185151810p1);color:var(--fg-xb99751)"
                : "background:var(--bg-a2452452450p9);color:var(--fg-x94a3b8)")
            );
          })(i)),
          (e["lb_" + t.k] = (function (n) {
            return (
              "font-size:12px;transition:color .3s;" +
              (n ? "font-weight:600;color:var(--fg-xb99751)" : "font-weight:400;color:var(--fg-x53565a)")
            );
          })(i)),
          (e["go_" + t.k] = function () {
            n.setState({ ktab: t.k });
          }));
      }),
      e.on_tk && this._tkKpiVals(e),
      e
    );
  }
  /* ═══ KIVO_265 · البند 17 — ربطُ الأداء بمؤشرات الأداء: مؤشراتُ المهام للشهر الهجري من مخزن المهام المحلي للإدارة ═══
     المصدر: localStorage «bassam_tasks_v1» (يُحوَّل في 320 إلى bsdept:<الإدارة النشطة>:bassam_tasks_v1 — المخزنُ نفسُه الذي تقرؤه صفحةُ المهام)
     = {"Y-M-D" هجري: [صفوف]} — أعمدةُ الصفّ: 3 الحالة · 6 الأداء [code,txt] · 11 وقتُ القبول/البدء · 15 البداية · 21 الإثبات {imgs, note}.
     المؤشراتُ (نقيّة — للاختبار): الإنجازُ في الوقت = on_time/early من المنجزة · التأخرُ = late من المنجزة · الالتزامُ بالتوثيق = منجزةٌ بإثبات
     (صورةٌ أو ملاحظة) من المنجزة · متوسطُ زمن القبول = متوسط (11 − 15) للمقبولة (سالبٌ = بدءٌ قبل الموعد). لا كتابةَ ولا طلبَ خادم */
  _tkStore() {
    try {
      const r = localStorage.getItem("bassam_tasks_v1"),
        t = r ? JSON.parse(r) : null;
      return t && "object" === typeof t && !Array.isArray(t) ? t : {};
    } catch (n) {
      return {};
    }
  }
  _tkKpi(S, Y, M) {
    const o = { n: 0, done: 0, on: 0, late: 0, doc: 0, docImg: 0, acc: 0, accSum: 0, dec: 0, open: 0, can: 0 };
    Object.keys(S || {}).forEach((k) => {
      const p = k.split("-");
      if (3 !== p.length || +p[0] !== Y || +p[1] !== M || !Array.isArray(S[k])) return;
      S[k].forEach((r) => {
        if (!Array.isArray(r)) return;
        /* الموجة 1 · DG-01 (كصفحة المهام): الملغاةُ ونسخةُ «أُعيد إسنادها» ليست «مفتوحة» — خارج العدّ (تُذكر الملغاةُ في السطر وحدها) */
        const x = r[23] && "object" === typeof r[23] ? r[23] : null;
        if (x && ("cancelled" === x.asg || "reassigned" === x.asg)) return void ("cancelled" === x.asg && o.can++);
        o.n++;
        const st = r[3],
          pf = Array.isArray(r[6]) ? r[6][0] : "",
          pr = r[21] && "object" === typeof r[21] ? r[21] : null,
          im = pr && Array.isArray(pr.imgs) ? pr.imgs.length : 0;
        if ("done" === st) {
          (o.done++, ("on_time" === pf || "early" === pf) && o.on++, "late" === pf && o.late++);
          pr && (im || String(pr.note || "").trim()) && o.doc++;
          im && o.docImg++;
        } else "declined" === st ? o.dec++ : o.open++;
        "number" === typeof r[11] && "number" === typeof r[15] && r[11] > 0 && r[15] > 0 && (o.acc++, (o.accSum += r[11] - r[15]));
      });
    });
    const pct = (a, b) => (b ? Math.round((100 * a) / b) : null);
    return Object.assign(o, { onPct: pct(o.on, o.done), latePct: pct(o.late, o.done), docPct: pct(o.doc, o.done), accAvg: o.acc ? Math.round(o.accSum / o.acc / 6e4) : null });
  }
  _tkNow() {
    try {
      const H = KIVO.BassamHijri;
      if (H && H.now) return H.now();
      const q = {};
      new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { timeZone: "Asia/Riyadh", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(new Date()).forEach((t) => (q[t.type] = +t.value));
      return { y: q.year, m: q.month, d: q.day };
    } catch (t) {
      return { y: 1447, m: 1, d: 1 };
    }
  }
  _tkDur(m) {
    const a = Math.abs(m),
      h = Math.floor(a / 60),
      d = a % 60;
    return (h ? h + " س" : "") + (h && d ? " " : "") + (d || !h ? d + " د" : "");
  }
  /* الألوانُ دلاليةٌ وحدها (--success-text · --warning-text · --danger-text) — والفارغُ (لا منجزة) بلا لون */
  _tkTone(v, good, mid, inv) {
    if (null == v) return "var(--text-muted)";
    const ok = inv ? v <= good : v >= good,
      md = inv ? v <= mid : v >= mid;
    return ok ? "var(--success-text)" : md ? "var(--warning-text)" : "var(--danger-text)";
  }
  _tkKpiVals(e) {
    const s = this.state,
      T = this._tkNow(),
      Y = s.tkY || T.y,
      M = s.tkM || T.m,
      HM = ["محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"],
      k = this._tkKpi(this._tkStore(), Y, M),
      P = (v) => (null == v ? "—" : v + "٪");
    ((e.tkKpiTitle = HM[M - 1] + " " + Y + (Y === T.y && M === T.m ? " — الشهر الحالي" : "")),
      (e.tkKpiSub = k.n ? k.n + " مهمة · " + k.done + " منجزة · " + k.open + " مفتوحة · " + k.dec + " معتذَر عنها" + (k.can ? " · " + k.can + " ملغاة (خارج الحساب)" : "") : ""),
      (e.tkKpiEmpty = !k.n),
      (e.tkKpiNoDone = !!k.n && !k.done),
      (e.tkKpiPrev = () => {
        let t = M - 1,
          y = Y;
        (t < 1 && ((t = 12), y--), this.setState({ tkM: t, tkY: y }));
      }),
      (e.tkKpiNext = () => {
        let t = M + 1,
          y = Y;
        (t > 12 && ((t = 1), y++), this.setState({ tkM: t, tkY: y }));
      }),
      (e.tkKpiCards = [
        { t: "الإنجاز في الوقت", v: P(k.onPct), sub: k.done ? k.on + " من " + k.done + " منجزة (في الوقت أو مبكرة)" : "لا مهام منجزة", c: this._tkTone(k.onPct, 80, 60) },
        { t: "التأخر", v: P(k.latePct), sub: k.done ? k.late + " من " + k.done + " منجزة متأخرة" : "لا مهام منجزة", c: this._tkTone(k.latePct, 10, 25, !0) },
        { t: "الالتزام بالتوثيق", v: P(k.docPct), sub: k.done ? k.doc + " من " + k.done + " بإثبات — منها " + k.docImg + " بصورة" : "لا مهام منجزة", c: this._tkTone(k.docPct, 90, 70) },
        {
          t: "متوسط زمن القبول",
          v: null == k.accAvg ? "—" : k.accAvg < 0 ? "قبل الموعد بـ" + this._tkDur(k.accAvg) : this._tkDur(k.accAvg),
          sub: k.acc ? "من موعد البداية إلى البدء · " + k.acc + " مهمة مقبولة" : "لا مهام مقبولة",
          c: this._tkTone(k.accAvg, 30, 120, !0),
        },
      ]));
  }
}
