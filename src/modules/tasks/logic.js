"use strict";
class Component extends KIVO.BassamPageKit.base(DCLogic, ["admin+award+daily+dreport+employees+irshad+plan+profile+seized+staff+tasks","daily+dreport+dstats+irshad+plan+seized+staff+tasks","daily+dreport+irshad+plan+seized+staff+tasks","dreport+irshad+planning+profile+seized+staff+tasks","irshad+seized+tasks"]) {
  bsToast(t, e) {
    try {
      const n = e || "err";
      let a = document.getElementById("bs-toast");
      a || ((a = document.createElement("div")), (a.id = "bs-toast"), document.body.appendChild(a));
      const r =
        "ok" === n
          ? ["var(--toast-ok)", "var(--bg-toast)", "var(--toast-ok-bd)", "✓"]
          : "warn" === n
            ? ["var(--toast-warn)", "var(--bg-toast)", "var(--toast-warn-bd)", "⚠"]
            : ["var(--toast-err)", "var(--bg-toast)", "var(--toast-err-bd)", "⚠"];
      (a.setAttribute(
        "style",
        "position:fixed;top:16px;left:50%;transform:translateX(-50%) translateY(-8px);z-index:2147483000;max-width:min(560px,92vw);direction:rtl;text-align:right;font-family:'Cairo',sans-serif;font-size:13px;font-weight:600;line-height:1.9;color:" +
          r[0] +
          ";background:" +
          r[1] +
          ";border:1px solid " +
          r[2] +
          ";border-radius:14px;padding:12px 18px;box-shadow:var(--shadow-elevated);opacity:0;transition:opacity .22s ease, transform .22s ease;pointer-events:none",
      ),
        (a.textContent = r[3] + "  " + String(null == t ? "" : t)),
        requestAnimationFrame(() => {
          try {
            ((a.style.opacity = "1"), (a.style.transform = "translateX(-50%) translateY(0)"));
          } catch (t) {}
        }),
        clearTimeout(this._bsToastT),
        (this._bsToastT = setTimeout(() => {
          try {
            ((a.style.opacity = "0"), (a.style.transform = "translateX(-50%) translateY(-8px)"));
          } catch (t) {}
        }, 4200)));
    } catch (t) {}
  }
  hParts(t) {
    const e = this._hfmt().formatToParts(t),
      n = (t) => +e.find((e) => e.type === t).value;
    return { y: n("year"), m: n("month"), d: n("day") };
  }
  hGreg(t, e, n) {
    let a = new Date(new Date(2026, 5, 16).getTime() + 864e5 * (29.5306 * (12 * (t - 1448) + (e - 1)) + (n - 1)));
    try {
      for (let r = 0; r < 12; r++) {
        const r = this.hParts(a);
        if (r.y === t && r.m === e && r.d === n) return a;
        const s = 354.367 * (r.y - t) + 29.5306 * (r.m - e) + (r.d - n);
        a = new Date(a.getTime() - 864e5 * (Math.round(s) || (s > 0 ? 1 : -1)));
      }
    } catch (t) {}
    return a;
  }
  hMonthDays(t, e) {
    const n = t + "-" + e;
    if (((this.__hd = this.__hd || {}), this.__hd[n])) return this.__hd[n];
    let a = 30;
    try {
      const n = this.hGreg(t, e, 1),
        r = this.hParts(new Date(n.getTime() + 25056e5));
      a = r.y === t && r.m === e ? 30 : 29;
    } catch (t) {}
    return ((this.__hd[n] = a), a);
  }
  hGregMonthLabel(t, e) {
    const n = t + "-" + e;
    if (((this.__hg = this.__hg || {}), this.__hg[n])) return this.__hg[n];
    let a = "";
    try {
      a = this.hGreg(t, e, 15).toLocaleDateString("ar-u-ca-gregory-nu-latn", { month: "long", year: "numeric" });
    } catch (t) {}
    return ((this.__hg[n] = a), a);
  }
  hGregYearRange(t) {
    try {
      const e = this.hGreg(t, 1, 1).getFullYear(),
        n = this.hGreg(t, 12, 29).getFullYear();
      return e === n ? e + " م" : e + " – " + n + " م";
    } catch (t) {
      return "";
    }
  }
  mStart(t, e) {
    return this.hGreg(t, e + 1, 1);
  }
  mDays(t, e) {
    return e >= 12 ? this.hMonthDays(t + 1, 1) : this.hMonthDays(t, e + 1);
  }
  fmtStampParts(t) {
    const e = new Date(t);
    let n = "";
    try {
      n = e.toLocaleDateString("ar-SA-u-nu-latn", { weekday: "long" });
    } catch (t) {}
    let a = 1448,
      r = 2,
      s = 1;
    try {
      const t = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {
          year: "numeric",
          month: "numeric",
          day: "numeric",
        }).formatToParts(e),
        n = (e) => +t.find((t) => t.type === e).value;
      ((a = n("year")), (r = n("month")), (s = n("day")));
    } catch (t) {}
    const o = (t) => (t < 10 ? "0" + t : "" + t);
    return { wd: n, date: a + "/" + r + "/" + s + " هـ", time: o(e.getHours()) + ":" + o(e.getMinutes()), k: a + "-" + r + "-" + s };
  }
  loadAllTasks() {
    return this._tkLS("bassam_tasks_v1") || {};
  }
  _tkOps() {
    const S = KIVO.__BS_SRV && KIVO.__BS_SRV.operations;
    if (!S) throw Error("operations-read-required");
    return S;
  }
  _tkOpen(patch, done) {
    const slots = ["newTaskOpen", "confirmDel", "confirmFinish", "acceptRef", "delMonth", "lockConfirm", "retroAsk", "tkAct"];
    const slot = slots.find((key) => patch && patch[key]);
    if (slot) {
      const drafts = this._tkDrafts || (this._tkDrafts = {}), old = drafts[slot];
      if ((old && old.ticket) || (this._tkCommands && this._tkCommands[slot] && this._tkCommands[slot].state !== "blocked")) return this.bsToast("طلب سابق لم يُحسم — أعد محاولة الإجراء نفسه قبل فتح مسودة أخرى", "warn");
      try {
        const S = this._tkOps(), draft = S.draft();
        drafts[slot] = { draft: draft, base: KIVO.__BS_SRV.rev(S.key("bassam_tasks_v1")) };
        if (slot !== "newTaskOpen") { const begun = S.begin(this, slot); if (!begun.ok) throw Error("operations-read-required"); }
      }
      catch (error) { return this.bsToast("تعذّر تثبيت بيانات المسودة — حدّث البيانات قبل المحاولة", "warn"); }
    }
    this.setState(patch, done);
  }
  async _tkClose(slot, patch) {
    const saved = this._tkDrafts && this._tkDrafts[slot], command = this._tkCommands && this._tkCommands[slot], S = this._tkOps();
    const status = saved && saved.ticket ? S.status(saved.ticket).state : "idle";
    if ((saved && saved.ticket && !["denied", "conflict", "released", "confirmed"].includes(status)) || (command && command.state !== "blocked"))
      return this.bsToast("لم يُؤكَّد الطلب بعد — المسودة باقية؛ أعد محاولة الحفظ نفسه", "warn");
    if (saved && saved.ticket || command) {
      const refreshed = await S.read([S.key("bassam_tasks_v1"), S.key("bassam_tasks_locks_v1")]);
      if (!refreshed || refreshed.ok !== 1) return this.bsToast("تعذّر تحديث البيانات للمراجعة — المسودة باقية", "warn");
    }
    if (saved) delete this._tkDrafts[slot];
    if (command) delete this._tkCommands[slot];
    this.setState(patch);
  }
  async _tkChange(slot, change, intent) {
    const drafts = this._tkDrafts || (this._tkDrafts = {}), saved = drafts[slot] || (drafts[slot] = {}), S = this._tkOps();
    const action = intent || { year: this.state.year, month: this.state.month, ref: this.state[slot] || null };
    try {
      const result = await S.commit(this, slot, action, change);
      if (result && result.ticket) saved.ticket = result.ticket;
      if (!result || result.ok !== 1) {
        const reason = S.explain ? S.explain(result) : "";
        this.bsToast(reason || "لم يُؤكَّد الحفظ — المسودة باقية. أعد المحاولة بنفس الإجراء؛ عند تعارض الصلاحيات أو البيانات راجعها أولاً", "warn");
        return false;
      }
      delete drafts[slot];
      this._tkLSBust();
      this.setState({ tasksAll: this.loadAllTasks(), locked: this.loadLocks() });
      return true;
    } catch (error) {
      this.bsToast("تغيّرت البيانات أو الجلسة — لم يُعتمد الحفظ؛ المسودة باقية للمراجعة", "warn");
      return false;
    }
  }
  mutateStore(change, slot, intent) {
    if (!this._tkCanWrite()) { this.bsToast("صلاحيتك على المهام لا تشمل الحفظ"); return Promise.resolve(false); }
    return this._tkChange(slot || "inline", (draft) => {
      const value = draft.get("bassam_tasks_v1") || {};
      if (change(value) === false) return false;
      draft.set("bassam_tasks_v1", value);
    }, intent);
  }
  _tkDeleteMonth(year, month) {
    if (!this._tkCanWrite()) return Promise.resolve(false);
    return this._tkChange("delMonth", (draft) => {
      const tasks = draft.get("bassam_tasks_v1") || {};
      Object.keys(tasks).forEach((key) => { const p = key.split("-"); if (+p[0] === year && +p[1] === month) delete tasks[key]; });
      draft.set("bassam_tasks_v1", tasks);
      if (this.PC("approve")) {
        const locks = draft.get("bassam_tasks_locks_v1") || {}, prefix = year + "-" + month + "-";
        delete locks[year + "-" + month];
        Object.keys(locks).forEach((key) => { if (key.indexOf(prefix) === 0) delete locks[key]; });
        draft.set("bassam_tasks_locks_v1", locks);
      }
    }, { year: year, month: month });
  }
  tkHParts(t) {
    try {
      const e = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {
          year: "numeric",
          month: "numeric",
          day: "numeric",
        }).formatToParts(new Date(t)),
        n = (t) => {
          const n = e.find((e) => e.type === t);
          return n ? +n.value : 0;
        };
      return { y: n("year"), m: n("month"), d: n("day") };
    } catch (t) {
      return null;
    }
  }
  tkStamp(t, e, n, a, r, s) {
    try {
      const o = this.hGreg(t, e, n);
      if (!o) return null;
      let i = (+a || 12) % 12;
      return ("م" === s && (i += 12), new Date(o.getFullYear(), o.getMonth(), o.getDate(), i, +r || 0, 0, 0).getTime());
    } catch (t) {
      return null;
    }
  }
  tkClock(t) {
    if (!t) return "";
    try {
      return new Date(t).toLocaleTimeString("ar-SA-u-nu-latn", { hour: "2-digit", minute: "2-digit", hour12: !0 });
    } catch (t) {
      return "";
    }
  }
  tkHDay(t) {
    if (!t) return "";
    try {
      const e = this.fmtStampParts(t);
      return e && e.date ? e.date.replace(" هـ", "") : "";
    } catch (t) {
      return "";
    }
  }
  tkDurTxt(t) {
    if (null == t || t <= 0) return "";
    const e = Math.floor(t / 1440),
      n = Math.floor((t % 1440) / 60),
      a = t % 60,
      r = [];
    return (e && r.push(e + " ي"), n && r.push(n + " س"), a && r.push(a + " د"), r.join(" "));
  }
  /* KIVO_265 · طلبُ المالك 2026-10-20 («قوائم منسدلة احترافية»): منتقي الوقت قائمةٌ منسدلة — حقلٌ واحد لكل وقت يفتح أوقاتَ اليوم كلَّ ربع ساعة
     (وفي النهاية مدةُ كلِّ خيارٍ من البداية) أو يُكتب وقتٌ حرّ (8:10 م · 20:10 · ٨:١٠ص) · وتغييرُ البداية يُبقي المدةَ كما هي (تتحرّك النهاية معها)
     ما بقيت داخل الشهر. الحالةُ نفسُها (newSh/newSm/newSap · newEh/newEm/newEap) — والخادمُ لا يتغيّر */
  _tkMinOf(h, m, ap) {
    return (((+h || 12) % 12) + ("م" === ap ? 12 : 0)) * 60 + (+m || 0);
  }
  _tkHMA(min) {
    min = ((Math.round(min) % 1440) + 1440) % 1440;
    const H = Math.floor(min / 60);
    return { h: H % 12 || 12, m: min % 60, ap: H >= 12 ? "م" : "ص" };
  }
  _tkClk(min) {
    const x = this._tkHMA(min),
      c = (t) => (t < 10 ? "0" : "") + t;
    return { v: c(x.h) + ":" + c(x.m), ap: x.ap };
  }
  /* الوقتُ المكتوب يُقرأ كلماتٍ: الأرقامُ ثم علامةُ الفترة (ص · صباحاً · فجراً — م · مساءً · ظهراً · عصراً · مغرباً · عشاءً · am/pm · a.m.)؛
     أيُّ كلمةٍ غيرِها أو علامتان متعارضتان (8 ص مساءً) أو 20:10 ص ⇒ null فيُطلب تصحيحُه بدل أن يُخمَّن وقتٌ لم يُقصد */
  /* أوقاتُ الصلاة ليست «ص/م» مسطّحة: «11 الظهر» قبيلَ الظهر لا 11 ليلاً — لكلِّ كلمةٍ نافذةُ ساعاتٍ (بنظام 12) وخارجَها null فيُطلب التصحيح */
  _tkParseTime(raw, ap0) {
    const NOON = (h) => (12 === h || h <= 5 ? "م" : h >= 10 ? "ص" : null),
      ASR = (h) => (h >= 1 && h <= 6 ? "م" : null),
      MAGH = (h) => (h >= 5 && h <= 8 ? "م" : null),
      ISHA = (h) => (h >= 7 && h <= 11 ? "م" : null),
      FAJR = (h) => (12 === h || h <= 6 ? "ص" : null),
      AP = { "ص": "ص", "صباح": "ص", "صباحا": "ص", "الصباح": "ص", am: "ص", "م": "م", "مساء": "م", "مساءا": "م", "المساء": "م", pm: "م",
        "فجر": FAJR, "فجرا": FAJR, "الفجر": FAJR, "ظهر": NOON, "ظهرا": NOON, "الظهر": NOON, "عصر": ASR, "عصرا": ASR, "العصر": ASR,
        "مغرب": MAGH, "مغربا": MAGH, "المغرب": MAGH, "عشاء": ISHA, "عشاءا": ISHA, "العشاء": ISHA },
      FILL = { "الساعة": 1, "الساعه": 1 },
      T = String(raw == null ? "" : raw)
        .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
        .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
        .replace(/[\u064B-\u0652\u0640]/g, "")
        .toLowerCase()
        .replace(/([ap])\.\s*m\.?/g, " $1m ")
        .replace(/([0-9])(?=[^0-9:.\s])/g, "$1 ")
        .replace(/([^0-9:.\s])(?=[0-9])/g, "$1 ")
        .split(/[\s,،]+/)
        .filter(Boolean),
      nums = [],
      mk = [];
    for (const w of T) {
      if (/^[0-9:.]+$/.test(w)) nums.push(w);
      else if (AP[w]) mk.push(AP[w]);
      else if (!FILL[w]) return null;
    }
    const t = 2 === nums.length && /^\d{1,2}$/.test(nums[0]) && /^\d{1,2}$/.test(nums[1]) ? nums[0] + ":" + nums[1] : 1 === nums.length ? nums[0] : "";
    let h, m, q;
    if ((q = t.match(/^(\d{1,2})[:.](\d{1,2})$/))) ((h = +q[1]), (m = +q[2]));
    else if (/^\d{3,4}$/.test(t)) ((h = +t.slice(0, t.length - 2)), (m = +t.slice(-2)));
    else if (/^\d{1,2}$/.test(t)) ((h = +t), (m = 0));
    else return null;
    if (!(h >= 0 && h <= 23 && m >= 0 && m <= 59)) return null;
    let ap = "";
    for (const k of mk) {
      const x = "function" === typeof k ? k(h % 12 || 12) : k;
      if (!x || (ap && ap !== x)) return null;
      ap = x;
    }
    if (h >= 13) return "ص" === ap ? null : h * 60 + m;
    if (0 === h) return "م" === ap ? null : m;
    if (12 === h && !ap) return 720 + m;                                       /* «12:30» بلا ص/م = الظهر */
    return ((h % 12) + ("م" === (ap || ap0 || "ص") ? 12 : 0)) * 60 + m;
  }
  /* تغييرُ البداية يُبقي المدةَ الفعلية (بالميلّي ثانية من tkStamp كما يحسبها الخادم) فتُقرأ النهايةُ من الساعة المحلية بعد الجمع —
     لا من «دقائق الساعة» التي تنحرف ساعةً عند تغيّر التوقيت الصيفي في جهازٍ خارج المملكة. تعود البؤرةُ إلى زرّ الحقل بعد الاختيار */
  _tkSetT(which, min, C) {
    const x = this._tkHMA(min),
      p = { tkTp: null, tkTpQ: "" };
    if ("s" === which) {
      ((p.newSh = x.h), (p.newSm = x.m), (p.newSap = x.ap));
      if (C && C.dur > 0)
        try {
          const s2 = this.tkStamp(C.y, C.m, C.sd, x.h, x.m, x.ap);
          /* يومُ الرجوع عن التوقيت الصيفي يكرّر ساعةً: وقتُها الثاني يُختم (tkStamp) كأوّلها فتسبق النهايةُ البدايةَ أو تقصر المدة —
             فيُقدَّم إلى أقرب وقتٍ يُختم كما هو (مرّتان تكفيان) */
          let F = s2 ? s2 + C.dur * 6e4 : 0, hp = null, y = null;
          for (let k = 0; F && k < 2; k++) {
            const E = new Date(F);
            hp = this.hParts(new Date(E.getFullYear(), E.getMonth(), E.getDate(), 12));
            y = this._tkHMA(E.getHours() * 60 + E.getMinutes());
            const back = hp.y === C.y && hp.m === C.m ? this.tkStamp(C.y, C.m, hp.d, y.h, y.m, y.ap) : F;
            if (!back || back >= F) break;
            F += F - back;
          }
          if (hp && y && hp.y === C.y && hp.m === C.m && hp.d <= C.days) ((p.newEDay = hp.d), (p.newEh = y.h), (p.newEm = y.m), (p.newEap = y.ap));
        } catch (e) { /* تاريخٌ غيرُ مفهوم ⇒ تبقى النهايةُ كما هي ويظهر تنبيهُ «النهاية قبل البداية» إن لزم */ }
    } else ((p.newEh = x.h), (p.newEm = x.m), (p.newEap = x.ap));
    this.setState(p, () => this._tkTpFocus(which));
  }
  /* KIVO_265 · منتقي الوقت (مراجعة): بعد الاختيار أو Enter أو Escape تُزال القائمةُ فتسقط البؤرةُ إلى body — تُعاد إلى زرّ الحقل
     ليبقى التنقّلُ بلوحة المفاتيح وقارئُ الشاشة في مكانهما. لا تُنتزع البؤرةُ إن انتقلت فعلاً إلى عنصرٍ آخر */
  _tkTpFocus(w) {
    try {
      const a = document.activeElement,
        b = document.querySelector('[data-tp-trig="' + w + '"]');
      b && (!a || a === document.body) && b.focus({ preventScroll: !0 });           /* بلا قفزٍ إن أُغلقت لأن الزرّ خرج عن المنطقة المرئية */
    } catch (e) { /* بلا DOM (بيئةُ الاختبار) ⇒ لا بؤرة */ }
  }
  _tkTpClose(w) {
    this.setState({ tkTp: null, tkTpQ: "" }, () => this._tkTpFocus(w));
  }
  _tkTpMove(w, dir) {
    try {
      const L = document.querySelector('[data-tp-list="' + w + '"]'),
        B = L ? Array.from(L.querySelectorAll('[role="option"]')) : [];
      if (!B.length) return;
      const a = B.indexOf(document.activeElement),
        s = B.findIndex((b) => "true" === b.getAttribute("aria-selected")),
        i =
          "first" === dir ? 0 : "last" === dir ? B.length - 1 : "sel" === dir ? Math.max(0, s) : Math.min(B.length - 1, Math.max(0, (a < 0 ? Math.max(0, s) : a) + dir));
      B.forEach((b, j) => b.setAttribute("tabindex", j === i ? "0" : "-1"));
      B[i].focus({ preventScroll: !0 });
      const top = B[i].offsetTop,
        bot = top + B[i].offsetHeight;
      top < L.scrollTop ? (L.scrollTop = top) : bot > L.scrollTop + L.clientHeight && (L.scrollTop = bot - L.clientHeight);
    } catch (e) { /* بلا DOM ⇒ لا تنقّل */ }
  }
  _tkWd1(y, m) {
    const k = y + "-" + m;
    this.__wd1 = this.__wd1 || {};
    if (!(k in this.__wd1)) {
      let w = -1;
      try {
        const g = this.hGreg(y, m, 1);
        w = g ? g.getDay() : -1;
      } catch (e) { /* تاريخٌ هجريٌّ غيرُ مفهوم ⇒ بلا اسم يوم (w = -1) */ }
      this.__wd1[k] = w;
    }
    return this.__wd1[k];
  }
  _rowMenu(t, e) {
    const n = (e || []).filter(Boolean),
      a = this.state.rowMenu === t;
    return {
      rmHas: n.length > 0,
      rmOpen: a,
      rmToggle: (e) => {
        (e && e.stopPropagation && e.stopPropagation(), this.setState((e) => ({ rowMenu: e.rowMenu === t ? null : t })));
      },
      rmBtnStyle:
        "width:28px;height:28px;border-radius:8px;cursor:pointer;padding:0;display:inline-flex;align-items:center;justify-content:center;transition:all .15s;border:1px solid " +
        (a
          ? "#b99751;background:var(--bg-a185151810p1);color:var(--fg-x8a6f35)"
          : "#E1E1E1;background:var(--bg-xffffff);color:var(--fg-x64748b)"),
      rmItems: n.map((t) => ({
        name: t.name,
        p1: t.p1 || "",
        p2: t.p2 || "",
        run: (e) => {
          (e && e.stopPropagation && e.stopPropagation(), this.setState({ rowMenu: null }), t.run && t.run());
        },
        style:
          "width:30px;height:30px;border-radius:9px;cursor:pointer;padding:0;display:inline-flex;align-items:center;justify-content:center;transition:all .15s;background:var(--bg-xffffff);border:1px solid " +
          (t.danger ? "rgba(220,38,38,.28);color:var(--fg-xdc2626)" : "#EEF0F2;color:" + (t.color || "var(--fg-x53565a)")),
      })),
    };
  }
  /* KIVO_265 · نافذةُ التنفيذ: الأداءُ من المهلة بنموذج الواجهة (546 perf = 070 tkPerfOf) — وبلا النموذج القاعدةُ القديمة (القبول + المدة) */
  perfRow(r, fin) {
    if (!r) return null;
    const M = KIVO.BassamTaskModel;
    return M && M.perf ? M.perf(r, fin) : this.perfOf(r[11], fin, r[10]);
  }
  perfOf(t, e, n) {
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
  /* KIVO_265 · البند 7: الوقتُ الفعلي مقابل المخطط لكل صفٍّ منجز — الفعلي = العمود 12 − العمود 11 (دقائق) · المخطط = العمود 10؛ شارةُ «45/60 د»
     بلونٍ تحذيري إن جاوز الفعليُّ 120% من المخطط. لا يمسّ العمودَ 6 (الأداءُ من المهلة) */
  actPlan(r) {
    if (!r || "done" !== r[3] || !r[11] || !r[12]) return { apOn: !1, apTxt: "", apWarn: !1, apStyle: "", apTip: "", apAct: 0, apPlan: 0 };
    const act = Math.max(0, Math.round((r[12] - r[11]) / 6e4)),
      plan = Math.max(0, Math.round(+r[10] || 0)),
      warn = plan > 0 && act > 1.2 * plan,
      pct = plan > 0 ? Math.round((100 * act) / plan) : 0;
    return {
      apOn: !0,
      apAct: act,
      apPlan: plan,
      apTxt: act + "/" + (plan || "—") + " د",
      apWarn: warn,
      apTip: "الفعلي " + this.tkDurTxt(act) + (plan ? " من مخطط " + this.tkDurTxt(plan) + " (" + pct + "%)" + (warn ? " — تجاوز 120% من المخطط" : "") : " — بلا مدةٍ مخططة"),
      apStyle:
        "display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;padding:2px 8px;border-radius:8px;font-feature-settings:'tnum';white-space:nowrap;border:1px solid " +
        (warn ? "var(--warning-border);background:var(--warning-bg);color:var(--warning-text)" : plan ? "var(--success-border);background:var(--success-bg);color:var(--success-text)" : "var(--border-default);background:var(--bg-surface-2);color:var(--text-secondary)"),
    };
  }
  derivedStatus(t) {
    /* KIVO_264 · KIVO-Tasks (المرحلة الثانية): ما يقرّره سيرُ العمل (مراجعة · إعادة · تعثّر · إلغاء · إعادةُ إسناد) يسبق حالةَ الصفّ المتوافقة */
    const P2 = KIVO.BassamTaskModel && t && t[23] && "object" === typeof t[23] ? KIVO.BassamTaskModel.phase(t) : "";
    if ("review" === P2 || "returned" === P2 || "stalled" === P2 || "cancelled" === P2 || "reassigned" === P2) return P2;
    if (!P2 && t && t[20] && t[20].stall && t[11] && "done" !== t[3] && "declined" !== t[3]) return "stalled";
    const e = Date.now(),
      n = t[10] || null,
      a = t[11] || null;
    return "declined" === t[3]
      ? "declined"
      : "done" === t[3]
        ? "done"
        : a
          ? n && a + 6e4 * n < e
            ? "overdue"
            : t[3]
          : t[16] && e > (KIVO.BassamTaskModel && KIVO.BassamTaskModel.winTo ? KIVO.BassamTaskModel.winTo(t) : t[16])   /* KIVO_265 · نافذةُ التنفيذ: الانقضاءُ بعد المهلة + سماحِ التأخر */
            ? "expired"
            : t[3];
  }
  empIndex() {
    /* KIVO_265 · البند 13: فهرسٌ واحد لكل نسخةٍ من قائمة الموظفين (كان يُبنى في كل رسم — 1200 موظف × رموزُهم) */
    const E = this.loadEmps(),
      c = this._tkEmpNmC;
    if (c && c.src === E) return c.ix;
    const t = {};
    E.forEach((e) => {
      (KIVO.BassamEmp ? KIVO.BassamEmp.tokens(e) : [e.eid, e.nid, e.name]).forEach((n) => {
        n && (t[n] = e.name);
      });
    });
    return ((this._tkEmpNmC = { src: E, ix: t }), t);
  }
  empNameOf(t, e) {
    const n = t[14] || null;
    return n && e && e[n] ? e[n] : t[8] || "";
  }
  loadEmps() {
    /* KIVO_265 · البند 13: من الذاكرة المخزَّنة (_tkLS) — كانت تُحلَّل القائمةُ كلُّها في كل نداء (ولكل صفٍّ في الجدول) */
    const t = this._tkLS("bassam_employees_v1");
    return Array.isArray(t) ? t : [];
  }
  onDutyToday() {
    const t = this.loadEmps();
    if (!this.bsOn("staff"))
      return t.map((t) => ({
        id: KIVO.BassamEmp ? KIVO.BassamEmp.key(t) : t.eid || t.nid || t.name,
        name: t.name,
        shift: "",
        bsPlain: !0,
      }));
    let e = {};
    try {
      const t = this._tkLS("bassam_staffing_v3");
      t && "object" == typeof t && (e = t);
    } catch (t) {}
    const n = this.hToday(),
      a = e[n.y + "-" + n.m] || {},
      r = new Date().toLocaleDateString("ar-SA-u-nu-latn", { weekday: "long" });
    return t
      .filter((t) => {
        const e = (KIVO.BassamEmp ? KIVO.BassamEmp.entry(a, t) : a[t.eid || t.nid || t.name]) || {};
        return !!e.shift && !(e.rest || []).some((t) => t === r || "ال" + t === r || t === "ال" + r);
      })
      .map((t) => ({
        id: KIVO.BassamEmp ? KIVO.BassamEmp.key(t) : t.eid || t.nid || t.name,
        name: t.name,
        shift: ((KIVO.BassamEmp ? KIVO.BassamEmp.entry(a, t) : a[t.eid || t.nid || t.name]) || {}).shift,
      }));
  }
  loadLocks() {
    return this._tkLS("bassam_tasks_locks_v1") || {};
  }
  PC(t) {
    try {
      return !!KIVO.BassamPerm && KIVO.BassamPerm.can("tasks", t || "view");
    } catch (t) {
      return !1;
    }
  }
  _tkCanWrite() {
    return this.PC("add") || this.PC("edit") || this.PC("del") || this.PC("approve");
  }
  _tkPermVals() {
    const t = this._tkCanWrite();
    return {
      tkPmAdd: this.PC("add"),
      tkPmEdit: this.PC("edit"),
      tkPmDel: this.PC("del"),
      tkPmApprove: this.PC("approve"),
      tkPmExport: this.PC("export"),
      tkPmWrite: t,
      tkPmReadOnly: !t,
      tkPmNoteStyle:
        "display:flex;align-items:center;gap:8px;padding:9px 14px;border-radius:12px;background:var(--bg-a1001161390p06);border:1px solid var(--bd-a1001161390p22);font-size:11.5px;font-weight:600;color:var(--fg-x475569);line-height:1.8",
    };
  }
  monthPastT(t, e) {
    const n = this.hToday();
    return +t < n.y || (+t === n.y && +e < n.m);
  }
  monthOpenFlagT(t, e) {
    const n = (this.state.locked || {})[t + "-" + e];
    return !(!n || "object" != typeof n || !n.mo);
  }
  monthAutoLockedT(t, e) {
    return this.monthPastT(t, e) && !this.monthOpenFlagT(t, e);
  }
  monthApprovedT(t, e) {
    return !0 === (this.state.locked || {})[t + "-" + e];
  }
  monthLockedT(t, e) {
    return this.monthApprovedT(t, e) || this.monthAutoLockedT(t, e);
  }
  /* KIVO_265 · قفلُ اليوم في المخزن نفسِه (bassam_tasks_locks_v1) بمفاتيح أيامٍ مسطّحة «y-m-d» وبالقيم التي يفهمها الخادمُ للشهر: {mo:1} يومٌ منقضٍ
     فُتح بأثر رجعي · true يومٌ أُغلق بيده — فلا يتغيّر الخادم ولا يُخلط بمفتاح الشهر «y-m». والمنقضي = قبل اليوم التشغيلي (الرياض − 3 ساعات) كالخادم */
  _tkDayLockOf(y, m, d) {
    const L = this.state.locked || {},
      v = L[y + "-" + m + "-" + d],
      past = this._tkDayN(y + "-" + m + "-" + d) < this._tkTodayN(),
      opened = !!(v && "object" === typeof v && v.mo),
      shut = !0 === v,
      viaMonth = this.monthOpenFlagT(y, m);
    return { past: past, opened: opened, shut: shut, viaMonth: viaMonth, approved: this.monthApprovedT(y, m), locked: this.monthApprovedT(y, m) || shut || (past && !opened && !viaMonth) };
  }
  tkLockedAt(y, m, d) {
    return this._tkDayLockOf(y, m, d).locked;
  }
  _tkLockTxt(y, m, d) {
    return this.monthApprovedT(y, m) ? "الشهر معتمد ومقفل." : "اليوم مقفل — " + this._tkHowOpen("افتحه بنقرة مزدوجة على خانته في شريط الأيام.");
  }
  /* الموجة 1 · IRSZ-4: إرشادُ «النقرة المزدوجة» لمن يملك الاعتماد وحده — وغيرُه يُخبَر بالسبب (كانت النقرةُ تنتهي برسالة رفض أو لا شيء) */
  _tkHowOpen(how) {
    return this.PC("approve") ? how : "فتحُه يحتاج صلاحية الاعتماد — راجع مدير الإدارة.";
  }
  _setDayLockT(y, m, d, op) {
    return this.mutateLocks((r) => {
      const k = y + "-" + m + "-" + d;
      "open" === op ? (r[k] = { mo: 1 }) : "close" === op ? (r[k] = !0) : delete r[k];
    }, "retroAsk");
  }
  _setMonthOpenT(t, e, n) {
    return this.mutateLocks((r) => {
      const a = t + "-" + e;
      n ? (r[a] = { mo: 1 }) : delete r[a];
    }, "retroAsk");
  }
  mutateLocks(change, slot) {
    if (!this.PC("approve")) { this.bsToast("الاعتماد والقفل يحتاج صلاحية الاعتماد"); return Promise.resolve(false); }
    return this._tkChange(slot, (draft) => {
      const locks = draft.get("bassam_tasks_locks_v1") || {};
      change(locks);
      draft.set("bassam_tasks_locks_v1", locks);
    });
  }
  state = (() => {
    const t = this.hToday();
    return {
      year: t.y,
      month: t.m,
      tasksAll: null,
      locked: this.loadLocks(),
      lockConfirm: null,
      sub: "list",
      search: "",
      fStatus: "all",
      fPrio: "all",
      fddOpen: null,
      rowMenu: null,
      newTaskOpen: !1,
      newPrio: "normal",
      newTitle: "",
      newDesc: "",
      newEmp: "",
      newDur: "",
      newDay: 0,
      newCreatedAt: 0,
      newSh: 8,
      newSm: 0,
      newSap: "ص",
      newEDay: 0,
      newEh: 10,
      newEm: 0,
      newEap: "ص",
      tkTp: null,
      tkTpQ: "",
      confirmDel: null,
      confirmFinish: null,
      editRef: null,
      mMenu: null,
      delMonth: null,
      now: 0,
      acceptRef: null,
      page: 1,
      perPage: 10,
      tkDayK: "",
      tkDayD: 0,
      /* KIVO_264 · المرحلة الثانية: الإعداداتُ المتقدمة · نافذةُ الفعل · الأهلية */
      newAdvOpen: !1,
      newAdvTouched: !1,
      newPol: "any",
      newPolN: 1,
      newSteps: "",
      newRv: "creator",
      newDecOk: !0,
      /* KIVO_265 · نافذةُ التنفيذ (قرارُ المالك 2026-10-19): البدءُ المبكر (نعم ⇒ دقائق قبل الموعد) · التسليمُ بعد المهلة (نعم ⇒ ساعات) — الافتراضي لا · نعم 2 */
      newWinEarlyOn: !1,
      newWinEarly: 10,
      newWinLateOn: !0,
      newWinLate: 2,
      /* KIVO_265 · قرارُ المالك (تكرارُ المهام في النموذج): once | daily | weekly | monthly | every — newRecWd: null = يومُ أسبوع البداية · newRecMd: 0 = يومُ البداية
         أو "last" آخرُ يومٍ في الشهر الهجري (البند 16) · newRecN: عددُ الأيام لـevery (2–30 · البند 16) · newRecEnd: open (حتى الإيقاف) | date ·
         newRecTo: تاريخٌ هجريّ Y-M-D أو اختصارٌ (w1 · w2 · m1 · m3 · y1) من البداية */
      newRec: "once",
      newRecF: "daily",
      newRecWd: null,
      newRecMd: 0,
      newRecN: 2,
      newRecEnd: "open",
      newRecTo: "m1",
      newRecFor: "",
      newRecSig: "",
      tkRecOk: !1,
      tkAct: null,
      tkActWhy: "",
      tkActTo: "",
      tkActExt: "",
      tkActErr: "",
      tkActBusy: !1,
      tkActElig: null,
      tkActLog: null,
      tkActForce: !1,
      tkElig: null,
      tkBusy: !1,
      /* KIVO_265 · البند 14: فلاتر إضافية (المكلَّف · الوردية · نوع العمل · المتكررة · المراجِع · بانتظاري أنا · بلا توثيق) — شريطُها مطويّ، واختياراتُها
         تُحفظ للمسؤول (bassam_tasks_filters_v1:<uid>) وتُستعاد هنا فوق الافتراضيات */
      fAsg: "all",
      fShift: "all",
      fWt: "all",
      fRv: "all",
      fRec: !1,
      fMine: !1,
      fNoProof: !1,
      tfxOpen: !1,
      ...this._tkFltLoad(),
      /* KIVO_265 · البند 11: التحديدُ الجماعي ونافذةُ الإجراء الجماعي */
      tkSel: {},
      tkBulk: null,
      tkBulkWhy: "",
      tkBulkTo: "",
      tkBulkExt: "",
      tkBulkErr: "",
      tkBulkBusy: !1,
      tkBulkProg: null,
      tkBulkRes: null,
    };
  })();
  bsMenusPatch() {
    return { fddOpen: null, mMenu: null, rowMenu: null, filesOpen: !1, tkTp: null };
  }
  _bsInMenu(e) {
    for (; e && e !== document.body; e = e.parentElement) if (e.style && ("absolute" === e.style.position || "fixed" === e.style.position)) return !0;
    return !1;
  }
  _bsOutsideMenus(t) {
    try {
      /* KIVO_265 · منتقي الوقت (مراجعة): سحبُ تحديد النص في خانة الوقت والإفلاتُ خارج القائمة يطلق click على السلف المشترك (خارجها)
         فكانت تُغلق ويضيع المكتوب — الضغطةُ التي بدأت داخل قائمةٍ تُحسب داخلها. تُستهلك مع كل click (نقرُ لوحة المفاتيح بلا ضغطة لا يرثها) */
      var n = this._bsInMenu(t.target) || !!this._bsDownIn;
      this._bsDownIn = !1;
      var a = this,
        r = this.bsMenusPatch(),
        s = {};
      (Object.keys(r).forEach(function (t) {
        s[t] = a.state[t];
      }),
        setTimeout(function () {
          try {
            var t = !1,
              e = !1,
              o = a.state;
            if (
              (Object.keys(r).forEach(function (n) {
                (o[n] !== s[n] && (t = !0), o[n] && (e = !0));
              }),
              t || n || !e)
            )
              return;
            a.setState(r);
          } catch (t) {}
        }, 0));
    } catch (t) {}
  }
  componentDidMount() {
    /* RISHAD266: لا كتابة عند فتح الصفحة — توليدُ المواعيد المتكررة يجري في الخادم عند قراءة مخزن المهام (063 ← 074 tkLazyJobs) */
    /* KIVO_265 · منتقي الوقت: Escape وقائمةُ الوقت مفتوحةٌ يغلقها وحدها — يُلتقط على window قبل معالج الغلاف (root-logic: document · capture)
       الذي يُغلق أعلى حوار، فكان يُغلق نافذةَ «مهمة جديدة» كلَّها ويضيع ما كُتب فيها */
    this._tkTpEsc = (ev) => {
      try {
        ev && "Escape" === ev.key && !ev.isComposing && this.state.tkTp && (ev.preventDefault(), this._tkTpClose(this.state.tkTp));
      } catch (x) { /* حدثٌ بلا preventDefault ⇒ يمضي Escape إلى الغلاف كما كان */ }
    };
    try {
      window.addEventListener("keydown", this._tkTpEsc, !0);
    } catch (x) { /* بلا window (بيئةُ الاختبار) ⇒ Escape للغلاف وحده */ }
    ((this._bsDownM = (t) => {
      try {
        this._bsDownIn = this._bsInMenu(t && t.target);
      } catch (x) { /* هدفٌ بلا DOM ⇒ ضغطةٌ خارج القوائم */ }
    }),
      document.addEventListener("pointerdown", this._bsDownM, !0),
      (this._bsOutM = (t) => this._bsOutsideMenus(t)),
      document.addEventListener("click", this._bsOutM, !0),
      (this._tick = setInterval(() => this._tkClockTick(), 1e3)),
      (this._onStorage = (t) => {
        const e = t && t.key;
        this._tkLSBust();
        if (e && "bassam_tasks_v1" !== e && "bassam_tasks_locks_v1" !== e) return;
        const n = {};
        ((e && "bassam_tasks_v1" !== e) || (n.tasksAll = this.loadAllTasks()),
          (e && "bassam_tasks_locks_v1" !== e) || (n.locked = this.loadLocks()),
          this.setState(n));
      }));
    try {
      window.addEventListener("storage", this._onStorage);
    } catch (t) {}
    this._onBus = (t) => {
      try {
        const e = (t && t.detail) || {},
          s = (e.keys ? e.keys : [e.key]).filter(Boolean).map(String),
          n = (t) => !s.length || s.some((e) => e === t || e.slice(-t.length - 1) === ":" + t);
        /* KIVO_265 · البند 13: تغيّرُ أيّ مخزنٍ يُبطل ذاكرةَ القراءة (الموظفون · الجدول · تقرير اليوم · الخيارات) ومنتقي الإسناد */
        (this._tkLSBust(),
          n("bassam_tasks_v1") && this.setState({ tasksAll: this.loadAllTasks() }),
          n("bassam_tasks_locks_v1") && this.setState({ locked: this.loadLocks() }));
      } catch (t) {}
    };
    try {
      (window.addEventListener("bassam:remote", this._onBus), window.addEventListener("bassam:store", this._onBus));
    } catch (t) {}
  }
  componentWillUnmount() {
    try {
      this._tkTpEsc && window.removeEventListener("keydown", this._tkTpEsc, !0);
    } catch (x) { /* بلا window ⇒ لا مستمعَ أصلاً */ }
    if (this._onBus)
      try {
        (window.removeEventListener("bassam:remote", this._onBus), window.removeEventListener("bassam:store", this._onBus));
      } catch (t) {}
    if ((this._bsDownM && document.removeEventListener("pointerdown", this._bsDownM, !0), this._bsOutM && document.removeEventListener("click", this._bsOutM, !0), this._tick && clearInterval(this._tick), this._onStorage))
      try {
        window.removeEventListener("storage", this._onStorage);
      } catch (t) {}
  }
  PRIO = {
    low: ["منخفض", "#64748b", "#f1f5f9", "#cbd5e1", "M7 7h10v10", "M17 7 7 17"],
    normal: ["عادي", "#3e8ac4", "#eff6ff", "#bfdbfe", "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0", "M13 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0"],
    high: [
      "مرتفع",
      "#d97706",
      "#fffbeb",
      "#fcd34d",
      "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",
      "",
    ],
    urgent: [
      "عاجل",
      "#dc2626",
      "#fef2f2",
      "#fecaca",
      "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",
      "M12 9v4",
    ],
  };
  ST = {
    pending: ["انتظار", "#64748b", "#f8fafc", "#e2e8f0", "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0", "M12 6v6l4 2"],
    in_progress: ["جارية", "#3e8ac4", "#eff6ff", "#bfdbfe", "M21 12a9 9 0 1 1-6.219-8.56", ""],
    done: ["منجزة", "#059669", "#ecfdf5", "#a7f3d0", "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0", "m9 12 2 2 4-4"],
    overdue: [
      "متأخرة",
      "#dc2626",
      "#fef2f2",
      "#fecaca",
      "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",
      "M12 9v4",
    ],
    declined: ["اعتذار", "#64748b", "#f8fafc", "#e2e8f0", "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0", "M15 9l-6 6M9 9l6 6"],
    expired: ["لم تُقبل", "#b45309", "#fffbeb", "#fde68a", "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0", "M12 6v6l4 2"],
    /* KIVO_264 · المرحلة الثانية — الحالاتُ المنفصلة بالرموز الدلالية */
    review: ["بانتظار المراجعة", "var(--plum-text)", "var(--bg-surface-2)", "var(--border-default)", "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0", "m9 12 2 2 4-4"],
    returned: ["أُعيدت للاستكمال", "var(--warning-text)", "var(--warning-bg)", "var(--warning-border)", "M9 14 4 9l5-5", "M4 9h10.5a5.5 5.5 0 0 1 0 11H11"],
    stalled: ["متعثّرة", "var(--danger-text)", "var(--danger-bg)", "var(--danger-border)", "M10 15V9", "M14 15V9"],
    cancelled: ["ملغاة", "var(--text-muted)", "var(--bg-surface-3)", "var(--border-strong)", "M18 6 6 18", "m6 6 12 12"],
    reassigned: ["أُعيد إسنادها", "var(--text-muted)", "var(--bg-surface-2)", "var(--border-default)", "m17 2 4 4-4 4", "M3 11v-1a4 4 0 0 1 4-4h14"],
  };
  PERF = {
    early: "background:var(--bg-xfffbeb);color:var(--fg-xb45309);border:1px solid var(--bd-xfcd34d)",
    on_time: "background:var(--bg-xecfdf5);color:var(--fg-x047857);border:1px solid var(--bd-x6ee7b7)",
    late: "background:var(--bg-xfef2f2);color:var(--fg-xdc2626);border:1px solid var(--bd-xfecaca)",
  };
  filterDD(t, e, n, a) {
    const r = this.state,
      s = r[e],
      o = r.fddOpen === t,
      i = {};
    ((i[t + "Open"] = o), (i[t + "Toggle"] = () => this.setState((e) => ({ fddOpen: e.fddOpen === t ? null : t }))));
    const l = a.find((t) => t.v === s);
    return (
      (i[t + "Label"] = "all" === s ? n : l ? l.name : s),
      (i[t + "Chev"] = "transition:transform .2s;flex-shrink:0;opacity:.5;" + (o ? "transform:rotate(180deg)" : "")),
      (i[t + "BtnStyle"] =
        "height:32px;min-width:100px;font-size:11px;border-radius:8px;border:1px " +
        ("all" === s ? "dashed #cbd5e1;color:var(--fg-x475569)" : "solid rgba(185,151,81,0.5);color:var(--fg-x9a7e40);font-weight:400") +
        ";background:var(--bg-xffffff);padding:0 10px;cursor:pointer;font-family:'Cairo',sans-serif;display:inline-flex;align-items:center;justify-content:space-between;gap:6px" +
        (o ? ";box-shadow:0 0 0 2px rgba(185,151,81,0.15)" : "")),
      (i[t + "Opts"] = a.map((t) => ({
        name: t.name,
        selected: s === t.v,
        pick: () => this._tkFltSet({ [e]: t.v }),   /* KIVO_265 · البند 14: الاختيارُ يُحفظ للمسؤول */
        style:
          "display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;font-size:11px;cursor:pointer;transition:background .15s;" +
          (s === t.v ? "background:var(--bg-a185151810p08);color:var(--fg-x9a7e40);font-weight:400" : "color:var(--fg-x141414)"),
      }))),
      i
    );
  }
  /* KIVO_265 · تحقّقُ fa5a5bf (V-7 · متوسط): نوافذُ التعديل والحذف والقبول والإنهاء تحفظ هويةَ الصفّ لا موضعَه وحده — تغييرٌ بعيدٌ والنافذةُ مفتوحة
     (مديرٌ آخر يحذف صفّاً · إعادةُ إسنادٍ تُدرج نسخةً بعد أصلها · التكرار) يُزيح صفوفَ اليوم فكان الفعلُ يقع على صفٍّ آخر بلا رسالة ويقبله الخادم.
     الهويةُ (13 · 14 · 22) — والصفُّ بلا هوية (13) بنصّه كاملاً — والموضعُ تلميحٌ (كـ062c meTkAct). غائبٌ أو تغيّرت هويتُه ⇒ -1 ولا كتابة.
     تحقّقُ c4f79a0 (C-1): الطابعُ 22 يضيفه الخادمُ حين يغيب (الإعداداتُ · إعادةُ الفتح — 071) ولا يغيّره ⇒ غيابُه عند الفتح يطابق أيَّ طابع.
     وC-3: قائمةُ الصفّ المفتوحة مفتاحُها هويتُه لا موضعُه، و«إعادة الفتح» بهويته كذلك */
  /* تحقّقُ cf03398 (D-1): صفّان بالهوية نفسِها في اليوم (فردان يتيمان لمجموعةٍ قديمة · صفٌّ مكرَّر) ⇒ يحمل مفتاحُ الفاتح (d = يومُ الصفّ) نصَّه كاملاً
     كالصفّ بلا هوية — فلا يقع الفعلُ على توأمه بعد إزاحة صفوف اليوم */
  _tkKey(r, d) {
    if (!Array.isArray(r)) return null;
    const k = { id: null == r[13] ? null : r[13], ek: null == r[14] ? "" : String(r[14]), e22: "string" === typeof r[22] ? r[22] : "", sig: null == r[13] ? JSON.stringify(r) : "" };
    if (!k.sig && null != d) {
      const L = (this.loadAllTasks() || {})[this.state.year + "-" + this.state.month + "-" + d] || [];
      L.filter((q) => this._tkSame(q, k)).length > 1 && (k.sig = JSON.stringify(r));
    }
    return k;
  }
  _tkSame(r, k) {
    return Array.isArray(r) && (null == r[13] ? null : r[13]) === k.id && (null == r[14] ? "" : String(r[14])) === k.ek && (!k.e22 || r[22] === k.e22);
  }
  _tkIdx(L, i, k) {
    L = Array.isArray(L) ? L : [];
    if (!k) return Array.isArray(L[i]) ? i : -1;
    const m = (r) => this._tkSame(r, k) && (!k.sig || JSON.stringify(r) === k.sig);
    if (m(L[i])) return i;
    for (let j = 0; j < L.length; j++) if (m(L[j])) return j;
    return -1;
  }
  /* مفتاحُ قائمة الصفّ المفتوحة (C-3): هويتُه — وترتيبُه بين توائمه (D-1) — وبلا هوية: موضعُه (I-2: فعلُها على الصفّ الذي تظهر عليه وتأكيدُه بعنوانه) */
  _tkMk(r, s, A) {
    if (null == r[13]) return "@" + s;
    const k = this._tkKey(r);
    let n = 0;
    for (let j = 0; j < s; j++) this._tkSame(A && A[j], k) && n++;
    return r[13] + ":" + k.ek + (n ? "#" + n : "");
  }
  _tkGone() {
    this.bsToast("تغيّرت هذه المهمة من جهازٍ آخر والنافذةُ مفتوحة (حُذفت أو أُعيد إسنادُها أو تغيّر مكلَّفُها) — لم يُحفظ شيء؛ أعد فتحها", "warn");
  }
  /* تحقّقُ fa5a5bf (V-6): مهمةٌ أغلقها الخادم (أُلغيت · أُعيد إسنادُها) لا تُقبل ولا تُنهى — كحاجز V-5 في التعديل */
  _tkShut(r) {
    const x = r && r[23] && "object" === typeof r[23] ? r[23] : null;
    return !!(x && ("cancelled" === x.asg || "reassigned" === x.asg));
  }
  /* الموجة 1 · DG-01: صفُّ العرض خارج مؤشرات العمل (حلقاتُ الشهر · أوسمةُ اليوم · «أُنجزت كلها» في شريط الأيام) — ملغاةٌ أو نسخةٌ أُعيد إسنادُها
     (صفُّها الجديد يُعدّ عند المكلَّف الجديد) — كما تُسقطها الإنتاجية (logic-prod.js) */
  _tkOut(x) {
    return !!x && ("cancelled" === x.status || "reassigned" === x.status || this._tkShut(x.tkcT));
  }
  /* الملغاةُ وحدها (لا نسخةُ «أُعيد إسنادها») — عددُها يُذكر «خارج الحساب» */
  _tkCan(x) {
    const r = x && x.tkcT,
      q = r && r[23] && "object" === typeof r[23] ? r[23] : null;
    return !!x && ("cancelled" === x.status || !!(q && "cancelled" === q.asg));
  }
  async _doAccept(t, e) {
    const n = this.state,
      a = n.acceptRef;
    if (!a) return;
    const r = n.year + "-" + n.month + "-" + a.d;
    (await this.mutateStore((n) => {
      const s = (n[r] || []).map((t) => t.slice()),
        q = this._tkIdx(s, a.i, a.k);
      if (q < 0) return (this._tkGone(), !1);
      if (this._tkShut(s[q])) return (this.bsToast("المهمةُ ملغاةٌ أو أُعيد إسنادُها — لا تُقبل؛ أنشئ مهمةً جديدة للموظف", "warn"), !1);
      for (; s[q].length < 15; ) s[q].push(null);
      /* KIVO_265 · تحقّقُ 648242f (V-1): مهمةٌ عامةٌ تُسند الآن — عمودُها 20 (استلامُ من حُذف أو اعتذارُه، يبقى بعد تنظيف حذفه) لا ينتقل إلى المكلَّف الجديد
         (ملكُ الموظف — الخادمُ يرفضه task-asg: 018 taskOwnWhy). والمسنَدةُ لصاحبها يبقى عمودُها */
      const g = !s[q][14];
      ((s[q][11] = Date.now()),
        (s[q][12] = null),
        (s[q][3] = "in_progress"),
        t && ((s[q][7] = [t.charAt(0)]), (s[q][8] = t), (s[q][14] = e || null)),
        g && s[q][14] && s[q][20] && (s[q][20] = null),
        (n[r] = s));
    }, "acceptRef", { ref: a, name: t, ekey: e })) && this.setState({ acceptRef: null });
  }
  async _doFinish(t, e, k) {
    const n = this.state,
      a = n.year + "-" + n.month + "-" + t;
    return this.mutateStore((t) => {
      const n = (t[a] || []).map((t) => t.slice());
      e = this._tkIdx(n, e, k);
      if (e < 0) return (this._tkGone(), !1);
      if (this._tkShut(n[e])) return (this.bsToast("المهمةُ ملغاةٌ أو أُعيد إسنادُها — لا تُنهى", "warn"), !1);
      for (; n[e].length < 15; ) n[e].push(null);
      const r = Date.now();
      ((n[e][12] = r), (n[e][3] = "done"), (n[e][6] = this.perfRow(n[e], r)), (t[a] = n));
    }, "confirmFinish");
  }
  _doReopen(t, e, k) {
    const n = this.state,
      a = n.year + "-" + n.month + "-" + t;
    /* تحقّقُ c4f79a0 (C-3): بهوية الصفّ لا بموضعه */
    e = this._tkIdx(this.loadAllTasks()[a], e, k);
    if (e < 0) return void this._tkGone();
    /* KIVO_265 · H-1: في الخادم تُعاد فتحُ المهمة من /api/tasks/reopen (العمودُ 23 — قرارُ المراجعة «أُعيدت» — يكتبه الخادمُ وحده) */
    if (this._tkSrv()) {
      const r = (this.loadAllTasks()[a] || [])[e];
      if (!r) return;
      const b = { k: a, id: r[13], ekey: null == r[14] ? void 0 : String(r[14]) },
        fin = (x) => (x.j && 1 === x.j.ok ? this.bsToast(r[14] ? "أُعيدت المهمة للموظف" : "أُعيد فتحُ المهمة", "ok") : this.bsToast(this._tkErr(x, "لم تُعَد فتحُ المهمة — أعد المحاولة")));
      /* KIVO_265 · k265-fix (بوابة 265): في الإنفاذ تتطلب إعادةُ الفتح سبباً (task.reopen · §12) — يرفضها الخادمُ بلا سبب (403 why:reason) فتُعرض نافذةُ السبب
         نفسُها من طبقة التخزين (280 askReason) ثم يُعاد الطلبُ بالسبب؛ والإلغاءُ لا يعيد فتحها. القديمُ يمضي من الطلب الأول كما كان */
      return void this._tkApi("/api/tasks/reopen", b).then((x) => {
        const S = KIVO.__BS_SRV;
        if (!(x.j && "reason" === x.j.why && S && S.askReason)) return fin(x);
        S.askReason("bsdept:" + (this._tkDept() || "") + ":bassam_tasks_v1", x.j.reasonKeys || ["task.reopen"], (why) =>
          why ? this._tkApi("/api/tasks/reopen", Object.assign({}, b, { why: why })).then(fin) : this.bsToast("أُلغيت إعادةُ الفتح لعدم كتابة سبب", "warn"));
      });
    }
    this.bsToast("تحتاج المهمة إلى اتصال الخادم — لم يُحفظ تغيير محلي", "warn");
  }
  _tkClock(t, n) {
    const r = t[10] || null,
      s = t[15] || null,
      o = t[16] || null,
      i = t[11] || null,
      l = t[12] || null,
      h = "done" === t[3],
      c = "declined" === t[3],
      d = (t) => (t < 10 ? "0" + t : "" + t),
      m = (t) => {
        const e = t < 0,
          n = Math.floor(Math.abs(t) / 1e3),
          a = Math.floor(n / 3600),
          r = Math.floor((n % 3600) / 60),
          s = n % 60;
        return (e ? "-" : "") + (a > 0 ? a + ":" + d(r) + ":" + d(s) : d(r) + ":" + d(s));
      },
      y = (t) => {
        const e = Math.round(t / 6e4);
        return e < 1 ? "أقل من دقيقة" : this.tkDurTxt(e);
      };
    let u = "",
      f = "",
      g = !1,
      b = "#059669",
      p = "",
      L = !1,
      N = 1 / 0;
    const B = (t) => {
      t > n && t < N && (N = t);
    };
    if (i) {
      const t = h && l ? l : n;
      if (((u = m(t - i)), r)) {
        const e = i + 6e4 * r - t;
        g = !0;
        const n = e < 0;
        ((b = n ? "#dc2626" : "#059669"),
          (f = n ? "تجاوز " + m(Math.abs(e)) : "متبقٍ " + m(e)),
          (p = h ? "D" : n ? "O" : "R"),
          h || n || B(i + 6e4 * r));
      } else p = h ? "D" : "R";
      L = !(h && l);
    } else ((p = h ? "D" : c ? "C" : o && n > o ? "X" : "P"), h || c || !o || B(o));
    let x = "",
      T = "#64748b",
      M = !1;
    const D = !(!s || !o);
    if (D)
      if (n < s) {
        ((x = "تبدأ بعد " + y(s - n)), (T = "#64748b"), (p += "b"), B(s));
        const e = Math.round((s - n) / 6e4);
        e >= 1 && B(s - (e - 0.5) * 6e4);
      } else if (n <= o) ((x = "متبقٍ " + m(o - n)), (T = "#059669"), (M = !0), (p += "l"), B(o));
      else {
        ((x = "انقضت منذ " + y(n - o)), (T = "#b45309"), (p += "a"));
        const e = Math.round((n - o) / 6e4);
        B(o + (e + 0.5) * 6e4);
      }
    return { el: u, rem: f, hasRem: g, remC: b, win: x, winC: T, winLive: M, hasWin: D, ph: p, on: L || D, sec: L || M, nx: N };
  }
  _tkClockTick() {
    if (document.hidden) return;
    const L = this._tkLiveRows;
    if (!L || !L.length) return;
    const n = Date.now(),
      R = new Array(L.length);
    let s = "";
    for (let k = 0; k < L.length; k++) {
      const w = L[k];
      if (!w.sec && n < w.nx) {
        s += w.ph + "|";
        continue;
      }
      const C = (R[k] = this._tkClock(w.t, n));
      ((w.nx = C.nx), (s += C.ph + "|"));
    }
    if (s !== this._tkPhaseSig) return void this.setState({ now: n });
    let E = this._tkClockEls;
    if (!E) {
      E = this._tkClockEls = new Map();
      const q = document.querySelectorAll("[data-tkc]");
      for (let k = 0; k < q.length; k++) {
        const e = q[k].querySelector(".sc-interp"),
          t = e && e.firstChild;
        if (t && 3 === t.nodeType) {
          const a = q[k].getAttribute("data-tkc"),
            r = E.get(a);
          r ? r.push(t) : E.set(a, [t]);
        }
      }
    }
    const W = (k, v) => {
      const a = E.get(k);
      if (a) for (let t = 0; t < a.length; t++) a[t].nodeValue !== v && (a[t].nodeValue = v);
    };
    for (let k = 0; k < L.length; k++) {
      const w = L[k],
        C = R[k];
      C &&
        (w.el !== C.el && ((w.el = C.el), W("e:" + w.key, C.el)),
        w.rem !== C.rem && ((w.rem = C.rem), W("r:" + w.key, C.rem)),
        w.win !== C.win && ((w.win = C.win), W("w:" + w.key, C.win)));
    }
  }
  timeVals(t, lk) {
    const e = this.state,
      n = Date.now(),
      a = void 0 === lk ? this.monthLockedT(e.year, e.month) : lk,
      r = t[10] || null,
      s = t[15] || null,
      o = t[16] || null,
      i = t[11] || null,
      l = t[12] || null,
      h = "done" === t[3],
      c = !!i,
      d = (t) => (t < 10 ? "0" + t : "" + t),
      m = (t) => {
        const e = t < 0,
          n = Math.floor(Math.abs(t) / 1e3),
          a = Math.floor(n / 3600),
          r = Math.floor((n % 3600) / 60),
          s = n % 60;
        return (e ? "-" : "") + (a > 0 ? a + ":" + d(r) + ":" + d(s) : d(r) + ":" + d(s));
      },
      p = (t) => {
        if (!t) return "";
        const e = Math.floor(t / 60),
          n = t % 60;
        return (e ? e + " س" : "") + (e && n ? " " : "") + (n ? n + " د" : "");
      };
    const C = this._tkClock(t, n),
      u = C.el,
      f = C.rem,
      g = C.hasRem,
      b = C.remC,
      y = (t) => {
        const e = Math.round(t / 6e4);
        return e < 1 ? "أقل من دقيقة" : this.tkDurTxt(e);
      };
    let k = "",
      w = "#047857",
      S = !1;
    i && o && ((S = !0), i <= o ? ((k = "استجاب في وقته"), (w = "#047857")) : ((k = "تأخّر في القبول " + y(i - o)), (w = "#b45309")));
    const x = C.win,
      T = C.winC,
      M = C.winLive,
      D = C.hasWin;
    return {
      tkStartTxt: s ? this.tkClock(s) : "",
      tkStartDay: s ? this.tkHDay(s) : "",
      tkEndTxt: o ? this.tkClock(o) : "",
      tkEndDay: o ? this.tkHDay(o) : "",
      hasStart: !!s,
      hasEnd: !!o,
      noStart: !s,
      noEnd: !o,
      hasWindow: D,
      noWindow: !D,
      winTxt: x,
      winColor: T,
      winIsLive: M,
      hasResp: S,
      respTxt: k,
      respColor: w,
      winDurTxt: r ? "مدة المهمة: " + p(r) : "",
      hasWinDur: !!r,
      dueTxt: p(r),
      hasDue: !!r,
      showRunning: c && !h,
      showAccept: !c && !h && !a && !this._tkShut(t) && this.PC("edit") && !t[14],
      showDone: h && c,
      showFinish: c && !h && !a && !this._tkShut(t) && this.PC("edit") && !t[14],
      showReopen: !1,
      canReopen: h && !a && this.PC("edit"),
      ownOn: !!t[14] && !c && !h,
      ownTxt:
        t[16] && Date.now() > t[16]
          ? "لم يقبلها الموظف حتى انقضت المهلة"
          : "declined" === t[3]
            ? "اعتذر الموظف عنها"
            : "بانتظار قبول الموظف",
      ownC: (t[16] && Date.now() > t[16]) || "declined" === t[3] ? "#b45309" : "#64748b",
      elapsedTxt: u,
      remainTxt: f,
      hasRemain: g,
      remainColor: b,
      tkcOn: C.on,
      tkcPh: C.ph,
      tkcSec: C.sec,
      tkcNx: C.nx,
      doneElapsedTxt: h && c ? u : "",
      accChipOn: c,
      accChipTxt: h ? "قُبلت وأُنجزت" : "قَبِلها الموظف",
      accChipTip: i ? "قَبِل الموظف المهمة " + this.tkClock(i) + " وبدأ احتساب وقتها" : "",
    };
  }
  /* ═══ KIVO_264 · KIVO-Tasks (المرحلة الثانية) — دورةُ المهمة من جهة المسؤول (الحكمُ للخادم: /api/tasks/*) ═══
     الإنشاءُ بإعداداتٍ متقدمة مطويّة (سياسةُ الإثبات ق2 · المراجِع ق3 · الاعتذار · التكرار ق5) وملخّصٍ قبل الاعتماد، وفحصُ أهليةٍ يُكشف قبل الإسناد ·
     مراجعةُ التسليم (اعتمادٌ أو إعادةٌ بسبب) · تمديدُ المهلة (ق6) · إعادةُ الإسناد بنسخةٍ جديدة (RC-13) · إلغاءٌ منطقيّ · ربطٌ يدويٌّ لـ«غير مرتبطة» (ق4) ·
     سجلُّ المهمة. الصفحةُ تقرأ ما يكتبه الخادم من /api/changes كعادتها (bassam:remote). بلا خادم (لا __BS_BOOT.srv): المسارُ المحلي القديم كما هو. */
  /* Task workflows use the existing server commands. Operational edits use sealed SQL-backed tickets. */
  _tkSrv() {
    return !!(window.__BS_BOOT && window.__BS_BOOT.srv);
  }
  _tkM() {
    return KIVO.BassamTaskModel || null;
  }
  _tkDept() {
    try {
      return (KIVO.BassamDepts && KIVO.BassamDepts.active()) || "";
    } catch (t) {
      return "";   /* بلا سجلّ إدارات: يحدّدها الخادمُ من حسابك */
    }
  }
  _tkMe() {
    try {
      return (KIVO.BassamAuth && KIVO.BassamAuth.user && KIVO.BassamAuth.user()) || null;
    } catch (t) {
      return null;   /* بلا طبقة الحسابات (معاينة): لا هوية */
    }
  }
  _tkApi(p, b) {
    /* KIVO_264 · C1 (عقدُ /api/save نفسُه): هويةُ الجلسة التي بُنيت لها الصفحة (BOOT.uid) في كلّ طلب — حسابٌ آخر دخل في المتصفح نفسِه ⇒ 409 session-changed بلا أثر */
    const U = window.__BS_BOOT && "string" === typeof window.__BS_BOOT.uid ? window.__BS_BOOT.uid : "",
      o =
        void 0 === b
          ? { credentials: "same-origin", cache: "no-store" }
          : { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.assign({ dept: this._tkDept() || void 0, uid: U || void 0 }, b)) };
    void 0 === b && U && (p += (p.indexOf("?") >= 0 ? "&" : "?") + "uid=" + encodeURIComponent(U));
    return fetch(p, o).then(
      (r) =>
        r.text().then((t) => {
          let j = null;
          try {
            j = JSON.parse(t);
          } catch (e) {
            j = null;   /* ردٌّ غيرُ JSON ⇒ فشلٌ صريح */
          }
          if (!(r.status >= 200 && r.status < 300) && j && j.ok === 1) j = { ok: 0, err: "invalid" };
          const answer = { status: r.status, j: j };
          if (b !== undefined && !["/api/tasks/create", "/api/tasks/settings", "/api/tasks/recur"].includes(p) && r.status >= 200 && r.status < 300 && j && j.ok === 1) {
            const S = this._tkOps();
            return S.read([S.key("bassam_tasks_v1")]).then((result) => {
              if (result && result.ok === 1) this.setState({ tasksAll: this.loadAllTasks() });
              return answer;
            });
          }
          return answer;
        }),
      () => ({ status: 0, j: null }),
    );
  }
  async _tkCommandApi(path, intent, slot) {
    slot = slot || "newTaskOpen";
    const S = this._tkOps(), pending = this._tkCommands || (this._tkCommands = {}), signature = JSON.stringify({ path: path, intent: intent });
    let request = pending[slot];
    if (request && request.signature !== signature) {
      if (request.state !== "blocked") return { status: 409, j: { ok: 0, err: "uncertain", msg: "الطلب السابق لم يُحسم — أعد حفظ المسودة نفسها أولاً" } };
      delete pending[slot]; request = null;
    }
    try {
      if (!request) {
        const opened = this._tkDrafts && this._tkDrafts[slot], draft = opened && opened.draft || S.draft();
        if (path !== "/api/tasks/create") draft.get("bassam_tasks_v1");
        const context = draft.context, body = Object.assign({}, intent, { dept: context.dept, uid: context.uid, epoch: context.epoch,
          requestId: window.crypto.randomUUID() });
        if (path !== "/api/tasks/create") body.base = opened ? opened.base : KIVO.__BS_SRV.rev(S.key("bassam_tasks_v1"));
        request = pending[slot] = { signature: signature, body: body, context: context, path: path, intent: JSON.parse(JSON.stringify(intent)),
          formSignature: slot === "newTaskOpen" ? this._tkFormSignature() : null, state: "staged" };
      }
      if (request.sending) return request.sending;
      const now = S.context();
      if (!now || now.uid !== request.context.uid || now.dept !== request.context.dept || S.status().epoch !== request.context.epoch)
        return { status: 409, j: { ok: 0, err: "session-changed" } };
      request.sending = this._tkApi(path, request.body).then(async (answer) => {
        const current = S.context(), j = answer.j, key = "bsdept:" + request.context.dept + ":bassam_tasks_v1";
        const ack = current && current.uid === request.context.uid && current.dept === request.context.dept && S.status().epoch === request.context.epoch &&
          answer.status >= 200 && answer.status < 300 && j && j.ok === 1 && j.requestId === request.body.requestId && j.epoch === request.body.epoch && j.atomic === 1 &&
          j.revs && Object.keys(j.revs).length === 1 && Number.isSafeInteger(j.revs[key]) && j.revs[key] >= 0 && j.rev === j.revs[key] &&
          (path === "/api/tasks/create" ? Array.isArray(j.rows) && j.rows.length > 0 && j.rows.every((row) => row && row.k === request.body.k && row.id != null) : Number.isSafeInteger(j.n) && j.n > 0);
        if (!ack) {
          request.state = answer.status >= 400 && answer.status < 500 && j && j.ok === 0 && j.err !== "session-changed" ? "blocked" : "uncertain";
          return request.state === "blocked" ? answer : { status: answer.status, j: { ok: 0, err: "uncertain", msg: "لم يصل إقرار كامل — المسودة باقية؛ أعد الحفظ بنفس الطلب" } };
        }
        delete pending[slot];
        if (this._tkDrafts) delete this._tkDrafts[slot];
        const refreshed = await S.read([key]);
        if (refreshed && refreshed.ok === 1) { this._tkLSBust(); this.setState({ tasksAll: this.loadAllTasks() }); }
        return answer;
      }).finally(() => { request.sending = null; });
      return await request.sending;
    } catch (error) {
      if (request) request.state = "uncertain";
      return { status: 409, j: { ok: 0, err: request ? "uncertain" : "review-required", msg: "لم يُؤكَّد الحفظ — المسودة باقية؛ راجع الجلسة وأعد الطلب نفسه" } };
    }
  }
  _tkFormSignature() {
    const keys = ["editRef", "year", "month", "newTitle", "newDesc", "newPrio", "newDay", "newEDay", "newSh", "newSm", "newSap", "newEh", "newEm", "newEap",
      "newAsg", "newPick", "pickWt", "newAdvTouched", "newPol", "newPolN", "newSteps", "newRv", "newDecOk", "newWinEarlyOn", "newWinEarly", "newWinLateOn", "newWinLate",
      "newRec", "newRecWd", "newRecMd", "newRecN", "newRecEnd", "newRecTo", "newRecFor", "newRecSig"];
    return JSON.stringify(keys.map((key) => this.state[key]));
  }
  async _tkPendingEditor() {
    const pending = this._tkCommands && this._tkCommands.newTaskOpen;
    if (!pending || pending.state === "blocked") return false;
    if (pending.formSignature !== this._tkFormSignature()) {
      this.bsToast("الطلب السابق لم يُحسم — أعد المسودة السابقة قبل تكرار الحفظ", "warn");
      return true;
    }
    if (pending.path === "/api/tasks/create") await this._tkCreateSrv(pending.intent);
    else {
      const answer = await this._tkCommandApi(pending.path, pending.intent, "newTaskOpen");
      if (answer.j && answer.j.ok === 1) this.setState({ newTaskOpen: false, editRef: null });
      else this.bsToast(this._tkErr(answer), "warn");
    }
    return true;
  }
  _tkErr(x, d) {
    const M = { denied: "رفض الخادم — صلاحيتك لا تشمل هذا الفعل", locked: "شهرُ المهمة معتمدٌ ومقفل", "not-found": "لم تعد المهمة كما كانت — حدّث الصفحة",
      state: "تغيّرت حالة المهمة — حدّث الصفحة", busy: "تعديلٌ متزامن — أعد المحاولة", "session-changed": "تغيّرت الجلسة في هذا المتصفح (دخل حسابٌ آخر) — لم يُحفظ شيء · أعد تحميل الصفحة", forbidden: "لا تملك قراءةَ مهام هذه الإدارة", "bad-body": "طلبٌ غيرُ صالح",
      asg: "موظفٌ بلا معرّفٍ ثابت في سجل الإدارة — أكمل بياناته أولاً", dup: "المكلَّفُ الجديد مسنَدةٌ إليه هذه المهمةُ أصلاً", linked: "الصفُّ مرتبطٌ أصلاً — استعمل إعادةَ الإسناد" },
      /* KIVO_265 · التكرار في النموذج: رموزُ الخادم (err أو at لـbad-body) تُعرض بنصّها هنا قبل msg — واحدٌ لكل حالة */
      RC = { "rec-asg": "المهمة المتكررة تحتاج مكلَّفاً واحداً على الأقل", "rec-ended": "انتهت سلسلة التكرار — لا يمكن تعديلها أو استئنافها", "month-locked": M.locked,
        "rec.to": "تاريخ النهاية أبعد من المسموح (3 سنوات)", "rec.wd": "اختر يوماً واحداً على الأقل", "rec.md": "اختر يوم الشهر" },
      j = x && x.j,
      rc = j && (("month-locked" === j.err && j.msg) || RC[j.err] || RC[j.at]);   /* month-locked: نصُّ الخادم إن وُجد (أيُّ مواعيد السلسلة في شهرٍ مقفل) */
    return rc || (j && (j.msg || M[j.err])) || (x && 0 === x.status ? "لم يُحفظ — لا اتصال بالخادم. أعد المحاولة" : d || "تعذّر التنفيذ — أعد المحاولة");
  }
  _tkChip(on) {
    return (
      "height:30px;padding:0 11px;border-radius:9px;font-size:11px;cursor:pointer;transition:all .15s;font-family:'Cairo',sans-serif;border:1px solid " +
      (on ? "var(--tone-gold-50-a40);background:var(--tone-gold-50-a10);color:var(--brand-text);font-weight:700" : "var(--border-default);background:var(--bg-surface);color:var(--text-secondary);font-weight:400")
    );
  }
  _tkHasActivity(i) {
    /* KIVO_265 · إعادةُ المراجعة (N-8 ب): وصفٌّ أغلقه الخادم (أُلغي · أُعيد إسنادُه) — مرآةُ 070 tkRowActive (الخادمُ يرفض تغييرَ مكلَّفه: task-asg) */
    const x = i && i[23] && "object" === typeof i[23] ? i[23] : null;
    return !!(i && (i[11] || i[12] || i[20] || i[21] || (i[3] && "pending" !== i[3]) || (x && ("cancelled" === x.asg || "reassigned" === x.asg))));
  }
  _tkEntId(r) {
    if (r && "string" === typeof r[22] && r[22]) return r[22];
    try {
      return KIVO.BassamAudit && KIVO.BassamAudit.taskId ? KIVO.BassamAudit.taskId(r) : "";
    } catch (t) {
      return "";   /* بلا طبقة السجل: لا معرّف ⇒ لا سجلّ يُعرض */
    }
  }
  _tkDayN(k) {
    const a = String(k || "").split("-").map(Number);
    return 3 === a.length && a[0] > 0 && a[1] > 0 && a[2] > 0 ? 1e4 * a[0] + 100 * a[1] + a[2] : 0;
  }
  /* KIVO_265 · مراجعة U6: اليومُ التشغيلي كالخادم (070 tkToday): هجريُّ الرياض قبل ثلاث ساعات (KIVO.BassamProfileFacts.hijriAt) — وبدونها يومُ الجهاز */
  _tkTodayK() {
    const PF = KIVO.BassamProfileFacts,
      T = PF && PF.hijriAt ? PF.hijriAt(Date.now() - 108e5) : this.hToday();
    return T.y + "-" + T.m + "-" + T.d;
  }
  /* رقمُ اليوم الهجري الجاري — يُحفظ دقيقةً (حالةُ كل صفٍّ متكرر في الجدول تقارن به) */
  _tkTodayN() {
    const t = Date.now(),
      c = this._tkTdN;
    if (c && t - c.at < 6e4) return c.n;
    this._tkTdN = { at: t, n: this._tkDayN(this._tkTodayK()) };
    return this._tkTdN.n;
  }
  _tkWdOf(k) {
    try {
      const a = String(k).split("-").map(Number);
      return this.hGreg(a[0], a[1], a[2]).getDay();
    } catch (t) {
      return 0;   /* يومٌ غيرُ قابلٍ للتحويل: الأحد */
    }
  }
  /* ═══ KIVO_265 · كروتُ الأيام وكرتُ اليوم في صفحة المهام (طلبُ المالك 2026-10-20) ═══
     شريطُ الأيام نسخةُ شريط التقرير اليومي حرفاً (الخانةُ وحجمُها وألوانُها وحدُّ المختار ونقطةُ اليوم الجاري — برموز السمة نفسِها): ذهبيٌّ إن كان
     في اليوم مهام وأخضرُ إن أُنجزت كلها · والنقرُ يعرض في «كرت اليوم» عنوانَه ومؤشراتِه (فكرةُ «نموذج صفحة المهام المقترح») ومهامَه في الجدول نفسِه */
  _tkDayDef(e, s) {
    return e.year === s.y && e.month === s.m ? s.d : 0;
  }
  /* الفحص العميق 2026-10-21 (DG-14): اختيارُ اليوم/«الشهر كاملاً» يُحمل أيضاً بمفتاحين بدائيين (tkDayK «y-m» · tkDayD اليوم أو 0) تحفظهما
     حالةُ العرض (sessionStorage) فيبقى بعد التحديث والرجوع — كائنُ tkDaySel لا يُحفظ */
  _tkDaySelOf(e) {
    return e.tkDaySel || (e.tkDayK ? { k: e.tkDayK, d: +e.tkDayD || 0 } : null);
  }
  _tkDayStrip(c, shown, e, s, sel, eff) {
    const N = {},
      DN = {},
      WD = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
      MN = this.MONTHS[e.month - 1] || "",
      SK = e.year + "-" + e.month,
      cur = e.year === s.y && e.month === s.m,
      i = this.mDays(e.year, e.month - 1),
      g = this.hGreg(e.year, e.month, 1),
      g0 = new Date(g.getFullYear(), g.getMonth(), g.getDate(), 12),
      gd = (a) => new Date(g0.getTime() + 864e5 * (a - 1)),
      days = [];
    /* LV: مهامُ اليوم القائمة (DG-01) — «أُنجزت كلها» تُقاس بها لا بالملغاة */
    const LV = {};
    c.forEach((x) => {
      N[x.dayNum] = (N[x.dayNum] || 0) + 1;
      this._tkOut(x) || (LV[x.dayNum] = (LV[x.dayNum] || 0) + 1);
      "done" === x.status && (DN[x.dayNum] = (DN[x.dayNum] || 0) + 1);
    });
    let filled = 0;
    const AP = this.PC("approve");
    for (let a = 1; a <= i; a++) {
      const G = gd(a),
        n = N[a] || 0,
        done = LV[a] > 0 && DN[a] === LV[a],
        D = this._tkDayLockOf(e.year, e.month, a);
      n && filled++;
      /* كخانة التقرير اليومي (dreport/logic.js): خلفيةٌ ولونٌ وحدٌّ — ذهبيٌّ فيه مهام · أخضرُ أُنجزت كلها · رماديٌّ داكنٌ مقفلٌ فيه مهام ·
         رماديٌّ فاتحٌ مقفلٌ فارغ · والمختارُ حدُّه ذهبيٌّ بعرض 2px · وشارةُ القفل (مقفل/مفتوح بأثر رجعي) أعلى الخانة */
      const bg = n ? (done ? "var(--bg-x047857)" : D.locked ? "var(--bg-x64748b)" : "var(--bg-xb99751)") : D.locked ? "var(--bg-a1481631840p12)" : "var(--bg-xffffff)",
        fg = n ? "var(--fg-xffffff)" : D.locked ? "var(--fg-x94a3b8)" : "var(--fg-x53565a)",
        bd = a === sel ? "2px solid var(--bd-xb99751)" : n ? "2px solid transparent" : "2px solid var(--bd-xe1e1e1)",
        op = D.shut ? "unshut" : D.locked ? "open" : D.opened ? "relock" : "close",
        hint = D.approved
          ? " · الشهر معتمد ومقفل"
          : D.shut
            ? " · مُغلق — عرضٌ فقط" + (AP ? " · نقرة مزدوجة لفتحه" : "")
            : D.locked
              ? " · انقضى — مقفل" + (AP ? " · نقرة مزدوجة لفتحه بأثر رجعي" : "")
              : D.past
                ? " · مفتوح بأثر رجعي" + (AP ? " — نقرة مزدوجة لإغلاقه" : "")
                : AP
                  ? " · نقرة مزدوجة لإغلاق اليوم"
                  : "";
      days.push({
        num: String(a),
        gnum: String(G.getDate()),
        isToday: cur && a === s.d,
        lockClosed: D.locked,
        lockOpen: D.past && !D.locked,
        tip: WD[G.getDay()] + " " + a + " " + MN + " — " + (n ? KIVO.BassamCount(String(n), "مهمة") + (done && LV[a] === n ? " · أُنجزت كلها" : DN[a] ? " · " + DN[a] + " منجزة" : "") + (n > (LV[a] || 0) ? " · " + (n - (LV[a] || 0)) + " ملغاة أو أُعيد إسنادها" : "") : "لا مهام") + hint,
        dbl: (ev) => {
          try {
            ev && ev.stopPropagation && ev.stopPropagation();
          } catch (x) { /* حدثٌ بلا انتشار */ }
          AP
            ? D.approved
              ? this.bsToast("الشهر معتمد ومقفل — افتحه أولاً بنقرة مزدوجة على كرت الشهر.")
              : this._tkOpen({ retroAsk: { m: e.month, day: a, op: op } })
            : this.bsToast("فتحُ اليوم وإغلاقُه يحتاج صلاحية الاعتماد");
        },
        style:
          "position:relative;height:24px;flex:1 1 auto;min-width:28px;padding:0 3px;border-radius:4px;font-size:8px;font-weight:700;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;user-select:none;background:" +
          bg +
          ";color:" +
          fg +
          ";border:" +
          bd,
        sepStyle: "display:block;width:9px;height:1px;flex-shrink:0;margin:1px 0;background:" + (n ? "var(--bg-a2552552550p5)" : "var(--bg-a1481631840p55)"),
        click: () => this.setState({ tkDaySel: { k: SK, d: a }, tkDayK: SK, tkDayD: a, tkKf: null, search: "", page: 1, tkDayClosed: {} }),
      });
    }
    const today = !!eff && cur && eff === s.d,
      DL = eff ? this._tkDayLockOf(e.year, e.month, eff) : null;
    let title = "مهام شهر " + MN + " " + e.year + " هـ — كل الأيام",
      sub = "";
    if (eff) {
      const G = gd(eff);
      title = (today ? "مهام اليوم — " : "مهام يوم ") + WD[G.getDay()] + " " + eff + " " + MN + " " + e.year + " هـ";
      try {
        sub = "الموافق " + G.toLocaleDateString("ar-u-ca-gregory-nu-latn", { day: "numeric", month: "long", year: "numeric" }) + " م";
      } catch (x) { /* بلا تقويم ميلادي في المتصفح ⇒ بلا سطر «الموافق» */ }
    } else if (sel) title = "نتائج البحث في مهام شهر " + MN + " " + e.year + " هـ";
    return {
      tkDayStripOn: "prod" !== e.sub,
      tkDays: days,
      tkDaysN: String(filled),
      tkDayTitle: title,
      tkDaySub: sub,
      tkDayCount: KIVO.BassamCount(String(shown), "مهمة"),
      /* شارةُ قفل اليوم المختار في رأس كرته (كشارة التقرير اليومي) */
      tkDayLockOn: !!DL && (DL.locked || DL.opened || (DL.past && DL.viaMonth)),
      tkDayLockShut: !!DL && DL.locked,
      tkDayLockOpenI: !!DL && !DL.locked,
      tkDayLockTxt: !DL
        ? ""
        : DL.approved
          ? "الشهر معتمد ومقفل — المهام للعرض فقط"
          : DL.shut
            ? "اليوم مُغلق — المهام للعرض فقط · " + (AP ? "افتحه بنقرة مزدوجة على خانته" : "فتحه يحتاج صلاحية الاعتماد")
            : DL.locked
              ? "اليوم انقضى — المهام مقفلة تلقائياً · " + (AP ? "افتحه بأثر رجعي بنقرة مزدوجة على خانته" : "فتحه بأثر رجعي يحتاج صلاحية الاعتماد")
              : "يوم منقضٍ مفتوح بأثر رجعي" + (AP ? " — يُعاد قفله بنقرة مزدوجة على خانته" : ""),
      tkDayLockStyle:
        "display:inline-flex;align-items:center;gap:6px;padding:4px 11px;border-radius:9999px;font-size:11px;font-weight:700;border:1px solid " +
        (DL && DL.locked ? "var(--bd-a1001161390p22);background:var(--bg-a1001161390p06);color:var(--fg-x475569)" : "var(--warning-border);background:var(--warning-bg);color:var(--warning-text)"),
      /* «الشهر كاملاً» في رأس كرت اليوم — وفي الشهر كاملاً «عرض اليوم» يعود إلى اليوم الجاري */
      tkDayAllOn: !!sel || (cur && !eff),
      tkDayAllTxt: sel ? "الشهر كاملاً" : "عرض اليوم",
      tkDayAll: () => {
        const d = sel ? 0 : cur ? s.d : 0;
        this.setState({ tkDaySel: { k: SK, d: d }, tkDayK: SK, tkDayD: d, tkKf: null, page: 1 });
      },
      ...this._tkDayKpis(eff ? c.filter((x) => x.dayNum === eff) : c, eff ? (today ? "مهام اليوم" : "مهام هذا اليوم") : "مهام الشهر", { SK: SK, eff: eff, shown: shown, KF: this._tkKfOf(e, SK, eff || 0) }),
    };
  }
  /* نافذةُ فتح اليوم وإغلاقه (نافذةُ «فتح الشهر بأثر رجعي» نفسُها بنصوص اليوم): open يومٌ منقضٍ يُفتح بأثر رجعي · relock يُعاد قفلُه ·
     close يُغلق يومٌ مفتوح بيده · unshut يُفتح ما أُغلق — والفتحُ في وضع الإنفاذ يطلب السببَ من نافذة السبب المعتادة (task.month.reopen) */
  _tkDayAskVals(t, n) {
    const e = this.state,
      G = this.hGreg(e.year, t.m, t.day),
      WD = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
      lbl = (G ? WD[G.getDay()] + " " : "") + t.day + " " + n + " " + e.year + " هـ",
      op = t.op,
      openish = "open" === op || "unshut" === op,
      T = {
        open: ["فتح يوم " + lbl + " بأثر رجعي", "هذا اليوم انقضى وأُقفل تلقائياً. فتحه يتيح لك إضافة مهامه أو تعديلها بأثر رجعي.", "ما تضيفه يُسجَّل ضمن هذا اليوم المنقضي", "يبقى مفتوحاً حتى تعيد قفله", "يُعاد قفله بنقرة مزدوجة على خانته", "فتح بأثر رجعي", "فُتح اليوم — يمكنك الآن إضافة مهامه وتعديلها"],
        relock: ["إعادة قفل يوم " + lbl, "سيعود اليوم إلى حالته المقفلة بانقضائه، ولن يمكن إضافة مهامه أو تعديلها حتى تفتحه من جديد.", "ما أضفته يبقى محفوظاً كما هو", "تسليماتُ الموظفين ومراجعتُها تبقى متاحة", "يمكنك فتحه مجدداً بنقرة مزدوجة", "إعادة القفل", "أُعيد قفلُ اليوم — صار عرضاً فقط"],
        close: ["إغلاق يوم " + lbl, "سيُغلق اليوم فلا تُضاف مهامه ولا تُعدَّل — عرضٌ فقط.", "ما سُجّل فيه يبقى كما هو", "تسليماتُ الموظفين ومراجعتُها تبقى متاحة", "يُفتح بنقرة مزدوجة على خانته", "إغلاق اليوم", "أُغلق اليوم — صار عرضاً فقط"],
        unshut: ["فتح يوم " + lbl, "سيُفتح اليوم فتعود إضافةُ مهامه وتعديلُها متاحة.", "ما سُجّل فيه يبقى كما هو", "يمكنك إغلاقه مجدداً بنقرة مزدوجة", "", "فتح اليوم", "فُتح اليوم"],
      }[op] || [];
    return {
      retroOn: !0,
      retroTitle: T[0],
      retroMsg: T[1],
      retroB1: T[2],
      retroB2: T[3],
      retroB3: T[4],
      retroBtn: T[5],
      retroBtnStyle:
        "height:38px;padding:0 20px;border-radius:10px;font-size:13px;font-weight:400;border:0;cursor:pointer;color:var(--fg-xffffff);font-family:'Cairo',sans-serif;background:" +
        (openish ? "var(--bg-xb45309)" : "var(--bg-x64748b)"),
      retroDo: async () => {
        /* المغلقُ بيده يومٌ منقضٍ الآن ⇒ «فتح» يفتحه بأثر رجعي ({mo:1}) لا يمحو الإغلاق فيعود مقفلاً بانقضائه (كالتقرير اليومي: drToggleDayLock) */
        const D0 = this._tkDayLockOf(e.year, t.m, t.day),
          w = "open" === op || ("unshut" === op && D0.past && !D0.viaMonth) ? "open" : "close" === op ? "close" : "clear";
        (await this._setDayLockT(e.year, t.m, t.day, w)) && (this.setState({ retroAsk: null }), this.bsToast(T[6], "ok"));
      },
      retroCancel: () => this._tkClose("retroAsk", { retroAsk: null }),
      retroStop: (x) => x.stopPropagation(),
    };
  }
  /* مؤشراتُ كرت اليوم (فكرةُ «نموذج صفحة المهام المقترح» تحت عنوان «مهام اليوم — التاريخ»): مهامُ اليوم (الموجّهة · العامة) · المكتملةُ في الوقت ·
     المتأخرةُ عن المهلة · بانتظار الاعتماد (وأقدمُها) · متوسطُ زمن الإنجاز مقابل المخطط — من مهام اليوم كلها (لا من البحث والفلاتر) */
  /* KIVO_265 · مؤشراتُ اليوم «أوسمة اليوم» (اختيارُ المالك 2026-10-20): كلُّ علامةٍ في حلقة الوسم مهمةٌ من مهام اليوم وتضيء حصّةُ المؤشر وحدها
     (فوق 96 مهمة تُقاس العلاماتُ بالنسبة) · وحلقةُ الزمن علاماتُها دقائقُ المخطط: المنجزُ ثم الموفَّرُ (أخضر باهت) أو الزائدُ (برتقالي) ·
     والضغطُ على مؤشرٍ يصفّي جدولَ اليوم به (tkKf لليوم نفسِه) ويُلغى من شريحته في شريط الأدوات أو بالضغط عليه ثانيةً أو على «مهام اليوم» */
  _tkTicks(n, k, pat) {
    const T = n > 0 ? Math.min(n, 96) : 48,
      kk = n > 0 ? (n > 96 ? (k > 0 ? Math.max(1, Math.round((k * 96) / n)) : 0) : Math.min(k, n)) : 0,
      P = pat || "0.62 0.38";
    return { T: String(T), lit: kk <= 0 ? "0 " + T : kk >= T ? P : Array(kk).fill(P).join(" ") + " 0 " + T };
  }
  _tkKfOf(e, SK, d) {
    const f = e.tkKf;
    return f && f.k === SK && f.d === d && f.f ? f.f : null;
  }
  _tkKfRow(x, f) {
    const r = x.tkcT || [],
      pc = Array.isArray(r[6]) ? r[6][0] : "";
    return "ok" === f ? "done" === x.status && ("early" === pc || "on_time" === pc) : "late" === f ? "overdue" === x.status : "wait" === f ? "review" === x.status : "time" === f ? !!x.apOn : !0;
  }
  _tkDayKpis(L0, lbl, X) {
    X = X || {};
    /* DG-01: الأوسمةُ من مهام اليوم القائمة — الملغاةُ ونسخُ «أُعيد إسنادها» خارج الإجمالي والنِّسَب */
    const L = (L0 || []).filter((x) => !this._tkOut(x)),
      cx = (L0 || []).filter((x) => this._tkCan(x)).length;
    let dir = 0,
      ok = 0,
      late = 0,
      exp = 0,
      rv = 0,
      rvAt = 0,
      na = 0,
      sa = 0,
      np = 0,
      sp = 0,
      sap = 0;
    L.forEach((x) => {
      const r = x.tkcT || [],
        pc = Array.isArray(r[6]) ? r[6][0] : "";
      (x.grp || x.empId) && dir++;
      "done" === x.status && ("early" === pc || "on_time" === pc) && ok++;
      "overdue" === x.status && late++;
      "expired" === x.status && exp++;
      if ("review" === x.status) {
        rv++;
        const sb = r[21] && "number" === typeof r[21].sub ? r[21].sub : 0;
        sb && (!rvAt || sb < rvAt) && (rvAt = sb);
      }
      if (x.apOn) {
        na++;
        sa += x.apAct;
        x.apPlan > 0 && (np++, (sp += x.apPlan), (sap += x.apAct));
      }
    });
    const n = L.length,
      avg = na ? Math.round(sa / na) : 0,
      pAvg = np ? Math.round(sp / np) : 0,
      aP = np ? Math.round(sap / np) : 0,
      dif = pAvg - aP,
      T = (m) => this.tkDurTxt(Math.max(1, m)),
      PC = (k) => (n ? KIVO.bsPct((100 * k) / n) : "0") + "٪",
      U = (k) => (k >= 3 && k <= 10 ? "مهام" : "مهمة"),
      KF = X.KF || null,
      day = !!X.eff,
      SC = day ? " لليوم" : " للشهر",
      go = (f) => () => this.setState({ tkKf: { k: X.SK, d: X.eff || 0, f: f && KF !== f ? f : null }, page: 1 }),
      NM = { ok: "مكتملة في الوقت", late: "متأخرة عن المهلة", wait: "بانتظار الاعتماد", time: "المنجزة بزمنٍ فعلي" },
      AR = (t, k, tail, f) => t + ": " + KIVO.BassamCount(k, "مهمة") + (tail ? "، " + tail : "") + (KF === f ? ". التصفية مفعّلة — اضغط لإلغائها" : ". اضغط لتصفية الجدول"),
      H = this._tkTicks(n, dir, "0.7 0.3"),
      K2 = this._tkTicks(n, ok),
      K3 = this._tkTicks(n, late),
      K4 = this._tkTicks(n, rv);
    /* حلقةُ الزمن: المقامُ المخططُ أو الفعليُّ أيُّهما أكبر (بحدّ 96 علامة) */
    let t5 = { T: "45", lit: "0 45" },
      x5 = "0 45",
      x5s = "",
      c5 = na ? (np ? "من " + pAvg + " د" : "بلا مخطط") : "—";
    if (na && !np) {
      const q = this._tkTicks(avg, avg);
      t5 = q;
      x5 = "0 " + q.T;
    } else if (np) {
      const M = Math.max(pAvg, aP, 1),
        TT = Math.min(M, 96),
        sc = (v) => Math.round((v * TT) / M),
        lo = sc(Math.min(aP, pAvg)),
        hi = sc(Math.max(aP, pAvg)),
        P = "0.62 0.38",
        rep = (k) => (k > 0 ? Array(k).fill(P).join(" ") : "");
      t5 = { T: String(TT), lit: lo >= TT ? P : lo > 0 ? rep(lo) + " 0 " + TT : "0 " + TT };
      x5 = hi > lo ? "0 " + lo + " " + rep(hi - lo) + " 0 " + TT : "0 " + TT;
      x5s = aP > pAvg ? "stroke:var(--arc-warning);opacity:1" : "";
    }
    return {
      tkKCapT: day ? "مؤشرات اليوم" : "مؤشرات الشهر",
      tkKCapS: day ? "محسوبة من مهام هذا اليوم فقط" : "محسوبة من مهام الشهر كله",
      tkK1L: lbl,
      tkK1Cap: day ? "إجمالي اليوم" : "إجمالي الشهر",
      tkK1N: String(n),
      tkK1Dir: String(dir),
      tkK1Gen: String(n - dir),
      tkK1T: H.T,
      tkK1Lit: H.lit,
      tkK1Chip: n ? PC(dir) + " موجّهة" : "لا مهام",
      tkK1Aria: lbl + ": " + KIVO.BassamCount(n, "مهمة") + "، منها " + dir + " موجّهة و" + (n - dir) + " عامة" + (cx ? "، و" + cx + " ملغاة خارج الحساب" : "") + (KF ? ". اضغط لعرضها كلها" : ""),
      tkK1Go: go(null),
      tkK1Sub: dir + " موجّهة · " + (n - dir) + " عامة" + (cx ? " · " + cx + " ملغاة خارج الحساب" : ""),
      tkK1Cx: String(cx),
      tkK2N: String(ok),
      tkK2U: U(ok),
      tkK2T: K2.T,
      tkK2Lit: K2.lit,
      tkK2Chip: PC(ok),
      tkK2On: "ok" === KF,
      tkK2Go: go("ok"),
      tkK2Aria: AR("مكتملة في الوقت", ok, PC(ok) + (day ? " من مهام اليوم" : " من مهام الشهر"), "ok"),
      tkK2Sub: "من أصل " + KIVO.BassamCount(n, "مهمة") + SC,
      tkK2CtxStyle: "",
      tkK2Bar: "width:" + (n ? Math.round((100 * ok) / n) : 0) + "%",
      tkK3N: String(late),
      tkK3U: U(late),
      tkK3T: K3.T,
      tkK3Lit: K3.lit,
      tkK3Chip: PC(late),
      tkK3On: "late" === KF,
      tkK3Go: go("late"),
      tkK3Aria: AR("متأخرة عن المهلة", late, PC(late) + (day ? " من مهام اليوم" : " من مهام الشهر"), "late"),
      tkK3Sub: late ? "يُنبَّه المكلَّف ومسؤولُه تلقائياً" + (exp ? " · " + exp + " انقضت بلا قبول" : "") : exp ? exp + " انقضت مهلتها بلا قبول" : "لا مهام متأخرة",
      tkK3CtxStyle: "",
      tkK4N: String(rv),
      tkK4U: U(rv),
      tkK4T: K4.T,
      tkK4Lit: K4.lit,
      tkK4Chip: PC(rv),
      tkK4On: "wait" === KF,
      tkK4Go: go("wait"),
      tkK4Aria: AR("بانتظار الاعتماد", rv, rv && rvAt ? "أقدمها منذ " + T(Math.round((Date.now() - rvAt) / 6e4)) : "", "wait"),
      tkK4Sub: rv ? (rvAt ? "أقدمها منذ " + T(Math.round((Date.now() - rvAt) / 6e4)) : "سلّمها أصحابُها للمراجعة") : "لا شيء بانتظار الاعتماد",
      tkK4CtxStyle: "",
      tkK5N: na ? (avg < 60 ? String(avg) : T(avg)) : "—",
      tkK5U: na && avg < 60 ? "د" : "",
      tkK5T: t5.T,
      tkK5Lit: t5.lit,
      tkK5Xtra: x5,
      tkK5XtraStyle: x5s,
      tkK5Chip: c5,
      tkK5On: "time" === KF,
      tkK5Go: go("time"),
      tkK5Aria:
        "متوسط زمن الإنجاز: " + (na ? T(avg) : "لا مهام منجزة بعد") + (np ? (dif > 0 ? "، أسرع من المخطط (" + T(pAvg) + ") بـ " + T(dif) : dif < 0 ? "، أبطأ من المخطط (" + T(pAvg) + ") بـ " + T(-dif) : "، كما المخطط") : "") + (KF === "time" ? ". التصفية مفعّلة — اضغط لإلغائها" : na ? ". اضغط لعرض المنجزة" : ""),
      tkK5Sub: np ? (dif > 0 ? "أسرع من المخطط بـ " + T(dif) : dif < 0 ? "أبطأ من المخطط بـ " + T(-dif) : "كما المخطط") : na ? "بلا مدةٍ مخططة" : "لا مهام منجزة بعد",
      tkK5CtxStyle: np && dif > 0 ? "color:var(--success-text)" : np && dif < 0 ? "color:var(--warning-text)" : "",
      tkK5SubStyle: np && dif > 0 ? "color:var(--success-text);font-weight:600" : np && dif < 0 ? "color:var(--warning-text);font-weight:600" : "",
      /* شريحةُ التصفية في شريط الأدوات */
      tkKfOn: !!KF,
      tkKfTxt: KF ? NM[KF] || "" : "",
      tkKfAria: KF ? "إلغاء تصفية: " + (NM[KF] || "") : "",
      tkKfCnt: KF ? (X.shown || 0) + " من " + KIVO.BassamCount(n, "مهمة") : "",
      tkKfClear: () => this.setState({ tkKf: null, page: 1 }),
    };
  }
  /* رأسُ اليوم على أول صفٍّ منه في الصفحة (كرأس المجموعة في الجدول الشهري): اسمُ اليوم وتاريخُه · «اليوم/أمس» · عددُ مهامه في الشهر المعروض بعد
     الفلاتر (لا في الصفحة وحدها) · المنجزةُ والمتأخرةُ منها · الطيُّ والفرد. ويومٌ يمتدّ صفحتين يتكرّر رأسُه بعدده كاملاً */
  _tkDayHeads(PG, flat, closed) {
    const N = {},
      D = {},
      LT = {};
    flat.forEach((x) => {
      const k = x.secK;
      N[k] = (N[k] || 0) + 1;
      "done" === x.status && (D[k] = (D[k] || 0) + 1);
      ("overdue" === x.status || "expired" === x.status) && (LT[k] = (LT[k] || 0) + 1);
    });
    const T = this.hToday(),
      Y = this.hParts(new Date(Date.now() - 864e5)),
      tk = T.y + "-" + T.m + "-" + T.d,
      yk = Y.y + "-" + Y.m + "-" + Y.d,
      WD = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    /* الحقولُ على كائن الصفّ نفسِه لا على نسخةٍ منه: الصفُّ نفسُه في اللوحة (U.flat) — ونسخةٌ ثانية تُحسب صفّاً ثانياً بالهوية نفسِها.
       الكائناتُ تُبنى من جديد مع كل رسم فلا يبقى أثرٌ لرسمٍ سابق */
    return PG.map((x, j) => {
      const k = x.secK;
      closed[k] && Object.assign(x, { trStyle: (x.trStyle || "") + ";display:none", dayHidden: !0 });
      if (j > 0 && PG[j - 1].secK === k) return x;
      const shut = !!closed[k],
        a = String(k).split("-").map(Number),
        today = k === tk,
        title = WD[this._tkWdOf(k)] + " " + a[2] + " " + (this.MONTHS[a[1] - 1] || "") + " " + a[0] + " هـ";
      return Object.assign(x, {
        dayHeadOn: !0,
        dayTitle: title,
        dayTag: today ? "اليوم" : k === yk ? "أمس" : "",
        dayN: KIVO.BassamCount(String(N[k] || 0), "مهمة"),
        daySub: [D[k] ? D[k] + " منجزة" : "", LT[k] ? LT[k] + " متأخرة" : ""].filter(Boolean).join(" · "),
        dayOpenA: shut ? "false" : "true",
        dayTip: (shut ? "فرد " : "طيّ ") + title,
        dayChev: "transition:transform .15s" + (shut ? ";transform:rotate(90deg)" : ""),
        dayDot: today ? "background:var(--brand-fg)" : "background:var(--text-faint)",
        dayToggle: () => this.setState((q) => ({ tkDayClosed: Object.assign({}, q.tkDayClosed, { [k]: !(q.tkDayClosed || {})[k] }) })),
      });
    });
  }
  _tkCbStyle(on, dis) {
    return (
      "width:16px;height:16px;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;cursor:" +
      (dis ? "not-allowed;opacity:.35" : "pointer") +
      ";border:1.5px solid " +
      (on ? "var(--border-brand);background:var(--border-brand);color:var(--text-on-brand)" : "var(--border-default);background:var(--bg-surface);color:transparent")
    );
  }
  /* أزرارُ الاختيار المتجاورة في النموذج (الإسناد · نوع المهمة) — النمطُ نفسُه، والمعطَّلُ باهتٌ بلا مؤشّر نقر */
  _tkSeg(on, dis) {
    return (
      "flex:1;min-height:42px;padding:6px 12px;border-radius:12px;font-size:12px;line-height:1.5;text-align:center;cursor:" + (dis ? "not-allowed" : "pointer") + ";transition:all .15s;font-family:'Cairo',sans-serif;display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid " +
      (on
        ? "var(--brand-fg);background:var(--brand-tint);color:var(--brand-text);font-weight:700;box-shadow:0 0 0 3px var(--brand-ring)"
        : "var(--border-default);background:var(--bg-surface);color:var(--text-secondary);font-weight:400") +
      (dis ? ";opacity:.55" : "")
    );
  }
  renderVals() {
    const t = this._tkPermVals(),
      e = this.state,
      n = this.empIndex(),
      a = (t) => {
        const e = this.derivedStatus(t),
          /* KIVO_259 (كشفته رحلاتُ k259journeys): أولويةٌ أو حالةٌ خارج القائمة (بياناتٌ مستوردة أو قديمة — كبذرة الاختبار «med») كانت تُسقط
             صفحةَ المهام كلَّها للإدارة («Cannot read properties of undefined») — تُعرض الآن «عادي»/«معلّقة» ويبقى الحقلُ كما هو */
          a = this.PRIO[t[2]] || this.PRIO.normal,
          r = this.ST[e] || this.ST[t[3]] || this.ST.pending;
        return {
          title: t[0],
          desc: t[1],
          hasDesc: !!t[1],
          prio: t[2],
          status: e,
          prioLabel: a[0],
          prioColor: a[1],
          prioBg: a[2],
          prioBorder: a[3],
          prioP1: a[4],
          prioP2: a[5],
          stLabel: r[0],
          stColor: r[1],
          stBg: r[2],
          stBorder: r[3],
          showPerf: !!t[6],
          perfStyle: t[6] ? this.PERF[t[6][0]] : "",
          perfLabel: t[6] ? t[6][1] : "",
          ...this.actPlan(t),   /* KIVO_265 · البند 7 */
          doneStyle: "done" === t[3] ? "opacity:.85" : "",
          avNames: this.empNameOf(t, n),
          creator: t[9],
          grp: t[17] || "",
          grpLabel: t[18] || "",
          empId: t[14] || "",
          trStyle: "border-bottom:1px solid var(--bd-xf1f5f9);transition:background .15s",
          grpTag: t[17] ? "موجّهة · " + (t[18] || "مجموعة") : t[14] ? "موجّهة" : t[19] ? "عامة · " + t[19] : "",
          wt: t[19] || "",
          ...(() => {
            const n = t[21] && Array.isArray(t[21].imgs) ? t[21].imgs : [],
              a = n.length ? this._tkImg(n[0]) : "",
              r = t[21] && t[21].note ? String(t[21].note).trim() : "",
              i = t[20] && t[20].why ? String(t[20].why) : "",
              o = t[20] && t[20].at ? t[20].at : 0;
            return {
              proofOn: n.length > 0 || !!r,
              proofImg: a,
              proofHas: !!a,
              proofN: n.length ? String(n.length) : "",
              proofNote: r,
              proofNoteOn: !!r,
              proofNone: !(n.length > 0 || !!r),
              proofNoImg: !a,
              proofCnt: (t[21] && t[21].draft && !t[21].sub ? "مسودّة · " : "") + (n.length
                ? 1 === n.length
                  ? "صورة واحدة"
                  : 2 === n.length
                    ? "صورتان"
                    : KIVO.BassamCount(n.length, "صورة") + ""
                : "ملاحظة فقط"),
              proofTip: (t[21] && t[21].draft && !t[21].sub ? "مسودّة توثيق — لم يُسلَّم بعد · " : "") + (n.length ? KIVO.BassamCount(n.length, "صورة") : "بلا صورة") + (r ? " · " + r : ""),
              proofOpen: () => {
                (n.length || r) &&
                  this.setState({
                    tkProof: { imgs: n, note: r, title: t[0] || "مهمة", by: t[8] || "", at: (t[21] && t[21].at) || t[12] || 0, draft: !!(t[21] && t[21].draft && !t[21].sub), meta: t[21] && Array.isArray(t[21].meta) ? t[21].meta : [] },   /* KIVO_265 · البند 18: ختمُ الإثبات */
                  });
              },
              decOn: !!i,
              decTxt: "اعتذر" + (o ? " " + this.tkClock(o) : "") + " — «" + i + "»",
              expOn: "expired" === this.derivedStatus(t),
              expTxt: t[16] ? "انقضت مهلة القبول " + this.tkClock(t[16]) + " بلا ردّ" : "لم تُقبل حتى انقضت المهلة",
            };
          })(),
        };
      },
      r = e.tasksAll || this.loadAllTasks();
    e.tasksAll || setTimeout(() => this.setState({ tasksAll: r }), 0);
    const s = this.hToday(),
      o = this.monthLockedT(e.year, e.month),
      i = this.mDays(e.year, e.month - 1);
    /* KIVO_265 · كروتُ الأيام (طلبُ المالك 2026-10-20 «زي الاسترشاد والمضبوطات والتقرير اليومي — تحت كل يوم مهامه بنفس الجدول»):
       اليومُ المختار لهذا الشهر (tkDaySel) — الافتراضي اليومُ الجاري في الشهر الجاري و«الشهر كاملاً» (0) في غيره. والبحثُ يبحث في الشهر كله.
       الشهرُ كاملاً مقسَّمٌ بأيامه (DG) والأحدثُ أولاً */
    const VW = this.tkViewer(),
      SK = e.year + "-" + e.month,
      SDS = this._tkDaySelOf(e),
      SD0 = SDS && SDS.k === SK ? +SDS.d || 0 : this._tkDayDef(e, s),
      SD = String(e.search || "").trim() ? 0 : SD0,
      DG = !SD,
      SHM = this._tkShiftMap(e.year, e.month),
      SHI = this._tkEmpIx(),
      SHO = {};
    this.tkShiftOpts().forEach((x) => x && x.name && (SHO[x.name] = x));
    let l = [];
    /* KIVO_265 · قفلُ اليوم (طلبُ المالك 2026-10-20 «فتح وإغلاق اليوم» كالتقرير اليومي): قفلُ كل يومٍ لصفوفه — اليومُ المنقضي مقفلٌ تلقائياً ما لم يُفتح
       بأثر رجعي، ويُغلق اليومُ بيده · وما يقرّره سيرُ العمل (مراجعةٌ · تمديد · إعادةُ إسناد) يبقى على قفل الشهر وحده فتُعتمد تسليماتُ الأمس */
    for (let t = 1; t <= i; t++) {
      const o = this.tkLockedAt(e.year, e.month, t),
        oT = this._tkLockTxt(e.year, e.month, t);
      (r[e.year + "-" + e.month + "-" + t] || []).forEach(
        (r, s, A) =>
          this.tkVisible(r, VW) &&
          l.push({
            ...a(r),
            tkcKey: e.year + "-" + e.month + "-" + t + "#" + s,
            tkcT: r,
            /* KIVO_265 · البند 11: خانةُ الاختيار للإجراء الجماعي (الصفُّ المفرد وحده — رأسُ المجموعة بلا خانة) */
            ...(() => {
              const sk = this._tkSelKey(e.year + "-" + e.month + "-" + t, r),
                on = !!(e.tkSel || {})[sk],
                can = this._tkSrv() && !!this._tkM() && this.PC("edit") && !this.monthLockedT(e.year, e.month);   /* الإجراءُ الجماعي سيرُ عمل (اعتماد · تمديد · إعادةُ إسناد · إلغاء) ⇒ قفلُ الشهر وحده — لا قفلُ اليوم */
              return { selKey: sk, selCan: can, selOn: on, selStyle: this._tkCbStyle(on, !can), selToggle: (ev) => (ev && ev.stopPropagation && ev.stopPropagation(), can && this._tkSelToggle(sk)) };
            })(),
            dayNum: t,
            dayChip: t + " " + this.MONTHS[e.month - 1],
            /* KIVO_265 · طلبُ المالك 2026-10-20 («عكس بحسب آخر وقت إدخال»): وقتُ الإدخال (13) مفتاحُ الترتيب داخل اليوم — والصفُّ القديم بلا 13 آخرَ يومه ·
               ويومُ المهمة (مفتاحُ المخزن) يومُ كرتها وقسمِها. ووقتُ الإدخال يُقرأ مرةً لكل صفٍّ بدل ثلاث */
            ...(() => {
              const F = r[13] ? this.fmtStampParts(r[13]) : null;
              return {
                entAt: +r[13] || 0,
                secK: e.year + "-" + e.month + "-" + t,
                createdWeekday: F ? F.wd : t + " " + this.MONTHS[e.month - 1],
                createdDate: F ? F.date.replace(" هـ", "") : "",
                createdTime: F ? F.time : "",
              };
            })(),
            ...this._tkShiftCell(r, SHM, SHI, SHO),   /* KIVO_265 · عمودُ «الوردية» */
            hasEmp: !!String(this.empNameOf(r, n)).trim(),
            noEmp: !String(this.empNameOf(r, n)).trim(),
            hasAccepted: !!r[11],
            acceptedWd: r[11] ? this.fmtStampParts(r[11]).wd : "",
            acceptedDateShort: r[11] ? this.fmtStampParts(r[11]).date.replace(" هـ", "") : "",
            acceptedTime: r[11] ? this.fmtStampParts(r[11]).time : "",
            ...this.timeVals(r, o),
            ...this._tkP2Row(r, e.year + "-" + e.month + "-" + t),
            ...this._rowMenu("t" + t + "-" + this._tkMk(r, s, A), [
              this.PC("edit")
                ? {
                    name: "تعديل المهمة",
                    color: "#b99751",
                    p1: "M12 20h9",
                    p2: "M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z",
                    run: () => {
                      o
                        ? this.bsToast(oT)
                        : this._tkOpen(
                            Object.assign(
                              {
                                newTaskOpen: !0,
                                editRef: { d: t, i: s, k: this._tkKey(r, t), grp: r[17] || null, grpLabel: r[18] || "" },
                                newTitle: r[0],
                                newDesc: r[1] || "",
                                newPrio: r[2],
                                newEmp: r[8] || "",
                                newAsg: r[14] ? "direct" : "general",
                                newPick: r[14] ? { [r[14]]: r[8] || "" } : {},
                                pickQ: "",
                                pickOpen: {},
                                pickLim: 60,
                                pickWt: r[19] || "",
                                newDur: r[10] ? String(r[10]) : "",
                                newDay: t,
                                newCreatedAt: r[13] || 0,
                              },
                              this._tkPickers(r[15], r[16], t),
                              this._tkAdvFrom(r),
                            ),
                          );
                    },
                  }
                : null,
              "done" === r[3] && !o && this.PC("edit")
                ? {
                    name: r[14] ? "إعادة المهمة للموظف" : "إعادة فتح المهمة",
                    color: "#b45309",
                    p1: "M12 3a9 9 0 1 1-9 9",
                    p2: "M3 3v6h6M12 8v4l3 1",
                    run: () => this._doReopen(t, s, this._tkKey(r, t)),
                  }
                : null,
              (r[21] && Array.isArray(r[21].imgs) && r[21].imgs.length) || (r[21] && r[21].note)
                ? {
                    name: "عرض توثيق المهمة",
                    color: "#0e7490",
                    p1: "M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.5L10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z",
                    p2: "M9 13l2 2 4-4",
                    run: () =>
                      this.setState({
                        tkProof: {
                          imgs: r[21].imgs || [],
                          note: r[21].note || "",
                          title: r[0] || "مهمة",
                          by: r[8] || "",
                          at: r[21].at || r[12] || 0,
                          draft: !!(r[21].draft && !r[21].sub),
                          meta: Array.isArray(r[21].meta) ? r[21].meta : [],   /* KIVO_265 · البند 18 */
                        },
                      }),
                  }
                : null,
              ...this._tkP2Menu(r, e.year + "-" + e.month + "-" + t, this.monthLockedT(e.year, e.month)),   /* المراجعةُ والتمديدُ وإعادةُ الإسناد على قفل الشهر وحده */
              this.PC("del")
                ? {
                    name: "حذف المهمة",
                    color: "#dc2626",
                    danger: !0,
                    p1: "M3 6h18",
                    p2: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
                    run: () => {
                      o ? this.bsToast(oT) : this._tkOpen({ confirmDel: { d: t, i: s, k: this._tkKey(r, t), title: r[0] } });
                    },
                  }
                : null,
            ]),
            del: () => {
              this.PC("del")
                ? o
                  ? this.bsToast(oT)
                  : this._tkOpen({ confirmDel: { d: t, i: s, k: this._tkKey(r, t), title: r[0] } })
                : this.bsToast("صلاحيتك على صفحة المهام لا تشمل الحذف — راجع مدير الإدارة");
            },
            edit: () => {
              this.PC("edit")
                ? o
                  ? this.bsToast(oT)
                  : this._tkOpen(
                      Object.assign(
                        {
                          newTaskOpen: !0,
                          editRef: { d: t, i: s, k: this._tkKey(r, t), grp: r[17] || null, grpLabel: r[18] || "" },
                          newTitle: r[0],
                          newDesc: r[1] || "",
                          newPrio: r[2],
                          newEmp: r[8] || "",
                          newAsg: r[14] ? "direct" : "general",
                          newPick: r[14] ? { [r[14]]: r[8] || "" } : {},
                          pickQ: "",
                          pickOpen: {},
                          pickLim: 60,
                          pickWt: r[19] || "",
                          newDur: r[10] ? String(r[10]) : "",
                          newDay: t,
                          newCreatedAt: r[13] || 0,
                        },
                        this._tkPickers(r[15], r[16], t),
                        this._tkAdvFrom(r),
                      ),
                    )
                : this.bsToast("صلاحيتك على صفحة المهام لا تشمل التعديل — راجع مدير الإدارة");
            },
            accept: () => {
              this.PC("edit")
                ? o
                  ? this.bsToast(oT)
                  : r[14]
                    ? this._tkOpen({ acceptRef: { d: t, i: s, k: this._tkKey(r, t), title: r[0] } }, () => this._doAccept(r[8] || "", r[14]))
                    : this._tkOpen({ acceptRef: { d: t, i: s, k: this._tkKey(r, t), title: r[0], wt: r[19] || "" } })
                : this.bsToast("صلاحيتك لا تشمل تغيير حالة المهمة");
            },
            finish: () => {
              this.PC("edit")
                ? o
                  ? this.bsToast(oT)
                  : this._tkOpen({ confirmFinish: { d: t, i: s, k: this._tkKey(r, t), title: r[0] } })
                : this.bsToast("صلاحيتك لا تشمل تغيير حالة المهمة");
            },
            reopen: () => {
              this.PC("edit")
                ? o
                  ? this.bsToast(oT)
                  : this._doReopen(t, s, this._tkKey(r, t))
                : this.bsToast("صلاحيتك لا تشمل تغيير حالة المهمة");
            },
          }),
      );
    }
    /* KIVO_265 · طلبُ المالك 2026-10-20: الأحدثُ إدخالاً أولاً في اليوم (كان: غيرُ المنجز ثم الأولوية ثم يومُ المهمة) — وفي «الشهر كاملاً» الأيامُ
       من الأحدث (الأحدثُ إدخالاً أولاً في كلٍّ منها) · أفرادُ المجموعة متجاورون (هوياتُهم متتالية) · والفرزُ ثابت: التوأمان بالهوية نفسِها بترتيب المخزن */
    l.sort((t, e) => e.dayNum - t.dayNum || e.entAt - t.entAt);
    const c = l;
    (String(e.search || "").trim() &&
      (l = KIVO.BassamFind.filter(e.search, l, (t) => [t.title, t.desc, t.creator, t.assignee, t.status])),
      "early_only" === e.fStatus
        ? (l = l.filter((t) => t.showPerf && -1 !== t.perfLabel.indexOf("مبكر")))
        : "all" !== e.fStatus && (l = l.filter((t) => t.status === e.fStatus)),
      "all" !== e.fPrio && (l = l.filter((t) => t.prio === e.fPrio)));
    /* KIVO_265 · البند 14: الفلاتر الإضافية تتراكب على البحث والحالة والأولوية — وما يليها (الصفحات · التصدير · الطباعة) يرى المرئيَّ وحده */
    const FX = this._tkFltCtx();
    FX.on && (l = l.filter((t) => this._tkFltRow(t.tkcT, FX)));
    SD && (l = l.filter((t) => t.dayNum === SD));
    /* KIVO_265 · مؤشراتُ اليوم: المؤشرُ المضغوط يصفّي جدولَ اليوم نفسِه (لا يبقى بعد تغيير اليوم) */
    const KF = this._tkKfOf(e, SK, SD);
    KF && (l = l.filter((t) => this._tkKfRow(t, KF)));
    const d = e.year === s.y && e.month === s.m,
      m = 100 * e.year + e.month,
      p = 100 * s.y + s.m,
      U = this.tkGroupRows(l),
      u = U.rows;
    ((this._tkLiveRows = U.flat
      .filter((t) => t.tkcOn)
      .map((t) => ({
        key: t.tkcKey,
        t: t.tkcT,
        ph: t.tkcPh,
        sec: t.tkcSec,
        nx: t.tkcNx,
        el: t.elapsedTxt,
        rem: t.remainTxt,
        win: t.winTxt,
      }))),
      (this._tkPhaseSig = this._tkLiveRows.reduce((t, e) => t + e.ph + "|", "")),
      (this._tkClockEls = null));
    /* KIVO_264 · المرحلة الثانية: حالاتُ سير العمل في أعمدة اللوحة القائمة — المراجعةُ والإعادةُ والتعثّرُ «جارية» · الإلغاءُ وإعادةُ الإسناد مع «اعتذار» (لا صفَّ يسقط) */
    const KB = { review: "in_progress", returned: "in_progress", stalled: "in_progress", cancelled: "declined", reassigned: "declined" },
      /* الموجة 2 · DG-03: كلُّ عمودٍ يحمل عنوانَ حالته وعدَّه · kHide: العمودُ الفارغ يُطوى على الجوال ما دام في غيره مهامّ */
      f = ((cols) => {
        const any = cols.some((c) => c.tasks.length);
        return cols.map((c) => Object.assign(c, { empty: 0 === c.tasks.length, kHide: any && 0 === c.tasks.length ? "1" : "0" }));
      })(["pending", "in_progress", "done", "overdue", "expired", "declined"].map((t) => {
        const e = U.flat.filter((e) => (KB[e.status] || e.status) === t),
          m = this.ST[t];
        return { key: t, label: m[0], dot: "background:" + m[1], count: String(e.length), tasks: e };
      })),
      g = (new Date(), this.MONTHS[e.month - 1] + " " + e.year + " هـ"),
      b = this.MONTHS.map((t, n) => {
        const a = n + 1,
          o = e.month === a,
          i = e.year === s.y && a === s.m,
          l = ((t, e) => {
            let n = 0;
            for (const a in r) {
              const s = a.split("-");
              +s[0] === t && +s[1] === e && (n += (r[a] || []).filter((t) => this.tkVisible(t, VW)).length);
            }
            return n;
          })(e.year, a),
          h = new Date(this.mStart(e.year, n).getTime() + 12096e5);
        let c =
          "position:relative;flex:1 1 auto;min-width:100px;border-radius:12px;padding:8px;text-align:center;transition:all .2s;box-shadow:var(--shadow-card);cursor:pointer;box-sizing:border-box;font-family:'Cairo',sans-serif;border:1px ";
        const d = this.monthApprovedT(e.year, a),
          m = this.monthAutoLockedT(e.year, a);
        let p = "#53565a",
          u = "#cbd5e1",
          f = "—",
          g = !1,
          b = !1;
        return (
          l && ((f = KIVO.BassamCount(l, "مهمة") + ""), (u = "#b99751"), (g = !0)),
          d || m
            ? (d
                ? ((c +=
                    (o ? "solid #008450;box-shadow:0 0 0 2px rgba(0,132,80,0.25);" : "solid rgba(0,132,80,0.35);") +
                    "background:var(--bg-a0132800p07)"),
                  (p = "#047857"),
                  (u = "#047857"),
                  (f = "معتمد"))
                : ((c +=
                    (o ? "solid #64748b;box-shadow:0 0 0 2px rgba(100,116,139,0.25);" : "solid rgba(100,116,139,0.35);") +
                    "background:var(--bg-a1001161390p08)"),
                  (p = "#475569"),
                  (u = "#475569"),
                  (f = "انقضى — مقفل")),
              (g = !1),
              {
                name: t,
                greg: h.toLocaleDateString("ar-u-ca-gregory-nu-latn", { month: "long", year: "numeric" }),
                nameColor: p,
                cntLabel: f,
                cntColor: u,
                cntIcon: g,
                isCurrent: i,
                isLockedFoot: !0,
                isOpenFoot: !1,
                hasData: !1,
                menuOpen: e.mMenu === a,
                menuToggle: (t) => {
                  (t.stopPropagation(), this.setState((t) => ({ mMenu: t.mMenu === a ? null : a })));
                },
                delAll: (t) => {
                  (t.stopPropagation(), this.PC("del") && this._tkOpen({ mMenu: null, delMonth: { n: a } }));
                },
                tip: this.PC("approve")
                  ? d
                    ? "نقرة مزدوجة لفتح الشهر وإلغاء اعتماده"
                    : "الشهر انقضى — مقفل · نقرة مزدوجة لفتحه للاستدراك"
                  : (d ? "الشهر معتمد ومقفل" : "الشهر انقضى — مقفل") + " · فتحه يحتاج صلاحية الاعتماد",
                click: () => this.setState({ month: a, page: 1 }),
                dbl: () => {
                  this.PC("approve") ||
                    this.bsToast("فتحُ الشهر المقفل يحتاج صلاحية الاعتماد على صفحة المهام — راجع مدير الإدارة");
                  this.PC("approve") &&
                    (this.monthPastT(e.year, a)
                      ? this.setState({ month: a, page: 1 }, () => {
                          if (!this.monthOpenFlagT(e.year, a))
                            return d
                              ? void this._tkOpen({ lockConfirm: { n: a, locked: !0 } })
                              : void this._tkOpen({ retroAsk: { m: a, open: !0 } });
                          !d && l ? this._tkOpen({ lockConfirm: { n: a, locked: !1 } }) : this._tkOpen({ retroAsk: { m: a, open: !1 } });
                        })
                      : this._tkOpen({ month: a, page: 1, lockConfirm: { n: a, locked: !0 } }));
                },
                style: c,
              })
            : (l
                ? ((c +=
                    (o ? "solid #b99751;box-shadow:0 0 0 2px rgba(185,151,81,0.3);" : "solid rgba(245,158,11,0.35);") +
                    "background:var(--bg-a245158110p08)"),
                  (p = o ? "#b99751" : "#b45309"),
                  (u = "#b45309"),
                  (f = "مسودة"),
                  (g = !1),
                  (b = !0))
                : o
                  ? ((c += "solid #b99751;box-shadow:0 0 0 2px rgba(185,151,81,0.3);background:var(--bg-a185151810p06)"),
                    (p = "#b99751"),
                    (f = "—"),
                    (u = "#cbd5e1"))
                  : ((c += "dashed #E1E1E1;background:var(--bg-a2452452450p7);opacity:.9"), (f = "—"), (u = "#cbd5e1")),
              {
                name: t,
                greg: h.toLocaleDateString("ar-u-ca-gregory-nu-latn", { month: "long", year: "numeric" }),
                nameColor: p,
                cntLabel: f,
                cntColor: u,
                cntIcon: g,
                isCurrent: i,
                isLockedFoot: !1,
                isOpenFoot: b,
                hasData: l > 0,
                menuOpen: e.mMenu === a,
                menuToggle: (t) => {
                  (t.stopPropagation(), this.setState((t) => ({ mMenu: t.mMenu === a ? null : a })));
                },
                delAll: (t) => {
                  (t.stopPropagation(), this.PC("del") && this._tkOpen({ mMenu: null, delMonth: { n: a } }));
                },
                tip: l ? (this.PC("approve") ? "نقرة مزدوجة لاعتماد وإغلاق الشهر" : KIVO.BassamCount(l, "مهمة") + " · اعتمادُ الشهر يحتاج صلاحية الاعتماد") : "لا مهام لهذا الشهر — الاعتماد يتطلب بيانات",
                click: () => this.setState({ month: a, page: 1 }),
                dbl: () => {
                  this.PC("approve") || !(l || this.monthPastT(e.year, a)) ||
                    this.bsToast("اعتمادُ الشهر وفتحُه وإغلاقُه يحتاج صلاحية الاعتماد على صفحة المهام — راجع مدير الإدارة");
                  this.PC("approve") &&
                    (this.monthPastT(e.year, a)
                      ? this.setState({ month: a, page: 1 }, () => {
                          this.monthOpenFlagT(e.year, a)
                            ? l
                              ? this._tkOpen({ lockConfirm: { n: a, locked: !1 } })
                              : this._tkOpen({ retroAsk: { m: a, open: !1 } })
                            : this._tkOpen({ retroAsk: { m: a, open: !0 } });
                        })
                      : l && this._tkOpen({ month: a, page: 1, lockConfirm: { n: a, locked: !1 } }));
                },
                style: c,
              })
        );
      }),
      SDn = SD ? c.filter((t) => t.dayNum === SD).length : 0,
      y = 0 === u.length && (SD ? SDn > 0 : c.length > 0),
      k = 0 === u.length,
      E0 = !!SD && 0 === SDn,
      w = m > p;
    return {
      dayLabel: g,
      isToday: d,
      yearLabel: e.year + " هـ",
      gregRange: this.mStart(e.year, 0).getFullYear() + " – " + this.mStart(e.year, 11).getFullYear() + " م",
      badgeLabel:
        "مهام " + this.MONTHS[e.month - 1] + " " + e.year + " هـ — " + (o ? "معتمد ومقفل" : c.length ? "مسودة مفتوحة" : "لا توجد مهام"),
      badgeStyle:
        "display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;border-radius:9999px;padding:4px 12px;font-family:'Cairo',sans-serif;border:1px solid " +
        (o
          ? "rgba(0,132,80,0.35);color:var(--fg-x008450);background:var(--bg-a0132800p1)"
          : c.length
            ? "rgba(245,158,11,0.35);color:var(--fg-x92400e);background:var(--bg-a245158110p12)"
            : "rgba(148,163,184,0.35);color:var(--fg-x64748b);background:var(--bg-a1481631840p1)"),
      prevYear: () => this.setState((t) => ({ year: t.year - 1 })),
      nextYear: () => this.setState((t) => ({ year: t.year + 1 })),
      goToday: () => this.setState({ year: s.y, month: s.m, tkDaySel: null, tkDayK: "", tkDayD: 0, tkKf: null, page: 1 }),
      mcards: b,
      search: e.search,
      onSearch: (t) => this.setState({ search: t.target.value, page: 1 }),
      ...this.filterDD("tfs", "fStatus", "كل الحالات", [
        { v: "all", name: "كل الحالات" },
        { v: "pending", name: "انتظار" },
        { v: "in_progress", name: "جارية" },
        { v: "done", name: "منجزة" },
        { v: "overdue", name: "متأخرة" },
        { v: "expired", name: "لم تُقبل" },
        { v: "declined", name: "اعتذار" },
        { v: "review", name: "بانتظار المراجعة" },
        { v: "returned", name: "أُعيدت للاستكمال" },
        { v: "stalled", name: "متعثّرة" },
        { v: "cancelled", name: "ملغاة" },
        { v: "reassigned", name: "أُعيد إسنادها" },
        { v: "early_only", name: "مبكر" },
      ]),
      ...this.filterDD("tfp", "fPrio", "كل الأولويات", [
        { v: "all", name: "كل الأولويات" },
        { v: "urgent", name: "عاجل" },
        { v: "high", name: "مرتفع" },
        { v: "normal", name: "عادي" },
        { v: "low", name: "منخفض" },
      ]),
      ...this._tkFltVals(c),
      subKanban: () => this.setState({ sub: "kanban" }),
      subList: () => this.setState({ sub: "list" }),
      subKanbanStyle:
        "height:28px;width:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;border:0;cursor:pointer;transition:all .2s;" +
        ("kanban" === e.sub ? "background:var(--bg-xb99751);color:var(--text-on-brand)" : "background:transparent;color:var(--fg-x94a3b8)"),
      subListStyle:
        "height:28px;width:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;border:0;cursor:pointer;transition:all .2s;" +
        ("list" === e.sub ? "background:var(--bg-xb99751);color:var(--text-on-brand)" : "background:transparent;color:var(--fg-x94a3b8)"),
      kanbanCols: f,
      ...this._tkDayStrip(c, U.flat.length, e, s, SD0, SD),
      ...(() => {
        /* KIVO_265 · أقسامُ الأيام (طلبُ المالك «زي فكرة المجموعات في الجدول الشهري»): اليومُ المطويّ يبقى صفُّه الأولُ مرساةً مخفيّةً لرأسه
           ويخرج الباقي من الصفحات وحدها — لا من العدّ ولا من التصدير ولا من اللوحة */
        const DC = (DG && e.tkDayClosed) || {},
          uP = DG ? u.filter((x, j) => !DC[x.secK] || 0 === j || u[j - 1].secK !== x.secK) : u,
          t = uP.length,
          n = 0 === e.perPage ? 0 : e.perPage || 10,
          a = 0 === n ? Math.max(1, t) : n,
          r = Math.max(1, Math.ceil(t / a)),
          s = Math.min(Math.max(1, e.page || 1), r),
          o = (s - 1) * a,
          i = [];
        {
          const t = [],
            e = (e) => {
              t.includes(e) || t.push(e);
            };
          e(1);
          for (let t = s - 1; t <= s + 1; t++) t >= 1 && t <= r && e(t);
          (e(r), t.sort((t, e) => t - e));
          for (let e = 0; e < t.length; e++) {
            e > 0 && t[e] - t[e - 1] > 1 && i.push({ dots: !0, label: "…" });
            const n = t[e];
            i.push({
              dots: !1,
              label: String(n),
              cur: n === s,
              plain: n !== s,
              style:
                "height:28px;min-width:28px;padding:0 4px;border:0;border-right:1px solid var(--bd-xe1e1e1);font-size:11px;font-weight:400;cursor:pointer;font-family:'Cairo',sans-serif;font-feature-settings:'tnum';" +
                (n === s ? "background:var(--bg-xb99751);color:var(--text-on-brand)" : "background:transparent;color:var(--fg-x475569)"),
              click: () => this.setState({ page: n }),
            });
          }
        }
        const l = (t) =>
          "height:28px;width:28px;border:0;border-right:1px solid var(--bd-xe1e1e1);background:transparent;display:flex;align-items:center;justify-content:center;" +
          (t ? "color:var(--fg-x475569);cursor:pointer" : "color:var(--fg-xcbd5e1);cursor:default");
        const PG = uP.slice(o, o + a),
          VIS = DG ? this._tkDayHeads(PG, U.flat, DC) : PG;
        return {
          allFiltered: VIS,
          ...this._tkBulkVals(VIS.filter((x) => !x.dayHidden)),
          ...KIVO.BassamCount.pair("pgTotal", String(u.length), "مهمة", "g"),
          pgRange: 0 === t ? "0" : o + 1 + "–" + Math.min(o + a, t),
          pgNums: i,
          perPage: String(n),
          onPerPage: (t) => {
            const e = +t.target.value;
            this.setState({ perPage: 0 === e ? 0 : e || 10, page: 1 });
          },
          pgFirst: () => this.setState({ page: 1 }),
          pgPrev: () => this.setState((t) => ({ page: Math.max(1, (t.page || 1) - 1) })),
          pgNext: () => this.setState((t) => ({ page: Math.min(r, (t.page || 1) + 1) })),
          pgLast: () => this.setState({ page: r }),
          pgFirstStyle: l(s > 1),
          pgPrevStyle: l(s > 1),
          pgNextStyle: l(s < r),
          pgLastStyle: l(s < r),
        };
      })(),
      filesOpen: !!e.filesOpen,
      filesToggle: () => this.setState((t) => ({ filesOpen: !t.filesOpen })),
      filesChev: "opacity:.5;transition:transform .2s;" + (e.filesOpen ? "transform:rotate(180deg)" : ""),
      filesBtnStyle:
        "height:36px;display:flex;align-items:center;gap:6px;font-size:12px;border:0;border-radius:12px;padding:0 12px;cursor:pointer;font-family:'Cairo',sans-serif;" +
        (e.filesOpen ? "color:var(--fg-xb99751);background:var(--bg-a185151810p08)" : "color:var(--fg-x475569);background:transparent"),
      tkExpLbl: SD ? "مهام يوم " + SD + " " + this.MONTHS[e.month - 1] : "مهام " + g,
      exportCsv: () => {
        if (!this.PC("export")) return;
        const t = u.map((t) => [
            t.dayChip,
            t.title,
            t.desc || "",
            t.prioLabel,
            t.hasStart ? t.tkStartDay + " " + t.tkStartTxt : "",
            t.hasEnd ? t.tkEndDay + " " + t.tkEndTxt : "",
            t.dueTxt || "",
            t.apOn ? t.apTxt : "",   /* KIVO_265 · البند 7 */
            t.stLabel,
            String(t.avNames || ""),
            t.shName || (t.empId ? "بلا وردية" : ""),   /* KIVO_265 · الوردية */
            t.creator,
          ]),
          n = [
            [
              "اليوم",
              "المهمة",
              "الوصف",
              "الأولوية",
              "بداية المهمة",
              "نهاية المهمة",
              "مدة الإنجاز",
              "الفعلي/المخطط (د)",
              "الحالة",
              "الموظفون المكلفون",
              "الوردية",
              "بواسطة",
            ],
          ].concat(t);
        try {
          KIVO.BassamXLSX && KIVO.BassamXLSX.download(n, "tasks-" + (SD ? SD + "-" : "") + this.MONTHS[e.month - 1] + "-" + e.year + ".xlsx");
        } catch (t) {}
        this.setState({ filesOpen: !1 });
      },
      printTable: () => {
        this.PC("export") && (this.setState({ filesOpen: !1 }), setTimeout(() => window.print(), 150));
      },
      tkProofOn: !!e.tkProof,
      tkProofTitle: e.tkProof ? e.tkProof.title : "",
      tkProofDraft: !!(e.tkProof && e.tkProof.draft),
      tkProofDraftTxt: "مسودّة توثيق — حفظها الموظف ولم يضغط «تسليم» بعد؛ لا تُعدّ إنجازاً حتى يسلّمها",
      tkProofBy: e.tkProof
        ? [
            e.tkProof.draft ? "مسودّة · لم يُسلَّم" : "",
            e.tkProof.by ? "وثّقها " + e.tkProof.by : "توثيق المهمة",
            e.tkProof.at ? this.tkClock(e.tkProof.at) : "",
            e.tkProof.imgs.length
              ? 1 === e.tkProof.imgs.length
                ? "صورة واحدة"
                : 2 === e.tkProof.imgs.length
                  ? "صورتان"
                  : KIVO.BassamCount(e.tkProof.imgs.length, "صورة") + ""
              : "بلا صور",
          ]
            .filter(Boolean)
            .join(" · ")
        : "",
      tkProofNote: e.tkProof && e.tkProof.note ? "«" + e.tkProof.note + "»" : "",
      tkProofNoteOn: !!(e.tkProof && e.tkProof.note),
      tkProofImgs: e.tkProof
        ? e.tkProof.imgs.map((t, i) => {
            const e = this._tkImg(t) || "",
              er = e ? "" : this._tkImgErr(t);
            /* KIVO_265 · البند 18: سطرُ الختم (الوقتُ بالرياض · الموقع) تحت الصورة — ولو لم تُحمَّل بعد */
            return { src: e, on: !!e, off: !e && !er, err: !!er, errTxt: er, retry: () => this._tkImgRetry(t), ...this._tkProofStamp(this.state.tkProof.meta, t, i) };
          })
        : [],
      tkProofClose: () => this.setState({ tkProof: null }),
      tkProofStop: (t) => {
        try {
          t.stopPropagation();
        } catch (t) {}
      },
      shownCount: String(u.length),
      totalCount: String(c.length),
      isEmptyDay: k && "prod" !== e.sub,   /* KIVO_265 · البند 8: قسمُ الإنتاجية له فراغُه الخاص */
      showKanban: !k && "kanban" === e.sub,
      showList: !k && "list" === e.sub,
      ...this._tkProdVals(c),   /* KIVO_265 · البند 8 */
      /* الموجة 2 · DG-12: أيقونةُ المنصة (SVG) بدل الرموز التعبيرية */
      emptyIcQ: !!y,
      emptyIcCal: !y && !!(w || E0),
      emptyIcList: !y && !(w || E0),
      emptyTitle: y ? "لا نتائج مطابقة للفلاتر" : E0 ? "لا توجد مهام في هذا اليوم" : w ? "لا توجد مهام مخططة لهذا الشهر" : "لا توجد مهام لهذا الشهر",
      emptyHint: y
        ? "لا توجد مهمة تطابق البحث أو الفلاتر الحالية — امسح البحث أو أعد الفلاتر إلى «الكل» لعرض " +
          KIVO.BassamCount(c.length, "مهمة", "g") +
          " في هذا الشهر."
        : E0
          ? "اختر يوماً آخر من شريط الأيام أو «الشهر كاملاً» — أو أضف مهمة لهذا اليوم"
          : w
            ? "خطّط مسبقاً وأضف مهام لأي يوم من الشهر"
            : "يمكنك إضافة مهام لأي يوم من الشهر",
      emptyBtnLabel: y ? "إضافة مهمة جديدة" : E0 ? "إضافة مهمة لهذا اليوم" : w ? "تخطيط لهذا اليوم" : "إضافة مهمة",
      ...(() => {
        /* الموجة 1 · DG-01: الملغاةُ ونسخةُ «أُعيد إسنادها» ليست عملاً قائماً — خارج المقام (كانت «متبقية» فيظهر 14٪ و«كثّف المتابعة» والحيُّ منجزٌ كله) ·
           والمراجعةُ والإعادةُ والتعثّرُ في «جارية» كأعمدة اللوحة (KB) فتجتمع الأجزاءُ الستة إلى الإجمالي */
        const t = c.filter((x) => !this._tkOut(x)),
          e = t.length,
          cx = c.filter((x) => this._tkCan(x)).length,
          Z = cx ? "لا مهام قائمة — " + cx + " ملغاة" : "لا مهام هذا الشهر بعد",
          CX = cx ? " · " + cx + " ملغاة خارج الحساب" : "",
          KJ = { review: "in_progress", returned: "in_progress", stalled: "in_progress" },
          n = [
            ["pending", "انتظار", "#e5b563"],
            ["in_progress", "جارية", "#0284c7"],
            ["done", "منجزة", "#008450"],
            ["overdue", "متأخرة", "#dc2626"],
            ["expired", "لم تُقبل", "#b45309"],
            ["declined", "اعتذار", "#94a3b8"],
          ],
          a = n.map((e) => t.filter((t) => (KJ[t.status] || t.status) === e[0]).length),
          r = Math.max(...a, 0),
          s = 2 * Math.PI * 44;
        let o = 0;
        const i = [];
        n.forEach((t, n) => {
          const r = a[n];
          if (!r || !e) return;
          const l = r / e,
            h = Math.max(l * s - 2.5, 0.8);
          (i.push({
            color: t[2],
            dash: h.toFixed(2) + " " + (s - h).toFixed(2),
            rot: ((o / e) * 360 - 90).toFixed(2),
            tip: t[1] + ": " + r,
          }),
            (o += r));
        });
        const l = n.map((t, n) => ({
            name: t[1],
            color: t[2],
            count: a[n],
            pct: e ? Math.round((a[n] / e) * 100) : 0,
            isTop: e > 0 && a[n] === r && r > 0,
          })),
          h = a[2],
          d = e - h,
          m = e ? Math.round((h / e) * 100) : 0,
          p = 157.08,
          u = [
            ["urgent", "عاجل", "#dc2626"],
            ["high", "مرتفع", "#b45309"],
            ["normal", "عادي", "#2a76aa"],
            ["low", "منخفض", "#64748b"],
          ],
          f = u.map((e) => t.filter((t) => t.prio === e[0]).length),
          g = Math.max(...f, 1),
          b = u.map((t, n) => ({
            name: t[1],
            color: t[2],
            count: f[n],
            pct: e ? Math.round((f[n] / e) * 100) : 0,
            h: Math.max(6, Math.round((f[n] / g) * 62)),
            bar: f[n] ? t[2] : "#eef1f4",
            tip: t[1] + ": " + KIVO.BassamCount(f[n], "مهمة") + " (" + (e ? Math.round((f[n] / e) * 100) : 0) + "%)",
          })),
          y = u[f.indexOf(Math.max(...f))],
          k = t.filter((t) => t.showPerf && -1 !== t.perfLabel.indexOf("مبكر")).length,
          w = t.filter((t) => t.showPerf && -1 !== t.perfLabel.indexOf("تأخر")).length,
          S = t.filter((t) => t.showPerf && -1 !== t.perfLabel.indexOf("في الوقت")).length,
          x = k + w + S,
          T = x ? Math.round(((k + S) / x) * 100) : 0;
        return {
          tiTotal: String(e),
          tiDonut: i,
          tiLegend: l,
          tiDone: String(h),
          tiRemain: String(d),
          tiDonePct: e ? KIVO.bsPct((h / e) * 100) : "0",
          tiDoneGauge: ((m / 100) * p).toFixed(1) + " " + p.toFixed(1),
          tiDoneMsg: e
            ? m >= 80
              ? "أداء ممتاز — الشهر شبه مكتمل ✓"
              : m >= 50
                ? "تقدم جيد — تابع المتبقي"
                : "أقل من النصف — كثّف المتابعة"
            : Z,
          tiDoneMsgColor: e ? (m >= 80 ? "#047857" : m >= 50 ? "#9A7E40" : "#b45309") : "#94a3b8",
          tiStateMsg: e
            ? a[3] > 0
              ? "يوجد " +
                KIVO.BassamCount(a[3], "مهمة|متأخرة") +
                " — " +
                KIVO.BassamCount.agr(a[3], "عالجها", "عالجهما", "عالجها") +
                " أولاً"
              : "الحالة الأعلى: «" + n[a.indexOf(r)][1] + "» — " + r + " من " + KIVO.BassamCount(e, "مهمة", "g") + CX
            : Z,
          tiStateMsgColor: e ? (a[3] > 0 ? "#b45309" : "#9A7E40") : "#94a3b8",
          tiPrio: b,
          tiPrioTop: e ? "التركيز الأعلى: مهام بأولوية «" + y[1] + "»" : Z,
          tiEarly: String(k),
          tiOnTime: String(S),
          tiLate: String(w),
          tiPerfSample: x
            ? "من " + KIVO.BassamCount(x, "مهمة|مقيَّمة", "g") + " من أصل " + h + " منجزة"
            : h
              ? "لا مهمة مقيَّمة من أصل " + h + " منجزة"
              : "لا مهام منجزة بعد",
          tiUnrated: String(Math.max(0, h - x)),
          tiPerfPct: x ? KIVO.bsPct(((k + S) / x) * 100) : "0",
          tiPerfGauge: ((T / 100) * p).toFixed(1) + " " + p.toFixed(1),
          tiPerfMsg: x
            ? T >= 80
              ? "انضباط ممتاز بالمواعيد ✓"
              : T >= 50
                ? "انضباط مقبول — راقب التأخير"
                : "تأخير ملحوظ — راجع الأسباب"
            : "لا مهام منجزة مقيّمة بعد",
          tiPerfMsgColor: x ? (T >= 80 ? "#047857" : T >= 50 ? "#9A7E40" : "#b45309") : "#94a3b8",
          ...(() => {
            const R = KIVO.BassamRing,
              P = R.pct,
              ti = a.indexOf(r),
              pm = Math.max(...f),
              pi = f.indexOf(pm),
              pc = u[pi];
            return {
              tiK1Ring: R.segs(n.map((t, i) => ({ n: a[i], color: t[2], tip: t[1] + ": " + a[i] }))),
              tiK1Big: String(e),
              tiK1Col: "var(--fg-x141414)",
              tiK1Pill: e ? "⁧▲ " + n[ti][1] + " " + P(r, e) + "⁩" : "—",
              tiK1Sub: e
                ? a[3] > 0
                  ? "يوجد " +
                    KIVO.BassamCount(a[3], "مهمة|متأخرة") +
                    " — " +
                    KIVO.BassamCount.agr(a[3], "عالجها", "عالجهما", "عالجها") +
                    " أولاً"
                  : "الحالة الأعلى: «" + n[ti][1] + "» — " + r + " من " + KIVO.BassamCount(e, "مهمة", "g") + CX
                : Z,
              tiK1SubCol: e ? (a[3] > 0 ? "#b45309" : "#9A7E40") : "#94a3b8",
              tiK1Rows: n.map((t, i) => ({
                label: t[1],
                n: String(a[i]),
                pct: P(a[i], e),
                color: t[2],
                ncolor: a[i] ? t[2] : "#94a3b8",
                tip: t[1] + ": " + a[i],
              })),
              tiK2Ring: R.one(e ? h / e : 0),
              tiK2Big: String(h),
              tiK2Col: "#008450",
              tiK2Pill: (e ? KIVO.bsPct((h / e) * 100) : "0") + "٪",
              tiK2Sub: e
                ? m >= 80
                  ? "أداء ممتاز — الشهر شبه مكتمل ✓"
                  : m >= 50
                    ? "تقدم جيد — تابع المتبقي"
                    : "أقل من النصف — كثّف المتابعة"
                : Z,
              tiK2SubCol: e ? (m >= 80 ? "#047857" : m >= 50 ? "#9A7E40" : "#b45309") : "#94a3b8",
              tiK2Rows: [
                { label: "منجزة", n: String(h), pct: P(h, e), color: "#008450", ncolor: h ? "#008450" : "#94a3b8", tip: "منجزة: " + h },
                { label: "متبقية", n: String(d), pct: P(d, e), color: "#cbd5e1", ncolor: "#94a3b8", tip: "متبقية: " + d },
              ],
              tiK3Ring: R.segs(u.map((t, i) => ({ n: f[i], color: t[2], tip: t[1] + ": " + f[i] }))),
              tiK3Big: String(pm),
              tiK3Col: pm ? pc[2] : "#94a3b8",
              tiK3Pill: e && pm ? "⁧▲ " + pc[1] + " " + P(pm, e) + "⁩" : "—",
              tiK3Sub: e ? "التركيز الأعلى: مهام بأولوية «" + y[1] + "»" : Z,
              tiK3SubCol: "#9A7E40",
              tiK3Rows: b.map((t) => ({
                label: t.name,
                n: String(t.count),
                pct: P(t.count, e),
                color: t.color,
                ncolor: t.count ? t.color : "#94a3b8",
                tip: t.tip,
              })),
              tiK4Ring: R.segs([
                { n: k, color: "#f59e0b", tip: "مبكر: " + k },
                { n: S, color: "#008450", tip: "في الوقت: " + S },
                { n: w, color: "#dc2626", tip: "متأخر: " + w },
              ]),
              tiK4Big: String(k + S),
              tiK4Col: "#7c3aed",
              tiK4Pill: (x ? KIVO.bsPct(((k + S) / x) * 100) : "0") + "٪",
              tiK4Rows: [
                { label: "مبكر", n: String(k), pct: P(k, x), color: "#f59e0b", ncolor: k ? "#f59e0b" : "#94a3b8", tip: "مبكر: " + k },
                {
                  label: "في الوقت",
                  n: String(S),
                  pct: P(S, x),
                  color: "#008450",
                  ncolor: S ? "#008450" : "#94a3b8",
                  tip: "في الوقت: " + S,
                },
                { label: "متأخر", n: String(w), pct: P(w, x), color: "#dc2626", ncolor: w ? "#dc2626" : "#94a3b8", tip: "متأخر: " + w },
                {
                  label: "غير مقيَّمة",
                  n: String(Math.max(0, h - x)),
                  pct: "—",
                  color: "#cbd5e1",
                  ncolor: "#94a3b8",
                  tip: "منجزة بلا مدة مستهدفة — خارج حساب النسبة",
                },
              ],
            };
          })(),
        };
      })(),
      hasMonthTasks: c.length > 0,
      noMonthTasks: 0 === c.length,
      ...(() => {
        const t = e.retroAsk;
        if (!t) return { retroOn: !1 };
        const n = this.MONTHS[t.m - 1] || "";
        if (t.day) return this._tkDayAskVals(t, n);
        return {
          retroOn: !0,
          retroTitle: t.open ? "فتح شهر " + n + " " + e.year + " هـ بأثر رجعي" : "إعادة قفل شهر " + n + " " + e.year + " هـ",
          retroMsg: t.open
            ? "هذا الشهر انقضى وأُقفل تلقائياً. فتحه يتيح لك إضافة مهامه أو تعديل حالتها بأثر رجعي."
            : "سيعود الشهر إلى حالته المقفلة بانقضائه، ولن يمكن تعديل مهامه حتى تفتحه من جديد.",
          retroB1: t.open ? "ما تضيفه سيُسجَّل ضمن هذا الشهر المنقضي" : "ما أضفته يبقى محفوظاً كما هو",
          retroB2: t.open ? "يبقى مفتوحاً حتى تعتمده أو تعيد قفله" : "يمكنك فتحه مجدداً في أي وقت بنقرة مزدوجة",
          retroB3: t.open ? "يمكنك إعادة قفله في أي وقت بنقرة مزدوجة على كرته" : "إن أردت اعتماده بدل قفله، افتحه ثم أغلقه بنافذة الاعتماد",
          retroBtn: t.open ? "فتح بأثر رجعي" : "إعادة القفل",
          retroBtnStyle:
            "height:38px;padding:0 20px;border-radius:10px;font-size:13px;font-weight:400;border:0;cursor:pointer;color:var(--fg-xffffff);font-family:'Cairo',sans-serif;background:" +
            (t.open ? "var(--bg-xb45309)" : "var(--bg-x64748b)"),
          retroDo: async () => {
            (await this._setMonthOpenT(e.year, t.m, !!t.open)) && this.setState({ retroAsk: null });
          },
          retroCancel: () => this._tkClose("retroAsk", { retroAsk: null }),
          retroStop: (t) => t.stopPropagation(),
        };
      })(),
      tasksAutoHint: this.monthAutoLockedT(e.year, e.month),
      tasksApprovedHint: this.monthApprovedT(e.year, e.month),
      /* IRSZ-4: نصوصُ التلميح بحسب الصلاحية */
      tasksAutoTxt: "الشهر انقضى — مقفل · " + (this.PC("approve") ? "انقر بطاقة الشهر نقرة مزدوجة لفتحه ثم أضف المهام" : "فتحه للاستدراك يحتاج صلاحية الاعتماد — راجع مدير الإدارة"),
      tasksApprovedTxt: "مهام الشهر معتمدة ومقفلة" + (this.PC("approve") ? " · انقر بطاقة الشهر نقرة مزدوجة لفكّ الاعتماد وفتحه" : " · فكُّ الاعتماد يحتاج صلاحية الاعتماد"),
      tkLegendLockTxt: this.PC("approve") ? "انقضى — مقفل · نقرة مزدوجة لفتحه" : "انقضى — مقفل",
      ...t,
      tasksCanAdd: !this.monthLockedT(e.year, e.month) && !(SD0 && this.tkLockedAt(e.year, e.month, SD0)) && this.PC("add"),
      permCanAdd: this.PC("add"),
      permCanExport: this.PC("export"),
      noTasksTitle: "لا توجد مهام لشهر " + this.MONTHS[e.month - 1] + " " + e.year + " هـ",
      addFirstTaskLabel: "إضافة أول مهمة لشهر " + this.MONTHS[e.month - 1],
      delMonthOn: !!e.delMonth,
      delMonthMsg: e.delMonth
        ? "سيتم حذف جميع مهام شهر " + this.MONTHS[e.delMonth.n - 1] + " " + e.year + " هـ نهائياً وسيعود الكرت فارغاً — لا يمكن التراجع."
        : "",
      delMonthCancel: () => this._tkClose("delMonth", { delMonth: null }),
      delMonthDo: async () => {
        const value = this.state.delMonth;
        if (value && await this._tkDeleteMonth(this.state.year, value.n)) this.setState({ delMonth: null, page: 1 });
      },
      lockConfirmOpen: !!e.lockConfirm,
      lockCancel: () => this._tkClose("lockConfirm", { lockConfirm: null }),
      lockDo: async () => {
        const t = this.state.lockConfirm, year = this.state.year;
        if (!t) return;
        const ok = await this.mutateLocks((locks) => {
          const key = year + "-" + t.n;
          t.locked ? (this.monthPastT(year, t.n) ? (locks[key] = { mo: 1 }) : delete locks[key]) : (locks[key] = true);
        }, "lockConfirm");
        if (ok) this.setState({ lockConfirm: null });
      },
      lcTitle: e.lockConfirm && e.lockConfirm.locked ? "فتح الشهر للتعديل" : "اعتماد وإغلاق الشهر",
      lcMsg: e.lockConfirm
        ? e.lockConfirm.locked
          ? "سيتم فتح مهام " + this.MONTHS[e.lockConfirm.n - 1] + " " + e.year + " هـ وإلغاء اعتمادها لتصبح متاحة للتعديل."
          : "سيتم اعتماد مهام " +
            this.MONTHS[e.lockConfirm.n - 1] +
            " " +
            e.year +
            " هـ وإغلاق الشهر — لن يمكن إضافة أو تعديل أو حذف المهام بعد الإغلاق."
        : "",
      lcNote:
        e.lockConfirm && e.lockConfirm.locked
          ? "يمكنك إعادة اعتماده لاحقاً بنقرة مزدوجة على الكرت."
          : "يمكنك فتحه لاحقاً بنقرة مزدوجة على الكرت.",
      lcNoteColor: e.lockConfirm && e.lockConfirm.locked ? "#b45309" : "#047857",
      lcIconBox:
        "width:56px;height:56px;border-radius:16px;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;" +
        (e.lockConfirm && e.lockConfirm.locked
          ? "background:var(--bg-a245158110p1);border:1px solid var(--bd-a245158110p3);color:var(--fg-xb45309)"
          : "background:var(--bg-a0132800p08);border:1px solid var(--bd-a0132800p25);color:var(--fg-x008450)"),
      lcIconPath: e.lockConfirm && e.lockConfirm.locked ? "M7 11V7a5 5 0 0 1 9.9-1" : "M7 11V7a5 5 0 0 1 10 0v4",
      lcDoLabel: e.lockConfirm && e.lockConfirm.locked ? "فتح للتعديل" : "اعتماد وإغلاق",
      lcDoStyle:
        "height:38px;padding:0 20px;border-radius:10px;font-size:13px;font-weight:400;color:var(--fg-xffffff);border:0;cursor:pointer;font-family:'Cairo',sans-serif;background:" +
        (e.lockConfirm && e.lockConfirm.locked ? "var(--bg-xb45309)" : "var(--bg-x008450)"),
      confirmDelOn: !!e.confirmDel,
      confirmDelMsg: e.confirmDel
        ? "سيتم حذف المهمة «" +
          e.confirmDel.title +
          "»" +
          (e.confirmDel.grp ? " عن كل أفرادها (" + this.tkN(e.confirmDel.n) + ")" : "") +
          " من يوم " +
          e.confirmDel.d +
          " " +
          this.MONTHS[e.month - 1] +
          " نهائياً."
        : "",
      confirmDelCancel: () => this._tkClose("confirmDel", { confirmDel: null }),
      confirmDelDo: async () => {
        const t = e.confirmDel;
        if (!t) return;
        const n = e.year + "-" + e.month + "-" + t.d;
        /* KIVO_265 · حادثةُ الصور (البند 5): الحذفُ الفعليُّ للأخطاء الحديثة وحدها — صفٌّ عليه نشاطٌ يُلغى من قائمته (الخادمُ يرفضه task-del كذلك) */
        {
          const L0 = this.loadAllTasks()[n] || [],
            hit = t.grp ? L0.filter((r) => r && r[17] === t.grp) : [L0[this._tkIdx(L0, t.i, t.k)]].filter(Boolean);
          if (hit.some((r) => this._tkHasActivity(r)))
            return (this.bsToast("لا تُحذف مهمةٌ بدأ عليها نشاطٌ (قبول · توثيق · تسليم · إنجاز) — استعمل «إلغاء» من قائمة المهمة ليبقى سجلُّها", "warn"), void this.setState({ confirmDel: null }));
        }
        (await this.mutateStore((e) => {
          const q = t.grp ? -1 : this._tkIdx(e[n], t.i, t.k);   /* تحقّقُ fa5a5bf (V-7): بهوية الصفّ لا بموضعه */
          if (!t.grp && q < 0) return (this._tkGone(), !1);
          ((e[n] = t.grp ? (e[n] || []).filter((e) => !(e && e[17] === t.grp)) : (e[n] || []).filter((e, n) => n !== q)),
            e[n].length || delete e[n]);
        }, "confirmDel")) && this.setState({ confirmDel: null, page: 1 });
      },
      confirmFinishOn: !!e.confirmFinish,
      confirmFinishMsg: e.confirmFinish
        ? "سيتم إنهاء المهمة «" + e.confirmFinish.title + "» وتثبيت وقت الإنجاز واحتساب نتيجة الأداء. يمكنك التراجع لاحقاً عبر «إعادة فتح»."
        : "",
      confirmFinishCancel: () => this._tkClose("confirmFinish", { confirmFinish: null }),
      confirmFinishDo: async () => {
        const t = this.state.confirmFinish;
        if (t) {
          if (this.tkLockedAt(e.year, e.month, t.d)) return (this.bsToast(this._tkLockTxt(e.year, e.month, t.d)), void this.setState({ confirmFinish: null }));
          (await this._doFinish(t.d, t.i, t.k)) && this.setState({ confirmFinish: null });
        }
      },
      newTaskOpen: e.newTaskOpen,
      openNewTask: () => {
        this.PC("add") &&
          (o
            ? this.bsToast("الشهر معتمد ومقفل — " + this._tkHowOpen("افتحه أولاً بنقرة مزدوجة على كرت الشهر."))
            : SD0 && this.tkLockedAt(e.year, e.month, SD0)
              ? this.bsToast(this._tkLockTxt(e.year, e.month, SD0))
              : this._tkOpen({
                newTaskOpen: !0,
                editRef: null,
                newTitle: "",
                newDesc: "",
                newEmp: "",
                newDur: "",
                newPrio: "normal",
                newAsg: "general",
                newPick: {},
                pickQ: "",
                pickOpen: {},
                pickLim: 60,
                pickWt: "",
                newDay: SD0 || (d ? s.d : 1),
                newCreatedAt: Date.now(),
                newEDay: SD0 || (d ? s.d : 1),
                newSh: 8,
                newSm: 0,
                newSap: "ص",
                newEh: 10,
                newEm: 0,
                newEap: "ص",
                tkTp: null,
                tkTpQ: "",
                newAdvOpen: !1,
                newAdvTouched: !1,
                newPol: "any",
                newPolN: 1,
                newSteps: "",
                newRv: "creator",
                newDecOk: !0,
                newWinEarlyOn: !1,
                newWinEarly: 10,
                newWinLateOn: !0,
                newWinLate: 2,
                ...this._tkRecFrom(null),
                tkElig: null,
              }));
      },
      lockBadge: o ? " — معتمد ومقفل 🔒" : "",
      modalTitle: e.editRef ? "تعديل المهمة" : "مهمة جديدة",
      modalBtnLabel: e.editRef
        ? "حفظ التعديلات"
        : "direct" === e.newAsg && Object.keys(e.newPick || {}).length > 1
          ? "إسناد المهمة إلى " + this.tkN(Object.keys(e.newPick || {}).length, 1)
          : "direct" === e.newAsg && 1 === Object.keys(e.newPick || {}).length
            ? "إسناد المهمة"
            : "إنشاء المهمة",
      dayOpts: Array.from({ length: i }, (t, n) => {
        const a = n + 1,
          r = Math.min(Math.max(1, +(e.newDay || (d ? s.d : 1)) || 1), i);
        return {
          v: String(a),
          label:
            a + " " + this.MONTHS[e.month - 1] + " " + e.year + " هـ" + (e.year === s.y && e.month === s.m && a === s.d ? " (اليوم)" : ""),
          sel: a === r,
        };
      }),
      closeNewTask: () => this._tkClose("newTaskOpen", { newTaskOpen: !1, editRef: null, tkRecOk: !1 }),
      newTitle: e.newTitle,
      onNewTitle: (t) => this.setState({ newTitle: t.target.value }),
      newDesc: e.newDesc,
      onNewDesc: (t) => this.setState({ newDesc: t.target.value }),
      ...(() => {
        const t = Math.min(Math.max(1, +(e.newDay || (d ? s.d : 1)) || 1), i),
          n = Math.min(Math.max(1, +(e.newEDay || t) || t), i),
          w1 = this._tkWd1(e.year, e.month),
          TKWD = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
          a = (t) =>
            Array.from({ length: i }, (n, a) => {
              const r = a + 1;
              return { v: String(r), sel: r === t, label: (w1 >= 0 ? TKWD[(w1 + r - 1) % 7] + " " : "") + r + " " + this.MONTHS[e.month - 1] + " " + e.year + " هـ" };
            }),
          r = this.tkStamp(e.year, e.month, t, e.newSh, e.newSm, e.newSap),
          o = this.tkStamp(e.year, e.month, n, e.newEh, e.newEm, e.newEap),
          l = r && o ? Math.round((o - r) / 6e4) : null,
          h = null !== l && l <= 0,
          c = (t) => (t < 10 ? "0" + t : "" + t);
        return {
          tkStartDays: a(t),
          onTkStartDay: (t) => this.setState({ newDay: +t.target.value }),
          tkEndDays: a(n),
          onTkEndDay: (t) => this.setState({ newEDay: +t.target.value }),
          ...(() => {
            const sMin = this._tkMinOf(e.newSh, e.newSm, e.newSap),
              eMin = this._tkMinOf(e.newEh, e.newEm, e.newEap),
              C = { y: e.year, m: e.month, sd: t, days: i, dur: null !== l ? l : (n - t) * 1440 + eMin - sMin },
              out = { tkTpQ: e.tkTpQ || "", onTkTpQ: (ev) => this.setState({ tkTpQ: ev && ev.target ? ev.target.value : "" }) },
              apply = () => {
                const w = this.state.tkTp;
                if (!w) return;
                const v = this._tkParseTime(this.state.tkTpQ, "s" === w ? e.newSap : e.newEap);
                null == v ? this.bsToast("اكتب الوقت مثل 8:10 م أو 20:10", "warn") : this._tkSetT(w, v, C);
              };
            out.tkTpApply = apply;
            out.onTkTpKey = (ev) => {
              const k = ev && ev.key;
              "Enter" === k
                ? (ev.preventDefault && ev.preventDefault(), apply())
                : "Escape" === k && this.state.tkTp
                  ? (ev.stopPropagation && ev.stopPropagation(), this._tkTpClose(this.state.tkTp))
                  : "ArrowDown" === k && this.state.tkTp && (ev.preventDefault && ev.preventDefault(), this._tkTpMove(this.state.tkTp, "sel"));
            };
            /* KIVO_265 · منتقي الوقت (مراجعة): تمريرُ جسم النافذة يُبقي القائمةَ الثابتة (650-dropdown-unify) فوق زرّها؛ فإن خرج الزرّ
               عن المنطقة المرئية أكثرَ من نصفه أُغلقت القائمة بدل أن تطفو فوق رأس النافذة أو تذييلها */
            out.tkBdScroll = (ev) => {
              const w = this.state.tkTp;
              if (!w) return;
              try {
                const bd = ev && ev.currentTarget,
                  b = bd && bd.querySelector('[data-tp-trig="' + w + '"]');
                if (!b) return;
                const R = bd.getBoundingClientRect(),
                  r = b.getBoundingClientRect(),
                  vis = Math.min(r.bottom, R.bottom) - Math.max(r.top, R.top);
                vis < r.height / 2 && this._tkTpClose(w);
              } catch (x) { /* بلا قياس ⇒ تبقى مفتوحةً كما كانت */ }
            };
            const g = "e" === e.tkTp && r ? this.hGreg(e.year, e.month, n) : null;
            ["s", "e"].forEach((w) => {
              const P = "s" === w ? "tkTpS" : "tkTpE",
                cur = "s" === w ? sMin : eMin,
                open = e.tkTp === w,
                bad = "e" === w && h,
                k = this._tkClk(cur);
              out[P + "V"] = k.v;
              out[P + "Ap"] = k.ap;
              out[P + "Open"] = open;
              out[P + "OpenA"] = open ? "true" : "false";
              out[P + "Chev"] = "flex-shrink:0;opacity:.55;transition:transform .2s;margin-inline-start:auto" + (open ? ";transform:rotate(180deg)" : "");
              out[P + "Btn"] =
                "width:100%;height:46px;display:flex;align-items:center;gap:8px;padding:0 12px;border-radius:12px;background:var(--bg-input);color:var(--text-primary);cursor:pointer;font-family:'Cairo',sans-serif;transition:border-color .15s,box-shadow .15s;border:1px solid " +
                (bad ? "var(--danger-border)" : open ? "var(--brand-fg);box-shadow:0 0 0 3px var(--brand-ring);position:relative;z-index:61" : "var(--border-default)");
              /* العرضُ والتمريرُ إلى المختار والبؤرةُ في نداء setState بعد إدراج القائمة وقبل رسمها — لا وميضَ بعرضٍ خاطئ ثم تصحيحِه */
              out[P + "Toggle"] = () =>
                this.setState(
                  (q) => ({ tkTp: q.tkTp === w ? null : w, tkTpQ: "", fddOpen: null }),
                  () => {
                    try {
                      if (this.state.tkTp !== w) return;
                      const L = document.querySelector('[data-tp-list="' + w + '"]'),
                        el = L && L.querySelector('[aria-selected="true"]'),
                        pop = L && L.parentElement,
                        btn = document.querySelector('[data-tp-trig="' + w + '"]');
                      /* عرضُ القائمة = عرضُ حقلها: حارسُ القصّ (650-dropdown-unify) يثبّتها fixed بحافّتها اليسرى وحدها فتنكمش إلى محتواها */
                      btn && pop && pop.style.setProperty("width", Math.round(btn.getBoundingClientRect().width) + "px");
                      el && ((L.scrollTop = Math.max(0, el.offsetTop - L.clientHeight / 2 + el.offsetHeight / 2)), el.focus({ preventScroll: !0 }));
                    } catch (x) { /* بلا DOM أو أُغلقت القائمة قبل الإطار ⇒ لا تمريرَ ولا عرض (تجميلٌ لا يمسّ القيمة) */ }
                  },
                );
              /* لوحةُ المفاتيح في القائمة: الأسهم وHome/End تنقل البؤرة بين الخيارات (tabindex متنقّل: المختارُ وحده 0) · Enter/Space ينقر الزرّ
                 أصلاً · Escape يلتقطه _tkTpEsc ويعيد البؤرة إلى الزرّ */
              out[P + "ListKey"] = (ev) => {
                const k = ev && ev.key,
                  dir = "ArrowDown" === k ? 1 : "ArrowUp" === k ? -1 : "Home" === k ? "first" : "End" === k ? "last" : 0;
                dir && (ev.preventDefault && ev.preventDefault(), this._tkTpMove(w, dir));
              };
              /* خروجُ البؤرة من الحقل وقائمته إلى عنصرٍ آخر (Tab) يغلقها؛ ولا يُغلق إن سقطت إلى body — Safari لا يُبئّر الزرَّ عند النقر
                 فكان النقرُ على خيارٍ يُغلق القائمة قبل وصول نقرته */
              out[P + "Blur"] = () =>
                setTimeout(() => {
                  try {
                    const a = document.activeElement,
                      R = document.querySelector('[data-tp-root="' + w + '"]');
                    a && a !== document.body && R && !R.contains(a) && this.state.tkTp === w && this.setState({ tkTp: null, tkTpQ: "" });
                  } catch (x) { /* بلا DOM ⇒ يُغلق بالنقر خارجها وحده */ }
                }, 0);
              if (!open) return void (out[P + "Opts"] = []);
              const L = [];
              for (let q = 0; q < 1440; q += 15) L.push(q);
              L.indexOf(cur) < 0 && (L.push(cur), L.sort((a, b) => a - b));
              out[P + "Opts"] = L.map((q) => {
                const sel = q === cur,
                  c = this._tkClk(q),
                  d =
                    "e" !== w
                      ? null
                      : g
                        ? Math.round((new Date(g.getFullYear(), g.getMonth(), g.getDate(), Math.floor(q / 60), q % 60).getTime() - r) / 6e4)
                        : (n - t) * 1440 + q - sMin,
                  before = null !== d && d <= 0;
                return {
                  t: c.v + " " + c.ap,
                  sub: null === d ? "" : before ? "قبل البداية" : this.tkDurTxt(d),
                  sel: sel ? "true" : "false",
                  ti: sel ? "0" : "-1",
                  click: () => this._tkSetT(w, q, C),
                  style:
                    "display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;min-height:38px;padding:6px 12px;border-radius:9px;border:0;cursor:pointer;font-family:'Cairo',sans-serif;font-size:13px;text-align:right;" +
                    (sel ? "background:var(--brand-tint);color:var(--brand-text);font-weight:700" : before ? "color:var(--text-faint)" : "color:var(--text-primary)"),
                };
              });
            });
            return out;
          })(),
          tkDaySelStyle:
            "width:100%;height:40px;border:1px solid var(--border-default);border-radius:10px;padding:0 10px;font-size:12.5px;outline:none;font-family:'Cairo',sans-serif;background:var(--bg-input);color:var(--text-primary);cursor:pointer",
          tkDurTxt: h ? "النهاية قبل البداية" : l ? this.tkDurTxt(l) : "—",
          tkDurStyle:
            "height:28px;display:inline-flex;align-items:center;padding:0 12px;border-radius:9999px;font-size:13px;font-weight:700;font-family:'Cairo',sans-serif;border:1px solid " +
            (h
              ? "var(--danger-border);background:var(--danger-bg);color:var(--danger-text)"
              : l
                ? "var(--border-brand-soft);background:var(--brand-tint);color:var(--brand-text)"
                : "var(--border-default);background:var(--bg-surface);color:var(--text-muted)"),
          tkMonthNote: "كلا الوقتين داخل شهر " + this.MONTHS[e.month - 1] + " " + e.year + " هـ",
        };
      })(),
      acceptOpen: !!e.acceptRef,
      acceptTitle: e.acceptRef ? e.acceptRef.title : "",
      closeAccept: () => this._tkClose("acceptRef", { acceptRef: null }),
      acceptNoAssign: () => this._doAccept("", null),
      ...this._tkDutyVals(),
      submitTask: async () => {
        if (await this._tkPendingEditor()) return;
        const t = e.newTitle.trim();
        if (!t) return void this.bsToast("اكتب عنوان المهمة أولاً");
        const a = Math.min(Math.max(1, +(e.newDay || 1) || 1), i),
          r = Math.min(Math.max(1, +(e.newEDay || a) || a), i),
          o = this.tkStamp(e.year, e.month, a, e.newSh, e.newSm, e.newSap),
          l = this.tkStamp(e.year, e.month, r, e.newEh, e.newEm, e.newEap);
        if (!o || !l) return void this.bsToast("تعذّر حساب وقت المهمة — أعد اختيار البداية والنهاية");
        if (l <= o) return void this.bsToast("نهاية المهمة يجب أن تكون بعد بدايتها");
        const h = Math.round((l - o) / 6e4) || null,
          m = Math.min(Math.max(1, +(e.newDay || (d ? s.d : 1)) || 1), i),
          p = e.year + "-" + e.month + "-" + m,
          D = "direct" === e.newAsg,
          P = e.newPick || {},
          K = Object.keys(P);
        /* KIVO_265 · قفلُ اليوم: يُحفظ في يومٍ مفتوح ومن يومٍ مفتوح — وكان {mo:1} (شهرٌ منقضٍ فُتح بأثر رجعي) يُحسب مقفلاً فيُرفض الحفظ فيه */
        if (this.monthApprovedT(e.year, e.month))
          return void this.bsToast(
            "شهر " +
              this.MONTHS[e.month - 1] +
              " " +
              e.year +
              " هـ معتمد ومقفل — لا يمكن حفظ المهمة فيه. " +
              this._tkHowOpen("افتح الشهر أولاً بنقرة مزدوجة على كرت الشهر."),
          );
        if (this.tkLockedAt(e.year, e.month, m) || (e.editRef && e.editRef.d && this.tkLockedAt(e.year, e.month, +e.editRef.d)))
          return void this.bsToast("اليوم " + (this.tkLockedAt(e.year, e.month, m) ? m : e.editRef.d) + " " + this.MONTHS[e.month - 1] + " مقفل — " + this._tkHowOpen("افتحه أولاً بنقرة مزدوجة على خانته في شريط الأيام."));
        /* KIVO_265 · قرارُ المالك: التكرارُ في النموذج — يُتحقّق منه قبل أيّ كتابة، و«لمرة واحدة» لصفٍّ من سلسلة يُؤكَّد أولاً؛ وفعلُه يُرسل بعد وصول التعديل */
        if (e.editRef && !e.editRef.grp) {
          if (D && !K.length) return void this.bsToast("اختر الموظف المسند إليه أو اجعل المهمة عامة", "warn");
          if (D && K.length > 1) return void this.bsToast("عند التعديل يُختار موظف واحد فقط — للإسناد الجماعي أنشئ مهمة جديدة", "warn");
        }
        const RP = e.editRef ? this._tkRecPlan(this._tkEditRow(this.loadAllTasks())) : {};
        if (RP.err) return void this.bsToast(RP.err, "warn");
        if (RP.ask) return void this._tkRecAsk(RP.id);
        e.tkRecOk && this.setState({ tkRecOk: !1 });
        if (e.editRef) {
          const opened = this._tkDrafts && this._tkDrafts.newTaskOpen;
          if (!opened) return this.bsToast("أعد فتح المهمة لتثبيت نسخة المسودة", "warn");
          let original;
          try { original = this._tkEditRow(opened.draft.get("bassam_tasks_v1") || {}); }
          catch (error) { if (!(this._tkCommands && this._tkCommands.newTaskOpen)) return this.bsToast("تغيّرت المهمة — راجع المسودة قبل الحفظ", "warn"); }
          if (original && !e.editRef.grp && String(original[14] || "") !== String(D ? K[0] : "")) {
            const orphan = !String(original[14] || ""), management = original[23], protectedOrphan = original[3] === "done" || original[12] || original[21] || (management && (management.asg === "cancelled" || management.asg === "reassigned"));
            if ((!orphan && this._tkHasActivity(original)) || (orphan && protectedOrphan))
              return this.bsToast("لا يُغيَّر المكلَّفُ هنا بعد نشاط الموظف أو إغلاق المهمة — استخدم إعادة إسناد", "warn");
          }
          const previous = this._tkCommands && this._tkCommands.newTaskOpen;
          if (!original && previous) {
            const edit = previous.body.edit;
            if (!edit || edit.k !== p || edit.t !== t || edit.desc !== e.newDesc.trim() || edit.prio !== e.newPrio || edit.s !== o || edit.e !== l ||
                (!e.editRef.grp && String(edit.ekey || "") !== String(D ? K[0] : ""))) return this.bsToast("الطلب السابق لم يُحسم — احتفظ بالمسودة السابقة وأعد الطلب نفسه", "warn");
          }
          const body = previous && !original ? Object.assign({}, previous.body) : Object.assign({ k: e.year + "-" + e.month + "-" + e.editRef.d },
            e.editRef.grp ? { grp: e.editRef.grp } : { id: original[13], ekey: original[14] == null ? null : String(original[14]) },
            { edit: Object.assign({ k: p, t: t, desc: e.newDesc.trim(), prio: e.newPrio, s: o, e: l }, e.editRef.grp ? {} : { ekey: D ? K[0] : null, wt: D ? null : String(e.pickWt || "") || null }) },
            e.newAdvTouched ? this._tkAdvBody() : {}, RP.op ? { recur: Object.assign({}, RP) } : {});
          if (body.recur) { delete body.recur.ask; delete body.recur.err; }
          ["uid", "dept", "epoch", "base", "requestId"].forEach((key) => delete body[key]);
          const response = await this._tkCommandApi("/api/tasks/settings", body, "newTaskOpen");
          if (response.j && response.j.ok === 1) {
            this.setState({ newTaskOpen: false, editRef: null });
            if (body.recur) this._tkRecAck(body.recur.op, response.j.recurrence);
          }
          else this.bsToast(this._tkErr(response, "لم تُحفظ تعديلات المهمة — المسودة باقية"), "warn");
          return;
        }
        if (D && !K.length) return void this.bsToast("اختر وردية أو موظفاً واحداً على الأقل — أو اجعل المهمة عامة", "warn");
        let y = null,
          SHB = null;   /* KIVO_265 · البند 12: الورديةُ كيانًا (shift {name}) حين يتجاوز الاختيارُ سقفَ القائمة */
        if (D && K.length > 1) {
          const t = this.tkPickModel(m),
            n = [],
            W = String(e.pickWt || "");
          let a = 0;
          (t.groups.forEach((t) => {
            const s = W ? t.emps.filter((t) => t.wt === W) : t.emps;
            if (t.none) return void (a += t.emps.filter((t) => void 0 !== P[t.id]).length);
            const e = s.filter((t) => !t.off),
              r = e.length > 0 && e.every((t) => void 0 !== P[t.id]);
            r ? n.push(t.name) : (a += t.emps.filter((t) => void 0 !== P[t.id]).length);
          }),
            (y = n.length ? n.join(" + ") + (W ? " · " + W : "") + (a ? " + " + this.tkN(a) : "") : this.tkN(K.length)));
          /* KIVO_265 · البند 12: أكثرُ من 50 مكلَّفاً يتجاوز سقفَ asg في الخادم — تُرسل الورديةُ كيانًا (shift {name}) حين الاختيارُ ورديةٌ واحدة كاملة بلا إضافاتٍ
             ولا تصفيةٍ بنوع العمل (يحلّ الخادمُ مكلَّفيها يومَها من الجدول الشهري وتقرير اليوم ويتخطّى من لا يُسند بسببه)؛ وما دون 50 يبقى بالقائمة كما كان —
             الأبسطُ والأضمن: القائمةُ تحمل ما اختاره المسؤولُ حرفاً، والورديةُ وحدها تحتاج الحلَّ في الخادم */
          if (K.length > 50 && this._tkSrv()) {
            if (1 !== n.length || a || W) return void this.bsToast("أكثر من 50 مكلَّفاً — تُسند الوردية كاملةً ككيان: اختر وردية واحدة كاملة بلا إضافات ولا تصفية بنوع العمل، أو قسّم المهمة", "warn");
            SHB = { name: n[0] };
          }
        }
        if (this._tkSrv()) {
          const RN = this._tkRecPlan(null);
          if (RN.err) return void this.bsToast(RN.err, "warn");
          return void this._tkCreateSrv(
            Object.assign(
              { k: p, t: t, desc: e.newDesc.trim(), prio: e.newPrio, s: o, e: l, asg: SHB ? void 0 : D ? K : [], shift: SHB || void 0, grpL: D && K.length > 1 && y ? y : void 0, wt: D ? void 0 : String(e.pickWt || "") || void 0 },
              this._tkAdvBody(),
              { rec: RN.rec || void 0 },
            ),
          );
        }
        this.bsToast("تحتاج المهمة إلى اتصال الخادم — المسودة باقية ولم يُحفظ تغيير محلي", "warn");
      },
      ...this.tkAsgVals(Math.min(Math.max(1, +(e.newDay || (d ? s.d : 1)) || 1), i)),
      ...this._tkActVals(),
      ...this._tkEligVals(),
      ...this._tkAdvVals(),
      ...this._tkRecVals(),
      stopClick: (t) => t.stopPropagation(),
      prioOpts: [
        ["low", "منخفض"],
        ["normal", "عادي"],
        ["high", "مرتفع"],
        ["urgent", "عاجل"],
      ].map(([t, n]) => {
        const a = this.PRIO[t];
        return {
          label: n,
          click: () => this.setState({ newPrio: t }),
          style:
            "flex:1;height:40px;border-radius:12px;font-size:12.5px;cursor:pointer;transition:all .15s;font-family:'Cairo',sans-serif;border:1px solid " +
            (e.newPrio === t
              ? a[3] + ";background:" + a[2] + ";color:" + a[1] + ";font-weight:700;box-shadow:var(--shadow-card)"
              : "var(--border-default);background:var(--bg-surface);color:var(--text-secondary);font-weight:400"),
        };
      }),
    };
  }
}
