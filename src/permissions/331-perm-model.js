/* ═══ نموذجُ الصلاحيات: سجلُّ الصفحات · الأوراق · السقف · الأنماط · الترحيلات · الإنفاذ · مفاتيحُ v24.9 ═══
   KIVO_257 · AUD-010: جزءٌ 2/6 من «src/auth/330-auth-perm.js» السابقة — مقسومةً بالمسؤولية بـtools/split_iife.mjs (tools/split/330-auth-perm.json)؛
   التبعياتُ بين الأجزاء صريحةٌ هنا وعبر المساحة الداخلية window.__BS_I.auth وحدها. */
(function(){
  var I = KIVO.__BS_I && KIVO.__BS_I.auth; if (!I || I.dead) return;   /* الجزءُ الأول لم يُحمَّل أو خرج مبكّراً ⇒ لا شيءَ بعده — كالـIIFE الواحدة */
  /* ← من الأجزاء السابقة */
  var D = I.D, K_SESS = I.K_SESS, K_USERS = I.K_USERS, RAW = I.RAW, cur = I.cur, curDept = I.curDept, isMgrKey = I.isMgrKey, isSuper = I.isSuper,
      requireMgr = I.requireMgr;
  /* → من أجزاءٍ لاحقة (تُستدعى وقتَ النداء لا التحميل) */
  function tplsList() { return I.tplsList.apply(this, arguments); }
  /* ═══ نظام الصلاحيات — مستويان ═══
     bassam_perms_v1 = { caps: { deptId: [pageKeys] }, emps: { deptId: { ekey: { pageKey: [acts] } } } }
     سقف الإدارة (مدير النظام) ثم صلاحيات الموظف داخله (المشرف أو مدير الإدارة).
     مدير النظام خارج المنظومة — يرى كل شيء دائماً. */
  var K_PERM = 'bassam_perms_v1';
  /* كان مفتاح «الإعدادات» (admin) معروضاً في واجهة السقف لكنه ناقص من هذه
     القائمة — وsetDeptCap تصفّي عليها فيُشطب صامتاً عند الحفظ ويرتد المؤشر. */
  /* ═══ سجل الصفحات — المصدر الوحيد لمنظومة الصلاحيات والتوجيه والقائمة الجانبية ═══
     أي صفحة جديدة تُضاف هنا فقط، فتدخل تلقائياً في سقوف الإدارات وفي حارس
     التنقّل وفي إخفاء الرابط. إضافتها في مكان آخر تعني صفحة بلا بوابة —
     وهو ما حصل مع «نظام الاسترشاد» فبقي مفتوحاً لكل الإدارات.
       key = مفتاح الصلاحية · nav = مفتاح التنقّل · name = الاسم المعروض */
  /* subs = التبويبات الداخلية للصفحة. تُعلَن هنا لأن لا سبيل لاكتشافها آلياً —
     فالعقد: سطر واحد لكل صفحة يحمل اسمها وتبويباتها، وأي إضافة تسري تلقائياً
     على سقف الإدارات وحارس القائمة والتوجيه بلا تعديل في مكان آخر.
     subStore = 'lenses' يعني أن اختيارات هذه الصفحة تُحفظ في مخزن العدسات
     القائم (توافقاً مع ما هو مطبَّق) بدل مخزن التبويبات الجديد. */
  var PAGE_REG = KIVO.KIVO_MANIFEST.clone('pages');   /* KIVO_247 · AUD-015: السجلُّ في manifests/pages.json (كان حرفياً هنا؛ شروحُه في notes هناك) — نسخةٌ عميقة مستقلة */
  var PAGE_OF = {}; PAGE_REG.forEach(function(p){ PAGE_OF[p.key] = p; });
  function subKeysOf(pk){ var p = PAGE_OF[pk]; return (p && p.subs) ? p.subs.map(function(x){ return x.key; }) : []; }
  function tabKeysOf(pk){ var p = PAGE_OF[pk]; return (p && p.tabs) ? p.tabs.map(function(x){ return x.key; }) : []; }
  /* ═══ حاويات العرض: روابطُ قائمةٍ بلا مفتاح صلاحية ═══════════════════════
     «مؤشرات الإدارة» تجمع لوحاتٍ موزّعةً على أربع صفحات في شاشةٍ واحدة. وهي
     ليست صفحةً تُمنح: أوراقُها هي أوراقُ صفحاتها بمفاتيحها نفسها (refs)، فلا
     مفتاحَ جديد، ولا ورقةٌ تُعرض مرّتين في الشجرتين، ولا خطوةَ ترحيل. ولذلك
     تُحفظ في سجلٍّ مستقل لا في سجل الصفحات الذي تُبنى منه الشجرتان.
     وظهورُ الرابط من ملك واحدةٍ من أوراقه. */
  var NAV_REG = KIVO.KIVO_MANIFEST.clone('containers');   /* AUD-015: الحاويات من الـmanifest */
  var PAGE_KEYS = PAGE_REG.map(function(p){ return p.key; });
  /* ═══ نموذج «الأوراق» — صلاحيات الموظف تُمنح على الصفحات الفعلية لا على الحاويات ═══
     الحاوية (صفحة لها subs أو tabs) لا تُخزَّن لها صلاحية: ظهورها في القائمة مشتقٌّ من
     أوراقها. مفتاح الورقة داخل الحاوية «pk/sk»، والصفحة المستقلة (بلا تبويبات) مفتاحها كما هو.
     الصفحات المستوردة داخل الحاويات (staff/plan/dreport/tasks) صفحاتٌ مستقلة بمفاتيحها. */
  function isContainer(pk){ var p = PAGE_OF[pk]; return !!(p && ((p.subs && p.subs.length) || (p.tabs && p.tabs.length))); }
  function leafKeysOf(pk){
    var p = PAGE_OF[pk]; if (!p) return [];
    var out = [];
    (p.subs || []).forEach(function(x){ out.push(pk + '/' + x.key); });
    (p.tabs || []).forEach(function(x){ out.push(pk + '/' + x.key); });
    return out;
  }
  function splitLeaf(k){ var i = String(k).indexOf('/'); return i === -1 ? { page:k, sub:'' } : { page:k.slice(0, i), sub:k.slice(i + 1) }; }
  /* كل الأوراق القابلة للمنح بأسمائها — مصدر شجرة الصلاحيات في الواجهتين */
  function leafReg(){
    var out = [];
    PAGE_REG.forEach(function(p){
      if (!isContainer(p.key)) { if (!p.under) out.push({ key:p.key, page:p.key, sub:'', name:p.name, kind:'page' }); return; }
      (p.subs || []).forEach(function(x){ out.push({ key:p.key + '/' + x.key, page:p.key, sub:x.key, name:x.name, kind:'sub' }); });
      (p.tabs || []).forEach(function(x){ out.push({ key:p.key + '/' + x.key, page:p.key, sub:x.key, name:x.name, kind:'tab' }); });
    });
    /* الصفحات المستوردة تحت حاوية (under) صفحاتٌ مستقلة بمفاتيحها */
    PAGE_REG.forEach(function(p){ if (p.under && !isContainer(p.key)) out.push({ key:p.key, page:p.key, sub:'', name:p.name, kind:'page', under:p.under }); });
    return out;
  }
  /* توسيع الشكل القديم {emps:[...]} إلى أوراق الإدارة المفعّلة — يُستعمل عند القراءة والقوالب */
  function expandPerms(obj, did){
    var out = {};
    Object.keys(obj || {}).forEach(function(k){
      var acts = (obj[k] || []).slice(); if (!acts.length) return;
      if (isContainer(k)) {
        var subs = deptSubs(did, k), tabs = deptTabs(did, k);
        subs.forEach(function(sk){ out[k + '/' + sk] = acts.slice(); });
        tabs.forEach(function(tk){ out[k + '/' + tk] = acts.slice(); });
      } else out[k] = acts;
    });
    return out;
  }
  /* الشكل المشتق على مستوى الصفحات (الحاوية = اتحاد أفعال أوراقها) — للمصفوفات والقائمة الجانبية */
  /* ورقةٌ لا تفتح صفحتها: لوحتها خارج الصفحة (كرصد الميدان في صفحة الموظف) */
  function isOffPage(pk, tk){ var p = PAGE_OF[pk]; if (!p) return false;
    var t = (p.tabs || []).filter(function(x){ return x.key === tk; })[0];
    if (t) return !!t.offPage;
    var u = (p.subs || []).filter(function(x){ return x.key === tk; })[0];
    return !!(u && u.offPage); }
  function derivePages(leaf){
    var out = {};
    Object.keys(leaf || {}).forEach(function(k){
      var acts = leaf[k] || []; if (!acts.length) return;
      var sp = splitLeaf(k);
      out[k] = acts.slice();
      /* الورقة تفتح صفحتها إلا ورقةً موسومة offPage — فتلك تُمنح وحدها بلا صفحتها */
      if (sp.sub && !isOffPage(sp.page, sp.sub)) { var cur9 = out[sp.page] || []; acts.forEach(function(a){ if (cur9.indexOf(a) === -1) cur9.push(a); }); out[sp.page] = cur9; }
    });
    /* القاعدة العامة: صفحة ساكنة تحت حاوية (under) ممنوحة → حاويتها تظهر (تخدم المهام والجدول الشهري والتشغيل الميداني والتقرير اليومي) */
    PAGE_REG.forEach(function(p){ if (p.under && out[p.key] && out[p.key].length) { var c = out[p.under] || []; out[p.key].forEach(function(a){ if (c.indexOf(a) === -1) c.push(a); }); out[p.under] = c; } });
    return out;
  }
  /* خرائط مشتقّة — لا تُكتب يدوياً */
  var NAV2PERM = {}, PERM2NAV = {};
  PAGE_REG.forEach(function(p){ NAV2PERM[p.nav] = p.key; PERM2NAV[p.key] = p.nav; });
  var ALL_ACTS = ['view','add','edit','del','approve','export'];
  /* ذاكرة مؤقتة لمخزن الصلاحيات — كان يُفكّ عند كل نداء وهو يُنادى لكل صفّ */
  var _pmMemo = null;
  function permStore(){
    if (_pmMemo) { if (KIVO.__bsReadHook) KIVO.__bsReadHook(K_PERM); return _pmMemo; }
    try { var o = JSON.parse(RAW.getItem.call(localStorage, K_PERM)); if (o && typeof o === 'object') {
      var r = { caps: o.caps || {}, emps: o.emps || {}, tplOf: o.tplOf || {}, lenses: o.lenses || {}, subs: o.subs || {}, empLens: o.empLens || {}, lensZ: o.lensZ, patterns: o.patterns || {} };
      /* caps-own: the ceiling mode travels with the registry (the server refuses a save that drops it — 021 capOwnWhy) */
      if (o.capOwn !== undefined) r.capOwn = o.capOwn; if (o.capMode !== undefined) r.capMode = o.capMode;
      /* تسامح: مفتاح الورقة القديم emps/tasks (من عهد «التوأم») يُقرأ tasks */
      try { var mv = false; Object.keys(r.emps).forEach(function(d9){ Object.keys(r.emps[d9] || {}).forEach(function(ek){ var pm9 = r.emps[d9][ek] || {}; if (pm9['emps/tasks']) { if (!pm9.tasks) pm9.tasks = pm9['emps/tasks']; delete pm9['emps/tasks']; mv = true; } }); }); if (mv) permSave(r); } catch (e9) {}
      /* ترقية: «المناطق» انضمّت لسقف العدسات — المصفوفات المخزونة قبلها تعدّها مفعّلة */
      if (!r.lensZ) {
        Object.keys(r.lenses).forEach(function(d){ var L = r.lenses[d]; if (Array.isArray(L) && L.indexOf('zones') === -1) L.push('zones'); });
        r.lensZ = 1; permSave(r);
      }
      _pmMemo = r;
      return r;
    } } catch(e){}
    var f0 = { caps: {}, emps: {}, tplOf: {}, lenses: {}, subs: {}, empLens: {}, lensZ: 1, patterns: {} };
    _pmMemo = f0;
    return f0;
  }
  function permSave(o){ _pmMemo = o; try { RAW.setItem.call(localStorage, K_PERM, JSON.stringify(o)); } catch(e){} }
  function rawCap(id){
    var c = permStore().caps[id];
    return Array.isArray(c) ? c.slice() : [];   /* الافتراضي: لا شيء متاح */
  }
  /* «لها سقفٌ مضبوط» غير «سقفُها فارغ»: الأولى غيابُ سجلٍّ أصلاً، والثانية
     قرارٌ صريح بالمنع. وخلطُهما كان يُفرغ سقوف الإدارات كلها — انظر التعليق
     في effCap. */
  function hasCap(id){ return Array.isArray(permStore().caps[id]); }
  /* ══ السقف على الشجرة ═════════════════════════════════════════════════════
     صار لكل عقدةٍ سقفُها في نفس المخزن caps[معرّف العقدة] — لا مخزنَ ثانياً.
     والسقف الفعليّ للإدارة = تقاطعُ سقفها بسقوف أسلافها كلها. فتضبط سقف
     القطاع مرةً فيصير حدّاً لكل ما تحته، ولا تضبطه أربع عشرة مرة.

     ولماذا التقاطع لا الجمع؟ لأن السقف حدٌّ لا منح: من ضيّق سقف القطاع أراد
     أن يضيّق ما تحته جميعاً، ولو كان جمعاً لأمكن ابناً أن يتجاوز أباه فيبطل
     معنى الحدّ. والسقف الفارغ في سلفٍ يعني «لا شيء متاح لفرعه كله» — ولهذا
     الجذر وحده هو ما يُضبط أولاً، ومنه يتدفّق القرار نزولاً. */
  /* ── تصحيحٌ جوهريّ: غيابُ السقف ليس منعاً ──────────────────────────────────
     كان التقاطع يشمل كل سلفٍ ولو لم يُضبط له سقفٌ قط، وسلفٌ بلا سجلٍّ يُقرأ
     «صفر صفحات» — فيُفرِغ فرعه كله. والأثر الذي رآه المستخدم: يضبط سقف إدارته
     فيراه محفوظاً، ثم يخرج ويعود فيجده فارغاً، ومديرُ الإدارة لا يرث شيئاً،
     والرسالة تقول «سقف هذه الإدارة فارغ» وقد ضبطه للتوّ. السبب أن عقدةً فوقه
     أُنشئت بلا سقفٍ مضبوط.
     فصار التقاطع مع الأسلاف الذين لهم سقفٌ مضبوطٌ صراحةً وحدهم. ومن ضُبط
     سقفُه فارغاً فذلك قرارٌ صريح يقفل فرعه — وهو المعنى المقصود. */
  function effCap(id){
    /* KIVO_265 · فحصُ Test (2026-10-19): إدارةٌ بلا سقفٍ خاص تحت سلفٍ مضبوط كانت تبدأ من «لا شيء» (rawCap = []) فيصير سقفُها
       الفعليُّ فارغاً وتبدو «مفتوحة» في اللوحة بينما صفحةُ الإعدادات بلا تبويبات — 9 إدارات على Test. المقصودُ المكتوب أعلاه:
       سقفُ القطاع يُضبط مرةً فيصير حدّاً لما تحته — أي أن غيرَ المضبوط يرث سقف أصله لا الفراغ. */
    var d = id || curDept(), own = hasCap(d) ? rawCap(d) : PAGE_KEYS.slice(), D = KIVO.BassamDepts;
    var o9 = permStore(); if (hasCap(d) && (o9.capMode === 'own' || (o9.capOwn && o9.capOwn[d] === true))) return own;   /* caps-own: an own-mode unit with its own record = that record alone (= 021 effCapOf) */
    if (!D || !D.ancestorsOf) return own;
    var anc = [];
    try { anc = (D.ancestorsOf(d) || []).filter(function(a){ return hasCap(a); }); } catch(e){ return hasCap(d) ? own : []; }   /* RISHAD266: تعذّرُ قراءة الأسلاف لا يفتح وحدةً بلا سجل (الخادمُ لا يفتحها) */
    if (!anc.length) return own;
    var out = own;
    for (var i = 0; i < anc.length; i++){
      var c = rawCap(anc[i]);
      out = out.filter(function(k){ return c.indexOf(k) !== -1; });
      if (!out.length) break;
    }
    return out;
  }
  /* السقف غير المضبوط في الإدارة وأسلافها كلها = مفتوح (كل الصفحات) — كما يقوله نص الشاشة «السقف مفتوح — لم يُضبط»؛
     وما إن يُضبط سجلٌّ في أي طبقة يصير هو الحدّ. */
  function capSetAnywhere(d){
    if (hasCap(d)) return true;
    try { var D = KIVO.BassamDepts; return !!(D && D.ancestorsOf && (D.ancestorsOf(d) || []).some(function(a){ return hasCap(a); })); } catch(e){ return true; }   /* RISHAD266: تعذّرُ القراءة لا يعني «مفتوح» */
  }
  function deptCap(did){ var d = did || curDept(); return capSetAnywhere(d) ? effCap(d) : PAGE_KEYS.slice(); }
  /* ═══ البوابة الموحّدة على مستوى الإدارة ═══
     on('emps') · on('emps/custody') · on('zones') — سؤال واحد: هل هذه القدرة مفعّلة لهذه الإدارة؟
     تقرأه القوالب وقارئات البيانات والمؤشرات والتنبيهات؛ لا استثناءات متناثرة. */
  function onCap(key, did){
    try {
      var d = did || curDept(); key = String(key || '');
      if (!key) return true;
      if (LENS_KEYS.indexOf(key) !== -1) return deptLenses(d).indexOf(key) !== -1;
      var i = key.indexOf('/');
      if (i > 0) {
        var pk = key.slice(0, i), sk = key.slice(i + 1);
        if (!onCap(pk, d)) return false;
        var q = PAGE_OF[sk]; if (q && q.under === pk) return onCap(sk, d);
        return deptSubs(d, pk).concat(deptTabs(d, pk)).indexOf(sk) !== -1;
      }
      if (PAGE_KEYS.indexOf(key) === -1) return true;
      return deptCap(d).indexOf(key) !== -1;
    } catch (e) { return true; }
  }
  function onAny(keys, did){ return (keys || []).some(function(k){ return onCap(k, did); }); }
  /* caps-own · read-time narrowing: narrowing a ceiling (pages here, tabs in setDeptSubs/setDeptTabs, lenses in setDeptLenses) writes the
     ceiling record alone. Employees' sheets, lens lists and explicit grants stay stored as they are and are read cut to their unit's
     effective ceiling (ceilSheet in empPerms · empLens ∩ unit lenses · p24KeyOn; the server the same — 021 empPermsOf · capOnDept ·
     lensGate · enfKeyOnCeiling), so widening it again restores exactly what each one had. (Was: trimEmps · pruneEmpLeaves · the empLens
     filter · p24TrimGrants deleted them, for a node's whole branch.) */
  function setDeptCap(did, arr){
    if (!isSuper()) return { ok:false, err:'سقف الإدارة للمشرف العام وحده' };
    var o = permStore(), d = did || curDept();
    o.caps[d] = (arr || []).filter(function(k){ return PAGE_KEYS.indexOf(k) !== -1; });
    permSave(o); return { ok:true };
  }
  /* caps-own: is unit d's ceiling independent of its ancestors? (bassam_perms_v1.capOwn[d] · or capMode 'own' for every unit = 021 capOwnOf) */
  function capOwnOf(did){ var o = permStore(), d = did || curDept(); return o.capMode === 'own' || !!(o.capOwn && o.capOwn[d] === true); }
  /* The explicit switch, system administrator only, one ordinary save of the registry. Switching on writes the unit's current effective
     ceiling as its own record (so nobody gains or loses a page at that moment; widening it is a later explicit edit). Switching off
     returns the unit to the ancestors' intersection (never wider). Nothing else is touched. */
  function setCapOwn(did, on){
    if (!isSuper()) return { ok:false, err:'سقف الإدارة للمشرف العام وحده' };
    var o = permStore(), d = did || curDept();
    if (o.capMode === 'own') return { ok:false, err:'السقوف كلها مستقلة' };
    if (!!on === capOwnOf(d)) return { ok:true, same:true };
    var c = deptCap(d), m = {}; Object.keys(o.capOwn || {}).forEach(function(k){ if (k !== d) m[k] = true; });
    if (on) { m[d] = true; o.caps[d] = c; }
    o.capOwn = m; permSave(o); return { ok:true };
  }
  /* read-time narrowing: the part of a sheet inside unit d's ceiling — its page in the effective ceiling and a sub-leaf in its page's live
     tabs (what the old trim kept); latentLeaves = the rest, stored and not read */
  function ceilSheet(sheet, did){
    var d = did || curDept(), cap = deptCap(d), live = {}, out = {};
    Object.keys(sheet || {}).forEach(function(k){
      var sp = splitLeaf(k); if (cap.indexOf(sp.page) === -1) return;
      if (sp.sub && (live[sp.page] || (live[sp.page] = deptSubs(d, sp.page).concat(deptTabs(d, sp.page)))).indexOf(sp.sub) === -1) return;
      out[k] = sheet[k];
    });
    return out;
  }
  function latentLeaves(p, d){
    if (!(p && typeof p === 'object')) return {};
    var full = Object.keys(p).some(function(k){ return isContainer(k); }) ? expandPerms(p, d) : p, on = ceilSheet(full, d), out = {};
    Object.keys(full).forEach(function(k){
      if (Object.prototype.hasOwnProperty.call(on, k)) return;
      var sp = splitLeaf(k); if (!PAGE_OF[sp.page] || (!sp.sub && isContainer(sp.page))) return;
      var acts = (full[k] || []).filter(function(a){ return ALL_ACTS.indexOf(a) !== -1; });
      if (acts.length) out[k] = acts;
    });
    return out;
  }
  /* وراثةُ السقف عند إنشاء عقدة: لقطةٌ من سقف الأب الفعليّ لا رابطٌ حيّ.
     لقطةً لأن التوسيع قرارٌ صريح: لو وسّعتَ سقف الأب لاحقاً لم يتوسّع الأبناء
     من تلقاء أنفسهم. أما التضييق فيسري فوراً بحكم التقاطع في effCap.
     والجذر يبدأ فارغاً — لا أبَ له يرث منه، وهو موضع القرار الإنساني. */

  /* ═══ أنماط السقف — «أساسي» وما فوقه: محفوظة في سجل الصلاحيات ويحرّرها مدير النظام من شاشة السقف ═══ */
  var PATTERN_META = [ { key:'basic', name:'أساسي', mode:'set', tip:'يؤشّر الشجرة بالنمط الأساسي — وهو ما يبدأ به كل ما يُنشأ من إدارات' },
                       { key:'office', name:'مكتبي', mode:'set', tip:'الأساسي + التقرير اليومي' },
                       { key:'field', name:'ميداني', mode:'set', tip:'الأساسي + الخطة التشغيلية والمتابعة اليومية بعدساتها ومؤشراتها' },
                       { key:'irshad', name:'+ استرشاد', mode:'add', tip:'يضيف نظام الاسترشاد ولوحته إلى التأشير الحالي' },
                       { key:'seized', name:'+ مضبوطات', mode:'add', tip:'يضيف نظام المضبوطات ولوحته إلى التأشير الحالي' } ];
  var PATTERN_DEF = {
    basic:  { cap:['emps','tasks','planning','staff','links','help','admin'], subs:{ emps:['data','custody'], planning:['readiness'], admin:['shifts','backup','ptpls','import'] }, tabs:{}, lenses:[] },
    office: { cap:['emps','tasks','planning','staff','links','help','admin','daily','dreport'], subs:{ emps:['data','custody'], planning:['readiness'], admin:['shifts','backup','ptpls','import'] }, tabs:{ daily:[] }, lenses:[] },
    field:  { cap:['emps','tasks','planning','staff','plan','links','help','admin','daily','dreport'], subs:{ emps:['data','custody'], planning:['readiness'], admin:['shifts','backup','ptpls','import'] }, tabs:{ daily:['kpiDaily','kpiOcc','kpiZones','rounds','field'] }, lenses:null /* = كلُّ العدسات (LENS_KEYS — من الإضافات · يُضبط بعد تعريفها أدناه · AUD-030) */ },
    irshad: { cap:['irshad'], subs:{ irshad:['dash','records'] }, tabs:{}, lenses:[] },
    seized: { cap:['seized'], subs:{ seized:['dash','records'] }, tabs:{}, lenses:[] }
  };
  function pClone(x){ return JSON.parse(JSON.stringify(x)); }
  function patternMeta(){ return pClone(PATTERN_META); }
  function patterns(){ var o = permStore(), p = o.patterns || {}, out = {}; PATTERN_META.forEach(function(m){ var v = p[m.key]; out[m.key] = (v && Array.isArray(v.cap)) ? pClone(v) : pClone(PATTERN_DEF[m.key]); }); return out; }
  function patternSet(key, draft){
    if (!PATTERN_DEF[key] || !draft || !Array.isArray(draft.cap)) return { ok:false, err:'نمط غير معروف' };
    var sup = false; try { sup = !!(KIVO.BassamAuth && KIVO.BassamAuth.isSuper && KIVO.BassamAuth.isSuper()); } catch(e){}
    if (!sup) return { ok:false, err:'أنماط السقف لمدير النظام وحده' };
    var o = permStore(); o.patterns = o.patterns || {}; o.patterns[key] = { cap: draft.cap.slice(), subs: pClone(draft.subs || {}), tabs: pClone(draft.tabs || {}), lenses: (draft.lenses || []).slice() };
    permSave(o); return { ok:true };
  }
  function uniq(a){ var s = {}; return (a || []).filter(function(x){ if (s[x]) return false; s[x] = 1; return true; }); }
  function patternApply(draft, key){
    var m = PATTERN_META.filter(function(x){ return x.key === key; })[0]; if (!m) return draft;
    var pt = patterns()[key];
    if (m.mode === 'set' || !draft) return pClone(pt);
    var out = { cap: uniq((draft.cap || []).concat(pt.cap)), subs: pClone(draft.subs || {}), tabs: pClone(draft.tabs || {}), lenses: uniq((draft.lenses || []).concat(pt.lenses || [])) };
    Object.keys(pt.subs || {}).forEach(function(k){ out.subs[k] = uniq((out.subs[k] || []).concat(pt.subs[k])); });
    Object.keys(pt.tabs || {}).forEach(function(k){ out.tabs[k] = uniq((out.tabs[k] || []).concat(pt.tabs[k])); });
    return out;
  }
  /* الإدارة الجديدة تبدأ بالنمط الأساسي — والسقف الفعلي يبقى تقاطعه مع سقوف الأسلاف */
  function patternSeed(did){
    var pt = patterns().basic; var o = permStore(); o.caps[did] = pt.cap.slice(); permSave(o);
    try { Object.keys(pt.subs || {}).forEach(function(k){ setDeptSubs(did, k, pt.subs[k]); }); Object.keys(pt.tabs || {}).forEach(function(k){ setDeptTabs(did, k, pt.tabs[k]); }); setDeptLenses(did, pt.lenses || []); } catch(e){}
    return { ok:true, n: pt.cap.length };
  }
  function seedCapFrom(id, pid){
    if (!id) return { ok:false, err:'معرّف مفقود' };
    var o = permStore();
    if (Array.isArray(o.caps[id])) return { ok:true, kept:true };   /* له سقفٌ مسبقاً — لا يُلمس */
    /* عقدةٌ في الجذر، أو أبوها بلا سقفٍ مضبوط: لا يُكتب لها سقفٌ فارغ — فذلك
       قرارُ منعٍ لم يتّخذه أحد، ويُفرِغ فرعها كله بصمت. تُترك بلا سجلّ حتى
       يُضبط، وغيابُ السجلّ لا يقيّد. */
    if (!pid || !hasCap(pid)) return { ok:true, open:true };
    /* KIVO_265 · ملاحظةُ المالك (2026-10-19): أبٌ سقفُه الفعليُّ فارغ (مضبوطٌ على لا شيء) كان يورِّث الفراغَ للعقدة الجديدة
       فتبدو المنصةُ للمدير خاليةً بلا سبب ظاهر. الفراغُ ليس قراراً يُورَّث: تبدأ العقدةُ بالنمط «أساسي». */
    var inh = effCap(pid);
    if (!inh.length) { var sd = patternSeed(id); return { ok:true, seeded:'basic', n: sd && sd.n }; }
    o.caps[id] = inh;
    permSave(o);
    return { ok:true, n: o.caps[id].length };
  }

  /* F01 · سقفُ القسم الجديد: لقطةٌ من سقف الإدارة الأم الفعليّ (deptCap — سجلُّها إن كان لها، وإلا ما ترثه من أسلافها) مرةً واحدة
     (لا سجلَّ للقسم قبلُ) — فلا يتجاوز سقفَ إدارته ولا يُبدَّل بنمطٍ آخر. لا سقفَ في السلسلة كلِّها ⇒ لا سجلّ (الغيابُ لا يقيّد).
     الخادمُ يحكم: مديرُ الإدارة الأم يبذره مرةً جزءاً من سقف إدارته (018 permsSecSeedOk) */
  function seedSectionCap(id, did){
    var D = KIVO.BassamDepts;
    if (!id || !did || !D || !D.parentDeptOf || D.parentDeptOf(id) !== did) return { ok:false, err:'ليس قسماً لهذه الإدارة' };
    var o = permStore();
    if (Array.isArray(o.caps[id])) return { ok:true, kept:true };
    if (!capSetAnywhere(did)) return { ok:true, open:true };
    o.caps[id] = deptCap(did).slice();
    permSave(o);
    return { ok:true, n: o.caps[id].length, own: hasCap(did) };
  }
  /* Irshad uses its typed API. Existing capability and grant values are preserved; no legacy JSON probe or automatic grant. */
  /* ═══ نظام المضبوطات — يُفعَّل مرة واحدة لكل إدارة تملك نظام الاسترشاد (شقيقه في القائمة) — ومدير النظام يعدّله من الإدارات كالمعتاد ═══ */
  (function migrateSeizedCap(){
    var FLAG = 'bassam_perm_seized_cap_v1';
    if (!isSuper()) return;   /* KIVO_263: ترحيلٌ عامّ يكتب مفاتيحَ لمدير النظام وحده (bassam_perms_v1 · العلامة) — من غيره كان يُرسَل فيرفضه الخادم برسالةٍ لم يتسبّب بها المستخدم («لم يُحفظ تعديلك على ترقية الصلاحيات»)؛ يجري حين يدخل مديرُ النظام */
    try {
      var R = (KIVO.BassamDepts && KIVO.BassamDepts.raw) || null;
      if (!R) return;
      if (R.getItem.call(localStorage, FLAG)) return;
      var o = permStore(), changed = false;
      Object.keys(o.caps || {}).forEach(function(id){
        var c = Array.isArray(o.caps[id]) ? o.caps[id].slice() : [];
        if (c.indexOf('irshad') !== -1 && c.indexOf('seized') === -1) { c.push('seized'); o.caps[id] = c; changed = true; }
      });
      if (changed) permSave(o);
      R.setItem.call(localStorage, FLAG, '1');
    } catch(e){}
  })();
  /* ═══ «المساعدة» انضمّت لسجل الصفحات — تُمنح مرة واحدة لكل إدارة لها سقف ولكل موظف له صلاحيات، فلا يفقدها أحد ═══ */
  (function migrateHelpCap(){
    var FLAG = 'bassam_perm_help_v1';
    if (!isSuper()) return;   /* KIVO_263: ترحيلٌ عامّ يكتب مفاتيحَ لمدير النظام وحده (bassam_perms_v1 · العلامة) — من غيره كان يُرسَل فيرفضه الخادم برسالةٍ لم يتسبّب بها المستخدم («لم يُحفظ تعديلك على ترقية الصلاحيات»)؛ يجري حين يدخل مديرُ النظام */
    try {
      var R = (KIVO.BassamDepts && KIVO.BassamDepts.raw) || null; if (!R) return;
      if (R.getItem.call(localStorage, FLAG)) return;
      var o = permStore(), changed = false;
      Object.keys(o.caps || {}).forEach(function(id){ var c = Array.isArray(o.caps[id]) ? o.caps[id] : []; if (c.length && c.indexOf('help') === -1) { c.push('help'); o.caps[id] = c; changed = true; } });
      Object.keys(o.emps || {}).forEach(function(d){ var em = o.emps[d] || {}; Object.keys(em).forEach(function(ek){ var p = em[ek]; if (p && typeof p === 'object' && Object.keys(p).length && !p.help) { p.help = ['view']; changed = true; } }); });
      if (changed) permSave(o);
      R.setItem.call(localStorage, FLAG, '1');
    } catch(e){}
  })();
  /* ═══ إلغاء توريث مدير الإدارة ═══
     كان حامل الشارة يرث سقف إدارته ضمناً. بعد إلغاء التوريث كان سيصحو المديرون
     القائمون بلا صفحة واحدة. تُكتب صلاحياتهم الفعلية الحالية صراحةً مرّة واحدة،
     فيبقى ما كان لهم كما هو — لكن صار مرئياً لمدير النظام وقابلاً للتضييق. */
  (function migrateMgrPerms(){
    var FLAG = 'bassam_perm_mgr_explicit_v1';
    if (!isSuper()) return;   /* KIVO_263: ترحيلٌ عامّ يكتب مفاتيحَ لمدير النظام وحده (bassam_perms_v1 · العلامة) — من غيره كان يُرسَل فيرفضه الخادم برسالةٍ لم يتسبّب بها المستخدم («لم يُحفظ تعديلك على ترقية الصلاحيات»)؛ يجري حين يدخل مديرُ النظام */
    try {
      var R = (KIVO.BassamDepts && KIVO.BassamDepts.raw) || null;
      if (!R) return;
      if (R.getItem.call(localStorage, FLAG)) return;
      var users = [];
      try { users = JSON.parse(R.getItem.call(localStorage, K_USERS)) || []; } catch(e){}
      var o = permStore(), changed = false;
      users.forEach(function(u){
        if (!u || u.role !== 'staff' || !u.mgr || !u.deptId) return;
        var cap = Array.isArray(o.caps[u.deptId]) ? o.caps[u.deptId] : [];
        if (!cap.length) return;
        o.emps[u.deptId] = o.emps[u.deptId] || {};
        /* لا يُمَس من مُنح صلاحيات صريحة أصلاً */
        var had = o.emps[u.deptId][u.ekey];
        if (had && typeof had === 'object' && Object.keys(had).length) return;
        var obj = {};
        cap.forEach(function(k){ obj[k] = ALL_ACTS.slice(); });
        o.emps[u.deptId][u.ekey] = obj; changed = true;
      });
      if (changed) permSave(o);
      R.setItem.call(localStorage, FLAG, '1');
    } catch(e){}
  })();
  /* ═══ سقف عدسات الكانفس — لكل إدارة قائمة العدسات المسموح بها في صفحتَي
     «الخطة التشغيلية» و«المتابعة اليومية» معاً (قائمة واحدة تسري عليهما).
     عدسة «المناطق» ثابتة دائماً ولا تُعطَّل — لذا لا تدخل في القائمة أصلاً.
     الافتراضي عند غياب السجل: كل العدسات الخمس مفعّلة (توافق رجعي كامل).
     التعطيل يخفي العدسة كلياً (تبويب/أدوات/خريطة/تقرير) والبيانات تبقى
     محفوظة كما هي وتعود فور إعادة التفعيل. */
  var LENS_KEYS = KIVO.KIVO_MANIFEST.clone('lenses').map(function(x){ return x.key; });   /* AUD-015: = مفاتيحُ LENS_REG (كانت قائمةً مكرَّرة يدوياً) */
  /* أسماؤها العربية بجانب مفاتيحها — كانت مكتوبة داخل سجل الصفحات مرّتين */
  var LENS_REG = KIVO.KIVO_MANIFEST.clone('lenses');   /* AUD-015 */
  PATTERN_DEF.field.lenses = LENS_KEYS.slice();   /* KIVO_259 · AUD-030: النمطُ «ميداني» = الخطةُ والمتابعةُ «بعدساتها» = كلُّ عدسات الإضافات (كانت قائمةً حرفيّة بالترتيب نفسِه) */
  /* ═══ سقف التبويبات الداخلية لكل إدارة ═══
     غياب السجل = كل التبويبات مفعّلة — نفس منطق العدسات، فلا تفقد إدارة قائمة
     شيئاً عند الترحيل. صفحات subStore:'lenses' تُقرأ وتُكتب من مخزن العدسات. */
  function deptSubs(did, pk){
    var all = subKeysOf(pk); if (!all.length) return [];
    var pg = PAGE_OF[pk];
    if (pg && pg.subStore === 'lenses') return deptLenses(did).filter(function(k){ return all.indexOf(k) !== -1; });
    var o = permStore(), d = did || curDept();
    var m = (o.subs || {})[d] || {};
    var L = m[pk];
    if (!Array.isArray(L)) return all.slice();
    return L.filter(function(k){ return all.indexOf(k) !== -1; });
  }
  function setDeptSubs(did, pk, arr){
    if (!isSuper()) return { ok:false, err:'سقف التبويبات للمشرف العام وحده' };
    var all = subKeysOf(pk); if (!all.length) return { ok:false, err:'لا تبويبات لهذه الصفحة' };
    var pg = PAGE_OF[pk];
    if (pg && pg.subStore === 'lenses') return setDeptLenses(did, arr);
    var o = permStore(), d = did || curDept();
    o.subs = o.subs || {}; o.subs[d] = o.subs[d] || {};
    o.subs[d][pk] = (Array.isArray(arr) ? arr : []).filter(function(k){ return all.indexOf(k) !== -1; });
    permSave(o); return { ok:true };   /* caps-own: no trim — read-time narrowing (setDeptCap) */
  }
  /* ── مجموعة السقف الثانية: التبويبات ──────────────────────────────────────
     تسكن في مخزن subs نفسه لكن تحت مفتاح «الصفحة:tabs» — فلا تصطدم بمجموعة
     subs الأولى حتى لو أُضيفت tabs مستقبلاً إلى صفحة مخزنها الافتراضي. */
  function tabSlot(pk){ return pk + ':tabs'; }
  function deptTabs(did, pk){
    var all = tabKeysOf(pk); if (!all.length) return [];
    var o = permStore(), d = did || curDept();
    var m = (o.subs || {})[d] || {};
    var L = m[tabSlot(pk)];
    if (!Array.isArray(L)) return all.slice();          /* الافتراضي: الكل مفعّل */
    return L.filter(function(k){ return all.indexOf(k) !== -1; });
  }
  function setDeptTabs(did, pk, arr){
    if (!isSuper()) return { ok:false, err:'سقف التبويبات للمشرف العام وحده' };
    var all = tabKeysOf(pk); if (!all.length) return { ok:false, err:'لا تبويبات لهذه الصفحة' };
    var o = permStore(), d = did || curDept();
    o.subs = o.subs || {}; o.subs[d] = o.subs[d] || {};
    o.subs[d][tabSlot(pk)] = (Array.isArray(arr) ? arr : []).filter(function(k){ return all.indexOf(k) !== -1; });
    permSave(o); return { ok:true };   /* caps-own: no trim — read-time narrowing (setDeptCap) */
  }
  function tabOn(pk, tk){
    try {
      if (isSuper()) return onCap(pk + '/' + tk);      /* المشرف يرى الإدارة النشطة بسقفها كما يراها مديرها */
      if (deptTabs(null, pk).indexOf(tk) === -1) return false;
      return can(pk + '/' + tk, 'view');
    } catch (e) { return false; }
  }

  /* هل يرى المستخدم الحالي هذا التبويب؟ صفحة بلا صلاحية عرض تُغلق تبويباتها،
     ومدير النظام يرى كل شيء كبقية المنظومة. */
  function subOn(pk, sk){
    try {
      if (isSuper()) return onCap(pk + '/' + sk);
      /* الصفحة الساكنة تحت هذه الحاوية تبويبٌ فيها — يتبع صلاحية صفحته (مفتاحها المستقل) */
      var q = PAGE_OF[sk]; if (q && q.under === pk) return can(sk, 'view');
      if (deptSubs(null, pk).indexOf(sk) === -1) return false;
      return can(pk + '/' + sk, 'view');
    } catch (e) { return false; }
  }
  /* هل تملك الجلسة الحالية فعلاً على ورقة بعينها؟ */
  function canSub(pk, sk, act){ try { if (isSuper()) return onCap(pk + '/' + sk); if (deptSubs(null, pk).concat(deptTabs(null, pk)).indexOf(sk) === -1) return false; return can(pk + '/' + sk, act || 'view'); } catch (e) { return false; } }

  function deptLenses(did){
    var o = permStore(), d = did || curDept();
    var L = (o.lenses || {})[d];
    if (!Array.isArray(L)) return LENS_KEYS.slice();   /* الافتراضي: الكل مفعّل */
    return L.filter(function(k){ return LENS_KEYS.indexOf(k) !== -1; });
  }
  function setDeptLenses(did, arr){
    if (!isSuper()) return { ok:false, err:'سقف العدسات للمشرف العام وحده' };
    var o = permStore(), d = did || curDept();
    o.lenses = o.lenses || {};
    o.lenses[d] = (arr || []).filter(function(k){ return LENS_KEYS.indexOf(k) !== -1; });
    permSave(o); return { ok:true };   /* caps-own: employees' lens lists stay — read ∩ unit lenses (empLens · server lensGate) */
  }
  /* عدسات الموظف: غياب السجل = كل عدسات الإدارة (توافق رجعي) */
  function empLens(ekey, did){
    var o = permStore(), d = did || curDept();
    var L = ((o.empLens || {})[d] || {})[ekey];
    var dl = deptLenses(d);
    if (!Array.isArray(L)) return dl.slice();
    return L.filter(function(k){ return dl.indexOf(k) !== -1; });
  }
  function setEmpLens(ekey, arr, did){
    var g = requireMgr(); if (g) return g;
    var o = permStore(), d = isSuper() ? (did || curDept()) : curDept(), dl = deptLenses(d);
    o.empLens = o.empLens || {}; o.empLens[d] = o.empLens[d] || {};
    /* caps-own: lenses switched off for the unit stay latent — an explicit list keeps its own; an absent list (= all lenses) keeps those the
       grantor holds (system administrator / inheriting: all; a grantor with an explicit list: his list). The server refuses adding an off lens
       to an explicit list that lacked it (018 permsRule «cap») */
    var prev = o.empLens[d][ekey], u = cur(), mine = isSuper() || !u || (u.role !== 'staff' && u.role !== 'gm') ? null : o.empLens[d][u.ekey];
    var lat = LENS_KEYS.filter(function(k){ return dl.indexOf(k) === -1 && (Array.isArray(prev) ? prev.indexOf(k) !== -1 : (!Array.isArray(mine) || mine.indexOf(k) !== -1)); });
    o.empLens[d][ekey] = (Array.isArray(arr) ? arr : []).filter(function(k){ return dl.indexOf(k) !== -1; }).concat(lat);
    permSave(o); return { ok:true };
  }
  function lensOn(key, did){
    if (isSuper()) return onCap(key, did);             /* المشرف يرى الإدارة النشطة بسقفها */
    if (deptLenses(did).indexOf(key) === -1) return false;
    var u = cur(); if (!u) return false;
    if (u.role === 'staff' || u.role === 'gm') return empLens(u.ekey, did || curDept()).indexOf(key) !== -1;
    return true;
  }
  /* صلاحيات الموظف على مستوى الأوراق — الشكل القديم (مفتاح حاوية) يُوسَّع عند القراءة */
  function empPerms(ekey, did){
    var d = did || curDept();
    var p = (permStore().emps[d] || {})[ekey];
    if (!(p && typeof p === 'object')) return {};
    var hasOld = Object.keys(p).some(function(k){ return isContainer(k); });
    return ceilSheet(hasOld ? expandPerms(p, d) : JSON.parse(JSON.stringify(p)), d);   /* caps-own: read-time narrowing */
  }
  /* الشكل المشتق على مستوى الصفحات (الحاوية = اتحاد أوراقها) — للمصفوفات والقائمة */
  function empPagePerms(ekey, did){ return derivePages(empPerms(ekey, did)); }
  function cleanLeafPerms(obj, d){
    var cap = deptCap(d), clean = {};
    var src = expandPerms(obj || {}, d);
    Object.keys(src).forEach(function(k){
      var sp = splitLeaf(k);
      if (cap.indexOf(sp.page) === -1) return;                  /* لا منح خارج السقف */
      if (sp.sub) { if (deptSubs(d, sp.page).concat(deptTabs(d, sp.page)).indexOf(sp.sub) === -1) return; }
      else if (isContainer(sp.page) || !PAGE_OF[sp.page]) return;
      var acts = (src[k] || []).filter(function(a){ return ALL_ACTS.indexOf(a) !== -1; });
      if (!acts.length) return;
      if (acts.indexOf('view') === -1) acts.push('view');      /* العرض شرط الباقي */
      clean[k] = acts;
    });
    return clean;
  }
  function setEmpPerms(ekey, obj, did){
    var g = requireMgr(); if (g) return g;
    var o = permStore(), d = isSuper() ? (did || curDept()) : curDept();
    var clean = cleanLeafPerms(obj, d);
    /* caps-own: what lies outside the ceiling in his stored sheet (the editors do not show it — empPerms is cut) stays as it is; the system
       administrator's own out-of-ceiling leaves (a template under a narrowed ceiling) are added. Others' new ones would be refused («cap») */
    var lat = latentLeaves((o.emps[d] || {})[ekey], d), lx = isSuper() ? latentLeaves(obj, d) : {};
    Object.keys(lx).forEach(function(k){ lat[k] = lx[k]; });
    Object.keys(lat).forEach(function(k){ if (!Object.prototype.hasOwnProperty.call(clean, k)) clean[k] = lat[k]; });
    o.emps[d] = o.emps[d] || {}; o.emps[d][ekey] = clean; permSave(o);
    return { ok:true };
  }
  /* ═══ ترحيل لمرة واحدة: صلاحيات الموظفين من مفاتيح الحاويات إلى الأوراق ═══ */
  (function migrateLeafPerms(){
    var FLAG = 'bassam_perm_leaf_v1';
    if (!isSuper()) return;   /* KIVO_263: ترحيلٌ عامّ يكتب مفاتيحَ لمدير النظام وحده (bassam_perms_v1 · العلامة) — من غيره كان يُرسَل فيرفضه الخادم برسالةٍ لم يتسبّب بها المستخدم («لم يُحفظ تعديلك على ترقية الصلاحيات»)؛ يجري حين يدخل مديرُ النظام */
    try {
      var R = (KIVO.BassamDepts && KIVO.BassamDepts.raw) || null; if (!R) return;
      if (R.getItem.call(localStorage, FLAG)) return;
      var o = permStore(), changed = false;
      Object.keys(o.emps || {}).forEach(function(d){
        var em = o.emps[d] || {};
        Object.keys(em).forEach(function(ek){
          var p = em[ek]; if (!(p && typeof p === 'object')) return;
          if (!Object.keys(p).some(function(k){ return isContainer(k); })) return;
          em[ek] = expandPerms(p, d); changed = true;
        });
      });
      if (changed) permSave(o);
      R.setItem.call(localStorage, FLAG, '1');
    } catch(e){}
  })();
  /* ═══ ترحيل لمرة واحدة: ورقتا «الورديات» و«قوالب الصلاحيات» ═══
     القائمة المخزَّنة لأوراق «الإعدادات» تسبق وجودهما، وغيابُ المفتاح من قائمةٍ
     مخزَّنةٍ يعني «مطفأة» لا «جديدة» — فتُولدان مطفأتين عند كل إدارةٍ سبق ضبطُها.
     هنا تُلحَقان بكل قائمةٍ مخزَّنة مرةً واحدة، فتبدآن مفعّلتين كما لو وُجدتا معها. */
  (function migrateAdminSubs(){
    var FLAG = 'bassam_perm_admsubs_v2';   /* v2: أُلحق بها 'import' */
    if (!isSuper()) return;   /* KIVO_263: ترحيلٌ عامّ يكتب مفاتيحَ لمدير النظام وحده (bassam_perms_v1 · العلامة) — من غيره كان يُرسَل فيرفضه الخادم برسالةٍ لم يتسبّب بها المستخدم («لم يُحفظ تعديلك على ترقية الصلاحيات»)؛ يجري حين يدخل مديرُ النظام */
    try {
      var R = RAW; if (R.getItem.call(localStorage, FLAG)) return;
      var o = permStore(), changed = false;
      Object.keys(o.subs || {}).forEach(function(d){
        var L = (o.subs[d] || {}).admin;
        if (!Array.isArray(L)) return;
        ['shifts','ptpls','import'].forEach(function(k){ if (L.indexOf(k) === -1) { L.push(k); changed = true; } });
      });
      if (changed) permSave(o);
      R.setItem.call(localStorage, FLAG, '1');
    } catch(e){}
  })();
  /* ═══ R180: «الإحصائيات اليومية» مفتاحٌ عامٌّ واحد — جمعُ ما كُتب تحت الإدارات ═══
     كانت طبقةُ التخزين تكتبه تحت الإدارة النشطة (bsdept:<id>:bassam_dstats_v1) فصار لكلِّ إدارةٍ نسختُها ولا يراها
     غيرُ مدير النظام. أُدرج في المفاتيح العامة، وتُجمع النسخُ هنا مرّةً واحدة عند أوّل تحميلٍ لمدير النظام:
     ما في المفتاح العامّ يبقى، ثم أغنى النسخ أيّاماً فما دونها — يُضاف اليومُ أو القفلُ الغائب ولا يُستبدل شيء.
     والنسخُ القديمة تبقى في أماكنها كما هي (لا يُحذف شيء)، و«mig» في المخزن نفسِه علامةُ تمام الجمع
     فلا يعود يومٌ حذفه صاحبُه بعد ذلك. */
  (function migrateDstatsGlobal(){
    try {
      if (!isSuper()) return;
      var K = 'bassam_dstats_v1', gRaw = RAW.getItem.call(localStorage, K), g = null;
      if (gRaw != null && gRaw.indexOf('"mig":1') !== -1) return;       /* تمّ الجمع — لا يُفكّ المخزنُ كلُّه في كل تحميل */
      if (gRaw != null) { try { g = JSON.parse(gRaw); } catch(e0){ return; } if (!g || typeof g !== 'object' || Array.isArray(g) || g.mig) return; }
      var re = /^bsdept:[^:]+:bassam_dstats_v1$/, src = [];
      RAW.allKeys().forEach(function(k){ if (!re.test(k)) return;
        try { var o = JSON.parse(RAW.getItem.call(localStorage, k)); if (o && typeof o === 'object' && !Array.isArray(o)) src.push(o); } catch(e1){} });
      if (!src.length) return;
      var nDays = function(o){ var n = 0; ['haram','nabawi'].forEach(function(st){ var m = o[st]; if (m && typeof m === 'object') n += Object.keys(m).length; }); return n; };
      src.sort(function(a, b){ return nDays(b) - nDays(a); });
      var out = g ? JSON.parse(JSON.stringify(g)) : {};
      src.forEach(function(o){
        ['haram','nabawi','locks'].forEach(function(st){ var m = o[st]; if (!m || typeof m !== 'object' || Array.isArray(m)) return;
          if (!out[st] || typeof out[st] !== 'object' || Array.isArray(out[st])) out[st] = {};
          Object.keys(m).forEach(function(k){ if (!Object.prototype.hasOwnProperty.call(out[st], k)) out[st][k] = m[k]; }); });
      });
      out.mig = 1;
      RAW.setItem.call(localStorage, K, JSON.stringify(out));
    } catch(e){}
  })();
  /* هوية القالب الممنوح — تُحفظ صراحةً لأن استنتاجها من الصفحات يخلط بين
     قالبين يحملان نفس الصفحات فيظهر الأوّل منهما لكل من مُنح أيّاً منهما. */
  function empTpl(ekey, did){
    var o = permStore(), d = did || curDept();
    var v = ((o.tplOf || {})[d] || {})[ekey];
    return typeof v === 'string' ? v : '';
  }
  function setEmpTpl(ekey, tplId, did){
    var o = permStore(), d = isSuper() ? (did || curDept()) : curDept();
    o.tplOf = o.tplOf || {}; o.tplOf[d] = o.tplOf[d] || {};
    if (tplId) o.tplOf[d][ekey] = tplId; else delete o.tplOf[d][ekey];
    permSave(o);
    /* KIVO_256 (الإنفاذُ وحده): المنحُ الصريح يتبع القالب */
    var g24 = p24AfterTpl(ekey, tplId, d);
    return (g24 && g24.ok === false) ? { ok:true, grantErr: g24.err } : { ok:true };
  }
  function dropEmpTpl(ekey, did){
    var o = permStore(), d = did || curDept();
    if (o.tplOf && o.tplOf[d] && o.tplOf[d][ekey] !== undefined) { delete o.tplOf[d][ekey]; permSave(o); }
  }
  function clearEmpPerms(ekey, did){
    var g = requireMgr(); if (g) return g;
    var o = permStore(), d = isSuper() ? (did || curDept()) : curDept();
    if (o.emps[d]) { delete o.emps[d][ekey]; }
    if (o.tplOf && o.tplOf[d]) { delete o.tplOf[d][ekey]; }
    if (o.empLens && o.empLens[d]) { delete o.empLens[d][ekey]; }
    permSave(o);
  }
  /* مسح صلاحيات مفتاحٍ بعينه — تُستدعى عند حذف حسابه فلا يبقى سجلٌّ يتيم */
  function dropEmpPerms(ekey, did){
    if (!ekey) return { ok:false };
    var o = permStore(), d = did || curDept();
    var hit = false;
    if (o.emps && o.emps[d] && o.emps[d][ekey] !== undefined) { delete o.emps[d][ekey]; hit = true; }
    if (o.tplOf && o.tplOf[d] && o.tplOf[d][ekey] !== undefined) { delete o.tplOf[d][ekey]; hit = true; }
    if (o.empLens && o.empLens[d] && o.empLens[d][ekey] !== undefined) { delete o.empLens[d][ekey]; hit = true; }
    if (hit) permSave(o);
    return { ok:true };
  }
  /* مكنسة: تمسح صلاحيات كل مفتاحٍ لا حساب دخول له في الإدارة — تنظّف ما خلّفته
     عمليات حذفٍ سابقة قبل ربط الصلاحيات بالحساب. تُستدعى عند فتح الجداول. */
  function pruneOrphanEmpPerms(did){
    try {
      var d = did || curDept(); var o = permStore();
      var mp = (o.emps || {})[d]; if (!mp) return { ok:true, removed:0 };
      var live = {};
      (JSON.parse(RAW.getItem.call(localStorage, 'bassam_auth_users_v1') || '[]') || []).forEach(function(x){
        if (x && x.role === 'staff' && x.deptId === d && x.ekey) live[x.ekey] = 1;
        if (x && x.role === 'gm' && x.ekey && gmScopeOk(d, x.gid)) live[x.ekey] = 1;
      });
      var gone = Object.keys(mp).filter(function(k){ return !live[k]; });
      if (!gone.length) return { ok:true, removed:0 };
      gone.forEach(function(k){ delete mp[k]; if (o.tplOf && o.tplOf[d]) delete o.tplOf[d][k]; if (o.empLens && o.empLens[d]) delete o.empLens[d][k]; });
      permSave(o);
      return { ok:true, removed: gone.length };
    } catch(e){ return { ok:false }; }
  }
  /* سقف الإدارة كصلاحياتٍ كاملة — مع احترام أوراقها المطفأة: ورقةٌ أطفأها مدير
     النظام لهذه الإدارة لا يرثها مديرُها، وإلا لم يكن للإطفاء معنى. */
  function capAllPerms(did){
    var out = {}, d = did || curDept();
    deptCap(d).forEach(function(k){
      out[k] = ALL_ACTS.slice();
      var live = deptSubs(d, k).concat(deptTabs(d, k));
      leafKeysOf(k).forEach(function(l){
        var sp = splitLeaf(l);
        if (sp.sub && live.indexOf(sp.sub) === -1) return;
        out[l] = ALL_ACTS.slice();
      });
    });
    /* صفحة مستقلة تسكن حاويةً خارج السقف (كالمهام تحت المتابعة اليومية في إدارة مكتبية): الحاوية تُفتح للعرض كي تصل الصفحة — بلا أفعال كتابة على الحاوية نفسها */
    PAGE_REG.forEach(function(p){ if (p.under && out[p.key] && out[p.key].length && !out[p.under]) out[p.under] = ['view']; });
    return out;
  }
  /* هل خُزِّنت لهذا المفتاح ورقةُ صلاحياتٍ صراحةً؟ (لا تُخلط بورقةٍ خُزِّنت فارغة) */
  function gmScopeOk(did, gid){ try { if (D.groupIdOf(did) === gid) return true; return (D.ancestorsOf ? (D.ancestorsOf(did) || []) : []).indexOf(gid) !== -1; } catch(e){ return false; } }
  function hasOwnSheet(ekey, did){
    var p = (permStore().emps[did || curDept()] || {})[ekey];
    return !!(p && typeof p === 'object');
  }
  function myPerms(){
    var u = cur(); if (!u) return {};
    var all = {};
    if (u.role === 'super') {
      /* المشرف العام: صلاحياته على الإدارة النشطة بسقفها — والإعدادات له دائماً */
      all = capAllPerms(curDept());
      all.admin = ALL_ACTS.slice(); leafKeysOf('admin').forEach(function(l){ all[l] = ALL_ACTS.slice(); });
      return all;
    }
    /* ═══ مدير الإدارة يرث سقف إدارته ═══
       كان التوريث ملغىً عن حامل الشارة (mgr:<did>) فيسقط على ورقته الشخصية —
       وهي فارغة — فيدخل مديرُ إدارةٍ سقفُها ست صفحات ولا يرى صفحةً واحدة، وهو
       عبثٌ ظاهر: مَن مُنحت إدارتُه صفحةً هو أوّل من يفتحها. القاعدة الآن:
         • لا ورقةَ مخزَّنةً له  → يرث سقف إدارته كاملاً (الافتراضي — التوريث).
         • ورقةٌ مخزَّنةٌ صراحةً → تُطبَّق ورقته وحدها (تضييقُ مدير النظام يبقى ممكناً).
       والفرق بين «لم تُخزَّن» و«خُزِّنت فارغة» محفوظٌ في المخزن نفسه، فلا حقلَ جديد.
       وفي الحالتين السقفُ هو الحدّ: تضييقه أو إطفاء ورقةٍ للإدارة يضيّق عليه معه. */
    if (u.role === 'dept') return capAllPerms(u.deptId);
    if (u.role === 'staff' && isMgrKey(u.ekey) && !hasOwnSheet(u.ekey, u.deptId)) return capAllPerms(u.deptId);
    /* مدير الإدارة العامة: صلاحياته في الإدارة النشطة وحدها — وهي من إداراته حتماً */
    /* مدير العقدة (إدارة عامة/قطاع/إدارة عليا): يرث سقف الإدارة النشطة كاملاً كمدير الإدارة — ما لم تُخزَّن له ورقة صريحة فيها (تضييق) — والإدارة من فرعه حتماً */
    if (u.role === 'gm') { var dg = curDept(); if (!gmScopeOk(dg, u.gid)) return {}; return hasOwnSheet(u.ekey, dg) ? empPagePerms(u.ekey, dg) : capAllPerms(dg); }
    return empPagePerms(u.ekey, u.deptId);
  }
  /* الوحدات المطفأة على مستوى المنصة (مدير النظام ← المنصة ← الوحدات): لا تظهر لأحد ولا تُفتح — حتى لمدير النظام
     حتى يعيد تفعيلها؛ تبقى بياناتها محفوظة */
  var _myPerms0 = myPerms;
  myPerms = function(){
    var all = _myPerms0();
    try { var off = (KIVO.BassamPlat && KIVO.BassamPlat.get().mods.off) || []; for (var i = 0; i < off.length; i++) if (off[i] !== 'admin') { delete all[off[i]]; leafKeysOf(off[i]).forEach(function(l){ delete all[l]; }); } } catch(e){}
    return all;
  };
  /* ذاكرةُ myPerms: تُحسَب مرةً ما ثبتت مدخلاتُها كلُّها (نصُّ الجلسة · سجلُّ الحسابات ·
     الإدارةُ النشطة · مخزنُ الصلاحيات · سجلّا الإدارات والهيكل · إعداداتُ المنصة)
     وخلالَ الثانية نفسِها — كانت تُعاد كاملةً لكلِّ خليةٍ في الجدول الشهري (آلافُ المرّات). */
  var _mpKey = null, _mpVal = null, _myPerms1 = myPerms;
  myPerms = function(){
    var key = null;
    try {
      /* KIVO_265 · أداء: نسختا العالم (__dcWorld يرتفع مع كل حفظٍ لسجلّ الإدارات والهيكل · __dcWrite مع كل كتابةٍ بمفتاح) بدل قراءة
         ثلاثة نصوصٍ كبيرة من المخزن وضمّها في كلِّ نداء (آلافُ المرّات في الرسم) — والثانيةُ تبقى حدَّ الصلاحية الأقصى */
      key = [RAW.getItem.call(localStorage, K_SESS), I._usersMemo === null ? 'u0' : 'u1', curDept(), _pmMemo === null ? 'p0' : 'p1',
             KIVO.__dcWorld || 0, KIVO.__dcWrite || 0, RAW.getItem.call(localStorage, 'bassam_platform_v1'),
             Math.floor(Date.now() / 1000)].join('\u0001');
      if (_mpVal && key === _mpKey && _mpVal.u === I._usersMemo && _mpVal.p === _pmMemo) {
        if (KIVO.__bsReadHook) { KIVO.__bsReadHook(K_USERS); KIVO.__bsReadHook(K_PERM); }
        return _mpVal.v;
      }
    } catch (e) { key = null; }
    var v = _myPerms1();
    if (key !== null) { _mpKey = key; _mpVal = { v: v, u: I._usersMemo, p: _pmMemo }; }
    return v;
  };
  /* ═══ KIVO_243 · الإنفاذ: الواجهةُ تتبع المفاتيحَ المحمولة من الخادم (window.__BS_AUTHZ — وضعُ الإنفاذ وحده) ═══
     الورقةُ القديمة (AS‑IS) تبقى مصدرَ الشكل (أيُّ صفحةٍ وتبويب)، وكلُّ «ورقة:فعل» فيها يبقى فقط إن حُمل أيُّ مفتاحٍ تُترجَم إليه
     (سقفُ الإدارة · بوابةُ العدسة · المنحُ والإسقاطُ الصريحان · الدور) — وذرّةٌ بلا مفتاحٍ في السجل تبقى كما هي (الخادمُ يحكم على كل حال).
     بلا __BS_AUTHZ لا يتغيّر شيء: myPerms · lensOn كما في KIVO_242. */
  function azZ(){ var Z = KIVO.__BS_AUTHZ; return (Z && Z.mode === 'enforce' && Z.depts && typeof Z.depts === 'object') ? Z : null; }
  var _azBits = { h: null, set: null };
  function azHeld(did){
    var Z = azZ(); if (!Z) return null;
    var R = KIVO.KIVO_REGISTRY, order = R && R.keys; if (!order || order.length !== Z.n) return null;   /* سجلٌّ لا يطابق الخادم: لا قصّ في الواجهة */
    var x = Z.depts[did || curDept()]; if (!x || typeof x.h !== 'string') return {};
    if (_azBits.h === x.h && _azBits.set) return _azBits.set;
    var set = {};
    try { var bin = atob(x.h); for (var i = 0; i < order.length; i++) { if (bin.charCodeAt(i >> 3) & (1 << (i & 7))) set[order[i]] = true; } } catch (e) { return {}; }
    _azBits = { h: x.h, set: set }; return set;
  }
  function azKey(k, did){ var H = azHeld(did); return H === null ? null : !!H[k]; }
  var _myPerms2 = myPerms, _azMemo = { a: null, h: null, v: null };
  myPerms = function(){
    var all = _myPerms2();
    if (!azZ() || isSuper()) return all;
    var H = azHeld(curDept()); if (H === null) return all;
    if (_azMemo.a === all && _azMemo.h === H) return _azMemo.v;
    var R = KIVO.KIVO_REGISTRY, leaves = {};
    Object.keys(all).forEach(function(k){
      if (isContainer(k)) return;
      var ff = [];
      var acts = (all[k] || []).filter(function(a){
        var at = R && R.atoms ? R.atoms[k + ':' + a] : null;
        if (!at || !at.targets || !at.targets.length) return true;
        /* «فحص الصلاحيات العميق» · M3: ذرّةٌ تُرجَمت إلى أعلام ميزات (converted_to_feature — التصدير والطباعة ff.*) لا مفتاحَ لها في السجل
           فلا تحملها بتّاتُ الخادم أبداً — كانت تسقط هنا فيختفي التصديرُ عن كلِّ مستخدمٍ غيرِ مدير النظام. تبقى كما هي ما بقي للورقة فعلٌ محمول */
        if (at.disposition === 'converted_to_feature' || !at.targets.some(function(t){ return !!(R.byKey && R.byKey[t]); })) { ff.push(a); return false; }
        for (var i = 0; i < at.targets.length; i++) if (H[at.targets[i]]) return true;
        return false;
      });
      if (acts.length) leaves[k] = acts.concat(ff);
    });
    /* المنحُ الصريح (plus) يضيف أفعالَ ذرّاته — الورقةُ القديمة لا تعرفه (مثل: حذفُ المحاضر لموظفٍ بلا ورقة حذف) */
    var x = azZ().depts[curDept()], plus = x && Array.isArray(x.p) ? x.p : [];
    if (plus.length && R && R.atoms) Object.keys(R.atoms).forEach(function(ak){
      var at = R.atoms[ak]; if (!at || !at.leaf || !at.act || !at.targets) return;
      for (var i = 0; i < plus.length; i++) if (at.targets.indexOf(plus[i]) !== -1 && H[plus[i]]) { var L = leaves[at.leaf] || (leaves[at.leaf] = []); if (L.indexOf(at.act) === -1) L.push(at.act); break; }
    });
    var v = derivePages(leaves);
    _azMemo = { a: all, h: H, v: v };
    return v;
  };
  var _lensOn0 = lensOn;
  lensOn = function(key, did){ var Z = azZ(); if (!Z) return _lensOn0(key, did); var x = Z.depts[did || curDept()]; return !!(x && Array.isArray(x.lens) && x.lens.indexOf(key) !== -1); };
  function can(pageKey, act){
    var a = myPerms()[pageKey];
    return !!(a && a.length && a.indexOf(act || 'view') !== -1);
  }
  function visiblePages(){ var p = myPerms(); return PAGE_KEYS.filter(function(k){ return p[k] && p[k].length; }); }

  /* ═══ KIVO_256 · SOT-003/004/010 — مفاتيحُ v24.9 (وضعُ الإنفاذ): الفعليُّ = ترجمةُ الورقة المقصوصة بالسقف + plus − minus داخل السقف وبوابة العدسة
     (= enfHeld0 · enfKeyOnCeiling · ENF_DERIVE · ENF_COMPAT في الخادم). التحريرُ فرقٌ صريح في bsdept:<d>:bassam_grants_v1 — الورقةُ القديمة لا تُمسّ. ═══ */
  var P24_DERIVE = { 'field.view': ['lens.zones.status.change', 'lens.gates.status.change', 'lens.marks.status.change'] };   /* = ENF_DERIVE */
  var P24_COMPAT = { 'ir.rec.retro.open': 1, 'sz.rec.retro.open': 1 };   /* = ENF_COMPAT */
  var P24_LEAF_RE = /^([A-Za-z]+(?:\/[A-Za-z]+)?):(view|add|edit|del|approve|export)$/, P24_LENSES = LENS_KEYS.slice();   /* KIVO_259 · AUD-030: = عدساتُ الإضافات (LENS_REG ← plugins/lenses — كانت قائمةً حرفيّة بالترتيب نفسِه) */
  function p24R(){ var R = KIVO.KIVO_REGISTRY; return (R && R.byKey && R.owners && R.atoms && R.translate && R.keys) ? R : null; }
  function p24LensOf(key){ var m = /^lens\.([a-z]+)\./.exec(String(key || '')); return m && P24_LENSES.indexOf(m[1]) !== -1 ? m[1] : ''; }
  var _p24ix = null;
  function p24Ix(){
    if (_p24ix) return _p24ix; var R = p24R(); if (!R) return null;
    var ix = { leaf: {}, hosts: {}, atomT: {}, needMgr: {}, superOnly: {}, atomless: {} }, a;
    for (a in R.atoms) (R.atoms[a].targets || []).forEach(function(t){ ix.atomT[t] = 1; });
    R.keys.forEach(function(k){
      var e = R.byKey[k]; if (!e || e.status !== 'active') return;
      var leaves = []; (e.asisMap || []).forEach(function(x){ x = String(x);
        if (x === 'role:super') ix.superOnly[k] = 1; else if (x === 'role:mgr') ix.needMgr[k] = 1;
        else { var m = P24_LEAF_RE.exec(x); if (m && leaves.indexOf(m[1]) === -1) leaves.push(m[1]); } });
      if (!ix.atomT[k]) ix.atomless[k] = 1;
      var o = R.owners[e.owner];
      if (e.ownerKind === 'page') ix.leaf[k] = e.owner;
      else if (e.ownerKind === 'reference') ix.leaf[k] = (o && o.managedIn) || leaves[0] || '';
      else if (e.ownerKind === 'lens') ix.hosts[k] = leaves.length ? leaves : ['plan', 'daily/rounds'];
    });
    return (_p24ix = ix);
  }
  /* الوحداتُ المطفأة من المنصة خارج السقف (= A.off) */
  function p24Off(){ try { var pl = KIVO.BassamPlat && KIVO.BassamPlat.get ? KIVO.BassamPlat.get() : null; return (pl && pl.mods && Array.isArray(pl.mods.off)) ? pl.mods.off : []; } catch(e){ return []; } }
  /* السقف: المحفوظ أو مسودّةُ المحرّر {cap, subs, tabs, lenses} */
  function p24Ceil(did, draft){
    var d = did || curDept(), off = p24Off();
    if (draft) {
      var dc = (draft.cap || []).filter(function(k){ return off.indexOf(k) === -1; }), ds = draft.subs || {}, dt = draft.tabs || {};
      return { page: function(p){ return dc.indexOf(p) !== -1; },
               sub: function(p, x){ if (dc.indexOf(p) === -1) return false; var a = Array.isArray(ds[p]) ? ds[p] : subKeysOf(p), b = Array.isArray(dt[p]) ? dt[p] : tabKeysOf(p); return a.indexOf(x) !== -1 || b.indexOf(x) !== -1; },
               lens: function(L){ return Array.isArray(draft.lenses) ? draft.lenses.indexOf(L) !== -1 : true; } };
    }
    var cap = deptCap(d).filter(function(k){ return off.indexOf(k) === -1; });
    return { page: function(p){ return cap.indexOf(p) !== -1; },
             sub: function(p, x){ return cap.indexOf(p) !== -1 && deptSubs(d, p).concat(deptTabs(d, p)).indexOf(x) !== -1; },
             lens: function(L){ return deptLenses(d).indexOf(L) !== -1; } };
  }
  /* = capOnDept */
  function p24LeafOn(C, leaf){
    if (!leaf) return true; var sp = splitLeaf(leaf);
    if (PAGE_KEYS.indexOf(sp.page) === -1 && !sp.sub) return true;
    if (!C.page(sp.page)) return false; if (!sp.sub) return true;
    var q = PAGE_OF[sp.sub]; if (q && q.under === sp.page) return C.page(sp.sub);
    return C.sub(sp.page, sp.sub);
  }
  /* = enfKeyOnCeiling */
  function p24KeyOn(key, C){
    var R = p24R(), ix = p24Ix(); if (!R || !ix) return false;
    var e = R.byKey[key]; if (!e || e.status !== 'active') return false;
    if (e.ownerKind === 'platform') return true;
    if (ix.hosts[key]) { var L = p24LensOf(key); if (L && !C.lens(L)) return false; return ix.hosts[key].some(function(h){ return p24LeafOn(C, h); }); }
    return p24LeafOn(C, ix.leaf[key] || '');
  }
  function p24LensHosted(L, C){ var ix = p24Ix(); if (!ix) return false; var k = 'lens.' + L + '.view'; return (ix.hosts[k] || ['plan', 'daily/rounds']).some(function(h){ return p24LeafOn(C, h); }); }
  /* = enfTranslated */
  function p24Translate(sheet, C){
    var R = p24R(); if (!R) return {}; var cut = {}, k, Z = azZ(), mig = !!(Z && Z.perm);
    for (k in (sheet || {})) if (p24LeafOn(C, k)) cut[k] = sheet[k];
    var T = R.translate(cut).keys || {}, out = {}, s;
    for (k in T) if (!(mig && P24_COMPAT[k])) out[k] = true;
    for (s in P24_DERIVE) if (T[s]) P24_DERIVE[s].forEach(function(x){ out[x] = true; });
    return out;
  }
  function p24GrantsRaw(did){ try { return RAW.getItem.call(localStorage, 'bsdept:' + (did || curDept()) + ':bassam_grants_v1'); } catch(e){ return null; } }
  function p24GrantsRec(did){ try { var v = JSON.parse(p24GrantsRaw(did)); return (v && typeof v === 'object' && v.emp && typeof v.emp === 'object' && !Array.isArray(v.emp)) ? v : { v: 1, emp: {} }; } catch(e){ return { v: 1, emp: {} }; } }
  function p24GrantOf(ekey, did){ var g = p24GrantsRec(did).emp[ekey] || {}; return { plus: Array.isArray(g.plus) ? g.plus.slice() : [], minus: Array.isArray(g.minus) ? g.minus.slice() : [], src: typeof g.src === 'string' ? g.src : '' }; }
  /* يُمنح بالفرق؟ (لا بوابةُ عدسة · ولا role:mgr لغير المدير أو بلا ذرّة) */
  function p24Grantable(k, C, tgt){
    var R = p24R(), ix = p24Ix(); if (!R || !ix) return false; var e = R.byKey[k];
    if (!e || e.status !== 'active' || e.grant !== 'assignable') return false;
    if (/^lens\.[a-z]+\.enable$/.test(k)) return false;
    if (ix.needMgr[k] && (ix.atomless[k] || !(tgt && tgt.mgr))) return false;
    return !C || p24KeyOn(k, C);
  }
  function p24Assignable(C, tgt){ var R = p24R(); if (!R) return []; return R.keys.filter(function(k){ return p24Grantable(k, C, tgt); }); }
  /* الفعليُّ لموظف {keys, T, plus, minus, lens} (= enfHeld0) */
  function p24Effective(o){
    o = o || {}; var d = o.did || curDept(), C = o.ceil || p24Ceil(d), R = p24R(); if (!R) return null;
    var tgt = { mgr: o.mgr !== undefined ? !!o.mgr : isMgrKey(o.ekey) };
    var sheet = o.sheet || (o.inherit ? capAllPerms(d) : empPerms(o.ekey, d)), T = p24Translate(sheet, C), G = o.grant || p24GrantOf(o.ekey, d);
    var lens = Array.isArray(o.lens) ? o.lens : empLens(o.ekey, d), mi = {}, pl = {}, out = {};
    G.minus.forEach(function(k){ mi[k] = 1; }); G.plus.forEach(function(k){ pl[k] = 1; });
    p24Assignable(C, tgt).forEach(function(k){
      var L = p24LensOf(k); if (L && lens.indexOf(L) === -1) return;
      if (mi[k]) return; if (pl[k] || T[k]) out[k] = true;
    });
    return { keys: out, T: T, plus: G.plus, minus: G.minus, src: G.src || '', lens: lens.slice(), mgr: tgt.mgr };
  }
  /* الفرقُ الذي يجعل الفعليَّ = E: plus = E − T · minus = T − E (والعدسةُ المطفأة بلا فرق — بوابتُها تكفي) */
  function p24Delta(E, T, C, lens, tgt){
    var plus = [], minus = [];
    p24Assignable(C, tgt).forEach(function(k){
      var L = p24LensOf(k); if (L && Array.isArray(lens) && lens.indexOf(L) === -1) return;
      if (E[k] && !T[k]) plus.push(k); if (!E[k] && T[k]) minus.push(k);
    });
    return { plus: plus, minus: minus };
  }
  /* أوسعُ ورقةٍ قديمة لا تتجاوز E (للقوالب) */
  function p24Cover(E){
    var R = p24R(), out = {}, a; if (!R) return out;
    for (a in R.atoms) { var at = R.atoms[a], ks = (at.targets || []).filter(function(t){ return !!R.byKey[t] && R.byKey[t].status === 'active'; });
      if (!ks.length || !ks.every(function(t){ return !!E[t]; })) continue;
      (out[at.leaf] = out[at.leaf] || []).push(at.act); }
    Object.keys(out).forEach(function(k){ out[k] = ALL_ACTS.filter(function(x){ return out[k].indexOf(x) !== -1; }); });
    return out;
  }
  /* كتابةُ المنح (= enfGrantsWrite): غيرُ مدير النظام لا يمنح ما لا يحمله — يُستبعد في dropped بدل رفض الحفظ كلِّه */
  function p24SetGrant(ekey, did, delta, src){
    if (!azZ()) return { ok:false, err:'المنحُ على مستوى المفتاح في وضع الإنفاذ وحده' };
    if (!ekey) return { ok:false, err:'حسابٌ بلا مفتاح موظف' };
    var g = requireMgr(); if (g) return g;
    var sup = isSuper(), d = sup ? (did || curDept()) : curDept(), u = cur();
    if (!sup && u && String(u.ekey || '') === String(ekey)) return { ok:false, err:'لا يمنح المرءُ نفسَه' };
    if (!sup && p24GrantsRaw(d) == null && azZ().depts && !azZ().depts[d]) return { ok:false, err:'هذه الإدارة خارج نطاقك' };
    var rec = p24GrantsRec(d), prev = rec.emp[ekey] && Array.isArray(rec.emp[ekey].plus) ? rec.emp[ekey].plus : [];
    var pl = ((delta && delta.plus) || []).slice(), mi = ((delta && delta.minus) || []).slice(), dropped = [];
    if (!sup) pl = pl.filter(function(k){ if (prev.indexOf(k) !== -1 || azKey(k, d) === true) return true; dropped.push(k); return false; });
    /* caps-own: explicit grants outside the ceiling stay stored (the delta covers in-ceiling keys only) and bite again when it is widened */
    var C0 = p24Ceil(d), g0 = rec.emp[ekey] || {}, keepL = function(a, b){ (Array.isArray(b) ? b : []).forEach(function(k){ if (!p24KeyOn(k, C0) && a.indexOf(k) === -1) a.push(k); }); };
    keepL(pl, g0.plus); keepL(mi, g0.minus);
    var old = JSON.stringify(rec.emp[ekey] || null);
    if (!pl.length && !mi.length) delete rec.emp[ekey];
    else { rec.emp[ekey] = { plus: pl.sort(), minus: mi.sort(), at: Date.now(), by: u ? u.id : '' }; if (src) rec.emp[ekey].src = String(src); }
    var cmp = function(x){ return x ? JSON.stringify({ p: (x.plus || []).slice().sort(), m: (x.minus || []).slice().sort(), s: x.src || '' }) : 'null'; };   /* caps-own: order-insensitive — an equal entry is not rewritten */
    if (cmp(old === 'null' ? null : JSON.parse(old)) === cmp(rec.emp[ekey] || null)) return { ok:true, same:true, dropped: dropped };
    try { RAW.setItem.call(localStorage, 'bsdept:' + d + ':bassam_grants_v1', JSON.stringify(rec)); } catch(e){ return { ok:false, err:'تعذّر الحفظ' }; }
    return { ok:true, dropped: dropped };
  }
  function p24Apply(ekey, did, keysArr, sheet, src, lens){
    if (!azZ() || !Array.isArray(keysArr)) return { ok:true, skipped:true };
    var d = isSuper() ? (did || curDept()) : curDept(), C = p24Ceil(d), E = {}, tgt = { mgr: isMgrKey(ekey) };
    keysArr.forEach(function(k){ E[k] = true; });
    var L = Array.isArray(lens) ? lens : empLens(ekey, d);
    return p24SetGrant(ekey, d, p24Delta(E, p24Translate(sheet || empPerms(ekey, d), C), C, L, tgt), src);
  }
  /* تضييقُ السقف يقصّ plus خارجَه كما يقصّ الأوراقَ والعدسات (والإسقاطُ يبقى) */
  function p24TrimGrants(ds){
    if (!azZ() || !p24R() || !isSuper()) return 0;
    var n = 0;
    (ds || []).forEach(function(d){
      if (p24GrantsRaw(d) == null) return;
      var rec = p24GrantsRec(d), C = p24Ceil(d), ch = false;
      Object.keys(rec.emp).forEach(function(ek){
        var g = rec.emp[ek]; if (!g || typeof g !== 'object' || !Array.isArray(g.plus)) return;
        var keep = g.plus.filter(function(k){ return p24KeyOn(k, C); });
        if (keep.length === g.plus.length) return;
        n += g.plus.length - keep.length; g.plus = keep; ch = true;
        if (!keep.length && !(Array.isArray(g.minus) && g.minus.length)) delete rec.emp[ek];
      });
      if (ch) { try { RAW.setItem.call(localStorage, 'bsdept:' + d + ':bassam_grants_v1', JSON.stringify(rec)); } catch(e){ /* تعذّرُ التخزين: الخادمُ يقصّ بالسقف على كل حال (enfKeyOnCeiling) */ } }
    });
    return n;
  }
  /* بعد منح قالب: keys24 ⇒ فرقُه بالضبط؛ وإلا يُرفع المنحُ السابق */
  function p24AfterTpl(ekey, tplId, d){
    if (!azZ() || !ekey || !p24R()) return null;
    try {
      var tp = tplId ? tplsList(d).filter(function(t){ return t.id === tplId; })[0] : null;
      if (tp && Array.isArray(tp.keys24)) { var dl = deptLenses(d); return p24Apply(ekey, d, tp.keys24, null, 'tpl:' + tp.id, Array.isArray(tp.lens) ? tp.lens.filter(function(k){ return dl.indexOf(k) !== -1; }) : dl); }
      if (p24GrantsRec(d).emp[ekey]) return p24SetGrant(ekey, d, { plus: [], minus: [] });
    } catch(e){ /* منحُ القالب (الورقة) تمّ — والمنحُ الصريح يُضبط في الحفظ التالي */ }
    return null;
  }
  /* → للأجزاء الأخرى */
  I.ALL_ACTS = ALL_ACTS; I.K_PERM = K_PERM; I.LENS_KEYS = LENS_KEYS; I.LENS_REG = LENS_REG; I.NAV2PERM = NAV2PERM; I.NAV_REG = NAV_REG;
  I.P24_DERIVE = P24_DERIVE; I.PAGE_KEYS = PAGE_KEYS; I.PAGE_OF = PAGE_OF; I.PAGE_REG = PAGE_REG; I.PERM2NAV = PERM2NAV; I.azKey = azKey;
  I.azZ = azZ; I.can = can; I.canSub = canSub; I.capAllPerms = capAllPerms; I.capSetAnywhere = capSetAnywhere; I.cleanLeafPerms = cleanLeafPerms;
  I.clearEmpPerms = clearEmpPerms; I.deptCap = deptCap; I.deptLenses = deptLenses; I.deptSubs = deptSubs; I.deptTabs = deptTabs;
  I.derivePages = derivePages; I.dropEmpPerms = dropEmpPerms; I.dropEmpTpl = dropEmpTpl; I.effCap = effCap; I.empLens = empLens;
  I.empPagePerms = empPagePerms; I.empPerms = empPerms; I.empTpl = empTpl; I.expandPerms = expandPerms; I.hasCap = hasCap;
  I.hasOwnSheet = hasOwnSheet; I.isContainer = isContainer; I.leafKeysOf = leafKeysOf; I.leafReg = leafReg; I.onAny = onAny; I.onCap = onCap;
  I.p24AfterTpl = p24AfterTpl; I.p24Apply = p24Apply; I.p24Assignable = p24Assignable; I.p24Ceil = p24Ceil; I.p24Cover = p24Cover;
  I.p24Delta = p24Delta; I.p24Effective = p24Effective; I.p24GrantOf = p24GrantOf; I.p24Grantable = p24Grantable; I.p24Ix = p24Ix;
  I.p24KeyOn = p24KeyOn; I.p24LeafOn = p24LeafOn; I.p24LensHosted = p24LensHosted; I.p24LensOf = p24LensOf; I.p24R = p24R;
  I.p24SetGrant = p24SetGrant; I.p24Translate = p24Translate; I.p24TrimGrants = p24TrimGrants; I.patternApply = patternApply; I.capOwnOf = capOwnOf; I.setCapOwn = setCapOwn; I.latentLeaves = latentLeaves;
  I.patternMeta = patternMeta; I.patternSeed = patternSeed; I.patternSet = patternSet; I.patterns = patterns; I.permSave = permSave;
  I.permStore = permStore; I.pruneOrphanEmpPerms = pruneOrphanEmpPerms; I.rawCap = rawCap; I.seedCapFrom = seedCapFrom; I.seedSectionCap = seedSectionCap; I.setDeptCap = setDeptCap;
  I.setDeptLenses = setDeptLenses; I.setDeptSubs = setDeptSubs; I.setDeptTabs = setDeptTabs; I.setEmpLens = setEmpLens; I.setEmpPerms = setEmpPerms;
  I.setEmpTpl = setEmpTpl; I.splitLeaf = splitLeaf; I.subKeysOf = subKeysOf; I.subOn = subOn; I.tabKeysOf = tabKeysOf; I.tabOn = tabOn;
  I.visiblePages = visiblePages;
  Object.defineProperty(I, "_pmMemo", { get: function () { return _pmMemo; }, set: function (v) { _pmMemo = v; }, configurable: true });
  Object.defineProperty(I, "lensOn", { get: function () { return lensOn; }, set: function (v) { lensOn = v; }, configurable: true });
  Object.defineProperty(I, "myPerms", { get: function () { return myPerms; }, set: function (v) { myPerms = v; }, configurable: true });
})();
