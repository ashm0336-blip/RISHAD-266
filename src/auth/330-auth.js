/* ═══ المصادقة: التجزئة · سياسةُ الدخول · الحساباتُ والجلسات · مديرو الإدارات · التفعيل ═══
   KIVO_257 · AUD-010: جزءٌ 1/6 من «src/auth/330-auth-perm.js» السابقة — مقسومةً بالمسؤولية بـtools/split_iife.mjs (tools/split/330-auth-perm.json)؛
   التبعياتُ بين الأجزاء صريحةٌ هنا وعبر المساحة الداخلية window.__BS_I.auth وحدها. */
(function(){
  var I0 = KIVO.__BS_I; if (!I0) { I0 = {}; try { Object.defineProperty(KIVO, "__BS_I", { value: I0 }); } catch (e) { KIVO.__BS_I = I0; } }
  var I = I0.auth = {};
  var D = KIVO.BassamDepts, RAW = KIVO.__BS_RAWLS;

  /* ── فشل مغلق ───────────────────────────────────────────────────────────────
     كان: `if (!D) return;` — أي أن فشل تهيئة التخزين يلغي البوابة كلياً
     ويفتح التطبيق بلا تسجيل دخول. الآن يعرض شاشة خطأ حاجبة ولا يمرّ أحد. */
  function fatalScreen(msg){
    var f = function(){
      if (document.getElementById('bsFatal')) return;
      var d = document.createElement('div');
      d.id = 'bsFatal'; d.setAttribute('dir','rtl');
      d.style.cssText = "position:fixed;inset:0;z-index:2147483600;background:var(--bg-x1a252e);color:var(--fg-xffffff);display:flex;align-items:center;justify-content:center;padding:32px;font-family:'Cairo',sans-serif;text-align:center";
      d.innerHTML = '<div style="max-width:520px"><div style="font-size:44px;margin-bottom:14px">⚠</div>'
        + '<h2 style="margin:0 0 12px;font-size:22px;font-weight:800">تعذّر تشغيل النظام</h2>'
        + '<p style="margin:0 0 8px;color:var(--fg-xb9c4ce);line-height:2;font-size:15px">تعذّر التحقق من جلسة الخادم السحابي أو تحميل بيانات المنصة. لن يعمل النظام محليًا ولن تُحفظ بيانات على الجهاز. أعد المحاولة عبر عنوان المنصة الرسمي.</p>'
        + '<p style="margin:14px 0 0;color:var(--fg-x8d9aa6);font-size:12.5px;font-family:monospace;direction:ltr">' + String(msg||'').slice(0,160) + '</p></div>';
      document.body.appendChild(d);
      var x = document.querySelector('x-dc'); if (x) { try { x.remove(); } catch(e){} }
    };
    if (document.body) f(); else document.addEventListener('DOMContentLoaded', f);
  }
  if (!D || !RAW || KIVO.__BS_STORAGE_FAIL) { fatalScreen(KIVO.__BS_STORAGE_FAIL || 'storage unavailable'); I.dead = 1; return; }

  var K_USERS = 'bassam_auth_users_v1', K_SESS = 'bassam_session_v1';
  var SESSION_MAX = 12 * 3600 * 1000;   /* عمر الجلسة الأقصى */
  var IDLE_MAX    = 2  * 3600 * 1000;   /* الخمول الأقصى — محطات العمليات مشتركة */
  /* 100,000 تكرار: سقف Web Crypto في خادم Cloudflare — أعلى منه لا يتحقق منه الخادم أصلاً */
  var PW_MIN = 6, PBKDF2_ITER = 100000;      /* الحد الأدنى لرقم مدير النظام وحساب الإدارة (أرقام) */

  /* ── التجزئة ────────────────────────────────────────────────────────────────
     القديمة كانت djb2 بملح ثابت وبلا تكرارات: قِست فعلياً ٢٫٣ مليون تجربة/ثانية
     داخل المتصفح. الجديدة PBKDF2-SHA256 بملح عشوائي لكل مستخدم. */
  function hex(buf){ var b = new Uint8Array(buf), o = ''; for (var i=0;i<b.length;i++) o += ('0'+b[i].toString(16)).slice(-2); return o; }
  function subtle(){ return (window.crypto && window.crypto.subtle) ? window.crypto.subtle : null; }
  function pbkdf2(pw, saltHex, iter){
    var S = subtle();
    if (!S) return Promise.reject(new Error('no-subtle'));
    var salt = new Uint8Array(saltHex.match(/../g).map(function(x){ return parseInt(x,16); }));
    return S.importKey('raw', new TextEncoder().encode(String(pw)), 'PBKDF2', false, ['deriveBits'])
      .then(function(k){ return S.deriveBits({ name:'PBKDF2', salt: salt, iterations: iter, hash:'SHA-256' }, k, 256); })
      .then(hex);
  }
  function hashPw(pw){
    if (!subtle()) return Promise.reject(new Error('secure-crypto-unavailable'));
    var salt = new Uint8Array(16); window.crypto.getRandomValues(salt);
    var sh = hex(salt.buffer);
    return pbkdf2(pw, sh, PBKDF2_ITER).then(function(h){ return 'p2$' + PBKDF2_ITER + '$' + sh + '$' + h; });
  }
  /* ── سياسة الدخول الموحَّدة — بقرار المستخدم ─────────────────────────────
     اسم المستخدم للجميع: رقم جوال أو هوية من 10 أرقام.
     كلمة المرور أرقام فقط: الموظف ومدير الإدارة ومدير الإدارة العامة 5 أرقام
     (تبدأ بالرقم الوظيفي ويجوز تبديلها بـ 5 أو 6 أرقام)، ومدير النظام وحساب
     الإدارة 6 أرقام — لأن حسابهما يفتح المنصة كلها. */
  function pinRole(role){ return (role === 'staff' || role === 'gm') ? 'pin5' : 'pin6'; }
  function unCheck(un){
    un = String(un == null ? '' : un).trim();
    if (!/^[0-9]{10}$/.test(un)) return { ok:false, msg:'اسم المستخدم رقم جوال أو رقم هوية من 10 أرقام' };
    return { ok:true, msg:'' };
  }
  function pwCheck(pw, role){
    pw = String(pw == null ? '' : pw);
    var kind = pinRole(role === undefined ? ((cur() || {}).role || 'super') : role);
    if (!/^[0-9]*$/.test(pw)) return { ok:false, msg:'كلمة المرور أرقام فقط' };
    if (kind === 'pin5') {
      if (pw.length < 5 || pw.length > 6) return { ok:false, msg:'كلمة المرور 5 أو 6 أرقام' };
      return { ok:true, msg:'' };
    }
    if (pw.length < PW_MIN || pw.length > 6) return { ok:false, msg:'كلمة المرور 6 أرقام' };
    if (/^(.)\1+$/.test(pw)) return { ok:false, msg:'كلمة المرور ضعيفة جداً — رقم واحد مكرر' };
    if ('01234567890123456789'.indexOf(pw) !== -1 || '98765432109876543210'.indexOf(pw) !== -1) return { ok:false, msg:'كلمة المرور ضعيفة جداً — أرقام متتابعة' };
    return { ok:true, msg:'' };
  }
  function pwRuleText(role){ return pinRole(role) === 'pin5' ? '5 أو 6 أرقام' : '6 أرقام'; }

  /* ── المستخدمون ───────────────────────────────────────────────────────────── */
  /* ═══ ذاكرة مؤقتة لجدول الحسابات ═══
     كانت rawUsers تفكّ JSON الجدول كاملاً عند كل نداء، وstaffMap تعيد بناء
     خريطتها كل مرة — وبعد تفعيل مئات الحسابات صار الجدول ثقيلاً ويُنادى
     لكل صفٍّ في العرض الواحد، فتعلّقت الصفحات. القراءة الآن مرة واحدة،
     وتُبطَل عند أي كتابة. */
  var _usersMemo = null, _smMemo = null, _smDept = null;
  function _bustUsers(){ _usersMemo = null; _smMemo = null; _smDept = null; _uIx = null; _uIxSrc = null; _pubMemo = null; _pubSrc = null; _usersVer++; }
  /* KIVO_265 · أداء (ملاحظةُ المالك 2026-10-19 «الكتابة تتأخر»): فهارسُ جدول الحسابات — كانت cur() تمسح الجدولَ كاملاً (13 ألف حساب على Test)
     في كلِّ فحص صلاحية (آلافُ المرّات في الرسم الواحد)، وdeptManagers/groupManagers كذلك، وpubUsers تنسخ الجدولَ كلَّه في كلِّ نداء.
     الفهرسُ يُبنى مرةً لكل نسخةٍ من الجدول (_usersMemo) ويسقط مع _bustUsers؛ وusersVer عدّادٌ تبني عليه الصفحاتُ ذاكراتِها. */
  var _uIx = null, _uIxSrc = null, _usersVer = 0, _pubMemo = null, _pubSrc = null;
  function uIx(){
    var l = rawUsers() || []; if (_uIx && _uIxSrc === l) return _uIx;
    var o = { byId: {}, mgr: {}, gm: {}, st: {} }, i, u, dk;
    for (i = 0; i < l.length; i++) { u = l[i]; if (!u) continue;
      if (u.id !== undefined && u.id !== null) o.byId[String(u.id)] = u;
      if (u.role === 'staff') { dk = String(u.deptId || ''); var sk = o.st[dk] || (o.st[dk] = {}); if (!(String(u.ekey) in sk)) sk[String(u.ekey)] = u; }   /* أولُ سجلٍّ كما كان يعيده المسح */
      if (u.role === 'staff' && isMgrKey(u.ekey)) { dk = String(u.deptId || ''); (o.mgr[dk] = o.mgr[dk] || []).push(u); }
      if (u.role === 'gm') { dk = String(u.gid || ''); (o.gm[dk] = o.gm[dk] || []).push(u); } }
    _uIx = o; _uIxSrc = l; return o;
  }
  function userById(id){ var u = uIx().byId[String(id)]; return (u && u.id === id) ? u : null; }
  function usersVer(){ return _usersVer; }
  function rawUsers(){
    if (_usersMemo) { if (KIVO.__bsReadHook) KIVO.__bsReadHook(K_USERS); return _usersMemo; }
    try { var v = JSON.parse(RAW.getItem.call(localStorage, K_USERS)); if (Array.isArray(v) && v.length) { _usersMemo = v; return v; } } catch(e){}
    return null;
  }
  function writeUsers(list){ _bustUsers(); RAW.setItem.call(localStorage, K_USERS, JSON.stringify(list)); if (Array.isArray(list) && list.length) _usersMemo = list; }
  /* نسخ بلا `ph` — كان الكشف يسمح لأي كود في الصفحة بقراءة التجزئات وتصديرها */
  function pubUsers(){ var l = rawUsers() || []; if (!_pubMemo || _pubSrc !== l) { _pubMemo = l.map(function(u){ var c = {}; for (var k in u) if (k !== 'ph') c[k] = u[k]; return c; }); _pubSrc = l; } return _pubMemo.slice(); }

  /* نصُّ الجلسة يُحلَّل مرةً لكلِّ نصّ: cur() يُنادى لكلِّ فحصِ صلاحيةٍ (آلافُ المرّات في الرسم) */
  var _ssRaw = undefined, _ssObj = null;
  function session(){
    var B9 = window.__BS_BOOT;
    if (!B9 || B9.srv !== 1 || B9.cf !== 1 || typeof B9.uid !== 'string' || !B9.uid) return null;
    try {
      var raw = RAW.getItem.call(localStorage, K_SESS), v;
      if (raw === _ssRaw && _ssObj) v = _ssObj;
      else { v = JSON.parse(raw); _ssRaw = raw; _ssObj = v; }
      if (!v || !v.uid) return null;
      /* KIVO_264 · D-3: في وضع كلاود فلير هويةُ الصفحة هويةُ الكوكي (BOOT.uid عند التحميل) — علامةُ جهازٍ لحسابٍ آخر (دخولٌ محليّ قديم ·
         تبويبٌ آخر) لا تُعرض هويتُها ولا بياناتُها: لا جلسةَ في الواجهة حتى يُعاد الدخول أو التحميل. العلامةُ لا تُمسّ — قد يملكها تبويبٌ آخر */
      if (String(v.uid) !== B9.uid) return null;
      var now = Date.now();
      /* كان `ts` يُكتب ولا يُقرأ أبداً — الجلسة صالحة إلى الأبد على جهاز مشترك */
      if (!v.ts || now - v.ts > SESSION_MAX) { _ssObj = null; RAW.removeItem.call(localStorage, K_SESS); return null; }
      if (v.la && now - v.la > IDLE_MAX)      { _ssObj = null; RAW.removeItem.call(localStorage, K_SESS); return null; }
      return v;
    } catch(e){ _ssObj = null; return null; }
  }
  function touch(){
    var v = session(); if (!v) return;
    var now = Date.now();
    if (v.la && now - v.la < 60000) return;
    /* طابعُ «آخر نشاط» لا يقرؤه أيُّ رسم: يُكتب بلا إبطالٍ — كانت كلُّ نقرةٍ بعد دقيقةٍ
       تُعيد رسمَ كلِّ الصفحات المركّبة بسببه */
    v.la = now; try { var js = JSON.stringify(v); if (KIVO.__bsSilentSet) KIVO.__bsSilentSet(K_SESS, js); else RAW.setItem.call(localStorage, K_SESS, js); } catch(e){}
  }
  function cur(){
    var ss = session(); if (!ss) return null;
    var u = userById(ss.uid);   /* فهرسٌ لا مسح — انظر uIx */
    if (!u) return null;
    /* إعادة التحقق من الإدارة في كل استدعاء لا عند الدخول فقط */
    if ((u.role === 'dept' || u.role === 'staff') && (!u.deptId || !D.has(u.deptId))) return null;
    if (u.role === 'gm' && !gmDepts(u.gid).length) return null;   /* إدارة عامة حُذفت أو بلا إدارات */
    /* التجميد يسري على الجلسة الحيّة فوراً — لا عند الدخول القادم فقط. بدونه يبقى
       المجمَّد يعمل حتى تنقضي جلسته وقد تمتد ساعات */
    if (u.dis) { RAW.removeItem.call(localStorage, K_SESS); return null; }
    return u;
  }
  /* V7 · القضية #3: مديرُ عقدةٍ قبل الخادمُ دخولَه وليس تحت عقدته إدارةُ بيانات — cur() لا تعدّه جلسةً (السطر أعلاه)، فكانت بوابةُ الدخول
     تعود صامتةً بلا رسالة. هذا السؤالُ للبوابة وحدها لتقول السبب؛ لا يفتح شيئاً ولا يغيّر التفويض. */
  function gmNoUnits(){ var ss = session(); if (!ss) return false; var u = userById(ss.uid); return !!(u && u.role === 'gm' && !u.dis && !gmDepts(u.gid).length); }
  function curPub(){ var u = cur(); if (!u) return null; var c = {}; for (var k in u) if (k !== 'ph') c[k] = u[k]; return c; }
  function isSuper(){ var u = cur(); return !!(u && u.role === 'super'); }
  try { KIVO.bsTechWho(isSuper); } catch (eT) { /* CORE-01: التفصيلُ التقني لمدير المنصة (130) — بلا شريطٍ يبقى كما هو */ }

  /* وضع كلاود فلير: الحكم للخادم وحده — عنده البصمات وحدّ المحاولات
     ودرع أول تشغيل. نجاحه يزرع كوكي الجلسة (HttpOnly)، وهنا تُكتب جلسة
     الواجهة كما يكتبها المسار المحلي حرفياً ثم يُكمل المستدعي بإعادة
     التحميل، فتصل الصفحة والبيانات محقونة من الخادم. */
  /* KIVO_260: الثواني بصيغة العدد والمعدود (R183) — BassamCount إن حُمِّلت، وإلا القاعدةُ نفسُها */
  function cfLogin9(un, pw){
    return fetch('/api/login', { method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ u: String(un||'').trim(), p: String(pw==null?'':pw) }) })
      .then(function(r){ return r.json(); })
      .then(function(j){
        if (!j || !j.ok) return { ok:false, err: (j && j.err) || 'تعذّر تسجيل الدخول', wait: (j && +j.wait > 0) ? +j.wait : 0 };   /* KIVO_260: ثواني القفل رقماً من الخادم */
        /* جسّ الكوكي: الخادم قَبِل — فهل ثبتت جلسته في هذا المتصفح فعلاً؟
           متصفحٌ يحجب ملفات الارتباط كان يعيد لشاشة الدخول بصمت مربك */
        return fetch('/api/whoami').then(function(r2){ return r2.ok; }).catch(function(){ return false; })
          .then(function(cookieOk){
            if (!cookieOk) return { ok:false, err:'متصفحك يحجب ملفات الارتباط (الكوكيز) فلا تثبت الجلسة — اسمح بها لهذا الموقع أو استخدم متصفحاً آخر' };
            var now = Date.now();
            RAW.setItem.call(localStorage, K_SESS, JSON.stringify({ uid: j.uid, ts: now, la: now, mc: j.mustChange ? 1 : 0 }));
            /* الإدارة النشطة تُكتب مباشرة: سجلّ الإدارات قد لا يكون وصل المتصفح قبل الدخول، وكان الشرط يُسقطها صامتاً */
            if (j.deptId) { try { RAW.setItem.call(localStorage, 'bassam_active_dept_v1', String(j.deptId)); } catch (e4) {} if (D.has(j.deptId)) D.setActive(j.deptId); }
            else if (j.role === 'gm') { var ug = (rawUsers()||[]).filter(function(x){ return x.id === j.uid; })[0]; if (ug) gmEnsureActive(ug); }
            return { ok:true, mustChange: !!j.mustChange };
          });
      })
      .catch(function(){ return { ok:false, err:'تعذّر الاتصال بالخادم — تحقّق من الشبكة' }; });
  }

  /* RISHAD 266: Cloud-only authentication. Never authenticate against browser data.
     Missing/invalid server bootstrap fails closed, even on file:// or localhost. */
  function login(un, pw){
    if (!window.__BS_BOOT || window.__BS_BOOT.srv !== 1 || window.__BS_BOOT.cf !== 1)
      return Promise.resolve({ ok:false, err:'تعذّر الاتصال بخادم المنصة السحابية' });
    return cfLogin9(un, pw);
  }

  function needsPwChange(){ var ss = session(); return !!(ss && ss.mc && cur()); }
  function clearMc(){ var ss = session(); if (!ss) return; ss.mc = 0; RAW.setItem.call(localStorage, K_SESS, JSON.stringify(ss)); }

  /* ── مُعدِّلات محروسة ──────────────────────────────────────────────────────────
     كل معالجات صفحة «الإدارة» كانت تنفّذ بلا أي فحص صلاحية — الحماية الوحيدة
     كانت إخفاء الزر. الفحص الآن داخل العملية نفسها. */
  function requireSuper(){ return isSuper() ? null : { ok:false, err:'صلاحية غير كافية — هذا الإجراء لمسؤول المنصة فقط' }; }
  function taken(un, exceptId){
    un = String(un||'').trim().toLowerCase();
    if (!un) return false;
    return (rawUsers()||[]).some(function(x){
      return (String(x.un||'').toLowerCase() === un || String(x.alt||'').toLowerCase() === un) && x.id !== exceptId;
    });
  }
  function newId(p){ return p + Date.now().toString(36) + Math.floor(Math.random()*1e6).toString(36); }

  function setSuperAccount(o){
    var g = requireSuper(); if (g) return Promise.resolve(g);
    var un = String((o&&o.un)||'').trim(), nm = String((o&&o.name)||'').trim(), pw = (o&&o.pw)||'';
    if (!un) return Promise.resolve({ ok:false, err:'اسم المستخدم مطلوب' });
    var uc0 = unCheck(un); if (!uc0.ok) return Promise.resolve({ ok:false, err:uc0.msg });
    /* كان يعدّل كل حسابات المشرفين معاً — مع وجود مشرف احتياطي يخصّ التعديلُ الحسابَ الحالي وحده */
    var list = rawUsers()||[], me0 = cur(), su = list.filter(function(x){ return x.role==='super' && (!me0 || x.id === me0.id); })[0] || list.filter(function(x){ return x.role==='super' && !x.bk; })[0];
    if (taken(un, su ? su.id : '')) return Promise.resolve({ ok:false, err:'اسم المستخدم مستخدم لحساب آخر' });
    if (!su && !pw) return Promise.resolve({ ok:false, err:'كلمة المرور مطلوبة لإنشاء حساب المشرف' });
    if (pw) { var c = pwCheck(pw, 'super'); if (!c.ok) return Promise.resolve({ ok:false, err:c.msg }); }
    var done = function(ph){
      if (su) writeUsers(list.map(function(x){ return x.id===su.id ? Object.assign({}, x, { un:un, name:nm||x.name, ph: ph||x.ph }) : x; }));
      else    writeUsers(list.concat([{ id:'su', un:un, ph:ph, name:nm||'مدير النظام', role:'super' }]));
      if (pw) clearMc();
      return { ok:true };
    };
    return pw ? hashPw(pw).then(done) : Promise.resolve(done(null));
  }

  /* RISHAD-266 · unify (batch 2): «حسابات الإدارة» (role 'dept') أُلغيت — الخادمُ يرفض إنشاءها وتعديلها لكل أحد (dept-role).
     فلا يُرسل العميلُ حفظاً سيُرفض: يعيد السببَ نفسه وما يفعله المستخدم. (لا مسارَ في الواجهة الحالية يستدعيه؛ يبقى جواباً صادقاً لأي مستدعٍ.) */

  /* ── مدير نظام احتياطي: حساب ثانٍ بكامل الصلاحية لا يُستخدم إلا عند تعذّر الرئيسي ── */
  function upsertBackupSuper(o){
    var g = requireSuper(); if (g) return Promise.resolve(g);
    var un = String((o&&o.un)||'').trim(), nm = String((o&&o.name)||'').trim() || 'مدير النظام الاحتياطي', pw = (o&&o.pw)||'';
    var ucb = unCheck(un); if (!ucb.ok) return Promise.resolve({ ok:false, err:ucb.msg });
    var list = rawUsers()||[], bk = list.filter(function(x){ return x.role==='super' && x.bk; })[0];
    if (taken(un, bk ? bk.id : '')) return Promise.resolve({ ok:false, err:'اسم المستخدم مستخدم لحساب آخر' });
    if (!bk && !pw) return Promise.resolve({ ok:false, err:'كلمة المرور مطلوبة لحساب جديد' });
    if (pw) { var c = pwCheck(pw, 'super'); if (!c.ok) return Promise.resolve({ ok:false, err:c.msg }); }
    var done = function(ph){
      if (bk) writeUsers(list.map(function(x){ return x.id===bk.id ? Object.assign({}, x, { un:un, name:nm, ph: ph||x.ph, mc: ph ? 1 : x.mc, dis:0 }) : x; }));
      else    writeUsers(list.concat([{ id:newId('u'), un:un, ph:ph, name:nm, role:'super', bk:1, mc:1 }]));
      return { ok:true };
    };
    return pw ? hashPw(pw).then(done) : Promise.resolve(done(null));
  }
  function removeBackupSuper(){
    var g = requireSuper(); if (g) return g;
    var me0 = cur(); if (me0 && me0.bk) return { ok:false, err:'لا يحذف الحساب الاحتياطي نفسه — ادخل بالحساب الرئيسي' };
    writeUsers((rawUsers()||[]).filter(function(x){ return !(x.role==='super' && x.bk); }));
    return { ok:true };
  }
  function backupSuper(){ var b = (rawUsers()||[]).filter(function(x){ return x.role==='super' && x.bk; })[0]; return b ? { id:b.id, un:b.un, name:b.name, dis:!!b.dis } : null; }
  /* تُستدعى بعد استعادة نسخة شاملة: كانت الحسابات تبقى مربوطة بمعرّفات إدارات
     لم تعد موجودة، فيُقفل كل مديري الإدارات خارج النظام بلا وسيلة إصلاح */
  function pruneDeptAccounts(validIds){
    var ok = {}; (validIds||[]).forEach(function(x){ ok[x] = 1; });
    var before = (rawUsers()||[]).length;
    writeUsers((rawUsers()||[]).filter(function(x){ return (x.role !== 'dept' && x.role !== 'staff') || ok[x.deptId]; }));
    return before - (rawUsers()||[]).length;
  }
  function countOrphanDeptAccounts(validIds){
    var ok = {}; (validIds||[]).forEach(function(x){ ok[x] = 1; });
    return (rawUsers()||[]).filter(function(x){ return x.role === 'dept' && !ok[x.deptId]; }).length;
  }

  /* ── حسابات الموظفين ─────────────────────────────────────────────────────────
     يفتحها مدير الإدارة لموظفٍ في إدارته: اسم المستخدم رقمُ الهوية أو رقمُ الجوال
     (كلاهما يصلح)، وكلمة المرور الرقمُ الوظيفي. والتجميد يمنع الدخول بلا حذف،
     فيعود الحساب بضغطة واحدة بلا إعادة إنشاء. المفتاح ekey هو مفتاح الموظف
     الموحّد نفسه المستعمل في بقية النظام، فلا ينفصل الحساب عن صاحبه. */
  function requireMgr(){ var u = cur();
    /* كان: `!u ||` — أي أن غياب الجلسة يُعامل سماحاً، فتُنفَّذ عمليات حسابات
       الموظفين بعد انقضاء الجلسة. القاعدة كما في requireSuper: لا جلسة = منع. */
    if (!u) return { ok:false, err:'انتهت الجلسة — سجّل الدخول مجدداً' };
    /* مدير العقدة يفتح حسابات موظفي إداراته وهو واقف فيها — كمدير الإدارة.
       R190: كان «الابنَ المباشر» وحده (groupIdOf === gid)، فيُرفض مدير القطاع في كل إدارات فرعه — صار الفرعَ كلَّه بنطاق الحارس */
    if (u.role === 'gm') { var cdG = curDept(); return gmDepts(u.gid).some(function(d){ return d.id === cdG; }) ? null : { ok:false, err:(unitWord(cdG) === 'قسم' ? 'هذا القسم' : 'هذه الإدارة') + ' خارج نطاقك' }; }
    return (u.role === 'super' || u.role === 'dept' || (u.role === 'staff' && u.mgr)) ? null : { ok:false, err:'صلاحية غير كافية — فتح الحسابات لمدير الإدارة' }; }
  function curDept(){ try { return D.active(); } catch(e){ return ''; } }
  /* F01: كلمةُ الوحدة في رسائل الحسابات — «قسم» للقسم و«إدارة» لغيره */
  function unitWord(did){ try { return (D.isSection && D.isSection(did)) ? 'قسم' : 'إدارة'; } catch(e){ return 'إدارة'; } }
  function staffRec(did, ekey){
    /* KIVO_265 · أداء: كانت تمسح الجدول لكل صفٍّ في صفحة الموظفين (staffIsMgr/staffStatus) — فهرسٌ (uIx.st) بالإدارة ثم المفتاح */
    var sk = uIx().st[String(did)]; var r = sk ? sk[String(ekey)] : null;
    return (r && r.deptId === did && r.ekey === ekey) ? r : null;
  }
  function staffStatus(ekey, did){
    var r = staffRec(did || curDept(), ekey);
    return !r ? 'none' : (r.dis ? 'frozen' : 'active');
  }
  /* ═══ شارة «مدير الإدارة» — تعيينها لمدير النظام وحده؛ حاملُها يدير حسابات موظفيه وصلاحياتهم ولا يرث سقف إدارته: صفحاتُه ورقتُه
     (التوريثُ لمفتاح mgr: وحده — 331 myPerms) ويمنح مما يملك ═══ */
  function staffIsMgr(ekey, did){
    var r = staffRec(did || curDept(), ekey);
    return !!(r && r.mgr);
  }
  function setStaffMgr(ekey, on, did){
    var g = requireSuper(); if (g) return g;
    /* دفعة الواجهات (2أ): الخادمُ يرفض حساباً «staff» مفتاحُه mgr: بلا الشارة (018 usersA1Why · mgr-key) — فلا يُرسل نزعُها */
    if (!on && isMgrKey(ekey)) return { ok:false, err:'حساب مدير الإدارة لا تُنزع عنه الإدارة — احذف الحساب أو أبقه مديراً' };
    var d = did || curDept();
    var found = false;
    var list = (rawUsers()||[]).map(function(x){
      if (x.role === 'staff' && x.deptId === d && x.ekey === ekey){ found = true;
        var c = Object.assign({}, x); if (on) c.mgr = true; else delete c.mgr; return c; }
      return x;
    });
    if (!found) return { ok:false, err:'فعّل حساب دخول الموظف أولاً ثم عيّنه مديراً' };
    writeUsers(list);
    return { ok:true };
  }
  function staffMap(did){
    var d0 = did || curDept();
    if (_smMemo && _smDept === d0) { if (KIVO.__bsReadHook) KIVO.__bsReadHook(K_USERS); return _smMemo; }
    var m = {};
    /* حساب مدير الإدارة (mgr:<did>) ليس صفَّ موظف — إدراجه هنا كان يجعل
       تنظيفَ «حسابٌ بلا موظف» في صفحة الموظفين يحذفه ويطرد المدير. */
    (rawUsers()||[]).forEach(function(x){ if (x.role === 'staff' && !isMgrKey(x.ekey) && x.deptId === d0) m[x.ekey] = x.dis ? 'frozen' : 'active'; });
    _smMemo = m; _smDept = d0;
    return m;
  }

  /* ═══ مدير الإدارة كحسابٍ يعيّنه مدير النظام ══════════════════════════════════
     مسؤول الإدارة ليس بالضرورة أحد موظفيها، فكان تعيينه مستحيلاً: الشارة mgr
     لا تُمنح إلا لحسابٍ مصدره جدول الموظفين. الآن له مفتاح صناعي 'mgr:<deptId>'
     لا يصادم مفاتيح الموظفين ولا يُدرجه في جدولهم، وبيانات دخوله بنفس قاعدة
     الموظف حرفياً: اسم المستخدم رقمُ الهوية أو رقمُ الجوال، وكلمة المرور الرقمُ
     الوظيفي. ويرث سقف إدارته كاملاً ما لم تُخزَّن له ورقةُ صلاحياتٍ صراحةً —
     فحينها تُطبَّق ورقته وحدها. التضييق إذن بابان: السقف نفسه، أو ورقةٌ له. */
  function mgrKeyOf(did){ return 'mgr:' + String(did||''); }
  function isMgrKey(k){ return String(k||'').slice(0,4) === 'mgr:'; }
  /* مديرو الإدارة: أكثر من مدير مسموح — الأول يحمل المفتاح القديم 'mgr:<id>'
     والباقون 'mgr:<id>:<n>'؛ الكل يحمل البادئة فيرث سقف الإدارة كاملاً ويصله ما يصل «مدير الإدارة» */
  function deptManagers(did){
    var d = did || curDept();
    return (uIx().mgr[String(d)] || []).filter(function(x){
      return x.role === 'staff' && x.deptId === d && isMgrKey(x.ekey) && (x.ekey === mgrKeyOf(d) || String(x.ekey).indexOf(mgrKeyOf(d) + ':') === 0);
    });
  }
  function deptManager(did){ return deptManagers(did)[0] || null; }
  function pubMgr(r){ return { id:r.id, name:r.name||'', un:r.un||'', alt:r.alt||'', empno:r.no||'', dis:!!r.dis, ekey:r.ekey||'', title:roleTitle(r) }; }
  function deptManagerPub(did){ var r = deptManager(did); return r ? pubMgr(r) : null; }
  function deptManagersPub(did){ return deptManagers(did).map(pubMgr); }
  /* التفرّد لا يكفي أن يُفحص بين الحسابات: رقم هوية موظفٍ لم يُفعَّل حسابه بعد
     يجب أن يحجز نفسه أيضاً، وإلا صادمه المدير وانكشف الخطأ متأخراً عند التفعيل */
  async function empHolder(values){
    var service = KIVO.__BS_SRV.operations, stamp = service.context();
    if (!stamp) throw Error('operations-session-required');
    var ids = D.list(), keys = ids.map(function(d){ return 'bsdept:' + d.id + ':bassam_employees_v1'; });
    for (var i = 0; i < keys.length; i += 80) {
      var result = await service.read(keys.slice(i, i + 80));
      if (!result || result.ok !== 1 || result.denied.length) throw Error('operations-read-required');
    }
    var current = service.context();
    if (!current || current.uid !== stamp.uid || current.dept !== stamp.dept || current.generation !== stamp.generation) throw Error('operations-session-changed');
    return values.map(function(value){
      var v = String(value || '').trim(); if (!v) return '';
      for (var j = 0; j < ids.length; j++) {
        var rows = service.reference(keys[j]) || [];
        if (!Array.isArray(rows)) throw Error('operations-employees-invalid');
        for (var r = 0; r < rows.length; r++) {
          var e = rows[r]; if (!e) continue;
          if (String(e.nid || '').trim() === v || String(e.phone || '').trim() === v)
            return 'سجل الموظف «' + (e.name || '—') + '»' + (ids[j].name ? (' في إدارة «' + ids[j].name + '»') : '');
        }
      }
      return '';
    });
  }
  async function setDeptManager(o){
    var g = requireSuper(); if (g) return Promise.resolve(g);
    o = o || {};
    var did   = String(o.deptId || '').trim();
    var nm    = String(o.name   || '').trim();
    var nid   = String(o.nid    || '').replace(/[^0-9]/g, '');
    var phone = String(o.phone  || '').replace(/[^0-9]/g, '');
    var empno = String(o.empno  || '').replace(/[^0-9]/g, '');
    /* R191: الدور — غيابُه في النداء لا يمسّ المحفوظ، والفراغُ يمحوه */
    var ttl = (o.title === undefined) ? undefined : roleTitle({ title: o.title });
    if (!did) return Promise.resolve({ ok:false, err:'الإدارة غير محدَّدة' });
    if (!D.has(did)) return Promise.resolve({ ok:false, err:'الإدارة غير موجودة' });
    if (!nm) return Promise.resolve({ ok:false, err:'اسم المدير حقل إلزامي' });
    if (nid && nid.length !== 10) return Promise.resolve({ ok:false, err:'رقم الهوية ناقص: ' + nid.length + ' من 10 أرقام' });
    if (phone && phone.length !== 10) return Promise.resolve({ ok:false, err:'رقم الجوال ناقص: ' + phone.length + ' من 10 أرقام' });
    if (!nid && !phone) return Promise.resolve({ ok:false, err:'يلزم رقم هوية أو رقم جوال ليكون اسم المستخدم' });
    if (empno.length < 5 || empno.length > 6) return Promise.resolve({ ok:false, err:'الرقم الوظيفي 5 أو 6 أرقام — وهو كلمة المرور' });
    var all = deptManagers(did);
    var rec = o.id ? (all.filter(function(x){ return x.id === o.id; })[0] || null) : (o.add ? null : (all[0] || null));
    if (o.id && !rec) return Promise.resolve({ ok:false, err:'حساب المدير غير موجود' });
    var exId = rec ? rec.id : '';
    if (taken(nid, exId))   return Promise.resolve({ ok:false, err:'رقم الهوية مستخدم في حساب آخر' });
    if (taken(phone, exId)) return Promise.resolve({ ok:false, err:'رقم الجوال مستخدم في حساب آخر' });
    var holders; try { holders = await empHolder([nid, phone]); } catch(error) { return { ok:false, err:'تعذّر التحقق من سجلات الموظفين — حدّث البيانات ثم أعد المحاولة' }; }
    g = requireSuper(); if (g) return g;
    if (holders[0]) return { ok:false, err:'رقم الهوية مسجّل في ' + holders[0] };
    if (holders[1]) return { ok:false, err:'رقم الجوال مسجّل في ' + holders[1] };
    var un = nid || phone, alt = nid ? phone : '';
    return hashPw(empno).then(function(ph){
      var list = rawUsers() || [];
      /* الرقم الوظيفي يُحفظ نصّاً مع الحساب لأنه لا سجل موظف يُقرأ منه — وهو
         تماماً ما يحدث للموظف: رقمه الوظيفي مخزَّن نصّاً في جدوله وهو كلمة مروره */
      if (rec) writeUsers(list.map(function(x){ return x.id === rec.id
        ? Object.assign({}, x, { un:un, alt:alt, ph:ph, no:empno, name:nm, mgr:true, dis:0 }, ttl === undefined ? {} : { title: ttl || undefined }) : x; }));
      else { var used = {}; all.forEach(function(x){ used[x.ekey] = 1; });
        var ek = mgrKeyOf(did); if (used[ek]) { var n9 = 2; while (used[ek + ':' + n9]) n9++; ek = ek + ':' + n9; }
        writeUsers(list.concat([{ id:newId('m'), un:un, alt:alt, ph:ph, no:empno,
          role:'staff', deptId:did, ekey:ek, name:nm, mgr:true, dis:0, title: ttl || undefined }])); }
      return { ok:true, replaced: !!rec };
    });
  }

  /* ═══ مدير الإدارة العامة — حسابٌ يعيّنه مدير النظام من صفّ الإدارة العامة ═══
     بيانات دخوله بقاعدة مدير الإدارة حرفياً. مفتاحه الصناعي 'gm:<gid>' لا يصادم
     مفاتيح الموظفين، وصلاحياته تُخزَّن تحت كل إدارة من إدارات مجموعته على حدة
     (emps[deptId][gm:<gid>]) فتضبطها في إدارة دون أخرى. لا يرث شيئاً. */
  function gmKeyOf(gid){ return 'gm:' + String(gid||''); }
  function isGmKey(k){ return String(k||'').slice(0,3) === 'gm:'; }
  /* ══ نطاق المستوى الأعلى = فرعُه كله ══════════════════════════════════════
     كانت تُرجع الأبناء المباشرين وحدهم (d.gid === gid) — وهو كافٍ يوم كانت
     الشجرة طبقتين: إدارةٌ عامة فوق إداراتها مباشرةً. وقد صارت أعمق، فمدير
     القطاع أبوه الإداراتُ العامة لا الإدارات، فلو بقي العدُّ على الأبناء
     المباشرين لخرج فارغاً — فلا يدخل المنصة أصلاً (حارس الدخول يرفض مديراً
     بلا إدارات) ولا يرى ورقةً واحدة.
     فالنطاق صار أوراقَ البيانات في الفرع كله بأيّ عمق: deptsUnder. وهي الدالة
     نفسها التي ستقرأ منها كل شاشةٍ أعلى تُبنى لاحقاً — مصدرٌ واحد للنطاق. */
  /* R190: اسمُ دور مدير العقدة من نوعها — بقاعدة _gmKind في الإعدادات: «مدير القطاع» للقطاع، و«مدير إدارة عامة»
     كما كان للإدارة العامة (والعقدةُ القديمة بلا نوع إدارةٌ عامة). بلا معرّف: عقدةُ المستخدم الحاليّ */
  /* R191: الدورُ المكتوب في نافذة المدير (اختياري) — اسمٌ يُعرض فقط، والفراغُ يعيد الافتراضي */
  function roleTitle(u){ return String((u && u.title) || '').replace(/\s+/g, ' ').trim().slice(0, 40); }
  function gmRoleLabel(gid){
    if (gid === undefined) { var cu = cur(); gid = cu && cu.role === 'gm' ? cu.gid : ''; }
    var k = ''; try { var nd = D.nodeOf ? D.nodeOf(gid) : null; k = String((nd && nd.kind) || '').trim(); } catch(e){ k = ''; }
    if (!k || k === 'إدارة عامة') return 'مدير إدارة عامة';
    if (k === 'قطاع') return 'مدير القطاع';
    if (k === 'إدارة عليا') return 'الإدارة العليا';   /* R191: بطلب المستخدم — «الإدارة العليا» بلا «مدير» */
    return 'مدير ' + k;
  }
  function gmDepts(gid){
    if (!gid) return [];
    /* AD-7 (F01): عقدةُ مدير العقدة عقدةٌ فوقيةٌ قائمة — حسابُ gm معرّفُ عقدته معرّفُ وحدة لا يرث شيئاً (كالخادم 018 deptInScope) */
    try { if (D.groups && !D.groups().some(function(x){ return x && x.id === gid; })) return []; } catch(eG){ return []; }
    try {
      if (D.deptsUnder) {
        var ids = D.deptsUnder(gid) || [], m = {};
        D.list().forEach(function(d){ m[d.id] = d; });
        return ids.map(function(x){ return m[x]; }).filter(Boolean);
      }
      return D.list().filter(function(d){ return d.gid === gid; });
    } catch(e){ return []; }
  }
  function gmEnsureActive(u){
    var ds = gmDepts(u && u.gid); if (!ds.length) return;
    if (!ds.some(function(d){ return d.id === D.active(); })) D.setActive(ds[0].id);
  }
  /* مديرو العقدة (إدارة عليا / قطاع / إدارة عامة): أكثر من مدير مسموح — الأول 'gm:<gid>' والباقون 'gm:<gid>:<n>'، والصلاحيات لكل مفتاح على حدة في كل إدارة من الفرع */
  function groupManagers(gid){
    return (uIx().gm[String(gid)] || []).filter(function(x){ return x.role === 'gm' && x.gid === gid; });
  }
  function groupManager(gid){ return groupManagers(gid)[0] || null; }
  function pubGm(r){ return { id:r.id, name:r.name||'', un:r.un||'', alt:r.alt||'', empno:r.no||'', dis:!!r.dis, gid:r.gid, ekey:r.ekey||'', title:roleTitle(r) }; }
  function groupManagerPub(gid){ var r = groupManager(gid); return r ? pubGm(r) : null; }
  function groupManagersPub(gid){ return groupManagers(gid).map(pubGm); }
  async function setGroupManager(o){
    var g = requireSuper(); if (g) return Promise.resolve(g);
    o = o || {};
    var gid   = String(o.gid    || '').trim();
    var nm    = String(o.name   || '').trim();
    var nid   = String(o.nid    || '').replace(/[^0-9]/g, '');
    var phone = String(o.phone  || '').replace(/[^0-9]/g, '');
    var empno = String(o.empno  || '').replace(/[^0-9]/g, '');
    /* R191: الدور — غيابُه في النداء لا يمسّ المحفوظ، والفراغُ يمحوه */
    var ttl = (o.title === undefined) ? undefined : roleTitle({ title: o.title });
    /* سجل العقد هو سجل الإدارات العامة نفسه، فالإسناد يصحّ لأيّ مستوى فوق
       الإدارة — قطاعاً كان أم إدارةً عامة أم قسماً. والنص يذكر «العقدة» لأن
       الرسالة صارت تُقرأ في أكثر من مستوى. */
    if (!gid || !D.groups().some(function(x){ return x.id === gid; })) return Promise.resolve({ ok:false, err:'العقدة غير موجودة في الهيكل' });
    if (!nm) return Promise.resolve({ ok:false, err:'اسم المدير حقل إلزامي' });
    if (nid && nid.length !== 10) return Promise.resolve({ ok:false, err:'رقم الهوية ناقص: ' + nid.length + ' من 10 أرقام' });
    if (phone && phone.length !== 10) return Promise.resolve({ ok:false, err:'رقم الجوال ناقص: ' + phone.length + ' من 10 أرقام' });
    if (!nid && !phone) return Promise.resolve({ ok:false, err:'يلزم رقم هوية أو رقم جوال ليكون اسم المستخدم' });
    if (empno.length < 5 || empno.length > 6) return Promise.resolve({ ok:false, err:'الرقم الوظيفي 5 أو 6 أرقام — وهو كلمة المرور' });
    var rec = o.id ? (groupManagers(gid).filter(function(x){ return x.id === o.id; })[0] || null) : (o.add ? null : groupManager(gid)), exId = rec ? rec.id : '';
    if (taken(nid, exId))   return Promise.resolve({ ok:false, err:'رقم الهوية مستخدم في حساب آخر' });
    if (taken(phone, exId)) return Promise.resolve({ ok:false, err:'رقم الجوال مستخدم في حساب آخر' });
    var holders; try { holders = await empHolder([nid, phone]); } catch(error) { return { ok:false, err:'تعذّر التحقق من سجلات الموظفين — حدّث البيانات ثم أعد المحاولة' }; }
    g = requireSuper(); if (g) return g;
    if (holders[0]) return { ok:false, err:'رقم الهوية مسجّل في ' + holders[0] };
    if (holders[1]) return { ok:false, err:'رقم الجوال مسجّل في ' + holders[1] };
    var un = nid || phone, alt = nid ? phone : '';
    return hashPw(empno).then(function(ph){
      var list = rawUsers() || [];
      if (rec) writeUsers(list.map(function(x){ return x.id === rec.id
        ? Object.assign({}, x, { un:un, alt:alt, ph:ph, no:empno, name:nm, dis:0 }, ttl === undefined ? {} : { title: ttl || undefined }) : x; }));
      else { var used = {}; list.forEach(function(x){ if (x.ekey) used[x.ekey] = 1; }); var ek = gmKeyOf(gid); if (used[ek]) { var n9 = 2; while (used[ek + ':' + n9]) n9++; ek += ':' + n9; }
        writeUsers(list.concat([{ id:newId('g'), un:un, alt:alt, ph:ph, no:empno,
        role:'gm', gid:gid, ekey:ek, name:nm, dis:0, title: ttl || undefined }])); }
      return { ok:true, replaced: !!rec };
    });
  }
  function setGroupManagerDis(gid, on, uid){
    var g = requireSuper(); if (g) return g;
    var rec = uid ? (groupManagers(gid).filter(function(x){ return x.id === uid; })[0] || null) : groupManager(gid); if (!rec) return { ok:false, err:'لا يوجد مدير معيَّن لهذه العقدة' };
    writeUsers((rawUsers()||[]).map(function(x){ return x.id === rec.id ? Object.assign({}, x, { dis: on ? 1 : 0 }) : x; }));
    return { ok:true };
  }
  function removeGroupManager(gid, uid){
    var g = requireSuper(); if (g) return g;
    var recs = uid ? groupManagers(gid).filter(function(x){ return x.id === uid; }) : groupManagers(gid);
    if (!recs.length) return { ok:false, err:'لا يوجد مدير معيَّن لهذه العقدة' };
    try { var PMy = KIVO.BassamPerm; if (PMy && PMy.dropEmpPerms) recs.forEach(function(r){ gmDepts(gid).forEach(function(d){ PMy.dropEmpPerms(r.ekey || gmKeyOf(gid), d.id); }); }); } catch(e){}
    var ids = {}; recs.forEach(function(r){ ids[r.id] = 1; });
    writeUsers((rawUsers()||[]).filter(function(x){ return !ids[x.id]; }));
    return { ok:true };
  }
  function setDeptManagerDis(did, on, uid){
    var g = requireSuper(); if (g) return g;
    var rec = uid ? (deptManagers(did).filter(function(x){ return x.id === uid; })[0] || null) : deptManager(did);
    if (!rec) return { ok:false, err:'لا يوجد مدير معيَّن ' + (unitWord(did) === 'قسم' ? 'لهذا القسم' : 'لهذه الإدارة') };
    writeUsers((rawUsers()||[]).map(function(x){ return x.id === rec.id
      ? Object.assign({}, x, { dis: on ? 1 : 0 }) : x; }));
    return { ok:true };
  }
  function removeDeptManager(did, uid){
    var g = requireSuper(); if (g) return g;
    var d = did || curDept();
    var gone = uid ? deptManagers(d).filter(function(x){ return x.id === uid; }) : deptManagers(d);
    if (uid && !gone.length) return { ok:false, err:'حساب المدير غير موجود' };
    gone.forEach(function(x){ try { var PMy = KIVO.BassamPerm; if (PMy && PMy.dropEmpPerms) PMy.dropEmpPerms(x.ekey, d); } catch(e){} });
    var ids = {}; gone.forEach(function(x){ ids[x.id] = 1; });
    writeUsers((rawUsers()||[]).filter(function(x){ return !ids[x.id]; }));
    return { ok:true, n: gone.length };
  }

  /* مراجعةُ التكامل W1-R2: من رفض الخادمُ تفعيلَه لأنّ هويته/جواله اسمُ دخولٍ لحسابٍ لا يُرسل إليّ (الإسقاط — فلا يكشفه taken) — تسمّيه طبقةُ المزامنة
     (280 usersDupNote9) فيُذكر هنا لهذه الجلسة (الإدارة|المفتاح ⇐ اسما الدخول المرفوضان) فيُتخطّى بسببه كما قبل الإسقاط بدل أن يعيد التفعيلُ
     التلقائيُّ المحاولةَ مع كلّ حفظٍ لسجلّ الموظفين؛ وتعديلُ هويته أو جواله يرفع التخطّي */
  var dupMem = Object.create(null);
  function dupSig(un, alt){ return String(un||'').trim().toLowerCase() + '|' + String(alt||'').trim().toLowerCase(); }
  function dupNote(rows){ (rows||[]).forEach(function(x){ if (x && x.deptId && x.ekey) dupMem[String(x.deptId) + '|' + String(x.ekey)] = dupSig(x.un, x.alt); }); }
  function dupHeld(d, ekey, un, alt){ var s = dupMem[String(d) + '|' + String(ekey)]; return s != null && s === dupSig(un, alt); }
  function activateStaff(o){
    var g = requireMgr(); if (g) return Promise.resolve(g);
    var did = (o && o.deptId) || curDept();
    var ekey = String((o && o.ekey) || '').trim();
    var nid = String((o && o.nid) || '').trim();
    var phone = String((o && o.phone) || '').trim();
    var pw = String((o && o.empno) || '').trim();
    var nm = String((o && o.name) || '').trim();
    if (!did) return Promise.resolve({ ok:false, err:'لا توجد إدارة نشطة' });
    if (!ekey) return Promise.resolve({ ok:false, err:'الموظف غير معرَّف' });
    if (!nid && !phone) return Promise.resolve({ ok:false, err:'يلزم رقم هوية أو رقم جوال ليكون اسم المستخدم' });
    if (!pw) return Promise.resolve({ ok:false, err:'يلزم الرقم الوظيفي ليكون كلمة المرور' });
    var un = nid || phone, alt = nid ? phone : '';
    var rec = staffRec(did, ekey);
    /* اسم المستخدم هو الهوية إن وُجدت وإلا الجوال — فالرسالة تسمّي ما تكرّر فعلاً */
    if (taken(un, rec ? rec.id : '')) return Promise.resolve({ ok:false, err:(nid ? 'رقم الهوية' : 'رقم الجوال') + ' مستخدم في حساب آخر' });
    if (alt && taken(alt, rec ? rec.id : '')) return Promise.resolve({ ok:false, err:'رقم الجوال مستخدم في حساب آخر' });
    if (dupHeld(did, ekey, un, alt)) return Promise.resolve({ ok:false, err:'رقم الهوية أو الجوال مستخدم في حساب آخر' });   /* مراجعةُ التكامل W1-R2 */
    return hashPw(pw).then(function(ph){
      var list = rawUsers() || [];
      if (rec) writeUsers(list.map(function(x){ return x.id === rec.id ? Object.assign({}, x, { un:un, alt:alt, ph:ph, name:nm||x.name, dis:0 }) : x; }));
      else writeUsers(list.concat([{ id:newId('s'), un:un, alt:alt, ph:ph, role:'staff', deptId:did, ekey:ekey, name:nm||'موظف', dis:0 }]));
      return { ok:true };
    });
  }
  /* ═══ تفعيل دفعة واحدة — للتفعيل التلقائي عند اكتمال الشروط: تُجزَّأ كلمات المرور كلها ثم
     يُكتب جدول الحسابات مرة واحدة (لا حفظة لكل موظف) — فاستيرادُ مئات الموظفين لا يجمّد المتصفح ولا يغرق الخادم */
  function activateStaffMany(items, did){
    var g = requireMgr(); if (g) return Promise.resolve(g);
    var d = did || curDept(); if (!d) return Promise.resolve({ ok:false, err:'لا توجد إدارة نشطة' });
    var list0 = rawUsers() || [], out = { ok:true, n:0, skipped:[] }, jobs = [];
    var seen = {}; list0.forEach(function(x){ if (x.un) seen[String(x.un).toLowerCase()] = 1; if (x.alt) seen[String(x.alt).toLowerCase()] = 1; });
    (items || []).forEach(function(o){
      var ekey = String((o && o.ekey) || '').trim(), nid = String((o && o.nid) || '').trim(), phone = String((o && o.phone) || '').trim(), pw = String((o && o.empno) || '').trim(), nm = String((o && o.name) || '').trim();
      if (!ekey || (!nid && !phone) || !pw) return;
      if (staffRec(d, ekey)) return;                                      /* له حساب (نشط أو مجمَّد) — لا يُمسّ */
      var un = nid || phone, alt = nid ? phone : '';
      if (seen[un.toLowerCase()] || (alt && seen[alt.toLowerCase()]) || dupHeld(d, ekey, un, alt)) { out.skipped.push(nm + ': رقم الهوية أو الجوال مستخدم في حساب آخر'); return; }   /* W1-R2: dupHeld */
      seen[un.toLowerCase()] = 1; if (alt) seen[alt.toLowerCase()] = 1;
      jobs.push({ ekey:ekey, un:un, alt:alt, pw:pw, nm:nm });
    });
    if (!jobs.length) return Promise.resolve(out);
    var run = function(i, acc){
      if (i >= jobs.length) return Promise.resolve(acc);
      return hashPw(jobs[i].pw).then(function(ph){ acc.push({ id:newId('s'), un:jobs[i].un, alt:jobs[i].alt, ph:ph, role:'staff', deptId:d, ekey:jobs[i].ekey, name:jobs[i].nm || 'موظف', dis:0 }); return run(i + 1, acc); });
    };
    return run(0, []).then(function(rows){ writeUsers((rawUsers() || []).concat(rows)); out.n = rows.length; return out; });
  }
  function freezeStaff(ekey, did){
    var g = requireMgr(); if (g) return g;
    var d = did || curDept(); var rec = staffRec(d, ekey);
    if (!rec) return { ok:false, err:'لا يوجد حساب لهذا الموظف' };
    writeUsers((rawUsers()||[]).map(function(x){ return x.id === rec.id ? Object.assign({}, x, { dis:1 }) : x; }));
    return { ok:true };
  }
  function removeStaffAccount(ekey, did){
    var g = requireMgr(); if (g) return g;
    /* حساب مدير الإدارة يسكن جدول الحسابات بدور staff ومفتاحٍ mgr:<did>، وليس
       له صفٌّ في جدول الموظفين. كان تنظيف «حساب بلا موظف» يجرفه فيفقد المدير
       حسابه ويُطرد من جلسته — يُستثنى صراحةً، وحذفه من removeDeptManager وحدها. */
    if (isMgrKey(ekey)) return { ok:false, err:'حساب مدير الإدارة يُحذف من صفحة الإدارات وحدها' };
    var d = did || curDept();
    writeUsers((rawUsers()||[]).filter(function(x){ return !(x.role === 'staff' && x.deptId === d && x.ekey === ekey); }));
    /* الصلاحيات تتبع الحساب: حذفه يمسحها معه، وإلا بقيت في المخزن يتيمةً
       تُعرض في الجداول وتعود حيّةً لو أُعيد فتح حساب بالمفتاح نفسه. */
    try { var PMx = KIVO.BassamPerm; if (PMx && PMx.dropEmpPerms) PMx.dropEmpPerms(ekey, d); } catch(e){}
    return { ok:true };
  }
  /* KIVO_264 · «الأمان»: كلمةُ المرور الحالية لتغيير اسم الدخول — تُرسل مع حفظ الحسابات نفسِه باسم «cur» فيتحقق منها الخادم (لا تُخزَّن):
     تُحفظ هنا في الذاكرة وحدها لمفتاح الحسابات، مدةً قصيرة، وتُقرأ عند بناء جسم /api/save (saveCur) — ولا تُكتب في أي مخزن. */
  var CUR_TTL = 120000, cur9 = null;
  function saveCur(k){
    if (k !== K_USERS || !cur9) return null;
    if (Date.now() - cur9.at > CUR_TTL) { cur9 = null; return null; }
    return cur9.v;
  }
  /* KIVO_264 (المراجعة F4 ثم R1): تُمحى حين يُحسم حفظُ مفتاح الحسابات الذي حملها (قُبل أو رُفض — 280 settle) لا عند بناء الجسم:
     إعادةُ الإرسال بعد خطأ شبكة أو 429 أو دمجِ تعارضٍ تحملها كما حملها الأوّل (وإلا رُفضت self-cur بعد أن قيل «حُفظ») — والمهلةُ تحدّها في كل حال */
  function dropCur(){ cur9 = null; }
  /* KIVO_264 · حقولُ حسابي لكل دور — مرآةُ سياسة الخادم (SELF_FIELDS_BY_ROLE): الموظف كلمةُ المرور وحدها · مديرُ العقدة كلمةُ المرور والبريد والجوال
     (لا الاسم) · مديرُ النظام كلُّها مع اسم الدخول (بكلمة المرور الحالية «cur»). ورسائلُ رفض الخادم الثلاث بنصٍّ واضح (self · self-cur · self-un) */
  var SELF_FIELDS = { staff: ['ph'], gm: ['ph', 'email', 'phone'], super: ['ph', 'name', 'email', 'phone', 'un', 'alt'] };
  function selfWhyText(why, role){
    if (why === 'self-cur') return 'لم يُحفظ تغييرُ اسم الدخول: يلزم تأكيدُه بكلمة مرورك الحالية — اكتبها وأعد المحاولة';
    if (why === 'self-un') return 'لم يُحفظ تغييرُ اسم الدخول: اسمُ الدخول رقمُ جوالٍ أو هويةٍ من 10 أرقام';
    if (why === 'self-lock') return 'لم يُحفظ تغييرُ اسم الدخول: محاولاتٌ كثيرة بكلمة مرورٍ خاطئة — انتظر قليلاً ثم أعد المحاولة';   /* KIVO_264 (المراجعة F6) */
    if (why !== 'self') return '';
    role = role || (cur() || {}).role;
    if (role === 'gm') return 'يُعدَّل من حسابك كلمةُ المرور والبريد والجوال فقط — الاسمُ يعدّله مسؤول المنصة';
    if (role === 'super') return 'هذا الحقلُ لا يُعدَّل من حسابك';
    return 'لا يُعدَّل من حسابك هنا سوى كلمة المرور — بياناتُك الأخرى من سجلّك في «موظفو الإدارة»';
  }
  /* في وضع كلاود فلير لا «تمّ» قبل حكم الخادم: يُرسل الحفظُ الآن ويُنتظر؛ والمرفوضُ تعيد طبقةُ المزامنة قيمتَه من الخادم — فيُعرف من عدّاد
     المرفوض وزوال التعديل، ويُعرض سببُه بنصٍّ واضح بدل نجاحٍ زائف */
  function confirmSelf(meId, patch, role){
    var B = window.__BS_BOOT, S = KIVO.__BS_SRV, NO = 'لم يتأكّد حفظُ حسابك على الخادم بعد — تحقّق من الاتصال ثم أعد المحاولة';
    if (!(B && B.srv === 1 && B.cf === 1) || !S || typeof S.flushAsync !== 'function') return Promise.resolve({ ok:false, err:NO });
    var dn = function(){ return typeof S.denied === 'function' ? +S.denied() || 0 : 0; }, d0 = dn();
    return Promise.resolve().then(function(){ return S.flushAsync(8000); }).then(function(sent){
      var u = (rawUsers()||[]).filter(function(x){ return x.id === meId; })[0] || {};
      var held = Object.keys(patch).every(function(k){ return String(u[k] == null ? '' : u[k]) === String(patch[k]); });
      if (dn() > d0 && !held) {
        var w = patch.un !== undefined || patch.alt !== undefined ? (unCheck(patch.un !== undefined ? patch.un : patch.alt).ok ? 'self-cur' : 'self-un') : 'self';
        return { ok:false, why:w, err: selfWhyText(w, role) };
      }
      /* held alone is the optimistic browser value, never proof that the server saved it. */
      var sessionOk = typeof S.sesChanged !== 'function' || !S.sesChanged();
      return sent === true && held && sessionOk ? { ok:true } : { ok:false, err:NO };
    }, function(){ return { ok:false, err:NO }; });
  }
  function changeOwnAccount(o){
    var storage = KIVO.__BS_SRV;
    if (!storage || typeof storage.flushAsync !== 'function' || (typeof storage.sesChanged === 'function' && storage.sesChanged()))
      return Promise.resolve({ ok:false, err:'تعذّر الاتصال بمخزن السحابة — أعد المحاولة بعد تسجيل الدخول' });
    var me = cur(); if (!me) return Promise.resolve({ ok:false, err:'انتهت الجلسة — سجّل الدخول مجدداً' });
    o = o || {};
    var patch = {}, allow = SELF_FIELDS[me.role] || SELF_FIELDS.staff;
    /* ما لم يتغيّر لا يُكتب · وما تغيّر خارج حقول الدور يُرفض هنا قبل الخادم */
    ['name','email','phone'].forEach(function(k){ if (o[k] !== undefined && String(o[k]).trim() !== String(me[k] == null ? '' : me[k]).trim()) patch[k] = String(o[k]).trim(); });
    var un = o.un !== undefined ? String(o.un).trim() : null;
    if (un !== null && un !== String(me.un || '')) {
      /* الموظف ومدير الإدارة: اسم المستخدم من سجله (هوية/جوال) — لا يغيّره بنفسه */
      if (me.role === 'staff' || me.role === 'gm') return Promise.resolve({ ok:false, err:'اسم مستخدمك هو رقم هويتك أو جوالك في سجلك — يُغيَّر من موظفي الإدارة' });
      if (!un) return Promise.resolve({ ok:false, err:'اسم المستخدم مطلوب' });
      var ucm = unCheck(un); if (!ucm.ok) return Promise.resolve({ ok:false, err:ucm.msg });
      if (taken(un, me.id)) return Promise.resolve({ ok:false, err:'اسم المستخدم مستخدم لحساب آخر' });
      patch.un = un;
    }
    var bad = Object.keys(patch).filter(function(k){ return allow.indexOf(k) === -1; });
    if (bad.length) return Promise.resolve({ ok:false, why:'self', err: selfWhyText('self', me.role) });
    var apply = function(ph){
      if (ph) patch.ph = ph;
      if (!Object.keys(patch).length) return { ok:true };
      writeUsers((rawUsers()||[]).map(function(x){ return x.id === me.id ? Object.assign({}, x, patch) : x; }));
      return confirmSelf(me.id, patch, me.role).then(function(r){ if (r.ok && ph) clearMc(); return r; });
    };
    /* KIVO_264: تغييرُ اسم الدخول كان يُطبَّق بلا تحقّقٍ من كلمة المرور الحالية (والواجهةُ تقول «يُتحقّق منها قبل أي تغيير») */
    if (!o.newPw && !patch.un) return Promise.resolve(apply(null));
    if (!String(o.currentPw || '')) return Promise.resolve({ ok:false, err:'اكتب كلمة المرور الحالية للتأكيد' });
    if (o.newPw) {
      if (String(o.newPw) !== String(o.confirmPw == null ? o.newPw : o.confirmPw))
        return Promise.resolve({ ok:false, err:'كلمتا المرور غير متطابقتين' });
      var c = pwCheck(o.newPw, me.role); if (!c.ok) return Promise.resolve({ ok:false, err:c.msg });
    }
    /* Verification is exclusively server-side, never against a cached password hash. */
    if (!window.__BS_BOOT || window.__BS_BOOT.srv !== 1 || window.__BS_BOOT.cf !== 1)
      return Promise.resolve({ ok:false, err:'تعذّر التحقق من كلمة المرور دون اتصال بخادم المنصة' });
    var check9 = fetch('/api/checkpw', { method:'POST', headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({ p: o.currentPw || '' }) })
      .then(function(r){ return r.json(); })
      .then(function(j){ return j && j.ok ? true : { err: j && typeof j.err === 'string' && j.err && j.err !== 'bad-body' ? j.err : '' }; })
      .catch(function(){ return { err: 'تعذّر التحقق من كلمة المرور الآن — تحقق من اتصالك وحاول من جديد' }; });
    return check9.then(function(good){
      if (!good || (typeof good === 'object' && good.err !== undefined)) return { ok:false, err:(good && good.err) || 'كلمة المرور الحالية غير صحيحة' };
      if (patch.un) cur9 = { v: String(o.currentPw), at: Date.now() };
      return o.newPw ? hashPw(o.newPw).then(apply) : apply(null);
    });
  }

  /* ═══ حسابات الإدارات: أُلغيت كلياً ═══
     الدخول صار للموظفين وحدهم (role:'staff' مربوط بصفّه في جدول موظفي إدارته)،
     ومدير الإدارة موظف بشارة دوره لا كيان منفصل. لا بيانات قائمة تحتاج ترحيلاً،
     فالحسابات القديمة تُحذف مباشرة. */
  /* دفعة الواجهات (2أ): ما يرفضه الخادمُ لكل أحدٍ على صفٍّ قائم (018 usersA1Why) — حسابُ «الإدارة» الملغى لا يُعدَّل ('dept-role')،
     وحسابٌ «staff» بمفتاح mgr: بلا الشارة لا يُعدَّل إلا تجميداً ('mgr-key'). freeze: التعديلُ تجميدُ حسابٍ نشط وحده. '' = لا مانع */
  function acctFixedWhy(u, freeze){
    if (!u) return '';
    if (u.role === 'dept') return '«حسابات الإدارة» أُلغيت: لا يُنشأ حسابٌ بهذا النوع ولا يُعدَّل — احذفه بزرّ «تنظيف» في تبويب الإدارات، وللدخول باسم الإدارة أنشئ حسابَ موظفٍ بشارة «مدير»';
    if (u.role === 'staff' && isMgrKey(u.ekey) && !u.mgr && !(freeze && !u.dis)) return 'حسابٌ بمفتاح مدير الإدارة بلا شارة «مدير» — لا يُعاد تفعيله ولا تُغيَّر بياناته (يرفضه الخادم)؛ احذفه ثم عيّن المدير من جديد من صفحة الإدارات';
    return '';
  }
  function deptAccountsCount(){
    return (rawUsers() || []).filter(function(x){ return x.role === 'dept'; }).length;
  }
  function purgeDeptAccounts(){
    if (!isSuper()) return { ok:false, err:'العملية لمسؤول المنصة وحده' };
    var us = rawUsers() || [];
    var nu = us.filter(function(x){ return x.role !== 'dept'; });
    var removed = us.length - nu.length;
    if (removed) writeUsers(nu);
    return { ok:true, removed: removed };
  }
  /* → للأجزاء الأخرى */
  I.D = D; I.K_SESS = K_SESS; I.K_USERS = K_USERS; I.PW_MIN = PW_MIN; I.RAW = RAW; I._bustUsers = _bustUsers; I.activateStaff = activateStaff;
  I.activateStaffMany = activateStaffMany; I.backupSuper = backupSuper; I.changeOwnAccount = changeOwnAccount; I.clearMc = clearMc;
  I.saveCur = saveCur; I.dropCur = dropCur;   /* KIVO_264: لطبقة المزامنة (280) — حقلُ «cur» في جسم /api/save حين يحمل مفتاحَ الحسابات */
  I.dupNote = dupNote;                        /* مراجعةُ التكامل W1-R2: لطبقة المزامنة (280) — من رُفض تفعيلُه لاسم دخولٍ مستعمَلٍ في حسابٍ لا يراه المدير */
  I.selfWhyText = selfWhyText;   /* KIVO_264: نصُّ رفض الخادم لتعديل حسابي (self · self-cur · self-un) — لطبقة المزامنة وللصفحة */
  I.countOrphanDeptAccounts = countOrphanDeptAccounts; I.cur = cur; I.curDept = curDept; I.curPub = curPub; I.deptAccountsCount = deptAccountsCount;
  I.deptManagerPub = deptManagerPub; I.deptManagersPub = deptManagersPub; I.freezeStaff = freezeStaff; I.gmDepts = gmDepts;
  I.gmEnsureActive = gmEnsureActive; I.gmNoUnits = gmNoUnits; I.gmKeyOf = gmKeyOf; I.gmRoleLabel = gmRoleLabel; I.groupManagerPub = groupManagerPub;
  I.groupManagersPub = groupManagersPub; I.hashPw = hashPw; I.isGmKey = isGmKey; I.isMgrKey = isMgrKey; I.isSuper = isSuper; I.login = login;
  I.mgrKeyOf = mgrKeyOf; I.needsPwChange = needsPwChange; I.pinRole = pinRole; I.pruneDeptAccounts = pruneDeptAccounts; I.pubUsers = pubUsers; I.userById = userById; I.usersVer = usersVer;
  I.purgeDeptAccounts = purgeDeptAccounts; I.pwCheck = pwCheck; I.pwRuleText = pwRuleText; I.rawUsers = rawUsers;
  I.removeBackupSuper = removeBackupSuper; I.removeDeptManager = removeDeptManager;
  I.removeGroupManager = removeGroupManager; I.removeStaffAccount = removeStaffAccount; I.requireMgr = requireMgr; I.roleTitle = roleTitle;
  I.setDeptManager = setDeptManager; I.setDeptManagerDis = setDeptManagerDis; I.setGroupManager = setGroupManager;
  I.setGroupManagerDis = setGroupManagerDis; I.setStaffMgr = setStaffMgr; I.setSuperAccount = setSuperAccount; I.staffIsMgr = staffIsMgr;
  I.staffMap = staffMap; I.staffStatus = staffStatus; I.taken = taken; I.touch = touch; I.unCheck = unCheck; I.upsertBackupSuper = upsertBackupSuper;
  I.writeUsers = writeUsers; I.acctFixedWhy = acctFixedWhy;
  Object.defineProperty(I, "_usersMemo", { get: function () { return _usersMemo; }, set: function (v) { _usersMemo = v; }, configurable: true });
})();
