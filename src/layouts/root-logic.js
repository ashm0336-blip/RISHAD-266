
class Component extends DCLogic {
  /* حالةُ الزينة (شريطٌ، تنبيهٌ، جرس، حوارُ النسخ) لا تعني الصفحاتَ في شيء —
     فلا تُعاد حساباتُها؛ وأيُّ مفتاحٍ آخر (الصفحةُ النشطة، السمة، tick) يرفع
     نسخةَ العالم فتُعاد كما كانت. المُحدِّثُ الدالّيُّ يُعامَل بحذرٍ: يرفعها. */
  setState(u, cb) {
    try {
      const CH = { sidebarOpen: 1, toast: 1, deptOpen: 1, deptNodeOpen: 1, nfOpen: 1, nfToast: 1, nfTick: 1, nfKinds: 1, nfFilt: 1, nfCompose: 1, bkConf: 1, bkStep: 1, navPending: 1 };
      let bump = true;
      if (u && typeof u === "object") { bump = false; for (const k in u) if (!CH[k]) { bump = true; break; } }
      if (bump) KIVO.__dcWorld = (KIVO.__dcWorld || 0) + 1;
      if (u && typeof u === "object" && "sidebarOpen" in u && u.sidebarOpen !== this.state.sidebarOpen) { this.__sbToggled = true; try { KIVO.__bsQuiet && KIVO.__bsQuiet(380); } catch (e) {} }
      /* التنقّلُ على مرحلتين: أولاً استجابةٌ مرئيةٌ فوريّة (تظليلُ الوجهة، إفراغُ
         المحتوى)، ثم — بعد أن يرسم المتصفحُ — تركيبُ الصفحة الجديدة في transition
         مُقطَّعٍ لا يحجب الخيط. كان التركيبُ كلُّه يقع داخل مهمّة النقر نفسِها. */
      if (u && typeof u === "object" && "active" in u && u.active !== this.state.active && !("navPending" in u)) {
        /* المرحلةُ الأولى تُفرَّغ تزامنياً مهما كان مصدرُ الأمر (نقرةٌ أو نداءٌ برمجيّ)
           — فالاستجابةُ المرئية في الإطار نفسِه لا في مهمّةٍ لاحقة */
        const RD = window.ReactDOM;
        const p1 = () => super.setState({ ...u, navPending: true });
        if (RD && typeof RD.flushSync === "function") { try { RD.flushSync(p1); } catch (e) { p1(); } } else p1();
        const tok = this.__navTok = (this.__navTok || 0) + 1;
        const mount = () => {
          if (this.__navTok !== tok) return;
          const run = () => super.setState({ navPending: false }, () => {
            /* بعد تركيب الصفحة الجديدة: تمرّةٌ كاملةٌ واحدةٌ لشبكات الأمان البصرية (في فراغ الخيط) */
            try { requestAnimationFrame(() => setTimeout(() => { try { KIVO.__bsTick && KIVO.__bsTick.mark(); } catch (e) {} }, 0)); } catch (e) {}
            if (typeof cb === "function") cb();
          });
          const R = window.React;
          if (R && typeof R.startTransition === "function") R.startTransition(run); else run();
        };
        requestAnimationFrame(() => setTimeout(mount, 0));
        return;
      }
    } catch (e) {}
    return super.setState(u, cb);
  }
  /* آخر صفحة مفتوحة تُستعاد بعد التحديث بدل العودة للنبض دائماً — تُحفظ لكل
     إدارة على حدة، ولا تُستعاد صفحة لا يملك المستخدم صلاحيتها. */
  /* ═══ عنوان لكل صفحة: #/<مفتاح التنقل> ═══
     الصيغة تحتمل ذيلاً #/page/tab يُهمَل الآن (تبويبات الصفحات الداخلية تُبنى في المصدر).
     القراءة من العنوان تمرّ بالحرّاس أنفسهم الذين تمرّ بهم الصفحة المحفوظة (_pageAllowed) —
     فلا يفتح رابطٌ صفحةً بلا صلاحية، ويرتدّ للافتراضية ويُصحَّح العنوان. */
  _hashKey() {
    try { const m = /^#\/([a-z]+)/i.exec(String(location.hash || "")); return m ? m[1].toLowerCase() : ""; } catch (e) { return ""; }
  }
  _hashTab() {
    try { const m = /^#\/[a-z]+\/([a-z]+)/i.exec(String(location.hash || "")); return m ? m[1].toLowerCase() : ""; } catch (e) { return ""; }
  }
  /* ذيل العنوان لصفحتَي الإعدادات ومدير النظام يُمرَّر لصفحة الإعدادات عبر خطّافيها (القائم __ADMIN_OPEN_TAB والجديد __ADMIN_OPEN_DTAB) */
  _applyHashTab(key) {
    try { const t = this._hashTab(); if (!t) return; if (key === "sysadmin") KIVO.__ADMIN_OPEN_TAB = t; else if (key === "admin") KIVO.__ADMIN_OPEN_DTAB = t; else KIVO.__BS_OPEN_TAB = { page: key, tab: t }; } catch (e) {}
  }
  _hashWrite(key, push) {
    try {
      if (!key || this._hashKey() === key) return;
      const url = location.pathname + location.search + "#/" + key;
      if (push && history.pushState) history.pushState(null, "", url); else if (history.replaceState) history.replaceState(null, "", url); else location.hash = "#/" + key;
    } catch (e) {}
  }
  /* يعيد مفتاح الصفحة إن كانت متاحة لصاحب الجلسة (ويضبط نمط الإعدادات)، وإلا "" */
  _pageAllowed(v) {
    try {
      if (!v) return "";
      /* الخريطة تُشتقّ من سجل الصفحات — «الشخصية» و«مدير النظام» خارجه بحكم طبيعتهما،
         و«مؤشرات الإدارة» حاوية عرض في سجل الحاويات: تُفتح لمن ملك ورقةً من أوراقها الستّ */
      const OK = Object.assign({ profile: null, sysadmin: null, kpis: null }, (KIVO.BassamPerm && KIVO.BassamPerm.NAV2PERM) || {});
      if (!(v in OK)) return "";
      const sup = !!(KIVO.BassamAuth && KIVO.BassamAuth.isSuper && KIVO.BassamAuth.isSuper());
      if (v === "help" && sup) return v;
      if (v === "kpis") {
        const P = KIVO.BassamPerm; if (!P || sup) return v;
        const ok = ((KIVO.BassamPerm && KIVO.BassamPerm.navLeaves) ? KIVO.BassamPerm.navLeaves("kpis") : [["planning","readiness"],["daily","kpiDaily"],["daily","kpiOcc"],["daily","kpiZones"],["seized","dash"],["irshad","dash"]])
          .some(x => P.kpiPanelOk ? P.kpiPanelOk(x[0], x[1]) : (P.canSub ? P.canSub(x[0], x[1], "view") : true));
        return ok ? v : "";
      }
      const pk = OK[v];
      if (pk && !(v === "admin" && sup) && KIVO.BassamPerm && !KIVO.BassamPerm.can(pk, "view")) return "";
      if (v === "sysadmin" && !sup) return "";
      if (v === "sysadmin") KIVO.__ADMIN_MODE = "site";
      if (v === "admin") KIVO.__ADMIN_MODE = "dept";
      return v;
    } catch (e) { return ""; }
  }
  _loadPage() {
    try {
      /* المرتدّ: أول صفحة متاحة فعلاً، وإلا «الشخصية» — كان يرتدّ إلى «الموظفين»
         فيهبط صاحب السقف الفارغ على صفحة لا يملكها. */
      const FB = () => {
        try {
          const P = KIVO.BassamPerm;
          if (P && P.visiblePages) { const vis = P.visiblePages(); if (vis.length) {const first=vis.map(k=>P.PERM2NAV[k]).find(k=>k && k!=="help" && this._pageAllowed(k));if(first)return first;} }
        } catch (e1) {}
        return "profile";
      };
      /* عنوانٌ صالح ومسموح يغلب الصفحة المحفوظة وهبوط أول دخول — فمن فتح رابطاً وسجّل دخوله وصل إلى مقصده */
      const hk = this._pageAllowed(this._hashKey());
      if (hk === "help") this._helpRequested=true;
      if (hk && hk !== "help") { try { const RAWH = KIVO.__BS_RAWLS; if (RAWH && RAWH.getItem.call(localStorage, "bassam_fresh_login_v1") === "1") RAWH.removeItem.call(localStorage, "bassam_fresh_login_v1"); } catch (eh) {} this._applyHashTab(hk); return hk; }
      /* بطلب المستخدم: كل تسجيل دخول جديد يهبط على «الصفحة الشخصية» — فهي
         الصفحة المضمونة لكل حساب مهما كانت صلاحياته. الراية تُزرع لحظة نجاح
         الدخول وتُستهلك مرة واحدة، فلا يتأثر إعادة التحميل العادي (تبديل الإدارة). */
      try {
        const RAWX = KIVO.__BS_RAWLS;
        if (RAWX && RAWX.getItem.call(localStorage, "bassam_fresh_login_v1") === "1") {
          RAWX.removeItem.call(localStorage, "bassam_fresh_login_v1");
          /* مدير النظام يهبط بعد الدخول على «مدير النظام ← نظرة عامة» (وفي النسخة المحلية حيث لا نظرة عامة يفتح أول تبويب متاح) — وسواه على «صفحتي» */
          try { if (KIVO.BassamAuth && KIVO.BassamAuth.isSuper && KIVO.BassamAuth.isSuper()) { KIVO.__ADMIN_MODE = "site"; KIVO.__ADMIN_OPEN_TAB = "overview"; return "sysadmin"; } } catch(e2) { /* لا يمنع العرض — يُتجاوز بصمت */ }
          return "profile";
        }
      } catch (e0) {}
      const D = KIVO.BassamDepts;
      const k = "bassam_page_v1:" + ((D && D.active && D.active()) || "-");
      const v = localStorage.getItem(k);
      const saved=this._pageAllowed(v);
      if (saved === "help") {this._helpRequested=true;localStorage.removeItem(k);}
      return (saved && saved !== "help" ? saved : "") || FB();
    } catch (e) { return "profile"; }
  }
  /* Help is the existing platform dialog, never a page/component placeholder.
     Consume the direct hash over an authorized background page. Closing or
     reloading then leaves that page intact; re-entering #/help opens it again. */
  _openHelpRoute() {
    const A=KIVO.BassamAuth, P=KIVO.BassamPlat;
    if (!A || !A.user || !A.user() || this._pageAllowed("help") !== "help" || !P || typeof P.openAbout !== "function") {
      this._hashWrite(this.state.active || "profile",false); return false;
    }
    let background=this._pageAllowed(this.state.active);
    if (!background || background === "help") background="profile";
    if (background !== this.state.active) this.setState({active:background});
    this._hashWrite(background,false);
    P.openAbout();
    return true;
  }
  /* «تبويبُ العنوان يغلب» (R183): الحالةُ المحفوظة تُزرع عند إنشاء الصفحة (_viewSeed)، ثم يقرأ _bsHR في الصفحة تبويبَ العنوان
     أو الطلبَ الصريح (الجرس، مؤشّرُ الاتصال: __BS_OPEN_TAB) في أول رسمٍ نفسِه — فيغلب المحفوظَ بلا حارسٍ بعد الرسم */
  _savePage(k2) {
    try { if (k2 !== this.state.active) this._viewCapture(); } catch (e) {}     /* موضعُ الصفحة المغادَرة يُحفظ محلّياً */
    try {
      const D = KIVO.BassamDepts;
      localStorage.setItem("bassam_page_v1:" + ((D && D.active && D.active()) || "-"), String(k2 || ""));
    } catch (e) {}
    /* كل انتقال يمرّ من هنا — فيُدفع عنواناً جديداً ويعمل زر الرجوع بين الصفحات */
    this._hashWrite(k2, true);
  }
  /* الإغلاق التلقائي: القائمة الجانبية تنطوي حين تصغر الشاشة إلى نطاق الدرج
     (≤1024)، فلا تبقى مفتوحةً تحجب المحتوى. تُرصد اللحظة التي تُعبَر فيها
     العتبة نزولاً فقط — فلا نفرض حالةً على المستخدم في الشاشات الكبيرة. */
  componentDidMount() {
    /* R3: هيكلُ الإقلاع الثابت (#bs-boot في القالب) يُزال مع أول تركيبٍ للإطار — في الإيداع نفسِه قبل الرسم */
    try { const bb = document.getElementById("bs-boot"); if (bb) bb.remove(); } catch(e) { /* لا يمنع العرض — يُتجاوز بصمت */ }
    try {
      this._wasNarrow = (typeof window !== "undefined" && window.innerWidth <= 1024);
      if (this._wasNarrow && this.state.sidebarOpen) this.setState({ sidebarOpen: false });
      this._onResizeSB = () => {
        const narrow = window.innerWidth <= 1024;
        if (narrow && !this._wasNarrow && this.state.sidebarOpen) this.setState({ sidebarOpen: false });
        this._wasNarrow = narrow;
      };
      window.addEventListener("resize", this._onResizeSB);
      /* ═══ العنوان: الرجوع/التقدّم أو رابطٌ ملصوق → نفس حرّاس الصفحة المحفوظة ═══ */
      this._hashWrite(this.state.active, false);
      this._onHash = () => { try {
        const k = this._hashKey(); if (!k) return;
        if (k === this.state.active) { this._applyHashTab(k); this.setState({ hashTick: Date.now() }); return; }
        const ok = this._pageAllowed(k);
        if (!ok) { this._hashWrite(this.state.active, false); return; }
        if (ok === "help") {this._openHelpRoute();return;}
        this._applyHashTab(ok);
        this._savePage(ok);                                   /* يلتقط موضعَ الصفحة المغادَرة */
        const drawer = (typeof window !== "undefined" && window.innerWidth <= 1024);
        this.setState(drawer ? { active: ok, sidebarOpen: false } : { active: ok });
      } catch (e) {} };
      window.addEventListener("hashchange", this._onHash);
      /* Escape: حوارُ التأكيد أولاً، وإلا أعلى طبقةِ حوارٍ/قائمةٍ ملءَ الشاشة تُغلَق بالنقر خارجَ بطاقتها — نقرٌ صناعيٌّ على الطبقة نفسها */
      this._escDismiss = () => {
        try {
          const W = innerWidth, H = innerHeight; let best = null, bestZ = -1, order = 0;
          for (const el of document.querySelectorAll('main *, body > *')) {
            if (el === document.body || el.id === 'bsLoginGate' || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
            const cs = getComputedStyle(el); if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none') continue;
            const r = el.getBoundingClientRect(); if (r.width < W * 0.9 || r.height < H * 0.9) continue;
            let hasClick = false; for (const k in el) { if (k.indexOf('__reactProps$') === 0) { const pr = el[k]; hasClick = !!(pr && typeof pr.onClick === 'function'); break; } }
            if (!hasClick) continue;
            const z = parseInt(cs.zIndex, 10) || 0; order++;
            if (z > bestZ || (z === bestZ && best)) { bestZ = z; best = el; }
          }
          if (!best) return false;
          best.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          return true;
        } catch (e) { return false; }
      };
      /* القوائمُ المنسدلة بلا طبقةِ التقاط (قوائمُ الصفوف، الفلاتر، الجرس): تُغلق بالنقر خارجَها — فـEscape نقرةٌ صناعيّةٌ على body (خارجَ كلِّ شيء) */
      this._escMenus = () => { try { document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })); return true; } catch (e) { return false; } };
      /* مديرُ تركيز الحوارات: أعلى طبقةٍ ثابتةٍ ملءَ الشاشة الآن (بلا شرطِ معالجِ نقر) */
      this._ovClassRe = /(^|\s)(pf-ov|fd-ov|mbk|bs-plat-ov|tkf-ov)(\s|$)/;   /* الموجة 2 · DG-11: tkf-ov نافذةُ «مهمة جديدة» (موضعُها في CSS) */
      /* مرشَّحُ طبقةٍ (بلا أنماطٍ محسوبة): inline fixed بأطرافٍ أربعةٍ صفرٍ، أو صنفُ طبقةٍ معروف */
      this._ovCand = (el) => { try { const st = el.style; if (st && st.position === 'fixed' && st.top === '0px' && st.left === '0px' && st.right === '0px' && st.bottom === '0px') return true; const cn = el.className; return typeof cn === 'string' && this._ovClassRe.test(cn); } catch (e) { return false; } };
      this._topOverlay = () => {
        try {
          const W = innerWidth, H = innerHeight; let best = null, bestZ = -1;
          for (const el of document.querySelectorAll('main *, body > *')) {
            if (el === document.body || el.id === 'bsLoginGate' || el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.id === 'bs-toast' || el.id === 'bs-syncnote' || (el.classList && el.classList.contains('login-screen'))) continue;
            if (!this._ovCand(el)) continue;   /* لا getComputedStyle إلا لمرشَّحٍ حقيقيّ */
            const cs = getComputedStyle(el); if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none') continue;
            const r = el.getBoundingClientRect(); if (r.width < W * 0.9 || r.height < H * 0.9) continue;
            const z = parseInt(cs.zIndex, 10) || 0; if (z >= bestZ) { bestZ = z; best = el; }
          }
          return best;
        } catch (e) { return null; }
      };
      this._focusables = (root) => { try { return [...root.querySelectorAll('input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }); } catch (e) { return []; } };
      this._dlgStack = [];
      this._dlgTick = () => {
        this._dlgT = 0;
        try {
          const top = this._topOverlay();
          const cur = this._dlgStack.length ? this._dlgStack[this._dlgStack.length - 1] : null;
          if (top && (!cur || cur.el !== top)) {
            /* حوارٌ جديد: يُحفظ صاحبُ التركيز، ويُوضع التركيزُ داخلَه إن لم يضعه الحوارُ نفسُه */
            const prev = (cur && cur.el.contains(document.activeElement)) ? cur.prev : document.activeElement;
            this._dlgStack = this._dlgStack.filter(d => document.contains(d.el)); this._dlgStack.push({ el: top, prev });
            if (!top.contains(document.activeElement)) {
              const f = this._focusables(top);
              const pick = top.querySelector('[autofocus]') || f.find(el => /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) || f.find(el => el.tagName === 'BUTTON' && !/حذف|مسح|إزالة|تهيئة/.test(el.textContent || '')) || f[0];
              if (pick) { try { pick.focus({ preventScroll: true }); } catch (e) { try { pick.focus(); } catch (e2) {} } }
            }
          } else if (!top && cur) {
            /* زال الحوارُ: التركيزُ يعود لصاحبه إن ضاع (على body) وكان ما يزال في الصفحة */
            const st = this._dlgStack; this._dlgStack = [];
            const ae = document.activeElement;
            if ((!ae || ae === document.body) && cur.prev && cur.prev.focus && document.contains(cur.prev) && cur.prev !== document.body) { try { cur.prev.focus({ preventScroll: true }); } catch (e) {} }
            void st;
          } else if (top && cur && cur.el === top) { /* كما هو */ }
        } catch (e) {}
      };
      try {
        /* مرشّحٌ رخيص: لا يُفحص المشهدُ كاملاً إلا حين تُضاف/تُزال عقدةٌ تبدو طبقةَ حوار (نمطٌ مضمَّن fixed أو صنفُ طبقةٍ معروف) */
        const OVC = this._ovClassRe;
        /* «تبدو طبقةَ حوار» = ثابتةُ الموضع ملءَ الشاشة (inset:0 أو الأطرافُ الأربعة 0) أو صنفُ طبقةٍ معروف — لا التلميحاتُ ولا التوستُ ولا أشرطةُ الحالة */
        const looksOv = (n) => { if (!n || n.nodeType !== 1) return false; if (this._ovCand(n)) return true; const c = n.firstElementChild; return !!(c && this._ovCand(c)); };
        this._dlgMO = new MutationObserver((muts) => {
          let hit = false;
          for (let i = 0; i < muts.length && !hit; i++) { const m = muts[i]; for (let j = 0; j < m.addedNodes.length; j++) if (looksOv(m.addedNodes[j])) { hit = true; break; } if (!hit) for (let j = 0; j < m.removedNodes.length; j++) { const n = m.removedNodes[j]; if (looksOv(n) || (n.nodeType === 1 && this._dlgStack.some(d => d.el === n || n.contains(d.el)))) { hit = true; break; } } }
          if (hit && !this._dlgT) this._dlgT = setTimeout(this._dlgTick, 40);
        });
        this._dlgMO.observe(document.body, { childList: true, subtree: true });
      } catch (e) {}
      this._onKeyAny = (ev) => { this._lastKeyAt = Date.now(); try {
        if (!ev || ev.isComposing) return;
        if (ev.key === "Escape") {
          if (this.state.cfm) { ev.preventDefault(); ev.stopPropagation(); this.cfmClose(false); }
          else if (!ev.defaultPrevented) { if (this._escDismiss()) ev.preventDefault(); else this._escMenus(); }
        } else if (ev.key === "Tab") {
          /* Tab داخل حوارٍ مفتوح لا يخرج منه */
          const top = this._topOverlay(); if (!top) return;
          const f = this._focusables(top); if (!f.length) return;
          const i = f.indexOf(document.activeElement);
          if (i === -1) { ev.preventDefault(); f[0].focus(); }
          else if (!ev.shiftKey && i === f.length - 1) { ev.preventDefault(); f[0].focus(); }
          else if (ev.shiftKey && i === 0) { ev.preventDefault(); f[f.length - 1].focus(); }
        }
      } catch (e) {} }; document.addEventListener("keydown", this._onKeyAny, true);
      KIVO.BassamConfirm = (o) => this.cfmAsk(o);
      /* استعادةُ الموضع: المتصفحُ لا يتدخّل في التمرير، ونلتقط الموضعَ قبل التحديث/الإغلاق/إخفاء التبويب */
      try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch (e) {}
      this._onViewSave = () => { try { this._viewCapture(); } catch (e) {} };
      window.addEventListener("pagehide", this._onViewSave); window.addEventListener("beforeunload", this._onViewSave);
      document.addEventListener("visibilitychange", () => { if (document.hidden) this._onViewSave(); });
      this._viewRestore(this.state.active, 0);
      /* ═══ التحديث الحي: تعديلات الزملاء تصل من الخادم فتُعاد قراءة الشاشة تلقائياً — بلا إعادة تحميل ولا إعادة تركيب ═══
         الصفحات التي تستمع بنفسها (المتابعة اليومية، التقرير اليومي، المهام) تتحدّث في مكانها؛ والباقي يُحدَّث
         بالمفتاح: خطّاف _bsLiveReload لمن يحمل بياناته في حالته، ثم رسمٌ خفيفٌ واحد يمرّ عبر shouldComponentUpdate —
         ولا يُقاطَع المستخدم وهو يكتب أو أمام نافذة: يُؤجَّل حتى يفرغ. */
      this._onRemote = (ev) => { try { const ks = (ev.detail && ev.detail.keys) || []; if (this._permKeys(ks)) this._permsChanged(); else this._liveQueue(ks); } catch (e) {} };
      window.addEventListener("bassam:remote", this._onRemote);
      /* ═══ الجرس: تنبيه محلي (أوقعته أنا) أو وارد من الخادم ═══ */
      this._onNotif = (ev) => { try {
        if (ev && ev.detail && (ev.detail.initial || ev.detail.more || ev.detail.queryChanged)) (KIVO.BassamNotif ? KIVO.BassamNotif.list() : []).forEach(x=>{this._nfKnown[x.id]=1;});
        this._nfRefresh(!(ev && ev.detail && (ev.detail.initial || ev.detail.more || ev.detail.queryChanged)));
      } catch (e) {} };
      window.addEventListener("bassam:notif", this._onNotif);
      this._onNotifError = (ev) => {
        if (Date.now() - (this._nfErrorAt || 0) < 10000) return;
        this._nfErrorAt = Date.now();
        this.setState({ toast: (ev && ev.detail && ev.detail.message) || "تعذّر تحديث التنبيهات" });
        clearTimeout(this._toastTimer); this._toastTimer = setTimeout(() => this.setState({ toast:"" }),4000);
      };
      window.addEventListener("bassam:notif-error",this._onNotifError);
      this._nfKnown = {}; try { (KIVO.BassamNotif ? KIVO.BassamNotif.list() : []).forEach(x => { this._nfKnown[x.id] = 1; }); } catch (e) {}
      this._nfDocClick = (ev) => { try { if (this.state.nfOpen && !ev.target.closest("[data-bs-nf]")) this.setState({ nfOpen: false }); } catch (e) {} };
      document.addEventListener("click", this._nfDocClick);
      if (this._helpRequested) {this._helpRequested=false;setTimeout(()=>this._openHelpRoute(),0);}
    } catch (e) {}
  }
  componentWillUnmount() {
    try { if (this._onResizeSB) window.removeEventListener("resize", this._onResizeSB); } catch (e) {}
    try { if (this._onHash) window.removeEventListener("hashchange", this._onHash); } catch (e) {}
    try { if (this._onKeyAny) document.removeEventListener("keydown", this._onKeyAny, true); } catch (e) {}
    try { if (this._dlgMO) this._dlgMO.disconnect(); clearTimeout(this._dlgT); } catch (e) {}
    try { if (this._onViewSave) { window.removeEventListener("pagehide", this._onViewSave); window.removeEventListener("beforeunload", this._onViewSave); } } catch (e) {}
    try { if (this._onRemote) window.removeEventListener("bassam:remote", this._onRemote); } catch (e) {}
    try { if (this._onNotif) window.removeEventListener("bassam:notif", this._onNotif); if (this._onNotifError) window.removeEventListener("bassam:notif-error",this._onNotifError); if (this._nfDocClick) document.removeEventListener("click", this._nfDocClick); } catch (e) {}
    clearTimeout(this._nfToastT); clearTimeout(this._nfAnnT);
    clearTimeout(this._liveT);
  }
  /* ═══ الصلاحيات لحظياً: تغيير الصلاحيات/الحسابات/الإدارات/السقف يصل من الخادم فيُطبَّق فوراً بلا تحديث ═══
     - الحساب نفسه جُمّد أو حُذف → إنهاء الجلسة برسالة سبب (الطبقة الثالثة)
     - الصفحة الحالية سُحبت → نقلٌ فوري إلى «صفحتي» مع تنبيه (الطبقة الثانية)
     - غير ذلك → القائمة الجانبية والصفحة تُعاد قراءتها في مكانها (الطبقة الأولى) */
  /* ═══ الجرس ═══ */
  _nfRefresh(announce) {
    const NF = KIVO.BassamNotif; if (!NF) return;
    let fresh = [];
    try { const L = NF.list(); L.forEach(x => { if (!this._nfKnown[x.id]) { if (announce || !x.un) this._nfKnown[x.id] = 1; if (x.un) fresh.push(x); } }); } catch (e) {}
    this.setState({ nfTick: (this.state.nfTick || 0) + 1 });
    /* وصل جديد عبر حدث تخزين (يسبق bassam:remote عادةً): نعلنه بعد لحظة إن لم يُعلن */
    if (!announce) { if (fresh.length) { clearTimeout(this._nfAnnT); this._nfAnnT = setTimeout(() => { try { this._nfRefresh(true); } catch (e) {} }, 250); } return; }
    if (!fresh.length) return;
    /* توست فوري: للقناة «توست» — والعاجل دائماً؛ الكتم يخصّ غير العاجل */
    const mute = NF.muteGet();
    const cand = fresh.filter(x => x.chan === "toast" || x.lvl === "urg" || x.isBc || x.bcDept).filter(x => x.lvl === "urg" || !mute);
    if (!cand.length) return;
    const x = cand.sort((a, b) => (b.lvl === "urg" ? 1 : 0) - (a.lvl === "urg" ? 1 : 0))[0];
    this.setState({ nfToast: { id: x.id, t: x.t, b: x.b, urg: x.lvl === "urg", go: x.ack && !x.acked ? "قرأت وفهمت" : (x.go || ""), n: cand.length } });
    clearTimeout(this._nfToastT); this._nfToastT = setTimeout(() => this.setState({ nfToast: null }), x.lvl === "urg" ? 9000 : 5000);
  }
  async _nfWork(run) {
    try {
      const result = await run();
      if (!result || result.ok !== 1) {
        this.setState({toast:(result && result.err) || "تعذّر تأكيد التغيير — حاول مجددًا"});
        clearTimeout(this._toastTimer); this._toastTimer=setTimeout(()=>this.setState({toast:""}),4000);
        return null;
      }
      this._nfRefresh(false);
      return result;
    } catch (e) { this.setState({toast:"تعذّر الاتصال بخادم التنبيهات"}); return null; }
  }
  async _nfOpenItem(x) {
    const NF=KIVO.BassamNotif; if (!NF) return;
    const required = x.ack && !x.acked;
    const result = await this._nfWork(()=>required ? NF.ack(x.id) : NF.markRead(x.id));
    if (!result) return;
    if (required) { this.setState({nfToast:null,toast:"سُجّل تأكيد قراءتك للتعميم"}); clearTimeout(this._toastTimer); this._toastTimer=setTimeout(()=>this.setState({toast:""}),2500); return; }
    const nav = x.go && (!NF.goOk || NF.goOk(x)) ? (NF.GO_NAV[x.go] || "") : "";   /* R183: لا انتقالَ إلى صفحةٍ لا تُفتح لك */
    if (nav) { this.setState({ nfOpen: false, nfToast: null }); if (nav === "sysadmin") { if (KIVO.BassamAuth && KIVO.BassamAuth.isSuper && KIVO.BassamAuth.isSuper()) { KIVO.__ADMIN_MODE = "site"; KIVO.__ADMIN_OPEN_TAB = x.go === "المنصة" ? "plat" : "sec"; this._savePage("sysadmin"); this.setState({ active: "sysadmin" }); } return; } if (nav === "help") { try { KIVO.BassamPlat.openAbout(); } catch (e) {} return; } if (nav === "admin") { KIVO.__ADMIN_MODE = "dept"; this._savePage("admin"); this.setState({ active: "admin" }); return; } try { KIVO.BassamNav.go(nav); } catch (e) {} }
  }
  _nfReload(patch) {
    this.setState(patch || {},()=>{
      const N=KIVO.BassamNotif,s=this.state;
      if(N)this._nfWork(()=>N.refresh({all:!!s.nfAllDepts,filter:s.nfFilt || "all",kinds:Object.keys(s.nfKinds || {}).filter(k=>s.nfKinds[k])}));
    });
  }
  _nfVals() {
    const NF = KIVO.BassamNotif; const s = this.state;
    if (!NF) return { nfOn: false, nfCount: "", nfHas: false, nfOpen: false, nfToastOn: false };
    /* R183 (الخيار ٣): مديرُ النظام — الإدارةُ النشطة وتنبيهاتُ المنصة، وشارةُ «كل الإدارات (ن)» تعرض الكل */
    const allD = !!s.nfAllDepts;
    let L = []; try { L = NF.list({ all: allD }); } catch (e) { L = []; }
    const status=NF.status(),counters=status.counters || {total:0,unread:0,actionable:0,urgentUnread:0,unreadAll:0,byKind:{}};
    const un=counters.unread,act=counters.actionable,urg=counters.urgentUnread;
    const filt = s.nfFilt || "all"; const kf = s.nfKinds || {}; const anyK = Object.keys(kf).some(k => kf[k]);
    let V = L.slice(); if (filt === "act") V = V.filter(x => x.lvl !== "info" || (x.ack && !x.acked)); if (filt === "un") V = V.filter(x => x.un); if (anyK) V = V.filter(x => kf[x.k]);
    const now = Date.now(), M = 60000, H = 3600000;
    const ago = (t) => { const d = now - t; if (d < M) return "الآن"; if (d < H) return "قبل " + KIVO.BassamCount(Math.round(d / M),"دقيقة","g") + ""; if (d < 24 * H) { const h = Math.round(d / H); return "قبل " + KIVO.BassamCount(h,"ساعة","g"); } if (d < 48 * H) return "أمس"; return "قبل " + KIVO.BassamCount(Math.round(d / (24 * H)),"يوم","g") + ""; };
    const grpOf = (x) => (x.pin && x.un) ? "مثبّت" : ((now - x.at) < 24 * H ? "اليوم" : (now - x.at) < 48 * H ? "أمس" : "الأقدم");
    const rows = []; let g = "";
    V.forEach(x => { const gg = grpOf(x); if (gg !== g) { g = gg; rows.push({ key: "g:" + gg, isGrp: true, isItem: false, name: gg }); }
      const c = NF.KC[x.k] || "#475569";
      rows.push({ key: x.id, isGrp: false, isItem: true, t: x.t, b: x.b, at: ago(x.at), un: x.un, isUrg: x.lvl === "urg", isAct: x.lvl === "act", go: x.go, hasGo: !!x.go && !(x.ack && !x.acked) && (!NF.goOk || NF.goOk(x)), needAck: !!(x.ack && !x.acked), icoPath: NF.KI[x.k] || NF.KI.sys, icoStyle: "width:34px;height:34px;border-radius:11px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border:1px solid " + c + "33;background:" + c + "14;color:" + c,
        rowStyle: "display:flex;gap:11px;padding:12px 14px 12px 12px;border-bottom:1px solid var(--bd-xf1f3f5);position:relative;cursor:pointer;" + (x.un ? "background:var(--bg-a185151810p05);" : "") + (x.pin && x.un ? "border-right:3px solid var(--bd-xb99751);" : ""),
        dotStyle: "position:absolute;right:5px;top:19px;width:6px;height:6px;border-radius:50%;background:var(--bg-xb99751);" + (x.un ? "" : "display:none"),
        deptName: x.deptName || "", hasDept: !!x.deptName, canDel: !(x.ack && !x.acked), open: () => this._nfOpenItem(x), del: (ev) => { if (ev && ev.stopPropagation) ev.stopPropagation(); this._nfWork(()=>NF.dismiss(x.id)); } }); });
    const kinds=Object.keys(counters.byKind).map(k=>({key:k,name:NF.KN[k] || k,style:"font-size:10px;font-weight:600;padding:2px 9px;border-radius:9999px;cursor:pointer;border:1px solid " + (kf[k] ? "rgba(14,116,144,.4);background:var(--bg-a141161440p07);color:var(--fg-x0e7490)" : "#e2e8f0;background:var(--bg-xffffff);color:var(--fg-x94a3b8)"),toggle:()=>this._nfReload({nfKinds:{...(this.state.nfKinds || {}),[k]:!(this.state.nfKinds || {})[k]}})}));
    const seg = (on) => "flex:1;text-align:center;padding:5px 0;border-radius:8px;font-size:10.5px;font-weight:700;cursor:pointer;" + (on ? "background:var(--bg-xffffff);color:var(--fg-x8a6f35);box-shadow:var(--shadow-card)" : "color:var(--fg-x94a3b8)");
    const u = KIVO.BassamAuth && KIVO.BassamAuth.user ? KIVO.BassamAuth.user() : null;
    const isMgr = !!(u && (u.role === "dept" || u.role === "gm" || (u.role === "staff" && u.mgr)));
    const isSup9 = !!(u && u.role === "super"); let nD = 0, hidN = 0;
    if (isSup9) { try { nD = (KIVO.BassamDepts.list() || []).length; hidN = allD ? 0 : Math.max(0, counters.unreadAll - un); } catch (e) {} }
    const adName = (() => { try { return KIVO.BassamDepts.activeName() || ""; } catch (e) { return ""; } })();
    const cp = s.nfCompose || null;
    const tt = s.nfToast || null;
    return {
      nfOn: true, nfCount: un ? String(un) : "", nfHas: un > 0, nfUrg: urg > 0, nfOpen: !!s.nfOpen, nfEmpty: status.ready && !status.loading && rows.length === 0,
      nfHasMore:!!status.next,nfMore:()=>this._nfWork(()=>NF.loadMore()),nfMoreLabel:status.loading ? "جارٍ التحميل…" : "عرض تنبيهات أقدم",
      nfNoticeOn:!!(status.hasUpdates || status.loading || status.error),nfNotice:status.hasUpdates ? "وصلت تحديثات جديدة — حدّث القائمة لعرضها" : status.loading ? "جارٍ تحميل التنبيهات…" : status.error,nfRefreshList:()=>this._nfReload(),
      nfBellStyle: "position:relative;width:38px;height:38px;border-radius:10px;background:var(--bg-xffffff);border:1px solid " + (urg ? "rgba(220,38,38,.45);box-shadow:0 0 0 3px rgba(220,38,38,.12)" : (un ? "rgba(185,151,81,.5);box-shadow:0 0 0 3px rgba(185,151,81,.16)" : "rgba(37,52,63,.12)")) + ";display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--fg-x4a5c68);transition:all .15s;padding:0;flex-shrink:0",
      nfToggle: (ev) => { if (ev && ev.stopPropagation) ev.stopPropagation(); const opening=!this.state.nfOpen;this.setState({nfOpen:opening,nfToast:null},()=>{if(opening)this._nfReload();}); },
      nfClose: () => this.setState({ nfOpen: false }),
      nfStop: (ev) => { if (ev && ev.stopPropagation) ev.stopPropagation(); },
      nfAllN: String(counters.total), nfActN: String(act), nfUnN: String(un),
      nfSegAll: seg(filt === "all"), nfSegAct: seg(filt === "act"), nfSegUn: seg(filt === "un"),
      nfFiltAll:()=>this._nfReload({nfFilt:"all"}),nfFiltAct:()=>this._nfReload({nfFilt:"act"}),nfFiltUn:()=>this._nfReload({nfFilt:"un"}),
      nfKindRows: kinds, nfRows: rows,
      nfDeptOn: isSup9 && nD > 1, nfDeptTxt: "كل الإدارات (" + hidN + ")",
      nfDeptTip: allD ? "يعرض تنبيهاتِ كل الإدارات — اضغط للعودة إلى الإدارة النشطة" + (adName ? " «" + adName + "»" : "") : "الجرسُ يعرض الإدارةَ النشطة" + (adName ? " «" + adName + "»" : "") + " وتنبيهاتِ المنصة — اضغط لعرض كل الإدارات (غيرُ المقروء خارجها: " + hidN + ")",
      nfDeptStyle: "font-size:10px;font-weight:600;padding:2px 9px;border-radius:9999px;cursor:pointer;border:1px solid " + (allD ? "rgba(14,116,144,.4);background:var(--bg-a141161440p07);color:var(--fg-x0e7490)" : "#e2e8f0;background:var(--bg-xffffff);color:var(--fg-x94a3b8)"),
      nfDeptToggle:()=>this._nfReload({nfAllDepts:!this.state.nfAllDepts}),
      nfReadAll: () => this._nfWork(()=>NF.markAll({all:allD})),
      nfClearAll: async () => {
        /* R169-CC3: الحذفُ لا يمسّ ما ينتظر تأكيدك — والرسالةُ تقول ذلك صراحةً بدل أن تسكت عنه */
        const result=await this._nfWork(()=>NF.dismissAll(false,{all:allD}));
        if (!result) return;
        const n=Number(result.n)||0, rest=Number((NF.status().counters || {}).pendingAck)||0;
        this._nfRefresh(false);
        /* عربيّةُ العدد: مفردٌ ومثنّى وجمعُ قلّةٍ وتمييزٌ منصوب */
        const delTxt = n === 0 ? "" : n === 1 ? "حُذف تنبيهٌ واحد" : n === 2 ? "حُذف تنبيهان"
                     : n <= 10 ? "حُذفت " + n + " تنبيهات" : "حُذف " + KIVO.BassamCount(n,"تنبيه") + "";
        const keepTxt = rest === 0 ? "" : rest === 1 ? "وبقي واحدٌ ينتظر تأكيدك"
                      : rest === 2 ? "وبقي اثنان ينتظران تأكيدك"
                      : rest <= 10 ? "وبقيت " + rest + " تنتظر تأكيدك" : "وبقي " + rest + " تنتظر تأكيدك";
        const msg = n === 0
          ? (rest ? "لا شيءَ يُحذف — " + keepTxt.replace(/^و/, "") : "لا شيء يُحذف")
          : (rest ? delTxt + " · " + keepTxt : delTxt + " من جرسك");
        /* وإن بقي شيءٌ فالمرشِّحُ ينتقل إليه — فيراه المستخدمُ الآن لا بعد بحث */
        if(rest)this._nfReload({toast:msg,nfFilt:"act"});else this.setState({toast:msg});
        clearTimeout(this._toastTimer); this._toastTimer = setTimeout(() => this.setState({ toast: "" }), rest ? 3600 : 2200);
      },
      nfMute: NF.muteGet(), nfMuteTip: NF.muteGet() ? "التوست الفوري مكتوم لغير العاجل — انقر لإعادته" : "كتم التوست الفوري لغير العاجل (العاجل يظهر دائماً)",
      nfMuteStyle: "display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:700;cursor:pointer;padding:2px 8px;border-radius:9999px;border:1px solid " + (NF.muteGet() ? "rgba(180,83,9,.4);color:var(--fg-xb45309);background:var(--bg-a1808390p06)" : "#e2e8f0;color:var(--fg-x94a3b8);background:var(--bg-xffffff)"),
      nfMuteToggle: () => { NF.muteSet(!NF.muteGet()); this.setState({ nfTick: (this.state.nfTick || 0) + 1 }); },
      nfIsMgr: isMgr, nfComposeOpen: !!cp,
      nfComposeGo: () => this.setState({ nfCompose: { title: "", body: "", lvl: "info", ack: false, pin: true }, nfOpen: false }),
      nfComposeClose: () => this.setState({ nfCompose: null }),
      nfCpTitle: cp ? cp.title : "", nfCpBody: cp ? cp.body : "",
      nfCpSetTitle: (e) => this.setState({ nfCompose: { ...(this.state.nfCompose || {}), title: e.target.value } }),
      nfCpSetBody: (e) => this.setState({ nfCompose: { ...(this.state.nfCompose || {}), body: e.target.value } }),
      nfCpLvls: ["info", "act", "urg"].map(l => ({ key: l, name: NF.LV[l], style: "padding:4px 12px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;" + (cp && cp.lvl === l ? "background:var(--bg-xffffff);box-shadow:var(--shadow-card);color:" + (l === "urg" ? "#dc2626" : l === "act" ? "#8A6F35" : "#475569") : "color:var(--fg-xb8c0cc)"), pick: () => this.setState({ nfCompose: { ...(this.state.nfCompose || {}), lvl: l } }) })),
      nfCpAck: !!(cp && cp.ack), nfCpAckStyle: swStyle(!!(cp && cp.ack)), nfCpAckKnob: knob(!!(cp && cp.ack)), nfCpAckTog: () => this.setState({ nfCompose: { ...(this.state.nfCompose || {}), ack: !(this.state.nfCompose || {}).ack } }),
      nfCpPin: !!(cp && cp.pin), nfCpPinStyle: swStyle(!!(cp && cp.pin)), nfCpPinKnob: knob(!!(cp && cp.pin)), nfCpPinTog: () => this.setState({ nfCompose: { ...(this.state.nfCompose || {}), pin: !(this.state.nfCompose || {}).pin } }),
      nfCpDept: (KIVO.BassamDepts && KIVO.BassamDepts.activeName) ? KIVO.BassamDepts.activeName() : "",
      nfCpSend: async () => {
        if (this._nfSending) return;
        const c=this.state.nfCompose || {}, submitted=JSON.stringify(c);
        this._nfSending=true;
        try {
          const result=await this._nfWork(()=>NF.bcSendDept({title:c.title,body:c.body,lvl:c.lvl,ack:c.ack,pin:c.pin}));
          if (!result) return;
          this.setState(Object.assign({toast:"حُفظ التعميم وأصبح متاحًا في جرس منسوبي الإدارة"},JSON.stringify(this.state.nfCompose || {})===submitted ? {nfCompose:null} : {}));
          clearTimeout(this._toastTimer); this._toastTimer=setTimeout(()=>this.setState({toast:""}),3000);
        } finally { this._nfSending=false; }
      },
      /* التوست الفوري */
      nfToastOn: !!tt, nfToastT: tt ? tt.t : "", nfToastB: tt ? tt.b : "", nfToastUrg: !!(tt && tt.urg), nfToastGo: tt ? tt.go : "", nfToastHasGo: !!(tt && tt.go), nfToastMore: tt && tt.n > 1 ? ("+" + (tt.n - 1)) : "", nfToastHasMore: !!(tt && tt.n > 1),
      nfToastOpen: () => { const t = this.state.nfToast; if (!t) return; let x = null; try { x = NF.list().filter(y => y.id === t.id)[0]; } catch (e) {} if (x) this._nfOpenItem(x); this.setState({ nfToast: null }); },
      nfToastClose: () => this.setState({ nfToast: null }),
      nfToastAll: () => this.setState({ nfToast: null, nfOpen: true })
    };
    function knob(on) { return "position:absolute;top:2px;" + (on ? "right:17px" : "right:2px") + ";width:14px;height:14px;border-radius:9999px;background:var(--bg-xffffff);box-shadow:var(--shadow-card);transition:.2s"; }
    function swStyle(on) { return "position:relative;display:inline-block;width:36px;height:20px;border-radius:9999px;cursor:pointer;flex-shrink:0;border:1px solid " + (on ? "rgba(0,132,80,0.55);background:linear-gradient(135deg,var(--bg-x6ee7b7),var(--bg-x008450))" : "#d7dce2;background:var(--bg-xeef1f4)"); }
  }
  _pageNames() { return KIVO.KIVO_MANIFEST.clone('routeNames'); }   /* KIVO_247 · AUD-015: أسماءُ المسارات من manifests/pages.json */
  _permKeys(keys) { return (keys || []).some(k => /bassam_perms_v1|bassam_auth_users_v1|bassam_depts_v1|bassam_gdepts_v1/.test(String(k))); }
  _permsChanged() {
    const A = KIVO.BassamAuth, P = KIVO.BassamPerm; if (!A || !P) return;
    try { P._bust(); } catch (e) {}
    try { if (KIVO.BassamPlat && KIVO.BassamPlat.apply) setTimeout(() => KIVO.BassamPlat.apply(), 400); } catch (e) {}   /* زر المساعدة يتبع صلاحية «المساعدة» */
    const u = A.user ? A.user() : null;
    if (!u) { this._byeBar("أُنهيت جلستك — جُمّد حسابك أو حُذف من مدير النظام", () => { try { A.logout(); } catch (e) { location.reload(); } }); return; }
    if (A.isSuper && A.isSuper()) { this.setState({ tick: (this.state.tick || 0) + 1 }); return; }
    const a = this.state.active;
    const NAVP2 = P.NAV2PERM || {};
    const pk = NAVP2[a];
    const lost = a === "sysadmin" ? true : (a === "planning" ? !["planning", "staff", "plan"].some(k => P.can(k, "view")) : (pk ? !P.can(pk, "view") : false));
    if (lost) {
      const nm = (this._pageNames && this._pageNames()[a]) || a;
      this._savePage("profile");
      this.setState({ active: "profile", sidebarOpen: false, toast: "تغيّرت صلاحياتك — أُغلقت صفحة «" + nm + "»" });
      clearTimeout(this._toastTimer); this._toastTimer = setTimeout(() => this.setState({ toast: "" }), 4000);
      return;
    }
    /* الصفحة ما زالت له: تُعاد قراءتها في مكانها فتظهر الأفعال والتبويبات الجديدة، والقائمة تتحدّث معها */
    this._livePend = true; clearTimeout(this._liveT); this._liveT = setTimeout(() => this._liveTry(0), 300);
    this.setState({ toast: "تحدّثت صلاحياتك" }); clearTimeout(this._toastTimer); this._toastTimer = setTimeout(() => this.setState({ toast: "" }), 2500);
  }
  _byeBar(msg, then) {
    try {
      const bar = document.createElement("div"); bar.setAttribute("dir", "rtl");
      bar.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);bottom:14px;z-index:2147483647;background:var(--bg-x7f1d1d);color:var(--fg-xffffff);font:600 12.5px/1.9 Cairo,Tahoma,Arial;padding:11px 18px;border-radius:11px;box-shadow:var(--shadow-elevated);max-width:86vw;text-align:center";
      bar.textContent = "⚠ " + msg; document.body.appendChild(bar);
    } catch (e) {}
    setTimeout(then, 1800);
  }
  /* أي صفحة يخصّها هذا المفتاح؟ (مفتاح غير معروف = كل الصفحات احتياطاً) */
  _liveTouches(keys, page) {
    const MAP = {
      employees: /employees|options|custody|perms|auth_users/, staffing: /staffing|shift_options|callsigns|leave_kinds|perm_tpls|perm_limit|employees/,
      plan: /plan_v1|zone_opts|gate_opts|mark_kinds|employees/, planning: /plan_v1|staffing|employees|rounds|dreport/,
      irshad: /irshad/, seized: /seized|employees|staffing|shift_options|dreport|rounds|dayshift/, award: /award|employees/, profile: /auth_users|employees|staffing|shift_options|tasks|dreport|rounds|plan_v1|dayshift|platform/, links: /^$/,
      admin: /depts|gdepts|auth_users|perms|platform|last_export/, sysadmin: /depts|gdepts|auth_users|perms|platform|last_export/
    };
    const re = MAP[page]; if (!re) return true;
    return keys.some(k => { const nm = String(k).replace(/^bsdept:[^:]+:/, ""); return re.test(nm) || !/^bassam_/.test(nm); });
  }
  _liveQueue(keys) {
    const SELF = { daily: 1, dreport: 1, tasks: 1, sysadmin: 1, admin: 1 };   /* تستمع بنفسها أو تقرأ المخزن مع كل رسم (مدير النظام يحدّث نفسه دورياً) */
    const a = this.state.active;
    if (!a || SELF[a] || !this._liveTouches(keys, a)) return;
    /* تُجمَع المفاتيحُ الواصلة حتى تُطبَّق دفعةً واحدة */
    const acc = this._liveKeys || []; (keys || []).forEach(k => { if (acc.indexOf(k) === -1) acc.push(k); }); this._liveKeys = acc;
    this._livePend = true;
    clearTimeout(this._liveT); this._liveT = setTimeout(() => this._liveTry(0), 600);
  }
  _liveBusy() {
    try {
      const el = document.activeElement;
      /* الكتابةُ الفعلية (ضغطةُ مفتاحٍ خلال ١٫٥ ث) تُرجئ التحديث — أما تركيزٌ ساكنٌ في حقل فلا يحبسه */
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable) && Date.now() - (this._lastKeyAt || 0) < 1500) return true;
      /* نافذة مفتوحة (طبقة ثابتة تغطي الشاشة داخل الصفحة) */
      if ([...document.querySelectorAll('main [style*="position:fixed"], main [style*="position: fixed"]')].some(x => x.offsetWidth > 300 && x.offsetHeight > 200)) return true;
    } catch (e) {}
    return false;
  }
  _liveTry(n) {
    if (!this._livePend) return;
    if (this._liveBusy() && n < 240) { this._liveT = setTimeout(() => this._liveTry(n + 1), 1500); return; }   /* حتى ٦ دقائق ثم يُطبَّق */
    const a = this.state.active; if (!a) { this._livePend = false; this._liveKeys = []; return; }
    const keys = (this._liveKeys || []).slice();
    /* ═══ لا إعادةَ تركيب: المكوّناتُ التي تحمل بياناتَها في حالتها تُعيد قراءتَها من المخزن في مكانها (خطّاف _bsLiveReload).
       خطّافٌ يُعيد false = مشغولٌ الآن (رسمٌ على الخريطة، تحريرٌ مضمَّن…) — يُعاد بعد لحظة كالمعتاد. ═══ */
    let deferred = false;
    this._liveComps().forEach(c => { try { const L = c.logic; if (L && typeof L._bsLiveReload === "function" && L._bsLiveReload(keys) === false) deferred = true; } catch (e) {} });
    if (deferred && n < 240) { this._liveT = setTimeout(() => this._liveTry(n + 1), 1500); return; }
    this._livePend = false; this._liveKeys = [];
    /* تحديثُ React خفيفٌ واحد — بعد الإطار وخارج أولوية الإدخال: الجذرُ يُعاد رسمُه، وتمرُّ الصفحاتُ عبر
       shouldComponentUpdate فلا يُعاد رسمُ إلا من قرأ مفتاحاً تغيّر. لا unmount ولا scrollTo ولا استعادةَ تبويب. */
    const tick = () => {
      try { const R = window.React, go = () => this.setState({ liveTick: (this.state.liveTick || 0) + 1 }); if (R && typeof R.startTransition === "function") R.startTransition(go); else go(); } catch (e) {}
      try { window.dispatchEvent(new CustomEvent("bassam:live-refreshed", { detail: { page: a, keys: keys, remount: false } })); } catch (e) {}
    };
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(tick); else tick();
  }
  /* ═══ استعادةُ الموضع بعد التحديث والرجوع (محلّيٌّ للجهاز — sessionStorage — لا يُرسل للخادم) ═══
     لكلِّ صفحةٍ عليا: الحالةُ المستقرّة لمكوّناتها الظاهرة (تبويب/عرض/سنة/شهر/دور/يوم/ترقيم) وموضعُ التمرير.
     لا حواراتَ ولا تنبيهاتَ ولا تحميلاً — قائمةٌ بيضاء لمفاتيحٍ بدائيّة فقط. العنوانُ يبقى المرجعَ للصفحة وتبويبها إن ذُكر.
     الفحص العميق 2026-10-21 (R2 · ES-2): الحالةُ تُزرع في منطق المكوّن لحظةَ إنشائه (_viewSeed من __makeLogic في 050-dc-runtime) —
     فأوّلُ رسمٍ هو الشهرُ/التبويبُ/اليومُ المحفوظ نفسُه؛ كانت تُطبَّق بـsetState بعد التركيب فيُرسم الافتراضيّ ثم يُستبدل. والتمريرُ وحده بعد التركيب. */
  _viewKey() { try { const D = KIVO.BassamDepts; return "bsview:" + ((D && D.active && D.active()) || "-"); } catch (e) { return "bsview:-"; } }
  _viewAll() { try { return JSON.parse(sessionStorage.getItem(this._viewKey()) || "{}") || {}; } catch (e) { return {}; } }
  /* KD-03 · IRSZ-6 · DG-14: المسجدُ في «الإحصائيات اليومية» (site) · عرضُ المهام والتسكين (sub) · يومُ المهام («الشهر كاملاً»: tkDayK/tkDayD)
     · شهرُ الاسترشاد والمضبوطات ويومُهما وصفحةُ السجل ومرشّحاتُ لوحتهما (ir…) */
  _viewKeep(k, v) {
    if (v == null || (typeof v !== "string" && typeof v !== "number" && typeof v !== "boolean")) return false;
    if (typeof v === "string" && v.length > 60) return false;
    return /tab$/i.test(k) || /^(year|month|floor|lens|view|day|cuYear|cuMonth|rpY|rpM|rpD|sysSel|page|site|sub|tkDayK|tkDayD)$/.test(k)
      || /^ir(Year|Month|Day|LedgerOpen|LedgerPage|LedgerPerPage|DashYear|DashMonth|DashMode)$/.test(k);
  }
  /* ما يُطبَّق من سجلٍّ محفوظ على حالةٍ قائمة: مفتاحٌ في القائمة البيضاء، موجودٌ في الحالة الأولى، ومن نوعها (أو كانت فارغة) */
  _viewPatch(cur, keep) {
    const patch = {};
    Object.keys(keep || {}).forEach(k => { const v = keep[k]; if (this._viewKeep(k, v) && k in cur && cur[k] !== v && (cur[k] == null || typeof cur[k] === typeof v)) patch[k] = v; });
    return patch;
  }
  /* مفتاحُ المكوّن في السجل: اسمُه في السجلّ (Employees · Daily Report…) — والنسخةُ المضمَّنة solo باسمها وورقتها (Daily Sessions#kpiOcc).
     كان المفتاحُ data-screen-label فلا يُعرف قبل التركيب، وتتصادم «الخطة التشغيلية» (الحاوية والتشغيل الميداني بالتسمية نفسِها) */
  _viewCompKey(name, solo) { return String(name || "") + (solo ? "#" + String(solo) : ""); }
  _viewCapture() {
    try {
      const a = this.state.active; if (!a) return;
      const all = this._viewAll(), comps = {};
      this._liveComps().forEach(c => { if (!c.name) return; const keep = {}; try { const st = c.logic.state || {}; Object.keys(st).forEach(k => { if (this._viewKeep(k, st[k])) keep[k] = st[k]; }); } catch(e) { /* لا يمنع العرض — يُتجاوز بصمت */ } if (Object.keys(keep).length) comps[this._viewCompKey(c.name, c.solo)] = keep; });
      all[a] = { v: 2, y: Math.max(0, Math.round(window.scrollY || 0)), comps, at: Date.now() };
      sessionStorage.setItem(this._viewKey(), JSON.stringify(all));
    } catch (e) {}
  }
  /* الزرع: يُستدعى لكل مكوّنٍ عند إنشاء منطقه (قبل أول رسم) — مرةً واحدة لكل مكوّنٍ في كل زيارةٍ للصفحة (ما يُركَّب من جديدٍ أثناءها يبدأ بافتراضه كما كان).
     تبويبُ العنوان أو الطلبُ الصريح يغلب: يطبّقه _bsHR في الصفحة أولَ renderVals بعد الزرع. labelOf: اسمُ الشاشة لسجلٍّ قديم (قبل v2) يُقرأ لإصدارٍ واحد
     مراجعةُ التكامل W1-R4: الإنشاءُ ليس تركيباً — التنقّلُ يركّب الصفحة داخل startTransition، فلمسةٌ أثناءه (النقرُ على عنصر التنقّل نفسِه، الجرس،
     الشريط) تُسقط الشجرةَ قيد الرسم وتُنشئ المكوّنَ من جديد. كان المفتاحُ يُستهلك هنا فتأخذ النسخةُ المُسقَطة الزرعَ وتكتب تبويبَه في العنوان،
     وتُركَّب الثانيةُ بالافتراضيّ (والتمريرُ يُستعاد فوق محتوىً آخر). الآن يُستهلك عند الإيداع: تعيد الدالةُ «استهلاكاً» يناديه المضيفُ
     (050-dc-runtime) في componentDidMount/componentDidUpdate — فيُزرع كلُّ إنشاءٍ قبل أول إيداع، ولا يُزرع ما يُركَّب بعده في الزيارة نفسِها.
     الاستهلاكُ مربوطٌ بسجلّ زيارته: إيداعٌ متأخّرٌ بعد تبدّل الصفحة لا يمسّ الزيارةَ الجديدة */
  _viewSeed(name, logic, props, labelOf) {
    try {
      if (!logic || logic === this || !name) return;
      const a = this.state && this.state.active; if (!a) return;
      if (this._seedPg !== a || !this._seedUsed) { this._seedPg = a; this._seedUsed = {}; }   /* زيارةٌ جديدة (يُصفَّر أيضاً في renderVals عند تبدّل الصفحة: A ← B ← A) */
      const solo = props && props.solo ? String(props.solo) : "", ck = this._viewCompKey(name, solo), used = this._seedUsed;
      if (used[ck]) return;
      const commit = () => { used[ck] = 1; };   /* W1-R4: يُستهلك المفتاحُ — زُرع أم لم يوجد ما يُزرع — حين يُودَع المكوّنُ لا حين يُنشأ */
      const rec = this._viewAll()[a]; if (!rec || !rec.comps) return commit;
      let keep = rec.comps[ck];
      if (!keep && rec.v !== 2 && !solo && typeof labelOf === "function") { const lb = labelOf(); if (lb) keep = rec.comps[lb]; }
      if (!keep) return commit;
      const cur = logic.state || {}, patch = this._viewPatch(cur, keep);
      if (!Object.keys(patch).length) return commit;
      logic.state = { ...cur, ...patch };
      logic.__bsSeeded = patch;      /* تقرؤه الصفحة (_bsHR) لتكتب تبويبَها المزروع في العنوان كما كانت الاستعادةُ تفعل */
      return commit;
    } catch(e) { /* لا يمنع العرض — يُتجاوز بصمت */ }
  }
  _seedReg = (KIVO.__bsViewSeed = (n, l, p, lb) => this._viewSeed(n, l, p, lb), 1);
  /* التمرير وحده بعد التركيب (حين تظهر مكوّناتُ الصفحة) */
  _viewRestore(page, tries) {
    try {
      tries = tries || 0;
      if (page !== this.state.active) return;
      const rec = this._viewAll()[page]; if (!rec) return;
      if (!this._liveComps().length) { if (tries < 120) requestAnimationFrame(() => this._viewRestore(page, tries + 1)); return; }
      if (this._viewScrolled === page + ":" + rec.at) return;
      this._viewScrolled = page + ":" + rec.at;
      const y = rec.y || 0;
      if (y > 0) this._viewScrollTo(page, y);
    } catch (e) {}
  }
  /* R5: كان الموضعُ يُفرض ثلاثَ مرات (إطاران · 450 · 1300 ms) فيسحب المستخدمَ إلى الخلف إن مرّر خلالها. الآن: يُطبَّق حتى يبلغ الموضعَ مرةً واحدة
     (المحاولتان التاليتان لصفحةٍ لم يكتمل طولُها بعد) — ويتوقّف نهائياً عند أول لمسٍ/عجلةٍ/ضغطةٍ/مفتاح، أو إن تغيّر الموضعُ عمّا ضبطه آخرَ مرة */
  _viewScrollTo(page, y) {
    let done = false, last = null;
    const EV = ["wheel", "touchstart", "pointerdown", "keydown"];
    const stop = () => { if (done) return; done = true; EV.forEach(n => { try { window.removeEventListener(n, stop, true); } catch(e) { /* لا يمنع العرض — يُتجاوز بصمت */ } }); };
    EV.forEach(n => { try { window.addEventListener(n, stop, { capture: true, passive: true }); } catch(e) { /* لا يمنع العرض — يُتجاوز بصمت */ } });
    const go = () => {
      try {
        if (done) return;
        if (this.state.active !== page) return stop();
        if (last != null && Math.abs((window.scrollY || 0) - last) > 4) return stop();
        const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        window.scrollTo(0, Math.min(y, max));
        last = window.scrollY || 0;
        if (Math.abs(last - y) <= 4) stop();
      } catch (e) { stop(); }
    };
    requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 450); setTimeout(go, 1300); setTimeout(stop, 1400);
  }
  /* ═══ حوارُ تأكيدٍ موحَّد — بدل confirm() الأصليّ للعمليات الروتينية ═══
     Promise<boolean>. التركيزُ على الإلغاء للفعل التدميريّ (الخيارُ الآمن)، Escape يُلغي، والتركيزُ يعود لمن فتحه. */
  cfmAsk(o) {
    o = o || {};
    return new Promise(res => {
      const prev = document.activeElement;
      /* KIVO_265 · typed: نصٌّ يجب كتابتُه حرفاً للتأكيد (حذفُ إدارةٍ فيها مدير أو موظفون) — زرُّ التأكيد معطّل حتى يطابق */
      /* RISHAD266 · input: حقلُ إدخالٍ (تسميته o.input) — يُحلّ الوعدُ بالنصّ المكتوب أو null عند الإلغاء */
      this.setState({ cfm: { title: o.title || "تأكيد", msg: o.msg || "", ok: o.ok || "تأكيد", cancel: o.cancel || "إلغاء", danger: !!o.danger, info: !!o.info, typed: o.typed ? String(o.typed) : "", val: "", input: o.input ? String(o.input) : "", res, prev } });
      setTimeout(() => { try { const b = document.getElementById(o.input ? "bsCfmTyped" : o.danger ? "bsCfmNo" : "bsCfmOk"); b && b.focus(); } catch (e) {} }, 30);
    });
  }
  cfmClose(v) {
    const c = this.state.cfm; if (!c) return;
    this.setState({ cfm: null });
    try { c.res(c.input ? (v ? String(c.val || "").trim() : null) : !!v); } catch (e) {}
    try { if (c.prev && c.prev.focus && document.contains(c.prev)) setTimeout(() => { try { c.prev.focus(); } catch (e) {} }, 0); } catch (e) {}
  }
  /* المكوّناتُ الظاهرة (صفحةٌ ومضمَّناتُها) — تُستعمل لخطّاف التحديث الحيّ ولاستعادة الموضع */
  _liveComps() {
    const out = [];
    try {
      document.querySelectorAll("main [data-screen-label]").forEach(el => {
        const fk = Object.keys(el).find(k => k.indexOf("__reactFiber") === 0); let f = fk ? el[fk] : null;
        while (f && !(f.stateNode && f.stateNode.logic && f.stateNode.logic.state)) f = f.return;
        if (f && f.stateNode !== this && f.stateNode.logic !== this) {
          const L = f.stateNode.logic, pr = L.props || {};
          out.push({ label: el.getAttribute("data-screen-label"), name: f.stateNode.__name || "", solo: pr.solo ? String(pr.solo) : "", logic: L });
        }
      });
    } catch (e) {}
    return out;
  }
  state = { active: this._loadPage(), sidebarOpen: false, toast: "", theme: this.loadTheme(), bkConf: null, bkStep: "pick", cfm: null };
  /* ═══ السمةُ الحقيقية (فاتح/داكن) — رموزُ CSS تحت html[data-theme]، بلا مرشِّحات ولا طبقات ═══
     التفضيلُ جهازيٌّ في bassam_theme (لا يُزامَن). loadTheme يقرأه؛ applyTheme يضع السمةَ على الجذر ويحفظها ويُعلِم الصفحات. */
  loadTheme() { try { return localStorage.getItem("bassam_theme") === "dark" ? "dark" : "light"; } catch (e) { return "light"; } }
  applyTheme(t) {
    const v = t === "dark" ? "dark" : "light";
    try { localStorage.setItem("bassam_theme", v); } catch (e) {}
    try { if (KIVO.__bsThemeSet) KIVO.__bsThemeSet(v); else { if (v === "dark") document.documentElement.setAttribute("data-theme", "dark"); else document.documentElement.removeAttribute("data-theme"); } } catch (e) {}
    /* لا طبقاتَ مرشِّحٍ من إصداراتٍ سابقة أبداً */
    try { const ov = document.getElementById("bs-dark"); if (ov) ov.remove(); } catch (e) {}
    try { const tint = document.getElementById("bs-dark-tint"); if (tint) tint.remove(); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent("bassam:theme", { detail: { theme: v } })); } catch (e) {}
  }
  /* تجميع مفاتيح النسخة حسب سقف الإدارة — للنصّ فقط؛ النسخة نفسها تحمل كل المجموعات */
  bkCapNote(keys, did) {
    try { const P = KIVO.BassamPerm; if (!P || !P.keyOn) return "";
      let on = 0, off = 0; (keys || []).forEach(k => { if (P.keyOn(k, did)) on++; else off++; });
      return off ? " — " + on + " مفعّلة في هذه الإدارة و " + off + " محفوظة — غير مفعّلة في هذه الإدارة" : "";
    } catch (e) { return ""; }
  }
  bkExportRun(opts) {
        const _pre = !!(opts && opts.preImport), _cb = (opts && opts.cb) || null;
        const _tk = KIVO.BassamBusy ? KIVO.BassamBusy.start(_pre ? "جارٍ حفظ نسخة ما قبل الاستيراد…" : "جارٍ تجهيز نسخة الإدارة الاحتياطية…") : null;
        const D = KIVO.BassamDepts; if (!D) { if (_tk) _tk.done(); if (_cb) { try { _cb(); } catch (eD) {} } return; }
        /* IP39 (PRIVACY batch · 019u bkExportOk): الخادمُ لا يصدّر نسخةَ الإدارة لمن يملك «عرض حالة النسخ» وحده — رسالةٌ صادقة بدل «تعذّر التصدير» */
        /* RISHAD-266 · قرار المالك (و) 2026-11-03: دورُ «الإدارة» (role dept) المتقاعد لا يصدّر نسخةَ الإدارة — ولو ورث ورقةَ النسخ من سقفه؛ مديرُ الإدارة العادي (staff بشارة mgr) ومديرُ النظام كما كانا (الخادم: 019u bkExportOk) */
        { const me0 = KIVO.BassamAuth?.user?.(), P0 = KIVO.BassamPerm, canBk = !!me0 && me0.role !== "dept" && (me0.role === "super" || me0.role === "gm" || !!me0.mgr || !!(P0 && P0.canSub && (P0.canSub("admin", "backup", "add") || P0.canSub("admin", "backup", "edit"))));
          if (!canBk) { if (_tk) _tk.done(); this.bkToast("لم تُصدَّر النسخة: نسخةُ الإدارة تحمل كل بياناتها، فتصديرها لمدير الإدارة أو لمن مُنح «إنشاء نسخة احتياطية» — اطلب الصلاحية من مدير الإدارة", true); return; } }
        const id = D.active(); const nm = D.activeName();
        const srv = KIVO.__BS_SRV, boot = window.__BS_BOOT || {}, user = KIVO.BassamAuth?.user?.();
        if (!srv || !user || String(user.id) !== String(boot.uid) || !Number.isSafeInteger(boot.v) || srv.dirty() || srv.inflight() || srv.sesChanged()) { if (_tk) _tk.done(); this.bkToast("حدّث البيانات وانتظر اكتمال الحفظ ثم أعد التصدير"); return; }
        const snapshot = { uid: String(boot.uid), v: boot.v, revs: Object.fromEntries(D.keysOf(id).concat(["bassam_perms_v1"]).map(key => [key, srv.rev(key)])) };
        const same = () => D.active() === id && String(KIVO.BassamAuth?.user?.()?.id || "") === snapshot.uid && String(boot.uid) === snapshot.uid && boot.v === snapshot.v && !srv.dirty() && !srv.inflight() && !srv.sesChanged() && Object.entries(snapshot.revs).every(([key, rev]) => srv.rev(key) === rev);
        const read = async path => {
          if (!same()) throw new Error("تغيّرت البيانات أو الجلسة");
          const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 20000);
          try { const response = await fetch(path, { credentials: "same-origin", cache: "no-store", signal: controller.signal }), body = await response.json(); if (!response.ok || body?.ok !== 1 || !same()) throw new Error("تعذّر تأكيد نسخة الخادم"); return body; }
          finally { clearTimeout(timer); }
        };
        const fence = async () => { const result = await read("/api/get?keys=&uid=" + encodeURIComponent(snapshot.uid)); if (result.v !== snapshot.v) throw new Error("حدّث البيانات ثم أعد التصدير"); };
        const pref = "bsdept:" + id + ":";
        const data = {};
        D.keysOf(id).forEach(kk => { data[kk.slice(pref.length)] = D.raw.getItem.call(localStorage, kk); });
        /* كلُّ صورةٍ مُشارٍ إليها في أيِّ مفتاحٍ من مفاتيح الإدارة (خطةٌ بلقطات أشهرها، جولاتٌ تاريخية، مهامّ img_tsk،
           مضبوطاتٌ szp_، الملف…) — بالجامع القانونيّ وبلا تكرار؛ لا يُصدَّر إلا ما تُشير إليه بياناتُ هذه الإدارة فعلاً */
        let iids = [];
        try { iids = KIVO.BassamImgRefs ? KIVO.BassamImgRefs.collect(data) : []; } catch (e) { iids = []; }
        const doExport = async (imgs) => { try { await doExport0(imgs); } finally { if (_tk) _tk.done(); } };
        const doExport0 = async (imgs) => {
          try {
            const dt = new Date();
            /* شريحة صلاحيات هذه الإدارة وحدها (سقفها + منح موظفيها) ترافق نسختها */
            let permSlice = null;
            try { const pm = JSON.parse(D.raw.getItem.call(localStorage, "bassam_perms_v1")) || {}; const capArr = (pm.caps || {})[id]; permSlice = { capSet: Array.isArray(capArr), cap: Array.isArray(capArr) ? capArr : null, emps: (pm.emps || {})[id] || {}, lenses: (pm.lenses || {})[id] }; } catch (eP) { permSlice = null; }
            await fence();
            if (!KIVO.BassamNotif) throw new Error("خدمة التنبيهات غير متاحة");
            const notifications=await KIVO.BassamNotif.exportDomain(id);
            const custody=await KIVO.Custody.exportDomain(id);
            if (!custody || custody.ok !== 1) throw new Error("تعذّر تصدير مجال العهد؛ لم تُنشأ نسخة جزئية");
            Object.keys(data).forEach(key=>{if (/(?:^|:)bassam_custody_v1$/.test(key)) delete data[key];});
            if (!notifications || notifications.ok !== 1) throw new Error("تعذّر تصدير تنبيهات الإدارة");
            if(!Array.isArray(custody.domains)||custody.domains.length!==1||custody.domains[0].scope.departmentId!==id)throw new Error("نطاق العهد لا يطابق الإدارة");
            const business = await KIVO.BackupRestore.exportDomains({departments:[id],full:false,v:snapshot.v,images:imgs||{}});
            Object.keys(data).forEach(key => { if (/(?:^|:)bassam_(?:irshad(?:_langs|_locs|_retro)?|seized(?:_cat|_jew|_acts|_locs|_retro)?|award(?:_docs)?)_v[12]$/.test(key)||KIVO.__BS_SRV.operations.resources.includes(key.replace(/^bsdept:[^:]+:/,''))) delete data[key]; });
            await fence();
            const manifest={version:4,scope:"dept",domains:{kv:1,notifications:1,custody:1,irshad:1,seized:1,awards:1,operations:1},departments:[id],keys:Object.keys(data)};
            const payload = {app:"bassam-crowd",version:4,kind:"dept",dept:nm,exportedAt:dt.toISOString(),data,domains:{notifications:notifications.domain,custody:custody.domains,...business.domains},manifest,perms:permSlice,idbImages:business.images,preImport:_pre};
            const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a2 = document.createElement("a"); a2.href = url;
            const p2 = (n) => (n < 10 ? "0" + n : "" + n);
            a2.download = (_pre ? "قبل-الاستيراد-" : "نسخة-") + nm.replace(/\s+/g, "-") + "-" + dt.getFullYear() + "-" + p2(dt.getMonth() + 1) + "-" + p2(dt.getDate()) + ".json";
            document.body.appendChild(a2); a2.click(); a2.remove(); URL.revokeObjectURL(url);
            if (_pre) { if (_cb) { try { _cb(); } catch (eCb) {} } return; }
            /* ختمُ آخر تصدير لهذه الإدارة — يقرؤه سطحُ الإعدادات فيُذكّر بدوريّة النسخ */
            /* KIVO_263: الختمُ رقمُ اللحظة (JSON صالح) — نصُّ ISO الخام ليس JSON فيرفضه الخادمُ في الإنفاذ («shape») فلا يصل الختمُ بقيةَ الأجهزة؛ القرّاءُ (bkTime · _expInfo) يقبلون الصيغتين */
            try { D.raw.setItem.call(localStorage, "bsdept:" + id + ":bassam_last_export_v1", String(dt.getTime())); } catch (eStamp) {}
            this.bkToast("✓ تم تصدير نسخة «" + nm + "» (" + KIVO.BassamCount(Object.keys(data).length,"مجموعة بيانات") + "" + this.bkCapNote(Object.keys(data), id) + " و " + KIVO.BassamCount(Object.keys(imgs || {}).length,"صورة") + ")");
          } catch (e) { this.bkToast("تعذّر التصدير"); }
        };
        if (iids.length && KIVO.BassamIDB) {
          const imgs = {}; let done = 0;
          iids.forEach(iid => { KIVO.BassamIDB.get(iid).then(v => { if (v) imgs[iid] = v; done++; if (done === iids.length) doExport(imgs); }).catch(() => { done++; if (done === iids.length) doExport(imgs); }); });
        } else doExport({});
  }
  /* كان يستورد في «الإدارة النشطة» حصراً، فاستعادة نسخة إدارة أخرى تلزمك
     بالتبديل إليها أولاً. الآن يقبل الإدارة الهدف صراحةً، ومدير النظام
     يستورد لأي إدارة من صفّها مباشرة. */
  bkImportFile(file, did) {
    if (!file) return;
    if (this._bkSaving || (this._bkPend && this._bkPend.uncertain)) {
      this.bkToast("أكمل تأكيد الطلب السابق قبل اختيار ملف آخر", true);
      return;
    }
    const D = KIVO.BassamDepts;
    if (!D) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        if (!obj || obj.kind !== "dept" || !obj.data || typeof obj.data !== "object" || Array.isArray(obj.data)) {
          this.bkToast("هذا ليس ملف نسخة إدارة صالحًا", true);
          return;
        }
        const id = did || D.active(),
          name = (D.list().find((d) => d.id === id) || {}).name || id;
        this._bkPend = { file: obj, did: id, keys: Object.keys(obj.data), ticket: null };
        this.setState({
          bkStep: "pick",
          bkConf: {
            cur: 0,
            file: Object.keys(obj.data).length,
            over: 0,
            fresh: 0,
            src: obj.dept || "الملف",
            dest: name,
            capNote: "ستُراجع الصلاحيات والنطاق على الخادم قبل الكتابة",
          },
        });
      } catch (error) {
        this.bkToast("تعذّرت قراءة ملف النسخة", true);
      }
    };
    reader.onerror = () => this.bkToast("تعذّرت قراءة الملف", true);
    reader.readAsText(file);
  }
  async bkCommit(mode) {
    const pend = this._bkPend,
      svc = KIVO.BackupRestore;
    if (!pend || !svc || this._bkSaving) return;
    if (pend.uncertain && pend.mode !== mode) {
      this.bkToast("أعد المحاولة بالطريقة نفسها لتأكيد نتيجة الطلب السابق أولًا", true);
      return;
    }
    this._bkSaving = true;
    try {
      if (!pend.ticket || pend.mode !== mode) {
        const prepared = await svc.prepare(pend.file, { scope: { kind: "dept", departmentId: pend.did }, mode });
        if (!prepared.ok) {
          this.bkToast(prepared.message, true);
          return;
        }
        pend.ticket = prepared.ticket;
        pend.prepared = prepared;
        pend.mode = mode;
        pend.confirmed = false;
      }
      if (!pend.confirmed) {
        if (!(await svc.confirm(pend.prepared))) return;
        const approved = svc.approve(pend.ticket);
        if (!approved.ok) {
          this.bkToast(approved.message, true);
          return;
        }
        pend.confirmed = true;
      }
      const result = await svc.send(pend.ticket);
      if (!result.ok) {
        pend.uncertain = result.uncertain;
        if (!result.uncertain) {
          pend.ticket = null;
          pend.confirmed = false;
        }
        this.bkToast(result.message, true);
        return;
      }
      if (this._bkPend !== pend) return;
      this._bkPend = null;
      this.setState({ bkConf: null, bkStep: "pick", tick: (this.state.tick || 0) + 1 });
      this.bkToast("اكتملت استعادة الإدارة وأُنشئت لقطة ما قبلها");
      await svc.refresh();
    } finally {
      this._bkSaving = false;
    }
  }

  bkToast(msg, long) {
    clearTimeout(this._toastTimer);
    this.setState({ toast: msg });
    this._toastTimer = setTimeout(() => this.setState({ toast: "" }), long ? 4200 : 2600);
  }
  renderVals() {
    if (this._viewLastActive !== this.state.active) { const pg = this.state.active; this._viewLastActive = pg; this._seedUsed = null; try { requestAnimationFrame(() => this._viewRestore(pg, 0)); } catch(e) { /* لا يمنع العرض — يُتجاوز بصمت */ } }
    if (!this._themeApplied) { this._themeApplied = true; const t = this.state.theme; setTimeout(() => this.applyTheme(t), 0); }
    // واجهة سمة عامة: الشاشات الأخرى مكوّنات مستقلة لا تصل لحالة الإطار، وتحتاج تبديل
    // الوضع الليلي وهي في ملء الشاشة حيث يختفي الشريط العلوي بزرّه
    if (!this._themeReg) {
      this._themeReg = true;
      KIVO.BassamTheme = {
        get: () => this.state.theme,
        set: (t) => { const v = t === "dark" ? "dark" : "light"; this.applyTheme(v); this.setState({ theme: v }); return v; },
        toggle: () => KIVO.BassamTheme.set(this.state.theme === "dark" ? "light" : "dark")
      };
    }
    if (!this._bkReg) { this._bkReg = true; const okUser = () => { const A = KIVO.BassamAuth; return !!(A && A.user()); }; KIVO.BassamDeptBackup = { export: () => { if (okUser()) this.bkExportRun(); }, importFile: (fl, did) => { if (okUser()) this.bkImportFile(fl, did); } }; }
    const a = this.state.active, open = this.state.sidebarOpen;
    /* أثناء المرحلة الأولى من التنقّل لا تُركَّب أيُّ صفحة — يُرسَم الإطارُ أولاً */
    const ap = this.state.navPending ? "__pending__" : a;
    /* حركةُ المحتوى عند فتح الشريط/إغلاقه: انزلاقٌ على المُركِّب لا تخطيطٌ في كلِّ إطار.
       لا حركةَ عند أول رسم، ولا على الجوال (الشريطُ هناك درجٌ فوق المحتوى). */
    const wide = (typeof window !== "undefined" && window.innerWidth > 1024);
    const slide = (this.__sbToggled && wide) ? (open ? "animation:bsSlideOpen .3s ease-in-out;" : "animation:bsSlideClose .3s ease-in-out;") : "";
    /* كانت 272 بينما عرض الشريط الفعلي 260 (قاعدة .bsb) — 12px شبحية تُزاح
       بلا مقابل فتُرى فراغاً زائداً بجانب القائمة. الآن الإزاحة = عرض الشريط. */
    const W = open ? 260 : 66;   /* منطقة الذهب للوحات التحكم: 256–280 — توازن بين التنفس والرشاقة */
    /* مفتاح الصفحة في منظومة الصلاحيات مقابل مفتاح التنقل */
    const NAVP = (KIVO.BassamPerm && KIVO.BassamPerm.NAV2PERM) || { employees: "emps", staffing: "staff", plan: "plan", daily: "daily", tasks: "tasks", irshad: "irshad", admin: "admin" };
    const _pOK = (pk) => { try { if (pk === "admin" && KIVO.BassamAuth && KIVO.BassamAuth.isSuper && KIVO.BassamAuth.isSuper()) return true; return !KIVO.BassamPerm || KIVO.BassamPerm.can(pk, "view"); } catch (e) { return true; } };
    const _pAny = (ks) => ks.some(_pOK);
    const go = (key) => () => {
      if (key === "help") return this._openHelpRoute();
      const pk = NAVP[key];
      /* حاوية «الخطة التشغيلية» تُفتح إن كانت أيٌّ من صفحاتها الثلاث متاحة */
      /* حاوية «مؤشرات الإدارة» تُفتح لمن ملك ورقةً واحدةً من أوراقها الستّ */
      const _kOK = () => { try { const P = KIVO.BassamPerm; if (!P) return true;
        return ((KIVO.BassamPerm && KIVO.BassamPerm.navLeaves) ? KIVO.BassamPerm.navLeaves("kpis") : [["planning","readiness"],["daily","kpiDaily"],["daily","kpiOcc"],["daily","kpiZones"],["seized","dash"],["irshad","dash"]])
          .some(x => P.kpiPanelOk ? P.kpiPanelOk(x[0], x[1]) : (P.canSub ? P.canSub(x[0], x[1], "view") : true)); } catch (e) { return false; } };
      if (key === "kpis" ? !_kOK() : (key === "planning" ? !_pAny(["planning","staff","plan"]) : (pk && !_pOK(pk)))) return;   /* ردّ الانتقال لصفحة غير متاحة */
      this._savePage(key);           /* تُستعاد بعد التحديث */
      /* على الجوال الشريط درجٌ فوق المحتوى — اختيار وجهة يغلقه فوراً، فلا
         يبقى معلّقاً يحجب الصفحة التي طلبتَها (سلوك التطبيقات المعتمد) */
      const drawer = (typeof window !== "undefined" && window.innerWidth <= 1024);
      this.setState(drawer ? { active: key, sidebarOpen: false } : { active: key });
    };
    // كانت «إدارة الموظفين» غلافاً بلا محتوى: شريط تبويبات يستضيف ثلاث صفحات، فتصل
    // إلى وجهتك بنقرتين ويُكتب لك مسارٌ من مستويين لمكانٍ واحد. حُذف الغلاف وصارت
    // الصفحات الثلاث عناصر مستقلة في القائمة الجانبية بترتيب سير العمل نفسه.
    const inPlanning = ["employees","staffing","plan","daily","tasks","irshad","seized","award"].includes(a);
    /* F01: اسمُ الصفحة بنوع الوحدة النشطة — «موظفو القسم» · «مؤشرات القسم» حين تكون قسماً */
    const _ua = (() => { try { const D = KIVO.BassamDepts; return D && D.unitAl ? D.unitAl(D.active()) : "الإدارة"; } catch (e) { return "الإدارة"; } })();
    const labels = { kpis:"مؤشرات " + _ua, employees:"موظفو " + _ua, staffing:"الجدول الشهري", plan:"التشغيل الميداني", daily:"المتابعة اليومية", dreport:"التقرير اليومي", planning:"الخطة التشغيلية", tasks:"المهام", irshad:"نظام الاسترشاد", seized:"نظام المضبوطات", award:"جائزة التميز", links:"مواقع ذات صلة", admin:"الإعدادات", sysadmin:"مدير النظام" };
    return {
      sidebarOpen: open,
      lKpis: labels.kpis, lEmployees: labels.employees, deptDdHead: _ua === "القسم" ? "الوحدة النشطة" : "الإدارة النشطة",
      sbClass: "bsb" + (open ? "" : " cx"),
      headerStyle: "position:fixed;top:0;left:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:0 24px;height:81px;background:var(--bg-header);color:var(--text-primary);border-bottom:1px solid var(--border-subtle);font-family:'Cairo',sans-serif;transition:right .25s ease;right:" + (this.state.sidebarOpen ? 260 : 66) + "px",
      // كان: غياب المستخدم يجعلها true فيظهر عنصر «مدير النظام» بعد انقضاء الجلسة
      authSuperSb: !!(KIVO.BassamAuth && KIVO.BassamAuth.isSuper()),
      // حساب الموظف للاطّلاع والعمل الميداني — لا لضبط النظام ولا لفتح الحسابات
      authNotStaff: !(KIVO.BassamAuth && KIVO.BassamAuth.isStaff && KIVO.BassamAuth.isStaff()),
      /* مجموعة «الإعدادات» كانت محجوبة عن كل موظف — حتى مدير الإدارة المأذون.
         الآن تتبع الصلاحية نفسها: مدير النظام دائماً، وغيره بصلاحية admin. */
      showAdminGrp: !!((KIVO.BassamAuth && KIVO.BassamAuth.isSuper && KIVO.BassamAuth.isSuper()) || _pOK("admin")),
      /* حراسة الصلاحيات: الصفحة غير المتاحة يختفي رابطها (class "n gone")
         ويُردّ الانتقال إليها بأي طريق. مدير النظام يرى كل شيء. */
      /* ═══ صدق القائمة الجانبية أمام مدير النظام ═══
         مدير النظام فوق كل السقوف فتبقى كل الصفحات مفتوحة له — وكان ذلك يجعل
         القائمة ثابتة مهما بدّل الإدارة، فلا يعرف ما هو مفعّل فعلاً لكل إدارة.
         الآن: ما هو داخل سقف الإدارة النشطة يظهر عادياً، وما هو خارجه يظهر
         باهتاً بنقطة تنبيه وتلميح يوضّح السبب — ويبقى قابلاً للفتح، لأن إخفاءه
         يحبس المشرف داخل إدارة سقفها فارغ بلا طريق لتعديله. */
      ...(() => {
        const P = KIVO.BassamPerm, A = KIVO.BassamAuth;
        const sup = !!(A && A.isSuper && A.isSuper());
        let cap = [];
        try { cap = (P && P.deptCap) ? P.deptCap() : []; } catch (e) { cap = []; }
        const dn = (KIVO.BassamDepts && KIVO.BassamDepts.activeName && KIVO.BassamDepts.activeName()) || "هذه الإدارة";
        const NM = {}; try { (P.PAGE_REG || []).forEach(x => NM[x.key] = x.name); } catch (e) {}
        const outOf = (pk) => sup && cap.indexOf(pk) === -1;
        const cls = (navKey, pk) => "n" + (a === navKey ? " on" : "")
          + (_pOK(pk) ? "" : " gone") + (outOf(pk) ? " out" : "");
        const tip = (pk) => outOf(pk)
          ? ((NM[pk] || "") + " — خارج سقف «" + dn + "» · مرئية لك بصلاحية المشرف")
          : (NM[pk] || "");
        /* «مؤشرات الإدارة» حاويةُ عرضٍ لأوراقٍ قائمة بمفاتيحها — فظهورُها من
           ملك واحدةٍ منها، لا من مفتاحٍ جديدٍ لها */
        const _kpiLeaves = ((KIVO.BassamPerm && KIVO.BassamPerm.navLeaves) ? KIVO.BassamPerm.navLeaves("kpis") : [["planning","readiness"],["daily","kpiDaily"],["daily","kpiOcc"],["daily","kpiZones"],["seized","dash"],["irshad","dash"]]);
        const _kpiAny = (() => { try { const P = KIVO.BassamPerm; if (!P) return true;
          return _kpiLeaves.some(x => P.kpiPanelOk ? P.kpiPanelOk(x[0], x[1]) : (P.canSub ? P.canSub(x[0], x[1], "view") : true)); } catch (e) { return false; } })();
        return {
          nKpis: "n" + (a === "kpis" ? " on" : "") + (_kpiAny ? "" : " gone"), tKpis: labels.kpis,
          nDstats: cls("dstats", "dstats"), tDstats: tip("dstats"),
          nEmployees: cls("employees", "emps"), tEmployees: tip("emps"),
          nStaffing: cls("staffing", "staff"), tStaffing: tip("staff"),
          nPlan: cls("plan", "plan"), tPlan: tip("plan"),
          nDaily: cls("daily", "daily"), tDaily: tip("daily"),
          nDreport: cls("dreport", "dreport"), tDreport: tip("dreport"),
          /* كانت مربوطة بـ«الجدول الشهري» وحده فتختفي عمّن له «التشغيل الميداني» فقط */
          nPlanning: "n" + (a === "planning" ? " on" : "") + (_pAny(["planning","staff","plan"]) ? "" : " gone") + (outOf("planning") && outOf("staff") && outOf("plan") ? " out" : ""), tPlanning: tip("planning"),
          nIrshad: cls("irshad", "irshad"), tIrshad: tip("irshad"), nSeized: cls("seized", "seized"), tSeized: tip("seized"),
          nAward: cls("award", "award"), tAward: tip("award"),
          nLinks: cls("links", "links"), tLinks: tip("links"),
          nTasks: cls("tasks", "tasks"),
          nAdminOut: outOf("admin"), tAdmin: outOf("admin")
            ? ("الإعدادات — خارج سقف «" + dn + "» · مرئية لك بصلاحية المشرف")
            : "الإعدادات — نسخة الإدارة الاحتياطية",
        };
      })(),
      /* الإعدادات تتبع صلاحية admin — تختفي إن أُطفئت للإدارة، إلا للمشرف
         العام فيراها دائماً (لا يُحبس أحد خارج النسخ الاحتياطي). */
      nAdmin: "n" + (a === "admin" ? " on" : "") + (((KIVO.BassamAuth && KIVO.BassamAuth.isSuper && KIVO.BassamAuth.isSuper()) || _pOK("admin")) ? "" : " gone") + ((() => { try { const P = KIVO.BassamPerm, A = KIVO.BassamAuth; return (A && A.isSuper && A.isSuper() && P && P.deptCap().indexOf("admin") === -1) ? " out" : ""; } catch (e) { return ""; } })()),
      nSysAdmin: "n" + (a === "sysadmin" ? " on" : ""),
      goSysAdmin: () => { /* كان: الشرط يتطلّب user() صادقة، فغياب الجلسة يتخطّى الخروج المبكر ويفتح الشاشة */
        if (!(KIVO.BassamAuth && KIVO.BassamAuth.isSuper())) return; KIVO.__ADMIN_MODE = "site"; this._savePage("sysadmin"); this.setState({ active: "sysadmin" }); },
      /* الطبقة المعتمة تظهر مع الشريط المفتوح — والـCSS يقصرها على الشاشات الصغيرة */
      scrimOn: !!this.state.sidebarOpen,
      toggleSidebar: () => this.setState({ sidebarOpen: !this.state.sidebarOpen }),
      // كان في الشريط ثلاثة مفاتيح طيّ: الزرّ السفلي، ونقر الشعار الخفيّ، وسهم طيّ
      // المجموعة. بقي واحد فوق القائمة — وطيّ المجموعة سقط لأنه لم يعد يوفّر شيئاً
      // بعدما صارت قائمةً مسطّحة من ستة عناصر ثابتة.
      sbToggleTitle: open ? "إغلاق القائمة الجانبية" : "فتح القائمة الجانبية",
      sbToggleChevron: "transition:transform .3s;" + (open ? "" : "transform:rotate(180deg)"),
      ...((() => {
        const D = KIVO.BassamDepts;
        if (!D) return { deptName: "إدارة", deptGroupName: "", deptOpen: false, deptList: [], deptTree: [], deptGrpShow: false, deptGrpName: "", deptGrpStyle: "", deptToggle: () => {}, deptChev: "", deptBtnStyle: "display:none" };
        const open = !!this.state.deptOpen;
        const act = D.active();
        /* F01: اسمُ الوحدة النشطة أولاً ثم إدارتُها الأم للقسم («قسم س · إدارة ص» — 320 unitLabel) فيُقصّ من آخره على الجوال لا اسمُ الوحدة */
        const scope = D.context?.(), deptLabel = (D.unitLabel ? D.unitLabel(act) : "") || D.activeName() || (scope?.state === "empty" ? "لا توجد إدارة" : scope?.state === "error" ? "تعذّر قراءة الإدارات" : "اختر إدارة");
        const isSuper0 = !(KIVO.BassamAuth && KIVO.BassamAuth.user()) || KIVO.BassamAuth.isSuper();
        const gmU = (KIVO.BassamAuth && KIVO.BassamAuth.user() && KIVO.BassamAuth.user().role === "gm") ? KIVO.BassamAuth.user() : null;
        /* مدير الإدارة العامة يبدّل بين إدارات مجموعته فقط — كالمشرف داخل نطاقه.
           F01: ومديرُ الإدارة (حسابُها أو حاملُ الشارة) بين إدارته وأقسامها (320 switchUnits — والخادمُ يحكم 018 secMgrOf) */
        const meU = KIVO.BassamAuth && KIVO.BassamAuth.user() ? KIVO.BassamAuth.user() : null;
        const secU = !isSuper0 && !gmU && meU && D.switchUnits ? D.switchUnits(meU) : [];
        const isSuper = isSuper0 || !!gmU || secU.length > 1;
        /* RISHAD266 (قرار المالك): «+ قسم» بجوار المبدّل حين تكون الوحدةُ النشطة إدارةً أمّاً (لا قسماً) — لمديرها نفسِه (حسابُ الإدارة أو مديرٌ بشارة) ولمدير المنصة.
           يعمل على الإدارة النشطة وحدها، ولا يفتح شجرةَ المنصة لمدير الإدارة؛ والخادمُ يحكم (018 deptSecMgrWhy) */
        const realSuper = !!(KIVO.BassamAuth && KIVO.BassamAuth.isSuper && KIVO.BassamAuth.user() && KIVO.BassamAuth.isSuper());
        const secAddOn = !!act && !!D.sectionAdd && !(D.isSection && D.isSection(act)) && (realSuper || !!(meU && meU.deptId === act && (meU.role === "dept" || (meU.role === "staff" && meU.mgr))));
        return {
          secAddOn,
          secAdd: async (ev) => {
            try { ev && ev.stopPropagation && ev.stopPropagation(); } catch (e) {}
            const nm = await this.cfmAsk({ title: "إضافة قسم", msg: "قسمٌ جديد تحت «" + (D.activeName() || deptLabel) + "». سقفُه يبدأ نسخةً من سقف الإدارة، وتديره من «الصلاحيات».", input: "اسم القسم", ok: "إضافة" });
            if (!nm) return;
            const r = D.sectionAdd({ name: nm, deptId: act });
            if (!r || !r.ok) { this.setState({ toast: "لم يُضف القسم: " + ((r && r.err) || "تعذّر الإنشاء") }); return; }
            this.setState({ toast: "جارٍ حفظ القسم «" + nm + "»…" });
            const S = KIVO.__BS_SRV, go = () => { try { location.reload(); } catch (e) {} };
            /* المراجعة المستقلة: لا إعادةَ تحميلٍ إن لم يُحفظ — تبقى رسالةُ الرفض أو الانتظار ظاهرة */
            (S && S.flushAsync ? Promise.resolve(S.flushAsync(6000)).catch(() => false) : Promise.resolve(true)).then((ok) => { if (ok === false) this.setState({ toast: "لم يُحفظ القسم «" + nm + "» بعد — راجع رسالة الرفض إن ظهرت، أو تحقّق من الاتصال ثم أعد المحاولة" }); else go(); }, () => this.setState({ toast: "تعذّر حفظ القسم «" + nm + "» — تحقّق من الاتصال ثم أعد المحاولة" }));
          },
          authName: (KIVO.BassamAuth && KIVO.BassamAuth.user() && KIVO.BassamAuth.user().name) || "",
          /* زر الخروج داخل شريحة المستخدم في القائمة الجانبية: يُوقَف تصعيد النقرة كي لا تفتح «بياناتي» قبل الخروج */
          doLogout: (ev) => { try { if (ev && ev.stopPropagation) ev.stopPropagation(); if (ev && ev.preventDefault) ev.preventDefault(); } catch (e) {} if (KIVO.BassamAuth) KIVO.BassamAuth.logout(); },
          deptName: deptLabel,
          deptGroupName: D.activeName() || "",
          deptOpen: open,
          deptToggle: () => this.setState(st => ({ deptOpen: !st.deptOpen })),
          /* مبدّل القائمة الجانبية: المطويّة تنفتح أولاً ثم تنفتح اللوحة —
             وإلا فتبديل عادي. لغير المشرف زرٌّ ساكن (اسم إدارته فقط) */
          sbDeptClick: () => {
            if (!isSuper) return;
            if (!this.state.sidebarOpen) this.setState({ sidebarOpen: true, deptOpen: true });
            else this.setState(st => ({ deptOpen: !st.deptOpen }));
          },
          /* R191 (أخٌ): تلميحُ زرّ الإدارة بمسارها في الشجرة كلِّه (الإدارة العليا ← القطاع ← الإدارة العامة ← الإدارة) — كان المجموعةَ المباشرة وحدها */
          sbDeptTitle: (() => { let pa = []; try { pa = (D.ancestorsOf(act) || []).slice().reverse().map(x => { const n = D.nodeOf(x); return n && n.name; }).filter(Boolean); } catch (e) { pa = []; }
            if (!pa.length && D.activeGroupName()) pa = [D.activeGroupName()];
            return pa.concat([deptLabel]).join(" ← ") + (isSuper && act ? "  ·  انقر لتبديل " + (D.unitAl ? D.unitAl(act) : "الإدارة") : ""); })(),
          sbDeptBtnStyle: isSuper ? "" : "pointer-events:none",
          deptBtnStyle: (isSuper ? "" : "pointer-events:none;") + "height:34px;display:inline-flex;align-items:center;gap:7px;padding:0 12px;border-radius:10px;font-size:12px;font-weight:600;font-family:'Cairo',sans-serif;cursor:pointer;background:var(--bg-a185151810p08);color:var(--fg-x9a7e40);border:1px solid " + (open ? "#b99751;box-shadow:0 0 0 2px rgba(185,151,81,0.15)" : "rgba(185,151,81,0.35)"),
          deptChev: (isSuper ? "" : "display:none;") + "transition:transform .2s;flex-shrink:0;opacity:.6;" + (open ? "transform:rotate(180deg)" : ""),
          /* لا سطر منفصل باسم الإدارة العامة داخل المنسدلة: الشجرة تحته تُظهره
             رأساً للمجموعة والإدارة النشطة مضيئة تحته — فالسطر يكرّره حرفياً
             مرّتين متتاليتين. والمسار الكامل في تلميح الزرّ لمن أراده مطويّاً. */
          deptGrpShow: !!D.activeGroupName(),
          deptGrpName: D.activeGroupName(),
          deptGrpStyle: "padding:0 10px 6px;font-size:9.5px;font-weight:700;color:var(--fg-x9a7e40);"
            + "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-bottom:1px solid var(--bd-a185151810p16);margin-bottom:4px",
          /* R191: قائمةُ الإدارات شجرةٌ كاملة — الشجرةُ نفسُها التي في «الإعدادات ← الإدارات» (D.railTree) بعمقٍ غير محدود:
             الإدارة العليا ← القطاعات ← الإدارات العامة ← الإدارات. لمدير العقدة فرعُه من عقدته، ولمدير النظام الشجرةُ كلُّها.
             كلُّ عقدةٍ مطويّةٌ افتراضاً ولا تُفتح إلا بيد المستخدم (بطلبه) — والمفتوحاتُ في الحالة بالمعرّف (deptNodeOpen).
             والعقدةُ التي ليس تحتها إدارةٌ لا تُعرض. كان: مستويان (الإدارةُ العامة وإداراتُها) — فلا تظهر الإدارةُ العليا ولا القطاعات. */
          deptTree: (() => {
            let rail = []; try { rail = D.railTree() || []; } catch (e) { rail = []; }
            /* F01: مديرُ الإدارة — إدارتُه رأساً وأقسامُها تحتها (لا شجرةَ عقدٍ يملكها) */
            if (secU.length > 1) { const hd = rail.find(r => r.id === secU[0]); rail = hd ? [{ t: "node", id: "_sec", name: hd.name, depth: 0 }].concat(secU.map(x => rail.find(r => r.id === x)).filter(Boolean).map(r => Object.assign({}, r, { depth: 1 }))) : []; }
            if (gmU) { const i0 = rail.findIndex(r => r.t === "node" && r.id === gmU.gid);
              if (i0 < 0) rail = []; else { const d0 = rail[i0].depth, sub = [rail[i0]]; for (let q = i0 + 1; q < rail.length && rail[q].depth > d0; q++) sub.push(rail[q]);
                rail = sub.map(r => Object.assign({}, r, { depth: r.depth - d0 })); } }
            /* لكلّ عقدة: إداراتُها المباشرة · وعددُ الإدارات في فرعها كلِّه */
            const N = rail.length, direct = {}, inSub = {};
            for (let q = 0; q < N; q++) { const r = rail[q]; if (r.t === "dept") continue; const ds = []; let n = 0;
              /* F01: أقسامُ كلّ إدارةٍ مباشرة بعدها (r.sec — عمقُها تحت إدارتها) */
              for (let z = q + 1; z < N && rail[z].depth > r.depth; z++) if (rail[z].t === "dept") { n++; if (rail[z].depth === r.depth + 1 || (rail[z].sec && rail[z].depth === r.depth + 2)) ds.push(rail[z]); }
              direct[q] = ds; inSub[q] = n; }
            const OPEN = this.state.deptNodeOpen || {}, out = []; let hide = -1;
            for (let q = 0; q < N; q++) { const r = rail[q];
              if (hide >= 0) { if (r.depth > hide) continue; hide = -1; }
              if (r.t === "dept") continue;
              if (!inSub[q]) { hide = r.depth; continue; }
              const gk = r.t === "none" ? "_none" : r.id, gOpen = !!OPEN[gk];
              out.push({
                name: r.name, headOn: true, open: gOpen,
                toggle: () => { const m = { ...(this.state.deptNodeOpen || {}) }; if (m[gk]) delete m[gk]; else m[gk] = 1; this.setState({ deptNodeOpen: m }); },
                headStyle: "display:flex;align-items:center;gap:6px;padding:6px 9px;padding-right:" + (9 + 12 * r.depth) + "px;border-radius:8px;cursor:pointer;"
                  + "font-size:10px;font-weight:800;color:var(--fg-x9a7e40);font-family:'Cairo',sans-serif;user-select:none;"
                  + (r.t === "none" ? "opacity:.72" : ""),
                chev: "flex-shrink:0;opacity:.7;transition:transform .2s;" + (gOpen ? "" : "transform:rotate(90deg)"),
                items: direct[q].map(d => ({ name: d.sec ? "↳ " + d.name + " · قسم" : d.name, on: d.id === act,
                pick: () => { if (d.id !== act) { D.setActive(d.id); this.setState({ deptOpen: false, toast: "جارٍ التبديل إلى «" + d.name + "»…" }); const S = KIVO.__BS_SRV, go = () => { try { location.reload(); } catch (e) {} }; (S && S.flushAsync ? Promise.resolve(S.flushAsync(4000)).catch(() => {}) : Promise.resolve()).then(go, go); } else this.setState({ deptOpen: false }); },
                style: "display:flex;align-items:center;gap:8px;padding:8px 10px 8px 10px;margin-right:" + (10 + 12 * r.depth + (d.sec && r.id !== "_sec" ? 12 : 0)) + "px;border-radius:8px;font-size:12px;cursor:pointer;transition:background .15s;font-family:'Cairo',sans-serif;border-right:1px solid var(--bd-a185151810p2);" + (d.id === act ? "background:var(--bg-a185151810p08);color:var(--fg-x9a7e40);font-weight:600" : "color:var(--fg-x141414);font-weight:400") }))
              });
              if (!gOpen) hide = r.depth;
            }
            return out;
          })()
        };
      })()),
      mainStyle: "flex:1;min-width:0;margin-right:" + W + "px;padding-top:82px;" + slide,
      goKpis: go("kpis"),
      goDstats: go("dstats"),
      goEmployees: go("employees"),
      /* لوحةُ الحوار تُوقف النقرةَ عن خلفيّتها (التي تُلغي) — لحوار التأكيد وحوار الاستيراد معاً، مفتوحاً كان حوارُ الاستيراد أم لا */
      bkcStop: (e) => { if (e && e.stopPropagation) e.stopPropagation(); },
      ...((() => {
        const c = this.state.bkConf;
        const off = { bkcOpen: false, bkcPick: true, bkcConfirm: false, bkcCur: 0, bkcFile: 0, bkcOver: 0, bkcFresh: 0,
          bkcMergeDesc: "", bkcReplaceDesc: "", bkcWarn: "", bkcHead: "", bkcSub: "",
          bkcCancel: () => {}, bkcMerge: () => {}, bkcAskReplace: () => {}, bkcDoReplace: () => {}, bkcBack: () => {} };
        if (!c) return off;
        const D = KIVO.BassamDepts;
        return {
          bkcOpen: true, bkcPick: this.state.bkStep !== "confirm", bkcConfirm: this.state.bkStep === "confirm",
          bkcCur: "—", bkcFile: c.file, bkcOver: "—", bkcFresh: "—",
          /* الوجهة قد لا تكون الإدارة المفتوحة — تُسمّى صراحةً حتى لا يستورد أحدٌ لغير ما ظنّ */
          bkcHead: "إدارة «" + (c.dest || (D ? D.activeName() : "")) + "» تحتوي بيانات",
          bkcSub: "ملف النسخة سيُستورد داخل إدارة «" + (c.dest || (D ? D.activeName() : "")) + "» — اختر طريقة التعامل مع بياناتها الحالية.",
          bkcMergeDesc: "تُضاف مجموعات البيانات المفقودة فقط؛ المجموعات والمجالات الموجودة تبقى كما هي، دون دمج السجلات داخلها.",
          bkcReplaceDesc: "يعرض الخادم جرد الإدارة الهدف، ثم يستبدل مواردها المعلنة بالنسخة في معاملة واحدة ويحفظ لقطة ما قبلها.",
          bkcWarn: "الإدارات الأخرى والمجالات العامة لا تتأثر. ستُراجع الصلاحيات والنطاق على الخادم قبل التأكيد النهائي.",
          bkcCancel: () => { if(this._bkSaving||this._bkPend&&this._bkPend.uncertain){this.bkToast("تعذّر تأكيد نتيجة الطلب؛ أعد المحاولة نفسها قبل إغلاق الملف",true);return;}this._bkPend = null; this.setState({ bkConf: null, bkStep: "pick" }); this.bkToast("أُلغي الاستيراد — لم يتغيّر شيء"); },
          bkcMerge: () => this.bkCommit("merge"),
          bkcAskReplace: () => this.setState({ bkStep: "confirm" }),
          bkcBack: () => this.setState({ bkStep: "pick" }),
          bkcDoReplace: () => this.bkCommit("replace"),
        };
      })()),
      /* وضع التطبيق المثبّت: لا شريط متصفح — فيُعرض زر التحديث */
      notAppMode: !((() => { try { return (window.matchMedia && (window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: fullscreen)").matches || window.matchMedia("(display-mode: minimal-ui)").matches)) || window.navigator.standalone === true; } catch (e) { return false; } })()),
      toastOn: !!this.state.toast, toastMsg: this.state.toast,
      toggleTheme: () => { const t = this.state.theme === "dark" ? "light" : "dark"; this.applyTheme(t); this.setState({ theme: t }); },
      isDarkMode: this.state.theme === "dark", isLightMode: this.state.theme !== "dark",
      themeTitle: this.state.theme === "dark" ? "الوضع النهاري" : "الوضع الليلي",
      ...(() => { const c = this.state.cfm; if (!c) return { cfmOn: false, cfmNoOn: true, cfmTitle: "", cfmMsg: "", cfmOk: "", cfmCancel: "", cfmOkStyle: "", cfmIconStyle: "", cfmTypedOn: false, cfmTypedLabel: "", cfmTypedVal: "", cfmTypedInput: () => {}, cfmYes: () => {}, cfmNo: () => {} };
        const base = "height:38px;padding:0 18px;border-radius:10px;font-size:13px;font-weight:600;border:0;cursor:pointer;font-family:'Cairo',sans-serif;color:var(--fg-xffffff);background:";
        const match = !c.typed || String(c.val || "").trim() === c.typed;   /* KIVO_265: التأكيدُ المكتوب (والإدخالُ الفارغ يُحلّ "" فيُعامَل إلغاءً) */
        return { cfmOn: true, cfmNoOn: !c.info, cfmTitle: c.title, cfmMsg: c.msg, cfmOk: c.ok, cfmCancel: c.cancel, cfmOkStyle: base + (c.danger ? "#dc2626" : "#b99751") + (match ? "" : ";opacity:.45;cursor:not-allowed"),
          cfmTypedOn: !!(c.typed || c.input), cfmTypedLabel: c.input || ("للتأكيد اكتب اسم «" + c.typed + "» كما هو"), cfmTypedVal: c.val || "",
          cfmTypedInput: (ev) => this.setState({ cfm: { ...this.state.cfm, val: ev.target.value } }),
          cfmIconStyle: "width:42px;height:42px;border-radius:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;" + (c.danger ? "background:var(--bg-xfef2f2);border:1px solid var(--bd-xfecaca);color:var(--fg-xb91c1c)" : "background:var(--bg-xfffbeb);border:1px solid var(--bd-xfde68a);color:var(--fg-xb45309)"),
          cfmYes: () => { match && this.cfmClose(true); }, cfmNo: () => this.cfmClose(false) }; })(),
      ...this._nfVals(),
      goPlan: go("plan"), goDaily: go("daily"), goDreport: go("dreport"), goPlanning: go("planning"), goIrshad: go("irshad"), goSeized: go("seized"), goAward: go("award"), goLinks: go("links"),
      ...((() => {
        let pr = null;
        try { if (KIVO.BassamAuth && KIVO.BassamAuth.display) pr = KIVO.BassamAuth.display(); } catch (e) {}
        if (!pr) pr = { name: "مدير النظام", role: "مدير النظام" };
        return { profName: pr.name, profRole: pr.role, profInitial: (pr.name || "؟").trim().charAt(0) };
      })()),
      __nav: (KIVO.BassamNav = { go: (k) => { try { go(k)(); } catch (e) {} } }),
      goAdmin: () => { KIVO.__ADMIN_MODE = "dept"; this._savePage("admin"); this.setState({ active: "admin" }); }, goProfile: (ev) => { try { if (ev && ev.target && ev.target.closest && ev.target.closest(".s-logout")) return; } catch (e) {} go("profile")(); }, bsVerTxt: "الإصدار " + (KIVO.__BS_VER || ""),
      pageName: this._pageNames()[a] || "لوحة التحكم",
      isKpis: ap === "kpis", isDstats: ap === "dstats",
      isEmployees: ap === "employees", isStaffing: ap === "staffing", isDaily: ap === "daily", isDreport: ap === "dreport", isPlanning: ap === "planning", isTasks: ap === "tasks", isIrshad: ap === "irshad", isSeized: ap === "seized", isAward: ap === "award", isSysAdmin: ap === "sysadmin", isPlan: ap === "plan", isAdmin: ap === "admin", isProfile: ap === "profile", isPlaceholder: !this.state.navPending && !["kpis","dstats","employees","planning","staffing","plan","daily","dreport","tasks","irshad","seized","award","admin","sysadmin","profile","links"].includes(a),
      isLinks: ap === "links",
      ...((() => {
        /* «مواقع ذات صلة» — قائمة روابط تُقرأ من إعدادات المنصة (links) ويحرّرها مدير النظام من الصفحة نفسها */
        if (a !== "links") return { lkRows: [], lkEmpty: false, lkCanEdit: false, lkFormOn: false, lkT: "", lkU: "", lkD: "", lkErr: "", lkSub: "", lkEmptyHint: "", lkAdd: () => {}, lkSave: () => {}, lkCancel: () => {}, lkOnT: () => {}, lkOnU: () => {}, lkOnD: () => {} };
        const B = KIVO.BassamPlat, P = (B && B.get && B.get()) || {}, list = Array.isArray(P.links) ? P.links : [];
        const sup = !!(KIVO.BassamAuth && KIVO.BassamAuth.isSuper && KIVO.BassamAuth.isSuper());
        const f = this.state.lkForm || null, setF = (k, ev) => { const v = ev && ev.target ? ev.target.value : ev; this.setState({ lkForm: Object.assign({}, this.state.lkForm || { t: "", u: "", d: "", i: -1 }, { [k]: v }), lkErr: "" }); };
        const save = (arr) => { try { const r = B.set(Object.assign({}, P, { links: arr })); if (!r || !r.ok) this.setState({ lkErr: (r && r.err) || "تعذّر الحفظ" }); } catch (e) { this.setState({ lkErr: "تعذّر الحفظ" }); } };
        const host = (u) => { try { return new URL(u).host.replace(/^www\./, ""); } catch (e) { return ""; } };
        return {
          lkRows: list.map((x, i) => ({ t: x.t || x.u, u: x.u, d: x.d || "", host: host(x.u), ini: String(x.t || x.u || "؟").trim().charAt(0), canEdit: sup,
            edit: () => this.setState({ lkForm: { t: x.t || "", u: x.u || "", d: x.d || "", i: i }, lkErr: "" }),
            del: () => { save(list.filter((_, j) => j !== i)); } })),
          lkEmpty: !list.length && !f, lkCanEdit: sup, lkFormOn: !!f, lkT: f ? f.t : "", lkU: f ? f.u : "", lkD: f ? f.d : "", lkErr: this.state.lkErr || "",
          lkSub: list.length ? KIVO.BassamCount(list.length, "موقع") + " — تُفتح في نافذة جديدة" : "روابط الجهات والأنظمة التي يحتاجها موظفو الإدارة",
          lkEmptyHint: sup ? "أضف روابط الأنظمة والجهات ذات الصلة من زر «إضافة موقع»" : "سيضيفها مدير النظام",
          lkAdd: () => this.setState({ lkForm: { t: "", u: "", d: "", i: -1 }, lkErr: "" }),
          lkCancel: () => this.setState({ lkForm: null, lkErr: "" }),
          lkOnT: (ev) => setF("t", ev), lkOnU: (ev) => setF("u", ev), lkOnD: (ev) => setF("d", ev),
          lkSave: () => { const g = this.state.lkForm || {}; const t = String(g.t || "").trim(), u = String(g.u || "").trim(), d = String(g.d || "").trim();
            if (!t) return this.setState({ lkErr: "اكتب اسم الموقع" });
            if (!/^https?:\/\/[^\s]+$/i.test(u)) return this.setState({ lkErr: "الرابط يجب أن يبدأ بـ http:// أو https://" });
            const arr = list.slice(); const item = { t: t, u: u, d: d }; if (g.i >= 0 && g.i < arr.length) arr[g.i] = item; else arr.push(item);
            save(arr); this.setState({ lkForm: null, lkErr: "" }); }
        };
      })()),
      /* KIVO_254 · AUD-020: عنوانٌ من المستوى الأول لكل شاشة (مخفيٌّ بصرياً — لقارئ الشاشة) · عنوانُ شاشة الاحتياط لا يكون فارغاً */
      screenTitle: (labels[a] || (a === "profile" ? "صفحتي" : a === "help" ? "المساعدة" : "المنصة التشغيلية")),
      placeholderTitle: labels[a] || "شاشةٌ غيرُ متاحة",
      placeholderSub: "هذه الشاشة قيد إعادة البناء ضمن ملفات التوثيق — ستُربط بهذا الإطار فور اكتمالها.",
    };
  }
}
