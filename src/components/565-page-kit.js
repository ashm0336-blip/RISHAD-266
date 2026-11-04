/* ═══ مناهجُ الصفحات المشتركة — مصدرٌ واحد (KIVO_257 · AUD-012 · AUD-013 خطوة ١) ═══
   كلُّ منهجٍ كان منسوخاً بالاسم والجسد نفسَيهما في وحدتين فأكثر صار هنا مرّةً واحدة، مجمَّعاً بـ«سمة» = مجموعةُ الوحدات التي يخصّها؛
   الوحدةُ تعلن سماتها: class Component extends window.BassamPageKit.base(DCLogic, ["…"]) — وتبقى مناهجُها الخاصة فوقها.
   مولَّدٌ ومُبرهَنٌ بـtools/page_kit.mjs (المناهجُ الخاصة ∪ مناهجُ السمات = مناهجُ الوحدة الأصلية: الاسم · النوع · شجرةُ AST). لا يُحرَّر يدوياً
   إلا بتعديل المنهج نفسِه — وحينها يسري على كل وحداته معاً (وهو الغرض). */
(function () {
  var T = {};
  /* ── admin · award · daily · dreport · employees · irshad · plan · profile · seized · staff · tasks (1) ── */
  T["admin+award+daily+dreport+employees+irshad+plan+profile+seized+staff+tasks"] = function (B) {
    return class extends B {
      bsAck(t, e, o) {
        return KIVO.BassamAck ? KIVO.BassamAck.toast(this, t, e, o) : (this.bsToast(t, e), Promise.resolve(!0));
      }
    };
  };
  /* ── daily · dreport · dstats · irshad · plan · seized · staff · tasks (1) ── */
  T["daily+dreport+dstats+irshad+plan+seized+staff+tasks"] = function (B) {
    return class extends B {
      MONTHS = ["محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"];
    };
  };
  /* ── daily · dreport · irshad · plan · seized · staff · tasks (1) ── */
  T["daily+dreport+irshad+plan+seized+staff+tasks"] = function (B) {
    return class extends B {
      _hfmt() {
        if (void 0 === this.__hf)
          try {
            this.__hf = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { year: "numeric", month: "numeric", day: "numeric" });
          } catch (t) {
            this.__hf = null;
          }
        return this.__hf;
      }
    };
  };
  /* ── dreport · irshad · planning · profile · seized · staff · tasks (1) ── */
  T["dreport+irshad+planning+profile+seized+staff+tasks"] = function (B) {
    return class extends B {
      bsOn(t) {
        try {
          const e = KIVO.BassamPerm;
          return !e || !e.on || !!e.on(t);
        } catch (t) {
          return !0;
        }
      }
    };
  };
  /* ── daily · dreport · irshad · plan · profile · seized (1) ── */
  T["daily+dreport+irshad+plan+profile+seized"] = function (B) {
    return class extends B {
      bsLensOn(t) {
        try {
          const e = KIVO.BassamPerm;
          return !e || !e.lensOn || !!e.lensOn(t);
        } catch (t) {
          return !0;
        }
      }
    };
  };
  /* ── daily · plan · seized · staff (2) ── */
  T["daily+plan+seized+staff"] = function (B) {
    return class extends B {
      hGregYearRange(t) {
        try {
          const e = this.hGreg(t, 1, 1).getFullYear(),
            s = this.hGreg(t, 12, 29).getFullYear();
          return e === s ? e + " م" : e + " – " + s + " م";
        } catch (t) {
          return "";
        }
      }
      hParts(t) {
        const e = this._hfmt().formatToParts(t),
          s = (t) => +e.find((e) => e.type === t).value;
        return { y: s("year"), m: s("month"), d: s("day") };
      }
    };
  };
  /* ── admin · profile · seized (1) ── */
  T["admin+profile+seized"] = function (B) {
    return class extends B {
      bsToast(t, e) {
        try {
          const s = e || "err";
          let a = document.getElementById("bs-toast");
          a || ((a = document.createElement("div")), (a.id = "bs-toast"), document.body.appendChild(a));
          const r =
            "ok" === s
              ? ["var(--toast-ok)", "var(--bg-toast)", "var(--toast-ok-bd)", "✓"]
              : "warn" === s
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
    };
  };
  /* ── award · irshad · seized (2) ── */
  T["award+irshad+seized"] = function (B) {
    return class extends B {
      componentDidMount() {
        ((this._bsOutM = (t) => this._bsOutsideMenus(t)), document.addEventListener("click", this._bsOutM, !0));
      }
      componentWillUnmount() {
        this._bsOutM && document.removeEventListener("click", this._bsOutM, !0);
      }
    };
  };
  /* ── daily · dreport · plan (1) ── */
  T["daily+dreport+plan"] = function (B) {
    return class extends B {
      GREG = [
        "يونيو 2026",
        "يوليو 2026",
        "أغسطس 2026",
        "سبتمبر 2026",
        "أكتوبر 2026",
        "نوفمبر 2026",
        "ديسمبر 2026",
        "يناير 2027",
        "فبراير 2027",
        "مارس 2027",
        "أبريل 2027",
        "مايو 2027",
      ];
    };
  };
  /* ── irshad · seized · tasks (1) ── */
  T["irshad+seized+tasks"] = function (B) {
    return class extends B {
      hToday() {
        try {
          const t = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {
              year: "numeric",
              month: "numeric",
              day: "numeric",
            }).formatToParts(new Date()),
            e = (e) => +t.find((t) => t.type === e).value;
          return { y: e("year"), m: e("month"), d: e("day") };
        } catch (t) {
          return KIVO.BassamHijri ? KIVO.BassamHijri.now() : { y: 1448, m: 2, d: 1 };
        }
      }
    };
  };
  /* ── admin · seized (1) ── */
  T["admin+seized"] = function (B) {
    return class extends B {
      _rowMenu(t, e) {
        const s = (e || []).filter(Boolean),
          a = this.state.rowMenu === t;
        return {
          rmHas: s.length > 0,
          rmOpen: a,
          rmToggle: (e) => {
            (e && e.stopPropagation && e.stopPropagation(), this.setState((e) => ({ rowMenu: e.rowMenu === t ? null : t })));
          },
          rmBtnStyle:
            "width:28px;height:28px;border-radius:8px;cursor:pointer;padding:0;display:inline-flex;align-items:center;justify-content:center;transition:all .15s;border:1px solid " +
            (a
              ? "#b99751;background:var(--bg-a185151810p1);color:var(--fg-x8a6f35)"
              : "#E1E1E1;background:var(--bg-xffffff);color:var(--fg-x64748b)"),
          rmItems: s.map((t) => ({
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
    };
  };
  /* ── daily · plan (20) ── */
  T["daily+plan"] = function (B) {
    return class extends B {
      GATE_LOCS = [
        ["الساحة الشمالية", "#1E458A"],
        ["الساحة الجنوبية", "#0E573A"],
        ["الساحة الشرقية", "#BF9958"],
        ["الساحة الغربية", "#750E1F"],
      ];
      async _addMarkKind(t) {
        const e = (t || "").trim();
        if (!e) return false;
        const s = this._markKinds();
        if (s.includes(e)) return true;
        const result = await KIVO.__BS_SRV.operations.commit(this, "mark-kind", { kind: e }, draft => draft.set("bassam_mark_kinds_v1", [...s, e]));
        if (!result || result.ok !== 1) { this.bsToast("لم يصل تأكيد حفظ النوع — أعد الإجراء نفسه للتحقق من المسودة."); return false; }
        return true;
      }
      _ck(t) {
        if (null == t) return t;
        const e = this._empIdx()[String(t)];
        return e && e.eid ? String(e.eid) : t;
      }
      _codeSan(t) {
        return String(null == t ? "" : t)
          .replace(/[٠-٩]/g, (t) => String.fromCharCode(t.charCodeAt(0) - 1584))
          .replace(/[۰-۹]/g, (t) => String.fromCharCode(t.charCodeAt(0) - 1728))
          .replace(/[^0-9A-Za-zء-غف-يٱ-ۓ]/g, "");
      }
      _empIdx() {
        let t = null;
        try {
          t = KIVO.__BS_SRV.operations.text("bassam_employees_v1");
        } catch (e) {}
        if (this.__eiSrc === t && this.__ei) return this.__ei;
        let e = [];
        try {
          e = JSON.parse(t || "[]");
        } catch (s) {}
        Array.isArray(e) || (e = []);
        const s = {};
        return (
          e.forEach((e) => {
            if (!e) return;
            (KIVO.BassamEmp ? KIVO.BassamEmp.tokens(e) : [e.eid, e.nid, e.name])
              .filter(Boolean)
              .map(String)
              .forEach((t) => {
                void 0 === s[t] && (s[t] = e);
              });
          }),
          (this.__eiSrc = t),
          (this.__ei = s),
          s
        );
      }
      _gcImages() {
        try {
          KIVO.BassamPurge && KIVO.BassamPurge.gcImages();
        } catch (t) {}
      }
      _markKinds() {
        let t = ["دورات مياه", "سلالم", "مصاعد", "سبيل", "نقطة إسعاف", "مخرج طوارئ", "نقطة تجمّع"];
        try {
          const e = KIVO.__BS_SRV.operations.text("bassam_mark_kinds_v1");
          if (e) {
            const s = JSON.parse(e);
            Array.isArray(s) && s.length && (t = s);
          }
        } catch (t) {}
        return t;
      }
      _nm(t) {
        if (null == t) return "";
        const e = this._empIdx()[String(t)];
        return e && e.name ? String(e.name) : String(t);
      }
      _optCats(t) {
        return t && "object" == typeof t && Array.isArray(t.c) && "string" != typeof t.c ? t.c : null;
      }
      _optCode(t) {
        return t && "object" == typeof t ? ("string" == typeof t.c ? t.c : "string" == typeof t.k ? t.k : "") : "";
      }
      _optName(t) {
        return "string" == typeof t ? t : (t && t.n) || "";
      }
      _optTypes(t) {
        return t && "object" == typeof t && Array.isArray(t.t) ? t.t : null;
      }
      _typeCats(t) {
        if (!t) return null;
        const e = this.zoneOptList("ztype").find((e) => this._optName(e) === t),
          s = this._optCats(e);
        return s && s.length ? s : null;
      }
      _uid() {
        return KIVO.BassamIdent ? KIVO.BassamIdent.newUid() : void 0;
      }
      _zcatKey(t, e) {
        const s = String(t || "").trim();
        return s ? s + " · " + e : String(e || "");
      }
      gateLocColor(t) {
        const e = this.GATE_LOCS.find((e) => e[0] === t);
        return e ? e[1] : null;
      }
      hGregMonthLabel(t, e) {
        const s = t + "-" + e;
        if (((this.__hg = this.__hg || {}), this.__hg[s])) return this.__hg[s];
        let n = "";
        try {
          n = this.hGreg(t, e, 15).toLocaleDateString("ar-u-ca-gregory-nu-latn", { month: "long", year: "numeric" });
        } catch (t) {}
        return ((this.__hg[s] = n), n);
      }
      zoneOptList(t) {
        const e = (this.state.zoneOpts || {})[t];
        return Array.isArray(e) ? e.filter((t) => ("string" == typeof t && t) || (t && "object" == typeof t && t.n)) : [];
      }
    };
  };
  /* ── dreport · staff (3) ── */
  T["dreport+staff"] = function (B) {
    return class extends B {
      get PERM_DEF_LIMIT() {
        return 2;
      }
      WEEKDAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
      loadPermLimit() {
        return this.PERM_DEF_LIMIT;
      }
    };
  };
  /* ── dstats · irshad (2) ── */
  T["dstats+irshad"] = function (B) {
    return class extends B {
      _bsOutsideMenus(t) {
        try {
          for (var e = t.target, r = !1; e && e !== document.body; ) {
            if (e.style && ("absolute" === e.style.position || "fixed" === e.style.position)) {
              r = !0;
              break;
            }
            e = e.parentElement;
          }
          var a = this,
            i = this.bsMenusPatch(),
            s = {};
          (Object.keys(i).forEach(function (t) {
            s[t] = a.state[t];
          }),
            setTimeout(function () {
              try {
                var t = !1,
                  e = !1,
                  n = a.state;
                if (
                  (Object.keys(i).forEach(function (r) {
                    (n[r] !== s[r] && (t = !0), n[r] && (e = !0));
                  }),
                  t || r || !e)
                )
                  return;
                a.setState(i);
              } catch (t) {}
            }, 0));
        } catch (t) {}
      }
      _rowMenu(t, e) {
        const r = (e || []).filter(Boolean),
          a = this.state.rowMenu === t;
        return {
          rmHas: r.length > 0,
          rmOpen: a,
          rmToggle: (e) => {
            (e && e.stopPropagation && e.stopPropagation(), this.setState((e) => ({ rowMenu: e.rowMenu === t ? null : t })));
          },
          rmBtnStyle:
            "width:28px;height:28px;border-radius:8px;cursor:pointer;padding:0;display:inline-flex;align-items:center;justify-content:center;transition:all .15s;border:1px solid " +
            (a
              ? "#b99751;background:var(--bg-a185151810p1);color:var(--fg-x8a6f35)"
              : "#E1E1E1;background:var(--bg-xffffff);color:var(--fg-x64748b)"),
          rmItems: r.map((t) => ({
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
    };
  };
  /* ── employees · staff (2) ── */
  T["employees+staff"] = function (B) {
    return class extends B {
      PERM_TPLS() {
        /* القوالب ورقةٌ بيضاء يكتبها المستخدم من «قوالب الصلاحيات» — لا قوالب مدمجة تُزرع */ try {
          const t = JSON.parse(localStorage.getItem("bassam_perm_tpls_v1"));
          if (Array.isArray(t)) {
            const e = KIVO.BassamPerm;
            return e && e.tplsMigrate ? e.tplsMigrate(t) : t;
          }
        } catch (t) {}
        return [];
      }
    };
  };
  /* ── irshad · seized (6) ── */
  T["irshad+seized"] = function (B) {
    return class extends B {
      WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      _irCanWrite() {
        return this.PC("add") || this.PC("edit") || this.PC("del") || this.PC("approve");
      }
      _irPermVals() {
        const t = this._irCanWrite();
        return {
          irPmAdd: this.PC("add"),
          irPmEdit: this.PC("edit"),
          irPmDel: this.PC("del"),
          irPmApprove: this.PC("approve"),
          irPmExport: this.PC("export"),
          irPmWrite: t,
          irPmReadOnly: !t,
          irPmNoteStyle:
            "display:flex;align-items:center;gap:8px;padding:9px 14px;border-radius:12px;background:var(--bg-a1001161390p06);border:1px solid var(--bd-a1001161390p22);font-size:11.5px;font-weight:600;color:var(--fg-x475569);line-height:1.8",
        };
      }
      irActor() {
        try {
          if (KIVO.BassamAuth && KIVO.BassamAuth.display) {
            const t = KIVO.BassamAuth.display();
            if (t && t.name) return t.name;
          }
        } catch (t) {}
        return "—";
      }
      loadEmployeesIr() {
        try {
          const t = KIVO.__BS_SRV.operations.text("bassam_employees_v1"),
            e = t ? JSON.parse(t) : [];
          return Array.isArray(e) ? e : [];
        } catch (t) {
          return [];
        }
      }
      loadShiftOptsIr() {
        try {
          const t = KIVO.__BS_SRV.operations.text("bassam_shift_options_v1");
          if (t) {
            const e = JSON.parse(t);
            if (Array.isArray(e) && e.length && e.every((t) => t && t.name)) return e;
          }
        } catch (t) {}
        return [{ name: "الوردية الأولى" }, { name: "الوردية الثانية" }, { name: "الوردية الثالثة" }, { name: "الوردية الرابعة" }];
      }
    };
  };
  /* ── plan · staff (3) ── */
  T["plan+staff"] = function (B) {
    return class extends B {
      curHijri() {
        try {
          const t = new Date();
          return {
            y: parseInt(new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { year: "numeric" }).format(t)),
            m: parseInt(new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { month: "numeric" }).format(t)),
          };
        } catch (t) {
          const e = KIVO.BassamHijri ? KIVO.BassamHijri.now() : { y: 1448, m: 2, d: 1 };
          return { y: e.y, m: e.m };
        }
      }
      gregOf(t, e) {
        return this.hGregMonthLabel(t, e + 1);
      }
      gregYearRange(t) {
        return this.hGregYearRange(t);
      }
    };
  };
  var memo = new Map();
  /* base(DCLogic, سمات) ⇒ صنفٌ أساس: DCLogic ثم السماتُ بترتيبها (لا اسمَ يتكرّر بين سمات وحدةٍ واحدة — مُثبَتٌ عند التوليد) */
  function base(DCLogic, names) {
    var k = names.join("|"),
      hit = memo.get(DCLogic);
    if (!hit) {
      hit = new Map();
      memo.set(DCLogic, hit);
    }
    if (hit.has(k)) return hit.get(k);
    var C = DCLogic;
    for (var i = 0; i < names.length; i++) {
      var f = T[names[i]];
      if (!f) throw new Error("BassamPageKit: سمةٌ مجهولة " + names[i]);
      C = f(C);
    }
    hit.set(k, C);
    return C;
  }
  KIVO.BassamPageKit = {
    base: base,
  };
})();
