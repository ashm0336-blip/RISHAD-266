
(function(){
  /* لا يكفي وصول بيانات الإقلاع: يجب تثبيت مخزن السحابة أولاً، وإلا كانت
     RAW تلتقط مخزن الجهاز الأصلي وتحوّل أعمال الإدارات إلى بيانات محلية. */
  if (!window.__BS_BOOT || window.__BS_BOOT.srv !== 1 || window.__BS_BOOT.cf !== 1
      || !KIVO.__BS_SRV || typeof KIVO.__BS_SRV.flushAsync !== 'function') {
    KIVO.__BS_STORAGE_FAIL = 'cloud-boot-required';
    KIVO.__BS_NOSRV = 1;
    return;
  }
  var RAW = {
    getItem: Storage.prototype.getItem,
    setItem: Storage.prototype.setItem,
    removeItem: Storage.prototype.removeItem,
    clear: Storage.prototype.clear,
    key: Storage.prototype.key,
    len: Object.getOwnPropertyDescriptor(Storage.prototype, 'length')
  };
  RAW.length = function(st){ return RAW.len && RAW.len.get ? RAW.len.get.call(st) : st.length; };
  RAW.allKeys = function(){ var out=[], n=RAW.length(localStorage); for (var i=0;i<n;i++){ var k=RAW.key.call(localStorage, i); if (k!=null) out.push(k); } return out; };
  KIVO.__BS_RAWLS = RAW;
  /* KIVO_264 · D-7: الإدارةُ النشطة لكل تبويب — نسخةٌ في مخزن الجلسة (لكل تبويب، تبقى بإعادة التحميل) فوق قيمة الجهاز (افتراضُ التبويب الجديد) */
  var ACT_K = 'bassam_active_dept_v1', SSG = RAW.getItem, SSS = RAW.setItem, SSD = RAW.removeItem;
  function tabAct(){ try { var ss = window.sessionStorage; return ss ? SSG.call(ss, ACT_K) : null; } catch(e){ return null; } }
  function tabActSet(v){ try { var ss = window.sessionStorage; if (!ss) return; if (v == null) SSD.call(ss, ACT_K); else SSS.call(ss, ACT_K, String(v)); } catch(e){ /* مخزنُ الجلسة ممنوع — تبقى قيمةُ الجهاز وحدها */ } }

  /* R180: bassam_dstats_v1 — «الإحصائيات اليومية» صُمّمت مفتاحاً عامّاً واحداً للحرمين (R170) لكنه لم يُدرج
     هنا، فكانت كتابتُه تذهب إلى الإدارة النشطة: لكلِّ إدارةٍ نسخةٌ، ولا يقرؤها الخادمُ لغير مدير النظام */
  var GLOBAL = { 'bassam_depts_v1':1, 'bassam_gdepts_v1':1, 'bassam_active_dept_v1':1, 'bassam_theme':1, 'bassam_auth_users_v1':1, 'bassam_session_v1':1, 'bassam_perms_v1':1, 'bassam_platform_v1':1, 'bassam_notif_mute_v1':1 };
  var PREFIX = 'bsdept:';

  function readReg(){
    var raw;
    try { raw = RAW.getItem.call(localStorage,'bassam_depts_v1'); } catch(e){ return { state:'error', list:null }; }
    if (raw == null) return { state:'missing', list:null };
    var v = null;
    try { v = JSON.parse(raw); } catch(e){ return { state:'corrupt', list:null }; }
    if (!Array.isArray(v)) return { state:'corrupt', list:null };
    if (!v.length) return { state:'empty', list:[] };
    return { state:'ok', list:v };
  }

  var _reg = null, _act = null;                 // ذاكرة مؤقتة — القراءة كانت تُحلّل السجل في كل عملية تخزين
  var _grp = null, _grpRaw = undefined;          // ذاكرةُ سجلّ الهيكل بمفتاح نصِّه
  function invalidate(){ _reg = null; _act = null; KIVO.__dcWorld = (KIVO.__dcWorld || 0) + 1; }
  function reg(){
    if (_reg) { if (KIVO.__bsReadHook) KIVO.__bsReadHook('bassam_depts_v1'); return _reg; }
    var r = readReg();
    _reg = (r.state === 'ok') ? r.list : [];
    return _reg;
  }

  /* ── حارس النطاق ──────────────────────────────────────────────────────────
     «الإدارة النشطة» مفتاحُ جهازٍ يبقى بعد خروج مستخدم ودخول آخر. كان مدير
     إدارة (حساب موظف بصفة مدير) يهبط على آخر إدارة نشطة في هذا المتصفح —
     ولو كانت إدارة غيره — فيرى اسمها ويعمل في مفاتيحها (والخادم يرفضها).
     الحارس تضبطه طبقة الحسابات: يأخذ المعرّف المطلوب ويعيد المسموح به لهذا
     المستخدم — فلا يُفعَّل ولا يُقرأ نطاقٌ خارج صلاحيته أبداً، مهما كان المخزون. */
  var _guard = null;
  function guarded(a){ if (!_guard) return a; try { var g = _guard(a); return g || a; } catch(e){ return a; } }
  function active(){
    if (_act) { if (KIVO.__bsReadHook) KIVO.__bsReadHook('bassam_active_dept_v1'); return _act; }
    var a, rr = reg();
    try { a = RAW.getItem.call(localStorage,'bassam_active_dept_v1'); } catch(e){ a = null; }   /* إدارةُ التبويب، وإلا اختيارُ الجهاز الأخير (KIVO_264 · D-7) */
    if (!a || !rr.some(function(d){return d.id===a;})) {
      a = rr.length ? rr[0].id : 'd1';
    }
    var g = guarded(a);
    if (g !== a) a = g;
    try { if (RAW.getItem.call(localStorage,'bassam_active_dept_v1') !== a) RAW.setItem.call(localStorage,'bassam_active_dept_v1', a); } catch(e){}
    if (tabAct() !== a) tabActSet(a);              /* يُثبَّت للتبويب: تبديلٌ في تبويبٍ آخر لا يحوّله بعد الآن */
    _act = a;
    return a;
  }
  function scoped(k){ return PREFIX + active() + ':' + k; }
  function isScopable(k){ return typeof k==='string' && k.indexOf('bassam_')===0 && !GLOBAL[k]; }
  function map(k){ return isScopable(k) ? scoped(k) : k; }
  function mine(){ return PREFIX + active() + ':'; }

  /* ── إنذار امتلاء المساحة ────────────────────────────────────────────────────
     أغلب مسارات الحفظ (الموظفون، الجدول الشهري، الجولات، أقفال المهام) كانت
     تبتلع الاستثناء بـ catch فارغ: تضيف موظفاً فيظهر في القائمة لأن الحالة في
     الذاكرة تحدّثت، ثم يختفي عند إعادة التحميل لأن الكتابة فشلت ولم يُبلَّغ أحد.
     الإنذار هنا عند مصدر الكتابة الوحيد فيغطي كل المسارات الحالية والمستقبلية،
     ثم يُعاد رمي الاستثناء كما هو حتى لا يتغيّر منطق التراجع القائم. */
  var LABELS = { 'bassam_employees_v1':'قائمة الموظفين', 'bassam_staffing_v3':'الجدول الشهري', 'bassam_staffing_snap_v1':'بيان الشهر',
                 'bassam_rounds_v1':'جولات المتابعة اليومية', 'bassam_tasks_v1':'المهام',
                 'bassam_plan_v1':'الخطة التشغيلية' };
  var warned = 0;
  function isQuota(e){
    if (!e) return false;
    var n = e.name || '';
    return n === 'QuotaExceededError' || n === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014;
  }
  function quotaWarn(key){
    if (Date.now() - warned < 8000) return;
    warned = Date.now();
    var what = LABELS[key] || 'البيانات';
    var show = function(){
      var old = document.getElementById('bs-quota'); if (old) old.remove();
      var d = document.createElement('div');
      d.id = 'bs-quota'; d.setAttribute('dir','rtl');
      d.style.cssText = "position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:2147483500;max-width:560px;"
        + "background:var(--bg-xffffff);border:1px solid var(--bd-a17938300p35);border-right:4px solid var(--bd-xb3261e);border-radius:12px;"
        + "box-shadow:var(--shadow-elevated);padding:13px 16px;font-family:'Cairo',sans-serif;color:var(--fg-x141a1f);line-height:1.85";
      d.innerHTML = '<div style="font-weight:600;font-size:14px;color:var(--fg-xb3261e);margin-bottom:3px">مساحة التخزين ممتلئة — لم يُحفظ التغيير الأخير</div>'
        + '<div style="font-size:12.5px;color:var(--fg-x3a4149)">تعذّر حفظ «' + what + '». ما تراه على الشاشة الآن موجود في الذاكرة فقط وسيختفي عند إعادة التحميل.<br>'
        + 'صدّر نسخة احتياطية من «الإعدادات» ثم احذف بيانات قديمة (أشهر أو جولات لم تعد تحتاجها) لتحرير مساحة.</div>'
        + '<div style="margin-top:9px;text-align:left"><button id="bs-quota-x" style="font-family:\'Cairo\',sans-serif;font-size:12px;padding:5px 14px;border-radius:8px;border:1px solid var(--bd-xe4e7ea);background:var(--bg-xf7f8f9);cursor:pointer">إغلاق</button></div>';
      document.body.appendChild(d);
      var x = document.getElementById('bs-quota-x');
      if (x) x.addEventListener('click', function(){ d.remove(); });
    };
    try { if (document.body) show(); else document.addEventListener('DOMContentLoaded', show); } catch (e) {}
    try { console.error('[bassam] quota exceeded while saving:', key); } catch (e) {}
  }
  KIVO.__BS_QUOTA_WARN = quotaWarn;

  /* ── كاش قراءة آمن (read-through) — يزيل قراءات getItem المتكررة داخل الرسم الواحد.
     يُبطَل بالكامل عند أي كتابة (عبر الغلاف أو RAW مباشرة) وعند حدث storage. */
  var readCache = Object.create(null);
  /* كلُّ كتابةٍ (محليّةٌ أو واصلةٌ من الخادم عبر حدث storage) تُبطل ذاكرةَ
     القراءة وترفع نسخةَ العالم — فيُعاد رسمُ كلِّ مكوّنٍ يقرأ من المخزن */
  /* أجيالُ المفاتيح: كلُّ كتابةٍ ترفع جيلَ مفتاحها وحده (لا «العالم» كلَّه)؛ فلا يُعاد
     رسمُ صفحةٍ ثقيلةٍ لأن تنبيهاً كُتب أو مفتاحَ صفحةٍ أخرى تغيّر. الجذرُ ومسحُ
     المخزن كلِّه وتغييرُ الإدارة/السجلّ يبقون على إبطال العالم. */
  KIVO.__dcKeyVer = KIVO.__dcKeyVer || Object.create(null);
  KIVO.__dcWrite = KIVO.__dcWrite || 0;
  function bustCache(k){
    readCache = Object.create(null);
    try { if (KIVO.__bsParseScope) KIVO.__bsParseScope.clear(); } catch (e) {}
    if (k == null) KIVO.__dcWorld = (KIVO.__dcWorld || 0) + 1;
    else KIVO.__dcKeyVer[String(k)] = ++KIVO.__dcWrite;
  }
  (function(){
    var _s = RAW.setItem, _r = RAW.removeItem, _c = RAW.clear, _g = RAW.getItem;
    /* KIVO_264 · D-7: «الإدارةُ النشطة» لكل تبويب — كلُّ قراءةٍ لها من هذا التبويب تعيد قيمتَه، وكلُّ كتابةٍ (التبديل · الدخول · الاستعادة)
       تضبطه هو وتبقى في الجهاز افتراضاً للتبويب الجديد؛ وقيمةُ الجهاز وحدها حين لا قيمةَ للتبويب (أو مخزنُ الجلسة ممنوع) */
    RAW.getItem = function(k){ if (k === ACT_K && this === window.localStorage) { var t = tabAct(); if (t) return t; } return _g.call(this, k); };
    /* القيمةُ نفسُها لا تُبطل شيئاً — كتابةٌ متكرّرةٌ بلا تغيير (يومُ التركيز في كلِّ رسم) ليست حدثاً */
    RAW.setItem = function(k,v){ var same = false; try { same = (RAW.getItem.call(this, k) === String(v)); } catch (e) { same = false; } if (k === ACT_K && this === window.localStorage) tabActSet(v); if (!same) bustCache(k); return _s.call(this,k,v); };
    RAW.removeItem = function(k){ var had = true; try { had = (RAW.getItem.call(this, k) !== null); } catch (e) { had = true; } if (k === ACT_K && this === window.localStorage) tabActSet(null); if (had) bustCache(k); return _r.call(this,k); };
    RAW.clear = function(){ bustCache(); return _c.call(this); };
    /* كتابةٌ لا تُبطل شيئاً: لحقولٍ لا يقرؤها رسمٌ (طابعُ «آخر نشاط» في الجلسة) */
    KIVO.__bsSilentSet = function(k, v){ readCache = Object.create(null); return _s.call(localStorage, String(k), String(v)); };
  })();

  Storage.prototype.getItem = function(k){
    if (this !== window.localStorage) return RAW.getItem.call(this, k);
    var mk = map(k);
    if (mk in readCache) { if (KIVO.__bsReadHook) KIVO.__bsReadHook(mk); return readCache[mk]; }
    var v = RAW.getItem.call(this, mk);
    readCache[mk] = v;
    return v;
  };
  Storage.prototype.setItem    = function(k,v){
    try { return RAW.setItem.call(this, this===window.localStorage?map(k):k, v); }
    catch (e) { if (this === window.localStorage && isQuota(e)) quotaWarn(k); throw e; }
  };
  Storage.prototype.removeItem = function(k){ return RAW.removeItem.call(this, this===window.localStorage?map(k):k); };

  /* ── clear/key/length كانت غير مرقّعة: clear() واحدة كانت تمحو كل الإدارات
     والحسابات والجلسة دفعة واحدة وتعيد النظام لإعدادات المصنع بلا تأكيد. ─────── */
  function myKeys(){ var p = mine(); return RAW.allKeys().filter(function(k){ return k.indexOf(p)===0; }); }
  Storage.prototype.clear = function(){
    if (this !== window.localStorage) return RAW.clear.call(this);
    myKeys().forEach(function(k){ RAW.removeItem.call(localStorage, k); });
  };
  Storage.prototype.key = function(i){
    if (this !== window.localStorage) return RAW.key.call(this, i);
    var ks = myKeys(), p = mine();
    return (i >= 0 && i < ks.length) ? ks[i].slice(p.length) : null;
  };
  try {
    Object.defineProperty(Storage.prototype, 'length', {
      configurable: true,
      get: function(){ return (this === window.localStorage) ? myKeys().length : RAW.length(this); }
    });
  } catch(eLen){}

  /* تغييرٌ واصلٌ (من الخادم أو تبويبٍ آخر): مفتاحُه وحده يُبطَل — إلا سجلَّ الإدارات والهيكل والإدارةَ النشطة فتُبطل العالم.
     KIVO_264 · D-7: تبديلُ الإدارة في تبويبٍ آخر لا يعني هذا التبويبَ ما دامت له إدارتُه — كان يحوّل قراءاتِه وكتاباتِه إلى إدارةٍ لا يعرضها */
  try { window.addEventListener('storage', function(e){ var k = e && e.key; if (k === ACT_K && tabAct()) return; if (k == null || k === '' || k === 'bassam_depts_v1' || k === 'bassam_gdepts_v1' || k === ACT_K) { invalidate(); bustCache(); } else bustCache(String(k)); }); } catch(eEv){}

  /* عائلاتُ الصور الحيّة ثلاث: img_ و img_tsk (وهي img_ نفسُها بادئةً) و szp_.
     كان الجردُ يعرف الأولى وحدَها، فتبقى صورُ المضبوطات بلا صاحبٍ بعد حذف
     الإدارة — يتيمةٌ في المخزن. النمطُ نفسُه هو نمطُ جامع الصور في القشرة. */
  function imgIdsIn(text){ return KIVO.BassamImgRefs ? KIVO.BassamImgRefs.idsIn(text) : []; }

  KIVO.BassamDepts = {
    raw: RAW,
    ok: function(){ return !KIVO.__BS_STORAGE_FAIL; },
    list: function(){ return reg().slice(); },
    has: function(id){ return reg().some(function(d){ return d.id===id; }); },
    active: active,
    activeName: function(){ var a=active(); var d=reg().filter(function(x){return x.id===a;})[0]; return d?d.name:''; },
    activeSys: function(){ var a=active(); var d=reg().filter(function(x){return x.id===a;})[0]; return (d&&d.sys)||''; },
    /* كانت تقبل أي معرّف؛ والمعرّف المعلّق كان يسقط صامتاً على أول إدارة
       أي «أعطِه بيانات إدارة أخرى» بدل «امنعه» */
    setActive: function(id){
      if (!this.has(id)) return false;
      if (guarded(id) !== id) return false;               /* خارج نطاق المستخدم: يُرفض لا يُبدَّل */
      RAW.setItem.call(localStorage,'bassam_active_dept_v1', id); _act = id; return true;
    },
    /* تضبطه طبقة الحسابات عند التحميل وبعد كل دخول — وتُعاد قراءة النشطة فوراً */
    setScopeGuard: function(fn){ _guard = (typeof fn === 'function') ? fn : null; _act = null; return active(); },
    save: function(list){ RAW.setItem.call(localStorage,'bassam_depts_v1', JSON.stringify(list)); invalidate(); },
    /* ── KIVO_259 (إصلاح · مُستخرَجٌ من منطق الغلاف): شريحةُ صلاحيات نسخة الإدارة (سقفٌ · منحُ الموظفين · عدسات) عند الاستعادة — دالةٌ نقيّة
       على كائن bassam_perms_v1 تعيده معدَّلاً (أو null: لا كتابة). الاستبدال يكتبها دائماً، والدمج لا يكتبها إلا إن لم يكن للإدارة سقفٌ أو منحٌ قائمة.
       لا سجلَّ سقفٍ في النسخة (capSet:false أو ملفٌ قديم بسقفٍ فارغٍ ومنحٍ فارغة) = الإدارةُ على افتراضها: كلُّ الصفحات · وغيابُ العدسات = «الكل مفعّل».
       السقفُ يُصفّى بمفاتيح الصفحات والعدساتُ بمفاتيح العدسات كما هي في المنصة الآن (pageKeys · lensKeys = BassamPerm.PAGE_KEYS · LENS_KEYS — من
       KIVO_MANIFEST والإضافات): كانتا قائمتين حرفيّتين في الغلاف من عهدٍ أقدم (6 صفحات · 5 عدسات بلا «المصليات») فكانت الاستعادةُ تُسقط من سقف
       الإدارة كلَّ صفحةٍ أو عدسةٍ أُضيفت بعدهما (التخطيط · الروابط · المساعدة · التقرير اليومي · الاسترشاد · المضبوطات · الجائزة · المصليات …). */
    permSlice: function(pm, id, PP, mode, pageKeys, lensKeys){
      if (!id || !PP || typeof PP !== 'object' || Array.isArray(PP)) return null;
      pm = (pm && typeof pm === 'object' && !Array.isArray(pm)) ? pm : {};
      var KP = Array.isArray(pageKeys) && pageKeys.length ? pageKeys : ['emps','staff','plan','daily','tasks','admin'];
      var KL = Array.isArray(lensKeys) && lensKeys.length ? lensKeys : ['paths','gates','marks','dist','dens'];
      pm.caps = pm.caps || {}; pm.emps = pm.emps || {};
      var hasCur = (pm.caps[id] || []).length > 0 || Object.keys(pm.emps[id] || {}).length > 0;
      if (!(mode === 'replace' || !hasCur)) return null;
      var legacyNoCap = !('capSet' in PP) && Array.isArray(PP.cap) && !PP.cap.length && !Object.keys((PP.emps && typeof PP.emps === 'object') ? PP.emps : {}).length;
      if (PP.capSet === false || PP.cap == null || legacyNoCap) delete pm.caps[id];
      else pm.caps[id] = (Array.isArray(PP.cap) ? PP.cap : []).filter(function(k){ return KP.indexOf(k) !== -1; });
      pm.emps[id] = (PP.emps && typeof PP.emps === 'object' && !Array.isArray(PP.emps)) ? PP.emps : {};
      pm.lenses = pm.lenses || {};
      if (Array.isArray(PP.lenses)) pm.lenses[id] = PP.lenses.filter(function(k){ return KL.indexOf(k) !== -1; });
      else delete pm.lenses[id];
      return pm;
    },

    /* ── الإدارات العامة: مستوى تصنيفٍ واحد فوق الإدارات ─────────────────────
       سجلٌّ منفصل، والإدارة تشير إلى أبيها بالمعرّف لا بالاسم — فتغيير اسم
       الإدارة العامة لا يقطع صلتها بأبنائها. والحقل اختياري: كل إدارة قائمة
       اليوم بلا gid تعمل كما كانت، بلا خطوة تحويل ولا خطر على بياناتها.
       وهي تصنيفٌ لا وعاء: لا تحمل بيانات ولا صلاحيات ولا حساب دخول. */
    groups: function(){
      /* يُحلَّل مرةً لكلِّ نصٍّ — كان يُحلَّل آلافَ المرّات في الرسم الواحد (كلُّ فحصِ صلاحيةٍ يمرّ من هنا) */
      var raw = null;
      try { raw = RAW.getItem.call(localStorage,'bassam_gdepts_v1'); } catch(e){ return []; }
      if (raw === _grpRaw && _grp) return _grp;
      var v = null; try { v = JSON.parse(raw); } catch(e){ v = null; }
      _grp = Array.isArray(v) ? v : []; _grpRaw = raw;
      return _grp;
    },
    saveGroups: function(list){
      RAW.setItem.call(localStorage,'bassam_gdepts_v1', JSON.stringify(Array.isArray(list) ? list : []));
      invalidate();
    },
    groupName: function(gid){
      if (!gid) return '';
      var g = this.groups().filter(function(x){ return x.id === gid; })[0];
      return g ? g.name : '';
    },
    groupIdOf: function(id){
      var d = reg().filter(function(x){ return x.id === id; })[0];
      return (d && d.gid) || '';
    },
    activeGroupName: function(){ return this.groupName(this.groupIdOf(active())); },
    /* شجرة العرض: المجموعات بترتيب سجلها ثم دلوُ «بلا إدارة عامة».
       والمجموعة الفارغة تبقى ظاهرة — إخفاؤها يُخفي عن المشرف أنه أنشأها ولم
       يُسند إليها بعد. وإدارةٌ تشير إلى مجموعة محذوفة تسقط في الدلو تلقائياً
       فلا تختفي من القائمة أبداً. */
    /* الإدارات مرتّبةً على الشجرة — لتخرج صفوف السجل مجموعةً بترتيبها */
    treeFlat: function(){
      var out = [];
      this.tree().forEach(function(g){ g.depts.forEach(function(d){ out.push(d); }); });
      return out;
    },
    tree: function(){
      var ds = reg().slice(), out = [], seen = {};
      this.groups().forEach(function(g){
        var kids = ds.filter(function(d){ return d.gid === g.id; });
        kids.forEach(function(d){ seen[d.id] = 1; });
        out.push({ gid: g.id, name: g.name, depts: kids });
      });
      var rest = ds.filter(function(d){ return !seen[d.id]; });
      if (rest.length) out.push({ gid: '', name: 'إدارات بلا إدارة عامة', depts: rest });
      return out;
    },
    /* ══ الشجرة التنظيمية — عمقٌ غير محدود ═══════════════════════════════════
       كانت الإدارة العامة مستوى تصنيفٍ واحداً فوق الإدارات، فلا يتّسع الهيكل
       لقطاعٍ فوقها ولا لقسمٍ ووحدةٍ تحتها. والمنصة مطلوبٌ منها أن تستوعب هيكلاً
       من أربع طبقاتٍ اليوم وما يُستحدث غداً بلا برمجة.

       ولم يُنشأ سجلٌّ جديد ولا خطوة ترحيل: سجل الإدارات العامة نفسه
       (bassam_gdepts_v1) صار سجلَّ العقد، بزيادة حقلين اختياريين على كل عقدة:
         pid  — معرّف الأب (غائبٌ = جذر)
         kind — نوع العقدة نصّاً (قطاع · إدارة عامة · قسم · وحدة · أيّ شيء)
       فالمدخلات القائمة تُقرأ بالافتراض «إدارة عامة في الجذر» — وهو وصفها
       الصحيح اليوم حرفاً بحرف. لا بايت ينتقل ولا سجلٌّ يُعاد بناؤه.

       والإدارة تبقى ورقة الشجرة ووعاء البيانات الوحيد: سجلها bassam_depts_v1
       كما هو، وأبوها حقل gid القائم نفسه. فمفاتيح bsdept:<الإدارة>: لا تُمسّ.
       ولهذا النوع «إدارة» محجوزٌ لا يُسمّى به عقدةٌ فوقية. */
    NODE_KIND_DEPT: 'إدارة',
    NODE_KINDS_BASE: ['إدارة عليا', 'قطاع', 'إدارة عامة', 'إدارة', 'قسم', 'وحدة'],
    /* العقد الفوقية بحقولها مكتملةً — والافتراض يصف المدخلات القديمة بدقّة */
    nodes: function(){
      return this.groups().map(function(g){
        return { id: g.id, name: g.name,
                 pid: (g.pid === undefined || g.pid === null || g.pid === '') ? null : g.pid,
                 kind: String(g.kind || 'إدارة عامة') };
      });
    },
    saveNodes: function(list){
      this.saveGroups((Array.isArray(list) ? list : []).map(function(n){
        var o = { id: n.id, name: n.name, kind: String(n.kind || 'إدارة عامة') };
        if (n.pid) o.pid = n.pid;
        return o;
      }));
    },
    /* الأنواع المعروضة في القائمة: الأساسية وما استُحدث فعلاً — فالنوع الجديد
       يُضاف بمجرّد إسناده لعقدة، بلا سجلٍّ ثالثٍ يُصان */
    nodeKinds: function(){
      var out = this.NODE_KINDS_BASE.slice(), seen = {};
      out.forEach(function(k){ seen[k] = 1; });
      this.nodes().forEach(function(n){ if (n.kind && !seen[n.kind]) { seen[n.kind] = 1; out.push(n.kind); } });
      return out;
    },
    /* عقدةٌ واحدة بأيّ معرّف — فوقيةً كانت أم إدارة */
    nodeOf: function(id){
      if (!id) return null;
      var n = this.nodes().filter(function(x){ return x.id === id; })[0];
      if (n) return n;
      var d = reg().filter(function(x){ return x.id === id; })[0];
      return d ? { id: d.id, name: d.name, pid: (d.gid || null), kind: this.NODE_KIND_DEPT, dept: true } : null;
    },
    /* كل العقد معاً — الفوقية ثم الإدارات كأوراق */
    allNodes: function(){
      var self = this;
      return this.nodes().concat(reg().map(function(d){
        return { id: d.id, name: d.name, pid: (d.gid || null), kind: self.NODE_KIND_DEPT, dept: true };
      }));
    },
    parentIdOf: function(id){ var n = this.nodeOf(id); return n ? n.pid : null; },
    childrenOf: function(id){
      var p = (id === undefined || id === null || id === '') ? null : id;
      return this.allNodes().filter(function(n){ return n.pid === p; });
    },
    /* الأسلاف من الأقرب إلى الجذر — وحرسٌ ضد سجلٍّ تالفٍ يدور على نفسه */
    ancestorsOf: function(id){
      var out = [], seen = {}, c = this.parentIdOf(id), n = 0;
      while (c && !seen[c] && n++ < 64) { seen[c] = 1; out.push(c); c = this.parentIdOf(c); }
      return out;
    },
    descendantsOf: function(id){
      var self = this, out = [], seen = {};
      (function walk(p){
        self.childrenOf(p).forEach(function(k){ if (seen[k.id]) return; seen[k.id] = 1; out.push(k.id); walk(k.id); });
      })(id);
      return out;
    },
    pathOf: function(id){
      var self = this;
      return this.ancestorsOf(id).slice().reverse().map(function(x){ var n = self.nodeOf(x); return n ? n.name : x; });
    },
    /* حرس الدورة: لا تُنقل عقدةٌ تحت نفسها ولا تحت ذرّيتها — وإلا صارت الشجرة
       حلقةً مفرغة تُعلّق كل مَشْيٍ عليها. ولا يكون أبٌ إدارةً إلا لقسمٍ تحتها:
       الإدارة ورقةٌ في شجرة الإدارات، وما تحتها تفريعٌ داخلها. */
    canParent: function(id, pid) {
      if (!pid) return true;                       /* الجذر مسموحٌ دائماً */
      if (pid === id) return false;
      if (!this.nodeOf(pid)) return false;
      return this.descendantsOf(id).indexOf(pid) === -1;
    },
    nodeAdd: function(o) {
      o = o || {};
      var nm = String(o.name || '').trim(); if (!nm) return { ok: false, err: 'الاسم مطلوب' };
      var kind = String(o.kind || 'إدارة عامة').trim() || 'إدارة عامة';
      if (kind === this.NODE_KIND_DEPT) return { ok: false, err: 'النوع «إدارة» يُنشأ من سجل الإدارات — فهو وعاء البيانات' };
      var pid = o.pid || null;
      if (pid && !this.nodeOf(pid)) return { ok: false, err: 'الأب غير موجود' };
      var id = 'n' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
      this.saveNodes(this.nodes().concat([{ id: id, name: nm, pid: pid, kind: kind }]));
      invalidate();
      /* كل عقدةٍ تُنشأ يُفتح لها سقفُها في اللحظة نفسها — لا عقدةَ بلا سقف،
         ولا خطوةَ ضبطٍ منسيّة تُظهر الشاشة معطّلةً بلا سبب ظاهر */
      try { var P = KIVO.BassamPerm; if (P && P.seedCapFrom) P.seedCapFrom(id, pid); } catch(e){}
      return { ok: true, id: id };
    },
    nodeSave: function(id, o) {
      o = o || {};
      var list = this.nodes(), i = -1;
      list.forEach(function(n, j){ if (n.id === id) i = j; });
      if (i === -1) return { ok: false, err: 'العقدة غير موجودة' };
      if (o.name !== undefined) { var nm = String(o.name || '').trim(); if (!nm) return { ok: false, err: 'الاسم مطلوب' }; list[i].name = nm; }
      if (o.kind !== undefined) { var kd = String(o.kind || '').trim();
        if (kd === this.NODE_KIND_DEPT) return { ok: false, err: 'النوع «إدارة» محجوزٌ لوعاء البيانات' };
        if (kd) list[i].kind = kd; }
      if (o.pid !== undefined) {
        var np = o.pid || null;
        if (!this.canParent(id, np)) return { ok: false, err: 'نقلٌ يُنتج دورة — العقدة لا تكون تحت نفسها ولا تحت ذرّيتها' };
        list[i].pid = np;
      }
      this.saveNodes(list); invalidate();
      return { ok: true };
    },
    /* الحذف لا يُورِّث ولا يُيتّم: عقدةٌ لها أبناء لا تُحذف حتى يُنقلوا — فلا
       تسقط إدارةٌ ببياناتها من الشجرة بنقرةٍ واحدة */
    nodeDel: function(id) {
      var kd = this.childrenOf(id);
      if (kd.length) return { ok: false, err: 'لها ' + kd.length + ' ابناً — انقلهم أولاً ثم احذفها' };
      this.saveNodes(this.nodes().filter(function(n){ return n.id !== id; }));
      invalidate();
      return { ok: true };
    },
    /* أبُ الإدارة يُكتب في حقل gid القائم نفسه — لا حقل جديد ولا ترحيل */
    setDeptParent: function(did, pid) {
      if (!this.has(did)) return { ok: false, err: 'الإدارة غير موجودة' };
      if (pid && !this.nodeOf(pid)) return { ok: false, err: 'الأب غير موجود' };
      if (!this.canParent(did, pid || null)) return { ok: false, err: 'نقلٌ يُنتج دورة' };
      var l = reg().map(function(d){ return Object.assign({}, d); });
      l.forEach(function(d){ if (d.id === did) { if (pid) d.gid = pid; else delete d.gid; } });
      this.save(l);
      return { ok: true };
    },
    /* ══ KIVO_265 · طلبُ المالك (2026-10-19): السحبُ والإفلات في الشجرة ═══════════
       نقلُ عقدةٍ (فوقيةٍ أو إدارة) بالنسبة إلى عقدةٍ أخرى: inside = تحتها (تصير أباها) ·
       before/after = بجوارها تحت أبيها نفسِه وبترتيبها. الترتيبُ هو ترتيبُ السجلّ نفسِه
       (bassam_gdepts_v1 للعقد · bassam_depts_v1 للإدارات) فتتبعه القائمةُ الجانبية وrailTree
       بلا حقلٍ جديد. الإدارةُ ورقةٌ: لا توضع إدارةٌ تحت إدارة. والدورةُ ممنوعة (canParent). */
    moveNode: function(id, ref, pos) {
      var n = this.nodeOf(id), t = this.nodeOf(ref);
      if (!n || !t) return { ok: false, err: 'العقدة غير موجودة' };
      if (id === ref) return { ok: false, err: 'العقدة نفسُها' };
      pos = (pos === 'inside' || pos === 'before' || pos === 'after') ? pos : 'inside';
      var pid = pos === 'inside' ? ref : (t.pid || null);
      if (pos === 'inside' && t.dept && n.dept) return { ok: false, err: 'الإدارة ورقةٌ في الشجرة — لا توضع إدارةٌ تحت إدارة' };
      if (!this.canParent(id, pid)) return { ok: false, err: 'نقلٌ يُنتج دورة — العقدة لا تكون تحت نفسها ولا تحت ذرّيتها' };
      var sameList = pos !== 'inside' && !!t.dept === !!n.dept, i, j, item, list;
      if (n.dept) {
        list = reg().map(function(d){ return Object.assign({}, d); });
        for (i = 0; i < list.length; i++) if (list[i].id === id) break;
        item = list.splice(i, 1)[0]; if (pid) item.gid = pid; else delete item.gid;
        if (sameList) { for (j = 0; j < list.length; j++) if (list[j].id === ref) break; list.splice(pos === 'after' ? j + 1 : j, 0, item); }
        else list.push(item);
        this.save(list);
      } else {
        list = this.nodes();
        for (i = 0; i < list.length; i++) if (list[i].id === id) break;
        item = list.splice(i, 1)[0]; item.pid = pid;
        if (sameList) { for (j = 0; j < list.length; j++) if (list[j].id === ref) break; list.splice(pos === 'after' ? j + 1 : j, 0, item); }
        else list.push(item);
        this.saveNodes(list);
      }
      invalidate();
      var pn = pid ? ((this.nodeOf(pid) || {}).name || '') : '';
      var msg = pos === 'inside' ? 'نُقلت «' + n.name + '» تحت «' + t.name + '»'
              : (n.pid || null) === pid
                ? 'رُتّبت «' + n.name + '» ' + (pos === 'before' ? 'قبل' : 'بعد') + ' «' + t.name + '»'
                : 'نُقلت «' + n.name + '» ' + (pid ? 'تحت «' + pn + '»' : 'إلى الجذر') + ' ' + (pos === 'before' ? 'قبل' : 'بعد') + ' «' + t.name + '»';
      return { ok: true, pid: pid, msg: msg };
    },
    /* أوراقُ البيانات تحت عقدة — أساسُ كل نطاقٍ يُبنى لاحقاً */
    deptsUnder: function(id) {
      var self = this;
      if (!id) return reg().map(function(d){ return d.id; });
      return this.descendantsOf(id).filter(function(x){ var n = self.nodeOf(x); return !!(n && n.dept); });
    },
    /* ══ قائمة العرض الهرمية ═══════════════════════════════════════════════
       مصدرٌ واحد لترتيب الشجرة وعمقها في القائمة الجانبية: العقدة ثم إداراتها
       ثم عقدها الفرعية، بعمقٍ غير محدود. وما أبوه مفقود يُعرض في الجذر، وما
       لا أبَ له من الإدارات يُذيَّل بدلوٍ ظاهر — فلا يختفي شيءٌ عن العين أبداً.
       وحرسُ الزيارة يمنع سجلاً تالفاً يدور على نفسه من تعليق الصفحة. */
    railTree: function(){
      var nodes = this.nodes(), ds = reg().slice(), have = {}, out = [], seen = {};
      nodes.forEach(function(n){ have[n.id] = 1; });
      ds.forEach(function(d){ have[d.id] = 1; });
      var kidsOf = {}, dOf = {}, roots = [];
      nodes.forEach(function(n){
        var p = (n.pid && have[n.pid]) ? n.pid : null;
        if (!p) roots.push(n); else (kidsOf[p] = kidsOf[p] || []).push(n);
      });
      ds.forEach(function(d){ var p = (d.gid && have[d.gid]) ? d.gid : ''; (dOf[p] = dOf[p] || []).push(d); });
      function kidsN(id){ return ((dOf[id] || []).length + (kidsOf[id] || []).length); }
      function walk(o, depth, isDept){
        if (seen[o.id]) return; seen[o.id] = 1;
        out.push({ t: isDept ? 'dept' : 'node', id: o.id, name: o.name,
                   kind: isDept ? 'إدارة' : o.kind, depth: depth, kids: kidsN(o.id) });
        (dOf[o.id] || []).forEach(function(d){ walk(d, depth + 1, true); });
        (kidsOf[o.id] || []).forEach(function(k){ walk(k, depth + 1, false); });
      }
      roots.forEach(function(n){ walk(n, 0, false); });
      if ((dOf[''] || []).length) {
        out.push({ t: 'none', id: '', name: 'إدارات بلا أب', kind: '', depth: 0, kids: dOf[''].length });
        dOf[''].forEach(function(d){ walk(d, 1, true); });
      }
      return out;
    },
    keysOf: function(id){ var p=PREFIX+id+':'; return RAW.allKeys().filter(function(k){ return k.indexOf(p)===0; }); },
    allScopedKeys: function(){ return RAW.allKeys().filter(function(k){ return k.indexOf(PREFIX)===0; }); },
    imageIdsOf: function(id){
      var ids = {};
      this.keysOf(id).forEach(function(k){
        var v=''; try { v = RAW.getItem.call(localStorage,k)||''; } catch(e){}
        imgIdsIn(v).forEach(function(x){ ids[x]=1; });
      });
      return Object.keys(ids);
    },
    /* كان يحذف مفاتيح التخزين فقط ويترك صور الخرائط في IndexedDB بلا مرجع
       — فتُعاد حزمها في كل نسخة احتياطية لاحقة وتضخّمها بلا سبب مرئي */
    removeDept: function(id){
      var imgs = this.imageIdsOf(id);
      this.keysOf(id).forEach(function(k){ RAW.removeItem.call(localStorage, k); });
      if (imgs.length && KIVO.BassamIDB) imgs.forEach(function(x){ try { KIVO.BassamIDB.del(x); } catch(e){} });
      invalidate();
      return imgs.length;
    },
    /* ── هيكل القطاع الافتراضي — يُزرع مرةً عند أول تثبيت، أو بزر «زرع هيكل القطاع»
       من مدير النظام ← الإدارات ما دامت المنصة على إدارتها الافتراضية وحدها.
       ما وُجد باسمه يُربط ولا يُنشأ من جديد — فلا يُحذف شيءٌ ولا تُمسّ بيانات قائمة. */
    STRUCT_DEFAULT: {
      root:   { name: 'الإدارة العليا', kind: 'إدارة عليا' },
      sector: { name: 'قطاع خدمات الحشود بالمسجد الحرام', kind: 'قطاع' },
      gens: [
        { name: 'الإدارة العامة للتخطيط وخدمات الحشود', depts: ['إدارة تخطيط خدمات الحشود', 'إدارة الساحات', 'إدارة الأبواب', 'إدارة خدمات حشود الحرم', 'إدارة صحن المطاف'] },
        { name: 'الإدارة العامة للإرشاد المكاني',      depts: ['إدارة التثقيف والتوعية', 'إدارة اللوحات الإرشادية', 'إدارة الإرشاد المكاني باللغات', 'مركز خدمة الضيف'] },
        { name: 'الإدارة العامة للسلامة والأمن الصناعي', depts: ['إدارة مكافحة الظواهر السلبية', 'إدارة الأمن الصناعي', 'إدارة الأزمات والطوارئ', 'إدارة السلامة المهنية والبيئية'] },
        { name: 'غرفة عمليات المسجد الحرام',             depts: ['مركز الاتصال'] }
      ]
    },
    isDefaultOnly: function(){ var l = reg(); return this.nodes().length === 0 && l.length === 1 && !l[0].gid; },
    needsStructure: function(){ var S = this.STRUCT_DEFAULT; return !this.nodes().some(function(n){ return n.name === S.sector.name; }); },
    seedStructure: function(){
      var self = this, S = this.STRUCT_DEFAULT, out = { ok: true, nodes: 0, depts: 0, linked: 0 };
      function node(name, kind, pid){
        var ex = self.nodes().filter(function(n){ return n.name === name; })[0];
        if (ex) return ex.id;
        var r = self.nodeAdd({ name: name, kind: kind, pid: pid });
        if (r.ok) out.nodes++;
        return r.ok ? r.id : null;
      }
      var root = node(S.root.name, S.root.kind, null); if (!root) return { ok: false, err: 'تعذّر إنشاء جذر الهيكل' };
      var sec = node(S.sector.name, S.sector.kind, root); if (!sec) return { ok: false, err: 'تعذّر إنشاء القطاع' };
      S.gens.forEach(function(g){
        var gid = node(g.name, 'إدارة عامة', sec); if (!gid) return;
        g.depts.forEach(function(nm){
          var ex = reg().filter(function(d){ return d.name === nm; })[0];
          if (ex) { if (!ex.gid) { self.setDeptParent(ex.id, gid); out.linked++; } return; }
          var id = 'd' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
          self.save(reg().concat([{ id: id, name: nm, gid: gid }]));
          try { var P = KIVO.BassamPerm; if (P && P.seedCapFrom) P.seedCapFrom(id, gid); } catch(e){}
          out.depts++;
        });
      });
      invalidate();
      return out;
    },
    invalidate: invalidate
  };
})();
