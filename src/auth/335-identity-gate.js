/* ═══ الهويةُ وشاشةُ الدخول: توحيدُ مفتاح الموظف · قفلُ التطبيق · البوابة · الاستيراد · حوارُ كلمة المرور ═══
   KIVO_257 · AUD-010: جزءٌ 6/6 من «src/auth/330-auth-perm.js» السابقة — مقسومةً بالمسؤولية بـtools/split_iife.mjs (tools/split/330-auth-perm.json)؛
   التبعياتُ بين الأجزاء صريحةٌ هنا وعبر المساحة الداخلية window.__BS_I.auth وحدها. */
(function(){
  var I = KIVO.__BS_I && KIVO.__BS_I.auth; if (!I || I.dead) return;   /* الجزءُ الأول لم يُحمَّل أو خرج مبكّراً ⇒ لا شيءَ بعده — كالـIIFE الواحدة */
  /* ← من الأجزاء السابقة */
  var D = I.D, K_SESS = I.K_SESS, RAW = I.RAW, clearMc = I.clearMc, cur = I.cur, curDept = I.curDept,
      gmDepts = I.gmDepts, gmEnsureActive = I.gmEnsureActive, hashPw = I.hashPw, isMgrKey = I.isMgrKey, login = I.login,
      needsPwChange = I.needsPwChange, permSave = I.permSave, permStore = I.permStore, pwCheck = I.pwCheck, pwRuleText = I.pwRuleText, rawUsers = I.rawUsers, taken = I.taken,
      touch = I.touch, u0 = I.u0, unCheck = I.unCheck, writeUsers = I.writeUsers;
  /* Account identifiers and their permission links are never rewritten on boot.
     Only the explicit canonical server identity migration may change them. */
  D.setScopeGuard(function(id){
    var u = cur(); if (!u) return null; if (u.role === 'super') return id;
    /* F01: مديرُ الإدارة (حسابُها · حاملُ الشارة) يقف في أقسام إدارته كما في إدارته — والخادمُ يحكم (018 secMgrOf) */
    if ((u.role === 'dept' || (u.role === 'staff' && u.mgr)) && id && D.parentDeptOf && D.parentDeptOf(id) === u.deptId) return id;
    if (u.role === 'dept' || u.role === 'staff') return u.deptId || null;
    if (u.role === 'gm') { var gd = gmDepts(u.gid); return gd.some(function(d){ return d.id === id; }) ? id : ((gd[0] || {}).id || null); }
    return null;
  });
  if (u0 && u0.role === 'gm') gmEnsureActive(u0);
  if (u0 && !needsPwChange()) {
    ['click','keydown','mousemove'].forEach(function(ev){ try { window.addEventListener(ev, touch, { passive:true }); } catch(e){} });
    /* R9 (W1): اللمسُ والقلمُ نشاطٌ أيضاً — كان مستخدمُ اللوحي الذي يمرّر أو يسحب أو يرسم على الخريطة ساعتين بلا نقرة
       يُعدّ خاملاً فتُقفل جلستُه («انتهت الجلسة») وهو يعمل. في الالتقاط (فلا يحجبها معالجٌ يوقف الحدث) · ومخفَّفةً:
       touch() تكتب مرةً في الدقيقة على الأكثر، وهذه لا تستدعيها أكثرَ من مرةٍ كلَّ 15 ثانية (الحركةُ المستمرّة 60–120 حدثاً في الثانية) */
    (function(){
      var last = 0, soft = function(){ var n = Date.now(); if (n - last < 15000) return; last = n; touch(); };
      ['pointerdown','pointermove','touchstart','touchmove','wheel'].forEach(function(ev){ try { window.addEventListener(ev, soft, { passive:true, capture:true }); } catch(e) { /* لا يمنع العرض — يُتجاوز بصمت */ } });
      try { document.addEventListener('scroll', soft, { passive:true, capture:true }); } catch(e) { /* لا يمنع العرض — يُتجاوز بصمت */ }
    })();
    /* ── حارس الجلسة ────────────────────────────────────────────────────────────
       كانت البوابة تُقيَّم مرة واحدة عند التحميل فقط: تنقضي الجلسة (خمول ساعتين أو
       عمر ١٢ ساعة) والتطبيق يظل معروضاً بكامله. وكل ما يسأل عن المستخدم بعدها
       يحصل على null، فترتفع قيود الموظف بدل أن تشتدّ. الآن تُفحص الجلسة دورياً
       وعند العودة إلى التبويب، فتُقفل الشاشة فور انقضائها. */
    (function(){
      var shown = false, timer = null;
      function lock(){
        if (shown) return; shown = true;
        if (timer) { clearInterval(timer); timer = null; }
        var d = document.createElement('div');
        d.setAttribute('dir','rtl');
        d.style.cssText = "position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;"
          + "background:var(--bg-a2637460p97);font-family:'Cairo',sans-serif;text-align:center;padding:24px";
        d.innerHTML = '<div style="max-width:420px">'
          + '<div style="font-size:19px;font-weight:600;color:var(--fg-xffffff);margin-bottom:10px">انتهت الجلسة</div>'
          + '<div style="font-size:13.5px;line-height:2;color:var(--fg-a2382242030p75);margin-bottom:22px">أُقفلت الشاشة حمايةً للبيانات على محطة مشتركة. كل ما حُفظ قبل الآن موجود كما هو.</div>'
          + '<button id="bs-relogin" style="font-family:\'Cairo\',sans-serif;font-size:13.5px;font-weight:400;padding:9px 26px;border-radius:10px;border:1px solid var(--bd-a187150970p5);background:var(--bg-xb99751);color:var(--text-on-brand);cursor:pointer">تسجيل الدخول</button>'
          + '</div>';
        try { document.body.appendChild(d); } catch(e){ location.reload(); return; }
        var b = document.getElementById('bs-relogin');
        if (b) b.addEventListener('click', function(){ location.reload(); });
      }
      function check(){ if (!cur()) lock(); }
      timer = setInterval(check, 30000);
      try { document.addEventListener('visibilitychange', function(){ if (!document.hidden) check(); }); } catch(e){}
      try { window.addEventListener('focus', check); } catch(e){}
    })();
    return;                                        /* مسجّل دخول — التطبيق يعمل */
  }

  /* ── قفل التطبيق ────────────────────────────────────────────────────────────
     كانت البوابة طبقة معروضة فوق تطبيق مرسوم بالكامل: الجلسة null ومع ذلك
     كل الشاشات موجودة في الـDOM وعناصر التنقل قابلة للنقر. الآن يُزال جذر
     التطبيق قبل أن يُركّبه المحرك، فلا توجد أي بيانات في الصفحة قبل الدخول. */
  var lockCss = document.createElement('style');
  lockCss.textContent = 'html.bs-locked body > *:not(#bsLoginGate):not(#bsFatal):not(#bs-dark):not(#bs-dark-tint){display:none!important}html.bs-locked{background:var(--bg-x1a252e)}';   /* طبقتا الوضع الليلي مرئيتان على شاشة الدخول — لا بيانات فيهما */
  (document.head || document.documentElement).appendChild(lockCss);
  document.documentElement.classList.add('bs-locked');
  var mo = new MutationObserver(function(muts){
    for (var i=0;i<muts.length;i++){
      var an = muts[i].addedNodes;
      for (var j=0;j<an.length;j++){
        var n = an[j];
        if (n.nodeType !== 1) continue;
        var tag = n.tagName;
        if (tag === 'X-DC' || (tag === 'SCRIPT' && n.getAttribute && n.getAttribute('data-dc-script') !== null)) {
          try { n.remove(); } catch(e){}
        }
      }
    }
  });
  try { mo.observe(document.documentElement, { childList:true, subtree:true }); } catch(e){}

  function gate(){
    if (document.getElementById('bsLoginGate')) return;
    var st = document.createElement('style');
    st.textContent = ".login-screen{position:fixed;inset:0;height:100dvh;z-index:2147482000;display:flex;flex-direction:row-reverse;background:var(--bg-x1a252e);overflow:hidden;font-family:'Cairo',sans-serif}.login-screen button,.login-screen input,.login-screen select,.login-screen textarea{font-family:inherit;font-feature-settings:inherit}"
    + ".login-hero{flex:1.15;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:54px 56px;overflow:hidden;background:linear-gradient(150deg,var(--bg-x1a252e) 0%,var(--bg-x25343f) 45%,var(--bg-x2e4150) 100%)}"
    + ".login-hero-deco{position:absolute;inset:0;z-index:1;pointer-events:none;background-image:var(--brand-pattern);background-size:96px 96px;background-position:center;-webkit-mask-image:radial-gradient(ellipse at center,#000 30%,transparent 78%);mask-image:radial-gradient(ellipse at center,#000 30%,transparent 78%)}"
    + ".login-hero-deco::before,.login-hero-deco::after{content:'';position:absolute;border-radius:50%}"
    + ".login-hero-deco::before{width:560px;height:560px;background:radial-gradient(circle,var(--bg-a187150970p35) 0%,var(--bg-a187150970p18) 28%,transparent 66%);top:-120px;right:-100px;animation:loginFloat 16s ease-in-out infinite}"
    + ".login-hero-deco::after{width:460px;height:460px;background:radial-gradient(circle,var(--bg-a2051741280p25) 0%,var(--bg-a2051741280p12) 30%,transparent 66%);bottom:-100px;left:-60px;animation:loginFloat 20s ease-in-out infinite reverse}"
    + "@keyframes loginFloat{0%,100%{transform:translate(0,0)}50%{transform:translate(36px,36px)}}"
    + ".login-hero-content{position:relative;z-index:3;max-width:600px;width:100%;text-align:center;display:flex;flex-direction:column;align-items:center;animation:heroIn .8s cubic-bezier(.16,1,.3,1)}"
    + "@keyframes heroIn{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}"
    + ".login-hero-emblem{width:108px;height:108px;border-radius:28px;display:flex;align-items:center;justify-content:center;margin-bottom:32px;background:linear-gradient(145deg,var(--bg-a2382242030p12),var(--bg-a187150970p05));border:1px solid var(--bd-a187150970p25);box-shadow:var(--shadow-elevated)}"
    + ".login-hero-title{font-size:clamp(20px,2.5vw,34px);font-weight:700;color:var(--fg-xffffff);line-height:1.3;margin:0 0 22px;letter-spacing:-0.01em;text-shadow:0 2px 20px rgba(0,0,0,.3);white-space:nowrap}"
    + ".login-hero-desc{font-size:16px;line-height:2.1;color:var(--fg-a2382242030p78);margin:0 auto;font-weight:400;max-width:560px;text-align:center}"
    + ".login-hero-divider{display:flex;align-items:center;gap:20px;width:100%;max-width:600px;margin:38px auto 0}"
    + ".login-hero-divider::before,.login-hero-divider::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--bg-a187150970p5),transparent)}"
    + ".login-hero-divider span{font-size:13px;font-weight:600;letter-spacing:4px;color:var(--fg-xdcc4a0);white-space:nowrap;text-shadow:0 1px 8px rgba(187,150,97,.3)}"
    + ".login-hero-foot{position:absolute;bottom:32px;left:0;right:0;z-index:3;font-size:12px;color:var(--fg-a2382242030p45);font-weight:400;text-align:center}"
    + ".login-pane{flex:1;display:flex;align-items:center;justify-content:center;padding:40px 30px;background:var(--bg-xffffff);overflow-y:auto}"
    + ".login-card{width:100%;max-width:400px;animation:loginIn .7s cubic-bezier(.16,1,.3,1)}"
    + "@keyframes loginIn{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}"
    + "@keyframes loginShake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}"
    + ".login-brand{text-align:center;margin-bottom:32px}"+ ".login-pane-emblem{display:none;width:78px;height:78px;border-radius:23px;margin:0 auto 18px;align-items:center;justify-content:center;background:linear-gradient(145deg,var(--bg-x25343f),var(--bg-x1a252e));border:1px solid var(--bd-a187150970p32);box-shadow:var(--shadow-elevated)}"+ ".login-pane-emblem svg{width:46px;height:46px}"+ "@media(max-width:860px){.login-pane-emblem{display:flex}}"
    + ".login-co{font-size:clamp(14px,1.5vw,19px);font-weight:700;color:var(--fg-x25343f);letter-spacing:-0.01em;white-space:nowrap}"
    + ".login-sub{font-size:12.5px;color:var(--fg-xbb9661);font-weight:400;margin-top:4px}"
    + ".login-field{margin-bottom:18px}.login-hint{font-size:10.5px;line-height:1.6;color:var(--fg-x8a929b);margin-top:5px;font-weight:600;text-align:center}"
    + ".login-field label{display:block;font-size:12.5px;font-weight:600;color:var(--fg-x4a5c68);margin-bottom:8px;text-align:center}"
    + ".login-input-wrap{position:relative;display:flex;align-items:center;background:var(--bg-xfbfaf7);border:1.5px solid var(--bd-a3752630p12);border-radius:13px;transition:all .2s;overflow:hidden}.login-input-wrap.err{border-color:var(--bd-xc2410c)!important;background:var(--bg-xfff8f6)}"
    + ".login-input-wrap:focus-within{border-color:var(--bd-xbb9661);box-shadow:0 0 0 4px rgba(187,150,97,.12)}"
    + ".login-ico-box{display:flex;align-items:center;justify-content:center;width:52px;height:52px;flex-shrink:0;color:var(--text-on-brand);background:linear-gradient(135deg,var(--bg-xdcc4a0),var(--bg-xbb9661))}"
    + ".login-input-wrap:focus-within .login-ico-box{background:linear-gradient(135deg,var(--bg-xc9a876),var(--bg-xa37f4c))}"
    + ".login-input-wrap input{flex:1;width:100%;padding:14px 16px;border:none;background:transparent;color:var(--fg-x25343f);font-family:'Cairo',sans-serif;font-size:14px;font-weight:500;text-align:center}"
    + ".login-input-wrap input::placeholder{color:var(--fg-x8a99a5)}"
    + ".login-input-wrap input:focus{outline:none}"
    + ".login-eye{flex-shrink:0;width:42px;height:52px;border:none;background:transparent;cursor:pointer;color:var(--fg-x4a5c68);display:flex;align-items:center;justify-content:center;transition:all .2s}"
    + ".login-eye:hover{color:var(--fg-xbb9661)}"
    + ".login-error{font-size:12.5px;color:var(--fg-xf87171);text-align:center;min-height:18px;margin-bottom:6px;font-weight:600;opacity:0;transition:opacity .2s}"
    + ".login-error.show{opacity:1}"
    + ".login-btn{width:100%;padding:15px;border:none;border-radius:13px;cursor:pointer;margin-top:8px;background:linear-gradient(135deg,var(--bg-xdcc4a0),var(--bg-xbb9661));color:var(--fg-x1a1206);font-family:'Cairo',sans-serif;font-size:15px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:9px;transition:all .25s;box-shadow:0 10px 26px rgba(187,150,97,.3)}"
    + ".login-btn:hover{transform:translateY(-2px);box-shadow:0 14px 34px rgba(187,150,97,.45);filter:brightness(1.05)}"
    + ".login-btn:active{transform:translateY(0)}"
    + ".login-pane-foot{font-size:10.5px;font-weight:400;color:var(--fg-x8a99a5);text-align:center;margin-top:30px;white-space:nowrap}"
    + "@media(max-width:860px){.login-hero{display:none}.login-pane{flex:1}}@media(max-width:560px){.login-pane{padding:26px 20px calc(26px + env(safe-area-inset-bottom))!important;align-items:flex-start!important;padding-top:max(26px,env(safe-area-inset-top))!important}.login-card{max-width:none!important;margin:auto 0!important}.login-co{font-size:17px!important}.login-sub{font-size:12px!important}.login-brand{margin-bottom:22px!important}.login-field{margin-bottom:15px!important}.login-field label{text-align:center!important;font-size:13px!important}#bsUserCnt,#bsPassCnt{text-align:center!important}.login-input-wrap input{font-size:16px!important;padding:15px 16px!important}.login-btn{padding:17px!important;font-size:16px!important;border-radius:14px!important}.login-pane-foot{margin-top:22px!important;font-size:10px!important}}";
    document.head.appendChild(st);
    st.textContent += ".login-note{font-size:12.5px;line-height:1.9;color:var(--fg-x8a6e32);background:var(--bg-a187150970p1);border:1px solid var(--bd-a187150970p28);border-radius:11px;padding:10px 13px;margin-bottom:16px;text-align:center;font-weight:400}"
    + ".login-ok{font-size:12.5px;color:var(--fg-x0f7a4a);text-align:center;min-height:18px;margin-bottom:6px;font-weight:400}"
    + ".login-btn[disabled]{opacity:.6;cursor:progress;transform:none!important}@media(pointer:coarse){.login-screen input{font-size:16px!important}}"
    + ".login-restore{margin-top:18px;display:flex;flex-direction:column;align-items:center}"
    + ".login-restore-btn{width:42px;height:42px;border:1px solid var(--bd-xe1e6ea);border-radius:9999px;background:var(--bg-xffffff);color:var(--fg-x8a929b);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s}"
    + ".login-restore-btn:hover{border-color:var(--bd-xbb9661);color:var(--fg-x8a6e32);background:var(--bg-a187150970p06);transform:translateY(-1px)}"
    + ".login-restore-btn[aria-busy='true']{opacity:.6;cursor:progress}"
    + ".login-restore-msg{font-size:12px;font-weight:500;text-align:center;margin-top:10px;line-height:1.7;min-height:0}"
    /* زرّ الإضاءة تحت زر الدخول (مكان زر الاستيراد سابقاً) — بعنوانه، لا في الزاوية */
    + ".login-theme{margin-top:18px;display:flex;flex-direction:column;align-items:center;gap:6px}"
    + ".login-theme-btn{width:42px;height:42px;border:1px solid var(--bd-a185151810p35);border-radius:9999px;background:var(--bg-xffffff);color:var(--fg-x53565a);display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:var(--shadow-soft);transition:all .2s}"
    + ".login-theme-btn:hover{border-color:var(--bd-xbb9661);color:var(--fg-x8a6e32);transform:translateY(-1px)}"
    + ".login-theme small{font-size:10.5px;color:var(--fg-x8a929b);font-weight:600}"
    /* الشعار في الوضع الليلي: طبقة الليل تقلب الألوان، فيُرسم بلون فاتح كي يخرج كحلياً بذهبه كما في النهار */
    + "";
    var EMBLEM = '<svg viewBox="0 0 100 100" width="64" height="64" aria-hidden="true"><path d="M50 8 C50 8 30 24 30 46 C30 57 39 66 50 66 C61 66 70 57 70 46 C70 24 50 8 50 8 Z" fill="none" stroke="var(--fg-xdcc4a0)" stroke-width="2.5"></path><circle cx="50" cy="44" r="8" fill="var(--fg-xbb9661)"></circle><path d="M28 72 L72 72 M32 72 L32 92 M68 72 L68 92 M40 72 L40 86 M60 72 L60 86 M50 66 L50 92" stroke="var(--fg-xdcc4a0)" stroke-width="2" fill="none"></path></svg>';
    var forced = !!u0;                     /* مسجّل دخول لكن كلمة مروره ضعيفة */
    var needUn = !!(u0 && !unCheck(u0.un).ok);   /* اسم مستخدم قديم (admin مثلاً) — يُطلب رقم جوال/هوية */
    var w = document.createElement('div');
    w.id = 'bsLoginGate';
    w.className = 'login-screen';
    w.setAttribute('dir','rtl');
    var pane = forced
      ? '<div class="login-brand">'
        +   '<div class="login-pane-emblem">' + EMBLEM + '</div>'
        +   '<div class="login-co">تأمين الحساب</div>'
        +   '<div class="login-sub">' + (needUn ? 'أول دخول — عيّن بيانات دخولك للمتابعة' : 'كلمة المرور الحالية ضعيفة — غيّرها للمتابعة') + '</div>'
        + '</div>'
        + '<div class="login-form">'
        +   '<div class="login-note">' + (needUn ? 'حدّد رقم جوالك أو هويتك اسمَ مستخدم، ثم كلمة مرور وفق متطلبات دورك.' : 'اختر كلمة مرور جديدة: ' + pwRuleText(u0 && u0.role)) + '</div>'
        +   (needUn ? '<div class="login-field"><label>اسم المستخدم — رقم الجوال أو الهوية</label><div class="login-input-wrap">'
        +     '<span class="login-ico-box"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></span>'
        +     '<input type="text" inputmode="numeric" id="bsUn1" placeholder="10 أرقام" maxlength="10" autocomplete="username"></div></div>' : '')
        +   '<div class="login-field"><label>كلمة المرور الجديدة</label><div class="login-input-wrap">'
        +     '<span class="login-ico-box"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></span>'
        +     '<input type="password" id="bsPw1" placeholder="كلمة مرور جديدة" autocomplete="new-password"></div></div>'
        +   '<div class="login-field"><label>تأكيد كلمة المرور</label><div class="login-input-wrap">'
        +     '<span class="login-ico-box"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg></span>'
        +     '<input type="password" id="bsPw2" placeholder="أعد كتابته" autocomplete="new-password"></div></div>'
        +   '<div class="login-error" id="bsGateErr"></div>'
        +   '<button class="login-btn" id="bsPwSave">حفظ بيانات الدخول</button>'
        +   '<div class="login-pane-foot"><a href="#" id="bsPwOut" style="color:var(--fg-x8a99a5)">تسجيل الخروج</a></div>'
        + '</div>'
      : '<div class="login-brand">'
        +   '<div class="login-pane-emblem">' + EMBLEM + '</div>'
        +   '<div class="login-co">المنصة التشغيلية</div>'
        +   '<div class="login-sub">سجّل دخولك للمتابعة إلى لوحة التحكم</div>'
        + '<div id="bsSrvState" style="font-size:11px;font-weight:600;margin-top:6px;line-height:1.9"></div>'
        + '</div>'
        + '<div class="login-form">'
        +   '<div class="login-field"><label>اسم المستخدم</label><div class="login-input-wrap">'
        +     '<span class="login-ico-box"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></span>'
        +     '<input type="text" inputmode="numeric" id="bsGateUser" placeholder="رقم الجوال أو الهوية" autocomplete="username"></div>'
        +     '<div id="bsUserCnt" style="display:none;font-size:10px;font-weight:600;margin-top:4px;text-align:left;direction:ltr;color:var(--fg-x8a929b);font-feature-settings:\'tnum\'"></div>'
        +     '<div class="login-hint">رقم هويتك أو رقم جوالك — 10 أرقام، وكلاهما يصلح</div></div>'
        +   '<div class="login-field"><label>كلمة المرور</label><div class="login-input-wrap">'
        +     '<span class="login-ico-box"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></span>'
        +     '<input type="password" id="bsGatePass" placeholder="كلمة المرور" autocomplete="current-password">'
        +     '<button class="login-eye" id="bsGateEye" type="button" title="إظهار كلمة المرور"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path><circle cx="12" cy="12" r="3"></circle></svg></button></div>'
        +     '<div id="bsPassCnt" style="display:none;font-size:10px;font-weight:600;margin-top:4px;text-align:left;direction:ltr;color:var(--fg-x8a929b);font-feature-settings:\'tnum\'"></div>'
        +     '<div class="login-hint">استخدم كلمة المرور الخاصة بحسابك</div></div>'
        +   '<div class="login-error" id="bsGateErr"></div>'
        +   '<button class="login-btn" id="bsGateBtn"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><path d="m10 17 5-5-5-5"></path><path d="M15 12H3"></path></svg> تسجيل الدخول</button>'
        +   '<div class="login-theme"><button id="bsGateTheme" type="button" class="login-theme-btn"></button><small id="bsGateThemeLbl"></small></div>'
        +   '<div class="login-restore">'
        +     '<label class="login-restore-btn" id="bsRestoreLbl" title="استيراد نسخة شاملة">'
        +       '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="M17 8l-5-5-5 5"></path><path d="M12 3v12"></path></svg>'
        +       '<input type="file" id="bsRestoreFile" accept="application/json,.json" style="display:none">'
        +     '</label>'
        +     '<div class="login-restore-msg" id="bsRestoreMsg"></div>'
        +   '</div>'
        +   '<div class="login-pane-foot">المنصة التشغيلية · جميع الحقوق محفوظة <span id="bsVer" style="font-feature-settings:\'tnum\'" title="رقم إصدار هذه الصفحة — للتأكد أن المتصفح يعرض آخر نسخة مرفوعة">· إصدار ' + (KIVO.__BS_VER || '') + '</span></div>'
        + '</div>';
    w.innerHTML = ''
    + '<div class="login-hero" role="complementary" aria-label="تعريفٌ بالمنصة">'
    +   '<div class="login-hero-deco"></div>'
    +   '<div class="login-hero-content">'
    +     '<div class="login-hero-emblem">' + EMBLEM + '</div>'
    +     '<h1 class="login-hero-title">المنصة التشغيلية</h1>'
    +     '<p class="login-hero-desc">منظومة رقمية متكاملة تجمع إدارات الحرم المكي الشريف في مكان واحد — كل إدارة ببياناتها وصلاحياتها المستقلة، بدخول موحد واحد.</p>'
    +     '<div class="login-hero-divider"><span>AL HARAMAIN</span></div>'
    +   '</div>'
    + '</div>'
    + '<div class="login-pane" role="main" aria-label="تسجيل الدخول"><div class="login-card">' + pane + '</div></div>'
    + (forced ? '<button id="bsGateTheme" type="button" style="position:absolute;top:18px;left:18px;z-index:6;width:38px;height:38px;border-radius:9999px;border:1px solid var(--bd-a185151810p35);background:var(--bg-a2552552550p92);color:var(--fg-x53565a);cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-soft)"></button>' : '');
    document.body.appendChild(w);
    try { if (KIVO.BassamPlat) KIVO.BassamPlat.gate(w); } catch (ePl) {}

    /* زرُّ الإضاءة في شاشة الدخول — السمةُ الحقيقية نفسُها: data-theme على الجذر وتفضيلُ bassam_theme (لا طبقةَ مرشِّح) */
    (function(){
      var tb = document.getElementById('bsGateTheme'); if (!tb) return;
      var MOON = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9"></path></svg>';
      var SUN = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>';
      var cur = function(){ try { return RAW.getItem.call(localStorage, 'bassam_theme') === 'dark' ? 'dark' : 'light'; } catch(e){ return 'light'; } };
      var apply = function(t, save){
        if (save) { try { RAW.setItem.call(localStorage, 'bassam_theme', t); } catch(e){} }
        try { KIVO.__bsThemeSet(t); } catch(e){}
        tb.innerHTML = t === 'dark' ? SUN : MOON;
        tb.title = t === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي';
        var tl = document.getElementById('bsGateThemeLbl'); if (tl) tl.textContent = t === 'dark' ? 'الوضع الفاتح' : 'الوضع الليلي';
      };
      apply(cur());
      tb.addEventListener('click', function(){ apply(cur() === 'dark' ? 'light' : 'dark', true); });
    })();

    var er = document.getElementById('bsGateErr');
    function say(m){ er.textContent = m || ''; er.classList.toggle('show', !!m); w.querySelectorAll('.login-input-wrap').forEach(function(x){ x.classList.toggle('err', !!m); }); if (m){ var c = w.querySelector('.login-card'); c.style.animation = 'loginShake .4s'; setTimeout(function(){ c.style.animation=''; }, 450); } }
    w.querySelectorAll('.login-input-wrap input').forEach(function(x){ x.addEventListener('input', function(){ w.querySelectorAll('.login-input-wrap').forEach(function(y){ y.classList.remove('err'); }); }); });
    /* قفل المحاولات: عدّاد تنازلي حيّ يعيد تفعيل الزر عند الصفر — لا رقم جامد يخمّن المستخدم متى ينتهي */
    var cdT = 0;
    /* KIVO_260: الثواني بصيغة العدد والمعدود (R183 — كانت «٣ ثانية») — BassamCount إن حُمِّلت، وإلا القاعدةُ نفسُها */
    function secWord(n){ n = Math.max(1, Math.ceil(+n || 0)); var C = KIVO.BassamCount; if (C && C.forms && C.forms['ثانية']) return C(n, 'ثانية', 'g'); var r = n % 100; return n === 1 ? 'ثانية واحدة' : n === 2 ? 'ثانيتين' : n + (r >= 3 && r <= 10 ? ' ثوانٍ' : ' ثانية'); }
    function countdown(btnEl, secs){ clearInterval(cdT); var left = secs; btnEl.disabled = true; er.classList.add('show');
      var tick = function(){ if (left <= 0) { clearInterval(cdT); er.textContent = ''; er.classList.remove('show'); w.querySelectorAll('.login-input-wrap').forEach(function(y){ y.classList.remove('err'); }); btnEl.disabled = false; return; } er.textContent = 'محاولات كثيرة — انتظر ' + secWord(left); left--; };
      tick(); cdT = setInterval(tick, 1000); }

    if (forced) {
      var sv = document.getElementById('bsPwSave');
      var save = function(){
        var a = document.getElementById('bsPw1').value, b = document.getElementById('bsPw2').value;
        var unEl = document.getElementById('bsUn1'), unNew = unEl ? String(unEl.value || '').trim() : '';
        if (unEl) { var ucf = unCheck(unNew); if (!ucf.ok) return say(ucf.msg); if (taken(unNew, u0.id)) return say('هذا الرقم مستخدم لحساب آخر'); }
        if (a !== b) return say('كلمتا المرور غير متطابقتين');
        var c = pwCheck(a, u0.role); if (!c.ok) return say(c.msg);
        sv.disabled = true; say('');
        /* KIVO_264 (المراجعة F3 ثم R2): عدّادُ رفض مفتاح الحسابات وحده قبل الحفظ — رفضُ مفتاحٍ آخر في النافذة نفسِها لا يعني أن التغيير لم يثبت */
        var srvD9 = KIVO.__BS_SRV, dn9 = function(){ return srvD9 && typeof srvD9.denied === 'function' ? +srvD9.denied('bassam_auth_users_v1') || 0 : 0; }, d09 = dn9();
        hashPw(a).then(function(ph){
          writeUsers((rawUsers()||[]).map(function(x){ return x.id === u0.id ? Object.assign({}, x, unEl ? { ph: ph, un: unNew } : { ph: ph }) : x; }));
          /* في وضع الخادم: لا تقدُّم إلا بحفظ وصل فعلاً — كلمة تتبخر بصمت
             أخطر من رسالة فشل صريحة. الإرسالُ صار غيرَ متزامن، فيُنتظر وعدُه
             بدل قراءة حالةٍ لم تكن لتصدق إلا مع الإرسال المتزامن القديم. */
          var srv9 = KIVO.__BS_SRV;
          var wait9 = (window.__BS_BOOT && window.__BS_BOOT.cf && srv9 && srv9.flushAsync)
            ? srv9.flushAsync(12000) : Promise.resolve(true);
          return wait9.then(function (okSv) {
            if (window.__BS_BOOT && window.__BS_BOOT.cf && !okSv) {
              sv.disabled = false;
              say('تعذّر حفظ كلمة المرور في الخادم — تحقق من اتصالك وحاول من جديد');
              return;
            }
            /* KIVO_264 (المراجعة F3): «وصل» لا يعني «قُبل» — إن رفض الخادمُ التغييرَ (مرّت مهلةُ الدخول الأول) عادت القيمةُ المخزَّنة إلى القديمة:
               لا يُمسح «يجب التغيير» ولا يُفتح التطبيق بكلمةٍ لم تُحفظ — يُطلب دخولٌ جديد (جلسةٌ جديدة تفتح المهلة من جديد) */
            if (window.__BS_BOOT && window.__BS_BOOT.cf) {
              var uS = (rawUsers()||[]).filter(function(x){ return x.id === u0.id; })[0] || {};
              var held9 = uS.ph === ph && (!unEl || String(uS.un == null ? '' : uS.un) === unNew);
              if (!held9 || dn9() > d09) {
                say('انتهت مهلةُ تغيير كلمة المرور الأولى في هذه الجلسة — سجّل الدخول من جديد ثم غيّرها');
                setTimeout(function(){ location.href = '/api/logout'; }, 3500);
                return;
              }
            }
            clearMc(); try { RAW.setItem.call(localStorage, 'bassam_fresh_login_v1', '1'); } catch(e2){} location.reload();
          });
        }).catch(function(){ sv.disabled = false; say('تعذّر حفظ كلمة المرور'); });
      };
      sv.addEventListener('click', save);
      ['bsUn1','bsPw1','bsPw2'].forEach(function(id){ var el9 = document.getElementById(id); if (el9) el9.addEventListener('keydown', function(e){ if (e.key === 'Enter') save(); }); });
      document.getElementById('bsPwOut').addEventListener('click', function(e){ e.preventDefault(); RAW.removeItem.call(localStorage, K_SESS); location.reload(); });
      setTimeout(function(){ try { (document.getElementById('bsUn1') || document.getElementById('bsPw1')).focus(); } catch(e){} }, 120);
      return;
    }

    /* حالة منصة لم تُنشأ بها حسابات: عرض رسالة إدارية دون أي بيانات دخول افتراضية. */
    (function(){
      var B9 = window.__BS_BOOT;
      if (!B9 || !B9.cf) return;
      var el9 = document.getElementById('bsSrvState');
      if (!el9) return;
      if (B9.authz === 'unavailable') {   /* KIVO_244 · ADR-003: وضعُ الحماية — الخادمُ لم يستطع التحقق من وضع الصلاحيات فلا دخولَ ولا بيانات حتى يعود */
        el9.textContent = B9.notice || 'النظام في وضع الحماية: تعذّر التحقق من وضع الصلاحيات مؤقتاً — أعد المحاولة بعد قليل.';
        el9.style.color = 'var(--warning-text)'; el9.style.display = ''; el9.dataset.fresh = '1';
      } else if (B9.fresh) {
        el9.textContent = 'المنصة لم تُهيّأ إداريًا بعد. يُرجى التواصل مع مسؤول النشر لتأسيس الحسابات عبر إجراء آمن.';
        el9.style.color = 'var(--fg-x0f766e)'; el9.dataset.fresh = '1';
      } else {
        /* النصّ من إعدادات المنصة (مدير النظام ← المنصة ← شاشة تسجيل الدخول) — يُطبَّق في BassamPlat.gate */
        try { var stP = KIVO.BassamPlat ? (KIVO.BassamPlat.get().login.state || '') : ''; el9.textContent = stP; el9.style.display = stP ? '' : 'none'; } catch (e) { el9.textContent = ''; } el9.style.color = 'var(--fg-x8a99a5)';
      }
    })();

    var btn = document.getElementById('bsGateBtn');
    var go = function(){
      var un = document.getElementById('bsGateUser').value.trim();
      var pw = document.getElementById('bsGatePass').value;
      if (!un || !pw) return say('أدخل اسم المستخدم وكلمة المرور');
      btn.disabled = true; say('');
      login(un, pw).then(function(r){
        if (r.ok) { try { RAW.setItem.call(localStorage, 'bassam_fresh_login_v1', '1'); } catch(e2){} location.reload(); return; }
        btn.disabled = false; say(r.err || 'تعذّر تسجيل الدخول');
        /* KIVO_260: الثواني رقماً من الخادم (wait) — والنصُّ احتياطاً بصيغه كلِّها («ثانية واحدة» · «ثانيتين» · «٣ ثوانٍ» · «١٥ ثانية») */
        var wS = (r && +r.wait > 0) ? +r.wait : 0; if (!wS && /محاولات كثيرة/.test(r.err || '')) { var mW = /انتظر\s+(\d+)\s+(?:ثانية|ثوانٍ)/.exec(r.err || ''); wS = mW ? parseInt(mW[1], 10) : (/ثانيتين/.test(r.err) ? 2 : (/ثانية واحدة/.test(r.err) ? 1 : 0)); }
        if (wS > 0) countdown(btn, wS);
      }).catch(function(){ btn.disabled = false; say('تعذّر تسجيل الدخول'); });
    };
    btn.addEventListener('click', go);
    document.getElementById('bsGatePass').addEventListener('keydown', function(e){ if (e.key === 'Enter') go(); });
    document.getElementById('bsGateUser').addEventListener('keydown', function(e){ if (e.key === 'Enter') go(); });
    /* عدّادا الأرقام: الهوية/الجوال 10 والرقم الوظيفي 5 أو 6 — يظهران فقط حين يكون
       المُدخل أرقاماً خالصة (دخول موظف) ويقفان عند الحد؛ admin ذو الحروف لا يتأثر */
    /* عدّاد الأرقام لحسابات الموظفين فقط؛ لا يُقيّد كلمات المرور الإدارية الطويلة. */
    var wireCnt = function(inpId, cntId, max, minOk){
      var inp = document.getElementById(inpId), cnt = document.getElementById(cntId);
      if (!inp || !cnt) return;
      var upd = function(){
        var v = inp.value || '';
        if (/^\d+$/.test(v)) {
          if (v.length > max) { v = v.slice(0, max); inp.value = v; }
          var okLen = minOk ? (v.length >= minOk && v.length <= max) : v.length === max;
          cnt.style.display = 'block';
          cnt.textContent = minOk ? (v.length + (okLen ? ' \u2713' : '')) : (v.length + ' / ' + max + (okLen ? ' \u2713' : ''));
          cnt.style.color = okLen ? 'var(--fg-x0f7a4a)' : 'var(--fg-x8a929b)';
        } else cnt.style.display = 'none';
      };
      inp.addEventListener('input', upd);
      inp.addEventListener('change', upd);
    };
    wireCnt('bsGateUser', 'bsUserCnt', 10);
    wireCnt('bsGatePass', 'bsPassCnt', 6, 5);
    document.getElementById('bsGateEye').addEventListener('click', function(){ var p = document.getElementById('bsGatePass'); p.type = p.type === 'password' ? 'text' : 'password'; });
    if (window.__BS_BOOT && window.__BS_BOOT.cf) {
      /* على الموقع: الزائر قبل الدخول يعمل في ذاكرة مؤقتة لا تصل القاعدة — الاستيراد الحقيقي من «الإعدادات» بعد الدخول */
      /* شاشة الدخول على الموقع لا تحمل زر استيراد ولا رسالة عنه — الاستيراد من «مدير النظام ← النسخة الاحتياطية» بعد الدخول */
      try { var rw9 = document.querySelector('#bsLoginGate .login-restore'); if (rw9) rw9.style.display = 'none'; } catch (e9) {}
    } else wireRestore();
    setTimeout(function(){ try { document.getElementById('bsGateUser').focus(); } catch(e){} }, 120);
  }

  /* ═══ استيراد نسخة شاملة من شاشة الدخول ═══
     يظهر ما دام لا توجد جلسة (أي على شاشة الدخول أصلاً) — يخدم التأسيس على جهاز
     جديد والتحديث اللاحق معاً. يقبل «النسخة الشاملة» فقط (kind:"full") لأنها
     وحدها تحمل حسابات الدخول. الاستيراد استبدالٌ كامل — فإن وُجدت بيانات على
     الجهاز يُطلب تأكيدٌ صريح قبل المسح. الجلسة لا تُستورد فيبقى تسجيل الدخول
     مطلوباً بعد الاستعادة. */
  /* ═══ حوارُ كلمة مرورٍ موحَّد (بدل prompt() الأصليّ) — Candidate 203 ═══
     bsAskPassword({title,msg,ok,cancel}) → Promise<string|null>. حقلٌ مقنَّع بلا حفظٍ ولا إكمالٍ تلقائيّ، التركيزُ عليه فورَ الظهور،
     Enter يُرسل، Escape/إلغاء/النقرُ خارجَ البطاقة يُلغي (null)، ويعود التركيزُ إلى من فتحه، ويُمسح الحقلُ ويُزال من الصفحة. */
  KIVO.bsAskPassword = function (o) {
    o = o || {};
    return new Promise(function (res) {
      var prev = document.activeElement, done = false;
      var ov = document.createElement('div'); ov.setAttribute('dir', 'rtl'); ov.id = 'bsAskPw';
      ov.style.cssText = 'position:fixed;inset:0;z-index:2147483100;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:24px;font-family:Cairo,Tahoma,Arial,sans-serif';
      var card = document.createElement('div'); card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-labelledby', 'bsAskPwTitle');
      card.style.cssText = 'background:var(--bg-xffffff,#fff);color:var(--fg-x141414,#141414);border-radius:16px;box-shadow:var(--shadow-elevated);width:100%;max-width:380px;padding:18px 20px;text-align:right;direction:rtl';
      card.innerHTML = '<h3 id="bsAskPwTitle" style="font-size:15px;font-weight:700;margin:0 0 6px"></h3>'
        + '<p id="bsAskPwMsg" style="font-size:12px;color:var(--fg-x53565a,#53565a);margin:0 0 12px;line-height:1.8"></p>'
        + '<input id="bsAskPwIn" type="password" dir="ltr" autocomplete="off" autocapitalize="off" spellcheck="false" aria-labelledby="bsAskPwTitle" style="width:100%;height:40px;border:1px solid var(--bd-xe1e1e1,#e1e1e1);border-radius:10px;padding:0 12px;font-size:14px;outline:none;box-sizing:border-box;background:var(--bg-xffffff,#fff);color:inherit">'
        + '<div style="display:flex;gap:8px;margin-top:14px"><button id="bsAskPwOk" type="button" style="height:38px;padding:0 18px;border-radius:10px;font-size:13px;font-weight:600;border:0;cursor:pointer;color:#fff;background:#b99751;font-family:inherit"></button>'
        + '<button id="bsAskPwNo" type="button" style="height:38px;padding:0 16px;border-radius:10px;font-size:13px;font-weight:600;background:var(--bg-xffffff,#fff);color:inherit;border:1px solid var(--bd-xe1e1e1,#e1e1e1);cursor:pointer;font-family:inherit"></button></div>';
      ov.appendChild(card);
      card.querySelector('#bsAskPwTitle').textContent = o.title || 'كلمة المرور';
      card.querySelector('#bsAskPwMsg').textContent = o.msg || '';
      card.querySelector('#bsAskPwOk').textContent = o.ok || 'متابعة';
      card.querySelector('#bsAskPwNo').textContent = o.cancel || 'إلغاء';
      var inp = card.querySelector('#bsAskPwIn');
      var fin = function (v) {
        if (done) return; done = true;
        try { inp.value = ''; } catch (e) {}
        try { ov.parentNode.removeChild(ov); } catch (e) {}
        try { if (prev && prev.focus && document.contains(prev)) prev.focus(); } catch (e) {}
        res(v);
      };
      card.querySelector('#bsAskPwOk').addEventListener('click', function () { fin(inp.value); });
      card.querySelector('#bsAskPwNo').addEventListener('click', function () { fin(null); });
      ov.addEventListener('click', function (ev) { if (ev.target === ov) fin(null); });
      var onKey = function (ev) {
        if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); fin(null); }
        else if (ev.key === 'Enter' && (ev.target === inp || !ov.contains(ev.target))) { ev.preventDefault(); ev.stopPropagation(); fin(inp.value); }
        else if (ev.key === 'Tab') { /* التركيزُ يبقى داخلَ الحوار */ var f = [inp, card.querySelector('#bsAskPwOk'), card.querySelector('#bsAskPwNo')]; var i = f.indexOf(document.activeElement); if (i === -1 || (ev.shiftKey && i <= 0)) { ev.preventDefault(); (i === -1 ? f[0] : f[2]).focus(); } else if (!ev.shiftKey && i === 2) { ev.preventDefault(); f[0].focus(); } }
      };
      document.addEventListener('keydown', onKey, true);
      var fin0 = fin; fin = function (v) { document.removeEventListener('keydown', onKey, true); fin0(v); };
      /* على شاشة الدخول (html.bs-locked يُخفي كلَّ أبناء body عدا البوابة) يُركَّب الحوارُ داخلَ البوابة نفسها */
      var gate = document.getElementById('bsLoginGate');
      var host = (gate && document.documentElement.classList.contains('bs-locked')) ? gate : (document.body || document.documentElement);
      host.appendChild(ov);
      var tries = 0, tryFocus = function () { try { inp.focus(); } catch (e) {} if (document.activeElement !== inp && ++tries < 5) setTimeout(tryFocus, 40); };
      setTimeout(tryFocus, 20);
    });
  };
  function wireRestore() {
  var input = document.getElementById("bsRestoreFile"),
    label = document.getElementById("bsRestoreLbl"),
    message = document.getElementById("bsRestoreMsg");
  if (!input || !label) return;
  function setMsg(text, color) {
    if (message) {
      message.textContent = text || "";
      message.style.color = color || "var(--fg-x8a929b)";
    }
  }
  label.addEventListener("click", function (event) {
    var pending = doRestore.pending;
    if (pending && (pending.saving || pending.uncertain)) {
      event.preventDefault();
      if (!pending.saving) doRestore(pending.file, setMsg, label);
    }
  });
  input.addEventListener("change", function () {
    var file = input.files && input.files[0];
    input.value = "";
    if (!file) return;
    if (doRestore.pending && (doRestore.pending.saving || doRestore.pending.uncertain)) {
      setMsg("أكمل تأكيد نتيجة الطلب السابق بالضغط على زر الاستعادة", "#F87171");
      return;
    }
    if (!KIVO.BackupRestore || !KIVO.BackupRestore.context()) {
      setMsg("سجّل الدخول بحساب مسؤول المنصة الحالي ثم اختر النسخة؛ كلمة ملف النسخة لا تصادق على الخادم", "#F87171");
      return;
    }
    var reader = new FileReader();
    function accept(text) {
      var obj;
      try {
        obj = JSON.parse(text);
      } catch (error) {
        setMsg("ملف النسخة غير صالح", "#F87171");
        return;
      }
      if (obj && obj.kind === "full-enc" && obj.enc) {
        var crypt = KIVO.BassamCrypt;
        if (!crypt || !crypt.ok()) {
          setMsg("التشفير غير متاح", "#F87171");
          return;
        }
        (KIVO.bsAskPassword
          ? KIVO.bsAskPassword({ title: "فك تشفير النسخة", msg: "أدخل كلمة مرور الملف", ok: "فك التشفير" })
          : Promise.resolve(null)
        ).then(function (pw) {
          if (pw == null) return;
          crypt
            .dec(obj.enc, pw)
            .then(accept)
            .catch(function () {
              setMsg("تعذّر فك تشفير الملف", "#F87171");
            });
        });
        return;
      }
      if (!obj || obj.kind !== "full" || !obj.data) {
        setMsg("تُقبل هنا النسخة الشاملة فقط", "#F87171");
        return;
      }
      doRestore(obj, setMsg, label);
    }
    reader.onload = function () {
      accept(reader.result);
    };
    reader.onerror = function () {
      setMsg("تعذّرت قراءة الملف", "#F87171");
    };
    reader.readAsText(file);
  });
}
  async function doRestore(obj, setMsg, label) {
  var svc = KIVO.BackupRestore;
  if (!svc || !svc.context()) {
    setMsg("سجّل الدخول بحساب مسؤول المنصة الحالي أولًا", "#F87171");
    return;
  }
  var pending = doRestore.pending;
  if (pending && (pending.saving || (pending.uncertain && pending.file !== obj))) {
    setMsg("أكمل تأكيد نتيجة الطلب السابق أولًا", "#F87171");
    return;
  }
  if (!pending || pending.file !== obj) {
    pending = { file: obj, ticket: null };
    doRestore.pending = pending;
  }
  if (pending.saving) return;
  pending.saving = true;
  try {
    if (label) label.setAttribute("aria-busy", "true");
    if (!pending.ticket) {
      var prepared = await svc.prepare(obj, { scope: { kind: "full" }, mode: "replace" });
      if (!prepared.ok) {
        setMsg(prepared.message, "#F87171");
        return;
      }
      pending.ticket = prepared.ticket;
      pending.prepared = prepared;
    }
    if (!pending.confirmed) {
      if (!(await svc.confirm(pending.prepared))) return;
      var approved = svc.approve(pending.ticket);
      if (!approved.ok) {
        setMsg(approved.message, "#F87171");
        return;
      }
      pending.confirmed = true;
    }
    var result = await svc.send(pending.ticket);
    if (!result.ok) {
      pending.uncertain = result.uncertain;
      if (!result.uncertain) {
        pending.ticket = null;
        pending.confirmed = false;
      }
      setMsg(result.message, "#F87171");
      return;
    }
    doRestore.pending = null;
    setMsg("اكتملت الاستعادة وأُنشئت لقطة ما قبلها على الخادم", "#047857");
    await svc.refresh();
  } finally {
    pending.saving = false;
    if (label) label.setAttribute("aria-busy", "false");
  }
}
  if (document.body) gate(); else document.addEventListener('DOMContentLoaded', gate);
})();
