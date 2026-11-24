  /* الأداء عند الإنهاء — القاعدة نفسها المستعملة في صفحة المهام (perfOf) */
  /* KIVO_265 · نافذةُ التنفيذ: الأداءُ من المهلة بنموذج الواجهة (546 perf) — وبلا النموذج (بلا خادم) القاعدةُ القديمة */
  _tkPerfRow(r, fin) {
    if (!r) return null;
    const M = KIVO.BassamTaskModel;
    return M && M.perf ? M.perf(r, fin) : this._tkPerf(r[11], fin, r[10]);
  }
  _tkPerf(t, e, n) {
    if (!t || !e || !n) return null;
    const a = 6e4 * n,
      r = t + a - e,
      s = (t) => {
        const e = Math.floor(Math.abs(t) / 6e4),
          n = Math.floor(e / 60),
          a = e % 60;
        return (n ? n + " س" : "") + (n && a ? " " : "") + (a || !n ? a + " د" : "");
      };
    return r <= -6e4 ? ["late", "متأخر " + s(r)] : r >= 0.1 * a ? ["early", "مبكر بـ " + s(r)] : ["on_time", "في الوقت"];
  }
  /* مهامي: كل صفٍّ في المخزن مسنَدٌ إليّ بمعرّفي الثابت وحده (العمود 14) — KIVO_264 · D16: لا مطابقةَ بالاسم للمهام القديمة
     (كانت تُظهر مهمةَ سَميٍّ لغير صاحبها، والخادمُ يرفض كتابتها أصلاً — 018-ancestry.js)؛ KIVO-Tasks: والمصدرُ الذاتي (KIVO.BassamMyTasks ⇐
     GET /api/me/tasks) لا يحمل إلا صفوفي — الخادمُ طابقها بمعرّفي الثابت — فكلُّها لي */
  _tkMine(t) {
    const e = this._tkAll(),
      s = t.myToks || [],
      mt = !!KIVO.BassamMyTasks,
      r = [];
    return (
      Object.keys(e).forEach((t) => {
        const i = t.split("-");
        3 === i.length &&
          (e[t] || []).forEach((e, o) => {
            if (!Array.isArray(e)) return;
            (mt || (null != e[14] && "" !== e[14] && -1 !== s.indexOf(String(e[14])))) && r.push({ day: t, y: +i[0], m: +i[1], d: +i[2], i: o, r: e });
          });
      }),
      r
    );
  }
  /* بدءُ التنفيذ (start — والاسمُ القديم accept باقٍ في الخادم) — ويُثبت الاستلامَ معه إن لم يُؤكَّد قبله */
  tkAccept(t, e) {
    return this._tkAct(t, e, "start").then((r) =>
      r.ok ? (this.setState({ tkFocus: t + "#" + e }), this.bsAck("بدأتَ التنفيذ وبدأ العدّ — وفّقك الله", "ok")) : this.bsToast(r.msg, "warn"),
    );
  }
  /* KIVO_264 · المرحلة الثانية — تأكيدُ الاستلام مستقلٌّ عن بدء التنفيذ (ack) · والاستئنافُ بعد الإبلاغ بالتعثّر (resume) */
  tkAck(t, e) {
    this._tkAct(t, e, "ack").then((r) =>
      r.ok
        ? (this.setState({ tkFocus: t + "#" + e }), this.bsAck("أكّدتَ استلام المهمة — ابدأ التنفيذ في وقتها", "ok"))
        : this.bsToast(r.msg, "warn"),
    );
  }
  tkResume(t, e) {
    this._tkAct(t, e, "resume").then((r) =>
      r.ok ? (this.setState({ tkFocus: t + "#" + e }), this.bsAck("استُؤنفت المهمة — أكمل التنفيذ", "ok")) : this.bsToast(r.msg, "warn"),
    );
  }
  /* سجلُّ مهمةٍ واحدة (GET /api/me/tasks/log): أحداثُ صفّي وحده بفاعلٍ ووقت — «رجوع» يعيد إلى ما فُتح منه */
  tkTlOpen(t, e, b) {
    const MT = KIVO.BassamMyTasks,
      r = (this._tkAll()[t] || [])[e];
    if (!MT || !r || !r.__x) return;
    const k = t + "#" + e;
    this.setState({ pfPanel: "tktl", tkTl: { key: k, title: r[0] || "مهمة", st: "loading", ev: [], back: b || "" } });
    MT.log(r.__x).then((q) => {
      const c = this.state.tkTl;
      c && c.key === k && this._pfAlive && this.setState({ tkTl: Object.assign({}, c, { st: q.ok ? "ok" : "err", ev: q.events || [] }) });
    });
  }
  tkDeclineOpen(t, e, m) {
    if (!this._pfCanLeaveDraft()) return;
    this.setState({ pfPanel: "tkdec", tkRef: { day: t, idx: e }, tkWhy: "", tkWhyTxt: "", tkMode: "stall" === m ? "stall" : "" });
  }
  tkDecline() {
    const t = this.state,
      e = t.tkRef;
    if (!e) return;
    const st = "stall" === t.tkMode,
      s = ("أخرى" === t.tkWhy ? String(t.tkWhyTxt || "").trim() : t.tkWhy) || "";
    if (!s) return void this.bsToast(st ? "اختر سبب التعثّر أولاً" : "اختر سبب الاعتذار أولاً", "warn");
    /* التعثّر: المهمة باقيةٌ للموظف ويصل سببُه المسؤولَ فوراً — يستأنفها متى زال السبب (الخادمُ وحده: لا مسارَ محلياً) */
    if (st)
      return void this._tkAct(e.day, e.idx, "stall", { why: s.slice(0, 200) }).then((r) =>
        r.ok
          ? (this.setState({ pfPanel: "", tkRef: null, tkMode: "", tkFocus: e.day + "#" + e.idx }),
            this.bsAck("وصل بلاغُ التعثّر للمسؤول — استأنف المهمة متى زال السبب", "ok"))
          : this.bsToast(r.msg, "warn"),
      );
    return this._tkAct(e.day, e.idx, "decline", { why: s.slice(0, 200) }).then((r) =>
      r.ok
        ? (this.setState({ pfPanel: "", tkRef: null, tkFocus: null }), this.bsAck("وصل اعتذارك للمدير — وستُعاد المهمة لغيرك", "ok"))
        : this.bsToast(r.msg, "warn"),
    );
  }
  tkFinishOpen(t, e) {
    if (!this._pfCanLeaveDraft()) return;
    /* KIVO_264: المسودّةُ المحفوظة (أو ملاحظةُ التسليم المُعاد) تُستكمل لا تُكتب من جديد */
    const r = (this._tkAll()[t] || [])[e],
      x = r && r.__x;
    this.setState({
      pfPanel: "tkfin",
      tkRef: { day: t, idx: e },
      tkImgs: [],
      tkMeta: [],
      tkNote: x && x.proof ? String(x.proof.note || "") : "",
      tkImgErr: "",
      tkSteps: {},
      tkRm: [],
    });
    this._tkGeo();   /* KIVO_265 · البند 18: طلبُ الموقع مع فتح النافذة — فلا ينتظره الالتقاطُ الأول */
  }
  /* KIVO_265 · البند 18 — ختمُ الإثبات: الموقعُ يُطلب مرةً واحدة (مهلةُ 5 ثوانٍ) ويُعاد استعمالُه 10 دقائق؛ الرفضُ أو التعذّر ⇒ null («بلا موقع»)
     ولا يمنع التوثيق — الموقعُ شاهدٌ إضافي لا شرط */
  _tkGeo() {
    const g = this._tkGeoC;
    if (g && g.p && (g.v === undefined || Date.now() - g.at < 6e5)) return g.p;
    const c = (this._tkGeoC = { at: Date.now() });
    c.p = new Promise((res) => {
      let done = !1;
      const fin = (v) => {
        done || ((done = !0), (c.v = v), (c.at = Date.now()), res(v));
      };
      try {
        const G = typeof navigator !== "undefined" && navigator.geolocation;
        if (!G || !G.getCurrentPosition) return fin(null);
        G.getCurrentPosition(
          (p) => fin(p && p.coords ? { lat: +p.coords.latitude.toFixed(5), lng: +p.coords.longitude.toFixed(5), acc: Math.round(p.coords.accuracy || 0) } : null),
          () => fin(null),
          { enableHighAccuracy: !0, timeout: 5e3, maximumAge: 6e5 },
        );
        setTimeout(() => fin(null), 5500);
      } catch (t) {
        fin(null);
      }
    });
    return c.p;
  }
  /* سطرا الختم (نقيّان — للاختبار): ١) التاريخُ الهجري والميلادي والساعة بالرياض · الإحداثيات (أو «بلا موقع») ٢) اسمُ الموظف · عنوانُ المهمة */
  _tkStampLines(now, geo, name, title) {
    const d = new Date(now || Date.now()),
      tz = "Asia/Riyadh";
    let h = "",
      g = "",
      c = "";
    try {
      const P = (loc, o) => {
        const q = {};
        new Intl.DateTimeFormat(loc, Object.assign({ timeZone: tz }, o)).formatToParts(d).forEach((p) => (q[p.type] = p.value));
        return q;
      };
      const H = KIVO.BassamCal.hOf(KIVO.BassamCal.gAt(d).k) || {},   /* V7 · 53 تقويم: الهجريُّ المقابل سطرٌ تابع للميلادي */
        G = P("en-u-nu-latn", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
      ((h = H.d + "/" + H.m + "/" + H.y + "هـ"), (g = G.day + "/" + G.month + "/" + G.year + "م"), (c = G.hour + ":" + G.minute));
    } catch (t) {
      g = d.toISOString().slice(0, 16).replace("T", " ");
    }
    const loc =
      geo && "number" === typeof geo.lat && "number" === typeof geo.lng
        ? geo.lat.toFixed(5) + ", " + geo.lng.toFixed(5) + (geo.acc ? " (±" + Math.round(geo.acc) + " م)" : "")
        : "بلا موقع";
    return [[g, h, c].filter(Boolean).join(" · ") + " · " + loc,   /* V7 · 53 تقويم: الميلاديُّ أولاً ثم الهجري */ [String(name || "").trim(), String(title || "").trim()].filter(Boolean).join(" · ") || "توثيق مهمة"];
  }
  /* الرسمُ على اللوحة نفسِها قبل الترميز: شريطٌ سفليٌّ داكن وسطران أبيضان من اليمين — فالصورةُ المرفوعة تحمل الختمَ في بكسلاتها لا في الواجهة */
  _tkStampDraw(cv, lines) {
    const x = cv.getContext("2d"),
      w = cv.width,
      hh = cv.height,
      fs = Math.max(13, Math.round(Math.min(w, hh) * 0.03)),
      pad = Math.round(0.6 * fs),
      lh = Math.round(1.45 * fs),
      bh = 2 * pad + lh * lines.length;
    x.save();
    ((x.fillStyle = "rgba(0,0,0,0.58)"), x.fillRect(0, hh - bh, w, bh));
    ((x.fillStyle = "#fff"), (x.font = "bold " + fs + "px Cairo, Arial, sans-serif"), (x.textAlign = "right"), (x.textBaseline = "middle"));
    try {
      x.direction = "rtl";
    } catch (t) {}
    lines.forEach((t, i) => x.fillText(this._tkFitText(x, t, w - 2 * pad), w - pad, hh - bh + pad + lh * i + lh / 2));
    x.restore();
    return cv;
  }
  _tkFitText(x, t, mw) {
    let s = String(t);
    for (; s.length > 4 && x.measureText(s).width > mw; ) s = s.slice(0, -2);
    return s === String(t) ? s : s + "…";
  }
  /* سقفُ الصور الجديدة في الجولة: 4 — وحدُّ المهمة كلِّها 12 (الخادم: TK_IMG_TOTAL) بعد ما يُحذف من المسودّة */
  _tkImgCap() {
    const s = this.state,
      e = s.tkRef,
      r = e ? (this._tkAll()[e.day] || [])[e.idx] : null,
      p = r && r.__x && r.__x.proof,
      k = p && Array.isArray(p.imgs) ? p.imgs.filter((q) => (s.tkRm || []).indexOf(q) < 0).length : 0;
    return Math.max(0, Math.min(4, 12 - k));
  }
  onTkPick(t) {
    const e = t && t.target,
      s = e && e.files ? [...e.files] : [];
    try {
      e && (e.value = "");
    } catch (t) {}
    if (!s.length) return;
    const n = (this.state.tkImgs || []).length,
      cp = this._tkImgCap(),
      a = s.slice(0, Math.max(0, cp - n));
    if (!a.length)
      return void this.bsToast(cp < 4 ? "بلغت المهمةُ حدَّ صور التوثيق (12)" : "بلغت أربع صور — احذف صورةً لإضافة غيرها", "warn");
    (this.setState({ tkImgErr: "" }), a.forEach((t) => this._tkReadImg(t)));
  }
  /* قراءة صورةٍ واحدة: عرضٌ ثم ضغط. الآيفون قد يعطي HEIC فلا يفكّها <img> — فيُجرَّب createImageBitmap ثم يُصرَّح بالخطأ */
  _tkReadImg(t) {
    if (!t) return;
    if (!/^image\//.test(t.type || "") && !/\.(jpe?g|png|webp|heic|heif)$/i.test(t.name || ""))
      return void this.setState({ tkImgErr: "الملف «" + (t.name || "") + "» ليس صورة" });
    const e = KIVO.BassamBusy,
      s = e ? e.start("جارٍ تجهيز صورة التوثيق…", { sub: e.fmtBytes(t.size || 0), btn: null }) : null;
    let n = !1;
    const a = () => {
        n || ((n = !0), s && s.done());
      },
      i = (t) => {
        (a(), this.setState({ tkImgErr: t }), this.bsToast(t, "warn"));
      },
      o = (t, e, n) => {
        try {
          const a = Math.min(1, 1600 / Math.max(e, n)),
            i = Math.max(1, Math.round(e * a)),
            o = Math.max(1, Math.round(n * a)),
            r = document.createElement("canvas");
          ((r.width = i), (r.height = o));
          const l = r.getContext("2d");
          ((l.fillStyle = "#fff"), l.fillRect(0, 0, i, o), l.drawImage(t, 0, 0, i, o));
          return r;
        } catch (t) {
          return null;
        }
      },
      enc = (cv) => {
        try {
          let d = 0.82,
            c = cv.toDataURL("image/jpeg", d);
          for (; c.length > 9e5 && d > 0.4; ) ((d -= 0.1), (c = cv.toDataURL("image/jpeg", d)));
          return c;
        } catch (t) {
          return "";
        }
      },
      /* KIVO_265 · البند 18: بعد التصغير وقبل الترميز يُختم الشريطُ السفلي (التاريخ والوقت · الموقع أو «بلا موقع» · الاسم · المهمة) على اللوحة —
         فالمرفوعُ يحمله مرئياً؛ والبياناتُ الوصفية نفسُها تُحفظ مع الصورة (tkMeta ⇒ r21.meta) ليقرأها المسؤول */
      r = (cv) => {
        if (!cv) return void i("تعذّر تجهيز الصورة — جرّب صورة أخرى");
        this._tkGeo().then((g) => {
          if (n) return;
          const at = Date.now(),
            ref = this.state.tkRef,
            row = ref ? (this._tkAll()[ref.day] || [])[ref.idx] : null,
            u = this.me(),
            nm = (u && u.name) || (this.myRec() || {}).name || "",
            c = enc(this._tkStampDraw(cv, this._tkStampLines(at, g, nm, row ? row[0] : "")));
          if (!c) return void i("تعذّر تجهيز الصورة — جرّب صورة أخرى");
          const m = { at, lat: g ? g.lat : null, lng: g ? g.lng : null, acc: g ? g.acc : null };
          (a(), this.setState((e) => ({ tkImgs: [...(e.tkImgs || []), c].slice(0, 4), tkMeta: [...(e.tkMeta || []), m].slice(0, 4), tkImgErr: "" })));
        });
      },
      l = () => {
        try {
          if (!window.createImageBitmap) return void i("صيغة الصورة غير مدعومة في هذا المتصفح — اختر صورة بصيغة JPG أو PNG");
          createImageBitmap(t).then(
            (t) => {
              r(o(t, t.width, t.height));
              try {
                t.close && t.close();
              } catch (t) {}
            },
            () => i("تعذّر فتح الصورة — قد تكون بصيغة HEIC؛ اختر صورة بصيغة JPG أو PNG"),
          );
        } catch (t) {
          i("تعذّر فتح الصورة — جرّب صورة أخرى");
        }
      },
      d = new FileReader();
    ((d.onerror = () => i("تعذّرت قراءة الصورة من الجهاز — أعد المحاولة")),
      (d.onload = () => {
        const t = new Image();
        ((t.onload = () => {
          t.width && t.height ? r(o(t, t.width, t.height)) : l();
        }),
          (t.onerror = () => l()),
          (t.src = d.result));
      }),
      setTimeout(() => {
        n || i("تأخّر تجهيز الصورة — جرّب صورة أصغر");
      }, 2e4));
    try {
      d.readAsDataURL(t);
    } catch (e) {
      l();
    }
  }
  tkRmImg(t) {
    this.setState((e) => ({ tkImgs: (e.tkImgs || []).filter((e, s) => s !== t), tkMeta: (e.tkMeta || []).filter((e, s) => s !== t), tkImgErr: "" }));
  }
  tkFinish(m) {
    const state = this.state, ref = state.tkRef;
    if (!ref) return;
    return this._tkSubmit(ref, state.tkImgs || [], "doc" === m);
  }
  /* KIVO_264 · المرحلة الثانية — التوثيقُ والتسليم بسياسة المهمة (ق2: صورةٌ أو ملاحظة افتراضاً · أو ما حدّده المسؤول + خطواتُ العمل):
     «حفظ مسودّة» (doc) أو «تسليم» (submit: للمراجِع إن وُجد ⇒ «بانتظار المراجعة»، وإلا إنجاز). الصورُ الجديدة تُرفع أولاً ثم الفعلُ بمعرّفاتها؛
     المحفوظةُ في الخادم تبقى (تُضاف لا تُستبدل) إلا ما يحذفه الموظف من مسودّته. الحكمُ للخادم — والفشلُ يُعلَن فشلاً */
  _tkSubmit(e, s, doc) {
    const t = this.state,
      MT = KIVO.BassamMyTasks,
      R = (this._tkAll()[e.day] || [])[e.idx],
      x = R && R.__x;
    if (!x) return void this.bsToast("تعذّر الحفظ — حدّث الصفحة وأعد المحاولة", "warn");
    if (t.tkBusy) return;
    const note = String(t.tkNote || "").trim(),
      rm = (t.tkRm || []).slice(),
      st = this._tkStepsOf(x, t.tkSteps),
      nd = this._tkNeed(x, s, note, st, rm);
    if (!doc && !nd.ok) return void this.bsToast(nd.why, "warn");
    this.setState({ tkBusy: !0 });
    const pendingKey = x.k + "#" + x.id;
    (this._pfSelfDrafts || (this._pfSelfDrafts = new Set())).add(pendingKey);
    const b = { note: note.slice(0, 1e3) };
    (nd.steps.length && (b.steps = st), rm.length && (b.rm = rm));
    /* KIVO_265 · البند 9: الصورُ ثم الفعل في 545 (submitProof) — معرّفاتُ الصور تُولَّد هناك وتُربط بوصفيّتها (البند 18)؛ وبلا اتصالٍ يُصطفّ الكلُّ محلياً */
    Promise.resolve(MT.submitProof(x, doc ? "doc" : "submit", b, s, t.tkMeta || [])).then(
      (r) => {
        const ids = r.imgs || [];
        return Promise.resolve(r).then((r) => {
          (this.setState({ tkBusy: !1 }), this._tkAfter(r, pendingKey));
          if (!r.ok) return void this.bsToast(r.msg, "warn");
          ((this._tkImgCache = Object.assign(this._tkImgCache || {}, Object.fromEntries(ids.map((q, i) => [q, s[i]])))),
            /* KIVO_265 · P1: المسلَّمةُ (منجزةً أو للمراجعة) تخرج من «الحالية» فيُمسح tkFocus — مفتاحُه «يوم#فهرس»، فإن بقي وانزاحت الفهارس
               (حذفُ صفٍّ قبله) ثبّت صفّاً آخر «الأهم الآن». المسودّةُ تُبقيه */
            this.setState({ pfPanel: "", tkRef: null, tkImgs: [], tkMeta: [], tkNote: "", tkSteps: {}, tkRm: [], tkFocus: doc ? e.day + "#" + e.idx : null }),
            this.bsAck(
              doc
                ? "حُفظ التوثيق مسودّةً — سلّمه حين يكتمل"
                : nd.review
                  ? "سُلّمت المهمة للمراجعة — يصل توثيقُك " + (nd.rv || "المسؤول") + " وتصلك النتيجة في الجرس"
                  : "أُنجزت المهمة ووصل توثيقك للمدير — شكراً لجهدك",
              "ok",
            ));
        });
      },
      (q) => {
        (this.setState({ tkBusy: !1 }), this.bsToast("لم تُرفع الصورة — " + ((q && q.message) || "تعذّر الرفع") + " · أعد المحاولة", "warn"));
      },
    );
  }
  /* خطواتُ العمل: ما وُثّق في الخادم + ما غيّره الموظف الآن ⇒ {الخطوة: أُنجزت؟} */
  _tkStepsOf(x, ch) {
    const P = (x && x.pol) || {},
      dn = (x && x.proof && x.proof.st) || [],
      o = {};
    (P.steps || []).forEach((k) => {
      o[k] = ch && Object.prototype.hasOwnProperty.call(ch, k) ? !!ch[k] : dn.indexOf(k) >= 0;
    });
    return o;
  }
  /* ما يتطلبه التسليمُ الآن (545 need — مرآةُ فحص الخادم) على المحفوظ بعد ما يُحذف من المسودّة + الجديد */
  _tkNeed(x, s, note, st, rm) {
    const p = x.proof || {},
      y = Object.assign({}, x, { proof: Object.assign({}, p, { imgs: (p.imgs || []).filter((q) => (rm || []).indexOf(q) < 0), st: [] }) });
    return KIVO.BassamMyTasks.need(y, { imgs: s, note: note, steps: st });
  }
  /* KIVO_264 · المرحلة الثانية — قيمُ المنبثقات: «التوثيق والتسليم» بسياسة المهمة (المطلوب · خطواتُ العمل · المحفوظ — والمسلَّمُ سابقاً لا يُحذف ·
     مسودّة/تسليم) · نافذةُ الاعتذار نفسُها للإبلاغ بالتعثّر · سجلُّ المهمة الواحدة. وضعُ المتصفح بلا خادم (لا x) يبقى على نصوص المرحلة الأولى */
  _tkP2Panels(t, s, D) {
    const MT = KIVO.BassamMyTasks,
      x = D && D.r && D.r.__x && MT ? D.r.__x : null,
      im = s.tkImgs || [],
      stl = "stall" === s.tkMode;
    ((t.tkBusyOn = !!s.tkBusy),
      (t.tkFinHead = "إنهاء المهمة وتوثيقها"),
      (t.tkFinPol = ""),
      (t.tkFinRet = ""),
      (t.tkFinStepsOn = !1),
      (t.tkFinSteps = []),
      (t.tkFinOld = []),
      (t.tkFinOldOn = !1),
      (t.tkFinOldTxt = ""),
      (t.tkFinDraftOn = !1),
      (t.tkFinDraft = () => this.tkFinish("doc")),
      (t.tkFinHint = im.length ? "" : "صورة واحدة على الأقل مطلوبة لإنهاء المهمة"),
      (t.tkNotePh = "ملاحظة للمدير (اختياري)… ماذا أنجزت وما يلزم متابعته"),
      (t.tkDecStall = stl),
      (t.tkDecDec = !stl),
      (t.tkDecHead = stl ? "الإبلاغ بتعثّر المهمة" : "الاعتذار عن المهمة"),
      (t.tkDecSub = stl ? "يصل السبب للمسؤول فوراً — والمهمة باقيةٌ لك تستأنفها متى زال السبب" : "يصل السبب للمدير فوراً وتُعاد المهمة لغيرك"),
      (t.tkDecLbl = stl ? "سبب التعثّر" : "سبب الاعتذار"));
    stl &&
      (t.tkWhys = ["نقصٌ في المواد أو الأدوات", "بانتظار جهةٍ أخرى", "عطلٌ في الموقع", "ظرف طارئ", "أخرى"].map((e) => ({
        t: e,
        cls: "pf-whychip" + (s.tkWhy === e ? " on" : ""),
        pick: () => this.setState({ tkWhy: e }),
      })));
    if (x) {
      const P = x.pol || { m: "any", n: 1, steps: [] },
        pr = x.proof || {},
        rmL = s.tkRm || [],
        all = Array.isArray(pr.imgs) ? pr.imgs : [],
        /* المسلَّمُ في جولاتٍ سابقة (h) بادئةُ القائمة دائماً: الإضافةُ تُلحق والحذفُ للمسودّة وحدها (الخادم: img-locked) */
        lk = Array.isArray(pr.h) ? Math.min(all.length, pr.h.reduce((q, h) => q + ((h && h.n) || 0), 0)) : pr.sub ? all.length : 0,
        stp = this._tkStepsOf(x, s.tkSteps),
        nd = this._tkNeed(x, im, String(s.tkNote || "").trim(), stp, rmL),
        ret = "returned" === D.st;
      ((t.tkFinHead = ret ? "استكمال الإثبات وإعادة التسليم" : "التوثيق والتسليم"),
        (t.tkFinPol =
          "المطلوب للتسليم: " + (nd.txt || "صورةٌ أو ملاحظة") + (nd.review ? " · يراجعها " + (nd.rv || "المسؤول") : " · تُعدّ منجزةً عند التسليم")),
        (t.tkFinRet = ret && x.revd ? "أعادها " + (x.revd.by || "المراجِع") + ": «" + (x.revd.why || "—") + "»" : ""),
        (t.tkFinStepsOn = (P.steps || []).length > 0),
        (t.tkFinSteps = (P.steps || []).map((k) => ({
          t: (stp[k] ? "✓ " : "") + k,
          cls: "pf-whychip" + (stp[k] ? " on" : ""),
          tog: () => this.setState((q) => ({ tkSteps: Object.assign({}, q.tkSteps || {}, { [k]: !stp[k] }) })),
        }))),
        (t.tkFinOld = all
          .map((q, j) => ({ q, j }))
          .filter((o) => rmL.indexOf(o.q) < 0)
          .map((o) => {
            const src = this._tkImg(o.q) || "";
            return { src, on: !!src, off: !src, rmOn: o.j >= lk, rm: () => this.setState((z) => ({ tkRm: (z.tkRm || []).concat([o.q]) })) };
          })),
        (t.tkFinOldOn = t.tkFinOld.length > 0),
        (t.tkFinOldTxt = lk ? "ما سلّمته سابقاً جزءٌ من سجلّ المهمة — يبقى وتُضاف إليه الصورُ الجديدة" : "محفوظةٌ مسودّةً — احذف ما لا يلزم"),
        (t.tkImgsCan = im.length < this._tkImgCap()),
        (t.tkFinDis = !nd.ok || !!s.tkBusy),
        (t.tkFinHint = nd.ok ? "" : nd.why),
        (t.tkFinBtn = s.tkBusy ? "جارٍ الحفظ…" : nd.review ? "تسليم للمراجعة" : "تسليم وإنهاء"),
        (t.tkFinDraftOn = !0),
        (t.tkNotePh =
          "note" === nd.m || "both" === nd.m
            ? "ملاحظة الإنجاز (مطلوبة)… ماذا أنجزت وما يلزم متابعته"
            : "ملاحظة (اختيارية)… ماذا أنجزت وما يلزم متابعته"));
    }
    /* سجلُّ المهمة الواحدة */
    const L = s.tkTl;
    ((t.pfPanelTkTl = "tktl" === s.pfPanel && !!L),
      (t.tkTlTitle = L ? L.title : ""),
      (t.tkTlLoading = !!L && "loading" === L.st),
      (t.tkTlErr = !!L && "err" === L.st),
      (t.tkTlEmpty = !!L && "ok" === L.st && !L.ev.length),
      (t.tkTlBack = () => this.setState({ pfPanel: (L && L.back) || "", tkTl: null })),
      (t.tkTlRows = L && "ok" === L.st ? L.ev.map((v) => this._tkEv(v)) : []));
  }
  /* حدثٌ في سجلّ المهمة: ما جرى · مَن (أنت / اسمُ المسؤول) · السبب · متى (ميلادياً — V7 · 53 تقويم) — والمستمدُّ من طوابع صفٍّ قديم موسومٌ بذلك */
  _tkEv(v) {
    const h = v.at ? KIVO.BassamCal.gAt(new Date(v.at)) : null;   /* V7 · 53 تقويم: يومُ الحدث الميلادي */
    return {
      txt: v.txt || v.act || "",
      by: v.by || "",
      why: v.why ? "«" + v.why + "»" : "",
      when: (h ? h.d + " " + this.MONTHS()[h.m - 1] + " · " : "") + this._tkHM(v.at) + ("row" === v.src ? " · من بيانات المهمة" : ""),
    };
  }
  /* سطرُ حالة المهمة في بطاقة «الأهم الآن» [النص, النمط] — رموزُ الألوان الدلالية وحدها */
  _tkBanner(s, x, d) {
    if (!x) return null;
    const p = x.proof || {},
      h = (v) => (v ? d(v) : "—"),
      q = (v) => (v ? " «" + v + "»" : "");
    if ("returned" === s && x.revd)
      return [
        "أعادها " + (x.revd.by || "المراجِع") + " " + h(x.revd.at) + " للاستكمال:" + q(x.revd.why),
        "border:1px solid var(--danger-border);background:var(--danger-bg);color:var(--danger-text)",
      ];
    if ("stalled" === s && x.stall)
      return [
        "أبلغتَ بتعثّرها " + h(x.stall.at) + ":" + q(x.stall.why) + " — استأنفها متى زال السبب",
        "border:1px solid var(--warning-border);background:var(--warning-bg);color:var(--warning-text)",
      ];
    if (("new" === s || "upcoming" === s) && x.ext && x.ext.to)
      return [
        "مُدّدت مهلتها حتى " + h(x.ext.to) + q(x.ext.why),
        "border:1px solid var(--info-border);background:var(--info-bg);color:var(--info-text)",
      ];
    if (("running" === s || "stalled" === s) && p.draft)
      return [
        "لديك توثيقٌ محفوظٌ مسودّةً — سلّمه حين يكتمل",
        "border:1px solid var(--info-border);background:var(--info-bg);color:var(--info-text)",
      ];
    return null;
  }
  /* صفُّ «سجل مهامك» لحالات المرحلة الثانية [الوصف, الوسم, نمطُ الوسم, الرمز] — والحالاتُ القائمة تبقى على صياغتها */
  _tkLogP2(s, e, d) {
    const x = e.__x || {},
      h = (v) => (v ? d(v) : "—"),
      q = (v) => (v ? " — «" + v + "»" : ""),
      I = "background:var(--info-bg);color:var(--info-text)",
      N = "background:var(--bg-surface-3);color:var(--text-muted)";
    return "review" === s
      ? ["سلّمتها " + h(e[12]) + " — بانتظار مراجعة " + (x.rv || "المسؤول"), "للمراجعة", I, "◔"]
      : "returned" === s
        ? ["أُعيدت للاستكمال" + q(x.revd && x.revd.why), "أُعيدت", "background:var(--danger-bg);color:var(--danger-text)", "↺"]
        : "stalled" === s
          ? ["متعثّرة منذ " + h(x.stall && x.stall.at) + q(x.stall && x.stall.why), "متعثّرة", "background:var(--warning-bg);color:var(--warning-text)", "‖"]
          : "cancelled" === s
            ? ["أُلغيت " + h(x.can && x.can.at) + q(x.can && x.can.why), "ملغاة", N, "×"]
            : "reassigned" === s
              ? ["أُعيد إسنادها لغيرك " + h(x.re && x.re.at) + q(x.re && x.re.why), "أُعيد إسنادها", N, "⇄"]
              : "done" === s && x.revd && "approved" === x.revd.st
                ? [
                    h(e[11]) + " ← " + h(e[12]) + " · اعتمدها " + (x.revd.by || "المراجِع"),
                    e[6] ? e[6][1] : "معتمدة",
                    "background:var(--success-bg);color:var(--success-text)",
                    "✓",
                  ]
                : null;
  }
  /* اختيارُ «الأهم الآن»: المُعادةُ (الأحدثُ إعادةً) ⇒ الجديدة (الأقربُ مهلةً) ⇒ الجارية/المتعثّرة (الأقدمُ بدءاً) ⇒ القادمة (الأقربُ) —
     KIVO_265 · «ملفي» (قرارُ المالك 2026-10-16): ما ينتظر متابعتك وحده؛ كان يرتدّ إلى «بانتظار المراجعة» ثم «آخرُ ما أنجزت اليوم»
     فتبقى المهمةُ المنجزةُ بطاقةَ «الأهم الآن» */
  _tkPick(rt, u, g, p) {
    const by = (L, f) => (L.length ? L.slice().sort(f)[0] : null),
      rd = (t) => (t.r.__x && t.r.__x.revd && t.r.__x.revd.at) || 0;
    return (
      by(rt, (t, e) => rd(e) - rd(t)) ||
      by(u, (t, e) => (t.r[16] || 0) - (e.r[16] || 0)) ||
      by(g, (t, e) => (t.r[11] || 0) - (e.r[11] || 0)) ||
      by(p, (t, e) => (t.r[15] || 0) - (e.r[15] || 0))
    );
  }
  /* KIVO_265 · «ملفي» — «مهامك الحالية» ما يحتاج متابعتَك وحده: جديدة (ومنها المستلَمةُ ولم تبدأ) · قادمة · جارية · متعثّرة · مُعادةٌ للاستكمال.
     المنجزةُ والمعتذَرُ عنها والمنقضيةُ والملغاةُ والمُعادُ إسنادُها في «سجل مهامك» وحده (لا حذفَ لبيانٍ ولا إثبات)، وما سُلّم للمراجِع في قسمه
     «بانتظار اعتماد المسؤول» — لا «الأهم الآن» ولا منجزة. سلسلةُ التكرار (rid من الخادم): أقربُ موعدٍ قادمٍ منها وحده — وبقيةُ نُسخها في السجل */
  _tkCur(o) {
    const C = { new: 1, upcoming: 1, running: 1, stalled: 1, returned: 1 },
      rid = (t) => this._tkRid(t),
      nx = {},
      l = o.filter((t) => C[t.st]);
    l.forEach((t) => {
      const k = "upcoming" === t.st && rid(t);
      k && (!nx[k] || (t.r[15] || 0) < (nx[k].r[15] || 0)) && (nx[k] = t);
    });
    return l.filter((t) => "upcoming" !== t.st || !rid(t) || nx[rid(t)] === t);
  }
  _tkRid(t) {
    return (t.r.__x ? t.r.__x.rid : t.r[23] && t.r[23].rec && t.r[23].rec.id) || "";
  }
  /* KIVO_265 · P4: نسخةُ سلسلةٍ لم يرها الموظف فليست «سجلاً»: لم تبدأ ولم يستلمها — وهي قادمةٌ بعد اليوم، أو ألغاها «أُنهي التكرار»/«عُدّل التكرار» (نصُّ الخادم 073).
     المنجزةُ والمعتذَرُ عنها والمنقضيةُ والمُلغاةُ يدوياً (ولو قادمة) والمستلَمةُ باقيةٌ في السجل */
  _tkUnseen(t, T) {
    const x = t.r.__x || {},
      w = x.can && x.can.why;
    return (
      !!this._tkRid(t) &&
      !t.r[11] &&
      !x.ack &&
      ("upcoming" === t.st || "new" === t.st ? (t.y - T.y || t.m - T.m || t.d - T.d) > 0 : "cancelled" === t.st && ("أُنهي التكرار" === w || "عُدّل التكرار" === w))
    );
  }
  /* KIVO_265 · البند 9: حالةُ الطابور الظاهرة للموظف — «بانتظار الإرسال · N» وزرُّ الإرسال الآن · والمرفوضُ (409/403) بسببه ولا يُعاد — «تجاهل» يُسقطه */
  _tkQueueVals(t, MT) {
    const Qs = MT && MT.queue ? MT.queue.state() : null,
      n = Qs ? Qs.n : 0,
      F = Qs ? Qs.failed : [],
      A = (MT && MT.queue && MT.queue.ACT) || {},
      d = (t) => {
        const e = new Date(t);
        return e.getHours().toString().padStart(2, "0") + ":" + e.getMinutes().toString().padStart(2, "0");
      };
    /* حين يفرغ الطابورُ بعد إرسالٍ ناجح يُقال ذلك مرةً (لا رسالةَ نجاحٍ قبل حكم الخادم — وقد حكم الآن) */
    const L = this._tkQLast || 0;
    Qs && Qs.loaded && !Qs.sending && ((this._tkQLast = n), L > 0 && 0 === n && this.bsAck("أُرسل ما كان بانتظار الإرسال (" + L + ") ووصل للخادم", "ok"));
    ((t.tkQOn = n > 0 || F.length > 0),
      (t.tkQPendOn = n > 0),
      (t.tkQTxt = n ? "بانتظار الإرسال · " + n : ""),
      (t.tkQSub = n ? (Qs.sending ? "جارٍ الإرسال…" : MT.online && !MT.online() ? "لا اتصال بالخادم — تُرسل تلقائياً عند عودته بترتيبها" : "تُرسل تلقائياً بترتيبها") : ""),
      (t.tkQSending = !!(Qs && Qs.sending)),
      (t.tkQSend = () => MT.queue.flush().then(() => this._pfAlive && this.setState({ pfTick: (this.state.pfTick || 0) + 1 }))),
      (t.tkQFailOn = F.length > 0),
      (t.tkQFail = F.map((q) => ({
        t: (A[q.act] || q.act) + (q.title ? " — " + q.title : ""),
        why: "رفضه الخادم: " + (q.msg || q.err || "—") + " · " + d(q.at) + " — لن يُعاد تلقائياً",
        drop: () => MT.queue.drop(q.id).then(() => this._pfAlive && this.setState({ pfTick: (this.state.pfTick || 0) + 1 })),
      }))));
  }
  /* صور التوثيق تُقرأ من مخزن الصور مرةً وتُذكر */
  _tkImg(t) {
    if (!t) return "";
    const e = (this._tkImgCache = this._tkImgCache || {});
    if (t in e) return e[t] || "";
    e[t] = "";
    const MT = KIVO.BassamMyTasks;
    if (MT)
      return (
        MT.img(t).then((s) => {
          s && ((e[t] = s), this._pfAlive && this.setState({ tkImgTick: (this.state.tkImgTick || 0) + 1 }));
        }),
        ""
      );
    const s = KIVO.BassamIDB;
    return (
      s &&
        s.get &&
        s
          .get(t)
          .then((s) => {
            s && ((e[t] = s), this._pfAlive && this.setState({ tkImgTick: (this.state.tkImgTick || 0) + 1 }));
          })
          .catch(() => {}),
      ""
    );
  }
  tkLogOpen() {
    const t = this.pfData();
    this.setState({ pfPanel: "tklog", tkLogY: t.T.y, tkLogM: t.T.m, tkLogF: "all" });
  }
  _tkHM(t) {
    try {
      const e = new Date(t),
        s = (t) => (t < 10 ? "0" + t : "" + t);
      return s(e.getHours()) + ":" + s(e.getMinutes());
    } catch (t) {
      return "";
    }
  }
  _tkSig1(r, a) {
    const s = this._tkState({ r: r }, a);
    return s + ("running" === s && r[10] && r[11] + 6e4 * r[10] < a ? "!" : "");
  }
  _tkFocusClock(e, s, a) {
    /* KIVO_264: المُعادةُ للاستكمال والمتعثّرةُ ما زالت قيد التنفيذ — ساعتُها ساعةُ «جارية» */
    ("returned" !== s && "stalled" !== s) || (s = "running");
    const n = e[10] || 0,
      r = e[15] || null,
      i = e[16] || null,
      o = e[11] || null;
    if ("new" === s)
      return {
        big: i ? this._tkFmt(Math.max(0, i - a)) : "",
        bar: i && r && i > r ? Math.max(0, Math.min(100, (100 * (a - r)) / (i - r))).toFixed(1) + "%" : "0%",
      };
    if ("upcoming" === s) return { big: this._tkFmt(Math.max(0, r - a)), bar: "0%" };
    if ("running" === s) {
      const e = n ? o + 6e4 * n - a : 0;
      return {
        big: n ? this._tkFmt(Math.abs(e)) : this._tkFmt(a - o),
        bar: n ? Math.max(0, Math.min(100, (100 * (a - o)) / (6e4 * n))).toFixed(1) + "%" : "0%",
      };
    }
    return { big: "", bar: "100%" };
  }
  _tkRestMeta(s, n, a) {
    const r = s[10] || 0,
      d = (t) => this._tkHM(t),
      x = s.__x || {},
      q = (v) => (v ? " — «" + v + "»" : "");
    /* KIVO_264 · المرحلة الثانية: ما قرّره المراجِع · التعثّر · التسليم */
    if ("returned" === n) return "أُعيدت للاستكمال" + q(x.revd && x.revd.why);
    if ("stalled" === n) return "متعثّرة" + q(x.stall && x.stall.why);
    if ("review" === n) return "سُلّمت — بانتظار مراجعة " + (x.rv || "المسؤول") + (s[12] ? " · " + d(s[12]) : "");
    return "new" === n
      ? (x.ack ? "استلمتَها ولم تبدأ" : "تنتظر استلامك") + (s[16] ? " · حتى " + d(s[16]) : "")
      : "running" === n
        ? "جارية" + (r ? " · متبقٍ " + this._tkFmt(Math.max(0, s[11] + 6e4 * r - a)) + " · تنتهي " + d(s[11] + 6e4 * r) : "")
        : "تبدأ " + d(s[15]) + " — بعد " + this._tkDur(Math.max(1, Math.round((s[15] - a) / 6e4)));
  }
  _tkClockTick() {
    if (!this._pfAlive || document.hidden) return;
    const P = this._tkPlan;
    if (!P || !P.on) return;
    const a = Date.now(),
      E = this._tkAll(),
      g = (d, i) => {
        const r = (E[d] || [])[i];
        return Array.isArray(r) ? r : null;
      };
    let s = "";
    for (let k = 0; k < P.all.length; k++) {
      const r = g(P.all[k].day, P.all[k].i);
      s += r ? this._tkSig1(r, a) : "?";
    }
    if (s !== P.sig || a >= P.nxt) return void this.setState({ tkNow: a });
    const T = (t, v) => {
      if (!t) return;
      const e = t.querySelector(".sc-interp"),
        n = e && e.firstChild;
      n && 3 === n.nodeType && n.nodeValue !== v && (n.nodeValue = v);
    };
    if (P.focus) {
      const r = g(P.focus.day, P.focus.i);
      if (r) {
        const F = this._tkFocusClock(r, P.focus.st, a);
        F.big !== P.big && ((P.big = F.big), T(document.querySelector(".tk-big"), F.big));
        if (F.bar !== P.bar) {
          P.bar = F.bar;
          const e = document.querySelector(".tk-bar>i");
          e && e.style.width !== F.bar && (e.style.width = F.bar);
        }
      }
    }
    for (let k = 0; k < P.rest.length; k++) {
      const q = P.rest[k];
      if ("running" !== q.st) continue;
      const r = g(q.day, q.i);
      if (!r) continue;
      const m = this._tkRestMeta(r, q.st, a);
      m !== q.meta && ((q.meta = m), T(document.querySelector('[data-tkq="' + q.day + "#" + q.i + '"]'), m));
    }
  }
  _tkFmt(t) {
    const e = t < 0,
      s = Math.floor(Math.abs(t) / 1e3),
      n = Math.floor(s / 3600),
      a = Math.floor((s % 3600) / 60),
      r = s % 60,
      i = (t) => (t < 10 ? "0" + t : "" + t);
    return (e ? "-" : "") + (n > 0 ? i(n) + ":" : "") + i(a) + ":" + i(r);
  }
  _tkDur(t) {
    if (!t && 0 !== t) return "";
    if (t < 1) return "أقل من دقيقة";
    const e = Math.floor(t / 60),
      s = t % 60;
    return (
      (e ? (1 === e ? "ساعة" : 2 === e ? "ساعتان" : e <= 10 ? e + " ساعات" : e + " ساعة") : "") + (e && s ? " و" : "") + (s ? s + " د" : "")
    );
  }
  /* حالة المهمة من منظور الموظف — KIVO_264 · المرحلة الثانية: ما يقرّره الخادمُ وحده يُؤخذ منه (545 phase): بانتظار المراجعة ·
     أُعيدت للاستكمال · متعثّرة · ملغاة · أُعيد إسنادها لغيرك؛ وما يتغيّر بالساعة يُحسب هنا كما كان */
  _tkState(t, e) {
    const s = t.r,
      MT = KIVO.BassamMyTasks,
      p = s.__x && MT && MT.phase ? MT.phase(s.__x, e) : "";
    if ("review" === p || "returned" === p || "stalled" === p || "cancelled" === p || "reassigned" === p) return p;
    return "declined" === s[3]
      ? "declined"
      : "done" === s[3]
        ? "done"
        : s[11]
          ? "running"
          : s[16] && e > (s.__x && s.__x.win && s.__x.win.to ? s.__x.win.to : s[16])   /* KIVO_265 · نافذةُ التنفيذ: الانقضاءُ بعد المهلة + سماحِ التأخر (الخادم win.to) */
            ? "expired"
            : s[15] && e < s[15]
              ? "upcoming"
              : "new";
  }
  /* KIVO_265 · P2: قراءةُ «مهامي» — وفشلُها (لا اتصال · 5xx · 401 · 429) يؤجّل المحاولةَ التلقائية التالية 5ث ⇒ 10 ⇒ 20 ⇒ 40 ⇒ 60ث (سقف)
     بمؤقّتٍ واحد يعيد الرسم؛ «أعد المحاولة» وعودةُ الاتصال تقرآن فوراً */
  _tkLd(MT) {
    ((this._tkLoadQ = 1), (this._tkSeen = 1), clearTimeout(this._tkRetryT));
    setTimeout(
      () =>
        MT.load().then((S) => {
          const w = S && S.err ? Math.min(6e4, 5e3 * Math.pow(2, Math.min(4, this._tkFailN || 0))) : 0;
          ((this._tkFailN = w ? (this._tkFailN || 0) + 1 : 0), (this._tkRetryAt = w && Date.now() + w), (this._tkLoadQ = 0), (this._tkObj0 = null));
          if (!this._pfAlive) return;
          w && (this._tkRetryT = setTimeout(() => this._pfAlive && this.setState({ pfTick: (this.state.pfTick || 0) + 1 }), w + 50));
          this.setState({ pfTick: (this.state.pfTick || 0) + 1 });
        }),
      0,
    );
  }
  _tkVals(t, e, s) {
    const MT = KIVO.BassamMyTasks,
      MS = MT ? MT.state() : null,
      lk = !!(MS && MS.me && MS.me.linked),
      /* SR-2.2 · F-7: صفحةُ المهام غيرُ مفعّلةٍ لإدارتي (أو مطفأةٌ للمنصة) ⇒ لا بطاقةَ ولا بياناتٍ تخصّها — الخادمُ يعيد me.off */
      n = !(MS && MS.me && MS.me.off) && (e.isStaff || lk);
    /* إعادةُ الرسم حين تتغيّر «مهامي» (تنبيهُ مهمةٍ من المدير يصل عبر /api/changes ⇒ 545 تعيد القراءة) — اشتراكٌ واحد لكل نسخةٍ من الصفحة */
    if (MT && !this._tkSub) {
      this._tkSub = 1;
      const u = MT.subscribe(() => {
        if (!this._pfAlive) return void u();
        ((this._tkObj0 = null), this.setState({ pfTick: (this.state.pfTick || 0) + 1 }));
      });
      /* P2: عودةُ الاتصال تقرأ فوراً بلا انتظار المهلة */
      this._tkOnNet = () => this._pfAlive && ((this._tkRetryAt = 0), this.setState({ pfTick: (this.state.pfTick || 0) + 1 }));
      try {
        window.addEventListener("online", this._tkOnNet);
      } catch (q) {}
    }
    /* قراءةٌ عند كل فتحٍ للصفحة (رخيصة: ?since=rev) ثم كل دقيقة — لا تُعرض قائمةٌ قديمة لمن فتح «ملفي» من التنبيه.
       KIVO_265 · P2 (قائمٌ قبله): والفشلُ لا يُعاد مع كل رسم — كان كلُّ فشلٍ يُطلق رسماً فقراءةً (~750 طلباً/ث): المحاولةُ التلقائية بعد مهلة _tkLd */
    if (MT && !MS.loading && !this._tkLoadQ && (!this._tkSeen || ((null === MS.rows || MS.err || Date.now() - MS.at > 6e4) && !(MS.err && Date.now() < (this._tkRetryAt || 0)))))
      this._tkLd(MT);
    if (((t.tkOn = !!n), !n)) return t;
    this._tkQueueVals(t, MT);
    const a = Date.now(),
      r = this._tkMine(e),
      i = e.T.y + "-" + e.T.m + "-" + e.T.d,
      o = r.map((t) => ({ ...t, st: this._tkState(t, a) })),
      /* البطاقة: كلُّ ما ينتظر متابعتك من أيّ يوم (جديدة · قادمة · جارية · متعثّرة · مُعادة) — كانت «اليوم» وحده فتختفي مهمةُ الغد
         المسنَدة الآن رغم وصول تنبيهها (KIVO_264 · RC-2)؛ ثم صارت «اليوم» بأيّ حالةٍ + ما ينتظر — فتبقى المنجزةُ اليوم في «الحالية»
         (KIVO_265 · قرارُ المالك 2026-10-16: _tkCur). المنقضيةُ والمنجزةُ والمغلقة في «السجل» */
      l = this._tkCur(o),
      f = this.MONTHS(),
      d = (t) => {
        try {
          const e = new Date(t),
            s = (t) => (t < 10 ? "0" + t : "" + t);
          return s(e.getHours()) + ":" + s(e.getMinutes());
        } catch (t) {
          return "";
        }
      };
    /* انقضاء مهلة القبول بلا ردّ: يُسجَّل مرةً واحدة على الصفّ فيصل المدير تنبيهه */
    ((this._tkExp = this._tkExp || {}),
      o
        /* SR-2.2 · F-3: ما انتهت مهلتُه خلال 48 ساعة وحده — أوّلُ زيارةٍ بعد الترقية (من بيانات 242) كانت تُسجّل انقضاءَ كلِّ متأخرةٍ قديمة (كتابةٌ وتنبيهٌ لكلٍّ منها)؛
           والقديمةُ تبقى ظاهرةً «منقضية» في «سجل مهامك» (والخادمُ يردّ الأقدمَ noop) */
        .filter((t) => "expired" === t.st && a - t.r[16] < 1728e5 && !(t.r[20] && t.r[20].exp) && !this._tkExp[t.day + "#" + t.i])
        .slice(0, 3)
        .forEach((t) => {
          ((this._tkExp[t.day + "#" + t.i] = 1),
            setTimeout(
              () =>
                MT && this._tkAct(t.day, t.i, "expire"),
              50,
            ));
        }));
    const u = l.filter((t) => "new" === t.st),
      g = l.filter((t) => "running" === t.st || "stalled" === t.st),
      p = l.filter((t) => "upcoming" === t.st),
      /* «منجزة اليوم» عدٌّ ورابطٌ إلى السجل لا بطاقةُ مهمة */
      m = o.filter((t) => t.day === i && "done" === t.st),
      /* KIVO_264 · المرحلة الثانية: المُعادةُ للاستكمال أولاً · وما سُلّم وينتظر المراجِعَ في قسمه (KIVO_265: خارجَ «الحالية» — الأقدمُ تسليماً أولاً) */
      rt = l.filter((t) => "returned" === t.st),
      rv = o.filter((t) => "review" === t.st).sort((t, e) => (t.r[12] || 0) - (e.r[12] || 0));
    /* tkFocus (بعد الاستلام/البدء/التوثيق/التعثّر/الاستئناف — ويُمسح بالتسليم) يُتبع ما دامت المهمةُ حالية — المنجزةُ والمسلَّمةُ للمراجعة والمغلقةُ لا تبقى «الأهم الآن» */
    const fx = s.tkFocus ? l.find((t) => t.day + "#" + t.i === s.tkFocus) : null,
      w = fx || this._tkPick(rt, u, g, p);
    ((t.tkNewNz = String(u.length)),
      (t.tkRunNz = String(g.length + rt.length)),
      (t.tkHotCls = u.length ? "hot" : ""),
      (t.tkNewN = u.length ? String(u.length) : ""),
      (t.tkRunN = g.length ? String(g.length) : ""),
      (t.tkRetN = rt.length ? String(rt.length) : ""),
      (t.tkRevN = rv.length ? String(rv.length) : ""),
      (t.tkUpN = String(p.length)),
      (t.tkDoneN = String(m.length)),
      (t.tkEmpty = !w),
      (t.tkHas = !!w),
      /* KIVO_265 · «ملفي»: قبل أوّل قراءةٍ من الخادم «جارٍ التحميل» لا «لا مهام» كاذبة */
      (t.tkLoad = !!(MS && null === MS.rows && !MS.err)),
      (t.tkEmptyT =
        MS && MS.me && !lk
          ? "حسابك غير مرتبط بسجل موظف بمعرّف ثابت"
          : MS && MS.err
            ? "تعذّر تحميل مهامك"
            : t.tkLoad
              ? "جارٍ تحميل مهامك…"
              : "لا توجد لديك مهام حالية"),
      (t.tkEmptyS =
        MS && MS.me && !lk
          ? "لا تظهر المهام إلا لحسابٍ مرتبطٍ بسجلّه الوظيفي — راجع مدير الإدارة"
          : MS && "session" === MS.err
            ? "انتهت الجلسة — سجّل الدخول مجدداً لعرض مهامك"
            : MS && MS.err
              ? "تحقّق من الاتصال — تُعاد المحاولة تلقائياً"
            : t.tkLoad
              ? ""
              : "حين يُسند إليك شيء يظهر هنا فوراً ويصلك تنبيه في الجرس"),
      /* RISHAD-266: بعد 401 لا إعادة محاولة (الخدمة لا تعيد) — فلا زر ولا وعدٌ كاذب */
      (t.tkRetryOn = !!(MS && MS.err && "session" !== MS.err && !(MS.me && !lk))),
      (t.tkRetry = () => ((this._tkRetryAt = 0), MT && !MT.state().loading && !this._tkLoadQ && this._tkLd(MT))),
      (t.tkExpN = o.filter((t) => "expired" === t.st && !(t.r[20] && t.r[20].exp)).length),
      (t.tkSub = w
        ? KIVO.BassamCount(l.length, "مهمة") + " — الأهم أولاً"
        : rv.length
          ? "سلّمت ما عليك — بانتظار المراجعة"
          : "ما أُسند إليك — تستلمه وتنفّذه وتوثّقه من هنا"));
    /* إحصاء الشهر للسجل وللحالة الفارغة */
    const b = (t) => {
        const e = t.filter((t) => "done" === t.st),
          s = e.filter((t) => t.r[6] && "late" !== t.r[6][0]).length;
        return {
          done: e.length,
          ontime: s,
          late: e.length - s,
          dec: t.filter((t) => "declined" === t.st).length,
          exp: t.filter((t) => "expired" === t.st).length,
        };
      },
      k = b(o.filter((t) => t.y === e.T.y && t.m === e.T.m));
    ((t.tkMonDone = String(k.done)), (t.tkMonOn = String(k.ontime)), (t.tkMonLate = String(k.late)), (t.tkMonDec = String(k.dec + k.exp)));
    /* الأهم الآن */
    if (w) {
      const e = w.r,
        s = w.st,
        n = e[10] || 0,
        r = e[15] || null,
        i = e[16] || null,
        o = e[11] || null,
        /* KIVO_264 · المرحلة الثانية: x حقولُ الخادم للصفّ · cs حالةُ الساعة (المُعادةُ والمتعثّرةُ «جارية») — وw من _tkCur وحده
           (جديدة · قادمة · جارية · متعثّرة · مُعادة: KIVO_265 · P5 حُذفت فروعُ المنجزة والمسلَّمة التي لا تُبلغ) */
        x = e.__x || null,
        cs = "returned" === s || "stalled" === s ? "running" : s,
        FC = this._tkFocusClock(e, s, a);
      ((t.tkFocusOn = !0),
        (t.tkFTitle = e[0] || "مهمة"),
        (t.tkFMeta = [
          "من " + (e[9] || "الإدارة"),
          e[1] ? String(e[1]).trim() : "",
          e[2] && "normal" !== e[2] ? "أولوية " + ({ urgent: "عاجلة", high: "مرتفعة", low: "منخفضة" }[e[2]] || e[2]) : "",
        ]
          .filter(Boolean)
          .join(" · ")),
        (t.tkFState = s),
        (t.tkFNew = "new" === s),
        (t.tkFUp = "upcoming" === s),
        (t.tkFRun = "running" === cs),
        (t.tkFLbl = {
          new: x && x.ack ? "الأهم الآن — استلمتَها ولم تبدأ" : "الأهم الآن — تنتظر استلامك",
          upcoming: "الأهم الآن — قادمة",
          running: "الأهم الآن — جارية",
          stalled: "الأهم الآن — متعثّرة",
          returned: "أُعيدت إليك — استكمل الإثبات",
        }[s]),
        (t.tkFLblC = {
          new: "#b45309",
          upcoming: "#64748b",
          running: "#047857",
          stalled: "var(--warning-text)",
          returned: "var(--danger-text)",
        }[s]),
        (t.tkFIco = { new: "!", upcoming: "◷", running: "▶", stalled: "‖", returned: "↺" }[s]),
        (t.tkFIcoStyle =
          "running" === s
            ? "background:var(--bg-a51501050p12);color:var(--fg-x047857)"
            : "new" === s
              ? "background:var(--bg-a1808390p12);color:var(--fg-xb45309)"
              : "stalled" === s
                ? "background:var(--warning-bg);color:var(--warning-text)"
                : "returned" === s
                  ? "background:var(--danger-bg);color:var(--danger-text)"
                  : "background:var(--bg-xf1f5f9);color:var(--fg-x64748b)"),
        (t.tkFM1L = "البدء"),
        (t.tkFM1V = r ? d(r) : "—"),
        (t.tkFM2L = "الانتهاء"),
        (t.tkFM2V = i ? d(i) : "—"),
        (t.tkFM3L = "المدة"),
        (t.tkFM3V = this._tkDur(n) || "—"),
        (t.tkFM3C = "#141414"));
      /* سطرُ الحالة: سببُ الإعادة · التعثّر · التمديد · المسودّة */
      const BN = this._tkBanner(s, x, d);
      ((t.tkFNoteOn = !!BN), (t.tkFNote = BN ? BN[0] : ""), (t.tkFNoteStyle = BN ? BN[1] : ""));
      if ("new" === s) {
        const e = i ? i - a : 0;
        ((t.tkFTimerOn = !!i),
          (t.tkFBig = FC.big),
          (t.tkFTimerL = x ? "مهلة البدء تنتهي خلال" : "مهلة القبول تنتهي خلال"),
          (t.tkFTimerS = x ? "بعد انتهائها لا يُبدأ إلا بتمديدٍ من المسؤول أو إعادةِ إسنادها" : "بعد انتهائها تُعاد المهمة للمدير لإسنادها لغيرك"),
          (t.tkFBar = FC.bar),
          (t.tkFBarC = "linear-gradient(90deg,#b99751,#d9c07a)"),
          (t.tkFTimerStyle = ""));
      } else if ("upcoming" === s) {
        ((t.tkFTimerOn = !0),
          (t.tkFBig = FC.big),
          (t.tkFTimerL = "تبدأ بعد"),
          (t.tkFTimerS = (x && x.win && x.win.from && a < x.win.from ? "البدء متاح من " + d(x.win.from) : x ? "البدء متاح من الآن" : "القبول متاح من الآن") + (i ? " حتى " + d(i) : "")),
          (t.tkFBar = FC.bar),
          (t.tkFBarC = "#cbd5e1"),
          (t.tkFTimerStyle = ""));
      } else if ("running" === cs) {
        const e = n ? o + 6e4 * n - a : 0,
          s = e < 0;
        ((t.tkFTimerOn = !0),
          (t.tkFBig = FC.big),
          (t.tkFTimerL = n ? (s ? "تجاوزت المدة بـ" : "متبقٍ من مدة المهمة") : "مضى منذ القبول"),
          (t.tkFTimerS = n
            ? "المدة " + this._tkDur(n) + " · مضى منها " + this._tkDur(Math.floor((a - o) / 6e4)) + " · تنتهي " + d(o + 6e4 * n)
            : "بلا مدة محدّدة"),
          (t.tkFBar = FC.bar),
          (t.tkFBarC = s ? "linear-gradient(90deg,#dc2626,#f87171)" : "linear-gradient(90deg,#059669,#34d399)"),
          (t.tkFTimerStyle = s
            ? "border-color:var(--bd-a22038380p35);background:linear-gradient(180deg,var(--bg-a22038380p06),var(--bg-xffffff))"
            : "border-color:var(--bd-a51501050p35);background:linear-gradient(180deg,var(--bg-a51501050p06),var(--bg-xffffff))"));
      }
      ((t.tkFSub =
        "running" === cs
          ? "بدأت " + d(o) + (i ? (o <= i ? " · استجبت في وقتك" : " · تأخّر البدء") : "")
          : "new" === s && x && x.ack
            ? "استلمتَها " + d(x.ack) + " — ابدأ التنفيذ في وقتها"
            : ""),
        (t.tkFSubC = ("running" === cs && (!i || o <= i)) || ("new" === s && x && x.ack) ? "#047857" : "#b45309"));
      /* التوثيق: المُعادة (ليرى الموظف ما سلّمه) · والمسودّةُ المحفوظة قيد التنفيذ */
      const f2 = e[21] && Array.isArray(e[21].imgs) ? e[21].imgs : [];
      ((t.tkFProofOn = ("returned" === s || ("running" === cs && !!(e[21] && e[21].draft))) && (f2.length > 0 || !!(e[21] && e[21].note))),
        (t.tkFProofMsg = "returned" === s ? "ما سلّمته سابقاً — أضف ما طُلب ثم سلّم من جديد" : "مسودّة محفوظة — لم تُسلَّم بعد"),
        (t.tkFProofImgs = f2.map((t) => {
          const e = this._tkImg(t) || "";
          return { src: e, on: !!e, off: !e };
        })),
        (t.tkFProofN = f2.length
          ? 1 === f2.length
            ? "صورة واحدة"
            : 2 === f2.length
              ? "صورتان"
              : KIVO.BassamCount(f2.length, "صورة") + ""
          : ""),
        (t.tkFProofNote = e[21] && e[21].note ? "«" + e[21].note + "»" : ""),
        (t.tkFAccept = () => this.tkAccept(w.day, w.i)),
        (t.tkFDecline = () => this.tkDeclineOpen(w.day, w.i)),
        (t.tkFFinish = () => this.tkFinishOpen(w.day, w.i)));
      /* KIVO_264 · الأفعالُ المتاحة (545 can — مرآةُ قواعد الخادم؛ الحكمُ له): الاستلامُ مستقلٌّ عن البدء · الاعتذارُ بحسب سياسة المهمة ·
         التعثّرُ والاستئناف · ولا فعلَ والمهمةُ بانتظار قرار المراجِع. وضعُ المتصفح بلا خادم (لا x) يبقى على أفعال المرحلة الأولى */
      const C = x && MT && MT.can ? MT.can(x, a) : null;
      /* KIVO_265 · نافذةُ التنفيذ: قبل win.from زرُّ البدء معطّلٌ ويُقال متى يُتاح — والاستلامُ (ack) والاعتذارُ كما هما */
      const EARLY = !!(C && C.early && C.startAt);
      ((t.tkFStartOn = "new" === s || "upcoming" === s),
        (t.tkFStartDis = EARLY),
        (t.tkFStartHint = EARLY ? "البدء متاح من " + d(C.startAt) + (x && x.win && x.win.early ? " (قبل الموعد بـ" + x.win.early + " د)" : "") : ""),
        (t.tkFStartTxt = C ? (EARLY ? "▶ تبدأ " + d(C.startAt) : "upcoming" === s ? "▶ ابدأ الآن" : "▶ بدء التنفيذ") : "upcoming" === s ? "✓ قبول المهمة الآن" : "✓ قبول المهمة"),
        (t.tkFAckOn = !!(C && C.ack)),
        (t.tkFDecOn = C ? !!C.decline : !0),
        (t.tkFStallOn = !!(C && C.stall)),
        (t.tkFResumeOn = !!(C && C.resume)),
        (t.tkFFinTxt = !C ? "✓ تم الإنجاز — وثّق بالصورة" : "returned" === s ? "↺ استكمال الإثبات" : "✓ التوثيق والتسليم"),
        (t.tkFAck = () => this.tkAck(w.day, w.i)),
        (t.tkFStall = () => this.tkDeclineOpen(w.day, w.i, "stall")),
        (t.tkFResume = () => this.tkResume(w.day, w.i)),
        (t.tkFTlOn = !!(x && MT)),
        (t.tkFTl = () => this.tkTlOpen(w.day, w.i)));
      /* KIVO_265 · البند 9: فعلٌ بانتظار الإرسال على هذا الصفّ ⇒ لا أزرارَ حتى يصل (ترتيبُ الصفّ) وشارةٌ تقول ما اصطفّ */
      const QN = x && x.q ? x.q : 0;
      ((t.tkFQOn = QN > 0),
        (t.tkFQTxt = QN ? "بانتظار الإرسال: " + ((MT && MT.queue && MT.queue.ACT[x.qAct]) || x.qAct) + (QN > 1 ? " (+" + (QN - 1) + ")" : "") + " — يُرسل تلقائياً عند عودة الاتصال" : ""),
        QN && ((t.tkFStartOn = !1), (t.tkFRun = !1), (t.tkFAckOn = !1)));
      /* مراحلُ المهمة: الاستلام ⇒ التنفيذ ⇒ التوثيق ⇒ (المراجعة ⇒ الاعتماد | الإنجاز) */
      const RV = !!(x && x.rv),
        g2 = RV ? ["استلام", "تنفيذ", "توثيق", "مراجعة", "معتمدة"] : ["استلام", "تنفيذ", "توثيق", "منجزة"],
        m2 = "returned" === s ? 2 : "running" === cs ? (e[21] && e[21].draft ? 2 : 1) : x && x.ack ? 1 : 0;
      t.tkFSteps = g2.map((t, e) => ({ t, cls: "pf-st" + (e < m2 ? " done" : e === m2 ? " on" : "") }));
    } else t.tkFocusOn = !1;
    /* بقية مهام اليوم — صفوف مختصرة */
    /* KIVO_264 · المرحلة الثانية: المُعادةُ أولاً ثم الجديدة فالجارية/المتعثّرة فالقادمة؛ والمغلقةُ (منجزة · اعتذار · منقضية ·
       ملغاة · أُعيد إسنادها) في «السجل» — KIVO_265: وما سُلّم للمراجِع في قسمه «بانتظار اعتماد المسؤول (N)» (tkRv) يفتح سجلَّ المهمة */
    const OR = { returned: 0, new: 1, running: 2, stalled: 2, upcoming: 3 },
      P2 = {
        stalled: "background:var(--warning-bg);color:var(--warning-text)",
        returned: "background:var(--danger-bg);color:var(--danger-text)",
        review: "background:var(--info-bg);color:var(--info-text)",
      },
      M = l.filter((t) => t !== w).sort((t, e) => OR[t.st] - OR[e.st] || (t.r[15] || 0) - (e.r[15] || 0)),
      S = M.slice(0, 3),
      Q = (e) => {
        const s = e.r,
          n = e.st,
          rq = "review" === n,
          tl = !!(s.__x && MT);
        return {
          key: e.day + "#" + e.i,
          title: s[0] || "مهمة",
          meta: this._tkRestMeta(s, n, a),
          pill: { new: "جديدة", running: "جارية", upcoming: "قادمة", stalled: "متعثّرة", returned: "أُعيدت", review: "للمراجعة" }[n],
          pillStyle:
            P2[n] ||
            {
              new: "background:var(--bg-a1808390p12);color:var(--fg-xb45309)",
              running: "background:var(--bg-a51501050p12);color:var(--fg-x047857)",
              upcoming: "background:var(--bg-xf1f5f9);color:var(--fg-x64748b)",
            }[n],
          ico: { new: "!", running: "▶", upcoming: "◷", stalled: "‖", returned: "↺", review: "◔" }[n],
          icoStyle:
            P2[n] ||
            {
              new: "background:var(--bg-a1808390p12);color:var(--fg-xb45309)",
              running: "background:var(--bg-a51501050p12);color:var(--fg-x047857)",
              upcoming: "background:var(--bg-xf1f5f9);color:var(--fg-x64748b)",
            }[n],
          rowStyle: rq && !tl ? "cursor:default" : "",
          open: rq ? () => tl && this.tkTlOpen(e.day, e.i) : () => this.setState({ tkFocus: e.day + "#" + e.i }),
        };
      };
    ((t.tkRestOn = S.length > 0),
      (t.tkRest = S.map(Q)),
      (t.tkRvOn = rv.length > 0),
      (t.tkRvHead = "بانتظار اعتماد المسؤول (" + rv.length + ")"),
      (t.tkRv = rv.map(Q)),
      (t.tkMoreTxt = [M.length > 3 ? "+" + (M.length - 3) + " أخرى" : "", m.length ? m.length + " منجزة اليوم" : ""]
        .filter(Boolean)
        .join(" · ")),
      (t.tkLogOpen = () => this.tkLogOpen()));
    {
      let NX = 1 / 0;
      const B = (t) => {
        t > a && t < NX && (NX = t);
      };
      w &&
        ("running" === w.st || "stalled" === w.st || "returned" === w.st) &&
        w.r[10] &&
        w.r[11] &&
        B(w.r[11] + (Math.floor((a - w.r[11]) / 6e4) + 1) * 6e4);
      S.forEach((t) => {
        if ("upcoming" === t.st && t.r[15]) {
          const e = Math.round((t.r[15] - a) / 6e4);
          e >= 2 && B(t.r[15] - (e - 0.5) * 6e4);
        }
      });
      if ("tkfin" === s.pfPanel && s.tkRef) {
        const t = o.find((t) => t.day === s.tkRef.day && t.i === s.tkRef.idx);
        t && t.r[11] && B(t.r[11] + (Math.floor((a - t.r[11]) / 6e4) + 1) * 6e4);
      }
      const ON =
        NX < 1 / 0 ||
        o.some(
          (t) =>
            "running" === t.st || "stalled" === t.st || "returned" === t.st || "upcoming" === t.st || ("new" === t.st && !!t.r[16]),
        );
      this._tkPlan = {
        on: ON,
        nxt: NX,
        sig: o.map((t) => this._tkSig1(t.r, a)).join(""),
        focus: w ? { day: w.day, i: w.i, st: w.st } : null,
        big: t.tkFBig || "",
        bar: t.tkFBar || "",
        rest: S.map((e) => ({ day: e.day, i: e.i, st: e.st, meta: this._tkRestMeta(e.r, e.st, a) })),
        all: o.map((t) => ({ day: t.day, i: t.i })),
      };
    }
    /* المنبثقات */
    const D = s.tkRef ? o.find((t) => t.day === s.tkRef.day && t.i === s.tkRef.idx) : null,
      R = D ? D.r : null;
    ((t.pfPanelTkFin = "tkfin" === s.pfPanel && !!R),
      (t.pfPanelTkDec = "tkdec" === s.pfPanel && !!R),
      (t.pfPanelTkLog = "tklog" === s.pfPanel),
      (t.tkDlgTitle = R ? R[0] || "مهمة" : ""),
      (t.tkFinSub =
        R && R[11]
          ? "مضى " + this._tkDur(Math.max(1, Math.floor((a - R[11]) / 6e4))) + (R[10] ? " · المدة " + this._tkDur(R[10]) : "")
          : ""),
      (t.tkImgs = (s.tkImgs || []).map((t, e) => ({ src: t, rm: () => this.tkRmImg(e) }))),
      (t.tkImgsHas = (s.tkImgs || []).length > 0),
      (t.tkImgsCan = (s.tkImgs || []).length < 4),
      (t.onTkPick = (t) => this.onTkPick(t)),
      (t.tkImgErr = s.tkImgErr || ""),
      (t.tkNote = s.tkNote || ""),
      (t.onTkNote = (t) => this.setState({ tkNote: t.target.value })),
      (t.tkFinPerf = (() => {
        const t = this._tkPerfRow(R, a);   /* KIVO_265: الأداءُ من المهلة (546 perf = 070 tkPerfOf) */
        return t ? t[1] : "";
      })()),
      (t.tkFinPerfC = (() => {
        const t = this._tkPerfRow(R, a);
        return !t ? "#64748b" : "late" === t[0] ? "#b45309" : "#047857";
      })()),
      (t.tkFinGo = () => this.tkFinish()),
      (t.tkFinDis = !(s.tkImgs || []).length || !!s.tkBusy),
      (t.tkFinHint = (s.tkImgs || []).length ? "" : "أضف صورة التوثيق أولاً"),
      (t.tkFinBtn = s.tkBusy ? "جارٍ الحفظ…" : "إنهاء المهمة"),
      (t.tkWhys = ["مكلَّف بموقع آخر", "الوقت لا يسمح", "خارج نطاق عملي", "ظرف طارئ", "أخرى"].map((e) => ({
        t: e,
        cls: "pf-whychip" + (s.tkWhy === e ? " on" : ""),
        pick: () => this.setState({ tkWhy: e }),
      }))),
      (t.tkWhyOther = "أخرى" === s.tkWhy),
      (t.tkWhyTxt = s.tkWhyTxt || ""),
      (t.onTkWhyTxt = (t) => this.setState({ tkWhyTxt: t.target.value })),
      (t.tkDecGo = () => this.tkDecline()));
    this._tkP2Panels(t, s, D);
    /* السجل */
    if ("tklog" === s.pfPanel) {
      const Y = s.tkLogY || e.T.y,
        Mo = s.tkLogM || e.T.m,
        rows = o.filter((t) => t.y === Y && t.m === Mo && !this._tkUnseen(t, e.T)),
        st = b(rows),
        fl = s.tkLogF || "all",
        vis = rows
          .filter(
            (t) =>
              "all" === fl ||
              ("done" === fl
                ? "done" === t.st
                : "late" === fl
                  ? "done" === t.st && t.r[6] && "late" === t.r[6][0]
                  : "declined" === fl
                    ? "declined" === t.st || "expired" === t.st
                    : !0),
          )
          .sort((t, e) => e.d - t.d || (e.r[12] || e.r[15] || 0) - (t.r[12] || t.r[15] || 0)),
        byDay = {};
      vis.forEach((t) => {
        (byDay[t.d] = byDay[t.d] || []).push(t);
      });
      ((t.tkLogTitle = f[Mo - 1] + " " + Y),
        (t.tkLogDone = String(st.done)),
        (t.tkLogOn = st.done ? st.ontime + " · " + Math.round((100 * st.ontime) / st.done) + "٪" : "0"),
        (t.tkLogLate = String(st.late)),
        (t.tkLogDec = String(st.dec + st.exp)),
        (t.tkLogFilt = [
          ["all", "الكل"],
          ["done", "منجزة"],
          ["late", "متأخرة"],
          ["declined", "اعتذار / لم تُقبل"],
        ].map((t) => ({
          t: t[1],
          style:
            fl === t[0]
              ? "background:var(--bg-x141414);color:var(--fg-xffffff);cursor:pointer"
              : "background:var(--bg-xf1f5f9);color:var(--fg-x64748b);cursor:pointer",
          pick: () => this.setState({ tkLogF: t[0] }),
        }))),
        (t.tkLogPrev = () => {
          let t = Mo - 1,
            e = Y;
          (t < 1 && ((t = 12), e--), this.setState({ tkLogM: t, tkLogY: e }));
        }),
        (t.tkLogNext = () => {
          let t = Mo + 1,
            e = Y;
          (t > 12 && ((t = 1), e++), this.setState({ tkLogM: t, tkLogY: e }));
        }),
        (t.tkLogEmpty = 0 === vis.length),
        (t.tkLogDays = Object.keys(byDay)
          .map(Number)
          .sort((t, e) => e - t)
          .map((dd) => ({
            label: (dd === e.T.d && Mo === e.T.m && Y === e.T.y ? "اليوم — " : "") + dd + " " + f[Mo - 1],
            rows: byDay[dd].map((t) => {
              const e = t.r,
                s = t.st,
                n = e[21] && Array.isArray(e[21].imgs) ? e[21].imgs : [],
                r = n.length ? this._tkImg(n[0]) : "",
                z = this._tkLogP2(s, e, d),
                tl = !!(e.__x && KIVO.BassamMyTasks);
              return {
                title: e[0] || "مهمة",
                /* KIVO_264: الصفُّ يفتح سجلَّ المهمة (فاعلٌ ووقت) ويعود إلى هنا */
                open: tl ? () => this.tkTlOpen(t.day, t.i, "tklog") : () => {},
                rowStyle: tl ? "cursor:pointer" : "cursor:default",
                meta: z
                  ? z[0]
                  : "done" === s
                    ? d(e[11]) +
                      " ← " +
                      d(e[12]) +
                      (n.length
                        ? " · " + (1 === n.length ? "صورة" : 2 === n.length ? "صورتان" : KIVO.BassamCount(n.length, "صورة") + "")
                        : "") +
                      (e[21] && e[21].note ? " + ملاحظة" : "")
                    : "declined" === s
                      ? "اعتذرت " + d(e[20] && e[20].at) + (e[20] && e[20].why ? " — «" + e[20].why + "»" : "")
                      : "expired" === s
                        ? "انقضت مهلة القبول " + d(e[16]) + " بلا ردّ"
                        : "running" === s
                          ? "جارية منذ " + d(e[11])
                          : e[15]
                            ? "تبدأ " + d(e[15])
                            : "",
                pill: z
                  ? z[1]
                  : "done" === s
                    ? e[6]
                      ? e[6][1]
                      : "منجزة"
                    : "declined" === s
                      ? "اعتذار"
                      : "expired" === s
                        ? "لم تُقبل"
                        : "running" === s
                          ? "جارية"
                          : "تنتظر",
                pillStyle: z
                  ? z[2]
                  : "done" === s
                    ? e[6] && "late" === e[6][0]
                      ? "background:var(--bg-a1808390p12);color:var(--fg-xb45309)"
                      : "background:var(--bg-a51501050p12);color:var(--fg-x047857)"
                    : "declined" === s || "expired" === s
                      ? "background:var(--bg-xf1f5f9);color:var(--fg-x64748b)"
                      : "running" === s
                        ? "background:var(--bg-a51501050p12);color:var(--fg-x047857)"
                        : "background:var(--bg-a1808390p12);color:var(--fg-xb45309)",
                thumb: r,
                thumbOn: !!r,
                icoOn: !r,
                ico: z ? z[3] : "done" === s ? "✓" : "declined" === s ? "—" : "expired" === s ? "⌛" : "running" === s ? "▶" : "!",
                icoStyle:
                  "done" === s
                    ? "background:var(--bg-x059669);color:var(--fg-xffffff)"
                    : "background:var(--bg-xf1f5f9);color:var(--fg-x94a3b8)",
              };
            }),
          }))));
    }
    return t;
  }
